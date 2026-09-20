/* ============================================================
   BizTrack Lite — Node.js API & static server

   • Serves the frontend (project root) at http://localhost:3000
   • JSON API under /api:
       GET  /api/bootstrap   everything the UI needs in one call
       POST /api/sales       record a sale (stock, credit, ledger)
       POST /api/expenses    record an expense (ledger, totals)
       POST /api/payments    record a customer payment
       POST /api/reset       wipe & reseed the demo data

   Start:  npm start      (after MySQL is running and seeded)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const express = require('express');

const config = require('./config');
const db = require('./db');
const { seed } = require('./seed');

const app = express();
const ROOT = path.join(__dirname, '..');

app.use(express.json());

/* Small CORS allowance so the frontend also works when opened
   directly as a file (file://) while the API runs on :3000 */
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* Serve the frontend (index.html, css/, js/) */
app.use(express.static(ROOT, { extensions: ['html'] }));

/* ---------- helpers ---------- */

function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

const round = Math.round;

function periodSums(exec) {
  return Promise.all([
    exec(
      'SELECT COALESCE(SUM(total),0) AS v FROM sales ' +
      'WHERE YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())'
    ),
    exec(
      'SELECT COALESCE(SUM(amount),0) AS v FROM expenses ' +
      'WHERE YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())'
    )
  ]).then(function (r) {
    return { revenue: r[0][0][0].v, expenses: r[1][0][0].v };
  });
}

function ledgerRow(created_at, label, type, amount, method, category) {
  return {
    time: db.hhmm(created_at),
    label: label,
    type: type,
    amount: amount,
    method: method || undefined,
    category: category || undefined
  };
}

/* ---------- GET /api/bootstrap ---------- */

app.get('/api/bootstrap', function (req, res) {
  Promise.all([
    db.query('SELECT opening_float, sale_counter FROM settings WHERE id = 1'),
    db.query('SELECT id, name, price, stock, sold_week, low_threshold FROM products ORDER BY sort_order'),
    db.query('SELECT id, name, balance, last_payment FROM customers ORDER BY name'),
    db.query(
      "SELECT label, type, amount, method, category, created_at FROM ledger_entries " +
      "WHERE type <> 'info' AND DATE(created_at) = CURDATE() ORDER BY created_at"
    ),
    periodSums(db.query)
  ]).then(function (r) {
    const settings = r[0][0];
    if (!settings) throw new Error('Settings row missing — run: npm run seed');

    const items = r[1].map(function (p) {
      return {
        id: p.id, name: p.name, price: p.price, stock: p.stock,
        soldWeek: p.sold_week, low: p.low_threshold
      };
    });

    const customers = r[2].map(function (c) {
      return {
        id: c.id, name: c.name, balance: c.balance,
        lastPayment: c.last_payment ? db.shortDate(c.last_payment) : '—'
      };
    });

    const ledger = [{
      time: '08:00', label: 'Opening float', type: 'info',
      amount: settings.opening_float
    }].concat(r[3].map(function (e) {
      return ledgerRow(e.created_at, e.label, e.type, e.amount, e.method, e.category);
    }));

    res.json({
      server: true,
      date: db.longDate(new Date()),
      openingFloat: settings.opening_float,
      revenuePeriod: r[4].revenue,
      expensesPeriod: r[4].expenses,
      saleCounter: settings.sale_counter,
      items: items,
      customers: customers,
      ledger: ledger
    });
  }).catch(function (err) { fail(res, 500, err.message); });
});

/* ---------- POST /api/sales ---------- */
/* body: { itemId, qty, method: Cash|MoMo|Credit, customerId? } */

app.post('/api/sales', function (req, res) {
  const body = req.body || {};
  const qty = round(Number(body.qty));
  const method = body.method;
  const itemId = body.itemId;

  if (!itemId || !qty || qty < 1) return fail(res, 400, 'Item and a valid quantity are required');
  if (['Cash', 'MoMo', 'Credit'].indexOf(method) === -1) return fail(res, 400, 'Unknown payment method');
  if (method === 'Credit' && !body.customerId) return fail(res, 400, 'Credit sales need a customer');

  db.withTransaction(function (exec) {
    return exec('SELECT sale_counter FROM settings WHERE id = 1 FOR UPDATE')
      .then(function (r) {
        const number = r[0][0].sale_counter;

        return exec('SELECT id, name, price, stock, low_threshold FROM products WHERE id = ? FOR UPDATE', [itemId])
          .then(function (p) {
            const item = p[0][0];
            if (!item) throw new Error('Unknown item');
            if (qty > item.stock) throw new Error('Only ' + item.stock + ' in stock');

            const total = item.price * qty;

            return exec('UPDATE products SET stock = stock - ?, sold_week = sold_week + ? WHERE id = ?', [qty, qty, itemId])
              .then(function () {
                if (method !== 'Credit') return null;
                return exec('SELECT id, name, balance FROM customers WHERE id = ? FOR UPDATE', [body.customerId])
                  .then(function (c) {
                    const cust = c[0][0];
                    if (!cust) throw new Error('Unknown customer');
                    return exec('UPDATE customers SET balance = balance + ? WHERE id = ?', [total, cust.id])
                      .then(function () { return { id: cust.id, name: cust.name, balance: cust.balance + total }; });
                  });
              })
              .then(function (customer) {
                const label = customer ? 'Sale (credit) · ' + customer.name : 'Sale #' + number;
                const type = customer ? 'credit' : 'in';

                return exec('INSERT INTO sales (number, customer_id, method, total) VALUES (?, ?, ?, ?)',
                  [number, customer ? customer.id : null, method, total])
                  .then(function (ins) {
                    return exec('INSERT INTO sale_items (sale_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)',
                      [ins[0].insertId, itemId, qty, item.price])
                      .then(function () {
                        return exec('UPDATE settings SET sale_counter = sale_counter + 1 WHERE id = 1');
                      })
                      .then(function () {
                        return exec(
                          'INSERT INTO ledger_entries (label, type, amount, method, created_at) VALUES (?, ?, ?, ?, NOW())',
                          [label, type, total, method]
                        );
                      })
                      .then(function () {
                        return exec('SELECT stock, sold_week FROM products WHERE id = ?', [itemId]);
                      })
                      .then(function (p2) {
                        return {
                          total: total,
                          saleNumber: number,
                          item: { id: itemId, stock: p2[0][0].stock, soldWeek: p2[0][0].sold_week },
                          customer: customer ? { id: customer.id, balance: customer.balance } : null,
                          ledgerEntry: ledgerRow(new Date(), label, type, total, method)
                        };
                      });
                  });
              });
          });
      })
      .then(function (result) {
        return periodSums(exec).then(function (period) {
          result.period = period;
          return result;
        });
      });
  }).then(function (result) {
    res.json(Object.assign({ ok: true }, result));
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- POST /api/expenses ---------- */
/* body: { category, amount, note? } */

app.post('/api/expenses', function (req, res) {
  const body = req.body || {};
  const amount = round(Number(body.amount));
  const category = String(body.category || 'Other').slice(0, 40);
  const note = String(body.note || '').slice(0, 120);

  if (!amount || amount <= 0) return fail(res, 400, 'A valid amount is required');

  db.withTransaction(function (exec) {
    return exec('INSERT INTO expenses (category, amount, note) VALUES (?, ?, ?)', [category, amount, note || null])
      .then(function () {
        return exec('INSERT INTO ledger_entries (label, type, amount, category, created_at) VALUES (?, ?, ?, ?, NOW())',
          [note || category, 'out', amount, category]);
      })
      .then(function () { return periodSums(exec); })
      .then(function (period) {
        return {
          amount: amount,
          ledgerEntry: ledgerRow(new Date(), note || category, 'out', amount, undefined, category),
          period: period
        };
      });
  }).then(function (result) {
    res.json(Object.assign({ ok: true }, result));
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- POST /api/payments ---------- */
/* body: { customerId, amount, method: Cash|MoMo|Bank } */

app.post('/api/payments', function (req, res) {
  const body = req.body || {};
  const amount = round(Number(body.amount));
  const method = body.method;
  const customerId = body.customerId;

  if (!customerId) return fail(res, 400, 'A customer is required');
  if (!amount || amount <= 0) return fail(res, 400, 'A valid amount is required');
  if (['Cash', 'MoMo', 'Bank'].indexOf(method) === -1) return fail(res, 400, 'Unknown payment method');

  db.withTransaction(function (exec) {
    return exec('SELECT id, name, balance FROM customers WHERE id = ? FOR UPDATE', [customerId])
      .then(function (c) {
        const cust = c[0][0];
        if (!cust) throw new Error('Unknown customer');

        const newBalance = Math.max(0, cust.balance - amount);

        return exec('UPDATE customers SET balance = ?, last_payment = CURDATE() WHERE id = ?', [newBalance, customerId])
          .then(function () {
            return exec('INSERT INTO payments (customer_id, amount, method) VALUES (?, ?, ?)', [customerId, amount, method]);
          })
          .then(function () {
            return exec('INSERT INTO ledger_entries (label, type, amount, method, created_at) VALUES (?, ?, ?, ?, NOW())',
              ['Payment · ' + cust.name, 'in', amount, method]);
          })
          .then(function () {
            /* read on the transaction connection to see our own UPDATE */
            return exec('SELECT last_payment FROM customers WHERE id = ?', [customerId]);
          })
          .then(function (lp) {
            return {
              amount: amount,
              customer: {
                id: customerId,
                balance: newBalance,
                lastPayment: db.shortDate(lp[0][0].last_payment)
              },
              ledgerEntry: ledgerRow(new Date(), 'Payment · ' + cust.name, 'in', amount, method)
            };
          });
      });
  }).then(function (result) {
    res.json(Object.assign({ ok: true }, result));
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- POST /api/reset ---------- */

app.post('/api/reset', function (req, res) {
  seed().then(function () { res.json({ ok: true }); })
    .catch(function (err) { fail(res, 500, err.message); });
});

/* ---------- API 404 + error handling ---------- */

app.use('/api', function (req, res) { fail(res, 404, 'Unknown API endpoint'); });

app.use(function (err, req, res, next) { /* eslint-disable-line no-unused-vars */
  console.error(err);
  fail(res, 500, 'Server error');
});

/* ---------- start ---------- */

app.listen(config.port, function () {
  console.log('');
  console.log('  BizTrack Lite running →  http://localhost:' + config.port);
  console.log('  MySQL: %s@%s:%s/%s', config.db.user, config.db.host, config.db.port, config.db.database);
  console.log('');
});
