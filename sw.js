const CACHE = "lab-stracon-v1.1";
const LOCAL_ASSETS = ["./", "./index.html", "./sw.js"];

// Instalación: cachea lo local
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(LOCAL_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activación: limpia cachés viejas
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, con fallback a red
self.addEventListener("fetch", e => {
  // Ignora requests que no sean GET
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(res => {
        // Cachea solo respuestas válidas
        if (res && res.status === 200) {
          const url = e.request.url;
          const esCacheable =
            url.startsWith(self.location.origin) ||
            url.includes("cdn.tailwindcss.com") ||
            url.includes("cdn.jsdelivr.net") ||
            url.includes("fonts.googleapis.com") ||
            url.includes("fonts.gstatic.com");

          if (esCacheable) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
        }
        return res;
      }).catch(() => {
        // Si falla la red y es navegación, devuelve el HTML cacheado
        if (e.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
