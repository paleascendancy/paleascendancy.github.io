(() => {
  'use strict';

  const CARD_STYLES = new Set(['editorial','glass','frame','spotlight']);
  const BORDER_STYLES = new Set(['minimal','halo','aurora','chrome','circuit','pulse']);

  const getChecked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const safeCard = value => CARD_STYLES.has(value) ? value : 'editorial';
  const safeBorder = value => BORDER_STYLES.has(value) ? value : 'minimal';

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

  function bindChoices() {
    document.querySelectorAll('input[name="avatarBorderStyle"],input[name="profileCardStyle"]').forEach(input => {
      if (input.dataset.v45Bound === '1') return;
      input.dataset.v45Bound = '1';
      input.addEventListener('change', applyPreview);
      const option = input.closest('.profile-style-option');
      if (option && option.dataset.v45Bound !== '1') {
        option.dataset.v45Bound = '1';
        option.addEventListener('click', event => {
          if (event.target === input) return;
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
    });
    applyPreview();
  }

  function syncAvatarVisibility() {
    const pairs = [
      ['avatarImage','avatarInitial'],
      ['profileAppearanceImage','profileAppearanceInitial']
    ];
    pairs.forEach(([imageId, initialId]) => {
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

  const boot = () => {
    bindChoices();
    syncAvatarVisibility();
    const observer = new MutationObserver(() => {
      bindChoices();
      syncAvatarVisibility();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked','hidden','src'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();