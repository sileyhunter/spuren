// Abnahmetests V5 für js/formkurve.js – nur synthetische, frei erfundene Werte (keine echten Trainingsdaten).
// Aufruf: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const FK = require("../js/formkurve.js");

/* ---------- Hilfen für Fixtures ---------- */
const days = (start, n, f) => Array.from({ length: n }, (_, i) => ({ date: FK.addDays(start, i), ...f(i) }));
const PROFIL = {
  id: "demo-zonen", gueltig_ab: "2026-01-01", gueltig_bis: null, status: "aktiv",
  skalen: [
    { key: "rad_w", disziplin: "rad", metrik: "leistung", unit: "W", protokoll: "p-rad", umfang: [100, 350],
      zonen: [{ z: "Z1", von: null, bis: 150 }, { z: "Z2", von: 150, bis: 200 }, { z: "Z3", von: 200, bis: 250 }, { z: "Z4", von: 250, bis: 280 }, { z: "Z5", von: 280, bis: null }] },
    { key: "rad_hf", disziplin: "rad", metrik: "puls", unit: "bpm", protokoll: "p-rad", umfang: [100, 200],
      zonen: [{ z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: 145 }, { z: "Z3", von: 145, bis: 160 }, { z: "Z4", von: 160, bis: 170 }, { z: "Z5", von: 170, bis: null }] },
    { key: "lauf_pace", disziplin: "lauf", metrik: "pace", unit: "s/km", protokoll: "p-lauf", umfang: [390, 255],
      zonen: [{ z: "Z1", von: null, bis: 360 }, { z: "Z2", von: 360, bis: 320 }, { z: "Z3", von: 320, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }] },
    { key: "lauf_hf", disziplin: "lauf", metrik: "puls", unit: "bpm", protokoll: "p-lauf", umfang: [110, 200],
      zonen: [{ z: "Z1", von: null, bis: 140 }, { z: "Z2", von: 140, bis: 155 }, { z: "Z3", von: 155, bis: 170 }, { z: "Z4", von: 170, bis: 180 }, { z: "Z5", von: 180, bis: null }] },
  ],
};
const SCHWELLEN = {
  tests: [
    { test: "demo-rad-1", datum: "2026-02-01", sport: "rad", protokoll: "p-rad", datenstatus: "bestätigt", ausbelastet: true,
      methoden: { basis05: { x: 190 } }, lt1: { status: "vorläufig", lo: 185, hi: 195, hf_lo: 138, hf_hi: 141, methoden: ["basis05", "loglog"] },
      lt2: { status: "vorläufig", lo: 255, hi: 262, hf_lo: 162, hf_hi: 165, methoden: ["dickhuth", "moddmax"] } },
    { test: "demo-rad-2", datum: "2026-05-01", sport: "rad", protokoll: "p-rad", datenstatus: "bestätigt", ausbelastet: false,
      methoden: { basis05: { x: 195 } }, lt1: { status: "vorläufig", lo: 190, hi: 198, hf_lo: 136, hf_hi: 139, methoden: ["basis05"] },
      lt2: { status: "nicht bestimmbar", lo: null, hi: null, methoden: [], grund: "nicht ausbelastet" } },
    { test: "demo-lauf-1", datum: "2026-03-01", sport: "lauf", protokoll: "p-lauf", datenstatus: "bestätigt", ausbelastet: false,
      methoden: { basis05: { x: 11 } }, lt1: { status: "vorläufig", lo: 11.0, hi: 11.6, hf_lo: 150, hf_hi: 154, methoden: ["somc", "basis05"] },
      lt2: { status: "nicht bestimmbar", lo: null, hi: null, methoden: [] } },
  ],
};

/* ---------- Zonen und LT1/LT2 ---------- */
test("Cockpit: vier Skalen, aktueller und voriger Test je Disziplin", () => {
  const c = FK.cockpit([PROFIL], SCHWELLEN, "2026-06-01");
  assert.equal(c.skalen.length, 4);
  const w = c.skalen.find((s) => s.skala.key === "rad_w");
  assert.equal(w.aktuell.lt1.test, "demo-rad-2");
  assert.equal(w.vorher.lt1.test, "demo-rad-1");
  assert.equal(w.aktuell.lt2.status, "nicht bestimmbar");          // Test ohne gültige LT2: null + Status, keine erfundene Kurve
  assert.equal(w.aktuell.lt2.lo, null);
  assert.equal(w.vorher.lt2.lo, 255);
});
test("Cockpit: Pace links langsam (6:30), rechts schnell (4:15)", () => {
  const s = PROFIL.skalen[2];
  assert.equal(FK.scaleFrac(s, 390), 0);
  assert.equal(FK.scaleFrac(s, 255), 1);
  assert.ok(FK.scaleFrac(s, 300) > FK.scaleFrac(s, 330), "schneller liegt weiter rechts");
  const lt = FK.cockpit([PROFIL], SCHWELLEN, "2026-06-01").skalen.find((x) => x.skala.key === "lauf_pace").aktuell.lt1;
  assert.ok(Math.abs(lt.hi - 3600 / 11.0) < 0.01 && Math.abs(lt.lo - 3600 / 11.6) < 0.01, "km/h → s/km, langsamere Grenze oben");
  assert.equal(FK.pace(3600 / 12), "5:00");
  assert.equal(FK.zoneOf(s, 300), "Z3");
  assert.equal(FK.zoneOf(s, 400), "Z1");
  assert.equal(FK.zoneOf(s, 250), "Z5");
});
test("Cockpit: Radzonen werden nie als Laufzonen verwendet", () => {
  const c = FK.cockpit([PROFIL], { tests: SCHWELLEN.tests.filter((t) => t.sport === "rad") }, "2026-06-01");
  const run = c.skalen.filter((s) => s.skala.disziplin === "lauf");
  assert.ok(run.every((s) => s.aktuell === null), "ohne Lauftest keine Laufschwelle");
});
test("Einzelmessung: anklickbar, kein Kurvensegment, keine Schwelle", () => {
  const D = { schwellen: SCHWELLEN, lactate: [], laktat_vorschau: [
    { id: "demo-check", art: "check", status: "vorschau", sport: "rad", datum: "2026-05-10", zeilen: [{ x: 210, la: 1.4, hf: 141, quelle: { stelle: "Demo" } }],
      kandidaten: [{ x: 209, hr: 140.2, hr_max: 147, np: 211, win_s: 600, uhr: "18:30" }], zuordnung: "letzter Block" }] };
  const L = FK.lactateData(D);
  assert.equal(L.singles.length, 1);
  assert.equal(L.singles[0].x, 209);
  assert.ok(!L.tests.some((t) => t.id === "demo-check"), "Einzelpunkt gehört zu keiner Testkurve");
  const before = JSON.stringify(FK.cockpit([PROFIL], SCHWELLEN, "2026-06-01"));
  assert.equal(JSON.stringify(FK.cockpit([PROFIL], D.schwellen, "2026-06-01")), before, "Einzelpunkt ändert keine Schwelle");
  assert.ok(FK.qualityFlags(L.singles[0]).includes("Vorschau: noch nicht bestätigt"));
});

/* ---------- Readiness ---------- */
const base = (f) => days("2026-01-01", 70, (i) => ({ hrv: 80 + ((i * 7) % 5) - 2, rhr: 46 + (i % 3) - 1, sleepH: 7.5, ...((f && f(i)) || {}) }));
const ACTS = Array.from({ length: 70 }, (_, i) => ({ date: FK.addDays("2026-01-01", i), tss: 60, sport: "rad" }));
const D70 = FK.addDays("2026-01-01", 69);
test("Readiness: normale Werte → bereit, mit 2–4 Gründen", () => {
  const r = FK.readiness(base(), ACTS, [], D70);
  assert.equal(r.status, "bereit");
  assert.ok(r.gruende.length >= 2 && r.gruende.length <= 4);
  assert.ok(!/%/.test(r.status));
});
test("Readiness: HRV nur an einem Tag → ungenügende Baseline, kein sicherer Status", () => {
  const d = days("2026-03-01", 10, (i) => ({ hrv: i === 9 ? 80 : null, rhr: null, sleepH: null }));
  const r = FK.readiness(d, [], [], "2026-03-10");
  assert.equal(r.indikatoren.hrv.status, "unbekannt");
  assert.equal(r.status, "nicht beurteilbar");
});
test("Readiness: HRV fehlt ganz → unbekannt, nicht «normal»", () => {
  const r = FK.readiness(base((i) => (i > 60 ? { hrv: null } : {})), ACTS, [], D70);
  assert.equal(r.indikatoren.hrv.status, "unbekannt");
  assert.notEqual(r.status, "bereit");
});
test("Readiness: 0 Ruhepulsmessungen → unbekannt, nie 0 bpm", () => {
  const r = FK.readiness(base((i) => ({ rhr: null })), ACTS, [], D70);
  assert.equal(r.indikatoren.rhr.status, "unbekannt");
  assert.equal(r.indikatoren.rhr.wert3, undefined);
});
test("Readiness: ein Ausreisser zählt nicht in den 7-Tage-Schnitt", () => {
  const r = FK.readiness(base((i) => (i === 66 ? { hrv: 25 } : {})), ACTS, [], D70);
  assert.deepEqual(r.indikatoren.hrv.ausreisser, [FK.addDays("2026-01-01", 66)]);
  assert.equal(r.indikatoren.hrv.status, "im Bereich");
});
test("Readiness: subjektiv erschöpft bei normaler HRV → nicht «bereit»", () => {
  const r = FK.readiness(base(), ACTS, [{ date: D70, muede: 5 }], D70);
  assert.equal(r.indikatoren.hrv.status, "im Bereich");
  assert.equal(r.status, "vorsichtig");
});
test("Readiness: Krankheitszeichen → vorsichtig, keine harte Einheit vorgeschlagen", () => {
  const r = FK.readiness(base(), ACTS, [{ date: D70, krank: ["Halsweh"] }], D70);
  assert.equal(r.status, "vorsichtig");
  assert.equal(r.harte_einheit, "nicht empfohlen");
  assert.ok(!/Intervall|hart trainieren/i.test(r.empfehlung));
});
test("Readiness: vier Nachtdienst-Tage → Schlaf nicht vergleichbar", () => {
  const bef = [0, 1, 2, 3].map((k) => ({ date: FK.addDays(D70, -k), nachtdienst: true }));
  const r = FK.readiness(base((i) => (i > 65 ? { sleepH: 4.2 } : {})), ACTS, bef, D70);
  assert.equal(r.indikatoren.schlaf.status, "nicht vergleichbar");
  assert.ok(r.indikatoren.hrv.hinweis);
});
test("Readiness: Schlafdefizit und Stress → vorsichtig mit Begründung", () => {
  const r = FK.readiness(base((i) => (i === 69 ? { sleepH: 4.5 } : {})), ACTS, [{ date: D70, stress: 4 }], D70);
  assert.equal(r.status, "vorsichtig");
  assert.ok(r.gruende.some((g) => /Schlaf/.test(g)) && r.gruende.some((g) => /Stress/.test(g)));
});
test("Readiness: Lastvariante – hohe Woche allein ist ein schwaches Zeichen", () => {
  const acts = ACTS.map((a, i) => (i > 62 ? { ...a, tss: 220 } : a));
  const r = FK.readiness(base(), acts, [], D70);
  assert.equal(r.indikatoren.last.status, "hoch");
  assert.equal(r.status, "normal");
  const r2 = FK.readiness(base((i) => (i > 66 ? { rhr: 51 } : {})), acts, [], D70);
  assert.equal(r2.status, "vorsichtig");
});

/* ---------- 5-h-Ausfahrt ---------- */
const ride = (i, o) => ({ id: "r" + i, sport: "rad", typ: "Rennrad", date: FK.addDays("2026-04-01", i * 5), mv: 5 * 3600, dur: 5 * 3600, watt: 190 + i, np: 200 + i, hr: 135 + i, dr: { dec: 3 + i * 0.3, h1: 132, h2: 138 }, ...o });
test("5 h: keine verlässlichen Vergleichsfahrten → nicht bestimmbar, Watt und Puls null", () => {
  const r = FK.longRide([ride(1), ride(2)], { stunden: 5, zweck: "longride", system: "rennrad", heute: "2026-06-01" });
  assert.equal(r.status, "nicht bestimmbar");
  assert.equal(r.watt, null);
  assert.equal(r.puls, null);
});
test("5 h: genug Fahrten → Band aus beobachteten Fahrten, keine FTP-Prozentzahl", () => {
  const r = FK.longRide([1, 2, 3, 4].map((i) => ride(i)), { stunden: 5, zweck: "longride", system: "rennrad", heute: "2026-06-01" });
  assert.equal(r.status, "vorläufig");
  assert.ok(r.watt.lo >= 191 && r.watt.hi <= 194);
  assert.equal(r.watt.quelle, "beobachtet");
  assert.ok(!JSON.stringify(r).includes("FTP"));
});
test("5 h: Indoor und Outdoor sowie Leistungsmesser getrennt", () => {
  const indoor = [1, 2, 3, 4].map((i) => ride(i, { indoor: true, typ: "Zwift" }));
  assert.equal(FK.longRide(indoor, { stunden: 5, system: "rennrad", heute: "2026-06-01" }).status, "nicht bestimmbar");
  assert.equal(FK.longRide(indoor, { stunden: 5, system: "indoor", heute: "2026-06-01" }).status, "vorläufig");
});
test("5 h: Plan-Ist zeigt Ø Watt, NP und Puls-Drift getrennt", () => {
  const p = FK.planIst({ lo: 180, hi: 195 }, { watt: 185, np: 205, hr: 140, dr: { h1: 136, h2: 144, dec: 4.8 } });
  assert.equal(p.lage_avg, "im Band");
  assert.equal(p.lage_np, "über dem Band");
  assert.equal(p.h2 - p.h1, 8);
});

/* ---------- Koppelläufe ---------- */
const t0 = FK.zurichToUnix("2026-06-14", "08:00");
const bike = (id, end, o) => ({ id, sport: "rad", date: "2026-06-14", t0: end - 7200, el: 7200, dur: 7200, watt: 200, np: 210, hr: 140, ...o });
const run = (id, start, o) => ({ id, sport: "lauf", date: "2026-06-14", t0: start, el: 2400, dur: 2400, hr: 150, sp: [{ von: 0, bis: 300, s: 300, pace: 290, hr: 145, cad: 172 }, { von: 600, bis: 1200, s: 600, pace: 300, hr: 152, cad: 170 }], ...o });
const END = t0 + 7200;
test("Koppellauf: 0, 8 und 45 min → Vorschlag; 46 min → keiner", () => {
  for (const m of [0, 8, 45]) {
    const p = FK.findBricks([bike("b", END), run("r", END + m * 60)]);
    assert.equal(p.length, 1, `${m} min`);
    assert.equal(p[0].status, "vorschlag");
    assert.equal(p[0].wechsel_min, m);
  }
  assert.equal(FK.findBricks([bike("b", END), run("r", END + 46 * 60)]).length, 0);
});
test("Koppellauf: Ende Rad 10:00, Start Lauf 10:45 bzw. 10:46 (Ortszeit, Sommerzeit)", () => {
  const e = FK.zurichToUnix("2026-07-05", "10:00");
  assert.equal(FK.findBricks([bike("b", e, { date: "2026-07-05" }), run("r", FK.zurichToUnix("2026-07-05", "10:45"), { date: "2026-07-05" })]).length, 1);
  assert.equal(FK.findBricks([bike("b", e, { date: "2026-07-05" }), run("r", FK.zurichToUnix("2026-07-05", "10:46"), { date: "2026-07-05" })]).length, 0);
});
test("Koppellauf: zwei Läufe am selben Tag → auswählen, keine stille Zuordnung", () => {
  const p = FK.findBricks([bike("b", END), run("r1", END + 300), run("r2", END + 1800)]);
  assert.equal(p.length, 2);
  assert.ok(p.every((x) => x.status === "auswählen"));
  const q = FK.findBricks([bike("b", END), run("r1", END + 300), run("r2", END + 1800)], { entscheide: [{ bike: "b", run: "r2", status: "getrennt" }] });
  assert.equal(q.find((x) => x.run === "r1").status, "vorschlag");
});
test("Koppellauf: geteilte Mehrsport-Datei wird erkannt", () => {
  const p = FK.findBricks([bike("123-0", END), run("123-2", END + 120)]);
  assert.equal(p[0].mehrsport, true);
});
test("Koppellauf: ohne Watt kein erfundener NP; Rad + 40-min-Lauf mit Abschnitten", () => {
  const b = bike("b", END, { watt: null, np: null });
  const r = run("r", END + 240);
  const m = FK.brickMetrics(b, r, FK.findBricks([b, r])[0]);
  assert.equal(m.rad.np, null);
  assert.ok(m.hinweise.some((h) => /NP/.test(h)));
  assert.equal(m.lauf.dauer_s, 2400);
  assert.equal(m.lauf.hr_anstieg, 7);
  assert.equal(m.wechsel_min, 4);
});
test("Koppellauf: manuell koppeln ausserhalb des Fensters", () => {
  const p = FK.findBricks([bike("b", END), run("r", END + 3 * 3600)], { entscheide: [{ bike: "b", run: "r", status: "bestätigt" }] });
  assert.equal(p[0].status, "bestätigt");
});

/* ---------- Fueling ---------- */
test("Fueling: 150 min und 200 g KH → 80 g/h", () => {
  const r = FK.fuelingTotals({ events: [{ t_min: 30, kh_g: 100 }, { t_min: 90, kh_g: 100 }] }, 150 * 60);
  assert.equal(r.kh_g, 200);
  assert.equal(r.kh_g_h, 80);
});
test("Fueling: Flasche 80 g, halb getrunken → 40 g", () => {
  assert.equal(FK.fuelingTotals({ events: [{ t_min: 10, kh_g: 80, wasser_ml: 750, anteil: 0.5 }] }, 3600).kh_g, 40);
});
test("Fueling: Gel 25 g + Getränk 40 g → 65 g, Vorlage zählt nicht doppelt", () => {
  const gel = { id: "p-gel", name: "Gel (Demo)", kh_g: 25 }, drink = { id: "p-drink", name: "Getränk (Demo)", kh_g: 40, wasser_ml: 500 };
  const entry = { events: [FK.eventFromProduct(gel, 20), FK.eventFromProduct(drink, 40)] };
  assert.equal(FK.fuelingTotals(entry, 3600).kh_g, 65);
});
test("Fueling: fehlende Erfassung = unbekannt, nicht 0 g/h; alles 0 = 0", () => {
  const none = FK.fuelingTotals(null, 3600);
  assert.equal(none.status, "nicht protokolliert");
  assert.equal(none.kh_g_h, null);
  const zero = FK.fuelingTotals({ events: [] }, 3600);
  assert.equal(zero.kh_g_h, 0);
  assert.equal(zero.status, "protokolliert: nichts eingenommen");
  const allZero = FK.fuelingTotals({ events: [{ t_min: 5, kh_g: 0, wasser_ml: 0, natrium_mg: 0 }] }, 3600);
  assert.equal(allZero.kh_g_h, 0);
});
test("Fueling: unvollständige Angaben → nur Untergrenze", () => {
  const r = FK.fuelingTotals({ events: [{ t_min: 5, kh_g: 30 }, { t_min: 30, kh_g: null, produkt: "Riegel?" }] }, 3600);
  assert.equal(r.kh_g, null);
  assert.equal(r.kh_min_g, 30);
  assert.ok(r.unvollstaendig.length);
});
test("Fueling: 5-h-Fahrt gemischt, GI ab Stunde 3 und Minute 195 gegen vorangehende Aufnahme", () => {
  const e = { events: [], gi: [{ t_min: 195, schwere: 3, notiz: "Druck im Magen" }] };
  for (let m = 15; m < 300; m += 30) e.events.push({ t_min: m, kh_g: 25, produkt: "Gel (Demo)" });
  for (let m = 0; m < 300; m += 60) e.events.push({ t_min: m, kh_g: 60, wasser_ml: 750, anteil: m === 240 ? 0.6 : 1, produkt: "Flasche (Demo)" });
  const t = FK.fuelingTotals(e, 300 * 60);
  assert.equal(t.kh_g, 10 * 25 + 4 * 60 + 36);
  assert.equal(t.kh_g_h, +(t.kh_g / 5).toFixed(1));
  const g = FK.giContext(e, 60)[0];
  assert.equal(g.t_min, 195);
  assert.equal(g.kh_g, 25 * 2 + 60);
  assert.match(g.hinweis, /keine Ursache/);
  const blocks = FK.fuelingBlocks(e, 300 * 60, 30);
  assert.equal(blocks.length, 10);
  assert.equal(blocks.reduce((s, b) => s + b.kh_g, 0), t.kh_g);
});

/* ---------- Rad-Fahrzeit (Physik) ---------- */
const Q = { P: 200, m: 83, cda: 0.3, crr: 0.004, rho: 1.2, eta: 0.976, vmax: 70 / 3.6 };
test("ETA: Ebene, Anstieg, Abfahrt, Wind und 0 W plausibel", () => {
  const flat = FK.speedFromPower(200, { ...Q, grade: 0 }) * 3.6;
  assert.ok(flat > 31 && flat < 38, `Ebene ${flat}`);
  const up = FK.speedFromPower(200, { ...Q, grade: 0.08 }) * 3.6;
  assert.ok(up > 8 && up < 14, `8 % ${up}`);
  const down = FK.speedFromPower(0, { ...Q, grade: -0.12 }) * 3.6;
  assert.equal(Math.round(down), 70, "Abfahrt begrenzt");
  const head = FK.speedFromPower(200, { ...Q, grade: 0, wind: -5 });
  const tail = FK.speedFromPower(200, { ...Q, grade: 0, wind: 5 });
  assert.ok(head < flat / 3.6 && tail > flat / 3.6, "Gegenwind langsamer, Rückenwind schneller");
  assert.equal(FK.speedFromPower(0, { ...Q, grade: 0 }), 0, "0 W in der Ebene: keine Fahrt");
  const pts = Array.from({ length: 101 }, (_, i) => ({ d: i * 100, ele: 500 }));
  const r = FK.routeTime(pts, Q);
  assert.ok(Math.abs(r.bewegung_s - 10000 / (flat / 3.6)) < 5);
  assert.ok(r.spanne_s[0] < r.bewegung_s && r.spanne_s[1] > r.bewegung_s);
  assert.equal(FK.routeTime(pts, { ...Q, P: 0 }).unmoeglich, true);
});

/* ---------- CdA ---------- */
function synthSamples(cda, q, n, seed) {
  let s = seed || 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5);
  const out = []; let alt = 400, v = 9;
  for (let i = 0; i < n; i++) {
    const grade = 0.01 * Math.sin(i / 80);
    const P = 200 + 40 * Math.sin(i / 23);
    const th = Math.atan(grade);
    const res = q.m * 9.80665 * (Math.sin(th) + q.crr * Math.cos(th)) + 0.5 * q.rho * cda * v * v;
    const acc = ((q.eta * P) / v - res) / q.m;
    const v2 = Math.max(2, v + acc);
    alt += Math.sin(th) * (v + v2) / 2;
    out.push({ t: i, v: v2 * (1 + rnd() * 0.002), P, alt });
    v = v2;
  }
  return out;
}
test("CdA: virtuelle Höhe findet das bekannte CdA wieder; A-B-A erkennt den Unterschied", () => {
  const q = { m: 83, crr: 0.004, rho: 1.2, eta: 0.976 };
  const r = FK.fitCdA(synthSamples(0.28, q, 900, 7), q);
  assert.ok(Math.abs(r.cda - 0.28) < 0.004, `CdA ${r.cda}`);
  const aba = FK.abaTest([{ name: "A1", samples: synthSamples(0.3, q, 700, 3) }, { name: "B", samples: synthSamples(0.27, q, 700, 4) }, { name: "A2", samples: synthSamples(0.3, q, 700, 5) }], q);
  assert.ok(aba.diff < -0.02);
  assert.equal(aba.status, "Unterschied über der Streuung");
});

/* ---------- FIT lesen ---------- */
function tinyFit() {
  const bytes = [];
  const u8 = (v) => bytes.push(v & 0xff), u16 = (v) => { u8(v); u8(v >> 8); }, u32 = (v) => { u16(v & 0xffff); u16(v >>> 16); };
  u8(0x40); u8(0); u8(0); u16(20); u8(4); [[253, 4, 0x86], [7, 2, 0x84], [3, 1, 0x02], [6, 2, 0x84]].forEach((f) => f.forEach(u8));   // Definition record
  for (let i = 0; i < 5; i++) { u8(0x00); u32(1100000000 + i); u16(200 + i); u8(140 + i); u16(8000); }
  const data = bytes.slice();
  const h = [14, 0x20, 0, 0]; const size = data.length;
  const head = [...h, size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, size >>> 24, 46, 70, 73, 84, 0, 0];
  const all = Uint8Array.from([...head, ...data, 0, 0]);
  return all.buffer;
}
test("FIT: Datensätze lesen (Leistung, Puls, Tempo, Zeit)", () => {
  const f = FK.parseFit(tinyFit());
  assert.equal(f.records.length, 5);
  assert.equal(f.records[2].power, 202);
  assert.equal(f.records[2].hr, 142);
  assert.equal(f.records[0].speed, 8);
  assert.equal(f.records[0].t, 1100000000 + 631065600);
  const w = FK.windowStats(f.records, f.records[0].t, f.records[4].t, "W");
  assert.equal(w.x_median, 202);
  assert.equal(w.hr_max, 144);
});

/* ---------- Zeitzone ---------- */
test("Zeitzone Europe/Zurich über Sommer- und Winterzeit", () => {
  assert.equal(FK.zurichToUnix("2026-07-01", "12:00"), Date.UTC(2026, 6, 1, 10, 0) / 1000);
  assert.equal(FK.zurichToUnix("2026-12-01", "12:00"), Date.UTC(2026, 11, 1, 11, 0) / 1000);
  assert.equal(FK.zurichLocal(Date.UTC(2026, 2, 29, 1, 30) / 1000), "2026-03-29 03:30");   // nach der Umstellung
  assert.equal(FK.zurichLocal(Date.UTC(2026, 9, 25, 0, 30) / 1000), "2026-10-25 02:30");   // erste 02:30 (Sommerzeit)
  assert.equal(FK.zurichLocal(Date.UTC(2026, 9, 25, 1, 30) / 1000), "2026-10-25 02:30");   // zweite 02:30 (Winterzeit)
});
