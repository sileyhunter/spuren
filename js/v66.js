/* Ironman Notebook V6.6 – Etappe 6 «Kalender und Woche bearbeiten», Rechenlogik ohne DOM (Auftrag docs/auftrag-etappen-6-8.md).
   - eigenplan-1.0: «Mein Plan» = Wochenvorschlag (wochenplan-1.2) mit deinen Änderungen je Tag (plan_woche): Training hinzufügen, Dauer ändern,
     verschieben, entfernen, Tag sperren; Wochenaktionen «Änderungen verwerfen» und «Woche leeren». Vergangene und gesperrte Tage ändern sich nie.
   - vorlagen-1.0: Vorlagen für «Training hinzufügen» = die Bausteine der Modelle (V64.BAUSTEINE, eigene Texte) plus Kraft/Athletik und Mobility.
     Dauer in 5-min-Schritten; Schlüsseleinheiten ab ihrer kurzen Fassung, längere Wünsche werden mit lockerem Fahren bzw. Laufen (Z2) ergänzt.
   - tl-plan-1.0: TL ≈ geplanter Einheiten aus dem aktiven Zonenprofil (eigene Festlegung, Modell): Rad (Leistung ÷ LT2)², Laufen (Tempo ÷
     Tempo an der LT2)², Schwimmen (Tempo ÷ CSS)³, je × Stunden × 100 (wie last-2.0). Distanz ≈ für Laufen und Schwimmen aus Dauer und Ziel-Pace.
     Ohne Bezugswert keine Zahl; Tests und Kraft ohne TL. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V66 = factory(node ? require("./v64.js") : root && root.V64);
  if (node) module.exports = V66;
  if (root) root.V66 = V66;
})(typeof window !== "undefined" ? window : null, function (V64) {
  "use strict";
  const V66 = { VERSIONS: { eigenplan: "eigenplan-1.0", vorlagen: "vorlagen-1.0", tl: "tl-plan-1.0", wochenblatt: "wochenblatt-1.0", kalender: "kalender-2.0" } };
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
    if (s.drinnen) e.titel += " (drinnen)";
    return Object.assign(e, mehr);
  };

  /* ---------------- Mein Plan (eigenplan-1.0) ---------------- */
  V66.leer = (montag) => ({ id: "wo-" + montag, v: V66.VERSIONS.eigenplan, montag, tage: {} });
  const vorschlagGespeichert = (d, L) => (L || []).map((e, i) => ({ uid: `v-${d}-${i}`, vorlage: e.id, dauer: e.dauer, quelle: "vorschlag" }));
  /** Mein Plan einer Woche: w = V64.woche(...), eintrag = plan_woche-Eintrag dieser Woche (oder null). Tage mit eigener Liste ersetzen den
   *  Vorschlag; gesperrte Tage tragen «gesperrt». Liefert eine neue Woche (w bleibt unverändert); jede Einheit hat uid und quelle. */
  V66.meinPlan = function (w, eintrag, ctx) {
    if (!w || !Array.isArray(w.tage)) return w;
    const tage = w.tage.map((t) => {
      const o = eintrag && eintrag.tage ? eintrag.tage[t.date] : null;
      const neu = Object.assign({}, t, { vorschlag: t.einheiten, gesperrt: !!(o && o.gesperrt), bearbeitet: !!(o && Array.isArray(o.einheiten)) });
      neu.einheiten = neu.bearbeitet ? o.einheiten.map((s) => V66.einheit(s, ctx)).filter(Boolean)
        : (t.einheiten || []).map((e, i) => Object.assign({}, e, { uid: `v-${t.date}-${i}`, quelle: "vorschlag" }));
      return neu;
    });
    const out = Object.assign({}, w, { tage, bearbeitet: tage.some((t) => t.bearbeitet), gesperrt: tage.filter((t) => t.gesperrt).map((t) => t.date), eigenplan: V66.VERSIONS.eigenplan });
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
    if (s.quelle === "bibliothek") return isNum(s.wid) && ["rad", "lauf", "schwimm"].includes(s.sport) ? null : "Bibliothek ohne Workout oder Sportart";
    const B = V66.bereich(s.vorlage); if (!B) return "unbekannte Vorlage";
    if (s.quelle === "eigen" && (s.dauer < B.min || s.dauer > B.max)) return `Dauer ${B.min}–${B.max} min`;
    return null;
  };
  /** Eine Änderung anwenden (rein, ohne Speichern). a.art: hinzufuegen {date, einheit}, entfernen {date, uid}, dauer {date, uid, dauer},
   *  verschieben {date, uid, nach}, sperren {date}, entsperren {date}, verwerfen, leeren. ctx = { heute, montag, vorschlag(date) → Einheiten
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
    let f = null;
    switch (a.art) {
      case "hinzufuegen": {
        f = darf(a.date); if (f) break;
        const s = Object.assign({ quelle: "eigen" }, a.einheit, { uid: (ctx.neuId || neuId)() });
        f = V66.einheitPruefen(s); if (!f) liste(a.date).push(s);
        break;
      }
      case "entfernen": { f = darf(a.date); if (f) break; const i = finde(a.date, a.uid); if (i < 0) f = "Einheit nicht gefunden"; else liste(a.date).splice(i, 1); break; }
      case "dauer": {
        f = darf(a.date); if (f) break;
        const L = liste(a.date), i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        if (L[i].quelle === "bibliothek") { f = "Dauer wie im Enduco-Workout"; break; }
        const B = V66.bereich(L[i].vorlage); if (!B || B.fest) { f = "feste Dauer"; break; }
        if (!isNum(a.dauer) || a.dauer < B.min || a.dauer > B.max) { f = `Dauer ${B.min}–${B.max} min`; break; }
        L[i] = Object.assign({}, L[i], { dauer: a.dauer, quelle: L[i].quelle === "vorschlag" ? "eigen" : L[i].quelle });
        break;
      }
      case "verschieben": {
        f = darf(a.date) || darf(a.nach) || (a.date === a.nach ? "gleicher Tag" : null); if (f) break;
        const i = finde(a.date, a.uid); if (i < 0) { f = "Einheit nicht gefunden"; break; }
        const [x] = liste(a.date).splice(i, 1); liste(a.nach).push(x);
        break;
      }
      case "sperren": f = !inWoche(a.date) ? "nicht in dieser Woche" : a.date < ctx.heute ? "vergangen – nur lesen" : null; if (!f) tag(a.date).gesperrt = true; break;
      case "entsperren": f = !inWoche(a.date) ? "nicht in dieser Woche" : null; if (!f) tag(a.date).gesperrt = false; break;
      case "verwerfen": for (const d of Object.keys(E.tage)) if (d >= ctx.heute && !E.tage[d].gesperrt) E.tage[d].einheiten = null; break;
      case "leeren": for (let i = 0; i < 7; i++) { const d = add(E.montag, i); if (d >= ctx.heute && !(E.tage[d] && E.tage[d].gesperrt)) tag(d).einheiten = []; } break;
      default: f = "unbekannte Aktion";
    }
    if (f) return { fehler: f, eintrag: eintrag || null };
    for (const d of Object.keys(E.tage)) {           // Tage, die wieder genau dem Vorschlag entsprechen, folgen ihm wieder; Tage ohne Änderung weglassen
      const t = E.tage[d];
      if (Array.isArray(t.einheiten) && ctx.vorschlag && JSON.stringify(t.einheiten) === JSON.stringify(vorschlagGespeichert(d, ctx.vorschlag(d)))) t.einheiten = null;
      if (!t.gesperrt && t.einheiten == null) delete E.tage[d];
    }
    E.v = V66.VERSIONS.eigenplan; E.geaendert = ctx.jetzt || new Date().toISOString();
    return { eintrag: E };
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
   *  oder «aus». einheiten = Einheiten von Mein Plan an diesem Tag (mit uid). → Eintrag mit Momentaufnahme je Einheit. */
  V66.garminAuftrag = function (date, einheiten, skalen, modus, jetzt) {
    const E = [], ohne = [];
    for (const e of einheiten || []) {
      if (e.art === "bibliothek") { if (isNum(e.wid)) E.push({ uid: e.uid, quelle: "bibliothek", titel: e.titel, sport: e.sport, wid: e.wid, fassung: "bib-" + e.wid }); else ohne.push({ uid: e.uid, titel: e.titel, grund: "Workout fehlt" }); continue; }
      const g = V66.garminWorkout(e, skalen, { date, uid: e.uid });
      if (g.fehler) { ohne.push({ uid: e.uid, titel: e.titel, grund: g.fehler }); continue; }
      E.push({ uid: e.uid, quelle: e.quelle || "vorschlag", titel: e.titel, sport: e.sport, fassung: g.fassung, workout: g.workout, ohneZiel: g.ohneZiel || 0, offen: !!g.offen });
    }
    return { id: "gs-" + date, date, modus, erstellt: jetzt, v: V66.VERSIONS.garmin, einheiten: modus === "aus" ? [] : E, ohne: modus === "aus" ? [] : ohne };
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
