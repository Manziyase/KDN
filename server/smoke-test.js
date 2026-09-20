/* ============================================================
   BizTrack Lite — end-to-end API smoke test

   Spawns the real server, then exercises: bootstrap, signup,
   login, me, prefs, profile, product add, restock, sale,
   expense, payment, box transfer, logout.

   Run:  node server/smoke-test.js
   ============================================================ */

const { spawn } = require('child_process');
const path = require('path');

const PORT = 3210; /* avoid clashing with a running dev server */
const BASE = 'http://127.0.0.1:' + PORT + '/api';
let cookie = '';

function call(method, p, body) {
  return fetch(BASE + p, {
    method: method,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      cookie ? { Cookie: cookie } : {}
    ),
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return res.json().then(function (data) { return { status: res.status, data: data }; });
  });
}

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.log('  ✖ ' + name + (extra ? ' — ' + JSON.stringify(extra).slice(0, 200) : '')); }
}

async function main() {
  const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stderr.on('data', function (d) { process.stderr.write(d); });

  /* wait for the server to accept connections */
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/auth/me'); break; } catch (e) { await new Promise(r => setTimeout(r, 200)); }
  }

  try {
    console.log('\n— bootstrap —');
    let r = await call('GET', '/bootstrap');
    check('bootstrap ok', r.data.ok !== false && r.data.items && r.data.boxes, r.data);
    check('boxes present', r.data.boxes && typeof r.data.boxes.cash === 'number', r.data.boxes);
    const cashBefore = r.data.boxes.cash;

    console.log('\n— auth —');
    r = await call('POST', '/auth/login', { email: 'demo@biztrack.app', password: 'wrong' });
    check('login rejects bad password', r.data.ok === false, r.data);

    r = await call('POST', '/auth/login', { email: 'demo@biztrack.app', password: 'demo1234' });
    check('login ok', r.data.ok === true, r.data);

    r = await call('GET', '/auth/me');
    check('me returns user', r.data.user && r.data.user.email === 'demo@biztrack.app', r.data);

    console.log('\n— signup —');
    const uniq = 'smoke' + Date.now() + '@test.local';
    r = await call('POST', '/auth/signup', { name: 'Smoke Test', email: uniq, password: 'password1' });
    check('signup ok', r.data.ok === true, r.data);
    r = await call('GET', '/auth/me');
    check('signed in as new user', r.data.user && r.data.user.email === uniq, r.data);
    r = await call('POST', '/auth/signup', { name: 'Dup', email: 'demo@biztrack.app', password: 'password1' });
    check('duplicate email rejected', r.data.ok === false, r.data);

    console.log('\n— profile & prefs —');
    r = await call('POST', '/auth/profile', { name: 'Smoke Renamed', phone: '+250700000', shopName: 'Smoke Shop' });
    check('profile update ok', r.data.ok === true, r.data);
    r = await call('POST', '/auth/profile', { password: 'demo1234', newPassword: 'password9' });
    check('password change ok', r.data.ok === true, r.data);
    r = await call('POST', '/auth/login', { email: 'demo@biztrack.app', password: 'password9' });
    check('login with new password', r.data.ok === true, r.data);
    r = await call('POST', '/auth/profile', { password: 'password9', newPassword: 'demo1234' });
    check('password restored', r.data.ok === true, r.data);

    r = await call('POST', '/prefs', { currency: 'KES', theme: 'dark', accent: 'emerald', language: 'sw' });
    check('prefs saved', r.data.ok === true, r.data);
    r = await call('GET', '/auth/me');
    check('prefs persisted', r.data.user.prefs.currency === 'KES' && r.data.user.prefs.theme === 'dark', r.data.user && r.data.user.prefs);
    r = await call('POST', '/prefs', { currency: 'RWF', theme: 'light', accent: 'navy', language: 'en' });
    check('prefs restored', r.data.ok === true, r.data);

    console.log('\n— products —');
    r = await call('POST', '/products', { name: 'Smoke Item', price: 1000, stock: 5, low: 3, method: 'Cash' });
    check('product added', r.data.ok === true && r.data.id === 'smoke-item', r.data);
    r = await call('POST', '/products', { name: 'Smoke Item', price: 1000, stock: 2, low: 3, method: 'Cash' });
    check('duplicate product merges stock', r.data.ok === true, r.data);

    r = await call('POST', '/products/smoke-item/restock', { qty: 3, method: 'MoMo' });
    check('restock ok', r.data.ok === true && r.data.stock === 10, r.data);

    console.log('\n— sale / expense / payment / transfer —');
    r = await call('GET', '/bootstrap');
    const cashBeforeSale = r.data.boxes.cash;

    r = await call('POST', '/sales', { itemId: 'smoke-item', qty: 2, method: 'Cash' });
    check('cash sale ok', r.data.ok === true && r.data.total === 2000, r.data);
    check('cash sale fills cash box', r.data.boxes.cash === cashBeforeSale + 2000, r.data.boxes);

    r = await call('POST', '/sales', { itemId: 'smoke-item', qty: 1, method: 'Credit', customerId: 'amina' });
    check('credit sale ok', r.data.ok === true && r.data.customer && r.data.customer.balance === 3500, r.data);

    r = await call('POST', '/sales', { itemId: 'smoke-item', qty: 999, method: 'Cash' });
    check('oversell rejected', r.data.ok === false, r.data);

    r = await call('POST', '/expenses', { category: 'Transport', amount: 500, method: 'MoMo', note: 'smoke' });
    check('expense ok', r.data.ok === true, r.data);

    r = await call('POST', '/payments', { customerId: 'amina', amount: 1500, method: 'Cash' });
    check('payment ok', r.data.ok === true && r.data.customer.balance === 2000, r.data);
    check('payment fills cash box', r.data.boxes.cash === cashBeforeSale + 2000 + 1500, r.data.boxes);

    r = await call('POST', '/boxes/transfer', { from: 'cash_box', to: 'bank_box', amount: 3000 });
    check('transfer ok', r.data.ok === true && r.data.boxes, r.data);
    r = await call('POST', '/boxes/transfer', { from: 'cash_box', to: 'bank_box', amount: 99999999 });
    check('overdraft transfer rejected', r.data.ok === false, r.data);
    r = await call('POST', '/boxes/transfer', { from: 'cash_box', to: 'cash_box', amount: 100 });
    check('same-box transfer rejected', r.data.ok === false, r.data);

    console.log('\n— auth guard —');
    const saved = cookie;
    cookie = 'bt_session=forged';
    r = await call('POST', '/products', { name: 'Nope', price: 5, stock: 0 });
    check('forged session rejected', r.data.ok === false, r.data);
    cookie = saved;

    r = await call('POST', '/auth/logout');
    check('logout ok', r.data.ok === true, r.data);
    r = await call('GET', '/auth/me');
    check('me null after logout', r.data.user === null, r.data);

    console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
  } catch (err) {
    failed++;
    console.error('Test crashed:', err);
  } finally {
    server.kill();
    process.exit(failed ? 1 : 0);
  }
}

main();
