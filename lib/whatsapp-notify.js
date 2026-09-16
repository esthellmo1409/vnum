// Aviso no WhatsApp do dono quando nasce um cadastro.
// Sem as variáveis no Railway, o cadastro segue normal e nada é enviado.
// CallMeBot: WHATSAPP_NOTIFY_PHONE (ex 556781730376) + CALLMEBOT_APIKEY
// Webhook genérico (n8n/Make/Evolution): WHATSAPP_NOTIFY_WEBHOOK

async function novoCliente(info) {
  const nome = String((info && info.nome) || '').slice(0, 80);
  const email = String((info && info.email) || '').slice(0, 120);
  const origem = String((info && info.origem) || 'direto').slice(0, 40);
  const ref = info && info.ref ? String(info.ref).slice(0, 32) : '';
  const texto = [
    'SimSMS — cliente novo',
    'Nome: ' + nome,
    'E-mail: ' + email,
    'Origem: ' + origem,
    ref ? 'Indicação: ' + ref : null
  ].filter(Boolean).join('\n');

  const jobs = [];
  const webhook = process.env.WHATSAPP_NOTIFY_WEBHOOK;
  if (webhook) {
    jobs.push(fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'novo_cliente', texto, nome, email, origem, ref: ref || null })
    }));
  }
  const phone = (process.env.WHATSAPP_NOTIFY_PHONE || '').replace(/\D/g, '');
  const key = process.env.CALLMEBOT_APIKEY;
  if (phone && key) {
    const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone) +
      '&text=' + encodeURIComponent(texto) +
      '&apikey=' + encodeURIComponent(key);
    jobs.push(fetch(url));
  }
  if (!jobs.length) return;
  await Promise.allSettled(jobs);
}

module.exports = { novoCliente };
