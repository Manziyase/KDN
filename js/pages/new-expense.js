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

    var categories = ['Transport', 'Stock', 'Airtime', 'Staff', 'Rent', 'Other'];

    el.innerHTML = `
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
              <label for="f-amount">Amount (RWF)</label>
              <input id="f-amount" type="number" min="0" placeholder="0" inputmode="numeric">
            </div>

            <div class="field span-2">
              <label for="f-note">Note</label>
              <input id="f-note" type="text" maxlength="60" placeholder="e.g. Taxi to market">
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

    el.querySelector('#expense-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = parseFloat(el.querySelector('#f-amount').value);

      if (!amount || amount <= 0) {
        ui.toast('Enter a valid amount');
        return;
      }

      st.recordExpense({
        category: category(),
        amount: amount,
        note: el.querySelector('#f-note').value.trim()
      });
      ui.toast('Expense saved — ' + ui.rwf(amount));
      BT.router.navigate('expenses');
    });
  }
};
