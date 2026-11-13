/* V6.4 Etappe 4 · Trainingsmodell und Woche nach Modell (ohne DOM, auch unter Node testbar).
   - modell-1.0: wählbare Modelle der Intensitätsverteilung (polarisiert, pyramidal, Schwelle mit Laktat, rennspezifisch) und «kombiniert»
     (Standard, von Silas gewählt am 13.11.2026: Winter polarisiert, ab Februar rennspezifisch). Erklärung und Quellen: js/wissen.js.
   - wochenplan-1.0: Wochenvorschlag aus Phase und Stunden (saison-1.0), Modell, Tests (testplan-1.0) und Rennen – neben dem Enduco-Plan,
     nie nach Garmin oder Enduco geschrieben. Feste Wochenstruktur (Mo frei, Schlüsseleinheiten Di Laufen und Do Rad, lang Sa Rad und So Laufen).
   - aufteilung-1.0: Stunden Schwimmen 20 %, Rad 50 %, Laufen 30 % (eigene Festlegung, keine Studie).
   - tid-1.0: Zeit in drei Bereichen (locker < LT1 ≤ mittel < LT2 ≤ hart), Muster nach Treff et al. 2019 (Polarisierungsindex), Abgleich mit dem Modell.
   Unbekannt bleibt unbekannt: ohne Zonenprofil keine Watt- oder Pace-Ziele, ohne CSS-Test kein Schwimmtempo. */
(function (root, factory) {
  const V64 = factory();
  if (typeof module === "object" && module.exports) module.exports = V64;
  if (root) root.V64 = V64;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V64 = { VERSIONS: { modell: "modell-1.0", woche: "wochenplan-1.0", tid: "tid-1.0", aufteilung: "aufteilung-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const montag = (iso) => add(iso, -((new Date(T(iso)).getUTCDay() + 6) % 7));
  const r5 = (x) => Math.max(0, Math.round(x / 5) * 5), r15 = (x) => Math.max(0, Math.round(x / 15) * 15);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mmss = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  V64.montag = montag; V64.addDays = add;

  /* ---------------- Drei Bereiche (tid-1.0) ---------------- */
  /** Zone (Schlüssel aus js/v6.js oder eigener Baustein-Schlüssel) → Bereich. Renntempo liegt knapp unter LT1 und zählt darum als locker. */
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
  /** Wechseldatum «kombiniert»: 1. Februar im Jahr des Hauptrennens (Rennen bis Ende Februar: im Jahr davor). */
  V64.wechselStandard = function (hauptDatum) {
    const y = hauptDatum ? +hauptDatum.slice(0, 4) - (hauptDatum.slice(5) <= "02-28" ? 1 : 0) : new Date().getUTCFullYear();
    return `${y}-02-01`;
  };
  /** Gewähltes Modell (Eintrag «modell» von der Seite oder aus den Daten) → { modell, wechsel }; unbekannt → Standard. */
  V64.wahl = function (eintrag, hauptDatum) {
    const e = eintrag || {}, m = V64.MODELLE[e.modell] ? e.modell : "kombiniert";
    const w = /^\d{4}-\d{2}-\d{2}$/.test(String(e.wechsel || "")) ? e.wechsel : V64.wechselStandard(hauptDatum);
    return { modell: m, wechsel: w };
  };
  /** Modell, das in der Woche ab montagISO gilt: «kombiniert» ab der Woche, in der der Wechsel liegt, rennspezifisch. */
  V64.modellFuer = function (wahl, montagISO) {
    const w = wahl || {};
    if (w.modell && w.modell !== "kombiniert" && V64.MODELLE[w.modell]) return w.modell;
    return montagISO >= montag(w.wechsel || V64.wechselStandard(null)) ? "rennspezifisch" : "polarisiert";
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
      zweck: "Ausdauer und Ermüdungsresistenz: Leistung auch nach Stunden halten. Verpflegung üben: ab der ersten Stunde regelmässig Kohlenhydrate.",
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
    rad_schwelle: { sport: "rad", titel: "Schwelle 3 × 15 min", art: "schluessel", wissen: "modelle", quellen: ["stoeggl2015", "seiler2010"],
      zweck: "Lange Zeit knapp unter LT2 hebt die Leistung an der Schwelle; Kern der pyramidalen Verteilung.",
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
      zweck: "Gleichmässig zwischen LT1 und LT2: muskuläre Ausdauer für lange Rennen, ohne die Erholung der Woche zu gefährden.",
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
      zweck: "Hebt die maximale Sauerstoffaufnahme: 4 × 4 min bei 90–95 % der maximalen Herzfrequenz mit 3 min Trab steigerten sie in einer Studie um 7,2 %.",
      wdh: (o) => (o.kurz ? 2 : 4),
      teile(o) { const n = this.wdh(o); return mitAus([["z1", 5], ["z2", 10]].concat(wdh(n, [["vo2", 4]], [["z1", 3]])), n === 4 ? 50 : 35); },
      ablauf(o) { return ["15 min einlaufen", `${this.wdh(o)} × 4 min hart, 3 min Trab dazwischen`, "hart = kontrolliert, die letzte Wiederholung gleich schnell wie die erste", "auslaufen"]; } },
    lauf_tempo: { sport: "lauf", titel: "Tempo 3 × 10 min", art: "schluessel", wissen: "modelle", quellen: ["stoeggl2015", "seiler2010"],
      zweck: "Gleichmässig zwischen LT1 und LT2: Tempohärte für den Lauf, ohne tief in die Ermüdung zu gehen.",
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
      zweck: "Direkt nach dem Rad laufen: Schritt und Tempo nach dem Wechsel finden lernt man nur so.",
      teile: (o) => [["renntempo", Math.min(10, o.d)], ["z2", Math.max(0, o.d - 10)]], ablauf: (o) => [`direkt nach dem Rad ${o.d} min`, "erste 10 min Renntempo, dann locker"] },
    schwimm_kurs: { sport: "schwimm", titel: "Schwimmkurs", art: "kurs", wissen: "schwimmen", quellen: [],
      zweck: "Technik – im Schwimmen der grösste Hebel. Inhalt bestimmt der Kurs.", teile: (o) => [["z2", o.d]], ablauf: () => ["Inhalt laut Kurs"] },
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
    aktivierung: { sport: "rad", titel: "Aktivierung", art: "aktivierung", fix: 30, wissen: "taper", quellen: ["mujika2003"],
      zweck: "Am Vortag kurz wach machen, nicht ermüden.", teile: () => [["z1", 10], ["z2", 8], ["z3", 1], ["z1", 2], ["z3", 1], ["z1", 2], ["z3", 1], ["z1", 5]],
      ablauf: () => ["30 min locker mit 3 × 1 min zügig", "Material und Verpflegung bereitlegen"] },
  });

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
      case "z1": return z2 && isNum(z2.von) ? `unter ${wert(z2.von)}${puls(h2 && isNum(h2.von) ? `unter ${h2.von}` : null)}` : null;
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

  /* ---------------- Wochenvorschlag (wochenplan-1.0) ---------------- */
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
   *  css_s, aufteilung }. → { v, woche, modell, phase, erholung, stunden, tage [{date, wt, ruhetag, notiz, einheiten}], minuten, tid, pruefung, hinweise } */
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

    // Rad: Schlüssel (Do), lang (Sa), locker (Mi bei 3 Einheiten)
    const radK = V64.einheit(M.schluessel.rad, o(null));
    let radL = N.rad === 3 ? clamp(r5(0.25 * min.rad), 45, 90) : 0;
    let radLang = min.rad - radK.dauer - radL;
    if (radLang < 60) { radLang = Math.max(45, r5(min.rad - radK.dauer)); if (radL) wenig("Wenig Rad-Stunden: keine lockere Ausfahrt unter der Woche"); radL = 0; }
    radLang = r15(Math.min(radLang, LANG.rad));
    let rest = min.rad - radK.dauer - radL - radLang;
    if (rest >= 15 && radL) { const plus = Math.min(rest, 120 - radL); radL = r5(radL + plus); rest -= plus; }
    if (rest >= 15) wenig(`Rad: ${r5(rest)} min nicht verteilt (längste Ausfahrt in dieser Phase höchstens ${LANG.rad} min)`);
    // Laufen: Schlüssel (Di; Erholungswoche: locker), lang (So), locker (Fr), Koppel (Sa, rennspezifisch, nicht in Erholungswochen)
    const laufK = erh ? V64.einheit("lauf_locker", o(Math.min(45, Math.max(30, r5(0.3 * min.lauf))))) : V64.einheit(M.schluessel.lauf, o(null));
    const koppel = M.koppel && !erh ? (taper ? 15 : phase === "Wettkampfspezifisch" ? 30 : 20) : 0;
    let laufL = N.lauf === 3 ? clamp(r5(0.25 * min.lauf), 30, 60) : 0;
    let laufLang = min.lauf - laufK.dauer - laufL - koppel;
    if (laufLang < 40) { laufLang = Math.max(30, r5(min.lauf - laufK.dauer - koppel)); if (laufL) wenig("Wenig Lauf-Stunden: kein lockerer Lauf unter der Woche"); laufL = 0; }
    laufLang = r5(Math.min(laufLang, LANG.lauf));
    let restL = min.lauf - laufK.dauer - laufL - koppel - laufLang;
    if (restL >= 10 && laufL) { const plus = Math.min(restL, 75 - laufL); laufL = r5(laufL + plus); restL -= plus; }
    if (restL >= 10) wenig(`Laufen: ${r5(restL)} min nicht verteilt (längster Lauf in dieser Phase höchstens ${LANG.lauf} min)`);
    // Schwimmen: Kurs (Di), CSS (Do), locker (So)
    const sw = clamp(r5(min.schwimm / N.schwimm), 30, 75);

    tag("Mo").ruhetag = true;
    tag("Di").einheiten.push(laufK, V64.einheit("schwimm_kurs", o(sw)));
    if (radL) tag("Mi").einheiten.push(V64.einheit("rad_locker", o(radL)));
    tag("Do").einheiten.push(radK);
    if (N.schwimm >= 2) tag("Do").einheiten.push(V64.einheit("schwimm_css", o(sw)));
    if (laufL) tag("Fr").einheiten.push(V64.einheit("lauf_locker", o(laufL)));
    tag("Sa").einheiten.push(V64.einheit(M.renntempo && !erh ? "rad_lang_rt" : "rad_lang", o(radLang)));
    if (koppel) tag("Sa").einheiten.push(V64.einheit("lauf_koppel", o(koppel)));
    tag("So").einheiten.push(V64.einheit(M.renntempo && !erh ? "lauf_lang_rt" : "lauf_lang", o(laufLang)));
    if (N.schwimm >= 3) tag("So").einheiten.push(V64.einheit("schwimm_locker", o(sw)));
    if (erh) hinweise.push("Erholungswoche: nur eine Schlüsseleinheit (Rad, gekürzt); Laufen locker");
    if (taper && !erh) hinweise.push("Taper: Intensität bleibt, Umfang der Schlüsseleinheiten halbiert");

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
      const sport = t.kind === "css" ? "schwimm" : t.sport === "lauf" ? "lauf" : "rad";
      const neu = V64.einheit(t.kind === "css" ? "test_css" : sport === "lauf" ? "test_lauf" : "test_rad", o(null));
      neu.test = t.kind; neu.testStatus = t.status || null;
      const i = tg.einheiten.findIndex((e) => e.sport === sport);
      if (i >= 0) { neu.ersetzt = tg.einheiten[i].titel; if (tg.einheiten[i].schluessel) hinweise.push(`${neu.titel}: ersetzt die Schlüsseleinheit «${tg.einheiten[i].titel}»`); tg.einheiten[i] = neu; }
      else { tg.einheiten.push(neu); tg.ruhetag = false; }
      if (t.kind === "stufentest") for (const x of tage) {                       // ausgeruht zum Stufentest: Schlüsseleinheit derselben Sportart in den 3 Tagen davor locker
        if (x.date >= t.date || x.date < add(t.date, -3)) continue;
        x.einheiten = x.einheiten.map((e) => { if (e.sport !== sport || !e.schluessel) return e;
          hinweise.push(`${e.titel} locker statt hart: ${neu.titel} folgt am ${TAG[(new Date(T(t.date)).getUTCDay() + 6) % 7]}`);
          const l = V64.einheit(sport === "rad" ? "rad_locker" : "lauf_locker", o(Math.max(30, Math.min(e.dauer, sport === "rad" ? 60 : 40)))); l.vorTest = true; return l; });
      }
    }

    const minuten = { schwimm: 0, rad: 0, lauf: 0 }, z = { locker: 0, mittel: 0, hart: 0 };
    for (const t of tage) for (const e of t.einheiten) {
      if (minuten[e.sport] != null) minuten[e.sport] += e.dauer;
      for (const k of ["locker", "mittel", "hart"]) z[k] += e.minuten[k];
    }
    minuten.total = minuten.schwimm + minuten.rad + minuten.lauf;
    const tid = V64.tid(z), pruefung = V64.pruefen(modell, tid, { erholung: erh, taper, rennwoche: !!R.length });
    return { v: V64.VERSIONS.woche, woche, modell, modellName: M.name, phase, erholung: erh, taper, stunden: H, tage, minuten, zonen: z, tid, pruefung, hinweise,
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
    return { ok: !pr.length, probleme: pr, text: pr.length ? `Weicht vom Modell «${M.name}» ab: ${pr.join("; ")}.` : `Passt zum Modell «${M.name}» (${t.muster}).` };
  };
  /** Bereiche aus dem Balkenprofil einer geplanten Einheit (V6.profil: balken [{key, d (s)}]); ohne Ziel = offen. */
  V64.tidAusBalken = function (balken) {
    const z = { locker: 0, mittel: 0, hart: 0, offen: 0 };
    for (const b of balken || []) { if (!isNum(b.d)) continue; const k = V64.DREI[b.key]; if (k) z[k] += b.d; else z.offen += b.d; }
    return z;
  };
  return V64;
});
