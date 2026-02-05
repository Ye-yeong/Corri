const CACHE_NAME = 'corri-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/globals.css',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event: any) => {
  if (event.request.url.includes('/api/analyze')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: '오프라인이라 분석할 수 없어요. 네트워크를 확인해주세요.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
