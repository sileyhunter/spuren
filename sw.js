/* Ironman Notebook – Offline-Speicher (V5.3, Dateiliste V5.7, V8.1: js/v81.js, js/v81-ui.js, V8.1.1: js/verpflegung.js, js/verpflegung-ui.js, V8.2: js/v82.js, js/v82-ui.js, V8.3: js/v83.js, js/v83-ui.js, V8.5: js/v85.js, js/v85-ui.js, V9.1: js/v91.js, V9.2: js/v92.js, js/v92-ui.js, V7.0: js/v7.js, js/v7-ui.js; V7.3: js/v73.js, js/v73-ui.js, logo-einheit.jpg; V7.4: js/v74.js, js/v74-ui.js; V7.5: js/v75.js, js/v75-ui.js; V7.6: js/v76.js). Netz zuerst, bei fehlendem Netz die zuletzt geladene Fassung.
   Gespeichert werden nur die Seite, die Skripte, die verschlüsselte data.enc.json und (V5.6) bereits geöffnete, ebenfalls
   verschlüsselte Sekundenreihen aus serien/ und (V7.6.2) die verschlüsselten Fotos aus bilder/; Kartenkacheln und Fremddienste nie. */
const CACHE = "notebook-v932-woche-2026-11-22";
const SHELL = ["./", "index.html", "demo.html", "js/kompat.js", "js/formkurve.js", "js/v5-ui.js", "js/v5-ausdauer.js", "js/v5-extra.js", "js/route.js", "js/routen-ui.js", "js/training-route.js", "js/training-ui.js", "js/v53-extra.js", "js/v55.js", "js/v55-schwimmen.js", "js/analyse.js", "js/explorer.js", "js/v56.js", "js/eingang.js", "js/v59-logik.js", "js/v59.js", "js/v6.js", "js/v6-heute.js", "js/v6-plan.js", "js/v61.js", "js/v62.js", "js/v64.js", "js/wissen.js", "js/schwimmen.js", "js/schwimmen-ui.js", "js/v64-ui.js", "js/v65.js", "js/v65-ui.js", "js/v66.js", "js/v66-ui.js", "js/v7.js", "js/v7-ui.js", "js/v73.js", "js/v73-ui.js", "js/v74.js", "js/v74-ui.js", "js/v75.js", "js/v75-ui.js", "js/v76.js", "js/v77.js", "js/v77-ui.js", "js/v78.js", "js/v78-ui.js", "js/v81.js", "js/v81-ui.js", "js/verpflegung.js", "js/verpflegung-ui.js", "js/v82.js", "js/v82-ui.js", "js/v83.js", "js/v83-ui.js", "js/v85.js", "js/v85-ui.js", "js/v91.js", "js/v92.js", "js/v93.js", "js/v92-ui.js", "css/v6.css", "brouter/rennrad-asphalt.brf",
  "manifest.webmanifest", "manifest-demo.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "logo.jpg", "logo-kopf.jpg", "logo-einheit.jpg"];
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
          if ((/\/data\.enc\.json$/.test(p) || /\/(serien|bilder)\/[0-9a-f]{24}\.bin$/.test(p)) && !(await neu.match(req))) { const m = await alt.match(req); if (m) await neu.put(req, m); }
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
