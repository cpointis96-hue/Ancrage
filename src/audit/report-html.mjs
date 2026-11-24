import { coverageLabel } from './report-sections.mjs';

export const escapeReportHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const esc = escapeReportHtml;

export function auditReportStyles() {
  return `
    :root{color-scheme:light;--ink:#18251e;--muted:#4e5c52;--paper:#eeefe8;--surface:#fff;--line:#d4dcd2;--accent:#36563c;--masthead:#173728;--masthead-text:#edf4e9}
    *{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,sans-serif}
    main{--gutter:clamp(24px,6vw,68px);max-width:1020px;margin:32px auto;padding:0 var(--gutter) 26px;background:var(--surface)}
    .report-header{margin-inline:calc(-1 * var(--gutter));padding:24px var(--gutter) 36px;background:var(--masthead);color:var(--masthead-text)}
    .report-brand{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 12px;margin-bottom:32px;font-size:.875rem}
    .report-brand strong{letter-spacing:.12em}
    .report-header h1{font:400 clamp(2.3rem,6vw,4.25rem)/1.06 Georgia,serif;letter-spacing:-.032em;margin:0 0 12px;text-wrap:balance}
    .report-header p{margin:0;color:inherit}
    .report-kind{font-size:.9375rem;font-weight:550}
    .report-nav{display:flex;flex-wrap:wrap;gap:0 24px;border-bottom:1px solid var(--line)}
    .report-nav a{display:inline-flex;align-items:center;min-height:44px;font-size:.875rem;font-weight:650}
    .report-nav a[href="#seo"]{color:var(--masthead);text-decoration-thickness:2px}
    .source-row a{display:flex;align-items:center;min-height:44px}
    section{padding:clamp(24px,4vw,38px) 0;border-bottom:1px solid var(--line)}
    section:last-of-type{border-bottom:0}
    h2,h3,[id]{scroll-margin:16px}
    h2{font:400 clamp(1.65rem,3vw,2.1rem)/1.15 Georgia,serif;letter-spacing:-.02em;margin:0 0 20px}
    h3{font-size:1.125rem;line-height:1.35;margin:0 0 10px}
    p{max-width:72ch;margin:0 0 12px}p:last-child{margin-bottom:0}
    a{color:var(--accent);text-underline-offset:3px;overflow-wrap:anywhere}
    a:hover{color:var(--ink)}:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
    :target{background:#eaf1e6}::selection{background:#dce8d7;color:var(--ink)}
    .report-decision p{font-size:clamp(1.15rem,2.4vw,1.47rem);line-height:1.45;max-width:54ch;text-wrap:pretty}
    .audit-action{padding:18px 0;margin:0;border-bottom:1px solid var(--line)}
    .audit-action:first-of-type{padding:24px clamp(16px,3.5vw,32px);background:#f0f4ec;border-top:2px solid var(--accent)}
    .audit-action:first-of-type + .audit-action{margin-top:8px}
    .audit-action:last-child{border-bottom:0}
    .audit-action:last-child{margin-bottom:0}.action-line strong{font-weight:650}
    .facts{padding-left:22px;margin:0 0 12px;max-width:72ch}
    .facts li{padding-left:3px;margin:6px 0}
    .audit-action .facts,.action-sources{margin:10px 0 0;color:var(--muted);font-size:.875rem}
    .fact-label,.action-limit,.report-scope{color:var(--muted);font-size:.875rem}
    .action-meta{margin:0 0 10px;color:var(--accent);font-size:.875rem;font-weight:650}
    .action-proof{padding-top:12px;margin-top:12px;border-top:1px solid var(--line)}
    .action-target{font-size:.875rem}
    .source-ref{font-size:.875rem;display:inline-block;padding:3px 5px;white-space:nowrap}
    .source-row{display:flex;gap:10px;align-items:center;font-size:.9375rem;margin:0}
    .source-row span{color:var(--muted);min-width:24px}
    table{width:100%;border-collapse:collapse;margin:14px 0 24px;font-size:.9375rem;font-variant-numeric:tabular-nums}
    caption{text-align:left;font-weight:650;font-size:1rem;margin-bottom:8px}
    th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
    th{color:var(--muted);font-size:.875rem;font-weight:650;background:#f3f5f0}
    .comparison{margin:0;padding:17px 0;border-top:1px solid var(--line)}
    .comparison-subject{color:var(--muted);font-weight:650;font-size:.9375rem}
    .visual-proofs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:16px;margin-block:16px}
    .visual-proofs figure{margin:0;min-width:0;max-width:420px}
    .visual-proofs img{display:block;max-width:100%;height:auto;border:1px solid var(--line)}
    .visual-proofs figcaption,.capture-missing{margin-top:5px;color:var(--muted);font-size:.875rem}
    .report-seo{margin-inline:calc(-1 * var(--gutter));padding-inline:var(--gutter);background:#f1f4ee}
    .report-seo h2{color:var(--masthead)}
    .report-seo h2:target{background:none}
    .seo-page{padding:20px 0;border-top:1px solid #bbcaba}
    .seo-page:first-of-type{border-top:2px solid var(--accent)}
    .seo-page:last-child{padding-bottom:0}
    .seo-page h3{font:400 1.4rem/1.25 Georgia,serif;margin-bottom:12px}
    .seo-page h3 a{color:var(--masthead)}
    .seo-assessment{font-weight:550}
    .seo-edits{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}
    .seo-edit{background:var(--surface);border-left:3px solid #bac8b8;padding:12px 14px;max-width:74ch}
    .seo-edit h4{font-size:.9375rem;margin:0 0 4px}
    .seo-edit p{margin:0}
    .seo-edit .seo-current{color:var(--muted);font-size:.875rem;margin-bottom:6px}
    .seo-edit .seo-reason{color:var(--muted);font-size:.875rem;margin-top:5px}
    .seo-page dl{display:grid;grid-template-columns:minmax(124px,1fr) minmax(0,3fr);margin:14px 0;font-size:.9375rem}
    .seo-page dt,.seo-page dd{margin:0;padding:7px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
    .seo-page dt{font-weight:650;padding-right:14px}
    h1,h2,h3,p,li{overflow-wrap:anywhere}
    .coverage{margin:0 0 24px;padding:16px;background:var(--paper)}
    .coverage figcaption{font-weight:650;margin-bottom:12px}
    .coverage ol{display:flex;flex-wrap:wrap;gap:12px 22px;list-style:none;margin:0;padding:0}
    .coverage li{flex:1 1 140px;display:grid;grid-template-columns:24px 1fr;gap:0 8px}
    .coverage svg{width:22px;height:22px;color:var(--accent);grid-row:span 2}
    .coverage strong{font-size:.9375rem}.coverage span{font-size:.875rem;color:var(--muted)}
    @media screen and (max-width:680px){
      main{--gutter:clamp(16px,5vw,30px);margin:0}
      .report-header{padding-bottom:27px}
      .report-nav{gap:0 18px}
      .seo-page dl{display:block}
      .seo-page dt{padding:10px 0 0;border-bottom:0}
      .seo-page dd{padding-top:2px}
      table.stacked,table.stacked tbody,table.stacked tr,table.stacked td{display:block;width:100%}
      .stacked thead{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}
      .stacked tr{padding:9px 0;border-bottom:1px solid var(--line)}
      .stacked td{border:0;padding:4px 0}
      .stacked td::before{content:attr(data-label);display:block;font-size:.8125rem;color:var(--muted)}
    }
    @page{size:A4;margin:18mm}
    @media print{
      body{background:#fff;font-size:10pt}main{--gutter:0px;margin:0;padding:0;max-width:none}
      .report-header{padding:0 0 18px;background:none;color:var(--ink);border-bottom:1px solid var(--ink)}
      .report-nav{display:none}
      .report-header h1{font-size:28pt}
      section{padding:16px 0}h2{break-after:avoid}
      .seo-edit{break-inside:avoid}
      .audit-action,.comparison,tr{break-inside:avoid}.audit-action{background:none}
      .source-row a{display:inline;min-height:0}.source-row a::after{content:" — " attr(href);font-size:8pt}
      thead{display:table-header-group}
    }
  `;
}

function reference(number) { return number ? ` <a class="source-ref" href="#source-${number}" aria-label="Source ${number}">[${number}]</a>` : ''; }
const factReferences = fact => (fact.sources ?? [fact.source]).filter(Boolean);
function renderVisuals(visuals = []) {
  if (!visuals.length) return '';
  return `<div class="visual-proofs">${visuals.map(visual => visual.missing
    ? `<p class="capture-missing">Capture à réaliser · ${esc(visual.missing)}${reference(visual.source)}</p>`
    : `<figure><a href="${esc(visual.url)}" aria-label="${esc(visual.caption)}"><img src="data:image/jpeg;base64,${esc(visual.jpeg)}" width="${visual.width}" height="${visual.height}" alt="${esc(visual.caption)}" loading="lazy"></a><figcaption>${esc(visual.caption)} · ${esc(visual.date)}${visual.viewportWidth ? ` · ${esc(visual.viewportWidth)} px` : ''}${reference(visual.source)}</figcaption></figure>`).join('')}</div>`;
}

function renderBlock(block, scope = false) {
  if (block.type === 'coverage') return `<figure class="coverage"><figcaption>${esc(block.title)}</figcaption><ol>${block.items.map(item => `<li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>${item.status === 'SUCCEEDED' ? '<path d="m7 12 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.5"/>' : '<path d="M8 12h8" stroke="currentColor" stroke-width="1.5"/>'}</svg><strong>${esc(item.label)}</strong><span>${coverageLabel(item.status)}</span></li>`).join('')}</ol></figure>`;
  if (block.type === 'paragraph') return `<p${scope ? ' class="report-scope"' : ''}>${esc(block.text)}${(block.sources ?? []).map(reference).join('')}</p>`;
  if (block.type === 'facts') return `<ul class="facts">${block.items.map(item => `<li>${item.label ? `<strong class="fact-label">${esc(item.label)} · </strong>` : ''}${esc(item.text)}${(item.sources ?? [item.source]).map(reference).join('')}</li>`).join('')}</ul>`;
  if (block.type === 'action') {
    const otherSources = (block.sources ?? []).filter(number => !block.facts?.some(fact => factReferences(fact).includes(number)));
    const meta = [block.basis, block.confidence, block.owner, block.effort].filter(Boolean).join(' · ');
    const proof = block.facts?.length || otherSources.length;
    return `<article class="audit-action"><h3>${esc(block.title)}</h3>${meta ? `<p class="action-meta">${esc(meta)}</p>` : ''}${block.targetUrl ? `<p class="action-target"><a href="${esc(block.targetUrl)}">Ouvrir la page concernée</a></p>` : ''}<p>${esc(block.impact)}</p><p class="action-line"><strong>À faire</strong> · ${esc(block.action)}</p>${block.example ? `<p class="action-line"><strong>Texte proposé</strong> · ${esc(block.example)}</p>` : ''}${block.callToAction ? `<p class="action-line"><strong>Bouton proposé</strong> · ${esc(block.callToAction)}</p>` : ''}${block.verification ? `<p class="action-line"><strong>Pour vérifier</strong> · ${esc(block.verification)}</p>` : ''}${block.limitation ? `<p class="action-limit">${esc(block.limitation)}</p>` : ''}${proof ? `<div class="action-proof">${block.facts?.length ? renderBlock({ type: 'facts', items: block.facts }) : ''}${otherSources.length ? `<p class="action-sources">Sources${otherSources.map(reference).join('')}</p>` : ''}</div>` : ''}${renderVisuals(block.visuals)}</article>`;
  }
  if (block.type === 'comparison') return `<article class="comparison"><h3>${esc(block.title)}</h3>${block.subject ? `<p class="comparison-subject">${esc(block.subject)}</p>` : ''}<p>${esc(block.text)}${(block.sources ?? [block.source]).map(reference).join('')}</p>${renderVisuals(block.visuals)}${block.next ? `<p><strong>${esc(block.nextLabel)}</strong> · ${esc(block.next)}</p>` : ''}${block.reason ? `<p><strong>${esc(block.reasonLabel || 'Pourquoi')}</strong> · ${esc(block.reason)}</p>` : ''}</article>`;
  if (block.type === 'seo-page') {
    const values = block.values.length ? `<dl>${block.values.map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>` : '';
    const edits = block.edits.length ? `<ul class="seo-edits" role="list">${block.edits.map(item => `<li class="seo-edit"><h4>${esc(item.label)}</h4>${item.current?.[1] ? `<p class="seo-current"><strong>${esc(item.current[0])}</strong> · ${esc(item.current[1])}</p>` : ''}<p>${esc(item.text)}</p>${item.reason ? `<p class="seo-reason">${esc(item.reason)}</p>` : ''}</li>`).join('')}</ul>` : '';
    return `<article class="seo-page"><h3><a href="${esc(block.url)}">${esc(block.title)}</a></h3>${block.intent ? `<p><strong>Intention</strong> · ${esc(block.intent)}</p>` : ''}${block.assessment ? `<p class="seo-assessment">${esc(block.assessment)}</p>` : ''}${block.checks.length ? renderBlock({ type: 'facts', items: block.checks.map(text => ({ text })) }) : ''}${values}${edits}</article>`;
  }
  if (block.type === 'source') return `<p class="source-row" id="${esc(block.id)}"><span>[${block.number}]</span><a href="${esc(block.url)}">${esc(block.label)}</a></p>`;
  if (block.type === 'table') return `<table role="table"${block.columns.length > 1 ? ' class="stacked"' : ''}><caption>${esc(block.title)}</caption><thead role="rowgroup"><tr role="row">${block.columns.map(label => `<th role="columnheader" scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody role="rowgroup">${block.rows.map(row => `<tr role="row">${row.map((value, index) => `<td role="cell" data-label="${esc(block.columns[index])}">${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return '';
}

export function renderAuditDocumentContent(document) {
  return document.sections.map((section, index) => {
    if (!section.blocks.length) return '';
    const id = esc(section.id ?? `report-section-${index}`);
    const className = section.id === 'seo' ? ' class="report-seo"' : index === 0 ? ' class="report-decision"' : '';
    return `<section${className} aria-labelledby="${id}"><h2 id="${id}">${esc(section.title)}</h2>${section.blocks.map(block => renderBlock(block, index === document.sections.length - 1)).join('')}</section>`;
  }).join('');
}

export function renderAuditDocumentHtml(document) {
  const navigation = document.sections.map((section, index) => section.blocks.length ? `<a href="#${esc(section.id ?? `report-section-${index}`)}">${esc(section.title)}</a>` : '').join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(document.title)} · ${esc(document.name)}</title><style>${auditReportStyles()}</style></head><body><main data-report-format="${esc(document.format)}"><header class="report-header"><div class="report-brand"><strong>ANCRAGE</strong><span>${esc(document.date)}</span></div><h1>${esc(document.name)}</h1><p class="report-kind">${[document.title, document.city].filter(Boolean).map(esc).join(' · ')}</p></header><nav class="report-nav" aria-label="Sommaire">${navigation}</nav>${renderAuditDocumentContent(document)}</main></body></html>`;
}
