/* Ironman Notebook V6.6 – Etappe 6 «Kalender und Woche bearbeiten», Rechenlogik ohne DOM (Auftrag docs/auftrag-etappen-6-8.md).
   - eigenplan-1.0: «Mein Plan» = Wochenvorschlag (wochenplan-1.2) mit deinen Änderungen je Tag (plan_woche): Training hinzufügen, Dauer ändern,
     verschieben, entfernen, Tag sperren; Wochenaktionen «Änderungen verwerfen» und «Woche leeren». Vergangene und gesperrte Tage ändern sich nie.
   - vorlagen-1.0: Vorlagen für «Training hinzufügen» = die Bausteine der Modelle (V64.BAUSTEINE, eigene Texte) plus Kraft/Athletik und Mobility.
     Dauer in 5-min-Schritten; Schlüsseleinheiten ab ihrer kurzen Fassung, längere Wünsche werden mit lockerem Fahren bzw. Laufen (Z2) ergänzt.
   - tl-plan-1.0: TL ≈ geplanter Einheiten aus dem aktiven Zonenprofil (eigene Festlegung, Modell): Rad (Leistung ÷ LT2)², Laufen (Tempo ÷
     Tempo an der LT2)², Schwimmen (Tempo ÷ CSS)³, je × Stunden × 100 (wie last-2.0). Distanz ≈ für Laufen und Schwimmen aus Dauer und Ziel-Pace.
     Ohne Bezugswert keine Zahl; Tests und Kraft ohne TL.
   - V7.2 verfuegbarkeit-1.0 (Wunsch vom 16.11.2026, Vorbild enduco): Zeit und erlaubte Sportarten je Tag oder je Wochentag; der Vorschlag wird
     danach verteilt (V66.verteilen). eigenplan-1.1: Wochen ohne eigene Änderungen folgen der Verfügbarkeit von selbst; wird eine verteilte Woche
     bearbeitet, wird sie als Ganzes festgehalten (vergangene Tage «eingefroren»), damit nichts zurückspringt. «Anpassen» verteilt den Rest der
     Woche neu (Gesperrtes und Eigenes bleibt), «Neu berechnen» setzt Wochen auf den Vorschlag zurück (gesperrte Tage bleiben). */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V66 = factory(node ? require("./v64.js") : root && root.V64);
  if (node) module.exports = V66;
  if (root) root.V66 = V66;
})(typeof window !== "undefined" ? window : null, function (V64) {
  "use strict";
  const V66 = { VERSIONS: { eigenplan: "eigenplan-1.1", vorlagen: "vorlagen-1.0", tl: "tl-plan-1.0", wochenblatt: "wochenblatt-1.0", kalender: "kalender-2.0",
    verfuegbarkeit: "verfuegbarkeit-1.0", felder: "einheit-felder-1.0", anpassen: "einheit-anpassen-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const add = (iso, n) => V64.addDays(iso, n);

  /* ---------------- Vorlagen (vorlagen-1.0) ---------------- */
  V66.SPORTARTEN = [["schwimm", "Schwimmen"], ["rad", "Rad"], ["rad_drinnen", "Rad drinnen"], ["lauf", "Laufen"], ["lauf_drinnen", "Laufen drinnen"],
    ["kraft", "Kraft und Athletik"], ["mobility", "Mobility"]];
  V66.ARTEN = { grundlage: "Grundlage", lang: "Lang", tempo: "Tempo", schwelle: "Schwelle", vo2max: "VO2max", renntempo: "Renntempo",
    koppel: "Koppellauf", technik: "Technik und Kurs", aktivierung: "Aktivierung", test: "Test", kraft: "Kraft und Athletik", mobility: "Mobility" };
  const EXTRA = {
    kraft: { sport: "kraft", titel: "Kraft und Athletik", art: "kraft", zweck: "Kraft- und Stabilisationsübungen nach deinem Programm; die Seite plant keine Übungen und keine Ziele." },
    mobility: { sport: "mobility", titel: "Mobility", art: "mobility", zweck: "Beweglichkeit und Lockerung, ohne Ziele." },
  };
  // Vorlage → [Art, min, max, Standard] in Minuten; ohne Zahlen: Schlüsseleinheit (min = kurze Fassung, Standard = volle, max = volle + 60)
  const ZU = {
    rad_locker: ["grundlage", 30, 300, 60], rad_lang: ["lang", 90, 360, 180], rad_lang_rt: ["renntempo", 120, 360, 180],
    rad_tempo: ["tempo"], rad_schwelle: ["schwelle"], rad_laktat: ["schwelle"], rad_vo2: ["vo2max"], aktivierung: ["aktivierung"], test_rad: ["test"],
    lauf_locker: ["grundlage", 20, 120, 45], lauf_lang: ["lang", 60, 210, 90], lauf_lang_rt: ["renntempo", 75, 210, 100], lauf_tempo: ["tempo"],
    lauf_laktat: ["schwelle"], lauf_vo2: ["vo2max"], lauf_koppel: ["koppel", 10, 60, 20], test_lauf: ["test"],
    schwimm_locker: ["grundlage", 20, 90, 45], schwimm_css: ["schwelle"], schwimm_kurs: ["technik", 30, 90, 60], test_css: ["test"],
    kraft: ["kraft", 15, 90, 40], mobility: ["mobility", 10, 60, 20],
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
      const b = EXTRA[id] || V64.BAUSTEINE[id]; if (!b || b.sport !== basis) continue;
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
    // V7.3 einheit-felder-1.0: Uhrzeit, Sperre und Metrik je Einheit (nur übernommen, wenn gültig)
    for (const k of ["uhrzeit", "gesperrt", "metrik"]) if (s[k] != null && s[k] !== false && !V66.feldPruefen(k, s[k])) mehr[k] = s[k];
    if (s.quelle === "bibliothek") {
      // Stufe aus den Zielen der Schritte (ctx.bibStufe, js/v65-ui.js), sonst laut Titel (V64.planStufe), sonst offen – nie geraten
      const st = (ctx.bibStufe && ctx.bibStufe(s.wid)) || ((V64.planStufe(null, s.titel) || {}).stufe) || "offen";
      return Object.assign({ id: "bibliothek", sport: s.sport, titel: s.titel || "Enduco-Workout", art: "bibliothek", dauer: s.dauer, teile: [], minuten: { locker: 0, mittel: 0, hart: 0 },
        stufe: st, ablauf: ["Ablauf wie im Enduco-Workout (Bibliothek)"], zweck: "Aus deiner Enduco-Bibliothek eingeplant.", quellen: [], wissen: "vergleich", wid: s.wid }, mehr);
    }
    const X = EXTRA[s.vorlage];
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
  /* V7.3 einheit-felder-1.0: Felder je Einheit in Mein Plan (Uhrzeit, Sperre, Metrik, drinnen, Einfahren, Intervall-Intensität). */
  V66.FELDER = { uhrzeit: 1, gesperrt: 1, metrik: 1, drinnen: 1, ein_min: 1, pausen: 1 };
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
      default: return "unbekanntes Feld";
    }
  };
  const ARBEIT_K = new Set(["z3", "z3o", "vo2", "css", "renntempo"]);
  const GESPERRT_E = "Einheit gesperrt – zuerst entsperren";
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
      T = vor.concat(T.slice(erste));
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
      festgehalten: ganz });
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
  /** Aufbau-Check (aufbau-1.1) für einen Lauf in Mein Plan: gemeldet, nie verhindert. e = Einheit, km = Distanz ≈ (V66.schaetzung),
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
    if (s.quelle === "eigen" && (s.dauer < B.min || s.dauer > B.max)) return `Dauer ${B.min}–${B.max} min`;
    return null;
  };
  /** Eine Änderung anwenden (rein, ohne Speichern). a.art: hinzufuegen {date, einheit}, entfernen {date, uid}, dauer {date, uid, dauer},
   *  verschieben {date, uid, nach}, sperren {date}, entsperren {date}, verwerfen, leeren; V7.3: einheit {date, uid, felder} (Uhrzeit, Sperre,
   *  Metrik, drinnen, Einfahren, Pausen; gesperrte Einheiten nur entsperren, nie ändern, verschieben oder entfernen). ctx = { heute, montag, vorschlag(date) → Einheiten
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
        const s = Object.assign({ quelle: "eigen" }, a.einheit, { uid: (ctx.neuId || neuId)() });
        f = V66.einheitPruefen(s); if (!f) liste(a.date).push(s);
        break;
      }
      case "entfernen": { f = darf(a.date); if (f) break; const i = finde(a.date, a.uid); if (i < 0) f = "Einheit nicht gefunden"; else if (liste(a.date)[i].gesperrt) f = GESPERRT_E; else liste(a.date).splice(i, 1); break; }
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
        const [x] = liste(a.date).splice(i, 1); liste(a.nach).push(x);
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
          if (v == null || v === false || (k === "pausen" && v === 50)) delete neu[k]; else neu[k] = v;
        }
        if (f) break;
        if ((neu.ein_min != null || neu.pausen != null || neu.drinnen) && neu.quelle === "bibliothek") { f = "Bibliothek: Ablauf wie im Enduco-Workout"; break; }
        // Inhalt geändert (Einfahren, Pausen, drinnen) = eigene Einheit wie beim Ändern der Dauer; Uhrzeit, Sperre und Metrik lassen die Quelle
        if (neu.quelle === "vorschlag" && ["ein_min", "pausen", "drinnen"].some((k) => neu[k] !== alt[k])) neu.quelle = "eigen";
        L[i] = neu;
        break;
      }
      case "sperren": f = !inWoche(a.date) ? "nicht in dieser Woche" : a.date < ctx.heute ? "vergangen – nur lesen" : null; if (!f) tag(a.date).gesperrt = true; break;
      case "entsperren": f = !inWoche(a.date) ? "nicht in dieser Woche" : null; if (!f) tag(a.date).gesperrt = false; break;
      case "verwerfen": case "neuberechnen": f = neuBerechnen(E, ctx, tag); break;
      case "leeren": for (let i = 0; i < 7; i++) { const d = add(E.montag, i); if (d >= ctx.heute && !(E.tage[d] && E.tage[d].gesperrt)) tag(d).einheiten = []; } break;
      case "festhalten": festhalten(); break;
      case "anpassen": festhalten(); f = anpassen(E, ctx); break;
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
  /** Kurztext: «1:30 h · Rad, Laufen», «kein Training», «Zeit offen · Schwimmen». */
  const SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  V66.vfText = function (v) {
    if (!v) return "nicht festgelegt";
    if (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length)) return "kein Training";
    const z = v.min == null ? "Zeit offen" : `${Math.floor(v.min / 60)}:${String(v.min % 60).padStart(2, "0")} h`;
    return `${z} · ${v.sport ? v.sport.map((x) => SPW[x]).join(", ") : "alle Sportarten"}`;
  };

  /* ---------------- Verteilen nach der Verfügbarkeit (verfuegbarkeit-1.0) ---------------- */
  const ORTSFEST = new Set(["schwimm_kurs", "aktivierung", "test_rad", "test_lauf", "test_css"]);
  const istOrtsfest = (e) => !!e && (ORTSFEST.has(e.id) || e.art === "test" || !!e.test);
  const istEigen = (e) => !!e && (e.quelle === "eigen" || e.quelle === "bibliothek" || !!e.gesperrt);   // V7.3: gesperrte Einheit bleibt am Tag
  const hart = (e) => !!e && (!!e.schluessel || e.art === "schluessel_s");
  const PRIO = (e) => (hart(e) ? 0 : e.art === "lang" ? 1 : e.art === "koppel" ? 3 : 2);
  const TAGW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
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
   * an festen Tagen stehen] }. → { tage, protokoll: { verschoben, gekuerzt, weg, hinweise }, geaendert }
   */
  V66.verteilen = function (tage, verf, opt) {
    opt = opt || {};
    const P = { verschoben: [], gekuerzt: [], weg: [], hinweise: [] };
    const T = (tage || []).map((t) => Object.assign({}, t, { einheiten: (t.einheiten || []).slice() }));
    if (!verf) return { tage: T, protokoll: P, geaendert: false };
    const V = T.map((t) => verf(t.date));
    if (T.some((t) => t.rennen)) {                                    // Rennwoche: fester Ablauf, nichts verschieben – nur melden
      T.forEach((t, i) => { const v = V[i], d = t.einheiten.reduce((x, e) => x + (e.dauer || 0), 0);
        if (!t.fest && v && t.einheiten.length && ((v.min != null && d > v.min) || t.einheiten.some((e) => v.sport && V66.VF_SPORT.includes(e.sport) && !v.sport.includes(e.sport))))
          P.hinweise.push(`Rennwoche: am ${wtK(t.date)} passt der Plan nicht zu deiner Verfügbarkeit – in der Rennwoche wird nichts verschoben, bitte selbst anpassen`); });
      return { tage: T, protokoll: P, geaendert: P.hinweise.length > 0 };
    }
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
            P.weg.push({ titel: e.titel, date: t.date, grund: erlaubt(i, "schwimm") ? "keine Zeit" : "Schwimmen an diesem Tag nicht möglich" }); continue;
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
    // Gewichte (eigene Festlegung): je Tag Abstand −5, je Einheit am Tag −10 (ab der dritten −25 mehr), gleiche Sportart am Tag −45, zwei harte
    // am Tag −60, hart neben hart −20 je Seite, hart und lang an Land am selben Tag −40, zwei lange am Tag −50, Ruhetag ohne eingetragene Zeit −30.
    const score = (p, i) => {
      const B = belegt[i], e = p.e; let s = -5 * Math.abs(i - p.von) - 10 * B.length - (B.length >= 2 ? 25 : 0);
      if (B.some((x) => x.sport === e.sport)) s -= 45;
      if (hart(e)) { if (hartAm(i, e)) s -= 60; if (hartAm(i - 1, e)) s -= 20; if (hartAm(i + 1, e)) s -= 20; }
      if (land(e) && ((hart(e) && B.some((x) => x.art === "lang" && land(x))) || (e.art === "lang" && B.some((x) => hart(x) && land(x))))) s -= 40;
      if (e.art === "lang" && B.some((x) => x.art === "lang")) s -= 50;
      if (!ruheOk(i)) s -= 30;
      return s;
    };
    const waehle = (p, bed, mitEigenem) => { let best = null, bs = -Infinity; T.forEach((t, i) => { if (t.fest || (i === p.von && !mitEigenem) || !bed(i)) return; const s = score(p, i); if (s > bs) { bs = s; best = i; } }); return best; };
    const VON = new Map(), WEG = new Map();
    const setzen = (p, i, e, mitK) => {
      if (e !== p.e) P.gekuerzt.push({ titel: p.e.titel, date: T[i].date, von: p.e.dauer, nach: e.dauer });
      VON.set(e, p.von);
      if (i !== p.von) { const r = { titel: e.titel, von: T[p.von].date, nach: T[i].date }; P.verschoben.push(r); WEG.set(e, r); }
      belegt[i].push(e);
      if (p.koppel) {
        if (mitK) belegt[i].push(p.koppel);
        else P.weg.push({ titel: p.koppel.titel, date: T[i].date, grund: erlaubt(i, "lauf") ? "keine Zeit nach der Ausfahrt" : "Laufen an diesem Tag nicht möglich" });
      }
    };
    const kurz = (p, i) => { const n = kuerzer(p.e, Math.min(p.e.dauer, rest(i)), opt.o || {}); if (n && ORD.has(p.e)) ORD.set(n, ORD.get(p.e)); return n && n.dauer < p.e.dauer && n.dauer <= rest(i) ? n : null; };
    // 1. Runde: jede Einheit bleibt an ihrem Tag, wenn die Sportart dort geht und Zeit da ist (wenn nötig gekürzt)
    const offen = [];
    for (const p of L) {
      const i = p.von, sp = p.e.sport, k = p.koppel;
      if (!erlaubt(i, sp)) { offen.push(p); continue; }
      if (k && erlaubt(i, "lauf") && rest(i) >= p.e.dauer + k.dauer) { setzen(p, i, p.e, true); continue; }
      if (rest(i) >= p.e.dauer) { setzen(p, i, p.e, false); continue; }
      // am eigenen Tag nur wenig kürzen (höchstens ein Viertel, mindestens 15 min erlaubt); sonst lieber ganz an einem anderen Tag
      const n = rest(i) >= minDauer(p.e) && p.e.dauer - rest(i) <= Math.max(15, 0.25 * p.e.dauer) ? kurz(p, i) : null;
      if (n) setzen(p, i, n, false); else offen.push(p);
    }
    // 2. Runde: die übrigen auf den besten anderen erlaubten Tag mit genug Zeit; sonst gekürzt; sonst entfällt sie
    for (const p of offen) {
      const sp = p.e.sport, k = p.koppel;
      let i = k ? waehle(p, (j) => erlaubt(j, sp) && erlaubt(j, "lauf") && rest(j) >= p.e.dauer + k.dauer) : null;
      if (i != null) { setzen(p, i, p.e, true); continue; }
      i = waehle(p, (j) => erlaubt(j, sp) && rest(j) >= p.e.dauer);
      if (i != null) { setzen(p, i, p.e, false); continue; }
      const m = minDauer(p.e);
      i = m < p.e.dauer ? waehle(p, (j) => erlaubt(j, sp) && rest(j) >= m, true) : null;
      const n = i != null ? kurz(p, i) : null;
      if (n) { setzen(p, i, n, false); continue; }
      P.weg.push({ titel: p.e.titel, date: T[p.von].date, grund: V66.VF_SPORT.includes(sp) && !T.some((t, j) => !t.fest && erlaubt(j, sp)) ? "diese Sportart ist an keinem freien Tag erlaubt" : "an keinem freien Tag genug Zeit" });
      if (k) P.weg.push({ titel: k.titel, date: T[p.von].date, grund: "gehört zur langen Ausfahrt" });
    }
    // 3. Runde: lockere Einheiten von vollen Tagen auf einen deutlich besseren Tag (mehr als 20 Punkte), z. B. neben eine verschobene lange Ausfahrt
    for (let i = 0; i < T.length; i++) for (const e of belegt[i].slice()) {
      if (T[i].fest || PRIO(e) !== 2 || !VON.has(e)) continue;
      const p = { e, von: VON.get(e) };
      belegt[i].splice(belegt[i].indexOf(e), 1);
      const jetzt = score(p, i), j = waehle(p, (k) => erlaubt(k, e.sport) && rest(k) >= e.dauer, true);
      if (j != null && j !== i && score(p, j) > jetzt + 20) {
        belegt[j].push(e);
        const r = WEG.get(e);
        if (r) { if (j === p.von) { P.verschoben.splice(P.verschoben.indexOf(r), 1); WEG.delete(e); } else r.nach = T[j].date; }
        else if (j !== p.von) { const n = { titel: e.titel, von: T[p.von].date, nach: T[j].date }; P.verschoben.push(n); WEG.set(e, n); }
      } else belegt[i].push(e);
    }
    T.forEach((t, i) => { if (!t.fest && !testTag.has(i) && isFinite(kap(i)) && rest(i) < 0) P.hinweise.push(`${wtK(t.date)}: ${-rest(i)} min mehr geplant als verfügbar (feste Einheiten)`); });
    let geaendert = false;
    const out = T.map((t, i) => {
      if (t.fest) return t;
      const alt = t.einheiten.map((e) => `${e.id}:${e.dauer}`).join("|"), neu = belegt[i].map((e) => `${e.id}:${e.dauer}`).join("|");
      if (alt === neu) return t;
      geaendert = true;
      const ord = (e) => { const o = ORD.has(e) ? ORD.get(e) : null; return o != null && Math.floor(o / 100) === i ? o % 100 : 1000 + (o == null ? 99 : o); };
      belegt[i].sort((a, b) => ord(a) - ord(b) || (a.art === "koppel") - (b.art === "koppel"));
      const leer = !belegt[i].length, keinT = V[i] && (V[i].min === 0 || (Array.isArray(V[i].sport) && !V[i].sport.length));
      return Object.assign({}, t, { einheiten: belegt[i], ruhetag: leer, notiz: leer ? (keinT ? "kein Training (Verfügbarkeit)" : t.notiz || null) : null });
    });
    return { tage: out, protokoll: P, geaendert: geaendert || P.hinweise.length > 0 };
  };
  /** Meldungen in Worten (für die Hinweise der Woche). */
  V66.verteilText = function (P) {
    if (!P) return [];
    const out = [];
    for (const x of P.verschoben) out.push(`«${x.titel}» von ${wtK(x.von)} auf ${wtK(x.nach)} verschoben (Verfügbarkeit)`);
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
  const bausteinO = (w, ctx) => ({ phase: w && w.phase, css_s: ctx && ctx.css_s, kurz: !!(w && (w.taper || w.erholung)) });
  /** Vorschlag einer ganzen Woche (V64.woche) nach deiner Verfügbarkeit – unabhängig vom heutigen Tag, damit vergangene Tage stehen bleiben.
   *  ctx = { css_s }. → neue Woche (w bleibt unverändert) mit `verteilung` und den Meldungen in `hinweise`; ohne Wirkung dieselbe Woche. */
  V66.wocheVerteilt = function (w, verf, ctx) {
    if (!w || !Array.isArray(w.tage) || !verf || verf.leer || !w.tage.some((t) => verf(t.date))) return w;
    const r = V66.verteilen(w.tage.map((t) => Object.assign({}, t, { fest: false })), verf, { o: bausteinO(w, ctx) });
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
    const r = V66.verteilen(tage, ctx.verf, { o: ctx.o || {} });
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
    const gesperrt = tageW.filter((d) => festTag(E.tage[d])), vorbei = tageW.filter((d) => d < ctx.heute && E.tage[d] && Array.isArray(E.tage[d].einheiten));
    if (!E.ganz) { for (const d of Object.keys(E.tage)) if (d >= ctx.heute && !festTag(E.tage[d])) E.tage[d].einheiten = null; return null; }
    if (!gesperrt.length && !vorbei.length) { E.tage = {}; delete E.ganz; delete E.verteilung; return null; }        // ganz neu: wieder automatisch
    if (!ctx.roh) return "Vorschlag nicht bekannt";
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
    const r = ctx.verf ? V66.verteilen(tage, ctx.verf, { o: ctx.o || {}, verbraucht }) : { tage, protokoll: null };
    for (const t of r.tage) if (!t.fest) tag(t.date).einheiten = t.einheiten.map((e, i) => spezVon(e, `v-${t.date}-${i}`));
    E.verteilung = r.protokoll ? { v: V66.VERSIONS.verfuegbarkeit, art: "neu", am: ctx.jetzt || new Date().toISOString(), meldungen: V66.verteilText(r.protokoll).slice(0, 20) } : undefined;
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

  /* ---------------- TL ≈ und Distanz ≈ (tl-plan-1.0) ---------------- */
  const zone = (L, nr) => (Array.isArray(L) ? L.find((z) => z && z.z === "Z" + nr) || null : null);
  const mitte = (z) => (z && isNum(z.von) && isNum(z.bis) ? (z.von + z.bis) / 2 : null);
  /** Bezugswerte aus dem aktiven Zonenprofil: skalen = TR.zonen(D.zonen).skalen; css_s = CSS in s/100 m. */
  V66.bezug = function (skalen, css_s) {
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
    return R;
  };
  /** TL ≈ und Distanz ≈ einer Einheit (Ergebnis von V66.einheit oder V64.einheit). → { tl, km, vollstaendig, grund } */
  V66.schaetzung = function (e, bezug) {
    const out = { tl: null, km: null, vollstaendig: false, grund: null, v: V66.VERSIONS.tl };
    if (!e || !Array.isArray(e.teile) || !e.teile.length) { out.grund = "ohne Ablauf"; return out; }
    if (["test", "kraft", "mobility", "bibliothek"].includes(e.art)) { out.grund = e.art === "test" ? "Test – Belastung hängt vom Verlauf ab" : "ohne Ziele"; return out; }
    const B = bezug || {};
    let tl = 0, km = 0, offen = 0;
    for (const [k, m] of e.teile) {
      const h = m / 60;
      if (e.sport === "rad") {
        const R = B.rad, P = R ? R.wert[k] : null;
        if (!isNum(P)) { offen += m; continue; }
        tl += h * Math.pow(P / R.lt2, 2) * 100;
      } else if (e.sport === "lauf") {
        const R = B.lauf, pace = R ? R.pace[k] : null;
        if (!isNum(pace)) { offen += m; continue; }
        tl += h * Math.pow(R.lt2 / pace, 2) * 100; km += (m * 60) / pace;
      } else if (e.sport === "schwimm") {
        const R = B.schwimm; if (!R) { offen += m; continue; }
        if (k === "pause") continue;
        const pace = k === "css" ? R.css : k === "z2" || k === "z1" ? R.css + 10 : null;    // Grundlage = CSS + 8–12 s (wie V64.ziel)
        if (!isNum(pace)) { offen += m; continue; }
        tl += h * Math.pow(R.css / pace, 3) * 100; km += (m * 60 * 100) / pace / 1000;
      } else { offen += m; }
    }
    const total = e.teile.reduce((s, t) => s + t[1], 0);
    if (offen >= total) { out.grund = e.sport === "schwimm" ? "ohne CSS-Test" : "ohne Zonenprofil"; return out; }
    out.tl = Math.round(tl); out.vollstaendig = offen === 0;
    if (e.sport !== "rad") out.km = Math.round(km * 10) / 10;
    if (!out.vollstaendig) out.grund = `${Math.round(offen)} min ohne Bezugswert (mind.)`;
    return out;
  };

  /* ---------------- An Garmin senden (garmin-senden-1.0) ----------------
     Einheiten aus Mein Plan als Garmin-Workout (Format von upload_workout): Rad mit Leistung (power.between, Watt), Laufen mit Tempo
     (pace.zone, m/s, langsam → schnell) aus dem aktiven Zonenprofil; Z1 und Pausen ohne Ziel. Offene Grenze (Z5 nach oben): 15 % über der
     bekannten Grenze, nur damit die Uhr einen Bereich zeigt (eigene Festlegung). Wiederholungen als Gruppe (eine Ebene). Schwimmen, Tests,
     Kraft und Mobility werden nicht gesendet (Grund wird genannt); Bibliothek = Enduco-Workout, nur eingeplant. Name mit «IN · ». */
  V66.VERSIONS.garmin = "garmin-senden-1.0";
  V66.GARMIN_PREFIX = V64.EIGEN_PREFIX;
  V66.GARMIN_OFFEN = 1.15;
  V66.GARMIN_MAX_SCHRITTE = 50;
  const gz = (L, nr) => (Array.isArray(L) ? L.find((z) => z && z.z === "Z" + nr) || null : null);
  const voll = (z) => z && isNum(z.von) && isNum(z.bis);
  const r3 = (x) => Math.round(x * 1000) / 1000;
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
  const GSPORT = { rad: { sportTypeId: 2, sportTypeKey: "cycling" }, lauf: { sportTypeId: 1, sportTypeKey: "running" } };
  const GTYP = { warmup: 1, cooldown: 2, interval: 3, recovery: 4 };
  /** Grund, warum eine Einheit nicht als Workout gesendet wird, oder null. */
  V66.garminGrund = function (e) {
    if (!e) return "keine Einheit";
    if (e.art === "bibliothek") return null;
    if (e.art === "test") return "Tests über die Test-Workouts (Testkalender)";
    if (e.sport === "schwimm") return "Schwimmen folgt später (Garmin braucht Strecken je Abschnitt)";
    if (!GSPORT[e.sport]) return "nur Rad und Laufen";
    if (!Array.isArray(e.teile) || !e.teile.length || e.teile[0][0] === "ohne") return "ohne Ablauf";
    return null;
  };
  /** Einheit (V66.einheit/V64.einheit) → { workout (upload_workout), fassung, schritte, ohneZiel, offen } oder { fehler }. */
  V66.garminWorkout = function (e, skalen, opt) {
    const o = opt || {}, grund = V66.garminGrund(e);
    if (grund) return { fehler: grund };
    if (e.art === "bibliothek") return { fehler: "Bibliothek: nur einplanen" };
    const folge = V66.garminFolge(e.teile), sport = GSPORT[e.sport];
    let nr = 0, ohneZiel = 0, offen = false, n = 0;
    const flachN = folge.reduce((s, x) => s + (x.wdh ? x.teile.length : 1), 0);
    let pos = 0;
    const schritt = (x, typ) => {
      const z = x.key === "z1" || x.key === "pause" || x.key === "test" ? null : V66.garminZiel(x.key, e.sport, skalen);
      if (!z && x.key !== "z1" && x.key !== "pause") ohneZiel++;
      if (z && z.offen) offen = true;
      const text = V64.ZNAME[x.key] ? V64.ZNAME[x.key] + ((V64.ziel(x.key, e.sport, skalen) || "") ? ": " + V64.ziel(x.key, e.sport, skalen) : "") : x.key;
      const st = { type: "ExecutableStepDTO", stepOrder: ++nr, stepType: { stepTypeId: GTYP[typ], stepTypeKey: typ }, description: text.slice(0, 100),
        endCondition: { conditionTypeId: 2, conditionTypeKey: "time" }, endConditionValue: x.s };
      if (!z) st.targetType = { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target" };
      else if (z.art === "watt") Object.assign(st, { targetType: { workoutTargetTypeId: 6, workoutTargetTypeKey: "power.between" }, targetValueOne: z.lo, targetValueTwo: z.hi });
      else Object.assign(st, { targetType: { workoutTargetTypeId: 6, workoutTargetTypeKey: "pace.zone" }, targetValueOne: z.lo, targetValueTwo: z.hi });
      n++;
      return st;
    };
    const typVon = (x, erste, letzte) => x.key === "pause" ? "recovery" : (x.key === "z1" || x.key === "z2") && erste && flachN > 1 ? "warmup"
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
    const name = (V66.GARMIN_PREFIX + String(e.titel || "Training")).slice(0, 60);
    const kern = { workoutName: name, sportType: sport, workoutSegments: [{ segmentOrder: 1, sportType: sport, workoutSteps: steps }] };
    const fassung = V66.fassung(JSON.stringify(kern));
    const ablauf = (e.ablauf || []).join("; ");
    const besch = [`Ironman Notebook · Mein Plan${o.date ? " · " + o.date : ""}.`, ablauf ? ablauf + "." : "", e.zweck || ""].filter(Boolean).join(" ").slice(0, 440) + ` [IN ${o.uid || e.uid || "-"} ${fassung}]`;
    return { workout: Object.assign({ workoutName: name, description: besch }, { sportType: sport, workoutSegments: kern.workoutSegments }), fassung, schritte: n, ohneZiel, offen };
  };
  /** Auftrag «An Garmin senden» für einen Tag (Eingabe garmin_senden): modus «senden» (nächstes Nacht-Update), «auto» (am Vortag ab 23 Uhr)
   *  oder «aus». einheiten = Einheiten von Mein Plan an diesem Tag (mit uid). → Eintrag mit Momentaufnahme je Einheit.
   *  opt.teil (V7.3): nur eine Auswahl der Einheiten des Tages; was danach in Garmin ist, sind genau die Einheiten des Auftrags. */
  V66.garminAuftrag = function (date, einheiten, skalen, modus, jetzt, opt) {
    const E = [], ohne = [];
    for (const e of einheiten || []) {
      if (e.art === "bibliothek") { if (isNum(e.wid)) E.push({ uid: e.uid, quelle: "bibliothek", titel: e.titel, sport: e.sport, wid: e.wid, fassung: "bib-" + e.wid }); else ohne.push({ uid: e.uid, titel: e.titel, grund: "Workout fehlt" }); continue; }
      const g = V66.garminWorkout(e, skalen, { date, uid: e.uid });
      if (g.fehler) { ohne.push({ uid: e.uid, titel: e.titel, grund: g.fehler }); continue; }
      E.push({ uid: e.uid, quelle: e.quelle || "vorschlag", titel: e.titel, sport: e.sport, fassung: g.fassung, workout: g.workout, ohneZiel: g.ohneZiel || 0, offen: !!g.offen });
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
  /** Stand einer Einheit in Garmin: «gesendet» (gleiche Fassung), «geaendert» (andere Fassung gesendet), «wartet» (Auftrag offen), null. */
  V66.garminStand = function (e, date, skalen, gesendet, auftrag) {
    const g = (gesendet || []).find((x) => x && x.uid === e.uid && x.date === date && !x.entfernt);
    const f = e.art === "bibliothek" ? "bib-" + e.wid : (V66.garminWorkout(e, skalen, { date, uid: e.uid }).fassung || null);
    if (g) return g.fassung === f ? "gesendet" : "geaendert";
    if (auftrag && auftrag.status === "offen" && auftrag.modus !== "aus" && (auftrag.einheiten || []).some((x) => x.uid === e.uid)) return "wartet";
    return null;
  };
  return V66;
});
