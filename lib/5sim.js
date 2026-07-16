const API = 'https://5sim.net/v1';
function getToken() {
  const token = process.env.SIM5_API_KEY;
  if (!token) { throw new Error('SIM5_API_KEY nao configurado.'); }
  return token;
}
async function buscarPreco(country, product) {
  const url = API + '/guest/prices?product=' + product + '&country=' + country;
  const res = await fetch(url);
  const data = await res.json();
  return data[country] ? data[country][product] : null;
}
async function comprarNumero(country, operator, product) {
  const token = getToken();
  const url = API + '/user/buy/activation/' + country + '/' + operator + '/' + product;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok) { throw new Error('5SIM erro: ' + JSON.stringify(data)); }
  return data;
}
async function consultarPedido(id) {
  const token = getToken();
  const url = API + '/user/check/' + id;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok) { throw new Error('5SIM erro: ' + JSON.stringify(data)); }
  return data;
}
async function cancelarPedido(id) {
  const token = getToken();
  const url = API + '/user/cancel/' + id;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  return res.json();
}
module.exports = { buscarPreco, comprarNumero, consultarPedido, cancelarPedido };
