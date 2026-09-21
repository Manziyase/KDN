/* ============================================================
   BizTrack Lite — client-side auth

   Holds the signed-in user (BT.auth.user), talks to the
   /api/auth/* endpoints, and keeps session state in one place.
   The server stores the real session (HttpOnly cookie + MySQL).
   ============================================================ */

window.BT = window.BT || {};

BT.auth = (function () {
  'use strict';

  var user = null;

  function init() {
    if (!BT.api) return Promise.resolve(null);
    return BT.api.get('/auth/me').then(function (r) {
      user = (r && r.user) || null;
      return user;
    }).catch(function () {
      user = null;
      return null;
    });
  }

  function login(email, password) {
    return BT.api.post('/auth/login', { email: email, password: password })
      .then(function () { return init(); });
  }

  function signup(data) {
    return BT.api.post('/auth/signup', data)
      .then(function () { return init(); });
  }

  function logout() {
    return BT.api.post('/auth/logout').then(function () {
      user = null;
    });
  }

  function saveProfile(data) {
    return BT.api.post('/auth/profile', data).then(function () {
      return init(); /* refresh the cached user */
    });
  }

  /* Ask for a password-reset token, then (with it) set a new
     password. Two calls because the UI shows them as two steps. */
  function requestReset(email) {
    return BT.api.post('/auth/forgot', { email: email });
  }

  function resetPassword(token, password) {
    return BT.api.post('/auth/reset', { token: token, password: password });
  }

  return {
    init: init,
    login: login,
    signup: signup,
    logout: logout,
    saveProfile: saveProfile,
    requestReset: requestReset,
    resetPassword: resetPassword,
    get user() { return user; },
    set user(v) { user = v; }
  };
})();
