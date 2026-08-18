// lib/auth.js
const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  if (!hash || hash.length !== check.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, verifyPassword, newToken };
