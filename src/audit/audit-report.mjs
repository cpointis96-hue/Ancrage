import { buildSeoAuditDocument } from './report-document.mjs';
import { renderAuditDocumentHtml } from './report-html.mjs';

export function renderSeoAuditReport(audit) {
  if (!audit || typeof audit !== 'object' || !audit.summary || !Array.isArray(audit.findings)) throw new TypeError('Audit invalide.');
  return renderAuditDocumentHtml(buildSeoAuditDocument(audit));
}
