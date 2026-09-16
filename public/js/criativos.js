const FORMATOS = [
  { id: 'wa', nome: 'WhatsApp', sub: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'ig', nome: 'Instagram Post', sub: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'story', nome: 'Instagram Story', sub: '1080 × 1920', w: 1080, h: 1920 },
  { id: 'banner', nome: 'Banner horizontal', sub: '1920 × 1080', w: 1920, h: 1080 }
];

const OBJETIVOS = [
  { id: 'geral', nome: 'Divulgação geral' },
  { id: 'numero', nome: 'Número virtual' },
  { id: 'sms', nome: 'Receber SMS' },
  { id: 'oferta', nome: 'Oferta' },
  { id: 'primeira', nome: 'Primeira compra' },
  { id: 'pix', nome: 'PIX' },
  { id: 'afiliados', nome: 'Afiliados' }
];

const ESTILOS = [
  { id: 'foto', nome: 'Fotográfico' },
  { id: 'saas', nome: 'SaaS premium' },
  { id: 'min', nome: 'Minimalista' },
  { id: 'com', nome: 'Comercial' },
  { id: 'tec', nome: 'Tecnologia' }
];

const MODELOS = [
  { id: 1, nome: 'Smartphone + SMS', foto: '/criativos/fotos/fone-mesa.jpg' },
  { id: 2, nome: 'Pessoa e celular', foto: '/criativos/fotos/pessoa-celular.jpg' },
  { id: 3, nome: 'Close do código', foto: '/criativos/fotos/close-tela.jpg' },
  { id: 4, nome: 'Painel no notebook', foto: '/criativos/fotos/notebook.jpg' },
  { id: 5, nome: 'Marca + smartphone', foto: '' },
  { id: 6, nome: 'Mensagem e CTA', foto: '' }
];

const CTAS = [
  'ACESSE SIMSMS.COM.BR',
  'ACESSAR SIMSMS',
  'CONHECER',
  'COMPRAR NÚMERO',
  'COMEÇAR AGORA'
];

const COPY = {
  geral: {
    h: 'PRECISA RECEBER UM SMS?',
    s: 'Números virtuais para receber códigos SMS sem precisar usar seu número pessoal.'
  },
  numero: {
    h: 'NÚMERO VIRTUAL PARA SMS',
    s: 'Ative um serviço sem cadastrar o seu chip pessoal. O código chega no painel.'
  },
  sms: {
    h: 'RECEBA O SMS NO PAINEL',
    s: 'O número é reservado, o SMS entra na tela e você copia o código.'
  },
  oferta: {
    h: 'OFERTA PARA QUEM ESTÁ COMEÇANDO',
    s: 'Condição configurada no painel. Sem número inventado na arte.'
  },
  primeira: {
    h: 'COMECE PELO PRIMEIRO NÚMERO',
    s: 'Crie a conta, recarregue no Pix e compre a ativação pelo painel.'
  },
  pix: {
    h: 'PAGA NO PIX. RECEBE O CÓDIGO.',
    s: 'Saldo no Pix, número virtual e SMS no mesmo painel.'
  },
  afiliados: {
    h: 'INDIQUE O SIMSMS',
    s: 'Use seu link, acompanhe cadastros e comissões no painel.'
  }
};

const state = {
  formato: 'wa',
  objetivo: 'geral',
  estilo: 'foto',
  modelo: 1,
  cta: CTAS[0],
  crop: 'center',
  seed: 0
};

let ctxSistema = null;

function $(id) { return document.getElementById(id); }

function fmt() {
  return FORMATOS.find((f) => f.id === state.formato);
}

function chips() {
  return [0, 1, 2, 3].map((i) => ($('chip-' + i).value || '').trim()).filter(Boolean).slice(0, 4);
}

function veil() {
  const e = state.estilo;
  if (e === 'saas') return 'linear-gradient(180deg, rgba(16,21,31,.35) 0%, rgba(16,21,31,.82) 100%)';
  if (e === 'min') return 'linear-gradient(180deg, rgba(255,255,255,.04) 0%, rgba(10,12,16,.88) 100%)';
  if (e === 'com') return 'linear-gradient(180deg, rgba(23,59,194,.25) 0%, rgba(16,21,31,.86) 100%)';
  if (e === 'tec') return 'linear-gradient(180deg, rgba(12,14,20,.2) 0%, rgba(12,14,20,.9) 100%)';
  return 'linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.78) 100%)';
}

function pad() {
  const f = fmt();
  if (f.id === 'story') return '72px 72px 96px';
  if (f.id === 'banner') return '64px 80px';
  return '64px 64px 72px';
}

function headlineSize() {
  const f = fmt();
  const n = ($('txt-headline').value || '').length;
  if (f.id === 'banner') return n > 36 ? '54px' : '64px';
  if (f.id === 'story') return n > 36 ? '72px' : '88px';
  return n > 36 ? '56px' : '68px';
}

function smsCard() {
  return `<div class="sms-card">
    <div class="from">SIMSMS</div>
    <div class="code">482 931</div>
    <div class="msg">Seu código de verificação</div>
  </div>`;
}

function phoneFrame() {
  return `<div style="width:240px;height:480px;border-radius:32px;background:#111;border:8px solid #1c1c1c;box-shadow:0 24px 50px rgba(0,0,0,.35);padding:18px 14px;color:#fff;">
    <div style="font-size:11px;opacity:.55;letter-spacing:.12em;">SIMSMS</div>
    <div style="margin-top:28px;font-size:15px;font-weight:600;">Aguardando SMS</div>
    <div style="margin-top:16px;background:#fff;color:#12141a;border-radius:12px;padding:12px;">
      <div style="font-size:11px;color:#5b6472;">Código</div>
      <div style="font-size:22px;font-weight:700;letter-spacing:.12em;">482931</div>
    </div>
  </div>`;
}

function panelFake() {
  return `<div class="panel-fake" style="width:min(520px,70%);">
    <header><span class="dot"></span> SimSMS · painel</header>
    <div class="row">Pedido aguardando SMS</div>
    <div class="row" style="font-weight:700;color:#10151f;letter-spacing:.14em;">482931</div>
  </div>`;
}

function layoutInner() {
  const h = $('txt-headline').value;
  const s = $('txt-sub').value;
  const cta = $('txt-cta').value;
  const url = $('txt-url').value;
  const list = chips().map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('');
  const hs = headlineSize();
  const copy = `
    <div class="brand">SIMSMS</div>
    <h2 class="headline" style="font-size:${hs};max-width:90%;margin-top:18px;">${escapeHtml(h)}</h2>
    <p class="sub" style="font-size:22px;max-width:85%;margin-top:18px;">${escapeHtml(s)}</p>
    <div class="chips" style="margin-top:22px;">${list}</div>
    <div class="cta" style="margin-top:28px;min-height:56px;padding:0 28px;font-size:18px;">${escapeHtml(cta)}</div>
    <div class="url" style="margin-top:14px;font-size:16px;">${escapeHtml(url)}</div>`;
  const m = state.modelo;
  const f = fmt();
  const storyCol = f.id === 'story' || f.id === 'banner';
  if (m === 6) {
    return `<div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:center;">${copy}</div>`;
  }
  if (m === 5) {
    return `<div style="position:relative;z-index:2;height:100%;display:flex;align-items:${storyCol ? 'flex-end' : 'center'};justify-content:space-between;gap:32px;">
      <div style="flex:1;">${copy}</div>${phoneFrame()}
    </div>`;
  }
  if (m === 3) {
    return `<div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:flex-end;">
      <div style="margin-bottom:24px;">${smsCard()}</div>${copy}
    </div>`;
  }
  if (m === 4) {
    return `<div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:28px;">
      ${panelFake()}${copy}
    </div>`;
  }
  if (m === 1) {
    return `<div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:space-between;">
      ${smsCard()}${copy}
    </div>`;
  }
  return `<div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:flex-end;">${copy}</div>`;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function bgColor() {
  if (state.modelo === 6 || state.modelo === 5) {
    if (state.estilo === 'saas') return '#0f1728';
    if (state.estilo === 'min') return '#f7f8fb';
    if (state.estilo === 'com') return '#173BC2';
    if (state.estilo === 'tec') return '#12141a';
    return '#10151f';
  }
  return '#10151f';
}

function textOnLight() {
  return (state.modelo === 5 || state.modelo === 6) && state.estilo === 'min';
}

function render() {
  const f = fmt();
  const stage = $('stage');
  const modelo = MODELOS.find((m) => m.id === state.modelo);
  const light = textOnLight();
  const crop = ['center', 'top', 'bottom'][state.seed % 3];
  const foto = modelo.foto
    ? `<div class="stage-photo" style="background-image:url('${modelo.foto}');background-position:${crop};filter:saturate(.92) contrast(1.04);"></div>
       <div class="stage-veil" style="background:${veil()};"></div>`
    : '';
  stage.style.width = f.w + 'px';
  stage.style.height = f.h + 'px';
  stage.style.background = bgColor();
  stage.style.padding = pad();
  stage.style.color = light ? '#10151f' : '#fff';
  stage.innerHTML = foto + layoutInner();
  if (light) {
    stage.querySelectorAll('.chip').forEach((el) => { el.style.borderColor = '#c9d0dc'; el.style.color = '#10151f'; });
    stage.querySelectorAll('.sub,.url').forEach((el) => { el.style.color = '#5b6472'; el.style.opacity = '1'; });
  }
  $('meta-formato').textContent = f.w + ' × ' + f.h;
  $('meta-campanha').textContent = OBJETIVOS.find((o) => o.id === state.objetivo).nome + ' · modelo ' + state.modelo;
  fitPreview();
}

function fitPreview() {
  const f = fmt();
  const box = $('preview').getBoundingClientRect();
  const s = Math.min((box.width - 48) / f.w, (box.height - 48) / f.h, 0.48);
  const scaler = $('scaler');
  scaler.style.transform = 'scale(' + s + ')';
  scaler.style.width = f.w + 'px';
  scaler.style.height = f.h + 'px';
}

function paintOptions(id, items, key, label) {
  const root = $(id);
  root.innerHTML = items.map((item) => {
    const on = state[key] === item.id ? ' on' : '';
    const sub = item.sub ? `<small>${item.sub}</small>` : '';
    return `<button type="button" class="st-opt${on}" data-id="${item.id}">${item.nome}${sub}</button>`;
  }).join('');
  root.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state[key] = label === 'num' ? Number(btn.dataset.id) : btn.dataset.id;
      if (key === 'objetivo') applyObjetivo();
      if (key === 'cta') $('txt-cta').value = state.cta;
      render();
      paintAll();
    });
  });
}

function paintModelos() {
  const root = $('opts-modelo');
  root.innerHTML = MODELOS.map((m) => {
    const on = state.modelo === m.id ? ' on' : '';
    const bg = m.foto ? `background-image:url('${m.foto}')` : 'background:#171b24';
    return `<button type="button" class="st-model${on}" data-id="${m.id}"><div class="thumb" style="${bg}"></div><span>${m.nome}</span></button>`;
  }).join('');
  root.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.modelo = Number(btn.dataset.id);
      render();
      paintAll();
    });
  });
}

function paintCtas() {
  const root = $('opts-cta');
  const list = (ctxSistema && ctxSistema.cta && ctxSistema.cta.length) ? ctxSistema.cta : CTAS;
  root.innerHTML = list.map((c) => {
    const on = $('txt-cta').value === c ? ' on' : '';
    return `<button type="button" class="st-opt${on}" data-cta="${c}">${c}</button>`;
  }).join('');
  root.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.cta = btn.dataset.cta;
      $('txt-cta').value = state.cta;
      render();
      paintCtas();
    });
  });
}

function paintAll() {
  paintOptions('opts-formato', FORMATOS, 'formato');
  paintOptions('opts-objetivo', OBJETIVOS, 'objetivo');
  paintOptions('opts-estilo', ESTILOS, 'estilo');
  paintModelos();
  paintCtas();
}

function applyObjetivo() {
  const pack = COPY[state.objetivo];
  if (!pack) return;
  $('txt-headline').value = pack.h;
  $('txt-sub').value = pack.s;
  if (state.objetivo === 'oferta' && ctxSistema && ctxSistema.oferta) {
    $('txt-headline').value = ctxSistema.oferta.titulo || pack.h;
    if (ctxSistema.oferta.texto) $('txt-sub').value = ctxSistema.oferta.texto;
    if (ctxSistema.oferta.cupomCodigo) $('txt-sub').value += ' Cupom: ' + ctxSistema.oferta.cupomCodigo;
  }
  if (state.objetivo === 'oferta' && (!ctxSistema || !ctxSistema.oferta)) {
    $('txt-headline').value = 'OFERTA INDISPONÍVEL';
    $('txt-sub').value = 'Nenhuma oferta ativa no painel. Ative em Marketing para usar este objetivo.';
  }
  if (state.objetivo === 'primeira' && ctxSistema && ctxSistema.bonus) {
    $('txt-sub').value = 'Bônus de primeira recarga está ativo no painel. O valor não é impresso aqui para não desatualizar a arte.';
  }
  if (state.objetivo === 'afiliados' && ctxSistema && ctxSistema.afiliados && ctxSistema.afiliados.ativo) {
    const p = ctxSistema.afiliados.primeiraPercent;
    if (p) $('txt-sub').value = 'Indique pelo seu link. A comissão da primeira compra segue a regra configurada no painel.';
  }
  if (state.objetivo === 'pix') $('txt-cta').value = 'COMEÇAR AGORA';
}

async function baixar() {
  const f = fmt();
  const scaler = $('scaler');
  const prev = scaler.style.transform;
  scaler.style.transform = 'none';
  const stage = $('stage');
  try {
    const canvas = await html2canvas(stage, {
      scale: 1,
      backgroundColor: null,
      useCORS: true,
      logging: false
    });
    const a = document.createElement('a');
    a.download = 'simsms-' + state.objetivo + '-m' + state.modelo + '-' + f.w + 'x' + f.h + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  } finally {
    scaler.style.transform = prev;
    fitPreview();
  }
}

function variacao() {
  state.seed += 1;
  const ordem = [1, 2, 3, 4, 5, 6];
  state.modelo = ordem[state.seed % ordem.length];
  const est = ['foto', 'saas', 'min', 'com', 'tec'];
  state.estilo = est[state.seed % est.length];
  render();
  paintAll();
}

['txt-headline', 'txt-sub', 'txt-cta', 'txt-url', 'chip-0', 'chip-1', 'chip-2', 'chip-3'].forEach((id) => {
  $(id).addEventListener('input', render);
});
$('btn-baixar').addEventListener('click', baixar);
$('btn-variacao').addEventListener('click', variacao);
window.addEventListener('resize', fitPreview);

(async function init() {
  try {
    const eu = await fetch('/api/auth/eu').then((r) => r.json());
    if (!eu.usuario || !eu.usuario.isAdmin) {
      window.location.href = '/login.html';
      return;
    }
  } catch (e) {
    window.location.href = '/login.html';
    return;
  }
  try {
    const res = await fetch('/api/admin/criativos/contexto');
    if (res.ok) ctxSistema = await res.json();
  } catch (e) {}
  if (ctxSistema && ctxSistema.destaques) {
    ctxSistema.destaques.forEach((d, i) => {
      const el = $('chip-' + i);
      if (el) el.value = d;
    });
  }
  if (ctxSistema && ctxSistema.site) $('txt-url').value = ctxSistema.site;
  const hint = $('hint-sistema');
  if (ctxSistema) {
    const bits = [];
    if (ctxSistema.oferta) bits.push('Oferta ativa no painel — o objetivo Oferta usa o título cadastrado.');
    else bits.push('Nenhuma oferta ativa: o objetivo Oferta avisa isso na arte.');
    if (ctxSistema.bonus) bits.push('Bônus de primeira recarga está ligado, sem imprimir valor na peça.');
    hint.textContent = bits.join(' ');
  }
  paintAll();
  render();
})();
