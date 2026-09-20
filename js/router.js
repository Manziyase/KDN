/* ============================================================
   BizTrack Lite — hash router

   Routes live at #/<name> (optionally #/<name>?key=value).
   Pages register themselves as BT.pages.<name> and are wired
   to routes in app.js. The router renders into #page, updates
   the topbar title / document title, and highlights the active
   sidebar link.
   ============================================================ */

window.BT = window.BT || {};

BT.router = (function () {
  'use strict';

  var routes = {};
  var container = null;
  var DEFAULT_ROUTE = 'home'; /* landing page comes first */

  function register(name, page) {
    routes[name] = page;
  }

  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('?');
    var name = parts[0] || DEFAULT_ROUTE;
    var query = {};

    (parts[1] || '').split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });

    if (!routes[name]) name = DEFAULT_ROUTE;
    return { name: name, query: query };
  }

  /* Notification count = low-stock items + customers with credit */
  function refreshBadge() {
    var count = BT.store.lowStock().length;
    BT.store.state.customers.forEach(function (c) {
      if (c.balance > 0) count++;
    });

    var badge = document.getElementById('nav-count');
    var dot = document.getElementById('bell-dot');
    if (badge) {
      badge.textContent = count;
      badge.hidden = count === 0;
    }
    if (dot) dot.hidden = count === 0;
  }

  function render() {
    if (!container) container = document.getElementById('page');
    var r = parse();
    var page = routes[r.name];

    /* Landing route renders without the app shell */
    document.body.classList.toggle('landing', r.name === 'home');

    container.innerHTML = '';
    page.render(container, r.query);

    document.getElementById('page-title').textContent = page.title;
    document.title = page.title + ' · BizTrack Lite';

    var links = document.querySelectorAll('.sidebar-nav a');
    Array.prototype.forEach.call(links, function (a) {
      var target = (a.getAttribute('href') || '').replace('#/', '').split('?')[0];
      var active = target === r.name;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    refreshBadge();

    if (BT.app && BT.app.closeSidebar) BT.app.closeSidebar();
    window.scrollTo(0, 0);
  }

  function start() {
    window.addEventListener('hashchange', render);
    render();
  }

  function navigate(name, query) {
    var q = '';
    if (query) {
      q = Object.keys(query).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
      }).join('&');
      q = q ? '?' + q : '';
    }
    if (parse().name === name && !q) {
      render(); /* same route — force refresh */
      return;
    }
    location.hash = '#/' + name + q;
  }

  return {
    register: register,
    start: start,
    navigate: navigate,
    render: render
  };
})();
