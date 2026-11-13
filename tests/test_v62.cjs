// Abnahmetests V6.2 (js/v62.js, testplan-1.0) – erfundene Termine und Tests mit bekanntem Ergebnis.
// Aufruf: node --test tests/test_v62.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = undefined;
const FK = require("../js/formkurve.js");
globalThis.FK = FK;
const AN = require("../js/analyse.js");
const V62 = require("../js/v62.js");

const HEUTE = "2026-11-16";
const RENNEN = [{ name: "Rennen B", short: "B", date: "2027-04-24", prio: "B" }, { name: "Rennen A", short: "A", date: "2027-06-06", prio: "A" }];
const S = AN.saison(HEUTE, RENNEN);
const ctx = (x) => Object.assign({ heute: HEUTE, bis: "2027-06-06", wochen: S.wochen, rennen: RENNEN, erledigt: { css: [], rad: [], lauf: [], check: [] }, fest: [], planned: [], sperren: [] }, x || {});
const wt = (d) => new Date(d + "T12:00:00Z").getUTCDay();
const tage = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const erholungsSamstage = new Set(S.wochen.filter((w) => w.erholung).map((w) => V62.addDays(w.woche, 5)));

test("Rad-Stufentest: als Nächstes ausbelastet, wenn der letzte es nicht war; danach alle 8 Wochen am Samstag einer Erholungswoche", () => {
  const P = V62.testplan(ctx({ erledigt: { rad: [{ date: "2026-05-02", ausbelastet: false }] } })).vorschlaege.filter((v) => v.kind === "stufentest" && v.sport === "rad");
  assert.ok(P.length >= 2);
  assert.ok(P.every((v) => wt(v.date) === 6 && erholungsSamstage.has(v.date)), "Samstag einer Erholungswoche");
  assert.equal(P[0].date, [...erholungsSamstage].filter((d) => d >= V62.addDays(HEUTE, 2)).sort()[0], "die erste Erholungswoche");
  assert.match(P[0].note, /nicht ausbelastet/);
  for (let i = 1; i < P.length; i++) assert.ok(tage(P[i - 1].date, P[i].date) >= 49, "mindestens 8 Wochen (−1 Woche Spielraum)");
});

test("Stufentests: nie in den 14 Tagen vor einem Rennen, in der Woche danach oder im Taper", () => {
  const P = V62.testplan(ctx()).vorschlaege.filter((v) => v.kind === "stufentest");
  for (const v of P) for (const r of RENNEN) {
    const d = tage(v.date, r.date);
    assert.ok(!(d >= 0 && d <= 14) && !(d < 0 && -d <= 7), `${v.date} zu nahe an ${r.date}`);
  }
  const taper = new Set(S.wochen.filter((w) => w.phase === "Taper").map((w) => w.woche));
  assert.ok(P.every((v) => !taper.has(V62.addDays(v.date, -5))));
});

test("Lauf-Stufentest: 8–12 Wochen Abstand, nie in derselben Woche wie der Rad-Test", () => {
  const R = V62.testplan(ctx({ erledigt: { rad: [{ date: "2026-10-10", ausbelastet: true }], lauf: [{ date: "2026-09-05", ausbelastet: true }] } }));
  const rad = new Set(R.vorschlaege.filter((v) => v.kind === "stufentest" && v.sport === "rad").map((v) => v.date));
  const lauf = R.vorschlaege.filter((v) => v.kind === "stufentest" && v.sport === "lauf");
  assert.ok(lauf.length >= 1);
  assert.ok(lauf.every((v) => !rad.has(v.date)), "andere Erholungswoche als Rad");
  assert.ok(tage("2026-09-05", lauf[0].date) >= 56, "frühestens 8 Wochen nach dem letzten");
});

test("CSS-Test: eingetragene Termine bleiben, Regelverstoss wird gezeigt (mit Vorschlag), Lücken über 8 Wochen gefüllt", () => {
  const R = V62.testplan(ctx({ fest: [{ date: "2026-11-19", kind: "css", status: "geplant" }, { date: "2027-01-07", kind: "css", status: "geplant" },
    { date: "2027-02-11", kind: "css", status: "geplant" }], sperren: [{ von: "2027-02-06", bis: "2027-02-21", grund: "Reise" }] }));
  const k = R.konflikte.find((x) => x.date === "2027-02-11");
  assert.ok(k, "11.2. verletzt die Regeln");
  assert.match(k.text, /nur 5 Wochen/);
  assert.match(k.text, /Reise/);
  assert.ok(k.vorschlag > "2027-02-21" && wt(k.vorschlag) === 4, "Vorschlag nach der Abwesenheit, gleicher Wochentag");
  const css = R.vorschlaege.filter((v) => v.kind === "css");
  assert.ok(css.length >= 1 && css[0].date > "2027-02-11" && tage("2027-02-11", css[0].date) >= 42 && tage("2027-02-11", css[0].date) <= 56, "nach dem letzten Termin 6–8 Wochen");
  assert.ok(css.every((v) => wt(v.date) === 4), "gleicher Wochentag wie zuletzt (Kursabende bleiben frei)");
  assert.ok(!R.vorschlaege.some((v) => v.kind === "css" && v.date < "2027-02-11"), "zwischen eingetragenen Terminen ≤ 8 Wochen kein Vorschlag");
});

test("Kurzcheck: alle 2 Wochen in einer Grundlagenfahrt aus dem Kalender, nicht neben einem Stufentest", () => {
  const planned = [{ date: "2026-11-18", sport: "rad", title: "Grundlage 90 min", dur_s: 5400 }, { date: "2026-11-19", sport: "rad", title: "VO2max Intervalle", dur_s: 3600 }];
  const R = V62.testplan(ctx({ erledigt: { check: ["2026-11-03"] }, planned }));
  const ch = R.vorschlaege.filter((v) => v.kind === "check");
  assert.equal(ch[0].date, "2026-11-18", "fällig 17.11., Grundlagenfahrt am 18.11.");
  assert.match(ch[0].note, /Grundlage 90 min/);
  const stufen = R.vorschlaege.filter((v) => v.kind === "stufentest" && v.sport === "rad").map((v) => v.date);
  assert.ok(ch.every((c) => !stufen.some((s) => Math.abs(tage(s, c.date)) <= 4)), "kein Kurzcheck neben einem Rad-Stufentest");
  for (let i = 1; i < ch.length; i++) assert.ok(tage(ch[i - 1].date, ch[i].date) >= 14);
  assert.ok(ch.every((c) => c.date <= V62.addDays(HEUTE, 56)), "rollend 8 Wochen");
});

test("Grundlagenfahrt erkennen: lange lockere Fahrt ja, Intervalle oder kurz nein", () => {
  assert.equal(V62.grundlage({ sport: "rad", title: "Fatmax", dur_s: 7200 }), true);
  assert.equal(V62.grundlage({ sport: "rad", title: "Tempo über-unter", dur_s: 6000 }), false);
  assert.equal(V62.grundlage({ sport: "rad", title: "Grundlage", dur_s: 2400 }), false);
  assert.equal(V62.grundlage({ sport: "lauf", title: "Grundlage", dur_s: 4000 }), false);
});

/* ----- V6.2.2 zonenvorschlag-1.0 (erfundene Tests, keine persönlichen Werte) ----- */
const RAD = { test: "t-rad", datum: "2026-01-10", sport: "rad", protokoll: "demo-rad", datenstatus: "bestätigt", ausbelastet: false,
  stufen: [120, 140, 160, 180, 200, 220, 240, 260].map((x, i) => ({ x, la: [1, 1, 1.1, 1.2, 1.4, 1.8, 2.5, 3.6][i], hf: 110 + i * 7 })),
  methoden: { somc: { x: 180, hf: 131 }, basis05: { x: 196, hf: 136.6 }, dickhuth: { x: 236, hf: 151.6 } },
  lt1: { status: "vorläufig", lo: 180, hi: 196, methoden: ["somc", "basis05"] }, lt2: { status: "vorläufig", lo: 236, hi: 236, methoden: ["dickhuth"], grund: "nicht ausbelastet: Dmax ungültig" } };
const LAUF = { test: "t-lauf", datum: "2026-01-12", sport: "lauf", protokoll: "demo-lauf", datenstatus: "vorschau", stufen: [9, 10, 11, 12, 13, 14].map((x, i) => ({ x, hf: 135 + i * 9 })),
  methoden: { somc: { x: 11, hf: 153 }, dickhuth: { x: 13.4, hf: 174.6 } }, lt1: { lo: 11, hi: 11, methoden: ["somc"] }, lt2: { lo: 13.4, hi: 13.4, methoden: ["dickhuth"] } };
const g = (s) => V62.grenzenListe(s);

test("Zonen-Vorschlag: Faktoren aus der Skala nach Tønnessen et al. 2024 (Grenzen = Mitte zwischen den Spannen)", () => {
  const F = V62.zonenFaktoren();
  assert.ok(Math.abs(F.leistung.unten - 65.5 / 80.5) < 1e-12 && Math.abs(F.leistung.oben - 93.5 / 87.5) < 1e-12);
  assert.ok(Math.abs(F.puls.unten - 72.5 / 82.5) < 1e-12 && Math.abs(F.puls.oben - 92.5 / 87.5) < 1e-12);
  assert.match(V62.zonenRegelText(), /0,81 × LT1 und 1,07 × LT2/);
});

test("Zonen-Vorschlag Rad: Z2/Z3 = LT1 (Mitte der Methoden), Z3/Z4 = LT2, Puls an der Schwelle aus den Stufen; Grenzen lückenlos", () => {
  const v = V62.zonenVorschlag(RAD, {}, { namen: { somc: "SOMC", basis05: "Basis + 0,5", dickhuth: "Dickhuth" } });
  assert.ok(v.ok && v.bestaetigt);
  assert.deepEqual(v.skalen.map((s) => s.key), ["rad_w", "rad_hf"]);
  assert.deepEqual(g(v.skalen[0]), [Math.round(188 * 65.5 / 80.5), 188, 236, Math.round(236 * 93.5 / 87.5)]);
  assert.equal(v.lt1.hf, 110 + 7 * 3 + (8 / 20) * 7, "Puls bei 188 W linear zwischen den Stufen 180 und 200 W");
  assert.deepEqual(g(v.skalen[1]), [Math.round(v.lt1.hf * 72.5 / 82.5), Math.round(v.lt1.hf), 152, Math.round(151.6 * 92.5 / 87.5)]);
  for (const s of v.skalen) {
    assert.equal(s.zonen[0].von, null); assert.equal(s.zonen[4].bis, null);
    for (let i = 1; i < 5; i++) assert.equal(s.zonen[i].von, s.zonen[i - 1].bis);
    assert.ok(s.protokoll === "demo-rad" && /LT1 · SOMC, Basis \+ 0,5 \(Mitte\)/.test(s.grenzen[String(g(s)[1])]) || s.metrik === "puls");
  }
  assert.ok(v.hinweise.some((h) => /LT2 nur aus einer gültigen Methode \(Test nicht ausbelastet/.test(h)));
});

test("Zonen-Vorschlag: gewählte Methode statt Mitte; Laufen als Pace (s/km, fallend); Vorschau-Test bleibt unbestätigt", () => {
  const v = V62.zonenVorschlag(RAD, { lt1: "somc" });
  assert.equal(g(v.skalen[0])[1], 180); assert.equal(v.lt1.hf, 131);
  const w = V62.zonenVorschlag(LAUF, {});
  assert.ok(w.ok && !w.bestaetigt);
  assert.deepEqual(g(w.skalen[0]), [Math.round(3600 / (11 * 65.5 / 80.5)), Math.round(3600 / 11), Math.round(3600 / 13.4), Math.round(3600 / (13.4 * 93.5 / 87.5))]);
  assert.ok(w.skalen[0].umfang[0] > w.skalen[0].umfang[1], "Pace-Skala von langsam nach schnell");
});

test("Zonen-Vorschlag: ohne LT2 oder ohne Puls kein Raten", () => {
  const ohneLt2 = Object.assign({}, RAD, { lt2: { status: "nicht bestimmbar", lo: null, hi: null, methoden: [], grund: "Kurve erreicht den Wert nicht" } });
  const a = V62.zonenVorschlag(ohneLt2, {});
  assert.ok(!a.ok && /LT2 nicht bestimmbar \(Kurve erreicht den Wert nicht\)/.test(a.grund));
  const ohnePuls = Object.assign({}, RAD, { stufen: RAD.stufen.map((s) => ({ x: s.x, la: s.la })), methoden: { somc: { x: 180 }, basis05: { x: 196 }, dickhuth: { x: 236 } } });
  const b = V62.zonenVorschlag(ohnePuls, {});
  assert.ok(b.ok); assert.deepEqual(b.skalen.map((s) => s.key), ["rad_w"]);
  assert.ok(b.hinweise.some((h) => /Pulszonen bleiben unverändert/.test(h)));
});

test("Zonenprofil: nur die bestätigte Sportart ersetzt, Rest unverändert; am selben Tag erweitert; Freigabe mit Datum", () => {
  const alt = { id: "alt", name: "Alt", status: "aktiv", gueltig_ab: "2025-10-01", skalen: ["rad_w", "rad_hf", "lauf_pace", "lauf_hf"].map((key) => ({ key, zonen: [{ z: "Z1", von: null, bis: 1 }, { z: "Z2", von: 1, bis: null }] })) };
  const p = V62.zonenProfil(alt, [V62.zonenVorschlag(RAD, {})], { heute: "2026-01-15", id: "zonen-20260115" });
  assert.equal(p.vorgaenger, "alt"); assert.equal(p.freigabe.datum, "2026-01-15"); assert.equal(p.gueltig_ab, "2026-01-15");
  assert.deepEqual(p.methodik.unveraendert, ["lauf_pace", "lauf_hf"]);
  assert.deepEqual(p.skalen.find((s) => s.key === "lauf_pace"), alt.skalen[2]);
  assert.equal(p.methodik.je_sportart.rad.test, "t-rad");
  const p2 = V62.zonenProfil(p, [V62.zonenVorschlag(Object.assign({}, LAUF, { datenstatus: "bestätigt" }), {})], { heute: "2026-01-15", id: "zonen-20260115" });
  assert.equal(p2.vorgaenger, "alt", "gleiche Fassung erweitert, Vorgänger bleibt");
  assert.deepEqual(Object.keys(p2.methodik.je_sportart).sort(), ["lauf", "rad"]);
  assert.deepEqual(p2.methodik.unveraendert, []);
  assert.match(p2.freigabe.text, /Rad und Laufen/);
});
