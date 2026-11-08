/* Offline: precache the whole app (shell + font + all 143 data files) on first load.
   Data files are normally in data/; if they were uploaded to the top level, that is used instead. */
var VERSION = "sehaj-v3";
var SHELL = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "fonts/gurmukhi.woff2", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
var DATA = ["index.json"];
for (var s = 1; s <= 1430; s += 10) DATA.push("a" + ("000" + s).slice(-4) + ".json");

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return fetch("data/index.json").then(function (r) { return r.ok ? "data/" : ""; }, function () { return "data/"; }).then(function (b) {
      return c.addAll(SHELL.concat(DATA.map(function (f) { return b + f; })));
    });
  }).then(function () { return self.skipWaiting(); }));
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
