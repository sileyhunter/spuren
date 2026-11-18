/* V8.2 «Persönliche Reaktionen» (Masterprompt V8, Abschnitte 4 und 13; Etappe V8.2, von Silas am 18.11.2026 freigegeben) – Rechenlogik ohne DOM.
   Was deine Historie über dich sagt, nur beschreibend und mit Unsicherheit:
   - erholung-nach-1.0 (V82.erholung): HRV, Ruhepuls und Puls bei gleicher Leistung an den drei Morgen bzw. Tagen nach harten und nach langen Einheiten,
     gegen deinen Schnitt der 7 Morgen davor; zum Vergleich nach Tagen ohne harte oder lange Einheit.
   - vertraeglich-1.0 (V82.vertraeglich): Wochen nach Zahl harter Einheiten, Wochenstunden und Lauf-km – Erholung (HRV, Ruhepuls) an den ersten drei Morgen
     der Woche danach gegen die vier Wochen davor; «bisher verträglich bis …» nur, wo genug Wochen sind.
   - verteilung-1.1 (V82.verteilung): Intensitätsverteilung je 4-Wochen-Block gegen die Effizienz im Block danach (Rad: Leistung je Pulsschlag in gleichmässigen
     Fahrten je System, Laufen: Meter je Pulsschlag in vergleichbaren Läufen) – ein Zusammenhang, keine Ursache. 1.1 (V8.5): klar nur, wenn mindestens 3 der 4
     möglichen Einteilungen der Blöcke (Beginn um je eine Woche verschoben) denselben klaren Zusammenhang zeigen – sonst hängt er davon ab, wo die Blöcke beginnen.
   - blockbilanz-1.0 (V82.bloecke): je 4-Wochen-Block Umfang, harte Einheiten, Verteilung, Fitness, Erholung, Effizienz und Tests, mit einem Satz.
   Alles nur mit Mindestzahl und 90-%-Intervall (Bootstrap des Medians, fester Startwert), sonst «noch zu wenig Daten». Grenzen und Mindestzahlen sind eigene
   Festlegungen (Wissen, Kapitel «reaktionen»). Nichts davon ändert den Plan; V8.3 und V8.5 lesen es später. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./formkurve.js"), require("./v81.js"));
  else root.V82 = factory(root.FK, root.V81);
})(typeof self !== "undefined" ? self : this, function (FK, V81) {
  "use strict";
  const V82 = { VERSIONS: { erholung: "erholung-nach-1.0", vertraeglich: "vertraeglich-1.0", verteilung: "verteilung-1.1", bloecke: "blockbilanz-1.0" } };
  V82.MIN = { faelle: 6, wochen: 4, paare: 8, block: 3 };   // Mindestzahlen: Fälle je Tag nach einer Einheit, Wochen je Gruppe, Block-Paare, Messungen je Block
  V82.HART_S = 300;                                         // ab 5 min über dem Puls an LT2 zählt eine Rad- oder Laufeinheit als hart
  V82.MITTEL_S = 1200;                                      // ab 20 min über dem Puls an LT1 (Schwelle, Tempo) als intensiv («mittel»)
  V82.SEED = 20261118;
  V82.EINTEILUNGEN = { von: 4, klar: 3 };                   // verteilung-1.1: so viele der 4 Einteilungen der Blöcke müssen denselben klaren Zusammenhang zeigen

  const isNum = (x) => typeof x === "number" && isFinite(x);
  const tagNr = (iso) => Math.floor(Date.parse(String(iso).slice(0, 10) + "T12:00:00Z") / 864e5);
  const isoVon = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
  const addDays = (iso, n) => isoVon(tagNr(iso) + n);
  const montag = (iso) => addDays(iso, -((new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7));
  const mittel = (L) => (L.length ? L.reduce((s, x) => s + x, 0) / L.length : null);
  const sd = (L) => { if (L.length < 2) return null; const m = mittel(L); return Math.sqrt(L.reduce((s, x) => s + (x - m) ** 2, 0) / (L.length - 1)); };
  const quant = (L, p) => { const v = L.filter(isNum).sort((x, y) => x - y); if (!v.length) return null; const k = (v.length - 1) * p, i = Math.floor(k), j = Math.min(i + 1, v.length - 1); return v[i] + (v[j] - v[i]) * (k - i); };
  const median = (L) => quant(L, 0.5);
  const r1 = (x) => (isNum(x) ? Math.round(x * 10) / 10 : null);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /** Median einer Bootstrap-Stichprobe aus den sortierten Werten S: n Ziehungen mit Zurücklegen als Zählung je Platz, dann bis zur Mitte gehen –
   *  gleiches Ergebnis wie Sortieren der Stichprobe, aber ohne Sortieren (schnell genug fürs iPhone). */
  function bootMedian(S, r, cnt) {
    const n = S.length; cnt.fill(0);
    for (let i = 0; i < n; i++) cnt[Math.floor(r() * n)]++;
    const k = (n - 1) * 0.5, lo = Math.floor(k), hi = Math.min(lo + 1, n - 1);
    let acc = 0, vlo = null;
    for (let j = 0; j < n; j++) { acc += cnt[j]; if (vlo === null && acc > lo) vlo = S[j]; if (acc > hi) return vlo + (S[j] - vlo) * (k - lo); }
    return vlo;
  }
  const sortiert = (L) => L.filter(isNum).sort((x, y) => x - y);
  /** 90-%-Intervall des Medians (Bootstrap, 1000 Ziehungen, fester Startwert – gleiche Daten, gleiches Ergebnis). */
  function kiMedian(L, seed) {
    const S = sortiert(L); if (S.length < 2) return null;
    const r = rng(seed || V82.SEED), B = new Float64Array(1000), cnt = new Uint32Array(S.length);
    for (let b = 0; b < 1000; b++) B[b] = bootMedian(S, r, cnt);
    return [quant(Array.from(B), 0.05), quant(Array.from(B), 0.95)];
  }
  const stat = (L, seed, mitKi) => ({ n: L.length, median: L.length ? median(L) : null, ki: mitKi === false ? null : kiMedian(L, seed), q: L.length ? [quant(L, 0.25), quant(L, 0.75)] : null });
  V82._intern = { median, quant, kiMedian, montag, addDays };          // spearman und kiDiff kommen weiter unten dazu

  /* ---------------- Einteilung der Einheiten ---------------- */
  const sekVon = (a) => (isNum(a.mv) ? a.mv : a.dur || 0);
  const lang = (a) => (a.sport === "rad" && sekVon(a) >= 3 * 3600) || (a.sport === "lauf" && sekVon(a) >= 1.5 * 3600);   // wie AN.wochenIst
  /** Zeit unter LT1, zwischen LT1 und LT2, über LT2 (s) nach Puls: mit den Pulsgrenzen des Profils vom Stichtag (Standard: heute) für die ganze Historie –
   *  sonst wären ältere Einheiten nach Garmins Pulszonen eingeteilt, die bei dir viel lockeres Training als «mittel» zählen. Ohne Profil wie FK.zone3. */
  function dreiZonen(a, zonen, stichtag) {
    if (FK && FK.pulsGrenzen && FK.histSplit && stichtag && Array.isArray(a.hh) && a.hh.some((x) => x > 0)) {
      const g = FK.pulsGrenzen(zonen, a.sport, stichtag);
      if (g) return { basis: "profil-heute", z: FK.histSplit(a.hh, g.lt1, g.lt2) };
    }
    return FK && FK.zone3 ? FK.zone3(a, zonen) : null;
  }
  V82.dreiZonen = dreiZonen;
  /** Art einer Rad- oder Laufeinheit: «hart» (ab 5 min über LT2), «mittel» (ab 20 min über LT1), «lang» (Rad ab 3 h, Laufen ab 1,5 h), «locker»; null = andere
   *  Sportart oder ohne Puls und nicht lang. */
  V82.art = function (a, zonen, stichtag) {
    if (!a || !["rad", "lauf"].includes(a.sport) || (FK && FK.zaehlt && !FK.zaehlt(a))) return null;
    const q = dreiZonen(a, zonen, stichtag);
    if (q && q.z[2] >= V82.HART_S) return "hart";
    if (q && q.z[1] + q.z[2] >= V82.MITTEL_S) return "mittel";
    if (lang(a)) return "lang";
    return q ? "locker" : null;
  };
  const intensiv = (k) => k === "hart" || k === "mittel";
  function tagIndex(acts, zonen, stichtag) {
    const T = new Map();
    for (const a of acts || []) {
      const k = V82.art(a, zonen, stichtag); if (!k || !a.date) continue;
      const t = T.get(a.date) || { arten: new Set(), sport: new Set(), acts: [] };
      t.arten.add(k); if (intensiv(k)) t.sport.add(a.sport); t.acts.push({ a, k });
      T.set(a.date, t);
    }
    return T;
  }
  const istIntensiv = (t) => !!t && (t.arten.has("hart") || t.arten.has("mittel"));
  const istLang = (t) => !!t && t.arten.has("lang");
  function reihen(D) {
    const H = new Map(), R = new Map();
    for (const d of (D && D.days) || []) {
      if (!d || !d.date) continue;
      if (isNum(d.hrv) && d.hrv > 0) H.set(d.date, Math.log(d.hrv));
      if (isNum(d.rhr) && d.rhr > 20) R.set(d.date, d.rhr);
    }
    return { H, R };
  }
  /** Schnitt einer Tagesreihe über die n Tage bis und mit «bis» (mindestens min Werte). */
  function schnitt(M, bis, n, min) { const L = []; for (let i = 0; i < n; i++) { const v = M.get(addDays(bis, -i)); if (isNum(v)) L.push(v); } return L.length >= min ? mittel(L) : null; }
  const hrvProzent = (ln, basis) => (Math.exp(ln - basis) - 1) * 100;
  function letzterTag(D) {
    let m = null;
    for (const a of (D && D.activities) || []) if (a && a.date && (!m || a.date > m)) m = a.date;
    for (const d of (D && D.days) || []) if (d && d.date && (!m || d.date > m)) m = d.date;
    return m;
  }

  /* ---------------- erholung-nach-1.0 ---------------- */
  /** Kleinste bedeutsame Abweichung je Marker: halbe Standardabweichung der täglichen Abweichung vom Schnitt der 7 Tage davor (wie bei Plews et al. 2014). */
  function swcTage(M, von, bis, alsProzent) {
    const L = [];
    for (let n = tagNr(von), e = tagNr(bis); n <= e; n++) {
      const d = isoVon(n), v = M.get(d); if (!isNum(v)) continue;
      const b = schnitt(M, addDays(d, -1), 7, 4); if (b == null) continue;
      L.push(alsProzent ? hrvProzent(v, b) : v - b);
    }
    const s = sd(L);
    return s != null && L.length >= 20 ? 0.5 * s : null;
  }
  const MARKER = {
    hrv: { name: "HRV", einheit: "%", schlecht: -1, dez: 0 },
    rhr: { name: "Ruhepuls", einheit: "bpm", schlecht: 1, dez: 1 },
    puls: { name: "Puls bei gleicher Leistung", einheit: "bpm", schlecht: 1, dez: 1 },
  };
  V82.MARKER = MARKER;
  /** 90-%-Intervall des Unterschieds zweier Mediane (A − B; Bootstrap beider Gruppen). */
  function kiDiff(A, B, seed) {
    const SA = sortiert(A), SB = sortiert(B);
    if (SA.length < 2 || SB.length < 2) return null;
    const r = rng(seed || V82.SEED), D = new Array(1000), cA = new Uint32Array(SA.length), cB = new Uint32Array(SB.length);
    for (let b = 0; b < 1000; b++) D[b] = bootMedian(SA, r, cA) - bootMedian(SB, r, cB);
    return [quant(D, 0.05), quant(D, 0.95)];
  }
  /** Deutlich anders in der ungünstigen Richtung: Intervall ohne 0 und Unterschied mindestens so gross wie die tägliche Schwankung (SWC; wie FK.entwicklung). */
  const deutlich = (diff, ki, swc, schlecht) => isNum(diff) && !!ki && isNum(swc) && (schlecht < 0 ? ki[1] < 0 && diff <= -swc : ki[0] > 0 && diff >= swc);
  V82.deutlich = deutlich;
  /** Urteil über die Tage 1–3 eines Markers: ab welchem Tag ist der Unterschied zu ruhigen Tagen nicht mehr deutlich? */
  function urteilTage(tage, swc, schlecht) {
    const M = V82.MIN.faelle;
    if (!tage[0] || tage[0].n < M) return { status: "zu wenig", erholtTag: null };
    if (!isNum(swc)) return { status: "ohne Grenze", erholtTag: null };
    for (const s of tage) {
      if (s.n < M || !s.kiDiff) return { status: "offen", erholtTag: null, bisTag: s.k - 1 };
      if (!deutlich(s.diff, s.kiDiff, swc, schlecht)) return { status: s.k === 1 ? "schnell" : "erholt", erholtTag: s.k };
    }
    return { status: "länger", erholtTag: null };
  }
  /**
   * Erholung nach harten bzw. langen Einheiten. opt = { heute (Stichtag; Pulsgrenzen von dann), zonen, tage (Rückblick, Standard 730), mitPuls (Standard ja) }.
   * Je Tag nach der Einheit die Abweichung vom Schnitt der 7 Morgen davor, verglichen mit derselben Abweichung nach Tagen ohne harte oder lange Einheit
   * (die tägliche Abweichung ist auch ohne Training nicht null, z. B. weil die Morgen davor selbst nach harten Tagen lagen).
   * → { v, von, bis, swc: {hrv, rhr, puls}, gruppen: { intensiv, rad, lauf, lang, ruhig }, erholtTag, text[] }
   *   je Gruppe: { name, n (Tage), marker: { hrv|rhr|puls: { tage: [{k, n, median, ki, diff, kiDiff}], status, erholtTag } } }
   */
  V82.erholung = function (D, opt) {
    opt = Object.assign({ heute: null, tage: 730, mitPuls: true }, opt || {});
    const zonen = opt.zonen !== undefined ? opt.zonen : D && D.zonen;
    const stichtag = opt.heute || letzterTag(D);
    if (!stichtag) return null;
    const bis = opt.heute ? addDays(opt.heute, -1) : stichtag, von = addDays(bis, -opt.tage), acts = (D && D.activities) || [];
    const T = tagIndex(acts, zonen, stichtag), { H, R } = reihen(D);
    const swc = { hrv: swcTage(H, von, bis, true), rhr: swcTage(R, von, bis, false), puls: null };
    // Puls bei gleicher Leistung je Aktivität (hf-leistung-1.0), einmal gerechnet
    const P = new Map();
    if (opt.mitPuls && V81 && V81.pulsZurLeistung) {
      const alle = [];
      for (const a of acts) {
        if (!a || !a.date || a.date < von || a.date > bis || !["rad", "lauf"].includes(a.sport) || !(a.eb || a.wk)) continue;
        const r = V81.pulsZurLeistung(acts, a);
        if (r && r.quelle && isNum(r.delta)) { const L = P.get(a.date) || []; L.push(r.delta); P.set(a.date, L); alle.push(r.delta); }
      }
      const s = sd(alle); swc.puls = s != null && alle.length >= 20 ? 0.5 * s : null;
    }
    const belastet = (d) => istIntensiv(T.get(d)) || istLang(T.get(d));
    const abweichungen = (tage) => {
      const dev = { hrv: [[], [], []], rhr: [[], [], []], puls: [[], [], []] };
      for (const d of tage) {
        const bH = schnitt(H, d, 7, 4), bR = schnitt(R, d, 7, 4);
        for (let k = 1; k <= 3; k++) {
          if (k >= 2 && belastet(addDays(d, k - 1))) break;           // an Tag k−1 kam schon die nächste harte bzw. lange Einheit
          const x = addDays(d, k);
          if (x > bis) break;
          const h = H.get(x), r = R.get(x);
          if (bH != null && isNum(h)) dev.hrv[k - 1].push(hrvProzent(h, bH));
          if (bR != null && isNum(r)) dev.rhr[k - 1].push(r - bR);
          const p = P.get(x); if (p && p.length) dev.puls[k - 1].push(p[0]);
        }
      }
      return dev;
    };
    const tage = [...T.keys()].filter((d) => d >= von && d <= bis).sort();
    const tI = tage.filter((d) => istIntensiv(T.get(d))), tL = tage.filter((d) => !istIntensiv(T.get(d)) && istLang(T.get(d)));
    const ruhig = [];
    for (let n = tagNr(von), e = tagNr(bis); n <= e; n++) {                   // ruhig: an diesem und den zwei Tagen davor nichts Hartes oder Langes, Morgenwert am Tag danach
      const d = isoVon(n), x = addDays(d, 1);
      if (!belastet(d) && !belastet(addDays(d, -1)) && !belastet(addDays(d, -2)) && (H.has(x) || R.has(x))) ruhig.push(d);
    }
    const nurSport = (sp) => tI.filter((d) => T.get(d).sport.size === 1 && T.get(d).sport.has(sp));
    const devR = abweichungen(ruhig);
    const gruppe = (name, tg, vergleich) => {
      const dev = abweichungen(tg), marker = {};
      for (const m of Object.keys(MARKER)) {
        const t = dev[m].map((L, i) => {
          const st = Object.assign({ k: i + 1 }, stat(L, V82.SEED + i + m.length, false));   // Intervall nur für den Unterschied (unten)
          if (vergleich && L.length && devR[m][i].length >= V82.MIN.faelle) {           // Vergleichstage ebenfalls mit Mindestzahl
            st.diff = median(L) - median(devR[m][i]);
            st.kiDiff = kiDiff(L, devR[m][i], V82.SEED + 7 * i + m.length);
          }
          return st;
        });
        marker[m] = Object.assign({ tage: t }, vergleich ? urteilTage(t, swc[m], MARKER[m].schlecht) : {});
      }
      return { name, n: tg.length, marker };
    };
    const G = {
      intensiv: gruppe("Harte Einheiten (Rad und Laufen)", tI, true),
      rad: gruppe("Harte Einheiten Rad", nurSport("rad"), true),
      lauf: gruppe("Harte Einheiten Laufen", nurSport("lauf"), true),
      lang: gruppe("Lange Einheiten", tL, true),
      ruhig: gruppe("Tage ohne harte oder lange Einheit", ruhig, false),
    };
    // Abstand, den deine Daten nach harten Einheiten zeigen: der spätere der Tage (HRV, Ruhepuls), ab dem kein deutlicher Unterschied mehr bleibt
    const tg = ["hrv", "rhr"].map((m) => G.intensiv.marker[m]).filter((x) => x.erholtTag);
    const erholtTag = tg.length === 2 ? Math.max(...tg.map((x) => x.erholtTag)) : null;
    return { v: V82.VERSIONS.erholung, von, bis, swc: { hrv: r1(swc.hrv), rhr: r1(swc.rhr), puls: r1(swc.puls) }, gruppen: G, erholtTag, text: V82.erholungText(G, swc) };
  };
  const vz = (x, dez) => { const k = 10 ** (dez || 0), v = Math.round(x * k) / k; return (v > 0 ? "+" : v < 0 ? "−" : "±") + String(Math.abs(v).toFixed(dez || 0)).replace(".", ","); };
  V82.wert = (x, m) => (isNum(x) ? `${vz(x, MARKER[m].dez)} ${MARKER[m].einheit}` : "–");
  /** Sätze zu einer Gruppe (ohne Ursache, nur Beobachtung). */
  V82.gruppeText = function (g, swc) {
    const out = [], M = V82.MIN.faelle;
    if (!g || g.n < M) return [`${g ? g.name : "Gruppe"}: noch zu wenig Daten (${g ? g.n : 0} von ${M} Tagen).`];
    for (const m of ["hrv", "rhr", "puls"]) {
      const x = g.marker[m], t1 = x.tage[0], nm = MARKER[m].name, tag = m === "puls" ? "Tag" : "Morgen";
      if (x.status === "zu wenig") { out.push(`${nm}: noch zu wenig Daten (${t1.n} von ${M} Fällen am ${tag} danach).`); continue; }
      if (!isNum(t1.diff)) { out.push(`${nm}: kein Vergleich mit ruhigen Tagen möglich.`); continue; }
      const b = `${nm} am ${tag} danach ${V82.wert(t1.diff, m)} gegenüber ruhigen Tagen (90-%-Intervall ${V82.wert(t1.kiDiff[0], m)} bis ${V82.wert(t1.kiDiff[1], m)}, n = ${t1.n})`;
      const sw = isNum(swc[m]) ? ` (tägliche Schwankung ±${String(r1(swc[m])).replace(".", ",")} ${MARKER[m].einheit})` : "";
      const e = x.status === "schnell" ? `im Rahmen der täglichen Schwankung${sw}` : x.status === "erholt" ? `deutlich, ab Tag ${x.erholtTag} wieder im Rahmen${sw}` :
        x.status === "länger" ? "auch am dritten Tag noch deutlich" : x.status === "offen" ? "deutlich; für die Tage danach noch zu wenige Fälle" : "ohne Vergleichsgrenze";
      out.push(`${b} – ${e}.`);
    }
    return out;
  };
  V82.erholungText = (G, swc) => V82.gruppeText(G.intensiv, swc);

  /* ---------------- vertraeglich-1.0 ---------------- */
  V82.GRUPPEN = {
    harte: { name: "Harte Einheiten pro Woche", grenzen: [0, 1, 2, 3, 4], label: (i, g) => (i === g.length - 1 ? `${g[i]}+` : `${g[i]}`) },
    stunden: { name: "Wochenstunden (Schwimmen, Rad, Laufen)", grenzen: [0, 6, 8, 10, 12, 14], label: (i, g) => (i === 0 ? `unter ${g[1]} h` : i === g.length - 1 ? `ab ${g[i]} h` : `${g[i]}–${g[i + 1]} h`) },
    laufkm: { name: "Lauf-km pro Woche", grenzen: [0, 15, 25, 35, 45], label: (i, g) => (i === 0 ? `unter ${g[1]} km` : i === g.length - 1 ? `ab ${g[i]} km` : `${g[i]}–${g[i + 1]} km`) },
  };
  const leereWoche = (mo) => ({ mo, harte: 0, lang: 0, stunden: 0, laufkm: 0, tl: 0, sport: { schwimm: 0, rad: 0, lauf: 0 } });
  /** Kennzahlen je Woche (Montag → {harte, lang, stunden, laufkm, tl, sport}). */
  V82.wochen = function (D, zonen, von, bis, stichtag) {
    const W = new Map();
    for (const a of (D && D.activities) || []) {
      if (!a || !a.date || a.date < von || a.date > bis || (FK && FK.zaehlt && !FK.zaehlt(a))) continue;
      const mo = montag(a.date), w = W.get(mo) || leereWoche(mo);
      const k = V82.art(a, zonen, stichtag);
      if (intensiv(k)) w.harte++;
      if (k === "lang") w.lang++;
      if (["schwimm", "rad", "lauf"].includes(a.sport)) { const h = sekVon(a) / 3600; w.stunden += h; w.sport[a.sport] += h; }
      if (a.sport === "lauf" && isNum(a.km)) w.laufkm += a.km;
      if (isNum(a.tss)) w.tl += a.tss;
      W.set(mo, w);
    }
    return W;
  };
  /**
   * Was du bisher verträgst. Je Woche: Zahl harter Einheiten, Stunden, Lauf-km; Antwort = HRV und Ruhepuls an den ersten drei Morgen der Woche danach (mindestens 2)
   * gegen den Schnitt der 28 Tage vor der Woche (mindestens 14). Bezug = deine üblichen Wochen (die Gruppe mit dem Median); beurteilt werden nur Gruppen darüber –
   * Wochen mit weniger als üblich sind oft Ferien- oder Krankheitswochen und taugen nicht als Vergleich.
   * opt = { heute, zonen, wochen (Rückblick, Standard 104) }.
   * → { v, von, bis, swc, dim: { harte|stunden|laufkm: { name, bezug, gruppen: [{label, n, hrv, rhr, diff, schlechter}], bis, ab, text } }, max, n }
   */
  V82.vertraeglich = function (D, opt) {
    opt = Object.assign({ heute: null, wochen: 104 }, opt || {});
    const zonen = opt.zonen !== undefined ? opt.zonen : D && D.zonen;
    const ende = opt.heute || letzterTag(D); if (!ende) return null;
    const letzte = addDays(montag(ende), -7);                                    // letzte abgeschlossene Woche (die Antwort braucht die Woche danach)
    const von = addDays(letzte, -7 * (opt.wochen - 1)), W = V82.wochen(D, zonen, von, addDays(letzte, 6), ende), { H, R } = reihen(D);
    const L = [];
    for (let mo = von; mo <= letzte; mo = addDays(mo, 7)) {
      if (!W.has(mo)) continue;                                                  // Wochen ohne Aufzeichnung (Ferien, Uhr vergessen) zählen nicht
      const w = W.get(mo);
      const bH = schnitt(H, addDays(mo, -1), 28, 14), bR = schnitt(R, addDays(mo, -1), 28, 14);
      const nach = [7, 8, 9].map((i) => addDays(mo, i)).filter((d) => d <= ende);
      const hv = nach.map((d) => H.get(d)).filter(isNum), rv = nach.map((d) => R.get(d)).filter(isNum);
      w.hrv = bH != null && hv.length >= 2 ? hrvProzent(mittel(hv), bH) : null;
      w.rhr = bR != null && rv.length >= 2 ? mittel(rv) - bR : null;
      L.push(w);
    }
    // Grenze: halbe Standardabweichung der Wochen-Antworten, mindestens aber die tägliche Schwankung, für drei Morgen gemittelt (÷ √3) – sonst wäre bei
    // sehr regelmässigen Wochen schon ein Unterschied von Bruchteilen eines Prozents «deutlich».
    const sH = sd(L.map((w) => w.hrv).filter(isNum)), sR = sd(L.map((w) => w.rhr).filter(isNum));
    const tH = swcTage(H, addDays(von, -28), addDays(letzte, 9), true), tR = swcTage(R, addDays(von, -28), addDays(letzte, 9), false);
    const grenze = (w, t) => (w == null && t == null ? null : Math.max(w == null ? 0 : 0.5 * w, t == null ? 0 : t / Math.sqrt(3)));
    const swc = { hrv: grenze(sH, tH), rhr: grenze(sR, tR) };
    const dim = {};
    for (const [key, G] of Object.entries(V82.GRUPPEN)) {
      const g = G.grenzen, gruppen = g.map((lo, i) => ({ label: G.label(i, g), lo, hi: i < g.length - 1 ? g[i + 1] : Infinity, wochen: [] }));
      for (const w of L) {
        const x = key === "harte" ? w.harte : key === "stunden" ? w.stunden : w.laufkm;
        const gi = gruppen.findIndex((q) => (key === "harte" ? (q.hi === Infinity ? x >= q.lo : x === q.lo) : x >= q.lo && x < q.hi));
        if (gi >= 0) gruppen[gi].wochen.push(w);
      }
      for (const [i, q] of gruppen.entries()) {
        q.n = q.wochen.length;
        q.hrvL = q.wochen.map((w) => w.hrv).filter(isNum); q.rhrL = q.wochen.map((w) => w.rhr).filter(isNum);
        q.hrv = stat(q.hrvL, V82.SEED + 11 + i); q.rhr = stat(q.rhrL, V82.SEED + 23 + i);
        q.genug = Math.max(q.hrv.n, q.rhr.n) >= V82.MIN.wochen;
      }
      const werte = L.map((w) => (key === "harte" ? w.harte : key === "stunden" ? w.stunden : w.laufkm)), med = werte.length ? median(werte) : null;
      let bi = med == null ? -1 : gruppen.findIndex((q) => (key === "harte" ? (q.hi === Infinity ? Math.round(med) >= q.lo : Math.round(med) === q.lo) : med >= q.lo && med < q.hi));
      if (bi >= 0 && !gruppen[bi].genug) {                                       // nächste Gruppe mit genug Wochen
        const k = gruppen.map((q, i) => ({ q, i })).filter((x) => x.q.genug).sort((a, b) => Math.abs(a.i - bi) - Math.abs(b.i - bi) || a.i - b.i)[0];
        bi = k ? k.i : -1;
      }
      const bezug = bi >= 0 ? gruppen[bi] : null;
      for (const [i, q] of gruppen.entries()) {
        q.diff = {}; q.schlechter = false; q.unter = bi >= 0 && i < bi;
        if (bezug && i > bi && q.genug) {
          for (const [m, Lq, Lb, sc] of [["rhr", q.rhrL, bezug.rhrL, 1], ["hrv", q.hrvL, bezug.hrvL, -1]]) {
            if (Lq.length < V82.MIN.wochen || Lb.length < V82.MIN.wochen) continue;
            const d = median(Lq) - median(Lb), ki = kiDiff(Lq, Lb, V82.SEED + 31 + i + m.length);
            q.diff[m] = { d, ki };
            if (deutlich(d, ki, swc[m], sc)) q.schlechter = true;
          }
        }
      }
      for (const q of gruppen) { delete q.wochen; delete q.hrvL; delete q.rhrL; }
      let bisL = null, abL = null;
      if (bezug) for (const q of gruppen.slice(bi)) { if (!q.genug) continue; if (q.schlechter) { abL = q.label; break; } bisL = q.label; }
      dim[key] = { name: G.name, bezug: bezug ? bezug.label : null, median: med, gruppen, bis: bisL, ab: abL, text: vertraeglichText(G, gruppen, bezug, bisL, abL) };
    }
    const max = { harte: Math.max(0, ...L.map((w) => w.harte)), stunden: r1(Math.max(0, ...L.map((w) => w.stunden))), laufkm: r1(Math.max(0, ...L.map((w) => w.laufkm))) };
    return { v: V82.VERSIONS.vertraeglich, von, bis: addDays(letzte, 6), swc: { hrv: r1(swc.hrv), rhr: r1(swc.rhr) }, dim, max, n: L.length };
  };
  function vertraeglichText(G, gruppen, bezug, bisL, abL) {
    const ueber = bezug ? gruppen.slice(gruppen.indexOf(bezug) + 1).filter((q) => q.genug) : [];
    if (!bezug) return `${G.name}: noch zu wenig Daten (je Gruppe mindestens ${V82.MIN.wochen} Wochen).`;
    if (!ueber.length) return `${G.name}: üblich sind ${bezug.label}; für mehr noch zu wenig Wochen (je Gruppe mindestens ${V82.MIN.wochen}).`;
    let t = `${G.name}: gegenüber deinen üblichen Wochen (${bezug.label}) ${abL && bisL === bezug.label ? "schon darüber" : `bis ${bisL}`} keine deutlich schlechtere Erholung in der Woche danach`;
    if (abL && bisL === bezug.label) t = `${G.name}: gegenüber deinen üblichen Wochen (${bezug.label}) schon bei mehr eine deutlich schlechtere Erholung in der Woche danach`;
    if (abL) {
      const q = gruppen.find((x) => x.label === abL), z = [];
      if (q.diff.rhr) z.push(`Ruhepuls ${V82.wert(q.diff.rhr.d, "rhr")}`);
      if (q.diff.hrv) z.push(`HRV ${V82.wert(q.diff.hrv.d, "hrv")}`);
      t += `; bei ${abL}: ${z.join(", ")} (n = ${q.n} Wochen)`;
    }
    const ohne = gruppen.filter((q, i) => !q.genug && q.n > 0 && i > gruppen.indexOf(bezug)).map((q) => q.label);
    if (ohne.length) t += `; ${ohne.join(", ")}: noch zu wenig Wochen`;
    return t + ".";
  }

  /* ---------------- Effizienz und Blöcke ---------------- */
  /** Rad-Effizienz: normierte Leistung je Pulsschlag (W/bpm) aus gleichmässigen Fahrten (ab 40 min, VI ≤ 1,10, unter 5 % der Zeit hart), je System
   *  (drinnen, draussen) auf den eigenen Median bezogen – zwei Leistungsmesser lassen sich so nicht vermischen. → [{date, y (relativ, 1 = Median)}] */
  V82.radEffizienz = function (acts, zonen, stichtag) {
    const P = [];
    for (const a of acts || []) {
      if (!a || a.sport !== "rad" || !isNum(a.np) || !isNum(a.hr) || a.hr < 80 || !isNum(a.watt) || a.watt <= 0 || sekVon(a) < 2400) continue;
      if (a.np / a.watt > 1.10) continue;
      const q = dreiZonen(a, zonen, stichtag);
      if (q) { const s = q.z[0] + q.z[1] + q.z[2]; if (s > 0 && q.z[2] / s >= 0.05) continue; }
      P.push({ date: a.date, sys: a.indoor ? "drinnen" : "draussen", ef: a.np / a.hr });
    }
    const out = [];
    for (const sys of ["drinnen", "draussen"]) {
      const L = P.filter((p) => p.sys === sys); if (L.length < 10) continue;
      const m = median(L.map((p) => p.ef));
      for (const p of L) out.push({ date: p.date, y: p.ef / m, sys });
    }
    return out.sort((x, y) => x.date.localeCompare(y.date));
  };
  /** Lauf-Effizienz: Meter je Pulsschlag aus vergleichbaren Läufen (laufeffizienz-1.1, laufvergleich-1.0). */
  V82.laufEffizienz = function (acts) {
    if (!FK || !FK.laufEffizienz) return [];
    const r = FK.laufEffizienz(acts, { n: 100000 });
    const m = median(r.punkte.map((p) => p.y));
    return m ? r.punkte.map((p) => ({ date: p.date, y: p.y / m })) : [];
  };
  /** 4-Wochen-Blöcke bis zur letzten abgeschlossenen Woche; opt.anker = Montag einer Erholungswoche (saison-1.2): die Blöcke enden mit solchen Wochen. */
  function bloeckeRoh(ende, n, anker) {
    let letzte = addDays(montag(ende), -7);
    if (anker) { const d = Math.round((tagNr(letzte) - tagNr(montag(anker))) / 7); letzte = addDays(letzte, -7 * (((d % 4) + 4) % 4)); }
    const B = [];
    for (let i = n - 1; i >= 0; i--) { const bisMo = addDays(letzte, -28 * i); B.push({ von: addDays(bisMo, -21), bis: addDays(bisMo, 6) }); }
    return B;
  }
  /** Spearman-Rangkorrelation mit 90-%-Intervall (Bootstrap über Paare). */
  function spearman(X, Y, seed) {
    const rank = (L) => { const s = L.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(L.length); let i = 0;
      while (i < s.length) { let j = i; while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++; for (let k = i; k <= j; k++) r[s[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
    const pear = (a, b) => { const ma = mittel(a), mb = mittel(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa && sbb ? sab / Math.sqrt(saa * sbb) : null; };
    const rho = (x, y) => pear(rank(x), rank(y));
    const r0 = rho(X, Y); if (r0 == null) return null;
    const g = rng(seed || V82.SEED), B = [];
    for (let b = 0; b < 1000; b++) { const xs = [], ys = []; for (let i = 0; i < X.length; i++) { const j = Math.floor(g() * X.length); xs.push(X[j]); ys.push(Y[j]); } const r = rho(xs, ys); if (r != null) B.push(r); }
    return { rho: r0, ki: B.length >= 100 ? [quant(B, 0.05), quant(B, 0.95)] : null };
  }
  V82._intern.spearman = spearman;
  /** Kennzahlen eines Blocks. */
  function blockWerte(D, b, zonen, ctx) {
    const acts = ((D && D.activities) || []).filter((a) => a && a.date >= b.von && a.date <= b.bis && (!FK || !FK.zaehlt || FK.zaehlt(a)));
    const st = { schwimm: 0, rad: 0, lauf: 0, andere: 0 }; let harte = 0, langN = 0, tl = 0; const z = [0, 0, 0];
    for (const a of acts) {
      st[["schwimm", "rad", "lauf"].includes(a.sport) ? a.sport : "andere"] += sekVon(a) / 3600;
      const k = V82.art(a, zonen, ctx.stichtag); if (intensiv(k)) harte++; if (k === "lang") langN++;
      if (isNum(a.tss)) tl += a.tss;
      if (["rad", "lauf"].includes(a.sport)) { const q = dreiZonen(a, zonen, ctx.stichtag); if (q) q.z.forEach((v, j) => (z[j] += v)); }
    }
    const zs = z[0] + z[1] + z[2], tid = zs > 0 ? z.map((v) => Math.round((100 * v) / zs)) : null;
    const tage = []; for (let n = tagNr(b.von), e = tagNr(b.bis); n <= e; n++) tage.push(isoVon(n));
    const hv = tage.map((d) => ctx.H.get(d)).filter(isNum), rv = tage.map((d) => ctx.R.get(d)).filter(isNum);
    const effR = ctx.effRad.filter((p) => p.date >= b.von && p.date <= b.bis).map((p) => p.y), effL = ctx.effLauf.filter((p) => p.date >= b.von && p.date <= b.bis).map((p) => p.y);
    const ctl = (d) => { const p = ctx.pmc.get(d); return p ? p.ctl : null; };
    const tests = [];
    for (const l of (D && D.lactate) || []) if (l && l.date >= b.von && l.date <= b.bis) tests.push(l.kind === "stufentest" ? `Stufentest ${l.sport === "lauf" ? "Laufen" : "Rad"}` : "Laktat-Kurzcheck");
    for (const c of (D && D.css_tests) || []) if (c && c.datum >= b.von && c.datum <= b.bis) tests.push("CSS-Test");
    const ampel = ((D && D.ampel_anpassung) || []).filter((x) => x && x.date >= b.von && x.date <= b.bis && ["vorsichtig", "krank"].includes(x.status)).length;
    return {
      von: b.von, bis: b.bis, stunden: { schwimm: r1(st.schwimm), rad: r1(st.rad), lauf: r1(st.lauf), andere: r1(st.andere), gesamt: r1(st.schwimm + st.rad + st.lauf),
        proWoche: r1((st.schwimm + st.rad + st.lauf) / 4) },
      harte, lang: langN, tlProWoche: Math.round(tl / 4), tid, ctl: { start: r1(ctl(addDays(b.von, -1))), ende: r1(ctl(b.bis)) },
      hrv: hv.length >= 7 ? Math.exp(mittel(hv)) : null, rhr: rv.length >= 7 ? mittel(rv) : null,
      effRad: effR.length >= V82.MIN.block ? median(effR) : null, nRad: effR.length, effLauf: effL.length >= V82.MIN.block ? median(effL) : null, nLauf: effL.length,
      tests: [...new Set(tests)], ampel,
    };
  }
  function kontext(D, zonen, ende) {
    const acts = (D && D.activities) || [], { H, R } = reihen(D), pmc = new Map();
    if (FK && FK.pmc && acts.length) {
      const byDay = new Map(); for (const a of acts) if (a && a.date && (!FK.zaehlt || FK.zaehlt(a))) byDay.set(a.date, (byDay.get(a.date) || 0) + (a.tss || 0));
      const erste = acts.reduce((m, a) => (a && a.date && (!m || a.date < m) ? a.date : m), null);
      for (const p of FK.pmc(byDay, erste, ende)) pmc.set(p.date, p);
    }
    return { H, R, pmc, stichtag: ende, effRad: V82.radEffizienz(acts, zonen, ende), effLauf: V82.laufEffizienz(acts) };
  }
  V82.kontext = kontext;
  /**
   * Verteilung gegen Entwicklung: je Paar aufeinanderfolgender Blöcke der Anteil hart bzw. mittel im ersten gegen die Veränderung der Effizienz zum zweiten.
   * opt = { heute, zonen, bloecke (Standard 26), anker }. → { v, n, paare: [...], zusammenhang: [{x, marker, n, rho, ki, status, text}], text[] }
   */
  /** Zusammenhänge einer Einteilung der Blöcke (Anker anker). */
  function verteilungEin(D, opt, ctx, zonen, ende, anker) {
    const B = bloeckeRoh(ende, opt.bloecke, anker).map((b) => blockWerte(D, b, zonen, ctx));
    const paare = [];
    for (let i = 0; i + 1 < B.length; i++) {
      const a = B[i], b = B[i + 1]; if (!a.tid) continue;
      paare.push({ von: a.von, hart: a.tid[2], mittel: a.tid[1], dRad: isNum(a.effRad) && isNum(b.effRad) ? 100 * (b.effRad / a.effRad - 1) : null,
        dLauf: isNum(a.effLauf) && isNum(b.effLauf) ? 100 * (b.effLauf / a.effLauf - 1) : null });
    }
    const Z = [];
    for (const [x, xn] of [["hart", "Anteil hart"], ["mittel", "Anteil mittel"]]) for (const [m, mn] of [["dRad", "Rad-Effizienz"], ["dLauf", "Lauf-Effizienz"]]) {
      const P = paare.filter((p) => isNum(p[m]));
      const r = { x, marker: m, n: P.length, name: `${xn} im Block → ${mn} im Block danach` };
      if (P.length < V82.MIN.paare) { r.status = "zu wenig"; Z.push(r); continue; }
      const sp = spearman(P.map((p) => p[x]), P.map((p) => p[m]), V82.SEED + Z.length);
      Object.assign(r, sp ? { rho: Math.round(sp.rho * 100) / 100, ki: sp.ki ? [Math.round(sp.ki[0] * 100) / 100, Math.round(sp.ki[1] * 100) / 100] : null } : {});
      r.status = !sp || !sp.ki ? "unklar" : sp.ki[0] > 0 ? "positiv" : sp.ki[1] < 0 ? "negativ" : "kein klarer";
      Z.push(r);
    }
    return { B, paare, Z };
  }
  /** Verteilung je Block gegen die Effizienz im Block danach. opt = { heute, zonen, bloecke (26), anker (Erholungswoche), einteilungen (4; 1 = nur diese) }.
   *  verteilung-1.1: der Zusammenhang zählt als klar, wenn mindestens V82.EINTEILUNGEN.klar der Einteilungen (Anker um 0–3 Wochen verschoben) denselben klaren
   *  Zusammenhang zeigen; Rangkorrelation und Intervall gezeigt aus der Einteilung am Anker, dazu die Spanne über alle. */
  V82.verteilung = function (D, opt, ctx0) {
    opt = Object.assign({ heute: null, bloecke: 26, anker: null, einteilungen: V82.EINTEILUNGEN.von }, opt || {});
    const zonen = opt.zonen !== undefined ? opt.zonen : D && D.zonen;
    const ende = opt.heute || letzterTag(D); if (!ende) return null;
    const ctx = ctx0 || kontext(D, zonen, ende);
    const a0 = opt.anker || montag(ende), E = Math.max(1, Math.min(4, opt.einteilungen | 0));
    const alle = []; for (let k = 0; k < E; k++) alle.push(verteilungEin(D, opt, ctx, zonen, ende, k ? addDays(a0, 7 * k) : opt.anker));
    const H = alle[0], kz = (v) => v.toFixed(2).replace(".", ",").replace("-", "−");
    for (const r of H.Z) {
      const V = alle.map((x) => x.Z.find((z) => z.x === r.x && z.marker === r.marker)).filter(Boolean), ok = V.filter((z) => z.status !== "zu wenig" && isNum(z.rho));
      const neg = ok.filter((z) => z.status === "negativ").length, pos = ok.filter((z) => z.status === "positiv").length;
      const noetig = E >= 4 ? V82.EINTEILUNGEN.klar : E;
      r.einteilungen = { von: V.length, negativ: neg, positiv: pos, rho: ok.length ? [Math.min(...ok.map((z) => z.rho)), Math.max(...ok.map((z) => z.rho))] : null,
        n: V.length ? [Math.min(...V.map((z) => z.n)), Math.max(...V.map((z) => z.n))] : null };
      if (r.status === "zu wenig") { r.text = `${r.name}: noch zu wenig Daten (${r.n} von ${V82.MIN.paare} Block-Paaren).`; continue; }
      const robust = neg >= noetig ? "negativ" : pos >= noetig ? "positiv" : null, inDieser = r.status;
      r.status = robust || (r.status === "unklar" ? "unklar" : "kein klarer");
      r.instabil = !robust && (neg > 0 || pos > 0);
      const zahlen = isNum(r.rho) ? ` (Rangkorrelation ${kz(r.rho)}${r.ki ? `, 90-%-Intervall ${kz(r.ki[0])} bis ${kz(r.ki[1])}` : ""}, n = ${r.n}` +
        (E > 1 && r.einteilungen.rho ? `; je nach Einteilung der Blöcke ${kz(r.einteilungen.rho[0])} bis ${kz(r.einteilungen.rho[1])}, klar in ${Math.max(neg, pos)} von ${E}` : "") + ")" : "";
      r.text = `${r.name}: ${r.status === "positiv" ? "mehr ging eher mit besserer Effizienz einher" : r.status === "negativ" ? "mehr ging eher mit schlechterer Effizienz einher"
        : r.instabil ? `kein klarer Zusammenhang – ${inDieser === "negativ" || inDieser === "positiv" ? "in dieser Einteilung klar, aber " : ""}er hängt davon ab, wo die Blöcke beginnen` : "kein klarer Zusammenhang"}${zahlen}.`;
    }
    return { v: V82.VERSIONS.verteilung, n: H.paare.length, bloecke: H.B, paare: H.paare, zusammenhang: H.Z, text: H.Z.map((z) => z.text), einteilungen: E };
  };
  /** Blockbilanz der letzten n Blöcke (Standard 6) mit einem Satz je Block. → { v, bloecke: [{…, bilanz, satz}] } */
  V82.bloecke = function (D, opt, ctx0) {
    opt = Object.assign({ heute: null, n: 6, anker: null }, opt || {});
    const zonen = opt.zonen !== undefined ? opt.zonen : D && D.zonen;
    const ende = opt.heute || letzterTag(D); if (!ende) return null;
    const ctx = ctx0 || kontext(D, zonen, ende);
    const B = bloeckeRoh(ende, opt.n + 1, opt.anker).map((b) => blockWerte(D, b, zonen, ctx));
    // Grenzen für «anders als der Block davor» (eigene Festlegung): Ruhepuls 1,5 bpm, HRV 5 %, Effizienz 2 %, Fitness 3
    const out = [];
    for (let i = 1; i < B.length; i++) {
      const b = B[i], a = B[i - 1], s = [], bil = {};
      const dCtl = isNum(b.ctl.start) && isNum(b.ctl.ende) ? b.ctl.ende - b.ctl.start : null;
      bil.fitness = dCtl == null ? null : dCtl >= 3 ? "steigt" : dCtl <= -3 ? "sinkt" : "hält";
      const dR = isNum(a.rhr) && isNum(b.rhr) ? b.rhr - a.rhr : null, dH = isNum(a.hrv) && isNum(b.hrv) ? 100 * (b.hrv / a.hrv - 1) : null;
      bil.erholung = dR == null && dH == null ? null : (isNum(dR) && dR >= 1.5) || (isNum(dH) && dH <= -5) ? "schlechter" : (isNum(dR) && dR <= -1.5) || (isNum(dH) && dH >= 5) ? "besser" : "stabil";
      const ef = (x, y) => (isNum(x) && isNum(y) ? 100 * (y / x - 1) : null), eR = ef(a.effRad, b.effRad), eL = ef(a.effLauf, b.effLauf);
      const ew = (e) => (e == null ? null : e >= 2 ? "besser" : e <= -2 ? "schlechter" : "gleich");
      bil.rad = ew(eR); bil.lauf = ew(eL);
      if (bil.fitness) s.push(`Fitness ${bil.fitness} (${vz(dCtl, 0)})`);
      if (bil.erholung) s.push(`Erholung ${bil.erholung}${isNum(dR) ? ` (Ruhepuls ${vz(dR, 1)} bpm${isNum(dH) ? `, HRV ${vz(dH, 0)} %` : ""})` : isNum(dH) ? ` (HRV ${vz(dH, 0)} %)` : ""}`);
      if (bil.rad) s.push(`Rad-Effizienz ${bil.rad} (${vz(eR, 0)} %)`);
      if (bil.lauf) s.push(`Lauf-Effizienz ${bil.lauf} (${vz(eL, 0)} %)`);
      out.push(Object.assign({}, b, { delta: { ctl: r1(dCtl), rhr: r1(dR), hrv: r1(dH), effRad: r1(eR), effLauf: r1(eL) }, bilanz: bil,
        satz: s.length ? s.join(" · ") + "." : "Noch zu wenig Daten für eine Bilanz." }));
    }
    return { v: V82.VERSIONS.bloecke, bloecke: out };
  };
  /** Alles zusammen (für die Seite und die Prüfung): eine gemeinsame Vorbereitung. */
  V82.alles = function (D, opt) {
    opt = opt || {};
    const zonen = opt.zonen !== undefined ? opt.zonen : D && D.zonen, ende = opt.heute || letzterTag(D);
    if (!ende) return null;
    const ctx = kontext(D, zonen, ende);
    return { erholung: V82.erholung(D, opt), vertraeglich: V82.vertraeglich(D, opt), verteilung: V82.verteilung(D, opt, ctx), bloecke: V82.bloecke(D, opt, ctx) };
  };
  return V82;
});
