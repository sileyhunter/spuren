/* V8.5 «Modell Automatisch» (Masterprompt V8 Abschnitt 6; Etappe V8.5, von Silas am 18.11.2026 freigegeben) – Rechenlogik ohne DOM.
   automatisch-1.0: je Woche die Verteilung (polarisiert, pyramidal oder rennspezifisch) und die Zahl harter Einheiten an Land (zwei oder eine) aus
   - Phase: wie «kombiniert» (polarisiert bis zum Wechsel, danach rennspezifisch); Erholungswoche, Taper und Rennwoche wie die Vorlage,
   - Zeit: Wochenstunden (Triathlon unter 5 h eine harte Einheit an Land; nur Rad oder nur Laufen wie die Vorlage),
   - Verträglichkeit (V8.2): «Was du bisher verträgst» (Zahl harter Einheiten pro Woche gegen die Erholung der Woche danach) und «Verteilung und
     Entwicklung» (Anteil hart bzw. mittel je Block gegen die Rad-Effizienz im Block danach),
   - Ermüdung: Ampel an den 7 Tagen vor dem Montag und Trainingsstatus (Ermüdung ÷ Fitness) zu Beginn des Montags.
   Startet bei «kombiniert» und weicht nur ab, wenn eine Regel mit genug Daten greift; jede Wahl mit Grund. Nie mehr als die Vorlage (zwei harte Einheiten
   an Land), nie mehr Stunden: gute Erholung allein macht nichts härter (Test C). Die Verteilung wechselt nur zu Beginn eines Blocks (nach einer
   Erholungswoche), die Zahl harter Einheiten von Woche zu Woche. Ein Zusammenhang aus «Verteilung und Entwicklung» zählt nur, wenn er nicht davon abhängt,
   wo die 4-Wochen-Blöcke beginnen (verteilung-1.1: mindestens 3 von 4 Einteilungen gleich). Grenzen sind eigene Festlegungen (Wissen, Kapitel «modelle»). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.V85 = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const V85 = { VERSIONS: { automatisch: "automatisch-1.0" } };
  /** Eigene Festlegungen: ab so vielen Tagen «vorsichtig» oder krank in den 7 Tagen davor, ab diesem Trainingsstatus, unter so vielen Wochenstunden
   *  (Triathlon) höchstens eine harte Einheit an Land. */
  V85.GRENZEN = { vorsichtig: 3, status: 1.5, stunden: 5 };
  V85.ZWEITER_H = { rad: 6, lauf: 4.5 };                  // wie V64.EINZEL.zweiter_h (sportart-1.0): zweite Schlüsseleinheit ab diesen Stunden
  V85.MIN_PAARE = 8;                                      // wie V82.MIN.paare

  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(String(iso).slice(0, 10) + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const montag = (iso) => add(iso, -((new Date(T(iso)).getUTCDay() + 6) % 7));
  const dch = (iso) => { const [y, m, d] = String(iso).split("-"); return `${+d}.${+m}.${y}`; };
  const komma = (x, n) => (isNum(x) ? x.toFixed(n == null ? 1 : n).replace(".", ",").replace("-", "−") : "–");
  const NAME = { polarisiert: "polarisiert", pyramidal: "pyramidal", rennspezifisch: "rennspezifisch", schwelle: "Schwelle mit Laktat" };
  V85.NAME = NAME;
  V85._intern = { add, montag };
  const zus = (vt, x) => ((vt && vt.zusammenhang) || []).find((z) => z.x === x && z.marker === "dRad") || null;

  /** Zahl harter Einheiten an Land laut Vorlage (wochenplan-1.2, sportart-1.0): Triathlon zwei (Laufen Di, Rad Do), Erholungswoche eine;
   *  nur Rad oder nur Laufen eine, ab V85.ZWEITER_H zwei; Erholungswoche Rad eine, Laufen keine; Rennwoche keine. */
  V85.vorlage = function (o) {
    const sa = o && (o.sportart === "rad" || o.sportart === "lauf") ? o.sportart : null, H = o && isNum(o.stunden) ? o.stunden : 8;
    if (o && o.rennwoche) return 0;
    if (sa) return o.erholung ? (sa === "rad" ? 1 : 0) : H >= V85.ZWEITER_H[sa] ? 2 : 1;
    return o && o.erholung ? 1 : 2;
  };

  const wochenAb = (a, b) => Math.round((T(b) - T(a)) / (7 * 864e5));
  /** Erste Woche des Blocks, in dem die Woche mo liegt: die Woche nach der letzten Erholungswoche davor (aus den Wochen der Saison, saison-1.2),
   *  höchstens drei Wochen zurück. Fehlen die Wochen davor in der Liste, zählt der 3:1-Rhythmus ab der Erholungswoche anker (saison-1.2 verankert ihn am
   *  Hauptrennen); ohne beides die Woche selbst. wochen = [{ woche, erholung }]. */
  V85.blockStart = function (wochen, mo, anker) {
    const W = new Map((wochen || []).filter((w) => w && w.woche).map((w) => [w.woche, w]));
    let s = mo;
    for (let i = 1; i <= 3; i++) {
      const v = add(mo, -7 * i), w = W.get(v);
      if (w && w.erholung) return s;
      if (!w) {
        if (!anker) return s;
        const pos = (((wochenAb(montag(anker), mo) - 1) % 4) + 4) % 4;          // Wochen seit Blockbeginn im Rhythmus
        const r = add(mo, -7 * pos);
        return r < s ? r : s;
      }
      s = v;
    }
    return s;
  };

  /** Stichtag der Daten für die Woche mo: der Sonntag vor ihrem Block, höchstens der Sonntag vor der laufenden Woche (spätere Daten gibt es nicht). */
  V85.stichtag = function (wochen, mo, heute, anker) {
    const s = add(V85.blockStart(wochen, mo, anker), -1), h = add(montag(heute), -1);
    return s < h ? s : h;
  };

  /** Erholungswoche im 3:1-Rhythmus aus den Wochen der Saison (wie js/v82-ui.js: Grund «Rhythmus»), sonst irgendeine Erholungswoche. */
  V85.anker = function (wochen) {
    const L = (wochen || []).filter((w) => w && w.erholung);
    const r = L.find((w) => /Rhythmus/.test(w.grund || "")) || L[0];
    return r ? r.woche : null;
  };

  /** Ermüdung zu Beginn der Woche mo. tage = [{ date, status }] (status aus dem Entscheid der Ampel: «vorsichtig», «krank», «wie_geplant»; null = ohne
   *  Entscheid), ratio = Trainingsstatus (Ermüdung ÷ Fitness) zu Beginn des Montags. → { vorsichtig, krank, ohne, ratio, grund|null } */
  V85.ermuedung = function (tage, ratio) {
    const L = (tage || []).filter((t) => t && t.date);
    const vorsichtig = L.filter((t) => t.status === "vorsichtig").length, krank = L.filter((t) => t.status === "krank").length;
    const ohne = 7 - L.filter((t) => t.status).length;
    const e = { vorsichtig, krank, ohne: Math.max(0, ohne), ratio: isNum(ratio) ? Math.round(ratio * 100) / 100 : null, grund: null };
    if (vorsichtig + krank >= V85.GRENZEN.vorsichtig) e.grund = "ampel";
    else if (isNum(e.ratio) && e.ratio >= V85.GRENZEN.status) e.grund = "status";
    return e;
  };

  /** Zahl aus der Gruppe «2», «4+» (V82.GRUPPEN.harte). */
  const zahl = (label) => { const m = /^(\d+)/.exec(String(label || "")); return m ? +m[1] : null; };

  /**
   * Entscheid für eine Woche.
   * o = { woche, basis (Modell nach «kombiniert»: polarisiert bzw. rennspezifisch), wechsel, phase, erholung, taper, rennwoche, stunden, sportart,
   *       reaktionen: { stand, vertraeglich (V82.vertraeglich), verteilung (V82.verteilung) } | null,
   *       ermuedung: V85.ermuedung(…) mit { stand } | null (kommende Woche: zeigt sich erst am Montag) }
   * → { v, woche, modell, harte, vorlage, basis, abweichung, gruende: [{ art, titel, text, wirkung }], kurz, grund (kurz, wenn weniger harte Einheiten) }
   */
  V85.entscheid = function (o) {
    o = o || {};
    const basis = NAME[o.basis] ? o.basis : "polarisiert", vorlage = V85.vorlage(o), G = [];
    const sa = o.sportart === "rad" || o.sportart === "lauf" ? o.sportart : null, H = isNum(o.stunden) ? o.stunden : null;
    const belastung = !o.erholung && !o.taper && !o.rennwoche;
    let modell = basis, harte = vorlage, grund = null;
    const R = o.reaktionen || null, stand = R && R.stand ? ` (Daten bis ${dch(R.stand)})` : "", deine = R && R.stand ? `Deine Daten bis ${dch(R.stand)}` : "Deine Daten";

    // 1 Phase
    const ph = o.phase ? `${o.phase}${o.erholung ? ", Erholungswoche" : ""}` : o.erholung ? "Erholungswoche" : "Woche";
    const wechsel = o.wechsel ? dch(o.wechsel) : null;
    G.push({ art: "phase", titel: "Phase", wirkung: "bleibt",
      text: o.rennwoche ? `${ph}: Rennwoche – keine Schlüsseleinheiten ausser der Aktivierung am Vortag.`
        : basis === "rennspezifisch" ? `${ph}: rennspezifisch wie «kombiniert»${wechsel ? ` (seit ${wechsel})` : ""}.`
        : `${ph}: polarisiert wie «kombiniert»${wechsel ? ` – rennspezifisch ab ${wechsel}` : ""}.` });

    // 2 Verteilung aus deinen Daten (nur in polarisierten Wochen; rennspezifisch richtet sich nach dem Rennen)
    if (o.rennwoche) { /* keine Schlüsseleinheiten */ }
    else if (basis !== "polarisiert") {
      G.push({ art: "verteilung", titel: "Verteilung", wirkung: "bleibt", text: "Ab dem Wechsel richtet sich die Verteilung nach dem Rennen (Tempo und Renntempo); deine Daten zur Verteilung ändern daran nichts." });
    } else {
      // verteilung-1.1 (js/v82.js): der Status ist schon über die 4 Einteilungen der Blöcke geprüft (klar nur in mindestens 3)
      const vt = R && R.verteilung, zh = zus(vt, "hart"), zm = zus(vt, "mittel");
      const n = Math.max(zh ? zh.n : 0, zm ? zm.n : 0);
      if (!vt || (!zh || zh.status === "zu wenig") && (!zm || zm.status === "zu wenig")) {
        G.push({ art: "verteilung", titel: "Verteilung aus deinen Daten", wirkung: "bleibt",
          text: `Noch zu wenig Daten (${n} von ${V85.MIN_PAARE} Block-Paaren mit Rad-Effizienz)${stand} – bleibt polarisiert.` });
      } else {
        const st = (z) => (z ? z.status : null);
        const score = (st(zh) === "negativ" ? 1 : 0) + (st(zm) === "positiv" ? 1 : 0) - (st(zh) === "positiv" ? 1 : 0) - (st(zm) === "negativ" ? 1 : 0);
        const ein = (z) => (z && z.einteilungen && z.einteilungen.von > 1 ? z.einteilungen : null);
        const nT = (z) => { const e = ein(z); return e && e.n && e.n[0] !== e.n[1] ? `n = ${e.n[0]}–${e.n[1]}` : `n = ${z.n}`; };
        const rho = (z) => {
          if (!z || !isNum(z.rho)) return null;
          const e = ein(z);
          if (z.status === "negativ" || z.status === "positiv") return `Rangkorrelation ${komma(z.rho, 2)}${z.ki ? `, 90-%-Intervall ${komma(z.ki[0], 2)} bis ${komma(z.ki[1], 2)}` : ""}, n = ${z.n}${e ? `; klar in ${e[z.status]} von ${e.von} Einteilungen der Blöcke` : ""}`;
          return e && e.rho && e.rho[0] !== e.rho[1] ? `Rangkorrelation ${komma(e.rho[0], 2)} bis ${komma(e.rho[1], 2)} je nach Einteilung der Blöcke, ${nT(z)}` : `Rangkorrelation ${komma(z.rho, 2)}, n = ${z.n}`;
        };
        const belege = [];
        if (st(zh) === "negativ") belege.push(`mehr Anteil hart ging eher mit schlechterer Rad-Effizienz im Block danach einher (${rho(zh)})`);
        if (st(zm) === "positiv") belege.push(`mehr Anteil mittel ging eher mit besserer Rad-Effizienz im Block danach einher (${rho(zm)})`);
        if (st(zh) === "positiv") belege.push(`mehr Anteil hart ging eher mit besserer Rad-Effizienz im Block danach einher (${rho(zh)})`);
        if (st(zm) === "negativ") belege.push(`mehr Anteil mittel ging eher mit schlechterer Rad-Effizienz im Block danach einher (${rho(zm)})`);
        if (score >= 1) {
          modell = "pyramidal";
          G.push({ art: "verteilung", titel: "Verteilung aus deinen Daten", wirkung: "pyramidal",
            text: `${deine}: ${belege.join("; ")}. Darum am Rad Schwelle statt VO2max (pyramidal), Laufen bleibt. Ein Zusammenhang, keine Ursache – polarisiert und pyramidal wirken in Studien insgesamt ähnlich, darum entscheiden hier deine Daten.` });
        } else if (score <= -1) {
          G.push({ art: "verteilung", titel: "Verteilung aus deinen Daten", wirkung: "bleibt", text: `${deine}: ${belege.join("; ")} – bleibt polarisiert.` });
        } else {
          const instabil = [zh, zm].some((z) => z && z.instabil);
          G.push({ art: "verteilung", titel: "Verteilung aus deinen Daten", wirkung: "bleibt",
            text: `${deine}: kein klarer Zusammenhang zwischen Verteilung und Rad-Effizienz${rho(zh) ? ` (Anteil hart: ${rho(zh)})` : ""}${instabil ? "; was sich zeigte, hängt davon ab, wo die Blöcke beginnen, und zählt darum nicht" : ""} – bleibt polarisiert.` });
        }
      }
    }

    // 3 Zahl harter Einheiten an Land (nur in Belastungswochen; Erholung, Taper und Rennwoche wie die Vorlage)
    const caps = [];
    if (!belastung) {
      G.push({ art: "harte", titel: "Harte Einheiten", wirkung: "bleibt",
        text: o.rennwoche ? "Rennwoche: keine harte Einheit." : o.erholung ? `Erholungswoche: ${vorlage === 1 ? "eine Schlüsseleinheit, gekürzt" : vorlage === 0 ? "alles locker" : `${vorlage} Schlüsseleinheiten`} – wie in jeder Erholungswoche.`
          : "Taper: Intensität bleibt, Schlüsseleinheiten mit weniger Wiederholungen – wie die Vorlage." });
    } else {
      // Zeit
      if (sa) {
        G.push({ art: "zeit", titel: "Zeit", wirkung: "bleibt",
          text: `${H != null ? `${komma(H, 1)} h` : "Stunden offen"} ${sa === "rad" ? "Rad" : "Laufen"}: ${vorlage === 2 ? "zwei Schlüsseleinheiten" : "eine Schlüsseleinheit"} – die zweite ab ${komma(V85.ZWEITER_H[sa], 1).replace(",0", "")} h (Vorlage).` });
      } else if (H != null && H < V85.GRENZEN.stunden) {
        caps.push({ n: 1, k: "wenig Zeit" });
        G.push({ art: "zeit", titel: "Zeit", wirkung: "weniger",
          text: `${komma(H, 1)} h: mit so wenigen Einheiten wären zwei harte fast die Hälfte der Woche – eine harte Einheit an Land (eigene Festlegung, unter ${V85.GRENZEN.stunden} h).` });
      } else {
        G.push({ art: "zeit", titel: "Zeit", wirkung: "bleibt", text: `${H != null ? `${komma(H, 1)} h` : "Stunden offen"}: Platz für zwei harte Einheiten an Land, der Rest bleibt locker.` });
      }
      // Verträglichkeit
      const d = R && R.vertraeglich && R.vertraeglich.dim ? R.vertraeglich.dim.harte : null;
      if (!d || !d.bezug) {
        G.push({ art: "vertraeglich", titel: "Verträglichkeit", wirkung: "bleibt", text: `Was du verträgst: noch zu wenig Wochen${stand} – ${vorlage === 1 ? "eine harte Einheit" : `${vorlage} harte Einheiten`} wie die Vorlage.` });
      } else {
        const ab = zahl(d.ab);
        if (ab != null && ab <= vorlage) {
          const n = Math.max(1, ab - 1);
          caps.push({ n, k: "Verträglichkeit" });
          G.push({ art: "vertraeglich", titel: "Verträglichkeit", wirkung: "weniger",
            text: `${deine}: Wochen mit ${d.ab} harten Einheiten gingen mit schlechterer Erholung in der Woche danach einher, üblich sind ${d.bezug} – höchstens ${n === 1 ? "eine" : n}.` });
        } else {
          G.push({ art: "vertraeglich", titel: "Verträglichkeit", wirkung: "bleibt",
            text: d.bis ? `${deine}: bisher verträglich bis ${d.bis} harte Einheiten pro Woche, üblich sind ${d.bezug} – ${vorlage === 1 ? "eine bleibt" : "zwei bleiben"}. Mehr plant «Automatisch» nicht.`
              : `${deine}: üblich sind ${d.bezug} harte Einheiten pro Woche, für mehr noch zu wenig Wochen – ${vorlage === 1 ? "eine bleibt" : "zwei bleiben"}.` });
        }
      }
      // Ermüdung
      const E = o.ermuedung;
      if (!E) {
        G.push({ art: "ermuedung", titel: "Ermüdung", wirkung: "offen", text: "Zeigt sich erst zu Beginn dieser Woche (Ampel der Tage davor, Trainingsstatus am Montag)." });
      } else {
        const st = E.ratio != null ? `Trainingsstatus ${komma(E.ratio, 2)}` : "Trainingsstatus offen";
        const tage = `${E.vorsichtig + E.krank} von 7 Tagen «vorsichtig»${E.krank ? " oder krank" : ""}${E.ohne ? ` (${E.ohne} ohne Ampel)` : ""}`;
        if (E.grund === "ampel") {
          caps.push({ n: 1, k: "Ermüdung der Vorwoche" });
          G.push({ art: "ermuedung", titel: "Ermüdung", wirkung: "weniger", text: `An ${tage} vor dem Montag – diese Woche eine harte Einheit an Land, danach wieder wie geplant (${st}).` });
        } else if (E.grund === "status") {
          caps.push({ n: 1, k: "Trainingsstatus sehr hoch" });
          G.push({ art: "ermuedung", titel: "Ermüdung", wirkung: "weniger", text: `${st} am Montag: sehr hoch (ab ${komma(V85.GRENZEN.status, 1)}) – diese Woche eine harte Einheit an Land (${tage}).` });
        } else {
          G.push({ art: "ermuedung", titel: "Ermüdung", wirkung: "bleibt", text: `${tage}, ${st} – kein Grund für weniger.` });
        }
      }
      for (const c of caps) if (c.n < harte) { harte = c.n; grund = c.k; }
      if (harte < vorlage) {
        G.push({ art: "auswahl", titel: "Welche bleibt", wirkung: "weniger",
          text: sa ? "Die zweite Schlüsseleinheit fällt weg; ihre Zeit geht in lockere Einheiten."
            : "Rad bleibt, der harte Lauf wird locker (gleiche Dauer): Überlastungsbeschwerden vor einer Langdistanz betreffen vor allem Knie, Unterschenkel und unteren Rücken – eigene Festlegung." });
      }
    }
    harte = Math.max(vorlage === 0 ? 0 : 1, Math.min(vorlage, harte));
    const zahlW = (n) => (n === 0 ? "keine harte Einheit" : n === 1 ? "eine harte Einheit" : `${n} harte Einheiten`);
    return { v: V85.VERSIONS.automatisch, woche: o.woche || null, modell, harte, vorlage, basis, abweichung: modell !== basis || harte < vorlage, gruende: G, grund,
      kurz: `${NAME[modell]} · ${zahlW(harte)} an Land${harte < vorlage ? ` (statt ${vorlage})` : ""}` };
  };
  return V85;
});
