/* V9.15.1 (Training und Navigation getrennt): der GPX-Export aus «Training → Route» enthält keine Intervall-Wegpunkte mehr.
 * Nur erfundene Strecken (synthetische Geometrie). Die Seite selbst (Browser) wird über den Quelltext geprüft. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const RT = require("../js/route.js");

const ROOT = path.resolve(__dirname, "..");
const R = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function synth(L) {
  const n = Math.round(L / 10), lon0 = 10.0, lat0 = 10.0, coords = [];
  for (let i = 0; i <= n; i++) { const d = (i * L) / n; coords.push([lon0 + d / (111320 * Math.cos((lat0 * Math.PI) / 180)), lat0 + d * 0.2 / 110540, 400 + d / 25]); }
  const leg = { coords, edges: [{ i0: 0, i1: n, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: {} }], props: { creator: "SYNTHETISCH" } };
  return RT.buildRoute([leg], [coords[0], coords[n]], { sport: "rennrad" });
}

test("gpxExtras liefert keine Wegpunkte mehr (null), speichert den gewählten Vorschlag aber weiter", () => {
  const src = R("js/training-ui.js");
  const fn = src.slice(src.indexOf("function gpxExtras(route)"), src.indexOf("function wantsMapClick()"));
  assert.ok(fn.length > 50, "gpxExtras gefunden");
  assert.ok(/return null;\s*\}\s*$/.test(fn.trim()), "endet mit return null");
  assert.ok(!/\.map\(/.test(fn) && !/Intervall \$\{/.test(fn), "baut keine Wegpunkte mehr");
  assert.ok(/speichern\(TS\.gewaehlt/.test(fn), "Vorschlag wird beim Export weiter gespeichert (Vorschlag vs. Ist)");
});

test("beide GPX-Wege (teilen, in Dateien) holen die Zusatzpunkte nur über gpxExtras", () => {
  const ui = R("js/routen-ui.js");
  assert.equal((ui.match(/window\.TRUI\.gpxExtras\(route, sim\)/g) || []).length, 2);
  assert.equal((ui.match(/RT\.gpx\(route, name, ST\.names, extra\)/g) || []).length, 2);
});

test("GPX mit extra = null: Start/Ziel bleiben Wegpunkte, kein «Intervall»-Wegpunkt", () => {
  const route = synth(5000);
  const g = RT.gpx(route, "Testrunde", ["Start", "Ziel"], null);
  assert.equal((g.match(/<wpt /g) || []).length, 2);
  assert.ok(!/Intervall/.test(g));
  assert.equal((g.match(/<trkpt /g) || []).length, route.lon.length);
});

test("Hinweis im Training-Blatt: nur die Strecke, ohne Training", () => {
  const src = R("js/training-ui.js");
  assert.ok(/nur die Strecke, ohne Training/.test(src));
  assert.ok(!/Intervall-Beginne als Wegpunkte/.test(src));
});
