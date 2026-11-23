/* V9.1 (Auftrag V9, Etappe 1) zusammen-1.0: geplante Einheit und absolvierte Aktivität zusammenführen (ohne DOM).
   Eine absolvierte Aktivität, die zu einer geplanten Einheit passt, ersetzt diese in Kalender, Tagesblatt und Heute (ein Eintrag mit Haken, Name der Aktivität).
   Zuordnung wie last-abweichung-1.0 (V8.1, js/v81-ui.js): gleicher Tag, gleiche Sportart (V6.sportVon: Garmin-Krafttraining = kraft), die geplante Einheit mit der
   nächsten Dauer; jede Aktivität erledigt höchstens eine Einheit, jede Einheit wird höchstens einer Aktivität zugeordnet. Nicht zugeordnete Pläne bleiben sichtbar.
   Die Zuordnung ist nur eine Anzeige: sie ändert weder Mein Plan noch Garmin noch Enduco. */
(function () {
  "use strict";
  const isNum = (x) => typeof x === "number" && Number.isFinite(x);
  const V91 = { VERSIONS: { zusammen: "zusammen-1.0", heute: "heute-einfach-1.0" } };

  /** Bewegungszeit der Aktivität in Minuten (mv, sonst Timer-Dauer). */
  V91.minuten = (a) => ((isNum(a && a.mv) ? a.mv : a && isNum(a.dur) ? a.dur : 0) / 60);
  /** Sportart der Aktivität für die Zuordnung (opt.sportVon = V6.sportVon, sonst a.sport). */
  const sportDer = (a, f) => (typeof f === "function" ? f(a) : a && a.sport);

  /**
   * Ordnet Aktivitäten eines Tages den geplanten Einheiten zu.
   * plan: Einheiten (e.uid, e.sport, e.dauer in Minuten) · akt: Aktivitäten desselben Tages · opt.sportVon: Funktion Aktivität → Sportart
   * → { von: Map Aktivität-ID → Einheit, zu: Map Einheit-uid → Aktivität, offen: [Einheiten ohne Aktivität], frei: [Aktivitäten ohne Einheit] }
   * Reihenfolge: kleinster Dauerunterschied zuerst; bei Gleichstand die frühere Einheit im Plan und die frühere Aktivität in der Liste.
   */
  V91.zuordnen = function (plan, akt, opt) {
    opt = opt || {};
    const P = Array.isArray(plan) ? plan : [], A = Array.isArray(akt) ? akt : [];
    const paare = [];
    P.forEach((e, i) => {
      if (!e || !e.uid) return;
      A.forEach((a, j) => {
        if (!a || sportDer(a, opt.sportVon) !== e.sport) return;
        const d = isNum(e.dauer) ? Math.abs(e.dauer - V91.minuten(a)) : Infinity;
        paare.push({ i, j, d: Number.isFinite(d) ? d : 1e9 });
      });
    });
    paare.sort((x, y) => x.d - y.d || x.i - y.i || x.j - y.j);
    const von = new Map(), zu = new Map(), pU = new Set(), aU = new Set();
    for (const p of paare) {
      if (pU.has(p.i) || aU.has(p.j)) continue;
      pU.add(p.i); aU.add(p.j);
      const e = P[p.i], a = A[p.j], id = a.id != null ? a.id : "a" + p.j;
      von.set(id, e); zu.set(e.uid, a);
    }
    return {
      von, zu,
      offen: P.filter((e, i) => e && e.uid && !pU.has(i)),
      frei: A.filter((a, j) => a && !aU.has(j)),
      v: V91.VERSIONS.zusammen,
    };
  };

  /** Geplant gegen absolviert in Worten für die Einheit-Seite: { dauerPlan, dauerIst, diffMin, text } (Minuten; ohne Plandauer kein Vergleich). */
  V91.vergleich = function (e, a) {
    if (!e || !a) return null;
    const ist = Math.round(V91.minuten(a)), plan = isNum(e.dauer) ? Math.round(e.dauer) : null;
    if (plan == null) return { dauerPlan: null, dauerIst: ist, diffMin: null, text: "Dauer im Plan offen" };
    const diff = ist - plan, ab = Math.abs(diff);
    const text = ab < 5 ? "Dauer wie geplant" : diff > 0 ? `${ab} min länger als geplant` : `${ab} min kürzer als geplant`;
    return { dauerPlan: plan, dauerIst: ist, diffMin: diff, text };
  };

  /** Satz für «Heute» (Begrüssung): zählt nur die noch nicht erledigten Einheiten. → { offen: n, erledigt: n, text } */
  V91.heuteSatz = function (offen, erledigt, titel) {
    const o = offen || [], n = erledigt || 0, t = (e) => `«${titel ? titel(e) : e.titel || "Training"}»`;
    if (!o.length && n > 0) return { offen: 0, erledigt: n, text: "Heute ist alles erledigt." };
    if (!o.length) return { offen: 0, erledigt: 0, text: "Heute ist nichts geplant." };
    const rest = n > 0 ? " noch" : "";
    return {
      offen: o.length, erledigt: n,
      text: o.length === 1 ? `Heute steht${rest} ${t(o[0])} an.` : `Heute stehen${rest} ${o.length} Einheiten an: ${o.map(t).join(" und ")}.`,
    };
  };

  /** «1 h 30» / «50 min» (Minuten). */
  V91.dauerText = (min) => {
    if (!isNum(min) || min <= 0) return "";
    const m = Math.round(min), h = Math.floor(m / 60), r = m % 60;
    return h ? (r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`) : `${m} min`;
  };
  /** V9.9 heute-einfach-1.0 (Silas 23.11.: «möglichst einfach»): eine Antwort auf «Was mache ich heute?».
     o = { offen: [{titel, sport, dauer}], erledigt: n (geplant und erledigt), frei: [{sport, min}] (absolviert ohne Plan), rennen, ampel: {status, empfehlung, krank, schmerz}, wort: sport → Wort }
     → { text, hinweis } – hinweis nur, wenn er die Sicherheit betrifft (Krankheitszeichen, deutliche Schmerzen); der Rest steht in der Ampel-Kachel bzw. im Ampel-Vorschlag. */
  V91.heuteAntwort = function (o) {
    o = o || {};
    const wort = o.wort || ((s) => s || "Training"), offen = o.offen || [], frei = o.frei || [], n = (o.erledigt || 0) + frei.length;
    const einh = (e) => `«${e.titel || wort(e.sport)}»${isNum(e.dauer) && e.dauer > 0 ? " · " + V91.dauerText(e.dauer) : ""}`;
    let text;
    if (o.rennen) text = `Heute ist Renntag: «${o.rennen}».`;
    else if (offen.length) text = `Heute${n ? " noch" : ""}: ${offen.slice(0, 3).map(einh).join(" und ")}.`;
    else if (frei.length) text = `Heute erledigt: ${frei.slice(0, 2).map((a) => `${wort(a.sport)}${isNum(a.min) && a.min > 0 ? " " + V91.dauerText(a.min) : ""}`).join(" und ")}.`;
    else if (n) text = "Heute ist alles erledigt.";
    else text = "Heute frei.";
    const A = o.ampel, hinweis = A && A.status === "vorsichtig" && (A.krank || A.schmerz) && A.empfehlung ? A.empfehlung : "";
    return { text, hinweis };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = V91;
  if (typeof window !== "undefined") window.V91 = V91;
})();
