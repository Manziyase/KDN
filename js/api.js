/* ============================================================
   BizTrack Lite — API client

   Thin fetch wrapper for the Node.js backend. When the app is
   served by the server (http://localhost:3000) requests go to
   the same origin; when opened as a plain file they target the
   dev server explicitly.
   ============================================================ */

window.BT = window.BT || {};

BT.api = (function () {
  'use strict';

  var BASE = location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : '/api';

  /* The session cookie is HttpOnly — fetch must send it. Same-origin
     requests do this by default; cross-origin (file:// → :3000) needs
     explicit credentials + a non-wildcard CORS origin, so ask the
     server to echo ours. (The server keeps the wildcard default and
     reflects the Origin header when credentials are required.) */
  var CROSS = BASE.indexOf('http') === 0;

  function request(method, path, body) {
    return fetch(BASE + path, {
      method: method,
      credentials: CROSS ? 'include' : 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () {
        throw new Error('Bad response from server');
      });
    }).then(function (data) {
      if (data && data.ok === false) throw new Error(data.error || 'Request failed');
      return data;
    });
  }

  return {
    base: BASE,
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body || {}); }
  };
})();
