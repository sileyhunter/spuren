// Abnahmetests V5.6 für js/analyse.js – nur synthetische Werte mit bekanntem Ergebnis (keine echten Trainingsdaten).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = undefined;
const FK = require("../js/formkurve.js");
globalThis.FK = FK;
const AN = require("../js/analyse.js");
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""}: ${a} statt ${b} (±${tol})`);
/** Synthetische Reihe im 2-s-Raster wie tools/serien.py: f(t) → {w, hr, v, alt, d}. */
function serie(dauer_s, f, opt) {
  const dt = 2, n = Math.floor(dauer_s / dt), R = { v: "serie-1.0", dt, t0: 1700000000, seg: [[0, n]], hr: [], w: [], v: [], alt: [], d: [] };
  let d = 0;
  for (let i = 0; i < n; i++) { const x = f(i * dt); d += (x.v || 0) * dt; R.hr.push(x.hr ?? null); R.w.push(x.w ?? null); R.v.push(x.v != null ? Math.round(x.v * 100) : null); R.alt.push(x.alt != null ? Math.round(x.alt * 10) : null); R.d.push(Math.round(d)); }
  return AN.decode(Object.assign(R, opt || {}));
}

test("Reihe entpacken: Abschnitte mit Zeitlücke, Einheiten (cm/s → m/s, dm → m)", () => {
  const S = AN.decode({ dt: 2, t0: 0, seg: [[0, 3], [100, 2]], hr: [100, 101, 102, 140, 141], v: [250, 250, null, 300, 300], alt: [4505, null, 4510, 4500, 4500] });
  assert.deepEqual(S.t, [0, 2, 4, 200, 202]); near(S.v[0], 2.5, 1e-9); assert.equal(S.v[2], null, "fehlend bleibt null"); near(S.alt[0], 450.5, 1e-9);
  assert.equal(AN.idxAt(S, 50), 2, "nächste Probe"); assert.equal(AN.idxAt(S, 150), 3);
});

test("Reihe ohne Tempo (Becken, Kraft, Rolle ohne Sensor): Versionstext unter v ist kein Kanal", () => {
  const S = AN.decode({ v: "serie-1.0", dt: 2, t0: 0, seg: [[0, 3]], hr: [110, 111, 112], len: [[0, 40.2, 1]] });
  assert.equal(S.v, null, "kein Tempokanal"); assert.deepEqual(S.hr, [110, 111, 112]); assert.equal(S.len.length, 1);
  const s = AN.stats(S, 0); assert.equal(s.v, null); assert.equal(Math.round(s.hr), 111);
  const N = AN.decode({ ver: "serie-1.0", dt: 2, t0: 0, seg: [[0, 2]], hr: [100, 102], v: [300, 300] });
  assert.equal(N.v[0], 3, "neues Format: Version unter ver, Tempo unter v");
});

test("NP: konstant 200 W = 200 W; halb 0 W, halb 300 W ≈ 252 W (Referenzwert)", () => {
  const A = serie(3600, () => ({ w: 200, hr: 140, v: 9 }));
  near(AN.stats(A, 0).np, 200, 0.5, "konstant");
  const B = serie(3600, (t) => ({ w: t < 1800 ? 0 : 300, hr: 140, v: 9 }));
  near(AN.stats(B, 0).np, 300 * Math.pow(0.5, 0.25), 3, "0/300 W");
  near(AN.stats(B, 0).w, 150, 0.5, "Mittel");
});

test("Abschnitt: Puls Anfang/Ende, Drift (Pw:HR), W pro Schlag, Höhenmeter mit Hysterese", () => {
  const S = serie(3600, (t) => ({ w: 200, hr: 130 + 20 * t / 3600, v: 9, alt: 500 + 50 * Math.sin(t / 600) }));
  const s = AN.stats(S, 0);
  near(s.hrA, 130, 0.5, "Anfang"); near(s.hrE, 150, 0.5, "Ende"); near(s.dhr, 20, 0.6);
  near(s.wproschlag, 200 / 140, 0.01); assert.ok(s.drift > 5 && s.drift < 15, `Drift ${s.drift}`);
  // 500 + 50·sin(t/600) über 1 h: hoch 50, runter 100, hoch 36 → ≈ 86 m Aufstieg (Hysterese 2 m kostet etwas)
  assert.ok(s.hm_auf > 75 && s.hm_auf <= 86.5, `Höhenmeter ${s.hm_auf}`); assert.ok(s.hm_ab > 90 && s.hm_ab <= 100.5, `Abstieg ${s.hm_ab}`);
  const ohne = serie(600, () => ({ w: 200, v: 9 }));
  assert.equal(AN.stats(ohne, 0).hr, null, "ohne Puls: null, nie 0"); assert.equal(AN.stats(ohne, 0).drift, null);
});

test("Intervalle: 5 × (3 min 300 W / 2 min 150 W) erkannt; mit Runden aus dem Workout gelten die Runden", () => {
  const S = serie(600 + 5 * 300 + 600, (t) => { const k = t - 600; const on = k >= 0 && k < 1500 && (k % 300) < 180; return { w: on ? 300 : 150, hr: 140, v: 9 }; });
  const I = AN.intervalle(S).liste;
  assert.equal(I.length, 5, JSON.stringify(I.map((x) => [S.t[x.i0], S.t[x.i1]])));
  for (const x of I) near(S.t[x.i1] - S.t[x.i0], 180, 20, "Dauer");
  const g = AN.stats(S, 0); assert.ok(g.vi > 1.10 && g.drift === null && /ungleichmässig/.test(g.driftGrund), "Drift nur bei gleichmässiger Belastung");
  const L = serie(600, () => ({ w: 200, hr: 140, v: 9 }), { laps: [[0, 300, 2, 0], [300, 600, 0, 1]] });
  const R = AN.intervalle(L); assert.equal(R.liste.length, 2); assert.equal(R.liste[0].typ, "Einlaufen");
  const K = AN.mitKorrektur(S, AN.intervalle(S), { zeiten: [[700, 800, "Intervall"]] });
  assert.equal(K.liste.length, 1); assert.equal(K.quelle, "von Hand korrigiert");
});

test("Pausen: Zeitlücke = Timer gestoppt; Stillstand ≥ 30 s", () => {
  const S = AN.decode({ dt: 2, t0: 0, seg: [[0, 100], [200, 50]], v: Array(150).fill(300).map((x, i) => (i >= 40 && i < 60 ? 0 : x)) });
  const P = AN.pausen(S);
  assert.ok(P.some((p) => p.art === "Timer gestoppt" && p.von === 200 && p.bis === 400));
  assert.ok(P.some((p) => p.art === "Stillstand" && p.von === 80 && p.bis === 120));
});

test("Laktat zuordnen: Messung am Ende eines Intervalls → dieses Intervall; sonst letzte 5 min", () => {
  const S = serie(1800, () => ({ w: 200, hr: 140, v: 9 }));
  const L = [{ i0: AN.idxAt(S, 600), i1: AN.idxAt(S, 1198) }];
  assert.match(AN.laktatAbschnitt(S, 1230, L).grund, /Intervall/);
  const r = AN.laktatAbschnitt(S, 1700, L); near(S.t[r.i1] - S.t[r.i0], 300, 2); assert.match(r.grund, /5 min/);
});

test("Ermüdungsresistenz: Puls bei gleicher Leistung früh/spät; nicht vergleichbar ohne passende Blöcke", () => {
  const e = AN.ermuedungRad({ bl: [[20, 200, 140], [60, 230, 150], [180, 205, 148], [240, 260, 165]] });
  assert.equal(e.status, "ok"); assert.equal(e.dhr, 8); assert.deepEqual(e.frueh, [20, 200, 140]);
  assert.equal(AN.ermuedungRad({ bl: [[20, 200, 140], [60, 230, 150]] }).status, "nicht vergleichbar");
  const d = AN.dauerleistung({ p20: [250, 230, 220, null, null] }); near(d.rel[3], 0.88, 1e-9); assert.equal(d.rel[4], null);
});

test("Session-RPE, Rangkorrelation", () => {
  assert.equal(AN.srpe(6, 3600), 360); assert.equal(AN.srpe(null, 3600), null);
  near(AN.rang([1, 2, 3, 4], [10, 20, 30, 40]), 1, 1e-9); near(AN.rang([1, 2, 3, 4], [4, 3, 2, 1]), -1, 1e-9);
});

test("Energie: Rad aus Leistung mit Wirkungsgrad-Band; ohne Leistung Garmin; sonst unbekannt", () => {
  const e = AN.energie({ sport: "rad", watt: 200, mv: 3600 }); assert.equal(e.kj, 720); assert.deepEqual(e.kcal, [688, 782]);
  assert.deepEqual(AN.energie({ sport: "lauf" }, 900).kcal, [900, 900]); assert.equal(AN.energie({ sport: "lauf" }).kcal, null);
});

test("Saison: Taper 2 Wochen vor Hamburg, B-Rennen mit Mini-Taper und Erholung, 3:1-Rhythmus", () => {
  const S = AN.saison("2026-11-09", [{ name: "70.3 Jesolo", short: "Jesolo", date: "2027-04-24", prio: "B" }, { name: "Ironman Hamburg", short: "Hamburg", date: "2027-06-06", prio: "A" }]);
  const W = S.wochen;
  assert.equal(W[W.length - 1].phase, "Taper"); assert.equal(W[W.length - 2].phase, "Taper"); assert.equal(W[W.length - 3].phase, "Wettkampfspezifisch");
  const j = W.findIndex((w) => w.rennen.includes("Jesolo"));
  assert.equal(W[j].phase, "B-Rennen (Mini-Taper)"); assert.equal(W[j + 1].erholung, true);
  assert.ok(W.filter((w) => w.erholung).length >= 5, "regelmässige Erholungswochen");
  assert.equal(S.haupt.short, "Hamburg");
});

test("Dateiname der Reihe wie tools/serien_crypt.mjs (SHA-256 aus Salz und ID, 24 Hex-Zeichen)", async () => {
  const soll = require("node:crypto").createHash("sha256").update("0f1e2d:g24916684687").digest("hex").slice(0, 24);
  assert.equal(await AN.serieName("0f1e2d", "g24916684687"), soll);
  assert.notEqual(await AN.serieName("0f1e2e", "g24916684687"), soll, "anderes Salz, anderer Name");
});
