/* ============================================================
   BizTrack Lite — MySQL connection pool & helpers
   ============================================================ */

const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  /* Allow seed.js to run the whole schema.sql in one call */
  multipleStatements: true,
  dateStrings: true /* return DATE/DATETIME as strings, avoid TZ surprises */
});

/* Run a prepared statement, return rows */
function query(sql, params) {
  return pool.execute(sql, params || []).then(function (r) { return r[0]; });
}

/* Run statements inside one transaction; fn receives a
   connection-bound exec(sql, params) and can throw to roll back */
function withTransaction(fn) {
  return pool.getConnection().then(function (conn) {
    const exec = conn.execute.bind(conn);
    return conn.beginTransaction()
      .then(function () { return fn(exec); })
      .then(function (result) { return conn.commit().then(function () { conn.release(); return result; }); })
      .catch(function (err) {
        return conn.rollback().then(function () { conn.release(); throw err; });
      });
  });
}

/* Timestamp (string or Date) → "HH:MM" */
function hhmm(value) {
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (isNaN(d)) return '';
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}

/* DATE string ("2026-09-11") → "11 Sep" for the customers table */
function shortDate(dateStr) {
  if (!dateStr) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '';
  return d.getDate() + ' ' + months[d.getMonth()];
}

/* "Saturday, 20 September 2026" */
function longDate(d) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] +
    ' ' + d.getFullYear();
}

module.exports = { pool, query, withTransaction, hhmm, shortDate, longDate };
