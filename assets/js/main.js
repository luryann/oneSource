/* One Source Entertainment: navigation, scroll scenes, gallery and booking form. No dependencies. */
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- header: events panel + mobile menu ---------- */
  const head = document.querySelector('[data-head]');
  const trigger = document.querySelector('.nav__trigger');
  const panel = document.getElementById('nav-events');
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('mobile-menu');

  const setPanel = (open) => {
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    head.classList.toggle('is-open', open || menuBtn?.getAttribute('aria-expanded') === 'true');
  };
  trigger?.addEventListener('click', () => setPanel(trigger.getAttribute('aria-expanded') !== 'true'));

  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    head.classList.toggle('is-open', open);
    const label = menuBtn.querySelector('.sr-only');
    label.textContent = open ? label.dataset.close : label.dataset.open;
    if (open) menu.querySelector('a')?.focus();
  };
  menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (trigger?.getAttribute('aria-expanded') === 'true') { setPanel(false); trigger.focus(); }
    if (menuBtn?.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (trigger?.getAttribute('aria-expanded') === 'true' && !e.target.closest('.nav-panel, .nav__trigger')) setPanel(false);
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', (m) => { if (m.matches && menuBtn) setMenu(false); });

  /* ---------- header theme: light over light sections ---------- */
  const headH = () => parseFloat(getComputedStyle(root).getPropertyValue('--head-h')) || 64;
  const isLight = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      const m = bg.match(/[\d.]+/g);
      if (!m || (m[3] !== undefined && +m[3] < 0.5)) continue;
      return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2] > 160;
    }
    return false;
  };
  let headTick = false;
  const updateHead = () => {
    headTick = false;
    const y = headH() + 2;
    const prev = head.style.pointerEvents;
    head.style.pointerEvents = 'none';
    const el = document.elementFromPoint(innerWidth / 2, y);
    head.style.pointerEvents = prev;
    head.classList.toggle('is-light', !!el && isLight(el));
  };
  if (head) {
    addEventListener('scroll', () => { if (!headTick) { headTick = true; requestAnimationFrame(updateHead); } }, { passive: true });
    addEventListener('resize', updateHead);
    updateHead();
  }

  /* ---------- scroll scenes ---------- */
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const nights = [...document.querySelectorAll('[data-night]')];
  const reads = [...document.querySelectorAll('[data-read]')].map((el) => ({ el, w: [...el.querySelectorAll('.w')], lit: -1 }));
  const powers = [...document.querySelectorAll('[data-on]')];
  const opens = [...document.querySelectorAll('[data-open]:not([data-close])')];
  const stacks = [...document.querySelectorAll('[data-stack]')];
  const lights = [...document.querySelectorAll('.gallery__btn')];
  const seqs = [...document.querySelectorAll('[data-seq]')];
  const years = [...document.querySelectorAll('[data-count]')].map((el, i, all) => ({ el, to: +el.dataset.count, from: i ? +all[i - 1].dataset.count : +el.dataset.count, shown: null }));
  const wide = matchMedia('(min-width: 961px)');
  let vw = innerWidth, vh = innerHeight;

  const progress = (el) => {
    const r = el.getBoundingClientRect();
    const dist = el.offsetHeight - vh;
    return { p: dist > 0 ? clamp(-r.top / dist) : 0, visible: r.bottom > 0 && r.top < vh };
  };

  // the hero as a pure function of scroll progress, so it can be baked into a scroll timeline
  const heroParts = (el) => (el._s ||= {
    portal: el.querySelector('.hero__portal'),
    photo: el.querySelector('.hero__photo'),
    tint: el.querySelector('.hero__tint'),
    ring: el.querySelector('.hero__ring'),
    glyph: el.querySelector('.hero__glyph'),
    lead: el.querySelector('.hero__lead'),
    scrim: el.querySelector('.hero__scrim'),
    copy: el.querySelector('.hero__copy'),
    half: 0,
  });
  const heroAt = (p, s) => {
    // measure the stage (100lvh) rather than innerHeight, which shifts as mobile toolbars slide
    if (s.vw !== vw) { s.vw = vw; s.h = s.portal.parentElement.parentElement.offsetHeight || vh; s.half = s.portal.offsetWidth / 2; }
    const r0 = Math.min(vw, s.h) * 0.15;
    const rMax = Math.hypot(vw, s.h) / 2 + 4;
    const g = ease(seg(p, 0.02, 0.5));
    const r = r0 + (rMax - r0) * g;
    // disc scales up from the button; the photo counter-scales so only the circle grows
    const k = r / s.half;
    const gl = seg(p, 0, 0.12);
    const ld = seg(p, 0, 0.1);
    const c = easeOut(seg(p, 0.45, 0.65));
    return {
      portal: { transform: `scale(${k.toFixed(5)})` },
      photo: { transform: `scale(${((1.25 - 0.25 * g) / k).toFixed(5)})` },
      tint: { opacity: (1 - seg(p, 0.06, 0.4)).toFixed(3) },
      ring: { transform: `scale(${(r / r0).toFixed(4)})`, opacity: (1 - seg(p, 0.04, 0.28)).toFixed(3) },
      glyph: { transform: `scale(${(1 + gl * 0.5).toFixed(3)})`, opacity: (1 - gl).toFixed(3) },
      lead: { transform: `translateY(${(-ld * 48).toFixed(1)}px)`, opacity: (1 - ld).toFixed(3) },
      scrim: { opacity: seg(p, 0.35, 0.62).toFixed(3) },
      copy: { transform: `translateY(${((1 - c) * 48).toFixed(1)}px)`, opacity: c.toFixed(3), visibility: c > 0.01 ? 'visible' : 'hidden' },
    };
  };

  // event page hero: the photo frame opens out to full bleed
  const frameParts = (el) => (el._s ||= {
    stage: el.querySelector('.ev-hero__stage'),
    media: el.querySelector('.ev-hero__media'),
    img: el.querySelector('.ev-hero__img'),
    copy: el.querySelector('.ev-hero__copy'),
  });
  const frameAt = (p, s) => {
    if (s.vw !== vw) { s.vw = vw; s.h = s.stage.offsetHeight || vh; s.head = headH(); }
    const e = ease(seg(p, 0, 0.6));
    const k = 1 - e;
    const H = s.h, W0 = vw + 20, H0 = H + 20;
    // the window the photo shows through, inset from the stage while k > 0
    const top = k * (s.head + H * 0.03), bottom = H - k * H * 0.06;
    const sx = (vw * (1 - 0.1 * k)) / W0, sy = (bottom - top) / H0;
    const dy = (top + bottom - H) / 2;
    const zoom = 1.12 - 0.12 * e;
    return {
      media: { transform: `translate3d(0,${dy.toFixed(2)}px,0) scale(${sx.toFixed(5)},${sy.toFixed(5)})` },
      // undo the frame's scale and shift so the photo itself holds still
      img: { transform: `scale(${(1 / sx).toFixed(5)},${(1 / sy).toFixed(5)}) translate3d(0,${(-dy).toFixed(2)}px,0) scale(${zoom.toFixed(4)})` },
      copy: { transform: `translate3d(0,${(-seg(p, 0.5, 1) * 40).toFixed(1)}px,0)` },
    };
  };

  const handlers = {
    hero(el, p) {
      const s = heroParts(el);
      const v = heroAt(p, s);
      for (const k in v) Object.assign(s[k].style, v[k]);
    },

    words(el, p) {
      const s = (el._s ||= { w: [...el.querySelectorAll('.w')], lit: -1 });
      const n = Math.round(seg(p, 0.08, 0.82) * s.w.length);
      if (n === s.lit) return;
      s.w.forEach((w, i) => w.classList.toggle('is-lit', i < n));
      s.lit = n;
    },

    track(el, p) {
      const s = (el._s ||= { track: el.querySelector('[data-track]'), dist: 0 });
      s.track.style.transform = `translate3d(${(-p * s.dist).toFixed(1)}px,0,0)`;
    },

    frame(el, p) {
      const s = frameParts(el);
      const v = frameAt(p, s);
      for (const k in v) Object.assign(s[k].style, v[k]);
    },
  };

  const sizeTracks = () => {
    for (const el of scenes) {
      if (el.dataset.scene !== 'track') continue;
      const track = el.querySelector('[data-track]');
      const dist = Math.max(0, track.scrollWidth - vw);
      (el._s ||= { track, dist: 0 }).dist = dist;
      el.style.height = `${dist + vh * 1.25}px`;
    }
  };

  const updateParallax = () => {
    for (const img of parallax) {
      const frame = img.parentElement.getBoundingClientRect();
      if (frame.bottom < -100 || frame.top > vh + 100) continue;
      const off = (frame.top + frame.height / 2 - vh / 2) / (vh / 2 + frame.height / 2);
      img.style.transform = `translate3d(0,${(off * -5).toFixed(2)}%,0)`;
    }
  };

  const updateNights = () => {
    for (const el of nights) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const line = vh * 0.6;
      el.style.setProperty('--fill', clamp((line - r.top) / r.height).toFixed(4));
      el.querySelectorAll('.night__step').forEach((st) => st.classList.toggle('is-on', st.getBoundingClientRect().top + 22 < line));
    }
  };

  // 0 when the element's top sits at `from` (fraction of viewport height), 1 when it reaches `to`
  const enter = (r, from, to) => clamp((vh * from - r.top) / (vh * (from - to)));
  const inView = (r) => r.bottom > -100 && r.top < vh + 100;

  // paragraphs light up word by word as they pass through the reading line
  const updateReads = () => {
    for (const s of reads) {
      // measure the words, not the element: grid cells can stretch far past the text
      const top = s.w[0].getBoundingClientRect().top;
      const bottom = s.w[s.w.length - 1].getBoundingClientRect().bottom;
      if (bottom < -100 || top > vh + 100) continue;
      const n = Math.round(clamp((vh * 0.85 - top) / (vh * 0.35 + bottom - top)) * s.w.length);
      if (n === s.lit) continue;
      s.w.forEach((w, i) => w.classList.toggle('is-lit', i < n));
      s.lit = n;
    }
  };

  // rows switch on one at a time, like gear powering up during setup
  const updatePowers = () => {
    for (const el of powers) {
      const r = el.getBoundingClientRect();
      if (inView(r)) el.style.setProperty('--on', easeOut(enter(r, 0.88, 0.6)).toFixed(3));
    }
  };

  // photo frames open out from a smaller window as they arrive
  const updateOpens = () => {
    for (const el of opens) {
      const r = el.getBoundingClientRect();
      if (!inView(r)) continue;
      const k = 1 - ease(enter(r, 1, 0.4));
      el.style.clipPath = `inset(${(k * 9).toFixed(2)}% ${(k * 11).toFixed(2)}% round 28px)`;
    }
  };

  // each pricing tier slides out from behind the one it builds on
  const updateStacks = () => {
    for (const el of stacks) {
      const cards = el.children;
      if (!wide.matches) { for (const c of cards) c.style.transform = ''; continue; }
      const r = el.getBoundingClientRect();
      if (!inView(r)) continue;
      const p = enter(r, 0.95, 0.4);
      const step = cards[1].offsetLeft - cards[0].offsetLeft;
      const a = 1 - ease(seg(p, 0, 0.6));
      const b = 1 - ease(seg(p, 0.3, 1));
      cards[1].style.transform = `translate3d(${(-step * a).toFixed(1)}px,0,0)`;
      cards[2].style.transform = `translate3d(${(-step * (a + b)).toFixed(1)}px,0,0)`;
    }
  };

  // gallery: house lights come up on each photo as it scrolls in
  const updateLights = () => {
    for (const el of lights) {
      const r = el.getBoundingClientRect();
      if (inView(r)) el.style.setProperty('--dark', (0.75 * (1 - enter(r, 1, 0.72))).toFixed(3));
    }
  };

  // steps fill in order as the list scrolls through
  const updateSeqs = () => {
    for (const el of seqs) {
      const r = el.getBoundingClientRect();
      if (!inView(r)) continue;
      const p = clamp((vh * 0.85 - r.top) / (vh * 0.4 + r.height * 0.6));
      const n = el.children.length;
      [...el.children].forEach((c, i) => c.style.setProperty('--on', ease(seg(p, i / n, (i + 1) / n)).toFixed(3)));
    }
  };

  // timeline years count from the previous milestone as their row scrolls up
  const updateYears = () => {
    for (const y of years) {
      const r = y.el.getBoundingClientRect();
      if (!inView(r)) continue;
      const v = Math.round(y.from + (y.to - y.from) * easeOut(enter(r, 0.9, 0.5)));
      if (v !== y.shown) y.el.textContent = y.shown = v;
    }
  };

  // Where the browser supports scroll-driven animations, the hero and the events track are handed to it:
  // they then run on the compositor in step with the finger instead of trailing the scroll on the main thread.
  const timelines = motion && typeof ViewTimeline === 'function' && CSS.supports('animation-range: contain 0% contain 100%');
  const baked = new Set();
  let bakedAnims = [];
  const bake = () => {
    if (!timelines) return;
    bakedAnims.forEach((a) => a.cancel());
    bakedAnims = [];
    const run = (target, keyframes, subject) => bakedAnims.push(target.animate(keyframes, {
      timeline: new ViewTimeline({ subject }), rangeStart: 'contain 0%', rangeEnd: 'contain 100%', fill: 'both', easing: 'linear',
    }));
    for (const el of scenes) {
      if (el.dataset.scene === 'hero') {
        const s = heroParts(el);
        const N = 48;
        const samples = Array.from({ length: N + 1 }, (_, i) => heroAt(i / N, s));
        for (const k in samples[0]) {
          run(s[k], samples.map((v, i) => {
            const { visibility, ...rest } = v[k];
            return { ...rest, offset: i / N };
          }), el);
        }
        // visibility is discrete; keep it in its own animation so the rest stays on the compositor
        run(s.copy, [{ visibility: 'hidden', offset: 0 }, { visibility: 'hidden', offset: 0.45 }, { visibility: 'visible', offset: 0.4501 }, { visibility: 'visible', offset: 1 }], el);
        baked.add(el);
      } else if (el.dataset.scene === 'frame') {
        const s = frameParts(el);
        const N = 32;
        const samples = Array.from({ length: N + 1 }, (_, i) => frameAt(i / N, s));
        for (const k in samples[0]) run(s[k], samples.map((v, i) => ({ ...v[k], offset: i / N })), el);
        baked.add(el);
      } else if (el.dataset.scene === 'track') {
        const s = el._s;
        run(s.track, [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-s.dist}px,0,0)` }], el);
        baked.add(el);
      }
    }
  };

  let ticking = false;
  const frame = () => {
    ticking = false;
    for (const el of scenes) {
      if (baked.has(el)) continue;
      const { p, visible } = progress(el);
      if (visible || el._s === undefined) handlers[el.dataset.scene]?.(el, p);
    }
    updateParallax();
    updateNights();
    updateReads();
    updatePowers();
    updateOpens();
    updateStacks();
    updateLights();
    updateSeqs();
    updateYears();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  if (motion) {
    sizeTracks();
    bake();
    frame();
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', () => {
      const widthChanged = innerWidth !== vw;
      vw = innerWidth; vh = innerHeight;
      // mobile toolbars fire resize while scrolling; only rebuild the timelines when the layout really changes
      if (widthChanged) { sizeTracks(); bake(); }
      request();
    });
    addEventListener('load', () => { sizeTracks(); bake(); request(); });
  }

  /* ---------- one source list: active service follows scroll ---------- */
  const items = [...document.querySelectorAll('[data-source]')];
  if (items.length && 'IntersectionObserver' in window) {
    const imgs = document.querySelectorAll('[data-source-img]');
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const key = en.target.dataset.source;
        items.forEach((it) => it.classList.toggle('is-active', it === en.target));
        imgs.forEach((im) => im.classList.toggle('is-active', im.dataset.sourceImg === key));
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    items.forEach((it) => io.observe(it));
  }

  /* ---------- gallery: filter + lightbox ---------- */
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const chips = document.querySelectorAll('.chip[data-filter]');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const all = [...gallery.querySelectorAll('.gallery__item')];
      const before = new Map(all.filter((it) => !it.hidden).map((it) => [it, it.getBoundingClientRect()]));
      all.forEach((it) => {
        const show = f === 'all' || it.dataset.ev === f;
        it.hidden = !show;
      });
      // photos that stay glide from their old spot to the new one
      if (motion) for (const [it, a] of before) {
        if (it.hidden) continue;
        const b = it.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) + Math.abs(dy) < 1) continue;
        it.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      }
      request();
    }));

    const box = document.querySelector('.lightbox');
    const boxImg = box.querySelector('.lightbox__img');
    const boxCap = box.querySelector('.lightbox__cap');
    gallery.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery__btn');
      if (!btn) return;
      const img = btn.querySelector('img');
      boxImg.src = btn.dataset.full;
      boxImg.alt = img.alt;
      boxCap.textContent = img.alt;
      box.showModal();
    });
    box.querySelector('.lightbox__close').addEventListener('click', () => box.close());
    box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lightbox__fig')) box.close(); });
  }

  /* ---------- booking form ---------- */
  const form = document.querySelector('.book-form');
  if (form) {
    const sent = document.querySelector('.book-sent');
    const submit = form.querySelector('.book-form__submit');
    const formError = form.querySelector('.book-form__error');
    const label = submit.textContent;
    const pre = new URLSearchParams(location.search).get('event');
    const opt = pre && form.querySelector(`#f-event option[data-key="${CSS.escape(pre)}"]`);
    if (opt) opt.selected = true;
    const rules = {
      name: (v) => v.trim().length > 1,
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      phone: (v) => v.replace(/\D/g, '').length >= 10,
      event: (v) => v !== '',
      date: (v) => v !== '',
    };

    const check = (id) => {
      const input = form.querySelector('#f-' + id);
      const err = form.querySelector('#f-' + id + '-err');
      const ok = rules[id](input.value);
      input.setAttribute('aria-invalid', String(!ok));
      err.hidden = ok;
      err.textContent = ok ? '' : form.dataset['err' + id[0].toUpperCase() + id.slice(1)];
      return ok;
    };

    Object.keys(rules).forEach((id) => {
      const input = form.querySelector('#f-' + id);
      input.addEventListener('blur', () => { if (input.value) check(id); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(id); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      formError.hidden = true;
      const bad = Object.keys(rules).filter((id) => !check(id));
      if (bad.length) { form.querySelector('#f-' + bad[0]).focus(); return; }

      submit.disabled = true;
      submit.textContent = form.dataset.sending;
      try {
        const endpoint = form.dataset.endpoint;
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(String(res.status));
        } else {
          // Mock mode: no endpoint configured in src/config.mjs yet.
          await new Promise((r) => setTimeout(r, 700));
        }
        form.hidden = true;
        sent.hidden = false;
        sent.focus();
        form.reset();
      } catch {
        formError.textContent = form.dataset.errSend;
        formError.hidden = false;
      } finally {
        submit.disabled = false;
        submit.textContent = label;
      }
    });

    sent.querySelector('[data-reset]').addEventListener('click', () => {
      sent.hidden = true;
      form.hidden = false;
      form.querySelector('#f-name').focus();
    });
  }
})();
