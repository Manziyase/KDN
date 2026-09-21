/* ============================================================
   BizTrack Lite — Expenses page

   Shows the recorded expense history (fetched live from the
   server; falls back to today's ledger offline) and lets you
   fix mistakes:
     • Edit   — change category/note/amount/method; the books
       entry and the money boxes follow automatically.
     • Delete — removes a mistaken entry; the money returns to
       the box it was paid from.
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.expenses = {
  title: 'Expenses',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;
    var list = []; /* the fetched history rows */

    var categories = ['Transport', 'Stock', 'Airtime', 'Staff', 'Rent', 'Utilities', 'Other'];

    /* ---------- table ---------- */

    function tableHTML() {
      var total = list.reduce(function (sum, e) { return sum + e.amount; }, 0);
      var rows = list.map(function (e) {
        return `
        <tr>
          <td>${ui.esc(e.date)} ${ui.esc(e.time)}</td>
          <td>${ui.esc(e.note || e.category)}</td>
          <td>${ui.esc(e.category)}</td>
          <td>${ui.esc(e.method || 'Cash')}</td>
          <td class="num neg">−${ui.fmt(e.amount)}</td>
          <td class="row-actions">
            <button class="btn btn-sm edit-btn" data-id="${e.id}" type="button">Edit</button>
            <button class="btn btn-sm delete-btn" data-id="${e.id}" type="button">Delete</button>
          </td>
        </tr>`;
      }).join('');

      return `
      <div class="stat-row">
        <div class="card stat">
          <p class="stat-label">Entries</p>
          <p class="stat-val">${list.length}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">Total shown</p>
          <p class="stat-val neg">−${ui.fmtMoney(total)}</p>
        </div>
        <div class="card stat">
          <p class="stat-label">This month</p>
          <p class="stat-val">${ui.fmtMoney(s.expensesPeriod)}</p>
        </div>
      </div>

      <div class="page-toolbar">
        <h2>Expense history</h2>
        <a class="btn btn-primary" href="#/new-expense">
          <i class="ti ti-plus" aria-hidden="true"></i> New expense
        </a>
      </div>

      <div class="card" id="exp-card">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Expense</th>
                <th>Category</th>
                <th>Paid from</th>
                <th class="num">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" class="empty">No expenses recorded yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    }

    /* ---------- edit modal ---------- */

    function editModal(x) {
      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-pencil" aria-hidden="true"></i> Edit expense</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="edit-expense-form" novalidate>
            <div class="form-grid">
              <div class="field span-2">
                <label>Category</label>
                <div class="chips" id="ee-category">
                  ${categories.map(function (c) {
                    return '<button type="button" class="chip' + (c === x.category ? ' selected' : '') + '">' + c + '</button>';
                  }).join('')}
                </div>
              </div>
              <div class="field">
                <label for="ee-amount">Amount (${ui.currency()})</label>
                <input id="ee-amount" type="number" min="0" value="${x.amount}" inputmode="numeric">
              </div>
              <div class="field">
                <label for="ee-note">Note</label>
                <input id="ee-note" type="text" maxlength="60" value="${ui.esc(x.note || '')}">
              </div>
              <div class="field span-2">
                <label>Paid from</label>
                <div class="chips" id="ee-method">
                  ${['Cash', 'MoMo', 'Bank'].map(function (mm) {
                    return '<button type="button" class="chip' + (mm === x.method ? ' selected' : '') + '">' + mm + '</button>';
                  }).join('')}
                </div>
              </div>
            </div>
            <p class="hint">Amount changes update the books entry and the money boxes automatically.</p>
            <p class="auth-error" id="ee-error" hidden></p>
            <div class="modal-actions">
              <button class="btn" type="button" data-close="1">Cancel</button>
              <button class="btn btn-primary" type="submit">
                <i class="ti ti-check" aria-hidden="true"></i> Save changes
              </button>
            </div>
          </form>
        </div>`);

      var catChips = m.el.querySelector('#ee-category');
      var mChips = m.el.querySelector('#ee-method');
      /* make sure exactly one chip starts selected */
      if (!catChips.querySelector('.chip.selected')) catChips.firstElementChild.classList.add('selected');
      if (!mChips.querySelector('.chip.selected')) mChips.firstElementChild.classList.add('selected');
      BT.ui.bindChips(catChips);
      BT.ui.bindChips(mChips);

      var errEl = m.el.querySelector('#ee-error');

      m.el.querySelector('#edit-expense-form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var amount = ui.parseNum(m.el.querySelector('#ee-amount').value);
        if (!amount || amount <= 0) {
          errEl.textContent = 'Enter a valid amount.';
          errEl.hidden = false;
          return;
        }

        st.updateExpense(x.id, {
          category: catChips.querySelector('.chip.selected').textContent.trim(),
          amount: amount,
          note: m.el.querySelector('#ee-note').value.trim(),
          method: mChips.querySelector('.chip.selected').textContent.trim()
        }).then(function (ok) {
          if (ok === false) return;
          m.close();
          ui.toast('Expense updated');
          load();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        });
      });
    }

    /* ---------- delete modal ---------- */

    function deleteModal(x) {
      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-trash" aria-hidden="true"></i> Delete expense?</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Delete <b>${ui.esc(x.note || x.category)}</b> for <b>${ui.fmtMoney(x.amount)}</b>?</p>
          <p class="hint">The money returns to the ${ui.esc(x.method || 'Cash')} box and the books entry is removed.</p>
          <p class="auth-error" id="de-error" hidden></p>
          <div class="modal-actions">
            <button class="btn" type="button" data-close="1">Cancel</button>
            <button class="btn btn-danger" type="button" id="de-confirm">
              <i class="ti ti-trash" aria-hidden="true"></i> Delete
            </button>
          </div>
        </div>`);

      var errEl = m.el.querySelector('#de-error');

      m.el.querySelector('#de-confirm').addEventListener('click', function () {
        st.deleteExpense(x.id).then(function (ok) {
          if (ok === false) return;
          m.close();
          ui.toast('Expense deleted — money returned to the box');
          load();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        });
      });
    }

    /* ---------- load & wire ---------- */

    function load() {
      st.expenseHistory(50).then(function (rows) {
        list = rows;
        el.innerHTML = tableHTML();

        /* wired on the fresh #exp-card each render, so the
           listener never stacks across re-renders */
        var card = el.querySelector('#exp-card');
        card.addEventListener('click', function (e) {
          var editBtn = e.target.closest('.edit-btn');
          if (editBtn) {
            var id = Number(editBtn.getAttribute('data-id'));
            var x = list.find(function (v) { return v.id === id; });
            if (x) editModal(x);
            return;
          }
          var delBtn = e.target.closest('.delete-btn');
          if (delBtn) {
            var id2 = Number(delBtn.getAttribute('data-id'));
            var y = list.find(function (v) { return v.id === id2; });
            if (y) deleteModal(y);
          }
        });
      });
    }

    load();
  }
};
