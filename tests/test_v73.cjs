// Abnahmetests V7.3 Etappe 1 (js/v73.js, Ergänzungen in js/v66.js): Schritte (schritte-1.0), Felder je Einheit (einheit-felder-1.0),
// Einfahren und Intervall-Intensität (einheit-anpassen-1.0), RPE je Abschnitt (rpe-zonen-1.0).
// Alle Zonen und Werte sind erfunden (keine persönlichen Werte im öffentlichen Repository). Aufruf: node --test tests/test_v73.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V73 = require("../js/v73.js");
const SW = require("../js/schwimmen.js");
const TR = require("../js/training-route.js");

const SK = {   // erfundenes Zonenprofil
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  rad_hf: [{ z: "Z1", von: null, bis: 120 }, { z: "Z2", von: 120, bis: 138 }, { z: "Z3", von: 138, bis: 156 }, { z: "Z4", von: 156, bis: 165 }, { z: "Z5", von: 165, bis: null }],   // wie test_v64
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const sumT = (e) => Math.round(e.teile.reduce((s, t) => s + t[1], 0) * 60);

test("schritte-1.0: jede Vorlage ergibt dieselbe Dauer und dieselbe Zeit je Zone wie ihre Abschnitte", () => {
  for (const id of Object.keys(V64.BAUSTEINE)) for (const o of [{ d: 60 }, { d: 60, kurz: true }, { d: 180 }]) {
    const e = V64.einheit(id, o), baum = V73.ausTeilen(e);
    assert.ok(Math.abs(V73.dauer(baum) - sumT(e)) <= 2, `${id}: Dauer`);
    const z = V73.zonenZeiten(baum), soll = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const [k, m] of e.teile) if (V73.ZNR[k]) soll[V73.ZNR[k]] += m * 60;
    for (const n of [1, 2, 3, 4, 5]) assert.ok(Math.abs(z.z[n] - soll[n]) <= 2, `${id}: Zone ${n}`);
    for (const s of V73.flach(baum)) { assert.ok(s.art, `${id}: Art`); assert.ok(typeof s.text === "string" && s.text.length > 0, `${id}: Text`); assert.ok(!/ß/.test(s.text)); }
  }
});

test("schritte-1.0: Wiederholungen mit Namen, verschachtelt und ohne letzte Erholung", () => {
  const vo2 = V73.ausTeilen(V64.einheit("rad_vo2", {}));
  assert.deepEqual(vo2.map((n) => n.typ === "s" ? n.art : n.name), ["ein", "ein", "Serien", "aus"]);
  const serien = vo2[2];
  assert.equal(serien.wdh, 3); assert.equal(serien.ohneLetzte, true);
  assert.equal(serien.schritte[0].typ, "b"); assert.equal(serien.schritte[0].wdh, 13); assert.equal(serien.schritte[0].name, "30 s hart / 15 s locker");
  assert.equal(serien.schritte[1].art, "erholung");
  const l = V73.ausTeilen(V64.einheit("lauf_vo2", {}));
  const b = l.find((n) => n.typ === "b");
  assert.equal(b.wdh, 4); assert.equal(b.ohneLetzte, true); assert.equal(b.name, "VO2max-Intervalle"); assert.match(b.beschreibung, /maximalen Sauerstoffaufnahme/);
  assert.equal(V73.ausTeilen(V64.einheit("rad_laktat", {})).find((n) => n.typ === "b").name, "Schwelle mit Laktat");
  assert.equal(V73.ausTeilen(V64.einheit("aktivierung", {})).find((n) => n.typ === "b").name, "Kurz zügig");
  const locker = V73.ausTeilen(V64.einheit("rad_locker", { d: 60 }));
  assert.deepEqual(locker.map((n) => n.art), ["ein", "belastung"]);
  assert.deepEqual(V73.ausTeilen({ teile: [["ohne", 30]] }), []);
});

test("schritte-1.0: Wiederholungen finden (gruppieren)", () => {
  const s = (key, sec) => ({ typ: "s", key, s: sec });
  const g = V73.gruppieren([s("z1", 300), s("z3", 600), s("z1", 120), s("z3", 600), s("z1", 120), s("z3", 600), s("z1", 600)]);
  assert.equal(g.length, 3); assert.equal(g[1].wdh, 3); assert.equal(g[1].ohneLetzte, true);
  const h = V73.gruppieren([s("vo2", 30), s("pause", 15), s("vo2", 30), s("pause", 15)]);
  assert.equal(h.length, 1); assert.equal(h[0].wdh, 2); assert.equal(h[0].ohneLetzte, false);
  assert.equal(V73.gruppieren([s("z2", 600)]).length, 1);
});

test("schritte-1.0: Schwimm-Einheit mit Technikübungen, Bahn beenden und Pausen am Beckenrand", () => {
  const S = SW.einheit("locker", { min: 60, css_s: 120, pool: 50, woche: 3 });
  const baum = V73.ausSchwimm(S);
  const ab = baum.find((n) => n.typ === "abschnitt");
  assert.ok(ab && ab.name === "Technikübungen" && ab.kinder.length >= 2);
  const ueb = ab.kinder[0];
  assert.equal(ueb.typ, "b"); assert.equal(ueb.schritte[0].art, "technik"); assert.equal(ueb.schritte[0].bahnen, "½ L");
  assert.equal(ueb.schritte[1].art, "bahn"); assert.equal(ueb.schritte[2].art, "pause"); assert.match(ueb.schritte[2].text, /Beckenrand/);
  assert.equal(baum[0].art, "ein"); assert.equal(baum[baum.length - 1].art, "aus");
  const meter = V73.flach(baum).reduce((m, x) => m + (x.m || 0), 0);
  assert.equal(meter, S.meter, "gleiche Meter wie die Schwimm-Einheit");
  const S25 = SW.einheit("locker", { min: 60, css_s: 120, pool: 25, woche: 3 });
  assert.ok(!V73.flach(V73.ausSchwimm(S25)).some((x) => x.art === "bahn"), "im 25-m-Becken keine halbe Bahn");
});

test("schritte-1.0: Enduco-Schwimmbeschreibung lesen und Workout aus Garmin als Baum", () => {
  assert.deepEqual(V73.schwimmFelder("½Lanes | Hunde-Paddeln | Endurance | 04:44min/100m | Finish Lane: Recovery"), { name: "Hunde-Paddeln", bahnen: "½", beenden: true });
  assert.deepEqual(V73.schwimmFelder("3Lanes | Grundlagenausdauer | Endurance | 02:22min/100m"), { name: "Grundlagenausdauer", bahnen: "3", beenden: false });
  assert.equal(V73.schwimmFelder("Warm Up | Recovery | 02:34min/100m").name, null);
  const st = (type, m, d, extra) => Object.assign({ type, end_condition: "distance", end_condition_value: m, description: d, stroke_type: "free" }, extra || {});
  const rest = (s) => ({ type: "rest", end_condition: "fixed.rest", end_condition_value: s, description: `Break: ${s}s` });
  const p = { title: "Test-Schwimmen", sport: "schwimm", steps: [st("warmup", 100, "Warm Up | Recovery | 02:30min/100m"),
    { type: "repeat", end_condition: "iterations", end_condition_value: 2, repeat_count: 2, steps: [st("other", 50, "½Lanes | Reissverschluss | Endurance | 02:40min/100m | Finish Lane: Recovery"), rest(5)] },
    { type: "repeat", end_condition: "iterations", end_condition_value: 2, repeat_count: 2, steps: [st("other", 50, "½Lanes | Abschlagen | Endurance | 02:40min/100m | Finish Lane: Recovery"), rest(5)] },
    { type: "repeat", end_condition: "iterations", end_condition_value: 4, repeat_count: 4, steps: [st("other", 100, "2Lanes | Grundlagenausdauer | Endurance | 02:20min/100m"), rest(20)] },
    st("cooldown", 100, "Cool Down | Recovery | 02:30min/100m")] };
  const wo = TR.workout(p, { zonen: { z3: {}, skalen: {} } });
  const baum = V73.ausWorkout(wo, () => null, () => null);
  assert.equal(baum[0].art, "ein");
  const ab = baum.find((n) => n.typ === "abschnitt");
  assert.ok(ab, "Übungen als Abschnitt"); assert.equal(ab.kinder.length, 2); assert.equal(ab.kinder[0].name, "Reissverschluss");
  // «½Lanes … Finish Lane»: 50 m = eine Bahn → ½ Bahn Übung, Rest der Bahn locker (wie Mein Plan), Zeit nach Strecke geteilt
  const [ueb, bahn, pause] = ab.kinder[0].schritte;
  assert.equal(ueb.art, "technik"); assert.equal(ueb.m, 25); assert.equal(ueb.bahnen, "½ L");
  assert.equal(bahn.art, "bahn"); assert.equal(bahn.m, 25); assert.equal(bahn.bahnen, "½ L");
  assert.equal(ueb.s + bahn.s, 80, "2:40/100 m × 50 m"); assert.equal(pause.art, "pause");
  assert.equal(V73.strecke(baum), 800, "Strecke bleibt gleich");
  const serie = baum.find((n) => n.typ === "b");
  assert.equal(serie.wdh, 4); assert.equal(serie.name, "Grundlagenausdauer");
  assert.equal(baum[baum.length - 1].art, "aus");
  assert.equal(V73.bruch("1½"), 1.5); assert.equal(V73.bruch("2"), 2); assert.equal(V73.bruch("x"), null);
  assert.equal(V73.bahnenText(1.5), "1½ L"); assert.equal(V73.bahnenText(0.5), "½ L"); assert.equal(V73.bahnenText(3), "3 L");
});

test("Auswertung: Achse, Fokus, Coach, Ziele je Metrik, Bereiche der Zonen", () => {
  assert.deepEqual(V73.achse(3600).map((x) => x.text), ["0", "15", "30", "45"]);
  assert.deepEqual(V73.achse(6720).map((x) => x.text), ["0", "30", "1:00", "1:30"]);
  assert.deepEqual(V73.achse(4 * 3600).map((x) => x.text), ["0", "1:00", "2:00", "3:00"]);
  const e = V64.einheit("rad_schwelle", {}), baum = V73.ausTeilen(e);
  assert.deepEqual(V73.fokus(baum).map((f) => f.key), ["z3o"]);
  assert.match(V73.coach(e, baum), /^15 min einfahren\. 3 × 15 min knapp unter LT2/);
  assert.equal(V73.ziel("z2", "rad", SK, null, "leistung"), "160–200 W");
  assert.equal(V73.ziel("z2", "rad", SK, null, "rpe"), "RPE 3–4");
  assert.equal(V73.ziel("pause", "rad", SK, null, "leistung"), "unter 160 W");
  assert.equal(V73.ziel("test", "rad", SK, null, "leistung"), null);
  assert.equal(V73.ziel("z2", "rad", {}, null, "leistung"), null, "ohne Zonenprofil nichts geraten");
  assert.equal(V73.zonenBereich(1, "rad", SK, null, "leistung", mmss), "unter 160 W");
  assert.equal(V73.zonenBereich(5, "rad", SK, null, "puls", mmss), "über 165 bpm");
  assert.equal(V73.ziel("z2", "rad", SK, null, "puls"), "Puls 120–138");
  assert.equal(V73.ziel("z3o", "rad", SK, null, "puls"), "Puls 150–156");
  assert.equal(V73.ziel("vo2", "rad", SK, null, "puls"), "Puls über 165");
  assert.equal(V73.ziel("z2", "lauf", SK, null, "puls"), null, "ohne Pulszonen fürs Laufen nichts geraten");
  assert.equal(V73.zonenBereich(2, "lauf", SK, null, "pace", mmss), "6:20–5:30/km");
  assert.equal(V73.zonenBereich(4, "schwimm", {}, 120, "pace", mmss), "um 2:00 (CSS) /100 m");
  assert.equal(V73.zonenBereich(3, "schwimm", {}, null, "pace", mmss), null);
  assert.equal(V73.metrik({ sport: "rad" }), "leistung"); assert.equal(V73.metrik({ sport: "lauf", metrik: "puls" }), "puls");
  assert.equal(V73.metrik({ sport: "schwimm", metrik: "leistung" }), "pace", "unbekannte Metrik der Sportart → Standard");
});

test("einheit-felder-1.0: Felder prüfen, Uhrzeit/Metrik übernehmen, Sperre schützt die Einheit", () => {
  assert.equal(V66.feldPruefen("uhrzeit", "06:30"), null); assert.ok(V66.feldPruefen("uhrzeit", "6:30"));
  assert.ok(V66.feldPruefen("pausen", 55)); assert.equal(V66.feldPruefen("pausen", 0), null); assert.ok(V66.feldPruefen("ein_min", 45));
  assert.ok(V66.feldPruefen("farbe", "rot"));
  const MO = "2026-11-16", w = V64.woche({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" });
  const ctx = { heute: "2026-11-17", montag: MO, jetzt: "2026-11-17T20:00:00Z", vorschlag: (d) => (w.tage.find((t) => t.date === d) || { einheiten: [] }).einheiten,
    neuId: (() => { let i = 0; return () => "e-t-" + i++; })() };
  const tag = w.tage.find((t) => t.date >= "2026-11-18" && t.einheiten.length), d = tag.date, uid = `v-${d}-0`;
  let r = V66.aendern(null, { art: "einheit", date: d, uid, felder: { uhrzeit: "06:30", metrik: "puls" } }, ctx);
  assert.ok(!r.fehler, r.fehler);
  let s = r.eintrag.tage[d].einheiten[0];
  assert.equal(s.uhrzeit, "06:30"); assert.equal(s.metrik, "puls"); assert.equal(s.quelle, "vorschlag", "Uhrzeit und Metrik lassen die Quelle");
  const e = V66.einheit(s, {}); assert.equal(e.uhrzeit, "06:30"); assert.equal(e.metrik, "puls");
  r = V66.aendern(r.eintrag, { art: "einheit", date: d, uid, felder: { gesperrt: true } }, ctx);
  assert.equal(r.eintrag.tage[d].einheiten[0].gesperrt, true);
  for (const a of [{ art: "entfernen", date: d, uid }, { art: "verschieben", date: d, uid, nach: "2026-11-22" }, { art: "einheit", date: d, uid, felder: { uhrzeit: "07:00" } }])
    assert.match(V66.aendern(r.eintrag, a, ctx).fehler, /gesperrt/);
  r = V66.aendern(r.eintrag, { art: "einheit", date: d, uid, felder: { gesperrt: false, uhrzeit: null } }, ctx);
  s = r.eintrag.tage[d].einheiten[0];
  assert.equal(s.gesperrt, undefined); assert.equal(s.uhrzeit, undefined);
  assert.match(V66.aendern(r.eintrag, { art: "einheit", date: d, uid, felder: { farbe: "rot" } }, ctx).fehler, /unbekanntes Feld/);
  assert.match(V66.aendern(r.eintrag, { art: "einheit", date: "2026-11-16", uid: "v-2026-11-16-0", felder: { uhrzeit: "07:00" } }, ctx).fehler || "", /vergangen|nicht gefunden/);
  assert.match(V66.einheitPruefen({ uid: "x", quelle: "eigen", vorlage: "kraft", dauer: 30, metrik: "watt" }), /Metrik/);
});

test("einheit-anpassen-1.0: Einfahren und Intervall-Intensität ändern nur die vorgesehenen Abschnitte", () => {
  const e = V64.einheit("lauf_vo2", {});
  const a = V66.teileAnpassen(e.teile, { ein_min: 20 });
  assert.deepEqual(a.slice(0, 2), [["z1", 5], ["z2", 15]]);
  assert.deepEqual(V66.teileAnpassen(e.teile, { ein_min: 5 }).slice(0, 2), [["z1", 5], ["vo2", 4]]);
  const kurz = V66.teileAnpassen(e.teile, { pausen: 100 }), lang = V66.teileAnpassen(e.teile, { pausen: 0 });
  const trab = (T) => T.filter(([k], i) => k === "z1" && i > 2 && i < T.length - 1).map((t) => t[1]);
  assert.deepEqual(trab(kurz), [1.5, 1.5, 1.5]); assert.deepEqual(trab(lang), [4.5, 4.5, 4.5]);
  assert.deepEqual(kurz[kurz.length - 1], e.teile[e.teile.length - 1], "Ausfahren bleibt");
  const p = V66.teileAnpassen(V64.einheit("rad_vo2", {}).teile, { pausen: 0 });
  assert.ok(p.filter(([k]) => k === "pause").every(([, m]) => Math.abs(m * 60 - 25) < 0.01), "15 s × 1,5 → 25 s (auf 5 s gerundet), auch nach der letzten Wiederholung");
  const vb = V73.ausTeilen({ id: "rad_vo2", sport: "rad", teile: V66.teileAnpassen(V64.einheit("rad_vo2", {}).teile, { pausen: 80 }) });
  assert.deepEqual(vb.map((n) => n.typ === "s" ? n.art : `${n.wdh} × ${n.name}`), ["ein", "ein", "3 × Serien", "aus"], "Serien bleiben nach dem Anpassen erkennbar");
  assert.equal(vb[2].schritte[0].name, "30 s hart / 10 s locker");
  assert.deepEqual(V66.teileAnpassen(V64.einheit("rad_locker", { d: 60 }).teile, { ein_min: 20, pausen: 0 }), V64.einheit("rad_locker", { d: 60 }).teile, "lockere Einheit ohne Belastung bleibt");
  const u = V66.einheit({ uid: "x", vorlage: "lauf_vo2", dauer: 50, quelle: "eigen", ein_min: 25, pausen: 20 }, {});
  assert.equal(u.dauer, Math.round(u.teile.reduce((s, t) => s + t[1], 0)));
  assert.equal(u.ein_min, 25); assert.equal(u.pausen, 20);
  assert.ok(u.minuten.locker > V64.einheit("lauf_vo2", {}).minuten.locker, "mehr lockere Minuten");
  assert.match(u.ablauf[u.ablauf.length - 1], /Einfahren angepasst: 25 min, Pausen länger/);
  assert.equal(V73.dauer(V73.ausTeilen(u)), Math.round(u.teile.reduce((s, t) => s + t[1], 0) * 60), "Schritte folgen den angepassten Abschnitten");
});

test("verfuegbarkeit mit Sperre: gesperrte Einheit bleibt beim Neuberechnen am Tag (festTag)", () => {
  const MO = "2026-11-16", w = V64.woche({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" });
  const ctx = { heute: "2026-11-17", montag: MO, jetzt: "2026-11-17T20:00:00Z", vorschlag: (d) => (w.tage.find((t) => t.date === d) || { einheiten: [] }).einheiten,
    neuId: (() => { let i = 0; return () => "e-t-" + i++; })() };
  const tag = w.tage.find((t) => t.date >= "2026-11-18" && t.einheiten.length), d = tag.date, uid = `v-${d}-0`;
  let r = V66.aendern(null, { art: "einheit", date: d, uid, felder: { gesperrt: true } }, ctx);
  r = V66.aendern(r.eintrag, { art: "neuberechnen" }, ctx);
  assert.ok(!r.fehler, r.fehler);
  assert.equal(r.eintrag.tage[d].einheiten[0].gesperrt, true, "Tag mit gesperrter Einheit bleibt");
});

test("einheit-2.0: Seite und Rechenteil in Schweizer Schreibweise, ohne feste Farben, Symbole vorhanden", () => {
  const fs = require("node:fs"), path = require("node:path"), lies = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  for (const f of ["js/v73.js", "js/v73-ui.js", "docs/v73-zuordnung.md"]) assert.ok(!lies(f).includes("ß"), f + ": kein ß");
  for (const f of ["js/v73.js", "js/v73-ui.js"]) assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(lies(f).replace(/\/\/.*$/gm, "")), f + ": keine festen Farben");
  const V6 = require("../js/v6.js"), ui = lies("js/v73-ui.js");
  const benutzt = new Set([...ui.matchAll(/ic\("([a-z0-9]+)"/g)].map((m) => m[1]));
  for (const k of benutzt) assert.ok(V6.ICON[k], "Symbol fehlt: " + k);
  for (const k of ["warm", "kalt", "intervall", "runter2", "bahnende", "leiter", "technik"]) assert.ok(V6.ICON[k], k);
});
