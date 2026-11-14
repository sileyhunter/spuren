// Abnahmetests V7 (js/v7.js: planvergleich-1.0, profil-teile-1.0, kalender-3.0; Aufbau navigation-7.0 in index.html) – nur erfundene Werte.
// Aufruf: node --test tests/test_v7.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
global.window = undefined;
const V7 = require("../js/v7.js");
const V6 = require("../js/v6.js");
const lies = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const nah = (a, b, eps) => assert.ok(Math.abs(a - b) <= (eps || 1e-6), `${a} ≠ ${b}`);

// Erfundenes Profil: Pulsgrenzen 120 / 140 / 160 / 175 (Ende Z1–Z4)
const PROFIL = { skalen: [{ disziplin: "rad", metrik: "puls", zonen: [{ z: "Z1", bis: 120 }, { z: "Z2", bis: 140 }, { z: "Z3", bis: 160 }, { z: "Z4", bis: 175 }, { z: "Z5", bis: null }] }] };

test("Pulsgrenzen aus dem Profil: vier geordnete Grenzen, sonst null", () => {
  assert.deepEqual(V7.pulsGrenzen(PROFIL, "rad"), [120, 140, 160, 175]);
  assert.equal(V7.pulsGrenzen(PROFIL, "lauf"), null);
  const kaputt = { skalen: [{ disziplin: "rad", metrik: "puls", zonen: [{ z: "Z1", bis: 150 }, { z: "Z2", bis: 140 }, { z: "Z3", bis: 160 }, { z: "Z4", bis: 175 }] }] };
  assert.equal(V7.pulsGrenzen(kaputt, "rad"), null);
  assert.equal(V7.pulsGrenzen(null, "rad"), null);
});

test("Puls-Histogramm in fünf Zonen: Klassen linear geteilt, Summe bleibt, nichts hochgerechnet", () => {
  const hh = new Array(30).fill(0);
  hh[10] = 100;            // 110–115 bpm → Z1
  hh[14] = 200;            // 130–135 → Z2
  hh[16] = 50;             // 140–145 → Z3 (Grenze 140 genau am Klassenanfang)
  hh[23] = 40;             // 175–180 → Z5
  hh[22] = 80;             // 170–175 → Z4
  const z = V7.histZonen(hh, [120, 140, 160, 175]);
  assert.deepEqual(z, [100, 200, 50, 80, 40]);
  const h2 = new Array(30).fill(0); h2[11] = 100;   // 115–120: ganz Z1; 118 als Grenze teilt 60/40
  nah(V7.histZonen(h2, [118, 140, 160, 175])[0], 60); nah(V7.histZonen(h2, [118, 140, 160, 175])[1], 40);
  assert.equal(V7.histZonen(hh, [120, 140, 130, 175]), null);
  assert.equal(V7.histZonen(null, [120, 140, 160, 175]), null);
});

test("Balkenprofil → Hauptzonen: Unterzonen gehören zu ihrer Zone, ohne Ziel und ohne Dauer getrennt", () => {
  const b = [{ key: "z1", d: 600 }, { key: "fatmax", d: 1200 }, { key: "sweet", d: 900 }, { key: "vo2", d: 300 }, { key: "pause", d: 120 },
    { key: "offen", d: 180 }, { key: "z2", d: null, ohneDauer: true }];
  const r = V7.balkenZonen(b);
  assert.deepEqual(r.z, [720, 1200, 900, 0, 300]);
  assert.equal(r.offen, 180); assert.equal(r.ohneDauer, 1);
  assert.deepEqual(V7.drei(r.z), [1920, 900, 300]);
});

test("planvergleich-1.0: Woche mit Soll und Ist – Summen, je Sportart, Abweichung, Netto/Brutto/Pausen", () => {
  const mo = "2026-11-09";
  const soll = [
    { date: "2026-11-09", sport: "rad", dauer_s: 3600, zonen: { z: [600, 3000, 0, 0, 0], offen: 0, ohneDauer: 0 }, herkunft: "kalender" },
    { date: "2026-11-10", sport: "lauf", dauer_s: 2400, zonen: { z: [0, 1800, 600, 0, 0], offen: 0, ohneDauer: 0 }, herkunft: "kalender" },
    { date: "2026-11-11", sport: "schwimm", dauer_s: 1800, zonen: null, herkunft: "kalender" },
    { date: "2026-11-12", sport: "rad", dauer_s: null, zonen: null, herkunft: "kalender" },          // ohne Dauer: nicht mitgezählt
    { date: "2026-11-20", sport: "rad", dauer_s: 9999, zonen: null, herkunft: "kalender" },          // nächste Woche
  ];
  const ist = [
    { date: "2026-11-09", sport: "rad", netto_s: 3300, brutto_s: 3600, zonen: [500, 2500, 200, 0, 0] },
    { date: "2026-11-10", sport: "lauf", netto_s: 2400, brutto_s: null, zonen: null },
    { date: "2026-11-13", sport: "wandern", netto_s: 5400, brutto_s: 6000, zonen: null },
  ];
  const w = V7.woche(soll, ist, { mo, heute: "2026-11-16" });
  assert.equal(w.abgeschlossen, true); assert.equal(w.status, "ok");
  assert.equal(w.soll.s, 7800); assert.equal(w.soll.ohneDauer, 1);
  assert.equal(w.ist.netto, 11100); assert.equal(w.ist.brutto, 3600 + 2400 + 6000); assert.equal(w.ist.pausen, 300 + 600); assert.equal(w.ist.bruttoFehlt, 1);
  assert.equal(w.diff_s, 3300); assert.equal(w.diff_pct, 42);
  assert.deepEqual(w.je.rad, { soll: 3600, ist: 3300, diff_s: -300, diff_pct: -8 });
  assert.equal(w.je.schwimm.ist, 0); assert.equal(w.je.andere.ist, 5400); assert.equal(w.je.andere.diff_pct, null);
  // Zonen nur Rad und Laufen; Ist nicht hochgerechnet, Rest «ohne Zonen»
  assert.deepEqual(w.zonen.soll, [600, 4800, 600, 0, 0]);
  assert.deepEqual(w.zonen.ist, [500, 2500, 200, 0, 0]);
  assert.equal(w.zonen.istOhneZonen, (3300 - 3200) + 2400);
  assert.deepEqual(w.zonen.soll3, [5400, 600, 0]);
});

test("planvergleich-1.0: Status ohne Plan, nur Uhr, laufende Woche; Verlauf nur über abgeschlossene Wochen mit Kalender", () => {
  const mo = "2026-11-02";
  assert.equal(V7.woche([], [{ date: mo, sport: "rad", netto_s: 100 }], { mo, heute: "2026-11-20" }).status, "ohne-plan");
  const uhr = V7.woche([{ date: mo, sport: "rad", dauer_s: 3600, zonen: null, herkunft: "uhr" }], [], { mo, heute: "2026-11-20" });
  assert.equal(uhr.status, "nur-uhr"); assert.equal(uhr.zonen.sollOhneZonen, 3600);
  const lauf = V7.woche([{ date: "2026-11-16", sport: "rad", dauer_s: 3600, herkunft: "kalender" }], [], { mo: "2026-11-16", heute: "2026-11-18" });
  assert.equal(lauf.status, "laufend"); assert.equal(lauf.abgeschlossen, false);
  const ok = (s, i) => V7.woche([{ date: "2026-10-05", sport: "rad", dauer_s: s, herkunft: "kalender" }], [{ date: "2026-10-05", sport: "rad", netto_s: i }], { mo: "2026-10-05", heute: "2026-11-20" });
  const teil = V7.woche([{ date: mo, sport: "rad", dauer_s: 3600, herkunft: "kalender" }, { date: "2026-11-03", sport: "lauf", dauer_s: 1800, herkunft: "uhr" }], [], { mo, heute: "2026-11-20" });
  assert.equal(teil.status, "teil", "Uhr-Workout fehlte im Kalender: Soll unvollständig");
  assert.equal(V7.woche([{ date: mo, sport: "rad", dauer_s: 3600, herkunft: "kalender" }], [], { mo, heute: "2026-11-20", vollAb: "2026-11-09" }).status, "teil", "vor vollAb unvollständig");
  assert.equal(V7.woche([{ date: mo, sport: "rad", dauer_s: 3600, herkunft: "kalender" }], [], { mo, heute: "2026-11-20", vollAb: mo }).status, "ok");
  const v = V7.verlauf([ok(3600, 3600), ok(3600, 4500), uhr, lauf, teil]);
  assert.equal(v.n, 2); assert.equal(v.soll_s, 7200); assert.equal(v.ist_s, 8100); assert.equal(v.diff_pct, 13); assert.equal(v.treffer, 1);
});

test("profil-teile-1.0: Balken aus [Zone, Minuten], Höhe nach Stufe, Fokus ohne Einrollen und Pausen; Kraft ohne Profil", () => {
  const p = V7.profilAusTeile([["z1", 10], ["z2", 20], ["vo2", 2], ["pause", 1], ["vo2", 2], ["z1", 5]], V6.ZONEN);
  assert.equal(p.dauer_s, 40 * 60); assert.equal(p.balken.length, 6);
  assert.equal(p.balken[0].x0, 0); assert.equal(p.balken[1].x0, 600); assert.equal(p.balken[2].key, "vo2");
  assert.ok(p.balken[2].h > p.balken[1].h && p.balken[1].h > p.balken[0].h);
  assert.deepEqual(p.fokus.map((f) => f.key), ["z2", "vo2"]);
  assert.equal(V7.profilAusTeile([["ohne", 45]], V6.ZONEN).balken.length, 0);
  assert.ok(V6.profilSVG(p, { h: 30 }).startsWith("<svg"));
});

test("kalender-3.0: Tage einer beliebigen Woche – erledigt, geplant, verpasst wie die Wochenleiste", () => {
  const acts = [{ date: "2026-11-09", sport: "rad" }, { date: "2026-11-10", sport: "lauf" }];
  const plan = [{ date: "2026-11-09", sport: "rad" }, { date: "2026-11-10", sport: "rad" }, { date: "2026-11-14", sport: "lauf" }];
  const t = V7.wocheTage(acts, plan, "2026-11-09", "2026-11-12");
  assert.equal(t.length, 7); assert.equal(t[0].wt, "M"); assert.equal(t[6].iso, "2026-11-15");
  assert.deepEqual(t[0].zeichen, [{ sport: "rad", art: "ist" }]);
  assert.deepEqual(t[1].zeichen, [{ sport: "rad", art: "verpasst" }, { sport: "lauf", art: "ist" }]);
  assert.deepEqual(t[5].zeichen, [{ sport: "lauf", art: "plan" }]);
  assert.equal(t[3].heute, true);
});

test("Wochenumfang: Netto-Stunden je Sportart (Bewegungszeit vor Timer-Dauer), älteste Woche zuerst", () => {
  const acts = [{ date: "2026-11-09", sport: "rad", mv: 3000, dur: 3600, km: 30, hm: 200 }, { date: "2026-11-11", sport: "wandern", dur: 7200, km: 10 },
    { date: "2026-11-02", sport: "lauf", dur: 1800, km: 6 }];
  const U = V7.wochenUmfang(acts, "2026-11-14", 2);
  assert.equal(U[0].mo, "2026-11-02"); assert.equal(U[0].lauf, 1800);
  assert.equal(U[1].rad, 3000); assert.equal(U[1].andere, 7200); assert.equal(U[1].s, 10200); assert.equal(U[1].km, 40); assert.equal(U[1].n, 2);
});

/* ---------------- Aufbau (navigation-7.0) und «kein Enduco in den normalen Ansichten» ---------------- */
const HTML = lies("index.html");
test("navigation-7.0: jede Ansicht hat ihren Abschnitt, Detailansichten haben eine Elternansicht, keine Unterleisten mehr", () => {
  const namen = JSON.parse(HTML.match(/const TAB_NAMES = (\[[^\]]+\])/)[1].replace(/\s+/g, " "));
  for (const n of namen) assert.ok(HTML.includes(`id="view-${n}"`), "Abschnitt fehlt: " + n);
  assert.ok(!/nav\.className = "unter"/.test(HTML), "Unterleisten werden nicht mehr erzeugt");
  for (const id of ["rd-wrap", "ringe-card", "gefuehl-card", "today-main"]) {
    const i = HTML.indexOf(`id="${id}"`), sec = HTML.lastIndexOf('<section class="view" id="', i);
    assert.equal(HTML.slice(sec, sec + 40).match(/id="(view-[a-z-]+)"/)[1], "view-erholung", id + " gehört zu Belastung und Erholung");
  }
  for (const id of ["v56-plan", "vg-card", "mo-woche-card"]) {
    const i = HTML.indexOf(`id="${id}"`), sec = HTML.lastIndexOf('<section class="view" id="', i);
    assert.equal(HTML.slice(sec, sec + 40).match(/id="(view-[a-z-]+)"/)[1], "view-labor", id + " liegt im Labor");
  }
  assert.ok(/<span>Outdoor<\/span>/.test(HTML));
});

test("Kein Enduco in Heute und Kalender: Heutiges Training, Wochenleiste und Kalender lesen Mein Plan, nicht den Garmin-Kalender", () => {
  const heute = lies("js/v6-heute.js");
  const plan = heute.slice(heute.indexOf("  function plan() {"), heute.indexOf("  /** V6.2 testplan-1.0"));
  assert.ok(!/H\.heute\(\)|H\.neu\(\)|workouts_neu|D\.planned/.test(plan), "Heutiges Training ohne Garmin-Kalender und «neu von Enduco»");
  const woche = heute.slice(heute.indexOf("  function woche() {"), heute.indexOf("  /* ---------- Klicks"));
  assert.ok(!/D\.planned/.test(woche) && /meinPlanWoche/.test(woche));
  const cal = HTML.slice(HTML.indexOf("function calEvents(ds)"), HTML.indexOf("/* =====", HTML.indexOf("function calEvents(ds)")));
  assert.ok(!/D\.planned/.test(cal), "Kalender-Einträge ohne Garmin-Kalender");
  const ui = lies("js/v66-ui.js"), w = ui.slice(ui.indexOf("  M.wocheHTML = function"), ui.indexOf("  M.wocheBinden = function"));
  assert.ok(!/D\.planned|Enduco<\/span>/.test(w), "Wochenansicht ohne Enduco-Zeilen");
  assert.ok(!/stehen \$\{E\.length\} Einheiten an[^\n]*C\.D\.planned/.test(lies("js/v59.js")));
});

test("V7-CSS und -JS ohne feste Farben", () => {
  const css = lies("css/v6.css"), v7 = css.slice(css.indexOf("V7 navigation-7.0"));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v7), "V7-CSS nur mit Variablen");
  for (const f of ["js/v7.js", "js/v7-ui.js"]) assert.ok(!/#[0-9a-fA-F]{6}\b/.test(lies(f).replace(/\/\/.*$/gm, "")), f + " ohne feste Farben");
});
