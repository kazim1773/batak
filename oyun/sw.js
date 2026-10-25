// İnternetsiz oynama: oyun dosyaları telefona kaydedilir.
// Oyunu güncellediğinde SURUM'u bir artır ki telefonlar yeni sürümü alsın.
const SURUM = 'batak-v5';
const DOSYALAR = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.png',
  ...['S', 'D', 'C', 'H'].flatMap(s => ['J', 'Q', 'K'].map(r => `./img/${r}${s}.png`)),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SURUM).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önce internetten dene (güncel sürüm gelsin), olmazsa kayıtlı kopyayı kullan
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(SURUM).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
