/* Abnahmetests V7.8/V7.9 (Etappe 4): Kalender als Liste mit Raster (kalender-4.0), Trainingsstatus (trainingsstatus-1.0), Zyklus (zyklus-1.0) und
   Fitness-Prognose (fitness-prognose-1.0). Erfundene Werte. */
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
  assert.equal(V78.VERSIONS.kalender, "kalender-4.1");
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

test("zyklus-1.0: Bereich ± 7,5 %, Lage, Verteilung wie tid-1.0 und Fokus der Woche", () => {
  assert.equal(V78.VERSIONS.zyklus, "zyklus-1.0");
  assert.deepEqual(V78.bereich(540), [500, 581]);
  assert.equal(V78.bereich(0), null);
  assert.deepEqual([V78.lage(480, [500, 581]), V78.lage(540, [500, 581]), V78.lage(600, [500, 581]), V78.lage(540, null)], ["unter", "im", "ueber", null]);
  const DREI = { z1: "locker", z2: "locker", pause: "locker", z3: "mittel", vo2: "hart" };
  const E = [
    { sport: "rad", minuten: { locker: 50, mittel: 0, hart: 10 }, teile: [["z2", 50], ["vo2", 10]] },
    { sport: "lauf", teile: [["z1", 10], ["z3", 20], ["pause", 5]] },                      // eigene Einheit ohne «minuten»: aus den Abschnitten
    { sport: "schwimm", minuten: { locker: 0, mittel: 0, hart: 0 }, teile: [["z2", 40]] },  // Schwimmen zählt in tid-1.0 nicht
    { sport: "wandern", art: "draussen", teile: [["z2", 240]] },
  ];
  const d = V78.drei(E, DREI);
  assert.deepEqual([d.locker, d.mittel, d.hart, d.summe], [65, 20, 10, 95]);
  assert.equal(Math.round(d.anteil.locker * 100), 68);
  assert.equal(V78.drei([], DREI).anteil, null);
  assert.deepEqual(V78.fokus(E), [["z2", 330], ["z3", 20], ["vo2", 10], ["z1", 10]], "Pausen zählen nicht, gleiche Minuten nach Name");
});

test("fitness-prognose-1.0: Wochenlast aus Stunden × Last pro Stunde, Fitness Tag für Tag wie pmc", () => {
  assert.equal(V78.VERSIONS.prognose, "fitness-prognose-1.0");
  const ba = { schwimm: { tl_h: null }, rad: { tl_h: 60 }, lauf: { tl_h: 70 } };
  assert.deepEqual(V78.wochenLast({ schwimm: 2, rad: 5, lauf: 3 }, ba), { tl: 510, ohne: ["schwimm"] });
  assert.deepEqual(V78.wochenLast({ schwimm: 0, rad: 0, lauf: 0 }, ba), { tl: 0, ohne: [] });
  const P = V78.prognose(50, "2026-11-18", "2026-11-21", () => 92);
  assert.deepEqual(P.map((x) => x.date), ["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
  assert.equal(P[0].f, 50);
  assert.equal(Math.round(P[1].f * 1000) / 1000, 51);                                      // 50 + (92 − 50) ÷ 42
  assert.ok(P[3].f > P[2].f && P[2].f > P[1].f);
  const R = V78.prognose(50, "2026-11-18", "2026-11-19", () => null);
  assert.equal(Math.round(R[1].f * 1000) / 1000, 48.81, "ohne Last sinkt die Fitness");
  assert.deepEqual(V78.prognose(null, "2026-11-18", "2026-11-19", () => 1), []);
  assert.deepEqual(V78.prognose(50, "2026-11-18", "2026-11-17", () => 1), []);
});

test("bearbeiten-1.0: Entwurf je Woche, ↶/↷, Änderungen gegen das Gespeicherte", () => {
  assert.equal(V78.VERSIONS.bearbeiten, "bearbeiten-1.0");
  const gesp = { "2026-11-16": { id: "wo-2026-11-16", n: 1 } };
  let leer = 0;
  const E = V78.entwurf((mo) => gesp[mo] || null, () => leer++);
  assert.equal(E.aktiv(), false);
  assert.equal(E.neu("2026-11-16", { n: 2 }, { art: "x" }), false, "nur im Bearbeiten-Modus");
  E.starten();
  assert.equal(E.hat("2026-11-16"), false);
  assert.deepEqual(E.eintrag("2026-11-16"), gesp["2026-11-16"], "ohne Entwurf das Gespeicherte");
  E.neu("2026-11-16", { n: 2 }, { art: "verschieben" });
  E.neu("2026-11-23", { n: 7 }, { art: "sperren" });
  E.neu("2026-11-16", { n: 3 }, { art: "anpassen" });
  assert.deepEqual([E.eintrag("2026-11-16").n, E.eintrag("2026-11-23").n, E.kannZurueck(), E.kannVor()], [3, 7, true, false]);
  assert.deepEqual(E.aenderungen().map((x) => x.mo), ["2026-11-16", "2026-11-23"]);
  E.zurueck(); E.zurueck();
  assert.deepEqual([E.eintrag("2026-11-16").n, E.eintrag("2026-11-23"), E.kannVor()], [2, null, true], "zurück bis vor die neue Woche");
  assert.deepEqual(E.aenderungen().map((x) => x.mo), ["2026-11-16"], "Woche ohne Eintrag zurück auf null zählt nicht");
  E.vor();
  assert.equal(E.eintrag("2026-11-23").n, 7);
  E.neu("2026-11-16", { n: 9 }, { art: "leeren" });
  assert.equal(E.kannVor(), false, "eine neue Änderung nach ↶ verwirft die Schritte danach");
  assert.deepEqual(E.schritte().map((x) => x.a.art), ["verschieben", "sperren", "leeren"]);
  E.zurueck(); E.zurueck(); E.zurueck();
  assert.deepEqual(E.aenderungen(), [], "ganz zurück = nichts geändert");
  E.beenden();
  assert.deepEqual([E.aktiv(), E.hat("2026-11-16"), E.kannZurueck()], [false, false, false]);
  assert.ok(leer >= 8, "Zwischenspeicher nach jeder Änderung geleert");
});
