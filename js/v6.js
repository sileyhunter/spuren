/* V6.0 Bausteine (design-1.0, profil-1.0, status-1.0): Zonen und Farben aus einer Quelle, Balkenprofil einer Einheit, Fokus-Intensitäten,
   Trainingsstatus aus der Form, Wochenleiste, eigene Symbole. Rechenteile ohne DOM (auch unter Node testbar). */
(function (root, factory) {
  const V6 = factory();
  if (typeof module === "object" && module.exports) module.exports = V6;
  if (root) root.V6 = V6;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V6 = { VERSIONS: { design: "design-1.0", profil: "profil-1.0", status: "status-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);

  /* ---------------- Zonen: eine Zone, eine Farbe (Werte wie --zc-… in css/v6.css) ---------------- */
  V6.ZONEN = {
    z1: { kurz: "Z1", name: "Erholung", farbe: "#5a49e2", stufe: 1, css: "--zc-z1" },
    z2: { kurz: "Z2", name: "Grundlage", farbe: "#4f69f8", stufe: 2, css: "--zc-z2" },
    fatmax: { kurz: "Z2", name: "FatMax", farbe: "#7ab4fa", stufe: 2.5, css: "--zc-fatmax" },
    z3: { kurz: "Z3", name: "Tempo", farbe: "#27bdd8", stufe: 3, css: "--zc-z3" },
    sweet: { kurz: "Z3", name: "Sweet Spot", farbe: "#69e4e6", stufe: 3.5, css: "--zc-sweet" },
    z4: { kurz: "Z4", name: "Schwelle", farbe: "#6ce0a4", stufe: 4, css: "--zc-z4" },
    z5: { kurz: "Z5", name: "Intensiv", farbe: "#fdc22b", stufe: 5, css: "--zc-z5" },
    vo2: { kurz: "Z5", name: "VO2max", farbe: "#fdc22b", stufe: 5, css: "--zc-z5" },
    anaerob: { kurz: "Z5", name: "Anaerob", farbe: "#f9a71a", stufe: 5.3, css: "--zc-anaerob" },
    neuro: { kurz: "Z5", name: "Neuro", farbe: "#d6573f", stufe: 5.5, css: "--zc-neuro" },
    sprint: { kurz: "Z5", name: "Sprint", farbe: "#dc3f8d", stufe: 5.7, css: "--zc-sprint" },
    pause: { kurz: "", name: "Pause", farbe: "#5a49e2", stufe: 0.5, css: "--zc-z1" },
    offen: { kurz: "", name: "ohne Ziel", farbe: "#6e6e74", stufe: 0, css: "--zc-offen" },
  };
  /** Farben einmal aus den CSS-Variablen lesen (Design ändert sie an einer Stelle). */
  V6.farbenLesen = function () {
    try {
      const cs = getComputedStyle(document.documentElement);
      for (const z of Object.values(V6.ZONEN)) { const v = cs.getPropertyValue(z.css).trim(); if (v) z.farbe = v; }
    } catch (e) { /* Node oder ohne DOM */ }
  };
  V6.rgba = function (hex, a) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || "").trim());
    return m ? `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})` : hex;
  };
  const SKALA = { rad: { watt: "rad_w", hf: "rad_hf" }, lauf: { pace: "lauf_pace", hf: "lauf_hf" }, wandern: { hf: "lauf_hf" } };
  V6.skalaKey = (sport, art) => (SKALA[sport] || {})[art] || null;
  const mmss = (t) => { const m = /(\d{1,2}):(\d{2})/.exec(t); return m ? +m[1] * 60 + +m[2] : null; };
  /** Unterbereiche aus dem Text einer Zone, z. B. «FatMax 220–240», «SweetSpot ca. 276–290», «VO2max ca. 315–360», «FatMax 5:00–5:21». */
  V6.unterbereiche = function (z) {
    const out = [], t = String((z && z.text) || "");
    const re = /(fat\s*max|sweet\s*spot|vo2\s*max|anaerob\w*|neuro|sprint)[^0-9]*?(\d{1,2}:\d{2}|\d+)\s*[–-]\s*(\d{1,2}:\d{2}|\d+)/gi;
    let m;
    while ((m = re.exec(t))) {
      const n = m[1].toLowerCase().replace(/\s+/g, ""), a = m[2].includes(":") ? mmss(m[2]) : +m[2], b = m[3].includes(":") ? mmss(m[3]) : +m[3];
      const key = n.startsWith("fat") ? "fatmax" : n.startsWith("sweet") ? "sweet" : n.startsWith("vo2") ? "vo2" : n.startsWith("anaerob") ? "anaerob" : n;
      out.push({ key, lo: Math.min(a, b), hi: Math.max(a, b) });
    }
    return out;
  };
  /** Zone eines Zielwerts in einer Skala des aktiven Zonenprofils → { key, pos } mit pos 0…5 (stetig, für die Balkenhöhe).
   *  Watt und Puls: höher = härter; Pace (s/km): tiefer = härter. Ohne Skala oder Wert: null. */
  V6.zoneVon = function (wert, zonen, art) {
    if (!isNum(wert) || !Array.isArray(zonen) || zonen.length < 2) return null;
    const s = art === "pace" ? -1 : 1, iv = (x) => (isNum(x) ? s * x : null);
    const Z = zonen.map((z) => ({ z, lo: iv(art === "pace" ? z.von : z.von), hi: iv(art === "pace" ? z.bis : z.bis) }));
    // offene Ränder: Z1 unten und Z5 oben je eine Zonenbreite der Nachbarzone
    const breite = (q) => (isNum(q.lo) && isNum(q.hi) ? Math.abs(q.hi - q.lo) : null);
    if (!isNum(Z[0].lo) && isNum(Z[0].hi)) Z[0].lo = Z[0].hi - (breite(Z[1]) || 10);
    const L = Z[Z.length - 1]; if (!isNum(L.hi) && isNum(L.lo)) L.hi = L.lo + 2 * (breite(Z[Z.length - 2]) || 10);
    const v = s * wert;
    let k = Z.findIndex((q) => isNum(q.lo) && isNum(q.hi) && v >= Math.min(q.lo, q.hi) && v < Math.max(q.lo, q.hi));
    if (k < 0) k = v < Math.min(...Z.map((q) => Math.min(q.lo, q.hi))) ? 0 : Z.length - 1;
    const q = Z[k], f = Math.max(0, Math.min(1, (v - Math.min(q.lo, q.hi)) / (Math.abs(q.hi - q.lo) || 1)));
    let key = "z" + (k + 1);
    for (const u of V6.unterbereiche(q.z)) if (wert >= u.lo && wert <= u.hi) key = u.key;
    return { key, pos: k + f };
  };
  /** Schwimmen (Beschreibung im Schritt, z. B. «3Lanes | Grundlagenausdauer | Endurance | 02:22min/100m | Finish Lane: Recovery»):
   *  zuerst ein Feld, das nur aus dem Intensitätswort besteht, sonst das erste Stichwort im Text ohne den Teil «Finish Lane: …». */
  const SCHWIMM_WORT = [[/sprint/i, "sprint"], [/neuro/i, "neuro"], [/anaerob/i, "anaerob"], [/vo\s*[2₂]\s*max/i, "vo2"], [/threshold|schwelle/i, "z4"],
    [/sweet\s*spot/i, "sweet"], [/tempo/i, "z3"], [/fat\s*max/i, "fatmax"], [/endurance|grundlage|ausdauer|aerob/i, "z2"], [/recovery|erholung|regeneration|warm\s*up|cool\s*down|einschwimmen|ausschwimmen|locker/i, "z1"]];
  const wortZone = (t) => { for (const [re, k] of SCHWIMM_WORT) if (re.test(t)) return k; return null; };
  V6.schwimmZone = function (text) {
    const felder = String(text || "").split("|").map((f) => f.trim()).filter((f) => f && !/^finish\b|^ziel\b|^break\b|^pause\b/i.test(f));
    for (const f of felder) if (/^[a-zäöü₂0-9 \-]{3,20}$/i.test(f) && f.split(/\s+/).length <= 2) { const k = wortZone(f); if (k) return k; }
    return wortZone(felder.join(" | "));
  };
  /** Name des Schritts aus der Beschreibung (ohne Bahnen, Intensitätswort, Pace und «Finish Lane …»); sonst null. */
  V6.schrittName = function (text) {
    const f = String(text || "").split("|").map((x) => x.trim()).filter(Boolean)
      .filter((x) => !/^[¼½¾\d]+\s*lanes?$/i.test(x) && !/min\s*\/\s*100\s*m/i.test(x) && !/^finish\b/i.test(x) && !/^(break|pause)\b/i.test(x)
        && !(/^[a-z₂0-9 ]{3,20}$/i.test(x) && x.split(/\s+/).length <= 2 && wortZone(x)));
    return f.length ? f.join(" · ") : null;
  };
  const POS = { z1: 0.5, z2: 1.5, fatmax: 1.85, z3: 2.5, sweet: 2.85, z4: 3.5, z5: 4.3, vo2: 4.3, anaerob: 4.6, neuro: 4.8, sprint: 5 };

  /* ---------------- Balkenprofil (profil-1.0): Breite = Dauer, Höhe = Intensität, Farbe = Zone ---------------- */
  const pace100 = (text) => { const m = /(\d{1,2}):(\d{2})\s*min\s*\/\s*100\s*m/i.exec(String(text || "")); return m ? +m[1] * 60 + +m[2] : null; };
  V6.pace100 = pace100;
  /** Zone eines Schritts (aus TR.workout) → { key, pos } oder null. */
  V6.schrittZone = function (s, wo, skalen) {
    const pause = s.typ === "rest" && !s.ziel;
    if (pause && !(wo.sport === "schwimm" && V6.schwimmZone(s.text) && !/^break\b/i.test(String(s.text || "")))) return { key: "pause", pos: 0.25 };
    if (wo.sport === "schwimm") { const k = V6.schwimmZone(s.text); return k ? { key: k, pos: POS[k] } : null; }
    const sk = (skalen || {})[V6.skalaKey(wo.sport, s.ziel ? s.ziel.art : wo.modus)] || null;
    const wert = isNum(s.mitte) ? s.mitte : s.ziel && !(wo.wattUnklar && s.ziel.art === "watt") ? (s.ziel.art === "pace" && isNum(s.ziel.v) ? 1000 / s.ziel.v : (s.ziel.lo + s.ziel.hi) / 2) : null;
    return isNum(wert) && s.ziel ? V6.zoneVon(wert, sk, s.ziel.art) : null;
  };
  /** wo: Ergebnis von TR.workout; skalen: TR.zonen(D.zonen).skalen. → { balken, dauer_s, distanz_m, geschaetzt, fokus, offen }
   *  Breite = Dauer (bekannt oder in TR.workout aus Pace/Distanz geschätzt), Höhe = Lage in der Zone, Farbe = Zone. */
  V6.profil = function (wo, skalen) {
    const out = { balken: [], dauer_s: 0, distanz_m: 0, geschaetzt: false, fokus: [], offen: 0, ohneDauer: 0 };
    if (!wo || !Array.isArray(wo.schritte) || !wo.schritte.length) return out;
    let t = 0;
    for (const s of wo.schritte) {
      let d = isNum(s.dauer_s) ? s.dauer_s : isNum(s.dauer_est) ? s.dauer_est : null;
      if (!isNum(d) && isNum(s.distanz_m) && pace100(s.text)) d = s.distanz_m / 100 * pace100(s.text);
      if (!isNum(s.dauer_s) && isNum(d)) out.geschaetzt = true;
      if (isNum(s.distanz_m)) out.distanz_m += s.distanz_m;
      const z = V6.schrittZone(s, wo, skalen);
      let key = z ? z.key : null, pos = z ? z.pos : null;
      if (!key) { key = "offen"; pos = 0.9; out.offen++; }
      if (!isNum(d)) out.ohneDauer++;
      const w = isNum(d) && d > 0 ? d : 60;      // ohne Dauer: schmaler Platzhalter, blass gezeichnet (nie als Zeit gezählt)
      out.balken.push({ i: s.i, x0: t, w, d: isNum(d) ? d : null, h: Math.max(0.12, Math.min(1, 0.1 + 0.9 * (pos / 5))), key, typ: s.typ, ohneDauer: !isNum(d) });
      t += w;
    }
    out.dauer_s = out.ohneDauer ? null : t;
    out.breite_s = t;
    // Zeit ab Zone 3 (Tempo und härter) aus den Zonen der Schritte; Schritte ohne Dauer zählen nicht
    out.intensiv_s = out.balken.filter((b) => isNum(b.d) && b.key !== "pause" && b.key !== "offen" && V6.ZONEN[b.key].stufe >= 3).reduce((a, b) => a + b.d, 0);
    // Fokus: Zeitanteile der aktiven Schritte (ohne Ein-/Ausfahren, Erholungsschritte und Pausen), ab 10 %, höchstens drei, härteste zuerst
    const akt = out.balken.filter((b) => b.typ !== "warmup" && b.typ !== "cooldown" && b.typ !== "rest" && b.key !== "pause" && b.key !== "offen");
    const sum = akt.reduce((s, b) => s + b.w, 0), je = {};
    for (const b of akt) je[b.key] = (je[b.key] || 0) + b.w;
    out.fokus = Object.entries(je).map(([key, w]) => ({ key, anteil: sum ? w / sum : 0 })).filter((f) => f.anteil >= 0.1)
      .sort((a, b) => V6.ZONEN[b.key].stufe - V6.ZONEN[a.key].stufe).slice(0, 3);
    return out;
  };
  /** SVG des Profils (gross in der Einheit, klein in Karten). */
  V6.profilSVG = function (p, opt) {
    opt = opt || {};
    const H = opt.h || 46, W = 1000, gap = opt.gross ? 3 : 2, r = opt.gross ? 3 : 2;
    if (!p || !p.balken.length) return "";
    const total = p.breite_s || p.dauer_s || 1;
    const rects = p.balken.map((b) => {
      const x = (b.x0 / total) * W, w = Math.max(1, (b.w / total) * W - gap), h = b.h * (H - 2);
      return `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r}" fill="${V6.ZONEN[b.key].farbe}"${b.ohneDauer ? ' fill-opacity=".45"' : ""}/>`;
    }).join("");
    return `<svg class="profil${opt.gross ? " gross" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(opt.label || "Ablauf der Einheit: Breite = Dauer, Höhe und Farbe = Zone")}">${rects}</svg>`;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  V6.zchip = function (key) {
    const z = V6.ZONEN[key] || V6.ZONEN.offen;
    return `<span class="zchip" style="--zc:${z.farbe};background:${V6.rgba(z.farbe, 0.2)}">${z.kurz ? z.kurz + "·" : ""}${esc(z.name)}</span>`;
  };
  V6.dauerText = function (s) {
    if (!isNum(s)) return "–";
    s = s >= 600 ? Math.round(s / 60) * 60 : Math.round(s);      // ab 10 min auf ganze Minuten
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    if (h) return `${h}h${m ? " " + String(m).padStart(2, "0") + "m" : ""}`;
    if (m) return `${m}m${x ? " " + x + "s" : ""}`;
    return `${x}s`;
  };
  const fmtMs = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  V6.distanzText = (m) => (!isNum(m) ? "–" : m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 1 : 0).replace(".", ",")} km` : `${Math.round(m)} m`);
  /** Zieltext eines Schritts: «220–240 W», «5:00–5:21 /km», «135–145 bpm», Schwimmen «2:22 /100 m»; ohne Ziel null. */
  V6.zielText = function (s, wo) {
    const z = s && s.ziel, r = Math.round;
    if (z && z.art === "watt") return `${r(z.lo)}–${r(z.hi)}${wo && wo.wattUnklar ? " (Watt oder % FTP?)" : " W"}`;
    if (z && z.art === "hf") return `${r(z.lo)}–${r(z.hi)} bpm`;
    if (z && z.art === "pace") return `${fmtMs(z.lo)}–${fmtMs(z.hi)} /km`;
    const p = s && isNum(s.pace100) ? s.pace100 : pace100(s && s.text);
    return isNum(p) ? `${fmtMs(p)} /100 m` : null;
  };
  const TYP_NAME = {
    rad: { warmup: "Einfahren", cooldown: "Ausfahren" }, lauf: { warmup: "Einlaufen", cooldown: "Auslaufen" },
    schwimm: { warmup: "Einschwimmen", cooldown: "Ausschwimmen" }, andere: { warmup: "Aufwärmen", cooldown: "Abwärmen" },
  };
  /** Bezeichnung eines Schritts in der Liste. */
  V6.schrittTyp = function (s, wo) {
    const sp = TYP_NAME[wo && wo.sport] || TYP_NAME.andere;
    if (s.typ === "warmup" || s.typ === "cooldown") return sp[s.typ];
    if (s.typ === "rest") return /rest/.test(String(s.ec || "")) || !s.ziel ? "Pause" : "Erholung";
    return s.gruppe != null ? "Intervall" : "Hauptteil";
  };
  /** Schritte für die Liste: Einzelschritte und Wiederholungsblöcke («4 ×» mit den Schritten einer Runde). */
  V6.bloecke = function (wo) {
    const out = [], L = (wo && wo.schritte) || [];
    for (let i = 0; i < L.length;) {
      const s = L[i];
      if (s.gruppe != null && s.wdh === 1 && wo.gruppen && wo.gruppen[s.gruppe]) {
        const g = wo.gruppen[s.gruppe], per = Math.max(1, Math.round((g.bis - g.von + 1) / g.n));
        out.push({ art: "wdh", n: g.n, schritte: L.slice(g.von, g.von + per) });
        i = Math.max(i + 1, g.bis + 1); continue;
      }
      out.push({ art: "einzel", schritte: [s] }); i++;
    }
    return out;
  };
  /** Reihenfolge der Zonenskala (alle Intensitäten, Unterzonen zwischen ihren Zonen). */
  V6.SKALA_REIHE = ["z1", "z2", "fatmax", "z3", "sweet", "z4", "vo2", "anaerob", "neuro", "sprint"];
  V6.gruss = (stunde) => (stunde < 11 ? "Guten Morgen" : stunde < 17 ? "Guten Tag" : "Guten Abend");

  /* ---------------- Trainingsstatus (status-1.0) aus der Form = Fitness − Ermüdung (pmc-2.0) ---------------- */
  // Bänder nach Coggan (Training Stress Balance); eigene Wörter. «Übertraining» ist eine Diagnose und wird nie aus Zahlen behauptet.
  V6.STATUS = [
    { key: "verlust", name: "Formverlust", ab: 25, farbe: "#f9a71a", text: "lange wenig Belastung – die Fitness sinkt" },
    { key: "erholt", name: "Erholt", ab: 5, farbe: "#6a59ea", text: "frisch, gut für Rennen und Tests" },
    { key: "erhaltung", name: "Erhaltung", ab: -10, farbe: "#7ab4fa", text: "Belastung und Erholung im Gleichgewicht" },
    { key: "produktiv", name: "Produktiv", ab: -30, farbe: "#6ce0a4", text: "Belastung, die die Fitness aufbaut" },
    { key: "ueberlastung", name: "Hohe Belastung", ab: -Infinity, farbe: "#fdc22b", text: "deutlich mehr Belastung als gewohnt – Erholung im Blick behalten" },
  ];
  V6.status = function (form) {
    if (!isNum(form)) return null;
    return V6.STATUS.find((b) => form > b.ab) || V6.STATUS[V6.STATUS.length - 1];
  };
  /** Mini-Skala: Bänder von −40 bis +35 (links hohe Belastung, rechts Formverlust) und Lage der Form darauf (0…1). */
  V6.STATUS_SKALA = { min: -40, max: 35 };
  V6.statusBaender = function () {
    const { min, max } = V6.STATUS_SKALA, b = V6.STATUS.slice().reverse(), out = [];
    for (let i = 0; i < b.length; i++) {
      const lo = Math.max(min, b[i].ab), hi = i + 1 < b.length ? b[i + 1].ab : max;
      out.push({ key: b[i].key, name: b[i].name, farbe: b[i].farbe, von: (lo - min) / (max - min), bis: (Math.min(max, hi) - min) / (max - min) });
    }
    return out;
  };
  V6.statusLage = (form) => (isNum(form) ? Math.max(0, Math.min(1, (form - V6.STATUS_SKALA.min) / (V6.STATUS_SKALA.max - V6.STATUS_SKALA.min))) : null);

  /* ---------------- Wochenleiste Mo–So ---------------- */
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  V6.montag = (iso) => { const d = new Date(iso + "T12:00:00Z"); return addDays(iso, -((d.getUTCDay() + 6) % 7)); };
  /** Tage der Woche mit erledigten und geplanten Sportarten; Fortschritt Trainings und Dauer (erledigt / geplant). planDauer(p) → s */
  V6.woche = function (acts, planned, heuteISO, planDauer) {
    // Je Tag: Geplantes gilt als erledigt, wenn am selben Tag eine Aktivität derselben Sportart erfasst ist (jede Aktivität zählt einmal).
    // Fortschritt: erledigt / (erledigt + noch offen + verpasst) – so stimmt er auch, wenn für vergangene Tage nichts geplant war.
    const m = V6.montag(heuteISO), tage = [], dauer = (p) => (planDauer ? planDauer(p) : p.dur_s) || 0;
    let n_ist = 0, s_ist = 0, n_offen = 0, s_offen = 0, n_verpasst = 0, s_verpasst = 0;
    for (let i = 0; i < 7; i++) {
      const iso = addDays(m, i), ist = (acts || []).filter((a) => a.date === iso), plan = (planned || []).filter((p) => p.date === iso);
      n_ist += ist.length; s_ist += ist.reduce((s, a) => s + (a.dur || a.mv || 0), 0);
      const frei = ist.map((a) => a.sport || "andere"), zeichen = [];
      for (const p of plan) {
        const sp = p.sport || "andere", k = frei.indexOf(sp);
        if (k >= 0) { frei.splice(k, 1); zeichen.push({ sport: sp, art: "ist" }); continue; }
        const art = iso < heuteISO ? "verpasst" : "plan";
        zeichen.push({ sport: sp, art });
        if (art === "plan") { n_offen++; s_offen += dauer(p); } else { n_verpasst++; s_verpasst += dauer(p); }
      }
      for (const sp of frei) zeichen.push({ sport: sp, art: "ist" });
      tage.push({ iso, wt: "MDMDFSS"[i], heute: iso === heuteISO, vorbei: iso < heuteISO, zeichen });
    }
    return { tage, n_ist, s_ist, n_offen, s_offen, n_verpasst, s_verpasst, n_woche: n_ist + n_offen + n_verpasst, s_woche: s_ist + s_offen + s_verpasst };
  };

  /* ---------------- Symbole (eigene, Linien 1,8 px) ---------------- */
  const svg = (inner, w) => `<svg viewBox="0 0 24 24" width="${w || 20}" height="${w || 20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  V6.ICON = {
    rad: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9.5 9h6l3 7.5M9.5 9 12 16.5h-1M14 6h2.5"/>',
    lauf: '<circle cx="14.5" cy="4.5" r="1.8"/><path d="m8 21 3-6 3 3v4M7 11l3-3 4 1 2 4 3 1M11 15l-1-4"/>',
    schwimm: '<circle cx="16.5" cy="7.5" r="1.8"/><path d="M3 12.5 9 9l3 2.5 3-1.5M2 17c2 0 2-1.4 4-1.4s2 1.4 4 1.4 2-1.4 4-1.4 2 1.4 4 1.4 2-1.4 4-1.4"/>',
    wandern: '<circle cx="12" cy="4.5" r="1.8"/><path d="m9 21 2-6 3 2v4M8.5 11l2.5-3 3 1 1.5 3M11 15l-.5-4M18 9v12"/>',
    ski: '<circle cx="15" cy="4.5" r="1.8"/><path d="M3 20.5 21 16M9 18l3-5 3 1 1-4M7 10l4-1 3 2"/>',
    kraft: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    andere: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l2.5 2.5"/>',
    heute: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h2M14 13.5h2M8 17h2"/>',
    plan: '<path d="M6 3.5v17M6 5h11l-2.5 3.5L17 12H6"/><circle cx="6" cy="20.5" r=".6"/>',
    analyse: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    karte: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14"/>',
    check: '<path d="M12 20s-7.5-4.5-7.5-10.1A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20z"/><path d="m9 12.2 2.1 2.1 4-4.2"/>',
    plus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/>',
    zurueck: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
    weiter: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    ablauf: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
    fokus: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    flagge: '<path d="M5.5 21V4M5.5 4.5h11l-2 3.5 2 3.5h-11"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
    hoch: '<path d="m6 15 6-6 6 6"/>', runter: '<path d="m6 9 6 6 6-6"/>', pause: '<path d="M9 7v10M15 7v10"/>', intervall: '<path d="m6 13 6-6 6 6M6 18l6-6 6 6"/>',
    trend: '<path d="m4 16 5-5 4 3 7-7M15 7h5v5"/>',
    status: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    ampel: '<rect x="7" y="2.5" width="10" height="19" rx="4"/><circle cx="12" cy="7.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="16.5" r="1.6"/>',
    beine: '<path d="M9 3.5v7l-2 9.5h3l2-7 2 7h3l-2-9.5v-7"/>', energie: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z"/>', kopf: '<circle cx="12" cy="10" r="6.5"/><path d="M9.5 16.5V21M14.5 16.5V21M9.5 9.5h.5M14 9.5h.5"/>',
  };
  V6.icon = (k, w) => svg(V6.ICON[k] || V6.ICON.andere, w);
  V6.sportIcon = (sport, w) => V6.icon(V6.ICON[sport] ? sport : "andere", w);
  return V6;
});
