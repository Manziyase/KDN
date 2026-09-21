/* ============================================================
   BizTrack Lite — Auth hub (first screen, no app shell)

   One full-screen card with tabs:
     • Sign in   — email + password (+ demo shortcut)
     • Sign up   — create an account
     • Forgot    — request a reset link for your email
     • Reset     — set a new password (opened from that link:
                   #/reset?token=…)

   A status pill shows whether the API + MySQL are reachable;
   when they are not, the hub explains exactly how to fix it and
   offers one-click reconnection plus offline demo browsing.
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

(function () {
  'use strict';

  /* ---------- shared helpers ---------- */

  function statusHTML() {
    var online = BT.store.online;
    var pill = online
      ? '<span class="srv-dot ok"></span><span>Server connected</span>'
      : '<span class="srv-dot bad"></span><span>Server offline · demo mode</span>';
    return '<div class="auth-status" id="auth-status">' + pill + '</div>';
  }

  function refreshStatusEl() {
    var el = document.getElementById('auth-status');
    if (!el) return;
    var online = BT.store.online;
    el.innerHTML = online
      ? '<span class="srv-dot ok"></span><span>Server connected</span>'
      : '<span class="srv-dot bad"></span><span>Server offline · demo mode</span>';
  }

  function afterAuth() {
    BT.ui.toast('Signed in — welcome back!');
    BT.app.updateUserChip();
    BT.app.setStatus();
    BT.router.navigate('dashboard');
  }

  /* Server-offline banner shown above whichever form is open */
  function offlineHTML() {
    if (BT.store.online) return '';
    return `
      <div class="auth-offline">
        <p><strong>Can't sign in — the server isn't running.</strong></p>
        <ol>
          <li>Open <strong>XAMPP Control Panel</strong> → press <strong>Start</strong> on <strong>MySQL</strong>.</li>
          <li>In the project folder run <code>npm start</code>.</li>
          <li>Come back and press the button below.</li>
        </ol>
        <div class="auth-offline-actions">
          <button class="btn btn-sm btn-primary" type="button" id="auth-retry">
            <i class="ti ti-refresh" aria-hidden="true"></i> Try to reconnect
          </button>
          <button class="btn btn-sm" type="button" id="auth-demo">
            <i class="ti ti-eye" aria-hidden="true"></i> Explore demo instead
          </button>
        </div>
      </div>`;
  }

  function wireOfflineActions(el, rerender) {
    var retry = el.querySelector('#auth-retry');
    if (retry) {
      retry.addEventListener('click', function () {
        retry.disabled = true;
        retry.innerHTML = '<i class="ti ti-loader-2" aria-hidden="true"></i> Checking…';
        BT.store.reconnect().then(function (ok) {
          if (ok) {
            BT.ui.toast('Connected! You can sign in now.');
            refreshStatusEl();
            rerender();
          } else {
            BT.ui.toast('Still offline — is MySQL started and "npm start" running?');
            rerender();
          }
        });
      });
    }
    var demo = el.querySelector('#auth-demo');
    if (demo) {
      demo.addEventListener('click', function () {
        BT.app.demoVisit = true;
        BT.router.navigate('dashboard');
      });
    }
  }

  function tabsHTML(active) {
    function tab(id, icon, label) {
      return '<button type="button" class="auth-tab' + (active === id ? ' active' : '') +
        '" data-tab="' + id + '"><i class="ti ' + icon + '" aria-hidden="true"></i>' + label + '</button>';
    }
    return '<div class="auth-tabs">' +
      tab('signin', 'ti-login-2', 'Sign in') +
      tab('signup', 'ti-user-plus', 'Sign up') +
      tab('forgot', 'ti-key', 'Forgot?') +
      '</div>';
  }

  /* Route #/signin | #/signup | #/forgot to the right tab of the
     same card so switching never loses the page context. */
  function authTab(name) {
    return name === 'signup' ? 'signup' : name === 'forgot' ? 'forgot' : 'signin';
  }

  function goTab(tab) {
    BT.router.navigate(tab === 'signin' ? 'home' : tab);
  }

  /* ---------- error helper ---------- */

  function failer(el, sel) {
    var box = el.querySelector(sel);
    return function (msg) {
      box.textContent = msg;
      box.hidden = false;
    };
  }

  /* ============================================================
     BT.pages.home — the auth hub itself (first screen)
     ============================================================ */

  BT.pages.home = {
    title: 'Welcome',

    render: function (el) {
      var t = authTab('signin');

      el.innerHTML = `
        <div class="auth-wrap">
          <div class="auth-card card">
            <div class="auth-brand">
              <span class="brand-dot"></span> BizTrack <small>Lite</small>
            </div>
            <h1>Run your shop, one clear screen at a time.</h1>
            <p class="auth-sub">Sales, expenses, stock, customers &amp; money boxes — in one place.</p>

            ${statusHTML()}
            ${tabsHTML(t)}
            ${offlineHTML()}

            <form id="signin-form" novalidate>
              <div class="field">
                <label for="si-email">Email</label>
                <input id="si-email" type="email" autocomplete="email" placeholder="you@example.com" required>
              </div>
              <div class="field">
                <label for="si-password">Password</label>
                <input id="si-password" type="password" autocomplete="current-password" placeholder="••••••••" required>
              </div>
              <p class="auth-error" id="si-error" hidden></p>
              <button class="btn btn-primary btn-block btn-lg" type="submit">
                <i class="ti ti-login-2" aria-hidden="true"></i> Sign in
              </button>
              <p class="auth-forgot"><a href="#/forgot">Forgot password?</a></p>
            </form>

            <p class="auth-hint">Demo account: <code>demo@biztrack.app</code> · <code>demo1234</code></p>
          </div>
          <p class="auth-foot">Local-first shop management · MySQL-backed · your data stays on your machine</p>
        </div>`;

      /* switch tabs */
      el.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab]');
        if (tab) goTab(tab.getAttribute('data-tab'));
      });

      wireOfflineActions(el, function () { BT.router.render(); });

      /* ---------- sign in ---------- */

      var form = el.querySelector('#signin-form');
      var fail = failer(el, '#si-error');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        fail('').hidden = true;

        var email = el.querySelector('#si-email').value.trim();
        var password = el.querySelector('#si-password').value;

        if (!BT.store.online) {
          fail('The server is offline — start MySQL + "npm start", then press "Try to reconnect".');
          return;
        }
        if (!email || !password) {
          fail('Enter your email and password.');
          return;
        }

        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        BT.auth.login(email, password).then(afterAuth).catch(function (err) {
          fail(err.message);
          btn.disabled = false;
        });
      });
    }
  };

  /* ============================================================
     BT.pages.signin — same hub, sign-in tab (deep link target)
     ============================================================ */

  BT.pages.signin = {
    title: 'Sign in',
    render: function (el) { BT.pages.home.render(el); }
  };

  /* ============================================================
     Sign up
     ============================================================ */

  BT.pages.signup = {
    title: 'Create account',

    render: function (el) {
      el.innerHTML = `
        <div class="auth-wrap">
          <div class="auth-card card">
            <div class="auth-brand">
              <span class="brand-dot"></span> BizTrack <small>Lite</small>
            </div>
            <h1>Create your account</h1>
            <p class="auth-sub">Set up BizTrack for your shop — it takes a minute.</p>

            ${statusHTML()}
            ${tabsHTML('signup')}
            ${offlineHTML()}

            <form id="signup-form" novalidate>
              <div class="field">
                <label for="su-name">Your name</label>
                <input id="su-name" type="text" maxlength="80" placeholder="e.g. Aline Uwase" required>
              </div>
              <div class="field">
                <label for="su-shop">Shop name <small>(optional)</small></label>
                <input id="su-shop" type="text" maxlength="80" placeholder="e.g. Aline's Duka">
              </div>
              <div class="field">
                <label for="su-email">Email</label>
                <input id="su-email" type="email" autocomplete="email" placeholder="you@example.com" required>
              </div>
              <div class="field">
                <label for="su-password">Password</label>
                <input id="su-password" type="password" autocomplete="new-password"
                       minlength="8" placeholder="At least 8 characters" required>
              </div>
              <div class="field">
                <label for="su-confirm">Confirm password</label>
                <input id="su-confirm" type="password" autocomplete="new-password"
                       minlength="8" placeholder="Repeat the password" required>
              </div>

              <p class="auth-error" id="su-error" hidden></p>
              <button class="btn btn-primary btn-block btn-lg" type="submit">
                <i class="ti ti-user-plus" aria-hidden="true"></i> Create account
              </button>
            </form>

            <p class="auth-hint">Already registered? <a href="#/home">Sign in instead</a></p>
          </div>
          <p class="auth-foot">Local-first shop management · MySQL-backed · your data stays on your machine</p>
        </div>`;

      el.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab]');
        if (tab) goTab(tab.getAttribute('data-tab'));
      });

      wireOfflineActions(el, function () { BT.router.render(); });

      var form = el.querySelector('#signup-form');
      var fail = failer(el, '#su-error');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        fail('').hidden = true;

        var name = el.querySelector('#su-name').value.trim();
        var shopName = el.querySelector('#su-shop').value.trim();
        var email = el.querySelector('#su-email').value.trim();
        var password = el.querySelector('#su-password').value;
        var confirm = el.querySelector('#su-confirm').value;

        if (!BT.store.online) {
          fail('The server is offline — start MySQL + "npm start", then press "Try to reconnect".');
          return;
        }
        if (name.length < 2) return fail('Please enter your name.');
        if (password.length < 8) return fail('Password must be at least 8 characters.');
        if (password !== confirm) return fail('The two passwords do not match.');

        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        BT.auth.signup({ name: name, shopName: shopName, email: email, password: password })
          .then(function () {
            BT.ui.toast('Account created — welcome to BizTrack!');
            BT.app.updateUserChip();
            BT.app.setStatus();
            BT.router.navigate('dashboard');
          })
          .catch(function (err) {
            fail(err.message);
            btn.disabled = false;
          });
      });
    }
  };

  /* ============================================================
     Forgot password
     ============================================================ */

  BT.pages.forgot = {
    title: 'Forgot password',

    render: function (el) {
      el.innerHTML = `
        <div class="auth-wrap">
          <div class="auth-card card">
            <div class="auth-brand">
              <span class="brand-dot"></span> BizTrack <small>Lite</small>
            </div>
            <h1>Reset your password</h1>
            <p class="auth-sub">Enter the email on your account and we'll generate a reset link.</p>

            ${statusHTML()}
            ${tabsHTML('forgot')}

            <form id="forgot-form" novalidate>
              <div class="field">
                <label for="fp-email">Email</label>
                <input id="fp-email" type="email" autocomplete="email" placeholder="you@example.com" required>
              </div>
              <p class="auth-error" id="fp-error" hidden></p>
              <button class="btn btn-primary btn-block btn-lg" type="submit">
                <i class="ti ti-key" aria-hidden="true"></i> Get reset link
              </button>
            </form>

            <div id="fp-result" hidden></div>

            <p class="auth-hint">Remembered it? <a href="#/home">Back to sign in</a></p>
          </div>
          <p class="auth-foot">BizTrack runs on your machine — there is no mail server, so the reset link appears right here.</p>
        </div>`;

      el.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab]');
        if (tab) goTab(tab.getAttribute('data-tab'));
      });

      var form = el.querySelector('#forgot-form');
      var fail = failer(el, '#fp-error');
      var result = el.querySelector('#fp-result');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        fail('').hidden = true;
        result.hidden = true;

        var email = el.querySelector('#fp-email').value.trim();
        if (!BT.store.online) {
          fail('The server is offline — start MySQL + "npm start", then try again.');
          return;
        }
        if (!email) return fail('Enter the email on your account.');

        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        BT.auth.requestReset(email).then(function (r) {
          btn.disabled = false;
          result.hidden = false;
          if (r && r.resetLink) {
            result.innerHTML = `
              <div class="auth-reset-link">
                <p><i class="ti ti-circle-check" aria-hidden="true"></i> <strong>Reset link ready</strong></p>
                <p class="small">Open it and choose a new password. The link works for 30 minutes.</p>
                <a class="btn btn-primary btn-block" href="${r.resetLink}">
                  <i class="ti ti-arrow-right" aria-hidden="true"></i> Set a new password
                </a>
              </div>`;
          } else {
            result.innerHTML = `
              <div class="auth-reset-link">
                <p><i class="ti ti-info-circle" aria-hidden="true"></i> ${r && r.message ? r.message : 'Request received.'}</p>
              </div>`;
          }
        }).catch(function (err) {
          fail(err.message);
          btn.disabled = false;
        });
      });
    }
  };

  /* ============================================================
     Reset — #/reset?token=… (opened from the forgot-password link)
     ============================================================ */

  BT.pages.reset = {
    title: 'Set new password',

    render: function (el, query) {
      var token = (query && query.token) || '';

      el.innerHTML = `
        <div class="auth-wrap">
          <div class="auth-card card">
            <div class="auth-brand">
              <span class="brand-dot"></span> BizTrack <small>Lite</small>
            </div>
            <h1>Set a new password</h1>
            <p class="auth-sub">Choose something strong — at least 8 characters.</p>

            ${statusHTML()}

            <form id="reset-form" novalidate>
              <div class="field">
                <label for="rs-password">New password</label>
                <input id="rs-password" type="password" autocomplete="new-password"
                       minlength="8" placeholder="At least 8 characters" required>
              </div>
              <div class="field">
                <label for="rs-confirm">Confirm new password</label>
                <input id="rs-confirm" type="password" autocomplete="new-password"
                       minlength="8" placeholder="Repeat the password" required>
              </div>

              <p class="auth-error" id="rs-error" hidden></p>
              <button class="btn btn-primary btn-block btn-lg" type="submit">
                <i class="ti ti-lock" aria-hidden="true"></i> Save new password
              </button>
            </form>

            <p class="auth-hint"><a href="#/home">Back to sign in</a></p>
          </div>
        </div>`;

      var form = el.querySelector('#reset-form');
      var fail = failer(el, '#rs-error');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        fail('').hidden = true;

        var password = el.querySelector('#rs-password').value;
        var confirm = el.querySelector('#rs-confirm').value;

        if (!BT.store.online) {
          fail('The server is offline — start MySQL + "npm start", then try again.');
          return;
        }
        if (!token) return fail('This link is missing its token — request a new reset link.');
        if (password.length < 8) return fail('Password must be at least 8 characters.');
        if (password !== confirm) return fail('The two passwords do not match.');

        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        BT.auth.resetPassword(token, password).then(function () {
          BT.ui.toast('Password updated — sign in with it now.');
          BT.router.navigate('home');
        }).catch(function (err) {
          fail(err.message);
          btn.disabled = false;
        });
      });
    }
  };
})();