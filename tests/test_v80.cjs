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
  await t.test("A3 nach einem einzigen schlechten Morgen prüft der Coach die nächsten Tage mit Grund", { todo: "V8.3 Täglicher Coach" }, async () => {
    // heute: ein einzelner tiefer HRV-Wert zählt nicht in den 7-Tage-Schnitt (Ausreisser-Regel), der Ruhepuls zählt über 3 Tage → Ampel «normal»,
    // die harte Einheit am Donnerstag bleibt ohne Hinweis
    const sim = await vorlauf();
    await sim.tage(W3, 4, { morgen: morgenMit({ [tag(W3, 2)]: { hrv: 0.68, rhr: 9, score: 60 } }) });
    assert.ok(sim.win.V83 && typeof sim.win.V83.pruefen === "function", "Tagescoach (V8.3) fehlt");
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
  await t.test("B3 für die 45 min schlägt der Coach eine Kurzfassung derselben Sportart vor, ohne zwei lange Einheiten auf einen Tag zu legen", { todo: "V8.3 Täglicher Coach" }, async () => {
    // heute: «Woche anpassen» legt die lange Ausfahrt auf den Sonntag zum langen Lauf und das lockere Schwimmen vom Sonntag auf den Samstag
    const { sim } = await knapp(tag(W3, 5));
    const sa = sim.log.get(tag(W3, 5)), so = sim.log.get(tag(W3, 6));
    assert.ok(sa.einheiten.some((e) => e.sport === "rad" && e.dauer >= 30 && e.dauer <= 45), `Samstag: ${kurz(sa.einheiten) || "leer"}`);
    assert.ok(so.einheiten.filter((e) => e.art === "lang").length <= 1, `Sonntag: ${kurz(so.einheiten)}`);
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
    for (let k = 0; k < 4; k++) {
      const mo = addDays(W3, 7 * k);
      assert.equal(sim.wochenMinuten(mo), kontrolle.wochenMinuten(mo), `Woche ${mo}`);
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
  await t.test("D2 die Abweichung von der geplanten Last wird je Einheit erkannt", { todo: "V8.1 Daten zusammenführen" }, () => {
    assert.ok(sim.win.V81 && typeof sim.win.V81.abweichung === "function", "Vergleich geplant gegen absolviert je Einheit (V8.1) fehlt");
  });
  await t.test("D3 die folgenden Einheiten werden mit der tatsächlichen Last neu geprüft", { todo: "V8.3 Täglicher Coach" }, () => {
    // heute: die harte Radeinheit am Donnerstag bleibt ohne Hinweis, obwohl der Mittwoch schon hart war
    const doT = sim.log.get(tag(W3, 3));
    assert.ok(!doT.einheiten.some((e) => e.sport === "rad" && e.stufe === "hart"), kurz(doT.einheiten));
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
  await t.test("E2 eine von der Ampel gelockerte Schlüsseleinheit wird nur vorgeschlagen, nicht von selbst verschoben", { todo: "V8.3 Täglicher Coach (Nachholen als Vorschlag)" }, async () => {
    // heute (ampel-plan-1.0): die CSS-Einheit vom «vorsichtigen» Donnerstag ersetzt am Sonntag von selbst das lockere Schwimmen
    const s2 = await vorlauf();
    await s2.tage(W3, 7, { checkin: (d) => (d === tag(W3, 3) ? { schlaf: 3, muede: 5, muskel: 6, stress: 3 } : null) });
    const nach = [];
    for (let i = 0; i < 7; i++) for (const e of s2.log.get(tag(W3, i)).einheiten) if (e.ampel && e.ampel.nachgeholt) nach.push(`${tag(W3, i)} ${e.titel}`);
    assert.deepEqual(nach, [], "von selbst nachgeholt: " + nach.join(", "));
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
  await t.test("F2 die konkrete Auswahl darf von Woche zu Woche wechseln", { todo: "V8.4 Abwechslung" }, () => {
    // heute: Schlüsseleinheiten je Modell fest (polarisiert: Rad 30/15, Laufen 4 × 4 min) – jede Woche dieselben
    const formen = new Set(wochen.map((w) => w.schluessel.sort().join(" + ")));
    assert.ok(formen.size >= 2, [...formen].join(" / "));
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
  await t.test("H2 fehlende Garmin-Daten zählen nicht als Ruhetage: die nächste Woche plant nicht weniger", { todo: "V8.3 Täglicher Coach (Datenstand)" }, () => {
    // heute: die Basis-Fitness am Montag sinkt, weil die Tage ohne Daten wie Ruhetage zählen
    const nW = addDays(W3, 7);
    assert.ok(sim.wochenMinuten(nW) >= kontrolle.wochenMinuten(nW), `nächste Woche ${sim.wochenMinuten(nW)} gegen ${kontrolle.wochenMinuten(nW)} min`);
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
