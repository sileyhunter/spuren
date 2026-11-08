/* Ironman Notebook – Offline-Speicher (V5.3). Netz zuerst, bei fehlendem Netz die zuletzt geladene Fassung.
   Gespeichert werden nur die Seite, die Skripte und die verschlüsselte data.enc.json; Kartenkacheln und Fremddienste nie. */
const CACHE = "notebook-v53-2026-11-08";
const SHELL = ["./", "index.html", "demo.html", "js/formkurve.js", "js/v5-ui.js", "js/v5-ausdauer.js", "js/v5-extra.js", "js/route.js", "js/routen-ui.js", "js/v53-extra.js",
  "manifest.webmanifest", "manifest-demo.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon.svg"];
const CDN = ["https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/", "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  const same = u.origin === self.location.origin;
  const cdn = CDN.some((p) => req.url.startsWith(p)) || u.host === "fonts.googleapis.com" || u.host === "fonts.gstatic.com";
  if (!same && !cdn) return;
  const key = same ? new Request(u.origin + u.pathname) : req;
  e.respondWith(fetch(req).then((r) => {
    if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(key, cp)); }
    return r;
  }).catch(() => caches.match(key, { ignoreSearch: true }).then((m) => m || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
