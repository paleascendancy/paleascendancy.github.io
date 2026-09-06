(() => {
  'use strict';

  // New visitors should opt in to music instead of having playback armed by default.
  try {
    if (localStorage.getItem('pa_music_playing') === null) {
      localStorage.setItem('pa_music_playing', '0');
    }
  } catch (_) {}

  // Homepage-only mobile reference layer. Kept separate so desktop remains easy to roll back.
  if (document.body.classList.contains('v3-home')) {
    if (!document.querySelector('link[data-pa-mobile-reference]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'v3-mobile-reference.css?v=1';
      link.dataset.paMobileReference = '1';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-pa-mobile-reference]')) {
      const script = document.createElement('script');
      script.src = 'mobile-reference.js?v=1';
      script.defer = true;
      script.dataset.paMobileReference = '1';
      document.head.appendChild(script);
    }
  }

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

    // Same-page anchors keep the browser's normal behavior.
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

    const last = url.pathname.split('/').pop() || '';
    const extension = last.includes('.') ? last.split('.').pop().toLowerCase() : '';
    if (extension && !['html', 'htm'].includes(extension)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = url.href;
  }, true);
})();
