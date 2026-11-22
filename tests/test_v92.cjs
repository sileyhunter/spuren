/* V9.2 Auftrag «Woche wie Enduco», Etappe W1 (docs/auftrag-enduco-woche.md): umplanen-1.0, grenzen-1.0, woche-einstellen-1.0, fehlt-zeit-1.0.
   Abnahme 1–15 mit dem Simulator (tests/sim, erfundener Athlet: Mo kein Training, Di–Fr 2:30 h, Sa/So 5 h) und reinen Rechentests. Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V74 = require("../js/v74.js");
const V83 = require("../js/v83.js");
const V92 = require("../js/v92.js");

const START = "2026-11-30", W3 = "2026-12-14";
const KRAFT = [{ id: "pe-kraft", aktiv: true, modus: "auto", tage: [1, 2, 3, 5, 6, 7], dauer: 60, v: "planeinstellungen-1.0" }];
const tageW = (mo) => Array.from({ length: 7 }, (_, i) => addDays(mo, i));
const SPORT = ["rad", "lauf", "schwimm"];
const neu = async (opt) => { const sim = simulator(Object.assign({ start: START }, opt || {})); await sim.tage(START, 14); return sim; };
const plan = (sim, d) => sim.plan(d).plan;                                   // Mein Plan ohne Ampel-Schicht
const zeig = (sim, mo) => JSON.stringify(tageW(mo).map((d) => plan(sim, d).map((e) => `${e.id}/${e.dauer}`)));
const minuten = (L) => L.filter((e) => SPORT.includes(e.sport)).reduce((s, e) => s + (e.dauer || 0), 0);
const alle = (L) => L.reduce((s, e) => s + (e.dauer || 0), 0);
const vf = (sim, d, min, sport) => sim.win.V66.vfEintrag({ date: d }, { min, sport: sport || null }, "2026-12-14T06:00:00.000Z");
const E = (sim, mo) => sim.win.V64UI.planEintrag(mo);
const txt = (x) => JSON.stringify(x);

test("Versionen W1", () => {
  assert.equal(V66.VERSIONS.umplanen, "umplanen-1.1"); assert.equal(V66.VERSIONS.grenzen, "grenzen-1.0");
  assert.equal(V66.VERSIONS.eigenplan, "eigenplan-1.3"); assert.equal(V66.VERSIONS.verfuegbarkeit, "verfuegbarkeit-1.3");
  assert.deepEqual(V92.VERSIONS, { umplanen: "umplanen-1.1", woche: "woche-einstellen-1.0", fehlt: "fehlt-zeit-1.0" });
});

test("Abnahme 1: Dienstag Zeit 0 → seine Einheiten stehen an anderen Tagen, Wochenlast gleich; ein Vorschlags-Ruhetag nimmt Last auf", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, mo = W3, di = addDays(W3, 1);
  assert.equal(plan(sim, mo).length, 0, "Montag ist im Vorschlag trainingsfrei");
  const diVor = plan(sim, di).filter((e) => e.id !== "schwimm_kurs").map((e) => e.id);
  const summeVor = tageW(W3).reduce((s, d) => s + minuten(plan(sim, d).filter((e) => e.id !== "schwimm_kurs")), 0);
  assert.ok(diVor.length >= 1);
  assert.equal(await U.planen(W3, { vf: [vf(sim, mo, 90), vf(sim, di, 0)] }), null); sim.S.neu();
  assert.equal(plan(sim, di).length, 0, "Dienstag ohne Training");
  for (const id of diVor) assert.ok(tageW(W3).some((d) => d !== di && plan(sim, d).some((e) => e.id === id)), `${id} steht an einem anderen Tag (verschoben, nicht entfallen)`);
  const summeNach = tageW(W3).reduce((s, d) => s + minuten(plan(sim, d)), 0), B = U.bericht();
  assert.ok(summeNach === summeVor || B.zeilen.some((z) => / statt /.test(z)), `Wochenlast gleich (${summeVor} → ${summeNach}) oder Kürzung gemeldet`);
  assert.ok(plan(sim, mo).length >= 1, "der Montag (Vorschlag: frei) nimmt Last auf, weil dort Zeit ist: " + zeig(sim, W3));
  assert.ok(alle(plan(sim, mo)) <= 90, "nie über seine 1:30 h");
  assert.ok(B.zeilen.some((z) => /Di → /.test(z)), "der Bericht nennt, was vom Dienstag wegging: " + txt(B.zeilen));
  assert.ok(B.zeilen.some((z) => /Schwimmkurs.*entfällt/.test(z)) || (E(sim, W3) && E(sim, W3).verteilung.meldungen.some((m) => /Schwimmkurs.*entfällt/.test(m))), "der Kurs (ortsfest) entfällt mit Meldung");
});

test("Abnahme 2: Mittwoch ohne Schwimmen → die Schwimm-Einheit steht an einem anderen Tag, der Mittwoch bleibt nicht leer (Rad/Laufen erlaubt, Last übrig)", () => {
  const MO = "2026-11-16", d = (i) => addDays(MO, i);
  const R = { [d(2)]: [V64.einheit("schwimm_css", {})], [d(3)]: [V64.einheit("rad_vo2", {}), V64.einheit("lauf_locker", { d: 45 })], [d(5)]: [V64.einheit("rad_lang", { d: 120 })] };
  const roh = (x) => R[x] || [];
  const v0 = V66.verfuegbarkeit([V66.vfEintrag({ date: d(3) }, { min: V64.einheit("rad_vo2", {}).dauer, sport: null })]);
  const ctx = (verf) => ({ heute: MO, montag: MO, roh, verf, o: {}, jetzt: "2026-11-16T07:00:00Z" });       // ohne «vorschlag»: die Woche bleibt gespeichert
  const r0 = V66.aendern(null, { art: "umplanen" }, ctx(v0)).eintrag;
  assert.ok(r0.tage[d(2)].einheiten.some((s) => s.vorlage === "schwimm_css"), "vorher: Schwimmen am Mittwoch");
  const v1 = V66.verfuegbarkeit([V66.vfEintrag({ date: d(3) }, { min: V64.einheit("rad_vo2", {}).dauer, sport: null }), V66.vfEintrag({ date: d(2) }, { min: 90, sport: ["rad", "lauf"] })]);
  const r1 = V66.aendern(r0, { art: "umplanen" }, ctx(v1)).eintrag;
  const mi = r1.tage[d(2)].einheiten.map((s) => s.vorlage);
  assert.ok(!mi.includes("schwimm_css"), "kein Schwimmen am Mittwoch");
  assert.ok(Object.keys(r1.tage).some((x) => x !== d(2) && r1.tage[x].einheiten.some((s) => s.vorlage === "schwimm_css")), "die Schwimm-Einheit steht an einem anderen Tag");
  assert.ok(mi.length >= 1 && mi.every((v) => /^(rad|lauf)_/.test(v)), "Mittwoch nicht leer, nur Rad oder Laufen: " + txt(mi));
  assert.ok(!r1.verteilung.fehlt, "nichts fehlt");
});

test("Abnahme 3: Zeit am Donnerstag 2:30 → 1:00 → 2:30 ergibt dieselbe Woche (auch mit Anker)", async () => {
  const sim = await neu({ einstellungen: KRAFT }); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, don = addDays(W3, 3), mi = addDays(W3, 2);
  const start = zeig(sim, W3);
  assert.equal(await U.vfSpeichern(don, { date: don }, { min: 60, sport: null }), null); sim.S.neu();
  assert.notEqual(zeig(sim, W3), start, "1:00 ändert die Woche");
  assert.ok(alle(plan(sim, don)) <= 60);
  assert.equal(await U.vfSpeichern(don, { date: don }, { min: 150, sport: null }), null); sim.S.neu();
  assert.equal(zeig(sim, W3), start, "zurück auf 2:30 = Ausgangswoche (gekürzte Einheiten wachsen zurück)");
  // mit Anker (eigene Einheit am Mittwoch): Ausgangswoche ist die Woche mit dem Anker
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: mi, einheit: { vorlage: "lauf_locker", dauer: 30 } }), null); sim.S.neu();
  const mitAnker = zeig(sim, W3);
  assert.equal(await U.vfSpeichern(don, { date: don }, { min: 60, sport: null }), null); sim.S.neu();
  assert.equal(await U.vfSpeichern(don, { date: don }, { min: 150, sport: null }), null); sim.S.neu();
  assert.equal(zeig(sim, W3), mitAnker, "gleiche Eingaben, gleiche Woche");
});

test("Abnahme 4: (Di 0, dann Mi 1 h) = (Mi 1 h, dann Di 0) = beides auf einmal in «Woche einstellen»", async () => {
  const di = addDays(W3, 1), mi = addDays(W3, 2), W = [];
  for (const art of ["a", "b", "c"]) {
    const sim = await neu({ einstellungen: KRAFT }); sim.S.tag(W3, "07:00");
    const U = sim.win.V66UI;
    if (art === "a") { await U.vfSpeichern(di, { date: di }, { min: 0, sport: null }); sim.S.neu(); await U.vfSpeichern(mi, { date: mi }, { min: 60, sport: null }); }
    if (art === "b") { await U.vfSpeichern(mi, { date: mi }, { min: 60, sport: null }); sim.S.neu(); await U.vfSpeichern(di, { date: di }, { min: 0, sport: null }); }
    if (art === "c") assert.equal(await U.planen(W3, { vf: [vf(sim, di, 0), vf(sim, mi, 60)], grund: "woche" }), null);
    sim.S.neu();
    W.push(zeig(sim, W3));
  }
  assert.equal(W[0], W[1], "Reihenfolge spielt keine Rolle"); assert.equal(W[0], W[2], "auf einmal = nacheinander");
});

test("Abnahme 5: gesperrter Tag, gesperrte Einheit, vergangene Tage und Anker bleiben unverändert am Tag", async () => {
  const sim = await neu({ einstellungen: KRAFT });
  await sim.tage(W3, 2);                                                            // Mo und Di vorbei (trainiert)
  sim.S.tag(addDays(W3, 2), "07:00");
  const U = sim.win.V66UI, [mo, di, mi, don, fr, sa] = tageW(W3);
  assert.equal(await U.aendern(W3, { art: "sperren", date: sa }), null); sim.S.neu();
  const eFr = plan(sim, fr)[0]; assert.ok(eFr, "Freitag hat eine Einheit");
  assert.equal(await U.aendern(W3, { art: "einheit", date: fr, uid: eFr.uid, felder: { gesperrt: true } }), null); sim.S.neu();
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: don, einheit: { vorlage: "lauf_locker", dauer: 35 } }), null); sim.S.neu();
  const E0 = E(sim, W3), fest = (x) => txt([mo, di, fr, sa].map((d) => x.tage[d])), anker = (x) => txt(x.tage[don].einheiten.filter((s) => s.quelle === "eigen"));
  const vorher = fest(E0), ankerVor = anker(E0);
  assert.ok(JSON.parse(ankerVor).length === 1);
  assert.equal(await U.planen(W3, { vf: [vf(sim, mi, 0), vf(sim, don, 45), vf(sim, fr, 30), vf(sim, sa, 60)] }), null); sim.S.neu();
  const E1 = E(sim, W3);
  assert.equal(fest(E1), vorher, "vergangene Tage, gesperrter Samstag, Freitag mit gesperrter Einheit: unverändert");
  assert.equal(anker(E1), ankerVor, "der Anker am Donnerstag bleibt");
  assert.ok(E1.verteilung.meldungen.some((m) => /mehr geplant als verfügbar/.test(m)) || alle(plan(sim, don)) <= 45, "über der Zeit nur mit Meldung");
});

test("Abnahme 6: flexible Woche – Mo–Fr 0, Sa und So je 5 h → alles am Wochenende, mehrere je Tag, nie über 5 h, Schlüsseleinheiten bleiben", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, T = tageW(W3);
  const hartVor = T.flatMap((d) => plan(sim, d)).filter((e) => V66.hart(e)).map((e) => e.id).sort();
  const vfL = T.slice(0, 5).map((d) => vf(sim, d, 0)).concat(T.slice(5).map((d) => vf(sim, d, 300)));
  assert.equal(await U.planen(W3, { vf: vfL, grund: "woche" }), null); sim.S.neu();
  for (const d of T.slice(0, 5)) assert.equal(plan(sim, d).length, 0, d + " ohne Training");
  for (const d of T.slice(5)) { assert.ok(plan(sim, d).length >= 2, "mehrere Einheiten am " + d); assert.ok(alle(plan(sim, d)) <= 300, `${d}: ${alle(plan(sim, d))} min ≤ 5 h`); }
  const hartNach = T.flatMap((d) => plan(sim, d)).filter((e) => V66.hart(e)).map((e) => e.id).sort();
  assert.equal(txt(hartNach), txt(hartVor), "die Schlüsseleinheiten bleiben");
  const F = E(sim, W3) && E(sim, W3).verteilung && E(sim, W3).verteilung.fehlt;
  if (F) assert.ok(U.frageDaten(W3), "passt nicht alles, kommt die Frage");
});

test("Abnahme 7: Grenzen – «nur Laufen» von Hand: nie Rad, Schwimmen oder Kraft; nie über der Zeit; Festes darüber nur mit Meldung", async () => {
  const sim = await neu({ einstellungen: KRAFT }); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, T = tageW(W3), fr = T[4], mi = T[2];
  const kraftVor = T.find((d) => plan(sim, d).some((e) => e.sport === "kraft"));
  assert.equal(kraftVor, fr, "Ausgangslage: das Krafttraining (automatisch) steht am Freitag");
  assert.equal(await U.vfSpeichern(fr, { date: fr }, { min: 150, sport: ["lauf"] }), null); sim.S.neu();
  assert.ok(plan(sim, fr).every((e) => e.sport === "lauf"), "Freitag nur Laufen (auch kein Krafttraining): " + zeig(sim, W3));
  const K = sim.plan(fr).K;
  for (const d of T) { const v = K.verf(d), s = alle(plan(sim, d)); if (v && typeof v.min === "number") assert.ok(s <= v.min, `${d}: ${s} min ≤ ${v.min} (keine Toleranz)`); }
  // Festes (eigene Einheit) über der Zeit: bleibt, mit Meldung
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: mi, einheit: { vorlage: "rad_locker", dauer: 180 } }), null); sim.S.neu();
  assert.ok(E(sim, W3).verteilung.meldungen.some((m) => /^Mittwoch: \d+ min mehr geplant als verfügbar \(deine eigene/.test(m)), txt(E(sim, W3).verteilung.meldungen));
  assert.ok(plan(sim, mi).some((e) => e.quelle === "eigen" && e.dauer === 180), "die eigene Einheit bleibt");
  // Ausgleichen hält die Grenzen: gestrichener Lauf kommt nie auf einen Tag ohne Laufen
  const lauf = T.map((d) => plan(sim, d).find((e) => e.sport === "lauf" && e.quelle !== "eigen")).find(Boolean);
  const ld = T.find((d) => plan(sim, d).some((e) => e.uid === lauf.uid));
  assert.equal(await U.aendern(W3, { art: "entfernen", date: ld, uid: lauf.uid }), null); sim.S.neu();
  assert.equal(await U.planen(W3, { vf: T.filter((d) => d !== fr).map((d) => vf(sim, d, 150, ["rad", "schwimm"])) }), null); sim.S.neu();
  assert.equal(await U.ausgleichen(W3), null); sim.S.neu();
  for (const d of T.filter((x) => x !== fr)) assert.ok(!plan(sim, d).some((e) => e.sport === "lauf" && e.quelle !== "eigen"), "kein Lauf an einem Tag ohne Laufen: " + d);
});

test("Abnahme 7: Coach hält die Zeit hart ein (keine 5 min Toleranz mehr), Ampel-Ersatz nie andere Sportart und nie länger, Krafttag nie über die Zeit", () => {
  const MO = "2026-11-16", DI = "2026-11-17", FR = "2026-11-20";
  const R = V64.woche({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" });
  const E0 = { id: "wo-" + MO, montag: MO, tage: { "2026-11-19": { gesperrt: false, einheiten: [{ uid: "d1", vorlage: "rad_locker", dauer: 60, quelle: "eigen" }] } } };
  const w = V66.meinPlan(R, E0, {});
  const add = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const morgen = []; for (let i = 70; i >= 1; i--) morgen.push({ date: add(DI, -i), hrv: 60 + ((i * 7) % 5) - 2, rhr: 50 + ((i * 3) % 3) - 1, sleepH: 7.4 }); morgen.push({ date: DI, hrv: 41, rhr: 58, sleepH: 7 });
  const lage = (frMin) => ({ heute: DI, days: morgen, ampelHeute: null, aktivitaeten: [], entscheide: [], befinden: [],
    tage: w.tage.map((t) => ({ date: t.date, mo: MO, einheiten: t.einheiten, plan: t.einheiten, gesperrt: false, rennen: false, vorbei: t.date < DI, verf: t.date === FR ? { min: frMin, sport: null } : null, ampel: null, ctx: {}, erledigt: [] })) });
  const opt = (frMin) => (V83.pruefen(lage(frMin)).vorschlaege.find((x) => x.date === DI) || { optionen: [] }).optionen.map((o) => o.art);
  const lv = R.tage.find((t) => t.date === DI).einheiten.find((e) => e.id === "lauf_vo2").dauer;
  assert.ok(opt(lv).includes("tauschen"), "passt genau: Tauschen geht");
  assert.ok(!opt(lv - 3).includes("tauschen"), "3 min zu viel am Zieltag: kein Tausch mehr (bis V9.1.1 innerhalb der 5 min Toleranz)");
  // Ampel-Ersatz: gleiche Sportart, nie länger
  for (const t of R.tage) for (const e of t.einheiten) { const l = V74.locker(e, {}); if (l) { assert.equal(l.sport, e.sport); assert.ok(l.dauer <= e.dauer); } }
  // Krafttag: an keinem Tag, an dem das Krafttraining nicht in die Zeit passt, und nicht an einem von Hand gesetzten Tag mit gewählten Sportarten
  const V76 = require("../js/v76.js");
  const Ek = { aktiv: true, modus: "auto", tage: [1, 2, 3, 4, 5, 6, 7], dauer: 60 };
  const termin = V76.termin ? V76.termin({ kraft: Ek }, MO) : null;
  if (termin) {
    const verf = (d) => (d === "2026-11-17" ? { min: 45, sport: null, quelle: "wochentag" } : d === "2026-11-18" ? { min: 120, sport: ["rad"], quelle: "tag" } : { min: 0, sport: [], quelle: "wochentag" });
    const w2 = V76.einplanen(R, { kraft: Ek }, { verf });
    assert.ok(!w2.kraft || w2.kraft.status !== "geplant", "kein Tag passt (Di zu kurz, Mi von Hand nur Rad, Rest kein Training): " + txt(w2.kraft));
  }
});

test("Abnahme 8: passt etwas nirgends hin und Silas sagt «Nein» → entfällt mit Meldung samt Grund, die Wochenlast im Bericht stimmt", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, T = tageW(W3);
  assert.equal(await U.planen(W3, { vf: T.slice(0, 5).map((d) => vf(sim, d, 0)).concat(T.slice(5).map((d) => vf(sim, d, 180))) }), null); sim.S.neu();
  const D = U.frageDaten(W3); assert.ok(D, "es fehlt Last");
  assert.equal(await U.frageNein(W3, D.fp), null); sim.S.neu();
  const Ew = E(sim, W3);
  assert.ok(Ew.verteilung.meldungen.some((m) => /entfällt: an keinem freien Tag genug Zeit/.test(m)), "Meldung mit Grund");
  const B = U.bericht(), summe = Math.round(T.reduce((s, d) => s + minuten(plan(sim, d)), 0));
  assert.equal(B.nachher.min, summe, "Wochenstunden im Bericht = was geplant ist");
  assert.ok(B.fehlt && B.fehlt.min === Ew.verteilung.fehlt.min, "der Bericht nennt, was fehlt");
});

test("Abnahme 9: Streichung bleibt über weitere Änderungen; «Ausgleichen» holt sie zurück; «Neu berechnen» vergisst sie; von Hand gesetzte Zeit bleibt bei «Alles neu»", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, T = tageW(W3), sa = T[5], so = T[6];
  const x = plan(sim, sa)[0]; assert.ok(x);
  assert.equal(await U.aendern(W3, { art: "entfernen", date: sa, uid: x.uid }), null); sim.S.neu();
  const zaehl = () => T.reduce((s, d) => s + plan(sim, d).filter((e) => e.id === x.id).length, 0);
  assert.equal(zaehl(), 0, "gestrichen"); assert.equal(E(sim, W3).gestrichen.length, 1);
  assert.equal(await U.vfSpeichern(so, { date: so }, { min: 240, sport: null }), null); sim.S.neu();
  assert.equal(zaehl(), 0, "bleibt gestrichen nach einer weiteren Änderung (kein heimlicher Ersatz)");
  assert.equal(await U.ausgleichen(W3), null); sim.S.neu();
  assert.equal(zaehl(), 1, "«Ausgleichen» bringt sie zurück"); assert.ok(!E(sim, W3).gestrichen);
  const y = T.map((d) => plan(sim, d).find((e) => e.id === x.id)).find(Boolean), yd = T.find((d) => plan(sim, d).some((e) => e.uid === y.uid));
  assert.equal(await U.aendern(W3, { art: "entfernen", date: yd, uid: y.uid }), null); sim.S.neu();
  assert.equal(zaehl(), 0);
  assert.equal(await U.aendern(W3, { art: "neuberechnen" }), null); sim.S.neu();
  assert.equal(zaehl(), 1, "«Neu berechnen» vergisst die Streichung");
  assert.equal(await U.aendern(W3, { art: "neuberechnen", alles: true }), null); sim.S.neu();
  const v = sim.plan(so).K.verf(so);
  assert.equal(v.min, 240, "von Hand gesetzte Zeit bleibt bei «Alles neu»"); assert.equal(v.quelle, "tag");
});

test("Abnahme 10: Bearbeiten-Modus – Zeit, Sportart, Sperre im Entwurf → Liste live neu; ✕ stellt alles her; ✓ speichert beides; ↶/↷ schrittweise", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, EN = sim.win.V64UI.entwurf, I = sim.S.inbox, T = tageW(W3), [, di, mi, don, fr, sa] = T;
  const start = zeig(sim, W3), nVf = () => (I.data.verfuegbarkeit || []).length, nWo = () => (I.data.planwoche || []).length;
  const vf0 = nVf(), wo0 = nWo();
  EN.starten();
  assert.equal(await U.vfSpeichern(fr, { date: fr }, { min: 0, sport: null }), null); sim.S.neu();
  const s1 = zeig(sim, W3); assert.notEqual(s1, start, "Zeit im Entwurf: Liste live neu"); assert.equal(plan(sim, fr).length, 0);
  assert.equal(await U.vfSpeichern(don, { date: don }, { min: 150, sport: ["rad", "lauf"] }), null); sim.S.neu();
  assert.ok(!plan(sim, don).some((e) => e.sport === "schwimm"), "Sportart im Entwurf");
  assert.equal(await U.aendern(W3, { art: "sperren", date: sa }), null); sim.S.neu();
  assert.ok(sim.plan(sa).tPlan.gesperrt, "Sperre im Entwurf");
  assert.equal(nVf(), vf0, "nichts gespeichert"); assert.equal(nWo(), wo0);
  assert.ok(EN.zurueck()); sim.S.neu(); assert.ok(!sim.plan(sa).tPlan.gesperrt, "↶ nimmt die Sperre zurück");
  assert.ok(EN.zurueck()); sim.S.neu(); assert.equal(zeig(sim, W3), s1, "↶ nimmt die Sportart zurück (Verfügbarkeit mit)");
  assert.ok(EN.vor()); sim.S.neu(); assert.ok(!plan(sim, don).some((e) => e.sport === "schwimm"), "↷");
  EN.beenden(); sim.S.neu();                                                        // ✕
  assert.equal(zeig(sim, W3), start, "✕ stellt alles her, auch die Verfügbarkeit"); assert.equal(EN.vf().length, 0);
  EN.starten();
  assert.equal(await U.vfSpeichern(fr, { date: fr }, { min: 0, sport: null }), null);
  assert.equal(await U.aendern(W3, { art: "sperren", date: sa }), null); sim.S.neu();
  const imEntwurf = zeig(sim, W3);
  assert.equal(await U.entwurfSpeichern(), null); sim.S.neu();                      // ✓
  assert.ok((I.data.verfuegbarkeit || []).some((e) => e.id === "vf-" + fr && e.min === 0), "✓ speichert die Verfügbarkeit");
  assert.ok(E(sim, W3) && E(sim, W3).tage[sa].gesperrt, "✓ speichert die Woche");
  assert.equal(zeig(sim, W3), imEntwurf, "gespeichert wie im Entwurf gezeigt");
  void di; void mi;
});

test("Abnahme 11: Garmin – nach dem Umplanen sind die offenen Aufträge der Woche erneuert, Auswahl und Modus verschobener Einheiten bleiben, heute bleibt", async () => {
  const sim = await neu(); sim.S.tag(addDays(W3, 2), "07:00");                     // Mittwoch
  const U = sim.win.V66UI, I = sim.S.inbox, T = tageW(W3), fr = T[4], so = T[6];
  const e = plan(sim, fr)[0]; assert.ok(e && U.garminFenster(fr));
  assert.equal(await U.einheitSenden(fr, e.uid, "auto"), null);
  const s = plan(sim, so)[0]; assert.equal(await U.einheitSenden(so, s.uid, "senden"), null);
  const soVor = txt((I.data.garmin_senden || []).find((a) => a.id === "gs-" + so));
  assert.equal(await U.vfSpeichern(fr, { date: fr }, { min: 0, sport: null }), null); sim.S.neu();
  const A = (d) => (I.data.garmin_senden || []).find((a) => a.id === "gs-" + d);
  assert.equal(A(fr).einheiten.length, 0, "am Freitag steht die Einheit nicht mehr: der Auftrag trägt sie aus");
  const ziel = T.find((d) => d !== fr && plan(sim, d).some((x) => x.id === e.id && A(d) && A(d).einheiten.some((u) => u.uid === x.uid)));
  assert.ok(ziel, "die gewählte Einheit ist an ihrem neuen Tag wieder gewählt: " + txt((I.data.garmin_senden || []).map((a) => [a.id, a.modus, a.einheiten.map((u) => u.titel)])));
  assert.equal(A(ziel).modus, "auto", "mit ihrem Modus"); assert.equal(A(ziel).teil, true, "und als Auswahl");
  assert.equal(txt(A(so)), soVor, "unveränderter Tag: Auftrag nicht neu angelegt");
  assert.ok(!A(addDays(W3, 2)), "heute wird nie angefasst");
});

test("Abnahme 11: heute – eine gesendete Einheit, die nicht mehr im Plan steht, meldet «Auf der Uhr steht noch …» (gleiche Einheit mit neuer Kennung nicht)", async () => {
  const sim = await neu(); const h = addDays(W3, 2); sim.S.tag(h, "07:00");
  const U = sim.win.V66UI, P = plan(sim, h); assert.ok(P.length >= 1);
  sim.D.plan_garmin = sim.D.plan_garmin || [];
  sim.D.plan_garmin.push({ uid: P[0].uid, date: h, titel: P[0].titel, sport: P[0].sport }, { uid: "v-erfunden-1", date: h, titel: P[0].titel, sport: P[0].sport });
  assert.deepEqual(U.uhrNoch(h), [], "steht noch im Plan (auch mit anderer Kennung)");
  sim.D.plan_garmin.push({ uid: "v-erfunden-2", date: h, titel: "Erfundene Einheit", sport: "rad" }, { uid: "v-erfunden-3", date: h, titel: "Ausgetragen", sport: "rad", entfernt: h + "T06:00:00Z" });
  assert.deepEqual(U.uhrNoch(h), ["Erfundene Einheit"], "nur, was gesendet und nicht ausgetragen ist");
  assert.equal(await U.planen(W3, { vf: [vf(sim, addDays(W3, 4), 0)] }), null); sim.S.neu();
  assert.ok(U.bericht().hinweise.some((x) => /^Auf der Uhr steht noch «Erfundene Einheit»/.test(x)), "der Bericht sagt es: " + txt(U.bericht().hinweise));
  assert.deepEqual(U.uhrNoch(addDays(h, 1)), [], "nur heute");
});

test("Abnahme 14: Frage – Mo–Fr 0, Sa/So je 3 h: fehlende Zeit und Vorschläge; «Ja» erhöht die Zeit (von Hand), ↶ nimmt Woche und Zeit zurück; «Nein» gilt bis zur nächsten Änderung", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, T = tageW(W3), sa = T[5], so = T[6];
  const vor = sim.plan(sa).K.verf(sa);
  assert.equal(U.frageDaten(W3), null, "beim blossen Öffnen keine Frage");
  assert.equal(await U.planen(W3, { vf: T.slice(0, 5).map((d) => vf(sim, d, 0)).concat([vf(sim, sa, 180), vf(sim, so, 180)]), grund: "woche" }), null); sim.S.neu();
  const D = U.frageDaten(W3); assert.ok(D && D.fehlt.min > 0, "es fehlt Last");
  const L = V92.vorschlaege(D.kand, D.fehlt.min, U.probe(W3));
  assert.ok(L.length >= 1, "mindestens ein Vorschlag");
  for (const v of L) { assert.ok(v.plus <= D.fehlt.min, `kein Vorschlag grösser als das Fehlende (${v.plus} ≤ ${D.fehlt.min})`); for (const t of v.tage) assert.ok([sa, so].includes(t.date)); }
  const ja = L.find((v) => v.art === "tag") || L[0];
  assert.match(V92.vorschlagText(ja), /^(Samstag|Sonntag)( und (Samstag|Sonntag))? (auf \d+ h( \d\d)? \(\+ |je \+ )/);
  const vfVor = txt(sim.plan(sa).K.verf(ja.tage[0].date)), wocheVor = zeig(sim, W3);
  assert.equal(await U.frageJa(W3, ja), null); sim.S.neu();
  const v1 = sim.plan(sa).K.verf(ja.tage[0].date);
  assert.equal(v1.min, ja.tage[0].min); assert.equal(v1.quelle, "tag", "Zustand «von Hand gesetzt»");
  assert.ok(!E(sim, W3).verteilung.fehlt, "nichts fehlt mehr");
  assert.ok(U.bericht().zeilen[0].includes("auf deine Bestätigung"));
  assert.equal(await U.rueckgaengig(), null); sim.S.neu();
  assert.equal(txt(sim.plan(sa).K.verf(ja.tage[0].date)), vfVor, "↶: Zeit wie vorher"); assert.equal(zeig(sim, W3), wocheVor, "↶: Woche wie vorher");
  const D2 = U.frageDaten(W3); assert.ok(D2);
  assert.equal(await U.frageNein(W3, D2.fp), null); sim.S.neu();
  assert.equal(U.frageDaten(W3), null, "nach «Nein» nicht wieder, solange sich nichts ändert");
  assert.equal(zeig(sim, W3), wocheVor, "«Nein» ändert nichts");
  assert.ok(E(sim, W3).verteilung.fehlt, "der Bericht nennt weiter, was fehlt");
  assert.equal(await U.vfSpeichern(so, { date: so }, { min: 185, sport: null }), null); sim.S.neu();
  assert.ok(U.frageDaten(W3), "nach der nächsten Änderung kommt die Frage wieder");
  // keine Frage im Bearbeiten-Modus (erst mit ✓) und keine für vergangene Wochen
  sim.win.V64UI.entwurf.starten(); assert.equal(U.frageDaten(W3), null, "nicht im Bearbeiten-Modus"); sim.win.V64UI.entwurf.beenden();
  assert.equal(U.frageDaten(addDays(W3, -7)), null, "nicht für vergangene Wochen");
  void vor;
});

test("Abnahme 14: keine Frage in der Rennwoche – dort wird nichts verschoben, nur gemeldet", () => {
  const MO = "2026-11-16", w = V64.woche({ woche: MO, phase: "Taper", stunden: 6, modell: "polarisiert", rennen: [{ date: "2026-11-22", name: "Testrennen" }] });
  const roh = (d) => (w.tage.find((t) => t.date === d) || { einheiten: [] }).einheiten;
  const verf = V66.verfuegbarkeit([1, 2, 3, 4, 5].map((wt) => V66.vfEintrag({ wt }, { min: 0, sport: [] })));
  const r = V66.aendern(null, { art: "umplanen" }, { heute: MO, montag: MO, roh, vorschlag: roh, verf, o: {} }).eintrag;
  assert.ok(!r.verteilung || !r.verteilung.fehlt, "kein «fehlt» (nichts verschoben, nur gemeldet)");
  assert.equal(V92.fragen(r, "x"), false);
});

test("Abnahme 15: die Seite trägt nichts selbst ein – nach jedem Planerlauf sind alle vf-Einträge gleich", async () => {
  const sim = await neu({ einstellungen: KRAFT }); sim.S.tag(addDays(W3, 1), "07:00");
  const U = sim.win.V66UI, I = sim.S.inbox, T = tageW(W3);
  const vfStand = () => txt([(sim.D.plan_verfuegbarkeit || []).map((e) => [e.id, e.min, e.sport]), (I.data.verfuegbarkeit || []).map((e) => [e.id, e.min, e.sport])]);
  assert.equal(await U.vfSpeichern(T[5], { date: T[5] }, { min: 120, sport: null }), null); sim.S.neu();
  const s0 = vfStand();
  assert.equal(await U.aendern(W3, { art: "umplanen" }), null); sim.S.neu();
  assert.equal(await U.aendern(W3, { art: "sperren", date: T[6] }), null); sim.S.neu();
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: T[3], einheit: { vorlage: "rad_locker", dauer: 45 } }), null); sim.S.neu();
  const x = plan(sim, T[4])[0]; if (x) { assert.equal(await U.aendern(W3, { art: "entfernen", date: T[4], uid: x.uid }), null); sim.S.neu(); }
  assert.equal(await U.ausgleichen(W3), null); sim.S.neu();
  assert.equal(vfStand(), s0, "kein Planerlauf legt einen vf-Eintrag an oder ändert einen");
});

/* ---------------- reine Rechenteile (js/v92.js) ---------------- */
test("V92.diff: verschoben, gekürzt, entfallen, neu – Zuordnung über Kennung, sonst Vorlage und nächsten Tag", () => {
  const vor = [{ uid: "a", id: "rad_locker", titel: "Grundlage", dauer: 80, date: "2026-12-16" }, { uid: "b", id: "lauf_vo2", titel: "VO2", dauer: 50, date: "2026-12-15" },
    { uid: "c", id: "schwimm_kurs", titel: "Schwimmkurs", dauer: 35, date: "2026-12-15" }];
  const nach = [{ uid: "a", id: "rad_locker", titel: "Grundlage", dauer: 60, date: "2026-12-16" }, { uid: "x", id: "lauf_vo2", titel: "VO2", dauer: 50, date: "2026-12-17" },
    { uid: "y", id: "kraft", titel: "Krafttraining", dauer: 60, date: "2026-12-20" }];
  const D = V92.diff(vor, nach);
  assert.equal(D.verschoben.length, 1); assert.equal(D.verschoben[0].von, "2026-12-15"); assert.equal(D.verschoben[0].nach, "2026-12-17");
  assert.equal(D.gekuerzt.length, 1); assert.equal(D.weg[0].titel, "Schwimmkurs"); assert.equal(D.neu[0].titel, "Krafttraining"); assert.equal(D.leer, false);
  assert.deepEqual(V92.zeilen(D), ["«VO2» Di → Do", "«Grundlage» am Mi 1 h statt 1 h 20", "«Schwimmkurs» (Di) entfällt", "«Krafttraining» neu am So"]);
  assert.equal(V92.diff(vor, vor).leer, true);
  assert.equal(V92.zuordnung(vor, nach).get("b"), "x");
});

test("V92.eintraege: nur diese Woche = Tageseinträge (unverändert nichts, «Zurück auf Standard» = Eintrag weg); jede Woche so = Wochentag, Tageseinträge weg", () => {
  const std = (wt) => ({ min: wt >= 6 ? 300 : 150, sport: null });
  const alt = (id) => (id === "vf-2026-12-16" ? { id, min: 60, sport: null } : null);
  const w = V92.eintraege([{ date: "2026-12-15", min: 0, sport: null }, { date: "2026-12-16", min: 60, sport: null }, { date: "2026-12-17", min: 150, sport: null },
    { date: "2026-12-18", min: 90, sport: ["lauf"] }], "woche", alt, std);
  assert.deepEqual(JSON.parse(JSON.stringify(w)), [{ ziel: { date: "2026-12-15" }, wert: { min: 0, sport: [] } }, { ziel: { date: "2026-12-18" }, wert: { min: 90, sport: ["lauf"] } }]);
  assert.deepEqual(V92.eintraege([{ date: "2026-12-16", zurueck: true }], "woche", alt, std), [{ ziel: { date: "2026-12-16" }, wert: null }]);
  const s = V92.eintraege([{ date: "2026-12-16", min: 60, sport: null }, { date: "2026-12-19", min: 300, sport: null }], "standard", alt, std);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), [{ ziel: { wt: 3 }, wert: { min: 60, sport: null } }, { ziel: { date: "2026-12-16" }, wert: null }]);
});

test("V92.vorschlaege: kleinstes Mehr je Tag in 5-min-Schritten, nie grösser als das Fehlende; verteilt, wenn kein Tag allein reicht", () => {
  // Modell-Planer: am Samstag passen 80 min mehr, am Sonntag nur 30; zusammen fehlen 100 min (je Tag 50 reichen auch)
  const probe = (m) => { const sa = (m["2026-12-19"] || 180) - 180, so = (m["2026-12-20"] || 180) - 180; return sa >= 100 || so >= 100 || (sa >= 50 && so >= 50) ? 0 : 100; };
  const kand = [{ date: "2026-12-19", min: 180 }, { date: "2026-12-20", min: 180 }];
  const L = V92.vorschlaege(kand, 100, probe);
  assert.deepEqual(L.map((v) => [v.art, v.plus]), [["tag", 100], ["tag", 100], ["verteilt", 100]]);
  assert.equal(V92.vorschlagText(L[0]), "Samstag auf 4 h 40 (+ 1 h 40)");
  assert.equal(V92.vorschlagText(L[2]), "Samstag und Sonntag je + 50 min");
  assert.equal(V92.vorschlaege(kand, 40, probe).length, 0, "reicht das Fehlende nirgends, gibt es keinen Vorschlag (nie mehr als das Fehlende)");
  assert.equal(V92.kandidaten([{ date: "2026-12-13", min: 60 }, { date: "2026-12-15", min: 0 }, { date: "2026-12-16", min: null }, { date: "2026-12-17", min: 60, fest: true },
    { date: "2026-12-18", min: 60 }], "2026-12-14").map((k) => k.date).join(), "2026-12-18");
});

/* ---------- V9.2.1 umplanen-1.1: die Folgewoche (Silas 22.11.2026: «die Woche darauf auch, wenn es einen Einfluss hat») ---------- */
test("V9.2.1 Kern: der Sonntag davor bindet den Montag – harte Einheit an Land oder Krafttraining am Sonntag → keine harte Einheit an Land am Montag", () => {
  const MO = "2026-12-28", d = (i) => addDays(MO, i);
  const tage = () => Array.from({ length: 7 }, (_, i) => ({ date: d(i), wt: "", ruhetag: i !== 0, einheiten: i === 0 ? [V64.einheit("lauf_vo2", {})] : [] }));
  const verf = () => ({ min: 120, sport: null });
  const ohne = V66.verteilen(tage(), verf, {});
  assert.ok(ohne.tage[0].einheiten.some((e) => e.id === "lauf_vo2"), "ohne Vortag bleibt die harte Einheit am Montag");
  for (const vor of [[V64.einheit("rad_vo2", {})], [{ id: "kraft", sport: "kraft", dauer: 45, titel: "Krafttraining" }]]) {
    const r = V66.verteilen(tage(), verf, { vorher: vor, vorherDatum: d(-1) });
    assert.ok(!r.tage[0].einheiten.some((e) => V66.hart(e)), "Montag ohne harte Einheit an Land: " + txt(r.tage.map((t) => t.einheiten.map((e) => e.id))));
    assert.ok(r.tage.some((t, i) => i > 0 && t.einheiten.some((e) => e.id === "lauf_vo2")), "sie steht an einem anderen Tag der Woche");
    assert.ok(r.protokoll.verschoben.some((x) => x.titel === V64.einheit("lauf_vo2", {}).titel), "als Verschiebung gemeldet");
  }
  assert.equal(V66.vortagBindet([V64.einheit("lauf_lang", { d: 90 })]), false, "ein langer, lockerer Lauf am Sonntag bindet den Montag nicht");
  const w = { tage: tage(), stunden: 1 }, wv = V66.wocheVerteilt(w, null, { vorher: [V64.einheit("rad_vo2", {})], vorherDatum: d(-1) });
  assert.ok(!wv.tage[0].einheiten.some((e) => V66.hart(e)), "auch eine Woche ohne Verfügbarkeit folgt dem Sonntag davor");
});

/** Woche danach vorbereiten: Montag 2 h, Dienstag 0, Donnerstag nur Schwimmen → eine harte Einheit an Land steht am Montag. */
async function folgeVorbereiten(sim) {
  const U = sim.win.V66UI, W5 = addDays(W3, 14);
  assert.equal(await U.planen(W5, { vf: [vf(sim, W5, 120), vf(sim, addDays(W5, 1), 0), vf(sim, addDays(W5, 3), 150, ["schwimm"])] }), null); sim.S.neu();
  const h = plan(sim, W5).find((e) => V66.hart(e) && (e.sport === "lauf" || e.sport === "rad"));
  assert.ok(h, "Vorbereitung: harte Einheit an Land am Montag der Woche danach: " + zeig(sim, W5));
  return h;
}

test("V9.2.1 Folgewoche: eigene harte Einheit am Sonntag → der Montag der Woche danach wird umgeplant, im Bericht gemeldet, ↶ nimmt beides zurück", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, W4 = addDays(W3, 7), W5 = addDays(W3, 14), so4 = addDays(W4, 6);
  const hart5 = await folgeVorbereiten(sim), W5vor = zeig(sim, W5);
  assert.equal(await U.aendern(W4, { art: "hinzufuegen", date: so4, einheit: { vorlage: "rad_vo2", dauer: 75 } }), null); sim.S.neu();
  assert.ok(plan(sim, so4).some((e) => e.id === "rad_vo2"), "die eigene Einheit steht am Sonntag");
  assert.ok(!plan(sim, W5).some((e) => V66.hart(e) && (e.sport === "lauf" || e.sport === "rad")), "Montag danach ohne harte Einheit an Land: " + zeig(sim, W5));
  assert.ok(tageW(W5).some((d) => d !== W5 && plan(sim, d).some((e) => e.id === hart5.id)), "sie steht an einem anderen Tag der Woche danach (nicht entfallen)");
  const B = U.bericht();
  assert.ok(B.zeilen.some((z) => /^Nächste Woche: «.+» Mo → \S+ \(harte Einheit am Sonntag davor\)$/.test(z)), "der Bericht nennt die Folgewoche mit Grund: " + txt(B.zeilen));
  assert.equal(await U.rueckgaengig(), null); sim.S.neu();
  assert.ok(!plan(sim, so4).some((e) => e.id === "rad_vo2"), "↶: Sonntag wie vorher");
  assert.equal(zeig(sim, W5), W5vor, "↶: die Woche danach ebenso");
});

test("V9.2.1 Folgewoche: eine gespeicherte Woche danach (Tag gesperrt) wird mit umgeplant – Gesperrtes bleibt, der Rest folgt dem neuen Sonntag", async () => {
  const sim = await neu(); sim.S.tag(W3, "07:00");
  const U = sim.win.V66UI, W4 = addDays(W3, 7), W5 = addDays(W3, 14), so4 = addDays(W4, 6), sa5 = addDays(W5, 5);
  await folgeVorbereiten(sim);
  assert.equal(await U.aendern(W5, { art: "sperren", date: sa5 }), null); sim.S.neu();
  const E5 = E(sim, W5); assert.ok(E5 && E5.tage[sa5] && E5.tage[sa5].gesperrt, "Woche danach gespeichert, Samstag gesperrt");
  const sa5vor = txt(plan(sim, sa5).map((e) => e.uid));
  assert.ok(plan(sim, W5).some((e) => V66.hart(e)), "harte Einheit am Montag danach");
  assert.equal(await U.aendern(W4, { art: "hinzufuegen", date: so4, einheit: { vorlage: "lauf_vo2", dauer: 50 } }), null); sim.S.neu();
  assert.ok(!plan(sim, W5).some((e) => V66.hart(e) && (e.sport === "lauf" || e.sport === "rad")), "gespeicherte Woche danach umgeplant: " + zeig(sim, W5));
  assert.equal(txt(plan(sim, sa5).map((e) => e.uid)), sa5vor, "der gesperrte Samstag bleibt, wie er ist");
  assert.ok(E(sim, W5).tage[sa5].gesperrt, "Sperre bleibt gespeichert");
});
