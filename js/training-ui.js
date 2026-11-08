/* Ironman Notebook – Smart Training Routes V5.7 (Oberfläche). Rechenlogik: js/training-route.js (window.TR),
 * Routing, Belag und Zeitprognose: js/route.js (window.RT), Planer: js/routen-ui.js (window.RTUI).
 * Zugang über den Trainingskalender («Passende Route finden») und den Routenplaner («Training → Route»); kein eigener Tab.
 * Startorte und gewählte Vorschläge liegen verschlüsselt auf dem Gerät (Eingaben), bis Silas sie exportiert. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const UI = () => window.V5UI, C = () => window.V5UI && window.V5UI.C, D = () => (C() && C().D) || {};
  const R = () => window.RTUI, RT = () => window.RT, TR = () => window.TR, FK = () => window.FK;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (v, d) => (isNum(v) ? Number(v).toLocaleString("de-CH", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }) : "–");
  const km = (m) => num(m / 1000, m < 10000 ? 1 : 1);
  const dur = (s) => { if (!isNum(s)) return "–"; const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60); return m === 60 ? `${h + 1}:00` : `${h}:${String(m).padStart(2, "0")}`; };
  const tz = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" });
  const clock = (u) => (isNum(u) ? tz.format(new Date(u * 1000)) : "–");
  const dch = (iso) => (iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "numeric" }) : "–");
  const ROUTBAR = { rad: true, lauf: true, wandern: true };
  const FARBE = { A: "#2f72c4", B: "#148a7e", C: "#8a6fb0" };
  const TITEL = { A: "Trainingsoptimiert", B: "Wetteroptimiert", C: "Ruhig und velofreundlich" };
  const titel = (k, sport) => (k === "C" && TR().FAMILIE[sport] !== "rad" ? "Ruhig und laufgeeignet" : k === "C" && sport !== "rennrad" ? "Ruhig (Forst- und Feldwege)" : TITEL[k]);
  const store = { get: (k, d) => { try { const v = localStorage.getItem("sf.tr." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem("sf.tr." + k, JSON.stringify(v)); } catch (e) { /* ohne Speicher */ } } };

  const TS = { offen: false, key: null, wo: null, datum: null, zeit: store.get("zeit", "09:00"), ortId: store.get("ort", null), ortTemp: null, zielId: null, zielTemp: null,
    sport: null, opts: {}, routenart: "rund", pz: "0", artOv: "auto", haupt: null, intens: null, busy: false, msg: "", res: null, ctx: null, gewaehlt: null,
    pick: null, profilFallback: null, anfragen: 0, cache: 0, planerRoute: null, planerIv: null, orteOffen: false, fehler: null, verdeckt: false,
    man: { sport: "rad", titel: "", dauer_min: 120, modus: "watt", wert: 200, ein_min: 15, aus_min: 10, iv: false, iv_n: 3, iv_min: 15, iv_wert: 260, iv_pause: 5 } };
  const KC = new Map(), WX = new Map();
  let kandMarker = [];

  /* ---------------- Daten ---------------- */
  const heute = () => FK().zurichParts(Date.now() / 1000).date;
  function einheiten() {
    const h = heute(), out = [];
    (D().planned || []).forEach((p, i) => { if (p.date >= FK().addDays(h, -1)) out.push({ key: `p:${p.date}|${i}`, p, datum: p.date }); });
    for (const w of D().workouts_neu || []) out.push({ key: `n:${w.wid}`, p: Object.assign({}, w, { sport: TR().GARMIN_SPORT[w.sport] || w.sport }), datum: null });
    return out.sort((a, b) => (a.datum || "9").localeCompare(b.datum || "9"));
  }
  function orte() { const ib = UI() && UI().Inbox && UI().Inbox.data; return ib && Array.isArray(ib.startorte) ? ib.startorte : D().startorte || []; }
  async function orteSetzen(list) { UI().Inbox.data.startorte = list; await UI().Inbox.save(); }
  function ortLL(id, temp) {
    if (id === "temp") return temp ? temp.ll : null;
    if (id === "planer") { const v = R().state().vias; return v && v.length ? v[0] : null; }
    const o = orte().find((x) => x.id === id); return o ? [o.lon, o.lat] : null;
  }
  function ortName(id, temp) {
    if (id === "temp") return temp ? temp.name : "Punkt";
    if (id === "planer") return "Start im Planer";
    const o = orte().find((x) => x.id === id); return o ? o.name : "Start";
  }
  const zonen = () => TR().zonen(D().zonen);
  function setWorkout(key) {
    TS.key = key; TS.res = null; TS.gewaehlt = null; TS.planerIv = null; clearKand();
    let wo;
    if (key === "m") wo = manuellWo();
    else { const e = einheiten().find((x) => x.key === key); if (!e) { TS.key = "m"; wo = manuellWo(); } else { wo = TR().workout(e.p, { zonen: zonen() }); if (!wo.datum) wo.datum = null; } }
    TS.wo = wo;
    TS.datum = wo.datum || (FK().zurichParts(Date.now() / 1000).hh >= 17 ? FK().addDays(heute(), 1) : heute());
    const fam = wo.sport;
    const last = R().state().sport;
    TS.sport = fam === "rad" ? (TR().FAMILIE[last] === "rad" ? last : "rennrad") : fam === "lauf" ? (wo.art === "trail" ? "trail" : "laufen") : fam === "wandern" ? "wandern" : null;
    TS.opts = TS.sport && last === TS.sport ? Object.assign({}, R().state().opts || {}) : {};
    const m = modus();
    TS.haupt = isNum(wo.haupt) && wo.modus === m ? Math.round(wo.haupt) : defaultWert(m);
    TS.intens = isNum(wo.intens) ? Math.round(wo.intens) : null;
  }
  function manuellWo() {
    const m = TS.man;
    return TR().manuell({ sport: m.sport, titel: m.titel || "Eigene Einheit", dauer_min: m.dauer_min, modus: m.modus, wert: m.wert, ein_min: m.ein_min, aus_min: m.aus_min,
      intervalle: m.iv ? { n: m.iv_n, min: m.iv_min, wert: m.iv_wert, pause_min: m.iv_pause } : null, datum: TS.datum }, { zonen: zonen() });
  }
  function modus() {
    const def = TS.sport && RT().SPORTS[TS.sport]; if (!def) return null;
    return TS.wo && TS.wo.modus && def.modi.includes(TS.wo.modus) ? TS.wo.modus : def.modi[0];
  }
  function defaultWert(m) {
    const def = RT().SPORTS[TS.sport]; if (!def) return null;
    const all = R().store.get("effort", {}), mine = all[TS.sport] || {};
    return isNum(mine[m]) ? mine[m] : def.wert[m];
  }

  /* ---------------- Rechnen ---------------- */
  function ctx() {
    const wo = TS.wo, m = modus(), plan = TR().zeitplan(wo, { haupt: TS.haupt, intens: TS.intens });
    const inp = R().inputFor(TS.sport, m, TS.haupt);
    if (wo.modus === m) inp.plan = plan.fn;
    const start_unix = FK().zurichToUnix(TS.datum, TS.zeit);
    inp.start_unix = start_unix;
    const [n, min] = String(TS.pz || "0").split("x").map(Number);
    const woEff = Object.assign({}, wo, artOverride(wo));
    return { wo: woEff, plan, inp, sport: TS.sport, opts: TS.opts, routenart: TS.routenart, start: ortLL(TS.ortId, TS.ortTemp), ziel: ortLL(TS.zielId, TS.zielTemp),
      start_unix, pausen: TR().pausenListe(n || 0, min || 0, wo.dauer_s), hm_ziel: 300, prov: { endpoint: R().endpoint().replace(/^https?:\/\//, ""), abgerufen: new Date().toISOString() } };
  }
  function artOverride(wo) {
    if (TS.artOv === "auto") return {};
    const dt = TS.artOv === "grundlage" || TS.artOv === "trail" || TS.artOv === "wandern";
    return { art: TS.artOv, art_text: TR().ART_TEXT[TS.artOv] + " (von dir gewählt)", dauertraining: dt, tol: dt ? 0.05 : 0.1 };
  }
  async function engFor(variante) {
    let eng;
    if (TS.sport === "rennrad") {
      eng = RT().engineVariant("rennrad", TS.opts, variante === "C" ? "velo" : "schnell");
      const pid = await R().profilId("rennrad");
      if (pid) eng.engine = pid; else TS.profilFallback = R().profilFehler() || "eigenes Profil nicht verfügbar";
    } else eng = RT().engineFor(TS.sport, TS.opts);
    return eng;
  }
  async function routeKand(variante, pts, extra) {
    const ep = R().endpoint(), eng = await engFor(variante);
    const go = (e) => {
      const url = RT().brouterUrlPts(ep, e, pts, extra);
      TS.anfragen++;
      if (KC.has(url)) TS.cache++;
      else KC.set(url, RT().fetchPts(R().bfetch(), ep, e, pts, extra).then((leg) => Object.assign(leg, { engine: e.engine, eng: JSON.parse(JSON.stringify(e)) })).catch((er) => { KC.delete(url); throw er; }));
      return KC.get(url);
    };
    try { return await go(eng); }
    catch (e) {
      if (TS.sport !== "rennrad" || !/^custom_/.test(eng.engine) || !(e.status >= 500)) throw e;
      const pid = await R().profilId("rennrad", true);
      if (pid) { eng.engine = pid; try { return await go(eng); } catch (e2) { if (!(e2.status >= 500)) throw e2; } }
      TS.profilFallback = "Der Routing-Server kennt das hinterlegte Rennradprofil nicht";
      eng.engine = "fastbike";
      return go(eng);
    }
  }
  const tag = (u) => new Date(u * 1000).toISOString().slice(0, 10);
  async function wetterFuer(routes) {
    if (!R().consent().wetter) return null;
    const c = TS.ctx || ctx(), t0 = c.start_unix, t1 = c.start_unix + (c.wo.dauer_s || 7200) * 1.6 + 3600;
    if (t0 > Date.now() / 1000 + 15 * 86400) { TS.wetterGrund = "Start mehr als 15 Tage voraus: keine Prognose."; return null; }
    const G = TR().wetterGitter(routes), k = (z) => `${z.key}|${tag(t0 - 3600)}|${tag(t1 + 3600)}`;
    const fehlt = [...G.zellen.values()].filter((z) => !WX.has(k(z)));
    for (let i = 0; i < fehlt.length; i += 40) {
      const chunk = fehlt.slice(i, i + 40);
      // Zusage je Zelle sofort eintragen: ein gleichzeitiger zweiter Aufruf wartet auf dieselbe Anfrage
      const p = fetch(RT().openMeteoUrl(chunk, t0, t1)).then(async (res) => { const js = await res.json(); if (!res.ok || js.error) throw new Error(js.reason || "HTTP " + res.status); return Array.isArray(js) ? js : [js]; });
      chunk.forEach((z, j) => WX.set(k(z), p.then((arr) => arr[j])));
      p.catch(() => chunk.forEach((z) => WX.delete(k(z))));
    }
    for (const [key, v] of [...WX.entries()]) if (v && typeof v.then === "function") { try { WX.set(key, await v); } catch (e) { WX.delete(key); throw e; } }
    const m = new Map();
    for (const r of routes) {
      const pts = G.proRoute.get(r.id), ant = new Map(pts.map((p) => [p.key, WX.get(k(G.zellen.get(p.key)))]));
      const f = TR().wetterFeld(pts, ant); if (f) m.set(r.id, f);
    }
    TS.wetterGrund = null;
    return m;
  }
  async function suche() {
    if (TS.busy) return;
    if (!R().consent().routing) { TS.fehler = "zustimmung"; render(); return; }
    const c = ctx();
    if (!c.start) { TS.fehler = "Bitte zuerst einen Startort wählen."; render(); return; }
    if (TS.routenart === "ziel" && !c.ziel) { TS.fehler = "Bitte ein Ziel wählen."; render(); return; }
    if (!isNum(c.wo.dauer_s) || c.wo.dauer_s <= 0) { TS.fehler = "Dauer unbekannt – bitte eigene Angaben verwenden."; render(); return; }
    TS.fehler = null; TS.busy = true; TS.res = null; TS.gewaehlt = null; TS.planerIv = null; TS.profilFallback = null; TS.anfragen = 0; TS.cache = 0; TS.ctx = c; clearKand();
    store.set("zeit", TS.zeit); if (TS.ortId && TS.ortId !== "temp") store.set("ort", TS.ortId);
    render();
    try {
      TS.res = await TR().suche(c, { route: routeKand, wetter: wetterFuer, fortschritt: (t) => { TS.msg = t; const el = $("tr-status"); if (el) el.innerHTML = `<span class="spin" aria-hidden="true"></span> ${esc(t)}`; } });
    } catch (e) { TS.res = { pool: [], fehler: [{ text: e.message || String(e) }], hinweise: [] }; }
    TS.busy = false; TS.msg = "";
    if (TS.res && TS.res.A) TS.formOffen = false;          // Ergebnisse oben, Einstellungen über «Einstellungen»
    render(); zeigeKand();
    const rb = $("tr-res"); if (rb && rb.scrollIntoView && TS.res && TS.res.A) setTimeout(() => rb.scrollIntoView({ block: "start" }), 60);
  }
  /** Regler geändert: die drei gewählten Vorschläge sofort neu rechnen (ohne neue Anfragen); Auswahl bleibt. */
  let raf = 0;
  function neuBewerten() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!TS.res || !TS.res.A) return;
      const c = (TS.ctx = Object.assign(ctx(), { start: TS.ctx.start, ziel: TS.ctx.ziel }));
      const seen = new Set();
      for (const k of ["A", "B", "C"]) { const v = TS.res[k]; if (v && !seen.has(v)) { seen.add(v); TR().bewerte(v, c, v.field || null); } }
      renderBody();
      if (TS.gewaehlt && R().active()) { const st = R().state(); if (st.effortMode === modus()) { st.effortValue = TS.haupt; R().recompute(); } }
    });
  }

  /* ---------------- Karte: Vorschläge als Linien ---------------- */
  function karte() { const m = R() && R().map(); return m && m.getSource ? m : null; }
  function layers(m) {
    if (m.getSource("tr-kand")) return;
    const E = { type: "FeatureCollection", features: [] }, lay = { "line-join": "round", "line-cap": "round" };
    m.addSource("tr-kand", { type: "geojson", data: E });
    m.addSource("tr-int", { type: "geojson", data: E });
    const before = m.getLayer("rt-alt-case") ? "rt-alt-case" : undefined;
    m.addLayer({ id: "tr-kand-case", type: "line", source: "tr-kand", layout: lay, paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.85 } }, before);
    m.addLayer({ id: "tr-kand-line", type: "line", source: "tr-kand", layout: lay, paint: { "line-color": ["get", "color"], "line-width": 3.5, "line-dasharray": [2, 1.5], "line-opacity": 0.9 } }, before);
    m.addLayer({ id: "tr-int-line", type: "line", source: "tr-int", layout: lay, paint: { "line-color": ["get", "color"], "line-width": 9, "line-opacity": 0.55 } }, m.getLayer("rt-arrows") ? "rt-arrows" : undefined);
  }
  function clearKand() {
    kandMarker.forEach((x) => x.remove()); kandMarker = [];
    const m = karte(); if (m && m.getSource("tr-kand")) { m.getSource("tr-kand").setData({ type: "FeatureCollection", features: [] }); m.getSource("tr-int").setData({ type: "FeatureCollection", features: [] }); }
  }
  function zeigeKand() {
    const m = karte(); if (!m || !TS.res || !TS.res.A) return;
    layers(m); kandMarker.forEach((x) => x.remove()); kandMarker = [];
    const feats = [], seen = new Set();
    for (const k of ["C", "B", "A"]) {
      const c = TS.res[k]; if (!c || seen.has(c.id) || (TS.gewaehlt === k)) continue;
      seen.add(c.id);
      feats.push({ type: "Feature", properties: { k, color: FARBE[k] }, geometry: { type: "LineString", coordinates: c.route.lon.map((x, i) => [x, c.route.lat[i]]) } });
      if (window.maplibregl) {
        const a = RT().at(c.route, c.route.L * (k === "A" ? 0.35 : k === "B" ? 0.5 : 0.65)), el = document.createElement("button");
        el.type = "button"; el.className = "rp-altpin tr-pin"; el.style.background = FARBE[k]; el.textContent = k; el.title = `Vorschlag ${k}: ${titel(k, TS.sport)} – antippen zum Wählen`;
        el.addEventListener("click", (ev) => { ev.stopPropagation(); waehle(k); });
        kandMarker.push(new maplibregl.Marker({ element: el }).setLngLat([a.lon, a.lat]).addTo(m));
      }
    }
    m.getSource("tr-kand").setData({ type: "FeatureCollection", features: feats });
    if (!TS.gewaehlt) { const all = []; for (const f of feats) all.push(...f.geometry.coordinates); if (all.length) R().fitCoords(all); }
  }
  function zeigeIntervalle() {
    const m = karte(); if (!m) return;
    layers(m);
    const r = TS.planerRoute, I = TS.planerIv || [];
    const col = (n) => (n === "gut" ? "#2f8f83" : n === "bedingt" ? "#c9913f" : "#b4443a");
    m.getSource("tr-int").setData({ type: "FeatureCollection", features: r ? I.filter((x) => isNum(x.d0) && isNum(x.d1)).map((x) => ({ type: "Feature", properties: { color: col(x.note) }, geometry: { type: "LineString", coordinates: RT().slice(r, x.d0, Math.max(x.d1, x.d0 + 20)) } })) : [] });
  }

  /* ---------------- Auswahl → Planer ---------------- */
  function waehle(k) {
    const c = TS.res && TS.res[k]; if (!c) return;
    const pts = c.pts, legs = c.legs;
    const vias = legs ? [pts[0]].concat(legs.slice(0, -1).map((l) => l.coords[l.coords.length - 1].slice(0, 2))).concat([pts[pts.length - 1]]) : pts;
    if (legs && c.eng) R().primeLegs(R().endpoint(), c.eng, vias, legs);
    const n = vias.length, nm = ortName(TS.ortId, TS.ortTemp);
    const names = vias.map((_, i) => (i === 0 ? nm : i === n - 1 ? (TS.routenart === "ziel" ? ortName(TS.zielId, TS.zielTemp) : nm) : `Wegpunkt ${i}`));
    const [pn, pm] = String(TS.pz || "0").split("x").map(Number);
    TS.gewaehlt = k; TS.formOffen = false; TS.fitNach = true;
    if (innerWidth <= 760) R().setSheet("half");          // Karte und Profil sichtbar; die Route wird mit dieser Höhe eingepasst
    R().loadTraining({ sport: TS.sport, opts: TS.opts, vias, names, startUnix: TS.ctx.start_unix, effort: { mode: modus(), value: TS.haupt },
      variantWahl: TS.sport === "rennrad" ? (c.variante === "C" ? "velo" : "schnell") : null, pauseMin: (pn || 0) * (pm || 0), name: gpxName() });
    zeigeKand();
    speichern(k);
    render();
  }
  function gpxName() { return TS.wo ? `${TS.datum ? TS.datum + " " : ""}${TS.wo.titel}` : null; }
  /** Gewählten Vorschlag verschlüsselt auf dem Gerät speichern (für «Vorschlag vs. Ist» nach dem Training). Beim GPX-Export
   *  gilt die Route, wie sie im Planer steht (Zwischenziele, Umkehren), mit der Prognose des Planers. */
  async function speichern(k, planer) {
    const c = TS.res && TS.res[k]; if (!c || !UI() || !UI().Inbox || !UI().Inbox.data) return;
    const K = Object.assign({}, c.K), wo = TS.wo, W = K.wetter || {};
    let route = c.route;
    if (planer && planer.route && planer.sim && !planer.sim.unzureichend) {
      route = planer.route; const s = planer.sim, P = route.profile;
      Object.assign(K, { T: s.moving_s, band: s.band || [s.moving_s, s.moving_s], L: route.L, up: P.up, down: P.down, tempo_kmh: (route.L / s.moving_s) * 3.6, pace_s: (s.moving_s / route.L) * 1000,
        abw: wo.dauer_s ? (s.moving_s - wo.dauer_s) / wo.dauer_s : 0, sim: s, intervalle: TS.planerIv || K.intervalle });
    }
    const rec = { id: `tr-${TS.datum}-${(wo.wid || wo.titel || "x").toString().replace(/[^\w]+/g, "").slice(0, 24)}`, v: TR().VERSIONS.vorschlag, datum: TS.datum, erstellt: new Date().toISOString(),
      sport: TS.sport, routenart: TS.routenart, vorschlag: k, titel: titel(k, TS.sport), start_unix: TS.ctx.start_unix,
      plan: { titel: wo.titel, wid: wo.wid, dauer_s: wo.dauer_s, modus: modus(), haupt: TS.haupt, intens: TS.intens, art: wo.art, quelle: wo.quelle },
      pred: { moving_s: Math.round(K.T), band: K.band.map(Math.round), L: Math.round(K.L), up: Math.round(K.up), down: Math.round(K.down), v_kmh: +K.tempo_kmh.toFixed(2), pace_s: Math.round(K.pace_s), abw: +K.abw.toFixed(3),
        modell: K.sim.fehler ? K.sim.fehler.quelle : null },
      wetter: W.status === "ok" || W.status === "teilweise" ? { status: W.status, temp_min: W.temp_min, temp_max: W.temp_max, mittel_ms: W.mittel_ms, hin_ms: W.hin_ms, rueck_ms: W.rueck_ms, regen_mm: +W.regen_mm.toFixed(1), boe10_m: Math.round(W.boe10_m), quelle: "Open-Meteo" } : { status: W.status || "keine" },
      intervalle: K.intervalle.map((x) => ({ nr: x.nr, d0: Math.round(x.d0), d1: Math.round(x.d1), t0: Math.round(x.t0), t1: Math.round(x.t1), wert: Math.round(x.wert), note: x.note })),
      geo: TR().kompakt(route), aus_planer: !!(planer && planer.route), kal: (D().kalibrierung || {}).erstellt || null };
    await UI().Inbox.upsert("trainingsrouten", rec);
  }

  /* ---------------- Darstellung ---------------- */
  function show(opt) {
    opt = opt || {};
    if (!R() || !TR()) return;
    TS.offen = true;
    if (opt.key) setWorkout(opt.key);
    else if (!TS.wo) { const e = einheiten().find((x) => ROUTBAR[x.p.sport] && (x.datum || "") >= heute()); setWorkout(e ? e.key : "m"); }
    const box = $("rp-train"); if (box) box.hidden = false;
    render();
    if (innerWidth <= 760) R().setSheet("full");
    setTimeout(() => { const el = $("rp-train"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, 80);
  }
  function hide() { TS.offen = false; TS.pick = null; const box = $("rp-train"); if (box) box.hidden = true; }
  function beenden() { TS.gewaehlt = null; TS.planerIv = null; TS.res = null; clearKand(); hide(); if (R().active()) R().recompute(); R().redraw(); }
  function openPlan(key) {
    if (window.APP) { window.APP.showTab("karte"); window.APP.setPlanActive(true); }
    show({ key: "p:" + key });
  }
  function optsWo() {
    const list = einheiten();
    const o = list.map((e) => { const p = e.p, r = ROUTBAR[p.sport]; return `<option value="${esc(e.key)}" ${e.key === TS.key ? "selected" : ""} ${r ? "" : "disabled"}>${e.datum ? dch(e.datum) + " · " : "neu von Enduco · "}${esc(p.title || p.name || "Training")} (${esc({ rad: "Rad", lauf: "Laufen", wandern: "Wandern", schwimm: "Schwimmen" }[p.sport] || p.sport)}${isNum(p.dur_s) ? ", " + dur(p.dur_s) + " h" : ""})${r ? "" : " – keine Route"}</option>`; });
    o.push(`<option value="m" ${TS.key === "m" ? "selected" : ""}>Eigene Angaben …</option>`);
    return o.join("");
  }
  function woSummary() {
    const wo = TS.wo; if (!wo) return "";
    const st = wo.schritte.length ? TR().strukturText(wo) : "Keine Schritte im Kalender – Intensität unten mit dem Regler.";
    const m = modus(), unit = m === "watt" ? "W" : m === "pace" ? "/km" : m === "hf" ? "bpm" : "";
    const wert = (v) => (m === "pace" ? FK().pace(v) + " /km" : `${num(v)} ${unit}`);
    return `<div class="tr-wo"><b>${esc(wo.titel)}</b> <span class="badge info">${esc(wo.art_text)}</span> <span class="badge muted">${esc(wo.quelle)}</span>
      <p class="hint">${esc(st)}</p>
      <p class="hint">Dauer ${dur(wo.dauer_s)} h (${esc(wo.dauer_quelle || "unbekannt")})${isNum(wo.haupt) ? ` · Grundwert ${wert(wo.haupt)}` : ""}${isNum(wo.intens) ? ` · intensiv ${wert(wo.intens)} (${dur(wo.intensiv_s)} h)` : ""} · Ziel ±${num(wo.tol * 100)} % Dauer${wo.zonen ? ` · Intensität nach «${esc(wo.zonen)}»` : ""}</p>
      ${wo.hinweise.map((h) => `<p class="hint warn-t">${esc(h)}</p>`).join("")}
      ${wo.beschreibung ? `<details class="tr-desc"><summary>Beschreibung (Enduco)</summary><p class="hint">${esc(wo.beschreibung)}</p></details>` : ""}</div>`;
  }
  function manForm() {
    const m = TS.man, sel = (k, opts) => opts.map(([v, l]) => `<option value="${v}" ${String(m[k]) === String(v) ? "selected" : ""}>${l}</option>`).join("");
    const unit = m.modus === "watt" ? "W" : m.modus === "pace" ? "s/km" : "bpm";
    return `<div class="tr-man"><div class="tr-grid">
      <label>Sportart <select data-man="sport">${sel("sport", [["rad", "Rad"], ["lauf", "Laufen"], ["wandern", "Wandern"]])}</select></label>
      <label>Dauer (min) <input data-man="dauer_min" type="number" inputmode="numeric" min="10" max="600" value="${m.dauer_min}"></label>
      <label>Ziel <select data-man="modus">${sel("modus", m.sport === "lauf" ? [["pace", "Pace"], ["hf", "Puls"]] : m.sport === "wandern" ? [["hf", "Puls"]] : [["watt", "Watt"], ["hf", "Puls"]])}</select></label>
      <label>Wert (${unit}) <input data-man="wert" type="number" inputmode="numeric" value="${m.wert}"></label>
      <label>Einfahren (min) <input data-man="ein_min" type="number" inputmode="numeric" min="0" value="${m.ein_min}"></label>
      <label>Ausfahren (min) <input data-man="aus_min" type="number" inputmode="numeric" min="0" value="${m.aus_min}"></label></div>
      <label class="rp-opt"><input type="checkbox" data-man="iv" ${m.iv ? "checked" : ""}> Intervalle</label>
      ${m.iv ? `<div class="tr-grid"><label>Anzahl <input data-man="iv_n" type="number" min="1" max="30" value="${m.iv_n}"></label><label>Dauer (min) <input data-man="iv_min" type="number" min="0.5" step="0.5" value="${m.iv_min}"></label>
        <label>Wert (${unit}) <input data-man="iv_wert" type="number" value="${m.iv_wert}"></label><label>Pause (min) <input data-man="iv_pause" type="number" min="0" step="0.5" value="${m.iv_pause}"></label></div>` : ""}</div>`;
  }
  function ortOptions(sel, temp, mitPlaner) {
    const o = orte().map((x) => `<option value="${esc(x.id)}" ${sel === x.id ? "selected" : ""}>${esc(x.name)}</option>`);
    if (temp) o.push(`<option value="temp" ${sel === "temp" ? "selected" : ""}>${esc(temp.name)} (${temp.ll[1].toFixed(3)}, ${temp.ll[0].toFixed(3)})</option>`);
    if (mitPlaner && R().state().vias.length) o.push(`<option value="planer" ${sel === "planer" ? "selected" : ""}>Start im Planer</option>`);
    o.push(`<option value="gps">Aktueller Standort …</option><option value="karte">Punkt auf der Karte …</option>`);
    if (!sel || (sel !== "temp" && sel !== "planer" && !orte().some((x) => x.id === sel))) o.unshift(`<option value="" selected disabled>bitte wählen</option>`);
    return o.join("");
  }
  let zeichnet = false, nochmal = false;
  function render() {
    const box = $("rp-train"); if (!box || !TS.offen) return;
    if (zeichnet) { nochmal = true; return; }
    zeichnet = true;
    try {
      // Ein fokussiertes Feld mit geändertem Wert meldet beim Entfernen «change» (Chrome, Safari). Vorher kontrolliert verlassen:
      // dessen Handler übernimmt den Wert, zeichnet aber nicht mitten im Ersetzen ein zweites Mal (sonst DOMException).
      const ae = document.activeElement;
      if (ae && ae !== document.body && box.contains(ae) && typeof ae.blur === "function") ae.blur();
      nochmal = false;
      zeichne(box);
    } finally { zeichnet = false; }
    if (nochmal) { nochmal = false; render(); }
  }
  function zeichne(box) {
    if (!TS.wo) setWorkout("m");
    const wo = TS.wo, fam = wo.sport;
    const sportOpts = fam === "rad" ? [["rennrad", "Rennrad"], ["gravel", "Gravel"], ["mtb", "MTB"]] : fam === "lauf" ? [["laufen", "Laufen"], ["trail", "Trail"]] : fam === "wandern" ? [["wandern", "Wandern"]] : [];
    const S = RT().SPORTS[TS.sport] || {}, schotter = S.optionen && S.optionen.schotter;
    const pause = [["0", "keine"], ["1x10", "1 × 10 min"], ["1x15", "1 × 15 min"], ["1x20", "1 × 20 min"], ["1x30", "1 × 30 min"], ["2x10", "2 × 10 min"], ["2x15", "2 × 15 min"]];
    const arten = [["auto", `automatisch (${wo.art_text})`], ["grundlage", "Grundlage"], ["intervalle", "Intervalle"], ["schwelle", "lange Intervalle"], ["berg", "Bergintervalle"], ["sprint", "Sprints"], ["trail", "Trail mit Anstiegen"]];
    const pickTxt = TS.pick ? `<p class="verdict warn tr-pick">Tippe auf die Karte: ${TS.pick.fuer === "ziel" ? "Ziel" : TS.pick.fuer === "neu" ? `Startort «${esc(TS.pick.name)}»` : "Startpunkt"} setzen. <button class="btn" data-tr="pick-ab">Abbrechen</button></p>` : "";
    box.innerHTML = `<div class="rp-card tr-box">
      <div class="tr-head"><h3>Training → passende Route</h3><button class="btn rp-x" data-tr="zu" aria-label="Training schliessen">✕</button></div>
      ${(TS.gewaehlt || (TS.res && TS.res.A)) && !TS.formOffen ? `<div class="row tr-kurz"><span class="hint">${esc(TS.wo.titel)} · ${dch(TS.datum)} ${esc(TS.zeit)} · ${esc(ortName(TS.ortId, TS.ortTemp))}</span><button class="btn" data-tr="form">Einstellungen</button></div>` : `<label class="tr-f">Einheit <select id="tr-wo" aria-label="Geplante Einheit">${optsWo()}</select></label>
      ${TS.key === "m" ? manForm() : ""}${woSummary()}
      ${!sportOpts.length ? `<p class="verdict unsure">${fam === "schwimm" ? "Schwimmen: keine Route." : "Für diese Sportart gibt es keine automatische Route."}</p>` : `
      <div class="tr-grid">
        <label>Datum <input type="date" id="tr-datum" value="${esc(TS.datum || "")}"></label>
        <label>Start <input type="time" id="tr-zeit" value="${esc(TS.zeit)}"></label>
        <label>Startort <select id="tr-ort">${ortOptions(TS.ortId, TS.ortTemp, true)}</select></label>
        <label>Sportart <select id="tr-sport">${sportOpts.map(([v, l]) => `<option value="${v}" ${TS.sport === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Routenart <select id="tr-art">${[["rund", "Rundtour"], ["hin", "Hin und zurück"], ["ziel", "Zu einem Ziel"]].map(([v, l]) => `<option value="${v}" ${TS.routenart === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        ${TS.routenart === "ziel" ? `<label>Ziel <select id="tr-zielort">${ortOptions(TS.zielId, TS.zielTemp, false)}</select></label>` : ""}
        <label>Pausen <select id="tr-pz">${pause.map(([v, l]) => `<option value="${v}" ${TS.pz === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Trainingsziel <select id="tr-ziel">${arten.map(([v, l]) => `<option value="${v}" ${TS.artOv === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      </div>
      ${schotter ? `<label class="rp-opt"><input type="checkbox" id="tr-schotter" ${(TS.opts.schotter ?? schotter.standard) ? "checked" : ""}> ${esc(schotter.label)}</label>` : ""}
      ${TS.routenart === "ziel" ? `<p class="hint">Zu einem Ziel: Die Strecke ist durch Start und Ziel gegeben – die Dauer wird nicht nachgeregelt, nur verglichen.</p>` : ""}
      ${pickTxt}${orteBox()}
      ${TS.fehler === "zustimmung" ? zustimmung() : TS.fehler ? `<p class="verdict bad">${esc(TS.fehler)}</p>` : ""}
      <div class="row"><button class="btn primary" id="tr-go" ${TS.busy ? "disabled" : ""}>${TS.busy ? '<span class="spin" aria-hidden="true"></span> wird berechnet …' : TS.res ? "Neu berechnen" : "Vorschläge berechnen"}</button></div>
      <p class="hint">Je Berechnung bis etwa 16 Anfragen an BRouter (höchstens 2 gleichzeitig, gleiche Anfragen nur einmal) und 1–3 an Open-Meteo. Gesendet werden nur Koordinaten und Zeiten.</p>`}`}
      <div id="tr-status" class="tr-status" role="status" aria-live="polite">${TS.busy ? `<span class="spin" aria-hidden="true"></span> ${esc(TS.msg || "…")}` : ""}</div>
      <div id="tr-res"></div></div>`;
    renderRes();
    bind();
  }
  function zustimmung() {
    return `<div class="rp-card"><b>Echtes Routing über das Wegnetz</b><p class="hint">Startort und berechnete Zwischenpunkte (nur Koordinaten) gehen an den öffentlichen BRouter-Server ${esc(R().endpoint().replace(/^https?:\/\//, ""))}; fürs Rennrad einmal das eigene Profil «ohne Gravel» (nur Text). Optional Wetter von Open-Meteo (Koordinaten und Zeiten).</p>
      <div class="row"><button class="btn primary" data-tr="ok">Zustimmen und berechnen</button><button class="btn" data-tr="ok-wx">Mit Wetter zustimmen</button></div></div>`;
  }
  function orteBox() {
    const L = orte(), ib = UI() && UI().Inbox && UI().Inbox.data, lokal = !!(ib && Array.isArray(ib.startorte) && ib.startorte.length);
    return `<details class="tr-orte" ${TS.orteOffen ? "open" : ""}><summary>Startorte verwalten (${L.length})</summary>
      ${L.length ? `<ul class="tr-ol">${L.map((o) => `<li><b>${esc(o.name)}</b> <small>${o.lat.toFixed(4)}, ${o.lon.toFixed(4)}</small> <button class="btn" data-ort-del="${esc(o.id)}" aria-label="${esc(o.name)} löschen">Löschen</button></li>`).join("")}</ul>` : `<p class="hint">Noch keine Startorte gespeichert.</p>`}
      <div class="tr-grid"><label>Name <select id="tr-on">${["Zuhause", "Arbeit", "Eigener Name"].map((n) => `<option>${n}</option>`).join("")}</select></label><label>Eigener Name <input id="tr-oe" maxlength="30" placeholder="z. B. Bahnhof"></label></div>
      <div class="row"><button class="btn" data-ort-neu="karte">Auf der Karte tippen</button><button class="btn" data-ort-neu="gps">Aktueller Standort</button>${R().state().vias.length ? `<button class="btn" data-ort-neu="planer">Start im Planer</button>` : ""}</div>
      <div class="row"><input type="search" id="tr-oq" placeholder="Adresse suchen (swisstopo)" aria-label="Adresse suchen"><button class="btn" data-ort-neu="suche">Suchen</button></div><ul class="rp-qres" id="tr-oqr" hidden></ul>
      <div class="row"><button class="btn" data-ort-sichern ${lokal ? "" : "disabled"}>Startorte sichern</button><label class="btn">Sicherung laden<input type="file" accept="application/json,.json" data-ort-laden hidden></label></div>${TS.ortHinweis ? `<p class="hint"><b>${esc(TS.ortHinweis)}</b></p>` : ""}
      <p class="hint">${lokal ? "<b>Nur auf diesem Gerät</b> gespeichert (verschlüsselt mit dem Seitenpasswort). «Startorte sichern» erzeugt eine verschlüsselte Datei: auf einem anderen Gerät oder nach dem Löschen der Browserdaten mit «Sicherung laden» wiederherstellen – oder im Chat schicken, dann stehen sie in den verschlüsselten Daten und sind nach dem Entsperren auf jedem Gerät da." : L.length ? "In den verschlüsselten Daten gespeichert: nach dem Entsperren auf jedem Gerät da, auch nach dem Löschen der Browserdaten." : "Gespeichert wird verschlüsselt mit dem Seitenpasswort."} Nichts davon steht offen im Repository. Die Suche sendet nur den eingegebenen Text an swisstopo.</p></details>`;
  }
  const NOTE = { gut: "ok", bedingt: "warn", ungeeignet: "muted" };
  function eignung(K) {
    if (!K.intervalle.length) {
      const bad = K.gravel_m > 100 && TS.sport === "rennrad" ? "ungeeignet" : Math.abs(K.abw) > TS.ctx.wo.tol * 2 ? "bedingt" : "gut";
      return { note: bad, text: bad === "gut" ? "passt" : bad === "bedingt" ? "Dauer weicht ab" : "Gravel" };
    }
    const g = K.intervalle.filter((x) => x.note === "gut").length, u = K.intervalle.filter((x) => x.note === "ungeeignet").length;
    return { note: u ? "ungeeignet" : g === K.intervalle.length ? "gut" : "bedingt", text: `${g}/${K.intervalle.length} Intervalle geeignet` };
  }
  function windText(W) {
    if (!W || W.status === "keine") return R().consent().wetter ? (TS.wetterGrund || "Wetter nicht geladen") : "Wetter aus – ohne Wind gerechnet (Band ±7 km/h)";
    if (W.status === "unbekannt") return "Wind unbekannt (Prognose ohne Winddaten) – ohne Wind gerechnet";
    const t = (x) => `${x < 0 ? "Gegenwind" : "Rückenwind"} ${num(Math.abs(x * 3.6))} km/h`;
    return `${isNum(W.hin_ms) ? "1. Hälfte " + t(W.hin_ms) : ""}${isNum(W.rueck_ms) ? " · 2. Hälfte " + t(W.rueck_ms) : ""}${W.boe10_m > 0 ? ` · ${km(W.boe10_m)} km starke Seitenböen (> 36 km/h)` : W.boe7_m > 0 ? ` · ${km(W.boe7_m)} km Seitenböen 25–36 km/h` : " · keine starken Seitenböen"}${W.status === "teilweise" ? ` · nur ${num(W.bekannt_pct)} % der Strecke mit Winddaten` : ""}`;
  }
  function regenText(W) {
    if (!W || W.status === "keine" || W.status === "unbekannt") return "Regen unbekannt";
    return `${W.regen_mm >= 0.1 ? `ca. ${num(W.regen_mm, 1)} mm Regen` : "trocken laut Prognose"}${isNum(W.pop_max) ? ` (Wahrscheinlichkeit bis ${num(W.pop_max)} %)` : ""} · ${isNum(W.temp_min) ? `${num(W.temp_min)}–${num(W.temp_max)} °C` : "Temperatur unbekannt"}`;
  }
  function lichtText(K) {
    const L = K.licht;
    if (!L || L.status === "unbekannt") return "Tageslicht unbekannt";
    const base = `Ende ${clock(K.ende)} · Sonne ${clock(L.sonne_auf)}–${clock(L.sonne_unter)}`;
    return L.status === "dunkel" ? `<b class="down">${base}: teilweise im Dunkeln – Licht nötig</b>` : L.status === "daemmerung" ? `${base}: in der Dämmerung – Licht empfohlen` : base;
  }
  function belagText(K) {
    const L = K.L || 1, b = K.belag, p = (k) => (100 * (b[k] || 0)) / L;
    const parts = [`Asphalt ${num(p("asphalt"))} %`];
    if (p("pflaster") >= 0.5) parts.push(`Pflaster ${num(p("pflaster"))} %`);
    if (p("hart") >= 0.5) parts.push(`Beton/anderer Hartbelag ${num(p("hart"))} %`);
    const nat = p("kies") + p("natur") + p("unbefestigt"); if (nat >= 0.5) parts.push(`Kies/Natur ${num(nat)} %`);
    if (p("unbekannt") >= 0.5) parts.push(`unbekannt ${num(p("unbekannt"))} %`);
    if (TS.sport === "rennrad") parts.push(K.gravel_m >= 1 ? `<b>${km(K.gravel_m)} km Gravel</b>` : "kein Gravel");
    return parts.join(", ");
  }
  function prognoseText(K) {
    const f = K.sim.fehler || {}, allg = /Annahme|nicht validiert/.test(f.quelle || "");
    return `${allg ? "<b>allgemeine Schätzung</b> (zu wenige vergleichbare Einheiten)" : "persönlich kalibriert"} – Band ±${num((f.rel || 0) * 100)} % (${esc(f.quelle || "")})${K.sim.wind && K.sim.wind.status !== "Prognose" ? " · Wind nicht berücksichtigt" : ""}`;
  }
  function karteHtml(k) {
    const c = TS.res[k]; if (!c) return "";
    const K = c.K, x = TS.ctx, gleich = TS.res[k + "_gleich"];
    if (K.unzureichend) return `<div class="tr-card"><b>${k}</b> ${esc(K.grund)}</div>`;
    const e = eignung(K), dauerOk = Math.abs(K.abw) <= x.wo.tol;
    const ma = K.max_anstieg;
    const begr = TR().begruendung(k, c, x);
    const ivs = K.intervalle.length ? `<ol class="tr-ivs">${K.intervalle.map((v) => `<li class="${v.note}"><b>${v.nr}</b> km ${isNum(v.d0) ? km(v.d0) : "–"}–${isNum(v.d1) ? km(v.d1) : "–"} · ${TR().mmss(v.t1 - v.t0)} · <span class="badge ${NOTE[v.note]}">${v.note}</span>${v.gruende.length ? ` <small>${esc(v.gruende.join("; "))}</small>` : ""}</li>`).join("")}</ol>` : "";
    const sh = K.intervalle.length && K.int_wert < 1 ? TR().verschiebung(c.route, K.sim, x.plan, { fam: TR().FAMILIE[TS.sport], typ: TR().intervallTyp(x.wo, TR().FAMILIE[TS.sport]), rennrad: TS.sport === "rennrad", unterbr: K.unterbr }) : null;
    return `<div class="tr-card ${TS.gewaehlt === k ? "on" : ""}" style="--k:${FARBE[k]}">
      <div class="tr-card-h"><span class="tr-key" style="background:${FARBE[k]}">${k}</span><b>${esc(titel(k, TS.sport))}</b> <span class="badge ${NOTE[e.note]}">${esc(e.text)}</span>${gleich ? ` <span class="badge muted">wie ${gleich}</span>` : ""}${c.umgekehrt_von ? ` <span class="badge info">Gegenrichtung wegen Wind</span>` : ""}</div>
      <div class="tr-kpi"><div><span>Distanz</span><b>${km(K.L)} km</b></div><div><span>Zeit</span><b>${dur(K.T)} h</b><small>${dur(K.band[0])}–${dur(K.band[1])}</small></div>
        <div><span>Höhe</span><b>${num(K.up)} m</b><small>↓ ${num(K.down)} m</small></div><div class="${dauerOk ? "" : "warn"}"><span>vs. Plan</span><b>${K.abw >= 0 ? "+" : "−"}${num(Math.abs(K.abw * 100))} %</b><small>Plan ${dur(x.wo.dauer_s)}</small></div></div>
      ${dauerOk ? "" : `<p class="hint warn-t">Weicht mehr als ±${num(x.wo.tol * 100)} % von der Plandauer ab – die Plandauer bleibt massgebend.${TS.routenart === "ziel" ? "" : " «Neu berechnen» sucht erneut."}</p>`}
      <ul class="tr-facts"><li><span>Belag</span>${belagText(K)}</li><li><span>Strassen</span>Hauptstrasse ${num(K.wege_pct.hauptstrasse)} %, Verbindungsstrasse ${num(K.wege_pct.strasse)} %, Radweg ${num(K.wege_pct.radweg)} %${TR().FAMILIE[TS.sport] !== "rad" ? `, Fuss-/Wanderweg ${num(K.wege_pct.fussweg + K.wege_pct.pfad)} %` : ""}</li>
        <li><span>Wind</span>${esc(windText(K.wetter))}</li><li><span>Wetter</span>${esc(regenText(K.wetter))}</li>
        <li><span>Anstiege</span>${ma ? (ma.mittel > 0.3 ? "Höhendaten unplausibel (Lücke im Höhenmodell?) – Anstiege nicht beurteilt" : `längster ${km(ma.len)} km, ${num(ma.hm)} Hm, Ø ${num(ma.mittel * 100, 1)} %`) : "keine (≥ 25 Hm)"} · ${num(K.unterbr_10km, 1)} Unterbrechungen je 10 km</li>
        <li><span>Licht</span>${lichtText(K)}</li><li><span>Prognose</span>${prognoseText(K)}</li></ul>
      ${ivs}${sh ? `<p class="hint">Hinweis: ${sh.min > 0 ? sh.min + " min länger" : -sh.min + " min kürzer"} einfahren, dann lägen die Intervalle besser (${sh.alle_gut ? "alle geeignet" : "mehr geeignet"}). Der Plan bleibt unverändert.</p>` : ""}
      <p class="hint"><b>Warum:</b> ${esc(begr)}</p>
      <div class="row">${TS.gewaehlt === k ? `<span class="pill">gewählt</span>` : `<button class="btn primary" data-wahl="${k}">Auswählen</button>`}<button class="btn" data-zeig="${k}">Auf der Karte</button></div></div>`;
  }
  function renderRes() {
    const box = $("tr-res"); if (!box) return;
    if (!TS.res) { box.innerHTML = ""; return; }
    const r = TS.res;
    const err =r.fehler.length ? `<details class="tr-err"><summary>${r.fehler.length} Kandidat${r.fehler.length === 1 ? "" : "en"} ohne Route</summary><ul>${r.fehler.slice(0, 8).map((f) => `<li>${esc(f.text)}${f.detail ? ` <small>${esc(f.detail.slice(0, 120))}</small>` : ""}</li>`).join("")}</ul></details>` : "";
    if (!r.A) {
      const netz = r.fehler.length && r.fehler.every((f) => /Verbindung|erreichbar|Zeitüberschreitung|netz/i.test(f.text + " " + (f.detail || "")));
      box.innerHTML = `<p class="verdict bad">${netz ? `Routing-Server nicht erreichbar (${r.fehler.length} Anfragen ohne Antwort): keine Vorschläge, es wird keine Ersatzlinie gezeichnet.` : `Keine Route berechnet. ${esc(r.fehler.length ? r.fehler[0].text : r.hinweise.join(" "))}`}</p>${err}`;
      return;
    }
    const m = modus(), rg = m === "watt" ? [60, 450, 5] : m === "pace" ? [180, 720, 5] : m === "hf" ? [90, 195, 1] : [50, 160, 5];
    const fmtW = (v) => (m === "pace" ? FK().pace(v) + " /km" : m === "watt" ? `${num(v)} W` : m === "hf" ? `${num(v)} bpm` : `${num(v)} %`);
    const slider = (id, lab, v) => `<label class="tr-sl">${lab} <b id="${id}-v">${fmtW(v)}</b><input type="range" id="${id}" min="${rg[0]}" max="${rg[1]}" step="${rg[2]}" value="${v}" ${m === "pace" ? 'style="direction:rtl"' : ""} aria-label="${lab}"></label>`;
    const fall = TS.profilFallback ? `<p class="verdict warn"><b>Eigenes Rennradprofil nicht verfügbar</b> (${esc(TS.profilFallback)}): Die Vorschläge sind mit dem Standardprofil «fastbike» gerechnet, das Gravel weniger meidet – nicht gleichwertig. Gravel-Angaben je Vorschlag beachten.</p>` : "";
    const wxBtn = !R().consent().wetter ? `<div class="row"><button class="btn" data-tr="wx">Wetter laden (zustimmen)</button><span class="hint">Ohne Wetter: kein Vorschlag B, Zeit ohne Wind (Band ±7 km/h).</span></div>` : "";
    // Regler stehen ausserhalb von «tr-body»: Beim Ziehen wird nur der Inhalt darunter neu gezeichnet, sonst bräche das Ziehen ab.
    box.innerHTML = `${fall}${r.hinweise.map((h) => `<p class="hint">${esc(h)}</p>`).join("")}${wxBtn}
      <div class="tr-sliders">${slider("tr-haupt", isNum(TS.intens) ? "Grundlage" : "Intensität", TS.haupt)}${isNum(TS.intens) ? slider("tr-intens", "Intervalle", TS.intens) : ""}</div>
      <div id="tr-body"></div>${err}`;
    bindRes();
    renderBody();
  }
  /** Nur Vergleich, Karten und Auswahl neu zeichnen (nach Regler, Planer-Änderung); die Regler bleiben unberührt. */
  function renderBody() {
    const body = $("tr-body");
    if (!body || !TS.res || !TS.res.A) { renderRes(); return; }
    const r = TS.res, x = TS.ctx;
    const zeile = (k) => { const c = r[k]; if (!c || c.K.unzureichend) return ""; const K = c.K, e = eignung(K); return `<tr class="${TS.gewaehlt === k ? "on" : ""}"><td><span class="tr-key sm" style="background:${FARBE[k]}">${k}</span></td><td>${km(K.L)}</td><td>${dur(K.T)}</td><td>${num(K.up)}</td><td class="${Math.abs(K.abw) <= x.wo.tol ? "" : "warn-t"}">${K.abw >= 0 ? "+" : "−"}${num(Math.abs(K.abw * 100))} %</td><td><span class="badge ${NOTE[e.note]}">${esc(e.note)}</span></td><td>${TS.gewaehlt === k ? '<span class="pill">gewählt</span>' : `<button class="btn rp-vbtn" data-wahl="${k}" aria-label="Vorschlag ${k} wählen">Wählen</button>`}</td></tr>`; };
    body.innerHTML = `${TS.gewaehlt ? selInfo() : ""}
      <div class="tbl-wrap"><table class="t tr-vt"><tr><th></th><th>km</th><th>Zeit</th><th>Hm</th><th>vs. Plan</th><th>Eignung</th><th></th></tr>${["A", "B", "C"].map(zeile).join("")}</table></div>
      ${TS.gewaehlt ? `<details class="tr-det" ${TS.detOffen ? "open" : ""}><summary>Vorschläge im Detail</summary>${["A", "B", "C"].map(karteHtml).join("")}</details>` : ["A", "B", "C"].map(karteHtml).join("")}
      <p class="hint">${TS.anfragen} Routing-Anfragen (${TS.cache} aus dem Zwischenspeicher)${r.d_schaetzung ? ` · Startschätzung ${km(r.d_schaetzung)} km aus deiner Zeitprognose` : ""} · Regeln ${esc(TR().VERSIONS.vorschlag)}, ${esc(TR().VERSIONS.intervalle)}, ${esc(TR().VERSIONS.wetter)}, ${esc(RT().VERSIONS.zeit)}.</p>`;
    bindBody(body);
  }
  function selInfo() {
    const r = TS.planerRoute, I = TS.planerIv || [], s = R().sim();
    const dauer = s && !s.unzureichend ? s.moving_s : null, plan = TS.wo.dauer_s, abw = dauer && plan ? (dauer - plan) / plan : null;
    return `<div class="rp-card tr-sel"><b>Im Planer: Vorschlag ${TS.gewaehlt}</b>
      <p class="hint">Plan ${dur(plan)} h · Prognose im Planer ${dur(dauer)} h${isNum(abw) ? ` (${abw >= 0 ? "+" : "−"}${num(Math.abs(abw * 100))} %)` : ""}. Zwischenziele verschieben, ergänzen oder umkehren ist im Planer möglich; die Intervalle wandern mit.</p>
      ${isNum(abw) && Math.abs(abw) > TS.wo.tol ? `<p class="verdict warn">Die Route passt nicht mehr zur Plandauer (±${num(TS.wo.tol * 100)} %). <button class="btn" data-tr="neu">Route neu berechnen</button></p>` : ""}
      ${r && I.length ? `<ol class="tr-ivs">${I.map((v) => `<li class="${v.note}"><b>${v.nr}</b> km ${isNum(v.d0) ? km(v.d0) : "–"}–${isNum(v.d1) ? km(v.d1) : "–"} · <span class="badge ${NOTE[v.note]}">${v.note}</span>${v.gruende.length ? ` <small>${esc(v.gruende.join("; "))}</small>` : ""}</li>`).join("")}</ol>` : ""}
      <p class="hint">Export zu Garmin: unten im Planer «GPX» (Name und Intervall-Beginne als Wegpunkte), dann in Garmin Connect unter Training → Strecken → Importieren. Oder die GPX-Datei im Chat schicken – ich lade sie als Strecke hoch, aber nur mit deinem Ja.</p>
      <div class="row"><button class="btn" data-tr="ende">Training beenden</button></div></div>`;
  }

  /* ---------------- Ereignisse ---------------- */
  function bind() {
    const box = $("rp-train"); if (!box) return;
    const on = (id, ev, f) => { const el = $(id); if (el) el.addEventListener(ev, f); };
    on("tr-wo", "change", (e) => { setWorkout(e.target.value); render(); });
    on("tr-datum", "change", (e) => { TS.datum = e.target.value || TS.datum; if (TS.res) wetterNeu(); });   // anderer Tag: Wetter für diesen Tag holen
    on("tr-zeit", "change", (e) => { if (/^\d\d:\d\d$/.test(e.target.value)) { TS.zeit = e.target.value; store.set("zeit", TS.zeit); if (TS.res) { wetterNeu(); } } });
    on("tr-ort", "change", (e) => ortWahl(e.target.value, "start"));
    on("tr-zielort", "change", (e) => ortWahl(e.target.value, "ziel"));
    on("tr-sport", "change", (e) => { TS.sport = e.target.value; TS.opts = {}; const m = modus(); TS.haupt = isNum(TS.wo.haupt) && TS.wo.modus === m ? Math.round(TS.wo.haupt) : defaultWert(m); TS.res = null; clearKand(); render(); });
    on("tr-art", "change", (e) => { TS.routenart = e.target.value; TS.res = null; clearKand(); render(); });
    on("tr-pz", "change", (e) => { TS.pz = e.target.value; if (TS.res) neuBewerten(); });
    on("tr-ziel", "change", (e) => { TS.artOv = e.target.value; if (TS.res) neuBewerten(); });
    on("tr-schotter", "change", (e) => { TS.opts.schotter = e.target.checked; TS.res = null; clearKand(); render(); });
    on("tr-go", "click", () => suche());
    box.querySelectorAll("[data-man]").forEach((el) => el.addEventListener("change", () => {
      const k = el.dataset.man; TS.man[k] = el.type === "checkbox" ? el.checked : el.tagName === "SELECT" ? el.value : +el.value;
      if (k === "sport") TS.man.modus = TS.man.sport === "lauf" ? "pace" : TS.man.sport === "wandern" ? "hf" : "watt";
      if (k === "sport" || k === "modus") { TS.man.wert = TS.man.modus === "pace" ? 330 : TS.man.modus === "hf" ? 140 : 200; TS.man.iv_wert = TS.man.modus === "pace" ? 285 : TS.man.modus === "hf" ? 160 : 260; }
      setWorkout("m"); render();
    }));
    box.querySelectorAll("[data-tr]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.tr;
      if (a === "zu") hide();
      else if (a === "ende") beenden();
      else if (a === "neu") { TS.gewaehlt = null; suche(); }
      else if (a === "pick-ab") { TS.pick = null; render(); }
      else if (a === "form") { TS.formOffen = !TS.formOffen; render(); }
      else if (a === "ok" || a === "ok-wx") { R().setConsent(Object.assign({ routing: true, routing_am: new Date().toISOString() }, a === "ok-wx" ? { wetter: true, wetter_am: new Date().toISOString() } : {})); TS.fehler = null; suche(); }
    }));
    const det = box.querySelector(".tr-orte"); if (det) det.addEventListener("toggle", () => (TS.orteOffen = det.open));
    box.querySelectorAll("[data-ort-del]").forEach((b) => b.addEventListener("click", async () => { await orteSetzen(orte().filter((o) => o.id !== b.dataset.ortDel)); if (TS.ortId === b.dataset.ortDel) TS.ortId = null; render(); }));
    box.querySelectorAll("[data-ort-neu]").forEach((b) => b.addEventListener("click", () => ortNeu(b.dataset.ortNeu)));
    // Sicherung der Startorte (V5.7.1): verschlüsselte Datei mit allen Eingaben dieses Geräts; laden ergänzt fehlende Orte
    const sich = box.querySelector("[data-ort-sichern]"); if (sich) sich.addEventListener("click", () => UI().Inbox.exportFile());
    const lad = box.querySelector("[data-ort-laden]");
    if (lad) lad.addEventListener("change", async () => {
      const f = lad.files && lad.files[0]; if (!f) return;
      try { const n0 = orte().length; await UI().Inbox.importFile(f); TS.fehler = null; TS.orteOffen = true; TS.ortHinweis = `Sicherung geladen: ${orte().length - n0} Startort(e) ergänzt, ${orte().length} insgesamt.`; }
      catch (e) { TS.fehler = "Sicherung nicht lesbar (" + (e.message || e) + "). Mit einem anderen Seitenpasswort verschlüsselte Dateien lassen sich nicht öffnen."; }
      render();
    });
  }
  /** Kopf der Ergebnisse: Wetter-Zustimmung und Regler (bleiben beim Ziehen bestehen). */
  function bindRes() {
    const box = $("tr-res"); if (!box) return;
    const wx = box.querySelector('[data-tr="wx"]');
    if (wx) wx.addEventListener("click", () => { R().setConsent({ wetter: true, wetter_am: new Date().toISOString() }); wetterNeu(); });
    const m = modus(), fmtW = (v) => (m === "pace" ? FK().pace(v) + " /km" : m === "watt" ? `${num(v)} W` : m === "hf" ? `${num(v)} bpm` : `${num(v)} %`);
    for (const [id, key] of [["tr-haupt", "haupt"], ["tr-intens", "intens"]]) {
      const el = $(id); if (!el) continue;
      el.addEventListener("input", () => { TS[key] = +el.value; const v = $(id + "-v"); if (v) v.textContent = fmtW(TS[key]); neuBewerten(); });
    }
  }
  /** Vergleich und Karten: Auswahl, Karte, neu berechnen, beenden. */
  function bindBody(body) {
    body.querySelectorAll("[data-wahl]").forEach((b) => b.addEventListener("click", () => waehle(b.dataset.wahl)));
    body.querySelectorAll("[data-zeig]").forEach((b) => b.addEventListener("click", () => { const c = TS.res[b.dataset.zeig]; if (c) { if (innerWidth <= 760) R().setSheet("min"); R().fitCoords(c.route.lon.map((x, i) => [x, c.route.lat[i]])); } }));
    body.querySelectorAll("[data-tr]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.tr;
      if (a === "neu") { TS.gewaehlt = null; suche(); }
      else if (a === "ende") beenden();
    }));
    const det = body.querySelector(".tr-det"); if (det) det.addEventListener("toggle", () => (TS.detOffen = det.open));
  }
  /** Startzeit geändert: Wetter für die neue Zeit holen (meist aus dem Zwischenspeicher) und neu bewerten – ohne neue Routen. */
  async function wetterNeu() {
    if (!TS.res || !TS.res.pool) return;
    TS.ctx = Object.assign(ctx(), { start: TS.ctx.start, ziel: TS.ctx.ziel });
    let m = null;
    try { m = await wetterFuer(TS.res.pool.map((c) => c.route)); } catch (e) { TS.wetterGrund = "Wetter nicht verfügbar: " + (e.message || e); }
    for (const c of TS.res.pool) { c.field = m ? m.get(c.route.id) || null : null; TR().bewerte(c, TS.ctx, c.field); }
    const keep = TS.gewaehlt;
    Object.assign(TS.res, TR().auswahl(TS.res.pool, TS.ctx));
    if (keep) TS.gewaehlt = keep;
    renderRes(); zeigeKand();
  }
  function ortWahl(v, fuer) {
    if (v === "gps") { gps((ll) => { const t = { ll, name: "Aktueller Standort" }; if (fuer === "ziel") { TS.zielTemp = t; TS.zielId = "temp"; } else { TS.ortTemp = t; TS.ortId = "temp"; } render(); }); return; }
    if (v === "karte") { TS.pick = { fuer }; if (innerWidth <= 760) R().setSheet("min"); render(); return; }
    if (fuer === "ziel") TS.zielId = v; else TS.ortId = v;
    TS.res = null; clearKand(); render();
  }
  function gps(cb) {
    if (!navigator.geolocation) { TS.fehler = "Standort auf diesem Gerät nicht verfügbar."; render(); return; }
    TS.msg = "Standort wird bestimmt …"; const el = $("tr-status"); if (el) el.textContent = TS.msg;
    navigator.geolocation.getCurrentPosition((p) => cb([+p.coords.longitude.toFixed(5), +p.coords.latitude.toFixed(5)]),
      (e) => { TS.fehler = "Standort nicht verfügbar (" + (e.message || "keine Freigabe") + ")."; render(); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  function neuerName() { const s = $("tr-on"), e = $("tr-oe"); const n = s ? s.value : "Ort"; return n === "Eigener Name" ? ((e && e.value.trim()) || "Ort") : n; }
  async function ortSpeichern(name, ll) {
    const list = orte().filter((o) => o.name !== name);
    list.push({ id: "o" + Date.now().toString(36), name, lon: +ll[0].toFixed(5), lat: +ll[1].toFixed(5), gesetzt: new Date().toISOString().slice(0, 10) });
    await orteSetzen(list);
    TS.ortId = list[list.length - 1].id; store.set("ort", TS.ortId);
    render();
  }
  function ortNeu(art) {
    const name = neuerName();
    if (art === "karte") { TS.pick = { fuer: "neu", name }; if (innerWidth <= 760) R().setSheet("min"); render(); return; }
    if (art === "gps") { gps((ll) => ortSpeichern(name, ll)); return; }
    if (art === "planer") { const v = R().state().vias; if (v.length) ortSpeichern(name, v[0]); return; }
    if (art === "suche") {
      const q = ($("tr-oq") || {}).value || "", list = $("tr-oqr");
      if (q.trim().length < 2 || !list) return;
      list.hidden = false; list.innerHTML = `<li class="hint"><span class="spin" aria-hidden="true"></span> Suche …</li>`;
      fetch(RT().sucheUrl(q, R().store.get("suche", RT().SUCHE))).then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))).then((js) => {
        const res = RT().sucheErgebnisse(js);
        list.innerHTML = res.length ? res.map((o, i) => `<li><button class="rp-qhit" data-i="${i}">${esc(o.label)}</button></li>`).join("") : `<li class="hint">Nichts gefunden.</li>`;
        list.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { const o = res[+b.dataset.i]; list.hidden = true; ortSpeichern(name, [o.lon, o.lat]); }));
      }).catch((e) => { list.innerHTML = `<li class="hint">Suche nicht erreichbar (${esc(e.message || e)}).</li>`; });
    }
  }

  /* ---------------- Planer-Anbindung ---------------- */
  function aktiv() { return !!(TS.gewaehlt && TS.wo); }
  /** Workout-Verlauf für den Planer (nur bei gewähltem Vorschlag, gleicher Sportfamilie und Modus des Workouts). */
  function planFor(sport, mode, value) {
    if (!aktiv() || TR().FAMILIE[sport] !== TR().FAMILIE[TS.sport] || mode !== TS.wo.modus || !isNum(value)) return null;
    TS.haupt = value;
    return TR().zeitplan(TS.wo, { haupt: value, intens: TS.intens }).fn;
  }
  function onPlanner(route, sim) {
    if (!aktiv()) { TS.planerRoute = null; TS.planerIv = null; return; }
    TS.planerRoute = route || null;
    if (route && TS.fitNach) { TS.fitNach = false; const ll = route.lon.map((x, i) => [x, route.lat[i]]); setTimeout(() => R().fitCoords(ll), 380); }   // nach dem Umschalten der Blatthöhe
    if (route && sim && !sim.unzureichend && TS.ctx) {
      const fam = TR().FAMILIE[TS.sport];
      const plan = TR().zeitplan(TS.wo, { haupt: TS.haupt, intens: TS.intens });
      TS.planerIv = TR().intervalle(route, sim, plan, { fam, typ: TR().intervallTyp(Object.assign({}, TS.wo, artOverride(TS.wo)), fam), rennrad: TS.sport === "rennrad", unterbr: TR().unterbrechungen(route, fam) });
    } else TS.planerIv = null;
    zeigeIntervalle();
    if (TS.offen && $("tr-res")) { if ($("tr-body")) renderBody(); else renderRes(); }
  }
  function chartBands(route) { return aktiv() && route && route === TS.planerRoute && TS.planerIv ? TS.planerIv.filter((x) => isNum(x.d0) && isNum(x.d1)) : null; }
  function gpxExtras(route) {
    if (!aktiv() || route !== TS.planerRoute || !TS.planerIv) return null;
    const m = modus(), fw = (v) => (m === "pace" ? FK().pace(v) + "/km" : m === "watt" ? Math.round(v) + " W" : Math.round(v) + " bpm");
    if (TS.gewaehlt) speichern(TS.gewaehlt, { route, sim: R().sim() });
    return TS.planerIv.filter((x) => isNum(x.d0)).map((x) => { const a = RT().at(route, x.d0); return { lon: a.lon, lat: a.lat, name: `Intervall ${x.nr}: ${TR().mmss(x.t1 - x.t0)} @ ${fw(x.wert)}` }; });
  }
  function wantsMapClick() { return !!TS.pick; }
  function mapClick(ll) {
    const p = TS.pick; TS.pick = null;
    if (!p) return;
    if (innerWidth <= 760) R().setSheet("full");
    if (p.fuer === "neu") { ortSpeichern(p.name, ll); return; }
    const t = { ll, name: "Punkt auf der Karte" };
    if (p.fuer === "ziel") { TS.zielTemp = t; TS.zielId = "temp"; } else { TS.ortTemp = t; TS.ortId = "temp"; }
    TS.res = null; clearKand(); render();
  }

  /* ---------------- Kalender: gespeicherte Vorschläge und Vergleich ---------------- */
  function vorschlaege() { return UI() && UI().merged ? UI().merged("trainingsrouten", "trainingsrouten") : D().trainingsrouten || []; }
  function kalender(ds) {
    const L = vorschlaege().filter((r) => r.datum === ds); if (!L.length) return "";
    return L.map((r) => `<div class="tr-kal"><span class="dot" style="background:${FARBE[r.vorschlag] || "#627488"}"></span> Trainingsroute ${esc(r.vorschlag)} (${esc(r.titel || "")}): ${km(r.pred.L)} km, Prognose ${dur(r.pred.moving_s)} h${r._lokal ? " · nur auf diesem Gerät" : ""}
      <button class="btn ex-btn" data-trv="${esc(r.id)}">Vorschlag vs. Ist</button><div class="tr-vgl" id="trv-${esc(r.id)}" hidden></div></div>`).join("");
  }
  function zeigeVergleich(id) {
    const rec = vorschlaege().find((r) => r.id === id), box = document.getElementById("trv-" + id); if (!rec || !box) return;
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    const a = TR().passendeAktivitaet(rec, D().activities || []);
    if (!a) { box.innerHTML = `<p class="hint">Noch keine passende Aktivität an diesem Tag (gleiche Sportart, draussen). Nach dem Nacht-Update erscheint sie hier.</p>`; return; }
    let route = null, folge = null;
    try { route = rec.geo ? TR().ausKompakt(rec.geo, rec.sport) : null; } catch (e) { route = null; }
    try { folge = a.poly && rec.geo ? TR().folgeAnteil(TR().polyDecode(rec.geo.ll, 5), TR().polyDecode(a.poly, 5)) : null; } catch (e) { folge = null; }
    const inp = route && R() ? R().inputFor(rec.sport, "watt", a.watt) : null;
    const V = TR().vergleich(rec, a, { route, inp, folge, kal_datum: (D().kalibrierung || {}).erstellt });
    const f = (row, v) => (v == null ? "–" : row.einheit === "s" ? dur(v) + " h" : row.einheit === "m" ? (row.k === "distanz" ? km(v) + " km" : num(v) + " m") : row.einheit === "s/km" ? FK().pace(v) + " /km" : row.einheit === "km/h" ? num(v, 1) + " km/h" : num(v) + " " + row.einheit);
    const alle = vorschlaege().map((r) => { const x = TR().passendeAktivitaet(r, D().activities || []); return x ? TR().vergleich(r, x, { kal_datum: (D().kalibrierung || {}).erstellt }) : null; });
    const G = TR().modellGuete(alle);
    box.innerHTML = `<div class="tbl-wrap"><table class="t tr-vt"><tr><th></th><th>Plan</th><th>Prognose</th><th>Ist</th></tr>${V.rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${f(r, r.plan)}</td><td>${f(r, r.prognose)}</td><td>${f(r, r.ist)}${r.ist2 ? ` (NP ${num(r.ist2)})` : ""}</td></tr>`).join("")}</table></div>
      <p class="hint">Aktivität «${esc(a.name)}». Abweichung der Zeitprognose: <b>${isNum(V.fehler) ? (V.fehler >= 0 ? "+" : "−") + num(Math.abs(V.fehler * 100), 1) + " %" : "–"}</b>${V.bei_ist ? ` · bei deiner tatsächlichen Leistung (Ø ${num(V.bei_ist.watt)} W) hätte das Modell ${dur(V.bei_ist.moving_s)} h gesagt (${(V.bei_ist.fehler >= 0 ? "+" : "−") + num(Math.abs(V.bei_ist.fehler * 100), 1)} %)` : ""}.
      ${V.folge != null ? ` Strecke zu ${num(V.folge * 100)} % wie vorgeschlagen gefahren.` : ""}${V.intervalle && isNum(V.intervalle.im_ziel_pct) ? ` Workout-Schritte: ${num(V.intervalle.im_ziel_pct)} % der Zeit im Zielbereich (${esc(V.intervalle.quelle)}).` : ""}</p>
      <p class="hint">Wetter: Prognose ${rec.wetter && rec.wetter.status !== "keine" ? `${num(rec.wetter.temp_min)}–${num(rec.wetter.temp_max)} °C, ${isNum(rec.wetter.mittel_ms) ? `${rec.wetter.mittel_ms < 0 ? "Gegenwind" : "Rückenwind"} Ø ${num(Math.abs(rec.wetter.mittel_ms * 3.6))} km/h` : "Wind unbekannt"}, ${num(rec.wetter.regen_mm, 1)} mm` : "nicht geladen"}; Ist ${V.wetter.ist ? `${num(V.wetter.ist.temp)} °C, Wind ${num(V.wetter.ist.wind_kmh)} km/h aus ${esc(String(V.wetter.ist.aus || "").toUpperCase())} (${esc(V.wetter.ist.station || "Station")})` : "keine Daten"}.</p>
      ${V.hinweise.map((h) => `<p class="hint">${esc(h)}</p>`).join("")}
      <p class="hint">Modellgüte (${esc(TR().VERSIONS.auswertung)}): ${G.n ? `${G.n} unabhängige Vergleiche, mittlerer Fehler ±${num(G.median_abs * 100, 1)} %, Tendenz ${(G.bias >= 0 ? "+" : "−") + num(Math.abs(G.bias * 100), 1)} %` : "noch keine unabhängigen Vergleiche"} – nur Einheiten nach dem Stand der Kalibrierung und mit ≥ 80 % gefolgter Strecke.</p>`;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-str]");
    if (b) { e.preventDefault(); openPlan(b.dataset.str); return; }
    const v = e.target.closest && e.target.closest("[data-trv]");
    if (v) { e.preventDefault(); zeigeVergleich(v.dataset.trv); }
  });
  window.TRUI = { show, hide, openPlan, planFor, onPlanner, chartBands, gpxExtras, gpxName, wantsMapClick, mapClick, kalender, zeigeVergleich, state: () => TS, waehle, suche };
})();
