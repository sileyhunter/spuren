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

/* ---------------- Wissen (wissen-1.3) ---------------- */
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

test("Wissen 1.2/1.3: Kapitel «aufbau» und «vergleich» mit Quellen und Regeln", () => {
  const WS = require("../js/wissen.js");
  assert.equal(WS.VERSION, "wissen-1.3");
  const k = WS.kapitel("aufbau");
  assert.ok(k, "Kapitel aufbau fehlt");
  const v = WS.verweise(k.text.join(" ") + " " + k.kurz);
  for (const q of ["frandsen2025", "knechtle2011", "millet2002", "millet2009", "etxebarria2019", "buist2008", "lauersen2014", "garmin2025last", "impellizzeri2021"]) assert.ok(v.quellen.includes(q), q);
  for (const q of k.quellen) assert.ok(v.quellen.includes(q), "Liste ohne Verweis im Text: " + q);
  for (const key of ["aufteilung", "aufbau", "intensitaet"]) assert.ok(WS.REGELN.some((r) => r[0] === "V64" && r[1] === key && r[3] === "aufbau"), key);
  for (const [m, key] of k.seite) assert.ok(m !== "V64" || V64.VERSIONS[key], "Version fehlt: " + key);
  assert.ok(WS.kapitel("modelle").text.join(" ").includes("[[#aufbau]]"));
  const vg = WS.kapitel("vergleich");
  assert.ok(vg && WS.verweise(vg.text.join(" ")).quellen.includes("hecksteden2015"));
  assert.ok(WS.REGELN.some((r) => r[0] === "V64" && r[1] === "vergleich" && r[3] === "vergleich"));
});

/* ---------------- V6.4.2: Intensität je Sportart (intensitaet-1.0) ---------------- */
test("Intensität je Sportart: Standard «alles», Ersatz derselben Sportart, nichts verschoben", () => {
  assert.deepEqual(V64.intensitaet(null), { schwimm: "alles", rad: "alles", lauf: "alles" });
  assert.deepEqual(V64.intensitaet({ intensitaet: { rad: "locker", lauf: "unsinn" } }), { schwimm: "alles", rad: "locker", lauf: "alles" });
  assert.equal(V64.kappen("rad_vo2", "alles"), "rad_vo2");
  assert.equal(V64.kappen("rad_vo2", "schwelle"), "rad_schwelle");
  assert.equal(V64.kappen("lauf_vo2", "schwelle"), "lauf_tempo");
  assert.equal(V64.kappen("rad_laktat", "locker"), "rad_locker");
  assert.equal(V64.kappen("schwimm_css", "locker"), "schwimm_locker");
  assert.equal(V64.kappen("lauf_lang_rt", "locker"), "lauf_lang_rt");              // Renntempo zählt als locker
  const ohne = woche({ modell: "polarisiert" }), mit = woche({ modell: "polarisiert", intensitaet: { schwimm: "locker", rad: "locker", lauf: "alles" } });
  assert.equal(alle(ohne).filter((e) => e.gekappt).length, 0);
  const radDo = mit.tage[3].einheiten.find((e) => e.sport === "rad");
  assert.equal(radDo.id, "rad_locker"); assert.equal(radDo.gekappt, "VO2max 30/15");
  assert.equal(radDo.dauer, ohne.tage[3].einheiten.find((e) => e.sport === "rad").dauer, "gleiche Dauer wie die Schlüsseleinheit");
  assert.ok(alle(mit).filter((e) => e.sport === "rad").every((e) => e.minuten.hart === 0 && e.minuten.mittel === 0));
  assert.equal(mit.tage[1].einheiten.find((e) => e.sport === "lauf").id, "lauf_vo2", "Laufen bleibt wie im Modell, keine zweite harte Einheit");
  assert.equal(alle(mit).filter((e) => e.sport === "lauf" && e.minuten.hart > 0).length, 1);
  const swDo = mit.tage[3].einheiten.find((e) => e.sport === "schwimm");
  assert.equal(swDo.id, "schwimm_locker"); assert.equal(swDo.gekappt, "CSS-Wiederholungen");
  assert.ok(mit.hinweise.some((h) => /nicht auf eine andere Sportart verschoben/.test(h)));
  assert.ok(mit.hinweise.some((h) => /Rad: «Grundlage» statt «VO2max 30\/15»/.test(h)));
  assert.equal(Math.round(mit.minuten.rad), Math.round(ohne.minuten.rad), "Stunden je Sportart bleiben");
  const schw = woche({ modell: "polarisiert", intensitaet: { lauf: "schwelle", rad: "schwelle" } });
  assert.equal(schw.tage[1].einheiten.find((e) => e.sport === "lauf").id, "lauf_tempo");
  assert.equal(schw.tage[3].einheiten.find((e) => e.sport === "rad").id, "rad_schwelle");
  assert.equal(schw.zonen.hart, 0);
  assert.equal(schw.pruefung.ok, null, "Abweichung wegen eigener Wahl: nicht als Fehler");
  assert.match(schw.pruefung.text, /weil du die Intensität je Sportart begrenzt hast/);
  assert.equal(woche({ modell: "polarisiert" }).pruefung.ok, true);
});

test("Enduco gegen die Intensität: aus den Zielen der Schritte, sonst aus dem Titel, sonst offen", () => {
  assert.deepEqual(V64.planStufe([{ key: "z2", d: 600 }, { key: "vo2", d: 30 }], ""), { stufe: "alles", quelle: "ziele" });
  assert.deepEqual(V64.planStufe([{ key: "z2", d: 600 }, { key: "sweet", d: 600 }], "VO2max"), { stufe: "schwelle", quelle: "ziele" });
  assert.deepEqual(V64.planStufe([{ key: "z2", d: 3600 }], ""), { stufe: "locker", quelle: "ziele" });
  assert.deepEqual(V64.planStufe([{ key: "offen", d: 600 }], "VO₂max & Tempo"), { stufe: "alles", quelle: "titel" });
  assert.deepEqual(V64.planStufe(null, "Tempo Über-Unter"), { stufe: "schwelle", quelle: "titel" });
  assert.deepEqual(V64.planStufe(null, "Grundlagenausdauer"), { stufe: "locker", quelle: "titel" });
  assert.deepEqual(V64.planStufe(null, "Fatmax Pyramide"), { stufe: "locker", quelle: "titel" });
  assert.deepEqual(V64.planStufe(null, "Neuro Intervalle & Ausdauer"), { stufe: "alles", quelle: "titel" }, "das stärkste Wort zählt");
  assert.equal(V64.planStufe(null, "Kraft & Power"), null, "nicht beurteilbar bleibt offen");
});

/* ---------------- V6.4.2: Aufbau-Check (aufbau-1.0) ---------------- */
const lauf = (date, km, start, extra) => Object.assign({ sport: "lauf", date, km, start: start || "08:00", mv: km * 330 }, extra || {});
test("Aufbau: jeder Lauf gegen den längsten der 30 Tage davor, Klassen nach Frandsen 2025", () => {
  const acts = [lauf("2026-08-01", 30), lauf("2026-09-01", 8), lauf("2026-09-20", 10), lauf("2026-09-25", 10.9), lauf("2026-10-05", 13),
    lauf("2026-10-12", 21), lauf("2026-10-20", 45), lauf("2026-10-20", 5, "18:00"), lauf("2026-10-21", 46, "07:00", { km: 120 }),
    { sport: "rad", date: "2026-11-10", km: 80, mv: 9000 }, { sport: "schwimm", date: "2026-11-10", km: 2.4, mv: 3000 }];
  const A = V64.aufbau(acts, "2026-11-13"), L = A.laeufe, k = (d, s) => L.find((r) => r.date === d && (!s || r.start === s));
  assert.equal(L.length, 8, "nur 0,5–100 km");
  assert.equal(k("2026-09-01").klasse, "ohne", "30 km vom 1.8. liegt 31 Tage zurück");
  assert.equal(k("2026-09-20").klasse, "klein");                         // 10 gegen 8 = +25 %
  assert.equal(k("2026-09-25").klasse, "ok");                            // 10,9 gegen 10 = +9 %
  assert.equal(k("2026-10-05").klasse, "klein");                         // 13 gegen 10,9
  assert.equal(k("2026-10-12").klasse, "mittel");                        // 21 gegen 13 = +62 %
  assert.equal(k("2026-10-20", "08:00").klasse, "gross");                // 45 gegen 21
  assert.equal(k("2026-10-20", "18:00").ref.km, 45, "früherer Lauf am selben Tag zählt");
  assert.equal(V64.sprungKlasse(0.1), "ok"); assert.equal(V64.sprungKlasse(0.3), "klein"); assert.equal(V64.sprungKlasse(1), "mittel");
  assert.deepEqual(A.spruenge.map((r) => r.date), ["2026-10-20", "2026-10-12", "2026-10-05", "2026-09-20"]);
  assert.equal(A.grenze.km, 49.5); assert.equal(A.grenze.ref.date, "2026-10-20"); assert.equal(A.grenze.bis, "2026-11-19");
  assert.equal(A.danach.ab, "2026-11-20"); assert.equal(A.danach.km, null, "keine späteren Läufe");
  const w = A.wochen[A.wochen.length - 1];
  assert.equal(A.wochen.length, 12); assert.equal(w.woche, "2026-11-09"); assert.equal(w.laufend, true);
  assert.equal(w.schwimm_m, 2400); assert.equal(w.rad_h, 2.5); assert.equal(w.lauf_km, 0);
  assert.equal(V64.HRR.klein, 1.64); assert.equal(V64.HRR.gross, 2.28);
});

test("Aufbau: Grenze für einen Tag (nur absolvierte Läufe), danach und auf 0,1 km abgerundet", () => {
  const L = V64.laeufe([lauf("2026-10-20", 16.4), lauf("2026-10-28", 11.3), lauf("2026-11-03", 12.9)]);
  assert.deepEqual(V64.laufGrenze(L, "2026-11-13", "2026-11-13").km, 18);
  assert.equal(V64.laufGrenze(L, "2026-11-19", "2026-11-13").ref.km, 16.4, "Fenster 20.10.–13.11. (nur absolvierte Läufe)");
  assert.equal(V64.laufGrenze(L, "2026-11-20", "2026-11-13").ref.km, 12.9, "ab dem 31. Tag zählt der 20.10. nicht mehr");
  assert.equal(V64.laufGrenze(L, "2026-12-30", "2026-11-13"), null);
  const A = V64.aufbau([lauf("2026-10-20", 16.4), lauf("2026-10-28", 11.3), lauf("2026-11-03", 12.9)], "2026-11-13");
  assert.equal(A.naechster, "2026-11-13"); assert.equal(A.danach.ab, "2026-11-20"); assert.equal(A.danach.km, 14.1);
  assert.equal(V64.aufbau([lauf("2026-11-13", 5)], "2026-11-13").naechster, "2026-11-14", "heute schon gelaufen: ab morgen");
});

test("wochenplan-1.1: kein Lauf im Vorschlag über der Aufbau-Grenze; ohne Zonenprofil keine Begrenzung", () => {
  const L = V64.laeufe([lauf("2026-11-01", 8)]);                       // Grenze 8,8 km
  const w = woche({ stunden: 12, laeufe: L, heute: "2026-11-13", skalen: SK });
  const so = w.tage[6].einheiten.find((e) => e.sport === "lauf"), fr = w.tage[4].einheiten.find((e) => e.sport === "lauf");
  assert.ok(V64.kmSchaetzung(so, SK) <= 8.8 + 1e-9, "langer Lauf gekürzt");
  assert.ok(!fr || V64.kmSchaetzung(fr, SK) <= 8.8 + 1e-9, "lockerer Lauf gekürzt");
  assert.ok(w.hinweise.some((h) => /Aufbau-Grenze von 8,8 km/.test(h)));
  assert.ok(w.hinweise.some((h) => /VO2max 4 × 4 min am Di: ≈ .* km, über deiner Aufbau-Grenze/.test(h)) || V64.kmSchaetzung(w.tage[1].einheiten[0], SK) <= 8.8);
  const ohneSk = woche({ stunden: 12, laeufe: L, heute: "2026-11-13" });
  assert.equal(ohneSk.tage[6].einheiten.find((e) => e.sport === "lauf").dauer, woche({ stunden: 12 }).tage[6].einheiten.find((e) => e.sport === "lauf").dauer);
  // Distanzschätzung: 60 min Z2 bei Mitte 5:55/km (380/330 s) ≈ 10,1 km; Z1 mit dem langsamen Rand gerechnet
  assert.equal(Math.round(V64.kmSchaetzung({ sport: "lauf", teile: [["z2", 60]] }, SK) * 10) / 10, 10.1);
  assert.equal(V64.kmSchaetzung({ sport: "lauf", teile: [["z2", 60]] }, {}), null);
  assert.equal(V64.kmSchaetzung({ sport: "rad", teile: [["z2", 60]] }, SK), null);
});

test("Geplanter Lauf: Distanz aus Distanzschritten und Pace-Zielen, offene Schritte → unvollständig", () => {
  const wo = { schritte: [{ dauer_s: 600, ziel: { art: "pace", lo: 360, hi: 330 } }, { distanz_m: 5000 }, { dauer_s: 1200, ziel: { art: "pace", lo: 300, hi: 300 }, mitte: 300 }] };
  const k = V64.planKm(wo);
  assert.equal(Math.round(k.km * 100) / 100, Math.round((600 / 345 + 5 + 1200 / 300) * 100) / 100);
  assert.equal(k.vollst, true); assert.equal(k.geschaetzt, true);
  const offen = V64.planKm({ schritte: [{ dauer_s: 600, ziel: { art: "pace", lo: 360, hi: 330 } }, { dauer_s: null, ziel: { art: "pace", lo: 400, hi: 360 } }, { dauer_s: 600, ziel: { art: "hf", lo: 130, hi: 140 } }] });
  assert.equal(offen.vollst, false);
  assert.equal(V64.planKm(null), null);
});

/* ---------------- V6.4.3: Vergleich mit Enduco (vergleich-1.0) ---------------- */
test("Enduco von der Uhr: nur wo nichts im Kalender stand, ohne Tests, Dauer aus dem Workout", () => {
  const acts = [
    { date: "2026-11-17", sport: "rad", wk: { name: "Kurze VO2max Intervalle ", plan_s: 3600, ist_s: 3500 } },
    { date: "2026-11-18", sport: "lauf", wk: { name: "Fatmax", plan_s: null, ist_s: 2700 } },
    { date: "2026-11-19", sport: "rad", wk: { name: "Stufentest Rad", plan_s: 4500 } },
    { date: "2026-11-20", sport: "lauf", wk: { name: "Tempo Intervalle", plan_s: 3000 } },
    { date: "2026-11-20", sport: "lauf" }];
  const U = V64.enducoAusUhr(acts, [{ date: "2026-11-20", sport: "lauf" }]);
  assert.deepEqual(U.map((x) => [x.date, x.titel, x.dauer_s, x.stufe, x.herkunft]), [
    ["2026-11-17", "Kurze VO2max Intervalle", 3600, "alles", "uhr"], ["2026-11-18", "Fatmax", 2700, "locker", "uhr"]]);
});

test("Vergleich: Fenster, Summen, Stufen, Unterschiede und welchem Plan das Training näher war", () => {
  const w = woche({ stunden: 9 });                                     // Woche ab 16.11.2026, polarisiert
  assert.equal(V64.stufeVon(w.tage[3].einheiten.find((e) => e.sport === "rad")), "alles");
  assert.equal(V64.stufeVon({ id: "lauf_lang", art: "lang" }), "locker"); assert.equal(V64.stufeVon({ id: "test_rad", art: "test" }), "test");
  assert.equal(V64.vergleich({ w, enduco: [], ist: [], heute: "2026-11-18" }).leer, true);
  const enduco = [
    { date: "2026-11-17", sport: "rad", titel: "Sweet Spot", dauer_s: 5400, stufe: "schwelle" },
    { date: "2026-11-18", sport: "lauf", titel: "VO2max Intervalle", dauer_s: 3600, stufe: "alles" },
    { date: "2026-11-19", sport: "rad", titel: "Über-Unter", dauer_s: 6000, stufe: "schwelle" },
    { date: "2026-11-19", sport: "schwimm", titel: "VO₂max & Tempo", dauer_s: 3000, stufe: "alles" }];
  const ist = [{ date: "2026-11-17", sport: "rad", dauer_s: 5300 }, { date: "2026-11-18", sport: "lauf", dauer_s: 3500 }];
  const r = V64.vergleich({ w, enduco, ist, heute: "2026-11-19" });
  assert.equal(r.leer, false); assert.equal(r.vorbei, false);
  assert.equal(r.planBis, "2026-11-19", "Pläne bis zum letzten exportierten Tag"); assert.equal(r.istBis, "2026-11-18", "Absolviertes bis gestern");
  assert.equal(Math.round(r.summen.E.rad.min), 190); assert.equal(r.summen.E.total.n, 4);
  assert.equal(r.summen.V.total.min, w.tage.filter((t) => t.date <= "2026-11-19").flatMap((t) => t.einheiten).reduce((a, e) => a + e.dauer, 0));
  assert.deepEqual([r.stufen.E.alles.length, r.stufen.E.schwelle.length], [2, 2]);
  assert.equal(r.abdeckung.anteil, 1); assert.equal(r.sicher, true);
  assert.equal(r.naeher.urteil, "Enduco", "das Training lag am Enduco-Plan");
  assert.ok(r.unterschiede.some((u) => u.art === "schwelle" && /Enduco 2 – Di Rad «Sweet Spot», Do Rad «Über-Unter»/.test(u.text)));
  assert.ok(r.unterschiede.some((u) => u.art === "schwimmen"));
  // vergangene Woche: ganze Woche; Training ohne Enduco-Einträge → nur teilweise bekannt, kein Urteil
  const ist2 = ist.concat([{ date: "2026-11-20", sport: "schwimm", dauer_s: 2400 }, { date: "2026-11-21", sport: "rad", dauer_s: 9000 }, { date: "2026-11-22", sport: "lauf", dauer_s: 4000 }]);
  const r2 = V64.vergleich({ w, enduco, ist: ist2, heute: "2026-11-30" });
  assert.equal(r2.vorbei, true); assert.equal(r2.planBis, "2026-11-22"); assert.equal(r2.abdeckung.mitPlan, 2); assert.equal(r2.sicher, false);
  assert.equal(r2.naeher, null);
  assert.ok(r2.unterschiede.some((u) => u.art === "abdeckung") && !r2.unterschiede.some((u) => ["stunden", "hart", "frei"].includes(u.art)));
});
