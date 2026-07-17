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
async function buscarPerfil() {
  const token = getToken();
  const url = API + '/user/profile';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok) { throw new Error('5SIM erro (perfil): ' + JSON.stringify(data)); }
  return data;
}
const PRODUTOS_PARA_CHECAR_ESTOQUE = ['whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok', 'discord', 'google', 'twitter'];
let _cachePaisesDisponiveis = null;
let _cachePaisesDisponiveisEm = 0;
async function listarPaisesDisponiveis() {
  const agora = Date.now();
  if (_cachePaisesDisponiveis && (agora - _cachePaisesDisponiveisEm) < 6 * 60 * 60 * 1000) {
    return _cachePaisesDisponiveis;
  }
  // 1) mapa de slug (nome do pais no 5sim) para codigo ISO
  const slugParaIso = {};
  try {
    const countriesRes = await fetch(API + '/guest/countries');
    const countriesData = await countriesRes.json();
    Object.entries(countriesData).forEach(([slug, info]) => {
      if (info && info.iso) {
        const isoCode = Object.keys(info.iso)[0];
        if (isoCode) slugParaIso[slug] = isoCode.toUpperCase();
      }
    });
  } catch (e) {}
  // 2) para cada produto que vendemos, ver quais paises tem estoque real (count>0) agora
  const slugsComEstoque = new Set();
  for (const produto of PRODUTOS_PARA_CHECAR_ESTOQUE) {
    try {
      const res = await fetch(API + '/guest/prices?product=' + produto);
      const data = await res.json();
      const bloco = data[produto];
      if (bloco) {
        Object.keys(bloco).forEach((slug) => {
          const operadoras = bloco[slug];
          if (operadoras && Object.values(operadoras).some((op) => op && op.count > 0)) {
            slugsComEstoque.add(slug);
          }
        });
      }
    } catch (e) {}
  }
  // 3) converter slugs com estoque pra codigos ISO
  const isos = new Set();
  slugsComEstoque.forEach((slug) => { if (slugParaIso[slug]) isos.add(slugParaIso[slug]); });
  _cachePaisesDisponiveis = Array.from(isos);
  _cachePaisesDisponiveisEm = agora;
  return _cachePaisesDisponiveis;
}
async function cancelarPedido(id) {
  const token = getToken();
  const url = API + '/user/cancel/' + id;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  return res.json();
}
module.exports = { buscarPreco, comprarNumero, consultarPedido, cancelarPedido, buscarPerfil, listarPaisesDisponiveis };
