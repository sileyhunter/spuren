/* Ironman Notebook V7 – Rechenlogik ohne DOM (Auftrag «V7: Bedienung nach dem Vorbild enduco» vom 14.11.2026).
   - planvergleich-1.0: Enduco geplant gegenüber Garmin absolviert, nur zusammengefasst je Woche (Mo–So, Datum wie in den Daten = Europe/Zurich).
     Soll = Garmin-Kalender (Enduco, ohne selbst gesendete «IN · …»), wo dort nichts stand die Plandauer der Workouts, die auf der Uhr liefen
     (vergleich-1.4). Ist = erfasste Aktivitäten: Netto = Bewegungszeit (mv, sonst Timer-Dauer), Brutto = Gesamtzeit (el), Pausen = Brutto − Netto.
     Zonen nur Rad und Laufen: Soll aus den Zielen der Workout-Schritte, eingeordnet in dein aktives Zonenprofil (profil-1.0, Leistung bzw. Tempo);
     Ist aus dem Puls-Histogramm (hh, gemessene Sekunden, nicht hochgerechnet) in deinen Pulszonen des Profils, das am Tag galt – Soll und Ist
     messen damit Verschiedenes (Ziel nach Leistung/Tempo, Ist nach Puls); verglichen werden darum vor allem die Anteile. Zeit ohne Ziel, ohne Dauer oder ohne Puls bleibt eigene
     Gruppe («nicht zuordenbar») und wird nie verteilt. Enduco-Zonen werden nicht übernommen, nur die Zielwerte.
   - drei Bereiche: unter LT1 (Z1–Z2), zwischen LT1 und LT2 (Z3), über LT2 (Z4–Z5) – Grenzen Z2/Z3 = LT1 und Z3/Z4 = LT2 wie im Zonenprofil.
   - profil-teile-1.0: Balkenprofil einer eigenen Einheit (Mein Plan) aus ihren Teilen [Zone, Minuten] – gleiche Darstellung wie profil-1.0.
   Nichts wird geschätzt, wo Daten fehlen; nichts wird nach Garmin oder Enduco geschrieben. */
(function (root, factory) {
  const V7 = factory();
  if (typeof module === "object" && module.exports) module.exports = V7;
  if (root) root.V7 = V7;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V7 = { VERSIONS: { navigation: "navigation-7.0", planvergleich: "planvergleich-1.0", teile: "profil-teile-1.0", kalender: "kalender-3.0", heute: "heute-7.0", analyse: "analyse-start-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const T = (iso) => Date.parse(iso + "T12:00:00Z");
  const add = (iso, n) => new Date(T(iso) + n * 864e5).toISOString().slice(0, 10);
  const montag = (iso) => { const d = new Date(T(iso)).getUTCDay(); return add(iso, -((d + 6) % 7)); };
  V7.addDays = add; V7.montag = montag;
  V7.SPORT3 = ["schwimm", "rad", "lauf"];
  V7.Z5 = ["z1", "z2", "z3", "z4", "z5"];

  /** Unterzone → Hauptzone (eine Zone, eine Farbe; Unterzonen gehören zu ihrer Zone). Pause = Z1, ohne Ziel = null. */
  V7.hauptzone = function (key) {
    return ({ z1: "z1", pause: "z1", z2: "z2", fatmax: "z2", z3: "z3", sweet: "z3", z4: "z4", z5: "z5", vo2: "z5", anaerob: "z5", neuro: "z5", sprint: "z5" })[key] || null;
  };
  /** [Z1..Z5] → [unter LT1, LT1–LT2, über LT2]. */
  V7.drei = (z) => [(z[0] || 0) + (z[1] || 0), z[2] || 0, (z[3] || 0) + (z[4] || 0)];

  /** Puls-Histogramm (5-bpm-Klassen ab 60 bpm, Sekunden) an vier Grenzen teilen (Ende Z1, Z2, Z3, Z4); innerhalb einer Klasse linear. */
  V7.histZonen = function (hh, g) {
    const z = [0, 0, 0, 0, 0];
    if (!Array.isArray(hh) || !Array.isArray(g) || g.length !== 4 || !g.every(isNum)) return null;
    for (let i = 0; i < g.length - 1; i++) if (!(g[i] < g[i + 1])) return null;
    hh.forEach((sec, i) => {
      if (!isNum(sec) || sec <= 0) return;
      const lo = 60 + 5 * i, f = g.map((b) => Math.min(1, Math.max(0, (b - lo) / 5)));
      z[0] += sec * f[0]; z[1] += sec * (f[1] - f[0]); z[2] += sec * (f[2] - f[1]); z[3] += sec * (f[3] - f[2]); z[4] += sec * (1 - f[3]);
    });
    return z;
  };
  /** Pulsgrenzen (Ende Z1–Z4) aus einem Zonenprofil für eine Sportart; ohne vollständige, geordnete Pulsskala: null. */
  V7.pulsGrenzen = function (profil, sport) {
    const sc = profil && (profil.skalen || []).find((x) => x.disziplin === sport && x.metrik === "puls");
    if (!sc) return null;
    const bis = (k) => { const z = (sc.zonen || []).find((x) => x.z === k); return z && isNum(z.bis) ? z.bis : null; };
    const g = ["Z1", "Z2", "Z3", "Z4"].map(bis);
    return g.every(isNum) && g[0] < g[1] && g[1] < g[2] && g[2] < g[3] ? g : null;
  };

  /** Soll-Zonen aus einem Balkenprofil (profil-1.0): Sekunden je Hauptzone, «offen» = ohne Ziel oder ohne Dauer. */
  V7.balkenZonen = function (balken) {
    const z = [0, 0, 0, 0, 0]; let offen = 0, ohneDauer = 0;
    for (const b of balken || []) {
      if (!isNum(b.d) || b.ohneDauer) { ohneDauer++; continue; }
      const k = V7.hauptzone(b.key), i = k ? V7.Z5.indexOf(k) : -1;
      if (i >= 0) z[i] += b.d; else offen += b.d;
    }
    return { z, offen, ohneDauer };
  };

  /** profil-teile-1.0: Teile einer eigenen Einheit [[Zone, Minuten], …] → { balken, dauer_s } im Format von profil-1.0 (Höhe nach Stufe). */
  V7.profilAusTeile = function (teile, ZONEN) {
    const out = { v: V7.VERSIONS.teile, balken: [], dauer_s: 0, fokus: [] };
    if (!Array.isArray(teile)) return out;
    let t = 0; const lang = {};
    for (const [key0, min] of teile) {
      if (!isNum(min) || min <= 0) continue;
      const key = key0 === "ohne" ? "offen" : key0, Z = ZONEN && ZONEN[key], s = min * 60;
      const stufe = Z ? Z.stufe : 0;
      out.balken.push({ x0: t, w: s, d: s, h: Math.max(0.12, Math.min(1, 0.1 + 0.9 * (stufe / 5))), key: Z ? key : "offen", ohneDauer: false });
      t += s;
      if (Z && !["z1", "pause", "offen"].includes(key)) lang[key] = (lang[key] || 0) + s;
    }
    out.dauer_s = t;
    const aktiv = Object.values(lang).reduce((a, b) => a + b, 0);
    out.fokus = Object.entries(lang).filter(([, s]) => aktiv > 0 && s / aktiv >= 0.1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, s]) => ({ key, s }));
    if (out.balken.length === 1 && out.balken[0].key === "offen") out.balken = [];          // Kraft, Mobility: ohne Ziele kein Profil
    return out;
  };

  /* ---------------- planvergleich-1.0 ---------------- */
  /**
   * Eine Woche zusammenfassen.
   *  soll: [{date, sport, dauer_s|null, zonen: {z:[5], offen, ohneDauer}|null, herkunft: "kalender"|"uhr"}]
   *  ist:  [{date, sport, netto_s, brutto_s|null, zonen: [5]|null}]
   *  opt:  { mo, heute, vollAb }  – abgeschlossen, wenn der Sonntag vor heute liegt; vor vollAb (Montag) gilt das Soll als unvollständig.
   */
  V7.woche = function (soll, ist, opt) {
    const mo = opt.mo, so = add(mo, 6), heute = opt.heute || add(so, 1);
    const inW = (x) => x && x.date >= mo && x.date <= so;
    const S = (soll || []).filter(inW), I = (ist || []).filter(inW);
    const sp = (k) => (V7.SPORT3.includes(k) ? k : "andere");
    const leerSp = () => ({ schwimm: 0, rad: 0, lauf: 0, andere: 0 });
    const r = { v: V7.VERSIONS.planvergleich, mo, so, abgeschlossen: so < heute, laufend: mo <= heute && heute <= so,
      soll: { s: 0, je: leerSp(), n: S.length, ohneDauer: 0, herkunft: { kalender: 0, uhr: 0 } },
      ist: { netto: 0, brutto: 0, pausen: 0, je: leerSp(), n: I.length, bruttoFehlt: 0 },
      zonen: { soll: [0, 0, 0, 0, 0], sollOffen: 0, sollOhneZonen: 0, ist: [0, 0, 0, 0, 0], istOhneZonen: 0 } };
    for (const x of S) {
      r.soll.herkunft[x.herkunft === "uhr" ? "uhr" : "kalender"]++;
      if (!isNum(x.dauer_s)) { r.soll.ohneDauer++; continue; }
      r.soll.s += x.dauer_s; r.soll.je[sp(x.sport)] += x.dauer_s;
      if (x.sport === "rad" || x.sport === "lauf") {
        if (x.zonen && Array.isArray(x.zonen.z)) { x.zonen.z.forEach((v, i) => (r.zonen.soll[i] += v)); r.zonen.sollOffen += x.zonen.offen || 0; }
        else r.zonen.sollOhneZonen += x.dauer_s;
      }
    }
    for (const a of I) {
      const n = isNum(a.netto_s) ? a.netto_s : 0;
      r.ist.netto += n; r.ist.je[sp(a.sport)] += n;
      if (isNum(a.brutto_s) && a.brutto_s >= n) { r.ist.brutto += a.brutto_s; r.ist.pausen += a.brutto_s - n; } else { r.ist.brutto += n; r.ist.bruttoFehlt++; }
      if (a.sport === "rad" || a.sport === "lauf") {
        if (Array.isArray(a.zonen)) {
          // gemessene Sekunden mit Puls, nicht hochgerechnet; Netto-Zeit ohne Pulswerte bleibt «ohne Zonen»
          const t = a.zonen.reduce((s, v) => s + v, 0);
          a.zonen.forEach((v, i) => (r.zonen.ist[i] += v));
          if (n > t) r.zonen.istOhneZonen += n - t;
        } else r.zonen.istOhneZonen += n;
      }
    }
    r.diff_s = r.ist.netto - r.soll.s;
    r.diff_pct = r.soll.s > 0 ? Math.round((100 * r.diff_s) / r.soll.s) : null;
    r.je = {};
    for (const k of ["schwimm", "rad", "lauf", "andere"]) {
      const a = r.soll.je[k], b = r.ist.je[k];
      r.je[k] = { soll: a, ist: b, diff_s: b - a, diff_pct: a > 0 ? Math.round((100 * (b - a)) / a) : null };
    }
    r.zonen.soll3 = V7.drei(r.zonen.soll); r.zonen.ist3 = V7.drei(r.zonen.ist);
    // Urteil nur bei vollständigem Soll: aus dem Kalender, keine Enduco-Workouts auf der Uhr, die dort fehlten (dann war der Kalender lückenhaft),
    // und nicht vor «vollAb» (erste Woche, ab der alle Enduco-Einheiten in den Garmin-Kalender kamen)
    r.status = !S.length ? "ohne-plan" : r.soll.herkunft.kalender === 0 ? "nur-uhr" : r.laufend ? "laufend"
      : r.soll.herkunft.uhr > 0 || (opt.vollAb && mo < opt.vollAb) ? "teil" : "ok";
    return r;
  };

  /** Mehrere Wochen (älteste zuerst) mit Mittelwerten über abgeschlossene Wochen mit Kalender-Plan. */
  V7.verlauf = function (wochen) {
    const ok = (wochen || []).filter((w) => w.status === "ok" && w.abgeschlossen && w.soll.s > 0);
    const sum = (f) => ok.reduce((s, w) => s + f(w), 0);
    const soll = sum((w) => w.soll.s), ist = sum((w) => w.ist.netto);
    return { n: ok.length, soll_s: soll, ist_s: ist, diff_s: ist - soll, diff_pct: soll > 0 ? Math.round((100 * (ist - soll)) / soll) : null,
      treffer: ok.filter((w) => Math.abs(w.diff_pct) <= 10).length };
  };

  /** kalender-3.0: Tage einer beliebigen Woche (Montag mo) mit Zeichen je Sportart wie die Wochenleiste: geplant gilt als erledigt, wenn am
   *  selben Tag eine Aktivität derselben Sportart erfasst ist (jede Aktivität zählt einmal); vor heute nicht erledigt = verpasst. */
  V7.wocheTage = function (acts, planned, mo, heute) {
    const tage = [];
    for (let i = 0; i < 7; i++) {
      const iso = add(mo, i), ist = (acts || []).filter((a) => a && a.date === iso), plan = (planned || []).filter((p) => p && p.date === iso);
      const frei = ist.map((a) => a.sport || "andere"), zeichen = [];
      for (const p of plan) {
        const sp = p.sport || "andere", k = frei.indexOf(sp);
        if (k >= 0) { frei.splice(k, 1); zeichen.push({ sport: sp, art: "ist" }); } else zeichen.push({ sport: sp, art: iso < heute ? "verpasst" : "plan" });
      }
      for (const sp of frei) zeichen.push({ sport: sp, art: "ist" });
      tage.push({ iso, wt: "MDMDFSS"[i], heute: iso === heute, vorbei: iso < heute, zeichen });
    }
    return tage;
  };

  /** Anteile in Prozent (einzeln gerundet) oder null ohne Zeit. */
  V7.prozent = function (z) {
    const t = (z || []).reduce((s, v) => s + (v || 0), 0);
    return t > 0 ? z.map((v) => Math.round((100 * (v || 0)) / t)) : null;
  };

  /** Wochensummen absolvierter Netto-Stunden je Sportart für n Wochen bis zur Woche von «bis» (älteste zuerst). */
  V7.wochenUmfang = function (acts, bis, n) {
    const m0 = montag(bis), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const mo = add(m0, -7 * i), so = add(mo, 6), w = { mo, schwimm: 0, rad: 0, lauf: 0, andere: 0, s: 0, km: 0, hm: 0, n: 0 };
      for (const a of acts || []) {
        if (!a || !a.date || a.date < mo || a.date > so) continue;
        const d = isNum(a.mv) ? a.mv : isNum(a.dur) ? a.dur : 0, k = V7.SPORT3.includes(a.sport) ? a.sport : "andere";
        w[k] += d; w.s += d; w.n++; if (isNum(a.km)) w.km += a.km; if (isNum(a.hm)) w.hm += a.hm;
      }
      out.push(w);
    }
    return out;
  };
  return V7;
});
