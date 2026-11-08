/* Abnahmetests Routenplaner V5.3 (js/route.js).
 * Echte Routen: aufgezeichnete Antworten einer lokal gebauten BRouter-Instanz (Originalquellcode) mit dem
 * OSM-Testausschnitt Dreieich aus dem BRouter-Repository (© OpenStreetMap-Mitwirkende, ODbL), siehe tests/fixtures.
 * Höhenverläufe für Anstiege und Wetterfelder sind ausdrücklich SYNTHETISCH (nur Testgeometrie, keine Live-Daten). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const RT = require("../js/route.js");

const FX = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", n), "utf8"));
const load = (n) => { const fx = FX(n); return RT.buildRoute(fx.antworten.map(RT.parseBRouter), fx.punkte, { sport: fx.sport, engine: fx.engine }); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} ≉ ${b} (±${tol})`);

/* ---------- synthetische Testgeometrie (keine echte Route) ---------- */
function synthRoute(eleFn, L, sport, dirDeg) {
  const n = Math.round(L / 10), lon0 = 8.5, lat0 = 47.0, br = (dirDeg == null ? 90 : dirDeg) * Math.PI / 180;
  const coords = [];
  for (let i = 0; i <= n; i++) {
    const d = (i * L) / n;
    coords.push([lon0 + (d * Math.sin(br)) / (111320 * Math.cos(lat0 * Math.PI / 180)), lat0 + (d * Math.cos(br)) / 110540, eleFn(d)]);
  }
  const leg = { coords, edges: [{ i0: 0, i1: n, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: {} }], props: { creator: "SYNTHETISCH" } };
  return RT.buildRoute([leg], [coords[0], coords[n]], { sport: sport || "rennrad" });
}

test("BRouter-Antwort: Meldungen lückenlos auf die Linie verteilt, Länge stimmt mit BRouter", () => {
  for (const n of ["brouter_dreieich_rennrad_hin.json", "brouter_dreieich_runde.json", "brouter_dreieich_gravel.json", "brouter_dreieich_wandern.json"]) {
    const fx = FX(n);
    let brSum = 0;
    for (const gj of fx.antworten) {
      const leg = RT.parseBRouter(gj);
      brSum += leg.props.trackLength;
      assert.equal(leg.edges[0].i0, 0, n);
      for (let i = 1; i < leg.edges.length; i++) assert.equal(leg.edges[i].i0, leg.edges[i - 1].i1, `${n}: Stücke zusammenhängend`);
      assert.equal(leg.edges[leg.edges.length - 1].i1, leg.coords.length - 1, `${n}: bis zum Ende`);
      assert.ok(leg.edges.every((e) => !e.ungenau), `${n}: alle Meldungen exakt zugeordnet`);
    }
    const r = load(n);
    near(r.L, brSum, brSum * 0.005, `${n}: Länge`);
    assert.equal(r.gapMax, 0, `${n}: Zwischenziele ohne Sprung`);
    assert.ok(!r.unvollstaendig);
    near(r.segs[0].d0, 0, 1e-9); near(r.segs[r.segs.length - 1].d1, r.L, 1e-6);
  }
});

test("T01 Umkehren: A→1→2→B und B→2→1→A sind echte, unterschiedliche Routen und halten Einbahnen ein", () => {
  const hin = load("brouter_dreieich_rennrad_hin.json"), rueck = load("brouter_dreieich_rennrad_rueck.json");
  const fh = FX("brouter_dreieich_rennrad_hin.json").punkte, fr = FX("brouter_dreieich_rennrad_rueck.json").punkte;
  assert.deepEqual(fr, fh.slice().reverse(), "Zwischenziele in umgekehrter Reihenfolge");
  assert.equal(hin.vias.length, 4); assert.equal(rueck.vias.length, 4);
  for (const r of [hin, rueck]) for (let i = 1; i < r.vias.length; i++) assert.ok(r.vias[i].d > r.vias[i - 1].d, "Zwischenziele entlang der Route");
  // keine blosse Spiegelung: ein Teil der Hinroute liegt > 15 m von der Rückroute entfernt
  let weit = 0;
  for (let i = 0; i < hin.lon.length; i++) { const p = RT.project(rueck, hin.lon[i], hin.lat[i]); if (p.dist > 15) weit++; }
  assert.ok(weit / hin.lon.length > 0.05, `andere Linienführung (${weit} Punkte)`);
  // Einbahn: Rennrad nie gegen oneway=yes (ausser oneway:bicycle=no)
  for (const r of [hin, rueck]) {
    const falsch = r.segs.filter((s) => s.tags.oneway === "yes" && s.reverse && s.tags["oneway:bicycle"] !== "no");
    assert.equal(falsch.length, 0);
    assert.ok(r.segs.some((s) => s.tags.oneway === "yes"), "Route nutzt Einbahnstrassen (Test hat Aussagekraft)");
  }
  near(hin.L, 2546, 3); near(rueck.L, 2582, 3);
});

test("Sportprofile führen über unterschiedliche Wege; Zu Fuss gegen Einbahn erlaubt, Schiebestrecken markiert", () => {
  const rr = load("brouter_dreieich_rennrad_hin.json"), gr = load("brouter_dreieich_gravel.json"), wa = load("brouter_dreieich_wandern.json");
  assert.notEqual(Math.round(gr.L), Math.round(wa.L));
  assert.ok(wa.segs.some((s) => s.tags.oneway === "yes" && s.reverse), "Fussweg-Profil darf Einbahn gegen die Richtung gehen");
  const zg = RT.stats(RT.pieces(gr, "zugang"), gr.L);
  assert.ok(zg.find((z) => z.cat === "schieben"), "Gravel: Fussweg ohne Velofreigabe als Schieben ausgewiesen");
  assert.ok(RT.stats(RT.pieces(rr, "zugang"), rr.L).every((z) => z.cat === "ok"));
});

test("T04 Belag/Wegart: Summe 100 % inkl. unbekannt, Asphalt in getrennten Stücken", () => {
  const r = load("brouter_dreieich_runde.json");
  for (const tab of ["belag", "wegart", "zugang"]) {
    const st = RT.stats(RT.pieces(r, tab), r.L);
    near(st.reduce((s, x) => s + x.pct, 0), 100, 1e-6, tab);
  }
  const belag = RT.stats(RT.pieces(r, "belag"), r.L);
  assert.ok(belag.find((x) => x.cat === "unbekannt"), "fehlende Belagsangaben als unbekannt");
  const asph = RT.pieces(r, "belag").filter((p) => p.cat === "asphalt");
  assert.ok(asph.length >= 3, `mehrere getrennte Asphaltstücke (${asph.length})`);
  for (let i = 1; i < asph.length; i++) assert.ok(asph[i].d0 > asph[i - 1].d1, "nicht zusammenhängend");
  // Kategorien strikt getrennt: paved ≠ asphalt, unpaved eigene Kategorie
  assert.equal(RT.surfaceCat({ surface: "paved" }), "hart");
  assert.equal(RT.surfaceCat({ surface: "unpaved" }), "unbefestigt");
  assert.equal(RT.surfaceCat({}), "unbekannt");
  assert.equal(RT.surfaceCat({ surface: "fine_gravel" }), "kies");
});

test("T03 Karte → Profil → Karte: gleiche Stelle bei 1/3 und 2/3, auch neben der Linie getippt", () => {
  for (const n of ["brouter_dreieich_runde.json", "brouter_dreieich_rennrad_hin.json"]) {
    const r = load(n);
    for (const f of [1 / 3, 2 / 3, 0.25, 0.75]) {
      const d = r.L * f, a = RT.at(r, d);
      const p = RT.project(r, a.lon, a.lat, { near_d: d });
      near(p.d, d, 0.5, `${n} ${f}: Rundweg`);
      assert.ok(p.dist < 0.5);
      // 8 m seitlich daneben getippt (Finger): Projektion bleibt auf derselben Stelle (±10 m)
      const h = r.profile.head[a.k] * Math.PI / 180, off = 8;
      const lon2 = a.lon + (off * Math.cos(h)) / (111320 * Math.cos(a.lat * Math.PI / 180)), lat2 = a.lat - (off * Math.sin(h)) / 110540;
      const q = RT.project(r, lon2, lat2, { near_d: d });
      near(q.d, d, 10, `${n} ${f}: daneben`);
    }
  }
});

test("Rundtour: Start = Ziel, Projektion nahe beim bisherigen Cursor", () => {
  const r = load("brouter_dreieich_runde.json");
  const a0 = RT.at(r, 2), a1 = RT.at(r, r.L - 2);
  assert.ok(RT.hav(a0.lon, a0.lat, a1.lon, a1.lat) < 30, "Schleife geschlossen");
  near(RT.project(r, a1.lon, a1.lat, { near_d: r.L }).d, r.L - 2, 6, "am Ende");
  near(RT.project(r, a0.lon, a0.lat, { near_d: 0 }).d, 2, 6, "am Anfang");
});

test("T05 Anstiege: synthetisches Profil – echte Abschnitte, Glättung dokumentiert, kleine Wellen ignoriert", () => {
  // SYNTHETISCH: 1 km flach, 2 km mit 6 % (+120 m), 0,5 km flach, 1 km −8 % (−80 m), Welle +10 m, 1 km flach
  const ele = (d) => d < 1000 ? 500 : d < 3000 ? 500 + (d - 1000) * 0.06 : d < 3500 ? 620 : d < 4500 ? 620 - (d - 3500) * 0.08 : d < 4750 ? 540 + (d - 4500) * 0.04 : d < 5000 ? 550 - (d - 4750) * 0.04 : 540;
  const r = synthRoute(ele, 6000);
  const c = RT.climbs(r);
  assert.equal(c.up.length, 1, "nur der echte Anstieg"); assert.equal(c.down.length, 1);
  near(c.up[0].hm, 120, 6); near(c.up[0].len, 2000, 160); near(c.up[0].mittel, 0.06, 0.006);
  near(c.up[0].d0, 1000, 120); near(c.up[0].d1, 3000, 120);
  near(c.down[0].hm, 80, 6); near(c.down[0].mittel, 0.08, 0.01);
  assert.ok(c.up[0].max != null && c.up[0].max < 0.075, "Maximalsteigung über 100 m");
  near(r.profile.up, 130, 6, "Aufstieg mit 3-m-Hysterese inkl. 10-m-Welle");
  // grobe Punktdichte → keine Maximalsteigung
  const leg = { coords: [[8.5, 47, 500], [8.5 + 1500 / 75900, 47, 590], [8.5 + 3000 / 75900, 47, 680]], edges: [{ i0: 0, i1: 2, tags: {}, nodeTags: {} }], props: {} };
  const grob = RT.buildRoute([leg], [[8.5, 47], [8.54, 47]], { sport: "wandern" });
  const cg = RT.climbs(grob);
  assert.equal(cg.up.length, 1); assert.equal(cg.up[0].max, null);
  // echte flache Route: kein Anstieg über 25 Hm
  assert.equal(RT.climbs(load("brouter_dreieich_runde.json")).up.length, 0);
});

test("T07 Leistung 180/220/260 W: Zeit nachvollziehbar, Abfahrt begrenzt, nie unendlich", () => {
  const ele = (d) => d < 5000 ? 400 + d * 0.06 : d < 8750 ? 700 - (d - 5000) * 0.08 : 400;   // SYNTHETISCH: +6 %, −8 %, flach
  const r = synthRoute(ele, 15000, "rennrad");
  const t = [180, 220, 260].map((w) => RT.simulate(r, { mode: "watt", value: w, rad: { m: 80, cda: 0.3 } }));
  assert.ok(t[0].moving_s > t[1].moving_s && t[1].moving_s > t[2].moving_s);
  // bergauf skaliert Tempo fast proportional zur Leistung, flach unterproportional
  const up = (x) => x.t[Math.round(4000 / 20)] - x.t[Math.round(1000 / 20)];
  const flat = (x) => x.t[Math.round(14500 / 20)] - x.t[Math.round(11000 / 20)];
  assert.ok(up(t[0]) / up(t[2]) > flat(t[0]) / flat(t[2]), "Leistung wirkt bergauf stärker");
  for (const x of t) { assert.ok(isFinite(x.moving_s)); for (let k = 0; k < x.v.length; k++) assert.ok(x.v[k] <= 60 / 3.6 + 1e-6, "Abfahrt ≤ 60 km/h"); }
  assert.ok(t[1].cap.some((c) => c === 1), "Abfahrtsbegrenzung greift");
  const z = RT.simulate(r, { mode: "watt", value: 0, rad: { m: 80, cda: 0.3 } });
  assert.ok(isFinite(z.moving_s), "0 W: kein Stillstand, Schiebetempo");
  // echte Route: 180/220/260 W
  const real = load("brouter_dreieich_rennrad_hin.json");
  const rt = [180, 220, 260].map((w) => RT.eta(real, { mode: "watt", value: w, rad: { m: 80 } }).moving_s);
  assert.ok(rt[0] > rt[1] && rt[1] > rt[2]);
  const b = RT.eta(real, { mode: "watt", value: 220, rad: { m: 80 } });
  assert.ok(b.band[0] < b.moving_s && b.band[1] > b.moving_s, "Zeitband um die Schätzung");
});

test("HF- und Pace-Modi: ohne Kalibrierung «unzureichende Daten», mit Kalibrierung Zeit", () => {
  const r = load("brouter_dreieich_wandern.json");
  r.sport = "trail";
  const x = RT.simulate(r, { mode: "hf", value: 150, kal: {} });
  assert.ok(x.unzureichend && /unzureichend/i.test(x.grund));
  const kal = { lauf_hf_pace: { ok: true, a: -2.0, b: 0.03, mae: 12, n_test: 20 } };   // SYNTHETISCH
  const y = RT.simulate(r, { mode: "hf", value: 150, kal });
  assert.ok(!y.unzureichend); near(y.info.vflat, 2.5, 1e-9);
  const p = RT.simulate(r, { mode: "pace", value: 400 });
  assert.ok(p.moving_s > r.L / (1000 / 400) * 0.8);
  const rad = load("brouter_dreieich_rennrad_hin.json");
  assert.ok(RT.simulate(rad, { mode: "hf", value: 140, kal: {} }).unzureichend);
  const ok = RT.simulate(rad, { mode: "hf", value: 140, kal: { rad_hf_w: { ok: true, a: -100, b: 2.2, mae: 14 } } });   // SYNTHETISCH
  near(ok.info.P, 208, 1e-9);
});

test("Wetter: meteorologische Windrichtung (woher), Interpolation, Rundtour Gegen- und Rückenwind", () => {
  near(RT.windAlong(5, 270, 90), 5, 1e-9, "Westwind, Fahrt nach Osten = Rückenwind");
  near(RT.windAlong(5, 270, 270), -5, 1e-9, "Westwind, Fahrt nach Westen = Gegenwind");
  near(RT.windAlong(5, 0, 90), 0, 1e-9, "Nordwind, Fahrt nach Osten = Seitenwind");
  // SYNTHETISCHE Open-Meteo-Antwort: 2 Punkte, 3 Stunden; Wind dreht von 350° auf 10° (Nord), keine 180°-Sprünge
  const t0 = 1762600000 - (1762600000 % 3600);
  const resp = [0, 1].map(() => ({ elevation: 500, latitude: 47, longitude: 8.5, hourly: { time: [t0, t0 + 3600, t0 + 7200], temperature_2m: [10, 12, 14], precipitation: [0, 0.4, 2], precipitation_probability: [0, 30, 80], wind_speed_10m: [4, 4, 4], wind_direction_10m: [350, 10, 10], wind_gusts_10m: [8, 8, 8] } }));
  const pts = [{ d: 0, lon: 8.5, lat: 47, ele: 500 }, { d: 1000, lon: 8.51, lat: 47, ele: 500 }];
  const W = RT.weatherField(pts, resp);
  const m = W(500, t0 + 1800, 180);
  near(m.temp, 11, 1e-9); near(m.speed, 4 * Math.cos(10 * Math.PI / 180), 1e-6, "Vektormittel");
  assert.ok(m.dirFrom < 1 || m.dirFrom > 359, `Richtung Nord (${m.dirFrom})`);
  near(m.along, m.speed, 1e-6, "Nordwind, Fahrt nach Süden = Rückenwind");
  assert.equal(W(500, t0 + 1800, 0).regen, 0.4, "Niederschlag der laufenden Stunde");
  // Rundtour mit Westwind 6 m/s: Hinweg Osten schneller, Rückweg Westen langsamer; umgekehrte Fahrtrichtung spiegelt
  const ost = synthRoute(() => 450, 10000, "rennrad", 90), west = synthRoute(() => 450, 10000, "rennrad", 270);
  const ww = () => ({ along: 0, temp: 15, regen: 0 });
  const field = (route) => (k) => ({ along: RT.windAlong(6, 270, route.profile.head[k]), temp: 15, regen: 0 });
  const a = RT.simulate(ost, { mode: "watt", value: 200, wetter: field(ost) }), b = RT.simulate(west, { mode: "watt", value: 200, wetter: field(west) });
  const c = RT.simulate(ost, { mode: "watt", value: 200, wetter: ww });
  assert.ok(a.moving_s < c.moving_s && b.moving_s > c.moving_s);
  assert.ok(a.wAlong[10] > 0 && b.wAlong[10] < 0, "Vorzeichen je Richtung");
});

test("Wetter-URL: mehrere Punkte, Unix-Zeit, m/s, Höhe je Punkt", () => {
  const r = load("brouter_dreieich_runde.json");
  const pts = RT.weatherPoints(r);
  assert.equal(pts[0].d, 0); near(pts[pts.length - 1].d, r.L, 1e-6);
  const u = RT.openMeteoUrl(pts, 1762600000, 1762610000);
  assert.ok(/timeformat=unixtime/.test(u) && /wind_speed_unit=ms/.test(u) && /wind_direction_10m/.test(u) && /elevation=/.test(u));
  assert.equal(u.split("latitude=")[1].split("&")[0].split(",").length, pts.length);
});

test("GPX nur aus gerouteter Linie, mit Zwischenzielen; nie bei unvollständiger Route", () => {
  const r = load("brouter_dreieich_rennrad_hin.json");
  const g = RT.gpx(r, "Test <A&B>");
  assert.equal((g.match(/<trkpt /g) || []).length, r.lon.length);
  assert.equal((g.match(/<wpt /g) || []).length, 4);
  assert.ok(/Test &lt;A&amp;B&gt;/.test(g) && /Geroutet mit BRouter/.test(g));
  assert.throws(() => RT.gpx({ ...r, unvollstaendig: true }, "x"));
});

test("Profil-Parameter für BRouter: Zahlen statt true/false, Optionen wechseln das Profil", () => {
  const g = RT.engineFor("gravel", {});
  assert.equal(g.engine, "gravel"); assert.equal(g.params.prefer_unpaved_paths, "1"); assert.equal(g.params.processUnusedTags, "1");
  assert.equal(RT.engineFor("gravel", { schotter: false }).params.prefer_unpaved_paths, "0");
  assert.equal(RT.engineFor("mtb", {}).engine, "gravel", "MTB standardmässig Forst-/Kieswege");
  const t = RT.engineFor("mtb", { technisch: true });
  assert.equal(t.engine, "mtb"); assert.equal(t.params.StrictNOBicycleaccess, "1");
  assert.equal(RT.engineFor("wandern", { sac: "2" }).params.SAC_scale_limit, "2");
  assert.equal(RT.engineFor("skitour", {}), null, "Skitour: kein Routing");
  const u = RT.brouterUrl("https://brouter.de/brouter", g, [9.5, 47.0], [9.51, 47.01]);
  assert.ok(u.startsWith("https://brouter.de/brouter?lonlats=9.500000,47.000000|9.510000,47.010000&profile=gravel&alternativeidx=0&format=geojson"));
  for (const v of Object.values(RT.SPORTS)) for (const o of Object.values(v.optionen || {})) if (o.param && !o.werte) assert.ok(/^[01]$/.test(o.an) && /^[01]$/.test(o.aus));
});

test("Fehler werden erklärt, nie still in eine Luftlinie verwandelt", async () => {
  assert.ok(/Kartendaten/.test(RT.explainError(400, "datafile E10_N45.rd5 not found")));
  assert.ok(/Wegnetz/.test(RT.explainError(400, "to-position not mapped in existing datafile")));
  assert.ok(/abgeschlossenen/.test(RT.explainError(400, "target island detected for section 0")));
  assert.ok(/Profil «gravel»/.test(RT.explainError(500, "", "gravel")), "500 ohne Text: Hinweis auf fehlendes Profil");
  const fake400 = async () => ({ ok: false, status: 400, text: async () => "datafile E10_N45.rd5 not found\n" });
  await assert.rejects(RT.fetchLeg(fake400, "http://x", RT.engineFor("rennrad"), [8.7, 50], [9.5, 47]), (e) => e.kind === "dienst" && /HTTP 400/.test(e.detail));
  const offline = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(RT.fetchLeg(offline, "http://x", RT.engineFor("rennrad"), [8.7, 50], [9.5, 47]), (e) => e.kind === "netz");
  const kaputt = async () => ({ ok: true, status: 200, text: async () => "<html>" });
  await assert.rejects(RT.fetchLeg(kaputt, "http://x", RT.engineFor("rennrad"), [8.7, 50], [9.5, 47]), (e) => e.kind === "format");
  assert.throws(() => RT.parseBRouter({ features: [] }));
});

test("Zugang: Autobahn, Velo-Verbot, Fussweg, unklarer Pfad, Einschränkung", () => {
  assert.equal(RT.access({ highway: "motorway" }, "rad").s, "verboten");
  assert.equal(RT.access({ highway: "residential", bicycle: "no" }, "rad").s, "schieben");
  assert.equal(RT.access({ highway: "footway" }, "rad").s, "schieben");
  assert.equal(RT.access({ highway: "footway", bicycle: "yes" }, "rad").s, "ok");
  assert.equal(RT.access({ highway: "path" }, "rad").s, "unklar");
  assert.equal(RT.access({ highway: "track", access: "agricultural" }, "rad").s, "eingeschraenkt");
  assert.equal(RT.access({ highway: "track", access: "private" }, "fuss").s, "verboten");
  assert.equal(RT.access({ highway: "path", sac_scale: "alpine_hiking" }, "fuss").s, "ok");
  assert.equal(RT.wayCat({ highway: "path", bicycle: "designated" }), "radweg");
  assert.equal(RT.wayCat({ highway: "primary" }), "hauptstrasse");
});

test("Abstand gesetzter Punkt ↔ Wegnetz wird gemessen (BRouter schiebt Punkte auf den nächsten Weg)", () => {
  const fx = FX("brouter_dreieich_rennrad_hin.json");
  const r = RT.buildRoute(fx.antworten.map(RT.parseBRouter), fx.punkte, { sport: "rennrad" });
  assert.ok(r.vias.every((v) => v.snap_m < 60), "Testpunkte liegen nahe am Weg");
  const weit = fx.punkte.map((p, i) => (i === 3 ? [p[0] + 0.02, p[1] + 0.01] : p));
  const r2 = RT.buildRoute(fx.antworten.map(RT.parseBRouter), weit, { sport: "rennrad" });
  assert.ok(r2.snapMax > 1500, `Punkt B weit neben dem Weg (${Math.round(r2.snapMax)} m)`);
});

test("Gezeichnete Linie (Skitour) ist als solche markiert", () => {
  const r = RT.buildDrawn([[9.8, 46.5], [9.81, 46.51], [9.82, 46.52]], [2000, 2300, 2600], { sport: "skitour" });
  assert.ok(r.gezeichnet && /von Hand/.test(r.prov.routing));
  const s = RT.simulate(r, { mode: "hmh", value: 400 });
  near(s.moving_s, 600 / 400 * 3600, 600 / 400 * 3600 * 0.25, "Aufstieg aus Hm/h");
  assert.ok(/gezeichnet/.test(RT.gpx(r, "Skitour")));
});

/* ---------- V5.5 ---------- */
test("A09: 20 min Pause am Zwischenziel verschiebt Ankunft und Wetterzeitpunkt nach dem Punkt um 20 min", () => {
  const r = synthRoute(() => 450, 20000, "rennrad", 90);
  const viaD = 10000, pausen = [{ d: viaD, s: 1200 }], t0 = 1762600000;
  const asked = [];
  const field = (dd, unix, head) => { asked.push({ dd, unix }); return { temp: 15, regen: 0, speed: 0, dirFrom: 0, along: 0, cross: 0 }; };
  const ohne = RT.etaWithWeather(r, { mode: "watt", value: 200, start_unix: t0 }, field);
  const n0 = asked.length;
  const mit = RT.etaWithWeather(r, { mode: "watt", value: 200, start_unix: t0, pausen }, field);
  near(mit.moving_s, ohne.moving_s, 1, "Bewegungszeit bleibt gleich");
  const P = r.profile, k = P.d.findIndex((x) => x > viaD + 50), kv = P.d.findIndex((x) => x >= viaD - 50);
  near(RT.clockAt(r, mit, t0, pausen, k) - RT.clockAt(r, ohne, t0, [], k), 1200, 1, "nach dem Punkt +20 min");
  near(RT.clockAt(r, mit, t0, pausen, kv - 2) - RT.clockAt(r, ohne, t0, [], kv - 2), 0, 1, "vor dem Punkt unverändert");
  near(RT.clockAt(r, mit, t0, pausen, P.n) - t0, ohne.moving_s + 1200, 1, "Ankunft am Ziel +20 min");
  const second = asked.slice(n0), late = second.filter((q) => q.dd > viaD + 50), early = second.filter((q) => q.dd < viaD - 50);
  const firstPass = asked.slice(0, n0);
  const byD = (L, dd) => L.find((q) => Math.abs(q.dd - dd) < 15);
  const a = byD(firstPass.slice(-P.n), late[late.length - 1].dd), b = byD(second.slice(-P.n), late[late.length - 1].dd);
  near(b.unix - a.unix, 1200, 2, "Wetter nach dem Zwischenziel 20 min später abgefragt");
  const c = byD(firstPass.slice(-P.n), early[5].dd), e = byD(second.slice(-P.n), early[5].dd);
  near(e.unix - c.unix, 0, 2, "Wetter davor unverändert");
  assert.equal(RT.pausenSumme(pausen), 1200);
});
test("A09: Windpfeile zeigen, wohin der Wind weht (Herkunft + 180°)", () => {
  const pts = [{ d: 0, lon: 8.5, lat: 47 }, { d: 5000, lon: 8.56, lat: 47 }];
  const A = RT.windArrows(pts, (dd) => ({ speed: 5, dirFrom: dd ? 225 : 270 }), () => 0);
  assert.deepEqual(A.map((a) => [a.dirFrom, a.rot, a.aus]), [[270, 90, "W"], [225, 45, "SW"]]);
  const r = synthRoute(() => 450, 2500, "rennrad", 90), W = RT.windPositions(r);
  assert.equal(W.length, 3, "kurze Route: trotzdem 3 Pfeile"); assert.ok(W.every((w) => w.d > 0 && w.d < r.L), "nie auf Start/Ziel");
  assert.equal(RT.windPositions(synthRoute(() => 450, 200000, "rennrad", 90)).length, 12, "lange Route: höchstens 12");
});
test("A08: Varianten nur über das erlaubte Rennradprofil; Fazit «keine ruhigere legale Asphaltalternative» oder Alternative", () => {
  const e = RT.engineVariant("rennrad", {}, "ruhig");
  assert.equal(e.engine, "fastbike"); assert.equal(e.params.consider_traffic, "1"); assert.equal(e.params.processUnusedTags, "1");
  assert.match(RT.brouterUrl("https://x", e, [8.5, 47], [8.6, 47]), /profile:consider_traffic=1/);
  const row = (k, label, L, haupt, unbef) => ({ k, label, share: { L, haupt_m: haupt, haupt_pct: 100 * haupt / L, unbef_m: unbef || 0 } });
  const keine = RT.variantFazit([row("schnell", "Schnell", 12000, 7650), row("weniger", "Weniger Verkehr", 12100, 7400), row("ruhig", "Ruhig", 12300, 7200)]);
  assert.equal(keine.status, "keine"); assert.match(keine.text, /Keine ruhigere legale Asphaltalternative gefunden: 3 Varianten geprüft, Hauptstrasse Schnell 64 %/);
  const alt = RT.variantFazit([row("schnell", "Schnell", 12000, 7650), row("ruhig", "Ruhig", 13500, 1500)]);
  assert.equal(alt.status, "alternative"); assert.equal(alt.k, "ruhig");
  const schotter = RT.variantFazit([row("schnell", "Schnell", 12000, 7650), row("ruhig", "Ruhig", 12500, 1500, 3000)]);
  assert.equal(schotter.status, "keine", "Umweg über Schotter ist keine Asphaltalternative");
  const ruhig = RT.variantFazit([row("schnell", "Schnell", 2540, 0), row("ruhig", "Ruhig", 2540, 0)]);
  assert.equal(ruhig.status, "ruhig"); assert.match(ruhig.text, /kaum Hauptstrassen \(0 %\), keine Alternative nötig/);
  const r = load("brouter_dreieich_rennrad_hin.json"), w = RT.wayShare(r);
  near(Object.values(w.m).reduce((s, v) => s + v, 0), r.L, 1, "Wegarten decken die ganze Route ab");
});
test("Fehlerband nach Population: Bergstrecke nicht mit dem Band beliebiger Fahrten (zeit-rt-1.1)", () => {
  const berg = synthRoute((d) => 600 + d * 0.035, 12000, "rennrad", 0), flach = synthRoute(() => 450, 60000, "rennrad", 90);
  const kal = { rad_modell: { rennrad: { ok: true, n_test: 31, mae_rel: 0.06, p80_rel: 0.09, population: { km: [45, 160], km_min: 38, hm_km: [5, 18],
    klassen: { flach: { n: 14, mae_rel: 0.05, p80_rel: 0.07 }, wellig: { n: 13, mae_rel: 0.06, p80_rel: 0.1 }, bergig: { n: 4, mae_rel: 0.09, p80_rel: null } } } } } };
  assert.equal(RT.klasse(berg), "bergig"); assert.equal(RT.klasse(flach), "flach");
  const eb = RT.modelError("rennrad", { kal }, berg), ef = RT.modelError("rennrad", { kal }, flach);
  assert.equal(ef.rel, 0.07); assert.match(ef.quelle, /14 Fahrten der Klasse «flach», 80. Perzentil/);
  assert.ok(eb.rel >= 0.15, "Bergstrecke: konservativ"); assert.match(eb.quelle, /nur 4 geprüfte Fahrten der Klasse «bergig»/);
  assert.match(eb.ausserhalb.join(" "), /kürzer als jede geprüfte Fahrt/);
});
