import { buildPublicAuditDocument } from './report-document.mjs';
import { renderAuditDocumentHtml } from './report-html.mjs';

export function renderPublicAuditReport(result, kind, auditPacket = null) {
  return renderAuditDocumentHtml(buildPublicAuditDocument(result, kind, auditPacket));
}
