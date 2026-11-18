#!/usr/bin/env node
/* V8.0 Prüfung der Modelle mit echten Daten (Bezugsgrössen, doppelte Rechnungen, Widersprüche). Liest die entschlüsselten Daten (work/data.json,
   nie committen) und rechnet mit denselben Modulen wie die Seite (tests/sim/seite.cjs). Gibt nur Zusammenfassungen auf stdout aus – die Zahlen
   gehören in den Chat, nie ins Repository (docs/AUDIT_V8.md nennt nur die Befunde ohne Werte).
   Aufruf: node tools/pruefung_v8.cjs work/data.json [--bis JJJJ-MM-TT] [--tage 365] */
"use strict";
const fs = require("node:fs"), path = require("node:path");
const { seite } = require(path.join(__dirname, "..", "tests", "sim", "seite.cjs"));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
if (!args[0] || !fs.existsSync(args[0])) { console.error("Aufruf: node tools/pruefung_v8.cjs work/data.json [--bis JJJJ-MM-TT] [--tage 365]"); process.exit(2); }
const D = JSON.parse(fs.readFileSync(args[0], "utf8"));
const heuteZ = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
const BIS = opt("--bis", heuteZ), TAGE = +opt("--tage", 365);
const isNum = (x) => typeof x === "number" && isFinite(x);
const add = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const median = (L) => { const s = L.filter(isNum).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = (x) => (isNum(x) ? Math.round(x * 10) / 10 : "–"), r2 = (x) => (isNum(x) ? Math.round(x * 100) / 100 : "–"), pct = (a, b) => (b ? Math.round((100 * a) / b) + " %" : "–");
const zeile = (...x) => console.log(x.join(" "));

// Seite wie index.html: Last nach config.load_model (last-2.0/2.1 → tl2)
const modell = (D.config && D.config.load_model) || "garmin";
if (["last-2.0", "last-2.1"].includes(modell)) for (const a of D.activities || []) { a.tss0 = a.tss; if (isFinite(a.tl2)) a.tss = a.tl2; }
for (const k of ["plan_woche", "plan_verfuegbarkeit", "plan_einstellungen", "plan_aktivitaeten", "ampel_anpassung", "befinden", "plan_garmin", "garmin_auftraege", "lactate", "tests", "css_tests"]) if (!Array.isArray(D[k])) D[k] = [];
const S = seite(D, BIS), W = S.win, FK = W.FK, V66 = W.V66, V64 = W.V64;
const VON = add(BIS, -TAGE), acts = D.activities.filter((a) => a.date >= VON && a.date < BIS);

zeile(`V8.0 Prüfung mit echten Daten · Stand ${BIS} · Fenster ${TAGE} Tage (ab ${VON}) · Lastmodell ${modell}`);

/* 1 Datenbasis und Lücken */
{
  const tage = new Map(D.days.map((d) => [d.date, d]));
  let ohne = 0, luecke = 0, maxL = 0, ohneAkt = 0, aktL = 0, maxAktL = 0, lueckenAkt = 0;
  const aktTage = new Set(acts.map((a) => a.date));
  for (let d = VON; d < BIS; d = add(d, 1)) {
    const x = tage.get(d), hat = x && (isNum(x.hrv) || isNum(x.rhr) || isNum(x.sleepH));
    if (!hat) { ohne++; luecke++; maxL = Math.max(maxL, luecke); } else luecke = 0;
    if (!aktTage.has(d)) { ohneAkt++; aktL++; if (aktL === 4) lueckenAkt++; maxAktL = Math.max(maxAktL, aktL); } else aktL = 0;
  }
  zeile("\n1 Datenbasis");
  zeile(`  Aktivitäten im Fenster: ${acts.length}; Tage ohne Morgenwerte: ${ohne} (längste Lücke ${maxL} Tage)`);
  zeile(`  Tage ohne Aktivität: ${ohneAkt}; Strecken ab 4 Tagen ohne Aktivität: ${lueckenAkt} (längste ${maxAktL} Tage) – zählen in Fitness und Basis wie Ruhetage`);
  zeile(`  Check-ins (befinden): ${D.befinden.length}; Ampel-Entscheide gespeichert: ${D.ampel_anpassung.length}; Mein Plan gespeichert: ${D.plan_woche.length} Woche(n); an Garmin gesendet: ${D.plan_garmin.length}`);
}

/* 2 Doppelte Aktivitäten (gleiche Sportart, überlappende Zeit) */
{
  const tag = new Map(); for (const a of acts) { if (!tag.has(a.date)) tag.set(a.date, []); tag.get(a.date).push(a); }
  let paare = 0, last = 0; const quellen = new Map();
  for (const L of tag.values()) {
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.sport !== b.sport || !FK.zaehlt(a) || !FK.zaehlt(b)) continue;
      const ta = isNum(a.t0) ? a.t0 : null, tb = isNum(b.t0) ? b.t0 : null, da = a.el || a.dur || 0, db = b.el || b.dur || 0;
      const ueber = ta != null && tb != null ? Math.min(ta + da, tb + db) - Math.max(ta, tb) : (a.start && b.start && a.start === b.start ? Math.min(da, db) : 0);
      if (ueber > 0.5 * Math.min(da, db) && Math.min(da, db) > 0) { paare++; last += Math.min(a.tss || 0, b.tss || 0); const k = `${a.src || "garmin"}+${b.src || "garmin"}`; quellen.set(k, (quellen.get(k) || 0) + 1); }
    }
  }
  zeile("\n2 Doppelte Aktivitäten (gleiche Sportart, Zeit überlappt zu mehr als der Hälfte)");
  zeile(`  Paare: ${paare}; doppelt gezählte Last (kleinere der beiden): ${Math.round(last)}${quellen.size ? " · Quellen " + [...quellen].map(([k, n]) => `${k}: ${n}`).join(", ") : ""}`);
}

/* 3 Bezugsgrössen: geplante Last (tl-plan-1.0 und seit V8.1 tl-plan-1.1) gegen absolvierte Last (Lastmodell) */
{
  const sk = W.TR.zonen(D.zonen).skalen, css = (() => { const L = (D.css_tests || []).filter((c) => isNum(c.t400) && isNum(c.t200)).sort((a, b) => b.datum.localeCompare(a.datum)); return L[0] ? FK.css(L[0].t400, L[0].t200) : null; })();
  const B = V66.bezug(sk, css, null), cfg = D.config || {}, B11 = V66.bezug(sk, css, V66.lastBezug ? V66.lastBezug() : { ref: cfg.last_ref || null, lthr: cfg.lthr || null }), refs = ((cfg.last_ref || {}).rad || []).slice().sort((a, b) => a.ab.localeCompare(b.ab));
  const rolle = refs.filter((r) => (r.system || "rolle") === "rolle").pop(), draussen = refs.filter((r) => r.system === "draussen").pop();
  zeile("\n3 Bezugsgrössen");
  if (B.rad) zeile(`  Rad: LT2 für TL ≈ geplant (Zonenprofil, Beginn Z4) gegen LT2 Rolle (last-2.1): Verhältnis ${r2(rolle ? B.rad.lt2 / rolle.lt2_w : null)}; gegen Garmin-FTP: ${r2(cfg.ftp ? B.rad.lt2 / cfg.ftp : null)}; LT2 draussen hinterlegt: ${draussen ? "ja" : "nein (draussen nach Puls)"}`);
  else zeile("  Rad: kein Zonenprofil mit Z4 – TL ≈ geplant ohne Bezugswert");
  zeile(`  Laufen: Pace-Zonen ${B.lauf ? "vorhanden" : "fehlen"}; Schwimmen: CSS-Test ${css ? "vorhanden" : "fehlt (TL ≈ geplant ohne Bezugswert)"}`);
  // Last pro Stunde einer Grundlagen-Einheit: Rad und Laufen mit Ø-Puls in Z2 des aktiven Profils (rad_hf, lauf_hf), Schwimmen mindestens 80 % der
  // Zeit in Garmins Z1–Z2 (kein Puls-Profil), je ab 45 min: absolviert (Lastmodell) gegen geplant für eine Z2-Einheit (tl-plan-1.0)
  const z2 = (key) => { const L = sk && sk[key]; const z = Array.isArray(L) ? L.find((x) => x.z === "Z2") : null; return z && isNum(z.von) && isNum(z.bis) ? z : null; };
  const inZ2 = (a, key) => { const z = z2(key); return z && isNum(a.hr) && a.hr >= z.von && a.hr <= z.bis; };
  const lockerSw = (a) => Array.isArray(a.zones) && a.zones.length === 5 && a.zones.reduce((s, x) => s + (x || 0), 0) > 0
    && (a.zones[0] + a.zones[1]) / a.zones.reduce((s, x) => s + (x || 0), 0) >= 0.8;
  const proH = (a) => (isNum(a.tss) && (a.mv || a.dur) ? a.tss / ((a.mv || a.dur) / 3600) : null);
  const planZ2 = (sport, drinnen, bz) => { const e = { sport, art: "locker", drinnen, teile: [["z2", 60]] }; return V66.schaetzung(e, bz || B).tl; };
  const gruppen = [["Rad drinnen", (a) => a.sport === "rad" && a.indoor && inZ2(a, "rad_hf")], ["Rad draussen", (a) => a.sport === "rad" && !a.indoor && inZ2(a, "rad_hf")],
    ["Laufen", (a) => a.sport === "lauf" && inZ2(a, "lauf_hf")], ["Schwimmen", (a) => a.sport === "schwimm" && lockerSw(a)]];
  for (const [name, f] of gruppen) {
    const L = acts.filter((a) => (a.dur || 0) >= 2700 && f(a)).map(proH).filter(isNum);
    const sp = name.startsWith("Rad") ? "rad" : name === "Laufen" ? "lauf" : "schwimm", dr = name === "Rad drinnen" ? true : name === "Rad draussen" ? false : undefined;
    const p = planZ2(sp, dr), p11 = planZ2(sp, dr, B11);
    zeile(`  ${name}: Grundlage absolviert Median ${r1(median(L))} je Stunde (n = ${L.length}), geplant Z2 ≈ ${r1(p)} je Stunde (tl-plan-1.0) → Verhältnis ${r2(isNum(p) && median(L) ? median(L) / p : null)}`
      + `; tl-plan-1.1 ≈ ${r1(p11)} → Verhältnis ${r2(isNum(p11) && median(L) ? median(L) / p11 : null)}`);
  }
  // tl-plan-1.1 rechnet Schwimmen mit dem Mittel aller Schwimmeinheiten (Last pro Bewegungsstunde, 8 Wochen): Vergleich mit allen Schwimmeinheiten des Zeitraums
  { const L = acts.filter((a) => a.sport === "schwimm" && (a.dur || 0) >= 1800).map(proH).filter(isNum), p11 = planZ2("schwimm", undefined, B11);
    zeile(`  Schwimmen alle (ab 30 min): absolviert Median ${r1(median(L))} je Stunde (n = ${L.length}), tl-plan-1.1 ≈ ${r1(p11)} → Verhältnis ${r2(isNum(p11) && median(L) ? median(L) / p11 : null)}`); }
  const q = new Map(); for (const a of acts.filter((x) => x.sport === "rad")) q.set(a.tl2q || "ohne", (q.get(a.tl2q || "ohne") || 0) + 1);
  zeile(`  Rad-Last nach Quelle (last-2.1): ${[...q].map(([k, n]) => `${k} ${n}`).join(", ")}`);
}

/* 4 Zwei Lastverhältnisse: Ampel (7 gegen 28 Tage, Wochen) und Trainingsstatus (Ermüdung ÷ Fitness, 7/42 Tage) */
{
  const L = FK.dailyLoad(D.activities), sum = (d, a, b) => { let s = 0; for (let i = a; i <= b; i++) s += L.get(add(d, i)) || 0; return s; };
  const PM = S.C.pmc();
  const kl = (r) => (r == null ? null : r > 1.5 ? "sehr hoch" : r > 1.3 ? "hoch" : r < 0.8 ? "wenig" : "üblich");
  const kreuz = new Map(); let n = 0, ampelHoch = 0, statusHoch = 0, beide = 0, xs = [], ys = [];
  for (let d = VON; d < BIS; d = add(d, 1)) {
    const a7 = sum(d, -7, -1), c28 = sum(d, -28, -1) / 4, a3 = sum(d, -3, -1), t3 = (sum(d, -28, -1) / 28) * 3;
    const acwr = c28 > 0 ? a7 / c28 : null, hochA = (acwr != null && acwr > 1.5) || (t3 > 0 && a3 > 2.2 * t3);
    const g = FK.pmcMorgen(PM, d), st = g ? W.V78.status(g.fitness, g.ermuedung) : null;   // trainingsstatus-1.0: Ermüdung ÷ Fitness zu Tagesbeginn
    if (acwr == null || st == null) continue;
    n++; xs.push(acwr); ys.push(st);
    const hochS = st > 1.3; if (hochA) ampelHoch++; if (hochS) statusHoch++; if (hochA && hochS) beide++;
    const k = `${hochA ? "Ampel hoch" : "Ampel üblich/tief"} · Status ${kl(st)}`; kreuz.set(k, (kreuz.get(k) || 0) + 1);
  }
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), sx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0)), sy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  zeile("\n4 Zwei Lastverhältnisse (Morgen, Last bis gestern)");
  zeile(`  Tage: ${n}; Ampel «Last hoch»: ${ampelHoch}; Status über 1,3: ${statusHoch}; beide: ${beide}; Korrelation ${r2(cov / (sx * sy))}`);
  for (const [k, c] of [...kreuz].sort()) zeile(`    ${k}: ${c}`);
}

/* 5 Ampel: Nachlauf der 7-Tage-HRV und einzelne Ausreisser */
{
  let vors = 0, nachlauf = 0, ausr = 0, ausrMitPuls = 0, folgen = 0, laengen = [], lauf = 0, nb = 0, gruende = new Map();
  for (let d = VON; d < BIS; d = add(d, 1)) {
    let r = null; try { r = FK.readiness(D.days, D.activities, D.befinden, d); } catch (e) { continue; }
    if (!r) continue;
    const I = r.indikatoren, h = I.hrv || {};
    if (r.status === "nicht beurteilbar") nb++;
    if (r.status === "vorsichtig") {
      vors++; lauf++;
      const nurHrv = r.alle_gruende.every((g) => ["hrv", "schlaf-info", "befinden"].includes(g.kind) || g.w <= 2) && r.alle_gruende.some((g) => g.kind === "hrv");
      const heuteGut = isNum(h.wert) && isNum(h.refLo) && h.wert >= h.refLo && (!I.rhr || I.rhr.status === "im Bereich" || I.rhr.status === "unbekannt");
      if (nurHrv && heuteGut) nachlauf++;
      for (const g of r.alle_gruende) if (g.w >= 4) gruende.set(g.kind, (gruende.get(g.kind) || 0) + 1);
    } else if (lauf) { laengen.push(lauf); lauf = 0; }
    if (Array.isArray(h.ausreisser) && h.ausreisser.includes(d)) {
      ausr++; if (I.rhr && I.rhr.status !== "im Bereich" && I.rhr.status !== "unbekannt") ausrMitPuls++;
      if (r.status !== "vorsichtig") folgen++;
    }
  }
  if (lauf) laengen.push(lauf);
  zeile(`\n5 Ampel (${FK.VERSIONS.readiness}, ohne Check-in)`);
  zeile(`  «vorsichtig» an ${vors} Tagen in ${laengen.length} Folgen (Median ${median(laengen) ?? "–"}, längste ${laengen.length ? Math.max(...laengen) : "–"} Tage); «nicht beurteilbar» an ${nb} Tagen`);
  zeile(`  Gründe (Gewicht ab 4): ${[...gruende].map(([k, c]) => `${k} ${c}`).join(", ") || "–"}`);
  zeile(`  Nachlauf: «vorsichtig» nur wegen des 7-Tage-Schnitts der HRV, obwohl HRV und Ruhepuls am Morgen im Bereich: ${nachlauf} Tage (${pct(nachlauf, vors)})`);
  zeile(`  Einzelner HRV-Ausreisser am Morgen (zählt nicht): ${ausr} Tage, davon mit erhöhtem Ruhepuls ${ausrMitPuls}, ohne «vorsichtig» ${folgen}`);
}

/* 6 Fitness voraus: Naht nach drei Wochen (Mein Plan gegen Steigerung) */
{
  zeile("\n6 Fitness voraus (fitness-prognose-1.0): Wochenlast aus Mein Plan gegen Wochenlast aus der Steigerung");
  let PL = null; try { PL = W.V75UI.plan(); } catch (e) { PL = null; }
  if (!PL || !Array.isArray(PL.R)) zeile("  Steigerung nicht berechenbar");
  else {
    const mo0 = V64.montag(BIS);
    for (let k = 0; k < 4; k++) {
      const mo = add(mo0, 7 * k), K = S.kontext(mo), r = PL.R.find((x) => x.woche === mo);
      if (!K || !r) continue;
      const bz = V66.bezug(K.skalen, K.css ? K.css.s : null);
      let plan = 0, ohne = 0, stunde = 0;
      for (const t of K.w.tage || []) if (!t.rennen) for (const e of t.einheiten || []) { if (!["rad", "lauf", "schwimm"].includes(e.sport)) continue; const q = W.V66UI.lastGeplant(e, bz); if (isNum(q.tl)) { plan += q.tl; if (q.aus === "stunde") stunde++; } else ohne++; }
      const wl = W.V78.wochenLast(r, PL.ba);
      zeile(`  Woche ${k} (${k === 0 ? "laufende" : "+" + k}): Mein Plan ≈ ${Math.round(plan)} (${stunde} Einheiten über Last pro Stunde, ${ohne} ohne Wert), Steigerung ≈ ${Math.round(wl.tl)} → Verhältnis ${r2(wl.tl ? plan / wl.tl : null)}`);
    }
  }
}

/* 7 Krafttraining, Enduco, eigene Einträge */
{
  const kraft = acts.filter((a) => FK.istKraft(a)), zaehlt = kraft.filter((a) => FK.zaehlt(a)).length;
  const P = D.planned || [], eigen = P.filter((p) => V66.eigenGarmin(p, D.plan_garmin)).length, inTitel = P.filter((p) => /^IN · /.test(p.title || "")).length;
  zeile("\n7 Krafttraining und Garmin-Kalender");
  zeile(`  Krafttraining im Fenster: ${kraft.length} (davon in Fitness/Ermüdung gezählt: ${zaehlt}); RPE-Einträge Kraft: ${(D.rpe || []).filter((x) => /^kraft-/.test(x.id || "")).length}`);
  zeile(`  Garmin-Kalender (planned): ${P.length}; davon eigene: ${eigen} (Titel «IN · »: ${inTitel}); Enduco gezählt: ${P.length - eigen}`);
}

/* 8 Plan der nächsten vier Wochen, wie die Seite ihn zeigt (Mein Plan mit Verteilung, Kraft und Ampel-Schicht): Regeln nachgeprüft */
{
  zeile("\n8 Plan der nächsten vier Wochen: Regeln nachgeprüft");
  const mo0 = V64.montag(BIS), hart = (e) => e.minuten && e.minuten.hart > 0, land = (e) => e.sport === "rad" || e.sport === "lauf";
  const F = { verf: [], kraft: [], hartLang: [], ohneTl: 0, einheiten: 0, hinweise: 0, zweiHart: [] };
  for (let k = 0; k < 4; k++) {
    const mo = add(mo0, 7 * k), K = S.kontext(mo); if (!K || !K.w) continue;
    const bz = V66.bezug(K.skalen, K.css ? K.css.s : null), T = K.w.tage || [];
    F.hinweise += (K.w.hinweise || []).length;
    T.forEach((t, i) => {
      if (t.date < BIS) return;
      const E = t.einheiten || [], v = K.verf ? K.verf(t.date) : null, sum = E.reduce((s, e) => s + (e.dauer || 0), 0);
      if (v && isNum(v.min) && sum > v.min) F.verf.push(`${t.date} ${sum}>${v.min} min`);
      if (E.some((e) => hart(e) && land(e)) && E.some((e) => e.art === "lang" && land(e))) F.hartLang.push(t.date);
      const vor = T[i - 1]; if (vor && (vor.einheiten || []).some((e) => e.sport === "kraft") && E.some((e) => hart(e) && land(e) && !e.gesperrt)) F.kraft.push(t.date);
      const nach = T[i + 1]; if (nach && E.some((e) => hart(e) && land(e)) && (nach.einheiten || []).some((e) => hart(e) && land(e))) F.zweiHart.push(t.date);
      for (const e of E) {
        if (!["rad", "lauf", "schwimm"].includes(e.sport) || e.art === "test") continue;
        F.einheiten++; const q = W.V66UI.lastGeplant(e, bz); if (!isNum(q.tl)) F.ohneTl++;
      }
    });
  }
  zeile(`  Tage über der Verfügbarkeit: ${F.verf.length}${F.verf.length ? " (" + F.verf.join(", ") + ")" : ""}`);
  zeile(`  harte Rad- oder Laufeinheit am Tag nach dem Krafttraining: ${F.kraft.length}${F.kraft.length ? " (" + F.kraft.join(", ") + ")" : ""}`);
  zeile(`  hart und lang an Land am selben Tag: ${F.hartLang.length}; harte Einheiten an Land an zwei Tagen hintereinander: ${F.zweiHart.length}${F.zweiHart.length ? " (ab " + F.zweiHart.join(", ") + ")" : ""}`);
  zeile(`  Einheiten Schwimmen/Rad/Laufen ohne TL ≈: ${F.ohneTl} von ${F.einheiten}; Hinweise der Wochen (verschoben, gekürzt, gemeldet): ${F.hinweise}`);
}

/* 9 V8.2 Persönliche Reaktionen (nur Zusammenfassung; Zahlen nur im Chat) */
{
  const V82 = require(path.join(__dirname, "..", "js", "v82.js"));
  const t0 = Date.now(), R = V82.alles(D, { heute: BIS, zonen: D.zonen });
  zeile("\n9 Persönliche Reaktionen (V8.2)");
  if (!R) zeile("  keine Daten");
  else {
    const E = R.erholung, g = E.gruppen;
    zeile(`  Rechenzeit ${Date.now() - t0} ms; Erholung: harte Tage ${g.intensiv.n} (Rad ${g.rad.n}, Laufen ${g.lauf.n}), lange ${g.lang.n}, ruhige ${g.ruhig.n}; Abstand laut Daten: ${E.erholtTag ? "Tag " + E.erholtTag : "offen"}`);
    for (const m of ["hrv", "rhr", "puls"]) { const x = g.intensiv.marker[m], t = x.tage[0]; zeile(`    ${m}: Tag 1 ${r1(t.diff)} (Intervall ${t.kiDiff ? r1(t.kiDiff[0]) + " bis " + r1(t.kiDiff[1]) : "–"}, n ${t.n}), Grenze ±${r1(E.swc[m])} → ${x.status}`); }
    const T = R.vertraeglich;
    for (const [k, d] of Object.entries(T.dim)) zeile(`  verträglich ${k}: Bezug ${d.bezug || "–"}, bis ${d.bis || "–"}, deutlich schlechter ab ${d.ab || "–"} (${d.gruppen.map((q) => q.label + ":" + q.n).join(", ")})`);
    for (const z of R.verteilung.zusammenhang) zeile(`  Verteilung ${z.x} → ${z.marker}: ${z.status}${isNum(z.rho) ? " (ρ " + z.rho + ", n " + z.n + ")" : " (n " + z.n + ")"}`);
    zeile(`  Blockbilanz: ${R.bloecke.bloecke.length} Blöcke; letzter: ${R.bloecke.bloecke.length ? R.bloecke.bloecke[R.bloecke.bloecke.length - 1].satz : "–"}`);
  }
}

/* 10 V8.3 Tagescoach (nur Zusammenfassung; Zahlen nur im Chat) */
{
  zeile("\n10 Tagescoach (V8.3)");
  let R = null; try { R = W.V83UI && W.V83UI.pruefen ? W.V83UI.pruefen() : null; } catch (e) { zeile("  Fehler: " + e.message); }
  if (!R) zeile("  nicht berechenbar");
  else {
    const je = {}; for (const p of R.vorschlaege) je[p.anlass] = (je[p.anlass] || 0) + 1;
    zeile(`  Probelauf: ${R.probelauf ? "ja" : "nein"}; Morgen: ${R.morgen ? R.morgen.status : "–"}; Vorschläge: ${R.vorschlaege.length} ${JSON.stringify(je)}`);
    zeile(`  geprüft: ${R.geprueft.join(" · ")}`);
    for (const p of R.vorschlaege) zeile(`  ${p.date} ${p.anlass}: ${p.titel} → ${p.optionen.map((o) => o.art).join("/")}`);
    for (const h of R.hinweise) zeile(`  Hinweis: ${h}`);
    // Rückblick: was hätte der Coach in den letzten 28 Tagen gemeldet (nur Morgen und Last, ohne Mein Plan früherer Wochen)
    let morgen = 0, haerter = 0;
    for (let i = 1; i <= 28; i++) { const d = add(BIS, -i); if (W.V83.morgen(D.days, d).status === "auffaellig") morgen++; }
    for (const a of D.activities.filter((x) => x.date >= add(BIS, -28) && x.date < BIS && (x.sport === "rad" || x.sport === "lauf"))) {
      const h = (a.mv || a.dur || 0) / 3600; if (h > 0 && a.tss / h >= W.V83.LAST.hart_tl_h && h * 60 >= W.V83.LAST.hart_min) haerter++;
    }
    zeile(`  letzte 28 Tage: Morgen deutlich daneben an ${morgen} Tagen; Rad/Lauf mit Last ≥ ${W.V83.LAST.hart_tl_h} je Stunde: ${haerter} (ohne Vergleich mit dem Plan)`);
  }
}

/* 11 V8.5 Modell «Automatisch» (nur Zusammenfassung; Zahlen nur im Chat): was es diese und die nächsten Wochen entscheiden würde und wie oft es im letzten
   halben Jahr weniger harte Einheiten bzw. pyramidal gewählt hätte (mit dem Stand jener Montage; Modellwahl, Intensität und Zonen von heute) */
{
  zeile("\n11 Modell «Automatisch» (V8.5)");
  const gewaehlt = ((D.plan_modell || []).find((x) => x && x.id === "modell") || {}).modell || "kombiniert";
  zeile(`  gewählt: ${gewaehlt}`);
  try {
    const mo0 = V64.montag(BIS), zaehl = { wochen: 0, weniger: 0, pyramidal: 0, gruende: {} };
    for (let k = -26; k <= 4; k++) {
      const mo = V64.addDays(mo0, 7 * k), K = W.V64UI.kontextFuer(mo), e = K && (K.auto || W.V85UI.entscheid(K.autoIn));
      if (!e) continue;
      if (k >= 0) zeile(`  ${mo} ${(K.w.phase || "").padEnd(19)} ${K.w.erholung ? "E" : " "} ${e.kurz}${e.grund ? " – " + e.grund : ""}`);
      else { zaehl.wochen++; if (e.harte < e.vorlage) { zaehl.weniger++; zaehl.gruende[e.grund] = (zaehl.gruende[e.grund] || 0) + 1; } if (e.modell === "pyramidal") zaehl.pyramidal++; }
    }
    zeile(`  letzte 26 Wochen: weniger harte Einheiten in ${zaehl.weniger} von ${zaehl.wochen} ${JSON.stringify(zaehl.gruende)}; pyramidal in ${zaehl.pyramidal}`);
    const e0 = W.V85UI.entscheid(W.V64UI.kontextFuer(mo0).autoIn);
    if (e0) for (const g of e0.gruende) zeile(`  diese Woche · ${g.titel}: ${g.text}`);
  } catch (err) { zeile("  Fehler: " + err.message); }
}
