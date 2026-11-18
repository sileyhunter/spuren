/* V8.0 Szenario-Simulator: spielt Tage nacheinander durch, wie die Seite sie erlebt.
   Je Tag: Morgenwerte der Nacht (Garmin) und Check-in → Seite öffnen (Ampel prüft und speichert ihren Entscheid, V74UI.pruefen) → Plan des Tages, wie er
   gilt (V64UI.kontextFuer mit Mein Plan, Verteilung, Kraft und Ampel-Schicht) → Ausführung durch den erfundenen Athleten → Aktivitäten am Abend.
   Szenarien greifen über Haken ein (morgen, checkin, vorher, ausfuehren). Der «Körper» des Athleten ist ein einfaches Modell: Last je Einheit aus den
   Abschnitten (Intensitätsfaktor je Zone), HRV und Ruhepuls am Morgen leicht abhängig von der Last des Vortags. Alles erfunden. */
"use strict";
const { seite } = require("./seite.cjs");
const { athlet, addDays, wochentag, zufall, morgen } = require("./athlet.cjs");

/** Intensitätsfaktor je Abschnitt (Modell des Körpers, nicht der Seite). */
const IF = { pause: 0.5, z1: 0.6, z2: 0.7, renntempo: 0.78, z3: 0.83, z3o: 0.93, css: 0.95, vo2: 1.05, test: 0.85, ohne: 0.65 };
const SPORT_AKT = { rad: "rad", lauf: "lauf", schwimm: "schwimm", kraft: "kraft", mobility: "andere", andere: "andere" };

/** Stufe einer geplanten Einheit: Rad und Laufen aus ihren Minuten (tid-1.0), sonst aus den Abschnitten (CSS und Z3 = mittel, VO2max = hart). */
function stufe(e) {
  if (!e) return "locker";
  if (e.art === "test" || e.test) return "test";
  if (e.minuten && (e.sport === "rad" || e.sport === "lauf")) return e.minuten.hart > 0 ? "hart" : e.minuten.mittel > 0 ? "mittel" : "locker";
  const z = new Set((e.teile || []).map((x) => x[0]));
  return z.has("vo2") ? "hart" : z.has("css") || z.has("z3") || z.has("z3o") ? "mittel" : "locker";
}
const RANG = { locker: 0, mittel: 1, test: 1, hart: 2 };

/** Last einer Einheit nach dem Modell des Körpers: Σ min/60 × IF² × 100; faktor = { if: +x auf mittlere/harte Abschnitte, dauer: × } */
function lastVon(e, faktor) {
  faktor = faktor || {};
  const teile = Array.isArray(e.teile) && e.teile.length ? e.teile : [["z2", e.dauer || 0]];
  let tss = 0, min = 0;
  for (const [z, m0] of teile) {
    const m = m0 * (faktor.dauer || 1), f = (IF[z] || IF.ohne) + (["z3", "z3o", "css", "vo2", "renntempo"].includes(z) ? faktor.if || 0 : faktor.ifLocker || 0);
    tss += (m / 60) * f * f * 100; min += m;
  }
  return { tss: Math.round(tss), min: Math.round(min) };
}

/** Simulation anlegen. opt = { start (Montag), wochen (Geschichte), seed, D (eigene Daten), einstellungen: [Planeinstellungen] } */
function simulator(opt) {
  opt = opt || {};
  const start = opt.start || "2026-11-30", D = opt.D || athlet(start, { seed: opt.seed, wochen: opt.wochen });
  for (const x of opt.einstellungen || []) D.plan_einstellungen.push(Object.assign({ geaendert: addDays(start, -30) + "T08:00:00.000Z" }, x));
  const S = seite(D, start), rnd = zufall((opt.seed || 7) * 7919), log = new Map();
  // Grundwerte der Morgenwerte: Median der letzten 60 Tage vor dem Start (bei eigenen Daten deren Niveau, sonst 70 ms und 48 bpm)
  const med = (L) => { const x = L.filter((v) => typeof v === "number" && v > 0).sort((a, b) => a - b); return x.length ? x[x.length >> 1] : null; };
  const vorher = (D.days || []).filter((x) => x.date < start && x.date >= addDays(start, -60));
  const basis = { hrv: med(vorher.map((x) => x.hrv)) || 70, rhr: med(vorher.map((x) => x.rhr)) || 48 };
  let nr = 100000;
  const sim = { S, D, log, start, win: S.win, basis };

  /** Morgenwerte der Nacht (Modell): HRV und Ruhepuls leicht nach der Last von gestern. */
  sim.morgenModell = function (d) {
    const gestern = addDays(d, -1), L = D.activities.filter((a) => a.date === gestern && S.win.FK.zaehlt(a)).reduce((s, a) => s + (a.tss || 0), 0);
    const ueber = Math.max(0, L - 60);
    return morgen(rnd, d, 1 - 0.0006 * ueber, 0.01 * ueber, basis);
  };
  /** Check-in: wahl = { schlaf, muede, muskel, stress } (1 = sehr gut … 7 = sehr schlecht), extra = { krank }. */
  sim.checkin = async function (d, wahl, extra) {
    const b = S.win.V59L.checkinEintrag(d, wahl, extra || {});
    if (!b) throw new Error("Check-in ungültig");
    await S.inbox.upsert("befinden", b, (x) => x.date);
    S.neu();
  };
  /** Verfügbarkeit setzen wie das Tagesblatt (vfSpeichern in js/v66-ui.js): laufende Woche vorher festhalten, dann speichern. ziel = { date } oder { wt }. */
  sim.verfuegbarkeit = async function (ziel, wert) {
    const V66 = S.win.V66, e = V66.vfEintrag(ziel, wert, new S.win.Date().toISOString()), f = V66.vfPruefen(e);
    if (f) return f;
    const h = S.heute(), moH = S.montag(h), betrifft = ziel.wt ? true : S.montag(ziel.date) === moH;
    if (betrifft && h > moH) { const r = await S.win.V66UI.aendern(moH, { art: "festhalten" }); if (r) return r; }
    await S.inbox.upsert("verfuegbarkeit", e);
    S.neu();
    return null;
  };
  /** Änderung an Mein Plan (V66UI.aendern: Sperren, Verschieben, Anpassen, Neu berechnen …). */
  sim.aendern = async function (mo, a) { const f = await S.win.V66UI.aendern(mo, a); S.neu(); return f; };
  /** Aktivität eintragen (Abend des Tages). */
  sim.aktivitaet = function (d, sport, min, tss, extra) {
    const dur = Math.round(min * 60), a = Object.assign({ id: "sim-" + nr, gid: "g" + (800000 + nr), date: d, start: "18:00", sport, typ: sport, name: "Sim", dur, el: dur, mv: dur,
      km: sport === "lauf" ? +(dur / 340).toFixed(2) : sport === "rad" ? +(min / 60 * 29).toFixed(1) : sport === "schwimm" ? +(min / 60 * 2.6).toFixed(2) : null, hm: 20, hr: 130, tss, tl2: tss }, extra || {});
    nr++;
    D.activities.push(a);
    D.activities.sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
    return a;
  };
  /** Plan eines Tages, wie er gilt (mit Ampel-Schicht), und wie Mein Plan ihn vorsah (ohne Ampel). */
  sim.plan = function (d) {
    const K = S.kontext(S.montag(d)), t = K && K.w ? K.w.tage.find((x) => x.date === d) : null, tp = K && K.wPlan ? K.wPlan.tage.find((x) => x.date === d) : null;
    return { K, t, tPlan: tp, einheiten: (t && t.einheiten) || [], plan: (tp && tp.einheiten) || [] };
  };
  /** Geplante Last ≈ einer Einheit (TL ≈ der Seite, tl-plan-1.0). */
  sim.tlPlan = function (e, K) { const V66 = S.win.V66; return V66.schaetzung(e, V66.bezug(K && K.skalen, K && K.css ? K.css.s : null)).tl; };

  /** Einen Tag durchspielen. haken = { morgen(d, wert) → Morgenwerte | null (keine Garmin-Daten), checkin(d) → wahl | null, vorher(d) async,
   *  ausfuehren(d, einheiten, info) → [{ sport, min, tss }] | null (= wie geplant) } */
  sim.tag = async function (d, haken) {
    haken = haken || {};
    S.tag(d, "06:30");
    const m0 = sim.morgenModell(d), m = haken.morgen ? haken.morgen(d, m0) : m0;
    D.days = D.days.filter((x) => x.date !== d);
    if (m) D.days.push(m);
    const ci = haken.checkin ? haken.checkin(d) : null;
    if (ci) await sim.checkin(d, ci.wahl || ci, ci.extra);
    S.neu();
    if (haken.vorher) await haken.vorher(d, sim);
    await S.win.V74UI.pruefen();                                              // Seite geöffnet: Ampel-Entscheid von heute speichern
    S.neu();
    // V8.3 Tagescoach: Vorschläge nach dem Öffnen der Seite; ein Szenario nimmt sie über haken.coach an (Liste von IDs bzw. { id, option })
    let coach = S.win.V83UI && S.win.V83UI.pruefen ? S.win.V83UI.pruefen() : null;
    const coachLog = (R) => (R ? R.vorschlaege.map((p) => ({ id: p.id, anlass: p.anlass, date: p.date, uid: p.uid, titel: p.titel, grund: p.grund, arten: p.optionen.map((o) => o.art) })) : []);
    const vorCoach = coachLog(coach);
    if (haken.coach && coach) {
      const wahl = haken.coach(d, coach.vorschlaege || [], sim) || [];
      for (const w of wahl) {
        const f = await S.win.V83UI.annehmen(typeof w === "string" ? w : w.id, typeof w === "object" ? w.option || 0 : 0);
        if (f) throw new Error(`Coach ${d}: ${f}`);
        S.neu();
      }
      if (wahl.length) coach = S.win.V83UI.pruefen();
    }
    const P = sim.plan(d), A = S.win.V74UI.live();
    const info = { ampel: A, einheiten: P.einheiten.map((e) => ({ uid: e.uid, sport: e.sport, art: e.art, titel: e.titel, dauer: e.dauer, stufe: stufe(e), gesperrt: !!e.gesperrt,
      ampel: e.ampel || null, tl: sim.tlPlan(e, P.K), teile: JSON.stringify(e.teile || []) })),
      plan: P.plan.map((e) => ({ uid: e.uid, sport: e.sport, art: e.art, titel: e.titel, dauer: e.dauer, stufe: stufe(e), gesperrt: !!e.gesperrt, teile: JSON.stringify(e.teile || []) })),
      tag: P.t ? { gesperrt: !!P.t.gesperrt, rennen: !!P.t.rennen } : null, absolviert: [], coach: vorCoach, coachDanach: coachLog(coach) };
    S.uhr(d, "19:00");
    const aus = haken.ausfuehren ? haken.ausfuehren(d, P.einheiten, info) : null;
    const liste = aus || P.einheiten.filter((e) => !["test"].includes(e.art) || true).map((e) => {
      if (e.art === "mobility") return null;
      const L = lastVon(e); return { sport: SPORT_AKT[e.sport] || "andere", min: L.min, tss: e.sport === "kraft" ? 0 : L.tss, uid: e.uid };
    }).filter(Boolean);
    for (const x of liste) info.absolviert.push(Object.assign({}, x, { id: sim.aktivitaet(d, x.sport, x.min, x.tss, x.extra).id }));
    // Tests und Kurzchecks, die wie geplant gemacht wurden, trägt der Athlet ein (wie Silas auf der Seite bzw. über den Chat; Werte erfundene Platzhalter)
    if (!aus) for (const e of P.einheiten) {
      if (e.test === "css") D.css_tests.push({ id: "sim-css-" + d, datum: d, t400: 380, t200: 180 });
      else if (e.test === "stufentest") D.lactate.push({ kind: "stufentest", date: d, sport: e.sport, ausbelastet: true, stages: [] });
      else if (e.check && e.check === d) D.lactate.push({ kind: "check", date: d, sport: e.sport, block: "Sim" });
    }
    S.neu();
    log.set(d, info);
    return info;
  };
  /** Mehrere Tage ab «von» (inklusive) für n Tage. */
  sim.tage = async function (von, n, haken) { const out = []; for (let i = 0; i < n; i++) out.push(await sim.tag(addDays(von, i), haken)); return out; };
  /** Summe der geplanten Minuten (Rad, Laufen, Schwimmen) einer Woche, wie sie zuletzt galt (aus dem Log oder, für kommende Tage, aus dem Plan). */
  sim.wochenMinuten = function (mo, quelle) {
    let s = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(mo, i), L = log.get(d);
      const E = L ? (quelle === "plan" ? L.plan : L.einheiten) : sim.plan(d)[quelle === "plan" ? "plan" : "einheiten"];
      for (const e of E || []) if (["rad", "lauf", "schwimm"].includes(e.sport)) s += e.dauer || 0;
    }
    return s;
  };
  return sim;
}

module.exports = { simulator, lastVon, stufe, RANG, IF, addDays, wochentag };
