// Abnahmetests V9.24.0: Einheit-Seite zeigt Einfahren/Ausfahren als Rampe mit Bereich und VO2max mit Obergrenze (gleich wie im Export). Alle Zonen sind erfunden.
// Aufruf: node --test tests/test_v9240.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V73 = require("../js/v73.js");

const SK = {
  rad_w: [{ z: "Z1", von: null, bis: 190 }, { z: "Z2", von: 190, bis: 235 }, { z: "Z3", von: 235, bis: 285 }, { z: "Z4", von: 285, bis: 330 }, { z: "Z5", von: 330, bis: null }],
  rad_hf: [{ z: "Z1", von: null, bis: 135 }, { z: "Z2", von: 135, bis: 148 }, { z: "Z3", von: 148, bis: 163 }, { z: "Z4", von: 163, bis: 172 }, { z: "Z5", von: 172, bis: null }],
  lauf_hf: [{ z: "Z1", von: null, bis: 135 }, { z: "Z2", von: 135, bis: 148 }, { z: "Z3", von: 148, bis: 163 }, { z: "Z4", von: 163, bis: 172 }, { z: "Z5", von: 172, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 400 }, { z: "Z2", von: 400, bis: 350 }, { z: "Z3", von: 350, bis: 310 }, { z: "Z4", von: 310, bis: 285 }, { z: "Z5", von: 285, bis: null }],
};
const mmss = (s) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

test("VO2max-Ziel mit Obergrenze: Rad 115 % auf 5 W, Laufen 115 % der Geschwindigkeit; geschlossenes Z5 bleibt wie es ist", () => {
  assert.equal(V64.ziel("vo2", "rad", SK), "330–380 W · Puls über 172 (steigt verzögert)");
  assert.equal(V64.ziel("vo2", "lauf", SK), "4:45–4:08/km · Puls über 172 (steigt verzögert)");
  const zu = { rad_w: SK.rad_w.map((z) => (z.z === "Z5" ? { z: "Z5", von: 330, bis: 360 } : z)) };
  assert.equal(V64.ziel("vo2", "rad", zu), "330–360 W");
  assert.equal(V64.z5Oben("rad", 315), 360, "wie enduco: 315–360 W");
  assert.equal(V64.z5Oben("rad", null), null); assert.equal(V64.z5Oben("schwimm", 100), null);
});

test("Anzeige und Export haben dieselbe Obergrenze; gefahren wird die Mitte (Zwift nimmt bei einem Bereich die Mitte)", () => {
  const g = V66.garminZiel("vo2", "rad", SK), a = V64.ziel("vo2", "rad", SK).match(/^(\d+)–(\d+) W/);
  assert.deepEqual([g.lo, g.hi], [+a[1], +a[2]]);
  assert.equal((g.lo + g.hi) / 2, 355);
  const gl = V66.garminZiel("vo2", "lauf", SK), p = V64.ziel("vo2", "lauf", SK).match(/^(\d+:\d+)–(\d+:\d+)\/km/);
  assert.deepEqual([mmss(1000 / gl.lo), mmss(1000 / gl.hi)], [p[1], p[2]]);
});

test("Rampenbereich: Anzeige (V64.rampeBereich) = Export (V66.garminRampe), Rad, Puls, Laufen; RPE ohne Bereich", () => {
  const r = V64.rampeBereich("rad", "leistung", SK);
  assert.deepEqual([r.lo, r.hi, r.text], [65, 190, "65–190 W"]);
  const g = V66.garminRampe("ein", "rad", "leistung", SK);
  assert.deepEqual([g.ziel.lo, g.ziel.hi], [r.lo, r.hi]);
  const p = V64.rampeBereich("rad", "puls", SK), gp = V66.garminRampe("aus", "rad", "puls", SK);
  assert.equal(p.text, "Puls 103–135"); assert.deepEqual([gp.ziel.lo, gp.ziel.hi], [p.lo, p.hi]); assert.equal(gp.text, "Ausfahren Puls 135→103");
  const l = V64.rampeBereich("lauf", "pace", SK), gl = V66.garminRampe("ein", "lauf", "pace", SK);
  assert.equal(l.text, "10:08–6:40/km"); assert.equal(gl.text, "Einlaufen 10:08→6:40 /km");
  assert.equal(V64.rampeBereich("rad", "rpe", SK), null);
  assert.equal(V64.rampeBereich("rad", "leistung", {}), null);
  assert.equal(V64.rampeBereich("schwimm", "pace", SK), null);
});

const rampen = (baum) => baum.filter((n) => n.typ === "s" && n.ramp).map((n) => [n.ramp, n.s]);
const garminRampen = (id, dauer) => {
  const e = V66.einheit({ uid: "r", vorlage: id, dauer, quelle: "eigen" });
  const S = V66.garminWorkout(e, SK, { uid: "r" }).workout.workoutSegments[0].workoutSteps;
  return { e, r: S.filter((s) => s.stepType && (s.stepType.stepTypeKey === "warmup" || s.stepType.stepTypeKey === "cooldown") && /^(Einfahren|Ausfahren|Einlaufen|Auslaufen) \d/.test(s.description || ""))
    .map((s) => [s.stepType.stepTypeKey === "warmup" ? "ein" : "aus", s.endConditionValue]) };
};

test("Einheit-Seite: Rampe vorn und hinten wie im Export (gleiche Dauern, Dauer und Zonenzeiten bleiben)", () => {
  for (const [id, d] of [["rad_locker", 90], ["rad_tempo", 75], ["rad_vo2", 60]]) {
    const { e, r } = garminRampen(id, d), baum = V73.ausTeilen(Object.assign({}, e, { sport: "rad" }));
    assert.deepEqual(rampen(baum), r, `${id}: Rampen wie im Export`);
    assert.equal(V73.dauer(baum), Math.round(e.teile.reduce((s, t) => s + t[1], 0) * 60), `${id}: Gesamtdauer bleibt`);
    const zt = V73.zonenZeiten(baum).z, soll = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const [k, m] of e.teile) { const nr = V73.ZNR[k]; if (nr) soll[nr] += Math.round(m * 60); }
    assert.deepEqual(zt, soll, `${id}: Zeit je Zone bleibt (Rampe zählt in der Zone des Abschnitts)`);
  }
});

test("Einheit-Seite: Texte und Arten der Rampe; Rest vor/hinter der Rampe bleibt Einfahren bzw. Ausfahren; lange Grundlage hat Hauptteil in der Mitte", () => {
  const e = V64.einheit("rad_vo2", {}); e.sport = "rad";
  const b = V73.ausTeilen(e), s = b.filter((n) => n.typ === "s");
  assert.equal(s[0].ramp, "ein"); assert.equal(s[0].text, "Langsam aufwärmen"); assert.equal(s[0].art, "ein");
  assert.equal(s[s.length - 1].ramp, "aus"); assert.equal(s[s.length - 1].text, "Locker ausrollen"); assert.equal(s[s.length - 1].art, "aus");
  assert.equal(s[s.length - 2].art, "aus"); assert.equal(s[s.length - 2].text, "Locker ausfahren");
  const l = V64.einheit("lauf_vo2", {}); l.sport = "lauf";
  const ls = V73.ausTeilen(l).filter((n) => n.typ === "s");
  assert.equal(ls[0].text, "Langsam einlaufen"); assert.equal(ls[ls.length - 1].text, "Langsam auslaufen"); assert.equal(ls[ls.length - 2].text, "Locker auslaufen");
  const g = V73.ausTeilen({ id: "x", sport: "rad", teile: [["z1", 10], ["z2", 80]] });
  assert.deepEqual(g.map((n) => [n.art, n.ramp || "", Math.round(n.s / 15) / 4]), [["ein", "ein", 6.75], ["ein", "", 3.25], ["belastung", "", 73.25], ["aus", "aus", 6.75]]);
});

test("Keine Rampe: kurze Einheit, Schwimmen, unbekannte Sportart, ohne Dauer", () => {
  const kurz = V73.ausTeilen({ id: "x", sport: "rad", teile: [["z1", 10]] });
  assert.equal(kurz.length, 1); assert.ok(!kurz[0].ramp);
  assert.ok(!V73.ausTeilen({ id: "x", sport: "schwimm", teile: [["z1", 10], ["z2", 80]] }).some((n) => n.ramp));
  assert.ok(!V73.ausTeilen({ id: "x", teile: [["z1", 10], ["z2", 80]] }).some((n) => n.ramp));
  assert.deepEqual(V73.rampen([], "rad"), []);
});
