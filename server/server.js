/* ============================================================
   BizTrack Lite — Node.js API & static server

   • Serves the frontend (project root) at http://localhost:3000
   • JSON API under /api:
       GET  /api/bootstrap              everything the UI needs in one call
       POST /api/sales                  record a sale (stock, credit, ledger)
       POST /api/expenses               record an expense (ledger, boxes)
       POST /api/payments               record a customer payment
       POST /api/products               add a product (optionally buys stock)
       POST /api/products/:id/restock   add stock to an existing product
       POST /api/boxes/transfer         move money between cash/bank/momo
       POST /api/auth/signup            create an account (auto sign-in)
       POST /api/auth/login             sign in
       POST /api/auth/logout            sign out
       GET  /api/auth/me                current session user
       POST /api/auth/profile           edit profile (name, phone, shop, password)
       POST /api/prefs                  save currency / language / theme / accent
       POST /api/reset                  wipe & reseed the demo data

   Start:  npm start      (after MySQL is running and seeded)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const express = require('express');

const config = require('./config');
const db = require('./db');
const auth = require('./auth');
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

/* ============================================================
   Authentication  (signup / login / logout / me / profile)
   ============================================================ */

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    phone: u.phone || '',
    shopName: u.shop_name || 'BizTrack Shop',
    prefs: { currency: u.currency, language: u.language, theme: u.theme, accent: u.accent }
  };
}

/* ---------- POST /api/auth/signup ---------- */

app.post('/api/auth/signup', function (req, res) {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  const password = String(body.password || '');
  const shopName = String(body.shopName || '').trim().slice(0, 80);

  Promise.resolve().then(function () {
    if (name.length < 2) throw new Error('Please enter your name');
    if (!auth.validEmail(email)) throw new Error('Please enter a valid email address');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    return db.query('SELECT id FROM users WHERE email = ?', [email]);
  }).then(function (found) {
    if (found.length) throw new Error('An account with this email already exists');
    return db.query(
      'INSERT INTO users (name, email, password_hash, role, shop_name) VALUES (?, ?, ?, ?, ?)',
      [name, email, auth.hashPassword(password), 'owner', shopName || name + "'s Shop"]
    );
  }).then(function (ins) {
    return auth.createSession(ins.insertId).then(function (token) {
      res.setHeader('Set-Cookie', auth.sessionCookie(token, 30));
      res.json({ ok: true });
    });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- POST /api/auth/login ---------- */

app.post('/api/auth/login', function (req, res) {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  db.query('SELECT * FROM users WHERE email = ?', [email]).then(function (rows) {
    const user = rows[0];
    if (!user || !auth.verifyPassword(password, user.password_hash)) {
      throw new Error('Wrong email or password');
    }
    return auth.createSession(user.id).then(function (token) {
      res.setHeader('Set-Cookie', auth.sessionCookie(token, 30));
      res.json({ ok: true });
    });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- POST /api/auth/logout ---------- */

app.post('/api/auth/logout', function (req, res) {
  auth.destroySession(auth.parseCookies(req)[auth.COOKIE]).then(function () {
    res.setHeader('Set-Cookie', auth.clearCookie());
    res.json({ ok: true });
  });
});

/* ---------- GET /api/auth/me ---------- */

app.get('/api/auth/me', function (req, res) {
  auth.currentUser(req).then(function (user) {
    res.json({ ok: true, user: user ? publicUser(user) : null });
  });
});

/* ---------- POST /api/auth/profile ----------
   Edit name / phone / shop name; optionally change password
   (requires the current one). */

app.post('/api/auth/profile', function (req, res) {
  auth.currentUser(req).then(function (user) {
    if (!user) throw new Error('Please sign in first');
    const body = req.body || {};
    const name = String(body.name || user.name).trim().slice(0, 80);
    if (name.length < 2) throw new Error('Name is too short');
    const phone = String(body.phone || '').trim().slice(0, 30) || null;
    const shopName = String(body.shopName || '').trim().slice(0, 80) || null;

    const save = function () {
      return db.query('UPDATE users SET name = ?, phone = ?, shop_name = ? WHERE id = ?',
        [name, phone, shopName, user.id]).then(function () { res.json({ ok: true }); });
    };

    if (!body.newPassword) return save();

    return db.query('SELECT password_hash FROM users WHERE id = ?', [user.id]).then(function (rows) {
      if (!auth.verifyPassword(String(body.password || ''), rows[0].password_hash)) {
        throw new Error('Current password is incorrect');
      }
      if (String(body.newPassword).length < 8) throw new Error('New password must be at least 8 characters');
      return db.query('UPDATE users SET password_hash = ? WHERE id = ?',
        [auth.hashPassword(body.newPassword), user.id]).then(save);
    });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ============================================================
   Preferences  (currency / language / theme / accent)
   ============================================================ */

const ALLOWED_PREFS = {
  currency: ['RWF', 'KES', 'UGX', 'TZS', 'USD', 'EUR', 'NGN', 'GHS'],
  language: ['en', 'rw', 'fr', 'sw'],
  theme: ['light', 'dark'],
  accent: ['navy', 'emerald', 'violet', 'amber', 'rose', 'slate']
};

app.post('/api/prefs', function (req, res) {
  auth.currentUser(req).then(function (user) {
    if (!user) throw new Error('Please sign in first');
    const body = req.body || {};
    const sets = [], params = [];
    Object.keys(ALLOWED_PREFS).forEach(function (key) {
      const v = body[key];
      if (v === undefined) return;
      if (ALLOWED_PREFS[key].indexOf(v) === -1) throw new Error('Unsupported ' + key);
      sets.push(key + ' = ?');
      params.push(v);
    });
    if (!sets.length) return res.json({ ok: true });
    params.push(user.id);
    return db.query('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', params)
      .then(function () { res.json({ ok: true }); });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ============================================================
   Products  (add new item / restock existing one)
   ============================================================ */

function slugify(name) {
  return String(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'item';
}

function boxColumn(method) {
  return (method === 'MoMo') ? 'momo_box' : (method === 'Bank') ? 'bank_box' : 'cash_box';
}

app.post('/api/products', function (req, res) {
  auth.currentUser(req).then(function (user) {
    if (!user) throw new Error('Please sign in first');
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 80);
    const price = Math.round(Number(body.price));
    const stock = Math.max(0, Math.round(Number(body.stock) || 0));
    const low = Math.max(1, Math.round(Number(body.low) || 10));
    const method = body.method || null;

    if (name.length < 2) throw new Error('Item name is too short');
    if (!price || price <= 0) throw new Error('A valid price is required');
    if (stock > 0 && ['Cash', 'MoMo', 'Bank'].indexOf(method) === -1) {
      throw new Error('Choose how you paid for the initial stock');
    }

    const id = slugify(name);

    return db.withTransaction(function (exec) {
      return exec('SELECT id FROM products WHERE id = ?', [id]).then(function (f) {
        const exists = f[0].length > 0;
        return (exists
          ? exec('UPDATE products SET name = ?, price = ?, stock = stock + ?, low_threshold = ? WHERE id = ?',
              [name, price, stock, low, id])
          : exec('INSERT INTO products (id, name, price, stock, low_threshold, sort_order) VALUES (?, ?, ?, ?, ?, 99)',
              [id, name, price, stock, low])
        ).then(function () {
          if (!stock) return null;
          const cost = price * stock;
          const label = (exists ? 'Restock · ' : 'Stock purchase · ') + name;
          return exec('INSERT INTO expenses (category, amount, note, method) VALUES (?, ?, ?, ?)',
            ['Stock', cost, label, method])
            .then(function () {
              return exec('INSERT INTO ledger_entries (label, type, amount, method, category) VALUES (?, ?, ?, ?, ?)',
                [label, 'out', cost, method, 'Stock']);
            })
            .then(function () {
              const box = boxColumn(method);
              return exec('UPDATE settings SET ' + box + ' = ' + box + ' - ? WHERE id = 1', [cost]);
            });
        });
      }).then(function () {
        return periodSums(exec);
      }).then(function (period) {
        return { id: id, period: period };
      });
    });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- POST /api/products/:id/restock ---------- */

app.post('/api/products/:id/restock', function (req, res) {
  auth.currentUser(req).then(function (user) {
    if (!user) throw new Error('Please sign in first');
    const qty = Math.max(1, Math.round(Number((req.body || {}).qty) || 0));
    const method = (req.body || {}).method;
    if (['Cash', 'MoMo', 'Bank'].indexOf(method) === -1) throw new Error('Unknown payment method');
    const box = boxColumn(method);

    return db.withTransaction(function (exec) {
      return exec('SELECT name, price FROM products WHERE id = ? FOR UPDATE', [req.params.id])
        .then(function (p) {
          const item = p[0][0];
          if (!item) throw new Error('Unknown item');
          const cost = item.price * qty;
          return exec('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, req.params.id])
            .then(function () {
              return exec('INSERT INTO expenses (category, amount, note, method) VALUES (?, ?, ?, ?)',
                ['Stock', cost, 'Restock · ' + item.name + ' ×' + qty, method]);
            })
            .then(function () {
              return exec('INSERT INTO ledger_entries (label, type, amount, method, category) VALUES (?, ?, ?, ?, ?)',
                ['Restock · ' + item.name, 'out', cost, method, 'Stock']);
            })
            .then(function () {
              return exec('UPDATE settings SET ' + box + ' = ' + box + ' - ? WHERE id = 1', [cost]);
            })
            .then(function () {
              return exec('SELECT stock FROM products WHERE id = ?', [req.params.id]);
            })
            .then(function (p2) {
              return periodSums(exec).then(function (period) {
                return { id: req.params.id, stock: p2[0][0].stock, period: period };
              });
            });
        });
    });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ============================================================
   Money boxes  (move money between cash / bank / momo)
   ============================================================ */

app.post('/api/boxes/transfer', function (req, res) {
  auth.currentUser(req).then(function (user) {
    if (!user) throw new Error('Please sign in first');
    const body = req.body || {};
    const amount = Math.round(Number(body.amount));
    const from = String(body.from || '');
    const to = String(body.to || '');
    const BOXES = ['cash_box', 'bank_box', 'momo_box'];

    if (!amount || amount <= 0) throw new Error('A valid amount is required');
    if (BOXES.indexOf(from) === -1 || BOXES.indexOf(to) === -1) throw new Error('Unknown box');
    if (from === to) throw new Error('Choose two different boxes');

    const FROM = from.replace('_box', ''), TO = to.replace('_box', '');

    return db.withTransaction(function (exec) {
      return exec('SELECT cash_box, bank_box, momo_box FROM settings WHERE id = 1 FOR UPDATE')
        .then(function (r) {
          if (r[0][0][from] < amount) throw new Error('Not enough in the ' + FROM + ' box');
          return exec('UPDATE settings SET ' + from + ' = ' + from + ' - ?, ' + to + ' = ' + to + ' + ? WHERE id = 1',
            [amount, amount]);
        })
        .then(function () {
          return exec('INSERT INTO ledger_entries (label, type, amount, method, category) VALUES (?, ?, ?, ?, ?)',
            ['Transfer ' + FROM + ' → ' + TO, 'info', amount, TO, 'Transfer']);
        })
        .then(function () {
          return exec('SELECT cash_box, bank_box, momo_box FROM settings WHERE id = 1');
        })
        .then(function (r) {
          return {
            boxes: { cash: r[0][0].cash_box, bank: r[0][0].bank_box, momo: r[0][0].momo_box },
            ledgerEntry: ledgerRow(new Date(), 'Transfer ' + FROM + ' → ' + TO, 'info', amount, TO, 'Transfer')
          };
        });
    });
  }).catch(function (err) { fail(res, 400, err.message); });
});

/* ---------- GET /api/bootstrap ---------- */

function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

const round = Math.round;

/* Same shape as a transaction exec(): resolves [rows, fields] */
function q(sql, params) {
  return db.query(sql, params).then(function (rows) { return [rows, null]; });
}

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
    db.query('SELECT cash_box, bank_box, momo_box FROM settings WHERE id = 1'),
    db.query('SELECT COALESCE(SUM(balance),0) AS v FROM customers'),
    periodSums(q)
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

    const boxes = r[4][0];

    res.json({
      server: true,
      date: db.longDate(new Date()),
      openingFloat: settings.opening_float,
      revenuePeriod: r[6].revenue,
      expensesPeriod: r[6].expenses,
      saleCounter: settings.sale_counter,
      boxes: { cash: boxes.cash_box, bank: boxes.bank_box, momo: boxes.momo_box, credit: r[5][0].v },
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
                        /* cash sales land in the cash box */
                        if (method === 'Cash') {
                          return exec('UPDATE settings SET cash_box = cash_box + ? WHERE id = 1', [total]);
                        }
                        return null;
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
          return exec('SELECT cash_box, bank_box, momo_box FROM settings WHERE id = 1')
            .then(function (b) {
              result.boxes = { cash: b[0][0].cash_box, bank: b[0][0].bank_box, momo: b[0][0].momo_box };
              return result;
            });
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
    const box = boxColumn(method);
    return exec('INSERT INTO expenses (category, amount, note, method) VALUES (?, ?, ?, ?)', [category, amount, note || null, method])
      .then(function () {
        return exec('INSERT INTO ledger_entries (label, type, amount, method, category, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [note || category, 'out', amount, method, category]);
      })
      .then(function () {
        /* the money leaves the box it was paid from */
        return exec('UPDATE settings SET ' + box + ' = ' + box + ' - ? WHERE id = 1', [amount]);
      })
      .then(function () { return periodSums(exec); })
      .then(function (period) {
        return exec('SELECT cash_box, bank_box, momo_box FROM settings WHERE id = 1').then(function (b) {
          return {
            amount: amount,
            boxes: { cash: b[0][0].cash_box, bank: b[0][0].bank_box, momo: b[0][0].momo_box },
            ledgerEntry: ledgerRow(new Date(), note || category, 'out', amount, method, category),
            period: period
          };
        });
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
    const box = boxColumn(method);
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
            /* the received money lands in its box */
            return exec('UPDATE settings SET ' + box + ' = ' + box + ' + ? WHERE id = 1', [amount]);
          })
          .then(function () {
            /* read on the transaction connection to see our own UPDATE */
            return exec('SELECT last_payment FROM customers WHERE id = ?', [customerId]);
          })
          .then(function (lp) {
            return exec('SELECT cash_box, bank_box, momo_box FROM settings WHERE id = 1').then(function (b) {
              return {
                amount: amount,
                customer: {
                  id: customerId,
                  balance: newBalance,
                  lastPayment: db.shortDate(lp[0][0].last_payment)
                },
                boxes: { cash: b[0][0].cash_box, bank: b[0][0].bank_box, momo: b[0][0].momo_box },
                ledgerEntry: ledgerRow(new Date(), 'Payment · ' + cust.name, 'in', amount, method)
              };
            });
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
