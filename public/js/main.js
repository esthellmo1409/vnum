function centavosParaReais(c) { return (c / 100).toFixed(2).replace('.', ','); }

async function carregarCatalogo() {
  try {
    const res = await fetch('/api/catalogo');
    const data = await res.json();
    const grid = document.getElementById('services-grid');
    if (grid) {
      grid.innerHTML = data.servicos.map(s => `
        <div class="service-card">
          <div class="service-head">
            ${htmlIconeServico(s.nome, 'service-icon')}
            <h3>${s.nome}</h3>
          </div>
          <div class="price">R$ ${centavosParaReais(s.precoCentavos)}</div>
        </div>
      `).join('');
    }

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
