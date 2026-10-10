// Service Worker: App-Dateien offline verfügbar halten. Version bei jeder Änderung erhöhen.
const VERSION = 'zeiterfassung-v5';
const APP = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const CDN = ['https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(APP);
    for (const u of CDN) { try { await c.add(u); } catch (_) {} }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // App-Dateien: erst Netz (Updates), sonst Cache
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const r = await fetch(e.request);
        const c = await caches.open(VERSION); c.put(e.request, r.clone());
        return r;
      } catch (_) {
        return (await caches.match(e.request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }
  // Bibliotheken (Chart.js, Tesseract): erst Cache, sonst Netz und merken
  e.respondWith((async () => {
    const hit = await caches.match(e.request);
    if (hit) return hit;
    try {
      const r = await fetch(e.request);
      if (r.ok) { const c = await caches.open(VERSION); c.put(e.request, r.clone()); }
      return r;
    } catch (err) { return new Response('', { status: 503 }); }
  })());
});
