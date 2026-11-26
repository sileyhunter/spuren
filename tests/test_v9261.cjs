// Abnahmetests V9.26.1 (js/analyse.js, js/explorer.js, js/v59.js, index.html): laktat-eingabe-1.0 und blatt-stapel-1.0; Block A (zwei Knöpfe im Explorer) entfernt.
// Aufruf: node --test tests/test_v9261.cjs   (nur synthetische Werte; das Verhalten im Browser prüft tools/durchklick_laktat.py)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
global.window = undefined;
const FK = require("../js/formkurve.js");
globalThis.FK = FK;
const AN = require("../js/analyse.js");
const lies = (f) => fs.readFileSync(__dirname + "/../" + f, "utf8");
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""}: ${a} statt ${b} (±${tol})`);

/** Erfundene Rad-Fahrt: bis 15 min Einfahren (140 W, 118 bpm), 15–70 min Block (205 W, 150 bpm), danach zwei Timer-Pausen (70:20–73:00 und 73:10–74:10), Ende nach 90 min.
 *  2-s-Raster, Pausen als Zeitlücken; Stücke als [Start in s, Anzahl Proben]. */
function fahrt() {
  const dt = 2, seg = [[0, 2111], [4380, 4], [4450, 475]], hr = [], w = [];
  for (const [t0, k] of seg) for (let i = 0; i < k; i++) { const t = t0 + i * dt; hr.push(t < 900 ? 118 : t <= 4200 ? 150 : 135); w.push(t < 900 ? 140 : t <= 4200 ? 205 : 120); }
  return AN.decode({ ver: "serie-1.0", dt, t0: 1700000000, seg, hr, w });
}

test("laktat-eingabe-1.0: die Rechnung stimmt – bei 1:10:00 liegen 20 min davor 50:00–1:10:02 mit Ø 205 W und Ø 150 bpm, die Timer-Pausen danach ändern nichts", () => {
  const S = fahrt(), ab = AN.laktatFenster(S, 4200, 20), st = AN.stats(S, ab.i0, ab.i1);
  assert.equal(S.t[ab.i0], 3000); near(S.t[ab.i1] + S.dt, 4202, 2);
  near(st.w, 205, 0.5); near(st.hr, 150, 0.5);
  assert.ok(AN.pausen(S).some((p) => p.von > 4200 && p.art === "Timer gestoppt"), "die Pausen liegen nach der Messung");
});

test("laktat-eingabe-1.0: das Fenster bei t = 70 s ist das Einfahren (0:00–1:10, Ø 140 W) – so entsteht ein falscher Eintrag aus der Eingabe «1:10» als min:s", () => {
  const S = fahrt(), ab = AN.laktatFenster(S, 70, 20), st = AN.stats(S, ab.i0, ab.i1);
  assert.equal(ab.i0, 0); near(S.t[ab.i1] + S.dt, 72, 2); near(st.w, 140, 0.5);
});

test("zeitLesen: «1:10» ist bei einer Fahrt über 1 h gleich 1 h 10 min, nicht 1 min 10 s", () => {
  const dauer = 5400;
  assert.deepEqual(AN.zeitLesen("1:10", dauer), { t: 4200, art: "h:mm" });
  assert.deepEqual(AN.zeitLesen(" 1:10 ", dauer), { t: 4200, art: "h:mm" });
  assert.deepEqual(AN.zeitLesen("1:10:00", dauer), { t: 4200, art: "h:mm:ss" });
  assert.deepEqual(AN.zeitLesen("0:01:10", dauer), { t: 70, art: "h:mm:ss" }, "wer 1 min 10 s meint, schreibt 0:01:10");
});

test("zeitLesen: zwei Teile, die nicht in die Aufzeichnung passen, oder eine kurze Einheit lesen sich als min:s; eine Zahl sind Minuten", () => {
  assert.deepEqual(AN.zeitLesen("12:30", 5400), { t: 750, art: "min:s" }, "12 h wären nach der Aufzeichnung");
  assert.deepEqual(AN.zeitLesen("5:00", 5400), { t: 300, art: "min:s" });
  assert.deepEqual(AN.zeitLesen("1:10", 3000), { t: 70, art: "min:s" }, "Einheit unter 1 h: immer min:s (Stufentest)");
  assert.deepEqual(AN.zeitLesen("1:10", null), { t: 70, art: "min:s" }, "ohne Dauer: min:s");
  assert.deepEqual(AN.zeitLesen("70", 5400), { t: 4200, art: "min" });
});

test("zeitLesen: nicht lesbar gibt null (nie eine geratene Zeit)", () => {
  for (const x of ["", "abc", "1:75", "1:10:99", "1:2:3:4", "1,5", "-5", "1h10", null, undefined]) assert.equal(AN.zeitLesen(x, 5400), null, String(x));
});

test("Block A entfernt: kein Zustand, keine Knöpfe, keine Vergleichstabelle, kein AN.vergleich – «Ganze Einheit», «Als Intervall», «Laktat hier» bleiben", () => {
  const ex = lies("js/explorer.js"), an = lies("js/analyse.js");
  assert.doesNotMatch(ex, /Block A|Mit A vergleichen|ST\.A\b|id="ex-a"|ex-cmp|function vergleich|AN\.vergleich|selStats/);
  assert.equal(AN.vergleich, undefined);
  assert.doesNotMatch(an, /AN\.vergleich/);
  for (const k of ["ex-all", "ex-int-add", "ex-la"]) assert.match(ex, new RegExp(`id="${k}"`));
  assert.match(ex, /Ganze Einheit/); assert.match(ex, /Als Intervall/); assert.match(ex, /Laktat hier/);
  assert.match(ex, /const zeilen = |function zeilen\(/, "zeilen() bleibt (Auswahl-Kennzahlen)");
});

test("Block A: nichts anderes im Code (Seite, Module, Tests) braucht die entfernten Namen", () => {
  const dir = (d) => fs.readdirSync(__dirname + "/../" + d).filter((f) => /\.(js|cjs|py|mjs|html)$/.test(f)).map((f) => d + "/" + f);
  for (const f of [...dir("js"), "index.html", "demo.html", ...dir("tools")]) {
    if (f === "tools/durchklick_laktat.py") continue;                  // prüft ja gerade, dass die Knöpfe fehlen
    assert.doesNotMatch(lies(f), /Als Block A merken|Mit A vergleichen|id="ex-cmp|AN\.vergleich\(/, f);
  }
  for (const f of dir("tests")) { if (f === "tests/test_v9261.cjs") continue; assert.doesNotMatch(lies(f), /ex-cmp-b|AN\.vergleich\(|Als Block A/, f); }
});

test("Laktat-Dialog: Zeitfeld «Zeit seit Start (h:mm:ss)», vorbelegt als h:mm:ss, gelesen mit AN.zeitLesen; bei nicht lesbarer Zeit wird nichts gespeichert", () => {
  const ex = lies("js/explorer.js"), i = ex.indexOf("function laktatDialog"), k = ex.indexOf("function laktat() {");
  const d = ex.slice(i, k);
  assert.match(d, /Zeit seit Start \(h:mm:ss\)/);
  assert.doesNotMatch(d, /Zeit \(min:s\)/);
  assert.match(d, /name="t" value="\$\{hmsL\(ts\)\}"/);
  assert.match(d, /AN\.zeitLesen\(f\.t\.value, tEnde\)/);
  assert.match(d, /if \(!r\) \{ zeigen\(\); f\.t\.focus\(\); return; \}/, "kein Speichern ohne gelesene Zeit");
  assert.match(d, /Zeit nicht lesbar/);
  assert.match(d, /Stimmt die Zeit\?/, "Warnung, wenn das Fenster am Start abgeschnitten ist");
  assert.match(d, /Timer-Zeit ohne Pausen/, "Timer- gegen Aufzeichnungszeit sichtbar");
  assert.equal((ex.match(/const hmsL = /g) || []).length, 1);
});

test("Laktat-Liste: Karten statt Tabelle (nichts unter einer festen Spalte, kein Wischen), «Bestätigen» in der Karte, Warnung bei abgeschnittenem Fenster", () => {
  const ex = lies("js/explorer.js"), k = ex.indexOf("function laktat() {"), e = ex.indexOf("/* ---------------- Geplant gegenüber Ist");
  const l = ex.slice(k, e);
  assert.doesNotMatch(l, /<table|<tr>|<th>/);
  assert.match(l, /class="ex-lp"/); assert.match(l, /data-lpb=/); assert.match(l, /window\.V59\.punktBestaetigen\(p, laktat\)/);
  assert.match(l, /ex-lp-warn/);
  assert.match(l, /const best = new Set/, "bestätigte Punkte bleiben erkannt");
  const css = lies("index.html");
  for (const c of [".ex-lps", ".ex-lp ", ".ex-lp-kopf", ".ex-lp-st", ".ex-lp-kv"]) assert.ok(css.includes(c), c);
  assert.match(css, /\.ex-lp-st \.btn \{ min-height: 44px; \}/, "Knopf in Daumengrösse");
});

test("blatt-stapel-1.0: das zuletzt geöffnete Blatt bekommt den höchsten z-index; beim Schliessen wird er zurückgesetzt", () => {
  const v = lies("js/v59.js"), i = v.indexOf("function modalSetzen()");
  const s = v.slice(i, i + 900);
  assert.match(s, /MODAL\.forEach\(\(m, i\) => \{ if \(m\.ov\.classList && m\.ov\.classList\.contains\("v5-overlay"\)\) m\.ov\.style\.zIndex = String\(70 \+ i\); \}\);/);
  assert.match(v, /MODAL\.splice\(i, 1\)\[0\]; if \(m\.ov\.style\) m\.ov\.style\.zIndex = ""; modalSetzen\(\);/);
  assert.match(lies("index.html"), /\.v5-overlay \{ position: fixed;[^}]*z-index: 70;/, "Grundwert der Blätter bleibt 70");
});

test("Bestätigen-Blatt: Zeiten als h:mm:ss (1:10 hiess 1 min 10 s) und Warnung bei abgeschnittenem Fenster", () => {
  const v = lies("js/v59.js"), i = v.indexOf("V.punktBestaetigen = function"), s = v.slice(i);
  assert.match(s, /return Math\.floor\(s \/ 3600\) \+ ":" \+ String\(Math\.floor\(\(s % 3600\) \/ 60\)\)\.padStart\(2, "0"\) \+ ":" \+ String\(s % 60\)\.padStart\(2, "0"\);/);
  assert.match(s, /Stimmt die Zeit \(\$\{hms\(p\.t\)\}\)\?/);
});

test("Cache-Name erneuert (neue Fassung wird geladen), ohne feste Versionsnummer im Test", () => {
  assert.match(lies("sw.js"), /^const CACHE = "notebook-v\d+-[a-z0-9-]+-2026-\d\d-\d\d";$/m);
});
