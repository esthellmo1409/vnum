function defaultAquisicao() {
  return {
    indicacaoAtiva: true,
    comissaoIndicacaoPercent: 10,
    comissaoAfiliadoPercent: 30,
    comissaoPrimeiraCompraPercent: 30,
    comissaoRecorrente: true,
    comissaoRecorrentePercent: 10,
    comissaoSobre: 'lucro',
    comissaoModo: 'percent',
    comissaoFixaPrimeiraCentavos: 0,
    comissaoFixaRecorrenteCentavos: 0,
    saqueMinimoCentavos: 5000,
    periodoValidacaoDias: 0,
    aprovacaoObrigatoria: true,
    textoWhatsApp: 'Receba códigos SMS sem usar seu número pessoal. Pix e código no painel: ',
    textoInstagram: 'Número virtual pra WhatsApp, Instagram e Telegram. Código no painel. '
  };
}

function mergeAquisicao(raw) {
  const base = defaultAquisicao();
  const a = raw && typeof raw === 'object' ? raw : {};
  const out = Object.assign({}, base, a);
  out.indicacaoAtiva = a.indicacaoAtiva !== false;
  out.comissaoRecorrente = a.comissaoRecorrente !== false;
  out.aprovacaoObrigatoria = a.aprovacaoObrigatoria !== false;
  ['comissaoIndicacaoPercent', 'comissaoAfiliadoPercent', 'comissaoPrimeiraCompraPercent', 'comissaoRecorrentePercent'].forEach((k) => {
    out[k] = Math.max(0, Math.min(100, Number(out[k]) || 0));
  });
  out.saqueMinimoCentavos = Math.max(0, Math.round(Number(out.saqueMinimoCentavos) || 0));
  out.periodoValidacaoDias = Math.max(0, Math.round(Number(out.periodoValidacaoDias) || 0));
  out.comissaoSobre = out.comissaoSobre === 'venda' ? 'venda' : 'lucro';
  out.comissaoModo = out.comissaoModo === 'fixo' ? 'fixo' : 'percent';
  out.comissaoFixaPrimeiraCentavos = Math.max(0, Math.round(Number(out.comissaoFixaPrimeiraCentavos) || 0));
  out.comissaoFixaRecorrenteCentavos = Math.max(0, Math.round(Number(out.comissaoFixaRecorrenteCentavos) || 0));
  return out;
}

function gerarCodigo(userId) {
  return 'S' + String(userId) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function garantirCodigo(u) {
  if (!u.codigoAfiliado) {
    u.codigoAfiliado = gerarCodigo(u.id);
    if (!u.afiliadoStatus) u.afiliadoStatus = 'indicacao';
  }
  if (u.saldoComissaoCentavos == null) u.saldoComissaoCentavos = 0;
  return u.codigoAfiliado;
}

function papel(u) {
  if (!u) return 'nenhum';
  if (u.afiliadoStatus === 'bloqueado') return 'bloqueado';
  if (u.afiliadoStatus === 'pendente') return 'pendente';
  if (u.afiliadoStatus === 'indicacao') return 'indicacao';
  if (u.afiliadoStatus === 'ativo' || u.codigoAfiliado) return 'ativo';
  return 'indicacao';
}

function classificarOrigem(utmSource, ref) {
  const s = String(utmSource || '').toLowerCase();
  if (s && s !== 'direto' && s !== 'indicacao' && s !== 'afiliado') {
    if (/instagram|ig/.test(s)) return 'instagram';
    if (/tiktok/.test(s)) return 'tiktok';
    if (/facebook|fb|meta/.test(s)) return 'facebook';
    if (/google|ads|gclid/.test(s)) return 'google';
    if (/whatsapp|wa/.test(s)) return 'whatsapp';
    return s.slice(0, 40);
  }
  if (s === 'afiliado' || s === 'indicacao') return s;
  if (ref) return 'indicacao';
  return 'direto';
}

function encontrarPorRef(db, ref) {
  const codigo = String(ref || '').trim();
  if (!codigo) return null;
  return db.users.find((u) => (u.codigoAfiliado || '').toUpperCase() === codigo.toUpperCase()) || null;
}

function primeiraCompraDoUsuario(db, userId, orderId) {
  return !(db.orders || []).some((o) =>
    o.userId === userId &&
    o.id !== orderId &&
    o.status !== 'cancelado' &&
    o.status !== 'expirado'
  );
}

function aplicarComissao(db, comprador, order, cfg) {
  const aq = mergeAquisicao(cfg);
  if (!aq.indicacaoAtiva || !comprador.indicadoPor) return;
  const afiliado = db.users.find((x) => x.id === comprador.indicadoPor);
  if (!afiliado || papel(afiliado) === 'bloqueado') return;
  const p = papel(afiliado);
  if (p === 'pendente') return;
  const primeira = primeiraCompraDoUsuario(db, comprador.id, order.id);
  if (!primeira && !aq.comissaoRecorrente) return;
  if (aq.periodoValidacaoDias && comprador.criadoEm) {
    const limite = new Date(comprador.criadoEm).getTime() + aq.periodoValidacaoDias * 24 * 60 * 60 * 1000;
    if (Date.now() > limite) return;
  }
  let comissao = 0;
  if (aq.comissaoModo === 'fixo') {
    comissao = primeira ? aq.comissaoFixaPrimeiraCentavos : aq.comissaoFixaRecorrenteCentavos;
    if (p !== 'ativo') comissao = aq.comissaoFixaPrimeiraCentavos;
  } else {
    let percent = aq.comissaoIndicacaoPercent;
    if (p === 'ativo') {
      percent = primeira ? aq.comissaoPrimeiraCompraPercent : aq.comissaoRecorrentePercent;
      if (primeira && !aq.comissaoPrimeiraCompraPercent) percent = aq.comissaoAfiliadoPercent;
    }
    const base = aq.comissaoSobre === 'venda' || order.custoReaisCentavos == null
      ? (order.precoPagoCentavos || 0)
      : Math.max(0, (order.precoPagoCentavos || 0) - order.custoReaisCentavos);
    comissao = Math.round(base * (percent / 100));
  }
  if (comissao <= 0) return;
  afiliado.saldoComissaoCentavos = (afiliado.saldoComissaoCentavos || 0) + comissao;
  order.comissaoCentavos = comissao;
  order.comissaoAfiliadoId = afiliado.id;
  order.comissaoTipo = p === 'ativo' ? (primeira ? 'afiliado_primeira' : 'afiliado_recorrente') : 'indicacao';
}

function validarCupom(db, codigo, userId) {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return { ok: false, erro: 'Informe o cupom.' };
  const cupom = (db.cupons || []).find((x) => x.codigo === c);
  if (!cupom || cupom.ativo === false) return { ok: false, erro: 'Cupom inválido.' };
  if (cupom.validade && new Date(cupom.validade) < new Date()) return { ok: false, erro: 'Cupom vencido.' };
  if (cupom.usosMax && (cupom.usos || 0) >= cupom.usosMax) return { ok: false, erro: 'Cupom esgotado.' };
  if (cupom.userId && cupom.userId !== userId) return { ok: false, erro: 'Cupom de outro usuário.' };
  return { ok: true, cupom };
}

function descontoCupom(cupom, precoCentavos) {
  let d = 0;
  if (cupom.descontoPercent) d += Math.round(precoCentavos * (Number(cupom.descontoPercent) / 100));
  if (cupom.descontoCentavos) d += cupom.descontoCentavos;
  if (cupom.bonusCentavos && !cupom.descontoCentavos && !cupom.descontoPercent) d += cupom.bonusCentavos;
  return Math.min(precoCentavos - 1, Math.max(0, d));
}

function statsIndicacao(db, u, opts) {
  if (!opts || opts.criar !== false) garantirCodigo(u);
  const indicados = (db.users || []).filter((x) => x.indicadoPor === u.id);
  const vendas = (db.orders || []).filter((o) => o.comissaoAfiliadoId === u.id);
  const comPrimeira = indicados.filter((ind) =>
    (db.orders || []).some((o) => o.userId === ind.id && o.status !== 'cancelado' && o.status !== 'expirado')
  ).length;
  const pagamentos = (db.pagamentosComissao || []).filter((p) => p.userId === u.id);
  const aq = mergeAquisicao((db.configuracoes || {}).aquisicao);
  return {
    codigoAfiliado: u.codigoAfiliado || null,
    link: u.codigoAfiliado ? '/cadastro.html?ref=' + encodeURIComponent(u.codigoAfiliado) : null,
    afiliadoStatus: papel(u),
    ehAfiliado: papel(u) === 'ativo',
    pessoasIndicadas: indicados.length,
    cadastros: indicados.length,
    primeiraCompra: comPrimeira,
    comissaoGeradaCentavos: vendas.reduce((a, o) => a + (o.comissaoCentavos || 0), 0),
    saldoDisponivelCentavos: u.saldoComissaoCentavos || 0,
    saqueMinimoCentavos: aq.saqueMinimoCentavos,
    podeSacar: (u.saldoComissaoCentavos || 0) >= aq.saqueMinimoCentavos,
    historico: vendas.map((o) => ({
      servico: o.servicoNome,
      valorVendaCentavos: o.precoPagoCentavos,
      comissaoCentavos: o.comissaoCentavos,
      tipo: o.comissaoTipo || null,
      criadoEm: o.criadoEm
    })).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)),
    indicados: indicados.map((x) => ({
      nome: x.nome,
      email: x.email,
      criadoEm: x.criadoEm,
      comprou: (db.orders || []).some((o) => o.userId === x.id && o.status !== 'cancelado')
    })),
    pagamentos: pagamentos.sort((a, b) => new Date(b.em) - new Date(a.em)),
    textos: { whatsapp: aq.textoWhatsApp, instagram: aq.textoInstagram }
  };
}

function metricasMarketing(db, dias) {
  const desde = Date.now() - dias * 24 * 60 * 60 * 1000;
  const noP = (iso) => iso && new Date(iso).getTime() >= desde;
  const users = (db.users || []).filter((u) => !u.isAdmin);
  const pedidos = (db.orders || []).filter((o) => o.status !== 'cancelado');
  const txs = (db.transactions || []).filter((t) => t.status === 'aprovado');
  const eventos = db.eventos || [];
  const cadastros = users.filter((u) => noP(u.criadoEm));
  const compras = pedidos.filter((o) => noP(o.criadoEm));
  const primeiras = compras.filter((o) => primeiraCompraDoUsuario(db, o.userId, o.id));
  const faturamento = compras
    .filter((o) => o.status === 'recebido' || o.status === 'aguardando')
    .reduce((a, o) => a + (o.precoPagoCentavos || 0), 0);
  const visitas = eventos.filter((e) => e.evento === 'page_view' && noP(e.em)).length;
  const porOrigem = {};
  cadastros.forEach((u) => {
    const k = u.origemTrafego || 'direto';
    if (!porOrigem[k]) porOrigem[k] = { cadastros: 0, vendas: 0, faturamentoCentavos: 0 };
    porOrigem[k].cadastros += 1;
  });
  compras.forEach((o) => {
    const u = users.find((x) => x.id === o.userId);
    const k = o.origemTrafego || (u && u.origemTrafego) || 'direto';
    if (!porOrigem[k]) porOrigem[k] = { cadastros: 0, vendas: 0, faturamentoCentavos: 0 };
    porOrigem[k].vendas += 1;
    porOrigem[k].faturamentoCentavos += o.precoPagoCentavos || 0;
  });
  const campanhas = db.campanhas || [];
  const gasto = campanhas.filter((c) => c.ativo !== false).reduce((a, c) => a + (c.gastoCentavos || 0), 0);
  const cac = primeiras.length && gasto ? Math.round(gasto / primeiras.length) : null;
  const compradores = {};
  pedidos.forEach((o) => { compradores[o.userId] = (compradores[o.userId] || 0) + 1; });
  const recorrentes = Object.values(compradores).filter((n) => n >= 2).length;
  const afiliadosAtivos = users.filter((u) => papel(u) === 'ativo').length;
  return {
    dias,
    visitantes: visitas,
    cadastros: cadastros.length,
    primeirasCompras: primeiras.length,
    compras: compras.length,
    faturamentoCentavos: faturamento,
    conversaoCadastro: visitas ? Math.round((cadastros.length / visitas) * 1000) / 10 : null,
    conversaoCompra: cadastros.length ? Math.round((primeiras.length / cadastros.length) * 1000) / 10 : null,
    cacCentavos: cac,
    clientesRecorrentes: recorrentes,
    afiliados: afiliadosAtivos,
    vendasPorOrigem: porOrigem,
    depositosCentavos: txs.filter((t) => noP(t.criadoEm)).reduce((a, t) => a + (t.valorCentavos || 0), 0)
  };
}

module.exports = {
  defaultAquisicao,
  mergeAquisicao,
  garantirCodigo,
  papel,
  classificarOrigem,
  encontrarPorRef,
  primeiraCompraDoUsuario,
  aplicarComissao,
  validarCupom,
  descontoCupom,
  statsIndicacao,
  metricasMarketing
};
