/* V8.1.1 Verpflegung je Einheit (verpflegung-1.0, Prompt von Silas vom 18.11.2026) – Rechenlogik ohne DOM.
   - Produkte: eigene Lebensmittel aus Garmin Connect (D.garmin_lebensmittel, vom Nacht-Update) und die Vorlagen des Fueling-Protokolls; Nährwerte nur von dort,
     was fehlt, bleibt unbekannt. Art (Gel, Getränk, Riegel, Frucht, Protein) aus Name und Nährwerten (eigene Einteilung), die Auswahl je Zweck legt Silas fest
     (Planeinstellung «pe-verpflegung»: unterwegs, vorher, nachher, mit Glukose + Fruktose, höchstens g/h).
   - Menge während der Einheit nach Dauer und Intensität (Richtwerte nach Jeukendrup 2014 und Thomas et al. 2016): bis 60–75 min nichts (harte Einheiten
     ab 45 min eine kleine Menge in einer Pause), bis 2 h etwa 30 g/h (hart 45 g/h, eigene Festlegung innerhalb 30–60), 2–2,5 h bis 60 g/h, ab 2,5 h die eigene
     Stufe (Standard 60 g/h), über 60 g/h nur mit Produkten aus Glukose und Fruktose. Schwimmen nichts während.
   - Vorher (Mahlzeit 1–4 h vorher, Snack 30–60 min vorher bei harten oder langen Einheiten), nachher (Protein etwa 0,25 g/kg bzw. 20–40 g, Kohlenhydrate rasch nur
     vor der nächsten harten oder langen Einheit innert 8 h), Zeitplan entlang der Abschnitte (nie im harten Teil), Packliste, Natrium aus den Produkten.
   - Anpassung je Einheit «vp-<Datum>-<uid>» (g/h, Produkte, ohne Verpflegung), Vergleich geplant gegen genommen, Hinweis zum Darmtraining. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VP = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VP = { VERSIONS: { verpflegung: "verpflegung-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const r5 = (x) => Math.round(x / 5) * 5;
  const runden = (x, n) => { const f = Math.pow(10, n || 0); return Math.round(x * f) / f; };
  const komma = (x) => String(x).replace(".", ",");

  VP.ART_WORT = { gel: "Gel", getraenk: "Getränk", riegel: "Riegel", frucht: "Frucht", protein: "Protein", anderes: "anderes" };
  VP.MIX = ["auto", "gel", "getraenk", "fest"];
  VP.MIX_WORT = { auto: "automatisch", gel: "nur Gels", getraenk: "Getränk zuerst", fest: "feste Nahrung zuerst" };
  VP.STANDARD_MAX = 60;                      // g/h ab 2,5 h, solange keine eigene Stufe gesetzt ist (Darmtraining erst erproben)
  VP.START_MIN = 20;                         // erste Einnahme nach 20–30 min
  VP.RASCH_STD = 8;                          // rasch auffüllen nur, wenn die nächste harte oder lange Einheit weniger als 8 h später kommt (Thomas et al. 2016)
  // Abschnitte, in denen nichts gegessen wird (hart); Renntempo und Tempo gelten als mittel (dort essen ist möglich, aber nicht ideal)
  const HART = new Set(["vo2", "z3o", "z4", "z5", "css", "test", "sprint", "schwelle"]);
  const DRAUSSEN_SPORT = new Set(["wandern", "skitour", "langlauf", "trail"]);

  /* ---------------- Produkte ---------------- */
  /** Art eines Produkts aus Name, Marke und Nährwerten je Portion (eigene Einteilung). */
  VP.art = function (p) {
    const t = `${p.name || ""} ${p.marke || ""}`.toLowerCase(), kh = isNum(p.kh) ? p.kh : 0, pr = isNum(p.protein) ? p.protein : 0;
    if (pr >= 10 && pr >= 2 * kh) return "protein";
    if (/\bgel\b|\bgels\b/.test(t)) return "gel";
    if (/getr[äa]nk|drink|electrofuel|elektrolyt|isotoni|competition|\biso\b/.test(t) && kh >= 10) return "getraenk";
    if (/riegel|\bbar\b|oat bakes/.test(t)) return "riegel";
    if (/banane|apfel|orange|mandarine|birne|dattel|feige|rosine|traube/.test(t)) return "frucht";
    return "anderes";
  };
  /** Portion eines Garmin-Eintrags: ein Stück (SERVING/PIECE), eine feste Menge (z. B. 70 g = 1 Flasche) oder nach Gewicht (pro 100 g/ml). */
  function portionGarmin(x, art) {
    const ein = String(x.einheit || "").toUpperCase(), g = ein === "G" || ein === "ML", m = x.menge, name = x.name || "";
    const nach = g && m === 100;
    let text;
    if (!g) text = art === "gel" ? "1 Gel" : art === "riegel" ? "1 Riegel" : art === "frucht" ? "1 Stück" : "1 Portion";
    else if (nach) text = `100 ${ein === "G" ? "g" : "ml"}`;
    else {
      const u = ein === "G" ? "g" : "ml", mm = komma(runden(m, 1));
      text = /flasche/i.test(name) ? `1 Flasche (${mm} ${u} Pulver)` : /scoop/i.test(name) ? `1 Scoop (${mm} ${u})` : art === "riegel" ? `1 Riegel (${mm} ${u})`
        : art === "gel" ? `1 Gel (${mm} ${u})` : `1 Portion (${mm} ${u})`;
    }
    return { text, nachGewicht: nach, einheit: g ? (ein === "G" ? "g" : "ml") : null, basis: m };
  }
  /** Kurzer Name für die Anzeige: ohne Klammerzusätze, mit Marke, wenn sie im Namen fehlt; «mit Schale» bleibt (das Gewicht hängt daran). */
  VP.anzeige = function (p) {
    let n = String(p.name || "").replace(/\s*\(.*$/, "").replace(/\s+[–-]\s+.*$/, "").trim() || String(p.name || "");
    if (p.marke && !n.toLowerCase().includes(String(p.marke).toLowerCase())) n = `${p.marke} ${n}`;
    if (/mit schale/i.test(p.name || "")) n += " (mit Schale)";
    return n;
  };
  /** Alle Produkte: Garmin (D.garmin_lebensmittel) und Vorlagen des Fueling-Protokolls (fueling_produkte). Doppelte (gleiche Art, Marke, KH, kcal) einmal,
   *  der Eintrag mit mehr bekannten Werten bleibt. → [{id, name, marke, art, quelle, portion: {text, nachGewicht, einheit, basis}, kh, natrium, protein, kcal, koffein}] */
  VP.produkte = function (D, vorlagen) {
    const out = [];
    for (const x of (D && D.garmin_lebensmittel) || []) {
      if (!x || !x.id || !x.name) continue;
      const art = VP.art(x);
      out.push({ id: x.id, name: x.name, marke: x.marke || null, art, quelle: "garmin", portion: portionGarmin(x, art), kh: isNum(x.kh) ? x.kh : null,
        natrium: isNum(x.natrium) ? x.natrium : null, protein: isNum(x.protein) ? x.protein : null, kcal: isNum(x.kcal) ? x.kcal : null, koffein: null, zucker: isNum(x.zucker) ? x.zucker : null });
    }
    const ART_V = { Gel: "gel", Getränk: "getraenk", Riegel: "riegel" };
    for (const p of vorlagen || (D && D.fueling_produkte) || []) {
      if (!p || !p.id || !p.name) continue;
      const art = ART_V[p.art] || VP.art({ name: p.name, kh: p.kh_g });
      out.push({ id: String(p.id), name: p.name, marke: null, art, quelle: "vorlage", portion: { text: art === "getraenk" ? "1 Flasche" : art === "gel" ? "1 Gel" : art === "riegel" ? "1 Riegel" : "1 Portion", nachGewicht: false, einheit: null, basis: 1 },
        kh: isNum(p.kh_g) ? p.kh_g : null, natrium: isNum(p.natrium_mg) ? p.natrium_mg : null, protein: null, kcal: null, koffein: isNum(p.koffein_mg) ? p.koffein_mg : null, zucker: null });
    }
    const bekannt = (p) => ["kh", "natrium", "protein", "kcal", "zucker"].filter((k) => p[k] != null).length;
    const m = new Map();
    for (const p of out) {
      const k = p.portion.nachGewicht ? "id|" + p.id : [p.art, (p.marke || "").toLowerCase(), p.kh, p.kcal, p.portion.nachGewicht].join("|");
      const a = m.get(k);
      if (!a) { p.namen = [p.name]; m.set(k, p); continue; }
      const namen = a.namen.concat([p.name]);                         // alle Namen bleiben (das Fueling-Protokoll kennt evtl. den anderen)
      if (bekannt(p) > bekannt(a)) { p.namen = namen; m.set(k, p); } else a.namen = namen;
    }
    const L = [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
    for (const p of L) p.anzeige = VP.anzeige(p);
    return L;
  };
  /** Auswahl je Zweck. e = Planeinstellung «pe-verpflegung» (oder null): ohne eigene Auswahl unterwegs Gels, Getränke und Früchte, vorher Früchte und Riegel,
   *  nachher Protein. Unbekannte IDs (z. B. in Garmin gelöscht) fallen weg. */
  VP.wahl = function (P, e, genutzt) {
    // Rangfolge: deine Reihenfolge in der Auswahl; ohne Auswahl, was im Fueling-Protokoll schon oft vorkommt (genutzt: Map Name → Anzahl)
    const oft = (p) => (genutzt && genutzt.get ? (p.namen || [p.name]).reduce((s, n) => s + (genutzt.get(n) || 0), 0) : 0);
    const nach = (ids, std, vorne) => {
      if (Array.isArray(ids)) return ids.map((i) => P.find((p) => p.id === i)).filter(Boolean).map((p, i) => Object.assign({}, p, { rang: i }));
      const L = P.filter(std).sort((a, b) => (vorne ? vorne(b) - vorne(a) : 0) || oft(b) - oft(a));
      // ohne eigene Auswahl zählt eine Rangfolge nur, wo sie etwas bedeutet (Vorrang oder schon genutzt), sonst entscheiden Portion und Nährwerte
      return L.map((p, i) => Object.assign({}, p, { rang: (vorne && vorne(p) > 0) || oft(p) > 0 ? i : undefined }));
    };
    const eig = !!(e && (e.unterwegs || e.davor || e.danach));      // gespeichert als davor/danach («vorher» trägt in den Planeinstellungen schon die Fassung der laufenden Woche)
    return {
      unterwegs: nach(e && e.unterwegs, (p) => ["gel", "getraenk", "frucht"].includes(p.art) && isNum(p.kh) && p.kh > 0),
      // vorher ohne eigene Auswahl: Banane zuerst (übliche Praxis), dann Riegel, dann andere Früchte (eigene Festlegung)
      vorher: nach(e && e.davor, (p) => ["frucht", "riegel"].includes(p.art) && isNum(p.kh) && p.kh > 0, (p) => (/banane/i.test(p.name) ? 2 : p.art === "riegel" ? 1 : 0)),
      nachher: nach(e && e.danach, (p) => p.art === "protein" && isNum(p.protein)),
      fruktose: new Set((e && e.fruktose) || []),
      max_g_h: e && isNum(e.max_g_h) ? e.max_g_h : VP.STANDARD_MAX, eigen: eig,
    };
  };

  /* ---------------- Ziel während der Einheit ---------------- */
  /** Abschnitte mit Minute von–bis; hart = kein Essen. */
  function zeitachse(e) {
    const L = []; let t = 0;
    for (const [k, m] of Array.isArray(e.teile) ? e.teile : []) { if (!isNum(m) || m <= 0) continue; L.push({ k, von: t, bis: t + m, hart: HART.has(k) }); t += m; }
    return L;
  }
  function hartMinuten(e) {
    if (e.minuten && isNum(e.minuten.hart)) return e.minuten.hart;
    return zeitachse(e).filter((x) => x.hart).reduce((s, x) => s + x.bis - x.von, 0);
  }
  /** Zielmenge während der Einheit. a = Anpassung (vp-…) oder null, W = VP.wahl(...). → {stufe, g_h, gruende[], dauer, hart} */
  VP.ziel = function (e, W, a) {
    const d = isNum(e.dauer) ? e.dauer : 0, sp = e.sport, hm = hartMinuten(e);
    const hart = hm >= 10 || e.art === "schluessel" || e.art === "schluessel_s" || e.art === "test";
    const out = { stufe: "nichts", g_h: 0, gruende: [], dauer: d, hart };
    if (sp === "schwimm") { out.gruende.push("Schwimmen: während nichts, Wasser am Beckenrand"); return out; }
    if (sp === "kraft" || sp === "mobility" || e.art === "kraft") { out.gruende.push("Krafttraining: während nur Wasser"); return out; }
    if (e.art === "test") { out.stufe = "test"; out.gruende.push("Test: gleich wie beim letzten Test essen und trinken – nichts Neues"); return out; }
    if (a && a.aus) { out.stufe = "aus"; out.gruende.push("von dir: ohne Verpflegung"); return out; }
    let g = 0;
    if (d < 75) {
      if (hart && d >= 45) { out.stufe = "klein"; out.g_h = null; out.gruende.push("unter 75 min: eine kleine Menge in einer Pause genügt (oder nichts)"); }
      else out.gruende.push("unter 75 min: nichts nötig, Wasser");
      if (!(a && isNum(a.g_h) && a.g_h > 0)) return out;
    }
    else if (d < 120) { g = hart ? 45 : 30; out.gruende.push(hart ? "1–2 h mit harten Abschnitten: 45 g/h (Richtwert 30–60)" : "1–2 h: etwa 30 g/h"); }
    else if (d < 150) { g = 60; out.gruende.push("2–2,5 h: 60 g/h"); }
    else { g = Math.min(W ? W.max_g_h : VP.STANDARD_MAX, 120); out.gruende.push(`ab 2,5 h: deine Stufe ${g} g/h (Richtwert bis 90 g/h, mit Übung)`); }
    if (a && isNum(a.g_h)) { g = a.g_h; out.gruende.push(`von dir angepasst: ${g} g/h`); }
    const fruk = W && W.unterwegs.some((p) => W.fruktose.has(p.id));
    if (g > 60 && !fruk) { g = 60; out.gruende.push("über 60 g/h nur mit Produkten aus Glukose und Fruktose – markiere sie in der Auswahl"); }
    out.g_h = g; out.stufe = g > 0 ? "ja" : "nichts";
    return out;
  };

  /* ---------------- Produkte verteilen ---------------- */
  function bevorzugt(sp, mix) {
    if (mix === "gel") return ["gel"];
    if (mix === "getraenk") return ["getraenk", "gel", "frucht"];
    if (mix === "fest") return ["riegel", "frucht", "gel", "getraenk"];
    if (sp === "lauf") return ["gel"];
    if (DRAUSSEN_SPORT.has(sp)) return ["riegel", "frucht", "gel", "getraenk"];
    return ["getraenk", "gel", "frucht", "riegel"];
  }
  /** Bestes Produkt einer Art: zuerst die Rangfolge der Auswahl (VP.wahl), dann feste Portion vor «nach Gewicht», bekannte Natriumwerte, mehr KH je Portion. */
  function bestes(L, art) {
    const K = L.filter((p) => p.art === art && isNum(p.kh) && p.kh > 0);
    K.sort((a, b) => ((isNum(a.rang) ? a.rang : 99) - (isNum(b.rang) ? b.rang : 99)) || (a.portion.nachGewicht - b.portion.nachGewicht)
      || ((b.natrium != null) - (a.natrium != null)) || (b.kh - a.kh));
    return K[0] || null;
  }
  /** G g Kohlenhydrate auf ganze Portionen bzw. Gramm verteilen. → [{p, n (Portionen) oder gramm, kh, natrium}] */
  function verteilen(G, sp, mix, L) {
    const arten = bevorzugt(sp, mix).filter((a) => bestes(L, a));
    const out = []; let rest = G;
    // lange Ausfahrten: das Getränk deckt höchstens zwei Drittel, den Rest Gels – Abwechslung und weniger Flaschen (eigene Festlegung)
    const deckel = (art) => (art === "getraenk" && sp === "rad" && (!mix || mix === "auto") && G >= 120 && arten.includes("gel") ? G * 0.65 : Infinity);
    arten.forEach((art, i) => {
      if (rest < 15) return;
      const p = bestes(L, art), letzte = i === arten.length - 1, dk = deckel(art);
      if (p.portion.nachGewicht) {
        const g = r5(((letzte ? rest : rest * 0.6) / p.kh) * 100);
        if (g <= 0) return;
        const kh = (g / 100) * p.kh; rest -= kh;
        out.push({ p, gramm: g, n: null, kh: runden(kh, 0), natrium: p.natrium != null ? runden((g / 100) * p.natrium, 0) : null });
        return;
      }
      // erste Art: ganze Portionen bis zur Menge (Getränk höchstens zwei Drittel), weitere Arten auf die nächste ganze Portion
      let n = i === 0 && !letzte ? Math.floor(Math.min(rest, dk) / p.kh + 0.25) : Math.round(rest / p.kh);
      if (letzte && n === 0 && rest >= p.kh * 0.5) n = 1;
      if (n <= 0) return;
      rest -= n * p.kh;
      out.push({ p, n, gramm: null, kh: runden(n * p.kh, 0), natrium: p.natrium != null ? runden(n * p.natrium, 0) : null });
    });
    return out;
  }
  /** Minute t ausserhalb harter Abschnitte: liegt t in einem harten Teil oder in einer kurzen Pause dazwischen (unter 2 min, z. B. 15 s), dann der Beginn des
   *  nächsten lockeren Teils von mindestens 2 min (ganze Minute darin). */
  function ausserhalbHart(t, achse) {
    const a = achse.find((x) => t >= x.von && t < x.bis);
    const kurz = (x) => !x.hart && x.bis - x.von < 2;
    if (!a || (!a.hart && !kurz(a))) return t;
    let i = achse.indexOf(a); while (i < achse.length && (achse[i].hart || kurz(achse[i]))) i++;
    if (i >= achse.length) return t;
    const z = achse[i], m = Math.ceil(z.von);
    return m < z.bis ? m : Math.round(z.von);
  }

  /* ---------------- Empfehlung ---------------- */
  /** Verpflegung zu einer Einheit. ctx = { W (VP.wahl), kg, anpassung (vp-…), naechsteStd (Stunden bis zur nächsten harten oder langen Einheit nach dem Ende),
   *  schweiss_ml_h, genutzt (Set der Produktnamen, die schon im Fueling-Protokoll stehen) }. */
  VP.plan = function (e, ctx) {
    ctx = ctx || {};
    const W = ctx.W || VP.wahl([], null), kg = isNum(ctx.kg) ? ctx.kg : null, a = ctx.anpassung || null;
    const Z = VP.ziel(e, W, a), d = Z.dauer, achse = zeitachse(e);
    const R = { v: VP.VERSIONS.verpflegung, ziel: Z, vorher: [], waehrend: { produkte: [], zeitplan: [], kh: 0, g_h: 0, natrium: null, gramm: null, text: [] },
      nachher: [], packliste: [], hinweise: [], annahmen: [], angepasst: !!a };

    /* während */
    const L = W.unterwegs;
    if (Z.stufe === "ja" || (Z.stufe === "klein" && L.length)) {
      const G = Z.stufe === "klein" ? 25 : (Z.g_h * d) / 60;
      const V = L.length ? verteilen(G, e.sport, a && a.mix, L) : [];
      if (!V.length) R.waehrend.gramm = Math.round(G);
      R.waehrend.produkte = V;
      R.waehrend.kh = V.length ? V.reduce((s, x) => s + x.kh, 0) : Math.round(G);
      R.waehrend.g_h = d > 0 ? Math.round((R.waehrend.kh * 60) / d) : 0;
      const na = V.filter((x) => x.natrium != null);
      R.waehrend.natrium = V.length && na.length === V.length ? na.reduce((s, x) => s + x.natrium, 0) : null;
      // Zeitplan: Stück-Produkte gleichmässig ab Minute 20 bis 10 min vor Schluss, nie im harten Teil; Getränke als Flaschen über die Zeit
      const ende = Math.max(VP.START_MIN, d - 10), stueck = [];
      for (const x of V) {
        if (x.p.art === "getraenk") {
          const fl = x.n || 1, je = d / fl, wie = Z.hart ? "in den Pausen in kleinen Schlucken" : "in kleinen Schlucken alle 10–15 min";
          for (let i = 0; i < fl; i++) R.waehrend.zeitplan.push({ min: Math.round(i * je), bis: Math.round((i + 1) * je), text: `${x.p.anzeige || x.p.name}: ${x.n ? x.p.portion.text : `${x.gramm} ${x.p.portion.einheit || "g"} Pulver`}, ${wie}`, art: "getraenk" });
        } else if (x.n) for (let i = 0; i < x.n; i++) stueck.push(x);
        else stueck.push(x);
      }
      if (Z.stufe === "klein") {
        const p = achse.find((s, i) => !s.hart && i > 0 && achse[i - 1].hart && s.von >= VP.START_MIN);
        const t = p ? p.von : Math.round(d / 2);
        if (stueck.length) R.waehrend.zeitplan.push({ min: t, text: `${stueck[0].p.anzeige || stueck[0].p.name}: ${stueck[0].n ? stueck[0].p.portion.text : stueck[0].gramm + " g"} (oder nichts)`, art: stueck[0].p.art });
      } else stueck.forEach((x, i) => {
        // gleichmässig zwischen Minute 20 und 10 min vor Schluss (erste nach 20–30 min), nie im harten Teil
        const t0 = VP.START_MIN + ((i + 0.5) * (ende - VP.START_MIN)) / stueck.length;     // Mitte gleich langer Abschnitte
        const t = ausserhalbHart(Math.max(VP.START_MIN, r5(t0)), achse);
        R.waehrend.zeitplan.push({ min: t, text: `${x.p.anzeige || x.p.name}: ${x.n ? x.p.portion.text : `${x.gramm} ${x.p.portion.einheit || "g"}`}`, art: x.p.art });
      });
      R.waehrend.zeitplan.sort((x, y) => x.min - y.min);
      if (!V.length) R.waehrend.text.push(`≈ ${Math.round(G)} g Kohlenhydrate${Z.stufe === "klein" ? " (eine kleine Menge, oder nichts)" : `, etwa ${Z.g_h} g/h`} – wähle dafür deine Produkte in der Auswahl`);
      if (e.sport === "lauf" && !V.some((x) => x.p.art === "gel") && V.length) R.hinweise.push("Beim Laufen sind Gels meist am einfachsten; ein Getränk nur mit Flasche oder Gurt.");
    } else if (Z.stufe === "test") R.waehrend.text.push("wie beim letzten Test");
    else R.waehrend.text.push(Z.stufe === "aus" ? "ohne Verpflegung (von dir so gewählt)" : "nichts nötig – Wasser nach Durst");

    /* Flüssigkeit und Natrium */
    if (d >= 60 && e.sport !== "schwimm") {
      R.waehrend.text.push(isNum(ctx.schweiss_ml_h) ? `Trinken nach Durst; Garmin schätzt deinen Schweissverlust auf etwa ${r5(ctx.schweiss_ml_h)} ml/h` : "Trinken nach Durst, über 90 min regelmässig");
      if (e.drinnen) R.waehrend.text.push("drinnen schwitzt du stärker: Ventilator, eher mehr trinken");
      if (d >= 120) R.waehrend.text.push("über 2 h und bei Hitze auf Salz achten (Getränk mit Natrium)");
    }

    /* vorher */
    const lang = d >= 90 || e.art === "lang";
    if (e.sport === "schwimm" || e.sport === "kraft" || e.sport === "mobility") R.vorher.push({ text: "normale Mahlzeit, nicht direkt davor gross essen" });
    else if (Z.hart || lang) {
      R.vorher.push({ text: `Mahlzeit mit Kohlenhydraten 1–4 h vorher: etwa 1 g pro kg und Stunde Abstand${kg ? ` (bei dir ≈ ${Math.round(kg)} g je Stunde)` : ""}`, regel: "Thomas et al. 2016" });
      const S = bestes(W.vorher, "frucht") || bestes(W.vorher, "riegel") || bestes(W.vorher, "gel");
      if (S) {
        const g = S.portion.nachGewicht ? r5((25 / S.kh) * 100) : null, n = S.portion.nachGewicht ? null : Math.max(1, Math.round(25 / S.kh));
        R.vorher.push({ text: `30–60 min vorher: ${S.anzeige || S.name} – ${g ? `${g} ${S.portion.einheit || "g"}` : n === 1 ? S.portion.text : n + " × " + S.portion.text} (≈ ${Math.round(g ? (g / 100) * S.kh : n * S.kh)} g KH)`, produkt: S.id,
          kurz: `${S.anzeige || S.name} ${g ? `${g} ${S.portion.einheit || "g"}` : n === 1 ? "" : n + " ×"}`.trim() });
      } else R.vorher.push({ text: "30–60 min vorher ein kleiner Snack mit etwa 20–30 g Kohlenhydraten (z. B. eine Banane)" });
      if (e.uhrzeit && e.uhrzeit < "08:30") R.vorher.push({ text: "früh am Morgen: das Frühstück klein halten oder nur den Snack" });
    } else R.vorher.push({ text: "nichts extra nötig" });

    /* nachher */
    if (d >= 60 || Z.hart || e.sport === "kraft") {
      const ziel = kg ? Math.max(20, Math.min(40, Math.round(0.25 * kg))) : null, P = bestes(W.nachher, "protein") || W.nachher.find((p) => isNum(p.protein) && p.protein > 0);
      if (P && isNum(P.protein) && P.protein > 0) {
        const n = Math.max(1, Math.round(((ziel || 25) / P.protein) * 2) / 2);
        R.nachher.push({ text: `innert 2 h: ${komma(n)} × ${P.anzeige || P.name} (${P.portion.text}; ≈ ${Math.round(n * P.protein)} g Protein${ziel ? `, Ziel ≈ ${ziel} g` : ""})`, produkt: P.id });
      } else R.nachher.push({ text: `innert 2 h ${ziel ? `≈ ${ziel} g` : "20–40 g"} Protein` });
      if (isNum(ctx.naechsteStd) && ctx.naechsteStd < VP.RASCH_STD && (Z.hart || lang)) R.nachher.push({ text: `rasch Kohlenhydrate auffüllen: 1–1,2 g pro kg in der ersten Stunde${kg ? ` (≈ ${Math.round(kg)}–${Math.round(1.2 * kg)} g)` : ""} – die nächste harte oder lange Einheit kommt in ${Math.round(ctx.naechsteStd)} h` });
      else R.nachher.push({ text: "danach eine normale Mahlzeit; kein extra Auffüllen nötig" });
    }

    /* Packliste und Hinweise */
    if (R.waehrend.produkte.length && d >= 90) {
      R.packliste = R.waehrend.produkte.map((x) => x.n ? `${x.n} × ${x.p.anzeige || x.p.name} (${x.p.portion.text})` : `${x.gramm} ${x.p.portion.einheit || "g"} ${x.p.anzeige || x.p.name}`);
      const fl = R.waehrend.produkte.filter((x) => x.p.art === "getraenk").reduce((s, x) => s + (x.n || 1), 0);
      if (e.sport === "rad" && fl > 2) R.packliste.push(`2 Flaschen am Rad, Pulver für ${fl - 2 === 1 ? "eine weitere" : `${fl - 2} weitere`} zum Nachfüllen (Wasser unterwegs)`);
      if (e.sport === "lauf" && d >= 90) R.packliste.push("Wasser: Gurt, Flasche oder Brunnen auf der Strecke");
    }
    if ((Array.isArray(e.teile) ? e.teile : []).some(([k]) => k === "renntempo") && d >= 90) R.hinweise.push("Renn-Fueling üben: dieselben Produkte und Zeitpunkte wie im Rennen.");
    if (Z.stufe === "ja" && d >= 150 && W.max_g_h < 90) R.hinweise.push("Darmtraining: die Menge in langen Einheiten erst steigern, wenn der Magen bei der jetzigen Stufe mitmacht.");
    if (ctx.genutzt && (Z.hart || e.art === "test") && R.waehrend.produkte.some((x) => !ctx.genutzt.has(x.p.name)))
      R.hinweise.push("Ein Produkt steht noch nicht in deinem Fueling-Protokoll: ein neues nie zuerst in einer Schlüsseleinheit oder im Rennen.");
    R.annahmen.push("Richtwerte nach Jeukendrup 2014 und Thomas et al. 2016; eigene Festlegungen im Wissen gekennzeichnet");
    R.annahmen.push("Nährwerte aus deinen Einträgen in Garmin Connect bzw. im Fueling-Protokoll");
    if (kg) R.annahmen.push(`Gewicht ${komma(runden(kg, 1))} kg (letzte Morgenmessung)`);
    return R;
  };
  /** Kurzform für Heute und Kalender: «1 Banane vorher · 2 Gels · 1 Flasche». */
  VP.kurz = function (R) {
    if (!R) return "";
    const w = R.waehrend, t = [];
    const v = R.vorher.find((x) => x.produkt);
    if (v && v.kurz) t.push(`vorher ${v.kurz}`);
    const pro = R.ziel.stufe === "ja" && isNum(w.g_h) && w.g_h > 0 ? `≈ ${w.g_h} g/h` : "";
    if (w.produkte.length) t.push(`während${pro ? " " + pro : ""}: ${w.produkte.map((x) => x.n ? `${x.n} × ${kurzName(x.p)}` : `${x.gramm} g ${kurzName(x.p)}`).join(" + ")}`);
    else if (w.gramm) t.push(`während ≈ ${w.gramm} g KH${pro ? ` (${pro})` : ""}`);
    if (!t.length) return R.ziel.stufe === "nichts" ? "nichts nötig" : "";
    return t.join(" · ");
  };
  function kurzName(p) {
    if (p.art === "gel") return "Gel";
    if (p.art === "riegel") return "Riegel";
    if (p.art === "getraenk" && !p.portion.nachGewicht) return /flasche/i.test(p.portion.text) ? "Flasche Getränk" : p.portion.text.replace(/^1 /, "").replace(/\s*\(.*$/, "");
    return p.anzeige || p.name;
  }

  /* ---------------- Anpassung je Einheit ---------------- */
  const ID_RE = /^[A-Za-z0-9_.:+-]{1,80}$/;
  const istDatum = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
  /** «vp-<Datum>-<uid>» prüfen (gleiche Regeln wie tools/verpflegung.py pruefen). → null oder Grund */
  VP.pruefen = function (e) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return "kein Eintrag";
    if (!istDatum(e.datum)) return "Datum fehlt";
    if (typeof e.uid !== "string" || !ID_RE.test(e.uid)) return "Einheit fehlt";
    if (e.id !== `vp-${e.datum}-${e.uid}`) return "Kennung passt nicht zu Tag und Einheit";
    if (typeof e.geaendert !== "string" || isNaN(Date.parse(e.geaendert))) return "ohne Zeitpunkt der Änderung";
    if ("entfernt" in e && e.entfernt !== true) return "entfernt nur ja";
    if (e.entfernt === true) return null;
    if (e.g_h != null && !(Number.isInteger(e.g_h) && e.g_h >= 0 && e.g_h <= 120 && e.g_h % 5 === 0)) return "Kohlenhydrate 0–120 g pro Stunde in 5er-Schritten";
    if (e.mix != null && !VP.MIX.includes(e.mix)) return "unbekannte Auswahl der Produkte";
    if (e.aus != null && typeof e.aus !== "boolean") return "ohne Verpflegung ja oder nein";
    if (e.g_h == null && (e.mix == null || e.mix === "auto") && e.aus !== true) return "keine Änderung";
    return null;
  };
  VP.eintrag = function (ds, uid, felder, jetzt) {
    const e = Object.assign({ id: `vp-${ds}-${uid}`, datum: ds, uid }, felder || {}, { v: VP.VERSIONS.verpflegung, geaendert: jetzt || new Date().toISOString() });
    for (const k of Object.keys(e)) if (e[k] == null) delete e[k];
    return VP.pruefen(e) ? null : e;
  };
  /** Gültige Anpassung einer Einheit aus gespeicherten und noch nicht gesendeten Einträgen (neueste Fassung zählt; entfernt = keine). */
  VP.anpassung = function (gespeichert, offen, ds, uid) {
    const id = `vp-${ds}-${uid}`;
    const L = [...(gespeichert || []), ...(offen || [])].filter((x) => x && x.id === id && !VP.pruefen(x));
    L.sort((a, b) => String(a.geaendert).localeCompare(String(b.geaendert)));
    const z = L[L.length - 1];
    return z && !z.entfernt ? z : null;
  };

  /* ---------------- Nachher: geplant gegen genommen, Darmtraining ---------------- */
  /** geplante g/h gegen genommene g/h (Fueling-Protokoll, FK.fuelingTotals). → {geplant, genommen, urteil} oder null */
  VP.vergleich = function (R, totals) {
    if (!R || R.ziel.stufe !== "ja" || !totals || !isNum(totals.kh_g_h)) return null;
    const g = R.waehrend.g_h, n = runden(totals.kh_g_h, 0), dlt = n - g;
    return { geplant: g, genommen: n, urteil: Math.abs(dlt) <= 10 ? "wie geplant" : dlt < 0 ? "weniger als geplant" : "mehr als geplant" };
  };
  /** Darmtraining: L = lange Einheiten (ab 2 h) der letzten 8 Wochen, neueste zuerst: {genommen (g/h), magen: ok/leicht/stark}.
   *  Zweimal hintereinander starke Beschwerden → eine Stufe zurück; dreimal ohne Beschwerden auf der Stufe → eine Stufe höher vorschlagen (eigene Festlegung). */
  VP.darm = function (L, max) {
    const m = (L || []).filter((x) => x && x.magen);
    if (m.length >= 2 && m[0].magen === "stark" && m[1].magen === "stark") return { art: "runter", vorschlag: Math.max(30, max - 10), text: "Zweimal hintereinander starke Magenbeschwerden: eine Stufe zurück, bis es wieder geht." };
    const ok = m.slice(0, 3);
    if (ok.length === 3 && ok.every((x) => x.magen === "ok" && isNum(x.genommen) && x.genommen >= max - 5) && max < 90)
      return { art: "hoch", vorschlag: max + 10, text: `Dreimal ohne Beschwerden bei etwa ${max} g/h: du kannst ${max + 10} g/h versuchen.` };
    return null;
  };

  VP._intern = { zeitachse, verteilen, bestes, ausserhalbHart, portionGarmin, hartMinuten };
  return VP;
});
