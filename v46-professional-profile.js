(() => {
  'use strict';

  const SB_URL = 'https://fnyellunugdfesprmvzm.supabase.co';
  const SB_KEY = 'sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK';
  const CARD_STYLES = new Set(['editorial','glass','frame','spotlight']);
  const BORDER_STYLES = new Set(['minimal','halo','aurora','chrome','circuit','pulse']);
  let client = null;
  let syncingPanel = false;

  const page = () => location.pathname.split('/').pop() || 'index.html';
  const safeCard = value => CARD_STYLES.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'editorial';
  const safeBorder = value => BORDER_STYLES.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'minimal';

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

  function showImage(image, initial, url) {
    if (!image || !url) return;
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    if (!image.src || !image.src.startsWith(url)) image.src = finalUrl;
    image.hidden = false;
    image.style.display = 'block';
    image.style.opacity = '1';
    image.style.visibility = 'visible';
    if (initial) {
      initial.hidden = true;
      initial.style.display = 'none';
    }
  }

  function applyPanelAppearance(cardValue, borderValue) {
    const card = safeCard(cardValue);
    const border = safeBorder(borderValue);
    const preview = document.getElementById('profileAppearancePreview');

    const cardInput = document.querySelector(`input[name="profileCardStyle"][value="${card}"]`);
    const borderInput = document.querySelector(`input[name="avatarBorderStyle"][value="${border}"]`);
    if (cardInput) cardInput.checked = true;
    if (borderInput) borderInput.checked = true;

    if (preview) {
      CARD_STYLES.forEach(style => preview.classList.toggle(`profile-card-${style}`, style === card));
      preview.dataset.cardStyle = card;
      const frame = preview.querySelector('.profile-appearance-avatar-frame');
      if (frame) {
        BORDER_STYLES.forEach(style => frame.classList.toggle(`avatar-border-${style}`, style === border));
        frame.dataset.borderStyle = border;
      }
    }

    document.querySelectorAll('input[name="profileCardStyle"],input[name="avatarBorderStyle"]').forEach(input => {
      const option = input.closest('.profile-style-option');
      option?.classList.toggle('is-selected', input.checked);
      option?.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    });
  }

  async function syncProfessionalPanel() {
    if (page() !== 'editor-painel.html' || syncingPanel) return;
    syncingPanel = true;
    try {
      const c = await getClient();
      if (!c) return;
      const { data: sessionData } = await c.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;

      const { data: profile, error } = await c.from('profile')
        .select('nome,nome_artistico,avatar_url,avatar_border_style,profile_card_style')
        .eq('id', user.id)
        .maybeSingle();
      if (error || !profile) return;

      const displayName = profile.nome_artistico || profile.nome || 'Seu perfil';
      const appearanceName = document.getElementById('profileAppearanceName');
      const appearanceInitial = document.getElementById('profileAppearanceInitial');
      const avatarInitial = document.getElementById('avatarInitial');
      if (appearanceName) appearanceName.textContent = displayName;
      if (appearanceInitial) appearanceInitial.textContent = displayName.charAt(0).toUpperCase();
      if (avatarInitial) avatarInitial.textContent = displayName.charAt(0).toUpperCase();

      if (profile.avatar_url) {
        showImage(document.getElementById('avatarImage'), avatarInitial, profile.avatar_url);
        showImage(document.getElementById('profileAppearanceImage'), appearanceInitial, profile.avatar_url);
      }

      applyPanelAppearance(profile.profile_card_style, profile.avatar_border_style);
    } catch (error) {
      console.warn('[Pale Ascendancy] V4.6 panel sync:', error);
    } finally {
      syncingPanel = false;
    }
  }

  function professionalCtaLabel(card) {
    const role = (card.querySelector('.editor-role')?.textContent || '').toUpperCase();
    if (role.includes('EDITOR') && role.includes('DESIGNER')) return 'Ver profissional';
    if (role.includes('DESIGNER')) return 'Ver designer';
    if (role.includes('EDITOR')) return 'Ver editor';
    return 'Ver profissional';
  }

  function enhanceProfessionalDirectory() {
    const grid = document.getElementById('editorsGrid');
    if (!grid) return;
    grid.classList.add('pa-personalized-rail');

    grid.querySelectorAll('.editor-profile').forEach(card => {
      card.classList.add('pa-personalized-card');
      const link = card.querySelector('.card-link');
      if (!link) return;
      const label = professionalCtaLabel(card);
      link.classList.add('professional-card-cta');
      const name = card.querySelector('h2')?.textContent?.trim();
      if (name) link.setAttribute('aria-label', `${label}: ${name}`);

      if (link.dataset.v46Label !== label) {
        link.dataset.v46Label = label;
        link.replaceChildren(document.createTextNode(label));
        const arrow = document.createElement('span');
        arrow.className = 'professional-card-cta-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';
        link.appendChild(arrow);
      }
    });
  }

  function boot() {
    if (page() === 'editor-painel.html') {
      syncProfessionalPanel();
      window.addEventListener('pa:avatar-updated', () => setTimeout(syncProfessionalPanel, 80));
      window.addEventListener('focus', () => syncProfessionalPanel());
    }

    enhanceProfessionalDirectory();
    const observer = new MutationObserver(() => {
      enhanceProfessionalDirectory();
      if (page() === 'editor-painel.html') {
        const avatar = document.getElementById('avatarImage');
        if (avatar?.src && !avatar.hidden) {
          avatar.style.display = 'block';
          const initial = document.getElementById('avatarInitial');
          if (initial) { initial.hidden = true; initial.style.display = 'none'; }
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
