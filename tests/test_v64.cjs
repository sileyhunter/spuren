// Abnahmetests V6.4 Etappe 4: Trainingsmodell, Woche nach Modell, Intensitätsverteilung (js/v64.js) und Wissen (js/wissen.js).
// Erfundene Werte, keine persönlichen Daten. node --test tests/test_v64.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const WS = require("../js/wissen.js");
const FK = require("../js/formkurve.js");
const AN = require("../js/analyse.js");
const V6 = require("../js/v6.js");
const V62 = require("../js/v62.js");
const L = require("../js/v59-logik.js");

// Erfundene Beispielzonen (gleiche Form wie TR.zonen(D.zonen).skalen; Pace: von = langsamer Rand)
const SK = {
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  rad_hf: [{ z: "Z1", von: null, bis: 120 }, { z: "Z2", von: 120, bis: 138 }, { z: "Z3", von: 138, bis: 156 }, { z: "Z4", von: 156, bis: 165 }, { z: "Z5", von: 165, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
  lauf_hf: [{ z: "Z1", von: null, bis: 128 }, { z: "Z2", von: 128, bis: 146 }, { z: "Z3", von: 146, bis: 162 }, { z: "Z4", von: 162, bis: 171 }, { z: "Z5", von: 171, bis: null }],
};
const woche = (o) => V64.woche(Object.assign({ woche: "2026-11-16", phase: "Grundlage", stunden: 9, modell: "polarisiert" }, o));
const alle = (w) => w.tage.flatMap((t) => t.einheiten);

test("Modelle: vollständig, Schlüsseleinheiten und Quellen vorhanden, Standard = kombiniert", () => {
  assert.deepEqual(V64.REIHE.slice().sort(), Object.keys(V64.MODELLE).sort());
  assert.equal(V64.MODELLE.kombiniert.standard, true);
  for (const [id, M] of Object.entries(V64.MODELLE)) {
    assert.ok(M.name && M.kurz, id);
    for (const q of M.quellen) assert.ok(WS.QUELLEN[q], `${id}: Quelle ${q}`);
    if (M.teile) { for (const t of M.teile) assert.ok(V64.MODELLE[t] && !V64.MODELLE[t].teile, `${id}: Teil ${t}`); continue; }
    for (const sp of ["rad", "lauf"]) { const b = V64.BAUSTEINE[M.schluessel[sp]]; assert.ok(b && b.sport === sp && b.art === "schluessel", `${id}: ${sp}`); }
    assert.ok(M.erwartet && M.erwartet.muster.length && M.erwartet.locker_min >= 70, id);
  }
  for (const [id, b] of Object.entries(V64.BAUSTEINE)) {
    for (const q of b.quellen) assert.ok(WS.QUELLEN[q], `${id}: Quelle ${q}`);
    assert.ok(WS.kapitel(b.wissen), `${id}: Kapitel ${b.wissen}`);
    assert.ok(b.zweck && b.titel, id);
  }
});

test("Kombiniert: Wechsel am 1. Februar im Jahr des Hauptrennens, ab der Woche des Wechsels rennspezifisch", () => {
  assert.equal(V64.wechselStandard("2027-06-06"), "2027-02-01");
  assert.equal(V64.wechselStandard("2028-02-20"), "2027-02-01", "Rennen im Februar: Wechsel im Jahr davor");
  const w = V64.wahl(null, "2027-06-06");
  assert.deepEqual(w, { modell: "kombiniert", wechsel: "2027-02-01" });
  assert.equal(V64.modellFuer(w, "2027-01-25"), "polarisiert");
  assert.equal(V64.modellFuer(w, "2027-02-01"), "rennspezifisch");
  assert.equal(V64.modellFuer(V64.wahl({ modell: "kombiniert", wechsel: "2027-02-10" }), "2027-02-08"), "rennspezifisch", "Woche, in der der Wechsel liegt");
  assert.equal(V64.modellFuer(V64.wahl({ modell: "pyramidal" }), "2027-04-05"), "pyramidal");
  assert.equal(V64.wahl({ modell: "erfunden", wechsel: "morgen" }, "2027-06-06").modell, "kombiniert", "unbekannt → Standard");
  assert.equal(V64.wahl({ modell: "schwelle", wechsel: "morgen" }, "2027-06-06").wechsel, "2027-02-01");
});

test("Woche: Struktur Mo frei, Schlüssel Di Laufen und Do Rad, lang Sa Rad und So Laufen, höchstens zwei Einheiten pro Tag", () => {
  for (const modell of ["polarisiert", "pyramidal", "schwelle", "rennspezifisch"]) for (const stunden of [6, 9, 12]) {
    const w = woche({ modell, stunden });
    const T = Object.fromEntries(w.tage.map((t) => [t.wt, t]));
    assert.equal(T.Mo.ruhetag, true); assert.equal(T.Mo.einheiten.length, 0);
    assert.equal(T.Di.einheiten[0].id, V64.MODELLE[modell].schluessel.lauf, `${modell} ${stunden} h`);
    assert.equal(T.Do.einheiten[0].id, V64.MODELLE[modell].schluessel.rad);
    assert.ok(T.Sa.einheiten[0].id.startsWith("rad_lang")); assert.ok(T.So.einheiten[0].id.startsWith("lauf_lang"));
    assert.ok(w.tage.every((t) => t.einheiten.length <= 2), "höchstens zwei Einheiten pro Tag");
    assert.ok(Math.abs(w.minuten.total - stunden * 60) <= 25, `${modell} ${stunden} h: ${w.minuten.total} min`);
    assert.ok(w.tage.flatMap((t) => t.einheiten).every((e) => e.dauer > 0 && Number.isInteger(e.dauer)));
  }
});

test("Woche: Aufteilung 20/50/30, Anzahl nach Stunden, lange Einheiten je Phase begrenzt", () => {
  const w = woche({ stunden: 10 });
  assert.ok(Math.abs(w.minuten.rad - 300) <= 15 && Math.abs(w.minuten.lauf - 180) <= 15 && Math.abs(w.minuten.schwimm - 120) <= 15, JSON.stringify(w.minuten));
  assert.deepEqual(V64.anzahl(6), { schwimm: 1, rad: 2, lauf: 2 }); assert.deepEqual(V64.anzahl(9), { schwimm: 2, rad: 3, lauf: 3 }); assert.deepEqual(V64.anzahl(12), { schwimm: 3, rad: 3, lauf: 3 });
  const g = woche({ stunden: 16, phase: "Grundlage" }), a = alle(g);
  assert.ok(a.find((e) => e.id === "rad_lang").dauer <= V64.LANG.Grundlage.rad); assert.ok(a.find((e) => e.id === "lauf_lang").dauer <= V64.LANG.Grundlage.lauf);
  assert.ok(g.hinweise.some((h) => /nicht verteilt/.test(h)), "zu viele Stunden für die Phase: gemeldet, nicht still verteilt");
  const s = alle(woche({ stunden: 18, phase: "Wettkampfspezifisch", modell: "rennspezifisch" })).find((e) => e.id === "rad_lang_rt");
  assert.ok(s.dauer <= V64.LANG.Wettkampfspezifisch.rad && s.dauer > V64.LANG.Grundlage.rad);
});

test("Intensitätsverteilung des Vorschlags passt zum Modell; Renntempo zählt als locker", () => {
  const p = woche({ modell: "polarisiert" });
  assert.equal(p.tid.muster, "polarisiert"); assert.equal(p.zonen.mittel, 0); assert.ok(p.zonen.hart > 0); assert.equal(p.pruefung.ok, true);
  const y = woche({ modell: "pyramidal" });
  assert.equal(y.tid.muster, "pyramidal"); assert.ok(y.zonen.mittel > y.zonen.hart && y.zonen.hart > 0); assert.equal(y.pruefung.ok, true);
  const n = woche({ modell: "schwelle" });
  assert.equal(n.zonen.hart, 0); assert.equal(n.pruefung.ok, true);
  assert.ok(alle(n).some((e) => e.ablauf.some((z) => /Laktat nach der 2\. und 4\./.test(z))), "Laktat-Kontrolle in der Schwellen-Einheit");
  const r = woche({ modell: "rennspezifisch", phase: "Wettkampfspezifisch", stunden: 12 }), ra = alle(r);
  assert.ok(ra.some((e) => e.id === "lauf_koppel") && ra.some((e) => e.id === "rad_lang_rt") && ra.some((e) => e.id === "lauf_lang_rt"));
  const lang = ra.find((e) => e.id === "rad_lang_rt");
  assert.ok(lang.teile.some(([k]) => k === "renntempo")); assert.equal(lang.minuten.mittel, 0, "Renntempo (knapp unter LT1) = locker");
  assert.equal(r.pruefung.ok, true);
  assert.equal(alle(p).filter((e) => e.sport === "schwimm").reduce((s, e) => s + e.minuten.locker + e.minuten.mittel + e.minuten.hart, 0), 0, "Schwimmen zählt nicht zur Verteilung (Puls im Wasser)");
});

test("Erholungswoche: eine gekürzte Schlüsseleinheit (Rad), Laufen locker; Taper: Schlüssel halbiert, Intensität bleibt", () => {
  const e = woche({ erholung: true, stunden: 6.5, phase: "Aufbau" }), ea = alle(e);
  assert.deepEqual(ea.filter((x) => x.schluessel).map((x) => x.id), ["rad_vo2"]);
  assert.equal(ea.find((x) => x.id === "rad_vo2").kurz, true);
  assert.ok(ea.find((x) => x.id === "rad_vo2").ablauf[1].startsWith("2 Serien"));
  assert.ok(!ea.some((x) => x.id === "lauf_koppel"));
  const t = woche({ phase: "Taper", stunden: 7, modell: "rennspezifisch" }), ta = alle(t);
  assert.deepEqual(ta.filter((x) => x.schluessel).map((x) => x.id).sort(), ["lauf_tempo", "rad_tempo"]);
  assert.ok(ta.filter((x) => x.schluessel).every((x) => x.kurz));
  assert.ok(ta.find((x) => x.id === "rad_tempo").teile.filter(([k]) => k === "z3").length === 1, "1 × 20 statt 2 × 20 min");
  assert.ok(ta.find((x) => x.id.startsWith("rad_lang")).dauer <= V64.LANG.Taper.rad);
});

test("Tests: CSS ersetzt das Schwimmen, Kurzcheck in der Ausfahrt, Stufentest ersetzt die lange Ausfahrt und macht den Schlüssel davor locker", () => {
  const w = woche({ css_s: 105, tests: [{ date: "2026-11-19", kind: "css", status: "geplant" }, { date: "2026-11-21", kind: "check" }, { date: "2026-11-20", kind: "css", done: true }] });
  const Do = w.tage[3], Sa = w.tage[5];
  assert.equal(Do.einheiten.find((e) => e.sport === "schwimm").id, "test_css"); assert.equal(Do.einheiten.find((e) => e.sport === "schwimm").ersetzt, "CSS-Wiederholungen");
  assert.equal(Sa.einheiten[0].check, "2026-11-21");
  assert.ok(!w.tage[4].einheiten.some((e) => e.test), "erledigte Tests bleiben weg");
  const s = woche({ erholung: true, stunden: 7, tests: [{ date: "2026-11-21", kind: "stufentest", sport: "rad" }] });
  assert.equal(s.tage[5].einheiten[0].id, "test_rad"); assert.equal(s.tage[5].einheiten[0].ersetzt, "Lange Ausfahrt");
  assert.equal(s.tage[3].einheiten[0].id, "rad_locker"); assert.equal(s.tage[3].einheiten[0].vorTest, true);
  assert.ok(s.hinweise.some((h) => /locker statt hart/.test(h)));
  const l = woche({ tests: [{ date: "2026-11-16", kind: "stufentest", sport: "lauf" }] });
  assert.equal(l.tage[0].einheiten[0].id, "test_lauf"); assert.equal(l.tage[0].ruhetag, false, "Test am freien Tag wird ergänzt");
  const ohne = woche({ stunden: 6, tests: [{ date: "2026-11-18", kind: "check" }] });          // Mi ohne Rad (unter 7 h): nächste Ausfahrt in ±2 Tagen
  assert.equal(ohne.tage[3].einheiten.find((e) => e.sport === "rad").check, undefined, "nie in der Schlüsseleinheit");
  assert.ok(ohne.hinweise.some((h) => /Kurzcheck/.test(h)));
});

test("Rennwoche: zwei Tage vorher frei, Vortag Aktivierung, Renntag, danach frei; Verteilung nicht beurteilt", () => {
  const w = woche({ woche: "2027-04-19", phase: "B-Rennen (Mini-Taper)", stunden: 7, modell: "rennspezifisch", rennen: [{ date: "2027-04-24", name: "70.3 Beispiel", short: "Beispiel", prio: "B" }] });
  const T = Object.fromEntries(w.tage.map((t) => [t.wt, t]));
  assert.equal(T.Sa.rennen.short, "Beispiel"); assert.equal(T.Sa.einheiten.length, 0);
  assert.equal(T.Fr.einheiten[0].id, "aktivierung"); assert.equal(T.Do.ruhetag, true); assert.equal(T.So.ruhetag, true);
  assert.ok(!alle(w).some((e) => e.art === "lang"), "keine langen Einheiten in der Rennwoche");
  assert.equal(w.pruefung.ok, null);
});

test("tid-1.0: Muster und Polarisierungsindex nach Treff 2019", () => {
  const t = (l, m, h) => V64.tid({ locker: l, mittel: m, hart: h });
  assert.equal(t(80, 5, 15).muster, "polarisiert"); assert.equal(t(80, 5, 15).pi, 2.38);           // log10(16 × 0,15 × 100)
  assert.equal(t(92, 0, 8).muster, "polarisiert"); assert.equal(t(92, 0, 8).pi, null, "ohne Mitte nicht berechenbar");
  assert.equal(t(75, 20, 5).muster, "pyramidal"); assert.equal(t(80, 10, 10).muster, "pyramidal");
  assert.equal(t(60, 15, 25).muster, "gemischt", "PI genau 2,00: nicht polarisiert");
  assert.equal(t(30, 50, 20).muster, "schwellenbetont"); assert.equal(t(30, 20, 50).muster, "hochintensiv");
  assert.equal(t(99, 0.5, 0.5).muster, "nur locker"); assert.equal(t(0, 0, 0), null);
  assert.deepEqual(t(1, 1, 2).pct, [25, 25, 50]);
  const p = V64.pruefen("polarisiert", t(70, 20, 10));
  assert.equal(p.ok, false); assert.equal(p.probleme.length, 2);
  assert.equal(V64.pruefen("polarisiert", t(99, 0.5, 0.5), { erholung: true }).ok, true);
  assert.equal(V64.pruefen("polarisiert", t(99, 0.5, 0.5)).ok, false, "normale Woche ohne Schlüsseleinheiten");
  assert.equal(V64.pruefen("schwelle", t(80, 12, 8)).ok, false, "hart über 5 %");
  assert.equal(V64.pruefen("polarisiert", null).ok, null);
});

test("Enduco-Plan: Balken der Workouts (profil-1.0) in drei Bereiche, ohne Ziel = offen", () => {
  const z = V64.tidAusBalken([{ key: "z2", d: 600 }, { key: "fatmax", d: 300 }, { key: "sweet", d: 600 }, { key: "z4", d: 240 }, { key: "vo2", d: 120 }, { key: "pause", d: 60 }, { key: "offen", d: 100 }, { key: "z1", d: null }]);
  assert.deepEqual(z, { locker: 960, mittel: 600, hart: 360, offen: 100 });
  for (const k of Object.keys(V6.ZONEN)) if (k !== "offen") assert.ok(V64.DREI[k], `Zone ${k} zugeordnet`);
  for (const k of Object.keys(V64.FARBE)) assert.ok(V6.ZONEN[V64.FARBE[k]], `Farbe ${k}`);
});

test("Ziele aus dem Zonenprofil: Watt, Pace, Puls; ohne Skala bzw. CSS nichts geraten", () => {
  assert.equal(V64.ziel("z2", "rad", SK), "160–200 W · Puls 120–138");
  assert.equal(V64.ziel("renntempo", "rad", SK), "190–200 W (LT1 200 W) · Puls bis 138");
  assert.equal(V64.ziel("z3o", "rad", SK), "225–240 W, nicht über LT2 (240 W)");
  assert.equal(V64.ziel("vo2", "rad", SK), "über 257 W · Puls über 165 (steigt verzögert)");
  assert.equal(V64.ziel("z2", "lauf", SK), "6:20–5:30/km · Puls 128–146");
  assert.equal(V64.ziel("renntempo", "lauf", SK), "5:40–5:30/km (LT1 5:30/km) · Puls bis 146");
  assert.equal(V64.ziel("z3o", "lauf", SK), "5:03–4:50/km, nicht über LT2 (4:50/km)");
  assert.equal(V64.ziel("z2", "rad", {}), null); assert.equal(V64.ziel("z2", "rad", null), null);
  assert.equal(V64.ziel("css", "schwimm", SK, 105), "1:45/100 m (CSS)"); assert.equal(V64.ziel("css", "schwimm", SK, null), null);
  const e = V64.einheit("rad_laktat", { phase: "Grundlage" });
  assert.deepEqual(V64.ziele(e, SK).map((z) => z.key), ["z1", "z2", "z3o"]);
  const css = V64.einheit("schwimm_css", { d: 45, css_s: 110 });
  assert.equal(css.dauer, 45); assert.ok(css.ablauf[1].startsWith("12 × 100 m in 1:50"));
  assert.ok(V64.einheit("schwimm_css", { d: 45 }).ablauf[1].includes("noch kein CSS-Test"));
});

test("Bausteine: feste Dauer der Schlüsseleinheiten, gekürzt halbiert; Wiederholungen wie beschrieben", () => {
  const z = (e, k) => e.teile.filter(([x]) => x === k);
  const v = V64.einheit("rad_vo2", {}), vk = V64.einheit("rad_vo2", { kurz: true });
  assert.equal(v.dauer, 60); assert.equal(z(v, "vo2").length, 39); assert.equal(v.minuten.hart, 19.5);
  assert.equal(vk.dauer, 50); assert.equal(z(vk, "vo2").length, 26);
  const l = V64.einheit("lauf_vo2", {}); assert.equal(l.dauer, 50); assert.equal(z(l, "vo2").length, 4); assert.equal(l.minuten.hart, 16);
  assert.equal(V64.einheit("lauf_vo2", { kurz: true }).minuten.hart, 8);
  assert.equal(V64.einheit("rad_laktat", {}).minuten.mittel, 40); assert.equal(V64.einheit("lauf_laktat", {}).minuten.mittel, 30);
  assert.equal(V64.einheit("rad_schwelle", {}).minuten.mittel, 45); assert.equal(V64.einheit("rad_tempo", {}).minuten.mittel, 40);
  const lr = V64.einheit("rad_lang_rt", { d: 240, phase: "Wettkampfspezifisch" });
  assert.equal(lr.dauer, 240); assert.equal(z(lr, "renntempo").length, 3); assert.equal(z(lr, "renntempo")[0][1], 30);
  assert.equal(V64.einheit("rad_lang_rt", { d: 120, phase: "Aufbau" }).teile.filter(([k]) => k === "renntempo").length, 1);
  assert.equal(V64.einheit("lauf_koppel", { d: 20 }).dauer, 20);
  assert.equal(V64.einheit("unbekannt", {}), null);
});

test("Speichern: Liste «modell» auf Seite, Eingang und Werkzeugen gleich; Modelle wie in merge_daily.py", () => {
  const fs = require("node:fs"), path = require("node:path"), R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const EG = require("../js/eingang.js");
  assert.equal(typeof EG.LISTEN.modell, "function");
  assert.match(R("tools/eingaben_lib.mjs"), /modell: \(e\) => e\.id/); assert.match(R("tools/eingaben_lib.mjs"), /modell_add: clean\(d\.modell\)/);
  assert.match(R("js/v5-ui.js"), /\["modell", "plan_modell", \(e\) => e\.id\]/);
  const py = /MODELLE = \(([^)]*)\)/.exec(R("tools/merge_daily.py"));
  assert.ok(py, "MODELLE in merge_daily.py");
  assert.deepEqual(py[1].split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean).sort(), V64.REIHE.slice().sort());
});

/* ---------------- Wissen (wissen-1.1) ---------------- */
test("Wissen: Kapitel eindeutig, vollständig, Verweise auflösbar", () => {
  const ids = WS.KAPITEL.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, "Kapitel-IDs eindeutig");
  for (const k of WS.KAPITEL) {
    assert.ok(k.titel && k.kurz && Array.isArray(k.text) && k.text.length, k.id);
    const v = WS.verweise(k.text.join(" ") + " " + k.kurz);
    for (const q of v.quellen) { assert.ok(WS.QUELLEN[q], `${k.id}: Quelle ${q} fehlt`); assert.ok(k.quellen.includes(q), `${k.id}: ${q} im Text, aber nicht in der Liste`); }
    for (const q of k.quellen) assert.ok(v.quellen.includes(q), `${k.id}: ${q} in der Liste, aber nicht im Text`);
    for (const x of v.kapitel) assert.ok(ids.includes(x), `${k.id}: Kapitel ${x}`);
  }
});

test("Wissen: jede Quelle mit Autoren, Jahr, Titel, Zeitschrift und DOI (sonst Begründung) und mindestens einmal verwendet", () => {
  const benutzt = new Set(WS.KAPITEL.flatMap((k) => k.quellen));
  for (const [id, q] of Object.entries(WS.QUELLEN)) {
    assert.ok(q.zit && q.a && q.t && q.q && q.kern, id);
    assert.ok(Number.isInteger(q.j) && q.j >= 1970 && q.j <= 2026, `${id}: Jahr`);
    assert.ok(q.zit.includes(String(q.j)), `${id}: Kurzzitat mit Jahr`);
    assert.ok((q.doi && /^10\.\d{4,9}\/\S+$/.test(q.doi)) || (q.url && /^https:\/\//.test(q.url)) || q.ohneDoi, `${id}: DOI oder URL`);
    assert.ok(benutzt.has(id), `${id}: in keinem Kapitel verwendet`);
  }
  const doi = Object.values(WS.QUELLEN).map((q) => q.doi).filter(Boolean);
  assert.equal(new Set(doi.map((d) => d.toLowerCase())).size, doi.length, "kein DOI doppelt");
  assert.equal(WS.link("seiler2010"), "https://doi.org/10.1123/ijspp.5.3.276");
  assert.equal(WS.link("banister1975"), null);
});

test("Wissen: Schweizer Schreibweise (ss), keine Platzhalter, keine persönlichen Zahlen", () => {
  const alles = JSON.stringify([WS.KAPITEL, WS.QUELLEN, V64.MODELLE, Object.values(V64.BAUSTEINE).map((b) => [b.titel, b.zweck])]);
  assert.ok(!alles.includes("ß"), "kein ß");
  assert.ok(!/TODO|XXX|lorem/i.test(alles));
  assert.ok(!/\b\d{2,3} ?W\b/.test(JSON.stringify(WS.KAPITEL)), "keine Wattwerte in den Texten");
});

test("Wissen: Regel-Liste verweist auf vorhandene Versionen und Kapitel", () => {
  const M = { AN, FK, V62, V64, V59L: L };
  for (const [mod, key, text, kap] of WS.REGELN) {
    assert.ok(M[mod] && M[mod].VERSIONS && M[mod].VERSIONS[key], `${mod}.${key}`);
    assert.ok(text && WS.kapitel(kap), `${mod}.${key}: Kapitel ${kap}`);
  }
  for (const k of WS.KAPITEL) for (const [mod, key] of k.seite || []) assert.ok(M[mod] && M[mod].VERSIONS[key], `${k.id}: ${mod}.${key}`);
});

test("Wissen 1.1: Kapitel «aufbau» mit Laufaufbau, Scores und Aufteilung", () => {
  const WS = require("../js/wissen.js");
  assert.equal(WS.VERSION, "wissen-1.1");
  const k = WS.kapitel("aufbau");
  assert.ok(k, "Kapitel aufbau fehlt");
  const v = WS.verweise(k.text.join(" ") + " " + k.kurz);
  for (const q of ["frandsen2025", "knechtle2011", "millet2002", "buist2008", "lauersen2014", "garmin2025last", "impellizzeri2021"]) assert.ok(v.quellen.includes(q), q);
  for (const q of k.quellen) assert.ok(v.quellen.includes(q), "Liste ohne Verweis im Text: " + q);
  assert.ok(WS.REGELN.some((r) => r[0] === "V64" && r[1] === "aufteilung" && r[3] === "aufbau"));
  assert.ok(WS.kapitel("modelle").text.join(" ").includes("[[#aufbau]]"));
});
