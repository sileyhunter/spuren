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
  assert.equal(V83.VERSIONS.coach, "tagescoach-1.0");
  assert.equal(V74.VERSIONS.ampelplan, "ampel-plan-1.2");
  assert.deepEqual(V83.EINZEL, { hrv: 10, rhr: 5, faktor: 2, hrv_stark: 20, rhr_stark: 8, stark: 3 });
  assert.deepEqual(V83.ANLASS, ["morgen", "last", "zeit", "nachholen"]);
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
