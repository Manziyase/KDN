/* ============================================================
   BizTrack Lite — Cash Ledger page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.ledger = {
  title: 'Cash Ledger',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var running = 0;
    var rows = s.ledger.map(function (e) {
      var detail = e.method || e.category || '—';
      var amountCell;

      if (e.type === 'info') {
        running = e.amount;
        amountCell = `<td class="num">${ui.fmt(e.amount)}</td>`;
      } else if (e.type === 'in') {
        running += e.amount;
        amountCell = `<td class="num pos">+${ui.fmt(e.amount)}</td>`;
      } else if (e.type === 'out') {
        running -= e.amount;
        amountCell = `<td class="num neg">−${ui.fmt(e.amount)}</td>`;
      } else {
        /* credit sale — no cash movement yet */
        detail = 'Credit';
        amountCell = `<td class="num">${ui.fmt(e.amount)}</td>`;
      }

      return `
        <tr>
          <td>${e.time}</td>
          <td>${ui.esc(e.label)}</td>
          <td>${ui.esc(detail)}</td>
          ${amountCell}
          <td class="num">${ui.fmt(running)}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="stat-row">
        <div class="card stat">
          <p class="stat-label">Opening float</p>
          <p class="stat-val">${ui.fmt(s.openingFloat)}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Cash in</p>
          <p class="stat-val pos">${ui.fmt(st.todaySales())}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Cash out</p>
          <p class="stat-val neg">${ui.fmt(st.todayExpenses())}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Closing balance</p>
          <p class="stat-val">${ui.fmt(st.closing())}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Today · ${ui.esc(s.date)}</h2></div>
        <div class="table-wrap">
          <table class="data" style="min-width:680px">
            <thead>
              <tr>
                <th>Time</th>
                <th>Entry</th>
                <th>Detail</th>
                <th class="num">Amount</th>
                <th class="num">Balance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }
};
