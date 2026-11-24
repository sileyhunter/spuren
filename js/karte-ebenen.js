/* Ironman Notebook – V9.13.0 karte-einfach-1.0 (Outdoor O1): Karte einfach.
 * Drei runde Knöpfe (Ebenen · Planen · Meine Daten), Ebenen-Blatt mit vier Vorlagen, Grundkarten Schweiz und Ausland ohne Schlüssel,
 * Deckkraft-Regler je Ebene, Liste «Aktive Ebenen», Quellen und Lizenzen, Reiter im Blatt «Meine Daten».
 * Dieser Teil ist rein (läuft auch in Node, tests/test_v9130.cjs): Dienste, Vorlagen, Deckkraft, aktive Ebenen, Reiter. Die Verdrahtung mit der
 * Karte (MapLibre) steht in index.html. Alles ohne Schlüssel und ohne Konto; Koordinaten gehen nur in Kachel-Anfragen an den jeweiligen Dienst
 * (Kartenausschnitt), nie Spuren oder Routen. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const KE = { VERSION: "karte-einfach-1.0" };
  const OSM = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende';

  /* Grundkarten. Die fünf Schweizer stehen schon im Kartenstil (swisstopo), die vier ausländischen kommen mit `tiles` dazu. */
  KE.GRUND = [
    { id: "nacht", label: "Nacht", region: "ch", quelle: "swisstopo" },
    { id: "farbe", label: "Landeskarte", region: "ch", quelle: "swisstopo" },
    { id: "winter", label: "Winterkarte", region: "ch", quelle: "swisstopo" },
    { id: "grau", label: "Grau", region: "ch", quelle: "swisstopo" },
    { id: "luft", label: "Luftbild", region: "ch", quelle: "swisstopo" },
    { id: "ot", label: "OpenTopoMap", region: "ausland", quelle: "opentopomap", max: 17,
      tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png", "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"],
      attr: `Kartendaten: ${OSM}, SRTM | Darstellung: © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)` },
    { id: "ignplan", label: "IGN Plan", region: "ausland", quelle: "ign", max: 18,
      tiles: ["https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"],
      attr: '© <a href="https://geoservices.ign.fr" target="_blank" rel="noopener">IGN</a> (Géoplateforme)' },
    { id: "igntopo", label: "IGN Topo", region: "ausland", quelle: "ign", max: 16,
      tiles: ["https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"],
      attr: '© <a href="https://geoservices.ign.fr" target="_blank" rel="noopener">IGN</a> (Géoplateforme)' },
    { id: "bmat", label: "basemap.at", region: "ausland", quelle: "basemapat", max: 19,
      tiles: ["https://mapsneu.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png"],
      attr: 'Grundkarte: <a href="https://basemap.at" target="_blank" rel="noopener">basemap.at</a> (CC BY 4.0)' },
  ];
  /* Zusätzliche Ebenen (Waymarked Trails, aus OpenStreetMap), liegen über der Grundkarte */
  const WMT_ATTR = `© <a href="https://waymarkedtrails.org" target="_blank" rel="noopener">waymarkedtrails.org</a>, ${OSM} (CC BY-SA)`;
  KE.EBENEN_NEU = [
    { id: "wmt_wander", label: "Wanderwege (OSM)", quelle: "wmt", art: "hiking" },
    { id: "wmt_rad", label: "Radrouten (OSM)", quelle: "wmt", art: "cycling" },
    { id: "wmt_mtb", label: "MTB-Routen (OSM)", quelle: "wmt", art: "mtb" },
  ].map((e) => Object.assign(e, { max: 18, tiles: [`https://tile.waymarkedtrails.org/${e.art}/{z}/{x}/{y}.png`], attr: WMT_ATTR }));

  KE.grundIds = () => KE.GRUND.map((g) => g.id);
  KE.grund = (id) => KE.GRUND.find((g) => g.id === id) || null;
  KE.regionVon = (id) => { const g = KE.grund(id); return g ? g.region : "ch"; };
  KE.grundNeu = () => KE.GRUND.filter((g) => g.tiles);

  /* Quellen und Layer für den Kartenstil (nur die neuen; die Schweizer stehen schon im Stil) */
  KE.rasterQuellen = function () {
    const q = {};
    for (const e of KE.grundNeu().concat(KE.EBENEN_NEU)) q[e.id] = { type: "raster", tiles: e.tiles.slice(), tileSize: 256, maxzoom: e.max, attribution: e.attr };
    return q;
  };
  KE.grundLayer = () => KE.grundNeu().map((g) => ({ id: g.id, type: "raster", source: g.id, layout: { visibility: "none" } }));
  KE.ebenenLayer = () => KE.EBENEN_NEU.map((e) => ({ id: e.id, type: "raster", source: e.id, layout: { visibility: "none" }, paint: { "raster-opacity": 0.85 } }));

  /* Namen aller schaltbaren Ebenen (für «Aktive Ebenen») */
  KE.NAMEN = {
    wander: "Wanderwege", velo: "Veloland", mtb: "MTB-Land", wanderland: "Wanderland",
    skitouren: "Skitouren", schneeschuh: "Schneeschuhrouten", hang30: "Hangneigung über 30°",
    wrz: "Wildruhezonen", jbg: "Eidg. Jagdbanngebiete", wsg_gr: "Wildschutzgebiete GR",
    wmt_wander: "Wanderwege (OSM)", wmt_rad: "Radrouten (OSM)", wmt_mtb: "MTB-Routen (OSM)",
  };
  /* Standard-Deckkraft in % (so, wie die Ebenen vor V9.13.0 gezeichnet wurden) */
  KE.OP_STANDARD = { wander: 90, velo: 90, mtb: 90, skitouren: 85, schneeschuh: 85, hang30: 85, wrz: 85, jbg: 85, wanderland: 85, wsg_gr: 75, wmt_wander: 85, wmt_rad: 85, wmt_mtb: 85 };
  KE.opStandard = (key) => (KE.grund(key) ? 100 : KE.OP_STANDARD[key] != null ? KE.OP_STANDARD[key] : 85);
  KE.klemme = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null; };
  /** Gespeicherte Deckkraft lesen: nur Schlüssel mit Zahl 0–100 bleiben, alles andere fällt weg. */
  KE.opLesen = function (raw) {
    let o = raw;
    if (typeof raw === "string") { try { o = JSON.parse(raw); } catch (e) { o = null; } }
    const out = {};
    if (!o || typeof o !== "object" || Array.isArray(o)) return out;
    for (const [k, v] of Object.entries(o)) { const n = KE.klemme(v); if (n != null && /^[a-z0-9_]{1,24}$/.test(k)) out[k] = n; }
    return out;
  };
  KE.opWert = (op, key) => (op && op[key] != null ? op[key] : KE.opStandard(key));
  /** Neuer Stand; entspricht der Wert dem Standard, fällt der Eintrag weg (nur Abweichungen werden gespeichert). */
  KE.opSetzen = function (op, key, wert) {
    const neu = Object.assign({}, KE.opLesen(op)), n = KE.klemme(wert);
    if (n == null) return neu;
    if (n === KE.opStandard(key)) delete neu[key]; else neu[key] = n;
    return neu;
  };

  /* Vorlagen: ein Tipp setzt die ganze Kombination (Silas, 23.11.2026) */
  KE.VORLAGEN = [
    { id: "skitour", label: "Skitour", grund: "winter", ebenen: ["skitouren", "hang30", "wrz", "wsg_gr"], jagd: false, spuren: true,
      info: "Winterkarte, Skitouren, Hangneigung über 30°, Wildruhezonen, Wildschutzgebiete GR, meine Spuren" },
    { id: "wandern", label: "Wandern", grund: "farbe", ebenen: ["wander"], jagd: false, spuren: true, info: "Landeskarte, Wanderwege, meine Spuren" },
    { id: "rad", label: "Rad", grund: "farbe", ebenen: ["velo", "mtb"], jagd: false, spuren: false, info: "Landeskarte, Veloland, MTB-Land" },
    { id: "jagd", label: "Jagd", grund: "farbe", ebenen: ["wrz", "jbg"], jagd: true, spuren: false, info: "Landeskarte, Jagdposten, Wildruhezonen, Jagdbanngebiete" },
  ];
  KE.vorlage = (id) => KE.VORLAGEN.find((v) => v.id === id) || null;
  /** Was ändert sich, wenn die Vorlage `id` auf den Stand `ist` ({ grund, ebenen:[…], jagd, spuren }) angewendet wird? */
  KE.vorlagePlan = function (id, ist) {
    const v = KE.vorlage(id); if (!v) return null;
    const jetzt = new Set((ist && ist.ebenen) || []), soll = new Set(v.ebenen);
    return {
      grund: v.grund,
      an: v.ebenen.filter((k) => !jetzt.has(k)),
      aus: [...jetzt].filter((k) => !soll.has(k)),
      jagd: !!v.jagd, spuren: v.spuren ? "heat" : "off", vorlage: v.id,
    };
  };
  /** Stimmt der aktuelle Stand genau mit einer Vorlage überein (dann leuchtet ihre Kachel)? */
  KE.vorlageErkannt = function (ist) {
    if (!ist) return null;
    const jetzt = [...new Set(ist.ebenen || [])].sort().join(",");
    for (const v of KE.VORLAGEN) {
      if (v.grund === ist.grund && v.ebenen.slice().sort().join(",") === jetzt && !!v.jagd === !!ist.jagd && (v.spuren ? ist.spuren === "heat" : ist.spuren !== "heat")) return v.id;
    }
    return null;
  };

  /* Aktive Ebenen: Grundkarte, eingeschaltete Ebenen, Jagdposten, Spuren */
  KE.aktiveEbenen = function (st) {
    const s = st || {}, op = KE.opLesen(s.op), rows = [];
    const g = KE.grund(s.grund) || KE.grund("nacht");
    rows.push({ key: g.id, art: "grund", label: g.label, op: KE.opWert(op, g.id), aus: false });
    for (const k of s.ebenen || []) rows.push({ key: k, art: "ebene", label: (s.namen && s.namen[k]) || KE.NAMEN[k] || k, op: KE.opWert(op, k), aus: true });
    if (s.jagd) rows.push({ key: "jagd", art: "punkte", label: "Jagdposten", op: null, aus: true });
    if (s.spuren === "heat" || s.spuren === "sport") rows.push({ key: "spuren", art: "spuren", label: s.spuren === "heat" ? "Meine Spuren" : "Spuren nach Sport", op: null, aus: true });
    return rows;
  };
  KE.aktivHtml = function (rows, esc) {
    const e = esc || ((x) => String(x));
    return rows.map((r) => `<li class="la-row" data-key="${e(r.key)}" data-art="${e(r.art)}"><span class="la-name">${e(r.label)}</span>` +
      (r.op != null ? `<input class="la-op" type="range" min="0" max="100" step="5" value="${r.op}" data-op="${e(r.key)}" aria-label="Deckkraft ${e(r.label)}"><output class="la-pct">${r.op} %</output>` : `<span class="la-leer"></span>`) +
      (r.aus ? `<button class="la-x" type="button" data-aus="${e(r.key)}" data-art="${e(r.art)}" aria-label="${e(r.label)} ausschalten">✕</button>` : `<span class="la-leer"></span>`) + `</li>`).join("");
  };

  /* Quellen und Lizenzen (je Dienst; was nicht geprüft ist, steht dabei) */
  KE.QUELLEN = [
    { id: "swisstopo", name: "swisstopo", wofuer: "Landeskarte, Winterkarte, Luftbild, Wanderwege, Veloland, MTB-Land, Skitouren, Schneeschuhrouten, Hangneigung", lizenz: "Quellenangabe «© swisstopo» in der Karte", url: "https://www.swisstopo.admin.ch", hinweis: "Dienste von geo.admin.ch; ein Teil der Ebenen wird beim ersten Einschalten geprüft" },
    { id: "bafu", name: "BAFU und Kanton Graubünden", wofuer: "Wildruhezonen, Jagdbanngebiete, Wildschutzgebiete GR", lizenz: "Quelle: Bundesamt für Umwelt bzw. Amt für Jagd und Fischerei GR", url: "https://map.geo.admin.ch", hinweis: "Zur Orientierung; massgebend sind die amtlichen Karten und Verordnungen" },
    { id: "carto", name: "OpenStreetMap / CARTO", wofuer: "Weltkarte unter der Landeskarte (Nacht, Hell)", lizenz: "© OpenStreetMap-Mitwirkende (ODbL), © CARTO", url: "https://carto.com/attributions", hinweis: "" },
    { id: "opentopomap", name: "OpenTopoMap", wofuer: "Grundkarte Ausland (Gelände, Höhenlinien)", lizenz: "CC-BY-SA; Daten © OpenStreetMap-Mitwirkende, SRTM", url: "https://opentopomap.org", hinweis: "Freier Dienst, nur mässige Nutzung; am iPhone nicht geprüft" },
    { id: "ign", name: "IGN (Géoplateforme)", wofuer: "Grundkarte Frankreich: IGN Plan und IGN Topo", lizenz: "Quelle «IGN»; Nutzungsbedingungen von geoservices.ign.fr", url: "https://geoservices.ign.fr", hinweis: "Nicht verifiziert: Ebenennamen und Zugang ohne Schlüssel am iPhone prüfen (IGN Topo besonders)" },
    { id: "basemapat", name: "basemap.at", wofuer: "Grundkarte Österreich", lizenz: "CC BY 4.0, «Grundkarte: basemap.at»", url: "https://basemap.at", hinweis: "Am iPhone nicht geprüft" },
    { id: "wmt", name: "Waymarked Trails", wofuer: "Wander-, Rad- und MTB-Routen aus OpenStreetMap (weltweit)", lizenz: "CC BY-SA; Daten © OpenStreetMap-Mitwirkende", url: "https://waymarkedtrails.org", hinweis: "Am iPhone nicht geprüft" },
    { id: "terrain", name: "Mapzen / AWS Terrain Tiles", wofuer: "3D-Gelände", lizenz: "Quellenangabe in der Karte", url: "https://registry.opendata.aws/terrain-tiles/", hinweis: "" },
  ];
  KE.quellenHtml = (esc) => { const e = esc || ((x) => String(x)); return KE.QUELLEN.map((q) => `<li><b>${e(q.name)}</b>: ${e(q.wofuer)}.<br><small>${e(q.lizenz)}${q.hinweis ? " · " + e(q.hinweis) : ""} · <a href="${e(q.url)}" target="_blank" rel="noopener">${e(q.url.replace(/^https?:\/\//, ""))}</a></small></li>`).join(""); };

  /* Reiter im Blatt «Meine Daten» */
  KE.TABS = [{ id: "spuren", label: "Spuren" }, { id: "punkte", label: "Punkte" }, { id: "routen", label: "Routen" }];
  KE.tab = (raw) => (KE.TABS.some((t) => t.id === raw) ? raw : "spuren");

  /* Versionskennungen (für den Vorher-Nachher-Abgleich) */
  KE.VERSIONEN = { karte: "karte-einfach-1.0", vorlagen: "ebenen-vorlagen-1.0", deckkraft: "deckkraft-1.0", auslandkarten: "grundkarten-ausland-1.0", daten: "meine-daten-1.0", suche: "kartensuche-1.0" };
  return KE;
});
