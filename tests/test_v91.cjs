/* Abnahmetests V9.1 (Auftrag V9, Etappe 1): geplante Einheit und absolvierte Aktivität zusammenführen (zusammen-1.0). Erfundene Werte. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V91 = require("../js/v91.js");

const e = (uid, sport, dauer, titel) => ({ uid, sport, dauer, titel: titel || uid });
const a = (id, sport, min, extra) => Object.assign({ id, sport, mv: min * 60, dur: min * 60 + 120 }, extra || {});

test("zusammen-1.0: gleiche Sportart am selben Tag, eine Aktivität erledigt eine Einheit", () => {
  assert.equal(V91.VERSIONS.zusammen, "zusammen-1.0");
  const Z = V91.zuordnen([e("p1", "rad", 90)], [a("a1", "rad", 80)]);
  assert.equal(Z.zu.get("p1").id, "a1");
  assert.equal(Z.von.get("a1").uid, "p1");
  assert.deepEqual(Z.offen, []);
  assert.deepEqual(Z.frei, []);
});

test("zusammen-1.0: andere Sportart ordnet nichts zu, der Plan bleibt sichtbar", () => {
  const Z = V91.zuordnen([e("p1", "lauf", 60)], [a("a1", "rad", 60)]);
  assert.equal(Z.zu.size, 0);
  assert.deepEqual(Z.offen.map((x) => x.uid), ["p1"]);
  assert.deepEqual(Z.frei.map((x) => x.id), ["a1"]);
});

test("zusammen-1.0: zwei Einheiten derselben Sportart – die nächste Dauer gewinnt, jede Aktivität nur einmal", () => {
  const plan = [e("kurz", "rad", 45), e("lang", "rad", 180)];
  const Z = V91.zuordnen(plan, [a("a1", "rad", 170)]);
  assert.equal(Z.zu.get("lang").id, "a1");
  assert.deepEqual(Z.offen.map((x) => x.uid), ["kurz"], "die kürzere bleibt offen");
  const Z2 = V91.zuordnen(plan, [a("a1", "rad", 170), a("a2", "rad", 50)]);
  assert.equal(Z2.zu.get("lang").id, "a1");
  assert.equal(Z2.zu.get("kurz").id, "a2");
  assert.deepEqual(Z2.offen, []);
});

test("zusammen-1.0: eine zweite Aktivität derselben Sportart ohne Plan bleibt frei", () => {
  const Z = V91.zuordnen([e("p1", "lauf", 60)], [a("a1", "lauf", 58), a("a2", "lauf", 20)]);
  assert.equal(Z.zu.get("p1").id, "a1");
  assert.deepEqual(Z.frei.map((x) => x.id), ["a2"]);
});

test("zusammen-1.0: Garmin-Krafttraining zählt über sportVon als kraft", () => {
  const sportVon = (x) => (x.sport === "andere" && /kraft/i.test(x.name || "") ? "kraft" : x.sport);
  const Z = V91.zuordnen([e("k", "kraft", 60)], [a("a1", "andere", 55, { name: "Krafttraining" })], { sportVon });
  assert.equal(Z.zu.get("k").id, "a1");
  const Z2 = V91.zuordnen([e("k", "kraft", 60)], [a("a1", "andere", 55, { name: "Spaziergang" })], { sportVon });
  assert.equal(Z2.zu.size, 0);
});

test("zusammen-1.0: ohne Plandauer wird trotzdem zugeordnet, bei Gleichstand gilt die Reihenfolge", () => {
  const Z = V91.zuordnen([e("p1", "schwimm", null), e("p2", "schwimm", null)], [a("a1", "schwimm", 40)]);
  assert.equal(Z.zu.get("p1").id, "a1", "die frühere Einheit im Plan zuerst");
  assert.deepEqual(Z.offen.map((x) => x.uid), ["p2"]);
});

test("zusammen-1.0: leere und ungültige Eingaben", () => {
  const Z = V91.zuordnen(null, undefined);
  assert.equal(Z.zu.size, 0);
  assert.deepEqual(Z.offen, []);
  assert.deepEqual(Z.frei, []);
  const Z2 = V91.zuordnen([null, { sport: "rad" }], [null]);
  assert.equal(Z2.zu.size, 0, "Einheit ohne uid wird nie zugeordnet");
});

test("zusammen-1.0: Bewegungszeit vor Timer-Dauer", () => {
  assert.equal(V91.minuten({ mv: 3600, dur: 4200 }), 60);
  assert.equal(V91.minuten({ dur: 4200 }), 70);
  assert.equal(V91.minuten(null), 0);
});

test("zusammen-1.0: Vergleich geplant gegen absolviert in Worten", () => {
  assert.equal(V91.vergleich(e("p", "rad", 90), a("a", "rad", 92)).text, "Dauer wie geplant");
  assert.equal(V91.vergleich(e("p", "rad", 90), a("a", "rad", 120)).text, "30 min länger als geplant");
  assert.equal(V91.vergleich(e("p", "rad", 90), a("a", "rad", 60)).text, "30 min kürzer als geplant");
  assert.equal(V91.vergleich(e("p", "rad", null), a("a", "rad", 60)).text, "Dauer im Plan offen");
  assert.equal(V91.vergleich(null, a("a", "rad", 60)), null);
});

test("zusammen-1.0: Heute-Begrüssung zählt nur offene Einheiten, am Abend «alles erledigt»", () => {
  const t = (x) => x.titel;
  assert.equal(V91.heuteSatz([e("p", "rad", 60, "VO2max 30/15")], 0, t).text, "Heute steht «VO2max 30/15» an.");
  assert.equal(V91.heuteSatz([e("p", "rad", 60, "A"), e("q", "lauf", 30, "B")], 0, t).text, "Heute stehen 2 Einheiten an: «A» und «B».");
  assert.equal(V91.heuteSatz([e("q", "lauf", 30, "B")], 1, t).text, "Heute steht noch «B» an.");
  assert.equal(V91.heuteSatz([], 2, t).text, "Heute ist alles erledigt.");
  assert.equal(V91.heuteSatz([], 0, t).text, "Heute ist nichts geplant.");
});
