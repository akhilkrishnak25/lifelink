(function () {
  function setActiveLink() {
    const path = (window.location.pathname || '').split('/').pop() || 'home.html';
    document.querySelectorAll('.sidebar a.nav-item').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === path) a.classList.add('active');
    });
  }

  function fillUserCard() {
    const user = window.Session?.getUser?.();
    if (!user) return;

    const nameEl = document.getElementById('sidebarUserName');
    const metaEl = document.getElementById('sidebarUserMeta');

    if (nameEl) nameEl.textContent = user.name || 'User';
    if (metaEl) metaEl.textContent = user.email || '';
  }

  function bindMobileToggle() {
    const btn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (!btn || !sidebar || !backdrop) return;

    function open() {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    }

    function close() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    }

    btn.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) close();
      else open();
    });

    backdrop.addEventListener('click', close);

    document.querySelectorAll('.sidebar a.nav-item').forEach((a) => {
      a.addEventListener('click', close);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setActiveLink();
    fillUserCard();
    bindMobileToggle();
  });
})();
