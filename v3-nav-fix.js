(() => {
  'use strict';

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    const href = link.getAttribute('href') || '';
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;

    let url;
    try { url = new URL(href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin) return;

    // Same-page anchors should keep the browser's normal anchor behavior.
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

    const last = url.pathname.split('/').pop() || '';
    const extension = last.includes('.') ? last.split('.').pop().toLowerCase() : '';
    if (extension && !['html', 'htm'].includes(extension)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = url.href;
  }, true);
})();
