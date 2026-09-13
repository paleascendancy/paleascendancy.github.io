(() => {
  'use strict';

  function normalizeHomeVisuals() {
    if (!document.body.classList.contains('v4-home')) return;

    document.querySelectorAll('[data-v4-reveal]').forEach(node => {
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
  }

  function setMenu(open) {
    const menu = document.getElementById('mobileMenu');
    const button = document.getElementById('menuButton');
    if (!menu || !button) return;

    menu.classList.toggle('open', !!open);
    menu.classList.toggle('active', !!open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('mobile-menu-open', !!open);
  }

  function initRobustMenu() {
    if (window.__PA_V52_MENU__) return;
    window.__PA_V52_MENU__ = true;

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const button = target.closest('#menuButton');
      if (button) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const menu = document.getElementById('mobileMenu');
        const open = !!menu && !(menu.classList.contains('open') || menu.classList.contains('active'));
        setMenu(open);
        return;
      }

      const menu = document.getElementById('mobileMenu');
      if (!menu || !(menu.classList.contains('open') || menu.classList.contains('active'))) return;

      if (target.closest('#mobileMenu a')) {
        setMenu(false);
        return;
      }

      if (!target.closest('#mobileMenu')) setMenu(false);
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMenu(false);
    }, true);

    window.addEventListener('pageshow', () => {
      normalizeHomeVisuals();
      setMenu(false);
    });
  }

  function boot() {
    normalizeHomeVisuals();
    initRobustMenu();
    setTimeout(normalizeHomeVisuals, 100);
    setTimeout(normalizeHomeVisuals, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) normalizeHomeVisuals();
  });
})();
