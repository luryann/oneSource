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
  let vw = innerWidth, vh = innerHeight;

  const progress = (el) => {
    const r = el.getBoundingClientRect();
    const dist = el.offsetHeight - vh;
    return { p: dist > 0 ? clamp(-r.top / dist) : 0, visible: r.bottom > 0 && r.top < vh };
  };

  const handlers = {
    hero(el, p) {
      const s = (el._s ||= {
        portal: el.querySelector('.hero__portal'),
        photo: el.querySelector('.hero__photo'),
        tint: el.querySelector('.hero__tint'),
        ring: el.querySelector('.hero__ring'),
        glyph: el.querySelector('.hero__glyph'),
        lead: el.querySelector('.hero__lead'),
        scrim: el.querySelector('.hero__scrim'),
        copy: el.querySelector('.hero__copy'),
      });
      const r0 = Math.min(vw, vh) * 0.15;
      const rMax = Math.hypot(vw, vh) / 2 + 4;
      const g = ease(seg(p, 0.02, 0.5));
      const r = r0 + (rMax - r0) * g;
      s.portal.style.clipPath = `circle(${r.toFixed(1)}px at 50% 50%)`;
      s.photo.style.transform = `scale(${(1.25 - 0.25 * g).toFixed(4)})`;
      s.tint.style.opacity = (1 - seg(p, 0.06, 0.4)).toFixed(3);
      const ringScale = r / r0;
      s.ring.style.transform = `scale(${ringScale.toFixed(4)})`;
      s.ring.style.opacity = (1 - seg(p, 0.04, 0.28)).toFixed(3);
      const gl = seg(p, 0, 0.12);
      s.glyph.style.opacity = (1 - gl).toFixed(3);
      s.glyph.style.transform = `scale(${(1 + gl * 0.5).toFixed(3)})`;
      const ld = seg(p, 0, 0.1);
      s.lead.style.opacity = (1 - ld).toFixed(3);
      s.lead.style.transform = `translateY(${(-ld * 48).toFixed(1)}px)`;
      const c = easeOut(seg(p, 0.45, 0.65));
      s.scrim.style.opacity = seg(p, 0.35, 0.62).toFixed(3);
      s.copy.style.opacity = c.toFixed(3);
      s.copy.style.transform = `translateY(${((1 - c) * 48).toFixed(1)}px)`;
      s.copy.style.visibility = c > 0.01 ? 'visible' : 'hidden';
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
      const s = (el._s ||= { media: el.querySelector('.ev-hero__media'), img: el.querySelector('.ev-hero__img'), copy: el.querySelector('.ev-hero__copy') });
      const e = ease(seg(p, 0, 0.6));
      const k = 1 - e;
      const head = headH();
      s.media.style.clipPath = `inset(${(k * (head + vh * 0.03)).toFixed(1)}px ${(k * vw * 0.05).toFixed(1)}px ${(k * vh * 0.06).toFixed(1)}px round ${(k * 28).toFixed(1)}px)`;
      s.img.style.transform = `scale(${(1.12 - 0.12 * e).toFixed(4)})`;
      s.copy.style.transform = `translateY(${(-seg(p, 0.5, 1) * 40).toFixed(1)}px)`;
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

  let ticking = false;
  const frame = () => {
    ticking = false;
    for (const el of scenes) {
      const { p, visible } = progress(el);
      if (visible || el._s === undefined) handlers[el.dataset.scene]?.(el, p);
    }
    updateParallax();
    updateNights();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  if (motion) {
    sizeTracks();
    frame();
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', () => {
      const widthChanged = innerWidth !== vw;
      vw = innerWidth; vh = innerHeight;
      if (widthChanged) sizeTracks();
      request();
    });
    addEventListener('load', () => { sizeTracks(); request(); });
  }

  /* ---------- reveal on enter ---------- */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
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
      gallery.querySelectorAll('.gallery__item').forEach((it) => {
        const show = f === 'all' || it.dataset.ev === f;
        const was = !it.hidden;
        it.hidden = !show;
        it.classList.toggle('is-entering', show && !was);
      });
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
