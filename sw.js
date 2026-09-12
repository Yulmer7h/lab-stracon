const CACHE_NAME = "lab-stracon-v1";

const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./sw.js",
  "./manifest.json",
  "./logo.png"
];

// Instalación
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(LOCAL_ASSETS).catch(err => console.warn("Error al cachear assets:", err));
    })
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés viejas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones (Network First para HTML, Cache First para estáticos)
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const isCacheable =
            requestUrl.origin === self.location.origin ||
            requestUrl.hostname.includes("cdn.tailwindcss.com") ||
            requestUrl.hostname.includes("cdn.jsdelivr.net") ||
            requestUrl.hostname.includes("googleapis.com") ||
            requestUrl.hostname.includes("gstatic.com") ||
            requestUrl.hostname.includes("cdnjs.cloudflare.com");

          if (isCacheable) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
        }
        return networkResponse;
      }).catch(() => {});
    })
  );
});
