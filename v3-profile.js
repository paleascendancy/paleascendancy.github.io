(() => {
  'use strict';
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;
  const root = document.getElementById('profileContent');
  if (!root) return;

  function enhance() {
    if (root.dataset.v3HireReady === '1') return true;
    const top = root.querySelector('.editor-public-top');
    if (!top) return false;
    root.dataset.v3HireReady = '1';

    const actions = root.querySelector('.editor-public-actions') || document.createElement('div');
    if (!actions.classList.contains('editor-public-actions')) actions.className = 'editor-public-actions';

    const hire = document.createElement('a');
    hire.className = 'primary-button v3-profile-hire-button';
    hire.href = `contratar.html?professional=${encodeURIComponent(id)}`;
    hire.textContent = 'Quero contratar este profissional';
    actions.prepend(hire);

    if (!actions.parentNode) root.appendChild(actions);

    const note = document.createElement('div');
    note.className = 'v3-profile-hire-note';
    note.innerHTML = '<strong>Tem um projeto em mente?</strong><span>Crie um briefing com prazo, orçamento, referências e detalhes do que você precisa.</span>';
    actions.before(note);
    return true;
  }

  if (enhance()) return;
  const observer = new MutationObserver(() => {
    if (enhance()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
})();