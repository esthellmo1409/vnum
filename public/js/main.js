function centavosParaReais(c) { return (c / 100).toFixed(2).replace('.', ','); }

// Mesmo mapeamento de ícones usado no painel do cliente e no admin.
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

async function carregarCatalogo() {
  try {
    const res = await fetch('/api/catalogo');
    const data = await res.json();
    const grid = document.getElementById('services-grid');
    if (grid) {
      grid.innerHTML = data.servicos.map(s => {
        const { icone, bg, sombra, txt } = iconeDoServico(s.nome);
        return `
        <div class="service-card">
          <div class="service-head">
            <div class="service-icon" style="background:${bg}; box-shadow:0 6px 16px -6px ${sombra}99; color:${txt || '#fff'};"><i class="ti ${icone}" aria-hidden="true"></i></div>
            <h3>${s.nome}</h3>
          </div>
          <div class="price">R$ ${centavosParaReais(s.precoCentavos)}</div>
        </div>
      `;
      }).join('');
    }

    // Preenche os precos ao vivo dos cards de destaque (WhatsApp, Instagram, TikTok)
    const mapaDestaques = { 'preco-destaque-whatsapp': 'whatsapp', 'preco-destaque-instagram': 'instagram', 'preco-destaque-tiktok': 'tiktok' };
    for (const idEl in mapaDestaques) {
      const elDestaque = document.getElementById(idEl);
      if (!elDestaque) continue;
      const nomeAlvo = mapaDestaques[idEl];
      const servicoDestaque = data.servicos.find(s => s.nome.trim().toLowerCase() === nomeAlvo);
      if (!servicoDestaque) { elDestaque.textContent = 'Indisponível'; continue; }
      try {
        const rDestaque = await fetch('/api/precos/internacional?pais=BR&servico=' + encodeURIComponent(servicoDestaque.nome));
        const pdDestaque = await rDestaque.json();
        elDestaque.textContent = pdDestaque && pdDestaque.precoCentavos != null ? 'R$ ' + centavosParaReais(pdDestaque.precoCentavos) : 'R$ ' + centavosParaReais(servicoDestaque.precoCentavos);
      } catch (eDestaque) {
        elDestaque.textContent = 'R$ ' + centavosParaReais(servicoDestaque.precoCentavos);
      }
    }
  } catch (e) {
    console.error('Erro ao carregar catálogo:', e);
  }
}

carregarCatalogo();
