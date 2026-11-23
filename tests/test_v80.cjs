/* V8.0 Abnahmetests A–H (Masterprompt V8, Abschnitt 14) als Szenarien über mehrere Wochen.
   Der Simulator (tests/sim/) lädt die echten Module der Seite und spielt Tag für Tag durch: Morgenwerte und Check-in → Seite öffnen (Ampel) →
   Plan des Tages, wie er gilt → Ausführung durch einen erfundenen Athleten (alle Werte erfunden, keine echten Daten).
   Was die Seite heute kann, wird geprüft. Was erst eine spätere Etappe bringt, steht als «todo» mit der Etappe: der Test läuft mit, zeigt den
   fehlenden Teil und zählt nicht als Fehler. Kommt die Etappe, wird aus dem todo ein normaler Test. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, RANG, addDays } = require("./sim/lauf.cjs");

const START = "2026-11-30";                  // Montag nach V75.START_AB (Basis-Fitness als Standard-Start)
const W3 = "2026-12-14";                     // Szenario-Woche nach zwei normalen Wochen
const tag = (mo, i) => addDays(mo, i);
const kurz = (L) => (L || []).map((e) => `${e.sport}:${e.titel || e.art}:${e.dauer}:${e.stufe}`).join(" | ");
const rang = (e) => RANG[e.stufe] ?? 0;
const sportMin = (L) => (L || []).filter((e) => ["rad", "lauf", "schwimm"].includes(e.sport)).reduce((s, e) => s + (e.dauer || 0), 0);
const KRAFT = [{ id: "pe-kraft", aktiv: true, modus: "auto", tage: [1, 2, 3, 5, 6, 7], dauer: 60, v: "planeinstellungen-1.0" },
  { id: "pe-lang", rad: [6], lauf: [7], v: "planeinstellungen-1.0" }];

/** Simulator mit zwei normalen Wochen Vorlauf. */
async function vorlauf(opt) {
  const sim = simulator(Object.assign({ start: START }, opt || {}));
  await sim.tage(START, 14);
  return sim;
}
/** Schlechte Morgenwerte an bestimmten Tagen: { datum: { hrv: Faktor, rhr: +bpm } }. */
const morgenMit = (abw) => (d, m) => (abw[d] ? Object.assign({}, m, { hrv: Math.round(70 * abw[d].hrv), rhr: 48 + abw[d].rhr, sleepScore: abw[d].score || m.sleepScore }) : m);

/** Ampel-Schicht macht nie härter oder länger als Mein Plan; eine nachgeholte Einheit ist höchstens so lang wie die ersetzte (ampel-plan-1.0). */
function nieHaerter(sim, von, bis) {
  for (const [d, x] of sim.log) {
    if (d < von || (bis && d > bis)) continue;
    const plan = new Map(x.plan.map((e) => [e.uid, e]));
    for (const e of x.einheiten) {
      if (e.ampel && e.ampel.nachgeholt) {
        assert.ok(e.ampel.ersetzt && e.dauer <= e.ampel.ersetzt.dauer, `${d}: nachgeholt länger als die ersetzte Einheit (${e.titel})`);
        continue;
      }
      const p = plan.get(e.uid);
      assert.ok(p, `${d}: Einheit ${e.titel} nicht in Mein Plan`);
      assert.ok(e.dauer <= p.dauer, `${d}: ${e.titel} länger als geplant (${e.dauer} > ${p.dauer})`);
      assert.ok(rang(e) <= RANG[p.stufe], `${d}: ${e.titel} härter als geplant`);
    }
  }
}

test("A · Harte Einheit, Erholung schlechter als erwartet", async (t) => {
  // Dienstag harter Lauf wie geplant; Mittwoch und Donnerstag schlechte Morgenwerte (HRV −32 % bzw. −26 %, Ruhepuls +9 bzw. +8)
  const zwei = morgenMit({ [tag(W3, 2)]: { hrv: 0.68, rhr: 9, score: 60 }, [tag(W3, 3)]: { hrv: 0.74, rhr: 8, score: 62 } });
  await t.test("A1 zwei schlechte Morgen: spätestens am zweiten «vorsichtig», dann nichts Hartes und nichts länger als geplant", async () => {
    const sim = await vorlauf();
    await sim.tage(W3, 7, { morgen: zwei });
    assert.ok(sim.log.get(tag(W3, 1)).einheiten.some((e) => e.stufe === "hart"), "Dienstag: harte Einheit geplant");
    const d = sim.log.get(tag(W3, 3));
    assert.equal(d.ampel.status, "vorsichtig");
    assert.ok(d.ampel.gruende.some((g) => /HRV|Ruhepuls/.test(g)), d.ampel.gruende.join("; "));
    assert.ok(d.einheiten.every((e) => e.stufe === "locker"), kurz(d.einheiten));
    nieHaerter(sim, W3);
  });
  await t.test("A2 Check-in «Beine 6/7» am ersten schlechten Morgen: sofort «vorsichtig»", async () => {
    const sim = await vorlauf();
    await sim.tage(W3, 4, { morgen: zwei, checkin: (d) => (d === tag(W3, 2) ? { schlaf: 4, muede: 5, muskel: 6, stress: 3 } : null) });
    const d = sim.log.get(tag(W3, 2));
    assert.equal(d.ampel.status, "vorsichtig");
    assert.ok(d.ampel.gruende.some((g) => /Beine 6\/7/.test(g)));
    nieHaerter(sim, W3);
  });
  await t.test("A3 ein einzelner, deutlich schlechter Morgen: seit readiness-3.0 reagiert die Ampel am selben Tag (Erholung der Nacht)", async () => {
    // bis readiness-2.3 zählte ein einzelner tiefer HRV-Wert im 7-Tage-Schnitt kaum; jetzt ist die Erholung der Nacht ein eigenes Zeichen
    const sim = await vorlauf(), mi = tag(W3, 2);
    await sim.tage(W3, 4, { morgen: morgenMit({ [mi]: { hrv: 0.68, rhr: 9, score: 60 } }) });
    const x = sim.log.get(mi);
    assert.equal(x.ampel.status, "vorsichtig");
    assert.ok(x.ampel.gruende.some((g) => /^Erholung der Nacht \d+ %/.test(g)), x.ampel.gruende.join("; "));
    assert.ok(x.einheiten.every((e) => e.stufe === "locker"), kurz(x.einheiten));
    nieHaerter(sim, W3);
  });
  await t.test("A4 ein einzelner Morgen mit tiefer HRV, Ampel nur «normal»: der Coach prüft die nächsten Tage mit Grund (tagescoach-1.0)", async () => {
    // HRV −25 %, Ruhepuls unverändert: ein schwaches Zeichen → «normal»; der Coach schlägt für die harte Einheit am Donnerstag Tauschen oder locker vor.
    // Angenommen hat der Donnerstag keine harte Radeinheit mehr – nie härter oder länger als Mein Plan
    const sim = await vorlauf(), mi = tag(W3, 2), doD = tag(W3, 3);
    await sim.tage(W3, 4, { morgen: morgenMit({ [mi]: { hrv: 0.75, rhr: 0, score: 60 } }),
      coach: (d, V) => (d === mi ? V.filter((p) => p.anlass === "morgen").map((p) => p.id) : []) });
    const x = sim.log.get(mi);
    assert.equal(x.ampel.status, "wie_geplant", "Ampel nicht «vorsichtig»");
    assert.equal(x.ampel.ampel, "normal");
    const p = x.coach.find((v) => v.anlass === "morgen" && v.date === doD);
    assert.ok(p, "Vorschlag für Donnerstag: " + JSON.stringify(x.coach));
    assert.ok(p.grund.some((g) => /HRV heute −\d+ %/.test(g)), p.grund.join(" | "));
    assert.ok(sim.log.get(tag(W3, 1)).coach.every((v) => v.anlass !== "morgen"), "am Tag davor (normaler Morgen) kein Vorschlag");
    const d = sim.log.get(doD);
    assert.ok(!d.einheiten.some((e) => e.sport === "rad" && e.stufe === "hart"), kurz(d.einheiten));
    assert.ok(d.coach.every((v) => v.id !== p.id), "angenommen: kein zweites Mal");
    nieHaerter(sim, W3);
  });
});

test("B · Spontan 45 statt 120 Minuten Zeit", async (t) => {
  // Seite: Verfügbarkeit des Tages im Tagesblatt (die laufende Woche wird festgehalten), dann im Blatt «Woche anpassen»
  async function knapp(d) {
    const sim = await vorlauf();
    let vorher = null, fehler = null;
    await sim.tage(W3, 7, {
      vorher: async (x) => {
        if (x !== d) return;
        vorher = sim.plan(x).einheiten.map((e) => ({ sport: e.sport, dauer: e.dauer, titel: e.titel }));
        fehler = (await sim.verfuegbarkeit({ date: x }, { min: 45, sport: null })) || (await sim.aendern(sim.S.montag(x), { art: "anpassen" }));
      },
    });
    return { sim, vorher, fehler, E: sim.win.V64UI.planEintrag(W3) };
  }
  await t.test("B1 Samstag (lange Ausfahrt): der Tag passt in 45 min, die Woche ist neu verteilt und nennt die Verschiebung", async () => {
    const { sim, vorher, fehler, E } = await knapp(tag(W3, 5));
    assert.equal(fehler, null);
    assert.ok(sportMin(vorher) > 45, "vorher mehr als 45 min geplant");
    const sa = sim.log.get(tag(W3, 5));
    assert.ok(sportMin(sa.einheiten) <= 45, kurz(sa.einheiten));
    assert.ok(E && E.verteilung && E.verteilung.meldungen.some((m) => /verschoben|gekürzt|weggelassen/.test(m)), JSON.stringify(E && E.verteilung));
    assert.ok(sim.wochenMinuten(W3) <= sim.wochenMinuten(addDays(W3, -7)) + 5, "keine zusätzlichen Minuten in der Woche");
  });
  await t.test("B2 Donnerstag (Schlüsseleinheit): der Tag passt in 45 min, die Schlüsseleinheit bleibt in der Woche", async () => {
    const { sim, vorher } = await knapp(tag(W3, 3));
    const doT = sim.log.get(tag(W3, 3));
    assert.ok(sportMin(doT.einheiten) <= 45, kurz(doT.einheiten));
    const hart = (L) => L.filter((e) => e.stufe === "hart").length;
    let hartWoche = 0; for (let i = 0; i < 7; i++) hartWoche += hart(sim.log.get(tag(W3, i)).einheiten);
    assert.ok(vorher.length > 0);
    assert.equal(hartWoche, 2, "beide harten Einheiten der Woche bleiben");
  });
  await t.test("B3 für die 45 min schlägt der Coach eine Kurzfassung derselben Sportart vor, ohne zwei lange Einheiten auf einen Tag zu legen (tagescoach-1.0)", async () => {
    // Verfügbarkeit gespeichert, ohne «Woche anpassen»: der Coach sieht den Tag zu voll und schlägt die Kurzfassung vor; angenommen bleibt der Sonntag, wie er war
    const sim = await vorlauf(), sa = tag(W3, 5), soD = tag(W3, 6);
    let soVorher = null;
    // V9.5 zeit-intensitaet-1.0: am Sonntag darf Zeit als Ziel eine zusätzliche lockere Einheit setzen (Rad lag nach dem kurzen Samstag zurück) – das Übrige bleibt
    const kern = (L) => (L || []).filter((e) => !e.zusatz).map((e) => `${e.sport}:${e.titel}:${e.dauer}`).join(" | ");
    await sim.tage(W3, 7, {
      vorher: async (x) => { if (x !== sa) return; soVorher = kern(sim.plan(soD).einheiten); assert.equal(await sim.verfuegbarkeit({ date: sa }, { min: 45, sport: null }), null); },
      coach: (d, V) => (d === sa ? V.filter((p) => p.anlass === "zeit" && p.date === sa).map((p) => p.id) : []),
    });
    const s = sim.log.get(sa), so = sim.log.get(soD);
    const p = s.coach.find((v) => v.anlass === "zeit" && v.date === sa);
    assert.ok(p && p.arten[0] === "kurz", JSON.stringify(s.coach));
    assert.ok(s.einheiten.some((e) => e.sport === "rad" && e.dauer >= 30 && e.dauer <= 45), `Samstag: ${kurz(s.einheiten) || "leer"}`);
    assert.ok(sportMin(s.einheiten) <= 45, kurz(s.einheiten));
    assert.ok(so.einheiten.filter((e) => e.art === "lang").length <= 1, `Sonntag: ${kurz(so.einheiten)}`);
    assert.equal(kern(sim.plan(soD).einheiten), soVorher, "Sonntag unverändert (ausser einer zusätzlichen lockeren Einheit, V9.5)");
    assert.ok(sim.plan(soD).einheiten.filter((e) => e.zusatz).every((e) => !e.schluessel && e.art === "locker"), "höchstens locker dazu");
  });
});

test("C · Mehrere Tage aussergewöhnlich gut erholt", async (t) => {
  // vier Wochen lang ab der dritten Woche sehr gute Morgenwerte (HRV +18 %, Ruhepuls −4) und Check-in überall 1–2
  const gut = (d, m) => (d >= W3 ? Object.assign({}, m, { hrv: Math.round(m.hrv * 1.18), rhr: m.rhr - 4, sleepH: 8.2, sleepScore: 90 }) : m);
  const checkin = (d) => (d >= W3 ? { schlaf: 1, muede: 2, muskel: 1, stress: 2 } : null);
  const sim = await vorlauf({ seed: 11 }), kontrolle = await vorlauf({ seed: 11 });
  await sim.tage(W3, 28, { morgen: gut, checkin });
  await kontrolle.tage(W3, 28);
  await t.test("C1 die Ampel steht meist auf «bereit», und keine Einheit wird länger oder härter als Mein Plan", () => {
    let bereit = 0;
    for (let i = 0; i < 28; i++) { const x = sim.log.get(tag(W3, i)); if (x.ampel.status === "wie_geplant" && x.ampel.ampel === "bereit") bereit++; }
    assert.ok(bereit >= 20, `bereit an ${bereit} von 28 Tagen`);
    nieHaerter(sim, W3);
    for (let i = 0; i < 28; i++) { const x = sim.log.get(tag(W3, i)); assert.equal(kurz(x.einheiten), kurz(x.plan), tag(W3, i)); }
  });
  await t.test("C2 gute Erholung steigert den Plan nicht: Wochenstunden wie ohne gute Erholung, Anstieg höchstens 10 % je Woche", () => {
    // Mein Plan der ersten Woche gleich wie in der Kontrolle (gleiche Vorgeschichte); später nur so viel anders, wie die Kontrolle an ihren
    // «vorsichtig»-Tagen (readiness-3.0) weniger trainiert hat – nie mehr als 15 min je Woche. Gute Erholung fügt nichts hinzu: absolviert = Mein Plan.
    for (let k = 0; k < 4; k++) {
      const mo = addDays(W3, 7 * k);
      if (k === 0) assert.equal(sim.wochenMinuten(mo, "plan"), kontrolle.wochenMinuten(mo, "plan"), `Woche ${mo}`);
      else assert.ok(Math.abs(sim.wochenMinuten(mo, "plan") - kontrolle.wochenMinuten(mo, "plan")) <= 15, `Woche ${mo}: ${sim.wochenMinuten(mo, "plan")} gegen ${kontrolle.wochenMinuten(mo, "plan")} min`);
      assert.equal(sim.wochenMinuten(mo), sim.wochenMinuten(mo, "plan"), `Woche ${mo}: nichts dazu`);
    }
    let vorher = null;
    for (let k = 0; k < 6; k++) {
      const K = sim.plan(addDays(START, 7 * k)).K;
      if (K.w.erholung || K.w.taper) continue;
      if (vorher != null) assert.ok(K.w.stunden <= Math.max(vorher * 1.1, vorher + 0.5) + 1e-9, `${K.w.woche}: ${vorher} → ${K.w.stunden} h`);
      vorher = K.w.stunden;
    }
  });
});

test("C (V8.5) · Modell «Automatisch» über mehrere Wochen", async (t) => {
  // automatisch-1.0: startet wie «kombiniert»; gute Erholung macht nichts härter, eine klar belastete Vorwoche (Ampel an 3 Tagen «vorsichtig») eine harte Einheit weniger
  const mitAuto = async (seed) => {
    const sim = simulator({ start: START, seed });
    sim.D.plan_modell = [{ id: "modell", modell: "automatisch", wechsel: "2027-02-01", v: "modell-1.0", geaendert: "2026-11-01T08:00:00.000Z" }];
    sim.S.neu();
    await sim.tage(START, 14);
    return sim;
  };
  const hartLand = (L) => (L || []).filter((e) => (e.sport === "rad" || e.sport === "lauf") && e.stufe === "hart").length;
  const woche = (sim, mo, feld) => { let n = 0; for (let i = 0; i < 7; i++) n += hartLand(sim.log.get(tag(mo, i))[feld || "plan"]); return n; };
  await t.test("C3 vier Wochen sehr gut erholt: «Automatisch» plant wie «kombiniert» – dieselben Einheiten, höchstens zwei harte an Land, jede Woche mit Gründen", async () => {
    const gut = (d, m) => (d >= W3 ? Object.assign({}, m, { hrv: Math.round(m.hrv * 1.18), rhr: m.rhr - 4, sleepH: 8.2, sleepScore: 90 }) : m);
    const checkin = (d) => (d >= W3 ? { schlaf: 1, muede: 2, muskel: 1, stress: 2 } : null);
    const sim = await mitAuto(11), kontrolle = await vorlauf({ seed: 11 });
    await sim.tage(W3, 28, { morgen: gut, checkin });
    await kontrolle.tage(W3, 28, { morgen: gut, checkin });
    for (let k = 0; k < 4; k++) {
      const mo = addDays(W3, 7 * k), K = sim.plan(mo).K;
      assert.ok(K.auto, `${mo}: kein Entscheid`);
      assert.equal(K.auto.abweichung, false, `${mo}: ${K.auto.kurz}`);
      assert.ok(K.auto.harte <= 2 && K.auto.harte === K.auto.vorlage, `${mo}: ${K.auto.kurz}`);
      for (const a of ["phase", "verteilung"].concat(K.w.erholung ? ["harte"] : ["zeit", "vertraeglich", "ermuedung"])) {
        assert.ok(K.auto.gruende.some((g) => g.art === a), `${mo}: Grund ${a} fehlt`);
      }
      for (let i = 0; i < 7; i++) assert.equal(kurz(sim.log.get(tag(mo, i)).plan), kurz(kontrolle.log.get(tag(mo, i)).plan), tag(mo, i));
      assert.ok(woche(sim, mo) <= 2, `${mo}: ${woche(sim, mo)} harte Einheiten an Land`);
    }
    nieHaerter(sim, W3);
  });
  await t.test("C4 drei schlechte Morgen: in der Woche danach eine harte Einheit an Land (der Lauf wird locker, das Rad bleibt), danach wieder zwei", async () => {
    const sim = await mitAuto(13);
    // erste Belastungswoche ab W3, auf die zwei weitere Belastungswochen folgen (Erholungswochen hat die Vorlage ohnehin mit einer harten Einheit)
    const last = (mo) => !sim.plan(mo).K.w.erholung;
    let L = W3; while (!(last(L) && last(addDays(L, 7)) && last(addDays(L, 14)))) L = addDays(L, 7);
    const schlecht = morgenMit({ [tag(L, 0)]: { hrv: 0.66, rhr: 9, score: 58 }, [tag(L, 1)]: { hrv: 0.68, rhr: 9, score: 60 }, [tag(L, 2)]: { hrv: 0.7, rhr: 8, score: 62 } });
    const n = Math.round((Date.parse(L) - Date.parse(W3)) / 864e5) + 21;
    await sim.tage(W3, n, { morgen: schlecht });
    const vors = (mo) => { let k = 0; for (let i = 0; i < 7; i++) if (["vorsichtig", "krank"].includes(sim.log.get(tag(mo, i)).ampel.status)) k++; return k; };
    assert.ok(vors(L) >= 3, `«vorsichtig» an ${vors(L)} Tagen`);
    const W4 = addDays(L, 7), W5 = addDays(L, 14), K4 = sim.plan(W4).K, K5 = sim.plan(W5).K;
    assert.equal(K4.auto.harte, 1, K4.auto.kurz); assert.equal(K4.auto.grund, "Ermüdung der Vorwoche");
    assert.equal(woche(sim, W4), 1, "eine harte Einheit an Land");
    const di = sim.log.get(tag(W4, 1)).plan.find((e) => e.sport === "lauf"), doR = sim.log.get(tag(W4, 3)).plan.find((e) => e.sport === "rad");
    assert.ok(di && di.stufe === "locker" && doR && doR.stufe === "hart", `Di ${di && di.titel}, Do ${doR && doR.titel}`);
    assert.ok(vors(W4) < 3, `auch danach «vorsichtig» an ${vors(W4)} Tagen`);
    assert.equal(K5.auto.harte, 2, `${K5.auto.kurz}: nach einer ruhigen Woche wieder zwei`);
    assert.equal(woche(sim, W5), 2);
    nieHaerter(sim, W3);
  });
});

test("D · Einheit deutlich intensiver als geplant", async (t) => {
  // Mittwoch: lockere Ausfahrt (Z2) als Schwellenfahrt gefahren (Last etwa 1,7 × geplant)
  const hart = (d, E, info) => (d === tag(W3, 2) ? E.map((e) => ({ sport: e.sport, min: e.dauer, tss: Math.round((e.dauer / 60) * 0.9 * 0.9 * 100), uid: e.uid })) : null);
  const sim = await vorlauf();
  await sim.tage(W3, 7, { ausfuehren: hart });
  await t.test("D1 die Ampel am nächsten Morgen rechnet mit der tatsächlichen Last", () => {
    const mi = sim.log.get(tag(W3, 2)), plan = mi.einheiten.reduce((s, e) => s + (e.tl || 0), 0), ist = mi.absolviert.reduce((s, a) => s + a.tss, 0);
    assert.ok(ist > 1.4 * plan, `ist ${ist}, geplant ≈ ${plan}`);
    const FK = sim.win.FK, r = FK.readiness(sim.D.days, sim.D.activities, sim.S.U.befinden(), tag(W3, 3));
    const erwartet = [1, 2, 3].reduce((s, k) => s + sim.D.activities.filter((a) => a.date === addDays(tag(W3, 3), -k) && FK.zaehlt(a)).reduce((x, a) => x + a.tss, 0), 0);
    assert.equal(r.indikatoren.last.tage3, erwartet);
    nieHaerter(sim, W3);
  });
  await t.test("D2 die Abweichung von der geplanten Last wird je Einheit erkannt (last-abweichung-1.0, V8.1)", () => {
    const V81 = sim.win.V81, mi = sim.log.get(tag(W3, 2));
    assert.ok(V81 && typeof V81.abweichung === "function", "Vergleich geplant gegen absolviert je Einheit fehlt");
    for (const a of mi.absolviert) {
      const e = mi.einheiten.find((x) => x.uid === a.uid) || mi.einheiten.find((x) => x.sport === a.sport);
      if (!e || !e.tl) continue;
      const r = V81.abweichung(e.tl, { tss: a.tss });
      assert.equal(r.urteil, "mehr als geplant", `${a.sport}: geplant ≈ ${e.tl}, ist ${a.tss}`);
    }
    // die übrigen Tage der Woche wurden wie geplant gefahren: keine wird als «mehr als geplant» gemeldet. («weniger als geplant» prüft der Test nicht:
    // das Körpermodell des Simulators ist für Laufen nicht auf TL ≈ abgeglichen – offener Punkt 105, vor V8.3)
    for (let i = 0; i < 7; i++) {
      if (i === 2) continue;
      const L = sim.log.get(tag(W3, i)); if (!L) continue;
      for (const a of L.absolviert) { const e = L.einheiten.find((x) => x.uid === a.uid); if (e && e.tl) assert.notEqual(V81.abweichung(e.tl, { tss: a.tss }).urteil, "mehr als geplant", `${tag(W3, i)} ${a.sport}`); }
    }
  });
  await t.test("D3 die folgenden Einheiten werden mit der tatsächlichen Last neu geprüft (tagescoach-1.0)", async () => {
    // Donnerstag: der Coach sieht den Mittwoch härter als geplant und schlägt für die harte Radeinheit Tauschen oder locker vor; angenommen ist sie nicht mehr hart
    const s2 = await vorlauf(), doD = tag(W3, 3);
    await s2.tage(W3, 7, { ausfuehren: hart, coach: (d, V) => (d === doD ? V.filter((p) => p.anlass === "last").map((p) => p.id) : []) });
    const x = s2.log.get(doD), p = x.coach.find((v) => v.anlass === "last" && v.date === doD);
    assert.ok(p, JSON.stringify(x.coach));
    assert.ok(p.grund.some((g) => /Gestern: .* \d,\d × geplant gefahren – zwei harte Tage an Land/.test(g)), p.grund.join(" | "));
    assert.ok(!x.einheiten.some((e) => e.sport === "rad" && e.stufe === "hart"), kurz(x.einheiten));
    assert.ok(sim.log.get(doD).einheiten.some((e) => e.sport === "rad" && e.stufe === "hart"), "ohne Annehmen bleibt sie (nur Vorschlag)");
    nieHaerter(s2, W3);
  });
});

test("E · Mehrere Einheiten ausgelassen", async (t) => {
  const aus = (d) => d >= tag(W3, 1) && d <= tag(W3, 3);
  const sim = await vorlauf(), kontrolle = await vorlauf();
  await sim.tage(W3, 14, { ausfuehren: (d) => (aus(d) ? [] : null) });
  await kontrolle.tage(W3, 14);
  await t.test("E1 nichts wird nachgeholt: Rest der Woche und nächste Woche ohne zusätzliche Einheiten oder Minuten", () => {
    for (let i = 1; i <= 3; i++) assert.equal(sim.log.get(tag(W3, i)).absolviert.length, 0);
    for (let i = 4; i < 7; i++) assert.equal(kurz(sim.log.get(tag(W3, i)).einheiten), kurz(kontrolle.log.get(tag(W3, i)).einheiten), tag(W3, i));
    const nW = addDays(W3, 7);
    assert.ok(sim.wochenMinuten(nW) <= kontrolle.wochenMinuten(nW), `nächste Woche ${sim.wochenMinuten(nW)} gegen ${kontrolle.wochenMinuten(nW)} min`);
  });
  await t.test("E2 eine von der Ampel gelockerte Schlüsseleinheit wird nur vorgeschlagen, nicht von selbst verschoben (ampel-plan-1.2, tagescoach-1.0)", async () => {
    const doD = tag(W3, 3), ci = (d) => (d === doD ? { schlaf: 3, muede: 5, muskel: 6, stress: 3 } : null);
    const s2 = await vorlauf();
    await s2.tage(W3, 7, { checkin: ci });
    const nach = [];
    for (let i = 0; i < 7; i++) for (const e of s2.log.get(tag(W3, i)).einheiten) if (e.ampel && e.ampel.nachgeholt) nach.push(`${tag(W3, i)} ${e.titel}`);
    assert.deepEqual(nach, [], "von selbst nachgeholt: " + nach.join(", "));
    const p = s2.log.get(doD).coach.find((v) => v.anlass === "nachholen");
    assert.ok(p && /nachholen\?$/.test(p.titel), JSON.stringify(s2.log.get(doD).coach));
    // angenommen: am vorgeschlagenen Tag steht die Schlüsseleinheit in Mein Plan (an Stelle der lockeren derselben Sportart, nicht länger)
    const s3 = await vorlauf(); let ziel = null, ersetzt = null;
    await s3.tage(W3, 7, { checkin: ci, coach: (d, V) => {
      const q = d === doD ? V.find((v) => v.anlass === "nachholen") : null; if (!q) return [];
      const a = q.optionen[0].aktionen[0]; ziel = a.date; ersetzt = s3.plan(a.date).plan.find((e) => e.uid === a.uid);
      return [q.id];
    } });
    assert.ok(ziel > doD, String(ziel));
    const z = s3.log.get(ziel).plan.find((e) => e.uid === ersetzt.uid);
    assert.ok(z && z.stufe !== "locker" && z.sport === ersetzt.sport && z.dauer <= ersetzt.dauer, `${ziel}: ${kurz(s3.log.get(ziel).plan)}`);
  });
});

test("F · Zwei Wochen mit anderer Workout-Auswahl, gleicher Reiz", async (t) => {
  const sim = await vorlauf();
  await sim.tage(W3, 7);
  const wochen = [START, addDays(START, 7), W3].map((mo) => {
    const E = []; for (let i = 0; i < 7; i++) E.push(...sim.log.get(tag(mo, i)).einheiten);
    return { mo, E, hart: E.filter((e) => e.stufe === "hart").map((e) => e.sport).sort().join(","), schluessel: E.filter((e) => e.stufe === "hart").map((e) => e.titel) };
  });
  await t.test("F1 der beabsichtigte Reiz bleibt: gleiche harte Einheiten je Sportart in jeder Belastungswoche", () => {
    for (const w of wochen) assert.equal(w.hart, wochen[0].hart, `${w.mo}: ${w.hart}`);
    assert.ok(wochen[0].hart.includes("rad") && wochen[0].hart.includes("lauf"));
  });
  await t.test("F2 die konkrete Auswahl wechselt von Woche zu Woche (abwechslung-1.0), die Vergleichseinheit kommt wieder", () => {
    const formen = new Set(wochen.map((w) => w.schluessel.sort().join(" + ")));
    assert.ok(formen.size >= 2, [...formen].join(" / "));
    // jede dritte Woche dieselbe Vergleichseinheit (V64.formFuer): Woche 0 und 3 gleich
    const V64 = sim.win.V64, ids = (mo) => { const L = []; for (let i = 0; i < 7; i++) for (const e of sim.plan(tag(mo, i)).einheiten) if (e.art === "schluessel") L.push(e.vorlage || e.id); return L.sort().join(","); };
    const k = [0, 1, 2, 3].map((i) => addDays(START, 7 * i)).filter((mo) => !sim.plan(mo).K.w.erholung);
    const vgl = k.filter((mo) => V64.formFuer("rad_vo2", mo).vergleich);
    if (vgl.length >= 2) assert.equal(ids(vgl[0]), ids(vgl[1]), vgl.join(" / "));
    assert.equal(V64.VERSIONS.abwechslung, "abwechslung-1.0");
  });
});

test("G · Gesperrte Einheit bleibt bei jeder Neuberechnung", async () => {
  const sim = await vorlauf({ einstellungen: KRAFT });
  const doD = tag(W3, 3), saD = tag(W3, 5);
  let schloss = null;
  await sim.tage(W3, 7, {
    vorher: async (d) => {
      if (d === W3) {
        const e = sim.plan(doD).einheiten.find((x) => x.sport === "rad");
        assert.equal(await sim.aendern(W3, { art: "einheit", date: doD, uid: e.uid, felder: { gesperrt: true } }), null);
        assert.equal(await sim.aendern(W3, { art: "sperren", date: saD }), null);
        schloss = { e: JSON.stringify([e.titel, e.dauer, e.teile]), uid: e.uid, sa: kurz(sim.plan(saD).einheiten.map((x) => Object.assign({ stufe: "" }, x))) };
      }
      if (d === tag(W3, 1)) {                                               // Dienstag: Donnerstag nur 30 min Zeit, «Woche anpassen», dann «Neu berechnen»
        assert.equal(await sim.verfuegbarkeit({ date: doD }, { min: 30, sport: null }), null);
        assert.equal(await sim.aendern(W3, { art: "anpassen" }), null);
        assert.equal(await sim.aendern(W3, { art: "neuberechnen" }), null);
      }
    },
    checkin: (d) => (d === doD || d === saD ? { schlaf: 4, muede: 6, muskel: 6, stress: 4 } : null),   // Ampel «vorsichtig» am Donnerstag und Samstag
  });
  const doT = sim.log.get(doD), e = doT.einheiten.find((x) => x.uid === schloss.uid);
  assert.equal(doT.ampel.status, "vorsichtig");
  assert.ok(e, "gesperrte Einheit noch am Donnerstag: " + kurz(doT.einheiten));
  assert.equal(JSON.stringify([e.titel, e.dauer, JSON.parse(e.teile)]), schloss.e);
  assert.equal(e.gesperrt, true);
  const sa = sim.log.get(saD);
  assert.equal(sa.ampel.status, "vorsichtig");
  assert.equal(kurz(sa.einheiten.map((x) => Object.assign({}, x, { stufe: "" }))), schloss.sa, "gesperrter Samstag unverändert");
});

test("H · Seite ohne neue Garmin-Daten", async (t) => {
  // ab Mittwoch der dritten Woche kommen keine Morgenwerte und keine Aktivitäten mehr an (trainiert wird trotzdem, nur nicht eingespielt)
  const ab = tag(W3, 2);
  const sim = await vorlauf(), kontrolle = await vorlauf();
  const morgen = (d, m) => (d >= ab ? null : m);
  await sim.tage(W3, 14, { morgen, ausfuehren: (d) => (d >= ab ? [] : null) });
  await kontrolle.tage(W3, 14);
  await t.test("H1 der Plan steht weiter, die Ampel sagt «nicht beurteilbar» und nennt, was fehlt", () => {
    for (let i = 2; i < 14; i++) {
      const x = sim.log.get(addDays(W3, i));
      assert.ok(x.tag, `${addDays(W3, i)}: kein Plan`);
      assert.equal(x.ampel.status, "wie_geplant");
    }
    const fr = sim.log.get(tag(W3, 4));
    assert.equal(fr.ampel.ampel, "nicht beurteilbar");
    const r = sim.win.FK.readiness(sim.D.days, sim.D.activities, sim.S.U.befinden(), tag(W3, 4));
    assert.equal(r.status, "nicht beurteilbar");
    assert.ok(r.gruende.some((g) => /Ruhepuls/.test(g)) && r.gruende.some((g) => /Schlaf/.test(g)), r.gruende.join("; "));
    for (let i = 2; i < 7; i++) assert.equal(kurz(sim.log.get(tag(W3, i)).einheiten), kurz(kontrolle.log.get(tag(W3, i)).einheiten));
  });
  await t.test("H2 fehlende Garmin-Daten zählen nicht als Ruhetage: die Fitness gilt vom letzten Tag mit Daten (basis-1.2)", () => {
    const nW = addDays(W3, 7), V75 = sim.win.V75;
    const B = V75.basisDaten(sim.D.activities, nW, null, { datenBis: V75.datenBis(sim.D) }), roh = V75.basisDaten(sim.D.activities, nW);
    assert.deepEqual(B.luecke && [B.luecke.von, B.luecke.fitness_bis], [ab, tag(W3, 1)]);
    for (const s of ["rad", "lauf", "schwimm"]) assert.ok(B[s].fitness >= roh[s].fitness, s);
    assert.ok(B.rad.fitness > roh.rad.fitness, `${B.rad.fitness} > ${roh.rad.fitness}`);
    assert.deepEqual(sim.win.V75UI.basisDaten(nW).luecke, B.luecke, "die Seite rechnet mit dem Datenstand");
    // nicht weniger, weil Daten fehlen: höchstens so viel tiefer wie das Training nach dem letzten Datentag an Fitness gebracht hätte
    assert.ok(sim.wochenMinuten(nW) >= 0.95 * kontrolle.wochenMinuten(nW), `nächste Woche ${sim.wochenMinuten(nW)} gegen ${kontrolle.wochenMinuten(nW)} min`);
  });
  await t.test("H3 Heute zeigt den eingeschränkten Datenstand durchgängig (Empfehlung, Ampel, Form)", { todo: "V8.6 Coach-Dashboard" }, () => {
    assert.ok(sim.win.V86 && typeof sim.win.V86.datenstand === "function", "Datenstand auf Heute (V8.6) fehlt");
  });
});

test("Zusammenwirken über acht Wochen (Kraft, lange Tage, Krankheit, Lücken, Sperren)", async () => {
  const sim = simulator({ start: START, einstellungen: KRAFT, seed: 5 });
  await sim.tage(START, 7);
  const W = (k) => addDays(START, 7 * k), events = [];
  let gesperrt = null;
  const haken = {
    vorher: async (d) => {
      if (d === W(1)) events.push(await sim.verfuegbarkeit({ date: tag(W(1), 1) }, { min: 0, sport: null }), await sim.aendern(W(1), { art: "anpassen" }));
      if (d === W(5)) {
        const e = sim.plan(tag(W(5), 5)).einheiten.find((x) => x.art === "lang");
        if (e) { events.push(await sim.aendern(W(5), { art: "einheit", date: tag(W(5), 5), uid: e.uid, felder: { gesperrt: true } })); gesperrt = { uid: e.uid, d: tag(W(5), 5), dauer: e.dauer, titel: e.titel }; }
      }
    },
    checkin: (d) => {
      if (d === tag(W(3), 1) || d === tag(W(3), 2)) return { wahl: { schlaf: 4, muede: 5, muskel: 4, stress: 4 }, extra: { krank: ["Halsweh"] } };
      if (d === tag(W(5), 5)) return { schlaf: 4, muede: 6, muskel: 6, stress: 4 };
      return { schlaf: 2, muede: 3, muskel: 3, stress: 2 };
    },
    ausfuehren: (d, E) => {
      if (d === tag(W(2), 2) || d === tag(W(2), 3)) return [];                                    // zwei Tage ausgelassen
      if (d === tag(W(4), 2)) return E.map((e) => ({ sport: e.sport, min: e.dauer, tss: Math.round((e.dauer / 60) * 81), uid: e.uid }));   // zu hart
      return null;
    },
  };
  await sim.tage(W(1), 49, haken);
  assert.ok(events.every((f) => f == null), "Änderungen ohne Fehler: " + events.filter(Boolean).join("; "));
  nieHaerter(sim, W(1));
  // Krank → Ruhetag (nichts ausser Gesperrtem)
  for (const d of [tag(W(3), 1), tag(W(3), 2)]) { const x = sim.log.get(d); assert.equal(x.ampel.status, "krank"); assert.ok(x.einheiten.every((e) => e.gesperrt), kurz(x.einheiten)); }
  // gesperrte lange Einheit trotz «vorsichtig» unverändert
  if (gesperrt) { const x = sim.log.get(gesperrt.d), e = x.einheiten.find((y) => y.uid === gesperrt.uid); assert.ok(e && e.dauer === gesperrt.dauer && e.titel === gesperrt.titel, kurz(x.einheiten)); }
  // Kraft-Regel 1: am Tag nach dem Krafttraining keine harte Rad- oder Laufeinheit (Mein Plan); Krafttraining zählt nicht in die Last
  let kraftTage = 0;
  for (const [d, x] of sim.log) {
    if (d < W(1)) continue;
    if (x.plan.some((e) => e.sport === "kraft")) {
      kraftTage++;
      const n = sim.log.get(addDays(d, 1));
      if (n) assert.ok(!n.plan.some((e) => (e.sport === "rad" || e.sport === "lauf") && e.stufe === "hart" && !e.gesperrt), `${addDays(d, 1)} nach Kraft: ${kurz(n.plan)}`);
    }
    for (const a of x.absolviert) if (a.sport === "kraft") assert.equal(sim.win.FK.zaehlt(sim.D.activities.find((y) => y.id === a.id)), false);
  }
  assert.ok(kraftTage >= 5, `Krafttraining an ${kraftTage} Tagen`);
  // Dienstag der zweiten Woche ohne Zeit: nichts geplant
  assert.equal(sim.log.get(tag(W(1), 1)).einheiten.length, 0, kurz(sim.log.get(tag(W(1), 1)).einheiten));
  // Wochenstunden: Anstieg höchstens 10 % (mindestens 0,5 h) gegenüber der letzten Belastungswoche
  let vorher = null;
  for (let k = 1; k <= 7; k++) {
    const K = sim.plan(W(k)).K;
    if (K.w.erholung || K.w.taper) continue;
    if (vorher != null) assert.ok(K.w.stunden <= Math.max(vorher * 1.1, vorher + 0.5) + 1e-9, `${W(k)}: ${vorher} → ${K.w.stunden} h`);
    vorher = K.w.stunden;
  }
});

test("Woche im Kalender: Bewegungszeit und TL ohne Krafttraining wie die Wochenauswertung (V8.0)", () => {
  const sim = simulator({ start: START });
  sim.S.tag(tag(START, 2));
  sim.aktivitaet(tag(START, 1), "rad", 60, 60, { mv: 3300 });               // 60 min Timer, 55 min Bewegung
  sim.aktivitaet(tag(START, 1), "kraft", 50, 30);                           // Krafttraining mit Last von Garmin
  sim.S.neu();
  const K = sim.S.kontext(START), k = sim.win.V66UI.wochenKopf(START, K);
  assert.equal(Math.round(k.istMin), 55, "Bewegungszeit, nur Schwimmen, Rad, Laufen");
  assert.equal(Math.round(k.istTl), 60, "TL ohne Krafttraining (pmc-2.1)");
});

test("Harte Einheiten an Land nie an zwei Tagen hintereinander (verfuegbarkeit-1.2, kraft-plan-1.2; Silas' Frage vom 18.11.2026)", async (t) => {
  // dienstags nur Schwimmen (wie an Kurstagen), Mi–Fr 2:45 h: der harte Lauf muss umziehen und darf nicht neben das harte Rad am Donnerstag
  const woche = (mitKraft) => {
    const sim = simulator({ start: START, einstellungen: mitKraft ? KRAFT : [] });
    for (const x of sim.D.plan_verfuegbarkeit) { if (x.wt === 2) Object.assign(x, { min: 165, sport: ["schwimm"] }); else if (x.wt >= 3 && x.wt <= 5) x.min = 165; }
    sim.S.neu();
    return sim.plan(START).K.w;
  };
  const hartLand = (t) => (t.einheiten || []).some((e) => (e.sport === "rad" || e.sport === "lauf") && e.schluessel);
  for (const mitKraft of [false, true]) {
    await t.test(mitKraft ? "mit Krafttraining (Tag automatisch)" : "ohne Krafttraining", () => {
      const w = woche(mitKraft), T = w.tage;
      assert.equal(T.filter(hartLand).length, 2, T.map((x) => x.date + " " + (x.einheiten || []).map((e) => e.titel).join("+")).join(" | "));
      for (let i = 0; i + 1 < T.length; i++) assert.ok(!(hartLand(T[i]) && hartLand(T[i + 1])), `${T[i].date}/${T[i + 1].date} beide hart`);
      assert.ok((w.hinweise || []).some((h) => /nicht zwei harte Tage hintereinander/.test(h)), (w.hinweise || []).join(" / "));
      if (mitKraft) {
        const k = T.findIndex((x) => (x.einheiten || []).some((e) => e.sport === "kraft"));
        assert.ok(k >= 0, "Krafttraining geplant");
        assert.ok(!T[k + 1] || !hartLand(T[k + 1]), "am Tag danach keine harte Einheit an Land");
      }
    });
  }
  await t.test("geht es nicht anders (nur Mi und Do mit Zeit für Land), meldet die Woche es", () => {
    const sim = simulator({ start: START });
    for (const x of sim.D.plan_verfuegbarkeit) {
      if (x.wt === 3 || x.wt === 4) x.min = 165; else if (x.wt !== 1) Object.assign(x, { min: 120, sport: ["schwimm"] });
    }
    sim.S.neu();
    const w = sim.plan(START).K.w;
    assert.ok((w.hinweise || []).some((h) => /Harte Einheiten an zwei Tagen hintereinander/.test(h)) || !w.tage.some((x, i) => hartLand(x) && w.tage[i + 1] && hartLand(w.tage[i + 1])),
      (w.hinweise || []).join(" / "));
  });
});

test("I · Ausgefallen, Schmerzen, Umfang (tagescoach-1.1, V8.4)", async (t) => {
  const di = tag(W3, 1), mi = tag(W3, 2), fr = tag(W3, 4);
  await t.test("I1 Dienstag ausgelassen: die Schlüsseleinheit kommt nicht in die Erholungswoche; den fehlenden Lauf-Umfang holt eine längere lockere Einheit nach – nie mehr als Mein Plan", async () => {
    const sim = await vorlauf();
    let vorher = null;
    await sim.tage(W3, 7, {
      ausfuehren: (d) => (d === di ? [] : null),
      vorher: async (d) => { if (d === mi) vorher = sim.wochenMinuten(W3, "plan"); },
      coach: (d, V) => (d === mi ? V.filter((p) => p.anlass === "umfang" && p.date === fr).map((p) => p.id) : []),
    });
    const x = sim.log.get(mi);
    assert.ok(!x.coach.some((p) => p.anlass === "ausgefallen" && /nächste Woche/.test(p.titel)), "nicht in die Erholungswoche nachholen");
    const p = x.coach.find((v) => v.anlass === "umfang" && v.date === fr);
    assert.ok(p && p.grund.some((g) => /es fehlen ≈/.test(g)), JSON.stringify(x.coach));
    const f = sim.log.get(fr), lauf = f.einheiten.find((e) => e.sport === "lauf");
    assert.ok(lauf && lauf.stufe === "locker" && lauf.dauer > 45, kurz(f.einheiten));
    // absolviert wird in der Woche nie mehr als Mein Plan vor dem Ausfall vorsah (verlängert wird höchstens um das Fehlende)
    let ist = 0; for (let i = 0; i < 7; i++) for (const a of sim.log.get(tag(W3, i)).absolviert) if (["rad", "lauf", "schwimm"].includes(a.sport)) ist += a.min;
    assert.ok(ist <= vorher, `${ist} > ${vorher}`);
  });
  await t.test("I2 Schmerzen am Knie im Check-in: der Coach bremst die Läufe der nächsten Tage – angenommen locker und kürzer", async () => {
    const sim = await vorlauf();
    let vorher = null;
    await sim.tage(W3, 5, {
      checkin: (d) => (d === mi ? { wahl: { schlaf: 2, muede: 3, muskel: 3, stress: 2, motivation: 2 }, extra: { schmerz: { stufe: "leicht", ort: ["Knie"] } } } : null),
      vorher: async (d) => { if (d === mi) vorher = sim.plan(fr).einheiten.find((e) => e.sport === "lauf"); },
      coach: (d, V) => (d === mi ? V.filter((p) => p.anlass === "schmerz").map((p) => p.id) : []),
    });
    const x = sim.log.get(mi), p = x.coach.find((v) => v.anlass === "schmerz" && v.date === fr);
    assert.ok(p && p.grund[0].startsWith("Schmerzen leicht: Knie"), JSON.stringify(x.coach));
    const lauf = sim.log.get(fr).einheiten.find((e) => e.sport === "lauf");
    assert.ok(vorher && lauf && lauf.dauer <= Math.ceil(vorher.dauer * 0.7 / 5) * 5 && lauf.stufe === "locker", `${vorher && vorher.dauer} → ${lauf && lauf.dauer}`);
  });
});
