self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  // Never intercept API calls so live transit telemetry remains fresh.
  if (event.request.url.includes("/api/")) return
})
