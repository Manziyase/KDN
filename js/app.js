/* ============================================================
   BizTrack Lite — app bootstrap

   Boot sequence:
     1. Load saved prefs (currency/language/theme/accent) and
        apply them immediately (theme + accent + language).
     2. Fetch /api/bootstrap (shop data) and /api/auth/me
        (session) in parallel.
     3. Register pages and start the router. Pages under the
        app shell require sign-in; visitors are sent to #/signin.
   ============================================================ */

window.BT = window.BT || {};

BT.app = (function () {
  'use strict';

  /* Routes that are NOT part of the app shell (no sign-in needed) */
  var PUBLIC_ROUTES = ['home', 'signin', 'signup'];

  /* Which route greets a signed-in user / a signed-out visitor */
  function defaultRoute() {
    return BT.auth && BT.auth.user ? 'dashboard' : 'home';
  }

  /* ---------- Theme & accent ---------- */

  function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }

  function applyAccent(accent) {
    var root = document.documentElement;
    var MAP = {
      navy:    { main: '#003366', soft: '#e8eef7', on: '#ffffff' },
      emerald: { main: '#0f6e56', soft: '#e1f5ee', on: '#ffffff' },
      violet:  { main: '#534ab7', soft: '#eeedfe', on: '#ffffff' },
      amber:   { main: '#b45309', soft: '#fff8e1', on: '#ffffff' },
      rose:    { main: '#993556', soft: '#fbeaf0', on: '#ffffff' },
      slate:   { main: '#334155', soft: '#e8edf3', on: '#ffffff' }
    };
    var c = MAP[accent] || MAP.navy;
    root.style.setProperty('--navy', c.main);
    root.style.setProperty('--blue-bg', c.soft);
    root.style.setProperty('--accent-on', c.on);
  }

  function applyAllPrefs() {
    applyTheme(BT.prefs.theme);
    applyAccent(BT.prefs.accent);
    if (BT.i18n) BT.i18n.setLang(BT.prefs.language);
  }

  /* ---------- Shell chrome ---------- */

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

  /* Update the avatar initials + name everywhere they appear */
  function updateUserChip() {
    var user = BT.auth ? BT.auth.user : null;
    var initials = user
      ? user.name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase()
      : 'BT';
    var shop = user ? (user.shopName || user.name) : 'BizTrack Lite';
    var sub = user ? (user.email || '') : 'Offline demo mode';

    Array.prototype.forEach.call(document.querySelectorAll('.avatar'), function (a) {
      a.textContent = initials;
    });
    var nameEl = document.getElementById('user-name');
    var mailEl = document.getElementById('user-email');
    if (nameEl) nameEl.textContent = shop;
    if (mailEl) mailEl.textContent = sub;
  }

  /* ---------- Sign out ---------- */

  function signOut() {
    var done = function () {
      if (BT.auth) BT.auth.user = null;
      BT.router.navigate('home');
      if (BT.ui) BT.ui.toast('Signed out');
    };
    if (BT.store.online && BT.api) {
      BT.api.post('/auth/logout').catch(function () { /* ignore */ }).then(done);
    } else {
      done();
    }
  }

  /* ---------- Pages & routing ---------- */

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
    BT.router.register('signin', BT.pages.signin);
    BT.router.register('signup', BT.pages.signup);
    BT.router.register('settings', BT.pages.settings);
    BT.router.register('profile', BT.pages.profile);
    BT.router.register('boxes', BT.pages.boxes);
  }

  /* Signed-in users skip the landing page; visitors can't open
     app pages (they get redirected to the sign-in screen). */
  function gate(r) {
    var signedIn = !!(BT.auth && BT.auth.user);

    if (r.name === 'home' && signedIn) {
      BT.router.navigate('dashboard');
      return null;
    }
    if (PUBLIC_ROUTES.indexOf(r.name) === -1 && !signedIn) {
      BT.router.navigate('signin');
      return null;
    }
    return r;
  }

  function setStatus() {
    var el = document.getElementById('conn-status');
    if (!el) return;
    if (BT.store.online && BT.auth && BT.auth.user) {
      el.textContent = 'Connected to MySQL · signed in as ' + BT.auth.user.email;
    } else if (BT.store.online) {
      el.textContent = 'Connected to MySQL · not signed in';
    } else {
      el.textContent = 'Offline demo mode · data kept in this browser';
    }
  }

  function wireShell() {
    var menuBtn = document.getElementById('menu-btn');
    var overlay = document.getElementById('sidebar-overlay');
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    var signOutBtn = document.getElementById('signout-btn');
    if (signOutBtn) signOutBtn.addEventListener('click', signOut);
  }

  function init() {
    /* 1. Saved prefs first, so the theme doesn't flash */
    try {
      var raw = localStorage.getItem('biztrack-prefs');
      if (raw) Object.assign(BT.prefs, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    applyAllPrefs();

    /* 2. Shop data + session in parallel */
    Promise.all([
      BT.store.init(),
      BT.auth ? BT.auth.init() : Promise.resolve()
    ]).then(function () {
      /* user prefs override locally saved ones */
      if (BT.auth && BT.auth.user) {
        Object.assign(BT.prefs, BT.auth.user.prefs);
        applyAllPrefs();
        try {
          localStorage.setItem('biztrack-prefs', JSON.stringify(BT.prefs));
        } catch (e) { /* ignore */ }
      }

      BT.router.setDefaultRoute(defaultRoute());
      registerPages();
      wireShell();
      updateUserChip();
      setStatus();

      /* 3. Start routing (store.init may already have started it
         in the offline path — force one render now) */
      BT.router.start(true);

      var dateEl = document.getElementById('topbar-date');
      if (dateEl) dateEl.textContent = BT.store.state.date;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    closeSidebar: closeSidebar,
    applyTheme: applyTheme,
    applyAccent: applyAccent,
    applyAllPrefs: applyAllPrefs,
    updateUserChip: updateUserChip,
    signOut: signOut,
    setStatus: setStatus
  };
})();
