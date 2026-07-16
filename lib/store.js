// lib/store.js
// Banco de dados simples em arquivo JSON. Zero dependências externas.
// Em produção, troque isto por Postgres/MySQL — mas para rodar o site
// hoje mesmo, isto funciona sem precisar instalar nada.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const LOCK = { writing: false };

function defaultData() {
  return {
    users: [],
    slots: [],       // "chips" da chipeira (números físicos)
    services: [],    // catálogo de serviços (WhatsApp, Telegram, etc)
    orders: [],      // pedidos de número
    transactions: [],// pagamentos (pix/cartão)
    _seq: { users: 1, slots: 1, services: 1, orders: 1, transactions: 1 }
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    save(defaultData());
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('db.json corrompido, recriando a partir do zero.', e);
    save(defaultData());
    return defaultData();
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Operação atômica simples: lê, aplica a função, salva.
// Suficiente para uma demo/produção de baixo volume. Para alto volume,
// migre para um banco de verdade com transações reais.
function transact(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

function nextId(data, table) {
  const id = data._seq[table]++;
  return id;
}

module.exports = { load, save, transact, nextId, DB_PATH };
