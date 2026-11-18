// Abnahmetests V8.1.1 Verpflegung je Einheit (verpflegung-1.0, js/verpflegung.js). Alle Produkte und Werte erfunden.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const VP = require("../js/verpflegung.js");

// erfundene Produkte im Format von D.garmin_lebensmittel (wie tools/verpflegung.py lebensmittel liefert)
const LM = [
  { id: "g1", name: "Beispiel Energy Gel (1 Gel, 25 g KH)", marke: "Beispiel", menge: 1, einheit: "SERVING", kcal: 100, kh: 25, zucker: 10, protein: 0, fett: 0, natrium: 50, kalium: null },
  { id: "g2", name: "Energy Gel (60 ml)", marke: "Beispiel", menge: 1, einheit: "PIECE", kcal: 100, kh: 25, zucker: 10, protein: 0, fett: 0, natrium: null, kalium: null },
  { id: "d1", name: "Beispiel Sportgetränk Pulver (pro 60 g = 1 Flasche)", marke: "Beispiel", menge: 60, einheit: "G", kcal: 220, kh: 55, zucker: 30, protein: 0, fett: 0, natrium: 300, kalium: null },
  { id: "b1", name: "Banane – Gewicht MIT Schale (pro 100 g)", marke: null, menge: 100, einheit: "G", kcal: 60, kh: 15, zucker: 8, protein: 1, fett: 0, natrium: 1, kalium: null },
  { id: "r1", name: "Beispielriegel Hafer (Riegel 60 g)", marke: "Beispiel", menge: 60, einheit: "G", kcal: 230, kh: 35, zucker: 5, protein: 6, fett: 6, natrium: 100, kalium: null },
  { id: "p1", name: "Beispiel Whey (Portion 30 g Pulver)", marke: "Beispiel", menge: 30, einheit: "G", kcal: 115, kh: 3, zucker: 2, protein: 24, fett: 2, natrium: 50, kalium: null },
  { id: "m1", name: "Reis gekocht (pro 100 g)", marke: null, menge: 100, einheit: "G", kcal: 125, kh: 28, zucker: 0, protein: 3, fett: 0, natrium: 1, kalium: null },
];
const P = VP.produkte({ garmin_lebensmittel: LM });
const W = VP.wahl(P, null);
const einheit = (sport, art, dauer, teile, mehr) => Object.assign({ uid: "u1", sport, art, dauer, teile: teile || [["z1", 10], ["z2", dauer - 10]] }, mehr || {});
const vo2 = (n) => Array(n).fill(0).flatMap(() => [["vo2", 0.5], ["pause", 0.25]]);

test("Version", () => assert.equal(VP.VERSIONS.verpflegung, "verpflegung-2.0"));

test("Produkte: Art aus Name und Nährwerten, Portionen, Doppel einmal (mit beiden Namen), Mahlzeiten nicht unterwegs", () => {
  const art = Object.fromEntries(P.map((p) => [p.id, p.art]));
  assert.equal(art.g1 || art.g2, "gel"); assert.equal(art.d1, "getraenk"); assert.equal(art.b1, "frucht"); assert.equal(art.r1, "riegel"); assert.equal(art.p1, "protein"); assert.equal(art.m1, "anderes");
  const gels = P.filter((p) => p.art === "gel");
  assert.equal(gels.length, 1, "gleiches Gel zweimal eingetragen"); assert.equal(gels[0].natrium, 50, "der Eintrag mit mehr Angaben bleibt"); assert.equal(gels[0].namen.length, 2);
  assert.equal(P.find((p) => p.id === "d1").portion.text, "1 Flasche (60 g Pulver)");
  assert.equal(P.find((p) => p.id === "b1").portion.nachGewicht, true);
  assert.equal(P.find((p) => p.id === "b1").anzeige, "Banane (mit Schale)");
  assert.ok(!W.unterwegs.some((p) => p.id === "m1"), "Mahlzeiten nicht unterwegs");
  assert.deepEqual(W.nachher.map((p) => p.id), ["p1"]);
  assert.equal(W.vorher[0].id, "b1", "vorher ohne eigene Auswahl: Banane zuerst");
});

test("45 min locker → nichts; Schwimmen → nichts während; Test → wie beim letzten Test", () => {
  const R = VP.plan(einheit("lauf", "locker", 45), { W, kg: 70 });
  assert.equal(R.ziel.stufe, "nichts"); assert.equal(R.waehrend.produkte.length, 0); assert.equal(VP.kurz(R), "nichts nötig");
  assert.match(R.vorher[0].text, /nichts extra/);
  const S = VP.plan(einheit("schwimm", "locker", 60, [["z2", 60]]), { W, kg: 70 });
  assert.equal(S.ziel.stufe, "nichts"); assert.match(S.ziel.gruende[0], /Schwimmen/); assert.match(S.nachher[0].text, /Protein/);
  const T = VP.plan(einheit("rad", "test", 75, [["test", 75]]), { W, kg: 70 });
  assert.equal(T.ziel.stufe, "test"); assert.equal(T.waehrend.produkte.length, 0);
});

test("75 min Intervalle → 45 g/h, Einnahme nie im harten Teil", () => {
  const e = einheit("lauf", "schluessel", 75, [["z1", 15]].concat(vo2(13), [["z1", 3]], vo2(13), [["z1", 3]], vo2(13), [["z1", 24.75]]));
  const R = VP.plan(e, { W, kg: 70 });
  assert.equal(R.ziel.g_h, 45); assert.equal(R.ziel.hart, true);
  const achse = VP._intern.zeitachse(e);
  for (const z of R.waehrend.zeitplan) {
    const a = achse.find((x) => z.min >= x.von && z.min < x.bis);
    assert.ok(!a || !a.hart, `Einnahme in Minute ${z.min} liegt in einem harten Abschnitt`);
  }
  assert.ok(R.waehrend.produkte.every((x) => x.p.art === "gel"), "Laufen: Gels");
});

test("kurze harte Einheit (45–75 min) → kleine Menge in einer Pause, oder nichts", () => {
  const e = einheit("rad", "schluessel", 60, [["z1", 20], ["z3o", 8], ["z1", 2], ["z3o", 8], ["z1", 22]]);
  const R = VP.plan(e, { W, kg: 70 });
  assert.equal(R.ziel.stufe, "klein"); assert.equal(R.waehrend.zeitplan.length, 1);
  assert.equal(R.waehrend.zeitplan[0].min, 28, "in der ersten Pause nach einem harten Block ab Minute 20");
  assert.match(R.waehrend.zeitplan[0].text, /oder nichts/);
});

test("3 h Ausfahrt → 60 g/h: Getränk höchstens zwei Drittel, Rest Gels; über 60 g/h (eigene Stufe) mit dem Hinweis auf Glukose + Fruktose", () => {
  const e = einheit("rad", "lang", 180);
  const R = VP.plan(e, { W, kg: 70 });
  assert.equal(R.ziel.g_h, 60);
  assert.ok(Math.abs(R.waehrend.g_h - 60) <= 6, `≈ 60 g/h (${R.waehrend.g_h})`);
  const fl = R.waehrend.produkte.find((x) => x.p.art === "getraenk"), gel = R.waehrend.produkte.find((x) => x.p.art === "gel");
  assert.ok(fl && gel, "Getränk und Gels gemischt");
  assert.ok(fl.kh <= 180 * 0.65 + 1, "Getränk höchstens zwei Drittel");
  assert.ok(R.packliste.length >= 2); assert.ok(R.vorher.some((x) => /30–60 min vorher/.test(x.text)));
  // verpflegung-2.0: keine Produktwahl mehr – eigene Stufe 90 g/h gilt, mit dem Hinweis auf Glukose und Fruktose
  const W90 = VP.wahl(P, { unterwegs: ["d1", "g1"], max_g_h: 90 });
  const R90 = VP.plan(e, { W: W90, kg: 70 });
  assert.equal(R90.ziel.g_h, 90); assert.ok(R90.ziel.gruende.some((g) => /Glukose und Fruktose zusammen/.test(g)));
  assert.equal(VP.knapp(R90, e).hinweis, "über 60 g/h nur mit Glukose und Fruktose zusammen");
});

test("Ohne Produkte → Gramm statt erfundener Produkte; Anpassung je Einheit", () => {
  const leer = VP.wahl([], null);
  const R = VP.plan(einheit("rad", "lang", 150), { W: leer, kg: 70 });
  assert.equal(R.waehrend.produkte.length, 0); assert.equal(R.waehrend.gramm, 150); assert.match(R.waehrend.text[0], /≈ 150 g Kohlenhydrate/);
  assert.equal(VP.kurz(R), "60 g/h · ≈ 150 g");
  const aus = VP.plan(einheit("rad", "lang", 150), { W, kg: 70, anpassung: { aus: true } });
  assert.equal(aus.ziel.stufe, "aus"); assert.equal(aus.waehrend.produkte.length, 0);
  const a40 = VP.plan(einheit("rad", "locker", 100), { W, kg: 70, anpassung: { g_h: 40, mix: "gel" } });
  assert.equal(a40.ziel.g_h, 40); assert.ok(a40.waehrend.produkte.every((x) => x.p.art === "gel")); assert.equal(a40.angepasst, true);
});

test("Nachher: Protein ≈ 0,25 g/kg (20–40 g); Kohlenhydrate rasch nur vor der nächsten harten oder langen Einheit innert 8 h", () => {
  const e = einheit("rad", "schluessel", 90, [["z1", 15]].concat(vo2(40), [["z1", 45]]));
  const R = VP.plan(e, { W, kg: 80, naechsteStd: 6 });
  assert.match(R.nachher[0].text, /≈ 24 g Protein, Ziel ≈ 20 g/);
  assert.match(R.nachher[1].text, /80–96 g/);
  const R2 = VP.plan(e, { W, kg: 80, naechsteStd: 16 });
  assert.match(R2.nachher[1].text, /normale Mahlzeit/);
});

test("Hinweise: Renn-Fueling üben, Darmtraining, neues Produkt nicht in Schlüsseleinheiten", () => {
  const e = einheit("rad", "lang", 200, [["z1", 10], ["z2", 100], ["renntempo", 30], ["z2", 60]]);
  const R = VP.plan(e, { W, kg: 70 });
  assert.ok(R.hinweise.some((h) => /Renn-Fueling/.test(h))); assert.ok(R.hinweise.some((h) => /Darmtraining/.test(h)));
  const hart = einheit("rad", "schluessel", 100, [["z1", 15]].concat(vo2(40), [["z1", 55]]));
  const N = VP.plan(hart, { W, kg: 70, genutzt: new Set(["etwas anderes"]) });
  assert.ok(N.hinweise.some((h) => /neues nie zuerst/.test(h)));
});

test("Anpassung «vp-…»: Prüfung wie tools/verpflegung.py, neueste Fassung zählt", () => {
  const ok = VP.eintrag("2027-01-20", "v-2027-01-20-0", { g_h: 50, mix: "gel" }, "2027-01-19T10:00:00Z");
  assert.ok(ok); assert.equal(ok.id, "vp-2027-01-20-v-2027-01-20-0");
  assert.equal(VP.eintrag("2027-01-20", "u1", { g_h: 52 }), null, "5er-Schritte");
  assert.equal(VP.eintrag("2027-01-20", "u1", { mix: "auto" }), null, "keine Änderung");
  assert.equal(VP.pruefen(Object.assign({}, ok, { id: "vp-x" })), "Kennung passt nicht zu Tag und Einheit");
  const weg = { id: ok.id, datum: ok.datum, uid: ok.uid, entfernt: true, geaendert: "2027-01-19T11:00:00Z" };
  assert.equal(VP.anpassung([ok], [], "2027-01-20", ok.uid).g_h, 50);
  assert.equal(VP.anpassung([ok], [weg], "2027-01-20", ok.uid), null, "zurück auf die Empfehlung");
  // gleiche Regeln in Python
  const faelle = [ok, Object.assign({}, ok, { g_h: 52 }), Object.assign({}, ok, { mix: "x" }), weg, Object.assign({}, ok, { g_h: null, mix: "auto" })];
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(path.join(__dirname, "..", "tools"))})\nimport verpflegung\n`
    + `print(json.dumps([verpflegung.pruefen(e) for e in json.loads(sys.argv[1])]))`;
  const py = JSON.parse(execFileSync("python3", ["-I", "-c", code, JSON.stringify(faelle)], { encoding: "utf8" }));
  assert.deepEqual(py, faelle.map((e) => VP.pruefen(JSON.parse(JSON.stringify(e)))));
});

test("Geplant gegen genommen; Darmtraining-Vorschlag erst nach dreimal ohne Beschwerden", () => {
  const R = VP.plan(einheit("rad", "lang", 180), { W, kg: 70 });
  assert.equal(VP.vergleich(R, { kh_g_h: 58 }).urteil, "wie geplant");
  assert.equal(VP.vergleich(R, { kh_g_h: 35 }).urteil, "weniger als geplant");
  assert.equal(VP.vergleich(R, null), null);
  assert.equal(VP.darm([{ genommen: 60, magen: "ok" }, { genommen: 58, magen: "ok" }], 60), null, "zweimal reicht nicht");
  assert.deepEqual(VP.darm([{ genommen: 60, magen: "ok" }, { genommen: 58, magen: "ok" }, { genommen: 61, magen: "ok" }], 60).vorschlag, 70);
  assert.equal(VP.darm([{ genommen: 60, magen: "stark" }, { genommen: 60, magen: "stark" }], 70).art, "runter");
  assert.equal(VP.darm([{ genommen: 40, magen: "ok" }, { genommen: 58, magen: "ok" }, { genommen: 61, magen: "ok" }], 60), null, "zu wenig genommen");
});

test("Planeinstellung «pe-verpflegung»: Listen heissen davor/danach (vorher = Fassung der laufenden Woche), gleiche Prüfung wie Python", () => {
  const V75 = require("../js/v75.js");
  const x = V75.eintrag("pe-verpflegung", { unterwegs: ["g1", "d1"], davor: ["b1"], danach: ["p1"], fruktose: ["d1"], max_g_h: 80 }, "2027-01-19T10:00:00Z", null);
  assert.deepEqual(x.davor, ["b1"], "bleibt im Eintrag"); assert.equal("vorher" in x, false);
  assert.equal(V75.pruefen(x), null);
  const W2 = VP.wahl(P, x);
  assert.deepEqual(W2.vorher.map((p) => p.id), ["b1"]); assert.deepEqual(W2.nachher.map((p) => p.id), ["p1"]); assert.equal(W2.max_g_h, 80);
  const faelle = [x, Object.assign({}, x, { max_g_h: 85 }), Object.assign({}, x, { danach: ["p1", "p1"] }), Object.assign({}, x, { davor: "b1" }), Object.assign({}, x, { max_g_h: 130 })];
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(path.join(__dirname, "..", "tools"))})\nimport verpflegung\n`
    + `print(json.dumps([verpflegung.einstellung_pruefen(e) for e in json.loads(sys.argv[1])]))`;
  const py = JSON.parse(execFileSync("python3", ["-I", "-c", code, JSON.stringify(faelle)], { encoding: "utf8" }));
  assert.deepEqual(py, faelle.map((e) => V75.pruefen(e)));
  assert.deepEqual(py.map((f) => f === null), [true, false, false, false, false]);
});

test("verpflegung-2.0: kurz und bündig – g/h und Menge, je eine Zeile vorher und nachher nur, wenn sie etwas ändert", () => {
  const e = einheit("rad", "lang", 180), R = VP.plan(e, { W, kg: 70 });
  assert.equal(VP.kurz(R), "60 g/h · ≈ 180 g");
  const K = VP.knapp(R, e, { naechsteStd: 20 });
  assert.equal(K.g_h, 60); assert.equal(K.gramm, 180);
  assert.equal(K.waehrend, "60 g Kohlenhydrate pro Stunde");
  assert.match(K.wann, /^ab Minute 20, dann alle 20–30 min$/);
  assert.equal(K.vorher, "Mahlzeit mit Kohlenhydraten 2–3 h davor");
  assert.equal(K.nachher, null, "nächste harte Einheit erst in 20 h: kein Extra");
  assert.match(VP.knapp(R, e, { naechsteStd: 5 }).nachher, /^rasch Kohlenhydrate und 20–40 g Protein – die nächste harte oder lange Einheit kommt in 5 h$/);
  // kurze lockere Einheit: nichts nötig, keine Zeile vorher oder nachher
  const kurzE = einheit("rad", "locker", 60), Rk = VP.plan(kurzE, { W, kg: 70 });
  assert.equal(VP.kurz(Rk), "nichts nötig");
  const Kk = VP.knapp(Rk, kurzE, {}); assert.equal(Kk.g_h, null); assert.equal(Kk.vorher, null); assert.equal(Kk.nachher, null);
  // harte Einheit unter 75 min: kleine Portion, ohne g/h
  const k = VP.plan(einheit("rad", "schluessel", 60, [["z1", 15]].concat(vo2(30), [["z1", 22.5]])), { W, kg: 70 });
  assert.equal(k.ziel.stufe, "klein"); assert.equal(VP.kurz(k), "kleine Portion oder nichts");
  // früh am Morgen
  assert.match(VP.knapp(R, Object.assign({}, e, { uhrzeit: "07:00" }), {}).vorher, /^früh:/);
});

test("verpflegung-1.1: nur deine Gruppen (Gels, Fruchtgummi, Getränke, Hafer-Riegel, Hafer-Getränk, Whey, Banane) – andere nur mit eigener Auswahl", () => {
  const L2 = LM.concat([
    { id: "f1", name: "Fruchtgummi Bären (pro 100 g)", marke: "Beispiel", menge: 100, einheit: "G", kcal: 340, kh: 77, zucker: 46, protein: 7, fett: 0, natrium: 30, kalium: null },
    { id: "o1", name: "Instant Oats Vanille", marke: "Beispiel", menge: 100, einheit: "G", kcal: 380, kh: 60, zucker: 2, protein: 12, fett: 7, natrium: 10, kalium: null },
    { id: "a1", name: "Apfel mittelgross", marke: null, menge: 1, einheit: "PIECE", kcal: 90, kh: 21, zucker: 18, protein: 0, fett: 0, natrium: 1, kalium: null },
    { id: "h1", name: "Honig (1 TL)", marke: null, menge: 1, einheit: "SERVING", kcal: 22, kh: 6, zucker: 6, protein: 0, fett: 0, natrium: 0, kalium: null },
  ]);
  const P2 = VP.produkte({ garmin_lebensmittel: L2 }), art = (id) => P2.find((p) => p.id === id).art;
  assert.equal(art("f1"), "gummi"); assert.equal(art("o1"), "hafer"); assert.equal(art("r1"), "riegel", "Hafer-Riegel bleibt Riegel");
  assert.deepEqual(P2.filter((p) => !VP.imSet(p)).map((p) => p.id).sort(), ["a1", "h1", "m1"], "Apfel, Honig, Reis nicht in der Auswahl");
  const W2 = VP.wahl(P2, null);
  assert.ok(!W2.unterwegs.some((p) => ["a1", "h1", "o1"].includes(p.id)), "unterwegs ohne Apfel, Honig, Hafer");
  assert.ok(W2.unterwegs.some((p) => p.id === "f1"), "Fruchtgummi unterwegs");
  assert.deepEqual(W2.vorher.map((p) => p.id), ["b1", "r1", "o1"], "vorher Banane, Riegel, Hafer");
  assert.deepEqual(W2.nachher.map((p) => p.id).sort(), ["o1", "p1"], "nachher Whey und Hafer");
  // eigene Auswahl darf auch anderes enthalten
  assert.deepEqual(VP.wahl(P2, { unterwegs: ["a1"] }).unterwegs.map((p) => p.id), ["a1"]);
  // Mahlzeit mit Beispiel, Auffüllen mit Menge, Fruchtgummi auf der Wanderung
  const R = VP.plan(einheit("rad", "schluessel", 100, [["z1", 20]].concat(vo2(40), [["z1", 50]])), { W: W2, kg: 70, naechsteStd: 5 });
  assert.match(R.vorher[0].text, /z\. B\. Beispiel Instant Oats Vanille/);
  assert.match(R.nachher[1].text, /rasch Kohlenhydrate auffüllen.*z\. B\. ≈ 115 g Beispiel Instant Oats Vanille/);
  const Wd = VP.plan(einheit("wandern", "lang", 240), { W: W2, kg: 70 });
  assert.ok(Wd.waehrend.produkte.some((x) => x.p.art === "riegel" || x.p.art === "gummi"));
  const Lauf = VP.plan(einheit("lauf", "lang", 120), { W: W2, kg: 70 });
  assert.ok(Lauf.waehrend.produkte.every((x) => x.p.art === "gel"), "beim Laufen nur Gels");
});

test("verpflegung-1.1: höchstens zwei Produktarten, Frucht höchstens 200 g, draussen nach Zone weniger (Skitour = «ski»)", () => {
  for (const d of [100, 120, 150, 180, 240, 300]) {
    const R = VP.plan(einheit("rad", "lang", d), { W, kg: 70 });
    assert.ok(new Set(R.waehrend.produkte.map((x) => x.p.art)).size <= 2, `Rad ${d} min: höchstens zwei Arten`);
    for (const x of R.waehrend.produkte) if (x.p.art === "frucht") assert.ok(x.gramm <= VP.FRUCHT_MAX_G);
  }
  const ski = Object.assign(einheit("ski", "draussen", 240, [["z1", 240]]), { spec: { zone: "z1" } });
  const Z1 = VP.ziel(ski, W, null);
  assert.equal(Z1.g_h, 30); assert.ok(Z1.gruende.some((g) => /draussen in Z1: höchstens 30 g\/h/.test(g)));
  const wan = Object.assign(einheit("wandern", "draussen", 240, [["z2", 240]]), { spec: { zone: "z2" } });
  assert.equal(VP.ziel(wan, W, null).g_h, 45);
  const R = VP.plan(ski, { W, kg: 70 });
  assert.equal(R.waehrend.produkte[0].p.art, "riegel", "draussen zuerst der Riegel");
  assert.equal(VP.ziel(Object.assign(einheit("lauf", "draussen", 150), { spec: { zone: "z2" } }), W, null).g_h, 60, "Traillauf zählt als Laufen");
  assert.equal(VP.ziel(ski, W, { g_h: 50 }).g_h, 50, "deine Anpassung gilt");
});
