(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  if (!body) return;

  body.classList.add('hypr-motion-enabled');

  const header = document.querySelector('.header');
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('hypr-scrolled', window.scrollY > 18);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const glow = document.createElement('div');
  glow.className = 'hypr-pointer-glow';
  glow.setAttribute('aria-hidden', 'true');
  body.prepend(glow);

  const revealTargets = [
    '.section-heading',
    '.v3-trust-item',
    '.v3-process-card',
    '.v3-audience-card',
    '.service-preview',
    '.showcase-card',
    '.contact-panel'
  ];

  const revealNodes = [...document.querySelectorAll(revealTargets.join(','))];
  revealNodes.forEach((el, index) => {
    el.classList.add('hypr-reveal');
    el.style.setProperty('--hypr-delay', `${Math.min(index % 4, 3) * 70}ms`);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealNodes.forEach(el => el.classList.add('hypr-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('hypr-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    revealNodes.forEach(el => observer.observe(el));
  }

  if (reduceMotion || window.matchMedia('(max-width: 820px)').matches) return;

  let raf = 0;
  const onPointerMove = event => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      document.documentElement.style.setProperty('--hypr-x', `${(x * 100).toFixed(2)}%`);
      document.documentElement.style.setProperty('--hypr-y', `${(y * 100).toFixed(2)}%`);

      const dx = (x - 0.5) * 8;
      const dy = (y - 0.5) * 6;
      document.documentElement.style.setProperty('--hypr-parallax-x', `${dx.toFixed(2)}px`);
      document.documentElement.style.setProperty('--hypr-parallax-y', `${dy.toFixed(2)}px`);
    });
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
})();
