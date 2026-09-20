/* ============================================================
   BizTrack Lite — Money Boxes page

   Answers "where is my money?" by splitting it into four boxes:
     • Cash box — physical cash in the shop
     • Bank box — money in the bank account
     • MoMo box — Mobile Money wallet
     • Credit box — money customers still owe (not spendable)
   Includes moving money between the real boxes (a deposit,
   a withdrawal, a wallet top-up…).
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.boxes = {
  title: 'Money boxes',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var b = st.boxes();

    var boxCard = function (icon, tint, label, value, hint) {
      return `
        <div class="card box-card">
          <div class="kpi-icon tint-${tint}"><i class="ti ${icon}" aria-hidden="true"></i></div>
          <div class="box-main">
            <p class="box-label">${label}</p>
            <p class="box-amount">${ui.fmtMoney(value)}</p>
            <p class="box-hint">${hint}</p>
          </div>
        </div>`;
    };

    /* ---------- transfer form ---------- */

    var boxOption = function (value, label) {
      return `<option value="${value}">${label}</option>`;
    };

    el.innerHTML = `
      <div class="stat-row">
        ${boxCard('ti-cash', 'green', 'Cash box', b.cash, 'Physical money in the shop')}
        ${boxCard('ti-building-bank', 'blue', 'Bank box', b.bank, 'Money in the bank account')}
        ${boxCard('ti-device-mobile', 'purple', 'MoMo box', b.momo, 'Mobile Money wallet')}
        ${boxCard('ti-users', 'amber', 'Credit box', b.credit, 'Owed by customers — not spendable')}
      </div>

      <div class="total-banner">
        <div>
          <p class="total-label">Total money (all boxes)</p>
          <p class="total-amount">${ui.fmtMoney(b.cash + b.bank + b.momo)}</p>
          <p class="total-sub">plus ${ui.fmtMoney(b.credit)} in credit — reachable when customers pay</p>
        </div>
        <i class="ti ti-wallet" aria-hidden="true"></i>
      </div>

      <div class="dash-grid">
        <div class="dash-col">

          <div class="card">
            <div class="card-head"><h2>Move money between boxes</h2></div>
            <div class="card-body">
              <form id="transfer-form" novalidate>
                <div class="form-grid">
                  <div class="field">
                    <label for="tr-from">From</label>
                    <select id="tr-from">
                      ${boxOption('cash', 'Cash box')}
                      ${boxOption('bank', 'Bank box')}
                      ${boxOption('momo', 'MoMo box')}
                    </select>
                  </div>
                  <div class="field">
                    <label for="tr-to">To</label>
                    <select id="tr-to">
                      ${boxOption('bank', 'Bank box')}
                      ${boxOption('cash', 'Cash box')}
                      ${boxOption('momo', 'MoMo box')}
                    </select>
                  </div>
                  <div class="field span-2">
                    <label for="tr-amount">Amount (${ui.currency()})</label>
                    <input id="tr-amount" type="text" inputmode="numeric" placeholder="e.g. 50,000">
                  </div>
                </div>
                <button class="btn btn-primary" type="submit">
                  <i class="ti ti-arrows-exchange" aria-hidden="true"></i> Transfer
                </button>
                <p class="hint">Tip: send money to the bank or top up MoMo from cash —
                transfers never change your total, only where it sits.</p>
              </form>
            </div>
          </div>

        </div>

        <div class="dash-col">

          <div class="card">
            <div class="card-head"><h2>How each box fills up</h2></div>
            <div class="card-body flow-list">
              <div class="flow-row">
                <span class="row-icon tint-green"><i class="ti ti-cash" aria-hidden="true"></i></span>
                <div class="row-main"><strong>Cash box</strong>
                <small>grows with cash sales &amp; cash payments; shrinks with cash expenses &amp; stock purchases</small></div>
              </div>
              <div class="flow-row">
                <span class="row-icon tint-purple"><i class="ti ti-device-mobile" aria-hidden="true"></i></span>
                <div class="row-main"><strong>MoMo box</strong>
                <small>grows with MoMo sales &amp; payments; shrinks when you pay expenses by MoMo</small></div>
              </div>
              <div class="flow-row">
                <span class="row-icon tint-blue"><i class="ti ti-building-bank" aria-hidden="true"></i></span>
                <div class="row-main"><strong>Bank box</strong>
                <small>grows with bank payments &amp; deposits; use the transfer form above</small></div>
              </div>
              <div class="flow-row">
                <span class="row-icon tint-amber"><i class="ti ti-users" aria-hidden="true"></i></span>
                <div class="row-main"><strong>Credit box</strong>
                <small>grows with credit sales; turns into real money when customers pay</small></div>
              </div>
            </div>
          </div>

        </div>
      </div>`;

    el.querySelector('#transfer-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var from = el.querySelector('#tr-from').value;
      var to = el.querySelector('#tr-to').value;
      var amount = ui.parseNum(el.querySelector('#tr-amount').value);

      if (from === to) {
        ui.toast('Choose two different boxes');
        return;
      }
      if (!amount || amount <= 0) {
        ui.toast('Enter a valid amount');
        return;
      }
      if ((st.state.boxes && (st.state.boxes[from] || 0) < amount)) {
        ui.toast('Not enough in the ' + from + ' box');
        return;
      }

      if (st.transferBoxes(from, to, amount)) {
        ui.toast('Moved ' + ui.fmtMoney(amount) + ' · ' + from + ' → ' + to);
        BT.router.render();
      } else {
        ui.toast('Transfer failed — check the amount');
      }
    });
  }
};
