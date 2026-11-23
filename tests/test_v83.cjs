// Abnahmetests V8.3 «Täglicher Coach» (js/v83.js, tagescoach-1.0) mit erfundenen Wochen und Morgenwerten; dazu ampel-plan-1.2 (Nachholen als Vorschlag),
// V66.aendern «ersetzen» und die Prüfung der Entscheide (tools/tagescoach.py). Die Szenarien über mehrere Wochen stehen in tests/test_v80.cjs (A3, B3, D3, E2, H2).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V74 = require("../js/v74.js");
const V83 = require("../js/v83.js");

const MO = "2026-11-16", DI = "2026-11-17", MI = "2026-11-18", DO = "2026-11-19", FR = "2026-11-20", SA = "2026-11-21", SO = "2026-11-22";
const add = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const roh = (o) => V64.woche(Object.assign({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" }, o));
const tag = (w, d) => w.tage.find((t) => t.date === d);
const ids = (w, d) => tag(w, d).einheiten.map((e) => e.id);
/** Lage wie V83UI.lage: einheiten = was gilt (wa), plan = Mein Plan (w). */
function lage(w, heute, extra, wa) {
  const tage = w.tage.map((t) => ({ date: t.date, mo: MO, einheiten: tag(wa || w, t.date).einheiten, plan: t.einheiten, gesperrt: !!t.gesperrt, rennen: !!t.rennen,
    vorbei: t.date < heute, verf: null, ampel: tag(wa || w, t.date).ampel || null, ctx: {}, erledigt: [] }));
  return Object.assign({ heute, tage, days: [], ampelHeute: null, aktivitaeten: [], entscheide: [] }, extra || {});
}
/** 70 erfundene Morgen bis gestern (HRV um 60 ms, Ruhepuls um 50) und heute die angegebenen Werte. */
function morgen(heute, hrv, rhr) {
  const L = [];
  for (let i = 70; i >= 1; i--) L.push({ date: add(heute, -i), hrv: 60 + ((i * 7) % 5) - 2, rhr: 50 + ((i * 3) % 3) - 1, sleepH: 7.4 });
  L.push({ date: heute, hrv, rhr, sleepH: 7 });
  return L;
}
/** Optionen auf Mein Plan anwenden (V66.aendern, wie V66UI.aendernFolge) → { eintrag, w } */
function anwenden(R, aktionen, heute, eintrag) {
  const ctx = { heute, montag: MO, vorschlag: (d) => tag(R, d).einheiten };
  let E = eintrag || null;
  for (const a of aktionen) { const r = V66.aendern(E, a, ctx); assert.equal(r.fehler, undefined, `${a.art}: ${r.fehler}`); E = r.eintrag; }
  return { eintrag: E, w: V66.meinPlan(R, E, {}) };
}
const kern = (w) => w.tage.map((t) => `${t.date}:${t.einheiten.map((e) => `${e.id}/${e.dauer}`).sort().join(",")}`).join(" ");

test("Versionen und Festlegungen", () => {
  assert.equal(V83.VERSIONS.coach, "tagescoach-1.1");
  assert.equal(V74.VERSIONS.ampelplan, "ampel-plan-1.3");
  assert.deepEqual(V83.EINZEL, { hrv: 10, rhr: 5, faktor: 2, hrv_stark: 20, rhr_stark: 8, stark: 3 });
  assert.deepEqual(V83.ANLASS, ["schmerz", "morgen", "last", "ausgefallen", "zeit", "nachholen", "umfang"]);
  assert.deepEqual(V83.UMFANG, { min_defizit: 20, min_plus: 15, max_anteil: 0.5 });
  assert.deepEqual(V83.SCHMERZ.orte, ["Fuss", "Achilles/Wade", "Schienbein", "Knie", "Hüfte/Leiste", "Oberschenkel"]);
});

/* ---------- tagescoach-1.1 (V8.4): eigene Wochen aus Bausteinen (Kennungen wie ungespeicherte Wochen «v-<Datum>-<i>») ---------- */
const MO2 = add(MO, 7);
/** Tage einer Woche aus Bausteinen: { Datum: [Baustein-ID …] } → Lage-Tage (einheiten = plan). */
const D0 = { rad_lang: 135, lauf_lang: 70, rad_locker: 70, lauf_locker: 40 };      // Dauer wie in der Beispielwoche oben
function eigeneWoche(mo, plan, verf) {
  const T = [];
  for (let i = 0; i < 7; i++) {
    const d = add(mo, i), E = (plan[d] || []).map((id, k) => Object.assign(V64.einheit(id, D0[id] ? { d: D0[id] } : {}), { uid: `v-${d}-${k}`, quelle: "vorschlag", vorlage: id }));
    T.push({ date: d, mo, einheiten: E, plan: E, gesperrt: false, rennen: false, vorbei: false, verf: (verf && verf[d]) || null, ampel: null, ctx: {}, erledigt: [],
      phase: "Grundlage", erholung: false, laufGrenze: null });
  }
  return T;
}
function lage11(heute, tage, extra) {
  for (const t of tage) t.vorbei = t.date < heute;
  return Object.assign({ heute, tage, days: [], ampelHeute: null, aktivitaeten: [], entscheide: [], befinden: [] }, extra || {});
}
/** Aktionen nach Woche gruppiert anwenden (wie V83UI) – ungespeicherte Wochen mit ihren Bausteinen. */
function anwendenWochen(tage, aktionen, heute, start) {
  const W = new Map();
  for (const a of aktionen) { const mo = V64.montag(a.date); if (!W.has(mo)) W.set(mo, []); W.get(mo).push(a); }
  const out = new Map(start || []);
  for (const [mo, L] of W) {
    const ctx = { heute, montag: mo, vorschlag: (d) => (tage.find((t) => t.date === d) || { einheiten: [] }).einheiten.map((e) => ({ id: e.vorlage, dauer: e.dauer })) };
    let E = out.get(mo) || null;
    for (const a of L) { const r = V66.aendern(E, a, ctx); assert.equal(r.fehler, undefined, `${mo} ${a.art}: ${r.fehler}`); E = r.eintrag; }
    out.set(mo, E);
  }
  return out;
}

test("tagescoach-1.1 ausgefallen: Schlüsseleinheit von gestern ohne Aktivität → an Stelle einer lockeren nachholen, auch in der nächsten Woche", () => {
  const w1 = { [DI]: ["lauf_vo2"], [MI]: ["rad_locker"], [FR]: ["lauf_locker"], [SA]: ["rad_lang"], [SO]: ["lauf_lang"] };
  const T = eigeneWoche(MO, w1).concat(eigeneWoche(MO2, { [add(MO2, 2)]: ["lauf_locker"], [add(MO2, 5)]: ["rad_lang"] }));
  const r = V83.pruefen(lage11(MI, T.slice(0, 13)));
  const p = r.vorschlaege.find((x) => x.anlass === "ausgefallen");
  assert.ok(p, JSON.stringify(r.vorschlaege.map((x) => x.titel)));
  assert.equal(p.id, `co-${DI}-ausgefallen-v-${DI}-0`);
  assert.match(p.titel, /^Gestern ausgefallen: «.+» – am Fr nachholen\?$/);
  assert.deepEqual(p.optionen[0].aktionen.map((a) => [a.art, a.date, a.uid]), [["ersetzen", FR, `v-${FR}-0`]]);
  assert.equal(p.optionen[0].aktionen[0].einheit.vorlage, "lauf_vo2");
  // mit Aktivität derselben Sportart gestern: nichts
  const T2 = eigeneWoche(MO, w1); T2[1].erledigt = ["lauf"];
  assert.ok(!V83.pruefen(lage11(MI, T2)).vorschlaege.some((x) => x.anlass === "ausgefallen"));
  // Freitag gesperrt → nächste Woche (Mittwoch), Vorschlag gehört zu jener Woche
  const T3 = T.map((t) => (t.date === FR ? Object.assign({}, t, { gesperrt: true }) : t));
  const q = V83.pruefen(lage11(MI, T3.slice(0, 13))).vorschlaege.find((x) => x.anlass === "ausgefallen");
  assert.ok(q && /nächste Woche/.test(q.optionen[0].titel), JSON.stringify(q && q.optionen[0].titel));
  assert.equal(q.mo, MO2);
  assert.equal(q.optionen[0].aktionen[0].date, add(MO2, 2));
  // angewendet: Mein Plan der nächsten Woche hat die Schlüsseleinheit am Mittwoch, Rückweg holt den lockeren Lauf zurück
  const E = anwendenWochen(T3, q.optionen[0].aktionen, MI).get(MO2);
  assert.ok(E.tage[add(MO2, 2)].einheiten.some((e) => e.vorlage === "lauf_vo2"));
  assert.equal(V83.eintragPruefen(V83.eintrag(q, { status: "angenommen", jetzt: "2026-11-18T07:00:00Z" })), null);
});

test("tagescoach-1.1 umfang: fehlende Minuten der Woche → kommende lockere oder lange Einheit verlängern, nie über Verfügbarkeit, Phase oder Aufbau-Grenze", () => {
  const plan = { [MO]: [], [DI]: ["rad_locker"], [MI]: ["rad_locker"], [DO]: [], [FR]: ["lauf_locker"], [SA]: ["rad_lang"], [SO]: ["lauf_lang"] };
  const verf = { [SA]: { min: 300, sport: null }, [MI]: { min: 70, sport: null } };
  const T = eigeneWoche(MO, plan, verf);
  // Rad: 60 min fehlen (Dienstag ausgelassen) → Samstag lange Ausfahrt + 60? Grenze der Phase Grundlage 210 min → höchstens 210
  const L = lage11(MI, T, { woche: { mo: MO, plan: { rad: 70 }, ist: { rad: 10 } } });
  const p = V83.pruefen(L).vorschlaege.find((x) => x.anlass === "umfang");
  assert.ok(p, JSON.stringify(V83.pruefen(L)));
  assert.equal(p.date, SA);
  const neu = p.optionen[0].aktionen[0].dauer;
  assert.equal(p.optionen[0].aktionen[0].art, "dauer");
  assert.ok(neu > 135 && neu <= 135 + 60 && neu <= 210, String(neu));
  assert.deepEqual(p.optionen[0].rueck, [{ art: "dauer", date: SA, uid: `v-${SA}-0`, dauer: 135 }]);
  assert.ok(p.grund.some((g) => /es fehlen ≈ 1:00 h/.test(g)) && p.grund.some((g) => /die Woche bleibt bei Mein Plan/.test(g)), p.grund.join(" | "));
  // zu wenig Zeit am Samstag → kein Vorschlag dort
  const T2 = eigeneWoche(MO, plan, { [SA]: { min: 140, sport: null }, [MI]: { min: 70, sport: null } });
  assert.ok(!V83.pruefen(lage11(MI, T2, { woche: { mo: MO, plan: { rad: 70 }, ist: { rad: 10 } } })).vorschlaege.some((x) => x.anlass === "umfang" && x.date === SA));
  // Laufen nur mit Distanz ≈ unter der Aufbau-Grenze
  const T3 = eigeneWoche(MO, plan, { [SO]: { min: 200, sport: null } });
  for (const t of T3) t.laufGrenze = { km: 12 };
  const km = (e) => e.dauer / 6;                                         // 10 km/h, erfunden
  const knapp = V83.pruefen(lage11(MI, T3, { woche: { mo: MO, plan: { lauf: 60 }, ist: { lauf: 0 } }, laufKm: km })).vorschlaege.filter((x) => x.anlass === "umfang");
  assert.ok(!knapp.some((x) => x.date === SO), "langer Lauf 70 min ≈ 11,7 km, Grenze 12 km: kein Platz für 15 min mehr");
  const fr = knapp.find((x) => x.date === FR);
  assert.ok(fr && fr.optionen[0].aktionen[0].dauer <= 60 && fr.optionen[0].aktionen[0].dauer / 6 <= 12, "der kürzere Lauf am Freitag: höchstens die Hälfte mehr und unter 12 km");
  for (const t of T3) t.laufGrenze = { km: 16 };
  const ok = V83.pruefen(lage11(MI, T3, { woche: { mo: MO, plan: { lauf: 60 }, ist: { lauf: 0 } }, laufKm: km })).vorschlaege.find((x) => x.anlass === "umfang" && x.date === SO);
  assert.ok(ok && ok.optionen[0].aktionen[0].dauer <= 96 && ok.grund.some((g) => /unter deiner Aufbau-Grenze von 16 km/.test(g)), JSON.stringify(ok));
  for (const t of T3) t.laufGrenze = null;
  assert.equal(V83.pruefen(lage11(MI, T3, { woche: { mo: MO, plan: { lauf: 60 }, ist: { lauf: 0 } }, laufKm: km })).vorschlaege.filter((x) => x.anlass === "umfang").length, 0, "ohne Grenze kein längerer Lauf");
  // am Montag (Woche beginnt) nichts nachholen
  assert.equal(V83.pruefen(lage11(MO, T, { woche: { mo: MO, plan: { rad: 70 }, ist: { rad: 0 } } })).vorschlaege.filter((x) => x.anlass === "umfang").length, 0);
});

test("tagescoach-1.1 schmerz: leicht → Läufe 3 Tage locker und kürzer; deutlich → weglassen oder Rad; anhaltend → ganze Woche mit Rat zur Abklärung", () => {
  const plan = { [MI]: ["lauf_locker"], [DO]: ["lauf_vo2"], [FR]: ["lauf_locker"], [SA]: ["rad_lang"], [SO]: ["lauf_lang"] };
  const bef = (d, stufe, ort) => ({ date: d, schmerz: { stufe, ort } });
  const leicht = V83.pruefen(lage11(MI, eigeneWoche(MO, plan), { befinden: [bef(MI, "leicht", ["Knie"])] })).vorschlaege.filter((x) => x.anlass === "schmerz");
  assert.deepEqual(leicht.map((x) => x.date), [MI, DO, FR], "3 Tage, nicht der Sonntag");
  const doV = leicht.find((x) => x.date === DO);
  assert.equal(doV.optionen[0].art, "kurz"); assert.equal(doV.optionen[0].aktionen[0].einheit.vorlage, "lauf_locker");
  assert.ok(doV.grund[0].startsWith("Schmerzen leicht: Knie (Check-in heute)"));
  const deutlich = V83.pruefen(lage11(MI, eigeneWoche(MO, plan), { befinden: [bef(MI, "deutlich", ["Achilles/Wade"])] })).vorschlaege.filter((x) => x.anlass === "schmerz");
  assert.deepEqual(deutlich.map((x) => x.date), [MI, DO]);
  assert.deepEqual(deutlich[0].optionen.map((o) => o.art), ["weglassen", "rad"]);
  assert.equal(deutlich[0].optionen[1].aktionen[0].einheit.vorlage, "rad_locker");
  // Schulter: kein Grund, das Laufen zu bremsen
  assert.equal(V83.pruefen(lage11(MI, eigeneWoche(MO, plan), { befinden: [bef(MI, "deutlich", ["Schulter"])] })).vorschlaege.filter((x) => x.anlass === "schmerz").length, 0);
  // anhaltend (3 der letzten 5 Tage): bis Sonntag, mit Rat zur Abklärung
  const lang = V83.pruefen(lage11(MI, eigeneWoche(MO, plan), { befinden: [bef(add(MI, -2), "leicht", ["Knie"]), bef(DI, "leicht", ["Knie"]), bef(MI, "leicht", ["Knie"])] })).vorschlaege.filter((x) => x.anlass === "schmerz");
  assert.ok(lang.some((x) => x.date === SO) && lang[0].grund.some((g) => /ärztlich abklären/.test(g)), JSON.stringify(lang.map((x) => x.date)));
  // angewendet: weglassen entfernt den Lauf, der Rückweg bringt ihn zurück
  const T = eigeneWoche(MO, plan), E = anwendenWochen(T, deutlich[0].optionen[0].aktionen, MI).get(MO);
  assert.equal(E.tage[MI].einheiten.length, 0);
  assert.equal(V83.eintragPruefen(V83.eintrag(deutlich[0], { status: "angenommen", option: 1, jetzt: "2026-11-18T07:00:00Z" })), null);
});

test("tagescoach-1.1 tauschen in die nächste Woche: entfernen und hinzufügen, nicht neben einer harten Einheit derselben Sportart", () => {
  const T = eigeneWoche(MO, { [SA]: ["rad_vo2"], [SO]: ["lauf_lang"] }).concat(eigeneWoche(MO2, { [add(MO2, 1)]: ["rad_locker"], [add(MO2, 3)]: ["lauf_locker"] }));
  const r = V83.pruefen(lage11(SA, T.slice(0, 14), { days: morgen(SA, 41, 58) }));
  const p = r.vorschlaege.find((x) => x.anlass === "morgen" && x.date === SA);
  assert.ok(p, JSON.stringify(r.vorschlaege.map((x) => x.titel)));
  const o = p.optionen.find((x) => x.art === "tauschen");
  assert.ok(o && /nächste Woche/.test(o.titel), JSON.stringify(p.optionen.map((x) => x.titel)));
  assert.deepEqual(o.aktionen.map((a) => [a.art, a.date]), [["entfernen", SA], ["hinzufuegen", add(MO2, 1)], ["entfernen", add(MO2, 1)], ["hinzufuegen", SA]]);
  const E = anwendenWochen(T, o.aktionen, SA);
  assert.ok(E.get(MO2).tage[add(MO2, 1)].einheiten.some((e) => e.vorlage === "rad_vo2") && E.get(MO).tage[SA].einheiten.some((e) => e.vorlage === "rad_locker"));
  // Rückweg auf den angenommenen Stand: beide Wochen wieder wie vorher
  const R2 = anwendenWochen(T, o.rueck, SA, E);
  const vl = (M, mo, d) => M.get(mo).tage[d].einheiten.map((e) => e.vorlage).join(",");
  assert.equal(vl(R2, MO, SA), "rad_vo2"); assert.equal(vl(R2, MO2, add(MO2, 1)), "rad_locker");
  // nächste Woche mit harter Radeinheit zwei Tage daneben: kein Tausch dorthin
  const T2 = eigeneWoche(MO, { [SA]: ["rad_vo2"] }).concat(eigeneWoche(MO2, { [add(MO2, 1)]: ["rad_locker"], [add(MO2, 3)]: ["rad_vo2"] }));
  const p2 = V83.pruefen(lage11(SA, T2.slice(0, 14), { days: morgen(SA, 41, 58) })).vorschlaege.find((x) => x.anlass === "morgen" && x.date === SA);
  assert.ok(!p2 || !p2.optionen.some((x) => x.art === "tauschen"), JSON.stringify(p2 && p2.optionen.map((x) => x.titel)));
});

test("Morgen: ein einzelner Morgen deutlich daneben – HRV und Ruhepuls zusammen, oder einer stark", () => {
  assert.equal(V83.morgen(morgen(MI, 41, 58), MI).status, "auffaellig");
  const m = V83.morgen(morgen(MI, 41, 58), MI);
  assert.ok(m.hrv.abw < -25 && m.rhr.abw > 7, JSON.stringify(m));
  assert.ok(m.gruende.some((g) => /^HRV heute −\d+ % gegenüber den 7 Tagen davor, deine tägliche Schwankung ±/.test(g)), m.gruende.join(" | "));
  assert.equal(V83.morgen(morgen(MI, 55, 51), MI).status, "normal", "leicht daneben: im Rahmen");
  assert.equal(V83.morgen(morgen(MI, 52, 50), MI).status, "normal", "HRV −13 % allein reicht nicht");
  assert.equal(V83.morgen(morgen(MI, 44, 50), MI).status, "auffaellig", "HRV −27 % allein: stark");
  assert.equal(V83.morgen(morgen(MI, 60, 59), MI).status, "auffaellig", "Ruhepuls +9 allein: stark");
  assert.equal(V83.morgen(morgen(MI, 60, 50).filter((d) => d.date !== MI), MI).status, "fehlt");
  assert.equal(V83.morgen([{ date: MI, hrv: 40, rhr: 60 }], MI).status, "normal", "ohne Vergleichswerte kein Urteil");
});

test("Härter als geplant: Last ab 1,3 × geplant und 15 mehr, oder hart statt locker", () => {
  const a = (tss, plan, hart) => ({ date: MI, sport: "rad", tss, dur_s: 3600, hart: hart ?? null, plan });
  const P = { titel: "Rad locker", tl: 50, stufe: "locker" };
  assert.equal(V83.haerter(a(80, P)).urteil, "haerter");
  assert.match(V83.haerter(a(80, P)).grund, /1,6 × geplant/);
  assert.equal(V83.haerter(a(60, P)).urteil, "wie geplant");
  assert.equal(V83.haerter(a(62, P)).urteil, "wie geplant", "1,24 × geplant: im Rahmen");
  assert.equal(V83.haerter(a(66, P)).urteil, "haerter", "1,32 × und 16 mehr");
  assert.equal(V83.haerter(a(26, { titel: "x", tl: 15, stufe: "locker" })).urteil, "wie geplant", "1,7 ×, aber nur 11 mehr");
  assert.equal(V83.haerter(a(55, P, true)).urteil, "haerter", "hart nach Puls, locker geplant");
  assert.equal(V83.haerter(a(55, Object.assign({}, P, { stufe: "hart" }), true)).urteil, "wie geplant", "hart geplant, hart gefahren");
  assert.equal(V83.haerter({ date: MI, sport: "rad", tss: 85, dur_s: 3600, hart: null, plan: null }).urteil, "haerter", "ohne Plan: Last pro Stunde ab 75");
  assert.equal(V83.haerter({ date: MI, sport: "schwimm", tss: 200, dur_s: 3600, plan: P }).urteil, "wie geplant", "nur an Land");
});

test("morgen: auffälliger Morgen → harte Einheit morgen locker (kein Tausch möglich), mit Grund und Rückweg", () => {
  const R = roh(), w = V66.meinPlan(R, null, {});
  const r = V83.pruefen(lage(w, MI, { days: morgen(MI, 41, 58) }));
  assert.equal(r.morgen.status, "auffaellig");
  const p = r.vorschlaege.find((x) => x.anlass === "morgen");
  assert.ok(p, JSON.stringify(r.vorschlaege));
  const U = tag(w, DO).einheiten.find((e) => e.id === "rad_vo2");
  assert.equal(p.date, DO); assert.equal(p.uid, U.uid); assert.equal(p.id, `co-${DO}-morgen-${U.uid}`);
  assert.deepEqual(p.optionen.map((o) => o.art), ["locker"], "nach dem Do kein lockeres Rad mehr in der Woche");
  assert.ok(p.grund.some((g) => /HRV heute/.test(g)) && p.grund.some((g) => /7-Tage-Schnitt/.test(g)));
  const x = anwenden(R, p.optionen[0].aktionen, MI);
  assert.deepEqual(ids(x.w, DO), ["rad_locker", "schwimm_css"]);
  const n = tag(x.w, DO).einheiten[0];
  assert.equal(n.uid, U.uid, "gleiche Kennung"); assert.ok(n.dauer <= U.dauer); assert.equal(V83.hart(n), false);
  const y = anwenden(R, p.optionen[0].rueck, MI, x.eintrag);
  assert.equal(kern(y.w), kern(w), "Rückweg holt den Stand vorher zurück");
  // die Ampel zeigt schon «vorsichtig»: kein zusätzlicher Vorschlag
  const r2 = V83.pruefen(lage(w, MI, { days: morgen(MI, 41, 58), ampelHeute: { status: "vorsichtig" } }));
  assert.equal(r2.vorschlaege.length, 0); assert.ok(r2.hinweise.some((h) => /Ampel zeigt heute schon/.test(h)));
  // normaler Morgen: nichts
  assert.equal(V83.pruefen(lage(w, MI, { days: morgen(MI, 60, 50) })).vorschlaege.length, 0);
});

test("Tauschen: harte Einheit mit der lockeren derselben Sportart an einem späteren Tag – ohne harte Nachbarn, Rückweg tauscht zurück", () => {
  const R = roh(), E0 = { id: "wo-" + MO, montag: MO, tage: { [DO]: { gesperrt: false, einheiten: [{ uid: "d1", vorlage: "rad_locker", dauer: 60, quelle: "eigen" }] } } };
  const w = V66.meinPlan(R, E0, {});
  const r = V83.pruefen(lage(w, DI, { days: morgen(DI, 41, 58) }));
  const p = r.vorschlaege.find((x) => x.date === DI);
  assert.ok(p, JSON.stringify(r.vorschlaege));
  assert.deepEqual(p.optionen.map((o) => o.art), ["tauschen", "locker"]);
  assert.match(p.optionen[0].titel, /auf Fr – dafür «Lauf locker» \(40 min\) heute/);
  const x = anwenden(R, p.optionen[0].aktionen, DI, E0);
  assert.deepEqual(ids(x.w, DI).sort(), ["lauf_locker", "schwimm_kurs"]); assert.deepEqual(ids(x.w, FR), ["lauf_vo2"]);
  assert.deepEqual(p.optionen[0].markiert.map((m) => m.date).sort(), [DI, FR].sort());
  const y = anwenden(R, p.optionen[0].rueck, DI, x.eintrag);
  assert.equal(kern(y.w), kern(w));
  // mit harter Einheit am Vortag des Ziels (Do Rad-Schlüssel) kein Tausch
  const w2 = V66.meinPlan(R, null, {});
  const p2 = V83.pruefen(lage(w2, DI, { days: morgen(DI, 41, 58) })).vorschlaege.find((x2) => x2.date === DI);
  assert.deepEqual(p2.optionen.map((o) => o.art), ["locker"]);
});

test("last: gestern deutlich härter als geplant → die harte Einheit heute; Hinweis aus den eigenen Reaktionen", () => {
  const w = V66.meinPlan(roh(), null, {}), plan = { uid: tag(w, MI).einheiten[0].uid, titel: "Rad locker", tl: 50, stufe: "locker" };
  const akt = [{ id: "a1", date: MI, sport: "rad", tss: 120, dur_s: 4200, hart: null, plan }];
  const r = V83.pruefen(lage(w, DO, { aktivitaeten: akt, reaktion: { erholtTag: 1 } }));
  const p = r.vorschlaege.find((x) => x.anlass === "last");
  assert.ok(p && p.date === DO, JSON.stringify(r.vorschlaege));
  assert.ok(p.grund[0].startsWith("Gestern: «Rad locker» mit Last ≈ 2,4 × geplant gefahren – zwei harte Tage an Land hintereinander vermeiden"), p.grund[0]);
  assert.match(p.grund[1], /ab Tag 1 wieder im Rahmen/);
  assert.match(r.geprueft.join(" "), /1 Einheit von gestern und heute gegen den Plan/);
  // wie geplant gefahren: nichts
  assert.equal(V83.pruefen(lage(w, DO, { aktivitaeten: [Object.assign({}, akt[0], { tss: 55 })] })).vorschlaege.length, 0);
  // heute schon Rad gefahren (eingespielt): keine Änderung mehr an der Radeinheit von heute
  const t = lage(w, DO, { aktivitaeten: akt }); t.tage.find((x) => x.date === DO).erledigt = ["rad"];
  assert.equal(V83.pruefen(t).vorschlaege.length, 0);
});

test("zeit: Tag mit zu wenig Zeit → Kurzfassung derselben Sportart; kurz genug für die Vorlage → nur kürzer", () => {
  const R = roh(), w = V66.meinPlan(R, null, {});
  const L = lage(w, FR); L.tage.find((t) => t.date === SA).verf = { min: 45, sport: null };
  const p = V83.pruefen(L).vorschlaege.find((x) => x.anlass === "zeit");
  assert.ok(p && p.date === SA, JSON.stringify(V83.pruefen(L)));
  assert.deepEqual(p.optionen[0].aktionen.map((a) => a.art), ["ersetzen"]);
  assert.match(p.optionen[0].titel, /«Grundlage» 45 min statt «Lange Ausfahrt» 2:15 h/);
  const x = anwenden(R, p.optionen[0].aktionen, FR);
  assert.deepEqual(tag(x.w, SA).einheiten.map((e) => [e.id, e.dauer]), [["rad_locker", 45]]);
  assert.equal(kern(anwenden(R, p.optionen[0].rueck, FR, x.eintrag).w), kern(w));
  // 100 min: die lange Ausfahrt bleibt, nur kürzer
  const L2 = lage(w, FR); L2.tage.find((t) => t.date === SA).verf = { min: 100, sport: null };
  const p2 = V83.pruefen(L2).vorschlaege.find((x2) => x2.anlass === "zeit");
  assert.deepEqual(p2.optionen[0].aktionen, [{ art: "dauer", date: SA, uid: tag(w, SA).einheiten[0].uid, dauer: 100 }]);
  // zwei Einheiten, 45 min: die längere einer erlaubten Sportart bleibt (gekürzt), die andere fällt weg; Rückweg fügt sie wieder an
  const w12 = V66.meinPlan(roh({ stunden: 12, css_s: 100 }), null, {}), R12 = roh({ stunden: 12, css_s: 100 });
  const L3 = lage(w12, FR); L3.tage.find((t) => t.date === SO).verf = { min: 45, sport: ["schwimm"] };
  const p3 = V83.pruefen(L3).vorschlaege.find((x3) => x3.anlass === "zeit");
  assert.deepEqual(p3.optionen[0].aktionen.map((a) => a.art), ["dauer", "entfernen"], JSON.stringify(p3.optionen[0].aktionen));
  const z = anwenden(R12, p3.optionen[0].aktionen, FR);
  assert.deepEqual(tag(z.w, SO).einheiten.map((e) => [e.id, e.dauer]), [["schwimm_locker", 45]]);
  const zr = anwenden(R12, p3.optionen[0].rueck, FR, z.eintrag);
  assert.deepEqual(tag(zr.w, SO).einheiten.map((e) => e.id).sort(), ["lauf_lang", "schwimm_locker"]);
  assert.deepEqual(tag(zr.w, SO).einheiten.map((e) => e.uid).sort(), tag(w12, SO).einheiten.map((e) => e.uid).sort(), "gleiche Kennungen nach dem Zurückholen");
  // feste Einheiten füllen die Zeit schon (Test am Sa): kein Vorschlag, nur ein Hinweis
  const wt = V66.meinPlan(roh({ tests: [{ date: SA, kind: "stufentest", sport: "rad", status: "geplant" }] }), null, {});
  const L5 = lage(wt, FR); L5.tage.find((t) => t.date === SA).verf = { min: 30, sport: null };
  const r5 = V83.pruefen(L5);
  assert.equal(r5.vorschlaege.filter((x) => x.anlass === "zeit").length, 0, JSON.stringify(r5.vorschlaege)); assert.ok(r5.hinweise.some((h) => /Sa: .*Zeit – die festen Einheiten/.test(h)), r5.hinweise.join(" | "));
  // passt: kein Vorschlag
  const L4 = lage(w, FR); L4.tage.find((t) => t.date === SA).verf = { min: 180, sport: null };
  assert.equal(V83.pruefen(L4).vorschlaege.length, 0);
});

test("nachholen (ampel-plan-1.2): Vorschlag statt von selbst; angenommen steht die Schlüsseleinheit am Zieltag", () => {
  const R = roh({ stunden: 12, css_s: 100 }), w = V66.meinPlan(R, null, {});
  const wa = V74.woche(w, (d) => (d === DO ? { status: "vorsichtig", ampel: "vorsichtig", gruende: ["HRV"] } : null));
  assert.ok(!wa.tage.some((t) => t.einheiten.some((e) => e.ampel && e.ampel.nachgeholt)));
  const r = V83.pruefen(lage(w, DO, {}, wa));
  const p = r.vorschlaege.find((x) => x.anlass === "nachholen");
  const css = tag(w, DO).einheiten.find((e) => e.id === "schwimm_css");
  assert.ok(p, JSON.stringify(r.vorschlaege));
  assert.equal(p.id, `co-${DO}-nachholen-${css.uid}`); assert.match(p.titel, /vom Do am So nachholen\?$/);
  const x = anwenden(R, p.optionen[0].aktionen, DO);
  assert.ok(ids(x.w, SO).includes("schwimm_css"), ids(x.w, SO).join(", "));
  assert.equal(kern(anwenden(R, p.optionen[0].rueck, DO, x.eintrag).w), kern(w));
});

test("Nie: gesperrte Einheit oder gesperrter Tag, vergangene Tage, schon entschiedene Vorschläge; Probelauf bis zum Enduco-Stichtag", () => {
  const R = roh(), days = morgen(MI, 41, 58);
  const w = V66.meinPlan(R, null, {}), U = tag(w, DO).einheiten.find((e) => e.id === "rad_vo2");
  const Eg = { id: "wo-" + MO, montag: MO, tage: { [DO]: { gesperrt: false, einheiten: [{ uid: U.uid, vorlage: "rad_vo2", dauer: 60, quelle: "vorschlag", gesperrt: true }] } } };
  assert.equal(V83.pruefen(lage(V66.meinPlan(R, Eg, {}), MI, { days })).vorschlaege.length, 0, "gesperrte Einheit");
  const Et = { id: "wo-" + MO, montag: MO, tage: { [DO]: { gesperrt: true, einheiten: null } } };
  assert.equal(V83.pruefen(lage(V66.meinPlan(R, Et, {}), MI, { days })).vorschlaege.length, 0, "gesperrter Tag");
  const p = V83.pruefen(lage(w, MI, { days })).vorschlaege[0];
  const e = V83.eintrag(p, { status: "abgelehnt", jetzt: "2026-11-18T07:00:00.000Z" });
  assert.equal(V83.pruefen(lage(w, MI, { days, entscheide: [e] })).vorschlaege.length, 0, "abgelehnt: nicht nochmals");
  // V66.aendern: vergangene Tage und gesperrte Einheiten bleiben auch beim Ersetzen
  assert.equal(V66.aendern(null, { art: "ersetzen", date: DI, uid: "v-" + DI + "-0", einheit: { vorlage: "lauf_locker", dauer: 40 } }, { heute: MI, montag: MO, vorschlag: (d) => tag(R, d).einheiten }).fehler, "vergangen – nur lesen");
  assert.match(V66.aendern(Eg, { art: "ersetzen", date: DO, uid: U.uid, einheit: { vorlage: "rad_locker", dauer: 60 } }, { heute: MI, montag: MO, vorschlag: (d) => tag(R, d).einheiten }).fehler, /gesperrt/);
  assert.equal(V83.pruefen(lage(w, MI, { enduco_bis: "2026-11-30" })).probelauf, true);
  assert.equal(V83.pruefen(lage(w, "2026-12-01", { enduco_bis: "2026-11-30" })).probelauf, false);
});

test("Entscheid: Eintrag, Prüfung (wie tools/tagescoach.py), Zusammenführen und Markierung", () => {
  const R = roh(), w = V66.meinPlan(R, null, {});
  const p = V83.pruefen(lage(w, MI, { days: morgen(MI, 41, 58) })).vorschlaege[0];
  const an = V83.eintrag(p, { status: "angenommen", option: 0, jetzt: "2026-11-18T07:00:00.000Z" });
  assert.equal(V83.eintragPruefen(an), null);
  assert.deepEqual([an.art, an.woche, an.rueck.length, an.markiert.length], ["locker", MO, 1, 1]);
  const ab = V83.eintrag(p, { status: "abgelehnt", jetzt: "2026-11-18T08:00:00.000Z" });
  const zur = Object.assign({}, an, { status: "zurueck", am: "2026-11-18T09:00:00.000Z" });
  const falsch = [
    Object.assign({}, an, { id: "co-2026-11-19-morgen" }), Object.assign({}, an, { date: MI }), Object.assign({}, an, { status: "vielleicht" }),
    Object.assign({}, an, { am: "gestern" }), Object.assign({}, an, { titel: "" }), Object.assign({}, an, { art: "weg" }), Object.assign({}, an, { woche: MI }),
    Object.assign({}, an, { rueck: [] }), Object.assign({}, an, { rueck: [{ art: "loeschen", date: DO, uid: "x" }] }),
    Object.assign({}, an, { rueck: [{ art: "ersetzen", date: DO, uid: "x", einheit: { vorlage: "Rad!", dauer: 60 } }] }),
    Object.assign({}, an, { rueck: [{ art: "dauer", date: DO, uid: "x", dauer: 2 }] }), Object.assign({}, an, { markiert: [{ date: DO, uid: "x" }] }),
  ];
  for (const f of falsch) assert.ok(V83.eintragPruefen(f), JSON.stringify(f).slice(0, 120));
  // gleiche Regeln in Python
  const py = execFileSync("python3", ["-I", "-c", `import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(__dirname, "..", "tools"))}); import tagescoach
for e in json.load(sys.stdin): print("ok" if tagescoach.pruefen(e) is None else "fehler")`], { input: JSON.stringify([an, ab, zur, ...falsch]) }).toString().trim().split("\n");
  assert.deepEqual(py, ["ok", "ok", "ok", ...falsch.map(() => "fehler")]);
  // zusammenführen: der spätere Zeitpunkt gilt; Markierung nur aus angenommenen
  const M = V83.entscheide([an], [ab]);
  assert.equal(M.get(p.id).status, "abgelehnt");
  assert.equal(V83.marke(V83.entscheide([an]), DO, p.uid), an.markiert[0].vorher);
  assert.equal(V83.marke(M, DO, p.uid), null);
});
