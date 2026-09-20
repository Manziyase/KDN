/* ============================================================
   BizTrack Lite — UI helpers: formatting, toast, chip groups

   All money display goes through money()/fmtMoney(), which uses
   the currency chosen on the Settings page (BT.prefs.currency,
   default RWF). ui.rwf() is kept as an alias so existing pages
   keep working.
   ============================================================ */

window.BT = window.BT || {};

BT.ui = (function () {
  'use strict';

  /* Escape untrusted text before inserting into HTML */
  function esc(s) {
    return String(s).replace(/[&<>\"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Currency ---------- */

  function currency() {
    return (BT.prefs && BT.prefs.currency) || 'RWF';
  }

  /* 1234567 -> "1,234,567" */
  function fmt(n) {
    return Math.round(n || 0).toLocaleString('en-US');
  }

  /* "1,234,567 RWF" */
  function fmtMoney(n) {
    return fmt(n) + ' ' + currency();
  }

  /* "RWF 1,234,567" — legacy alias, kept for existing pages */
  function rwf(n) {
    return currency() + ' ' + fmt(n);
  }

  /* Parse user input that may contain commas/spaces: "12,500" -> 12500 */
  function parseNum(value) {
    var n = parseFloat(String(value).replace(/[,\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /* ---------- Toast ---------- */

  var toastTimer = null;

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2200);
  }

  /* ---------- Chip groups (single-select) ----------
     container: element holding .chip buttons
     onChange(optional): receives the selected chip's text */
  function bindChips(container, onChange) {
    if (!container) return;
    container.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip || !container.contains(chip)) return;
      Array.prototype.forEach.call(container.querySelectorAll('.chip'), function (c) {
        c.classList.remove('selected');
      });
      chip.classList.add('selected');
      if (onChange) onChange(chip.textContent.trim());
    });
  }

  return {
    esc: esc,
    fmt: fmt,
    fmtMoney: fmtMoney,
    rwf: rwf,
    currency: currency,
    parseNum: parseNum,
    toast: toast,
    bindChips: bindChips
  };
})();
