/* V9.17.0 zonen-ansicht-1.0: «Intensitätszonen» wie bei enduco – ein Balken über die ganze Skala, darunter die Unterstufen (FatMax, Sweet Spot, VO2max …),
   darunter die Liste mit eingerückten Unterstufen. Reine Darstellung (ohne DOM, ohne Daten zu verändern): die Zonen und Unterstufen kommen unverändert aus dem
   aktiven Zonenprofil (V6.unterbereiche liest sie aus dem Text der Zone). Umschalter Sportart und Messgrösse (Puls · Leistung bzw. Pace). Texte eigen. */
(function () {
  "use strict";
  const ZA = { VERSION: "zonen-ansicht-1.0" };
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

  /** HTML des Balkens und der Liste (ohne Umschalter). o = { esc, fmt }. */
  ZA.html = function (m, o) {
    o = o || {};
    const esc = o.esc || esc0, fmt = o.fmt || ((v) => String(Math.round(v)));
    const pct = (x) => (Math.round(x * 100) / 100).toFixed(2);
    const seg = m.zonen.map((z) => `<div class="iz-z${z.hell ? " hell" : ""}" style="left:${pct(z.x1)}%;width:${pct(z.x2 - z.x1)}%;--zc:${esc(z.farbe)}" title="${esc(z.kurz)} ${esc(z.name)}: ${esc(ZA.bereich(m, z, fmt))}"><span>${esc(z.kurz)}</span></div>`).join("");
    const unt = m.zonen.map((z) => z.unter.map((u) => `<div class="iz-u" style="left:${pct(u.von)}%;width:${pct(u.bis - u.von)}%;--zc:${esc(u.farbe)}" title="${esc(u.name)}: ${esc(u.text)} ${esc(m.pace ? "/km" : m.einheit)}"></div>`).join("")).join("");
    const tix = m.ticks.map((t) => `<span class="iz-t${t.rand ? " " + t.rand : ""}${t.tief ? " tief" : ""}" style="left:${pct(t.x)}%">${esc(t.text)}</span>`).join("");
    const liste = m.zonen.map((z) => `<li style="--zc:${esc(z.farbe)}"><span class="zl-n"><b>${esc(z.kurz)}</b> ${esc(z.name)}</span><span class="zl-w">${esc(ZA.bereich(m, z, fmt))}</span></li>`
      + z.unter.map((u) => `<li class="unter" style="--zc:${esc(u.farbe)}"><span class="zl-n"><i class="zpunkt"></i>${esc(u.name)}</span><span class="zl-w">${esc(u.text)} ${esc(m.pace ? "/km" : m.einheit)}</span></li>`).join("")).join("");
    const rand = m.puls ? `<div class="iz-rand"><span>${m.ruheAnfang ? "Ruhe" : ""}</span><span>${m.hfmax ? "Max" : ""}</span></div>` : "";
    return `<div class="iz-bar" role="img" aria-label="Intensitätszonen von ${esc(fmt(m.von))} bis ${esc(fmt(m.bis))} ${esc(m.pace ? "/km" : m.einheit)}">${seg}</div>`
      + (m.hatUnter ? `<div class="iz-unter" aria-hidden="true">${unt}</div>` : "")
      + `<div class="iz-ticks${m.ticks.some((t) => t.tief) ? " zwei" : ""}" aria-hidden="true">${tix}</div>${rand}`
      + `<ul class="zliste iz-liste">${liste}</ul>`;
  };

  if (typeof module !== "undefined" && module.exports) module.exports = ZA;
  if (typeof window !== "undefined") window.ZA = ZA;
})();
