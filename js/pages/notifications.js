/* ============================================================
   BizTrack Lite — Notifications page

   Notifications are derived from store state:
   - items at/below their low-stock threshold
   - customers with an outstanding credit balance
   - daily reminders
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.notifications = {
  title: 'Notifications',

  render: function (el) {
    var ui = BT.ui;
    var st = BT.store;
    var s = st.state;

    var notes = [];

    st.lowStock().forEach(function (i) {
      notes.push({
        tint: 'amber',
        icon: 'ti-alert-triangle',
        title: ui.esc(i.name) + ' is running low',
        sub: 'Only ' + i.stock + ' left · restock recommended',
        badge: '<span class="badge low">Restock</span>',
        href: '#/inventory'
      });
    });

    s.customers.forEach(function (c) {
      if (c.balance > 0) {
        notes.push({
          tint: 'pink',
          icon: 'ti-coin',
          title: 'Credit reminder · ' + ui.esc(c.name),
          sub: ui.fmtMoney(c.balance) + ' outstanding · last payment ' + ui.esc(c.lastPayment),
          badge: '<span class="badge low">Follow up</span>',
          href: '#/add-payment?customer=' + c.id
        });
      }
    });

    notes.push({
      tint: 'blue',
      icon: 'ti-clock',
      title: 'Day close at 20:00',
      sub: 'Count cash and lock the till',
      badge: '',
      href: ''
    });

    var rows = notes.map(function (n) {
      var open = n.href ? `<a class="list-row" href="${n.href}">` : '<div class="list-row">';
      var close = n.href ? '</a>' : '</div>';
      return `${open}
        <span class="row-icon tint-${n.tint}"><i class="ti ${n.icon}" aria-hidden="true"></i></span>
        <div class="row-main">
          <strong>${n.title}</strong>
          <small>${n.sub}</small>
        </div>
        ${n.badge}
      ${close}`;
    }).join('');

    el.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2>${notes.length} notification${notes.length === 1 ? '' : 's'}</h2>
        </div>
        ${rows}
      </div>`;
  }
};
