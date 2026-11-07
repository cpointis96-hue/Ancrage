import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.mjs';
import { createDefaultProviderAdapters } from '../src/providers/http-adapters.mjs';

// Provider status is copied; credentials stay in Keychain, and source data stays unchanged.
const [statusPath, requestPath, outputPath, remainingBudget = '0.18'] = process.argv.slice(2);
if (!statusPath || !requestPath || !outputPath) throw new Error('Usage: node scripts/verify-audit-live.mjs provider-status.json request.json output-directory');
const dataDir = await mkdtemp(path.join(tmpdir(), 'ancrage-audit-quality-live-'));
await mkdir(path.join(dataDir, 'state'), { recursive: true });
const status = JSON.parse(await readFile(statusPath, 'utf8'));
await writeFile(path.join(dataDir, 'state/provider-status.json'), JSON.stringify({ openai: status.openai }));
const request = JSON.parse(await readFile(requestPath, 'utf8'));
const input = structuredClone(request.input ?? request);
input.city.country = input.city.country ?? input.city.countryCode;
if (!input.domain) delete input.domain;
delete input.idempotencyKey;
const hardLimit = Number(remainingBudget);
if (!Number.isFinite(hardLimit) || hardLimit <= 0 || hardLimit > 0.18) throw new Error('Budget de recette invalide.');
input.budget = { hardLimit, currency: 'USD' };
const adapters = createDefaultProviderAdapters();
let calls = 0;
const research = adapters.openai.research;
adapters.openai.research = async args => {
  if (calls++) throw new Error('Un seul appel OpenAI autorisé pour cette recette.');
  return research(args);
};
const app = createApp({ dataDir, adapters });
await app.ready;
if (hardLimit < 0.18) {
  const workflow = await app.workflows.get('public-observation-audit');
  const { hash, activeVersionId, versions, ...definition } = workflow;
  definition.steps[0].budget = hardLimit;
  const saved = await app.workflows.save(workflow.id, definition, { expectedHash: hash });
  const version = await app.workflows.createVersion(workflow.id, { expectedDraftHash: saved.hash });
  await app.workflows.activate(workflow.id, version.id);
}
const provider = (await app.providers.list()).find(item => item.id === 'openai');
if (!provider.configured || !provider.enabled || provider.health !== 'healthy') throw new Error('OPENAI_NOT_READY: aucun audit réel exécuté.');
const result = await app.publicAudits.create(input);
await mkdir(outputPath, { recursive: true });
await writeFile(path.join(outputPath, 'audit-run.json'), JSON.stringify(result, null, 2));
for (const kind of ['gmb', 'final']) await writeFile(path.join(outputPath, `${kind}.html`), (await app.publicAudits.readReport(result.id, kind)).value);
await writeFile(path.join(outputPath, 'final.pdf'), (await app.publicAudits.readReport(result.id, 'final', 'pdf')).value);
console.log(JSON.stringify({ status: result.status, analysisStatus: result.modules.observation.status, cause: result.modules.observation.cause, calls, spent: result.budget.spent, reserved: result.budget.reserved, priorities: result.modules.observation.priorities.length, outputPath, dataDir }));
