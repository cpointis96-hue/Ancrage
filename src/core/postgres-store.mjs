import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { ConflictError, PathViolationError } from './errors.mjs';

// The pool is injected so the same contract can be verified against an isolated database.
export function createPostgresStore({ pool, namespace = 'ancrage' }) {
  const context = new AsyncLocalStorage();
  const ownership = new AsyncLocalStorage();
  const hash = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
  const hashText = value => hash(Buffer.from(String(value), 'utf8'));
  function validate(key) {
    if (typeof key !== 'string' || key.split('/').some(part => !part || part === '.' || part === '..' || part.includes('\\'))) throw new PathViolationError();
    return key;
  }
  const ready = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('ancrage-schema-v1', 0))");
      await client.query(`CREATE TABLE IF NOT EXISTS ancrage_objects (
        namespace text NOT NULL, key text NOT NULL, value bytea NOT NULL,
        PRIMARY KEY (namespace, key)
      )`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  })();
  async function transaction(action) {
    await ready;
    if (context.getStore()) return action(context.getStore());
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lease = ownership.getStore();
      if (lease) {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify([namespace, lease.key])]);
        const current = await client.query('SELECT value FROM ancrage_objects WHERE namespace = $1 AND key = $2', [namespace, lease.key]);
        const now = await client.query('SELECT clock_timestamp() AS now');
        const value = current.rows.length ? JSON.parse(current.rows[0].value.toString('utf8')) : null;
        if (value?.token !== lease.token || Date.parse(value.expiresAt) <= now.rows[0].now.getTime()) throw new ConflictError('Le worker ne détient plus le verrou.');
      }
      const result = await context.run(client, () => action(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }
  async function withLock(key, action) {
    validate(key);
    return transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify([namespace, key])]);
      return action();
    });
  }
  async function readBuffer(key, fallback = null) {
    validate(key);
    await ready;
    const result = await (context.getStore() ?? pool).query('SELECT value FROM ancrage_objects WHERE namespace = $1 AND key = $2', [namespace, key]);
    return result.rows.length ? result.rows[0].value : fallback;
  }
  async function readText(key, fallback = null) {
    const value = await readBuffer(key);
    return value === null ? fallback : value.toString('utf8');
  }
  async function writeBuffer(key, value, options = {}) {
    if (!Buffer.isBuffer(value)) throw new TypeError('value must be a Buffer');
    return withLock(key, async () => {
      const current = await readBuffer(key);
      const currentHash = current === null ? null : hash(current);
      if ((options.immutable || options.expectedHash === null) && current !== null) throw new ConflictError('La ressource existe déjà.', { currentHash });
      if (typeof options.expectedHash === 'string' && options.expectedHash !== currentHash) throw new ConflictError(undefined, { currentHash });
      await context.getStore().query('INSERT INTO ancrage_objects (namespace, key, value) VALUES ($1, $2, $3) ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value', [namespace, key, value]);
      return { hash: hash(value), previousHash: currentHash, path: key };
    });
  }
  const writeText = (key, value, options) => writeBuffer(key, Buffer.from(String(value), 'utf8'), options);
  const readJson = async (key, fallback = null) => { const value = await readText(key); return value === null ? fallback : JSON.parse(value); };
  const writeJson = (key, value, options) => writeText(key, `${JSON.stringify(value, null, 2)}\n`, options);
  async function appendJsonLine(key, value) {
    return withLock(key, async () => {
      const next = `${await readText(key, '')}${JSON.stringify(value)}\n`;
      await writeText(key, next);
      return { path: key, size: Buffer.byteLength(next) };
    });
  }
  async function leaseOperation(key, action) {
    return withLock(key, async () => {
      const { rows } = await context.getStore().query('SELECT clock_timestamp() AS now');
      return action(await readJson(key), rows[0].now.getTime());
    });
  }
  async function acquireLease(key, token, durationMs) {
    return leaseOperation(key, async (current, now) => {
      if (current?.token && Date.parse(current.expiresAt) > now) return null;
      const lease = { token, expiresAt: new Date(now + durationMs).toISOString() };
      await writeJson(key, lease);
      return lease;
    });
  }
  async function renewLease(key, token, durationMs) {
    return leaseOperation(key, async (current, now) => {
      if (current?.token !== token || Date.parse(current.expiresAt) <= now) return false;
      await writeJson(key, { token, expiresAt: new Date(now + durationMs).toISOString() });
      return true;
    });
  }
  async function releaseLease(key, token) {
    return leaseOperation(key, async current => {
      if (current?.token !== token) return false;
      await writeJson(key, { token: null });
      return true;
    });
  }
  async function leaseState(key) {
    return leaseOperation(key, (current, now) => !current?.token ? { state: 'MISSING' } : { state: Date.parse(current.expiresAt) > now ? 'ACTIVE' : 'EXPIRED', metadata: current });
  }
  async function recoverExpiredLease(key, token) {
    return leaseOperation(key, async (current, now) => {
      if (!current?.token) return 'MISSING';
      if (current.token !== token || Date.parse(current.expiresAt) > now) return 'ACTIVE';
      await writeJson(key, { token: null });
      return 'RECOVERED';
    });
  }
  async function withLease(key, action, durationMs = 120000) {
    const token = randomUUID();
    if (!await acquireLease(key, token, durationMs)) throw new ConflictError('Un worker traite déjà cet audit.');
    const heartbeat = setInterval(() => renewLease(key, token, durationMs).catch(() => {}), Math.floor(durationMs / 3));
    heartbeat.unref?.();
    try { return await ownership.run({ key, token }, action); }
    finally {
      clearInterval(heartbeat);
      await releaseLease(key, token);
    }
  }
  return { ready, withLock, withLease, hashText, readBuffer, readText, readJson, writeBuffer, writeText, writeJson, appendJsonLine, acquireLease, renewLease, releaseLease, leaseState, recoverExpiredLease };
}
