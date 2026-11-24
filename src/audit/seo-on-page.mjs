import { parse } from 'parse5';

const omitText = new Set(['script', 'style', 'template', 'noscript']);
const landmarks = new Set(['header', 'nav', 'footer', 'aside']);
const normalized = value => value.replace(/\s+/gu, ' ').trim();
const attribute = (node, name) => node.attrs?.find(item => item.name === name)?.value;

function* elements(node, { main = false } = {}) {
  if (node.tagName) {
    if (attribute(node, 'hidden') !== undefined || (main && landmarks.has(node.tagName))) return;
    yield node;
  }
  if (!omitText.has(node.tagName)) {
    for (const child of node.childNodes ?? []) yield* elements(child, { main });
  }
}

function visibleText(node, { main = false } = {}) {
  if (node.nodeName === '#text') return node.value;
  if (omitText.has(node.tagName) || (main && landmarks.has(node.tagName)) || attribute(node, 'hidden') !== undefined) return '';
  return (node.childNodes ?? []).map(child => visibleText(child, { main })).join(' ');
}

function webUrl(value, base) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function structuredData(nodes) {
  const types = new Set();
  let invalid = 0;
  const collect = value => {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    [value['@type']].flat().filter(type => typeof type === 'string' && type.length <= 100).forEach(type => types.add(type));
    if (value['@graph']) collect(value['@graph']);
  };
  for (const node of nodes) {
    try { collect(JSON.parse(node.childNodes?.map(child => child.value).join('') ?? '')); }
    catch { invalid += 1; }
  }
  return { blocks: nodes.length, invalid, types: [...types].slice(0, 12) };
}

export function readOnPage(html, url) {
  const root = parse(html).childNodes.find(node => node.tagName === 'html');
  const head = root.childNodes.find(node => node.tagName === 'head');
  const body = root.childNodes.find(node => node.tagName === 'body');
  const metadata = [...elements(head)];
  const fromBody = [...elements(body)];
  const main = fromBody.find(node => node.tagName === 'main' || attribute(node, 'role') === 'main') ?? body;
  const content = [...elements(main, { main: true })];
  const base = webUrl(attribute(metadata.find(node => node.tagName === 'base') ?? {}, 'href'), url) ?? url;
  const titles = metadata.filter(node => node.tagName === 'title').map(node => normalized(visibleText(node)));
  const meta = metadata.filter(node => node.tagName === 'meta');
  const descriptions = meta.filter(node => attribute(node, 'name')?.trim().toLowerCase() === 'description')
    .map(node => normalized(attribute(node, 'content') ?? ''));
  const robots = meta.filter(node => ['robots', 'googlebot'].includes(attribute(node, 'name')?.trim().toLowerCase()))
    .map(node => attribute(node, 'content') ?? '').join(',');
  const canonicals = metadata.filter(node => node.tagName === 'link' && attribute(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'))
    .map(node => webUrl(attribute(node, 'href'), base));
  const headings = content.filter(node => /^h[1-6]$/.test(node.tagName))
    .map(node => ({ level: Number(node.tagName[1]), text: normalized(visibleText(node)).slice(0, 180) }));
  const headingCounts = Array.from({ length: 6 }, (_, index) => headings.filter(item => item.level === index + 1).length);
  const links = new Map();
  const fromContent = new Set(content);
  for (const node of fromBody) {
    if (node.tagName !== 'a') continue;
    const target = webUrl(attribute(node, 'href'), base);
    if (!target || new URL(target).origin !== new URL(url).origin) continue;
    const label = normalized(visibleText(node)).slice(0, 140);
    if (!links.has(target) || fromContent.has(node)) links.set(target, { url: target, label, inContent: fromContent.has(node) });
  }
  const ld = [...metadata, ...fromBody].filter(node => node.tagName === 'script' && attribute(node, 'type')?.toLowerCase().trim() === 'application/ld+json');
  const mainText = normalized(visibleText(main, { main: true }));
  return {
    title: titles[0]?.slice(0, 400) ?? '', titleCount: titles.length,
    description: descriptions[0]?.slice(0, 600) ?? '', descriptionCount: descriptions.length,
    headings: headings.slice(0, 120), headingCounts, emptyHeadings: headings.filter(item => !item.text).length,
    headingJumps: headings.flatMap((item, index) => index && item.level > headings[index - 1].level + 1
      ? [{ from: headings[index - 1].level, to: item.level, text: item.text }] : []).slice(0, 5),
    canonicals: canonicals.slice(0, 5), canonicalCount: canonicals.length, robots,
    jsonLd: structuredData(ld), lang: attribute(root, 'lang') ?? '',
    viewport: meta.some(node => attribute(node, 'name')?.toLowerCase() === 'viewport'),
    missingImageAlt: fromBody.filter(node => node.tagName === 'img' && attribute(node, 'alt') === undefined).length,
    internalLinks: [...links.values()].slice(0, 250), mainText,
  };
}
