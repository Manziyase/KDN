/* ============================================================
   BizTrack Lite — Customers page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.customers = {
  title: 'Customers',

  render: function (el) {
    var ui = BT.ui;
    var s = BT.store.state;

    var debtors = s.customers.filter(function (c) { return c.balance > 0; }).length;
    var owed = BT.store.creditOwed();

    function initials(name) {
      return name.split(' ')
        .map(function (w) { return w.charAt(0); })
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }

    var rows = s.customers.map(function (c) {
      return `
        <tr>
          <td>
            <div class="cell-user">
              <span class="avatar avatar-sm">${initials(c.name)}</span>
              ${ui.esc(c.name)}
            </div>
          </td>
          <td>${ui.esc(c.lastPayment)}</td>
          <td class="num ${c.balance > 0 ? 'neg' : ''}">${c.balance > 0 ? ui.fmtMoney(c.balance) : '—'}</td>
          <td class="num"><a class="btn btn-sm" href="#/add-payment?customer=${c.id}">Record payment</a></td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="stat-row">
        <div class="card stat">
          <p class="stat-label">Customers</p>
          <p class="stat-val">${s.customers.length}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">With credit</p>
          <p class="stat-val">${debtors}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Total owed</p>
          <p class="stat-val ${owed > 0 ? 'neg' : ''}">${ui.fmtMoney(owed)}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Customer credit</h2></div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Last payment</th>
                <th class="num">Balance</th>
                <th class="num">Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }
};
