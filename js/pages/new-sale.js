/* ============================================================
   BizTrack Lite — New Sale page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.newSale = {
  title: 'New Sale',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var options = s.items.map(function (i) {
      return `<option value="${i.id}">${ui.esc(i.name)} — ${ui.fmtMoney(i.price)} (${i.stock} in stock)</option>`;
    }).join('');

    var methods = ['Cash', 'MoMo', 'Credit'].map(function (m, i) {
      return `<button type="button" class="chip${i === 0 ? ' selected' : ''}">${m}</button>`;
    }).join('');

    var customers = s.customers.map(function (c) {
      return `<option value="${c.id}">${ui.esc(c.name)} — owes ${ui.fmt(c.balance)}</option>`;
    }).join('');

    el.innerHTML = `
      ${BT.app.demoMode() ? `
      <div class="alert" role="status">
        <i class="ti ti-info-circle" aria-hidden="true"></i>
        <div class="alert-body">
          <strong>Demo mode</strong>
          <span>Sign in to record real sales — try it and see how the app works.</span>
        </div>
      </div>` : ''}
      <div class="form-card card">
        <form id="sale-form" novalidate>
          <div class="form-grid">
            <div class="field span-2">
              <label for="f-item">Item</label>
              <select id="f-item">${options}</select>
              <small class="field-hint" id="f-stock"></small>
            </div>

            <div class="field">
              <label for="f-qty">Quantity</label>
              <input id="f-qty" type="number" min="1" step="1" value="1" inputmode="numeric">
            </div>

            <div class="field">
              <label>Payment method</label>
              <div class="chips" id="f-method">${methods}</div>
            </div>

            <div class="field span-2" id="f-customer-field" hidden>
              <label for="f-customer">Customer</label>
              <select id="f-customer">${customers}</select>
            </div>
          </div>

          <div class="summary-box">
            <div>
              <p class="t-label">Total</p>
              <p class="t-val" id="f-total">RWF 0</p>
            </div>
            <i class="ti ti-shopping-cart summary-icon" aria-hidden="true"></i>
          </div>

          <button class="btn btn-primary btn-block" type="submit">
            <i class="ti ti-check" aria-hidden="true"></i>Save sale
          </button>
        </form>
      </div>`;

    var itemSel = el.querySelector('#f-item');
    var qtyIn = el.querySelector('#f-qty');
    var stockHint = el.querySelector('#f-stock');
    var totalEl = el.querySelector('#f-total');
    var methodWrap = el.querySelector('#f-method');
    var custField = el.querySelector('#f-customer-field');

    function currentItem() {
      return s.items.find(function (i) { return i.id === itemSel.value; });
    }

    function method() {
      return methodWrap.querySelector('.chip.selected').textContent.trim();
    }

    function update() {
      var item = currentItem();
      var qty = parseInt(qtyIn.value, 10) || 0;
      totalEl.textContent = ui.fmtMoney(item.price * Math.max(qty, 0));
      stockHint.textContent = item.stock + ' in stock' + (item.stock <= item.low ? ' · low, please restock' : '');
      custField.hidden = method() !== 'Credit';
    }

    itemSel.addEventListener('change', update);
    qtyIn.addEventListener('input', update);
    BT.ui.bindChips(methodWrap, update);

    el.querySelector('#sale-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (BT.app.demoGuard()) return;

      var item = currentItem();
      var qty = parseInt(qtyIn.value, 10);

      if (!qty || qty < 1) {
        ui.toast('Enter a valid quantity');
        return;
      }
      if (qty > item.stock) {
        ui.toast('Only ' + item.stock + ' in stock');
        return;
      }

      var total = st.recordSale({
        itemId: item.id,
        qty: qty,
        method: method(),
        customerId: el.querySelector('#f-customer').value
      });
      ui.toast('Sale saved — ' + ui.fmtMoney(total));
      BT.router.navigate('dashboard');
    });

    update();
  }
};
