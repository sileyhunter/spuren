/* V9.4 (Auftrag V9 Woche wie Enduco, Etappe W3) planen-fluss-1.0: «Training planen» in Schritten wie Enduco – Sportart → Intensität → Workout → Dauer (ohne DOM).
   Die Intensität fasst die Arten der Vorlagen (V66.ARTEN, vorlagen-1.0) zusammen; angezeigt werden nur Stufen, für die die Sportart Vorlagen hat («was die Seite kennt»).
   Eine anaerobe Stufe gibt es nicht, weil keine Vorlage der Seite anaerob ist. Texte eigen. */
(function () {
  "use strict";
  const V94 = { VERSIONS: { fluss: "planen-fluss-1.0" } };

  V94.STUFEN = [
    { k: "grundlage", name: "Grundlage", zone: "z2", arten: ["grundlage", "lang", "technik", "aktivierung", "kraft", "mobility"],
      text: "Locker und lang, unter der ersten Schwelle. Baut die Ausdauer auf." },
    { k: "tempo", name: "Tempo · Schwelle", zone: "z4", arten: ["tempo", "schwelle", "renntempo", "koppel"],
      text: "Längere Blöcke bis knapp unter LT2 und im Renntempo." },
    { k: "vo2max", name: "VO2max", zone: "vo2", arten: ["vo2max"],
      text: "Kurze, harte Intervalle über der Schwelle." },
    { k: "test", name: "Test", zone: "neuro", arten: ["test"],
      text: "Stufentest oder CSS-Test für deine Zonen." },
  ];
  /** Stufe einer Vorlagen-Art (unbekannte Arten zählen zur Grundlage). */
  V94.stufeVon = (art) => (V94.STUFEN.find((s) => s.arten.includes(art)) || V94.STUFEN[0]).k;
  /** Stufen für eine Liste von Vorlagen (V66.vorlagen): nur die mit Vorlagen, in der Reihenfolge oben; je Stufe { ...stufe, vorlagen, min, max }. */
  V94.stufen = function (vorlagen) {
    const out = [];
    for (const s of V94.STUFEN) {
      const L = (vorlagen || []).filter((v) => V94.stufeVon(v.art) === s.k);
      if (!L.length) continue;
      out.push(Object.assign({}, s, { vorlagen: L, min: Math.min(...L.map((v) => v.min)), max: Math.max(...L.map((v) => v.max)) }));
    }
    return out;
  };
  /** Minutenachse unter dem Profil: Striche alle 15 min (bis 90 min), 30 min (bis 3 h), sonst 60 min; → [{ min, pct }] mit 0 und ohne das Ende. */
  V94.achse = function (dauer) {
    if (!(dauer > 0)) return [];
    const schritt = dauer <= 90 ? 15 : dauer <= 180 ? 30 : 60, out = [];
    for (let m = 0; m < dauer - schritt * 0.4; m += schritt) out.push({ min: m, pct: Math.round((m / dauer) * 1000) / 10 });
    return out;
  };

  if (typeof module !== "undefined" && module.exports) module.exports = V94;
  if (typeof window !== "undefined") window.V94 = V94;
})();
