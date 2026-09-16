function track(evento, extra) {
  try {
    var o = window.simsmsOrigem ? window.simsmsOrigem() : {};
    fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        evento: evento,
        origem: o.origemTrafego || null,
        ref: o.ref || null,
        visitorId: localStorage.getItem('simsms_vid') || null
      }, extra || {}))
    }).catch(function () {});
  } catch (e) {}
}
window.simsmsTrack = track;
(function () {
  if (!localStorage.getItem('simsms_vid')) {
    localStorage.setItem('simsms_vid', 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  }
  track('page_view');
})();
