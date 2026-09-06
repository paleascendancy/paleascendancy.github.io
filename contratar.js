(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const requestedProfessionalId = params.get('professional') || params.get('id') || '';
  const form = $('hireForm');
  const result = $('hireResult');
  const output = $('briefingOutput');
  const status = $('hireStatus');
  const whatsapp = $('whatsappBriefing');
  const selected = $('selectedProfessional');
  const selectedName = $('selectedProfessionalName');
  const selectedLink = $('selectedProfessionalLink');
  const draftKey = 'pa_v3_project_draft';

  let professionalName = '';
  let validatedProfessionalId = '';
  let client = null;
  let clientPromise = null;

  async function getClient() {
    if (client) return client;
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-pa-supabase]');
          if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.async = true;
          script.dataset.paSupabase = '1';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (!window.supabase?.createClient) return null;
      client = window.supabase.createClient(
        'https://fnyellunugdfesprmvzm.supabase.co',
        'sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK',
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
      return client;
    })().catch(() => null);

    return clientPromise;
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
      ['clientName','clientContact','projectType','deadline','budget','description','references'].forEach((id) => {
        if ($(id) && draft[id]) $(id).value = draft[id];
      });
    } catch (_) {}
  }

  function saveDraft() {
    const draft = {};
    ['clientName','clientContact','projectType','deadline','budget','description','references'].forEach((id) => {
      draft[id] = $(id)?.value || '';
    });
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch (_) {}
  }

  function escapeLine(value) { return String(value || '').trim(); }

  function buildBriefing() {
    return [
      'PALE ASCENDANCY — NOVO PROJETO',
      professionalName ? `Profissional: ${professionalName}` : 'Profissional: a definir',
      `Cliente: ${escapeLine($('clientName').value)}`,
      `Contato: ${escapeLine($('clientContact').value)}`,
      `Tipo de projeto: ${escapeLine($('projectType').value)}`,
      `Prazo: ${escapeLine($('deadline').value) || 'A combinar'}`,
      `Orçamento: ${escapeLine($('budget').value) || 'A combinar'}`,
      '',
      'Descrição:',
      escapeLine($('description').value),
      '',
      'Referências:',
      escapeLine($('references').value) || 'Nenhuma referência enviada.'
    ].join('\n');
  }

  async function loadProfessional() {
    if (!requestedProfessionalId) return;

    selected.hidden = false;
    selectedName.textContent = 'Validando profissional...';
    selectedLink.href = `editor-perfil.html?id=${encodeURIComponent(requestedProfessionalId)}`;

    try {
      const sb = await getClient();
      if (!sb) throw new Error('client');

      let query = await sb
        .from('editor_directory')
        .select('id,nome_artistico,nome')
        .eq('id', requestedProfessionalId)
        .maybeSingle();

      if (!query.error && query.data) {
        validatedProfessionalId = query.data.id;
        professionalName = query.data.nome_artistico || query.data.nome || 'Profissional selecionado';
        selectedName.textContent = professionalName;
        return;
      }

      query = await sb
        .from('profile')
        .select('id,nome_artistico,nome,is_public,is_editor,is_designer')
        .eq('id', requestedProfessionalId)
        .maybeSingle();

      const profile = query.data;
      const valid = !query.error && profile && profile.is_public !== false && (profile.is_editor || profile.is_designer);
      if (!valid) throw new Error('invalid-professional');

      validatedProfessionalId = profile.id;
      professionalName = profile.nome_artistico || profile.nome || 'Profissional selecionado';
      selectedName.textContent = professionalName;
    } catch (_) {
      validatedProfessionalId = '';
      professionalName = '';
      selected.hidden = true;
      status.textContent = 'O profissional informado não está disponível publicamente. O briefing será criado sem associação a um perfil.';
    }
  }

  async function persistRequest(payload) {
    try {
      const sb = await getClient();
      if (!sb) return { ok: false, reason: 'connection' };

      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from('project_requests').insert({
        client_id: user?.id || null,
        professional_id: validatedProfessionalId || null,
        client_name: payload.clientName,
        client_contact: payload.clientContact,
        project_type: payload.projectType,
        deadline_text: payload.deadline || null,
        budget_text: payload.budget || null,
        description: payload.description,
        references_text: payload.references || null,
        status: 'new'
      });

      return error ? { ok: false, reason: error.message || 'insert' } : { ok: true };
    } catch (_) {
      return { ok: false, reason: 'connection' };
    }
  }

  form?.addEventListener('input', saveDraft);
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = $('submitHire');
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparando...';
    }

    const payload = {
      clientName: $('clientName').value.trim(),
      clientContact: $('clientContact').value.trim(),
      projectType: $('projectType').value,
      deadline: $('deadline').value.trim(),
      budget: $('budget').value.trim(),
      description: $('description').value.trim(),
      references: $('references').value.trim()
    };

    const text = buildBriefing();
    output.value = text;
    whatsapp.href = `https://wa.me/5595991501077?text=${encodeURIComponent(text)}`;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const saved = await persistRequest(payload);
    if (saved.ok) {
      status.textContent = 'Briefing preparado e registrado na plataforma.';
      try { localStorage.removeItem(draftKey); } catch (_) {}
    } else {
      status.textContent = 'Briefing preparado. O registro interno não está disponível agora, mas você ainda pode copiar o briefing ou enviá-lo pelo WhatsApp.';
    }

    if (button) {
      button.disabled = false;
      button.textContent = 'Preparar contato';
    }
  });

  $('copyBriefing')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      $('copyBriefing').textContent = 'Copiado';
      setTimeout(() => { if ($('copyBriefing')) $('copyBriefing').textContent = 'Copiar briefing'; }, 1600);
    } catch (_) {
      output.select();
      document.execCommand('copy');
    }
  });

  loadDraft();
  loadProfessional();
})();
