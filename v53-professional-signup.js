(() => {
  'use strict';

  if (window.__PA_V53_PRO_SIGNUP__) return;
  window.__PA_V53_PRO_SIGNUP__ = true;

  const SB_URL = 'https://fnyellunugdfesprmvzm.supabase.co';
  const SB_KEY = 'sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK';
  let client = null;

  function setMessage(text, type = '') {
    const el = document.getElementById('professionalRegisterMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = `auth-message${type ? ` ${type}` : ''}`;
  }

  async function ensureSupabase() {
    if (window.supabase?.createClient) return true;
    await new Promise(resolve => {
      const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
      if (existing) {
        if (window.supabase?.createClient) return resolve();
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', resolve, { once:true });
        setTimeout(resolve, 2000);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
    return !!window.supabase?.createClient;
  }

  async function getClient() {
    if (client) return client;
    if (!(await ensureSupabase())) return null;
    client = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    return client;
  }

  async function handleSubmit(event) {
    const form = event.target instanceof Element ? event.target.closest('#professionalRegisterForm') : null;
    if (!form) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const category = document.getElementById('categoryChoices')?.value || '';
    if (!category) {
      setMessage('Selecione uma categoria principal para continuar.', 'error');
      document.getElementById('categoryChoices')?.focus();
      return;
    }

    const button = document.getElementById('professionalRegisterButton') || form.querySelector('button[type="submit"],button');
    const requestedRole = document.getElementById('tipo')?.value || 'editor';
    const email = document.getElementById('email')?.value.trim() || '';
    const password = document.getElementById('senha')?.value || '';

    if (button?.disabled) return;
    if (button) {
      button.disabled = true;
      button.textContent = 'Criando acesso...';
    }
    setMessage('Criando sua conta e registrando a candidatura...');

    try {
      const c = await getClient();
      if (!c) throw new Error('Não foi possível conectar ao serviço de autenticação. Tente novamente.');

      const { data, error } = await c.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: document.getElementById('nome')?.value.trim() || '',
            nome_artistico: document.getElementById('nomeArtistico')?.value.trim() || '',
            especialidade: category,
            requested_role: requestedRole
          }
        }
      });

      if (error) throw error;
      if (!data?.user) throw new Error('Não foi possível concluir a criação da conta. Tente novamente.');

      try { localStorage.removeItem('pa_pending_professional_application'); } catch (_) {}

      if (data.session) {
        setMessage('Cadastro realizado. Sua candidatura foi registrada e está aguardando aprovação da administração.', 'success');
        if (button) button.textContent = 'Solicitação enviada';
      } else {
        setMessage('Cadastro realizado e candidatura registrada. Confirme o e-mail enviado para concluir a criação do acesso profissional.', 'success');
        if (button) button.textContent = 'Verifique seu e-mail';
      }
    } catch (error) {
      console.warn('[Pale Ascendancy] cadastro profissional:', error);
      setMessage(error?.message || 'Não foi possível concluir o cadastro profissional.', 'error');
      if (button) {
        button.disabled = false;
        button.textContent = 'Criar acesso profissional';
      }
    }
  }

  document.addEventListener('submit', handleSubmit, true);
})();
