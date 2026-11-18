/* V7.8 (Auftrag V7.3, Etappe 4, Teil 1): Kalender als durchlaufende Liste mit Zwei-Wochen-Raster (kalender-4.0) und Trainingsstatus je Tag
   (trainingsstatus-1.0). Ohne DOM; im Browser window.V78, in Node require("./v78.js").

   trainingsstatus-1.0 (wie die Vorlage enduco: Ermüdung ÷ Fitness): Verhältnis der kurzfristigen zur langfristigen Last (ATL ÷ CTL desselben Modells
   wie Fitness und Ermüdung, pmc-2.1). Stufen als Orientierung (eigene Festlegung, angelehnt an das Verhältnis akuter zu chronischer Last, das als
   Verletzungsmarker umstritten ist): unter 0,8 wenig Last, 0,8–1,3 üblich, 1,3–1,5 hoch, über 1,5 sehr hoch. Ohne Fitness ab 1 keine Zahl. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V78 = factory();
  if (node) module.exports = V78;
  if (root) root.V78 = V78;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V78 = { VERSIONS: { kalender: "kalender-4.0", status: "trainingsstatus-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const pd = (s) => new Date(s + "T12:00:00Z");
  const iso = (d) => d.toISOString().slice(0, 10);
  const add = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  V78.montag = (s) => add(s, -((pd(s).getUTCDay() + 6) % 7));
  const TAG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  const MONAT = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  /* ---------------- Trainingsstatus (trainingsstatus-1.0) ---------------- */
  V78.STUFEN = [[0.8, "wenig", "wenig Last"], [1.3, "ueblich", "üblich"], [1.5, "hoch", "hoch"], [Infinity, "sehr", "sehr hoch"]];
  /** Ermüdung ÷ Fitness, auf zwei Stellen; ohne Fitness ab 1 null. */
  V78.status = (fitness, ermuedung) => (isNum(fitness) && fitness >= 1 && isNum(ermuedung) && ermuedung >= 0 ? Math.round((ermuedung / fitness) * 100) / 100 : null);
  /** Stufe eines Status: { k, text, anteil (0–1 auf der Skala bis 2) }. */
  V78.stufe = function (s) {
    if (!isNum(s)) return null;
    const x = V78.STUFEN.find(([g]) => s < g) || V78.STUFEN[V78.STUFEN.length - 1];
    return { k: x[1], text: x[2], anteil: Math.max(0, Math.min(1, s / 2)) };
  };
  /** Veränderung zum Vortag (gerundet) und Text mit Vorzeichen. */
  V78.delta = (heute, vortag, stellen) => {
    if (!isNum(heute) || !isNum(vortag)) return null;
    const f = Math.pow(10, stellen || 0), d = Math.round((heute - vortag) * f) / f;
    return { d, text: (d > 0 ? "+" : d < 0 ? "−" : "±") + String(Math.abs(d)).replace(".", ",") };
  };

  /* ---------------- Kalender (kalender-4.0) ---------------- */
  /** Wochen (Montage) für die durchlaufende Liste: vor Wochen zurück und nach Wochen voraus ab der Woche von heute. */
  V78.wochen = function (heute, vor, nach) {
    const mo = V78.montag(heute), out = [];
    for (let i = -(vor || 0); i <= (nach || 0); i++) out.push(add(mo, 7 * i));
    return out;
  };
  /** Raster: n Wochen ab der Woche von ds (2 = zusammengeklappt, 6 = Monat), je Woche Montag und Tage. */
  V78.raster = function (ds, n) {
    const mo = V78.montag(ds), out = [];
    for (let w = 0; w < (n || 2); w++) { const m = add(mo, 7 * w); out.push({ montag: m, tage: Array.from({ length: 7 }, (_, i) => add(m, i)) }); }
    return out;
  };
  /** Raster als Monat: die Wochen, die den Monat von ds berühren (vier bis sechs). */
  V78.monatsRaster = function (ds) {
    const d = pd(ds), erster = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))), letzter = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    const out = []; for (let m = V78.montag(erster); m <= letzter; m = add(m, 7)) out.push({ montag: m, tage: Array.from({ length: 7 }, (_, i) => add(m, i)) });
    return out;
  };
  V78.tagText = (ds) => { const d = pd(ds); return `${TAG[d.getUTCDay()]}, ${d.getUTCDate()}. ${MON[d.getUTCMonth()]}`; };
  V78.monatText = (ds) => { const d = pd(ds); return `${MONAT[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  V78.bereichText = (mo) => { const a = pd(mo), b = pd(add(mo, 6)); return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}.–${b.getUTCDate()}. ${MON[b.getUTCMonth()]}` : `${a.getUTCDate()}. ${MON[a.getUTCMonth()]} – ${b.getUTCDate()}. ${MON[b.getUTCMonth()]}`; };
  /** Kopf einer Woche: «Phase | Wochenart» (Vorlage «Build | Belastung 3»), ohne Angaben nur die Phase oder «Woche». */
  V78.wochenTitel = (phase, art) => [phase || null, art && art.text ? art.text : null].filter(Boolean).join(" | ") || "Woche";
  /** Zeile «1:52 h · ≈ 47,6 km · TL ≈ 101» einer Einheit aus Dauer (min) und Schätzung (V66.schaetzung). */
  V78.zeile = function (min, S) {
    const T = [];
    if (isNum(min)) T.push(min >= 60 ? `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")} h` : `${Math.round(min)} min`);
    if (S && isNum(S.km) && S.km > 0) T.push(`≈ ${String(Math.round(S.km * 10) / 10).replace(".", ",")} km`);
    if (S && isNum(S.tl)) T.push(`TL ≈ ${S.vollstaendig === false ? "mind. " : ""}${S.tl}`);
    return T.join(" · ");
  };
  /** Was ein leerer Tag ist: Kein Training laut Verfügbarkeit, sonst Ruhetag (vergangene Tage ohne Plan: frei). */
  V78.leer = function (v, vorbei) {
    if (vorbei) return { art: "frei", text: "frei" };
    if (v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length))) return { art: "kein", text: "Kein Training" };
    return { art: "ruhe", text: "Ruhetag" };
  };
  return V78;
});
