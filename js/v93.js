/* V9.3 Auftrag «Woche wie Enduco», Etappe W2 (docs/auftrag-enduco-woche.md): woche-look-1.0, kugel-1.0 – reine Hilfen ohne DOM für das Aussehen
   der Woche (Kugel je Einheit, Mini-Balken des Status, Zeile einer Einheit, Zustand eines Tages). Rechnet nichts am Plan; die Farben kommen aus den
   Zonen der Seite (V6.ZONEN, CSS-Variablen --zc-…), die in V9.3 auf die aus dem Screenshot gemessenen Werte gesetzt sind. */
(function (root, factory) {
  const V93 = factory();
  if (typeof module === "object" && module.exports) module.exports = V93;
  if (root) root.V93 = V93;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V93 = { VERSIONS: { look: "woche-look-1.0", kugel: "kugel-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);

  /** Reihenfolge der Zonen in der Kugel: links die höchste (eigene Festlegung nach der Vorlage: rot · gelb · grün · türkis · cyan · hellblau · blau · lila). */
  V93.RANG = { sprint: 9, neuro: 9, anaerob: 8, vo2: 8, z5: 8, z4: 7, sweet: 6, z3: 5, fatmax: 4, z2: 3, z1: 2, offen: 1 };
  /** Teile, die nie in die Kugel zählen: Pausen zwischen Intervallen (die Vorlage zeigt sie nicht). */
  const OHNE = new Set(["pause"]);
  /** Einfahren und Auslaufen (kugel-1.0): erster bzw. letzter Teil, wenn die Einheit mindestens drei Teile hat und er locker ist (Z1, Z2, Lauf-ABC). */
  const LOCKER = new Set(["z1", "z2", "abc"]);

  /**
   * Streifen der Kugel einer Einheit (kugel-1.0): ein Streifen je Zone, in der die Einheit im Hauptteil Zeit verbringt (Einfahren, Auslaufen und Pausen
   * zählen nicht), links die höchste, Breite = Zeitanteil, mindestens 20 % (danach wieder auf 100 % gebracht). teile = [[Baustein, Minuten], …],
   * farbe = Baustein → Zonenschlüssel (V64.FARBE). → [{ zone, anteil }] (leer = ohne Teile)
   */
  V93.kugel = function (teile, farbe) {
    const T = (Array.isArray(teile) ? teile : []).filter((x) => Array.isArray(x) && isNum(x[1]) && x[1] > 0);
    if (!T.length) return [];
    let H = T.slice();
    if (H.length >= 3 && LOCKER.has(H[0][0])) H = H.slice(1);
    if (H.length >= 3 && LOCKER.has(H[H.length - 1][0])) H = H.slice(0, -1);
    const sum = new Map();
    for (const [k, m] of H) {
      if (OHNE.has(k)) continue;
      const z = (farbe && farbe[k]) || k;
      sum.set(z, (sum.get(z) || 0) + m);
    }
    if (!sum.size) {                                                     // nur Pausen oder Einfahren: die Zone des längsten Teils
      const l = T.slice().sort((a, b) => b[1] - a[1])[0];
      return [{ zone: (farbe && farbe[l[0]]) || l[0], anteil: 1 }];
    }
    const total = [...sum.values()].reduce((s, x) => s + x, 0);
    let S = [...sum.entries()].map(([zone, m]) => ({ zone, anteil: m / total }))
      .sort((a, b) => (V93.RANG[b.zone] || 0) - (V93.RANG[a.zone] || 0) || b.anteil - a.anteil);
    if (S.length > 4) S = S.slice(0, 4);                                // eine Kugel von 7 pt trägt höchstens vier Streifen
    // kleine Anteile auf 20 % heben, der Rest geht im Verhältnis an die grösseren (so bleibt jeder Streifen mindestens 20 % breit)
    const klein = S.filter((x) => x.anteil < 0.2), gross = S.filter((x) => x.anteil >= 0.2), rest = 1 - 0.2 * klein.length, g = gross.reduce((s, x) => s + x.anteil, 0);
    return S.map((x) => ({ zone: x.zone, anteil: Math.round((x.anteil < 0.2 || !g ? 0.2 : (x.anteil / g) * rest) * 1000) / 1000 }));
  };
  /** CSS-Hintergrund der Kugel: senkrechte Streifen mit harten Kanten. farbeVon = Zone → Farbe. */
  V93.kugelStil = function (streifen, farbeVon) {
    if (!streifen || !streifen.length) return "";
    const f = (z) => (typeof farbeVon === "function" ? farbeVon(z) : z) || "#6e6e74";
    if (streifen.length === 1) return f(streifen[0].zone);
    let a = 0; const stops = [];
    for (const s of streifen) { const b = Math.min(100, a + s.anteil * 100); stops.push(`${f(s.zone)} ${a.toFixed(1)}% ${b.toFixed(1)}%`); a = b; }
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  };

  /** Mini-Balken des Trainingsstatus in der Tagesliste: Füllung = Status ÷ 2,1 der Spurbreite (in der Vorlage gemessen), 0–1. */
  V93.BALKEN_SKALA = 2.1;
  V93.balkenAnteil = (s) => (isNum(s) && s > 0 ? Math.min(1, Math.round((s / V93.BALKEN_SKALA) * 1000) / 1000) : 0);

  /** Zahl am Tageskopf der Liste: wie die Vorlage nur ab zwei Einträgen (eine Einheit braucht keine Zahl). */
  V93.anzahl = (n) => (isNum(n) && n >= 2 ? String(n) : "");

  /** Zeile unter dem Titel einer Einheit (woche-look-1.0): Dauer, Distanz ≈, TL ≈ – mit Abstand statt Punkten, ohne Quelle (die steht im Tagesblatt
   *  und auf der Einheit-Seite). Dauer bleibt «1:30 h» / «45 min» (V6.6 Teil 0: nie «m» für Minuten – beim Schwimmen las sich «56m» wie Meter). */
  V93.zeile = function (dauerText, km, tl, opt) {
    opt = opt || {};
    const teile = [];
    if (opt.uhrzeit) teile.push(opt.uhrzeit);
    if (dauerText) teile.push(dauerText);
    if (isNum(km) && km > 0) teile.push(`${opt.kmGenau ? "" : "≈ "}${String(Math.round(km * 10) / 10).replace(".", ",")} km`);
    if (isNum(tl) && tl > 0) teile.push(`${opt.tlGenau ? "" : "≈ "}${Math.round(tl)} TL`);
    return teile;
  };

  /** Zeichen für den Zustand eines Tages (Standard · von Hand gesetzt · gesperrt), wie V92.zustand: { k, text } oder null für Standard ohne Zeichen. */
  V93.zeichen = function (zustand) {
    if (zustand === "gesperrt") return { k: "gesperrt", text: "gesperrt" };
    if (zustand === "hand") return { k: "hand", text: "von Hand gesetzt" };
    return null;
  };
  return V93;
});
