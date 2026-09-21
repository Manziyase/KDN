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
            <button class="btn btn-sm edit-btn" data-id="${ui.esc(i.id)}" type="button"
                    aria-label="Edit ${ui.esc(i.name)}">
              <i class="ti ti-pencil" aria-hidden="true"></i> Edit
            </button>
            <button class="btn btn-sm delete-btn" data-id="${ui.esc(i.id)}"
                    data-name="${ui.esc(i.name)}" type="button"
                    aria-label="Delete ${ui.esc(i.name)}">
              <i class="ti ti-trash" aria-hidden="true"></i> Delete
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
      if (BT.app.demoGuard()) return;

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

    /* ---------- Restock wiring (modal dialog) ---------- */

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.restock-btn');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');
      var item = st.state.items.find(function (i) { return i.id === id; });
      if (!item) return;

      var payOptions = ['Cash', 'MoMo', 'Bank'].map(function (m, i) {
        return `<button type="button" class="chip${i === 0 ? ' selected' : ''}">${m}</button>`;
      }).join('');

      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-package" aria-hidden="true"></i> Restock ${ui.esc(name)}</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="restock-summary">
            <div><small>Now in stock</small><b>${item.stock}</b></div>
            <i class="ti ti-arrow-right" aria-hidden="true"></i>
            <div><small>After restock</small><b id="rs-after">${item.stock}</b></div>
          </div>

          <form id="restock-form" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="rs-qty">Units to add</label>
                <div class="qty-stepper">
                  <button type="button" class="qty-btn" id="rs-minus" aria-label="Less">−</button>
                  <input id="rs-qty" type="number" min="1" step="1" value="10" inputmode="numeric">
                  <button type="button" class="qty-btn" id="rs-plus" aria-label="More">+</button>
                </div>
              </div>
              <div class="field">
                <label>Pay from</label>
                <div class="chips" id="rs-method">${payOptions}</div>
              </div>
            </div>

            <div class="summary-box">
              <div>
                <p class="t-label">Cost (${ui.fmt(item.price)} × qty)</p>
                <p class="t-val" id="rs-cost">${ui.fmtMoney(item.price * 10)}</p>
              </div>
              <i class="ti ti-package summary-icon" aria-hidden="true"></i>
            </div>

            <p class="hint">The cost is booked as a Stock expense and the box you
            pay with is reduced right away.</p>

            <p class="auth-error" id="rs-error" hidden></p>
            <div class="modal-actions">
              <button class="btn" type="button" data-close="1">Cancel</button>
              <button class="btn btn-primary" type="submit">
                <i class="ti ti-check" aria-hidden="true"></i> Restock
              </button>
            </div>
          </form>
        </div>`);

      var qtyIn = m.el.querySelector('#rs-qty');
      var costEl = m.el.querySelector('#rs-cost');
      var afterEl = m.el.querySelector('#rs-after');
      var errEl = m.el.querySelector('#rs-error');

      function qty() { return Math.max(0, Math.round(Number(qtyIn.value) || 0)); }

      function update() {
        costEl.textContent = ui.fmtMoney(item.price * qty());
        afterEl.textContent = item.stock + qty();
      }

      m.el.querySelector('#rs-minus').addEventListener('click', function () {
        qtyIn.value = Math.max(1, qty() - 1);
        update();
      });
      m.el.querySelector('#rs-plus').addEventListener('click', function () {
        qtyIn.value = qty() + 1;
        update();
      });
      qtyIn.addEventListener('input', update);
      BT.ui.bindChips(m.el.querySelector('#rs-method'));

      m.el.querySelector('#restock-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var n = qty();
        if (n < 1) {
          errEl.textContent = 'Enter how many units you bought.';
          errEl.hidden = false;
          return;
        }
        var method = m.el.querySelector('#rs-method .chip.selected').textContent.trim();

        st.restock(id, n, method).then(function (ok) {
          if (ok === false) return; /* error already surfaced by the store */
          m.close();
          ui.toast('Restocked ' + n + ' × ' + name + ' for ' + ui.fmtMoney(item.price * n));
          BT.router.render();
        }).catch(function (err) { ui.toast(err.message); });
      });
    });

    /* ---------- Edit item wiring (modal dialog) ---------- */

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.edit-btn');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      var item = st.state.items.find(function (i) { return i.id === id; });
      if (!item) return;

      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-pencil" aria-hidden="true"></i> Edit ${ui.esc(item.name)}</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="edit-item-form" novalidate>
            <div class="form-grid">
              <div class="field span-2">
                <label for="ei-name">Item name</label>
                <input id="ei-name" type="text" maxlength="60" value="${ui.esc(item.name)}">
              </div>
              <div class="field">
                <label for="ei-price">Selling price (${ui.currency()})</label>
                <input id="ei-price" type="text" inputmode="numeric" value="${item.price}">
              </div>
              <div class="field">
                <label for="ei-low">Alert me at (low-stock level)</label>
                <input id="ei-low" type="number" min="1" value="${item.low}" inputmode="numeric">
              </div>
            </div>
            <p class="hint">Stock changes through sales and restocking, so it is not edited here.</p>
            <p class="auth-error" id="ei-error" hidden></p>
            <div class="modal-actions">
              <button class="btn" type="button" data-close="1">Cancel</button>
              <button class="btn btn-primary" type="submit">
                <i class="ti ti-check" aria-hidden="true"></i> Save changes
              </button>
            </div>
          </form>
        </div>`);

      var errEl = m.el.querySelector('#ei-error');

      m.el.querySelector('#edit-item-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var name = m.el.querySelector('#ei-name').value.trim();
        var price = ui.parseNum(m.el.querySelector('#ei-price').value);
        var low = Math.max(1, Math.round(Number(m.el.querySelector('#ei-low').value) || 10));

        if (name.length < 2) {
          errEl.textContent = 'Enter the item name.';
          errEl.hidden = false;
          return;
        }
        if (!price || price <= 0) {
          errEl.textContent = 'Enter a valid selling price.';
          errEl.hidden = false;
          return;
        }

        st.updateProduct(id, { name: name, price: price, low: low }).then(function (ok) {
          if (ok === false) return; /* error surfaced by the store */
          m.close();
          ui.toast('Item updated — ' + name);
          BT.router.render();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        });
      });
    });

    /* ---------- Delete item wiring (confirm dialog) ---------- */

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.delete-btn');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');

      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-trash" aria-hidden="true"></i> Delete ${ui.esc(name)}?</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>This removes <b>${ui.esc(name)}</b> from your inventory list. Past sale totals stay in the books — only this item's line items are removed with it.</p>
          <p class="auth-error" id="di-error" hidden></p>
          <div class="modal-actions">
            <button class="btn" type="button" data-close="1">Cancel</button>
            <button class="btn btn-danger" type="button" id="di-confirm">
              <i class="ti ti-trash" aria-hidden="true"></i> Delete item
            </button>
          </div>
        </div>`);

      var errEl = m.el.querySelector('#di-error');

      m.el.querySelector('#di-confirm').addEventListener('click', function () {
        st.deleteProduct(id).then(function (ok) {
          if (ok === false) return; /* error surfaced by the store */
          m.close();
          ui.toast('Deleted ' + name);
          BT.router.render();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        });
      });
    });
  }
};
