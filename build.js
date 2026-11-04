#!/usr/bin/env node
/* CREAVYN static build. No dependencies. Reads data/site.json and writes ./dist */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const ORIGIN = S.origin;

let BASE = ''; // '' = relative links (flat site). Set to '/' only for 404.html, which can be served from any path.
const link = (p) => (p === '/' ? (BASE || './') : BASE + p.slice(1));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const waLink = (p) => `https://wa.me/${p.wa}?text=${encodeURIComponent(S.whatsappMessage)}`;
const ext = 'target="_blank" rel="noopener noreferrer"';
const arrow = '<span class="arr" aria-hidden="true">→</span>';
const star = '<svg class="mock-star" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40Z"/></svg>';
const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3 4c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.7 3.4.7.5-.1 1.700-.7 1.900-1.400.2-.7.2-1.200.2-1.400-.1-.1-.3-.2-.6-.3l-1.800-.9c-.2-.1-.4-.1-.6.100l-.8 1c-.1.2-.3.2-.6.1a6.700 6.700 0 0 1-3.300-2.900c-.2-.3 0-.4.200-.6l.4-.5.3-.4c.1-.2.100-.3 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4Z"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v.5l8 5.300 8-5.300V7H4Zm16 2.900-8 5.300-8-5.300V17h16V9.900Z"/></svg>';

/* ---------- project preview: real image if present, otherwise a branded title card ---------- */
function previewFor(p, i, eager) {
  for (const e of ['webp', 'jpg', 'jpeg', 'png']) {
    const f = path.join(ROOT, 'src/assets', `preview-${p.slug}.${e}`);
    if (fs.existsSync(f)) {
      return `<img src="${BASE}preview-${p.slug}.${e}" alt="${esc(p.previewAlt)}" width="1600" height="1000" ${eager ? '' : 'loading="lazy" decoding="async"'}>`;
    }
  }
  // No local image: load the live homepage preview automatically from the project's URL (WordPress mShots screenshot service).
  // The branded title card sits underneath and shows while the preview loads, or if it cannot be loaded.
  const host = new URL(p.url).host;
  const shot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(p.url)}?w=1280&h=800`;
  return `<div class="mock" aria-hidden="true" style="--tone:${p.tone};--accent:${p.accent}">
    <div class="mock-bar"><i></i><i></i><i></i><span>${esc(host)}</span></div>
    <div class="mock-body">${star}<span class="mock-cat">${esc(p.category.split(' / ')[0])}</span><span class="mock-title">${esc(p.title)}</span></div>
  </div><img class="shot" src="${shot}" alt="${esc(p.previewAlt)}" width="1280" height="800" referrerpolicy="no-referrer" ${eager ? '' : 'loading="lazy" decoding="async"'} onerror="this.remove()">`;
}

function projectCard(p, i, variant, delay = 0) {
  const n = String(i + 1).padStart(2, '0');
  const dir = variant === 'wide' ? (i % 2 ? 'right' : 'left') : 'up';
  return `<article class="project project--${variant}" data-reveal="${dir}" style="--d:${delay}">
  <a class="project-media" href="${esc(p.url)}" ${ext} tabindex="-1" aria-hidden="true" data-parallax-img>${previewFor(p, i, i === 0)}</a>
  <div class="project-body">
    <p class="eyebrow">${n} — ${esc(p.category)}${p.status ? `<span class="badge">${esc(p.status)}</span>` : ''}</p>
    <h3>${esc(p.title)}</h3>
    <p class="project-desc">${esc(p.description)}</p>
    ${p.highlight ? `<p class="project-hl">${esc(p.highlight)}</p>` : ''}
    ${p.note ? `<p class="project-note">${esc(p.note)}</p>` : ''}
    <p class="project-meta"><b>Our contribution</b>${esc(p.contribution)}</p>
    <a class="btn solid" href="${esc(p.url)}" ${ext}>View Live Website ${arrow}<span class="sr"> — ${esc(p.title)}, opens in a new tab</span></a>
  </div>
</article>`;
}

/* ---------- shared fragments ---------- */
const NAV = [['Home', '/'], ['Work', '/work'], ['Services', '/services'], ['About', '/about'], ['Contact', '/contact']];

function header(current) {
  const links = NAV.map(([t, h]) => `<a class="link" href="${link(h)}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="header" id="top">
  <a class="logo" href="${link('/')}" aria-label="CREAVYN home"><img src="${BASE}logo-horizontal.png" alt="CREAVYN, create design develop" width="245" height="42"></a>
  <nav class="nav" id="nav" aria-label="Main">
    ${links}
    <span class="nav-quick">
      <a class="icon-btn" href="${waLink(S.phones[0])}" ${ext} aria-label="Message CREAVYN on WhatsApp (opens in a new tab)">${ICON_WA}</a>
      <a class="icon-btn" href="mailto:${S.email}" aria-label="Email CREAVYN">${ICON_MAIL}</a>
    </span>
    <a class="btn solid" href="${link('/contact')}">Start a Project ${arrow}</a>
    <span class="nav-contact">
      <a href="mailto:${S.email}">Email</a>
      <a href="${waLink(S.phones[0])}" ${ext}>WhatsApp ${esc(S.phones[0].label)}</a>
      <a href="${waLink(S.phones[1])}" ${ext}>WhatsApp ${esc(S.phones[1].label)}</a>
      <a href="${S.instagram}" ${ext}>Instagram</a>
    </span>
  </nav>
  <button class="menu-btn" id="menuBtn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span></button>
</header>`;
}

function contactGrid() {
  return `<div class="contact-grid" data-reveal="up">
    <div><h3>Email</h3><ul><li><a href="mailto:${S.email}">${S.email}</a></li></ul></div>
    <div><h3>WhatsApp</h3><ul>${S.phones.map((p) => `<li><a href="${waLink(p)}" ${ext}>${esc(p.label)}<span class="sr"> on WhatsApp, opens in a new tab</span></a></li>`).join('')}</ul></div>
    <div><h3>Call</h3><ul>${S.phones.map((p) => `<li><a href="tel:${p.tel}">${esc(p.label)}</a></li>`).join('')}</ul></div>
    <div><h3>Elsewhere</h3><ul><li><a href="${S.instagram}" ${ext}>Instagram @creavyn.in<span class="sr"> (opens in a new tab)</span></a></li><li class="sub">${esc(S.location)}</li></ul></div>
  </div>`;
}

function footer() {
  return `<footer>
  <div class="wrap">
    <div class="foot">
      <div><img src="${BASE}logo-stacked.png" alt="CREAVYN, create design develop" width="131" height="96" loading="lazy"><p class="loc">An independent creative digital studio based in ${esc(S.location)}.</p></div>
      <nav aria-label="Footer"><h2>Explore</h2><ul>${NAV.map(([t, h]) => `<li><a href="${link(h)}">${t}</a></li>`).join('')}</ul></nav>
      <div><h2>Contact</h2><ul>
        <li><a href="mailto:${S.email}">${S.email}</a></li>
        ${S.phones.map((p) => `<li><a href="tel:${p.tel}">${esc(p.label)}</a></li>`).join('')}
      </ul></div>
      <div><h2>Message us</h2><ul>
        ${S.phones.map((p) => `<li><a href="${waLink(p)}" ${ext}>WhatsApp ${esc(p.label)}<span class="sr"> (opens in a new tab)</span></a></li>`).join('')}
        <li><a href="${S.instagram}" ${ext}>Instagram<span class="sr"> (opens in a new tab)</span></a></li>
        <li><a href="https://${S.domain}">${S.domain}</a></li>
      </ul></div>
    </div>
    <div class="legal"><span>&copy; <span id="yr">2026</span> CREAVYN. All rights reserved.</span><span>${S.tagline}</span></div>
  </div>
</footer>`;
}

function ctaBand(withGrid = true) {
  return `<section class="dark contact-band" id="contact-preview" aria-labelledby="cta-h">
  <div class="wrap">
    <h2 id="cta-h" data-reveal="blur">Have a project in mind?</h2>
    <p class="lead" data-reveal="up" style="--d:120">Tell us a little about what you want to build. We read every message and reply personally.</p>
    <div class="cta-row" data-reveal="up" style="--d:200">
      <a class="btn solid" href="${link('/contact')}">Start a Project ${arrow}</a>
      <a class="btn ghost" href="${waLink(S.phones[0])}" ${ext}>WhatsApp us<span class="sr"> (opens in a new tab)</span></a>
    </div>
    ${withGrid ? contactGrid() : ''}
  </div>
</section>`;
}

/* ---------- JSON-LD ---------- */
const orgId = `${ORIGIN}/#organization`;
const org = {
  '@type': ['Organization', 'ProfessionalService'],
  '@id': orgId,
  name: 'CREAVYN',
  alternateName: ['Creavyn Studio', 'CREAVYN Creative Studio'],
  url: ORIGIN + '/',
  logo: `${ORIGIN}/logo-stacked.png`,
  image: `${ORIGIN}/og-image.png`,
  description: 'CREAVYN is an independent creative digital studio offering website design, website development, UI/UX design, branding and creative digital experiences.',
  slogan: 'CREATE • DESIGN • DEVELOP',
  email: S.email,
  telephone: S.phones.map((p) => p.tel),
  sameAs: [S.instagram],
  address: { '@type': 'PostalAddress', addressLocality: 'Hooghly', addressRegion: 'West Bengal', addressCountry: 'IN' },
  areaServed: { '@type': 'AdministrativeArea', name: 'West Bengal, India' },
  founder: [{ '@id': `${ORIGIN}/about#abdur-rahman-mallik` }, { '@id': `${ORIGIN}/about#arpan` }]
};
const website = { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: ORIGIN + '/', name: 'CREAVYN', publisher: { '@id': orgId }, inLanguage: 'en' };
const persons = S.founders.map((f) => ({
  '@type': 'Person',
  '@id': `${ORIGIN}/about#${f.name.toLowerCase().replace(/\s+/g, '-')}`,
  name: f.name,
  ...(f.id === 'abdur' ? { alternateName: ['Abdur Rahman', 'Abdur R. Mallik'] } : {}),
  jobTitle: f.role,
  worksFor: { '@id': orgId }
}));
function crumbs(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })) };
}
function webpage(p, title, desc, type = 'WebPage') {
  return { '@type': type, '@id': ORIGIN + p + '#webpage', url: ORIGIN + p, name: title, description: desc, isPartOf: { '@id': `${ORIGIN}/#website` }, about: { '@id': orgId }, inLanguage: 'en' };
}

/* ---------- page shell ---------- */
function page({ path: p, title, desc, key, body, graph, ogImage = '/og-image.png', extraHead = '', extraBody = '' }) {
  const url = ORIGIN + p;
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return `<!DOCTYPE html>
<html lang="en" data-page="${key}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#F4F0E9">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CREAVYN">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="CREAVYN — CREATE • DESIGN • DEVELOP">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ORIGIN}${ogImage}">
<link rel="icon" href="${BASE}favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="${BASE}favicon-32.png">
<link rel="apple-touch-icon" href="${BASE}apple-touch-icon.png">
<link rel="manifest" href="${BASE}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<script>(function(){var d=document.documentElement;d.classList.add('js');try{var r=matchMedia('(prefers-reduced-motion:reduce)').matches;var t=+localStorage.getItem('creavyn-intro');if(d.dataset.page==='home'&&!r&&(!t||Date.now()-t>43200000))d.classList.add('intro-on')}catch(e){}})();</script>
<link rel="stylesheet" href="${BASE}styles.css">
<noscript><style>.hero-top,.info,.duo,.hero-bar,.strip,.header{opacity:1!important;transform:none!important}.hero-top{transform:translateX(-50%)!important}.ch i{transform:none!important}</style></noscript>
${extraHead}
<script type="application/ld+json">${ld}</script>
</head>
<body>
${header(key === 'home' ? '/' : p)}
<main id="main">
${body}
</main>
${footer()}
${extraBody}
<script src="${BASE}main.js" defer></script>
</body>
</html>
`;
}

/* ---------- pages ---------- */
const pages = [];

// HOME
(function home() {
  const f = S.founders;
  const left = f.map((x) => `<div class="fp"><p class="fp-index"><b>${x.index}</b> / 0${f.length}</p><h2 class="fp-name">${esc(x.name)}</h2><p class="fp-role">${esc(x.role)}</p><p class="fp-line">${esc(x.headline)}</p></div>`).join('');
  const right = f.map((x) => `<div class="fp"><p class="fp-bio">${esc(x.bio)}</p><ul class="stats">${x.focus.map((t, i) => `<li><strong>0${i + 1}</strong><span>${esc(t)}</span></li>`).join('')}</ul></div>`).join('');
  const chevL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const chevR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const feat = S.projects.slice(0, 3);
  const title = 'CREAVYN | Creative Digital Studio — Website Design & Development in Hooghly, West Bengal';
  const desc = 'CREAVYN is an independent creative digital studio in Hooghly, West Bengal. We design and develop distinctive websites, e-commerce stores and digital experiences.';
  const body = `
<div class="intro" id="intro" aria-hidden="true"><div class="intro-inner"><div class="intro-mark"></div><div class="intro-line"></div><p class="intro-tag">${S.tagline}</p></div></div>
<section class="hero" id="hero" style="padding-left:0;padding-right:0;padding-bottom:0" aria-label="CREAVYN introduction">
  <div class="hero-top">
    <h1 class="hero-title">We turn ideas into <em class="ser">digital experiences.</em></h1>
    <p class="hero-sub">Thoughtful design meets purposeful development. We create websites that look distinctive and work beautifully.</p>
  </div>
  <div class="word-wrap" aria-hidden="true"><div class="word" id="word"></div></div>
  <div class="duo-wrap"><picture>
    <source type="image/webp" srcset="${BASE}duo_hero-400.webp 400w, ${BASE}duo_hero.webp 594w" sizes="(max-width:1024px) 94vw, 40vw">
    <img class="duo" id="duo" src="${BASE}duo_hero.png" alt="Abdur Rahman Mallik and Arpan, the two founders of CREAVYN, in black suits" width="594" height="752" fetchpriority="high">
  </picture></div>
  <div class="strip" aria-hidden="true"><div class="track" id="track"></div></div>
  <div class="info info-left" role="group" aria-label="Founder profile"><div class="slot">${left}</div></div>
  <div class="info info-right" role="group" aria-label="Founder focus areas"><div class="slot">${right}</div></div>
  <div class="hero-bar">
    <button class="arrow" type="button" data-dir="-1" aria-label="Previous founder">${chevL}</button>
    <a class="btn solid" href="${link('/contact')}">Start a Project</a>
    <a class="btn ghost" href="${link('/work')}">Explore Our Work</a>
    <button class="arrow" type="button" data-dir="1" aria-label="Next founder">${chevR}</button>
  </div>
  <p class="sr" id="founderLive" role="status" aria-live="polite"></p>
</section>

<section aria-labelledby="studio-h">
  <div class="wrap statement">
    <p class="eyebrow" data-reveal="up">The studio</p>
    <div>
      <h2 id="studio-h" class="statement-text" data-reveal="blur">CREAVYN is an independent creative digital studio built by two young minds who share a passion for <em class="ser">design, technology and innovation.</em></h2>
      <div class="statement-meta" data-reveal="up" style="--d:150">
        <p><b>Based in</b>${esc(S.location)}</p>
        <p><b>Founded by</b>Abdur Rahman Mallik &amp; Arpan</p>
        <p><b>We work on</b>Websites, e-commerce, branding and digital experiences</p>
      </div>
      <p style="margin-top:32px;--d:200" data-reveal="up"><a class="text-link" href="${link('/about')}">About CREAVYN ${arrow}</a></p>
    </div>
  </div>
</section>

<section class="alt" id="work" aria-labelledby="work-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="work-h" data-reveal="left">Selected work</h2>
      <p data-reveal="right">A look at what we have designed and built. Every project below is live, and each one links straight to the real website.</p>
    </div>
    <div class="project-grid">
      ${projectCard(feat[0], 0, 'wide')}
      ${projectCard(feat[1], 1, 'grid', 0)}
      ${projectCard(feat[2], 2, 'grid', 120)}
    </div>
    <p style="margin-top:56px" data-reveal="up"><a class="btn ghost" href="${link('/work')}">See all ${S.projects.length} projects ${arrow}</a></p>
  </div>
</section>

<section id="services" aria-labelledby="services-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="services-h" data-reveal="left">Create. Design. Develop.</h2>
      <p data-reveal="right">Eight services across design and development. Tell us the outcome you want and we will shape the right mix.</p>
    </div>
    <div class="rows compact">
      ${S.services.map((s, i) => `<article class="row" data-reveal="up" style="--d:${(i % 4) * 70}"><span class="row-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.title)}</h3><div><p>${esc(s.summary)}</p></div></article>`).join('')}
    </div>
    <p style="margin-top:48px" data-reveal="up"><a class="text-link" href="${link('/services')}">Explore all services ${arrow}</a></p>
  </div>
</section>

<section class="dark" id="process" aria-labelledby="process-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="process-h" data-reveal="blur">Our creative approach</h2>
      <p data-reveal="right">A simple, transparent way of working, so you always know what happens next.</p>
    </div>
    <ol class="steps">
      ${S.process.map((s, i) => `<li class="step" data-reveal="${['left', 'up', 'up', 'right'][i]}" style="--d:${i * 90}"><div class="step-n">0${i + 1}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section id="founders" aria-labelledby="founders-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="founders-h" data-reveal="left">Meet the founders</h2>
      <p data-reveal="right">Young minds. Bold ideas. You work directly with the two people who design and build your project.</p>
    </div>
    <div class="founders">
      <div class="portrait" data-reveal="scale"><picture><source type="image/webp" srcset="${BASE}duo_hero-400.webp 400w, ${BASE}duo_hero.webp 594w" sizes="(max-width:1024px) 80vw, 40vw"><img src="${BASE}duo_hero.png" alt="Founders Abdur Rahman Mallik and Arpan of CREAVYN" width="594" height="752" loading="lazy" decoding="async" data-parallax></picture></div>
      <ul class="founder-list">
        ${f.map((x, i) => `<li data-reveal="${i ? 'right' : 'left'}"><h3>${esc(x.name)}</h3><p class="role">${esc(x.role)}</p><p>${esc(x.bio)}</p></li>`).join('')}
      </ul>
    </div>
    <p style="margin-top:40px" data-reveal="up"><a class="text-link" href="${link('/about')}">Read our story ${arrow}</a></p>
  </div>
</section>

${ctaBand(true)}`;
  pages.push({
    path: '/', key: 'home', title, desc, body,
    graph: [org, website, webpage('/', title, desc)]
  });
})();

// ABOUT
(function about() {
  const title = 'About CREAVYN | Creative Studio by Abdur Rahman Mallik & Arpan';
  const desc = 'Meet CREAVYN Creative Studio, founded by Abdur Rahman Mallik and Arpan in Hooghly, West Bengal. Young minds, bold ideas and meaningful digital experiences.';
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${link('/')}">Home</a> / About</nav>
    <h1 data-reveal="blur">Young minds. Bold ideas.</h1>
    <p class="lead" data-reveal="up" style="--d:150">Meaningful digital experiences, made by CREAVYN, an independent creative studio in ${esc(S.location)}.</p>
  </div>
</section>
<section class="alt" aria-labelledby="story-h">
  <div class="wrap prose">
    <h2 id="story-h" class="eyebrow" data-reveal="up">Our story</h2>
    <div>
      <p class="big" data-reveal="blur">We don’t just build websites. We create digital experiences <em class="ser">with purpose.</em></p>
      <p data-reveal="up">CREAVYN brings together thoughtful creativity, design thinking and purposeful development. We are an independent studio built by two young minds with a shared passion for design, technology and innovation.</p>
      <p data-reveal="up">We believe a great digital experience should not only look distinctive but also communicate clearly, work beautifully and serve a meaningful purpose.</p>
      <p data-reveal="up">We may be at the beginning of our journey, but that is part of what drives us: fresh thinking, close attention to every detail and the ambition to create work that speaks for itself.</p>
    </div>
  </div>
</section>
<section aria-labelledby="founders-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="founders-h" data-reveal="left">The founders</h2><p data-reveal="right">Two creative developers, one studio. Abdur Rahman Mallik and Arpan lead every project together.</p></div>
    ${S.founders.map((x, i) => `<article class="founder-detail" id="${x.name.toLowerCase().replace(/\s+/g, '-')}" data-reveal="${i ? 'right' : 'left'}">
      <span class="row-n">${x.index}</span>
      <div><h3>${esc(x.name)}</h3><p class="role">${esc(x.role)}</p></div>
      <div><p>${esc(x.bio)}</p><ul>${x.focus.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
    </article>`).join('')}
  </div>
</section>
<section class="alt" aria-labelledby="values-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="values-h" data-reveal="left">What guides our work</h2></div>
    <ul class="values">
      <li data-reveal="up"><h3>Clarity first</h3><p>Good design explains itself. We organise content so visitors know where they are and what to do.</p></li>
      <li data-reveal="up" style="--d:100"><h3>Craft in the details</h3><p>Typography, spacing and motion are decided on purpose, then tested on real devices.</p></li>
      <li data-reveal="up" style="--d:200"><h3>Built to last</h3><p>Clean, accessible, fast code that is straightforward to maintain and extend.</p></li>
    </ul>
  </div>
</section>
${ctaBand(false)}`;
  pages.push({
    path: '/about', key: 'about', title, desc, body,
    graph: [org, website, ...persons, webpage('/about', title, desc, 'AboutPage'), crumbs([['Home', '/'], ['About', '/about']])]
  });
})();

// SERVICES
(function services() {
  const title = 'Services | Website Design, Development & UI/UX — CREAVYN';
  const desc = 'Website design, website development, UI/UX, landing pages, e-commerce, branding and website redesign from CREAVYN, a web design studio in Hooghly, West Bengal.';
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${link('/')}">Home</a> / Services</nav>
    <h1 data-reveal="blur">Our services</h1>
    <p class="lead" data-reveal="up" style="--d:150">Eight services, one studio. As a website designer and web developer in Hooghly serving clients across West Bengal and beyond, we offer affordable website design for businesses and creators who want something distinctive.</p>
  </div>
</section>
<section aria-label="All services">
  <div class="wrap">
    <div class="rows">
      ${S.services.map((s, i) => `<article class="row" id="${s.slug}" data-reveal="${i % 2 ? 'right' : 'left'}"><span class="row-n">${String(i + 1).padStart(2, '0')}</span><h2 style="font-family:var(--display);font-weight:400;font-size:clamp(28px,3.2vw,48px);line-height:1">${esc(s.title)}</h2><div><p>${esc(s.summary)}</p><p class="value">${esc(s.value)}</p><ul>${s.includes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></article>`).join('')}
    </div>
  </div>
</section>
<section class="alt" aria-labelledby="process-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="process-h" data-reveal="left">How we work</h2><p data-reveal="right">Every service follows the same simple path.</p></div>
    <ol class="steps" style="border-top-color:var(--charcoal)">
      ${S.process.map((s, i) => `<li class="step" style="color:var(--charcoal);--d:${i * 90}" data-reveal="up"><div class="step-n">0${i + 1}</div><h3>${esc(s.title)}</h3><p style="color:var(--ink-soft)">${esc(s.text)}</p></li>`).join('')}
    </ol>
  </div>
</section>
${ctaBand(false)}`;
  pages.push({
    path: '/services', key: 'services', title, desc, body,
    graph: [org, website, webpage('/services', title, desc, 'CollectionPage'), crumbs([['Home', '/'], ['Services', '/services']]),
      ...S.services.map((s) => ({ '@type': 'Service', '@id': `${ORIGIN}/services#${s.slug}`, name: s.title, description: `${s.summary} ${s.value}`, provider: { '@id': orgId }, areaServed: { '@type': 'AdministrativeArea', name: 'West Bengal, India' }, url: `${ORIGIN}/services#${s.slug}` }))]
  });
})();

// WORK
(function work() {
  const title = 'Our Work | Websites & Digital Experiences — CREAVYN';
  const desc = 'Selected CREAVYN projects: e-commerce stores, a web application, a demo business website and an editorial tribute site, each with a live link.';
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${link('/')}">Home</a> / Work</nav>
    <h1 data-reveal="blur">Our work</h1>
    <p class="lead" data-reveal="up" style="--d:150">Five projects, from online stores to an editorial experience. Open any of them to see the live website.</p>
  </div>
</section>
<section class="alt" aria-label="Projects">
  <div class="wrap">
    <div class="project-grid">
      ${S.projects.map((p, i) => projectCard(p, i, i === 0 || i === 1 ? 'wide' : 'grid', i > 1 ? (i - 2) * 100 : 0)).join('')}
    </div>
  </div>
</section>
${ctaBand(false)}`;
  pages.push({
    path: '/work', key: 'work', title, desc, body,
    graph: [org, website, webpage('/work', title, desc, 'CollectionPage'), crumbs([['Home', '/'], ['Work', '/work']]),
      { '@type': 'ItemList', name: 'CREAVYN projects', itemListElement: S.projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: p.url })) }]
  });
})();

// CONTACT
(function contact() {
  const title = 'Contact CREAVYN | Start a Project — Hooghly, West Bengal';
  const desc = 'Start a project with CREAVYN. Message us on WhatsApp, call, email creavyn.in@gmail.com or message us on Instagram. Based in Hooghly, West Bengal, India.';
  const cfg = JSON.stringify({ email: S.email, whatsappMessage: S.whatsappMessage }).replace(/</g, '\\u003c');
  const types = ['Website Design', 'Website Development', 'UI/UX Design', 'Landing Page Design', 'E-commerce Website', 'Branding & Graphic Design', 'Creative Digital Experience', 'Website Redesign', 'Not sure yet'];
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${link('/')}">Home</a> / Contact</nav>
    <h1 data-reveal="blur">Let’s talk</h1>
    <p class="lead" data-reveal="up" style="--d:150">Tell us what you would like to build. Choose whichever way suits you best and we will get back to you personally.</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap contact-layout">
    <div>
      <div class="method" data-reveal="up"><h2>WhatsApp</h2>
        <p class="note">Each button opens WhatsApp with a ready message. You can read and edit it before sending, and nothing is sent automatically.</p>
        ${S.phones.map((p) => `<p class="num">${esc(p.label)}</p><div class="pair"><a class="btn solid" href="${waLink(p)}" ${ext}>WhatsApp ${esc(p.label)}<span class="sr"> (opens in a new tab)</span></a><a class="btn ghost" href="tel:${p.tel}">Call ${esc(p.label)}</a></div>`).join('')}
      </div>
      <div class="method" data-reveal="up"><h2>Email</h2><a class="big-link" href="mailto:${S.email}">${S.email}</a></div>
      <div class="method" data-reveal="up"><h2>Instagram</h2><a class="big-link" href="${S.instagram}" ${ext}>@creavyn.in<span class="sr"> (opens in a new tab)</span></a></div>
      <div class="method" data-reveal="up"><h2>Studio</h2><p>${esc(S.location)}</p><p class="note">Website: <a class="text-link" href="https://${S.domain}">${S.domain}</a></p></div>
    </div>
    <form class="form" id="enquiryForm" data-reveal="up" style="--d:100" novalidate>
      <h2>Write your enquiry</h2>
      <p class="hint">Fill this in and choose how to send it. The message opens in WhatsApp or your email app for you to review first.</p>
      <div class="field"><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="name" required aria-describedby="nameErr"><span class="err" id="nameErr" role="alert"></span></div>
      <div class="field"><label for="type">What do you need?</label><select id="type" name="type"><option value="">Choose a service (optional)</option>${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></div>
      <div class="field"><label for="message">About your project</label><textarea id="message" name="message" required aria-describedby="messageErr"></textarea><span class="err" id="messageErr" role="alert"></span></div>
      <div class="cta-row">
        ${S.phones.map((p) => `<button type="button" class="btn solid" data-send="${p.wa}">WhatsApp ${esc(p.label)}</button>`).join('')}
        <button type="button" class="btn ghost" data-send="email">Send by email</button>
      </div>
      <p class="form-status" id="formStatus" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>
<script type="application/json" id="contactCfg">${cfg}</script>`;
  pages.push({
    path: '/contact', key: 'contact', title, desc, body,
    graph: [org, website, webpage('/contact', title, desc, 'ContactPage'), crumbs([['Home', '/'], ['Contact', '/contact']])]
  });
})();

/* ---------- write ---------- */
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (!/README/i.test(e.name)) fs.copyFileSync(s, d);
  }
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const e of fs.readdirSync(path.join(ROOT, 'src/assets'), { withFileTypes: true })) {
  if (e.isFile() && !/\.md$/i.test(e.name)) fs.copyFileSync(path.join(ROOT, 'src/assets', e.name), path.join(DIST, e.name));
}
copyDir(path.join(ROOT, 'public'), DIST);
fs.copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(DIST, 'styles.css'));
fs.copyFileSync(path.join(ROOT, 'src/main.js'), path.join(DIST, 'main.js'));

for (const p of pages) {
  const out = p.path === '/' ? path.join(DIST, 'index.html') : path.join(DIST, p.path.slice(1) + '.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page(p));
}

// 404 (noindex): absolute paths because it can be shown at any URL
BASE = '/';
fs.writeFileSync(path.join(DIST, '404.html'), page({
  path: '/404.html', key: 'notfound', title: 'Page not found | CREAVYN', desc: 'This page could not be found. Return to the CREAVYN homepage.',
  graph: [org], extraHead: '<meta name="robots" content="noindex">',
  body: `<section class="page-hero"><div class="wrap"><h1>Page not found</h1><p class="lead">The page you are looking for does not exist.</p><div class="cta-row"><a class="btn solid" href="${link('/')}">Back to home</a><a class="btn ghost" href="${link('/contact')}">Contact us</a></div></div></section>`
}).replace('content="index, follow, max-image-preview:large"', 'content="noindex"'));

// sitemap + robots (production URLs only)
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>\n    <loc>${ORIGIN}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p.path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages + 404, sitemap.xml, robots.txt -> ${path.relative(process.cwd(), DIST) || 'dist'}`);
