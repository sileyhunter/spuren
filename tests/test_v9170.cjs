/* V9.17.0 zonen-ansicht-1.0 (Etappe A «Zonenansicht wie enduco»): Modell, Auswahl, Ruhepuls, HTML und Verdrahtung.
 * Reine Logik (js/zonen-ansicht.js) mit erfundenen Zonen; die Bedienung prüft tools/durchklick_zonen.py. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const V6 = require("../js/v6.js");
const ZA = require("../js/zonen-ansicht.js");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

// Erfundene Skalen (Werte frei erfunden, nur die Form wie im Zonenprofil)
const RAD_W = { key: "rad_w", disziplin: "rad", metrik: "leistung", unit: "W", umfang: [100, 400], zonen: [
  { z: "Z1", von: null, bis: 180 }, { z: "Z2", von: 180, bis: 230, text: "Grundlage; FatMax 205–230 W" }, { z: "Z3", von: 230, bis: 280, text: "Tempo; Sweet Spot 262–280 W" },
  { z: "Z4", von: 280, bis: 305 }, { z: "Z5", von: 305, bis: null, text: "VO2max 305–350 W" }] };
const RAD_HF = { key: "rad_hf", disziplin: "rad", metrik: "puls", unit: "bpm", umfang: [100, 200], hfmax: 195, zonen: [
  { z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: 146 }, { z: "Z3", von: 146, bis: 160 }, { z: "Z4", von: 160, bis: 166 }, { z: "Z5", von: 166, bis: null }] };
const LAUF_P = { key: "lauf_pace", disziplin: "lauf", metrik: "pace", unit: "s/km", umfang: [420, 216], zonen: [
  { z: "Z1", von: null, bis: 390 }, { z: "Z2", von: 390, bis: 345 }, { z: "Z3", von: 345, bis: 312 }, { z: "Z4", von: 312, bis: 288 }, { z: "Z5", von: 288, bis: null }] };
const ALLE = [RAD_W, RAD_HF, LAUF_P];

test("Angebot: Sportarten mit Messgrössen, Puls vor Leistung, nur Vorhandenes", () => {
  const A = ZA.angebot(ALLE);
  assert.deepEqual(A.map((a) => a.sport), ["rad", "lauf"]);
  assert.deepEqual(A[0].metriken.map((m) => m.k), ["puls", "leistung"]);
  assert.deepEqual(A[1].metriken.map((m) => m.k), ["pace"]);
  assert.deepEqual(ZA.angebot([RAD_W]).map((a) => a.sport), ["rad"]);
  assert.deepEqual(ZA.angebot([]), []);
  assert.deepEqual(ZA.angebot([{ disziplin: "rad", metrik: "unbekannt", zonen: [1, 2] }]), []);
});

test("Auswahl: Unbekanntes fällt auf Vorhandenes zurück", () => {
  const A = ZA.angebot(ALLE);
  assert.equal(ZA.waehle(A, "lauf", "puls").metrik, "pace", "Lauf hat hier nur Pace");
  assert.equal(ZA.waehle(A, "schwimm", "leistung").sport, "rad");
  assert.equal(ZA.waehle(A, "rad", "leistung").skala, RAD_W);
  assert.equal(ZA.waehle([], "rad", "puls"), null);
});

test("Ruhepuls: Median der letzten Tage, nie aus weniger als drei Werten, Unsinn fällt weg", () => {
  const d = (n, rhr) => ({ date: `2026-11-${String(n).padStart(2, "0")}`, rhr });
  assert.equal(ZA.ruhepuls([d(1, 50), d(2, 52), d(3, 51), d(4, 60)], "2026-11-10"), 52);
  assert.equal(ZA.ruhepuls([d(1, 50), d(2, 52)], "2026-11-10"), null);
  assert.equal(ZA.ruhepuls([d(1, 50), d(2, 52), d(3, 9), d(4, 250), d(5, 51)], "2026-11-10"), 51);
  assert.equal(ZA.ruhepuls([d(1, 50), d(2, 52), d(3, 51), d(20, 99)], "2026-11-10"), 51, "Tage nach dem Bezugsdatum zählen nicht");
});

test("Modell Leistung: Zonen lückenlos über die Spanne, Unterstufen aus dem Text der Zone, Zonenwerte unverändert", () => {
  const vorher = JSON.stringify(RAD_W);
  const m = ZA.modell(RAD_W, V6, {});
  assert.equal(JSON.stringify(RAD_W), vorher, "die Skala wird nicht verändert");
  assert.equal(m.zonen.length, 5);
  assert.equal(m.zonen[0].x1, 0); assert.equal(Math.round(m.zonen[4].x2), 100);
  for (let i = 1; i < 5; i++) assert.ok(Math.abs(m.zonen[i].x1 - m.zonen[i - 1].x2) < 1e-9, "keine Lücke zwischen Z" + i + " und Z" + (i + 1));
  assert.deepEqual(m.zonen.map((z) => z.unter.map((u) => u.name)), [[], ["FatMax"], ["Sweet Spot"], [], ["VO2max"]]);
  const fat = m.zonen[1].unter[0];
  assert.ok(fat.von >= m.zonen[1].x1 && fat.bis <= m.zonen[1].x2 + 1e-9, "FatMax liegt in Z2");
  assert.equal(fat.text, "205–230");
  assert.ok(m.hatUnter);
});

test("Modell Puls: Spanne von Ruhe-HF bis Max-HF; ohne Ruhepuls die Spanne der Skala", () => {
  const m = ZA.modell(RAD_HF, V6, { ruhe: 50 });
  assert.equal(m.von, 50); assert.equal(m.bis, 195); assert.ok(m.ruheAnfang); assert.equal(m.hfmax, 195);
  assert.equal(m.ticks[0].text, "50"); assert.equal(m.ticks[m.ticks.length - 1].text, "195");
  const o = ZA.modell(RAD_HF, V6, {});
  assert.equal(o.von, 100); assert.ok(!o.ruheAnfang);
  const z = ZA.modell(RAD_HF, V6, { ruhe: 140 });
  assert.equal(z.von, 100, "ein Ruhepuls über der Z2-Grenze wird nicht übernommen");
  assert.ok(!m.hatUnter, "ohne Unterstufen im Profil zeigt die Ansicht keine");
});

test("Modell Pace: langsam links, schnell rechts, Zonen lückenlos", () => {
  const m = ZA.modell(LAUF_P, V6, { fmt: (v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}` });
  assert.ok(m.pace); assert.equal(m.zonen[0].x1, 0);
  for (let i = 1; i < 5; i++) assert.ok(Math.abs(m.zonen[i].x1 - m.zonen[i - 1].x2) < 1e-9);
  assert.equal(m.ticks[0].text, "7:00"); assert.equal(m.ticks[m.ticks.length - 1].text, "3:36");
  assert.match(ZA.bereich(m, m.zonen[0], (v) => String(v)), /langsamer als 390/);
  assert.match(ZA.bereich(m, m.zonen[4], (v) => String(v)), /schneller als 288/);
});

test("Teilstriche: liegen zwei Grenzen nah beieinander, steht die zweite in der zweiten Zeile", () => {
  const m = ZA.modell(RAD_HF, V6, {});
  assert.ok(m.ticks.some((t) => t.tief), "Z4 ist schmal: die Teilstriche liegen eng");
  assert.ok(m.ticks.every((t, i) => !(t.tief && i > 0 && m.ticks[i - 1].tief)), "nie zwei tiefe hintereinander");
});

test("Bereichstext: Z5 mit Maximalpuls «bis Max», offene Ränder, sonst von–bis", () => {
  const m = ZA.modell(RAD_HF, V6, {});
  assert.equal(ZA.bereich(m, m.zonen[0]), "bis 130 bpm");
  assert.equal(ZA.bereich(m, m.zonen[1]), "130–146 bpm");
  assert.equal(ZA.bereich(m, m.zonen[4]), "166–195 bpm (Max)");
  const w = ZA.modell(RAD_W, V6, {});
  assert.equal(ZA.bereich(w, w.zonen[4]), "ab 305 W (bis Max)");
});

test("HTML: Balken, Unterstufen, Teilstriche, Liste mit eingerückten Unterstufen; Text wird maskiert", () => {
  const m = ZA.modell(RAD_W, V6, {});
  const h = ZA.html(m, {});
  assert.match(h, /class="iz-bar"/); assert.match(h, /class="iz-unter"/); assert.match(h, /class="zliste iz-liste"/);
  assert.equal((h.match(/class="iz-z/g) || []).length, 5);
  assert.equal((h.match(/class="unter"/g) || []).length, 3, "FatMax, Sweet Spot, VO2max");
  assert.match(h, /FatMax/); assert.match(h, /Sweet Spot/);
  const bos = JSON.parse(JSON.stringify(RAD_W)); bos.unit = "<b>W</b>";
  assert.doesNotMatch(ZA.html(ZA.modell(bos, V6, {}), {}), /<b>W<\/b>/);
  const ohne = ZA.html(ZA.modell(RAD_HF, V6, { ruhe: 50 }), {});
  assert.doesNotMatch(ohne, /class="iz-unter"/); assert.match(ohne, /Ruhe/); assert.match(ohne, /Max/);
});

test("Verdrahtung: Karte in index.html, Skript geladen und im Offline-Speicher, Rendern in v5-ui.js, Demo neu erzeugt", () => {
  const idx = R("index.html"), tag = (n) => idx.indexOf(`<script src="js/${n}"></script>`);
  assert.ok(tag("zonen-ansicht.js") > tag("v6.js") && tag("v6.js") > 0);
  for (const id of ["iz-card", "iz-box", "iz-sport", "iz-metrik", "iz-meta"]) assert.match(idx, new RegExp(`id="${id}"`));
  assert.ok(idx.indexOf('id="iz-card"') < idx.indexOf('id="zc-card"'), "die einfache Ansicht steht vor den vier Skalen");
  assert.match(R("sw.js"), /"js\/zonen-ansicht\.js"/); assert.match(R("sw.js"), /const CACHE = "notebook-v9\d+-/);
  const ui = R("js/v5-ui.js"); assert.match(ui, /V\.intensitaetszonen = function/); assert.match(ui, /V\.intensitaetszonen\(ck\)/);
  assert.match(R("demo.html"), /<script src="js\/zonen-ansicht\.js">/, "Demo neu erzeugt (tools/make_demo.py)");
  assert.match(R("css/v6.css"), /\.iz-bar/);
});

test("Keine Zonenwerte im Modul, keine Schreibzugriffe", () => {
  const code = R("js/zonen-ansicht.js");
  assert.doesNotMatch(code, /\b\d{3}\s*[–-]\s*\d{3}\s*(W|bpm)\b/, "keine festen Zonenwerte im Code");
  assert.doesNotMatch(code, /localStorage|fetch\(|XMLHttpRequest/);
  assert.equal(ZA.VERSION, "zonen-ansicht-1.0");
});
