/* Ironman Notebook – Offline-Speicher (V5.3, Dateiliste V5.7). Netz zuerst, bei fehlendem Netz die zuletzt geladene Fassung.
   Gespeichert werden nur die Seite, die Skripte, die verschlüsselte data.enc.json und (V5.6) bereits geöffnete, ebenfalls
   verschlüsselte Sekundenreihen aus serien/; Kartenkacheln und Fremddienste nie. */
const CACHE = "notebook-v601-2026-11-13";
const SHELL = ["./", "index.html", "demo.html", "js/formkurve.js", "js/v5-ui.js", "js/v5-ausdauer.js", "js/v5-extra.js", "js/route.js", "js/routen-ui.js", "js/training-route.js", "js/training-ui.js", "js/v53-extra.js", "js/v55.js", "js/v55-schwimmen.js", "js/analyse.js", "js/explorer.js", "js/v56.js", "js/eingang.js", "js/v59-logik.js", "js/v59.js", "js/v6.js", "js/v6-heute.js", "css/v6.css", "brouter/rennrad-asphalt.brf",
  "manifest.webmanifest", "manifest-demo.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "logo.jpg", "logo-kopf.jpg"];
const CDN = ["https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/", "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/"];
// V5.7.1: data.enc.json gehört zum Grundbestand, und beim Wechsel auf eine neue Fassung werden die bereits gespeicherten Daten und
// Sekundenreihen (beide verschlüsselt) übernommen – sonst stünde die Seite direkt nach einem Update ohne Netz ohne Daten da.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.concat(["data.enc.json"]).map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const neu = await caches.open(CACHE);
    for (const k of await caches.keys()) {
      if (k === CACHE) continue;
      try {
        const alt = await caches.open(k);
        for (const req of await alt.keys()) {
          const p = new URL(req.url).pathname;
          if ((/\/data\.enc\.json$/.test(p) || /\/serien\/[0-9a-f]{24}\.bin$/.test(p)) && !(await neu.match(req))) { const m = await alt.match(req); if (m) await neu.put(req, m); }
        }
      } catch (err) { /* alte Fassung nicht lesbar: weiter */ }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
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
