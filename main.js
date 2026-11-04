/* CREAVYN — shared behaviour. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)');
  var mobile = window.matchMedia('(max-width:1024px)');
  var body = document.body;

  /* ---------- Mobile menu ---------- */
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.style.overflow = open ? 'hidden' : '';
  }
  if (btn && nav) {
    Array.prototype.forEach.call(nav.children, function (el, i) { el.style.setProperty('--i', i); });
    btn.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('menu-open')) { setMenu(false); btn.focus(); } });
    var onMq = function () { setMenu(false); };
    if (mobile.addEventListener) mobile.addEventListener('change', onMq);
  }

  /* ---------- Header state + light parallax (one rAF-throttled scroll handler) ---------- */
  var header = document.querySelector('.header');
  var hero = document.getElementById('hero');
  var plx = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var plxVisible = new Set();
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', y > 12);
    if (hero) hero.style.setProperty('--sy', Math.min(y, hero.offsetHeight).toFixed(0));
    if (!reduce.matches) {
      plxVisible.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight; // -1..1
        el.style.setProperty('--py', (p * -22).toFixed(1));
      });
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? plxVisible.add(e.target) : plxVisible.delete(e.target); });
    });
    plx.forEach(function (el) { pio.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Footer year ---------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Hero (home only) ---------- */
  if (hero) initHero();

  function initHero() {
    var word = document.getElementById('word');
    var wordWrap = hero.querySelector('.word-wrap');
    var duo = document.getElementById('duo');
    var top = hero.querySelector('.hero-top');
    var text = 'CREAVYN';
    text.split('').forEach(function (c, i) {
      var s = document.createElement('span');
      s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i);
      s.innerHTML = '<i>' + c + '</i>'; word.appendChild(s);
    });

    // Fit the wordmark to the viewport width, and on desktop also to the space between the headline and the founder panels.
    function fit() {
      word.style.fontSize = '100px';
      var base = word.getBoundingClientRect().width || 1;
      var avail = hero.clientWidth * (mobile.matches ? 0.94 : 0.95);
      var fs = 100 * avail / base;
      if (!mobile.matches) {
        var topEdge = top.offsetTop + top.offsetHeight + 14;
        wordWrap.style.setProperty('--word-top', topEdge + 'px');
        var panelTop = hero.clientHeight - 60 - 92 - Math.max(
          hero.querySelector('.info-left').offsetHeight,
          hero.querySelector('.info-right').offsetHeight) - 8;
        fs = Math.min(fs, (Math.max(panelTop, hero.clientHeight * 0.5) - topEdge) / 0.95);
      } else {
        wordWrap.style.removeProperty('--word-top');
      }
      word.style.fontSize = Math.max(fs, 60) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if (mobile.addEventListener) mobile.addEventListener('change', fit);

    // Marquee
    var track = document.getElementById('track'), one = '';
    for (var k = 0; k < 8; k++) one += '<span>Create</span><span>Design</span><span>Develop</span>';
    track.innerHTML = one + one;

    // Start the entrance once fonts + portrait are ready. When the brand intro plays, wait for it.
    var started = false;
    function start() {
      if (started) return; started = true; fit();
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        root.classList.add('go');
        setTimeout(function () { root.classList.add('done'); }, 2400);
      }); });
    }
    var introOn = root.classList.contains('intro-on');
    var imgReady = duo.decode ? duo.decode().catch(function () {}) : new Promise(function (r) { duo.complete ? r() : (duo.onload = r); });
    var fontReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var gate = Promise.all([imgReady, fontReady]);
    var introDelay = introOn ? 1500 : 0;
    var t0 = Date.now();
    gate.then(function () { setTimeout(start, Math.max(0, introDelay - (Date.now() - t0))); });
    setTimeout(start, 1800 + introDelay); // safety net so the site is never blocked

    if (introOn) {
      try { localStorage.setItem('creavyn-intro', String(Date.now())); } catch (e) {}
      var intro = document.getElementById('intro');
      var endIntro = function () { root.classList.remove('intro-on'); if (intro) intro.remove(); };
      setTimeout(endIntro, 2100);
      var skip = function () { endIntro(); start(); window.removeEventListener('keydown', skip); };
      window.addEventListener('keydown', skip);
    }

    // Pointer parallax (desktop, fine pointer, after intro)
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce.matches) {
      hero.addEventListener('pointermove', function (e) {
        if (!root.classList.contains('done') || mobile.matches) return;
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      hero.addEventListener('pointerleave', function () { hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0); });
    }

    initFounders();
  }

  /* ---------- Founder switcher ----------
     Only the two info panels animate. The portrait, wordmark and headline never move.
     Next (→): left panel exits to the left edge, right panel to the right edge; new content enters from those edges.
     Previous (←) is the mirror: panels exit toward the centre and the new content enters from the centre side. */
  function initFounders() {
    var left = hero.querySelector('.info-left .slot');
    var right = hero.querySelector('.info-right .slot');
    var lp = [].slice.call(left.children), rp = [].slice.call(right.children);
    var live = document.getElementById('founderLive');
    var count = lp.length, cur = 0, busy = false, queued = 0;

    function setActive(list, idx) {
      list.forEach(function (el, i) {
        var on = i === idx;
        el.classList.toggle('is-active', on);
        if (on) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
        else { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      });
    }
    setActive(lp, 0); setActive(rp, 0);

    function dist() { return mobile.matches ? Math.min(window.innerWidth * 0.14, 64) : Math.min(window.innerWidth * 0.1, 150); }
    function kf(x, o, blur) { return { opacity: o, transform: 'translate3d(' + x + 'px,0,0)', filter: 'blur(' + blur + 'px)' }; }

    function run(el, from, to, dur, delay) {
      if (!el.animate) return Promise.resolve();
      var a = el.animate([from, to], { duration: dur, delay: delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      return a.finished.then(function () { return a; }, function () { return a; });
    }

    function go(dir) {
      if (busy) { queued = dir; return; }              // remember one pending press so rapid use never gets stuck
      busy = true;
      var next = (cur + dir + count) % count;
      var d = dist();
      var outL = -dir * d, outR = dir * d;
      var oL = lp[cur], oR = rp[cur], nL = lp[next], nR = rp[next];
      var instant = reduce.matches;

      if (live) live.textContent = 'Showing founder ' + (next + 1) + ' of ' + count;

      // make the incoming panels visible but transparent at their start position
      [nL, nR].forEach(function (el) { el.style.visibility = 'visible'; el.style.opacity = '0'; });
      var finish = function () {
        [oL, oR, nL, nR].forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); el.style.visibility = ''; el.style.opacity = ''; });
        cur = next; setActive(lp, cur); setActive(rp, cur);
        busy = false;
        if (queued) { var q = queued; queued = 0; go(q); }
      };
      if (instant || !oL.animate) { finish(); return; }

      var outDur = 480, inDur = 720, inDelay = 200;
      Promise.all([
        run(oL, kf(0, 1, 0), kf(outL, 0, 6), outDur, 0),
        run(oR, kf(0, 1, 0), kf(outR, 0, 6), outDur, 0),
        run(nL, kf(outL === 0 ? 0 : -outL, 0, 6), kf(0, 1, 0), inDur, inDelay),
        run(nR, kf(-outR, 0, 6), kf(0, 1, 0), inDur, inDelay)
      ]).then(finish, finish);
      // hard safety net
      setTimeout(function () { if (busy && cur !== next) finish(); }, outDur + inDur + inDelay + 400);
    }

    hero.querySelectorAll('.arrow').forEach(function (b) {
      b.addEventListener('click', function () { go(parseInt(b.getAttribute('data-dir'), 10)); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (body.classList.contains('menu-open')) return;
      var r = hero.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 80) return; // hero must be on screen
      if (e.key === 'ArrowRight') { go(1); } else if (e.key === 'ArrowLeft') { go(-1); }
    });

    // touch swipe across the portrait
    var sx = null;
    var area = hero.querySelector('.duo-wrap');
    hero.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    void area;
  }

  /* ---------- Enquiry composer (contact page) ---------- */
  var form = document.getElementById('enquiryForm');
  if (form) {
    var cfg = JSON.parse(document.getElementById('contactCfg').textContent);
    var status = document.getElementById('formStatus');
    function compose() {
      var n = form.elements.name.value.trim(), t = form.elements.type.value, m = form.elements.message.value.trim();
      var lines = [cfg.whatsappMessage];
      if (n) lines.push('', 'Name: ' + n);
      if (t) lines.push('Project type: ' + t);
      if (m) lines.push('', m);
      return lines.join('\n');
    }
    function valid() {
      var ok = true;
      ['name', 'message'].forEach(function (k) {
        var f = form.elements[k], err = document.getElementById(k + 'Err');
        var bad = !f.value.trim();
        err.textContent = bad ? 'Please fill in this field.' : '';
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) ok = false;
      });
      return ok;
    }
    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-send]'); if (!b) return;
      e.preventDefault();
      if (!valid()) { status.textContent = 'Add your name and a short message first.'; return; }
      var msg = compose(), kind = b.getAttribute('data-send');
      if (kind === 'email') {
        window.location.href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Project enquiry from ' + form.elements.name.value.trim()) + '&body=' + encodeURIComponent(msg);
        status.textContent = 'Your email app should open with the message ready to review.';
      } else {
        window.open('https://wa.me/' + kind + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
        status.textContent = 'WhatsApp opens with the message ready. You can edit it before sending.';
      }
    });
  }
})();
