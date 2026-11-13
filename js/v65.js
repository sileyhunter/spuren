/* V6.5 Etappe 5 · Enduco-Bibliothek auf der Seite (ohne DOM, auch unter Node testbar).
   Daten: `enduco_bib` (bib-1.0, tools/bibliothek.py) – jedes Enduco-Workout aus Garmin mit Volltext, Schritten, Terminen und Versionen.
   - bibliothek-1.0: Liste (neueste zuerst nach Termin, sonst nach Exportdatum), Suche, Sportart, Stufe; «gelaufen» = Aktivität, auf deren Uhr
     dieses Workout lief (gleicher Titel; am Termin, ohne Termin vom Exporttag bis 14 Tage danach).
   - uebungen-1.0: Schwimmübungen und Serien aus den Schritt-Texten (Enduco schreibt «Bahnen | Name | Bereich | Pace»), mit Hilfsmittel und Metern.
   - monate-1.0: Enduco über die Monate – Anzahl und Stunden je Sportart, Stufen (aus den Schritten, sonst laut Titel). Monat nach Termin,
     sonst nach Exportdatum; nur Workouts, die über Garmin kamen (direkt nach Zwift exportierte fehlen).
   Unbekannt bleibt unbekannt: ohne Dauer keine Stunden, ohne Ziele und ohne Wort im Titel «offen». Nichts wird nach Garmin oder Enduco geschrieben. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V65 = factory(node ? require("./v64.js") : root && root.V64);
  if (node) module.exports = V65;
  if (root) root.V65 = V65;
})(typeof window !== "undefined" ? window : null, function (V64) {
  "use strict";
  const V65 = { VERSIONS: { liste: "bibliothek-1.0", uebungen: "uebungen-1.0", monate: "monate-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  V65.SPORTARTEN = ["rad", "lauf", "schwimm"];

  /** Titel für den Vergleich: klein, ohne doppelte Leerzeichen, «₂» als «2». */
  V65.norm = (t) => String(t || "").replace(/₂/g, "2").replace(/\s+/g, " ").trim().toLowerCase();
  /** Text einer Version: Volltext aus `texte`, sonst der erste Satz (gekennzeichnet). */
  V65.text = function (B, v) {
    if (v && v.text_h && B && B.texte && B.texte[v.text_h]) return { text: B.texte[v.text_h], voll: true, geerbt: v.text_aus || null };
    if (v && v.kurz) return { text: v.kurz, voll: false, geerbt: null };
    return { text: "", voll: false, geerbt: null };
  };

  /** Einträge der Bibliothek für die Liste. acts: Aktivitäten (für «gelaufen», Feld wk.name). */
  V65.eintraege = function (B, acts) {
    const W = B && B.workouts ? Object.values(B.workouts) : [];
    const lauf = new Map();                                  // Titel → Aktivitäten mit Workout auf der Uhr
    for (const a of acts || []) if (a && a.wk && a.wk.name) { const k = V65.norm(a.wk.name); if (!lauf.has(k)) lauf.set(k, []); lauf.get(k).push(a); }
    return W.map((w) => {
      const v = w.versionen && w.versionen.length ? w.versionen[w.versionen.length - 1] : {};
      const erst = w.erstellt ? String(w.erstellt).slice(0, 10) : null, termine = (w.termine || []).slice().sort();
      const datum = termine.length ? termine[termine.length - 1] : erst;
      const kand = lauf.get(V65.norm(w.titel)) || [];
      const gelaufen = kand.filter((a) => (termine.length ? termine.includes(a.date) : erst && a.date >= add(erst, -1) && a.date <= add(erst, 14)))
        .map((a) => ({ id: a.id, date: a.date, ist_s: a.wk.ist_s || a.mv || a.dur || null })).sort((x, y) => x.date.localeCompare(y.date));
      const tx = V65.text(B, v);
      return { wid: w.wid, titel: (w.titel || "").trim(), sport: w.sport || "andere", erstellt: erst, termine, datum, datumArt: termine.length ? "Termin" : "exportiert",
        dauer_s: isNum(v.dauer_s) ? v.dauer_s : null, distanz_m: isNum(v.distanz_m) ? v.distanz_m : null, pool_m: isNum(v.pool_m) ? v.pool_m : null,
        steps: v.steps || null, versionen: (w.versionen || []).length, text: tx.text, textVoll: tx.voll, textGeerbt: tx.geerbt, gelaufen, v };
    }).sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")) || String(b.wid).localeCompare(String(a.wid)));
  };

  /** Stufe eines Eintrags: aus den Zielen der Schritte (balken: Balkenprofil, falls berechnet), sonst laut Titel (V64.planStufe). */
  V65.stufe = function (e, balken) {
    const st = V64 && V64.planStufe ? V64.planStufe(balken || null, e.titel) : null;
    return st || { stufe: "offen", quelle: null };
  };

  /** Filter: sport («alle» oder Sportart), suche (Titel und Text), stufe («alle» oder alles/schwelle/locker/offen; stufeVon(e) liefert sie). */
  V65.filtern = function (E, f, stufeVon) {
    const q = V65.norm(f && f.suche);
    return E.filter((e) => (!f || !f.sport || f.sport === "alle" || e.sport === f.sport)
      && (!q || V65.norm(e.titel).includes(q) || V65.norm(e.text).includes(q))
      && (!f || !f.stufe || f.stufe === "alle" || (stufeVon ? stufeVon(e) : V65.stufe(e).stufe) === f.stufe));
  };

  /* ---------------- Schwimmübungen (uebungen-1.0) ---------------- */
  const SERIE = /grundlage|ausdauer|tempo|vo\s*[2₂]|aktivierung|intervall|schwelle|threshold|sprint|recovery|regenerat|warm\s*up|cool\s*down|endurance|steigerung|locker|einschwimmen|ausschwimmen/i;
  const BAHN = /^[0-9½¼¾\/.,]+\s*lanes?$/i;
  /** Ein Schritt-Text → { name, bereich } oder null. «½Lanes | Übung | Bereich | Pace | …» bzw. «Name | Bereich | Pace». */
  V65.schrittText = function (t) {
    const f = String(t || "").split("|").map((x) => x.trim()).filter(Boolean);
    if (!f.length || /^break\b|^pause\b/i.test(f[0])) return null;
    const i = BAHN.test(f[0]) ? 1 : 0;
    if (!f[i]) return null;
    return { name: f[i], bereich: f[i + 1] && !/min\/100m|^\d/.test(f[i + 1]) ? f[i + 1] : null };
  };
  /** Alle Schwimm-Workouts mit Schritten → Übungen/Serien mit Anzahl Workouts, Wiederholungen, Metern, Hilfsmitteln, zuletzt. */
  V65.uebungen = function (E) {
    const M = new Map();
    for (const e of E || []) {
      if (e.sport !== "schwimm" || !Array.isArray(e.steps)) continue;
      const imWorkout = new Set();
      const geh = (steps, mal) => {
        for (const s of steps || []) {
          if (!s || typeof s !== "object") continue;
          if (s.type === "repeat" && Array.isArray(s.steps)) { geh(s.steps, mal * (isNum(s.repeat_count) ? s.repeat_count : isNum(s.end_condition_value) ? s.end_condition_value : 1)); continue; }
          if (s.type === "rest") continue;
          const p = V65.schrittText(s.description); if (!p) continue;
          const k = V65.norm(p.name);
          if (!M.has(k)) M.set(k, { name: p.name, art: SERIE.test(p.name) ? "Serie" : "Übung", workouts: 0, wiederholungen: 0, meter: 0, hilfsmittel: new Set(), bereiche: new Set(), zuletzt: null });
          const u = M.get(k);
          if (!imWorkout.has(k)) { u.workouts++; imWorkout.add(k); }
          u.wiederholungen += mal;
          if (s.end_condition === "distance" && isNum(s.end_condition_value)) u.meter += s.end_condition_value * mal;
          if (s.equipment_type && s.equipment_type !== "none") u.hilfsmittel.add(s.equipment_type);
          if (p.bereich) u.bereiche.add(p.bereich);
          if (e.datum && (!u.zuletzt || e.datum > u.zuletzt)) u.zuletzt = e.datum;
        }
      };
      geh(e.steps, 1);
    }
    return [...M.values()].map((u) => ({ ...u, hilfsmittel: [...u.hilfsmittel].sort(), bereiche: [...u.bereiche].sort(), meter: Math.round(u.meter) }))
      .sort((a, b) => (a.art === b.art ? b.workouts - a.workouts || a.name.localeCompare(b.name) : a.art === "Übung" ? -1 : 1));
  };
  V65.HILFSMITTEL = { fins: "Flossen", paddles: "Paddles", pull_buoy: "Pull-Buoy", kickboard: "Brett", snorkel: "Schnorchel" };

  /* ---------------- Über die Monate (monate-1.0) ---------------- */
  /** E: Einträge; stufeVon(e) → Stufe. → [{ monat, n, h: {rad, lauf, schwimm}, ohneDauer, stufen: {alles, schwelle, locker, offen} }] (aufsteigend). */
  V65.monate = function (E, stufeVon, opt) {
    const M = new Map(), bis = opt && opt.bis ? opt.bis.slice(0, 7) : null;
    for (const e of E || []) {
      if (!e.datum || !V65.SPORTARTEN.includes(e.sport)) continue;
      const m = e.datum.slice(0, 7);
      if (bis && m > bis) continue;
      if (!M.has(m)) M.set(m, { monat: m, n: 0, h: { rad: 0, lauf: 0, schwimm: 0 }, ohneDauer: 0, stufen: { alles: 0, schwelle: 0, locker: 0, offen: 0 } });
      const x = M.get(m);
      x.n++;
      if (isNum(e.dauer_s) && e.dauer_s > 0) x.h[e.sport] += e.dauer_s / 3600; else x.ohneDauer++;
      const st = stufeVon ? stufeVon(e) : V65.stufe(e).stufe;
      x.stufen[x.stufen[st] != null ? st : "offen"]++;
    }
    return [...M.values()].sort((a, b) => a.monat.localeCompare(b.monat));
  };

  /** Übersicht für den Kopf. */
  V65.stand = function (B, E) {
    const je = { rad: 0, lauf: 0, schwimm: 0 };
    for (const e of E) if (je[e.sport] != null) je[e.sport]++;
    const erst = E.map((e) => e.erstellt).filter(Boolean).sort();
    return { n: E.length, je, seit: erst[0] || null, mitSchritten: E.filter((e) => Array.isArray(e.steps) && e.steps.length).length,
      mitTermin: E.filter((e) => e.termine.length).length, versionen: E.reduce((s, e) => s + e.versionen, 0), gelaufen: E.filter((e) => e.gelaufen.length).length,
      stand: B && B.stand || null, liste: B && B.liste_stand || null };
  };
  return V65;
});
