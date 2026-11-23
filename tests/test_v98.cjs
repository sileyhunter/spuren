/* V9.8 checkin-anpassung-1.0 / ampel-plan-1.3 (docs/auftrag-checkin-anpassung.md; Silas 23.11.2026: «wie Enduco, mit Ausnahme»):
   «vorsichtig» nach dem Check-in ist ein Vorschlag – Karte mit Grund, «Ignorieren» / «Überprüfen» → «Akzeptieren»; Krankheitszeichen wirken weiter von selbst.
   Simulator (tests/sim, erfundener Athlet) und Rechentests. Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { simulator, addDays } = require("./sim/lauf.cjs");
const V74 = require("../js/v74.js");

const START = "2026-11-30", W3 = "2026-12-14", DI = addDays(W3, 1);
const neu = async () => { const sim = simulator({ start: START }); await sim.tage(START, 14); sim.S.tag(DI, "07:00"); return sim; };
const MUEDE = { schlaf: 4, muede: 5, muskel: 6, stress: 3 };                 // erfundener Check-in → «vorsichtig»
const KRANK = MUEDE;                                                          // dazu Krankheitszeichen im Check-in (extra.krank)
const hart = (sim) => sim.plan(DI).einheiten.some((e) => V74.istHart(e));
const eintrag = (sim) => sim.win.V74UI.gespeichert(DI);

test("Versionen", () => {
  assert.equal(V74.VERSIONS.ampelplan, "ampel-plan-1.3");
});

test("V74.wirkung: «vorsichtig» wirkt erst nach «Akzeptieren», «krank» von selbst; Einträge vor 1.3 wie bisher", () => {
  const e = (x) => Object.assign({ v: "ampel-plan-1.3" }, x);
  assert.deepEqual(V74.wirkung("vorsichtig", null), { aus: true, offen: true }, "noch keine Antwort: Vorschlag offen, Plan bleibt");
  assert.deepEqual(V74.wirkung("vorsichtig", e({})), { aus: true, offen: true });
  assert.deepEqual(V74.wirkung("vorsichtig", e({ angenommen: { an: true, am: "x" }, trotzdem: { an: false, am: "x" } })), { aus: false, offen: false }, "akzeptiert");
  assert.deepEqual(V74.wirkung("vorsichtig", e({ angenommen: { an: false, am: "x" }, trotzdem: { an: true, am: "x" } })), { aus: true, offen: false }, "ignoriert");
  assert.deepEqual(V74.wirkung("krank", null), { aus: false, offen: false }, "Krankheitszeichen: Ruhetag von selbst");
  assert.deepEqual(V74.wirkung("krank", e({ trotzdem: { an: true, am: "x" } })), { aus: true, offen: false });
  assert.deepEqual(V74.wirkung("vorsichtig", { v: "ampel-plan-1.2" }), { aus: false, offen: false }, "alter Eintrag: wirkte schon – Vergangenes bleibt, wie es war");
  // Eintrag und Zusammenführen
  const a = V74.eintrag({ date: "2026-03-05", status: "vorsichtig", ampel: "vorsichtig", gruende: [] }, { jetzt: "2026-03-05T06:00:00Z", angenommen: { an: true, am: "2026-03-05T06:10:00Z" } });
  assert.equal(V74.pruefen(a), null); assert.equal(a.angenommen.an, true);
  assert.match(V74.pruefen(Object.assign({}, a, { angenommen: { an: "ja", am: "x" } })), /Akzeptieren/);
  const b = Object.assign({}, a, { geaendert: "2026-03-05T07:00:00Z", angenommen: { an: false, am: "2026-03-05T07:00:00Z" } });
  assert.equal(V74.zusammen(a, b).angenommen.an, false, "die zuletzt gedrückte Antwort zählt");
  assert.equal(V74.zusammen(b, Object.assign({}, a, { geaendert: "2026-03-05T08:00:00Z" })).angenommen.an, false);
});

test("Abnahme 1+2: Check-in «vorsichtig» → Plan bleibt, Vorschlag mit Grund; Akzeptieren → locker; Rückgängig → wieder wie geplant", async () => {
  const sim = await neu(), A = sim.win.V74UI;
  assert.ok(hart(sim), "Dienstag mit harter Einheit (erfunden)");
  await sim.checkin(DI, MUEDE); await A.pruefen(); sim.S.neu();
  const st = A.stand(DI);
  assert.equal(st.status, "vorsichtig"); assert.equal(st.offen, true);
  assert.ok(hart(sim), "Mein Plan bleibt, bis Silas akzeptiert");
  const V = A.vorschau(DI);
  assert.ok(V && V.geaendert.length >= 1 && V.geaendert.every((g) => g.von && g.nach && !V74.istHart(g.nach)), "Überprüfen zeigt, was sich ändert: " + JSON.stringify(V && V.geaendert.map((g) => [g.von.titel, g.nach && g.nach.titel])));
  const t = sim.plan(DI).t, html = A.banner(DI, t);
  assert.match(html, /Heute lieber locker\?/); assert.match(html, /data-aa="ignorieren"/); assert.match(html, /data-aa="pruefen"/);
  assert.doesNotMatch(html, /Mein Plan bleibt gespeichert/, "schlicht: kein Erklärtext");
  // Akzeptieren
  assert.equal(await A.trotzdem(false), null); sim.S.neu();
  assert.ok(!hart(sim), "akzeptiert: heute locker");
  assert.equal(eintrag(sim).angenommen.an, true);
  assert.equal(A.stand(DI).offen, false);
  assert.match(A.banner(DI, sim.plan(DI).t), /Rückgängig/, "angewendet: «Rückgängig» statt langer Text");
  // Rückgängig
  assert.equal(await A.trotzdem(true), null); sim.S.neu();
  assert.ok(hart(sim), "Rückgängig: wieder wie geplant");
});

test("Abnahme 3: Ignorieren → Plan bleibt, Karte weg, kommt beim nächsten Öffnen nicht wieder", async () => {
  const sim = await neu(), A = sim.win.V74UI;
  await sim.checkin(DI, MUEDE); await A.pruefen(); sim.S.neu();
  assert.equal(await A.trotzdem(true), null); sim.S.neu();
  assert.ok(hart(sim));
  assert.equal(A.stand(DI).offen, false, "beantwortet");
  await A.pruefen(); sim.S.neu();
  assert.equal(A.stand(DI).offen, false, "gleiche Lage: keine neue Karte");
  const html = A.banner(DI, sim.plan(DI).t);
  assert.doesNotMatch(html, /Heute lieber locker\?/); assert.match(html, /Doch anpassen/, "eine Zeile, falls er es sich anders überlegt");
});

test("Abnahme 4: Krankheitszeichen → Ruhetag von selbst (die Ausnahme)", async () => {
  const sim = await neu(), A = sim.win.V74UI;
  await sim.checkin(DI, KRANK, { krank: true }); await A.pruefen(); sim.S.neu();
  const st = A.stand(DI);
  assert.equal(st.status, "krank");
  assert.equal(st.offen, false);
  assert.ok(!sim.plan(DI).einheiten.some((e) => ["rad", "lauf", "schwimm"].includes(e.sport)), "Ruhetag ohne Knopfdruck");
});

test("Simulator: ohne Antwort-Haken akzeptiert der Athlet (Szenarien vor V9.8 bleiben gleich); mit Haken «ignorieren» bleibt der Plan", async () => {
  const sim = simulator({ start: START }); await sim.tage(START, 14);
  await sim.tag(DI, { checkin: () => MUEDE, ampel: () => "ignorieren" });
  assert.ok(hart(sim), "ignoriert: Plan bleibt");
});
