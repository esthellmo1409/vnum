function centavosParaReais(c) { return (c / 100).toFixed(2).replace('.', ','); }

const CATS = ['Mais procurados', 'Redes sociais', 'Mensageiros', 'Marketplaces', 'IA', 'Delivery', 'Games', 'Outros'];
let catalogo = [];
let filtroCat = 'Mais procurados';

function irComprar(servicoId) {
  if (window.simsmsTrack) window.simsmsTrack('click_buy', { servicoId: servicoId });
  var o = window.simsmsOrigem ? window.simsmsOrigem() : {};
  var refQ = o.ref ? '&ref=' + encodeURIComponent(o.ref) : '';
  fetch('/api/auth/eu').then(function (r) { return r.json(); }).then(function (data) {
    if (data && data.usuario) {
      window.location.href = '/dashboard.html?comprar=' + encodeURIComponent(servicoId);
    } else {
      window.location.href = '/cadastro.html?next=/dashboard.html%3Fcomprar%3D' + encodeURIComponent(servicoId) + '&servico=' + encodeURIComponent(servicoId) + refQ;
    }
  }).catch(function () {
    window.location.href = '/cadastro.html?servico=' + encodeURIComponent(servicoId) + refQ;
  });
}

function renderCatalogo() {
  const grid = document.getElementById('services-grid');
  const q = (document.getElementById('busca-servico').value || '').trim().toLowerCase();
  let lista = catalogo.slice();
  if (q) {
    lista = lista.filter(function (s) { return s.nome.toLowerCase().indexOf(q) !== -1; });
  } else if (filtroCat === 'Mais procurados') {
    const prefer = ['whatsapp', 'instagram', 'telegram', 'tiktok', 'google', 'facebook'];
    lista = lista.filter(function (s) {
      const n = s.nome.toLowerCase();
      return prefer.some(function (p) { return n.indexOf(p) !== -1; });
    });
    if (!lista.length) lista = catalogo.slice(0, 12);
  } else {
    lista = lista.filter(function (s) { return (s.categoria || 'Outros') === filtroCat; });
  }
  if (!lista.length) {
    grid.innerHTML = '<p class="empty-state">Nenhum serviço nessa busca. Tente outro nome.</p>';
    return;
  }
  grid.innerHTML = lista.map(function (s) {
    const preco = s.precoCentavos != null ? 'R$ ' + centavosParaReais(s.precoCentavos) : 'Consultar';
    const pais = s.pais || 'BR';
    return '<article class="svc-card">' +
      '<div class="svc-card-top">' + htmlIconeServico(s.nome, 'svc-icon') +
      '<div><h3>' + s.nome + '</h3><p class="svc-meta"><span class="fi fi-' + pais.toLowerCase() + '"></span> ' + pais + ' · ' + (s.categoria || '') + '</p></div></div>' +
      '<div class="svc-card-bottom">' +
      '<strong>' + preco + '</strong>' +
      '<span class="tag recebido">Disponível</span>' +
      '<button type="button" class="btn btn-teal btn-sm" data-comprar="' + s.id + '">Comprar</button>' +
      '</div></article>';
  }).join('');
  grid.querySelectorAll('[data-comprar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (window.simsmsTrack) window.simsmsTrack('service_view', { servicoId: Number(btn.dataset.comprar) });
      irComprar(Number(btn.dataset.comprar));
    });
  });
}

function renderFiltros() {
  const el = document.getElementById('cat-filters');
  el.innerHTML = CATS.map(function (c) {
    return '<button type="button" class="cat-chip' + (c === filtroCat ? ' on' : '') + '" data-cat="' + c + '">' + c + '</button>';
  }).join('');
  el.querySelectorAll('[data-cat]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filtroCat = btn.dataset.cat;
      renderFiltros();
      renderCatalogo();
    });
  });
}

async function carregarCatalogo() {
  try {
    const res = await fetch('/api/catalogo');
    const data = await res.json();
    catalogo = data.servicos || [];
    renderFiltros();
    renderCatalogo();
    var wa = catalogo.find(function (s) {
      var n = (s.nome || '').toLowerCase();
      return n.indexOf('whatsapp') !== -1 && n.indexOf('internacional') === -1;
    });
    if (wa && document.getElementById('act-app')) document.getElementById('act-app').textContent = wa.nome;
    const busca = document.getElementById('busca-servico');
    if (busca) busca.addEventListener('input', renderCatalogo);
  } catch (e) {
    console.error('Erro ao carregar catálogo:', e);
  }
}

async function carregarPublico() {
  try {
    const res = await fetch('/api/publico');
    const p = await res.json();
    const live = document.getElementById('live-status');
    const linhas = [];
    linhas.push('<li><span class="ok-dot"></span> Sistema operacional</li>');
    if (p.pixAutomatico) linhas.push('<li><span class="ok-dot"></span> PIX automático</li>');
    if (p.servicosDisponiveis) linhas.push('<li><span class="ok-dot"></span> ' + p.servicosDisponiveis + ' serviços no catálogo</li>');
    live.innerHTML = linhas.join('');

    const prova = [];
    if (p.ativacoes) prova.push(['Ativações concluídas', p.ativacoes]);
    if (p.clientes) prova.push(['Clientes cadastrados', p.clientes]);
    if (p.servicosDisponiveis) prova.push(['Serviços', p.servicosDisponiveis]);
    if (p.paises) prova.push(['Países com movimento', p.paises]);
    if (p.taxaSucesso7d != null) prova.push(['Entrega (7 dias)', p.taxaSucesso7d + '%']);
    if (prova.length) {
      document.getElementById('prova').hidden = false;
      document.getElementById('prova-grid').innerHTML = prova.map(function (item) {
        return '<div class="metric-card"><div class="label">' + item[0] + '</div><div class="value">' + item[1] + '</div></div>';
      }).join('');
    }

    if (p.bonus && p.bonus.ativo) {
      const box = document.getElementById('bonus-banner');
      box.hidden = false;
      document.getElementById('bonus-banner-inner').innerHTML =
        '<strong>Novo cliente</strong> — primeiro depósito a partir de R$ ' +
        centavosParaReais(p.bonus.minimoDepositoCentavos) +
        ' recebe R$ ' + centavosParaReais(p.bonus.bonusCentavos) +
        ' de bônus. Configurado no admin.';
    }
  } catch (e) {}
}

function demoAtivacao() {
  var card = document.getElementById('act-card');
  var status = document.getElementById('act-status');
  var box = document.getElementById('act-box');
  if (!card) return;
  function ciclo() {
    card.classList.remove('is-in');
    status.innerHTML = '<i></i> Aguardando SMS';
    box.textContent = 'Código aparecerá aqui';
    setTimeout(function () {
      status.innerHTML = '<i></i> SMS recebido';
      box.textContent = '482 931';
      card.classList.add('is-in');
    }, 2400);
  }
  ciclo();
  setInterval(ciclo, 7000);
}

function nomePais(iso) {
  try { return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(iso) || iso; }
  catch (e) { return iso; }
}

function preencherPaises(isos) {
  var prefer = ['BR', 'US', 'GB', 'CA', 'ES', 'FR', 'DE', 'IT', 'PT', 'MX', 'AR', 'JP', 'IN', 'AU'];
  var lista = prefer.filter(function (i) { return !isos.length || isos.indexOf(i) !== -1; });
  if (isos.length) {
    isos.forEach(function (i) { if (lista.indexOf(i) === -1 && lista.length < 18) lista.push(i); });
  }
  var track = document.getElementById('flag-track');
  if (track) {
    var html = lista.map(function (iso) {
      return '<span><span class="fi fi-' + iso.toLowerCase() + '"></span> ' + nomePais(iso) + '</span>';
    }).join('');
    track.innerHTML = html + html;
  }
  var line = document.getElementById('world-line');
  if (line) {
    if (isos.length) {
      line.textContent = 'Um DDI de cada canto: números de ' + isos.length + ' países no estoque agora.';
    } else {
      line.textContent = 'O DDI que o app pede — Brasil e o mundo, no mesmo painel.';
    }
  }
}

if (window.simsmsTrack) window.simsmsTrack('page_view');
demoAtivacao();
carregarCatalogo();
carregarPublico();
fetch('/api/paises-5sim').then(function (r) { return r.json(); }).then(function (d) {
  var isos = (d.isos || []).map(function (x) { return String(x).toUpperCase(); });
  preencherPaises(isos);
}).catch(function () { preencherPaises([]); });
