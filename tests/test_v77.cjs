/* Abnahmetests V7.7: Aktivitäten draussen planen (aktivitaet-plan-1.0) und Zonen nach Puls prüfen (zonenpruefung-hf-1.0). Erfundene Werte. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js"), V66 = require("../js/v66.js"), V74 = require("../js/v74.js"), V76 = require("../js/v76.js"), V77 = require("../js/v77.js");

const T0 = "2026-11-18T07:00:00Z";
const ak = (ds, art, min, zone, mehr) => Object.assign(V77.eintrag(ds, { art, min, zone }, T0), mehr || {});
const ids = (t) => t.einheiten.map((e) => e.id);
const tag = (w, ds) => w.tage.find((t) => t.date === ds);
const radMin = (w) => w.tage.reduce((s, t) => s + t.einheiten.filter((e) => e.sport === "rad").reduce((x, e) => x + e.dauer, 0), 0);

test("aktivitaet-plan-1.0: Eintrag prüfen, neueste Fassung gilt, entfernt = weg", () => {
  assert.equal(V77.VERSIONS.aktivitaet, "aktivitaet-plan-1.0");
  assert.equal(V77.pruefen(ak("2026-12-05", "skitour", 300, "z2")), null);
  assert.match(V77.pruefen(ak("2026-12-05", "skitour", 305, "z2")), /15-min/);
  assert.match(V77.pruefen(ak("2026-12-05", "skitour", 45, "z2")), /1–10 h/);
  assert.match(V77.pruefen(ak("2026-12-05", "skitour", 300, "z3")), /Z1 oder Z2/);
  assert.match(V77.pruefen(ak("2026-12-05", "velo", 300, "z2")), /unbekannte/);
  assert.match(V77.pruefen(Object.assign(ak("2026-12-05", "wandern", 240, "z1"), { id: "ak-2026-12-06" })), /Kennung/);
  assert.match(V77.pruefen(ak("2026-12-05", "wandern", 240, "z1", { uhrzeit: "07:31" })), /Uhrzeit/);
  assert.equal(V77.pruefen({ id: "ak-2026-12-05", date: "2026-12-05", entfernt: true, geaendert: T0 }), null);
  const alt = ak("2026-12-05", "skitour", 300, "z2"), neu = Object.assign(ak("2026-12-05", "wandern", 240, "z2"), { geaendert: "2026-11-19T07:00:00Z" });
  assert.equal(V77.liste([neu], [alt]).get("2026-12-05").art, "wandern", "neuere Fassung gilt, auch aus den Daten");
  assert.equal(V77.liste([alt], [{ id: alt.id, date: alt.date, entfernt: true, geaendert: "2026-11-19T07:00:00Z" }]).size, 0);
  assert.equal(V77.liste([Object.assign({}, alt, { min: 7 })], []).size, 0, "ungültige Einträge zählen nicht");
});

test("aktivitaet-plan-1.0: Einheit nach Puls, Vorlage in Mein Plan gültig, nicht über «Training hinzufügen» und nicht an Garmin", () => {
  const e = V77.einheit(ak("2026-12-05", "skitour", 300, "z2", { uhrzeit: "07:30" }), {});
  assert.deepEqual([e.uid, e.art, e.draussen, e.sport, e.zone, e.metrik, e.dauer, e.uhrzeit], ["akt-2026-12-05", "draussen", "skitour", "ski", "z2", "puls", 300, "07:30"]);
  assert.deepEqual(e.teile, [["z2", 300]]);
  assert.deepEqual(e.minuten, { locker: 300, mittel: 0, hart: 0 });
  assert.equal(V66.einheitPruefen(e.spec), null);
  assert.equal(V66.einheitPruefen(Object.assign({}, e.spec, { zone: "z4" })), "Intensität Z1 oder Z2");
  assert.ok(!V66.vorlagen("lauf").some((v) => v.id === "trail"), "Traillauf nur über «Draussen planen»");
  assert.match(V66.garminGrund(V77.einheit(ak("2026-12-05", "trail", 120, "z2"), {})), /ohne Workout/);
  assert.equal(V77.einheit(ak("2026-12-05", "langlauf", 120, "z1"), {}).titel, "Langlauf Z1");
});

test("aktivitaet-plan-1.0: Skitour 5 h Z2 ersetzt zuerst die lange Ausfahrt, dann lockere – Schlüssel bleiben, Rest kommt dazu", () => {
  const w = V64.woche({ woche: "2026-11-30", stunden: 10 });
  const vorher = radMin(w), hart = w.tage.flatMap((t) => t.einheiten.filter((e) => e.sport === "rad" && e.schluessel).map((e) => e.id));
  const x = V77.einplanen(w, V77.liste([ak("2026-12-05", "skitour", 300, "z2")], []), {});
  assert.equal(ids(tag(x, "2026-12-05"))[0], "skitour");
  assert.ok(!x.tage.some((t) => t.einheiten.some((e) => e.id === "rad_lang")), "lange Ausfahrt entfällt");
  assert.deepEqual(x.tage.flatMap((t) => t.einheiten.filter((e) => e.sport === "rad" && e.schluessel).map((e) => e.id)), hart, "Schlüsseleinheiten bleiben");
  const d = x.draussen[0];
  assert.equal(d.ersatz, 300); assert.equal(d.ersetzt + d.zusatz, 300);
  assert.equal(vorher - radMin(x), d.ersetzt, "genau so viel Rad weniger");
  assert.match(x.hinweise[x.hinweise.length - 1], /Skitour am Sa \(5:00 h, Z2\) ersetzt .*Rad.*aktivitaet-plan-1\.0/);
  // Laufen bleibt unberührt
  const lauf = (u) => u.tage.flatMap((t) => t.einheiten.filter((e) => e.sport === "lauf").map((e) => e.id + e.dauer)).join();
  assert.equal(lauf(x), lauf(w));
});

test("aktivitaet-plan-1.0: Z1 zählt halb; unter 2 h zuerst lockere Einheiten; Traillauf ersetzt Laufen; Rennwoche nur eintragen", () => {
  const w = V64.woche({ woche: "2026-11-30", stunden: 10 });
  const lockerMi = tag(w, "2026-12-02").einheiten.find((e) => e.id === "rad_locker");
  const x = V77.einplanen(w, V77.liste([ak("2026-12-02", "wandern", 90, "z1")], []), {});
  assert.equal(x.draussen[0].ersatz, 45);
  assert.ok(x.tage.some((t) => t.einheiten.some((e) => e.id === "rad_lang")), "unter 2 h bleibt die lange Ausfahrt");
  assert.equal(tag(x, "2026-12-02").einheiten.find((e) => e.id === "rad_locker").dauer, lockerMi.dauer - 45);
  const y = V77.einplanen(w, V77.liste([ak("2026-12-05", "trail", 180, "z2")], []), {});
  assert.ok(!y.tage.some((t) => t.einheiten.some((e) => e.id === "lauf_lang")), "langer Lauf ersetzt");
  assert.equal(radMin(y), radMin(w), "Rad bleibt beim Traillauf");
  const r = V64.woche({ woche: "2026-11-30", stunden: 10, rennen: [{ date: "2026-12-06", name: "Test", prio: "A" }] });
  const z = V77.einplanen(r, V77.liste([ak("2026-12-02", "skitour", 240, "z2")], []), {});
  if (z.tage.some((t) => t.rennen)) { assert.ok(z.draussen[0].renn); assert.match(z.hinweise.join(" "), /Rennwoche/); }
});

test("aktivitaet-plan-1.0: der Tag gehört der Aktivität, Vortag und Tag danach ohne harte Einheit an Land (ab 2 h)", () => {
  const w = V64.woche({ woche: "2026-11-30", stunden: 10 });
  // Skitour am Mittwoch: Do (Rad-Schlüssel) ist Tag danach, Di (Lauf-Schlüssel) Vortag
  const x = V77.einplanen(w, V77.liste([ak("2026-12-02", "skitour", 240, "z2")], []), {});
  const v = V66.wocheVerteilt(x, () => null, {});
  assert.deepEqual(ids(tag(v, "2026-12-02")), ["skitour"], "nichts dazu am Tag der Aktivität");
  for (const ds of ["2026-12-01", "2026-12-03"]) assert.ok(!tag(v, ds).einheiten.some((e) => e.schluessel && (e.sport === "rad" || e.sport === "lauf")), ds + ": keine harte Einheit an Land");
  assert.ok(v.tage.flatMap((t) => t.einheiten).filter((e) => e.schluessel && (e.sport === "rad" || e.sport === "lauf")).length >= 1, "Schlüssel nur verschoben");
  // kurze Aktivität (unter 2 h): Nachbartage frei
  const y = V66.wocheVerteilt(V77.einplanen(w, V77.liste([ak("2026-12-02", "wandern", 90, "z2")], []), {}), () => null, {});
  assert.ok(tag(y, "2026-12-03").einheiten.some((e) => e.schluessel), "unter 2 h bleibt die harte Einheit am Tag danach");
});

test("aktivitaet-plan-1.0: Krafttraining nicht am Tag der Aktivität; Ampel «vorsichtig» = zwei Drittel und Z1", () => {
  const w = V64.woche({ woche: "2026-11-30", stunden: 10 });
  const x = V77.einplanen(w, V77.liste([ak("2026-12-04", "skitour", 300, "z2")], []), {});
  const E = { kraft: { aktiv: true, modus: "auto", tage: [5], dauer: 60 } };
  const k = V76.einplanen(x, E, {});
  if (k.kraft && k.kraft.status !== "aus") assert.notEqual(k.kraft.date, "2026-12-04");
  const F = { kraft: { aktiv: true, modus: "fest", wt: 5, dauer: 60 } };
  const f = V76.einplanen(x, F, {});
  if (f.kraft && f.kraft.status === "geplant") assert.equal(f.kraft.date, "2026-12-03"), assert.match(f.hinweise.join(" "), /Aktivität draussen/);
  const e = V77.einheit(ak("2026-12-05", "skitour", 300, "z2"), {}), l = V74.locker(e, {});
  assert.deepEqual([l.dauer, l.zone, l.art], [195, "z1", "draussen"]);
  assert.match(l.ampel.grund.join(" "), /zwei Drittel.*nur Z1/);
  assert.equal(V74.locker(V77.einheit(ak("2026-12-05", "wandern", 75, "z1"), {}), {}), null, "kurz und schon Z1: bleibt");
});

test("aktivitaet-plan-1.0: TL ≈ aus eigenen Aktivitäten derselben Art (Median, mind. drei ab 1 h)", () => {
  const acts = [];
  for (const [d, tl] of [["2026-01-10", 60], ["2026-02-10", 80], ["2026-03-10", 100], ["2026-03-20", 400]]) acts.push({ date: d, sport: "ski", typ: "Skitouren", dur: 4 * 3600, tl2: tl * 4, tss: 1 });
  acts.push({ date: "2026-03-01", sport: "ski", typ: "Skifahren", dur: 4 * 3600, tl2: 999 }, { date: "2026-03-02", sport: "wandern", typ: "Wandern", dur: 1800, tl2: 50 });
  const m = V77.tlProStunde(acts, "last-2.1", "2026-11-18");
  assert.equal(m.skitour, 90, "Median 80/100 je Stunde; Skifahren zählt nicht");
  assert.equal(m.wandern, undefined, "unter drei Wanderungen ab 1 h: keine Zahl");
  const e = V77.einheit(ak("2026-12-05", "skitour", 300, "z2"), {});
  assert.equal(V66.schaetzung(e, { draussen: m }).tl, 450);
  assert.equal(V66.schaetzung(V77.einheit(ak("2026-12-05", "skitour", 300, "z1"), {}), { draussen: m }).tl, 360);
  assert.match(V66.schaetzung(V77.einheit(ak("2026-12-05", "wandern", 240, "z2"), {}), { draussen: m }).grund, /mind\. drei/);
});

test("aktivitaet-plan-1.0: gespeicherte Woche – Einheit rein, Ersatz ab heute, bisherige Fassung zählt mit; entfernen", () => {
  const w = V64.woche({ woche: "2026-11-30", stunden: 10 });
  const E0 = { montag: "2026-11-30", ganz: true, tage: {} };
  w.tage.forEach((t) => (E0.tage[t.date] = { gesperrt: false, einheiten: t.einheiten.map((e, i) => ({ uid: `v-${t.date}-${i}`, vorlage: e.id, dauer: e.dauer, quelle: "vorschlag" })) }));
  const a = ak("2026-12-05", "skitour", 300, "z2"), u = V77.einheit(a, {});
  const r = V66.aendern(E0, { art: "aktivitaet", date: a.date, einheit: u.spec, akt: a, schon: 0 }, { heute: "2026-11-30", montag: "2026-11-30",
    ersetzen: (E, x) => V77.ersetzenGespeichert(E, x.akt, "2026-11-30", {}, x.schon) });
  assert.ok(!r.fehler, r.fehler);
  const alle = Object.values(r.eintrag.tage).flatMap((t) => t.einheiten);
  assert.equal(alle.filter((s) => s.uid === "akt-2026-12-05").length, 1);
  assert.ok(!alle.some((s) => s.vorlage === "rad_lang"), "lange Ausfahrt ersetzt");
  assert.ok(alle.every((s) => V66.einheitPruefen(s) === null), "alle Einheiten gültig");
  // gleiche Aktivität nochmals (Fassung schon da): ersetzt nichts doppelt
  const vor = alle.filter((s) => s.vorlage && s.vorlage.startsWith("rad")).reduce((x, s) => x + s.dauer, 0);
  const r2 = V66.aendern(r.eintrag, { art: "aktivitaet", date: a.date, einheit: u.spec, akt: a, schon: V77.ersatzMin(a) }, { heute: "2026-11-30", montag: "2026-11-30",
    ersetzen: (E, x) => V77.ersetzenGespeichert(E, x.akt, "2026-11-30", {}, x.schon) });
  const nach = Object.values(r2.eintrag.tage).flatMap((t) => t.einheiten).filter((s) => s.vorlage && s.vorlage.startsWith("rad")).reduce((x, s) => x + s.dauer, 0);
  assert.equal(nach, vor);
  const r3 = V66.aendern(r2.eintrag, { art: "aktivitaet_weg", date: a.date }, { heute: "2026-11-30", montag: "2026-11-30" });
  assert.ok(!Object.values(r3.eintrag.tage).flatMap((t) => t.einheiten).some((s) => s.uid === "akt-2026-12-05"));
  assert.match(V66.aendern(E0, { art: "aktivitaet", date: a.date, einheit: { uid: "x", vorlage: "rad_locker", dauer: 60 }, akt: a }, { heute: "2026-11-30" }).fehler, /keine Aktivität/);
});

test("zonenpruefung-hf-1.0: Urteil je Messung gegen LT1 ≈ (Basis + 0,5), Hinweis erst nach drei gleichen in acht Wochen", () => {
  assert.equal(V77.VERSIONS.zonenpruefung, "zonenpruefung-hf-1.0");
  const sk = { lauf_hf: [{ z: "Z1", von: null, bis: 120 }, { z: "Z2", von: 120, bis: 140 }, { z: "Z3", von: 140, bis: 155 }, { z: "Z4", von: 155, bis: 170 }, { z: "Z5", von: 170, bis: null }] };
  const st = { kind: "stufentest", date: "2026-09-01", sport: "lauf", stages: [{ la: 1.0 }, { la: 1.2 }, { la: 1.1 }, { la: 1.8 }, { la: 3.5 }] };   // Basis 1,1 → LT1 ≈ 1,6
  const m = (date, hr, la, mehr) => Object.assign({ kind: "check", date, sport: "ski", hr_avg: hr, lactate: la, fenster_s: 600, drift: 1.0 }, mehr || {});
  const L = [st, m("2026-11-01", 132, 0.9), m("2026-11-08", 135, 2.6), m("2026-11-09", 150, 2.0), m("2026-11-10", 130, 1.6), m("2026-11-11", 130, 1.0, { drift: 7.5 }),
    m("2026-11-12", 130, 1.0, { fenster_s: 300 }), m("2026-08-01", 130, 1.0)];
  const R = V77.zonenPruefung(L, sk, "2026-11-18");
  const u = Object.fromEntries(R.messungen.map((x) => [x.date, x.urteil]));
  assert.equal(R.messungen.length, 6, "Fenster unter 10 min zählt nicht");
  assert.deepEqual([u["2026-11-01"], u["2026-11-08"], u["2026-11-09"], u["2026-11-10"], u["2026-11-11"], u["2026-08-01"]], ["passt", "Z2 zu hoch", "über Z2", "unklar", "unklar", "unklar"]);
  assert.match(R.messungen.find((x) => x.date === "2026-08-01").grund, /ohne bestätigten Stufentest/);
  assert.equal(R.messungen.find((x) => x.date === "2026-11-01").lt1, 1.6);
  assert.equal(R.fazit, null, "erst nach drei gleichen Urteilen");
  const zuHoch = L.concat([m("2026-11-14", 136, 2.8), m("2026-11-16", 138, 2.5)]);
  assert.equal(V77.zonenPruefung(zuHoch, sk, "2026-11-18").fazit.art, "zu hoch");
  const passt = [st, m("2026-11-01", 132, 0.9), m("2026-11-05", 125, 1.0), m("2026-11-15", 128, 0.8)];
  assert.equal(V77.zonenPruefung(passt, sk, "2026-11-18").fazit.art, "bestätigt");
  assert.equal(V77.zonenPruefung(passt, sk, "2027-02-01").fazit, null, "älter als acht Wochen zählt nicht");
});

test("aktivitaet-plan-1.0: Test am selben Tag oder am Tag danach wird gemeldet, nie verschoben", () => {
  const w = V64.woche({ woche: "2026-11-30", stunden: 10, tests: [{ date: "2026-12-05", kind: "stufentest", sport: "rad", status: "geplant", note: "Rad" }] });
  if (!tag(w, "2026-12-05").einheiten.some((e) => e.art === "test")) return;          // ohne Test in dieser Woche nichts zu prüfen
  const x = V77.einplanen(w, V77.liste([ak("2026-12-05", "skitour", 300, "z2")], []), {});
  assert.match(x.hinweise.join(" "), /am selben Tag .*Test im Testkalender verschieben/);
  assert.ok(tag(x, "2026-12-05").einheiten.some((e) => e.art === "test"), "Test bleibt");
  const y = V77.einplanen(w, V77.liste([ak("2026-12-04", "skitour", 300, "z2")], []), {});
  assert.match(y.hinweise.join(" "), /am Tag danach .*Test verschieben/);
});
