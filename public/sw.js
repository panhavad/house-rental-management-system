// Minimal service worker: enables "Add to Home Screen" installability and a
// small offline-friendly cache for static app-shell assets. Streamed responses
// (HTML documents and React Server Component payloads) are never intercepted,
// because buffering them through the cache stalls Next.js streaming and leaves
// pages stuck on their loading skeleton.
const CACHE_NAME = "rentalhrm-shell-v2";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Leave streamed navigations and RSC payloads entirely to the browser.
  if (request.mode === "navigate" || request.destination === "document") return;
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request))
  );
});
