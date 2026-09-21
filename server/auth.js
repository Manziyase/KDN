/* ============================================================
   BizTrack Lite — authentication & sessions

   • Passwords hashed with PBKDF2-SHA512 (150k iterations) +
     per-user random salt; verified in constant time.
   • Sessions are random 32-byte tokens stored in MySQL
     (server/sessions table) and carried by an HttpOnly cookie.
   • No external dependencies — uses Node's crypto module.
   ============================================================ */

const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

const SECRET = config.sessionSecret;
const SESSION_DAYS = 30;
const COOKIE = 'bt_session';

/* ---------- password hashing ---------- */

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt + SECRET, 150000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) return false;
  const check = hashPassword(password, parts[0]);
  /* constant-time compare */
  const a = Buffer.from(check);
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- validation ---------- */

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''));
}

/* ---------- cookies ---------- */

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  header.split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sessionCookie(token, days) {
  return COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Lax' +
    '; Max-Age=' + Math.round(days * 86400);
}

function clearCookie() {
  return COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

/* ---------- password reset tokens ---------- */

const RESET_MINUTES = 30;

function createResetToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  return db.query(
    'INSERT INTO password_resets (token, user_id, expires_at) ' +
    'VALUES (?, ?, NOW() + INTERVAL ' + RESET_MINUTES + ' MINUTE)', [token, userId]
  ).then(function () { return token; });
}

/* ---------- session store (MySQL) ---------- */

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  return db.query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ? DAY)',
    [token, userId, SESSION_DAYS]
  ).then(function () { return token; });
}

function destroySession(token) {
  if (!token) return Promise.resolve();
  return db.query('DELETE FROM sessions WHERE token = ?', [token]);
}

/* Resolve the logged-in user from the request, or null.
   Also opportunistically deletes expired sessions. */
function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return Promise.resolve(null);
  return db.query(
    'SELECT u.id, u.name, u.email, u.role, u.currency, u.language, u.theme, u.accent ' +
    'FROM sessions s JOIN users u ON u.id = s.user_id ' +
    'WHERE s.token = ? AND s.expires_at > NOW()', [token]
  ).then(function (rows) {
    if (rows.length) return rows[0];
    return destroySession(token).then(function () { return null; });
  }).catch(function () { return null; });
}

module.exports = {
  COOKIE: COOKIE,
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  validEmail: validEmail,
  parseCookies: parseCookies,
  sessionCookie: sessionCookie,
  clearCookie: clearCookie,
  createSession: createSession,
  destroySession: destroySession,
  currentUser: currentUser,
  createResetToken: createResetToken
};
