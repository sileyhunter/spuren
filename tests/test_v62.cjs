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
