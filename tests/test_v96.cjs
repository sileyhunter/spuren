/* V9.6 garmin-auto-1.0 (Auftrag W5; Silas 23.11.2026: «bauen, jedoch noch nicht aktivieren»): Planeinstellung «Garmin senden» –
   Aus · Nur Tage mit Häkchen (Standard, wie bisher) · Alle Tage; «Senden ab» am Vortag 20:00–23:30. Simulator mit erfundenem Athleten. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V75 = require("../js/v75.js");

const START = "2026-11-30";
const neu = async () => { const sim = simulator({ start: START }); await sim.tage(START, 7); sim.S.tag(addDays(START, 7), "18:00"); return sim; };
const auftraege = (sim) => (sim.S.inbox.data.garmin_senden || []).slice();

test("Versionen und Regeln", () => {
  assert.equal(V75.VERSIONS.garmin, "garmin-auto-1.0");
  assert.deepEqual(V75.standard().garmin, { modus: "haekchen", ab: "23:00" }, "Standard = Verhalten bis V9.5");
  const e = (x) => Object.assign({ id: "pe-garmin", geaendert: "2026-11-23T10:00:00Z" }, x);
  for (const m of ["aus", "haekchen", "alle"]) assert.equal(V75.pruefen(e({ modus: m })), null);
  assert.match(V75.pruefen(e({ modus: "immer" })), /Automatisch senden/);
  for (const ab of ["19:45", "23:45", "22:10", 2300, "7:00"]) assert.match(V75.pruefen(e({ modus: "alle", ab })), /Senden ab/, String(ab));
  assert.deepEqual(V75.garminZeiten()[0], "20:00"); assert.equal(V75.garminZeiten().at(-1), "23:30"); assert.equal(V75.garminZeiten().length, 15);
  const E = V75.einstellungen([e({ modus: "alle", ab: "22:30" })], [e({ modus: "aus", geaendert: "2026-11-23T11:00:00Z" })]);
  assert.deepEqual(E.garmin, { modus: "aus", ab: "23:00" }, "die neueste Fassung gilt; ohne «ab» 23:00");
});

test("Standard: «Alle Tage» ist aus – die Seite legt keinen Auftrag von selbst an", async () => {
  const sim = await neu();
  assert.equal(JSON.stringify(sim.win.V66UI.garminAuto()), JSON.stringify({ modus: "haekchen", ab: "23:00" }));
  const vor = auftraege(sim).length;
  assert.equal(await sim.win.V66UI.alleTage(), 0);
  assert.equal(auftraege(sim).length, vor);
});

test("«Alle Tage» (erst wenn eingeschaltet): Aufträge «auto» für morgen bis eine Woche voraus, erneuert nur bei geänderter Fassung; «aus» bleibt aus", async () => {
  const sim = await neu(), U = sim.win.V66UI, h = sim.S.heute();
  assert.equal(await sim.win.V75UI.speichern("pe-garmin", { modus: "alle", ab: "22:30" }), null);
  const A = auftraege(sim).filter((a) => a.modus === "auto");
  const tage = A.map((a) => a.date).sort();
  assert.ok(tage.length >= 4, "mehrere Tage mit sendbaren Einheiten: " + tage.join(","));
  assert.ok(tage.every((d) => d > h && d <= addDays(h, 7)), "nur morgen bis eine Woche voraus");
  assert.ok(A.every((a) => (a.einheiten || []).length > 0), "nur Tage mit sendbaren Einheiten");
  assert.equal(await U.alleTage(), 0, "nichts geändert → nichts neu");
  // einen Tag abstellen (Häkchen im Tagesblatt) → bleibt aus
  const d = tage[1], I = sim.S.inbox;
  const x = I.data.garmin_senden.find((a) => a.id === "gs-" + d); x.modus = "aus";
  assert.equal(await U.alleTage(), 0);
  assert.equal(I.data.garmin_senden.find((a) => a.id === "gs-" + d).modus, "aus", "ein abgestellter Tag bleibt aus");
  // Fassung ändert sich (Einheit verschoben) → Auftrag erneuert
  const e1 = sim.plan(tage[0]).einheiten.find((e) => e.sport === "rad" || e.sport === "lauf");
  assert.ok(e1, "erfundener Athlet: Rad oder Laufen am ersten Tag");
  {
    const vorher = JSON.stringify(I.data.garmin_senden.find((a) => a.id === "gs-" + tage[0]).einheiten.map((u) => u.fassung));
    assert.equal(await sim.aendern(sim.S.montag(tage[0]), { art: "dauer", date: tage[0], uid: e1.uid, dauer: Math.max(30, e1.dauer - 10) }), null);
    const nachher = JSON.stringify(I.data.garmin_senden.find((a) => a.id === "gs-" + tage[0]).einheiten.map((u) => u.fassung));
    assert.notEqual(nachher, vorher, "geänderte Einheit → neue Fassung im Auftrag");
  }
});

test("«Aus»: keine neuen Aufträge, das Tagesblatt sagt es", async () => {
  const sim = await neu();
  assert.equal(await sim.win.V75UI.speichern("pe-garmin", { modus: "aus" }), null);
  assert.equal(await sim.win.V66UI.alleTage(), 0);
  assert.equal(sim.win.V66UI.garminAuto().modus, "aus");
  const ui = fs.readFileSync(path.join(__dirname, "..", "js", "v66-ui.js"), "utf8");
  assert.match(ui, /Automatisch senden abgestellt \(Planeinstellungen/);
  assert.match(ui, /Am Vortag um \$\{esc\(GA\.ab\)\} Uhr automatisch senden/, "Uhrzeit aus der Einstellung");
});

test("Demo startet mit «Nur Tage mit Häkchen»", () => {
  const demo = fs.readFileSync(path.join(__dirname, "..", "tools", "make_demo.py"), "utf8");
  assert.doesNotMatch(demo, /pe-garmin/, "die Demo legt keine Garmin-Einstellung an");
});
