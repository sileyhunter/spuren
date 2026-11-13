// Abnahmetests V6.5 (Enduco-Bibliothek auf der Seite, js/v65.js) – nur erfundene Workouts.
//   node --test tests/test_v65.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V65 = require("../js/v65.js");

const B = {
  v: "bib-1.0", stand: "2026-03-01", liste_stand: "2026-03-01",
  texte: { a: "Ganzer Beispieltext A.", b: "Ganzer Beispieltext B." },
  workouts: {
    "1000000001": { wid: "1000000001", titel: "Beispiel VO₂max Intervalle", sport: "rad", erstellt: "2026-01-10T20:00:00.0", termine: ["2026-01-11"],
      versionen: [{ ab: "2026-01-10", text_h: "a", dauer_s: 3600 }, { ab: "2026-01-11", text_h: "a", dauer_s: 4200 }] },
    "1000000002": { wid: "1000000002", titel: "Beispiel Grundlage", sport: "lauf", erstellt: "2026-02-03T20:00:00.0", termine: [],
      versionen: [{ ab: "2026-02-03", kurz: "Nur der erste Satz." }] },
    "1000000003": { wid: "1000000003", titel: "Beispiel Schwimmen", sport: "schwimm", erstellt: "2026-02-20T20:00:00.0", termine: ["2026-02-21"],
      versionen: [{ ab: "2026-02-20", text_h: "b", distanz_m: 1500, steps: [
        { type: "warmup", description: "Einschwimmen | Recovery | 2:40min/100m", end_condition: "distance", end_condition_value: 200 },
        { type: "repeat", repeat_count: 3, end_condition: "iterations", end_condition_value: 3, steps: [
          { type: "other", description: "½Lanes | Beispielübung | Endurance | 2:50min/100m | Finish Lane: Recovery", end_condition: "distance", end_condition_value: 50, equipment_type: "fins" },
          { type: "rest", description: "Break: 10s", end_condition: "fixed.rest", end_condition_value: 10 }] },
        { type: "repeat", repeat_count: 4, steps: [{ type: "other", description: "2Lanes | Grundlagenausdauer | Endurance | 2:20min/100m", end_condition: "distance", end_condition_value: 100 }] }] }] },
  },
};
const ACTS = [
  { id: "g1", date: "2026-01-11", sport: "rad", wk: { name: "Beispiel VO2max Intervalle", ist_s: 4100 } },
  { id: "g2", date: "2026-02-05", sport: "lauf", wk: { name: "Beispiel Grundlage" } },
  { id: "g3", date: "2026-03-30", sport: "lauf", wk: { name: "Beispiel Grundlage" } },
  { id: "g4", date: "2026-02-22", sport: "schwimm", wk: { name: "Beispiel Schwimmen" } },
];

test("Bibliothek: Einträge neueste zuerst, Datum = Termin oder Export, Text voll oder nur erster Satz, gelaufen nach Titel und Fenster", () => {
  const E = V65.eintraege(B, ACTS);
  assert.deepEqual(E.map((e) => e.wid), ["1000000003", "1000000002", "1000000001"]);
  const [s, l, r] = E;
  assert.equal(r.datum, "2026-01-11"); assert.equal(r.datumArt, "Termin"); assert.equal(r.versionen, 2); assert.equal(r.dauer_s, 4200, "neueste Fassung");
  assert.deepEqual(r.gelaufen.map((a) => a.id), ["g1"], "VO₂ und VO2 gelten als gleicher Titel");
  assert.equal(l.datum, "2026-02-03"); assert.equal(l.datumArt, "exportiert"); assert.equal(l.textVoll, false); assert.equal(l.text, "Nur der erste Satz.");
  assert.deepEqual(l.gelaufen.map((a) => a.id), ["g2"], "ohne Termin: nur bis 14 Tage nach dem Export");
  assert.deepEqual(s.gelaufen.map((a) => a.id), [], "mit Termin: nur am Termin");
  const st = V65.stand(B, E);
  assert.deepEqual([st.n, st.mitSchritten, st.mitTermin, st.versionen, st.gelaufen, st.seit], [3, 1, 2, 4, 2, "2026-01-10"]);
});

test("Bibliothek: Filter nach Sportart, Suche in Titel und Text, Stufe laut Titel", () => {
  const E = V65.eintraege(B, ACTS);
  assert.deepEqual(V65.filtern(E, { sport: "lauf" }).map((e) => e.wid), ["1000000002"]);
  assert.deepEqual(V65.filtern(E, { suche: "beispieltext b" }).map((e) => e.wid), ["1000000003"]);
  assert.deepEqual(V65.filtern(E, { stufe: "alles" }).map((e) => e.wid), ["1000000001"]);
  assert.equal(V65.stufe(E[1]).stufe, "locker"); assert.equal(V65.stufe({ titel: "Training" }).stufe, "offen");
});

test("Schwimmübungen: Name aus «Bahnen | Name | Bereich | Pace», Wiederholungen und Meter, Hilfsmittel, Serien getrennt", () => {
  const U = V65.uebungen(V65.eintraege(B, ACTS));
  const u = U.find((x) => x.name === "Beispielübung");
  assert.equal(u.art, "Übung"); assert.equal(u.workouts, 1); assert.equal(u.wiederholungen, 3); assert.equal(u.meter, 150);
  assert.deepEqual(u.hilfsmittel, ["fins"]); assert.deepEqual(u.bereiche, ["Endurance"]); assert.equal(u.zuletzt, "2026-02-21");
  const g = U.find((x) => x.name === "Grundlagenausdauer");
  assert.equal(g.art, "Serie"); assert.equal(g.meter, 400);
  assert.equal(U[0].art, "Übung", "Übungen zuerst");
  assert.ok(!U.some((x) => /break/i.test(x.name)), "Pausen sind keine Übung");
  assert.equal(V65.schrittText("Break: 10s"), null);
});

test("Über die Monate: Stunden nur mit bekannter Dauer, Stufen nach Anzahl, Monat nach Termin sonst Export", () => {
  const E = V65.eintraege(B, ACTS);
  const M = V65.monate(E, null, { bis: "2026-02-28" });
  assert.deepEqual(M.map((m) => m.monat), ["2026-01", "2026-02"]);
  assert.equal(M[0].h.rad, 4200 / 3600); assert.equal(M[0].stufen.alles, 1);
  assert.equal(M[1].n, 2); assert.equal(M[1].ohneDauer, 2, "Lauf ohne Dauer, Schwimmen nur mit Distanz"); assert.equal(M[1].h.lauf, 0);
  assert.equal(V65.monate(E, null, { bis: "2026-01-31" }).length, 1, "nichts nach dem Stichtag");
});
