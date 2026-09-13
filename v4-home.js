(() => {
  'use strict';

  function forceHomeVisible() {
    if (!document.body.classList.contains('v4-home')) return;

    document.querySelectorAll('[data-v4-reveal]').forEach(node => {
      node.classList.add('is-visible');
      node.style.setProperty('opacity', '1', 'important');
      node.style.setProperty('visibility', 'visible', 'important');
      node.style.setProperty('transform', 'none', 'important');
      node.style.setProperty('filter', 'none', 'important');
      node.style.setProperty('clip-path', 'none', 'important');
    });
  }

  function boot() {
    forceHomeVisible();
    requestAnimationFrame(forceHomeVisible);
    setTimeout(forceHomeVisible, 60);
    setTimeout(forceHomeVisible, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  /* Chrome/Android pode restaurar a página inteira pelo back-forward cache. */
  window.addEventListener('pageshow', forceHomeVisible);
  window.addEventListener('popstate', forceHomeVisible);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) forceHomeVisible();
  });
})();
