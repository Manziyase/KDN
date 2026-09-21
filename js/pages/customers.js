/* ============================================================
   BizTrack Lite — Customers page

   Lists everyone who buys on credit with their balance, and
   lets you manage the list:
     • Add customer
     • Rename  (pencil on each row)
     • Remove  (only when they no longer owe anything)
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.customers = {
  title: 'Customers',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var debtors = s.customers.filter(function (c) { return c.balance > 0; }).length;
    var owed = st.creditOwed();

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
          <td class="row-actions">
            <a class="btn btn-sm" href="#/add-payment?customer=${c.id}">Record payment</a>
            <button class="btn btn-sm rename-btn" data-id="${ui.esc(c.id)}" type="button"
                    aria-label="Rename ${ui.esc(c.name)}">
              <i class="ti ti-pencil" aria-hidden="true"></i> Rename
            </button>
            <button class="btn btn-sm delete-btn" data-id="${ui.esc(c.id)}"
                    data-name="${ui.esc(c.name)}" data-balance="${c.balance}" type="button"
                    aria-label="Remove ${ui.esc(c.name)}">
              <i class="ti ti-trash" aria-hidden="true"></i> Remove
            </button>
          </td>
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
        <div class="card-head">
          <h2>Customer credit</h2>
          <button class="btn btn-sm btn-primary" id="toggle-add-customer" type="button">
            <i class="ti ti-user-plus" aria-hidden="true"></i> Add customer
          </button>
        </div>

        <div class="add-item-panel" id="add-customer-panel" hidden>
          <form id="add-customer-form" novalidate>
            <div class="form-grid">
              <div class="field span-2">
                <label for="ac-name">Customer name</label>
                <input id="ac-name" type="text" maxlength="80" placeholder="e.g. Aline Uwase">
              </div>
            </div>
            <div class="panel-actions">
              <p class="hint">New customers start with a zero balance.</p>
              <div>
                <button class="btn" id="ac-cancel" type="button">Cancel</button>
                <button class="btn btn-primary" type="submit">
                  <i class="ti ti-check" aria-hidden="true"></i> Add customer
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Last payment</th>
                <th class="num">Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4" class="empty">No customers yet — add your first one above.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    /* ---------- Add customer ---------- */

    var panel = el.querySelector('#add-customer-panel');

    el.querySelector('#toggle-add-customer').addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) el.querySelector('#ac-name').focus();
    });
    el.querySelector('#ac-cancel').addEventListener('click', function () {
      panel.hidden = true;
    });

    el.querySelector('#add-customer-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (BT.app.demoGuard()) return;

      var name = el.querySelector('#ac-name').value.trim();
      if (name.length < 2) return ui.toast('Enter the customer name');

      st.addCustomer(name).then(function (ok) {
        if (ok === false) return; /* error surfaced by the store */
        ui.toast('Customer added — ' + name);
        BT.router.render();
      }).catch(function (err) { ui.toast(err.message); });
    });

    /* ---------- Rename customer (modal) ---------- */

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.rename-btn');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      var cust = st.state.customers.find(function (c) { return c.id === id; });
      if (!cust) return;

      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-pencil" aria-hidden="true"></i> Rename ${ui.esc(cust.name)}</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="rename-customer-form" novalidate>
            <div class="field">
              <label for="rc-name">Customer name</label>
              <input id="rc-name" type="text" maxlength="80" value="${ui.esc(cust.name)}">
            </div>
            <p class="auth-error" id="rc-error" hidden></p>
            <div class="modal-actions">
              <button class="btn" type="button" data-close="1">Cancel</button>
              <button class="btn btn-primary" type="submit">
                <i class="ti ti-check" aria-hidden="true"></i> Save
              </button>
            </div>
          </form>
        </div>`);

      var errEl = m.el.querySelector('#rc-error');

      m.el.querySelector('#rename-customer-form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var name = m.el.querySelector('#rc-name').value.trim();
        if (name.length < 2) {
          errEl.textContent = 'Enter the customer name.';
          errEl.hidden = false;
          return;
        }

        st.updateCustomer(id, name).then(function (ok) {
          if (ok === false) return;
          m.close();
          ui.toast('Customer renamed to ' + name);
          BT.router.render();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        });
      });
    });

    /* ---------- Remove customer (confirm modal) ---------- */

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.delete-btn');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      var name = btn.getAttribute('data-name');
      var balance = Number(btn.getAttribute('data-balance') || 0);

      var m = ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-trash" aria-hidden="true"></i> Remove ${ui.esc(name)}?</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>${balance > 0
            ? 'This customer still owes <b>' + ui.fmtMoney(balance) + '</b> — settle the balance before removing them.'
            : 'This removes them from your customer list. Their past payments stay in the books.'}</p>
          <p class="auth-error" id="dc-error" hidden></p>
          <div class="modal-actions">
            <button class="btn" type="button" data-close="1">Cancel</button>
            <button class="btn btn-danger" type="button" id="dc-confirm" ${balance > 0 ? 'disabled' : ''}>
              <i class="ti ti-trash" aria-hidden="true"></i> Remove customer
            </button>
          </div>
        </div>`);

      var errEl = m.el.querySelector('#dc-error');

      m.el.querySelector('#dc-confirm').addEventListener('click', function () {
        st.deleteCustomer(id).then(function (ok) {
          if (ok === false) return;
          m.close();
          ui.toast('Removed ' + name);
          BT.router.render();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        });
      });
    });
  }
};
