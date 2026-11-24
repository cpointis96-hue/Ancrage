import assert from 'node:assert/strict';
import test from 'node:test';
import { measureMobilePages } from '../../src/audit/mobile-performance.mjs';

test('mesure les pages commerciales avec Lighthouse et signale un résultat partiel', async () => {
  const pages = ['/', '/a-propos', '/menu', '/contact'].map(path => ({ url: 'https://fixture.example' + path }));
  const calls = [];
  const fetchImpl = async address => {
    const query = new URL(address).searchParams;
    const url = query.get('url');
    calls.push(url);
    assert.equal(query.get('strategy'), 'mobile');
    if (url.endsWith('/contact')) return new Response(null, { status: 429 });
    return Response.json({ lighthouseResult: {
      finalDisplayedUrl: url, fetchTime: '2026-11-17T10:00:00Z',
      audits: {
        'largest-contentful-paint': { numericValue: 3100 },
        'cumulative-layout-shift': { numericValue: 0 },
        'total-blocking-time': { numericValue: 215.4 },
        'image-delivery-insight': { metricSavings: { LCP: 190 } },
      },
    } });
  };
  assert.deepEqual(await measureMobilePages(pages, { fetchImpl }), { status: 'NOT_CONFIGURED', pages: [] });
  assert.equal(calls.length, 0);
  const result = await measureMobilePages(pages, { key: 'fixture-only', fetchImpl });
  assert.deepEqual(calls, [pages[0].url, pages[2].url, pages[3].url]);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.pages[0].lcpMs, 3100);
  assert.equal(result.pages[0].cls, 0);
  assert.equal(result.pages[0].tbtMs, 215);
  assert.deepEqual(result.pages[0].hints, ['Alléger les images']);
  assert.deepEqual(result.pages[0].diagnostics, [{ id: 'image-delivery-insight', label: 'Alléger les images', estimatedMs: 190 }]);
});
