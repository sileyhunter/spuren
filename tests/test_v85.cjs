/* V8.5 Modell «Automatisch» (automatisch-1.0): Entscheid je Woche aus Phase, Zeit, Verträglichkeit und Ermüdung (js/v85.js) und seine Wirkung
   auf den Wochenvorschlag (V64.woche opt.harte). Alle Werte erfunden. Szenarien über mehrere Wochen (Test C) in tests/test_v80.cjs. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V85 = require("../js/v85.js");
const V64 = require("../js/v64.js");

const MO = "2026-11-23";
const basisO = (x) => Object.assign({ woche: MO, basis: "polarisiert", wechsel: "2027-02-01", phase: "Grundlage", erholung: false, taper: false, rennwoche: false,
  stunden: 10, sportart: "triathlon", reaktionen: null, ermuedung: null }, x || {});
const tage = (n, status) => Array.from({ length: 7 }, (_, i) => ({ date: V85._intern.add(MO, -7 + i), status: i < n ? status : "wie_geplant" }));
const zus = (hart, mittel, n) => ({ zusammenhang: [
  { x: "hart", marker: "dRad", n: n || 12, status: hart, rho: hart === "negativ" ? -0.6 : hart === "positiv" ? 0.6 : 0.05, ki: hart === "negativ" ? [-0.85, -0.2] : hart === "positiv" ? [0.2, 0.85] : [-0.4, 0.45] },
  { x: "mittel", marker: "dRad", n: n || 12, status: mittel, rho: mittel === "positiv" ? 0.55 : mittel === "negativ" ? -0.55 : 0, ki: mittel === "positiv" ? [0.15, 0.8] : mittel === "negativ" ? [-0.8, -0.15] : [-0.4, 0.4] },
  { x: "hart", marker: "dLauf", n: 1, status: "zu wenig" }, { x: "mittel", marker: "dLauf", n: 1, status: "zu wenig" }] });
const vertr = (ab, bis, bezug) => ({ dim: { harte: { name: "Harte Einheiten pro Woche", bezug: bezug || "2", bis: bis || null, ab: ab || null } } });
const art = (e, a) => e.gruende.find((g) => g.art === a);

test("Ohne Daten: wie «kombiniert» – polarisiert vor dem Wechsel, rennspezifisch danach, zwei harte Einheiten, jede Wahl mit Grund", () => {
  const e = V85.entscheid(basisO());
  assert.equal(e.v, "automatisch-1.0");
  assert.equal(e.modell, "polarisiert"); assert.equal(e.harte, 2); assert.equal(e.vorlage, 2); assert.equal(e.abweichung, false);
  for (const a of ["phase", "verteilung", "zeit", "vertraeglich", "ermuedung"]) assert.ok(art(e, a) && art(e, a).text.length > 10, a);
  assert.match(art(e, "verteilung").text, /Noch zu wenig Daten/);
  assert.equal(art(e, "ermuedung").wirkung, "offen");
  assert.match(e.kurz, /^polarisiert · 2 harte Einheiten an Land$/);
  const r = V85.entscheid(basisO({ basis: "rennspezifisch", woche: "2027-02-01", reaktionen: { stand: "2027-01-31", verteilung: zus("negativ", "positiv") } }));
  assert.equal(r.modell, "rennspezifisch", "ab dem Wechsel ändern die Daten zur Verteilung nichts");
  assert.match(art(r, "phase").text, /seit 1\.2\.2027/);
  for (const g of e.gruende.concat(r.gruende)) assert.ok(!/ß/.test(g.text), g.text);
});

test("Verteilung aus deinen Daten: pyramidal nur bei klarem Zusammenhang (90-%-Intervall ohne Null), sonst polarisiert", () => {
  const mit = (h, m, n) => V85.entscheid(basisO({ reaktionen: { stand: "2026-11-22", verteilung: zus(h, m, n) } }));
  assert.equal(mit("negativ", "kein klarer").modell, "pyramidal");
  assert.equal(mit("kein klarer", "positiv").modell, "pyramidal");
  assert.equal(mit("positiv", "kein klarer").modell, "polarisiert");
  assert.equal(mit("negativ", "negativ").modell, "polarisiert", "beides schlechter: kein Grund für mehr Mitte");
  assert.equal(mit("kein klarer", "kein klarer").modell, "polarisiert");
  const p = mit("negativ", "kein klarer");
  assert.equal(p.abweichung, true); assert.equal(p.harte, 2, "die Verteilung ändert die Zahl harter Einheiten nicht");
  assert.match(art(p, "verteilung").text, /^Deine Daten bis 22\.11\.2026: mehr Anteil hart ging eher mit schlechterer Rad-Effizienz im Block danach einher \(Rangkorrelation −0,60, 90-%-Intervall −0,85 bis −0,20, n = 12\)\. Darum am Rad Schwelle statt VO2max/);
  assert.match(art(p, "verteilung").text, /Zusammenhang, keine Ursache/);
  const wenig = V85.entscheid(basisO({ reaktionen: { stand: "2026-11-22", verteilung: { zusammenhang: [{ x: "hart", marker: "dRad", n: 5, status: "zu wenig" }, { x: "mittel", marker: "dRad", n: 5, status: "zu wenig" }] } } }));
  assert.equal(wenig.modell, "polarisiert");
  assert.match(art(wenig, "verteilung").text, /5 von 8 Block-Paaren/);
});

test("Ermüdung: ab 3 Tagen «vorsichtig» oder krank vor dem Montag bzw. Trainingsstatus ab 1,5 eine harte Einheit an Land", () => {
  const mit = (E) => V85.entscheid(basisO({ ermuedung: E }));
  const e2 = V85.ermuedung(tage(2, "vorsichtig"), 1.1), e3 = V85.ermuedung(tage(3, "vorsichtig"), 1.1);
  assert.deepEqual([e2.vorsichtig, e2.grund, e3.vorsichtig, e3.grund], [2, null, 3, "ampel"]);
  assert.equal(mit(e2).harte, 2);
  const r3 = mit(e3);
  assert.equal(r3.harte, 1); assert.equal(r3.grund, "Ermüdung der Vorwoche"); assert.equal(r3.abweichung, true);
  assert.match(r3.kurz, /eine harte Einheit an Land \(statt 2\)/);
  assert.ok(art(r3, "auswahl") && /Rad bleibt, der harte Lauf wird locker/.test(art(r3, "auswahl").text));
  const krank = V85.ermuedung([{ date: "2026-11-16", status: "krank" }, { date: "2026-11-17", status: "vorsichtig" }, { date: "2026-11-18", status: "vorsichtig" }], 1.0);
  assert.equal(krank.grund, "ampel"); assert.equal(krank.ohne, 4);
  const s = (x) => mit(V85.ermuedung(tage(0), x));
  assert.equal(s(1.49).harte, 2); assert.equal(s(1.5).harte, 1); assert.equal(s(1.5).grund, "Trainingsstatus sehr hoch");
  assert.equal(s(null).harte, 2);
});

test("Verträglichkeit: weniger nur, wenn Wochen mit so vielen harten Einheiten bei dir mit schlechterer Erholung einhergingen", () => {
  const mit = (v) => V85.entscheid(basisO({ reaktionen: { stand: "2026-11-22", vertraeglich: v } }));
  assert.equal(mit(vertr("2", null, "1")).harte, 1);
  assert.match(art(mit(vertr("2", null, "1")), "vertraeglich").text, /^Deine Daten bis 22\.11\.2026: Wochen mit 2 harten Einheiten gingen mit schlechterer Erholung in der Woche danach einher, üblich sind 1 – höchstens eine\.$/);
  assert.equal(mit(vertr("3", "2", "2")).harte, 2, "erst ab 3 schlechter: 2 bleiben");
  assert.equal(mit(vertr(null, "4+", "2")).harte, 2);
  assert.match(art(mit(vertr(null, "4+", "2")), "vertraeglich").text, /^Deine Daten bis 22\.11\.2026: bisher verträglich bis 4\+ harte Einheiten pro Woche, üblich sind 2 – zwei bleiben\. Mehr plant «Automatisch» nicht\.$/);
  assert.equal(mit({ dim: { harte: { bezug: null } } }).harte, 2);
});

test("Zeit: Triathlon unter 5 h eine harte Einheit; nur Rad oder nur Laufen wie die Vorlage", () => {
  assert.equal(V85.entscheid(basisO({ stunden: 4.5 })).harte, 1);
  assert.equal(V85.entscheid(basisO({ stunden: 4.5 })).grund, "wenig Zeit");
  assert.equal(V85.entscheid(basisO({ stunden: 5 })).harte, 2);
  assert.equal(V85.vorlage({ sportart: "rad", stunden: 5.5 }), 1); assert.equal(V85.vorlage({ sportart: "rad", stunden: 6 }), 2);
  assert.equal(V85.vorlage({ sportart: "lauf", stunden: 4.5 }), 2); assert.equal(V85.vorlage({ sportart: "lauf", stunden: 4, erholung: true }), 0);
  const r = V85.entscheid(basisO({ sportart: "rad", stunden: 5.5 }));
  assert.equal(r.harte, 1); assert.equal(r.abweichung, false, "die Vorlage hat ohnehin eine");
  assert.match(art(r, "zeit").text, /die zweite ab 6 h \(Vorlage\)/);
});

test("Erholungswoche, Taper, Rennwoche wie die Vorlage; nie mehr als die Vorlage, auch bei bester Erholung (Test C)", () => {
  const E3 = V85.ermuedung(tage(5, "vorsichtig"), 1.6);
  const er = V85.entscheid(basisO({ erholung: true, ermuedung: E3 }));
  assert.deepEqual([er.harte, er.vorlage, er.abweichung], [1, 1, false]);
  const ta = V85.entscheid(basisO({ phase: "Taper", taper: true, ermuedung: E3 }));
  assert.equal(ta.harte, 2, "im Taper bleibt die Intensität");
  const rw = V85.entscheid(basisO({ rennwoche: true }));
  assert.deepEqual([rw.harte, rw.vorlage], [0, 0]);
  const gut = V85.entscheid(basisO({ ermuedung: V85.ermuedung(tage(0), 0.7), reaktionen: { stand: "2026-11-22", vertraeglich: vertr(null, "4+", "3"), verteilung: zus("positiv", "negativ") } }));
  assert.deepEqual([gut.modell, gut.harte, gut.abweichung], ["polarisiert", 2, false]);
});

test("Block: die Verteilung wechselt nur zu Beginn eines Blocks – Stichtag = Sonntag vor dem Block, höchstens der Sonntag vor der laufenden Woche", () => {
  const W = [["2026-11-09", true], ["2026-11-16", false], ["2026-11-23", false], ["2026-11-30", false], ["2026-12-07", true], ["2026-12-14", false]].map(([woche, erholung]) => ({ woche, erholung }));
  assert.equal(V85.blockStart(W, "2026-11-30"), "2026-11-16");
  assert.equal(V85.blockStart(W, "2026-12-07"), "2026-11-16", "die Erholungswoche schliesst ihren Block ab");
  assert.equal(V85.blockStart(W, "2026-12-14"), "2026-12-14");
  assert.equal(V85.blockStart([], "2026-11-30"), "2026-11-30");
  assert.equal(V85.stichtag(W, "2026-11-30", "2026-12-02"), "2026-11-15");
  assert.equal(V85.stichtag(W, "2026-12-14", "2026-12-02"), "2026-11-29", "nächster Block: Daten bis zum letzten Sonntag");
});

test("Block im 3:1-Rhythmus auch ohne die Wochen davor (Grundlage ohne festen Beginn): Erholungswoche als Anker", () => {
  const W = [{ woche: "2026-11-16", erholung: false }, { woche: "2026-11-23", erholung: false }, { woche: "2026-11-30", erholung: false }, { woche: "2026-12-07", erholung: true, grund: "Rhythmus 3:1" }];
  assert.equal(V85.anker(W), "2026-12-07");
  assert.equal(V85.blockStart(W, "2026-11-16", "2026-12-07"), "2026-11-16", "die Woche davor war im Rhythmus eine Erholungswoche");
  assert.equal(V85.blockStart(W, "2026-11-30", "2026-12-07"), "2026-11-16");
  assert.equal(V85.blockStart([{ woche: "2026-11-23", erholung: false }], "2026-11-23", "2026-12-07"), "2026-11-16", "vor der Liste nach dem Rhythmus");
  assert.equal(V85.stichtag(W, "2026-11-23", "2026-11-25", "2026-12-07"), "2026-11-15");
});

test("Verteilung zählt nur, wenn sie nicht von den Blockgrenzen abhängt (verteilung-1.1 in js/v82.js): Text und Entscheid", () => {
  const z = (status, ein) => ({ zusammenhang: [Object.assign({ x: "hart", marker: "dRad", n: 15, status, rho: -0.51, ki: [-0.76, -0.1] }, ein),
    { x: "mittel", marker: "dRad", n: 15, status: "kein klarer", rho: 0, ki: [-0.49, 0.48], einteilungen: { von: 4, negativ: 0, positiv: 0, rho: [-0.12, 0.03], n: [14, 19] } }] });
  const instabil = V85.entscheid(basisO({ reaktionen: { stand: "2026-11-15", verteilung: z("kein klarer", { instabil: true, einteilungen: { von: 4, negativ: 1, positiv: 0, rho: [-0.51, 0.07], n: [14, 19] } }) } }));
  assert.equal(instabil.modell, "polarisiert");
  assert.match(art(instabil, "verteilung").text, /^Deine Daten bis 15\.11\.2026: kein klarer Zusammenhang zwischen Verteilung und Rad-Effizienz \(Anteil hart: Rangkorrelation −0,51 bis 0,07 je nach Einteilung der Blöcke, n = 14–19\); was sich zeigte, hängt davon ab, wo die Blöcke beginnen, und zählt darum nicht – bleibt polarisiert\.$/);
  const klar = V85.entscheid(basisO({ reaktionen: { stand: "2026-11-15", verteilung: z("negativ", { einteilungen: { von: 4, negativ: 3, positiv: 0, rho: [-0.6, -0.3], n: [14, 19] } }) } }));
  assert.equal(klar.modell, "pyramidal");
  assert.match(art(klar, "verteilung").text, /\(Rangkorrelation −0,51, 90-%-Intervall −0,76 bis −0,10, n = 15; klar in 3 von 4 Einteilungen der Blöcke\)\. Darum am Rad Schwelle statt VO2max/);
});

test("V64.woche mit «Automatisch»: eine harte Einheit an Land = harter Lauf locker (gleiche Dauer), Rad bleibt, nichts länger", () => {
  const ctx = { woche: MO, phase: "Grundlage", stunden: 10, modell: "polarisiert", abwechslung: true };
  const zwei = V64.woche(ctx), eine = V64.woche(Object.assign({}, ctx, { harte: 1, autoGrund: "Ermüdung der Vorwoche" }));
  const hartLand = (w) => w.tage.flatMap((t) => t.einheiten).filter((e) => e.schluessel && (e.sport === "rad" || e.sport === "lauf"));
  assert.equal(hartLand(zwei).length, 2); assert.equal(hartLand(eine).length, 1);
  assert.equal(hartLand(eine)[0].sport, "rad");
  const di0 = zwei.tage[1].einheiten.find((e) => e.sport === "lauf"), di1 = eine.tage[1].einheiten.find((e) => e.sport === "lauf");
  assert.equal(di1.id, "lauf_locker"); assert.equal(di1.dauer, di0.dauer);
  assert.deepEqual(di1.auto, { statt: di0.titel, grund: "Ermüdung der Vorwoche" });
  assert.equal(eine.minuten.total, zwei.minuten.total);
  assert.ok(eine.hinweise.some((h) => /^Automatisch: Laufen locker statt «.+» – diese Woche eine harte Einheit an Land \(Ermüdung der Vorwoche\)$/.test(h)), eine.hinweise.join(" | "));
  assert.equal(eine.harte, 1); assert.equal(zwei.harte, null);
  // Erholungswoche: unverändert (die Vorlage hat ohnehin nur die Rad-Schlüsseleinheit)
  const e0 = V64.woche(Object.assign({}, ctx, { erholung: true })), e1 = V64.woche(Object.assign({}, ctx, { erholung: true, harte: 1 }));
  assert.equal(JSON.stringify(e1.tage), JSON.stringify(e0.tage));
  // Laufen schon auf «locker» begrenzt (Intensität je Sportart): nichts zu tun
  const lk = V64.woche(Object.assign({}, ctx, { harte: 1, intensitaet: { lauf: "locker" } }));
  assert.ok(!lk.hinweise.some((h) => /^Automatisch/.test(h)));
});

test("V64.woche nur Rad mit «Automatisch»: eine harte Einheit = keine zweite Schlüsseleinheit, Zeit bleibt in der Woche", () => {
  const ctx = { woche: MO, phase: "Grundlage", stunden: 8, modell: "polarisiert", sportart: "rad", aufteilung: { schwimm: 0, rad: 1, lauf: 0 } };
  const zwei = V64.woche(ctx), eine = V64.woche(Object.assign({}, ctx, { harte: 1 }));
  const k = (w) => w.tage.flatMap((t) => t.einheiten).filter((e) => e.schluessel).length;
  assert.deepEqual([k(zwei), k(eine)], [2, 1]);
  assert.ok(Math.abs(eine.minuten.total - zwei.minuten.total) <= 30, `${eine.minuten.total} gegen ${zwei.minuten.total}`);
  assert.ok(eine.minuten.total <= 8 * 60 + 15);
  assert.ok(eine.hinweise.some((h) => /^Automatisch: keine zweite Schlüsseleinheit/.test(h)));
});

test("Modellwahl: «Automatisch» ist wählbar, startet wie «kombiniert» und ist kein Standard", () => {
  assert.ok(V64.REIHE.includes("automatisch"));
  assert.equal(V64.MODELLE.kombiniert.standard, true); assert.ok(!V64.MODELLE.automatisch.standard);
  const w = V64.wahl({ modell: "automatisch", wechsel: "2027-02-01" }, "2027-06-06", MO);
  assert.equal(w.modell, "automatisch");
  assert.equal(V64.modellFuer(w, "2027-01-25"), "polarisiert"); assert.equal(V64.modellFuer(w, "2027-02-01"), "rennspezifisch");
  assert.equal(V64.modellFuer({ modell: "pyramidal" }, MO), "pyramidal");
});
