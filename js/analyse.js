/* Ironman Notebook – V5.6 Analyse-Rechenkern (ohne DOM, in Node testbar).
 * Aktivitäts-Explorer (explorer-1.0): Reihe entpacken, Kennzahlen eines Abschnitts, NP, Drift, Intervalle, Blockvergleich.
 * Geplant/Ist (plan-1.0, aus tools/serien.py), Ermüdungsresistenz (ermuedung-1.0), RPE/Belastung (rpe-1.0),
 * Energie (energie-1.0), Saison (saison-1.0). Unbekannt bleibt unbekannt (null), nie 0. */
(function (root, factory) {
  const AN = factory(root.FK || (typeof require === "function" ? require("./formkurve.js") : null));
  if (typeof module === "object" && module.exports) module.exports = AN;
  root.AN = AN;
})(typeof window !== "undefined" ? window : globalThis, function (FK) {
  "use strict";
  const AN = {};
  AN.VERSIONS = { explorer: "explorer-1.0", intervalle: "intervalle-1.0", plan: "plan-1.0", ermuedung: "ermuedung-1.0", rpe: "rpe-1.0", energie: "energie-1.0", saison: "saison-1.0" };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const mean = (a) => { let s = 0, n = 0; for (const x of a) if (isNum(x)) { s += x; n++; } return n ? s / n : null; };
  const maxOf = (a) => { let m = null; for (const x of a) if (isNum(x) && (m == null || x > m)) m = x; return m; };
  const median = (a) => { const v = a.filter(isNum).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
  AN.util = { mean, median, isNum };

  /* ---------------- Reihe (serie-1.0) entpacken ---------------- */
  /** JSON aus tools/serien.py → {dt, t[], hr[], w[], cad[], v[] (m/s), alt[] (m), d[] (m), tw[], laps, len, wkt}. */
  AN.decode = function (R) {
    const dt = R.dt || 2, t = [];
    for (const [b0, n] of R.seg || []) for (let j = 0; j < n; j++) t.push((b0 + j) * dt);
    // Nur Listen sind Kanäle ("v" = Tempo in cm/s; die Formatversion steht unter "ver" – ein Text unter "v" wird nie als Kanal gelesen)
    const ch = (k, f) => (Array.isArray(R[k]) ? R[k].map((x) => (x == null ? null : f ? f(x) : x)) : null);
    return { id: R.id, sport: R.sport, dt, t0: R.t0, t, n: t.length, hr: ch("hr"), w: ch("w"), cad: ch("cad"), v: ch("v", (x) => x / 100),
      alt: ch("alt", (x) => x / 10), d: ch("d"), tw: ch("tw"), laps: R.laps || [], len: R.len || [], wkt: R.wkt || null };
  };
  /** Dateiname der Reihe in serien/: erste 24 Hex-Zeichen von SHA-256("<serien_salz>:<Aktivitäts-ID>") – gleich wie
   *  tools/serien_crypt.mjs. serien_salz steht nur verschlüsselt in den Daten, die Namen verraten also keine IDs. */
  AN.serieName = async function (salz, id) {
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salz}:${id}`)));
    return Array.from(h.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
  };
  /** Index der Probe zur Zeit ts (Sekunden ab Start), nächstgelegen. */
  AN.idxAt = function (S, ts) {
    const t = S.t; let lo = 0, hi = t.length - 1;
    if (!t.length) return -1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m] <= ts) lo = m; else hi = m; }
    return Math.abs(t[hi] - ts) < Math.abs(t[lo] - ts) ? hi : lo;
  };

  /* ---------------- Kennzahlen ---------------- */
  /** Normierte Leistung: 30-s-Mittel, 4. Potenz, Wurzel. Lücken (null) beenden das gleitende Fenster. */
  AN.np = function (w, dt) {
    const k = Math.max(1, Math.round(30 / (dt || 1))); let s = 0, q = [], acc = 0, n = 0;
    for (const x of w) {
      if (!isNum(x)) { s = 0; q = []; continue; }
      q.push(x); s += x; if (q.length > k) s -= q.shift();
      if (q.length === k) { acc += Math.pow(s / k, 4); n++; }
    }
    return n ? Math.pow(acc / n, 0.25) : null;
  };
  /** Höhenmeter mit Hysterese (gegen Rauschen). */
  AN.hm = function (alt, schwelle) {
    schwelle = schwelle || 2; let up = 0, down = 0, ref = null;
    for (const a of alt || []) { if (!isNum(a)) continue; if (ref == null) { ref = a; continue; } const d = a - ref; if (d >= schwelle) { up += d; ref = a; } else if (d <= -schwelle) { down -= d; ref = a; } }
    return { up, down };
  };
  /** Kennzahlen für den Abschnitt [i0, i1] (Indizes, einschliesslich). Für jede Grösse nur vorhandene Werte; fehlt sie, null. */
  AN.stats = function (S, i0, i1) {
    i0 = Math.max(0, i0 | 0); i1 = Math.min(S.n - 1, i1 == null ? S.n - 1 : i1 | 0);
    if (i1 < i0) return null;
    const sl = (a) => (a ? a.slice(i0, i1 + 1) : []), dt = S.dt;
    const w = sl(S.w), hr = sl(S.hr), v = sl(S.v), cad = sl(S.cad), alt = sl(S.alt), d = sl(S.d);
    const dauer = S.t[i1] - S.t[i0] + dt, bewegt = (S.v ? v.filter((x) => isNum(x) && x > 0.5).length : (S.w ? w.filter((x) => isNum(x) && x > 0).length : hr.filter(isNum).length)) * dt;
    const d0 = d.find(isNum), d1 = [...d].reverse().find(isNum), strecke = isNum(d0) && isNum(d1) ? d1 - d0 : null;
    const wm = S.w ? mean(w.map((x) => (isNum(x) ? x : null))) : null, np = S.w ? AN.np(w, dt) : null;
    const k30 = Math.max(1, Math.round(30 / dt));
    const hrA = mean(hr.slice(0, k30)), hrE = mean(hr.slice(-k30)), hrm = mean(hr);
    const halbe = (arr) => [arr.slice(0, arr.length >> 1), arr.slice(arr.length >> 1)];
    let drift = null, driftGrund = null;
    // Drift nur bei gleichmässiger Belastung sinnvoll: Rad VI ≤ 1.10, Laufen 30-s-Tempo mit Variationskoeffizient ≤ 15 %
    const vi0 = S.w && wm > 50 ? AN.np(w, dt) / wm : null;
    const vv = S.v ? v.filter(isNum) : [], vmean = vv.length ? vv.reduce((x, y) => x + y, 0) / vv.length : null;
    const vcv = vmean ? Math.sqrt(vv.reduce((x, y) => x + (y - vmean) ** 2, 0) / vv.length) / vmean : null;
    const gleich = S.w && wm > 50 ? isNum(vi0) && vi0 <= 1.10 : isNum(vcv) && vcv <= 0.15;
    if (!gleich) driftGrund = "nicht sinnvoll: Belastung ungleichmässig";
    else if (hr.filter(isNum).length > 0.8 * hr.length && hr.length * dt >= 600) {
      const [h1, h2] = halbe(hr), out = S.w && wm > 50 ? halbe(w) : S.v ? halbe(v) : null;
      if (out) { const e1 = mean(out[0]) / mean(h1), e2 = mean(out[1]) / mean(h2); if (isNum(e1) && isNum(e2) && e1 > 0) drift = 100 * (e1 - e2) / e1; }
    }
    const vm = S.v ? mean(v) : null, H = AN.hm(alt);
    return { i0, i1, von: S.t[i0], bis: S.t[i1] + dt, dauer, bewegt, strecke, w: wm, wmax: S.w ? maxOf(w) : null, np,
      vi: np && wm ? np / wm : null, hr: hrm, hrmax: maxOf(hr), hrA, hrE, dhr: isNum(hrA) && isNum(hrE) ? hrE - hrA : null,
      wproschlag: wm && hrm ? wm / hrm : null, drift, driftGrund, v: vm, vmax: S.v ? maxOf(v) : null,
      pace: vm && vm > 0.3 ? 1000 / vm : null, mproschlag: vm && hrm ? vm * 60 / hrm : null, cad: S.cad ? mean(cad.map((x) => (x > 0 ? x : null))) : null,
      hm_auf: S.alt ? H.up : null, hm_ab: S.alt ? H.down : null };
  };
  /** Zwei Abschnitte vergleichen: Differenz B − A je Kennzahl (nur, wo beide Werte vorhanden). */
  AN.vergleich = function (A, B) {
    const out = {};
    for (const k of ["dauer", "w", "np", "hr", "hrmax", "dhr", "wproschlag", "drift", "v", "pace", "mproschlag", "cad", "hm_auf"]) {
      out[k] = isNum(A[k]) && isNum(B[k]) ? B[k] - A[k] : null;
    }
    return out;
  };

  /* ---------------- Intervalle und Pausen (intervalle-1.0) ---------------- */
  /** Automatisch: Runden mit Workout-Schritt, sonst Abschnitte über 115 % des Medians (30-s-Mittel), ≥ 60 s,
   *  Lücken < 20 s überbrückt. Pausen: Zeitlücken ≥ 30 s (Timer gestoppt) und Stillstand ≥ 30 s. */
  AN.intervalle = function (S) {
    const out = [], dt = S.dt;
    if (S.laps && S.laps.some((L) => L.length > 3 && L[3] != null)) {
      for (const L of S.laps) { const i0 = AN.idxAt(S, L[0]), i1 = AN.idxAt(S, L[1] - dt); if (i1 > i0) out.push({ i0, i1, quelle: "Runde/Workout-Schritt", schritt: L[3], typ: ({ 1: "Pause", 2: "Einlaufen", 3: "Auslaufen", 4: "Erholung" }[L[2]]) || "Intervall" }); }
      return { liste: out, quelle: "Runden aus dem Workout" };
    }
    const sig = S.w && S.w.some((x) => x > 0) ? S.w : S.v;
    if (!sig) return { liste: [], quelle: "keine Leistungs- oder Tempodaten" };
    const k = Math.max(1, Math.round(30 / dt)), sm = [];
    let s = 0, q = [];
    for (const x of sig) { const y = isNum(x) ? x : 0; q.push(y); s += y; if (q.length > k) s -= q.shift(); sm.push(s / q.length); }
    const ref = median(sm.filter((x) => x > (sig === S.w ? 30 : 0.8)));
    if (!ref) return { liste: [], quelle: "zu wenig Bewegung" };
    const thr = ref * 1.15, minN = Math.round(60 / dt), gapN = Math.round(20 / dt);
    let i = 0;
    while (i < sm.length) {
      if (sm[i] < thr) { i++; continue; }
      let j = i, last = i;
      while (j < sm.length && (sm[j] >= thr || j - last <= gapN)) { if (sm[j] >= thr) last = j; j++; }
      if (last - i + 1 >= minN) out.push({ i0: Math.max(0, i - Math.round(k / 2)), i1: Math.min(S.n - 1, last - Math.round(k / 2)), quelle: "erkannt (> 115 % des Medians)", typ: "Intervall" });
      i = j;
    }
    return { liste: out, quelle: `erkannt: 30-s-Mittel über ${Math.round(thr)}${sig === S.w ? " W" : " m/s"} (115 % des Medians), ≥ 60 s` };
  };
  AN.pausen = function (S) {
    const out = [], dt = S.dt;
    for (let k = 1; k < S.n; k++) if (S.t[k] - S.t[k - 1] >= 30) out.push({ von: S.t[k - 1] + dt, bis: S.t[k], art: "Timer gestoppt" });
    if (S.v) { let st = null; for (let k = 0; k <= S.n; k++) { const still = k < S.n && isNum(S.v[k]) && S.v[k] < 0.3; if (still && st == null) st = k; if (!still && st != null) { if ((k - st) * dt >= 30) out.push({ von: S.t[st], bis: S.t[k - 1] + dt, art: "Stillstand" }); st = null; } } }
    return out.sort((a, b) => a.von - b.von);
  };
  /** Manuelle Korrektur anwenden: {zeiten: [[von, bis, typ]]} ersetzt die automatische Liste ganz. */
  AN.mitKorrektur = function (S, auto, korr) {
    if (!korr || !korr.zeiten) return auto;
    return { liste: korr.zeiten.map(([a, b, typ]) => ({ i0: AN.idxAt(S, a), i1: AN.idxAt(S, b), quelle: "von Hand", typ: typ || "Intervall" })).filter((x) => x.i1 > x.i0), quelle: "von Hand korrigiert" };
  };

  /* ---------------- Laktat einem Abschnitt zuordnen ---------------- */
  /** Messpunkt zur Zeit ts: Abschnitt = das Intervall, das ts enthält oder direkt davor endet (≤ 60 s), sonst die letzten 5 min. */
  AN.laktatAbschnitt = function (S, ts, liste) {
    const hit = (liste || []).find((x) => S.t[x.i0] <= ts && ts <= S.t[x.i1] + S.dt) || (liste || []).filter((x) => S.t[x.i1] <= ts && ts - S.t[x.i1] <= 60).pop();
    if (hit) return { i0: hit.i0, i1: hit.i1, grund: "Intervall, in dem oder direkt nach dem gemessen wurde" };
    const i1 = AN.idxAt(S, ts), i0 = AN.idxAt(S, ts - 300);
    return { i0, i1, grund: "letzte 5 min vor der Messung (kein Intervall gefunden)" };
  };

  /* ---------------- Ermüdungsresistenz (ermuedung-1.0) ---------------- */
  /** Je Fahrt: Puls bei gleicher Leistung früh (Start < 90 min) gegenüber spät (Start ≥ 150 min), Leistung ±10 W. */
  AN.ermuedungRad = function (fr) {
    if (!fr || !fr.bl) return null;
    const fr1 = fr.bl.filter((b) => b[0] < 90), sp = fr.bl.filter((b) => b[0] >= 150);
    let best = null;
    for (const a of fr1) for (const b of sp) { const dw = Math.abs(b[1] - a[1]); if (dw <= 10 && (!best || dw < best.dw)) best = { dw, frueh: a, spaet: b }; }
    if (!best) return { status: "nicht vergleichbar", grund: fr1.length && sp.length ? "keine Blöcke mit ähnlicher Leistung (±10 W) früh und spät" : "kein gleichmässiger Block früh und spät (≥ 2.5 h)" };
    const d = best.spaet[2] - best.frueh[2];
    return { status: "ok", dhr: d, frueh: best.frueh, spaet: best.spaet, ef_frueh: best.frueh[1] / best.frueh[2], ef_spaet: best.spaet[1] / best.spaet[2],
      ef_rel: (best.spaet[1] / best.spaet[2]) / (best.frueh[1] / best.frueh[2]) - 1 };
  };
  AN.ermuedungLauf = function (fr) {
    if (!fr || !fr.bl) return null;
    const fr1 = fr.bl.filter((b) => b[0] < 40), sp = fr.bl.filter((b) => b[0] >= 60);
    let best = null;
    for (const a of fr1) for (const b of sp) { const dp = Math.abs(b[1] - a[1]); if (dp <= 10 && (!best || dp < best.dp)) best = { dp, frueh: a, spaet: b }; }
    if (!best) return { status: "nicht vergleichbar", grund: "kein gleichmässiger flacher Block früh (< 40 min) und spät (≥ 60 min) im gleichen Tempo (±10 s/km)" };
    return { status: "ok", dhr: best.spaet[2] - best.frueh[2], frueh: best.frueh, spaet: best.spaet };
  };
  /** Leistung nach X Stunden relativ zur frischen besten 20-min-Leistung derselben Fahrt (nur Fahrten, die so lange dauerten). */
  AN.dauerleistung = function (fr) {
    if (!fr || !fr.p20 || !isNum(fr.p20[0])) return null;
    const [p0, p2, p3, p4, p5] = fr.p20;
    const rel = (p) => (isNum(p) ? p / p0 : null);
    return { p0, nach: { 2: p2, 3: p3, 4: p4, 5: p5 }, rel: { 2: rel(p2), 3: rel(p3), 4: rel(p4), 5: rel(p5) } };
  };

  /** Frühere Ausführungen desselben Workouts (gleicher Name): Hauptteil (längster aktiver Schritt) Ø W bzw. Pace und Puls. */
  AN.hauptteil = (W) => (W && W.schritte ? W.schritte.filter((r) => r.typ === "aktiv" || r.typ === "intervall").sort((x, y) => (y.ist_s || 0) - (x.ist_s || 0))[0] || null : null);
  AN.gleicheEinheiten = function (acts, a) {
    const norm = (x) => String(x || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!a || !a.wk || !a.wk.name) return [];
    return (acts || []).filter((b) => b !== a && b.wk && b.sport === a.sport && norm(b.wk.name) === norm(a.wk.name) && b.date < a.date)
      .sort((x, y) => y.date.localeCompare(x.date)).map((b) => {
        const h = AN.hauptteil(b.wk);
        const wert = h ? (isNum(h.w) && b.sport === "rad" ? `${Math.round(h.w)} W` : isNum(h.v) && h.v > 0 ? `${Math.floor(1000 / h.v / 60)}:${String(Math.round((1000 / h.v) % 60)).padStart(2, "0")} /km` : null) : null;
        return { id: b.id, date: b.date, haupt: h, text: h ? `${wert || "–"} bei ${isNum(h.hr) ? h.hr + " bpm" : "– bpm"}${isNum(h.im_ziel) ? `, ${h.im_ziel} % im Ziel` : ""}` : "ohne Hauptteil" };
      });
  };

  /* ---------------- Subjektiv (rpe-1.0) ---------------- */
  /** Session-RPE (Foster): RPE × Bewegungsminuten. */
  AN.srpe = (rpe, mv_s) => (isNum(rpe) && isNum(mv_s) ? Math.round(rpe * mv_s / 60) : null);
  /** Individueller Zusammenhang Morgenwert ↔ RPE (Spearman), erst ab n ≥ 20 Einträgen mit beiden Werten. */
  AN.rang = function (xs, ys) {
    const n = xs.length; if (n < 3) return null;
    const rk = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(n); for (let i = 0; i < n;) { let j = i; while (j + 1 < n && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
    const rx = rk(xs), ry = rk(ys), mx = mean(rx), my = mean(ry);
    let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  };

  /* ---------------- Energie (energie-1.0) ---------------- */
  /** Rad: Arbeit kJ = Ø W × Bewegungszeit; Energieverbrauch kcal ≈ kJ × 1/(4.184 × 0.22…0.25) (Bruttowirkungsgrad, Annahme).
   *  Ohne Leistung: Garmin-Kalorien, falls vorhanden; sonst unbekannt. Nie erfunden: Herkunft immer dabei. */
  AN.energie = function (a, garminKcal) {
    if (a && a.sport === "rad" && isNum(a.watt) && isNum(a.mv || a.dur)) {
      const kj = a.watt * (a.mv || a.dur) / 1000;
      return { kj: Math.round(kj), kcal: [Math.round(kj / (4.184 * 0.25)), Math.round(kj / (4.184 * 0.22))], quelle: "aus Leistung (Ø W × Bewegungszeit), Wirkungsgrad 22–25 % angenommen" };
    }
    if (isNum(garminKcal)) return { kcal: [garminKcal, garminKcal], quelle: "Garmin-Schätzung (Puls, Profil)" };
    return { kcal: null, quelle: "unbekannt" };
  };

  /* ---------------- Saison (saison-1.0) ---------------- */
  /** Phasen rückwärts vom Hauptwettkampf: Taper 2 Wochen, Wettkampfspezifisch 8, Aufbau 2 × 8, Grundlage bis heute; B-Rennen mit
   *  Mini-Taper 1 Woche und 1 Woche Erholung. Erholungswoche alle 4 Wochen (3:1). Nur Vorschlag, frei änderbar. */
  AN.saison = function (heute, rennen, opt) {
    opt = Object.assign({ taper: 2, spezifisch: 8, aufbau: 16, rhythmus: 4 }, opt || {});
    const A = (rennen || []).filter((r) => r.prio !== "C").sort((x, y) => x.date.localeCompare(y.date));
    const haupt = A.find((r) => r.prio === "A") || A[A.length - 1];
    if (!haupt || !FK) return null;
    const wk = (d) => FK.addDays(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7));   // Montag der Woche
    const ziel = wk(haupt.date), w0 = wk(heute), wochen = [];
    for (let d = w0; d <= ziel; d = FK.addDays(d, 7)) wochen.push(d);
    const N = wochen.length, rest = (i) => N - 1 - i;
    const phase = (i) => (rest(i) < opt.taper ? "Taper" : rest(i) < opt.taper + opt.spezifisch ? "Wettkampfspezifisch" : rest(i) < opt.taper + opt.spezifisch + opt.aufbau ? "Aufbau" : "Grundlage");
    const out = wochen.map((d, i) => ({ woche: d, phase: phase(i), erholung: false, rennen: (rennen || []).filter((r) => r.date >= d && r.date <= FK.addDays(d, 6)).map((r) => r.short || r.name) }));
    let seit = 0;
    for (let i = 0; i < out.length; i++) {
      const w = out[i];
      if (w.phase === "Taper") continue;
      const b = A.find((r) => r !== haupt && r.date >= w.woche && r.date <= FK.addDays(w.woche, 6));
      if (b) { w.phase = "B-Rennen (Mini-Taper)"; if (out[i + 1] && out[i + 1].phase !== "Taper") { out[i + 1].erholung = true; out[i + 1].grund = "nach " + (b.short || b.name); i++; } seit = 0; continue; }
      seit++;
      if (seit === opt.rhythmus) { w.erholung = true; w.grund = `${opt.rhythmus - 1}:1-Rhythmus`; seit = 0; }
    }
    return { haupt, wochen: out, regel: AN.VERSIONS.saison, annahmen: `Taper ${opt.taper} Wochen, wettkampfspezifisch ${opt.spezifisch}, Aufbau ${opt.aufbau}, Erholung jede ${opt.rhythmus}. Woche, B-Rennen mit Mini-Taper und Erholungswoche danach` };
  };
  /** Ist-Stunden je Woche und Sportart (Bewegungszeit) aus den Aktivitäten. */
  AN.wochenIst = function (acts, von, bis) {
    const m = new Map();
    for (const a of acts || []) {
      if (a.date < von || a.date > bis) continue;
      const d = new Date(a.date + "T12:00:00Z"), mo = FK.addDays(a.date, -((d.getUTCDay() + 6) % 7));
      const r = m.get(mo) || { rad: 0, lauf: 0, schwimm: 0, andere: 0, tss: 0, lang: 0, koppel: 0 };
      const h = (a.mv || a.dur || 0) / 3600, k = ["rad", "lauf", "schwimm"].includes(a.sport) ? a.sport : "andere";
      r[k] += h; r.tss += a.tss || 0;
      if ((a.sport === "rad" && h >= 3) || (a.sport === "lauf" && h >= 1.5)) r.lang++;
      m.set(mo, r);
    }
    return m;
  };
  return AN;
});
