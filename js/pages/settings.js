/* ============================================================
   BizTrack Lite — Settings page

   Theme (light/dark), accent color, language and currency.
   Every change applies instantly and is saved — first to
   localStorage, then to the signed-in user's MySQL profile.
   ============================================================ */

window.BT = window.BT || {};
BT.pages = BT.pages || {};

BT.pages.settings = {
  title: 'Settings',

  render: function (el) {
    var t = BT.i18n ? BT.i18n.t : function (k) { return k; };

    /* ---------- Theme ---------- */

    var themeCards = ['light', 'dark'].map(function (mode) {
      var sel = BT.prefs.theme === mode ? ' selected' : '';
      var icon = mode === 'light' ? 'ti-sun-high' : 'ti-moon-stars';
      return `
        <button type="button" class="theme-card${sel}" data-theme="${mode}">
          <span class="tc-preview ${mode === 'dark' ? 'tc-dark' : ''}"></span>
          <i class="ti ${icon}" aria-hidden="true"></i>${t(mode)}
        </button>`;
    }).join('');

    /* ---------- Accent colors ---------- */

    var accents = [
      ['navy', '#003366'], ['emerald', '#0f6e56'], ['violet', '#534ab7'],
      ['amber', '#b45309'], ['rose', '#993556'], ['slate', '#334155']
    ].map(function (a) {
      var sel = BT.prefs.accent === a[0] ? ' selected' : '';
      return `<button type="button" class="swatch${sel}" data-accent="${a[0]}"
                style="background:${a[1]}" aria-label="Accent ${a[0]}"></button>`;
    }).join('');

    /* ---------- Language ---------- */

    var langs = (BT.i18n ? BT.i18n.languages : [['en', 'English']]).map(function (l) {
      var sel = BT.prefs.language === l[0] ? ' selected' : '';
      return `<button type="button" class="lang-row${sel}" data-lang="${l[0]}">
                <span>${l[1]}</span>
                <i class="ti ${sel ? 'ti-circle-check' : 'ti-circle'}" aria-hidden="true"></i>
              </button>`;
    }).join('');

    /* ---------- Currency ---------- */

    var currencies = ['RWF', 'KES', 'UGX', 'TZS', 'USD', 'EUR', 'NGN', 'GHS'].map(function (c) {
      var sel = BT.prefs.currency === c ? ' selected' : '';
      return `<button type="button" class="lang-row${sel}" data-currency="${c}">
                <span>${c === 'RWF' ? c + ' · Rwandan Franc' :
                       c === 'KES' ? c + ' · Kenyan Shilling' :
                       c === 'UGX' ? c + ' · Ugandan Shilling' :
                       c === 'TZS' ? c + ' · Tanzanian Shilling' :
                       c === 'NGN' ? c + ' · Nigerian Naira' :
                       c === 'GHS' ? c + ' · Ghanaian Cedi' : c}</span>
                <i class="ti ${sel ? 'ti-circle-check' : 'ti-circle'}" aria-hidden="true"></i>
              </button>`;
    }).join('');

    el.innerHTML = `
      <div class="settings-wrap">

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-palette" aria-hidden="true"></i> ${t('appearance')}</h2></div>
          <div class="card-body">
            <label class="set-label">${t('theme')}</label>
            <div class="theme-cards">${themeCards}</div>

            <label class="set-label">${t('accent_color')}</label>
            <div class="swatches">${accents}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-language" aria-hidden="true"></i> ${t('language')}</h2></div>
          <div class="card-body lang-list">${langs}</div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-coins" aria-hidden="true"></i> ${t('currency')}</h2></div>
          <div class="card-body lang-list">${currencies}</div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-user-cog" aria-hidden="true"></i> ${t('profile')}</h2></div>
          <div class="card-body">
            <a class="btn btn-block" href="#/profile">
              <i class="ti ti-user-edit" aria-hidden="true"></i> Edit your profile
            </a>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2><i class="ti ti-rocket" aria-hidden="true"></i> Start from zero</h2></div>
          <div class="card-body">
            <p class="hint">Handing the app to a new user? This removes <b>all</b> products, customers,
            sales, expenses and ledger history, and sets every money box to 0 — a pristine shop
            ready for real data. Your login is kept.</p>
            <button class="btn btn-danger btn-block" id="zero-btn" type="button">
              <i class="ti ti-eraser" aria-hidden="true"></i> Start from zero
            </button>
          </div>
        </div>

      </div>`;

    /* ---------- Start from zero (double-confirm) ---------- */

    el.querySelector('#zero-btn').addEventListener('click', function () {
      var m = BT.ui.modal(`
        <div class="modal-head">
          <h2><i class="ti ti-eraser" aria-hidden="true"></i> Start from zero?</h2>
          <button class="icon-btn" type="button" data-close="1" aria-label="Close">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>This permanently removes <b>everything</b>:</p>
          <ul>
            <li>All products and stock</li>
            <li>All customers and their balances</li>
            <li>All sales, expenses and payments</li>
            <li>The whole cash ledger</li>
          </ul>
          <p>Every money box goes to <b>0</b>. Your account stays signed in.
          <b>This cannot be undone.</b></p>
          <div class="field">
            <label for="zz-confirm">Type <b>ZERO</b> to confirm</label>
            <input id="zz-confirm" type="text" autocomplete="off" placeholder="ZERO">
          </div>
          <p class="auth-error" id="zz-error" hidden></p>
          <div class="modal-actions">
            <button class="btn" type="button" data-close="1">Cancel</button>
            <button class="btn btn-danger" type="button" id="zz-go" disabled>
              <i class="ti ti-eraser" aria-hidden="true"></i> Erase everything
            </button>
          </div>
        </div>`);

      var input = m.el.querySelector('#zz-confirm');
      var goBtn = m.el.querySelector('#zz-go');
      var errEl = m.el.querySelector('#zz-error');

      input.addEventListener('input', function () {
        goBtn.disabled = input.value.trim().toUpperCase() !== 'ZERO';
      });

      goBtn.addEventListener('click', function () {
        goBtn.disabled = true;
        BT.store.zeroOut().then(function (ok) {
          if (ok === false) {
            errEl.textContent = 'Could not reset — try again.';
            errEl.hidden = false;
            goBtn.disabled = false;
            return;
          }
          m.close();
          BT.ui.toast('Fresh start — everything is at zero');
          BT.router.render();
        }).catch(function (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
          goBtn.disabled = false;
        });
      });
    });

    function persist() {
      BT.store.applyPrefs({
        currency: BT.prefs.currency,
        language: BT.prefs.language,
        theme: BT.prefs.theme,
        accent: BT.prefs.accent
      });
    }

    el.addEventListener('click', function (e) {
      var themeBtn = e.target.closest('[data-theme]');
      var accentBtn = e.target.closest('[data-accent]');
      var langBtn = e.target.closest('[data-lang]');
      var curBtn = e.target.closest('[data-currency]');

      if (themeBtn) {
        BT.prefs.theme = themeBtn.getAttribute('data-theme');
        BT.app.applyTheme(BT.prefs.theme);
        el.querySelectorAll('[data-theme]').forEach(function (b) {
          b.classList.toggle('selected', b === themeBtn);
        });
        persist();
      }

      if (accentBtn) {
        BT.prefs.accent = accentBtn.getAttribute('data-accent');
        BT.app.applyAccent(BT.prefs.accent);
        el.querySelectorAll('[data-accent]').forEach(function (b) {
          b.classList.toggle('selected', b === accentBtn);
        });
        persist();
      }

      if (langBtn) {
        BT.prefs.language = langBtn.getAttribute('data-lang');
        if (BT.i18n) BT.i18n.setLang(BT.prefs.language);
        el.querySelectorAll('[data-lang]').forEach(function (b) {
          b.classList.toggle('selected', b === langBtn);
          var icon = b.querySelector('i');
          if (icon) icon.className = 'ti ' + (b === langBtn ? 'ti-circle-check' : 'ti-circle');
        });
        persist();
        BT.ui.toast('Language saved');
      }

      if (curBtn) {
        BT.prefs.currency = curBtn.getAttribute('data-currency');
        el.querySelectorAll('[data-currency]').forEach(function (b) {
          b.classList.toggle('selected', b === curBtn);
          var icon = b.querySelector('i');
          if (icon) icon.className = 'ti ' + (b === curBtn ? 'ti-circle-check' : 'ti-circle');
        });
        persist();
        BT.router.render(); /* re-render every amount in the new currency */
      }
    });
  }
};
