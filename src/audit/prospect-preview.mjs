import { buildPublicAuditDocument } from './report-document.mjs';
import { domainOf } from './seo-qualification.mjs';

export function buildProspectPreview(run, packet) {
  const domain = domainOf(packet.values.website.value);
  if (!domain || run.status === 'BLOCKED') return null;

  const document = buildPublicAuditDocument(run, 'final', packet);
  const actions = document.sections[1].blocks;
  const supported = actions.filter(action => action.confidence === 'Constat étayé' && action.effort !== 'Diagnostic');
  const candidates = [
    ...supported.filter(action => action.basis === 'Ergonomie'),
    ...supported.filter(action => action.basis !== 'Ergonomie'),
    ...actions.filter(action => action.code === 'BROKEN_CONTACT_LINK'),
  ];

  for (const action of candidates) {
    const fact = action.facts?.find(item => document.sections.at(-1).blocks.some(source =>
      source.type === 'source' && domainOf(source.url) === domain
      && (item.source === source.number || item.sources?.includes(source.number))));
    if (!fact?.text || !action.action || !action.impact) continue;
    const visual = action.visuals?.find(item => item.jpeg?.length <= 180_000);
    return {
      finding: fact.text,
      improvement: action.action,
      benefit: action.impact,
      ...(visual && { image: { jpeg: visual.jpeg, caption: visual.caption } }),
    };
  }
  return null;
}
