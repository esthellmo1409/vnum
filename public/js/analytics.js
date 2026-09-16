function track(evento, extra) {
  try {
    fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ evento: evento }, extra || {}))
    }).catch(function () {});
  } catch (e) {}
}
window.simsmsTrack = track;
