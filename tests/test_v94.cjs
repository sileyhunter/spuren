/* V9.4 planen-fluss-1.0 (Auftrag V9 Woche wie Enduco, Etappe W3): «Training planen» Sportart → Intensität → Workout → Dauer; «Training bearbeiten».
   Rechenteil ohne DOM (js/v94.js) und Verdrahtung in den Oberflächen-Dateien (Text). Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const V94 = require("../js/v94.js");
const V66 = require("../js/v66.js");
const lies = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("Version", () => assert.equal(V94.VERSIONS.fluss, "planen-fluss-1.0"));

test("Jede Art der Vorlagen gehört zu genau einer Stufe; Reihenfolge Grundlage → Tempo/Schwelle → VO2max → Test", () => {
  const arten = Object.keys(V66.ARTEN).filter((a) => a !== "draussen");
  for (const a of arten) assert.equal(V94.STUFEN.filter((s) => s.arten.includes(a)).length, 1, a);
  assert.deepEqual(V94.STUFEN.map((s) => s.k), ["grundlage", "tempo", "vo2max", "test"]);
  assert.equal(V94.stufeVon("vo2max"), "vo2max"); assert.equal(V94.stufeVon("lang"), "grundlage"); assert.equal(V94.stufeVon("koppel"), "tempo");
  assert.equal(V94.stufeVon("unbekannt"), "grundlage");
});

test("Stufen je Sportart: nur mit Vorlagen, keine Vorlage geht verloren", () => {
  for (const [sp] of V66.SPORTARTEN) {
    const L = V66.vorlagen(sp), S = V94.stufen(L);
    assert.equal(S.reduce((n, s) => n + s.vorlagen.length, 0), L.length, sp);
    assert.ok(S.every((s) => s.vorlagen.length > 0 && s.min <= s.max), sp);
  }
  assert.deepEqual(V94.stufen(V66.vorlagen("rad")).map((s) => s.k), ["grundlage", "tempo", "vo2max", "test"]);
  assert.deepEqual(V94.stufen(V66.vorlagen("schwimm")).map((s) => s.k), ["grundlage", "tempo", "test"], "Schwimmen ohne VO2max-Vorlage");
  assert.equal(V94.stufen(V66.vorlagen("kraft")).length, 1, "Kraft: eine Stufe → das Blatt überspringt die Intensität");
  assert.ok(!V94.stufen(V66.vorlagen("rad_drinnen")).find((s) => s.k === "tempo").vorlagen.some((v) => v.art === "lang" || v.art === "renntempo"), "drinnen ohne lange Einheiten");
});

test("Minutenachse unter dem Profil", () => {
  assert.deepEqual(V94.achse(75).map((t) => t.min), [0, 15, 30, 45, 60]);
  assert.deepEqual(V94.achse(150).map((t) => t.min), [0, 30, 60, 90, 120]);
  assert.deepEqual(V94.achse(300).map((t) => t.min), [0, 60, 120, 180, 240]);
  assert.equal(V94.achse(60).at(-1).min, 45, "kein Strich ganz am Ende");
  assert.ok(V94.achse(90).every((t) => t.pct >= 0 && t.pct < 100));
  assert.deepEqual(V94.achse(0), []);
});

test("Verdrahtung: Blätter, Namen, Bearbeiten-Modus, Dateilisten", () => {
  const ui = lies("js/v66-ui.js"), e = lies("js/v73-ui.js"), k = lies("js/v78-ui.js"), h = lies("index.html"), sw = lies("sw.js");
  assert.match(ui, /Training planen<\/h2>/); assert.match(ui, /function stufenBlatt\(/); assert.match(ui, /Intensität wählen/);
  assert.match(ui, /data-mpachse/); assert.match(ui, /ok\.classList\.add\("primary"\)/, "Speichern wird weiss, sobald der Regler bewegt wurde");
  assert.doesNotMatch(ui + lies("js/v6-heute.js"), /Training hinzufügen<\/span>|Training hinzufügen<\/button>/);
  assert.match(e, /Training bearbeiten<\/h2>/); assert.match(e, /Zu Indoor ändern/); assert.match(e, /if \(k === "indoor"\) return indoorBlatt\(\)/);
  assert.match(e, /if \(Z\.bearbeiten\)/); assert.match(k, /auf\(ds, uid, true\)/);
  assert.match(h, /<script src="js\/v94\.js"><\/script>/); assert.match(sw, /"js\/v94\.js"/);
});
