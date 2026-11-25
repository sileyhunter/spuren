// Abnahmetests V9.24.5 (js/v66.js): Notiz des an Garmin gesendeten Workouts wie bei Enduco (notiz-1.0) – zuerst der Zweck, dann der Ablauf mit den Zielen
// in Watt, Puls oder Pace; erfundene Zonen. Aufruf: node --test tests/test_v9245.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V66 = require("../js/v66.js");
const SK = {
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
  rad_hf: [{ z: "Z1", von: null, bis: 120 }, { z: "Z2", von: 120, bis: 138 }, { z: "Z3", von: 138, bis: 156 }, { z: "Z4", von: 156, bis: 165 }, { z: "Z5", von: 165, bis: null }],
};
const gen = (vorlage, extra) => V66.garminWorkout(V66.einheit(Object.assign({ uid: "u1", vorlage, dauer: V66.bereich(vorlage).std, quelle: "eigen" }, extra || {}), {}), SK, { date: "2026-03-05", uid: "u1" });

test("notiz-1.0: Rad nach Watt – Zweck zuerst, dann «Ablauf:» mit einer Zeile je Schritt und den Zielen in Watt; am Ende die Kennung", () => {
  const g = gen("rad_locker"), d = g.workout.description;
  const z = d.split("\n");
  assert.ok(z[0].length > 20 && !/^Ablauf/.test(z[0]), "erste Zeile = Zweck");
  assert.equal(z[1], "Ablauf:");
  assert.ok(z.slice(2).some((l) => /^\d+ min .*\d+–\d+ W/.test(l)), d);
  assert.ok(d.endsWith(`[IN u1 ${g.fassung}]`));
  assert.ok(!/Ironman Notebook · Mein Plan/.test(d), "kein Kopfsatz mehr");
});

test("notiz-1.0: Lauf nach Pace – Ziele in Pace je Schritt; Rad nach Puls – Hinweis «Ziele nach Puls» zuerst und Pulsbereiche", () => {
  const l = gen("lauf_laktat").workout.description;
  assert.match(l, /\/km/); assert.match(l, /\n\d+×\n {2}\d+ min /);
  const p = gen("rad_tempo", { metrik: "puls" }).workout.description;
  assert.match(p, /^Ziele nach Puls\./); assert.match(p, /\d+–\d+/);
});

test("notiz-1.0: zu lange Abläufe – ganze Zeilen fallen weg («…»), Notiz bleibt unter Garmins Grenze (512 Zeichen)", () => {
  const g = gen("rad_vo2"), d = g.workout.description;
  assert.ok(d.length <= 500, String(d.length));
  assert.match(d, /\n…\s\[IN u1 /);
  const letzte = d.split("\n").slice(-2)[0];
  assert.ok(/^( {2})?\d+ (s|min) |^\d+×$/.test(letzte), "endet an einer ganzen Zeile: " + letzte);
});

test("notiz-1.0: die Fassung bleibt gleich (Prüfsumme der Schritte, nicht der Notiz) – schon gesendete Einheiten gelten nicht als geändert", () => {
  const a = gen("rad_locker"), b = gen("rad_locker");
  assert.equal(a.fassung, b.fassung);
  const kern = { workoutName: a.workout.workoutName, sportType: a.workout.sportType, workoutSegments: a.workout.workoutSegments };
  assert.equal(V66.fassung(JSON.stringify(kern)), a.fassung);
});
