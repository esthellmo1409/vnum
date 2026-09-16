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
const sim5 = require('./lib/5sim');
const smsman = require('./lib/smsman');
const funil = require('./lib/funil');
const seoPages = require('./lib/seo-pages');
const aquisicao = require('./lib/aquisicao');

function calcularPrecoVendaCentavos(custoReaisCentavos, db) {
  const config = (db && db.configuracoes) || {};
  const multiplicador = config.multiplicador5sim || 5;
  const margemFixaCentavos = config.margemFixaCentavos != null ? config.margemFixaCentavos : 100;
  const opcaoMultiplicador = custoReaisCentavos * multiplicador;
  const opcaoFixa = custoReaisCentavos + margemFixaCentavos;
  return Math.max(opcaoMultiplicador, opcaoFixa);
}

const NORMALIZACOES_PAIS_5SIM = { US: 'usa', GB: 'england', KR: 'southkorea', AE: 'uae', CZ: 'czechrepublic', DO: 'dominicanrepublic', NZ: 'newzealand', ZA: 'southafrica', SA: 'saudiarabia' };
function pais5simPorIso(iso) {
  if (NORMALIZACOES_PAIS_5SIM[iso]) return NORMALIZACOES_PAIS_5SIM[iso];
  try {
    const nomeIngles = new Intl.DisplayNames(['en'], { type: 'region' }).of(iso);
    return nomeIngles ? nomeIngles.toLowerCase().replace(/[^a-z]/g, '') : null;
  } catch (e) {
    return null;
  }
}
const SERVICO_5SIM = {
  whatsapp: 'whatsapp', telegram: 'telegram', instagram: 'instagram', facebook: 'facebook',
  tiktok: 'tiktok', discord: 'discord', google: 'google', twitter: 'twitter',
  kwai: 'kwai', tinder: 'tinder', uber: 'uber', picpay: 'picpay', olx: 'olx', shopee: 'shopee',
  amazon: 'amazon', netflix: 'netflix', linkedin: 'linkedin', airbnb: 'airbnb', paypal: 'paypal',
  'mercado livre': 'mercado'
};
function produto5simPorNome(nome) {
  const chave = (nome || '').toLowerCase();
  for (const k in SERVICO_5SIM) { if (chave.includes(k)) return SERVICO_5SIM[k]; }
  return null;
}

const PAIS_SMSMAN_MANUAL = { BR: 150, PT: 263, AR: 119, PH: 8, US: 5, MX: 18 };
let smsmanPaisesCache = null;
async function carregarSmsmanPaisesCache() {
  if (!smsmanPaisesCache) {
    try { smsmanPaisesCache = await smsman.listarPaises(); } catch (e) { smsmanPaisesCache = {}; }
  }
  return smsmanPaisesCache;
}
async function paisSmsmanPorIso(iso) {
  if (PAIS_SMSMAN_MANUAL[iso]) return PAIS_SMSMAN_MANUAL[iso];
  const cache = await carregarSmsmanPaisesCache();
  let nomeIngles = null;
  try { nomeIngles = new Intl.DisplayNames(['en'], { type: 'region' }).of(iso); } catch (e) {}
  if (!nomeIngles) return null;
  const alvo = nomeIngles.toLowerCase().replace(/[^a-z]/g, '');
  for (const id in cache) {
    const titulo = (cache[id].title || '').toLowerCase().replace(/[^a-z]/g, '');
    if (titulo === alvo || titulo.includes(alvo) || alvo.includes(titulo)) return Number(id);
  }
  return null;
}
const SERVICO_SMSMAN = { whatsapp: 6, telegram: 3, instagram: 5, facebook: 124, twitter: 125, uber: 126, olx: 129 };
function produtoSmsmanPorNome(nome) {
  const chave5sim = produto5simPorNome(nome);
  if (chave5sim && SERVICO_SMSMAN[chave5sim]) return SERVICO_SMSMAN[chave5sim];
  const chave = (nome || '').toLowerCase();
  for (const k in SERVICO_SMSMAN) { if (chave.includes(k)) return SERVICO_SMSMAN[k]; }
  return null;
}

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
const PEDIDO_TTL_MS = 15 * 60 * 1000; // 15 minutos para o número expirar (igual ao prazo do 5SIM, evita erro ao cancelar/consultar apos expirar la)
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
  return { id: u.id, nome: u.nome, email: u.email, saldoCentavos: u.saldoCentavos, isAdmin: !!u.isAdmin, codigoAfiliado: u.codigoAfiliado || null, saldoComissaoCentavos: u.saldoComissaoCentavos || 0 };
}

function extrairCodigo(mensagem) {
  const m = mensagem.match(/\b(\d{3}[-\s]?\d{3}|\d{4,8})\b/);
  return m ? m[0] : null;
}

function extrairDDD(numero) {
  const m = (numero || '').match(/^\+55\s*(\d{2})/);
  return m ? m[1] : null;
}

function registrarEvento(db, evento, extra) {
  if (!db.eventos) db.eventos = [];
  if (!db._seq.eventos) db._seq.eventos = 1;
  db.eventos.push({
    id: nextId(db, 'eventos'),
    evento: String(evento || '').slice(0, 40),
    userId: extra && extra.userId || null,
    servicoId: extra && extra.servicoId || null,
    origem: extra && extra.origem || null,
    ref: extra && extra.ref || null,
    visitorId: extra && extra.visitorId || null,
    em: new Date().toISOString()
  });
  if (db.eventos.length > 5000) db.eventos = db.eventos.slice(-4000);
}

// ---------- Servir arquivos estáticos de /public ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  const seoHtml = seoPages.render(pathname);
  if (seoHtml) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(seoHtml);
  }
  if (pathname === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('User-agent: *\nAllow: /\nSitemap: https://www.simsms.com.br/sitemap.xml\n');
  }
  if (pathname === '/sitemap.xml') {
    const urls = ['/', '/login.html', '/cadastro.html', '/afiliados.html', ...Object.keys(seoPages.PAGES)]
      .map((u) => `  <url><loc>https://www.simsms.com.br${u}</loc></url>`).join('\n');
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  }
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
    const { nome, email, senha, ref, utmSource, utmCampaign, origemTrafego } = await readBody(req);
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
        saldoComissaoCentavos: 0,
        codigoAfiliado: null,
        indicadoPor: null,
        afiliadoStatus: 'indicacao',
        origemTrafego: aquisicao.classificarOrigem(origemTrafego || utmSource, ref),
        utmSource: utmSource || null,
        utmCampaign: utmCampaign || null,
        isAdmin: false,
        criadoEm: new Date().toISOString()
      };
      user.codigoAfiliado = aquisicao.garantirCodigo(user);
      if (ref) {
        const afiliadoRef = aquisicao.encontrarPorRef(db, ref);
        if (afiliadoRef && afiliadoRef.id !== user.id) {
          user.indicadoPor = afiliadoRef.id;
          if (!user.origemTrafego || user.origemTrafego === 'direto') {
            user.origemTrafego = aquisicao.papel(afiliadoRef) === 'ativo' ? 'afiliado' : 'indicacao';
          }
        }
      }
      db.users.push(user);
      registrarEvento(db, 'signup', { userId: user.id, origem: user.origemTrafego, ref: ref || null });
      if (ref) registrarEvento(db, 'affiliate_signup', { userId: user.id, ref: ref });
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
  if (pathname === '/api/precos/internacional' && method === 'GET') {
    const urlObj2 = new URL(req.url, 'http://' + req.headers.host);
    const paisConsulta = urlObj2.searchParams.get('pais') || 'BR';
    const servicoNomeConsulta = urlObj2.searchParams.get('servico') || 'whatsapp';
    async function taxaCambioConsulta() {
      let t = 5.1;
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD');
        const d = await r.json();
        if (d.rates && d.rates.BRL) t = d.rates.BRL;
      } catch (e) {}
      return t;
    }
    if (paisConsulta === 'BR') {
      try {
        const pais5simBR = pais5simPorIso('BR');
        const produto5simBR = produto5simPorNome(servicoNomeConsulta);
        let menorCustoBR = Infinity;
        if (pais5simBR && produto5simBR) {
          const precosBR = await sim5.buscarPreco(pais5simBR, produto5simBR);
          if (precosBR) { for (const op in precosBR) { if (precosBR[op].count > 0 && precosBR[op].cost < menorCustoBR) { menorCustoBR = precosBR[op].cost; } } }
        }
        if (menorCustoBR === Infinity) {
          const paisSmsmanBR = await paisSmsmanPorIso('BR');
          const produtoSmsmanBR = produtoSmsmanPorNome(servicoNomeConsulta);
          if (paisSmsmanBR && produtoSmsmanBR) {
            const precoSmsmanBR = await smsman.buscarPreco(paisSmsmanBR, produtoSmsmanBR);
            if (precoSmsmanBR && precoSmsmanBR.estoque > 0) menorCustoBR = precoSmsmanBR.custo;
          }
        }
        if (menorCustoBR === Infinity) return sendJson(res, 200, { precoCentavos: null });
        const taxaBR = await taxaCambioConsulta();
        const custoReaisBR = Math.round(menorCustoBR * taxaBR * 100);
        return sendJson(res, 200, { precoCentavos: custoReaisBR + 200 });
      } catch (eBR) {
        return sendJson(res, 200, { precoCentavos: null });
      }
    }
    const pais5simConsulta = pais5simPorIso(paisConsulta);
    const produto5simConsulta = produto5simPorNome(servicoNomeConsulta);
    if (!pais5simConsulta || !produto5simConsulta) return sendJson(res, 200, { precoCentavos: null });
    try {
      const precosConsulta = await sim5.buscarPreco(pais5simConsulta, produto5simConsulta);
      let menorCustoConsulta = Infinity;
      if (precosConsulta) { for (const op in precosConsulta) { if (precosConsulta[op].count > 0 && precosConsulta[op].cost < menorCustoConsulta) { menorCustoConsulta = precosConsulta[op].cost; } } }
      if (menorCustoConsulta === Infinity) return sendJson(res, 200, { precoCentavos: null });
      const taxaConsulta = await taxaCambioConsulta();
      const custoReaisConsulta = Math.round(menorCustoConsulta * taxaConsulta * 100);
      const dbConsulta = load();
      const precoVendaConsulta = calcularPrecoVendaCentavos(custoReaisConsulta, dbConsulta);
      return sendJson(res, 200, { precoCentavos: precoVendaConsulta });
    } catch (eConsulta) {
      return sendJson(res, 200, { precoCentavos: null });
    }
  }
  if (pathname === '/api/paises-5sim' && method === 'GET') {
    try {
      const isos = await sim5.listarPaisesDisponiveis();
      return sendJson(res, 200, { isos });
    } catch (e) {
      return sendJson(res, 200, { isos: [] });
    }
  }

  if (pathname === '/api/eventos' && method === 'POST') {
    const body = await readBody(req);
    const permitido = [
      'page_view', 'service_view', 'click_buy', 'signup',
      'pix_started', 'pix_paid', 'activation_started', 'sms_received',
      'activation_cancelled', 'refund', 'second_purchase', 'first_purchase',
      'repeat_purchase', 'affiliate_click', 'affiliate_signup', 'affiliate_purchase', 'coupon_used'
    ];
    if (!permitido.includes(body && body.evento)) {
      return sendJson(res, 400, { erro: 'Evento inválido.' });
    }
    const u = getUser(req);
    transact((db) => {
      registrarEvento(db, body.evento, {
        userId: u ? u.id : null,
        servicoId: body.servicoId || null,
        origem: body.origem || null,
        ref: body.ref || null,
        visitorId: body.visitorId || null
      });
    });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/publico' && method === 'GET') {
    const db = load();
    return sendJson(res, 200, funil.snapshotPublico(db, { pixAutomatico: !!process.env.MP_ACCESS_TOKEN }));
  }

  if (pathname === '/api/catalogo' && method === 'GET') {
    const db = load();
    const servicos = db.services.filter((s) => s.ativo).map((s) => Object.assign({}, s, {
      categoria: s.categoria || funil.categoriaServico(s.nome),
      pais: s.pais || 'BR'
    }));
    return sendJson(res, 200, { servicos });
  }

  // ----- CARTEIRA / SALDO -----
  if (pathname === '/api/carteira' && method === 'GET') {
    if (!user) return requireLogin();
    return sendJson(res, 200, { saldoCentavos: user.saldoCentavos });
  }

  if (pathname === '/api/afiliado' && method === 'GET') {
    if (!user) return requireLogin();
    return transact((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (!u) return sendJson(res, 404, { erro: 'Usuário não encontrado.' });
      const stats = aquisicao.statsIndicacao(db, u);
      return sendJson(res, 200, Object.assign({ ehAfiliado: stats.ehAfiliado }, stats, {
        totalIndicados: stats.cadastros,
        totalVendasComComissao: stats.historico.length,
        saldoComissaoCentavos: stats.saldoDisponivelCentavos,
        vendas: stats.historico
      }));
    });
  }

  if (pathname === '/api/afiliado/solicitar' && method === 'POST') {
    if (!user) return requireLogin();
    return transact((db) => {
      const u = db.users.find((x) => x.id === user.id);
      aquisicao.garantirCodigo(u);
      const cfg = funil.mergeConfiguracoes(db.configuracoes).aquisicao;
      if (aquisicao.papel(u) === 'bloqueado') return sendJson(res, 403, { erro: 'Conta de afiliado bloqueada.' });
      if (aquisicao.papel(u) === 'ativo') return sendJson(res, 200, { ok: true, afiliadoStatus: 'ativo' });
      u.afiliadoStatus = cfg.aprovacaoObrigatoria ? 'pendente' : 'ativo';
      registrarEvento(db, 'affiliate_click', { userId: u.id });
      return sendJson(res, 200, { ok: true, afiliadoStatus: u.afiliadoStatus });
    });
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
  if (pathname === '/api/cupons/validar' && method === 'GET') {
    if (!user) return requireLogin();
    const db = load();
    const codigo = new URL(req.url, 'http://localhost').searchParams.get('codigo');
    const v = aquisicao.validarCupom(db, codigo, user.id);
    if (!v.ok) return sendJson(res, 400, { erro: v.erro });
    return sendJson(res, 200, { cupom: { codigo: v.cupom.codigo, descontoPercent: v.cupom.descontoPercent || 0, descontoCentavos: v.cupom.descontoCentavos || v.cupom.bonusCentavos || 0 } });
  }

  if (pathname === '/api/pedidos' && method === 'POST') {
    if (!user) return requireLogin();
    const { servicoId, pais, ddd, precoEsperadoCentavos, cupom: cupomCodigo, origemTrafego, utmSource, ref } = await readBody(req);
    let precoMudouDesdeATela = false;
    let precoAtualDisponivel = null;
    const paisAlvo = pais || 'BR';
    const dbCheck = load();
    const servicoCheck = dbCheck.services.find((s) => s.id === servicoId && s.ativo);
    const temSlotFisico = servicoCheck ? dbCheck.slots.some((s) => s.status === 'livre' && (s.pais || 'BR') === paisAlvo && (!ddd || extrairDDD(s.numero) === ddd)) : true;
    let compra5sim = null;
    let compraSmsman = null;
    let custoDolarSmsman = null;
    let custoReaisCentavos = null;
    let precoVendaCentavos = null;
    if (servicoCheck && !temSlotFisico) {
      let quote5sim = null;
      let quoteSmsman = null;
      const pais5sim = pais5simPorIso(paisAlvo);
      const produto5sim = produto5simPorNome(servicoCheck.nome);
      if (pais5sim && produto5sim) {
        try {
          const precos = await sim5.buscarPreco(pais5sim, produto5sim);
          let menorCusto = Infinity;
          if (precos) { for (const op in precos) { if (precos[op].count > 0 && precos[op].cost < menorCusto) { menorCusto = precos[op].cost; } } }
          if (menorCusto !== Infinity) {
            let taxaUsdBrl = 5.1;
            try {
              const cambioRes = await fetch("https://open.er-api.com/v6/latest/USD");
              const cambioData = await cambioRes.json();
              if (cambioData.rates && cambioData.rates.BRL) taxaUsdBrl = cambioData.rates.BRL;
            } catch (e2) {}
            const custoCotadoReaisCentavos = Math.round(menorCusto * taxaUsdBrl * 100);
            quote5sim = { pais5sim, produto5sim, taxaUsdBrl, custoReaisCentavos: custoCotadoReaisCentavos };
          }
        } catch (e) {}
      }
      const paisSmsmanId = await paisSmsmanPorIso(paisAlvo);
      const produtoSmsmanId = produtoSmsmanPorNome(servicoCheck.nome);
      if (paisSmsmanId && produtoSmsmanId) {
        try {
          const precoSmsman = await smsman.buscarPreco(paisSmsmanId, produtoSmsmanId);
          if (precoSmsman && precoSmsman.estoque > 0) {
            let taxaUsdBrlSmsman = 5.1;
            try {
              const cambioResSmsman = await fetch("https://open.er-api.com/v6/latest/USD");
              const cambioDataSmsman = await cambioResSmsman.json();
              if (cambioDataSmsman.rates && cambioDataSmsman.rates.BRL) taxaUsdBrlSmsman = cambioDataSmsman.rates.BRL;
            } catch (e3) {}
            const custoCotadoReaisCentavosSmsman = Math.round(precoSmsman.custo * taxaUsdBrlSmsman * 100);
            quoteSmsman = { paisSmsmanId, produtoSmsmanId, custoUsd: precoSmsman.custo, taxaUsdBrl: taxaUsdBrlSmsman, custoReaisCentavos: custoCotadoReaisCentavosSmsman };
          }
        } catch (e4) {}
      }
      const ordemFornecedores = [];
      if (quote5sim && quoteSmsman) {
        if (quote5sim.custoReaisCentavos <= quoteSmsman.custoReaisCentavos) { ordemFornecedores.push('5sim', 'smsman'); }
        else { ordemFornecedores.push('smsman', '5sim'); }
      } else if (quote5sim) { ordemFornecedores.push('5sim'); }
      else if (quoteSmsman) { ordemFornecedores.push('smsman'); }
      for (const fornecedor of ordemFornecedores) {
        if (fornecedor === '5sim' && !compra5sim) {
          precoVendaCentavos = paisAlvo === 'BR' ? (quote5sim.custoReaisCentavos + 200) : calcularPrecoVendaCentavos(quote5sim.custoReaisCentavos, dbCheck);
          const excedeAnunciado5sim = precoEsperadoCentavos != null && precoVendaCentavos > precoEsperadoCentavos * 1.10;
          if (precoAtualDisponivel == null || precoVendaCentavos < precoAtualDisponivel) precoAtualDisponivel = precoVendaCentavos;
          if (excedeAnunciado5sim) { precoMudouDesdeATela = true; continue; }
          try {
            compra5sim = await sim5.comprarNumero(quote5sim.pais5sim, 'any', quote5sim.produto5sim);
            if (compra5sim) { custoReaisCentavos = Math.round(compra5sim.price * quote5sim.taxaUsdBrl * 100); }
          } catch (e) { compra5sim = null; }
        }
        if (fornecedor === 'smsman' && !compraSmsman) {
          precoVendaCentavos = paisAlvo === 'BR' ? (quoteSmsman.custoReaisCentavos + 200) : calcularPrecoVendaCentavos(quoteSmsman.custoReaisCentavos, dbCheck);
          const excedeAnunciadoSmsman = precoEsperadoCentavos != null && precoVendaCentavos > precoEsperadoCentavos * 1.10;
          if (precoAtualDisponivel == null || precoVendaCentavos < precoAtualDisponivel) precoAtualDisponivel = precoVendaCentavos;
          if (excedeAnunciadoSmsman) { precoMudouDesdeATela = true; continue; }
          try {
            const compra = await smsman.comprarNumero(quoteSmsman.paisSmsmanId, quoteSmsman.produtoSmsmanId);
            if (compra) {
              compraSmsman = compra;
              custoDolarSmsman = quoteSmsman.custoUsd;
              custoReaisCentavos = Math.round(quoteSmsman.custoUsd * quoteSmsman.taxaUsdBrl * 100);
            }
          } catch (e4) { compraSmsman = null; }
        }
        if (compra5sim || compraSmsman) break;
      }
    }
    return transact((db) => {
      const servico = db.services.find((s) => s.id === servicoId && s.ativo);
      if (!servico) return sendJson(res, 404, { erro: 'Serviço não encontrado.' });
      const u = db.users.find((x) => x.id === user.id);
      let precoCobrado = (compra5sim || compraSmsman) ? precoVendaCentavos : servico.precoCentavos;
      let cupomUsado = null;
      if (cupomCodigo) {
        const v = aquisicao.validarCupom(db, cupomCodigo, user.id);
        if (!v.ok) return sendJson(res, 400, { erro: v.erro });
        const desc = aquisicao.descontoCupom(v.cupom, precoCobrado);
        precoCobrado = Math.max(1, precoCobrado - desc);
        cupomUsado = v.cupom;
      }
      if (u.saldoCentavos < precoCobrado) {
        return sendJson(res, 402, { erro: 'Saldo insuficiente. Adicione créditos.' });
      }
      const slot = db.slots.find((s) => s.status === 'livre' && (s.pais || 'BR') === paisAlvo && (!ddd || extrairDDD(s.numero) === ddd));
      if (!slot && !compra5sim && !compraSmsman) {
        if (precoMudouDesdeATela) {
          return sendJson(res, 409, { erro: 'Os valores mudam de acordo com a disponibilidade dos servidores no momento.', precoAtualizado: precoAtualDisponivel });
        }
        return sendJson(res, 503, { erro: ddd ? `Nenhum número disponível agora para o DDD ${ddd}.` : `Nenhum número disponível agora para ${paisAlvo === 'BR' ? 'o Brasil' : paisAlvo}. Tente novamente em instantes.` });
      }
      u.saldoCentavos -= precoCobrado;
      if (slot) { slot.status = 'ocupado'; }
      const order = {
        id: nextId(db, 'orders'),
        userId: user.id,
        servicoId: servico.id,
        servicoNome: servico.nome,
        slotId: slot ? slot.id : null,
        numero: slot ? slot.numero : (compra5sim ? compra5sim.phone : compraSmsman.numero),
        pais: paisAlvo,
        origem: slot ? 'chip' : (compra5sim ? '5sim' : 'smsman'),
        sim5PedidoId: slot || !compra5sim ? null : compra5sim.id,
        smsmanPedidoId: slot || !compraSmsman ? null : compraSmsman.requestId,
        custoReaisCentavos: slot ? null : custoReaisCentavos,
        custoDolar: slot ? null : (compra5sim ? compra5sim.price : custoDolarSmsman),
        precoPagoCentavos: precoCobrado,
        status: 'aguardando',
        mensagemRecebida: null,
        codigo: null,
        criadoEm: new Date().toISOString(),
        expiraEm: new Date(Date.now() + PEDIDO_TTL_MS).toISOString()
      };
      if (slot) { slot.pedidoAtualId = order.id; }
      order.comissaoCentavos = null;
      order.comissaoAfiliadoId = null;
      order.origemTrafego = aquisicao.classificarOrigem(origemTrafego || utmSource || u.origemTrafego, ref || u.indicadoPor);
      order.utmSource = utmSource || u.utmSource || null;
      if (cupomUsado) {
        order.cupomCodigo = cupomUsado.codigo;
        cupomUsado.usos = (cupomUsado.usos || 0) + 1;
        registrarEvento(db, 'coupon_used', { userId: user.id, servicoId: servico.id });
      }
      const cfgAq = funil.mergeConfiguracoes(db.configuracoes).aquisicao;
      const primeira = aquisicao.primeiraCompraDoUsuario(db, user.id, order.id);
      aquisicao.aplicarComissao(db, u, order, cfgAq);
      db.orders.push(order);
      registrarEvento(db, 'activation_started', { userId: user.id, servicoId: servico.id, origem: order.origemTrafego });
      registrarEvento(db, primeira ? 'first_purchase' : 'repeat_purchase', { userId: user.id, servicoId: servico.id });
      if (!primeira) registrarEvento(db, 'second_purchase', { userId: user.id, servicoId: servico.id });
      if (order.comissaoAfiliadoId) registrarEvento(db, 'affiliate_purchase', { userId: user.id, ref: (db.users.find((x) => x.id === order.comissaoAfiliadoId) || {}).codigoAfiliado || null });
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
    const dbPeek = load();
    const pedidoPeek = dbPeek.orders.find((o) => o.id === Number(cancelarMatch[1]) && o.userId === user.id);
    if (!pedidoPeek) return sendJson(res, 404, { erro: 'Pedido não encontrado.' });
    if (pedidoPeek.status !== 'aguardando') {
      return sendJson(res, 400, { erro: 'Este pedido não pode mais ser cancelado.' });
    }
    const decorridoMsPeek = Date.now() - new Date(pedidoPeek.criadoEm).getTime();
    if (decorridoMsPeek < PEDIDO_CANCEL_MIN_MS) {
      const faltamSegPeek = Math.ceil((PEDIDO_CANCEL_MIN_MS - decorridoMsPeek) / 1000);
      return sendJson(res, 400, { erro: `Aguarde mais ${faltamSegPeek} segundos para poder cancelar este pedido.` });
    }
    if (pedidoPeek.origem === '5sim' && pedidoPeek.sim5PedidoId) {
      try { await sim5.cancelarPedido(pedidoPeek.sim5PedidoId); } catch (e) { console.error('Erro ao cancelar no 5SIM:', e.message); }
    }
    if (pedidoPeek.origem === 'smsman' && pedidoPeek.smsmanPedidoId) {
      try { await smsman.cancelarNumero(pedidoPeek.smsmanPedidoId); } catch (e) { console.error('Erro ao cancelar no SMS-Man:', e.message); }
    }
    return transact((db) => {
      const pedido = db.orders.find((o) => o.id === Number(cancelarMatch[1]) && o.userId === user.id);
      if (!pedido || pedido.status !== 'aguardando') {
        return sendJson(res, 400, { erro: 'Este pedido não pode mais ser cancelado.' });
      }
      const servico = db.services.find((s) => s.id === pedido.servicoId);
      const u = db.users.find((x) => x.id === user.id);
      const valorEstorno = pedido.precoPagoCentavos != null ? pedido.precoPagoCentavos : (servico ? servico.precoCentavos : 0);
      u.saldoCentavos += valorEstorno; // estorna o valor real pago (nao o preco fixo do catalogo)
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
    const { valorReais, nomePagador, cpfPagador, origemTrafego, utmSource, ref } = await readBody(req);
    if (!valorReais || valorReais < 5) return sendJson(res, 400, { erro: 'Valor mínimo de recarga: R$ 5,00.' });
    try {
      const txId = transact((db) => nextId(db, 'transactions'));
      const pix = await mp.criarPagamentoPix({
        valorReais,
        descricao: `Recarga de créditos #${txId}`,
        emailPagador: user.email,
        orderId: txId,
        nomePagador,
        cpfPagador
      });
      transact((db2) => {
        db2.transactions.push({
          id: txId, userId: user.id, valorCentavos: Math.round(valorReais * 100),
          metodo: 'pix', status: pix.status, mpPaymentId: pix.paymentId, criadoEm: new Date().toISOString(),
          origemTrafego: aquisicao.classificarOrigem(origemTrafego || utmSource, ref)
        });
        registrarEvento(db2, 'pix_started', { userId: user.id, origem: origemTrafego || utmSource || null, ref: ref || null });
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
      const txId = transact((db) => nextId(db, 'transactions'));
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
          if (tx && pagamento.status === 'approved') {
            const r = funil.aplicarCreditoAprovado(db, tx);
            if (!r.jaAplicado) registrarEvento(db, 'pix_paid', { userId: tx.userId });
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

  // Verificacao ativa: consulta o Mercado Pago diretamente em vez de esperar o webhook passivo
  // (util quando o webhook do painel do MP nao esta configurado ou falha)
  const verificarPagMatch = pathname.match(/^\/api\/pagamentos\/(\d+)\/verificar$/);
  if (verificarPagMatch && method === 'POST') {
    if (!user) return requireLogin();
    const txId = Number(verificarPagMatch[1]);
    try {
      const dbPeek = load();
      const txPeek = dbPeek.transactions.find((t) => t.id === txId && t.userId === user.id);
      if (!txPeek) return sendJson(res, 404, { erro: 'Transação não encontrada.' });
      if (txPeek.status === 'aprovado') return sendJson(res, 200, { status: 'aprovado' });
      if (!txPeek.mpPaymentId) return sendJson(res, 200, { status: txPeek.status });
      const pagamento = await mp.consultarPagamento(txPeek.mpPaymentId);
      const resultado = transact((db) => {
        const tx = db.transactions.find((t) => t.id === txId && t.userId === user.id);
        if (!tx) return { status: 'nao_encontrado' };
        if (tx.status !== 'aprovado' && pagamento.status === 'approved') {
          const r = funil.aplicarCreditoAprovado(db, tx);
          if (!r.jaAplicado) registrarEvento(db, 'pix_paid', { userId: tx.userId });
          return { status: 'aprovado', saldoCentavos: r.saldoCentavos, bonusCentavos: r.bonusCentavos };
        }
        tx.status = pagamento.status;
        return { status: pagamento.status };
      });
      return sendJson(res, 200, resultado);
    } catch (e) {
      return sendJson(res, 502, { erro: 'Falha ao verificar pagamento.', detalhe: String(e.message) });
    }
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
      const pedidosComUsuario = db.orders.map((o) => {
        const u = db.users.find((x) => x.id === o.userId);
        return Object.assign({}, o, { usuarioNome: u ? u.nome : null, usuarioEmail: u ? u.email : null });
      });
      return sendJson(res, 200, { pedidos: pedidosComUsuario.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)) });
    }

    if (pathname === '/api/admin/metricas' && method === 'GET') {
      const db = load();
      const agora = Date.now();
      const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      const seteDias = agora - 7 * 24 * 60 * 60 * 1000;
      const trintaDias = agora - 30 * 24 * 60 * 60 * 1000;
      const noPeriodo = (p, desde) => new Date(p.criadoEm).getTime() >= desde;
      const pedidos = db.orders || [];
      const hoje = pedidos.filter((p) => noPeriodo(p, inicioDia.getTime()));
      const d7 = pedidos.filter((p) => noPeriodo(p, seteDias));
      const d30 = pedidos.filter((p) => noPeriodo(p, trintaDias));
      const taxa = (lista) => {
        if (!lista.length) return 0;
        const ok = lista.filter((p) => p.status === 'recebido').length;
        return Math.round((ok / lista.length) * 100);
      };
      const receita = (lista) => lista
        .filter((p) => p.status === 'recebido' || p.status === 'aguardando')
        .reduce((acc, p) => {
          if (p.precoPagoCentavos != null) return acc + p.precoPagoCentavos;
          const s = db.services.find((x) => x.id === p.servicoId);
          return acc + (s ? s.precoCentavos : 0);
        }, 0);
      const slotsLivres = (db.slots || []).filter((s) => s.status === 'livre').length;
      const aguardando = pedidos.filter((p) => p.status === 'aguardando').length;
      return sendJson(res, 200, {
        metricas: {
          pedidosHoje: hoje.length,
          pedidos7d: d7.length,
          pedidos30d: d30.length,
          taxaEntrega7d: taxa(d7),
          receitaHojeCentavos: receita(hoje),
          receita7dCentavos: receita(d7),
          receita30dCentavos: receita(d30),
          ticketMedio7dCentavos: d7.length ? Math.round(receita(d7) / d7.length) : 0,
          slotsLivres,
          aguardando,
          usuarios: (db.users || []).filter((u) => !u.isAdmin).length,
          conversao: funil.metricasConversao(db)
        }
      });
    }

    const cancelarAdminMatch = pathname.match(/^\/api\/admin\/pedidos\/(\d+)\/cancelar$/);
    if (cancelarAdminMatch && method === 'POST') {
      const dbPeek = load();
      const pedidoPeek = dbPeek.orders.find((o) => o.id === Number(cancelarAdminMatch[1]));
      if (!pedidoPeek) return sendJson(res, 404, { erro: 'Pedido não encontrado.' });
      if (pedidoPeek.status !== 'aguardando') {
        return sendJson(res, 400, { erro: 'Só dá pra cancelar pedidos aguardando SMS.' });
      }
      if (pedidoPeek.origem === '5sim' && pedidoPeek.sim5PedidoId) {
        try { await sim5.cancelarPedido(pedidoPeek.sim5PedidoId); } catch (e) { console.error('Erro ao cancelar no 5SIM (admin):', e.message); }
      }
      if (pedidoPeek.origem === 'smsman' && pedidoPeek.smsmanPedidoId) {
        try { await smsman.cancelarNumero(pedidoPeek.smsmanPedidoId); } catch (e) { console.error('Erro ao cancelar no SMS-Man (admin):', e.message); }
      }
      return transact((db) => {
        const pedido = db.orders.find((o) => o.id === Number(cancelarAdminMatch[1]));
        if (!pedido || pedido.status !== 'aguardando') {
          return sendJson(res, 400, { erro: 'Só dá pra cancelar pedidos aguardando SMS.' });
        }
        const servico = db.services.find((s) => s.id === pedido.servicoId);
        const u = db.users.find((x) => x.id === pedido.userId);
        const valorEstorno = pedido.precoPagoCentavos != null ? pedido.precoPagoCentavos : (servico ? servico.precoCentavos : 0);
        if (u) u.saldoCentavos += valorEstorno;
        pedido.status = 'cancelado';
        const slot = pedido.slotId ? db.slots.find((s) => s.id === pedido.slotId) : null;
        if (slot) { slot.status = 'livre'; slot.pedidoAtualId = null; }
        return sendJson(res, 200, { ok: true, pedido });
      });
    }

    if (pathname === '/api/admin/saldo-5sim' && method === 'GET') {
      try {
        const perfil = await sim5.buscarPerfil();
        let taxaUsdBrl = 5.1;
        try {
          const cambioRes = await fetch('https://open.er-api.com/v6/latest/USD');
          const cambioData = await cambioRes.json();
          if (cambioData.rates && cambioData.rates.BRL) taxaUsdBrl = cambioData.rates.BRL;
        } catch (e2) {}
        const saldoCentavos = Math.round((perfil.balance || 0) * taxaUsdBrl * 100);
        return sendJson(res, 200, { saldoDolar: perfil.balance, saldoCentavos, taxaUsdBrl });
      } catch (e) {
        return sendJson(res, 502, { erro: 'Falha ao consultar saldo do 5SIM.', detalhe: String(e.message) });
      }
    }

    if (pathname === '/api/admin/saldo-smsman' && method === 'GET') {
      try {
        const saldoRub = await smsman.obterSaldo();
        let taxaRubBrl = 0.06;
        try {
          const cambioRes = await fetch('https://open.er-api.com/v6/latest/RUB');
          const cambioData = await cambioRes.json();
          if (cambioData.rates && cambioData.rates.BRL) taxaRubBrl = cambioData.rates.BRL;
        } catch (e2) {}
        const saldoCentavos = Math.round(saldoRub * taxaRubBrl * 100);
        return sendJson(res, 200, { saldoRub, saldoCentavos, taxaRubBrl });
      } catch (e) {
        return sendJson(res, 502, { erro: 'Falha ao consultar saldo do SMS-Man.', detalhe: String(e.message) });
      }
    }

    if (pathname === '/api/admin/configuracoes' && method === 'GET') {
      const db = load();
      const config = funil.mergeConfiguracoes(db.configuracoes);
      return sendJson(res, 200, { configuracoes: config });
    }
    if (pathname === '/api/admin/configuracoes' && method === 'PUT') {
      const body = await readBody(req);
      return transact((db) => {
        const atual = funil.mergeConfiguracoes(db.configuracoes);
        db.configuracoes = funil.mergeConfiguracoes(Object.assign({}, atual, body, {
          bonusPrimeiraRecarga: Object.assign({}, atual.bonusPrimeiraRecarga, body.bonusPrimeiraRecarga || {}),
          ofertaNovos: Object.assign({}, atual.ofertaNovos, body.ofertaNovos || {}),
          aquisicao: Object.assign({}, atual.aquisicao, body.aquisicao || {})
        }));
        return sendJson(res, 200, { configuracoes: db.configuracoes });
      });
    }
    if (pathname === '/api/admin/cupons' && method === 'GET') {
      const db = load();
      return sendJson(res, 200, { cupons: db.cupons || [] });
    }
    if (pathname === '/api/admin/cupons' && method === 'POST') {
      const body = await readBody(req);
      const codigo = String(body.codigo || '').trim().toUpperCase();
      if (!codigo) return sendJson(res, 400, { erro: 'Informe o código do cupom.' });
      return transact((db) => {
        if (!db.cupons) db.cupons = [];
        if (!db._seq.cupons) db._seq.cupons = 1;
        if (db.cupons.find((c) => c.codigo === codigo)) return sendJson(res, 409, { erro: 'Cupom já existe.' });
        const cupom = {
          id: nextId(db, 'cupons'),
          codigo,
          bonusCentavos: Math.max(0, Math.round(Number(body.bonusCentavos) || 0)),
          descontoPercent: Math.max(0, Math.min(80, Number(body.descontoPercent) || 0)),
          descontoCentavos: Math.max(0, Math.round(Number(body.descontoCentavos) || 0)),
          validade: body.validade || null,
          usosMax: body.usosMax ? Math.round(Number(body.usosMax)) : null,
          usos: 0,
          userId: body.userId ? Number(body.userId) : null,
          campanha: body.campanha || null,
          afiliadoId: body.afiliadoId ? Number(body.afiliadoId) : null,
          ativo: body.ativo !== false,
          criadoEm: new Date().toISOString()
        };
        db.cupons.push(cupom);
        return sendJson(res, 201, { cupom });
      });
    }
    if (pathname === '/api/admin/financeiro' && method === 'GET') {
      const db = load();
      const pedidos5sim = db.orders.filter((o) => o.custoReaisCentavos != null && o.status !== 'cancelado');
      const detalhado = pedidos5sim.map((o) => {
        const vendaCentavos = o.precoPagoCentavos != null ? o.precoPagoCentavos : 0;
        const usuario = db.users.find((u) => u.id === o.userId);
        return {
          id: o.id, servicoNome: o.servicoNome, numero: o.numero, pais: o.pais,
          custoDolar: o.custoDolar, custoReaisCentavos: o.custoReaisCentavos,
          vendaCentavos: vendaCentavos, lucroCentavos: vendaCentavos - o.custoReaisCentavos,
          criadoEm: o.criadoEm,
          usuarioNome: usuario ? usuario.nome : null, usuarioEmail: usuario ? usuario.email : null
        };
      });
      const totalLucroCentavos = detalhado.reduce((acc, p) => acc + p.lucroCentavos, 0);
      return sendJson(res, 200, { pedidos: detalhado.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)), totalLucroCentavos: totalLucroCentavos });
    }
    if (pathname === '/api/admin/usuarios' && method === 'GET') {
      const db = load();
      return sendJson(res, 200, { usuarios: db.users.map((u) => Object.assign({}, publicUser(u), { criadoEm: u.criadoEm })) });
    }

    const tornarAfiliadoMatch = pathname.match(/^\/api\/admin\/usuarios\/(\d+)\/tornar-afiliado$/);
    if (tornarAfiliadoMatch && method === 'POST') {
      return transact((db) => {
        const u = db.users.find((x) => x.id === Number(tornarAfiliadoMatch[1]));
        if (!u) return sendJson(res, 404, { erro: 'Usuário não encontrado.' });
        aquisicao.garantirCodigo(u);
        u.afiliadoStatus = 'ativo';
        if (u.saldoComissaoCentavos == null) { u.saldoComissaoCentavos = 0; }
        return sendJson(res, 200, { codigoAfiliado: u.codigoAfiliado, afiliadoStatus: u.afiliadoStatus });
      });
    }

    if (pathname === '/api/admin/afiliados' && method === 'GET') {
      const db = load();
      const lista = db.users.map((u) => {
        const st = aquisicao.statsIndicacao(db, u, { criar: false });
        return {
          id: u.id, nome: u.nome, email: u.email, codigoAfiliado: u.codigoAfiliado,
          afiliadoStatus: aquisicao.papel(u),
          totalIndicados: st.cadastros, totalVendasComComissao: st.historico.length,
          saldoComissaoCentavos: u.saldoComissaoCentavos || 0,
          vendas: st.historico,
          pagamentos: st.pagamentos
        };
      }).filter((a) => a.afiliadoStatus === 'pendente' || a.afiliadoStatus === 'ativo' || a.afiliadoStatus === 'bloqueado' || a.totalIndicados > 0 || a.saldoComissaoCentavos > 0);
      return sendJson(res, 200, { afiliados: lista });
    }

    const statusAfiliadoMatch = pathname.match(/^\/api\/admin\/afiliados\/(\d+)\/status$/);
    if (statusAfiliadoMatch && method === 'PUT') {
      const { status } = await readBody(req);
      const permitido = ['ativo', 'bloqueado', 'pendente', 'indicacao'];
      if (!permitido.includes(status)) return sendJson(res, 400, { erro: 'Status inválido.' });
      return transact((db) => {
        const u = db.users.find((x) => x.id === Number(statusAfiliadoMatch[1]));
        if (!u) return sendJson(res, 404, { erro: 'Afiliado não encontrado.' });
        u.afiliadoStatus = status;
        aquisicao.garantirCodigo(u);
        return sendJson(res, 200, { ok: true, afiliadoStatus: u.afiliadoStatus });
      });
    }

    const pagarComissaoMatch = pathname.match(/^\/api\/admin\/afiliados\/(\d+)\/pagar$/);
    if (pagarComissaoMatch && method === 'POST') {
      const body = await readBody(req);
      return transact((db) => {
        const u = db.users.find((x) => x.id === Number(pagarComissaoMatch[1]));
        if (!u) return sendJson(res, 404, { erro: 'Afiliado não encontrado.' });
        const valor = body && body.valorCentavos != null ? Math.round(Number(body.valorCentavos)) : (u.saldoComissaoCentavos || 0);
        if (valor <= 0) return sendJson(res, 400, { erro: 'Nada a pagar.' });
        if (valor > (u.saldoComissaoCentavos || 0)) return sendJson(res, 400, { erro: 'Valor maior que o saldo.' });
        u.saldoComissaoCentavos = (u.saldoComissaoCentavos || 0) - valor;
        if (!db.pagamentosComissao) db.pagamentosComissao = [];
        db.pagamentosComissao.push({
          id: nextId(db, 'pagamentosComissao'),
          userId: u.id,
          valorCentavos: valor,
          em: new Date().toISOString(),
          nota: body && body.nota || null
        });
        return sendJson(res, 200, { ok: true, saldoComissaoCentavos: u.saldoComissaoCentavos });
      });
    }

    if (pathname === '/api/admin/marketing' && method === 'GET') {
      const db = load();
      const q = new URL(req.url, 'http://localhost').searchParams;
      const dias = Number(q.get('dias') || 30);
      return sendJson(res, 200, {
        hoje: aquisicao.metricasMarketing(db, 1),
        d7: aquisicao.metricasMarketing(db, 7),
        d30: aquisicao.metricasMarketing(db, 30),
        d90: aquisicao.metricasMarketing(db, 90),
        atual: aquisicao.metricasMarketing(db, dias > 0 ? dias : 30)
      });
    }

    if (pathname === '/api/admin/campanhas' && method === 'GET') {
      const db = load();
      return sendJson(res, 200, { campanhas: db.campanhas || [] });
    }
    if (pathname === '/api/admin/campanhas' && method === 'POST') {
      const body = await readBody(req);
      const nome = String(body.nome || '').trim();
      if (!nome) return sendJson(res, 400, { erro: 'Informe o nome da campanha.' });
      return transact((db) => {
        if (!db.campanhas) db.campanhas = [];
        const campanha = {
          id: nextId(db, 'campanhas'),
          nome,
          utmSource: String(body.utmSource || '').trim().toLowerCase().slice(0, 40),
          utmCampaign: String(body.utmCampaign || '').trim().slice(0, 60),
          gastoCentavos: Math.max(0, Math.round(Number(body.gastoCentavos) || 0)),
          ativo: body.ativo !== false,
          criadoEm: new Date().toISOString()
        };
        db.campanhas.push(campanha);
        return sendJson(res, 201, { campanha, link: '/?utm_source=' + encodeURIComponent(campanha.utmSource) + (campanha.utmCampaign ? '&utm_campaign=' + encodeURIComponent(campanha.utmCampaign) : '') });
      });
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

    // Retira (debita) saldo manualmente de um usuario, sem deixar negativo
    const retirarMatch = pathname.match(/^\/api\/admin\/usuarios\/(\d+)\/retirar$/);
    if (retirarMatch && method === 'POST') {
      const { valorReais } = await readBody(req);
      if (!valorReais || valorReais <= 0) return sendJson(res, 400, { erro: 'Informe um valor válido.' });
      return transact((db) => {
        const u = db.users.find((x) => x.id === Number(retirarMatch[1]));
        if (!u) return sendJson(res, 404, { erro: 'Usuário não encontrado.' });
        u.saldoCentavos = Math.max(0, u.saldoCentavos - Math.round(valorReais * 100));
        return sendJson(res, 200, { usuario: publicUser(u) });
      });
    }

    // Exclui um usuario
    const excluirUsuarioMatch = pathname.match(/^\/api\/admin\/usuarios\/(\d+)$/);
    if (excluirUsuarioMatch && method === 'DELETE') {
      return transact((db) => {
        const idx = db.users.findIndex((x) => x.id === Number(excluirUsuarioMatch[1]));
        if (idx === -1) return sendJson(res, 404, { erro: 'Usuário não encontrado.' });
        db.users.splice(idx, 1);
        return sendJson(res, 200, { ok: true });
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

setInterval(async function verificarSms5sim() {
  try {
    const db = load();
    const pendentes = db.orders.filter(function(o) { return o.status === 'aguardando' && o.sim5PedidoId; });
    for (const order of pendentes) {
      try {
        const resultado = await sim5.consultarPedido(order.sim5PedidoId);
        if (resultado.sms && resultado.sms.length > 0) {
          const ultimoSms = resultado.sms[resultado.sms.length - 1];
          transact(function(db2) {
            const o2 = db2.orders.find(function(x) { return x.id === order.id; });
            if (o2 && o2.status === 'aguardando') {
              const texto = ultimoSms.text || ultimoSms.code || '';
              o2.status = 'recebido';
              o2.codigo = ultimoSms.code || extrairCodigo(texto) || null;
              o2.mensagemRecebida = texto || (o2.codigo ? ('Código: ' + o2.codigo) : 'SMS recebido');
              registrarEvento(db2, 'sms_received', { userId: o2.userId, servicoId: o2.servicoId });
            }
          });
        }
      } catch (e) {}
    }
  } catch (e) { console.error('Erro no poller 5sim:', e.message); }
}, 15000);

setInterval(async function verificarSmsSmsman() {
  try {
    const db = load();
    const pendentes = db.orders.filter(function(o) { return o.status === 'aguardando' && o.smsmanPedidoId; });
    for (const order of pendentes) {
      try {
        const resultado = await smsman.consultarSms(order.smsmanPedidoId);
        if (!resultado.aguardando && resultado.codigo) {
          transact(function(db2) {
            const o2 = db2.orders.find(function(x) { return x.id === order.id; });
            if (o2 && o2.status === 'aguardando') {
              o2.status = 'recebido';
              o2.mensagemRecebida = resultado.codigo;
              o2.codigo = resultado.codigo;
            }
          });
        }
      } catch (e) {}
    }
  } catch (e) { console.error('Erro no poller SMS-Man:', e.message); }
}, 15000);

function ensureAdmin() {
  transact((db) => {
    if (db.users.some((u) => u.isAdmin)) return;
    db.users.push({
      id: nextId(db, 'users'),
      nome: 'Admin',
      email: 'admin@seusite.com.br',
      senhaHash: hashPassword('admin123'),
      saldoCentavos: 0,
      isAdmin: true,
      criadoEm: new Date().toISOString()
    });
  });
}

server.listen(PORT, () => {
  try { ensureAdmin(); } catch (e) { console.error('Falha ao criar admin:', e); }
  console.log(`\n✅  Servidor rodando em http://localhost:${PORT}`);
  console.log(`   Admin padrão: admin@seusite.com.br / admin123 (troque a senha!)\n`);
});
