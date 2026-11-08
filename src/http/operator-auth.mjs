import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const cookieName = '__Host-ancrage_operator';
const duration = 8 * 60 * 60 * 1000;
const equal = (a, b) => a.length === b.length && timingSafeEqual(a, b);

export async function hashOperatorPassword(password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) throw new Error('Le mot de passe doit contenir entre 16 et 256 caractères.');
  const salt = randomBytes(16).toString('hex');
  const digest = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${digest.toString('hex')}`;
}

export function createOperatorAuth({ passwordHash, sessionSecret, getStore, now = Date.now }) {
  const configured = /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash ?? '') && typeof sessionSecret === 'string' && sessionSecret.length >= 32;
  const sign = payload => createHmac('sha256', sessionSecret).update(`operator:${passwordHash}:${payload}`).digest('hex');
  const cookie = (value, maxAge) => `${cookieName}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
  function authorized(request) {
    if (!configured) return false;
    const value = (request.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? '';
    const match = value.match(/^(\d+):([a-f0-9]{32}):([a-f0-9]{64})$/);
    if (!match) return false;
    const expires = Number(match[1]);
    if (expires <= now() || expires > now() + duration) return false;
    return equal(Buffer.from(match[3]), Buffer.from(sign(`${match[1]}:${match[2]}`)));
  }
  async function login(password) {
    if (!configured) return { status: 503 };
    // One durable counter for the single operator account, shared by all workers.
    const store = await getStore();
    const admitted = await store.withLock('auth/operator-login.lock', async () => {
      const key = 'auth/operator-login.json';
      let state = await store.readJson(key);
      if (!state || state.until <= now()) state = { attempts: 0, until: now() + 15 * 60 * 1000 };
      if (state.attempts >= 10) return false;
      await store.writeJson(key, { ...state, attempts: state.attempts + 1 });
      return true;
    });
    if (!admitted) return { status: 429 };
    if (typeof password !== 'string' || password.length > 256) return { status: 401 };
    const [, salt, expected] = passwordHash.split(':');
    if (!equal(await scrypt(password, salt, 64), Buffer.from(expected, 'hex'))) return { status: 401 };
    const payload = `${now() + duration}:${randomBytes(16).toString('hex')}`;
    return { status: 200, cookie: cookie(`${payload}:${sign(payload)}`, duration / 1000) };
  }
  return { configured, authorized, login, logoutCookie: () => cookie('', 0) };
}
