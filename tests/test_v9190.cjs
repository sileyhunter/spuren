// Abnahmetests V9.19.0 (Auftrag FatMax · Zonen · enduco, Etappe C): neue Vorlagen nach dem Aufbau der enduco-Einheiten (vorlagen-enduco-1.0).
// Nur Aufbau und Anteile; keine Pace-/Watt-Werte aus enduco. Alle Zonen erfunden. Aufruf: node --test tests/test_v9190.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V73 = require("../js/v73.js");
const V94 = require("../js/v94.js");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const NEU = { rad: ["rad_fatmax", "rad_fatmax_int", "rad_fatmax_pyr", "rad_sweet", "rad_sweet_int"], lauf: ["lauf_fatmax", "lauf_fatmax_int", "lauf_sweet"] };
const bau = (id, d) => V66.einheit({ uid: "x", vorlage: id, dauer: d, quelle: "eigen" }, {});
const min = (e, k) => e.teile.filter((t) => t[0] === k).reduce((s, t) => s + t[1], 0);

test("Namen wie in enduco, je Sportart und Unterstufe; Dauerfassungen zu einer Vorlage mit Bereich zusammengefasst", () => {
  const titel = (sp, stufe) => V94.stufen(V66.vorlagen(sp)).find((s) => s.k === stufe).vorlagen.map((v) => v.titel);
  assert.deepEqual(titel("rad", "fatmax"), ["FatMax", "FatMax Intervalle", "FatMax Pyramide"]);
  assert.deepEqual(titel("rad", "sweet"), ["Sweet Spot gleichmässig", "Sweet Spot Intervalle"]);
  assert.deepEqual(titel("lauf", "fatmax"), ["FatMax", "FatMax Intervalle"]);
  assert.deepEqual(titel("lauf", "sweet"), ["Sweet Spot"]);
  for (const sp of Object.keys(NEU)) for (const id of NEU[sp]) {
    const v = V66.vorlagen(sp).find((x) => x.id === id); assert.ok(v, id); assert.equal(v.fest, false, id + ": Dauer frei");
    assert.ok(v.max >= v.min * 1.5, id + ": Dauerbereich statt einzelner Fassungen");
  }
});

test("FatMax Intervalle: Blöcke in FatMax mit Z2-Erholung, Einfahren und Ausfahren, Erholung kürzer als der Block", () => {
  for (const [id, d] of [["rad_fatmax_int", 90], ["rad_fatmax_int", 180], ["lauf_fatmax_int", 60], ["lauf_fatmax_int", 120]]) {
    const e = bau(id, d), b = V73.ausTeilen(e).find((n) => n.typ === "b");
    assert.ok(b && b.wdh >= 2, `${id} ${d}`); assert.equal(b.schritte.length, 2);
    assert.ok(b.schritte[1].s < b.schritte[0].s, "Erholung kürzer als der Block");
    assert.equal(e.teile[0][0], "z1"); assert.equal(e.teile[e.teile.length - 1][0], "z1");
    assert.ok(min(e, "fatmax") >= d * 0.5, `${id} ${d}: mindestens die Hälfte in FatMax`);
  }
});

test("FatMax Pyramide: FatMax – Tempo – FatMax, zweimal; das Tempo ist kürzer als FatMax", () => {
  const e = bau("rad_fatmax_pyr", 120), T = e.teile.map((t) => t[0]).join(" ");
  assert.match(T, /fatmax z3 fatmax z2 fatmax z3 fatmax/);
  const f = e.teile.filter((t) => t[0] === "fatmax"), z = e.teile.filter((t) => t[0] === "z3");
  assert.equal(z.length, 2); assert.ok(z[0][1] < f[0][1]); assert.equal(e.schluessel, false);
});

test("Sweet Spot: oberes Drittel von Z3 (Abschnitt z3o), gleichmässig bzw. in Blöcken, gehört zu den Schlüsseleinheiten", () => {
  const g = bau("rad_sweet", 60); assert.equal(g.teile.filter((t) => t[0] === "z3o").length, 1);
  const i = bau("rad_sweet_int", 100); assert.ok(i.teile.filter((t) => t[0] === "z3o").length >= 3);
  const l = bau("lauf_sweet", 70); assert.ok(l.teile.filter((t) => t[0] === "z3o").length >= 2); assert.ok(l.abc, "harte Läufe mit Lauf-ABC wie die übrigen");
  for (const id of ["rad_sweet", "rad_sweet_int", "lauf_sweet"]) assert.equal(V64.einheit(id, {}).art, "schluessel");
});

test("Jede neue Vorlage hat Zweck, Quellen aus der Wissensliste und Ziele (Watt/Puls/Pace) aus dem Profil", () => {
  const W = require("../js/wissen.js");
  const SK = { rad_w: [{ z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }], rad_hf: [{ z: "Z2", von: 120, bis: 138 }, { z: "Z3", von: 138, bis: 156 }],
    lauf_pace: [{ z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }], lauf_hf: [{ z: "Z2", von: 125, bis: 145 }, { z: "Z3", von: 145, bis: 160 }] };
  for (const sp of Object.keys(NEU)) for (const id of NEU[sp]) {
    const b = V64.BAUSTEINE[id]; assert.ok(b.zweck && b.zweck.length > 30, id);
    for (const q of b.quellen) assert.ok(W.QUELLEN ? W.QUELLEN[q] : true, `${id}: Quelle ${q}`);
    const e = bau(id, V66.bereich(id).std);
    for (const [k] of e.teile) if (["fatmax", "z3o"].includes(k)) {
      assert.ok(V64.ziel(k, sp, SK), `${id}: Ziel ${k}`);
      assert.ok((sp === "rad" ? V66.garminZiel(k, sp, SK) : V66.garminZiel(k, sp, SK)) && V66.garminPuls(k, sp, SK), `${id}: Garmin ${k}`);
    }
  }
});

test("Verdrahtung: Dateilisten, Service-Worker-Version, Demo, Lauf-Unterstufen in den Planen-Flow", () => {
  assert.match(R("sw.js"), /const CACHE = "notebook-v919\d-/);
  assert.match(R("js/v94.js"), /k: "fatmax"/); assert.match(R("js/v66.js"), /rad_fatmax_int: \["fatmax"/);
  assert.ok(R("demo.html").includes("zonen-ansicht.js"));
});

test("Keine echten Werte: die neuen Vorlagen enthalten keine festen Watt-, Puls- oder Pace-Zahlen", () => {
  const src = R("js/v64.js"), a = src.indexOf("V9.18.0 intensitaet-stufen-1.0: FatMax"), b = src.indexOf("V8.4 abwechslung-1.0: gleicher Reiz");
  assert.ok(a > 0 && b > a); const teil = src.slice(a, b);
  assert.ok(!/\b\d{3}\s*[–-]\s*\d{3}\b/.test(teil) && !/\d+:\d{2}\s*\/\s*km/.test(teil) && !/\b\d{3}\s*W\b/.test(teil));
});
