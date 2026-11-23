/* Ironman Notebook V7.3 – Einheit wie Trainingsbriefing (Auftrag V7.3 vom 16.11.2026, Etappe 1), Rechenlogik ohne DOM.
   - schritte-1.0: jede Einheit als Schritte und Blöcke (Wiederholungen, auch verschachtelt), mit Art (einfahren, Belastung, Erholung,
     ausfahren, Pause, Bahn beenden, Technik), Dauer bzw. Strecke, Zone, Anweisung in eigenen Worten und sprechendem Blocknamen.
     Quelle sind immer die Abschnitte der Einheit (`teile` aus V64/V66, Schwimm-Einheit schwimmeinheit-1.0, Workout aus Garmin workout-1.1):
     die Schritte ergeben genau dieselben Zeiten und Zonen – TL ≈, Profil, Fokus und Vergleich rechnen unverändert.
   - rpe-zonen-1.0: Anstrengung (RPE, CR-10 nach Foster) je Abschnittsart, wenn als Metrik RPE gewählt ist (eigene Festlegung).
   - Zeit je Zone (Z1–Z5) aus den Schritten, Fokus-Intensitäten, Achse des Ablaufs, Zusammenfassung (Coach-Karte) aus dem Ablauf der Vorlage.
   Enduco ist nur Vorbild für Aufbau und Darstellung; alle Texte sind eigene. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V73 = factory(node ? require("./v64.js") : root && root.V64);
  if (node) module.exports = V73;
  if (root) root.V73 = V73;
})(typeof window !== "undefined" ? window : null, function (V64) {
  "use strict";
  const V73 = { VERSIONS: { schritte: "schritte-1.0", einheit: "einheit-2.0", rpe: "rpe-zonen-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const komma = (x) => String(x).replace(".", ",");

  /* ---------------- Zonen der Abschnitte ---------------- */
  /** Zone 1–5 je Abschnittsart (Pause = Erholung = Zone 1); Test und «ohne» haben keine Zone. */
  V73.ZNR = { pause: 1, z1: 1, z2: 2, renntempo: 2, z3: 3, z3o: 3, css: 4, vo2: 5, abc: 1 };
  /** Farbe/Chip (Schlüssel aus V6.ZONEN) je Abschnittsart, wie profil-1.0 (V64.FARBE). */
  V73.FARBE = Object.assign({ ohne: "offen" }, V64.FARBE);
  const ARBEIT = new Set(["z3", "z3o", "vo2", "css", "renntempo"]);
  const STUFE = { test: 0, ohne: 0, pause: 0, z1: 1, z2: 2, renntempo: 2.5, z3: 3, z3o: 3.5, css: 4, vo2: 5, abc: 1 };
  /** RPE je Abschnittsart (rpe-zonen-1.0, eigene Festlegung auf der CR-10-Skala nach Foster). */
  V73.RPE = { pause: "RPE 1–2", z1: "RPE 1–2", z2: "RPE 3–4", renntempo: "RPE 4–5", z3: "RPE 5–6", z3o: "RPE 6–7", css: "RPE 7", vo2: "RPE 8–9" };

  /* ---------------- Texte (eigene Worte) ---------------- */
  const T = {
    rad: { ein_z1: "Locker einrollen", ein_z2: "Gleichmässig treten, Puls ruhig", z2: "Gleichmässig in der Grundlage", erh_z1: "Locker treten",
      erh_pause: "Locker weitertreten", aus: "Locker ausfahren", z3: "Zügig und gleichmässig", z3o: "Knapp unter der Schwelle, nicht darüber",
      vo2: "Hart – alle Wiederholungen gleich stark", renntempo: "Renntempo, Verpflegung wie im Rennen", test: "Test laut Protokoll", nach_z2: "Locker weiterfahren" },
    lauf: { ein_z1: "Locker einlaufen", ein_z2: "Ruhig weiterlaufen", z2: "Locker und gleichmässig", erh_z1: "Traben", erh_pause: "Locker traben",
      aus: "Locker auslaufen", z3: "Zügig und gleichmässig", z3o: "Knapp unter der Schwelle, nicht darüber", vo2: "Hart, aber kontrolliert",
      renntempo: "Renntempo", test: "Test laut Protokoll", nach_z2: "Locker weiterlaufen" },
    schwimm: { ein_z1: "Locker einschwimmen", ein_z2: "Ruhig schwimmen", z2: "Ruhig und gleichmässig", erh_z1: "Locker schwimmen", erh_pause: "Pause",
      aus: "Locker ausschwimmen", css: "CSS-Tempo halten", test: "Test laut Protokoll", nach_z2: "Locker weiterschwimmen" },
  };
  const tx = (sport) => T[sport] || T.rad;
  /** Kurze Erklärung je Blockart (Blatt beim Antippen eines Blocks). */
  V73.BLOCK_TEXT = {
    vo2: "Kurze harte Abschnitte nahe der maximalen Sauerstoffaufnahme. Hart heisst: so stark, dass alle Wiederholungen gleich bleiben – die letzte nicht langsamer als die erste. Die Pausen sind kurz, die Atmung beruhigt sich nur teilweise.",
    z3o: "Knapp unter der Schwelle (LT2): anstrengend, aber über die ganze Dauer haltbar. Nicht darüber gehen – sonst steigt das Laktat weiter und die Erholung dauert länger.",
    z3: "Zwischen LT1 und LT2: zügig und gleichmässig, nahe am Tempo langer Rennen. Die Atmung ist tiefer, Sprechen geht nur noch in kurzen Sätzen.",
    renntempo: "Knapp unter LT1, so wie du im Rennen fahren bzw. laufen willst. Gleichmässig bleiben und die Verpflegung wie im Rennen üben.",
    css: "Wiederholungen im CSS-Tempo mit kurzen Pausen: knapp über der Dauerleistungsgrenze. Gleichmässig einteilen, die letzte Wiederholung nicht langsamer.",
    serien: "Mehrere Serien mit lockeren Minuten dazwischen. In der Pause zwischen den Serien wirklich locker bleiben, damit jede Serie gleich gut gelingt.",
    laktat: "Laktat nach der 2. und 4. Wiederholung messen: liegt der Wert über deinem Wert an der LT2 aus dem Stufentest, die nächste Wiederholung etwas leichter (eigene Regel).",
    aktivierung: "Kurz zügig, um wach zu werden – nicht um zu ermüden. Danach wieder ganz locker.",
    technik: "Technikübungen langsam und sauber, mit Pausen am Beckenrand. Lieber eine Bahn weniger als unsauber schwimmen.",
  };

  /* ---------------- Hilfen ---------------- */
  const dauerKurz = (s) => (!isNum(s) ? "" : s < 60 ? `${Math.round(s)} s` : s >= 3600 ? `${Math.floor(Math.round(s / 60) / 60)}:${String(Math.round(s / 60) % 60).padStart(2, "0")} h`
    : s % 60 === 0 || s >= 600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")} min`);
  V73.dauerKurz = dauerKurz;
  const istRuhe = (n) => n && n.typ === "s" && (n.key === "z1" || n.key === "pause");
  function gleich(a, b) {
    if (!a || !b || a.typ !== b.typ) return false;
    if (a.typ === "s") return a.key === b.key && a.s === b.s && a.m === b.m && (a.text || "") === (b.text || "") && (a.uebung || "") === (b.uebung || "")
      && (a.zone || "") === (b.zone || "") && (a.ziel || "") === (b.ziel || "") && (a.art || "") === (b.art || "");
    return a.wdh === b.wdh && !!a.ohneLetzte === !!b.ohneLetzte && a.schritte.length === b.schritte.length && a.schritte.every((x, i) => gleich(x, b.schritte[i]));
  }
  /** Wiederholungen finden: je Stelle das Muster (1–4 Glieder) mit der grössten Abdeckung, mindestens zweimal; fehlt der letzten Wiederholung nur
   *  die Erholung am Ende (z. B. «3 × 15 min, 5 min locker dazwischen»), gilt sie als «ohne letzte Erholung». */
  V73.gruppieren = function (L) {
    const out = [];
    for (let i = 0; i < L.length;) {
      let best = null;
      for (let p = 1; p <= 4; p++) {
        if (i + p > L.length) break;
        let k = 1;
        while (i + (k + 1) * p <= L.length && L.slice(i + k * p, i + (k + 1) * p).every((x, j) => gleich(x, L[i + j]))) k++;
        let kk = k, ohne = false;
        if (p >= 2 && istRuhe(L[i + p - 1]) && i + k * p + (p - 1) <= L.length && L.slice(i + k * p, i + k * p + p - 1).every((x, j) => gleich(x, L[i + j]))) { kk = k + 1; ohne = true; }
        if (kk >= 2) { const cover = kk * p - (ohne ? 1 : 0); if (!best || cover > best.cover) best = { p, k: kk, ohne, cover }; }
      }
      if (best) { out.push({ typ: "b", wdh: best.k, ohneLetzte: best.ohne, schritte: L.slice(i, i + best.p) }); i += best.cover; }
      else { out.push(L[i]); i++; }
    }
    return out;
  };
  /** Alle Schritte eines Baums in Reihenfolge, Wiederholungen ausgefaltet (ohne letzte Erholung, wo vermerkt). */
  V73.flach = function (baum) {
    const out = [];
    const geh = (L) => { for (const n of L) {
      if (n.typ === "s") { out.push(n); continue; }
      if (n.typ === "abschnitt") { geh(n.kinder); continue; }
      for (let r = 0; r < n.wdh; r++) geh(r === n.wdh - 1 && n.ohneLetzte ? n.schritte.slice(0, -1) : n.schritte);
    } };
    geh(baum || []);
    return out;
  };
  const walk = (L, f) => { for (const n of L || []) { if (n.typ === "s") f(n); else walk(n.typ === "abschnitt" ? n.kinder : n.schritte, f); } };
  function hauptKey(b) { let best = null; walk([b], (s) => { if (ARBEIT.has(s.key) && (best == null || STUFE[s.key] > STUFE[best])) best = s.key; }); return best; }
  const hatBlock = (b) => b.schritte.some((x) => x.typ === "b");

  /* ---------------- Schritte aus den Abschnitten einer Einheit (Rad, Laufen, Schwimmen ohne Serien) ---------------- */
  function blockName(b, e) {
    const id = e.id || e.vorlage || "", k = hauptKey(b);
    if (hatBlock(b)) return "Serien";
    if (k === "vo2") {
      const w = b.schritte.find((x) => x.key === "vo2"), r = b.schritte.find((x) => istRuhe(x));
      return w && w.s <= 60 && r ? `${dauerKurz(w.s)} hart / ${dauerKurz(r.s)} locker` : "VO2max-Intervalle";
    }
    if (k === "z3o") return /laktat/.test(id) ? "Schwelle mit Laktat" : "Schwellen-Intervalle";
    if (k === "z3") return id === "aktivierung" ? "Kurz zügig" : e.sport === "lauf" ? "Tempo-Abschnitte" : "Tempo-Blöcke";
    if (k === "renntempo") return "Renntempo-Blöcke";
    if (k === "css") return "CSS-Wiederholungen";
    return "Wiederholungen";
  }
  function blockText(b, e) {
    const id = e.id || e.vorlage || "", k = hauptKey(b);
    if (hatBlock(b)) return V73.BLOCK_TEXT.serien;
    if (id === "aktivierung") return V73.BLOCK_TEXT.aktivierung;
    const t = V73.BLOCK_TEXT[k] || null;
    return /laktat/.test(id) && t ? `${t} ${V73.BLOCK_TEXT.laktat}` : t;
  }
  function stepText(n, e, art, vorher) {
    const t = tx(e.sport);
    if (n.key === "test") return t.test;
    if (art === "ein") return n.key === "z1" ? t.ein_z1 : t.ein_z2;
    if (art === "aus") return t.aus;
    if (art === "erholung") return n.key === "pause" ? t.erh_pause : t.erh_z1;
    if (n.key === "z2") return vorher ? t.nach_z2 : t.z2;
    return t[n.key] || V64.ZNAME[n.key] || n.key;
  }
  /** Einheit (V64.einheit/V66.einheit) → Baum aus Schritten und Blöcken (schritte-1.0). Ohne Abschnitte (Kraft, Mobility, Bibliothek): []. */
  V73.ausTeilen = function (e) {
    if (!e || !Array.isArray(e.teile) || !e.teile.length || e.teile[0][0] === "ohne") return [];
    const flach = [];
    for (const [k, m] of e.teile) {
      if (!isNum(m) || m <= 0) continue;
      const s = Math.round(m * 60), l = flach[flach.length - 1];
      if (l && l.key === k) l.s += s; else flach.push({ typ: "s", key: k, s });
    }
    const baum = V73.gruppieren(V73.gruppieren(flach));
    const istArbeit = (n) => n.typ === "b" || ARBEIT.has(n.key);
    const erste = baum.findIndex(istArbeit);
    let letzte = -1; for (let i = baum.length - 1; i >= 0; i--) if (istArbeit(baum[i])) { letzte = i; break; }
    const annotBlock = (b) => {
      b.name = blockName(b, e); b.beschreibung = blockText(b, e);
      for (const c of b.schritte) {
        if (c.typ === "b") { annotBlock(c); continue; }
        c.art = c.key === "test" ? "test" : ARBEIT.has(c.key) ? "belastung" : istRuhe(c) ? "erholung" : "belastung";
        c.text = stepText(c, e, c.art, false);
      }
    };
    baum.forEach((n, i) => {
      if (n.typ === "b") { annotBlock(n); return; }
      if (n.key === "abc") {                                              // lauf-abc-1.0: eigener Schritt mit den Übungen (Namen wie in Enduco, Texte eigen)
        const A = V64.LAUF_ABC && V64.LAUF_ABC[e.abc] || null;
        n.art = "abc"; n.text = A ? A.titel : "Lauf-ABC"; n.uebungen = A ? A.uebungen.map((u) => Object.assign({}, u)) : []; return;
      }
      let art;
      if (n.key === "test") art = "test";
      else if (ARBEIT.has(n.key)) art = "belastung";
      else if (erste < 0) art = i === 0 && n.key === "z1" && baum.length > 1 ? "ein" : i === baum.length - 1 && n.key === "z1" && baum.length > 1 ? "aus" : n.key === "z2" ? "belastung" : "erholung";
      else if (i < erste) art = "ein";
      else if (i > letzte) art = n.key === "z1" && i === baum.length - 1 ? "aus" : istRuhe(n) ? "erholung" : "belastung";
      else art = istRuhe(n) ? "erholung" : "belastung";
      n.art = art; n.text = stepText(n, e, art, erste >= 0 && i > letzte);
    });
    return baum;
  };

  /* ---------------- Schwimm-Einheit (schwimmeinheit-1.0) → Baum ---------------- */
  const SW_KEY = { z1: "z1", z2: "z2", z3: "z3", css: "css", tech: "z2", max: "test" };
  function swSchritte(t, pool, stil) {
    const L = [];
    const bahnen = (m) => V73.bahnenText(m / (pool || 25));                    // «¼ L», «½ L», «1½ L», «6 L»
    // Schwimmzeit einer Wiederholung (inkl. Bahn beenden) nach Strecke auf Übung und Beenden aufgeteilt
    const je = isNum(t.schwimm_s) && t.wdh ? t.schwimm_s / t.wdh : null, ganz = (t.m || 0) + (t.zuende_m || 0);
    L.push({ typ: "s", art: t.zone === "tech" ? "technik" : "belastung", key: SW_KEY[t.zone] || "z2", m: t.m, bahnen: bahnen(t.m), s: isNum(je) && ganz ? Math.round(je * t.m / ganz) : null,
      text: t.text || "", tempo: t.tempo || null, rpe: t.rpe || null, uebung: t.uebung || null, hilfsmittel: (t.hilfsmittel || []).slice(), frei: (t.frei || []).slice(), stil: t.zone === "tech" ? null : stil || null });
    if (t.zuende_m) L.push({ typ: "s", art: "bahn", key: "z1", m: t.zuende_m, bahnen: bahnen(t.zuende_m), s: isNum(je) && ganz ? Math.round(je * t.zuende_m / ganz) : null, text: "Bahn locker beenden" });
    if (t.pause_s) L.push({ typ: "s", art: "pause", key: "pause", s: t.pause_s, text: "Pause am Beckenrand" });
    return L;
  }
  /** SW.einheit(...) → Baum: Einschwimmen und Ausschwimmen als Schritte, Technikübungen als aufklappbarer Abschnitt (je Übung ein Block),
   *  Serien als Blöcke «n × …». */
  V73.ausSchwimm = function (S) {
    if (!S || !Array.isArray(S.bloecke) || S.art === "kurs") return [];
    const out = [];
    for (const b of S.bloecke) {
      if (b.id === "technik") {
        out.push({ typ: "abschnitt", name: "Technikübungen", beschreibung: V73.BLOCK_TEXT.technik,
          kinder: b.teile.map((t) => ({ typ: "b", wdh: t.wdh || 1, ohneLetzte: false, name: t.text, beschreibung: null, uebung: t.uebung || null, schritte: swSchritte(t, S.pool) })) });
        continue;
      }
      for (const t of b.teile) {
        const sch = swSchritte(t, S.pool, b.id === "ein" || b.id === "aus" ? null : "Kraulen");
        // Blockname: Titel des Blocks; hat der Block mehrere Teile (Einschwimmen mit Steigerungen), der Text des Teils
        const name = b.teile.length > 1 && t.text && t.text.length <= 32 ? t.text : b.titel;
        if ((t.wdh || 1) > 1) out.push({ typ: "b", wdh: t.wdh, ohneLetzte: false, name, beschreibung: t.zone === "css" ? V73.BLOCK_TEXT.css : null, schritte: sch });
        else {
          const art = b.id === "ein" ? "ein" : b.id === "aus" ? "aus" : t.zone === "z1" ? "erholung" : null;     // lockere Strecke zwischen Belastungen = Erholung
          sch.forEach((x) => { if (art && x.art === "belastung") x.art = art; out.push(x); });
        }
      }
    }
    return out;
  };

  /* ---------------- Workout aus Garmin (Bibliothek, workout-1.1) → Baum ---------------- */
  /** Felder einer Enduco-Schwimmbeschreibung «½Lanes | Hunde-Paddeln | Endurance | 04:44min/100m | Finish Lane: Recovery»:
   *  Name (ohne Bahnen-, Intensitäts- und Tempofeld), Bahnen, Bahn beenden. */
  V73.schwimmFelder = function (text) {
    const F = String(text || "").split("|").map((x) => x.trim()).filter(Boolean);
    let bahnen = null, beenden = false, name = null;
    const INT = /^(recovery|endurance|tempo|threshold|vo2\s*max|neuro|sprint|anaerob\w*|warm\s*up|cool\s*down|fat\s*max|sweet\s*spot)$/i;
    for (const f of F) {
      const mL = f.match(/^([½¼¾\d.,]+)\s*lanes?$/i);
      if (mL) { bahnen = mL[1]; continue; }
      if (/^finish\s+lane/i.test(f)) { beenden = true; continue; }
      if (/^(break|pause)\b/i.test(f) || /min\s*\/\s*100\s*m$/i.test(f) || INT.test(f)) continue;
      if (!name) name = f;
    }
    return { name, bahnen, beenden };
  };
  /** TR.workout(...) → Baum. Schritte mit Art aus dem Garmin-Typ, Zone über V6.schrittZone (zoneVon), Ziel als Text; Wiederholungen aus den
   *  Gruppen des Workouts. zoneVon(s) → V6-Zonenschlüssel oder null; zielVon(s) → Text oder null. */
  /** Garmin-Hilfsmittel (equipment_type) → Schlüssel wie SW.HILFSMITTEL; Garmin-Stil (stroke_type) → Wort. */
  V73.GERAET = { kickboard: "brett", pull_buoy: "pullbuoy", fins: "flossen", paddles: "paddles", snorkel: "schnorchel" };
  V73.STIL = { free: "Kraulen", freestyle: "Kraulen", breaststroke: "Brust", backstroke: "Rücken", fly: "Delfin", butterfly: "Delfin", im: "Lagen", mixed: "Lagen", drill: "Übung" };
  /** «½», «1½», «2» (Bahnen laut Enduco) → Zahl; sonst null. */
  V73.bruch = function (t) {
    const m = /^(\d+(?:[.,]\d+)?)?\s*([½¼¾])?$/.exec(String(t ?? "").trim());
    if (!m || (!m[1] && !m[2])) return null;
    return (m[1] ? +m[1].replace(",", ".") : 0) + (m[2] ? { "½": 0.5, "¼": 0.25, "¾": 0.75 }[m[2]] : 0);
  };
  /** Bahnen als Text: 0,5 → «½ L», 1,5 → «1½ L», 2 → «2 L». */
  V73.bahnenText = function (x) {
    if (!isNum(x) || x <= 0) return null;
    const g = Math.floor(x + 1e-9), r = Math.round((x - g) * 100) / 100, Z = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
    if (!r) return `${g} L`;
    return Z[r] ? `${g || ""}${Z[r]} L` : `${komma(Math.round(x * 10) / 10)} L`;
  };
  V73.ausWorkout = function (wo, zoneVon, zielVon) {
    if (!wo || !Array.isArray(wo.schritte)) return [];
    const L = wo.schritte, out = [], swim = wo.sport === "schwimm";
    const ART = { warmup: "ein", cooldown: "aus", interval: "belastung" };
    const schritt = (s) => {
      const f = swim ? V73.schwimmFelder(s.text) : { name: null, bahnen: null, beenden: false };
      const z = zoneVon ? zoneVon(s) : null, rest = s.typ === "rest";
      // Pause: feste Pause (Schwimmen «Break», sonst ohne Ziel und mit Zeit); Erholung: lockerer Abschnitt mit Strecke oder Ziel
      const art = rest ? (isNum(s.distanz_m) || s.ziel ? "erholung" : "pause") : ART[s.typ] || "belastung";
      const g = s.geraet ? V73.GERAET[String(s.geraet).toLowerCase()] || String(s.geraet).toLowerCase() : null;
      const n = { typ: "s", art, zone: z, key: null,
        s: isNum(s.dauer_s) ? s.dauer_s : isNum(s.dauer_est) ? Math.round(s.dauer_est) : null, geschaetzt: !isNum(s.dauer_s) && isNum(s.dauer_est),
        m: isNum(s.distanz_m) ? s.distanz_m : null, bahnen: f.bahnen ? `${f.bahnen} L` : null, beenden: f.beenden,
        text: f.name || (art === "pause" ? (swim ? "Pause am Beckenrand" : "Pause") : swim ? "" : s.text || ""), ziel: zielVon ? zielVon(s) : null,
        kad: s.cad && isNum(s.cad.lo) && isNum(s.cad.hi) && s.cad.hi > 0 ? `${Math.round(s.cad.lo)}–${Math.round(s.cad.hi)} rpm` : null,
        hilfsmittel: g ? [g] : [], stil: swim && s.stil ? V73.STIL[String(s.stil).toLowerCase()] || null : null };
      // Enduco «½Lanes … Finish Lane»: die Strecke des Schritts ist die ganze Bahn; geübt wird der Bruchteil, der Rest locker (wie Mein Plan)
      const x = f.beenden ? V73.bruch(f.bahnen) : null;
      if (isNum(x) && x > 0 && !Number.isInteger(x) && isNum(n.m) && n.m > 0) {
        const ganz = Math.ceil(x), teil = Math.round((x / ganz) * n.m * 10) / 10, rest_m = Math.round((n.m - teil) * 10) / 10;
        if (rest_m > 0) {
          const s1 = isNum(n.s) ? Math.round((n.s * teil) / n.m) : null;
          const b = { typ: "s", art: "bahn", key: "z1", zone: null, m: rest_m, bahnen: V73.bahnenText(ganz - x), s: isNum(n.s) ? n.s - s1 : null,
            geschaetzt: n.geschaetzt, text: "Bahn locker beenden", hilfsmittel: [], stil: null };
          n.m = teil; n.bahnen = V73.bahnenText(x); n.s = s1;
          return [n, b];
        }
      }
      return [n];
    };
    for (let i = 0; i < L.length;) {
      const s = L[i];
      if (s.gruppe != null && s.wdh === 1 && wo.gruppen && wo.gruppen[s.gruppe]) {
        const g = wo.gruppen[s.gruppe], per = Math.max(1, Math.round((g.bis - g.von + 1) / g.n));
        const kinder = V73.gruppieren(L.slice(g.von, g.von + per).flatMap(schritt));      // verschachtelte Wiederholungen (Garmin legt sie flach)
        const haupt = V73.flach(kinder).find((k) => k.art === "belastung" && k.text);
        out.push({ typ: "b", wdh: g.n, ohneLetzte: false, name: (haupt && haupt.text) || "Wiederholungen", beschreibung: null, schritte: kinder });
        i = Math.max(i + 1, g.bis + 1); continue;
      }
      out.push(...schritt(s)); i++;
    }
    // Schwimmen wie enduco: aufeinanderfolgende Übungsblöcke (Schritt mit «Bahn beenden») als Abschnitt «Technikübungen»
    if (wo.sport === "schwimm") {
      const istUeb = (n) => n.typ === "b" && n.schritte.some((x) => x.beenden);
      const a = out.findIndex(istUeb);
      if (a >= 0) {
        let b = a; while (b + 1 < out.length && istUeb(out[b + 1])) b++;
        const kinder = out.slice(a, b + 1);
        kinder.forEach((k) => { for (const x of k.schritte) if (x.beenden && x.art === "belastung") x.art = "technik"; });
        out.splice(a, kinder.length, { typ: "abschnitt", name: "Technikübungen", beschreibung: V73.BLOCK_TEXT.technik, kinder });
      }
    }
    return out;
  };

  /* ---------------- Auswertung des Baums ---------------- */
  /** Zeit je Zone 1–5 (Sekunden) und Summe; Pausen zählen als Zone 1. key → Zone über ZNR, sonst über die V6-Zone (zone: z1…sprint). */
  V73.zonenZeiten = function (baum, v6Zonen) {
    const z = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; let total = 0, ohne = 0;
    for (const s of V73.flach(baum)) {
      if (!isNum(s.s)) continue;
      let nr = s.key ? V73.ZNR[s.key] : null;
      if (nr == null && s.zone && v6Zonen && v6Zonen[s.zone]) {
        const roh = Math.floor(v6Zonen[s.zone].stufe || 0);
        nr = s.zone === "pause" ? 1 : roh >= 1 ? Math.min(5, roh) : null;
      }
      if ((s.art === "pause" || s.art === "erholung" && !s.key && !s.zone) && nr == null) nr = 1;
      total += s.s;
      if (nr >= 1 && nr <= 5) z[nr] += s.s; else ohne += s.s;
    }
    return { z, total, ohne };
  };
  /** Dauer des Baums (s); null, wenn ein Schritt keine Dauer hat. */
  V73.dauer = function (baum) {
    let t = 0, offen = false;
    for (const s of V73.flach(baum)) { if (isNum(s.s)) t += s.s; else offen = true; }
    return offen ? null : t;
  };
  /** Strecke des Baums (m) – nur Schritte mit Strecke. */
  V73.strecke = function (baum) { let m = 0; for (const s of V73.flach(baum)) if (isNum(s.m)) m += s.m; return m || null; };
  /** Teilstriche der Ablauf-Achse: alle 15, 30 oder 60 min (je nach Dauer) → [{ s, text }], ohne die letzte Marke. */
  V73.achse = function (total) {
    if (!isNum(total) || total <= 0) return [];
    const schritt = total <= 75 * 60 ? 900 : total <= 150 * 60 ? 1800 : 3600, out = [];
    for (let s = 0; s < total - schritt * 0.25; s += schritt) out.push({ s, text: s === 0 ? "0" : s % 3600 === 0 ? `${s / 3600}:00` : s < 3600 ? `${s / 60}` : `${Math.floor(s / 3600)}:${String((s % 3600) / 60).padStart(2, "0")}` });
    return out;
  };
  /** Fokus-Intensitäten (wie profil-1.0): Anteile der Belastungsschritte je Abschnittsart, ohne Ein-/Ausfahren und Erholung, ab 10 %,
   *  höchstens drei. → [{ key, anteil }] nach Anteil. */
  V73.fokus = function (baum) {
    const z = {}; let t = 0;
    for (const s of V73.flach(baum)) {
      if (s.art !== "belastung" && s.art !== "technik" || !isNum(s.s)) continue;
      const k = s.key || s.zone; if (!k) continue;
      z[k] = (z[k] || 0) + s.s; t += s.s;
    }
    return Object.entries(z).map(([key, s]) => ({ key, anteil: t ? s / t : 0 })).filter((x) => x.anteil >= 0.1).sort((a, b) => b.anteil - a.anteil).slice(0, 3);
  };
  /** Hilfsmittel eines Baums (nötig), ohne doppelte. */
  V73.hilfsmittel = function (baum) { const h = new Set(); walk(baum, (s) => (s.hilfsmittel || []).forEach((x) => h.add(x))); return [...h]; };
  /** Coach-Karte: der Ablauf der Vorlage in Sätzen (eigene Worte aus V64/V66), sonst aus den Blöcken. */
  V73.coach = function (e, baum) {
    const satz = (x) => { const s = String(x || "").trim(); if (!s) return ""; const t = s[0].toUpperCase() + s.slice(1); return /[.!?]$/.test(t) ? t : t + "."; };
    if (e && Array.isArray(e.ablauf) && e.ablauf.length && !/^Ablauf wie im Enduco/.test(e.ablauf[0])) return e.ablauf.map(satz).filter(Boolean).join(" ");
    const B = (baum || []).filter((n) => n.typ !== "s").map((n) => (n.typ === "abschnitt" ? n.name : `${n.wdh} × ${n.name}`));
    return B.length ? satz(`Aufbau: ${B.join(", ")}`) : "";
  };

  /* ---------------- Ziele je Schritt nach Metrik ---------------- */
  /** Metriken je Sportart; Standard = erste. */
  V73.METRIKEN = { rad: ["leistung", "puls", "rpe"], lauf: ["pace", "puls", "rpe"], schwimm: ["pace", "rpe"] };
  V73.METRIK_NAME = { leistung: "Leistung", pace: "Pace", puls: "Herzfrequenz", rpe: "RPE" };
  V73.METRIK_KURZ = { leistung: "PWR", pace: "PACE", puls: "HF", rpe: "RPE" };
  V73.metrik = (e) => { const L = V73.METRIKEN[e && e.sport] || ["rpe"]; return e && L.includes(e.metrik) ? e.metrik : L[0]; };
  /** Ziel eines Abschnitts als Text in der gewählten Metrik (aus dem aktiven Zonenprofil über V64.ziel; RPE nach rpe-zonen-1.0). */
  V73.ziel = function (key, sport, skalen, css_s, metrik) {
    if (!key || key === "test" || key === "ohne") return null;
    if (metrik === "rpe") return V73.RPE[key] || null;
    if (metrik === "puls") return pulsZiel(key === "pause" ? "z1" : key, sport, skalen);
    const t = V64.ziel(key === "pause" ? "z1" : key, sport, skalen, css_s);
    return t ? t.split(" · Puls ")[0] : null;
  };
  /** Pulsziel je Abschnittsart aus den Pulszonen (rad_hf bzw. lauf_hf) des aktiven Zonenprofils, gleiche Lage wie die Leistungs- bzw. Pace-Ziele. */
  function pulsZiel(key, sport, skalen) {
    const L = (skalen || {})[sport === "rad" ? "rad_hf" : sport === "lauf" ? "lauf_hf" : ""], z = (n) => (Array.isArray(L) ? L.find((x) => x && x.z === "Z" + n) : null);
    const ok = (x) => x && isNum(x.von) && isNum(x.bis), z2 = z(2), z3 = z(3), z5 = z(5), r = Math.round;
    switch (key) {
      case "z1": return z2 && isNum(z2.von) ? `Puls unter ${r(z2.von)}` : null;
      case "z2": return ok(z2) ? `Puls ${r(z2.von)}–${r(z2.bis)}` : null;
      case "renntempo": return z3 && isNum(z3.von) ? `Puls bis ${r(z3.von)}` : null;
      case "z3": return ok(z3) ? `Puls ${r(z3.von)}–${r(z3.bis)}` : null;
      case "z3o": return ok(z3) ? `Puls ${r(z3.von + (2 / 3) * (z3.bis - z3.von))}–${r(z3.bis)}` : null;
      case "vo2": return z5 && isNum(z5.von) ? (isNum(L.hfmax) && L.hfmax > z5.von ? `Puls ${r(z5.von)}–${r(L.hfmax)} (Max)` : `Puls über ${r(z5.von)}`) : null;   // V9.9.2: Z5 «bis Max»
      default: return null;
    }
  }
  /** Bereich einer Zone 1–5 als Text in der gewählten Metrik (für «Intensitätszonen»); null ohne Skala. */
  V73.zonenBereich = function (nr, sport, skalen, css_s, metrik, mmss) {
    const S = skalen || {};
    if (metrik === "rpe") return ["RPE 1–2", "RPE 3–4", "RPE 5–6", "RPE 7", "RPE 8–10"][nr - 1];
    if (sport === "schwimm") {
      if (!isNum(css_s) || !mmss) return null;
      return [`langsamer als ${mmss(css_s + 15)}`, `${mmss(css_s + 12)}–${mmss(css_s + 8)}`, `${mmss(css_s + 5)}–${mmss(css_s + 2)}`, `um ${mmss(css_s)} (CSS)`, `schneller als ${mmss(css_s)}`][nr - 1] + " /100 m";
    }
    const key = metrik === "puls" ? (sport === "rad" ? "rad_hf" : "lauf_hf") : sport === "rad" ? "rad_w" : "lauf_pace";
    const L = S[key], z = Array.isArray(L) ? L.find((x) => x && x.z === "Z" + nr) : null;
    if (!z) return null;
    const pace = key === "lauf_pace", fmt = (x) => (pace && mmss ? mmss(x) : String(Math.round(x))), ein = pace ? "/km" : metrik === "puls" ? " bpm" : " W";
    if (!isNum(z.von) && isNum(z.bis)) return `${pace ? "langsamer als" : "unter"} ${fmt(z.bis)}${ein}`;
    if (isNum(z.von) && !isNum(z.bis)) return metrik === "puls" && isNum(L.hfmax) && L.hfmax > z.von ? `${fmt(z.von)}–${fmt(L.hfmax)}${ein} (Max)` : `${pace ? "schneller als" : "über"} ${fmt(z.von)}${ein}`;   // V9.9.2: Z5 «bis Max»
    if (isNum(z.von) && isNum(z.bis)) return `${fmt(z.von)}–${fmt(z.bis)}${ein}`;
    return null;
  };
  return V73;
});
