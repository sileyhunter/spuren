"use strict";
/* V9.26.3 loeschen-endgueltig-1.0 (Silas 28.11.2026, Bildschirmaufnahme): «Löschen» einer Einheit wirkte nicht – die Einheit stand danach wieder da
   («Nichts zu verschieben», Wochenlast unverändert). Zwei Ursachen, beide hier nachgestellt (alles erfunden):
   1. Eine lange Einheit, die nirgends zu drei Vierteln Platz hat, wird «Grundlage» (tagesregel-1.0). Die Streichung merkte sich «Grundlage», der Vorschlag
      enthielt aber noch die lange Einheit – sie wurde wieder eingesetzt, eine andere Grundlage der Woche fiel weg.
   2. Eine zusätzliche Einheit (Zeit als Ziel) kannte keine Streichung – der nächste Planerlauf setzte sie wieder ein. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");

const START = "2026-11-30", W3 = "2026-12-14";
const T = Array.from({ length: 7 }, (_, i) => addDays(W3, i)), SA = T[5], SO = T[6];
const E = (sim) => sim.win.V64UI.planEintrag(W3);
const plan = (sim, d) => sim.plan(d).plan;
const wocheText = (sim) => JSON.stringify(T.map((d) => plan(sim, d).map((x) => `${x.id}/${x.dauer}/${x.quelle}`)));
const vf = (sim, d, min) => sim.win.V66.vfEintrag({ date: d }, { min, sport: null }, "2026-12-14T06:00:00.000Z");
const planen = async (sim, opt) => { const f = await sim.win.V66UI.planen(W3, opt); sim.S.neu(); return f; };
const anzahl = (sim, id, quelle) => T.reduce((s, d) => s + plan(sim, d).filter((x) => x.id === id && (!quelle || x.quelle === quelle)).length, 0);

/* Samstag frei, Sonntag 5:30 h mit zwei eigenen Einheiten: die lange Ausfahrt des Vorschlags hat nirgends zu drei Vierteln Platz und wird «Grundlage» (105 min). */
async function aufbau() {
  const sim = simulator({ start: START }); await sim.tage(START, 14); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI;
  assert.equal(await planen(sim, { vf: [vf(sim, SA, 0), vf(sim, SO, 330)] }), null);
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: SO, einheit: { vorlage: "rad_lang", dauer: 150 } }), null); sim.S.neu();
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: SO, einheit: { vorlage: "lauf_lang", dauer: 75 } }), null); sim.S.neu();
  const tag = T.find((d) => plan(sim, d).some((x) => x.id === "rad_locker" && x.dauer === 105 && x.quelle === "vorschlag"));
  assert.ok(tag, "Ausgangslage: eine umbenannte «Grundlage» 105 min steht in der Woche: " + wocheText(sim));
  return { sim, U, tag, x: plan(sim, tag).find((y) => y.id === "rad_locker" && y.dauer === 105) };
}

test("Ursache 1: die umbenannte Grundlage merkt sich, für welche Einheit des Vorschlags sie steht", async () => {
  const { sim, tag, x } = await aufbau();
  const s = E(sim).tage[tag].einheiten.find((y) => y.uid === x.uid);
  assert.equal(s.statt, "rad_lang", "gespeichert: steht für die lange Ausfahrt des Vorschlags: " + JSON.stringify(s));
  assert.match(E(sim).verteilung.meldungen.join(" | "), /als «Grundlage» 105 statt/);
});

test("Löschen wirkt: die umbenannte Grundlage ist weg, keine lange Ausfahrt und keine andere Grundlage als Ersatz, sonst ändert sich nichts", async () => {
  const { sim, U, tag, x } = await aufbau();
  const alle = () => T.flatMap((d) => plan(sim, d).map((y) => `${y.id}/${y.dauer}/${y.quelle}`)).sort();
  const vorher = T.flatMap((d) => plan(sim, d).filter((y) => y.uid !== x.uid).map((y) => `${y.id}/${y.dauer}/${y.quelle}`)).sort();
  const grundlageVor = anzahl(sim, "rad_locker"), langVor = anzahl(sim, "rad_lang", "vorschlag");
  assert.equal(await U.aendern(W3, { art: "entfernen", date: tag, uid: x.uid }), null); sim.S.neu();
  assert.equal(anzahl(sim, "rad_locker"), grundlageVor - 1, "genau eine Grundlage weniger: " + wocheText(sim));
  assert.equal(anzahl(sim, "rad_lang", "vorschlag"), langVor, "die lange Ausfahrt kommt nicht als Ersatz zurück: " + wocheText(sim));
  assert.deepEqual(alle(), vorher, "nichts kommt dazu, nichts anderes fällt weg (Einheiten dürfen in die freie Zeit rutschen, der Bericht nennt es)");
  assert.deepEqual(E(sim).gestrichen.map((g) => g.vorlage), ["rad_lang"], "die Streichung gilt der Einheit des Vorschlags");
  const B = U.bericht();
  assert.ok(B.zeilen.some((z) => /«Grundlage» \(\w\w\) entfällt/.test(z)), "der Bericht sagt, was gelöscht wurde: " + JSON.stringify(B.zeilen));
  assert.ok(!B.zeilen.some((z) => /neu am/.test(z)) && !B.fehlt, "nichts Neues, nichts fehlt: " + JSON.stringify(B));
  assert.ok(B.nachher.tl < B.vorher.tl && B.nachher.min < B.vorher.min, `Wochenlast sinkt (${B.vorher.tl} → ${B.nachher.tl} TL)`);
});

test("Löschen bleibt: weitere Änderungen holen die Einheit nicht zurück; ↶ stellt sie her; «Neu berechnen» und «Ausgleichen» bringen sie zurück", async () => {
  const { sim, U, tag, x } = await aufbau();
  const vorher = wocheText(sim);
  assert.equal(await U.aendern(W3, { art: "entfernen", date: tag, uid: x.uid }), null); sim.S.neu();
  const nachher = wocheText(sim), n = anzahl(sim, "rad_locker"), l = anzahl(sim, "rad_lang", "vorschlag");
  assert.notEqual(nachher, vorher);
  assert.equal(await planen(sim, { vf: [vf(sim, T[1], 120)] }), null);
  assert.equal(anzahl(sim, "rad_locker"), n, "bleibt weg nach einer weiteren Änderung: " + wocheText(sim));
  assert.equal(anzahl(sim, "rad_lang", "vorschlag"), l);
  assert.equal(await U.rueckgaengig(), null); sim.S.neu();                       // nimmt nur die Zeit am Dienstag zurück
  assert.equal(anzahl(sim, "rad_locker"), n, "↶ der Zeit lässt die Streichung bestehen");
  assert.equal(await U.ausgleichen(W3), null); sim.S.neu();
  assert.ok(anzahl(sim, "rad_locker") + anzahl(sim, "rad_lang", "vorschlag") > n + l, "«Ausgleichen» bringt die gestrichene Einheit zurück: " + wocheText(sim));
  assert.ok(!E(sim) || !E(sim).gestrichen);
  // ↶ direkt nach dem Löschen: Ausgangswoche
  const s2 = await aufbau();
  assert.equal(await s2.U.aendern(W3, { art: "entfernen", date: s2.tag, uid: s2.x.uid }), null); s2.sim.S.neu();
  assert.equal(await s2.U.rueckgaengig(), null); s2.sim.S.neu();
  assert.equal(wocheText(s2.sim), vorher, "↶ stellt die Woche vor dem Löschen her");
  // «Neu berechnen» vergisst die Streichung
  assert.equal(await s2.U.aendern(W3, { art: "entfernen", date: s2.tag, uid: s2.x.uid }), null); s2.sim.S.neu();
  assert.equal(await s2.U.aendern(W3, { art: "neuberechnen" }), null); s2.sim.S.neu();
  assert.ok(anzahl(s2.sim, "rad_locker") + anzahl(s2.sim, "rad_lang", "vorschlag") >= n + l + 1, "«Neu berechnen» vergisst die Streichung: " + wocheText(s2.sim));
});

test("Ursache 2: eine zusätzliche Einheit (Zeit als Ziel) bleibt gelöscht, wenn Silas sie löscht", () => {
  const MO = "2026-11-16", d = (i) => addDays(MO, i);
  const IF = { z1: 0.55, z2: 0.7, renntempo: 0.78, z3: 0.85, z3o: 0.95, vo2: 1.1, pause: 0.5, css: 0.95, abc: 0.6 };
  const tl = (e) => (e && Array.isArray(e.teile) ? e.teile.reduce((s, [k, m]) => s + (m / 60) * (IF[k] || 0.7) ** 2 * 100, 0) : null);
  const R = { [d(2)]: [V64.einheit("schwimm_locker", { d: 90 })], [d(5)]: [V64.einheit("rad_lang", { d: 180 })] };
  const verf = V66.verfuegbarkeit([0, 0, 200, 0, 0, 180, 0].map((min, i) => V66.vfEintrag({ date: d(i) }, { min, sport: null }, "2026-11-16T06:00:00Z")));
  const vor = Object.values(R).flat().reduce((s, e) => s + (tl(e) || 0), 0);
  const ctx = { heute: MO, montag: MO, roh: (x) => R[x] || [], verf, o: {}, jetzt: "2026-11-16T07:00:00Z", ziel: { tl, tlMax: vor + 100, aus: null, minuten: { schwimm: 90, rad: 400, lauf: 0 } } };
  const E1 = V66.aendern(null, { art: "umplanen" }, ctx).eintrag;
  const z = E1.tage[d(2)].einheiten.find((s) => s.zusatz);
  assert.ok(z && z.vorlage === "rad_locker", "Ausgangslage: Zeit als Ziel setzt am Mittwoch eine zusätzliche Grundlage");
  const E2 = V66.aendern(E1, { art: "entfernen", date: d(2), uid: z.uid }, ctx).eintrag;
  assert.deepEqual(E2.gestrichen, [{ vorlage: "rad_locker", date: d(2), zusatz: true }]);
  const E3 = V66.aendern(E2, { art: "umplanen" }, ctx).eintrag;
  assert.deepEqual(E3.tage[d(2)].einheiten.map((s) => s.vorlage), ["schwimm_locker"], "nach dem nächsten Planerlauf steht sie nicht wieder da");
  assert.ok(!Object.values(E3.tage).some((t) => t.einheiten.some((s) => s.zusatz && s.vorlage === "rad_locker" && t === E3.tage[d(2)])));
  // eine andere Sportart darf am selben Tag weiter dazukommen? Nein – gelöscht ist gelöscht für diese Sportart; «Ausgleichen» holt es zurück
  const E4 = V66.aendern(E3, { art: "umplanen", ausgleichen: true }, ctx).eintrag;
  assert.ok(E4.tage[d(2)].einheiten.some((s) => s.zusatz), "«Ausgleichen» lässt Zeit als Ziel wieder zu");
  assert.ok(!E4.gestrichen);
});

test("merge_daily: Streichung einer zusätzlichen Einheit trägt zusatz: true (optionales Feld)", () => {
  const fs = require("node:fs");
  const py = fs.readFileSync("tools/merge_daily.py", "utf8");
  assert.match(py, /x\.get\("zusatz"\) is not None and x\.get\("zusatz"\) is not True/);
});

test("«Woche leeren» merkt sich dieselben Streichungen: umbenannte Grundlage und zusätzliche Einheit kommen nicht wieder", async () => {
  const { sim, U } = await aufbau();
  const vorher = T.reduce((n, d) => n + plan(sim, d).filter((x) => x.dauer > 0).length, 0);
  assert.ok(vorher > 0);
  assert.equal(await U.aendern(W3, { art: "leeren" }), null); sim.S.neu();
  assert.equal(T.reduce((n, d) => n + plan(sim, d).filter((y) => y.quelle === "vorschlag").length, 0), 0, "nach dem Leeren und dem nächsten Planerlauf bleibt die Woche leer: " + wocheText(sim));
  assert.ok(E(sim).gestrichen.some((g) => g.vorlage === "rad_lang"), "die umbenannte Grundlage ist als «rad_lang» gestrichen");
});
