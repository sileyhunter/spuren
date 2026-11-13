/* V6.4 Etappe 4 · Trainingsmodell und Woche nach Modell (ohne DOM, auch unter Node testbar).
   - modell-1.0: wählbare Modelle der Intensitätsverteilung (polarisiert, pyramidal, Schwelle mit Laktat, rennspezifisch) und «kombiniert»
     (Standard, von Silas gewählt am 13.11.2026: Winter polarisiert, ab Februar rennspezifisch). Erklärung und Quellen: js/wissen.js.
   - wochenplan-1.2: Wochenvorschlag aus Phase und Stunden (saison-1.2), Modell, Tests (testplan-1.0) und Rennen – neben dem Enduco-Plan,
     nie nach Garmin oder Enduco geschrieben. Feste Wochenstruktur (Mo frei, Schlüsseleinheiten Di Laufen und Do Rad, lang Sa Rad und So Laufen).
   - aufteilung-1.0: Stunden Schwimmen 20 %, Rad 50 %, Laufen 30 % (eigene Festlegung, keine Studie).
   - tid-1.0: Zeit in drei Bereichen (locker < LT1 ≤ mittel < LT2 ≤ hart), Muster nach Treff et al. 2019 (Polarisierungsindex), Abgleich mit dem Modell.
   - intensitaet-1.1 (V6.4.2; 1.1 = Titel-Regel mit «Neuro» und «locker»): höchste Intensität je Sportart (nur locker / bis Schwelle / alles). Der Vorschlag ersetzt Schlüsseleinheiten darüber
     durch die nächst leichtere derselben Sportart und verschiebt nichts auf eine andere Sportart; der Enduco-Plan wird nur dagegen geprüft.
   - aufbau-1.1 (V6.4.2, 1.1 Audit V6.4): jeder Lauf gegen den längsten Lauf der 30 Tage davor (Frandsen et al. 2025: Sprung ab mehr als 10 %), Grenze für den
     nächsten Lauf, Wochen-km Laufen, Schwimm-Meter und Rad-Stunden. Im Wochenvorschlag kein Lauf über dieser Grenze (Distanz aus dem
     Zonenprofil geschätzt; ohne Zonenprofil keine Begrenzung, nie geraten); ohne Lauf in den 30 Tagen davor höchstens 30 min locker.
   - vergleich-1.1 (V6.4.3, 1.1 Audit V6.4): Vorschlag gegen Enduco (Garmin-Kalender) und Absolviertes je Woche: Stunden und Einheiten je Sportart, Stufen,
     längste Einheiten, Unterschiede in Worten, welchem Plan das Absolvierte näher war. Enduco ist nur bekannt, soweit exportiert.
   Unbekannt bleibt unbekannt: ohne Zonenprofil keine Watt- oder Pace-Ziele, ohne CSS-Test kein Schwimmtempo. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V64 = factory(node ? require("./v62.js") : root && root.V62);   // V62.testSport: Sportart eines Tests (Audit V6.4 B6)
  if (node) module.exports = V64;
  if (root) root.V64 = V64;
})(typeof window !== "undefined" ? window : null, function (V62) {
  "use strict";
  const V64 = { VERSIONS: { modell: "modell-1.0", woche: "wochenplan-1.2", tid: "tid-1.0", aufteilung: "aufteilung-1.0", intensitaet: "intensitaet-1.1", aufbau: "aufbau-1.1", vergleich: "vergleich-1.1" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const montag = (iso) => add(iso, -((new Date(T(iso)).getUTCDay() + 6) % 7));
  const r5 = (x) => Math.max(0, Math.round(x / 5) * 5), r15 = (x) => Math.max(0, Math.round(x / 15) * 15);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mmss = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  V64.montag = montag; V64.addDays = add;

  /* ---------------- Drei Bereiche (tid-1.0) ---------------- */
  /** Zone (Schlüssel aus js/v6.js oder eigener Baustein-Schlüssel) → Bereich. Renntempo legt die Seite knapp unter LT1 fest (eigene Festlegung) und zählt es darum als locker. */
  V64.DREI = { z1: "locker", z2: "locker", fatmax: "locker", pause: "locker", renntempo: "locker",
    z3: "mittel", sweet: "mittel", z3o: "mittel",
    z4: "hart", z5: "hart", vo2: "hart", anaerob: "hart", neuro: "hart", sprint: "hart" };
  /** Eigene Baustein-Schlüssel → Farbe aus V6.ZONEN (nur zum Zeichnen). */
  V64.FARBE = { z1: "z1", z2: "z2", renntempo: "fatmax", z3: "z3", z3o: "sweet", vo2: "vo2", pause: "pause", css: "z4", test: "offen" };
  V64.ZNAME = { z1: "Z1 locker", z2: "Z2 Grundlage", renntempo: "Renntempo (knapp unter LT1)", z3: "Z3 Tempo", z3o: "knapp unter LT2", vo2: "Z5 VO2max",
    css: "CSS-Tempo", test: "Test", pause: "locker" };
  V64.AUFTEILUNG = { schwimm: 0.2, rad: 0.5, lauf: 0.3 };

  /* ---------------- Modelle (modell-1.0) ---------------- */
  /** erwartet: Muster nach tid-1.0 und Grenzen für den Abgleich. schluessel: Bausteine der beiden Schlüsseleinheiten (Rad Do, Laufen Di).
   *  Quellen-IDs aus js/wissen.js (WS.QUELLEN), Kapitel «modelle». */
  V64.MODELLE = {
    polarisiert: { name: "Polarisiert", kurz: "Fast alles locker, zwei harte Intervall-Einheiten pro Woche, kaum Zeit zwischen den Schwellen.",
      schluessel: { rad: "rad_vo2", lauf: "lauf_vo2" }, erwartet: { muster: ["polarisiert"], locker_min: 75, hart_max: null },
      quellen: ["seiler2010", "stoeggl2015", "stoeggl2014", "oliveira2024", "rosenblat2025", "treff2019"] },
    pyramidal: { name: "Pyramidal", kurz: "Fast alles locker, eine Schwellen-Einheit (Rad) und eine VO2max-Einheit (Laufen): mehr Mitte als hart.",
      schluessel: { rad: "rad_schwelle", lauf: "lauf_vo2" }, erwartet: { muster: ["pyramidal"], locker_min: 70, hart_max: null },
      quellen: ["stoeggl2015", "rosenblat2025", "filipas2022", "neal2011"] },
    schwelle: { name: "Schwelle mit Laktat (norwegisch)", kurz: "Viel locker und zwei Einheiten knapp unter LT2, mit Laktat gesteuert; fast nichts darüber.",
      schluessel: { rad: "rad_laktat", lauf: "lauf_laktat" }, erwartet: { muster: ["pyramidal"], locker_min: 70, hart_max: 5 },
      quellen: ["casado2023", "toennessen2024", "haugen2022"] },
    rennspezifisch: { name: "Rennspezifisch (Langdistanz)", kurz: "Locker bleibt die Basis; Tempo-Einheiten, Renntempo in den langen Einheiten und Koppelläufe.",
      schluessel: { rad: "rad_tempo", lauf: "lauf_tempo" }, renntempo: true, koppel: true, erwartet: { muster: ["pyramidal", "polarisiert"], locker_min: 75, hart_max: 10 },
      quellen: ["laursen2005", "munoz2014a", "neal2011", "millet2000", "maunder2021"] },
    kombiniert: { name: "Winter polarisiert, ab Februar rennspezifisch", kurz: "Bis zum Wechsel polarisiert (Grundlage und VO2max), danach rennspezifisch.",
      standard: true, teile: ["polarisiert", "rennspezifisch"], quellen: ["oliveira2024", "filipas2022", "laursen2005", "munoz2014a"] },
  };
  V64.REIHE = ["kombiniert", "polarisiert", "pyramidal", "schwelle", "rennspezifisch"];
  /** Wechseldatum «kombiniert»: 1. Februar im Jahr des Hauptrennens (Rennen im Januar oder Februar, auch am 29.2.: im Jahr davor).
   *  Ohne Hauptrennen (Audit V6.4 B15): der nächste 1. Februar nach dem Bezugsdatum (Montag der Woche) – ohne Rennen also polarisiert,
   *  nie abhängig von der Uhr des Geräts. */
  V64.wechselStandard = function (hauptDatum, bezug) {
    if (hauptDatum) return `${+hauptDatum.slice(0, 4) - (hauptDatum.slice(5, 7) <= "02" ? 1 : 0)}-02-01`;
    const b = /^\d{4}-\d{2}-\d{2}$/.test(String(bezug || "")) ? bezug : new Date().toISOString().slice(0, 10);
    return `${+b.slice(0, 4) + (b.slice(5) >= "02-01" ? 1 : 0)}-02-01`;
  };
  /** Gewähltes Modell (Eintrag «modell» von der Seite oder aus den Daten) → { modell, wechsel }; unbekannt → Standard. */
  V64.wahl = function (eintrag, hauptDatum, bezug) {
    const e = eintrag || {}, m = V64.MODELLE[e.modell] ? e.modell : "kombiniert";
    const w = /^\d{4}-\d{2}-\d{2}$/.test(String(e.wechsel || "")) ? e.wechsel : V64.wechselStandard(hauptDatum, bezug);
    return { modell: m, wechsel: w };
  };
  /** Modell, das in der Woche ab montagISO gilt: «kombiniert» ab der Woche, in der der Wechsel liegt, rennspezifisch. */
  V64.modellFuer = function (wahl, montagISO) {
    const w = wahl || {};
    if (w.modell && w.modell !== "kombiniert" && V64.MODELLE[w.modell]) return w.modell;
    return montagISO >= montag(w.wechsel || V64.wechselStandard(null, montagISO)) ? "rennspezifisch" : "polarisiert";
  };

  /* ---------------- Bausteine ---------------- */
  // teile(o) → ausgefaltete Abschnitte [[Schlüssel, Minuten], …]; ablauf(o) → Zeilen; o = { d (Minuten), kurz, phase, css_s }.
  const wdh = (n, teil, zwischen) => { const out = []; for (let i = 0; i < n; i++) { out.push(...teil); if (zwischen && i < n - 1) out.push(...zwischen); } return out; };
  const mitAus = (seq, ziel) => { const s = seq.reduce((a, x) => a + x[1], 0); return seq.concat([["z1", Math.max(5, ziel - s)]]); };
  const B = (V64.BAUSTEINE = {
    rad_locker: { sport: "rad", titel: "Grundlage", art: "locker", wissen: "zonen", quellen: ["seiler2010"],
      zweck: "Viel Zeit bei tiefer Belastung baut die aerobe Grundlage auf und ist gut erholbar – die Basis jedes Modells.",
      teile: (o) => [["z1", 10], ["z2", o.d - 10]], ablauf: (o) => [`10 min einrollen, dann ${o.d - 10} min gleichmässig Z2`] },
    rad_lang: { sport: "rad", titel: "Lange Ausfahrt", art: "lang", wissen: "langdistanz", quellen: ["maunder2021", "jeukendrup2017"],
      zweck: "Ausdauer und Ermüdungsresistenz: Leistung auch nach Stunden halten. Verpflegung üben: ab der ersten Stunde regelmässig Kohlenhydrate (übliche Praxis; der Darm gewöhnt sich vermutlich daran).",
      teile: (o) => [["z1", 10], ["z2", o.d - 10]], ablauf: (o) => [`10 min einrollen, dann ${o.d - 10} min Z2`, "Puls im Auge behalten: steigt er bei gleicher Leistung stark, ist das Drift (Hitze, Trinken)"] },
    rad_lang_rt: { sport: "rad", titel: "Lange Ausfahrt mit Renntempo", art: "lang", wissen: "langdistanz", quellen: ["laursen2005", "maunder2021", "jeukendrup2017"],
      zweck: "Renntempo über lange Zeit halten und die Rennverpflegung bei diesem Tempo üben.",
      bloecke: (o) => { const L = o.phase === "Wettkampfspezifisch" ? 30 : 20; let n = o.d >= 240 ? 3 : o.d >= 150 ? 2 : 1;
        while (n > 1 && o.d - 25 - n * L - (n - 1) * 10 < 20) n--; return { n, L, vorne: Math.max(10, o.d - 25 - n * L - (n - 1) * 10) }; },
      teile(o) { const b = this.bloecke(o); return [["z1", 10], ["z2", b.vorne]].concat(wdh(b.n, [["renntempo", b.L]], [["z2", 10]]), [["z2", 15]]); },
      ablauf(o) { const b = this.bloecke(o); return [`10 min einrollen, ${b.vorne} min Z2`, `${b.n} × ${b.L} min Renntempo, ${b.n > 1 ? "10 min Z2 dazwischen" : "gleichmässig"}`, "15 min locker zum Schluss; Verpflegung wie im Rennen"]; } },
    rad_vo2: { sport: "rad", titel: "VO2max 30/15", art: "schluessel", wissen: "intervalle", quellen: ["roennestad2015", "roennestad2020", "buchheit2013a"],
      zweck: "Viel Zeit nahe der maximalen Sauerstoffaufnahme mit kurzen Pausen. Bei gut trainierten Radfahrern wirkten solche kurzen Intervalle stärker als lange Intervalle gleicher Anstrengung.",
      serien: (o) => (o.kurz ? 2 : 3),
      teile(o) { const n = this.serien(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, wdh(13, [["vo2", 0.5], ["pause", 0.25]]), [["z1", 3]])), n === 3 ? 60 : 50); },
      ablauf(o) { return ["15 min einfahren (Z1–Z2)", `${this.serien(o)} Serien à 13 × 30 s hart / 15 s locker, 3 min locker zwischen den Serien`, "hart = so stark, dass alle Wiederholungen gleich bleiben", "rund 10 min ausfahren"]; } },
    rad_schwelle: { sport: "rad", titel: "Schwelle 3 × 15 min", art: "schluessel", wissen: "modelle", quellen: ["stoeggl2015", "seiler2010", "stoeggl2014"],
      zweck: "Lange Zeit knapp unter LT2; Kern der pyramidalen Verteilung. Wie viel einzelne Schwellen-Einheiten bringen, ist wenig belegt – in einer neunwöchigen Studie verbesserte reines Schwellentraining die Leistung an der Schwelle nicht.",
      wdh: (o) => (o.kurz ? 2 : 3),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["z3o", 15]], [["z1", 5]])), n === 3 ? 80 : 60); },
      ablauf(o) { return ["15 min einfahren", `${this.wdh(o)} × 15 min knapp unter LT2, 5 min locker dazwischen`, "gleichmässig fahren, die letzte Wiederholung nicht schneller", "ausfahren"]; } },
    rad_laktat: { sport: "rad", titel: "Schwelle 5 × 8 min mit Laktat", art: "schluessel", wissen: "norwegisch", quellen: ["casado2023", "toennessen2024", "crotty2021"],
      zweck: "Viel Arbeit knapp unter der Schwelle bei überschaubarer Ermüdung, gesteuert mit Laktat statt nach Gefühl (norwegisches Modell).",
      wdh: (o) => (o.kurz ? 3 : 5),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["z3o", 8]], [["z1", 2]])), n === 5 ? 75 : 55); },
      ablauf(o) { return ["15 min einfahren", `${this.wdh(o)} × 8 min knapp unter LT2, 2 min locker dazwischen`,
        "Laktat nach der 2. und 4. Wiederholung: liegt der Wert über deinem Wert an der LT2 aus dem Stufentest, die nächste Wiederholung 5 W leichter (eigene Regel)", "ausfahren"]; } },
    rad_tempo: { sport: "rad", titel: "Tempo 2 × 20 min", art: "schluessel", wissen: "modelle", quellen: ["stoeggl2015", "seiler2010"],
      zweck: "Gleichmässig zwischen LT1 und LT2, nahe am Tempo langer Rennen; belastet die Erholung der Woche weniger als harte Intervalle (Begründung, keine Studie).",
      wdh: (o) => (o.kurz ? 1 : 2),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["z3", 20]], [["z1", 5]])), n === 2 ? 75 : 50); },
      ablauf(o) { return ["15 min einfahren", `${this.wdh(o)} × 20 min Z3 (Tempo)${this.wdh(o) > 1 ? ", 5 min locker dazwischen" : ""}`, "Aero-Position üben, wenn möglich", "ausfahren"]; } },
    lauf_locker: { sport: "lauf", titel: "Lauf locker", art: "locker", wissen: "zonen", quellen: ["seiler2010"],
      zweck: "Grundlage bei tiefer Belastung, gut erholbar; hier zählt die Regelmässigkeit, nicht das Tempo.",
      teile: (o) => [["z1", 5], ["z2", o.d - 5]], ablauf: (o) => [`${o.d} min locker, erste 5 min sehr ruhig`] },
    lauf_lang: { sport: "lauf", titel: "Langer Lauf", art: "lang", wissen: "langdistanz", quellen: ["maunder2021"],
      zweck: "Ausdauer und Ermüdungsresistenz für den Marathon am Schluss des Rennens.",
      teile: (o) => [["z1", 5], ["z2", o.d - 5]], ablauf: (o) => [`${o.d} min gleichmässig Z2`, "ab 75 min trinken und etwas essen (üben)"] },
    lauf_lang_rt: { sport: "lauf", titel: "Langer Lauf, Schluss im Renntempo", art: "lang", wissen: "langdistanz", quellen: ["laursen2005", "maunder2021"],
      zweck: "Renntempo im ermüdeten Zustand laufen – so wie im Rennen nach dem Rad.",
      L: (o) => (o.phase === "Wettkampfspezifisch" ? 20 : 15),
      teile(o) { const L = Math.min(this.L(o), Math.max(0, o.d - 25)); return [["z1", 5], ["z2", o.d - 5 - L], ["renntempo", L]]; },
      ablauf(o) { const L = Math.min(this.L(o), Math.max(0, o.d - 25)); return [`${o.d - L} min Z2`, `letzte ${L} min Renntempo`]; } },
    lauf_vo2: { sport: "lauf", titel: "VO2max 4 × 4 min", art: "schluessel", wissen: "intervalle", quellen: ["helgerud2007", "buchheit2013a"],
      zweck: "Hebt die maximale Sauerstoffaufnahme: 4 × 4 min bei 90–95 % der maximalen Herzfrequenz mit 3 min Trab steigerten sie in einer Studie mit mässig trainierten jungen Männern um 7,2 %.",
      wdh: (o) => (o.kurz ? 2 : 4),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["vo2", 4]], [["z1", 3]])), n === 4 ? 50 : 35); },
      ablauf(o) { return ["15 min einlaufen", `${this.wdh(o)} × 4 min hart, 3 min Trab dazwischen`, "hart = kontrolliert, die letzte Wiederholung gleich schnell wie die erste", "auslaufen"]; } },
    lauf_tempo: { sport: "lauf", titel: "Tempo 3 × 10 min", art: "schluessel", wissen: "modelle", quellen: ["stoeggl2015", "seiler2010"],
      zweck: "Gleichmässig zwischen LT1 und LT2: zügiges Laufen üben, ohne tief in die Ermüdung zu gehen (Begründung, keine Studie).",
      wdh: (o) => (o.kurz ? 2 : 3),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["z3", 10]], [["z1", 2]])), n === 3 ? 60 : 45); },
      ablauf(o) { return ["15 min einlaufen", `${this.wdh(o)} × 10 min Z3, 2 min Trab dazwischen`, "auslaufen"]; } },
    lauf_laktat: { sport: "lauf", titel: "Schwelle 6 × 5 min mit Laktat", art: "schluessel", wissen: "norwegisch", quellen: ["casado2023", "toennessen2024", "crotty2021"],
      zweck: "Viele kurze Abschnitte knapp unter LT2, mit Laktat kontrolliert: viel Schwellenzeit bei wenig Ermüdung.",
      wdh: (o) => (o.kurz ? 4 : 6),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["z3o", 5]], [["z1", 1]])), n === 6 ? 60 : 50); },
      ablauf(o) { return ["15 min einlaufen", `${this.wdh(o)} × 5 min knapp unter LT2, 1 min Pause`,
        "Laktat nach der 2. und 4. Wiederholung: liegt der Wert über deinem Wert an der LT2, die nächste etwas langsamer (eigene Regel)", "auslaufen"]; } },
    lauf_koppel: { sport: "lauf", titel: "Koppellauf", art: "koppel", wissen: "langdistanz", quellen: ["millet2000"],
      zweck: "Direkt nach dem Rad laufen: das Tempo finden, solange Atmung und Puls vom Rad noch erhöht sind.",
      teile: (o) => [["renntempo", Math.min(10, o.d)], ["z2", Math.max(0, o.d - 10)]], ablauf: (o) => [`direkt nach dem Rad ${o.d} min`, "erste 10 min Renntempo, dann locker"] },
    schwimm_kurs: { sport: "schwimm", titel: "Schwimmkurs", art: "kurs", wissen: "schwimmen", quellen: [],
      zweck: "Technik – im Schwimmen für viele der grösste Hebel (übliche Erfahrung, keine Studie). Inhalt bestimmt der Kurs.", teile: (o) => [["z2", o.d]], ablauf: () => ["Inhalt laut Kurs"] },
    schwimm_css: { sport: "schwimm", titel: "CSS-Wiederholungen", art: "schluessel_s", wissen: "schwimmen", quellen: ["wakayoshi1992", "dekerle2005"],
      zweck: "Wiederholungen im CSS-Tempo: knapp über der Dauerleistungsgrenze, mit kurzen Pausen.",
      n: (o) => (isNum(o.css_s) ? clamp(Math.round((o.d - 20) / ((o.css_s + 15) / 60)), 6, 16) : null),
      teile(o) { const n = this.n(o) || 10, w = isNum(o.css_s) ? (o.css_s + 15) / 60 : 2; return mitAus([["z2", 10]].concat(wdh(n, [["css", w]])), o.d); },
      ablauf(o) { const n = this.n(o); return ["10 min einschwimmen", n ? `${n} × 100 m in ${mmss(o.css_s)} (dein CSS), 15 s Pause` : "8–12 × 100 m zügig, 15 s Pause (noch kein CSS-Test: Tempo nach Gefühl)", "Rest locker, 200 m ausschwimmen"]; } },
    schwimm_locker: { sport: "schwimm", titel: "Schwimmen locker", art: "locker", wissen: "schwimmen", quellen: ["dekerle2005"],
      zweck: "Lange Wiederholungen ruhig und sauber: Grundlage und Technik unter leichter Ermüdung.",
      teile: (o) => [["z2", o.d]], ablauf: (o) => ["lange Wiederholungen (300–400 m), 20–30 s Pause", isNum(o.css_s) ? `Tempo deutlich langsamer als CSS, etwa ${mmss(o.css_s + 8)}–${mmss(o.css_s + 12)}/100 m (CSS + 8–12 s, Annahme)` : "Tempo locker, nach Gefühl"] },
    test_rad: { sport: "rad", titel: "Rad-Stufentest", art: "test", fix: 75, wissen: "laktat-messen", quellen: ["jamnick2018", "bentley2007"],
      zweck: "LT1 und LT2 neu bestimmen und die Zonen nachführen.", teile: (o) => [["test", o.d]],
      ablauf: () => ["Ablauf laut Protokoll im Testzentrum: Laktat in der letzten Minute jeder Stufe", "am Vortag locker, gleiche Mahlzeit wie beim letzten Test"] },
    test_lauf: { sport: "lauf", titel: "Lauf-Stufentest", art: "test", fix: 60, wissen: "laktat-messen", quellen: ["jamnick2018", "bentley2007"],
      zweck: "LT1 und LT2 im Laufen neu bestimmen.", teile: (o) => [["test", o.d]],
      ablauf: () => ["Ablauf laut Protokoll im Testzentrum: Laktat am Ende jeder Stufe", "am Vortag locker"] },
    test_css: { sport: "schwimm", titel: "CSS-Test", art: "test", fix: 45, wissen: "schwimmen", quellen: ["wakayoshi1992", "dekerle2005"],
      zweck: "Schwimm-Massstab nachführen: CSS = (Zeit 400 m − Zeit 200 m) ÷ 2 pro 100 m.", teile: (o) => [["test", o.d]],
      ablauf: () => ["15 min einschwimmen", "400 m maximal, danach 10 min locker", "200 m maximal", "ausschwimmen; beide Zeiten auf der Seite eintragen"] },
    aktivierung: { sport: "rad", titel: "Aktivierung", art: "aktivierung", fix: 30, wissen: "taper", quellen: [],
      zweck: "Am Vortag kurz wach machen, nicht ermüden (übliche Praxis, keine Studie).", teile: () => [["z1", 10], ["z2", 8], ["z3", 1], ["z1", 2], ["z3", 1], ["z1", 2], ["z3", 1], ["z1", 5]],
      ablauf: () => ["30 min locker mit 3 × 1 min zügig", "Material und Verpflegung bereitlegen"] },
  });

  /* ---------------- Intensität je Sportart (intensitaet-1.1) ---------------- */
  /** Stufen: «locker» (nur unter LT1, Renntempo zählt als locker), «schwelle» (bis knapp unter LT2, CSS), «alles» (auch VO2max).
   *  Standard: überall «alles» = Vorschlag wie im Modell. Tests (Messung) und die Aktivierung vor dem Rennen gelten nicht als Training. */
  V64.STUFEN = ["locker", "schwelle", "alles"];
  V64.STUFE_TEXT = { locker: "nur locker", schwelle: "bis Schwelle", alles: "alles" };
  const RANG = (V64.RANG = { locker: 0, schwelle: 1, alles: 2 });
  V64.INTENSITAET_STANDARD = { schwimm: "alles", rad: "alles", lauf: "alles" };
  V64.STUFE_BAUSTEIN = { rad_vo2: "alles", lauf_vo2: "alles", rad_schwelle: "schwelle", rad_laktat: "schwelle", rad_tempo: "schwelle",
    lauf_tempo: "schwelle", lauf_laktat: "schwelle", schwimm_css: "schwelle" };
  /** Ersatz derselben Sportart, wenn ein Baustein über der gewählten Stufe liegt. */
  V64.ERSATZ = { rad_vo2: { schwelle: "rad_schwelle", locker: "rad_locker" }, lauf_vo2: { schwelle: "lauf_tempo", locker: "lauf_locker" },
    rad_schwelle: { locker: "rad_locker" }, rad_laktat: { locker: "rad_locker" }, rad_tempo: { locker: "rad_locker" },
    lauf_tempo: { locker: "lauf_locker" }, lauf_laktat: { locker: "lauf_locker" }, schwimm_css: { locker: "schwimm_locker" } };
  /** Gespeicherte Wahl (Eintrag «modell») → { schwimm, rad, lauf }; fehlend oder unbekannt = «alles». */
  V64.intensitaet = function (eintrag) {
    const x = (eintrag && eintrag.intensitaet) || {}, out = {};
    for (const sp of ["schwimm", "rad", "lauf"]) out[sp] = V64.STUFEN.includes(x[sp]) ? x[sp] : "alles";
    return out;
  };
  /** Baustein-ID unter der Grenze «stufe» (unverändert, wenn erlaubt). */
  V64.kappen = function (id, stufe) {
    const s = V64.STUFE_BAUSTEIN[id] || "locker", g = RANG[stufe] != null ? RANG[stufe] : 2;
    if (RANG[s] <= g) return id;
    const E = V64.ERSATZ[id] || {};
    return E[stufe] || E.locker || id;
  };
  /** Höchste Intensität einer geplanten Einheit (Enduco): aus den Zielen der Schritte (Balkenprofil); ohne Ziele aus dem Titel
   *  (VO2max, anaerob, Sprint, Neuro → «alles»; Schwelle, Tempo, Sweet Spot, CSS, Über-Unter → «schwelle»; Fatmax, Grundlage, locker,
   *  Regeneration → «locker»; das stärkste Wort zählt). → { stufe, quelle } oder null (nicht beurteilbar). */
  V64.planStufe = function (balken, text) {
    let best = null;
    for (const b of balken || []) {
      const k = V64.DREI[b && b.key], st = k === "hart" ? "alles" : k === "mittel" ? "schwelle" : k === "locker" ? "locker" : null;
      if (st && (best == null || RANG[st] > RANG[best])) best = st;
    }
    if (best) return { stufe: best, quelle: "ziele" };
    const t = String(text || "");
    if (/vo\s*2|vo₂|anaerob|sprint|neuro/i.test(t)) return { stufe: "alles", quelle: "titel" };
    if (/schwelle|threshold|sweet\s*spot|tempo|\bcss\b|über[- ]?unter/i.test(t)) return { stufe: "schwelle", quelle: "titel" };
    if (/fat\s*max|grundlage|locker|regeneration|erholung|recovery|\beasy\b/i.test(t)) return { stufe: "locker", quelle: "titel" };
    return null;
  };

  /** Einheit aus einem Baustein. o: { d, kurz, phase, css_s }. → { id, sport, titel, dauer, teile, minuten {locker, mittel, hart}, … } */
  V64.einheit = function (id, o) {
    const b = B[id]; if (!b) return null;
    const oo = Object.assign({}, o || {}); if (b.fix && !isNum(oo.d)) oo.d = b.fix;
    let teile = b.teile.call(b, oo).filter((t) => t[1] > 0);
    const dauer = teile.reduce((s, t) => s + t[1], 0);
    const minuten = { locker: 0, mittel: 0, hart: 0 };
    if (b.sport === "rad" || b.sport === "lauf") for (const [k, m] of teile) { const z = V64.DREI[k]; if (z) minuten[z] += m; }
    return { id, sport: b.sport, titel: b.titel, art: b.art, dauer: Math.round(dauer), teile, minuten, ablauf: b.ablauf.call(b, oo), zweck: b.zweck,
      quellen: b.quellen.slice(), wissen: b.wissen, kurz: !!oo.kurz, schluessel: b.art === "schluessel" };
  };

  /* ---------------- Ziele aus dem aktiven Zonenprofil ---------------- */
  const zone = (L, nr) => (Array.isArray(L) ? L.find((z) => z && z.z === "Z" + nr) || null : null);
  const W5 = (x) => Math.round(x / 5) * 5;
  /** Zieltext für einen Abschnitt; skalen = TR.zonen(D.zonen).skalen. Ohne passende Skala: null (nie geraten). */
  V64.ziel = function (key, sport, skalen, css_s) {
    const S = skalen || {};
    if (sport === "schwimm") {
      if (key === "css") return isNum(css_s) ? `${mmss(css_s)}/100 m (CSS)` : null;
      if (key === "z2") return isNum(css_s) ? `${mmss(css_s + 8)}–${mmss(css_s + 12)}/100 m (CSS + 8–12 s, Annahme)` : null;
      return null;
    }
    const sk = sport === "rad" ? S.rad_w : sport === "lauf" ? S.lauf_pace : null, hf = sport === "rad" ? S.rad_hf : sport === "lauf" ? S.lauf_hf : null;
    const z2 = zone(sk, 2), z3 = zone(sk, 3), z5 = zone(sk, 5), h2 = zone(hf, 2), h3 = zone(hf, 3), h5 = zone(hf, 5);
    const ok = (z) => z && isNum(z.von) && isNum(z.bis);
    const wert = (x) => (sport === "rad" ? `${Math.round(x)} W` : `${mmss(x)}/km`);
    const band = (a, b) => (sport === "rad" ? `${Math.round(a)}–${Math.round(b)} W` : `${mmss(a)}–${mmss(b)}/km`);
    const puls = (t) => (t ? ` · Puls ${t}` : "");
    switch (key) {
      case "z1": return z2 && isNum(z2.von) ? `${sport === "rad" ? "unter" : "langsamer als"} ${wert(z2.von)}${puls(h2 && isNum(h2.von) ? `unter ${h2.von}` : null)}` : null;   // B23: Pace «langsamer als»
      case "z2": return ok(z2) ? band(z2.von, z2.bis) + puls(ok(h2) ? `${h2.von}–${h2.bis}` : null) : null;
      case "renntempo": {
        if (!z3 || !isNum(z3.von)) return null;
        const lt1 = z3.von, a = sport === "rad" ? W5(0.95 * lt1) : lt1 * 1.03;      // Rad 95–100 % der Leistung an LT1, Laufen bis 3 % langsamer
        return `${band(a, lt1)} (LT1 ${wert(lt1)})${puls(h3 && isNum(h3.von) ? `bis ${h3.von}` : null)}`;
      }
      case "z3": return ok(z3) ? band(z3.von, z3.bis) + puls(ok(h3) ? `${h3.von}–${h3.bis}` : null) : null;
      case "z3o": {
        if (!ok(z3)) return null;
        const a = z3.von + (2 / 3) * (z3.bis - z3.von);
        return `${band(sport === "rad" ? W5(a) : a, z3.bis)}, nicht über LT2 (${wert(z3.bis)})`;
      }
      case "vo2": return z5 && isNum(z5.von) ? `${sport === "rad" ? "über" : "schneller als"} ${wert(z5.von)}${puls(h5 && isNum(h5.von) ? `über ${h5.von} (steigt verzögert)` : null)}` : null;
      default: return null;
    }
  };
  /** Ziele einer Einheit: je Abschnittsart einmal (ohne Pausen und Tests). */
  V64.ziele = function (e, skalen, css_s) {
    const seen = [], out = [];
    for (const [k] of e.teile) if (!seen.includes(k) && k !== "pause" && k !== "test") { seen.push(k); out.push({ key: k, name: V64.ZNAME[k] || k, text: V64.ziel(k, e.sport, skalen, css_s) }); }
    return out;
  };

  /* ---------------- Wochenvorschlag (wochenplan-1.2) ---------------- */
  /** Längste Einheit je Phase (Minuten). Erholungswoche: 70 %. Taper und Woche mit B-Rennen wie Taper. */
  V64.LANG = { Grundlage: { rad: 210, lauf: 90 }, Aufbau: { rad: 270, lauf: 110 }, Wettkampfspezifisch: { rad: 330, lauf: 135 }, Taper: { rad: 150, lauf: 70 } };
  const langFuer = (phase, erh) => {
    const L = V64.LANG[phase] || (String(phase).startsWith("B-Rennen") ? V64.LANG.Taper : V64.LANG.Grundlage);
    return erh ? { rad: r15(L.rad * 0.7), lauf: r5(L.lauf * 0.7) } : L;
  };
  /** Anzahl Einheiten je Sportart nach Wochenstunden. */
  V64.anzahl = (H) => ({ schwimm: H < 7 ? 1 : H < 10 ? 2 : 3, rad: H < 7 ? 2 : 3, lauf: H < 7 ? 2 : 3 });
  const TAG = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  /** ctx: { woche (Montag), phase, erholung, stunden, modell (schon aufgelöst), tests [{date, kind, sport}], rennen [{date, name, short, prio}],
   *  css_s, aufteilung, intensitaet {schwimm, rad, lauf}, laeufe (V64.laeufe der absolvierten Läufe), heute, skalen (für aufbau-1.1) }. → { v, woche, modell, phase, erholung, stunden, tage [{date, wt, ruhetag, notiz, einheiten}], minuten, tid, pruefung, hinweise } */
  V64.woche = function (ctx) {
    const c = ctx || {}, woche = montag(c.woche), M = V64.MODELLE[c.modell] && !V64.MODELLE[c.modell].teile ? V64.MODELLE[c.modell] : V64.MODELLE.polarisiert;
    const modell = Object.keys(V64.MODELLE).find((k) => V64.MODELLE[k] === M);
    const H = isNum(c.stunden) && c.stunden > 0 ? c.stunden : 8, phase = c.phase || "Grundlage", erh = !!c.erholung;
    const taper = phase === "Taper" || String(phase).startsWith("B-Rennen");
    const A = c.aufteilung || V64.AUFTEILUNG, N = V64.anzahl(H), LANG = langFuer(phase, erh), hinweise = [];
    const min = { schwimm: H * 60 * A.schwimm, rad: H * 60 * A.rad, lauf: H * 60 * A.lauf };
    const o = (d, extra) => Object.assign({ d, phase, css_s: c.css_s, kurz: taper || erh }, extra || {});
    const tage = TAG.map((wt, i) => ({ date: add(woche, i), wt, ruhetag: false, notiz: null, einheiten: [] }));
    const R = (c.rennen || []).filter((r) => r && r.date >= woche && r.date <= add(woche, 6)).sort((a, b) => a.date.localeCompare(b.date));
    const wenig = (t) => { if (!R.length) hinweise.push(t); };
    const tag = (wt) => tage[TAG.indexOf(wt)];
    // intensitaet-1.1: Schlüsseleinheit über der gewählten Stufe → nächst leichtere derselben Sportart (gleiche Dauer, wenn locker)
    const I = Object.assign({}, V64.INTENSITAET_STANDARD, c.intensitaet || {}), gekappt = [];
    const gewaehlt = (sport, id, d) => {
      const neu = V64.kappen(id, I[sport]);
      if (neu === id) return V64.einheit(id, o(d));
      const alt = V64.einheit(id, o(d)), e = V64.einheit(neu, o(B[neu].art === "locker" ? alt.dauer : d));
      e.gekappt = alt.titel; gekappt.push({ sport, alt: alt.titel, neu: e.titel, stufe: I[sport] });
      return e;
    };
    // aufbau-1.1: kein Lauf über der Grenze (10 % über dem längsten Lauf der 30 Tage davor); Distanz aus dem Zonenprofil geschätzt.
    // 1.1 (Audit V6.4 B8/B12): ohne Lauf in den 30 Tagen davor (Pause) langer und lockerer Lauf höchstens V64.PAUSE_MIN min locker
    // (eigene Festlegung); nach dem Kürzen mit der Schätzung nachgeprüft (feste schnellere Teile), sonst ausdrücklich gemeldet.
    let aufbauGekappt = false;
    const kmT = (x) => x.toFixed(1).replace(".", ","), wtag = (datum) => TAG[(new Date(T(datum)).getUTCDay() + 6) % 7];
    const pauseVor = (datum) => !!(c.laeufe && c.laeufe.length && !V64.laufGrenze(c.laeufe, datum, c.heute));
    const laufMax = (datum, id, d) => {
      if (!(d > 0) || !c.laeufe || !c.laeufe.length) return d;
      const g = V64.laufGrenze(c.laeufe, datum, c.heute);
      if (!g) {
        if (d <= V64.PAUSE_MIN) return d;
        aufbauGekappt = true;
        hinweise.push(`${B[id].titel} am ${wtag(datum)}: ${V64.PAUSE_MIN} statt ${d} min locker – kein Lauf in den 30 Tagen davor, darum kurz und locker wieder beginnen (eigene Festlegung)`);
        return V64.PAUSE_MIN;
      }
      const kmVon = (m) => V64.kmSchaetzung(V64.einheit(id, o(m)), c.skalen), km = kmVon(d);
      if (!isNum(km) || km <= g.km) return d;
      let m = Math.max(20, Math.floor((d * g.km) / km / 5) * 5);
      while (m > 20 && kmVon(m) > g.km) m -= 5;
      const kmM = kmVon(m);
      aufbauGekappt = true;
      hinweise.push(kmM > g.km
        ? `${B[id].titel} am ${wtag(datum)}: auch mit ${m} min (≈ ${kmT(kmM)} km) über deiner Aufbau-Grenze von ${kmT(g.km)} km – kürzer laufen oder auslassen`
        : `${B[id].titel} am ${wtag(datum)}: ${m} statt ${d} min (≈ ${kmT(km)} km wären über deiner Aufbau-Grenze von ${kmT(g.km)} km)`);
      return m;
    };

    // Rad: Schlüssel (Do), lang (Sa), locker (Mi bei 3 Einheiten)
    const radK = gewaehlt("rad", M.schluessel.rad, null);
    let radL = N.rad === 3 ? clamp(r5(0.25 * min.rad), 45, 90) : 0;
    let radLang = min.rad - radK.dauer - radL;
    if (radLang < 60) { radLang = Math.max(45, r5(min.rad - radK.dauer)); if (radL) wenig("Wenig Rad-Stunden: keine lockere Ausfahrt unter der Woche"); radL = 0; }
    radLang = r15(Math.min(radLang, LANG.rad));
    let rest = min.rad - radK.dauer - radL - radLang;
    if (rest >= 15 && radL) { const plus = Math.min(rest, 120 - radL); radL = r5(radL + plus); rest -= plus; }
    if (rest >= 15) wenig(`Rad: ${r5(rest)} min nicht verteilt (längste Ausfahrt in dieser Phase höchstens ${LANG.rad} min)`);
    // Laufen: Schlüssel (Di; Erholungswoche: locker), lang (So), locker (Fr), Koppel (Sa, rennspezifisch, nicht in Erholungswochen)
    const laufK = erh ? V64.einheit("lauf_locker", o(Math.min(45, Math.max(30, r5(0.3 * min.lauf))))) : gewaehlt("lauf", M.schluessel.lauf, null);
    const koppel = M.koppel && !erh ? (taper ? 15 : phase === "Wettkampfspezifisch" ? 30 : 20) : 0;
    let laufL = N.lauf === 3 ? clamp(r5(0.25 * min.lauf), 30, 60) : 0;
    let laufLang = min.lauf - laufK.dauer - laufL - koppel;
    if (laufLang < 40) { laufLang = Math.max(30, r5(min.lauf - laufK.dauer - koppel)); if (laufL) wenig("Wenig Lauf-Stunden: kein lockerer Lauf unter der Woche"); laufL = 0; }
    laufLang = r5(Math.min(laufLang, LANG.lauf));
    const langId = M.renntempo && !erh ? "lauf_lang_rt" : "lauf_lang";
    laufLang = laufMax(add(woche, 6), langId, laufLang);
    let restL = min.lauf - laufK.dauer - laufL - koppel - laufLang;
    if (restL >= 10 && laufL) { const plus = Math.min(restL, 75 - laufL); laufL = r5(laufL + plus); }
    if (laufL) laufL = laufMax(add(woche, 4), "lauf_locker", laufL);
    restL = min.lauf - laufK.dauer - laufL - koppel - laufLang;
    if (restL >= 10) wenig(`Laufen: ${r5(restL)} min nicht verteilt (längster Lauf in dieser Phase höchstens ${LANG.lauf} min${aufbauGekappt ? "; Aufbau-Grenze" : ""})`);
    // Schwimmen: Kurs (Di), CSS (Do), locker (So)
    const sw = clamp(r5(min.schwimm / N.schwimm), 30, 75);

    tag("Mo").ruhetag = true;
    tag("Di").einheiten.push(laufK, V64.einheit("schwimm_kurs", o(sw)));
    if (radL) tag("Mi").einheiten.push(V64.einheit("rad_locker", o(radL)));
    tag("Do").einheiten.push(radK);
    if (N.schwimm >= 2) tag("Do").einheiten.push(erh ? V64.einheit("schwimm_locker", o(sw)) : gewaehlt("schwimm", "schwimm_css", sw));   // B14: Erholung = eine Schlüsseleinheit
    if (laufL) tag("Fr").einheiten.push(V64.einheit("lauf_locker", o(laufL)));
    tag("Sa").einheiten.push(V64.einheit(M.renntempo && !erh ? "rad_lang_rt" : "rad_lang", o(radLang)));
    if (koppel) tag("Sa").einheiten.push(V64.einheit("lauf_koppel", o(koppel)));
    tag("So").einheiten.push(V64.einheit(pauseVor(add(woche, 6)) ? "lauf_locker" : langId, o(laufLang)));
    if (N.schwimm >= 3) tag("So").einheiten.push(V64.einheit("schwimm_locker", o(sw)));
    if (erh) hinweise.push("Erholungswoche: nur eine Schlüsseleinheit (Rad, gekürzt); Laufen und Schwimmen locker");
    const SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
    for (const g of gekappt) hinweise.push(`${SPW[g.sport]}: «${g.neu}» statt «${g.alt}» (Intensität je Sportart: ${V64.STUFE_TEXT[g.stufe]})`);
    if (gekappt.some((g) => g.sport !== "schwimm")) hinweise.push("Was du begrenzt, wird nicht auf eine andere Sportart verschoben.");
    if (taper && !erh) hinweise.push("Taper: Intensität bleibt, Schlüsseleinheiten mit einem Drittel bis der Hälfte weniger Wiederholungen");

    // Rennen dieser Woche: Rennwoche (2 Tage vorher frei, Vortag Aktivierung, Renntag, danach frei)
    if (R.length) {
      const r = R[0];
      for (const t of tage) {
        if (t.date > r.date) { t.einheiten = []; t.ruhetag = true; t.notiz = "nach dem Rennen: frei oder ganz locker nach Gefühl"; }
        else if (t.date === r.date) { t.einheiten = []; t.ruhetag = false; t.rennen = { name: r.name, short: r.short || r.name, prio: r.prio || null }; }
        else if (t.date === add(r.date, -1)) { t.einheiten = [V64.einheit("aktivierung", o(null))]; t.ruhetag = false; }
        else if (t.date === add(r.date, -2)) { t.einheiten = []; t.ruhetag = true; t.notiz = "Ruhetag vor dem Rennen"; }
        else t.einheiten = t.einheiten.map((e) => (e.art === "lang" ? V64.einheit(e.sport === "rad" ? "rad_locker" : "lauf_locker", o(Math.min(e.dauer, e.sport === "rad" ? 90 : 45))) : e));
      }
      hinweise.push(`Rennwoche (${r.short || r.name}): zwei Tage vorher frei, am Vortag kurze Aktivierung, lange Einheiten entfallen`);
    }

    // Tests dieser Woche (eingetragen oder vorgeschlagen, noch nicht erledigt): ersetzen die Einheit derselben Sportart; Kurzcheck in einer Rad-Einheit
    const tests = (c.tests || []).filter((t) => t && t.date >= woche && t.date <= add(woche, 6) && !t.done).sort((a, b) => a.date.localeCompare(b.date));
    for (const t of tests) {
      const tg = tage.find((x) => x.date === t.date); if (!tg || tg.rennen) continue;
      if (t.kind === "check") {
        const nah = tage.filter((x) => Math.abs((T(x.date) - T(t.date)) / 864e5) <= 2).sort((a, b) => Math.abs(T(a.date) - T(t.date)) - Math.abs(T(b.date) - T(t.date)));
        const e = nah.map((x) => x.einheiten.find((y) => y.sport === "rad" && !y.schluessel && y.art !== "test" && y.art !== "aktivierung")).find(Boolean);
        if (e) { e.check = t.date; e.ablauf = e.ablauf.concat(["Laktat-Kurzcheck: 10 min gleichmässig bei deiner Check-Leistung, Laktat am Ende des Blocks"]); }
        else hinweise.push(`Laktat-Kurzcheck am ${t.date.slice(8)}.${t.date.slice(5, 7)}.: keine lockere Rad-Einheit in der Nähe – selbst einplanen`);
        continue;
      }
      // B6: Sportart auch ohne Feld sport (V62.testSporten); ein gemeinsamer Rad- und Lauf-Stufentest setzt beide Tests ein
      const sporten = t.kind === "css" ? ["schwimm"] : V62 ? V62.testSporten(t).filter((x) => x === "rad" || x === "lauf") : [t.sport === "lauf" ? "lauf" : "rad"];
      for (const sport of sporten.length ? sporten : ["rad"]) {
        const neu = V64.einheit(t.kind === "css" ? "test_css" : sport === "lauf" ? "test_lauf" : "test_rad", o(null));
        neu.test = t.kind; neu.testStatus = t.status || null; if (t.erledigt) neu.erledigt = true;
        const i = tg.einheiten.findIndex((e) => e.sport === sport);
        if (i >= 0) { neu.ersetzt = tg.einheiten[i].titel; if (tg.einheiten[i].schluessel) hinweise.push(`${neu.titel}: ersetzt die Schlüsseleinheit «${tg.einheiten[i].titel}»`); tg.einheiten[i] = neu; }
        else { tg.einheiten.push(neu); tg.ruhetag = false; }
        if (t.kind === "stufentest") for (const x of tage) {                     // ausgeruht zum Stufentest: Schlüsseleinheit derselben Sportart in den 3 Tagen davor locker
          if (x.date >= t.date || x.date < add(t.date, -3)) continue;
          x.einheiten = x.einheiten.map((e) => { if (e.sport !== sport || !e.schluessel) return e;
            hinweise.push(`${e.titel} locker statt hart: ${neu.titel} folgt am ${TAG[(new Date(T(t.date)).getUTCDay() + 6) % 7]}`);
            const l = V64.einheit(sport === "rad" ? "rad_locker" : "lauf_locker", o(Math.max(30, Math.min(e.dauer, sport === "rad" ? 60 : 40)))); l.vorTest = true; return l; });
        }
      }
    }

    if (c.laeufe) for (const t of tage) for (const e of t.einheiten) {         // aufbau-1.1: übrige Läufe nur melden (Aufbau ist nicht änderbar)
      if (e.sport !== "lauf" || e.art === "test" || e.art === "lang" || (e.art === "locker" && (t.wt === "Fr" || t.wt === "So"))) continue;
      if (pauseVor(t.date) && e.art === "schluessel") { hinweise.push(`${e.titel} am ${t.wt}: kein Lauf in den 30 Tagen davor – harte Läufe erst nach ein paar lockeren`); continue; }
      const g = V64.laufGrenze(c.laeufe, t.date, c.heute), km = g ? V64.kmSchaetzung(e, c.skalen) : null;
      if (g && isNum(km) && km > g.km) hinweise.push(`${e.titel} am ${t.wt}: ≈ ${kmT(km)} km, über deiner Aufbau-Grenze von ${kmT(g.km)} km – kürzer laufen`);
    }
    const minuten = { schwimm: 0, rad: 0, lauf: 0 }, z = { locker: 0, mittel: 0, hart: 0 };
    for (const t of tage) for (const e of t.einheiten) {
      if (minuten[e.sport] != null) minuten[e.sport] += e.dauer;
      for (const k of ["locker", "mittel", "hart"]) z[k] += e.minuten[k];
    }
    minuten.total = minuten.schwimm + minuten.rad + minuten.lauf;
    if (minuten.total > H * 60 + 15) wenig(`Vorschlag ${hmin(minuten.total)} h statt ${hmin(H * 60)} h: die kürzesten sinnvollen Einheiten (Schlüssel, Rad 45 min, Laufen und Schwimmen 30 min) passen nicht in so wenig Zeit – eine lockere Einheit weglassen`);
    const tid = V64.tid(z), pruefung = V64.pruefen(modell, tid, { erholung: erh, taper, rennwoche: !!R.length, gekappt: gekappt.length > 0 });
    return { v: V64.VERSIONS.woche, woche, modell, modellName: M.name, phase, erholung: erh, taper, stunden: H, tage, minuten, zonen: z, tid, pruefung, hinweise,
      intensitaet: I, gekappt,
      regel: `${V64.VERSIONS.woche}: Mo frei · Di Laufen (Schlüssel) und Kurs · Mi Rad locker · Do Rad (Schlüssel) und Schwimmen · Fr Laufen locker · Sa lang Rad · So lang Laufen; ${V64.VERSIONS.aufteilung}: Schwimmen 20 %, Rad 50 %, Laufen 30 % (eigene Festlegung)` };
  };

  /* ---------------- Intensitätsverteilung (tid-1.0) ---------------- */
  /** z = { locker, mittel, hart } (Sekunden oder Minuten). Muster: «nur locker» (Mitte + hart < 2 %), «polarisiert» (locker > hart > mittel und
   *  Polarisierungsindex > 2,00 nach Treff 2019; ohne Mitte nicht berechenbar, gilt als polarisiert), «pyramidal» (locker ≥ mittel ≥ hart),
   *  «schwellenbetont» (Mitte am grössten), «hochintensiv» (hart am grössten), sonst «gemischt». */
  V64.tid = function (z) {
    const l = (z && z.locker) || 0, m = (z && z.mittel) || 0, h = (z && z.hart) || 0, s = l + m + h;
    if (!(s > 0)) return null;
    const p = [l / s, m / s, h / s];
    const pi = l > 0 && m > 0 && h > 0 ? Math.log10((p[0] / p[1]) * p[2] * 100) : null;
    let muster;
    if ((m + h) / s < 0.02) muster = "nur locker";
    else if (l >= m && l >= h) muster = h > m && (pi == null || pi > 2) ? "polarisiert" : m >= h ? "pyramidal" : "gemischt";
    else if (m >= h) muster = "schwellenbetont";
    else muster = "hochintensiv";
    return { v: V64.VERSIONS.tid, pct: p.map((x) => Math.round(x * 100)), anteil: p, pi: pi == null ? null : Math.round(pi * 100) / 100, muster, total: s };
  };
  /** Abgleich mit dem Modell. kontext: { erholung, taper } – dort ist «nur locker» in Ordnung; { rennwoche } – nicht beurteilt. */
  V64.pruefen = function (modellId, t, kontext) {
    const M = V64.MODELLE[modellId];
    if (!t) return { ok: null, probleme: [], text: "Keine Zeiten mit Zielbereichen – nicht beurteilbar." };
    if (!M || !M.erwartet) return { ok: null, probleme: [], text: "" };
    const E = M.erwartet, k = kontext || {}, pr = [];
    if (k.rennwoche) return { ok: null, probleme: [], text: "Rennwoche: wenige, kurze Einheiten – die Verteilung wird nicht beurteilt." };
    if (t.muster === "nur locker") {
      if (k.erholung || k.taper) return { ok: true, probleme: [], text: "Fast nur locker – passt zu einer Erholungs-, Taper- oder Rennwoche." };
      pr.push("fast nur locker: die Schlüsseleinheiten fehlen");
    } else if (!E.muster.includes(t.muster)) pr.push(`Muster ${t.muster} statt ${E.muster.join(" oder ")}`);
    if (t.pct[0] < E.locker_min) pr.push(`locker ${t.pct[0]} % (Modell: mindestens ${E.locker_min} %)`);
    if (isNum(E.hart_max) && t.pct[2] > E.hart_max) pr.push(`hart ${t.pct[2]} % (Modell: höchstens ${E.hart_max} %)`);
    if (pr.length && k.gekappt) return { ok: null, probleme: pr, text: `Anders als im Modell «${M.name}», weil du die Intensität je Sportart begrenzt hast: ${pr.join("; ")}.` };
    return { ok: !pr.length, probleme: pr, text: pr.length ? `Weicht vom Modell «${M.name}» ab: ${pr.join("; ")}.` : `Passt zum Modell «${M.name}» (${t.muster}).` };
  };
  /** Bereiche aus dem Balkenprofil einer geplanten Einheit (V6.profil: balken [{key, d (s)}]); ohne Ziel = offen. */
  V64.tidAusBalken = function (balken) {
    const z = { locker: 0, mittel: 0, hart: 0, offen: 0 };
    for (const b of balken || []) { if (!isNum(b.d)) continue; const k = V64.DREI[b.key]; if (k) z[k] += b.d; else z.offen += b.d; }
    return z;
  };

  /* ---------------- Aufbau-Check (aufbau-1.1) ---------------- */
  /** Frandsen et al. 2025: Lauf gegen den längsten Lauf der 30 Tage davor; bis 10 % = Referenz, darüber Sprung. Rate an Überlastungsverletzungen
   *  in der Studie (adjustierte Hazard-Rate-Ratio) je Klasse – Beobachtung, keine Vorhersage für einzelne Läufe. */
  V64.HRR = { klein: 1.64, mittel: 1.52, gross: 2.28 };
  V64.PAUSE_MIN = 30;                                                      // aufbau-1.1: nach einer Laufpause (kein Lauf in 30 Tagen) höchstens 30 min locker
  V64.KLASSE_TEXT = { ok: "bis 10 %", klein: "kleiner Sprung (10–30 %)", mittel: "mittlerer Sprung (30–100 %)", gross: "grosser Sprung (über 100 %)", ohne: "kein Lauf in den 30 Tagen davor" };
  V64.sprungKlasse = (r) => (r == null ? "ohne" : r <= 0.1 ? "ok" : r <= 0.3 ? "klein" : r <= 1 ? "mittel" : "gross");
  const km1 = (x) => Math.floor(x * 10 + 1e-9) / 10;                       // Grenze abgerundet auf 0,1 km
  /** Absolvierte Läufe (0,5–100 km wie in der Studie), nach Datum und Startzeit. */
  V64.laeufe = (acts) => (acts || []).filter((a) => a && a.sport === "lauf" && isNum(a.km) && a.km >= 0.5 && a.km <= 100 && /^\d{4}-\d{2}-\d{2}$/.test(a.date || ""))
    .map((a) => ({ date: a.date, start: a.start || "", km: a.km, min: (a.mv || a.dur || 0) / 60, name: a.name || "", id: a.id || null }))
    .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
  /** Grenze für einen Lauf am «datum»: 10 % über dem längsten absolvierten Lauf im Fenster [datum − 30, datum − 1] (nur Läufe bis «heute»). */
  V64.laufGrenze = function (laeufe, datum, heute) {
    const von = add(datum, -30), bis = heute && heute < datum ? heute : add(datum, -1);
    let ref = null;
    for (const r of laeufe || []) if (r.date >= von && r.date <= bis && (!ref || r.km >= ref.km)) ref = r;
    return ref ? { km: km1(ref.km * 1.1), ref } : null;
  };
  /** Geschätzte Distanz einer vorgeschlagenen Laufeinheit aus dem Zonenprofil (Pace je Abschnitt; Z1 und Trab mit dem langsamen Rand von Z2,
   *  also eher zu viel). Ohne Lauf-Pace-Zonen: null. */
  V64.kmSchaetzung = function (e, skalen) {
    if (!e || e.sport !== "lauf") return null;
    const sk = skalen && skalen.lauf_pace, z2 = zone(sk, 2), z3 = zone(sk, 3), z5 = zone(sk, 5);
    if (!z2 || !isNum(z2.von) || !isNum(z2.bis)) return null;
    const p2 = (z2.von + z2.bis) / 2, z3ok = z3 && isNum(z3.von) && isNum(z3.bis);
    const P = { z1: z2.von, pause: z2.von, z2: p2, renntempo: z3ok ? z3.von * 1.015 : null, z3: z3ok ? (z3.von + z3.bis) / 2 : null, z3o: z3ok ? z3.bis : null,
      vo2: z5 && isNum(z5.von) ? z5.von : null };
    let km = 0;
    for (const [k, m] of e.teile) { const p = P[k]; if (!isNum(p) || p <= 0) return null; km += (m * 60) / p; }
    return km;
  };
  /** Distanz eines geplanten Laufs (TR.workout): Distanzschritte plus Zeitschritte mit Pace-Ziel (Mitte). Offene Schritte → vollst false. */
  V64.planKm = function (wo) {
    if (!wo || !Array.isArray(wo.schritte) || !wo.schritte.length) return null;
    let m = 0, vollst = true, geschaetzt = false;
    for (const s of wo.schritte) {
      if (isNum(s.distanz_m)) { m += s.distanz_m; continue; }
      const z = s.ziel, p = isNum(s.mitte) ? s.mitte : z && z.art === "pace" && isNum(z.lo) && isNum(z.hi) ? (z.lo + z.hi) / 2 : null;
      if (isNum(s.dauer_s) && z && z.art === "pace" && isNum(p) && p > 0) { m += (s.dauer_s / p) * 1000; geschaetzt = true; } else vollst = false;
    }
    return { km: m / 1000, vollst, geschaetzt };
  };
  /** acts: alle Aktivitäten; heute: ISO. → { v, naechster, grenze {km, ref, bis}, danach {ab, km, ref}, laeufe30, spruenge, wochen } */
  V64.aufbau = function (acts, heute, opt) {
    const o = Object.assign({ wochen: 12 }, opt || {}), L = V64.laeufe(acts);
    for (let i = 0; i < L.length; i++) {                                     // jeder Lauf gegen den längsten der 30 Tage davor (frühere am selben Tag zählen)
      const r = L[i], von = add(r.date, -30); let ref = null;
      for (let j = i - 1; j >= 0 && L[j].date >= von; j--) if (!ref || L[j].km > ref.km) ref = L[j];
      r.ref = ref ? { date: ref.date, km: ref.km } : null; r.anteil = ref ? r.km / ref.km - 1 : null; r.klasse = V64.sprungKlasse(r.anteil);
    }
    const naechster = L.some((r) => r.date === heute) ? add(heute, 1) : heute;
    const g = V64.laufGrenze(L, naechster, heute);
    let danach = null;
    if (g) {
      let m = null; for (const r of L) if (r.date > g.ref.date && r.date <= heute && (!m || r.km >= m.km)) m = r;
      danach = { ab: add(g.ref.date, 31), km: m ? km1(m.km * 1.1) : null, ref: m };
    }
    const mo = montag(heute), von0 = add(mo, -7 * (o.wochen - 1)), wochen = [];
    for (let k = o.wochen - 1; k >= 0; k--) {
      const w = add(mo, -7 * k), e = add(w, 6), A = (acts || []).filter((a) => a && a.date >= w && a.date <= e);
      const la = A.filter((a) => a.sport === "lauf" && isNum(a.km)), sw = A.filter((a) => a.sport === "schwimm" && isNum(a.km)), ra = A.filter((a) => a.sport === "rad");
      const h = (a) => (a.mv || a.dur || 0) / 3600, sum = (X, f) => X.reduce((s, a) => s + f(a), 0), mx = (X, f) => X.reduce((s, a) => Math.max(s, f(a)), 0);
      wochen.push({ woche: w, laufend: w === mo, lauf_km: sum(la, (a) => a.km), lauf_n: la.length, lauf_max: mx(la, (a) => a.km),
        schwimm_m: Math.round(sum(sw, (a) => a.km) * 1000), schwimm_n: sw.length, schwimm_max_m: Math.round(mx(sw, (a) => a.km) * 1000),
        rad_h: sum(ra, h), rad_n: ra.length, rad_max_h: mx(ra, h) });
    }
    const spruenge = L.filter((r) => r.date >= von0 && r.date <= heute && ["klein", "mittel", "gross"].includes(r.klasse)).reverse()
      .map((r) => ({ date: r.date, km: r.km, ref: r.ref, anteil: r.anteil, klasse: r.klasse, name: r.name }));
    return { v: V64.VERSIONS.aufbau, heute, naechster, grenze: g ? { km: g.km, ref: g.ref, bis: add(g.ref.date, 30) } : null, danach,
      laeufe30: L.filter((r) => r.date >= add(naechster, -30) && r.date <= heute).length, spruenge, wochen, laeufe: L };
  };

  /** Stand, mit dem die Woche ab «mo» gerechnet wird (Audit V6.4 B7): vergangene Wochen wie am Montag – Läufe und Aufbau-Grenze bis zum Sonntag
   *  davor (heute = Sonntag), Tests der Woche auch wenn inzwischen erledigt (erledigt nur vermerkt), von Hand gesetzte Stunden nur, wenn sie vor
   *  dem Montag gespeichert wurden. Laufende und kommende Wochen: unverändert. */
  V64.stand = function (mo, heute, tests, lokal) {
    const vorbei = mo < montag(heute), bis = add(mo, 6);
    return { vorbei, heute: vorbei ? add(mo, -1) : heute,
      tests: (tests || []).filter((t) => t && t.date >= mo && t.date <= bis).map((t) => (vorbei && t.done ? Object.assign({}, t, { done: false, erledigt: true }) : t)),
      lokal: vorbei && !(lokal && lokal.geaendert && String(lokal.geaendert).slice(0, 10) < mo) ? {} : lokal || {} };
  };

  /* ---------------- Vergleich mit Enduco (vergleich-1.1) ---------------- */
  V64.SPORTARTEN = ["schwimm", "rad", "lauf"];
  const SPN = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  const hmin = (m) => { const x = Math.round(m); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };
  /** Stufe einer vorgeschlagenen Einheit (intensitaet-1.1): VO2max = «alles», Tempo/Schwelle/CSS = «schwelle», Test = «test», sonst «locker». */
  V64.stufeVon = (e) => (e && e.art === "test" ? "test" : (e && V64.STUFE_BAUSTEIN[e.id]) || "locker");
  /** Enduco-Einheiten aus den Workouts, die auf der Uhr liefen (FIT «workout», Feld wk der Aktivität) – nur dort, wo am selben Tag für dieselbe
   *  Sportart nichts im Garmin-Kalender stand. Dauer = geplante Zeit des Workouts (Strecken-Schritte mit der gelaufenen Zeit), Stufe aus dem
   *  Titel. Tests (Stufentest, Kurzcheck, Laktat) zählen nicht als Enduco. Nur ausgeführte Einheiten: ausgelassene fehlen. */
  /** vergleich-1.1 (Audit V6.4 B10/B11): ein Workout, das im Kalender an einem anderen Tag (±2) unter gleichem Titel stand und dort nicht lief,
   *  wurde nur verschoben – es zählt nicht doppelt. Dauer = geplante Zeit des Workouts; geht ein Schritt nach Strecke oder «bis Taste», ist sie
   *  unbekannt (null, «ohne Dauer») – nie die gelaufene Zeit als Plan. */
  V64.enducoAusUhr = function (acts, kalender) {
    const norm = (x) => String(x || "").toLowerCase().replace(/\s+/g, " ").trim();
    const K = new Set((kalender || []).map((p) => `${p.date}|${p.sport}`)), out = [];
    const gelaufen = (d, sp, n) => (acts || []).some((b) => b && b.date === d && b.sport === sp && b.wk && norm(b.wk.name) === n);
    for (const a of acts || []) {
      const wk = a && a.wk; if (!wk || !SPN[a.sport] || !wk.name || K.has(`${a.date}|${a.sport}`) || /stufentest|kurzcheck|laktat|\btest\b/i.test(wk.name)) continue;
      const n = norm(wk.name);
      if ((kalender || []).some((p) => p && p.sport === a.sport && norm(p.title || p.titel) === n && p.date !== a.date
        && Math.abs(T(p.date) - T(a.date)) <= 2 * 864e5 && !gelaufen(p.date, p.sport, n))) continue;   // verschoben, steht schon im Kalender
      const st = V64.planStufe(null, wk.name), d = isNum(wk.plan_s) && wk.plan_s > 0 ? wk.plan_s : null;
      out.push({ date: a.date, sport: a.sport, titel: String(wk.name).trim(), dauer_s: d, stufe: st ? st.stufe : null, quelle: st ? st.quelle : null, km: null, kmVollst: false,
        herkunft: "uhr", ...(d == null ? { dauerOffen: "Plandauer unbekannt (Schritt nach Strecke oder bis Taste)" } : {}) });
    }
    return out;
  };
  /** ctx: { w (Ergebnis von V64.woche), enduco [{date, sport, titel, dauer_s, stufe, quelle, km, kmVollst, herkunft}], ist [{date, sport, dauer_s, km}], heute }.
   *  Fenster: Pläne vergangener Wochen ganz; in der laufenden und nächsten Woche nur bis zum letzten Tag, für den Enduco schon im Kalender steht
   *  (Export meist am Vortag). Absolviertes bis gestern (heutige Einheiten kommen erst mit dem Nacht-Update). Ohne Enduco-Einträge: leer. */
  V64.vergleich = function (ctx) {
    const c = ctx || {}, w = c.w, mo = w.woche, so = add(mo, 6), heute = c.heute || add(so, 1);
    const inW = (x) => x && x.date >= mo && x.date <= so && SPN[x.sport];
    const E = (c.enduco || []).filter(inW).map((x) => ({ date: x.date, sport: x.sport, titel: String(x.titel || SPN[x.sport]).trim(), min: isNum(x.dauer_s) ? x.dauer_s / 60 : null,
      stufe: x.stufe || "offen", quelle: x.quelle || null, km: isNum(x.km) ? x.km : null, kmVollst: !!x.kmVollst, herkunft: x.herkunft || "kalender" }));
    const V = [];
    for (const t of w.tage) for (const e of t.einheiten) if (SPN[e.sport]) V.push({ date: t.date, sport: e.sport, titel: e.titel, min: e.dauer, stufe: V64.stufeVon(e), id: e.id });
    const I = (c.ist || []).filter(inW).map((x) => ({ date: x.date, sport: x.sport, min: (x.dauer_s || 0) / 60, km: isNum(x.km) ? x.km : null }));
    const vorbei = so < heute, eBis = E.length ? E.reduce((m, x) => (x.date > m ? x.date : m), mo) : null;
    const leer = { v: V64.VERSIONS.vergleich, woche: mo, leer: true, vorbei, E, V, I, unterschiede: [] };
    if (!E.length) return leer;
    const planBis = vorbei ? so : eBis, gestern = add(heute, -1), istBis = vorbei ? so : planBis < gestern ? planBis : gestern;
    const bis = (L, b) => L.filter((x) => x.date <= b);
    const summe = (L) => { const o = { total: { min: 0, n: 0, offen: 0 } }; for (const sp of V64.SPORTARTEN) o[sp] = { min: 0, n: 0, offen: 0 };
      for (const x of L) { o[x.sport].n++; o.total.n++; if (isNum(x.min)) { o[x.sport].min += x.min; o.total.min += x.min; } else { o[x.sport].offen++; o.total.offen++; } } return o; };
    const sE = summe(bis(E, planBis)), sV = summe(bis(V, planBis));
    const mitIst = istBis >= mo, sI = mitIst ? summe(bis(I, istBis)) : null, sEi = mitIst ? summe(bis(E, istBis)) : null, sVi = mitIst ? summe(bis(V, istBis)) : null;
    // Abdeckung: Anteil der absolvierten Einheiten mit einem Enduco-Eintrag derselben Sportart am selben Tag; unter 60 % keine Summen-Urteile
    const istF = mitIst ? bis(I, istBis) : [], mitPlan = istF.filter((x) => E.some((e) => e.date === x.date && e.sport === x.sport)).length;
    const abdeckung = istF.length ? { n: istF.length, mitPlan, anteil: mitPlan / istF.length } : null, sicher = !abdeckung || abdeckung.anteil >= 0.6;
    // vergleich-1.1 (B11): Sportarten mit Enduco-Einheiten ohne bekannte Dauer zählen für «näher an» auf keiner Seite
    const ohne = mitIst ? V64.SPORTARTEN.filter((sp) => sEi[sp].offen > 0) : [], spV = V64.SPORTARTEN.filter((sp) => !ohne.includes(sp));
    const abw = (A) => spV.reduce((s0, sp) => s0 + Math.abs(sI[sp].min - A[sp].min), 0);
    let naeher = null;
    const istOhne = mitIst ? ohne.reduce((s0, sp) => s0 + sI[sp].min, 0) : 0, zuViel = mitIst && sI.total.min > 0 && istOhne / sI.total.min > 0.5;
    if (mitIst && sicher && spV.length && !zuViel) { const aE = abw(sEi), aV = abw(sVi); naeher = { bis: istBis, E: aE, V: aV, ohne, urteil: aE + 15 < aV ? "Enduco" : aV + 15 < aE ? "Vorschlag" : "ähnlich" }; }
    const stufen = (L) => { const o = { alles: [], schwelle: [], locker: [], test: [], offen: [] }; for (const x of L) (o[x.stufe] || o.offen).push(x); return o; };
    const stE = stufen(bis(E, planBis)), stV = stufen(bis(V, planBis));
    const lang = (L, sp) => L.filter((x) => x.sport === sp && isNum(x.min)).sort((a, b) => b.min - a.min)[0] || null;
    const laengste = {}; for (const sp of ["rad", "lauf"]) laengste[sp] = { E: lang(bis(E, planBis), sp), V: lang(bis(V, planBis), sp), I: mitIst ? lang(bis(I, istBis), sp) : null };
    const wt = (iso) => TAG[(new Date(T(iso)).getUTCDay() + 6) % 7];
    const nennen = (L) => L.map((x) => `${wt(x.date)} ${SPN[x.sport]} «${x.titel}»`).join(", ");
    const U = [], bisText = vorbei ? "" : ` (bis ${wt(planBis)} ${+planBis.slice(8)}.${+planBis.slice(5, 7)}.)`;
    if (!sicher) U.push({ art: "abdeckung", text: `Enduco-Plan nur teilweise bekannt: ${abdeckung.mitPlan} von ${abdeckung.n} absolvierten Einheiten hatten einen Eintrag (Kalender oder Workout auf der Uhr). Summen, harte Einheiten und freie Tage werden darum nicht verglichen.` });
    const dT = sE.total.min - sV.total.min;
    if (sicher && Math.abs(dT) >= 30) U.push({ art: "stunden", text: `Stunden${bisText}: Enduco ${hmin(sE.total.min)} h, Vorschlag ${hmin(sV.total.min)} h – ${dT > 0 ? "Enduco" : "der Vorschlag"} ${hmin(Math.abs(dT))} h mehr. Der Vorschlag nimmt die Stunden aus dem Wochenstunden-Vorschlag (deine 8 Wochen davor und die Phase), Enduco die in Enduco eingestellten Stunden.` });
    for (const sp of V64.SPORTARTEN) { const d = sE[sp].min - sV[sp].min; if (sicher && Math.abs(d) >= 30) U.push({ art: "sportart", text: `${SPN[sp]}: Enduco ${hmin(sE[sp].min)} h (${sE[sp].n}×), Vorschlag ${hmin(sV[sp].min)} h (${sV[sp].n}×).` }); }
    if (sicher && stE.alles.length !== stV.alles.length) U.push({ art: "hart", text: `Harte Einheiten (über LT2, VO2max): Enduco ${stE.alles.length}${stE.alles.length ? ` – ${nennen(stE.alles)}` : ""}; Vorschlag ${stV.alles.length}${stV.alles.length ? ` – ${nennen(stV.alles)}` : ""}.` });
    if (sicher && stE.schwelle.length !== stV.schwelle.length) U.push({ art: "schwelle", text: `Tempo und Schwelle: Enduco ${stE.schwelle.length}${stE.schwelle.length ? ` – ${nennen(stE.schwelle)}` : ""}; Vorschlag ${stV.schwelle.length}${stV.schwelle.length ? ` – ${nennen(stV.schwelle)}` : ""}.` });
    const swE = stE.alles.filter((x) => x.sport === "schwimm");
    if (swE.length && !stV.alles.some((x) => x.sport === "schwimm")) U.push({ art: "schwimmen", text: `Schwimmen: Enduco plant harte Serien (${nennen(swE)}), der Vorschlag höchstens CSS-Tempo.` });
    for (const sp of ["rad", "lauf"]) { const L = laengste[sp], g = sp === "rad" ? 30 : 10;
      if (sicher && L.E && L.V && Math.abs(L.E.min - L.V.min) >= g) U.push({ art: "lang", text: `Längste ${sp === "rad" ? "Ausfahrt" : "Laufeinheit"}: Enduco ${hmin(L.E.min)} h${sp === "lauf" && isNum(L.E.km) ? ` (${L.E.kmVollst ? "≈" : "mind. ≈"} ${L.E.km.toFixed(1).replace(".", ",")} km)` : ""}, Vorschlag ${hmin(L.V.min)} h.` }); }
    const frei = (L) => { const n = []; for (let i = 0; i < 7; i++) { const d = add(mo, i); if (d <= planBis && !L.some((x) => x.date === d)) n.push(TAG[i]); } return n; };
    const fE = frei(E), fV = frei(V);
    if (sicher && fE.join() !== fV.join()) U.push({ art: "frei", text: `Freie Tage: Enduco ${fE.length ? fE.join(", ") : "keiner"}; Vorschlag ${fV.length ? fV.join(", ") : "keiner"}.` });
    if (sicher && zuViel) U.push({ art: "dauer", text: `Kein Urteil «näher an»: Bei ${ohne.map((sp) => SPN[sp]).join(" und ")} ist die Enduco-Dauer nicht bekannt (Workout auf der Uhr mit Schritten nach Strecke oder bis Taste), und das ist mehr als die Hälfte deines Trainings.` });
    if (stE.offen.length) U.push({ art: "offen", text: `${stE.offen.length} Enduco-Einheit${stE.offen.length > 1 ? "en" : ""} ohne Ziele und ohne Hinweis im Titel – Intensität offen: ${nennen(stE.offen)}.` });
    const tage = TAG.map((t, i) => { const d = add(mo, i); return { date: d, wt: t, E: E.filter((x) => x.date === d), V: V.filter((x) => x.date === d), I: I.filter((x) => x.date === d) }; });
    return { v: V64.VERSIONS.vergleich, woche: mo, leer: false, vorbei, eBis, planBis, istBis: mitIst ? istBis : null, abdeckung, sicher, E, V, I, summen: { E: sE, V: sV, I: sI, Ei: sEi, Vi: sVi },
      stufen: { E: stE, V: stV }, laengste, naeher, unterschiede: U, tage };
  };
  return V64;
});
