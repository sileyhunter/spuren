// Abnahmetests V8.1 «Daten zusammenführen» (js/v81.js): Nach dem Training (nachher-1.0), Puls zur Leistung (hf-leistung-1.0),
// Abweichung von der geplanten Last (last-abweichung-1.0), Anstieg der Belastung (anstieg-1.0). Alle Werte erfunden.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const V81 = require("../js/v81.js");

const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const HEUTE = "2027-01-20";

test("Versionen", () => {
  assert.deepEqual(V81.VERSIONS, { nachher: "nachher-1.1", hf_leistung: "hf-leistung-1.0", abweichung: "last-abweichung-1.0", anstieg: "anstieg-1.0" });
});

test("nachher-1.0: Garmins Selbsteinschätzung (workout_rpe 10–100, workout_feel 0–100) wie auf der Uhr", () => {
  assert.deepEqual(V81.garminSelbst(70, 75), { rpe_g: 7, feel_g: 75 });
  assert.deepEqual(V81.garminSelbst(null, 30), { feel_g: 25 });
  assert.deepEqual(V81.garminSelbst(0, 101), {}, "ausserhalb der Skala: nichts");
  assert.deepEqual(V81.garminSelbst(100, 0), { rpe_g: 10, feel_g: 0 });
  assert.deepEqual(["sehr schwach", "schwach", "normal", "stark", "sehr stark"], [0, 25, 50, 75, 100].map(V81.gefuehlWort));
  assert.equal(V81.gefuehlWort(null), null);
  const D = { garmin_selbst: { g123: { rpe_g: 6, feel_g: 50 }, g124: { rpe_g: null, feel_g: null } } };
  assert.deepEqual(V81.selbstVon(D, { gid: "g123" }), { rpe_g: 6, feel_g: 50 });
  assert.equal(V81.selbstVon(D, { gid: "g124" }), null, "abgerufen, aber nicht ausgefüllt");
  assert.equal(V81.selbstVon(D, { id: "z1" }), null, "ohne Garmin-ID");
});

test("nachher-1.0: gleiche Regel wie tools/notizen.py selbst_von (Nacht-Update)", () => {
  const werte = [[5, 0], [10, 12.4], [15, 12.5], [35, 37.5], [45, 62.5], [55, 87.5], [95, 100], [100, 50], [4, -1], [null, null], [101, 101]];
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(path.join(__dirname, "..", "tools"))})\nimport notizen\n`
    + `print(json.dumps([notizen.selbst_von(r, f) for r, f in ${JSON.stringify(werte).replace(/null/g, "None")}]))`;
  const py = JSON.parse(execFileSync("python3", ["-I", "-c", code], { encoding: "utf8" }));
  werte.forEach(([r, f], i) => {
    const js = V81.garminSelbst(r, f);
    assert.deepEqual({ rpe_g: js.rpe_g ?? null, feel_g: js.feel_g ?? null }, py[i], `workout_rpe ${r}, workout_feel ${f}`);
  });
});

test("nachher-1.0: was auf der Seite gespeichert ist, gilt vor der Uhr; offen, bis Erwartung oder RPE da sind", () => {
  const a = { id: "g1", gid: "g1", date: HEUTE, sport: "rad", mv: 3600, dur: 3900, tss: 70 };
  const nurUhr = V81.nachher(a, null, { rpe_g: 6, feel_g: 75 });
  assert.equal(nurUhr.rpe, 6); assert.equal(nurUhr.rpeQuelle, "uhr"); assert.equal(nurUhr.gefuehl, "stark"); assert.equal(nurUhr.gefuehlQuelle, "uhr");
  assert.equal(nurUhr.offen, true, "die Uhr allein beantwortet die Frage nach der Erwartung nicht");
  const seite = V81.nachher(a, { rpe: 4, gefuehl: "normal", erwartung: "leichter", intervalle: "alle", notiz: "gut" }, { rpe_g: 6, feel_g: 75 });
  assert.deepEqual([seite.rpe, seite.rpeQuelle, seite.gefuehl, seite.gefuehlQuelle, seite.erwartung, seite.intervalle, seite.offen], [4, "seite", "normal", "seite", "leichter", "alle", false]);
  assert.equal(V81.nachher(a, { erwartung: "schwerer" }, null).offen, false);
  assert.equal(V81.nachher(a, { erwartung: "irgendwie" }, null).erwartung, null, "nur bekannte Antworten");
});

test("nachher-1.0: Eintrag für die Liste «rpe» (Felder wie rpe-1.0, sRPE = RPE × Bewegungsminuten)", () => {
  const a = { id: "g1", gid: "g1", date: HEUTE, sport: "lauf", mv: 2700, dur: 3000, tss: 54.4 };
  const e = V81.eintrag(a, { rpe: 5, gefuehl: "stark", erwartung: "wie erwartet", intervalle: "keine", notiz: "  Wade etwas fest  " }, "2027-01-20T18:00:00Z", { rpe_g: 6, feel_g: 50 });
  assert.deepEqual(e, { id: "g1", act: "g1", datum: HEUTE, sport: "lauf", rpe: 5, gefuehl: "stark", erwartung: "wie erwartet", intervalle: "keine",
    notiz: "Wade etwas fest", srpe: 225, tl: 54, quelle: "seite", v: "nachher-1.1", erfasst: "2027-01-20T18:00:00Z", rpe_uhr: 6, feel_uhr: 50 });
  assert.equal(V81.eintrag(a, { rpe: 0 }), null, "RPE 1–10");
  assert.equal(V81.eintrag(a, { rpe: 5.5 }), null, "ganze Zahl");
  assert.equal(V81.eintrag(a, { rpe: 11 }), null);
  assert.equal(V81.eintrag({ id: "x" }, { rpe: 5 }), null, "ohne Datum");
  const ohne = V81.eintrag(Object.assign({}, a, { mv: undefined }), { rpe: 4, gefuehl: "zäh", erwartung: "?" });
  assert.equal(ohne.srpe, 200, "ohne Bewegungszeit die Dauer"); assert.equal(ohne.gefuehl, null); assert.equal(ohne.erwartung, null);
  assert.equal(V81.eintrag(a, { rpe: 3, notiz: "x".repeat(600) }).notiz.length, 500);
});

/** Aktivität mit einem gleichmässigen 10-min-Block (eb-1.0). */
const mitBlock = (nr, date, hr, extra) => Object.assign({ id: "a" + nr, gid: "g" + nr, date, sport: "rad", indoor: true, typ: "rolle", tss: 60,
  eb: { art: "r200", hr, w: 200, n: 1 } }, extra || {});

test("hf-leistung-1.0: gleichmässige Blöcke derselben Art gegen die 60 Tage davor (mindestens vier)", () => {
  const ref = [138, 141, 140, 139, 142].map((hr, i) => mitBlock(i + 1, addDays(HEUTE, -5 * (i + 1)), hr));
  const hoch = mitBlock(99, HEUTE, 152), H = V81.pulsZurLeistung(ref.concat([hoch]), hoch);
  assert.equal(H.quelle, "eb"); assert.equal(H.n_ref, 5); assert.equal(H.urteil, "höher"); assert.equal(H.delta, 12); assert.equal(H.grenze, 6, "mindestens 6 Schläge");
  assert.equal(V81.pulsZurLeistung(ref, mitBlock(98, HEUTE, 145)).urteil, "wie üblich", "+5 liegt im Rauschen");
  assert.equal(V81.pulsZurLeistung(ref, mitBlock(97, HEUTE, 132)).urteil, "tiefer");
  // grosse Streuung der Vergleiche: Grenze wächst mit
  const breit = [130, 150, 128, 152, 140].map((hr, i) => mitBlock(10 + i, addDays(HEUTE, -3 * (i + 1)), hr)), B = V81.pulsZurLeistung(breit, mitBlock(96, HEUTE, 150));
  assert.ok(B.grenze > 10, `Grenze ${B.grenze}`); assert.equal(B.urteil, "wie üblich");
  // andere Blockart, anderes System, zu alt, gleicher Tag zählen nicht
  const fremd = [mitBlock(20, addDays(HEUTE, -2), 120, { eb: { art: "r220", hr: 120 } }), mitBlock(21, addDays(HEUTE, -3), 120, { indoor: false, typ: "rennrad" }),
    mitBlock(22, addDays(HEUTE, -70), 120), mitBlock(23, HEUTE, 120)];
  const W = V81.pulsZurLeistung(ref.slice(0, 3).concat(fremd), mitBlock(95, HEUTE, 152));
  assert.equal(W.urteil, "zu wenig Daten", "nur drei passende Blöcke");
  // Hitze und Höhe als Vorbehalt
  assert.deepEqual(V81.pulsZurLeistung(ref, mitBlock(94, HEUTE, 152, { eb: { art: "r200", hr: 152, t: 28, alt: 1800 } })).vorbehalte, ["warm (28 °C)", "Höhe 1800 m"]);
  assert.equal(V81.pulsZurLeistung(ref, { id: "s", sport: "schwimm", date: HEUTE }).urteil, "zu wenig Daten", "nur Rad und Laufen");
});

/** Aktivität mit Schritten eines Workouts auf der Uhr (plan-1.0). */
const mitSchritten = (nr, date, schritte, extra) => Object.assign({ id: "w" + nr, gid: "gw" + nr, date, sport: "rad", indoor: true, tss: 80,
  wk: { schritte: schritte.map(([typ, s, w, hr]) => ({ typ, ist_s: s, w, hr })) } }, extra || {});

test("hf-leistung-1.0: ohne Blöcke die Abschnitte eines Workouts mit gleicher Leistung (±5 %) und ähnlicher Dauer (Median)", () => {
  const S = (hr) => [["einlaufen", 600, 150, 120], ["intervall", 480, 250, hr], ["erholung", 240, 120, 130], ["intervall", 480, 252, hr + 2]];
  const ref = [150, 152, 149, 151].map((hr, i) => mitSchritten(i + 1, addDays(HEUTE, -7 * (i + 1)), S(hr)));
  const H = V81.pulsZurLeistung(ref, mitSchritten(9, HEUTE, S(160)));
  assert.equal(H.quelle, "wk"); assert.equal(H.n, 2, "zwei aktive Abschnitte"); assert.equal(H.urteil, "höher"); assert.ok(H.delta >= 8.5 && H.delta <= 10, `Δ ${H.delta}`);
  // andere Leistung (+10 %) oder viel kürzere Abschnitte sind nicht vergleichbar
  const anders = [150, 152, 149, 151].map((hr, i) => mitSchritten(20 + i, addDays(HEUTE, -7 * (i + 1)), [["intervall", 480, 280, hr], ["intervall", 200, 250, hr]]));
  assert.equal(V81.pulsZurLeistung(anders, mitSchritten(29, HEUTE, S(160))).urteil, "zu wenig Daten");
  // Abschnitte unter 4 min zählen nie
  const kurz = [150, 152, 149].map((hr, i) => mitSchritten(30 + i, addDays(HEUTE, -7 * (i + 1)), [["intervall", 180, 250, hr]]));
  assert.equal(V81.pulsZurLeistung(kurz, mitSchritten(39, HEUTE, [["intervall", 180, 250, 170]])).urteil, "zu wenig Daten");
});

test("hf-leistung-1.0 mit «Nach dem Training»: Satz zur Einheit, nie eine Planänderung", () => {
  const H = (urteil, delta) => ({ urteil, delta });
  assert.equal(V81.hinweis({ erwartung: "schwerer" }, H("höher", 9)).art, "warn");
  assert.match(V81.hinweis({ erwartung: "schwerer" }, H("höher", 9)).text, /\+9 bpm.*ändert den Plan nicht/);
  assert.equal(V81.hinweis({ rpe: 8 }, H("höher", 7), { stufe: "locker" }).art, "warn", "RPE 8 bei einer lockeren Einheit gilt als schwerer");
  assert.equal(V81.hinweis({ rpe: 8 }, H("wie üblich", 1), { stufe: "hart" }), null, "RPE 8 bei einer harten Einheit ist normal");
  assert.match(V81.hinweis({ erwartung: "schwerer" }, H("wie üblich", 2)).text, /Beine|Kopf/);
  assert.equal(V81.hinweis({ erwartung: "leichter" }, H("tiefer", -8)).art, "gut");
  assert.match(V81.hinweis({ erwartung: "leichter" }, H("tiefer", -8)).text, /nicht gesteigert/);
  assert.equal(V81.hinweis({ erwartung: "wie erwartet" }, H("wie üblich", 0)), null);
  assert.equal(V81.hinweis(null, { urteil: "zu wenig Daten" }), null);
});

test("last-abweichung-1.0: gemessene Last gegen TL ≈ der geplanten Einheit (ab 1,3× und +15 bzw. bis 0,7× und −15)", () => {
  const u = (plan, ist) => { const r = V81.abweichung(plan, { tss: ist }); return r && r.urteil; };
  assert.equal(u(60, 80), "mehr als geplant");
  assert.equal(u(60, 75), "wie geplant", "1,25×");
  assert.equal(u(30, 40), "wie geplant", "1,33×, aber nur 10 mehr");
  assert.equal(u(100, 65), "weniger als geplant");
  assert.equal(u(40, 27), "wie geplant", "0,68×, aber nur 13 weniger");
  assert.equal(V81.abweichung(null, { tss: 50 }), null); assert.equal(V81.abweichung(50, { tss: null }), null); assert.equal(V81.abweichung(0, { tss: 50 }), null);
  assert.deepEqual(V81.abweichung(64.4, { tss: 90.6 }), { plan: 64, ist: 91, faktor: 1.41, urteil: "mehr als geplant", v: "last-abweichung-1.0" });
});

test("anstieg-1.0: langfristig, aktuell und geplant", () => {
  // Fortschreiben wie FK.pmc: gleich bleibende Last nähert Fitness und Ermüdung an diese Last
  const P = V81.projektion({ fitness: 50, ermuedung: 50 }, Array(400).fill(70));
  assert.ok(Math.abs(P[399].fitness - 70) < 0.1 && Math.abs(P[399].ermuedung - 70) < 0.01);
  assert.equal(V81.projektion({ fitness: 50, ermuedung: 40 }, [0])[0].fitness, 50 - 50 / 42);
  const A = V81.anstieg({ fitness: 60, ermuedung: 66 }, { fitness: 50 }, null);
  assert.deepEqual([A.lang.proz, A.lang.status, A.kurz.wert, A.kurz.stufe, A.urteil, A.geplant], [20, "steigt", 1.1, "üblich", "steigt", null]);
  assert.equal(V81.anstieg({ fitness: 60, ermuedung: 57 }, { fitness: 59 }).lang.status, "stabil");
  assert.equal(V81.anstieg({ fitness: 50, ermuedung: 30 }, { fitness: 60 }).lang.status, "sinkt");
  assert.equal(V81.anstieg({ fitness: 50, ermuedung: 30 }, { fitness: 60 }).kurz.stufe, "wenig");
  const Z = V81.anstieg({ fitness: 50, ermuedung: 80 }, { fitness: 48 });
  assert.equal(Z.urteil, "zu schnell"); assert.equal(Z.kurz.stufe, "sehr hoch"); assert.match(Z.text.join(" "), /zu schnell/);
  // geplant: drei Wochen mit viel mehr Last → Status über 1,5
  const G = V81.anstieg({ fitness: 50, ermuedung: 50 }, { fitness: 50 }, Array(21).fill(120));
  assert.equal(G.geplant.status, "zu schnell"); assert.ok(G.geplant.max > 1.5); assert.equal(G.geplant.tage, 21); assert.ok(G.geplant.proz > 5);
  const R = V81.anstieg({ fitness: 50, ermuedung: 50 }, { fitness: 50 }, Array(21).fill(50));
  assert.equal(R.geplant.status, "stabil");
  assert.equal(V81.anstieg({ fitness: 0.5, ermuedung: 1 }, null), null, "ohne Fitness kein Urteil");
  assert.equal(V81.anstieg({ fitness: 40, ermuedung: 40 }, null).lang.status, "unbekannt");
});

test("nachher-1.1: Magen und Energie ab 60 min (nicht Schwimmen, nicht Krafttraining), nur bekannte Werte", () => {
  const lang = { id: "g2", date: HEUTE, sport: "rad", mv: 5400, dur: 5600 }, kurz = { id: "g3", date: HEUTE, sport: "lauf", mv: 3000 };
  assert.equal(V81.mitVerpflegung(lang), true);
  assert.equal(V81.mitVerpflegung(kurz), false, "unter 60 min");
  assert.equal(V81.mitVerpflegung({ id: "g4", date: HEUTE, sport: "schwimm", mv: 4000 }), false);
  assert.equal(V81.mitVerpflegung({ id: "g5", date: HEUTE, sport: "kraft", mv: 5400 }), false);
  const e = V81.eintrag(lang, { rpe: 6, magen: "leicht", energie: "nachgelassen" }, "2027-01-20T18:00:00Z");
  assert.equal(e.magen, "leicht"); assert.equal(e.energie, "nachgelassen");
  const f = V81.eintrag(lang, { rpe: 6, magen: "schlecht", energie: "?" }, "2027-01-20T18:00:00Z");
  assert.equal("magen" in f, false, "unbekannter Wert fällt weg"); assert.equal("energie" in f, false);
  const X = V81.nachher(lang, e, null);
  assert.equal(X.magen, "leicht"); assert.equal(X.energie, "nachgelassen");
  assert.equal(V81.nachher(lang, null, null).magen, null);
});
