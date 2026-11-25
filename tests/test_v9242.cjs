/* V9.24.2 Metrik, Uhrzeit und Bahnlänge einer Vorschlags-Einheit bleiben nach dem Neuberechnen der Woche stehen (einheit-felder-1.2).
   Silas 25.11.2026: «ich kann Pace, HF und RPE auswählen, die Einheit wird jedoch nicht mit der gewählten Variante angezeigt».
   Simulator (tests/sim, erfundener Athlet), nichts Echtes. Aufruf: node --test tests/test_v9242.cjs */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V66 = require("../js/v66.js");

const START = "2026-11-30", W3 = "2026-12-14";
const tageW = (mo) => Array.from({ length: 7 }, (_, i) => addDays(mo, i));
const neu = async () => { const sim = simulator({ start: START }); await sim.tage(START, 14); return sim; };
const plan = (sim, d) => sim.plan(d).plan;
const E = (sim, mo) => sim.win.V64UI.planEintrag(mo);

/** Erste künftige Einheit der Woche mit Rad oder Laufen (Vorschlag, nicht gesperrt). */
const waehle = (sim, sport) => { for (const d of tageW(W3)) { const e = plan(sim, d).find((x) => x.sport === sport && x.quelle === "vorschlag"); if (e) return { d, e }; } return null; };

test("einheit-felder-1.2: Metrik «Puls» auf einer Vorschlags-Einheit bleibt nach dem Neuberechnen der Woche", async () => {
  const sim = await neu(), U = sim.win.V66UI;
  const w = waehle(sim, "lauf") || waehle(sim, "rad"); assert.ok(w, "eine Vorschlags-Einheit am Rad oder Laufen");
  assert.equal(w.e.metrik, undefined, "vorher keine Wahl");
  assert.equal(await U.aendern(W3, { art: "einheit", date: w.d, uid: w.e.uid, felder: { metrik: "puls" } }), null); sim.S.neu();
  const nachher = plan(sim, w.d).find((x) => x.uid === w.e.uid);
  assert.ok(nachher, "die Einheit steht noch am selben Tag mit derselben Kennung");
  assert.equal(nachher.metrik, "puls", "die Wahl ist nach dem Umplanen noch da");
  assert.equal(V66.metrikVon(nachher), "puls", "Anzeige und Export lesen dieselbe Metrik");
  assert.equal(nachher.quelle, "vorschlag", "die Quelle bleibt Vorschlag (kein Anker)");
});

test("einheit-felder-1.2: Uhrzeit bleibt ebenso stehen", async () => {
  const sim = await neu(), U = sim.win.V66UI;
  const w = waehle(sim, "rad") || waehle(sim, "lauf"); assert.ok(w);
  assert.equal(await U.aendern(W3, { art: "einheit", date: w.d, uid: w.e.uid, felder: { uhrzeit: "06:30" } }), null); sim.S.neu();
  const nachher = plan(sim, w.d).find((x) => x.uid === w.e.uid);
  assert.ok(nachher); assert.equal(nachher.uhrzeit, "06:30");
});

test("einheit-felder-1.2: zurück auf den Standard (Feld weg) lässt die Woche wieder von selbst folgen", async () => {
  const sim = await neu(), U = sim.win.V66UI;
  const w = waehle(sim, "lauf") || waehle(sim, "rad"); assert.ok(w);
  assert.equal(await U.aendern(W3, { art: "einheit", date: w.d, uid: w.e.uid, felder: { metrik: "rpe" } }), null); sim.S.neu();
  assert.equal(plan(sim, w.d).find((x) => x.uid === w.e.uid).metrik, "rpe");
  assert.equal(await U.aendern(W3, { art: "einheit", date: w.d, uid: w.e.uid, felder: { metrik: null } }), null); sim.S.neu();
  const e = E(sim, W3);
  assert.ok(!e || !e.ganz || Object.keys(e.tage || {}).length === 0, "ohne Festlegung und ohne Anker: wieder automatisch (E.tage leer)");
  assert.equal(plan(sim, w.d).find((x) => x.uid === w.e.uid).metrik, undefined);
});

test("einheit-felder-1.2: Version und reine Rechnung – Festlegung zählt als Eigenes, die Woche bleibt gespeichert; ohne sie folgt sie von selbst", () => {
  assert.equal(V66.VERSIONS.felder, "einheit-felder-1.2");
  const MO = "2026-11-16", d = (i) => addDays(MO, i);
  const R = { [d(1)]: [require("../js/v64.js").einheit("lauf_locker", { d: 40 })] };
  const roh = (x) => R[x] || [];
  const ctx = { heute: MO, montag: MO, roh, vorschlag: roh, verf: V66.verfuegbarkeit([]), o: {}, jetzt: "2026-11-16T07:00:00Z" };
  const r0 = V66.aendern(null, { art: "umplanen" }, ctx).eintrag;
  const s0 = r0 && r0.tage && r0.tage[d(1)] && r0.tage[d(1)].einheiten && r0.tage[d(1)].einheiten[0];
  assert.ok(!r0 || !r0.ganz || !s0, "ohne Eigenes: automatisch (nichts gespeichert)");
  const mit = { montag: MO, ganz: true, tage: { [d(1)]: { gesperrt: false, einheiten: [{ uid: "v-1", vorlage: "lauf_locker", dauer: 40, quelle: "vorschlag", metrik: "puls" }] } } };
  const r1 = V66.aendern(mit, { art: "umplanen" }, ctx).eintrag;
  assert.ok(r1 && r1.ganz, "mit Metrik-Wahl bleibt die Woche gespeichert");
  assert.equal(r1.tage[d(1)].einheiten[0].metrik, "puls");
});
