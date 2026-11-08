/* Offline: precache the whole app (shell + font + all ang files + study files) on first load.
   Data files are normally in data/; if they were uploaded to the top level instead, that is used instead. */
var VERSION = "sehaj-v4";
var SHELL = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "fonts/gurmukhi.woff2", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
var DATA = ["index.json", "study-index.json"];
for (var s = 1; s <= 1430; s += 10) DATA.push("a" + ("000" + s).slice(-4) + ".json");

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return fetch("data/index.json").then(function (r) { return r.ok ? "data/" : ""; }, function () { return "data/"; }).then(function (b) {
      // study files exist only for angs that have extra English; the index says which
      return fetch(b + "study-index.json").then(function (r) { return r.ok ? r.json() : []; }, function () { return []; }).then(function (ix) {
        var study = ix.map(function (n) { return b + "s" + ("000" + n).slice(-4) + ".json"; });
        // the reading itself must cache completely; study files are a bonus and never block install
        return c.addAll(SHELL.concat(DATA.map(function (f) { return b + f; }).filter(function (f) { return f.slice(-16) !== "study-index.json" || ix.length; }))).then(function () {
          return Promise.all(study.map(function (u) { return c.add(u).catch(function () {}); }));
        });
      });
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
