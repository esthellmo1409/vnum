let pedidoAtual = null;
let pollTimer = null;
let contadorTimer = null;
let somCodigoJaTocou = false;
const PEDIDO_TOTAL_MS = 15 * 60 * 1000;
const PEDIDO_CANCEL_MIN_MS = 2 * 60 * 1000;

function iniciarContador(pedido) {
  clearInterval(contadorTimer);
  const inicio = new Date(pedido.criadoEm).getTime();

  function tick() {
    const decorrido = Date.now() - inicio;
    const restante = Math.max(0, PEDIDO_TOTAL_MS - decorrido);
    const pct = Math.max(0, Math.min(100, (restante / PEDIDO_TOTAL_MS) * 100));

    const bar = document.getElementById('pedido-progress-bar');
    bar.style.width = pct + '%';
    bar.classList.remove('alerta', 'critico');
    if (pct <= 15) bar.classList.add('critico');
    else if (pct <= 40) bar.classList.add('alerta');

    const min = Math.floor(restante / 60000);
    const seg = Math.floor((restante % 60000) / 1000);
    document.getElementById('pedido-tempo-restante').textContent = `${min}:${String(seg).padStart(2, '0')}`;

    const btn = document.getElementById('btn-cancelar-pedido');
    if (decorrido >= PEDIDO_CANCEL_MIN_MS) {
      btn.disabled = false;
      btn.textContent = 'Cancelar pedido';
    } else {
      const faltam = PEDIDO_CANCEL_MIN_MS - decorrido;
      const cmin = Math.floor(faltam / 60000);
      const cseg = Math.floor((faltam % 60000) / 1000);
      btn.disabled = true;
      btn.textContent = `Aguarde ${cmin}:${String(cseg).padStart(2, '0')} para cancelar`;
    }

    if (restante <= 0) clearInterval(contadorTimer);
  }
  tick();
  contadorTimer = setInterval(tick, 1000);
}

function centavosParaReais(c) { return (c / 100).toFixed(2).replace('.', ','); }
function atualizarSaldoUI(saldoCentavos) {
  const texto = 'R$ ' + centavosParaReais(saldoCentavos);
  document.getElementById('saldo').textContent = texto;
  document.getElementById('user-menu-saldo').textContent = texto;
  const kpi = document.getElementById('kpi-saldo');
  if (kpi) kpi.textContent = texto;
}

async function verificarSessao() {
  const res = await fetch('/api/auth/eu');
  const data = await res.json();
  if (!data.usuario) { window.location.href = '/login.html'; return null; }
  document.getElementById('nome-usuario').textContent = data.usuario.nome.split(' ')[0];
  document.getElementById('user-menu-nome').textContent = data.usuario.nome.split(' ')[0];
  document.getElementById('user-menu-email').textContent = data.usuario.email;
  atualizarSaldoUI(data.usuario.saldoCentavos);
  return data.usuario;
}

document.getElementById('user-menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('user-menu-panel').classList.toggle('show');
});
document.addEventListener('click', () => {
  document.getElementById('user-menu-panel').classList.remove('show');
});
document.getElementById('menu-sair').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

let precoPorServicoId = {};
let paisSelecionado = 'BR';
let paisEscolhidoPeloUsuario = false;

// Gera o emoji da bandeira a partir do código ISO de 2 letras (ex: "BR" -> 🇧🇷)
function bandeiraEmoji(iso2) {
  return iso2.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

// Lista de países (código ISO + nome em pt-BR). Só o Brasil tem chip disponível
// por enquanto; os outros aparecem como "em breve".
const CODIGOS_PAISES = [
  ['BR', 'Brasil'], ['AF', 'Afeganistão'], ['ZA', 'África do Sul'], ['AL', 'Albânia'],
  ['DE', 'Alemanha'], ['AD', 'Andorra'], ['AO', 'Angola'], ['AI', 'Anguilla'],
  ['AG', 'Antígua e Barbuda'], ['SA', 'Arábia Saudita'], ['DZ', 'Argélia'], ['AR', 'Argentina'],
  ['AM', 'Armênia'], ['AW', 'Aruba'], ['AU', 'Austrália'], ['AT', 'Áustria'],
  ['AZ', 'Azerbaijão'], ['BS', 'Bahamas'], ['BH', 'Bahrein'], ['BD', 'Bangladesh'],
  ['BB', 'Barbados'], ['BE', 'Bélgica'], ['BZ', 'Belize'], ['BJ', 'Benin'],
  ['BY', 'Bielorrússia'], ['BO', 'Bolívia'], ['BA', 'Bósnia e Herzegovina'], ['BW', 'Botsuana'],
  ['BN', 'Brunei'], ['BG', 'Bulgária'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'],
  ['BT', 'Butão'], ['CV', 'Cabo Verde'], ['KH', 'Camboja'], ['CM', 'Camarões'],
  ['CA', 'Canadá'], ['QA', 'Catar'], ['KZ', 'Cazaquistão'], ['TD', 'Chade'],
  ['CL', 'Chile'], ['CN', 'China'], ['CY', 'Chipre'], ['CO', 'Colômbia'],
  ['KM', 'Comores'], ['CG', 'Congo'], ['KP', 'Coreia do Norte'], ['KR', 'Coreia do Sul'],
  ['CI', 'Costa do Marfim'], ['CR', 'Costa Rica'], ['HR', 'Croácia'], ['CU', 'Cuba'],
  ['DK', 'Dinamarca'], ['DJ', 'Djibuti'], ['DM', 'Dominica'], ['EG', 'Egito'],
  ['SV', 'El Salvador'], ['AE', 'Emirados Árabes Unidos'], ['EC', 'Equador'], ['ER', 'Eritreia'],
  ['SK', 'Eslováquia'], ['SI', 'Eslovênia'], ['ES', 'Espanha'], ['US', 'Estados Unidos'],
  ['EE', 'Estônia'], ['ET', 'Etiópia'], ['FJ', 'Fiji'], ['PH', 'Filipinas'],
  ['FI', 'Finlândia'], ['FR', 'França'], ['GA', 'Gabão'], ['GM', 'Gâmbia'],
  ['GH', 'Gana'], ['GE', 'Geórgia'], ['GR', 'Grécia'], ['GD', 'Granada'],
  ['GT', 'Guatemala'], ['GY', 'Guiana'], ['GN', 'Guiné'], ['GW', 'Guiné-Bissau'],
  ['GQ', 'Guiné Equatorial'], ['HT', 'Haiti'], ['NL', 'Holanda'], ['HN', 'Honduras'],
  ['HU', 'Hungria'], ['YE', 'Iêmen'], ['MH', 'Ilhas Marshall'], ['SB', 'Ilhas Salomão'],
  ['IN', 'Índia'], ['ID', 'Indonésia'], ['IR', 'Irã'], ['IQ', 'Iraque'],
  ['IE', 'Irlanda'], ['IS', 'Islândia'], ['IL', 'Israel'], ['IT', 'Itália'],
  ['JM', 'Jamaica'], ['JP', 'Japão'], ['JO', 'Jordânia'], ['KW', 'Kuwait'],
  ['LA', 'Laos'], ['LS', 'Lesoto'], ['LV', 'Letônia'], ['LB', 'Líbano'],
  ['LR', 'Libéria'], ['LY', 'Líbia'], ['LI', 'Liechtenstein'], ['LT', 'Lituânia'],
  ['LU', 'Luxemburgo'], ['MO', 'Macau'], ['MK', 'Macedônia do Norte'], ['MG', 'Madagascar'],
  ['MY', 'Malásia'], ['MW', 'Malaui'], ['MV', 'Maldivas'], ['ML', 'Mali'],
  ['MT', 'Malta'], ['MA', 'Marrocos'], ['MU', 'Maurício'], ['MR', 'Mauritânia'],
  ['MX', 'México'], ['MM', 'Mianmar'], ['FM', 'Micronésia'], ['MZ', 'Moçambique'],
  ['MD', 'Moldávia'], ['MC', 'Mônaco'], ['MN', 'Mongólia'], ['ME', 'Montenegro'],
  ['NA', 'Namíbia'], ['NR', 'Nauru'], ['NP', 'Nepal'], ['NI', 'Nicarágua'],
  ['NE', 'Níger'], ['NG', 'Nigéria'], ['NO', 'Noruega'], ['NZ', 'Nova Zelândia'],
  ['OM', 'Omã'], ['PW', 'Palau'], ['PA', 'Panamá'], ['PG', 'Papua-Nova Guiné'],
  ['PK', 'Paquistão'], ['PY', 'Paraguai'], ['PE', 'Peru'], ['PL', 'Polônia'],
  ['PT', 'Portugal'], ['KE', 'Quênia'], ['KG', 'Quirguistão'], ['GB', 'Reino Unido'],
  ['CF', 'República Centro-Africana'], ['CD', 'República Democrática do Congo'], ['DO', 'República Dominicana'], ['CZ', 'República Tcheca'],
  ['RW', 'Ruanda'], ['RO', 'Romênia'], ['RU', 'Rússia'], ['RS', 'Sérvia'],
  ['WS', 'Samoa'], ['SM', 'San Marino'], ['LC', 'Santa Lúcia'], ['KN', 'São Cristóvão e Neves'],
  ['ST', 'São Tomé e Príncipe'], ['VC', 'São Vicente e Granadinas'], ['SC', 'Seicheles'], ['SN', 'Senegal'],
  ['SL', 'Serra Leoa'], ['SG', 'Singapura'], ['SY', 'Síria'], ['SO', 'Somália'],
  ['LK', 'Sri Lanka'], ['SZ', 'Suazilândia'], ['SD', 'Sudão'], ['SS', 'Sudão do Sul'],
  ['SE', 'Suécia'], ['CH', 'Suíça'], ['SR', 'Suriname'], ['TH', 'Tailândia'],
  ['TW', 'Taiwan'], ['TJ', 'Tajiquistão'], ['TZ', 'Tanzânia'], ['TL', 'Timor-Leste'],
  ['TG', 'Togo'], ['TO', 'Tonga'], ['TT', 'Trinidad e Tobago'], ['TN', 'Tunísia'],
  ['TM', 'Turcomenistão'], ['TR', 'Turquia'], ['TV', 'Tuvalu'], ['UA', 'Ucrânia'],
  ['UG', 'Uganda'], ['UY', 'Uruguai'], ['UZ', 'Uzbequistão'], ['VU', 'Vanuatu'],
  ['VA', 'Vaticano'], ['VE', 'Venezuela'], ['VN', 'Vietnã'], ['ZM', 'Zâmbia'],
  ['ZW', 'Zimbábue']
];
let PAISES = CODIGOS_PAISES.map(([codigo, nome]) => ({
  codigo, nome, bandeira: bandeiraEmoji(codigo), disponivel: true
}));
async function carregarPaisesDisponiveis5sim() {
  try {
    const res = await fetch('/api/paises-5sim');
    const data = await res.json();
    if (data.isos && data.isos.length > 0) {
      const isosSet = new Set(data.isos);
      const comEstoque = PAISES.filter((p) => p.codigo === 'BR' || isosSet.has(p.codigo));
      const semEstoque = PAISES.filter((p) => p.codigo !== 'BR' && !isosSet.has(p.codigo));
      PAISES = comEstoque.concat(semEstoque);
      if (typeof renderizarPaises === 'function') renderizarPaises();
    }
  } catch (e) {}
}
carregarPaisesDisponiveis5sim();

let filtroPaisTexto = '';
function filtrarPaises(valor) {
  filtroPaisTexto = valor.toLowerCase();
  renderizarPaises();
}
function renderizarPaises() {
  const lista = document.getElementById('paises-list');
  lista.innerHTML = PAISES.filter(p => p.nome.toLowerCase().includes(filtroPaisTexto)).map(p => `
    <div class="pais-item ${p.codigo === paisSelecionado ? 'selecionado' : ''} ${!p.disponivel ? 'em-breve' : ''}"
         onclick="${p.disponivel ? `selecionarPais('${p.codigo}')` : ''}">
      <span class="fi fi-${p.codigo.toLowerCase()} bandeira"></span> ${p.nome}
      ${!p.disponivel ? '<span class="tag-breve">em breve</span>' : ''}
    </div>
  `).join('');
}
function selecionarPais(codigo) {
  paisSelecionado = codigo;
  paisEscolhidoPeloUsuario = true;
  renderizarPaises();
  carregarCatalogo().then(function() {
    const lista = document.getElementById('services-list');
    if (lista) lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function mostrarPainelPais() {
  const box = document.getElementById('painel-pais-box');
  if (box) box.style.display = 'block';
}

function selecionarServico(id) {
  const preco = document.getElementById('preco-' + id);
  const btn = document.getElementById('btn-comprar-' + id);
  if (preco) preco.style.display = 'block';
  if (btn) btn.style.display = 'block';
  mostrarPainelPais();
}

let servicosCarregados = [];

let _catalogoRequestId = 0;
async function carregarCatalogo() {
  const meuRequestId = ++_catalogoRequestId;
  const res = await fetch('/api/catalogo');
  const data = await res.json();
  if (meuRequestId !== _catalogoRequestId) return; // uma requisicao mais nova ja foi disparada, descarta essa
  servicosCarregados = data.servicos;
  precoPorServicoId = {};
  data.servicos.forEach(s => { precoPorServicoId[s.id] = s.precoCentavos; });
  const lista = document.getElementById('services-list');
  if (!paisEscolhidoPeloUsuario) {
    lista.innerHTML = '<div style="padding:24px 12px; text-align:center; color:var(--muted);">Selecione um país abaixo para ver os serviços disponíveis.</div>';
    return;
  }
  let servicosParaMostrar = data.servicos.filter(s => s.nome !== 'WhatsApp Internacional');
  if (paisSelecionado) {
    lista.innerHTML = '<div style="padding:24px 12px; text-align:center; color:var(--muted);"><span class="dot"></span> Carregando serviços disponíveis...</div>';
    servicosParaMostrar = data.servicos.filter(s => !s.nome.toLowerCase().includes(' br ') && s.nome !== 'WhatsApp Internacional');
    function esperar(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }
    function buscarPrecoComRetry(url, tentativas) {
      return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(pd) { return pd.precoCentavos; })
        .catch(function() {
          if (tentativas > 0) {
            return esperar(400).then(function() { return buscarPrecoComRetry(url, tentativas - 1); });
          }
          return null;
        });
    }
    async function buscarEmLotes(servicos, tamanhoLote) {
      const resultado = [];
      for (let i = 0; i < servicos.length; i += tamanhoLote) {
        const lote = servicos.slice(i, i + tamanhoLote);
        const lotePromises = lote.map(function(s) {
          const url = '/api/precos/internacional?pais=' + paisSelecionado + '&servico=' + encodeURIComponent(s.nome);
          return buscarPrecoComRetry(url, 2);
        });
        const loteResultado = await Promise.all(lotePromises);
        resultado.push(...loteResultado);
      }
      return resultado;
    }
    const precosLista = await buscarEmLotes(servicosParaMostrar, 5);
    if (meuRequestId !== _catalogoRequestId) return; // descarta se outro pais foi selecionado enquanto isso
    servicosParaMostrar = servicosParaMostrar
      .map(function(s, i) {
        return precosLista[i] != null ? Object.assign({}, s, { precoCentavos: precosLista[i] }) : null;
      })
      .filter(function(s) { return s !== null; });
  }
  if (servicosParaMostrar.length === 0 && paisSelecionado) {
    lista.innerHTML = '<div style="padding:24px 12px; text-align:center; color:var(--muted);">O estoque desse país muda com frequência. Nada disponível agora — tente atualizar em alguns segundos.<br><button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="carregarCatalogo()">Atualizar</button></div>';
  } else {
    lista.innerHTML = servicosParaMostrar.map(s => `
      <div class="service-row" onclick="pedirCompra(${s.id}, null, ${s.precoCentavos})">
        ${htmlIconeServico(s.nome, 'service-row-icon')}
        <span class="service-row-nome">${s.nome}</span>
        <span class="service-row-preco">R$ ${centavosParaReais(s.precoCentavos)}</span>
      </div>
    `).join('');
  }
  preencherPrecosAtalho();
}

function preencherPrecosAtalho() {
  const preencherPreco = (id, servico) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = servico ? 'R$ ' + centavosParaReais(servico.precoCentavos) : 'Em breve';
  };
  preencherPreco('atalho-preco-aleatorio', buscarServicoPorNome(['aleat']) || buscarServicoPorNome(['whatsapp']));
  preencherPreco('atalho-preco-promocional', buscarServicoPorNome(['promocional']));
  preencherPreco('atalho-preco-ddd', buscarServicoPorNome(['escolher']));
}

let compraPendente = null;
function pedirCompra(servicoId, ddd, precoEsperadoCentavos) {
  const servico = servicosCarregados.find((s) => s.id === servicoId) || { id: servicoId, nome: 'Serviço' };
  compraPendente = { servicoId, ddd, precoEsperadoCentavos, nome: servico.nome };
  if (window.simsmsTrack) window.simsmsTrack('click_buy', { servicoId: servicoId });
  document.getElementById('conf-servico').textContent = 'Serviço: ' + servico.nome;
  document.getElementById('conf-pais').textContent = 'País: ' + (paisSelecionado || 'BR');
  document.getElementById('conf-preco').textContent = 'Preço: R$ ' + centavosParaReais(precoEsperadoCentavos);
  document.getElementById('modal-confirmar').classList.add('show');
}
window.pedirCompra = pedirCompra;

document.getElementById('btn-confirmar-compra').addEventListener('click', () => {
  if (!compraPendente) return;
  document.getElementById('modal-confirmar').classList.remove('show');
  comprarNumero(compraPendente.servicoId, compraPendente.ddd, compraPendente.precoEsperadoCentavos, document.getElementById('conf-cupom').value);
});

function origemPedido() {
  const o = window.simsmsOrigem ? window.simsmsOrigem() : {};
  return { origemTrafego: o.origemTrafego, utmSource: o.utmSource, ref: o.ref };
}

async function comprarNumero(servicoId, ddd, precoEsperadoCentavos, cupom) {
  const res = await fetch('/api/pedidos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({
      servicoId, pais: paisSelecionado, ddd: ddd || undefined,
      precoEsperadoCentavos: precoEsperadoCentavos != null ? precoEsperadoCentavos : undefined,
      cupom: cupom || undefined
    }, origemPedido()))
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.precoAtualizado != null) {
      const confirmarNovoPreco = confirm(data.erro + '\n\nPreço disponível agora: R$ ' + centavosParaReais(data.precoAtualizado) + '. Deseja continuar com a compra por esse valor?');
      if (confirmarNovoPreco) {
        return comprarNumero(servicoId, ddd, data.precoAtualizado);
      }
      return;
    }
    alert(data.erro);
    return;
  }
  atualizarSaldoUI(data.saldoCentavos);
  if (window.simsmsTrack) window.simsmsTrack('activation_started', { servicoId: servicoId });
  abrirModalPedido(data.pedido);
  carregarHistorico();
}

function abrirModalPedido(pedido) {
  pedidoAtual = pedido;
  somCodigoJaTocou = pedido.status === 'recebido';
  document.getElementById('pedido-servico').textContent = pedido.servicoNome + ' — número reservado';
  document.getElementById('pedido-numero').textContent = pedido.numero;
  document.getElementById('modal-pedido').classList.add('show');
  atualizarStatusPedidoUI(pedido);
  iniciarContador(pedido);
  clearInterval(pollTimer);
  pollTimer = setInterval(() => pollPedido(pedido.id), 2500);
}

function tocarSomCodigoRecebido() {
  if (somCodigoJaTocou) return;
  somCodigoJaTocou = true;
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
      gain.gain.setValueAtTime(0.12, ctx.currentTime + n.tempo);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.tempo + 0.14);
      osc.start(ctx.currentTime + n.tempo);
      osc.stop(ctx.currentTime + n.tempo + 0.14);
    });
  } catch (e) {}
}

function escaparHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function atualizarStatusPedidoUI(pedido) {
  const statusEl = document.getElementById('pedido-status');
  const smsEl = document.getElementById('pedido-sms');
  const btnCopiar = document.getElementById('btn-copiar-codigo');
  if (btnCopiar) btnCopiar.style.display = 'none';
  if (pedido.status === 'aguardando') {
    statusEl.innerHTML = '<span class="dot"></span> aguardando SMS…';
    smsEl.style.display = 'none';
  } else if (pedido.status === 'recebido') {
    statusEl.innerHTML = '<span class="dot"></span> código recebido!';
    const msg = pedido.mensagemRecebida && pedido.mensagemRecebida !== 'null'
      ? String(pedido.mensagemRecebida)
      : '';
    const codigo = pedido.codigo ? String(pedido.codigo) : '';
    smsEl.style.display = 'block';
    smsEl.style.opacity = '1';
    smsEl.innerHTML = (msg ? escaparHtml(msg) : 'SMS recebido.')
      + (codigo ? ` <br><strong class="code">Código: ${escaparHtml(codigo)}</strong>` : '');
    if (btnCopiar && codigo) {
      btnCopiar.style.display = 'block';
      btnCopiar.onclick = () => {
        navigator.clipboard.writeText(codigo).then(() => {
          btnCopiar.textContent = 'Código copiado';
          setTimeout(() => { btnCopiar.textContent = 'Copiar código'; }, 1600);
        });
      };
    }
    tocarSomCodigoRecebido();
    if (window.simsmsTrack) window.simsmsTrack('sms_received');
    clearInterval(pollTimer);
    clearInterval(contadorTimer);
  } else if (pedido.status === 'expirado') {
    statusEl.innerHTML = 'expirado — valor não estornado (passou dos 15 minutos)';
    clearInterval(pollTimer);
    clearInterval(contadorTimer);
  } else if (pedido.status === 'cancelado') {
    statusEl.innerHTML = 'cancelado';
    clearInterval(pollTimer);
    clearInterval(contadorTimer);
  }
}

async function pollPedido(id) {
  const res = await fetch('/api/pedidos/' + id);
  const data = await res.json();
  if (!res.ok) return;
  pedidoAtual = data.pedido;
  atualizarStatusPedidoUI(data.pedido);
  if (data.pedido.status !== 'aguardando') carregarHistorico();
}

document.getElementById('btn-cancelar-pedido').addEventListener('click', async () => {
  if (!pedidoAtual) return;
  const res = await fetch(`/api/pedidos/${pedidoAtual.id}/cancelar`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) {
    atualizarSaldoUI(data.saldoCentavos);
    document.getElementById('modal-pedido').classList.remove('show');
    clearInterval(pollTimer);
    clearInterval(contadorTimer);
    carregarHistorico();
  } else {
    alert(data.erro);
  }
});

async function carregarHistorico() {
  const res = await fetch('/api/pedidos');
  const data = await res.json();
  const body = document.getElementById('pedidos-body');
  const vazio = document.getElementById('pedidos-vazio');
  if (!data.pedidos.length) {
    body.innerHTML = '';
    vazio.style.display = 'block';
    atualizarKpis([], 0);
    return;
  }
  vazio.style.display = 'none';
  body.innerHTML = data.pedidos.map(p => `
    <tr>
      <td><span class="fi fi-${(p.pais || 'BR').toLowerCase()} bandeira"></span> ${p.numero}</td>
      <td><span class="tag ${p.status}">${p.status}</span></td>
      <td style="font-family:var(--mono)">${p.codigo || '—'}</td>
      <td>${p.servicoNome}</td>
      <td style="font-family:var(--mono)">${p.precoPagoCentavos !== undefined && p.precoPagoCentavos !== null ? 'R$ ' + centavosParaReais(p.precoPagoCentavos) : '—'}</td>
      <td>${new Date(p.criadoEm).toLocaleString('pt-BR')}</td>
      <td>${(p.status === 'aguardando' || p.status === 'recebido') ? `<button class="btn btn-ghost btn-sm" data-abrir-pedido="${p.id}">Ver</button>` : ''}</td>
    </tr>
  `).join('');
  body.querySelectorAll('[data-abrir-pedido]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pedido = data.pedidos.find((x) => String(x.id) === String(btn.dataset.abrirPedido));
      if (pedido) abrirModalPedido(pedido);
    });
  });
  atualizarKpis(data.pedidos);
}

function atualizarKpis(pedidos) {
  const ok = pedidos.filter((p) => p.status === 'recebido');
  const kpiA = document.getElementById('kpi-ativacoes');
  const kpiU = document.getElementById('kpi-ultima');
  const kpiF = document.getElementById('kpi-fav');
  if (kpiA) kpiA.textContent = String(ok.length);
  if (kpiU) kpiU.textContent = pedidos[0] ? pedidos[0].servicoNome : '—';
  const cont = {};
  ok.forEach((p) => { cont[p.servicoNome] = (cont[p.servicoNome] || 0) + 1; });
  const fav = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  if (kpiF) kpiF.textContent = fav ? fav[0] : '—';
  const box = document.getElementById('recompra-box');
  const list = document.getElementById('recompra-list');
  if (!box || !list) return;
  const usados = [];
  pedidos.forEach((p) => {
    if (!usados.find((x) => x.servicoId === p.servicoId)) usados.push(p);
  });
  if (!usados.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  list.innerHTML = usados.slice(0, 6).map((p) =>
    `<button type="button" class="btn btn-ghost btn-sm" data-rep="${p.servicoId}">Repetir ${p.servicoNome}</button>`
  ).join('');
  list.querySelectorAll('[data-rep]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = servicosCarregados.find((x) => String(x.id) === String(btn.dataset.rep));
      if (s) pedirCompra(s.id, null, s.precoCentavos);
    });
  });
}

function buscarServicoPorNome(pedacos) {
  return servicosCarregados.find(s => {
    const n = s.nome.trim().toLowerCase();
    return pedacos.every(p => n.includes(p));
  });
}

document.getElementById('btn-atalho-whatsapp').addEventListener('click', async () => {
  paisSelecionado = 'BR';
  renderizarPaises();
  const servico = buscarServicoPorNome(['whatsapp']);
  if (!servico) return alert('Cadastre um serviço "WhatsApp" no admin pra usar esse atalho.');
  let precoAtual = servico.precoCentavos;
  try {
    const r = await fetch('/api/precos/internacional?pais=BR&servico=' + encodeURIComponent(servico.nome));
    const pd = await r.json();
    if (pd && pd.precoCentavos != null) precoAtual = pd.precoCentavos;
  } catch (e) {}
  const confirmado = confirm('Você confirma a compra desse número brasileiro pelo valor atualizado de R$ ' + centavosParaReais(precoAtual) + '?');
  if (!confirmado) return;
  comprarNumero(servico.id, null, precoAtual);
});

let servicoDDDSelecionado = null;
async function abrirModalDDD() {
  const servico = buscarServicoPorNome(['escolher']);
  if (!servico) { alert('Cadastre um serviço "WhatsApp BR Escolher DDD" no admin pra usar esse atalho.'); return; }
  servicoDDDSelecionado = servico;
  document.getElementById('ddd-valor').textContent = 'Valor: R$ ' + centavosParaReais(servico.precoCentavos);
  document.getElementById('modal-ddd').classList.add('show');

  const select = document.getElementById('ddd-select');
  select.innerHTML = '<option value="">Carregando DDDs…</option>';
  try {
    const res = await fetch('/api/ddds-disponiveis?pais=BR');
    const data = await res.json();
    if (!data.ddds.length) {
      select.innerHTML = '<option value="">Nenhum DDD disponível no momento</option>';
      return;
    }
    select.innerHTML = '<option value="">-- Selecione um DDD --</option>' +
      data.ddds.map(d => `<option value="${d.ddd}">DDD ${d.ddd} (${d.quantidade} número${d.quantidade > 1 ? 's' : ''} disponíve${d.quantidade > 1 ? 'is' : 'l'})</option>`).join('');
  } catch (e) {
    select.innerHTML = '<option value="">Erro ao carregar DDDs</option>';
  }
}

document.getElementById('btn-comprar-ddd').addEventListener('click', async () => {
  const ddd = document.getElementById('ddd-select').value;
  if (!ddd) return alert('Selecione um DDD.');
  if (!servicoDDDSelecionado) return;
  document.getElementById('modal-ddd').classList.remove('show');
  comprarNumero(servicoDDDSelecionado.id, ddd, servicoDDDSelecionado.precoCentavos);
});

document.getElementById('link-fallback-aleatorio').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('modal-ddd').classList.remove('show');
  const servico = buscarServicoPorNome(['aleat']) || buscarServicoPorNome(['whatsapp']);
  if (!servico) return alert('Cadastre um serviço "WhatsApp BR DDD Aleatório" no admin pra usar esse atalho.');
  comprarNumero(servico.id, null, servico.precoCentavos);
});

document.getElementById('link-recarga').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('modal-recarga').classList.add('show');
});
document.getElementById('link-afiliado').addEventListener('click', async (e) => {
  e.preventDefault();
  document.getElementById('modal-afiliado').classList.add('show');
  try {
    const res = await fetch('/api/afiliado');
    const data = await res.json();
    const link = window.location.origin + '/?ref=' + data.codigoAfiliado;
    document.getElementById('afiliado-link').value = link;
    document.getElementById('afiliado-indicados').textContent = data.pessoasIndicadas || 0;
    document.getElementById('afiliado-cadastros').textContent = data.cadastros || 0;
    document.getElementById('afiliado-primeira').textContent = data.primeiraCompra || 0;
    document.getElementById('afiliado-gerada').textContent = 'R$ ' + centavosParaReais(data.comissaoGeradaCentavos || 0);
    document.getElementById('afiliado-saldo').textContent = 'R$ ' + centavosParaReais(data.saldoDisponivelCentavos || 0);
    document.getElementById('afiliado-saque-min').textContent = 'R$ ' + centavosParaReais(data.saqueMinimoCentavos || 0);
    const st = data.afiliadoStatus || '';
    document.getElementById('afiliado-status-txt').textContent =
      st === 'ativo' ? 'Status: afiliado ativo.' :
      st === 'pendente' ? 'Status: aguardando aprovação.' :
      st === 'bloqueado' ? 'Status: bloqueado.' :
      'Status: indicação (peça para virar afiliado se quiser comissão de afiliado).';
    document.getElementById('afiliado-saque-hint').textContent = data.podeSacar
      ? 'Você atingiu o mínimo. Peça o pagamento pelo WhatsApp do suporte.'
      : 'Pagamento manual pelo admin quando o saldo passar do mínimo.';
    const txtBase = (data.textos && data.textos.whatsapp) || 'Receba códigos SMS sem usar seu número pessoal. ';
    const msgEl = document.getElementById('afiliado-msg');
    if (!msgEl.value) msgEl.value = txtBase + link;
    document.getElementById('btn-share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msgEl.value);
    const qr = document.getElementById('afiliado-qr');
    qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(link);
    const corpo = document.getElementById('afiliado-vendas-body');
    if (corpo) {
      corpo.innerHTML = (data.historico || data.vendas || []).map(v => `
        <tr>
          <td>${v.servico}</td>
          <td>R$ ${centavosParaReais(v.valorVendaCentavos)}</td>
          <td>R$ ${centavosParaReais(v.comissaoCentavos)}</td>
          <td>${new Date(v.criadoEm).toLocaleDateString('pt-BR')}</td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align:center; color:var(--muted);">Nenhuma comissão ainda</td></tr>';
    }
    const ind = document.getElementById('afiliado-indicados-body');
    if (ind) {
      ind.innerHTML = (data.indicados || []).map(x => `
        <tr><td>${x.nome}</td><td>${x.comprou ? 'sim' : 'não'}</td><td>${x.criadoEm ? new Date(x.criadoEm).toLocaleDateString('pt-BR') : '—'}</td></tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center; color:var(--muted);">Ninguém ainda</td></tr>';
    }
    const pag = document.getElementById('afiliado-pag-body');
    if (pag) {
      pag.innerHTML = (data.pagamentos || []).map(p => `
        <tr><td>#${p.id}</td><td>R$ ${centavosParaReais(p.valorCentavos)}</td><td>${new Date(p.em).toLocaleDateString('pt-BR')}</td></tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center; color:var(--muted);">Nenhum pagamento registrado</td></tr>';
    }
  } catch (err) {}
});
document.getElementById('btn-copiar-link-afiliado').addEventListener('click', () => {
  const campo = document.getElementById('afiliado-link');
  campo.select();
  navigator.clipboard.writeText(campo.value);
  const btn = document.getElementById('btn-copiar-link-afiliado');
  const textoOriginal = btn.textContent;
  btn.textContent = 'Copiado!';
  setTimeout(() => { btn.textContent = textoOriginal; }, 2000);
});
document.getElementById('afiliado-msg').addEventListener('input', () => {
  document.getElementById('btn-share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(document.getElementById('afiliado-msg').value);
});
document.getElementById('btn-share-native').addEventListener('click', async () => {
  const text = document.getElementById('afiliado-msg').value;
  const url = document.getElementById('afiliado-link').value;
  if (navigator.share) {
    try { await navigator.share({ title: 'SimSMS', text: text, url: url }); } catch (e) {}
  } else {
    navigator.clipboard.writeText(text);
    alert('Mensagem copiada.');
  }
});
document.getElementById('btn-ser-afiliado').addEventListener('click', async () => {
  const res = await fetch('/api/afiliado/solicitar', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return alert(data.erro || 'Não foi possível solicitar.');
  alert(data.afiliadoStatus === 'pendente' ? 'Pedido enviado. O admin precisa aprovar.' : 'Você já está como afiliado.');
  document.getElementById('link-afiliado').click();
});
async function revelarLinkAfiliadoSeAplicavel() {
  document.getElementById('link-afiliado').style.display = '';
}
document.getElementById('link-suporte').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const m = document.getElementById('suporte-menu-sidebar');
  m.style.display = m.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', () => {
  const m = document.getElementById('suporte-menu-sidebar');
  if (m) m.style.display = 'none';
});
document.getElementById('btn-ajuda-whatsapp').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('ajuda-menu').classList.toggle('show');
});
document.addEventListener('click', () => {
  document.getElementById('ajuda-menu').classList.remove('show');
});
document.getElementById('btn-add-creditos').addEventListener('click', () => {
  document.getElementById('modal-recarga').classList.add('show');
});

// ----- Modais -----
document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => document.getElementById(el.dataset.close).classList.remove('show'));
});
document.querySelectorAll('.modal-bg').forEach((bg) => {
  bg.addEventListener('click', (e) => {
    if (e.target === bg) bg.classList.remove('show');
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal-bg.show').forEach((bg) => bg.classList.remove('show'));
});

// ----- Recarga -----
const campoCpfRecarga = document.getElementById('cpf-recarga');
if (campoCpfRecarga) {
  campoCpfRecarga.addEventListener('input', () => {
    let v = campoCpfRecarga.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    campoCpfRecarga.value = v;
  });
}
document.getElementById('btn-pix').addEventListener('click', async () => {
  const valor = Number(document.getElementById('valor-recarga').value);
  const nomeRecarga = document.getElementById('nome-recarga').value.trim();
  const cpfRecarga = document.getElementById('cpf-recarga').value.replace(/\D/g, '');
  const msg = document.getElementById('msg-recarga');
  msg.className = 'form-msg'; msg.textContent = '';
  if (!nomeRecarga || nomeRecarga.split(' ').filter(Boolean).length < 2) {
    msg.className = 'form-msg erro'; msg.textContent = 'Informe seu nome completo.';
    return;
  }
  if (cpfRecarga.length !== 11) {
    msg.className = 'form-msg erro'; msg.textContent = 'Informe um CPF válido (11 dígitos).';
    return;
  }
  const res = await fetch('/api/pagamentos/pix', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ valorReais: valor, nomePagador: nomeRecarga, cpfPagador: cpfRecarga }, origemPedido()))
  });
  const data = await res.json();
  if (!res.ok) {
    msg.className = 'form-msg erro'; msg.textContent = data.erro + (data.detalhe ? ' Configure MP_ACCESS_TOKEN no .env para ativar pagamentos de verdade.' : '');
    return;
  }
  document.getElementById('area-pix').style.display = 'block';
  document.getElementById('pix-qr-img').src = 'data:image/png;base64,' + data.qrCodeBase64;
  document.getElementById('pix-copia-cola').textContent = data.qrCode;
  document.getElementById('pix-copia-cola').onclick = () => {
    navigator.clipboard.writeText(data.qrCode);
    const el = document.getElementById('pix-copia-cola');
    const original = data.qrCode;
    el.textContent = 'Copiado!';
    setTimeout(() => { el.textContent = original; }, 1500);
  };
  if (window._pixPollTimer) clearInterval(window._pixPollTimer);
  window._pixPollTimer = setInterval(async () => {
    try {
      const resVerif = await fetch('/api/pagamentos/' + data.transacaoId + '/verificar', { method: 'POST' });
      const dataVerif = await resVerif.json();
      if (dataVerif.status === 'aprovado') {
        clearInterval(window._pixPollTimer);
        document.getElementById('modal-recarga').classList.remove('show');
        document.getElementById('area-pix').style.display = 'none';
        if (dataVerif.saldoCentavos !== undefined) {
          atualizarSaldoUI(dataVerif.saldoCentavos);
        } else {
          const resCarteira = await fetch('/api/carteira');
          const dataCarteira = await resCarteira.json();
          atualizarSaldoUI(dataCarteira.saldoCentavos);
        }
        const extra = dataVerif.bonusCentavos ? ' Bônus de R$ ' + centavosParaReais(dataVerif.bonusCentavos) + ' creditado.' : '';
        alert('Saldo atualizado.' + extra);
        document.getElementById('catalogo-col-anchor').scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {}
  }, 3000);
});

document.getElementById('btn-cartao').addEventListener('click', async () => {
  const valor = Number(document.getElementById('valor-recarga').value);
  const msg = document.getElementById('msg-recarga');
  msg.className = 'form-msg'; msg.textContent = '';
  const res = await fetch('/api/pagamentos/cartao', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valorReais: valor })
  });
  const data = await res.json();
  if (!res.ok) {
    msg.className = 'form-msg erro'; msg.textContent = data.erro + (data.detalhe ? ' Configure MP_ACCESS_TOKEN no .env para ativar pagamentos de verdade.' : '');
    return;
  }
  window.location.href = data.initPoint;
});

document.getElementById('btn-sair').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

(async function init() {
  document.body.classList.add('has-dock');
  const user = await verificarSessao();
  if (!user) return;
  renderizarPaises();
  await carregarCatalogo();
  carregarHistorico();
  revelarLinkAfiliadoSeAplicavel();
  try {
    const pub = await fetch('/api/publico').then((r) => r.json());
    const el = document.getElementById('bonus-dash');
    const partes = [];
    if (pub.bonus && pub.bonus.ativo) {
      partes.push('Primeira recarga: depósito a partir de R$ ' + centavosParaReais(pub.bonus.minimoDepositoCentavos) + ' pode receber R$ ' + centavosParaReais(pub.bonus.bonusCentavos) + ' de bônus.');
      const hint = document.getElementById('bonus-recarga-hint');
      if (hint) hint.textContent = 'Bônus de boas-vindas ativo acima de R$ ' + centavosParaReais(pub.bonus.minimoDepositoCentavos) + '.';
    }
    if (pub.ofertaNovos && pub.ofertaNovos.ativo) {
      partes.push((pub.ofertaNovos.titulo || 'Oferta para novos') + (pub.ofertaNovos.texto ? ' — ' + pub.ofertaNovos.texto : '') + (pub.ofertaNovos.cupomCodigo ? ' Cupom: ' + pub.ofertaNovos.cupomCodigo : ''));
    }
    if (el && partes.length) { el.hidden = false; el.textContent = partes.join(' '); }
  } catch (e) {}
  document.querySelectorAll('.pack-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pack-btn').forEach((b) => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');
      document.getElementById('valor-recarga').value = btn.dataset.valor;
    });
  });
  const dockSaldo = document.getElementById('dock-saldo');
  if (dockSaldo) dockSaldo.addEventListener('click', () => document.getElementById('modal-recarga').classList.add('show'));
  const params = new URLSearchParams(location.search);
  if (params.get('recarga') === '1' || params.get('pagamento') === 'sucesso') {
    document.getElementById('modal-recarga').classList.add('show');
  }
  const comprarId = params.get('comprar');
  if (comprarId) {
    const s = servicosCarregados.find((x) => String(x.id) === String(comprarId));
    if (s) pedirCompra(s.id, null, s.precoCentavos);
  }
})();
