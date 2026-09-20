/* ============================================================
   BizTrack Lite — app bootstrap

   Registers all pages with the router, wires the shell
   (sidebar drawer, topbar date) and starts routing.
   ============================================================ */

window.BT = window.BT || {};

BT.app = (function () {
  'use strict';

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    var overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.hidden = true;
    var btn = document.getElementById('menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleSidebar() {
    var open = document.body.classList.toggle('sidebar-open');
    var overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.hidden = !open;
    var btn = document.getElementById('menu-btn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

  function registerPages() {
    BT.router.register('home', BT.pages.home);
    BT.router.register('dashboard', BT.pages.dashboard);
    BT.router.register('new-sale', BT.pages.newSale);
    BT.router.register('new-expense', BT.pages.newExpense);
    BT.router.register('inventory', BT.pages.inventory);
    BT.router.register('customers', BT.pages.customers);
    BT.router.register('ledger', BT.pages.ledger);
    BT.router.register('add-payment', BT.pages.addPayment);
    BT.router.register('expenses', BT.pages.expenses);
    BT.router.register('notifications', BT.pages.notifications);
  }

  function setStatus() {
    var el = document.getElementById('conn-status');
    if (!el) return;
    var host = BT.api.base.indexOf('http') === 0
      ? BT.api.base.replace('/api', '')
      : location.origin;
    el.textContent = BT.store.online
      ? 'Connected to MySQL · API on ' + host
      : 'Offline demo mode · data kept in this browser';
  }

  function init() {
    var menuBtn = document.getElementById('menu-btn');
    var overlay = document.getElementById('sidebar-overlay');

    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    var dateEl = document.getElementById('topbar-date');
    if (dateEl) dateEl.textContent = BT.store.state.date;

    registerPages();

    /* Load state from the backend (or fall back to demo data)
       before rendering the first route */
    BT.store.init().then(function () {
      var dateEl2 = document.getElementById('topbar-date');
      if (dateEl2) dateEl2.textContent = BT.store.state.date;
      setStatus();
      BT.router.start();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    closeSidebar: closeSidebar
  };
})();
