/* ============================================================
   BizTrack Lite — Inventory page

   Shows all items and lets you grow the shop:
     • Add item  — registers a new product; if you buy initial
       stock, the cost is booked as a Stock expense from the
       box you paid with (Cash / MoMo / Bank).
     • Restock   — buy more units of an existing item (same
       booking logic) via a small dialog on each row.
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
          <td class="row-actions">
            <button class="btn btn-sm restock-btn" data-id="${ui.esc(i.id)}"
                    data-name="${ui.esc(i.name)}" type="button">
              <i class="ti ti-package" aria-hidden="true"></i> Restock
            </button>
          </td>
        </tr>`;
    }).join('');

    /* ---------- Add item form (collapsible) ---------- */

    var payOptions = ['Cash', 'MoMo', 'Bank'].map(function (m) {
      return `<option value="${m}">${m} box</option>`;
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
          <p class="stat-val">${ui.fmtMoney(stockValue)}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>All items</h2>
          <button class="btn btn-sm btn-primary" id="toggle-add" type="button">
            <i class="ti ti-plus" aria-hidden="true"></i> Add item
          </button>
        </div>

        <div class="add-item-panel" id="add-item-panel" hidden>
          <form id="add-item-form" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="ai-name">Item name</label>
                <input id="ai-name" type="text" maxlength="60" placeholder="e.g. Soap powder 500g">
              </div>
              <div class="field">
                <label for="ai-price">Selling price (${ui.currency()})</label>
                <input id="ai-price" type="text" inputmode="numeric" placeholder="e.g. 1,500">
              </div>
              <div class="field">
                <label for="ai-stock">Units bought now <small>(0 = just list it)</small></label>
                <input id="ai-stock" type="number" min="0" value="0" inputmode="numeric">
              </div>
              <div class="field">
                <label for="ai-low">Alert me at (low-stock level)</label>
                <input id="ai-low" type="number" min="1" value="10" inputmode="numeric">
              </div>
              <div class="field span-2">
                <label for="ai-method">Paid from <small>(only when units &gt; 0)</small></label>
                <select id="ai-method">${payOptions}</select>
              </div>
            </div>
            <div class="panel-actions">
              <p class="hint" id="ai-cost-hint">Buying stock? The cost is booked as a Stock expense
              and deducted from the box you pay with.</p>
              <div>
                <button class="btn" id="ai-cancel" type="button">Cancel</button>
                <button class="btn btn-primary" type="submit">
                  <i class="ti ti-check" aria-hidden="true"></i> Save item
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num">Price</th>
                <th class="num">In stock</th>
                <th class="num">Sold this week</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    /* ---------- Add item wiring ---------- */

    var panel = el.querySelector('#add-item-panel');

    el.querySelector('#toggle-add').addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) el.querySelector('#ai-name').focus();
    });
    el.querySelector('#ai-cancel').addEventListener('click', function () {
      panel.hidden = true;
    });

    el.querySelector('#add-item-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = el.querySelector('#ai-name').value.trim();
      var price = ui.parseNum(el.querySelector('#ai-price').value);
      var stock = Math.max(0, Math.round(Number(el.querySelector('#ai-stock').value) || 0));
      var lowLvl = Math.max(1, Math.round(Number(el.querySelector('#ai-low').value) || 10));

      if (name.length < 2) return ui.toast('Enter the item name');
      if (!price || price <= 0) return ui.toast('Enter a valid selling price');

      st.addProduct({
        name: name, price: price, stock: stock,
        low: lowLvl, method: el.querySelector('#ai-method').value
      }).then(function (ok) {
        if (ok === false) return; /* error already surfaced by the store */
        ui.toast('Item added — ' + name);
        BT.router.render();
      });
    });

    /* ---------- Restock wiring ---------- */

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.restock-btn');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');
      var item = st.state.items.find(function (i) { return i.id === id; });
      if (!item) return;

      var qtyStr = window.prompt('Restock "' + name + '" — how many units?', '10');
      if (qtyStr === null) return;
      var qty = Math.round(Number(qtyStr) || 0);
      if (qty <= 0) return ui.toast('Enter a valid quantity');

      var method = window.prompt(
        'Paid from which box? Type Cash, MoMo or Bank', 'Cash');
      if (method === null) return;
      method = String(method).trim().toLowerCase();
      if (method === 'momo') method = 'MoMo';
      else if (method === 'bank') method = 'Bank';
      else if (method === 'cash') method = 'Cash';
      else return ui.toast('Choose Cash, MoMo or Bank');

      var cost = item.price * qty;
      st.restock(id, qty, method).then(function (ok) {
        if (ok === false) return;
        ui.toast('Restocked ' + qty + ' × ' + name + ' for ' + ui.fmtMoney(cost));
        BT.router.render();
      });
    });
  }
};
