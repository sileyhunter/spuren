/* Ironman Notebook – Smart Training Routes V5.7: Rechenlogik ohne DOM (window.TR, in Node via require).
 *
 * Aus einer geplanten Einheit (Enduco-Workout über Garmin oder eigene Angaben) und einem Startort werden echte Routen
 * über den Routing-Dienst (BRouter, wie im Planer) gerechnet, mit der persönlichen Zeitprognose aus js/route.js
 * (Leistungsbilanz bzw. Minetti/Tobler mit Kalibrierung) bewertet, auf die geplante Dauer abgestimmt und als drei
 * Vorschläge ausgewählt: A Training, B Wetter, C ruhig/velofreundlich bzw. laufgeeignet.
 * Grundsätze: Die Plandauer bleibt massgebend (Abweichung wird gezeigt, nie stillschweigend geändert); fehlendes Wetter
 * bleibt unbekannt (nie Windstille/trocken); Intervalle werden nur als «geeignet» gezeigt, wenn der Abschnitt es ist.
 */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const TR = factory(node ? require("./route.js") : root.RT, node ? require("./formkurve.js") : root.FK);
  if (node) module.exports = TR; else root.TR = TR;
})(typeof self !== "undefined" ? self : this, function (RT, FK) {
  "use strict";
  const TR = {};
  TR.VERSIONS = { workout: "workout-1.0", vorschlag: "trainingsroute-1.0", dauer: "dauer-1.0", intervalle: "intervall-rt-1.0",
    wetter: "wetteroptimiert-1.0", ruhig: "ruhig-1.0", licht: "tageslicht-1.0", auswertung: "auswertung-rt-1.0" };
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const RAD = Math.PI / 180, R_E = 6371008.8;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const pct = (g) => `${g >= 0 ? "+" : "−"}${Math.abs(g * 100).toFixed(1)} %`;
  const mmss = (s) => { if (!isNum(s)) return "–"; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
  TR.mmss = mmss;

  /* ======================= Workout lesen (workout-1.0) =======================
   * Garmin-Workout (Enduco schreibt Watt, Tempo in m/s oder Puls direkt in die Schritte); Wiederholungen aufgefaltet.
   * Intensiv = Mitte des Zielbereichs ab Zone 3 des aktiven Zonenprofils (Watt/Puls ≥ Z3-Grenze, Pace ≤ Z3-Grenze);
   * ohne Zonenprofil relativ zum Grundwert (≥ +15 % Watt/Puls bzw. ≥ 8 % schneller). */
  TR.GARMIN_SPORT = { cycling: "rad", road_biking: "rad", gravel_cycling: "rad", mountain_biking: "rad", indoor_cycling: "rad", virtual_ride: "rad",
    running: "lauf", street_running: "lauf", trail_running: "lauf", treadmill_running: "lauf", track_running: "lauf",
    hiking: "wandern", walking: "wandern", swimming: "schwimm", lap_swimming: "schwimm", open_water_swimming: "schwimm" };
  TR.PLANER_SPORT = { rad: "rennrad", lauf: "laufen", wandern: "wandern" };
  TR.FAMILIE = { rennrad: "rad", gravel: "rad", mtb: "rad", laufen: "lauf", trail: "lauf", wandern: "wandern", skitour: "ski" };
  const TYP = { warmup: "warmup", cooldown: "cooldown", interval: "interval", active: "interval", main: "interval", rest: "rest", recovery: "rest", other: "interval" };
  TR.TYP_TEXT = { warmup: "Einfahren", cooldown: "Ausfahren", interval: "aktiv", rest: "locker" };
  const TYP_LAUF = { warmup: "Einlaufen", cooldown: "Auslaufen" };

  /** Grenzen aus dem aktiven Zonenprofil: Untergrenze Z3 je Skala (rad_w, rad_hf, lauf_pace, lauf_hf) und alle Zonen. */
  TR.zonen = function (zonen) {
    const akt = (zonen || []).find((z) => z.status === "aktiv") || null, out = { name: akt ? akt.name : null, z3: {}, skalen: {} };
    for (const sk of (akt && akt.skalen) || []) {
      const z3 = (sk.zonen || []).find((z) => z.z === "Z3");
      if (z3 && isNum(z3.von)) out.z3[sk.key] = z3.von;
      out.skalen[sk.key] = sk.zonen || [];
    }
    return out;
  };
  function zielAus(st, Z, sport) {
    const tt = String(st.target_type || "").toLowerCase(), lo = +st.target_value_low, hi = +st.target_value_high;
    const ok = isNum(lo) && isNum(hi) && (lo > 0 || hi > 0);
    if (/power/.test(tt) && ok) return { art: "watt", lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
    if (/(speed|pace)/.test(tt) && ok && lo > 0 && hi > 0) { const v1 = Math.min(lo, hi), v2 = Math.max(lo, hi); return { art: "pace", lo: 1000 / v2, hi: 1000 / v1, v: (v1 + v2) / 2 }; }
    if (/heart/.test(tt)) {
      if (ok && Math.max(lo, hi) > 30) return { art: "hf", lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
      const zn = +(st.zone_number || st.target_zone || (ok && Math.max(lo, hi) <= 5 ? Math.max(lo, hi) : NaN));
      const sk = Z && Z.skalen && Z.skalen[sport === "lauf" ? "lauf_hf" : "rad_hf"];
      const z = isNum(zn) && sk ? sk[Math.round(zn) - 1] : null;
      if (z) { const a = isNum(z.von) ? z.von : z.bis - 20, b = isNum(z.bis) ? z.bis : a + 10; return { art: "hf", lo: a, hi: b, zone: Math.round(zn) }; }
    }
    return null;
  }
  const mitteVon = (z) => (!z ? null : z.art === "pace" ? (isNum(z.v) ? 1000 / z.v : (z.lo + z.hi) / 2) : (z.lo + z.hi) / 2);
  /** Schritte (Garmin, vereinfachte Form der Verbindung) mit Wiederholungen auffalten. */
  TR.auffalten = function (steps, Z, sport) {
    const out = [], gruppen = [];
    const walk = (list, gi, rep) => {
      for (const st of list || []) {
        const t = String(st.type || "").toLowerCase();
        if (t === "repeat" || (Array.isArray(st.steps) && st.steps.length)) {
          const n = Math.max(1, Math.round(+st.repeat_count || +st.end_condition_value || 1));
          const g = { n, von: out.length, bis: null, schritte: (st.steps || []).length }, k = gruppen.length;
          gruppen.push(g);
          for (let r = 1; r <= n; r++) walk(st.steps, gi == null ? k : gi, gi == null ? r : rep);
          g.bis = out.length - 1;
          continue;
        }
        const ec = String(st.end_condition || "").toLowerCase(), val = +st.end_condition_value;
        const cad = /cadence/i.test(String(st.secondary_target_type || "")) ? { lo: +st.secondary_target_value_low, hi: +st.secondary_target_value_high }
          : /cadence/i.test(String(st.target_type || "")) ? { lo: +st.target_value_low, hi: +st.target_value_high } : null;
        out.push({ i: out.length, typ: TYP[t] || "interval", dauer_s: ec === "time" && val > 0 ? val : null, distanz_m: ec === "distance" && val > 0 ? val : null,
          offen: !(ec === "time" || ec === "distance"), ziel: zielAus(st, Z, sport), cad, gruppe: gi, wdh: rep });
      }
    };
    walk(steps, null, null);
    return { liste: out, gruppen };
  };
  const ART_TEXT = { grundlage: "Grundlage (gleichmässig)", sprint: "Grundlage mit kurzen Sprints", intervalle: "Intervalle (1–8 min)", schwelle: "lange Intervalle (ab 8 min)",
    berg: "Bergintervalle", trail: "Trail mit Anstiegen", wandern: "Wandern", locker: "locker" };
  TR.ART_TEXT = ART_TEXT;
  /** Workout normalisieren. p: Eintrag aus planned/workouts_neu ({date, title, sport, dur_s, steps}) oder TR.manuell(…).
   *  ctx: {zonen: TR.zonen(D.zonen)}. Ergebnis mit Modus (watt|pace|hf|null), Grundwert, Intensivwert, Art, Toleranz. */
  TR.workout = function (p, ctx) {
    ctx = ctx || {};
    const Z = ctx.zonen || { z3: {}, skalen: {} };
    const sport = p.sport_plan || TR.GARMIN_SPORT[p.sport] || p.sport || "rad";
    const raw = Array.isArray(p.steps) ? p.steps : p.segments && p.segments[0] ? p.segments[0].steps : [];
    const F = TR.auffalten(raw, Z, sport), L = F.liste, hinweise = [];
    // Modus = Zielart mit der grössten Dauer
    const dz = {};
    for (const s of L) if (s.ziel && isNum(s.dauer_s)) dz[s.ziel.art] = (dz[s.ziel.art] || 0) + s.dauer_s;
    const modus = Object.keys(dz).sort((a, b) => dz[b] - dz[a])[0] || (L.find((s) => s.ziel) || { ziel: {} }).ziel.art || null;
    // Watt: im Garmin-Workout stehen Watt; sind alle Leistungswerte ≤ 150, könnte es % FTP sein – dann nicht raten
    const pw = L.filter((s) => s.ziel && s.ziel.art === "watt");
    const wattUnklar = pw.length > 0 && pw.every((s) => s.ziel.hi <= 150);
    if (wattUnklar) hinweise.push("Leistungsziele ≤ 150: Watt oder % FTP? Nicht geraten – Intensität bitte mit dem Regler setzen.");
    for (const s of L) s.mitte = s.ziel && s.ziel.art === modus && !(wattUnklar && modus === "watt") ? mitteVon(s.ziel) : null;
    // Dauer der Distanzschritte nur als Schätzung (Flachtempo); offene Schritte (Runde drücken) haben keine Dauer
    for (const s of L) if (!isNum(s.dauer_s) && isNum(s.distanz_m)) {
      if (modus === "pace" && isNum(s.mitte)) s.dauer_est = s.distanz_m * s.mitte / 1000;
      else if (modus === "watt" && isNum(s.mitte)) s.dauer_est = s.distanz_m / FK.speedFromPower(s.mitte, { m: 85, cda: 0.3, crr: 0.004, grade: 0, rho: 1.18, wind: 0, eta: 0.976, vmax: 20 });
    }
    const zeit = (s) => (isNum(s.dauer_s) ? s.dauer_s : isNum(s.dauer_est) ? s.dauer_est : 0);
    const alleZeit = L.length > 0 && L.every((s) => isNum(s.dauer_s));
    const summe = sum(L, zeit);
    const planDauer = isNum(p.dur_s) && p.dur_s > 0 ? p.dur_s : isNum(p.estimated_duration_seconds) ? p.estimated_duration_seconds : null;
    const dauer_s = alleZeit ? summe : summe > 0 && !L.some((s) => s.offen) ? summe : planDauer;
    const dauer_quelle = alleZeit ? "Summe der Workout-Schritte" : summe > 0 && !L.some((s) => s.offen) ? "Workout-Schritte (Distanzschritte geschätzt)" : planDauer ? "Dauer laut Kalender" : null;
    if (L.some((s) => s.offen)) hinweise.push("Workout mit offenen Schritten (Runde drücken): Dauer dieser Schritte unbekannt.");
    // Intensität je Schritt
    const z3 = sport === "rad" ? (modus === "hf" ? Z.z3.rad_hf : Z.z3.rad_w) : sport === "lauf" ? (modus === "hf" ? Z.z3.lauf_hf : Z.z3.lauf_pace) : null;
    const gew = (list) => { const t = sum(list, zeit); return t > 0 ? sum(list, (s) => s.mitte * zeit(s)) / t : null; };
    const mitZiel = L.filter((s) => isNum(s.mitte));
    const kern = mitZiel.filter((s) => s.typ === "interval");
    const ref = gew(kern.length ? kern : mitZiel);
    for (const s of L) {
      if (!isNum(s.mitte)) { s.intensiv = false; continue; }
      if (isNum(z3)) s.intensiv = modus === "pace" ? s.mitte <= z3 : s.mitte >= z3;
      else s.intensiv = isNum(ref) && (modus === "pace" ? s.mitte <= ref / 1.08 : s.mitte >= ref * 1.15) && s.typ !== "warmup" && s.typ !== "cooldown";
    }
    const locker = mitZiel.filter((s) => !s.intensiv && s.typ === "interval"), work = L.filter((s) => s.intensiv);
    const haupt = gew(locker.length ? locker : mitZiel.filter((s) => !s.intensiv).length ? mitZiel.filter((s) => !s.intensiv) : mitZiel);
    const intens = work.length ? gew(work) : null;
    // Art der Einheit
    const text = `${p.title || p.name || ""} ${p.desc || p.description || ""}`;
    const tInt = sum(work, zeit), anteil = dauer_s ? tInt / dauer_s : 0;
    const dmed = (() => { const a = work.map(zeit).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : null; })();
    let art;
    if (sport === "wandern") art = "wandern";
    else if (sport === "lauf" && /trail/i.test(text)) art = "trail";
    else if (/\bberg|hügel|huegel|\bhill|kraftausdauer|\bka\b|steigung|anstieg/i.test(text) || work.some((s) => s.cad && isNum(s.cad.hi) && s.cad.hi > 0 && s.cad.hi <= 75)) art = "berg";
    else if (!work.length) art = "grundlage";
    else if (dmed <= 40) art = "sprint";
    else if (dmed >= 480) art = "schwelle";
    else art = "intervalle";
    const dauertraining = art === "grundlage" || art === "wandern" || art === "trail" || (art === "sprint" && anteil < 0.1);
    return {
      v: TR.VERSIONS.workout, id: p.id || (p.wid ? "w" + p.wid : null), wid: p.wid || p.workout_id || null, titel: p.title || p.name || "Training", datum: p.date || null,
      sport, quelle: p.quelle || (raw.length ? "Workout aus Garmin" : p.manuell ? "eigene Angaben" : "Kalender (ohne Schritte)"),
      beschreibung: p.desc || p.description || "", schritte: L, gruppen: F.gruppen, modus, wattUnklar, haupt, intens, dauer_s, dauer_quelle,
      art, art_text: ART_TEXT[art], intensiv_s: tInt, intensiv_anteil: anteil, dauertraining, tol: dauertraining ? 0.05 : 0.1,
      zonen: Z.name, hinweise,
    };
  };
  /** Eigene Angaben → gleiche Form wie ein Garmin-Workout. m: {sport, titel, dauer_min, modus, wert, ein_min, aus_min,
   *  intervalle: {n, min, wert, pause_min}} (Werte in W, s/km oder bpm). */
  TR.manuell = function (m, ctx) {
    const tt = m.modus === "watt" ? "power.zone" : m.modus === "pace" ? "speed.zone" : "heart.rate.zone";
    const zone = (w) => (m.modus === "pace" ? { target_type: tt, target_value_low: 1000 / (w + 5), target_value_high: 1000 / (w - 5) } : { target_type: tt, target_value_low: w - 5, target_value_high: w + 5 });
    const steps = [], ein = (+m.ein_min || 0) * 60, aus = (+m.aus_min || 0) * 60, I = m.intervalle && +m.intervalle.n > 0 && +m.intervalle.min > 0 ? m.intervalle : null;
    if (ein > 0) steps.push(Object.assign({ type: "warmup", end_condition: "time", end_condition_value: ein }, zone(m.wert)));
    let rest = (+m.dauer_min || 0) * 60 - ein - aus;
    if (I) {
      const p = (+I.pause_min || 0) * 60, blk = I.n * (I.min * 60 + p), frei = Math.max(0, rest - blk), davor = Math.round(frei / 2), danach = frei - davor;
      if (davor > 0) steps.push(Object.assign({ type: "interval", end_condition: "time", end_condition_value: davor }, zone(m.wert)));
      const kids = [Object.assign({ type: "interval", end_condition: "time", end_condition_value: I.min * 60 }, zone(+I.wert))];
      if (p > 0) kids.push(Object.assign({ type: "rest", end_condition: "time", end_condition_value: p }, zone(m.wert)));
      steps.push({ type: "repeat", end_condition: "iterations", end_condition_value: I.n, repeat_count: I.n, steps: kids });
      if (danach > 0) steps.push(Object.assign({ type: "interval", end_condition: "time", end_condition_value: danach }, zone(m.wert)));
    } else if (rest > 0) steps.push(Object.assign({ type: "interval", end_condition: "time", end_condition_value: rest }, zone(m.wert)));
    if (aus > 0) steps.push(Object.assign({ type: "cooldown", end_condition: "time", end_condition_value: aus }, zone(m.wert)));
    return TR.workout({ title: m.titel || "Eigene Einheit", sport_plan: m.sport || "rad", date: m.datum || null, steps, manuell: true, quelle: "eigene Angaben" }, ctx);
  };
  /** Ablauf als kurzer Text, Wiederholungen zusammengefasst («4 × (6:00 @ 315–360 W / 6:00 @ 71–200 W)»). */
  TR.strukturText = function (wo) {
    const fmtZ = (s) => { const z = s.ziel; if (!z) return "frei"; if (z.art === "watt") return `${Math.round(z.lo)}–${Math.round(z.hi)} W`; if (z.art === "hf") return `${Math.round(z.lo)}–${Math.round(z.hi)} bpm`; return `${FK.pace(z.lo)}–${FK.pace(z.hi)} /km`; };
    const dauer = (s) => (isNum(s.dauer_s) ? mmss(s.dauer_s) : isNum(s.distanz_m) ? `${(s.distanz_m / 1000).toFixed(1)} km` : "offen");
    const one = (s) => (s.typ === "warmup" || s.typ === "cooldown" ? `${dauer(s)} ${(wo.sport === "lauf" ? TYP_LAUF : TR.TYP_TEXT)[s.typ]} (${fmtZ(s)})` : `${dauer(s)} @ ${fmtZ(s)}`);
    const out = [];
    for (let i = 0; i < wo.schritte.length;) {
      const s = wo.schritte[i];
      if (s.gruppe != null && s.wdh === 1) {
        const g = wo.gruppen[s.gruppe], per = Math.round((g.bis - g.von + 1) / g.n);
        out.push(`${g.n} × (${wo.schritte.slice(g.von, g.von + per).map(one).join(" / ")})`);
        i = g.bis + 1; continue;
      }
      out.push(one(s)); i++;
    }
    return out.join(" · ");
  };

  /* ======================= Zeitplan des Workouts ======================= */
  /** Zielwert je Bewegungszeit. ov: {haupt, intens} aus den Reglern; alle lockeren Schritte werden im Verhältnis haupt/Plan,
   *  die intensiven im Verhältnis intens/Plan verschoben (Pace: Verhältnis der Pace). Nach dem Planende gilt der letzte Wert. */
  TR.zeitplan = function (wo, ov) {
    ov = ov || {};
    const base = isNum(ov.haupt) ? ov.haupt : wo.haupt;
    const fB = isNum(ov.haupt) && isNum(wo.haupt) && wo.haupt > 0 ? ov.haupt / wo.haupt : 1;
    const fI = isNum(ov.intens) && isNum(wo.intens) && wo.intens > 0 ? ov.intens / wo.intens : fB;
    const ab = [];
    let t = 0;
    for (const s of wo.schritte) {
      const d = isNum(s.dauer_s) ? s.dauer_s : isNum(s.dauer_est) ? s.dauer_est : 0;
      const w = isNum(s.mitte) ? s.mitte * (s.intensiv ? fI : fB) : base;
      ab.push({ i: s.i, t0: t, t1: t + d, wert: w, typ: s.typ, intensiv: !!s.intensiv, gruppe: s.gruppe, wdh: s.wdh });
      t += d;
    }
    const last = ab.length ? ab[ab.length - 1].wert : base;
    const fn = function (tt) {
      if (!ab.length) return base;
      if (tt >= t) return last;
      let lo = 0, hi = ab.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (ab[m].t1 <= tt) lo = m + 1; else hi = m; }
      return isNum(ab[lo].wert) ? ab[lo].wert : base;
    };
    return { fn, abschnitte: ab, T: t, modus: wo.modus, haupt: base };
  };

  /* ======================= Geometrie der Vorschläge (trainingsroute-1.0) ======================= */
  TR.ziel = function (lon, lat, brg, dist) {
    const d = dist / R_E, b = brg * RAD, p1 = lat * RAD, l1 = lon * RAD;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [+((((l2 / RAD) + 540) % 360) - 180).toFixed(6), +(p2 / RAD).toFixed(6)];
  };
  /** Luftlinien-Länge × Umwegfaktor (Annahme für die erste Runde; danach nach der echten Fahrzeit nachgeregelt). */
  TR.FORM = { rund: { faktor: 4 * Math.SQRT2 * 1.3, text: "Rundtour" }, hin: { faktor: 2 * 1.25, text: "Hin und zurück" }, ziel: { faktor: 1, text: "Zum Ziel" } };
  /** Punkte einer Kandidatenroute. Rundtour: Kreis durch den Start (Mittelpunkt in Richtung brg, Radius r), Zwischenziele
   *  bei 90°, 180° und 270° im Uhrzeigersinn; Hin und zurück: Wendepunkt in Richtung brg im Abstand r. */
  TR.punkte = function (form, start, brg, r) {
    if (form === "hin") return [start.slice(), TR.ziel(start[0], start[1], brg, r), start.slice()];
    const c = TR.ziel(start[0], start[1], brg, r), back = (brg + 180) % 360;
    return [start.slice(), ...[90, 180, 270].map((a) => TR.ziel(c[0], c[1], (back + a) % 360, r)), start.slice()];
  };
  /** Gerade, flache Asphaltstrecke (nur für die erste Distanzschätzung aus der Zeitprognose). */
  TR.flachRoute = function (sport, L) {
    const n = Math.ceil(L / 100), coords = [], k = 100 / (111320 * Math.cos(46.85 * RAD));
    for (let i = 0; i <= n; i++) coords.push([9.5 + i * k, 46.85, 500]);
    const fuss = TR.FAMILIE[sport] !== "rad";
    const leg = { coords, edges: [{ i0: 0, i1: n, tags: { highway: fuss ? "footway" : "tertiary", surface: "asphalt" }, nodeTags: {} }], props: { creator: "flache Vergleichsstrecke" } };
    return RT.buildRoute([leg], [coords[0], coords[n]], { sport, id: "flach" });
  };
  /** Distanz, die in der Zeit T auf flacher Strecke erreicht wird (persönliches Modell, Workout-Verlauf eingerechnet). */
  TR.flachDistanz = function (sport, inp, T) {
    const fam = TR.FAMILIE[sport], L = fam === "rad" ? 220000 : fam === "lauf" ? 70000 : 40000;
    const r = TR.flachRoute(sport, L), s = RT.simulate(r, Object.assign({}, inp, { wetter: null }));
    if (s.unzureichend) return null;
    const P = r.profile;
    for (let k = 1; k <= P.n; k++) if (s.t[k] >= T) { const f = (T - s.t[k - 1]) / ((s.t[k] - s.t[k - 1]) || 1); return P.d[k - 1] + f * (P.d[k] - P.d[k - 1]); }
    return L;
  };
  TR.HUEGEL = { rad: 0.82, lauf: 0.9, wandern: 0.75 };   // Annahme für die erste Runde (Höhenmeter unbekannt)

  /* ======================= Kennzahlen einer Route ======================= */
  /** Unterbrechungen laut OSM-Knoten der Routing-Antwort (Ampel, Stopp, Bahnübergang, Schranke …) mit Gewicht je Sportart. */
  TR.UNTERBRECHUNG = [
    [(n) => n.highway === "traffic_signals" || n.crossing === "traffic_signals", 1, 1, "Ampel"],
    [(n) => n.highway === "stop", 1, 0.5, "Stopp"],
    [(n) => n.railway === "level_crossing" || n.railway === "crossing", 0.5, 0.5, "Bahnübergang"],
    [(n) => /^(cycle_barrier|gate|lift_gate|stile|swing_gate|kissing_gate|turnstile)$/.test(n.barrier || ""), 1, 0.5, "Schranke/Gatter"],
    [(n) => n.highway === "give_way", 0.5, 0.3, "Vortritt"],
    [(n) => n.highway === "mini_roundabout", 0.5, 0.3, "Kreisel"],
    [(n) => /^(bollard|block)$/.test(n.barrier || ""), 0.3, 0, "Poller"],
    [(n) => n.highway === "crossing", 0.1, 0.5, "Übergang"],
  ];
  TR.unterbrechungen = function (route, fam) {
    const out = [];
    for (const s of route.segs || []) {
      const n = s.nodeTags || {};
      for (const [f, wr, wf, txt] of TR.UNTERBRECHUNG) if (f(n)) { const w = fam === "rad" ? wr : wf; if (w > 0) out.push({ d: s.d1, w, art: txt }); break; }
    }
    let inR = false;
    for (const s of route.segs || []) { const r = s.tags.junction === "roundabout" || s.tags.junction === "circular"; if (r && !inR) out.push({ d: s.d0, w: fam === "rad" ? 0.7 : 0.3, art: "Kreisel" }); inR = r; }
    out.sort((a, b) => a.d - b.d);
    const dd = [];
    for (const u of out) { const l = dd[dd.length - 1]; if (l && u.d - l.d < 15) { if (u.w > l.w) dd[dd.length - 1] = u; } else dd.push(u); }
    return dd;
  };
  /** Anteil der Route auf Wegen, die zweimal befahren werden (Stichstrassen, Hin und zurück): je 25 m, Abstand < 20 m. */
  TR.doppelt = function (route) {
    const step = 25, pts = [];
    for (let dd = 0; dd <= route.L; dd += step) { const a = RT.at(route, dd); pts.push({ d: dd, x: a.lon, y: a.lat }); }
    const cell = 0.0004, grid = new Map(), key = (x, y) => Math.floor(x / cell) + ":" + Math.floor(y / cell);
    pts.forEach((p, i) => { const k = key(p.x, p.y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    let m = 0;
    for (const p of pts) {
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      let hit = false;
      for (let a = -1; a <= 1 && !hit; a++) for (let b = -1; b <= 1 && !hit; b++) for (const j of grid.get(cx + a + ":" + (cy + b)) || []) {
        const q = pts[j];
        if (Math.abs(q.d - p.d) >= 250 && RT.hav(p.x, p.y, q.x, q.y) < 20) { hit = true; break; }
      }
      if (hit) m += step;
    }
    return { m: Math.min(route.L, m), anteil: route.L ? Math.min(1, m / route.L) : 0 };
  };
  /** Eignung eines Abschnitts für einen Workout-Schritt (intervall-rt-1.0): gut, bedingt oder ungeeignet – mit Gründen.
   *  opt: {fam (rad|lauf|wandern), typ (konstant|berg|sprint|tempo|frei), rennrad, dauer_s, unterbr}. */
  TR.abschnitt = function (route, d0, d1, opt) {
    opt = opt || {};
    const P = route.profile, len = Math.max(1, d1 - d0);
    const e0 = RT.at(route, d0).ele, e1 = RT.at(route, d1).ele, mittel = (e1 - e0) / len;
    const k0 = clamp(Math.floor(d0 / P.step), 0, P.n), k1 = clamp(Math.ceil(d1 / P.step), 0, P.n), w = Math.max(1, Math.round(200 / P.step));
    let gmin = Infinity, gmax = -Infinity;
    for (let k = k0; k + w <= k1; k++) { const g = (P.ele[k + w] - P.ele[k]) / ((P.d[k + w] - P.d[k]) || 1); if (g < gmin) gmin = g; if (g > gmax) gmax = g; }
    if (!isFinite(gmin)) { gmin = mittel; gmax = mittel; }
    // Höhendaten unplausibel (z. B. Lücke im Höhenmodell): Steigung nicht beurteilen statt eine Abfahrt oder Rampe zu erfinden
    const grenze = opt.fam === "rad" ? 0.3 : 0.6, hoeheUnklar = gmax > grenze || gmin < -grenze;
    const U = (opt.unterbr || []).filter((u) => u.d >= d0 - 10 && u.d <= d1 + 10), uw = sum(U, (u) => u.w);
    let haupt = 0, gravel = 0, unbek = 0, verboten = 0, pfad = 0, treppe = 0;
    for (const s of route.segs || []) {
      const a = Math.max(d0, s.d0), b = Math.min(d1, s.d1); if (b <= a) continue;
      const l = b - a;
      if (s.way === "hauptstrasse") haupt += l;
      if (RT.gravelArt(s)) gravel += l;
      if (s.surface === "unbekannt") unbek += l;
      if (s.access === "verboten" || s.access === "schieben") verboten += l;
      if (s.way === "pfad") pfad += l;
      if (s.tags && s.tags.highway === "steps") treppe += l;
    }
    const gr = [];
    let note = 2;
    const schlecht = (t) => { gr.push(t); note = 0; }, bedingt = (t) => { gr.push(t); note = Math.min(note, 1); };
    const min = (opt.dauer_s || 0) / 60, pro10 = min > 0 ? uw / Math.max(1, min / 10) : uw;
    const uText = () => { const c = {}; for (const u of U) c[u.art] = (c[u.art] || 0) + 1; return Object.entries(c).map(([k, v]) => `${v}× ${k}`).join(", "); };
    if (verboten > 20) schlecht(`${Math.round(verboten)} m nicht erlaubt bzw. schieben`);
    if (hoeheUnklar) bedingt(`Höhendaten unplausibel (${pct(gmin)} / ${pct(gmax)} über 200 m): Steigung nicht beurteilt`);
    if (opt.fam === "rad") {
      if (opt.rennrad && gravel > 20) schlecht(`${Math.round(gravel)} m Gravel`);
      if (hoeheUnklar) { /* Steigungsregeln ausgesetzt */ }
      else if (opt.typ === "berg") { if (mittel < 0.04) schlecht(`kein Anstieg (Ø ${pct(mittel)})`); else if (gmin < 0.01) bedingt(`Steigung nicht durchgehend (flachstes Stück ${pct(gmin)})`); }
      else if (opt.typ === "sprint") { if (gmin < -0.03) schlecht(`Gefälle ${pct(gmin)}`); }
      else {
        if (gmin < -0.04) schlecht(`Abfahrt ${pct(gmin)}: Leistung nicht haltbar`);
        else if (mittel < -0.015) bedingt(`leicht abfallend (Ø ${pct(mittel)})`);
        if (gmax > 0.1) bedingt(`Rampe ${pct(gmax)}`);
      }
      if (opt.typ === "sprint") { if (uw >= 1) bedingt(uText()); }
      else if (pro10 >= 3) schlecht(`Unterbrechungen: ${uText()}`);
      else if (pro10 > 1) bedingt(`Unterbrechungen: ${uText()}`);
      if (haupt > len * 0.5) bedingt("überwiegend Hauptstrasse (Verkehr)");
      if (unbek > len * 0.3) bedingt(`Belag zu ${Math.round((100 * unbek) / len)} % unbekannt`);
    } else {
      if (hoeheUnklar) { /* Steigungsregeln ausgesetzt */ }
      else if (opt.typ === "berg") { if (mittel < 0.05) schlecht(`kein Anstieg (Ø ${pct(mittel)})`); }
      if (!hoeheUnklar && opt.typ !== "berg" && opt.typ !== "frei") {
        if (Math.abs(mittel) > 0.03) bedingt(`nicht flach (Ø ${pct(mittel)})`);
        if (gmax > 0.08 || gmin < -0.08) bedingt(`steile Stücke (${pct(gmax)} / ${pct(gmin)})`);
      }
      if (opt.typ !== "berg" && opt.typ !== "frei") {
        if (treppe > 0) schlecht("Treppen");
        if (pfad > len * 0.5) bedingt("überwiegend Pfad (unebener Untergrund)");
      }
      if (pro10 >= 3) schlecht(`Unterbrechungen: ${uText()}`);
      else if (pro10 > 1) bedingt(`Unterbrechungen: ${uText()}`);
    }
    return { note: ["ungeeignet", "bedingt", "gut"][note], wert: note / 2, gruende: gr, kennz: { len, mittel, gmin, gmax, unterbr: U.length, haupt_pct: (100 * haupt) / len } };
  };
  /** Zeit → Distanz entlang der Simulation (Bewegungszeit). null, wenn die Route vorher endet. */
  TR.dBei = function (route, sim, tt) {
    const P = route.profile, t = sim.t;
    if (tt <= 0) return 0;
    if (tt > t[P.n]) return null;
    let lo = 0, hi = P.n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m] <= tt) lo = m; else hi = m; }
    const f = (tt - t[lo]) / ((t[hi] - t[lo]) || 1);
    return P.d[lo] + f * (P.d[hi] - P.d[lo]);
  };
  TR.intervallTyp = (wo, fam) => (wo.art === "berg" ? "berg" : wo.art === "sprint" ? "sprint" : fam === "rad" ? "konstant" : fam === "lauf" ? "tempo" : "frei");
  /** Intensive Schritte auf die Route legen (nach der persönlichen Zeitprognose) und je Abschnitt beurteilen. */
  TR.intervalle = function (route, sim, plan, opt, shift) {
    const out = [];
    let nr = 0;
    for (const a of plan.abschnitte) {
      if (!a.intensiv) continue;
      nr++;
      const t0 = a.t0 + (shift || 0), t1 = a.t1 + (shift || 0);
      const d0 = TR.dBei(route, sim, t0), d1 = TR.dBei(route, sim, t1);
      if (d0 == null || d1 == null) { out.push({ nr, i: a.i, t0, t1, d0, d1, wert: a.wert, note: "ungeeignet", wertung: 0, gruende: ["Route endet vor dem Intervall"] }); continue; }
      const e = TR.abschnitt(route, d0, Math.max(d1, d0 + 20), Object.assign({}, opt, { dauer_s: t1 - t0 }));
      out.push({ nr, i: a.i, t0, t1, d0, d1, wert: a.wert, gruppe: a.gruppe, wdh: a.wdh, note: e.note, wertung: e.wert, gruende: e.gruende, kennz: e.kennz });
    }
    return out;
  };
  /** Hilft eine Verschiebung des Hauptteils (Einfahren −5 … +10 min)? Nur als Hinweis, der Plan bleibt unverändert. */
  TR.verschiebung = function (route, sim, plan, opt) {
    const base = TR.intervalle(route, sim, plan, opt, 0), w0 = base.length ? sum(base, (x) => x.wertung) / base.length : 1;
    if (!base.length || w0 >= 1) return null;
    let best = null;
    for (let m = -5; m <= 10; m++) {
      if (!m) continue;
      const I = TR.intervalle(route, sim, plan, opt, m * 60), w = sum(I, (x) => x.wertung) / I.length;
      if (w > w0 + 0.19 && (!best || w > best.w + 1e-9 || (Math.abs(w - best.w) < 1e-9 && Math.abs(m) < Math.abs(best.min)))) best = { min: m, w, alle_gut: I.every((x) => x.note === "gut") };
    }
    return best;
  };
  /** Wetter entlang der Route zur Durchfahrtszeit (wetteroptimiert-1.0). Unbekannte Werte bleiben unbekannt. */
  TR.wetter = function (route, sim, field, start_unix, pausen) {
    if (!field) return { status: "keine" };
    const P = route.profile, n = P.n, T = sim.t[n], half = T / 2;
    let known = 0, a1 = 0, n1 = 0, a2 = 0, n2 = 0, boe7 = 0, boe10 = 0, rmm = 0, rm = 0, tmin = Infinity, tmax = -Infinity, pop = null, wmax = null, aAll = 0, gegen = 0;
    for (let k = 0; k < n; k++) {
      const tt = sim.t[k], ds = P.d[k + 1] - P.d[k], dt = sim.t[k + 1] - tt;
      const w = field((P.d[k] + P.d[k + 1]) / 2, start_unix + tt + TR.pauseVor(pausen, tt), P.head[k]);
      if (!w) continue;
      if (isNum(w.along)) { known += ds; aAll += w.along * ds; if (w.along < -0.5) gegen += ds; if (tt < half) { a1 += w.along * ds; n1 += ds; } else { a2 += w.along * ds; n2 += ds; } }
      if (isNum(w.gust) && isNum(w.dirFrom)) { const gc = w.gust * Math.abs(Math.sin((w.dirFrom + 180 - P.head[k]) * RAD)); if (gc > 10) boe10 += ds; else if (gc > 7) boe7 += ds; }
      if (isNum(w.regen)) { rmm += (w.regen * dt) / 3600; if (w.regen >= 0.5) rm += ds; }
      if (isNum(w.temp)) { tmin = Math.min(tmin, w.temp); tmax = Math.max(tmax, w.temp); }
      if (isNum(w.pop)) pop = Math.max(pop || 0, w.pop);
      if (isNum(w.speed)) wmax = Math.max(wmax || 0, w.speed);
    }
    const L = route.L || 1;
    return { status: known >= L * 0.7 ? "ok" : known > 0 ? "teilweise" : "unbekannt", bekannt_pct: (100 * known) / L,
      mittel_ms: known ? aAll / known : null, hin_ms: n1 ? a1 / n1 : null, rueck_ms: n2 ? a2 / n2 : null, gegen_pct: known ? (100 * gegen) / known : null,
      boe7_m: boe7, boe10_m: boe10, regen_mm: rmm, regen_m: rm, temp_min: isFinite(tmin) ? tmin : null, temp_max: isFinite(tmax) ? tmax : null, pop_max: pop, wind_max_ms: wmax };
  };
  /** Trainingspausen [{nach_s (Bewegungszeit), dauer_s}] → Pausensekunden vor der Bewegungszeit tt. */
  TR.pauseVor = (pausen, tt) => sum((pausen || []).filter((p) => isNum(p.nach_s) && p.nach_s <= tt), (p) => p.dauer_s || 0);
  TR.pausenListe = function (n, min, T) {   // gleichmässig verteilt (bei 1 Pause: Mitte)
    const out = []; n = Math.max(0, Math.round(n || 0));
    for (let i = 1; i <= n; i++) out.push({ nach_s: (T * i) / (n + 1), dauer_s: (min || 0) * 60 });
    return out.filter((p) => p.dauer_s > 0);
  };

  /* ======================= Tageslicht (tageslicht-1.0) =======================
   * NOAA-Näherung (Genauigkeit etwa ±2 min): Sonnenauf-/-untergang (Zenit 90,833°) und bürgerliche Dämmerung (96°). */
  TR.sonne = function (lat, lon, dateISO) {
    const y = +dateISO.slice(0, 4), d0 = Date.UTC(y, +dateISO.slice(5, 7) - 1, +dateISO.slice(8, 10)) / 1000;
    const doy = Math.round((d0 - Date.UTC(y, 0, 1) / 1000) / 86400) + 1, nd = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    const g = (2 * Math.PI / nd) * (doy - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = (zen) => { const c = Math.cos(zen * RAD) / (Math.cos(lat * RAD) * Math.cos(dec)) - Math.tan(lat * RAD) * Math.tan(dec); return c > 1 ? "nacht" : c < -1 ? "tag" : Math.acos(c) / RAD; };
    const at = (m) => Math.round(d0 + m * 60);
    const r = {};
    for (const [k, zen] of [["sonne", 90.833], ["hell", 96]]) {
      const h = ha(zen);
      r[k + "_auf"] = typeof h === "number" ? at(720 - 4 * (lon + h) - eq) : null;
      r[k + "_unter"] = typeof h === "number" ? at(720 - 4 * (lon - h) - eq) : null;
      if (typeof h !== "number") r[k + "_fall"] = h;
    }
    return r;
  };
  TR.licht = function (S, t0, t1) {
    if (!S || !isNum(S.sonne_unter)) return { status: "unbekannt", text: "Tageslicht nicht bestimmbar." };
    const vor = isNum(S.hell_auf) && t0 < S.hell_auf, nach = isNum(S.hell_unter) && t1 > S.hell_unter;
    const daemmer = (isNum(S.sonne_auf) && t0 < S.sonne_auf) || t1 > S.sonne_unter;
    return { status: vor || nach ? "dunkel" : daemmer ? "daemmerung" : "hell", vor, nach, daemmer, sonne_auf: S.sonne_auf, sonne_unter: S.sonne_unter, hell_auf: S.hell_auf, hell_unter: S.hell_unter };
  };

  /* ======================= Bewertung und Auswahl ======================= */
  const WEG_KEYS = ["hauptstrasse", "strasse", "nebenstrasse", "radweg", "fahrweg", "pfad", "fussweg", "faehre", "autobahn", "unbekannt"];
  /** Alle Kennzahlen eines Kandidaten. ctx: {wo, plan, inp, start_unix, pausen, sport, routenart, field (Funktion route → Wetterfeld)}. */
  TR.kennzahlen = function (route, ctx, field) {
    const fam = TR.FAMILIE[ctx.sport] || "rad", rennrad = ctx.sport === "rennrad";
    const inp = Object.assign({}, ctx.inp, { start_unix: ctx.start_unix, pausen: [] });
    let sim = field ? RT.etaWithWeather(route, inp, field) : RT.eta(route, inp);
    if (sim.unzureichend) return { unzureichend: true, grund: sim.grund };
    // Trainingspausen (nach Bewegungszeit) als Pausen an der Stelle der Route für Uhrzeit und Wetter
    const pz = (ctx.pausen || []).map((p) => ({ d: TR.dBei(route, sim, p.nach_s), s: p.dauer_s })).filter((p) => isNum(p.d));
    if (field && pz.length) sim = RT.etaWithWeather(route, Object.assign({}, inp, { pausen: pz }), field);
    const T = sim.moving_s, plan_s = ctx.wo.dauer_s, abw = plan_s ? (T - plan_s) / plan_s : 0;
    const P = route.profile, L = route.L || 1;
    let flach = 0, ab = 0;
    for (let k = 0; k < P.n; k++) { const ds = P.d[k + 1] - P.d[k]; if (Math.abs(P.grade[k]) <= 0.03) flach += ds; if (P.grade[k] < -0.04) ab += ds; }
    const U = TR.unterbrechungen(route, fam), sh = RT.wayShare(route), G = RT.gravelAbschnitte(route), dop = TR.doppelt(route);
    const belag = {};
    for (const s of route.segs) belag[s.surface] = (belag[s.surface] || 0) + (s.d1 - s.d0);
    const wege_pct = {};
    for (const k of WEG_KEYS) wege_pct[k] = (100 * ((sh.m || {})[k] || 0)) / L;
    const zugang = sum(route.segs.filter((s) => s.access === "verboten" || s.access === "schieben"), (s) => s.d1 - s.d0);
    const C = RT.climbs(route), maxA = C.up.slice().sort((a, b) => b.hm - a.hm)[0] || null;
    const opt = { fam, typ: TR.intervallTyp(ctx.wo, fam), rennrad, unterbr: U };
    const I = TR.intervalle(route, sim, ctx.plan, opt, 0);
    const pausen_s = sum(ctx.pausen || [], (p) => p.dauer_s || 0);
    const ende = ctx.start_unix + T + pausen_s;
    const S = TR.sonne(route.lat[0], route.lon[0], new Date(ctx.start_unix * 1000).toISOString().slice(0, 10));
    return {
      sim, T, band: sim.band || [T, T], abw, plan_s, L: route.L, up: P.up, down: P.down, max_anstieg: maxA, anstiege_n: C.up.length,
      flach_anteil: flach / L, abfahrt_anteil: ab / L, unterbr: U, unterbr_10km: (10000 * sum(U, (u) => u.w)) / L,
      wege_pct, haupt_pct: sh.haupt_pct, radweg_pct: sh.radweg_pct, verkehr_pct: sh.verkehr_pct, belag, unbekannt_anteil: (belag.unbekannt || 0) / L,
      gravel_m: G.gravel_m, gravel: G, zugang_m: zugang, doppelt_anteil: dop.anteil, intervalle: I, int_wert: I.length ? sum(I, (x) => x.wertung) / I.length : 1,
      hm_pro_h: T > 0 ? P.up / (T / 3600) : 0, wetter: TR.wetter(route, sim, field, ctx.start_unix, ctx.pausen), ende, pausen_s,
      licht: TR.licht(S, ctx.start_unix, ende), tempo_kmh: (route.L / T) * 3.6, pace_s: (T / route.L) * 1000, pausen_pz: pz,
    };
  };
  const dauerStrafe = (K, ctx, f) => -Math.min(45, Math.max(0, Math.abs(K.abw) - ctx.wo.tol) * 100 * f);
  /** A Training: Dauer im Ziel, geeignete Intervallabschnitte, gleichmässiges Gelände bzw. Anstiege, wenig Unterbrechungen. */
  TR.punkteA = function (K, ctx) {
    const fam = TR.FAMILIE[ctx.sport], wo = ctx.wo, t = [];
    t.push(["Dauer", dauerStrafe(K, ctx, wo.dauertraining ? 3 : 1.5)]);
    if (K.intervalle.length) t.push(["Intervallabschnitte", -40 * (1 - K.int_wert)]);
    if (wo.art === "berg") t.push(["Anstiege", K.max_anstieg && K.max_anstieg.len >= 1500 ? 0 : -20]);
    else if (wo.art === "trail") t.push(["Höhenmeter", -Math.min(20, Math.abs(K.hm_pro_h - (ctx.hm_ziel || 300)) / 25)], ["Anstiege", K.anstiege_n >= 2 ? 0 : -10]);
    else if (fam === "rad") t.push(["Gleichmässigkeit", -15 * (1 - K.flach_anteil) - 10 * K.abfahrt_anteil]);
    else if (fam === "lauf") t.push(["Gleichmässigkeit", -15 * (1 - K.flach_anteil)]);
    t.push(["Unterbrechungen", -Math.min(20, K.unterbr_10km * 2)]);
    if (ctx.sport === "rennrad") t.push(["Gravel", -Math.min(40, K.gravel_m / 100)]);
    t.push(["Zugang", -Math.min(40, K.zugang_m / 50)]);
    if (ctx.routenart === "rund") t.push(["Doppelte Wege", -20 * K.doppelt_anteil]);
    t.push(["Belag unbekannt", -10 * K.unbekannt_anteil]);
    return { wert: 100 + sum(t, (x) => x[1]), teile: t };
  };
  /** B Wetter: Seitenböen, Regen, Gegenwind auf dem Rückweg vermeiden; nur mit bekanntem Wetter (≥ 70 % der Strecke). */
  TR.punkteB = function (K, ctx, A) {
    const W = K.wetter;
    if (!W || W.status !== "ok") return null;
    const t = [["Seitenböen", -(3 * W.boe10_m + 0.5 * W.boe7_m) / 1000], ["Regen", -Math.min(40, 8 * W.regen_mm + (0.5 * W.regen_m) / 1000)]];
    // Runde: zuerst Gegenwind (frisch), zurück mit Rückenwind = Bonus; umgekehrt = Abzug (wetteroptimiert-1.0)
    if (ctx.routenart !== "ziel" && isNum(W.hin_ms) && isNum(W.rueck_ms)) { const d = W.rueck_ms - W.hin_ms; t.push(["Wind Rückweg", d >= 0 ? Math.min(6, d) * 2 : d * 4]); }
    if (isNum(W.mittel_ms)) t.push(["Gegenwind", -Math.max(0, -W.mittel_ms) * 2]);
    t.push(["Dauer", dauerStrafe(K, ctx, 1.5)]);
    if (A) t.push(["Training", -0.3 * Math.max(0, 100 - A.wert)]);
    return { wert: 100 + sum(t, (x) => x[1]), teile: t };
  };
  /** C ruhig/velofreundlich bzw. laufgeeignet (ruhig-1.0): Gewichtung je Sportart. */
  TR.punkteC = function (K, ctx) {
    const w = K.wege_pct, t = [];
    if (ctx.sport === "rennrad") t.push(["Verkehr", -(0.8 * w.hauptstrasse + 0.3 * w.strasse)], ["Radweg", 0.25 * w.radweg]);
    else if (TR.FAMILIE[ctx.sport] === "rad") t.push(["Verkehr", -(0.8 * w.hauptstrasse + 0.4 * w.strasse)], ["Forst- und Feldwege", 0.25 * (w.fahrweg + w.pfad)]);
    else t.push(["Verkehr", -(0.8 * w.hauptstrasse + 0.5 * w.strasse + 0.1 * w.nebenstrasse)], ["Fuss-, Wander- und Feldwege", 0.25 * (w.pfad + w.fussweg + w.fahrweg + w.radweg)]);
    t.push(["Unterbrechungen", -Math.min(20, K.unterbr_10km * 1.5)], ["Dauer", dauerStrafe(K, ctx, 1.5)]);
    if (ctx.sport === "rennrad") t.push(["Gravel", -Math.min(40, K.gravel_m / 100)]);
    t.push(["Zugang", -Math.min(40, K.zugang_m / 50)]);
    return { wert: 100 + sum(t, (x) => x[1]), teile: t };
  };
  TR.bewerte = function (c, ctx, field) {
    c.K = TR.kennzahlen(c.route, ctx, field);
    if (c.K.unzureichend) { c.sA = c.sB = c.sC = null; return c; }
    c.sA = TR.punkteA(c.K, ctx); c.sB = TR.punkteB(c.K, ctx, c.sA); c.sC = TR.punkteC(c.K, ctx);
    return c;
  };
  /** Drei verschiedene Vorschläge (≥ 15 % andere Wege), aber nie auf Kosten des Ziels: Ist die beste Route für B bzw. C dieselbe
   *  wie A, gilt eine andere nur, wenn sie höchstens 8 Punkte schlechter ist; sonst «wie A» – offen gesagt. */
  TR.auswahl = function (pool, ctx) {
    const ok = pool.filter((c) => c.K && !c.K.unzureichend);
    const best = (list, f) => list.filter((c) => f(c) != null).sort((a, b) => f(b) - f(a))[0] || null;
    const anders = (c, list) => list.every((x) => !x || !RT.istDoppelt(x.route, c.route));
    const nimm = (list, f, sperre) => {
      const b = best(list, f); if (!b) return null;
      if (anders(b, sperre)) return { c: b };
      const frei = best(list.filter((c) => anders(c, sperre)), f);
      if (frei && f(frei) >= f(b) - 8) return { c: frei, fast: true };
      return { c: b, gleich: sperre.find((x) => x && (x === b || RT.istDoppelt(x.route, b.route))) };
    };
    const out = { A: null, B: null, C: null, hinweise: [] };
    out.A = best(ok, (c) => c.sA.wert);
    if (!out.A) return out;
    if (ok.some((c) => c.sB)) {
      const r = nimm(ok, (c) => (c.sB ? c.sB.wert : null), [out.A]);
      out.B = r.c;
      if (r.gleich) { out.B_gleich = "A"; out.hinweise.push("B: Beim Wetter ist A bereits die beste Route – B entspricht A."); }
    } else out.hinweise.push("B: Wetter unbekannt (keine Prognose geladen oder Lücken) – keine wetteroptimierte Auswahl.");
    const poolC = ctx.sport === "rennrad" && ok.some((c) => c.variante === "C") ? ok.filter((c) => c.variante === "C") : ok;
    const rc = nimm(poolC, (c) => c.sC.wert, [out.A, out.B && out.B !== out.A ? out.B : null]);
    if (rc) {
      out.C = rc.c;
      if (rc.gleich) { const g = rc.gleich === out.A ? "A" : "B"; out.C_gleich = g; out.hinweise.push(`C: ${g} ist bereits die ruhigste Route – C führt fast über dieselben Wege.`); }
    }
    return out;
  };
  const f1 = (x) => (isNum(x) ? x.toFixed(1) : "–");
  const f0 = (x) => (isNum(x) ? String(Math.round(x)) : "–");
  /** Begründung in einem Satz, aus denselben Kennzahlen wie die Punkte. */
  TR.begruendung = function (key, c, ctx) {
    const K = c.K, wo = ctx.wo, teile = [];
    const dTxt = `Dauer ${K.abw >= 0 ? "+" : "−"}${f0(Math.abs(K.abw * 100))} % (Ziel ±${f0(wo.tol * 100)} %)`;
    if (key === "A") {
      teile.push(dTxt);
      if (K.intervalle.length) { const g = K.intervalle.filter((x) => x.note === "gut").length; teile.push(`${g} von ${K.intervalle.length} Intervallen auf geeigneten Abschnitten`); }
      if (wo.art === "berg" && K.max_anstieg) teile.push(`längster Anstieg ${f1(K.max_anstieg.len / 1000)} km mit Ø ${f1(K.max_anstieg.mittel * 100)} %`);
      else if (wo.art === "trail") teile.push(`${f0(K.up)} Hm, ${K.anstiege_n} Anstiege`);
      else teile.push(`${f0(K.flach_anteil * 100)} % flach (±3 %)`);
      teile.push(`${f1(K.unterbr_10km)} Unterbrechungen je 10 km`);
    } else if (key === "B") {
      const W = K.wetter;
      if (isNum(W.hin_ms) && isNum(W.rueck_ms)) teile.push(`${W.hin_ms < 0 ? "Gegenwind" : "Rückenwind"} auf der ersten Hälfte (${f0(Math.abs(W.hin_ms * 3.6))} km/h), ${W.rueck_ms >= 0 ? "Rückenwind" : "Gegenwind"} auf der zweiten (${f0(Math.abs(W.rueck_ms * 3.6))} km/h)`);
      teile.push(W.boe10_m > 0 ? `${f1(W.boe10_m / 1000)} km mit starken Seitenböen` : "keine starken Seitenböen");
      teile.push(W.regen_mm >= 0.1 ? `ca. ${f1(W.regen_mm)} mm Regen unterwegs` : "trocken laut Prognose");
      teile.push(dTxt);
    } else {
      const w = K.wege_pct;
      if (TR.FAMILIE[ctx.sport] === "rad") teile.push(`Hauptstrasse ${f0(w.hauptstrasse)} %, Verbindungsstrasse ${f0(w.strasse)} %, Radweg ${f0(w.radweg)} %${ctx.sport !== "rennrad" ? `, Forst-/Feldweg ${f0(w.fahrweg)} %` : ""}`);
      else teile.push(`Fuss-/Wander-/Feldwege ${f0(w.pfad + w.fussweg + w.fahrweg + w.radweg)} %, Strasse ${f0(w.hauptstrasse + w.strasse)} %`);
      teile.push(`${f1(K.unterbr_10km)} Unterbrechungen je 10 km`, dTxt);
    }
    return teile.join(" · ");
  };

  /* ======================= Suche (Ablauf, Anfragen begrenzt) ======================= */
  /** Ablauf: Distanz aus der persönlichen Prognose schätzen → 6 Richtungen rechnen → die besten Richtungen über die echte
   *  Fahrzeit auf die Plandauer nachregeln (höchstens 2 Runden) → Rennrad: ruhige Variante (C) mit dem velofreundlichen
   *  Profil → Wetter → Auswahl. io: {route(variante, pts) → Promise<leg>, wetter(routes) → Promise<Map id→Feld>|null,
   *  fortschritt(text)}. Anfragen begrenzt der Aufrufer (Warteschlange, Cache). */
  TR.suche = async function (ctx, io) {
    const res = { pool: [], fehler: [], hinweise: [], v: TR.VERSIONS.vorschlag };
    const fam = TR.FAMILIE[ctx.sport] || "rad", form = ctx.routenart || "rund", T = ctx.wo.dauer_s, tol = ctx.wo.tol;
    const melde = (t) => io.fortschritt && io.fortschritt(t);
    if (!isNum(T) || T <= 0) { res.hinweise.push("Keine Dauer bekannt – bitte Dauer angeben."); return res; }
    const Dflat = TR.flachDistanz(ctx.sport, ctx.inp, T);
    if (!isNum(Dflat)) { res.hinweise.push("Keine Zeitprognose möglich (Kalibrierung fehlt für diese Eingabe)."); return res; }
    res.d_schaetzung = Dflat * (TR.HUEGEL[fam] || 0.85);
    const fields = new Map();
    let nr = 0;
    const ordnen = () => res.pool.sort((a, b) => a.seq - b.seq);       // gleiche Reihenfolge unabhängig von der Antwortzeit
    const rechne = async (variante, brg, r, extra) => {
      const pts = form === "ziel" ? [ctx.start, ctx.ziel] : TR.punkte(form, ctx.start, brg, r), seq = ++nr;
      try {
        const leg = await io.route(variante, pts, extra);
        const legs = pts.length > 2 ? RT.splitLegs(leg, pts) : [leg];
        const route = legs ? RT.buildRoute(legs, pts, { sport: ctx.sport, engine: leg.engine || ctx.engine, prov: ctx.prov, id: `k${seq}` })
          : RT.buildRoute([leg], [pts[0], pts[pts.length - 1]], { sport: ctx.sport, engine: leg.engine || ctx.engine, prov: ctx.prov, id: `k${seq}` });
        if (route.unvollstaendig) throw new RT.RouteError("netz", "Ein Zwischenziel liegt neben dem Wegnetz.");
        const c = { id: route.id, seq, variante, brg, r, form, pts, route, legs, ungeteilt: !legs, alt: extra && extra.alt, eng: leg.eng || null };
        TR.bewerte(c, ctx, fields.get(route.id) || null);
        res.pool.push(c); ordnen();
        return c;
      } catch (e) { res.fehler.push({ variante, brg, r, text: (e && e.message) || String(e), detail: (e && e.detail) || "" }); return null; }
    };
    const wetter = async (list) => {
      if (!io.wetter || !list.length) return;
      try {
        const m = await io.wetter(list.map((c) => c.route));
        if (!m) return;
        for (const c of list) { const f = m.get(c.route.id); if (f) { fields.set(c.route.id, f); c.field = f; TR.bewerte(c, ctx, f); } }
      } catch (e) { res.hinweise.push("Wetter nicht verfügbar: " + ((e && e.message) || e)); }
    };
    if (form === "ziel") {
      melde("Route zum Ziel …");
      await Promise.all([rechne("A", null, null), rechne("C", null, null), rechne("A", null, null, { alt: 1 })]);
      await wetter(res.pool);
      return Object.assign(res, TR.auswahl(res.pool, ctx));
    }
    const r0 = Math.max(300, res.d_schaetzung / TR.FORM[form].faktor);
    melde("6 Richtungen werden gerechnet …");
    await Promise.all([0, 60, 120, 180, 240, 300].map((b) => rechne("A", b, r0)));
    if (!res.pool.length) { res.hinweise.push("Keine Route gefunden (siehe Meldungen)."); return res; }
    await wetter(res.pool.slice());
    // Nachregeln: je Richtung (Familie) Radius so ändern, dass die Bewegungszeit zur Plandauer passt
    const familie = (variante, brg) => res.pool.filter((c) => c.variante === variante && c.brg === brg && c.K && !c.K.unzureichend);
    const nachregeln = async (variante, brgs, runden) => {
      for (let rr = 0; rr < runden; rr++) {
        const todo = [];
        for (const b of brgs) {
          const F = familie(variante, b).sort((x, y) => Math.abs(x.K.abw) - Math.abs(y.K.abw));
          if (!F.length || Math.abs(F[0].K.abw) <= tol * 0.6) continue;
          const byR = familie(variante, b).sort((x, y) => x.r - y.r);
          let rn;
          const a = F[0], z = F.find((x) => x !== a && Math.sign(x.K.abw) !== Math.sign(a.K.abw));
          if (z && Math.abs(z.K.T - a.K.T) > 1) rn = a.r + ((T - a.K.T) * (z.r - a.r)) / (z.K.T - a.K.T);
          else rn = a.r * Math.pow(T / a.K.T, 1.0);
          rn = clamp(rn, a.r * 0.45, a.r * 2.2);
          if (byR.some((x) => Math.abs(x.r - rn) < x.r * 0.03)) continue;
          todo.push(rechne(variante, b, rn));
        }
        if (!todo.length) break;
        melde(`Dauer abstimmen (${variante === "C" ? "ruhige Variante, " : ""}Runde ${rr + 1}) …`);
        const neu = (await Promise.all(todo)).filter(Boolean);
        await wetter(neu);
      }
    };
    // Rangfolge der Richtungen ohne den Dauerteil (die Dauer wird danach nachgeregelt)
    const ohneDauer = (sc) => (sc ? sc.wert - sum(sc.teile.filter((x) => x[0] === "Dauer"), (x) => x[1]) : -999);
    const rang = (f) => [...new Set(res.pool.filter((c) => c.variante === "A" && c.K && !c.K.unzureichend).sort((a, b) => f(b) - f(a)).map((c) => c.brg))];
    const topA = rang((c) => ohneDauer(c.sA)).slice(0, 3);
    const topB = rang((c) => ohneDauer(c.sB)).slice(0, 1), topC = rang((c) => ohneDauer(c.sC)).slice(0, 2);
    await nachregeln("A", [...new Set([...topA, ...topB, ...(ctx.sport === "rennrad" ? [] : topC)])], 2);
    if (ctx.sport === "rennrad") {
      melde("Velofreundliche Variante (C) …");
      const start = topC.map((b) => familie("A", b).sort((x, y) => Math.abs(x.K.abw) - Math.abs(y.K.abw))[0]).filter(Boolean);
      const neu = (await Promise.all(start.map((c) => rechne("C", c.brg, c.r)))).filter(Boolean);
      await wetter(neu);
      await nachregeln("C", start.map((c) => c.brg), 1);
    }
    // Rundtour mit Wind: Die erste Hälfte führt immer vom Start zum entferntesten Punkt (Richtung brg), die zweite zurück –
    // ob zuerst Gegenwind kommt, entscheidet also die Richtung der Runde (B wählt sie über «Wind Rückweg»), nicht der Umlaufsinn.
    return Object.assign(res, TR.auswahl(res.pool, ctx));
  };
  /** Wetter-Stützpunkte mehrerer Routen auf ein Gitter (0,05° ≈ 4–5 km) zusammenfassen: eine Anfrage für alle Vorschläge. */
  TR.wetterGitter = function (routes, zelle) {
    zelle = zelle || 0.05;
    const zellen = new Map(), proRoute = new Map();
    for (const r of routes) {
      const pts = RT.weatherPoints(r, 30).map((p) => {
        const key = `${Math.round(p.lat / zelle)}:${Math.round(p.lon / zelle)}`;
        if (!zellen.has(key)) zellen.set(key, { key, lat: p.lat, lon: p.lon, ele: p.ele });
        return Object.assign({}, p, { key });
      });
      proRoute.set(r.id, pts);
    }
    return { zellen, proRoute };
  };
  TR.wetterFeld = function (pts, antworten) {
    const resp = pts.map((p) => antworten.get(p.key));
    if (resp.some((x) => !x)) return null;
    return RT.weatherField(pts, resp);
  };

  /* ======================= Kompakte Route für die Auswertung ======================= */
  TR.polyEncode = function (pts, prec) {
    const f = Math.pow(10, prec || 5); let out = "", py = 0, px = 0;
    const enc = (v) => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>>= 5; } return s + String.fromCharCode(v + 63); };
    for (const [x, y] of pts) { const iy = Math.round(y * f), ix = Math.round(x * f); out += enc(iy - py) + enc(ix - px); py = iy; px = ix; }
    return out;
  };
  TR.polyDecode = function (str, prec) {
    const f = Math.pow(10, prec || 5), out = []; let i = 0, lat = 0, lon = 0;
    while (i < (str || "").length) {
      for (let pass = 0; pass < 2; pass++) { let b, sh = 0, r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32 && i < str.length); const v = r & 1 ? ~(r >> 1) : r >> 1; if (pass) lon += v; else lat += v; }
      out.push([lon / f, lat / f]);
    }
    return out;
  };
  const SC = { asphalt: "a", pflaster: "p", hart: "h", kies: "k", natur: "n", unbefestigt: "u", unbekannt: "x" };
  const SC_TAG = { a: "asphalt", p: "sett", h: "concrete", k: "gravel", n: "ground", u: "unpaved", x: null };
  const WC = { hauptstrasse: "H", strasse: "S", nebenstrasse: "N", radweg: "R", fahrweg: "F", pfad: "P", fussweg: "W", faehre: "Q", autobahn: "A", unbekannt: "X" };
  const WC_TAG = { H: "primary", S: "secondary", N: "residential", R: "cycleway", F: "track", P: "path", W: "footway", Q: null, A: "motorway", X: null };
  /** Route alle 50 m: Linie (Polyline 1e5), Höhe in dm-Differenzen, Belag- und Wegart-Kürzel – reicht zum Nachrechnen. */
  TR.kompakt = function (route) {
    const pts = [], e = [], sc = [], wc = [];
    let pe = 0;
    for (let dd = 0; dd <= route.L + 1e-6; dd += 50) {
      const d = Math.min(route.L, dd), a = RT.at(route, d), s = a.seg || {};
      pts.push([a.lon, a.lat]);
      const ed = Math.round((isNum(a.ele) ? a.ele : 0) * 10); e.push(ed - pe); pe = ed;
      sc.push(SC[s.surface] || "x"); wc.push(WC[s.way] || "X");
      if (d >= route.L) break;
    }
    return { ll: TR.polyEncode(pts, 5), e, sc: sc.join(""), wc: wc.join(""), L: route.L };
  };
  TR.ausKompakt = function (k, sport) {
    const ll = TR.polyDecode(k.ll, 5);
    let acc = 0;
    const coords = ll.map((p, i) => { acc += k.e[i] || 0; return [p[0], p[1], acc / 10]; });
    const edges = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const sTag = SC_TAG[k.sc[i + 1] || k.sc[i]], wTag = WC_TAG[k.wc[i + 1] || k.wc[i]];
      const tags = {}; if (sTag) tags.surface = sTag; if (wTag) tags.highway = wTag;
      const last = edges[edges.length - 1];
      if (last && JSON.stringify(last.tags) === JSON.stringify(tags)) last.i1 = i + 1;
      else edges.push({ i0: i, i1: i + 1, tags, nodeTags: {} });
    }
    return RT.buildRoute([{ coords, edges, props: { creator: "gespeicherter Vorschlag" } }], [ll[0], ll[ll.length - 1]], { sport, id: "gespeichert" });
  };

  /* ======================= Nach dem Training (auswertung-rt-1.0) ======================= */
  /** Passende absolvierte Aktivität: gleicher Tag, gleiche Sportfamilie, draussen; bei mehreren die mit der Dauer nächst am Plan. */
  TR.passendeAktivitaet = function (rec, acts) {
    const fam = { rennrad: "rad", gravel: "rad", mtb: "rad", laufen: "lauf", trail: "lauf", wandern: "wandern" }[rec.sport] || "rad";
    const list = (acts || []).filter((a) => a.date === rec.datum && a.sport === fam && !a.indoor);
    return list.sort((a, b) => Math.abs((a.mv || a.dur) - rec.plan.dauer_s) - Math.abs((b.mv || b.dur) - rec.plan.dauer_s))[0] || null;
  };
  /** Anteil der vorgeschlagenen Strecke, der laut GPS-Spur gefahren wurde (je 50 m, ≤ 40 m neben der Spur). */
  TR.folgeAnteil = function (proposalLL, trackLL) {
    if (!proposalLL || !trackLL || proposalLL.length < 2 || trackLL.length < 2) return null;
    const cell = 0.001, grid = new Map(), key = (x, y) => Math.floor(x / cell) + ":" + Math.floor(y / cell);
    const dense = [];
    for (let i = 1; i < trackLL.length; i++) {
      const a = trackLL[i - 1], b = trackLL[i], n = Math.max(1, Math.ceil(RT.hav(a[0], a[1], b[0], b[1]) / 25));
      for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    dense.push(trackLL[trackLL.length - 1]);
    for (const p of dense) { const k = key(p[0], p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
    let n = 0, hit = 0, acc = 0;
    for (let i = 1; i < proposalLL.length; i++) {
      const a = proposalLL[i - 1], b = proposalLL[i], seg = RT.hav(a[0], a[1], b[0], b[1]);
      for (let s = acc; s < seg; s += 50) {
        const f = s / (seg || 1), x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        n++;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        let ok = false;
        for (let u = -1; u <= 1 && !ok; u++) for (let v = -1; v <= 1 && !ok; v++) for (const q of grid.get(cx + u + ":" + (cy + v)) || []) if (RT.hav(x, y, q[0], q[1]) <= 40) { ok = true; break; }
        if (ok) hit++;
      }
      acc = Math.max(0, acc - seg) % 50;
    }
    return n ? hit / n : null;
  };
  /** Vorschlag (gespeichert) gegen die absolvierte Aktivität. opt: {route (gleiche Route wieder aufgebaut), inp, kal_datum}.
   *  Unabhängig = Aktivität nach dem Stand der Kalibrierung (nicht zur Anpassung verwendet). */
  TR.vergleich = function (rec, a, opt) {
    opt = opt || {};
    const ist_s = a.mv || a.dur, rows = [], P = rec.pred || {};
    const dev = (x, y) => (isNum(x) && isNum(y) && y ? (x - y) / y : null);
    rows.push({ k: "dauer", label: "Dauer (Bewegung)", plan: rec.plan.dauer_s, prognose: P.moving_s, ist: ist_s, einheit: "s" });
    rows.push({ k: "distanz", label: "Distanz", prognose: P.L, ist: isNum(a.km) ? a.km * 1000 : null, einheit: "m" });
    rows.push({ k: "tempo", label: TR.FAMILIE[rec.sport] === "lauf" ? "Pace" : "Tempo", prognose: TR.FAMILIE[rec.sport] === "lauf" ? P.pace_s : P.v_kmh,
      ist: TR.FAMILIE[rec.sport] === "lauf" ? (isNum(a.km) && a.km > 0 ? ist_s / a.km : null) : isNum(a.km) && ist_s ? (a.km / ist_s) * 3600 : null, einheit: TR.FAMILIE[rec.sport] === "lauf" ? "s/km" : "km/h" });
    rows.push({ k: "hm", label: "Höhenmeter", prognose: P.up, ist: a.hm, einheit: "m" });
    if (rec.plan.modus === "watt") rows.push({ k: "watt", label: "Leistung Ø (NP)", plan: rec.plan.haupt_gew || rec.plan.haupt, ist: a.watt, ist2: a.np, einheit: "W" });
    if (rec.plan.modus === "hf" || a.hr) rows.push({ k: "hf", label: "Puls Ø", plan: rec.plan.modus === "hf" ? rec.plan.haupt : null, ist: a.hr, einheit: "bpm" });
    const fehler = dev(P.moving_s, ist_s);
    const folge = isNum(opt.folge) ? opt.folge : null;
    let bei_ist = null;
    if (opt.route && opt.inp && TR.FAMILIE[rec.sport] === "rad" && isNum(a.watt) && a.watt > 0) {
      const s = RT.eta(opt.route, Object.assign({}, opt.inp, { mode: "watt", value: a.watt, plan: null }));
      if (!s.unzureichend) bei_ist = { moving_s: s.moving_s, fehler: dev(s.moving_s, ist_s), watt: a.watt };
    }
    const wx = a.wx || null;
    const wetter = { prognose: rec.wetter || null, ist: wx ? { temp: wx.temperature, wind_kmh: wx.wind_speed_unit === "km/h" ? wx.wind_speed : isNum(wx.wind_speed) ? wx.wind_speed * 3.6 : null, aus: wx.wind_direction_compass, station: wx.station_name, quelle: wx.quelle } : null };
    let intervalle = null;
    if (a.wk && Array.isArray(a.wk.schritte)) {
      const S = a.wk.schritte.filter((s) => s.typ === "aktiv" || s.typ === "intervall" || s.typ === "intensiv");
      const zeit = sum(S, (s) => s.ist_s || 0), imZiel = zeit ? sum(S, (s) => (s.im_ziel || 0) * (s.ist_s || 0)) / zeit : null;
      intervalle = { n: a.wk.schritte.length, im_ziel_pct: isNum(imZiel) ? imZiel : a.wk.im_ziel != null ? a.wk.im_ziel : null, quelle: a.wk.quelle || "Workout auf der Uhr" };
    }
    const unabh = opt.kal_datum ? a.date > opt.kal_datum : null;
    const hinweise = [];
    if (folge != null && folge < 0.8) hinweise.push(`Nur ${Math.round(folge * 100)} % der vorgeschlagenen Strecke gefahren – Zeitvergleich eingeschränkt.`);
    if (folge == null) hinweise.push("GPS-Spur der Aktivität fehlt noch (kommt mit dem Nacht-Update bzw. Monatsexport): Streckentreue nicht geprüft.");
    if (wx && wx.station_name) hinweise.push(`Ist-Wetter: Garmin-Wetterstation ${wx.station_name} (kann weit entfernt sein).`);
    return { v: TR.VERSIONS.auswertung, rows, fehler, folge, bei_ist, wetter, intervalle, unabhaengig: unabh, hinweise };
  };
  /** Modellgüte über alle ausgewerteten Vorschläge, nur unabhängige (nach der Kalibrierung, Strecke ≥ 80 % gefolgt). */
  TR.modellGuete = function (list) {
    const ok = (list || []).filter((x) => x && isNum(x.fehler) && x.unabhaengig !== false && (x.folge == null || x.folge >= 0.8));
    const abs = ok.map((x) => Math.abs(x.fehler)).sort((a, b) => a - b);
    const med = abs.length ? (abs.length % 2 ? abs[abs.length >> 1] : (abs[abs.length / 2 - 1] + abs[abs.length / 2]) / 2) : null;
    return { n: ok.length, median_abs: med, bias: ok.length ? sum(ok, (x) => x.fehler) / ok.length : null };
  };
  return TR;
});
