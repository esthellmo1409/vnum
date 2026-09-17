function centavosParaReais(c) {
  return (c / 100).toFixed(2).replace('.', ',');
}

function precoLabel(s) {
  return s && s.precoCentavos != null ? 'R$ ' + centavosParaReais(s.precoCentavos) : 'Consultar';
}

function nomePais(iso) {
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(iso) || iso;
  } catch (e) {
    return iso;
  }
}

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

var CATS = ['Mais procurados', 'Redes sociais', 'Mensageiros', 'Marketplaces', 'IA', 'Delivery', 'Games', 'Outros'];
var POPULAR = ['whatsapp', 'telegram', 'google', 'instagram', 'facebook', 'tiktok'];
var MAP = { US: [118, 78], GB: [188, 62], BR: [128, 148], CA: [108, 58], DE: [208, 68], FR: [196, 74], IN: [268, 108], ES: [186, 82], PT: [178, 86], MX: [92, 108], AR: [132, 172], CL: [122, 176], CO: [114, 128], PE: [116, 148] };

var catalogo = [];
var filtroCat = 'Mais procurados';
var selecionado = null;
var paisesIso = [];

function acharServico(chave) {
  var exact = catalogo.find(function (x) { return (x.nome || '').toLowerCase() === chave; });
  if (exact) return exact;
  return catalogo.find(function (x) {
    var n = (x.nome || '').toLowerCase();
    return n.indexOf(chave) !== -1 && n.indexOf('internacional') === -1;
  }) || catalogo.find(function (x) { return (x.nome || '').toLowerCase().indexOf(chave) !== -1; });
}

function popularesDoCatalogo() {
  var achados = [];
  POPULAR.forEach(function (chave) {
    var s = acharServico(chave);
    if (s && achados.indexOf(s) === -1) achados.push(s);
  });
  if (!achados.length) achados = catalogo.slice(0, 6);
  return achados;
}

function bindComprar(root) {
  (root || document).querySelectorAll('[data-comprar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = Number(btn.dataset.comprar);
      if (window.simsmsTrack) window.simsmsTrack('service_view', { servicoId: id });
      irComprar(id);
    });
  });
}

function setSelecionado(s) {
  selecionado = s || null;
  var country = document.getElementById('panel-country');
  var price = document.getElementById('panel-price');
  var stock = document.getElementById('panel-stock');
  var buy = document.getElementById('panel-buy');
  document.querySelectorAll('#panel-popular button').forEach(function (b) {
    b.classList.toggle('on', selecionado && String(selecionado.id) === b.dataset.id);
  });
  if (!selecionado) {
    country.textContent = '—';
    price.textContent = '—';
    stock.innerHTML = '<i class="hdot"></i> —';
    buy.disabled = true;
    return;
  }
  var iso = (selecionado.pais || 'BR').toUpperCase();
  country.innerHTML = '<span class="fi fi-' + iso.toLowerCase() + '"></span> ' + nomePais(iso);
  price.textContent = precoLabel(selecionado);
  stock.innerHTML = '<i class="hdot"></i> Disponível';
  buy.disabled = false;
}

function renderPainelPills() {
  var el = document.getElementById('panel-popular');
  var lista = popularesDoCatalogo().slice(0, 5);
  el.innerHTML = lista.map(function (s) {
    return '<button type="button" data-id="' + s.id + '">' + s.nome + '</button>';
  }).join('');
  el.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var s = catalogo.find(function (x) { return String(x.id) === btn.dataset.id; });
      setSelecionado(s);
    });
  });
  if (!selecionado && lista[0]) setSelecionado(lista[0]);
}

function renderPopular() {
  var grid = document.getElementById('popular-grid');
  var lista = popularesDoCatalogo();
  if (!lista.length) {
    grid.innerHTML = '<p class="empty">Catálogo ainda sem esses serviços.</p>';
    return;
  }
  grid.innerHTML = lista.map(function (s) {
    var iso = (s.pais || 'BR').toLowerCase();
    return '<article class="hcard">' +
      '<div class="hcard-top">' + htmlIconeServico(s.nome, 'svc-icon') +
      '<div><h3>' + s.nome + '</h3><p class="hcard-meta"><span class="fi fi-' + iso + '"></span> ' + (s.pais || 'BR') + '</p></div></div>' +
      '<div class="hcard-bot"><strong>' + precoLabel(s) + '</strong><span class="hok"><i class="hdot"></i> Disponível</span>' +
      '<button type="button" class="hbtn hbtn-solid" data-comprar="' + s.id + '">Get number</button></div></article>';
  }).join('');
  bindComprar(grid);
}

function listaCatalogoFiltrada() {
  var busca = document.getElementById('busca-servico');
  var q = (busca && busca.value || '').trim().toLowerCase();
  var lista = catalogo.slice();
  if (q) return lista.filter(function (s) { return s.nome.toLowerCase().indexOf(q) !== -1; });
  if (filtroCat === 'Mais procurados') {
    var prefer = popularesDoCatalogo();
    return prefer.length ? prefer.concat(lista.filter(function (s) { return prefer.indexOf(s) === -1; })).slice(0, 12) : lista.slice(0, 12);
  }
  return lista.filter(function (s) { return (s.categoria || 'Outros') === filtroCat; });
}

function renderCatalogo() {
  var grid = document.getElementById('services-grid');
  var lista = listaCatalogoFiltrada();
  if (!lista.length) {
    grid.innerHTML = '<p class="empty">Nenhum serviço nessa busca.</p>';
    return;
  }
  grid.innerHTML = lista.map(function (s) {
    var iso = (s.pais || 'BR').toLowerCase();
    return '<article class="hcard">' +
      '<div class="hcard-top">' + htmlIconeServico(s.nome, 'svc-icon') +
      '<div><h3>' + s.nome + '</h3><p class="hcard-meta"><span class="fi fi-' + iso + '"></span> ' + (s.pais || 'BR') + (s.categoria ? ' · ' + s.categoria : '') + '</p></div></div>' +
      '<div class="hcard-bot"><strong>' + precoLabel(s) + '</strong><span class="hok"><i class="hdot"></i> Disponível</span>' +
      '<button type="button" class="hbtn hbtn-solid" data-comprar="' + s.id + '">Comprar</button></div></article>';
  }).join('');
  bindComprar(grid);
}

function renderFiltros() {
  var el = document.getElementById('cat-filters');
  el.innerHTML = CATS.map(function (c) {
    return '<button type="button" class="' + (c === filtroCat ? 'on' : '') + '" data-cat="' + c + '">' + c + '</button>';
  }).join('');
  el.querySelectorAll('[data-cat]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filtroCat = btn.dataset.cat;
      renderFiltros();
      renderCatalogo();
    });
  });
}

function renderStats(publico) {
  var nServ = catalogo.length || publico.servicosDisponiveis || 0;
  var nPais = paisesIso.length || publico.paises || 0;
  var min = catalogo.reduce(function (acc, s) {
    if (s.precoCentavos == null) return acc;
    return acc == null ? s.precoCentavos : Math.min(acc, s.precoCentavos);
  }, null);
  var items = [
    { n: nServ, l: 'Serviços' },
    { n: nPais, l: 'Países' }
  ];
  if (min != null) items.push({ t: 'R$ ' + centavosParaReais(min), l: 'A partir de' });
  if (publico.pixAutomatico) items.push({ t: 'Pix', l: 'Checkout' });
  else if (publico.taxaSucesso7d != null) items.push({ t: publico.taxaSucesso7d + '%', l: 'Entrega 7d' });
  document.getElementById('stats-grid').innerHTML = items.map(function (x) {
    if (x.n != null) return '<div class="hstat"><b data-count="' + x.n + '">0</b><span>' + x.l + '</span></div>';
    return '<div class="hstat"><b>' + x.t + '</b><span>' + x.l + '</span></div>';
  }).join('');
  var meta = nServ + ' serviços';
  if (nPais) meta += ' · ' + nPais + ' países';
  if (min != null) meta += ' · a partir de R$ ' + centavosParaReais(min);
  meta += ' · disponibilidade ao vivo';
  document.getElementById('hero-meta').textContent = meta;
  animarContadores();
}

function animarContadores() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = el.dataset.count; });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      var alvo = Number(el.dataset.count);
      var t0 = performance.now();
      function tick(now) {
        var p = Math.min(1, (now - t0) / 700);
        el.textContent = String(Math.round(alvo * p));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-count]').forEach(function (el) { io.observe(el); });
}

function renderPaises() {
  var isos = paisesIso.slice();
  if (!isos.length) {
    var set = {};
    catalogo.forEach(function (s) { set[(s.pais || 'BR').toUpperCase()] = true; });
    isos = Object.keys(set);
  }
  var prefer = ['US', 'GB', 'BR', 'CA', 'DE', 'FR', 'IN', 'ES'];
  function rank(iso) {
    var i = prefer.indexOf(iso);
    return i < 0 ? 80 : i;
  }
  isos.sort(function (a, b) { return rank(a) - rank(b); });
  var top = isos.slice(0, 8);
  document.getElementById('country-list').innerHTML = top.map(function (iso) {
    return '<li><span class="fi fi-' + iso.toLowerCase() + '"></span> ' + nomePais(iso) + '</li>';
  }).join('') || '<li>Brasil</li>';
  var dots = document.getElementById('map-dots');
  dots.innerHTML = top.map(function (iso) {
    var p = MAP[iso];
    if (!p) return '';
    return '<circle class="hpin-glow" cx="' + p[0] + '" cy="' + p[1] + '" r="10"/><circle class="hpin" cx="' + p[0] + '" cy="' + p[1] + '" r="3.5"/>';
  }).join('');
  document.getElementById('avail-list').innerHTML = (function () {
    if (!isos.length) return '<p class="empty">Estoque internacional ainda sem retorno. O catálogo segue no Brasil.</p>';
    var rows = top.map(function (iso) {
      return '<div class="hdash-row"><span><span class="fi fi-' + iso.toLowerCase() + '"></span> ' + nomePais(iso) + '</span><span class="hok"><i class="hdot"></i> Em estoque</span></div>';
    }).join('');
    var resto = isos.length - top.length;
    if (resto > 0) {
      rows += '<div class="hdash-row"><span>+ ' + resto + ' países com estoque agora</span><span class="hok">Ao vivo</span></div>';
    }
    return rows;
  })();
}

function renderApiSnippet() {
  var s = catalogo[0];
  var sample = s ? { nome: s.nome, pais: s.pais || 'BR', precoCentavos: s.precoCentavos } : {};
  document.getElementById('api-snippet').innerHTML = '<code>GET /api/catalogo\n\n{\n  "servicos": [\n    ' + JSON.stringify(sample, null, 0).replace(/,/g, ', ') + '\n  ]\n}</code>';
}

function navMobile() {
  var btn = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  btn.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { links.classList.remove('open'); });
  });
}

document.getElementById('panel-buy').addEventListener('click', function () {
  if (selecionado) irComprar(selecionado.id);
});
document.getElementById('panel-search').addEventListener('input', function () {
  var q = this.value.trim().toLowerCase();
  if (!q) return;
  var s = catalogo.find(function (x) { return x.nome.toLowerCase().indexOf(q) !== -1; });
  if (s) setSelecionado(s);
});
document.getElementById('busca-servico').addEventListener('input', renderCatalogo);

navMobile();
if (window.simsmsTrack) window.simsmsTrack('page_view');

Promise.all([
  fetch('/api/catalogo').then(function (r) { return r.json(); }),
  fetch('/api/publico').then(function (r) { return r.json(); }),
  fetch('/api/paises-5sim').then(function (r) { return r.json(); }).catch(function () { return { isos: [] }; })
]).then(function (res) {
  catalogo = (res[0] && res[0].servicos) || [];
  var publico = res[1] || {};
  paisesIso = ((res[2] && res[2].isos) || []).map(function (x) { return String(x).toUpperCase(); });
  renderPainelPills();
  renderPopular();
  renderFiltros();
  renderCatalogo();
  renderPaises();
  renderStats(publico);
  renderApiSnippet();
  if (publico.bonus && publico.bonus.ativo) {
    var box = document.getElementById('bonus-banner');
    box.hidden = false;
    document.getElementById('bonus-banner-inner').innerHTML =
      'Novo cliente — primeiro depósito a partir de R$ ' + centavosParaReais(publico.bonus.minimoDepositoCentavos) +
      ' recebe R$ ' + centavosParaReais(publico.bonus.bonusCentavos) + ' de bônus.';
  }
}).catch(function (e) {
  console.error(e);
  document.getElementById('hero-meta').textContent = 'Catálogo indisponível no momento.';
});
