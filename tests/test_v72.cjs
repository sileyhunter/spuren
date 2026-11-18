// Abnahmetests V7.2 Schwimmen (js/schwimmen.js: uebungen-2.1, schwimmeinheit-1.1 seit V7.3.2) – nur erfundene Werte.
// Aufruf: node --test tests/test_v72.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
global.window = undefined;
const SW = require("../js/schwimmen.js");
const lies = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("uebungen-2.1: jede Übung mit Zweck, Ablauf, worauf achten, Fehlern, Hilfsmitteln und Dosierung", () => {
  assert.equal(SW.VERSIONS.uebungen, "uebungen-2.1");
  assert.ok(SW.UEBUNGEN.length >= 20);
  const ids = new Set();
  for (const u of SW.UEBUNGEN) {
    assert.ok(!ids.has(u.id), "doppelte ID " + u.id); ids.add(u.id);
    assert.ok(u.name && u.zweck && u.zweck.length > 30, u.id + ": Zweck");
    assert.ok(Array.isArray(u.ablauf) && u.ablauf.length >= 2, u.id + ": Ablauf");
    assert.ok(Array.isArray(u.achten) && u.achten.length >= 2, u.id + ": worauf achten");
    assert.ok(Array.isArray(u.fehler) && u.fehler.length >= 1, u.id + ": Fehler");
    assert.ok(u.dos, u.id + ": Dosierung");
    assert.ok(u.s.length && u.s.every((k) => SW.SCHWERPUNKTE[k]), u.id + ": Schwerpunkt");
    for (const h of [...u.h.noetig, ...u.h.frei]) assert.ok(SW.HILFSMITTEL[h], u.id + ": Hilfsmittel " + h);
    assert.ok(!u.h.noetig.some((h) => u.h.frei.includes(h)), u.id + ": nötig und freiwillig zugleich");
    assert.ok(!/ß/.test(JSON.stringify(u)), u.id + ": Schweizer Schreibweise (ss)");
  }
  // Hilfsmittel, die Silas hat: alle vier kommen als nötiges Hilfsmittel mindestens einmal vor
  for (const h of ["brett", "pullbuoy", "flossen", "paddles"]) assert.ok(SW.UEBUNGEN.some((u) => u.h.noetig.includes(h)), h);
  assert.equal(SW.uebung("hundepaddeln").h.noetig[0], "flossen");
  assert.equal(SW.uebung("nichtda"), null);
});

test("Übungen aus Enduco-/Garmin-Schritten finden (Umlaute, Bindestriche, Synonyme)", () => {
  const f = (n) => (SW.finde(n) || {}).id || null;
  assert.equal(f("Reißverschluss"), "reissverschluss");
  assert.equal(f("Hunde-Paddeln"), "hundepaddeln");
  assert.equal(f("Einarmig Kraulen"), "einarmig");
  assert.equal(f("Wechselseitige Kraulbeine auf der Seite"), "beine_seitlage");
  assert.equal(f("Kraulbeine"), "beine_brett");
  assert.equal(f("Arme"), "pull");
  assert.equal(f("Gleiten"), "gleiten");
  assert.equal(f("Einarmig mit Kickboard"), "einarmig_brett"); assert.equal(f("Rücken Kraulbeine"), "rueckenbeine"); assert.equal(f("Kraulbeinschlag"), "beine_brett");
  assert.equal(f("Grundlagenausdauer"), null);
  assert.equal(f("Tempo Intervalle"), null);
  assert.equal(f(""), null);
  // Garmin equipment_type → eigene Hilfsmittel
  assert.equal(SW.GARMIN_GERAET.kickboard, "brett");
  assert.equal(SW.GARMIN_GERAET.pull_buoy, "pullbuoy");
  assert.equal(SW.GARMIN_GERAET.fins, "flossen");
  assert.equal(SW.GARMIN_GERAET.paddles, "paddles");
});

test("Filter: ohne Hilfsmittel, je Hilfsmittel, je Schwerpunkt", () => {
  const ohne = SW.filtern({ hilfsmittel: "ohne" });
  assert.ok(ohne.length > 5 && ohne.every((u) => !u.h.noetig.length));
  const fl = SW.filtern({ hilfsmittel: "flossen" }).map((u) => u.id);
  assert.ok(fl.includes("hundepaddeln") && fl.includes("flossen"));
  const beine = SW.filtern({ schwerpunkt: "beine" });
  assert.ok(beine.length >= 3 && beine.every((u) => u.s.includes("beine")));
  assert.equal(SW.filtern({}).length, SW.UEBUNGEN.length);
});

test("uebungen-2.1: alle 27 Kraul-Übungen aus den Enduco-Einheiten – Name erkannt, Strecke und nötige Hilfsmittel wie dort", () => {
  // Liste wie in Enduco: Name → [Strecke m, nötige Hilfsmittel]
  const L = { "Hunde-Paddeln": [25, ["flossen"]], "Scheibenwischer": [25, []], "Kraul mit gespreizten Fingern": [25, []], "Kraul mit Fäusten": [25, []],
    "Enten-Paddeln": [25, ["flossen"]], "Wasserwerfen": [50, []], "Schulterdehnung": [50, []], "Reissverschluss": [25, []], "Achselhöhle tippen": [25, []],
    "Po-Achselhöhle-Kopf": [25, []], "Fingerspitzen übers Wasser ziehen": [25, []], "Zurückspulen": [25, []], "Einarmig mit Kickboard": [25, ["brett"]],
    "Einarmig Kraulen": [25, ["flossen", "brett"]], "3-3-3 Drill": [25, ["flossen"]], "Kraul, zwei Züge pro Seite": [25, ["flossen"]], "Abschlagschwimmen": [25, ["flossen"]],
    "Gleiten": [25, []], "Kraulbeinschlag": [25, ["brett"]], "Rücken Kraulbeine": [25, ["flossen"]], "Wechselseitige Kraulbeine auf der Seite": [50, ["flossen"]],
    "Balance Drill": [25, ["brett"]], "6-Kick-Wechsel": [25, []], "2er Atmung": [25, []], "3er Atmung": [25, []], "Atempyramide": [50, ["flossen"]], "Wasserball Kraul": [12.5, []] };
  const ids = new Set();
  for (const [name, [m, h]] of Object.entries(L)) {
    const u = SW.finde(name);
    assert.ok(u, "nicht erkannt: " + name); ids.add(u.id);
    assert.ok(SW.ENDUCO[u.id], name + ": in der Enduco-Liste"); assert.equal(SW.ENDUCO[u.id][0], m, name + ": Strecke");
    assert.deepEqual(u.h.noetig.slice().sort(), h.slice().sort(), name + ": nötige Hilfsmittel");
  }
  assert.equal(ids.size, 27); assert.equal(Object.keys(SW.ENDUCO).length, 27);
  // Abwechslung: fünf Gruppen, «Schulterdehnung» nur erkannt (Ausführung unklar)
  assert.equal(SW.ROTATION.length, 5); assert.equal(SW.ROTATION.flat().length, 26); assert.ok(!SW.ROTATION.flat().includes("schulterdehnung"));
});

test("Übungen der Woche wechseln und wiederholen sich in einer Einheit nicht", () => {
  const a = SW.uebungenDerWoche(10, 3), b = SW.uebungenDerWoche(11, 3);
  assert.equal(a.length, 3); assert.equal(new Set(a).size, 3);
  assert.notDeepEqual(a, b);
  for (const id of [...a, ...b]) assert.ok(SW.uebung(id));
  assert.deepEqual(SW.uebungenDerWoche(10, 3), a);   // gleiche Woche = gleiche Übungen
  // uebungen-2.1: in 60 Wochen kommt jede Übung der Abwechslung vor, nie zweimal hintereinander, drei verschiedene Gruppen je Woche
  const n = {};
  for (let w = 1; w <= 60; w++) {
    const x = SW.uebungenDerWoche(w, 3), y = SW.uebungenDerWoche(w + 1, 3);
    x.forEach((id) => (n[id] = (n[id] || 0) + 1));
    assert.ok(!x.some((id) => y.includes(id)), "Woche " + w + " und " + (w + 1));
    assert.equal(new Set(x.map((id) => SW.ENDUCO[id][1])).size, 3, "Woche " + w + ": drei Gruppen");
  }
  assert.deepEqual(SW.ROTATION.flat().filter((id) => !n[id]), []);
  assert.ok(!SW.uebungenDerWoche(5, 3, ["beine_brett"]).includes("beine_brett") && SW.uebungenDerWoche(5, 3, ["beine_brett"]).length === 3);
});

test("schwimmeinheit-1.1/1.2: lockere Einheit mit Technik, Beinen, Hauptserie; Meter und Dauer passen", () => {
  const e = SW.einheit("locker", { min: 50, pool: 50, ref_s: 160, woche: 3 });
  assert.equal(e.v, "schwimmeinheit-1.2");
  assert.deepEqual(e.bloecke.map((b) => b.id), ["ein", "technik", "beine", "haupt", "aus"]);
  assert.equal(e.bloecke[1].teile.length, 3);
  assert.ok(e.bloecke[1].teile.every((t) => t.uebung && t.zone === "tech" && t.wdh === 2 && t.pause_s === 5), "Übung 2 × mit 5 s Pause wie bei Enduco");
  // schwimmeinheit-1.1: Übungsstrecke wie in der Enduco-Liste, dann die Bahn fertig (12,5 m → ¾ L locker, 50 m → ganze Bahn), nie Brett-Beine doppelt
  for (const pool of [25, 50]) for (let w = 1; w <= 12; w++) for (const art of ["locker", "css"]) for (const min of [30, 45, 60]) {
    const x = SW.einheit(art, { min, pool, ref_s: 150, woche: w }), t = x.bloecke.find((b) => b.id === "technik").teile;
    assert.equal(t.length, 3, "drei Übungen");
    for (const d of t) { assert.equal(d.m, SW.ENDUCO[d.uebung][0]); assert.equal((d.m + d.zuende_m) % pool, 0, "ganze Bahnen"); assert.ok(d.zuende_m < pool); }
    if (x.bloecke.some((b) => b.id === "beine")) assert.ok(!t.some((d) => d.uebung === "beine_brett"));
  }
  assert.equal(e.meter % 25, 0);
  assert.ok(Math.abs(e.dauer_s - 50 * 60) <= 0.15 * 50 * 60, "Dauer ≈ Plandauer: " + e.dauer_s);
  assert.ok(e.hilfsmittel.includes("brett"));
  assert.ok(!e.hilfsmittel.some((h) => e.frei.includes(h)));
  assert.equal(e.umfang_quelle, "≈ dein Tempo aus Becken-Einheiten (kein Tempoziel)");
  assert.ok(e.bloecke.every((b) => b.teile.every((t) => t.tempo === null)), "ohne CSS kein Tempoziel");
  // lange Einheit: mit Pull; kurze: ohne Beine
  assert.ok(SW.einheit("locker", { min: 70, pool: 25, ref_s: 150, woche: 3 }).bloecke.some((b) => b.id === "pull"));
  assert.ok(!SW.einheit("locker", { min: 30, pool: 25, ref_s: 150, woche: 3 }).bloecke.some((b) => b.id === "beine"));
});

test("schwimmeinheit-1.1: CSS-Einheit mit Tempo aus dem Test, ohne Tempo bleibt die Dauer offen", () => {
  const css = 100;   // erfundener Wert
  const e = SW.einheit("css", { min: 45, pool: 25, css_s: css, woche: 7 });
  const h = e.bloecke.find((b) => b.id === "haupt").teile[0];
  assert.equal(h.zone, "css"); assert.equal(h.m, 100); assert.equal(h.tempo, "1:40/100 m");
  assert.ok(h.wdh >= 6 && h.wdh <= 16);
  const ein = e.bloecke[0].teile[0];
  assert.equal(ein.tempo, "1:55–2:00/100 m");   // locker = CSS + 15–20 s
  assert.equal(e.umfang_quelle, "CSS-Test");
  const o = SW.einheit("css", { min: 45, pool: 25, woche: 7 });
  assert.equal(o.dauer_s, null); assert.ok(o.meter > 0);
  assert.ok(o.bloecke.every((b) => b.teile.every((t) => t.tempo === null && t.rpe)), "ohne Test nach Anstrengung");
});

test("schwimmeinheit-1.1: CSS-Test 400 m und 200 m maximal, Kurs ohne Meter", () => {
  const t = SW.einheit("test", { pool: 25 });
  const haupt = t.bloecke.find((b) => b.id === "haupt").teile;
  assert.deepEqual(haupt.filter((x) => x.zone === "max").map((x) => x.m), [400, 200]);
  const k = SW.einheit("kurs", { min: 50 });
  assert.equal(k.meter, null); assert.equal(k.dauer_s, null);
  assert.equal(SW.artVon("schwimm_css"), "css"); assert.equal(SW.artVon("test_css"), "test"); assert.equal(SW.artVon("unbekannt"), "locker");
});

test("Bahnen, Tempo und Referenz aus Becken-Einheiten", () => {
  assert.equal(SW.bahnen(25, 50), "½ L"); assert.equal(SW.bahnen(100, 50), "2 L"); assert.equal(SW.bahnen(200, 25), "8 L"); assert.equal(SW.bahnen(0, 25), "");
  assert.equal(SW.bahnen(12.5, 50), "¼ L"); assert.equal(SW.bahnen(37.5, 50), "¾ L"); assert.equal(SW.bahnen(75, 50), "1½ L");
  assert.deepEqual(SW.tempo("z2", 100), [108, 112]); assert.equal(SW.tempo("z2", null), null);
  const acts = [1, 2, 3, 4].map((i) => ({ sport: "schwimm", date: `2026-01-0${i}`, km: 2, mv: 2 * 10 * (140 + i) }));
  assert.equal(SW.refTempo(acts), 143);   // Median von 141…144 s/100 m
  assert.equal(SW.refTempo(acts.slice(0, 2)), null);
  assert.equal(SW.refTempo([{ sport: "schwimm", typ: "Freiwasser", date: "2026-01-01", km: 2, mv: 3000 }, ...acts.slice(0, 2)]), null);
});

test("Seite: Skripte eingebunden, offline im Speicher, keine festen Farben in der Schwimm-Oberfläche", () => {
  const html = lies("index.html"), sw = lies("sw.js"), ui = lies("js/schwimmen-ui.js");
  assert.ok(html.indexOf('src="js/schwimmen.js"') < html.indexOf('src="js/schwimmen-ui.js"'));
  assert.ok(html.indexOf('src="js/schwimmen-ui.js"') < html.indexOf('src="js/v64-ui.js"'));
  assert.ok(sw.includes('"js/schwimmen.js"') && sw.includes('"js/schwimmen-ui.js"'));
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(ui), "Farben nur über Variablen");
  assert.ok(!/ß/.test(ui), "Schweizer Schreibweise");
});

test("V8.4 abwechslung-1.0: CSS-Hauptserie in 200 bzw. 300 m (20 bzw. 30 s Pause), Anfänger-Modus bleibt bei 50 m", () => {
  const haupt = (o) => SW.einheit("css", Object.assign({ min: 55, css_s: 110, pool: 25 }, o)).bloecke.find((b) => (b.key || b.id) === "haupt");
  const s = (b) => (b.serien || b.teile)[0];
  assert.equal(s(haupt({})).m, 100);
  assert.equal(s(haupt({ css_m: 200 })).m, 200); assert.equal(s(haupt({ css_m: 200 })).pause_s, 20);
  assert.equal(s(haupt({ css_m: 300 })).m, 300); assert.equal(s(haupt({ css_m: 300 })).pause_s, 30);
  assert.ok(s(haupt({ css_m: 300 })).wdh >= 2 && s(haupt({ css_m: 300 })).wdh <= 6);
  assert.equal(s(haupt({ css_m: 200, anfaenger: true })).m, 50, "Anfänger-Modus: kurze Stücke");
  assert.equal(SW.artVon("schwimm_css_300"), "css"); assert.equal(SW.cssStrecke("schwimm_css_200"), 200); assert.equal(SW.cssStrecke("schwimm_css"), null);
});
