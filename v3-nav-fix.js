(() => {
  'use strict';

  function removeMusicUI() {
    const audio = document.getElementById('musicAudio');
    try { audio?.pause(); } catch (_) {}

    [
      '#musicPlayer', '#musicPanel', '#musicAudio',
      '.music-player', '.music-library-panel', '.music-panel',
      '.mobile-music-slot', '.music-library'
    ].forEach(selector => {
      document.querySelectorAll(selector).forEach(node => node.remove());
    });

    document.querySelectorAll('audio').forEach(node => {
      if (node.id === 'musicAudio' || /music\//i.test(node.getAttribute('src') || '')) {
        try { node.pause(); } catch (_) {}
        node.remove();
      }
    });

    try {
      ['pa_music_index','pa_music_time','pa_music_playing','pa_music_suggestions']
        .forEach(key => localStorage.removeItem(key));
    } catch (_) {}
  }

  const musicKillStyle = document.createElement('style');
  musicKillStyle.dataset.paNoMusic = '1';
  musicKillStyle.textContent = '#musicPlayer,#musicPanel,#musicAudio,.music-player,.music-library-panel,.music-panel,.mobile-music-slot,.music-library{display:none!important;visibility:hidden!important;pointer-events:none!important}';
  document.head.appendChild(musicKillStyle);
  removeMusicUI();

  const musicObserver = new MutationObserver(removeMusicUI);
  musicObserver.observe(document.documentElement, { childList: true, subtree: true });

  if (!document.querySelector('link[data-pa-theme-bridge]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'v3-theme-bridge.css?v=1';
    link.dataset.paThemeBridge = '1';
    document.head.appendChild(link);
  }

  if (!document.querySelector('link[data-pa-v43-stability]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'v43-stability.css?v=1';
    link.dataset.paV43Stability = '1';
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[data-pa-v43-stability]')) {
    const script = document.createElement('script');
    script.src = 'v43-stability.js?v=1';
    script.defer = true;
    script.dataset.paV43Stability = '1';
    document.head.appendChild(script);
  }

  const currentPage = location.pathname.split('/').pop() || 'index.html';
  if (currentPage === 'editor-painel.html') {
    if (!document.querySelector('link[data-pa-v44-avatar]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'v44-avatar-fix.css?v=1';
      link.dataset.paV44Avatar = '1';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-pa-v44-avatar]')) {
      const script = document.createElement('script');
      script.src = 'v44-avatar-fix.js?v=1';
      script.defer = true;
      script.dataset.paV44Avatar = '1';
      document.head.appendChild(script);
    }
    if (!document.querySelector('link[data-pa-v45-profile-appearance]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'v45-profile-appearance.css?v=2';
      link.dataset.paV45ProfileAppearance = '1';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-pa-v45-profile-appearance]')) {
      const script = document.createElement('script');
      script.src = 'v45-profile-appearance.js?v=2';
      script.defer = true;
      script.dataset.paV45ProfileAppearance = '1';
      document.head.appendChild(script);
    }
  }

  if (currentPage === 'editor-perfil.html') {
    if (!document.querySelector('link[data-pa-v45-profile-appearance]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'v45-profile-appearance.css?v=2';
      link.dataset.paV45ProfileAppearance = '1';
      document.head.appendChild(link);
    }
  }

  if (currentPage === 'editor-painel.html' || currentPage === 'editores.html') {
    if (!document.querySelector('link[data-pa-v46-professional-profile]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'v46-professional-profile.css?v=1';
      link.dataset.paV46ProfessionalProfile = '1';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-pa-v46-professional-profile]')) {
      const script = document.createElement('script');
      script.src = 'v46-professional-profile.js?v=1';
      script.defer = true;
      script.dataset.paV46ProfessionalProfile = '1';
      document.head.appendChild(script);
    }
  }

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
      script.src = 'mobile-reference.js?v=2';
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

    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

    const last = url.pathname.split('/').pop() || '';
    const extension = last.includes('.') ? last.split('.').pop().toLowerCase() : '';
    if (extension && !['html', 'htm'].includes(extension)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = url.href;
  }, true);
})();
