// Builds the static site into /docs (served by GitHub Pages). Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';
import en from './content/en.mjs';
import es from './content/es.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'docs');
const LANGS = { en, es };
const YEAR = new Date().getFullYear();
const EVENT_KEYS = ['weddings', 'quinceaneras', 'sweet16', 'schools', 'corporate'];
const BASE_PATH = new URL(config.siteUrl + '/').pathname; // '/' or '/repo/'

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (route) => `${config.siteUrl}/${route}`;

// ---------- image sizes (read from the real files so swapped photos keep correct ratios) ----------
const sizeCache = {};
function jpegSize(file) {
  if (sizeCache[file]) return sizeCache[file];
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
      return (sizeCache[file] = { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) });
    }
    i += 2 + len;
  }
  throw new Error('Cannot read size of ' + file);
}

// ---------- shared pieces ----------
const GLYPH = '<path d="M66.7 30.1A26 26 0 1 1 33.3 30.1"/><path d="M50 15V49"/>';
const mark = (cls = '') =>
  `<svg class="mark ${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="47" fill="#1A93C4" stroke="#A9CFE0" stroke-width="3"/><g fill="none" stroke="#fff" stroke-width="9">${GLYPH}</g></svg>`;

function ctx(L, key, route) {
  const depth = route.split('/').filter(Boolean).length;
  const rel = key === '404' ? BASE_PATH : '../'.repeat(depth);
  const href = (k, lang = L) => rel + (lang.routes[k] || '') || './';
  const asset = (p) => rel + 'assets/' + p;
  const photo = (name, alt, o = {}) => {
    const { w, h } = jpegSize(path.join(ROOT, 'assets/photos', name + '.jpg'));
    const attrs = [
      `src="${asset('photos/' + name + '.jpg')}"`,
      `alt="${esc(alt)}"`,
      `width="${w}" height="${h}"`,
      `loading="${o.eager ? 'eager' : 'lazy'}"`,
      'decoding="async"',
      o.eager ? 'fetchpriority="high"' : '',
      o.cls ? `class="${o.cls}"` : '',
      o.attrs || '',
    ];
    return `<img ${attrs.filter(Boolean).join(' ')}>`;
  };
  return { L, key, route, rel, href, asset, photo };
}

const bookHref = (c, key) => c.href('book') + (EVENT_KEYS.includes(key) ? `?event=${key}` : '');
const svc = (L, k) => L.services.find((s) => s.key === k);
const ev = (L, k) => L.events.find((e) => e.key === k);
const words = (s) => s.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ');

// ---------- structured data ----------
function business(L) {
  return {
    '@type': 'EntertainmentBusiness',
    '@id': abs('') + '#business',
    name: config.name,
    alternateName: 'DJ LX & Associates',
    description: L.site.description,
    url: abs(L.routes.home),
    logo: abs('assets/img/icon-512.png'),
    image: abs('assets/img/og.jpg'),
    telephone: config.phoneE164,
    email: config.email,
    foundingDate: String(config.founded),
    address: { '@type': 'PostalAddress', addressLocality: config.city, addressRegion: config.region, addressCountry: 'US' },
    areaServed: [
      { '@type': 'City', name: 'Los Angeles' },
      { '@type': 'AdministrativeArea', name: 'Los Angeles County' },
      { '@type': 'AdministrativeArea', name: 'Southern California' },
    ],
    founder: { '@type': 'Person', name: 'Alex Cervantes', alternateName: 'DJ LX' },
    employee: L.team.map((t) => ({ '@type': 'Person', name: t.name, alternateName: t.dj, jobTitle: 'DJ & MC' })),
    knowsLanguage: ['en', 'es'],
    sameAs: [config.instagram, config.instagramDjlx, config.facebook],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: L.ui.services,
      itemListElement: L.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, description: s.short },
      })),
    },
  };
}

function ldGraph(c, page) {
  const { L } = c;
  const graph = [business(L)];
  const url = abs(page.route);
  graph.push({
    '@type': 'WebPage',
    '@id': url + '#webpage',
    url,
    name: page.title,
    description: page.description,
    inLanguage: L.lang,
    isPartOf: { '@type': 'WebSite', '@id': abs('') + '#website', name: config.name, url: abs('') },
    about: { '@id': abs('') + '#business' },
  });
  if (page.key !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: L.ui.home, item: abs(L.routes.home) },
        { '@type': 'ListItem', position: 2, name: page.crumb, item: url },
      ],
    });
  }
  if (page.service) graph.push(page.service);
  if (page.faq) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// ---------- layout ----------
function head(c, page) {
  const { L } = c;
  const alt = LANGS[L.other];
  const url = abs(page.route);
  const altRoute = page.key === '404' ? null : alt.routes[page.key];
  const enRoute = L.lang === 'en' ? page.route : altRoute;
  return `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.key === '404' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="${L.lang}" href="${url}">
<link rel="alternate" hreflang="${alt.lang}" href="${abs(altRoute)}">
<link rel="alternate" hreflang="x-default" href="${abs(enRoute)}">`}
<meta name="theme-color" content="#000000">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${config.name}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${abs('assets/img/og.jpg')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${config.name} logo">
<meta property="og:locale" content="${L.locale}">
<meta property="og:locale:alternate" content="${alt.locale}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${c.asset('img/favicon.svg')}" type="image/svg+xml">
<link rel="icon" href="${c.asset('img/favicon-32.png')}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${c.asset('img/apple-touch-icon.png')}">
<link rel="manifest" href="${c.rel}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap">
<link rel="stylesheet" href="${c.asset('css/main.css')}">
${page.preload ? `<link rel="preload" as="image" href="${c.asset('photos/' + page.preload + '.jpg')}" fetchpriority="high">` : ''}
<script>document.documentElement.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')</script>
<script type="application/ld+json">${ldGraph(c, page)}</script>
</head>`;
}

function header(c, page) {
  const { L, href } = c;
  const alt = LANGS[L.other];
  const altHref = page.key === '404' ? c.rel + alt.routes.home : href(page.key, alt);
  const cur = (k) => (page.key === k ? ' aria-current="page"' : '');
  const eventLinks = EVENT_KEYS.map((k) => {
    const e = ev(L, k);
    return `<li><a class="nav-panel__link" href="${href(k)}"${cur(k)}>${c.photo(e.img, '', { cls: 'nav-panel__img' })}<span class="nav-panel__name">${esc(e.name)}</span><span class="nav-panel__line">${esc(e.card)}</span></a></li>`;
  }).join('');
  return `<a class="skip" href="#main">${L.ui.skip}</a>
<header class="site-head" data-head>
  <div class="site-head__bar">
    <a class="brand" href="${href('home')}" aria-label="${config.name}, ${L.ui.home}">${mark('brand__mark')}<img class="brand__word brand__word--light" src="${c.asset('img/wordmark.png')}" alt="" width="922" height="159"><img class="brand__word brand__word--dark" src="${c.asset('img/wordmark-dark.png')}" alt="" width="922" height="159"></a>
    <nav class="nav" aria-label="${L.ui.navLabel}">
      <ul class="nav__list">
        <li><button class="nav__link nav__trigger" type="button" aria-expanded="false" aria-controls="nav-events"${EVENT_KEYS.includes(page.key) ? ' data-current' : ''}>${L.ui.events}<svg class="nav__chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button></li>
        <li><a class="nav__link" href="${href('services')}"${cur('services')}>${L.ui.services}</a></li>
        <li><a class="nav__link" href="${href('gallery')}"${cur('gallery')}>${L.ui.gallery}</a></li>
        <li><a class="nav__link" href="${href('about')}"${cur('about')}>${L.ui.about}</a></li>
      </ul>
    </nav>
    <div class="site-head__actions">
      <a class="lang-link" href="${altHref}" hreflang="${alt.lang}" lang="${alt.lang}">${L.otherLabel}</a>
      <a class="tel-btn" href="tel:${config.phoneE164}" aria-label="${L.ui.call} ${config.phone}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/></svg></a>
      <a class="btn btn--sm site-head__book" href="${bookHref(c, page.key)}"${cur('book')}>${L.ui.book}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu"><span class="menu-btn__lines" aria-hidden="true"></span><span class="sr-only" data-open="${L.ui.menu}" data-close="${L.ui.close}">${L.ui.menu}</span></button>
    </div>
  </div>
  <div class="nav-panel" id="nav-events" hidden>
    <ul class="nav-panel__list">${eventLinks}</ul>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav aria-label="${L.ui.navLabel}">
      <ul class="mobile-menu__events">${EVENT_KEYS.map((k) => `<li><a href="${href(k)}"${cur(k)}>${esc(ev(L, k).name)}</a></li>`).join('')}</ul>
      <ul class="mobile-menu__main">
        <li><a href="${href('services')}"${cur('services')}>${L.ui.services}</a></li>
        <li><a href="${href('gallery')}"${cur('gallery')}>${L.ui.gallery}</a></li>
        <li><a href="${href('about')}"${cur('about')}>${L.ui.about}</a></li>
      </ul>
    </nav>
    <div class="mobile-menu__foot">
      <a class="btn" href="${href('book')}">${L.ui.book}</a>
      <a class="mobile-menu__tel" href="tel:${config.phoneE164}">${config.phone}</a>
      <a class="lang-link" href="${altHref}" hreflang="${alt.lang}" lang="${alt.lang}">${L.otherLabel}</a>
    </div>
  </div>
</header>`;
}

function footer(c, page) {
  const { L, href } = c;
  const alt = LANGS[L.other];
  const altHref = page.key === '404' ? c.rel + alt.routes.home : href(page.key, alt);
  return `<footer class="site-foot">
  <div class="wrap site-foot__grid">
    <div class="site-foot__brand">
      <a href="${href('home')}" aria-label="${config.name}, ${L.ui.home}"><img src="${c.asset('img/wordmark-full-dark.png')}" alt="${config.name}, ${config.legalLine}" width="923" height="211" loading="lazy"></a>
      <p>${L.ui.footerTag}</p>
    </div>
    <nav class="site-foot__col" aria-labelledby="f-events">
      <h2 id="f-events">${L.ui.events}</h2>
      <ul>${EVENT_KEYS.map((k) => `<li><a href="${href(k)}">${esc(ev(L, k).name)}</a></li>`).join('')}</ul>
    </nav>
    <nav class="site-foot__col" aria-labelledby="f-more">
      <h2 id="f-more">${L.ui.footMore}</h2>
      <ul>
        <li><a href="${href('services')}">${L.ui.services}</a></li>
        <li><a href="${href('gallery')}">${L.ui.gallery}</a></li>
        <li><a href="${href('about')}">${L.ui.about}</a></li>
        <li><a href="${href('book')}">${L.ui.book}</a></li>
      </ul>
    </nav>
    <div class="site-foot__col">
      <h2>${L.ui.footContact}</h2>
      <ul>
        <li><a href="tel:${config.phoneE164}">${config.phone}</a></li>
        <li><a href="mailto:${config.email}">${config.email}</a></li>
        <li><a href="${config.instagram}" rel="noopener">${config.instagramHandle}</a></li>
        <li><a href="${config.instagramDjlx}" rel="noopener">@djlx2000</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap site-foot__base">
    <p>© ${YEAR} ${config.name}. ${config.legalLine}. ${L.ui.rights}</p>
    <a href="${href('privacy')}"${page.key === 'privacy' ? ' aria-current="page"' : ''}>${L.ui.privacy}</a>
    <a class="lang-link" href="${altHref}" hreflang="${alt.lang}" lang="${alt.lang}">${L.ui.langNote}</a>
  </div>
</footer>`;
}

function cta(c, key) {
  const { L } = c;
  return `<section class="cta" aria-labelledby="cta-title">
  <div class="wrap cta__inner">
    ${mark('cta__mark')}
    <h2 class="cta__title" id="cta-title" data-read>${words(L.ui.ctaTitle)}</h2>
    <p class="cta__text">${L.ui.ctaText}</p>
    <div class="cta__actions">
      <a class="btn btn--lg" href="${bookHref(c, key)}">${L.ui.book}</a>
      <a class="btn btn--lg btn--ghost" href="tel:${config.phoneE164}">${L.ui.ctaCall} ${config.phone}</a>
    </div>
  </div>
</section>`;
}

function page(c, meta, body) {
  return `${head(c, meta)}
<body class="page-${meta.key}">
${header(c, meta)}
<main id="main">
${body}
</main>
${footer(c, meta)}
<script src="${c.asset('js/main.js')}" defer></script>
</body>
</html>
`;
}

const faqList = (items) =>
  items.map((f) => `<details class="faq__item"><summary>${esc(f.q)}</summary><div class="faq__a"><p>${esc(f.a)}</p></div></details>`).join('');

function pageHero(h1, sub, extra = '', mod = '') {
  return `<section class="page-hero${mod}">
  <div class="wrap">
    <h1 class="page-hero__title">${esc(h1)}</h1>
    <p class="page-hero__sub">${esc(sub)}</p>
    ${extra}
  </div>
</section>`;
}

// ---------- pages ----------
function home(c) {
  const { L, href, photo } = c;
  const H = L.home;
  const body = `
<section class="hero" data-scene="hero" aria-labelledby="hero-title">
  <div class="hero__stage">
    <div class="hero__disc">
      <div class="hero__portal">
        ${photo('hero', H.heroAlt, { cls: 'hero__photo', eager: true })}
        <div class="hero__tint"></div>
      </div>
      <svg class="hero__ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48.5" pathLength="1"/></svg>
      <svg class="hero__glyph" viewBox="3 3 94 94" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="9">${GLYPH.replace(/<path /g, '<path pathLength="1" ')}</g></svg>
    </div>
    <p class="hero__lead"><span>${esc(H.lead)}</span></p>
    <div class="hero__scrim"></div>
    <div class="hero__copy wrap">
      <h1 class="hero__title" id="hero-title">${esc(H.h1)}</h1>
      <p class="hero__sub">${esc(H.sub)}</p>
      <div class="hero__actions">
        <a class="btn btn--lg" href="${href('book')}">${L.ui.book}</a>
        <a class="btn btn--lg btn--ghost" href="#events">${esc(H.ctaSecondary)}</a>
      </div>
    </div>
  </div>
</section>

<section class="statement" data-scene="words">
  <div class="statement__stage">
    <div class="wrap"><p class="statement__text">${words(H.statement)}</p></div>
  </div>
</section>

<section class="source" aria-labelledby="source-title">
  <div class="wrap">
    <h2 class="h-section source__title" id="source-title" data-read>${words(H.servicesTitle)}</h2>
    <div class="source__grid">
      <div class="source__media" aria-hidden="true">
        ${L.services.map((s, i) => photo(s.img, '', { cls: 'source__img' + (i === 0 ? ' is-active' : ''), attrs: `data-source-img="${s.key}"` })).join('\n        ')}
      </div>
      <ul class="source__list">
        ${L.services.map((s, i) => `<li class="source__item${i === 0 ? ' is-active' : ''}" data-source="${s.key}">
          ${photo(s.img, s.alt, { cls: 'source__inline' })}
          <h3 class="source__name">${esc(s.name)}</h3>
          <p class="source__text">${esc(s.short)}</p>
        </li>`).join('\n        ')}
      </ul>
    </div>
    <a class="link source__more" href="${href('services')}">${L.ui.allServices}</a>
  </div>
</section>

<section class="events" id="events" data-scene="track" aria-labelledby="events-title">
  <div class="events__stage">
    <div class="wrap"><h2 class="h-section events__title" id="events-title">${esc(H.eventsTitle)}</h2></div>
    <div class="events__viewport">
      <ul class="events__track" data-track>
        ${L.events.map((e) => `<li class="ev-card">
          <a class="ev-card__link" href="${href(e.key)}">
            ${photo(e.img, e.alt, { cls: 'ev-card__img', eager: true })}
            <span class="ev-card__body">
              <span class="ev-card__name">${esc(e.name)}</span>
              <span class="ev-card__text">${esc(e.card)}</span>
            </span>
          </a>
        </li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>

<section class="team" aria-labelledby="team-title">
  <div class="wrap">
    <div class="team__head">
      <h2 class="h-section" id="team-title" data-read>${words(H.teamTitle)}</h2>
      <a class="link" href="${href('about')}">${esc(H.teamLink)}</a>
    </div>
    <div class="team__grid">
      ${L.team.map((t, i) => `<article class="person">
        <div class="person__frame" data-open>${photo(t.img, t.alt, { cls: 'person__img', attrs: 'data-parallax' })}</div>
        <h3 class="person__name">${esc(t.name)}</h3>
        <p class="person__dj">${esc(t.dj)}</p>
        <p class="person__text">${esc(t.short)}</p>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>
${config.showReviews ? `
<section class="reviews" aria-labelledby="reviews-title">
  <div class="wrap">
    <h2 class="h-section" id="reviews-title" data-read>${words(H.reviewsTitle)}</h2>
    <div class="reviews__list">
      ${L.reviews.map((r, i) => `<figure class="review"><blockquote><p data-read>${words(r.q)}</p></blockquote><figcaption><span class="review__who">${esc(r.who)}</span> <span class="review__ev">${esc(r.ev)}</span></figcaption></figure>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}

<section class="steps" aria-labelledby="steps-title">
  <div class="wrap">
    <h2 class="h-section" id="steps-title" data-read>${words(H.stepsTitle)}</h2>
    <ol class="steps__list" data-seq>
      ${H.steps.map((s, i) => `<li class="step"><span class="step__n" aria-hidden="true">${i + 1}</span><h3 class="step__t">${esc(s.t)}</h3><p class="step__d">${esc(s.d)}</p></li>`).join('\n      ')}
    </ol>
  </div>
</section>
${cta(c)}`;
  return page(c, { key: 'home', route: L.routes.home, title: L.site.title, description: L.site.description, preload: 'hero' }, body);
}

function eventPage(c, e) {
  const { L, href, photo } = c;
  const others = L.events.filter((o) => o.key !== e.key);
  const body = `
<section class="ev-hero" data-scene="frame" aria-labelledby="ev-title">
  <div class="ev-hero__stage">
    <div class="ev-hero__media">${photo(e.img, e.alt, { cls: 'ev-hero__img', eager: true })}<div class="ev-hero__scrim"></div></div>
    <div class="ev-hero__copy wrap">
      <h1 class="ev-hero__title" id="ev-title">${esc(e.h1)}</h1>
      <p class="ev-hero__sub">${esc(e.sub)}</p>
      <a class="btn btn--lg" href="${bookHref(c, e.key)}">${L.ui.book}</a>
    </div>
  </div>
</section>

<section class="intro">
  <div class="wrap intro__grid">
    <p class="intro__lead" data-read>${words(e.intro[0])}</p>
    <p class="intro__text">${esc(e.intro[1])}</p>
  </div>
</section>

<section class="included" aria-labelledby="inc-title">
  <div class="wrap">
    <h2 class="h-section" id="inc-title" data-read>${words(L.ui.includedTitle)}</h2>
    <ul class="included__list">
      ${e.included.map((k) => { const s = svc(L, k); return `<li class="included__row" data-on><h3 class="included__name">${esc(s.name)}</h3><p class="included__text">${esc(s.short)}</p></li>`; }).join('\n      ')}
    </ul>
    <a class="link" href="${href('services')}">${L.ui.allServices}</a>
  </div>
</section>

<section class="night" aria-labelledby="night-title">
  <div class="wrap night__grid">
    <h2 class="h-section night__title" id="night-title" data-read>${words(L.ui.nightTitle)}</h2>
    <div class="night__body" data-night>
      <div class="night__rail" aria-hidden="true"><span class="night__fill"></span></div>
      <ol class="night__list">
        ${e.night.map((n, i) => `<li class="night__step"><span class="night__n" aria-hidden="true">${i + 1}</span><div><h3 class="night__t">${esc(n.t)}</h3><p class="night__d">${esc(n.d)}</p></div></li>`).join('\n        ')}
      </ol>
    </div>
  </div>
</section>

<section class="strip" aria-label="${L.ui.gallery}">
  <div class="wrap">
    <div class="strip__grid">
      ${e.gallery.map((g, i) => { const it = L.galleryPage.items.find((x) => x.img === g); return `<div class="strip__frame strip__frame--${i + 1}">${photo(g, it ? it.alt : e.alt, { cls: 'strip__img', attrs: 'data-parallax' })}</div>`; }).join('\n      ')}
    </div>
    <a class="link" href="${href('gallery')}">${L.ui.galleryStrip}</a>
  </div>
</section>

<section class="faq" aria-labelledby="faq-title">
  <div class="wrap faq__grid">
    <h2 class="h-section" id="faq-title" data-read>${words(L.ui.faqTitle)}</h2>
    <div class="faq__list">${faqList(e.faq)}</div>
  </div>
</section>

<section class="others" aria-labelledby="others-title">
  <div class="wrap">
    <h2 class="others__title" id="others-title">${L.ui.otherEvents}</h2>
    <ul class="others__list">
      ${others.map((o) => `<li><a class="other" href="${href(o.key)}">${photo(o.img, '', { cls: 'other__img' })}<span class="other__name">${esc(o.name)}</span></a></li>`).join('\n      ')}
    </ul>
  </div>
</section>
${cta(c, e.key)}`;
  return page(c, {
    key: e.key,
    route: L.routes[e.key],
    title: e.metaTitle,
    description: e.metaDesc,
    crumb: e.name,
    faq: e.faq,
    preload: e.img,
    service: {
      '@type': 'Service',
      name: e.h1,
      serviceType: e.name,
      description: e.metaDesc,
      provider: { '@id': abs('') + '#business' },
      areaServed: { '@type': 'City', name: 'Los Angeles' },
      url: abs(L.routes[e.key]),
    },
  }, body);
}

function servicesPage(c) {
  const { L, href, photo } = c;
  const P = L.servicesPage;
  const jump = `<ul class="jump"><li><a class="jump__primary" href="#pricing">${esc(L.packages.title)}</a></li>${L.services.map((s) => `<li><a href="#${s.key}">${esc(s.name)}</a></li>`).join('')}</ul>`;
  const body = `
${pageHero(P.h1, P.sub, `<nav aria-label="${L.ui.servicesLabel}">${jump}</nav>`)}
<section class="svc-rows">
  <div class="wrap">
    ${L.services.map((s, i) => `<article class="svc${i % 2 ? ' svc--flip' : ''}" id="${s.key}">
      <div class="svc__frame" data-open>${photo(s.img, s.alt, { cls: 'svc__img', attrs: 'data-parallax' })}</div>
      <div class="svc__copy">
        <h2 class="svc__name">${esc(s.name)}</h2>
        <p class="svc__short">${esc(s.short)}</p>
        <p class="svc__long">${esc(s.long)}</p>
      </div>
    </article>`).join('\n    ')}
  </div>
</section>

<section class="packages" id="pricing" aria-labelledby="pricing-title">
  <div class="wrap">
    <div class="packages__head">
      <h2 class="h-section" id="pricing-title" data-read>${words(L.packages.title)}</h2>
      <p class="packages__text">${esc(L.packages.text)}</p>
    </div>
    <div class="packages__grid" data-stack>
      ${L.packages.items.map((p, i) => `<article class="pkg">
        <h3 class="pkg__name">${esc(p.name)}</h3>
        <p class="pkg__for">${esc(p.for)}</p>
        <p class="pkg__price">${esc(L.packages.price)}</p>
        <ul class="pkg__list">${p.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <a class="btn btn--block${i === 1 ? '' : ' btn--outline'}" href="${href('book')}">${L.ui.book}</a>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>
${cta(c)}`;
  return page(c, { key: 'services', route: L.routes.services, title: P.metaTitle, description: P.metaDesc, crumb: L.ui.services }, body);
}

function aboutPage(c) {
  const { L, photo } = c;
  const A = L.about;
  const body = `
${pageHero(A.h1, A.sub)}
<section class="story" aria-labelledby="story-title">
  <div class="wrap story__grid">
    <h2 class="h-section" id="story-title" data-read>${words(A.storyTitle)}</h2>
    <div>
      <ol class="story__list">
        ${A.timeline.map((t) => `<li class="story__row" data-on><span class="story__year"${/^\d{4}$/.test(t.y) ? ` data-count="${t.y}"` : ''}>${esc(t.y)}</span><p class="story__text">${esc(t.t)}</p></li>`).join('\n        ')}
      </ol>
      <p class="story__family" data-read>${words(A.family)}</p>
    </div>
  </div>
</section>

<section class="crew" aria-labelledby="crew-title">
  <div class="wrap">
    <h2 class="h-section" id="crew-title" data-read>${words(A.teamTitle)}</h2>
    ${L.team.map((t, i) => `<article class="crew__row${i % 2 ? ' crew__row--flip' : ''}">
      <div class="crew__frame" data-open>${photo(t.img, t.alt, { cls: 'crew__img', attrs: 'data-parallax' })}</div>
      <div class="crew__copy">
        <h3 class="crew__name">${esc(t.name)}</h3>
        <p class="crew__dj">${esc(t.dj)}</p>
        <p class="crew__bio">${esc(t.bio)}</p>
      </div>
    </article>`).join('\n    ')}
    <p class="crew__assoc" data-read>${words(A.associates)}</p>
  </div>
</section>
${cta(c)}`;
  return page(c, { key: 'about', route: L.routes.about, title: A.metaTitle, description: A.metaDesc, crumb: L.ui.about }, body);
}

function galleryPage(c) {
  const { L, photo } = c;
  const G = L.galleryPage;
  const filters = [`<button type="button" class="chip" aria-pressed="true" data-filter="all">${esc(G.all)}</button>`]
    .concat(EVENT_KEYS.map((k) => `<button type="button" class="chip" aria-pressed="false" data-filter="${k}">${esc(ev(L, k).name)}</button>`))
    .join('');
  const body = `
${pageHero(G.h1, G.sub)}
<section class="gallery">
  <div class="wrap">
    <div class="gallery__filters" role="group" aria-label="${L.ui.filterLabel}">${filters}</div>
    <ul class="gallery__grid" data-gallery>
      ${G.items.map((it) => `<li class="gallery__item" data-ev="${it.ev}"><button type="button" class="gallery__btn" aria-label="${L.ui.openPhoto}: ${esc(it.alt)}" data-full="${c.asset('photos/' + it.img + '.jpg')}">${photo(it.img, it.alt, { cls: 'gallery__img' })}</button></li>`).join('\n      ')}
    </ul>
    <div class="gallery__ig">
      <a class="btn btn--lg btn--ghost" href="${config.instagram}" rel="noopener">${esc(G.igCta)}</a>
    </div>
  </div>
  <dialog class="lightbox" aria-label="${esc(G.h1)}">
    <button type="button" class="lightbox__close" aria-label="${esc(G.close)}"><span aria-hidden="true"></span></button>
    <figure class="lightbox__fig"><img class="lightbox__img" alt=""><figcaption class="lightbox__cap"></figcaption></figure>
  </dialog>
</section>
${cta(c)}`;
  return page(c, { key: 'gallery', route: L.routes.gallery, title: G.metaTitle, description: G.metaDesc, crumb: L.ui.gallery }, body);
}

function bookPage(c) {
  const { L } = c;
  const B = L.bookPage;
  const F = B.form;
  const req = `<span class="field__req">${F.required}</span>`;
  const field = (id, label, input, hint = '') =>
    `<div class="field" data-field="${id}"><label class="field__label" for="f-${id}">${label}</label>${hint ? `<p class="field__hint" id="f-${id}-hint">${hint}</p>` : ''}${input}<p class="field__err" id="f-${id}-err" hidden></p></div>`;
  const desc = (id, hint) => `aria-describedby="${hint ? `f-${id}-hint ` : ''}f-${id}-err"`;
  const form = `<form class="book-form" novalidate data-endpoint="${esc(config.formEndpoint)}" data-sending="${esc(F.sending)}"
      data-err-name="${esc(F.errName)}" data-err-email="${esc(F.errEmail)}" data-err-phone="${esc(F.errPhone)}" data-err-event="${esc(F.errEvent)}" data-err-date="${esc(F.errDate)}" data-err-send="${esc(F.errSend)} ${config.phone}.">
    <div class="book-form__row">
      ${field('name', `${F.name} ${req}`, `<input id="f-name" name="name" type="text" autocomplete="name" required ${desc('name')}>`)}
      ${field('email', `${F.email} ${req}`, `<input id="f-email" name="email" type="email" autocomplete="email" required ${desc('email')}>`)}
    </div>
    <div class="book-form__row">
      ${field('phone', `${F.phone} ${req}`, `<input id="f-phone" name="phone" type="tel" autocomplete="tel" required ${desc('phone')}>`)}
      ${field('event', `${F.event} ${req}`, `<select id="f-event" name="event_type" required ${desc('event')}><option value="">${F.eventChoose}</option>${L.events.map((e) => `<option value="${esc(e.name)}" data-key="${e.key}">${esc(e.name)}</option>`).join('')}<option>${F.eventOther}</option></select>`)}
    </div>
    <div class="book-form__row">
      ${field('date', `${F.date} ${req}`, `<input id="f-date" name="event_date" type="date" required ${desc('date')}>`)}
      ${field('venue', F.venue, `<input id="f-venue" name="venue" type="text" ${desc('venue')}>`)}
    </div>
    <div class="book-form__row">
      ${field('guests', F.guests, `<input id="f-guests" name="guests" type="number" min="1" inputmode="numeric" ${desc('guests', 1)}>`, F.guestsHint)}
      <fieldset class="field">
        <legend class="field__label">${F.lang}</legend>
        <div class="seg">
          <label class="seg__opt"><input type="radio" name="language" value="English"${L.lang === 'en' ? ' checked' : ''}><span>English</span></label>
          <label class="seg__opt"><input type="radio" name="language" value="Español"${L.lang === 'es' ? ' checked' : ''}><span>Español</span></label>
        </div>
      </fieldset>
    </div>
    <fieldset class="field">
      <legend class="field__label">${F.services}</legend>
      <div class="chips">
        ${L.services.map((s) => `<label class="chip-check"><input type="checkbox" name="services" value="${esc(s.name)}"><span>${esc(s.name)}</span></label>`).join('')}
      </div>
    </fieldset>
    ${field('message', F.message, `<textarea id="f-message" name="message" rows="5" ${desc('message', 1)}></textarea>`, F.messageHint)}
    <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="book-form__error" role="alert" hidden></p>
    <button class="btn btn--lg book-form__submit" type="submit">${F.submit}</button>
    <p class="book-form__privacy">${esc(F.privacyNote).replace('{privacy}', `<a class="link" href="${c.href('privacy')}">${L.ui.privacy.toLowerCase()}</a>`)}</p>
  </form>
  <div class="book-sent" role="status" hidden tabindex="-1">
    ${mark('book-sent__mark')}
    <h2 class="book-sent__title">${F.sentTitle}</h2>
    <p class="book-sent__text">${F.sentText}</p>
    <button class="btn btn--outline" type="button" data-reset>${F.sentAgain}</button>
  </div>`;
  const body = `
${pageHero(B.h1, B.sub, '', ' page-hero--compact')}
<section class="book">
  <div class="wrap book__grid">
    <div class="book__main">${form}</div>
    <aside class="book__aside" aria-labelledby="reach-title">
      <h2 class="book__reach" id="reach-title">${B.reach}</h2>
      <a class="book__tel" href="tel:${config.phoneE164}">${config.phone}</a>
      <a class="book__mail" href="mailto:${config.email}">${config.email}</a>
      <a class="book__ig" href="${config.instagram}" rel="noopener">${config.instagramHandle}</a>
      <p class="book__note">${B.replyNote}</p>
    </aside>
  </div>
</section>
<section class="faq faq--paper" aria-labelledby="faq-title">
  <div class="wrap faq__grid">
    <h2 class="h-section" id="faq-title" data-read>${words(L.ui.faqTitle)}</h2>
    <div class="faq__list">${faqList(B.faq)}</div>
  </div>
</section>`;
  return page(c, { key: 'book', route: L.routes.book, title: B.metaTitle, description: B.metaDesc, crumb: L.ui.book, faq: B.faq }, body);
}

function privacyPage(c) {
  const { L } = c;
  const P = L.privacy;
  const fill = (t) => esc(t)
    .replace('{email}', `<a class="link" href="mailto:${config.email}">${config.email}</a>`)
    .replace('{phone}', `<a class="link" href="tel:${config.phoneE164}">${config.phone}</a>`);
  const body = `
${pageHero(P.h1, P.sub, '', ' page-hero--compact')}
<section class="legal">
  <div class="wrap legal__body">
    <p class="legal__updated">${P.updatedLabel}: ${P.updated}</p>
    ${P.sections.map((s) => [
      `<h2>${esc(s.h)}</h2>`,
      ...(s.p || []).map((t) => `<p>${fill(t)}</p>`),
      s.list ? `<ul>${s.list.map((t) => `<li>${fill(t)}</li>`).join('')}</ul>` : '',
      ...(s.after || []).map((t) => `<p>${fill(t)}</p>`),
    ].join('')).join('\n    ')}
  </div>
</section>`;
  return page(c, { key: 'privacy', route: L.routes.privacy, title: P.metaTitle, description: P.metaDesc, crumb: L.ui.privacy }, body);
}

function notFoundPage() {
  const c = ctx(en, '404', '404.html');
  const body = `<section class="nf">
  <div class="wrap nf__inner">
    ${mark('nf__mark')}
    <h1 class="nf__title">${en.notFound.title}</h1>
    <p class="nf__text">${en.notFound.text}</p>
    <p class="nf__text" lang="es">${es.notFound.text}</p>
    <div class="cta__actions">
      <a class="btn btn--lg" href="${BASE_PATH}">${en.notFound.home}</a>
      <a class="btn btn--lg btn--ghost" href="${BASE_PATH}${es.routes.home}" lang="es">${es.notFound.home}</a>
    </div>
  </div>
</section>`;
  return page(c, { key: '404', route: '404.html', title: `${en.notFound.title} | ${config.name}`, description: en.notFound.text }, body);
}

// ---------- write ----------
function write(route, html) {
  const file = path.join(OUT, route.endsWith('.html') ? route : route + 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets/img/favicon.svg'), mark().replace('class="mark " ', 'xmlns="http://www.w3.org/2000/svg" '));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const routes = [];
for (const L of Object.values(LANGS)) {
  const make = (key) => ctx(L, key, L.routes[key]);
  write(L.routes.home, home(make('home')));
  for (const e of L.events) write(L.routes[e.key], eventPage(make(e.key), e));
  write(L.routes.services, servicesPage(make('services')));
  write(L.routes.about, aboutPage(make('about')));
  write(L.routes.gallery, galleryPage(make('gallery')));
  write(L.routes.book, bookPage(make('book')));
  write(L.routes.privacy, privacyPage(make('privacy')));
}
write('404.html', notFoundPage());

for (const key of Object.keys(en.routes)) routes.push(key);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${routes.flatMap((k) => [en, es].map((L) => `  <url>
    <loc>${abs(L.routes[k])}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(en.routes[k])}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${abs(es.routes[k])}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(en.routes[k])}"/>
    <changefreq>${k === 'privacy' ? 'yearly' : 'monthly'}</changefreq>
    <priority>${k === 'home' ? '1.0' : EVENT_KEYS.includes(k) || k === 'book' ? '0.9' : k === 'privacy' ? '0.3' : '0.7'}</priority>
  </url>`)).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);
fs.writeFileSync(path.join(OUT, 'site.webmanifest'), JSON.stringify({
  name: config.name,
  short_name: 'One Source',
  start_url: './',
  display: 'browser',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    { src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2));

console.log(`Built ${routes.length * 2 + 1} pages into docs/`);
