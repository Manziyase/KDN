/* ============================================================
   BizTrack Lite — UI helpers: formatting, toast, chip groups
   ============================================================ */

window.BT = window.BT || {};

BT.ui = (function () {
  'use strict';

  /* Escape untrusted text before inserting into HTML */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 1234567 -> "1,234,567" */
  function fmt(n) {
    return Math.round(n || 0).toLocaleString('en-US');
  }

  /* 1234567 -> "RWF 1,234,567" */
  function rwf(n) {
    return 'RWF ' + fmt(n);
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
    rwf: rwf,
    toast: toast,
    bindChips: bindChips
  };
})();
