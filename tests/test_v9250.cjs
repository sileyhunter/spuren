// Abnahmetests V9.25.0 (js/v66-ui.js): zwift-auto-1.0 – Rad-Einheiten von heute und morgen gehen von selbst an Intervals.icu, sobald die Seite offen ist.
// Aufruf: node --test tests/test_v9250.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const src = fs.readFileSync(__dirname + "/../js/v66-ui.js", "utf8");

test("zwift-auto-1.0: M.zwiftAuto ist da, nutzt dieselbe Anfrage wie das Senden von Hand und merkt sich die Fassung", () => {
  assert.match(src, /M\.zwiftAuto = async function/);
  assert.match(src, /async function zwiftPost\(L, cfg\)/);
  assert.equal((src.match(/events\/bulk\?upsert=true/g) || []).length, 1, "nur eine Stelle schickt an Intervals.icu");
  const auto = src.slice(src.indexOf("M.zwiftAuto = async"), src.indexOf("async function zwiftSenden"));
  assert.match(auto, /zwiftMerken\(L\)/);
  assert.match(auto, /\[heute\(\), add\(heute\(\), 1\)\]/, "nur heute und morgen");
  assert.match(auto, /art !== "gesendet"/, "nur Neues oder Geändertes");
  assert.match(auto, /cfg\.auto === false/, "abstellbar");
});

test("zwift-auto-1.0: wird bei jedem Anlass der Auftragserneuerung mit aufgerufen (Laden, Änderung)", () => {
  const i = src.indexOf("M.alleTage = async function");
  assert.match(src.slice(i, i + 300), /M\.zwiftAuto\(\)/);
});

test("zwift-auto-1.0: Einrichten hat den Haken, Standard an; Speichern merkt ihn", () => {
  assert.match(src, /data-zwauto \$\{cfg\.auto === false \? "" : "checked"\}/);
  assert.match(src, /auto: !\(box\.querySelector\("\[data-zwauto\]"\)/);
});
