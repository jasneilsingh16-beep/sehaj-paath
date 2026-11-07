/* Offline: precache the whole app (shell + font + all 143 data files) on first load. */
var VERSION = "sehaj-v2";
var SHELL = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "fonts/gurmukhi.woff2", "data/index.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
for (var s = 1; s <= 1430; s += 10) SHELL.push("data/a" + ("000" + s).slice(-4) + ".json");

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request);
  }));
});
