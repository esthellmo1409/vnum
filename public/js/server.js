// server.js
// Servidor completo em Node.js puro (sem express, sem dependências).
// Rodar com: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { transact, load, nextId } = require('./lib/store');
const { hashPassword, verifyPassword, newToken } = require('./lib/auth');
const mp = require('./lib/mercadopago');

// ---------- Carrega variáveis do .env (sem dependência externa) ----------
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.CHIPEIRA_WEBHOOK_SECRET || 'troque-este-segredo';
const PEDIDO_TTL_MS = 18 * 60 * 1000; // 18 minutos para o número expirar
const PEDIDO_CANCEL_MIN_MS = 2 * 60 * 1000; // só pode cancelar depois de 2 minutos

// ---------- Sessões (token em memória -> userId). Simples e suficiente ----------
const sessions = new Map();

// ---------- Utilidades HTTP ----------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const [k, ...v] = pair.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // limite de 1MB
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function getUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.sessao;
  if (!token || !sessions.has(token)) return null;
  const userId = sessions.get(token);
  const db = load();
  return db.users.find((u) => u.id === userId) || null;
}

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, nome: u.nome, email: u.email, saldoCentavos: u.saldoCentavos, isAdmin: !!u.isAdmin };
}

function extrairCodigo(mensagem) {
  const m = mensagem.match(/\b(\d{3}[-\s]?\d{3}|\d{4,8})\b/);
  return m ? m[0] : null;
}

function extrairDDD(numero) {
  const m = (numero || '').match(/^\+55\s*(\d{2})/);
  return m ? m[1] : null;
}

// ---------- Servir arquivos estáticos de /public ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, 'public', filePath);
  const publicRoot = path.join(__dirname, 'public');
  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403);
    return res.end('Proibido');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>Página não encontrada.</p>');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- Rotas da API ----------
async function api(req, res, pathname, method) {
  // ----- AUTENTICAÇÃO -----
  if (pathname === '/api/auth/registro' && method === 'POST') {
    const { nome, email, senha } = await readBody(req);
    if (!nome || !email || !senha || senha.length < 6) {
      return sendJson(res, 400, { erro: 'Preencha nome, e-mail e uma senha com 6+ caracteres.' });
    }
    return transact((db) => {
      if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return sendJson(res, 409, { erro: 'Este e-mail já está cadastrado.' });
      }
      const user = {
        id: nextId(db, 'users'),
        nome,
        email,
        senhaHash: hashPassword(senha),
        saldoCentavos: 0,
        isAdmin: false,
        criadoEm: new Date().toISOString()
      };
      db.users.push(user);
      const token = newToken();
      sessions.set(token, user.id);
      res.setHeader('Set-Cookie', `sessao=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
      return sendJson(res, 201, { usuario: publicUser(user) });
    });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, senha } = await readBody(req);
    const db = load();
    const user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user || !verifyPassword(senha || '', user.senhaHash)) {
      return sendJson(res, 401, { erro: 'E-mail ou senha inválidos.' });
    }
    const token = newToken();
    sessions.set(token, user.id);
    res.setHeader('Set-Cookie', `sessao=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
    return sendJson(res, 200, { usuario: publicUser(user) });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const cookies = parseCookies(req);
    sessions.delete(cookies.sessao);
    res.setHeader('Set-Cookie', 'sessao=; HttpOnly; Path=/; Max-Age=0');
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/auth/eu' && method === 'GET') {
    return sendJson(res, 200, { usuario: publicUser(getUser(req)) });
  }

  // A partir daqui, exige login
  const user = getUser(req);
  const requireLogin = () => sendJson(res, 401, { erro: 'Faça login para continuar.' });

  // ----- CATÁLOGO -----
  if (pathname === '/api/catalogo' && method === 'GET') {
    const db = load();
    return sendJson(res, 200, { servicos: db.services.filter((s) => s.ativo) });
  }

  // ----- CARTEIRA / SALDO -----
  if (pathname === '/api/carteira' && method === 'GET') {
    if (!user) return requireLogin();
    return sendJson(res, 200, { saldoCentavos: user.saldoCentavos });
  }

  // ----- DDDs disponíveis (para a compra premium com escolha de DDD) -----
  if (pathname === '/api/ddds-disponiveis' && method === 'GET') {
    if (!user) return requireLogin();
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const paisAlvo = urlObj.searchParams.get('pais') || 'BR';
    const db = load();
    const contagem = {};
    db.slots.forEach((s) => {
      if (s.status !== 'livre') return;
      if ((s.pais || 'BR') !== paisAlvo) return;
      const ddd = extrairDDD(s.numero);
      if (!ddd) return;
      contagem[ddd] = (contagem[ddd] || 0) + 1;
    });
    const lista = Object.keys(contagem).sort().map((ddd) => ({ ddd, quantidade: contagem[ddd] }));
    return sendJson(res, 200, { ddds: lista });
  }

  // ----- PEDIDOS (comprar número) -----
  if (pathname === '/api/pedidos' && method === 'POST') {
    if (!user) return requireLogin();
    const { servicoId, pais, ddd } = await readBody(req);
    const paisAlvo = pais || 'BR';
    return transact((db) => {
      const servico = db.services.find((s) => s.id === servicoId && s.ativo);
      if (!servico) return sendJson(res, 404, { erro: 'Serviço não encontrado.' });
      const u = db.users.find((x) => x.id === user.id);
      if (u.saldoCentavos < servico.precoCentavos) {
        return sendJson(res, 402, { erro: 'Saldo insuficiente. Adicione créditos.' });
      }
      const slot = db.slots.find((s) => s.status === 'livre' && (s.pais || 'BR') === paisAlvo && (!ddd || extrairDDD(s.numero) === ddd));
      if (!slot) {
        return sendJson(res, 503, { erro: ddd ? `Nenhum número disponível agora para o DDD ${ddd}.` : `Nenhum número disponível agora para ${paisAlvo === 'BR' ? 'o Brasil' : paisAlvo}. Tente novamente em instantes.` });
      }
      u.saldoCentavos -= servico.precoCentavos;
      slot.status = 'ocupado';
      const order = {
        id: nextId(db, 'orders'),
        userId: user.id,
        servicoId: servico.id,
        servicoNome: servico.nome,
        slotId: slot.id,
        numero: slot.numero,
        pais: paisAlvo,
        status: 'aguardando', // aguardando | recebido | expirado | cancelado
        mensagemRecebida: null,
        codigo: null,
        criadoEm: new Date().toISOString(),
        expiraEm: new Date(Date.now() + PEDIDO_TTL_MS).toISOString()
      };
      slot.pedidoAtualId = order.id;
      db.orders.push(order);
      return sendJson(res, 201, { pedido: order, saldoCentavos: u.saldoCentavos });
    });
  }

  if (pathname === '/api/pedidos' && method === 'GET') {
    if (!user) return requireLogin();
    const db = load();
    const pedidos = db.orders
      .filter((o) => o.userId === user.id)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    return sendJson(res, 200, { pedidos });
  }

  const pedidoMatch = pathname.match(/^\/api\/pedidos\/(\d+)$/);
  if (pedidoMatch && method === 'GET') {
    if (!user) return requireLogin();
    const db = load();
    const pedido = db.orders.find((o) => o.id === Number(pedidoMatch[1]) && o.userId === user.id);
    if (!pedido) return sendJson(res, 404, { erro: 'Pedido não encontrado.' });
    if (pedido.status === 'aguardando' && new Date(pedido.expiraEm) < new Date()) {
      return transact((db2) => {
        const p2 = db2.orders.find((o) => o.id === pedido.id);
        p2.status = 'expirado';
        const slot = db2.slots.find((s) => s.id === p2.slotId);
        if (slot) { slot.status = 'livre'; slot.pedidoAtualId = null; }
        return sendJson(res, 200, { pedido: p2 });
      });
    }
    return sendJson(res, 200, { pedido });
  }

  const cancelarMatch = pathname.match(/^\/api\/pedidos\/(\d+)\/cancelar$/);
  if (cancelarMatch && method === 'POST') {
    if (!user) return requireLogin();
    return transact((db) => {
      const pedido = db.orders.find((o) => o.id === Number(cancelarMatch[1]) && o.userId === user.id);
      if (!pedido) return sendJson(res, 404, { erro: 'Pedido não encontrado.' });
      if (pedido.status !== 'aguardando') {
        return sendJson(res, 400, { erro: 'Este pedido não pode mais ser cancelado.' });
      }
      const decorridoMs = Date.now() - new Date(pedido.criadoEm).getTime();
      if (decorridoMs < PEDIDO_CANCEL_MIN_MS) {
        const faltamSeg = Math.ceil((PEDIDO_CANCEL_MIN_MS - decorridoMs) / 1000);
        return sendJson(res, 400, { erro: `Aguarde mais ${faltamSeg} segundos para poder cancelar este pedido.` });
      }
      const servico = db.services.find((s) => s.id === pedido.servicoId);
      const u = db.users.find((x) => x.id === user.id);
      u.saldoCentavos += servico.precoCentavos; // estorna
      pedido.status = 'cancelado';
      const slot = db.slots.find((s) => s.id === pedido.slotId);
      if (slot) { slot.status = 'livre'; slot.pedidoAtualId = null; }
      return sendJson(res, 200, { pedido, saldoCentavos: u.saldoCentavos });
    });
  }

  // ----- WEBHOOK DA CHIPEIRA (recebe SMS do hardware/app da SIM box) -----
  // Chame este endpoint a partir da sua chipeira/gateway sempre que um SMS chegar.
  // Header esperado: X-Webhook-Secret: <CHIPEIRA_WEBHOOK_SECRET do .env>
  // Body esperado:   { "numero": "+55 11 91234-0001", "mensagem": "seu código é 482931" }
  if (pathname === '/api/webhook/sms' && method === 'POST') {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== WEBHOOK_SECRET) {
      return sendJson(res, 401, { erro: 'Segredo do webhook inválido.' });
    }
    const { numero, mensagem } = await readBody(req);
    if (!numero || !mensagem) return sendJson(res, 400, { erro: 'Envie numero e mensagem.' });
    return transact((db) => {
      const slot = db.slots.find((s) => s.numero === numero);
      if (!slot) return sendJson(res, 404, { erro: 'Número não corresponde a nenhum slot cadastrado.' });
      const pedido = db.orders.find((o) => o.id === slot.pedidoAtualId && o.status === 'aguardando');
      if (!pedido) return sendJson(res, 200, { ok: true, aviso: 'SMS recebido mas não há pedido aguardando neste número.' });
      pedido.mensagemRecebida = mensagem;
      pedido.codigo = extrairCodigo(mensagem);
      pedido.status = 'recebido';
      return sendJson(res, 200, { ok: true, pedidoId: pedido.id, codigo: pedido.codigo });
    });
  }

  // ----- PAGAMENTOS -----
  if (pathname === '/api/pagamentos/pix' && method === 'POST') {
    if (!user) return requireLogin();
    const { valorReais } = await readBody(req);
    if (!valorReais || valorReais < 5) return sendJson(res, 400, { erro: 'Valor mínimo de recarga: R$ 5,00.' });
    try {
      const db = load();
      const txId = nextId(db, 'transactions');
      const pix = await mp.criarPagamentoPix({
        valorReais,
        descricao: `Recarga de créditos #${txId}`,
        emailPagador: user.email,
        orderId: txId
      });
      transact((db2) => {
        db2.transactions.push({
          id: txId, userId: user.id, valorCentavos: Math.round(valorReais * 100),
          metodo: 'pix', status: pix.status, mpPaymentId: pix.paymentId, criadoEm: new Date().toISOString()
        });
      });
      return sendJson(res, 201, { transacaoId: txId, qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64, paymentId: pix.paymentId });
    } catch (e) {
      return sendJson(res, 502, { erro: 'Falha ao gerar Pix. Verifique o MP_ACCESS_TOKEN no .env.', detalhe: String(e.message) });
    }
  }

  if (pathname === '/api/pagamentos/cartao' && method === 'POST') {
    if (!user) return requireLogin();
    const { valorReais } = await readBody(req);
    if (!valorReais || valorReais < 5) return sendJson(res, 400, { erro: 'Valor mínimo de recarga: R$ 5,00.' });
    try {
      const db = load();
      const txId = nextId(db, 'transactions');
      const pref = await mp.criarPreferenciaCheckout({
        valorReais,
        descricao: `Recarga de créditos #${txId}`,
        orderId: txId,
        backUrls: {
          success: `${process.env.SITE_URL || 'http://localhost:3000'}/dashboard.html?pagamento=sucesso`,
          failure: `${process.env.SITE_URL || 'http://localhost:3000'}/dashboard.html?pagamento=falhou`,
          pending: `${process.env.SITE_URL || 'http://localhost:3000'}/dashboard.html?pagamento=pendente`
        }
      });
      transact((db2) => {
        db2.transactions.push({
          id: txId, userId: user.id, valorCentavos: Math.round(valorReais * 100),
          metodo: 'cartao', status: 'pendente', mpPreferenceId: pref.preferenceId, criadoEm: new Date().toISOString()
        });
      });
      return sendJson(res, 201, { transacaoId: txId, initPoint: pref.initPoint });
    } catch (e) {
      return sendJson(res, 502, { erro: 'Falha ao iniciar pagamento com cartão. Verifique o MP_ACCESS_TOKEN no .env.', detalhe: String(e.message) });
    }
  }

  // Notificação assíncrona do Mercado Pago (configure esta URL no painel do MP)
  if (pathname === '/api/webhook/mercadopago' && method === 'POST') {
    const body = await readBody(req);
    try {
      const paymentId = body?.data?.id;
      if (paymentId) {
        const pagamento = await mp.consultarPagamento(paymentId);
        transact((db) => {
          const tx = db.transactions.find((t) => t.mpPaymentId == paymentId || t.mpPreferenceId === pagamento.preference_id);
          if (tx && tx.status !== 'aprovado' && pagamento.status === 'approved') {
            tx.status = 'aprovado';
            const u = db.users.find((x) => x.id === tx.userId);
            if (u) u.saldoCentavos += tx.valorCentavos;
          } else if (tx) {
            tx.status = pagamento.status;
          }
        });
      }
    } catch (e) {
      console.error('Erro processando webhook do Mercado Pago:', e.message);
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/pagamentos' && method === 'GET') {
    if (!user) return requireLogin();
    const db = load();
    const transacoes = db.transactions.filter((t) => t.userId === user.id).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    return sendJson(res, 200, { transacoes });
  }

  // ----- ADMIN -----
  const requireAdmin = () => sendJson(res, 403, { erro: 'Acesso restrito ao administrador.' });
  if (pathname.startsWith('/api/admin/')) {
    if (!user) return requireLogin();
    if (!user.isAdmin) return requireAdmin();

    if (pathname === '/api/admin/slots' && method === 'GET') {
      return sendJson(res, 200, { slots: load().slots });
    }
    if (pathname === '/api/admin/slots' && method === 'POST') {
      const { numero, operadora, pais } = await readBody(req);
      if (!numero) return sendJson(res, 400, { erro: 'Informe o número.' });
      return transact((db) => {
        const slot = { id: nextId(db, 'slots'), numero, operadora: operadora || '', pais: pais || 'BR', status: 'livre', pedidoAtualId: null };
        db.slots.push(slot);
        return sendJson(res, 201, { slot });
      });
    }
    const slotMatch = pathname.match(/^\/api\/admin\/slots\/(\d+)$/);
    if (slotMatch && method === 'PUT') {
      const { status, numero, operadora, pais } = await readBody(req);
      return transact((db) => {
        const slot = db.slots.find((s) => s.id === Number(slotMatch[1]));
        if (!slot) return sendJson(res, 404, { erro: 'Slot não encontrado.' });
        if (status) slot.status = status;
        if (numero) slot.numero = numero;
        if (operadora !== undefined) slot.operadora = operadora;
        if (pais !== undefined) slot.pais = pais;
        return sendJson(res, 200, { slot });
      });
    }
    if (slotMatch && method === 'DELETE') {
      return transact((db) => {
        db.slots = db.slots.filter((s) => s.id !== Number(slotMatch[1]));
        return sendJson(res, 200, { ok: true });
      });
    }

    if (pathname === '/api/admin/servicos' && method === 'POST') {
      const { nome, precoCentavos } = await readBody(req);
      if (!nome || !precoCentavos) return sendJson(res, 400, { erro: 'Informe nome e preço.' });
      return transact((db) => {
        const servico = { id: nextId(db, 'services'), nome, precoCentavos, ativo: true };
        db.services.push(servico);
        return sendJson(res, 201, { servico });
      });
    }
    const servicoMatch = pathname.match(/^\/api\/admin\/servicos\/(\d+)$/);
    if (servicoMatch && method === 'PUT') {
      const { nome, precoCentavos, ativo } = await readBody(req);
      return transact((db) => {
        const s = db.services.find((x) => x.id === Number(servicoMatch[1]));
        if (!s) return sendJson(res, 404, { erro: 'Serviço não encontrado.' });
        if (nome) s.nome = nome;
        if (precoCentavos) s.precoCentavos = precoCentavos;
        if (ativo !== undefined) s.ativo = ativo;
        return sendJson(res, 200, { servico: s });
      });
    }

    if (pathname === '/api/admin/pedidos' && method === 'GET') {
      const db = load();
      return sendJson(res, 200, { pedidos: [...db.orders].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)) });
    }

    if (pathname === '/api/admin/usuarios' && method === 'GET') {
      const db = load();
      return sendJson(res, 200, { usuarios: db.users.map(publicUser) });
    }

    // Credita saldo manualmente num usuário (uso do admin, ex: pagamento fora do site)
    const creditarMatch = pathname.match(/^\/api\/admin\/usuarios\/(\d+)\/creditar$/);
    if (creditarMatch && method === 'POST') {
      const { valorReais } = await readBody(req);
      if (!valorReais || valorReais <= 0) return sendJson(res, 400, { erro: 'Informe um valor válido.' });
      return transact((db) => {
        const u = db.users.find((x) => x.id === Number(creditarMatch[1]));
        if (!u) return sendJson(res, 404, { erro: 'Usuário não encontrado.' });
        u.saldoCentavos += Math.round(valorReais * 100);
        return sendJson(res, 200, { usuario: publicUser(u) });
      });
    }

    // Redefine a senha de um usuário (uso do admin, quando o cliente esquece a senha)
    const redefinirSenhaMatch = pathname.match(/^\/api\/admin\/usuarios\/(\d+)\/redefinir-senha$/);
    if (redefinirSenhaMatch && method === 'POST') {
      const { senha } = await readBody(req);
      if (!senha || senha.length < 6) return sendJson(res, 400, { erro: 'A senha precisa ter no mínimo 6 caracteres.' });
      return transact((db) => {
        const u = db.users.find((x) => x.id === Number(redefinirSenhaMatch[1]));
        if (!u) return sendJson(res, 404, { erro: 'Usuário não encontrado.' });
        u.senhaHash = hashPassword(senha);
        return sendJson(res, 200, { ok: true });
      });
    }

    // Simula a chegada de um SMS sem precisar da chipeira real (para testes)
    if (pathname === '/api/admin/simular-sms' && method === 'POST') {
      const { slotId, mensagem } = await readBody(req);
      return transact((db) => {
        const slot = db.slots.find((s) => s.id === slotId);
        if (!slot) return sendJson(res, 404, { erro: 'Slot não encontrado.' });
        const pedido = db.orders.find((o) => o.id === slot.pedidoAtualId && o.status === 'aguardando');
        if (!pedido) return sendJson(res, 400, { erro: 'Não há pedido aguardando neste slot.' });
        pedido.mensagemRecebida = mensagem;
        pedido.codigo = extrairCodigo(mensagem);
        pedido.status = 'recebido';
        return sendJson(res, 200, { ok: true, pedido });
      });
    }

    return sendJson(res, 404, { erro: 'Rota de admin não encontrada.' });
  }

  return sendJson(res, 404, { erro: 'Rota não encontrada.' });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  try {
    if (pathname.startsWith('/api/')) {
      await api(req, res, pathname, method);
    } else {
      serveStatic(req, res, pathname);
    }
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { erro: 'Erro interno do servidor.', detalhe: String(e.message) });
  }
});

server.listen(PORT, () => {
  console.log(`\n✅  Servidor rodando em http://localhost:${PORT}`);
  console.log(`   Admin padrão: admin@seusite.com.br / admin123 (troque a senha!)\n`);
});
