// Abnahmetests V6.6 Etappe 6 (js/v66.js): Mein Plan (eigenplan-1.0), Vorlagen (vorlagen-1.0), TL ≈ (tl-plan-1.0).
// Alle Zonen und Werte sind erfunden (keine persönlichen Werte im öffentlichen Repository). Aufruf: node --test tests/test_v66.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");

const SK = {   // erfundenes Zonenprofil
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
};
const MO = "2026-11-16";
const woche = (o) => V64.woche(Object.assign({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" }, o));
const ctxFuer = (w, heute) => ({ heute, montag: MO, jetzt: "2026-11-17T20:00:00Z", vorschlag: (d) => (w.tage.find((t) => t.date === d) || { einheiten: [] }).einheiten,
  neuId: (() => { let i = 0; return () => "e-test-" + i++; })() });

test("vorlagen-1.0: Vorlagen je Sportart, Bereiche, drinnen ohne lange Einheiten", () => {
  const rad = V66.vorlagen("rad");
  assert.equal(rad[0].id, "rad_locker"); assert.equal(rad[0].art, "grundlage");
  assert.ok(rad.some((v) => v.id === "rad_vo2" && v.art === "vo2max"));
  const drinnen = V66.vorlagen("rad_drinnen");
  assert.ok(!drinnen.some((v) => ["lang", "renntempo"].includes(v.art)), "drinnen keine lange Ausfahrt");
  const b = V66.bereich("rad_schwelle"), voll = V64.einheit("rad_schwelle", {}).dauer, kurz = V64.einheit("rad_schwelle", { kurz: true }).dauer;
  assert.deepEqual(b, { min: kurz, max: voll + 60, std: voll, fest: false });
  assert.equal(V66.bereich("test_rad").fest, true);
  assert.deepEqual(V66.vorlagen("kraft").map((v) => v.id), ["kraft"]);
  assert.equal(V66.bereich("gibts_nicht"), null);
});

test("vorlagen-1.0: Einheit aus Vorlage – Schlüsseleinheit verlängert mit Z2, freie Dauer, drinnen, Kraft", () => {
  const voll = V64.einheit("rad_vo2", {}).dauer;
  const e = V66.einheit({ uid: "e1", vorlage: "rad_vo2", dauer: voll + 20, quelle: "eigen" });
  assert.equal(e.dauer, voll + 20); assert.deepEqual(e.teile[e.teile.length - 1], ["z2", 20]);
  assert.match(e.ablauf[e.ablauf.length - 1], /20 min locker/);
  const k = V66.einheit({ uid: "e2", vorlage: "rad_vo2", dauer: V66.bereich("rad_vo2").min, quelle: "eigen" });
  assert.equal(k.dauer, V64.einheit("rad_vo2", { kurz: true }).dauer, "unter der vollen Fassung: kurze Fassung");
  const l = V66.einheit({ uid: "e3", vorlage: "lauf_locker", dauer: 55, quelle: "eigen", drinnen: true });
  assert.equal(l.dauer, 55); assert.match(l.titel, /drinnen/); assert.equal(l.uid, "e3"); assert.equal(l.quelle, "eigen");
  const kr = V66.einheit({ uid: "e4", vorlage: "kraft", dauer: 40, quelle: "eigen" });
  assert.equal(kr.sport, "kraft"); assert.equal(V66.schaetzung(kr, V66.bezug(SK)).tl, null);
});

test("eigenplan-1.0: hinzufügen, Dauer, verschieben, entfernen – vergangene und gesperrte Tage unveränderlich", () => {
  const w = woche(), ctx = ctxFuer(w, "2026-11-18");                     // heute = Mittwoch
  let r = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-19", einheit: { vorlage: "kraft", dauer: 30 } }, ctx);
  assert.ok(!r.fehler, r.fehler); let E = r.eintrag;
  assert.equal(E.id, "wo-" + MO); assert.equal(E.v, "eigenplan-1.0");
  const vorDo = w.tage.find((t) => t.date === "2026-11-19").einheiten.length;
  assert.equal(E.tage["2026-11-19"].einheiten.length, vorDo + 1, "Vorschlag des Tages übernommen, eigene dazu");
  assert.ok(E.tage["2026-11-19"].einheiten.slice(0, vorDo).every((s) => s.quelle === "vorschlag"));
  assert.match(V66.aendern(E, { art: "hinzufuegen", date: "2026-11-17", einheit: { vorlage: "kraft", dauer: 30 } }, ctx).fehler, /vergangen/);
  assert.match(V66.aendern(E, { art: "hinzufuegen", date: "2026-11-19", einheit: { vorlage: "kraft", dauer: 300 } }, ctx).fehler, /15–90/);
  assert.match(V66.aendern(E, { art: "hinzufuegen", date: "2026-11-24", einheit: { vorlage: "kraft", dauer: 30 } }, ctx).fehler, /nicht in dieser Woche/);
  // sperren → nichts mehr ändern, entsperren → wieder
  E = V66.aendern(E, { art: "sperren", date: "2026-11-19" }, ctx).eintrag;
  assert.match(V66.aendern(E, { art: "entfernen", date: "2026-11-19", uid: "e-test-0" }, ctx).fehler, /gesperrt/);
  E = V66.aendern(E, { art: "entsperren", date: "2026-11-19" }, ctx).eintrag;
  // Dauer einer Vorschlags-Einheit ändern → wird «eigen»
  const sa = w.tage.find((t) => t.date === "2026-11-21").einheiten[0], B = V66.bereich(sa.id);
  r = V66.aendern(E, { art: "dauer", date: "2026-11-21", uid: "v-2026-11-21-0", dauer: B.min }, ctx);
  assert.ok(!r.fehler, r.fehler); E = r.eintrag;
  assert.equal(E.tage["2026-11-21"].einheiten[0].dauer, B.min); assert.equal(E.tage["2026-11-21"].einheiten[0].quelle, "eigen");
  // verschieben Do → Fr
  r = V66.aendern(E, { art: "verschieben", date: "2026-11-19", uid: "e-test-0", nach: "2026-11-20" }, ctx);
  assert.ok(!r.fehler, r.fehler); E = r.eintrag;
  assert.ok(E.tage["2026-11-20"].einheiten.some((s) => s.uid === "e-test-0"));
  assert.equal(E.tage["2026-11-19"], undefined, "Donnerstag entspricht wieder dem Vorschlag und folgt ihm");
  assert.match(V66.aendern(E, { art: "verschieben", date: "2026-11-20", uid: "e-test-0", nach: "2026-11-17" }, ctx).fehler, /vergangen/);
  r = V66.aendern(E, { art: "entfernen", date: "2026-11-20", uid: "e-test-0" }, ctx); assert.ok(!r.fehler);
  assert.equal(V66.aendern(r.eintrag, { art: "entfernen", date: "2026-11-20", uid: "e-test-0" }, ctx).fehler, "Einheit nicht gefunden");
});

test("eigenplan-1.0: Woche leeren und Änderungen verwerfen lassen gesperrte und vergangene Tage stehen", () => {
  const w = woche(), ctx = ctxFuer(w, "2026-11-18");
  let E = V66.aendern(null, { art: "sperren", date: "2026-11-21" }, ctx).eintrag;
  E = V66.aendern(E, { art: "leeren" }, ctx).eintrag;
  for (const d of ["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-22"]) assert.deepEqual(E.tage[d].einheiten, [], d);
  assert.equal(E.tage["2026-11-21"].einheiten, null, "gesperrter Tag bleibt beim Vorschlag"); assert.equal(E.tage["2026-11-21"].gesperrt, true);
  assert.equal(E.tage["2026-11-16"], undefined, "vergangene Tage bleiben"); assert.equal(E.tage["2026-11-17"], undefined);
  const P = V66.meinPlan(w, E, {});
  assert.equal(P.tage.find((t) => t.date === "2026-11-19").einheiten.length, 0);
  assert.ok(P.tage.find((t) => t.date === "2026-11-21").einheiten.length > 0 && P.tage.find((t) => t.date === "2026-11-21").gesperrt);
  assert.ok(P.tage.find((t) => t.date === "2026-11-17").einheiten.length > 0, "Dienstag (vorbei) zeigt den Vorschlag");
  assert.equal(P.bearbeitet, true); assert.deepEqual(P.gesperrt, ["2026-11-21"]);
  E = V66.aendern(E, { art: "verwerfen" }, ctx).eintrag;
  assert.deepEqual(Object.keys(E.tage), ["2026-11-21"], "nur die Sperre bleibt");
  assert.equal(V66.meinPlan(w, E, {}).bearbeitet, false);
  assert.equal(w.tage.find((t) => t.date === "2026-11-19").uid, undefined, "die Vorschlagswoche selbst bleibt unverändert");
});

test("eigenplan-1.0: Prüfung gespeicherter Einheiten", () => {
  assert.equal(V66.einheitPruefen({ uid: "x", vorlage: "rad_locker", dauer: 60, quelle: "eigen" }), null);
  assert.match(V66.einheitPruefen({ uid: "x", vorlage: "rad_locker", dauer: 700, quelle: "eigen" }), /5–600/);
  assert.match(V66.einheitPruefen({ uid: "x", vorlage: "?", dauer: 60, quelle: "eigen" }), /unbekannte Vorlage/);
  assert.equal(V66.einheitPruefen({ uid: "x", quelle: "bibliothek", wid: 7, sport: "rad", dauer: 60 }), null);
  assert.match(V66.einheitPruefen({ uid: "x", quelle: "bibliothek", sport: "rad", dauer: 60 }), /Bibliothek/);
  assert.match(V66.einheitPruefen({ uid: "x", vorlage: "rad_locker", dauer: 60, quelle: "fremd" }), /Quelle/);
});

test("tl-plan-1.0: TL ≈ aus dem Zonenprofil, Distanz ≈ beim Laufen, ohne Bezug keine Zahl", () => {
  const BZ = V66.bezug(SK, 100);
  const rad = V66.schaetzung(V64.einheit("rad_locker", { d: 60 }), BZ);
  const erwartet = (10 / 60) * Math.pow((0.85 * 160) / 240, 2) * 100 + (50 / 60) * Math.pow(180 / 240, 2) * 100;
  assert.equal(rad.tl, Math.round(erwartet)); assert.equal(rad.vollstaendig, true); assert.equal(rad.km, null, "Rad ohne Distanz");
  const lauf = V64.einheit("lauf_locker", { d: 45 }), s = V66.schaetzung(lauf, BZ);
  let km = 0; for (const [k, m] of lauf.teile) km += (m * 60) / BZ.lauf.pace[k];
  assert.equal(s.km, Math.round(km * 10) / 10); assert.ok(s.tl > 0);
  const vo2 = V66.schaetzung(V64.einheit("rad_vo2", {}), BZ);
  assert.ok(vo2.tl > rad.tl, "VO2max-Einheit belastet mehr als Grundlage gleicher Länge");
  assert.equal(V66.schaetzung(V64.einheit("rad_locker", { d: 60 }), V66.bezug({}, null)).tl, null, "ohne Zonenprofil keine Zahl");
  assert.equal(V66.schaetzung(V64.einheit("schwimm_locker", { d: 40 }), V66.bezug(SK, null)).grund, "ohne CSS-Test");
  assert.ok(V66.schaetzung(V64.einheit("schwimm_locker", { d: 40 }), BZ).tl > 0);
  assert.match(V66.schaetzung(V64.einheit("test_rad", {}), BZ).grund, /Test/);
});

test("wochenblatt-1.0: Wochenart – Belastung 1–3 seit der letzten Erholung, Erholung, Taper, Rennwoche", () => {
  const W = [["2027-01-04", false], ["2027-01-11", false], ["2027-01-18", false], ["2027-01-25", true], ["2027-02-01", false]].map(([woche, erholung]) => ({ woche, erholung, phase: "Aufbau" }));
  W.push({ woche: "2027-05-24", phase: "Taper", erholung: false }, { woche: "2027-05-31", phase: "Taper", erholung: false, rennen: ["Testrennen"] }, { woche: "2027-06-07", phase: "Übergang", erholung: false });
  const A = V66.wochenart(W.slice().reverse());
  assert.deepEqual(["2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25", "2027-02-01"].map((w) => A.get(w).text), ["Belastung 1", "Belastung 2", "Belastung 3", "Erholung", "Belastung 1"]);
  assert.equal(A.get("2027-05-24").text, "Taper"); assert.equal(A.get("2027-05-31").art, "taper", "Taper geht vor dem Rennen in der Woche");
  assert.equal(A.get("2027-06-07").text, "Belastung 1", "nach Taper und Rennen beginnt die Zählung neu");
});

test("eigenplan-1.0: hinzufügen und wieder entfernen → der Tag folgt wieder dem Vorschlag", () => {
  const w = woche(), ctx = ctxFuer(w, "2026-11-18");
  let E = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-20", einheit: { vorlage: "mobility", dauer: 20 } }, ctx).eintrag;
  assert.ok(Array.isArray(E.tage["2026-11-20"].einheiten));
  E = V66.aendern(E, { art: "entfernen", date: "2026-11-20", uid: "e-test-0" }, ctx).eintrag;
  assert.deepEqual(E.tage, {}, "keine Änderung mehr gespeichert");
  assert.equal(V66.meinPlan(w, E, {}).bearbeitet, false);
});

test("eigenplan-1.0 / vergleich-1.3: bearbeitete Woche – Stunden und Verteilung aus deinen Einheiten, Vergleich mit der bearbeiteten Woche", () => {
  const w0 = woche({}), ctx = ctxFuer(w0, MO);
  const unv = V66.meinPlan(w0, null, {});
  assert.equal(unv.bearbeitet, false); assert.deepEqual(unv.minuten, w0.minuten, "unbearbeitet: Zahlen des Vorschlags");
  let E = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-18", einheit: { vorlage: "rad_vo2", dauer: V66.bereich("rad_vo2").std } }, ctx).eintrag;
  E = V66.aendern(E, { art: "hinzufuegen", date: "2026-11-20", einheit: { quelle: "bibliothek", wid: 7, sport: "rad", titel: "VO2max 5 x 4 min", dauer: 60 } }, ctx).eintrag;
  E = V66.aendern(E, { art: "hinzufuegen", date: "2026-11-20", einheit: { quelle: "bibliothek", wid: 8, sport: "lauf", titel: "Beispiel", dauer: 40 } }, ctx).eintrag;
  const w = V66.meinPlan(w0, E, {});
  assert.equal(w.bearbeitet, true);
  const vo2 = V66.bereich("rad_vo2").std;
  assert.equal(w.minuten.rad, w0.minuten.rad + vo2 + 60); assert.equal(w.minuten.lauf, w0.minuten.lauf + 40);
  assert.equal(w.minuten.total, w.minuten.schwimm + w.minuten.rad + w.minuten.lauf);
  assert.deepEqual(w.vorschlag_minuten, w0.minuten, "der unveränderte Vorschlag bleibt dabei");
  assert.equal(w.zonen.offen, 100, "Bibliothek ohne bekannte Ziele: offen, nicht gezählt");
  assert.ok(w.zonen.hart > w0.zonen.hart, "hinzugefügte VO2max-Einheit zählt hart");
  assert.match(w.pruefung.text, /100 min aus der Bibliothek/);
  const bib = w.tage.find((t) => t.date === "2026-11-20").einheiten.filter((e) => e.art === "bibliothek");
  assert.deepEqual(bib.map((e) => e.stufe), ["alles", "offen"], "Stufe laut Titel, sonst offen – nie geraten");
  const wb = V66.meinPlan(w0, E, { bibStufe: (wid) => (wid === 8 ? "schwelle" : null) });
  assert.equal(wb.tage.find((t) => t.date === "2026-11-20").einheiten.find((e) => e.wid === 8).stufe, "schwelle", "Stufe aus den Schritten geht vor");
  const r = V64.vergleich({ w, enduco: [{ date: "2026-11-21", sport: "rad", titel: "Beispiel", dauer_s: 3600, stufe: "locker" }], ist: [], heute: "2026-11-17", wahl: {} });
  assert.equal(r.v, "vergleich-1.4");
  const r0 = V64.vergleich({ w: unv, enduco: [{ date: "2026-11-21", sport: "rad", titel: "Beispiel", dauer_s: 3600, stufe: "locker" }], ist: [], heute: "2026-11-17", wahl: {} });
  assert.equal(r.summen.V.rad.min, r0.summen.V.rad.min + vo2 + 60, "der Vergleich zählt die bearbeitete Woche");
  assert.equal(r.stufen.V.alles.length, r0.stufen.V.alles.length + 2, "VO2max-Vorlage und Bibliothek «VO2max» laut Titel");
});

test("aufbau-1.1 in Mein Plan: Lauf über der Grenze oder nach einer Pause gemeldet, nicht verhindert", () => {
  const laeufe = V64.laeufe([{ date: "2026-11-01", sport: "lauf", km: 10 }, { date: "2026-11-08", sport: "lauf", km: 12 }]);
  const lauf = V66.einheit({ uid: "x", vorlage: "lauf_lang", dauer: 90, quelle: "eigen" });
  assert.match(V66.aufbauHinweis(lauf, "2026-11-20", 14, laeufe, MO), /über deiner Aufbau-Grenze von 13,2 km.*nicht verhindert/);
  assert.equal(V66.aufbauHinweis(lauf, "2026-11-20", 13, laeufe, MO), null, "unter der Grenze");
  assert.equal(V66.aufbauHinweis(lauf, "2026-11-20", null, laeufe, MO), null, "ohne Distanz ≈ (kein Zonenprofil) nichts geraten");
  assert.match(V66.aufbauHinweis(lauf, "2026-12-20", 8, laeufe, MO), /Kein Lauf in den 30 Tagen davor: .*30 min locker/, "Pause: lang");
  const kurz = V66.einheit({ uid: "y", vorlage: "lauf_locker", dauer: 30, quelle: "eigen" });
  assert.equal(V66.aufbauHinweis(kurz, "2026-12-20", 5, laeufe, MO), null, "Pause: 30 min locker ist ok");
  assert.match(V66.aufbauHinweis(V66.einheit({ uid: "z", vorlage: "lauf_vo2", dauer: V66.bereich("lauf_vo2").min, quelle: "eigen" }), "2026-12-20", 5, laeufe, MO) || "", /Kein Lauf/,
    "Pause: harter Lauf gemeldet");
  assert.equal(V66.aufbauHinweis(lauf, "2026-11-20", 20, [], MO), null, "ohne Läufe in den Daten nichts");
  assert.equal(V66.aufbauHinweis(V66.einheit({ uid: "r", vorlage: "rad_lang", dauer: 180, quelle: "eigen" }), "2026-11-20", 90, laeufe, MO), null, "nur Laufen");
});

/* ---------------- garmin-senden-1.0 ---------------- */
const flach = (steps) => steps.flatMap((s) => (s.type === "RepeatGroupDTO" ? [s].concat(s.workoutSteps) : [s]));
test("garmin-senden-1.0: Rad-Workout – Wiederholungen als Gruppe, Reihenfolge, Watt aus dem Zonenprofil, Z1 ohne Ziel", () => {
  const e = V66.einheit({ uid: "e-1", vorlage: "rad_vo2", dauer: V66.bereich("rad_vo2").std, quelle: "eigen" });
  const g = V66.garminWorkout(e, SK, { date: "2026-11-20" });
  assert.ok(!g.fehler, g.fehler);
  const W = g.workout, S = W.workoutSegments[0].workoutSteps;
  assert.match(W.workoutName, /^IN · /); assert.deepEqual(W.sportType, { sportTypeId: 2, sportTypeKey: "cycling" });
  assert.ok(S.some((s) => s.type === "RepeatGroupDTO" && s.numberOfIterations === 13 && s.endConditionValue === 13 && s.endCondition.conditionTypeId === 7));
  const F = flach(S);
  assert.deepEqual(F.map((s) => s.stepOrder), F.map((_, i) => i + 1), "Reihenfolge über alle Schritte, Gruppe vor ihren Schritten");
  const sek = (L, k = 1) => L.reduce((a, s) => a + (s.type === "RepeatGroupDTO" ? sek(s.workoutSteps, s.numberOfIterations) : s.endConditionValue) * k, 0);
  assert.equal(sek(S), e.dauer * 60, "Dauer bleibt gleich");
  assert.equal(S[0].stepType.stepTypeKey, "warmup"); assert.equal(S[0].targetType.workoutTargetTypeKey, "no.target");
  assert.equal(S[S.length - 1].stepType.stepTypeKey, "cooldown");
  const z2 = S[1]; assert.equal(z2.targetType.workoutTargetTypeKey, "power.between"); assert.deepEqual([z2.targetValueOne, z2.targetValueTwo], [160, 200]);
  const vo2 = F.find((s) => s.description && /VO2max/.test(s.description));
  assert.deepEqual([vo2.targetValueOne, vo2.targetValueTwo], [257, Math.round(257 * 1.15)], "Z5 nach oben offen: +15 % (eigene Festlegung)");
  assert.equal(g.offen, true); assert.ok(g.schritte <= V66.GARMIN_MAX_SCHRITTE);
  assert.match(W.description, /\[IN e-1 [0-9a-f]{16}\]$/);
});

test("garmin-senden-1.0: Laufen mit Tempo in m/s (langsam → schnell); Fassung ändert sich nur mit dem Inhalt", () => {
  const e = V66.einheit({ uid: "e-2", vorlage: "lauf_vo2", dauer: V66.bereich("lauf_vo2").std, quelle: "eigen" });
  const g = V66.garminWorkout(e, SK, { date: "2026-11-21" }), S = flach(g.workout.workoutSegments[0].workoutSteps);
  assert.deepEqual(g.workout.sportType, { sportTypeId: 1, sportTypeKey: "running" });
  const z2 = S.find((s) => /Z2/.test(s.description));
  assert.equal(z2.targetType.workoutTargetTypeKey, "pace.zone"); assert.equal(z2.targetType.workoutTargetTypeId, 6);
  assert.deepEqual([z2.targetValueOne, z2.targetValueTwo], [Math.round((1000 / 380) * 1000) / 1000, Math.round((1000 / 330) * 1000) / 1000]);
  assert.ok(S.every((s) => s.targetValueOne == null || s.targetValueOne <= s.targetValueTwo));
  assert.equal(V66.garminWorkout(e, SK, { date: "2026-11-22" }).fassung, g.fassung, "anderer Tag, gleicher Inhalt: gleiche Fassung");
  const SK2 = JSON.parse(JSON.stringify(SK)); SK2.lauf_pace[1].von = 385;
  assert.notEqual(V66.garminWorkout(e, SK2, {}).fassung, g.fassung, "andere Zonen: neue Fassung");
  const ohne = V66.garminWorkout(e, null, {});
  assert.ok(!ohne.fehler && ohne.ohneZiel > 0, "ohne Zonenprofil: Zeiten ohne Ziel, nichts geraten");
  assert.ok(flach(ohne.workout.workoutSegments[0].workoutSteps).every((s) => s.type === "RepeatGroupDTO" || s.targetType.workoutTargetTypeKey === "no.target"));
});

test("garmin-senden-1.0: was nicht gesendet wird, mit Grund; Auftrag mit Momentaufnahme; Stand gesendet/geändert/wartet", () => {
  const sw = V66.einheit({ uid: "s", vorlage: "schwimm_css", dauer: 60, quelle: "eigen" });
  assert.match(V66.garminGrund(sw), /Schwimmen/);
  assert.match(V66.garminGrund(V66.einheit({ uid: "t", vorlage: "test_rad", dauer: 60, quelle: "eigen" })), /Test/);
  assert.match(V66.garminGrund(V66.einheit({ uid: "k", vorlage: "kraft", dauer: 30, quelle: "eigen" })), /nur Rad und Laufen/);
  const rad = V66.einheit({ uid: "r", vorlage: "rad_locker", dauer: 60, quelle: "eigen" });
  const bib = V66.einheit({ uid: "b", quelle: "bibliothek", wid: 42, sport: "rad", titel: "Beispiel", dauer: 45 });
  const A = V66.garminAuftrag("2026-11-20", [rad, sw, bib], SK, "auto", "2026-11-17T20:00:00Z");
  assert.equal(A.id, "gs-2026-11-20"); assert.equal(A.modus, "auto");
  assert.deepEqual(A.einheiten.map((x) => [x.uid, x.quelle]), [["r", "eigen"], ["b", "bibliothek"]]);
  assert.ok(A.einheiten[0].workout && !A.einheiten[1].workout && A.einheiten[1].wid === 42 && A.einheiten[1].fassung === "bib-42");
  assert.deepEqual(A.ohne.map((x) => x.uid), ["s"]);
  assert.deepEqual(V66.garminAuftrag("2026-11-20", [rad], SK, "aus", "2026-11-17T20:00:00Z").einheiten, []);
  const f = A.einheiten[0].fassung;
  assert.equal(V66.garminStand(rad, "2026-11-20", SK, [{ uid: "r", date: "2026-11-20", fassung: f }], null), "gesendet");
  const lang = V66.einheit({ uid: "r", vorlage: "rad_locker", dauer: 75, quelle: "eigen" });
  assert.equal(V66.garminStand(lang, "2026-11-20", SK, [{ uid: "r", date: "2026-11-20", fassung: f }], null), "geaendert");
  assert.equal(V66.garminStand(rad, "2026-11-20", SK, [{ uid: "r", date: "2026-11-20", fassung: f, entfernt: "x" }], null), null, "ausgetragen zählt nicht");
  assert.equal(V66.garminStand(rad, "2026-11-20", SK, [], Object.assign({ status: "offen" }, A)), "wartet");
});

test("vergleich-1.4 / bib-1.1: selbst gesendete Einträge im Garmin-Kalender sind nie Enduco", () => {
  assert.equal(V66.eigenGarmin({ title: "IN · Grundlage", date: "2026-11-20" }, []), true);
  assert.equal(V66.eigenGarmin({ title: "Beispiel", date: "2026-11-20", wid: 42 }, [{ quelle: "bibliothek", wid: 42, date: "2026-11-20" }]), true);
  assert.equal(V66.eigenGarmin({ title: "Beispiel", date: "2026-11-20", wid: 42 }, [{ quelle: "bibliothek", wid: 42, date: "2026-11-20", vorhanden: true }]), false,
    "stand schon von Enduco im Kalender: bleibt Enduco");
  assert.equal(V66.eigenGarmin({ title: "Beispiel", date: "2026-11-21", wid: 42 }, [{ quelle: "bibliothek", wid: 42, date: "2026-11-20" }]), false);
  const acts = [{ date: "2026-11-18", sport: "rad", wk: { name: "IN · Grundlage", plan_s: 3600 } }, { date: "2026-11-19", sport: "rad", wk: { name: "Beispiel", plan_s: 3600 } }];
  assert.deepEqual(V64.enducoAusUhr(acts, []).map((x) => x.titel), ["Beispiel"]);
});
