// THIS IS BASED ON: https://arctype.com/blog/pwa-sqlite/
const assets = ['/', '/favicon.ico', '/imgs/*', '/js/*', '/css/*'];

const APP_ASSETS = 'acclab-app-assets';
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches
      .open(APP_ASSETS)
      .then((cache) => {
        cache.addAll(assets);
      })
      .then(self.skipWaiting())
      .catch((e) => {
        console.log(e);
      }),
  );
});

self.addEventListener('activate', function (evt) {
  evt.waitUntil(
    caches
      .keys()
      .then((keysList) => {
        return Promise.all(
          keysList.map((key) => {
            if (key === APP_ASSETS) {
              console.log(`Removed old cache from ${key}`);
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', function (evt) {
  evt.respondWith(
    fetch(evt.request).catch(() => {
      return caches.open(APP_ASSETS).then((cache) => {
        return cache.match(evt.request);
      });
    }),
  );
});
