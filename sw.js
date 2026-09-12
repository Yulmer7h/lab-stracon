const CACHE_NAME = "lab-stracon-v1.5"; // Incrementamos versión para forzar actualización

const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./sw.js"
];

// Instalación: descarga e instala assets base
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(LOCAL_ASSETS).catch(err => {
        console.warn("Algunos assets no se pudieron cachear al instalar:", err);
      });
    })
  );
  self.skipWaiting(); // Fuerza al SW activo a actualizarse inmediatamente
});

// Activación: elimina versiones antiguas de caché ("lab-stracon-v1", etc.)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Toma el control de las páginas de inmediato
});

// Fetch: Network First para navegación (HTML) / Cache First para recursos estáticos (CSS, JS, Fonts)
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Para navegaciones de página (index.html), intentamos RED primero
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
        .catch(() => {
          // Si no hay red, sirve desde la caché
          return caches.match("./index.html");
        })
    );
    return;
  }

  // Para imágenes, CDNs, fuentes, etc. -> Cache First con Fallback a Red
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
      }).catch(() => {
        // Silenciar errores de red si falla una petición secundaria estando offline
      });
    })
  );
});
