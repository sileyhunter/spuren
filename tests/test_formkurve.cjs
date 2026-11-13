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

test("Einzelmessungen über die Zeit (laktat-drift-1.0): gleiche Einheit und Leistung → Urteil mit Messgenauigkeit", () => {
  const D = { schwellen: SCHWELLEN, laktat_vorschau: [], activities: [{ id: "a1", start: "18:00", name: "Rolle" }, { id: "a2", start: "07:30", name: "Lang" }],
    lactate: [
      { id: "c1", kind: "check", date: "2026-05-10", sport: "rad", w: 205, lactate: 1.4, hr_avg: 140, activity: "a1", t_s: 1800, pause_s: 70, pause_timer_s: 60 },
      { id: "c2", kind: "check", date: "2026-05-10", sport: "rad", w: 207, lactate: 1.6, hr_avg: 142, activity: "a1", t_s: 5400 },
      { id: "c3", kind: "check", date: "2026-05-17", sport: "rad", w: 210, lactate: 1.3, hr_avg: 138, activity: "a2", uhr: "08:15" },
      { id: "c4", kind: "check", date: "2026-05-17", sport: "rad", w: 211, lactate: 2.4, hr_avg: 151, activity: "a2", uhr: "10:45" },
      { id: "c5", kind: "check", date: "2026-05-17", sport: "rad", w: 250, lactate: 2.6, hr_avg: 158, activity: "a2", uhr: "11:30" }] };
  const L = FK.lactateData(D);
  assert.equal(L.singles.find((x) => x.id === "c1").pause_timer_s, 60, "Pause und Zeitpunkt gehen mit");
  const V = FK.laktatVerlauf(L.singles, D.activities);
  assert.equal(V.length, 2);
  const g1 = V.find((g) => g.aktivitaet === "a1");
  assert.deepEqual(g1.punkte.map((p) => [p.t_min, p.t_art]), [[30, "fahrzeit"], [90, "fahrzeit"]]);
  assert.equal(g1.paare[0].urteil, "gleich", "+0,2 mmol/l liegt innerhalb ±0,42");
  assert.equal(g1.paare[0].grenze, 0.42);
  const g2 = V.find((g) => g.aktivitaet === "a2");
  assert.deepEqual(g2.punkte.map((p) => [p.t_min, p.t_art]), [[45, "ab_start"], [195, "ab_start"], [240, "ab_start"]], "ohne Fahrzeit: Uhrzeit minus Start");
  assert.deepEqual(g2.paare.map((q) => q.urteil), ["steigt", "nicht vergleichbar"], "+1,1 mmol/l bei gleicher Leistung steigt; 211 → 250 W nicht vergleichbar");
  assert.equal(FK.laktatZeit({ ende: "00:20" }, { start: "23:50" }).min, 30, "über Mitternacht");
  assert.deepEqual(FK.laktatZeit({}, null), { min: null, art: null }, "ohne Zeit: offen, nie geraten");
  assert.equal(FK.VERSIONS.laktat_drift, "laktat-drift-1.0");
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
  assert.ok(r.gruende.some((g) => /Schlaf/.test(g)) && r.gruende.some((g) => /Kopf 4\/5/.test(g)), "alter Eintrag (1–5) wie bisher: 4 von 5 = belastet");
});
test("Readiness 2.0: Check-in mit sieben Stufen (befinden-2.0) – 6/7 belastet, 4–5/7 mittel, Schlaf-Frage zählt mit", () => {
  const r = FK.readiness(base(), ACTS, [{ date: D70, skala: 7, v: "befinden-2.0", schlaf: 6, muede: 2, muskel: 3, stress: 1 }], D70);
  assert.equal(r.indikatoren.befinden.status, "belastet");
  assert.equal(r.status, "vorsichtig");
  assert.ok(r.gruende.some((g) => /Schlaf 6\/7/.test(g)));
  const m = FK.readiness(base(), ACTS, [{ date: D70, skala: 7, v: "befinden-2.0", schlaf: 2, muede: 5, muskel: 3, stress: 1 }], D70);
  assert.equal(m.indikatoren.befinden.status, "mittel");
  const g = FK.readiness(base(), ACTS, [{ date: D70, skala: 7, v: "befinden-2.0", schlaf: 3, muede: 3, muskel: 2, stress: 1 }], D70);
  assert.equal(g.indikatoren.befinden.status, "gut");
});
test("Readiness 2.0: 5–6 h Schlaf nur Hinweis (an den eigenen Daten geprüft), unter 5 h weiter ein starkes Zeichen", () => {
  const r = FK.readiness(base((i) => (i === 69 ? { sleepH: 5.5 } : {})), ACTS, [], D70);
  assert.equal(r.indikatoren.schlaf.status, "kurz");
  assert.notEqual(r.status, "vorsichtig");
  assert.ok(r.alle_gruende.some((x) => x.kind === "schlaf-info" && /nur Hinweis/.test(x.txt)));
  assert.equal(FK.readiness(base((i) => (i === 69 ? { sleepH: 4.5 } : {})), ACTS, [], D70).status, "vorsichtig");
});
test("Readiness 2.1 (Audit V6.4 B3): Stand am Morgen – eine harte Einheit desselben Tages ändert die Ampel nicht", () => {
  const ohne = FK.readiness(base(), ACTS, [], D70);
  const mit = FK.readiness(base(), ACTS.concat([{ id: "heute", date: D70, sport: "rad", tss: 400, mv: 5 * 3600 }]), [], D70);
  assert.equal(mit.status, ohne.status);
  assert.deepEqual(mit.indikatoren.last, ohne.indikatoren.last, "Last bis gestern");
  assert.equal(FK.VERSIONS.readiness, "readiness-2.1");
  // Ampel-Prüfung: derselbe Block landet in derselben Gruppe, egal wie gross die Einheit des Tages war
  const dd = days("2026-01-01", 70, (i) => ({ hrv: 80 + ((i * 7) % 5) - 2, rhr: 46 + (i % 3) - 1, sleepH: 7.5 }));
  const acts = []; for (let i = 0; i < 70; i++) acts.push({ id: "b" + i, date: dd[i].date, sport: "rad", tss: 50, indoor: true, ...(i % 2 ? {} : { eb: { v: "eb-1.0", art: "rad200", n: 1, w: 200, hr: 140 } }) });
  const gross = acts.map((a, i) => (i === 68 ? { ...a, tss: 400 } : a));
  assert.deepEqual(FK.ampelPruefung(dd, gross, [], dd[69].date).ampel.map((g) => g.n), FK.ampelPruefung(dd, acts, [], dd[69].date).ampel.map((g) => g.n));
});
test("Readiness 2.x: kurzer Schlaf (5–6 h) kein schwaches Zeichen mehr, aber nicht «bereit»; zusammen mit HRV unter Referenz «normal» (1.0: vorsichtig)", () => {
  assert.equal(FK.readiness(base(), ACTS, [], D70).status, "bereit");
  assert.equal(FK.readiness(base((i) => (i === 69 ? { sleepH: 5.5 } : {})), ACTS, [], D70).status, "normal");
  const tief = (i) => (i >= 63 ? { hrv: 79, ...(i === 69 ? { sleepH: 5.5 } : {}) } : {});
  const r = FK.readiness(base(tief), ACTS, [], D70);
  assert.equal(r.indikatoren.hrv.status, "unter Referenz");
  assert.equal(r.status, "normal", "ein schwaches Zeichen (HRV) plus Hinweis Schlaf");
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

/* ---------- V5.5: Form (pmc-2.0) – A01 ---------- */
test("Form: an 10 Tagen gilt Form = Fitness − Ermüdung (exakt und gerundet angezeigt)", () => {
  const L = [80, 0, 120, 60, 0, 0, 150, 40, 0, 90], start = "2026-03-01", loads = new Map(L.map((v, i) => [FK.addDays(start, i), v]));
  const P = FK.pmc(loads, "2026-01-01", FK.addDays(start, 9)).slice(-10);
  assert.equal(P.length, 10);
  P.forEach((p, i) => {
    assert.equal(p.date, FK.addDays(start, i));
    assert.ok(Math.abs(p.tsb - (p.ctl - p.atl)) < 1e-12);
    const A = FK.pmcAnzeige(p);
    assert.equal(A.form, A.fitness - A.ermuedung, `Tag ${p.date}`);
    assert.ok(Math.abs(A.form - A.form_exakt) <= 1, "gerundete Differenz weicht höchstens 1 vom exakten Wert ab");
  });
  for (let i = 1; i < P.length; i++) assert.ok(Math.abs(P[i].tsbStart - P[i - 1].tsb) < 1e-12, "Form zu Tagesbeginn = Form des Vortags");
});
test("Form: Tageswechsel ohne Training und neue Aktivität am letzten Tag", () => {
  const loads = new Map([["2026-03-01", 100], ["2026-03-05", 60]]);
  const A = FK.pmc(loads, "2026-03-01", "2026-03-10"), B = FK.pmc(loads, "2026-03-01", "2026-03-11");
  A.forEach((p, i) => assert.deepEqual(B[i], p));                       // frühere Tage bleiben gleich
  const a = A.at(-1), b = B.at(-1);
  assert.ok(Math.abs(b.ctl - a.ctl * 41 / 42) < 1e-12 && Math.abs(b.atl - a.atl * 6 / 7) < 1e-12);
  assert.ok(b.tsb > a.tsb, "ohne Training steigt die Form");
  loads.set("2026-03-11", 90);                                           // Nacht-Update bringt den Lauf von heute
  const C = FK.pmc(loads, "2026-03-01", "2026-03-11"), c = C.at(-1);
  assert.deepEqual(C.slice(0, -1), B.slice(0, -1));
  assert.ok(Math.abs(c.ctl - b.ctl - 90 / 42) < 1e-12 && Math.abs(c.atl - b.atl - 90 / 7) < 1e-12);
  assert.ok(Math.abs(c.tsbStart - b.tsbStart) < 1e-12, "Form zu Tagesbeginn ändert sich durch die neue Einheit nicht");
});
test("Form: Beispiel wie im Screenshot (Fitness 91, Ermüdung 89) ergibt Form +2, Vortageswert getrennt", () => {
  const A = FK.pmcAnzeige({ date: "2026-11-07", ctl: 90.5, atl: 89.4, tsbStart: -9.6, last: 130 });
  assert.deepEqual([A.fitness, A.ermuedung, A.form, A.form_exakt, A.form_tagesbeginn], [91, 89, 2, 1.1, -10]);
  assert.equal(A.v, "pmc-2.0");
});

/* ---------- V5.5: Intensitätsverteilung (zonen-2.0) – A02 ---------- */
const ZP = (id, ab, bis, lt1, lt2) => ({ id, name: "Zonen " + id, gueltig_ab: ab, gueltig_bis: bis, status: bis ? "ersetzt" : "aktiv",
  skalen: [{ disziplin: "rad", metrik: "puls", unit: "bpm", zonen: [{ z: "Z1", von: null, bis: lt1 - 10 }, { z: "Z2", von: lt1 - 10, bis: lt1 }, { z: "Z3", von: lt1, bis: lt2 }, { z: "Z4", von: lt2, bis: lt2 + 10 }, { z: "Z5", von: lt2 + 10, bis: null }] },
    { disziplin: "lauf", metrik: "puls", unit: "bpm", zonen: [{ z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: 145 }, { z: "Z3", von: 145, bis: 165 }, { z: "Z4", von: 165, bis: 175 }, { z: "Z5", von: 175, bis: null }] }] });
const hist = (bpm, sec) => { const h = Array(30).fill(0); h[Math.floor((bpm - 60) / 5)] = sec; return h; };
test("Zonen: Grenzen nach Datum der Einheit, ohne Profil nur Garmin-Zonen", () => {
  const Z = [ZP("alt", "2026-01-01", "2026-06-01", 140, 160), ZP("neu", "2026-06-01", null, 135, 155)];
  const a1 = { sport: "rad", date: "2025-12-20", hh: hist(152, 3600), zones: [600, 1200, 1200, 600, 0] };
  const a2 = { sport: "rad", date: "2026-03-10", hh: hist(157, 3600), zones: [0, 0, 3600, 0, 0] };
  const a3 = { sport: "rad", date: "2026-07-10", hh: hist(157, 3600), zones: [0, 0, 3600, 0, 0] };
  assert.equal(FK.zone3(a1, Z).basis, "garmin");
  assert.deepEqual(FK.zone3(a1, Z).z, [1800, 1200, 600]);
  const q2 = FK.zone3(a2, Z), q3 = FK.zone3(a3, Z);
  assert.equal(q2.basis, "profil"); assert.equal(q2.grenzen.lt1, 140); assert.deepEqual(q2.z, [0, 3600, 0]);   // 155–160 bpm, altes Profil (LT2 160): mittel
  assert.equal(q3.basis, "profil"); assert.equal(q3.grenzen.lt1, 135); assert.deepEqual(q3.z, [0, 0, 3600]);   // gleicher Puls, neues Profil (LT2 155): hart
});
test("Zonen: Sportarten nie gemischt, Schwimmen ohne Schwellen → unsicher", () => {
  const Z = [ZP("neu", "2026-01-01", null, 135, 155)];
  const acts = [{ sport: "rad", date: "2026-02-02", hh: hist(120, 7200) }, { sport: "lauf", date: "2026-02-03", hh: hist(170, 3600) },
    { sport: "schwimm", date: "2026-02-04", hh: hist(140, 2400), zones: [600, 600, 600, 600, 0] }];
  const R = FK.zoneSummary(acts, Z, "rad", "2026-02-01", "2026-02-28");
  assert.equal(R.profil.n, 1); assert.equal(R.profil.s, 7200); assert.equal(R.garmin.n, 0);
  const S = FK.zoneSummary(acts, Z, "schwimm", "2026-02-01", "2026-02-28");
  assert.equal(S.profil.n, 0); assert.equal(S.garmin.n, 1);
  const V = FK.zoneVerdict(S, {});
  assert.equal(V.status, "unsicher"); assert.match(V.text, /^Beurteilung unsicher/); assert.match(V.text, /Schwimmen/);
});
test("Zonen: wenig Daten → «Beurteilung unsicher», nie rote Pauschalwarnung", () => {
  const Z = [ZP("neu", "2026-01-01", null, 135, 155)];
  const acts = [0, 1, 2].map((i) => ({ sport: "rad", date: FK.addDays("2026-02-02", i), hh: hist(150, 3600) }));   // alles «mittel»
  const V = FK.zoneVerdict(FK.zoneSummary(acts, Z, "rad", "2026-02-01", "2026-02-28"), { wettkampf: { name: "Testlauf", tage: 200 } });
  assert.equal(V.status, "unsicher");
  assert.doesNotMatch(V.text + V.hypothese, /zu viel|Zu viel|lockerer gestalten/);
  assert.match(V.hypothese, /Hypothese/); assert.match(V.hypothese, /Wettkampfnähe \(Testlauf: 28 Wochen\)/);
});
test("Zonen: genug Daten → Beschreibung mit Zeit, Nenner und Kontext; Summe 101 % ist Rundung", () => {
  const Z = [ZP("neu", "2026-01-01", null, 135, 155)];
  const acts = [];
  for (let w = 0; w < 4; w++) for (let i = 0; i < 3; i++) acts.push({ sport: "rad", date: FK.addDays("2026-02-02", 7 * w + 2 * i), hh: hist(120, 3000).map((v, j) => v + hist(150, 600)[j] + hist(165, 300)[j]) });
  const S = FK.zoneSummary(acts, Z, "rad", "2026-02-01", "2026-03-01");
  assert.equal(S.profil.wochen, 4); assert.equal(S.profil.n, 12);
  const V = FK.zoneVerdict(S, { stundenProWoche: 9.6, einheitenProWoche: 5 });
  assert.equal(V.status, "beschreibung");
  assert.equal(V.text, "77 % locker, 15 % mittel, 8 % hart – von 13:00 h Pulszeit in 12 Einheiten (4 Wochen).");
  assert.match(V.hypothese, /Häufigkeit \(Ø 5 Einheiten pro Woche\), Belastung \(Ø 9.6 h pro Woche\)/);
  assert.match(FK.zoneVerdict(S, { stundenProWoche: 9.6, einheitenProWoche: 5, sportName: "Rad" }).hypothese, /Ø 5 Rad-Einheiten pro Woche\), Belastung \(Ø 9.6 h Rad pro Woche/);
  assert.deepEqual(FK.anteile([335, 335, 330]), { pct: [34, 34, 33], summe: 101, total_s: 1000 });
});

/* ---------- V5.5: Koppellauf koppel-1.1 – A03 ---------- */
test("Koppellauf: 35 min direkt, 36–45 min nur Kandidat mit Hinweis, bestätigt zählt", () => {
  const END0 = FK.zurichToUnix("2026-06-14", "10:00");
  const mk = (m, entscheide) => FK.findBricks([{ id: "b", sport: "rad", t0: END0 - 3600, el: 3600 }, { id: "r", sport: "lauf", t0: END0 + m * 60, el: 1800 }], { entscheide });
  const d = mk(35)[0], l = mk(40)[0], c = mk(40, [{ bike: "b", run: "r", status: "bestätigt" }])[0];
  assert.equal(d.fenster, "direkt"); assert.equal(d.direkt, true); assert.equal(d.hinweis, undefined);
  assert.equal(l.fenster, "lang"); assert.equal(l.status, "vorschlag"); assert.equal(l.direkt, false); assert.match(l.hinweis, /nur Kandidat/);
  assert.equal(c.fenster, "lang"); assert.equal(c.status, "bestätigt"); assert.equal(c.direkt, true);
  assert.equal(FK.VERSIONS.koppel, "koppel-1.1");
});
test("Koppellauf: Abschnitte 0–5, 5–10, 10–20, ab 20 min unverändert aus den Rohwerten", () => {
  const sp = [{ von: 0, bis: 300, s: 300, m: 804, pace: 373, hr: 136.9, cad: 167 }, { von: 300, bis: 600, s: 300, m: 883, pace: 340, hr: 146, cad: 169 },
    { von: 600, bis: 1200, s: 600, m: 1853, pace: 324, hr: 150.5, cad: 171 }, { von: 1200, bis: null, s: 1500, m: 4700, pace: 319, hr: 151.2, cad: null }];
  const m = FK.brickMetrics({ id: "b", sport: "rad", dur: 3600 }, { id: "r", sport: "lauf", dur: 3000, sp }, null);
  assert.deepEqual(m.lauf.splits.map((s) => [s.von, s.bis, s.pace, s.hr, s.cad]), [[0, 300, 373, 136.9, 167], [300, 600, 340, 146, 169], [600, 1200, 324, 150.5, 171], [1200, null, 319, 151.2, null]]);
  assert.deepEqual(FK.splitLabels(m.lauf.splits), ["0–5 min", "5–10 min", "10–20 min", "ab 20 min"]);
  assert.deepEqual(FK.splitRange(m.lauf.splits.map((s) => s.pace), 5), [314, 378]);       // keine Null-Pace als Achsenbeginn
});

/* ---------- V5.5: Lange Ausfahrt «vorsichtige Orientierung» – P0.6 ---------- */
test("5 h: validiert bleibt «nicht bestimmbar»; Orientierung getrennt aus 10 langen Fahrten", () => {
  const L = [4.3, 4.5, 4.7, 4.9, 5.0, 5.2, 5.3, 5.5, 5.6, 5.8].map((hh, i) => ride(i, { mv: hh * 3600, dur: hh * 3600, watt: 170 + 2 * i, np: 180 + 2 * i, dr: { dec: i < 2 ? 4 : 7 + i * 0.2, h1: 130, h2: 137 + (i % 3) } }));
  const r = FK.longRide(L, { stunden: 5, zweck: "longride", system: "rennrad", heute: "2026-06-01" });
  assert.equal(r.status, "nicht bestimmbar"); assert.equal(r.watt, null);
  const o = FK.longRideOrientierung(L, { stunden: 5, system: "rennrad", heute: "2026-06-01", lt1_hf: 152 });
  assert.equal(o.status, "orientierung"); assert.equal(o.validiert, false); assert.equal(o.n, 10);
  assert.deepEqual([o.watt.lo, o.watt.hi], [175, 179]);                   // 25.–50. Perzentil von 170…188 W
  assert.equal(o.drift_bpm, 8); assert.equal(o.puls_start_max, 144);    // 152 − 8
  assert.match(o.fehlend.join(" "), /nur 2 der 10 Fahrten mit Entkopplung ≤ 5 %/);
  assert.match(o.fehlend.join(" "), /keine Umrechnung/);
});
test("5 h: Orientierung nie aus kurzen Fahrten; Rolle oben auf LT1 begrenzt", () => {
  const kurz = [1, 2, 3, 4, 5].map((i) => ride(i, { mv: 2 * 3600, dur: 2 * 3600 }));
  const o = FK.longRideOrientierung(kurz, { stunden: 5, system: "rennrad", heute: "2026-06-01" });
  assert.equal(o.status, "keine Orientierung"); assert.equal(o.watt, null); assert.match(o.grund, /nicht hochgerechnet/);
  const rolle = [1, 2, 3, 4].map((i) => ride(i, { indoor: true, typ: "Zwift", mv: 4 * 3600, dur: 4 * 3600, watt: 200 + i * 5, np: 205 + i * 5 }));
  const q = FK.longRideOrientierung(rolle, { stunden: 4, system: "indoor", heute: "2026-06-01", lt1_w: 205 });
  assert.equal(q.watt.hi, 205); assert.ok(q.watt.lo <= 205); assert.match(q.bedingungen.join(" "), /LT1 205 W/);
});

/* ---------- V5.5: Meine Entwicklung (entwicklung-1.0) – A05, A06 ---------- */
const blk = (date, hr, o) => ({ date, v: hr, id: "a" + date, x: 200, q: { wx: null, alt: 500, dhr: 1, n: 1, ...(o || {}) } });
const per = (von, bis) => ({ von, bis });
test("Entwicklung: Lauf 168 → 156 bpm bei 5:30/km = verbessert, aber vorläufig (wenige Messungen)", () => {
  const pts = [blk("2023-05-02", 169), blk("2023-06-10", 167), blk("2023-07-01", 168), blk("2023-08-12", 170),
    blk("2026-05-03", 155), blk("2026-06-11", 157), blk("2026-07-02", 156), blk("2026-08-13", 154)];
  const r = FK.entwicklung("lauf330", pts, per("2026-01-01", "2026-12-31"), per("2023-01-01", "2023-12-31"));
  assert.equal(r.status, "verbessert"); assert.equal(r.diff, -13); assert.equal(r.vorlaeufig, true);   // Median 155.5 gegen 168.5
  assert.deepEqual(r.n, { P: 4, R: 4 });
  assert.match(FK.entwicklungAntworten([r]).verbessert[0], /−13.0 bpm \(n 4 gegen 4, vorläufig\)/);
});
test("Entwicklung: Rennrad 143 → 143 bpm bei 200 W = stabil, nicht «besser»", () => {
  const pts = [141, 143, 145, 143, 142].map((h, i) => blk(`2025-0${i + 4}-10`, h)).concat([142, 144, 143, 143, 145].map((h, i) => blk(`2026-0${i + 4}-10`, h)));
  const r = FK.entwicklung("rad200", pts, per("2026-01-01", "2026-12-31"), per("2025-01-01", "2025-12-31"));
  assert.equal(r.status, "stabil"); assert.equal(r.diff, 0);
  assert.equal(FK.entwicklungAntworten([r]).verbessert.length, 0);
  assert.match(FK.entwicklungAntworten([r]).stabil[0], /stabil/);
});
test("Entwicklung: Rolle und draussen nie gemischt (Punkte je System)", () => {
  const act = (id, date, sys, hr) => ({ id, date, sport: "rad", typ: sys === "indoor" ? "Zwift" : "Rennrad", indoor: sys === "indoor", eb: { art: "rad200", w: 200, hr, n: 1, dhr: 1, alt: 400 } });
  const D = { activities: [act("i1", "2025-03-01", "indoor", 139), act("i2", "2025-03-08", "indoor", 140), act("o1", "2025-03-09", "rennrad", 152)] };
  assert.deepEqual(FK.entwicklungPunkte(D, "rad200", { sys: "indoor" }).map((p) => p.id), ["i1", "i2"]);
  assert.deepEqual(FK.entwicklungPunkte(D, "rad200", { sys: "rennrad" }).map((p) => p.id), ["o1"]);
});
test("Entwicklung: Guards – Hitze, Höhe, Drift, Ausreisser, Vorschau, Mindest-n", () => {
  const R = [140, 141, 142, 141, 140].map((h, i) => blk(`2025-05-0${i + 1}`, h));
  const P = [139, 140, 141, 139, 140].map((h, i) => blk(`2026-05-0${i + 1}`, h))
    .concat([blk("2026-05-10", 150, { wx: 29 }), blk("2026-05-11", 150, { alt: 1800 }), blk("2026-05-12", 150, { dhr: 12 }), blk("2026-05-13", 170), blk("2026-05-14", 150, { status: "vorschau" })]);
  const r = FK.entwicklung("rad200", R.concat(P), per("2026-01-01", "2026-12-31"), per("2025-01-01", "2025-12-31"));
  assert.deepEqual(r.ausgeschlossen, { hitze: 1, hoehe: 1, drift: 1, vorschau: 1, ausreisser: 1 });
  assert.equal(r.n.P, 5); assert.equal(r.status, "stabil");
  const k = FK.entwicklung("rad200", R.slice(0, 2).concat(P.slice(0, 5)), per("2026-01-01", "2026-12-31"), per("2025-01-01", "2025-12-31"));
  assert.equal(k.status, "nicht beurteilbar"); assert.match(k.text, /keine ausreichenden vergleichbaren Daten/);
});
test("Entwicklung: deterministisch und Intervall enthält die Differenz", () => {
  const pts = [150, 148, 152, 149, 151, 147].map((h, i) => blk(`2025-06-0${i + 1}`, h)).concat([146, 144, 147, 145, 143, 146].map((h, i) => blk(`2026-06-0${i + 1}`, h)));
  const a = FK.entwicklung("rad200", pts, per("2026-01-01", "2026-12-31"), per("2025-01-01", "2025-12-31")), b = FK.entwicklung("rad200", pts, per("2026-01-01", "2026-12-31"), per("2025-01-01", "2025-12-31"));
  assert.deepEqual(a.ci90, b.ci90); assert.ok(a.ci90[0] <= a.diff && a.diff <= a.ci90[1]);
  assert.equal(a.status, "verbessert"); assert.equal(a.vorlaeufig, false);
});
test("Laktat: nur Interpolation zwischen Stufen; gemeinsamer Leistungswert; CSS 9:00 / 4:20 = 2:20 pro 100 m (A06)", () => {
  const st = [{ x: 160, la: 1.0 }, { x: 180, la: 1.2 }, { x: 200, la: 1.6 }, { x: 220, la: 2.4 }];
  assert.equal(FK.laInterp(st, 190), 1.4); assert.equal(FK.laInterp(st, 230), null); assert.equal(FK.laInterp(st, 150), null);
  assert.equal(FK.laktatFixX([{ punkte: st }, { punkte: [{ x: 120, la: 1 }, { x: 240, la: 3 }] }]), 200);
  assert.equal(FK.laktatFixX([{ punkte: [{ x: 120, la: 1 }, { x: 180, la: 2 }] }, { punkte: [{ x: 150, la: 1 }, { x: 190, la: 2 }] }]), 170);
  assert.equal(FK.css(9 * 60, 4 * 60 + 20), 140); assert.equal(FK.pace(FK.css(540, 260)), "2:20");
  assert.equal(FK.css(260, 540), null);
});

/* ---------- V5.5: Lauf-Effizienz laufeffizienz-1.0 – P0.5 ---------- */
test("Lauf-Effizienz: Einheit m/Schlag, Ausreisser und Fehler werden entfernt und gezählt", () => {
  const r = (i, o) => ({ id: "l" + i, sport: "lauf", typ: "Laufen", date: FK.addDays("2026-03-01", i), km: 10, hm: 50, dur: 3300, mv: 3300, hr: 150, tss: 50, ...o });
  const acts = [0, 1, 2, 3, 4, 5].map((i) => r(i, { hr: 148 + i })).concat([r(7, { mv: 900, dur: 900, tss: 10 }), r(8, { hr: 60 }), r(9, { hr: 120 }), r(10, { typ: "Trail" }), r(11, { indoor: true })]);
  const L = FK.laufEffizienz(acts);
  assert.equal(L.einheit, "m/Schlag"); assert.equal(L.v, "laufeffizienz-1.0");
  assert.equal(L.n, 9);                                                // Trail und Laufband gar nicht erst dabei
  assert.deepEqual(L.ausgeschlossen, { tempo: 1, puls: 1, ausreisser: 1 });
  const p = L.punkte[0];                                               // 10 km in 55 min = 181.8 m/min; / 148 = 1.2285 m/Schlag
  assert.equal(p.y, 1.229); assert.equal(p.mpm, 181.8);
});

/* ---------- V5.5 Schwimmen: CSS-Formular (A06) ---------- */
test("A06: CSS-Formular – 9:00 und 4:20 ergeben 2:20/100 m, Eingaben in mm:ss, Fehler und Hinweise", () => {
  global.window = global.window || {}; window.FK = FK;
  require("../js/v55-schwimmen.js");
  const S = window.V55S;
  assert.equal(S.parseZeit("9:00"), 540); assert.equal(S.parseZeit("4:20"), 260); assert.equal(S.parseZeit("9.00"), 540);
  assert.equal(S.parseZeit("540"), 540); assert.equal(S.parseZeit("4:20,5"), 260.5); assert.equal(S.parseZeit("4:75"), null); assert.equal(S.parseZeit(""), null);
  const p = S.pruefe(S.parseZeit("9:00"), S.parseZeit("4:20"));
  assert.deepEqual(p.fehler, []); assert.equal(p.css, 140); assert.equal(S.mmss(p.css), "2:20");
  assert.match(S.pruefe(260, 540).fehler[0], /400-m-Zeit muss länger/);
  assert.match(S.pruefe(null, 260).fehler[0], /Beide Zeiten/);
  assert.match(S.pruefe(500, 260).hinweise[0], /pro 100 m schneller/, "400 m schneller als 200 m pro 100 m: Hinweis");
  // Gespeicherte Tests sind Messpunkte für «Meine Entwicklung»; validiert:false bleibt Vorschau
  const D = { css_tests: [{ id: "c1", datum: "2026-10-01", t400: 540, t200: 260, becken: 25, validiert: true }] };
  const pts = FK.entwicklungPunkte(D, "css", { lokal: [{ id: "c2", datum: "2026-11-01", t400: 530, t200: 258, becken: 25, validiert: false }] });
  assert.deepEqual(pts.map((x) => [x.v, x.q.status]), [[140, "bestätigt"], [136, "vorschau"]]);
});

test("Sollband lange Ausfahrt aus den Trainingszonen (langfahrt-2.0): Z2 nach Dauer, Puls als Obergrenze (Werte erfunden)", () => {
  const Z = [{ id: "z-alt", name: "Alt", status: "ersetzt", gueltig_ab: "2025-01-01", gueltig_bis: "2026-05-31",
               skalen: [{ disziplin: "rad", metrik: "leistung", zonen: [{ z: "Z2", von: 150, bis: 190 }] }] },
             { id: "z-neu", name: "Zonen Test", status: "aktiv", gueltig_ab: "2026-06-01", gueltig_bis: null, skalen: [
               { disziplin: "rad", metrik: "leistung", geraet: "Zwift-Rolle", zonen: [{ z: "Z1", von: null, bis: 180 }, { z: "Z2", von: 180, bis: 220 }, { z: "Z3", von: 220, bis: 260 }] },
               { disziplin: "rad", metrik: "puls", zonen: [{ z: "Z2", von: 130, bis: 145 }, { z: "Z3", von: 145, bis: 160 }] }] }];
  const b = (h) => { const x = FK.zonenBand(Z, "2026-11-08", h); return [x.lo, x.hi]; };
  assert.deepEqual(b(1), [210, 220], "1 h: oberstes Viertel von Z2");
  assert.deepEqual(b(5), [180, 190], "5 h: unterstes Viertel von Z2");
  assert.deepEqual(b(6), [180, 190], "länger als 5 h: nicht unter Z2");
  assert.deepEqual(b(0.5), [210, 220], "kürzer als 1 h: nicht über Z2");
  assert.deepEqual(b(3), [195, 205], "dazwischen linear");
  const x = FK.zonenBand(Z, "2026-11-08", 2.5);
  assert.ok(x.lo >= 180 && x.hi <= 220 && x.hi - x.lo === 10 && x.puls_max === 145 && x.profil === "Zonen Test" && x.geraet === "Zwift-Rolle");
  assert.deepEqual([FK.zonenBand(Z, "2026-03-01", 1).lo, FK.zonenBand(Z, "2026-03-01", 1).hi], [180, 190], "Profil, das am Datum galt");
  assert.equal(FK.zonenBand([], "2026-11-08", 2), null, "ohne Zonenprofil kein Band (dann beobachtet)");
  assert.ok(FK.ZONENBAND.zwecke.includes("longride") && !FK.ZONENBAND.zwecke.includes("im"), "Renn-Pacing bleibt beobachtet");
});

/* ---------- V5.8 Ringe (ringe-1.0), erfundene Werte ---------- */
test("ringe-1.0: Erholung aus HRV und Ruhepuls gegen eigene 60 Tage, Schlaf nur aus der eigenen Nacht, Belastung gegen die Fitness", () => {
  const heute = "2026-03-20", days = [], acts = [];
  for (let i = 0; i < 70; i++) { const d = FK.addDays(heute, -69 + i); days.push({ date: d, hrv: 80 + (i % 2 ? 4 : -4), rhr: 50 + (i % 2 ? 1 : -1), sleepScore: 75, sleepH: 7 }); if (i % 2) acts.push({ date: d, tss: 80 }); }
  const typ = FK.ringe(days.map((d, i) => (i === 69 ? Object.assign({}, d, { hrv: 80, rhr: 50 }) : d)), acts, heute);
  assert.ok(Math.abs(typ.erholung - 50) <= 2, "typischer Morgen ≈ 50 %: " + typ.erholung);
  const gut = FK.ringe(days.map((d, i) => (i === 69 ? Object.assign({}, d, { hrv: 92, rhr: 47 }) : d)), acts, heute);
  assert.ok(gut.erholung > 90, "höhere HRV, tieferer Ruhepuls → hoch"); assert.equal(FK.ringFarbe(gut.erholung), "gut");
  const schlecht = FK.ringe(days.map((d, i) => (i === 69 ? Object.assign({}, d, { hrv: 68, rhr: 54 }) : d)), acts, heute);
  assert.ok(schlecht.erholung < 10); assert.equal(FK.ringFarbe(schlecht.erholung), "tief");
  const nurPuls = FK.ringe(days.map((d, i) => (i === 69 ? Object.assign({}, d, { hrv: null, rhr: 50 }) : d)), acts, heute);
  assert.equal(nurPuls.quelleE, "nur Ruhepuls (HRV fehlt)"); assert.ok(Math.abs(nurPuls.erholung - 50) <= 2);
  const leer = FK.ringe(days.map((d, i) => (i === 69 ? { date: d.date } : d)), acts, heute);
  assert.equal(leer.erholung, null); assert.equal(leer.schlaf, null, "fehlende Nacht bleibt leer – nie die Nacht davor");
  const kurz = FK.ringe(days.slice(-10), acts, heute); assert.equal(kurz.erholung, null, "unter 14 Referenztagen: unbekannt");
  // Belastung: Tageslast = Fitness → 50 %, doppelt → 75 %, Ruhetag 0 %
  const r = FK.ringe(days, acts, heute);
  assert.ok(r.ctl > 30 && r.ctl < 45); assert.equal(r.belastung, Math.round(100 * (1 - Math.pow(2, -r.tss / r.ctl))));
  const eins = FK.ringe(days, acts.concat([{ date: heute, tss: r.ctl - r.tss }]), heute); assert.ok(Math.abs(eins.belastung - 50) <= 1, "Tageslast = Fitness");
  const ruhe = FK.ringe(days, acts.filter((a) => a.date !== heute), heute); assert.equal(ruhe.belastung, 0);
  const V = FK.ringeVerlauf(days, acts, heute, 7);
  assert.equal(V.length, 7); assert.equal(V[6].date, heute); assert.ok(V.every((x) => x.v === "ringe-1.0"));
  assert.equal(FK.ringeVerlauf([], [], heute, 3)[0].belastung, null, "ohne Daten: unbekannt");
});

test("Ampel-Prüfung (ampel-pruefung-1.1): Puls bei gleicher Leistung je Ampel-Stand, nur gegen die 60 Tage davor, kleine Gruppen ohne Mittelwert", () => {
  // 70 Tage normale Morgenwerte, an Tag 69 und 70 Ruhepuls deutlich erhöht (→ Vorsicht); jeden zweiten Tag ein 200-W-Block
  const dd = days("2026-01-01", 70, (i) => ({ hrv: 80 + ((i * 7) % 5) - 2, rhr: i >= 64 ? 58 : 46 + (i % 3) - 1, sleepH: 7.5 }));
  const acts = []; for (let i = 0; i < 70; i += 2) acts.push({ id: "a" + i, date: dd[i].date, sport: "rad", tss: 60, indoor: true, eb: { v: "eb-1.0", art: "rad200", n: 1, w: 200, hr: i >= 64 ? 150 : 140 } });
  const P = FK.ampelPruefung(dd, acts, [], dd[69].date);
  assert.equal(P.v, "ampel-pruefung-1.1");
  const vor = P.ampel.find((g) => g.k === "vorsichtig"), norm = P.ampel.find((g) => g.k === "normal" || g.k === "bereit");
  assert.ok(vor.n >= 1 && vor.n < 5 && vor.mittel === null, "weniger als 5 Blöcke: kein Mittelwert");
  assert.ok(P.n > 20 && norm && norm.n >= 5);
  const P2 = FK.ampelPruefung(dd, acts, [], dd[69].date, { minGruppe: 1 });
  assert.ok(P2.ampel.find((g) => g.k === "vorsichtig").mittel > 5, "an Vorsicht-Tagen höherer Puls bei gleicher Leistung");
});
