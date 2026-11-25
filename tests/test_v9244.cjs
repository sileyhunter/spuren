// Abnahmetests V9.24.4 (js/v66-ui.js, js/v73-ui.js, tools/garmin_senden.py): Knopf «Heute senden» im Export-Blatt der Einheit-Seite (heute-senden-1.0).
// Das Werkzeug (Modus «heute», Tag-Update) prüft tests/test_tools.py; die Bedienung im Browser tools/durchklick_heute.py. Aufruf: node --test tests/test_v9244.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const R = (p) => fs.readFileSync(require.resolve("../" + p), "utf8");
const V66 = require("../js/v66.js");

test("heute-senden-1.0: Auftrag mit Modus «heute» wartet auf das nächste Update (Stand «wartet»), erledigt wird er wie jeder andere", () => {
  const e = { uid: "u1", sport: "rad", art: "bibliothek", quelle: "bibliothek", wid: 5 };
  const A = V66.garminAuftrag("2026-03-05", [e], {}, "heute", "2026-03-05T11:00:00Z");
  assert.equal(A.modus, "heute"); assert.equal(A.id, "gs-2026-03-05"); assert.equal(A.einheiten.length, 1);
  assert.equal(V66.garminStand(e, "2026-03-05", {}, [], Object.assign({ status: "offen" }, A)), "wartet");
  assert.equal(V66.garminStand(e, "2026-03-05", {}, [], Object.assign({ status: "erledigt" }, A)), null);
});

test("heute-senden-1.0: Seite – garminHeute gilt nur für heute und nur bis 22:30; Fenster für morgen bis eine Woche bleibt unverändert", () => {
  const ui = R("js/v66-ui.js");
  assert.ok(ui.includes("const garminHeute = (ds) =>") && ui.includes("ds === heute()") && ui.includes("22 * 60 + 30"));
  assert.ok(ui.includes("M.garminHeute = (ds) => bereit() && garminHeute(ds);") && ui.includes("M.heuteWann = HEUTE_WANN;"));
  assert.ok(ui.includes("const garminFenster = (ds) => ds > heute() && ds <= add(heute(), 7);"), "Fenster unverändert");
  assert.ok(ui.includes("um 13, 15, 17, 19, 21 oder 23 Uhr"));
  assert.equal((ui.match(/a\.modus === "heute" \? `Wird \$\{HEUTE_WANN\} gesendet\.`/g) || []).length, 2, "Tagesblatt: beide Statuszeilen");
});

test("heute-senden-1.0: Export-Blatt – für heute der Knopf «Heute senden» mit Modus «heute», ohne Wahl «Nacht-Update oder Vortag»", () => {
  const e = R("js/v73-ui.js");
  assert.ok(e.includes("const heuteOk = !grund && !!(G.garminHeute && G.garminHeute(ds));"));
  assert.ok(e.includes("const kann = !grund && ((fenster && !zuSpaet) || heuteOk);"));
  assert.ok(e.includes('heuteOk ? (stand === "gesendet" ? "Nochmals heute senden" : "Heute senden")'));
  assert.ok(e.includes('const modus = heuteOk ? "heute" :'));
  assert.ok(e.includes("Für heute geht es jetzt nur noch im Chat"), "nach 22:30 weiter der Hinweis auf den Chat");
  assert.ok(e.includes('a.modus === "heute" ? U66().heuteWann'));
});

test("heute-senden-1.0: Einheit-Seite und Zwift – Garmin ist für heute Voreinstellung (kann), Zwift nur wenn Garmin nicht geht", () => {
  const e = R("js/v73-ui.js");
  assert.match(e, /const ziel = zwift && \(!kann \|\| gemerkt === "zwift"\) \? "zwift" : "garmin"/);
});

test("heute-senden-1.0: Werkzeug und Anleitung – Tag-Update sendet nur Aufträge «heute»", () => {
  const w = R("tools/garmin_senden.py");
  assert.ok(w.includes("def plan(D, jetzt, nur_heute=False):") && w.includes("def heute_filtern(N, jetzt):") && w.includes('"heute_filtern"'));
  const u = R("docs/anleitung/updates.md");
  assert.ok(u.includes("Heute senden") && u.includes("garmin_senden.py plan data.json --heute") && u.includes("heute_filtern"));
  assert.ok(!u.includes("**Nach Garmin wird nichts geschrieben**,\nauch nicht der Schritt «Ampel»"), "alter Satz «nichts geschrieben» ist ersetzt");
});
