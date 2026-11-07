import test from 'node:test';
import assert from 'node:assert/strict';
import { crawlSite } from '../../src/audit/site-crawler.mjs';

function response(body, { url, status = 200, contentType = 'text/html; charset=utf-8', location = null, contentLength = undefined, stream = null } = {}) {
  const responseBody = stream ?? new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(body)); controller.close(); } });
  const length = contentLength === undefined ? Buffer.byteLength(body) : contentLength;
  return {
    ok: status >= 200 && status < 400,
    status,
    url,
    headers: { get: name => ({ 'content-type': contentType, location, 'content-length': length }[name.toLowerCase()] ?? null) },
    body: responseBody,
    text: async () => body,
  };
}

const lookupPublic = async hostname => [{ address: hostname === 'fixture.example.test' ? '93.184.216.34' : '93.184.216.35', family: 4 }];

test('crawl HTML uniquement sur le même origin et respecte la borne de pages', async () => {
  const calls = [];
  const pages = {
    'https://fixture.example.test/': '<html><body><a href="/menu">Menu</a><a href="https://other.example/">Externe</a></body></html>',
    'https://fixture.example.test/menu': '<html><body><h1>Menu</h1></body></html>',
  };
  const result = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    maxPages: 2,
    fetchImpl: async url => { calls.push(url); return response(pages[url], { url }); },
  });

  assert.deepEqual(calls, ['https://fixture.example.test/', 'https://fixture.example.test/menu']);
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages.every(page => page.crawlStatus === 'complete'), true);
  assert.equal(result.summary.pagesSkipped, 0);
});

test('refuse les cibles privées et les credentials URL', async () => {
  await assert.rejects(
    () => crawlSite({ target: 'http://127.0.0.1/', lookup: lookupPublic, fetchImpl: async () => response('', { url: 'http://127.0.0.1/' }) }),
    error => error.code === 'TARGET_NOT_PUBLIC',
  );
  await assert.rejects(
    () => crawlSite({ target: 'https://user:password@fixture.example.test/', lookup: lookupPublic, fetchImpl: async () => response('') }),
    error => error.code === 'INVALID_TARGET',
  );
});

test('bloque une redirection privée et un payload trop volumineux sans conserver le HTML', async () => {
  const redirected = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    fetchImpl: async url => response('', { url, status: 302, location: 'http://127.0.0.1/private' }),
  });
  assert.equal(redirected.pages[0].crawlStatus, 'blocked');
  assert.equal(redirected.pages[0].html, '');
  assert.equal(redirected.pages[0].errorCode, 'TARGET_NOT_PUBLIC');

  const oversized = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    maxBytes: 10,
    fetchImpl: async url => response('<html>too long</html>', { url }),
  });
  assert.equal(oversized.pages[0].crawlStatus, 'blocked');
  assert.equal(oversized.pages[0].html, '');
  assert.equal(oversized.pages[0].errorCode, 'PAYLOAD_TOO_LARGE');
});

test('valide chaque redirection avant la requête suivante', async () => {
  const calls = [];
  const result = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    fetchImpl: async url => {
      calls.push(url);
      return url.endsWith('/redirect')
        ? response('', { url, status: 302, location: 'http://127.0.0.1/private' })
        : response('', { url, status: 302, location: '/redirect' });
    },
  });

  assert.deepEqual(calls, ['https://fixture.example.test/', 'https://fixture.example.test/redirect']);
  assert.equal(result.pages[0].crawlStatus, 'blocked');
  assert.equal(result.pages[0].html, '');
  assert.equal(result.pages[0].errorCode, 'TARGET_NOT_PUBLIC');
});

test('interrompt la lecture bornée d’un corps sans Content-Length', async () => {
  const chunks = [Buffer.from('<html>1234'), Buffer.from('5678</html>')];
  const stream = new ReadableStream({
    pull(controller) {
      const chunk = chunks.shift();
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
  });
  const result = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    maxBytes: 10,
    fetchImpl: async url => response('', { url, stream }),
  });

  assert.equal(result.pages[0].crawlStatus, 'blocked');
  assert.equal(result.pages[0].html, '');
  assert.equal(result.pages[0].errorCode, 'PAYLOAD_TOO_LARGE');
});

test('borne un async iterable sans Content-Length et refuse un corps non streamable', async () => {
  const chunks = [Buffer.from('<html>1234'), Buffer.from('5678</html>')];
  const asyncBody = {
    async *[Symbol.asyncIterator]() { yield* chunks; },
  };
  const streamed = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    maxBytes: 10,
    fetchImpl: async url => response('', { url, stream: asyncBody, contentLength: null }),
  });
  assert.equal(streamed.pages[0].errorCode, 'PAYLOAD_TOO_LARGE');

  let textCalled = false;
  const unbounded = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    fetchImpl: async url => ({ ...response('', { url, stream: null, contentLength: 24 }), body: null, text: async () => { textCalled = true; return '<html>never read</html>'; } }),
  });
  assert.equal(unbounded.pages[0].errorCode, 'BODY_NOT_BOUNDED');
  assert.equal(textCalled, false);
});

test('annule le même itérateur async iterable au timeout', async () => {
  let returned = false;
  const iterator = {
    next: () => new Promise(() => {}),
    return: async () => { returned = true; return { done: true }; },
  };
  const result = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    timeoutMs: 100,
    fetchImpl: async url => response('', { url, stream: { [Symbol.asyncIterator]: () => iterator } }),
  });
  assert.equal(returned, true);
  assert.equal(result.pages[0].errorCode, 'CRAWL_TIMEOUT');
});

test('annule le corps d’une redirection et ne suit pas un 304', async () => {
  let cancelled = false;
  const redirected = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    fetchImpl: async url => url.endsWith('/menu')
      ? response('<html>Menu</html>', { url })
      : response('', { url, status: 302, location: '/menu', stream: { cancel: async () => { cancelled = true; } } }),
  });
  assert.equal(cancelled, true);
  assert.equal(redirected.pages[0].crawlStatus, 'complete');

  const notModified = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    fetchImpl: async url => response('', { url, status: 304, contentLength: null }),
  });
  assert.equal(notModified.pages[0].errorCode, 'HTTP_304');
});

test('applique un timeout global et transmet le signal d’annulation', async () => {
  let aborted = false;
  const calls = [];
  const startedAt = Date.now();
  const result = await crawlSite({
    target: 'https://fixture.example.test/',
    lookup: lookupPublic,
    maxPages: 2,
    timeoutMs: 100,
    fetchImpl: async (url, { signal }) => {
      calls.push(url);
      if (url.endsWith('/')) {
        await new Promise(resolve => setTimeout(resolve, 70));
        return response('<a href="/menu">Menu</a>', { url });
      }
      return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true });
      });
    },
  });

  assert.equal(aborted, true);
  assert.deepEqual(calls, ['https://fixture.example.test/', 'https://fixture.example.test/menu']);
  assert.equal(result.pages[1].crawlStatus, 'blocked');
  assert.equal(result.pages[1].errorCode, 'CRAWL_TIMEOUT');
  assert.ok(Date.now() - startedAt < 150);
});

test('borne le profil octets et durée même si la requête demande davantage', async () => {
  await assert.rejects(() => crawlSite({ target: 'https://example.com', lookup: async () => ['93.184.216.34'], fetchImpl: async () => ({ url: 'https://example.com/', status: 200, headers: { get: () => 'text/html' }, text: async () => '<html></html>' }), maxBytes: 26 * 1024 * 1024 }), /maxBytes est invalide/);
  await assert.rejects(() => crawlSite({ target: 'https://example.com', lookup: async () => ['93.184.216.34'], fetchImpl: async () => ({ url: 'https://example.com/', status: 200, headers: { get: () => 'text/html' }, text: async () => '<html></html>' }), timeoutMs: 180001 }), /timeoutMs est invalide/);
});
