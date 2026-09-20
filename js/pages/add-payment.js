/* ============================================================
   BizTrack Lite — Add Payment page

   Supports preselecting a customer via the query string:
   #/add-payment?customer=amina
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.addPayment = {
  title: 'Add Payment',

  render: function (el, query) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var options = s.customers.map(function (c) {
      return `<option value="${c.id}" data-balance="${c.balance}">${ui.esc(c.name)} — owes ${ui.fmt(c.balance)}</option>`;
    }).join('');

    var methods = ['Cash', 'MoMo', 'Bank'].map(function (m, i) {
      return `<button type="button" class="chip${i === 0 ? ' selected' : ''}">${m}</button>`;
    }).join('');

    el.innerHTML = `
      <div class="form-card card">
        <form id="payment-form" novalidate>
          <div class="form-grid">
            <div class="field span-2">
              <label for="f-customer">Customer</label>
              <select id="f-customer">${options}</select>
            </div>

            <div class="field span-2">
              <label for="f-amount">Amount (${ui.currency()})</label>
              <input id="f-amount" type="number" min="0" placeholder="0" inputmode="numeric">
            </div>

            <div class="field span-2">
              <label>Method</label>
              <div class="chips" id="f-method">${methods}</div>
            </div>
          </div>

          <div class="summary-box">
            <div>
              <p class="t-label">Remaining balance</p>
              <p class="t-val" id="f-remaining">${ui.rwf(0)}</p>
            </div>
            <i class="ti ti-coin summary-icon" aria-hidden="true"></i>
          </div>

          <button class="btn btn-primary btn-block" type="submit">
            <i class="ti ti-check" aria-hidden="true"></i>Record payment
          </button>
        </form>
      </div>`;

    var custSel = el.querySelector('#f-customer');
    var amtIn = el.querySelector('#f-amount');
    var remEl = el.querySelector('#f-remaining');

    /* Deep link: #/add-payment?customer=<id> */
    if (query && query.customer &&
        s.customers.some(function (c) { return c.id === query.customer; })) {
      custSel.value = query.customer;
    }

    function update() {
      var opt = custSel.options[custSel.selectedIndex];
      var bal = parseFloat(opt.getAttribute('data-balance')) || 0;
      var amt = parseFloat(amtIn.value) || 0;
      remEl.textContent = ui.rwf(Math.max(Math.round(bal - amt), 0));
    }

    custSel.addEventListener('change', update);
    amtIn.addEventListener('input', update);
    BT.ui.bindChips(el.querySelector('#f-method'));

    el.querySelector('#payment-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = parseFloat(amtIn.value);

      if (!amount || amount <= 0) {
        ui.toast('Enter a valid amount');
        return;
      }

      st.recordPayment({
        customerId: custSel.value,
        amount: amount,
        method: el.querySelector('#f-method .chip.selected').textContent.trim()
      });
      ui.toast('Payment recorded — ' + ui.rwf(amount));
      BT.router.navigate('customers');
    });

    update();
  }
};
