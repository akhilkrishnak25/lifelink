(function () {
  const TOKEN_KEY = 'token';
  const USER_KEY = 'user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    // Guard against stale token-only state causing false "logged in" redirects
    return !!getToken() && !!getUser();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  }

  function redirectIfLoggedIn() {
    if (!isLoggedIn()) return false;
    window.location.replace('home.html');
    return true;
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  window.Session = {
    getToken,
    getUser,
    isLoggedIn,
    requireAuth,
    redirectIfLoggedIn,
    setSession,
    clearSession,
  };
})();
