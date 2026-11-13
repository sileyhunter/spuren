// Abnahmetests V6.1 (js/v61.js: Garmin-Werte eines Tages, Datenlage, Verpflegung aus der Notiz) – nur erfundene Werte mit bekanntem Ergebnis.
// Aufruf: node --test tests/test_v61.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = undefined;
const V61 = require("../js/v61.js");
const FK = require("../js/formkurve.js");

const DAYS = [
  { date: "2026-11-10", hrv: 70, rhr: 45, sleepH: 7.1, stress: 30, stressHighMin: 50, bbHigh: 88, bbLow: 20 },
  { date: "2026-11-11", hrv: 72, rhr: 44, sleepH: 7.4, sleepStress: 18, readiness: 61, readinessLevel: "MODERATE", bodyBattery: 70, bbSleep: 45, stress: 24, stressHighMin: 35 },
  { date: "2026-11-12", hrv: 74, readiness: 82, readinessLevel: "HIGH", bodyBattery: 91, bbSleep: 63 },
];

test("Garmin-Werte für heute: Readiness und Body Battery vom Morgen, Stress vom abgeschlossenen Vortag", () => {
  const g = V61.garminTag(DAYS, "2026-11-12");
  assert.equal(g.readiness, 82);
  assert.equal(g.wort, "hoch");
  assert.equal(g.bodyBattery, 91);
  assert.equal(g.bbSleep, 63);
  assert.equal(g.stressGestern, 24);
  assert.equal(g.stressHighMinGestern, 35);
  assert.equal(g.sleepStress, null, "fehlt in dieser Nacht: bleibt leer, keine andere Nacht eingesetzt");
});

test("Garmin-Werte: fehlt der Morgen, wird kein älterer Wert als heute gezeigt", () => {
  const g = V61.garminTag(DAYS, "2026-11-13");
  assert.equal(g.readiness, null);
  assert.equal(g.bodyBattery, null);
  assert.equal(g.stressGestern, null, "am 12.11. noch kein Tagesstress");
});

test("Datenlage: seit wann und an wie vielen der letzten 30 abgeschlossenen Tage ein Wert vorliegt", () => {
  const L = V61.datenlage(DAYS, "2026-11-12", ["2026-11-11", "2026-11-11", "2026-10-01"]);
  const z = Object.fromEntries(L.map((r) => [r.key, r]));
  assert.deepEqual([z.hrv.seit, z.hrv.n30, z.hrv.n365], ["2026-11-10", 2, 2], "der heutige Tag zählt noch nicht");
  assert.deepEqual([z.readiness.seit, z.readiness.n30], ["2026-11-11", 1]);
  assert.deepEqual([z.stress.seit, z.stress.n30], ["2026-11-10", 2]);
  assert.deepEqual([z.befinden.seit, z.befinden.n30, z.befinden.n365], ["2026-10-01", 1, 2], "ein Check-in je Tag, 1.10. liegt vor den 30 Tagen");
  assert.equal(L.find((r) => r.key === "sleepStress").n30, 1);
});

test("Verpflegung aus der Notiz: Vorschau → Fueling-Eintrag; Rechnung wie jeder Eintrag (fueling-1.0)", () => {
  const pv = { id: "fn-g9", activity_id: "g9", date: "2026-11-03", sport: "rad", status: "vorschau", regel: "notizen-1.0",
    events: [{ id: "n2", t_min: 35, produkt: "Gel A", kh_g: 25, wasser_ml: null, natrium_mg: null, koffein_mg: null, anteil: 1 },
      { id: "n3", t_min: null, produkt: "2 Gels C", kh_g: 44, wasser_ml: null, natrium_mg: null, koffein_mg: null, anteil: 1 }],
    vorher: [{ id: "n1", t_min: -15, produkt: "Riegel", kh_g: 25 }] };
  const e = V61.fuelingAusVorschau(pv, "a9");
  assert.equal(e.id, "fn-g9");
  assert.equal(e.activity_id, "a9");
  assert.equal(e.status, "protokolliert");
  assert.notEqual(e.events, pv.events, "Kopie, die Vorschau bleibt unverändert");
  const t = FK.fuelingTotals(e, 3600);
  assert.equal(t.kh_g, 69, "vor dem Start nicht mitgezählt");
  assert.equal(t.kh_g_h, 69);
  assert.equal(t.ml_h, null, "Wasser unbekannt bleibt unbekannt");
});

test("Offene Vorschauen: weg, sobald zur Einheit ein Eintrag existiert (auch nur auf dem Gerät oder über die gid)", () => {
  const A = { id: "a9", gid: "g9" }, B = { id: "g7", gid: "g7" };
  const einheit = (id) => ({ a9: A, g9: A, g7: B }[id] || null);
  const pv = [{ id: "fn-g9", activity_id: "g9", status: "vorschau" }, { id: "fn-g7", activity_id: "g7", status: "vorschau" }, { id: "fn-g5", activity_id: "g5", status: "übernommen" }];
  assert.deepEqual(V61.offeneFueling(pv, [], einheit).map((p) => p.id), ["fn-g9", "fn-g7"]);
  assert.deepEqual(V61.offeneFueling(pv, [{ id: "fu-a9", activity_id: "a9" }], einheit).map((p) => p.id), ["fn-g7"], "eigener Eintrag zur selben Einheit");
  assert.deepEqual(V61.offeneFueling(pv, [{ id: "fn-g7", activity_id: "g7" }], einheit).map((p) => p.id), ["fn-g9"], "übernommen, wartet auf das Update");
});

test("Laktat aus der Notiz: Kennzeichnung «laut Garmin-Notiz»; wörtliche Notiz-Texte mit «ca.» machen den Wert nicht ungefähr", () => {
  const D = { laktat_vorschau: [{ id: "ln-g9-60", art: "check", status: "vorschau", sport: "rad", datum: "2026-11-03", aktivitaet: "g9", regel: "notizen-1.0: Messung und Block aus der Notiz",
    zuordnung: "laut Notiz", block: "Min 50–60", zeilen: [{ x: 200, la: 1.6, hf: 136 }], kandidaten: [{ x: 200, hr: 136, t_s: 3600, win_s: 600 }],
    hinweise: ["Werte laut Garmin-Notiz (Block, Ø Leistung bzw. Tempo, Ø Puls), nicht aus FIT nachgerechnet", "Notiz: Wert jeweils ca. 1 min nach Abstechen."] }] };
  const s = FK.lactateData(D).singles[0];
  assert.equal(s.t_s, 3600);
  assert.equal(s.x, 200);
  const f = FK.qualityFlags(s);
  assert.ok(f.includes("Werte laut Garmin-Notiz, nicht aus FIT"));
  assert.ok(!f.includes("Wert ungefähr (ca.)"));
  const b = FK.qualityFlags({ status: "bestätigt", hinweise: ["Werte laut Garmin-Notiz (…), nicht aus FIT nachgerechnet; Notiz: Wert ca. 1 min nach Abstechen; Laktat ca. 1,5"] });
  assert.ok(b.includes("Werte laut Garmin-Notiz, nicht aus FIT") && b.includes("Wert ungefähr (ca.)"), "eigener Hinweis mit «ca.» zählt weiter");
});

test("Garmin-Verlauf (V6.2.3): Datei prüfen wie im Update – Format, Zeitraum, Werte je Feld; Ungültiges verworfen, nie geraten", () => {
  const G = { format: "spuren-garmin-verlauf-1", id: "0123456789abcdef", erstellt: "2026-11-13T12:00:00+01:00", tage: [
    { date: "2021-03-01", sleepH: 7.0 }, { date: "2026-01-10", sleepH: 6.5, sleepScore: 88, sleepStress: 12.3, readiness: 71, readinessLevel: "HIGH" },
    { date: "2026-01-11", sleepH: 40 }, { date: "2099-01-01", sleepH: 7 }, { date: "2026-01-12", readiness: 50, readinessLevel: "SUPER" }] };
  const p = V61.verlaufPruefen(G, "2026-11-13");
  assert.ok(p.ok);
  assert.deepEqual(p.zeitraum, ["2021-03-01", "2026-01-12"]);
  assert.equal(p.tage, 3, "Tag mit nur ungültigem Wert und Tag in der Zukunft zählen nicht");
  assert.deepEqual(p.anzahl, { sleepH: 2, sleepScore: 1, sleepStress: 1, readiness: 2, readinessLevel: 1 });
  assert.equal(p.verworfen, 3);
  assert.equal(V61.verlaufPruefen({ format: "spuren-eingang-1", id: "0123456789abcdef", tage: [] }, "2026-11-13").ok, false);
  assert.match(V61.verlaufPruefen({ format: "spuren-garmin-verlauf-1", id: "x", tage: [] }, "2026-11-13").grund, /unvollständig/);
  assert.match(V61.verlaufPruefen(Object.assign({}, G, { tage: [{ date: "2026-01-11", hrv: 1 }] }), "2026-11-13").grund, /Keine gültigen Tage/);
});
