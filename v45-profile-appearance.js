(() => {
  'use strict';

  const SB_URL = 'https://fnyellunugdfesprmvzm.supabase.co';
  const SB_KEY = 'sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK';
  const CARD_STYLES = new Set(['editorial','glass','frame','spotlight']);
  const BORDER_STYLES = new Set(['minimal','halo','aurora','chrome','circuit','pulse']);
  let client = null;
  let saveTimer = 0;
  let hydrated = false;

  const getChecked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const safeCard = value => CARD_STYLES.has(value) ? value : 'editorial';
  const safeBorder = value => BORDER_STYLES.has(value) ? value : 'minimal';

  async function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient) {
      await new Promise(resolve => {
        const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
        if (existing) {
          if (window.supabase?.createClient) return resolve();
          existing.addEventListener('load', resolve, { once:true });
          existing.addEventListener('error', resolve, { once:true });
          setTimeout(resolve, 1800);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
      });
    }
    if (!window.supabase?.createClient) return null;
    client = window.supabase.createClient(SB_URL, SB_KEY, {
      auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    return client;
  }

  function applyPreview() {
    const preview = document.getElementById('profileAppearancePreview');
    if (!preview) return;

    const card = safeCard(getChecked('profileCardStyle'));
    const border = safeBorder(getChecked('avatarBorderStyle'));

    preview.dataset.cardStyle = card;
    [...CARD_STYLES].forEach(style => preview.classList.toggle(`profile-card-${style}`, style === card));

    const frame = preview.querySelector('.profile-appearance-avatar-frame');
    if (frame) {
      [...BORDER_STYLES].forEach(style => frame.classList.toggle(`avatar-border-${style}`, style === border));
      frame.dataset.borderStyle = border;
    }

    document.querySelectorAll('input[name="avatarBorderStyle"],input[name="profileCardStyle"]').forEach(input => {
      const option = input.closest('.profile-style-option');
      if (!option) return;
      option.classList.toggle('is-selected', input.checked);
      option.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    });
  }

  function setStatus(text, state = '') {
    const el = document.getElementById('editorMessage');
    if (!el || !text) return;
    el.textContent = text;
    el.className = `auth-message${state ? ` ${state}` : ''}`;
  }

  async function persistAppearance() {
    if (!hydrated) return;
    const c = await getClient();
    if (!c) return;
    const { data } = await c.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;

    const avatar_border_style = safeBorder(getChecked('avatarBorderStyle'));
    const profile_card_style = safeCard(getChecked('profileCardStyle'));
    const result = await c.from('profile')
      .update({ avatar_border_style, profile_card_style, updated_at:new Date().toISOString() })
      .eq('id', user.id);

    if (result.error) {
      console.error('[Pale Ascendancy] appearance save:', result.error);
      setStatus(`Não foi possível salvar a aparência: ${result.error.message}`, 'error');
      return;
    }
    setStatus('Aparência atualizada.', 'success');
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistAppearance, 180);
  }

  function bindChoices() {
    document.querySelectorAll('input[name="avatarBorderStyle"],input[name="profileCardStyle"]').forEach(input => {
      if (input.dataset.v45Bound === '1') return;
      input.dataset.v45Bound = '1';
      input.addEventListener('change', () => {
        applyPreview();
        queueSave();
      });
      const option = input.closest('.profile-style-option');
      if (option && option.dataset.v45Bound !== '1') {
        option.dataset.v45Bound = '1';
        option.addEventListener('click', event => {
          if (event.target === input) return;
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles:true }));
        });
        option.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles:true }));
        });
      }
    });
    applyPreview();
  }

  async function hydrateFromProfile() {
    const c = await getClient();
    if (!c) { hydrated = true; return; }
    const { data } = await c.auth.getSession();
    const user = data?.session?.user;
    if (!user) { hydrated = true; return; }

    const result = await c.from('profile')
      .select('avatar_border_style,profile_card_style')
      .eq('id', user.id)
      .maybeSingle();

    if (result.data) {
      const border = safeBorder(result.data.avatar_border_style);
      const card = safeCard(result.data.profile_card_style);
      const borderInput = document.querySelector(`input[name="avatarBorderStyle"][value="${border}"]`);
      const cardInput = document.querySelector(`input[name="profileCardStyle"][value="${card}"]`);
      if (borderInput) borderInput.checked = true;
      if (cardInput) cardInput.checked = true;
    }
    hydrated = true;
    applyPreview();
  }

  function syncAvatarVisibility() {
    [['avatarImage','avatarInitial'],['profileAppearanceImage','profileAppearanceInitial']].forEach(([imageId,initialId]) => {
      const image = document.getElementById(imageId);
      const initial = document.getElementById(initialId);
      if (!image || !initial) return;
      const hasImage = !!image.getAttribute('src') && !image.hidden;
      initial.hidden = hasImage;
      initial.style.display = hasImage ? 'none' : '';
      image.style.display = hasImage ? 'block' : 'none';
    });
  }

  window.addEventListener('pa:avatar-updated', () => setTimeout(syncAvatarVisibility, 0));

  const boot = async () => {
    bindChoices();
    syncAvatarVisibility();
    await hydrateFromProfile();
    const observer = new MutationObserver(() => {
      bindChoices();
      syncAvatarVisibility();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();