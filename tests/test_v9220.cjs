/* V9.22.0 kalorien-schaetzung-1.0: Schalter «Kalorien» in den Intensitätszonen – Schätzung nur aus offen gelegten Annahmen. Erfundene Zonen (keine persönlichen Werte). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const V6 = require("../js/v6.js");
const ZA = require("../js/zonen-ansicht.js");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

const RAD_W = { key: "rad_w", disziplin: "rad", metrik: "leistung", unit: "W", umfang: [100, 400], zonen: [
  { z: "Z1", von: null, bis: 180 }, { z: "Z2", von: 180, bis: 230, text: "Grundlage; FatMax 205–230 W" }, { z: "Z3", von: 230, bis: 280, text: "Tempo; Sweet Spot 262–280 W" },
  { z: "Z4", von: 280, bis: 305 }, { z: "Z5", von: 305, bis: null }] };
const RAD_HF = { key: "rad_hf", disziplin: "rad", metrik: "puls", unit: "bpm", umfang: [100, 200], hfmax: 195, zonen: [
  { z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: 146 }, { z: "Z3", von: 146, bis: 160 }, { z: "Z4", von: 160, bis: 166 }, { z: "Z5", von: 166, bis: null }] };
const LAUF_P = { key: "lauf_pace", disziplin: "lauf", metrik: "pace", unit: "s/km", umfang: [420, 216], zonen: [
  { z: "Z1", von: null, bis: 390 }, { z: "Z2", von: 390, bis: 345 }, { z: "Z3", von: 345, bis: 312 }, { z: "Z4", von: 312, bis: 288 }, { z: "Z5", von: 288, bis: null }] };

test("Umsatz: Rad aus Leistung und Wirkungsgrad, Lauf aus Gewicht und Pace", () => {
  const A = ZA.ANNAHMEN;
  assert.ok(Math.abs(ZA.kcalProStunde("rad", 200) - (200 * 3.6) / (A.wirkungsgrad * 4.184)) < 1e-9);
  assert.ok(Math.abs(ZA.kcalProStunde("lauf", 360, 70) - 700) < 1e-9, "6:00/km, 70 kg, 1 kcal/kg/km");
  assert.equal(ZA.kcalProStunde("lauf", 360, null), null, "ohne Gewicht keine Schätzung");
  assert.equal(ZA.kcalProStunde("rad", 0), null); assert.equal(ZA.kcalProStunde("schwimm", 100, 70), null);
});

test("Zonenmitte: beide Grenzen → Mitte, offene Enden → Annahme ausserhalb der Grenze", () => {
  assert.equal(ZA.mitte({ von: 180, bis: 230 }, false), 205);
  assert.ok(ZA.mitte({ von: null, bis: 180 }, false) < 180 && ZA.mitte({ von: 305, bis: null }, false) > 305);
  assert.ok(ZA.mitte({ von: null, bis: 390 }, true) > 390, "Pace: langsamer = mehr s/km"); assert.ok(ZA.mitte({ von: 288, bis: null }, true) < 288);
  assert.equal(ZA.mitte({ von: null, bis: null }, false), null);
});

test("Rad: Schätzung je Zone und Unterstufe, steigt mit der Zone, Fett fällt, Summe passt", () => {
  const m = ZA.modell(RAD_W, V6, {}), K = ZA.kalorien(m, {});
  assert.equal(K.ok, true);
  const z = ["z1", "z2", "z3", "z4", "z5"].map((k) => K.zeilen[k]);
  for (let i = 1; i < z.length; i++) { assert.ok(z[i].kcal > z[i - 1].kcal, "kcal steigt"); assert.ok(z[i].fett_pct <= z[i - 1].fett_pct, "Fettanteil fällt"); }
  assert.ok(K.zeilen["z2:fatmax"] && K.zeilen["z3:sweet"], "Unterstufen");
  assert.ok(K.zeilen["z2:fatmax"].fett_g >= K.zeilen.z2.fett_g * 0.9, "FatMax: viel Fett absolut");
  for (const x of z) assert.ok(Math.abs(x.fett_g * 9 + x.kh_g * 4 - x.kcal) <= 12, `Fett + KH ≈ kcal (${JSON.stringify(x)})`);
  assert.ok(K.annahmen.some((t) => /Wirkungsgrad/.test(t)) && K.annahmen.some((t) => /Fettanteil/.test(t)));
});

test("Lauf: braucht das Körpergewicht; ohne Gewicht und bei Puls sagt es warum", () => {
  const m = ZA.modell(LAUF_P, V6, {});
  const ohne = ZA.kalorien(m, {}); assert.equal(ohne.ok, false); assert.match(ohne.grund, /Körpergewicht/);
  const mit = ZA.kalorien(m, { kg: 70 }); assert.equal(mit.ok, true);
  assert.ok(mit.zeilen.z5.kcal > mit.zeilen.z1.kcal, "schneller = mehr kcal/h");
  assert.ok(mit.annahmen.some((t) => /70 kg/.test(t)));
  const puls = ZA.kalorien(ZA.modell(RAD_HF, V6, {}), {}); assert.equal(puls.ok, false); assert.match(puls.grund, /Leistung/);
});

test("HTML: Zeilen mit kcal, Fett und KH, darunter «Schätzung, keine Messung» mit den Annahmen; ohne Schalter unverändert", () => {
  const m = ZA.modell(RAD_W, V6, {}), H = ZA.html(m, { kcal: ZA.kalorien(m, {}) });
  assert.match(H, /iz-kcal/); assert.match(H, /kcal\/h · Fett ≈ \d+ g · KH ≈ \d+ g/); assert.match(H, /Schätzung, keine Messung/); assert.match(H, /Annahmen:/);
  const aus = ZA.html(m, {}); assert.ok(!/iz-kcal|Schätzung, keine Messung/.test(aus), "ohne Schalter nichts davon");
  const nein = ZA.html(ZA.modell(LAUF_P, V6, {}), { kcal: ZA.kalorien(ZA.modell(LAUF_P, V6, {}), {}) });
  assert.ok(!/iz-kcal/.test(nein) && /Körpergewicht/.test(nein), "Grund statt Zahlen");
});

test("Verdrahtung: Schalter in der Seite, Gewicht aus den Wägungen, Kennung, keine festen Werte im Code", () => {
  const ui = R("js/v5-ui.js");
  assert.match(ui, /data-izm="kalorien"/); assert.match(ui, /ZA\.kalorien\(m, \{ kg: kgW \}\)/); assert.match(ui, /C\.D\.weights/);
  assert.equal(ZA.KALORIEN_VERSION, "kalorien-schaetzung-1.0");
  assert.match(R("css/v6.css"), /\.iz-annahmen/);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test((R("css/v6.css").match(/\.iz-kcal[^\n]*\n\.iz-annahmen[^\n]*\n\.iz-annahmen ul[^\n]*/) || [""])[0]), "keine festen Farben");
});

/* ---- vorlagen-enduco-2.0: weitere Vorlagen nach den enduco-Einheiten ---- */
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V73 = require("../js/v73.js");
const V94 = require("../js/v94.js");
const NEU = { lauf: ["lauf_gleichmaessig", "lauf_tempo_2x", "lauf_tempo_3x", "lauf_trio", "lauf_vo2_tempo", "lauf_sweet_vo2"], rad: ["rad_ueberunter"] };
const bau = (id, d) => V66.einheit({ uid: "x", vorlage: id, dauer: d, quelle: "eigen" }, {});
const summe = (e) => e.teile.reduce((s, t) => s + t[1], 0);
const schl = (e, k) => e.teile.filter((t) => t[0] === k).reduce((s, t) => s + t[1], 0);

test("Namen wie in enduco, in den Stufen Tempo bzw. VO2max, Dauer frei", () => {
  const titel = (sp, stufe) => V94.stufen(V66.vorlagen(sp)).find((s) => s.k === stufe).vorlagen.map((v) => v.titel);
  for (const t of ["Gleichmässiges Tempo", "2 × Tempo Blöcke", "3 × Tempo Blöcke", "Progressives Trio"]) assert.ok(titel("lauf", "tempo").includes(t), t);
  for (const t of ["Kurze VO2max & Tempo", "Sweet Spot & VO2max"]) assert.ok(titel("lauf", "vo2max").includes(t), t);
  assert.ok(titel("rad", "tempo").includes("Tempo Über-Unter"));
  for (const sp of Object.keys(NEU)) for (const id of NEU[sp]) { const v = V66.vorlagen(sp).find((x) => x.id === id); assert.ok(v, id); assert.equal(v.fest, false, id); }
});

test("Jede Dauer im Bereich: Summe stimmt, nichts leer, auch mit Lauf-ABC", () => {
  for (const sp of Object.keys(NEU)) for (const id of NEU[sp]) {
    const b = V66.bereich(id);
    for (let d = b.min; d <= b.max; d += 5) {
      const e = bau(id, d); assert.ok(e, `${id} ${d}`); assert.ok(Math.abs(summe(e) - d) < 0.6 && e.dauer === d, `${id} ${d}: ${summe(e)}`);
      assert.ok(e.teile.every((t) => t[1] > 0), `${id} ${d}: leerer Abschnitt`);
    }
  }
});

test("Aufbau: Blöcke, Reihenfolge der Zonen und Anteile wie bei enduco", () => {
  const z = (id, d) => bau(id, d).teile.map((t) => t[0]).join(" ");
  const g = bau("lauf_gleichmaessig", 60); assert.ok(schl(g, "z3") >= 35 && g.teile.filter((t) => t[0] === "z3").length === 1, "ein langer Tempo-Block");
  assert.equal(bau("lauf_tempo_2x", 60).teile.filter((t) => t[0] === "z3").length, 2);
  assert.equal(bau("lauf_tempo_3x", 70).teile.filter((t) => t[0] === "z3").length, 3);
  assert.match(z("lauf_trio", 60), /z3 z3o z3o/, "Tempo → knapp unter LT2 → oberer Rand, ohne Pause");
  const v = bau("lauf_vo2_tempo", 88); assert.equal(v.teile.filter((t) => t[0] === "vo2").length, 3); assert.ok(schl(v, "z3o") >= 8);
  const s = bau("lauf_sweet_vo2", 85); assert.ok(s.teile.filter((t) => t[0] === "z3o").length >= 3); assert.equal(s.teile.filter((t) => t[0] === "vo2").length, s.teile.filter((t) => t[0] === "z3o").length);
  const u = bau("rad_ueberunter", 105); assert.match(u.teile.map((t) => t[0]).join(" "), /fatmax z3 z3o z2 fatmax z3 z3o/); assert.ok(bau("rad_ueberunter", 60).teile.some((t) => t[0] === "z3o"));
});

test("Gehören zu den Schlüsseleinheiten, Ersatz bei «locker» ist die lockere Einheit derselben Sportart", () => {
  for (const sp of Object.keys(NEU)) for (const id of NEU[sp]) {
    assert.equal(V64.einheit(id, { d: V66.bereich(id).std }).art, "schluessel", id);
    assert.equal(V64.ERSATZ[id].locker, sp === "rad" ? "rad_locker" : "lauf_locker", id);
    assert.ok(V64.STUFE_BAUSTEIN[id], id);
  }
  assert.equal(V64.STUFE_BAUSTEIN.lauf_vo2_tempo, "alles"); assert.equal(V64.STUFE_BAUSTEIN.lauf_trio, "schwelle");
});

test("Wochenplanung unverändert: die automatische Woche wählt die neuen Vorlagen nicht von selbst; Kennungen gesetzt", () => {
  const src = R("js/v64.js"); const w = src.slice(src.indexOf("V64.woche = "), src.indexOf("V64.woche = ") + 20000);
  assert.ok(!/lauf_gleichmaessig|lauf_tempo_2x|lauf_tempo_3x|lauf_trio|lauf_vo2_tempo|lauf_sweet_vo2|rad_ueberunter/.test(w));
  assert.equal(V64.VERSIONS.vorlagen2, "vorlagen-enduco-2.0"); assert.equal(V64.VERSIONS.kalorien, "kalorien-schaetzung-1.0");
});

test("Jede Vorlage hat Zweck und Ablauf; Quellen aus der Wissensliste; V73 zerlegt sie in Blöcke", () => {
  const W = require("../js/wissen.js");
  for (const sp of Object.keys(NEU)) for (const id of NEU[sp]) {
    const b = V64.BAUSTEINE[id]; assert.ok(b.zweck && b.zweck.length > 40, id);
    for (const q of b.quellen) assert.ok(W.QUELLEN ? W.QUELLEN[q] : true, `${id}: Quelle ${q}`);
    const e = bau(id, V66.bereich(id).std); assert.ok(e.ablauf.length >= 3, id);
    assert.ok(V73.ausTeilen(e).length >= 3, id);
  }
});
