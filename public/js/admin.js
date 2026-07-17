let slotParaSimular = null;
let usuarioParaCreditar = null;

async function verificarAdmin() {
  const res = await fetch('/api/auth/eu');
  const data = await res.json();
  if (!data.usuario || !data.usuario.isAdmin) { window.location.href = '/login.html'; return null; }
  return data.usuario;
}

function centavosParaReais(c) { return (c / 100).toFixed(2).replace('.', ','); }

// ----- Navegação entre painéis -----
const titulos = { slots: 'Números (slots)', servicos: 'Serviços e preços', pedidos: 'Pedidos', usuarios: 'Usuários', financeiro: 'Gestão Financeira' };
document.querySelectorAll('.side-link[data-tab]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.side-link[data-tab]').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const alvo = link.dataset.tab;
    document.getElementById('page-title').textContent = titulos[alvo];
    ['slots', 'servicos', 'pedidos', 'usuarios', 'financeiro'].forEach(t => {
      document.getElementById('painel-' + t).style.display = t === alvo ? 'block' : 'none';
    });
    if (alvo === 'slots') carregarSlots();
    if (alvo === 'servicos') carregarServicos();
    if (alvo === 'pedidos') carregarPedidosAdmin();
    if (alvo === 'usuarios') carregarUsuarios();
    if (alvo === 'financeiro') { carregarFinanceiro(); carregarConfiguracoes(); carregarSaldo5sim(); }
  });
});

// ----- Slots -----
const NOME_PAIS = { BR: 'Brasil', US: 'Estados Unidos', PT: 'Portugal', MX: 'México', AR: 'Argentina' };
function extrairDDD(numero) {
  const m = (numero || '').match(/^\+55\s*(\d{2})/);
  return m ? m[1] : null;
}

async function carregarSlots() {
  const res = await fetch('/api/admin/slots');
  const data = await res.json();

  // Agrupa: país -> ddd ("sem-ddd" quando não dá pra identificar) -> lista de slots
  const porPais = {};
  data.slots.forEach(s => {
    const pais = s.pais || 'BR';
    const ddd = pais === 'BR' ? (extrairDDD(s.numero) || 'sem-ddd') : 'sem-ddd';
    porPais[pais] = porPais[pais] || {};
    porPais[pais][ddd] = porPais[pais][ddd] || [];
    porPais[pais][ddd].push(s);
  });

  const paisesOrdenados = Object.keys(porPais).sort((a, b) => (a === 'BR' ? -1 : b === 'BR' ? 1 : a.localeCompare(b)));

  document.getElementById('slots-agrupados').innerHTML = paisesOrdenados.map(pais => {
    const grupos = porPais[pais];
    const dddsOrdenados = Object.keys(grupos).sort((a, b) => a === 'sem-ddd' ? 1 : b === 'sem-ddd' ? -1 : a.localeCompare(b));
    const totalPais = Object.values(grupos).reduce((acc, arr) => acc + arr.length, 0);

    return `
    <div class="panel-box" style="margin-bottom:16px;">
      <div class="col-banner" style="display:flex; align-items:center; gap:10px;">
        <span class="fi fi-${pais.toLowerCase()}" style="width:22px; height:16px; border-radius:2px; flex-shrink:0;"></span>
        ${NOME_PAIS[pais] || pais} <span style="font-weight:400; opacity:.8; font-size:12.5px; margin-left:auto;">${totalPais} número${totalPais !== 1 ? 's' : ''}</span>
      </div>
      <div style="padding:12px;">
        ${dddsOrdenados.map(ddd => `
          <div style="margin-bottom:14px;">
            <div style="font-size:12.5px; font-weight:600; color:var(--text-dim); margin-bottom:8px; padding-left:2px;">
              ${ddd === 'sem-ddd' ? 'Sem DDD identificado' : 'DDD ' + ddd} — ${grupos[ddd].length} número${grupos[ddd].length !== 1 ? 's' : ''}
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Número</th><th>Operadora</th><th>Status</th><th>Pedido atual</th><th></th></tr></thead>
                <tbody>
                  ${grupos[ddd].map(s => `
                    <tr>
                      <td style="font-family:var(--mono)">${s.numero}</td>
                      <td>${s.operadora || '—'}</td>
                      <td>
                        <select onchange="mudarStatusSlot(${s.id}, this.value)" style="background:var(--surface-2); color:var(--text); border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-family:var(--mono); font-size:12px;">
                          <option value="livre" ${s.status === 'livre' ? 'selected' : ''}>livre</option>
                          <option value="ocupado" ${s.status === 'ocupado' ? 'selected' : ''}>ocupado</option>
                          <option value="manutencao" ${s.status === 'manutencao' ? 'selected' : ''}>manutenção</option>
                        </select>
                      </td>
                      <td>${s.pedidoAtualId ? '#' + s.pedidoAtualId : '—'}</td>
                      <td>
                        ${s.pedidoAtualId ? `<button class="btn btn-ghost btn-sm" onclick="abrirSimularSms(${s.id})">Registrar SMS</button>` : ''}
                        <button class="btn btn-danger btn-sm" onclick="excluirSlot(${s.id})">Excluir</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  }).join('');
}

async function mudarStatusSlot(id, status) {
  await fetch(`/api/admin/slots/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
  });
  carregarSlots();
}

async function excluirSlot(id) {
  if (!confirm('Excluir este número?')) return;
  await fetch(`/api/admin/slots/${id}`, { method: 'DELETE' });
  carregarSlots();
}

document.getElementById('btn-novo-slot').addEventListener('click', () => {
  document.getElementById('slot-numero').value = '';
  document.getElementById('slot-operadora').value = '';
  document.getElementById('slot-pais').value = 'BR';
  document.getElementById('modal-slot').classList.add('show');
});
document.getElementById('salvar-slot').addEventListener('click', async () => {
  const numero = document.getElementById('slot-numero').value.trim();
  const operadora = document.getElementById('slot-operadora').value.trim();
  const pais = document.getElementById('slot-pais').value;
  if (!numero) return alert('Informe o número.');
  await fetch('/api/admin/slots', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero, operadora, pais })
  });
  document.getElementById('modal-slot').classList.remove('show');
  carregarSlots();
});

function abrirSimularSms(slotId) {
  slotParaSimular = slotId;
  document.getElementById('sms-mensagem').value = '';
  document.getElementById('modal-sms').classList.add('show');
}
document.getElementById('enviar-sms-simulado').addEventListener('click', async () => {
  const mensagem = document.getElementById('sms-mensagem').value.trim();
  if (!mensagem) return alert('Digite a mensagem.');
  const res = await fetch('/api/admin/simular-sms', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: slotParaSimular, mensagem })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.erro);
  document.getElementById('modal-sms').classList.remove('show');
  carregarSlots();
});

// ----- Serviços -----
const ICONE_SERVICO = {
  whatsapp: { icone: 'ti-brand-whatsapp', bg: '#25D366', sombra: '#25D366' },
  telegram: { icone: 'ti-brand-telegram', bg: '#229ED9', sombra: '#229ED9' },
  instagram: { icone: 'ti-brand-instagram', bg: 'linear-gradient(135deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)', sombra: '#D62976' },
  facebook: { icone: 'ti-brand-facebook', bg: '#1877F2', sombra: '#1877F2' },
  google: { icone: 'ti-brand-google', bg: '#4285F4', sombra: '#4285F4' },
  tiktok: { icone: 'ti-brand-tiktok', bg: '#000000', sombra: '#000000' },
  discord: { icone: 'ti-brand-discord', bg: '#5865F2', sombra: '#5865F2' },
  kwai: { icone: 'ti-video', bg: '#FF7A00', sombra: '#FF7A00' },
  ifood: { icone: 'ti-truck-delivery', bg: '#EA1D2C', sombra: '#EA1D2C' },
  '99': { icone: 'ti-car', bg: '#000000', sombra: '#000000' },
  rappi: { icone: 'ti-shopping-bag', bg: '#FF441F', sombra: '#FF441F' },
  uber: { icone: 'ti-car', bg: '#000000', sombra: '#000000' },
  'mercado livre': { icone: 'ti-shopping-bag', bg: '#FFE600', sombra: '#FFE600', txt: '#1F1F1F' },
  mercadolivre: { icone: 'ti-shopping-bag', bg: '#FFE600', sombra: '#FFE600', txt: '#1F1F1F' },
  shopee: { icone: 'ti-brand-shopee', bg: '#EE4D2D', sombra: '#EE4D2D' },
  olx: { icone: 'ti-building-store', bg: '#6A2E8C', sombra: '#6A2E8C' },
  steam: { icone: 'ti-brand-steam', bg: '#171A21', sombra: '#171A21' },
  'epic games': { icone: 'ti-device-gamepad-2', bg: '#2F2D2E', sombra: '#2F2D2E' },
  playstation: { icone: 'ti-brand-playstation', bg: '#003791', sombra: '#003791' },
  xbox: { icone: 'ti-brand-xbox', bg: '#107C10', sombra: '#107C10' },
  'free fire': { icone: 'ti-device-gamepad-2', bg: '#F7971D', sombra: '#F7971D' },
  garena: { icone: 'ti-device-gamepad-2', bg: '#F7971D', sombra: '#F7971D' },
  valorant: { icone: 'ti-device-gamepad-2', bg: '#EB0029', sombra: '#EB0029' },
  tinder: { icone: 'ti-brand-tinder', bg: '#FD5068', sombra: '#FD5068' },
  badoo: { icone: 'ti-heart', bg: '#783BF9', sombra: '#783BF9' },
  bumble: { icone: 'ti-heart', bg: '#FFC629', sombra: '#FFC629', txt: '#1F1F1F' },
  netflix: { icone: 'ti-brand-netflix', bg: '#E50914', sombra: '#E50914' },
  spotify: { icone: 'ti-brand-spotify', bg: '#1DB954', sombra: '#1DB954' },
  twitch: { icone: 'ti-brand-twitch', bg: '#9146FF', sombra: '#9146FF' },
  twitter: { icone: 'ti-brand-x', bg: '#000000', sombra: '#000000' },
  x: { icone: 'ti-brand-x', bg: '#000000', sombra: '#000000' },
  snapchat: { icone: 'ti-brand-snapchat', bg: '#FFFC00', sombra: '#FFFC00', txt: '#1F1F1F' },
  pinterest: { icone: 'ti-brand-pinterest', bg: '#E60023', sombra: '#E60023' },
  linkedin: { icone: 'ti-brand-linkedin', bg: '#0A66C2', sombra: '#0A66C2' },
  amazon: { icone: 'ti-brand-amazon', bg: '#FF9900', sombra: '#FF9900' },
  aliexpress: { icone: 'ti-package', bg: '#FF4747', sombra: '#FF4747' },
  shein: { icone: 'ti-hanger', bg: '#000000', sombra: '#000000' },
  indrive: { icone: 'ti-car', bg: '#93D500', sombra: '#93D500', txt: '#1F1F1F' },
  cabify: { icone: 'ti-car', bg: '#6E2B8B', sombra: '#6E2B8B' },
  buser: { icone: 'ti-bus', bg: '#6C2EB5', sombra: '#6C2EB5' },
  correios: { icone: 'ti-package', bg: '#0033A0', sombra: '#0033A0' },
  binance: { icone: 'ti-currency-bitcoin', bg: '#F0B90B', sombra: '#F0B90B', txt: '#1F1F1F' },
  'mercado bitcoin': { icone: 'ti-coin', bg: '#00B389', sombra: '#00B389' }
};
function iconeDoServico(nome) {
  const chave = (nome || '').trim().toLowerCase();
  if (ICONE_SERVICO[chave]) return ICONE_SERVICO[chave];
  if (chave.includes('whatsapp')) return ICONE_SERVICO.whatsapp;
  if (chave.includes('telegram')) return ICONE_SERVICO.telegram;
  if (chave.includes('instagram')) return ICONE_SERVICO.instagram;
  return { icone: 'ti-device-mobile', bg: 'var(--primary)', sombra: '#2454FF', txt: '#fff' };
}

let servicoEditando = null;

async function carregarServicos() {
  const res = await fetch('/api/catalogo');
  const data = await res.json();
  document.getElementById('servicos-body').innerHTML = data.servicos.map(s => {
    const { icone, bg, sombra, txt } = iconeDoServico(s.nome);
    return `
    <tr>
      <td style="display:flex; align-items:center; gap:10px;">
        <span style="width:32px; height:32px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; background:${bg}; box-shadow:0 4px 10px -4px ${sombra}99; color:${txt || '#fff'}; font-size:18px;"><i class="ti ${icone}" aria-hidden="true"></i></span>
        ${s.nome}
      </td>
      <td style="font-family:var(--mono)">R$ ${centavosParaReais(s.precoCentavos)}</td>
      <td><span class="tag ${s.ativo ? 'livre' : 'expirado'}">${s.ativo ? 'ativo' : 'inativo'}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick='abrirEditarServico(${JSON.stringify(s)})'>Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="alternarServico(${s.id}, ${!s.ativo})">${s.ativo ? 'Desativar' : 'Ativar'}</button>
      </td>
    </tr>
  `;
  }).join('');
}
async function alternarServico(id, ativo) {
  await fetch(`/api/admin/servicos/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo })
  });
  carregarServicos();
}
function abrirEditarServico(servico) {
  servicoEditando = servico.id;
  document.getElementById('modal-servico-titulo').textContent = 'Editar serviço';
  document.getElementById('servico-nome').value = servico.nome;
  document.getElementById('servico-preco').value = (servico.precoCentavos / 100).toFixed(2);
  document.getElementById('modal-servico').classList.add('show');
}
document.getElementById('btn-novo-servico').addEventListener('click', () => {
  servicoEditando = null;
  document.getElementById('modal-servico-titulo').textContent = 'Novo serviço';
  document.getElementById('servico-nome').value = '';
  document.getElementById('servico-preco').value = '';
  document.getElementById('modal-servico').classList.add('show');
});
document.getElementById('salvar-servico').addEventListener('click', async () => {
  const nome = document.getElementById('servico-nome').value.trim();
  const preco = Number(document.getElementById('servico-preco').value);
  if (!nome || !preco) return alert('Preencha nome e preço.');
  if (servicoEditando) {
    await fetch(`/api/admin/servicos/${servicoEditando}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, precoCentavos: Math.round(preco * 100) })
    });
  } else {
    await fetch('/api/admin/servicos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, precoCentavos: Math.round(preco * 100) })
    });
  }
  document.getElementById('modal-servico').classList.remove('show');
  carregarServicos();
});

// ----- Pedidos -----
async function carregarPedidosAdmin() {
  const res = await fetch('/api/admin/pedidos');
  const data = await res.json();
  document.getElementById('admin-pedidos-body').innerHTML = data.pedidos.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>${p.usuarioNome || ('usuário ' + p.userId)}<br><small style="color:var(--muted)">${p.usuarioEmail || ''}</small></td>
      <td>${p.servicoNome}</td>
      <td style="font-family:var(--mono)">${p.numero}</td>
      <td><span class="tag ${p.status}">${p.status}</span></td>
      <td style="font-family:var(--mono)">${p.codigo || '—'}</td>
      <td style="font-family:var(--mono)">R$ ${centavosParaReais(p.precoPagoCentavos || 0)}</td>
      <td>${new Date(p.criadoEm).toLocaleString('pt-BR')}</td>
    </tr>
  `).join('');
}

// ----- Saldo 5SIM -----
async function carregarSaldo5sim() {
  const el = document.getElementById('saldo-5sim-valor');
  if (!el) return;
  try {
    const res = await fetch('/api/admin/saldo-5sim');
    const data = await res.json();
    if (!res.ok) { el.textContent = 'Indisponível'; return; }
    el.textContent = 'R$ ' + centavosParaReais(data.saldoCentavos) + ' (US$ ' + Number(data.saldoDolar).toFixed(2) + ')';
  } catch (e) {
    el.textContent = 'Indisponível';
  }
}

// ----- Usuários -----
let usuarioParaRedefinir = null;
let usuarioParaRetirar = null;
async function carregarUsuarios() {
  const res = await fetch('/api/admin/usuarios');
  const data = await res.json();
  document.getElementById('usuarios-body').innerHTML = data.usuarios.map(u => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td style="font-family:var(--mono)">R$ ${centavosParaReais(u.saldoCentavos)}</td>
      <td>${u.criadoEm ? new Date(u.criadoEm).toLocaleString('pt-BR') : '—'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="abrirCreditar(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">Creditar saldo</button>
        <button class="btn btn-ghost btn-sm" onclick="abrirRetirar(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">Retirar saldo</button>
        <button class="btn btn-ghost btn-sm" onclick="abrirRedefinirSenha(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">Redefinir senha</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="excluirUsuario(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function abrirCreditar(userId, nome) {
  usuarioParaCreditar = userId;
  document.getElementById('creditar-usuario-nome').textContent = `Cliente: ${nome}`;
  document.getElementById('creditar-valor').value = '';
  document.getElementById('modal-creditar').classList.add('show');
}
document.getElementById('confirmar-creditar').addEventListener('click', async () => {
  const valorReais = Number(document.getElementById('creditar-valor').value);
  if (!valorReais || valorReais <= 0) return alert('Informe um valor válido.');
  const res = await fetch(`/api/admin/usuarios/${usuarioParaCreditar}/creditar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valorReais })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.erro);
  document.getElementById('modal-creditar').classList.remove('show');
  carregarUsuarios();
});

function abrirRetirar(userId, nome) {
  usuarioParaRetirar = userId;
  document.getElementById('retirar-usuario-nome').textContent = `Cliente: ${nome}`;
  document.getElementById('retirar-valor').value = '';
  document.getElementById('modal-retirar').classList.add('show');
}
document.getElementById('confirmar-retirar').addEventListener('click', async () => {
  const valorReais = Number(document.getElementById('retirar-valor').value);
  if (!valorReais || valorReais <= 0) return alert('Informe um valor válido.');
  const res = await fetch(`/api/admin/usuarios/${usuarioParaRetirar}/retirar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valorReais })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.erro);
  document.getElementById('modal-retirar').classList.remove('show');
  carregarUsuarios();
});

async function excluirUsuario(userId, nome) {
  if (!confirm(`Tem certeza que deseja excluir o usuário ${nome}? Essa ação não pode ser desfeita.`)) return;
  const res = await fetch(`/api/admin/usuarios/${userId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) return alert(data.erro);
  carregarUsuarios();
}

function abrirRedefinirSenha(userId, nome) {
  usuarioParaRedefinir = userId;
  document.getElementById('redefinir-usuario-nome').textContent = `Cliente: ${nome}`;
  document.getElementById('redefinir-senha-valor').value = '';
  document.getElementById('modal-redefinir-senha').classList.add('show');
}
document.getElementById('confirmar-redefinir-senha').addEventListener('click', async () => {
  const senha = document.getElementById('redefinir-senha-valor').value;
  if (!senha || senha.length < 6) return alert('A senha precisa ter no mínimo 6 caracteres.');
  const res = await fetch(`/api/admin/usuarios/${usuarioParaRedefinir}/redefinir-senha`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.erro);
  document.getElementById('modal-redefinir-senha').classList.remove('show');
  alert('Senha redefinida! Agora é só avisar o cliente pela senha nova, por fora do site.');
});

document.getElementById('btn-importar-servicos').addEventListener('click', () => {
  document.getElementById('importar-texto').value = '';
  document.getElementById('importar-msg').className = 'form-msg';
  document.getElementById('importar-msg').textContent = '';
  document.getElementById('modal-importar').classList.add('show');
});
document.getElementById('confirmar-importar').addEventListener('click', async () => {
  const texto = document.getElementById('importar-texto').value.trim();
  const msg = document.getElementById('importar-msg');
  if (!texto) return alert('Cole a lista de serviços primeiro.');

  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  let sucesso = 0;
  let falhas = [];

  for (const linha of linhas) {
    const partes = linha.split(',');
    if (partes.length < 2) { falhas.push(linha); continue; }
    const nome = partes[0].trim();
    const preco = Number(partes[1].trim().replace(',', '.'));
    if (!nome || !preco) { falhas.push(linha); continue; }
    try {
      const res = await fetch('/api/admin/servicos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, precoCentavos: Math.round(preco * 100) })
      });
      if (res.ok) sucesso++; else falhas.push(linha);
    } catch (e) {
      falhas.push(linha);
    }
  }

  msg.className = falhas.length ? 'form-msg erro' : 'form-msg ok';
  msg.textContent = falhas.length
    ? `${sucesso} importado(s). Não deu pra importar: ${falhas.join(' | ')}`
    : `${sucesso} serviço(s) importado(s) com sucesso!`;
  carregarServicos();
});

document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => document.getElementById(el.dataset.close).classList.remove('show'));
});
document.getElementById('btn-sair').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

(async function init() {
  const user = await verificarAdmin();
  if (!user) return;
  carregarSlots();
})();

let alarmeContinuoAtivo = null;
function tocarUmaSequencia() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notas = [{tempo:0,freq:1046},{tempo:0.15,freq:1318},{tempo:0.3,freq:1046},{tempo:0.45,freq:1318}];
    notas.forEach(function(n) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(1, ctx.currentTime + n.tempo);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.tempo + 0.14);
      osc.start(ctx.currentTime + n.tempo);
      osc.stop(ctx.currentTime + n.tempo + 0.14);
    });
  } catch (e) {}
}
function pararAlarmeContinuo() {
  if (alarmeContinuoAtivo) { clearInterval(alarmeContinuoAtivo); alarmeContinuoAtivo = null; }
  document.removeEventListener('click', pararAlarmeContinuo);
}
function tocarSomAlerta() {
  tocarUmaSequencia();
  if (alarmeContinuoAtivo) return;
  alarmeContinuoAtivo = setInterval(tocarUmaSequencia, 2000);
  document.addEventListener('click', pararAlarmeContinuo);
}
let ultimoPedidoIdConhecido = null;
let statusPedidosConhecidos = {};
const tituloOriginalPagina = document.title;
let piscaTituloInterval = null;
function piscarTitulo() {
  if (piscaTituloInterval) return;
  let visivel = true;
  piscaTituloInterval = setInterval(function() {
    document.title = visivel ? String.fromCodePoint(128276) + ' Novo pedido!' : tituloOriginalPagina;
    visivel = !visivel;
  }, 1000);
}
function pararPiscarTitulo() {
  if (piscaTituloInterval) { clearInterval(piscaTituloInterval); piscaTituloInterval = null; document.title = tituloOriginalPagina; }
  pararAlarmeContinuo();
}
window.addEventListener('focus', pararPiscarTitulo);
async function verificarNovosPedidos() {
  try {
    const res = await fetch('/api/admin/pedidos');
    const data = await res.json();
    if (!data.pedidos || data.pedidos.length === 0) return;
    const maiorId = Math.max.apply(null, data.pedidos.map(function(p) { return p.id; }));
    const primeiraChecagem = ultimoPedidoIdConhecido === null;
    if (primeiraChecagem) { ultimoPedidoIdConhecido = maiorId; }
    else if (maiorId > ultimoPedidoIdConhecido) { ultimoPedidoIdConhecido = maiorId; tocarSomAlerta(); piscarTitulo(); }
    data.pedidos.forEach(function(p) {
      const statusAnterior = statusPedidosConhecidos[p.id];
      if (!primeiraChecagem && statusAnterior && statusAnterior !== 'recebido' && p.status === 'recebido') {
        tocarSomAlerta();
        piscarTitulo();
      }
      statusPedidosConhecidos[p.id] = p.status;
    });
  } catch (e) {}
}
setInterval(verificarNovosPedidos, 5000);
verificarNovosPedidos();

async function carregarFinanceiro() {
  const res = await fetch("/api/admin/financeiro");
  const data = await res.json();
  const body = document.getElementById("financeiro-body");
  body.innerHTML = data.pedidos.map(function(p) {
    return "<tr><td>#" + p.id + "</td><td>" + p.servicoNome + "</td><td>" + p.numero + "</td><td>$" + p.custoDolar.toFixed(4) + "</td><td>R$ " + (p.custoReaisCentavos/100).toFixed(2) + "</td><td>R$ " + (p.vendaCentavos/100).toFixed(2) + "</td><td>R$ " + (p.lucroCentavos/100).toFixed(2) + "</td></tr>";
  }).join("");
  document.getElementById("financeiro-total").textContent = "R$ " + (data.totalLucroCentavos/100).toFixed(2);
}

async function carregarConfiguracoes() {
  const res = await fetch("/api/admin/configuracoes");
  const data = await res.json();
  document.getElementById("config-multiplicador").value = data.configuracoes.multiplicador5sim;
  document.getElementById("config-margem").value = (data.configuracoes.margemFixaCentavos/100).toFixed(2);
}
document.getElementById("btn-salvar-config").addEventListener("click", async function() {
  const multiplicador5sim = document.getElementById("config-multiplicador").value;
  const margemFixaCentavos = Math.round(Number(document.getElementById("config-margem").value) * 100);
  await fetch("/api/admin/configuracoes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ multiplicador5sim: multiplicador5sim, margemFixaCentavos: margemFixaCentavos }) });
  alert("Configuracoes salvas!");
});
