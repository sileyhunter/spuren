/* Ironman Notebook V7.5 – Etappe 3 «Planeinstellungen» (Auftrag V7.3 «wie enduco», Vorbild: die Planeinstellungen von enduco), Rechenlogik ohne DOM.
   - planeinstellungen-1.0: Einstellungen des Plans je Gruppe (Eingabe «planeinstellung» → plan_einstellungen, «Direkt speichern», gleiche ID ersetzt
     mit Audit; gleiche Prüfung wie merge_daily.planeinstellung_pruefen): Start des Plans, eigene Basis-Fitness je Sportart, Steigerung, Indoor-Phase Rad
     und Laufen, Schwimmen (Hilfsmittel, Standard-Bahnlänge, Stile, Anfänger-Modus), V7.6 Krafttraining (kraft-plan-1.0: fester Termin je Woche und
     Ausnahmen je Woche, Plan-Logik in js/v76.js). Ohne Eintrag gilt der Standard.
   - basis-1.1 (Variante A, von Silas gewählt am 17.11.2026): Basis-Fitness je Sportart = Fitness der Sportart (42-Tage-Mittel ihrer Trainingslast wie
     pmc-2.0) am Montag der Woche, also bis zum Sonntag davor – so ändert sich eine Woche unter der Woche nicht. Start je Sportart = 7 × Fitness ÷
     Trainingslast pro Stunde dieser Sportart (Last ÷ Bewegungszeit der 8 abgeschlossenen Wochen, mit weniger als einer Stunde die 52 Wochen davor) =
     der Umfang, bei dem die Fitness gleich bleibt. Eigener Wert je Sportart (Fitness 0–200) ersetzt die berechnete; ohne Last pro Stunde «jetzt» × Anteil.
     Wahlweise wie bis V7.5.1: Start = «jetzt» (saison-1.2) × 20/50/30 (aufteilung-1.0). Start-Einstellungen gelten ab der Woche nach dem Speichern
     (die laufende Woche bleibt); Standard «Basis-Fitness» ab der Woche vom 23.11.2026, Wochen davor wie bisher.
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
  const V75 = { VERSIONS: { einstellungen: "planeinstellungen-1.0", basis: "basis-1.1", steigerung: "steigerung-1.0", indoor: "indoor-phase-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const istDatum = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(T(s)) && new Date(T(s)).toISOString().slice(0, 10) === s;
  const SPORT = (V75.SPORT = ["schwimm", "rad", "lauf"]);
  const aufteilung = () => (V64 && V64.AUFTEILUNG) || { schwimm: 0.2, rad: 0.5, lauf: 0.3 };

  /* ---------------- Einstellungen (planeinstellungen-1.0) ---------------- */
  V75.STEIGERUNG = { min: 50, max: 150, schritt: 5, standard: 100, plus: 0.1, plus_min_h: 0.5 };
  V75.INDOOR_MAX_TAGE = 366;
  V75.HILFSMITTEL = ["brett", "pullbuoy", "flossen", "paddles"];
  V75.STILE = ["ruecken", "brust"];                                      // Kraul ist immer dabei; Delfin plant die Seite nicht
  V75.START = ["fitness", "aufteilung"];                                 // basis-1.1: Start aus der Basis-Fitness oder «jetzt» × 20/50/30
  V75.START_AB = "2026-11-23";                                           // Standard «fitness» ab dieser Woche; Wochen davor wie bis V7.5.1
  V75.FIT_MAX = 200; V75.BASIS_MAX = 30;                                 // eigene Fitness 0–200; Start höchstens 30 h je Sportart
  V75.KRAFT = { dauer: 90, min: 15, max: 180, notiz: 500 };             // V7.6 kraft-plan-1.0: Standard 1:30 h
  V75.KRAFT_MODUS = ["auto", "fest"];                                    // kraft-plan-1.1: Tag automatisch (aus den möglichen Tagen) oder fest
  const tageOk = (L) => Array.isArray(L) && L.every((x) => Number.isInteger(x) && x >= 1 && x <= 7) && new Set(L).size === L.length;
  V75.IDS = { start: "pe-start", basis_schwimm: "pe-basis-schwimm", basis_rad: "pe-basis-rad", basis_lauf: "pe-basis-lauf", steigerung: "pe-steigerung",
    indoor_rad: "pe-indoor-rad", indoor_lauf: "pe-indoor-lauf", schwimm: "pe-schwimm", kraft: "pe-kraft", lang: "pe-lang" };
  // Gruppen, die den Aufbau des Plans ändern – sie gelten ab der Woche nach dem Speichern (opt.startBis), damit sich eine Woche nicht unter der Woche ändert.
  // V7.6: ein solcher Eintrag trägt die Fassung, die in der Woche des Speicherns noch gilt (vorher) – merge_daily behält je ID nur die neueste Fassung,
  // ohne vorher würde die laufende Woche nach dem nächsten Update auf den Standard fallen.
  const START_IDS = ["pe-start", "pe-basis-schwimm", "pe-basis-rad", "pe-basis-lauf", "pe-kraft", "pe-lang"];   // V7.6.1: auch die Tage für lange Einheiten
  V75.START_IDS = START_IDS;
  const KRAFT_WOCHE = /^pe-kraft-(\d{4}-\d{2}-\d{2})$/;                  // Ausnahme je Woche (Montag): auslassen oder verschieben
  const UHR = /^([01]\d|2[0-3]):[0-5][05]$/;
  const wtNr = (iso) => ((new Date(T(iso)).getUTCDay() + 6) % 7) + 1;
  const montagVon = (iso) => add(iso, 1 - wtNr(iso));
  /** Standard: Start aus der Basis-Fitness (ab START_AB), keine eigene Fitness, 100 %, keine Indoor-Phase, alle Hilfsmittel, Bahnlänge wie bisher (Gerät
   *  bzw. Enduco), Kraul und Rücken, kein Anfänger-Modus. */
  V75.standard = () => ({ start: "fitness", basis: { schwimm: null, rad: null, lauf: null }, steigerung: V75.STEIGERUNG.standard, indoor: { rad: null, lauf: null },
    schwimm: { hilfsmittel: V75.HILFSMITTEL.slice(), pool: null, stile: ["ruecken"], anfaenger: false },
    kraft: { aktiv: false, modus: "auto", tage: [1, 2, 3, 4, 5, 6, 7], wt: null, uhrzeit: null, dauer: V75.KRAFT.dauer, notiz: null }, kraftWochen: {},
    lang: { rad: [], lauf: [] }, stand: {} });
  const teilmenge = (x, erlaubt) => Array.isArray(x) && x.every((k) => erlaubt.includes(k)) && new Set(x).size === x.length;
  /** Prüft einen Eintrag → Fehlertext oder null (gleiche Regeln wie merge_daily.planeinstellung_pruefen). */
  V75.pruefen = function (e) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return "kein Eintrag";
    if (e.geaendert != null && (typeof e.geaendert !== "string" || isNaN(Date.parse(e.geaendert)))) return "Zeitpunkt der Änderung ungültig";
    if (e.vorher != null) {                                             // V7.6: Fassung, die in der Woche des Speicherns noch gilt (nur Gruppen ab nächster Woche)
      const v = e.vorher;
      if (!START_IDS.includes(e.id)) return "vorherige Fassung nur bei Start, Basis-Fitness, Krafttraining und langen Einheiten";
      if (typeof v !== "object" || Array.isArray(v) || v.vorher != null || typeof v.geaendert !== "string" || isNaN(Date.parse(v.geaendert))) return "vorherige Fassung ungültig";
      const f = V75.pruefen(Object.assign({}, v, { id: e.id }));
      if (f) return "vorherige Fassung: " + f;
    }
    const kw = typeof e.id === "string" ? KRAFT_WOCHE.exec(e.id) : null;
    if (kw) {                                                           // V7.6 kraft-plan-1.0: diese Woche auslassen oder auf einen Tag verschieben
      const mo = kw[1];
      if (!istDatum(mo) || wtNr(mo) !== 1) return "Woche: Montag als Datum";
      if (e.entfernt === true) return null;
      if (e.aus != null && typeof e.aus !== "boolean") return "Auslassen ja oder nein";
      if (e.tag != null && !(istDatum(e.tag) && e.tag >= mo && e.tag <= add(mo, 6))) return "Tag in dieser Woche";
      if (e.uhrzeit != null && !UHR.test(String(e.uhrzeit))) return "Uhrzeit hh:mm in 5-min-Schritten";
      return e.aus === true || e.tag != null ? null : "auslassen oder einen Tag wählen";
    }
    switch (e.id) {
      case "pe-kraft":                                                     // kraft-plan-1.1: modus auto (mögliche Tage) oder fest (Wochentag); ohne modus = fest
        if (typeof e.aktiv !== "boolean") return "Krafttraining an oder aus";
        if (e.modus != null && !V75.KRAFT_MODUS.includes(e.modus)) return "Tag automatisch oder fest";
        if (e.wt != null && !(Number.isInteger(e.wt) && e.wt >= 1 && e.wt <= 7)) return "Wochentag 1–7";
        if (e.tage != null && !tageOk(e.tage)) return "mögliche Tage 1–7, jeder einmal";
        if (e.aktiv && e.modus === "auto" && !(Array.isArray(e.tage) && e.tage.length)) return "mögliche Tage fehlen";
        if (e.aktiv && e.modus !== "auto" && e.wt == null) return "Wochentag fehlt";
        if (e.uhrzeit != null && !UHR.test(String(e.uhrzeit))) return "Uhrzeit hh:mm in 5-min-Schritten";
        if (e.dauer != null && !(Number.isInteger(e.dauer) && e.dauer >= V75.KRAFT.min && e.dauer <= V75.KRAFT.max && e.dauer % 5 === 0)) return "Dauer 15–180 min in 5-min-Schritten";
        if (e.notiz != null && !(typeof e.notiz === "string" && e.notiz.length <= V75.KRAFT.notiz)) return "Notiz höchstens 500 Zeichen";
        return null;
      case "pe-start":
        return V75.START.includes(e.art) ? null : "Start: Basis-Fitness oder Aufteilung";
      case "pe-lang":                                                      // verfuegbarkeit-1.1: bevorzugte Tage für lange Einheiten
        for (const k of ["rad", "lauf"]) if (e[k] != null && !tageOk(e[k])) return "Tage für lange Einheiten 1–7, jeder einmal";
        return null;
      case "pe-basis-schwimm": case "pe-basis-rad": case "pe-basis-lauf":
        return e.wert == null || (Number.isInteger(e.wert) && e.wert >= 0 && e.wert <= V75.FIT_MAX) ? null : "Basis-Fitness 0–200 als ganze Zahl";
      case "pe-steigerung":
        return Number.isInteger(e.wert) && e.wert >= V75.STEIGERUNG.min && e.wert <= V75.STEIGERUNG.max && e.wert % V75.STEIGERUNG.schritt === 0 ? null : "Steigerung 50–150 % in 5er-Schritten";
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
        if (e.anfaenger != null && typeof e.anfaenger !== "boolean") return "Anfänger-Modus ja oder nein";
        return null;
      default: return "unbekannte Einstellung";
    }
  };
  /** Neuer Eintrag (für «Direkt speichern»). felder je ID wie in V75.pruefen. alt = bisher neueste Fassung derselben ID (V75.aktuell): bei Gruppen, die ab der
   *  nächsten Woche gelten, kommt die Fassung mit, die in der Woche des Speicherns gilt – alt selbst, wenn es vor dem Montag dieser Woche gespeichert wurde,
   *  sonst das, was alt schon mittrug. */
  V75.eintrag = (id, felder, jetzt, alt) => {
    const x = Object.assign({ id, v: V75.VERSIONS.einstellungen }, felder || {}, { geaendert: jetzt || new Date().toISOString() });
    delete x.vorher;
    if (START_IDS.includes(id) && alt && alt.id === id && typeof alt.geaendert === "string") {
      const mo = montagVon(x.geaendert.slice(0, 10));
      const v = alt.geaendert.slice(0, 10) < mo ? Object.assign({}, alt) : alt.vorher ? Object.assign({}, alt.vorher) : null;
      if (v) { delete v.id; delete v.vorher; x.vorher = v; }
    }
    return x;
  };
  /** Neueste gültige Fassung einer ID aus den Daten und den Eingaben dieses Geräts (oder null). */
  V75.aktuell = function (daten, geraet, id) {
    let best = null;
    for (const L of [daten || [], geraet || []]) for (const x of L) {
      if (!x || x.id !== id || V75.pruefen(x)) continue;
      if (!best || String(x.geaendert || "") >= String(best.geaendert || "")) best = x;
    }
    return best;
  };
  /** Einstellungen aus den Daten (plan_einstellungen) und den noch nicht eingespielten Eingaben dieses Geräts; je ID gilt die neuere Fassung.
   *  opt.bis (Montag, für nachgerechnete vergangene Wochen wie V64.stand): nur Einträge, die vor diesem Tag gespeichert wurden.
   *  opt.startBis (Montag der geplanten Woche, basis-1.1): Start und eigene Basis-Fitness nur, wenn vor diesem Tag gespeichert – sie gelten ab der Woche
   *  nach dem Speichern. opt.montag: Montag der geplanten Woche für den Standard-Start (vor START_AB wie bisher «aufteilung»). */
  V75.einstellungen = function (daten, geraet, opt) {
    opt = opt || {};
    const E = V75.standard(), M = new Map(), vor = (x, tag) => !!(x.geaendert && String(x.geaendert).slice(0, 10) < tag);
    if (opt.montag && opt.montag < V75.START_AB) E.start = "aufteilung";
    // zu neu für die Woche → die Fassung, die der Eintrag als vorher mitträgt, wenn sie früh genug gespeichert war (V7.6), sonst nichts
    const frueher = (x, tag) => (vor(x, tag) ? x : x.vorher && vor(x.vorher, tag) ? Object.assign({}, x.vorher, { id: x.id }) : null);
    for (const L of [daten || [], geraet || []]) for (const x0 of L) {
      if (!x0 || V75.pruefen(x0)) continue;
      let x = x0;
      if (opt.bis) x = frueher(x, opt.bis);
      if (x && opt.startBis && START_IDS.includes(x.id)) x = frueher(x, opt.startBis);
      if (!x) continue;
      const alt = M.get(x.id); if (!alt || String(x.geaendert || "") >= String(alt.geaendert || "")) M.set(x.id, x);
    }
    for (const [id, x] of M) {
      if (id === "pe-start") E.start = x.art;
      else if (id.startsWith("pe-basis-")) E.basis[id.slice(9)] = isNum(x.wert) ? x.wert : null;
      else if (id === "pe-steigerung") E.steigerung = x.wert;
      else if (id === "pe-indoor-rad" || id === "pe-indoor-lauf") E.indoor[id === "pe-indoor-rad" ? "rad" : "lauf"] = x.von && x.bis ? { von: x.von, bis: x.bis } : null;
      else if (id === "pe-schwimm") E.schwimm = { hilfsmittel: x.hilfsmittel.slice(), pool: x.pool === 25 || x.pool === 50 ? x.pool : null, stile: x.stile.slice(), anfaenger: x.anfaenger === true };
      else if (id === "pe-kraft") E.kraft = { aktiv: x.aktiv, modus: x.modus || "fest", tage: tageOk(x.tage) && x.tage.length ? x.tage.slice().sort() : [1, 2, 3, 4, 5, 6, 7],
        wt: x.wt == null ? null : x.wt, uhrzeit: x.uhrzeit || null, dauer: x.dauer || V75.KRAFT.dauer, notiz: x.notiz || null };
      else if (id === "pe-lang") E.lang = { rad: tageOk(x.rad) ? x.rad.slice().sort() : [], lauf: tageOk(x.lauf) ? x.lauf.slice().sort() : [] };
      else if (KRAFT_WOCHE.test(id)) { const mo = KRAFT_WOCHE.exec(id)[1]; if (x.entfernt !== true) E.kraftWochen[mo] = { aus: x.aus === true, tag: x.tag || null, uhrzeit: x.uhrzeit || null }; }
      E.stand[id] = x.geaendert || null;
    }
    return E;
  };

  /* ---------------- Basis je Sportart (basis-1.1) ---------------- */
  /** Start des Plans je Sportart. vg = AN.saisonVorgaben(...) ({ jetzt }), E = V75.einstellungen(...), A = Aufteilung, D = V75.basisDaten(...) am Montag.
   *  Start «fitness»: je Sportart 7 × Fitness (eigene oder berechnete) ÷ Last pro Stunde, höchstens 30 h; ohne Fitness oder Last pro Stunde «jetzt» × Anteil.
   *  Start «aufteilung» (oder ohne D): «jetzt» × 20/50/30 wie bis V7.5.1.
   *  → { schwimm: { h, anteil, fitness, fitness_ber, eigen, tl_h, quelle }, rad, lauf, summe, jetzt, quelle, stand } */
  V75.basis = function (vg, E, A, D) {
    A = A || aufteilung(); E = E || V75.standard();
    const jetzt = vg && isNum(vg.jetzt) ? vg.jetzt : 8, modus = E.start === "fitness" && D ? "fitness" : "aufteilung";
    const out = { summe: 0, jetzt, quelle: modus, stand: D ? D.stand : null };
    for (const s of SPORT) {
      const d = D && D[s] ? D[s] : {}, ber = isNum(d.fitness) ? d.fitness : null, eigen = E.basis && isNum(E.basis[s]) ? E.basis[s] : null;
      const fit = eigen != null ? eigen : ber, tlh = isNum(d.tl_h) && d.tl_h > 0 ? d.tl_h : null;
      const mitFit = modus === "fitness" && fit != null && tlh != null;
      const h = mitFit ? Math.min(V75.BASIS_MAX, (7 * fit) / tlh) : jetzt * A[s];
      out[s] = { h, anteil: A[s], fitness: fit, fitness_ber: ber, eigen, tl_h: tlh, quelle: mitFit ? "fitness" : "aufteilung" };
      out.summe += h;
    }
    out.summe = Math.round(out.summe * 100) / 100;
    return out;
  };
  /** Grundlagen der Basis am Montag «montag»: Fitness je Sportart bis zum Sonntag davor (V75.fitness) und Last pro Stunde der 8 abgeschlossenen
   *  Wochen davor (Last ÷ Bewegungszeit mv bzw. dur wie saison-1.2); mit weniger als einer Stunde der Sportart die 52 Wochen davor.
   *  → { schwimm: { fitness, tl_h, h, wochen }, rad, lauf, stand: montag } */
  V75.basisDaten = function (acts, montag, last) {
    last = last || ((a) => (isNum(a.tss) ? a.tss : 0));
    const F = V75.fitness(acts, montag, last), out = { stand: montag };
    const fenster = (tage) => {
      const von = add(montag, -tage), r = { schwimm: { tl: 0, h: 0 }, rad: { tl: 0, h: 0 }, lauf: { tl: 0, h: 0 } };
      for (const a of acts || []) {
        if (!a || !r[a.sport] || !a.date || a.date < von || a.date >= montag) continue;
        const h = (a.mv || a.dur || 0) / 3600; if (!(h > 0)) continue;
        r[a.sport].tl += last(a) || 0; r[a.sport].h += h;
      }
      return r;
    };
    const w8 = fenster(56); let w52 = null;
    for (const s of SPORT) {
      let q = w8[s], wochen = 8;
      if (q.h < 1) { w52 = w52 || fenster(364); q = w52[s]; wochen = 52; }
      out[s] = { fitness: F[s], tl_h: q.h >= 1 && q.tl > 0 ? Math.round((q.tl / q.h) * 10) / 10 : null, h: Math.round(q.h * 10) / 10, wochen };
    }
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
