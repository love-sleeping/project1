/* ==========================================================================
   鹤壁市外国语中学 · 高中部
   交互与滚动动效 / Interactions & Scroll Effects
   --------------------------------------------------------------------------
     · 顶栏滚动态        滚动阈值 -> .is-stuck + 能量条 --p
     · 移动端抽屉        开合 + inert + Esc + 链接点击后收起 + 焦点归还
     · 长卷横向浏览      按钮 / 方向键 / 端点置灰
     · 环形能量指示器    #orbitFill 随滚动闭合
     · 水墨视差          [data-speed] 元素按系数位移（rAF 节流）
     · 逐字显现          [data-split] 文本拆字后依次落位
     · 卷轴开展          .unroll / .unroll-v 由中心向两侧展开
     · 影像揭幕          .reveal-img clip-path 擦除
     · 数字滚动          [data-count] 由 0 递增至目标值
     · 章节标题鱼尾      .sec-head 进入视口后触发 ::after 展开
     · 导航高亮 / 进度 / 回顶
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supportsIO = 'IntersectionObserver' in window;

  /* ================= 1. 顶栏 / 进度 / 回顶 / 能量条 / 环形 ================= */
  var topbar       = doc.getElementById('topbar');
  var toTop        = doc.getElementById('toTop');
  var progressFill = doc.getElementById('progressFill');
  var charge       = doc.querySelector('.topbar__charge');
  var orbitFill    = doc.querySelector('.orbit__fill');

  /* 环形周长（r=46） */
  var ORBIT_R = 46;
  var ORBIT_C = 2 * Math.PI * ORBIT_R;
  if (orbitFill) {
    orbitFill.style.strokeDasharray = ORBIT_C.toFixed(2);
    orbitFill.style.strokeDashoffset = ORBIT_C.toFixed(2);
  }

  /* ================= 2. 移动端抽屉 ================= */
  var toggle = doc.getElementById('navToggle');
  var drawer = doc.getElementById('drawer');

  function setDrawer(open) {
    if (!toggle || !drawer) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    drawer.classList.toggle('is-open', open);
    if ('inert' in drawer) drawer.inert = !open;
    doc.body.style.overflow = open ? 'hidden' : '';
  }

  if (toggle && drawer) {
    setDrawer(false);

    toggle.addEventListener('click', function () {
      setDrawer(toggle.getAttribute('aria-expanded') !== 'true');
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setDrawer(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1040 && drawer.classList.contains('is-open')) setDrawer(false);
    });
  }

  /* ================= 3. 长卷横向浏览 ================= */
  var scroller = doc.getElementById('scroller');
  var prevBtn  = doc.getElementById('scrollPrev');
  var nextBtn  = doc.getElementById('scrollNext');

  function stepSize() {
    var item = scroller && scroller.querySelector('.scroller__item');
    return item ? item.getBoundingClientRect().width + 14 : 340;
  }
  function scrollByStep(dir) {
    if (!scroller) return;
    scroller.scrollBy({ left: dir * stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  if (prevBtn) prevBtn.addEventListener('click', function () { scrollByStep(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { scrollByStep(1); });

  if (scroller) {
    scroller.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollByStep(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByStep(-1); }
    });

    var syncCtrl = function () {
      if (!prevBtn || !nextBtn) return;
      var max = scroller.scrollWidth - scroller.clientWidth;
      prevBtn.disabled = scroller.scrollLeft <= 2;
      nextBtn.disabled = scroller.scrollLeft >= max - 2;
    };
    scroller.addEventListener('scroll', syncCtrl, { passive: true });
    window.addEventListener('resize', syncCtrl);
    window.addEventListener('load', syncCtrl);
    syncCtrl();
  }

  /* ================= 4. 逐字显现 ================= */
  var splitTargets = Array.prototype.slice.call(doc.querySelectorAll('[data-split]'));
  splitTargets.forEach(function (el) {
    var text = el.textContent;
    el.textContent = '';
    el.classList.add('split-chars');
    for (var i = 0; i < text.length; i++) {
      var s = doc.createElement('span');
      s.textContent = text.charAt(i);
      s.style.transitionDelay = (i * 0.045).toFixed(3) + 's';
      el.appendChild(s);
    }
  });

  /* ================= 5. 数字滚动 ================= */
  function animateCount(el) {
    var target   = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }

    var dur = 1300;
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  }

  /* ================= 6. IntersectionObserver 总控 ================= */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  var unrollEls = Array.prototype.slice.call(doc.querySelectorAll('.unroll'));
  var unrollVs  = Array.prototype.slice.call(doc.querySelectorAll('.unroll-v'));
  var wipeEls   = Array.prototype.slice.call(doc.querySelectorAll('.reveal-img'));
  var countEls  = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
  var secHeads  = Array.prototype.slice.call(doc.querySelectorAll('.sec-head'));

  var allObserved = revealEls
    .concat(unrollEls, unrollVs, wipeEls, countEls, secHeads, splitTargets);

  if (!supportsIO || reduceMotion) {
    allObserved.forEach(function (el) { el.classList.add('is-in'); });
    countEls.forEach(function (el) {
      var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
      el.textContent = parseFloat(el.getAttribute('data-count')).toFixed(d);
    });
  } else {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-count')) animateCount(el);
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    allObserved.forEach(function (el) { obs.observe(el); });
  }

  /* ================= 7. 水墨视差 / 进度 / 能量条 / 环形 ================= */
  var parallaxEls = Array.prototype.slice.call(doc.querySelectorAll('[data-speed]'));
  var ticking = false;

  function applyParallax() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    parallaxEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -vh || rect.top > vh * 2) return;
      var speed = parseFloat(el.getAttribute('data-speed')) || 0;
      el.style.setProperty('--py', (y * speed).toFixed(2) + 'px');
    });

    ticking = false;
  }

  function updateScrollVisuals() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var docH = doc.documentElement.scrollHeight - vh;
    var p = docH > 0 ? Math.min(Math.max(y / docH, 0), 1) : 0;

    /* 右侧线性进度条 */
    if (progressFill) progressFill.style.height = (p * 100).toFixed(2) + '%';

    /* 顶栏能量条：一个视口内蓄满 */
    if (charge) {
      var chargeP = Math.min(y / (vh * 1.4), 1);
      charge.style.setProperty('--p', chargeP.toFixed(3));
    }

    /* 环形能量指示器：随首屏滚动闭合 */
    if (orbitFill) {
      var orbitP = Math.min(y / vh, 1);
      orbitFill.style.strokeDashoffset = (ORBIT_C * (1 - orbitP)).toFixed(2);
    }
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (topbar) topbar.classList.toggle('is-stuck', y > 40);
    if (toTop)  toTop.classList.toggle('is-on', y > 620);

    updateScrollVisuals();

    if (!reduceMotion && parallaxEls.length && !ticking) {
      ticking = true;
      requestAnimationFrame(applyParallax);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    if (!reduceMotion && parallaxEls.length) applyParallax();
    updateScrollVisuals();
  });
  onScroll();

  /* ================= 8. 导航高亮 ================= */
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll('.nav a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if (sections.length && supportsIO) {
    var ratios = {};
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var bestId = null, bestRatio = 0;
      Object.keys(ratios).forEach(function (id) {
        if (ratios[id] > bestRatio) { bestRatio = ratios[id]; bestId = id; }
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', bestId !== null && a.getAttribute('href') === '#' + bestId);
      });
    }, { threshold: [0, 0.2, 0.45, 0.7], rootMargin: '-20% 0px -55% 0px' });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* ================= 9. 返回顶部 ================= */
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ================= 10. 首屏卷轴立即展开 ================= */
  var heroName = doc.querySelector('.unroll-v');
  if (heroName) {
    /* 让 .hero__card 的 reveal 一起触发，不必等滚动 */
    requestAnimationFrame(function () { heroName.classList.add('is-in'); });
    var heroCard = doc.querySelector('.hero__card');
    if (heroCard) heroCard.classList.add('is-in');
  }

})();