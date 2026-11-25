// Abnahmetests V9.24.3 (js/v66-ui.js, js/v73-ui.js, css/v6.css): Export-Blatt der Einheit-Seite zeigt oben nur «Garmin | Zwift» (zwift-export-2.1).
// Bedienung im Browser: tools/durchklick_zwift.py. Aufruf: node --test tests/test_v9243.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const R = (p) => fs.readFileSync(require.resolve("../" + p), "utf8");

test("zwift-export-2.1: Rad-Einheit hat im Export-Blatt oben die Wahl Garmin | Zwift, darunter nur das Gewählte", () => {
  const e = R("js/v73-ui.js");
  for (const m of ['class="v73-ziel"', 'data-v73z="${k}"', 'data-v73pan="garmin"', 'data-v73pan="zwift"', '[["garmin", "Garmin"], ["zwift", "Zwift"]]', "ov.querySelectorAll(\"[data-v73pan]\")"]) assert.ok(e.includes(m), m);
  assert.ok(!e.includes('<h3 class="abschnitt">Garmin</h3>'), "keine Doppel-Überschrift mehr");
  assert.match(e, /fuss\(zwift \? "" : gKnoepfe\)/, "mit Wahl stehen die Garmin-Knöpfe im Garmin-Teil, sonst wie bisher im Fuss");
});

test("zwift-export-2.1: Voreinstellung – Zwift, wenn Garmin nicht geht oder zuletzt Zwift gewählt war; Wahl wird nur im Gerät gemerkt", () => {
  const e = R("js/v73-ui.js");
  assert.match(e, /const ziel = zwift && \(!kann \|\| gemerkt === "zwift"\) \? "zwift" : "garmin"/);
  assert.ok(e.includes('localStorage.getItem("in-export-ziel")') && e.includes('localStorage.setItem("in-export-ziel", z)'));
});

test("zwift-export-2.1: Zwift-Teil ohne Einrichtung zeigt nur das Einrichten (kein grauer Knopf); mit Einrichtung zwei Knöpfe und zugeklapptes Einrichten", () => {
  const ui = R("js/v66-ui.js");
  assert.ok(ui.includes("bereit ? `<div class=\"row mp-akt\"><button type=\"button\" class=\"btn primary gross\" data-zwsend"));
  assert.ok(ui.includes("Einmal einrichten, dann geht «An Zwift senden»."));
  assert.ok(ui.includes('<details class="mp-zw" ${bereit ? "" : "open"}>'));
  assert.ok(ui.includes("o && o.ohneKopf"), "im Export-Blatt keine eigene Überschrift");
  assert.ok(ui.includes('class="mp-zwf"'), "Felder einheitlich");
});

test("zwift-export-2.1: Stil für die Wahl und die Felder steht in css/v6.css", () => {
  const css = R("css/v6.css");
  for (const m of [".v73-ziel {", '.v73-ziel button[aria-pressed="true"]', ".mp-zwf input {", "font-size: 16px"]) assert.ok(css.includes(m), m);
});
