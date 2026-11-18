// Abnahmetests V7.4 Etappe 6 (js/v74.js): Ampel passt das Training an (ampel-plan-1.0), «Woche anpassen?» (eigenplan-1.2),
// lockere Fassung im Garmin-Auftrag. Alle Werte sind erfunden (keine persönlichen Werte im öffentlichen Repository).
// Aufruf: node --test tests/test_v74.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V74 = require("../js/v74.js");
const FK = require("../js/formkurve.js");

const SK = {   // erfundenes Zonenprofil
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
};
const MO = "2026-11-16", DI = "2026-11-17", MI = "2026-11-18", DO = "2026-11-19", FR = "2026-11-20", SA = "2026-11-21", SO = "2026-11-22";
const plan = (o, eintrag) => V66.meinPlan(V64.woche(Object.assign({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" }, o)), eintrag || null, {});
const tag = (w, d) => w.tage.find((t) => t.date === d);
const ids = (w, d) => tag(w, d).einheiten.map((e) => e.id);
const vorsichtig = (gr) => ({ status: "vorsichtig", ampel: "vorsichtig", gruende: gr || ["HRV 7 Tage deutlich unter Referenz"] });
const standVon = (m) => (d) => m[d] || null;

/* ---------------- Entscheid je Tag ---------------- */
test("ampel-plan-1.0: jede Ampelstufe → Entscheid; ohne Morgenwerte zählt nur der Check-in", () => {
  assert.equal(V74.VERSIONS.ampelplan, "ampel-plan-1.2");
  const r = (status, extra) => Object.assign({ datum: DI, status, alle_gruende: [{ w: 7, txt: "HRV deutlich unter Referenz", kind: "hrv" }, { w: 1, txt: "Schlaf 7,5 h", kind: "schlaf+" }],
    indikatoren: { befinden: { status: "gut" } } }, extra || {});
  for (const st of ["bereit", "normal", "nicht beurteilbar"]) assert.equal(V74.entscheid(r(st), { morgenwerte: true }).status, "wie_geplant", st);
  assert.match(V74.entscheid(r("normal"), { morgenwerte: true }).hinweis, /Gefühl/);
  const v = V74.entscheid(r("vorsichtig"), { morgenwerte: true });
  assert.equal(v.status, "vorsichtig"); assert.deepEqual(v.gruende, ["HRV deutlich unter Referenz"], "nur die Warnzeichen als Grund");
  // ohne Morgenwerte: eine «vorsichtig»-Ampel aus alten Werten zählt nicht, das Befinden schon
  const ohne = V74.entscheid(r("vorsichtig"), { morgenwerte: false });
  assert.equal(ohne.status, "wie_geplant"); assert.match(ohne.hinweis, /nur der Check-in/);
  const bel = V74.entscheid(r("vorsichtig", { alle_gruende: [{ w: 8, txt: "Befinden: Beine 7/7 (deine Angabe)", kind: "befinden" }], indikatoren: { befinden: { status: "belastet" } } }), { morgenwerte: false });
  assert.equal(bel.status, "vorsichtig"); assert.deepEqual(bel.gruende, ["Befinden: Beine 7/7 (deine Angabe)"]);
  // Krankheitszeichen: immer Ruhetag
  const k = V74.entscheid(r("vorsichtig", { indikatoren: { befinden: { status: "gut" }, krank: { status: "angegeben", zeichen: ["Fieber"] } } }), { morgenwerte: false });
  assert.equal(k.status, "krank"); assert.match(k.gruende[0], /Fieber/); assert.match(k.hinweis, /ärztlich/);
  assert.equal(V74.entscheid(null).status, "wie_geplant");
  assert.equal(V74.morgenwerte([{ date: DI, sleepH: 7.2 }], DI), true);
  assert.equal(V74.morgenwerte([{ date: DI, rhr: 48 }], DI), false, "Ruhepuls allein sind keine Morgenwerte der Nacht");
  assert.equal(V74.morgenwerte([{ date: MO, hrv: 60 }], DI), false);
});

test("ampel-plan-1.0 mit FK.readiness: Befinden belastet → vorsichtig, mit und ohne Morgenwerte", () => {
  const days = [];
  for (let i = 70; i >= 0; i--) {
    const d = new Date(Date.parse(DI + "T12:00:00Z") - i * 864e5).toISOString().slice(0, 10);
    if (i > 0) days.push({ date: d, hrv: 60 + ((i * 7) % 9) - 4, rhr: 50 + (i % 3) - 1, sleepH: 7.4 + ((i % 5) - 2) / 10 });
  }
  const bef = [{ date: DI, skala: 7, v: "befinden-2.0", schlaf: 2, muede: 7, muskel: 3, stress: 2 }];
  const ohne = FK.readiness(days, [], bef, DI);
  assert.equal(ohne.status, "vorsichtig");
  assert.equal(V74.entscheid(ohne, { morgenwerte: V74.morgenwerte(days, DI) }).status, "vorsichtig", "Check-in allein reicht");
  const mit = days.concat([{ date: DI, hrv: 61, rhr: 50, sleepH: 7.5 }]);
  const gut = FK.readiness(mit, [], [], DI);
  assert.ok(["bereit", "normal"].includes(gut.status), gut.status);
  assert.equal(V74.entscheid(gut, { morgenwerte: V74.morgenwerte(mit, DI) }).status, "wie_geplant");
});

/* ---------------- Einheiten ---------------- */
test("ampel-plan-1.0: lockere Fassung – gleiche Sportart, nie härter, nie länger; lang höchstens zwei Drittel; Tests verschieben", () => {
  const sw = V64.einheit("schwimm_css", { d: 45, css_s: 100 });
  for (const [id, o, neu] of [["rad_vo2", {}, "rad_locker"], ["lauf_vo2", {}, "lauf_locker"], ["rad_schwelle", {}, "rad_locker"], ["lauf_laktat", {}, "lauf_locker"],
    ["rad_tempo", {}, "rad_locker"], ["aktivierung", {}, "rad_locker"], ["lauf_koppel", { d: 20 }, "lauf_locker"]]) {
    const e = Object.assign(V64.einheit(id, o), { uid: "u-" + id, quelle: "vorschlag" });
    const n = V74.locker(e, {});
    assert.equal(n.id, neu, id); assert.equal(n.sport, e.sport); assert.equal(n.uid, e.uid);
    assert.ok(n.dauer <= e.dauer, id + ": nie länger"); assert.equal(V74.istHart(n), false, id + ": nie härter");
    assert.match(n.titel, /\(Ampel\)$/); assert.equal(n.ampel.von.titel, e.titel);
  }
  const n = V74.locker(Object.assign(sw, { uid: "s1" }), { css_s: 100 });
  assert.equal(n.id, "schwimm_locker"); assert.equal(n.dauer, 45);
  // lange Einheiten: zwei Drittel, Renntempo-Abschnitte fallen weg
  const lang = V74.locker(Object.assign(V64.einheit("rad_lang", { d: 180 }), { uid: "l" }), {});
  assert.equal(lang.id, "rad_lang"); assert.equal(lang.dauer, 120);
  const rt = V74.locker(Object.assign(V64.einheit("lauf_lang_rt", { d: 100 }), { uid: "l2" }), {});
  assert.equal(rt.id, "lauf_lang"); assert.equal(rt.dauer, 65); assert.equal(V74.istHart(rt), false);
  const kurzLang = V74.locker(Object.assign(V64.einheit("rad_lang", { d: 120 }), { uid: "l3" }), {});
  assert.equal(kurzLang.id, "rad_locker", "unter der kürzesten langen Ausfahrt: locker"); assert.equal(kurzLang.dauer, 80);
  assert.equal(V74.locker(Object.assign(V64.einheit("rad_locker", { d: 120 }), { uid: "l4" }), {}).dauer, 80, "über 90 min gilt als lang");
  // bleibt: lockere Einheiten bis 90 min, Schwimmkurs, Kraft, gesperrt
  assert.equal(V74.locker(Object.assign(V64.einheit("rad_locker", { d: 60 }), { uid: "x" }), {}), null);
  assert.equal(V74.locker(Object.assign(V64.einheit("schwimm_kurs", { d: 60 }), { uid: "x" }), {}), null);
  assert.equal(V74.locker(V66.einheit({ uid: "k", vorlage: "kraft", dauer: 40, quelle: "eigen" }, {}), {}), null);
  assert.equal(V74.locker(Object.assign(V64.einheit("rad_vo2", {}), { uid: "g", gesperrt: true }), {}), null);
  // Test: locker statt messen, Hinweis zum Verschieben
  const t = V74.locker(Object.assign(V64.einheit("test_rad", {}), { uid: "t", test: "stufentest" }), {});
  assert.equal(t.id, "rad_locker"); assert.equal(t.dauer, 60); assert.match(t.ampel.grund[0], /Testkalender/);
  // Bibliothek: Stufe aus den Zielen; unbekannt gilt als hart; wird eigene lockere Einheit
  const bib = V66.einheit({ uid: "b", quelle: "bibliothek", wid: 7, sport: "rad", titel: "Enduco VO2max", dauer: 70 }, { bibStufe: () => "alles" });
  const nb = V74.locker(bib, {}); assert.equal(nb.id, "rad_locker"); assert.equal(nb.quelle, "eigen"); assert.equal(nb.dauer, 70);
  assert.equal(V74.locker(V66.einheit({ uid: "b2", quelle: "bibliothek", wid: 8, sport: "lauf", titel: "Grundlage", dauer: 50 }, { bibStufe: () => "locker" }), {}), null);
  assert.equal(V74.nachholbar(bib), true); assert.equal(V74.nachholbar(V64.einheit("rad_lang_rt", { d: 180 })), false, "lange Einheit wird nur kürzer");
  // Uhrzeit und Metrik bleiben
  const m = V74.locker(Object.assign(V64.einheit("lauf_vo2", {}), { uid: "m", uhrzeit: "06:30", metrik: "puls", quelle: "eigen" }), {});
  assert.equal(m.uhrzeit, "06:30"); assert.equal(m.metrik, "puls"); assert.equal(m.quelle, "eigen");
});

/* ---------------- Woche ---------------- */
test("ampel-plan-1.0: «vorsichtig» lockert die Einheiten des Tages, Mein Plan bleibt; ohne Entscheid dieselbe Woche", () => {
  const w = plan();
  assert.equal(V74.woche(w, () => null), w);
  assert.equal(V74.woche(w, standVon({ [DI]: { status: "wie_geplant" } })), w);
  const a = V74.woche(w, standVon({ [DI]: vorsichtig() }));
  assert.deepEqual(ids(a, DI), ["lauf_locker", "schwimm_kurs"]);
  assert.deepEqual(ids(w, DI), ["lauf_vo2", "schwimm_kurs"], "die Woche selbst bleibt unverändert");
  const A = tag(a, DI).ampel;
  assert.equal(A.status, "vorsichtig"); assert.equal(A.geaendert.length, 1); assert.equal(A.geaendert[0].von.id, "lauf_vo2");
  assert.equal(tag(a, DI).einheiten[0].uid, tag(w, DI).einheiten[0].uid, "gleiche Kennung (Garmin-Stand, Einheit-Seite)");
  assert.ok(a.minuten.lauf <= w.minuten.lauf && a.zonen.hart < w.zonen.hart, "Summen mit dem, was gilt");
  // nie härter, nie länger, nie eine andere Sportart – über alle Tage
  const alle = V74.woche(w, (d) => vorsichtig());
  for (const t of alle.tage) {
    const vor = tag(w, t.date).einheiten;
    t.einheiten.forEach((e, i) => { const x = vor.find((y) => y.uid === e.uid) || vor[i]; assert.equal(e.sport, x.sport); assert.ok(e.dauer <= x.dauer); assert.equal(V74.istHart(e), false, e.titel); });
  }
});

test("ampel-plan-1.2: Nachholen nur als Vorschlag – passender kommender Tag mit Abstand zu harten Einheiten, sonst entfällt sie (gemeldet)", () => {
  const w = plan();
  const nie = (x) => assert.ok(!x.tage.some((t) => t.einheiten.some((e) => e.ampel && e.ampel.nachgeholt)), "nie von selbst nachgeholt");
  // Di Lauf-Schlüssel fällt aus; Fr (lockerer Lauf) liegt direkt nach dem Rad-Schlüssel am Do → kein passender Tag
  const a = V74.woche(w, standVon({ [DI]: vorsichtig() }));
  assert.deepEqual(ids(a, FR), ids(w, FR));
  assert.equal(tag(a, DI).ampel.weg.length, 1); assert.match(tag(a, DI).ampel.weg[0].grund, /kein passender Tag/);
  assert.ok(a.hinweise.some((h) => /entfällt/.test(h)));
  // ist der Do ebenfalls «vorsichtig», wird der Fr frei: Vorschlag für den Fr (an Stelle des lockeren Laufs) – der Plan selbst bleibt
  const b = V74.woche(w, standVon({ [DI]: vorsichtig(), [DO]: vorsichtig() }));
  assert.deepEqual(ids(b, FR), ["lauf_locker"], "Fr bleibt, bis du den Vorschlag annimmst"); nie(b);
  const N = tag(b, DI).ampel.nachholen;
  assert.equal(N.length, 1);
  const X = tag(w, FR).einheiten[0], U = tag(w, DI).einheiten[0];
  assert.equal(N[0].nach, FR); assert.equal(N[0].vorschlag, true); assert.equal(N[0].von_uid, U.uid); assert.equal(N[0].ziel.uid, X.uid);
  assert.ok(N[0].dauer <= X.dauer && U.dauer > N[0].dauer, "nie länger: die kurze Fassung passt in den lockeren Lauf");
  assert.deepEqual([N[0].spec.vorlage, N[0].spec.quelle, N[0].spec.dauer], ["lauf_vo2", "eigen", N[0].dauer]);
  assert.equal(V66.einheitPruefen(Object.assign({ uid: X.uid }, N[0].spec)), null, "gültige Einheit für «ersetzen»");
  assert.ok(b.hinweise.some((h) => /nachholen am Freitag möglich/.test(h)), b.hinweise.join(" | "));
  // Rad-Schlüssel vom Do: kein lockeres Rad mehr in der Woche → entfällt
  assert.ok(tag(b, DO).ampel.weg.some((x) => /kein passender Tag/.test(x.grund)));
  // ein Tag mit eigenem Entscheid (vergangen oder heute) ist nie Ziel: Fr «vorsichtig» → kein Vorschlag
  const c = V74.woche(w, standVon({ [DI]: vorsichtig(), [DO]: vorsichtig(), [FR]: vorsichtig() }));
  assert.deepEqual(ids(c, FR), ["lauf_locker"]); nie(c);
  assert.equal(tag(c, DI).ampel.nachholen.length, 0);
  assert.equal(tag(c, FR).einheiten[0].dauer, tag(w, FR).einheiten[0].dauer, "der geplante lockere Lauf, nicht länger");
  // CSS-Schwimmen vom Do: Vorschlag für den So (an Stelle des lockeren Schwimmens; 12 h: drei Schwimm-Einheiten)
  const w12 = plan({ stunden: 12, css_s: 100 });
  const d = V74.woche(w12, standVon({ [DO]: vorsichtig() }));
  assert.ok(!ids(d, SO).includes("schwimm_css"), ids(d, SO).join(", ")); nie(d);
  assert.equal(tag(d, DO).ampel.nachholen[0].nach, SO); assert.equal(tag(d, DO).ampel.nachholen[0].spec.vorlage, "schwimm_css");
});

test("ampel-plan-1.0: nicht vor Test oder Rennen, Verfügbarkeit, Rennwoche ohne Nachholen", () => {
  // Stufentest am Sa: Fr ist Vortag eines Tests → kein Nachholen am Fr
  const wt = plan({ tests: [{ date: SA, kind: "stufentest", sport: "rad", status: "geplant" }] });
  const a = V74.woche(wt, standVon({ [DI]: vorsichtig(), [DO]: vorsichtig() }));
  assert.ok(!ids(a, FR).includes("lauf_vo2")); assert.ok(tag(a, DI).ampel.nachholen.every((x) => x.nach !== FR), "kein Vorschlag am Vortag eines Tests");
  // Verfügbarkeit am Fr zu knapp für den Schlüssel → entfällt
  const w = plan();
  const verf = (d) => (d === FR ? { min: 40, sport: null } : null);
  const b = V74.woche(w, standVon({ [DI]: vorsichtig(), [DO]: vorsichtig() }), { verf });
  assert.ok(!ids(b, FR).includes("lauf_vo2")); assert.ok(tag(b, DI).ampel.nachholen.every((x) => x.nach !== FR), "kein Vorschlag ohne genug Zeit");
  // Rennwoche: lockern ja, verschieben nie
  const wr = plan({ rennen: [{ date: SO, name: "Testrennen", short: "Test" }] });
  const c = V74.woche(wr, standVon({ [DI]: vorsichtig() }));
  assert.ok(!ids(c, DI).some((x) => /vo2/.test(x)));
  assert.match(tag(c, DI).ampel.weg[0].grund, /Rennwoche/);
  // Test unter «vorsichtig»: locker statt messen
  const d = V74.woche(wt, standVon({ [SA]: vorsichtig() }));
  assert.ok(ids(d, SA).includes("rad_locker") && !ids(d, SA).includes("test_rad"), ids(d, SA).join(", "));
});

test("ampel-plan-1.0: Krankheitszeichen = Ruhetag ohne Nachholen; gesperrte Einheiten und Tage bleiben; «Trotzdem wie geplant»", () => {
  const w = plan();
  const k = V74.woche(w, standVon({ [DO]: { status: "krank", gruende: ["Krankheitszeichen angegeben (Fieber)"] } }));
  assert.deepEqual(ids(k, DO), []); assert.equal(tag(k, DO).ruhetag, true);
  assert.equal(tag(k, DO).ampel.geaendert.length, 2); assert.equal(tag(k, DO).ampel.nachholen.length + tag(k, DO).ampel.weg.length, 0);
  // gesperrte Einheit (Di Lauf-Schlüssel) bleibt
  const E = { id: "wo-" + MO, montag: MO, tage: { [DI]: { gesperrt: false, einheiten: [{ uid: "g1", vorlage: "lauf_vo2", dauer: 50, quelle: "vorschlag", gesperrt: true }, { uid: "g2", vorlage: "schwimm_kurs", dauer: 45, quelle: "vorschlag" }] } } };
  const wg = plan({}, E);
  const g = V74.woche(wg, standVon({ [DI]: vorsichtig() }));
  assert.deepEqual(ids(g, DI), ["lauf_vo2", "schwimm_kurs"]); assert.deepEqual(tag(g, DI).ampel.gesperrt, [tag(wg, DI).einheiten[0].titel]);
  assert.deepEqual(ids(V74.woche(wg, standVon({ [DI]: { status: "krank" } })), DI), ["lauf_vo2"], "auch bei Krankheitszeichen: gesperrt bleibt (nur Hinweis)");
  // gesperrter Tag
  const ET = { id: "wo-" + MO, montag: MO, tage: { [DO]: { gesperrt: true, einheiten: null } } };
  const wt = plan({}, ET);
  assert.deepEqual(ids(V74.woche(wt, standVon({ [DO]: vorsichtig() })), DO), ids(wt, DO));
  // Trotzdem wie geplant: gilt nur für diesen Tag
  const t = V74.woche(w, standVon({ [DI]: Object.assign(vorsichtig(), { trotzdem: true }), [DO]: vorsichtig() }));
  assert.deepEqual(ids(t, DI), ids(w, DI)); assert.equal(tag(t, DI).ampel.trotzdem, true);
  assert.ok(!ids(t, DO).includes("rad_vo2"));
});

test("ampel-plan-1.0: Serie von Tagen «vorsichtig»; Eintrag, Prüfung und Zusammenführen", () => {
  const S = { "2026-11-15": vorsichtig(), [MO]: { status: "krank" }, [DI]: vorsichtig() };
  assert.equal(V74.serie(standVon(S), DI), 3); assert.equal(V74.serie(standVon(S), MI), 0);
  assert.equal(V74.SERIE, 3);
  const e = V74.entscheid({ datum: DI, status: "vorsichtig", alle_gruende: [{ w: 7, txt: "HRV", kind: "hrv" }], indikatoren: {} }, { morgenwerte: true });
  const x = V74.eintrag(e, { quelle: "morgen-update", jetzt: "2026-11-17T06:05:00Z" });
  assert.equal(x.id, "aa-" + DI); assert.equal(V74.pruefen(x), null);
  for (const [k, v, f] of [["status", "hart", /Entscheid/], ["id", "aa-2026-11-18", /ID/], ["geaendert", "2026-11-25T06:00:00Z", /selben Tag/], ["quelle", "chat", /Quelle/],
    ["gruende", ["x".repeat(400)], /Gründe/], ["trotzdem", { an: "ja", am: "2026-11-17T08:00:00Z" }, /Trotzdem/], ["ampel", "rot", /Ampel/]])
    assert.match(V74.pruefen(Object.assign({}, x, { [k]: v })), f, k);
  // Gerät und Daten: Entscheid aus der neueren Fassung, «Trotzdem» aus der zuletzt gedrückten
  const seite = Object.assign({}, x, { quelle: "seite", geaendert: "2026-11-17T05:30:00Z", trotzdem: { an: true, am: "2026-11-17T05:31:00Z" } });
  const z = V74.zusammen(seite, x);
  assert.equal(z.quelle, "morgen-update"); assert.equal(z.trotzdem.an, true);
  const spaeter = Object.assign({}, x, { geaendert: "2026-11-17T09:00:00Z", trotzdem: { an: false, am: "2026-11-17T09:00:00Z" } });
  assert.equal(V74.zusammen(seite, spaeter).trotzdem.an, false);
  assert.equal(V74.ausEintrag(z).trotzdem, true);
  assert.equal(V74.gespeichert(DI, [x], [seite]).trotzdem.an, true);
  assert.equal(V74.gespeichert(MI, [x]), null);
});

/* ---------------- Woche anpassen (eigenplan-1.2) und Garmin ---------------- */
test("eigenplan-1.2: «Woche anpassen?» – Rest der Woche als Erholungswoche, vergangene und gesperrte Tage bleiben", () => {
  assert.equal(V66.VERSIONS.eigenplan, "eigenplan-1.2");
  const w = V64.woche({ woche: MO, phase: "Grundlage", stunden: 9, modell: "polarisiert" });
  const erh = V64.woche({ woche: MO, phase: "Grundlage", stunden: 6, modell: "polarisiert", erholung: true });
  const E0 = { id: "wo-" + MO, montag: MO, tage: { [SA]: { gesperrt: true, einheiten: null } } };
  const ctx = { heute: MI, montag: MO, jetzt: "2026-11-18T07:30:00Z", vorschlag: (d) => tag(w, d).einheiten, erholung: (d) => tag(erh, d).einheiten };
  const r = V66.aendern(E0, { art: "erholung" }, ctx);
  assert.ok(!r.fehler, r.fehler); const E = r.eintrag;
  assert.equal(E.erholung.ab, MI); assert.equal(E.ganz, true);
  assert.deepEqual(E.tage[DI].einheiten.map((s) => s.vorlage), tag(w, DI).einheiten.map((e) => e.id), "vergangene Tage bleiben (eingefroren)");
  assert.equal(E.tage[DI].eingefroren, true);
  assert.deepEqual(E.tage[DO].einheiten.map((s) => s.vorlage), tag(erh, DO).einheiten.map((e) => e.id));
  assert.equal(E.tage[SA].gesperrt, true);
  assert.deepEqual(E.tage[SA].einheiten.map((s) => s.vorlage), tag(w, SA).einheiten.map((e) => e.id), "gesperrter Tag bleibt beim Vorschlag");
  const mp = V66.meinPlan(w, E, {});
  assert.equal(mp.erholung_ab, MI);
  assert.ok(mp.minuten.total < V66.meinPlan(w, null, {}).minuten.total);
  assert.match(V66.aendern(E0, { art: "erholung" }, Object.assign({}, ctx, { erholung: null })).fehler, /nicht berechenbar/);
  assert.match(V66.aendern(E0, { art: "erholung" }, Object.assign({}, ctx, { heute: "2026-11-23" })).fehler, /keine änderbaren Tage/);
});

test("garmin-senden mit Ampel: der Auftrag trägt zu harten Einheiten die lockere Fassung", () => {
  const w = plan();
  const L = tag(w, DI).einheiten.concat(tag(w, MI).einheiten);
  const a = V66.garminAuftrag(DI, L, SK, "senden", "2026-11-16T20:00:00Z", { ampel: (e) => V74.locker(e, {}) });
  const vo2 = a.einheiten.find((u) => u.uid === L[0].uid), rad = a.einheiten.find((u) => u.uid === L[2].uid);
  assert.ok(vo2.ampel, "Lauf-Schlüssel mit lockerer Fassung");
  assert.match(vo2.ampel.titel, /Lauf locker.*\(Ampel\)/); assert.match(vo2.ampel.workout.workoutName, /^IN · Lauf locker/);
  assert.notEqual(vo2.ampel.fassung, vo2.fassung);
  assert.ok(!vo2.ampel.workout.workoutSegments[0].workoutSteps.some((s) => s.type === "RepeatGroupDTO"), "ohne Intervalle");
  assert.equal(rad.ampel, undefined, "lockere Einheit braucht keine zweite Fassung");
  assert.ok(!V66.garminAuftrag(DI, L, SK, "senden", "2026-11-16T20:00:00Z").einheiten.some((u) => u.ampel), "ohne Ampel-Funktion wie bisher");
});
