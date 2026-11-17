import { coverageLabel } from './report-sections.mjs';

export const escapeReportHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const esc = escapeReportHtml;

export function auditReportStyles() {
  return `
    :root{color-scheme:light;--ink:#18251e;--muted:#4e5c52;--paper:#f3f4ee;--surface:#fff;--line:#d4dcd2;--accent:#36563c}
    *{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,sans-serif}
    main{max-width:1060px;margin:36px auto;padding:clamp(24px,6vw,64px);background:var(--surface)}
    .report-header{padding-bottom:24px;border-bottom:1px solid var(--ink)}
    .report-brand,.report-footer{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;color:var(--muted);font-size:.875rem}
    .report-brand{margin-bottom:28px}.report-brand strong{letter-spacing:.08em;color:var(--accent)}
    .report-header h1{font:400 clamp(2.125rem,5vw,3.25rem)/1.12 Georgia,serif;letter-spacing:-.025em;margin:0 0 10px;text-wrap:balance}
    .report-header p{margin:0;color:var(--muted)}
    .report-kind{font-weight:650;color:var(--ink);margin-top:8px!important}
    .report-nav{display:flex;flex-wrap:wrap;column-gap:24px;padding:5px 0;border-bottom:1px solid var(--line)}
    .report-nav a,.source-row a{display:flex;align-items:center;min-height:44px}
    section{padding:clamp(24px,4vw,38px) 0;border-bottom:1px solid var(--line)}
    section:last-of-type{border-bottom:0}
    h2,h3,[id]{scroll-margin:16px}
    h2{font-size:1.375rem;line-height:1.25;letter-spacing:-.02em;margin:0 0 20px}
    h3{font-size:1.125rem;line-height:1.35;margin:0 0 10px}
    p{max-width:72ch;margin:0 0 12px}p:last-child{margin-bottom:0}
    a{color:var(--accent);text-underline-offset:3px;overflow-wrap:anywhere}
    a:hover{color:var(--ink)}:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
    :target{background:#eaf1e6}::selection{background:#dce8d7;color:var(--ink)}
    .audit-action{padding:20px clamp(14px,3vw,26px);margin:0 0 12px;border:1px solid var(--line);background:#f8faf6}
    .audit-action:last-child{margin-bottom:0}.action-line strong{font-weight:650}
    .facts{padding-left:22px;margin:0 0 12px;max-width:72ch}
    .facts li{padding-left:3px;margin:6px 0}
    .fact-label,.action-limit,.report-scope{color:var(--muted);font-size:.875rem}
    .source-ref{font-size:.875rem;display:inline-block;padding:3px 5px;white-space:nowrap}
    .source-row{display:flex;gap:10px;align-items:center;font-size:.9375rem;margin:0}
    .source-row span{color:var(--muted);min-width:24px}
    table{width:100%;border-collapse:collapse;margin:14px 0 24px;font-size:.9375rem;font-variant-numeric:tabular-nums}
    caption{text-align:left;font-weight:650;font-size:1rem;margin-bottom:8px}
    th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
    th{color:var(--muted);font-size:.875rem;font-weight:650;background:#f3f5f0}
    .comparison{margin:22px 0}
    .report-footer{border-top:1px solid var(--line);padding-top:14px}
    h1,h2,h3,p,li{overflow-wrap:anywhere}
    .coverage{margin:0 0 24px;padding:16px;background:var(--paper)}
    .coverage figcaption{font-weight:650;margin-bottom:12px}
    .coverage ol{display:flex;flex-wrap:wrap;gap:12px 22px;list-style:none;margin:0;padding:0}
    .coverage li{flex:1 1 140px;display:grid;grid-template-columns:24px 1fr;gap:0 8px}
    .coverage svg{width:22px;height:22px;color:var(--accent);grid-row:span 2}
    .coverage strong{font-size:.9375rem}.coverage span{font-size:.875rem;color:var(--muted)}
    @media screen and (max-width:680px){
      main{margin:0;padding:24px clamp(16px,5vw,30px)}
      .report-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}
      .report-nav a{font-size:.875rem}
      table.stacked,table.stacked tbody,table.stacked tr,table.stacked td{display:block;width:100%}
      .stacked thead{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}
      .stacked tr{padding:9px 0;border-bottom:1px solid var(--line)}
      .stacked td{border:0;padding:4px 0}
      .stacked td::before{content:attr(data-label);display:block;font-size:.8125rem;color:var(--muted)}
    }
    @page{size:A4;margin:18mm}
    @media print{
      body{background:#fff;font-size:10pt}main{margin:0;padding:0;max-width:none}
      .report-nav{display:none}.report-header h1{font-size:28pt}
      section{padding:16px 0}h2{break-after:avoid}
      .audit-action,.comparison,tr{break-inside:avoid}.audit-action{background:none}
      .source-row a{display:inline;min-height:0}.source-row a::after{content:" — " attr(href);font-size:8pt}
      thead{display:table-header-group}
    }
  `;
}

function reference(number) { return number ? ` <a class="source-ref" href="#source-${number}" aria-label="Source ${number}">[${number}]</a>` : ''; }
function renderBlock(block, scope = false) {
  if (block.type === 'coverage') return `<figure class="coverage"><figcaption>${esc(block.title)}</figcaption><ol>${block.items.map(item => `<li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>${item.status === 'SUCCEEDED' ? '<path d="m7 12 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.5"/>' : '<path d="M8 12h8" stroke="currentColor" stroke-width="1.5"/>'}</svg><strong>${esc(item.label)}</strong><span>${coverageLabel(item.status)}</span></li>`).join('')}</ol></figure>`;
  if (block.type === 'paragraph') return `<p${scope ? ' class="report-scope"' : ''}>${esc(block.text)}</p>`;
  if (block.type === 'facts') return `<ul class="facts">${block.items.map(item => `<li>${item.label ? `<strong class="fact-label">${esc(item.label)} · </strong>` : ''}${esc(item.text)}${(item.sources ?? [item.source]).map(reference).join('')}</li>`).join('')}</ul>`;
  if (block.type === 'action') return `<article class="audit-action"><h3>${esc(block.title)}${!block.facts?.length ? (block.sources ?? []).map(reference).join('') : ''}</h3>${block.facts?.length ? renderBlock({ type: 'facts', items: block.facts }) : ''}<p class="action-line"><strong>Pour vos clients :</strong> ${esc(block.impact)}</p><p class="action-line"><strong>À faire :</strong> ${esc(block.action)}</p>${block.limitation ? `<p class="action-limit"><strong>Limite :</strong> ${esc(block.limitation)}</p>` : ''}</article>`;
  if (block.type === 'comparison') return `<article class="comparison"><h3>${esc(block.title)}</h3><p>${esc(block.text)}${reference(block.source)}</p></article>`;
  if (block.type === 'source') return `<p class="source-row" id="${esc(block.id)}"><span>[${block.number}]</span><a href="${esc(block.url)}">${esc(block.label)}</a></p>`;
  if (block.type === 'table') return `<table role="table"${block.columns.length > 1 ? ' class="stacked"' : ''}><caption>${esc(block.title)}</caption><thead role="rowgroup"><tr role="row">${block.columns.map(label => `<th role="columnheader" scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody role="rowgroup">${block.rows.map(row => `<tr role="row">${row.map((value, index) => `<td role="cell" data-label="${esc(block.columns[index])}">${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return '';
}

export function renderAuditDocumentContent(document) {
  const nav = `<nav class="report-nav" aria-label="Dans ce rapport">${document.sections.map((section, index) => `<a href="#report-section-${index}">${esc(section.title)}</a>`).join('')}</nav>`;
  return nav + document.sections.map((section, index) => `<section aria-labelledby="report-section-${index}"><h2 id="report-section-${index}">${esc(section.title)}</h2>${section.blocks.map(block => renderBlock(block, index === 3)).join('')}</section>`).join('');
}

export function renderAuditDocumentHtml(document) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(document.title)} · ${esc(document.name)}</title><style>${auditReportStyles()}</style></head><body><main data-report-format="${esc(document.format)}"><header class="report-header"><div class="report-brand"><strong>ANCRAGE</strong><span>${esc(document.date)}</span></div><h1>${esc(document.name)}</h1>${document.city ? `<p>${esc(document.city)}</p>` : ''}<p class="report-kind">${esc(document.title)}</p></header>${renderAuditDocumentContent(document)}<footer class="report-footer"><span>Ancrage</span><span>${esc(document.date)}</span></footer></main></body></html>`;
}
