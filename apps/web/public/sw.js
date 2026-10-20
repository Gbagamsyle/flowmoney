/* Cache only this explicit public shell. Never cache pages, APIs or uploaded files. */
const CACHE = "flowmoney-public-v1";
const PUBLIC_FILES = [
  "/offline.html",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          PUBLIC_FILES.map(
            (path) =>
              new Request(path, { credentials: "omit", cache: "reload" }),
          ),
        ),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("flowmoney-public-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE" && event.source?.type === "window")
    self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(new Request(request, { cache: "no-store" })).catch(async () => {
        const offline = await caches.match("/offline.html", {
          cacheName: CACHE,
        });
        return (
          offline ||
          new Response("Connect to the internet to open FlowMoney.", {
            status: 503,
            headers: {
              "Content-Type": "text/plain",
              "Cache-Control": "no-store",
            },
          })
        );
      }),
    );
    return;
  }
  if (!url.search && PUBLIC_FILES.includes(url.pathname))
    event.respondWith(
      caches
        .match(request, { cacheName: CACHE })
        .then((cached) => cached || fetch(request)),
    );
});
