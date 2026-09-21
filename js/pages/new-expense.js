/* ============================================================
   BizTrack Lite — New Expense page
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.newExpense = {
  title: 'New Expense',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var t = BT.i18n ? BT.i18n.t : function (k) { return k; };

    var categories = ['Transport', 'Stock', 'Airtime', 'Staff', 'Rent', 'Other'];

    el.innerHTML = `
      ${BT.app.demoMode() ? `
      <div class="alert" role="status">
        <i class="ti ti-info-circle" aria-hidden="true"></i>
        <div class="alert-body">
          <strong>Demo mode</strong>
          <span>Sign in to record real expenses — try it and see how the app works.</span>
        </div>
      </div>` : ''}
      <div class="form-card card">
        <form id="expense-form" novalidate>
          <div class="form-grid">
            <div class="field span-2">
              <label>Category</label>
              <div class="chips" id="f-category">
                ${categories.map(function (c, i) {
                  return `<button type="button" class="chip${i === 0 ? ' selected' : ''}">${c}</button>`;
                }).join('')}
              </div>
            </div>

            <div class="field span-2">
              <label for="f-amount">Amount (${ui.currency()})</label>
              <input id="f-amount" type="number" min="0" placeholder="0" inputmode="numeric">
            </div>

            <div class="field span-2">
              <label for="f-note">Note</label>
              <input id="f-note" type="text" maxlength="60" placeholder="e.g. Taxi to market">
            </div>

            <div class="field span-2">
              <label>${t('payment_method')}</label>
              <div class="chips" id="f-method">
                ${['Cash', 'MoMo', 'Bank'].map(function (m, i) {
                  return `<button type="button" class="chip${i === 0 ? ' selected' : ''}">${m}</button>`;
                }).join('')}
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-block" type="submit">
            <i class="ti ti-check" aria-hidden="true"></i>Save expense
          </button>
        </form>
      </div>`;

    function category() {
      return el.querySelector('#f-category .chip.selected').textContent.trim();
    }

    BT.ui.bindChips(el.querySelector('#f-category'));
    BT.ui.bindChips(el.querySelector('#f-method'));

    el.querySelector('#expense-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (BT.app.demoGuard()) return;

      var amount = ui.parseNum(el.querySelector('#f-amount').value);

      if (!amount || amount <= 0) {
        ui.toast('Enter a valid amount');
        return;
      }

      var method = el.querySelector('#f-method .chip.selected').textContent.trim();

      st.recordExpense({
        category: category(),
        amount: amount,
        note: el.querySelector('#f-note').value.trim(),
        method: method
      });
      ui.toast('Expense saved — ' + ui.fmtMoney(amount) + ' from ' + method);
      BT.router.navigate('expenses');
    });
  }
};
