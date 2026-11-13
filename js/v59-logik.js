/* Ironman Notebook – V5.9 Rechenlogik ohne DOM (Browser: window.V59L, Node: require).
 * befinden-2.0 (Morgen-Check-in mit vier Fragen und sieben Stufen, Gefühl gegen Morgenwerte; V6.3), morgen-1.0 (Heute geplant), last-2.0 (Trainingslast mit LT2),
 * css-2.0 (Schwimmen nur mit CSS-Test). Grundsätze: fehlend bleibt fehlend (null), nie geschätzt; jede Zahl nennt ihre Quelle. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./v62.js"));
  else root.V59L = factory(root.V62);
})(typeof self !== "undefined" ? self : this, function (V62) {
  "use strict";
  const L = {};
  L.VERSIONS = { befinden: "befinden-2.0", eingang: "eingang-1.0", morgen: "morgen-1.0", last: "last-2.0", css: "css-2.0", bedienung: "bedienung-1.0" };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  L.addDays = addDays;

  /* ======================= befinden-2.0: Morgen-Check-in (V6.3, Etappe 3) ======================= */
  /** Vier Fragen mit sieben Stufen: 1 = sehr gut … 4 = durchschnittlich … 7 = sehr schlecht (Türkis → Pink). Felder: schlaf (neu), muede,
   *  muskel, stress, dazu skala: 7. Ältere Einträge (befinden-1.1: drei Fragen, 1–5, ohne skala) bleiben unverändert; gerechnet wird mit dem
   *  Anteil auf der eigenen Skala (L.befindenAnteil: 0 = bestens, 1 = schlechteste Stufe), so passen alte und neue Einträge zusammen. */
  L.SKALA = 7;
  L.FRAGEN = [
    { k: "schlaf", label: "Schlaf", lo: "erholsam", hi: "unruhig", text: "Wie erholsam war deine Nacht?" },
    { k: "muede", label: "Energie", lo: "viel", hi: "wenig", text: "Wie viel Energie hast du?" },
    { k: "muskel", label: "Beine", lo: "frisch", hi: "schwer", text: "Wie fühlen sich deine Beine an?" },
    { k: "stress", label: "Kopf", lo: "ruhig", hi: "gestresst", text: "Wie ruhig ist dein Kopf?" },
  ];
  L.KERN = ["muede", "muskel", "stress"];               // in befinden-1.1 und 2.0 vorhanden
  L.KRANK = ["Erkältung", "Halsweh", "Fieber", "Magen-Darm", "Verletzung"];
  /** Wort zu einer Stufe (7er-Skala): sehr frisch, frisch, eher frisch, durchschnittlich, eher schwer, schwer, sehr schwer. */
  L.wort = (f, v) => (v === 4 ? "durchschnittlich" : v === 1 ? "sehr " + f.lo : v === 7 ? "sehr " + f.hi : v === 2 ? f.lo : v === 6 ? f.hi : v === 3 ? "eher " + f.lo : v === 5 ? "eher " + f.hi : "–");
  /** Wort zu einem gespeicherten Wert auf der Skala des Eintrags (alte Einträge 1–5: frisch, eher frisch, mittel, eher schwer, schwer). */
  L.wortVon = function (b, f) {
    const v = b ? b[f.k] : null;
    if (!Number.isInteger(v)) return "";
    if (L.skalaVon(b) === 7) return L.wort(f, v);
    return v === 1 ? f.lo : v === 5 ? f.hi : v === 3 ? "mittel" : v < 3 ? "eher " + f.lo : "eher " + f.hi;
  };
  /** Skala eines Eintrags: 7 bei befinden-2.0 (skala: 7), sonst 5 (befinden-1.0/1.1). */
  L.skalaVon = (b) => (b && (b.skala === 7 || b.v === "befinden-2.0") ? 7 : 5);
  /** Anteil auf der Skala (0 = bestens … 1 = schlechteste Stufe); ungültig oder fehlend → null. */
  L.befindenAnteil = function (b, k) {
    const sk = L.skalaVon(b), v = b ? b[k] : null;
    return Number.isInteger(v) && v >= 1 && v <= sk ? (v - 1) / (sk - 1) : null;
  };
  /** Antworten → Befinden-Eintrag (alle vier Fragen 1–7; sonst kein Eintrag). */
  L.checkinEintrag = function (datum, w, extra) {
    extra = extra || {};
    const ok = (v) => Number.isInteger(v) && v >= 1 && v <= L.SKALA;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum)) || !L.FRAGEN.every((f) => ok(w && w[f.k]))) return null;
    const b = { date: datum, schlaf: w.schlaf, muede: w.muede, muskel: w.muskel, stress: w.stress, skala: L.SKALA, quelle: "checkin", v: L.VERSIONS.befinden,
      erfasst: extra.erfasst || new Date().toISOString() };
    if (extra.krank) b.krank = Array.isArray(extra.krank) && extra.krank.length ? extra.krank.slice() : ["krank oder verletzt"];
    if (extra.nachtdienst) b.nachtdienst = true;
    const n = String(extra.notiz || "").trim(); if (n) b.notiz = n.slice(0, 280);
    return b;
  };
  /** Gefühl 1–5 (5 = bestens) aus dem mittleren Anteil aller beantworteten Fragen; die drei Kernfragen müssen da sein (sonst null).
   *  Für befinden-1.1 identisch mit früher: 6 − Mittel der drei Antworten. */
  L.gefuehl = function (b) {
    if (!b || !L.KERN.every((k) => L.befindenAnteil(b, k) != null)) return null;
    const a = L.FRAGEN.map((f) => L.befindenAnteil(b, f.k)).filter((x) => x != null);
    return 5 - 4 * (a.reduce((s, x) => s + x, 0) / a.length);
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

  /* ======================= last-2.0: Trainingslast mit LT2 (Rechnung in tools/last.py, hier nur Anzeige) ======================= */
  /** LT2-Referenz für ein Datum wie tools/last.py → { r, vorErstem } (r = null ohne Referenz). */
  L.lastRef = function (cfg, datum) {
    const lst = ((((cfg || {}).last_ref) || {}).rad || []).slice().sort((a, b) => a.ab.localeCompare(b.ab));
    if (!lst.length) return { r: null, vorErstem: false };
    const davor = lst.filter((x) => x.ab <= datum);
    return davor.length ? { r: davor[davor.length - 1], vorErstem: false } : { r: lst[0], vorErstem: true };
  };
  const montag = (iso) => { const d = new Date(iso + "T12:00:00Z"), w = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - w); return d.toISOString().slice(0, 10); };
  L.montag = montag;
  /** Vergleich je Woche (ISO-Montag) und Sportart wie tools/last.py vergleich(): [bisher, neu] mit bisher = tss wie geliefert
   *  (tss0, falls die Seite tss schon ersetzt hat), neu = tl2 (fehlt → bisher). Ergebnis: je Woche { sport: [bisher, neu] }. */
  L.lastVergleich = function (acts, wochen) {
    const out = wochen.map(() => ({}));
    for (const a of acts || []) {
      const k = a && a.date ? wochen.indexOf(montag(a.date)) : -1;
      if (k < 0) continue;
      const alt = isNum(a.tss0) ? a.tss0 : isNum(a.tss) ? a.tss : 0, neu = isNum(a.tl2) ? a.tl2 : alt, s = a.sport || "andere";
      const r = (out[k][s] = out[k][s] || [0, 0]); r[0] += alt; r[1] += neu;
    }
    return out;
  };

  /* ======================= css-2.0: Testkalender mit CSS-Tests (Schwimmen, E6) ======================= */
  const tage = (a, b) => Math.abs(Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5;
  L.tageAbstand = tage;
  L.TEST_TOLERANZ_TAGE = 4;
  /** Testkalender mit Status: Laktat-Tests (stufentest, check) erledigt durch einen Laktat-Eintrag gleicher Art, CSS-Tests durch einen
   *  eingetragenen CSS-Test (Feld datum) – jeweils höchstens 4 Tage neben dem geplanten Datum. Stufentests nur durch einen Test derselben
   *  Sportart (Audit V6.4 B20); jeder Test bekommt seine Sportart (V62.testSport, B6), auch wenn sie im Testkalender fehlt. */
  L.testsMitStatus = function (tests, lactate, css) {
    return (tests || []).map((t) => {
      const sport = V62 && V62.testSport ? V62.testSport(t) : t.sport || null;
      const sporten = V62 && V62.testSporten ? V62.testSporten(t) : [t.sport || "rad"];
      const nah = (l) => l && l.kind === t.kind && l.date && tage(l.date, t.date) <= L.TEST_TOLERANZ_TAGE;
      let hit;
      if (t.kind === "css") hit = (css || []).find((c) => c && c.datum && tage(c.datum, t.date) <= L.TEST_TOLERANZ_TAGE);
      else if (t.kind !== "stufentest") hit = (lactate || []).find(nah);
      else {                                                   // Stufentest: je Sportart ein Test derselben Sportart (gemeinsamer Test: beide)
        const je = sporten.map((sp) => (lactate || []).find((l) => nah(l) && (l.sport || "rad") === sp));
        hit = je.every(Boolean) ? je.sort((x, y) => String(y.date).localeCompare(String(x.date)))[0] : null;
      }
      return Object.assign({}, t, { sport: sport || t.sport, done: !!hit, doneDate: hit ? hit.datum || hit.date : undefined });
    });
  };
  /** Geplante CSS-Tests mit Status und der nächste offene ab heute (für die CSS-Karte und «Meine Entwicklung»). */
  L.cssPlan = function (tests, css, heuteISO) {
    const liste = L.testsMitStatus((tests || []).filter((t) => t.kind === "css"), [], css).sort((a, b) => a.date.localeCompare(b.date));
    return { liste, naechster: liste.find((t) => !t.done && t.date >= heuteISO) || null };
  };

  /* ======================= morgen-1.0: Heute geplant ======================= */
  /** Einheiten aus dem Garmin-Kalender für einen Tag (mit ihrer Stelle in planned, für «Passende Route finden»). */
  L.geplantAm = function (planned, datum) {
    const out = [];
    (planned || []).forEach((p, i) => { if (p && p.date === datum) out.push({ i, p }); });
    return out;
  };
  /** Stand der Daten aus «updated» (TT.MM.JJJJ hh:mm, Zeit des letzten Updates): heute → «Stand 08:31», sonst mit Datum. */
  L.standText = function (updated, heuteISO, lauf) {
    const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2})/.exec(String(updated || ""));
    if (!m) return null;
    const iso = `${m[3]}-${m[2]}-${m[1]}`, wann = iso === heuteISO ? m[4] : `${m[1]}.${m[2]}. ${m[4]}`;
    return { iso, zeit: m[4], text: `Stand ${wann}${lauf ? ` (${lauf})` : ""}`, heute: iso === heuteISO };
  };

  return L;
});
