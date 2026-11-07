import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { ValidationError } from '../core/errors.mjs';

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_REDIRECTS = 10;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function crawlerError(message, code) { return Object.assign(new Error(message), { code }); }

function privateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 88 || b === 168))
    || (a === 198 && b >= 18 && b <= 51) || (a === 203 && b === 0) || a >= 224;
}

function privateAddress(address) {
  const normalized = String(address).toLowerCase().split('%')[0];
  if (isIP(normalized) === 4) return privateIpv4(normalized);
  if (isIP(normalized) !== 6) return true;
  if (normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('2001:db8')) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return Boolean(mapped && privateIpv4(mapped[1]));
}

function parseTarget(value, field = 'target') {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} est requis.`, { field });
  let url;
  try { url = new URL(value); } catch { throw crawlerError(`${field} est invalide.`, 'INVALID_TARGET'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw crawlerError(`${field} est invalide.`, 'INVALID_TARGET');
  return url;
}

function timeoutError() { return crawlerError('Durée maximale du crawl dépassée.', 'CRAWL_TIMEOUT'); }

async function awaitWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) throw signal.reason ?? timeoutError();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(signal.reason ?? timeoutError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(promise).then(
      value => { signal.removeEventListener('abort', onAbort); resolve(value); },
      error => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}

async function assertPublic(url, lookup, signal) {
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) throw crawlerError('Cible réseau privée.', 'TARGET_NOT_PUBLIC');
  if (isIP(hostname)) {
    if (privateAddress(hostname)) throw crawlerError('Cible réseau privée.', 'TARGET_NOT_PUBLIC');
    return;
  }
  let records;
  try { records = await awaitWithSignal(lookup(hostname, { signal }), signal); } catch (error) {
    if (error?.code === 'CRAWL_TIMEOUT') throw error;
    throw crawlerError('Résolution DNS impossible.', 'TARGET_NOT_PUBLIC');
  }
  const addresses = (Array.isArray(records) ? records : [records]).map(record => typeof record === 'string' ? record : record?.address).filter(Boolean);
  if (!addresses.length || addresses.some(privateAddress)) throw crawlerError('La cible ne se résout pas vers une adresse publique.', 'TARGET_NOT_PUBLIC');
}

export async function validatePublicTarget(value, { lookup = hostname => dnsLookup(hostname, { all: true, verbatim: true }) } = {}) {
  const url = parseTarget(value);
  await assertPublic(url, lookup);
  return url;
}

function header(response, name) {
  if (response.headers?.get) return response.headers.get(name);
  const value = response.headers?.[name] ?? response.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function links(html, base, origin) {
  const result = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      url.hash = '';
      if (['http:', 'https:'].includes(url.protocol) && url.origin === origin) result.push(url.href);
    } catch { /* malformed links are findings for a later rule, not crawl targets */ }
  }
  return result;
}

function contentLength(response) {
  const value = header(response, 'content-length');
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const length = Number(normalized);
  return Number.isSafeInteger(length) ? length : null;
}

async function cancelBody(response, signal) {
  const body = response.body;
  if (!body) return;
  if (typeof body.cancel === 'function') return awaitWithSignal(body.cancel(), signal);
  if (typeof body.destroy === 'function') { body.destroy(); return; }
  if (typeof body[Symbol.asyncIterator] === 'function') {
    const iterator = body[Symbol.asyncIterator]();
    if (typeof iterator.return === 'function') await awaitWithSignal(iterator.return(), signal);
  }
}

function stopIterator(body, iterator) {
  try {
    if (typeof iterator.return === 'function') Promise.resolve(iterator.return()).catch(() => {});
    else if (typeof body.destroy === 'function') body.destroy();
  } catch { /* cancellation is best-effort after the bounded read has stopped */ }
}

async function readHtml(response, { signal, remainingBytes, consumeBytes }) {
  const declaredLength = contentLength(response);
  if (declaredLength !== null && declaredLength > remainingBytes()) throw crawlerError('Payload trop volumineux.', 'PAYLOAD_TOO_LARGE');

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const next = await awaitWithSignal(reader.read(), signal);
        if (next.done) break;
        const chunk = Buffer.from(next.value);
        consumeBytes(chunk.byteLength);
        size += chunk.byteLength;
        if (remainingBytes() < 0) {
          await reader.cancel().catch(() => {});
          throw crawlerError('Payload trop volumineux.', 'PAYLOAD_TOO_LARGE');
        }
        chunks.push(chunk);
      }
    } catch (error) {
      if (signal?.aborted) await reader.cancel().catch(() => {});
      throw error;
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  if (response.body?.[Symbol.asyncIterator]) {
    const body = response.body;
    const iterator = body[Symbol.asyncIterator]();
    const chunks = [];
    try {
      while (true) {
        const next = await awaitWithSignal(iterator.next(), signal);
        if (next.done) break;
        const value = next.value;
        const chunk = Buffer.from(value);
        consumeBytes(chunk.byteLength);
        if (remainingBytes() < 0) {
          stopIterator(body, iterator);
          throw crawlerError('Payload trop volumineux.', 'PAYLOAD_TOO_LARGE');
        }
        chunks.push(chunk);
      }
    } catch (error) {
      if (signal?.aborted) stopIterator(body, iterator);
      throw error;
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  throw crawlerError('Corps non borné.', 'BODY_NOT_BOUNDED');
}

function redirectTarget(response, base) {
  const location = header(response, 'location');
  if (!location) throw crawlerError('Redirection sans cible.', 'REDIRECT_INVALID');
  try { return parseTarget(new URL(location, base).href, 'response.headers.location'); }
  catch (error) { if (error?.code) throw error; throw crawlerError('Redirection invalide.', 'REDIRECT_INVALID'); }
}

export async function crawlSite({ target, fetchImpl = globalThis.fetch, lookup = hostname => dnsLookup(hostname, { all: true, verbatim: true }), maxPages = DEFAULT_MAX_PAGES, maxBytes = DEFAULT_MAX_BYTES, timeoutMs = DEFAULT_TIMEOUT_MS, prioritizeClientPages = false } = {}) {
  if (typeof fetchImpl !== 'function') throw new ValidationError('fetchImpl est requis.');
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > DEFAULT_MAX_PAGES) throw new ValidationError('maxPages est invalide.', { field: 'maxPages' });
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_BYTES) throw new ValidationError('maxBytes est invalide.', { field: 'maxBytes' });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > MAX_TIMEOUT_MS) throw new ValidationError('timeoutMs est invalide.', { field: 'timeoutMs' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(timeoutError()), timeoutMs);
  const signal = controller.signal;
  let usedBytes = 0;
  let root;
  try {
    root = parseTarget(target);
    await assertPublic(root, lookup, signal);
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
  const queue = [root.href]; const visited = new Set(); const pages = [];
  try {
    while (queue.length && pages.length < maxPages) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      try {
        let current = parseTarget(url);
        let response;
        for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
          await assertPublic(current, lookup, signal);
          if (current.origin !== root.origin) throw crawlerError('Redirection hors origin.', 'REDIRECT_OUT_OF_ORIGIN');
          response = await awaitWithSignal(fetchImpl(current.href, { redirect: 'manual', signal }), signal);
          const status = Number(response.status ?? 200);
          if (!REDIRECT_STATUSES.has(status)) {
            if (status >= 300 && status < 400) throw crawlerError(`Réponse HTTP ${status}.`, `HTTP_${status}`);
            break;
          }
          if (redirects === MAX_REDIRECTS) throw crawlerError('Trop de redirections.', 'REDIRECT_LIMIT');
          await cancelBody(response, signal);
          current = redirectTarget(response, current.href);
        }
        const status = Number(response.status ?? 200);
        if (status >= 400) throw crawlerError(`Réponse HTTP ${status}.`, `HTTP_${status}`);
        const contentType = header(response, 'content-type');
        if (contentType && !contentType.toLowerCase().includes('text/html')) throw crawlerError('Ressource non HTML.', 'NOT_HTML');
        const html = await readHtml(response, { signal, remainingBytes: () => maxBytes - usedBytes, consumeBytes: size => { usedBytes += size; } });
        pages.push({ url: current.href, status, crawlStatus: 'complete', html });
        for (const link of links(html, current.href, root.origin)) if (!visited.has(link) && !queue.includes(link)) queue.push(link);
        if (prioritizeClientPages) {
          const important = value => /contact|reserv|booking|menu|carte|service|horaire|acces/i.test(new URL(value).pathname) ? 0 : 1;
          queue.sort((left, right) => important(left) - important(right));
        }
      } catch (error) {
        pages.push({ url, status: null, crawlStatus: 'blocked', html: '', errorCode: error.code ?? 'FETCH_FAILED' });
        if (error.code === 'CRAWL_TIMEOUT') break;
      }
    }
  } finally {
    clearTimeout(timeout);
  }
  return {
    target: root.href,
    pages,
    summary: { pagesCaptured: pages.length, pagesCompleted: pages.filter(page => page.crawlStatus === 'complete').length, pagesBlocked: pages.filter(page => page.crawlStatus === 'blocked').length, pagesSkipped: queue.length, limitReached: queue.length > 0 },
  };
}
