"use strict";
/* V9.26.2 laktat-aendern-1.0: ein Vorschau-Eintrag lässt sich auf der Seite ändern (Zeit, Wert, Notiz), ohne dass ein zweiter Eintrag entsteht. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs");
const ex = fs.readFileSync("js/explorer.js", "utf8"), idx = fs.readFileSync("index.html", "utf8"), sw = fs.readFileSync("sw.js", "utf8");

test("laktat-aendern-1.0: jede Karte eines Vorschau-Eintrags, der nicht bestätigt ist, hat «Zeit oder Wert ändern»", () => {
  assert.match(ex, /vorschau && !best\.has\(p\.id\) \? `<div[^`]*data-lpk=/);
  assert.match(ex, /Zeit oder Wert ändern/);
  assert.match(ex, /querySelectorAll\("\[data-lpk\]"\)[\s\S]{0,200}?laktatDialog\(p, p\.id\)/);
});

test("laktat-aendern-1.0: beim Ändern bleibt die ID, damit der Eintrag ersetzt wird (Seite, Eingang und Einspielen ersetzen gleiche ID)", () => {
  assert.match(ex, /function laktatDialog\(vor, idFix\)/);
  assert.match(ex, /id: idFix \|\| `lp-\$\{ST\.a\.id\}-\$\{Math\.round\(t\)\}`/);
  assert.match(ex, /Inbox\.upsert\("laktat_punkte"/);
});

test("laktat-aendern-1.0: das gespeicherte Fenster (10/15/20 min) ist beim Ändern vorgewählt; das Zeitfeld bleibt h:mm:ss mit Lesung durch AN.zeitLesen", () => {
  assert.match(ex, /vor\.abschnitt\.fenster_s/);
  assert.match(ex, /AN\.zeitLesen\(f\.t\.value, tEnde\)/);
  assert.match(ex, /name="t" value="\$\{hmsL\(ts\)\}"/);
});

test("laktat-aendern-1.0: Knopf mit 44 px Höhe, Cache-Name erneuert", () => {
  assert.match(idx, /\.ex-lp-akt \.btn \{ min-height: 44px; \}/);
  assert.match(sw, /const CACHE = "notebook-v\d+-[a-z0-9-]+-\d{4}-\d{2}-\d{2}";/);
});
