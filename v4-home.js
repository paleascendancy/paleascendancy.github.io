(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = [...document.querySelectorAll('[data-v4-reveal]')];

  if (reduce || !('IntersectionObserver' in window)) {
    nodes.forEach(node => node.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });

  nodes.forEach(node => observer.observe(node));
})();
