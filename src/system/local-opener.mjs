import { spawn } from 'node:child_process';

export function createLocalOpener() {
  if (process.platform !== 'darwin') return null;
  return target => new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/open', [target], { stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
