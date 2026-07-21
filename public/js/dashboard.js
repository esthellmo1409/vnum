let pedidoAtual = null;
let pollTimer = null;
let contadorTimer = null;
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

// Ícone (Tabler Icons) e cor de marca por serviço. Serviços sem ícone de marca
// exato na biblioteca usam um ícone genérico da categoria, na cor da marca.
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

function atualizarSaldoUI(saldoCentavos) {
  const texto = 'R$ ' + centavosParaReais(saldoCentavos);
  document.getElementById('saldo').textContent = texto;
  document.getElementById('user-menu-saldo').textContent = texto;
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
    lista.innerHTML = servicosParaMostrar.map(s => {
      const { icone, bg, txt } = iconeDoServico(s.nome);
      return `
      <div class="service-row" onclick="comprarNumero(${s.id})">
        <span class="service-row-icon" style="background:${bg}; color:${txt || '#fff'};"><i class="ti ${icone}" aria-hidden="true"></i></span>
        <span class="service-row-nome">${s.nome}</span>
        <span class="service-row-preco">R$ ${centavosParaReais(s.precoCentavos)}</span>
      </div>
    `;
    }).join('');
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

async function comprarNumero(servicoId, ddd) {
  const res = await fetch('/api/pedidos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ servicoId, pais: paisSelecionado, ddd: ddd || undefined })
  });
  const data = await res.json();
  if (!res.ok) { alert(data.erro); return; }
  atualizarSaldoUI(data.saldoCentavos);
  abrirModalPedido(data.pedido);
  carregarHistorico();
}

function abrirModalPedido(pedido) {
  pedidoAtual = pedido;
  document.getElementById('pedido-servico').textContent = pedido.servicoNome + ' — número reservado';
  document.getElementById('pedido-numero').textContent = pedido.numero;
  document.getElementById('modal-pedido').classList.add('show');
  atualizarStatusPedidoUI(pedido);
  iniciarContador(pedido);
  clearInterval(pollTimer);
  pollTimer = setInterval(() => pollPedido(pedido.id), 2500);
}

function tocarSomCodigoRecebido() {
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

function atualizarStatusPedidoUI(pedido) {
  const statusEl = document.getElementById('pedido-status');
  const smsEl = document.getElementById('pedido-sms');
  if (pedido.status === 'aguardando') {
    statusEl.innerHTML = '<span class="dot"></span> aguardando SMS…';
    smsEl.style.display = 'none';
  } else if (pedido.status === 'recebido') {
    statusEl.innerHTML = '<span class="dot"></span> código recebido!';
    smsEl.style.display = 'block';
    smsEl.innerHTML = pedido.mensagemRecebida + (pedido.codigo ? ` <br><strong style="color:var(--amber)">Código: ${pedido.codigo}</strong>` : '');
    tocarSomCodigoRecebido();
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
      <td>${p.status === 'aguardando' ? `<button class="btn btn-ghost btn-sm" onclick='abrirModalPedido(${JSON.stringify(p)})'>Ver</button>` : ''}</td>
    </tr>
  `).join('');
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
  comprarNumero(servico.id);
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
  comprarNumero(servicoDDDSelecionado.id, ddd);
});

document.getElementById('link-fallback-aleatorio').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('modal-ddd').classList.remove('show');
  const servico = buscarServicoPorNome(['aleat']) || buscarServicoPorNome(['whatsapp']);
  if (!servico) return alert('Cadastre um serviço "WhatsApp BR DDD Aleatório" no admin pra usar esse atalho.');
  comprarNumero(servico.id);
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
    if (!data.ehAfiliado) return;
    document.getElementById('afiliado-link').value = window.location.origin + '/cadastro.html?ref=' + data.codigoAfiliado;
    document.getElementById('afiliado-indicados').textContent = data.totalIndicados;
    document.getElementById('afiliado-vendas').textContent = data.totalVendasComComissao;
    document.getElementById('afiliado-saldo').textContent = 'R$ ' + centavosParaReais(data.saldoComissaoCentavos);
    const corpo = document.getElementById('afiliado-vendas-body');
    if (corpo) {
      corpo.innerHTML = (data.vendas || []).map(v => `
        <tr>
          <td>${v.servico}</td>
          <td>R$ ${centavosParaReais(v.valorVendaCentavos)}</td>
          <td>R$ ${centavosParaReais(v.comissaoCentavos)}</td>
          <td>${new Date(v.criadoEm).toLocaleDateString('pt-BR')}</td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align:center; color:var(--muted);">Nenhuma venda ainda</td></tr>';
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
async function revelarLinkAfiliadoSeAplicavel() {
  try {
    const res = await fetch('/api/afiliado');
    const data = await res.json();
    if (data.ehAfiliado) {
      document.getElementById('link-afiliado').style.display = '';
    }
  } catch (err) {}
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
    body: JSON.stringify({ valorReais: valor, nomePagador: nomeRecarga, cpfPagador: cpfRecarga })
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
        alert('Pagamento confirmado! Saldo creditado.');
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
  const user = await verificarSessao();
  if (!user) return;
  renderizarPaises();
  await carregarCatalogo();
  carregarHistorico();
  revelarLinkAfiliadoSeAplicavel();
})();
