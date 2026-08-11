/**
 * Logos oficiais dos apps (Simple Icons CDN) + fallback ilustrativo.
 */
(function (global) {
  const META = {
    whatsapp: { slug: 'whatsapp', color: '25D366', bg: '#25D366' },
    telegram: { slug: 'telegram', color: '26A5E4', bg: '#229ED9' },
    instagram: { slug: 'instagram', color: 'E4405F', bg: 'linear-gradient(135deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)' },
    facebook: { slug: 'facebook', color: '1877F2', bg: '#1877F2' },
    google: { slug: 'google', color: '4285F4', bg: '#4285F4' },
    tiktok: { slug: 'tiktok', color: '000000', bg: '#111111' },
    discord: { slug: 'discord', color: '5865F2', bg: '#5865F2' },
    kwai: { slug: null, color: 'FF4906', bg: '#FF7A00', domain: 'kwai.com' },
    ifood: { slug: null, color: 'EA1D2C', bg: '#EA1D2C', domain: 'ifood.com.br' },
    '99': { slug: null, color: 'FFDD00', bg: '#111111', domain: '99app.com', logoOnDark: true },
    rappi: { slug: null, color: 'FF441F', bg: '#FF441F', domain: 'rappi.com' },
    uber: { slug: 'uber', color: '000000', bg: '#111111' },
    'mercado livre': { slug: null, color: 'FFE600', bg: '#FFE600', domain: 'mercadolivre.com.br', dark: true },
    mercadolivre: { slug: null, color: 'FFE600', bg: '#FFE600', domain: 'mercadolivre.com.br', dark: true },
    shopee: { slug: 'shopee', color: 'EE4D2D', bg: '#EE4D2D' },
    olx: { slug: null, color: '6E0AD6', bg: '#6A2E8C', domain: 'olx.com.br' },
    steam: { slug: 'steam', color: '000000', bg: '#171A21' },
    'epic games': { slug: 'epicgames', color: '313131', bg: '#2F2D2E' },
    playstation: { slug: 'playstation', color: '003791', bg: '#003791' },
    xbox: { slug: 'xbox', color: '107C10', bg: '#107C10' },
    'free fire': { slug: null, color: 'FF6A00', bg: '#F7971D', domain: 'ff.garena.com' },
    garena: { slug: null, color: 'F7971D', bg: '#F7971D', domain: 'garena.com' },
    valorant: { slug: 'valorant', color: 'FF4655', bg: '#EB0029' },
    tinder: { slug: 'tinder', color: 'FF6B6B', bg: '#FD5068' },
    badoo: { slug: 'badoo', color: '783BF9', bg: '#783BF9' },
    bumble: { slug: 'bumble', color: 'FFC629', bg: '#FFC629', dark: true },
    netflix: { slug: 'netflix', color: 'E50914', bg: '#E50914' },
    spotify: { slug: 'spotify', color: '1DB954', bg: '#1DB954' },
    twitch: { slug: 'twitch', color: '9146FF', bg: '#9146FF' },
    twitter: { slug: 'x', color: '000000', bg: '#111111' },
    x: { slug: 'x', color: '000000', bg: '#111111' },
    snapchat: { slug: 'snapchat', color: 'FFFC00', bg: '#FFFC00', dark: true },
    pinterest: { slug: 'pinterest', color: 'E60023', bg: '#E60023' },
    linkedin: { slug: 'linkedin', color: '0A66C2', bg: '#0A66C2' },
    amazon: { slug: 'amazon', color: 'FF9900', bg: '#FF9900', dark: true },
    aliexpress: { slug: 'aliexpress', color: 'E62E04', bg: '#FF4747' },
    shein: { slug: 'shein', color: '000000', bg: '#111111' },
    indrive: { slug: null, color: 'C0F000', bg: '#93D500', domain: 'indrive.com', dark: true },
    cabify: { slug: null, color: '6E2B8B', bg: '#6E2B8B', domain: 'cabify.com' },
    buser: { slug: null, color: '6C2EB5', bg: '#6C2EB5', domain: 'buser.com.br' },
    correios: { slug: null, color: '0033A0', bg: '#0033A0', domain: 'correios.com.br' },
    binance: { slug: 'binance', color: 'F0B90B', bg: '#F0B90B', dark: true },
    'mercado bitcoin': { slug: null, color: '00B389', bg: '#00B389', domain: 'mercadobitcoin.com.br' }
  };

  function iniciais(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  function metaServico(nome) {
    const chave = String(nome || '').trim().toLowerCase();
    if (META[chave]) return Object.assign({ nome: chave }, META[chave]);
    for (const key of Object.keys(META)) {
      if (chave.includes(key)) return Object.assign({ nome: key }, META[key]);
    }
    return { slug: null, color: '2454FF', bg: '#2454FF', initial: iniciais(nome) };
  }

  function logoUrl(m) {
    if (m.slug) {
      const hex = m.dark ? '111111' : 'ffffff';
      return 'https://cdn.simpleicons.org/' + m.slug + '/' + hex;
    }
    if (m.domain) return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(m.domain) + '&sz=128';
    return null;
  }

  function iconeDoServico(nome) {
    const m = metaServico(nome);
    return {
      icone: null,
      color: '#' + (m.color || '2454FF'),
      bg: m.bg,
      sombra: m.bg,
      txt: m.dark ? '#1F1F1F' : '#fff',
      slug: m.slug,
      domain: m.domain
    };
  }

  function htmlIconeServico(nome, className) {
    const m = metaServico(nome);
    const cls = className || 'service-icon';
    const url = logoUrl(m);
    const bg = m.bg || '#2454FF';
    const sombra = (typeof bg === 'string' && bg.indexOf('gradient') === -1) ? bg : '#D62976';

    if (url) {
      const isFavicon = !m.slug;
      return `<span class="${cls}" style="background:${bg}; box-shadow:0 8px 20px -8px ${sombra}aa;">` +
        `<img class="brand-logo${isFavicon ? ' brand-logo--favicon' : ''}" src="${url}" alt="" loading="lazy" width="22" height="22">` +
        `</span>`;
    }

    const ini = m.initial || iniciais(nome);
    const color = m.dark ? '#1F1F1F' : '#fff';
    return `<span class="${cls} service-icon--initial" style="background:${bg}; color:${color}; box-shadow:0 8px 20px -8px ${sombra}aa;">${ini}</span>`;
  }

  global.metaServico = metaServico;
  global.iconeDoServico = iconeDoServico;
  global.htmlIconeServico = htmlIconeServico;
})(typeof window !== 'undefined' ? window : globalThis);
