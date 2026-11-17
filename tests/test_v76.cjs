/* Abnahmetests V7.6 – Krafttraining als feste Zusatzeinheit (kraft-plan-1.0, js/v76.js). Nur erfundene Werte. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V75 = require("../js/v75.js");
const V76 = require("../js/v76.js");

const MO = "2026-11-23";                                            // Montag einer erfundenen Woche
const kraftEintrag = (felder, am, alt) => V75.eintrag("pe-kraft", Object.assign({ aktiv: true, wt: 3, uhrzeit: "18:00", dauer: 90, notiz: null }, felder), am, alt);
const E = (daten, geraet, opt) => V75.einstellungen(daten || [], geraet || [], opt || {});
const woche = (o) => V64.woche(Object.assign({ woche: MO, stunden: 9, phase: "Grundlage" }, o || {}));

test("kraft-plan-1.0: Termin an jedem Wochentag, Uhrzeit und Standard-Dauer 1:30 h", () => {
  for (let wt = 1; wt <= 7; wt++) {
    const t = V76.termin(E([kraftEintrag({ wt, uhrzeit: null, dauer: undefined })]), MO);
    assert.equal(t.date, V64.addDays(MO, wt - 1));
    assert.equal(t.regel, t.date);
    assert.equal(t.dauer, 90);
    assert.equal(t.uhrzeit, null);
    const w = V76.einplanen(woche(), E([kraftEintrag({ wt })]));
    const tag = w.tage[wt - 1], k = tag.einheiten.filter((e) => e.kraft_plan);
    assert.equal(k.length, 1, "genau ein Krafttraining am Tag " + wt);
    assert.equal(k[0].titel, "Krafttraining");
    assert.equal(k[0].uhrzeit, "18:00");
    assert.equal(k[0].sport, "kraft");
    assert.equal(tag.ruhetag, false);
    assert.equal(w.tage.filter((x) => x.einheiten.some((e) => e.kraft_plan)).length, 1, "an keinem anderen Tag");
  }
  assert.equal(V76.termin(E([]), MO), null, "ohne Einstellung kein Termin");
  assert.equal(V76.termin(E([kraftEintrag({ aktiv: false })]), MO), null, "ausgeschaltet");
  assert.equal(V76.text(E([kraftEintrag({ wt: 2, uhrzeit: "07:30", dauer: 45 })]).kraft), "Dienstag 07:30 · 45 min");
  assert.equal(V76.text(E([kraftEintrag({})]).kraft), "Mittwoch 18:00 · 1:30 h");
});

test("kraft-plan-1.0: zählt nicht zu den Wochenstunden und hat keine TL ≈, geht nicht an Garmin", () => {
  const w0 = woche(), w = V76.einplanen(w0, E([kraftEintrag({ wt: 4 })]));
  assert.deepEqual(w.minuten, w0.minuten, "Stunden je Sportart unverändert");
  const k = w.tage[3].einheiten.find((e) => e.kraft_plan);
  const S = V66.schaetzung(k, {});
  assert.equal(S.tl, null);
  assert.equal(S.km, null);
  // Mein Plan zählt die Minuten nur für Schwimmen, Rad und Laufen
  const M = V66.meinPlan(w, { id: "wo-" + MO, montag: MO, ganz: true, tage: Object.fromEntries(w.tage.map((t) => [t.date, { einheiten: t.einheiten.map((e, i) => (e.spec ? Object.assign({}, e.spec) : { uid: `v-${t.date}-${i}`, vorlage: e.id, dauer: e.dauer, quelle: "vorschlag" })) }])) }, {});
  assert.equal(M.tage[3].einheiten.find((e) => e.sport === "kraft").titel, "Krafttraining");
  assert.equal(M.tage[3].einheiten.find((e) => e.sport === "kraft").uhrzeit, "18:00", "festgehalten mit Uhrzeit");
  // Garmin-Auftrag: Krafttraining wird nicht gesendet, mit Grund
  const A = V66.garminAuftrag(w.tage[3].date, [Object.assign({}, k, { uid: "v-1" })], {}, "senden", "2026-11-20T10:00:00Z", {});
  assert.equal(A.einheiten.length, 0);
  assert.deepEqual(A.ohne.map((x) => x.titel), ["Krafttraining"]);
});

test("kraft-plan-1.0: belegt seine Zeit am Tag – beim Verteilen bleibt es dort, andere Einheiten weichen aus", () => {
  const w = V76.einplanen(woche(), E([kraftEintrag({ wt: 3 })]));
  const mi = w.tage[2];
  assert.ok(mi.einheiten.length >= 2, "Mittwoch mit einer Ausdauereinheit und dem Krafttraining");
  const verf = (d) => (d === mi.date ? { min: 120, sport: null, quelle: "tag" } : null);
  const r = V66.wocheVerteilt(w, verf, {});
  const t = r.tage.find((x) => x.date === mi.date);
  assert.ok(t.einheiten.some((e) => e.sport === "kraft"), "Krafttraining bleibt am Mittwoch");
  assert.ok(t.einheiten.reduce((s, e) => s + e.dauer, 0) <= 120, "nicht mehr als die verfügbare Zeit");
  assert.ok(r.tage.some((x) => x.date !== mi.date && x.einheiten.some((e) => e.titel === mi.einheiten.find((y) => y.sport !== "kraft").titel)), "die andere Einheit steht an einem anderen Tag");
  assert.ok(!r.tage.some((x) => x.date !== mi.date && x.einheiten.some((e) => e.sport === "kraft")), "Krafttraining wird nie verschoben");
});

test("kraft-plan-1.0: Ausnahme einer Woche – auslassen oder anderer Tag, sonst die Regel", () => {
  const ausnahme = (felder) => V75.eintrag("pe-kraft-" + MO, felder, "2026-11-18T09:00:00Z");
  const D = [kraftEintrag({ wt: 3 }, "2026-11-10T10:00:00Z")];
  const aus = V76.einplanen(woche(), E(D, [ausnahme({ aus: true })]));
  assert.ok(!aus.tage.some((t) => t.einheiten.some((e) => e.kraft_plan)));
  assert.equal(aus.kraft.status, "aus");
  assert.ok(aus.hinweise.some((h) => /ausgelassen/.test(h)));
  const tag = V76.einplanen(woche(), E(D, [ausnahme({ tag: V64.addDays(MO, 4), uhrzeit: "07:00" })]));
  const fr = tag.tage[4].einheiten.find((e) => e.kraft_plan);
  assert.ok(fr && fr.uhrzeit === "07:00", "am Freitag um 07:00");
  assert.ok(!tag.tage[2].einheiten.some((e) => e.kraft_plan), "nicht mehr am Mittwoch");
  assert.equal(V76.termin(E(D, [ausnahme({ tag: V64.addDays(MO, 4) })]), MO).verschoben, true);
  const zurueck = V76.einplanen(woche(), E(D, [ausnahme({ entfernt: true })]));
  assert.ok(zurueck.tage[2].einheiten.some((e) => e.kraft_plan), "zurück zur Regel");
  const naechste = V76.einplanen(woche({ woche: V64.addDays(MO, 7) }), E(D, [ausnahme({ aus: true })]));
  assert.ok(naechste.tage[2].einheiten.some((e) => e.kraft_plan), "die Ausnahme gilt nur für ihre Woche");
  assert.deepEqual(V76.ausnahmen(E(D, [ausnahme({ aus: true })]), MO).map((a) => a.mo), [MO]);
  assert.deepEqual(V76.ausnahmen(E(D, [ausnahme({ aus: true })]), V64.addDays(MO, 7)), []);
});

test("kraft-plan-1.0: gilt ab der Woche nach dem Speichern – auch wenn die Daten nur noch die neueste Fassung haben (vorher)", () => {
  const alt = kraftEintrag({ wt: 3, dauer: 90 }, "2026-11-10T10:00:00.000Z");            // vor dem Montag der laufenden Woche
  const neu = kraftEintrag({ wt: 5, dauer: 60 }, "2026-11-18T10:00:00.000Z", alt);        // Mittwoch der Woche vom 16.11.
  assert.equal(neu.vorher.wt, 3);
  assert.equal(V75.pruefen(neu), null);
  // nach dem Update steht nur noch die neueste Fassung in den Daten
  const laufend = E([neu], [], { startBis: "2026-11-16", montag: "2026-11-16" }), naechste = E([neu], [], { startBis: MO, montag: MO });
  assert.equal(laufend.kraft.wt, 3, "die laufende Woche behält den bisherigen Termin");
  assert.equal(naechste.kraft.wt, 5, "ab der nächsten Woche der neue");
  assert.equal(naechste.kraft.dauer, 60);
  // zweimal in derselben Woche geändert: vorher bleibt die Fassung von vor dem Montag
  const noch = kraftEintrag({ wt: 6 }, "2026-11-19T10:00:00.000Z", neu);
  assert.equal(noch.vorher.wt, 3);
  assert.equal(E([noch], [], { startBis: "2026-11-16", montag: "2026-11-16" }).kraft.wt, 3);
  // erster Termin überhaupt: die laufende Woche bleibt ohne
  const erst = kraftEintrag({ wt: 2 }, "2026-11-18T10:00:00.000Z", null);
  assert.equal(erst.vorher, undefined);
  assert.equal(E([erst], [], { startBis: "2026-11-16", montag: "2026-11-16" }).kraft.aktiv, false);
  // gleiche Regel für Start und Basis-Fitness, nicht für die Steigerung
  const s1 = V75.eintrag("pe-start", { art: "aufteilung" }, "2026-11-30T08:00:00.000Z"), s2 = V75.eintrag("pe-start", { art: "fitness" }, "2026-12-09T08:00:00.000Z", s1);
  assert.equal(E([s2], [], { startBis: "2026-12-07", montag: "2026-12-07" }).start, "aufteilung");
  assert.equal(V75.eintrag("pe-steigerung", { wert: 120 }, "2026-12-09T08:00:00.000Z", V75.eintrag("pe-steigerung", { wert: 100 }, "2026-11-30T08:00:00.000Z")).vorher, undefined);
  assert.equal(V75.aktuell([alt], [neu, noch], "pe-kraft").wt, 6);
});

test("kraft-plan-1.0: Prüfung der Einträge (wie merge_daily.planeinstellung_pruefen)", () => {
  assert.equal(V75.pruefen({ id: "pe-kraft", aktiv: true, wt: 3, uhrzeit: "18:00", dauer: 90, notiz: "Kniebeugen" }), null);
  assert.match(V75.pruefen({ id: "pe-kraft", aktiv: true }), /Wochentag/);
  assert.match(V75.pruefen({ id: "pe-kraft", aktiv: true, wt: 3, dauer: 200 }), /Dauer/);
  assert.match(V75.pruefen({ id: "pe-kraft", aktiv: true, wt: 3, uhrzeit: "18:07" }), /Uhrzeit/);
  assert.match(V75.pruefen({ id: "pe-kraft-2026-11-24", aus: true }), /Montag/);
  assert.match(V75.pruefen({ id: "pe-kraft-" + MO, tag: "2026-12-01" }), /Tag in dieser Woche/);
  assert.match(V75.pruefen({ id: "pe-kraft-" + MO }), /auslassen oder einen Tag/);
  assert.equal(V75.pruefen({ id: "pe-kraft-" + MO, entfernt: true }), null);
  assert.match(V75.pruefen({ id: "pe-steigerung", wert: 100, vorher: { wert: 90, geaendert: "2026-11-10T10:00:00Z" } }), /vorherige Fassung/);
});

test("kraft-plan-1.0: Erholungswoche und Rennwoche – der Termin steht bis zur Abstimmung (Vorschlag offen) unverändert im Plan", () => {
  const Ek = E([kraftEintrag({ wt: 3 })]);
  const erh = V76.einplanen(woche({ erholung: true }), Ek);
  assert.equal(erh.tage[2].einheiten.find((e) => e.kraft_plan).dauer, 90);
  // Testtag: Krafttraining kommt als eigene Einheit dazu, ersetzt den Test nicht
  const mitTest = V76.einplanen(woche({ tests: [{ date: V64.addDays(MO, 2), kind: "css", status: "geplant" }] }), Ek);
  assert.ok(mitTest.tage[2].einheiten.some((e) => e.art === "test") && mitTest.tage[2].einheiten.some((e) => e.kraft_plan));
});

test("kraft-plan-1.0: sRPE = RPE × Minuten (Foster), Garmin-Aktivität «Krafttraining» des Tages", () => {
  assert.equal(V76.srpe(6, 90), 540);
  assert.equal(V76.srpe(0, 90), null);
  assert.equal(V76.srpe(11, 90), null);
  assert.equal(V76.srpe(5, null), null);
  const acts = [{ id: "g1", date: "2026-11-25", sport: "andere", typ: "Krafttraining", name: "Krafttrai​ning", mv: 3000 },
    { id: "g2", date: "2026-11-25", sport: "andere", typ: "Navigieren", name: "Spaziergang", mv: 6000 },
    { id: "g3", date: "2026-11-26", sport: "andere", typ: "Strength", name: "Kraft", dur: 1800 }];
  assert.equal(V76.aktivitaet(acts, "2026-11-25").id, "g1");
  assert.equal(V76.aktivitaet(acts, "2026-11-26").id, "g3");
  assert.equal(V76.aktivitaet(acts, "2026-11-27"), null);
});
