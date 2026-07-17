// lib/mercadopago.js
//
// Integração com o Mercado Pago usando a API REST direto (fetch nativo do
// Node 18+), sem precisar instalar o SDK. Você só precisa de um
// Access Token (de teste ou de produção) no arquivo .env.
//
// Como conseguir o token:
//   1. Crie/entre na conta em https://www.mercadopago.com.br
//   2. Acesse "Suas integrações" > crie uma aplicação
//   3. Copie o Access Token (TEST- para testes, APP_USR- para produção)
//   4. Cole em MP_ACCESS_TOKEN no arquivo .env

const MP_API = 'https://api.mercadopago.com';

function getToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'MP_ACCESS_TOKEN não configurado. Defina no arquivo .env (veja .env.example).'
    );
  }
  return token;
}

// Cria uma cobrança Pix. Retorna o "qr code" copia-e-cola e a imagem em base64.
async function criarPagamentoPix({ valorReais, descricao, emailPagador, orderId, nomePagador, cpfPagador }) {
  const token = getToken();
  const partesNome = (nomePagador || '').trim().split(/\s+/);
  const primeiroNome = partesNome[0] || undefined;
  const sobrenome = partesNome.slice(1).join(' ') || undefined;
  const payer = { email: emailPagador };
  if (primeiroNome) payer.first_name = primeiroNome;
  if (sobrenome) payer.last_name = sobrenome;
  if (cpfPagador) payer.identification = { type: 'CPF', number: String(cpfPagador).replace(/\D/g, '') };
  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': `pix-${orderId}-${Date.now()}`
    },
    body: JSON.stringify({
      transaction_amount: Number(valorReais),
      description: descricao,
      payment_method_id: 'pix',
      payer
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Mercado Pago (Pix) erro: ${JSON.stringify(data)}`);
  }
  const txData = data.point_of_interaction?.transaction_data || {};
  return {
    paymentId: data.id,
    status: data.status,
    qrCode: txData.qr_code,
    qrCodeBase64: txData.qr_code_base64
  };
}

// Cria uma "preferência" de Checkout Pro para pagamento com cartão
// (o Checkout Pro também aceita Pix e boleto automaticamente).
// Retorna a URL (init_point) para redirecionar o cliente.
async function criarPreferenciaCheckout({ valorReais, descricao, orderId, backUrls }) {
  const token = getToken();
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      items: [
        {
          title: descricao,
          quantity: 1,
          unit_price: Number(valorReais),
          currency_id: 'BRL'
        }
      ],
      external_reference: String(orderId),
      back_urls: backUrls,
      auto_return: 'approved'
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Mercado Pago (Checkout) erro: ${JSON.stringify(data)}`);
  }
  return { preferenceId: data.id, initPoint: data.init_point };
}

// Consulta o status de um pagamento (usado pelo polling do painel e pelo webhook).
async function consultarPagamento(paymentId) {
  const token = getToken();
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Mercado Pago (consulta) erro: ${JSON.stringify(data)}`);
  }
  return data;
}

module.exports = { criarPagamentoPix, criarPreferenciaCheckout, consultarPagamento };
