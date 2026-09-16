function categoriaServico(nome) {
  const n = String(nome || '').toLowerCase();
  if (/whatsapp|telegram|signal|viber|wechat|line|messenger/.test(n)) return 'Mensageiros';
  if (/instagram|facebook|tiktok|twitter|x\b|snapchat|pinterest|linkedin|threads/.test(n)) return 'Redes sociais';
  if (/mercado.?livre|shopee|amazon|olx|aliexpress|magalu/.test(n)) return 'Marketplaces';
  if (/openai|chatgpt|claude|gemini|copilot|grok|midjourney/.test(n)) return 'IA';
  if (/ifood|rappi|uber.?eats|99food|delivery/.test(n)) return 'Delivery';
  if (/steam|xbox|playstation|epic|free fire|garena|valorant|discord|roblox/.test(n)) return 'Games';
  if (/whatsapp|instagram|telegram|tiktok|google/.test(n)) return 'Mais procurados';
  return 'Outros';
}

function defaultConfiguracoes() {
  return {
    multiplicador5sim: 5,
    margemFixaCentavos: 100,
    bonusPrimeiraRecarga: {
      ativo: false,
      minimoDepositoCentavos: 2000,
      bonusCentavos: 0,
      validadeDias: 30,
      servicosIds: []
    }
  };
}

function mergeConfiguracoes(raw) {
  const base = defaultConfiguracoes();
  const c = raw && typeof raw === 'object' ? raw : {};
  const bonus = Object.assign({}, base.bonusPrimeiraRecarga, c.bonusPrimeiraRecarga || {});
  bonus.ativo = !!bonus.ativo;
  bonus.minimoDepositoCentavos = Math.max(0, Math.round(Number(bonus.minimoDepositoCentavos) || 0));
  bonus.bonusCentavos = Math.max(0, Math.round(Number(bonus.bonusCentavos) || 0));
  bonus.validadeDias = Math.max(0, Math.round(Number(bonus.validadeDias) || 0));
  bonus.servicosIds = Array.isArray(bonus.servicosIds) ? bonus.servicosIds.map(Number).filter(Boolean) : [];
  return {
    multiplicador5sim: Number(c.multiplicador5sim) || base.multiplicador5sim,
    margemFixaCentavos: Math.round(Number(c.margemFixaCentavos)) || base.margemFixaCentavos,
    bonusPrimeiraRecarga: bonus
  };
}

function jaTeveDepositoAprovado(db, userId, ignorarTxId) {
  return (db.transactions || []).some((t) =>
    t.userId === userId &&
    t.status === 'aprovado' &&
    t.id !== ignorarTxId
  );
}

function bonusElegivel(db, user, tx) {
  const cfg = mergeConfiguracoes(db.configuracoes).bonusPrimeiraRecarga;
  if (!cfg.ativo || !cfg.bonusCentavos) return 0;
  if (tx.valorCentavos < cfg.minimoDepositoCentavos) return 0;
  if (jaTeveDepositoAprovado(db, user.id, tx.id)) return 0;
  if (cfg.validadeDias && user.criadoEm) {
    const limite = new Date(user.criadoEm).getTime() + cfg.validadeDias * 24 * 60 * 60 * 1000;
    if (Date.now() > limite) return 0;
  }
  return cfg.bonusCentavos;
}

function aplicarCreditoAprovado(db, tx) {
  const u0 = tx ? db.users.find((x) => x.id === tx.userId) : null;
  if (!tx) return { saldoCentavos: 0, bonusCentavos: 0, jaAplicado: true };
  if (tx.creditoAplicado) {
    return { saldoCentavos: u0 ? u0.saldoCentavos : 0, bonusCentavos: tx.bonusCentavos || 0, jaAplicado: true };
  }
  if (tx.status === 'aprovado') {
    tx.creditoAplicado = true;
    return { saldoCentavos: u0 ? u0.saldoCentavos : 0, bonusCentavos: tx.bonusCentavos || 0, jaAplicado: true };
  }
  const u = u0;
  if (!u) return { saldoCentavos: 0, bonusCentavos: 0, jaAplicado: false };
  u.saldoCentavos += tx.valorCentavos;
  const bonus = bonusElegivel(db, u, tx);
  if (bonus) {
    u.saldoCentavos += bonus;
    tx.bonusCentavos = bonus;
    u.bonusBoasVindasEm = new Date().toISOString();
  }
  tx.creditoAplicado = true;
  tx.status = 'aprovado';
  return { saldoCentavos: u.saldoCentavos, bonusCentavos: bonus, jaAplicado: false };
}

function snapshotPublico(db, extras) {
  const pedidos = db.orders || [];
  const users = (db.users || []).filter((u) => !u.isAdmin);
  const servicos = (db.services || []).filter((s) => s.ativo);
  const recebidos = pedidos.filter((p) => p.status === 'recebido');
  const seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const d7 = pedidos.filter((p) => new Date(p.criadoEm).getTime() >= seteDias);
  const paises = new Set();
  pedidos.forEach((p) => { if (p.pais) paises.add(p.pais); });
  (db.slots || []).forEach((s) => { if (s.pais) paises.add(s.pais); });
  if (!paises.size) paises.add('BR');
  const cfg = mergeConfiguracoes(db.configuracoes);
  const bonus = cfg.bonusPrimeiraRecarga;
  return {
    servicosDisponiveis: servicos.length,
    clientes: users.length,
    ativacoes: recebidos.length,
    paises: paises.size,
    taxaSucesso7d: d7.length ? Math.round((d7.filter((p) => p.status === 'recebido').length / d7.length) * 100) : null,
    pixAutomatico: !!(extras && extras.pixAutomatico),
    sistemaOk: true,
    bonus: bonus.ativo && bonus.bonusCentavos
      ? {
          ativo: true,
          minimoDepositoCentavos: bonus.minimoDepositoCentavos,
          bonusCentavos: bonus.bonusCentavos,
          validadeDias: bonus.validadeDias
        }
      : { ativo: false }
  };
}

function metricasConversao(db) {
  const agora = Date.now();
  const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
  const seteDias = agora - 7 * 24 * 60 * 60 * 1000;
  const pedidos = db.orders || [];
  const txs = (db.transactions || []).filter((t) => t.status === 'aprovado');
  const users = (db.users || []).filter((u) => !u.isAdmin);
  const noPeriodo = (p, desde) => new Date(p.criadoEm).getTime() >= desde;
  const hojeP = pedidos.filter((p) => noPeriodo(p, inicioDia.getTime()));
  const d7 = pedidos.filter((p) => noPeriodo(p, seteDias));
  const receita = (lista) => lista
    .filter((p) => p.status === 'recebido' || p.status === 'aguardando')
    .reduce((acc, p) => acc + (p.precoPagoCentavos != null ? p.precoPagoCentavos : 0), 0);
  const depositos7d = txs.filter((t) => noPeriodo(t, seteDias));
  const novos7d = users.filter((u) => noPeriodo(u, seteDias)).length;
  const compradores = {};
  pedidos.forEach((p) => {
    if (p.status === 'cancelado') return;
    compradores[p.userId] = (compradores[p.userId] || 0) + 1;
  });
  const recorrentes = Object.values(compradores).filter((n) => n >= 2).length;
  const porServico = {};
  const porPais = {};
  d7.forEach((p) => {
    porServico[p.servicoNome] = (porServico[p.servicoNome] || 0) + 1;
    const pais = p.pais || 'BR';
    porPais[pais] = (porPais[pais] || 0) + 1;
  });
  const top = (map) => Object.entries(map).sort((a, b) => b[1] - a[1])[0] || null;
  const eventos = db.eventos || [];
  const ev = (nome) => eventos.filter((e) => e.evento === nome && new Date(e.em).getTime() >= seteDias).length;
  const clickBuy = ev('click_buy');
  const signup = ev('signup');
  return {
    faturamento7dCentavos: receita(d7),
    faturamentoHojeCentavos: receita(hojeP),
    depositos7dCentavos: depositos7d.reduce((a, t) => a + (t.valorCentavos || 0), 0),
    depositos7d: depositos7d.length,
    ativacoes7d: d7.filter((p) => p.status === 'recebido').length,
    ticketMedio7dCentavos: d7.length ? Math.round(receita(d7) / d7.length) : 0,
    clientesNovos7d: novos7d,
    clientesRecorrentes: recorrentes,
    conversaoSignupClick7d: clickBuy ? Math.round((signup / clickBuy) * 100) : null,
    servicoMaisVendido: top(porServico),
    paisMaisUsado: top(porPais),
    funil7d: {
      page_view: ev('page_view'),
      service_view: ev('service_view'),
      click_buy: clickBuy,
      signup,
      pix_started: ev('pix_started'),
      pix_paid: ev('pix_paid'),
      activation_started: ev('activation_started'),
      sms_received: ev('sms_received'),
      second_purchase: ev('second_purchase')
    }
  };
}

module.exports = {
  categoriaServico,
  defaultConfiguracoes,
  mergeConfiguracoes,
  aplicarCreditoAprovado,
  snapshotPublico,
  metricasConversao
};
