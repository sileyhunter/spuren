/* V9.3 Auftrag «Woche wie Enduco», Etappe W2 (docs/auftrag-enduco-woche.md): woche-look-1.0, kugel-1.0.
   Kugel-Streifen aus den Zonen, Zonenfarben und Farben der Woche wie gemessen, Mini-Balken-Skala, Zahl am Tageskopf, Zeile einer Einheit,
   Zustandszeichen, freie Tage. Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const V93 = require("../js/v93.js");
const V64 = require("../js/v64.js");
const CSS = fs.readFileSync(path.join(__dirname, "..", "css", "v6.css"), "utf8");
const V6SRC = fs.readFileSync(path.join(__dirname, "..", "js", "v6.js"), "utf8");

test("Versionen W2", () => {
  assert.deepEqual(V93.VERSIONS, { look: "woche-look-1.0", kugel: "kugel-1.0" });
});

test("Kugel: Einfahren, Auslaufen und Pausen zählen nicht – Intervalle allein ergeben eine einfarbige Kugel", () => {
  const S = V93.kugel([["z2", 15], ["vo2", 4], ["pause", 3], ["vo2", 4], ["pause", 3], ["z2", 10]], V64.FARBE);
  assert.deepEqual(S, [{ zone: "vo2", anteil: 1 }]);
});

test("Kugel: ein Streifen je Zone des Hauptteils, links die höchste, Breite = Zeitanteil, mindestens 20 %", () => {
  const S = V93.kugel([["z1", 10], ["z3", 20], ["vo2", 5], ["z2", 10]], V64.FARBE);
  assert.deepEqual(S.map((x) => x.zone), ["vo2", "z3"], "Einfahren (Z1) und Auslaufen (Z2) weg, VO2max links");
  assert.equal(S[0].anteil, 0.2); assert.equal(S[1].anteil, 0.8);
  const K = V93.kugel([["z2", 2], ["z3", 40], ["z3o", 1], ["vo2", 1], ["z2", 2]], V64.FARBE);
  assert.ok(K.every((x) => x.anteil >= 0.2), "kleine Anteile werden auf 20 % gehoben: " + JSON.stringify(K));
  assert.ok(Math.abs(K.reduce((s, x) => s + x.anteil, 0) - 1) < 0.01, "zusammen 100 %");
  assert.deepEqual(K.map((x) => x.zone), ["vo2", "sweet", "z3"], "Reihenfolge rot · gelb · grün · türkis · cyan · hellblau · blau · lila");
});

test("Kugel: eine lockere Einheit ist einfarbig, ohne Teile leer, höchstens vier Streifen", () => {
  assert.deepEqual(V93.kugel([["z2", 60]], V64.FARBE), [{ zone: "z2", anteil: 1 }]);
  assert.deepEqual(V93.kugel([], V64.FARBE), []);
  assert.deepEqual(V93.kugel([["pause", 5]], V64.FARBE), [{ zone: "pause", anteil: 1 }], "nur Pause: die Zone des längsten Teils");
  const viel = V93.kugel([["z1", 5], ["z2", 5], ["renntempo", 5], ["z3", 5], ["z3o", 5], ["css", 5], ["vo2", 5], ["z1", 5]], V64.FARBE);
  assert.ok(viel.length <= 4, JSON.stringify(viel));
});

test("Kugel-Stil: senkrechte Streifen mit harten Kanten, eine Zone = eine Farbe", () => {
  const f = (z) => ({ vo2: "#f5c347", z3: "#5bbbd5", z2: "#5365f6" }[z]);
  assert.equal(V93.kugelStil([{ zone: "z2", anteil: 1 }], f), "#5365f6");
  assert.equal(V93.kugelStil([{ zone: "vo2", anteil: 0.2 }, { zone: "z3", anteil: 0.8 }], f), "linear-gradient(90deg, #f5c347 0.0% 20.0%, #5bbbd5 20.0% 100.0%)");
  assert.equal(V93.kugelStil([], f), "");
});

test("Zonenfarben und Farben der Woche wie aus dem Screenshot gemessen (CSS-Variablen und Vorgaben in js/v6.js)", () => {
  const Z = { "--zc-z1": "#5445da", "--zc-z2": "#5365f6", "--zc-fatmax": "#82aff6", "--zc-z3": "#5bbbd5", "--zc-sweet": "#88e6e7", "--zc-z4": "#88e1a7", "--zc-z5": "#f5c347", "--zc-neuro": "#d6533c" };
  for (const [k, v] of Object.entries(Z)) assert.ok(CSS.includes(`${k}: ${v};`), `${k} = ${v}`);
  for (const v of Object.values(Z)) assert.ok(V6SRC.includes(`farbe: "${v}"`), `js/v6.js nutzt ${v}`);
  const WK = { "--wk-seite": "#000000", "--wk-panel": "#161617", "--wk-pille": "#27292d", "--wk-griff": "#4d4d4d", "--wk-text2": "#b2b2b2", "--wk-x": "#484b52", "--wk-tl": "#6d70dd",
    "--wk-tl-ber": "#3d3f42", "--wk-band": "#95e39c", "--wk-leer": "#42331a" };
  for (const [k, v] of Object.entries(WK)) assert.ok(CSS.includes(`${k}: ${v};`), `${k} = ${v} (dunkel)`);
  assert.ok(/:root\[data-theme="light"\] \{\s*--wk-seite:/.test(CSS), "helles Thema mit eigenen Werten");
  for (const g of ["#514bdc", "#4f7eef", "#4897c8", "#48a18c", "#4ca869", "#8c723b", "#8c5843", "#8b4260"]) assert.ok(CSS.includes(g), `Verlauf locker · Z3–Z5 mit ${g}`);
});

test("Mini-Balken des Status: Füllung = Status ÷ 2,1, höchstens voll", () => {
  assert.equal(V93.balkenAnteil(1.05), 0.5);
  assert.equal(V93.balkenAnteil(2.1), 1);
  assert.equal(V93.balkenAnteil(3.4), 1);
  assert.equal(V93.balkenAnteil(null), 0);
  assert.equal(V93.balkenAnteil(-1), 0);
});

test("Tageskopf und Zeile einer Einheit: Zahl erst ab zwei Einträgen, Dauer ohne «m» für Minuten, Schätzungen mit ≈", () => {
  assert.equal(V93.anzahl(1), ""); assert.equal(V93.anzahl(0), ""); assert.equal(V93.anzahl(2), "2");
  assert.deepEqual(V93.zeile("1:30 h", 15.34, 101.6), ["1:30 h", "≈ 15,3 km", "≈ 102 TL"]);
  assert.deepEqual(V93.zeile("40 min", null, null, { uhrzeit: "18:00" }), ["18:00", "40 min"]);
  assert.ok(!V93.zeile("45 min", 9, 30).some((x) => /\d+m\b/.test(x)), "nie «45m» (V6.6 Teil 0)");
});

test("Zustandszeichen und freie Tage: gesperrt und von Hand gesetzt bekommen ein Zeichen, Standard keins; Symbol für den freien Tag vorhanden", () => {
  assert.deepEqual(V93.zeichen("gesperrt"), { k: "gesperrt", text: "gesperrt" });
  assert.deepEqual(V93.zeichen("hand"), { k: "hand", text: "von Hand gesetzt" });
  assert.equal(V93.zeichen("standard"), null);
  assert.ok(/kalenderfrei: '<rect/.test(V6SRC), "Kalender-✕ für freie Tage (js/v6.js)");
  assert.ok(/mond: '<path/.test(V6SRC), "Mond für den Ruhetag");
  const UI = fs.readFileSync(path.join(__dirname, "..", "js", "v78-ui.js"), "utf8");
  assert.ok(UI.includes('W.icon("kalenderfrei", 17)'), "Raster: freier Tag = Kalender-✕ ohne Pille");
  assert.ok(UI.includes('k4-r-lock') && UI.includes('" hand"'), "Raster: Schloss in der Pille, Zeichen für «von Hand»");
  assert.ok(UI.includes('k4-hand') && UI.includes('Zeit von Hand gesetzt'), "Liste: gesetzte Zeit in Grau am Tageskopf");
  assert.ok(!/k4-r-kw" data-k4kw/.test(UI), "keine Wochenspalte mehr im Raster (sieben Spalten wie die Vorlage)");
});
