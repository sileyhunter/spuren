/* Ironman Notebook – V5.3-Ergänzungen: Jahresziele, Serie, Trainingstagebuch, Bestleistungen, Leistungsfähigkeiten,
 * Zonen Monat gegen Vormonat, Protein/Kohlenhydrate pro kg, Schwimm-Technikübungen (eigene Zeichnungen),
 * Wetter-Text einer Aktivität zum Kopieren (z. B. für die Strava-Beschreibung). Nur Anzeige aus vorhandenen Daten. */
(function () {
  "use strict";
  const V = (window.V53 = window.V53 || {});
  const $ = (id) => document.getElementById(id);
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const DAY = 864e5;
  const store = {
    get(k, d) { try { const v = localStorage.getItem((window.SPUREN_DEMO ? "demo." : "") + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem((window.SPUREN_DEMO ? "demo." : "") + k, JSON.stringify(v)); } catch (e) { /* */ } },
  };
  const mmss = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`; };

  /* ---------------- Fortschritt ---------------- */
  V.training = function (C) {
    if (!$("v53-goals")) return;
    goals(C); streak(C); diary(C); bests(C); radar(C); zonesMonth(C);
  };
  function actsOf(C, sport) { return C.D.activities.filter((a) => !sport || a.sport === sport); }
  function goals(C) {
    const box = $("v53-goals"), sel = $("v53-goal-sport");
    if (!sel.dataset.init) {
      sel.dataset.init = 1;
      sel.innerHTML = `<option value="">Alle Sportarten</option>` + ["rad", "lauf", "schwimm", "wandern", "ski"].filter((k) => C.SPORTS[k]).map((k) => `<option value="${k}">${C.SPORTS[k].label}</option>`).join("");
      sel.addEventListener("change", () => goals(C));
    }
    const sp = sel.value, year = String(C.today.getFullYear());
    const sum = (list) => ({ km: list.reduce((s, a) => s + (a.km || 0), 0), h: list.reduce((s, a) => s + (a.mv || a.dur || 0), 0) / 3600, hm: list.reduce((s, a) => s + (a.hm || 0), 0) });
    const ytd = sum(actsOf(C, sp).filter((a) => a.date.startsWith(year)));
    const last = sum(actsOf(C, sp).filter((a) => a.date.startsWith(String(+year - 1))));
    const nice = (v, step) => Math.max(step, Math.ceil(v / step) * step);
    const all = store.get("sf.ziele", {}), mine = all[sp || "alle"] || {};
    const tgt = { km: mine.km || nice(last.km || 1000, 500), h: mine.h || nice(last.h || 100, 25), hm: mine.hm || nice(last.hm || 10000, 5000) };
    const doy = (C.today - new Date(C.today.getFullYear(), 0, 1)) / DAY + 1, frac = doy / (new Date(+year, 11, 31) - new Date(+year, 0, 1) + DAY) * DAY;
    const ring = (k, label, unit, col, dec) => {
      const v = ytd[k], t = tgt[k], soll = t * frac, diff = v - soll;
      return `<div class="v53-ring">${C.ringSVG(v / t, col, C.fmt(v, dec), unit, label)}<b>${label}</b><small>${C.fmt(v, dec)} von ${C.fmt(t)} ${unit}</small>
        <small class="${diff >= 0 ? "good-t" : "warn-t"}">${diff >= 0 ? "+" : "−"}${C.fmt(Math.abs(diff), dec)} ${unit} gegenüber Soll bis heute</small></div>`;
    };
    box.innerHTML = `<div class="v53-rings">${ring("km", "Distanz", "km", C.css("--accent"), 0)}${ring("h", "Zeit", "h", C.SPORTS.rad.color, 0)}${ring("hm", "Höhenmeter", "m", C.css("--accent-2"), 0)}</div>
      <form class="v53-gform" id="v53-gform"><label>Ziel km<input name="km" inputmode="numeric" value="${tgt.km}"></label><label>Ziel h<input name="h" inputmode="numeric" value="${tgt.h}"></label><label>Ziel Hm<input name="hm" inputmode="numeric" value="${tgt.hm}"></label></form>
      <p class="hint">Bewegungszeit; Ziele nur auf diesem Gerät gespeichert. Ohne eigenes Ziel: Vorjahr ${year - 1} aufgerundet (${C.fmt(last.km)} km, ${C.fmt(last.h)} h, ${C.fmt(last.hm)} m).</p>`;
    $("v53-gform").onchange = (e) => {
      const f = e.currentTarget, a = store.get("sf.ziele", {});
      a[sp || "alle"] = { km: +f.km.value || undefined, h: +f.h.value || undefined, hm: +f.hm.value || undefined };
      store.set("sf.ziele", a); goals(C);
    };
  }
  const weekKey = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x.toISOString().slice(0, 10); };
  function streak(C) {
    const weeks = new Set(C.D.activities.map((a) => weekKey(C.pd(a.date))));
    let cur = new Date(C.today), n = 0;
    if (!weeks.has(weekKey(cur))) cur = new Date(cur.getTime() - 7 * DAY);       // laufende Woche noch ohne Training: zählt nicht gegen die Serie
    while (weeks.has(weekKey(cur))) { n++; cur = new Date(cur.getTime() - 7 * DAY); }
    const sorted = [...weeks].sort();
    let best = 0, run = 0, prev = null;
    for (const w of sorted) { run = prev && (new Date(w) - new Date(prev)) / DAY <= 7.5 ? run + 1 : 1; best = Math.max(best, run); prev = w; }
    $("v53-streak").innerHTML = `<div class="v53-big"><b>${n}</b><span>Wochen in Folge mit Training</span></div><div class="v53-big muted"><b>${best}</b><span>längste Serie</span></div>`;
  }
  function diary(C) {
    const box = $("v53-diary"); const wk0 = new Date(weekKey(C.today));
    const byDay = new Map();
    for (const a of C.D.activities) { const k = a.date; const o = byDay.get(k) || { s: 0, sp: {} }; o.s += a.mv || a.dur || 0; o.sp[a.sport] = (o.sp[a.sport] || 0) + (a.mv || a.dur || 0); byDay.set(k, o); }
    const rows = [];
    for (let w = 0; w < 8; w++) {
      const start = new Date(wk0.getTime() - w * 7 * DAY); let tot = 0; const cells = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start.getTime() + d * DAY), k = C.iso(day), o = byDay.get(k);
        if (day > C.today) { cells.push(`<i class="fut"></i>`); continue; }
        if (!o) { cells.push(`<i title="${C.dateCH(k)}: frei"></i>`); continue; }
        tot += o.s;
        const sp = Object.entries(o.sp).sort((a, b) => b[1] - a[1])[0][0], r = Math.min(18, 5 + Math.sqrt(o.s / 60) * 1.6);
        cells.push(`<i class="on" style="--r:${r.toFixed(1)}px;--c:${(C.SPORTS[sp] || C.SPORTS.andere).color}" title="${C.dateCH(k)}: ${C.hmm(o.s)} h"></i>`);
      }
      rows.push(`<div class="v53-wk"><span>${start.getDate()}.${start.getMonth() + 1}.</span>${cells.join("")}<b>${C.hmm(tot)}</b></div>`);
    }
    box.innerHTML = `<div class="v53-wk head"><span></span>${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((x) => `<em>${x}</em>`).join("")}<b>h</b></div>${rows.join("")}<p class="hint">Kreisgrösse = Bewegungszeit des Tages, Farbe = Sportart mit der meisten Zeit.</p>`;
  }
  const PDC = [["5", "5 s"], ["15", "15 s"], ["30", "30 s"], ["60", "1 min"], ["300", "5 min"], ["600", "10 min"], ["1200", "20 min"], ["3600", "60 min"]];
  function pdcBest(C, from) {
    const out = {};
    for (const a of C.D.activities) {
      if (!a.pdc || (from && C.pd(a.date) < from)) continue;
      for (const [k] of PDC) { const v = a.pdc[k]; if (isNum(v) && (!out[k] || v > out[k].w)) out[k] = { w: v, date: a.date, name: a.name, indoor: !!a.indoor }; }
    }
    return out;
  }
  function bests(C) {
    const B = C.D.bestleistungen, all = pdcBest(C), w8 = pdcBest(C, new Date(C.today.getTime() - 56 * DAY));
    const run = B && B.lauf && B.lauf.length ? `<table class="t"><tr><th>Laufen</th><th>Bestzeit</th><th>Datum</th><th>letzte 12 Monate</th></tr>${B.lauf.map((r) => {
      const y = (B.lauf_12m || []).find((x) => x.dist === r.dist);
      return `<tr><td>${C.esc(r.label)}</td><td><b>${mmss(r.s)}</b></td><td>${C.dateCH(r.date)}</td><td>${y ? mmss(y.s) : "–"}</td></tr>`;
    }).join("")}</table><p class="hint">${C.esc(B.quelle)}, Stand ${C.dateCH(B.erstellt)}. GPS-Sprünge ausgeschlossen.</p>` : `<p class="hint">Noch keine Lauf-Bestleistungen berechnet (tools/bestleistungen.py beim Monatsexport).</p>`;
    const bike = Object.keys(all).length ? `<table class="t"><tr><th>Rad</th><th>Bestwert</th><th>Datum</th><th>letzte 8 Wochen</th></tr>${PDC.filter(([k]) => all[k]).map(([k, lab]) => `<tr><td>${lab}</td><td><b>${all[k].w} W</b></td><td>${C.dateCH(all[k].date)}${all[k].indoor ? " (Rolle)" : ""}</td><td>${w8[k] ? w8[k].w + " W" : "–"}</td></tr>`).join("")}</table>` : "";
    $("v53-bests").innerHTML = run + bike;
  }
  function radar(C) {
    const all = pdcBest(C), w8 = pdcBest(C, new Date(C.today.getTime() - 56 * DAY));
    const keys = PDC.filter(([k]) => all[k]);
    if (!keys.length) { $("v53-radar-note").textContent = "Keine Leistungsdaten."; return; }
    C.chart("c-v53-radar", { type: "radar", data: { labels: keys.map(([, l]) => l), datasets: [
      { label: "Bestwert (alle Zeiten) = 100 %", data: keys.map(() => 100), borderColor: C.css("--muted"), backgroundColor: C.css("--muted") + "22", pointRadius: 2 },
      { label: "Letzte 8 Wochen", data: keys.map(([k]) => (w8[k] ? +(w8[k].w / all[k].w * 100).toFixed(1) : 0)), borderColor: C.css("--accent-2"), backgroundColor: C.css("--accent-2") + "33", pointRadius: 3 }] },
      options: { scales: { r: { min: 0, max: 110, ticks: { stepSize: 25, callback: (v) => v + " %" } } }, plugins: { legend: { position: "bottom" },
        tooltip: { callbacks: { label: (c) => { const k = keys[c.dataIndex][0]; const src = c.datasetIndex ? w8[k] : all[k]; return src ? `${c.dataset.label}: ${src.w} W (${C.dateCH(src.date)})` : "–"; } } } } } });
    $("v53-radar-note").textContent = "Beste Leistung je Dauer aus den einzelnen Fahrten (inkl. Rolle). Ohne FTP – nur gemessene Watt.";
  }
  function zonesMonth(C) {
    const t = C.today.getTime(), win = (a, b) => C.D.activities.filter((x) => x.zones && C.pd(x.date).getTime() > t - a * DAY && C.pd(x.date).getTime() <= t - b * DAY);
    const share = (list) => { const z = [0, 0, 0, 0, 0]; for (const a of list) a.zones.forEach((v, i) => (z[i] += v || 0)); const s = z.reduce((x, y) => x + y, 0); return { z, s, p: z.map((v) => (s ? v / s * 100 : 0)) }; };
    const now = share(win(28, 0)), prev = share(win(56, 28));
    if (!now.s) { $("v53-zones").innerHTML = `<p class="hint">Keine Pulszonen in den letzten 4 Wochen.</p>`; return; }
    const top = now.p.indexOf(Math.max(...now.p));
    $("v53-zones").innerHTML = `<p class="v53-lead"><b>${C.fmt(now.p[top])} %</b> der Zeit in Zone ${top + 1} (letzte 4 Wochen, ${C.hmm(now.s)} h)${prev.s ? `, ${now.p[top] - prev.p[top] >= 0 ? "+" : "−"}${C.fmt(Math.abs(now.p[top] - prev.p[top]))} Prozentpunkte gegenüber den 4 Wochen davor` : ""}.</p>
      <div class="v53-zbars">${now.p.map((p, i) => `<div><span>Z${i + 1}</span><span class="trk"><i style="width:${p.toFixed(1)}%;background:var(--z${i + 1})"></i>${prev.s ? `<em style="left:${prev.p[i].toFixed(1)}%" title="4 Wochen davor: ${C.fmt(prev.p[i])} %"></em>` : ""}</span><b>${C.fmt(p)} %</b><small>${prev.s ? (p - prev.p[i] >= 0 ? "+" : "−") + C.fmt(Math.abs(p - prev.p[i])) : ""}</small></div>`).join("")}</div>
      <p class="hint">Garmin-Pulszonen je Aktivität (Zeit), alle Sportarten. Strich = Anteil in den 4 Wochen davor.</p>`;
  }

  /* ---------------- Körper: Protein und Kohlenhydrate pro kg ---------------- */
  V.koerper = function (C) {
    if (!$("c-v53-pk")) return;
    const days = C.D.days.filter((d) => d.protein != null && C.pd(d.date) > new Date(C.today.getTime() - 42 * DAY));
    const ws = C.weights();
    const kgAt = (iso) => { let k = null; for (const w of ws) if (w.date <= iso) k = w.kg; return k || (ws[0] && ws[0].kg) || null; };
    const hours = new Map(); for (const a of C.D.activities) hours.set(a.date, (hours.get(a.date) || 0) + (a.mv || a.dur || 0) / 3600);
    if (!days.length) { $("v53-pk-note").textContent = "Keine Tage mit Ernährungsprotokoll in den letzten 6 Wochen."; return; }
    const band = (h) => (h >= 4 ? [8, 12] : h >= 1 ? [6, 10] : h > 0 ? [5, 7] : [3, 5]);   // g KH/kg je Trainingsumfang (IOC/ACSM)
    C.chart("c-v53-pk", { type: "bar", data: { labels: days.map((d) => C.dLabel(d.date)), datasets: [
      { label: "Kohlenhydrate g/kg", data: days.map((d) => (kgAt(d.date) ? +(d.carbs / kgAt(d.date)).toFixed(1) : null)), backgroundColor: days.map((d) => { const v = d.carbs / (kgAt(d.date) || 75), b = band(hours.get(d.date) || 0); return v < b[0] ? C.css("--warn") : v > b[1] ? C.css("--info") : C.css("--good"); }), borderRadius: 3 },
      { type: "line", label: "KH-Richtwert unten (je Trainingsumfang)", data: days.map((d) => band(hours.get(d.date) || 0)[0]), borderColor: C.css("--muted"), borderDash: [4, 4], pointRadius: 0, stepped: "middle" },
      { label: "Protein g/kg", data: days.map((d) => (kgAt(d.date) ? +(d.protein / kgAt(d.date)).toFixed(2) : null)), backgroundColor: C.css("--accent"), borderRadius: 3, yAxisID: "y2" }] },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { title: { display: true, text: "KH g/kg" } },
        y2: { position: "right", grid: { display: false }, min: 0, max: 3, title: { display: true, text: "Protein g/kg" } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { afterBody: (it) => { const d = days[it[0].dataIndex], h = hours.get(d.date) || 0, b = band(h); return `Training ${C.fmt(h, 1)} h → KH-Richtwert ${b[0]}–${b[1]} g/kg; Protein-Richtwert 1,4–2,0 g/kg`; } } } } } });
    const p = days.map((d) => d.protein / (kgAt(d.date) || 75)), inP = p.filter((v) => v >= 1.4 && v <= 2.0).length;
    $("v53-pk-note").innerHTML = `${days.length} Tage mit Protokoll (Garmin, nur vollständige Tage). Protein im Richtbereich 1,4–2,0 g/kg an ${inP} von ${days.length} Tagen. Farbe der KH-Balken: grün im Richtbereich für den Trainingsumfang des Tages, orange darunter, blau darüber. Richtwerte: Thomas et al. 2016 (IOC/ACSM-Position) für Kohlenhydrate, Jäger et al. 2017 (ISSN) für Protein – Orientierung, keine Diätvorgabe.`;
  };

  /* ---------------- Schwimmen: Technikübungen (eigene Zeichnungen) ---------------- */
  const swimmer = (o) => `<svg viewBox="0 0 320 120" role="img" aria-label="${o.alt}"><rect width="320" height="120" rx="10" fill="#eaf4f8"/>
    <path d="M0 52 Q20 46 40 52 T80 52 T120 52 T160 52 T200 52 T240 52 T280 52 T320 52" fill="none" stroke="#7fb2d6" stroke-width="2"/>
    <g transform="translate(${o.x || 70},56) rotate(${o.roll || 0})">
      <ellipse cx="85" cy="0" rx="78" ry="12" fill="#2f5d7c"/>
      <circle cx="172" cy="-2" r="13" fill="#f0c9a8"/><path d="M160 -10 Q172 -22 184 -8" fill="#d9694a"/>
      ${o.arms}
      <path d="M8 -4 L-26 ${o.kick || -10} M8 4 L-26 ${-(o.kick || -10)}" stroke="#2f5d7c" stroke-width="9" stroke-linecap="round"/>
    </g>${o.extra || ""}</svg>`;
  const ARROW = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#d9694a" stroke-width="3" marker-end="url(#ah)"/>`;
  const DEFS = `<svg width="0" height="0" style="position:absolute"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#d9694a"/></marker></defs></svg>`;
  const DRILLS = [
    { id: "abschlag", t: "Abschlagschwimmen (Catch-up)", ziel: "Gleiten, langer Zug, ruhiger Rhythmus",
      svg: swimmer({ alt: "Schwimmer in Seitenansicht, beide Arme vorne, ein Arm wartet, bis der andere anschlägt", arms: `<path d="M160 -6 L250 -10" stroke="#2f5d7c" stroke-width="8" stroke-linecap="round"/><path d="M150 2 Q120 30 60 14" stroke="#2f5d7c" stroke-width="8" fill="none" stroke-linecap="round"/>`,
        extra: ARROW(150, 96, 235, 96) + `<text x="150" y="112" font-size="11" fill="#1f3347">Hand wartet vorne, bis die andere ankommt</text>` }),
      schritte: ["Ein Arm bleibt gestreckt vorne.", "Der andere zieht durch und kommt über Wasser nach vorne.", "Erst wenn die Hände sich «abklatschen», startet der nächste Zug."],
      fehler: ["Vorderer Arm sinkt ab oder kreuzt die Mittellinie", "Kopf hoch: Beine sinken"] },
    { id: "seitlage", t: "Seitlage 6-1-6", ziel: "Wasserlage und Rotation über die Längsachse",
      svg: swimmer({ alt: "Schwimmer in Seitenlage, unterer Arm vorne gestreckt, oberer Arm am Körper", roll: 0, arms: `<path d="M160 4 L252 6" stroke="#2f5d7c" stroke-width="8" stroke-linecap="round"/><path d="M150 -8 L70 -10" stroke="#3d7fb3" stroke-width="8" stroke-linecap="round"/>`,
        extra: `<path d="M110 20 a14 14 0 1 0 28 0" fill="none" stroke="#d9694a" stroke-width="3" marker-end="url(#ah)"/><text x="150" y="112" font-size="11" fill="#1f3347">6 Beinschläge auf der Seite, 1 Zug, Seite wechseln</text>` }),
      schritte: ["Auf der Seite liegen, unterer Arm vorne, Gesicht nach unten.", "6 ruhige Beinschläge, Schulter zeigt zur Decke.", "Ein Zug, über die Hüfte auf die andere Seite rollen."],
      fehler: ["Nur der Kopf dreht, die Hüfte nicht", "Unterer Arm drückt nach unten statt zu gleiten"] },
    { id: "finger", t: "Fingerspitzen ziehen", ziel: "Hoher Ellbogen in der Überwasserphase",
      svg: swimmer({ alt: "Schwimmer, Ellbogen hoch, Fingerspitzen streifen die Wasseroberfläche nach vorne", arms: `<path d="M150 -4 L120 -36 L180 -24" stroke="#2f5d7c" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M160 4 L245 8" stroke="#2f5d7c" stroke-width="8" stroke-linecap="round"/>`,
        extra: ARROW(195, 30, 240, 30) + `<text x="120" y="112" font-size="11" fill="#1f3347">Ellbogen führt, Finger streifen das Wasser</text>` }),
      schritte: ["Nach dem Zug den Ellbogen zuerst anheben.", "Fingerspitzen locker über die Oberfläche nach vorne ziehen.", "Hand vor der Schulter eintauchen, nicht über den Kopf greifen."],
      fehler: ["Gestreckter Arm schwingt seitlich", "Hand taucht zu nah am Kopf ein"] },
    { id: "faust", t: "Faustschwimmen", ziel: "Unterarm als Paddel spüren (frühe Wasserfassung)",
      svg: swimmer({ alt: "Schwimmer mit geschlossener Faust, Unterarm senkrecht unter Wasser", arms: `<path d="M150 4 L170 40 L200 44" stroke="#2f5d7c" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="203" cy="44" r="7" fill="#f0c9a8"/><path d="M160 -6 L245 -10" stroke="#2f5d7c" stroke-width="8" stroke-linecap="round"/>`,
        extra: ARROW(215, 70, 175, 70) + `<text x="110" y="112" font-size="11" fill="#1f3347">Unterarm früh senkrecht, mit dem ganzen Arm ziehen</text>` }),
      schritte: ["Hände zur Faust schliessen, normal kraulen.", "Ellbogen bleibt hoch, Unterarm zeigt früh zum Beckenboden.", "Nach 25 m mit offener Hand: Unterschied spüren."],
      fehler: ["Ellbogen fällt zuerst (Ziehen mit gestrecktem Arm)", "Tempo erzwingen statt Wasser zu fassen"] },
    { id: "atmung", t: "Atmung 3er-Zug", ziel: "Beidseitig atmen, gerade Lage",
      svg: swimmer({ alt: "Schwimmer dreht den Kopf zur Seite, ein Auge bleibt im Wasser", arms: `<path d="M160 4 L248 6" stroke="#2f5d7c" stroke-width="8" stroke-linecap="round"/><path d="M150 -6 Q110 -40 70 -10" stroke="#2f5d7c" stroke-width="8" fill="none" stroke-linecap="round"/>`,
        extra: `<circle cx="242" cy="44" r="18" fill="none" stroke="#d9694a" stroke-width="2" stroke-dasharray="4 3"/><text x="120" y="112" font-size="11" fill="#1f3347">Ein Auge bleibt im Wasser, unter Wasser ausatmen</text>` }),
      schritte: ["Unter Wasser durch Mund und Nase gleichmässig ausatmen.", "Mit der Rotation den Kopf drehen, ein Auge bleibt im Wasser.", "Alle drei Züge abwechselnd links und rechts einatmen."],
      fehler: ["Kopf heben statt drehen", "Luft anhalten, dann hektisch atmen"] },
  ];
  V.schwimmen = function () {
    const box = $("v53-drills"); if (!box || box.dataset.init) return;
    box.dataset.init = 1;
    box.innerHTML = DEFS + `<div class="v53-drills">${DRILLS.map((d) => `<article class="v53-drill"><h3>${d.t}</h3><p class="hint">Ziel: ${d.ziel}</p>${d.svg}
      <ol>${d.schritte.map((s) => `<li>${s}</li>`).join("")}</ol><p class="v53-err"><b>Typische Fehler:</b> ${d.fehler.join(" · ")}</p></article>`).join("")}</div>
      <p class="hint">Eigene, vereinfachte Zeichnungen (Seitenansicht). Eigene Videos: im Schwimmtechnik-Coach oben öffnen – sie bleiben auf dem Gerät.</p>`;
  };

  /* ---------------- Wetter-Text einer Aktivität (zum Kopieren) ---------------- */
  const DIR = { n: "N", nne: "NNO", ne: "NO", ene: "ONO", e: "O", ese: "OSO", se: "SO", sse: "SSO", s: "S", ssw: "SSW", sw: "SW", wsw: "WSW", w: "W", wnw: "WNW", nw: "NW", nnw: "NNW" };
  const DESC = { "Partly Cloudy": "teilweise bewölkt", "Cloudy": "bewölkt", "Mostly Cloudy": "meist bewölkt", "Clear": "klar", "Sunny": "sonnig", "Mostly Sunny": "meist sonnig", "Rain": "Regen", "Light Rain": "leichter Regen", "Snow": "Schnee", "Fog": "Nebel", "Mostly Clear": "meist klar", "Overcast": "bedeckt", "Drizzle": "Niesel" };
  V.wxText = function (a, quality) {
    const w = a.wx; if (!w) return "";
    const dir = DIR[String(w.wind_direction_compass || "").toLowerCase()] || "";
    const parts = [`${Math.round(w.temperature)} °C${isNum(w.apparent_temperature) && Math.abs(w.apparent_temperature - w.temperature) >= 2 ? ` (gefühlt ${Math.round(w.apparent_temperature)} °C)` : ""}`,
      `Wind ${dir ? "aus " + dir + " " : ""}${Math.round(w.wind_speed)} km/h`];
    if (isNum(w.humidity_percent)) parts.push(`${Math.round(w.humidity_percent)} % Luftfeuchte`);
    if (w.weather_description) parts.push(DESC[w.weather_description] || w.weather_description);
    return `Wetter: ${parts.join(", ")}. Quelle: Garmin, Station ${w.station_name || w.station_id || "?"}${quality && quality.km ? ` (${Math.round(quality.km)} km entfernt, Qualität ${quality.stufe})` : ""}.`;
  };
  V.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (x) { ok = false; } ta.remove(); return ok;
    }
  };
})();
