function centavosParaReais(c) {
  return (c / 100).toFixed(2).replace('.', ',');
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

function achar(lista, chave) {
  var exact = lista.find(function (x) { return (x.nome || '').toLowerCase() === chave; });
  if (exact) return exact;
  return lista.find(function (x) {
    var n = (x.nome || '').toLowerCase();
    return n.indexOf(chave) !== -1 && n.indexOf('internacional') === -1;
  });
}

function renderServicos(catalogo) {
  var nomes = ['whatsapp', 'instagram', 'telegram', 'tiktok'];
  var lista = [];
  nomes.forEach(function (n) {
    var s = achar(catalogo, n);
    if (s) lista.push(s);
  });
  if (!lista.length) lista = catalogo.slice(0, 4);
  var el = document.getElementById('popular-grid');
  el.innerHTML = lista.map(function (s) {
    var preco = s.precoCentavos != null ? 'R$ ' + centavosParaReais(s.precoCentavos) : '';
    return '<button type="button" data-comprar="' + s.id + '">' +
      htmlIconeServico(s.nome, 'svc-icon') +
      '<strong>' + s.nome + '</strong>' +
      (preco ? '<span>' + preco + '</span>' : '') +
      '</button>';
  }).join('');
  el.querySelectorAll('[data-comprar]').forEach(function (btn) {
    btn.addEventListener('click', function () { irComprar(Number(btn.dataset.comprar)); });
  });
  var wa = achar(catalogo, 'whatsapp');
  if (wa) document.getElementById('live-app').textContent = wa.nome;
}

function demoLive() {
  var live = document.getElementById('live');
  var status = document.getElementById('live-status');
  var box = document.getElementById('live-box');
  function ciclo() {
    live.classList.remove('is-in');
    status.innerHTML = '<i></i> Aguardando SMS';
    box.textContent = 'Código aparecerá aqui';
    setTimeout(function () {
      status.innerHTML = '<i></i> SMS recebido';
      box.textContent = '482 931';
      live.classList.add('is-in');
    }, 2400);
  }
  ciclo();
  setInterval(ciclo, 7000);
}

if (window.simsmsTrack) window.simsmsTrack('page_view');
demoLive();

fetch('/api/catalogo').then(function (r) { return r.json(); }).then(function (data) {
  renderServicos(data.servicos || []);
}).catch(function () {});
