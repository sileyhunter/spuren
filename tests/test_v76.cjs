/* Abnahmetests V7.6 – Krafttraining als Zusatzeinheit (kraft-plan-1.0 fester Tag, 1.1 Tag automatisch und Abstimmung der Woche, js/v76.js);
   V7.6.1 Tage für lange Einheiten (verfuegbarkeit-1.1). Nur erfundene Werte. */
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

test("kraft-plan-1.1: fester Termin an jedem Wochentag, Uhrzeit und Standard-Dauer 1:30 h", () => {
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

const V74 = require("../js/v74.js");
const kraftWoche = (w) => w.tage.findIndex((t) => t.einheiten.some((e) => e.sport === "kraft"));
const hartLand = (e) => V66.hart(e) && (e.sport === "rad" || e.sport === "lauf");
const auto = (felder) => kraftEintrag(Object.assign({ modus: "auto", tage: [1, 2, 3, 4, 5, 6, 7], wt: null }, felder));

test("kraft-plan-1.1 (automatisch): nie vor einer harten Rad- oder Laufeinheit, nur an möglichen Tagen, lieber mit kurzer lockerer Einheit", () => {
  const w0 = woche();
  const w = V76.einplanen(w0, E([auto({ tage: [1, 2, 3, 5, 6, 7] })]));                  // Donnerstag nicht möglich
  const i = kraftWoche(w);
  assert.ok(i >= 0, "eingeplant");
  assert.notEqual(i, 3, "nicht am Donnerstag");
  const nach = w.tage[i + 1];
  assert.ok(!nach || !nach.einheiten.some(hartLand), "am Tag danach keine harte Einheit an Land");
  for (let k = 0; k < 7; k++) if (k !== i && [1, 2, 3, 5, 6, 7].includes(k + 1) && !(w0.tage[k + 1] && w0.tage[k + 1].einheiten.some(hartLand)))
    assert.ok(V76.bewerten(w0, i, 90, null) >= V76.bewerten(w0, k, 90, null), "der gewählte Tag ist der beste");
  // kurze lockere Einheit (bis 60 min) gibt Punkte, längere kosten
  const t = { tage: [{ date: MO, einheiten: [{ sport: "lauf", art: "locker", dauer: 40 }] }, { date: V64.addDays(MO, 1), einheiten: [] }] };
  const u = { tage: [{ date: MO, einheiten: [{ sport: "lauf", art: "locker", dauer: 80 }] }, { date: V64.addDays(MO, 1), einheiten: [] }] };
  assert.ok(V76.bewerten(t, 0, 90, null) > V76.bewerten(u, 0, 90, null));
  assert.equal(V76.text(E([auto({ tage: [1, 2, 3, 5, 6, 7] })]).kraft), "automatisch (Mo–Mi, Fr–So) 18:00 · 1:30 h");
  // kein Training laut Verfügbarkeit: dort nie
  const verf = (d) => (V66.wtNr(d) !== 2 ? { min: 0, sport: [] } : null);
  assert.equal(kraftWoche(V76.einplanen(w0, E([auto({})]), { verf })), 1, "nur der Dienstag ist möglich");
});

test("kraft-plan-1.1 Regel 1: fester Tag vor der harten Einheit – sie zieht beim Verteilen um, sonst wird sie locker", () => {
  const w0 = woche(), doHart = w0.tage[3].einheiten.find(hartLand);
  assert.ok(doHart, "erfundene Woche mit harter Einheit am Donnerstag");
  const w = V76.einplanen(w0, E([kraftEintrag({ wt: 3 })]));                             // Mittwoch fest
  const r = V66.wocheVerteilt(w, null, {});                                                // ohne Verfügbarkeit: nur die Regel
  assert.ok(!r.tage[3].einheiten.some(hartLand), "Donnerstag ohne harte Einheit an Land");
  assert.ok(r.tage.some((t, i) => i !== 3 && t.einheiten.some((e) => e.titel === doHart.titel)), "die harte Einheit steht an einem anderen Tag");
  assert.ok(r.tage[2].einheiten.some((e) => e.sport === "kraft"), "Krafttraining bleibt am Mittwoch");
  // nur der Donnerstag erlaubt Rad (erfunden): die harte Einheit wird dort locker
  const sp = doHart.sport, verf = (d) => (V66.wtNr(d) === 4 ? { min: null, sport: [sp] } : { min: null, sport: ["schwimm", "lauf", "rad"].filter((x) => x !== sp) });
  const r2 = V66.wocheVerteilt(w, verf, {});
  assert.ok(!r2.tage[3].einheiten.some(hartLand));
  assert.ok(r2.tage[3].einheiten.some((e) => e.sport === sp && e.art === "locker"), "locker statt hart");
  assert.ok(r2.hinweise.some((h) => /locker statt hart/.test(h)));
  // die Ampel holt keine Schlüsseleinheit am Tag nach dem Krafttraining nach
  const a = V74.woche(r, (d) => (d === r.tage[1].date ? { status: "vorsichtig", ampel: "vorsichtig", gruende: ["erfunden"] } : null));
  assert.ok(!a.tage[3].einheiten.some(hartLand));
});

test("kraft-plan-1.1 Regel 2: am Krafttag eine lockere Einheit an Land höchstens 60 min, harte Einheit mit Abstand", () => {
  const w0 = woche(), i = w0.tage.findIndex((t) => t.einheiten.some((e) => e.art === "locker" && (e.sport === "rad" || e.sport === "lauf") && e.dauer > 60));
  assert.ok(i >= 0, "erfundene Woche mit langer lockerer Einheit");
  const w = V76.abstimmen(V76.einplanen(w0, E([kraftEintrag({ wt: i + 1 })])), {});        // Regel 2 nach dem Verteilen
  assert.ok(w.tage[i].einheiten.filter((e) => e.art === "locker" && (e.sport === "rad" || e.sport === "lauf")).every((e) => e.dauer <= 60));
  assert.ok(w.hinweise.some((h) => /gekürzt/.test(h)));
  assert.ok(w.minuten.total < w0.minuten.total, "die Wochensumme rechnet mit der gekürzten Einheit");
  const t = { woche: MO, tage: [{ date: MO, einheiten: [{ id: "lauf_vo2", sport: "lauf", art: "schluessel", schluessel: true, titel: "Intervalle", dauer: 60, uhrzeit: "17:00" }] }] };
  for (let k = 1; k < 7; k++) t.tage.push({ date: V64.addDays(MO, k), einheiten: [] });
  const h = V76.abstimmen(V76.einplanen(t, E([kraftEintrag({ wt: 1, uhrzeit: "19:00" })])));
  assert.ok(h.hinweise.some((x) => /mindestens 6 h Abstand/.test(x)));
});

test("kraft-plan-1.1 Regel 4: nicht am Test- und am Vortag – fest einen Tag früher, sonst fällt es aus", () => {
  const test = (tag) => ({ tests: [{ date: V64.addDays(MO, tag), kind: "css", status: "geplant" }] });
  const f = V76.einplanen(woche(test(3)), E([kraftEintrag({ wt: 3 })]));                // Test am Donnerstag, Kraft fest Mittwoch
  assert.equal(kraftWoche(f), 1, "einen Tag früher (Dienstag)");
  const g = V76.einplanen(woche(Object.assign(test(1), {})), E([kraftEintrag({ wt: 1 })])); // Test am Dienstag, Kraft Montag: kein Tag davor
  assert.equal(kraftWoche(g), -1);
  assert.equal(g.kraft.status, "weg");
  const a = V76.einplanen(woche(test(3)), E([auto({})]));
  assert.ok(![2, 3].includes(kraftWoche(a)), "automatisch nie am Test- oder Vortag");
});

test("kraft-plan-1.1 Regel 5 und 6: keine Kraft in Rennwochen, im Taper nur 7–10 Tage vor dem A-Rennen, Erholungswoche zwei Drittel", () => {
  const rennen = [{ date: V64.addDays(MO, 6), name: "Testrennen", prio: "B" }];
  const r = V76.einplanen(woche({ rennen }), E([kraftEintrag({ wt: 3 })]));
  assert.equal(kraftWoche(r), -1);
  assert.ok(r.hinweise.some((h) => /Rennwoche/.test(h)));
  const haupt = V64.addDays(MO, 13);                                                       // Rennen am Sonntag der nächsten Woche
  const t = V76.einplanen(woche({ phase: "Taper" }), E([kraftEintrag({ wt: 2 })]), { haupt });
  const i = kraftWoche(t);
  assert.ok(i >= 3 && i <= 6, "7–10 Tage vor dem Rennen");
  assert.equal(t.tage[i].einheiten.find((e) => e.sport === "kraft").dauer, 60, "zwei Drittel von 1:30 h");
  const fr = V76.einplanen(woche({ phase: "Taper" }), E([kraftEintrag({ wt: 2 })]), { haupt: V64.addDays(MO, 20) });
  assert.equal(kraftWoche(fr), -1, "früher im Taper keine Kraft");
  const erh = V76.einplanen(woche({ erholung: true }), E([kraftEintrag({ wt: 3 })]));
  assert.equal(erh.tage[2].einheiten.find((e) => e.sport === "kraft").dauer, 60);
});

test("kraft-plan-1.1 Regel 7: bei «vorsichtig» bleibt das Krafttraining", () => {
  const w = V76.einplanen(woche(), E([kraftEintrag({ wt: 2 })]));
  const a = V74.woche(w, (d) => (d === w.tage[1].date ? { status: "vorsichtig", ampel: "vorsichtig", gruende: ["erfunden"] } : null));
  assert.equal(a.tage[1].einheiten.find((e) => e.sport === "kraft").dauer, 90);
});

test("verfuegbarkeit-1.1: lange Einheiten bevorzugt an den gewählten Tagen (Empfehlung)", () => {
  const w0 = woche(), sa = w0.tage[5].einheiten.find((e) => e.art === "lang" && e.sport === "rad");
  assert.ok(sa, "erfundene Woche mit langer Ausfahrt am Samstag");
  const r = V66.wocheVerteilt(w0, null, { lang: { rad: [7], lauf: [] } });
  assert.ok(r.tage[6].einheiten.some((e) => e.titel === sa.titel), "lange Ausfahrt am Sonntag");
  assert.ok(!r.tage[5].einheiten.some((e) => e.titel === sa.titel));
  const k = V66.wocheVerteilt(w0, null, { lang: { rad: [6], lauf: [] } });
  assert.equal(k, w0, "schon am bevorzugten Tag: nichts verschoben");
  assert.equal(V75.pruefen({ id: "pe-lang", rad: [6, 7], lauf: [4] }), null);
  assert.match(V75.pruefen({ id: "pe-lang", rad: [6, 6] }), /jeder einmal/);
  assert.match(V75.pruefen({ id: "pe-lang", lauf: [8] }), /1–7/);
  assert.deepEqual(E([V75.eintrag("pe-lang", { rad: [7, 6], lauf: [4] })]).lang, { rad: [6, 7], lauf: [4] });
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

test("kraft-plan-1.0: eine Garmin-Krafteinheit erledigt das geplante Krafttraining (Tagesleiste, Kalender)", () => {
  const V6 = require("../js/v6.js");
  assert.equal(V6.sportVon({ sport: "andere", typ: "Krafttraining" }), "kraft");
  assert.equal(V6.sportVon({ sport: "andere", typ: "Strength" }), "kraft");
  assert.equal(V6.sportVon({ sport: "andere", typ: "Navigieren", name: "Abendrunde" }), "andere");
  assert.equal(V6.sportVon({ sport: "rad", typ: "Krafttraining" }), "rad");
  const acts = [{ date: "2026-11-24", sport: "andere", typ: "Krafttraining", dur: 3600 }];
  const plan = [{ date: "2026-11-24", sport: "kraft", dur_s: 5400 }, { date: "2026-11-26", sport: "kraft", dur_s: 5400 }];
  const w = V6.woche(acts, plan, "2026-11-27");
  assert.deepEqual(w.tage[1].zeichen, [{ sport: "kraft", art: "ist" }]);
  assert.deepEqual(w.tage[3].zeichen, [{ sport: "kraft", art: "verpasst" }]);
});

test("verfuegbarkeit-1.1 und kraft-plan-1.1: Tage für lange Einheiten und das Krafttraining gelten ab der Woche nach dem Speichern (vorher)", () => {
  const alt = V75.eintrag("pe-lang", { rad: [6], lauf: [7] }, "2026-11-10T10:00:00Z");
  const neu = V75.eintrag("pe-lang", { rad: [7], lauf: [4] }, "2026-11-25T10:00:00Z", alt);      // Mittwoch der Woche vom 23.11.
  assert.equal(V75.pruefen(neu), null);
  assert.deepEqual(neu.vorher.rad, [6], "trägt die Fassung mit, die in dieser Woche noch gilt");
  assert.deepEqual(E([neu], [], { startBis: MO }).lang, { rad: [6], lauf: [7] }, "laufende Woche: alte Fassung");
  assert.deepEqual(E([neu], [], { startBis: V64.addDays(MO, 7) }).lang, { rad: [7], lauf: [4] }, "ab der nächsten Woche: neue");
  const k = V76.einplanen(woche(), E([kraftEintrag({ modus: "auto", tage: [1, 2, 3, 5, 6, 7], wt: null })]));
  const e = k.tage.flatMap((t) => t.einheiten).find((x) => x.kraft_plan);
  assert.equal(e.kraft_auto, true, "die Einheit weiss, dass die Seite den Tag gewählt hat");
  assert.match(e.zweck, /Den Tag wählt die Seite/);
  assert.equal(V76.einplanen(woche(), E([kraftEintrag({ wt: 2 })])).tage[1].einheiten.find((x) => x.kraft_plan).kraft_auto, false);
});

test("kraft-plan-1.1 (automatisch): der Tag wird an der schon verteilten Woche gewählt – nicht vor einer harten Einheit, die erst dorthin zieht", () => {
  const w0 = woche();
  const diHart = w0.tage[1].einheiten.find(hartLand);
  assert.ok(diHart, "erfundene Woche mit harter Einheit am Dienstag");
  // Dienstag nur Schwimmen (erfunden): die harte Einheit zieht beim Verteilen weg – wohin, zeigt die verteilte Woche
  const verf = (d) => (V66.wtNr(d) === 2 ? { min: null, sport: ["schwimm"] } : null);
  const P = V66.wocheVerteilt(w0, verf, {}), ziel = P.tage.findIndex((t) => t.einheiten.some((e) => e.titel === diHart.titel));
  assert.ok(ziel >= 0 && ziel !== 1);
  const E1 = E([kraftEintrag({ modus: "auto", tage: [1, 2, 3, 4, 5, 6, 7], wt: null })]);
  const kP = V76.einplanen(P, E1, { verf }), i = kraftWoche(kP);
  assert.notEqual(i + 1, ziel, "nicht am Tag vor der harten Einheit an ihrem neuen Tag");
  assert.equal(V76.passt(kP, verf), true, "passt ohne Umziehen");
  // derselbe Tag in der unverteilten Woche (für Mein Plan) und, wenn es nicht passt, neu verteilt: am Tag danach nie hart an Land
  const roh = V76.einplanen(w0, E1, { verf, tag: kP.kraft.date });
  assert.equal(kraftWoche(roh), i);
  const r = V76.abstimmen(V66.wocheVerteilt(roh, verf, {}), {});
  for (let j = 0; j < 6; j++) if (r.tage[j].einheiten.some((e) => e.sport === "kraft")) assert.ok(!r.tage[j + 1].einheiten.some(hartLand), "Tag danach ohne harte Einheit an Land");
  // passt nicht: Tag zu knapp (erfunden 30 min) → neu verteilen nötig
  const eng = (d) => (d === kP.kraft.date ? { min: 30, sport: null } : verf(d));
  assert.equal(V76.passt(kP, eng), false);
});

test("verfuegbarkeit-1.1: Grund beim Verschieben und Hinweis, wenn eine lange Einheit an keinem gewählten Tag Platz hat", () => {
  const w0 = woche(), so = w0.tage[6].einheiten.find((e) => e.art === "lang" && e.sport === "lauf");
  assert.ok(so, "erfundene Woche mit langem Lauf am Sonntag");
  const zuVoll = (d) => (V66.wtNr(d) === 4 ? { min: 30, sport: null } : null);           // Donnerstag nur 30 min (erfunden)
  const r = V66.wocheVerteilt(w0, zuVoll, { lang: { rad: [], lauf: [4] } });
  assert.ok(!r.tage[3].einheiten.some((e) => e.titel === so.titel));
  assert.ok(r.hinweise.some((h) => h.includes(`«${so.titel}»`) && /statt an deinem Tag für lange Einheiten \(Do\)/.test(h)), r.hinweise.join(" | "));
  const g = V66.wocheVerteilt(w0, null, { lang: { rad: [7], lauf: [] } });
  assert.ok(g.hinweise.some((h) => /verschoben \(Tag für lange Einheiten\)/.test(h)), g.hinweise.join(" | "));
});
