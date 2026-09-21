/* ============================================================
   BizTrack Lite — API client

   Thin fetch wrapper for the Node.js backend. When the app is
   served by the server itself (http://localhost:3000) requests
   go to the same origin. When the page is served by something
   else (VS Code Live Server, another static server, or even a
   plain file://), same-origin /api doesn't exist — so we probe
   once and fall back to http://localhost:3000/api.
   ============================================================ */

window.BT = window.BT || {};

BT.api = (function () {
  'use strict';

  /* Same host as the page, API port: keeps requests same-site so
     the SameSite=Lax session cookie is always sent (localhost vs
     127.0.0.1 would count as cross-site for cookies). */
  var DEV_BASE = 'http://' + (location.hostname || 'localhost') + ':3000/api';

  var BASE = location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : '/api';

  /* The session cookie is HttpOnly — fetch must send it. Same-origin
     requests do this by default; cross-origin (Live Server → :3000)
     needs explicit credentials + a non-wildcard CORS origin, so ask
     the server to echo our Origin (server.js already does). */
  function crossOrigin() { return BASE.indexOf('http') === 0; }

  /* --- probe: is the Node API actually at BASE? ---

     /api/health only exists on the Node server and always answers
     JSON { ok:true, database:… }. A proxy/static server that lacks
     the API answers HTML (404 page, directory listing) or plain 404.
     So: res.ok && JSON body with ok !== false  →  the API is here.

     Returns true if the request reached the Node API. */
  function apiExists(path) {
    return fetch(BASE + path, {
      method: 'GET',
      credentials: crossOrigin() ? 'include' : 'same-origin',
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (data) {
        return !!(data && data.ok !== false);
      }, function () { return false; }); /* non-JSON body → not the API */
    }).catch(function () { return false; });
  }

  /* One shared probe for every request: parallel callers (boot
     fires /bootstrap and /auth/me at the same time) all await the
     same promise, so nobody ever requests the wrong base. */
  var probePromise = null;

  /* Called before API requests when we're not sure which base to
     use (and again via BT.api.reprobe() from the offline banner).
     If same-origin /api is missing but the dev server answers,
     retarget all requests at it. */
  function probe() {
    if (BASE === DEV_BASE) return Promise.resolve();
    if (!probePromise) {
      probePromise = apiExists('/health').then(function (ok) {
        if (!ok) BASE = DEV_BASE;
      });
    }
    return probePromise;
  }

  function request(method, path, body) {
    return probe().then(function () {
      return fetch(BASE + path, {
        method: method,
        credentials: crossOrigin() ? 'include' : 'same-origin',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      }).catch(function () {
        /* network error, CORS block, server down — fetch gives a
           bare TypeError; turn it into something a human can act on */
        throw new Error('Cannot reach the server — is "npm start" running?');
      });
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
    get base() { return BASE; },
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body || {}); },
    put: function (path, body) { return request('PUT', path, body || {}); },
    del: function (path) { return request('DELETE', path); },
    /* Re-probe after "Try to reconnect" (signin.js offline banner):
       lets a Live Server session adopt the API once `npm start` runs. */
    reprobe: function () {
      probePromise = null;
      return probe();
    }
  };
})();
