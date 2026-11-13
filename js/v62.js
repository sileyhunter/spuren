/* V6.2 Etappe 2 · Tests im Plan (testplan-1.0): CSS-Test, Rad- und Lauf-Stufentest und Laktat-Kurzcheck planen sich nach festen Regeln selbst ein.
   Bis der eigene Plan läuft, sind es Vorschläge in Kalender und Testkalender; nach Garmin wird nichts geschrieben.
   Regeln (Abstände von Silas bestätigt am 13.11.2026):
   - CSS-Test alle 6–8 Wochen (zuerst 7, sonst 6 oder 8), am selben Wochentag wie der letzte (Kursabende bleiben frei), nicht in der Woche vor einem Rennen.
   - Rad-Stufentest alle 8 Wochen am Samstag einer Erholungswoche (saison-1.0); war der letzte nicht ausbelastet, als Nächstes ein ausbelasteter.
   - Lauf-Stufentest alle 8–12 Wochen, ebenfalls am Ende einer Erholungswoche, aber nie in derselben Woche wie der Rad-Test.
   - Kurzcheck alle 2 Wochen in einer Grundlagenfahrt (mind. 60 min); entfällt, wenn ein Stufentest (Rad oder Lauf) innerhalb von 4 Tagen liegt.
   - Kein Stufentest in den 14 Tagen vor einem Rennen, in der Woche danach und im Taper; kein Test in eingetragenen Abwesenheiten.
   - Eingetragene Termine (Testkalender) gehen vor: sie bleiben, Vorschläge richten sich nach ihnen; Regelverstösse werden gezeigt, nie still geändert.
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

  /** Testplan. ctx: heute, bis (Hauptrennen), wochen (saison-1.0: woche = Montag, phase, erholung), rennen [{date, short}],
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
  return V62;
});
