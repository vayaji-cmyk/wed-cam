// Minimal service worker — exists mainly to satisfy PWA installability
// criteria in Chrome/Android. No offline caching, since this app needs a
// live network connection to Cloudinary/Supabase anyway.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally pass-through — no caching. Presence of a fetch handler
  // is what some browsers check for before offering "Add to Home Screen".
});
