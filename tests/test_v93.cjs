/* V9.3 Auftrag «Woche wie Enduco», Etappe W2 (docs/auftrag-enduco-woche.md): woche-look-1.0, kugel-1.0; V9.3.2 woche-look-1.1, kalender-4.2, bearbeiten-1.1.
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
  assert.deepEqual(V93.VERSIONS, { look: "woche-look-1.1", kugel: "kugel-1.0" });
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

/* ---------- V9.3.2 (Silas 22.11., 18 Bilder und Aufnahme 23:06): Bearbeiten-Woche, Griff ziehen, Zyklus-Raster, ✨ mit «Neu» ---------- */
const V78 = require("../js/v78.js");
const UI2 = () => fs.readFileSync(path.join(__dirname, "..", "js", "v78-ui.js"), "utf8");
const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("bearbeiten-1.1: Bearbeiten beginnt mit der Woche, in der nach heute noch Tage folgen – am Sonntag mit der nächsten", () => {
  assert.equal(V78.VERSIONS.bearbeiten, "bearbeiten-1.1");
  const SO = "2030-03-17", MO = "2030-03-11", MO2 = "2030-03-18";                       // erfundene Woche: Montag 11.3. bis Sonntag 17.3.2030
  assert.equal(V78.bearbeitenAb(SO, SO), MO2, "Sonntag → nächste Woche (wie die Vorlage am Sonntagabend)");
  assert.equal(V78.bearbeitenAb(null, SO), MO2, "ohne Wunsch ebenso");
  assert.equal(V78.bearbeitenAb(null, "2030-03-16"), MO, "Samstag: der Sonntag lässt sich noch verschieben");
  assert.equal(V78.bearbeitenAb(null, "2030-03-13"), MO, "Mittwoch: laufende Woche");
  assert.equal(V78.bearbeitenAb("2030-03-04", "2030-03-13"), MO, "vergangene Woche gewünscht → frühestens die laufende");
  assert.equal(V78.bearbeitenAb("2030-03-04", SO), MO2, "… und am Sonntag die nächste");
  assert.equal(V78.bearbeitenAb("2030-03-27", "2030-03-13"), "2030-03-25", "eine spätere Woche bleibt, wie gewählt");
  const UI = UI2();
  assert.ok(UI.includes("V78().bearbeitenAb(mo || ST.sel || h, h)"), "N.bearbeiten nutzt die Regel");
  assert.ok(!UI.includes("data-k4tlock"), "kein Schloss mehr im Tageskopf – «Tag sperren» steht im Tagesblatt hinter «…»");
  assert.ok(UI.includes('${gesp ? ` <span class="k4-tlk"'), "ein gesperrter Tag zeigt das Schloss am Namen, auch im Bearbeiten");
});

test("kalender-4.2/4.3: Griff ziehen – nach unten mehr Wochen (1 → 2 → Monat), nach oben weniger; Liste und Zyklus teilen den Zustand", () => {
  assert.equal(V78.VERSIONS.kalender, "kalender-4.3");                         // V9.5.1: fliessend statt in Stufen
  const UI = UI2();
  assert.ok(UI.includes('const ZEILEN = [1, 2, "monat"]'), "drei Stellungen zum Einrasten");
  assert.ok(/addEventListener\("pointerdown"/.test(UI) && /addEventListener\("pointermove"/.test(UI) && !UI.includes("Math.trunc(dy / 44)"), "Ziehen mit dem Zeiger, keine 44-px-Stufen mehr");
  assert.ok(UI.includes("zeigen(Z.h0 + dy)") && UI.includes("V78().ziehFenster(") && UI.includes("V78().ziehZiel("), "das Raster folgt dem Finger und rastet beim Loslassen ein");
  assert.ok(/\.k4-auf\.zieht \{ overflow: hidden;/.test(CSS), "beim Ziehen wird der Ausschnitt beschnitten");
  assert.ok(UI.includes("ST.zeilen === 1 ? 1 : 2"), "eine oder zwei Wochen im Raster");
  assert.ok(UI.includes("function zeilenSetzen(z) { ST.zeilen = z; ST.offen = z === \"monat\"; ZS.offen = ST.offen; }"), "ein Zustand für Liste und Zyklus");
  assert.ok(UI.includes("const rasterNeu = () =>"), "Zyklus: der Griff zeichnet nur das Raster neu, die Karten bleiben");
  assert.ok(/\.kal-v7\.k4 \.k4-griff \{ touch-action: none;/.test(CSS), "der Finger zieht den Griff, die Seite scrollt dabei nicht");
  assert.ok(HTML.includes(`if (this.ansicht === "monat") this.ansicht = "liste"; const mb = document.querySelector('[data-kalans="monat"]'); if (mb) mb.hidden = true;`),
    "nur Zyklus und Liste als Knöpfe – den Monat zeigt der Griff");
});

test("woche-look-1.1: Zyklus-Raster wie die Vorlage – Zahlen mit Kreis, dunkle Pille ohne Umriss, kein Panel im Panel; «Heute» umrandet, ohne KW-Zeile", () => {
  const UI = UI2();
  assert.ok(UI.includes('data-k4zt="${ds}"') && UI.includes('${ds === selTag ? " sel" : ""}'), "Tag im Zyklus-Raster antippbar, gewählter Tag mit Kreis");
  assert.ok(UI.includes('class="k4-zgp'), "Zonen-Gruppen der Wochenkarte mit eigener Klasse");
  assert.ok(!/^\.k4-zg \{ display: flex; gap: 2px; padding: 2px;/m.test(CSS) && /^\.k4-zgp \{/m.test(CSS), "k4-zg (Zyklus-Raster) bekommt kein Panel der Zonen-Gruppen mehr");
  assert.ok(/\.kal-v7\.k4 \.k4-zg \.k4-zw, \.kal-v7\.k4 \.k4-zg \.k4-zw\.sel \{[^}]*border: 0;[^}]*background: var\(--wk-pille\)/.test(CSS), "Pille dunkel, ohne Umriss – auch die gewählte Woche");
  assert.ok(/\.kal-v7\.k4 \.kal-heute \{ background: transparent; border: 1\.5px solid var\(--wk-text\)/.test(CSS), "«Heute» umrandet");
  assert.ok(HTML.includes('document.getElementById("cal-sub").hidden = !!(liste || zyklus);'), "keine Zeile «KW …» in Liste und Zyklus");
  assert.ok(HTML.includes('document.getElementById("kal-wbar").hidden = !(liste || zyklus);') && UI.includes("wbarZeichnen(ZS.mo)"), "Zyklus: «Phase | Wochenart · Zeitraum» über den Karten");
  assert.ok(!/\.k4-r-t\.hand \.k4-r-d::after/.test(CSS), "keine Striche «von Hand» unter den Tageszahlen");
});

test("woche-look-1.1: absolvierte Zeile wie die geplanten, Trenner als Leiste, ✨ «Anpassen oder neu berechnen?» mit «Neu»", () => {
  const UI = UI2();
  assert.ok(UI.includes('<small class="k4-ez">${[W.dauerText(sek(a)), km, tl]') && UI.includes('<span class="sr-only">absolviert'), "Zahlen mit Abstand, «absolviert» und «Passt zu» nur für Screenreader");
  assert.ok(UI.includes('k4-trenner k4-trenner2"><i aria-hidden="true">↓</i><span>Nächste Woche</span>'), "Trenner «Nächste Woche» mit Pfeilen");
  assert.ok(UI.includes("Anpassen oder neu berechnen?") && UI.includes('data-k4neu>Neu') && UI.includes('aktionen: [{ art: "neuberechnen" }], ohneUmplanen: true'),
    "✨: «Neu» rechnet die Woche neu (alles-neu-1.0 Stufe 2), «Anpassen» plant um (umplanen)");
  assert.ok(/--wk-neu: #f39b3b;/.test(CSS.slice(0, CSS.indexOf("V7 navigation-7.0"))), "Orange für «Neu» als Variable vor dem V7-Abschnitt");
  assert.ok(/\.k4-anp-f \.k4-neu \{ background: var\(--wk-neu\)/.test(CSS));
});

test("kalender-4.3: fliessendes Ziehen – Fenster folgt der Höhe, Monat klappt um die gewählte Woche auf, Loslassen rastet ein", () => {
  // erfundene Kanten in px: Woche 3 von 5 gewählt, je Woche 40 px
  const g = { t1: 80, b1: 120, b2: 160, tM: 0, bM: 200 };
  assert.deepEqual(V78.ziehFenster(g, 10), { top: 80, hoehe: 40 }, "nie kleiner als eine Woche");
  assert.deepEqual(V78.ziehFenster(g, 55), { top: 80, hoehe: 55 }, "zwischen 1 und 2 Wochen: wächst nach unten, Pixel für Pixel");
  assert.deepEqual(V78.ziehFenster(g, 80), { top: 80, hoehe: 80 });
  assert.deepEqual(V78.ziehFenster(g, 140), { top: 40, hoehe: 140 }, "darüber: die Wochen davor klappen gleichmässig auf");
  assert.deepEqual(V78.ziehFenster(g, 999), { top: 0, hoehe: 200 }, "nie mehr als der Monat");
  assert.equal(V78.ziehZiel(g, 52, 0), 1); assert.equal(V78.ziehZiel(g, 70, 0), 2); assert.equal(V78.ziehZiel(g, 150, 0), "monat");
  assert.equal(V78.ziehZiel(g, 52, 0.8), 2, "schneller Wisch nach unten: nächste Stellung");
  assert.equal(V78.ziehZiel(g, 150, -0.8), 2, "schneller Wisch nach oben");
  assert.equal(V78.ziehZiel(g, 40, -0.8), 1, "schon ganz oben");
  // Bereitstehende Wochen: der Monat und die nächste Woche, auch wenn sie im nächsten Monat liegt
  const R = V78.ziehRaster("2030-03-27").map((w) => w.montag);
  assert.equal(R[0], V78.monatsRaster("2030-03-27")[0].montag);
  assert.ok(R.includes(V78.montag("2030-03-27")) && R.includes("2030-04-01"), JSON.stringify(R));
  assert.ok(R.every((m, i) => i === 0 || (Date.parse(m) - Date.parse(R[i - 1])) === 7 * 864e5), "lückenlos");
});
