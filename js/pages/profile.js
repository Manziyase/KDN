/* ============================================================
   BizTrack Lite — Profile page

   View & edit your account (name, phone, shop name) and change
   your password. Requires sign-in (the router's gate enforces it).
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.profile = {
  title: 'My profile',

  render: function (el) {
    var user = BT.auth ? BT.auth.user : null;

    if (!user) {
      el.innerHTML = `
        <div class="form-card card">
          <p class="empty">Please sign in to view your profile.</p>
          <a class="btn btn-primary btn-block" href="#/signin">Sign in</a>
        </div>`;
      return;
    }

    var initials = user.name.split(/\s+/).map(function (w) { return w[0]; })
      .join('').slice(0, 2).toUpperCase();

    el.innerHTML = `
      <div class="profile-wrap">

        <div class="card profile-head-card">
          <span class="avatar avatar-lg">${BT.ui.esc(initials)}</span>
          <div class="profile-id">
            <h2>${BT.ui.esc(user.name)}</h2>
            <p>${BT.ui.esc(user.email)}</p>
            <div class="profile-tags">
              <span class="badge ok">${BT.ui.esc(user.role)}</span>
              ${user.shopName ? `<span class="badge neutral">${BT.ui.esc(user.shopName)}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-user-edit" aria-hidden="true"></i> Edit profile</h2></div>
          <div class="card-body">
            <form id="profile-form" novalidate>
              <div class="form-grid">
                <div class="field">
                  <label for="pf-name">Full name</label>
                  <input id="pf-name" type="text" maxlength="80" value="${BT.ui.esc(user.name)}">
                </div>
                <div class="field">
                  <label for="pf-shop">Shop name</label>
                  <input id="pf-shop" type="text" maxlength="80" value="${BT.ui.esc(user.shopName || '')}"
                         placeholder="e.g. KDN Shop">
                </div>
                <div class="field span-2">
                  <label for="pf-phone">Phone</label>
                  <input id="pf-phone" type="tel" maxlength="30" value="${BT.ui.esc(user.phone || '')}"
                         placeholder="+250 7…">
                </div>
              </div>
              <button class="btn btn-primary" type="submit">
                <i class="ti ti-device-floppy" aria-hidden="true"></i> Save profile
              </button>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-lock" aria-hidden="true"></i> Change password</h2></div>
          <div class="card-body">
            <form id="password-form" novalidate>
              <div class="form-grid">
                <div class="field">
                  <label for="pw-current">Current password</label>
                  <input id="pw-current" type="password" autocomplete="current-password">
                </div>
                <div class="field">
                  <label for="pw-new">New password</label>
                  <input id="pw-new" type="password" autocomplete="new-password"
                         minlength="8" placeholder="At least 8 characters">
                </div>
              </div>
              <button class="btn" type="submit">
                <i class="ti ti-key" aria-hidden="true"></i> Update password
              </button>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-logout" aria-hidden="true"></i> Session</h2></div>
          <div class="card-body">
            <button class="btn btn-danger" id="profile-signout" type="button">
              <i class="ti ti-logout" aria-hidden="true"></i> Sign out
            </button>
          </div>
        </div>

      </div>`;

    /* ---------- edit profile ---------- */

    el.querySelector('#profile-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = el.querySelector('#pf-name').value.trim();
      if (name.length < 2) {
        BT.ui.toast('Name is too short');
        return;
      }
      BT.auth.saveProfile({
        name: name,
        shopName: el.querySelector('#pf-shop').value.trim(),
        phone: el.querySelector('#pf-phone').value.trim()
      }).then(function () {
        BT.app.updateUserChip();
        BT.router.render();
        BT.ui.toast('Profile updated');
      }).catch(function (err) {
        BT.ui.toast(err.message);
      });
    });

    /* ---------- change password ---------- */

    el.querySelector('#password-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var current = el.querySelector('#pw-current').value;
      var next = el.querySelector('#pw-new').value;

      if (!current || !next) {
        BT.ui.toast('Fill in both password fields');
        return;
      }
      if (next.length < 8) {
        BT.ui.toast('New password must be at least 8 characters');
        return;
      }
      BT.auth.saveProfile({ password: current, newPassword: next })
        .then(function () {
          el.querySelector('#pw-current').value = '';
          el.querySelector('#pw-new').value = '';
          BT.ui.toast('Password updated');
        })
        .catch(function (err) {
          BT.ui.toast(err.message);
        });
    });

    /* ---------- sign out ---------- */

    el.querySelector('#profile-signout').addEventListener('click', function () {
      BT.app.signOut();
    });
  }
};
