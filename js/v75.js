/* Ironman Notebook V7.5 – Etappe 3 «Planeinstellungen» (Auftrag V7.3 «wie enduco», Vorbild: die Planeinstellungen von enduco), Rechenlogik ohne DOM.
   - planeinstellungen-1.0: Einstellungen des Plans je Gruppe (Eingabe «planeinstellung» → plan_einstellungen, «Direkt speichern», gleiche ID ersetzt
     mit Audit; gleiche Prüfung wie merge_daily.planeinstellung_pruefen): Steigerung, Basis je Sportart, Indoor-Phase Rad und Laufen, Schwimmen
     (Hilfsmittel, Standard-Bahnlänge, Stile). Ohne Eintrag gilt der Standard – der Plan rechnet dann wie bisher.
   - basis-1.0: Basis-Fitness je Sportart. Angezeigt wird die Fitness der Sportart (42-Tage-Mittel ihrer Trainingslast wie pmc-2.0, Stand zu Tagesbeginn)
     und der gewohnte Umfang: Anteil der Sportart an den Stunden der 8 abgeschlossenen Wochen × «jetzt» (saison-1.2); zusammen ergibt das genau «jetzt».
     Der Plan beginnt beim gewohnten Umfang oder bei deinem Wert je Sportart.
   - steigerung-1.0: ein Regler für Schwimmen, Rad und Laufen (50–150 %, Standard 100 %). Jede Sportart geht von ihrer Basis zu ihrem Anteil an der
     Spitzenwoche (aufteilung-1.0); nach i Wochen ist der Anteil des Wegs min(1, Regler · i/(N − 1)), N = Wochen bis zum Taper. 100 % = gleichmässig
     bis zur Woche vor dem Taper (wie saison-1.2), mehr = früher an der Spitze und dort bis zum Taper, weniger = die Spitze wird nicht erreicht.
     Eine Woche höchstens 10 % (mindestens eine halbe Stunde) über der Woche davor (eigene Festlegung); Erholung 65 %, Woche mit B-Rennen 50 %,
     Taper 60 und 40 % der Spitze wie bisher. Die laufende Woche bleibt bei der Basis.
   - indoor-phase-1.0: Rad- bzw. Laufeinheiten von … bis … gelten als drinnen (Rolle, Laufband), ausser du hast eine Einheit ausdrücklich auf Outdoor
     oder Indoor gestellt. Dauer und Inhalt bleiben (eigene Festlegung); Einheiten aus der Bibliothek bleiben wie im Enduco-Workout.
   Nichts davon geht an Enduco oder Garmin; nach Garmin geht weiter nur, was du mit «Export» bzw. «An Garmin senden» auslöst. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V75 = factory(node ? require("./v64.js") : root && root.V64);
  if (node) module.exports = V75;
  if (root) root.V75 = V75;
})(typeof window !== "undefined" ? window : null, function (V64) {
  "use strict";
  const V75 = { VERSIONS: { einstellungen: "planeinstellungen-1.0", basis: "basis-1.0", steigerung: "steigerung-1.0", indoor: "indoor-phase-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const istDatum = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(T(s)) && new Date(T(s)).toISOString().slice(0, 10) === s;
  const SPORT = (V75.SPORT = ["schwimm", "rad", "lauf"]);
  const aufteilung = () => (V64 && V64.AUFTEILUNG) || { schwimm: 0.2, rad: 0.5, lauf: 0.3 };

  /* ---------------- Einstellungen (planeinstellungen-1.0) ---------------- */
  V75.STEIGERUNG = { min: 50, max: 150, schritt: 5, standard: 100, plus: 0.1, plus_min_h: 0.5 };
  V75.BASIS_MAX = 30;                                                   // Stunden je Woche und Sportart
  V75.INDOOR_MAX_TAGE = 366;
  V75.HILFSMITTEL = ["brett", "pullbuoy", "flossen", "paddles"];
  V75.STILE = ["ruecken", "brust", "delfin"];                            // Kraul ist immer dabei
  V75.IDS = { steigerung: "pe-steigerung", basis: "pe-basis", indoor_rad: "pe-indoor-rad", indoor_lauf: "pe-indoor-lauf", schwimm: "pe-schwimm" };
  /** Standard = wie bis V7.4: 100 %, gewohnter Umfang, keine Indoor-Phase, alle Hilfsmittel, Bahnlänge wie bisher (Gerät bzw. Enduco), Kraul und Rücken. */
  V75.standard = () => ({ steigerung: V75.STEIGERUNG.standard, basis: { schwimm: null, rad: null, lauf: null }, indoor: { rad: null, lauf: null },
    schwimm: { hilfsmittel: V75.HILFSMITTEL.slice(), pool: null, stile: ["ruecken"] }, stand: {} });
  const teilmenge = (x, erlaubt) => Array.isArray(x) && x.every((k) => erlaubt.includes(k)) && new Set(x).size === x.length;
  /** Prüft einen Eintrag → Fehlertext oder null (gleiche Regeln wie merge_daily.planeinstellung_pruefen). */
  V75.pruefen = function (e) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return "kein Eintrag";
    if (e.geaendert != null && (typeof e.geaendert !== "string" || isNaN(Date.parse(e.geaendert)))) return "Zeitpunkt der Änderung ungültig";
    switch (e.id) {
      case "pe-steigerung":
        return Number.isInteger(e.wert) && e.wert >= V75.STEIGERUNG.min && e.wert <= V75.STEIGERUNG.max && e.wert % V75.STEIGERUNG.schritt === 0 ? null : "Steigerung 50–150 % in 5er-Schritten";
      case "pe-basis":
        for (const s of SPORT) { const v = e[s]; if (v != null && !(isNum(v) && v >= 0 && v <= V75.BASIS_MAX && Number.isInteger(v * 2))) return "Basis 0–30 h pro Woche in halben Stunden"; }
        return null;
      case "pe-indoor-rad": case "pe-indoor-lauf":
        if (e.von == null && e.bis == null) return null;
        if (!istDatum(e.von) || !istDatum(e.bis)) return "Indoor-Phase: von und bis als Datum";
        if (e.bis < e.von) return "Indoor-Phase: «bis» liegt vor «von»";
        if ((T(e.bis) - T(e.von)) / 864e5 + 1 > V75.INDOOR_MAX_TAGE) return "Indoor-Phase höchstens ein Jahr";
        return null;
      case "pe-schwimm":
        if (!teilmenge(e.hilfsmittel, V75.HILFSMITTEL)) return "unbekanntes Hilfsmittel";
        if (e.pool != null && e.pool !== 25 && e.pool !== 50) return "Bahnlänge 25 oder 50 m";
        if (!teilmenge(e.stile, V75.STILE)) return "unbekannter Stil";
        return null;
      default: return "unbekannte Einstellung";
    }
  };
  /** Neuer Eintrag (für «Direkt speichern»). felder je ID wie in V75.pruefen. */
  V75.eintrag = (id, felder, jetzt) => Object.assign({ id, v: V75.VERSIONS.einstellungen }, felder || {}, { geaendert: jetzt || new Date().toISOString() });
  /** Einstellungen aus den Daten (plan_einstellungen) und den noch nicht eingespielten Eingaben dieses Geräts; je ID gilt die neuere Fassung.
   *  opt.bis (Montag, für nachgerechnete vergangene Wochen wie V64.stand): nur Einträge, die vor diesem Tag gespeichert wurden. */
  V75.einstellungen = function (daten, geraet, opt) {
    opt = opt || {};
    const E = V75.standard(), M = new Map();
    for (const L of [daten || [], geraet || []]) for (const x of L) {
      if (!x || V75.pruefen(x)) continue;
      if (opt.bis && !(x.geaendert && String(x.geaendert).slice(0, 10) < opt.bis)) continue;
      const alt = M.get(x.id); if (!alt || String(x.geaendert || "") >= String(alt.geaendert || "")) M.set(x.id, x);
    }
    for (const [id, x] of M) {
      if (id === "pe-steigerung") E.steigerung = x.wert;
      else if (id === "pe-basis") for (const s of SPORT) E.basis[s] = isNum(x[s]) ? x[s] : null;
      else if (id === "pe-indoor-rad" || id === "pe-indoor-lauf") E.indoor[id === "pe-indoor-rad" ? "rad" : "lauf"] = x.von && x.bis ? { von: x.von, bis: x.bis } : null;
      else if (id === "pe-schwimm") E.schwimm = { hilfsmittel: x.hilfsmittel.slice(), pool: x.pool === 25 || x.pool === 50 ? x.pool : null, stile: x.stile.slice() };
      E.stand[id] = x.geaendert || null;
    }
    return E;
  };

  /* ---------------- Basis je Sportart (basis-1.0) ---------------- */
  /** vg = AN.saisonVorgaben(...) ({ jetzt, ist8: Map Montag → {schwimm, rad, lauf}}), E = V75.einstellungen(...), A = Aufteilung (ohne Stunden in den
   *  8 Wochen). → { schwimm: { h, gewohnt, eigen, anteil }, rad, lauf, summe, gewohnt_summe, eigen, quelle } */
  V75.basis = function (vg, E, A) {
    A = A || aufteilung(); E = E || V75.standard();
    const sum = { schwimm: 0, rad: 0, lauf: 0 };
    if (vg && vg.ist8 && typeof vg.ist8.values === "function") for (const r of vg.ist8.values()) for (const s of SPORT) sum[s] += (r && r[s]) || 0;
    const tot = sum.schwimm + sum.rad + sum.lauf, jetzt = vg && isNum(vg.jetzt) ? vg.jetzt : 8;
    const out = { summe: 0, gewohnt_summe: 0, eigen: false, jetzt, quelle: tot > 0 ? "anteil" : "aufteilung" };
    for (const s of SPORT) {
      const anteil = tot > 0 ? sum[s] / tot : A[s], gewohnt = Math.round(jetzt * anteil * 100) / 100;
      const eigen = E.basis && isNum(E.basis[s]) ? E.basis[s] : null;
      out[s] = { h: eigen != null ? eigen : gewohnt, gewohnt, eigen, anteil };
      out.summe += out[s].h; out.gewohnt_summe += gewohnt; if (eigen != null) out.eigen = true;
    }
    out.summe = Math.round(out.summe * 100) / 100; out.gewohnt_summe = Math.round(out.gewohnt_summe * 100) / 100;
    return out;
  };
  /** Fitness je Sportart (wie pmc-2.0: x += (Last − x)/42 je Kalendertag, Tage ohne Training mit 0) am Ende des Vortags von «heute».
   *  last(a) = Last einer Aktivität (Standard a.tss, so wie die Seite sie nach config.load_model rechnet). Ohne Einheit der Sportart: null. */
  V75.fitness = function (acts, heute, last) {
    last = last || ((a) => (isNum(a.tss) ? a.tss : 0));
    const L = { schwimm: new Map(), rad: new Map(), lauf: new Map() }; let erste = null;
    for (const a of acts || []) {
      if (!a || !a.date || !L[a.sport] || a.date >= heute) continue;
      L[a.sport].set(a.date, (L[a.sport].get(a.date) || 0) + (last(a) || 0));
      if (!erste || a.date < erste) erste = a.date;
    }
    const out = { schwimm: null, rad: null, lauf: null, bis: heute ? add(heute, -1) : null };
    if (!erste) return out;
    const tage = Math.round((T(heute) - T(erste)) / 864e5), x = { schwimm: 0, rad: 0, lauf: 0 };
    for (let i = 0, d = erste; i < tage; i++, d = add(d, 1)) for (const s of SPORT) x[s] += ((L[s].get(d) || 0) - x[s]) / 42;
    for (const s of SPORT) if (L[s].size) out[s] = Math.round(x[s] * 10) / 10;
    return out;
  };

  /* ---------------- Steigerung (steigerung-1.0) ---------------- */
  const summe = (o) => o.schwimm + o.rad + o.lauf;
  /** W = AN.saison(…).wochen (Woche 0 = laufende), basis = V75.basis(...), spitze = Stunden der Spitzenwoche (saison-1.2), st = Regler in %, A = Aufteilung.
   *  → je Woche { woche, phase, erholung, schwimm, rad, lauf (Stunden), summe (auf halbe Stunden), aufteilung (Anteile), roh: {schwimm, rad, lauf, summe}
   *  (vor Erholung und B-Rennen), gedeckelt (10 %-Grenze gegriffen) } */
  V75.rampe = function (W, basis, spitze, st, A) {
    A = A || aufteilung();
    st = isNum(st) ? Math.max(V75.STEIGERUNG.min, Math.min(V75.STEIGERUNG.max, st)) : V75.STEIGERUNG.standard;
    const L = W || [], iT = L.findIndex((w) => w && w.phase === "Taper"), N = iT > 0 ? iT : L.length;
    const B = {}, Z = {};
    for (const s of SPORT) { B[s] = basis && basis[s] && isNum(basis[s].h) ? basis[s].h : 0; Z[s] = (isNum(spitze) ? spitze : 0) * A[s]; }
    let vor = null;
    return L.map((w, i) => {
      let roh = {}, gedeckelt = false, fak = 1;
      if (w.phase === "Taper") { const f = i === L.length - 1 ? 0.4 : 0.6; for (const s of SPORT) roh[s] = Z[s]; fak = f; }
      else {
        const anteil = Math.min(1, (st / 100) * i / Math.max(1, N - 1));
        for (const s of SPORT) roh[s] = B[s] + (Z[s] - B[s]) * anteil;
        if (vor) {
          const sv = summe(vor), sz = summe(roh), grenze = sv + Math.max(sv * V75.STEIGERUNG.plus, V75.STEIGERUNG.plus_min_h);
          if (sz > grenze + 1e-9) { const f = (grenze - sv) / (sz - sv); for (const s of SPORT) roh[s] = vor[s] + (roh[s] - vor[s]) * f; gedeckelt = true; }
        }
        vor = roh;
        fak = w.erholung ? 0.65 : String(w.phase || "").startsWith("B-Rennen") ? 0.5 : 1;
      }
      const h = {}; for (const s of SPORT) h[s] = Math.max(0, roh[s] * fak);
      const tot = summe(h), anteile = {}; for (const s of SPORT) anteile[s] = tot > 0 ? h[s] / tot : A[s];
      return { woche: w.woche, phase: w.phase, erholung: !!w.erholung, schwimm: h.schwimm, rad: h.rad, lauf: h.lauf, summe: Math.round(tot * 2) / 2, aufteilung: anteile,
        roh: Object.assign({ summe: summe(roh) }, roh), gedeckelt };
    });
  };
  /** Kurzfassung für die Anzeige: ab welcher Woche die Spitze erreicht ist, Ø Zuwachs je Woche bis dahin bzw. bis zum Taper, gegriffene Grenze. */
  V75.verlauf = function (R, spitze) {
    const L = (R || []).filter((r) => r.phase !== "Taper"); if (!L.length) return null;
    const i = L.findIndex((r) => isNum(spitze) && r.roh.summe >= spitze - 1e-6), bis = i >= 0 ? i : L.length - 1;
    const plus = bis > 0 ? (L[bis].roh.summe - L[0].roh.summe) / bis : 0;
    return { spitzeAb: i >= 0 ? L[i].woche : null, spitzeNr: i >= 0 ? i : null, ende: L[L.length - 1].roh.summe, plus_h: plus,
      plus_pct: L[0].roh.summe > 0 ? plus / L[0].roh.summe * 100 : null, gedeckelt: L.filter((r) => r.gedeckelt).length };
  };

  /* ---------------- Indoor-Phase (indoor-phase-1.0) ---------------- */
  V75.indoorAm = (E, sport, datum) => { const p = E && E.indoor && E.indoor[sport]; return !!(p && typeof datum === "string" && datum >= p.von && datum <= p.bis); };
  /** Woche (Mein Plan) mit der Indoor-Phase: Rad- und Laufeinheiten ohne eigene Wahl (drinnen_fest) im Zeitraum gelten als drinnen. Liefert eine neue
   *  Woche (w bleibt unverändert) oder w selbst, wenn nichts zu tun ist. */
  V75.indoorAnwenden = function (w, E) {
    if (!w || !Array.isArray(w.tage) || !E || !E.indoor || !(E.indoor.rad || E.indoor.lauf)) return w;
    let neu = false;
    const tage = w.tage.map((t) => {
      if (!Array.isArray(t.einheiten)) return t;
      let tn = false;
      const L = t.einheiten.map((e) => {
        if (!e || (e.sport !== "rad" && e.sport !== "lauf") || e.drinnen || e.drinnen_fest || e.art === "bibliothek" || !V75.indoorAm(E, e.sport, t.date)) return e;
        tn = true;
        return Object.assign({}, e, { drinnen: true, drinnen_phase: true, titel: /\(drinnen\)$/.test(e.titel || "") ? e.titel : `${e.titel} (drinnen)` });
      });
      if (!tn) return t;
      neu = true;
      return Object.assign({}, t, { einheiten: L });
    });
    return neu ? Object.assign({}, w, { tage, indoor: true }) : w;
  };
  /** Wert für das Feld drinnen beim Speichern (einheit-felder-1.1): nur ausdrücklich, wenn es von der Phase abweicht – sonst entfernt (null). */
  V75.drinnenFeld = (E, sport, datum, drinnen) => { const p = V75.indoorAm(E, sport, datum); return drinnen ? (p ? null : true) : (p ? false : null); };
  return V75;
});
