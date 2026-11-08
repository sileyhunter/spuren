/* Spuren & Formkurve – Rechenlogik V5 (ohne DOM). Läuft im Browser (window.FK) und in Node (require).
   Jede Funktion ist rein: gleiche Eingabe, gleiches Ergebnis. Versionen stehen in FK.VERSIONS.
   Grundsätze: keine erfundenen Werte; fehlend bleibt null («unbekannt»), nie 0; jede Aussage nennt ihren Grund. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FK = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const FK = {};
  FK.VERSIONS = {
    cockpit: "cockpit-1.0", readiness: "readiness-1.0", langfahrt: "langfahrt-1.0", koppel: "koppel-1.1",
    fueling: "fueling-1.0", eta: "eta-1.0", cda: "cda-1.0", fit: "fit-js-1.0", wetter: "wetter-1.0",
    pmc: "pmc-2.0", zonen: "zonenverteilung-2.0", orientierung: "langfahrt-orientierung-1.0", entwicklung: "entwicklung-1.0", laufeffizienz: "laufeffizienz-1.0",
  };
  const DAY = 864e5;
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const mean = (a) => { const v = a.filter(isNum); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const sd = (a) => { const v = a.filter(isNum); if (v.length < 2) return null; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
  const quant = (a, p) => { const v = a.filter(isNum).sort((x, y) => x - y); if (!v.length) return null; const k = (v.length - 1) * p, i = Math.floor(k), j = Math.min(i + 1, v.length - 1); return v[i] + (v[j] - v[i]) * (k - i); };
  const median = (a) => quant(a, 0.5);
  FK.util = { mean, sd, quant, median, isNum };

  /* ---------------- Zeit: Europe/Zurich, Sommerzeit ---------------- */
  const dayNum = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  const isoOf = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  FK.dayNum = dayNum; FK.isoOf = isoOf;
  FK.addDays = (iso, n) => isoOf(dayNum(iso) + n);
  let _fmt = null;
  function zurichParts(unix) {
    _fmt = _fmt || new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    const p = {}; for (const x of _fmt.formatToParts(new Date(unix * 1000))) p[x.type] = x.value;
    return { date: `${p.year}-${p.month}-${p.day}`, hh: +p.hour, mm: +p.minute, ss: +p.second };
  }
  FK.zurichParts = zurichParts;
  FK.zurichLocal = (unix) => { const p = zurichParts(unix); return `${p.date} ${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`; };
  /** Ortszeit Zürich (Datum, "HH:MM[:SS]") → Unix-Sekunden; berücksichtigt Sommer-/Winterzeit. */
  FK.zurichToUnix = function (dateISO, hhmm) {
    const [h, m, s] = String(hhmm || "00:00").split(":").map(Number);
    const [Y, M, Dd] = dateISO.split("-").map(Number);
    const want = Date.UTC(Y, M - 1, Dd, h, m, s || 0) / 1000;
    let guess = want - 3600;
    for (let i = 0; i < 3; i++) {
      const p = zurichParts(guess);
      const [y2, m2, d2] = p.date.split("-").map(Number);
      const got = Date.UTC(y2, m2 - 1, d2, p.hh, p.mm, p.ss) / 1000;
      guess += want - got;
    }
    return guess;
  };

  /* ---------------- Formate ---------------- */
  FK.pace = (sPerKm) => { if (!isNum(sPerKm) || sPerKm <= 0) return "–"; let m = Math.floor(sPerKm / 60), s = Math.round(sPerKm - m * 60); if (s === 60) { m += 1; s = 0; } return `${m}:${String(s).padStart(2, "0")}`; };
  FK.kmh2pace = (kmh) => (isNum(kmh) && kmh > 0 ? 3600 / kmh : null);
  FK.pace2kmh = (s) => (isNum(s) && s > 0 ? 3600 / s : null);

  /* ---------------- Zonenprofile und Cockpit (cockpit-1.0) ---------------- */
  FK.activeProfile = function (zonen, dateISO) {
    const L = (zonen || []).filter((p) => p.gueltig_ab && p.gueltig_ab <= dateISO && (!p.gueltig_bis || dateISO < p.gueltig_bis));
    return L.sort((a, b) => b.gueltig_ab.localeCompare(a.gueltig_ab))[0] || null;
  };
  /** Lage eines Werts auf einer Skala 0..1; Pace-Skalen laufen von langsam (links) nach schnell (rechts). */
  FK.scaleFrac = function (scale, v) {
    if (!isNum(v)) return null;
    const [a, b] = scale.umfang;
    return Math.max(0, Math.min(1, (v - a) / (b - a)));
  };
  FK.zoneOf = function (scale, v) {
    if (!isNum(v)) return null;
    const rev = scale.umfang[1] < scale.umfang[0];
    for (const z of scale.zonen) {
      const lo = z.von, hi = z.bis;
      const inLo = lo == null || (rev ? v <= lo : v >= lo);
      const inHi = hi == null || (rev ? v > hi : v < hi);
      if (inLo && inHi) return z.z;
    }
    return null;
  };
  /** Tests einer Skala (gleiche Disziplin und gleiches Protokoll), neuester zuerst. */
  FK.testsFor = function (schwellen, scale) {
    return ((schwellen && schwellen.tests) || []).filter((t) => t.sport === scale.disziplin && t.protokoll === scale.protokoll && t.methoden && Object.keys(t.methoden).length)
      .sort((a, b) => b.datum.localeCompare(a.datum));
  };
  /** LT1/LT2 eines Tests auf einer Skala. Puls aus den Stufen, Pace aus km/h. Nie aus Einzelmessungen. */
  FK.ltOnScale = function (test, scale, which) {
    if (!test) return null;
    const lt = test[which];
    const base = { which, test: test.test, datum: test.datum, datenstatus: test.datenstatus, protokoll: test.protokoll };
    if (!lt || lt.status === "nicht bestimmbar" || lt.lo == null) {
      return Object.assign(base, { status: "nicht bestimmbar", lo: null, hi: null, methoden: [], grund: (lt && lt.grund) || "keine gültige Methode" });
    }
    let lo, hi;
    if (scale.metrik === "puls") { lo = lt.hf_lo; hi = lt.hf_hi; }
    else if (scale.metrik === "pace") { lo = FK.kmh2pace(lt.lo); hi = FK.kmh2pace(lt.hi); }
    else { lo = lt.lo; hi = lt.hi; }
    if (!isNum(lo) || !isNum(hi)) return Object.assign(base, { status: "nicht bestimmbar", lo: null, hi: null, methoden: lt.methoden, grund: "kein Wert dieser Messgrösse an der Schwelle" });
    return Object.assign(base, { status: lt.status, lo: Math.min(lo, hi), hi: Math.max(lo, hi), methoden: lt.methoden, grund: lt.grund });
  };
  FK.cockpit = function (zonen, schwellen, dateISO) {
    const prof = FK.activeProfile(zonen, dateISO);
    if (!prof) return null;
    return {
      profil: prof,
      skalen: prof.skalen.map((s) => {
        const tests = FK.testsFor(schwellen, s);
        const cur = tests[0] || null, prev = tests[1] || null;
        return {
          skala: s, aktuell: cur && { lt1: FK.ltOnScale(cur, s, "lt1"), lt2: FK.ltOnScale(cur, s, "lt2") },
          vorher: prev && { lt1: FK.ltOnScale(prev, s, "lt1"), lt2: FK.ltOnScale(prev, s, "lt2") },
        };
      }),
    };
  };

  /* ---------------- Laktat: Stufenpunkte und Einzelmessungen ---------------- */
  /** Testkurven aus D.schwellen.tests, Einzelmessungen aus D.lactate (check) und der Vorschau (check). Nie verbunden. */
  FK.lactateData = function (D) {
    const tests = ((D.schwellen && D.schwellen.tests) || []).map((t) => ({
      id: t.test, datum: t.datum, sport: t.sport, protokoll: t.protokoll, datenstatus: t.datenstatus, ausbelastet: t.ausbelastet,
      ende: t.ende, aktivitaet: t.aktivitaet, unit: t.unit,
      punkte: (t.stufen || []).map((s, i) => ({ nr: s.stufe || i + 1, fit_nr: s.fit_nr ?? null, x: s.x, x_fit: s.x_fit, la: s.la, hf: s.hf, hf_tab: s.hf_tab, hf_quelle: s.hf_quelle, quelle: s.quelle })),
    }));
    const singles = [];
    const seen = new Set();
    for (const l of D.lactate || []) {
      if (l.kind !== "check") continue;
      seen.add(l.id || `${l.date}-${l.sport}`);
      singles.push({ id: l.id || `${l.date}-${l.sport}`, datum: l.date, sport: l.sport || "rad", x: l.w ?? (l.pace_s ? 3600 / l.pace_s : null), soll: l.w ?? null,
        la: l.lactate, hf: l.hr_avg ?? null, hf_max: l.hr_max ?? null, np: l.np ?? null, drift: l.drift ?? null, block: l.block ?? null,
        aktivitaet: l.activity || null, quelle: l.quelle || "Chat", status: "bestätigt", zuordnung: l.zuordnung || null, hinweise: l.note ? [l.note] : [] });
    }
    for (const p of D.laktat_vorschau || []) {
      if (p.art !== "check" || p.status !== "vorschau" || seen.has(p.id)) continue;
      const z = (p.zeilen || [])[0] || {};
      const k = pickCandidate(p);
      singles.push({ id: p.id, datum: p.datum, sport: p.sport, x: k ? k.x : z.x, soll: z.x, la: z.la, hf: k ? k.hr : null, hf_chat: z.hf ?? null,
        hf_max: k ? k.hr_max : null, hf60: k ? k.hr60 : null, hf30: k ? k.hr30 : null, np: k ? k.np : null, drift: k ? k.drift : null,
        dauer_s: k ? k.win_s : null, ende: k ? k.uhr : null, fenster: p.fenster || null, kj_vor: k ? k.kj_vor : null, cad: k ? k.cad : null,
        block: p.block || (k && k.uhr) || null, kandidaten: (p.kandidaten || []).length, aktivitaet: p.aktivitaet, quelle: (z.quelle && z.quelle.stelle) || p.datei,
        status: "vorschau", zuordnung: p.zuordnung, regel: p.regel, hinweise: p.hinweise || [] });
    }
    singles.sort((a, b) => a.datum.localeCompare(b.datum));
    return { tests, singles };
  };
  function pickCandidate(p) {
    const c = p.kandidaten || [];
    if (!c.length) return null;
    if (p.block) { const hit = c.find((k) => k.uhr === p.block || (k.uhr && p.block && Math.abs(hm(k.uhr) - hm(p.block)) <= 1)); if (hit) return hit; }
    if (/letzt/i.test((p.zuordnung || "") + " " + (p.regel || ""))) return c[c.length - 1];
    return c.length === 1 ? c[0] : null;
  }
  const hm = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
  FK.qualityFlags = function (s) {
    const f = [];
    if (s.status === "vorschau") f.push("Vorschau: noch nicht bestätigt");
    if (/Erinnerung/i.test(s.zuordnung || "")) f.push("Block nach Erinnerung zugeordnet");
    if (s.kandidaten > 1 && !s.block) f.push(`${s.kandidaten} mögliche Blöcke`);
    for (const h of s.hinweise || []) { if (/ca\./.test(h)) f.push("Wert ungefähr (ca.)"); if (/nach Blockende/.test(h)) f.push("Blut nach Blockende"); }
    if (s.hf_chat != null && s.hf != null && Math.abs(s.hf_chat - s.hf) > 3) f.push(`Puls im Chat ${s.hf_chat}, FIT ${Math.round(s.hf)}`);
    return f;
  };

  /* ---------------- Readiness (readiness-1.0) ---------------- */
  const HRV_OK = (v) => isNum(v) && v >= 10 && v <= 250;
  const RHR_OK = (v) => isNum(v) && v >= 25 && v <= 120;
  /** Tageslast (TSS-Summe) je Datum. */
  FK.dailyLoad = function (acts) { const m = new Map(); for (const a of acts || []) if (a.date) m.set(a.date, (m.get(a.date) || 0) + (a.tss || 0)); return m; };

  /* ---------------- Fitness, Ermüdung, Form (pmc-2.0) ----------------
     Exponentiell geglättete Tageslast (Kalendertage, Ortszeit): Fitness x_d = x_{d−1} + (Last_d − x_{d−1}) / 42,
     Ermüdung gleich mit 7. Tage ohne Training zählen mit Last 0.
     pmc-1.0 zeigte als «Form» den Vortageswert (Fitness_{d−1} − Ermüdung_{d−1}, Konvention TrainingPeaks), neben Fitness
     und Ermüdung von heute: daher 91 / 89 / −10. pmc-2.0: Form_d = Fitness_d − Ermüdung_d aus genau den angezeigten Werten;
     der Vortageswert bleibt als «Form zu Tagesbeginn» (vor den Einheiten des Tages) erhalten und ist so beschriftet. */
  FK.pmc = function (loads, vonISO, bisISO) {
    const get = loads instanceof Map ? (d) => loads.get(d) : (d) => (loads || {})[d];
    const out = []; let ctl = 0, atl = 0;
    if (!vonISO || !bisISO) return out;
    for (let n = dayNum(vonISO), e = dayNum(bisISO); n <= e; n++) {
      const date = isoOf(n), last = +get(date) || 0, start = ctl - atl;
      ctl += (last - ctl) / 42; atl += (last - atl) / 7;
      out.push({ date, last, ctl, atl, tsb: ctl - atl, tsbStart: start });
    }
    return out;
  };
  /** Anzeige: gerundete Fitness und Ermüdung; Form = Differenz dieser gerundeten Werte, damit sie sichtbar aufgeht. */
  FK.pmcAnzeige = function (p) {
    if (!p || !isNum(p.ctl) || !isNum(p.atl)) return null;
    const f = Math.round(p.ctl), e = Math.round(p.atl);
    return { datum: p.date, fitness: f, ermuedung: e, form: f - e, form_exakt: +(p.ctl - p.atl).toFixed(1),
      form_tagesbeginn: isNum(p.tsbStart) ? Math.round(p.tsbStart) : null, last: p.last, v: FK.VERSIONS.pmc };
  };

  /* ---------------- Intensitätsverteilung (zonen-2.0) ----------------
     Drei Bereiche nur mit ausdrücklich gültigen Schwellen: Pulsgrenzen aus dem Zonenprofil, das am Tag der Einheit galt
     (Obergrenze Z2 = LT1, Obergrenze Z3 = LT2), je Sportart. Ohne gültiges Profil: Garmin-Pulszonen der Uhr (Z1–2 / Z3 / Z4–5)
     nur zur Information, ohne Schwellenbezug und ohne Beurteilung. Nie Sportarten mischen. */
  FK.pulsGrenzen = function (zonen, sport, dateISO) {
    const P = FK.activeProfile(zonen, dateISO);
    const sc = P && (P.skalen || []).find((x) => x.disziplin === sport && x.metrik === "puls");
    const z2 = sc && sc.zonen.find((z) => z.z === "Z2"), z3 = sc && sc.zonen.find((z) => z.z === "Z3");
    if (!(z2 && z3 && isNum(z2.bis) && isNum(z3.bis))) return null;
    return { lt1: z2.bis, lt2: z3.bis, profil: P.name || P.id, ab: P.gueltig_ab, freigabe: (P.freigabe && P.freigabe.datum) || null };
  };
  /** Puls-Histogramm (5-bpm-Klassen ab 60, Sekunden) an zwei Grenzen teilen; innerhalb einer Klasse linear verteilt. */
  FK.histSplit = function (hh, lt1, lt2) {
    const z = [0, 0, 0];
    (hh || []).forEach((sec, i) => {
      if (!sec) return;
      const lo = 60 + 5 * i, f1 = Math.min(1, Math.max(0, (lt1 - lo) / 5)), f2 = Math.min(1, Math.max(0, (lt2 - lo) / 5));
      z[0] += sec * f1; z[1] += sec * (f2 - f1); z[2] += sec * (1 - f2);
    });
    return z;
  };
  FK.zone3 = function (a, zonen) {
    const g = a && a.date ? FK.pulsGrenzen(zonen, a.sport, a.date) : null;
    if (g && Array.isArray(a.hh) && a.hh.some((x) => x > 0)) return { basis: "profil", z: FK.histSplit(a.hh, g.lt1, g.lt2), grenzen: g };
    if (a && Array.isArray(a.zones) && a.zones.length >= 5) return { basis: "garmin", z: [a.zones[0] + a.zones[1], a.zones[2], a.zones[3] + a.zones[4]] };
    return null;
  };
  /** Summen je Basis für eine Sportart und einen Zeitraum [von, bis] (inklusive). */
  FK.zoneSummary = function (acts, zonen, sport, vonISO, bisISO) {
    const leer = () => ({ z: [0, 0, 0], s: 0, n: 0, wochen: new Set(), grenzen: [] });
    const out = { v: FK.VERSIONS.zonen, sport, von: vonISO, bis: bisISO, profil: leer(), garmin: leer(), ohne: 0 };
    for (const a of acts || []) {
      if (a.sport !== sport || !a.date || a.date < vonISO || a.date > bisISO) continue;
      const q = FK.zone3(a, zonen);
      if (!q) { out.ohne++; continue; }
      const B = out[q.basis];
      q.z.forEach((v, j) => (B.z[j] += v)); B.s += q.z[0] + q.z[1] + q.z[2]; B.n++;
      B.wochen.add(Math.floor((dayNum(a.date) + 3) / 7));          // Kalenderwoche Mo–So
      if (q.grenzen && !B.grenzen.some((g) => g.profil === q.grenzen.profil)) B.grenzen.push(q.grenzen);
    }
    for (const k of ["profil", "garmin"]) out[k].wochen = out[k].wochen.size;
    return out;
  };
  /** Prozent je Bereich, einzeln gerundet (Summe darf 99–101 % sein; das ist Rundung, kein Fehler). */
  FK.anteile = function (z) {
    const t = (z || []).reduce((s, v) => s + (v || 0), 0);
    if (!t) return null;
    const p = z.map((v) => Math.round((100 * v) / t));
    return { pct: p, summe: p.reduce((s, v) => s + v, 0), total_s: t };
  };
  /**
   * Einordnung ohne Pauschalurteil. Ergebnis: {status: "unsicher"|"beschreibung", text, hypothese, gruende, kontext}.
   * kontext: {wettkampf: {name, tage}, stundenProWoche, einheitenProWoche, bereitschaft}. Nie «zu viel»/rot.
   */
  FK.zoneVerdict = function (sum, kontext, opt) {
    opt = Object.assign({ minWochen: 3, minEinheiten: 6, minStunden: 6 }, opt || {});
    const k = kontext || {}, P = sum.profil, G = sum.garmin, gruende = [];
    const A = FK.anteile(P.z);
    let status = "beschreibung";
    if (!P.n) { status = "unsicher"; gruende.push(sum.sport === "schwimm" ? "für Schwimmen sind keine Pulsschwellen hinterlegt (Puls im Wasser zudem oft ungenau)" : "im Zeitraum keine Einheit mit gültigen, freigegebenen Pulsschwellen"); }
    else {
      if (P.wochen < opt.minWochen) gruende.push(`erst ${P.wochen} ${P.wochen === 1 ? "Woche" : "Wochen"} mit gültigen Schwellen (mindestens ${opt.minWochen})`);
      if (P.n < opt.minEinheiten) gruende.push(`nur ${P.n} ${P.n === 1 ? "Einheit" : "Einheiten"} (mindestens ${opt.minEinheiten})`);
      if (P.s / 3600 < opt.minStunden) gruende.push(`nur ${(P.s / 3600).toFixed(1)} h Pulszeit (mindestens ${opt.minStunden} h)`);
      if (gruende.length) status = "unsicher";
    }
    if (G.n) gruende.push(`${G.n} ${G.n === 1 ? "Einheit" : "Einheiten"} nur mit Garmin-Pulszonen der Uhr: angezeigt, aber nicht beurteilt`);
    const ctx = [];
    if (k.wettkampf && isNum(k.wettkampf.tage)) ctx.push(`Wettkampfnähe (${k.wettkampf.name}: ${k.wettkampf.tage < 14 ? k.wettkampf.tage + " Tage" : Math.round(k.wettkampf.tage / 7) + " Wochen"})`);
    ctx.push("Blockziel");
    ctx.push(k.bereitschaft ? `Erholungsstand (heute: ${k.bereitschaft})` : "Erholungsstand");
    const sp = k.sportName ? k.sportName + "-" : "", r1 = (x) => String(Math.round(x * 10) / 10);
    ctx.push(isNum(k.einheitenProWoche) ? `Häufigkeit (Ø ${r1(k.einheitenProWoche)} ${sp}Einheiten pro Woche)` : "Häufigkeit");
    ctx.push(isNum(k.stundenProWoche) ? `Belastung (Ø ${r1(k.stundenProWoche)} h ${k.sportName ? k.sportName + " " : ""}pro Woche)` : "Belastung");
    const hypothese = "Einordnung als Hypothese, keine Vorgabe: Für Grundlagenblöcke auf der Langdistanz wird häufig ein grosser Anteil locker und wenig im mittleren Bereich beschrieben. " +
      "Ob das jetzt für dich passt, hängt ab von " + ctx.join(", ") + ".";
    let text;
    if (status === "unsicher") text = "Beurteilung unsicher: " + gruende.filter((g) => !/nur mit Garmin/.test(g)).join("; ") + ".";
    else text = `${A.pct[0]} % locker, ${A.pct[1]} % mittel, ${A.pct[2]} % hart – von ${fmtH(P.s)} Pulszeit in ${P.n} Einheiten (${P.wochen} Wochen).`;
    return { v: FK.VERSIONS.zonen, status, text, hypothese, gruende, anteile: A, kontext: ctx };
  };
  const fmtH = (s) => { const m = Math.round(s / 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`; };
  FK.fmtH = fmtH;
  /**
   * Bereitschaft für einen Tag. days: [{date, hrv, rhr, sleepH, sleepScore}], befinden: [{date, muede, muskel, stress, krank:[…], nachtdienst}]
   * Ergebnis: {status: bereit|normal|vorsichtig|nicht beurteilbar, gruende:[…], indikatoren:{…}, vertrauen, empfehlung}
   */
  FK.readiness = function (days, acts, befinden, dateISO, opt) {
    opt = Object.assign({ hrvWin: 7, refLong: 60, refShort: 28, minRefLong: 20, minRefShort: 14 }, opt || {});
    const byDate = new Map((days || []).map((d) => [d.date, d]));
    const bef = new Map((befinden || []).map((b) => [b.date, b]));
    const get = (off) => byDate.get(FK.addDays(dateISO, off)) || {};
    const series = (key, from, to, ok) => { const out = []; for (let i = from; i <= to; i++) { const v = get(i)[key]; if (ok(v)) out.push(v); } return out; };
    const today = bef.get(dateISO) || null;
    const shift = [0, -1, -2, -3].some((o) => (bef.get(FK.addDays(dateISO, o)) || {}).nachtdienst);
    const ind = {};
    // HRV: ln-Mittel 7 Tage gegen eigene Referenz (Tage −60…−8, sonst −35…−8); kleinste relevante Änderung 0,5 SD
    const ln = (a) => a.map(Math.log);
    const h7raw = []; for (let i = -(opt.hrvWin - 1); i <= 0; i++) { const v = get(i).hrv; if (HRV_OK(v)) h7raw.push({ off: i, v }); }
    let refL = series("hrv", -opt.refLong, -opt.hrvWin - 1, HRV_OK);
    let refKind = "60 Tage";
    if (refL.length < opt.minRefLong) { refL = series("hrv", -(opt.refShort + opt.hrvWin), -opt.hrvWin - 1, HRV_OK); refKind = "28 Tage"; }
    const hrvToday = HRV_OK(get(0).hrv) ? get(0).hrv : null;
    if (h7raw.length < 4) ind.hrv = { status: "unbekannt", grund: h7raw.length ? `HRV nur an ${h7raw.length} von 7 Tagen` : "HRV fehlt", wert: hrvToday };
    else if (refL.length < (refKind === "60 Tage" ? opt.minRefLong : opt.minRefShort)) ind.hrv = { status: "unbekannt", grund: `Referenz ungenügend (${refL.length} Werte, mindestens ${opt.minRefShort})`, wert: hrvToday };
    else {
      const rm = mean(ln(refL)), rs = sd(ln(refL)) || 0.05;
      // einzelner Ausreisser (|z| > 3) zählt nicht in den 7-Tage-Schnitt
      const outl = h7raw.filter((x) => Math.abs((Math.log(x.v) - rm) / rs) > 3);
      const use = h7raw.filter((x) => !outl.includes(x));
      const m7 = mean(use.map((x) => Math.log(x.v)));
      const z = (m7 - rm) / rs;
      const st = z < -1 ? "deutlich unter Referenz" : z < -0.5 ? "unter Referenz" : z > 0.5 ? "über Referenz" : "im Bereich";
      ind.hrv = { status: st, z: +z.toFixed(2), wert7: Math.round(Math.exp(m7)), ref: Math.round(Math.exp(rm)), refLo: Math.round(Math.exp(rm - 0.5 * rs)), refHi: Math.round(Math.exp(rm + 0.5 * rs)),
        referenz: refKind, n7: use.length, ausreisser: outl.map((x) => FK.addDays(dateISO, x.off)), wert: hrvToday };
      if (shift) ind.hrv.hinweis = "Nachtdienst: Nachtwerte eingeschränkt vergleichbar";
    }
    // Ruhepuls: Mittel der letzten 3 Tage gegen Referenz; 0 Messungen = unbekannt
    const r3 = series("rhr", -2, 0, RHR_OK);
    let rref = series("rhr", -opt.refLong, -8, RHR_OK); let rKind = "60 Tage";
    if (rref.length < opt.minRefLong) { rref = series("rhr", -35, -8, RHR_OK); rKind = "28 Tage"; }
    if (r3.length < 2) ind.rhr = { status: "unbekannt", grund: r3.length ? "Ruhepuls nur an 1 von 3 Tagen" : "keine Ruhepulsmessung" };
    else if (rref.length < opt.minRefShort) ind.rhr = { status: "unbekannt", grund: `Referenz ungenügend (${rref.length} Werte)` };
    else {
      const m3 = mean(r3), rm = mean(rref), rs = Math.max(1.5, sd(rref) || 1.5);
      const d = m3 - rm;
      ind.rhr = { status: d >= Math.max(7, 2 * rs) ? "deutlich erhöht" : d >= Math.max(3, rs) ? "erhöht" : "im Bereich", wert3: +m3.toFixed(1), ref: +rm.toFixed(1), diff: +d.toFixed(1), referenz: rKind };
    }
    // Schlaf
    const s0 = get(0).sleepH;
    const sref = series("sleepH", -28, -1, (v) => isNum(v) && v > 0);
    if (!isNum(s0) || s0 <= 0) ind.schlaf = { status: "unbekannt", grund: "Schlaf der letzten Nacht fehlt" };
    else if (shift) ind.schlaf = { status: "nicht vergleichbar", wert: s0, grund: "Nachtdienst angegeben: Schlaf ausserhalb der üblichen Zeit" };
    else {
      const sm = mean(sref);
      const st = s0 < 5 ? "sehr kurz" : (s0 < 6 || (isNum(sm) && s0 < sm - 1.5)) ? "kurz" : "ausreichend";
      ind.schlaf = { status: st, wert: +s0.toFixed(2), ref: isNum(sm) ? +sm.toFixed(1) : null, score: get(0).sleepScore ?? null };
    }
    // Belastung: 7 Tage gegen 28 Tage (je Woche), dazu 3 Tage gegen üblich
    const L = FK.dailyLoad(acts);
    const sumL = (a, b) => { let s = 0; for (let i = a; i <= b; i++) s += L.get(FK.addDays(dateISO, i)) || 0; return s; };
    const anyHist = (acts || []).some((a) => a.date && a.date <= FK.addDays(dateISO, -21));
    if (!anyHist) ind.last = { status: "unbekannt", grund: "weniger als 3 Wochen Trainingsdaten" };
    else {
      const a7 = sumL(-6, 0), c28 = sumL(-27, 0) / 4, a3 = sumL(-2, 0), t3 = sumL(-27, 0) / 28 * 3;
      const acwr = c28 > 0 ? a7 / c28 : null;
      const st = (acwr != null && acwr > 1.5) || (t3 > 0 && a3 > 2.2 * t3) ? "hoch" : (acwr != null && acwr < 0.6) ? "tief" : "üblich";
      ind.last = { status: st, akut7: Math.round(a7), chronisch7: Math.round(c28), verhaeltnis: acwr != null ? +acwr.toFixed(2) : null, tage3: Math.round(a3) };
    }
    // Befinden (eigene Angabe) und Krankheitszeichen
    if (!today) ind.befinden = { status: "nicht angegeben" };
    else {
      const worst = Math.max(today.muede || 0, today.muskel || 0, today.stress || 0);
      ind.befinden = { status: worst >= 4 ? "belastet" : worst === 3 ? "mittel" : worst > 0 ? "gut" : "nicht angegeben", muede: today.muede ?? null, muskel: today.muskel ?? null, stress: today.stress ?? null };
    }
    const krank = today && Array.isArray(today.krank) && today.krank.length ? today.krank : null;
    if (krank) ind.krank = { status: "angegeben", zeichen: krank };

    // Entscheidung: transparent, ohne Prozentmodell
    const reasons = []; let strong = 0, weak = 0;
    const add = (w, txt, kind) => { reasons.push({ w, txt, kind }); };
    if (krank) { strong++; add(10, `Krankheitszeichen angegeben (${krank.join(", ")})`, "krank"); }
    if (ind.befinden.status === "belastet") { strong++; add(8, `Befinden: ${[today.muede >= 4 ? `Müdigkeit ${today.muede}/5` : null, today.muskel >= 4 ? `Muskeln ${today.muskel}/5` : null, today.stress >= 4 ? `Stress ${today.stress}/5` : null].filter(Boolean).join(", ")} (deine Angabe)`, "befinden"); }
    if (ind.hrv.status === "deutlich unter Referenz") { strong++; add(7, `HRV 7 Tage Ø ${ind.hrv.wert7} ms deutlich unter deiner Referenz (${ind.hrv.refLo}–${ind.hrv.refHi} ms)`, "hrv"); }
    else if (ind.hrv.status === "unter Referenz") { weak++; add(5, `HRV 7 Tage Ø ${ind.hrv.wert7} ms unter deiner Referenz (${ind.hrv.refLo}–${ind.hrv.refHi} ms)`, "hrv"); }
    if (ind.rhr.status === "deutlich erhöht") { strong++; add(7, `Ruhepuls 3 Tage Ø ${fmt1(ind.rhr.wert3)} bpm, ${fmt1(ind.rhr.diff)} über Referenz ${fmt1(ind.rhr.ref)}`, "rhr"); }
    else if (ind.rhr.status === "erhöht") { weak++; add(5, `Ruhepuls 3 Tage Ø ${fmt1(ind.rhr.wert3)} bpm, ${fmt1(ind.rhr.diff)} über Referenz ${fmt1(ind.rhr.ref)}`, "rhr"); }
    if (ind.schlaf.status === "sehr kurz") { strong++; add(6, `Schlaf ${fmt1(ind.schlaf.wert)} h`, "schlaf"); }
    else if (ind.schlaf.status === "kurz") { weak++; add(4, `Schlaf ${fmt1(ind.schlaf.wert)} h${ind.schlaf.ref ? ` (sonst Ø ${fmt1(ind.schlaf.ref)} h)` : ""}`, "schlaf"); }
    if (ind.last.status === "hoch") { weak++; add(4, `Belastung hoch: 7 Tage ${ind.last.akut7} gegen Ø ${ind.last.chronisch7} je Woche`, "last"); }
    if (ind.befinden.status === "mittel") add(2, "Befinden mittel (deine Angabe)", "befinden");
    const objKnown = ["hrv", "rhr", "schlaf"].filter((k) => ind[k] && !["unbekannt", "nicht vergleichbar"].includes(ind[k].status));
    let status;
    if (strong || weak >= 2) status = "vorsichtig";
    else if (objKnown.length < 2) status = "nicht beurteilbar";
    else if (weak === 1 || ind.befinden.status === "mittel") status = "normal";
    else if (objKnown.length >= 2 && (ind.hrv.status === "im Bereich" || ind.hrv.status === "über Referenz") && ind.schlaf.status === "ausreichend") status = "bereit";
    else status = "normal";
    if (status === "nicht beurteilbar") {
      for (const k of ["hrv", "rhr", "schlaf"]) if (ind[k] && ["unbekannt", "nicht vergleichbar"].includes(ind[k].status)) add(3, labelOf(k) + ": " + (ind[k].grund || ind[k].status), "fehlt");
    }
    if (status === "bereit" || (status === "normal" && reasons.length < 2)) {
      if (ind.hrv.wert7) add(1, `HRV 7 Tage Ø ${ind.hrv.wert7} ms ${ind.hrv.status === "über Referenz" ? "über" : "im Bereich"} deiner Referenz (${ind.hrv.refLo}–${ind.hrv.refHi} ms)`, "hrv+");
      if (ind.rhr.wert3) add(1, `Ruhepuls Ø ${fmt1(ind.rhr.wert3)} bpm, Referenz ${fmt1(ind.rhr.ref)}`, "rhr+");
      if (ind.schlaf.wert && ind.schlaf.status === "ausreichend") add(1, `Schlaf ${fmt1(ind.schlaf.wert)} h`, "schlaf+");
    }
    reasons.sort((a, b) => b.w - a.w);
    const vertrauen = objKnown.length === 3 ? "hoch" : objKnown.length === 2 ? "mittel" : "gering";
    const empf = {
      bereit: "Geplante Einheit wie vorgesehen.",
      normal: "Wie geplant; bei harten Einheiten auf das Gefühl achten.",
      vorsichtig: krank ? "Keine harte oder lange Einheit. Bei Fieber oder allgemeinen Symptomen pausieren und ärztlich abklären." : "Intensität reduzieren oder locker trainieren; harte Einheit verschieben.",
      "nicht beurteilbar": "Aus den Daten keine Empfehlung; nach Gefühl entscheiden.",
    }[status];
    return { v: FK.VERSIONS.readiness, datum: dateISO, status, gruende: reasons.slice(0, 4).map((r) => r.txt), alle_gruende: reasons, indikatoren: ind, vertrauen, empfehlung: empf,
      harte_einheit: status === "bereit" || status === "normal" ? "möglich" : "nicht empfohlen", nachtdienst: shift };
  };
  const fmt1 = (v) => (Math.round(v * 10) / 10).toLocaleString("de-CH");
  const labelOf = (k) => ({ hrv: "HRV", rhr: "Ruhepuls", schlaf: "Schlaf" }[k] || k);
  /** Verlauf für die Trendgrafik (21 oder 42 Tage): Tageswerte und Referenzband der HRV. */
  FK.readinessTrend = function (days, acts, befinden, endISO, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = FK.addDays(endISO, -i);
      const r = FK.readiness(days, acts, befinden, d);
      const day = (days || []).find((x) => x.date === d) || {};
      out.push({ date: d, status: r.status, hrv: HRV_OK(day.hrv) ? day.hrv : null, rhr: RHR_OK(day.rhr) ? day.rhr : null, sleepH: isNum(day.sleepH) && day.sleepH > 0 ? day.sleepH : null,
        refLo: r.indikatoren.hrv.refLo ?? null, refHi: r.indikatoren.hrv.refHi ?? null, hrv7: r.indikatoren.hrv.wert7 ?? null, last: FK.dailyLoad(acts).get(d) || 0,
        befinden: ((befinden || []).find((b) => b.date === d) || {}).muede ?? null });
    }
    return out;
  };

  /* ---------------- Lange Ausfahrten 1–6 h (langfahrt-1.0) ---------------- */
  FK.bikeSys = function (a) {
    if (a.sport !== "rad") return null;
    if (a.indoor || /zwift|indoor|rolle/i.test(a.typ || "")) return "indoor";
    if (/mountain|mtb|gravel/i.test(a.typ || "")) return "mtb";
    return "rennrad";
  };
  const ZWECK = {
    grundlage: { name: "Grundlage", maxDec: 5, lo: 0.25, hi: 0.6, capLT1: true },
    longride: { name: "Long Ride", maxDec: 5, lo: 0.4, hi: 0.8, capLT1: true },
    im: { name: "Ironman-Pacing", maxDec: 5, lo: 0.5, hi: 0.85, minH: 4, capLT1: true },
    "703": { name: "70.3-Pacing", maxDec: 7, lo: 0.55, hi: 0.9, minH: 2, maxH: 3.5, capLT1: false },
  };
  FK.ZWECK = ZWECK;
  /**
   * Evidenz für ein Watt-/Pulsband: Fahrten ähnlicher Dauer (±45 min Bewegungszeit), gleiches System (Rolle, Rennrad, MTB),
   * gleichmässig (NP/Ø ≤ 1,12), mit Drift aus den Sekundenwerten, letzte 18 Monate. Mindestens 3 Fahrten, sonst «nicht bestimmbar».
   */
  FK.longRide = function (acts, opt) {
    opt = Object.assign({ stunden: 5, zweck: "longride", system: "rennrad", heute: null, lt1: null, monate: 18, minN: 3 }, opt || {});
    const Z = ZWECK[opt.zweck] || ZWECK.longride;
    const h = opt.stunden;
    const loH = Math.max(Z.minH || 0, h - 0.75), hiH = Math.min(Z.maxH || 99, h + 0.75);
    const from = opt.heute ? FK.addDays(opt.heute, -Math.round(opt.monate * 30.4)) : "0000";
    const reasons = [];
    const cand = (acts || []).filter((a) => a.sport === "rad" && FK.bikeSys(a) === opt.system && a.date >= from && (!opt.heute || a.date <= opt.heute));
    const durOk = cand.filter((a) => { const hh = (a.mv || a.dur || 0) / 3600; return hh >= loH && hh <= hiH; });
    const withP = durOk.filter((a) => isNum(a.watt) && a.watt > 0 && isNum(a.hr));
    const steady = withP.filter((a) => !isNum(a.np) || a.np / a.watt <= 1.12);
    const withDr = steady.filter((a) => a.dr && isNum(a.dr.dec));
    const good = withDr.filter((a) => a.dr.dec <= Z.maxDec);
    const ev = { dauer: durOk.length, mit_leistung: withP.length, gleichmaessig: steady.length, mit_drift: withDr.length, entkopplung_ok: good.length };
    const basis = good.map((a) => ({ id: a.id, date: a.date, name: a.name, h: +((a.mv || a.dur) / 3600).toFixed(2), watt: a.watt, np: a.np ?? null, hr: a.hr, dec: a.dr.dec, h1: a.dr.h1, h2: a.dr.h2, wx: a.wx || null }));
    const res = { v: FK.VERSIONS.langfahrt, zweck: opt.zweck, zweck_name: Z.name, stunden: h, system: opt.system, evidenz: ev, basis, fenster_h: [+loH.toFixed(2), +hiH.toFixed(2)] };
    if (good.length < opt.minN) {
      if (!durOk.length) reasons.push(`keine Fahrt mit ${fmt1(loH)}–${fmt1(hiH)} h Bewegungszeit (${sysName(opt.system)}) in den letzten ${opt.monate} Monaten`);
      else if (!withP.length) reasons.push(`${durOk.length} Fahrten dieser Dauer, aber ohne Leistung und Puls`);
      else if (!withDr.length) reasons.push(`${steady.length} gleichmässige Fahrten, aber ohne Sekundenwerte für die Drift`);
      else reasons.push(`nur ${good.length} von ${withDr.length} Fahrten mit Entkopplung ≤ ${Z.maxDec} % (mindestens ${opt.minN} nötig)`);
      return Object.assign(res, { status: "nicht bestimmbar", watt: null, puls: null, gruende: reasons });
    }
    const W = good.map((a) => a.watt), HR = good.map((a) => a.hr), DEC = good.map((a) => a.dr.dec), DH = good.map((a) => a.dr.h2 - a.dr.h1);
    let lo = quant(W, Z.lo), hi = quant(W, Z.hi);
    if (Z.capLT1 && opt.lt1 && opt.system === "indoor" && isNum(opt.lt1)) {
      if (hi > opt.lt1) { hi = opt.lt1; reasons.push(`oben begrenzt auf LT1 ${Math.round(opt.lt1)} W (Zwift-Test)`); }
      if (lo > hi) lo = hi;
    }
    reasons.push(`${good.length} Fahrten ${fmt1(loH)}–${fmt1(hiH)} h, gleichmässig, Entkopplung ≤ ${Z.maxDec} %`);
    if (opt.system !== "indoor") reasons.push("Watt draussen mit deinem Leistungsmesser; nicht mit Zwift-Watt gleichsetzen");
    return Object.assign(res, {
      status: good.length >= 6 ? "bestimmbar" : "vorläufig",
      watt: { lo: Math.round(lo), hi: Math.round(hi), median: Math.round(median(W)), quelle: "beobachtet" },
      puls: { lo: Math.round(quant(HR, Z.lo)), hi: Math.round(quant(HR, Z.hi)), drift_bpm: +median(DH).toFixed(1), entkopplung_median: +median(DEC).toFixed(1), quelle: "beobachtet" },
      gruende: reasons,
    });
  };
  const sysName = (s) => ({ indoor: "Rolle", rennrad: "Rennrad", mtb: "MTB/Gravel" }[s] || s);
  /**
   * «Vorsichtige Orientierung» (langfahrt-orientierung-1.0): nicht validiert, getrennt vom Band aus FK.longRide und nur gedacht,
   * wenn dieses «nicht bestimmbar» ist. Basis: tatsächliche lange Fahrten desselben Systems (mindestens max(3 h, 0,75 × Zieldauer),
   * höchstens Zieldauer + 1 h, Leistung und Puls, gleichmässig NP/Ø ≤ 1,12), unabhängig von der Entkopplung.
   * Band = 25.–50. Perzentil der Ø Watt dieser Fahrten; Rolle zusätzlich oben auf LT1 (Test auf der Rolle) begrenzt.
   * Pulsgrenze für den Start = LT1-Puls − typische Drift (Median 2. − 1. Hälfte). Keine Umrechnung zwischen Systemen,
   * keine Hochrechnung aus kurzen Fahrten.
   */
  FK.longRideOrientierung = function (acts, opt) {
    opt = Object.assign({ stunden: 5, system: "rennrad", heute: null, monate: 18, lt1_w: null, lt1_hf: null, minN: 3 }, opt || {});
    const h = opt.stunden, minH = Math.max(3, 0.75 * h), maxH = h + 1;
    const from = opt.heute ? FK.addDays(opt.heute, -Math.round(opt.monate * 30.4)) : "0000";
    const L = (acts || []).filter((a) => a.sport === "rad" && FK.bikeSys(a) === opt.system && a.date >= from && (!opt.heute || a.date <= opt.heute)
      && ((a.mv || a.dur || 0) / 3600) >= minH && ((a.mv || a.dur || 0) / 3600) <= maxH && isNum(a.watt) && a.watt > 0 && isNum(a.hr) && (!isNum(a.np) || a.np / a.watt <= 1.12));
    const res = { v: FK.VERSIONS.orientierung, validiert: false, stunden: h, system: opt.system, n: L.length, fenster_h: [+minH.toFixed(2), +maxH.toFixed(2)],
      basis: L.map((a) => ({ id: a.id, date: a.date, h: +((a.mv || a.dur) / 3600).toFixed(2), watt: a.watt, hr: a.hr, dec: a.dr && isNum(a.dr.dec) ? a.dr.dec : null })) };
    if (L.length < opt.minN) return Object.assign(res, { status: "keine Orientierung", watt: null, puls_start_max: null,
      grund: `nur ${L.length} lange ${L.length === 1 ? "Fahrt" : "Fahrten"} mit ${fmt1(minH)}–${fmt1(maxH)} h, Leistung und Puls (${sysName(opt.system)}, mindestens ${opt.minN}); aus kürzeren Fahrten wird nicht hochgerechnet` });
    const W = L.map((a) => a.watt);
    let lo = quant(W, 0.25), hi = quant(W, 0.5);
    const bed = [`${L.length} tatsächliche Fahrten ${fmt1(minH)}–${fmt1(maxH)} h (${sysName(opt.system)}), Band = 25.–50. Perzentil ihrer Ø Watt`];
    if (opt.system === "indoor" && isNum(opt.lt1_w) && hi > opt.lt1_w) { hi = opt.lt1_w; lo = Math.min(lo, hi); bed.push(`oben auf LT1 ${Math.round(opt.lt1_w)} W begrenzt (Test auf der Rolle)`); }
    const dr = L.filter((a) => a.dr && isNum(a.dr.h1) && isNum(a.dr.h2));
    const drift = dr.length ? median(dr.map((a) => a.dr.h2 - a.dr.h1)) : null, dec = dr.length ? median(dr.filter((a) => isNum(a.dr.dec)).map((a) => a.dr.dec)) : null;
    const hfMax = isNum(opt.lt1_hf) && isNum(drift) ? Math.round(opt.lt1_hf - Math.max(0, drift)) : null;
    if (hfMax != null) bed.push(drift > 0 ? `Puls zu Beginn höchstens ${hfMax} bpm: LT1-Puls ${Math.round(opt.lt1_hf)} bpm minus deine typische Drift +${fmt1(drift)} bpm (Median aus ${dr.length} Fahrten)`
      : `Puls höchstens ${hfMax} bpm (LT1-Puls); deine typische Drift ist nicht positiv (Median ${drift < 0 ? "−" : ""}${fmt1(Math.abs(drift))} bpm aus ${dr.length} Fahrten, oft wegen Abfahrten oder Pausen), daher keine Reserve abgezogen`);
    const fehlend = [`nur ${L.filter((a) => a.dr && isNum(a.dr.dec) && a.dr.dec <= 5).length} der ${L.length} Fahrten mit Entkopplung ≤ 5 % (für ein validiertes Band mindestens 3 vergleichbare)`,
      "Hitze, Höhe, Gelände und Verpflegung der Vergleichsfahrten nicht kontrolliert", opt.system !== "indoor" ? "LT1-Watt aus dem Test gilt nicht für den Leistungsmesser draussen (keine Umrechnung)" : null].filter(Boolean);
    return Object.assign(res, { status: "orientierung", watt: { lo: Math.round(lo), hi: Math.round(hi), quelle: "lange Fahrten, nicht validiert" }, puls_start_max: hfMax,
      drift_bpm: isNum(drift) ? +drift.toFixed(1) : null, entkopplung_median: isNum(dec) ? +dec.toFixed(1) : null, bedingungen: bed, fehlend });
  };
  /** Plan gegen Ist: Ø Watt, NP und Puls mit Drift getrennt (NP ist nicht Ø Watt). */
  FK.planIst = function (plan, a) {
    if (!a) return null;
    const w = a.watt ?? null, np = a.np ?? null;
    const lage = (v) => (!isNum(v) || !plan || !isNum(plan.lo) ? "unbekannt" : v < plan.lo ? "unter dem Band" : v > plan.hi ? "über dem Band" : "im Band");
    return { avg_w: w, np_w: np, vi: isNum(w) && isNum(np) && w > 0 ? +(np / w).toFixed(2) : null, hr: a.hr ?? null,
      h1: a.dr ? a.dr.h1 : null, h2: a.dr ? a.dr.h2 : null, entkopplung: a.dr ? a.dr.dec : null, lage_avg: lage(w), lage_np: lage(np),
      hinweis: isNum(np) && isNum(w) && np / w > 1.1 ? "ungleichmässig: NP deutlich über Ø Watt" : null };
  };

  /* ---------------- Koppelläufe (koppel-1.0) ---------------- */
  /** Start und Ende in Unix-Sekunden; genau aus t0, sonst aus Datum und Startminute (±1 min). */
  FK.timesOf = function (a) {
    const el = a.el || a.dur || 0;
    if (isNum(a.t0)) return { t0: a.t0, t1: a.t0 + el, genau: true };
    if (!a.date || !a.start) return null;
    const t0 = FK.zurichToUnix(a.date, a.start);
    return { t0, t1: t0 + el, genau: false };
  };
  const baseId = (id) => String(id).replace(/-\d+$/, "");
  /**
   * Koppelläufe: Lauf beginnt 0–maxMin Minuten nach dem Ende einer Radeinheit (Standard 45, Grenze eingeschlossen) = automatischer Kandidat.
   * Mehrere Kandidaten → «auswählen» (keine stille Zuordnung). Entscheidungen [{bike, run, status: bestätigt|getrennt}] gehen vor.
   * koppel-1.1: Wechsel über direktMin (35 min) heisst «lange Pause» (fenster "lang"): bleibt Kandidat, zählt aber erst nach Bestätigung
   * als direkter Koppellauf (wie im Wettkampf); bis direktMin: fenster "direkt".
   */
  FK.findBricks = function (acts, opt) {
    opt = Object.assign({ maxMin: 45, direktMin: 35, entscheide: [] }, opt || {});
    const A = (acts || []).filter((a) => a.sport === "rad" || a.sport === "lauf").map((a) => ({ a, t: FK.timesOf(a) })).filter((x) => x.t);
    const bikes = A.filter((x) => x.a.sport === "rad"), runs = A.filter((x) => x.a.sport === "lauf");
    const dec = new Map((opt.entscheide || []).map((e) => [e.bike + "|" + e.run, e.status]));
    const pairs = [];
    for (const b of bikes) for (const r of runs) {
      const gap = r.t.t0 - b.t.t1;
      const manual = dec.get(b.a.id + "|" + r.a.id);
      const inWin = gap >= -60 && gap <= opt.maxMin * 60;
      if (!inWin && manual !== "bestätigt") continue;
      pairs.push({ bike: b.a.id, run: r.a.id, wechsel_s: Math.max(0, gap), wechsel_min: +(Math.max(0, gap) / 60).toFixed(1), genau: b.t.genau && r.t.genau,
        mehrsport: baseId(b.a.id) === baseId(r.a.id) && b.a.id !== r.a.id, manuell: manual || null, imFenster: inWin });
    }
    const nB = new Map(), nR = new Map();
    for (const p of pairs) { if (p.manuell === "getrennt") continue; nB.set(p.bike, (nB.get(p.bike) || 0) + 1); nR.set(p.run, (nR.get(p.run) || 0) + 1); }
    for (const p of pairs) {
      if (p.manuell === "bestätigt") p.status = "bestätigt";
      else if (p.manuell === "getrennt") p.status = "getrennt";
      else if ((nB.get(p.bike) || 0) > 1 || (nR.get(p.run) || 0) > 1) p.status = "auswählen";
      else p.status = "vorschlag";
      p.fenster = p.wechsel_s > opt.direktMin * 60 ? "lang" : "direkt";
      p.direkt = p.fenster === "direkt" || p.status === "bestätigt";      // zählt als direkter Koppellauf (Trend, Vergleiche)
      if (!p.genau && Math.abs(p.wechsel_s - opt.maxMin * 60) <= 90 && !p.manuell) p.hinweis = "Startzeit nur auf die Minute genau: Grenze prüfen";
      else if (p.fenster === "lang" && p.status !== "bestätigt" && p.status !== "getrennt") p.hinweis = `Wechsel über ${opt.direktMin} min: nur Kandidat, kein direkter Wettkampf-Wechsel ohne Bestätigung`;
    }
    const t0 = new Map(A.map((x) => [x.a.id, x.t.t0]));
    return pairs.sort((x, y) => (t0.get(y.bike) - t0.get(x.bike)) || (t0.get(x.run) - t0.get(y.run)));
  };
  /** Kennzahlen eines Koppellaufs; fehlende Werte bleiben null (z. B. kein NP ohne Leistungsmesser). */
  FK.brickMetrics = function (bike, run, pair) {
    const sp = (run.sp || []).map((s) => ({ von: s.von, bis: s.bis, s: s.s, m: s.m ?? null, pace: s.pace ?? null, hr: s.hr ?? null, cad: s.cad ?? null }));
    const first = sp.find((s) => s.von === 0), mid = sp.find((s) => s.von === 600);
    return {
      rad: { dauer_s: bike.mv || bike.dur || null, watt: isNum(bike.watt) && bike.watt > 0 ? bike.watt : null, np: isNum(bike.np) && bike.np > 0 ? bike.np : null, hr: bike.hr ?? null, tss: bike.tss ?? null },
      wechsel_min: pair ? pair.wechsel_min : null,
      lauf: { dauer_s: run.mv || run.dur || null, km: run.km ?? null, hr: run.hr ?? null, splits: sp, drift: run.dr ? run.dr.dec : null,
        pace_0_5: first ? first.pace : null, pace_10_20: mid ? mid.pace : null, hr_anstieg: first && mid && isNum(first.hr) && isNum(mid.hr) ? +(mid.hr - first.hr).toFixed(1) : null },
      hinweise: [!(isNum(bike.np) && bike.np > 0) ? "Rad ohne NP (kein Leistungsmesser oder keine Leistung)" : null, !sp.length ? "Lauf ohne Sekundenwerte: keine Abschnitte" : null].filter(Boolean),
    };
  };
  FK.splitLabels = (sp) => (sp || []).map((s) => (s.bis ? `${s.von / 60}–${s.bis / 60} min` : `ab ${s.von / 60} min`));
  /** Achsenbereich aus den Werten mit Rand (nie ab 0, damit keine scheinbare Null-Pace entsteht). */
  FK.splitRange = function (vals, pad) { const v = (vals || []).filter(isNum); if (!v.length) return null; return [Math.floor(Math.min(...v) - pad), Math.ceil(Math.max(...v) + pad)]; };
  /** Vergleich mit Solo-Läufen: ähnliche Dauer (±25 %) und Puls (±5 bpm), letzte 180 Tage, mindestens 3; sonst «nicht vergleichbar». */
  FK.soloCompare = function (acts, run, brickRunIds, opt) {
    opt = Object.assign({ tage: 180, minN: 3 }, opt || {});
    const dur = run.mv || run.dur || 0;
    const sol = (acts || []).filter((a) => a.sport === "lauf" && a.id !== run.id && !brickRunIds.has(a.id) && a.sp && a.date <= run.date && a.date >= FK.addDays(run.date, -opt.tage)
      && Math.abs((a.mv || a.dur || 0) - dur) <= 0.25 * dur && isNum(a.hr) && isNum(run.hr) && Math.abs(a.hr - run.hr) <= 5);
    const p0 = (a) => { const s = (a.sp || []).find((x) => x.von === 0); return s ? s.pace : null; };
    const vals = sol.map(p0).filter(isNum);
    if (vals.length < opt.minN || !isNum(p0(run))) return { status: "nicht vergleichbar", n: vals.length, grund: `nur ${vals.length} ähnliche Solo-Läufe (mindestens ${opt.minN})` };
    const m = median(vals);
    return { status: "vergleichbar", n: vals.length, solo_pace_0_5: Math.round(m), diff_s: Math.round(p0(run) - m) };
  };

  /* ---------------- Meine Entwicklung (entwicklung-1.0) ----------------
     Belegkennzahlen nur aus vergleichbaren Messungen: Puls in gleichmässigen 10-min-Blöcken bei 200 W je Gerätesystem
     bzw. bei 5:30/km auf flacher Strasse (eb-1.0, aus FIT), Laktat bei fixer Leistung aus bestätigten Stufentests desselben
     Protokolls (nur Interpolation), CSS aus validierten 400/200-m-Tests. Guards vor jeder Aussage; Text deterministisch. */
  const EW = { minN: 3, hitze: 25, hoehe: 1500, dhrMax: 6, madK: 3, boot: 2000 };
  FK.EW = EW;
  FK.EW_METRIKEN = {
    rad200: { name: "Rad: Puls bei 200 W", unit: "bpm", besser: "tiefer", schwelle: 3, sport: "rad", dec: 1 },
    lauf330: { name: "Laufen: Puls bei 5:30/km", unit: "bpm", besser: "tiefer", schwelle: 3, sport: "lauf", dec: 1 },
    laktat: { name: "Laktat bei fixer Leistung", unit: "mmol/l", besser: "tiefer", schwelle: 0.3, sport: "rad", dec: 1 },
    css: { name: "Schwimmen: CSS", unit: "s/100 m", besser: "tiefer", schwelle: 2, sport: "schwimm", dec: 0 },
  };
  const runSys = (a) => (a.indoor ? "band" : /trail/i.test(a.typ || "") ? "trail" : "strasse");
  /** Laktat bei fixer Leistung x: nur lineare Interpolation zwischen gemessenen Stufen, nie darüber hinaus. */
  FK.laInterp = function (punkte, x) {
    const P = (punkte || []).filter((p) => isNum(p.x) && isNum(p.la)).sort((a, b) => a.x - b.x);
    if (P.length < 2 || x < P[0].x || x > P[P.length - 1].x) return null;
    for (let i = 0; i < P.length - 1; i++) if (x >= P[i].x && x <= P[i + 1].x) {
      const f = P[i + 1].x === P[i].x ? 0 : (x - P[i].x) / (P[i + 1].x - P[i].x);
      return +(P[i].la + f * (P[i + 1].la - P[i].la)).toFixed(2);
    }
    return null;
  };
  /** CSS in s/100 m aus 400-m- und 200-m-Zeit (s): (T400 − T200) / 2. */
  FK.css = (t400, t200) => (isNum(t400) && isNum(t200) && t400 > t200 && t200 > 0 ? (t400 - t200) / 2 : null);
  /**
   * Messpunkte einer Kennzahl aus den Daten. art: rad200 (opt.sys: indoor|rennrad|mtb), lauf330, laktat (opt.protokoll, opt.x), css.
   * Jeder Punkt: {date, v, id, name, x, q:{wx, alt, dhr, n, status}}.
   */
  FK.entwicklungPunkte = function (D, art, opt) {
    opt = opt || {};
    const A = (D && D.activities) || [];
    if (art === "rad200") return A.filter((a) => a.sport === "rad" && a.eb && a.eb.art === "rad200" && (!opt.sys || FK.bikeSys(a) === opt.sys))
      .map((a) => ({ date: a.date, v: a.eb.hr, id: a.id, name: a.name, x: a.eb.w, q: { wx: a.wx && isNum(a.wx.temperature) ? a.wx.temperature : null,
        alt: FK.bikeSys(a) === "indoor" ? null : a.eb.alt ?? null, dhr: a.eb.dhr ?? null, n: a.eb.n } }));     // Rolle: virtuelle Höhe zählt nicht
    if (art === "lauf330") return A.filter((a) => a.sport === "lauf" && a.eb && a.eb.art === "lauf330" && runSys(a) === "strasse")
      .map((a) => ({ date: a.date, v: a.eb.hr, id: a.id, name: a.name, x: a.eb.pace, q: { wx: a.wx && isNum(a.wx.temperature) ? a.wx.temperature : null, alt: a.eb.alt ?? null, dhr: a.eb.dhr ?? null, n: a.eb.n } }));
    if (art === "laktat") return FK.lactateData(D).tests.filter((t) => t.protokoll === opt.protokoll).map((t) => ({ date: t.datum, v: FK.laInterp(t.punkte, opt.x), id: t.id, name: t.id, x: opt.x,
      q: { status: t.datenstatus === "bestätigt" ? "bestätigt" : "vorschau" } })).filter((p) => isNum(p.v));
    if (art === "css") return ((D && D.css_tests) || []).concat(opt.lokal || []).filter((t) => isNum(FK.css(t.t400, t.t200)))
      .map((t) => ({ date: t.datum, v: +FK.css(t.t400, t.t200).toFixed(1), id: t.id, name: t.becken ? `${t.becken} m Becken` : "CSS-Test", q: { status: t.validiert === false ? "vorschau" : "bestätigt", becken: t.becken || null } }));
    return [];
  };
  /** Gemeinsamer Leistungswert zweier oder mehr Tests: 200 W, wenn alle ihn messen, sonst Mitte des gemeinsamen Bereichs (10-W-Raster). */
  FK.laktatFixX = function (tests) {
    const R = tests.map((t) => { const x = t.punkte.filter((p) => isNum(p.x) && isNum(p.la)).map((p) => p.x); return x.length >= 2 ? [Math.min(...x), Math.max(...x)] : null; });
    if (!R.length || R.some((r) => !r)) return null;
    const lo = Math.max(...R.map((r) => r[0])), hi = Math.min(...R.map((r) => r[1]));
    if (lo > hi) return null;
    return lo <= 200 && 200 <= hi ? 200 : Math.round((lo + hi) / 20) * 10;
  };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /**
   * Vergleich Zeitraum P gegen Referenz R mit Guards. Ergebnis: {status: verbessert|stabil|verschlechtert|unklar|nicht beurteilbar,
   * n, median, diff, ci90, streuung, ausgeschlossen, gruende, text, grenzen}. Deterministisch (fester Zufallsstartwert).
   */
  FK.entwicklung = function (metricId, punkte, P, R, opt) {
    opt = Object.assign({}, EW, opt || {});
    const M = FK.EW_METRIKEN[metricId] || { name: metricId, unit: "", besser: "tiefer", schwelle: 0, dec: 0 };
    const ex = { hitze: 0, hoehe: 0, drift: 0, vorschau: 0, ausreisser: 0 };
    const keep = (p) => {
      if (p.q && p.q.status === "vorschau") { ex.vorschau++; return false; }
      if (p.q && isNum(p.q.wx) && p.q.wx >= opt.hitze) { ex.hitze++; return false; }
      if (p.q && isNum(p.q.alt) && p.q.alt >= opt.hoehe) { ex.hoehe++; return false; }
      if (p.q && isNum(p.q.dhr) && Math.abs(p.q.dhr) > opt.dhrMax) { ex.drift++; return false; }
      return isNum(p.v);
    };
    const robust = (L) => {                                     // Ausreisser: mehr als 3 MAD (×1,4826) vom Median, erst ab 5 Werten
      if (L.length < 5) return L;
      const m = median(L.map((p) => p.v)), mad = median(L.map((p) => Math.abs(p.v - m))) * 1.4826;
      if (!mad) return L;
      const out = L.filter((p) => Math.abs(p.v - m) <= opt.madK * mad);
      ex.ausreisser += L.length - out.length;
      return out;
    };
    const inR = (p, r) => p.date >= r.von && p.date <= r.bis;
    const Pp = robust((punkte || []).filter((p) => inR(p, P)).filter(keep)), Rp = robust((punkte || []).filter((p) => inR(p, R)).filter(keep));
    const res = { v: FK.VERSIONS.entwicklung, metric: metricId, name: M.name, unit: M.unit, zeitraum: P, referenz: R, n: { P: Pp.length, R: Rp.length },
      punkte: { P: Pp, R: Rp }, ausgeschlossen: ex, schwelle: M.schwelle, gruende: [] };
    const fx = (v) => (isNum(v) ? (Math.round(v * 10 ** M.dec) / 10 ** M.dec).toFixed(M.dec) : "–");
    if (Pp.length < opt.minN || Rp.length < opt.minN) {
      res.status = "nicht beurteilbar";
      res.gruende.push(`zu wenige vergleichbare Messungen: ${Pp.length} im Zeitraum, ${Rp.length} in der Referenz (mindestens ${opt.minN} je Zeitraum)`);
      if (ex.vorschau) res.gruende.push(`${ex.vorschau} ${ex.vorschau === 1 ? "Wert ist" : "Werte sind"} noch Vorschau (nicht bestätigt)`);
      res.text = `${M.name}: keine ausreichenden vergleichbaren Daten (${Pp.length} gegen ${Rp.length}).`;
      return res;
    }
    const vP = Pp.map((p) => p.v), vR = Rp.map((p) => p.v), mP = median(vP), mR = median(vR), d = mP - mR;
    const r = rng(opt.seed || 20261108), boot = [];
    const pick = (v) => { const s = []; for (let i = 0; i < v.length; i++) s.push(v[Math.floor(r() * v.length)]); return median(s); };
    for (let b = 0; b < opt.boot; b++) boot.push(pick(vP) - pick(vR));
    const lo = quant(boot, 0.05), hi = quant(boot, 0.95), nullIn = lo <= 0 && hi >= 0;
    const besser = M.besser === "tiefer" ? d < 0 : d > 0;
    res.median = { P: mP, R: mR }; res.diff = d; res.ci90 = [lo, hi];
    res.streuung = { P: [quant(vP, 0.25), quant(vP, 0.75)], R: [quant(vR, 0.25), quant(vR, 0.75)] };
    res.prozent = mR ? Math.round((100 * d) / mR) : null;
    res.vorlaeufig = Math.min(Pp.length, Rp.length) < 6;           // wenige Messungen: Modellwert, nur vorläufig
    if (Math.abs(d) < M.schwelle && nullIn) res.status = "stabil";
    else if (!nullIn && Math.abs(d) >= M.schwelle) res.status = besser ? "verbessert" : "verschlechtert";
    else res.status = "unklar";
    const sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fx(Math.abs(v));
    res.text = `${M.name}: Median ${fx(mP)} ${M.unit} (n = ${Pp.length}) gegenüber ${fx(mR)} ${M.unit} (n = ${Rp.length}), Unterschied ${sg(d)} ${M.unit} ` +
      `(90-%-Intervall ${sg(lo)} bis ${sg(hi)}).`;
    res.urteil = { verbessert: M.besser === "tiefer" ? `tiefer bei gleicher Belastung` : "höher", stabil: "keine klare Veränderung",
      verschlechtert: "höher bei gleicher Belastung – mögliche Gründe: Ermüdung, Hitze, Krankheit, Messung (keine Diagnose)",
      unklar: "Veränderung möglich, aber nicht gesichert" }[res.status];
    if (Math.abs(d) >= M.schwelle && nullIn) res.gruende.push("Intervall schliesst 0 ein");
    if (Math.abs(d) < M.schwelle) res.gruende.push(`Unterschied unter der Messschwelle ${fx(M.schwelle)} ${M.unit}`);
    return res;
  };
  /**
   * Lauf-Effizienz (laufeffizienz-1.0): Meter pro Herzschlag = Tempo (m/min) / Puls (Schläge/min), mit Bewegungszeit.
   * Nur lockere Strassenläufe über opt.minKm, höchstens opt.maxHmKm Anstieg je km; GPS-/Pulsfehler und Ausreisser (> 3 MAD)
   * werden entfernt und gezählt. Explorativ: kein Fortschrittsnachweis.
   */
  FK.laufEffizienz = function (acts, opt) {
    opt = Object.assign({ n: 60, maxTssH: 70, minKm: 4, maxHmKm: 15 }, opt || {});
    const cand = (acts || []).filter((a) => a.sport === "lauf" && !a.indoor && !/trail/i.test(a.typ || "") && isNum(a.hr) && a.km > opt.minKm && (a.mv || a.dur)
      && (a.tss == null || !a.dur || a.tss / (a.dur / 3600) < opt.maxTssH) && (a.hm || 0) / a.km <= opt.maxHmKm).slice(-opt.n);
    const ex = { tempo: 0, puls: 0, ausreisser: 0 }, pts = [];
    for (const a of cand) {
      const v = (a.km * 1000) / (a.mv || a.dur);
      if (v < 1.8 || v > 5.5) { ex.tempo++; continue; }            // GPS-Sprung oder lange Gehpausen
      if (a.hr < 90 || a.hr > 195) { ex.puls++; continue; }          // Pulsaussetzer, Kadenz statt Puls
      pts.push({ date: a.date, id: a.id, name: a.name, y: +((v * 60) / a.hr).toFixed(3), mpm: +(v * 60).toFixed(1), hr: a.hr });
    }
    let keep = pts;
    if (pts.length >= 5) {
      const m = median(pts.map((p) => p.y)), mad = median(pts.map((p) => Math.abs(p.y - m))) * 1.4826;
      if (mad) { keep = pts.filter((p) => Math.abs(p.y - m) <= 3 * mad); ex.ausreisser = pts.length - keep.length; }
    }
    return { v: FK.VERSIONS.laufeffizienz, einheit: "m/Schlag", punkte: keep, ausgeschlossen: ex, n: cand.length };
  };
  /** Antwortfelder aus den Ergebnissen: deterministisch, keine Diagnose, keine Trainingsanweisung. */
  FK.entwicklungAntworten = function (ergebnisse) {
    const a1 = [], a2 = [], a3 = [], nb = [];
    const fx = (r, v) => { const M = FK.EW_METRIKEN[r.metric] || { dec: 0 }; const k = 10 ** M.dec, x = Math.round(v * k) / k; return { s: x > 0 ? "+" : x < 0 ? "−" : "±", v: Math.abs(x).toFixed(M.dec) }; };
    for (const r of ergebnisse) {
      const lab = r.label || r.name, vl = r.vorlaeufig ? ", vorläufig" : "", d = r.diff != null ? fx(r, r.diff) : null;
      if (r.status === "verbessert") a1.push(`${lab}: ${d.s}${d.v} ${r.unit} (n ${r.n.P} gegen ${r.n.R}${vl}), ${r.urteil}.`);
      else if (r.status === "stabil") a2.push(`${lab}: stabil (${d.s}${d.v} ${r.unit}, n ${r.n.P} gegen ${r.n.R}${vl}).`);
      else if (r.status === "unklar") a2.push(`${lab}: unklar (${d.s}${d.v} ${r.unit}, Intervall schliesst 0 ein; n ${r.n.P} gegen ${r.n.R}).`);
      else if (r.status === "verschlechtert") { a2.push(`${lab}: ${d.s}${d.v} ${r.unit} (n ${r.n.P} gegen ${r.n.R}${vl}), ${r.urteil}.`); a3.push(`${lab}: Kontext prüfen (Schlaf, Krankheit, Hitze, Belastung der letzten Wochen).`); }
      else { nb.push(`${r.kurz || lab} (${r.ausgeschlossen && r.ausgeschlossen.vorschau && !r.n.P && !r.n.R ? "Werte noch Vorschau" : r.n.P + r.n.R === 0 ? "keine Messung" : `${r.n.P} gegen ${r.n.R}`})`); if (r.naechstes) a3.push(r.naechstes); }
    }
    if (nb.length) a2.push(`Nicht beurteilbar: ${nb.join(", ")}.`);
    return { verbessert: a1, stabil: a2, pruefen: a3.slice(0, 3) };
  };

  /* ---------------- Fueling (fueling-1.0) ---------------- */
  /** Summen und Raten. Unbekannt bleibt unbekannt: fehlt eine Angabe, gibt es nur eine Untergrenze. */
  FK.fuelingTotals = function (entry, aktivSek) {
    if (!entry || entry.status === "nicht protokolliert") return { status: "nicht protokolliert", kh_g: null, wasser_ml: null, natrium_mg: null, koffein_mg: null, kh_g_h: null, ml_h: null, na_mg_h: null };
    const ev = entry.events || [];
    const sum = (k) => { let s = 0, unk = 0; for (const e of ev) { const v = e[k]; const f = isNum(e.anteil) ? e.anteil : 1; if (isNum(v)) s += v * f; else unk++; } return { s, unk }; };
    const kh = sum("kh_g"), wa = sum("wasser_ml"), na = sum("natrium_mg"), kf = sum("koffein_mg");
    const dur = isNum(entry.dauer_s) && entry.dauer_s > 0 ? entry.dauer_s : aktivSek;
    const h = isNum(dur) && dur > 0 ? dur / 3600 : null;
    const rate = (x) => (h ? +(x.s / h).toFixed(1) : null);
    const out = { status: ev.length ? "protokolliert" : "protokolliert: nichts eingenommen", dauer_s: dur ?? null, n_events: ev.length,
      kh_g: kh.unk ? null : +kh.s.toFixed(1), kh_min_g: +kh.s.toFixed(1), wasser_ml: wa.unk ? null : Math.round(wa.s), natrium_mg: na.unk ? null : Math.round(na.s), koffein_mg: kf.unk ? null : Math.round(kf.s),
      kh_g_h: kh.unk ? null : rate(kh), ml_h: wa.unk ? null : rate(wa), na_mg_h: na.unk ? null : rate(na),
      unvollstaendig: [kh.unk ? `KH bei ${kh.unk} Einträgen unbekannt` : null, wa.unk ? `Wasser bei ${wa.unk} Einträgen unbekannt` : null, na.unk ? `Natrium bei ${na.unk} Einträgen unbekannt` : null].filter(Boolean) };
    if (!h) out.unvollstaendig.push("aktive Dauer unbekannt: keine Raten");
    return out;
  };
  /** KH je 30-min-Block (Summe, nicht als Stundenrate zu lesen). */
  FK.fuelingBlocks = function (entry, dauer_s, block_min) {
    block_min = block_min || 30;
    const n = Math.max(1, Math.ceil((dauer_s || 0) / 60 / block_min));
    const out = Array.from({ length: n }, (_, i) => ({ von: i * block_min, bis: (i + 1) * block_min, kh_g: 0, wasser_ml: 0, unbekannt: 0 }));
    for (const e of (entry && entry.events) || []) {
      if (!isNum(e.t_min)) continue;
      const i = Math.min(n - 1, Math.floor(e.t_min / block_min));
      const f = isNum(e.anteil) ? e.anteil : 1;
      if (isNum(e.kh_g)) out[i].kh_g += e.kh_g * f; else out[i].unbekannt++;
      if (isNum(e.wasser_ml)) out[i].wasser_ml += e.wasser_ml * f;
    }
    return out.map((b) => ({ ...b, kh_g: +b.kh_g.toFixed(1), wasser_ml: Math.round(b.wasser_ml) }));
  };
  /** Was in den 60 min vor jeder Magen-Darm-Angabe eingenommen wurde (keine Kausalbehauptung). */
  FK.giContext = function (entry, fenster_min) {
    fenster_min = fenster_min || 60;
    return ((entry && entry.gi) || []).map((g) => {
      const ev = (entry.events || []).filter((e) => isNum(e.t_min) && e.t_min <= g.t_min && e.t_min > g.t_min - fenster_min);
      const kh = ev.reduce((s, e) => s + (isNum(e.kh_g) ? e.kh_g * (isNum(e.anteil) ? e.anteil : 1) : 0), 0);
      const ml = ev.reduce((s, e) => s + (isNum(e.wasser_ml) ? e.wasser_ml * (isNum(e.anteil) ? e.anteil : 1) : 0), 0);
      return { t_min: g.t_min, schwere: g.schwere, notiz: g.notiz || "", vorher_min: fenster_min, kh_g: +kh.toFixed(1), wasser_ml: Math.round(ml), produkte: ev.map((e) => e.produkt).filter(Boolean),
        hinweis: "zeitlicher Zusammenhang, keine Ursache" };
    });
  };
  /** Ein Ereignis aus einer Produktvorlage: die Werte werden kopiert (nur das Ereignis zählt, nie die Vorlage). */
  FK.eventFromProduct = function (p, t_min, anteil) {
    return { id: "e" + Math.round(t_min * 100) + "-" + (p.id || "x"), t_min, produkt: p.name, vorlage: p.id || null, art: p.art || "andere",
      kh_g: p.kh_g ?? null, wasser_ml: p.wasser_ml ?? null, natrium_mg: p.natrium_mg ?? null, koffein_mg: p.koffein_mg ?? null, anteil: isNum(anteil) ? anteil : 1 };
  };

  /* ---------------- Rad-Fahrzeit aus Physik (eta-1.0) ---------------- */
  const G = 9.80665;
  FK.rho = function (tempC, altM) { const p = 101325 * Math.pow(1 - 2.25577e-5 * (altM || 0), 5.25588); return p / (287.05 * ((isNum(tempC) ? tempC : 15) + 273.15)); };
  /** Leistung an der Kurbel für Tempo v (m/s). wind = Luftbewegung in Fahrtrichtung (m/s, Rückenwind positiv). */
  FK.powerAt = function (v, q) {
    const th = Math.atan(q.grade || 0), va = v - (q.wind || 0);
    return (q.m * G * (Math.sin(th) + q.crr * Math.cos(th)) * v + 0.5 * q.rho * q.cda * va * Math.abs(va) * v) / (q.eta || 0.976);
  };
  /** Tempo für Kurbelleistung P (Bisektion, monoton im Fahrbereich). 0 W auf Ebene → 0 (keine Fahrt). */
  FK.speedFromPower = function (P, q) {
    const vmax = q.vmax || 70 / 3.6;
    if (FK.powerAt(vmax, q) <= P) return vmax;           // so steil bergab, dass sogar vmax mit P erreicht wird
    if (FK.powerAt(0.05, q) >= P) return P <= 0 && FK.powerAt(0.05, q) >= 0 ? 0 : 0.05;
    let lo = 0.05, hi = vmax;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (FK.powerAt(mid, q) < P) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  /**
   * Fahrzeit über eine Strecke: pts [{d (m), ele (m)}], Abschnitte ≥ seg_m. q: {P, m, cda, crr, rho|temp, eta, wind (Gegenwind negativ), vmax (Abfahrt)}.
   * Ergebnis: Bewegungszeit; Pausen getrennt; Spanne aus Wind-Szenarien.
   */
  FK.routeTime = function (pts, q, opt) {
    opt = Object.assign({ seg_m: 200, pausen_min: 0, windSzen: [-2, 0, 2] }, opt || {});
    if (!pts || pts.length < 2) return null;
    const segs = [];
    let i0 = 0;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].d - pts[i0].d >= opt.seg_m || i === pts.length - 1) {
        const dd = pts[i].d - pts[i0].d;
        const dz = isNum(pts[i].ele) && isNum(pts[i0].ele) ? pts[i].ele - pts[i0].ele : null;
        segs.push({ d0: pts[i0].d, d: dd, grade: dz == null ? 0 : dz / dd, hoehe_fehlt: dz == null, ele: pts[i0].ele });
        i0 = i;
      }
    }
    const one = (wind) => {
      let t = 0; const out = [];
      for (const s of segs) {
        const rho = isNum(q.rho) ? q.rho : FK.rho(q.temp, s.ele || 0);
        const v = FK.speedFromPower(q.P, { ...q, grade: s.grade, rho, wind: (q.wind || 0) + wind });
        const dt = v > 0.3 ? s.d / v : Infinity;
        t += dt; out.push({ ...s, v, dt });
      }
      return { t, segs: out };
    };
    const runs = opt.windSzen.map((w) => ({ w, ...one(w) }));
    const base = runs.find((r) => r.w === 0) || runs[0];
    const ts = runs.map((r) => r.t).filter(isFinite);
    return { v: FK.VERSIONS.eta, bewegung_s: base.t, mit_pausen_s: base.t + opt.pausen_min * 60, spanne_s: ts.length ? [Math.min(...ts), Math.max(...ts)] : null,
      unmoeglich: !isFinite(base.t), abschnitte: base.segs, hoehe_fehlt: segs.some((s) => s.hoehe_fehlt), distanz_m: pts[pts.length - 1].d - pts[0].d };
  };

  /* ---------------- CdA aus Sekundenwerten: virtuelle Höhe nach Chung (cda-1.0) ---------------- */
  /** samples [{t, v (m/s), P (W), alt (m)}], q {m, crr, rho, eta}. Ergibt virtuelle Höhe je Sekunde. */
  FK.virtualElevation = function (samples, cda, q) {
    const ve = [samples[0].alt || 0];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      const dt = b.t - a.t;
      if (!(dt > 0 && dt <= 5) || !(a.v > 0.5) || !(b.v > 0.5)) { ve.push(ve[i - 1]); continue; }
      const v = (a.v + b.v) / 2, acc = (b.v - a.v) / dt;
      const P = (q.eta || 0.976) * ((a.P || 0) + (b.P || 0)) / 2;
      const va = v - (q.wind || 0);
      const slope = P / (q.m * G * v) - q.crr - acc / G - (0.5 * q.rho * cda * va * Math.abs(va)) / (q.m * G);
      ve.push(ve[i - 1] + slope * v * dt);
    }
    return ve;
  };
  /** CdA mit kleinster Abweichung zwischen virtueller und gemessener Höhe (je Abschnitt auf den Start ausgerichtet). */
  FK.fitCdA = function (samples, q, opt) {
    opt = Object.assign({ lo: 0.15, hi: 0.6, step: 0.0005 }, opt || {});
    const alt = samples.map((s) => s.alt);
    if (alt.some((x) => !isNum(x))) return { status: "nicht bestimmbar", grund: "Höhe fehlt in den Sekundenwerten" };
    let best = null;
    for (let c = opt.lo; c <= opt.hi + 1e-9; c += opt.step) {
      const ve = FK.virtualElevation(samples, c, q);
      let s = 0; for (let i = 0; i < ve.length; i++) s += (ve[i] - alt[i]) ** 2;
      const rmse = Math.sqrt(s / ve.length);
      if (!best || rmse < best.rmse) best = { cda: +c.toFixed(4), rmse };
    }
    const edge = best.cda <= opt.lo + opt.step || best.cda >= opt.hi - opt.step;
    return { status: edge ? "unsicher" : "geschätzt", cda: best.cda, rmse_m: +best.rmse.toFixed(3), hinweis: edge ? "am Rand des Suchbereichs: Wind, Rollwiderstand oder Leistungsmesser prüfen" : null };
  };
  /** A-B-A: CdA je Abschnitt und Unterschied B gegen Mittel der A; Stabilität aus |A1 − A2|. */
  FK.abaTest = function (parts, q) {
    const r = parts.map((p) => ({ name: p.name, ...FK.fitCdA(p.samples, q) }));
    const A = r.filter((x) => /^A/.test(x.name) && isNum(x.cda)), B = r.filter((x) => /^B/.test(x.name) && isNum(x.cda));
    if (A.length < 2 || !B.length) return { abschnitte: r, status: "unvollständig", grund: "mindestens A, B, A nötig" };
    const mA = mean(A.map((x) => x.cda)), mB = mean(B.map((x) => x.cda));
    const drift = Math.abs(A[0].cda - A[A.length - 1].cda);
    return { abschnitte: r, cda_a: +mA.toFixed(4), cda_b: +mB.toFixed(4), diff: +(mB - mA).toFixed(4), drift_a: +drift.toFixed(4),
      status: drift > 0.01 ? "Bedingungen nicht stabil" : Math.abs(mB - mA) <= drift ? "kein Unterschied über der Streuung" : "Unterschied über der Streuung" };
  };

  /* ---------------- Wetter je Aktivität: Qualität der Station (wetter-1.0) ---------------- */
  /** Stationen, die Garmin für Aktivitäten meldet (Flugplätze; Koordinaten gerundet). */
  FK.WX_STATIONS = {
    LSZS: [46.534, 9.884, 1707, "Samedan"], LSZL: [46.164, 8.879, 198, "Locarno"], LSZA: [46.004, 8.911, 279, "Lugano"], LSZH: [47.458, 8.548, 432, "Zürich"],
    LSZR: [47.485, 9.561, 398, "St. Gallen-Altenrhein"], LSZB: [46.914, 7.497, 510, "Bern"], LSGS: [46.219, 7.327, 482, "Sion"], LSGG: [46.238, 6.109, 411, "Genf"],
    LSZG: [47.181, 7.417, 430, "Grenchen"], LSMD: [47.398, 8.648, 448, "Dübendorf"], LSZC: [46.974, 8.396, 450, "Buochs"], LSMM: [46.743, 8.110, 575, "Meiringen"],
    LOWI: [47.260, 11.344, 581, "Innsbruck"], LIMC: [45.630, 8.723, 234, "Mailand-Malpensa"],
  };
  /** Wie gut passt die Station zum Ort der Aktivität? lonlat = Start [lon, lat]. Ohne Ort: «unbekannt». */
  FK.wxQuality = function (wx, lonlat) {
    if (!wx) return null;
    const st = FK.WX_STATIONS[wx.station_id];
    if (!st || !lonlat) return { stufe: "unbekannt", text: `Station ${wx.station_name || wx.station_id || "?"}; Entfernung unbekannt` };
    const r = Math.PI / 180, dLa = (lonlat[1] - st[0]) * r, dLo = (lonlat[0] - st[1]) * r;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(st[0] * r) * Math.cos(lonlat[1] * r) * Math.sin(dLo / 2) ** 2;
    const km = 2 * 6371 * Math.asin(Math.sqrt(x));
    const stufe = km <= 10 ? "gut" : km <= 25 && st[2] < 1000 ? "mittel" : "gering";
    return { stufe, km: Math.round(km), hoehe: st[2], text: `Station ${st[3]} (${st[2]} m), ca. ${Math.round(km)} km entfernt: Qualität ${stufe}${st[2] >= 1000 && km > 10 ? ", Bergstation" : ""}` };
  };

  /* ---------------- FIT lesen (Browser-Upload, fit-js-1.0) ---------------- */
  const FIT_EPOCH = 631065600;
  /** Liest record, lap, session und event aus einer FIT-Datei (ArrayBuffer). Entwicklerfelder werden übersprungen. */
  FK.parseFit = function (buf) {
    const dv = new DataView(buf);
    const hdr = dv.getUint8(0);
    const dataSize = dv.getUint32(4, true);
    const sig = String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11));
    if (sig !== ".FIT") throw new Error("keine FIT-Datei");
    let p = hdr;
    const end = hdr + dataSize;
    const defs = {};
    const out = { records: [], laps: [], sessions: [], events: [] };
    let lastTs = 0;
    const read = (bt, off, little, size) => {
      switch (bt & 0x1f) {
        case 0: case 2: case 10: case 13: return size === 1 ? dv.getUint8(off) : null;
        case 1: return dv.getInt8(off);
        case 3: return dv.getInt16(off, little);
        case 4: case 11: return dv.getUint16(off, little);
        case 5: return dv.getInt32(off, little);
        case 6: case 12: return dv.getUint32(off, little);
        case 8: return dv.getFloat32(off, little);
        case 9: return dv.getFloat64(off, little);
        default: return null;
      }
    };
    const INVALID = { 0: 0xff, 1: 0x7f, 2: 0xff, 3: 0x7fff, 4: 0xffff, 5: 0x7fffffff, 6: 0xffffffff, 10: 0x00, 11: 0x0000, 12: 0x00000000, 13: 0xff };
    while (p < end) {
      const h = dv.getUint8(p++);
      if (h & 0x80) {                                           // komprimierter Zeitstempel
        const lt = (h >> 5) & 3, off = h & 0x1f;
        const d = defs[lt];
        let ts = (lastTs & ~0x1f) + off; if (off < (lastTs & 0x1f)) ts += 0x20; lastTs = ts;
        const m = decode(d, p); p += d.size; m[253] = ts; emit(d.num, m);
        continue;
      }
      const lt = h & 0x0f;
      if (h & 0x40) {                                           // Definition
        p++; const arch = dv.getUint8(p++); const little = arch === 0;
        const num = dv.getUint16(p, little); p += 2;
        const nf = dv.getUint8(p++); const fields = []; let size = 0;
        for (let i = 0; i < nf; i++) { const f = { num: dv.getUint8(p), size: dv.getUint8(p + 1), bt: dv.getUint8(p + 2), off: size }; fields.push(f); size += f.size; p += 3; }
        if (h & 0x20) { const nd = dv.getUint8(p++); for (let i = 0; i < nd; i++) { size += dv.getUint8(p + 1); p += 3; } }
        defs[lt] = { num, little, fields, size };
      } else {
        const d = defs[lt];
        if (!d) throw new Error("FIT: Daten ohne Definition");
        const m = decode(d, p); p += d.size;
        if (m[253] != null) lastTs = m[253];
        emit(d.num, m);
      }
    }
    function decode(d, base) {
      const m = {};
      for (const f of d.fields) {
        const v = read(f.bt, base + f.off, d.little, f.size);
        const inv = INVALID[f.bt & 0x1f];
        if (v != null && v !== inv) m[f.num] = v;
      }
      return m;
    }
    function emit(num, m) {
      const t = m[253] != null ? m[253] + FIT_EPOCH : null;
      if (num === 20) {
        const spd = m[73] != null ? m[73] / 1000 : m[6] != null ? m[6] / 1000 : null;
        const alt = m[78] != null ? m[78] / 5 - 500 : m[2] != null ? m[2] / 5 - 500 : null;
        out.records.push({ t, power: m[7] ?? null, hr: m[3] || null, cad: m[4] ?? null, speed: spd, dist: m[5] != null ? m[5] / 100 : null, alt, temp: m[13] ?? null,
          lat: m[0] != null ? m[0] * (180 / 2 ** 31) : null, lon: m[1] != null ? m[1] * (180 / 2 ** 31) : null });
      } else if (num === 19) out.laps.push({ t_end: t, start: m[2] != null ? m[2] + FIT_EPOCH : null, elapsed: m[7] != null ? m[7] / 1000 : null, timer: m[8] != null ? m[8] / 1000 : null, intensity: m[23] ?? null });
      else if (num === 18) out.sessions.push({ start: m[2] != null ? m[2] + FIT_EPOCH : null, sport: m[5] ?? null, sub: m[6] ?? null, elapsed: m[7] != null ? m[7] / 1000 : null, timer: m[8] != null ? m[8] / 1000 : null });
      else if (num === 21) out.events.push({ t, event: m[0] ?? null, type: m[1] ?? null });
    }
    return out;
  };
  /** Stufenwerte in einem Zeitfenster [t0, t1] (Unix): Median-Leistung, Ø/max Puls, Puls letzte 60 s, Dauer, Abdeckung. */
  FK.windowStats = function (records, t0, t1, unit) {
    const r = records.filter((x) => x.t >= t0 && x.t <= t1);
    const dur = Math.max(0, t1 - t0);
    if (!r.length) return { n: 0, dauer_s: dur, abdeckung: 0 };
    const hr = r.map((x) => x.hr).filter((v) => isNum(v) && v > 0);
    const last60 = r.filter((x) => x.t > t1 - 60).map((x) => x.hr).filter((v) => isNum(v) && v > 0);
    const val = unit === "km/h" ? r.map((x) => (isNum(x.speed) ? x.speed * 3.6 : null)) : r.map((x) => x.power);
    return { n: r.length, dauer_s: dur, abdeckung: +(r.length / Math.max(1, dur + 1)).toFixed(2), x_median: median(val) != null ? +median(val).toFixed(unit === "km/h" ? 2 : 0) : null,
      x_mean: mean(val) != null ? +mean(val).toFixed(unit === "km/h" ? 2 : 1) : null, hr_mean: hr.length ? +mean(hr).toFixed(1) : null, hr_max: hr.length ? Math.max(...hr) : null,
      hr_60: last60.length ? +mean(last60).toFixed(1) : null, puls_abdeckung: +(hr.length / r.length).toFixed(2) };
  };
  /** Stufenfenster aus dem Protokoll: Teststart t0, je Stufe stufe_s; Verschiebungen je Stufe in s (von Hand korrigierbar). */
  FK.stageWindows = function (t0, n, stufe_s, shifts) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = (shifts && shifts[i]) || {};
      out.push({ nr: i + 1, t0: t0 + i * stufe_s + (s.start || 0), t1: t0 + (i + 1) * stufe_s + (s.ende || 0) });
    }
    return out;
  };
  /** Teststart aus der Leistung finden: erste Sekunde, ab der die erste Sollstufe 60 s gehalten wird (±8 %). */
  FK.findTestStart = function (records, firstTarget) {
    const ok = (p) => isNum(p) && Math.abs(p - firstTarget) <= Math.max(8, 0.08 * firstTarget);
    for (let i = 0; i < records.length; i++) {
      if (!ok(records[i].power)) continue;
      let good = 0, tot = 0;
      for (let j = i; j < records.length && records[j].t < records[i].t + 60; j++) { tot++; if (ok(records[j].power)) good++; }
      if (tot >= 50 && good / tot >= 0.85) return records[i].t;
    }
    return null;
  };

  return FK;
});
