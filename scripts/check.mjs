import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['.git', '.ancrage', 'outputs', 'node_modules', 'coverage', 'dist', 'build', '.playwright-cli', 'playwright-report', 'test-results']);

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

const files = await filesIn(root);
let scripts = 0;
let json = 0;
let links = 0;
for (const file of files) {
  if (/\.(?:mjs|js)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
    scripts++;
  } else if (file.endsWith('.json')) {
    JSON.parse(await readFile(file, 'utf8'));
    json++;
  } else if (file.endsWith('.md') && !file.includes(`${path.sep}.agents${path.sep}`)) {
    const markdown = (await readFile(file, 'utf8')).replace(/```[\s\S]*?```/g, '');
    for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      await access(path.resolve(path.dirname(file), decodeURIComponent(target)));
      links++;
    }
  }
}
console.log(`Vérifié : ${scripts} modules JavaScript, ${json} fichiers JSON, ${links} liens locaux.`);
