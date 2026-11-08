/* Ironman Notebook – Routenplaner V5.3 (Oberfläche). Rechenlogik in js/route.js (window.RT).
 * Ein Zustand für Karte, Profil, Listen, Tastatur und Finger: ST (activeRouteId, cursorDistance_m, selectedSegmentIds,
 * activeAnalysisTab, routeDirection, effortMode, effortValue). Jede Anzeige liest nur aus ST und dem Routenmodell. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let C = null, RT = null, FK = null, map = null;

  const ST = {
    activeRouteId: null, cursorDistance_m: null, selectedSegmentIds: new Set(), selectedCat: null, selectedClimb: null,
    activeAnalysisTab: "hoehe", routeDirection: "hin", effortMode: "watt", effortValue: 200,
    sport: "rennrad", opts: {}, vias: [], names: [], addMode: true, sheet: "half", startUnix: null, pause: "auto",
    busy: false, error: null, legsOk: null, wetter: { status: "aus", t: null, msg: "" }, editId: null,
  };
  let route = null, sim = null, climbs = null, pieces = [], stats = [], field = null, wpts = null;
  let job = 0, wjob = 0, history = [], markers = [], cursorMarker = null, dragCursor = false;
  const CACHE = new Map();
  const SNAP_WARN = 60, SNAP_ERR = 500;      // m zwischen gesetztem Punkt und erlaubtem Weg

  /* ---------------- Speicher (nur auf diesem Gerät) ---------------- */
  const S = {
    get: (k, d) => C.store.get("sf.rt." + k, d),
    set: (k, v) => C.store.set("sf.rt." + k, v),
  };
  const consent = () => S.get("consent", {});
  const fmt = (v, d) => C.fmt(v, d || 0);
  const km = (m) => fmt(m / 1000, m < 10000 ? 2 : 1);
  const tz = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" });
  const tzd = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", weekday: "short", day: "numeric", month: "numeric" });
  const clock = (u) => tz.format(new Date(u * 1000));
  const dur = (s) => { if (!isNum(s)) return "–"; const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60); return m === 60 ? `${h + 1}:00` : `${h}:${String(m).padStart(2, "0")}`; };
  const esc = (s) => C.esc(s);
  const sportDef = () => RT.SPORTS[ST.sport];
  const drawn = () => ST.sport === "skitour" || ST.manual;

  /* ---------------- Kategorien je Analyseansicht ---------------- */
  const TEMP = [["t0", "unter 0 °C", -99, 0, "#4a6fa5"], ["t5", "0–5 °C", 0, 5, "#7aa6c2"], ["t10", "5–10 °C", 5, 10, "#9cc7b4"], ["t15", "10–15 °C", 10, 15, "#d9cf7f"],
    ["t20", "15–20 °C", 15, 20, "#e9a65d"], ["t25", "20–25 °C", 20, 25, "#d9694a"], ["t30", "über 25 °C", 25, 99, "#a63d2f"]];
  const RAIN = [["r0", "trocken (< 0,1 mm/h)", -1, 0.1, "#d7dde2"], ["r1", "leicht (0,1–1 mm/h)", 0.1, 1, "#8fb8de"], ["r4", "mässig (1–4 mm/h)", 1, 4, "#4a7fc1"], ["r9", "stark (> 4 mm/h)", 4, 999, "#23457a"]];
  const WIND = [["wg2", "Gegenwind > 15 km/h", -99, -15, "#8c2d2d"], ["wg1", "Gegenwind 5–15 km/h", -15, -5, "#d9694a"], ["ws", "seitlich/schwach (±5 km/h)", -5, 5, "#c9d0d6"],
    ["wr1", "Rückenwind 5–15 km/h", 5, 15, "#6fa6c9"], ["wr2", "Rückenwind > 15 km/h", 15, 99, "#2c6e9b"]];
  const SPEED_RAD = [["v1", "unter 10 km/h", 0, 10, "#8c2d2d"], ["v2", "10–20 km/h", 10, 20, "#d9824a"], ["v3", "20–30 km/h", 20, 30, "#d9cf7f"], ["v4", "30–40 km/h", 30, 40, "#6fa6c9"], ["v5", "über 40 km/h", 40, 999, "#2c6e9b"]];
  const SPEED_FUSS = [["p1", "langsamer als 8:00 /km", 0, 7.5, "#8c2d2d"], ["p2", "6:00–8:00 /km", 7.5, 10, "#d9824a"], ["p3", "5:00–6:00 /km", 10, 12, "#d9cf7f"], ["p4", "4:00–5:00 /km", 12, 15, "#6fa6c9"], ["p5", "schneller als 4:00 /km", 15, 999, "#2c6e9b"]];
  const SPEED_GEH = [["h1", "unter 2 km/h", 0, 2, "#8c2d2d"], ["h2", "2–3 km/h", 2, 3, "#d9824a"], ["h3", "3–4 km/h", 3, 4, "#d9cf7f"], ["h4", "4–5 km/h", 4, 5, "#6fa6c9"], ["h5", "über 5 km/h", 5, 99, "#2c6e9b"]];
  const UNK = { label: "Unbekannt", color: "#c3c8cd" };
  // wetter-rt-1.2: unbekannt bleibt sichtbar unbekannt; 0 km/h nur bei gemeldeter Windstille
  const windKurz = (w) => (!w || !isNum(w.speed) ? "Wind unbekannt" : w.speed < 1e-6 ? "windstill (0 km/h)" : `Wind ${fmt(w.speed * 3.6)} km/h ${isNum(w.dirFrom) ? "aus " + dirName(w.dirFrom) : "(Richtung unbekannt)"}`);
  const tempKurz = (w) => (w && isNum(w.temp) ? `${fmt(w.temp, 0)} °C` : "Temperatur unbekannt");
  const regenKurz = (w) => (w && isNum(w.regen) ? `${fmt(w.regen, 1)} mm/h` : "Regen unbekannt");
  const bin = (list, v) => { if (!isNum(v)) return "unbekannt"; const b = list.find((x) => v >= x[2] && v < x[3]); return b ? b[0] : "unbekannt"; };
  const defFrom = (list) => Object.fromEntries(list.map((x) => [x[0], { label: x[1], color: x[4] }]).concat([["unbekannt", UNK]]));
  const TABS = {
    hoehe: { label: "Höhe", cats: () => Object.fromEntries(RT.GRADE_BINS.map((b) => [b.k, { label: b.label, color: b.color }])) },
    anstiege: { label: "Anstiege" },
    wegart: { label: "Wegart", cats: () => RT.WAY, netz: true },
    belag: { label: "Belag", cats: () => RT.SURFACE, netz: true },
    zugang: { label: "Zugang", cats: () => RT.ACCESS, netz: true },
    temp: { label: "Temperatur", cats: () => defFrom(TEMP), wetter: true },
    regen: { label: "Regen", cats: () => defFrom(RAIN), wetter: true },
    wind: { label: "Wind", cats: () => defFrom(WIND), wetter: true },
    tempo: { label: "Tempo", cats: () => defFrom(speedBins()) },
  };
  const speedBins = () => (sportDef().art === "rad" ? SPEED_RAD : ST.sport === "laufen" || ST.sport === "trail" ? SPEED_FUSS : SPEED_GEH);
  const wxAt = (k) => { if (!field || !sim || sim.unzureichend) return null; const P = route.profile; return field((P.d[k] + P.d[k + 1]) / 2, ST.startUnix + sim.t[k] + RT.pauseBefore(pausenList(), P.d[k]), P.head[k]); };
  /** Pausen an Zwischenzielen (Minuten je Wegpunkt) → [{d, s}] entlang der Route (V5.5, zeit-rt-1.1). */
  function pausenList() {
    if (!route || !route.vias) return [];
    return route.vias.map((v, i) => ({ d: v.d, s: ((ST.pausen || [])[i] || 0) * 60, i })).filter((p) => p.i > 0 && p.i < route.vias.length - 1 && p.s > 0);
  }
  function catOfStep(tab) {
    const P = route.profile;
    if (tab === "hoehe") return (k) => RT.gradeBin(P.grade[k]);
    if (tab === "temp") return (k) => { const w = wxAt(k); return bin(TEMP, w && w.temp); };
    if (tab === "regen") return (k) => { const w = wxAt(k); return bin(RAIN, w && w.regen); };
    if (tab === "wind") return (k) => { const w = wxAt(k); return bin(WIND, w && isNum(w.along) ? w.along * 3.6 : null); };
    if (tab === "tempo") return (k) => (sim && !sim.unzureichend && isNum(sim.v[k]) ? bin(speedBins(), sim.v[k] * 3.6) : "unbekannt");
    return () => "unbekannt";
  }

  /* ---------------- Aufbau ---------------- */
  function skeleton() {
    const el = $("planner");
    el.className = "planner rp";
    el.setAttribute("aria-label", "Routenplaner");
    el.innerHTML = `
      <div class="rp-grip" id="rp-grip" role="button" tabindex="0" aria-controls="planner" aria-label="Routenplaner: Höhe umschalten"><span></span></div>
      <div class="rp-scroll" id="rp-scroll">
        <div class="rp-head">
          <div class="rp-title"><h2>Route planen</h2><p class="hint" id="rp-sub"></p></div>
          <div class="rp-hbtn">
            <button class="btn" id="rp-add" aria-pressed="true" title="Tippen in die Karte setzt Punkte">＋ Punkt</button>
            <button class="btn" id="rp-rev" title="Reihenfolge umdrehen und neu routen" aria-label="Route umkehren">⇄</button>
            <button class="btn rp-x" id="pl-close" aria-label="Planer schliessen">✕</button>
          </div>
        </div>
        <div class="rp-mini" id="rp-mini" aria-live="off"></div>
        <div class="chips rp-sports" id="rp-sports" role="radiogroup" aria-label="Sportart"></div>
        <div class="rp-opts" id="rp-opts"></div>
        <div class="rp-consent" id="rp-consent" hidden></div>
        <ol class="rp-vias" id="rp-vias" aria-label="Wegpunkte"></ol>
        <div class="row rp-tools">
          <button class="btn" id="rp-loop">Rundtour</button>
          <button class="btn" id="rp-undo">Rückgängig</button>
          <button class="btn" id="rp-new">Neu</button>
        </div>
        <div class="rp-status" id="rp-status" role="status" aria-live="polite"></div>
        <div class="rp-kpis" id="rp-kpis"></div>
        <div class="row rp-when" id="rp-when" hidden></div>
        <div class="rp-var" id="rp-var" hidden></div>
        <div class="rp-winter" id="rp-winter" hidden></div>
        <div class="rp-ana" id="rp-ana" hidden>
          <div class="rp-tabs" id="rp-tabs" role="tablist" aria-label="Analyse"></div>
          <div class="rp-chart" id="rp-chart" tabindex="0" role="slider" aria-label="Höhenprofil: Position auf der Route (Pfeiltasten)" aria-valuemin="0">
            <svg id="rp-svg" aria-hidden="true"></svg>
            <div class="rp-flag" id="rp-flag" hidden></div>
          </div>
          <div class="rp-info" id="rp-info"></div>
          <div class="rp-legend" id="rp-legend"></div>
        </div>
        <div class="rp-int" id="rp-int" hidden></div>
        <div class="rp-arr" id="rp-arr"></div>
        <div class="rp-wx" id="rp-wx"></div>
        <div class="row rp-save" id="rp-saverow" hidden>
          <input type="text" id="pl-name" placeholder="Name der Route" aria-label="Name der Route">
          <button class="btn" id="pl-save">Speichern</button>
          <button class="btn primary" id="pl-gpx">GPX</button>
        </div>
        <p class="hint" id="pl-msg" role="status"></p>
        <details class="rp-src" id="rp-srcbox"><summary>Herkunft, Methode, Annahmen</summary><div id="rp-src"></div></details>
        <div class="sr-only" id="rp-live" aria-live="polite"></div>
      </div>`;
  }

  function init(ctx) {
    C = ctx; RT = window.RT; FK = window.FK; map = ctx.map;
    skeleton();
    ST.sport = S.get("sport", "rennrad");
    if (!RT.SPORTS[ST.sport]) ST.sport = "rennrad";
    ST.opts = S.get("opts", {});
    loadEffort();
    ST.startUnix = defaultStart();
    bind();
    renderSports(); renderOpts(); renderVias(); renderAll();
    if (map) { if (map.loaded()) layers(); else map.once("load", layers); }
    window.addEventListener("resize", () => { if (route) drawChart(); applySheet(); });
  }
  function defaultStart() {
    const now = Date.now() / 1000, p = FK.zurichParts(now);
    if (p.hh >= 6 && p.hh < 18) return Math.ceil(now / 3600) * 3600;
    const tomorrow = FK.addDays(p.date, p.hh >= 18 ? 1 : 0);
    return FK.zurichToUnix(tomorrow, "09:00");
  }
  function loadEffort() {
    const all = S.get("effort", {}), def = sportDef(), mine = all[ST.sport] || {};
    ST.effortMode = mine.mode && def.modi.includes(mine.mode) ? mine.mode : def.modi[0];
    ST.effortValue = isNum(mine[ST.effortMode]) ? mine[ST.effortMode] : defaultValue(ST.effortMode);
  }
  function defaultValue(mode) {
    const K = kal(), def = sportDef();
    if (mode === "hf") {
      const k = def.art === "rad" ? K.rad_hf_w : def.art === "ski" ? K.skitour_hf_vam : ST.sport === "wandern" ? K.wandern_hf_vam : K.lauf_hf_pace;
      if (k && k.ok && k.x_bereich) return Math.round((k.x_bereich[0] + k.x_bereich[1]) / 2);
    }
    if (mode === "hmh") { const k = def.art === "ski" ? K.skitour_vam : K.wandern_vam; if (k && k.ok) return Math.round(k.median / 10) * 10; }
    return def.wert[mode];
  }
  function saveEffort() {
    const all = S.get("effort", {});
    all[ST.sport] = Object.assign({}, all[ST.sport] || {}, { mode: ST.effortMode, [ST.effortMode]: ST.effortValue });
    S.set("effort", all);
  }
  const kal = () => (C.D && C.D.kalibrierung) || {};

  /* ---------------- Karte: Ebenen ---------------- */
  function layers() {
    if (!map || map.getSource("rt")) return;
    const E = { type: "FeatureCollection", features: [] };
    map.addSource("rt", { type: "geojson", data: E, lineMetrics: false });
    map.addSource("rt-draft", { type: "geojson", data: E });
    map.addSource("rt-cur", { type: "geojson", data: E });
    map.addSource("rt-wind", { type: "geojson", data: E });
    // Richtungspfeile als kleines Bild (keine Schrift nötig)
    const cv = document.createElement("canvas"); cv.width = cv.height = 24;
    const g = cv.getContext("2d"); g.fillStyle = "#ffffff"; g.strokeStyle = "rgba(31,51,71,.85)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(5, 5); g.lineTo(19, 12); g.lineTo(5, 19); g.lineTo(9, 12); g.closePath(); g.stroke(); g.fill();
    map.addImage("rt-arrow", { width: 24, height: 24, data: g.getImageData(0, 0, 24, 24).data }, { pixelRatio: 2 });
    // Windpfeil: zeigt nach oben (Norden) und wird um die Richtung gedreht, WOHIN der Wind weht
    const wv = document.createElement("canvas"); wv.width = wv.height = 48;
    const wg = wv.getContext("2d"); wg.fillStyle = "#1f4e79"; wg.strokeStyle = "#ffffff"; wg.lineWidth = 3; wg.lineJoin = "round";
    wg.beginPath(); wg.moveTo(24, 4); wg.lineTo(38, 22); wg.lineTo(29, 22); wg.lineTo(29, 44); wg.lineTo(19, 44); wg.lineTo(19, 22); wg.lineTo(10, 22); wg.closePath(); wg.stroke(); wg.fill();
    map.addImage("rt-wind", { width: 48, height: 48, data: wg.getImageData(0, 0, 48, 48).data }, { pixelRatio: 2 });
    const lay = { "line-join": "round", "line-cap": "round" };
    map.addLayer({ id: "rt-draft", type: "line", source: "rt-draft", layout: lay, paint: { "line-color": "#d9694a", "line-width": 3, "line-dasharray": [1.5, 1.5] } });
    map.addLayer({ id: "rt-case", type: "line", source: "rt", layout: lay, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.95 } });
    map.addLayer({ id: "rt-selcase", type: "line", source: "rt", layout: lay, filter: ["==", ["get", "sel"], 1], paint: { "line-color": "#14222e", "line-width": 11 } });
    map.addLayer({ id: "rt-line", type: "line", source: "rt", layout: lay,
      paint: { "line-color": ["get", "color"], "line-width": ["case", ["==", ["get", "sel"], 1], 6.5, 5], "line-opacity": ["case", ["==", ["get", "dim"], 1], 0.28, 1] } });
    map.addLayer({ id: "rt-arrows", type: "symbol", source: "rt", layout: { "symbol-placement": "line", "symbol-spacing": 90, "icon-image": "rt-arrow", "icon-size": 0.9, "icon-allow-overlap": true, "icon-ignore-placement": true } });
    // Nur Bild, keine Schrift: der Kartenstil hat keine Glyphen (eine Textebene würde von MapLibre verworfen)
    map.addLayer({ id: "rt-wind", type: "symbol", source: "rt-wind", layout: { "icon-image": "rt-wind", "icon-rotate": ["get", "rot"], "icon-rotation-alignment": "map",
      "icon-size": ["interpolate", ["linear"], ["get", "kmh"], 0, 0.55, 30, 1.1], "icon-allow-overlap": true, "icon-ignore-placement": true } });
    map.addLayer({ id: "rt-hit", type: "line", source: "rt", layout: lay, paint: { "line-color": "#000", "line-width": 26, "line-opacity": 0.001 } });
    map.addLayer({ id: "rt-cur-halo", type: "circle", source: "rt-cur", paint: { "circle-radius": 16, "circle-color": "#d9694a", "circle-opacity": 0.18 } });
    map.addLayer({ id: "rt-cur", type: "circle", source: "rt-cur", paint: { "circle-radius": 8, "circle-color": "#ffffff", "circle-stroke-color": "#d9694a", "circle-stroke-width": 4 } });
    map.addLayer({ id: "rt-cur-hit", type: "circle", source: "rt-cur", paint: { "circle-radius": 26, "circle-opacity": 0.001 } });
    // Cursor ziehen (Finger oder Maus): Karte schiebt nicht, Punkt gleitet entlang der echten Linie
    const startDrag = (e) => { if (!route) return; e.preventDefault(); dragCursor = true; map.getCanvas().style.cursor = "grabbing"; };
    map.on("touchstart", "rt-cur-hit", startDrag);
    map.on("mousedown", "rt-cur-hit", startDrag);
    const moveDrag = (e) => { if (!dragCursor || !route) return; const p = RT.project(route, e.lngLat.lng, e.lngLat.lat, { near_d: ST.cursorDistance_m }); if (p) setCursor(p.d, "karte"); };
    map.on("touchmove", moveDrag); map.on("mousemove", moveDrag);
    const endDrag = () => { if (dragCursor) { dragCursor = false; map.getCanvas().style.cursor = ""; } };
    map.on("touchend", endDrag); map.on("mouseup", endDrag); map.on("touchcancel", endDrag);
    // Maus über der Route (Desktop): Profil folgt
    map.on("mousemove", "rt-hit", (e) => { if (!active() || dragCursor || !route) return; const p = RT.project(route, e.lngLat.lng, e.lngLat.lat, { near_d: ST.cursorDistance_m }); if (p) setCursor(p.d, "hover"); });
    map.on("mouseenter", "rt-hit", () => { if (active()) map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "rt-hit", () => { if (active()) map.getCanvas().style.cursor = ST.addMode ? "crosshair" : ""; });
    renderMap();
  }

  /** Windpfeile entlang der Route zur geschätzten Durchfahrtszeit (Pausen an Wegpunkten eingerechnet). */
  function windArrowsNow() {
    if (!route || !field || !wpts || !sim || sim.unzureichend) return [];
    const P = route.profile, pl = pausenList(), tAt = (dd) => { const k = Math.min(P.n, Math.round(dd / P.step)); return ST.startUnix + sim.t[k] + RT.pauseBefore(pl, dd); };
    return RT.windArrows(RT.windPositions(route), field, tAt);
  }
  function renderMap() {
    if (!map || !map.getSource("rt")) return;
    const feats = [];
    if (route && pieces.length) {
      const cats = (TABS[ST.activeAnalysisTab].cats || (() => ({})))();
      const anySel = ST.selectedSegmentIds.size > 0;
      for (const p of pieces) {
        const sel = ST.selectedSegmentIds.has(p.id) ? 1 : 0;
        const color = p.color || (cats[p.cat] || UNK).color;
        feats.push({ type: "Feature", properties: { id: p.id, cat: p.cat, color, sel, dim: anySel && !sel ? 1 : 0 }, geometry: { type: "LineString", coordinates: RT.slice(route, p.d0, p.d1) } });
      }
    }
    map.getSource("rt").setData({ type: "FeatureCollection", features: feats });
    // Windpfeile nur in der Wind-Ansicht und mit Prognose: Herkunft (meteorologisch) im Text, Pfeil = Richtung des Windvektors
    const wf = ST.activeAnalysisTab === "wind" ? windArrowsNow().map((a) => ({ type: "Feature", properties: { rot: a.rot, kmh: a.speed * 3.6 }, geometry: { type: "Point", coordinates: [a.lon, a.lat] } })) : [];
    if (map.getSource("rt-wind")) map.getSource("rt-wind").setData({ type: "FeatureCollection", features: wf });
    const draft = !route && ST.vias.length > 1 && (drawn() || ST.error) ? ST.vias : null;
    map.getSource("rt-draft").setData(draft && drawn() ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: draft } } : { type: "FeatureCollection", features: [] });
    renderMarkers();
    renderCursorMap();
  }

  function viaLabel(i, n) { return i === 0 ? "A" : i === n - 1 && n > 1 ? "B" : String(i); }
  function renderMarkers() {
    if (!map || !window.maplibregl) return;
    markers.forEach((m) => m.remove()); markers = [];
    ST.vias.forEach((p, i) => {
      const el = document.createElement("div");
      const n = ST.vias.length, lab = viaLabel(i, n);
      el.className = "rp-pin" + (i === 0 ? " a" : i === n - 1 && n > 1 ? " b" : "");
      el.textContent = lab;
      el.setAttribute("role", "img"); el.setAttribute("aria-label", i === 0 ? "Start" : i === n - 1 ? "Ziel" : "Zwischenziel " + i);
      const m = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(p).addTo(map);
      m.on("dragend", () => { const ll = m.getLngLat(); const v = ST.vias.slice(); v[i] = [+ll.lng.toFixed(6), +ll.lat.toFixed(6)]; setVias(v, "verschoben"); });
      el.addEventListener("click", (ev) => { ev.stopPropagation(); });
      markers.push(m);
    });
  }
  function renderCursorMap() {
    if (!map || !map.getSource("rt-cur")) return;
    const d = ST.cursorDistance_m;
    if (!route || d == null) { map.getSource("rt-cur").setData({ type: "FeatureCollection", features: [] }); return; }
    const a = RT.at(route, d);
    map.getSource("rt-cur").setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [a.lon, a.lat] } });
  }

  /* ---------------- Interaktion Karte ---------------- */
  function mapClick(e) {
    if (!active()) return false;
    // Route antippen = Position im Profil (immer, auch im Punkt-Modus); daneben tippen = Punkt setzen (im Punkt-Modus)
    if (route) {
      const f = map.queryRenderedFeatures([[e.point.x - 14, e.point.y - 14], [e.point.x + 14, e.point.y + 14]], { layers: ["rt-hit"] });
      if (f.length) { const p = RT.project(route, e.lngLat.lng, e.lngLat.lat, { near_d: ST.cursorDistance_m }); if (p) { setCursor(p.d, "karte"); return true; } }
    }
    if (ST.addMode || ST.vias.length < 2) { addPoint([+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]); return true; }
    if (route) setCursor(null, "karte");
    return true;
  }
  function addPoint(ll) {
    const v = ST.vias.slice(); v.push(ll);
    // nach dem zweiten Punkt (erste Route) zum Ansehen umschalten; weitere Punkte mit «＋ Punkt»
    if (v.length === 2 && ST.addMode) setAddMode(false);
    setVias(v, "Punkt gesetzt", { fit: v.length === 2 });
  }
  function setAddMode(on) {
    ST.addMode = on;
    $("rp-add").setAttribute("aria-pressed", String(on));
    $("rp-add").textContent = on ? "＋ Punkt: tippen" : "＋ Punkt";
    $("rp-add").classList.toggle("on", on);
    if (map) map.getCanvas().style.cursor = on ? "crosshair" : "";
    renderSub();
  }
  function setVias(v, why, opt) {
    history.push(ST.vias.slice()); if (history.length > 40) history.shift();
    ST.vias = v;
    ST.names = (ST.names || []).slice(0, v.length);
    if (!opt || !opt.keepCursor) ST.cursorDistance_m = null;
    clearSel(true);
    renderVias();
    reroute(opt && opt.fit);
  }

  /* ---------------- Routing ---------------- */
  async function reroute(fit) {
    const my = ++job;
    ST.error = null; ST.legsOk = null;
    route = null; sim = null; climbs = null; pieces = []; field = null; ST.wetter = { status: consent().wetter ? "warte" : "aus", msg: "" };
    if (ST.vias.length < 2) { ST.busy = false; renderAll(); return; }
    if (drawn()) { await buildDrawnRoute(my); return; }
    const c = consent();
    if (!c.routing) { ST.busy = false; showConsent(); renderAll(); return; }
    const eng = ST.variant && RT.VARIANTEN[ST.sport] ? RT.engineVariant(ST.sport, ST.opts, ST.variant) : RT.engineFor(ST.sport, ST.opts);
    const ep = S.get("endpoint", RT.ENDPOINT);
    ST.busy = true; renderStatus(`Route wird berechnet … (${ST.vias.length - 1} Abschnitt${ST.vias.length > 2 ? "e" : ""}, ${esc(sportDef().label)})`);
    const legs = Array.from({ length: ST.vias.length - 1 }, () => null);
    const errs = [];
    await Promise.all(legs.map(async (_, i) => {
      const key = [ep, eng.engine, JSON.stringify(eng.params), ST.vias[i].join(","), ST.vias[i + 1].join(",")].join("|");
      try {
        if (!CACHE.has(key)) CACHE.set(key, RT.fetchLeg(window.fetch.bind(window), ep, eng, ST.vias[i], ST.vias[i + 1]));
        legs[i] = await CACHE.get(key);
      } catch (e) { CACHE.delete(key); errs.push({ i, e }); }
    }));
    if (my !== job) return;
    ST.busy = false;
    if (errs.length) {
      errs.sort((a, b) => a.i - b.i);
      const e0 = errs[0];
      ST.error = { abschnitt: e0.i, text: e0.e.message, detail: e0.e.detail || "", kind: e0.e.kind || "" , n: errs.length };
      ST.legsOk = legs.map((l) => !!l);
      renderAll();
      return;
    }
    try {
      route = RT.buildRoute(legs, ST.vias, { sport: ST.sport, engine: eng.engine, prov: { endpoint: ep.replace(/^https?:\/\//, ""), abgerufen: new Date().toISOString() } });
    } catch (e) { ST.error = { text: "Antwort konnte nicht verarbeitet werden.", detail: String(e.message || e) }; renderAll(); return; }
    if (route.unvollstaendig) { ST.error = { text: `Ein Zwischenziel liegt neben dem Wegnetz (Sprung ${fmt(route.gapMax)} m). Punkt näher an einen Weg setzen.` }; route = null; renderAll(); return; }
    const far = route.vias.findIndex((v) => v.snap_m > SNAP_ERR);
    if (far >= 0) {
      ST.error = { abschnitt: Math.max(0, far - 1), punkt: far, text: `Punkt ${viaLabel(far, ST.vias.length)} liegt ${km(route.vias[far].snap_m)} km vom nächsten erlaubten Weg entfernt. Punkt näher an einen Weg setzen.` };
      route = null; renderAll(); return;
    }
    ST.activeRouteId = route.id;
    afterRoute(fit === true);
  }
  async function buildDrawnRoute(my) {
    ST.busy = true; renderStatus("Höhen für die gezeichnete Linie werden geladen …");
    const dense = C.densifyLL(ST.vias, 20);
    let ele = null;
    try { ele = await C.elevations(dense); } catch (e) { ele = null; }
    if (my !== job) return;
    ST.busy = false;
    const ok = ele && ele.filter((v) => v != null).length > dense.length * 0.8;
    route = RT.buildDrawn(dense, ok ? ele : null, { sport: ST.sport });
    if (!ok) route.hoehe_fehlt = true;
    ST.activeRouteId = route.id;
    afterRoute(false);
  }
  function afterRoute(fit) {
    if (innerWidth <= 760 && ST.sheet === "min" && isOpen) { ST.sheet = "half"; applySheet(); }
    climbs = RT.climbs(route);
    recomputeSim();
    buildPieces();
    renderAll();
    if (fit) fitRoute();
    maybeWeather();
  }
  function recomputeSim() {
    if (!route) { sim = null; return; }
    const inp = effortInput();
    sim = field ? RT.etaWithWeather(route, inp, field) : RT.eta(route, inp);
  }
  function effortInput() {
    const B = RT.RAD[sportDef().rad || "rennrad"];
    const rad = S.get("rad", {});
    const w = C.weights ? C.weights() : [];
    const rider = isNum(rad.fahrer) ? rad.fahrer : (w.length ? w[w.length - 1].kg : 75);
    const bikeKg = isNum(rad["kg_" + sportDef().rad]) ? rad["kg_" + sportDef().rad] : B.kg;
    const cda = isNum(rad["cda_" + sportDef().rad]) ? rad["cda_" + sportDef().rad] : B.cda;
    return { mode: ST.effortMode, value: ST.effortValue, kal: kal(), start_unix: ST.startUnix, rad: { m: rider + bikeKg, cda, rider, bikeKg }, korrektur: S.get("korrektur", true), pausen: pausenList() };
  }
  function buildPieces() {
    const tab = ST.activeAnalysisTab;
    if (!route) { pieces = []; stats = []; return; }
    if (tab === "anstiege") {
      pieces = [];
      let last = 0;
      const all = climbs.up.map((c) => ({ ...c, kind: "up" })).concat(climbs.down.map((c) => ({ ...c, kind: "down" }))).sort((a, b) => a.d0 - b.d0);
      for (const c of all) {
        if (c.d0 > last) pieces.push({ id: "f" + pieces.length, d0: last, d1: c.d0, cat: "flach", color: "#b9c3cc" });
        pieces.push({ id: c.id, d0: c.d0, d1: c.d1, cat: c.kind, color: c.kind === "up" ? "#d9694a" : "#3d7fb3" });
        last = c.d1;
      }
      if (last < route.L) pieces.push({ id: "f" + pieces.length, d0: last, d1: route.L, cat: "flach", color: "#b9c3cc" });
      stats = [];
      return;
    }
    if (TABS[tab].netz && route.gezeichnet) { pieces = [{ id: tab + ":0", d0: 0, d1: route.L, cat: "unbekannt" }]; stats = RT.stats(pieces, route.L); return; }
    pieces = RT.pieces(route, tab, catOfStep(tab));
    stats = RT.stats(pieces, route.L);
  }

  /* ---------------- Auswahl (ein Modell für Karte, Profil, Listen) ---------------- */
  function clearSel(silent) {
    const had = ST.selectedSegmentIds.size > 0;
    ST.selectedSegmentIds = new Set(); ST.selectedCat = null; ST.selectedClimb = null;
    if (!silent) { renderMap(); drawChart(); renderLegend(); if (had) live("Auswahl aufgehoben."); }
  }
  function selectCat(cat) {
    if (ST.selectedCat === cat) { clearSel(); return; }
    ST.selectedCat = cat; ST.selectedClimb = null;
    ST.selectedSegmentIds = new Set(pieces.filter((p) => p.cat === cat).map((p) => p.id));
    renderMap(); drawChart(); renderLegend();
    const st = stats.find((s) => s.cat === cat), defs = (TABS[ST.activeAnalysisTab].cats || (() => ({})))();
    live(`${(defs[cat] || UNK).label}: ${ST.selectedSegmentIds.size} Abschnitt${ST.selectedSegmentIds.size === 1 ? "" : "e"}, ${st ? km(st.len) + " km, " + fmt(st.pct, 0) + " %" : ""} hervorgehoben.`);
  }
  function selectClimb(id, zoom) {
    if (ST.selectedClimb === id) { clearSel(); return; }
    const c = climbs.up.concat(climbs.down).find((x) => x.id === id); if (!c) return;
    ST.selectedClimb = id; ST.selectedCat = null; ST.selectedSegmentIds = new Set([id]);
    renderMap(); drawChart(); renderLegend();
    setCursor(c.d0, "liste");
    if (zoom !== false) fitCoords(RT.slice(route, c.d0, c.d1));
    live(`${c.id[0] === "a" ? "Anstieg" : "Abfahrt"} km ${km(c.d0)} bis ${km(c.d1)}, ${fmt(c.hm)} Höhenmeter, Mittel ${fmt(c.mittel * 100, 1)} %.`);
  }

  /* ---------------- Cursor ---------------- */
  function setCursor(d, src) {
    ST.cursorDistance_m = d == null || !route ? null : Math.max(0, Math.min(route.L, d));
    renderCursorMap(); drawCursor(); renderInfo();
    if (src === "taste") live(infoText(true));
  }
  function infoAt(d) {
    const a = RT.at(route, d), P = route.profile, k = Math.min(P.n - 1, Math.max(0, a.k));
    const s = a.seg;
    const o = { d, ele: a.ele, grade: a.grade, surf: s ? RT.SURFACE[s.surface].label : "–", way: s ? RT.WAY[s.way].label : "–", acc: s ? s.access : null, accNote: s ? s.accessNote : "",
      sac: s && s.sac, mtb: s && s.mtb, k };
    if (sim && !sim.unzureichend) {
      const t = sim.t[k] + (sim.t[k + 1] - sim.t[k]) * Math.max(0, Math.min(1, (d - P.d[k]) / ((P.d[k + 1] - P.d[k]) || 1)));
      o.t = t; o.v = sim.v[k];
      o.band = sim.band ? [t * sim.band[0] / sim.moving_s, t * sim.band[1] / sim.moving_s] : null;
    }
    if (field && isNum(o.t)) o.wx = field(d, ST.startUnix + o.t, P.head[k]);
    return o;
  }
  function infoText(short) {
    if (!route || ST.cursorDistance_m == null) return "";
    const o = infoAt(ST.cursorDistance_m);
    const parts = [`km ${km(o.d)}`, `${fmt(o.ele)} m ü. M.`, `${o.grade >= 0 ? "↗" : "↘"} ${fmt(o.grade * 100, 1)} %`];
    if (!route.gezeichnet) parts.push(o.surf, o.way);
    if (isNum(o.t)) parts.push(`Ankunft ${clock(ST.startUnix + o.t)}`);
    if (o.wx && !short) parts.push(`${fmt(o.wx.temp, 0)} °C`);
    return parts.join(" · ");
  }
  function renderInfo() {
    const box = $("rp-info"); if (!box) return;
    if (!route || ST.cursorDistance_m == null) { box.innerHTML = `<span class="hint">${route ? "Profil berühren oder ziehen, Route in der Karte antippen." : ""}</span>`; return; }
    const o = infoAt(ST.cursorDistance_m);
    const accTxt = o.acc && o.acc !== "ok" ? `<span class="rp-acc ${o.acc}">${esc(RT.ACCESS[o.acc].label)}${o.accNote ? ": " + esc(o.accNote) : ""}</span>` : "";
    const diff = [o.sac ? "SAC " + o.sac : "", o.mtb ? "MTB " + o.mtb : ""].filter(Boolean).join(" · ");
    const wx = o.wx ? `<span>${tempKurz(o.wx)} · ${regenKurz(o.wx)} · ${windKurz(o.wx)}${isNum(o.wx.along) && isNum(o.wx.dirFrom) ? ` (${o.wx.along < -1.4 ? "Gegenwind " + fmt(-o.wx.along * 3.6) : o.wx.along > 1.4 ? "Rückenwind " + fmt(o.wx.along * 3.6) : "seitlich"}${Math.abs(o.wx.along) > 1.4 ? " km/h" : ""})` : ""}</span>` : "";
    const bandTxt = o.band && clock(ST.startUnix + o.band[0]) !== clock(ST.startUnix + o.band[1]) ? ` (${clock(ST.startUnix + o.band[0])}–${clock(ST.startUnix + o.band[1])})` : "";
    const eta = isNum(o.t) ? `<span>Ankunft <b>${clock(ST.startUnix + o.t)}</b>${bandTxt} · ${speedTxt(o.v)}</span>` : "";
    box.innerHTML = `<div class="rp-info-main"><b>km ${km(o.d)}</b> · ${fmt(o.ele)} m · ${o.grade >= 0 ? "↗" : "↘"} ${fmt(o.grade * 100, 1)} %${route.gezeichnet ? "" : ` · ${esc(o.surf)} · ${esc(o.way)}`}${diff ? " · " + esc(diff) : ""}</div>
      <div class="rp-info-sub">${eta}${wx}${accTxt}</div>
      ${route.gezeichnet ? "" : `<button class="btn rp-insert" id="rp-insert">＋ Zwischenziel hier</button>`}`;
    const ins = $("rp-insert"); if (ins) ins.onclick = () => insertViaAt(ST.cursorDistance_m);
  }
  const DIRS = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  const dirName = (deg) => DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  function speedTxt(v) {
    if (!isNum(v)) return "";
    if (sportDef().art === "rad" || ST.sport === "wandern" || ST.sport === "skitour") return `${fmt(v * 3.6, 1)} km/h`;
    return `${FK.pace(1000 / v)} /km`;
  }
  function insertViaAt(d) {
    if (!route) return;
    const a = RT.at(route, d);
    let i = 1; while (i < route.vias.length && route.vias[i].d < d) i++;
    const v = ST.vias.slice(); v.splice(i, 0, [+a.lon.toFixed(6), +a.lat.toFixed(6)]);
    setVias(v, "Zwischenziel eingefügt", { fit: false });
  }

  /* ---------------- Profil (SVG) ---------------- */
  let geo = null;      // Massstab des letzten Zeichnens
  function drawChart() {
    const svg = $("rp-svg"), box = $("rp-chart");
    if (!svg || !route || box.offsetParent === null) return;
    const ov = overlaySeries();
    box.classList.toggle("with-ov", !!ov);
    const W = Math.max(240, box.clientWidth), H = box.clientHeight || 190;
    const ovH = ov ? 62 : 0, gap = ov ? 20 : 0;            // eigener Streifen unter dem Höhenprofil, gleiche km-Achse
    const pl = 40, pr = 10, pt = 14, pb = 22, w = W - pl - pr, h = H - pt - pb - ovH - gap;
    const P = route.profile, L = route.L;
    let e0 = P.min, e1 = P.max;
    const pad = Math.max(10, (e1 - e0) * 0.12); e0 = Math.floor((e0 - pad) / 10) * 10; e1 = Math.ceil((e1 + pad) / 10) * 10;
    const X = (d) => pl + (d / L) * w, Y = (e) => pt + (1 - (e - e0) / (e1 - e0)) * h;
    geo = { X, Y, pl, pt, w, h, W, H, L };
    const stride = Math.max(1, Math.floor(P.n / (w * 1.5)));
    const ptsBetween = (d0, d1) => {
      const k0 = Math.ceil(d0 / P.step), k1 = Math.floor(d1 / P.step), out = [[d0, RT.at(route, d0).ele]];
      for (let k = k0; k <= k1; k += (k1 - k0 > 2 * stride ? stride : 1)) out.push([P.d[k], P.ele[k]]);
      out.push([d1, RT.at(route, d1).ele]);
      return out;
    };
    const area = (d0, d1) => { const p = ptsBetween(d0, d1); return `M${X(d0).toFixed(1)},${Y(e0).toFixed(1)} ` + p.map(([d, e]) => `L${X(d).toFixed(1)},${Y(e).toFixed(1)}`).join(" ") + ` L${X(d1).toFixed(1)},${Y(e0).toFixed(1)} Z`; };
    const line = (d0, d1) => ptsBetween(d0, d1).map(([d, e], i) => `${i ? "L" : "M"}${X(d).toFixed(1)},${Y(e).toFixed(1)}`).join(" ");
    const cats = (TABS[ST.activeAnalysisTab].cats || (() => ({})))();
    const anySel = ST.selectedSegmentIds.size > 0;
    let s = "";
    // Gitter und Achsen
    const yt = niceTicks(e0, e1, 4);
    for (const v of yt) s += `<line x1="${pl}" x2="${pl + w}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="g"/><text x="${pl - 6}" y="${(Y(v) + 3.5).toFixed(1)}" class="ya">${fmt(v)}</text>`;
    const xt = niceTicks(0, L / 1000, Math.max(3, Math.round(w / 90)));
    for (const v of xt) if (v * 1000 <= L + 1 && X(v * 1000) < pl + w - 26) s += `<text x="${X(v * 1000).toFixed(1)}" y="${H - 6}" class="xa">${fmt(v, v % 1 ? 1 : 0)}</text>`;
    s += `<text x="${pl + w}" y="${H - 6}" class="xa end">km</text>`;
    // Flächen je Kategorie
    for (const p of pieces) {
      if (p.d1 - p.d0 < 0.5) continue;
      const color = p.color || (cats[p.cat] || UNK).color, sel = ST.selectedSegmentIds.has(p.id);
      s += `<path d="${area(p.d0, p.d1)}" fill="${color}" fill-opacity="${anySel ? (sel ? 0.95 : 0.14) : 0.62}" stroke="none"/>`;
    }
    s += `<path d="${line(0, L)}" class="el"/>`;
    for (const p of pieces) if (ST.selectedSegmentIds.has(p.id)) s += `<path d="${line(p.d0, p.d1)}" class="sel"/><line x1="${X(p.d0).toFixed(1)}" x2="${X(p.d0).toFixed(1)}" y1="${pt}" y2="${pt + h}" class="selb"/><line x1="${X(p.d1).toFixed(1)}" x2="${X(p.d1).toFixed(1)}" y1="${pt}" y2="${pt + h}" class="selb"/>`;
    // Wetter bzw. Tempo im eigenen Streifen mit eigener Skala (nie über der Höhenachse)
    if (ov) {
      const o0 = pt + h + gap, v0 = ov.min, v1 = ov.max === ov.min ? ov.min + 1 : ov.max, Yo = (v) => o0 + (1 - (v - v0) / (v1 - v0)) * ovH;
      s += `<rect x="${pl}" y="${o0}" width="${w}" height="${ovH}" class="ovbg"/><text x="${pl}" y="${o0 - 5}" class="ova">${esc(ov.label)}</text>`;
      if (ov.trocken) s += `<text x="${pl + w / 2}" y="${o0 + ovH / 2 + 4}" class="ovt">trocken – 0 mm/h entlang der Route (Prognose)</text>`;
      else {
        for (const v of ov.ticks || niceTicks(v0, v1, 2)) s += `<line x1="${pl}" x2="${pl + w}" y1="${Yo(v).toFixed(1)}" y2="${Yo(v).toFixed(1)}" class="${v === 0 ? "g0" : "g"}"/><text x="${pl - 6}" y="${(Yo(v) + 3.5).toFixed(1)}" class="ya">${fmt(v)}</text>`;
        if (ov.bars) for (const b of ov.pts) s += `<rect x="${X(b[0]).toFixed(1)}" y="${Yo(Math.max(0, b[1])).toFixed(1)}" width="${Math.max(1, (X(b[2]) - X(b[0]))).toFixed(1)}" height="${Math.abs(Yo(b[1]) - Yo(0)).toFixed(1)}" fill="${b[3] || "#4a7fc1"}" opacity=".85"/>`;
        else { let pen = false; s += `<path d="${ov.pts.map((q) => { if (!isNum(q[1])) { pen = false; return ""; } const c = `${pen ? "L" : "M"}${X(q[0]).toFixed(1)},${Yo(q[1]).toFixed(1)}`; pen = true; return c; }).join(" ")}" class="ov"/>`; }
      }
    }
    // Zwischenziele
    route.vias.forEach((v, i) => { const x = X(v.d); s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${pt}" y2="${pt + h}" class="via"/><circle cx="${x.toFixed(1)}" cy="${pt + h}" r="7" class="viac"/><text x="${x.toFixed(1)}" y="${(pt + h + 3.5).toFixed(1)}" class="vial">${viaLabel(i, route.vias.length)}</text>`; });
    s += `<g id="rp-cur" class="cur" visibility="hidden"><line y1="${pt}" y2="${pt + h + gap + ovH}"/><circle r="5"/></g>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.innerHTML = s;
    box.setAttribute("aria-valuemax", String(Math.round(L)));
    drawCursor();
  }
  function overlaySeries() {
    const tab = ST.activeAnalysisTab, P = route.profile;
    if (!sim || sim.unzureichend) return null;
    const N = Math.min(P.n, 300), step = P.n / N, out = [];
    if (tab === "tempo") {
      for (let i = 0; i < N; i++) { const k = Math.floor(i * step); out.push([P.d[k], sportDef().art === "rad" || ST.sport === "wandern" || ST.sport === "skitour" ? sim.v[k] * 3.6 : sim.v[k] * 3.6]); }
      const vs = out.map((q) => q[1]).filter(isNum);
      return vs.length ? { pts: out.filter((q) => isNum(q[1])), min: 0, max: Math.max(...vs) * 1.05, label: "Tempo (km/h)" } : null;
    }
    if (!field || !TABS[tab].wetter) return null;
    let unbekannt = 0;
    for (let i = 0; i < N; i++) {
      const k = Math.floor(i * step), w = wxAt(k); if (!w) { unbekannt++; continue; }
      if (tab === "temp") { if (!isNum(w.temp)) unbekannt++; out.push([P.d[k], isNum(w.temp) ? w.temp : null]); }
      else if (tab === "regen") { if (isNum(w.regen)) out.push([P.d[k], w.regen, P.d[Math.min(P.n, Math.floor((i + 1) * step))], "#4a7fc1"]); else unbekannt++; }
      else if (tab === "wind") { if (isNum(w.along)) { const a = w.along * 3.6; out.push([P.d[k], a, P.d[Math.min(P.n, Math.floor((i + 1) * step))], a < 0 ? "#d9694a" : "#3d7fb3"]); } else unbekannt++; }
    }
    const lueckeTxt = unbekannt ? ` · Lücken = unbekannt (${fmt(100 * unbekannt / N)} %)` : "";
    const vs = out.map((q) => q[1]).filter(isNum);
    if (!vs.length) return null;
    if (tab === "temp") return { pts: out, min: Math.floor(Math.min(...vs) - 1), max: Math.ceil(Math.max(...vs) + 1), label: "Temperatur (°C) zur Durchfahrtszeit" + lueckeTxt };
    if (tab === "regen") return { pts: out, bars: true, min: 0, max: Math.max(1, ...vs), label: "Niederschlag (mm/h) zur Durchfahrtszeit" + lueckeTxt, trocken: !unbekannt && vs.every((v) => !v) };
    const m = Math.max(5, Math.ceil(Math.max(...vs.map(Math.abs)) / 5) * 5);
    return { pts: out, bars: true, min: -m, max: m, ticks: [-m, 0, m], label: "Wind längs (km/h): + Rückenwind, − Gegenwind" + lueckeTxt };
  }
  function niceTicks(a, b, n) {
    const span = b - a; if (span <= 0) return [a];
    const raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag, st = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6));
    return out;
  }
  function drawCursor() {
    const g = document.getElementById("rp-cur"), flag = $("rp-flag"), box = $("rp-chart");
    if (!g || !geo || !route) return;
    const d = ST.cursorDistance_m;
    if (d == null) { g.setAttribute("visibility", "hidden"); flag.hidden = true; box.setAttribute("aria-valuenow", "0"); box.setAttribute("aria-valuetext", "keine Position gewählt"); return; }
    const a = RT.at(route, d), x = geo.X(d), y = geo.Y(a.ele);
    g.setAttribute("visibility", "visible");
    g.querySelector("line").setAttribute("x1", x); g.querySelector("line").setAttribute("x2", x);
    g.querySelector("circle").setAttribute("cx", x); g.querySelector("circle").setAttribute("cy", y);
    flag.hidden = false;
    flag.textContent = `km ${km(d)} · ${fmt(a.ele)} m`;
    const fw = flag.offsetWidth || 110;
    flag.style.left = Math.max(0, Math.min(geo.W - fw, x - fw / 2)) + "px";
    box.setAttribute("aria-valuenow", String(Math.round(d)));
    box.setAttribute("aria-valuetext", infoText(true));
  }
  function chartEvents() {
    const box = $("rp-chart");
    const dAt = (ev) => { const r = box.getBoundingClientRect(); return geo ? ((ev.clientX - r.left - geo.pl) / geo.w) * geo.L : null; };
    let down = false;
    box.addEventListener("pointerdown", (ev) => { if (!route) return; down = true; try { box.setPointerCapture(ev.pointerId); } catch (e) { /* */ } const d = dAt(ev); if (d != null) setCursor(d, "profil"); });
    box.addEventListener("pointermove", (ev) => { if (!route) return; if (down || ev.pointerType === "mouse") { const d = dAt(ev); if (d != null && d >= -10 && d <= route.L + 10) setCursor(d, "profil"); } });
    const up = (ev) => { down = false; try { box.releasePointerCapture(ev.pointerId); } catch (e) { /* */ } };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("keydown", (ev) => {
      if (!route) return;
      const d = ST.cursorDistance_m == null ? 0 : ST.cursorDistance_m;
      const step = { ArrowRight: 100, ArrowLeft: -100, ArrowUp: 100, ArrowDown: -100, PageUp: 1000, PageDown: -1000 }[ev.key];
      if (step != null) { ev.preventDefault(); setCursor(d + step * (ev.shiftKey ? 10 : 1), "taste"); }
      else if (ev.key === "Home") { ev.preventDefault(); setCursor(0, "taste"); }
      else if (ev.key === "End") { ev.preventDefault(); setCursor(route.L, "taste"); }
      else if (ev.key === "Escape") { clearSel(); setCursor(null, "taste"); }
    });
  }

  /* ---------------- Listen und Kennzahlen ---------------- */
  function renderSports() {
    $("rp-sports").innerHTML = Object.entries(RT.SPORTS).map(([k, v]) => `<button class="chip" role="radio" aria-checked="${k === ST.sport}" aria-pressed="${k === ST.sport}" data-s="${k}">${esc(v.label)}</button>`).join("");
  }
  function renderOpts() {
    const def = sportDef(), opts = def.optionen || {};
    const parts = Object.entries(opts).map(([k, o]) => {
      const v = k in ST.opts ? ST.opts[k] : o.standard;
      if (o.werte) return `<label class="rp-opt">${esc(o.label)} <select data-o="${k}">${o.werte.map((w) => `<option value="${w}" ${String(v) === w ? "selected" : ""}>T${w}</option>`).join("")}</select></label>`;
      return `<label class="rp-opt"><input type="checkbox" data-o="${k}" ${v ? "checked" : ""}> ${esc(o.label)}</label>`;
    });
    $("rp-opts").innerHTML = `<p class="hint">${esc(def.text)}</p>${parts.length ? `<div class="row">${parts.join("")}</div>` : ""}`;
  }
  function renderVias() {
    const n = ST.vias.length;
    $("rp-vias").innerHTML = ST.vias.map((p, i) => {
      const lab = viaLabel(i, n), name = (ST.names && ST.names[i]) || (i === 0 ? "Start" : i === n - 1 && n > 1 ? "Ziel" : "Zwischenziel " + i);
      return `<li><span class="rp-pin sm${i === 0 ? " a" : i === n - 1 && n > 1 ? " b" : ""}" aria-hidden="true">${lab}</span>
        <button class="rp-vname" data-z="${i}" title="Auf der Karte zeigen">${esc(name)}<small>${p[1].toFixed(4)}, ${p[0].toFixed(4)}</small></button>
        ${i > 0 && i < n - 1 ? `<label class="rp-pz">Pause <select data-pz="${i}" aria-label="Pause bei ${esc(name)}">${[0, 5, 10, 15, 20, 30, 45, 60, 90].map((m) => `<option value="${m}" ${((ST.pausen || [])[i] || 0) === m ? "selected" : ""}>${m ? m + " min" : "keine"}</option>`).join("")}</select></label>` : ""}
        <span class="rp-vbtn"><button class="btn icon" data-up="${i}" aria-label="${esc(name)} nach oben" ${i === 0 ? "disabled" : ""}>↑</button><button class="btn icon" data-dn="${i}" aria-label="${esc(name)} nach unten" ${i === n - 1 ? "disabled" : ""}>↓</button><button class="btn icon" data-del="${i}" aria-label="${esc(name)} entfernen">✕</button></span></li>`;
    }).join("");
  }
  function renderSub() {
    const n = ST.vias.length;
    $("rp-sub").textContent = drawn() ? (n < 2 ? "Skitour: Linie von Hand zeichnen – Tippen setzt Punkte." : "Von Hand gezeichnet, kein Wegnetz.")
      : ST.addMode ? (n === 0 ? "Tippe in die Karte: Start setzen." : "Tippe in die Karte: neues Ziel anhängen.") : n >= 2 ? "Route antippen oder Profil ziehen. «+ Punkt setzen» für weitere Ziele." : "";
  }
  function renderStatus(busyText) {
    const box = $("rp-status");
    renderMini();
    if (busyText) { box.className = "rp-status busy"; box.innerHTML = `<span class="spin" aria-hidden="true"></span>${busyText}`; return; }
    if (ST.error) {
      const from = ST.error.punkt != null ? "" : ST.error.abschnitt != null ? `${viaLabel(ST.error.abschnitt, ST.vias.length)} → ${viaLabel(ST.error.abschnitt + 1, ST.vias.length)}` : "";
      box.className = "rp-status err";
      box.innerHTML = `<b>Routing nicht möglich${from ? " (Abschnitt " + from + ")" : ""}.</b> ${esc(ST.error.text)} Es wird keine Ersatzlinie gezeichnet.${ST.error.detail ? `<details><summary>Meldung des Dienstes</summary><code>${esc(ST.error.detail)}</code></details>` : ""}
        <div class="row"><button class="btn" id="rp-retry">Erneut versuchen</button></div>`;
      $("rp-retry").onclick = () => reroute(false);
      return;
    }
    if (!route) { box.className = "rp-status"; box.innerHTML = ""; return; }
    const warn = [];
    const st = (tab) => RT.stats(RT.pieces(route, tab), route.L);
    if (!route.gezeichnet) {
      const acc = st("zugang"), surf = st("belag");
      for (const a of acc) if (a.cat !== "ok") warn.push(`${RT.ACCESS[a.cat].label}: ${km(a.len)} km`);
      if (ST.sport === "rennrad") { const un = surf.filter((x) => /kies|natur|unbefestigt/.test(x.cat)).reduce((s, x) => s + x.len, 0); if (un > 0) warn.push(`Rennrad: ${km(un)} km unbefestigt`); }
      const unk = surf.find((x) => x.cat === "unbekannt"); if (unk && unk.pct > 20) warn.push(`Belag zu ${fmt(unk.pct)} % unbekannt`);
      if (route.segs.some((s) => s.way === "autobahn")) warn.push("Autobahn in der Route – bitte melden, sollte nie vorkommen");
      route.vias.forEach((v, i) => { if (v.snap_m > SNAP_WARN) warn.push(`Punkt ${viaLabel(i, route.vias.length)} liegt ${fmt(v.snap_m)} m neben dem Weg (Route beginnt/endet am Weg)`); });
    } else warn.push("Von Hand gezeichnet: kein Wegnetz, keine Zugangsprüfung");
    if (route.hoehe_fehlt) warn.push("Höhendaten fehlen teilweise");
    box.className = "rp-status" + (warn.length ? " warn" : " ok");
    box.innerHTML = warn.length ? `<b>Hinweise:</b> ${warn.map(esc).join(" · ")}` : `Route über laut OSM erlaubte Wege berechnet (${esc(route.prov.routing)}, Profil ${esc(route.engine || "")}). Das hängt von den Kartendaten ab und ist keine rechtliche Garantie.`;
  }
  function renderMini() {
    const box = $("rp-mini"); if (!box) return;
    if (ST.busy) { box.innerHTML = `<span class="spin" aria-hidden="true"></span>Route wird berechnet …`; return; }
    if (ST.error) { box.innerHTML = `<span class="bad-t">Routing nicht möglich – Details unten</span>`; return; }
    if (!route) { box.textContent = ""; return; }
    const ok = sim && !sim.unzureichend;
    box.innerHTML = `<b>${km(route.L)} km</b> · ↑ ${fmt(route.profile.up)} m · ↓ ${fmt(route.profile.down)} m${ok ? ` · <b>${dur(sim.moving_s)} h</b>` : ""} · ${esc(sportDef().label)}${route.gezeichnet ? " · gezeichnet" : ""}`;
  }
  function renderKpis() {
    const box = $("rp-kpis");
    renderMini();
    if (!route) { box.innerHTML = ""; return; }
    const P = route.profile, ok = sim && !sim.unzureichend;
    const pz = pauseShare();
    box.innerHTML = `<div><b>${km(route.L)}</b><span>km</span></div><div><b>${fmt(P.up)}</b><span>m Aufstieg</span></div><div><b>${fmt(P.down)}</b><span>m Abstieg</span></div>
      <div><b>${ok ? dur(sim.moving_s) : "–"}</b><span>${ok && sim.info.abfahrt_m ? "Aufstieg h" : "Bewegung h"}</span></div>
      <div><b>${ok ? (sportDef().art === "rad" || ST.sport === "wandern" || ST.sport === "skitour" ? fmt(route.L / sim.moving_s * 3.6, 1) : FK.pace(sim.moving_s / route.L * 1000)) : "–"}</b><span>${sportDef().art === "fuss" && ST.sport !== "wandern" ? "Ø /km" : "Ø km/h"}</span></div>
      <div><b>${ok ? dur(sim.moving_s * (1 + pz.share) + (pz.wegpunkte || 0)) : "–"}</b><span>mit Pausen</span></div>`;
  }
  function pauseShare() {
    const pw = RT.pausenSumme(pausenList());
    if (pw > 0) return { share: 0, wegpunkte: pw, text: `an Wegpunkten ${Math.round(pw / 60)} min` };     // keine Doppelzählung mit pauschal
    const fam = sportDef().art === "rad" ? "rad" : ST.sport === "wandern" ? "wandern" : ST.sport === "skitour" ? "skitour" : "lauf";
    const pz = (kal().pausen || {})[fam];
    if (ST.pause === "auto") return pz && isNum(pz.median) ? { share: pz.median, text: `wie bisher (${fmt(pz.median * 100)} %, ${pz.n} Einheiten ≥ 90 min)` } : { share: 0, text: "keine Daten" };
    const min = +ST.pause || 0;
    return { share: sim && sim.moving_s ? (min * 60) / sim.moving_s : 0, text: `${min} min` };
  }
  function renderTabs() {
    $("rp-tabs").innerHTML = Object.entries(TABS).filter(([k, t]) => !(t.netz && route && route.gezeichnet)).map(([k, t]) =>
      `<button role="tab" id="rpt-${k}" aria-selected="${k === ST.activeAnalysisTab}" aria-controls="rp-legend" data-t="${k}">${esc(t.label)}</button>`).join("");
  }
  function renderLegend() {
    const box = $("rp-legend"); if (!route) { box.innerHTML = ""; return; }
    const tab = ST.activeAnalysisTab;
    if (tab === "anstiege") {
      const row = (c) => `<tr class="${ST.selectedClimb === c.id ? "on" : ""}"><td><button class="rp-cl" data-c="${c.id}" aria-pressed="${ST.selectedClimb === c.id}">km ${km(c.d0)}–${km(c.d1)}</button></td><td>${km(c.len)} km</td><td>${fmt(c.hm)} m</td><td>${fmt(c.mittel * 100, 1)} %</td><td>${c.max != null ? fmt(c.max * 100, 1) + " %" : `<span title="${esc(c.max_grund)}">–</span>`}</td><td>${fmt(c.e0)}–${fmt(c.e1)} m</td></tr>`;
      const tbl = (list, title) => `<h4>${title} <small>${list.length}</small></h4>${list.length ? `<div class="tbl-wrap"><table class="t rp-tbl"><thead><tr><th>Abschnitt</th><th>Länge</th><th>Hm</th><th>Mittel</th><th>Max.</th><th>Höhenlage</th></tr></thead><tbody>${list.map(row).join("")}</tbody></table></div>` : `<p class="hint">Keine (Schwelle: ≥ 25 Hm und ≥ 2,5 % im Mittel).</p>`}`;
      box.innerHTML = tbl(climbs.up, "Anstiege") + tbl(climbs.down, "Abfahrten") + `<p class="hint">Glättung: Höhe auf 20 m abgetastet, Mittel über 100 m; Wendepunkte ab 15 m Umkehr. Max. = steilste 100 m, nur bei genügend dichten Höhenpunkten.</p>`;
      return;
    }
    if (TABS[tab].wetter && !field) {
      box.innerHTML = `<p class="hint">${ST.wetter.status === "laedt" ? "Wetter wird geladen …" : "Für diese Ansicht braucht es die Wetterprognose entlang der Route (unten «Wetter laden»)."}</p>`;
      return;
    }
    if (tab === "tempo" && (!sim || sim.unzureichend)) { box.innerHTML = `<p class="hint">${esc(sim && sim.grund || "Keine Tempoberechnung.")}</p>`; return; }
    const defs = TABS[tab].cats();
    const order = Object.keys(defs);
    const rows = stats.slice().sort((a, b) => (order.indexOf(a.cat) - order.indexOf(b.cat)) || b.len - a.len);
    const total = rows.reduce((s, x) => s + x.pct, 0);
    box.innerHTML = `<div class="rp-bar" aria-hidden="true">${rows.map((r) => `<span style="flex:${r.len};background:${(defs[r.cat] || UNK).color}" class="${ST.selectedCat === r.cat ? "on" : ""}"></span>`).join("")}</div>
      <ul class="rp-cats">${rows.map((r) => `<li><button data-k="${esc(r.cat)}" aria-pressed="${ST.selectedCat === r.cat}"><span class="sw" style="background:${(defs[r.cat] || UNK).color}"></span>${esc((defs[r.cat] || UNK).label)}<b>${km(r.len)} km</b><i>${fmt(r.pct, r.pct < 1 ? 1 : 0)} %</i></button></li>`).join("")}</ul>
      <p class="hint">Summe ${fmt(total, 0)} %. ${TABS[tab].netz ? "Quelle: OSM-Merkmale der Routing-Antwort; ohne Angabe = unbekannt (nicht geraten)." : TABS[tab].wetter ? `Quelle: Open-Meteo, je Abschnitt zur geschätzten Durchfahrtszeit.${tab === "wind" ? windText() : ""}` : tab === "tempo" ? "Quelle: Tempomodell unten." : "Steigung je 20 m aus der geglätteten Höhe."} Antippen hebt alle Abschnitte hervor.</p>`;
  }
  function windText() {
    const A = windArrowsNow(); if (!A.length) return field && sim && !sim.unzureichend ? " Karte: keine Windpfeile – Wind auf der ganzen Strecke unbekannt oder windstill." : "";
    const pick = A.length > 3 ? [A[0], A[Math.floor(A.length / 2)], A[A.length - 1]] : A;
    const n = RT.windPositions(route).length, fehlt = n - A.length;
    return ` Karte: Pfeile zeigen, wohin der Wind weht (aus W → Pfeil nach Osten), grösser = stärker. ${pick.map((a) => `km ${km(a.d)}: ${fmt(a.speed * 3.6)} km/h aus ${a.aus}`).join(" · ")}.${fehlt ? ` An ${fehlt} von ${n} Stellen kein Pfeil: Wind unbekannt oder windstill.` : ""}`;
  }
  function renderInt() {
    const box = $("rp-int");
    if (!route) { box.hidden = true; return; }
    box.hidden = false;
    const def = sportDef(), m = ST.effortMode;
    const LAB = { watt: "Watt", hf: "Puls", pace: "Pace", faktor: "Tempo", hmh: "Hm/h" };
    const R = range(m);
    const val = ST.effortValue;
    const shown = m === "pace" ? FK.pace(val) : fmt(val);
    const unit = { watt: "W", hf: "bpm", pace: "min/km", faktor: "% pers.", hmh: "Hm/h" }[m];
    let res = "";
    if (!sim) res = "";
    else if (sim.unzureichend) res = `<div class="verdict warn">${esc(sim.grund)}</div>`;
    else {
      const pz = pauseShare(), pw = pz.wegpunkte || 0, arr = ST.startUnix + sim.moving_s * (1 + pz.share) + pw;
      const band = sim.band || [sim.moving_s, sim.moving_s];
      res = `<div class="rp-res"><div><span>Bewegungszeit</span><b>${dur(sim.moving_s)} h</b><small>${dur(band[0])}–${dur(band[1])} h</small></div>
        <div><span>Ankunft</span><b>${clock(arr)}</b><small>${clock(ST.startUnix + band[0] * (1 + pz.share) + pw)}–${clock(ST.startUnix + band[1] * (1 + pz.share) + pw)}</small></div>
        <div><span>Ø ${def.art === "fuss" && ST.sport !== "wandern" ? "Pace" : "Tempo"}</span><b>${def.art === "fuss" && ST.sport !== "wandern" ? FK.pace(sim.moving_s / route.L * 1000) : fmt(route.L / sim.moving_s * 3.6, 1)}</b><small>${def.art === "fuss" && ST.sport !== "wandern" ? "min/km" : "km/h"}</small></div></div>
        <p class="hint">${esc(sim.info.modell)}${sim.info.korrektur ? " · " + esc(sim.info.korrektur.text) : ""} · Band: ${esc(sim.fehler.quelle)} ±${fmt(sim.fehler.rel * 100)} %${sim.wind && sim.wind.status === "Prognose" ? ", Wind aus Prognose" : ""}. ${sim.info.hinweise.map(esc).join(" ")}</p>${windHinweis(sim)}`;
    }
    const kOk = (m === "hf" && hfCal()) ? hfCal() : null;
    const calNote = m === "hf" ? (kOk && kOk.ok ? `<p class="hint">Kalibrierung: ${kOk.n} Blöcke aus ${kOk.n_aktiv} Einheiten, Hold-out-Fehler ±${fmt(kOk.mae)} ${esc(kOk.einheit_fehler)} (ohne Puls ±${fmt(kOk.mae_konstant)})${kOk.schwach ? " – schwacher Zusammenhang" : ""}. Bereich ${fmt(kOk.x_bereich[0])}–${fmt(kOk.x_bereich[1])} bpm.</p>` : `<p class="hint">Unzureichende Daten für eine persönliche Puls-Kalibrierung.</p>`) : "";
    const outside = m === "hf" && kOk && kOk.ok && (val < kOk.x_bereich[0] - 3 || val > kOk.x_bereich[1] + 3);
    box.innerHTML = `<div class="rp-int-head"><h3>Intensität</h3><div class="seg" role="group" aria-label="Eingabe">${def.modi.map((x) => `<button data-m="${x}" aria-pressed="${x === m}">${LAB[x]}</button>`).join("")}</div></div>
      <div class="rp-dial"><button class="btn icon" id="rp-minus" aria-label="weniger">−</button>
        <label class="rp-val"><input id="rp-num" type="${m === "pace" ? "text" : "number"}" inputmode="${m === "pace" ? "text" : "numeric"}" value="${shown}" aria-label="${LAB[m]} (${unit})"><span>${unit}</span></label>
        <button class="btn icon" id="rp-plus" aria-label="mehr">+</button></div>
      <input type="range" id="rp-range" min="${R[0]}" max="${R[1]}" step="${R[2]}" value="${val}" aria-label="${LAB[m]}" ${m === "pace" ? 'style="direction:rtl"' : ""}>
      ${outside ? `<p class="hint warn-t">Ausserhalb der kalibrierten Werte: grössere Unsicherheit.</p>` : ""}${calNote}
      ${res}`;
    bindInt();
  }
  /** Fahrzeit ohne (vollständigen) Wind: ausdrücklich sagen und das Band erklären (zeit-rt-1.2). */
  function windHinweis(sim) {
    const W = sim && sim.wind; if (!W || W.status === "Prognose") return "";
    const grund = W.status === "keine Prognose" ? (ST.wetter && ST.wetter.status === "fehler" ? "Wetterdienst nicht erreichbar" : "keine Wetterprognose geladen")
      : W.status === "unbekannt" ? "Prognose ohne Winddaten" : `Winddaten fehlen auf ${km(W.unbekannt_m)} km (${fmt(W.anteil * 100)} % der Strecke)`;
    return `<p class="hint warn-t"><b>Wind ${W.status === "teilweise" ? "teilweise " : ""}nicht berücksichtigt</b> (${grund}): ${W.status === "teilweise" ? "dort ohne Wind gerechnet" : "ohne Wind gerechnet"}, vereinfachte Schätzung. Das Band enthält dafür ±7 km/h Gegen- bis Rückenwind (±2 m/s auf Fahrhöhe)${W.status === "teilweise" ? " auf diesen Abschnitten" : ""}.</p>`;
  }
  function pauseShareText() {
    const fam = sportDef().art === "rad" ? "rad" : ST.sport === "wandern" ? "wandern" : ST.sport === "skitour" ? "skitour" : "lauf";
    const pz = (kal().pausen || {})[fam];
    return pz && isNum(pz.median) ? `wie bisher (+${fmt(pz.median * 100)} %)` : "wie bisher (keine Daten)";
  }
  function hfCal() { const K = kal(), def = sportDef(); return def.art === "rad" ? K.rad_hf_w : def.art === "ski" ? K.skitour_hf_vam : ST.sport === "wandern" ? K.wandern_hf_vam : K.lauf_hf_pace; }
  function range(m) {
    if (m === "watt") return [60, 420, 5];
    if (m === "hf") return [90, 195, 1];
    if (m === "pace") return [180, 720, 5];
    if (m === "faktor") return [50, 160, 5];
    return [150, 1200, 10];
  }
  function localInput(u) { const p = FK.zurichParts(u); return `${p.date}T${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`; }
  function bindInt() {
    const R = range(ST.effortMode);
    const set = (v, src) => {
      v = Math.max(R[0], Math.min(R[1], Math.round(v / R[2]) * R[2]));
      if (v === ST.effortValue && src !== "force") return;
      ST.effortValue = v; saveEffort();
      effortChanged();
    };
    $("rp-minus").onclick = () => set(ST.effortValue - R[2] * (ST.effortMode === "pace" ? -1 : 1));
    $("rp-plus").onclick = () => set(ST.effortValue + R[2] * (ST.effortMode === "pace" ? -1 : 1));
    $("rp-range").oninput = (e) => set(+e.target.value);
    $("rp-num").onchange = (e) => { const t = e.target.value.trim(); const v = ST.effortMode === "pace" ? paceIn(t) : +t; if (isNum(v)) set(v, "force"); else e.target.value = ST.effortMode === "pace" ? FK.pace(ST.effortValue) : ST.effortValue; };
    $("rp-int").querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { ST.effortMode = b.dataset.m; const all = S.get("effort", {}); const mine = all[ST.sport] || {}; ST.effortValue = isNum(mine[ST.effortMode]) ? mine[ST.effortMode] : defaultValue(ST.effortMode); saveEffort(); effortChanged(); }));
  }
  /* ---------- Variantenvergleich (varianten-1.0, A08) ---------- */
  let VAR = { key: null, rows: null, busy: false };
  const sigOf = () => [ST.sport, JSON.stringify(ST.opts || {}), ST.vias.map((v) => v.join(",")).join("|")].join("#");
  function renderVar() {
    const box = $("rp-var"); if (!box) return;
    const vs = RT.VARIANTEN[ST.sport];
    if (!route || route.gezeichnet || !vs) { box.hidden = true; return; }
    box.hidden = false;
    if (VAR.key !== sigOf()) VAR = { key: sigOf(), rows: null, busy: false };
    const ws = RT.wayShare(route), cur = vs.find((v) => v.k === ST.variant);
    const head = `<b>Hauptstrasse ${fmt(ws.haupt_pct)} %</b> der Route (${km(ws.haupt_m)} von ${km(route.L)} km; laut OSM «trunk/primary»)${cur ? ` · Variante «${esc(cur.label)}»` : ""}.`;
    if (!VAR.rows) {
      box.innerHTML = `<div class="rp-card">${head}<div class="row"><button class="btn" id="rp-var-go" ${VAR.busy ? "disabled" : ""}>${VAR.busy ? "Varianten werden berechnet …" : "Varianten vergleichen"}</button></div>
        <p class="hint">Gleiche Wegpunkte mit «Schnell», «Weniger Verkehr» und «Ruhig»: dasselbe, für Velos erlaubte Rennradprofil (Asphalt bevorzugt), nur Verkehr anders gewichtet. Je Variante eine Anfrage an BRouter.</p></div>`;
      const go = $("rp-var-go"); if (go) go.onclick = () => computeVariants();
      return;
    }
    const fz = RT.variantFazit(VAR.rows), t = (x) => (isNum(x) ? dur(x) : "–");
    const on = (r) => (ST.variant || "schnell") === r.k;
    box.innerHTML = `<div class="rp-card">${head}<table class="t rp-vt"><tr><th>Variante</th><th>km</th><th>Hm</th><th title="Anteil Hauptstrasse">Haupt&shy;str.</th><th title="unbefestigt, km">unbef.</th><th>Zeit</th></tr>${VAR.rows.map((r) => r.fehler
      ? `<tr><td colspan="6">${esc(r.label)}: <small>${esc(r.fehler)}</small></td></tr>`
      : `<tr class="${on(r) ? "on" : ""}"><td>${esc(r.label)}<br>${on(r) ? '<span class="pill">aktiv</span>' : `<button class="btn rp-vbtn" data-var="${r.k}" aria-label="Variante «${esc(r.label)}» übernehmen">Wählen</button>`}</td><td>${km(r.share.L)}</td><td>${fmt(r.up)}</td><td>${fmt(r.share.haupt_pct)} %</td><td>${km(r.share.unbef_m)}</td><td>${t(r.t)}</td></tr>`).join("")}</table>
      <p class="${fz.status === "keine" ? "verdict unsure" : "hint"}">${esc(fz.text)}</p>
      <p class="hint">Nur Wege, die laut OSM für Velos erlaubt sind; «erlaubt laut OSM» hängt von den Kartendaten ab und ist keine rechtliche Garantie – vor Ort gilt die Signalisation.</p></div>`;
    box.querySelectorAll("[data-var]").forEach((b) => (b.onclick = () => { ST.variant = b.dataset.var; reroute(false); }));
  }
  async function computeVariants() {
    const vs = RT.VARIANTEN[ST.sport]; if (!vs || !route) return;
    const sig = sigOf(), ep = S.get("endpoint", RT.ENDPOINT), vias = ST.vias.slice(), inp = effortInput();
    VAR = { key: sig, rows: null, busy: true }; renderVar();
    const rows = [];
    for (const v of vs) {
      const eng = RT.engineVariant(ST.sport, ST.opts, v.k);
      try {
        const legs = await Promise.all(Array.from({ length: vias.length - 1 }, (_, i) => {
          const key = [ep, eng.engine, JSON.stringify(eng.params), vias[i].join(","), vias[i + 1].join(",")].join("|");
          if (!CACHE.has(key)) CACHE.set(key, RT.fetchLeg(window.fetch.bind(window), ep, eng, vias[i], vias[i + 1]).catch((e) => { CACHE.delete(key); throw e; }));
          return CACHE.get(key);
        }));
        const r = RT.buildRoute(legs, vias, { sport: ST.sport, engine: eng.engine });
        const sv = RT.eta(r, inp);
        rows.push({ k: v.k, label: v.label, share: RT.wayShare(r), up: r.profile.up, t: sv.unzureichend ? null : sv.moving_s });
      } catch (e) { rows.push({ k: v.k, label: v.label, fehler: e.message || String(e) }); }
    }
    if (VAR.key !== sig) return;
    VAR = { key: sig, rows, busy: false }; renderVar();
  }
  /** Winter und Skitouren: Gelände, Lawinen, Wildruhezonen, Regeln – Navigation garantiert keine Sicherheit. */
  function renderWinter() {
    const box = $("rp-winter"); if (!box) return;
    const m = new Date(ST.startUnix * 1000).getMonth(), winter = m >= 10 || m <= 3;
    const show = ST.sport === "skitour" || (winter && (ST.sport === "wandern" || ST.sport === "trail"));
    box.hidden = !show || !ST.vias.length;
    if (box.hidden) return;
    box.innerHTML = `<div class="rp-card rp-warncard"><b>${ST.sport === "skitour" ? "Skitour" : "Winter"}: Sicherheit liegt nicht in der Linie</b>
      <ul class="flags"><li>Lawinenbulletin des SLF vor jeder Tour lesen (<a href="https://www.slf.ch" target="_blank" rel="noopener">slf.ch</a>, App «White Risk»); Hänge ab etwa 30° sind lawinenrelevant – die Steigungsfarben zeigen die Linie, nicht den Hang daneben.</li>
        <li>Wildruhezonen und Wildschutzgebiete respektieren (Karte «Wildruhezonen» auf <a href="https://map.geo.admin.ch" target="_blank" rel="noopener">map.geo.admin.ch</a>); Betretungsverbote und Routengebote gelten auch, wenn hier eine Linie durchführt.</li>
        <li>${ST.sport === "skitour" ? "Die Linie ist von Hand gezeichnet: kein Wegnetz, keine Prüfung von Gelände, Zugang oder Gefahren." : "Sommerwege können im Winter gesperrt, vereist oder lawinengefährdet sein; «erlaubt laut OSM» gilt nicht für Winterverhältnisse."}</li>
        <li>Keine Navigation garantiert Sicherheit: Verhältnisse vor Ort, Ausbildung und Ausrüstung entscheiden.</li></ul></div>`;
  }
  /** Start und Pausen sichtbar über dem Profil (Primärbedienung, V5.5). */
  function renderWhen() {
    const box = $("rp-when"); if (!box) return;
    if (!route) { box.hidden = true; return; }
    box.hidden = false;
    const pw = RT.pausenSumme(pausenList());
    box.innerHTML = `<label>Start <input type="datetime-local" id="rp-start" value="${localInput(ST.startUnix)}"></label>
      <label>Pausen <select id="rp-pause" ${pw ? "disabled" : ""}>${pw ? `<option>an Wegpunkten: ${Math.round(pw / 60)} min</option>` : `<option value="auto" ${ST.pause === "auto" ? "selected" : ""}>${esc(pauseShareText())}</option>${[0, 15, 30, 60, 90].map((x) => `<option value="${x}" ${String(ST.pause) === String(x) ? "selected" : ""}>${x ? "+" + x + " min" : "keine"}</option>`).join("")}`}</select></label>`;
    $("rp-start").onchange = (e) => { const [dd, tt] = String(e.target.value).split("T"); if (dd && tt) { ST.startUnix = FK.zurichToUnix(dd, tt.slice(0, 5)); effortChanged(); maybeWeather(true); } };
    if (!pw) $("rp-pause").onchange = (e) => { ST.pause = e.target.value; renderInt(); renderKpis(); renderArr(); };
  }
  const paceIn = (t) => { const m = /^(\d{1,2})[:.,](\d{1,2})$/.exec(t); return m ? +m[1] * 60 + +m[2] : /^\d+$/.test(t) ? +t * 60 : NaN; };
  let rafPending = false;
  function effortChanged() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      recomputeSim();
      if (ST.activeAnalysisTab === "tempo" || TABS[ST.activeAnalysisTab].wetter) { buildPieces(); renderMap(); renderLegend(); }
      renderInt(); renderKpis(); renderArr(); drawChart(); renderInfo();
      const r = $("rp-range"); if (r && document.activeElement !== r) r.value = ST.effortValue;
    });
  }
  function renderArr() {
    const box = $("rp-arr");
    if (!route || !sim || sim.unzureichend) { box.innerHTML = ""; return; }
    const P = route.profile, pz = pauseShare();
    const tAt = (d) => { const k = Math.min(P.n, Math.round(d / P.step)); return sim.t[k]; };
    const band = sim.band || [sim.moving_s, sim.moving_s], pl = pausenList();
    box.innerHTML = `<h3>Ankunft an den Wegpunkten</h3><ol class="rp-arrl">${route.vias.map((v, i) => {
      const pv = RT.pauseBefore(pl.filter((q) => q.i < i), v.d), t = tAt(v.d) * (1 + pz.share), lo = t * band[0] / sim.moving_s, hi = t * band[1] / sim.moving_s;
      const w = field ? field(v.d, ST.startUnix + tAt(v.d) + pv, P.head[Math.min(P.n - 1, Math.round(v.d / P.step))]) : null;
      const halt = ((ST.pausen || [])[i] || 0);
      return `<li><span class="rp-pin sm${i === 0 ? " a" : i === route.vias.length - 1 ? " b" : ""}">${viaLabel(i, route.vias.length)}</span><span>km ${km(v.d)}</span><b>${clock(ST.startUnix + t + pv)}</b><small>${i ? clock(ST.startUnix + lo + pv) + "–" + clock(ST.startUnix + hi + pv) : tzd.format(new Date(ST.startUnix * 1000))}</small>${halt && i < route.vias.length - 1 && i > 0 ? `<small>Pause ${halt} min, weiter ${clock(ST.startUnix + t + pv + halt * 60)}</small>` : ""}${w ? `<small>${tempKurz(w)} · ${windKurz(w)}</small>` : ""}</li>`;
    }).join("")}</ol>${pz.share ? `<p class="hint">Inklusive Pausen ${esc(pz.text)}, gleichmässig verteilt.</p>` : pl.length ? `<p class="hint">Pausen an Wegpunkten verschieben die späteren Durchfahrtszeiten und das Wetter dort.</p>` : ""}`;
  }
  function renderWx() {
    const box = $("rp-wx");
    if (!route) { box.innerHTML = ""; return; }
    const c = consent();
    if (!c.wetter) {
      box.innerHTML = `<div class="rp-card"><b>Wetter entlang der Route</b><p class="hint">Dafür werden Stützpunkte der Route (Koordinaten, etwa alle 5 km) und die geplanten Durchfahrtszeiten an Open-Meteo (open-meteo.com) gesendet – ohne Name oder Konto.</p>
        <div class="row"><button class="btn primary" id="rp-wx-ok">Wetter laden (zustimmen)</button></div></div>`;
      $("rp-wx-ok").onclick = () => { S.set("consent", Object.assign(consent(), { wetter: true, wetter_am: new Date().toISOString() })); maybeWeather(true); };
      return;
    }
    const q = field && field.quality ? field.quality : [];
    const dmax = q.reduce((m, x) => Math.max(m, Math.abs(x.diff || 0)), 0);
    const st = ST.wetter;
    box.innerHTML = `<div class="rp-card"><b>Wetter entlang der Route</b> ${st.status === "laedt" ? '<span class="spin" aria-hidden="true"></span> wird geladen …' : ""}
      <p class="hint">${st.status === "ok" ? `Open-Meteo-Prognose, Stand ${clock(st.t)}; ${wpts ? wpts.length : 0} Stützpunkte, je Abschnitt zur geschätzten Durchfahrtszeit (Zeitzone Europe/Zurich). Windrichtung = woher der Wind kommt; auf Fahrhöhe ×${String(RT.WIND_HEIGHT)} gerechnet. ${dmax > 250 ? `<b>Qualität eingeschränkt:</b> Modellgitter bis ${fmt(dmax)} m neben der Streckenhöhe (Berggelände).` : ""}` : st.status === "fehler" ? `Wetter nicht verfügbar: ${esc(st.msg)}` : st.status === "zuweit" ? "Start liegt mehr als 15 Tage voraus: keine Prognose." : ""}</p>
      <div class="row"><button class="btn" id="rp-wx-re">Neu laden</button><button class="btn" id="rp-wx-off">Wetter ausschalten</button></div></div>`;
    $("rp-wx-re").onclick = () => maybeWeather(true);
    $("rp-wx-off").onclick = () => { S.set("consent", Object.assign(consent(), { wetter: false })); field = null; ST.wetter = { status: "aus" }; recomputeSim(); buildPieces(); renderAll(); };
  }
  async function maybeWeather(force) {
    if (!route || !consent().wetter || !sim || sim.unzureichend) { renderWx(); return; }
    const t0 = ST.startUnix, t1 = ST.startUnix + sim.moving_s * 1.6;
    if (t0 > Date.now() / 1000 + 15 * 86400) { field = null; ST.wetter = { status: "zuweit" }; recomputeSim(); renderAll(); return; }
    const my = ++wjob;
    ST.wetter = { status: "laedt" }; renderWx();
    try {
      wpts = RT.weatherPoints(route);
      const url = RT.openMeteoUrl(wpts, t0, t1);
      const res = await fetch(url);
      const js = await res.json();
      if (!res.ok || js.error) throw new Error(js.reason || "HTTP " + res.status);
      if (my !== wjob) return;
      field = RT.weatherField(wpts, js);
      ST.wetter = { status: "ok", t: Date.now() / 1000 };
    } catch (e) {
      if (my !== wjob) return;
      field = null; ST.wetter = { status: "fehler", msg: String(e.message || e) };
    }
    recomputeSim(); buildPieces(); renderAll();
  }
  function renderSrc() {
    const box = $("rp-src"); if (!route) { box.innerHTML = '<p class="hint">Noch keine Route.</p>'; return; }
    const B = RT.RAD[sportDef().rad || "rennrad"], inp = effortInput(), K = kal();
    const rows = [
      ["Routing", route.gezeichnet ? "von Hand gezeichnet (kein Wegnetz, kein Zugangscheck)" : `${esc(route.prov.routing)} über ${esc(route.prov.endpoint || "")}, Profil «${esc(route.engine)}» (${esc(sportDef().label)}); Abschnitte einzeln berechnet; Stand ${new Date(route.created).toLocaleString("de-CH")}`],
      ["Wegdaten", route.gezeichnet ? "–" : `${esc(route.prov.osm)}; Belag/Wegart/Zugang aus den OSM-Merkmalen jedes Abschnitts, fehlende = unbekannt`],
      ["Höhe", route.gezeichnet ? "Höhenmodell Mapzen/AWS Terrain Tiles" : "BRouter (SRTM-Höhenmodell an den OSM-Knoten); 20-m-Abtastung, Mittel über 100 m, Auf-/Abstieg mit 3-m-Hysterese"],
      ["Tempo", sportDef().art === "rad" ? `Leistungsbilanz je 20 m: Fahrer ${fmt(inp.rad.rider, 1)} kg + Rad ${fmt(inp.rad.bikeKg, 1)} kg, CdA ${String(inp.rad.cda)}, Crr je Belag (Annahmen), Wirkungsgrad 97,6 %, Luftdichte aus Höhe und Temperatur; bergab rollen (≤ −5 %: 0 W), Abfahrt ≤ ${B.vmax.asphalt} km/h auf Asphalt und Kurven ≤ √(${B.alat}·r); bei Regen −15 %` :
        ST.sport === "wandern" ? "Tobler-Gehfunktion je 20 m × persönlicher Faktor; Hm/h-Modus: bergauf Vertikaltempo" : ST.sport === "skitour" ? "Aufstieg aus Hm/h, flach 4 km/h; Abfahrt nicht bestimmt" : "Flachtempo × Minetti-Energiekosten je Steigung; bergab höchstens +20 % (Trail +10 %, ab T3 0 %); über 20 % gehen"],
      ["Kalibrierung", K.v ? `${esc(K.v)} vom ${esc(K.erstellt)} – ${esc(K.quelle)}` : "keine"],
      ["Wetter", field ? "Open-Meteo Forecast API (best_match), stündlich, linear in Zeit und Strecke interpoliert, Wind als Vektor" : "nicht geladen"],
      ["Nicht modelliert", "Ampeln, Kreuzungen, Verkehr, Bremsen vor Kurven ausser Kurvengrenze, Ermüdung, Schnee; Abfahrtsgrenzen sind Annahmen"],
    ];
    box.innerHTML = `<dl class="dl">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>${sportDef().art === "rad" ? radForm(inp) : ""}`;
    const f = $("rp-radf");
    if (f) f.onchange = () => {
      const r = S.get("rad", {}), b = sportDef().rad;
      const g = (n) => { const v = parseFloat(String(f[n].value).replace(",", ".")); return isNum(v) ? v : undefined; };
      r.fahrer = g("fahrer"); r["kg_" + b] = g("kg"); r["cda_" + b] = g("cda");
      S.set("rad", r); S.set("korrektur", f.korr.checked);
      effortChanged(); renderSrc();
    };
  }
  function radForm(inp) {
    return `<form id="rp-radf" class="rp-radf"><label>Fahrer kg<input name="fahrer" inputmode="decimal" value="${fmt(inp.rad.rider, 1)}"></label><label>Rad + Gepäck kg<input name="kg" inputmode="decimal" value="${fmt(inp.rad.bikeKg, 1)}"></label>
      <label>CdA m²<input name="cda" inputmode="decimal" value="${inp.rad.cda}"></label><label class="ck"><input type="checkbox" name="korr" ${S.get("korrektur", true) ? "checked" : ""}> Korrektur aus echten Fahrten</label></form>`;
  }

  function renderAll() {
    renderSub(); renderStatus(ST.busy ? $("rp-status").textContent : null);
    renderKpis();
    $("rp-ana").hidden = !route;
    $("rp-saverow").hidden = !route && !ST.vias.length;
    $("pl-gpx").disabled = !route; $("pl-gpx").title = route ? "" : "Erst nach erfolgreichem Routing";
    renderWhen(); renderVar(); renderWinter(); renderTabs(); renderLegend(); renderInt(); renderArr(); renderWx(); renderSrc();
    renderMap();
    requestAnimationFrame(() => { drawChart(); renderInfo(); });
    if (C.onRouteChange) C.onRouteChange();
  }
  function live(t) { const el = $("rp-live"); if (el) { el.textContent = ""; setTimeout(() => (el.textContent = t), 30); } }

  /* ---------------- Einwilligung ---------------- */
  function showConsent() {
    const box = $("rp-consent");
    box.hidden = false;
    box.innerHTML = `<div class="rp-card"><b>Echtes Routing über das Wegnetz</b>
      <p class="hint">Die gesetzten Punkte (nur Koordinaten, ohne Namen oder Konto) werden an den öffentlichen BRouter-Server ${esc(S.get("endpoint", RT.ENDPOINT).replace(/^https?:\/\//, ""))} gesendet. Er berechnet die Route über erlaubte Wege (OpenStreetMap) – ohne Verfügbarkeitsgarantie. Ohne Zustimmung gibt es nur die von Hand gezeichnete Linie (Luftlinie).</p>
      <div class="row"><button class="btn primary" id="rp-ok">Zustimmen und routen</button><button class="btn" id="rp-manual">Nur Luftlinie zeichnen</button></div></div>`;
    $("rp-ok").onclick = () => { S.set("consent", Object.assign(consent(), { routing: true, routing_am: new Date().toISOString() })); box.hidden = true; reroute(true); };
    $("rp-manual").onclick = () => { ST.manual = true; box.hidden = true; reroute(true); };
  }

  /* ---------------- Ansicht ---------------- */
  function fitRoute() { if (route) fitCoords(route.lon.map((x, i) => [x, route.lat[i]])); }
  function fitCoords(cs) {
    if (!map || !cs.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of cs) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    // Platz für Kartenknöpfe (oben links/rechts); das Bottom Sheet ist über die Kartenpolsterung berücksichtigt
    map.fitBounds([[x0, y0], [x1, y1]], { padding: { top: 120, bottom: 30, left: 30, right: 64 }, maxZoom: 16, duration: reduce() ? 0 : 600 });
  }
  const SHEETS = ["min", "half", "full"];
  function setSheet(s) { ST.sheet = s; applySheet(); }
  function applySheet() {
    const el = $("planner"); if (!el) return;
    const mobile = innerWidth <= 760;
    el.dataset.sheet = ST.sheet;
    const wrap = el.parentElement;
    if (!map) return;
    if (!active()) { map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); if (wrap) wrap.style.removeProperty("--rp-h"); return; }
    if (mobile) {
      const hgt = el.getBoundingClientRect().height || 0;
      if (wrap) wrap.style.setProperty("--rp-h", Math.round(hgt) + "px");
      map.setPadding({ top: 0, left: 0, right: 0, bottom: Math.min(hgt, innerHeight * 0.6) });
    } else { if (wrap) wrap.style.setProperty("--rp-h", "0px"); map.setPadding({ top: 0, bottom: 0, left: 0, right: el.getBoundingClientRect().width || 0 }); }
  }
  function gripEvents() {
    const g = $("rp-grip"), el = $("planner");
    let y0 = null, h0 = 0, moved = false;
    g.addEventListener("pointerdown", (e) => { y0 = e.clientY; h0 = el.getBoundingClientRect().height; moved = false; try { g.setPointerCapture(e.pointerId); } catch (x) { /* */ } el.classList.add("dragging"); });
    g.addEventListener("pointermove", (e) => { if (y0 == null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 4) moved = true; el.style.height = Math.max(96, Math.min(el.parentElement.clientHeight - 20, h0 - dy)) + "px"; });
    const end = () => {
      if (y0 == null) return;
      el.classList.remove("dragging");
      const H = el.parentElement.clientHeight, hgt = el.getBoundingClientRect().height;
      el.style.height = "";
      y0 = null;
      if (!moved) { setSheet(SHEETS[(SHEETS.indexOf(ST.sheet) + 1) % 3]); return; }
      const frac = hgt / H;
      setSheet(frac < 0.3 ? "min" : frac < 0.72 ? "half" : "full");
      setTimeout(() => { drawChart(); applySheet(); }, 260);
    };
    g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSheet(SHEETS[(SHEETS.indexOf(ST.sheet) + 1) % 3]); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSheet(SHEETS[Math.min(2, SHEETS.indexOf(ST.sheet) + 1)]); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSheet(SHEETS[Math.max(0, SHEETS.indexOf(ST.sheet) - 1)]); }
    });
    el.addEventListener("transitionend", () => { drawChart(); applySheet(); });
  }

  /* ---------------- Ereignisse ---------------- */
  function bind() {
    chartEvents(); gripEvents();
    $("rp-sports").addEventListener("click", (e) => {
      const b = e.target.closest("[data-s]"); if (!b) return;
      ST.sport = b.dataset.s; S.set("sport", ST.sport); ST.manual = false; ST.variant = null;
      loadEffort(); renderSports(); renderOpts();
      clearSel(true);
      if (ST.vias.length >= 2) reroute(false); else renderAll();
    });
    $("rp-opts").addEventListener("change", (e) => {
      const o = e.target.dataset.o; if (!o) return;
      ST.opts[o] = e.target.type === "checkbox" ? e.target.checked : e.target.value; S.set("opts", ST.opts);
      if (ST.vias.length >= 2) reroute(false);
    });
    $("rp-vias").addEventListener("change", (e) => {
      const sel = e.target.closest("[data-pz]"); if (!sel) return;
      ST.pausen = Array.from({ length: ST.vias.length }, (_, i) => (ST.pausen || [])[i] || 0);
      ST.pausen[+sel.dataset.pz] = +sel.value;
      recomputeSim(); buildPieces(); renderAll();
      live(`Pause ${sel.value} min: spätere Durchfahrtszeiten und Wetter verschoben.`);
    });
    $("rp-vias").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const v = ST.vias.slice(), nm = (ST.names || []).slice();
      const pz = ST.pausen = (ST.pausen || []).slice(0, v.length);
      const swap = (i, j) => { [v[i], v[j]] = [v[j], v[i]]; [nm[i], nm[j]] = [nm[j], nm[i]]; [pz[i], pz[j]] = [pz[j], pz[i]]; };
      if (b.dataset.up != null) { const i = +b.dataset.up; swap(i, i - 1); ST.names = nm; setVias(v, "umsortiert", { fit: false }); }
      else if (b.dataset.dn != null) { const i = +b.dataset.dn; swap(i, i + 1); ST.names = nm; setVias(v, "umsortiert", { fit: false }); }
      else if (b.dataset.del != null) { const i = +b.dataset.del; v.splice(i, 1); nm.splice(i, 1); pz.splice(i, 1); ST.names = nm; setVias(v, "entfernt", { fit: false }); }
      else if (b.dataset.z != null && map) map.easeTo({ center: ST.vias[+b.dataset.z], zoom: Math.max(map.getZoom(), 14), duration: reduce() ? 0 : 500 });
    });
    $("rp-add").onclick = () => setAddMode(!ST.addMode);
    $("rp-rev").onclick = () => {
      if (ST.vias.length < 2) return;
      ST.routeDirection = ST.routeDirection === "hin" ? "rueck" : "hin";
      ST.names = (ST.names || []).slice(0, ST.vias.length).reverse();
      ST.pausen = Array.from({ length: ST.vias.length }, (_, i) => (ST.pausen || [])[i] || 0).reverse();
      setVias(ST.vias.slice().reverse(), "umgekehrt", { fit: false });
      live("Route umgekehrt: Wegpunkte in umgekehrter Reihenfolge, wird neu berechnet.");
    };
    $("rp-loop").onclick = () => { if (ST.vias.length < 2) return; const a = ST.vias[0], b = ST.vias[ST.vias.length - 1]; if (a[0] === b[0] && a[1] === b[1]) return; setVias(ST.vias.concat([a.slice()]), "Rundtour", { fit: false }); };
    $("rp-undo").onclick = () => { if (!history.length) return; ST.vias = history.pop(); renderVias(); reroute(false); };
    $("rp-new").onclick = () => { history.push(ST.vias.slice()); ST.vias = []; ST.names = []; ST.pausen = []; ST.editId = null; ST.manual = false; $("pl-name").value = ""; $("pl-msg").textContent = ""; setAddMode(true); renderVias(); reroute(false); };
    $("rp-tabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      if (ST.activeAnalysisTab === b.dataset.t) return;
      const had = ST.selectedSegmentIds.size > 0;
      ST.activeAnalysisTab = b.dataset.t;
      clearSel(true); buildPieces(); renderTabs(); renderLegend(); renderMap(); drawChart();
      if (had) live("Ansicht gewechselt, Auswahl aufgehoben.");
      $("rpt-" + ST.activeAnalysisTab).focus();
    });
    $("rp-tabs").addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const ks = [...$("rp-tabs").querySelectorAll("[data-t]")].map((b) => b.dataset.t), i = ks.indexOf(ST.activeAnalysisTab);
      const n = ks[(i + (e.key === "ArrowRight" ? 1 : -1) + ks.length) % ks.length];
      $("rpt-" + n).click();
    });
    $("rp-legend").addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]"); if (k) { selectCat(k.dataset.k); return; }
      const c = e.target.closest("[data-c]"); if (c) selectClimb(c.dataset.c);
    });
    $("pl-close").onclick = () => C.close && C.close();
    $("pl-save").onclick = save;
    $("pl-gpx").onclick = gpx;
  }

  /* ---------------- Speichern / GPX / Laden ---------------- */
  function packRoute() {
    if (!route) return null;
    // Antworten kompakt speichern: Linie (Polyline 1e6), Höhe (dm-Differenzen), Abschnitte mit Merkmalen – offline wieder aufbaubar
    const legs = route.legs.map((lg, li) => {
      const i0 = lg.i0, i1 = lg.i1;
      const lon = route.lon.slice(i0, i1 + 1), lat = route.lat.slice(i0, i1 + 1), ele = route.ele.slice(i0, i1 + 1);
      const edges = route.segs.filter((s) => s.leg === li).map((s) => [s.i0 - i0, s.i1 - i0, Object.entries(s.tags).map(([k, v]) => k + "=" + v).join(" ")]);
      return { c: encPoly(lon, lat), e: ele.map((v) => (isNum(v) ? Math.round(v * 4) : null)), ed: edges, p: lg.props };
    });
    return { legs, engine: route.engine, prov: route.prov, created: route.created };
  }
  function unpackRoute(rec) {
    const legs = rec.route.legs.map((l) => {
      const ll = decPoly(l.c);
      return { coords: ll.map((p, i) => [p[0], p[1], l.e[i] == null ? null : l.e[i] / 4]), edges: l.ed.map(([a, b, t]) => ({ i0: a, i1: b, tags: RT.parseTags(t), nodeTags: {} })), props: l.p || {} };
    });
    return RT.buildRoute(legs, rec.vias, { sport: rec.sport, engine: rec.route.engine, prov: rec.route.prov, created: rec.route.created });
  }
  function encPoly(lon, lat) {
    let out = "", px = 0, py = 0;
    const enc = (v) => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>>= 5; } return s + String.fromCharCode(v + 63); };
    for (let i = 0; i < lon.length; i++) { const y = Math.round(lat[i] * 1e6), x = Math.round(lon[i] * 1e6); out += enc(y - py) + enc(x - px); py = y; px = x; }
    return out;
  }
  function decPoly(str) {
    let i = 0, lat = 0, lon = 0; const out = [];
    while (i < str.length) {
      for (let pass = 0; pass < 2; pass++) {
        let b, shift = 0, res = 0;
        do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << shift; shift += 5; } while (b >= 32);
        const v = (res & 1) ? ~(res >> 1) : (res >> 1);
        if (pass === 0) lat += v; else lon += v;
      }
      out.push([lon / 1e6, lat / 1e6]);
    }
    return out;
  }
  function save() {
    const msg = (t) => ($("pl-msg").textContent = t);
    if (ST.vias.length < 2) { msg("Setze zuerst mindestens zwei Punkte."); return; }
    const name = $("pl-name").value.trim() || `${sportDef().label} ${C.dateCH(C.iso(C.today))}`;
    const rec = { id: ST.editId || "u-r" + Date.now(), v: RT.VERSIONS.route, name, sport: ST.sport, opts: ST.opts, vias: ST.vias.slice(), names: ST.names,
      coords: route ? route.lon.map((x, i) => [+x.toFixed(5), +route.lat[i].toFixed(5)]).filter((_, i, a) => i % Math.max(1, Math.round(a.length / 1500)) === 0 || i === a.length - 1) : [],
      route: route ? packRoute() : null, gezeichnet: !!(route && route.gezeichnet), km: route ? +(route.L / 1000).toFixed(2) : null, hm: route ? Math.round(route.profile.up) : null };
    if (!C.routes.save(rec)) { msg("Speichern nicht möglich (Speicher des Browsers voll?)."); return; }
    ST.editId = rec.id;
    msg(route ? `«${name}» ist unter «Meine Routen» gespeichert (mit Linie, auch offline).` : `«${name}» als Entwurf gespeichert (nur Wegpunkte, ${ST.error ? "Routing fehlgeschlagen" : "noch nicht geroutet"}).`);
  }
  async function gpx() {
    const msg = (t) => ($("pl-msg").textContent = t);
    if (!route) { msg("GPX gibt es nur für eine erfolgreich berechnete Route – nie als Ersatzlinie."); return; }
    const name = $("pl-name").value.trim() || `${sportDef().label} ${C.dateCH(C.iso(C.today))}`;
    const file = name.replace(/[^\wäöüÄÖÜ -]+/g, "").trim().replace(/\s+/g, "-") + ".gpx";
    msg(await C.shareOrDownload(file, RT.gpx(route, name, ST.names)));
  }
  function loadSaved(rec) {
    open();
    ST.editId = rec.id; $("pl-name").value = rec.name || "";
    if (rec.sport && RT.SPORTS[rec.sport]) ST.sport = rec.sport;
    else if (rec.sport === "laufen" || rec.sport === "wandern" || rec.sport === "mtb" || rec.sport === "rennrad" || rec.sport === "skitour") ST.sport = rec.sport;
    ST.opts = rec.opts || {}; ST.names = rec.names || [];
    loadEffort(); renderSports(); renderOpts();
    if (rec.v && rec.route) {
      ST.vias = rec.vias.slice(); renderVias(); setAddMode(false);
      try { route = unpackRoute(rec); ST.activeRouteId = route.id; ST.error = null; afterRoute(true); $("pl-msg").textContent = `Gespeicherte Route vom ${new Date(rec.route.created).toLocaleDateString("de-CH")} (offline aus dem Speicher).`; return; }
      catch (e) { route = null; }
    }
    const pts = rec.vias || (rec.coords || []).map((c) => [c[0], c[1]]);
    if (!rec.v && pts.length > 25) { ST.manual = true; $("pl-msg").textContent = "Früher als Luftlinie gespeichert (viele Punkte): als von Hand gezeichnete Linie geladen."; }
    else if (!rec.v) $("pl-msg").textContent = "Früher als Luftlinie gespeichert: die Punkte werden jetzt als Wegpunkte geroutet.";
    ST.vias = pts; renderVias(); setAddMode(false); reroute(true);
  }

  /* ---------------- Öffnen / Schliessen ---------------- */
  let isOpen = false;
  function active() { return isOpen; }
  function open() {
    if (isOpen) return;
    isOpen = true; $("planner").hidden = false;
    setAddMode(ST.vias.length < 2);
    // iPhone: beim Punktesetzen möglichst viel Karte, mit Route halbhoch
    if (innerWidth <= 760) ST.sheet = ST.vias.length < 2 ? "min" : "half";
    applySheet(); renderAll();
    if (map) renderMap();
  }
  function close() {
    isOpen = false; $("planner").hidden = true;
    if (map) { map.getCanvas().style.cursor = ""; markers.forEach((m) => m.remove()); markers = []; if (map.getSource("rt")) { map.getSource("rt").setData({ type: "FeatureCollection", features: [] }); map.getSource("rt-cur").setData({ type: "FeatureCollection", features: [] }); map.getSource("rt-draft").setData({ type: "FeatureCollection", features: [] }); } map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); }
  }
  function planRoute() {
    if (!route) return null;
    return { ll: route.lon.map((x, i) => [x, route.lat[i]]), ele: route.ele.map((e) => (isNum(e) ? e : null)), label: route.gezeichnet ? "von Hand gezeichnet" : `geroutet (${route.prov.routing}, Profil ${route.engine})` };
  }

  window.RTUI = { init, open, close, active, mapClick, loadSaved, planRoute, state: () => ST, route: () => route, sim: () => sim, climbs: () => climbs, pieces: () => pieces,
    setCursor: (d) => setCursor(d, "api"), selectCat, selectClimb, setSheet, map: () => map };
})();
