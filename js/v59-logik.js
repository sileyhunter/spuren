/* Ironman Notebook – V5.9 Rechenlogik ohne DOM (Browser: window.V59L, Node: require).
 * befinden-1.1 (Morgen-Check-in, Gefühl gegen Morgenwerte), morgen-1.0 (Heute geplant), last-2.0 (Trainingslast mit LT2),
 * css-2.0 (Schwimmen nur mit CSS-Test). Grundsätze: fehlend bleibt fehlend (null), nie geschätzt; jede Zahl nennt ihre Quelle. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.V59L = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const L = {};
  L.VERSIONS = { befinden: "befinden-1.1", eingang: "eingang-1.0", morgen: "morgen-1.0", last: "last-2.0", css: "css-2.0", bedienung: "bedienung-1.0" };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  L.addDays = addDays;

  /* ======================= befinden-1.1: Morgen-Check-in ======================= */
  /** Drei Fragen mit je fünf Knöpfen. Sie füllen dieselben Felder wie das bisherige Befinden (die Bereitschaft rechnet unverändert):
   *  Beine → muskel (1 frisch … 5 schwer), Energie → muede (1 voll … 5 leer), Kopf → stress (1 ruhig … 5 gestresst). */
  L.FRAGEN = [
    { k: "muskel", label: "Beine", lo: "frisch", hi: "schwer" },
    { k: "muede", label: "Energie", lo: "voll", hi: "leer" },
    { k: "stress", label: "Kopf", lo: "ruhig", hi: "gestresst" },
  ];
  L.KRANK = ["Erkältung", "Halsweh", "Fieber", "Magen-Darm", "Verletzung"];
  /** Antworten → Befinden-Eintrag (nur gültige Werte 1–5; ohne alle drei kein Eintrag). */
  L.checkinEintrag = function (datum, w, extra) {
    extra = extra || {};
    const ok = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum)) || !L.FRAGEN.every((f) => ok(w && w[f.k]))) return null;
    const b = { date: datum, muede: w.muede, muskel: w.muskel, stress: w.stress, quelle: "checkin", v: L.VERSIONS.befinden, erfasst: extra.erfasst || new Date().toISOString() };
    if (extra.krank) b.krank = Array.isArray(extra.krank) && extra.krank.length ? extra.krank.slice() : ["krank oder verletzt"];
    if (extra.nachtdienst) b.nachtdienst = true;
    const n = String(extra.notiz || "").trim(); if (n) b.notiz = n.slice(0, 280);
    return b;
  };
  /** Gefühl 1–5 (5 = bestens): Mittel der drei Antworten, umgedreht. Fehlt eine Antwort → null. */
  L.gefuehl = function (b) {
    if (!b) return null;
    const v = L.FRAGEN.map((f) => b[f.k]);
    if (!v.every((x) => isNum(x) && x >= 1 && x <= 5)) return null;
    return 6 - v.reduce((s, x) => s + x, 0) / v.length;
  };
  /** Rangkorrelation nach Spearman (gleiche Werte → mittlerer Rang). Unter 3 Paaren null. */
  L.spearman = function (xs, ys) {
    const P = []; for (let i = 0; i < xs.length; i++) if (isNum(xs[i]) && isNum(ys[i])) P.push([xs[i], ys[i]]);
    if (P.length < 3) return null;
    const rang = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[o[k][1]] = m; i = j + 1; } return r; };
    const rx = rang(P.map((p) => p[0])), ry = rang(P.map((p) => p[1])), n = P.length, mx = (n + 1) / 2;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - mx; sxy += a * b; sxx += a * a; syy += b * b; }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
  };
  L.KAL = { min: 20, ref_tage: 60, ref_min: 14, brauchbar: 0.3 };
  /** Welcher Morgenwert passt bei dir am besten zum Gefühl? Erst ab 20 Morgen mit Check-in, nur Rangkorrelation (keine Prozente).
   *  HRV und Ruhepuls als Abweichung von deinen eigenen 60 Tagen davor (mind. 14 Werte), Schlaf = Garmin-Schlafwert der Nacht,
   *  Last = Trainingslast des Vortags (alle Sportarten). Erwartete Richtung: HRV/Schlaf +, Ruhepuls/Last −. */
  L.gefuehlKalibrierung = function (befinden, days, acts) {
    const B = (befinden || []).filter((b) => isNum(L.gefuehl(b))).sort((a, b) => a.date.localeCompare(b.date));
    const out = { v: L.VERSIONS.befinden, n: B.length, noetig: L.KAL.min, werte: [], bester: null };
    if (B.length < L.KAL.min) return out;
    const day = new Map((days || []).map((d) => [d.date, d])), dates = [...day.keys()].sort();
    const ref = (iso, k) => { const v = []; for (const d of dates) { if (d >= iso) break; if (d >= addDays(iso, -L.KAL.ref_tage)) { const x = day.get(d)[k]; if (isNum(x) && x > 0) v.push(k === "hrv" ? Math.log(x) : x); } } if (v.length < L.KAL.ref_min) return null; return v.reduce((s, x) => s + x, 0) / v.length; };
    const last = new Map(); for (const a of acts || []) if (isNum(a.tss)) last.set(a.date, (last.get(a.date) || 0) + a.tss);
    const rows = B.map((b) => {
      const d = day.get(b.date) || {}, rh = ref(b.date, "hrv"), rr = ref(b.date, "rhr");
      return { g: L.gefuehl(b), hrv: isNum(d.hrv) && d.hrv > 0 && rh != null ? Math.log(d.hrv) - rh : null, rhr: isNum(d.rhr) && rr != null ? d.rhr - rr : null,
        schlaf: isNum(d.sleepScore) ? d.sleepScore : null, last: last.has(addDays(b.date, -1)) ? last.get(addDays(b.date, -1)) : (dates.length ? 0 : null) };
    });
    for (const [k, label, richtung] of [["hrv", "HRV gegenüber deinen 60 Tagen", 1], ["rhr", "Ruhepuls gegenüber deinen 60 Tagen", -1], ["schlaf", "Schlafwert der Nacht", 1], ["last", "Trainingslast am Vortag", -1]]) {
      const p = rows.filter((r) => isNum(r[k]));
      const rho = p.length >= L.KAL.min ? L.spearman(p.map((r) => r[k]), p.map((r) => r.g)) : null;
      out.werte.push({ k, label, n: p.length, rho: isNum(rho) ? Math.round(rho * 100) / 100 : null, richtung, brauchbar: isNum(rho) && Math.abs(rho) >= L.KAL.brauchbar, erwartet: isNum(rho) ? Math.sign(rho) === richtung : null });
    }
    const gut = out.werte.filter((w) => w.brauchbar).sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
    out.bester = gut.length ? gut[0].k : null;
    return out;
  };

  /* ======================= morgen-1.0: Heute geplant ======================= */
  /** Einheiten aus dem Garmin-Kalender für einen Tag (mit ihrer Stelle in planned, für «Passende Route finden»). */
  L.geplantAm = function (planned, datum) {
    const out = [];
    (planned || []).forEach((p, i) => { if (p && p.date === datum) out.push({ i, p }); });
    return out;
  };
  /** Stand der Daten aus «updated» (TT.MM.JJJJ hh:mm, Zeit des letzten Updates): heute → «Stand 08:31», sonst mit Datum. */
  L.standText = function (updated, heuteISO) {
    const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2})/.exec(String(updated || ""));
    if (!m) return null;
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    return { iso, zeit: m[4], text: iso === heuteISO ? `Stand ${m[4]}` : `Stand ${m[1]}.${m[2]}. ${m[4]}`, heute: iso === heuteISO };
  };

  return L;
});
