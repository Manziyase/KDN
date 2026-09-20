/* ============================================================
   BizTrack Lite — Sign in / Sign up pages (full-screen, no shell)
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

(function () {
  'use strict';

  function shell(inner) {
    return `
      <div class="auth-wrap">
        <div class="auth-card card">
          <div class="auth-brand">
            <span class="brand-dot"></span> BizTrack <small>Lite</small>
          </div>
          ${inner}
        </div>
        <a class="auth-back" href="#/home"><i class="ti ti-arrow-left"></i> Back to home</a>
      </div>`;
  }

  /* ---------- Sign in ---------- */

  BT.pages.signin = {
    title: 'Sign in',

    render: function (el) {
      el.innerHTML = shell(`
        <h1>Welcome back</h1>
        <p class="auth-sub">Sign in to manage your shop.</p>

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
        </form>

        <p class="auth-switch">New here? <a href="#/signup">Create an account</a></p>
        <p class="auth-hint">Demo account: <code>demo@biztrack.app</code> · <code>demo1234</code></p>
      `);

      var form = el.querySelector('#signin-form');
      var errEl = el.querySelector('#si-error');

      function fail(msg) {
        errEl.textContent = msg;
        errEl.hidden = false;
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        errEl.hidden = true;

        var email = el.querySelector('#si-email').value.trim();
        var password = el.querySelector('#si-password').value;

        if (!BT.store.online) {
          fail('The server is not running — start MySQL + "npm start", then try again.');
          return;
        }
        if (!email || !password) {
          fail('Enter your email and password.');
          return;
        }

        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        BT.auth.login(email, password).then(function () {
          BT.ui.toast('Signed in — welcome back!');
          BT.app.updateUserChip();
          BT.app.setStatus();
          BT.router.navigate('dashboard');
        }).catch(function (err) {
          fail(err.message);
          btn.disabled = false;
        });
      });
    }
  };

  /* ---------- Sign up ---------- */

  BT.pages.signup = {
    title: 'Create account',

    render: function (el) {
      el.innerHTML = shell(`
        <h1>Create your account</h1>
        <p class="auth-sub">Set up BizTrack for your shop — it takes a minute.</p>

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

          <p class="auth-error" id="su-error" hidden></p>

          <button class="btn btn-primary btn-block btn-lg" type="submit">
            <i class="ti ti-user-plus" aria-hidden="true"></i> Create account
          </button>
        </form>

        <p class="auth-switch">Already registered? <a href="#/signin">Sign in</a></p>
      `);

      var form = el.querySelector('#signup-form');
      var errEl = el.querySelector('#su-error');

      function fail(msg) {
        errEl.textContent = msg;
        errEl.hidden = false;
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        errEl.hidden = true;

        var name = el.querySelector('#su-name').value.trim();
        var shopName = el.querySelector('#su-shop').value.trim();
        var email = el.querySelector('#su-email').value.trim();
        var password = el.querySelector('#su-password').value;

        if (!BT.store.online) {
          fail('The server is not running — start MySQL + "npm start", then try again.');
          return;
        }
        if (name.length < 2) return fail('Please enter your name.');
        if (password.length < 8) return fail('Password must be at least 8 characters.');

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
})();
