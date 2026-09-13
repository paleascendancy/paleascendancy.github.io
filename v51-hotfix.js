(() => {
  'use strict';

  function normalizeHome() {
    document.querySelectorAll('.v4-home [data-v4-reveal]').forEach(node => {
      node.classList.add('is-visible');
      node.style.removeProperty('opacity');
      node.style.removeProperty('transform');
      node.style.removeProperty('filter');
      node.style.removeProperty('visibility');
    });

    document.querySelectorAll('.v4-cta .secondary-button').forEach(button => {
      const inline = button.getAttribute('style') || '';
      if (/color\s*:\s*#111/i.test(inline)) button.style.removeProperty('color');
      if (/border-color\s*:\s*rgba?\(0\s*,\s*0\s*,\s*0/i.test(inline)) button.style.removeProperty('border-color');
    });

    document.body.classList.remove('mobile-menu-open');
    const menu = document.getElementById('mobileMenu');
    const menuButton = document.getElementById('menuButton');
    menu?.classList.remove('open', 'active');
    menuButton?.setAttribute('aria-expanded', 'false');
  }

  function boot() {
    normalizeHome();
    setTimeout(normalizeHome, 120);
    setTimeout(normalizeHome, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  window.addEventListener('pageshow', normalizeHome);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) normalizeHome(); });
})();
