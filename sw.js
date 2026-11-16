// Shlokashala service worker: keeps every page and verse available offline.
// Files are served from the cache first and refreshed in the background,
// so new verses appear on the next visit after you push them.
const CACHE = 'shlokashala-v1';
const FONTS = 'shlokashala-fonts-v1';
const CORE = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/meter.js', 'manifest.webmanifest',
  'data/manifest.json', 'data/collections.json', 'data/vocab.json', 'data/shabdakosh.json', 'data/grammar.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-32.png'
];

async function getJSON(url) { const r = await fetch(url); return r.ok ? r.json() : null; }

// every verse file, figure and code file listed in the data
async function contentFiles() {
  const files = [];
  const add = v => { if (v && v.figure) files.push(v.figure); if (v && v.code) files.push(v.code); if (v && v.audio) files.push(v.audio); };
  const man = await getJSON('data/manifest.json');
  for (const n of (man ? man.verses : [])) { const p = `data/verses/${n}.json`; files.push(p); add(await getJSON(p)); }
  const cols = await getJSON('data/collections.json');
  for (const id of (cols ? cols.collections : [])) {
    const m = await getJSON(`data/collections/${id}/manifest.json`);
    files.push(`data/collections/${id}/manifest.json`);
    for (const n of (m ? m.verses : [])) { const p = `data/collections/${id}/verses/${n}.json`; files.push(p); add(await getJSON(p)); }
  }
  return files;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    const files = await contentFiles().catch(() => []);
    await Promise.all(files.map(f => cache.add(f).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![CACHE, FONTS].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache first, they never change
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // our own files: answer from cache, refresh in the background
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') return c.match('index.html');
    return new Response('Offline', { status: 503 });
  }));
});
