/* V9.1.1 anpassen-automatisch-1.0 (Vorbild Enduco, Silas 22.11.2026): ändert sich die Verfügbarkeit eines Tages, passt sich eine festgehaltene
   (bearbeitete) Woche gleich an (V66UI.vfFolgen = «Woche anpassen» ohne zweiten Knopf). Szenarien mit dem Simulator (erfundene Daten). */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");

const START = "2026-11-30", W3 = "2026-12-14";
const KRAFT = [{ id: "pe-kraft", aktiv: true, modus: "auto", tage: [1, 2, 3, 5, 6, 7], dauer: 60, v: "planeinstellungen-1.0" },
  { id: "pe-lang", rad: [6], lauf: [7], v: "planeinstellungen-1.0" }];
const sportMin = (L) => (L || []).filter((e) => ["rad", "lauf", "schwimm"].includes(e.sport)).reduce((s, e) => s + (e.dauer || 0), 0);
const vorlauf = async () => { const sim = simulator({ start: START, einstellungen: KRAFT }); await sim.tage(START, 14); return sim; };

test("festgehaltene Woche: weniger Zeit an einem Tag verschiebt oder kürzt gleich, mit Meldung", async () => {
  const sim = await vorlauf(), doD = addDays(W3, 3), saD = addDays(W3, 5);
  let vor = null, R = null, nach = null;
  await sim.tage(W3, 7, {
    vorher: async (d) => {
      if (d !== addDays(W3, 1)) return;
      assert.equal(await sim.aendern(W3, { art: "sperren", date: saD }), null);             // erste Änderung: die Woche ist festgehalten
      vor = sportMin(sim.plan(doD).einheiten);
      assert.ok(vor > 30, "Donnerstag hat vor der Änderung mehr als 30 min: " + vor);
      assert.equal(await sim.verfuegbarkeit({ date: doD }, { min: 30, sport: null }), null);
      assert.equal(sportMin(sim.plan(doD).einheiten), vor, "festgehalten: ohne «Anpassen» bleibt die Woche, wie sie ist (bisheriges Verhalten)");
      R = await sim.win.V66UI.vfFolgen(doD); sim.S.neu();
      nach = sportMin(sim.plan(doD).einheiten);
    },
  });
  assert.equal(R.f, null); assert.equal(R.angepasst, true);
  assert.ok(R.meldungen.length >= 1, "es wird gemeldet, was sich geändert hat");
  assert.ok(nach <= 30, `Donnerstag passt jetzt zu 30 min: ${nach}`);
  assert.ok(sim.plan(saD).t.gesperrt, "gesperrter Samstag bleibt gesperrt");
});

test("festgehaltene Woche: mehr Zeit ändert nichts und meldet es nicht als Fehler", async () => {
  const sim = await vorlauf(), doD = addDays(W3, 3);
  let R = null, vor = null, nach = null;
  await sim.tage(W3, 7, {
    vorher: async (d) => {
      if (d !== addDays(W3, 1)) return;
      assert.equal(await sim.aendern(W3, { art: "sperren", date: addDays(W3, 5) }), null);
      vor = JSON.stringify(sim.plan(doD).einheiten.map((e) => [e.titel, e.dauer]));
      assert.equal(await sim.verfuegbarkeit({ date: doD }, { min: 600, sport: null }), null);
      R = await sim.win.V66UI.vfFolgen(doD); sim.S.neu();
      nach = JSON.stringify(sim.plan(doD).einheiten.map((e) => [e.titel, e.dauer]));
    },
  });
  assert.equal(R.f, null); assert.equal(R.angepasst, true); assert.equal(JSON.stringify(R.meldungen), "[]");
  assert.equal(nach, vor, "mehr Zeit: die Wochenlast bleibt, wie sie im Plan steht");
});

test("Woche, die der Verfügbarkeit von selbst folgt, und vergangene Tage brauchen kein «Anpassen»", async () => {
  const sim = await vorlauf(), naechste = addDays(W3, 7), doN = addDays(naechste, 3);
  let R = null, R2 = null;
  await sim.tage(W3, 3, {
    vorher: async (d) => {
      if (d !== addDays(W3, 1)) return;
      assert.equal(await sim.verfuegbarkeit({ date: doN }, { min: 30, sport: null }), null);
      R = await sim.win.V66UI.vfFolgen(doN); sim.S.neu();
      R2 = await sim.win.V66UI.vfFolgen(W3);                                               // Montag der laufenden Woche: vergangen
    },
  });
  const nichts = JSON.stringify({ f: null, angepasst: false, meldungen: [] });        // Objekte des Simulators kommen aus einem anderen Kontext: als Text vergleichen
  assert.equal(JSON.stringify(R), nichts);
  assert.equal(JSON.stringify(R2), nichts);
  assert.ok(sportMin(sim.plan(doN).einheiten) <= 30, "die nächste Woche folgt der Verfügbarkeit von selbst");
});

// V9.2 umplanen-1.0: «nur teilweise gespeichert» entsteht nicht mehr – jede Änderung (auch Hinzufügen) rechnet die ganze Woche neu und hält sie fest.
// Umgeschrieben statt gelöscht (CHANGELOG V9.2): Einheit hinzufügen → Woche ganz gespeichert; Verfügbarkeit ändern → gleich neu geplant, die eigene Einheit bleibt.
test("V9.2: Einheit hinzufügen hält die Woche ganz fest; Verfügbarkeit ändern plant sie gleich neu, die eigene Einheit bleibt", async () => {
  const sim = simulator({ start: START }); await sim.tage(START, 14);                        // ohne Planeinstellungen: nichts zwingt eine Verteilung
  const W4 = addDays(W3, 7), mi = addDays(W4, 2), don = addDays(W4, 3);
  let ganz = null, R = null, nachMin = null, vorDo = null, mitteEigen = null;
  await sim.tage(W3, 3, {
    vorher: async (d) => {
      if (d !== addDays(W3, 1)) return;
      assert.equal(await sim.aendern(W4, { art: "hinzufuegen", date: mi, einheit: { vorlage: "kraft", dauer: 30 } }), null);
      ganz = !!(sim.win.V64UI.planEintrag(W4) || {}).ganz;
      vorDo = sportMin(sim.plan(don).einheiten);
      assert.ok(vorDo > 30, "Donnerstag hat vor der Änderung mehr als 30 min: " + vorDo);
      assert.equal(await sim.verfuegbarkeit({ date: don }, { min: 30, sport: null }), null);
      R = await sim.win.V66UI.vfFolgen(don); sim.S.neu();
      nachMin = sportMin(sim.plan(don).einheiten);
      mitteEigen = sim.plan(mi).einheiten.some((e) => e.quelle === "eigen");
    },
  });
  assert.equal(ganz, true, "nach dem Hinzufügen ist die Woche ganz gespeichert (umgeplant)");
  assert.equal(R.f, null); assert.equal(R.angepasst, true);
  assert.ok(nachMin <= 30, `Donnerstag passt jetzt zu 30 min: ${nachMin} (vorher ${vorDo})`);
  assert.ok(mitteEigen, "die eigene Einheit am Mittwoch bleibt");
});
