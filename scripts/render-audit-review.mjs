import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildPublicAuditDocument } from '../src/audit/report-document.mjs';
import { renderAuditDocumentHtml } from '../src/audit/report-html.mjs';
import { renderAuditDocumentPdf } from '../src/audit/report-pdf.mjs';
import { jpegSize } from '../src/audit/report-visuals.mjs';

const [runPath, manifestPath, output] = process.argv.slice(2);
if (!runPath || !manifestPath || !output) {
  throw new Error('Usage : node scripts/render-audit-review.mjs run.json captures.json outputs/rapport');
}
const run = JSON.parse(await readFile(runPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!run.modules?.observation || !Array.isArray(manifest) || manifest.length > 12) {
  throw new Error('Un run par observations et un manifeste de 12 captures maximum sont requis.');
}
const visualEvidence = await Promise.all(manifest.map(async ({ file, url, element, state, caption, observedAt, viewport }) => {
  const jpeg = (await readFile(resolve(dirname(manifestPath), file))).toString('base64');
  if (!jpegSize(jpeg)) throw new Error(`Capture JPEG non prise en charge : ${file}`);
  return { url, element, ...(state && { state }), caption, observedAt, viewport, jpeg };
}));
const allCaptures = [...(run.modules.observation.visualEvidence ?? []), ...visualEvidence];
run.modules.observation.visualEvidence = [...new Map(allCaptures.map(item =>
  [JSON.stringify([item.url, item.element, item.state ?? '']), item])).values()];
const document = buildPublicAuditDocument(run);
const missing = document.sections.flatMap(section => section.blocks.flatMap(block =>
  (block.visuals ?? []).flatMap(item => item.missing ? [item.missing] : [])));
if (missing.length) process.stderr.write(`Captures à compléter : ${[...new Set(missing)].join(', ')}\n`);
await mkdir(dirname(output), { recursive: true });
await Promise.all([
  writeFile(`${output}.html`, renderAuditDocumentHtml(document)),
  writeFile(`${output}.pdf`, renderAuditDocumentPdf(document), 'ascii'),
]);
