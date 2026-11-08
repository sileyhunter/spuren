/* Ironman Notebook – Routenplaner V5.3: Rechenlogik ohne DOM (window.RT, in Node via require).
 *
 * Domänenobjekte (getrennt, je mit Herkunft):
 *   Weggeometrie  – Routing-Dienst (BRouter), je Abschnitt zwischen zwei Wegpunkten eine Anfrage
 *   Wege/Belag    – OSM-Merkmale aus der Routing-Antwort (WayTags), nichts geschätzt
 *   Wetter/Zeiten – Open-Meteo (nur nach Zustimmung), auf die Strecke interpoliert
 *   Tempo         – Physik (Rad), Minetti (Laufen), Tobler (Wandern), Hm/h (Skitour), persönlich kalibriert
 * Ein einziges Kettenmass: d = distanceAlong_m von Start (0) bis Ziel (Routenlänge).
 */
(function (root, factory) {
  const FKmod = typeof module === "object" && module.exports ? require("./formkurve.js") : root.FK;
  const RT = factory(FKmod);
  if (typeof module === "object" && module.exports) module.exports = RT; else root.RT = RT;
})(typeof self !== "undefined" ? self : this, function (FK) {
  "use strict";
  const RT = {};
  RT.VERSIONS = { route: "route-1.0", hoehe: "hoehe-1.0", anstiege: "anstiege-1.0", zeit: "zeit-rt-1.0", wetter: "wetter-rt-1.0" };
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const R_EARTH = 6371008.8, RAD = Math.PI / 180;

  /* ---------------- Geometrie ---------------- */
  RT.hav = function (lon1, lat1, lon2, lat2) {
    const dLa = (lat2 - lat1) * RAD, dLo = (lon2 - lon1) * RAD;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLo / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(x)));
  };
  /** Kurs (Grad, 0 = Nord, im Uhrzeigersinn) von Punkt 1 nach Punkt 2. */
  RT.bearing = function (lon1, lat1, lon2, lat2) {
    const p1 = lat1 * RAD, p2 = lat2 * RAD, dl = (lon2 - lon1) * RAD;
    const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  };

  /* ---------------- Sportprofile ----------------
   * engine: BRouter-Profil (Standardprofile aus misc/profiles2 des BRouter-Projekts).
   * Zugang: die Profile sperren access=no/private und für das Verkehrsmittel verbotene Wege;
   * zusätzlich bewerten wir jeden Abschnitt selbst (RT.access) und zeigen Schiebe- und Unklar-Stellen. */
  RT.SPORTS = {
    rennrad: { label: "Rennrad", art: "rad", rad: "rennrad", engine: "fastbike", modi: ["watt", "hf"], wert: { watt: 200, hf: 140 },
      text: "Asphaltierte, für Velos erlaubte Strassen; Autobahnen ausgeschlossen, Hauptstrassen und unbefestigte Wege stark bestraft." },
    gravel: { label: "Gravel", art: "rad", rad: "gravel", engine: "gravel", modi: ["watt", "hf"], wert: { watt: 180, hf: 135 },
      optionen: { schotter: { label: "Schotter bevorzugen", param: "prefer_unpaved_paths", an: "1", aus: "0", standard: true } },
      text: "Schotter- und Forststrassen, ruhige Asphaltverbindungen; steile, unbefestigte Pfade gemieden." },
    mtb: { label: "MTB", art: "rad", rad: "mtb", engine: "gravel", modi: ["watt", "hf"], wert: { watt: 170, hf: 135 },
      optionen: { technisch: { label: "Technische Trails", engine: "mtb", params: { StrictNOBicycleaccess: "1", MTB_factor: "0.5" }, standard: false } },
      text: "Standard wie Gravel (Forst- und Kieswege). «Technische Trails» nutzt das MTB-Profil; reine Fusswege bleiben gesperrt." },
    laufen: { label: "Laufen", art: "fuss", engine: "hiking-mountain", params: { SAC_scale_limit: "1", SAC_scale_preferred: "0" }, modi: ["pace", "hf"], wert: { pace: 330, hf: 145 },
      text: "Fuss- und Wanderwege, ruhige Strassen; Bergwege über T1 ausgeschlossen." },
    trail: { label: "Trail", art: "fuss", engine: "hiking-mountain", params: { SAC_scale_limit: "3", SAC_scale_preferred: "2" }, modi: ["pace", "hf"], wert: { pace: 400, hf: 150 },
      text: "Erlaubte Wander- und Bergwege bis SAC T3 (Schwierigkeit aus OSM, sonst unbekannt)." },
    wandern: { label: "Wandern", art: "fuss", engine: "hiking-mountain", params: { SAC_scale_limit: "3", SAC_scale_preferred: "1" }, modi: ["faktor", "hmh", "hf"], wert: { faktor: 100, hmh: 450, hf: 130 },
      optionen: { sac: { label: "Höchste SAC-Stufe", param: "SAC_scale_limit", werte: ["1", "2", "3", "4"], standard: "3" } },
      text: "Wanderwege nach SAC-Skala (Standard bis T3); Zugang laut OSM." },
    skitour: { label: "Skitour", art: "ski", engine: null, modi: ["hmh", "hf"], wert: { hmh: 450, hf: 145 },
      text: "Kein Wegnetz im Winter: Linie wird von Hand gezeichnet (keine Routenberechnung). Keine Aussage zur Lawinensicherheit." },
  };
  RT.engineFor = function (sport, opts) {
    const S = RT.SPORTS[sport]; if (!S || !S.engine) return null;
    let engine = S.engine; const params = Object.assign({}, S.params || {});
    for (const [k, o] of Object.entries(S.optionen || {})) {
      const v = opts && k in opts ? opts[k] : o.standard;
      if (o.engine && v) { engine = o.engine; Object.assign(params, o.params || {}); }
      else if (o.param && o.werte) params[o.param] = String(v);
      else if (o.param) params[o.param] = v ? o.an : o.aus;
    }
    params.processUnusedTags = "1";          // alle bekannten OSM-Merkmale melden (Belag, Wegart, Zugang), Route bleibt gleich
    return { engine, params };
  };

  /* ---------------- Routing-Dienst (BRouter) ---------------- */
  RT.ENDPOINT = "https://brouter.de/brouter";
  RT.brouterUrl = function (endpoint, eng, a, b) {
    const ll = [a, b].map((p) => `${(+p[0]).toFixed(6)},${(+p[1]).toFixed(6)}`).join("|");
    const extra = Object.entries(eng.params || {}).map(([k, v]) => `&profile:${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("");
    return `${endpoint || RT.ENDPOINT}?lonlats=${ll}&profile=${encodeURIComponent(eng.engine)}&alternativeidx=0&format=geojson${extra}`;
  };
  class RouteError extends Error {
    constructor(kind, msg, detail) { super(msg); this.kind = kind; this.detail = detail || ""; }
  }
  RT.RouteError = RouteError;
  /** Fehlermeldung des Servers in verständliche Sprache übersetzen (Originaltext bleibt erhalten). */
  RT.explainError = function (status, text, engine) {
    const t = String(text || "").trim();
    if (/position not mapped|not mapped in existing datafile/i.test(t)) return "Ein Punkt liegt zu weit vom erlaubten Wegnetz entfernt. Punkt näher an einen Weg setzen.";
    if (/target island/i.test(t)) return "Das Ziel liegt in einem abgeschlossenen Teil des Wegnetzes (z. B. Privatgelände). Punkt verschieben.";
    if (/no track found/i.test(t)) return "Für dieses Profil gibt es keine erlaubte Verbindung zwischen diesen Punkten.";
    if (/datafile .* not found/i.test(t)) return "Für dieses Gebiet hat der Routing-Server keine Kartendaten.";
    if (/killed|watchdog|timeout/i.test(t)) return "Der Routing-Server hat die Berechnung abgebrochen (zu lang oder überlastet). Zwischenziele setzen oder später erneut versuchen.";
    if (status === 0) return "Keine Verbindung zum Routing-Server.";
    if (status >= 500) return `Der Routing-Server meldet einen internen Fehler${engine ? ` (z. B. Profil «${engine}» dort nicht verfügbar oder Überlastung)` : ""}. Später erneut versuchen oder eine andere Sportart wählen.`;
    return "Die Route konnte nicht berechnet werden.";
  };
  /** Einen Abschnitt routen. fetchFn = window.fetch (Tests: eigener Server). */
  RT.fetchLeg = async function (fetchFn, endpoint, eng, a, b, opt) {
    const url = RT.brouterUrl(endpoint, eng, a, b);
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), (opt && opt.timeout_ms) || 30000) : null;
    let res;
    try { res = await fetchFn(url, ctl ? { signal: ctl.signal } : {}); }
    catch (e) {
      const aborted = e && e.name === "AbortError";
      throw new RouteError(aborted ? "timeout" : "netz", aborted ? "Zeitüberschreitung beim Routing-Server." : RT.explainError(0, ""), String(e && e.message || e));
    } finally { if (timer) clearTimeout(timer); }
    const text = await res.text();
    if (!res.ok) throw new RouteError("dienst", RT.explainError(res.status, text, eng.engine), `HTTP ${res.status}: ${text.slice(0, 300) || "(ohne Text)"}`);
    let gj;
    try { gj = JSON.parse(text); } catch (e) { throw new RouteError("format", "Antwort des Routing-Servers ist kein GeoJSON.", text.slice(0, 200)); }
    const leg = RT.parseBRouter(gj);
    leg.url = url.replace(/lonlats=[^&]*/, "lonlats=…");
    return leg;
  };

  RT.parseTags = function (s) {
    const o = {};
    for (const kv of String(s || "").split(" ")) { if (!kv) continue; const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }
    return o;
  };
  /** BRouter-GeoJSON → Abschnitt {coords [[lon,lat,ele|null]], edges [{i0,i1,tags,nodeTags}], props}.
   *  Jede Meldungszeile gilt bis zur Koordinate mit ihrer Endposition (Mikrograd); Zuordnung wie brouter-web (TrackEdges). */
  RT.parseBRouter = function (gj) {
    const f = gj && gj.features && gj.features[0];
    if (!f || !f.geometry || f.geometry.type !== "LineString" || !Array.isArray(f.geometry.coordinates) || f.geometry.coordinates.length < 2)
      throw new RouteError("format", "Antwort ohne Routenlinie.");
    const coords = f.geometry.coordinates.map((c) => [+c[0], +c[1], c.length > 2 && isNum(+c[2]) ? +c[2] : null]);
    const P = f.properties || {}, msgs = Array.isArray(P.messages) ? P.messages : [];
    const head = msgs[0] || [], col = (n) => head.indexOf(n);
    const iLon = col("Longitude"), iLat = col("Latitude"), iWay = col("WayTags"), iNode = col("NodeTags"), iDist = col("Distance");
    const edges = [];
    if (msgs.length > 1 && iLon >= 0 && iLat >= 0 && iWay >= 0) {
      const ilon = coords.map((c) => Math.round(c[0] * 1e6)), ilat = coords.map((c) => Math.round(c[1] * 1e6));
      let from = 0, search = 0;
      for (let m = 1; m < msgs.length; m++) {
        const r = msgs[m], lo = parseInt(r[iLon], 10), la = parseInt(r[iLat], 10);
        let j = search, ungenau = false;
        while (j < coords.length && !(ilon[j] === lo && ilat[j] === la)) j++;
        if (j >= coords.length) {
          // Endpunkt nicht gefunden: über die gemeldete Länge des Stücks zuordnen und als ungenau markieren
          ungenau = true; j = from;
          const want = iDist >= 0 ? +r[iDist] : 0; let acc = 0;
          while (j < coords.length - 1 && acc < want - 0.5) { acc += RT.hav(coords[j][0], coords[j][1], coords[j + 1][0], coords[j + 1][1]); j++; }
        }
        if (j > from || edges.length === 0) {
          edges.push({ i0: from, i1: Math.max(j, from), tags: RT.parseTags(r[iWay]), nodeTags: iNode >= 0 ? RT.parseTags(r[iNode]) : {}, dist: iDist >= 0 ? +r[iDist] : null, ungenau });
          from = Math.max(j, from);
        }
        search = j + 1;
      }
      if (from < coords.length - 1) {             // Rest ohne eigene Meldung: Merkmale unbekannt (nicht raten)
        edges.push({ i0: from, i1: coords.length - 1, tags: {}, nodeTags: {}, dist: null, ohne_meldung: true });
      }
    } else {
      edges.push({ i0: 0, i1: coords.length - 1, tags: {}, nodeTags: {}, dist: null, ohne_meldung: true });
    }
    return { coords, edges, props: { creator: P.creator || "BRouter", trackLength: +P["track-length"] || null, ascend: +P["filtered ascend"] || null, time: +P["total-time"] || null, name: P.name || "" } };
  };

  /* ---------------- Kategorien: Belag, Wegart, Zugang ---------------- */
  RT.SURFACE = {
    asphalt: { label: "Asphalt", color: "#3b5b7a" },
    hart: { label: "Anderer Hartbelag", color: "#7a93ab" },
    kies: { label: "Kies/Schotter", color: "#c9913f" },
    unbefestigt: { label: "Unbefestigt (ohne Angabe)", color: "#d9b36c" },
    natur: { label: "Naturweg", color: "#7b8f3a" },
    unbekannt: { label: "Unbekannt", color: "#b9bec4" },
  };
  const SURF_MAP = {
    asphalt: "asphalt", "chipseal": "asphalt",
    concrete: "hart", "concrete:plates": "hart", "concrete:lanes": "hart", paving_stones: "hart", sett: "hart", cobblestone: "hart", unhewn_cobblestone: "hart",
    metal: "hart", wood: "hart", paved: "hart", grass_paver: "hart", bricks: "hart",
    gravel: "kies", fine_gravel: "kies", compacted: "kies", pebblestone: "kies",
    unpaved: "unbefestigt",
    ground: "natur", dirt: "natur", earth: "natur", grass: "natur", mud: "natur", sand: "natur", clay: "natur", rock: "natur", stone: "natur", woodchips: "natur", snow: "natur", ice: "natur",
  };
  RT.surfaceCat = (tags) => (tags && tags.surface ? SURF_MAP[tags.surface] || "unbekannt" : "unbekannt");
  RT.WAY = {
    hauptstrasse: { label: "Hauptstrasse", color: "#b4443a" },
    strasse: { label: "Verbindungsstrasse", color: "#d9824a" },
    nebenstrasse: { label: "Nebenstrasse", color: "#7a93ab" },
    radweg: { label: "Radweg", color: "#2f8f83" },
    fahrweg: { label: "Feld-/Forstweg", color: "#c9913f" },
    pfad: { label: "Pfad/Wanderweg", color: "#7b8f3a" },
    fussweg: { label: "Fussweg/Treppe", color: "#9b6fb0" },
    faehre: { label: "Fähre", color: "#4a7fc1" },
    autobahn: { label: "Autobahn", color: "#5c1f1a" },
    unbekannt: { label: "Unbekannt", color: "#b9bec4" },
  };
  RT.wayCat = function (t) {
    const h = t && t.highway;
    if (t && t.route === "ferry") return "faehre";
    if (!h) return "unbekannt";
    if (/^motorway/.test(h)) return "autobahn";
    if (/^(trunk|primary)/.test(h)) return "hauptstrasse";
    if (/^(secondary|tertiary)/.test(h)) return "strasse";
    if (/^(unclassified|residential|living_street|service|road|busway)$/.test(h)) return "nebenstrasse";
    if (h === "cycleway" || ((h === "path" || h === "footway") && t.bicycle === "designated")) return "radweg";
    if (h === "track") return "fahrweg";
    if (h === "path" || h === "bridleway") return "pfad";
    if (/^(footway|pedestrian|steps|corridor|platform)$/.test(h)) return "fussweg";
    return "unbekannt";
  };
  const YES = /^(yes|designated|permissive|official)$/;
  const LIMITED = /^(destination|delivery|agricultural|forestry|customers|agricultural;forestry|forestry;agricultural|permit|discouraged)$/;
  /** Zugang je Abschnitt für «rad» oder «fuss»: ok | schieben | eingeschraenkt | unklar | verboten (+ Grund). */
  RT.access = function (t, art) {
    t = t || {};
    const h = t.highway || "";
    if (art === "rad") {
      if (/^motorway/.test(h) || t.motorroad === "yes") return { s: "verboten", g: "Autobahn/Autostrasse" };
      if (t.bicycle === "dismount") return { s: "schieben", g: "bicycle=dismount (absteigen)" };
      if (t.bicycle === "no" || t.bicycle === "use_sidepath") return t.foot === "no" ? { s: "verboten", g: `bicycle=${t.bicycle}` } : { s: "schieben", g: `bicycle=${t.bicycle}: Velo nicht erlaubt, schieben` };
      if ((t.access === "no" || t.access === "private") && !YES.test(t.bicycle || "")) return { s: "verboten", g: `access=${t.access}` };
      if (/^(footway|pedestrian|steps|corridor)$/.test(h) && !YES.test(t.bicycle || "")) return { s: "schieben", g: `highway=${h} ohne Velofreigabe` };
      if (LIMITED.test(t.bicycle || "") || (LIMITED.test(t.access || "") && !YES.test(t.bicycle || "")) || (LIMITED.test(t.vehicle || "") && !YES.test(t.bicycle || "")))
        return { s: "eingeschraenkt", g: `eingeschränkt (${t.bicycle || t.vehicle || t.access}) – Signalisation beachten` };
      if ((h === "path" || h === "bridleway") && !t.bicycle) return { s: "unklar", g: "Weg ohne Velo-Angabe: kantonale Regel und Signalisation prüfen" };
      return { s: "ok", g: "" };
    }
    if (t.foot === "no" || t.foot === "use_sidepath") return { s: "verboten", g: `foot=${t.foot}` };
    if ((t.access === "no" || t.access === "private") && !YES.test(t.foot || "")) return { s: "verboten", g: `access=${t.access}` };
    if (/^motorway|^trunk/.test(h) && !YES.test(t.foot || "")) return { s: "verboten", g: `highway=${h}` };
    if (LIMITED.test(t.foot || "") || (LIMITED.test(t.access || "") && !YES.test(t.foot || ""))) return { s: "eingeschraenkt", g: `eingeschränkt (${t.foot || t.access})` };
    return { s: "ok", g: "" };
  };
  RT.ACCESS = {
    ok: { label: "Erlaubt laut OSM", color: "#2f8f83" },
    unklar: { label: "Zugang unklar", color: "#d9b36c" },
    eingeschraenkt: { label: "Eingeschränkt", color: "#d9824a" },
    schieben: { label: "Schieben", color: "#9b6fb0" },
    verboten: { label: "Nicht erlaubt", color: "#b4443a" },
  };
  RT.SAC = { hiking: "T1", mountain_hiking: "T2", demanding_mountain_hiking: "T3", alpine_hiking: "T4", demanding_alpine_hiking: "T5", difficult_alpine_hiking: "T6" };

  /* ---------------- Route aus Abschnitten ---------------- */
  /** legs: Ergebnis von parseBRouter je Abschnitt; vias: angeforderte Punkte [[lon,lat],…] (Länge = legs + 1). */
  RT.buildRoute = function (legs, vias, meta) {
    meta = meta || {};
    const lon = [], lat = [], ele = [], d = [], segs = [], legInfo = [];
    let gapMax = 0;
    legs.forEach((leg, li) => {
      const off0 = lon.length;
      let skip = 0;
      if (off0 > 0) {
        const c = leg.coords[0], gap = RT.hav(lon[off0 - 1], lat[off0 - 1], c[0], c[1]);
        gapMax = Math.max(gapMax, gap);
        if (gap < 0.5) skip = 1;                  // gleicher Punkt am Zwischenziel: nicht doppelt
      }
      for (let i = skip; i < leg.coords.length; i++) {
        const c = leg.coords[i], n = lon.length;
        d.push(n ? d[n - 1] + RT.hav(lon[n - 1], lat[n - 1], c[0], c[1]) : 0);
        lon.push(c[0]); lat.push(c[1]); ele.push(c[2]);
      }
      const base = off0 - skip;
      for (const e of leg.edges) {
        const i0 = Math.max(off0 > 0 ? off0 - 1 : 0, base + e.i0), i1 = base + e.i1;
        if (i1 <= i0) continue;
        segs.push({ id: segs.length, leg: li, i0, i1, d0: 0, d1: 0, tags: e.tags, nodeTags: e.nodeTags, ohne_meldung: !!e.ohne_meldung });
      }
      legInfo.push({ i0: Math.max(0, base), i1: lon.length - 1, props: leg.props, url: leg.url || "" });
    });
    for (const s of segs) { s.d0 = d[s.i0]; s.d1 = d[s.i1]; }
    const art = meta.sport && RT.SPORTS[meta.sport] ? RT.SPORTS[meta.sport].art : "rad";
    for (const s of segs) {
      s.surface = RT.surfaceCat(s.tags); s.way = RT.wayCat(s.tags);
      const a = RT.access(s.tags, art === "rad" ? "rad" : "fuss"); s.access = a.s; s.accessNote = a.g;
      s.sac = s.tags.sac_scale ? RT.SAC[s.tags.sac_scale] || null : null;
      s.mtb = s.tags["mtb:scale"] != null ? "S" + String(s.tags["mtb:scale"]).replace(/[+-]$/, "") : null;
      s.smooth = s.tags.smoothness || null;
      s.reverse = s.tags.reversedirection === "yes";
    }
    const L = d.length ? d[d.length - 1] : 0;
    const viaD = [0].concat(legInfo.map((l) => d[l.i1]));
    // Abstand gewünschter Punkt ↔ Punkt am Wegnetz (BRouter schiebt Punkte auf den nächsten erlaubten Weg, auch weit weg)
    const snap = (vias || []).map((p, i) => {
      const j = i === 0 ? 0 : legInfo[Math.min(i - 1, legInfo.length - 1)] ? legInfo[Math.min(i - 1, legInfo.length - 1)].i1 : lon.length - 1;
      return lon.length ? RT.hav(p[0], p[1], lon[j], lat[j]) : null;
    });
    const route = {
      v: RT.VERSIONS.route, id: meta.id || "r" + Date.now().toString(36), sport: meta.sport || null, engine: meta.engine || null,
      lon, lat, ele, d, L, segs, legs: legInfo,
      vias: (vias || []).map((p, i) => ({ lon: p[0], lat: p[1], d: viaD[Math.min(i, viaD.length - 1)], snap_m: snap[i] })),
      snapMax: Math.max(0, ...snap.filter((x) => x != null)),
      gapMax, unvollstaendig: gapMax > 25, created: meta.created || new Date().toISOString(),
      prov: Object.assign({ routing: legs[0] ? legs[0].props.creator : "", osm: "© OpenStreetMap-Mitwirkende (ODbL)" }, meta.prov || {}),
    };
    route.profile = RT.profile(route);
    return route;
  };

  /** Freihand-Linie (Skitour): ausdrücklich gezeichnet, ohne Wegnetz. */
  RT.buildDrawn = function (pts, eles, meta) {
    const leg = { coords: pts.map((p, i) => [p[0], p[1], eles && isNum(eles[i]) ? eles[i] : null]), edges: [{ i0: 0, i1: pts.length - 1, tags: {}, nodeTags: {}, ohne_meldung: true }], props: { creator: "von Hand gezeichnet" } };
    const r = RT.buildRoute([leg], [pts[0], pts[pts.length - 1]], Object.assign({}, meta, { prov: { routing: "von Hand gezeichnet (kein Routing)" } }));
    r.gezeichnet = true;
    return r;
  };

  /* ---------------- Höhe: Abtastung, Glättung, Auf-/Abstieg (hoehe-1.0) ----------------
   * Höhen der Routing-Antwort (BRouter: SRTM-Höhenmodell an den OSM-Knoten) linear auf 20 m neu abgetastet,
   * gleitendes Mittel über 5 Punkte (100 m), Auf-/Abstieg mit 3-m-Hysterese. GPS-Höhen werden nicht verwendet. */
  RT.STEP = 20;
  RT.profile = function (route, step) {
    step = step || RT.STEP;
    const { d, lon, lat, ele, L } = route;
    const n = Math.max(1, Math.ceil(L / step));
    const P = { step, n, d: new Float64Array(n + 1), lon: new Float64Array(n + 1), lat: new Float64Array(n + 1), raw: new Float64Array(n + 1), ele: new Float64Array(n + 1),
      seg: new Int32Array(n), grade: new Float64Array(n), head: new Float64Array(n), radius: new Float64Array(n + 1), eleOk: true };
    // vorhandene Höhen auffüllen (fehlende linear zwischen bekannten Knoten), Anteil fehlender Werte merken
    const known = ele.map((e) => isNum(e));
    const nk = known.filter(Boolean).length;
    P.eleOk = nk >= Math.max(2, ele.length * 0.8);
    let j = 0, si = 0;
    const segOf = (dd) => { while (si < route.segs.length - 1 && route.segs[si].d1 <= dd) si++; return si; };
    const eAt = (k, t) => {
      const a = ele[k], b = ele[Math.min(k + 1, ele.length - 1)];
      if (isNum(a) && isNum(b)) return a + (b - a) * t;
      return isNum(a) ? a : isNum(b) ? b : null;
    };
    for (let k = 0; k <= n; k++) {
      const dd = Math.min(k * step, L);
      while (j < d.length - 2 && d[j + 1] < dd) j++;
      const span = d[j + 1] - d[j] || 1, t = Math.max(0, Math.min(1, (dd - d[j]) / span));
      P.d[k] = dd; P.lon[k] = lon[j] + (lon[j + 1] - lon[j]) * t; P.lat[k] = lat[j] + (lat[j + 1] - lat[j]) * t;
      const e = eAt(j, t); P.raw[k] = e == null ? NaN : e;
    }
    // Lücken in der Höhe füllen (vor/zurück), damit Glättung nicht abbricht
    let last = NaN;
    for (let k = 0; k <= n; k++) { if (isNum(P.raw[k])) last = P.raw[k]; else if (isNum(last)) P.raw[k] = last; }
    last = NaN;
    for (let k = n; k >= 0; k--) { if (isNum(P.raw[k])) last = P.raw[k]; else if (isNum(last)) P.raw[k] = last; else P.raw[k] = 0; }
    const W = 2;
    for (let k = 0; k <= n; k++) {
      let s = 0, c = 0;
      for (let q = Math.max(0, k - W); q <= Math.min(n, k + W); q++) { s += P.raw[q]; c++; }
      P.ele[k] = s / c;
    }
    for (let k = 0; k < n; k++) {
      const ds = P.d[k + 1] - P.d[k] || step;
      P.grade[k] = (P.ele[k + 1] - P.ele[k]) / ds;
      P.head[k] = RT.bearing(P.lon[k], P.lat[k], P.lon[k + 1], P.lat[k + 1]);
      P.seg[k] = route.segs.length ? segOf((P.d[k] + P.d[k + 1]) / 2) : -1;
    }
    // Kurvenradius aus drei Punkten im Abstand von 20 m (Umkreis), für die Kurvenbegrenzung bergab
    const xy = (k) => [P.lon[k] * Math.cos(P.lat[k] * RAD) * 111320, P.lat[k] * 110540];
    for (let k = 0; k <= n; k++) {
      if (k === 0 || k === n) { P.radius[k] = Infinity; continue; }
      const [ax, ay] = xy(k - 1), [bx, by] = xy(k), [cx, cy] = xy(k + 1);
      const ab = Math.hypot(bx - ax, by - ay), bc = Math.hypot(cx - bx, cy - by), ca = Math.hypot(ax - cx, ay - cy);
      const area2 = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
      P.radius[k] = area2 < 1e-6 ? Infinity : (ab * bc * ca) / (2 * area2);
    }
    let up = 0, dn = 0, ref = P.ele[0];
    for (let k = 1; k <= n; k++) { const v = P.ele[k]; if (v - ref >= 3) { up += v - ref; ref = v; } else if (ref - v >= 3) { dn += ref - v; ref = v; } }
    P.up = up; P.down = dn;
    P.min = Math.min(...P.ele); P.max = Math.max(...P.ele);
    return P;
  };

  /* ---------------- Position auf der Route ---------------- */
  /** Kettenmass → Koordinate, Höhe (geglättet), Steigung, Abschnitt. Interpolation entlang der echten Linie. */
  RT.at = function (route, dd) {
    const { d, lon, lat } = route, P = route.profile;
    dd = Math.max(0, Math.min(route.L, dd));
    let lo = 0, hi = d.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= dd) lo = m; else hi = m; }
    const span = d[hi] - d[lo] || 1, t = Math.max(0, Math.min(1, (dd - d[lo]) / span));
    const k = Math.min(P.n - 1, Math.max(0, Math.floor(dd / P.step)));
    const tk = Math.max(0, Math.min(1, (dd - P.d[k]) / ((P.d[k + 1] - P.d[k]) || 1)));
    let s = 0; const segs = route.segs;
    if (segs.length) { let a = 0, b = segs.length - 1; while (a < b) { const m = (a + b) >> 1; if (segs[m].d1 < dd) a = m + 1; else b = m; } s = a; }
    return { d: dd, lon: lon[lo] + (lon[hi] - lon[lo]) * t, lat: lat[lo] + (lat[hi] - lat[lo]) * t, i: lo, t,
      ele: P.ele[k] + (P.ele[k + 1] - P.ele[k]) * tk, grade: P.grade[k], k, seg: segs[s] || null };
  };
  /** Geo-Punkt auf die nächstgelegene Stelle der Linie projizieren (nicht auf den nächsten Wegpunkt).
   *  opt.near_d: bei mehreren fast gleich nahen Stellen (Hin- und Rückweg) die zum bisherigen Cursor nächste. */
  RT.project = function (route, plon, plat, opt) {
    opt = opt || {};
    const { lon, lat, d } = route, cosl = Math.cos(plat * RAD);
    const X = (i) => (lon[i] - plon) * cosl * 111320, Y = (i) => (lat[i] - plat) * 110540;
    const cands = [];
    let best = null;
    for (let i = 0; i < lon.length - 1; i++) {
      const ax = X(i), ay = Y(i), bx = X(i + 1), by = Y(i + 1);
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      let t = l2 > 0 ? -(ax * vx + ay * vy) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const px = ax + vx * t, py = ay + vy * t, dist = Math.hypot(px, py);
      const c = { i, t, dist, d: d[i] + (d[i + 1] - d[i]) * t };
      if (!best || dist < best.dist) best = c;
      if (opt.near_d != null && dist < (opt.tol_m || 30)) cands.push(c);
    }
    if (best && opt.near_d != null && cands.length > 1) {
      const pool = cands.filter((c) => c.dist <= best.dist + 5);
      pool.sort((a, b) => Math.abs(a.d - opt.near_d) - Math.abs(b.d - opt.near_d));
      return pool[0];
    }
    return best;
  };
  /** Teilstück der Linie zwischen zwei Kettenmassen als Koordinatenliste. */
  RT.slice = function (route, d0, d1) {
    if (d1 < d0) [d0, d1] = [d1, d0];
    const a = RT.at(route, d0), b = RT.at(route, d1), out = [[a.lon, a.lat]];
    for (let i = a.i + 1; i <= b.i; i++) out.push([route.lon[i], route.lat[i]]);
    out.push([b.lon, b.lat]);
    return out;
  };

  /* ---------------- Anstiege und Abfahrten (anstiege-1.0) ----------------
   * Auf der geglätteten 20-m-Höhe: Wendepunkte mit 15-m-Hysterese, Anstieg = Tal→Gipfel mit ≥ 25 Hm und ≥ 2,5 % im Mittel,
   * flache Anläufe (< 1 Hm je 100 m) an Anfang und Ende abgeschnitten. Maximalsteigung über 100 m nur, wenn die
   * Höhenpunkte der Route im Anstieg höchstens 60 m auseinanderliegen und der Anstieg ≥ 300 m lang ist. */
  RT.climbs = function (route, opt) {
    opt = Object.assign({ hyst: 15, minGain: 25, minGrade: 0.025 }, opt || {});
    const P = route.profile, e = P.ele, n = P.n, H = opt.hyst;
    // Zickzack-Filter: Wendepunkt erst bestätigt, wenn das Profil um ≥ H Meter umkehrt
    const ext = [0];
    let trend = 0, minK = 0, maxK = 0, cand = 0;
    for (let k = 1; k <= n; k++) {
      const v = e[k];
      if (trend === 0) {
        if (v < e[minK]) minK = k;
        if (v > e[maxK]) maxK = k;
        if (v - e[minK] >= H) { if (minK > 0) ext.push(minK); trend = 1; cand = k; }
        else if (e[maxK] - v >= H) { if (maxK > 0) ext.push(maxK); trend = -1; cand = k; }
      } else if (trend === 1) {
        if (v >= e[cand]) cand = k;
        else if (e[cand] - v >= H) { ext.push(cand); trend = -1; cand = k; }
      } else {
        if (v <= e[cand]) cand = k;
        else if (v - e[cand] >= H) { ext.push(cand); trend = 1; cand = k; }
      }
    }
    if (trend !== 0 && cand !== ext[ext.length - 1]) ext.push(cand);
    if (ext[ext.length - 1] !== n) ext.push(n);
    for (let q = 0; q < ext.length; q++) ext[q] = { k: ext[q], v: e[ext[q]] };
    // Original-Punktdichte für die Auflösungsprüfung
    const nodeGap = (d0, d1) => {
      let mx = 0, prev = null;
      for (let i = 0; i < route.d.length; i++) { const dd = route.d[i]; if (dd < d0) { prev = dd; continue; } if (dd > d1) { if (prev != null) mx = Math.max(mx, dd - prev); break; } if (prev != null) mx = Math.max(mx, dd - prev); prev = dd; }
      return mx;
    };
    const out = { up: [], down: [] };
    for (let q = 0; q < ext.length - 1; q++) {
      let a = ext[q].k, b = ext[q + 1].k;
      if (b <= a) continue;
      const rising = e[b] > e[a];
      const sgn = rising ? 1 : -1;
      const win = Math.max(1, Math.round(100 / P.step));
      // Ränder an die erste Ankunft auf der End- bzw. die letzte Stelle auf der Anfangshöhe legen:
      // Plateaus und kleine Wellen am Rand zählen nicht zum Anstieg (Toleranz 15 % der Hysterese, mind. 1 m,
      // weil die Glättung Täler leicht anhebt und Kuppen absenkt)
      const tol = Math.max(1, 0.15 * H);
      { let k = a; while (k < b && sgn * (e[b] - e[k]) > tol) k++; b = Math.max(a + 1, k); }
      { let k = b; while (k > a && sgn * (e[k] - e[a]) > tol) k--; a = Math.min(b - 1, k); }
      while (a < b - win && sgn * (e[a + win] - e[a]) < 1) a++;
      while (b > a + win && sgn * (e[b] - e[b - win]) < 1) b--;
      const gain = sgn * (e[b] - e[a]), len = P.d[b] - P.d[a];
      if (gain < opt.minGain || len <= 0 || gain / len < opt.minGrade) continue;
      let mx = null;
      const fine = nodeGap(P.d[a], P.d[b]) <= 60 && len >= 300;
      if (fine) { mx = 0; for (let k = a; k + win <= b; k++) mx = Math.max(mx, sgn * (e[k + win] - e[k]) / (P.d[k + win] - P.d[k])); }
      let hm = 0, ref = e[a];
      for (let k = a + 1; k <= b; k++) { const v = e[k]; if (sgn * (v - ref) >= 1) { hm += sgn * (v - ref); ref = v; } else if (sgn * (ref - v) >= 1) ref = v; }
      const c = { id: (rising ? "a" : "b") + out[rising ? "up" : "down"].length, d0: P.d[a], d1: P.d[b], len, hm: Math.round(hm), netto: Math.round(gain),
        mittel: gain / len, max: mx, max_grund: fine ? "über 100 m" : "Datenauflösung zu grob für Maximalsteigung", e0: e[a], e1: e[b] };
      out[rising ? "up" : "down"].push(c);
    }
    return out;
  };

  /* ---------------- Kategorienstücke je Analyseansicht ---------------- */
  RT.GRADE_BINS = [
    { k: "g_m8", label: "Gefälle über 8 %", lo: -Infinity, hi: -0.08, color: "#2c6e9b" },
    { k: "g_m4", label: "Gefälle 4–8 %", lo: -0.08, hi: -0.04, color: "#7fb2d6" },
    { k: "g_0", label: "flach (±4 %)", lo: -0.04, hi: 0.04, color: "#4f5d6b" },
    { k: "g_4", label: "Steigung 4–8 %", lo: 0.04, hi: 0.08, color: "#e0a458" },
    { k: "g_8", label: "Steigung 8–12 %", lo: 0.08, hi: 0.12, color: "#d9694a" },
    { k: "g_12", label: "Rampe über 12 %", lo: 0.12, hi: Infinity, color: "#9c2f2a" },
  ];
  RT.gradeBin = (g) => (RT.GRADE_BINS.find((b) => g >= b.lo && g < b.hi) || RT.GRADE_BINS[2]).k;
  /** Stücke [{id, d0, d1, cat}] einer Kategorisierung. catOfStep(k) für 20-m-Schritte, oder je Abschnitt (Belag/Wegart). */
  RT.pieces = function (route, tab, catOfStep) {
    const out = [];
    const push = (d0, d1, cat) => {
      const last = out[out.length - 1];
      if (last && last.cat === cat && Math.abs(last.d1 - d0) < 0.01) last.d1 = d1;
      else out.push({ id: tab + ":" + out.length, d0, d1, cat });
    };
    if (tab === "belag" || tab === "wegart" || tab === "zugang" || tab === "sac") {
      const f = tab === "belag" ? (s) => s.surface : tab === "wegart" ? (s) => s.way : tab === "zugang" ? (s) => s.access : (s) => s.sac || s.mtb || "unbekannt";
      if (!route.segs.length) push(0, route.L, "unbekannt");
      let prevEnd = 0;
      for (const s of route.segs) { if (s.d0 > prevEnd + 0.01) push(prevEnd, s.d0, "unbekannt"); push(s.d0, s.d1, f(s)); prevEnd = s.d1; }
      if (prevEnd < route.L - 0.01) push(prevEnd, route.L, "unbekannt");
    } else {
      const P = route.profile;
      for (let k = 0; k < P.n; k++) push(P.d[k], P.d[k + 1], catOfStep(k));
    }
    out.forEach((p, i) => (p.id = tab + ":" + i));
    return out;
  };
  RT.stats = function (pieces, L) {
    const m = new Map();
    for (const p of pieces) m.set(p.cat, (m.get(p.cat) || 0) + (p.d1 - p.d0));
    return [...m.entries()].map(([cat, len]) => ({ cat, len, pct: L > 0 ? (len / L) * 100 : 0 })).sort((a, b) => b.len - a.len);
  };

  /* ---------------- Tempo-Modelle (zeit-rt-1.0) ---------------- */
  RT.RAD = {   // Annahmen, nicht kalibriert: Rollwiderstand je Belag (Quelle: veröffentlichte Rollwiderstandsmessungen, gerundet), Abfahrtsgrenzen km/h
    rennrad: { kg: 8.5, cda: 0.30, crr: { asphalt: 0.0040, hart: 0.0060, kies: 0.0120, unbefestigt: 0.0120, natur: 0.0200, unbekannt: 0.0050 }, vmax: { asphalt: 60, hart: 40, kies: 30, unbefestigt: 30, natur: 20, unbekannt: 45 }, alat: 3.5 },
    gravel: { kg: 10, cda: 0.36, crr: { asphalt: 0.0050, hart: 0.0065, kies: 0.0090, unbefestigt: 0.0100, natur: 0.0140, unbekannt: 0.0070 }, vmax: { asphalt: 55, hart: 40, kies: 40, unbefestigt: 35, natur: 25, unbekannt: 40 }, alat: 3.0 },
    mtb: { kg: 13, cda: 0.42, crr: { asphalt: 0.0070, hart: 0.0080, kies: 0.0100, unbefestigt: 0.0110, natur: 0.0140, unbekannt: 0.0100 }, vmax: { asphalt: 50, hart: 35, kies: 40, unbefestigt: 35, natur: 30, unbekannt: 35 }, alat: 3.0 },
  };
  RT.WIND_HEIGHT = 0.6;     // 10-m-Wind auf Fahrhöhe (logarithmisches Profil, Rauigkeit ~0,1 m): Faktor ≈ 0,6
  /** Minetti et al. (2002): Energiekosten Laufen J/(kg·m) je Steigung i (Bruch), gültig −0,45…0,45. */
  RT.minetti = function (i) { i = Math.max(-0.45, Math.min(0.45, i)); return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6; };
  /** Tobler (1993): Gehtempo km/h je Steigung (Bruch). */
  RT.tobler = (g) => 6 * Math.exp(-3.5 * Math.abs(g + 0.05));

  /** Zeit je 20-m-Schritt. inp: {mode, value, start_unix, pause_share, wetter (fn), kal (Kalibrierung), rad: {m, cda}}.
   *  Ergebnis: {t[] (s ab Start an jedem Stützpunkt), v[] (m/s je Schritt), moving_s, info, unzureichend?} */
  RT.simulate = function (route, inp) {
    const S = RT.SPORTS[route.sport] || RT.SPORTS.rennrad, P = route.profile, n = P.n;
    const t = new Float64Array(n + 1), v = new Float64Array(n), wAlong = new Float64Array(n), cap = new Uint8Array(n);
    const info = { modell: "", hinweise: [] };
    const segAt = (k) => (P.seg[k] >= 0 ? route.segs[P.seg[k]] : null);
    const wx = inp.wetter || null;
    if (S.art === "rad") {
      const B = RT.RAD[S.rad] || RT.RAD.rennrad;
      const m = (inp.rad && inp.rad.m) || 75 + B.kg, cda = (inp.rad && inp.rad.cda) || B.cda;
      let P0 = inp.value;
      if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.rad_hf_w;
        if (!k || !k.ok) return { unzureichend: true, grund: "Keine ausreichende persönliche Kalibrierung HF → Watt (konstante 10-min-Blöcke).", info };
        P0 = k.a + k.b * inp.value;
        info.modell = `HF ${Math.round(inp.value)} → ${Math.round(P0)} W (persönliche Kalibrierung, Hold-out-Fehler ±${Math.round(k.mae)} W)`;
      } else info.modell = `${Math.round(P0)} W konstant, bergab rollen ab −2 %`;
      info.P = P0;
      // empirische Korrektur aus echten Fahrten (Median Physik/Ist, kalibrierung-1.0), abschaltbar
      const kr = inp.kal && inp.kal.rad_modell && inp.kal.rad_modell[S.rad === "rennrad" ? "rennrad" : "mtb"];
      const corr = kr && kr.ok && inp.korrektur !== false ? 1 / kr.faktor : 1;
      if (corr !== 1) info.korrektur = { faktor: corr, n: kr.n, text: `Korrektur ×${corr.toFixed(2)} aus ${kr.n} echten Fahrten (${S.rad === "rennrad" ? "Rennrad" : "MTB/Gravel"})` };
      let schieb = false;
      for (let k = 0; k < n; k++) {
        const s = segAt(k), surf = s ? s.surface : "unbekannt", g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        const w = wx ? wx(k, t[k]) : null;
        const along = w ? w.along * RT.WIND_HEIGHT : 0; wAlong[k] = along;
        const wet = w && w.regen > 0.2;
        // Pacing: volle Leistung bis −2 %, linear auf 30 % bei −5 %, darunter rollen (0 W)
        const Pk = g >= -0.02 ? P0 : g <= -0.05 ? 0 : P0 * (0.3 + 0.7 * (g + 0.05) / 0.03);
        const rmin = Math.min(P.radius[k], P.radius[k + 1]);
        const vCurve = Math.sqrt((wet ? B.alat * 0.7 : B.alat) * Math.max(5, rmin));
        let vmax = Math.min((B.vmax[surf] || 40) / 3.6 * (wet ? 0.85 : 1), vCurve);
        const q = { m, cda, crr: B.crr[surf] || B.crr.unbekannt, grade: g, rho: FK.rho(w ? w.temp : 15, P.ele[k]), wind: along, eta: 0.976, vmax };
        let vk = FK.speedFromPower(Pk, q);
        if (vk >= vmax - 1e-6) cap[k] = 1;
        if (vk < 0.3) { // 0 W in der Ebene oder zu steil: Schiebetempo 1 m/s statt Stillstand
          vk = 1.0; schieb = true;
        }
        if (s && s.access === "schieben") vk = Math.min(vk, 1.2);
        vk /= corr;
        v[k] = vk; t[k + 1] = t[k] + ds / vk;
      }
      if (schieb) info.hinweise.push("Abschnitte mit sehr geringem Tempo sind als Schieben (3,6 km/h) gerechnet.");
      if (route.segs.some((s) => s.access === "schieben")) info.hinweise.push("Schiebestrecken (Velo nicht erlaubt) mit 4,3 km/h gerechnet.");
    } else if (S.art === "fuss" && route.sport !== "wandern") {
      let vflat;
      if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.lauf_hf_pace;
        if (!k || !k.ok) return { unzureichend: true, grund: "Unzureichende Daten: keine validierte persönliche Kalibrierung HF → Pace (flache, gleichmässige Laufabschnitte).", info };
        vflat = k.a + k.b * inp.value;
        info.modell = `HF ${Math.round(inp.value)} → ${FK.pace(1000 / vflat)} min/km flach (Hold-out-Fehler ±${Math.round(k.mae)} s/km)`;
      } else { vflat = 1000 / inp.value; info.modell = `Pace ${FK.pace(inp.value)} min/km flach, Steigung nach Minetti`; }
      info.vflat = vflat;
      const kg = inp.kal && inp.kal.lauf_gap;
      const corr = kg && kg.ok && inp.korrektur !== false ? 1 / kg.faktor : 1;
      if (corr !== 1) info.korrektur = { faktor: corr, n: kg.n, text: `Korrektur ×${corr.toFixed(2)} aus ${kg.n} echten Läufen` };
      const c0 = RT.minetti(0);
      const vamWalk = (inp.kal && inp.kal.wandern_vam && inp.kal.wandern_vam.ok ? inp.kal.wandern_vam.median : 900) / 3600;
      for (let k = 0; k < n; k++) {
        const s = segAt(k), g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        let vk = vflat * c0 / RT.minetti(g);
        const techn = s && (s.surface === "natur" || s.way === "pfad" || (s.sac && s.sac >= "T2"));
        if (g < 0) vk = Math.min(vk, vflat * (s && s.sac && s.sac >= "T3" ? 1.0 : techn ? 1.1 : 1.2));
        if (g > 0.2) vk = Math.min(vk, Math.max(vamWalk / g, 0.6));       // steil: gehen (persönliche Hm/h, sonst 900 Hm/h)
        if (s && s.way === "fussweg" && s.tags.highway === "steps") vk = Math.min(vk, 1.0);
        vk /= corr;
        v[k] = vk; t[k + 1] = t[k] + ds / vk;
      }
    } else if (route.sport === "wandern") {
      let f = 1;
      const kt = inp.kal && inp.kal.wandern_tobler;
      if (inp.mode === "faktor") { f = (inp.value / 100) * (kt && kt.ok ? kt.faktor : 1); info.modell = `Tobler × ${(f).toFixed(2)}${kt && kt.ok ? " (persönlicher Faktor " + kt.faktor.toFixed(2) + ")" : " (nicht kalibriert)"}`; }
      else if (inp.mode === "hmh") info.modell = `Aufstieg ${Math.round(inp.value)} Hm/h, flach/bergab nach Tobler`;
      else if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.wandern_hf_vam;
        if (!k || !k.ok) return { unzureichend: true, grund: "Unzureichende Daten: keine validierte Kalibrierung HF → Hm/h beim Wandern.", info };
        info.modell = `HF ${Math.round(inp.value)} → ${Math.round(k.a + k.b * inp.value)} Hm/h bergauf (Hold-out-Fehler ±${Math.round(k.mae)} Hm/h)`;
      }
      const vam = inp.mode === "hmh" ? inp.value : inp.mode === "hf" ? inp.kal.wandern_hf_vam.a + inp.kal.wandern_hf_vam.b * inp.value : null;
      const fBase = kt && kt.ok ? kt.faktor : 1;
      info.faktor = inp.mode === "faktor" ? f : fBase;
      for (let k = 0; k < n; k++) {
        const s = segAt(k), g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        let vk = RT.tobler(g) / 3.6 * (inp.mode === "faktor" ? f : fBase);
        // Hm/h-Modus: bergauf bestimmt das Vertikaltempo, höchstens das eigene Flachtempo
        if (vam && g > 0.03) vk = Math.min(RT.tobler(0) / 3.6 * fBase, vam / 3600 / g);
        if (s && s.sac && s.sac >= "T4") vk *= 0.7;
        v[k] = Math.max(0.2, vk); t[k + 1] = t[k] + ds / v[k];
      }
    } else { // Skitour: nur Aufstieg berechenbar
      let vam = inp.value;
      if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.skitour_hf_vam;
        if (!k || !k.ok) return { unzureichend: true, grund: "Unzureichende Daten: keine validierte Kalibrierung HF → Hm/h bei Skitouren.", info };
        vam = k.a + k.b * inp.value;
        info.modell = `HF ${Math.round(inp.value)} → ${Math.round(vam)} Hm/h (Hold-out-Fehler ±${Math.round(k.mae)} Hm/h)`;
      } else info.modell = `Aufstieg ${Math.round(vam)} Hm/h, flach 4 km/h`;
      let down = 0;
      for (let k = 0; k < n; k++) {
        const g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        let vk;
        if (g >= 0.02) vk = Math.min(4 / 3.6, vam / 3600 / g + 0.0);
        else if (g > -0.05) vk = 4 / 3.6;
        else { vk = NaN; down += ds; }
        v[k] = vk; t[k + 1] = t[k] + (isNum(vk) ? ds / vk : 0);
      }
      info.abfahrt_m = down;
      if (down > 0) info.hinweise.push("Abfahrt nicht bestimmbar (Schnee, Gelände, Sicht): nicht in der Zeit enthalten.");
    }
    return { t, v, wAlong, cap, moving_s: t[n], info };
  };

  /** Zeitband: Szenarien aus Kalibrier-/Modellfehler und (ohne Wetterprognose) Wind ±2 m/s. */
  RT.eta = function (route, inp) {
    const base = RT.simulate(route, inp);
    if (base.unzureichend) return base;
    const S = RT.SPORTS[route.sport] || RT.SPORTS.rennrad, scen = [];
    const err = RT.modelError(route.sport, inp);
    const variants = [];
    if (S.art === "rad") {
      const dP = inp.mode === "hf" ? (inp.kal.rad_hf_w.mae || 10) : 0;
      if (dP) { variants.push({ ...inp, mode: "watt", value: base.info.P - dP }); variants.push({ ...inp, mode: "watt", value: base.info.P + dP }); }
      if (!inp.wetter) for (const w of [-2, 2]) variants.push({ ...inp, mode: "watt", value: base.info.P, wetter: () => ({ along: w / RT.WIND_HEIGHT, temp: 15, regen: 0 }) });
    } else if (S.art === "fuss" && route.sport !== "wandern" && inp.mode === "hf") {
      const pace = 1000 / base.info.vflat, e = inp.kal.lauf_hf_pace.mae || 15;
      variants.push({ ...inp, mode: "pace", value: pace - e }, { ...inp, mode: "pace", value: pace + e });
    }
    for (const vInp of variants) { const r = RT.simulate(route, vInp); if (!r.unzureichend) scen.push(r.moving_s); }
    scen.push(base.moving_s * (1 - err.rel), base.moving_s * (1 + err.rel));
    base.band = [Math.min(base.moving_s, ...scen), Math.max(base.moving_s, ...scen)];
    base.fehler = err;
    return base;
  };
  /** Modellfehler je Sportart: aus Kalibrierung (Hold-out), sonst konservative Annahme. */
  RT.modelError = function (sport, inp) {
    const k = inp.kal || {};
    const pick = (o, def, txt) => (o && o.ok && isNum(o.mae_rel) ? { rel: o.mae_rel, quelle: `Hold-out ${o.n_test} Einheiten`, text: txt } : { rel: def, quelle: "Annahme (nicht validiert)", text: txt });
    if (sport === "rennrad" || sport === "gravel" || sport === "mtb") return pick(k.rad_modell && k.rad_modell[sport === "rennrad" ? "rennrad" : "mtb"], 0.1, "Rad-Physik gegen echte Fahrten");
    if (sport === "laufen" || sport === "trail") return pick(k.lauf_gap, sport === "trail" ? 0.15 : 0.08, "Lauf-Modell gegen echte Läufe");
    if (sport === "wandern") return pick(k.wandern_tobler, 0.15, "Tobler × persönlicher Faktor gegen echte Wanderungen");
    return pick(k.skitour_hf_vam, 0.2, "Skitour-Aufstieg");
  };

  /* ---------------- Wetter entlang der Route (wetter-rt-1.0) ---------------- */
  /** Stützpunkte etwa alle 5 km (höchstens 25), immer Start und Ziel. */
  RT.weatherPoints = function (route, maxN) {
    maxN = maxN || 25;
    const L = route.L, step = Math.max(5000, L / (maxN - 1)), out = [];
    for (let dd = 0; dd < L; dd += step) out.push(dd);
    out.push(L);
    return out.map((dd) => { const a = RT.at(route, dd); return { d: dd, lon: +a.lon.toFixed(4), lat: +a.lat.toFixed(4), ele: Math.round(a.ele) }; });
  };
  RT.openMeteoUrl = function (pts, t0, t1) {
    const day = (u) => new Date(u * 1000).toISOString().slice(0, 10);
    return "https://api.open-meteo.com/v1/forecast?latitude=" + pts.map((p) => p.lat).join(",") + "&longitude=" + pts.map((p) => p.lon).join(",") +
      "&elevation=" + pts.map((p) => p.ele).join(",") +
      "&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT" +
      `&start_date=${day(t0 - 3600)}&end_date=${day(t1 + 3600)}`;
  };
  /** Open-Meteo-Antwort (Liste je Punkt) → Funktion (d, unix) → Wetter. Wind vektoriell (u, v) interpoliert. */
  RT.weatherField = function (pts, resp) {
    const arr = Array.isArray(resp) ? resp : [resp];
    if (arr.length !== pts.length) throw new Error("Wetterantwort passt nicht zu den Stützpunkten.");
    const series = arr.map((r) => {
      const h = r.hourly || {};
      const uv = (h.wind_speed_10m || []).map((s, i) => {
        const dirTo = ((h.wind_direction_10m[i] + 180) % 360) * RAD;   // meteorologisch: Richtung, AUS der der Wind kommt
        return [s * Math.sin(dirTo), s * Math.cos(dirTo)];               // u = Ost-, v = Nordkomponente der Bewegung
      });
      return { time: h.time || [], temp: h.temperature_2m || [], rain: h.precipitation || [], pop: h.precipitation_probability || [], gust: h.wind_gusts_10m || [], uv,
        gridEle: r.elevation, lat: r.latitude, lon: r.longitude };
    });
    const at = (s, unix) => {
      const T = s.time; if (!T.length) return null;
      if (unix <= T[0]) return { i: 0, f: 0 };
      if (unix >= T[T.length - 1]) return { i: T.length - 1, f: 0 };
      let i = 0; while (i < T.length - 2 && T[i + 1] <= unix) i++;
      return { i, f: (unix - T[i]) / (T[i + 1] - T[i]) };
    };
    const lerp = (a, b, f) => (isNum(a) && isNum(b) ? a + (b - a) * f : isNum(a) ? a : b);
    const one = (s, unix) => {
      const p = at(s, unix); if (!p) return null;
      const j = Math.min(p.i + 1, s.time.length - 1);
      // Niederschlag: Summe der vorangehenden Stunde → Stunde, in der der Zeitpunkt liegt
      const iRain = Math.min(s.time.length - 1, p.f > 0 ? j : p.i);
      return { temp: lerp(s.temp[p.i], s.temp[j], p.f), regen: s.rain[iRain], pop: s.pop[iRain], gust: lerp(s.gust[p.i], s.gust[j], p.f),
        u: lerp(s.uv[p.i] && s.uv[p.i][0], s.uv[j] && s.uv[j][0], p.f), v: lerp(s.uv[p.i] && s.uv[p.i][1], s.uv[j] && s.uv[j][1], p.f) };
    };
    const field = function (dd, unix, headingDeg) {
      let a = 0; while (a < pts.length - 2 && pts[a + 1].d < dd) a++;
      const b = Math.min(a + 1, pts.length - 1), f = pts[b].d > pts[a].d ? Math.max(0, Math.min(1, (dd - pts[a].d) / (pts[b].d - pts[a].d))) : 0;
      const A = one(series[a], unix), Bv = one(series[b], unix);
      if (!A || !Bv) return null;
      const u = lerp(A.u, Bv.u, f), v = lerp(A.v, Bv.v, f), speed = Math.hypot(u, v);
      const dirFrom = (Math.atan2(u, v) / RAD + 180 + 360) % 360;
      const out = { temp: lerp(A.temp, Bv.temp, f), regen: f < 0.5 ? A.regen : Bv.regen, pop: f < 0.5 ? A.pop : Bv.pop, gust: lerp(A.gust, Bv.gust, f), speed, dirFrom };
      if (isNum(headingDeg)) { const hr = headingDeg * RAD; out.along = u * Math.sin(hr) + v * Math.cos(hr); out.cross = u * Math.cos(hr) - v * Math.sin(hr); }
      return out;
    };
    field.quality = pts.map((p, i) => ({ d: p.d, ele: p.ele, gridEle: series[i].gridEle, diff: isNum(series[i].gridEle) ? series[i].gridEle - p.ele : null }));
    return field;
  };
  /** Rückenwindkomponente (m/s, positiv = Rückenwind) aus meteorologischer Richtung (woher) und Fahrtrichtung. */
  RT.windAlong = function (speed, dirFromDeg, headingDeg) { return speed * Math.cos(((dirFromDeg + 180) - headingDeg) * RAD); };

  /** Simulation mit Wetter: Zeit ↔ Wetter iterativ (Wetter am Ort zur geschätzten Durchfahrtszeit). */
  RT.etaWithWeather = function (route, inp, field) {
    const P = route.profile;
    let res = RT.eta(route, inp);
    if (!field || res.unzureichend) return res;
    for (let it = 0; it < 3; it++) {
      const tPrev = res.t;
      const wx = (k, tk) => field((P.d[k] + P.d[k + 1]) / 2, inp.start_unix + (tPrev ? tPrev[k] : tk), P.head[k]);
      const next = RT.eta(route, { ...inp, wetter: wx });
      const diff = Math.abs(next.moving_s - res.moving_s);
      res = next;
      if (diff < 30) break;
    }
    return res;
  };

  /* ---------------- GPX ---------------- */
  const xmlEsc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  RT.gpx = function (route, name, viaNames) {
    if (!route || route.unvollstaendig) throw new Error("Route unvollständig: kein GPX.");
    const P = route.profile;
    const wpts = route.vias.map((p, i) => `<wpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><name>${xmlEsc((viaNames && viaNames[i]) || (i === 0 ? "Start" : i === route.vias.length - 1 ? "Ziel" : "Zwischenziel " + i))}</name></wpt>`).join("\n");
    const pts = route.lon.map((lo, i) => { const e = route.ele[i]; return `<trkpt lat="${route.lat[i].toFixed(6)}" lon="${lo.toFixed(6)}">${isNum(e) ? `<ele>${e.toFixed(1)}</ele>` : ""}</trkpt>`; }).join("\n");
    const desc = `${route.gezeichnet ? "Von Hand gezeichnet (kein Routing)" : "Geroutet mit " + route.prov.routing + (route.engine ? ", Profil " + route.engine : "")}; ${route.prov.osm}; ${(route.L / 1000).toFixed(1)} km, ${Math.round(P.up)} m Aufstieg`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Ironman Notebook" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${xmlEsc(name)}</name><desc>${xmlEsc(desc)}</desc></metadata>\n${wpts}\n<trk><name>${xmlEsc(name)}</name><trkseg>\n${pts}\n</trkseg></trk>\n</gpx>\n`;
  };

  return RT;
});
