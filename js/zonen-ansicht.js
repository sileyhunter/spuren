/* V9.17.0 zonen-ansicht-1.0: «Intensitätszonen» wie bei enduco – ein Balken über die ganze Skala, darunter die Unterstufen (FatMax, Sweet Spot, VO2max …),
   darunter die Liste mit eingerückten Unterstufen. Reine Darstellung (ohne DOM, ohne Daten zu verändern): die Zonen und Unterstufen kommen unverändert aus dem
   aktiven Zonenprofil (V6.unterbereiche liest sie aus dem Text der Zone). Umschalter Sportart und Messgrösse (Puls · Leistung bzw. Pace). Texte eigen. */
(function () {
  "use strict";
  const ZA = { VERSION: "zonen-ansicht-1.0", KALORIEN_VERSION: "kalorien-schaetzung-1.0" };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc0 = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  ZA.SPORTEN = [["rad", "Rad"], ["lauf", "Laufen"]];
  ZA.METRIKEN = { leistung: "Leistung", puls: "Puls", pace: "Pace" };
  /** Zonen, deren Farbe hell ist: dunkle Schrift im Balken. */
  ZA.HELL = new Set(["z3", "z4", "z5"]);

  /** Verfügbare Sportarten mit ihren Messgrössen aus den Skalen des Zonenprofils → [{ sport, name, metriken: [{ k, name, skala }] }] (Reihenfolge Puls zuerst wie bei enduco). */
  ZA.angebot = function (skalen) {
    const out = [];
    for (const [sp, name] of ZA.SPORTEN) {
      const L = (skalen || []).filter((s) => s && s.disziplin === sp && ZA.METRIKEN[s.metrik] && Array.isArray(s.zonen) && s.zonen.length >= 2);
      if (!L.length) continue;
      const ord = ["puls", "leistung", "pace"];
      out.push({ sport: sp, name, metriken: L.sort((a, b) => ord.indexOf(a.metrik) - ord.indexOf(b.metrik)).map((s) => ({ k: s.metrik, name: ZA.METRIKEN[s.metrik], skala: s })) });
    }
    return out;
  };
  /** Auswahl auf etwas Vorhandenes zurückführen (unbekannte Sportart → erste, unbekannte Messgrösse → erste der Sportart). */
  ZA.waehle = function (angebot, sport, metrik) {
    const A = (angebot || []).find((a) => a.sport === sport) || (angebot || [])[0];
    if (!A) return null;
    const M = A.metriken.find((m) => m.k === metrik) || A.metriken[0];
    return { sport: A.sport, metrik: M.k, skala: M.skala, angebot: A };
  };

  /** Mittlerer Ruhepuls der letzten Tage (Median, ganze bpm) aus den Tageswerten [{ date, rhr }] – null, wenn weniger als 3 Werte. */
  ZA.ruhepuls = function (days, heuteISO, n) {
    const L = (days || []).filter((d) => d && isNum(d.rhr) && d.rhr > 25 && d.rhr < 120 && (!heuteISO || d.date <= heuteISO)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, n || 14).map((d) => d.rhr).sort((a, b) => a - b);
    if (L.length < 3) return null;
    const m = L.length >> 1;
    return Math.round(L.length % 2 ? L[m] : (L[m - 1] + L[m]) / 2);
  };

  /** Modell einer Skala: Spanne des Balkens, Zonen mit Anteil (0…100 %), Unterstufen mit Anteil, Teilstriche.
   *  V6 = Modul V6 (ZONEN, unterbereiche); opt = { ruhe, fmt }. Puls: Spanne von Ruhe-HF (falls bekannt und unter Z2) bis Max-HF; sonst die Spanne der Skala. */
  ZA.modell = function (s, V6, opt) {
    opt = opt || {};
    const fmt = opt.fmt || ((v) => String(Math.round(v)));
    const pace = s.metrik === "pace", puls = s.metrik === "puls";
    let a = s.umfang[0], b = s.umfang[1];
    const mx = puls && isNum(s.hfmax) && s.hfmax > 0 ? s.hfmax : null;
    if (puls) {
      const z2von = s.zonen[1] && isNum(s.zonen[1].von) ? s.zonen[1].von : null;
      if (isNum(opt.ruhe) && opt.ruhe > 0 && (z2von == null || opt.ruhe < z2von)) a = opt.ruhe;
      if (mx && mx > Math.max(...s.zonen.map((z) => (isNum(z.von) ? z.von : -Infinity)))) b = mx;
    }
    const breite = b - a;
    const frac = (v) => Math.max(0, Math.min(1, (v - a) / breite));
    const Z = s.zonen.map((z, i) => {
      const key = "z" + (i + 1), P = (V6 && V6.ZONEN && V6.ZONEN[key]) || { kurz: z.z || key.toUpperCase(), name: "", farbe: "#6e6e74" };
      const f1 = isNum(z.von) ? frac(z.von) : 0, f2 = isNum(z.bis) ? frac(z.bis) : 1;
      const von = Math.min(f1, f2), bis = Math.max(f1, f2);
      const unter = ((V6 && V6.unterbereiche ? V6.unterbereiche(z) : []) || []).map((u) => {
        const U = (V6.ZONEN && V6.ZONEN[u.key]) || V6.ZONEN.offen, g1 = frac(u.lo), g2 = frac(u.hi);
        return { key: u.key, name: U.name || u.key, farbe: U.farbe, lo: u.lo, hi: u.hi, von: Math.min(g1, g2) * 100, bis: Math.max(g1, g2) * 100, text: `${fmt(u.lo)}–${fmt(u.hi)}` };
      });
      return { key, kurz: z.z || P.kurz, name: P.name, farbe: P.farbe, hell: ZA.HELL.has(key), von: isNum(z.von) ? z.von : null, bis: isNum(z.bis) ? z.bis : null,
        x1: von * 100, x2: bis * 100, unter };
    });
    // Teilstriche an den Zonengrenzen; liegen zwei nahe beieinander, kommt der zweite in die zweite Zeile
    const werte = [a].concat(s.zonen.slice(1).map((z) => z.von).filter(isNum), [b]);
    const ticks = []; let letzteTief = false, letzteX = -99;
    werte.forEach((v, i) => {
      const x = frac(v) * 100, tief = i > 0 && !letzteTief && x - letzteX < 9;
      ticks.push({ wert: v, text: fmt(v), x, tief, rand: i === 0 ? "erste" : i === werte.length - 1 ? "letzte" : "" });
      letzteTief = tief; letzteX = x;
    });
    return { metrik: s.metrik, sport: s.disziplin, einheit: s.unit, pace, puls, von: a, bis: b, ruheAnfang: puls && a !== s.umfang[0] && isNum(opt.ruhe) && a === opt.ruhe, zonen: Z, ticks,
      hatUnter: Z.some((z) => z.unter.length), hfmax: mx };
  };

  /** Bereichstext einer Zone (wie die Liste unter den vier Skalen): «bis a», «a–b», «ab c (bis Max)»; bei Pace «langsamer als …» bzw. «schneller als …». */
  ZA.bereich = function (m, z, fmt) {
    const f = fmt || ((v) => String(Math.round(v))), u = m.pace ? " /km" : " " + m.einheit;
    if (z.von == null && z.bis == null) return "–";
    if (z.von == null) return m.pace ? `langsamer als ${f(z.bis)}${u}` : `bis ${f(z.bis)}${u}`;
    if (z.bis == null) return m.hfmax && z.von < m.hfmax ? `${f(z.von)}–${f(m.hfmax)}${u} (Max)` : m.pace ? `schneller als ${f(z.von)}${u} (bis Max)` : `ab ${f(z.von)}${u} (bis Max)`;
    return `${f(z.von)}–${f(z.bis)}${u}`;
  };


  /* V9.22.0 kalorien-schaetzung-1.0: Schalter «Kalorien» – grobe Schätzung je Zone (kcal/h, Fett und Kohlenhydrate g/h), nur aus Annahmen, die auf der Seite offen stehen.
     Keine Messung: Wirkungsgrad, Laufkosten und Fettanteile sind Richtwerte (Annahmen), die mit deinen Atemgas-/Laktatdaten zu prüfen sind. */
  ZA.ANNAHMEN = {
    wirkungsgrad: 0.23,          // Rad: Brutto-Wirkungsgrad (mechanisch ÷ umgesetzt), üblich 20–25 %
    lauf_kcal_kg_km: 1.0,        // Laufen: ca. 1 kcal je kg Körpergewicht und km (flach, ohne Wind)
    fett_anteil: { z1: 0.65, z2: 0.55, fatmax: 0.6, z3: 0.35, sweet: 0.25, z4: 0.15, z5: 0.05 },   // Anteil Fett am Energieumsatz (Richtwerte)
    kcal_kj: 4.184, kcal_g_fett: 9, kcal_g_kh: 4,
  };
  /** Mittelpunkt einer Zone (offene Enden: Annahme ±15–25 % über/unter der Grenze). Leistung: W, Pace: s/km. */
  ZA.mitte = function (z, pace) {
    const v = isNum(z.von) ? z.von : null, b = isNum(z.bis) ? z.bis : null;
    if (v != null && b != null) return (v + b) / 2;
    if (v == null && b != null) return pace ? b * 1.08 : b * 0.75;
    if (v != null && b == null) return pace ? v * 0.95 : v * 1.15;
    return null;
  };
  /** Umsatz je Stunde aus Leistung (W, Rad) bzw. Pace (s/km, Lauf) → kcal/h oder null. */
  ZA.kcalProStunde = function (sport, wert, kg, A) {
    A = A || ZA.ANNAHMEN;
    if (!isNum(wert) || wert <= 0) return null;
    if (sport === "rad") return (wert * 3.6) / (A.wirkungsgrad * A.kcal_kj);
    if (sport === "lauf") return isNum(kg) && kg > 0 ? A.lauf_kcal_kg_km * kg * (3600 / wert) : null;
    return null;
  };
  /** Schätzung je Zone und Unterstufe. m = Modell (Leistung bzw. Pace), opt = { kg }. → { ok, grund, zeilen: { z1: {kcal, fett_g, kh_g, fett_pct}, fatmax: …}, annahmen: [Text] } */
  ZA.kalorien = function (m, opt) {
    const A = ZA.ANNAHMEN, kg = opt && opt.kg, sport = m && m.sport;
    const text = [];
    if (sport === "rad") text.push(`Rad: Umsatz = Leistung × 3,6 ÷ (Wirkungsgrad ${Math.round(A.wirkungsgrad * 100)} % × 4,184) – Mitte der Zone`);
    if (sport === "lauf") text.push(`Laufen: ${String(A.lauf_kcal_kg_km).replace(".", ",")} kcal je kg und km${isNum(kg) ? ` (Körpergewicht ${Math.round(kg * 10) / 10} kg aus deinen Wägungen)` : ""} – Mitte der Zone`);
    text.push("Fettanteil je Zone als Richtwert: " + ["z1", "z2", "fatmax", "z3", "z4", "z5"].map((k) => `${k === "fatmax" ? "FatMax" : k.toUpperCase()} ${Math.round(A.fett_anteil[k] * 100)} %`).join(", "));
    if (!m || (m.metrik !== "leistung" && m.metrik !== "pace")) return { ok: false, grund: "Kalorien brauchen Leistung (Rad) oder Pace (Laufen).", zeilen: {}, annahmen: text };
    if (sport === "lauf" && !(isNum(kg) && kg > 0)) return { ok: false, grund: "Für Laufen fehlt das Körpergewicht (keine Wägung gefunden).", zeilen: {}, annahmen: text };
    const zeile = (wert, pct) => {
      const kcal = ZA.kcalProStunde(sport, wert, kg, A); if (kcal == null) return null;
      return { kcal: Math.round(kcal / 5) * 5, fett_pct: Math.round(pct * 100), fett_g: Math.round((kcal * pct) / A.kcal_g_fett), kh_g: Math.round((kcal * (1 - pct)) / A.kcal_g_kh) };
    };
    const zeilen = {};
    for (const z of m.zonen) {
      const pct = A.fett_anteil[z.key] != null ? A.fett_anteil[z.key] : 0.3;
      zeilen[z.key] = zeile(ZA.mitte({ von: z.von, bis: z.bis }, m.pace), pct);
      for (const u of z.unter) { const up = A.fett_anteil[u.key] != null ? A.fett_anteil[u.key] : pct; zeilen[z.key + ":" + u.key] = zeile((u.lo + u.hi) / 2, up); }
    }
    return { ok: true, grund: null, zeilen, annahmen: text };
  };
  /** Text einer Zeile: «≈ 640 kcal/h · Fett ≈ 38 g/h · KH ≈ 96 g/h». */
  ZA.kalorienText = function (z) {
    return z ? `≈ ${z.kcal} kcal/h · Fett ≈ ${z.fett_g} g · KH ≈ ${z.kh_g} g` : "–";
  };

  /** HTML des Balkens und der Liste (ohne Umschalter). o = { esc, fmt }. */
  ZA.html = function (m, o) {
    o = o || {};
    const esc = o.esc || esc0, fmt = o.fmt || ((v) => String(Math.round(v)));
    const pct = (x) => (Math.round(x * 100) / 100).toFixed(2);
    const seg = m.zonen.map((z) => `<div class="iz-z${z.hell ? " hell" : ""}" style="left:${pct(z.x1)}%;width:${pct(z.x2 - z.x1)}%;--zc:${esc(z.farbe)}" title="${esc(z.kurz)} ${esc(z.name)}: ${esc(ZA.bereich(m, z, fmt))}"><span>${esc(z.kurz)}</span></div>`).join("");
    const unt = m.zonen.map((z) => z.unter.map((u) => `<div class="iz-u" style="left:${pct(u.von)}%;width:${pct(u.bis - u.von)}%;--zc:${esc(u.farbe)}" title="${esc(u.name)}: ${esc(u.text)} ${esc(m.pace ? "/km" : m.einheit)}"></div>`).join("")).join("");
    const tix = m.ticks.map((t) => `<span class="iz-t${t.rand ? " " + t.rand : ""}${t.tief ? " tief" : ""}" style="left:${pct(t.x)}%">${esc(t.text)}</span>`).join("");
    const K = o.kcal && o.kcal.ok ? o.kcal.zeilen : null;
    const liste = m.zonen.map((z) => `<li style="--zc:${esc(z.farbe)}"><span class="zl-n"><b>${esc(z.kurz)}</b> ${esc(z.name)}</span><span class="zl-w">${esc(ZA.bereich(m, z, fmt))}${K ? `<br><span class="iz-kcal">${esc(ZA.kalorienText(K[z.key]))}</span>` : ""}</span></li>`
      + z.unter.map((u) => `<li class="unter" style="--zc:${esc(u.farbe)}"><span class="zl-n"><i class="zpunkt"></i>${esc(u.name)}</span><span class="zl-w">${esc(u.text)} ${esc(m.pace ? "/km" : m.einheit)}${K ? `<br><span class="iz-kcal">${esc(ZA.kalorienText(K[z.key + ":" + u.key]))}</span>` : ""}</span></li>`).join("")).join("");
    const rand = m.puls ? `<div class="iz-rand"><span>${m.ruheAnfang ? "Ruhe" : ""}</span><span>${m.hfmax ? "Max" : ""}</span></div>` : "";
    return `<div class="iz-bar" role="img" aria-label="Intensitätszonen von ${esc(fmt(m.von))} bis ${esc(fmt(m.bis))} ${esc(m.pace ? "/km" : m.einheit)}">${seg}</div>`
      + (m.hatUnter ? `<div class="iz-unter" aria-hidden="true">${unt}</div>` : "")
      + `<div class="iz-ticks${m.ticks.some((t) => t.tief) ? " zwei" : ""}" aria-hidden="true">${tix}</div>${rand}`
      + `<ul class="zliste iz-liste">${liste}</ul>`
      + (o.kcal ? `<div class="iz-annahmen"><b>Schätzung, keine Messung.</b> ${o.kcal.ok ? "" : esc(o.kcal.grund) + " "}Annahmen:<ul>${o.kcal.annahmen.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>Prüfen lässt sich das mit deinen Atemgas- und Laktatdaten.</div>` : "");
  };

  if (typeof module !== "undefined" && module.exports) module.exports = ZA;
  if (typeof window !== "undefined") window.ZA = ZA;
})();
