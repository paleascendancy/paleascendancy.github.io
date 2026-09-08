(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = [...document.querySelectorAll('[data-v4-reveal]')];

  if (reduce || !('IntersectionObserver' in window)) {
    nodes.forEach(node => node.classList.add('is-visible'));
  } else if (nodes.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });

    nodes.forEach(node => observer.observe(node));
  }

  const header = document.querySelector('.header');
  const syncHeader = () => header?.classList.toggle('v41-scrolled', window.scrollY > 18);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  if (reduce || window.matchMedia('(max-width: 820px)').matches) return;

  const field = document.createElement('div');
  field.className = 'v41-pointer-field';
  field.setAttribute('aria-hidden', 'true');
  document.body.prepend(field);

  let frame = 0;
  window.addEventListener('pointermove', event => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      document.documentElement.style.setProperty('--v41-x', `${(event.clientX / innerWidth) * 100}%`);
      document.documentElement.style.setProperty('--v41-y', `${(event.clientY / innerHeight) * 100}%`);
    });
  }, { passive: true });
})();
