(() => {
  'use strict';

  if (window.__PA_RUNTIME_V5__) return;
  window.__PA_RUNTIME_V5__ = true;

  const MUSIC_KEYS = ['pa_music_index','pa_music_time','pa_music_playing','pa_music_suggestions'];
  const RESOURCE_SELECTOR = 'script[src],link[rel="stylesheet"][href]';
  let noticeTimer = 0;
  let lastNotice = '';

  function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function ensureNotice() {
    let notice = document.getElementById('paSystemNotice');
    if (notice) return notice;
    notice = document.createElement('div');
    notice.id = 'paSystemNotice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.innerHTML = '<span id="paSystemNoticeText"></span><button type="button" id="paSystemNoticeAction">Recarregar</button>';
    notice.querySelector('button')?.addEventListener('click', () => location.reload());
    document.body.appendChild(notice);
    return notice;
  }

  function showNotice(text, kind = 'info', action = true, ttl = 6500) {
    if (!text || (text === lastNotice && document.getElementById('paSystemNotice')?.classList.contains('is-visible'))) return;
    lastNotice = text;
    const notice = ensureNotice();
    notice.dataset.kind = kind;
    const label = notice.querySelector('#paSystemNoticeText');
    const button = notice.querySelector('#paSystemNoticeAction');
    if (label) label.textContent = text;
    if (button) button.hidden = !action;
    notice.classList.add('is-visible');
    clearTimeout(noticeTimer);
    if (ttl > 0) noticeTimer = setTimeout(() => notice.classList.remove('is-visible'), ttl);
  }

  function removeMusicArtifacts() {
    MUSIC_KEYS.forEach(safeStorageRemove);
    document.querySelectorAll('#musicPlayer,#musicPanel,#musicAudio,.music-player,.music-library-panel,.music-panel,.mobile-music-slot,.music-library').forEach(node => node.remove());
    document.querySelectorAll('audio').forEach(node => {
      const src = node.getAttribute('src') || '';
      if (/music\//i.test(src) || node.id === 'musicAudio') {
        try { node.pause(); } catch (_) {}
        node.remove();
      }
    });
  }

  function patchExternalLinks(root = document) {
    root.querySelectorAll('a[target="_blank"]').forEach(link => {
      const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener'); rel.add('noreferrer');
      link.setAttribute('rel', [...rel].join(' '));
    });
  }

  function bindImageFallbacks(root = document) {
    root.querySelectorAll('img:not([data-pa-fallback])').forEach(img => {
      img.dataset.paFallback = '1';
      img.addEventListener('error', () => {
        if (!img.isConnected) return;
        img.hidden = true;
        const parent = img.parentElement;
        if (parent && !parent.querySelector('.pa-resource-fallback')) {
          const fallback = document.createElement('div');
          fallback.className = 'pa-resource-fallback';
          fallback.textContent = 'Imagem indisponível';
          parent.appendChild(fallback);
        }
      }, { once: true });
    });
  }

  function resourceError(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.matches(RESOURCE_SELECTOR)) return;
    const url = target.getAttribute('src') || target.getAttribute('href') || '';
    if (/music\//i.test(url)) return;
    console.warn('[Pale Ascendancy] recurso não carregou:', url);
    showNotice('Um recurso do site não carregou corretamente. Você pode recarregar a página.', 'error', true, 9000);
  }

  function runtimeError(event) {
    const message = String(event?.message || '');
    if (/ResizeObserver loop/i.test(message)) return;
    console.warn('[Pale Ascendancy] falha de interface:', event?.error || message);
    showNotice('A interface encontrou um erro inesperado. Seus dados não foram apagados.', 'error', true, 9000);
  }

  function rejectionError(event) {
    const reason = event?.reason;
    if (reason?.name === 'AbortError') return;
    console.warn('[Pale Ascendancy] operação rejeitada:', reason);
    showNotice('Uma operação não foi concluída. Confira sua conexão e tente novamente.', 'error', true, 8500);
  }

  function syncNetworkStatus() {
    if (!navigator.onLine) {
      showNotice('Você está offline. Algumas áreas podem não carregar até a conexão voltar.', 'offline', false, 0);
      document.documentElement.dataset.network = 'offline';
    } else {
      document.documentElement.dataset.network = 'online';
      const notice = document.getElementById('paSystemNotice');
      if (notice?.dataset.kind === 'offline') {
        showNotice('Conexão restabelecida.', 'info', false, 2500);
      }
    }
  }

  function boot() {
    removeMusicArtifacts();
    patchExternalLinks();
    bindImageFallbacks();
    syncNetworkStatus();

    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches?.('#musicPlayer,#musicPanel,audio') || node.querySelector?.('#musicPlayer,#musicPanel,audio')) removeMusicArtifacts();
          patchExternalLinks(node);
          bindImageFallbacks(node);
        });
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 4500);
  }

  window.addEventListener('error', resourceError, true);
  window.addEventListener('error', runtimeError);
  window.addEventListener('unhandledrejection', rejectionError);
  window.addEventListener('offline', syncNetworkStatus);
  window.addEventListener('online', syncNetworkStatus);

  window.PaleAscendancy = Object.freeze({
    version:'5.0',
    notify:showNotice,
    guard(fn, fallback = null) {
      try { return fn(); } catch (error) { console.warn('[Pale Ascendancy] guard:', error); return fallback; }
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
