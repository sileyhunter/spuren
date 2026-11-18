/* V8.1 «Daten zusammenführen» (Masterprompt V8, Abschnitte 5 und 8) – Rechenlogik ohne DOM:
   - nachher-1.0 (1.1 = V8.1.1 mit Magen und Energie ab 60 min): «Nach dem Training» je Aktivität – Anstrengung (RPE 1–10) und Gefühl von der Uhr (Garmins Selbsteinschätzung workout_rpe/workout_feel,
     vom Nacht-Update je Garmin-ID in D.garmin_selbst als rpe_g/feel_g) oder von der Seite, dazu leichter/schwerer als erwartet, Intervalle geschafft, Notiz. Gespeichert wird
     wie bisher in der Liste «rpe» (ID = Aktivität), mit denselben Feldern wie rpe-1.0 und den neuen.
   - hf-leistung-1.0: Puls zur Leistung einer Einheit gegen deine Basis – nur aus Abschnitten mit gleichmässiger Leistung (gleichmässige 10-min-Blöcke eb-1.0
     bzw. Schritte eines Workouts auf der Uhr, plan-1.0), nie aus dem Mittel der ganzen Einheit; Basis = dieselbe Blockart bzw. dieselbe Leistung ±5 % in den
     Wochen davor. Eine Einheit ist nur ein Hinweis.
   - last-abweichung-1.0: geplante gegen absolvierte Last derselben Einheit (TL ≈ von Mein Plan gegen die Last der Aktivität am selben Tag, gleiche Sportart).
   - anstieg-1.0: Anstieg der Belastung – langfristig (Fitness heute gegen vor vier Wochen), aktuell (Ermüdung ÷ Fitness wie der Trainingsstatus) und
     geplant (die nächsten drei Wochen Mein Plan). Fitness, Ermüdung, Last und Ampel bleiben getrennte Zahlen. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.V81 = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const V81 = { VERSIONS: { nachher: "nachher-1.1", hf_leistung: "hf-leistung-1.0", abweichung: "last-abweichung-1.0", anstieg: "anstieg-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const tagNr = (iso) => Math.round(Date.parse(String(iso).slice(0, 10) + "T12:00:00Z") / 864e5);
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const mittel = (L) => L.reduce((s, x) => s + x, 0) / L.length;
  const sd = (L) => { if (L.length < 2) return null; const m = mittel(L); return Math.sqrt(L.reduce((s, x) => s + (x - m) ** 2, 0) / (L.length - 1)); };
  const median = (L) => { const s = L.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
  const r1 = (x) => Math.round(x * 10) / 10;

  /* ---------------- nachher-1.0 ---------------- */
  /** Garmins Gefühl (workout_feel 0–100 in Viertelschritten) in Worten wie auf der Uhr. */
  V81.GEFUEHL = [[0, "sehr schwach"], [25, "schwach"], [50, "normal"], [75, "stark"], [100, "sehr stark"]];
  V81.gefuehlWort = (v) => { if (!isNum(v)) return null; const g = V81.GEFUEHL.reduce((b, x) => (Math.abs(x[0] - v) < Math.abs(b[0] - v) ? x : b)); return g[1]; };
  V81.ERWARTUNG = ["leichter", "wie erwartet", "schwerer"];
  V81.INTERVALLE = ["alle", "nicht alle", "keine"];
  /** nachher-1.1 (V8.1.1, verpflegung-1.0): Magen und Energie bei Einheiten ab 60 min – für den Abgleich mit der Verpflegung und das Darmtraining (VP.darm). */
  V81.MAGEN = [["ok", "ohne Beschwerden"], ["leicht", "leichte Beschwerden"], ["stark", "starke Beschwerden"]];
  V81.ENERGIE = ["gut", "nachgelassen", "leer"];
  /** Magen und Energie fragen: ab 60 min Bewegungszeit, nicht beim Schwimmen und Krafttraining. */
  V81.mitVerpflegung = (a) => !!a && !["schwimm", "kraft"].includes(a.sport) && (isNum(a.mv) ? a.mv : a.dur || 0) >= 3600;
  /** Garmin-Rohwerte (workout_rpe 10–100, workout_feel 0–100) → { rpe_g 1–10, feel_g 0/25/50/75/100 }; gleiche Regel wie tools/notizen.py selbst_von (Nacht-Update). */
  V81.garminSelbst = function (workout_rpe, workout_feel) {
    const out = {};
    if (isNum(workout_rpe) && workout_rpe >= 5 && workout_rpe <= 100) out.rpe_g = Math.max(1, Math.min(10, Math.round(workout_rpe / 10)));
    if (isNum(workout_feel) && workout_feel >= 0 && workout_feel <= 100) out.feel_g = Math.round(workout_feel / 25) * 25;
    return out;
  };
  /** Garmins Selbsteinschätzung einer Aktivität aus den Daten (D.garmin_selbst je Garmin-ID, wie die Notizen; tools/notizen.py selbst_einlesen). */
  V81.selbstVon = (D, a) => { const S = (D && D.garmin_selbst) || {}, x = a && a.gid ? S[a.gid] : null; return x && (isNum(x.rpe_g) || isNum(x.feel_g)) ? x : null; };
  /** Was zu einer Aktivität gilt: Eintrag von der Seite vor der Uhr (s = V81.selbstVon). → { rpe, rpeQuelle, gefuehl, gefuehlQuelle, erwartung, intervalle, notiz, offen } */
  V81.nachher = function (a, e, s) {
    e = e || null; s = s || null;
    const rpe = e && isNum(e.rpe) ? e.rpe : s && isNum(s.rpe_g) ? s.rpe_g : null;
    const gef = e && e.gefuehl ? e.gefuehl : s && isNum(s.feel_g) ? V81.gefuehlWort(s.feel_g) : null;
    return { rpe, rpeQuelle: e && isNum(e.rpe) ? "seite" : rpe != null ? "uhr" : null, gefuehl: gef, gefuehlQuelle: e && e.gefuehl ? "seite" : gef ? "uhr" : null,
      erwartung: e && V81.ERWARTUNG.includes(e.erwartung) ? e.erwartung : null, intervalle: e && V81.INTERVALLE.includes(e.intervalle) ? e.intervalle : null,
      notiz: e && e.notiz ? e.notiz : null, offen: !(e && (e.erwartung || isNum(e.rpe))),
      magen: e && V81.MAGEN.some((x) => x[0] === e.magen) ? e.magen : null, energie: e && V81.ENERGIE.includes(e.energie) ? e.energie : null };
  };
  /** Eintrag «Nach dem Training» für die Liste «rpe» (wie rpe-1.0 mit den neuen Feldern). w = { rpe, gefuehl, erwartung, intervalle, notiz, magen, energie }. → Eintrag oder null */
  V81.eintrag = function (a, w, jetzt, s) {
    if (!a || !a.id || !a.date || !w) return null;
    if (!(Number.isInteger(w.rpe) && w.rpe >= 1 && w.rpe <= 10)) return null;
    const g = V81.GEFUEHL.map((x) => x[1]), mv = isNum(a.mv) ? a.mv : a.dur;
    const e = { id: a.id, act: a.id, datum: a.date, sport: a.sport, rpe: w.rpe, gefuehl: g.includes(w.gefuehl) ? w.gefuehl : null,
      erwartung: V81.ERWARTUNG.includes(w.erwartung) ? w.erwartung : null, intervalle: V81.INTERVALLE.includes(w.intervalle) ? w.intervalle : null,
      notiz: String(w.notiz || "").trim().slice(0, 500) || null, srpe: isNum(mv) ? Math.round((w.rpe * mv) / 60) : null, tl: isNum(a.tss) ? Math.round(a.tss) : null,
      quelle: "seite", v: V81.VERSIONS.nachher, erfasst: jetzt || new Date().toISOString() };
    if (V81.MAGEN.some((x) => x[0] === w.magen)) e.magen = w.magen;
    if (V81.ENERGIE.includes(w.energie)) e.energie = w.energie;
    if (s && isNum(s.rpe_g)) e.rpe_uhr = s.rpe_g;
    if (s && isNum(s.feel_g)) e.feel_uhr = s.feel_g;
    return e;
  };

  /* ---------------- hf-leistung-1.0 ---------------- */
  const system = (a) => (a.indoor ? "drinnen" : "draussen");
  const ebArt = (a) => (a && a.eb && isNum(a.eb.hr) ? `${a.eb.art}|${a.indoor ? "rolle" : a.typ || ""}` : null);
  /** Aktive Schritte eines Workouts auf der Uhr mit gleichmässiger Leistung (ab 4 min): { x (W, sonst m/s), hr, s }. */
  function schritte(a) {
    const S = a && a.wk && Array.isArray(a.wk.schritte) ? a.wk.schritte : [];
    return S.filter((s) => s && !["einlaufen", "auslaufen", "erholung", "pause", "warmup", "cooldown", "recovery", "rest"].includes(s.typ) && isNum(s.ist_s) && s.ist_s >= 240 && isNum(s.hr))
      .map((s) => ({ x: isNum(s.w) && s.w > 40 ? s.w : isNum(s.v) && s.v > 0.5 ? s.v : null, art: isNum(s.w) && s.w > 40 ? "w" : "v", hr: s.hr, s: s.ist_s }))
      .filter((s) => s.x != null);
  }
  /** Puls zur Leistung der Aktivität a gegen die Wochen davor. → { quelle, delta (bpm), streuung, n_ref, n, bezug, urteil, vorbehalte } oder { urteil: «zu wenig Daten», grund } */
  V81.pulsZurLeistung = function (acts, a, opt) {
    opt = Object.assign({ tage: 60, tageSchritte: 90, minRef: 4, toleranz: 0.05 }, opt || {});
    if (!a || !["rad", "lauf"].includes(a.sport)) return { urteil: "zu wenig Daten", grund: "nur Rad und Laufen" };
    const vorher = (x, tage) => x !== a && x.sport === a.sport && tagNr(a.date) - tagNr(x.date) >= 1 && tagNr(a.date) - tagNr(x.date) <= tage;
    const vorbehalte = [];
    if (a.eb && isNum(a.eb.t) && a.eb.t >= 25) vorbehalte.push(`warm (${Math.round(a.eb.t)} °C)`);
    if (a.eb && isNum(a.eb.alt) && a.eb.alt >= 1500) vorbehalte.push(`Höhe ${Math.round(a.eb.alt)} m`);
    let out = null;
    const art = ebArt(a);
    if (art) {
      const ref = (acts || []).filter((x) => vorher(x, opt.tage) && ebArt(x) === art).map((x) => x.eb.hr);
      if (ref.length >= opt.minRef) {
        const s = sd(ref);
        out = { quelle: "eb", delta: r1(a.eb.hr - mittel(ref)), streuung: s != null ? r1(s) : null, n_ref: ref.length, n: a.eb.n || 1,
          bezug: a.sport === "rad" ? `gleichmässige 10 min um ${Math.round(a.eb.w || 200)} W` : "gleichmässige 10 min im Grundlagentempo" };
      }
    }
    if (!out) {
      const S = schritte(a), D = [];
      if (S.length) {
        const R = (acts || []).filter((x) => vorher(x, opt.tageSchritte) && system(x) === system(a)).flatMap((x) => schritte(x));
        for (const s of S) {   // gleiche Leistung (±5 %) und ähnliche Dauer des Abschnitts (¾ bis 4⁄3), sonst wäre der Puls nicht vergleichbar
          const ref = R.filter((r) => r.art === s.art && Math.abs(r.x - s.x) <= opt.toleranz * s.x && r.s >= 0.75 * s.s && r.s <= (4 / 3) * s.s).map((r) => r.hr);
          if (ref.length >= 3) D.push({ d: s.hr - mittel(ref), n: ref.length, x: s.x, art: s.art, sd: sd(ref) });
        }
      }
      const SDs = D.map((x) => x.sd).filter(isNum);
      if (D.length) out = { quelle: "wk", delta: r1(median(D.map((x) => x.d))), streuung: SDs.length ? r1(median(SDs)) : null, n_ref: Math.min(...D.map((x) => x.n)), n: D.length,
        bezug: `${D.length} Abschnitt${D.length === 1 ? "" : "e"} des Workouts mit gleicher ${D[0].art === "w" ? "Leistung" : "Geschwindigkeit"} (±5 %)` };
    }
    if (!out) return { urteil: "zu wenig Daten", grund: "keine gleichmässigen Abschnitte mit genug Vergleichen aus den Wochen davor" };
    // Grenze: anderthalbmal die Streuung der Vergleiche, mindestens 6 bpm (eigene Festlegung; der Puls schwankt von Tag zu Tag auch ohne Ermüdung)
    const grenze = Math.max(6, out.streuung != null ? 1.5 * out.streuung : 6);
    out.urteil = out.delta >= grenze ? "höher" : out.delta <= -grenze ? "tiefer" : "wie üblich";
    out.grenze = r1(grenze);
    out.vorbehalte = vorbehalte;
    out.v = V81.VERSIONS.hf_leistung;
    return out;
  };

  /* ---------------- Zusammen: subjektiv und objektiv (nur Hinweis) ---------------- */
  /** Satz zur Einheit aus «Nach dem Training» (N = V81.nachher) und Puls zur Leistung (H). Eine Einheit ändert den Plan nie. → { art, text } oder null */
  V81.hinweis = function (N, H, opt) {
    opt = opt || {};
    const schwer = N && (N.erwartung === "schwerer" || (isNum(N.rpe) && opt.stufe === "locker" && N.rpe >= 7));
    const leicht = N && N.erwartung === "leichter";
    const hoch = H && H.urteil === "höher", tief = H && H.urteil === "tiefer";
    const p = H && isNum(H.delta) ? `${H.delta > 0 ? "+" : ""}${String(H.delta).replace(".", ",")} bpm` : "";
    const nur = " Eine Einheit allein ändert den Plan nicht; zeigt es sich wieder oder sagen Ampel und Check-in dasselbe, gilt es mehr.";
    if (hoch && schwer) return { art: "warn", text: `Puls bei gleicher Leistung höher als üblich (${p}) und schwerer als erwartet – Hinweis auf Ermüdung, Hitze oder eine beginnende Erkältung.${nur}` };
    if (hoch) return { art: "info", text: `Puls bei gleicher Leistung höher als üblich (${p}) – Hitze, wenig Trinken oder die Tagesform können mitspielen.${nur}` };
    if (schwer && H && H.urteil === "wie üblich") return { art: "info", text: `Schwerer als erwartet, der Puls bei gleicher Leistung aber wie üblich – oft Beine (Muskelkater) oder Kopf.${nur}` };
    if (schwer) return { art: "info", text: `Schwerer als erwartet.${nur}` };
    if (tief && leicht) return { art: "gut", text: `Puls bei gleicher Leistung tiefer als üblich (${p}) und leichter als erwartet – gut erholt. Der Plan wird deswegen nicht gesteigert.` };
    if (tief) return { art: "gut", text: `Puls bei gleicher Leistung tiefer als üblich (${p}).` };
    return null;
  };

  /* ---------------- last-abweichung-1.0 ---------------- */
  /** Geplante Einheit e (TL ≈ tlPlan) gegen die Aktivität a desselben Tags und derselben Sportart. → { plan, ist, faktor, urteil } oder null */
  V81.abweichung = function (tlPlan, a, opt) {
    opt = Object.assign({ mehr: 1.3, weniger: 0.7, min: 15 }, opt || {});
    if (!isNum(tlPlan) || tlPlan <= 0 || !a || !isNum(a.tss)) return null;
    const f = a.tss / tlPlan, diff = a.tss - tlPlan;
    const urteil = f >= opt.mehr && diff >= opt.min ? "mehr als geplant" : f <= opt.weniger && -diff >= opt.min ? "weniger als geplant" : "wie geplant";
    return { plan: Math.round(tlPlan), ist: Math.round(a.tss), faktor: Math.round(f * 100) / 100, urteil, v: V81.VERSIONS.abweichung };
  };

  /* ---------------- anstieg-1.0 ---------------- */
  /** Fitness und Ermüdung vom letzten Stand (pm = { fitness, ermuedung }) mit den Lasten der nächsten Tage fortgeschrieben (42/7 Tage, wie FK.pmc). */
  V81.projektion = function (pm, lasten) {
    let f = pm && isNum(pm.fitness) ? pm.fitness : 0, e = pm && isNum(pm.ermuedung) ? pm.ermuedung : 0;
    return (lasten || []).map((L) => { const x = isNum(L) ? L : 0; f += (x - f) / 42; e += (x - e) / 7; return { fitness: f, ermuedung: e, status: f >= 1 ? e / f : null }; });
  };
  /** Anstieg der Belastung. heute = FK.pmcMorgen(heute), vor28 = FK.pmcMorgen(heute − 28), plan = Lasten der nächsten 21 Tage (optional).
   *  → { lang: { proz, status }, kurz: { wert, stufe }, geplant: { proz, max, status } | null, urteil, text } */
  V81.anstieg = function (heute, vor28, plan) {
    if (!heute || !isNum(heute.fitness) || heute.fitness < 1) return null;
    const proz = vor28 && isNum(vor28.fitness) && vor28.fitness >= 1 ? Math.round(((heute.fitness - vor28.fitness) / vor28.fitness) * 100) : null;
    const lang = { proz, status: proz == null ? "unbekannt" : proz >= 5 ? "steigt" : proz <= -5 ? "sinkt" : "stabil" };
    const wert = isNum(heute.ermuedung) ? Math.round((heute.ermuedung / heute.fitness) * 100) / 100 : null;
    const kurz = { wert, stufe: wert == null ? null : wert < 0.8 ? "wenig" : wert <= 1.3 ? "üblich" : wert <= 1.5 ? "hoch" : "sehr hoch" };
    let geplant = null;
    if (Array.isArray(plan) && plan.length) {
      const P = V81.projektion(heute, plan), ende = P[P.length - 1], max = Math.max(...P.map((x) => (isNum(x.status) ? x.status : 0)));
      const pz = Math.round(((ende.fitness - heute.fitness) / heute.fitness) * 100);
      geplant = { proz: pz, max: Math.round(max * 100) / 100, status: max > 1.5 ? "zu schnell" : pz >= 5 ? "steigt" : pz <= -5 ? "sinkt" : "stabil", tage: plan.length };
    }
    const urteil = kurz.wert != null && kurz.wert > 1.5 ? "zu schnell" : lang.status;
    const t = [];
    const pz = (x) => (x > 0 ? `+${x} %` : x < 0 ? `−${Math.abs(x)} %` : "gleich");
    t.push(lang.status === "unbekannt" ? "Langfristig: noch zu wenig Verlauf." : `Langfristig ${lang.status === "steigt" ? "steigt" : lang.status === "sinkt" ? "sinkt" : "ist stabil"}: Fitness ${pz(proz)} gegen vor vier Wochen.`);
    if (kurz.wert != null) t.push(`Aktuell: Ermüdung ÷ Fitness ${String(kurz.wert).replace(".", ",")} – ${kurz.stufe}${kurz.wert > 1.5 ? ", die Belastung nimmt gerade zu schnell zu" : ""}.`);
    if (geplant) t.push(`Mein Plan, nächste ${Math.round(geplant.tage / 7)} Wochen: Fitness ${pz(geplant.proz)}${geplant.status === "zu schnell" ? `, Ermüdung ÷ Fitness bis ${String(geplant.max).replace(".", ",")} – das wäre zu schnell` : ""}.`);
    return { lang, kurz, geplant, urteil, text: t, v: V81.VERSIONS.anstieg };
  };

  V81._intern = { mittel, sd, median, addDays, tagNr };
  return V81;
});
