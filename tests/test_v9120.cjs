/* V9.12.0 Schwimm-Datenseiten (Auftrag Punkt 3.3): schwimmseiten-1.0 / schwimmzonen-1.0.
   CSS-Wert «geschätzt» (zählt für Tempo und Plan, erledigt aber keinen Test und ist in «Meine Entwicklung» nur Vorschau), Tempo-Zonen im Wasser aus dem CSS
   (SW.cssZonen), Puls im Wasser nur als Orientierung (eigener Datenschlüssel, nicht im Zonenprofil), Karte «Test-Einheit». Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const FK = require("../js/formkurve.js");
const SW = require("../js/schwimmen.js");
const L = require("../js/v59-logik.js");
global.window = global.window || {};
window.FK = FK; window.SW = SW; window.V59L = L;
require("../js/v55-schwimmen.js");
const S = window.V55S;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SCHAETZ = { id: "s1", datum: "2030-05-06", t400: 480, t200: 230, becken: 50, geschaetzt: true, validiert: false };      // CSS 125 s
const ECHT = { id: "e1", datum: "2030-06-17", t400: 470, t200: 226, becken: 50, validiert: true };                            // CSS 122 s

test("Versionen", () => {
  assert.equal(SW.VERSIONS.zonen, "schwimmzonen-1.0");
  assert.equal(S.VERSION_ZONEN, "schwimmseiten-1.0");
});

test("SW.cssZonen: fünf lückenlose Zonen als Anteile der CSS-Zeit (115 / 105 / 100 / 96 %), ungültiger CSS → null", () => {
  const Z = SW.cssZonen(125);
  assert.deepEqual(Z.map((z) => z.z), ["Z1", "Z2", "Z3", "Z4", "Z5"]);
  assert.deepEqual(Z.map((z) => [z.von, z.bis]), [[null, 144], [144, 131], [131, 125], [125, 120], [120, null]]);
  for (let i = 1; i < Z.length; i++) assert.equal(Z[i - 1].bis, Z[i].von, "lückenlos");
  assert.equal(Z[3].name, "Schwelle (CSS)");
  assert.equal(SW.cssZonen(null), null); assert.equal(SW.cssZonen(20), null); assert.equal(SW.cssZonen(400), null); assert.equal(SW.cssZonen(NaN), null);
});

test("SW.zoneText: langsamer als / von–bis / schneller als", () => {
  const Z = SW.cssZonen(125);
  assert.equal(SW.zoneText(Z[0]), "langsamer als 2:24");
  assert.equal(SW.zoneText(Z[1]), "2:11–2:24");
  assert.equal(SW.zoneText(Z[4]), "schneller als 2:00");
  assert.equal(SW.zoneText(null), "");
});

test("V.cssAktuell: jüngster Test mit beiden Zeiten; Schätzung gilt, bis ein echter Test kommt", () => {
  assert.equal(S.cssAktuell([]), null);
  assert.equal(S.cssAktuell([{ id: "x", datum: "2030-04-01", t400: 480 }]), null, "ohne 200-m-Zeit kein CSS");
  assert.deepEqual(S.cssAktuell([SCHAETZ]), { s: 125, datum: "2030-05-06", geschaetzt: true, vorschau: false });
  const a = S.cssAktuell([ECHT, SCHAETZ]);
  assert.equal(a.s, 122); assert.equal(a.geschaetzt, false); assert.equal(a.datum, "2030-06-17");
  assert.equal(S.cssAktuell([{ ...ECHT, validiert: false }]).vorschau, true);
});

test("Schätzung: erledigt keinen Test im Testkalender, ein echter Test schon (4 Tage Toleranz)", () => {
  const kal = [{ kind: "css", date: "2030-05-04", note: "Ausgangswert" }];
  assert.equal(L.testsMitStatus(kal, [], [SCHAETZ])[0].done, false);
  assert.equal(L.testsMitStatus(kal, [], [{ ...ECHT, datum: "2030-05-05" }])[0].done, true);
  const plan = L.cssPlan([{ kind: "css", date: "2030-05-04" }, { kind: "css", date: "2030-07-09", note: "Kontrolltest" }], [SCHAETZ], "2030-05-06");
  assert.equal(plan.naechster.date, "2030-07-09", "der Ausgangswert bleibt offen, der nächste ist der im Januar");
});

test("«Meine Entwicklung»: geschätzter Punkt ist nur Vorschau, auch ohne validiert:false", () => {
  const P = FK.entwicklungPunkte({ css_tests: [{ id: "g", datum: "2030-05-06", t400: 480, t200: 230, geschaetzt: true }, ECHT] }, "css");
  assert.deepEqual(P.map((p) => [p.v, p.q.status]), [[125, "vorschau"], [122, "bestätigt"]]);
});

test("zonenHTML mit Schätzung: ≈, Pille «geschätzt», Tempo-Zonen, Puls-Orientierung mit Stand und Hinweis", () => {
  const hf = [{ z: "Z1", von: null, bis: 125 }, { z: "Z2", von: 125, bis: 140 }, { z: "Z3", von: 140, bis: 152 }, { z: "Z4", von: 152, bis: 160 }, { z: "Z5", von: 160, bis: null }];
  const h = S.zonenHTML({ css: S.cssAktuell([SCHAETZ]), hf, hinweis: "Nur Orientierung <b>", stand: "2030-05-06", esc, dateCH: (x) => x });
  assert.match(h, /CSS <b>≈ 2:05 \/100 m<\/b>/); assert.match(h, /geschätzt/); assert.match(h, /schwimmzonen-1\.0/);
  assert.match(h, /Z2<\/th><td>Grundlage<\/td><td>2:11–2:24<\/td>/); assert.match(h, /schneller als 2:00/);
  assert.match(h, /Puls im Wasser/); assert.match(h, /125–140 bpm/); assert.match(h, /unter 125 bpm/); assert.match(h, /ab 160 bpm/);
  assert.doesNotMatch(h, /bis 201/, "kein Maximalpuls bei Schwimmzonen");
  assert.match(h, /Nur Orientierung &lt;b&gt;/, "Hinweis wird maskiert");
  assert.match(h, /Stand 2030-05-06/);
});

test("zonenHTML: echter Test → «bestätigt» ohne ≈; ohne Pulszonen Hinweis; ohne CSS keine Zonen", () => {
  const h = S.zonenHTML({ css: S.cssAktuell([ECHT, SCHAETZ]), hf: null, esc, dateCH: (x) => x });
  assert.match(h, /CSS <b>2:02 \/100 m<\/b>/); assert.doesNotMatch(h, /≈/); assert.match(h, /bestätigt/);
  assert.match(h, /Pulszonen fürs Schwimmen sind noch nicht festgelegt/);
  const n = S.zonenHTML({ css: null, hf: null, esc });
  assert.match(n, /Noch kein CSS/); assert.doesNotMatch(n, /Tempo pro 100 m/);
});

test("testHTML: nächster Test, offener Test aus der Vergangenheit, kein Test offen; Ablauf und Workout-Name", () => {
  const wtag = (x) => `Tag ${x}`;
  const a = S.testHTML({ naechster: { date: "2030-07-09", note: "Kontrolltest" }, verpasst: { date: "2030-05-02", note: "Ausgangswert" }, esc, wtag });
  assert.match(a, /Nächster CSS-Test: <b>Tag 2030-07-09<\/b> – Kontrolltest/); assert.match(a, /Offen aus der Vergangenheit: Tag 2030-05-02 \(Ausgangswert\)/);
  assert.match(a, /<b>400 m<\/b> maximal/); assert.match(a, /<b>200 m<\/b> maximal/); assert.match(a, /IN · CSS-Test 400\/200/);
  const b = S.testHTML({ naechster: null, verpasst: null, esc, wtag });
  assert.match(b, /Kein CSS-Test im Testkalender offen/); assert.doesNotMatch(b, /Offen aus der Vergangenheit/);
});

test("V.zonen (Seite): füllt beide Karten aus D.css_tests, D.schwimm_puls und D.tests", () => {
  const D = { css_tests: [SCHAETZ], tests: [{ kind: "css", date: "2030-05-02", note: "Ausgangswert" }, { kind: "css", date: "2030-07-09", note: "Kontrolltest" }],
    schwimm_puls: { v: "schwimmzonen-1.0", stand: "2030-05-06", zonen: [{ z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: null }], hinweis: "Orientierung" } };
  const el = { "sw-zonen": { innerHTML: "" }, "sw-test": { innerHTML: "" } };
  window.V5UI = { merged: (k) => D[k] || [] };
  global.document = { getElementById: (id) => el[id] || null };
  const heute = new Date(2030, 4, 6);
  const C = { D, esc, dateCH: (x) => x, today: heute, iso: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` };
  S.zonen(C);
  assert.match(el["sw-zonen"].innerHTML, /≈ 2:05/); assert.match(el["sw-zonen"].innerHTML, /unter 130 bpm/);
  assert.match(el["sw-test"].innerHTML, /9\.7\.2030/); assert.match(el["sw-test"].innerHTML, /Ausgangswert/);
  delete window.V5UI; delete global.document;
});

test("Schwimm-Puls liegt nicht im Zonenprofil: Intensitätsverteilung kennt für «schwimm» keine Schwellen", () => {
  const Z = [{ id: "z", status: "aktiv", gueltig_ab: "2020-01-01", gueltig_bis: null, skalen: [{ disziplin: "rad", metrik: "puls", zonen: [{ z: "Z2", von: 120, bis: 140 }, { z: "Z3", von: 140, bis: 170 }] }] }];
  assert.equal(FK.pulsGrenzen(Z, "schwimm", "2030-05-06"), null);
});
