// Abnahmetests V9.23.0 (js/v66.js): Einfahren und Ausfahren als Rampe (rampen-1.0). Alle Zonen sind erfunden. Aufruf: node --test tests/test_v9230.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V66 = require("../js/v66.js");

const SK = {
  rad_w: [{ z: "Z1", von: null, bis: 190 }, { z: "Z2", von: 190, bis: 235 }, { z: "Z3", von: 235, bis: 285 }, { z: "Z4", von: 285, bis: 330 }, { z: "Z5", von: 330, bis: null }],
  rad_hf: [{ z: "Z1", von: null, bis: 135 }, { z: "Z2", von: 135, bis: 148 }, { z: "Z3", von: 148, bis: 163 }, { z: "Z4", von: 163, bis: 172 }, { z: "Z5", von: 172, bis: null }],
  lauf_hf: [{ z: "Z1", von: null, bis: 135 }, { z: "Z2", von: 135, bis: 148 }, { z: "Z3", von: 148, bis: 163 }, { z: "Z4", von: 163, bis: 172 }, { z: "Z5", von: 172, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 400 }, { z: "Z2", von: 400, bis: 350 }, { z: "Z3", von: 350, bis: 310 }, { z: "Z4", von: 310, bis: 285 }, { z: "Z5", von: 285, bis: null }],
};
const flach = (steps) => steps.flatMap((s) => (s.type === "RepeatGroupDTO" ? [s].concat(s.workoutSteps) : [s]));
const sek = (L, k = 1) => L.reduce((a, s) => a + (s.type === "RepeatGroupDTO" ? sek(s.workoutSteps, s.numberOfIterations) : s.endConditionValue) * k, 0);
const wo = (vorlage, dauer, metrik, sk = SK) => {
  const e = V66.einheit({ uid: "r", vorlage, dauer, quelle: "eigen", metrik });
  const g = V66.garminWorkout(e, sk, { uid: "r" });
  assert.ok(!g.fehler, g.fehler);
  return { e, g, S: g.workout.workoutSegments[0].workoutSteps };
};

test("rampen-1.0 Rad nach Leistung: Einfahren 65→190 W, Ausfahren 190→65 W (35,5 %–100 % der Obergrenze von Z1, wie enduco «71–200 W»), Dauer bleibt gleich", () => {
  const { e, S } = wo("rad_tempo", 75);
  assert.equal(sek(S), e.dauer * 60);
  const a = S[0], z = S[S.length - 1];
  assert.equal(a.stepType.stepTypeKey, "warmup"); assert.equal(a.targetType.workoutTargetTypeKey, "power.between");
  assert.deepEqual([a.targetValueOne, a.targetValueTwo], [65, 190]); assert.equal(a.description, "Einfahren 65→190 W");
  assert.equal(z.stepType.stepTypeKey, "cooldown"); assert.deepEqual([z.targetValueOne, z.targetValueTwo], [65, 190]); assert.equal(z.description, "Ausfahren 190→65 W");
  const erholung = flach(S).filter((s) => s.stepType && s.stepType.stepTypeKey === "recovery");
  assert.ok(erholung.length && erholung.every((s) => s.targetType.workoutTargetTypeKey === "no.target"), "Z1-Pausen zwischen den Blöcken bleiben ohne Ziel");
});

test("rampen-1.0: lockere Einheit (Z1 dann Z2): 6:45 Einfahren (7,5 %), Rest Z1, Hauptteil, 6:45 Ausfahren; Dauer bleibt gleich", () => {
  const { e, S } = wo("rad_locker", 90);
  assert.equal(S.length, 4); assert.equal(sek(S), e.dauer * 60);
  assert.deepEqual(S.map((s) => s.stepType.stepTypeKey), ["warmup", "recovery", "interval", "cooldown"]);
  assert.equal(S[0].endConditionValue, 405); assert.equal(S[3].endConditionValue, 405);
  assert.match(S[0].description, /^Einfahren /); assert.match(S[3].description, /^Ausfahren /);
  const kurz = wo("rad_locker", 10);
  assert.equal(kurz.S.length, 1, "sehr kurze Einheit (nur Z1) bleibt unverändert");
});

test("rampen-1.0 V66.rampenFolge: Einheit aus einem einzigen lockeren Abschnitt bekommt vorn und hinten je 7,5 % (5–10 min)", () => {
  const F = V66.rampenFolge([{ key: "z2", s: 5400 }]);
  assert.deepEqual(F.map((x) => [x.key, x.s, x.ramp || null]), [["z2", 405, "ein"], ["z2", 4590, null], ["z2", 405, "aus"]]);
  assert.equal(F.reduce((a, x) => a + x.s, 0), 5400);
  assert.equal(V66.rampenFolge([{ key: "z2", s: 900 }]).length, 1, "zu kurz: unverändert");
});

test("rampen-1.0 Puls: Einfahren von 76 % bis 100 % des Beginns von Z2 (wie enduco), Ausfahren zurück (Rad und Laufen)", () => {
  const r = wo("rad_locker", 90, "puls"), a = r.S[0], z = r.S[r.S.length - 1];
  assert.equal(a.targetType.workoutTargetTypeKey, "heart.rate.zone"); assert.deepEqual([a.targetValueOne, a.targetValueTwo], [103, 135]); assert.equal(a.description, "Einfahren Puls 103→135");
  assert.deepEqual([z.targetValueOne, z.targetValueTwo], [103, 135]); assert.equal(z.description, "Ausfahren Puls 135→103");
  const l = wo("lauf_locker", 50, "puls");
  assert.equal(l.S[0].description, "Einlaufen Puls 103→135"); assert.equal(l.S[l.S.length - 1].description, "Auslaufen Puls 135→103");
});

test("rampen-1.0 Lauf nach Pace: Einlaufen 1,52× langsamer als der langsame Rand von Z2 bis dorthin; Ziele sind aufsteigende Geschwindigkeiten", () => {
  const { e, S } = wo("lauf_locker", 50);
  assert.equal(sek(S), e.dauer * 60);
  const a = S[0], z = S[S.length - 1];
  assert.equal(a.targetType.workoutTargetTypeKey, "pace.zone"); assert.ok(a.targetValueOne < a.targetValueTwo && z.targetValueOne < z.targetValueTwo);
  assert.deepEqual([a.targetValueOne, a.targetValueTwo], [z.targetValueOne, z.targetValueTwo], "Auslaufen durchläuft denselben Bereich");
  assert.equal(a.targetValueTwo, Math.round((1000 / 400) * 1000) / 1000, "Ende der Rampe = langsamer Rand von Z2");
  assert.match(a.description, /^Einlaufen 10:08→6:40 \/km$/); assert.match(z.description, /^Auslaufen 6:40→10:08 \/km$/);
});

test("rampen-1.0 RPE und ohne Zonenprofil: Rampe nur im Text, kein Ziel, nichts geraten", () => {
  const r = wo("lauf_locker", 50, "rpe");
  assert.equal(r.S[0].targetType.workoutTargetTypeKey, "no.target"); assert.match(r.S[0].description, /^Einlaufen langsam steigern: RPE 1–2$/);
  const o = wo("rad_tempo", 75, undefined, null);
  assert.equal(o.S[0].stepType.stepTypeKey, "warmup"); assert.equal(o.S[0].targetType.workoutTargetTypeKey, "no.target");
});

test("rampen-1.0 V66.rampenFolge: langer lockerer Anfang und langes Ende werden geteilt, Wiederholungsgruppen und harte Abschnitte bleiben", () => {
  const F = V66.rampenFolge([{ key: "z1", s: 1800 }, { key: "z3", s: 600 }, { key: "z1", s: 1200 }]);
  assert.deepEqual(F.map((x) => [x.key, x.s, x.ramp || null]), [["z1", 300, "ein"], ["z1", 1500, null], ["z3", 600, null], ["z1", 900, null], ["z1", 300, "aus"]]);
  const G = V66.rampenFolge([{ wdh: 3, teile: [{ key: "z3", s: 300 }, { key: "pause", s: 60 }] }]);
  assert.ok(!G[0].ramp && G.length === 1, "Gruppe ohne Rampe");
  const H = V66.rampenFolge([{ key: "z3", s: 600 }, { key: "z1", s: 300 }]);
  assert.ok(!H[0].ramp && H[1].ramp === "aus", "Start mit hartem Abschnitt: keine Einfahr-Rampe erfunden");
});
