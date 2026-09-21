/* ============================================================
   BizTrack Lite — Dashboard page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.dashboard = {
  title: 'Dashboard',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var low = st.lowStock();
    var netProfit = s.revenuePeriod - s.expensesPeriod;
    var b = st.boxes();
    var total = b.cash + b.bank + b.momo;
    var t = BT.i18n ? BT.i18n.t : function (k) { return k; };

    function kpi(icon, tint, val, label) {
      return `
        <div class="card kpi">
          <div class="kpi-icon tint-${tint}"><i class="ti ${icon}" aria-hidden="true"></i></div>
          <div class="kpi-val">${val}</div>
          <div class="kpi-label">${label}</div>
        </div>`;
    }

    /* Restock alert banner */
    var alertHtml = '';
    if (low.length) {
      alertHtml = `
        <div class="alert" role="status">
          <i class="ti ti-alert-triangle" aria-hidden="true"></i>
          <div class="alert-body">
            <strong>${low.length} item${low.length === 1 ? '' : 's'} need${low.length === 1 ? 's' : ''} restocking</strong>
            <span>${low.map(function (i) { return ui.esc(i.name); }).join(' · ')}</span>
          </div>
          <a class="btn btn-sm" href="#/inventory">Review</a>
        </div>`;
    }

    /* Quick actions */
    var actions = [
      ['new-sale', 'ti-shopping-cart', 'green', 'New sale'],
      ['new-expense', 'ti-receipt', 'red', 'New expense'],
      ['add-payment', 'ti-coin', 'pink', 'Add payment'],
      ['inventory', 'ti-box', 'blue', 'Inventory'],
      ['customers', 'ti-users', 'purple', 'Customers'],
      ['ledger', 'ti-book', 'teal', 'Cash ledger']
    ].map(function (a) {
      return `
        <a class="action" href="#/${a[0]}">
          <span class="action-icon tint-${a[2]}"><i class="ti ${a[1]}" aria-hidden="true"></i></span>
          <span class="action-label">${a[3]}</span>
        </a>`;
    }).join('');

    /* Recent cash activity */
    var recent = st.lastEntries(6).slice().reverse().map(function (e) {
      var tint = e.type === 'out' ? 'red' : e.type === 'in' ? 'green' : 'blue';
      var icon = e.type === 'out' ? 'ti-minus' : e.type === 'in' ? 'ti-plus' : 'ti-cash';
      var cls = e.type === 'out' ? 'neg' : e.type === 'in' ? 'pos' : '';
      var sign = e.type === 'out' ? '−' : e.type === 'in' ? '+' : '';
      var sub = e.time + (e.method ? ' · ' + e.method : e.category ? ' · ' + e.category : '');
      return `
        <a class="list-row" href="#/ledger">
          <span class="row-icon tint-${tint}"><i class="ti ${icon}" aria-hidden="true"></i></span>
          <div class="row-main">
            <strong>${ui.esc(e.label)}</strong>
            <small>${sub}</small>
          </div>
          <span class="row-amt ${cls}">${sign}${ui.fmt(e.amount)}</span>
        </a>`;
    }).join('');

    /* Low stock panel */
    var lowRows = low.length ? low.map(function (i) {
      return `
        <a class="list-row" href="#/inventory">
          <span class="row-icon tint-amber"><i class="ti ti-package" aria-hidden="true"></i></span>
          <div class="row-main">
            <strong>${ui.esc(i.name)}</strong>
            <small>${i.stock} left · reorder at ${i.low}</small>
          </div>
          <span class="badge low">Restock</span>
        </a>`;
    }).join('') : '<p class="empty">All items are well stocked.</p>';

    el.innerHTML = `
      ${alertHtml}
      <div class="dash-grid">
        <div class="dash-col">
          <div class="kpi-grid">
            ${kpi('ti-trending-up', 'green', ui.fmtMoney(s.revenuePeriod), 'Total revenue · this month')}
            ${kpi('ti-trending-down', 'red', ui.fmtMoney(s.expensesPeriod), 'Total expenses · this month')}
            ${kpi('ti-cash', 'blue', ui.fmtMoney(netProfit), 'Net profit · this month')}
            ${kpi('ti-users', 'amber', ui.fmtMoney(st.creditOwed()), 'Credit owed by customers')}
          </div>

          <div class="card">
            <div class="card-head"><h2>Quick actions</h2></div>
            <div class="card-body"><div class="actions-grid">${actions}</div></div>
          </div>

          <div class="card">
            <div class="card-head"><h2>Recent activity</h2><a class="btn btn-sm" href="#/ledger">View ledger</a></div>
            ${recent}
          </div>
        </div>

        <div class="dash-col">

          <div class="card">
            <div class="card-head">
              <h2>${t('where_money')}</h2>
              <a class="btn btn-sm" href="#/boxes">${t('view_boxes')}</a>
            </div>
            <div class="card-body boxes-mini">
              <div class="box-mini"><span class="dot-green"></span>Cash<b>${ui.fmtMoney(b.cash)}</b></div>
              <div class="box-mini"><span class="dot-blue"></span>Bank<b>${ui.fmtMoney(b.bank)}</b></div>
              <div class="box-mini"><span class="dot-purple"></span>MoMo<b>${ui.fmtMoney(b.momo)}</b></div>
              <div class="box-mini"><span class="dot-amber"></span>Credit<b>${ui.fmtMoney(b.credit)}</b></div>
              <div class="box-mini total"><span class="dot-slate"></span>Total<b>${ui.fmtMoney(total)}</b></div>
            </div>
          </div>

          <div class="balance-card">
            <p class="balance-label">Closing balance</p>
            <p class="balance-amount">${ui.fmtMoney(st.closing())}</p>
            <div class="balance-minis">
              <div><p class="bm-label">Opening</p><p class="bm-val">${ui.fmt(s.openingFloat)}</p></div>
              <div><p class="bm-label">Today's sales</p><p class="bm-val">${ui.fmt(st.todaySales())}</p></div>
              <div><p class="bm-label">Expenses</p><p class="bm-val">${ui.fmt(st.todayExpenses())}</p></div>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h2>Low stock</h2><span class="badge ${low.length ? 'low' : 'ok'}">${low.length}</span></div>
            ${lowRows}
          </div>
        </div>
      </div>`;
  }
};
