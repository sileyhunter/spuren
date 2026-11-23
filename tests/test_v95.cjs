/* V9.5 Auftrag «Woche wie Enduco», Etappe W4 (docs/auftrag-enduco-woche.md): zeit-intensitaet-1.0 – Zeit und Intensität als Stellschrauben.
   Verdichten (dieselbe Last in weniger Zeit, eine Stufe höher) und Zeit als Ziel (mehr Zeit → längste lockere Einheit länger, bis zur Obergrenze des Korridors).
   Reine Rechentests mit einem einfachen Lastmodell und Abnahme mit dem Simulator (tests/sim, erfundener Athlet: Mo kein Training, Di–Fr 2:30 h, Sa/So 5 h).
   Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V92 = require("../js/v92.js");

/* ---------------- Hilfen ---------------- */
// einfaches Lastmodell (erfunden): Σ min/60 × IF² × 100 je Abschnitt
const IF = { z1: 0.55, z2: 0.7, renntempo: 0.78, z3: 0.85, z3o: 0.95, vo2: 1.1, pause: 0.5, css: 0.95, abc: 0.6 };
const tl = (e) => (e && Array.isArray(e.teile) ? e.teile.reduce((s, [k, m]) => s + (m / 60) * (IF[k] || 0.7) ** 2 * 100, 0) : null);
const MO = "2026-11-16", d = (i) => addDays(MO, i);
const tagListe = (L) => Array.from({ length: 7 }, (_, i) => ({ date: d(i), einheiten: (L[i] || []).slice() }));
const verfAus = (min) => (x) => { const i = Math.round((Date.parse(x) - Date.parse(MO)) / 864e5); return min[i] == null ? null : { min: min[i], sport: null }; };
const summe = (L) => L.reduce((s, e) => s + (e.dauer || 0), 0);
const tlWoche = (tage) => tage.reduce((s, t) => s + t.einheiten.reduce((x, e) => x + (["rad", "lauf", "schwimm"].includes(e.sport) ? tl(e) : 0), 0), 0);
const Z = (extra) => Object.assign({ tl, aus: null, vorsichtig: false }, extra || {});
const e = (id, dd, o) => Object.assign(V64.einheit(id, dd ? { d: dd } : {}), o || {});

// Simulator
const START = "2026-11-30", W3 = "2026-12-14", w = (i) => addDays(W3, i);
const neu = async () => { const sim = simulator({ start: START }); await sim.tage(START, 14); sim.S.tag(W3, "07:00"); return sim; };
const K = (sim, mo) => sim.S.kontext(mo || W3);
const plan = (sim, x) => sim.plan(x).plan;
const zeig = (sim, mo) => JSON.stringify(Array.from({ length: 7 }, (_, i) => plan(sim, addDays(mo || W3, i)).map((x) => `${x.id}/${x.dauer}${x.dicht ? "*" + x.dicht.z3 : ""}${x.zusatz ? "+" : ""}`)));
const vf = (sim, x, min) => sim.win.V66.vfEintrag({ date: x }, { min, sport: null }, "2026-12-14T06:00:00.000Z");
const tlPlan = (sim, mo) => { const k = K(sim, mo), BZ = sim.win.V66.bezug(k.skalen, k.css ? k.css.s : null); let s = 0;
  for (const t of k.wPlan.tage) if (!t.rennen) for (const x of t.einheiten) if (["rad", "lauf", "schwimm"].includes(x.sport) || x.art === "draussen") s += sim.win.V66.schaetzung(x, BZ).tl || 0; return Math.round(s); };
const planen = async (sim, opt) => { const f = await sim.win.V66UI.planen(W3, opt); sim.S.neu(); return f; };
const eng = (sim) => planen(sim, { vf: [vf(sim, w(5), 180), vf(sim, w(6), 120), vf(sim, w(2), 90)] });   // Sa 3 h, So 2 h, Mi 1:30 h: die Zeit ist knapp, der Korridor nicht voll

test("Versionen und Festlegungen W4", () => {
  assert.equal(V66.VERSIONS.ziel, "zeit-intensitaet-1.0");
  assert.equal(V66.VERSIONS.verfuegbarkeit, "verfuegbarkeit-1.3", "verteilen ohne opt.ziel unverändert");
  assert.deepEqual({ spanne: V66.ZIEL.spanne, toleranz: V66.ZIEL.toleranz, maxDicht: V66.ZIEL.maxDicht, block: V66.ZIEL.block, zusatzAb: V66.ZIEL.zusatzAb },
    { spanne: 0.075, toleranz: 0.1, maxDicht: 2, block: 10, zusatzAb: 45 });
});

/* ---------------- Verdichten: Bausteine ---------------- */
test("Verdichtete Fassung: Tempo in 10-min-Blöcken unter LT2, höchstens ein Drittel, gleiche Dauer, gespeichert mit dicht { z3 }", () => {
  const T = V66.dichtTeile(V64.einheit("rad_locker", { d: 120 }).teile, 30, "rad");
  assert.deepEqual(T, [["z1", 10], ["z2", 15], ["z3", 10], ["z2", 5], ["z3", 10], ["z2", 5], ["z3", 10], ["z2", 55]]);
  assert.equal(T.reduce((s, t) => s + t[1], 0), 120);
  assert.deepEqual(V66.dichtTeile(V64.einheit("lauf_locker", { d: 60 }).teile, 20, "lauf").slice(0, 3), [["z1", 5], ["z2", 10], ["z3", 10]]);
  assert.equal(V66.dichtMax("rad", 120), 40); assert.equal(V66.dichtMax("rad", 75), 20); assert.equal(V66.dichtMax("lauf", 200), 30);
  assert.equal(V66.dichtTeile(V64.einheit("rad_locker", { d: 45 }).teile, 40, "rad"), null, "passt nicht");
  const x = V66.einheit({ uid: "v-1", vorlage: "rad_locker", dauer: 95, quelle: "vorschlag", dicht: { z3: 30 } });
  assert.equal(x.titel, "Grundlage mit Tempo"); assert.equal(x.dauer, 95); assert.equal(x.minuten.mittel, 30); assert.equal(x.minuten.hart, 0);
  assert.ok(x.teile.every(([k]) => ["z1", "z2", "z3"].includes(k)), "nie über LT2");
  assert.ok(!V66.hart(x), "zählt nicht als harte Einheit (Schlüssel)");
  const y = V66.einheit({ uid: "v-2", vorlage: "rad_locker", dauer: 60, quelle: "vorschlag", dicht: { z3: 40 } });
  assert.equal(y.titel, "Grundlage", "zu viel Tempo für 60 min: gewöhnliche Fassung");
  assert.equal(V66.stehtFuer({ uid: "v-3", vorlage: "rad_locker", dauer: 60, quelle: "vorschlag", zusatz: true }), null, "zusätzliche Einheit steht für keine des Vorschlags");
});

/* ---------------- Verdichten im Planer (V66.verteilen, opt.ziel) ---------------- */
// Woche: Di Lauf hart, Do Rad hart, Sa lange Ausfahrt 3 h, So langer Lauf; Sa hat nur 2:30 h, sonst passt nichts mehr
const knapp = () => tagListe({ 1: [e("lauf_vo2")], 3: [e("rad_vo2")], 5: [e("rad_lang", 180)], 6: [e("lauf_lang", 90)] });
const knappVerf = verfAus([0, 50, 0, 60, 0, 150, 90]);

test("Abnahme W4 Verdichten: knappe Woche → Einheit kürzer und eine Stufe höher, TL ± 10 %, im Bericht mit Grund", () => {
  const ohne = V66.verteilen(knapp(), knappVerf, { tl });
  const sa0 = ohne.tage[5].einheiten[0];
  assert.equal(sa0.dauer, 150); assert.ok(!sa0.dicht, "ohne W4 nur gekürzt");
  const r = V66.verteilen(knapp(), knappVerf, { tl, ziel: Z() });
  const sa = r.tage[5].einheiten[0], voll = tl(e("rad_lang", 180));
  assert.equal(sa.dauer, 150, "nie über die Zeit des Tages"); assert.ok(sa.dicht && sa.dicht.z3 > 0, JSON.stringify(sa.teile));
  assert.equal(sa.titel, "Lange Ausfahrt mit Tempo");
  assert.ok(tl(sa) >= 0.9 * voll && tl(sa) <= 1.1 * voll, `TL ${tl(sa).toFixed(1)} gegen ${voll.toFixed(1)} (± 10 %)`);
  assert.ok(tl(sa0) < 0.9 * voll, "gekürzt allein verlöre mehr als 10 %");
  assert.equal(r.protokoll.dicht.length, 1);
  assert.match(V66.verteilText(r.protokoll).join("\n"), /Samstag Rad: 2 h 30 statt 3 h, dafür mit Anteilen Tempo – gleiche Last/);
  assert.ok(!V66.verteilText(r.protokoll).some((m) => /Lange Ausfahrt» am Sa 150 statt 180/.test(m)), "keine doppelte Zeile «gekürzt»");
  // die kleinste Menge Tempo: ein Block weniger reichte nicht
  const weniger = V66.einheit({ uid: "x", vorlage: "rad_lang", dauer: 150, quelle: "vorschlag", dicht: { z3: sa.dicht.z3 - 10 } });
  assert.ok(sa.dicht.z3 === 10 || tl(weniger) < 0.9 * voll);
});

test("Verdichten: höchstens zwei je Woche (mit denen an festen Tagen), die grösste Lücke zuerst", () => {
  const T = tagListe({ 0: [e("rad_locker", 120)], 2: [e("lauf_locker", 60)], 4: [e("rad_locker", 100)], 6: [e("rad_lang", 180)] });
  const vfx = verfAus([100, 0, 50, 0, 85, 0, 150]);
  const r = V66.verteilen(T, vfx, { tl, ziel: Z() });
  assert.equal(r.protokoll.dicht.length, 2, JSON.stringify(r.protokoll.dicht));
  assert.equal(r.tage.reduce((s, t) => s + t.einheiten.filter((x) => x.dicht).length, 0), 2);
  assert.equal(r.protokoll.dicht[0].id, "rad_lang", "zuerst die grösste Lücke");
  const T2 = tagListe({ 0: [e("rad_locker", 120)], 2: [Object.assign(V66.einheit({ uid: "f", vorlage: "lauf_locker", dauer: 50, quelle: "vorschlag", dicht: { z3: 10 } }))], 4: [e("rad_locker", 100)], 6: [e("rad_lang", 180)] });
  T2[2].fest = true;
  const r2 = V66.verteilen(T2, vfx, { tl, ziel: Z() });
  assert.equal(r2.protokoll.dicht.length, 1, "eine steht schon an einem festen Tag");
});

test("Verdichten nicht: Erholungs-/Renn-/Taperwoche, Ampel «vorsichtig», eigene und gesperrte Einheiten, gesperrter Tag, neben einer harten Einheit an Land", () => {
  for (const z of [Z({ aus: "Erholungswoche" }), Z({ aus: "Rennwoche" }), Z({ aus: "Taper" }), Z({ aus: "neu" }), Z({ vorsichtig: true })]) {
    const r = V66.verteilen(knapp(), knappVerf, { tl, ziel: z });
    assert.equal(r.protokoll.dicht.length, 0, JSON.stringify({ aus: z.aus, vorsichtig: z.vorsichtig }));
  }
  const eigen = tagListe({ 5: [V66.einheit({ uid: "e1", vorlage: "rad_lang", dauer: 180, quelle: "eigen" })] });
  assert.equal(V66.verteilen(eigen, knappVerf, { tl, ziel: Z() }).protokoll.dicht.length, 0, "eigene Einheit bleibt, wie sie ist");
  const gesperrt = knapp(); gesperrt[5].einheiten[0].gesperrt = true;
  assert.equal(V66.verteilen(gesperrt, knappVerf, { tl, ziel: Z() }).protokoll.dicht.length, 0, "gesperrte Einheit");
  const festT = knapp(); festT[5].fest = true;
  const rf = V66.verteilen(festT, knappVerf, { tl, ziel: Z() });
  assert.equal(rf.protokoll.dicht.length, 0); assert.equal(rf.tage[5].einheiten[0].dauer, 180, "gesperrter Tag unverändert");
  // Samstag neben einer harten Einheit an Land (Freitag): nicht verdichtet
  const neben = knapp(); neben[4].einheiten = [e("lauf_tempo")];
  assert.equal(V66.verteilen(neben, verfAus([0, 50, 0, 60, 70, 150, 90]), { tl, ziel: Z() }).protokoll.dicht.length, 0, "neben einer harten Einheit an Land");
  // Kurs, Tests, Schlüssel: nie (nur lockere und lange Rad- und Laufeinheiten)
  const schl = tagListe({ 3: [e("rad_schwelle")] });
  const rs = V66.verteilen(schl, verfAus([0, 0, 0, 50, 0, 0, 0]), { tl, ziel: Z() });
  assert.equal(rs.protokoll.dicht.length, 0);
});

test("Verdichten reicht nicht → die Frage kommt (fehlt bleibt)", () => {
  const R = { [d(5)]: [e("rad_lang", 180)] };
  const ctx = (verf, ziel) => ({ heute: MO, montag: MO, roh: (x) => R[x] || [], verf, o: {}, tl, ziel, jetzt: "2026-11-16T07:00:00Z" });
  const r1 = V66.aendern(null, { art: "umplanen" }, ctx(verfAus([0, 0, 0, 0, 0, 60, 0]), Z())).eintrag;
  assert.ok(r1.verteilung.fehlt, "1 h für 3 h: auch verdichtet geht es nicht");
  assert.ok(!r1.verteilung.ziel || !r1.verteilung.ziel.dicht.length);
  const r2 = V66.aendern(null, { art: "umplanen" }, ctx(verfAus([0, 0, 0, 0, 0, 150, 0]), Z())).eintrag;
  assert.ok(!r2.verteilung.fehlt); assert.equal(r2.verteilung.ziel.dicht.length, 1);
  const s = r2.tage[d(5)].einheiten[0];
  assert.deepEqual([s.vorlage, s.dauer, s.quelle, !!s.dicht], ["rad_lang", 150, "vorschlag", true], "gespeichert als Einheit der Seite mit dicht");
  // wenig gekürzt (TL noch innerhalb von 10 %): kein Verdichten – die Ausnahme bleibt die Ausnahme
  const r3 = V66.aendern(null, { art: "umplanen" }, ctx(verfAus([0, 0, 0, 0, 0, 170, 0]), Z())).eintrag;
  assert.equal(r3.tage[d(5)].einheiten[0].dauer, 170); assert.ok(!r3.tage[d(5)].einheiten[0].dicht && !r3.verteilung.ziel);
  assert.ok(!V66.istAnker(s), "kein Anker: die nächste Änderung rechnet sie neu");
});

/* ---------------- Zeit als Ziel (V66.zeitZiel) ---------------- */
test("Zeit als Ziel: längste lockere Einheit länger, nie über die Zeit des Tages, Wochenlast ≤ Obergrenze; Laufen nie", () => {
  const T = tagListe({ 1: [e("lauf_vo2")], 2: [e("rad_locker", 60), e("schwimm_locker", 30)], 4: [e("lauf_locker", 45)], 5: [e("rad_lang", 180)] });
  const v = verfAus([0, 80, 150, 0, 120, 200, 0]), vor = tlWoche(T);
  const r = V66.zeitZiel(T, v, { tl, tlMax: vor + 40, minuten: { schwimm: 30, rad: 240, lauf: 95 } });
  assert.ok(r.geaendert);
  assert.ok(tlWoche(r.tage) <= vor + 40 + 1e-9, "Wochenlast ≤ Obergrenze");
  r.tage.forEach((t, i) => assert.ok(summe(t.einheiten) <= (v(t.date) ? v(t.date).min : 0) || !summe(t.einheiten), `${t.date}: ${summe(t.einheiten)} min`));
  const mi = r.tage[2].einheiten.find((x) => x.id === "rad_locker");
  assert.ok(mi.dauer > 60 && mi.dauer % 5 === 0, "Mittwoch: Rad länger, in 5-min-Schritten");
  assert.equal(r.tage[4].einheiten[0].dauer, 45, "Laufen wird nie länger (Aufbau-Grenze)");
  assert.equal(r.tage[2].einheiten.find((x) => x.id === "schwimm_locker").dauer, 30, "die längste lockere Einheit, nicht die kürzere");
  assert.ok(r.protokoll.laenger.some((x) => x.date === d(2) && x.von === 60));
  assert.match(V66.zielText("laenger", r.protokoll.laenger.find((x) => x.date === d(2))), /^Mittwoch: Rad \+ \d+ min, die Zeit war da$/);
  // Obergrenze schon erreicht: nichts
  assert.equal(V66.zeitZiel(T, v, { tl, tlMax: vor, minuten: {} }).geaendert, false);
  // ohne Zeitgrenze (offen) oder ohne Last: nichts
  assert.equal(V66.zeitZiel(T, () => ({ min: null, sport: null }), { tl, tlMax: vor + 40, minuten: {} }).geaendert, false);
  assert.equal(V66.zeitZiel(T, v, { tl: () => null, tlMax: vor + 40, minuten: {} }).geaendert, false, "ohne TL ≈ nichts verlängert");
  // Einheiten ohne TL ≈ (Test, Schwimmen ohne CSS) zählen nicht mit und werden nicht verlängert – die übrigen schon
  const T2 = tagListe({ 2: [e("rad_locker", 60)], 3: [e("test_css")], 4: [e("schwimm_locker", 30)] });
  const tl2 = (x) => (x.sport === "schwimm" ? null : tl(x));
  const r2 = V66.zeitZiel(T2, verfAus([0, 0, 150, 120, 120, 0, 0]), { tl: tl2, tlMax: tl(T2[2].einheiten[0]) + 20, minuten: {} });
  assert.ok(r2.tage[2].einheiten[0].dauer > 60, "Testwoche: Rad trotzdem länger");
  assert.equal(r2.tage[4].einheiten[0].dauer, 30, "Schwimmen ohne TL ≈ bleibt");
});

test("Zeit als Ziel: zusätzliche lockere Einheit nur, wenn die längste an ihrem Bereich anstösst und ≥ 45 min übrig sind – Sportart mit dem grössten Rückstand", () => {
  const T = tagListe({ 2: [e("schwimm_locker", 90)], 5: [e("rad_lang", 180)] });
  const v = verfAus([0, 0, 200, 0, 0, 180, 0]), vor = tlWoche(T);
  const r = V66.zeitZiel(T, v, { tl, tlMax: vor + 100, minuten: { schwimm: 90, rad: 400, lauf: 0 } });
  const mi = r.tage[2].einheiten;
  assert.equal(mi[0].dauer, 90, "Schwimmen schon am Rand seines Bereichs (90 min)");
  assert.equal(mi.length, 2, JSON.stringify(mi.map((x) => x.id)));
  assert.equal(mi[1].id, "rad_locker", "Rad lag am weitesten hinter seinem Anteil");
  assert.ok(mi[1].zusatz && !V66.hart(mi[1]));
  assert.ok(summe(mi) <= 200);
  assert.match(V66.zielText("zusatz", r.protokoll.zusatz[0]), /^Mittwoch: zusätzlich Rad locker .+, die Zeit war da \(Rad lag hinter der Wochenverteilung\)$/);
  // weniger als 45 min übrig: keine zusätzliche Einheit
  const r2 = V66.zeitZiel(T, verfAus([0, 0, 130, 0, 0, 180, 0]), { tl, tlMax: vor + 100, minuten: { schwimm: 90, rad: 300, lauf: 90 } });
  assert.equal(r2.tage[2].einheiten.length, 1);
  // leerer Tag (Ruhetag) bleibt leer, auch mit Zeit
  const r3 = V66.zeitZiel(T, verfAus([120, 0, 0, 0, 0, 180, 0]), { tl, tlMax: vor + 100, minuten: { schwimm: 90, rad: 300, lauf: 90 } });
  assert.equal(r3.tage[0].einheiten.length, 0);
  // Laufen nie über die Minuten des Vorschlags
  const T4 = tagListe({ 2: [e("schwimm_locker", 90)], 6: [e("lauf_lang", 90)] });
  const r4 = V66.zeitZiel(T4, verfAus([0, 0, 200, 0, 0, 0, 90]), { tl, tlMax: tlWoche(T4) + 100, minuten: { schwimm: 90, rad: 0, lauf: 90 } });
  assert.ok(!r4.tage[2].einheiten.some((x) => x.sport === "lauf"), "kein Lauf dazu: die Laufminuten des Vorschlags sind erreicht");
});

test("Zeit als Ziel nicht: aus (Erholung, Rennen, Taper, Neu), feste Tage, eigene und verdichtete Einheiten, Rennwoche", () => {
  const T = tagListe({ 2: [e("rad_locker", 60)] }), v = verfAus([0, 0, 150, 0, 0, 0, 0]), vor = tlWoche(T);
  for (const aus of ["Erholungswoche", "Rennwoche", "Taper", "neu"]) assert.equal(V66.zeitZiel(T, v, { tl, tlMax: vor + 50, aus, minuten: {} }).geaendert, false, aus);
  const F = tagListe({ 2: [e("rad_locker", 60)] }); F[2].fest = true;
  assert.equal(V66.zeitZiel(F, v, { tl, tlMax: vor + 50, minuten: {} }).geaendert, false, "gesperrter oder vergangener Tag");
  const Eg = tagListe({ 2: [V66.einheit({ uid: "e", vorlage: "rad_locker", dauer: 60, quelle: "eigen" })] });
  assert.equal(V66.zeitZiel(Eg, v, { tl, tlMax: vor + 50, minuten: {} }).geaendert, false, "Silas' eigene Einheit");
  const Dd = tagListe({ 2: [V66.einheit({ uid: "d", vorlage: "rad_locker", dauer: 60, quelle: "vorschlag", dicht: { z3: 10 } })] });
  assert.equal(V66.zeitZiel(Dd, v, { tl, tlMax: vor + 50, minuten: {} }).geaendert, false, "verdichtete Einheit");
  const R = tagListe({ 2: [e("rad_locker", 60)] }); R[6].rennen = true;
  assert.equal(V66.zeitZiel(R, v, { tl, tlMax: vor + 50, minuten: {} }).geaendert, false, "Rennwoche");
});

/* ---------------- Abnahme mit dem Simulator ---------------- */
test("Abnahme W4 Zeit als Ziel (Simulator): Tag mit viel Zeit → längste lockere Einheit länger, nie über seine Zeit, Wochenlast ≤ Korridor; zurück = Ausgangswoche", async () => {
  const sim = await neu(), U = sim.win.V66UI;
  assert.equal(await eng(sim), null);
  const k0 = K(sim), start = zeig(sim), mi0 = plan(sim, w(2)).find((x) => x.id === "rad_locker");
  assert.ok(k0.ziel && k0.ziel.tlMax > 0 && !k0.ziel.aus, JSON.stringify(k0.ziel && { aus: k0.ziel.aus, tlMax: k0.ziel.tlMax }));
  assert.ok(tlPlan(sim) < k0.ziel.tlMax, `Platz im Korridor (${tlPlan(sim)} < ${k0.ziel.tlMax})`);
  const nVf = (sim.D.plan_verfuegbarkeit || []).length + ((sim.S.inbox.data || {}).verfuegbarkeit || []).length;
  assert.equal(await planen(sim, { vf: [vf(sim, w(2), 180)] }), null);
  const mi = plan(sim, w(2)), rad = mi.find((x) => x.id === "rad_locker");
  assert.ok(rad.dauer > mi0.dauer, `Mittwoch: Rad länger (${mi0.dauer} → ${rad.dauer})`);
  assert.ok(summe(mi) <= 180, "nie über die Zeit des Tages");
  assert.ok(tlPlan(sim) <= K(sim).ziel.tlMax, `Wochenlast ${tlPlan(sim)} ≤ Obergrenze ${K(sim).ziel.tlMax}`);
  const B = U.bericht();
  assert.ok(B.zeilen.some((z) => /^Mittwoch: Rad \+ \d+ min, die Zeit war da$/.test(z)), JSON.stringify(B.zeilen));
  assert.ok(!B.zeilen.some((z) => /«Grundlage» am Mi .* statt/.test(z)), "keine zweite Zeile für dieselbe Verlängerung");
  const ids = new Set(((sim.S.inbox.data || {}).verfuegbarkeit || []).map((x) => x.id));
  assert.equal((sim.D.plan_verfuegbarkeit || []).length + ids.size, nVf, "nichts Neues «von Hand» eingetragen");
  assert.deepEqual([...ids].sort(), ["vf-" + w(2), "vf-" + w(5), "vf-" + w(6)], "nur Silas' eigene Zeiten");
  assert.ok(!plan(sim, w(2)).some((x) => x.anker || x.quelle === "eigen"), "die Verlängerung ist keine eigene Einheit");
  // Pfadunabhängigkeit: Zeit zurück → Ausgangswoche; ↶ ebenso
  assert.equal(await planen(sim, { vf: [vf(sim, w(2), 90)] }), null);
  assert.equal(zeig(sim), start, "zurück auf 1:30 h = Ausgangswoche");
  assert.equal(await planen(sim, { vf: [vf(sim, w(2), 180)] }), null);
  const lang = zeig(sim);
  assert.notEqual(lang, start);
  assert.equal(await U.rueckgaengig(), null); sim.S.neu();
  assert.equal(zeig(sim), start, "↶ nimmt die Verlängerung zurück");
  assert.equal(await planen(sim, { vf: [vf(sim, w(2), 180)] }), null);
  assert.equal(zeig(sim), lang, "gleiche Eingaben, gleiche Woche");
});

test("Abnahme W4 (Simulator): Erholungswoche und gesperrter Tag bleiben unverändert; eigene Einheit wird nicht länger", async () => {
  const sim = await neu(), U = sim.win.V66UI;
  // Erholungswoche in den nächsten Wochen suchen: dort weder Zeit als Ziel noch Verdichten
  let erh = null;
  for (let i = 0; i < 6 && !erh; i++) { const mo = addDays(W3, 7 * i), k = K(sim, mo); if (k && k.w && k.w.erholung) erh = { mo, k }; }
  assert.ok(erh, "eine Erholungswoche in den nächsten sechs Wochen");
  assert.equal(erh.k.ziel.aus, "Erholungswoche");
  assert.equal(erh.k.w0, erh.k.w0vorZiel, "Erholungswoche: nichts länger, nichts dazu");
  // gesperrter Mittwoch: mehr Zeit ändert dort nichts
  assert.equal(await eng(sim), null);
  assert.equal(await U.aendern(W3, { art: "sperren", date: w(2) }), null); sim.S.neu();
  const vorher = JSON.stringify(plan(sim, w(2)).map((x) => [x.id, x.dauer]));
  assert.equal(await planen(sim, { vf: [vf(sim, w(2), 180)] }), null);
  assert.equal(JSON.stringify(plan(sim, w(2)).map((x) => [x.id, x.dauer])), vorher, "gesperrter Tag unverändert");
  assert.equal(await U.aendern(W3, { art: "entsperren", date: w(2) }), null); sim.S.neu();
  // eigene Einheit am Freitag (Rad 40 min): bleibt 40 min, auch mit viel Zeit
  assert.equal(await U.aendern(W3, { art: "hinzufuegen", date: w(4), einheit: { vorlage: "rad_locker", dauer: 40 } }), null); sim.S.neu();
  assert.equal(await planen(sim, { vf: [vf(sim, w(4), 240)] }), null);
  const fr = plan(sim, w(4)).filter((x) => x.quelle === "eigen");
  assert.equal(fr.length, 1); assert.equal(fr[0].dauer, 40, "Silas' eigene Einheit wird nie verlängert");
});

test("Abnahme W4 Verdichten (Simulator): knappe Woche → Bericht nennt die Verdichtung mit Grund; ↶ und «Neu berechnen» nehmen sie zurück", async () => {
  const sim = await neu(), U = sim.win.V66UI;
  const start = zeig(sim);
  assert.equal(await planen(sim, { vf: [vf(sim, w(5), 150)] }), null);
  const sa = plan(sim, w(5)), lang = sa.find((x) => x.id === "rad_lang");
  assert.ok(lang && lang.dicht, zeig(sim));
  assert.ok(summe(sa) <= 150, "nie über die Zeit des Tages");
  const k = K(sim), BZ = sim.win.V66.bezug(k.skalen, k.css ? k.css.s : null);
  const voll = sim.win.V66.schaetzung(V64.einheit("rad_lang", { d: K(sim).w0roh.tage[5].einheiten.find((x) => x.id === "rad_lang").dauer }), BZ).tl;
  const dicht = sim.win.V66.schaetzung(lang, BZ).tl;
  assert.ok(dicht >= 0.9 * voll && dicht <= 1.1 * voll, `TL ${dicht} gegen ${voll} (± 10 %)`);
  const B = U.bericht();
  assert.ok(B.zeilen.some((z) => /^Samstag Rad: 2 h 30 statt 3 h( \d\d)?, dafür mit Anteilen Tempo – gleiche Last/.test(z)), JSON.stringify(B.zeilen));
  assert.ok(!B.fehlt, "nichts fehlt – darum keine Frage");
  const mitDicht = zeig(sim);
  // ↶
  assert.equal(await U.rueckgaengig(), null); sim.S.neu();
  assert.equal(zeig(sim), start, "↶: Ausgangswoche");
  // wieder knapp, dann «Neu berechnen»: ohne Verdichten und ohne Zeit als Ziel, bis sich die Eingaben ändern
  assert.equal(await planen(sim, { vf: [vf(sim, w(5), 150)] }), null);
  assert.equal(zeig(sim), mitDicht, "gleiche Eingaben, gleiche Woche");
  assert.equal(await planen(sim, { aktionen: [{ art: "neuberechnen" }], ohneUmplanen: true }), null);
  assert.ok(!plan(sim, w(5)).some((x) => x.dicht), "nach «Neu berechnen» nicht verdichtet: " + zeig(sim));
  assert.ok(!Array.from({ length: 7 }, (_, i) => plan(sim, w(i))).flat().some((x) => x.zusatz || x.dicht));
  assert.ok(sim.win.V64UI.planEintrag(W3).zielAus, "gespeichert als Eingabe der Woche (zielAus)");
  assert.equal(K(sim).ziel.aus, "neu");
  // die nächste eigene Änderung (Zeit am Freitag) bringt die Stellschrauben zurück
  assert.equal(await planen(sim, { vf: [vf(sim, w(4), 120)] }), null);
  assert.ok(!sim.win.V64UI.planEintrag(W3) || !sim.win.V64UI.planEintrag(W3).zielAus);
  assert.ok(plan(sim, w(5)).some((x) => x.dicht), "wieder verdichtet: " + zeig(sim));
});

test("Abnahme W4 (Simulator): bei Ampel «vorsichtig» wird in der laufenden Woche nicht verdichtet", async () => {
  const sim = await neu();
  await sim.checkin(W3, { schlaf: 4, muede: 5, muskel: 6, stress: 3 });
  const A = sim.win.V74UI.stand(W3);
  assert.equal(A.status, "vorsichtig");
  assert.equal(K(sim).ziel.vorsichtig, true);
  assert.equal(await planen(sim, { vf: [vf(sim, w(5), 150)] }), null);
  assert.ok(!plan(sim, w(5)).some((x) => x.dicht), "nur gekürzt: " + zeig(sim));
});

test("Bericht: V92.zielBericht nimmt die blosse Änderung weg und nennt nur Neues", () => {
  const vor = [{ uid: "a", id: "rad_locker", titel: "Grundlage", dauer: 60, date: d(2) }, { uid: "b", id: "rad_lang", titel: "Lange Ausfahrt", dauer: 180, date: d(5) }];
  const nach = [{ uid: "a", id: "rad_locker", titel: "Grundlage", dauer: 85, date: d(2) }, { uid: "b", id: "rad_lang", titel: "Lange Ausfahrt mit Tempo", dauer: 150, date: d(5), dicht: true }];
  const D = V92.diff(vor, nach);
  const ZL = V66.zielZeilen({ laenger: [{ date: d(2), id: "rad_locker", titel: "Grundlage", sport: "rad", von: 60, nach: 85 }],
    dicht: [{ date: d(5), vonDatum: d(5), id: "rad_lang", titel: "Lange Ausfahrt", neu: "Lange Ausfahrt mit Tempo", sport: "rad", von: 180, nach: 150, z3: 20 }] });
  const r = V92.zielBericht(D, vor, nach, ZL);
  assert.deepEqual(r.zeilen, ["Mittwoch: Rad + 25 min, die Zeit war da", "Samstag Rad: 2 h 30 statt 3 h, dafür mit Anteilen Tempo – gleiche Last"]);
  assert.deepEqual(V92.zeilen(r.D), [], "keine doppelten Zeilen");
  assert.deepEqual(V92.zielBericht(V92.diff(nach, nach), nach, nach, ZL).zeilen, [], "schon so geplant: nichts Neues");
});
