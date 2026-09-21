/* ============================================================
   BizTrack Lite — Expenses page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.expenses = {
  title: 'Expenses',

  render: function (el) {
    var ui = BT.ui;
    var s = BT.store.state;

    var outs = s.ledger.filter(function (e) { return e.type === 'out'; });
    var total = outs.reduce(function (sum, e) { return sum + e.amount; }, 0);

    var rows = outs.map(function (e) {
      return `
        <tr>
          <td>${e.time}</td>
          <td>${ui.esc(e.label)}</td>
          <td>${ui.esc(e.category || 'Other')}</td>
          <td class="num neg">−${ui.fmt(e.amount)}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="stat-row">
        <div class="card stat">
          <p class="stat-label">Spent today</p>
          <p class="stat-val">${ui.fmtMoney(total)}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Entries</p>
          <p class="stat-val">${outs.length}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">This month</p>
          <p class="stat-val">${ui.fmtMoney(s.expensesPeriod)}</p>
        </div>
      </div>

      <div class="page-toolbar">
        <h2>Today's expenses</h2>
        <a class="btn btn-primary" href="#/new-expense">
          <i class="ti ti-plus" aria-hidden="true"></i>New expense
        </a>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Time</th>
                <th>Expense</th>
                <th>Category</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4" class="empty">No expenses recorded today.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }
};
