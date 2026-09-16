(function () {
  var p = new URLSearchParams(window.location.search);
  var ref = p.get('ref');
  var utm = p.get('utm_source');
  var camp = p.get('utm_campaign');
  if (ref) localStorage.setItem('simsms_ref', ref);
  if (utm) localStorage.setItem('simsms_utm', utm);
  if (camp) localStorage.setItem('simsms_camp', camp);
  function origemTrafego() {
    var u = (localStorage.getItem('simsms_utm') || '').toLowerCase();
    if (/instagram|ig/.test(u)) return 'instagram';
    if (/tiktok/.test(u)) return 'tiktok';
    if (/facebook|fb|meta/.test(u)) return 'facebook';
    if (/google|ads|gclid/.test(u)) return 'google';
    if (/whatsapp|wa/.test(u)) return 'whatsapp';
    if (localStorage.getItem('simsms_ref')) return u || 'indicacao';
    if (u) return u.slice(0, 40);
    return 'direto';
  }
  window.simsmsOrigem = function () {
    return {
      ref: localStorage.getItem('simsms_ref') || '',
      utmSource: localStorage.getItem('simsms_utm') || '',
      utmCampaign: localStorage.getItem('simsms_camp') || '',
      origemTrafego: origemTrafego()
    };
  };
  if (ref && !sessionStorage.getItem('simsms_refhit')) {
    sessionStorage.setItem('simsms_refhit', '1');
    try {
      fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento: 'affiliate_click', ref: ref, origem: origemTrafego() })
      }).catch(function () {});
    } catch (e) {}
  }
})();
