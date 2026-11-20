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
  assert.equal(E.id, "wo-" + MO); assert.equal(E.v, "eigenplan-1.2");
  const vorDo = w.tage.find((t) => t.date === "2026-11-19").einheiten.length;
  assert.equal(E.tage["2026-11-19"].einheiten.length, vorDo + 1, "Vorschlag des Tages übernommen, eigene dazu");
  assert.ok(E.tage["2026-11-19"].einheiten.slice(0, vorDo).every((s) => s.quelle === "vorschlag"));
  assert.match(V66.aendern(E, { art: "hinzufuegen", date: "2026-11-17", einheit: { vorlage: "kraft", dauer: 30 } }, ctx).fehler, /vergangen/);
  assert.match(V66.aendern(E, { art: "hinzufuegen", date: "2026-11-19", einheit: { vorlage: "kraft", dauer: 300 } }, ctx).fehler, /15–180/);
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

test("tl-plan-1.0 (ohne Angaben zur Last unverändert): TL ≈ aus dem Zonenprofil, Distanz ≈ beim Laufen, ohne Bezug keine Zahl", () => {
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

test("tl-plan-1.1 (V8.1): TL ≈ mit den Bezugsgrössen der absolvierten Last – Rolle mit ihrer LT2, draussen und Laufen nach Puls, Schwimmen pro Stunde", () => {
  assert.equal(V66.VERSIONS.tl, "tl-plan-1.1");
  const HF = { rad_hf: [{ z: "Z1", von: null, bis: 120 }, { z: "Z2", von: 120, bis: 140 }, { z: "Z3", von: 140, bis: 155 }, { z: "Z4", von: 155, bis: 165 }, { z: "Z5", von: 165, bis: null }],
    lauf_hf: [{ z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: 150 }, { z: "Z3", von: 150, bis: 162 }, { z: "Z4", von: 162, bis: 172 }, { z: "Z5", von: 172, bis: null }] };
  const sk = Object.assign({}, SK, HF), last = { ref: { rad: [{ ab: "2026-01-01", lt2_w: 220 }, { ab: "2026-06-01", lt2_w: 230, system: "rolle" }] }, lthr: { rad: 160, lauf: 170 }, tlh: { schwimm: 50 } };
  const alt = V66.bezug(sk, 100, null), neu = V66.bezug(sk, 100, last);
  const e = (sport, teile, drinnen) => ({ sport, art: "locker", drinnen, teile });
  // Rad drinnen: Leistung der Zone ÷ neueste LT2 der Rolle (nicht der Beginn von Z4)
  assert.equal(V66.schaetzung(e("rad", [["z2", 60]], true), neu).tl, Math.round(Math.pow(180 / 230, 2) * 100));
  assert.equal(V66.schaetzung(e("rad", [["z2", 60]], true), alt).tl, Math.round(Math.pow(180 / 240, 2) * 100), "ohne Angaben wie tl-plan-1.0");
  // Rad draussen ohne LT2 für draussen: Mitte der Pulszone ÷ Schwellenpuls Rad, höchstens 1,15
  assert.equal(V66.schaetzung(e("rad", [["z2", 60]], false), neu).tl, Math.round(Math.pow(130 / 160, 2) * 100));
  assert.equal(V66.schaetzung(e("rad", [["vo2", 60]]), neu).tl, Math.round(Math.pow(Math.min(1.15, 165 / 160), 2) * 100));
  // … mit einer LT2 für draussen: Leistung ÷ diese LT2
  const mitDraussen = V66.bezug(sk, 100, Object.assign({}, last, { ref: { rad: last.ref.rad.concat([{ ab: "2026-09-01", lt2_w: 250, system: "draussen" }]) } }));
  assert.equal(V66.schaetzung(e("rad", [["z2", 60]], false), mitDraussen).tl, Math.round(Math.pow(180 / 250, 2) * 100));
  // Laufen nach Puls, Distanz ≈ weiter aus dem Tempo
  const L = V66.schaetzung(e("lauf", [["z2", 60]]), neu);
  assert.equal(L.tl, Math.round(Math.pow(140 / 170, 2) * 100)); assert.equal(L.km, V66.schaetzung(e("lauf", [["z2", 60]]), alt).km);
  // ohne Pulszonen bzw. Schwellenpuls: Laufen wie 1.0
  assert.equal(V66.schaetzung(e("lauf", [["z2", 60]]), V66.bezug(SK, 100, last)).tl, V66.schaetzung(e("lauf", [["z2", 60]]), V66.bezug(SK, 100, null)).tl);
  // Schwimmen: Minuten ohne Pause × Last pro Bewegungsstunde; Distanz ≈ aus der CSS, ohne CSS keine Distanz
  const sw = { sport: "schwimm", art: "locker", teile: [["z2", 30], ["pause", 5], ["technik", 10], ["css", 15]] };
  const S1 = V66.schaetzung(sw, neu);
  assert.equal(S1.tl, Math.round((55 / 60) * 50)); assert.equal(S1.vollstaendig, true); assert.equal(S1.kmMin, true, "Übungen ohne Tempo: Distanz mindestens");
  const S0 = V66.schaetzung(sw, V66.bezug(sk, null, last));
  assert.equal(S0.tl, S1.tl, "ohne CSS-Test trotzdem eine Zahl"); assert.equal(S0.km, null, "ohne CSS keine Distanz");
  assert.equal(V66.schaetzung(sw, V66.bezug(sk, null, null)).grund, "ohne CSS-Test", "ohne beides keine Zahl");
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

/* ---------------- garmin-senden-1.0 (1.1: Schwimmen, Puls und RPE in tests/test_v73.cjs) ---------------- */
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
  assert.equal(V66.garminGrund(sw), null, "garmin-senden-1.1: Schwimmen wird gesendet (tests/test_v73.cjs)");
  assert.match(V66.garminWorkout(sw, SK, {}).fehler, /Schwimm-Einheit nicht berechenbar/, "ohne Schwimm-Einheit (opt.schwimm) nichts geraten");
  assert.match(V66.garminGrund(V66.einheit({ uid: "t", vorlage: "test_rad", dauer: 60, quelle: "eigen" })), /Test/);
  assert.match(V66.garminGrund(V66.einheit({ uid: "k", vorlage: "kraft", dauer: 30, quelle: "eigen" })), /nur Rad, Laufen und Schwimmen/);
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

/* ---------------- V7.2 verfuegbarkeit-1.0 und eigenplan-1.1 (erfundene Wochen, keine persönlichen Werte) ---------------- */
const zeig = (w) => w.tage.map((t) => t.einheiten.map((e) => e.id).join("+"));
const VF = (...L) => V66.verfuegbarkeit(L);

test("verfuegbarkeit-1.0: Einträge prüfen, Tag vor Wochentag, zurücksetzen, Kurztext", () => {
  const J = "2026-11-16T10:00:00Z";
  assert.equal(V66.vfPruefen(V66.vfEintrag({ wt: 2 }, { min: 60, sport: ["schwimm"] }, J)), null);
  assert.equal(V66.vfPruefen(V66.vfEintrag({ date: "2026-11-19" }, { min: 0, sport: [] }, J)), null);
  assert.match(V66.vfPruefen({ id: "vf-wt-8", art: "wochentag", wt: 8 }), /1–7/);
  assert.match(V66.vfPruefen({ id: "vf-2026-11-19", art: "tag", date: "2026-11-19", min: 61 }), /5-min/);
  assert.match(V66.vfPruefen({ id: "vf-2026-11-19", art: "tag", date: "2026-11-19", sport: ["ski"] }), /Sportart/);
  assert.match(V66.vfPruefen({ id: "vf-x", art: "tag", date: "2026-11-19" }), /ID/);
  const f = VF(V66.vfEintrag({ wt: 4 }, { min: 90, sport: null }, J), V66.vfEintrag({ date: "2026-11-19" }, { min: 0, sport: [] }, J));
  assert.equal(f("2026-11-19").quelle, "tag"); assert.equal(f("2026-11-19").min, 0);
  assert.equal(f("2026-11-26").quelle, "wochentag"); assert.equal(f("2026-11-26").min, 90);
  assert.equal(f("2026-11-20"), null); assert.equal(f.leer, false);
  const g = VF([V66.vfEintrag({ date: "2026-11-19" }, { min: 30, sport: ["rad"] }, J)], [V66.vfEintrag({ date: "2026-11-19" }, null, J)]);
  assert.equal(g("2026-11-19"), null, "zurückgesetzt"); assert.equal(g.leer, true);
  assert.equal(V66.vfText({ min: 90, sport: ["rad", "lauf"] }), "1:30 h · Rad, Laufen");
  assert.equal(V66.vfText({ min: null, sport: null }), "Zeit offen · alle Sportarten");
  assert.equal(V66.vfText({ min: 0, sport: null }), "kein Training");
});

test("verfuegbarkeit-1.0: Vorschlag verteilen – Tag ohne Zeit, nur Schwimmen, Kurs fällt weg, Summen und Meldungen", () => {
  const w = woche();
  assert.equal(V66.wocheVerteilt(w, VF(), {}), w, "ohne Verfügbarkeit dieselbe Woche");
  const roh = zeig(w);
  const v = V66.wocheVerteilt(w, VF(V66.vfEintrag({ date: "2026-11-19" }, { min: 0, sport: [] })), {});
  assert.notEqual(v, w); assert.deepEqual(zeig(w), roh, "die Vorschlagswoche selbst bleibt unverändert");
  assert.equal(v.tage[3].einheiten.length, 0); assert.match(v.tage[3].notiz, /kein Training/);
  assert.equal(v.minuten.total, w.minuten.total, "nichts verloren, nur verschoben");
  assert.ok(v.verteilung.verschoben.length >= 2); assert.ok(v.hinweise.some((h) => /verschoben \(Verfügbarkeit\)/.test(h)));
  // harte Rad- und Laufeinheiten nicht am selben Tag und nicht an zwei Tagen hintereinander
  const hartAn = v.tage.map((t) => t.einheiten.some((e) => e.schluessel));
  for (let i = 1; i < 7; i++) assert.ok(!(hartAn[i] && hartAn[i - 1]), "harte Einheiten nicht hintereinander: " + zeig(v).join(" | "));
  // Dienstag nur Schwimmen 60 min: Lauf-Schlüssel geht weg, der Kurs bleibt
  const s = V66.wocheVerteilt(w, VF(V66.vfEintrag({ wt: 2 }, { min: 60, sport: ["schwimm"] })), {});
  assert.deepEqual(s.tage[1].einheiten.map((e) => e.sport), ["schwimm"]);
  assert.equal(s.tage.flatMap((t) => t.einheiten).filter((e) => e.schluessel && e.sport === "lauf").length, 1, "Lauf-Schlüssel an einem anderen Tag");
  // Dienstag ohne Schwimmen: Kurs entfällt (gemeldet)
  const k = V66.wocheVerteilt(w, VF(V66.vfEintrag({ wt: 2 }, { min: null, sport: ["lauf"] })), {});
  assert.ok(!k.tage[1].einheiten.some((e) => e.id === "schwimm_kurs")); assert.ok(k.verteilung.weg.some((x) => x.titel === "Schwimmkurs"));
});

test("verfuegbarkeit-1.0: wenig Zeit am eigenen Tag kürzt nur wenig, sonst ganz an einem anderen Tag; Rennwoche nur gemeldet", () => {
  const w = woche(), sa = w.tage[5].einheiten[0];
  const knapp = V66.wocheVerteilt(w, VF(V66.vfEintrag({ wt: 6 }, { min: sa.dauer - 15, sport: null })), {});
  assert.equal(knapp.tage[5].einheiten[0].dauer, sa.dauer - 15); assert.equal(knapp.verteilung.gekuerzt.length, 1);
  const kurz = V66.wocheVerteilt(w, VF(V66.vfEintrag({ wt: 6 }, { min: 45, sport: null })), {});
  assert.ok(!kurz.tage[5].einheiten.some((e) => e.id === sa.id), "zu stark gekürzt: lieber an einem anderen Tag");
  assert.equal(kurz.tage.flatMap((t) => t.einheiten).filter((e) => e.id === sa.id)[0].dauer, sa.dauer, "dort in voller Länge");
  const keine = V66.wocheVerteilt(w, VF(...[1, 2, 3, 4, 5, 6, 7].map((wt) => V66.vfEintrag({ wt }, { min: 0, sport: [] }))), {});
  assert.equal(keine.minuten.total, 0); assert.ok(keine.verteilung.weg.length >= 6, "alles gemeldet, nichts still");
  const r = V64.woche({ woche: MO, phase: "Taper", stunden: 6, modell: "polarisiert", rennen: [{ date: "2026-11-22", name: "Testrennen" }] });
  const rv = V66.wocheVerteilt(r, VF(V66.vfEintrag({ wt: 2 }, { min: 0, sport: [] })), {});
  assert.deepEqual(zeig(rv), zeig(r), "Rennwoche: nichts verschoben"); assert.ok(rv.hinweise.some((h) => /Rennwoche/.test(h)));
});

test("eigenplan-1.1: verteilte Woche wird beim ersten Ändern ganz festgehalten; Anpassen und Neu berechnen", () => {
  const w0 = woche(), verf = VF(V66.vfEintrag({ wt: 4 }, { min: 0, sport: [] })), wv = V66.wocheVerteilt(w0, verf, {});
  const ctx = Object.assign(ctxFuer(wv, "2026-11-18"), { verteilt: true, verf, roh: (d) => (w0.tage.find((t) => t.date === d) || {}).einheiten, o: { phase: "Grundlage" } });
  let E = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-20", einheit: { vorlage: "kraft", dauer: 30 } }, ctx).eintrag;
  assert.equal(E.ganz, true); assert.equal(Object.keys(E.tage).length, 7, "alle Tage festgehalten");
  assert.equal(E.tage["2026-11-16"].eingefroren, true); assert.equal(E.tage["2026-11-17"].eingefroren, true); assert.equal(E.tage["2026-11-18"].eingefroren, undefined);
  const P = V66.meinPlan(wv, E, {});
  assert.deepEqual(P.tage.filter((t) => t.bearbeitet).map((t) => t.date), ["2026-11-20"], "nur der geänderte Tag gilt als bearbeitet");
  assert.deepEqual(zeig(P).map((x, i) => (i === 4 ? x.replace(/\+kraft$/, "") : x)), zeig(wv), "gleich wie vorher, plus die eigene Einheit");
  // Samstag fällt weg → Anpassen: eigene Einheit bleibt, vergangene Tage bleiben, nichts doppelt
  const verf2 = VF(V66.vfEintrag({ wt: 4 }, { min: 0, sport: [] }), V66.vfEintrag({ wt: 6 }, { min: 0, sport: [] }));
  E = V66.aendern(E, { art: "anpassen" }, Object.assign({}, ctx, { verf: verf2 })).eintrag;
  const A = V66.meinPlan(wv, E, {});
  assert.equal(A.tage[5].einheiten.length, 0); assert.ok(A.tage[4].einheiten.some((e) => e.id === "kraft" && e.quelle === "eigen"));
  assert.deepEqual(zeig(A).slice(0, 2), zeig(wv).slice(0, 2), "Montag und Dienstag (vorbei) unverändert");
  const ids = A.tage.flatMap((t) => t.einheiten.map((e) => e.id)).sort(), vorher = wv.tage.flatMap((t) => t.einheiten.map((e) => e.id)).concat(["kraft"]).sort();
  assert.deepEqual(ids, vorher, "Anpassen verschiebt nur");
  assert.equal(E.verteilung.art, "anpassen"); assert.ok(E.verteilung.meldungen.length >= 1);
  // Sonntag sperren, Neu berechnen: Gesperrtes bleibt, eigene Einheit an anderen Tagen fällt weg, nichts doppelt
  E = V66.aendern(E, { art: "sperren", date: "2026-11-22" }, ctx).eintrag;
  E = V66.aendern(E, { art: "neuberechnen" }, Object.assign({}, ctx, { verf: verf2 })).eintrag;
  const N = V66.meinPlan(wv, E, {});
  assert.deepEqual(zeig(N)[6], zeig(A)[6], "gesperrter Sonntag bleibt"); assert.ok(!N.tage.some((t) => t.einheiten.some((e) => e.id === "kraft")));
  const n = N.tage.flatMap((t) => t.einheiten.map((e) => e.id));
  assert.equal(n.filter((x) => x === "rad_lang").length, 1, "die lange Ausfahrt nur einmal");
  // V9.1 alles-neu-1.0: «Alles neu» gibt auch den gesperrten Sonntag frei und verteilt neu
  const AL = V66.aendern(E, { art: "neuberechnen", alles: true }, Object.assign({}, ctx, { verf: verf2 })).eintrag;
  assert.ok(!Object.values(AL.tage).some((t) => t && t.gesperrt), "nach «Alles neu» ist nichts mehr gesperrt");
  const AM = V66.meinPlan(wv, AL, {});
  assert.ok(!AM.tage.some((t) => t.gesperrt), "auch im angezeigten Plan nicht");
  assert.deepEqual(zeig(AM).slice(0, 2), zeig(wv).slice(0, 2), "vergangene Tage bleiben");
  assert.equal(AM.tage.flatMap((t) => t.einheiten.map((e) => e.id)).filter((x) => x === "rad_lang").length, 1, "die lange Ausfahrt nur einmal");
  // künftige Woche ohne Sperren: Neu berechnen → wieder automatisch
  const ctxF = Object.assign({}, ctx, { montag: "2026-11-23", heute: "2026-11-18", vorschlag: () => [] });
  let F = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-25", einheit: { vorlage: "kraft", dauer: 30 } }, ctxF).eintrag;
  assert.equal(F.ganz, true);
  F = V66.aendern(F, { art: "neuberechnen" }, ctxF).eintrag;
  assert.deepEqual(F.tage, {}); assert.equal(F.ganz, undefined);
  // ohne verteilte Woche: Verhalten wie eigenplan-1.0 (nur geänderte Tage gespeichert)
  const E0 = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-20", einheit: { vorlage: "kraft", dauer: 30 } }, ctxFuer(w0, "2026-11-18")).eintrag;
  assert.equal(E0.ganz, undefined); assert.deepEqual(Object.keys(E0.tage), ["2026-11-20"]);
});

test("formPrognose: Fitness und Ermüdung mit der geplanten Last fortgeschrieben (pmc-2.0)", () => {
  const p = V66.formPrognose({ ctl: 50, atl: 60 }, "2026-11-18", "2026-11-20", (d) => (d === "2026-11-18" ? 100 : null));
  let ctl = 50, atl = 60; ctl += (100 - ctl) / 42; atl += (100 - atl) / 7; ctl += (0 - ctl) / 42; atl += (0 - atl) / 7;
  assert.ok(Math.abs(p.ctl - ctl) < 1e-9 && Math.abs(p.atl - atl) < 1e-9);
  assert.equal(p.form, Math.round(ctl) - Math.round(atl)); assert.equal(p.offen, 1);
  assert.equal(V66.formPrognose({ ctl: 50, atl: 60 }, "2026-11-18", "2026-11-18", () => 0).offen, 0, "gleicher Tag: Stand zu Tagesbeginn");
  assert.equal(V66.formPrognose(null, "2026-11-18", "2026-11-19"), null);
});

test("eigene-aktivitaet-1.0: Titel, Sportart und RPE → Zone, TL ≈ wie jede Einheit, nur über das eigene Blatt", () => {
  assert.equal(V66.VERSIONS.eigen, "eigene-aktivitaet-1.0");
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 10].map((r) => V66.rpeZone(r, "rad")), ["z1", "z1", "z2", "z2", "z3", "z3", "z3o", "vo2", "vo2"]);
  assert.deepEqual([2, 4, 6, 7, 10].map((r) => V66.rpeZone(r, "schwimm")), ["z1", "z2", "z3", "css", "css"]);
  assert.deepEqual([V66.rpeZone(5, "mobility"), V66.rpeZone(0, "rad"), V66.rpeZone(11, "lauf"), V66.rpeZone(3.5, "rad")], [null, null, null, null]);
  const s = { uid: "e-1", quelle: "eigen", vorlage: "eigen", titel: "Velo zur Arbeit", sport: "rad", dauer: 40, rpe: 4, uhrzeit: "07:15" };
  assert.equal(V66.einheitPruefen(s), null);
  for (const [k, v, f] of [["titel", "  ", "Titel"], ["titel", "x".repeat(61), "Titel"], ["sport", "ski", "Sportart"], ["rpe", 0, "RPE"], ["rpe", 2.5, "RPE"], ["dauer", 5, "Dauer"]])
    assert.match(V66.einheitPruefen(Object.assign({}, s, { [k]: v })), new RegExp(f), `${k} = ${v}`);
  const e = V66.einheit(s);
  assert.deepEqual([e.sport, e.titel, e.art, e.dauer, e.metrik, e.uhrzeit], ["rad", "Velo zur Arbeit", "eigen", 40, "rpe", "07:15"]);
  assert.deepEqual(e.teile, [["z2", 40]]);
  assert.deepEqual(e.minuten, { locker: 40, mittel: 0, hart: 0 }, "zählt in tid-1.0 wie jede Rad-Einheit");
  const m = V66.einheit(Object.assign({}, s, { sport: "mobility", rpe: 2 }));
  assert.deepEqual([m.teile, m.metrik], [[["ohne", 40]], undefined], "Mobility ohne Zone, ohne TL ≈");
  assert.ok(!V66.vorlagen("rad").some((v) => v.id === "eigen"), "nicht in den Vorlagen von «Training hinzufügen»");
  // in Mein Plan: hinzufügen, eigene Einheiten bleiben beim Verteilen an ihrem Tag
  const w = woche({}), ctx = ctxFuer(w, "2026-11-17");
  const r = V66.aendern(null, { art: "hinzufuegen", date: "2026-11-19", einheit: { vorlage: "eigen", titel: "Velo zur Arbeit", sport: "rad", dauer: 40, rpe: 4 } }, ctx);
  assert.equal(r.fehler, undefined);
  const t = V66.meinPlan(w, r.eintrag, {}).tage.find((x) => x.date === "2026-11-19");
  assert.ok(t.einheiten.some((x) => x.art === "eigen" && x.titel === "Velo zur Arbeit" && x.quelle === "eigen"));
  assert.match(V66.aendern(null, { art: "hinzufuegen", date: "2026-11-19", einheit: { vorlage: "eigen", titel: "", sport: "rad", dauer: 40, rpe: 4 } }, ctx).fehler, /Titel/);
});
