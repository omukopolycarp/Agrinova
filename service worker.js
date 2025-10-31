self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("diplo-cache").then(cache => {
      return cache.addAll([
        "index.html",
        "style.css",
        "script.js",
        "logo.png",
        "favicon.png"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
