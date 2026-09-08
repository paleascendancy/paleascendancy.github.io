(() => {
  'use strict';

  const SB_URL = 'https://fnyellunugdfesprmvzm.supabase.co';
  const SB_KEY = 'sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK';
  let client = null;

  function message(id, text, type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = `auth-message${type ? ` ${type}` : ''}`;
  }

  function ensureSdk() {
    if (window.supabase?.createClient) return Promise.resolve(true);
    if (window.__PA_V43_SDK_PROMISE__) return window.__PA_V43_SDK_PROMISE__;
    window.__PA_V43_SDK_PROMISE__ = new Promise(resolve => {
      const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
      if (existing) {
        const wait = () => resolve(!!window.supabase?.createClient);
        existing.addEventListener('load', wait, { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        setTimeout(wait, 1500);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => resolve(!!window.supabase?.createClient);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return window.__PA_V43_SDK_PROMISE__;
  }

  async function getClient() {
    if (client) return client;
    const ready = await ensureSdk();
    if (!ready) return null;
    client = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  async function professionalLogin(event) {
    const form = event.target instanceof Element ? event.target.closest('#professionalLoginForm') : null;
    if (!form) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const button = form.querySelector('button[type="submit"], #professionalLoginButton');
    const email = document.getElementById('email')?.value.trim() || '';
    const password = document.getElementById('senha')?.value || '';

    if (button) {
      button.disabled = true;
      button.textContent = 'Verificando acesso...';
    }
    message('professionalLoginMessage', '');

    try {
      const c = await getClient();
      if (!c) throw new Error('Não foi possível conectar ao serviço de autenticação.');

      const { data, error } = await c.auth.signInWithPassword({ email, password });
      if (error || !data?.user) throw new Error('E-mail ou senha incorretos, ou conta não confirmada.');

      const { data: profile, error: profileError } = await c.from('profile')
        .select('id,is_editor,is_designer,professional_login_enabled,is_public')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const professional = profile?.is_editor === true || profile?.is_designer === true;
      const enabled = profile?.professional_login_enabled === true;

      if (professional && enabled) {
        location.replace('editor-painel.html');
        return;
      }

      const { data: application } = await c.from('professional_applications')
        .select('status,requested_role,professional_login_enabled')
        .eq('profile_id', data.user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      await c.auth.signOut();

      if (application?.status === 'pending') {
        throw new Error('Sua solicitação profissional ainda está aguardando aprovação.');
      }
      if (application?.status === 'rejected') {
        throw new Error('Sua solicitação profissional foi recusada. Entre em contato com a administração se precisar de revisão.');
      }
      if (application?.status === 'approved') {
        throw new Error('A conta consta como aprovada, mas o acesso profissional não foi sincronizado. Atualize a página e tente novamente.');
      }
      throw new Error('Esta conta ainda não possui acesso profissional aprovado.');
    } catch (error) {
      message('professionalLoginMessage', error?.message || 'Não foi possível entrar na área profissional.', 'error');
      if (button) {
        button.disabled = false;
        button.textContent = 'Entrar na área profissional';
      }
    }
  }

  function syncChoiceGroup(name) {
    const inputs = [...document.querySelectorAll(`input[name="${name}"]`)];
    if (!inputs.length) return;

    const sync = () => {
      inputs.forEach(input => {
        const option = input.closest('.profile-style-option');
        option?.classList.toggle('is-selected', input.checked);
        option?.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      });
    };

    inputs.forEach(input => {
      const option = input.closest('.profile-style-option');
      if (!option || option.dataset.v43Ready === '1') return;
      option.dataset.v43Ready = '1';
      option.setAttribute('role', 'radio');
      option.tabIndex = 0;
      option.addEventListener('click', event => {
        if (event.target === input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      });
      option.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      });
      input.addEventListener('change', sync);
    });

    if (!inputs.some(input => input.checked)) inputs[0].checked = true;
    sync();
  }

  function initProfileCustomization() {
    syncChoiceGroup('avatarBorderStyle');
    syncChoiceGroup('profileCardStyle');

    const file = document.getElementById('avatarFile');
    const status = document.getElementById('avatarStatus');
    if (file && file.dataset.v43Ready !== '1') {
      file.dataset.v43Ready = '1';
      file.addEventListener('change', () => {
        const selected = file.files?.[0];
        if (!selected || !status) return;
        if (!/^image\/(jpeg|png|webp)$/i.test(selected.type)) {
          status.textContent = 'Use uma imagem JPG, PNG ou WebP.';
          file.value = '';
          return;
        }
        if (selected.size > 8 * 1024 * 1024) {
          status.textContent = 'A foto precisa ter até 8 MB.';
          file.value = '';
          return;
        }
        status.textContent = 'Imagem selecionada. Enviando...';
      }, { capture: true });
    }
  }

  document.addEventListener('submit', professionalLogin, true);

  const boot = () => {
    initProfileCustomization();
    const observer = new MutationObserver(() => initProfileCustomization());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();