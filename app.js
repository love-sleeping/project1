(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Only reveal real remote photos after the browser confirms the image loaded.
  // If a source fails, remove its complete card rather than leaving a broken icon,
  // an empty frame, or a made-up replacement image.
  $$('img.remote-photo').forEach((image) => {
    let settled = false;
    const card = image.closest('[data-photo-card]') || image.closest('figure') || image.closest('.photo-card');
    const clearFallback = () => { window.clearTimeout(imageFallbackTimer); };
    const revealImage = () => {
      if (image.naturalWidth > 0) {
        settled = true;
        clearFallback();
        card?.classList.add('has-loaded-photo');
        image.classList.add('is-loaded');
      } else {
        removeFailedCard();
      }
    };
    const removeFailedCard = () => {
      if (settled) return;
      settled = true;
      clearFallback();
      if (card) card.remove();
    };
    // Remote image hosts can hang indefinitely instead of returning an error.
    // Keep a hard upper bound so no empty photo frame stays on the page.
    const imageFallbackTimer = window.setTimeout(removeFailedCard, 10000);
    image.addEventListener('load', revealImage, { once: true });
    image.addEventListener('error', removeFailedCard, { once: true });
    if (image.complete) {
      if (image.naturalWidth > 0) revealImage();
      else removeFailedCard();
    }
  });

  // Small header/footer logos use the same real school-image source. If it is
  // unreachable, remove the image slot; never replace it with a made-up badge.
  $$('.school-logo-small').forEach((image) => {
    let settled = false;
    const hideLogo = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(logoTimeout);
      const frame = image.closest('.brand-mark, .footer-monogram');
      if (frame) frame.remove();
      else image.remove();
    };
    const showLogo = () => {
      if (image.naturalWidth > 0) {
        settled = true;
        image.classList.add('is-loaded');
        window.clearTimeout(logoTimeout);
      } else {
        hideLogo();
      }
    };
    const logoTimeout = window.setTimeout(hideLogo, 10000);
    image.addEventListener('load', showLogo, { once: true });
    image.addEventListener('error', hideLogo, { once: true });
    if (image.complete) {
      if (image.naturalWidth > 0) showLogo();
      else hideLogo();
    }
  });

  // Copy the maker's QQ number when supported; keep a clear manual-copy fallback.
  const copyQQButton = $('#copyQQ');
  const producerQQ = $('#producerQQ');
  const copyStatus = $('#copyStatus');
  copyQQButton?.addEventListener('click', async () => {
    const number = producerQQ?.textContent?.trim() || '3653541465';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(number);
        if (copyStatus) copyStatus.textContent = '已复制 QQ 号码。';
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (_) {
      if (copyStatus) copyStatus.textContent = `自动复制不可用，请手动复制：${number}`;
      const selection = window.getSelection();
      const range = document.createRange();
      if (producerQQ) {
        range.selectNodeContents(producerQQ);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  });

  // Navigation and accessible mobile menu.
  const header = $('.site-header');
  const nav = $('.site-nav');
  const menuToggle = $('#menuToggle');
  const closeMenu = () => {
    nav?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', '打开导航');
  };
  menuToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open') ?? false;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  });
  $$('.site-nav a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  // Scroll reveal: stagger nearby children for a more deliberate editorial rhythm.
  const revealElements = $$('[data-reveal]');
  revealElements.forEach((element) => {
    const parent = element.parentElement;
    if (parent) {
      const peers = [...parent.children].filter((peer) => peer.matches('[data-reveal]'));
      const index = peers.indexOf(element);
      if (index > 0) element.style.setProperty('--reveal-delay', `${Math.min(index * 95, 380)}ms`);
    }
  });
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }
  // Animate only when this script is active; if JS fails or is disabled, all page content remains visible.
  document.documentElement.classList.add('js-ready');

  // Smooth scroll: use Lenis when available; native CSS smooth scrolling remains the fallback.
  let lenis = null;
  if (!reducedMotion && window.Lenis) {
    try {
      lenis = new window.Lenis({
        duration: 1.42,
        lerp: 0.068,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 0.88,
        touchMultiplier: 1.08,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
      const raf = (time) => { lenis?.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      $$('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
          const id = anchor.getAttribute('href');
          if (!id || id === '#') return;
          const target = $(id);
          if (!target) return;
          event.preventDefault();
          closeMenu();
          lenis.scrollTo(target, { offset: -82, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
        });
      });
    } catch (error) {
      console.info('Lenis unavailable; native smooth scroll remains active.', error);
    }
  }

  // Scroll-linked elements: reading progress and the calm, paper-toned sticky header.
  const progress = $('#readingProgress');
  let scrollRaf = 0;
  const updateScrollUI = () => {
    scrollRaf = 0;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.width = `${(y / max) * 100}%`;
    header?.classList.toggle('is-scrolled', y > 18);
  };
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  updateScrollUI();

  // A full-screen motto interlude whose words gently descend and whose paper
  // background emerges with scroll progress. It never intercepts wheel/touch.
  const mottoSection = $('#motto');
  const mottoContent = $('.quote-content', mottoSection || document);
  let mottoRaf = 0;
  const updateMottoScroll = () => {
    mottoRaf = 0;
    if (!mottoSection || !mottoContent || reducedMotion) return;
    const rect = mottoSection.getBoundingClientRect();
    const span = Math.max(1, mottoSection.offsetHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / span));
    const eased = progress * progress * (3 - 2 * progress);
    mottoSection.classList.toggle('is-light', progress > 0.48);
    mottoContent.style.setProperty('--motto-y', `${Math.round(eased * 115)}px`);
    mottoContent.style.setProperty('--motto-scale', `${1 - eased * 0.075}`);
    mottoContent.style.setProperty('--motto-opacity', `${1 - Math.max(0, progress - 0.78) * 1.8}`);
  };
  if (mottoSection && !reducedMotion) {
    window.addEventListener('scroll', () => {
      if (mottoRaf) return;
      mottoRaf = requestAnimationFrame(updateMottoScroll);
    }, { passive: true });
    window.addEventListener('resize', updateMottoScroll, { passive: true });
    updateMottoScroll();
  }

  // Small, intentional interaction at the end: visitors can cycle through
  // short, school-appropriate wishes. No form submission or data collection.
  const closingButton = $('#closingNoteButton');
  const closingWhisper = $('#closingWhisper');
  const closingLines = [
    '愿你带着好奇出发，也带着笃定前行。',
    '愿每一次认真，都慢慢长成自己的答案。',
    '愿你心有所向，也始终保有探索世界的勇气。',
    '下一段故事，从你今天的一个小小选择开始。'
  ];
  let closingLineIndex = 0;
  closingButton?.addEventListener('click', () => {
    closingLineIndex = (closingLineIndex + 1) % closingLines.length;
    if (closingWhisper) {
      closingWhisper.style.opacity = '0';
      closingWhisper.style.transform = 'translateY(5px)';
      window.setTimeout(() => {
        closingWhisper.textContent = closingLines[closingLineIndex];
        closingWhisper.style.opacity = '1';
        closingWhisper.style.transform = 'translateY(0)';
      }, reducedMotion ? 0 : 160);
    }
  });

  // Scroll storytelling: subtle parallax, active chapter navigation, and a
  // velocity-aware image drift. All effects are disabled for reduced motion.
  const chapterLinks = $$('.site-nav a[href^="#"]');
  const chapters = chapterLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && chapters.length) {
    const chapterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        chapterLinks.forEach((link) => link.classList.toggle('is-current', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-28% 0px -58% 0px', threshold: 0 });
    chapters.forEach((chapter) => chapterObserver.observe(chapter));
  }

  if (!reducedMotion) {
    let motionFrame = 0;
    let lastY = window.scrollY;
    let velocity = 0;
    const crest = $('.hero-emblem-wrap .official-crest-image');
    const photoCards = $$('.photo-card');
    const motionTick = () => {
      motionFrame = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      velocity = Math.max(-22, Math.min(22, y - lastY));
      lastY = y;
      if (crest) {
        const heroHeight = Math.max(1, $('.hero')?.offsetHeight || 1);
        const progress = Math.max(0, Math.min(1, y / heroHeight));
        crest.style.transform = `translate3d(0, ${progress * -26}px, 0) scale(${1 - progress * 0.035})`;
      }
      photoCards.forEach((card, index) => {
        if (!card.classList.contains('has-loaded-photo')) return;
        const rect = card.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
        const depth = index % 3 === 0 ? 0.025 : index % 3 === 1 ? -0.018 : 0.012;
        const centerOffset = (rect.top + rect.height / 2 - window.innerHeight / 2);
        const drift = Math.max(-18, Math.min(18, -centerOffset * depth + velocity * 0.22));
        card.style.setProperty('--scroll-drift', `${drift.toFixed(1)}px`);
      });
    };
    window.addEventListener('scroll', () => {
      if (motionFrame) return;
      motionFrame = requestAnimationFrame(motionTick);
    }, { passive: true });
    motionTick();
  }

  // School logo source: the image labelled “学校logo” on Henan province
  // digital campus platform’s 鹤壁市外国语中学 page. Both instances load
  // eagerly so an off-screen lazy image isn't mistaken for a broken image.
  $$('[data-official-crest]').forEach((panel) => {
    const image = $('.official-crest-image', panel);
    if (!image) return;
    let settled = false;
    const fallback = $('.official-crest-fallback', panel);
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      panel.classList.add('image-unavailable');
      image.remove();
      if (fallback) fallback.hidden = false;
    };
    const success = () => {
      if (settled) return;
      if (!image.naturalWidth) { fail(); return; }
      settled = true;
      window.clearTimeout(timeout);
      panel.classList.add('image-loaded');
      if (fallback) fallback.hidden = true;
    };
    const timeout = window.setTimeout(fail, 30000);
    image.addEventListener('load', success, { once: true });
    image.addEventListener('error', fail, { once: true });
    // A cached image may already be complete. Do not fail an image merely
    // because complete is true while its fetch is still pending.
    if (image.complete && image.naturalWidth > 0) success();
  });
})();
