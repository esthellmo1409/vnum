/**
 * Ícones de serviço — estilo sóbrio (cor da marca no glyph, fundo neutro).
 * Usado na landing, dashboard e admin.
 */
(function (global) {
  const META = {
    whatsapp: { icon: 'ti-brand-whatsapp', color: '#128C7E' },
    telegram: { icon: 'ti-brand-telegram', color: '#229ED9' },
    instagram: { icon: 'ti-brand-instagram', color: '#C13584' },
    facebook: { icon: 'ti-brand-facebook', color: '#1877F2' },
    google: { icon: 'ti-brand-google', color: '#4285F4' },
    tiktok: { icon: 'ti-brand-tiktok', color: '#111111' },
    discord: { icon: 'ti-brand-discord', color: '#5865F2' },
    kwai: { icon: 'ti-video', color: '#FF7A00' },
    ifood: { icon: 'ti-truck-delivery', color: '#EA1D2C' },
    '99': { icon: 'ti-car', color: '#111111' },
    rappi: { icon: 'ti-shopping-bag', color: '#FF441F' },
    uber: { icon: 'ti-car', color: '#111111' },
    'mercado livre': { icon: 'ti-shopping-bag', color: '#FFE600' },
    mercadolivre: { icon: 'ti-shopping-bag', color: '#FFE600' },
    shopee: { icon: 'ti-brand-shopee', color: '#EE4D2D' },
    olx: { icon: 'ti-building-store', color: '#6A2E8C' },
    steam: { icon: 'ti-brand-steam', color: '#171A21' },
    'epic games': { icon: 'ti-device-gamepad-2', color: '#2F2D2E' },
    playstation: { icon: 'ti-brand-playstation', color: '#003791' },
    xbox: { icon: 'ti-brand-xbox', color: '#107C10' },
    'free fire': { icon: 'ti-device-gamepad-2', color: '#E67E22' },
    garena: { icon: 'ti-device-gamepad-2', color: '#E67E22' },
    valorant: { icon: 'ti-device-gamepad-2', color: '#EB0029' },
    tinder: { icon: 'ti-brand-tinder', color: '#FD5068' },
    badoo: { icon: 'ti-heart', color: '#783BF9' },
    bumble: { icon: 'ti-heart', color: '#F5A623' },
    netflix: { icon: 'ti-brand-netflix', color: '#E50914' },
    spotify: { icon: 'ti-brand-spotify', color: '#1DB954' },
    twitch: { icon: 'ti-brand-twitch', color: '#9146FF' },
    twitter: { icon: 'ti-brand-x', color: '#111111' },
    x: { icon: 'ti-brand-x', color: '#111111' },
    snapchat: { icon: 'ti-brand-snapchat', color: '#C7B800' },
    pinterest: { icon: 'ti-brand-pinterest', color: '#E60023' },
    linkedin: { icon: 'ti-brand-linkedin', color: '#0A66C2' },
    amazon: { icon: 'ti-brand-amazon', color: '#FF9900' },
    aliexpress: { icon: 'ti-package', color: '#E62E04' },
    shein: { icon: 'ti-hanger', color: '#111111' },
    indrive: { icon: 'ti-car', color: '#7CB518' },
    cabify: { icon: 'ti-car', color: '#6E2B8B' },
    buser: { icon: 'ti-bus', color: '#6C2EB5' },
    correios: { icon: 'ti-package', color: '#0033A0' },
    binance: { icon: 'ti-currency-bitcoin', color: '#F0B90B' },
    'mercado bitcoin': { icon: 'ti-coin', color: '#00B389' }
  };

  function iniciais(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  function metaServico(nome) {
    const chave = String(nome || '').trim().toLowerCase();
    if (META[chave]) return META[chave];
    for (const key of Object.keys(META)) {
      if (chave.includes(key)) return META[key];
    }
    return { icon: null, color: '#2454FF', initial: iniciais(nome) };
  }

  /** Compatível com código antigo que lia { icone, bg, txt }. */
  function iconeDoServico(nome) {
    const m = metaServico(nome);
    return {
      icone: m.icon || 'ti-device-mobile',
      color: m.color,
      initial: m.initial || iniciais(nome),
      // legado — fundo sempre neutro no CSS novo
      bg: 'transparent',
      sombra: 'transparent',
      txt: m.color
    };
  }

  function htmlIconeServico(nome, className) {
    const m = metaServico(nome);
    const cls = className || 'service-icon';
    if (m.icon) {
      return `<span class="${cls}" style="--icon-color:${m.color}"><i class="ti ${m.icon}" aria-hidden="true"></i></span>`;
    }
    return `<span class="${cls} service-icon--initial" style="--icon-color:${m.color}">${m.initial || iniciais(nome)}</span>`;
  }

  global.metaServico = metaServico;
  global.iconeDoServico = iconeDoServico;
  global.htmlIconeServico = htmlIconeServico;
})(typeof window !== 'undefined' ? window : globalThis);
