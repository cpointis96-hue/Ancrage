import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('.');
test('cockpit utilise l’API et une iconographie SVG cohérente', async () => {
  const [html, app, api, icons] = await Promise.all([readFile(path.join(root, 'app/index.html'), 'utf8'), readFile(path.join(root, 'app/app.mjs'), 'utf8'), readFile(path.join(root, 'app/api.mjs'), 'utf8'), readFile(path.join(root, 'app/icons.mjs'), 'utf8')]);
  assert.match(html, /id="app"/); assert.equal(api.includes('fetch(`/api'), true); assert.doesNotMatch(app, /onclick=/); assert.doesNotMatch(`${html}${app}${api}${icons}`, /Mistral/); assert.match(icons, /viewBox="0 0 20 20"/);
});
