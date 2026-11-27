const CACHE_NAME = "lm-copiloto-v8";
const PRECACHE_URLS = ["/", "/chat", "/catalogo", "/lista", "/mapa", "/checkout", "/painel", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return res;
      })
      // Offline: /lista?id=x cai na pagina /lista em cache; sem cache, erro de rede explicito.
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) => cached ?? Response.error())
      )
  );
});
