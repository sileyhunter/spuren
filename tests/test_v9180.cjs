// Abnahmetests V9.18.0 (Auftrag FatMax · Zonen · enduco, Etappe B): FatMax und Sweet Spot als Stufen in «Training planen» (intensitaet-stufen-1.0).
// Alle Zonen und Werte sind erfunden (keine persönlichen Werte im öffentlichen Repository). Aufruf: node --test tests/test_v9180.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V73 = require("../js/v73.js");
const V94 = require("../js/v94.js");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

const SK = {   // erfundenes Zonenprofil
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  rad_hf: [{ z: "Z1", von: null, bis: 120 }, { z: "Z2", von: 120, bis: 138 }, { z: "Z3", von: 138, bis: 156 }, { z: "Z4", von: 156, bis: 165 }, { z: "Z5", von: 165, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
  lauf_hf: [{ z: "Z1", von: null, bis: 125 }, { z: "Z2", von: 125, bis: 145 }, { z: "Z3", von: 145, bis: 160 }, { z: "Z4", von: 160, bis: 170 }, { z: "Z5", von: 170, bis: null }],
};

test("Stufen: FatMax unter Grundlage, Sweet Spot unter Tempo · Schwelle, nur für Rad und Lauf", () => {
  assert.deepEqual(V94.STUFEN.map((s) => s.k), ["grundlage", "fatmax", "tempo", "sweet", "vo2max", "test"]);
  assert.equal(V94.STUFEN.find((s) => s.k === "fatmax").unter, "grundlage");
  assert.equal(V94.STUFEN.find((s) => s.k === "sweet").unter, "tempo");
  assert.equal(V94.stufeVon("fatmax"), "fatmax"); assert.equal(V94.stufeVon("sweet"), "sweet");
  for (const sp of ["rad", "lauf"]) assert.deepEqual(V94.stufen(V66.vorlagen(sp)).map((s) => s.k).filter((k) => k === "fatmax" || k === "sweet"), ["fatmax", "sweet"], sp);
  for (const sp of ["schwimm", "kraft"]) assert.ok(!V94.stufen(V66.vorlagen(sp)).some((s) => s.k === "fatmax" || s.k === "sweet"), sp);
  assert.ok(V94.stufen(V66.vorlagen("rad_drinnen")).some((s) => s.k === "fatmax"), "FatMax gibt es auch drinnen");
});

test("FatMax = obere Hälfte von Z2, in allen Metriken (Regel, keine festen Zahlen)", () => {
  assert.equal(V64.ziel("fatmax", "rad", SK), "180–200 W · Puls 129–138");
  assert.match(V64.ziel("fatmax", "lauf", SK), /^5:55–5:30\/km/);
  assert.deepEqual(V66.garminZiel("fatmax", "rad", SK), { art: "watt", lo: 180, hi: 200, offen: false });
  assert.deepEqual(V66.garminPuls("fatmax", "rad", SK), { art: "puls", lo: 129, hi: 138, offen: false });
  const t = V66.garminZiel("fatmax", "lauf", SK); assert.equal(t.art, "tempo"); assert.ok(t.lo < t.hi);
  assert.equal(V64.ziel("fatmax", "rad", { rad_w: [] }), null, "ohne Skala nie geraten");
});

test("FatMax zählt als locker, nicht als harte Einheit; Sweet Spot als Schlüsseleinheit", () => {
  for (const id of ["rad_fatmax", "rad_fatmax_int", "lauf_fatmax", "lauf_fatmax_int"]) {
    const e = V64.einheit(id, { d: 90 }); assert.equal(e.schluessel, false, id); assert.equal(e.minuten.hart, 0, id);
  }
  for (const id of ["rad_sweet", "rad_sweet_int", "lauf_sweet"]) assert.equal(V64.einheit(id, {}).schluessel, true, id);
  assert.ok(!/fatmax/.test(R("js/v74.js").match(/const HART_K = [^\n]+/)[0]), "FatMax fällt bei «vorsichtig» nicht weg");
});

test("Die Dauer folgt der Wahl über den ganzen Bereich; keine leeren Abschnitte", () => {
  for (const id of ["rad_fatmax", "rad_fatmax_int", "rad_fatmax_pyr", "rad_sweet", "rad_sweet_int", "lauf_fatmax", "lauf_fatmax_int", "lauf_sweet"]) {
    const r = V66.bereich(id); assert.ok(r && r.min < r.max && r.std >= r.min && r.std <= r.max, id);
    for (let d = r.min; d <= r.max; d += 5) {
      const e = V66.einheit({ uid: "x", vorlage: id, dauer: d, quelle: "eigen" }, {});
      assert.equal(e.dauer, d, `${id} ${d}`); assert.ok(e.teile.every((t) => t[1] > 0), `${id} ${d}: Abschnitte`);
    }
  }
});

test("Schritte: FatMax-Blöcke mit Z2-Erholung als Wiederholung, Namen und Texte", () => {
  const e = V66.einheit({ uid: "x", vorlage: "rad_fatmax_int", dauer: 120, quelle: "eigen" }, {}), baum = V73.ausTeilen(e);
  const b = baum.find((n) => n.typ === "b"); assert.ok(b);
  assert.equal(b.name, "FatMax-Blöcke"); assert.ok(b.wdh >= 2); assert.equal(b.ohneLetzte, true);
  assert.equal(b.schritte[0].key, "fatmax"); assert.equal(b.schritte[0].art, "belastung"); assert.equal(b.schritte[1].art, "erholung");
  assert.ok(b.beschreibung && !/ß/.test(b.beschreibung));
  const p = V73.ausTeilen(V66.einheit({ uid: "x", vorlage: "rad_fatmax_pyr", dauer: 120, quelle: "eigen" }, {})).find((n) => n.typ === "b");
  assert.equal(p.name, "FatMax mit Tempo");
  const s = V73.ausTeilen(V66.einheit({ uid: "x", vorlage: "rad_sweet_int", dauer: 75, quelle: "eigen" }, {})).find((n) => n.typ === "b");
  assert.equal(s.name, "Sweet-Spot-Blöcke");
  assert.equal(V73.ZNR.fatmax, 2); assert.match(V73.RPE.fatmax, /RPE/);
});

test("Wochenplanung: Sweet Spot und die Lauf-Vorlagen werden nicht von selbst gewählt (FatMax nur am Mittwoch-Rad, V9.21.0)", () => {
  const nur = (s) => /fatmax|sweet/.test(s);
  assert.ok(!Object.keys(V64.FAMILIEN || {}).some(nur) && !(Object.values(V64.FAMILIEN || {}).flat().some(nur)), "keine Familie enthält die neuen Vorlagen");
  const src = R("js/v64.js"); const wochen = src.slice(src.indexOf("V64.woche = "), src.indexOf("V64.woche = ") + 20000);
  assert.ok(!/lauf_fatmax|rad_sweet|lauf_sweet|rad_fatmax_int|rad_fatmax_pyr/.test(wochen), "V64.woche nennt sie nicht");
});

test("Blatt «Intensität»: Unterstufen eingerückt (Markup und CSS), Farben aus der Zonenpalette", () => {
  assert.match(R("js/v66-ui.js"), /st\.unter \? ' class="mp-unter"'/);
  assert.match(R("css/v6.css"), /\.mp-stufen \.mp-unter \{ margin-left/);
  const W = require("../js/v6.js"); assert.ok(W.ZONEN.fatmax && W.ZONEN.sweet, "Farben fatmax und sweet");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(R("css/v6.css").split("V9.18.0 Unterstufen")[1] || ""), "keine festen Farben");
});

test("Keine festen Zonenwerte in den neuen Teilen (Regeln statt Zahlen)", () => {
  for (const f of ["js/v94.js"]) assert.ok(!/\b\d{3}\s*[–-]\s*\d{3}\s*(W|bpm)/.test(R(f)), f);
});
