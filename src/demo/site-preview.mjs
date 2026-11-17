import { escapeReportHtml as esc } from '../audit/report-html.mjs';

const copy = {
  fr: {
    demo: 'Démonstration Ancrage', synthetic: 'ANCRAGE · Démonstration avec données fictives',
    about: 'À propos', menu: 'La carte', gallery: 'En images', contact: 'Contact et accès', hours: 'Horaires',
    write: 'Écrire', call: 'Appeler', directions: 'Itinéraire',
    photos: { facade: 'Vue extérieure', 'interior-or-terrace': 'Vue du lieu', 'team-or-service': 'Équipe ou activité', 'signature-dish-1': 'Plat de la carte', 'signature-dish-2': 'Autre plat de la carte' },
    days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  },
  en: {
    demo: 'Ancrage website preview', synthetic: 'ANCRAGE · Preview with fictional data',
    about: 'About', menu: 'Menu', gallery: 'Gallery', contact: 'Contact and directions', hours: 'Opening hours',
    write: 'Email', call: 'Call', directions: 'Directions',
    photos: { facade: 'Exterior view', 'interior-or-terrace': 'View of the premises', 'team-or-service': 'Team or work in progress', 'signature-dish-1': 'Dish from the menu', 'signature-dish-2': 'Another dish from the menu' },
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
};
const weekdays = copy.en.days.map(day => day.toUpperCase());

const style = `
  :root{color-scheme:light;--ink:#232720;--paper:#f6f4ed;--ground:#eaece2;--accent:#354536;--line:#ccd2c5;--display:Georgia,serif}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,sans-serif}
  body>div{min-height:100vh;background:var(--paper);color:var(--ink)}
  a{color:inherit;text-underline-offset:.25em}
  a:focus-visible{outline:2px solid currentColor;outline-offset:4px}
  ::selection{background:var(--accent);color:#fff}
  h1,h2,h3,p,address,dd{overflow-wrap:anywhere}
  h1,h2{font-family:var(--display);font-weight:400;letter-spacing:-.035em;line-height:1.02;text-wrap:balance}
  h1{font-size:clamp(2.75rem,8vw,6rem);margin:0 0 18px}
  h2{font-size:clamp(2rem,5vw,4.25rem);margin:0 0 24px}
  p{margin:0 0 1em}p:last-child{margin-bottom:0}
  img{display:block;width:100%;height:100%;object-fit:cover}
  .wrap{width:min(1200px,100% - 2 * clamp(18px,5vw,72px));margin:auto}
  .bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px 24px;padding:9px 0;border-bottom:1px solid var(--line)}
  .bar p{margin:0;font-size:.875rem}
  nav,.links{display:flex;flex-wrap:wrap;gap:0 18px}
  nav a,.links a,.hero-link{display:inline-flex;align-items:center;min-height:44px}
  nav a{font-size:.9375rem}
  .hero{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,5fr);align-items:center;gap:clamp(20px,5vw,72px);padding-block:clamp(32px,7vw,96px)}
  .hero-copy{min-width:0}
  .hero p{font-size:1.125rem}
  .hero-link{margin-top:10px;padding:0 18px;background:var(--accent);color:#fff}
  .hero-image{aspect-ratio:6/5;margin:0;background:var(--ground)}
  .story,.gallery-section,.details,.menu-section{padding-block:clamp(28px,6vw,80px)}
  .story,.gallery-section,.details{border-top:1px solid var(--line)}
  .story{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:12px 32px}
  .story p{max-width:64ch;font-size:clamp(1rem,2vw,1.2rem)}
  .gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(10px,2vw,24px)}
  .gallery img{aspect-ratio:4/3;height:auto;background:var(--ground)}
  .details{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .details h2{font-size:clamp(1.75rem,4vw,3rem)}
  address{font-style:normal;margin-bottom:12px}
  .hours,.menu{margin:0;padding:0;list-style:none;font-variant-numeric:tabular-nums}
  .hours div,.menu li{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:10px 0}
  dd{margin:0}.menu h3{margin:0;font-size:1.125rem}.menu p{margin:4px 0 0}
  .menu strong{flex-shrink:0}
  .menu-section{background:var(--ground)}
  .menu-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:clamp(20px,5vw,80px)}
  .menu-layout img{height:auto;aspect-ratio:4/3;margin-top:26px}
  .table-site{--paper:#fbf5e8;--ink:#2d1c18;--ground:#efe4d1;--accent:#793525;--line:#d9c8b2}
  .table-site .hero{grid-template-columns:minmax(0,2fr) minmax(0,3fr)}
  .table-site .hero-image{aspect-ratio:5/4;border-radius:48% 48% 0 0 / 40% 40% 0 0;overflow:hidden}
  .photo-site .hero{grid-template-columns:1fr;gap:24px}
  .photo-site .hero-image{aspect-ratio:2/1}
  .text-site .hero,.hero.no-image{grid-template-columns:1fr}
  .text-site .hero{min-height:min(60vh,480px)}
  .text-site .hero-copy{max-width:780px}
  @media(max-width:690px){
    .hero,.table-site .hero,.story,.menu-layout,.details{grid-template-columns:1fr}
    .photo-site .hero-image{aspect-ratio:4/3}
    .menu-layout img{margin-top:0}
    .story h2,.details h2,.menu-section h2{margin-bottom:14px}
  }
  @media(max-width:410px){.gallery{grid-template-columns:1fr}}
`;

function contactAction(value, c) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { href: `mailto:${encodeURIComponent(value)}`, label: c.write };
  const number = value.replace(/[\s().-]/g, '');
  if (/^\+?\d{7,15}$/.test(number)) return { href: `tel:${number}`, label: c.call };
  return null;
}

export function renderSitePreview({ name, city, country, address = '', contact = '', story = '', menu = [], images = [], hours = [], locale = 'fr-FR', synthetic = false }) {
  const language = /^en(?:-|$)/i.test(locale) ? 'en' : 'fr';
  const c = copy[language];
  const culinary = menu.length > 0;
  const variant = culinary ? 'table-site' : images.length ? 'photo-site' : 'text-site';
  const heroImage = images.find(item => item.category === (culinary ? 'interior-or-terrace' : 'team-or-service')) ?? images[0];
  const menuImage = culinary ? images.find(item => item !== heroImage && item.category === 'signature-dish-1') : null;
  const gallery = images.filter(item => item !== heroImage && item !== menuImage);
  const picture = (item, primary = false) => `<img src="${esc(item.dataUrl)}" alt="${esc(item.alt || c.photos[item.category] || '')}" ${primary ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
  const currency = /^(FR|France)$/i.test(country ?? '') ? 'EUR' : null;
  const price = value => typeof value === 'number'
    ? new Intl.NumberFormat(language, currency ? { style: 'currency', currency, maximumFractionDigits: value % 1 === 0 ? 0 : 2, minimumFractionDigits: 0 } : {}).format(value)
    : value;
  const paragraphs = story.trim().split(/\r?\n\s*\r?\n/).filter(Boolean).map(item => `<p>${esc(item)}</p>`).join('');
  const about = paragraphs ? `<section class="wrap story" aria-labelledby="about"><h2 id="about">${c.about}</h2><div>${paragraphs}</div></section>` : '';
  const card = culinary ? `<section class="menu-section" aria-labelledby="menu"><div class="wrap menu-layout">
    <div><h2 id="menu">${c.menu}</h2>${menuImage ? picture(menuImage) : ''}</div>
    <ul class="menu">${menu.map(item => `<li><div><h3>${esc(item.name)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}</div>${item.price !== null && item.price !== undefined && item.price !== '' ? `<strong>${esc(price(item.price))}</strong>` : ''}</li>`).join('')}</ul>
  </div></section>` : '';
  const gallerySection = gallery.length ? `<section class="wrap gallery-section" aria-labelledby="galerie"><h2 id="galerie">${c.gallery}</h2><div class="gallery">${gallery.map(item => picture(item)).join('')}</div></section>` : '';
  const action = contactAction(contact, c);
  const directions = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}`)}` : null;
  const hasDetails = Boolean(address || contact || hours.length);
  const details = hasDetails ? `<section class="wrap details" aria-labelledby="contact">
    <div><h2 id="contact">${c.contact}</h2>${address ? `<address>${esc(address)}</address>` : ''}${contact ? `<p>${esc(contact)}</p>` : ''}<div class="links">
      ${action ? `<a href="${esc(action.href)}">${action.label}</a>` : ''}${directions ? `<a href="${esc(directions)}">${c.directions}</a>` : ''}</div></div>
    ${hours.length ? `<div><h3>${c.hours}</h3><dl class="hours">${weekdays.flatMap((day, index) => hours.filter(item => item.day === day).map(item => `<div><dt>${c.days[index]}</dt><dd>${esc(item.opens)}–${esc(item.closes)}</dd></div>`)).join('')}</dl></div>` : ''}
  </section>` : '';
  const navigation = [...(culinary ? [[card, 'menu'], [about, 'about'], [gallerySection, 'gallery']] : [[gallerySection, 'gallery'], [about, 'about']]), [hasDetails, 'contact']]
    .filter(([visible]) => visible).map(([, key]) => `<a href="#${key === 'gallery' ? 'galerie' : key}">${c[key]}</a>`).join('');
  const content = `<div class="${variant}"><header class="wrap bar"><p>${synthetic ? c.synthetic : c.demo}</p>${navigation ? `<nav>${navigation}</nav>` : ''}</header>
    <main><section class="wrap hero${heroImage ? '' : ' no-image'}" aria-labelledby="title">
      <div class="hero-copy"><h1 id="title">${esc(name)}</h1><p>${esc(city)}</p>
        ${culinary ? `<a class="hero-link" href="#menu">${c.menu}</a>` : action ? `<a class="hero-link" href="${esc(action.href)}">${action.label}</a>` : ''}</div>
      ${heroImage ? `<figure class="hero-image">${picture(heroImage, true)}</figure>` : ''}
    </section>${culinary ? card + about + gallerySection : gallerySection + about}${details}</main></div>`;
  return { language, style, content, title: esc(`${name} · ${city}`) };
}

export function sitePreviewHtml({ language, style, content, title }) {
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>${style}</style></head><body>${content}</body></html>`;
}
