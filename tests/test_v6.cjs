// Abnahmetests V6.0 (js/v6.js, Workout lesen workout-1.1 in js/training-route.js) – nur erfundene Werte mit bekanntem Ergebnis.
// Aufruf: node --test tests/test_v6.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = undefined;
const FK = require("../js/formkurve.js");
const RT = require("../js/route.js");
const TR = require("../js/training-route.js");
const V6 = require("../js/v6.js");

// Erfundenes Zonenprofil (keine persönlichen Werte): Watt aufsteigend, Pace in s/km absteigend (langsam → schnell).
const ZONEN = [{ status: "aktiv", name: "Testzonen", skalen: [
  { key: "rad_w", zonen: [{ z: "Z1", von: null, bis: 150 }, { z: "Z2", von: 150, bis: 200, text: "FatMax 180–195" }, { z: "Z3", von: 200, bis: 240, text: "SweetSpot ca. 228–240" },
    { z: "Z4", von: 240, bis: 270 }, { z: "Z5", von: 270, bis: null, text: "VO2max ca. 280–320" }] },
  { key: "lauf_pace", zonen: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 340, text: "FatMax 5:45–6:00" }, { z: "Z3", von: 340, bis: 310 },
    { z: "Z4", von: 310, bis: 290 }, { z: "Z5", von: 290, bis: null }] }] }];
const Z = TR.zonen(ZONEN);
const pz = (s, lo, hi, type) => ({ type: type || "interval", end_condition: "time", end_condition_value: s, target_type: "power.zone", target_value_low: lo, target_value_high: hi });
const rep = (n, steps) => ({ type: "repeat", end_condition: "iterations", end_condition_value: n, repeat_count: n, steps });
const sw = (m, type, text) => ({ type: type || "other", end_condition: "distance", end_condition_value: m, description: text });
const pause = (s) => ({ type: "rest", end_condition: "fixed.rest", end_condition_value: s, description: `Break: ${s}s` });

test("Zone eines Zielwerts: Watt aufsteigend mit Unterzonen, offene Ränder, Pace absteigend", () => {
  const w = Z.skalen.rad_w;
  assert.equal(V6.zoneVon(120, w, "watt").key, "z1");
  assert.equal(V6.zoneVon(170, w, "watt").key, "z2");
  assert.equal(V6.zoneVon(187.5, w, "watt").key, "fatmax");
  assert.equal(V6.zoneVon(234, w, "watt").key, "sweet");
  assert.equal(V6.zoneVon(255, w, "watt").key, "z4");
  assert.equal(V6.zoneVon(300, w, "watt").key, "vo2");
  assert.equal(V6.zoneVon(450, w, "watt").key, "z5", "über dem VO2max-Bereich bleibt Z5 – kein Raten von Anaerob oder Neuro");
  const p = V6.zoneVon(185, w, "watt").pos;
  assert.ok(p > 1 && p < 2, "Lage innerhalb Z2: " + p);
  assert.ok(V6.zoneVon(240, w, "watt").pos >= 3, "Grenze gehört zur oberen Zone");
  const pace = Z.skalen.lauf_pace;
  assert.equal(V6.zoneVon(400, pace, "pace").key, "z1", "langsamer als Z1-Grenze");
  assert.equal(V6.zoneVon(352, pace, "pace").key, "fatmax", "5:52 /km liegt im FatMax-Bereich 5:45–6:00");
  assert.equal(V6.zoneVon(325, pace, "pace").key, "z3");
  assert.equal(V6.zoneVon(270, pace, "pace").key, "z5");
  assert.equal(V6.zoneVon(200, null, "watt"), null, "ohne Skala keine Zone");
});

test("Schwimmen: Intensität aus dem Feld der Beschreibung, Name ohne Bahnen, Pace und Abschluss", () => {
  assert.equal(V6.schwimmZone("Warm Up | Recovery | 02:50min/100m"), "z1");
  assert.equal(V6.schwimmZone("2Lanes | Technik Abschlag | Endurance | 02:40min/100m | Finish Lane: Recovery"), "z2");
  assert.equal(V6.schwimmZone("1Lane | Kurze Tempo Serie | Threshold | 02:05min/100m"), "z4", "das Intensitätsfeld zählt, nicht ein Wort im Namen");
  assert.equal(V6.schwimmZone("2Lanes | Lange Serie | VO2Max | 01:58min/100m"), "vo2");
  assert.equal(V6.schwimmZone("Break: 20s"), null);
  assert.equal(V6.schrittName("½Lanes | Technik Abschlag | Endurance | 02:40min/100m | Finish Lane: Recovery"), "Technik Abschlag");
  assert.equal(V6.schrittName("Warm Up | Recovery | 02:50min/100m"), null);
  assert.equal(V6.schrittName("Pause: 15s"), null);
  assert.equal(TR.pace100("x | 02:22min/100m"), 142);
});

test("workout-1.1: feste Pause ist Zeit, Schwimmstrecken aus der Pace geschätzt, keine falsche Summe", () => {
  const p = { date: "2026-11-20", title: "Testschwimmen", sport: "schwimm", steps: [sw(200, "warmup", "Warm Up | Recovery | 03:00min/100m"),
    rep(4, [sw(100, "other", "1Lane | Serie | Tempo | 02:00min/100m"), pause(30)]), { type: "rest", end_condition: "distance", end_condition_value: 50 }, sw(200, "cooldown", "Cool Down | Recovery | 03:00min/100m")] };
  const wo = TR.workout(p, { zonen: Z });
  assert.equal(wo.v, "workout-1.1");
  assert.ok(!wo.hinweise.some((h) => /offenen Schritten/.test(h)), "fixed.rest ist kein offener Schritt");
  // 200 m à 3:00 = 360 s, 4 × (100 m à 2:00 + 30 s) = 600 s, 50 m locker mit der langsamsten Pace = 90 s, 200 m à 3:00 = 360 s
  assert.equal(Math.round(wo.dauer_s), 1410);
  assert.match(wo.dauer_quelle, /Pace der Beschreibung geschätzt/);
  assert.equal(wo.distanz_m, 850);
  // Lauf mit Distanzschritt ohne Ziel: keine Teil-Summe, sondern die Dauer laut Kalender
  const lauf = TR.workout({ title: "Test", sport: "lauf", dur_s: 3000, steps: [{ type: "interval", end_condition: "distance", end_condition_value: 5000 },
    { type: "cooldown", end_condition: "time", end_condition_value: 600 }] }, { zonen: Z });
  assert.equal(lauf.dauer_s, 3000);
  assert.equal(lauf.dauer_quelle, "Dauer laut Kalender");
});

test("profil-1.0: Balken je Schritt, Fokus ohne Ein-/Ausfahren und Erholung, Zeit ab Zone 3", () => {
  const p = { date: "2026-11-20", title: "Test Sweet Spot", sport: "rad", steps: [pz(600, 100, 160, "warmup"), rep(3, [pz(600, 228, 240), pz(300, 150, 190, "rest")]), pz(600, 100, 160, "cooldown")] };
  const wo = TR.workout(p, { zonen: Z }), pr = V6.profil(wo, Z.skalen);
  assert.equal(pr.balken.length, 8);
  assert.equal(pr.dauer_s, 3900);
  assert.deepEqual(pr.balken.map((b) => b.key), ["z1", "sweet", "z2", "sweet", "z2", "sweet", "z2", "z1"]);
  assert.deepEqual(pr.fokus.map((f) => f.key), ["sweet"], "Erholungsschritte zählen nicht als Fokus");
  assert.equal(pr.fokus[0].anteil, 1);
  assert.equal(pr.intensiv_s, 1800);
  assert.ok(pr.balken[1].h > pr.balken[2].h && pr.balken[2].h > pr.balken[0].h, "Höhe folgt der Intensität");
  const svg = V6.profilSVG(pr, { h: 40 });
  assert.equal((svg.match(/<rect /g) || []).length, 8);
  // Workout ohne Zielbereiche: graue Balken, keine Fokus-Intensität, nichts geraten
  const frei = V6.profil(TR.workout({ title: "frei", sport: "rad", steps: [{ type: "interval", end_condition: "time", end_condition_value: 1200 }] }, { zonen: Z }), Z.skalen);
  assert.equal(frei.balken[0].key, "offen");
  assert.equal(frei.fokus.length, 0);
  // Schritt ohne Dauer: schmaler, blasser Platzhalter, Gesamtdauer bleibt offen
  const off = V6.profil(TR.workout({ title: "offen", sport: "rad", steps: [pz(600, 100, 160, "warmup"), { type: "interval", end_condition: "lap.button", target_type: "power.zone", target_value_low: 230, target_value_high: 240 }] }, { zonen: Z }), Z.skalen);
  assert.equal(off.ohneDauer, 1);
  assert.equal(off.dauer_s, null);
  assert.ok(V6.profilSVG(off).includes('fill-opacity=".45"'));
});

test("Schritte für die Liste: Wiederholungen als Block, Zieltexte, Bezeichnungen", () => {
  const p = { title: "Test", sport: "rad", steps: [pz(600, 100, 160, "warmup"), rep(4, [pz(300, 280, 300), pz(180, 100, 150, "rest")]), pz(600, 100, 160, "cooldown")] };
  const wo = TR.workout(p, { zonen: Z }), B = V6.bloecke(wo);
  assert.deepEqual(B.map((b) => b.art), ["einzel", "wdh", "einzel"]);
  assert.equal(B[1].n, 4);
  assert.equal(B[1].schritte.length, 2);
  assert.equal(V6.zielText(B[1].schritte[0], wo), "280–300 W");
  assert.equal(V6.schrittTyp(B[0].schritte[0], wo), "Einfahren");
  assert.equal(V6.schrittTyp(B[1].schritte[0], wo), "Intervall");
  assert.equal(V6.schrittTyp(B[1].schritte[1], wo), "Erholung");
  const lauf = TR.workout({ title: "L", sport: "lauf", steps: [{ type: "interval", end_condition: "time", end_condition_value: 1200, target_type: "speed.zone", target_value_low: 2.5, target_value_high: 2.7778 }] }, { zonen: Z });
  assert.equal(V6.zielText(lauf.schritte[0], lauf), "6:00–6:40 /km");
  assert.equal(V6.dauerText(2156), "36m");
  assert.equal(V6.dauerText(4500), "1h 15m");
  assert.equal(V6.dauerText(330), "5m 30s");
  assert.equal(V6.distanzText(1300), "1,3 km");
  assert.equal(V6.distanzText(850), "850 m");
});

test("status-1.0: Bänder nach Coggan, Grenzen, Skala lückenlos", () => {
  assert.equal(V6.status(30).key, "verlust");
  assert.equal(V6.status(25).key, "erholt");
  assert.equal(V6.status(5).key, "erhaltung");
  assert.equal(V6.status(-10).key, "produktiv");
  assert.equal(V6.status(-30).key, "ueberlastung");
  assert.equal(V6.status(null), null);
  assert.ok(!V6.STATUS.some((b) => /übertraining/i.test(b.name)), "Übertraining wird nie aus Zahlen behauptet");
  const B = V6.statusBaender();
  assert.equal(B[0].von, 0);
  assert.equal(B[B.length - 1].bis, 1);
  for (let i = 1; i < B.length; i++) assert.equal(B[i].von, B[i - 1].bis);
  assert.equal(V6.statusLage(-40), 0);
  assert.equal(V6.statusLage(100), 1);
});

test("Wochenleiste: erledigt, geplant und verpasst je Tag; Fortschritt aus erledigt + offen + verpasst", () => {
  const acts = [{ date: "2026-11-09", sport: "rad", dur: 3600 }, { date: "2026-11-09", sport: "lauf", dur: 1800 }, { date: "2026-11-13", sport: "schwimm", dur: 2400 },
    { date: "2026-11-08", sport: "rad", dur: 9999 }];
  const planned = [{ date: "2026-11-09", sport: "rad", dur_s: 3600 }, { date: "2026-11-11", sport: "lauf", dur_s: 2400 }, { date: "2026-11-13", sport: "schwimm", dur_s: 2700 },
    { date: "2026-11-13", sport: "rad", dur_s: 4500 }, { date: "2026-11-15", sport: "lauf", dur_s: 5400 }];
  const w = V6.woche(acts, planned, "2026-11-13");
  assert.equal(w.tage[0].iso, "2026-11-09");
  assert.equal(w.tage[4].heute, true);
  assert.deepEqual(w.tage[0].zeichen, [{ sport: "rad", art: "ist" }, { sport: "lauf", art: "ist" }], "ungeplante Aktivität zählt als erledigt");
  assert.deepEqual(w.tage[2].zeichen, [{ sport: "lauf", art: "verpasst" }]);
  assert.deepEqual(w.tage[4].zeichen, [{ sport: "schwimm", art: "ist" }, { sport: "rad", art: "plan" }]);
  assert.equal(w.n_ist, 3, "Aktivität der Vorwoche zählt nicht");
  assert.equal(w.n_offen, 2);
  assert.equal(w.n_verpasst, 1);
  assert.equal(w.n_woche, 6);
  assert.equal(w.s_ist, 7800);
  assert.equal(w.s_woche, 7800 + 4500 + 5400 + 2400);
  assert.equal(V6.montag("2026-11-15"), "2026-11-09", "Sonntag gehört zur Woche ab Montag");
});

test("Zonen-Chip und Farben: eine Zone, eine Farbe; Symbole eigen", () => {
  assert.match(V6.zchip("sweet"), /Z3·Sweet Spot/);
  assert.match(V6.zchip("fatmax"), /Z2·FatMax/);
  assert.equal(V6.ZONEN.vo2.farbe, V6.ZONEN.z5.farbe);
  assert.equal(V6.rgba("#4f69f8", 0.2), "rgba(79, 105, 248, 0.2)");
  for (const k of ["rad", "lauf", "schwimm", "wandern", "check", "ampel", "status", "route"]) assert.match(V6.icon(k), /^<svg viewBox="0 0 24 24"/);
  assert.equal(V6.gruss(7), "Guten Morgen");
  assert.equal(V6.gruss(13), "Guten Tag");
  assert.equal(V6.gruss(20), "Guten Abend");
});

test("Plan: Kalenderwoche, Rennen mit Priorität, Streckenlängen, Phasen als Zeitstrahl", () => {
  assert.equal(V6.isoWoche("2026-11-13"), 46);
  assert.equal(V6.isoWoche("2027-01-01"), 53, "1.1.2027 gehört zur KW 53 von 2026");
  assert.equal(V6.isoWoche("2027-01-04"), 1);
  const R = V6.rennenPrio([{ name: "Testrennen Langdistanz", date: "2027-07-01" }, { name: "Testrennen Halbdistanz", date: "2027-05-01" }]);
  assert.deepEqual(R.map((r) => r.prio), ["B", "A"], "ohne Angabe ist das letzte Rennen das Hauptrennen");
  assert.equal(V6.rennenPrio([{ name: "Ironman Hamburg", date: "2027-06-06" }, { name: "Spätes Rennen", date: "2027-09-01" }])[0].prio, "A", "Hamburg = A (saison-1.0)");
  assert.deepEqual(V6.distanzen("Ironman 70.3 Testort").map((d) => d.km), [1.9, 90, 21.1]);
  assert.deepEqual(V6.distanzen("Ironman Testort").map((d) => d.km), [3.8, 180, 42.2]);
  assert.equal(V6.distanzen("Stadtlauf"), null, "unbekanntes Format: keine Strecken geraten");
  const wochen = [{ woche: "2026-11-09", phase: "Grundlage" }, { woche: "2026-11-16", phase: "Grundlage" }, { woche: "2026-11-23", phase: "Aufbau" }, { woche: "2026-11-30", phase: "Taper" }];
  const seg = V6.phasenSegmente(wochen, "2026-11-18");
  assert.deepEqual(seg.map((x) => [x.phase, x.von, x.bis, x.wochen.length, x.aktiv]),
    [["Grundlage", "2026-11-09", "2026-11-22", 2, true], ["Aufbau", "2026-11-23", "2026-11-29", 1, false], ["Taper", "2026-11-30", "2026-12-06", 1, false]]);
});

test("Zonenliste: Name und Grenzen je Zone, Unterzonen aus dem Text", () => {
  const Zl = V6.zonenZeilen(ZONEN[0].skalen[0].zonen);
  assert.deepEqual(Zl.map((z) => [z.kurz, z.name, z.von, z.bis]), [["Z1", "Erholung", null, 150], ["Z2", "Grundlage", 150, 200], ["Z3", "Tempo", 200, 240], ["Z4", "Schwelle", 240, 270], ["Z5", "Intensiv", 270, null]]);
  assert.deepEqual(Zl[1].unter, [{ key: "fatmax", name: "FatMax", lo: 180, hi: 195 }]);
  assert.deepEqual(Zl[2].unter.map((u) => u.name), ["Sweet Spot"]);
  assert.deepEqual(Zl[4].unter.map((u) => [u.name, u.lo, u.hi]), [["VO2max", 280, 320]]);
  assert.deepEqual(V6.zonenZeilen(ZONEN[0].skalen[1].zonen)[1].unter, [{ key: "fatmax", name: "FatMax", lo: 345, hi: 360 }], "Pace-Unterzone in s/km");
});
