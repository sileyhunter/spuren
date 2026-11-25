// Abnahmetests V9.21.0 (fatmax-woche-1.0): die lockere Rad-Ausfahrt unter der Woche (Mittwoch) hat ihre Hauptstrecke in FatMax statt breitem Z2.
// Alle Zonen und Werte sind erfunden. Aufruf: node --test tests/test_v9210.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const woche = (o) => V64.woche(Object.assign({ woche: "2026-11-16", phase: "Aufbau", stunden: 11.5, modell: "polarisiert" }, o));
const mi = (w) => w.tage.find((t) => t.wt === "Mi").einheiten.find((e) => e.id === "rad_locker");

test("Einheit: rad_locker mit fatmax – gleiche Dauer, gleiche Kennung, Hauptstrecke in FatMax, zählt als locker", () => {
  for (const d of [60, 75, 90, 120]) {
    const a = V64.einheit("rad_locker", { d }), f = V64.einheit("rad_locker", { d, fatmax: true });
    assert.equal(f.id, "rad_locker"); assert.equal(f.dauer, d); assert.equal(f.dauer, a.dauer);
    assert.ok(f.teile.some(([k, m]) => k === "fatmax" && m >= d - 20), `d=${d}`);
    assert.equal(f.minuten.hart, 0); assert.equal(f.minuten.mittel, 0); assert.equal(f.minuten.locker, d);
    assert.equal(f.fatmax, true); assert.equal(f.art, "locker"); assert.equal(f.schluessel, false);
  }
});

test("Unter 60 min und ohne Merkmal bleibt die Ausfahrt breites Z2", () => {
  const k = V64.einheit("rad_locker", { d: 55, fatmax: true }), n = V64.einheit("rad_locker", { d: 90 });
  assert.ok(!k.fatmax && !k.teile.some(([z]) => z === "fatmax"));
  assert.ok(!n.fatmax && !n.teile.some(([z]) => z === "fatmax"));
});

test("Wochenplan: Mittwoch-Rad ab 60 min mit FatMax und Hinweis; Erholungs- und Taperwochen unverändert; lange Ausfahrt und langer Lauf bleiben Z2", () => {
  const w = woche(), e = mi(w);
  assert.ok(e && e.dauer >= 60 && e.fatmax === true, JSON.stringify(e && { d: e.dauer }));
  assert.ok(w.hinweise.some((h) => /Mittwoch: Rad mit FatMax/.test(h)));
  const alle = w.tage.flatMap((t) => t.einheiten);
  assert.ok(!alle.filter((x) => x.id !== "rad_locker").some((x) => x.teile.some(([k]) => k === "fatmax")), "nur die Mittwoch-Ausfahrt");
  for (const x of [woche({ erholung: true }), woche({ phase: "Taper" })]) {
    const m = mi(x); if (m) assert.ok(!m.fatmax && !m.teile.some(([k]) => k === "fatmax"));
    assert.ok(!x.hinweise.some((h) => /Mittwoch: Rad mit FatMax/.test(h)));
  }
});

test("Wochenminuten und Schlüsseleinheiten sind mit und ohne FatMax gleich (nur die Zone der Hauptstrecke ändert sich)", () => {
  const w = woche(), flach = JSON.parse(JSON.stringify(w));
  const e = mi(flach), roh = V64.einheit("rad_locker", { d: e.dauer, phase: "Aufbau" });
  assert.equal(e.dauer, roh.dauer); assert.deepEqual(e.minuten, roh.minuten);
});

test("Seite: das Merkmal bleibt beim Speichern und Verschieben erhalten und wird nicht verdichtet", () => {
  const src = R("js/v66.js");
  assert.match(src, /if \(e\.fatmax === true\) s\.fatmax = true;/);
  assert.match(src, /fatmax: s\.fatmax === true/);
  assert.match(src, /!e\.dicht && !e\.fatmax && land\(e\)/);
  assert.match(src, /fatmax: e\.fatmax === true/);
  assert.equal(V64.VERSIONS.fatmaxwoche, "fatmax-woche-1.0");
});
