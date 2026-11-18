// Abnahmetests V8.2 «Persönliche Reaktionen» (js/v82.js): erholung-nach-1.0, vertraeglich-1.0, verteilung-1.0, blockbilanz-1.0. Alle Werte erfunden.
const test = require("node:test");
const assert = require("node:assert/strict");
const FK = require("../js/formkurve.js");
global.FK = FK;
const V82 = require("../js/v82.js");
const { addDays, montag, spearman } = V82._intern;

const HEUTE = "2026-11-18";
// erfundenes Zonenprofil: gilt erst ab November, die Pulsgrenzen gelten trotzdem für die ganze Historie (Stichtag heute)
const ZONEN = [{ id: "z-test", name: "Testprofil", gueltig_ab: "2026-11-01", skalen: [
  { disziplin: "rad", metrik: "puls", zonen: [{ z: "Z1", bis: 130 }, { z: "Z2", bis: 150 }, { z: "Z3", bis: 170 }, { z: "Z4", bis: 180 }, { z: "Z5", bis: 200 }] },
  { disziplin: "lauf", metrik: "puls", zonen: [{ z: "Z1", bis: 140 }, { z: "Z2", bis: 160 }, { z: "Z3", bis: 180 }, { z: "Z4", bis: 190 }, { z: "Z5", bis: 205 }] }] }];
/** Puls-Histogramm (5-bpm-Klassen ab 60): Minuten je Puls. */
const hh = (paare) => { const h = new Array(25).fill(0); for (const [puls, min] of paare) h[Math.floor((puls - 60) / 5)] += min * 60; return h; };
function lcg(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }

/** Welt: Wochen ab Montag `start`; je Woche eine Zahl harter Rad-Einheiten (Di, Mi, Do, Fr), Sa 2:30 h locker (nicht «lang»), sonst lockere Stunde, Mo frei.
 *  Morgen nach einer harten Einheit: HRV −15 %, Ruhepuls +3; nach Wochen mit `schwer` harten Einheiten zusätzlich Mo–Mi der Woche danach Ruhepuls +4. */
function welt(start, harteJeWoche, opt) {
  opt = Object.assign({ schwer: 99, hrvAb: start }, opt || {});
  const acts = [], days = [], r = lcg(7), hart = new Set(), extra = new Set();
  harteJeWoche.forEach((n, w) => {
    const mo = addDays(start, 7 * w);
    for (let t = 0; t < 7; t++) {
      const d = addDays(mo, t), hartHeute = t >= 1 && t <= 4 && t - 1 < n;
      if (t === 5) acts.push({ id: `a${d}`, date: d, sport: "rad", dur: 9000, mv: 9000, tss: 120, hh: hh([[140, 150]]), np: 190, watt: 180, hr: 140 });
      else if (hartHeute) { acts.push({ id: `a${d}`, date: d, sport: "rad", dur: 5400, mv: 5400, tss: 110, hh: hh([[140, 70], [175, 20]]) }); hart.add(d); }
      else if (t !== 0) acts.push({ id: `a${d}`, date: d, sport: "rad", dur: 3600, mv: 3600, tss: 45, hh: hh([[140, 60]]), np: 170, watt: 165, hr: 135 + Math.round(4 * r()) });
    }
    if (n >= opt.schwer) for (const t of [7, 8, 9]) extra.add(addDays(mo, t));
  });
  const ende = addDays(start, 7 * harteJeWoche.length + 3);
  for (let d = start; d <= ende; d = addDays(d, 1)) {
    const nachHart = hart.has(addDays(d, -1)), e = r() - 0.5;
    days.push({ date: d, hrv: d >= opt.hrvAb ? Math.round(60 * (nachHart ? 0.85 : 1) * (1 + 0.04 * e) * 10) / 10 : null,
      rhr: Math.round((50 + (nachHart ? 3 : 0) + (extra.has(d) ? 4 : 0) + 1.2 * e) * 10) / 10 });
  }
  return { activities: acts, days, zonen: ZONEN };
}

test("Versionen und Mindestzahlen", () => {
  assert.deepEqual(V82.VERSIONS, { erholung: "erholung-nach-1.0", vertraeglich: "vertraeglich-1.0", verteilung: "verteilung-1.0", bloecke: "blockbilanz-1.0" });
  assert.deepEqual(V82.MIN, { faelle: 6, wochen: 4, paare: 8, block: 3 });
});

test("Einteilung: hart ab 5 min über LT2, mittel ab 20 min über LT1, lang, locker – mit den Pulsgrenzen vom Stichtag", () => {
  const a = (paare, s, sport) => ({ date: "2026-03-03", sport: sport || "rad", dur: s || 3600, mv: s || 3600, hh: hh(paare) });
  assert.equal(V82.art(a([[140, 50], [175, 6]]), ZONEN, HEUTE), "hart");
  assert.equal(V82.art(a([[140, 50], [175, 4]]), ZONEN, HEUTE), "locker", "4 min reichen nicht");
  assert.equal(V82.art(a([[140, 30], [160, 25]]), ZONEN, HEUTE), "mittel");
  assert.equal(V82.art(a([[140, 200]], 12000), ZONEN, HEUTE), "lang");
  assert.equal(V82.art(a([[165, 60]], 3600, "lauf"), ZONEN, HEUTE), "mittel", "Laufen mit eigenen Grenzen");
  assert.equal(V82.art({ date: "2026-03-03", sport: "schwimm", dur: 3600 }, ZONEN, HEUTE), null);
  assert.equal(V82.art({ date: "2026-03-03", sport: "rad", dur: 3600 }, ZONEN, HEUTE), null, "ohne Puls und nicht lang: unbekannt");
  // ohne Stichtag gilt das Profil des Tages – vor dem 1.11. keines, also Garmins Zonen
  assert.equal(V82.art(Object.assign(a([[140, 50], [175, 6]]), { zones: [600, 2400, 0, 0, 0] }), ZONEN, null), "locker");
});

test("erholung-nach-1.0: Unterschied zu ruhigen Tagen, deutlich am Morgen danach, ab Tag 2 im Rahmen", () => {
  const D = welt("2026-03-02", Array(30).fill(2));
  const E = V82.erholung(D, { heute: HEUTE, zonen: ZONEN, mitPuls: false });
  const g = E.gruppen.intensiv;
  assert.ok(g.n >= 50, `harte Tage: ${g.n}`);
  const h1 = g.marker.hrv.tage[0], r1 = g.marker.rhr.tage[0];
  assert.ok(h1.diff < -10 && h1.diff > -20, `HRV Tag 1: ${h1.diff}`);
  assert.ok(r1.diff > 2 && r1.diff < 4, `Ruhepuls Tag 1: ${r1.diff}`);
  assert.equal(g.marker.hrv.status, "erholt"); assert.equal(g.marker.hrv.erholtTag, 2);
  assert.equal(g.marker.rhr.erholtTag, 2);
  assert.equal(E.erholtTag, 2);
  assert.ok(E.gruppen.ruhig.n > 20, "Vergleichstage vorhanden");
  assert.match(E.text.join(" "), /HRV am Morgen danach −1\d % gegenüber ruhigen Tagen .* deutlich, ab Tag 2 wieder im Rahmen/);
  // die Reihe endet, wenn am Tag danach schon die nächste harte Einheit kommt (Di→Mi): Tag 2 hat weniger Fälle als Tag 1
  assert.ok(g.marker.hrv.tage[1].n < h1.n);
  // gleiche Daten, gleiches Ergebnis (fester Startwert)
  assert.equal(JSON.stringify(V82.erholung(D, { heute: HEUTE, zonen: ZONEN, mitPuls: false })), JSON.stringify(E));
});

test("erholung-nach-1.0: Vergleichstage brauchen dieselbe Mindestzahl", () => {
  // jeden Tag hart oder am Vortag hart: keine ruhigen Tage → kein Unterschied, kein Urteil
  const D = welt("2026-03-02", Array(20).fill(4));
  for (const a of D.activities) a.hh = hh([[140, 70], [175, 20]]);
  const E = V82.erholung(D, { heute: HEUTE, zonen: ZONEN, mitPuls: false });
  assert.ok(E.gruppen.ruhig.n < V82.MIN.faelle * 4);
  assert.equal(E.gruppen.intensiv.marker.hrv.tage[0].diff, undefined);
  assert.equal(E.erholtTag, null);
});

test("erholung-nach-1.0: zu wenig Fälle → «noch zu wenig Daten», nie ein Urteil", () => {
  const D = welt("2026-10-05", [1, 1, 1]);
  const E = V82.erholung(D, { heute: HEUTE, zonen: ZONEN, mitPuls: false });
  assert.equal(E.gruppen.intensiv.marker.hrv.status, "zu wenig");
  assert.equal(E.erholtTag, null);
  assert.match(E.text[0], /noch zu wenig Daten/);
});

test("vertraeglich-1.0: Bezug = übliche Wochen, darüber deutlich schlechter erkannt, darunter nicht beurteilt", () => {
  const plan = [];
  for (let i = 0; i < 12; i++) plan.push(2, 2, 3, 1, 4, 2);          // Median 2; je Gruppe genug Wochen
  const D = welt("2025-06-02", plan, { schwer: 4 });
  const T = V82.vertraeglich(D, { heute: HEUTE, zonen: ZONEN });
  const d = T.dim.harte;
  assert.equal(d.bezug, "2");
  const g = (l) => d.gruppen.find((q) => q.label === l);
  assert.ok(g("1").unter && !g("1").schlechter, "weniger als üblich: nicht beurteilt");
  assert.equal(g("3").schlechter, false);
  assert.equal(g("4+").schlechter, true, "Ruhepuls +4 in der Woche danach");
  assert.equal(d.bis, "3"); assert.equal(d.ab, "4+");
  assert.match(d.text, /gegenüber deinen üblichen Wochen \(2\) bis 3 keine deutlich schlechtere Erholung.*bei 4\+: Ruhepuls \+\d/);
  assert.ok(T.n >= 60);
  // ohne den Effekt: bis 4+, kein «ab»
  const T2 = V82.vertraeglich(welt("2025-06-02", plan), { heute: HEUTE, zonen: ZONEN });
  assert.equal(T2.dim.harte.ab, null); assert.equal(T2.dim.harte.bis, "4+");
});

test("vertraeglich-1.0: Wochen ohne Aufzeichnung zählen nicht; zu wenig Wochen → noch zu wenig Daten", () => {
  const D = welt("2026-09-07", [2, 2, 2]);
  const T = V82.vertraeglich(D, { heute: HEUTE, zonen: ZONEN });
  assert.ok(T.n <= 4, `Wochen mit Daten: ${T.n}`);
  assert.match(T.dim.harte.text, /noch zu wenig/);
});

test("verteilung-1.0: Rangkorrelation mit Intervall; unter 8 Block-Paaren kein Urteil", () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y = x.map((v) => 3 * v + 1);
  const s = spearman(x, y, 1); assert.equal(Math.round(s.rho * 100) / 100, 1); assert.ok(s.ki[0] > 0.8);
  const s2 = spearman(x, y.slice().reverse(), 1); assert.equal(Math.round(s2.rho * 100) / 100, -1);
  const D = welt("2026-07-06", Array(16).fill(2));
  const V = V82.verteilung(D, { heute: HEUTE, zonen: ZONEN });
  assert.ok(V.zusammenhang.length === 4 && V.zusammenhang.every((z) => z.status === "zu wenig"), "wenige Blöcke: kein Urteil");
  assert.match(V.text[0], /noch zu wenig Daten \(\d+ von 8 Block-Paaren\)/);
  const b = V.bloecke[V.bloecke.length - 1];
  assert.ok(b.tid && b.tid[0] > 70, "vor allem locker");
});

test("blockbilanz-1.0: Blöcke enden mit der Erholungswoche (anker), Satz je Block, Fitness steigt mit mehr Training", () => {
  const plan = Array(10).fill(1).concat(Array(14).fill(3));
  const D = welt("2026-05-04", plan);
  const anker = "2026-11-02";                                        // Montag einer Erholungswoche
  const B = V82.bloecke(D, { heute: HEUTE, zonen: ZONEN, anker, n: 4 });
  assert.equal(B.bloecke.length, 4);
  for (const b of B.bloecke) {
    assert.equal(montag(b.von), b.von);
    const wochen = Math.round((Date.parse(addDays(b.bis, -6)) - Date.parse(anker)) / 6048e5);   // Montag der letzten Blockwoche gegen die Erholungswoche
    assert.equal(((wochen % 4) + 4) % 4, 0, `Blockende ${b.bis} passt nicht zur Erholungswoche`);
    assert.ok(b.satz.length > 10);
  }
  const vorher = V82.bloecke(D, { heute: "2026-08-12", zonen: ZONEN, n: 3 });
  assert.ok(vorher.bloecke.some((b) => b.bilanz.fitness === "steigt"), "mehr harte Einheiten → Fitness steigt");
  assert.ok(B.bloecke.every((b) => b.harte >= 0 && b.stunden.proWoche > 0));
});

test("alles: eine Vorbereitung für alle vier Teile; ohne Daten null", () => {
  const D = welt("2026-06-01", Array(20).fill(2));
  const R = V82.alles(D, { heute: HEUTE, zonen: ZONEN, mitPuls: false });
  assert.ok(R.erholung && R.vertraeglich && R.verteilung && R.bloecke);
  assert.equal(V82.alles({ activities: [], days: [] }, {}), null);
});
