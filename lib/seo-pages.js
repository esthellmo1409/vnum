const PAGES = {
  '/numero-virtual': {
    title: 'Número virtual para SMS | SimSMS',
    description: 'Compre número virtual no Brasil, pague no Pix e receba o código de ativação no painel. Sem chip físico e sem mensalidade.',
    h1: 'Número virtual para receber SMS',
    lead: 'Use um número temporário só para a ativação. O SMS cai no painel; você copia o código e segue.',
    body: '<p>Número virtual é um número reservado para você receber um SMS de verificação — WhatsApp, Instagram, Telegram e outros apps. Você não compra chip, não assina plano e não mistura isso com o seu celular pessoal.</p><p>No SimSMS o fluxo é direto: escolhe o serviço, paga o saldo no Pix, reserva o número e espera o código na mesma tela.</p>'
  },
  '/numero-virtual-instagram': {
    title: 'Número virtual para Instagram | SimSMS',
    description: 'Ative ou recupere o Instagram com número virtual. Pix, código no painel e cancelamento com saldo de volta se o SMS não chegar.',
    h1: 'Número virtual para Instagram',
    lead: 'Receba o SMS de confirmação do Instagram sem usar o seu chip.',
    body: '<p>O Instagram pede um número na criação de conta, no login em dispositivo novo e na recuperação. Um número virtual resolve isso sem expor o seu pessoal.</p><p>Escolha Instagram no catálogo, confira o preço em reais e compre. Quando o SMS chegar, copie o código e cole no app.</p>'
  },
  '/numero-virtual-whatsapp': {
    title: 'Número virtual para WhatsApp | SimSMS',
    description: 'Número virtual brasileiro para ativar WhatsApp. Pagamento no Pix e código de SMS no painel do SimSMS.',
    h1: 'Número virtual para WhatsApp',
    lead: 'Ative o WhatsApp com um número reservado na hora, sem comprar chip na loja.',
    body: '<p>A ativação do WhatsApp exige um SMS com código. O SimSMS reserva um número, você cadastra esse número no app e o código aparece no painel.</p><p>Há opção de DDD brasileiro quando o estoque permitir. Se o SMS não chegar no prazo, cancele e o valor volta para o saldo.</p>'
  },
  '/numero-virtual-telegram': {
    title: 'Número virtual para Telegram | SimSMS',
    description: 'Receba o código do Telegram em número virtual. Pix instantâneo e painel para copiar o SMS.',
    h1: 'Número virtual para Telegram',
    lead: 'Cadastre o Telegram com um número temporário e copie o código assim que o SMS chegar.',
    body: '<p>O Telegram confirma o login por SMS. Com número virtual você não precisa do chip físico na mão — o código entra no SimSMS.</p><p>Escolha Telegram, veja o preço atual e clique em comprar. A tela mostra o número reservado e o status de espera.</p>'
  },
  '/numero-virtual-tiktok': {
    title: 'Número virtual para TikTok | SimSMS',
    description: 'Número virtual para verificar o TikTok. Pague no Pix e receba o SMS de ativação no painel.',
    h1: 'Número virtual para TikTok',
    lead: 'Verifique o TikTok com um número que não é o do seu chip pessoal.',
    body: '<p>O TikTok pede SMS em cadastro e em checagens de segurança. O número virtual serve só para essa etapa.</p><p>No catálogo, filtre por TikTok, confira disponibilidade e preço, e compre. O código aparece destacado para copiar.</p>'
  },
  '/receber-sms-online': {
    title: 'Receber SMS online | SimSMS',
    description: 'Receba SMS de ativação online, no navegador. Número virtual, Pix e código no painel — sem aplicativo extra.',
    h1: 'Receber SMS online',
    lead: 'O SMS de verificação chega no painel web. Você não precisa de outro celular.',
    body: '<p>Receber SMS online significa acompanhar a mensagem no computador ou no próprio celular, numa tela de pedido — não num chip que você não controla.</p><p>Depois do Pix, o SimSMS mostra o número, o tempo restante e o código quando a operadora entregar o SMS.</p>'
  },
  '/numero-virtual-brasil': {
    title: 'Número virtual Brasil (+55) | SimSMS',
    description: 'Número virtual brasileiro para SMS de apps. DDI +55, pagamento no Pix e código no painel.',
    h1: 'Número virtual Brasil',
    lead: 'Números +55 para apps que exigem DDD brasileiro na verificação.',
    body: '<p>Muitos serviços só aceitam número brasileiro. O catálogo do SimSMS parte do Brasil e mostra preço em reais quando há estoque.</p><p>WhatsApp, bancos digitais, marketplaces e redes sociais costumam pedir +55. Escolha o app, pague o saldo e reserve o número.</p>'
  }
};

function render(pathname) {
  const p = PAGES[pathname];
  if (!p) return null;
  const related = Object.entries(PAGES)
    .filter(([k]) => k !== pathname)
    .map(([k, v]) => `<li><a href="${k}">${v.h1}</a></li>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.title}</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="https://www.simsms.com.br${pathname}">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="topbar"><div class="topbar-inner">
  <a href="/" class="brand"><span class="brand-mark">SS</span> SimSMS Virtual</a>
  <div class="nav-actions">
    <a href="/login.html" class="btn btn-ghost btn-sm">Entrar</a>
    <a href="/cadastro.html" class="btn btn-primary btn-sm">Criar conta</a>
  </div>
</div></header>
<section class="hero" style="padding:48px 0 24px"><div class="container" style="max-width:720px">
  <p class="eyebrow">SimSMS Virtual</p>
  <h1>${p.h1}</h1>
  <p class="lead">${p.lead}</p>
  <div class="hero-ctas">
    <a href="/#catalogo" class="btn btn-teal">Comprar número agora</a>
    <a href="/cadastro.html" class="btn btn-ghost">Criar conta</a>
  </div>
</div></section>
<section><div class="container seo-article">${p.body}
  <p class="seo-cta-inline">Se o SMS não chegar no prazo, cancele o pedido e o valor volta para o saldo.</p>
  <h2>Outros números virtuais</h2>
  <ul class="seo-related">${related}</ul>
</div></section>
<footer><div class="container"><span>© 2026 SimSMS Virtual</span><a href="/">Início</a></div></footer>
</body></html>`;
}

module.exports = { PAGES, render };
