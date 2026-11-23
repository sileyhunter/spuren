/* V9.9.1 Fehlerbehebung (Prüfung 23.11.2026): das «…» an einer Woche öffnete «Woche bearbeiten» nicht (ReferenceError: W is not defined in
   V66UI.wocheAktionen, seit V9.1). Durchklick-Test im Simulator: das Blatt wird gebaut und enthält alle Aktionen. Erfundener Athlet. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");

const START = "2026-11-30";
const neu = async () => { const sim = simulator({ start: START }); await sim.tage(START, 7); sim.S.tag(addDays(START, 7), "18:00"); return sim; };
const blattFangen = (sim) => {
  const erfasst = [];
  const ov = { querySelector: () => null, querySelectorAll: () => [], dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };
  sim.win.V59.blatt = (id, html) => { erfasst.push({ id, html }); return ov; };
  return erfasst;
};

test("«Woche bearbeiten» (das «…» an der Woche) öffnet sich ohne Fehler und zeigt alle Aktionen", async () => {
  const sim = await neu(), U = sim.win.V66UI, mo = sim.S.montag(sim.S.heute());
  const blatt = blattFangen(sim);
  assert.doesNotThrow(() => U.wocheAktionen(mo, null));
  assert.equal(blatt.length, 1, "genau ein Blatt");
  assert.equal(blatt[0].id, "mp-woche");
  const h = blatt[0].html;
  assert.match(h, /Woche bearbeiten/);
  for (const a of ["anpassen", "neu", "alles", "verwerfen", "leeren"]) assert.ok(h.includes(`data-mpwa="${a}"`), "Aktion " + a);
  assert.ok(h.includes("data-mpwgs"), "Woche an Garmin senden");
  assert.ok(h.includes("<svg") || h.includes("mp-zeile"), "Symbole (W.icon) wurden gebaut");
});

test("auch für die nächste Woche und für eine vergangene Woche (nur lesen)", async () => {
  const sim = await neu(), U = sim.win.V66UI, h0 = sim.S.heute();
  const blatt = blattFangen(sim);
  assert.doesNotThrow(() => U.wocheAktionen(sim.S.montag(addDays(h0, 7)), null));
  assert.doesNotThrow(() => U.wocheAktionen(sim.S.montag(addDays(h0, -14)), null));
  assert.equal(blatt.length, 2);
  assert.match(blatt[1].html, /Vergangene Wochen nur lesen/);
});
