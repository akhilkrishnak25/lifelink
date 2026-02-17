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

  function requireRole(...roles) {
    if (!requireAuth()) return false;
    const user = getUser();
    // Admin and super_admin can access all pages
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true;
    }
    // Check if user's role is in allowed roles
    if (!roles.includes(user.role)) {
      alert(`Access denied. This page requires: ${roles.join(' or ')}`);
      window.location.replace('home.html');
      return false;
    }
    return true;
  }

  function isAdmin() {
    const user = getUser();
    return user && (user.role === 'admin' || user.role === 'super_admin');
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
    requireRole,
    isAdmin,
    redirectIfLoggedIn,
    setSession,
    clearSession,
  };
})();
