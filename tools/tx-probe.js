/* Probe: does db.withTransaction + exec (connection.execute) settle? */
const db = require('../server/db');
const t0 = Date.now();
const log = (m) => console.log(Date.now() - t0 + 'ms', m);

db.withTransaction(function (exec) {
  log('in transaction');
  return exec('SELECT id FROM products WHERE id = ?', ['matches']).then(function (f) {
    log('select done, rows=' + f[0].length);
    return exec('UPDATE settings SET sale_counter = sale_counter WHERE id = 1').then(function () {
      log('update done');
      return exec('SELECT 1 AS one').then(function (g) {
        log('second select done, v=' + g[0][0].one);
      });
    });
  });
}).then(function () {
  log('tx committed OK');
  process.exit(0);
}).catch(function (e) {
  log('tx FAILED: ' + e.message);
  process.exit(1);
});

setTimeout(function () { log('TIMEOUT — promise never settled'); process.exit(2); }, 10000);
