// Abnahmetests V7.5 Etappe 3 (js/v75.js, js/schwimmen.js, js/v66.js): Planeinstellungen (planeinstellungen-1.0), Basis je Sportart (basis-1.1, Variante A),
// Steigerung (steigerung-1.0), Indoor-Phase (indoor-phase-1.0), Schwimm-Einheit mit Equipment, Stilen und Anfänger-Modus (schwimmeinheit-1.2), Bahnlänge
// je Einheit (einheit-felder-1.1), Stil je Schritt an Garmin (garmin-senden-1.2, V7.5.1). Alle Werte sind erfunden (keine persönlichen Werte im öffentlichen
// Repository).
// Aufruf: node --test tests/test_v75.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V75 = require("../js/v75.js");
const AN = require("../js/analyse.js");
const FK = require("../js/formkurve.js");
const SW = require("../js/schwimmen.js");

const RENNEN = [{ date: "2027-05-30", prio: "A", name: "Testrennen A", short: "A" }, { date: "2027-04-18", prio: "B", name: "Testrennen B", short: "B" }];
const S = AN.saison("2026-11-18", RENNEN);
const ist8 = (rad, lauf, schwimm) => new Map([["2026-11-09", { rad, lauf, schwimm }], ["2026-11-02", { rad, lauf, schwimm }]]);
const basis = (jetzt, a, E) => V75.basis({ jetzt, ist8: a || ist8(5, 3, 2) }, E || V75.standard());
/** Start je Sportart von Hand (für die Steigerung mit einem anderen Verhältnis als 20/50/30). */
const start = (schwimm, rad, lauf) => ({ schwimm: { h: schwimm }, rad: { h: rad }, lauf: { h: lauf }, summe: schwimm + rad + lauf });
const nah = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-9);

/* ---------------- Einstellungen ---------------- */
test("planeinstellungen-1.0: Standard wie bisher, Prüfung je Gruppe", () => {
  assert.equal(V75.VERSIONS.einstellungen, "planeinstellungen-1.0");
  const E = V75.standard();
  assert.equal(E.steigerung, 100); assert.deepEqual(E.indoor, { rad: null, lauf: null });
  assert.equal(E.start, "fitness", "Variante A (Silas' Wahl 17.11.2026)"); assert.deepEqual(E.basis, { schwimm: null, rad: null, lauf: null });
  assert.deepEqual(E.schwimm, { hilfsmittel: ["brett", "pullbuoy", "flossen", "paddles"], pool: null, stile: ["ruecken"], anfaenger: false, kurs_bis: null, kurs_nur: false });
  const ok = [{ id: "pe-steigerung", wert: 50 }, { id: "pe-steigerung", wert: 150 }, { id: "pe-indoor-rad", von: "2026-12-01", bis: "2027-02-28" },
    { id: "pe-indoor-lauf", von: null, bis: null }, { id: "pe-schwimm", hilfsmittel: [], pool: 25, stile: ["brust"] },
    { id: "pe-schwimm", hilfsmittel: ["brett"], pool: 50, stile: ["ruecken", "brust"], anfaenger: true }, { id: "pe-schwimm", hilfsmittel: [], pool: null, stile: [], anfaenger: false }];
  for (const e of ok) assert.equal(V75.pruefen(e), null, JSON.stringify(e));
  const falsch = [{ id: "pe-steigerung", wert: 45 }, { id: "pe-steigerung", wert: 102 }, { id: "pe-basis", rad: 3 },
    { id: "pe-indoor-rad", von: "2027-02-28", bis: "2026-12-01" }, { id: "pe-indoor-rad", von: "2026-01-01", bis: "2027-01-02" }, { id: "pe-indoor-lauf", von: "2026-12-01" },
    { id: "pe-schwimm", hilfsmittel: ["brett", "brett"], pool: 25, stile: [] }, { id: "pe-schwimm", hilfsmittel: [], pool: 40, stile: [] },
    { id: "pe-schwimm", hilfsmittel: [], pool: null, stile: ["kraul"] }, { id: "pe-schwimm", hilfsmittel: [], pool: null, stile: ["delfin"] },
    { id: "pe-schwimm", hilfsmittel: [], pool: null, stile: [], anfaenger: "ja" }, { id: "pe-x" }, null, { id: "pe-steigerung", wert: 100, geaendert: "gestern" }];
  for (const e of falsch) assert.ok(V75.pruefen(e), "abgelehnt: " + JSON.stringify(e));
  assert.equal(V75.pruefen({ id: "pe-basis", rad: 3 }), "unbekannte Einstellung", "V7.5: Stunden je Sportart gibt es nicht mehr");
});

test("planeinstellungen-1.0: Daten und Gerät zusammengeführt (neuere Fassung je ID), für vergangene Wochen nur vor ihrem Montag Gespeichertes", () => {
  const D = [V75.eintrag("pe-steigerung", { wert: 120 }, "2026-11-10T08:00:00Z"), V75.eintrag("pe-indoor-rad", { von: "2026-12-01", bis: "2027-02-28" }, "2026-11-20T08:00:00Z")];
  const G = [V75.eintrag("pe-steigerung", { wert: 135 }, "2026-11-18T08:00:00Z"), V75.eintrag("pe-steigerung", { wert: 160 }, "2026-11-19T08:00:00Z")];  // ungültig: zählt nicht
  const E = V75.einstellungen(D, G);
  assert.equal(E.steigerung, 135); assert.deepEqual(E.indoor.rad, { von: "2026-12-01", bis: "2027-02-28" });
  const alt = V75.einstellungen(D, G, { bis: "2026-11-16" });
  assert.equal(alt.steigerung, 120, "Woche ab 16.11.: nur vor dem Montag gespeichert"); assert.equal(alt.indoor.rad, null);
  assert.equal(V75.einstellungen([V75.eintrag("pe-indoor-lauf", { von: null, bis: null })], []).indoor.lauf, null, "keine Phase");
});

/* ---------------- Basis je Sportart ---------------- */
test("basis-1.1: Variante A – Start je Sportart = 7 × Fitness ÷ Last pro Stunde, eigener Wert ersetzt, ohne Last pro Stunde «jetzt» × Anteil, wahlweise 20/50/30", () => {
  assert.equal(V75.VERSIONS.basis, "basis-1.1");
  const D = { stand: "2026-11-16", schwimm: { fitness: 10, tl_h: 50 }, rad: { fitness: 42, tl_h: 60 }, lauf: { fitness: 30, tl_h: 70 } };
  const b = V75.basis({ jetzt: 8 }, V75.standard(), null, D);
  assert.equal(b.quelle, "fitness"); assert.equal(b.stand, "2026-11-16");
  assert.ok(nah(b.schwimm.h, 1.4) && nah(b.rad.h, 4.9) && nah(b.lauf.h, 3), JSON.stringify(b));
  assert.ok(nah(b.summe, 9.3)); for (const s of ["schwimm", "rad", "lauf"]) assert.equal(b[s].quelle, "fitness");
  const E = V75.standard(); E.basis.lauf = 40;
  const c = V75.basis({ jetzt: 8 }, E, null, D);
  assert.ok(nah(c.lauf.h, 4)); assert.equal(c.lauf.eigen, 40); assert.equal(c.lauf.fitness, 40); assert.equal(c.lauf.fitness_ber, 30); assert.ok(nah(c.rad.h, 4.9), "andere Sportarten unverändert");
  const d2 = JSON.parse(JSON.stringify(D)); d2.schwimm.tl_h = null;
  const e = V75.basis({ jetzt: 10 }, V75.standard(), null, d2);
  assert.equal(e.schwimm.quelle, "aufteilung"); assert.ok(nah(e.schwimm.h, 2), "ohne Last pro Stunde «jetzt» × 20 %"); assert.equal(e.quelle, "fitness");
  const A = V75.standard(); A.start = "aufteilung"; A.basis.rad = 99;
  const f = V75.basis({ jetzt: 10 }, A, null, D);
  assert.equal(f.quelle, "aufteilung"); assert.ok(nah(f.schwimm.h, 2) && nah(f.rad.h, 5) && nah(f.lauf.h, 3), "20/50/30 wie bis V7.5.1, eigene Fitness ohne Wirkung");
  const g = V75.basis({ jetzt: 8 }, V75.standard(), null, { rad: { fitness: 200, tl_h: 10 }, schwimm: {}, lauf: {} });
  assert.equal(g.rad.h, 30, "höchstens 30 h je Sportart"); assert.equal(g.schwimm.quelle, "aufteilung");
  assert.equal(V75.basis({ jetzt: 10 }, V75.standard(), null, null).quelle, "aufteilung", "ohne Grundlagen wie bisher");
  const x = V75.basis({ jetzt: 8 }, A, { schwimm: 0.1, rad: 0.6, lauf: 0.3 }, D);
  assert.ok(nah(x.schwimm.h, 0.8) && nah(x.rad.h, 4.8) && nah(x.lauf.h, 2.4), "mit übergebener Aufteilung");
});

test("basis-1.1: Grundlagen am Montag – Fitness bis zum Sonntag, Last pro Stunde der 8 Wochen (sonst 52), der Montag selbst zählt nicht", () => {
  const acts = [];
  for (let i = 0; i < 84; i++) acts.push({ date: FK.addDays("2026-08-24", i), sport: "rad", mv: 3600, tss: 60 });
  acts.push({ date: "2026-11-16", sport: "rad", mv: 7200, tss: 500 });                  // Montag: zählt noch nicht
  acts.push({ date: "2026-07-01", sport: "lauf", dur: 7200, tss: 140 });                 // nur in den 52 Wochen
  const D = V75.basisDaten(acts, "2026-11-16");
  assert.equal(D.stand, "2026-11-16");
  assert.deepEqual([D.rad.tl_h, D.rad.wochen, D.rad.h], [60, 8, 56]);
  assert.deepEqual([D.lauf.tl_h, D.lauf.wochen, D.lauf.h], [70, 52, 2]);
  assert.equal(D.schwimm.tl_h, null); assert.equal(D.schwimm.fitness, null);
  assert.equal(D.rad.fitness, V75.fitness(acts, "2026-11-16").rad); assert.ok(D.rad.fitness > 50 && D.rad.fitness < 55, String(D.rad.fitness));
  const b = V75.basis({ jetzt: 8 }, V75.standard(), null, D);
  assert.ok(nah(b.rad.h, (7 * D.rad.fitness) / 60)); assert.equal(b.schwimm.quelle, "aufteilung");
});

test("basis-1.1: Start und eigene Basis-Fitness gelten ab der Woche nach dem Speichern; Standard «Basis-Fitness» ab 23.11.2026", () => {
  const L = [{ id: "pe-start", art: "aufteilung", geaendert: "2026-11-25T09:00:00Z" }, { id: "pe-basis-lauf", wert: 32, geaendert: "2026-11-18T09:00:00Z" },
    { id: "pe-steigerung", wert: 120, geaendert: "2026-11-25T09:00:00Z" }];
  const fuer = (mo) => V75.einstellungen(L, [], { startBis: mo, montag: mo });
  assert.equal(fuer("2026-11-16").start, "aufteilung", "Wochen vor dem 23.11. wie bisher");
  assert.equal(fuer("2026-11-16").basis.lauf, null, "am 18.11. gespeichert: zählt noch nicht für die Woche vom 16.11.");
  assert.equal(fuer("2026-11-23").start, "fitness"); assert.equal(fuer("2026-11-23").basis.lauf, 32);
  assert.equal(fuer("2026-11-23").steigerung, 120, "die Steigerung gilt sofort – die laufende Woche bleibt ohnehin beim Start");
  assert.equal(fuer("2026-11-30").start, "aufteilung");
  assert.equal(V75.einstellungen(L, []).start, "aufteilung", "ohne Filter: der neueste Stand");
  assert.equal(V75.einstellungen(L, [], { bis: "2026-11-23", montag: "2026-11-23" }).basis.lauf, 32, "vergangene Wochen wie V64.stand");
  for (const e of [{ id: "pe-start", art: "fitness" }, { id: "pe-basis-rad", wert: 0 }, { id: "pe-basis-schwimm", wert: 200 }, { id: "pe-basis-lauf", wert: null }, { id: "pe-basis-lauf" }])
    assert.equal(V75.pruefen(e), null, JSON.stringify(e));
  for (const e of [{ id: "pe-start", art: "frei" }, { id: "pe-start" }, { id: "pe-basis-rad", wert: 201 }, { id: "pe-basis-rad", wert: 2.5 }, { id: "pe-basis-rad", wert: "30" }, { id: "pe-basis", rad: 3 }])
    assert.ok(V75.pruefen(e), JSON.stringify(e));
});

test("basis-1.1: Fitness je Sportart wie pmc-2.0 (42 Tage), Stand am Ende des Vortags, ohne Einheit der Sportart offen", () => {
  const acts = [];
  for (let i = 0; i < 90; i++) {
    const d = FK.addDays("2026-08-01", i);
    if (i % 2 === 0) acts.push({ date: d, sport: "rad", tss: 60 });
    if (i % 3 === 0) acts.push({ date: d, sport: "lauf", tss: 45 });
  }
  acts.push({ date: "2026-10-30", sport: "rad", tss: 500 });   // «heute»: zählt noch nicht
  const f = V75.fitness(acts, "2026-10-30");
  const ref = (sport) => { const L = new Map(); for (const a of acts) if (a.sport === sport && a.date < "2026-10-30") L.set(a.date, (L.get(a.date) || 0) + a.tss);
    const P = FK.pmc(L, "2026-08-01", "2026-10-29"); return Math.round(P[P.length - 1].ctl * 10) / 10; };
  assert.equal(f.rad, ref("rad")); assert.equal(f.lauf, ref("lauf")); assert.equal(f.schwimm, null); assert.equal(f.bis, "2026-10-29");
});

/* ---------------- Steigerung ---------------- */
test("steigerung-1.0: 100 % mit der Standard-Aufteilung ergibt genau die Stunden von saison-1.2; die laufende Woche bleibt beim Start", () => {
  assert.equal(V75.VERSIONS.steigerung, "steigerung-1.0");
  const b = basis(8, ist8(4, 2.4, 1.6)), R = V75.rampe(S.wochen, b, 13, 100);
  assert.deepEqual(R.map((r) => r.summe), AN.saisonStunden(S.wochen, 8, 13));
  for (const st of [50, 100, 150]) assert.ok(nah(V75.rampe(S.wochen, b, 13, st)[0].roh.summe, 8), "Woche 0 = Start bei " + st + " %");
  for (const r of R) assert.ok(nah(r.aufteilung.schwimm + r.aufteilung.rad + r.aufteilung.lauf, 1, 1e-9));
});

test("steigerung-1.0: mehr = früher an der Spitze und dort bis zum Taper, weniger = unter der Spitze; jede Sportart zu ihrem Anteil", () => {
  const b = start(1, 5, 2), L = (st) => V75.rampe(S.wochen, b, 13, st).filter((r) => r.phase !== "Taper");
  const a = L(100), h = L(150), l = L(50), n = a.length;
  assert.ok(nah(a[n - 1].roh.summe, 13, 1e-6), "100 %: Spitze in der Woche vor dem Taper");
  const i150 = h.findIndex((r) => r.roh.summe >= 13 - 1e-6);
  assert.ok(i150 > 0 && i150 < n - 1 && h.slice(i150).every((r) => nah(r.roh.summe, 13, 1e-6)), "150 %: früher an der Spitze, dann gleich");
  assert.ok(nah(l[n - 1].roh.summe, 8 + (13 - 8) * 0.5, 1e-6), "50 %: die Hälfte des Wegs");
  for (let i = 1; i < n; i++) assert.ok(h[i].roh.summe >= a[i].roh.summe - 1e-9 && a[i].roh.summe >= l[i].roh.summe - 1e-9, "Woche " + i);
  const s = a[n - 1].roh;   // an der Spitze: Aufteilung 20/50/30, egal wie der Start verteilt war
  assert.ok(nah(s.schwimm, 13 * 0.2, 1e-6) && nah(s.rad, 13 * 0.5, 1e-6) && nah(s.lauf, 13 * 0.3, 1e-6), JSON.stringify(s));
  const v = V75.verlauf(V75.rampe(S.wochen, b, 13, 150), 13);
  assert.equal(v.spitzeNr, i150); assert.equal(v.gedeckelt, 0);
  assert.equal(V75.verlauf(V75.rampe(S.wochen, b, 13, 50), 13).spitzeAb, null);
});

test("steigerung-1.0: höchstens 10 % (mindestens eine halbe Stunde) über der Woche davor; Erholung, B-Rennen und Taper wie bisher", () => {
  const S2 = AN.saison("2026-11-18", [{ date: "2027-01-24", prio: "A", name: "kurz" }]), b = basis(8, ist8(4, 2.4, 1.6));
  const R = V75.rampe(S2.wochen, b, 16, 150);
  const last = R.filter((r) => r.phase !== "Taper");
  for (let i = 1; i < last.length; i++) assert.ok(last[i].roh.summe <= last[i - 1].roh.summe * 1.1 + 1e-9, "Woche " + i + ": " + last[i].roh.summe);
  assert.ok(last.some((r) => r.gedeckelt));
  const klein = V75.rampe(S2.wochen, basis(2, ist8(1, 0.6, 0.4)), 16, 150).filter((r) => r.phase !== "Taper");
  assert.ok(nah(klein[1].roh.summe, 2.5, 1e-9), "bei wenig Stunden: eine halbe Stunde mehr");
  const W = [{ woche: "a", phase: "Grundlage" }, { woche: "b", phase: "Aufbau", erholung: true }, { woche: "c", phase: "B-Rennen (Mini-Taper)" }, { woche: "d", phase: "Wettkampfspezifisch" },
    { woche: "e", phase: "Taper" }, { woche: "f", phase: "Taper" }];
  const X = V75.rampe(W, start(2, 5, 3), 12, 100);
  assert.ok(nah(X[1].schwimm + X[1].rad + X[1].lauf, X[1].roh.summe * 0.65, 1e-9) && nah(X[2].schwimm + X[2].rad + X[2].lauf, X[2].roh.summe * 0.5, 1e-9));
  assert.deepEqual([X[4].summe, X[5].summe], [7, 5], "Taper 60 und 40 % der Spitze (auf halbe Stunden)");
});

test("steigerung-1.0: die Woche nach Modell verteilt die Stunden je Sportart wie übergeben", () => {
  const w = V64.woche({ woche: "2026-11-16", phase: "Grundlage", stunden: 10, aufteilung: { schwimm: 0.1, rad: 0.6, lauf: 0.3 }, modell: "polarisiert" });
  const w0 = V64.woche({ woche: "2026-11-16", phase: "Grundlage", stunden: 10, modell: "polarisiert" });
  assert.deepEqual(w.aufteilung, { schwimm: 0.1, rad: 0.6, lauf: 0.3 }); assert.deepEqual(w0.aufteilung, V64.AUFTEILUNG);
  assert.ok(w.minuten.rad > w0.minuten.rad && w.minuten.schwimm <= w0.minuten.schwimm, JSON.stringify([w.minuten, w0.minuten]));
  assert.match(w.regel, /basis-1\.1, steigerung-1\.0/); assert.doesNotMatch(w0.regel, /steigerung/);
});

/* ---------------- Indoor-Phase und Felder je Einheit ---------------- */
test("indoor-phase-1.0: Rad und Laufen in der Phase drinnen, ausser ausdrücklich gewählt; Bibliothek und andere Sportarten bleiben", () => {
  assert.equal(V75.VERSIONS.indoor, "indoor-phase-1.0");
  const w = V66.meinPlan(V64.woche({ woche: "2026-11-16", phase: "Grundlage", stunden: 9, modell: "polarisiert" }), null, {});
  const E = V75.standard(); E.indoor.rad = { von: "2026-11-18", bis: "2026-11-21" };
  const x = V75.indoorAnwenden(w, E);
  assert.notEqual(x, w);
  for (const t of x.tage) for (const e of t.einheiten) {
    const soll = e.sport === "rad" && t.date >= "2026-11-18" && t.date <= "2026-11-21";
    assert.equal(!!e.drinnen, soll, `${t.date} ${e.titel}`);
    if (soll) assert.match(e.titel, /\(drinnen\)$/);
  }
  assert.equal(V75.indoorAnwenden(w, V75.standard()), w, "ohne Phase dieselbe Woche");
  // ausdrücklich draussen (drinnen: false) bleibt draussen; Bibliothek bleibt
  const fest = V66.einheit({ uid: "u1", vorlage: "rad_locker", dauer: 60, quelle: "eigen", drinnen: false }, {});
  const bib = V66.einheit({ uid: "u2", quelle: "bibliothek", wid: 1000000011, sport: "rad", titel: "Beispiel", dauer: 60 }, {});
  const y = V75.indoorAnwenden({ tage: [{ date: "2026-11-19", einheiten: [fest, bib] }] }, E);
  assert.equal(fest.drinnen_fest, true); assert.equal(y.tage[0].einheiten[0].drinnen, false); assert.equal(y.tage[0].einheiten[1].drinnen, false);
  assert.equal(V75.drinnenFeld(E, "rad", "2026-11-19", false), false, "in der Phase: draussen ausdrücklich");
  assert.equal(V75.drinnenFeld(E, "rad", "2026-11-19", true), null, "in der Phase: drinnen folgt der Phase");
  assert.equal(V75.drinnenFeld(E, "rad", "2026-11-25", true), true); assert.equal(V75.drinnenFeld(E, "rad", "2026-11-25", false), null);
});

test("einheit-felder-1.1: Bahnlänge je Schwimm-Einheit, drinnen = false bleibt gespeichert", () => {
  assert.equal(V66.VERSIONS.felder, "einheit-felder-1.1");
  assert.equal(V66.feldPruefen("pool", 50), null); assert.ok(V66.feldPruefen("pool", 33)); assert.ok(V66.feldPruefen("pool", "50"));
  const mo = "2026-11-16", heute = "2026-11-17";
  const vorschlag = (d) => (d === "2026-11-19" ? [V64.einheit("schwimm_locker", { d: 45 }), V64.einheit("rad_locker", { d: 60 })] : []);
  const ctx = { heute, montag: mo, vorschlag, jetzt: "2026-11-17T08:00:00Z" };
  const a = V66.aendern(null, { art: "einheit", date: "2026-11-19", uid: "v-2026-11-19-0", felder: { pool: 25 } }, ctx);
  assert.equal(a.fehler, undefined); assert.equal(a.eintrag.tage["2026-11-19"].einheiten[0].pool, 25);
  assert.equal(V66.einheit(a.eintrag.tage["2026-11-19"].einheiten[0], {}).pool, 25);
  assert.equal(V66.aendern(null, { art: "einheit", date: "2026-11-19", uid: "v-2026-11-19-1", felder: { pool: 25 } }, ctx).fehler, "Bahnlänge nur beim Schwimmen");
  const b = V66.aendern(null, { art: "einheit", date: "2026-11-19", uid: "v-2026-11-19-1", felder: { drinnen: false } }, ctx);
  assert.equal(b.eintrag.tage["2026-11-19"].einheiten[1].drinnen, false);
  const c = V66.aendern(b.eintrag, { art: "einheit", date: "2026-11-19", uid: "v-2026-11-19-1", felder: { drinnen: null } }, ctx);
  assert.ok(!("drinnen" in c.eintrag.tage["2026-11-19"].einheiten[1]), "null entfernt das Feld wieder");
  assert.equal(V66.einheitPruefen({ uid: "x", vorlage: "schwimm_locker", dauer: 45, quelle: "eigen", pool: 40 }), "Bahnlänge 25 oder 50 m");
});

/* ---------------- Schwimm-Einheit ---------------- */
test("schwimmeinheit-1.2: Technikübungen immer direkt nach dem Einschwimmen – jede Art, Dauer, Bahnlänge und Ausrüstung", () => {
  assert.equal(SW.VERSIONS.einheit, "schwimmeinheit-1.2");
  const H = [undefined, [], ["flossen"], ["brett"], ["pullbuoy", "paddles"], ["brett", "pullbuoy", "flossen", "paddles"]];
  for (const art of ["locker", "css"]) for (const min of [20, 30, 45, 60, 90]) for (const pool of [25, 50]) for (const h of H) for (let w = 1; w <= 10; w++) {
    const e = SW.einheit(art, { min, pool, ref_s: 150, css_s: w % 2 ? 105 : null, woche: w, hilfsmittel: h, stile: w % 3 ? ["brust"] : [] });
    const ids = e.bloecke.map((b) => b.id);
    assert.deepEqual(ids.slice(0, 2), ["ein", "technik"], `${art} ${min} ${pool} ${JSON.stringify(h)}`);
    assert.equal(e.bloecke[1].teile.length, 3, "drei Übungen");
    assert.equal(ids[ids.length - 1], "aus");
  }
  assert.deepEqual(SW.einheit("test", { min: 45, pool: 25 }).bloecke.map((b) => b.id), ["ein", "haupt", "aus"], "CSS-Test ohne Übungen");
});

test("schwimmeinheit-1.2: nur Übungen mit vorhandenen Hilfsmitteln; ohne Brett Beine in Seitlage mit Flossen, ohne beides keine; ohne Pullbuoy kein Pull", () => {
  for (let w = 1; w <= 30; w++) for (const h of [[], ["flossen"], ["brett"], ["pullbuoy"]]) {
    const e = SW.einheit("locker", { min: 70, pool: 25, ref_s: 150, woche: w, hilfsmittel: h });
    for (const b of e.bloecke) for (const t of b.teile) {
      for (const x of t.hilfsmittel || []) assert.ok(h.includes(x), `${x} fehlt: ${t.text}`);
      for (const x of t.frei || []) assert.ok(h.includes(x), `${x} freiwillig, fehlt: ${t.text}`);
    }
    const beine = e.bloecke.find((b) => b.id === "beine");
    if (h.includes("brett")) assert.equal(beine.teile[0].uebung, "beine_brett");
    else if (h.includes("flossen")) assert.equal(beine.teile[0].uebung, "beine_seitlage");
    else assert.equal(beine, undefined);
    assert.equal(e.bloecke.some((b) => b.id === "pull"), h.includes("pullbuoy"));
    if (beine) assert.ok(!e.bloecke[1].teile.some((t) => t.uebung === beine.teile[0].uebung), "Übung des Beine-Blocks nicht doppelt");
    assert.deepEqual(e.ohne_hilfsmittel, ["brett", "pullbuoy", "flossen", "paddles"].filter((x) => !h.includes(x)));
  }
  const ohne = SW.einheit("locker", { min: 70, pool: 25, ref_s: 150, woche: 3, hilfsmittel: [] }), alle = SW.einheit("locker", { min: 70, pool: 25, ref_s: 150, woche: 3 });
  assert.ok(Math.abs(ohne.dauer_s - alle.dauer_s) <= 0.15 * 70 * 60, "die Zeit geht in die Hauptserie");
  assert.ok(ohne.bloecke.find((b) => b.id === "haupt").teile[0].wdh >= alle.bloecke.find((b) => b.id === "haupt").teile[0].wdh);
});

test("schwimmeinheit-1.2: Stil der Woche als eigener Teil am Ende des Ein- und Ausschwimmens (ganze Bahnen), alles andere Kraul; Standard Rücken", () => {
  assert.equal(SW.stileText([]), "Kraul"); assert.equal(SW.stileText(["brust"]), "Kraul und Brust"); assert.equal(SW.stileText(["ruecken", "brust"]), "Kraul, Rücken und Brust");
  assert.deepEqual(Object.keys(SW.STILE), ["ruecken", "brust"], "Delfin plant die Seite nicht");
  const E = (o) => SW.einheit("locker", Object.assign({ min: 45, pool: 25, ref_s: 150, woche: 2 }, o));
  const teile = (e, id) => e.bloecke.find((b) => b.id === id).teile;
  const stile = (e, id) => teile(e, id).map((t) => t.stil);
  assert.deepEqual(stile(E({}), "ein"), ["kraul", "ruecken"]); assert.deepEqual(stile(E({}), "aus"), ["kraul", "ruecken"]);
  assert.deepEqual(stile(E({ stile: ["brust"] }), "ein"), ["kraul", "brust"]); assert.match(teile(E({ stile: ["brust"] }), "aus")[1].text, /Brust/);
  assert.deepEqual(stile(E({ stile: [] }), "ein"), ["kraul"]); assert.deepEqual(stile(E({ stile: [] }), "aus"), ["kraul"]);
  assert.equal(E({ stile: ["ruecken", "brust"], woche: 2 }).stil, "ruecken"); assert.equal(E({ stile: ["ruecken", "brust"], woche: 3 }).stil, "brust", "abwechselnd je Woche");
  for (const pool of [25, 50]) for (const min of [30, 45, 60, 90]) for (const st of [[], ["ruecken"], ["brust"]]) {
    const e = SW.einheit("locker", { min, pool, ref_s: 150, woche: 5, stile: st }), ohne = SW.einheit("locker", { min, pool, ref_s: 150, woche: 5, stile: [] });
    for (const id of ["ein", "aus"]) {
      const sum = (x) => teile(x, id).reduce((s, t) => s + t.m * t.wdh, 0);
      assert.equal(sum(e, id), sum(ohne, id), `${id}: gleich viele Meter wie nur Kraul (${pool} m, ${min} min)`);
      for (const t of teile(e, id)) assert.equal(t.m % pool, 0, "ganze Bahnen");
    }
    for (const b of e.bloecke.filter((x) => x.id !== "ein" && x.id !== "aus")) for (const t of b.teile) {
      assert.equal(t.stil, "kraul", `${b.id}: Kraul`); assert.doesNotMatch(t.text, /Brust|Rücken/);
    }
  }
});

test("schwimmeinheit-1.2: Anfänger-Modus – nur einfache Übungen mit längerer Pause, kürzere Wiederholungen, Übungen weiter direkt nach dem Einschwimmen", () => {
  for (let w = 1; w <= 20; w++) for (const art of ["locker", "css"]) for (const min of [30, 45, 70]) {
    const a = SW.einheit(art, { min, pool: 25, ref_s: 150, css_s: art === "css" ? 105 : null, woche: w, anfaenger: true });
    const n = SW.einheit(art, { min, pool: 25, ref_s: 150, css_s: art === "css" ? 105 : null, woche: w });
    assert.equal(a.anfaenger, true); assert.equal(n.anfaenger, false);
    assert.deepEqual(a.bloecke.slice(0, 2).map((b) => b.id), ["ein", "technik"]);
    const tech = a.bloecke[1].teile;
    assert.equal(tech.length, 3, "drei Übungen");
    for (const t of tech) { assert.ok(!SW.ANSPRUCHSVOLL.includes(t.uebung), t.uebung); assert.equal(t.pause_s, 15); }
    const h = a.bloecke.find((b) => b.id === "haupt").teile[0];
    if (art === "css") assert.deepEqual([h.m, h.pause_s], [50, 30]); else assert.deepEqual([h.m, h.pause_s], [100, 45]);
    for (const b of a.bloecke.filter((x) => x.id === "beine" || x.id === "steig")) assert.equal(b.teile[0].m, 25);
    const p = a.bloecke.find((b) => b.id === "pull"); if (p) assert.deepEqual([p.teile[0].m, p.teile[0].pause_s], [50, 30]);
    assert.ok(Math.abs(a.dauer_s - n.dauer_s) <= 0.2 * min * 60, `etwa gleich lang (${a.dauer_s} / ${n.dauer_s} s)`);
  }
});

test("garmin-senden-1.2: Stil je Schritt wie in der Einheit – Rücken backstroke, Brust breaststroke (wie Enduco), sonst free; ganzes Einschwimmen warmup", () => {
  assert.equal(V66.VERSIONS.garmin, "garmin-senden-1.2");
  const flach = (L) => L.flatMap((s) => (s.type === "RepeatGroupDTO" ? flach(s.workoutSteps) : [s]));
  for (const [st, key, id, wort] of [[["ruecken"], "backstroke", 2, "Rücken"], [["brust"], "breaststroke", 3, "Brust"]]) {
    const S = SW.einheit("locker", { min: 45, pool: 50, ref_s: 150, woche: 4, stile: st }), g = V66.garminSchwimm(S, "rpe");
    assert.ok(!g.fehler, g.fehler);
    const F = flach(g.steps).filter((s) => s.stepType.stepTypeKey !== "rest");
    const mit = F.filter((s) => s.strokeType.strokeTypeKey === key);
    assert.equal(mit.length, 2, "je ein Teil im Ein- und im Ausschwimmen");
    for (const s of mit) { assert.equal(s.strokeType.strokeTypeId, id); assert.match(s.description, new RegExp(`(Einschwimmen|Ausschwimmen) ${wort}`)); }
    for (const s of F.filter((x) => !mit.includes(x))) assert.deepEqual(s.strokeType, { strokeTypeId: 6, strokeTypeKey: "free" }, s.description);
    const ein = F.filter((s) => /Einschwimmen/.test(s.description));
    assert.equal(ein.length, 2); for (const s of ein) assert.equal(s.stepType.stepTypeKey, "warmup");
  }
});

/* ---------------- V7.6.2 kurs-1.0: Schwimmkurs mit letztem Kurstag, an Kurstagen nur Schwimmen ---------------- */
test("kurs-1.0: letzter Kurstag und «nur Schwimmen» prüfen und übernehmen", () => {
  const ok = { id: "pe-schwimm", hilfsmittel: ["brett"], pool: 50, stile: ["brust"], anfaenger: false };
  assert.equal(V75.pruefen(Object.assign({}, ok, { kurs_bis: "2026-12-15", kurs_nur: true })), null);
  assert.equal(V75.pruefen(Object.assign({}, ok, { kurs_bis: null, kurs_nur: false })), null);
  assert.match(V75.pruefen(Object.assign({}, ok, { kurs_bis: "15.12.2026" })), /letzter Kurstag/);
  assert.match(V75.pruefen(Object.assign({}, ok, { kurs_nur: "ja" })), /nur Schwimmen/);
  const E = V75.einstellungen([V75.eintrag("pe-schwimm", Object.assign({}, ok, { kurs_bis: "2026-12-15", kurs_nur: true }), "2026-11-17T10:00:00Z")], []);
  assert.deepEqual([E.schwimm.kurs_bis, E.schwimm.kurs_nur], ["2026-12-15", true]);
  assert.deepEqual([V75.standard().schwimm.kurs_bis, V75.standard().schwimm.kurs_nur], [null, false], "Standard: Kurs ohne Ende, Dienstag normal");
});

test("kurs-1.0: nach dem letzten Kurstag lockeres Schwimmen statt Kurs; an Kurstagen nur Schwimmen (Zeit des Tages bleibt, «Kein Training» geht vor)", () => {
  const vor = V64.woche({ woche: "2026-12-14", stunden: 9, kurs_bis: "2026-12-15" }), nach = V64.woche({ woche: "2026-12-21", stunden: 9, kurs_bis: "2026-12-15" });
  assert.ok(vor.tage[1].einheiten.some((e) => e.id === "schwimm_kurs"));
  assert.ok(!nach.tage[1].einheiten.some((e) => e.id === "schwimm_kurs") && nach.tage[1].einheiten.some((e) => e.id === "schwimm_locker"));
  assert.ok(V64.woche({ woche: "2027-03-01", stunden: 9 }).tage[1].einheiten.some((e) => e.id === "schwimm_kurs"), "ohne Datum läuft der Kurs weiter");
  const vf = V66.verfuegbarkeit([V66.vfEintrag({ wt: 2 }, { min: 165, sport: null }, "2026-11-17T10:00:00Z"), V66.vfEintrag({ date: "2026-12-08" }, { min: 0, sport: [] }, "2026-11-17T10:00:00Z")]);
  const k = V66.mitKurs(vf, { nur: true, bis: "2026-12-15" });
  assert.deepEqual([k("2026-12-01").min, k("2026-12-01").sport, k("2026-12-01").kurs], [165, ["schwimm"], true]);
  assert.equal(V66.vfText(k("2026-12-01")), "2:45 h · Schwimmen (Schwimmkurs)");
  assert.equal(k("2026-12-08").min, 0, "kein Training geht vor");
  assert.deepEqual(k("2026-12-22").sport, null, "nach dem Kurs wieder alle Sportarten");
  assert.equal(k("2026-12-02"), null, "nur dienstags (Mittwoch ohne Eintrag bleibt offen)");
  assert.equal(V66.mitKurs(vf, { nur: false, bis: null }), vf, "ausgeschaltet: unverändert");
  // in der Verteilung: Rad und Laufen ziehen vom Kurstag weg
  const w = V64.woche({ woche: "2026-11-30", stunden: 9, kurs_bis: "2026-12-15" }), r = V66.wocheVerteilt(w, k, {});
  assert.ok(r.tage[1].einheiten.every((e) => e.sport === "schwimm"), r.tage[1].einheiten.map((e) => e.id).join(","));
});
