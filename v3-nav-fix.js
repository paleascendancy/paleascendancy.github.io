(() => {
  'use strict';

  const page = location.pathname.split('/').pop() || 'index.html';

  function appendStyle(href, key) {
    if (document.querySelector(`link[data-pa-${key}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[`pa${key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()).replace(/^(.)/,m=>m.toUpperCase())}`] = '1';
    link.setAttribute(`data-pa-${key}`, '1');
    document.head.appendChild(link);
  }

  function appendScript(src, key) {
    if (document.querySelector(`script[data-pa-${key}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(`data-pa-${key}`, '1');
    document.head.appendChild(script);
  }

  function removeLegacyMusic() {
    try { ['pa_music_index','pa_music_time','pa_music_playing','pa_music_suggestions'].forEach(k => localStorage.removeItem(k)); } catch (_) {}
    document.querySelectorAll('#musicPlayer,#musicPanel,#musicAudio,.music-player,.music-library-panel,.music-panel,.mobile-music-slot,.music-library').forEach(node => node.remove());
    document.querySelectorAll('audio').forEach(node => {
      if (node.id === 'musicAudio' || /music\//i.test(node.getAttribute('src') || '')) {
        try { node.pause(); } catch (_) {}
        node.remove();
      }
    });
  }

  function bindMenu() {
    const button = document.getElementById('menuButton');
    const menu = document.getElementById('mobileMenu');
    if (!button || !menu || button.dataset.paV5Menu === '1') return;
    button.dataset.paV5Menu = '1';

    const setOpen = open => {
      menu.classList.toggle('open', open);
      menu.classList.toggle('active', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('mobile-menu-open', open);
    };

    button.addEventListener('click', event => {
      event.preventDefault();
      setOpen(!(menu.classList.contains('open') || menu.classList.contains('active')));
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('click', event => {
      if (!menu.classList.contains('open') || event.target.closest('#menuButton,#mobileMenu')) return;
      setOpen(false);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
  }

  /*
   * O script legado ainda possui navegação parcial (SPA). Isso quebra páginas que
   * dependem de JS/CSS específicos, principalmente a Home. Links entre arquivos
   * HTML voltam a usar navegação nativa completa; âncoras da página continuam suaves.
   */
  function enforceFullPageNavigation() {
    if (window.__PA_FULL_PAGE_NAV__) return;
    window.__PA_FULL_PAGE_NAV__ = true;

    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) return;

      let url;
      try { url = new URL(href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;

      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

      const last = url.pathname.split('/').pop() || '';
      const ext = last.includes('.') ? last.split('.').pop().toLowerCase() : '';
      if (ext && !['html','htm'].includes(ext)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(url.href);
    }, true);
  }

  /* V5 vira a camada visual canônica. */
  appendStyle('v47-unified-site.css?v=5', 'v5-unified');
  appendScript('pa-runtime.js?v=1', 'v5-runtime');

  /* Mantemos apenas patches que ainda contêm comportamento funcional real. */
  appendStyle('v43-stability.css?v=2', 'v43-stability');
  appendScript('v43-stability.js?v=2', 'v43-stability');

  if (page === 'editor-painel.html') {
    appendStyle('v44-avatar-fix.css?v=2', 'v44-avatar');
    appendScript('v44-avatar-fix.js?v=2', 'v44-avatar');
    appendStyle('v45-profile-appearance.css?v=3', 'v45-profile-appearance');
    appendScript('v45-profile-appearance.js?v=3', 'v45-profile-appearance');
  }

  if (page === 'editor-perfil.html') appendStyle('v45-profile-appearance.css?v=3', 'v45-profile-appearance');

  if (page === 'editor-painel.html' || page === 'editores.html') {
    appendStyle('v46-professional-profile.css?v=2', 'v46-professional-profile');
    appendScript('v46-professional-profile.js?v=2', 'v46-professional-profile');
  }

  /* V5.3: camada final mobile/contraste/menu, sempre após os patches legados. */
  appendStyle('v51-mobile-hotfix.css?v=2', 'v51-mobile-hotfix');
  appendScript('v51-hotfix.js?v=2', 'v51-hotfix');

  removeLegacyMusic();
  enforceFullPageNavigation();
  bindMenu();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeLegacyMusic();
      enforceFullPageNavigation();
      bindMenu();
    }, { once:true });
  }
  setTimeout(removeLegacyMusic, 400);
  setTimeout(removeLegacyMusic, 1400);
})();
