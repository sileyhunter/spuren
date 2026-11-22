/* Ironman Notebook V6.6 – Etappe 6 «Kalender und Woche bearbeiten», Rechenlogik ohne DOM (Auftrag docs/auftrag-etappen-6-8.md).
   - eigenplan-1.0: «Mein Plan» = Wochenvorschlag (wochenplan-1.2) mit deinen Änderungen je Tag (plan_woche): Training hinzufügen, Dauer ändern,
     verschieben, entfernen, Tag sperren; Wochenaktionen «Änderungen verwerfen» und «Woche leeren». Vergangene und gesperrte Tage ändern sich nie.
   - vorlagen-1.0: Vorlagen für «Training hinzufügen» = die Bausteine der Modelle (V64.BAUSTEINE, eigene Texte) plus Kraft/Athletik und Mobility.
     Dauer in 5-min-Schritten; Schlüsseleinheiten ab ihrer kurzen Fassung, längere Wünsche werden mit lockerem Fahren bzw. Laufen (Z2) ergänzt.
   - tl-plan-1.1 (V8.1): wie 1.0, aber mit den Bezugsgrössen der absolvierten Last (last-2.1: LT2 der Rolle drinnen, sonst Puls ÷ Schwellenpuls), V66.lastBezug.
   - tl-plan-1.0: TL ≈ geplanter Einheiten aus dem aktiven Zonenprofil (eigene Festlegung, Modell): Rad (Leistung ÷ LT2)², Laufen (Tempo ÷
     Tempo an der LT2)², Schwimmen (Tempo ÷ CSS)³, je × Stunden × 100 (wie last-2.0). Distanz ≈ für Laufen und Schwimmen aus Dauer und Ziel-Pace.
     Ohne Bezugswert keine Zahl; Tests und Kraft ohne TL.
   - V7.2 verfuegbarkeit-1.0 (Wunsch vom 16.11.2026, Vorbild enduco): Zeit und erlaubte Sportarten je Tag oder je Wochentag; der Vorschlag wird
     danach verteilt (V66.verteilen). eigenplan-1.1: Wochen ohne eigene Änderungen folgen der Verfügbarkeit von selbst; wird eine verteilte Woche
     bearbeitet, wird sie als Ganzes festgehalten (vergangene Tage «eingefroren»), damit nichts zurückspringt. «Anpassen» verteilt den Rest der
     Woche neu (Gesperrtes und Eigenes bleibt), «Neu berechnen» setzt Wochen auf den Vorschlag zurück (gesperrte Tage bleiben).
   - V7.4 eigenplan-1.2 (ampel-plan-1.0, js/v74.js): «Woche anpassen?» rechnet auf deinen Knopfdruck den Rest der Woche wie eine Erholungswoche
     (Aktion «erholung»); die Ampel-Schicht selbst ändert Mein Plan nie. Zu jeder Einheit trägt der Garmin-Auftrag die lockere Fassung mit.
   - V7.5 einheit-felder-1.1 (Planeinstellungen, js/v75.js): Bahnlänge je Schwimm-Einheit (pool 25/50, sonst der Standard); drinnen = false bleibt
     gespeichert (ausdrücklich draussen in einer Indoor-Phase), true = ausdrücklich drinnen; ohne Feld gilt die Indoor-Phase.
   - V9.2 umplanen-1.0 (Auftrag «Woche wie Enduco», Etappe W1, docs/auftrag-enduco-woche.md): die Woche ist eine Funktion ihrer Eingaben –
     Woche = Planer(Vorschlag, Grenzen je Tag, Festes). Jede Einstellung rechnet die ganze Woche aus dem unverteilten Vorschlag (ctx.roh) neu, nicht aus
     dem gespeicherten Stand: vergangene und gesperrte Tage bleiben, Anker (von Hand gesetzt, verschoben, geändert, ersetzt) bleiben an ihrem Tag,
     Streichungen (E.gestrichen) bleiben gestrichen. eigenplan-1.3: neue optionale Felder gestrichen, anker, statt, verteilung.fehlt/frage.
     grenzen-1.0: die Zeit eines Tages (Standard des Wochentags oder von Hand gesetzt) ist für alles, was die Seite selbst setzt, eine harte Obergrenze;
     an von Hand gesetzten Tagen auch die Sportarten. verfuegbarkeit-1.3: V66.verteilen nimmt auch Einheiten, deren Tag fest ist (opt.extra). */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V66 = factory(node ? require("./v64.js") : root && root.V64);
  if (node) module.exports = V66;
  if (root) root.V66 = V66;
})(typeof window !== "undefined" ? window : null, function (V64) {
  "use strict";
  const V66 = { VERSIONS: { eigenplan: "eigenplan-1.3", vorlagen: "vorlagen-1.0", tl: "tl-plan-1.1", wochenblatt: "wochenblatt-1.0", kalender: "kalender-2.0",
    verfuegbarkeit: "verfuegbarkeit-1.3", felder: "einheit-felder-1.1", anpassen: "einheit-anpassen-1.0", eigen: "eigene-aktivitaet-1.0",
    umplanen: "umplanen-1.0", grenzen: "grenzen-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const add = (iso, n) => V64.addDays(iso, n);

  /* ---------------- Vorlagen (vorlagen-1.0) ---------------- */
  // V8.4.1 (Silas am 18.11.2026: «lösche bei Trainings Mobility, ergänze dafür die Lauf-ABC»): Mobility wird nicht mehr angeboten – die Lauf-ABC
  // gehört zu den harten Läufen (lauf-abc-1.0, js/v64.js). Vorlage «mobility» bleibt nur, damit ältere Einträge lesbar bleiben.
  V66.SPORTARTEN = [["schwimm", "Schwimmen"], ["rad", "Rad"], ["rad_drinnen", "Rad drinnen"], ["lauf", "Laufen"], ["lauf_drinnen", "Laufen drinnen"],
    ["kraft", "Kraft und Athletik"]];
  V66.ARTEN = { grundlage: "Grundlage", lang: "Lang", tempo: "Tempo", schwelle: "Schwelle", vo2max: "VO2max", renntempo: "Renntempo",
    koppel: "Koppellauf", technik: "Technik und Kurs", aktivierung: "Aktivierung", test: "Test", kraft: "Kraft und Athletik", mobility: "Mobility", draussen: "Draussen" };
  const EXTRA = {
    kraft: { sport: "kraft", titel: "Krafttraining", art: "kraft", zweck: "Kraft- und Stabilisationsübungen nach deinem Programm; die Seite plant keine Übungen und keine Ziele." },
    mobility: { sport: "mobility", titel: "Mobility", art: "mobility", zweck: "Beweglichkeit und Lockerung, ohne Ziele." },   // nur noch für ältere Einträge (V8.4.1)
    // V7.7 aktivitaet-plan-1.0 (js/v77.js): Aktivitäten draussen, nach Puls (Pulszonen vom Laufen), blockieren ihren Tag; nur über «Draussen planen»
    skitour: { sport: "ski", titel: "Skitour", art: "draussen", draussen: true, zweck: "Skitour nach Puls im Grundlagenbereich. Ersetzt Rad-Stunden der Woche; am Vortag und am Tag danach keine harte Einheit an Land." },
    wandern: { sport: "wandern", titel: "Wandern", art: "draussen", draussen: true, zweck: "Wanderung nach Puls im Grundlagenbereich. Ersetzt Rad-Stunden der Woche; am Vortag und am Tag danach keine harte Einheit an Land." },
    langlauf: { sport: "ski", titel: "Langlauf", art: "draussen", draussen: true, zweck: "Langlauf nach Puls im Grundlagenbereich. Ersetzt Rad-Stunden der Woche; am Vortag und am Tag danach keine harte Einheit an Land." },
    trail: { sport: "lauf", titel: "Traillauf", art: "draussen", draussen: true, zweck: "Traillauf nach Puls im Grundlagenbereich. Ersetzt Lauf-Stunden der Woche und zählt im Aufbau-Check als Lauf; am Vortag und am Tag danach keine harte Einheit an Land." },
    // V7.10 eigene-aktivitaet-1.0 (Tagesblatt «Eigene Aktivität planen»): Titel und Sportart von dir, Anstrengung als RPE; nur über dieses Blatt
    eigen: { sport: null, titel: "Eigene Aktivität", art: "eigen", eigen: true, zweck: "Deine eigene Aktivität nach Gefühl (RPE)." },
  };
  /** eigene-aktivitaet-1.0: Sportarten und RPE (CR-10 nach Foster) → Zone, umgekehrt zu rpe-zonen-1.0 (js/v73.js; eigene Festlegung). Für Rad und Laufen:
   *  1–2 Z1, 3–4 Z2, 5–6 Z3, 7 knapp unter LT2, 8–10 VO2max; Schwimmen: 1–2 Z1, 3–4 Z2, 5–6 Z3, 7–10 CSS-Tempo; andere ohne Zone (zählt nicht in TL ≈). */
  V66.EIGEN_SPORT = ["rad", "lauf", "schwimm", "andere"];                      // V8.4.1: ohne Mobility
  V66.rpeZone = function (rpe, sport) {
    if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) return null;
    if (sport === "rad" || sport === "lauf") return rpe <= 2 ? "z1" : rpe <= 4 ? "z2" : rpe <= 6 ? "z3" : rpe === 7 ? "z3o" : "vo2";
    if (sport === "schwimm") return rpe <= 2 ? "z1" : rpe <= 4 ? "z2" : rpe <= 6 ? "z3" : "css";
    return null;
  };
  // Vorlage → [Art, min, max, Standard] in Minuten; ohne Zahlen: Schlüsseleinheit (min = kurze Fassung, Standard = volle, max = volle + 60)
  const ZU = {
    rad_locker: ["grundlage", 30, 300, 60], rad_lang: ["lang", 90, 360, 180], rad_lang_rt: ["renntempo", 120, 360, 180],
    rad_tempo: ["tempo"], rad_schwelle: ["schwelle"], rad_laktat: ["schwelle"], rad_vo2: ["vo2max"], aktivierung: ["aktivierung"], test_rad: ["test"],
    lauf_locker: ["grundlage", 20, 120, 45], lauf_lang: ["lang", 60, 210, 90], lauf_lang_rt: ["renntempo", 75, 210, 100], lauf_tempo: ["tempo"],
    lauf_laktat: ["schwelle"], lauf_vo2: ["vo2max"], lauf_koppel: ["koppel", 10, 60, 20], test_lauf: ["test"],
    schwimm_locker: ["grundlage", 20, 90, 45], schwimm_css: ["schwelle"], schwimm_kurs: ["technik", 30, 90, 60], test_css: ["test"],
    kraft: ["kraft", 15, 180, 90], mobility: ["mobility", 10, 60, 20],             // V7.6 kraft-plan-1.0: Standard 1:30 h, bis 3 h
    skitour: ["draussen", 60, 600, 300], wandern: ["draussen", 60, 600, 240], langlauf: ["draussen", 60, 600, 120], trail: ["draussen", 60, 600, 120],   // V7.7 aktivitaet-plan-1.0
    eigen: ["eigen", 10, 600, 60],                                                  // V7.10 eigene-aktivitaet-1.0
    // V8.4 abwechslung-1.0: gleicher Reiz in anderer Form (V64.FAMILIEN)
    rad_vo2_4x5: ["vo2max"], rad_vo2_4020: ["vo2max"], rad_schwelle_4x10: ["schwelle"], rad_schwelle_3x12: ["schwelle"], rad_tempo_3x15: ["tempo"],
    lauf_vo2_5x3: ["vo2max"], lauf_vo2_3030: ["vo2max"], lauf_tempo_2x15: ["tempo"], lauf_tempo_4x8: ["tempo"], schwimm_css_200: ["schwelle"], schwimm_css_300: ["schwelle"],
  };
  const DYN = new Set(["locker", "lang", "kurs", "koppel"]);    // Bausteine, deren Dauer frei ist (V64: o.d)
  const r5 = (x) => Math.round(x / 5) * 5;
  /** Dauerbereich einer Vorlage: {min, max, std, fest} in Minuten; null = unbekannt. */
  V66.bereich = function (id) {
    const z = ZU[id]; if (!z) return null;
    if (EXTRA[id]) return { min: z[1], max: z[2], std: z[3], fest: false };
    const b = V64.BAUSTEINE[id]; if (!b) return null;
    if (b.fix) { const d = V64.einheit(id, {}).dauer; return { min: d, max: d, std: d, fest: true }; }
    if (z.length > 1) return { min: z[1], max: z[2], std: z[3], fest: false };
    const voll = V64.einheit(id, {}).dauer, kurz = V64.einheit(id, { kurz: true }).dauer;
    return { min: r5(kurz), max: r5(voll) + 60, std: r5(voll), fest: false };
  };
  /** Vorlagen einer Sportart (Schlüssel aus SPORTARTEN), gruppiert nach Art in der Reihenfolge von ARTEN. */
  V66.vorlagen = function (sportKey) {
    const basis = String(sportKey || "").replace("_drinnen", "");
    const out = [];
    for (const id of Object.keys(ZU)) {
      const b = EXTRA[id] || V64.BAUSTEINE[id]; if (!b || b.sport !== basis || b.draussen || b.eigen) continue;     // V7.7: Draussen nur über «Draussen planen»; V7.10: eigene nur über ihr Blatt
      if (sportKey.endsWith("_drinnen") && ["lang", "renntempo", "koppel"].includes(ZU[id][0])) continue;   // drinnen keine langen Einheiten und kein Koppellauf
      out.push(Object.assign({ id, sport: b.sport, art: ZU[id][0], titel: b.titel }, V66.bereich(id)));
    }
    const ord = Object.keys(V66.ARTEN);
    return out.sort((a, b) => ord.indexOf(a.art) - ord.indexOf(b.art));
  };

  /** Gespeicherte Einheit (uid, vorlage, dauer, quelle, drinnen, bei Bibliothek wid/sport/titel) → Einheit wie V64.einheit, mit uid und quelle.
   *  ctx = { phase, css_s } wie im Wochenvorschlag. */
  V66.einheit = function (s, ctx) {
    ctx = ctx || {};
    if (!s) return null;
    const mehr = { uid: s.uid, quelle: s.quelle || "eigen", vorlage: s.vorlage || null, drinnen: !!s.drinnen };
    if (typeof s.drinnen === "boolean") mehr.drinnen_fest = true;      // V7.5: ausdrücklich gewählt – die Indoor-Phase (indoor-phase-1.0) ändert nichts
    if (s.anker === true) mehr.anker = true;                             // V9.2 umplanen-1.0: von Hand verschoben – bleibt an diesem Tag
    // V7.3 einheit-felder-1.0: Uhrzeit, Sperre und Metrik je Einheit (nur übernommen, wenn gültig); 1.1: Bahnlänge je Schwimm-Einheit
    for (const k of ["uhrzeit", "gesperrt", "metrik", "pool"]) if (s[k] != null && s[k] !== false && !V66.feldPruefen(k, s[k])) mehr[k] = s[k];
    if (s.quelle === "bibliothek") {
      // Stufe aus den Zielen der Schritte (ctx.bibStufe, js/v65-ui.js), sonst laut Titel (V64.planStufe), sonst offen – nie geraten
      const st = (ctx.bibStufe && ctx.bibStufe(s.wid)) || ((V64.planStufe(null, s.titel) || {}).stufe) || "offen";
      return Object.assign({ id: "bibliothek", sport: s.sport, titel: s.titel || "Enduco-Workout", art: "bibliothek", dauer: s.dauer, teile: [], minuten: { locker: 0, mittel: 0, hart: 0 },
        stufe: st, ablauf: ["Ablauf wie im Enduco-Workout (Bibliothek)"], zweck: "Aus deiner Enduco-Bibliothek eingeplant.", quellen: [], wissen: "vergleich", wid: s.wid }, mehr);
    }
    const X = EXTRA[s.vorlage];
    if (X && X.draussen) {                                             // V7.7 aktivitaet-plan-1.0: ein Abschnitt in Z1 oder Z2 nach Puls
      const z = s.zone === "z1" ? "z1" : "z2";
      return Object.assign({ id: s.vorlage, sport: X.sport, titel: `${X.titel} ${z.toUpperCase()}`, art: "draussen", draussen: s.vorlage, zone: z, dauer: s.dauer, teile: [[z, s.dauer]],
        minuten: { locker: s.dauer, mittel: 0, hart: 0 }, ablauf: [`${s.dauer} min in ${z.toUpperCase()} nach Puls`], zweck: X.zweck, quellen: [], wissen: "draussen", metrik: "puls",
        spec: Object.assign({}, s) }, mehr, { metrik: "puls" });
    }
    if (X && X.eigen) {                                                // V7.10 eigene-aktivitaet-1.0: ein Abschnitt in der Zone zur RPE, Metrik RPE
      const sp = V66.EIGEN_SPORT.includes(s.sport) ? s.sport : "andere", z = V66.rpeZone(s.rpe, sp), dauer = s.dauer;
      const minuten = { locker: 0, mittel: 0, hart: 0 }, b3 = z && (sp === "rad" || sp === "lauf") ? V64.DREI[z] : null; if (b3) minuten[b3] = dauer;
      return Object.assign({ id: "eigen", sport: sp, titel: String(s.titel || X.titel).slice(0, 60), art: "eigen", eigen: true, rpe: s.rpe, dauer, teile: [[z || "ohne", dauer]], minuten,
        ablauf: [`${dauer} min nach Gefühl, RPE ${s.rpe} von 10`], zweck: X.zweck, quellen: [], wissen: "modelle", spec: Object.assign({}, s) }, mehr, z ? { metrik: "rpe" } : {});
    }
    if (X) return Object.assign({ id: s.vorlage, sport: X.sport, titel: X.titel, art: X.art, dauer: s.dauer, teile: [["ohne", s.dauer]], minuten: { locker: 0, mittel: 0, hart: 0 },
      ablauf: [`${s.dauer} min`], zweck: X.zweck, quellen: [], wissen: null }, mehr);
    const b = V64.BAUSTEINE[s.vorlage]; if (!b) return null;
    const o = { phase: ctx.phase, css_s: ctx.css_s };
    let e;
    if (b.fix) e = V64.einheit(s.vorlage, o);
    else if (DYN.has(b.art)) e = V64.einheit(s.vorlage, Object.assign({ d: s.dauer }, o));
    else {
      const voll = V64.einheit(s.vorlage, o), kurz = V64.einheit(s.vorlage, Object.assign({ kurz: true }, o));
      e = isNum(s.dauer) && s.dauer >= voll.dauer ? voll : kurz;
      const rest = isNum(s.dauer) ? Math.round(s.dauer - e.dauer) : 0;
      if (rest >= 5) {
        e.teile = e.teile.concat([["z2", rest]]); e.dauer += rest;
        if (e.sport === "rad" || e.sport === "lauf") e.minuten.locker += rest;
        e.ablauf = e.ablauf.concat([`dann ${rest} min locker (Z2)`]);
      }
    }
    // V7.3 einheit-anpassen-1.0: Einfahren und Intervall-Intensität (Pausen zwischen den Belastungen) je Einheit, eigene Festlegung
    const einOk = s.ein_min != null && !V66.feldPruefen("ein_min", s.ein_min), pOk = s.pausen != null && s.pausen !== 50 && !V66.feldPruefen("pausen", s.pausen);
    if ((einOk || pOk) && e.teile.some(([k]) => ARBEIT_K.has(k))) {
      e.teile = V66.teileAnpassen(e.teile, { ein_min: einOk ? s.ein_min : null, pausen: pOk ? s.pausen : null });
      e.dauer = Math.round(e.teile.reduce((x, t) => x + t[1], 0));
      if (e.sport === "rad" || e.sport === "lauf") { const m = { locker: 0, mittel: 0, hart: 0 }; for (const [k, v] of e.teile) { const z = V64.DREI[k]; if (z) m[z] += v; } e.minuten = m; }
      e.ablauf = e.ablauf.concat([[einOk ? `Einfahren angepasst: ${s.ein_min} min` : "", pOk ? `Pausen ${s.pausen < 50 ? "länger" : "kürzer"} (Intervall-Intensität ${s.pausen} %)` : ""].filter(Boolean).join(", ")]);
      mehr.ein_min = einOk ? s.ein_min : null; mehr.pausen = pOk ? s.pausen : 50;
    }
    if (s.drinnen) e.titel += " (drinnen)";
    return Object.assign(e, mehr);
  };
  /* V7.3 einheit-felder-1.0: Felder je Einheit in Mein Plan (Uhrzeit, Sperre, Metrik, drinnen, Einfahren, Intervall-Intensität); 1.1 (V7.5): Bahnlänge. */
  V66.FELDER = { uhrzeit: 1, gesperrt: 1, metrik: 1, drinnen: 1, ein_min: 1, pausen: 1, pool: 1 };
  V66.METRIKEN = ["leistung", "pace", "puls", "rpe"];
  /** Prüft ein Feld einer Einheit → Fehlertext oder null (null-Wert = Feld entfernen, immer erlaubt). Gleiche Regeln wie merge_daily.einheit_feld_pruefen. */
  V66.feldPruefen = function (k, v) {
    if (v == null) return null;
    switch (k) {
      case "uhrzeit": return /^([01]\d|2[0-3]):[0-5][05]$/.test(String(v)) ? null : "Uhrzeit hh:mm in 5-min-Schritten";
      case "gesperrt": case "drinnen": return typeof v === "boolean" ? null : "ja oder nein";
      case "metrik": return V66.METRIKEN.includes(v) ? null : "unbekannte Metrik";
      case "ein_min": return Number.isInteger(v) && v >= 5 && v <= 40 && v % 5 === 0 ? null : "Einfahren 5–40 min";
      case "pausen": return Number.isInteger(v) && v >= 0 && v <= 100 && v % 10 === 0 ? null : "Intervall-Intensität 0–100 % in 10er-Schritten";
      case "pool": return v === 25 || v === 50 ? null : "Bahnlänge 25 oder 50 m";
      default: return "unbekanntes Feld";
    }
  };
  const ARBEIT_K = new Set(["z3", "z3o", "vo2", "css", "renntempo"]);
  const GESPERRT_E = "Einheit gesperrt – zuerst entsperren";
  /** Sportart einer gespeicherten Einheit (Vorlage bzw. Bibliothek). */
  const sportVon = (s) => (s && (s.quelle === "bibliothek" || s.vorlage === "eigen") ? s.sport : ((EXTRA[s && s.vorlage] || V64.BAUSTEINE[s && s.vorlage] || {}).sport || null));
  /** einheit-anpassen-1.0 (eigene Festlegung): Abschnitte [key, min] anpassen. ein_min = Dauer vor dem ersten Belastungsabschnitt (zuerst Z1 wie
   *  bisher, höchstens ein_min, Rest Z2); pausen = Intervall-Intensität 0–100 % (50 = wie die Vorlage): Erholungen zwischen dem ersten und dem
   *  letzten Belastungsabschnitt und jede kurze Pause nach dem ersten (auch die der letzten Wiederholung) × (1,5 − pausen/100), unter 1 min
   *  auf 5 s, sonst auf 15 s gerundet; das Ausfahren bleibt. Einheiten ohne Belastungsabschnitt bleiben. */
  V66.teileAnpassen = function (teile, a) {
    if (!Array.isArray(teile) || !teile.length || !a) return teile;
    let T = teile.map((t) => [t[0], t[1]]);
    const erste = T.findIndex((t) => ARBEIT_K.has(t[0]));
    if (erste < 0) return T;
    let letzte = -1; for (let i = T.length - 1; i >= 0; i--) if (ARBEIT_K.has(T[i][0])) { letzte = i; break; }
    if (isNum(a.pausen) && a.pausen !== 50) {
      const f = 1.5 - a.pausen / 100;
      // Pausen nach dem ersten Belastungsabschnitt (auch die Pause der letzten Wiederholung, sonst bricht die Serie) und lockere Abschnitte
      // zwischen den Belastungen; das Ausfahren bleibt
      for (let i = erste + 1; i < T.length; i++) if (T[i][0] === "pause" || (T[i][0] === "z1" && i < letzte)) {
        const s = T[i][1] * 60 * f, r = s < 60 ? Math.max(5, Math.round(s / 5) * 5) : Math.max(15, Math.round(s / 15) * 15);
        T[i][1] = r / 60;
      }
    }
    if (isNum(a.ein_min)) {
      const z1 = T.slice(0, erste).filter((t) => t[0] === "z1").reduce((s, t) => s + t[1], 0);
      const z1n = Math.min(z1 > 0 ? z1 : 5, a.ein_min), z2n = Math.max(0, a.ein_min - z1n), vor = [];
      if (z1n > 0) vor.push(["z1", z1n]); if (z2n > 0) vor.push(["z2", z2n]);
      T = vor.concat(T.slice(0, erste).filter((t) => t[0] === "abc"), T.slice(erste));        // lauf-abc-1.0: die Lauf-ABC bleibt nach dem Einlaufen
    }
    return T;
  };

  /* ---------------- Mein Plan (eigenplan-1.0) ---------------- */
  V66.leer = (montag) => ({ id: "wo-" + montag, v: V66.VERSIONS.eigenplan, montag, tage: {} });
  const vorschlagGespeichert = (d, L) => (L || []).map((e, i) => ({ uid: `v-${d}-${i}`, vorlage: e.id, dauer: e.dauer, quelle: "vorschlag" }));
  const kern = (s) => `${s.quelle}:${s.vorlage || s.wid}:${s.dauer}`;
  /** Mein Plan einer Woche: w = V64.woche(...), eintrag = plan_woche-Eintrag dieser Woche (oder null). Tage mit eigener Liste ersetzen den
   *  Vorschlag; gesperrte Tage tragen «gesperrt». Liefert eine neue Woche (w bleibt unverändert); jede Einheit hat uid und quelle. */
  V66.meinPlan = function (w, eintrag, ctx) {
    if (!w || !Array.isArray(w.tage)) return w;
    const ganz = !!(eintrag && eintrag.ganz);
    const tage = w.tage.map((t) => {
      const o = eintrag && eintrag.tage ? eintrag.tage[t.date] : null, liste = !!(o && Array.isArray(o.einheiten));
      // eigenplan-1.1: in einer ganz festgehaltenen Woche gilt ein Tag nur als bearbeitet, wenn er vom Vorschlag abweicht
      const bearbeitet = liste && !(ganz && JSON.stringify(o.einheiten.map(kern)) === JSON.stringify(vorschlagGespeichert(t.date, t.einheiten).map(kern)));
      const neu = Object.assign({}, t, { vorschlag: t.einheiten, gesperrt: !!(o && o.gesperrt), bearbeitet, eingefroren: !!(o && o.eingefroren) });
      neu.einheiten = liste ? o.einheiten.map((s) => V66.einheit(s, ctx)).filter(Boolean)
        : (t.einheiten || []).map((e, i) => Object.assign({}, e, { uid: `v-${t.date}-${i}`, quelle: "vorschlag" }));
      return neu;
    });
    const out = Object.assign({}, w, { tage, bearbeitet: tage.some((t) => t.bearbeitet), gesperrt: tage.filter((t) => t.gesperrt).map((t) => t.date), eigenplan: V66.VERSIONS.eigenplan,
      festgehalten: ganz, erholung_ab: eintrag && eintrag.erholung && eintrag.erholung.ab ? eintrag.erholung.ab : null });
    if (!out.bearbeitet) return out;
    // Bearbeitete Woche: Stunden und Verteilung aus deinen Einheiten neu (wie V64.woche); Bibliothek ohne bekannte Ziele = offen, nicht gezählt
    const minuten = { schwimm: 0, rad: 0, lauf: 0 }, z = { locker: 0, mittel: 0, hart: 0, offen: 0 };
    for (const t of tage) for (const e of t.einheiten) {
      if (minuten[e.sport] != null) minuten[e.sport] += e.dauer;
      if (e.sport !== "rad" && e.sport !== "lauf") continue;
      if (e.art === "bibliothek") { z.offen += e.dauer; continue; }
      for (const k of ["locker", "mittel", "hart"]) z[k] += (e.minuten && e.minuten[k]) || 0;
    }
    minuten.total = minuten.schwimm + minuten.rad + minuten.lauf;
    const tid = V64.tid(z), pruefung = Object.assign({}, V64.pruefen(w.modell, tid, { erholung: w.erholung, taper: w.taper,
      rennwoche: tage.some((t) => t.rennen), gekappt: !!(w.gekappt && w.gekappt.length) }));
    if (z.offen) pruefung.text = `${pruefung.text ? pruefung.text + " " : ""}${Math.round(z.offen)} min aus der Bibliothek ohne bekannte Ziele nicht gezählt.`;
    return Object.assign(out, { minuten, zonen: z, tid, pruefung, vorschlag_minuten: w.minuten });
  };
  let zaehler = 0;
  const neuId = () => "e-" + Date.now().toString(36) + "-" + (zaehler++).toString(36) + Math.random().toString(36).slice(2, 6);
  /** Aufbau-Check (aufbau-1.2) für einen Lauf in Mein Plan: gemeldet, nie verhindert. e = Einheit, km = Distanz ≈ (V66.schaetzung),
   *  laeufe = V64.laeufe(Aktivitäten), heute = ISO. Grenze wie im Wochenvorschlag: 10 % über dem längsten Lauf der 30 Tage davor;
   *  ohne Lauf in diesen 30 Tagen (Pause) höchstens V64.PAUSE_MIN min locker. Ohne Läufe in den Daten nichts. → Text oder null. */
  V66.aufbauHinweis = function (e, datum, km, laeufe, heute) {
    if (!e || e.sport !== "lauf" || e.art === "test" || !Array.isArray(laeufe) || !laeufe.length) return null;
    const g = V64.laufGrenze(laeufe, datum, heute);
    const kmT = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
    if (!g) {
      const hart = e.minuten && (e.minuten.mittel > 0 || e.minuten.hart > 0);
      if (e.dauer > V64.PAUSE_MIN || hart) return `Kein Lauf in den 30 Tagen davor: zum Wiedereinstieg höchstens ${V64.PAUSE_MIN} min locker (eigene Festlegung, ${V64.VERSIONS.aufbau}). Gemeldet, nicht verhindert.`;
      return null;
    }
    if (isNum(km) && km > g.km) return `≈ ${kmT(km)} km, über deiner Aufbau-Grenze von ${kmT(g.km)} km (10 % über dem längsten Lauf der 30 Tage davor, ${V64.VERSIONS.aufbau}). Gemeldet, nicht verhindert.`;
    return null;
  };
  /** Prüft eine gespeicherte Einheit; Fehlertext oder null. */
  V66.einheitPruefen = function (s) {
    if (!s || typeof s !== "object") return "keine Einheit";
    if (!s.uid || typeof s.uid !== "string") return "ohne Kennung";
    if (!["vorschlag", "eigen", "bibliothek"].includes(s.quelle)) return "unbekannte Quelle";
    if (!isNum(s.dauer) || s.dauer < 5 || s.dauer > 600) return "Dauer ausserhalb 5–600 min";
    for (const k of Object.keys(V66.FELDER)) if (s[k] != null) { const f = V66.feldPruefen(k, s[k]); if (f) return f; }   // V7.3
    if (s.quelle === "bibliothek") return isNum(s.wid) && ["rad", "lauf", "schwimm"].includes(s.sport) ? null : "Bibliothek ohne Workout oder Sportart";
    const B = V66.bereich(s.vorlage); if (!B) return "unbekannte Vorlage";
    if (s.vorlage === "eigen") {                                       // V7.10 eigene-aktivitaet-1.0 (gleiche Regeln wie merge_daily.planwoche_pruefen)
      if (typeof s.titel !== "string" || !s.titel.trim() || s.titel.length > 60) return "Titel mit 1–60 Zeichen";
      if (!V66.EIGEN_SPORT.includes(s.sport)) return "unbekannte Sportart";
      if (!Number.isInteger(s.rpe) || s.rpe < 1 || s.rpe > 10) return "RPE 1–10";
    }
    if (EXTRA[s.vorlage] && EXTRA[s.vorlage].draussen && s.zone != null && !["z1", "z2"].includes(s.zone)) return "Intensität Z1 oder Z2";   // V7.7
    if (s.quelle === "eigen" && (s.dauer < B.min || s.dauer > B.max)) return `Dauer ${B.min}–${B.max} min`;
    return null;
  };
  /** Eine Änderung anwenden (rein, ohne Speichern). a.art: hinzufuegen {date, einheit}, entfernen {date, uid}, dauer {date, uid, dauer},
   *  verschieben {date, uid, nach}, sperren {date}, entsperren {date}, verwerfen, leeren; V7.3: einheit {date, uid, felder} (Uhrzeit, Sperre,
   *  Metrik, drinnen, Einfahren, Pausen; gesperrte Einheiten nur entsperren, nie ändern, verschieben oder entfernen); V8.3: ersetzen {date, uid, einheit}
   *  (Vorschlag des Tagescoaches, gleiche Kennung). ctx = { heute, montag, vorschlag(date) → Einheiten
   *  des Vorschlags an diesem Tag, jetzt, neuId }. Vergangene Tage nur lesen, gesperrte Tage unveränderlich. → { eintrag } oder { fehler, eintrag }. */
  V66.aendern = function (eintrag, a, ctx) {
    ctx = ctx || {};
    const mo = (eintrag && eintrag.montag) || ctx.montag || V64.montag(a.date || ctx.heute);
    const E = JSON.parse(JSON.stringify(eintrag || V66.leer(mo)));
    E.tage = E.tage || {};
    const inWoche = (d) => typeof d === "string" && d >= E.montag && d <= add(E.montag, 6);
    const tag = (d) => (E.tage[d] = E.tage[d] || { gesperrt: false, einheiten: null });
    const liste = (d) => { const t = tag(d); if (!Array.isArray(t.einheiten)) t.einheiten = vorschlagGespeichert(d, ctx.vorschlag ? ctx.vorschlag(d) : []); return t.einheiten; };
    const darf = (d) => (!inWoche(d) ? "nicht in dieser Woche" : d < ctx.heute ? "vergangen – nur lesen" : E.tage[d] && E.tage[d].gesperrt ? "gesperrt – zuerst entsperren" : null);
    const finde = (d, uid) => liste(d).findIndex((x) => x.uid === uid);
    const wochenTage = () => Array.from({ length: 7 }, (_, i) => add(E.montag, i));
    // eigenplan-1.1: eine nach der Verfügbarkeit verteilte Woche (ctx.verteilt) wird beim ersten Ändern als Ganzes festgehalten, so wie sie
    // gezeigt wurde; vergangene Tage «eingefroren» (die Prüfung in merge_daily.py lässt nur das an vergangenen Tagen zu). Sonst sprängen Tage
    // ohne eigene Liste auf den unverteilten Vorschlag zurück.
    const festhalten = () => {
      if (E.ganz) return;
      for (const d of wochenTage()) { const t = tag(d); if (!Array.isArray(t.einheiten)) { liste(d); if (d < ctx.heute) t.eingefroren = true; } }
      E.ganz = true;
    };
    if (ctx.verteilt && !E.ganz && !Object.values(E.tage).some((t) => Array.isArray(t.einheiten)) && !["verwerfen", "neuberechnen"].includes(a.art)) festhalten();
    let f = null;
    switch (a.art) {
      case "hinzufuegen": {
        f = darf(a.date); if (f) break;
        // V8.3: beim Zurückholen eines Vorschlags des Coaches dieselbe Kennung wie vorher (sofern frei in der Woche), sonst eine neue
        const vorhanden = (d) => (Array.isArray((E.tage[d] || {}).einheiten) ? E.tage[d].einheiten : vorschlagGespeichert(d, ctx.vorschlag ? ctx.vorschlag(d) : []));
        const frei = typeof a.uid === "string" && a.uid && !wochenTage().some((d) => vorhanden(d).some((x) => x.uid === a.uid));
        const s = Object.assign({ quelle: "eigen" }, a.einheit, { uid: frei ? a.uid : (ctx.neuId || neuId)() });
        f = V66.einheitPruefen(s); if (f) break;
        liste(a.date).push(s);
        if (frei) streichungWeg(E, s, a.date);                         // V9.2: zurückgeholte Einheit (gleiche Kennung) ist nicht mehr gestrichen
        break;
      }
      case "entfernen": {
        f = darf(a.date); if (f) break;
        const i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        if (liste(a.date)[i].gesperrt) { f = GESPERRT_E; break; }
        const [x] = liste(a.date).splice(i, 1);
        const id = stehtFuer(x);                                           // V9.2 umplanen-1.0: bewusst gelöscht – bleibt gestrichen (kein heimlicher Ersatz)
        if (id) { if (!Array.isArray(E.gestrichen)) E.gestrichen = []; if (E.gestrichen.length < 40) E.gestrichen.push({ vorlage: id, date: a.date }); }
        break;
      }
      case "dauer": {
        f = darf(a.date); if (f) break;
        const L = liste(a.date), i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        if (L[i].gesperrt) { f = GESPERRT_E; break; }
        if (L[i].quelle === "bibliothek") { f = "Dauer wie im Enduco-Workout"; break; }
        const B = V66.bereich(L[i].vorlage); if (!B || B.fest) { f = "feste Dauer"; break; }
        if (!isNum(a.dauer) || a.dauer < B.min || a.dauer > B.max) { f = `Dauer ${B.min}–${B.max} min`; break; }
        L[i] = Object.assign({}, L[i], { dauer: a.dauer, quelle: L[i].quelle === "vorschlag" ? "eigen" : L[i].quelle });
        break;
      }
      case "verschieben": {
        f = darf(a.date) || darf(a.nach) || (a.date === a.nach ? "gleicher Tag" : null); if (f) break;
        const i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        if (liste(a.date)[i].gesperrt) { f = GESPERRT_E; break; }
        const [x] = liste(a.date).splice(i, 1); liste(a.nach).push(Object.assign({}, x, { anker: true }));   // V9.2: von Hand verschoben = Anker am neuen Tag
        break;
      }
      case "einheit": {                                                // V7.3 einheit-felder-1.0: Uhrzeit, Sperre, Metrik, drinnen, Einfahren, Pausen
        f = darf(a.date); if (f) break;
        const L = liste(a.date), i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        const F = a.felder || {}, alt = L[i], neu = Object.assign({}, alt);
        if (alt.gesperrt && F.gesperrt !== false) { f = GESPERRT_E; break; }
        for (const [k, v] of Object.entries(F)) {
          if (!V66.FELDER[k]) { f = "unbekanntes Feld"; break; }
          const g = V66.feldPruefen(k, v); if (g) { f = g; break; }
          // drinnen = false bleibt (einheit-felder-1.1: ausdrücklich draussen, auch in einer Indoor-Phase); sonst entfernt false/null das Feld
          if (v == null || (v === false && k !== "drinnen") || (k === "pausen" && v === 50)) delete neu[k]; else neu[k] = v;
        }
        if (f) break;
        if ((neu.ein_min != null || neu.pausen != null || neu.drinnen || neu.pool != null) && neu.quelle === "bibliothek") { f = "Bibliothek: Ablauf wie im Enduco-Workout"; break; }
        if (neu.pool != null && sportVon(neu) !== "schwimm") { f = "Bahnlänge nur beim Schwimmen"; break; }
        // Inhalt geändert (Einfahren, Pausen, drinnen) = eigene Einheit wie beim Ändern der Dauer; Uhrzeit, Sperre und Metrik lassen die Quelle
        if (neu.quelle === "vorschlag" && ["ein_min", "pausen", "drinnen"].some((k) => neu[k] !== alt[k])) neu.quelle = "eigen";
        L[i] = neu;
        break;
      }
      case "ersetzen": {                                               // V8.3 tagescoach-1.0: Einheit durch eine andere ersetzen (gleiche Kennung) – angenommener Vorschlag
        f = darf(a.date); if (f) break;
        const L = liste(a.date), i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        if (L[i].gesperrt) { f = GESPERRT_E; break; }
        const s = Object.assign({ quelle: "eigen" }, a.einheit || {}, { uid: a.uid });
        delete s.gesperrt; delete s.statt;
        f = V66.einheitPruefen(s); if (f) break;
        // V9.2 umplanen-1.0: die neue Einheit steht weiter für die ersetzte Vorschlags-Einheit (sonst käme diese beim Umplanen zurück)
        const war = stehtFuer(L[i]); if (war && war !== s.vorlage) s.statt = war;
        L[i] = s;
        break;
      }
      case "aktivitaet": {                                             // V7.7 aktivitaet-plan-1.0: Aktivität draussen in eine gespeicherte Woche
        f = darf(a.date); if (f) break;
        const s = Object.assign({}, a.einheit, { quelle: "eigen" });
        f = V66.einheitPruefen(s); if (f) break;
        if (!(EXTRA[s.vorlage] && EXTRA[s.vorlage].draussen)) { f = "keine Aktivität draussen"; break; }
        festhalten();
        for (const d of wochenTage()) if (E.tage[d] && Array.isArray(E.tage[d].einheiten)) E.tage[d].einheiten = E.tage[d].einheiten.filter((x) => x.uid !== s.uid);   // bisherige Fassung
        liste(a.date).unshift(s);
        if (typeof ctx.ersetzen === "function") ctx.ersetzen(E, a);   // Ersatz von Rad- bzw. Lauf-Einheiten ab heute (V77.ersetzenGespeichert)
        // der Tag gehört der Aktivität, Vortag und Tag danach ohne harte Einheit an Land; V9.2: umplanen statt anpassen (mit Vorschlag), sonst wie bisher
        if (ctx.verf) f = typeof ctx.roh === "function" ? umplanen(E, ctx) : anpassen(E, ctx);
        break;
      }
      case "aktivitaet_weg": {                                         // V7.7: Aktivität aus der gespeicherten Woche nehmen (Ersetztes kommt mit «Neu berechnen» zurück)
        f = darf(a.date); if (f) break;
        const uid = "akt-" + a.date;
        for (const d of wochenTage()) if (E.tage[d] && Array.isArray(E.tage[d].einheiten)) E.tage[d].einheiten = E.tage[d].einheiten.filter((x) => x.uid !== uid);
        break;
      }
      case "sperren": f = !inWoche(a.date) ? "nicht in dieser Woche" : a.date < ctx.heute ? "vergangen – nur lesen" : null; if (!f) tag(a.date).gesperrt = true; break;
      case "entsperren": f = !inWoche(a.date) ? "nicht in dieser Woche" : null; if (!f) tag(a.date).gesperrt = false; break;
      case "verwerfen": case "neuberechnen":
        // V9.1 alles-neu-1.0 (Silas 20.11.2026): «Alles neu» gibt ab heute auch gesperrte Tage und gesperrte Einheiten frei, danach wie «Neu berechnen»
        if (a.art === "neuberechnen" && a.alles) for (const d of Object.keys(E.tage)) if (d >= ctx.heute && E.tage[d]) {
          E.tage[d].gesperrt = false;
          if (Array.isArray(E.tage[d].einheiten)) E.tage[d].einheiten = E.tage[d].einheiten.map((x) => (x && x.gesperrt ? Object.assign({}, x, { gesperrt: false }) : x));
        }
        f = neuBerechnen(E, ctx, tag); break;
      case "leeren":
        // V9.2: was aus dem Vorschlag kam, gilt als gestrichen – sonst füllte das nächste Umplanen die Tage wieder (zurück mit «Neu berechnen» oder «Ausgleichen»)
        for (let i = 0; i < 7; i++) {
          const d = add(E.montag, i); if (d < ctx.heute || (E.tage[d] && E.tage[d].gesperrt)) continue;
          for (const s of liste(d)) { const id = stehtFuer(s); if (id) { if (!Array.isArray(E.gestrichen)) E.gestrichen = []; if (E.gestrichen.length < 40) E.gestrichen.push({ vorlage: id, date: d }); } }
          tag(d).einheiten = [];
        }
        break;
      case "festhalten": festhalten(); break;
      // V9.2 umplanen-1.0: «anpassen» (V9.1.1) entfällt – beide rechnen die ganze Woche aus ihren Eingaben neu; ohne Vorschlag (ctx.roh) wie bisher
      case "umplanen": case "anpassen":
        festhalten();
        f = typeof ctx.roh === "function" ? umplanen(E, ctx, { ausgleichen: !!a.ausgleichen }) : anpassen(E, ctx);
        break;
      case "erholung": festhalten(); f = erholungRest(E, ctx, tag); break;   // V7.4 eigenplan-1.2: «Woche anpassen?» nach mehreren Tagen «vorsichtig»
      default: f = "unbekannte Aktion";
    }
    if (f) return { fehler: f, eintrag: eintrag || null };
    if (!E.ganz) for (const d of Object.keys(E.tage)) {           // Tage, die wieder genau dem Vorschlag entsprechen, folgen ihm wieder; Tage ohne Änderung weglassen
      const t = E.tage[d];
      if (Array.isArray(t.einheiten) && ctx.vorschlag && JSON.stringify(t.einheiten) === JSON.stringify(vorschlagGespeichert(d, ctx.vorschlag(d)))) t.einheiten = null;
      if (!t.gesperrt && t.einheiten == null) delete E.tage[d];
    }
    E.v = V66.VERSIONS.eigenplan; E.geaendert = ctx.jetzt || new Date().toISOString();
    return { eintrag: E };
  };

  /* ---------------- Verfügbarkeit (verfuegbarkeit-1.0) ---------------- */
  V66.VF_SPORT = ["schwimm", "rad", "lauf"];
  V66.VF_MAX = 720;                                                     // höchstens 12 h an einem Tag
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  /** Wochentag 1 = Montag … 7 = Sonntag. */
  V66.wtNr = (iso) => ((new Date(Date.parse(iso + "T12:00:00Z")).getUTCDay() + 6) % 7) + 1;
  /** Prüft einen Verfügbarkeits-Eintrag (gleiche Regeln wie merge_daily.verfuegbarkeit_pruefen) → Fehlertext oder null.
   *  Je Tag { id «vf-JJJJ-MM-TT», art «tag», date } oder je Wochentag { id «vf-wt-1» … «vf-wt-7», art «wochentag», wt }; dazu min (null = Zeit
   *  offen, sonst 0–720 in 5-min-Schritten) und sport (null = alle, sonst Liste aus schwimm/rad/lauf, leer = kein Training) oder entfernt: true. */
  V66.vfPruefen = function (e) {
    if (!e || typeof e !== "object") return "kein Eintrag";
    if (e.art === "wochentag") {
      if (!(Number.isInteger(e.wt) && e.wt >= 1 && e.wt <= 7)) return "Wochentag 1–7";
      if (e.id !== "vf-wt-" + e.wt) return "ID passt nicht zum Wochentag";
    } else if (e.art === "tag") {
      if (!ISO_RE.test(String(e.date || "")) || isNaN(Date.parse(e.date + "T12:00:00Z"))) return "kein Datum";
      if (e.id !== "vf-" + e.date) return "ID passt nicht zum Datum";
    } else return "unbekannte Art";
    if (e.entfernt === true) return null;
    if (e.min != null && !(Number.isInteger(e.min) && e.min >= 0 && e.min <= V66.VF_MAX && e.min % 5 === 0)) return "Zeit 0–12 h in 5-min-Schritten";
    if (e.sport != null && !(Array.isArray(e.sport) && e.sport.every((x) => V66.VF_SPORT.includes(x)) && new Set(e.sport).size === e.sport.length)) return "unbekannte Sportart";
    return null;
  };
  /** Verfügbarkeit je Datum aus den Einträgen (mehrere Listen: Daten, darüber die noch nicht eingespielten auf dem Gerät; spätere gewinnen).
   *  Ein Tag geht vor seinem Wochentag. → f(date) = { min, sport, quelle «tag»|«wochentag», id } oder null; f.leer = nichts festgelegt. */
  V66.verfuegbarkeit = function (...listen) {
    const m = new Map();
    for (const L of listen) for (const e of L || []) if (e && typeof e.id === "string" && !V66.vfPruefen(e)) m.set(e.id, e);
    const f = (date) => {
      if (!ISO_RE.test(String(date || ""))) return null;
      const t = m.get("vf-" + date), w = m.get("vf-wt-" + V66.wtNr(date)), e = t && !t.entfernt ? t : w && !w.entfernt ? w : null;
      return e ? { min: e.min == null ? null : e.min, sport: Array.isArray(e.sport) ? e.sport.slice() : null, quelle: e.art, id: e.id } : null;
    };
    f.leer = ![...m.values()].some((e) => !e.entfernt);
    f.eintrag = (id) => m.get(id) || null;
    return f;
  };
  /** Eintrag bauen: ziel = { date } oder { wt }; wert = { min, sport } oder null (= zurücksetzen). */
  V66.vfEintrag = function (ziel, wert, jetzt) {
    const base = ziel && ziel.date ? { id: "vf-" + ziel.date, art: "tag", date: ziel.date } : { id: "vf-wt-" + ziel.wt, art: "wochentag", wt: ziel.wt };
    return Object.assign(base, wert ? { min: wert.min == null ? null : wert.min, sport: wert.sport == null ? null : wert.sport.slice() } : { entfernt: true },
      { v: V66.VERSIONS.verfuegbarkeit, geaendert: jetzt || new Date().toISOString() });
  };
  /** V7.6.2 kurs-1.0: an Kurstagen (Dienstag, bis zum letzten Kurstag; ohne Datum jeder Dienstag) nur Schwimmen, wenn so eingestellt. Die Zeit bleibt
   *  die des Tages; «Kein Training» und eine Verfügbarkeit ohne Schwimmen gehen vor (so, wie du sie gesetzt hast). kurs = { nur, bis }. */
  V66.mitKurs = function (verf, kurs) {
    if (!kurs || !kurs.nur) return verf;
    const kursTag = (d) => ISO_RE.test(String(d || "")) && V66.wtNr(d) === 2 && (!kurs.bis || d <= kurs.bis);
    const f = (d) => {
      const v = verf ? verf(d) : null;
      if (!kursTag(d) || (v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.includes("schwimm"))))) return v;
      return Object.assign({ min: null, quelle: null, id: null }, v || {}, { sport: ["schwimm"], kurs: true });
    };
    f.leer = false; f.eintrag = verf && verf.eintrag ? verf.eintrag : () => null; f.kursTag = kursTag;
    return f;
  };
  /** Kurztext: «1:30 h · Rad, Laufen», «kein Training», «Zeit offen · Schwimmen». */
  const SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  V66.vfText = function (v) {
    if (!v) return "nicht festgelegt";
    if (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length)) return "kein Training";
    const z = v.min == null ? "Zeit offen" : `${Math.floor(v.min / 60)}:${String(v.min % 60).padStart(2, "0")} h`;
    return `${z} · ${v.sport ? v.sport.map((x) => SPW[x]).join(", ") : "alle Sportarten"}${v.kurs ? " (Schwimmkurs)" : ""}`;
  };

  /* ---------------- Verteilen nach der Verfügbarkeit (verfuegbarkeit-1.0) ---------------- */
  const ORTSFEST = new Set(["schwimm_kurs", "aktivierung", "test_rad", "test_lauf", "test_css"]);
  const istOrtsfest = (e) => !!e && (ORTSFEST.has(e.id) || e.art === "test" || !!e.test || e.art === "kraft" || e.art === "draussen");   // V7.6 Kraft, V7.7 Aktivität draussen bleiben am Tag
  const istEigen = (e) => !!e && (e.quelle === "eigen" || e.quelle === "bibliothek" || !!e.gesperrt || !!e.anker);   // V7.3: gesperrte Einheit bleibt am Tag; V9.2: Anker auch
  const hart = (e) => !!e && (!!e.schluessel || e.art === "schluessel_s");
  V66.hart = hart;
  /** V7.6 verfuegbarkeit-1.1: bevorzugte Tage für lange Einheiten (Planeinstellungen «pe-lang») → Liste der Wochentage oder null (keine Wahl). */
  const langTage = (opt, sport) => { const L = opt && opt.lang && opt.lang[sport]; return Array.isArray(L) && L.length ? L : null; };
  const PRIO = (e) => (hart(e) ? 0 : e.art === "lang" ? 1 : e.art === "koppel" ? 3 : 2);
  const TAGW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const TAG_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const wtK = (iso) => TAGW[V66.wtNr(iso) - 1];
  /** Kürzeste sinnvolle Dauer: lockere und lange Einheiten bis zur kürzesten Vorlage, Schlüsseleinheiten in der kurzen Fassung. */
  function minDauer(e) {
    const B = V66.bereich(e.vorlage || e.id);
    if (!B || B.fest || istEigen(e)) return e.dauer;
    if (e.art === "schluessel") return Math.min(e.dauer, V64.einheit(e.id, { kurz: true }).dauer);
    return Math.min(e.dauer, B.min);
  }
  /** Einheit kürzer neu bauen (gleiche Vorlage, Merkmale bleiben); null, wenn das nicht geht. */
  function kuerzer(e, d, o) {
    const b = V64.BAUSTEINE[e.id]; if (!b || b.fix || istEigen(e)) return null;
    let n;
    if (b.art === "schluessel") { n = V64.einheit(e.id, Object.assign({}, o, { kurz: true })); if (!n || n.dauer > d) return null; }
    else n = V64.einheit(e.id, Object.assign({}, o, { d: Math.max(5, Math.floor(d / 5) * 5) }));
    if (!n) return null;
    for (const k of ["check", "gekappt", "uid", "quelle", "vorlage", "drinnen", "vorTest", "spec"]) if (e[k] != null) n[k] = e[k];
    if (e.check) n.ablauf = n.ablauf.concat((e.ablauf || []).filter((x) => /Kurzcheck/.test(x)));
    if (e.drinnen && !/drinnen/.test(n.titel)) n.titel += " (drinnen)";
    return n;
  }
  /**
   * Verteilt die Einheiten einer Woche nach deiner Verfügbarkeit (Zeit je Tag, erlaubte Sportarten). tage = [{ date, wt, ruhetag, rennen, notiz,
   * einheiten, fest }]; feste Tage (vergangen, gesperrt) bleiben, wie sie sind. Am Tag bleiben ausserdem Tests, der Schwimmkurs (fällt weg, wenn
   * Schwimmen an dem Tag nicht geht), die Aktivierung und eigene Einheiten. Die übrigen Einheiten (Vorschlag) kommen der Reihe nach – Schlüssel,
   * lang (mit Koppellauf), locker – auf einen erlaubten Tag mit genug Zeit: am eigenen Tag, wenn er passt, sonst der beste andere (nahe am
   * ursprünglichen Tag, harte Einheiten nicht an zwei Tagen hintereinander, nicht zweimal dieselbe Sportart, Ruhetag nur, wenn du dort Zeit
   * eingetragen hast). Passt eine Einheit nirgends ganz, wird sie gekürzt (bis zur kürzesten Vorlage bzw. kurzen Fassung), sonst entfällt sie –
   * beides gemeldet, nie still. In Rennwochen wird nichts verschoben. opt = { o (Bausteine: phase, css_s, kurz), verbraucht: [Vorlagen, die schon
   * an festen Tagen stehen], lang: { rad, lauf } (bevorzugte Wochentage für lange Einheiten), ctxE }. → { tage, protokoll: { verschoben, gekuerzt, weg, hinweise }, geaendert }
   * verfuegbarkeit-1.1 (V7.6): lange Einheiten bevorzugt an den gewählten Tagen (+80, sonst −20; eine Empfehlung, keine Pflicht); am Tag nach einem
   * Krafttraining keine harte Rad- oder Laufeinheit (kraft-plan-1.1) – passt sie an keinen anderen Tag, wird sie an ihrem Tag locker (gemeldet).
   * verfuegbarkeit-1.2 (V8.1, Silas' Frage vom 18.11.2026): harte Einheiten an Land (Rad, Laufen) nicht an zwei Tagen hintereinander – Abzug −100 je Seite
   * (bis 1.1 −20) und danach eine Runde, die eine der beiden auf einen Tag ohne harte Einheit an Land daneben verschiebt (auch eine, die an ihrem
   * eigenen Tag stand); geht das nicht, bleibt es und die Woche meldet es.
   */
  V66.verteilen = function (tage, verf, opt) {
    opt = opt || {};
    const P = { verschoben: [], gekuerzt: [], weg: [], hinweise: [], zweiHart: [] };
    const T = (tage || []).map((t) => Object.assign({}, t, { einheiten: (t.einheiten || []).slice() }));
    if (!verf) return { tage: T, protokoll: P, geaendert: false };
    const V = T.map((t) => verf(t.date));
    if (T.some((t) => t.rennen)) {                                    // Rennwoche: fester Ablauf, nichts verschieben – nur melden
      T.forEach((t, i) => { const v = V[i], d = t.einheiten.reduce((x, e) => x + (e.dauer || 0), 0);
        if (!t.fest && v && t.einheiten.length && ((v.min != null && d > v.min) || t.einheiten.some((e) => v.sport && V66.VF_SPORT.includes(e.sport) && !v.sport.includes(e.sport))))
          P.hinweise.push(`Rennwoche: am ${wtK(t.date)} passt der Plan nicht zu deiner Verfügbarkeit – in der Rennwoche wird nichts verschoben, bitte selbst anpassen`); });
      for (const x of opt.extra || []) P.weg.push({ titel: x.e.titel, date: T[x.von] ? T[x.von].date : null, grund: "Rennwoche: es wird nichts verschoben", id: x.e.id, dauer: x.e.dauer, sport: x.e.sport, ortsfest: true });
      return { tage: T, protokoll: P, geaendert: P.hinweise.length > 0 };
    }
    const tlVon = (e) => { if (typeof opt.tl !== "function") return null; try { const x = opt.tl(e); return isNum(x) ? x : null; } catch (err) { return null; } };
    const erlaubt = (i, sport) => !V[i] || !V[i].sport || !V66.VF_SPORT.includes(sport) || V[i].sport.includes(sport);
    const kap = (i) => (V[i] && V[i].min != null ? V[i].min : Infinity);
    const belegt = T.map(() => []), pool = [], verbraucht = (opt.verbraucht || []).slice(), ORD = new Map(), testTag = new Set();
    T.forEach((t, i) => t.einheiten.forEach((e, j) => ORD.set(e, i * 100 + j)));    // Reihenfolge am Tag: wie vorher, Dazugekommenes danach
    const summe = (i) => belegt[i].reduce((s, x) => s + (x.dauer || 0), 0), rest = (i) => kap(i) - summe(i);
    T.forEach((t, i) => {
      if (t.fest) { belegt[i] = t.einheiten.slice(); return; }
      for (const e of t.einheiten) {
        if (istEigen(e) || istOrtsfest(e)) {
          if (e.id === "schwimm_kurs" && (!erlaubt(i, "schwimm") || kap(i) < Math.min(30, e.dauer))) {
            P.weg.push({ titel: e.titel, date: t.date, grund: erlaubt(i, "schwimm") ? "keine Zeit" : "Schwimmen an diesem Tag nicht möglich", id: e.id, dauer: e.dauer, sport: "schwimm", ortsfest: true }); continue;
          }
          if (e.art === "test" && (!erlaubt(i, e.sport) || kap(i) < e.dauer)) { testTag.add(i); P.hinweise.push(`${e.titel} am ${wtK(t.date)} passt nicht zu deiner Verfügbarkeit – den Termin im Testkalender verschieben`); }
          else if (istEigen(e) && !erlaubt(i, e.sport)) P.hinweise.push(`«${e.titel}» am ${wtK(t.date)}: eigene Einheit an einem Tag ohne diese Sportart (bleibt stehen)`);
          belegt[i].push(e); continue;
        }
        const j = verbraucht.indexOf(e.vorlage || e.id);
        if (j >= 0) { verbraucht.splice(j, 1); continue; }            // steht schon an einem festen Tag
        pool.push({ e, von: i });
      }
    });
    for (const x of opt.extra || []) if (x && x.e && T[x.von]) { ORD.set(x.e, x.von * 100 + 50); pool.push({ e: x.e, von: x.von }); }   // V9.2: Tag fest – kommt woanders hin
    for (const p of pool) if (p.e.art === "lang" && p.e.sport === "rad") {                // Koppellauf gehört zur langen Ausfahrt
      const k = pool.find((q) => q.e.art === "koppel" && q.von === p.von && !q.dran);
      if (k) { p.koppel = k.e; k.dran = true; }
    }
    const L = pool.filter((p) => !p.dran).sort((a, b) => PRIO(a.e) - PRIO(b.e) || b.e.dauer - a.e.dauer || a.von - b.von);
    // Harte Einheiten stören sich, wenn es dieselbe Sportart ist oder beide an Land (Rad, Laufen); CSS im Wasser neben dem Rad-Schlüssel ist
    // die übliche Woche (Do). Lange Einheiten an Land vertragen keine harte am selben Tag.
    const land = (x) => x.sport === "rad" || x.sport === "lauf";
    const stoert = (a, b) => hart(a) && hart(b) && (a.sport === b.sport || (land(a) && land(b)));
    const hartAm = (i, e) => i >= 0 && i < T.length && belegt[i].some((x) => stoert(x, e));
    const ruheOk = (i) => !T[i].ruhetag || !!(V[i] && V[i].min !== 0 && (!V[i].sport || V[i].sport.length));
    // V7.6 kraft-plan-1.1: am Tag nach einem Krafttraining keine harte Einheit an Land; V7.7 aktivitaet-plan-1.0: ebenso am Vortag und am Tag nach
    // einer Aktivität draussen ab 2 h, und am Tag der Aktivität selbst keine andere Einheit des Vorschlags (der Tag gehört ihr)
    const aktLang = (j) => j >= 0 && j < T.length && belegt[j].some((x) => x.art === "draussen" && (x.dauer || 0) >= 120);
    const aktTag = (j) => j >= 0 && j < T.length && belegt[j].some((x) => x.art === "draussen");
    const nachKraft = (e, i) => hart(e) && land(e) && ((i > 0 && belegt[i - 1].some((x) => x.sport === "kraft")) || aktLang(i - 1) || aktLang(i + 1));
    const schonGrund = (i) => (i > 0 && belegt[i - 1].some((x) => x.sport === "kraft") ? "Tag nach dem Krafttraining" : "neben einer langen Aktivität draussen");
    const wt = (i) => V66.wtNr(T[i].date), langOk = (e, i) => { const L = e.art === "lang" ? langTage(opt, e.sport) : null; return !L || L.includes(wt(i)); };
    // verfuegbarkeit-1.1: eine lange Einheit verlässt ihren Tag für einen gewählten nur, wenn dort die Sportart geht und Zeit ist – sonst bleibt sie
    const langFrei = (p) => T.some((t, j) => !t.fest && j !== p.von && langOk(p.e, j) && erlaubt(j, p.e.sport) && rest(j) >= p.e.dauer
      && !(land(p.e) && belegt[j].some((x) => hart(x) && land(x))));
    // Gewichte (eigene Festlegung): je Tag Abstand −5, je Einheit am Tag −10 (ab der dritten −25 mehr), gleiche Sportart am Tag −45, zwei harte
    // am Tag −60, hart neben hart −20 je Seite (an Land −100 seit verfuegbarkeit-1.2), hart und lang an Land am selben Tag −120 (bis verfuegbarkeit-1.0
    // −40; seit 1.1 stärker als der Vorteil eines gewählten Tags für lange Einheiten +80), zwei lange am Tag −50, Ruhetag ohne eingetragene Zeit −30.
    const hartLand = (x) => hart(x) && land(x);
    const neben = (i, e) => (land(e) && i >= 0 && i < T.length && belegt[i].some((x) => x !== e && hartLand(x)) ? 100 : hartAm(i, e) ? 20 : 0);
    const score = (p, i) => {
      const B = belegt[i], e = p.e; let s = -5 * Math.abs(i - p.von) - 10 * B.length - (B.length >= 2 ? 25 : 0);
      if (B.some((x) => x.sport === e.sport)) s -= 45;
      if (hart(e)) { if (hartAm(i, e)) s -= 60; s -= neben(i - 1, e) + neben(i + 1, e); }
      if (land(e) && ((hart(e) && B.some((x) => x.art === "lang" && land(x))) || (e.art === "lang" && B.some((x) => hart(x) && land(x))))) s -= 120;
      if (e.art === "lang" && B.some((x) => x.art === "lang")) s -= 50;
      if (!ruheOk(i)) s -= 30;
      if (e.art === "lang" && langTage(opt, e.sport)) s += langOk(e, i) ? 80 : -20;      // verfuegbarkeit-1.1: bevorzugte Tage für lange Einheiten
      return s;
    };
    const waehle = (p, bed, mitEigenem) => { let best = null, bs = -Infinity; T.forEach((t, i) => { if (t.fest || (i === p.von && !mitEigenem) || !bed(i)) return; const s = score(p, i); if (s > bs) { bs = s; best = i; } }); return best; };
    const VON = new Map(), WEG = new Map();
    const setzen = (p, i, e, mitK) => {
      if (e !== p.e) P.gekuerzt.push({ titel: p.e.titel, date: T[i].date, von: p.e.dauer, nach: e.dauer });
      VON.set(e, p.von);
      if (i !== p.von) { const r = { titel: e.titel, von: T[p.von].date, nach: T[i].date, grund: p.grund || "Verfügbarkeit" }; P.verschoben.push(r); WEG.set(e, r); }
      belegt[i].push(e);
      if (p.koppel) {
        if (mitK) belegt[i].push(p.koppel);
        else P.weg.push({ titel: p.koppel.titel, date: T[i].date, grund: erlaubt(i, "lauf") ? "keine Zeit nach der Ausfahrt" : "Laufen an diesem Tag nicht möglich", id: p.koppel.id, dauer: p.koppel.dauer, sport: p.koppel.sport, tl: tlVon(p.koppel) });
      }
    };
    const kurz = (p, i) => { const n = kuerzer(p.e, Math.min(p.e.dauer, rest(i)), opt.o || {}); if (n && ORD.has(p.e)) ORD.set(n, ORD.get(p.e)); return n && n.dauer < p.e.dauer && n.dauer <= rest(i) ? n : null; };
    // 1. Runde: jede Einheit bleibt an ihrem Tag, wenn die Sportart dort geht und Zeit da ist (wenn nötig gekürzt)
    const offen = [];
    for (const p of L) {
      const i = p.von, sp = p.e.sport, k = p.koppel;
      if (T[i].fest || !erlaubt(i, sp) || aktTag(i) || nachKraft(p.e, i) || (!langOk(p.e, i) && langFrei(p))) {
        p.grund = T[i].fest ? (T[i].date < (opt.heute || "") ? "Tag vorbei" : "Tag fest") : !erlaubt(i, sp) ? "Verfügbarkeit" : aktTag(i) ? "Tag der Aktivität draussen" : nachKraft(p.e, i) ? schonGrund(i) : "Tag für lange Einheiten";   // V7.6.1: Grund in der Meldung
        offen.push(p); continue;
      }
      if (k && erlaubt(i, "lauf") && rest(i) >= p.e.dauer + k.dauer) { setzen(p, i, p.e, true); continue; }
      if (rest(i) >= p.e.dauer) { setzen(p, i, p.e, false); continue; }
      // am eigenen Tag nur wenig kürzen (höchstens ein Viertel, mindestens 15 min erlaubt); sonst lieber ganz an einem anderen Tag
      const n = rest(i) >= minDauer(p.e) && p.e.dauer - rest(i) <= Math.max(15, 0.25 * p.e.dauer) ? kurz(p, i) : null;
      if (n) setzen(p, i, n, false); else offen.push(p);
    }
    // 2. Runde: die übrigen auf den besten anderen erlaubten Tag mit genug Zeit; sonst gekürzt; sonst entfällt sie
    for (const p of offen) {
      const sp = p.e.sport, k = p.koppel, frei = (j) => erlaubt(j, sp) && !aktTag(j) && !nachKraft(p.e, j);
      const eigen = !langOk(p.e, p.von) && erlaubt(p.von, sp) && !aktTag(p.von) && !nachKraft(p.e, p.von);   // wegen eines gewählten Tags unterwegs: der eigene Tag bleibt möglich
      let i = k ? waehle(p, (j) => frei(j) && erlaubt(j, "lauf") && rest(j) >= p.e.dauer + k.dauer, eigen) : null;
      if (i != null) { setzen(p, i, p.e, true); continue; }
      i = waehle(p, (j) => frei(j) && rest(j) >= p.e.dauer, eigen);
      if (i != null) { setzen(p, i, p.e, false); continue; }
      const m = minDauer(p.e);
      i = m < p.e.dauer ? waehle(p, (j) => frei(j) && rest(j) >= m, true) : null;
      const n = i != null ? kurz(p, i) : null;
      if (n) { setzen(p, i, n, false); continue; }
      // kraft-plan-1.1: eine harte Einheit, die nur wegen des Krafttrainings am Vortag nirgends Platz hat, wird an ihrem Tag locker
      if (!T[p.von].fest && nachKraft(p.e, p.von) && !aktTag(p.von) && erlaubt(p.von, sp) && rest(p.von) >= p.e.dauer) {
        const l = V66.einheit({ uid: p.e.uid || "kraft-locker-" + T[p.von].date, vorlage: sp === "rad" ? "rad_locker" : "lauf_locker", dauer: p.e.dauer, quelle: "vorschlag" }, opt.ctxE || {});
        if (l) {
          if (ORD.has(p.e)) ORD.set(l, ORD.get(p.e));
          VON.set(l, p.von); belegt[p.von].push(l);
          const g = schonGrund(p.von);
          P.hinweise.push(g === "Tag nach dem Krafttraining" ? `«${p.e.titel}» am ${wtK(T[p.von].date)}: am Tag nach dem Krafttraining locker statt hart (kraft-plan-1.1)`
            : `«${p.e.titel}» am ${wtK(T[p.von].date)}: neben einer langen Aktivität draussen locker statt hart (aktivitaet-plan-1.0)`);
          if (k) { if (erlaubt(p.von, "lauf") && rest(p.von) >= k.dauer) belegt[p.von].push(k); else P.weg.push({ titel: k.titel, date: T[p.von].date, grund: "gehört zur langen Ausfahrt", id: k.id, dauer: k.dauer, sport: k.sport, tl: tlVon(k) }); }
          continue;
        }
      }
      P.weg.push({ titel: p.e.titel, date: T[p.von].date, grund: V66.VF_SPORT.includes(sp) && !T.some((t, j) => !t.fest && erlaubt(j, sp)) ? "diese Sportart ist an keinem freien Tag erlaubt" : "an keinem freien Tag genug Zeit",
        id: p.e.id, dauer: p.e.dauer, sport: sp, tl: tlVon(p.e) });
      if (k) P.weg.push({ titel: k.titel, date: T[p.von].date, grund: "gehört zur langen Ausfahrt", id: k.id, dauer: k.dauer, sport: k.sport, tl: tlVon(k) });
    }
    // verfuegbarkeit-1.2: zwei harte Einheiten an Land an Tagen hintereinander – eine davon (zuerst die, die schon verschoben wurde) auf den besten Tag ohne
    // harte Einheit an Land daneben und ohne lange Einheit an Land am selben Tag; geht das für keine der beiden, bleibt es und wird gemeldet
    const hartNebenan = (j, ohne) => [j - 1, j + 1].some((k) => k >= 0 && k < T.length && belegt[k].some((x) => x !== ohne && hartLand(x)));
    for (let runde = 0; runde < 4; runde++) {
      let paar = null;
      for (let i = 0; i + 1 < T.length && !paar; i++) {
        const a = belegt[i].find(hartLand), b = belegt[i + 1].find(hartLand);
        if (a && b) paar = [[i, a], [i + 1, b]];
      }
      if (!paar) break;
      let best = null;
      for (const [i, e] of paar) {
        if (!VON.has(e) || T[i].fest) continue;                           // feste, eigene und gesperrte Einheiten bleiben
        belegt[i].splice(belegt[i].indexOf(e), 1);
        const p = { e, von: VON.get(e) };
        T.forEach((t, j) => {
          if (t.fest || j === i || !erlaubt(j, e.sport) || aktTag(j) || nachKraft(e, j) || rest(j) < e.dauer || hartNebenan(j, e)
            || belegt[j].some((x) => hartLand(x) || (x.art === "lang" && land(x)))) return;
          const s = score(p, j) + (VON.get(e) !== i ? 1 : 0);              // bei Gleichstand die schon verschobene
          if (!best || s > best.s) best = { e, i, j, s, von: p.von };
        });
        belegt[i].push(e);
      }
      if (!best) {
        const [[i, a], [, b]] = paar;
        P.hinweise.push(`Harte Einheiten an zwei Tagen hintereinander: «${a.titel}» (${wtK(T[i].date)}) und «${b.titel}» (${wtK(T[i + 1].date)}) – kein anderer Tag passte (Zeit, Sportart oder lange Einheit)`);
        P.zweiHart.push({ von: T[i].date, bis: T[i + 1].date, a: a.titel, b: b.titel });
        break;
      }
      belegt[best.i].splice(belegt[best.i].indexOf(best.e), 1);
      belegt[best.j].push(best.e);
      const grund = "nicht zwei harte Tage hintereinander", r = WEG.get(best.e);
      if (r) { if (best.j === best.von) { P.verschoben.splice(P.verschoben.indexOf(r), 1); WEG.delete(best.e); } else { r.nach = T[best.j].date; r.grund = grund; } }
      else if (best.j !== best.von) { const n = { titel: best.e.titel, von: T[best.von].date, nach: T[best.j].date, grund }; P.verschoben.push(n); WEG.set(best.e, n); }
    }
    // 3. Runde: lockere Einheiten von vollen Tagen auf einen deutlich besseren Tag (mehr als 20 Punkte), z. B. neben eine verschobene lange Ausfahrt
    for (let i = 0; i < T.length; i++) for (const e of belegt[i].slice()) {
      if (T[i].fest || PRIO(e) !== 2 || !VON.has(e)) continue;
      const p = { e, von: VON.get(e) };
      belegt[i].splice(belegt[i].indexOf(e), 1);
      const jetzt = score(p, i), j = waehle(p, (k) => erlaubt(k, e.sport) && !aktTag(k) && rest(k) >= e.dauer, true);
      if (j != null && j !== i && score(p, j) > jetzt + 20) {
        belegt[j].push(e);
        const r = WEG.get(e);
        if (r) { if (j === p.von) { P.verschoben.splice(P.verschoben.indexOf(r), 1); WEG.delete(e); } else r.nach = T[j].date; }
        else if (j !== p.von) { const n = { titel: e.titel, von: T[p.von].date, nach: T[j].date }; P.verschoben.push(n); WEG.set(e, n); }
      } else belegt[i].push(e);
    }
    // grenzen-1.0: über der Zeit steht nur, was fest ist (eigene Einheit, gesperrt, Test, Kurs, Kraft, Aktivität draussen) – mit Meldung, nie still
    T.forEach((t, i) => {
      if (t.fest || testTag.has(i) || !isFinite(kap(i)) || rest(i) >= 0) return;
      const eig = belegt[i].filter((e) => istEigen(e)), art = eig.length && eig.length === belegt[i].length ? (eig.length === 1 ? "deine eigene Einheit" : "deine eigenen Einheiten")
        : eig.length ? "deine eigenen und feste Einheiten" : "feste Einheiten";
      P.hinweise.push(`${TAG_LANG[V66.wtNr(t.date) - 1]}: ${-rest(i)} min mehr geplant als verfügbar (${art})`);
    });
    // verfuegbarkeit-1.1: eine lange Einheit, die an keinem deiner Tage für lange Einheiten Platz hatte, wird gemeldet (Empfehlung, nie still)
    for (let i = 0; i < T.length; i++) for (const e of belegt[i]) {
      const LT = e.art === "lang" && !T[i].fest ? langTage(opt, e.sport) : null;
      if (LT && !LT.includes(wt(i))) P.hinweise.push(`«${e.titel}» am ${wtK(T[i].date)} statt an deinem Tag für lange Einheiten (${LT.map((n) => TAGW[n - 1]).join(", ")}): dort ist kein Platz (Zeit oder Sportart laut Verfügbarkeit, andere Einheiten am Tag)`);
    }
    let geaendert = false;
    const out = T.map((t, i) => {
      if (t.fest) return t;
      const ord = (e) => { const o = ORD.has(e) ? ORD.get(e) : null; return o != null && Math.floor(o / 100) === i ? o % 100 : 1000 + (o == null ? 99 : o); };
      belegt[i].sort((a, b) => ord(a) - ord(b) || (a.art === "koppel") - (b.art === "koppel"));
      // V7.6: erst ordnen, dann vergleichen – nur die Reihenfolge des Einfügens ist keine Änderung
      const alt = t.einheiten.map((e) => `${e.id}:${e.dauer}`).join("|"), neu = belegt[i].map((e) => `${e.id}:${e.dauer}`).join("|");
      if (alt === neu) return t;
      geaendert = true;
      const leer = !belegt[i].length, keinT = V[i] && (V[i].min === 0 || (Array.isArray(V[i].sport) && !V[i].sport.length));
      return Object.assign({}, t, { einheiten: belegt[i], ruhetag: leer, notiz: leer ? (keinT ? "kein Training (Verfügbarkeit)" : t.notiz || null) : null });
    });
    return { tage: out, protokoll: P, geaendert: geaendert || P.hinweise.length > 0 };
  };
  /** Meldungen in Worten (für die Hinweise der Woche). */
  V66.verteilText = function (P) {
    if (!P) return [];
    const out = [];
    for (const x of P.verschoben) out.push(`«${x.titel}» von ${wtK(x.von)} auf ${wtK(x.nach)} verschoben (${x.grund || "Verfügbarkeit"})`);
    for (const x of P.gekuerzt) out.push(`«${x.titel}» am ${wtK(x.date)} ${x.nach} statt ${x.von} min (Verfügbarkeit)`);
    for (const x of P.weg) out.push(`«${x.titel}» (${wtK(x.date)}) entfällt: ${x.grund}`);
    return out.concat(P.hinweise);
  };
  /** Summen einer Woche neu (wie V64.woche): Minuten je Sportart, Verteilung, Prüfung. */
  function summenNeu(out, w) {
    const minuten = { schwimm: 0, rad: 0, lauf: 0 }, z = { locker: 0, mittel: 0, hart: 0 };
    for (const t of out.tage) for (const e of t.einheiten || []) {
      if (minuten[e.sport] != null) minuten[e.sport] += e.dauer;
      if (e.minuten) for (const k of ["locker", "mittel", "hart"]) z[k] += e.minuten[k] || 0;
    }
    minuten.total = minuten.schwimm + minuten.rad + minuten.lauf;
    const tid = V64.tid(z);
    return Object.assign(out, { minuten, zonen: z, tid, pruefung: V64.pruefen(w.modell, tid, { erholung: w.erholung, taper: w.taper, rennwoche: out.tage.some((t) => t.rennen),
      gekappt: !!(w.gekappt && w.gekappt.length) }) });
  }
  V66.summen = summenNeu;                                               // V7.4: auch für die Ampel-Schicht (js/v74.js); V7.6.1 V76.abstimmen
  const bausteinO = (w, ctx) => ({ phase: w && w.phase, css_s: ctx && ctx.css_s, kurz: !!(w && (w.taper || w.erholung)) });
  /** Vorschlag einer ganzen Woche (V64.woche) nach deiner Verfügbarkeit – unabhängig vom heutigen Tag, damit vergangene Tage stehen bleiben.
   *  ctx = { css_s }. → neue Woche (w bleibt unverändert) mit `verteilung` und den Meldungen in `hinweise`; ohne Wirkung dieselbe Woche. */
  V66.wocheVerteilt = function (w, verf, ctx) {
    if (!w || !Array.isArray(w.tage)) return w;
    // V7.6: auch ohne eingetragene Verfügbarkeit, wenn lange Tage gewählt sind oder ein Krafttraining in der Woche steht (dann ohne Zeitgrenzen)
    const mitVerf = !!(verf && !verf.leer && w.tage.some((t) => verf(t.date)));
    // V7.7: ebenso mit einer Aktivität draussen (ihr Tag und die Nachbartage)
    const zwingt = !!((ctx && ctx.lang && (langTage(ctx, "rad") || langTage(ctx, "lauf"))) || w.tage.some((t) => (t.einheiten || []).some((e) => e.sport === "kraft" || e.art === "draussen")));
    if (!mitVerf && !zwingt) return w;
    const r = V66.verteilen(w.tage.map((t) => Object.assign({}, t, { fest: false })), mitVerf ? verf : () => null, { o: bausteinO(w, ctx), lang: ctx && ctx.lang, ctxE: ctx && ctx.ctxE });
    if (!r.geaendert) return w;
    const out = Object.assign({}, w, { tage: r.tage.map((t) => { const c = Object.assign({}, t); delete c.fest; return c; }),
      verteilung: Object.assign({ v: V66.VERSIONS.verfuegbarkeit }, r.protokoll), hinweise: (w.hinweise || []).concat(V66.verteilText(r.protokoll)) });
    return summenNeu(out, w);
  };
  /** Gespeicherte Einheit (Spezifikation) aus einer Einheit: Vorlage und Dauer, Quelle bleibt. */
  const spezVon = (e, uid) => (e.spec ? Object.assign({}, e.spec, { dauer: e.dauer }) : { uid, vorlage: e.id, dauer: e.dauer, quelle: "vorschlag" });
  /** «Anpassen»: Rest der Woche (ab heute, ohne gesperrte Tage) nach der Verfügbarkeit neu verteilen; eigene Einheiten und Gesperrtes bleiben. */
  function anpassen(E, ctx) {
    if (!ctx.verf) return "Verfügbarkeit nicht bekannt";
    const tage = Array.from({ length: 7 }, (_, i) => add(E.montag, i)).map((d) => {
      const t = E.tage[d] || {}, fest = d < ctx.heute || !!t.gesperrt;
      const einheiten = (t.einheiten || []).map((s) => { const e = V66.einheit(s, ctx.ctxE || {}); return e ? Object.assign(e, { spec: s }) : null; }).filter(Boolean);
      return { date: d, wt: wtK(d), ruhetag: !einheiten.length, einheiten, fest };
    });
    const r = V66.verteilen(tage, ctx.verf, { o: ctx.o || {}, lang: ctx.lang, ctxE: ctx.ctxE });
    for (const t of r.tage) if (!t.fest) {
      const used = new Set();
      E.tage[t.date].einheiten = t.einheiten.map((e, i) => { const s = spezVon(e, `v-${t.date}-${i}`); if (used.has(s.uid)) s.uid = `v-${t.date}-${i}-${used.size}`; used.add(s.uid); return s; });
    }
    E.verteilung = { v: V66.VERSIONS.verfuegbarkeit, art: "anpassen", am: ctx.jetzt || new Date().toISOString(), meldungen: V66.verteilText(r.protokoll).slice(0, 20) };
    return null;
  }
  /** «Neu berechnen» (auch «Änderungen verwerfen»): ab heute wieder der Vorschlag, gesperrte Tage bleiben. Ganz festgehaltene Wochen werden mit
   *  dem unverteilten Vorschlag (ctx.roh) neu verteilt; künftige Wochen ohne Sperren folgen wieder von selbst dem Vorschlag. */
  /** V7.3: Tag mit Sperre oder mit einer gesperrten Einheit – bleibt bei «Neu berechnen» so, wie er ist. */
  const festTag = (t) => !!t && (!!t.gesperrt || (Array.isArray(t.einheiten) && t.einheiten.some((s) => s && s.gesperrt)));
  function neuBerechnen(E, ctx, tag) {
    const tageW = Array.from({ length: 7 }, (_, i) => add(E.montag, i));
    delete E.gestrichen;                                                  // V9.2: Stufe 2 vergisst Streichungen (und Anker, siehe unten)
    const gesperrt = tageW.filter((d) => festTag(E.tage[d])), vorbei = tageW.filter((d) => d < ctx.heute && E.tage[d] && Array.isArray(E.tage[d].einheiten));
    if (!E.ganz) { for (const d of Object.keys(E.tage)) if (d >= ctx.heute && !festTag(E.tage[d])) E.tage[d].einheiten = null; return null; }
    if (!gesperrt.length && !vorbei.length) { E.tage = {}; delete E.ganz; delete E.verteilung; return null; }        // ganz neu: wieder automatisch
    if (!ctx.roh) return "Vorschlag nicht bekannt";
    // V9.2 umplanen-1.0: ohne Anker an den freien Tagen, dann derselbe Kern wie jedes Umplanen (vergangene und gesperrte Tage bleiben)
    if (ctx.verf || ctx.vorschlag) {
      for (const d of tageW) if (!(d < ctx.heute || festTag(E.tage[d]))) tag(d).einheiten = [];
      const f = umplanen(E, ctx, {});
      if (!f && E.verteilung) E.verteilung.art = "neu";
      return f;
    }
    // Was an festen Tagen (vergangen, gesperrt) über deren eigenen Vorschlag hinaus steht, wurde dorthin verschoben: nicht nochmals verteilen
    const verbraucht = [];
    for (const d of tageW) {
      const t = E.tage[d]; if (!(d < ctx.heute || festTag(t)) || !t || !Array.isArray(t.einheiten)) continue;
      const roh = (ctx.roh(d) || []).map((e) => e.id);
      for (const s of t.einheiten) { if (s.quelle !== "vorschlag") continue; const j = roh.indexOf(s.vorlage); if (j >= 0) roh.splice(j, 1); else verbraucht.push(s.vorlage); }
    }
    const tage = tageW.map((d) => {
      const t = E.tage[d] || {}, fest = d < ctx.heute || festTag(t);
      const einheiten = fest ? (t.einheiten || []).map((s) => V66.einheit(s, ctx.ctxE || {})).filter(Boolean) : (ctx.roh(d) || []).map((e) => Object.assign({}, e));
      return { date: d, wt: wtK(d), ruhetag: !einheiten.length, einheiten, fest };
    });
    const r = { tage, protokoll: null };
    for (const t of r.tage) if (!t.fest) tag(t.date).einheiten = t.einheiten.map((e, i) => spezVon(e, `v-${t.date}-${i}`));
    E.verteilung = undefined;
    return null;
  }

  /* ---------------- V9.2 umplanen-1.0 (Auftrag «Woche wie Enduco», Etappe W1) ---------------- */
  /** Vorlagen, die an ihrem Tag bleiben und darum auch als gespeicherte Einheit für ihre Einheit im Vorschlag stehen. */
  const ORTSFEST_V = new Set(["schwimm_kurs", "aktivierung", "test_rad", "test_lauf", "test_css", "kraft"]);
  /** Für welche Einheit des Vorschlags steht eine gespeicherte Einheit (Vorlagen-Kennung) – oder für keine (eigene, dazugefügte)?
   *  Vorschlags-Einheiten, von Hand geänderte oder verschobene (Kennung «v-…»), ersetzte (statt) und alles Ortsfeste (Kraft, Tests, Kurs, Aktivierung,
   *  Aktivitäten draussen). Was dafür steht, verbraucht beim Umplanen die passende Einheit des Vorschlags – so steht nichts doppelt. */
  function stehtFuer(s) {
    if (!s) return null;
    if (typeof s.statt === "string" && s.statt) return s.statt;
    if (s.quelle === "bibliothek" || !s.vorlage) return null;
    if (s.quelle === "vorschlag" || /^v-/.test(String(s.uid || "")) || ORTSFEST_V.has(s.vorlage) || (EXTRA[s.vorlage] && EXTRA[s.vorlage].draussen)) return s.vorlage;
    return null;
  }
  V66.stehtFuer = stehtFuer;
  /** Anker: was Silas selbst gesetzt hat (eigene oder Bibliothek, Dauer oder Inhalt geändert, ersetzt, Coach angenommen, verschoben) oder gesperrt ist. */
  const istAnkerSpec = (s) => !!s && (s.quelle === "eigen" || s.quelle === "bibliothek" || !!s.gesperrt || s.anker === true);
  V66.istAnker = istAnkerSpec;
  /** Zurückgeholte Einheit: die passende Streichung (gleiche Vorlage, am nächsten Tag) fällt weg. */
  function streichungWeg(E, s, d) {
    const id = stehtFuer(s); if (!id || !Array.isArray(E.gestrichen) || !E.gestrichen.length) return;
    let best = -1;
    E.gestrichen.forEach((x, i) => { if (x && x.vorlage === id && (best < 0 || Math.abs(tageAbstand(x.date, d)) < Math.abs(tageAbstand(E.gestrichen[best].date, d)))) best = i; });
    if (best >= 0) E.gestrichen.splice(best, 1);
    if (!E.gestrichen.length) delete E.gestrichen;
  }
  const tageAbstand = (a, b) => (typeof a === "string" && typeof b === "string" ? Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5) : 99);
  const FELD_MIT = ["uhrzeit", "metrik", "pool"];                         // Festlegungen, die eine Vorschlags-Einheit beim Umplanen behält (gleiche Kennung)
  /**
   * Die ganze Woche aus ihren Eingaben neu (umplanen-1.0, grenzen-1.0): Vorschlag ctx.roh(d) (unverteilt, mit Kraft, Tests, Kurs, Aktivitäten draussen),
   * Grenzen ctx.verf (Zeit = harte Obergrenze, Sportarten), Festes: vergangene Tage, gesperrte Tage und Tage mit gesperrter Einheit (ganz), heute, wenn
   * schon trainiert (ctx.heuteFest), Anker an den übrigen Tagen, Streichungen E.gestrichen. Was bleibt, verbraucht seine Einheit im Vorschlag; der Rest
   * des Vorschlags (auch was an festen Tagen nicht steht) wird mit V66.verteilen verteilt: ganz verschieben → kürzen (nie unter die Mindestdauer) → bleibt
   * etwas übrig, steht es in E.verteilung.fehlt (die Seite fragt, sie überzieht nie selbst). Gleiche Eingaben ergeben dieselbe Woche (der gespeicherte Stand
   * zählt nur an festen Tagen und für die Kennungen). Ohne Eigenes (kein Anker, keine Sperre, keine Streichung) und mit vergangenen Tagen wie im
   * automatischen Vorschlag (ctx.vorschlag) folgt die Woche wieder von selbst (E.tage = {}). opt.ausgleichen: Streichungen vergessen («Ausgleichen»).
   * ctx = { heute, roh, vorschlag, verf, o, lang, ctxE, erholung, heuteFest, abstimmen(tage) → tage, tl(e) → TL ≈ oder null, jetzt }. → Fehlertext oder null
   */
  function umplanen(E, ctx, opt) {
    opt = opt || {};
    if (typeof ctx.roh !== "function") return "Vorschlag nicht bekannt";
    const tageW = Array.from({ length: 7 }, (_, i) => add(E.montag, i));
    const verf = ctx.verf || (() => null);
    if (opt.ausgleichen) delete E.gestrichen;
    const fest = (d) => d < ctx.heute || (!!ctx.heuteFest && d === ctx.heute) || festTag(E.tage[d]);
    // Feste Tage ohne eigene Liste: so, wie sie gezeigt werden (automatischer Vorschlag), vergangene «eingefroren»
    for (const d of tageW) {
      const t = (E.tage[d] = E.tage[d] || { gesperrt: false, einheiten: null });
      if (!Array.isArray(t.einheiten)) { t.einheiten = fest(d) ? vorschlagGespeichert(d, ctx.vorschlag ? ctx.vorschlag(d) : []) : []; if (d < ctx.heute) t.eingefroren = true; }
    }
    const bau = (s) => { const e = V66.einheit(s, ctx.ctxE || {}); return e ? Object.assign(e, { spec: s }) : null; };
    const bleibt = tageW.map((d) => (fest(d) ? E.tage[d].einheiten.slice() : E.tage[d].einheiten.filter(istAnkerSpec)));
    // Vorschlag der Woche (ab dem Start einer Erholungswoche nach der Ampel deren Einheiten, eigenplan-1.2)
    const erh = E.erholung && E.erholung.ab && typeof ctx.erholung === "function" ? E.erholung.ab : null;
    const rohAm = (d) => (erh && d >= erh ? ctx.erholung(d) : ctx.roh(d)) || [];
    const pool = [];
    tageW.forEach((d, i) => rohAm(d).forEach((e) => pool.push({ e, i, weg: false })));
    const naechste = (id, i) => { let best = null; for (const p of pool) if (!p.weg && p.e.id === id && (!best || Math.abs(p.i - i) < Math.abs(best.i - i))) best = p; return best; };
    bleibt.forEach((L, i) => L.forEach((s) => { const id = stehtFuer(s), p = id ? naechste(id, i) : null; if (p) p.weg = true; }));
    for (const x of Array.isArray(E.gestrichen) ? E.gestrichen : []) { const p = x && naechste(x.vorlage, Math.max(0, tageW.indexOf(x.date))); if (p) p.weg = true; }
    // Eingänge für den Rechenkern: feste Tage ganz, sonst Anker und der Vorschlag des Tages; was vom Vorschlag an festen Tagen übrig ist, kommt dazu
    const T = tageW.map((d, i) => ({ date: d, wt: wtK(d), ruhetag: !rohAm(d).length, fest: fest(d),
      einheiten: bleibt[i].map(bau).filter(Boolean).concat(fest(d) ? [] : pool.filter((p) => !p.weg && p.i === i).map((p) => Object.assign({}, p.e))) }));
    const extra = pool.filter((p) => !p.weg && fest(tageW[p.i]) && !istOrtsfest(p.e)).map((p) => ({ e: Object.assign({}, p.e), von: p.i }));
    const r = V66.verteilen(T, verf, { o: ctx.o || {}, lang: ctx.lang, ctxE: ctx.ctxE, extra, tl: ctx.tl, heute: ctx.heute });
    let tageR = r.tage;
    if (typeof ctx.abstimmen === "function") { try { tageR = ctx.abstimmen(tageR) || tageR; } catch (err) { tageR = r.tage; } }   // kraft-plan-1.1 Regel 2
    // Kennungen: eine Vorschlags-Einheit behält die Kennung (und Uhrzeit, Metrik, Bahnlänge) ihrer Vorgängerin derselben Vorlage – am selben Tag zuerst
    const vergeben = new Set(), alt = [];
    tageW.forEach((d, i) => { bleibt[i].forEach((s) => vergeben.add(s.uid)); if (!fest(d)) E.tage[d].einheiten.forEach((s) => { if (!istAnkerSpec(s) && s.uid) alt.push({ s, i, frei: true }); }); });
    const altFuer = (id, i) => { let best = null; for (const x of alt) if (x.frei && !vergeben.has(x.s.uid) && (x.s.vorlage || "") === id && (!best || Math.abs(x.i - i) < Math.abs(best.i - i))) best = x; return best; };
    const neuUid = (d, k) => { let u = `v-${d}-${k}`, n = 1; while (vergeben.has(u)) u = `v-${d}-${k}-${n++}`; return u; };
    tageR.forEach((t, i) => {
      if (t.fest) return;
      E.tage[t.date].einheiten = t.einheiten.map((e, k) => {
        if (e.spec && bleibt[i].includes(e.spec)) return e.spec;                                    // Anker bleibt, wie er ist
        const s = Object.assign({}, e.spec || {}, { vorlage: e.id, dauer: e.dauer, quelle: e.spec && e.spec.quelle ? e.spec.quelle : "vorschlag" });
        delete s.uid;
        const v = altFuer(e.id, i);
        if (v) { v.frei = false; s.uid = v.s.uid; for (const k2 of FELD_MIT) if (v.s[k2] != null && s[k2] == null) s[k2] = v.s[k2]; }
        else s.uid = e.spec && e.spec.uid && !vergeben.has(e.spec.uid) ? e.spec.uid : neuUid(t.date, k);
        vergeben.add(s.uid);
        return s;
      });
    });
    // Was nirgends in die Grenzen passt (ohne Ortsfestes wie den Schwimmkurs): fehlt – die Seite fragt, statt zu überziehen
    const fehltL = r.protokoll.weg.filter((x) => !x.ortsfest && isNum(x.dauer));
    const fehlt = fehltL.length ? { min: fehltL.reduce((s, x) => s + x.dauer, 0), tl: null, einheiten: fehltL.map((x) => ({ titel: x.titel, vorlage: x.id || null, sport: x.sport || null, dauer: x.dauer, date: x.date, tl: x.tl == null ? null : x.tl })) } : null;
    if (fehlt && fehltL.every((x) => isNum(x.tl))) fehlt.tl = Math.round(fehltL.reduce((s, x) => s + x.tl, 0));
    const frage = E.verteilung && E.verteilung.frage ? E.verteilung.frage : null;
    E.verteilung = { v: V66.VERSIONS.verfuegbarkeit, art: "umplanen", am: ctx.jetzt || new Date().toISOString(), meldungen: V66.verteilText(r.protokoll).slice(0, 20) };
    if (fehlt) E.verteilung.fehlt = fehlt;
    if (frage) E.verteilung.frage = frage;
    if (!E.gestrichen || !E.gestrichen.length) delete E.gestrichen;
    E.ganz = true;
    // Ohne Eigenes folgt die Woche wieder von selbst (dieselben Regeln, derselbe Kern) – nur wenn die festen Tage genau so stehen wie im automatischen Vorschlag
    const eigenes = !!E.gestrichen || !!E.erholung || tageW.some((d) => { const t = E.tage[d]; return !!t.gesperrt || t.einheiten.some(istAnkerSpec); });
    const wieAuto = !!ctx.vorschlag && tageW.filter(fest).every((d) => JSON.stringify(E.tage[d].einheiten.map(kern)) === JSON.stringify(vorschlagGespeichert(d, ctx.vorschlag(d)).map(kern)));
    if (!eigenes && !fehlt && wieAuto && ctx.vorschlag && !opt.behalten) {
      const zuvor = E.verteilung; E.tage = {}; delete E.ganz; E.verteilung = Object.assign({}, zuvor, { auto: true });
    }
    return null;
  }
  V66.umplanenRein = umplanen;                                            // für Tests und die Frage (V92): ändert E

  /** V7.4 eigenplan-1.2 («Woche anpassen?», ampel-plan-1.0): Rest der Woche ab heute wie eine Erholungswoche – die Tage bekommen die Einheiten
   *  des Vorschlags mit Erholung (ctx.erholung(date), nach der Verfügbarkeit verteilt); gesperrte Tage und Tage mit gesperrter Einheit bleiben,
   *  vergangene Tage auch. Nur auf deinen Knopfdruck, nie von selbst. */
  function erholungRest(E, ctx, tag) {
    if (typeof ctx.erholung !== "function") return "Erholungswoche nicht berechenbar";
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = add(E.montag, i);
      if (d < ctx.heute || festTag(E.tage[d])) continue;
      const used = new Set();
      tag(d).einheiten = (ctx.erholung(d) || []).map((e, j) => { const s = spezVon(e, `v-${d}-e${j}`); if (used.has(s.uid)) s.uid += "-" + used.size; used.add(s.uid); return s; });
      n++;
    }
    if (!n) return "keine änderbaren Tage mehr in dieser Woche";
    E.erholung = { ab: ctx.heute, am: ctx.jetzt || new Date().toISOString(), grund: ctx.grund || "Ampel: mehrere Tage «vorsichtig»" };
    return null;
  }
  /** Form zu Beginn eines Tages, aus dem Stand am Ende von gestern fortgeschrieben mit der Last je Tag (lastAm(date) → Zahl oder null):
   *  Fitness += (Last − Fitness)/42, Ermüdung += (Last − Ermüdung)/7 (pmc-2.0). start = { ctl, atl } am Ende des Vortags von vonISO.
   *  → { ctl, atl, form, offen } (offen = Tage ohne Schätzung, als 0 gezählt). Ein Modell, keine Messung. */
  V66.formPrognose = function (start, vonISO, bisISO, lastAm) {
    if (!start || !isNum(start.ctl) || !isNum(start.atl) || !vonISO || !bisISO || bisISO < vonISO) return null;
    let ctl = start.ctl, atl = start.atl, offen = 0;
    for (let d = vonISO; d < bisISO; d = add(d, 1)) {
      const x = lastAm ? lastAm(d) : 0; if (!isNum(x)) offen++;
      const l = isNum(x) ? x : 0;
      ctl += (l - ctl) / 42; atl += (l - atl) / 7;
    }
    return { ctl, atl, form: Math.round(ctl) - Math.round(atl), offen };
  };

  /* ---------------- Wochenart (wochenblatt-1.0) ---------------- */
  /** Wochen der Saison (AN.saison: woche, phase, erholung, rennen) → Map Montag → { art, n, text }: Belastungswoche n = Stelle seit der letzten
   *  Erholungs-, Taper- oder Rennwoche (3:1-Rhythmus von saison-1.2), sonst Erholung, Taper oder Rennwoche. */
  V66.wochenart = function (wochen) {
    const out = new Map(); let n = 0;
    for (const w of (wochen || []).slice().sort((a, b) => (a.woche < b.woche ? -1 : 1))) {
      let art;
      if (w.erholung) art = { art: "erholung", n: null, text: "Erholung" };
      else if (/taper/i.test(w.phase || "")) art = { art: "taper", n: null, text: "Taper" };
      else if ((w.rennen || []).length) art = { art: "rennwoche", n: null, text: "Rennwoche" };
      else { n += 1; out.set(w.woche, { art: "belastung", n, text: `Belastung ${n}` }); continue; }
      n = 0; out.set(w.woche, art);
    }
    return out;
  };

  /* ---------------- TL ≈ und Distanz ≈ (tl-plan-1.0, seit V8.1 tl-plan-1.1: Bezugsgrössen wie die absolvierte Last) ---------------- */
  const zone = (L, nr) => (Array.isArray(L) ? L.find((z) => z && z.z === "Z" + nr) || null : null);
  const mitte = (z) => (z && isNum(z.von) && isNum(z.bis) ? (z.von + z.bis) / 2 : null);
  /** Bezugswerte aus dem aktiven Zonenprofil: skalen = TR.zonen(D.zonen).skalen; css_s = CSS in s/100 m.
   *  tl-plan-1.1 (V8.1, Befunde 1–2 der Prüfung V8.0): last = { ref: config.last_ref, lthr: config.lthr } (auf der Seite über V66.lastBezug) – geplant
   *  rechnet dann wie die absolvierte Last (last-2.1): Rad drinnen mit der LT2 der Rolle, Rad draussen mit der LT2 für draussen, sonst wie Laufen nach Puls
   *  (Puls der Zone ÷ Schwellenpuls der Sportart, höchstens 1,15; Pulszonen des aktiven Profils). Ohne diese Angaben wie tl-plan-1.0. */
  V66.bezug = function (skalen, css_s, last) {
    if (last === undefined && typeof V66.lastBezug === "function") { try { last = V66.lastBezug(); } catch (e) { last = null; } }
    const S = skalen || {}, R = { rad: null, lauf: null, schwimm: isNum(css_s) ? { css: css_s } : null };
    const w = S.rad_w, p = S.lauf_pace;
    const z2w = zone(w, 2), z3w = zone(w, 3), z4w = zone(w, 4), z5w = zone(w, 5);
    if (z4w && isNum(z4w.von)) {
      const lt2 = z4w.von, lt1 = z3w && isNum(z3w.von) ? z3w.von : null;
      R.rad = { lt2, wert: { z1: z2w && isNum(z2w.von) ? 0.85 * z2w.von : null, z2: mitte(z2w), z3: mitte(z3w), z3o: 0.97 * lt2,
        vo2: z5w && isNum(z5w.von) ? 1.05 * z5w.von : null, renntempo: lt1 ? 0.975 * lt1 : null, pause: z2w && isNum(z2w.von) ? 0.85 * z2w.von : null } };
    }
    const z1p = zone(p, 1), z2p = zone(p, 2), z3p = zone(p, 3), z4p = zone(p, 4), z5p = zone(p, 5);
    if (z4p && isNum(z4p.von)) {
      const lt2 = z4p.von, lt1 = z3p && isNum(z3p.von) ? z3p.von : null;
      const langsam = z1p && isNum(z1p.bis) ? 1.05 * z1p.bis : null;     // Pace in s/km, grösser = langsamer
      R.lauf = { lt2, pace: { z1: langsam, z2: mitte(z2p), z3: mitte(z3p), z3o: 1.03 * lt2, vo2: z5p && isNum(z5p.von) ? 0.97 * z5p.von : null,
        renntempo: lt1 ? 1.015 * lt1 : null, pause: langsam } };
    }
    if (last) {                                                       // tl-plan-1.1: wie die absolvierte Last
      const lthr = last.lthr || {}, puls = (L, schwelle) => {
        const z2 = zone(L, 2), z3 = zone(L, 3), z4 = zone(L, 4), z5 = zone(L, 5);
        if (!isNum(schwelle) || !z2 || !isNum(z2.von) || !isNum(z2.bis)) return null;
        const locker = 0.95 * z2.von;
        return { lthr: schwelle, wert: { z1: locker, pause: locker, z2: mitte(z2), renntempo: z2.von + (2 / 3) * (z2.bis - z2.von), z3: mitte(z3),
          z3o: z4 && isNum(z4.von) ? 0.98 * z4.von : null, vo2: z5 && isNum(z5.von) ? z5.von : null } };
      };
      const refs = (((last.ref || {}).rad) || []).filter((x) => x && isNum(x.lt2_w)).sort((a, b) => String(a.ab || "").localeCompare(String(b.ab || "")));
      const rolle = refs.filter((x) => (x.system || "rolle") === "rolle").pop(), draussen = refs.filter((x) => x.system === "draussen").pop();
      if (R.rad) Object.assign(R.rad, { lt2Rolle: rolle ? rolle.lt2_w : null, lt2Draussen: draussen ? draussen.lt2_w : null, puls: puls(S.rad_hf, lthr.rad), v11: true });
      if (R.lauf) Object.assign(R.lauf, { puls: puls(S.lauf_hf, lthr.lauf), v11: true });
      // Schwimmen: die absolvierte Last kommt aus dem Puls (ohne Pulszonen fürs Schwimmen) – geplant darum mit deiner Last pro Bewegungsstunde
      // der Schwimmeinheiten (basis-1.1, 8 abgeschlossene Wochen) statt aus der CSS; Distanz ≈ weiter aus der CSS
      if (last.tlh && isNum(last.tlh.schwimm) && last.tlh.schwimm > 0) R.schwimmStunde = last.tlh.schwimm;
    }
    return R;
  };
  /** TL ≈ und Distanz ≈ einer Einheit (Ergebnis von V66.einheit oder V64.einheit). → { tl, km, vollstaendig, grund } */
  V66.schaetzung = function (e, bezug) {
    const out = { tl: null, km: null, vollstaendig: false, grund: null, v: V66.VERSIONS.tl };
    if (!e || !Array.isArray(e.teile) || !e.teile.length) { out.grund = "ohne Ablauf"; return out; }
    if (["test", "kraft", "mobility", "bibliothek"].includes(e.art)) { out.grund = e.art === "test" ? "Test – Belastung hängt vom Verlauf ab" : "ohne Ziele"; return out; }
    const B = bezug || {};
    if (e.art === "draussen") {                                         // V7.7 aktivitaet-plan-1.0: Last pro Stunde aus den eigenen Aktivitäten derselben Art
      const M = B.draussen || (typeof V66.draussenTL === "function" ? V66.draussenTL() : V66.draussenTL) || {}, tlh = M[e.draussen];
      if (!isNum(tlh)) { out.grund = "ohne eigene Vergleichswerte (mind. drei Aktivitäten dieser Art ab 1 h)"; return out; }
      out.tl = Math.round((e.dauer / 60) * tlh * (e.zone === "z1" ? 0.8 : 1)); out.vollstaendig = true; out.grund = "aus deinen eigenen Aktivitäten dieser Art";
      return out;
    }
    let tl = 0, km = 0, offen = 0, kmOffen = false;
    for (const [k, m] of e.teile) {
      const h = m / 60;
      if (e.sport === "rad") {
        const R = B.rad, P = R ? R.wert[k] : null;
        if (!isNum(P)) { offen += m; continue; }
        // tl-plan-1.1: drinnen mit der LT2 der Rolle, draussen mit der LT2 für draussen, sonst nach Puls – wie last-2.1; ohne Angaben wie 1.0
        const hf = R.puls && isNum(R.puls.wert[k]) ? Math.min(1.15, R.puls.wert[k] / R.puls.lthr) : null;
        const f = e.drinnen === true ? (isNum(R.lt2Rolle) ? P / R.lt2Rolle : P / R.lt2)
          : isNum(R.lt2Draussen) ? P / R.lt2Draussen : hf != null ? hf : P / R.lt2;
        tl += h * f * f * 100;
      } else if (e.sport === "lauf") {
        const kk = k === "abc" ? "z1" : k, R = B.lauf, pace = R ? R.pace[kk] : null;    // lauf-abc-1.0: Last wie Z1, kaum Strecke
        if (!isNum(pace)) { offen += m; continue; }
        const hf = R.puls && isNum(R.puls.wert[kk]) ? Math.min(1.15, R.puls.wert[kk] / R.puls.lthr) : null;   // tl-plan-1.1: nach Puls wie die absolvierte Last
        tl += h * (hf != null ? hf * hf : Math.pow(R.lt2 / pace, 2)) * 100; if (k !== "abc") km += (m * 60) / pace;
      } else if (e.sport === "schwimm") {
        const R = B.schwimm, q = isNum(B.schwimmStunde) ? B.schwimmStunde : null;
        if (!R && q == null) { offen += m; continue; }
        if (k === "pause") continue;
        const pace = R ? (k === "css" ? R.css : k === "z2" || k === "z1" ? R.css + 10 : null) : null;    // Grundlage = CSS + 8–12 s (wie V64.ziel)
        if (isNum(pace)) km += (m * 60 * 100) / pace / 1000; else kmOffen = true;
        if (q != null) { tl += h * q; continue; }                         // tl-plan-1.1: Last pro Bewegungsstunde deiner Schwimmeinheiten
        if (!isNum(pace)) { offen += m; continue; }
        tl += h * Math.pow(R.css / pace, 3) * 100;
      } else { offen += m; }
    }
    const total = e.teile.reduce((s, t) => s + t[1], 0);
    if (offen >= total) { out.grund = e.sport === "schwimm" ? "ohne CSS-Test" : "ohne Zonenprofil"; return out; }
    out.tl = Math.round(tl); out.vollstaendig = offen === 0;
    if (e.sport !== "rad" && !(e.sport === "schwimm" && !B.schwimm)) out.km = Math.round(km * 10) / 10;
    if (kmOffen && out.km != null && e.sport === "schwimm") out.kmMin = true;     // Distanz ohne Übungen u. ä. (mindestens)
    if (!out.vollstaendig) out.grund = `${Math.round(offen)} min ohne Bezugswert (mind.)`;
    return out;
  };

  /* ---------------- An Garmin senden (garmin-senden-1.2) ----------------
     Einheiten aus Mein Plan als Garmin-Workout (Format von upload_workout), Name mit «IN · ». Wiederholungen als Gruppe (eine Ebene).
     Rad und Laufen nach der Trainingsmetrik der Einheit (einheit-felder-1.0): Leistung (power.between, Watt) bzw. Tempo (pace.zone, m/s,
     langsam → schnell) aus dem aktiven Zonenprofil, Puls (heart.rate.zone mit eigenem Bereich in bpm aus den Pulszonen, 1.1) oder RPE (ohne
     Ziel, RPE im Text, 1.1); Z1 und Pausen ohne Ziel. Offene Grenze (Z5 nach oben): Leistung und Tempo 15 %, Puls 10 % über der bekannten
     Grenze, nur damit die Uhr einen Bereich zeigt (eigene Festlegung).
     1.1 (V7.3 Etappe 2): Schwimmen wie Enduco (Format aus get_workout_by_id raw gelesen): Bahnlänge, Strecken in ganzen Bahnen, Pausen am
     Beckenrand (fixed.rest), Übungen als Schritt «other» über die ganze Bahn («½ L … Bahn locker beenden»), nötige Hilfsmittel als equipmentType,
     freiwillige im Text, Stil Kraul; mit CSS-Test Nebenziel swim.css.offset (CSS-Geschwindigkeit − Zielgeschwindigkeit, m/s; die Uhr rechnet mit
     ihrer eigenen CSS) und Tempo im Text, ohne Test RPE im Text.
     1.2 (V7.5.1, Planeinstellungen): Stil je Schritt wie in der Schwimm-Einheit (schwimmeinheit-1.2): Kraul «free», Rücken «backstroke», Brust
     «breaststroke» (wie Enduco für Brust: strokeTypeId 3 aus einem Enduco-Workout gelesen); das ganze Einschwimmen ist «warmup».
     Nicht gesendet (mit Grund): Schwimmkurs, Tests, Kraft, Mobility. Bibliothek = Enduco-Workout, wird nur eingeplant. */
  V66.VERSIONS.garmin = "garmin-senden-1.2";
  V66.GARMIN_PREFIX = V64.EIGEN_PREFIX;
  V66.GARMIN_OFFEN = 1.15;
  V66.GARMIN_OFFEN_PULS = 1.1;
  V66.GARMIN_MAX_SCHRITTE = 50;
  const gz = (L, nr) => (Array.isArray(L) ? L.find((z) => z && z.z === "Z" + nr) || null : null);
  const voll = (z) => z && isNum(z.von) && isNum(z.bis);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const r4 = (x) => Math.round(x * 10000) / 10000;
  const mmssG = (s) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
  /** Trainingsmetrik je Sportart (gleich wie V73.METRIKEN, einheit-felder-1.0); Standard = erste. */
  V66.METRIK_JE = { rad: ["leistung", "puls", "rpe"], lauf: ["pace", "puls", "rpe"], schwimm: ["pace", "rpe"] };
  V66.metrikVon = (e) => { const L = V66.METRIK_JE[e && e.sport] || ["rpe"]; return e && L.includes(e.metrik) ? e.metrik : L[0]; };
  /** RPE je Abschnitt (rpe-zonen-1.0, gleich wie V73.RPE). */
  V66.RPE = { pause: "RPE 1–2", z1: "RPE 1–2", z2: "RPE 3–4", renntempo: "RPE 4–5", z3: "RPE 5–6", z3o: "RPE 6–7", css: "RPE 7", vo2: "RPE 8–9" };
  /** Zielbereich eines Abschnitts für Garmin → { art: "watt"|"tempo", lo, hi, offen } oder null (ohne Ziel). Tempo in m/s, lo < hi. */
  V66.garminZiel = function (key, sport, skalen) {
    const S = skalen || {}, W5 = (x) => Math.round(x / 5) * 5;
    if (sport === "rad") {
      const z2 = gz(S.rad_w, 2), z3 = gz(S.rad_w, 3), z5 = gz(S.rad_w, 5), w = (lo, hi, offen) => ({ art: "watt", lo: Math.round(Math.min(lo, hi)), hi: Math.round(Math.max(lo, hi)), offen: !!offen });
      switch (key) {
        case "z2": return voll(z2) ? w(z2.von, z2.bis) : null;
        case "z3": return voll(z3) ? w(z3.von, z3.bis) : null;
        case "z3o": return voll(z3) ? w(W5(z3.von + (2 / 3) * (z3.bis - z3.von)), z3.bis) : null;
        case "renntempo": return z3 && isNum(z3.von) ? w(W5(0.95 * z3.von), z3.von) : null;
        case "vo2": return z5 && isNum(z5.von) ? w(z5.von, isNum(z5.bis) ? z5.bis : z5.von * V66.GARMIN_OFFEN, !isNum(z5.bis)) : null;
        default: return null;
      }
    }
    if (sport === "lauf") {
      const z2 = gz(S.lauf_pace, 2), z3 = gz(S.lauf_pace, 3), z5 = gz(S.lauf_pace, 5);
      const v = (p) => 1000 / p, t = (pa, pb, offen) => { const a = v(pa), b = v(pb); return { art: "tempo", lo: r3(Math.min(a, b)), hi: r3(Math.max(a, b)), offen: !!offen }; };
      const okP = (z) => voll(z) && z.von > 0 && z.bis > 0;
      switch (key) {
        case "z2": return okP(z2) ? t(z2.von, z2.bis) : null;
        case "z3": return okP(z3) ? t(z3.von, z3.bis) : null;
        case "z3o": return okP(z3) ? t(z3.von + (2 / 3) * (z3.bis - z3.von), z3.bis) : null;
        case "renntempo": return z3 && isNum(z3.von) && z3.von > 0 ? t(z3.von * 1.03, z3.von) : null;
        case "vo2": return z5 && isNum(z5.von) && z5.von > 0 ? t(z5.von, isNum(z5.bis) && z5.bis > 0 ? z5.bis : z5.von / V66.GARMIN_OFFEN, !(isNum(z5.bis) && z5.bis > 0)) : null;
        default: return null;
      }
    }
    return null;
  };
  /** Pulsbereich eines Abschnitts für Garmin (bpm) aus rad_hf bzw. lauf_hf → { art: "puls", lo, hi, offen } oder null (Z1, Pause: ohne Ziel).
   *  Gleiche Lage wie die Pulsziele der Einheit-Seite (V73.ziel); Renntempo = oberes Drittel von Z2 bis zum Beginn von Z3 (eigene Festlegung:
   *  die Uhr braucht eine Untergrenze). */
  V66.garminPuls = function (key, sport, skalen) {
    const L = (skalen || {})[sport === "rad" ? "rad_hf" : sport === "lauf" ? "lauf_hf" : ""], z2 = gz(L, 2), z3 = gz(L, 3), z5 = gz(L, 5);
    const p = (lo, hi, offen) => (isNum(lo) && isNum(hi) && lo > 0 && hi >= lo ? { art: "puls", lo: Math.round(lo), hi: Math.round(hi), offen: !!offen } : null);
    switch (key) {
      case "z2": return voll(z2) ? p(z2.von, z2.bis) : null;
      case "z3": return voll(z3) ? p(z3.von, z3.bis) : null;
      case "z3o": return voll(z3) ? p(z3.von + (2 / 3) * (z3.bis - z3.von), z3.bis) : null;
      case "renntempo": return voll(z2) && z3 && isNum(z3.von) ? p(z2.von + (2 / 3) * (z2.bis - z2.von), z3.von) : null;
      case "vo2": return z5 && isNum(z5.von) ? p(z5.von, isNum(z5.bis) ? z5.bis : z5.von * V66.GARMIN_OFFEN_PULS, !isNum(z5.bis)) : null;
      default: return null;
    }
  };
  /** Abschnitte [key, min] → Folge mit Wiederholungen: gleiche Nachbarn zusammengelegt, dann je Stelle das längste Muster (1–4 Abschnitte,
   *  mindestens zweimal hintereinander) als Gruppe. → [{ key, s } | { wdh, teile: [{ key, s }] }] */
  V66.garminFolge = function (teile) {
    const flach = [];
    for (const [k, m] of teile || []) {
      if (!isNum(m) || m <= 0) continue;
      const s = Math.round(m * 60), l = flach[flach.length - 1];
      if (l && l.key === k) l.s += s; else flach.push({ key: k, s });
    }
    const gleich = (a, b) => a.key === b.key && a.s === b.s, out = [];
    for (let i = 0; i < flach.length;) {
      let best = null;
      for (let p = 1; p <= 4; p++) {
        let k = 1;
        while (i + (k + 1) * p <= flach.length && flach.slice(i + k * p, i + (k + 1) * p).every((x, j) => gleich(x, flach[i + j]))) k++;
        if (k >= 2 && (!best || p * k > best.p * best.k)) best = { p, k };
      }
      if (best) { out.push({ wdh: best.k, teile: flach.slice(i, i + best.p).map((x) => ({ key: x.key, s: x.s })) }); i += best.p * best.k; }
      else { out.push(flach[i]); i++; }
    }
    return out;
  };
  /** FNV-1a (32 Bit, zweimal mit anderem Start) über einen Text → 16 Hex-Zeichen; nur um Fassungen zu unterscheiden. */
  V66.fassung = function (text) {
    const h = (seed) => { let x = seed >>> 0; for (let i = 0; i < text.length; i++) { x ^= text.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16).padStart(8, "0"); };
    return h(2166136261) + h(0x811c9dc5 ^ 0x5bd1e995);
  };
  const GSPORT = { rad: { sportTypeId: 2, sportTypeKey: "cycling" }, lauf: { sportTypeId: 1, sportTypeKey: "running" }, schwimm: { sportTypeId: 4, sportTypeKey: "swimming" } };
  const GTYP = { warmup: 1, cooldown: 2, interval: 3, recovery: 4, rest: 5, other: 7 };
  const KEIN_ZIEL = { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" };
  const METER = { unitId: 1, unitKey: "meter", factor: 100.0 };
  /** Grund, warum eine Einheit nicht als Workout gesendet wird, oder null. */
  V66.garminGrund = function (e) {
    if (!e) return "keine Einheit";
    if (e.art === "bibliothek") return null;
    if (e.art === "test") return "Tests über die Test-Workouts (Testkalender)";
    if (e.art === "draussen") return "Aktivität draussen: nach Puls, ohne Workout (aktivitaet-plan-1.0)";
    if (e.sport === "schwimm") return e.art === "kurs" || e.id === "schwimm_kurs" ? "Schwimmkurs: Inhalt laut Kurs" : null;
    if (!GSPORT[e.sport]) return "nur Rad, Laufen und Schwimmen";
    if (!Array.isArray(e.teile) || !e.teile.length || e.teile[0][0] === "ohne") return "ohne Ablauf";
    return null;
  };
  /** Text eines Rad- oder Lauf-Schritts für die Uhr: Zone und Ziel in der gewählten Metrik (höchstens 100 Zeichen). */
  function garminText(key, sport, skalen, metrik) {
    const name = V64.ZNAME[key];
    if (!name) return String(key).slice(0, 100);
    let z;
    if (metrik === "rpe") z = V66.RPE[key] || "";
    else if (metrik === "puls") {
      const z2 = gz((skalen || {})[sport === "rad" ? "rad_hf" : "lauf_hf"], 2), p = V66.garminPuls(key, sport, skalen);
      z = key === "z1" || key === "pause" ? (z2 && isNum(z2.von) ? `Puls unter ${Math.round(z2.von)}` : "") : p ? (p.offen ? `Puls über ${p.lo}` : `Puls ${p.lo}–${p.hi}`) : "";
    } else z = V64.ziel(key, sport, skalen) || "";
    return (name + (z ? ": " + z : "")).slice(0, 100);
  }

  /* ----- Schwimmen (1.1) ----- */
  /** Hilfsmittel → Garmin equipmentType. IDs wie in Enduco-Workouts gelesen (fins 1, kickboard 2, paddles 3); pull_buoy 4 am 17.11.2026 mit einem
   *  Test-Upload bestätigt (hochladen, zurücklesen, gelöscht). Schnorchel geht nur in den Text. */
  V66.GARMIN_GERAET = { flossen: { id: 1, key: "fins", name: "Flossen" }, brett: { id: 2, key: "kickboard", name: "Brett" }, paddles: { id: 3, key: "paddles", name: "Paddles" },
    pullbuoy: { id: 4, key: "pull_buoy", name: "Pullbuoy" }, schnorchel: { id: null, key: null, name: "Schnorchel" } };
  const SW_WORT = { z1: "locker", z2: "Grundlage", z3: "zügig", css: "CSS", tech: "Technik", max: "maximal" };
  const FREE = { strokeTypeId: 6, strokeTypeKey: "free" };
  /** garmin-senden-1.2: Stil der Schwimm-Einheit → Garmin-Stil (Übungen und Pausen bleiben wie bisher). */
  V66.STIL_GARMIN = { kraul: FREE, ruecken: { strokeTypeId: 2, strokeTypeKey: "backstroke" }, brust: { strokeTypeId: 3, strokeTypeKey: "breaststroke" } };
  const STIL_WORT = { ruecken: "Rücken", brust: "Brust" };
  /** Bahnen als Text: 0,5 → «½ L», 1,5 → «1½ L», 6 → «6 L». */
  V66.bahnenText = function (x) {
    if (!isNum(x) || x <= 0) return null;
    const g = Math.floor(x + 1e-9), r = Math.round((x - g) * 100) / 100, B = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
    if (!r) return `${g} L`;
    return B[r] ? `${g || ""}${B[r]} L` : `${String(Math.round(x * 10) / 10).replace(".", ",")} L`;
  };
  /** Schwimm-Einheit (SW.einheit, schwimmeinheit-1.0) → Garmin-Schritte. metrik «pace»: mit CSS-Test Nebenziel swim.css.offset und Tempo im
   *  Text; «rpe» oder ohne Test: RPE im Text. → { steps, schritte, meter, pool, css, aufbau } oder { fehler }. */
  V66.garminSchwimm = function (S, metrik) {
    if (!S || !Array.isArray(S.bloecke) || S.art === "kurs") return { fehler: "Schwimmkurs: Inhalt laut Kurs" };
    if (S.art === "test") return { fehler: "Tests über die Test-Workouts (Testkalender)" };
    const pool = S.pool === 50 ? 50 : 25, css = metrik !== "rpe" && isNum(S.css_s) && S.css_s > 0 ? S.css_s : null;
    let nr = 0, n = 0, meter = 0;
    const steps = [], aufbau = [];
    const pause = (s) => { n++; return { type: "ExecutableStepDTO", stepOrder: ++nr, stepType: { stepTypeId: GTYP.rest, stepTypeKey: "rest" }, description: `Pause ${Math.round(s)} s`,
      endCondition: { conditionTypeId: 8, conditionTypeKey: "fixed.rest" }, endConditionValue: Math.round(s), targetType: KEIN_ZIEL }; };
    const schwimm = (b, t, i) => {
      const m = t.m || 0, d = m + (t.zuende_m || 0), L = Math.max(1, Math.ceil(d / pool - 1e-9)), dist = L * pool;
      const typ = b.id === "ein" && t.zone === "z1" ? "warmup" : b.id === "aus" ? "cooldown" : t.zone === "tech" ? "other" : t.zone === "z1" ? "recovery" : "interval";
      const noetig = (t.hilfsmittel || []).filter((h) => V66.GARMIN_GERAET[h]), haupt = noetig.find((h) => V66.GARMIN_GERAET[h].id) || null;
      const rpe = /RPE\s*([\d–-]+)/.exec(String(t.rpe || ""));
      const name = b.id === "technik" || b.id === "beine" ? t.text : STIL_WORT[t.stil] ? `${b.titel} ${STIL_WORT[t.stil]}` : b.titel;
      const teile = [V66.bahnenText(m / pool), name, SW_WORT[t.zone] || null, css && t.tempo ? t.tempo : rpe ? `RPE ${rpe[1]}` : null,
        /gemischt/i.test(t.text || "") ? "gemischt" : null,
        ...noetig.filter((h) => h !== haupt).map((h) => "mit " + V66.GARMIN_GERAET[h].name),
        ...(t.frei || []).filter((h) => V66.GARMIN_GERAET[h] && !noetig.includes(h)).map((h) => V66.GARMIN_GERAET[h].name + " freiwillig"),
        dist > m ? "Bahn locker beenden" : null].filter(Boolean);
      const st = { type: "ExecutableStepDTO", stepOrder: ++nr, stepType: { stepTypeId: GTYP[typ], stepTypeKey: typ }, description: teile.join(" | ").slice(0, 100),
        endCondition: { conditionTypeId: 3, conditionTypeKey: "distance" }, endConditionValue: dist, preferredEndConditionUnit: METER, targetType: KEIN_ZIEL };
      if (css && Array.isArray(t.tempo_s) && isNum(t.tempo_s[0]) && isNum(t.tempo_s[1])) {
        const mitte = (t.tempo_s[0] + t.tempo_s[1]) / 2;
        Object.assign(st, { secondaryTargetType: { workoutTargetTypeId: 17, workoutTargetTypeKey: "swim.css.offset" }, secondaryTargetValueOne: r4(100 / css - 100 / mitte) });
      }
      st.strokeType = V66.STIL_GARMIN[t.stil] || FREE;                                   // 1.2: Stil des Teils (Übungen Kraul)
      if (haupt) st.equipmentType = { equipmentTypeId: V66.GARMIN_GERAET[haupt].id, equipmentTypeKey: V66.GARMIN_GERAET[haupt].key };
      n++;
      return { st, dist };
    };
    for (const b of S.bloecke) {
      const namen = [];
      (b.teile || []).forEach((t, i) => {
        if (!((t.m || 0) > 0)) return;
        const wdh = Math.max(1, t.wdh || 1), p = isNum(t.pause_s) && t.pause_s >= 5 ? t.pause_s : 0;
        if (wdh > 1) {
          const g = { type: "RepeatGroupDTO", stepOrder: ++nr, stepType: { stepTypeId: 6, stepTypeKey: "repeat" }, numberOfIterations: wdh,
            endCondition: { conditionTypeId: 7, conditionTypeKey: "iterations" }, endConditionValue: wdh, smartRepeat: false, skipLastRestStep: false, workoutSteps: [] };
          n++;
          const x = schwimm(b, t, i);
          g.workoutSteps.push(x.st);
          if (p) g.workoutSteps.push(pause(p));
          steps.push(g);
          meter += wdh * x.dist;
        } else {
          const x = schwimm(b, t, i);
          steps.push(x.st);
          if (p) steps.push(pause(p));
          meter += x.dist;
        }
        namen.push(b.id === "technik" ? t.text : `${wdh > 1 ? wdh + " × " : ""}${t.m} m`);
      });
      if (namen.length) aufbau.push(b.id === "technik" ? `Technik (${namen.join(", ")})` : `${b.titel} ${namen.join(" + ")}`);
    }
    if (!steps.length) return { fehler: "ohne Strecken" };
    return { steps, schritte: n, meter, pool, css, aufbau: aufbau.join(", ") };
  };

  /** Einheit (V66.einheit/V64.einheit) → { workout (upload_workout), fassung, schritte, ohneZiel, offen } oder { fehler }.
   *  opt = { date, uid, schwimm(e) → SW.einheit(...) (nur Schwimmen; dieselbe Einheit wie auf der Einheit-Seite) }. */
  V66.garminWorkout = function (e, skalen, opt) {
    const o = opt || {}, grund = V66.garminGrund(e);
    if (grund) return { fehler: grund };
    if (e.art === "bibliothek") return { fehler: "Bibliothek: nur einplanen" };
    const metrik = V66.metrikVon(e), sport = GSPORT[e.sport], name = (V66.GARMIN_PREFIX + String(e.titel || "Training")).slice(0, 60);
    const tag = (f) => ` [IN ${o.uid || e.uid || "-"} ${f}]`;
    if (e.sport === "schwimm") {
      let S = null; try { S = typeof o.schwimm === "function" ? o.schwimm(e) : null; } catch (err) { S = null; }
      if (!S) return { fehler: "Schwimm-Einheit nicht berechenbar" };
      const r = V66.garminSchwimm(S, metrik);
      if (r.fehler) return { fehler: r.fehler };
      if (r.schritte > V66.GARMIN_MAX_SCHRITTE) return { fehler: `zu viele Schritte (${r.schritte}, Garmin höchstens ${V66.GARMIN_MAX_SCHRITTE})` };
      const kern = { workoutName: name, sportType: sport, poolLength: r.pool, poolLengthUnit: METER, workoutSegments: [{ segmentOrder: 1, sportType: sport, workoutSteps: r.steps }] };
      const fassung = V66.fassung(JSON.stringify(kern));
      const ziel = r.css ? `Tempo-Ziele aus dem CSS-Test (${mmssG(r.css)}/100 m); die Uhr rechnet sie mit ihrer eigenen CSS.`
        : isNum(S.css_s) && metrik === "rpe" ? "Nach Anstrengung (RPE), wie gewählt." : "Noch ohne CSS-Test: nach Anstrengung (RPE).";
      const besch = [`Ironman Notebook · Mein Plan${o.date ? " · " + o.date : ""}.`, `${r.meter} m im ${r.pool}-m-Becken: ${r.aufbau}.`, ziel].join(" ").slice(0, 440) + tag(fassung);
      return { workout: Object.assign({ workoutName: name, description: besch }, kern), fassung, schritte: r.schritte, ohneZiel: 0, offen: false, css: !!r.css, meter: r.meter };
    }
    const folge = V66.garminFolge(e.teile);
    let nr = 0, ohneZiel = 0, offen = false, n = 0;
    const flachN = folge.reduce((s, x) => s + (x.wdh ? x.teile.length : 1), 0);
    let pos = 0;
    const schritt = (x, typ) => {
      const ohne = x.key === "z1" || x.key === "pause" || x.key === "test" || x.key === "abc" || metrik === "rpe";
      const z = ohne ? null : metrik === "puls" ? V66.garminPuls(x.key, e.sport, skalen) : V66.garminZiel(x.key, e.sport, skalen);
      if (!z && x.key !== "z1" && x.key !== "pause" && x.key !== "abc" && metrik !== "rpe") ohneZiel++;
      if (z && z.offen) offen = true;
      const text = x.key === "abc" ? V64.abcText(e.abc) : garminText(x.key, e.sport, skalen, metrik);   // lauf-abc-1.0: Übungen im Text, ohne Ziel
      const st = { type: "ExecutableStepDTO", stepOrder: ++nr, stepType: { stepTypeId: GTYP[typ], stepTypeKey: typ }, description: text,
        endCondition: { conditionTypeId: 2, conditionTypeKey: "time" }, endConditionValue: x.s };
      if (!z) st.targetType = KEIN_ZIEL;
      else if (z.art === "watt") Object.assign(st, { targetType: { workoutTargetTypeId: 6, workoutTargetTypeKey: "power.between" }, targetValueOne: z.lo, targetValueTwo: z.hi });
      else if (z.art === "puls") Object.assign(st, { targetType: { workoutTargetTypeId: 4, workoutTargetTypeKey: "heart.rate.zone" }, targetValueOne: z.lo, targetValueTwo: z.hi });
      else Object.assign(st, { targetType: { workoutTargetTypeId: 6, workoutTargetTypeKey: "pace.zone" }, targetValueOne: z.lo, targetValueTwo: z.hi });
      n++;
      return st;
    };
    const typVon = (x, erste, letzte) => x.key === "pause" ? "recovery" : x.key === "abc" ? "warmup" : (x.key === "z1" || x.key === "z2") && erste && flachN > 1 ? "warmup"
      : x.key === "z1" && letzte && flachN > 1 ? "cooldown" : x.key === "z1" ? "recovery" : "interval";
    const steps = folge.map((x) => {
      if (!x.wdh) { const st = schritt(x, typVon(x, pos === 0, pos === flachN - 1)); pos++; return st; }
      const g = { type: "RepeatGroupDTO", stepOrder: ++nr, stepType: { stepTypeId: 6, stepTypeKey: "repeat" }, numberOfIterations: x.wdh,
        endCondition: { conditionTypeId: 7, conditionTypeKey: "iterations" }, endConditionValue: x.wdh, smartRepeat: false, workoutSteps: [] };
      n++;
      g.workoutSteps = x.teile.map((y) => schritt(y, y.key === "pause" || y.key === "z1" ? "recovery" : "interval"));
      pos += x.teile.length;
      return g;
    });
    if (n > V66.GARMIN_MAX_SCHRITTE) return { fehler: `zu viele Schritte (${n}, Garmin höchstens ${V66.GARMIN_MAX_SCHRITTE})` };
    const kern = { workoutName: name, sportType: sport, workoutSegments: [{ segmentOrder: 1, sportType: sport, workoutSteps: steps }] };
    const fassung = V66.fassung(JSON.stringify(kern));
    const ablauf = (e.ablauf || []).join("; ");
    const mt = metrik === "puls" ? "Ziele nach Puls." : metrik === "rpe" ? "Nach Anstrengung (RPE), ohne Ziele auf der Uhr." : "";
    const besch = [`Ironman Notebook · Mein Plan${o.date ? " · " + o.date : ""}.`, mt, ablauf ? ablauf + "." : "", e.zweck || ""].filter(Boolean).join(" ").slice(0, 440) + tag(fassung);   // V8.4.1: Metrik vor dem Ablauf, damit sie nie abgeschnitten wird
    return { workout: Object.assign({ workoutName: name, description: besch }, { sportType: sport, workoutSegments: kern.workoutSegments }), fassung, schritte: n, ohneZiel, offen };
  };
  /** Auftrag «An Garmin senden» für einen Tag (Eingabe garmin_senden): modus «senden» (nächstes Nacht-Update), «auto» (am Vortag ab 23 Uhr)
   *  oder «aus». einheiten = Einheiten von Mein Plan an diesem Tag (mit uid). → Eintrag mit Momentaufnahme je Einheit.
   *  opt.teil (V7.3): nur eine Auswahl der Einheiten des Tages; was danach in Garmin ist, sind genau die Einheiten des Auftrags.
   *  opt.schwimm(e) (1.1): Schwimm-Einheit wie auf der Einheit-Seite. */
  V66.garminAuftrag = function (date, einheiten, skalen, modus, jetzt, opt) {
    const E = [], ohne = [], sw = opt && opt.schwimm, lo = opt && typeof opt.ampel === "function" ? opt.ampel : null;
    // V7.4 ampel-plan-1.0 (Entscheid A7): zu jeder Einheit mit harten, mittleren oder langen Abschnitten auch die lockere Fassung (V74.locker);
    // damit ersetzt das Morgen-Update bei «vorsichtig» das harte Workout des Tages (tools/garmin_senden.py ampel)
    const locker = (e) => {
      let a = null; try { a = lo ? lo(e) : null; } catch (err) { a = null; }
      if (!a) return {};
      const g = V66.garminWorkout(a, skalen, { date, uid: e.uid, schwimm: sw });
      return g.fehler ? {} : { ampel: { titel: a.titel, fassung: g.fassung, workout: g.workout } };
    };
    for (const e of einheiten || []) {
      if (e.art === "bibliothek") { if (isNum(e.wid)) E.push(Object.assign({ uid: e.uid, quelle: "bibliothek", titel: e.titel, sport: e.sport, wid: e.wid, fassung: "bib-" + e.wid }, locker(e))); else ohne.push({ uid: e.uid, titel: e.titel, grund: "Workout fehlt" }); continue; }
      const g = V66.garminWorkout(e, skalen, { date, uid: e.uid, schwimm: sw });
      if (g.fehler) { ohne.push({ uid: e.uid, titel: e.titel, grund: g.fehler }); continue; }
      E.push(Object.assign({ uid: e.uid, quelle: e.quelle || "vorschlag", titel: e.titel, sport: e.sport, fassung: g.fassung, workout: g.workout, ohneZiel: g.ohneZiel || 0, offen: !!g.offen }, locker(e)));
    }
    const out = { id: "gs-" + date, date, modus, erstellt: jetzt, v: V66.VERSIONS.garmin, einheiten: modus === "aus" ? [] : E, ohne: modus === "aus" ? [] : ohne };
    // V7.3: «Export» einer einzelnen Einheit – der Auftrag enthält nur die gewählten Einheiten (diese und die schon in Garmin); beim Nachführen
    // nach einer Änderung bleibt die Auswahl (ohne «teil»: alle Einheiten des Tages wie bisher)
    if (opt && opt.teil) out.teil = true;
    return out;
  };
  /** Eintrag im Garmin-Kalender (planned), den Silas selbst gesendet hat: Name «IN · » oder eine eingeplante Bibliotheks-Einheit mit Vermerk
   *  (nicht schon vorher von Enduco eingeplant). Solche Einträge sind nie Enduco (vergleich-1.4, bib-1.1). */
  V66.eigenGarmin = function (p, gesendet) {
    if (!p) return false;
    if (V64.istEigen(p.title || p.titel)) return true;
    return (gesendet || []).some((g) => g && g.quelle === "bibliothek" && !g.vorhanden && !g.entfernt && g.date === p.date && isNum(+p.wid) && +g.wid === +p.wid);
  };
  /** Stand einer Einheit in Garmin: «gesendet» (gleiche Fassung), «geaendert» (andere Fassung gesendet), «wartet» (Auftrag offen), null.
   *  opt.schwimm(e) wie bei garminAuftrag (gleiche Fassung nur mit derselben Schwimm-Einheit). */
  V66.garminStand = function (e, date, skalen, gesendet, auftrag, opt) {
    const g = (gesendet || []).find((x) => x && x.uid === e.uid && x.date === date && !x.entfernt);
    const f = e.art === "bibliothek" ? "bib-" + e.wid : (V66.garminWorkout(e, skalen, { date, uid: e.uid, schwimm: opt && opt.schwimm }).fassung || null);
    if (g) return g.fassung === f ? "gesendet" : "geaendert";
    if (auftrag && auftrag.status === "offen" && auftrag.modus !== "aus" && (auftrag.einheiten || []).some((x) => x.uid === e.uid)) return "wartet";
    return null;
  };
  return V66;
});
