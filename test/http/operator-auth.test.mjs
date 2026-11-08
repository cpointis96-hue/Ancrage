import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAtomicStore } from '../../src/core/atomic-store.mjs';
import { createOperatorAuth, hashOperatorPassword } from '../../src/http/operator-auth.mjs';

test('session opérateur : signature, expiration, rotation et compteur partagé', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ancrage-auth-'));
  try {
    const store = createAtomicStore(directory);
    // These calls are sequential; production provides PostgreSQL advisory locks.
    store.withLock = async (_key, action) => action();
    const password = 'mot-de-passe-fixture-uniquement';
    const passwordHash = await hashOperatorPassword(password);
    let clock = Date.now();
    const options = { passwordHash, sessionSecret: 's'.repeat(32), getStore: async () => store, now: () => clock };
    const auth = createOperatorAuth(options);
    assert.equal(auth.authorized({ headers: {} }), false);
    assert.equal((await auth.login('incorrect')).status, 401);
    const result = await auth.login(password);
    assert.equal(result.status, 200);
    const request = { headers: { cookie: result.cookie.split(';')[0] } };
    assert.equal(auth.authorized(request), true);
    assert.equal(createOperatorAuth(options).authorized(request), true);
    assert.equal(auth.authorized({ headers: { cookie: request.headers.cookie + 'x' } }), false);
    assert.equal(createOperatorAuth({ ...options, passwordHash: await hashOperatorPassword(password) }).authorized(request), false);
    clock += 8 * 60 * 60 * 1000;
    assert.equal(auth.authorized(request), false);
    // Independent instances use the same durable rate limit.
    for (let i = 0; i < 10; i++) assert.equal((await createOperatorAuth(options).login('incorrect')).status, 401);
    assert.equal((await auth.login(password)).status, 429);
    clock += 15 * 60 * 1000;
    assert.equal((await auth.login(password)).status, 200);
    assert.match(auth.logoutCookie(), /Max-Age=0/);
    assert.equal((await createOperatorAuth({ ...options, passwordHash: undefined }).login(password)).status, 503);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
