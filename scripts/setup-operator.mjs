import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { hashOperatorPassword } from '../src/http/operator-auth.mjs';

// Exclusive creation prevents an accidental password rotation on rerun.
await mkdir(new URL('../outputs/private/', import.meta.url), { recursive: true, mode: 0o700 });
const password = randomBytes(24).toString('base64url');
const hash = await hashOperatorPassword(password);
await writeFile(new URL('../outputs/private/cockpit-password.txt', import.meta.url), `${password}\n`, { flag: 'wx', mode: 0o600 });
await writeFile(new URL('../outputs/private/operator-password-hash.txt', import.meta.url), hash, { flag: 'wx', mode: 0o600 });
console.log('Mot de passe créé dans outputs/private/cockpit-password.txt (hors Git et DMG).');
