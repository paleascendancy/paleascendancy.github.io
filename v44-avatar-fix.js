(() => {
  'use strict';

  const SB_URL = 'https://fnyellunugdfesprmvzm.supabase.co';
  const SB_KEY = 'sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK';
  let client = null;

  const sleepReject = (ms, message) => new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });

  async function ensureClient() {
    if (client) return client;
    if (!window.supabase?.createClient) {
      await new Promise((resolve) => {
        const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
        if (existing) {
          if (window.supabase?.createClient) return resolve();
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', resolve, { once: true });
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
    if (!window.supabase?.createClient) throw new Error('Não foi possível conectar ao envio de imagens.');
    client = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  function setStatus(text, state = '') {
    const status = document.getElementById('avatarStatus');
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state;
  }

  function setPreview(url) {
    const pairs = [
      ['avatarImage', 'avatarInitial'],
      ['profileAppearanceImage', 'profileAppearanceInitial'],
      ['headerProfileImage', 'headerProfileInitial']
    ];
    pairs.forEach(([imageId, initialId]) => {
      const image = document.getElementById(imageId);
      const initial = document.getElementById(initialId);
      if (!image) return;
      image.src = url;
      image.hidden = false;
      if (initial) initial.hidden = true;
    });
  }

  async function uploadAvatar(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'avatarFile') return;

    // Esta camada assume o upload para evitar que os listeners antigos concorram entre si.
    event.stopImmediatePropagation();

    const file = input.files?.[0];
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setStatus('Use uma imagem JPG, PNG ou WebP.', 'error');
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus('A foto precisa ter até 8 MB.', 'error');
      input.value = '';
      return;
    }

    const temporaryUrl = URL.createObjectURL(file);
    setPreview(temporaryUrl);
    setStatus('Enviando foto…', 'loading');
    input.disabled = true;

    try {
      const c = await ensureClient();
      const sessionResult = await Promise.race([
        c.auth.getSession(),
        sleepReject(10000, 'A sessão demorou para responder. Tente novamente.')
      ]);
      const user = sessionResult?.data?.session?.user;
      if (!user) throw new Error('Sua sessão expirou. Entre novamente na área profissional.');

      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const upload = await Promise.race([
        c.storage.from('avatars').upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: '3600'
        }),
        sleepReject(30000, 'O envio demorou demais. Verifique sua internet e tente novamente.')
      ]);
      if (upload?.error) throw upload.error;

      const publicUrl = c.storage.from('avatars').getPublicUrl(path).data?.publicUrl;
      if (!publicUrl) throw new Error('A imagem foi enviada, mas não foi possível gerar o endereço público.');

      const profileUpdate = await Promise.race([
        c.from('profile').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id),
        sleepReject(15000, 'A foto foi enviada, mas o perfil demorou para atualizar.')
      ]);
      if (profileUpdate?.error) throw profileUpdate.error;

      setPreview(`${publicUrl}?v=${Date.now()}`);
      try {
        const cached = JSON.parse(localStorage.getItem('pa_profile_cache') || '{}');
        localStorage.setItem('pa_profile_cache', JSON.stringify({ ...cached, avatar_url: publicUrl }));
      } catch (_) {}

      setStatus('Foto atualizada com sucesso.', 'success');
      input.value = '';
      window.dispatchEvent(new CustomEvent('pa:avatar-updated', { detail: { url: publicUrl } }));
    } catch (error) {
      console.error('[Pale Ascendancy] avatar upload:', error);
      setStatus(error?.message || 'Não foi possível enviar a foto. Tente novamente.', 'error');
    } finally {
      input.disabled = false;
      setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1200);
    }
  }

  function boot() {
    document.addEventListener('change', uploadAvatar, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();