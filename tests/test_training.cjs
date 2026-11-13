// Abnahmetests V5.7 Smart Training Routes (js/training-route.js) – erfundene Werte bzw. lokale BRouter-Antworten
// (tests/fixtures/brouter_dreieich_training.json: OSM-Testdaten Dreieich, ODbL). Aufruf: node --test tests/test_training.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const RT = require("../js/route.js");
const TR = require("../js/training-route.js");
const FK = require("../js/formkurve.js");
const FX = require("./fixtures/brouter_dreieich_training.json");

// Alle Zonen, Kalibrierungen und Zielwerte hier sind erfunden (keine persönlichen Werte im öffentlichen Repository).
const Z = { name: "Test", z3: { rad_w: 250, rad_hf: 150, lauf_pace: 290, lauf_hf: 160 }, skalen: { rad_hf: [{ z: "Z1", von: null, bis: 135 }, { z: "Z2", von: 135, bis: 150 }, { z: "Z3", von: 150, bis: 165 }, { z: "Z4", von: 165, bis: 175 }, { z: "Z5", von: 175, bis: null }] } };
const KAL = { rad_modell: { rennrad: { ok: true, faktor: 0.92, mae_rel: 0.06, n: 50, n_test: 12, population: { km_min: 5, hm_km: [0, 30], klassen: { flach: { n: 6, p80_rel: 0.08 }, wellig: { n: 6, p80_rel: 0.09 }, bergig: { n: 6, p80_rel: 0.1 } } } } },
  lauf_gap: { ok: true, faktor: 1.0, mae_rel: 0.07, n: 40, n_test: 10 }, rad_hf_w: { ok: true, a: -50, b: 1.6, mae: 15, x_bereich: [110, 175] } };
const pz = (s, lo, hi, type, extra) => Object.assign({ type: type || "interval", end_condition: "time", end_condition_value: s, target_type: "power.zone", target_value_low: lo, target_value_high: hi }, extra || {});
const vz = (s, lo, hi, type) => ({ type: type || "interval", end_condition: "time", end_condition_value: s, target_type: "speed.zone", target_value_low: lo, target_value_high: hi });
// Enduco-Workouts in der Form der Garmin-Verbindung (Aufbau wie echte Workouts, alle Werte erfunden)
const VO2 = { date: "2026-11-09", title: "Lange VO2max Intervalle", sport: "rad", steps: [pz(571, 80, 190, "warmup"), pz(685, 190, 230),
  { type: "repeat", end_condition: "iterations", end_condition_value: 4, repeat_count: 4, steps: [pz(360, 300, 340, "interval", { secondary_target_type: "cadence", secondary_target_value_low: 90, secondary_target_value_high: 120 }), pz(360, 80, 190, "rest")] },
  pz(492, 190, 230), pz(571, 80, 190, "cooldown")] };
const FATMAX = { date: "2026-11-10", title: "Fatmax", sport: "lauf", steps: [vz(370, 2.0, 2.8, "warmup"), vz(338, 2.8, 3.2), vz(3462, 3.0, 3.25), vz(370, 2.0, 2.8, "cooldown")] };
const NEURO = { title: "Neuro Intervalle & Ausdauer", sport: "rad", steps: [pz(760, 80, 190, "warmup"), pz(1450, 190, 230), { type: "repeat", repeat_count: 3, end_condition: "iterations", end_condition_value: 3, steps: [pz(10, 430, 470), pz(25, 80, 190, "rest")] }, pz(5400, 190, 230), pz(760, 80, 190, "cooldown")] };

/* ---------- Synthetische Strecken ---------- */
function strecke(punkte, opt) {   // punkte: [[dx_m, dy_m, ele]], Start bei Chur (nur Geometrie)
  opt = opt || {};
  const lon0 = 9.53, lat0 = 46.85, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110574;
  const coords = punkte.map(([x, y, e]) => [lon0 + x / kx, lat0 + y / ky, e]);
  const edges = opt.edges || [{ i0: 0, i1: coords.length - 1, tags: opt.tags || { highway: "tertiary", surface: "asphalt" }, nodeTags: {} }];
  return RT.buildRoute([{ coords, edges, props: { creator: "Test" } }], [coords[0].slice(0, 2), coords[coords.length - 1].slice(0, 2)], { sport: opt.sport || "rennrad" });
}
const gerade = (L, eleFn, opt) => strecke(Array.from({ length: Math.round(L / 50) + 1 }, (_, i) => [i * 50, 0, eleFn ? eleFn(i * 50) : 500]), opt);
const hinUndZurueck = (L) => { const p = []; for (let d = 0; d <= L; d += 50) p.push([d, 0, 500]); for (let d = L - 50; d >= 0; d -= 50) p.push([d, 2, 500]); return strecke(p); };

/* ---------- Workout ---------- */
test("Workout: Enduco-VO2max (Garmin-Form) – Wiederholungen aufgefaltet, Modus Watt, Dauer = Summe, 4 intensive Schritte", () => {
  const wo = TR.workout(VO2, { zonen: Z });
  assert.equal(wo.modus, "watt");
  assert.equal(wo.dauer_s, 571 + 685 + 4 * 720 + 492 + 571);
  assert.equal(wo.dauer_quelle, "Summe der Workout-Schritte");
  assert.equal(wo.schritte.length, 12);
  assert.equal(wo.schritte.filter((s) => s.intensiv).length, 4);
  assert.equal(Math.round(wo.haupt), 210);
  assert.equal(Math.round(wo.intens), 320);
  assert.equal(wo.art, "intervalle");
  assert.equal(wo.tol, 0.1);
  assert.match(TR.strukturText(wo), /4 × \(6:00 @ 300–340 W \/ 6:00 @ 80–190 W\)/);
});
test("Workout: Fatmax-Lauf (Tempo in m/s) – Pace, Grundlage, ±5 %; Neuro-Sprints = Dauertraining", () => {
  const wo = TR.workout(FATMAX, { zonen: Z });
  assert.equal(wo.modus, "pace");
  assert.equal(wo.art, "grundlage");
  assert.equal(wo.tol, 0.05);
  const erwartet = (338 * 1000 / 3.0 + 3462 * 1000 / 3.125) / 3800;
  assert.ok(Math.abs(wo.haupt - erwartet) < 1, `Grundwert = Mittel der lockeren Hauptschritte (s/km) ${wo.haupt}`);
  const n = TR.workout(NEURO, { zonen: Z });
  assert.equal(n.art, "sprint");
  assert.equal(n.dauertraining, true);
  assert.equal(n.tol, 0.05);
});
test("Workout: Puls als Zone, Leistung ≤ 150 nicht geraten, Bergintervalle über die Trittfrequenz, Kalender ohne Schritte", () => {
  const hf = TR.workout({ title: "Puls", sport: "rad", steps: [{ type: "interval", end_condition: "time", end_condition_value: 3600, target_type: "heart.rate.zone", target_value_low: 2, target_value_high: 2 }] }, { zonen: Z });
  assert.equal(hf.modus, "hf");
  assert.equal(hf.schritte[0].ziel.lo, 135);
  const pr = TR.workout({ title: "Prozent", sport: "rad", steps: [pz(3600, 60, 75)] }, { zonen: Z });
  assert.equal(pr.wattUnklar, true);
  assert.equal(pr.haupt, null);
  assert.ok(pr.hinweise.some((h) => /% FTP/.test(h)));
  const ka = TR.workout({ title: "KA", sport: "rad", steps: [pz(600, 100, 180, "warmup"), { type: "repeat", repeat_count: 4, steps: [pz(300, 265, 285, "interval", { secondary_target_type: "cadence", secondary_target_value_low: 50, secondary_target_value_high: 65 }), pz(300, 150, 180, "rest")] }] }, { zonen: Z });
  assert.equal(ka.art, "berg");
  const leer = TR.workout({ date: "2026-11-12", title: "Grundlagenausdauer", sport: "rad", dur_s: 6922 }, { zonen: Z });
  assert.equal(leer.dauer_s, 6922);
  assert.equal(leer.dauer_quelle, "Dauer laut Kalender");
  assert.equal(leer.modus, null);
});
test("Eigene Angaben: 2 h @ 200 W, 3 × 15 min @ 260 W mit 5 min Pause, Lauf 20′ + 4 × 8′ + 15′", () => {
  const a = TR.manuell({ sport: "rad", dauer_min: 120, modus: "watt", wert: 200 }, { zonen: Z });
  assert.equal(a.dauer_s, 7200); assert.equal(a.art, "grundlage"); assert.equal(Math.round(a.haupt), 200);
  const b = TR.manuell({ sport: "rad", dauer_min: 100, modus: "watt", wert: 200, ein_min: 20, aus_min: 20, intervalle: { n: 3, min: 15, wert: 260, pause_min: 5 } }, { zonen: Z });
  assert.equal(b.dauer_s, 6000); assert.equal(b.schritte.filter((s) => s.intensiv).length, 3); assert.equal(b.art, "schwelle"); assert.equal(b.tol, 0.1);
  const c = TR.manuell({ sport: "lauf", dauer_min: 20 + 32 + 15 + 12, modus: "pace", wert: 335, ein_min: 20, aus_min: 15, intervalle: { n: 4, min: 8, wert: 270, pause_min: 3 } }, { zonen: Z });
  assert.equal(c.schritte.filter((s) => s.intensiv).length, 4); assert.equal(c.modus, "pace"); assert.equal(c.art, "schwelle");
});
test("Zeitplan: Wert je Bewegungszeit, Regler verschieben locker und intensiv getrennt, nach Planende letzter Wert", () => {
  const wo = TR.workout(VO2, { zonen: Z });
  const p = TR.zeitplan(wo, { haupt: 200, intens: 310 });
  assert.equal(p.T, wo.dauer_s);
  assert.ok(Math.abs(p.fn(100) - 135 * 200 / 210) < 0.5, "Einfahren skaliert mit dem Grundwert");
  assert.ok(Math.abs(p.fn(1300) - 310) < 0.5, "Intervall skaliert mit dem Intensivwert");
  assert.ok(Math.abs(p.fn(1700) - 135 * 200 / 210) < 0.5, "Pause");
  assert.equal(p.fn(1e9), p.abschnitte[p.abschnitte.length - 1].wert);
});

/* ---------- Zeitprognose mit Workout-Verlauf ---------- */
test("Simulation: Workout-Verlauf – konstanter Plan = konstante Leistung; härterer Abschnitt = schneller; Puls-Plan über Kalibrierung", () => {
  const r = gerade(20000);
  const base = { mode: "watt", value: 200, kal: KAL, rad: { m: 85, cda: 0.3 }, korrektur: false };
  const s0 = RT.simulate(r, base), s1 = RT.simulate(r, Object.assign({}, base, { plan: () => 200 }));
  assert.ok(Math.abs(s0.moving_s - s1.moving_s) < 1e-6);
  const s2 = RT.simulate(r, Object.assign({}, base, { plan: (t) => (t > 600 && t < 1200 ? 300 : 200) }));
  assert.ok(s2.moving_s < s0.moving_s - 20);
  const h = RT.eta(r, { mode: "hf", value: 150, kal: KAL, rad: { m: 85, cda: 0.3 }, korrektur: false, plan: () => 150 });
  const w = RT.eta(r, { mode: "watt", value: -50 + 1.6 * 150, kal: KAL, rad: { m: 85, cda: 0.3 }, korrektur: false });
  assert.ok(Math.abs(h.moving_s - w.moving_s) < 1, "HF-Plan = Watt aus der Kalibrierung");
  assert.ok(h.band[0] < h.moving_s && h.band[1] > h.moving_s, "Band um die Prognose");
});
test("Distanzschätzung aus der persönlichen Prognose: 2 h @ 200 W flach plausibel und monoton", () => {
  const inp = { mode: "watt", value: 200, kal: KAL, rad: { m: 86.5, cda: 0.3 }, korrektur: true };
  const d1 = TR.flachDistanz("rennrad", inp, 3600), d2 = TR.flachDistanz("rennrad", inp, 7200);
  assert.ok(d2 > d1 * 1.9 && d2 < d1 * 2.1);
  assert.ok(d2 > 50000 && d2 < 75000, `2 h flach ${Math.round(d2)} m`);
  const lauf = TR.flachDistanz("laufen", { mode: "pace", value: 335, kal: KAL, korrektur: false }, 3600);
  assert.ok(Math.abs(lauf - 3600 / 335 * 1000) < 60);
});

/* ---------- Geometrie ---------- */
test("Kandidaten: Rundtour = Kreis durch den Start (3 Zwischenziele, Uhrzeigersinn), Hin und zurück = Wendepunkt", () => {
  const s = [9.53, 46.85], P = TR.punkte("rund", s, 0, 5000);
  assert.equal(P.length, 5); assert.deepEqual(P[0], P[4]);
  const c = TR.ziel(s[0], s[1], 0, 5000);
  for (const p of P.slice(1, 4)) assert.ok(Math.abs(RT.hav(c[0], c[1], p[0], p[1]) - 5000) < 2);
  assert.ok(Math.abs(RT.hav(s[0], s[1], P[2][0], P[2][1]) - 10000) < 3, "gegenüberliegender Punkt in 2 r");
  assert.ok(P[1][0] < s[0] && P[3][0] > s[0], "Uhrzeigersinn: erst nach Westen, zurück von Osten");
  const H = TR.punkte("hin", s, 90, 3000);
  assert.equal(H.length, 3); assert.ok(Math.abs(RT.hav(s[0], s[1], H[1][0], H[1][1]) - 3000) < 2);
});
test("Mehrpunkt-Antwort in Abschnitte teilen: Linie bleibt gleich, Teilstellen auf der Linie", () => {
  const key = Object.keys(FX.anfragen).find((k) => (k.match(/\|/g) || []).length === 4);
  const u = new URL(key.replace("EP", "http://x"));
  const pts = u.searchParams.get("lonlats").split("|").map((p) => p.split(",").map(Number));
  const leg = RT.parseBRouter(JSON.parse(FX.anfragen[key].text));
  const legs = RT.splitLegs(leg, pts);
  assert.ok(legs && legs.length === 4);
  const n = legs.reduce((s, l) => s + l.coords.length, 0) - 3;
  assert.equal(n, leg.coords.length);
  const vias = [pts[0]].concat(legs.slice(0, -1).map((l) => l.coords[l.coords.length - 1].slice(0, 2))).concat([pts[4]]);
  const r1 = RT.buildRoute([leg], [pts[0], pts[4]], { sport: "rennrad" }), r2 = RT.buildRoute(legs, vias, { sport: "rennrad" });
  assert.ok(Math.abs(r1.L - r2.L) < 0.5);
  assert.ok(r2.vias.slice(1, 4).every((v) => v.snap_m < 1), "Zwischenziele liegen auf der Linie");
});

/* ---------- Kennzahlen ---------- */
test("Unterbrechungen aus OSM-Knoten, doppelte Wege (Hin und zurück)", () => {
  const r = gerade(1000, null, { edges: [{ i0: 0, i1: 5, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: { highway: "traffic_signals" } }, { i0: 5, i1: 10, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: { barrier: "cycle_barrier" } },
    { i0: 10, i1: 20, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: { highway: "crossing" } }] });
  const U = TR.unterbrechungen(r, "rad");
  assert.deepEqual(U.map((u) => u.art), ["Ampel", "Schranke/Gatter", "Übergang"]);
  assert.ok(TR.unterbrechungen(r, "lauf").find((u) => u.art === "Übergang").w > U[2].w, "Fussgänger: Übergang zählt mehr");
  assert.ok(TR.doppelt(hinUndZurueck(3000)).anteil > 0.85);
  assert.ok(TR.doppelt(gerade(3000)).anteil < 0.05);
});
test("Intervall-Eignung: Abfahrt ungeeignet, Anstieg für Bergintervalle gut, Ampeln, Gravel beim Rennrad", () => {
  const ab = gerade(3000, (d) => 800 - d * 0.06), flach = gerade(3000), berg = gerade(3000, (d) => 500 + d * 0.06);
  assert.equal(TR.abschnitt(ab, 0, 3000, { fam: "rad", typ: "konstant", dauer_s: 360 }).note, "ungeeignet");
  assert.equal(TR.abschnitt(flach, 0, 3000, { fam: "rad", typ: "konstant", dauer_s: 360 }).note, "gut");
  assert.equal(TR.abschnitt(flach, 0, 3000, { fam: "rad", typ: "berg", dauer_s: 360 }).note, "ungeeignet");
  assert.equal(TR.abschnitt(berg, 0, 3000, { fam: "rad", typ: "berg", dauer_s: 360 }).note, "gut");
  const U = [{ d: 500, w: 1, art: "Ampel" }, { d: 1500, w: 1, art: "Ampel" }, { d: 2500, w: 1, art: "Ampel" }];
  assert.equal(TR.abschnitt(flach, 0, 3000, { fam: "rad", typ: "konstant", dauer_s: 360, unterbr: U }).note, "ungeeignet");
  assert.equal(TR.abschnitt(flach, 0, 3000, { fam: "rad", typ: "konstant", dauer_s: 360, unterbr: U.slice(0, 1) }).note, "gut");
  const kies = gerade(3000, null, { tags: { highway: "track", surface: "gravel" } });
  const g = TR.abschnitt(kies, 0, 3000, { fam: "rad", typ: "konstant", rennrad: true, dauer_s: 360 });
  assert.equal(g.note, "ungeeignet"); assert.ok(g.gruende.some((x) => /Gravel/.test(x)));
});
test("Intervalle auf die Route legen: Zeit → Strecke nach der Prognose; Route zu kurz = ungeeignet, nie erfunden", () => {
  const wo = TR.manuell({ sport: "rad", dauer_min: 60, modus: "watt", wert: 200, ein_min: 10, aus_min: 10, intervalle: { n: 2, min: 10, wert: 270, pause_min: 5 } }, { zonen: Z });
  const plan = TR.zeitplan(wo, {}), r = gerade(40000), inp = { mode: "watt", value: 200, kal: KAL, rad: { m: 85, cda: 0.3 }, korrektur: false, plan: plan.fn };
  const sim = RT.simulate(r, inp), I = TR.intervalle(r, sim, plan, { fam: "rad", typ: "konstant" });
  assert.equal(I.length, 2);
  assert.ok(I[0].d1 > I[0].d0 && I[1].d0 > I[0].d1);
  assert.ok(I.every((x) => x.note === "gut"));
  const kurz = gerade(8000), s2 = RT.simulate(kurz, inp), I2 = TR.intervalle(kurz, s2, plan, { fam: "rad", typ: "konstant" });
  assert.ok(I2.some((x) => x.note === "ungeeignet" && /endet/.test(x.gruende[0])));
});
test("Wetter entlang der Route: Wind Hin/Rück, Seitenböen, Regen; fehlender Wind bleibt unbekannt (nie Windstille)", () => {
  const r = hinUndZurueck(10000), sim = RT.simulate(r, { mode: "watt", value: 200, kal: KAL, rad: { m: 85, cda: 0.3 } });
  const t0 = FK.zurichToUnix("2026-11-09", "10:00");
  const pts = RT.weatherPoints(r), time = Array.from({ length: 48 }, (_, i) => Math.floor(t0 / 86400) * 86400 + i * 3600);
  const mk = (ws, wd, rain, gust) => pts.map(() => ({ hourly: { time, temperature_2m: time.map(() => 8), precipitation: time.map(() => rain), precipitation_probability: time.map(() => 40), wind_speed_10m: time.map(() => ws), wind_direction_10m: time.map(() => wd), wind_gusts_10m: time.map(() => gust) } }));
  const f = RT.weatherField(pts, mk(5, 90, 0.6, 9));         // Wind aus Osten: hin (nach Osten) Gegenwind
  const W = TR.wetter(r, sim, f, t0, []);
  assert.equal(W.status, "ok");
  assert.ok(W.hin_ms < -3 && W.rueck_ms > 3);
  assert.ok(W.regen_mm > 0.2 && W.regen_m > 5000);
  assert.equal(W.boe10_m, 0, "Böen von vorn sind keine Seitenböen");
  const fq = RT.weatherField(pts, mk(5, 0, 0, 12));           // Wind aus Norden: quer
  assert.ok(TR.wetter(r, sim, fq, t0, []).boe10_m > 15000);
  const fu = RT.weatherField(pts, mk(null, null, null, null));
  const Wu = TR.wetter(r, sim, fu, t0, []);
  assert.equal(Wu.status, "unbekannt"); assert.equal(Wu.mittel_ms, null);
});
test("Tageslicht (NOAA): Zürich gegen unabhängige Rechnung (SunCalc) ±3 min; Licht nötig nach der Dämmerung", () => {
  const ref = { "2026-06-21": ["03:30:16", "19:27:22"], "2026-12-21": ["07:11:26", "15:38:41"], "2026-11-09": ["06:22:10", "15:59:46"] };
  for (const [d, [a, u]] of Object.entries(ref)) {
    const S = TR.sonne(47.3769, 8.5417, d), sec = (hms) => hms.split(":").reduce((x, v) => x * 60 + +v, 0);
    const day = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 1000;
    assert.ok(Math.abs(S.sonne_auf - day - sec(a)) < 180, d + " Aufgang");
    assert.ok(Math.abs(S.sonne_unter - day - sec(u)) < 180, d + " Untergang");
  }
  const S = TR.sonne(46.85, 9.53, "2026-11-09");
  assert.equal(TR.licht(S, S.sonne_auf + 3600, S.sonne_unter - 3600).status, "hell");
  assert.equal(TR.licht(S, S.sonne_unter - 3600, S.sonne_unter + 600).status, "daemmerung");
  assert.equal(TR.licht(S, S.sonne_unter - 3600, S.hell_unter + 600).status, "dunkel");
});

/* ---------- Suche mit echten (lokal aufgezeichneten) Routing-Antworten ---------- */
function replay(sport) {
  let n = 0;
  const route = async (variante, pts, extra) => {
    const eng = sport === "rennrad" ? RT.engineVariant("rennrad", {}, variante === "C" ? "velo" : "schnell") : RT.engineFor(sport, {});
    if (sport === "rennrad") eng.engine = "PROFIL";
    const url = RT.brouterUrlPts("EP", eng, pts, extra);
    const a = FX.anfragen[url];
    n++;
    if (!a) throw new RT.RouteError("netz", "keine aufgezeichnete Antwort", url);
    if (a.status !== 200) { const e = new RT.RouteError("dienst", "HTTP " + a.status); e.status = a.status; throw e; }
    const leg = RT.parseBRouter(JSON.parse(a.text));
    return Object.assign(leg, { engine: eng.engine, eng });
  };
  return { route, zahl: () => n };
}
function szenario(sport, wo) {
  const plan = TR.zeitplan(wo, {});
  const inp = { mode: wo.modus, value: wo.haupt, kal: KAL, rad: { m: 86.5, cda: 0.3 }, korrektur: true, pausen: [], plan: plan.fn };
  return { wo, plan, inp, sport, opts: {}, routenart: "rund", start: [8.7095, 49.999], start_unix: FK.zurichToUnix("2026-11-09", "10:00"), pausen: [] };
}
const WO_RAD = () => TR.manuell({ sport: "rad", dauer_min: 20, modus: "watt", wert: 200, ein_min: 3, aus_min: 3, intervalle: { n: 2, min: 4, wert: 280, pause_min: 2 } }, { zonen: Z });
test("Suche Rennrad (strukturiert): echte Routen, Dauer nachgeregelt, A/B/C verschieden, C velofreundliches Profil, Anfragen begrenzt", async () => {
  const io = replay("rennrad"), ctx = szenario("rennrad", WO_RAD());
  const res = await TR.suche(ctx, { route: io.route });
  assert.equal(res.fehler.length, 0);
  assert.ok(io.zahl() <= 18, `${io.zahl()} Anfragen`);
  assert.ok(res.A && res.C);
  assert.equal(res.B, null, "ohne Wetter kein Vorschlag B");
  assert.ok(res.hinweise.some((h) => /Wetter unbekannt/.test(h)));
  assert.equal(res.C.variante, "C");
  assert.ok(!RT.istDoppelt(res.A.route, res.C.route) || res.C_gleich);
  // Testkarte klein (Dreieich, Höhenmodell nur im Ausschnitt): Dauer hier nicht genau erreichbar – geprüft wird das Verfahren
  const famA = res.pool.filter((c) => c.variante === "A" && c.brg === res.A.brg);
  assert.ok(famA.length >= 2 || Math.abs(famA[0].K.abw) <= ctx.wo.tol * 0.6, "Radius nachgeregelt");
  assert.equal(res.A.sA.wert, Math.max(...res.pool.map((c) => c.sA.wert)), "A = beste Trainingswertung");
  assert.ok(res.A.K.intervalle.every((x) => x.note !== "gut" || x.gruende.length === 0), "gut nur ohne Einwand");
  assert.equal(res.A.K.intervalle.length, 2);
  assert.ok(res.pool.every((c) => c.route.L > 1000 && c.route.segs.length > 3), "nur echte Routen aus Antworten");
  assert.ok(res.A.legs && res.A.legs.length === 4, "für den Planer in Abschnitte geteilt");
});
test("Suche Laufen 30 min: Rundtour, laufgeeignete Wege für C, Begründung aus Kennzahlen", async () => {
  const io = replay("laufen"), wo = TR.manuell({ sport: "lauf", dauer_min: 30, modus: "pace", wert: 335 }, { zonen: Z }), ctx = szenario("laufen", wo);
  const res = await TR.suche(ctx, { route: io.route });
  assert.ok(res.A && res.C);
  assert.ok(Math.abs(res.A.K.abw) < 0.12);
  const wC = res.C.K.wege_pct, wA = res.A.K.wege_pct, fuss = (w) => w.pfad + w.fussweg + w.fahrweg + w.radweg;
  assert.ok(fuss(wC) >= fuss(wA) - 1e-9 || res.C === res.A);
  assert.match(TR.begruendung("A", res.A, ctx), /Dauer [+−]\d+ % \(Ziel ±5 %\)/);
});
test("Suche mit Wetter (Wind aus Westen): B gewählt, Runde führt zuerst gegen den Wind, Rückenwind auf dem Heimweg", async () => {
  const io = replay("rennrad"), ctx = szenario("rennrad", WO_RAD());
  const t0 = ctx.start_unix, time = Array.from({ length: 48 }, (_, i) => Math.floor(t0 / 86400) * 86400 + i * 3600);
  const wetter = async (routes) => {
    const m = new Map();
    for (const r of routes) {
      const pts = RT.weatherPoints(r);
      m.set(r.id, RT.weatherField(pts, pts.map(() => ({ hourly: { time, temperature_2m: time.map(() => 6), precipitation: time.map(() => 0), precipitation_probability: time.map(() => 5), wind_speed_10m: time.map(() => 6), wind_direction_10m: time.map(() => 270), wind_gusts_10m: time.map(() => 11) } }))));
    }
    return m;
  };
  const res = await TR.suche(ctx, { route: io.route, wetter });
  assert.equal(res.fehler.length, 0);
  assert.ok(res.B, "B vorhanden");
  assert.equal(res.B.K.wetter.status, "ok");
  const top = res.pool.filter((c) => c.sB).sort((a, b) => b.sB.wert - a.sB.wert)[0];
  assert.ok(top.K.wetter.hin_ms < 0 && top.K.wetter.rueck_ms > 0, "beste Wetter-Route: zuerst Gegenwind, zurück Rückenwind");
  assert.ok([240, 300].includes(top.brg), `beste Wetter-Runde nach Westen (brg ${top.brg})`);
  assert.ok(res.B.K.wetter.hin_ms <= res.B.K.wetter.rueck_ms + 0.5, "B nie mit Rückenwind zuerst");
  assert.ok(res.B === top || res.B.sB.wert >= top.sB.wert - 8 || res.B_gleich === "A", "B = beste oder höchstens 8 Punkte schlechter (wenn die beste schon A ist)");
  assert.ok(!RT.istDoppelt(res.A.route, res.B.route) || res.B_gleich === "A");
  assert.ok(res.B.sB.teile.some((t) => t[0] === "Wind Rückweg"));
});
test("Routingfehler: keine Ersatzlinie, Fehler je Kandidat; ohne Startdauer keine Suche", async () => {
  const ctx = szenario("rennrad", WO_RAD());
  const res = await TR.suche(ctx, { route: async () => { const e = new RT.RouteError("dienst", "Der Routing-Server meldet einen internen Fehler."); e.status = 500; throw e; } });
  assert.equal(res.pool.length, 0); assert.equal(res.A, undefined); assert.equal(res.fehler.length, 6);
  assert.ok(res.hinweise.some((h) => /Keine Route/.test(h)));
  const r2 = await TR.suche(Object.assign({}, ctx, { wo: Object.assign({}, ctx.wo, { dauer_s: null }) }), { route: async () => { throw new Error("nicht aufrufen"); } });
  assert.ok(r2.hinweise.some((h) => /Keine Dauer/.test(h)));
});

test("Suche Gravel mit Schotterpräferenz: Gravel-Profil mit prefer_unpaved_paths=1, C bevorzugt Forst- und Feldwege", async () => {
  const io = replay("gravel"), wo = TR.manuell({ sport: "rad", dauer_min: 25, modus: "watt", wert: 180 }, { zonen: Z });
  const ctx = Object.assign(szenario("gravel", wo), { opts: { schotter: true } });
  const res = await TR.suche(ctx, { route: io.route });
  assert.equal(res.fehler.length, 0);
  assert.ok(res.A && res.C);
  assert.match(RT.brouterUrlPts("EP", RT.engineFor("gravel", { schotter: true }), [[8.7, 50], [8.71, 50]]), /profile=gravel.*prefer_unpaved_paths=1/);
  const forst = (c) => c.K.wege_pct.fahrweg + c.K.wege_pct.pfad;
  assert.ok(forst(res.C) >= forst(res.A) - 1e-9 || res.C_gleich, `C ${forst(res.C).toFixed(0)} % vs. A ${forst(res.A).toFixed(0)} %`);
  assert.ok(res.pool.every((c) => c.K.gravel_m >= 0 && c.sA.teile.every((t) => t[0] !== "Gravel")), "Gravel ist beim Gravel-Rad kein Abzug");
});

/* ---------- Dauer abstimmen (Verfahren, unabhängig von Kartendaten): Wegnetz-Attrappe = gerade Linien über flaches Asphaltland ---------- */
function attrappe() {
  let n = 0;
  const route = async (variante, pts) => {
    n++;
    const coords = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], m = Math.max(1, Math.ceil(RT.hav(a[0], a[1], b[0], b[1]) / 50));
      for (let k = i === 1 ? 0 : 1; k <= m; k++) coords.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m, 500 + 15 * Math.sin(coords.length / 40)]);
    }
    return { coords, edges: [{ i0: 0, i1: coords.length - 1, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: {} }], props: { creator: "Attrappe" }, engine: "test", eng: { engine: "test", params: {} } };
  };
  return { route, zahl: () => n };
}
test("Dauer abstimmen: 2 h Rennrad-Grundlage @ 200 W ab gespeichertem Startort – Rundtour und Hin/zurück innerhalb ±5 %, Anfragen begrenzt", async () => {
  for (const form of ["rund", "hin"]) {
    const io = attrappe(), wo = TR.manuell({ sport: "rad", dauer_min: 120, modus: "watt", wert: 200 }, { zonen: Z });
    const ctx = Object.assign(szenario("rennrad", wo), { routenart: form, start: [9.53, 46.85] });
    const res = await TR.suche(ctx, { route: io.route });
    assert.equal(res.fehler.length, 0);
    assert.ok(Math.abs(res.A.K.abw) <= 0.05, `${form}: A ${(res.A.K.abw * 100).toFixed(1)} %`);
    assert.ok(io.zahl() <= 18, `${form}: ${io.zahl()} Anfragen`);
    assert.ok(Math.abs(res.A.K.T - 7200) <= 360);
    assert.ok(res.A.K.L > 50000 && res.A.K.L < 75000, `${form}: ${Math.round(res.A.K.L)} m`);
  }
});
test("Dauer abstimmen: 60 min Laufen bei 5:35 /km und Rad-Intervalle 3 × 15 min @ 260 W", async () => {
  const io = attrappe(), lauf = TR.manuell({ sport: "lauf", dauer_min: 60, modus: "pace", wert: 335 }, { zonen: Z });
  const r1 = await TR.suche(Object.assign(szenario("laufen", lauf), { start: [9.53, 46.85] }), { route: io.route });
  assert.ok(Math.abs(r1.A.K.abw) <= 0.05, `Lauf ${(r1.A.K.abw * 100).toFixed(1)} %`);
  assert.ok(Math.abs(r1.A.K.pace_s - 335) < 12, `Pace ${r1.A.K.pace_s}`);
  const iv = TR.manuell({ sport: "rad", dauer_min: 100, modus: "watt", wert: 200, ein_min: 20, aus_min: 20, intervalle: { n: 3, min: 15, wert: 260, pause_min: 5 } }, { zonen: Z });
  const r2 = await TR.suche(Object.assign(szenario("rennrad", iv), { start: [9.53, 46.85] }), { route: attrappe().route });
  assert.equal(r2.A.K.intervalle.length, 3);
  assert.ok(r2.A.K.intervalle.every((x) => x.note === "gut"), JSON.stringify(r2.A.K.intervalle.map((x) => [x.note, x.gruende])));
  assert.ok(Math.abs(r2.A.K.abw) <= 0.1);
});

test("Rundtour mit unterschiedlichen Startzeiten: Wind dreht von West (morgens) auf Ost (abends) – B wählt je Startzeit die Runde gegen den Wind", async () => {
  const wo = TR.manuell({ sport: "rad", dauer_min: 90, modus: "watt", wert: 200 }, { zonen: Z });
  const base = Object.assign(szenario("rennrad", wo), { start: [9.53, 46.85] });
  const tag0 = Math.floor(base.start_unix / 86400) * 86400, time = Array.from({ length: 48 }, (_, i) => tag0 + i * 3600);
  let gust = 7;
  const wetter = async (routes) => {
    const m = new Map();
    for (const r of routes) {
      const pts = RT.weatherPoints(r);
      m.set(r.id, RT.weatherField(pts, pts.map(() => ({ hourly: { time, temperature_2m: time.map(() => 9), precipitation: time.map(() => 0), precipitation_probability: time.map(() => 0),
        wind_speed_10m: time.map(() => 7), wind_direction_10m: time.map((t) => ((t - tag0) / 3600 < 12 ? 270 : 90)), wind_gusts_10m: time.map(() => gust) } }))));
    }
    return m;
  };
  const morgen = await TR.suche(Object.assign({}, base, { start_unix: tag0 + 7 * 3600 }), { route: attrappe().route, wetter });
  const abend = await TR.suche(Object.assign({}, base, { start_unix: tag0 + 14 * 3600 }), { route: attrappe().route, wetter });
  assert.ok(morgen.B && abend.B);
  assert.ok([240, 300].includes(morgen.B.brg), `morgens Westwind → Runde nach Westen (${morgen.B.brg})`);
  assert.ok([60, 120].includes(abend.B.brg), `abends Ostwind → Runde nach Osten (${abend.B.brg})`);
  assert.ok(morgen.B.K.wetter.hin_ms < 0 && abend.B.K.wetter.hin_ms < 0, "jeweils zuerst Gegenwind");
  gust = 14;                                                     // starke Böen (50 km/h): Seitenböen meiden geht vor
  const boe = await TR.suche(Object.assign({}, base, { start_unix: tag0 + 7 * 3600 }), { route: attrappe().route, wetter });
  const passend = boe.pool.filter((c) => c.sB && Math.abs(c.K.abw) <= wo.tol);
  assert.ok(boe.B.K.wetter.boe10_m <= Math.min(...passend.map((c) => c.K.wetter.boe10_m)) + 1, "B mit den wenigsten starken Seitenböen");
});

/* ---------- Auswertung ---------- */
test("Vorschlag vs. Ist: Dauer, Tempo, Leistung, Höhenmeter, Prognosefehler; Strecke gefolgt; Modellgüte nur unabhängig", () => {
  const r = gerade(30000, (d) => 500 + 100 * Math.sin(d / 3000));
  const k = TR.kompakt(r), r2 = TR.ausKompakt(k, "rennrad");
  assert.ok(Math.abs(r2.L - r.L) / r.L < 0.01);
  assert.ok(Math.abs(r2.profile.up - r.profile.up) < 15);
  const ll = TR.polyDecode(k.ll, 5);
  assert.ok(TR.folgeAnteil(ll, ll) > 0.98);
  assert.ok(TR.folgeAnteil(ll, ll.map(([x, y]) => [x, y + 0.01])) < 0.05);
  const rec = { datum: "2026-11-09", sport: "rennrad", plan: { dauer_s: 3600, modus: "watt", haupt: 200 }, pred: { moving_s: 3700, L: 30000, up: 400, v_kmh: 29.2, pace_s: 123 }, wetter: { status: "ok", temp_min: 5, temp_max: 7 } };
  const a = { id: "g1", date: "2026-11-09", sport: "rad", km: 30.1, hm: 420, dur: 3800, mv: 3650, watt: 205, np: 212, hr: 141, wx: { temperature: 6, wind_speed: 9, wind_speed_unit: "km/h", wind_direction_compass: "w", station_name: "Chur" } };
  assert.equal(TR.passendeAktivitaet(rec, [a, Object.assign({}, a, { id: "g2", sport: "lauf" })]).id, "g1");
  const V = TR.vergleich(rec, a, { route: r, inp: { mode: "watt", value: 205, kal: KAL, rad: { m: 86, cda: 0.3 } }, folge: 0.95, kal_datum: "2026-11-01" });
  assert.ok(Math.abs(V.fehler - (3700 - 3650) / 3650) < 1e-9);
  assert.equal(V.unabhaengig, true);
  assert.ok(V.bei_ist && V.bei_ist.moving_s > 0);
  assert.equal(V.wetter.ist.wind_kmh, 9);
  const G = TR.modellGuete([{ fehler: 0.05, unabhaengig: true, folge: 0.9 }, { fehler: -0.03, unabhaengig: true, folge: null }, { fehler: 0.4, unabhaengig: false }, { fehler: 0.3, unabhaengig: true, folge: 0.5 }]);
  assert.equal(G.n, 2); assert.ok(Math.abs(G.median_abs - 0.04) < 1e-9);
});

/* ---------- Rennrad-Prüfung (Punkt 9) ---------- */
test("Belag: Pflaster eigene Klasse (kein Gravel), unbekannt bleibt unbekannt; Varianten 2.1: Zeit, nur ruhiger = velofreundlich", () => {
  assert.equal(RT.surfaceCat({ surface: "sett" }), "pflaster");
  assert.equal(RT.surfaceCat({ surface: "paving_stones" }), "pflaster");
  assert.equal(RT.surfaceCat({ surface: "concrete" }), "hart");
  assert.equal(RT.surfaceCat({}), "unbekannt");
  assert.equal(RT.gravelArt({ surface: "pflaster", tags: { surface: "sett" } }), null);
  assert.ok(RT.RAD.rennrad.crr.pflaster > RT.RAD.rennrad.crr.asphalt);
  const s = { k: "schnell", label: "S", t: 3600, L: 30000, gravel_m: 0, haupt_pct: 20, strasse_pct: 30, radweg_pct: 5 };
  assert.equal(RT.waehleVariante([s, { k: "velo", label: "V", t: 3780, L: 31000, gravel_m: 0, haupt_pct: 5, strasse_pct: 20, radweg_pct: 30 }], 10).k, "velo");
  const w = RT.waehleVariante([s, { k: "velo", label: "V", t: 3700, L: 31000, gravel_m: 0, haupt_pct: 22, strasse_pct: 30, radweg_pct: 5 }], 10);
  assert.equal(w.k, "schnell"); assert.equal(w.nicht_ruhiger, true);
  assert.equal(RT.waehleVariante([s, { k: "velo", label: "V", t: 4100, L: 30500, gravel_m: 0, haupt_pct: 5, strasse_pct: 10, radweg_pct: 40 }], 10).k, "schnell", "10 % auf die Zeit: +13,9 % Zeit zu viel");
  const oz = RT.waehleVariante([Object.assign({}, s, { t: null }), { k: "velo", label: "V", t: null, L: 32000, gravel_m: 0, haupt_pct: 5, radweg_pct: 30 }], 10);
  assert.equal(oz.mass, "L"); assert.match(oz.text, /ohne Zeitprognose/);
  assert.equal(RT.VARIANTEN.rennrad.find((v) => v.k === "velo").params.avoid_mainroads, "1");
});
test("Anfragen begrenzen: höchstens 2 gleichzeitig, alle erledigt", async () => {
  let laufend = 0, max = 0;
  const f = async (x) => { laufend++; max = Math.max(max, laufend); await new Promise((r) => setTimeout(r, 5)); laufend--; return x * 2; };
  const g = RT.gate(f, 2);
  const out = await Promise.all([1, 2, 3, 4, 5, 6, 7].map((x) => g(x)));
  assert.deepEqual(out, [2, 4, 6, 8, 10, 12, 14]);
  assert.equal(max, 2);
  assert.equal(g.stats().gesamt, 7);
});

test("trainingsroute-1.1 (V6.6): Rennrad-Vorschläge nie mit Gravel – Kandidaten mit Gravel verworfen, sonst kein Vorschlag mit Grund", () => {
  const k = (dx, dy, g, a, c) => ({ variante: "A", route: strecke([[0, 0, 500], [dx, dy, 500]]), K: { unzureichend: false, gravel_m: g }, sA: { wert: a }, sB: null, sC: { wert: c } });
  const mitG = k(5000, 0, 400, 95, 90), ohne = k(0, 5000, 0, 80, 70), wenig = k(-5000, 0, 15, 75, 85);
  const r = TR.auswahl([mitG, ohne, wenig], { sport: "rennrad" });
  assert.equal(r.A, ohne, "die beste ohne Gravel, obwohl die mit Gravel mehr Punkte hat");
  assert.equal(r.gravel_verworfen, 1);
  assert.ok(![r.A, r.B, r.C].includes(mitG), "kein Vorschlag mit Gravel");
  assert.match(r.hinweise.join(" "), /1 Kandidat mit Gravel verworfen/);
  const leer = TR.auswahl([mitG, k(0, -5000, 25, 60, 60)], { sport: "rennrad" });
  assert.equal(leer.A, null, "alle mit mehr als 20 m Gravel (auch «möglicherweise»): kein Vorschlag");
  assert.match(leer.hinweise[0], /Keine Rennrad-Route ohne Gravel gefunden: alle 2 Kandidaten/);
  assert.equal(TR.auswahl([mitG], { sport: "gravel" }).A, mitG, "beim Gravelbike bleibt Gravel erlaubt");
  assert.equal(TR.VERSIONS.vorschlag, "trainingsroute-1.1");
});
