(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const professionalId = params.get('professional') || params.get('id') || '';
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

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
      ['clientName','clientContact','projectType','deadline','budget','description','references'].forEach(id => {
        if ($(id) && draft[id]) $(id).value = draft[id];
      });
    } catch (_) {}
  }

  function saveDraft() {
    const draft = {};
    ['clientName','clientContact','projectType','deadline','budget','description','references'].forEach(id => draft[id] = $(id)?.value || '');
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
    if (!professionalId) return;
    selected.hidden = false;
    selectedLink.href = `editor-perfil.html?id=${encodeURIComponent(professionalId)}`;
    try {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
      }
      const sb = window.supabase.createClient('https://fnyellunugdfesprmvzm.supabase.co','sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK');
      let query = await sb.from('editor_directory').select('id,nome_artistico,nome').eq('id', professionalId).maybeSingle();
      if (query.error) query = await sb.from('profile').select('id,nome_artistico,nome,is_public').eq('id', professionalId).maybeSingle();
      if (query.data) professionalName = query.data.nome_artistico || query.data.nome || 'Profissional selecionado';
      selectedName.textContent = professionalName || 'Profissional selecionado';
    } catch (_) {
      selectedName.textContent = 'Profissional selecionado';
    }
  }

  async function persistRequest(payload) {
    try {
      if (!window.supabase?.createClient) return false;
      const sb = window.supabase.createClient('https://fnyellunugdfesprmvzm.supabase.co','sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK');
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from('project_requests').insert({
        client_id: user?.id || null,
        professional_id: professionalId || null,
        client_name: payload.clientName,
        client_contact: payload.clientContact,
        project_type: payload.projectType,
        deadline_text: payload.deadline || null,
        budget_text: payload.budget || null,
        description: payload.description,
        references_text: payload.references || null,
        status: 'new'
      });
      return !error;
    } catch (_) { return false; }
  }

  form?.addEventListener('input', saveDraft);
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const payload = {
      clientName: $('clientName').value.trim(), clientContact: $('clientContact').value.trim(),
      projectType: $('projectType').value, deadline: $('deadline').value.trim(), budget: $('budget').value.trim(),
      description: $('description').value.trim(), references: $('references').value.trim()
    };
    const text = buildBriefing();
    output.value = text;
    whatsapp.href = `https://wa.me/5595991501077?text=${encodeURIComponent(text)}`;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    status.textContent = 'Briefing preparado. Se o armazenamento de projetos estiver ativo no Supabase, ele também será registrado na plataforma.';
    await persistRequest(payload);
  });

  $('copyBriefing')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.value); $('copyBriefing').textContent = 'Copiado'; }
    catch (_) { output.select(); document.execCommand('copy'); }
  });

  loadDraft();
  loadProfessional();
})();