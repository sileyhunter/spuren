/* V6.2 Etappe 2 · Tests im Plan (testplan-1.0): CSS-Test, Rad- und Lauf-Stufentest und Laktat-Kurzcheck planen sich nach festen Regeln selbst ein.
   Bis der eigene Plan läuft, sind es Vorschläge in Kalender und Testkalender; nach Garmin wird nichts geschrieben.
   Regeln (Abstände von Silas bestätigt am 13.11.2026):
   - CSS-Test alle 6–8 Wochen (zuerst 7, sonst 6 oder 8), am selben Wochentag wie der letzte (Kursabende bleiben frei), nicht in der Woche vor einem Rennen.
   - Rad-Stufentest alle 8 Wochen am Samstag einer Erholungswoche (saison-1.1); war der letzte nicht ausbelastet, als Nächstes ein ausbelasteter.
   - Lauf-Stufentest alle 8–12 Wochen, ebenfalls am Ende einer Erholungswoche, aber nie in derselben Woche wie der Rad-Test.
   - Kurzcheck alle 2 Wochen in einer Grundlagenfahrt (mind. 60 min); entfällt, wenn ein Stufentest (Rad oder Lauf) innerhalb von 4 Tagen liegt.
   - Kein Stufentest in den 14 Tagen vor einem Rennen, in der Woche danach und im Taper; kein Test in eingetragenen Abwesenheiten.
   - Eingetragene Termine (Testkalender) gehen vor: sie bleiben, Vorschläge richten sich nach ihnen; Regelverstösse werden gezeigt, nie still geändert.
   V6.2.2: Zonen-Vorschlag aus LT1/LT2 (zonenvorschlag-1.0, unten) – gilt erst nach Silas' Bestätigung auf der Seite.
   Ohne DOM (auch unter Node testbar). */
(function (root, factory) {
  const V62 = factory();
  if (typeof module === "object" && module.exports) module.exports = V62;
  if (root) root.V62 = V62;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V62 = { VERSIONS: { testplan: "testplan-1.0" } };
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const tage = (a, b) => Math.round((T(b) - T(a)) / 864e5);
  const wt = (iso) => new Date(T(iso)).getUTCDay();                       // 0 = Sonntag … 6 = Samstag
  const ch = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}.${+m}.${y}`; };
  V62.addDays = add;
  V62.REGEL = {
    css: { min_w: 6, max_w: 8, ziel_w: 7, vor_rennen_t: 7, nach_rennen_t: 3 },
    rad: { min_t: 49 },                     // 8 Wochen; Erholungswochen kommen alle 4 Wochen, darum 1 Woche Spielraum
    lauf: { min_t: 56, max_t: 84 },         // 8–12 Wochen
    check: { abstand_t: 14, fenster_t: 3, vorlauf_t: 56, stufentest_t: 4, vor_rennen_t: 3, nach_rennen_t: 2 },
    stufen: { vor_rennen_t: 14, nach_rennen_t: 7, frueh_t: 2 },
  };
  const NAME = { css: "CSS-Test", rad: "Rad-Stufentest", lauf: "Lauf-Stufentest", check: "Laktat-Kurzcheck" };

  function sperre(d, sperren) { return (sperren || []).find((s) => s && s.von && s.bis && d >= s.von && d <= s.bis) || null; }
  function rennenNah(d, rennen, vor, nach) {
    return (rennen || []).find((r) => r && r.date && ((tage(d, r.date) >= 0 && tage(d, r.date) <= vor) || (tage(r.date, d) >= 0 && tage(r.date, d) <= nach))) || null;
  }
  /** Erster Tag ab start mit diesem Wochentag, an dem ok(tag) gilt (höchstens 8 Wochen weit). */
  function naechster(start, wochentag, ok) {
    let d = add(start, (wochentag - wt(start) + 7) % 7);
    for (let i = 0; i < 8; i++, d = add(d, 7)) if (ok(d)) return d;
    return null;
  }
  /** Termin im Fenster 6–8 Wochen nach prev (zuerst 7, dann 6, dann 8 Wochen, gleicher Wochentag); sonst der nächste erlaubte danach. */
  function imFenster(prev, wochentag, ok) {
    const R = V62.REGEL.css;
    for (const w of [R.ziel_w, R.min_w, R.max_w]) { const d = naechster(add(prev, w * 7), wochentag, () => true); if (d && ok(d)) return d; }
    return naechster(add(prev, R.max_w * 7 + 1), wochentag, ok);
  }
  /** Grundlagenfahrt im Garmin-Kalender (Titel/Beschreibung, mind. 60 min, keine harte Einheit). */
  V62.grundlage = function (p) {
    if (!p || p.sport !== "rad" || (p.dur_s || 0) < 3600) return false;
    const t = `${p.title || ""} ${p.desc || ""}`;
    return /grundlage|ausdauer|fat ?max|basis|endurance|base|\bz2\b|locker|ga1/i.test(t) && !/intervall|vo2|schwelle|sweet|tempo|sprint|test|threshold/i.test(t);
  };

  /** Testplan. ctx: heute, bis (Hauptrennen), wochen (saison-1.1: woche = Montag, phase, erholung), rennen [{date, short}],
   *  erledigt {css: [Datum], rad: [{date, ausbelastet}], lauf: [{date, ausbelastet}], check: [Datum]},
   *  fest (Testkalender: {date, kind, sport?}), planned (Garmin-Kalender), sperren [{von, bis, grund}].
   *  Ergebnis: {vorschlaege: [{date, kind, sport, note, status: "vorschlag", regel}], konflikte: [{date, kind, text, vorschlag}], regel}. */
  V62.testplan = function (ctx) {
    const R = V62.REGEL, heute = ctx.heute, bis = ctx.bis || add(heute, 7 * 30);
    const wochen = (ctx.wochen || []).slice().sort((a, b) => a.woche.localeCompare(b.woche));
    const phase = (d) => { let p = null; for (const w of wochen) if (w.woche <= d) p = w; else break; return p && tage(p.woche, d) < 7 ? p.phase : null; };
    const fest = (ctx.fest || []).filter((f) => f && f.date && f.kind);
    const festSport = (f) => f.sport || (f.kind === "stufentest" ? (/lauf/i.test(f.note || "") ? "lauf" : "rad") : f.kind === "check" ? "rad" : null);
    const vorschlaege = [], konflikte = [];

    /* ----- Stufentests Rad und Lauf: Samstag einer Erholungswoche ----- */
    const erh = wochen.filter((w) => w.erholung).map((w) => add(w.woche, 5)).filter((d) => d >= add(heute, R.stufen.frueh_t) && d <= bis);
    const okStufe = (d) => !sperre(d, ctx.sperren) && !rennenNah(d, ctx.rennen, R.stufen.vor_rennen_t, R.stufen.nach_rennen_t) && phase(d) !== "Taper";
    const belegt = new Set();
    for (const sport of ["rad", "lauf"]) {
      const done = ((ctx.erledigt || {})[sport] || []).filter((x) => x && x.date && x.date <= heute).sort((a, b) => a.date.localeCompare(b.date));
      const fix = fest.filter((f) => f.kind === "stufentest" && festSport(f) === sport && f.date >= heute).map((f) => f.date).sort();
      let ref = done.length ? done[done.length - 1] : null, nichtAus = !!(ref && ref.ausbelastet === false && sport === "rad");
      const minT = sport === "rad" ? R.rad.min_t : R.lauf.min_t;
      for (const d of erh) {
        const f = fix.find((x) => Math.abs(tage(x, d)) <= 21);
        if (f) { ref = { date: f }; nichtAus = false; if (sport === "rad") belegt.add(d); continue; }
        if (ref && !nichtAus && tage(ref.date, d) < minT) continue;
        if (!okStufe(d) || (sport === "lauf" && belegt.has(d))) continue;
        let note;
        if (sport === "rad") note = nichtAus ? `Ausbelasteter Stufentest am Ende der Erholungswoche – der letzte (${ch(ref.date)}) war nicht ausbelastet`
          : ref ? `Am Ende der Erholungswoche, 8 Wochen nach dem letzten (${ch(ref.date)})` : "Erster Rad-Stufentest, am Ende der Erholungswoche";
        else note = ref ? `Bahn oder Laufband, am Ende der Erholungswoche, ${Math.round(tage(ref.date, d) / 7)} Wochen nach dem letzten (${ch(ref.date)})${tage(ref.date, d) > R.lauf.max_t ? " – früher passte keine Erholungswoche" : ""}`
          : "Erster Lauf-Stufentest (Bahn oder Laufband), am Ende der Erholungswoche, nicht in derselben Woche wie der Rad-Test";
        vorschlaege.push({ date: d, kind: "stufentest", sport, note, status: "vorschlag", regel: V62.VERSIONS.testplan });
        if (sport === "rad") belegt.add(d);
        ref = { date: d }; nichtAus = false;
      }
    }

    /* ----- CSS-Test: alle 6–8 Wochen am selben Wochentag ----- */
    const okCss = (d) => d >= heute && !sperre(d, ctx.sperren) && !rennenNah(d, ctx.rennen, R.css.vor_rennen_t, R.css.nach_rennen_t);
    const cssDone = ((ctx.erledigt || {}).css || []).filter((d) => d && d <= heute).sort();
    const cssFix = fest.filter((f) => f.kind === "css" && f.date >= heute).map((f) => f.date).sort();
    const anker = [...new Set([...cssDone, ...cssFix])].sort();
    const tagCss = anker.length ? wt(anker[anker.length - 1]) : 4;
    for (let i = 0; i < anker.length; i++) {               // eingetragene Termine prüfen, nie still verschieben
      const a = anker[i];
      if (!cssFix.includes(a)) continue;
      const prev = anker[i - 1], s = sperre(a, ctx.sperren), r = rennenNah(a, ctx.rennen, R.css.vor_rennen_t, R.css.nach_rennen_t);
      const gruende = [];
      if (prev && tage(prev, a) < R.css.min_w * 7) gruende.push(`nur ${Math.round(tage(prev, a) / 7)} Wochen nach dem CSS-Test vom ${ch(prev)} (Regel 6–8)`);
      if (s) gruende.push(`fällt in «${s.grund || "Abwesenheit"}»`);
      if (r) gruende.push(`zu nahe an ${r.short || r.name || "einem Rennen"}`);
      if (!gruende.length) continue;
      const v = prev ? imFenster(prev, wt(a), okCss) : naechster(add(a, 7), wt(a), okCss);
      const next = anker.find((x) => x > a), eng = v && next && tage(v, next) < R.css.min_w * 7;
      konflikte.push({ date: a, kind: "css", text: `CSS-Test ${ch(a)}: ${gruende.join("; ")}`, vorschlag: v,
        folge: eng ? `dann nur ${Math.round(tage(v, next) / 7)} Wochen bis zum Termin vom ${ch(next)} – einen der beiden weglassen` : null });
    }
    let ref = anker.filter((d) => d <= heute).pop() || null;
    for (const a of [...anker.filter((d) => d > heute), null]) {
      // Lücke bis zum nächsten eingetragenen Termin (a) bzw. bis zum Hauptrennen mit Vorschlägen füllen, wenn sie grösser als 8 Wochen ist
      for (let n = 0; n < 12; n++) {
        if (a && tage(ref || heute, a) <= R.css.max_w * 7) break;
        const d = ref ? imFenster(ref, tagCss, okCss) : naechster(heute, tagCss, okCss);
        if (!d || (a ? tage(d, a) < R.css.min_w * 7 : d > bis)) break;
        vorschlaege.push({ date: d, kind: "css", sport: "schwimm", status: "vorschlag", regel: V62.VERSIONS.testplan,
          note: ref ? `400 m und 200 m, ${Math.round(tage(ref, d) / 7)} Wochen nach dem letzten (${ch(ref)})` : "400 m und 200 m – erster CSS-Test" });
        ref = d;
      }
      if (a) ref = a;
    }

    /* ----- Kurzcheck: alle 2 Wochen in einer Grundlagenfahrt, rollend 8 Wochen ----- */
    const stufenTage = [...vorschlaege.filter((v) => v.kind === "stufentest").map((v) => v.date), ...fest.filter((f) => f.kind === "stufentest").map((f) => f.date)];
    const checkFix = fest.filter((f) => f.kind === "check" && f.date >= heute).map((f) => f.date);
    const okCheck = (d) => !sperre(d, ctx.sperren) && !rennenNah(d, ctx.rennen, R.check.vor_rennen_t, R.check.nach_rennen_t);
    const cd = ((ctx.erledigt || {}).check || []).filter((d) => d && d <= heute).sort();
    let due = cd.length ? add(cd[cd.length - 1], R.check.abstand_t) : heute;
    if (due < heute) due = heute;
    const ende = [bis, add(heute, R.check.vorlauf_t)].sort()[0];
    for (let n = 0; n < 12 && due <= ende; n++) {
      const st = stufenTage.find((s) => Math.abs(tage(s, due)) <= R.check.stufentest_t);
      if (st) { due = add(st, R.check.abstand_t); continue; }
      const f = checkFix.find((x) => Math.abs(tage(x, due)) <= 7);
      if (f) { due = add(f, R.check.abstand_t); continue; }
      const p = (ctx.planned || []).filter((x) => V62.grundlage(x) && Math.abs(tage(x.date, due)) <= R.check.fenster_t && x.date >= heute && okCheck(x.date))
        .sort((a, b) => Math.abs(tage(a.date, due)) - Math.abs(tage(b.date, due)))[0];
      let d = p ? p.date : null;
      for (let k = 0; !d && k <= R.check.fenster_t; k++) if (okCheck(add(due, k))) d = add(due, k);
      if (!d) { due = add(due, R.check.abstand_t); continue; }
      vorschlaege.push({ date: d, kind: "check", sport: "rad", status: "vorschlag", regel: V62.VERSIONS.testplan,
        note: p ? `In «${p.title || "Grundlagenfahrt"}»: Laktat am Ende eines gleichmässigen Blocks` : "In einer Grundlagenfahrt (mind. 60 min) um diesen Tag: Laktat am Ende eines gleichmässigen Blocks" });
      due = add(d, R.check.abstand_t);
    }
    vorschlaege.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
    return { vorschlaege, konflikte, regel: V62.VERSIONS.testplan };
  };
  V62.NAME = NAME;

  /* =====================================================================
     V6.2.2 Zonen-Vorschlag aus LT1/LT2 (zonenvorschlag-1.0). Gilt erst nach Silas' Bestätigung auf der Seite (zonen_add mit Freigabe).
     - Grenze Z2/Z3 = LT1, Grenze Z3/Z4 = LT2 aus dem neuesten Stufentest (Puls an der Schwelle aus der FIT-Datei, wie schwellen-1.0).
       So auch die physiologischen Zonen von Swiss Olympic (Vogt et al. 2005: Zone I bis zur aeroben, II bis zur anaeroben Schwelle, III darüber).
     - Z1/Z2 und Z4/Z5 sind nicht gemessen: gleiches Verhältnis zu LT1 bzw. LT2 wie in der Intensitätsskala nach Tønnessen et al. 2024
       (Zonen 1–2 unter LT1, Zone 3 dazwischen, Zonen 4–5 über LT2). Leistung und Tempo nach der Spalte % VO2max, Puls nach % HFmax.
     - Unterzonen (FatMax, Sweet Spot) übernimmt der Vorschlag nicht; nie eine Schwelle ausserhalb der Stufen (kommt aus schwellen-1.0).
     ===================================================================== */
  V62.VERSIONS.zonenvorschlag = "zonenvorschlag-1.0";
  V62.ZONEN_SKALA = {
    hf: [[60, 72], [73, 82], [83, 87], [88, 92], [93, 100]],      // % HFmax je Zone 1–5
    vo2: [[50, 65], [66, 80], [81, 87], [88, 93], [94, 100]],     // % VO2max je Zone 1–5
    quelle: "Tønnessen E, Sandbakk Ø, Sandbakk SB, Seiler S, Haugen T (2024): Training Session Models in Endurance Sports: A Norwegian Perspective on Best Practice Recommendations. Sports Medicine 54, 2935–2953",
    url: "https://doi.org/10.1007/s40279-024-02067-4",
    swiss: "Swiss Olympic, Fachgruppe Ausdauer (Vogt M et al., 2005): Physiologische Trainingsintensitätszonen. Fachdokumentation 2005/1",
    swiss_url: "https://www.mobilesport.ch/wp-content/uploads/2011/06/PhysiologischeTrainingsintensitaetszonen.pdf",
  };
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const mitte = (sp, i) => (sp[i][1] + sp[i + 1][0]) / 2;            // Grenze zwischen Zone i+1 und i+2 (z. B. 72 | 73 → 72,5 %)
  /** Faktoren: unten = Grenze Z1/Z2 ÷ Grenze Z2/Z3 (LT1), oben = Grenze Z4/Z5 ÷ Grenze Z3/Z4 (LT2). */
  V62.zonenFaktoren = function () {
    const S = V62.ZONEN_SKALA, f = (sp) => ({ unten: mitte(sp, 0) / mitte(sp, 1), oben: mitte(sp, 3) / mitte(sp, 2) });
    return { leistung: f(S.vo2), puls: f(S.hf) };                   // Tempo (km/h) wie Leistung: unterhalb VO2max etwa proportional zur Sauerstoffaufnahme
  };
  const komma = (v, d) => v.toFixed(d).replace(".", ",");
  V62.zonenRegelText = function () {
    const F = V62.zonenFaktoren();
    return `Grenze Z2/Z3 = LT1 und Z3/Z4 = LT2 aus dem Stufentest (Puls an der Schwelle aus der FIT-Datei). Z1/Z2 und Z4/Z5 sind nicht gemessen: `
      + `${komma(F.leistung.unten, 2)} × LT1 und ${komma(F.leistung.oben, 2)} × LT2 bei Leistung und Tempo, ${komma(F.puls.unten, 2)} × und ${komma(F.puls.oben, 2)} × beim Puls – `
      + `gleiche Verhältnisse wie in der Intensitätsskala nach Tønnessen et al. 2024 (Zonen 1–2 unter LT1, Zone 3 dazwischen, Zonen 4–5 über LT2).`;
  };
  /** Puls bei x, linear zwischen den Stufen des Tests; ausserhalb der Stufen null (keine Extrapolation). */
  function hfBei(stufen, x) {
    const P = (stufen || []).filter((s) => isNum(s.x) && isNum(s.hf)).sort((a, b) => a.x - b.x);
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (a.x <= x && x <= b.x) return b.x === a.x ? (a.hf + b.hf) / 2 : a.hf + ((x - a.x) / (b.x - a.x)) * (b.hf - a.hf);
    }
    return null;
  }
  /** LT1 bzw. LT2 eines Tests: eine gewählte gültige Methode oder die Mitte aller gültigen Methoden (Standard). */
  function schwelle(t, which, wahl) {
    const lt = t[which] || {}, M = t.methoden || {};
    const ok = (lt.methoden || []).filter((k) => M[k] && isNum(M[k].x));
    if (!ok.length || !isNum(lt.lo) || !isNum(lt.hi)) return { fehler: `${which.toUpperCase()} nicht bestimmbar${lt.grund ? " (" + lt.grund + ")" : ""}` };
    const base = { lo: lt.lo, hi: lt.hi, status: lt.status || null, grund: lt.grund || null, alle: ok };
    if (wahl && wahl !== "mitte" && ok.includes(wahl)) {
      const m = M[wahl];
      return Object.assign(base, { x: m.x, hf: isNum(m.hf) ? m.hf : hfBei(t.stufen, m.x), wahl, methoden: [wahl] });
    }
    const x = ok.length === 1 ? M[ok[0]].x : (lt.lo + lt.hi) / 2;
    let hf = ok.length === 1 && isNum(M[ok[0]].hf) ? M[ok[0]].hf : hfBei(t.stufen, x);
    if (!isNum(hf)) { const h = ok.map((k) => M[k].hf).filter(isNum); hf = h.length ? h.reduce((s, v) => s + v, 0) / h.length : null; }
    return Object.assign(base, { x, hf, wahl: "mitte", methoden: ok });
  }
  const SKALA_KEY = { rad: { leistung: "rad_w", puls: "rad_hf" }, lauf: { pace: "lauf_pace", puls: "lauf_hf" } };
  function skala(t, metrik, g, txt) {
    const pace = metrik === "pace", puls = metrik === "puls";
    for (let i = 1; i < g.length; i++) if (pace ? !(g[i] < g[i - 1]) : !(g[i] > g[i - 1])) return null;     // Grenzen müssen streng geordnet sein
    const zonen = ["Z1", "Z2", "Z3", "Z4", "Z5"].map((z, i) => ({ z, von: i === 0 ? null : g[i - 1], bis: i === 4 ? null : g[i] }));
    const umfang = pace ? [Math.ceil((g[0] * 1.12) / 5) * 5, Math.floor((g[3] * 0.9) / 5) * 5]
      : puls ? [Math.floor((g[0] - 20) / 5) * 5, Math.ceil((g[3] + 12) / 5) * 5] : [Math.floor((g[0] * 0.75) / 10) * 10, Math.ceil((g[3] * 1.15) / 10) * 10];
    const grenzen = {};
    g.forEach((v, i) => (grenzen[String(v)] = txt[i]));
    return { key: SKALA_KEY[t.sport][metrik], disziplin: t.sport, metrik, unit: pace ? "s/km" : puls ? "bpm" : "W", protokoll: t.protokoll, umfang, zonen, grenzen,
      hinweis: `Vorschlag ${V62.VERSIONS.zonenvorschlag} aus dem Stufentest vom ${ch(t.datum)}${puls ? " (Puls an der Schwelle aus der FIT-Datei)" : ""}` };
  }
  /** Vorschlag aus einem Test von D.schwellen.tests (schwellen-1.0). wahl: {lt1, lt2} = "mitte" oder Methode; opt.namen: Methode → Name.
   *  Ergebnis: {ok, grund?, sport, test, datum, protokoll, bestaetigt, ausbelastet, lt1, lt2, skalen [rad_w|lauf_pace, rad_hf|lauf_hf], hinweise, regel}. */
  V62.zonenVorschlag = function (t, wahl, opt) {
    const R = { regel: V62.VERSIONS.zonenvorschlag, ok: false, sport: t ? t.sport : null, test: t ? t.test : null, datum: t ? t.datum : null,
      protokoll: t ? t.protokoll : null, bestaetigt: !!(t && t.datenstatus === "bestätigt"), ausbelastet: t ? t.ausbelastet : null, hinweise: [], skalen: [] };
    if (!t || !SKALA_KEY[t.sport]) return Object.assign(R, { grund: "kein Stufentest Rad oder Laufen" });
    const w = wahl || {}, l1 = schwelle(t, "lt1", w.lt1), l2 = schwelle(t, "lt2", w.lt2);
    if (l1.fehler || l2.fehler) return Object.assign(R, { grund: [l1.fehler, l2.fehler].filter(Boolean).join("; ") });
    if (!(l1.x < l2.x)) return Object.assign(R, { grund: "LT1 liegt nicht unter LT2" });
    R.lt1 = l1; R.lt2 = l2;
    const F = V62.zonenFaktoren(), lauf = t.sport === "lauf", nm = (opt && opt.namen) || {};
    const wer = (l) => l.methoden.map((k) => nm[k] || k).join(", ") + (l.methoden.length > 1 ? " (Mitte)" : "");
    const txt = (fu, fo, was) => [`Z1/Z2: ${komma(fu, 2)} × LT1${was} (nicht gemessen; Verhältnis aus der Skala nach Tønnessen et al. 2024)`,
      `LT1${was} · ${wer(l1)} · Stufentest ${ch(t.datum)}`, `LT2${was} · ${wer(l2)} · Stufentest ${ch(t.datum)}`,
      `Z4/Z5: ${komma(fo, 2)} × LT2${was} (nicht gemessen; Verhältnis aus der Skala nach Tønnessen et al. 2024)`];
    const xs = [l1.x * F.leistung.unten, l1.x, l2.x, l2.x * F.leistung.oben];
    const s1 = lauf ? skala(t, "pace", xs.map((v) => Math.round(3600 / v)), txt(F.leistung.unten, F.leistung.oben, "-Tempo"))
      : skala(t, "leistung", xs.map((v) => Math.round(v)), txt(F.leistung.unten, F.leistung.oben, ""));
    if (!s1) return Object.assign(R, { grund: "Grenzen fallen nach dem Runden zusammen" });
    R.skalen.push(s1);
    if (isNum(l1.hf) && isNum(l2.hf) && l1.hf < l2.hf) {
      const s2 = skala(t, "puls", [l1.hf * F.puls.unten, l1.hf, l2.hf, l2.hf * F.puls.oben].map((v) => Math.round(v)), txt(F.puls.unten, F.puls.oben, "-Puls"));
      if (s2) R.skalen.push(s2); else R.hinweise.push("Pulsgrenzen fallen nach dem Runden zusammen: Pulszonen bleiben unverändert.");
    } else R.hinweise.push("Puls an LT1 oder LT2 fehlt im Test: Pulszonen bleiben unverändert.");
    if (l1.methoden.length === 1 && l1.alle.length === 1) R.hinweise.push("LT1 nur aus einer gültigen Methode.");
    if (l2.methoden.length === 1 && l2.alle.length === 1) R.hinweise.push("LT2 nur aus einer gültigen Methode" + (t.ausbelastet === false ? " (Test nicht ausbelastet: Dmax ungültig)." : "."));
    R.ok = true;
    return R;
  };
  const pickLt = (l) => ({ x: Math.round(l.x * 100) / 100, hf: isNum(l.hf) ? Math.round(l.hf * 10) / 10 : null, wahl: l.wahl, methoden: l.methoden, lo: l.lo, hi: l.hi });
  /** Neues Zonenprofil: Basis (aktives oder noch nicht eingespieltes Profil) mit den Skalen der bestätigten Vorschläge ersetzt.
   *  ctx: {heute, id, zeit?}. Die übrigen Skalen bleiben unverändert (methodik.unveraendert). Gilt erst nach zonen_add im Update. */
  V62.zonenProfil = function (basis, vorschlaege, ctx) {
    const V = (vorschlaege || []).filter((v) => v && v.ok), neu = V.flatMap((v) => v.skalen), heute = ctx.heute;
    const keys = new Set(neu.map((s) => s.key));
    const alt = ((basis && basis.skalen) || []).map((s) => JSON.parse(JSON.stringify(s)));
    const skalen = alt.map((s) => (keys.has(s.key) ? neu.find((n) => n.key === s.key) : s));
    for (const n of neu) if (!skalen.some((s) => s.key === n.key)) skalen.push(n);
    const gleich = basis && basis.id === ctx.id;                    // am selben Tag noch eine Sportart bestätigt: gleiche Fassung erweitern
    const je = Object.assign({}, gleich && basis.methodik && basis.methodik.je_sportart ? basis.methodik.je_sportart : {});
    for (const v of V) je[v.sport] = { test: v.test, datum: v.datum, protokoll: v.protokoll, ausbelastet: v.ausbelastet, lt1: pickLt(v.lt1), lt2: pickLt(v.lt2), skalen: v.skalen.map((s) => s.key) };
    const sp = Object.keys(je).map((k) => (k === "lauf" ? "Laufen" : "Rad")).join(" und ");
    const ersetzt = new Set(Object.values(je).flatMap((x) => x.skalen));
    return {
      id: ctx.id, v: "zonen-1.0", name: `Zonen vom ${ch(heute)}`, status: "aktiv", gueltig_ab: heute, gueltig_bis: null, provenienz: "berechnet",
      vorgaenger: basis ? (gleich ? basis.vorgaenger || null : basis.id) : null,
      freigabe: Object.assign({ art: "seite", datum: heute, durch: "Silas", text: `Auf der Seite bestätigt am ${ch(heute)}: ${sp} aus LT1/LT2 (${V62.VERSIONS.zonenvorschlag}).` },
        ctx.zeit ? { zeit: ctx.zeit } : {}),
      methodik: { art: V62.VERSIONS.zonenvorschlag, bestaetigt: true, text: V62.zonenRegelText(), quelle: V62.ZONEN_SKALA.quelle, url: V62.ZONEN_SKALA.url,
        je_sportart: je, unveraendert: skalen.map((s) => s.key).filter((k) => !ersetzt.has(k)) },
      skalen,
    };
  };
  /** Grenzen einer Skala (Z1/Z2 … Z4/Z5) als Liste, für den Vergleich aktiv ↔ Vorschlag. */
  V62.grenzenListe = (s) => (s && Array.isArray(s.zonen) ? s.zonen.slice(0, -1).map((z) => (isNum(z.bis) ? z.bis : null)) : []);
  return V62;
});
