// Integracao com a API do SMS-Man (https://sms-man.com/api)

const BASE_URL = 'https://api.sms-man.com/control';
const TOKEN = process.env.SMSMAN_API_KEY;

function montarUrl(acao, params = {}) {
  const url = new URL(`${BASE_URL}/${acao}`);
  url.searchParams.set('token', TOKEN);
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null) {
      url.searchParams.set(chave, valor);
    }
  }
  return url.toString();
}

async function chamarApi(acao, params = {}) {
  if (!TOKEN) {
    throw new Error('SMSMAN_API_KEY nao configurado nas variaveis de ambiente');
  }
  const resposta = await fetch(montarUrl(acao, params));
  const dados = await resposta.json();
  if (dados && dados.success === false) {
    const erro = new Error(dados.error_msg || dados.error_code || 'Erro desconhecido na API SMS-Man');
    erro.codigo = dados.error_code;
    throw erro;
  }
  return dados;
}

async function obterSaldo() {
  const dados = await chamarApi('get-balance');
  return parseFloat(dados.balance);
}

async function listarPaises() {
  return chamarApi('countries');
}

async function listarServicos() {
  return chamarApi('applications');
}

async function buscarPreco(countryId, applicationId) {
  const dados = await chamarApi('get-prices', { country_id: countryId, application_id: applicationId });

  if (applicationId !== undefined) {
    const item = dados[applicationId] || dados[String(applicationId)];
    if (!item) return null;
    return {
      custo: parseFloat(item.cost),
      estoque: item.count
    };
  }
  return dados;
}

async function comprarNumero(countryId, applicationId, opcoes = {}) {
  const dados = await chamarApi('get-number', {
    country_id: countryId,
    application_id: applicationId,
    maxPrice: opcoes.maxPrice,
    currency: opcoes.currency
  });
  return {
    requestId: dados.request_id,
    countryId: dados.country_id,
    applicationId: dados.application_id,
    numero: dados.number
  };
}

async function consultarSms(requestId) {
  const dados = await chamarApi('get-sms', { request_id: requestId });
  if (dados.error_code === 'wait_sms') {
    return { aguardando: true, numero: dados.number };
  }
  return {
    aguardando: false,
    numero: dados.number,
    codigo: dados.sms_code
  };
}

async function mudarStatus(requestId, status) {
  const dados = await chamarApi('set-status', { request_id: requestId, status });
  return dados.success === true;
}

async function cancelarNumero(requestId) {
  return mudarStatus(requestId, 'reject');
}

async function finalizarNumero(requestId) {
  return mudarStatus(requestId, 'used');
}

module.exports = {
  obterSaldo,
  listarPaises,
  listarServicos,
  buscarPreco,
  comprarNumero,
  consultarSms,
  cancelarNumero,
  finalizarNumero
};
