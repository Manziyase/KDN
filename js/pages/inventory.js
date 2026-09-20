/* ============================================================
   BizTrack Lite — Inventory page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.inventory = {
  title: 'Inventory',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var low = st.lowStock();
    var stockValue = s.items.reduce(function (sum, i) {
      return sum + i.price * i.stock;
    }, 0);

    var rows = s.items.map(function (i) {
      var status = i.stock <= i.low
        ? '<span class="badge low">Restock</span>'
        : '<span class="badge ok">OK</span>';
      return `
        <tr>
          <td>${ui.esc(i.name)}</td>
          <td class="num">${ui.fmt(i.price)}</td>
          <td class="num">${i.stock}</td>
          <td class="num">${i.soldWeek}</td>
          <td>${status}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="stat-row">
        <div class="card stat">
          <p class="stat-label">Items</p>
          <p class="stat-val">${s.items.length}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Need restocking</p>
          <p class="stat-val ${low.length ? 'neg' : 'pos'}">${low.length}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Stock value</p>
          <p class="stat-val">${ui.rwf(stockValue)}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>All items</h2></div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num">Price</th>
                <th class="num">In stock</th>
                <th class="num">Sold this week</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }
};
