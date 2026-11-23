/* V9.11.0 Planer-Regel «Woche geht nicht auf» (Auftrag 23.11.2026, Punkt 3.4; Aufnahmen 22:18–22:36): tagesregel-1.0.
   Mo–Fr höchstens 2 Einheiten am Tag (Zeit von Hand gesetzt: Silas entscheidet, die Seite meldet es), nie zweimal Schwimmen am Tag (zusammenlegen),
   nie zwei störende harte am Tag (Schlüsseleinheit hat Vorrang vor der Regel – gemeldet), «Lange Ausfahrt» höchstens um ein Viertel gekürzt, sonst «Grundlage»
   oder Frage; Vorschläge im Dialog nennen, was sie auslösen. Reine Rechentests und ein Durchlauf des Dialogs im Simulator. Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V92 = require("../js/v92.js");

const MO = "2026-11-16", d = (i) => addDays(MO, i);                      // MO = Montag
const e = (id, dd) => V64.einheit(id, dd ? { d: dd } : {});
const idx = (x) => Math.round((Date.parse(x) - Date.parse(MO)) / 864e5);
// Zeit je Tag (min, null = nicht festgelegt); hand = Tage (0–6), an denen die Zeit von Hand gesetzt ist (quelle «tag»), sonst Standard des Wochentags
const verfAus = (min, hand) => (x) => { const i = idx(x); return min[i] == null ? null : { min: min[i], sport: null, quelle: (hand || []).includes(i) ? "tag" : "wochentag", id: "vf-" + x }; };
const lauf = (R, verf) => V66.aendern(null, { art: "umplanen" }, { heute: MO, montag: MO, roh: (x) => R[x] || [], verf, o: {}, tl: () => null, ziel: null, jetzt: "2026-11-16T07:00:00Z" }).eintrag;
const tag = (E, i) => (E.tage[d(i)] ? E.tage[d(i)].einheiten.map((s) => `${s.vorlage}/${s.dauer}`) : []);
const alleE = (E) => Array.from({ length: 7 }, (_, i) => tag(E, i));
const zahl = (E) => alleE(E).reduce((s, L) => s + L.length, 0);
const ALLE = (min) => Array(7).fill(min);

test("Version und Festlegungen", () => {
  assert.equal(V66.VERSIONS.tagesregel, "tagesregel-1.0");
  assert.deepEqual([V66.TAGESMAX, V66.LANG_ANTEIL, V66.LANG_UMBENENNEN], [2, 0.75, 0.5]);
});

test("Mo–Fr höchstens 2 Einheiten am Tag: die dritte kommt an einen anderen Tag, nichts geht verloren", () => {
  const R = { [d(2)]: [e("rad_locker", 60), e("lauf_locker", 45), e("schwimm_locker", 45)] };
  const E = lauf(R, verfAus(ALLE(240)));
  const T = alleE(E);
  assert.equal(zahl(E), 3, "alle drei stehen in der Woche");
  for (let i = 0; i < 5; i++) assert.ok(T[i].length <= 2, `Tag ${i}: ${T[i].length} Einheiten`);
  assert.ok(!E.verteilung.fehlt && !E.verteilung.dritte, "nichts fehlt, keine Ausnahme");
});

test("Sa und So sind von der Zwei-Einheiten-Regel ausgenommen", () => {
  const R = { [d(5)]: [e("rad_locker", 60), e("lauf_locker", 45), e("schwimm_locker", 45)] };
  const E = lauf(R, verfAus([0, 0, 0, 0, 0, 300, 0]));
  assert.deepEqual(tag(E, 5).map((x) => x.split("/")[0]).sort(), ["lauf_locker", "rad_locker", "schwimm_locker"]);
  assert.ok(!E.verteilung.dritte, "am Wochenende keine Meldung");
});

test("nie zweimal Schwimmen am Tag: die lockere Schwimmeinheit wandert, CSS bleibt", () => {
  const R = { [d(2)]: [e("schwimm_css_200"), e("schwimm_locker", 45)] };
  const E = lauf(R, verfAus(ALLE(240)));
  const T = alleE(E);
  for (let i = 0; i < 7; i++) assert.ok(T[i].filter((x) => x.startsWith("schwimm")).length <= 1, `Tag ${i}: ${T[i]}`);
  assert.equal(zahl(E), 2); assert.ok(!E.verteilung.fehlt);
});

test("zusammenlegen: hat die zweite lockere Schwimmeinheit nur dort Platz, wo schon geschwommen wird, wird es eine längere", () => {
  const R = { [d(2)]: [e("schwimm_locker", 45)], [d(3)]: [e("schwimm_locker", 30)] };
  const E = lauf(R, verfAus([0, 0, 240, 0, 0, 0, 0]));
  assert.deepEqual(tag(E, 2), ["schwimm_locker/75"]);
  assert.equal(zahl(E), 1); assert.ok(!E.verteilung.fehlt, "nichts fehlt");
  assert.equal(E.verteilung.zusammen.length, 1);
  assert.deepEqual([E.verteilung.zusammen[0].von, E.verteilung.zusammen[0].nach, E.verteilung.zusammen[0].date], [45, 75, d(2)]);
  assert.ok(E.verteilung.meldungen.some((m) => /zusammengelegt/.test(m) && /nie zweimal Schwimmen/.test(m)), "gemeldet");
});

test("zusammenlegen geht nicht über den Bereich der Vorlage (90 min) – dann fragt die Seite", () => {
  const R = { [d(2)]: [e("schwimm_locker", 60)], [d(3)]: [e("schwimm_locker", 45)] };
  const E = lauf(R, verfAus([0, 0, 240, 0, 0, 0, 0]));
  assert.deepEqual(tag(E, 2), ["schwimm_locker/60"]);
  assert.ok(E.verteilung.fehlt && E.verteilung.fehlt.einheiten.length === 1, "die zweite fehlt");
});

test("3. Einheit nur an einem Werktag, dessen Zeit du von Hand gesetzt hast – mit Meldung; sonst fehlt die dritte (Frage)", () => {
  const R = { [d(2)]: [e("rad_locker", 60), e("lauf_locker", 45), e("schwimm_locker", 45)] };
  const hand = lauf(R, verfAus([0, 0, 300, 0, 0, 0, 0], [2]));
  assert.equal(tag(hand, 2).length, 3, "Mittwoch von Hand: drei Einheiten");
  assert.deepEqual(hand.verteilung.dritte, [{ date: d(2), n: 3 }]);
  assert.ok(hand.verteilung.meldungen.some((m) => /Mittwoch: 3 Einheiten an einem Tag/.test(m)), "gemeldet, nie still");
  assert.ok(!hand.verteilung.fehlt);
  const std = lauf(R, verfAus([0, 0, 300, 0, 0, 0, 0], []));
  assert.equal(tag(std, 2).length, 2, "Standardtag: höchstens zwei");
  assert.ok(std.verteilung.fehlt && std.verteilung.fehlt.einheiten.length === 1, "die dritte fehlt – die Seite fragt");
  assert.ok(!std.verteilung.dritte);
});

test("«Lange Ausfahrt» nicht auf 1:30 gekürzt: bis zu einem Viertel kürzer bleibt sie lang", () => {
  const R = { [d(5)]: [e("rad_lang", 220)] };
  const a = lauf(R, verfAus([0, 0, 0, 0, 0, 180, 0]));
  assert.deepEqual(tag(a, 5), ["rad_lang/180"], "82 % ≥ 75 %: gekürzt, aber lang");
  assert.equal(V66.einheit({ vorlage: "rad_lang", dauer: 220, uid: "x", quelle: "vorschlag" }, {}).dauer, 220);
});

test("«Lange Ausfahrt» unter drei Vierteln: sie heisst «Grundlage» in der Länge des Tages (ab der Hälfte), sonst fragt die Seite", () => {
  const R = { [d(5)]: [e("rad_lang", 220)] };
  const b = lauf(R, verfAus([0, 0, 0, 0, 0, 120, 0]));
  assert.deepEqual(tag(b, 5), ["rad_locker/120"], "55 %: als Grundlage");
  assert.ok(!b.verteilung.fehlt);
  assert.ok(b.verteilung.meldungen.some((m) => /«Lange Ausfahrt» am Sa als «Grundlage» 120 statt 220 min/.test(m)), "Meldung: " + b.verteilung.meldungen.join(" | "));
  const c = lauf(R, verfAus([0, 0, 0, 0, 0, 100, 0]));
  assert.deepEqual(tag(c, 5), [], "45 %: nicht still zu einer Grundlage");
  assert.ok(c.verteilung.fehlt && c.verteilung.fehlt.einheiten[0].vorlage === "rad_lang", "die Seite fragt");
  for (const E of [lauf(R, verfAus([0, 0, 0, 0, 0, 150, 90])), b, c]) for (const T of alleE(E)) for (const x of T) if (x.startsWith("rad_lang")) assert.ok(+x.split("/")[1] >= 165, "nie unter drei Viertel: " + x);
});

test("Schlüsseleinheiten gehen vor «nicht zwei harte am Tag»: lieber zwei an einem Tag (gemeldet) als gar keine", () => {
  const R = { [d(1)]: [e("lauf_vo2_5x3")], [d(2)]: [e("rad_vo2_4x5")], [d(3)]: [e("rad_schwelle_4x10")] };
  const E = lauf(R, verfAus([0, 0, 0, 0, 0, 300, 300]));
  assert.equal(zahl(E), 3, "alle drei Schlüsseleinheiten stehen"); assert.ok(!E.verteilung.fehlt);
  assert.ok(E.verteilung.meldungen.some((m) => /zwei harte Einheiten an einem Tag/.test(m)), "gemeldet: " + E.verteilung.meldungen.join(" | "));
});

test("ohne Eingriff bleibt die übliche Woche: CSS neben dem harten Rad am selben Tag ist erlaubt", () => {
  const R = { [d(3)]: [e("rad_vo2_4x5"), e("schwimm_css_200")] };
  const E = lauf(R, verfAus(ALLE(240)));
  assert.deepEqual(tag(E, 3).map((x) => x.split("/")[0]).sort(), ["rad_vo2_4x5", "schwimm_css_200"]);
});

/* ---------------- Dialog: Vorschläge nennen, was sie auslösen ---------------- */
test("V92.hinweise: 3. Einheit und Zusammenlegen gegenüber dem Stand ohne Vorschlag; Bekanntes zählt nicht", () => {
  const basis = { fehlt: 50, dritte: [{ date: d(3), n: 3 }], zusammen: [] };
  const info = { fehlt: 0, dritte: [{ date: d(2), n: 3 }, { date: d(3), n: 3 }], zusammen: [{ titel: "Schwimmen locker", date: d(2), von: 45, nach: 75 }] };
  assert.deepEqual(V92.hinweise(info, basis), ["Mittwoch hätte dann 3 Einheiten", "«Schwimmen locker» wird am Mittwoch mit dem Schwimmen zusammengelegt (1 h 15)"]);
  assert.deepEqual(V92.hinweise({ fehlt: 0, dritte: [], zusammen: [] }, basis), []);
  assert.deepEqual(V92.hinweise(null, basis), []);
  assert.deepEqual(V92.mehrVon({ tage: [{ date: d(5), min: 200 }, { date: d(6), min: 150 }] }), { [d(5)]: 200, [d(6)]: 150 });
});

test("Dialog «Die Woche geht nicht auf» (Simulator): Vorschlag mit 3. Einheit trägt «Achtung …» und steht nach den Vorschlägen ohne", async () => {
  const START = "2026-11-30", W3 = "2026-12-14", tageW = Array.from({ length: 7 }, (_, i) => addDays(W3, i));
  const sim = simulator({ start: START }); await sim.tage(START, 14); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, sa = tageW[5], so = tageW[6];
  const vf = (x, min) => sim.win.V66.vfEintrag({ date: x }, { min, sport: null }, "2026-12-14T06:00:00.000Z");
  assert.equal(await U.planen(W3, { vf: tageW.slice(0, 5).map((x) => vf(x, 0)).concat([vf(sa, 180), vf(so, 180)]), grund: "woche" }), null); sim.S.neu();
  const D = U.frageDaten(W3); assert.ok(D && D.fehlt.min > 0);
  // Planer zur Probe ersetzt: Samstag löst eine 3. Einheit aus, Sonntag nichts (die Rechnung selbst deckt der Test oben ab)
  U.probe = () => Object.assign(() => 0, { info: (m) => ({ fehlt: 0, dritte: m[sa] != null ? [{ date: sa, n: 3 }] : [], zusammen: [] }) });
  const box = { innerHTML: "", isConnected: true, querySelectorAll: () => [], querySelector: () => null };
  const el = () => ({ onclick: null, textContent: "", hidden: false, disabled: false });
  sim.win.V59.blatt = () => ({ querySelector: (s) => (s === "[data-fzwahl]" ? box : el()), querySelectorAll: () => [] });
  sim.win.setTimeout = (f) => { f(); return 0; };                          // der Simulator führt Zeitgeber nicht aus: sofort rechnen
  sim.win.V92UI.frage(W3, D);
  const z = box.innerHTML.split("<li>").filter((x) => x.includes("data-fzja"));
  assert.ok(z.length >= 2, "zwei Vorschläge: " + box.innerHTML.slice(0, 300));
  assert.match(z[0], /Ja: Sonntag/); assert.ok(!/Achtung/.test(z[0]), "ohne 3. Einheit zuerst");
  assert.match(z[1], /Ja: Samstag/); assert.match(z[1], /Achtung:<\/b> Samstag hätte dann 3 Einheiten/);
});
