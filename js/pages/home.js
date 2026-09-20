/* ============================================================
   BizTrack Lite — Landing (Home) page

   Shown before entering the app shell. The router adds a
   `landing` class to <body> for this route, which hides the
   sidebar/topbar until the user enters the dashboard.
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.home = {
  title: 'Welcome',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    /* Live numbers from the store — proves the demo is real */
    var stats = [
      ['Closing balance', ui.rwf(st.closing())],
      ["Today's sales", ui.rwf(st.todaySales())],
      ['Items tracked', String(s.items.length)],
      ['Credit owed', ui.rwf(st.creditOwed())]
    ].map(function (stat) {
      return `
        <div class="card stat">
          <p class="stat-label">${stat[0]}</p>
          <p class="stat-val">${stat[1]}</p>
        </div>`;
    }).join('');

    var features = [
      ['ti-shopping-cart', 'green', 'Sales tracking',
        'Record cash, MoMo and credit sales with live totals and stock checks.'],
      ['ti-receipt', 'red', 'Expense logging',
        'Categorize spending and watch cash-out update the ledger instantly.'],
      ['ti-box', 'blue', 'Inventory',
        'Stock levels, weekly sales and restock flags for every item.'],
      ['ti-users', 'purple', 'Customer credit',
        'See who owes what and record payments in a tap.'],
      ['ti-book', 'teal', 'Cash ledger',
        'A running daily balance from opening float to closing.'],
      ['ti-bell', 'amber', 'Notifications',
        'Low-stock and credit reminders surfaced automatically.']
    ].map(function (f) {
      return `
        <div class="card feature">
          <span class="feature-icon tint-${f[1]}"><i class="ti ${f[0]}" aria-hidden="true"></i></span>
          <h3>${f[2]}</h3>
          <p>${f[3]}</p>
        </div>`;
    }).join('');

    el.innerHTML = `
      <section class="landing-hero">
        <span class="landing-brand">
          <span class="brand-dot"></span>BizTrack Lite · KDN
        </span>
        <h2>Run your duka,<br>one clear screen at a time.</h2>
        <p class="lead">
          Sales, expenses, inventory and customer credit for small shops —
          demo data included, no setup needed.
        </p>
        <div class="landing-cta">
          <a class="btn btn-primary btn-lg" href="#/dashboard">
            <i class="ti ti-arrow-right" aria-hidden="true"></i>Enter dashboard
          </a>
          <a class="btn btn-lg" href="#/notifications">
            <i class="ti ti-bell" aria-hidden="true"></i>What needs attention
          </a>
        </div>
      </section>

      <section class="landing-stats">${stats}</section>

      <section class="landing-features">${features}</section>

      <p class="landing-foot">MySQL-backed · reset anytime with <code>BT.store.reset()</code> in the browser console</p>`;
  }
};
