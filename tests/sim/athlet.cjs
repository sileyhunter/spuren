/* V8.0 Szenario-Simulator: erfundener Athlet. Alle Werte sind erfunden (keine echten Daten).
   - 16 Wochen Geschichte nach dem Muster Mo frei · Di Laufen hart + Schwimmen · Mi Rad locker · Do Rad hart + Schwimmen · Fr Laufen locker + Schwimmen ·
     Sa lange Ausfahrt · So langer Lauf (etwa 12 h je Woche, jede 4. Woche leichter).
   - Tageswerte (HRV, Ruhepuls, Schlaf) mit kleiner Streuung, Zonenprofil im Aufbau wie die Demo, Rennen in der Zukunft.
   - Last je Einheit = Dauer in Stunden × Intensitätsfaktor² × 100 (wie TSS), Laufen mit Distanz aus der Pace. */
"use strict";

/** Zufallsfolge mit festem Startwert (mulberry32), damit jeder Lauf gleich ist. */
function zufall(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Normalverteilt (Box-Muller) aus einer Zufallsfolge. */
const normal = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
/** Morgenwerte ohne Belastungseffekt: HRV mit etwa 8 % Streuung von Tag zu Tag (log-normal), Ruhepuls ±1,5 bpm, Schlaf 7–8 h; basis = { hrv, rhr } (sonst 70 ms, 48 bpm). */
const morgen = (rnd, d, hrvFaktor, rhrPlus, basis) => ({ date: d, hrv: Math.round(((basis && basis.hrv) || 70) * (hrvFaktor || 1) * Math.exp(0.08 * normal(rnd))),
  rhr: Math.round(((basis && basis.rhr) || 48) + (rhrPlus || 0) + 1.5 * normal(rnd)),
  sleepH: +(7.1 + rnd() * 0.8).toFixed(1), sleepScore: Math.round(76 + rnd() * 10), sleepStress: Math.round(15 + rnd() * 8) });
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wochentag = (iso) => ((new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;   // 1 = Montag

/** Zonenprofil (erfunden, Aufbau wie js/v5-extra.js demoAugment). */
const ZONEN = [{ id: "sim-zonen", v: "zonen-1.0", name: "Simulator (erfunden)", status: "aktiv", gueltig_ab: "2020-01-01", gueltig_bis: null, provenienz: "manuell",
  freigabe: { art: "manuell", datum: "2020-01-01", durch: "Simulator", text: "erfunden" }, methodik: { art: "manuell", bestaetigt: false, text: "erfunden" },
  skalen: [
    { key: "rad_w", disziplin: "rad", metrik: "leistung", unit: "W", protokoll: "sim-rad", umfang: [100, 330], zonen: [{ z: "Z1", von: null, bis: 150 }, { z: "Z2", von: 150, bis: 190 }, { z: "Z3", von: 190, bis: 230 }, { z: "Z4", von: 230, bis: 265 }, { z: "Z5", von: 265, bis: null }] },
    { key: "rad_hf", disziplin: "rad", metrik: "puls", unit: "bpm", protokoll: "sim-rad", umfang: [100, 190], zonen: [{ z: "Z1", von: null, bis: 122 }, { z: "Z2", von: 122, bis: 138 }, { z: "Z3", von: 138, bis: 155 }, { z: "Z4", von: 155, bis: 172 }, { z: "Z5", von: 172, bis: null }] },
    { key: "lauf_pace", disziplin: "lauf", metrik: "pace", unit: "s/km", protokoll: "sim-lauf", umfang: [430, 220], zonen: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 335 }, { z: "Z3", von: 335, bis: 300 }, { z: "Z4", von: 300, bis: 275 }, { z: "Z5", von: 275, bis: null }] },
    { key: "lauf_hf", disziplin: "lauf", metrik: "puls", unit: "bpm", protokoll: "sim-lauf", umfang: [120, 200], zonen: [{ z: "Z1", von: null, bis: 145 }, { z: "Z2", von: 145, bis: 160 }, { z: "Z3", von: 160, bis: 174 }, { z: "Z4", von: 174, bis: 188 }, { z: "Z5", von: 188, bis: null }] },
  ] }];

/** Muster einer Woche: Wochentag → [Sportart, Minuten, Intensitätsfaktor, Titel]. */
const MUSTER = {
  2: [["lauf", 60, 0.92, "Intervalle (Sim)"], ["schwimm", 50, 0.72, "Schwimmen (Sim)"]],
  3: [["rad", 90, 0.68, "Rad locker (Sim)"]],
  4: [["rad", 90, 0.9, "Rad Intervalle (Sim)"], ["schwimm", 50, 0.75, "Schwimmen (Sim)"]],
  5: [["lauf", 50, 0.7, "Lauf locker (Sim)"], ["schwimm", 40, 0.72, "Schwimmen (Sim)"]],
  6: [["rad", 210, 0.7, "Lange Ausfahrt (Sim)"]],
  7: [["lauf", 95, 0.72, "Langer Lauf (Sim)"]],
};
const PACE = { 0.68: 380, 0.7: 370, 0.72: 360, 0.75: 345, 0.78: 335, 0.9: 300, 0.92: 290 };
const tssVon = (min, ifak) => Math.round((min / 60) * ifak * ifak * 100);

/** Aktivität (Felder wie auf der Seite nach dem Laden: date, sport, dur, mv, el, km, tss …). */
function aktivitaet(nr, date, sport, min, ifak, name, extra) {
  const dur = Math.round(min * 60), km = sport === "lauf" ? +(dur / (PACE[ifak] || 340)).toFixed(2) : sport === "rad" ? +(min / 60 * 29).toFixed(1) : sport === "schwimm" ? +(min / 60 * 2.6).toFixed(2) : null;
  return Object.assign({ id: "sim-" + nr, gid: "g" + (900000 + nr), date, start: "17:30", sport, typ: sport, name, dur, el: dur, mv: dur, km, hm: sport === "rad" ? Math.round(min * 5) : 20,
    hr: Math.round(110 + ifak * 50), tss: tssVon(min, ifak), tl2: tssVon(min, ifak) }, extra || {});
}

/** Erfundener Athlet: Geschichte bis zum Vortag von «start» (ein Montag). → D (Daten wie auf der Seite) */
function athlet(start, opt) {
  opt = opt || {};
  const rnd = zufall(opt.seed || 20261116), wochen = opt.wochen || 16, von = addDays(start, -7 * wochen);
  const activities = [], days = [];
  let nr = 1;
  for (let d = von; d < start; d = addDays(d, 1)) {
    const w = Math.floor((Date.parse(d) - Date.parse(von)) / (7 * 864e5)), leicht = w % 4 === 3, wt = wochentag(d);
    for (const [sport, min, ifak, name] of MUSTER[wt] || []) {
      const m = Math.round(min * (leicht ? 0.65 : 1) * (0.95 + rnd() * 0.1));
      activities.push(aktivitaet(nr++, d, sport, m, leicht && ifak > 0.85 ? 0.72 : ifak, name));
    }
    days.push(morgen(rnd, d));
  }
  // Verfügbarkeit wie ein typischer Plan: Mo kein Training, Di–Fr 2:30 h, Sa und So 5 h (alle Sportarten)
  const vf = [1, 2, 3, 4, 5, 6, 7].map((wt) => ({ id: "vf-wt-" + wt, art: "wochentag", wt, min: wt === 1 ? 0 : wt >= 6 ? 300 : 150, sport: null, v: "verfuegbarkeit-1.1", geaendert: von + "T08:00:00.000Z" }));
  return {
    demo: false, activities, days, weights: [], lactate: [], tests: [], zonen: JSON.parse(JSON.stringify(ZONEN)), css_tests: [{ id: "sim-css", datum: addDays(start, -20), t400: 380, t200: 180 }],
    config: { races: [{ name: "Halbdistanz (Sim)", short: "Halbdistanz", date: addDays(start, 7 * 20 + 5), prio: "B" }, { name: "Langdistanz (Sim)", short: "Langdistanz", date: addDays(start, 7 * 28 + 6), prio: "A" }],
      load_model: "garmin" },
    plan_woche: [], plan_verfuegbarkeit: vf, plan_einstellungen: [], plan_aktivitaeten: [], ampel_anpassung: [], befinden: [], plan_modell: [], plan_garmin: [], garmin_auftraege: [],
    updated: addDays(start, -1) + "T23:00:00",
  };
}

module.exports = { athlet, aktivitaet, tssVon, addDays, wochentag, zufall, normal, morgen, ZONEN };
