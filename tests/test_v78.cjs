/* Abnahmetests V7.8 (Etappe 4, Teil 1): Kalender als Liste mit Raster (kalender-4.0) und Trainingsstatus (trainingsstatus-1.0). Erfundene Werte. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V78 = require("../js/v78.js");

test("trainingsstatus-1.0: Ermüdung ÷ Fitness, Stufen, Veränderung zum Vortag", () => {
  assert.equal(V78.VERSIONS.status, "trainingsstatus-1.0");
  assert.equal(V78.status(87, 84), 0.97);
  assert.equal(V78.status(0.5, 3), null, "ohne Fitness ab 1 keine Zahl");
  assert.equal(V78.status(null, 3), null);
  assert.deepEqual([0.5, 0.8, 1.29, 1.3, 1.5, 2.4].map((s) => V78.stufe(s).k), ["wenig", "ueblich", "ueblich", "hoch", "sehr", "sehr"]);
  assert.equal(V78.stufe(2.4).anteil, 1);
  assert.equal(V78.stufe(null), null);
  assert.deepEqual(V78.delta(87, 87), { d: 0, text: "±0" });
  assert.equal(V78.delta(84, 82).text, "+2");
  assert.equal(V78.delta(0.96, 0.99, 2).text, "−0,03");
  assert.equal(V78.delta(1, null), null);
});

test("kalender-4.0: Wochen der Liste, Raster zwei Wochen oder Monat, Texte wie die Vorlage", () => {
  assert.equal(V78.VERSIONS.kalender, "kalender-4.0");
  assert.equal(V78.montag("2026-11-18"), "2026-11-16");
  assert.equal(V78.montag("2026-11-22"), "2026-11-16");
  assert.deepEqual(V78.wochen("2026-11-18", 1, 2), ["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  const r = V78.raster("2026-11-18", 2);
  assert.deepEqual([r.length, r[0].montag, r[0].tage[0], r[1].tage[6]], [2, "2026-11-16", "2026-11-16", "2026-11-29"]);
  const m = V78.monatsRaster("2026-11-18");
  assert.deepEqual([m.length, m[0].montag, m[m.length - 1].tage[6]], [6, "2026-10-26", "2026-12-06"], "November 2026 berührt sechs Wochen");
  assert.equal(V78.monatsRaster("2027-02-10").length, 4, "Februar 2027 beginnt am Montag: vier Wochen");
  assert.equal(V78.tagText("2026-11-18"), "Mittwoch, 18. Nov.");
  assert.equal(V78.monatText("2026-12-05"), "Dezember 2026");
  assert.equal(V78.bereichText("2026-11-16"), "16.–22. Nov.");
  assert.equal(V78.bereichText("2026-11-30"), "30. Nov. – 6. Dez.");
  assert.equal(V78.wochenTitel("Grundlage", { text: "Belastung 3" }), "Grundlage | Belastung 3");
  assert.equal(V78.wochenTitel(null, null), "Woche");
  assert.equal(V78.zeile(112, { km: 47.64, tl: 101, vollstaendig: true }), "1:52 h · ≈ 47,6 km · TL ≈ 101");
  assert.equal(V78.zeile(45, { km: 0, tl: 30, vollstaendig: false }), "45 min · TL ≈ mind. 30");
  assert.deepEqual(V78.leer({ min: 0, sport: [] }, false), { art: "kein", text: "Kein Training" });
  assert.deepEqual(V78.leer({ min: 165, sport: null }, false), { art: "ruhe", text: "Ruhetag" });
  assert.equal(V78.leer(null, true).art, "frei", "vergangene leere Tage: frei");
});
