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
    goals(C); streak(C); diary(C); bests(C); zonesMonth(C);
  };
  function actsOf(C, sport) { return C.D.activities.filter((a) => !sport || a.sport === sport); }
  /* Jahresziele kompakt + kumulierter Jahresvergleich im gleichen Kalenderzeitraum. Ein Zeitbegriff für alles: C.hrsOf
     (Bewegungszeit seit 3.11.2026, sonst Timer); Einheiten ohne Bewegungszeit zählen mit Timer-Zeit und werden genannt. */
  function goals(C) {
    const box = $("v53-goals"), sel = $("v53-goal-sport"), msel = $("v53-cum-metric");
    if (!sel.dataset.init) {
      sel.dataset.init = 1;
      sel.innerHTML = `<option value="">Alle Sportarten</option>` + ["rad", "lauf", "schwimm", "wandern", "ski"].filter((k) => C.SPORTS[k]).map((k) => `<option value="${k}">${C.SPORTS[k].label}</option>`).join("");
      sel.addEventListener("change", () => goals(C));
      if (msel) msel.addEventListener("change", () => goals(C));
    }
    const sp = sel.value, Y = C.today.getFullYear(), year = String(Y);
    if ($("v53-year-y")) $("v53-year-y").textContent = Y;
    const bew = ((C.D.config || {}).zeitbasis || "timer") === "bewegung", zeitName = bew ? "Bewegungszeit" : "Timer-Zeit";
    const sum = (list) => ({ km: list.reduce((s, a) => s + (a.km || 0), 0), h: list.reduce((s, a) => s + C.hrsOf(a), 0), hm: list.reduce((s, a) => s + (a.hm || 0), 0),
      ohneMv: bew ? list.filter((a) => a.mv == null).length : 0 });
    const L = actsOf(C, sp).filter((a) => a.date.startsWith(year)), Lp = actsOf(C, sp).filter((a) => a.date.startsWith(String(Y - 1)));
    const ytd = sum(L), last = sum(Lp);
    const nice = (v, step) => Math.max(step, Math.ceil(v / step) * step);
    const all = store.get("sf.ziele", {}), mine = all[sp || "alle"] || {};
    const tgt = { km: mine.km || nice(last.km || 1000, 500), h: mine.h || nice(last.h || 100, 25), hm: mine.hm || nice(last.hm || 10000, 5000) };
    const own = { km: !!mine.km, h: !!mine.h, hm: !!mine.hm };
    const doy = Math.round((C.today - new Date(Y, 0, 1)) / DAY) + 1, ndays = Math.round((new Date(Y + 1, 0, 1) - new Date(Y, 0, 1)) / DAY), frac = doy / ndays;
    const row = (k, label, unit, dec) => {
      const v = ytd[k], t = tgt[k], soll = t * frac, diff = v - soll, pct = Math.round((100 * v) / t);
      return `<div class="goal"><span class="gl">${label}</span><span class="gbar" role="img" aria-label="${label}: ${C.fmt(v, dec)} von ${C.fmt(t)} ${unit}, Soll bis heute ${C.fmt(soll, dec)}"><i style="width:${Math.min(100, (100 * v) / t).toFixed(1)}%"></i><em style="left:${(100 * frac).toFixed(1)}%"></em></span>
        <b>${C.fmt(v, dec)} ${unit}</b><small>${pct} % von ${C.fmt(t)} ${unit}${own[k] ? "" : " (Vorjahr aufgerundet)"}</small><small class="${diff >= 0 ? "good-t" : "warn-t"}">Soll heute ${C.fmt(soll, dec)} ${unit}: ${diff >= 0 ? "+" : "−"}${C.fmt(Math.abs(diff), dec)} ${unit}</small></div>`;
    };
    const ohne = ytd.ohneMv + last.ohneMv;
    box.innerHTML = `<div class="goal-rows">${row("h", "Zeit", "h", 0)}${row("km", "Distanz", "km", 0)}${row("hm", "Höhenmeter", "m", 0)}</div>
      <details class="more"><summary>Ziele bearbeiten</summary><form class="v53-gform" id="v53-gform"><label>Ziel h<input name="h" inputmode="numeric" value="${own.h ? tgt.h : ""}" placeholder="${tgt.h}"></label><label>Ziel km<input name="km" inputmode="numeric" value="${own.km ? tgt.km : ""}" placeholder="${tgt.km}"></label><label>Ziel Hm<input name="hm" inputmode="numeric" value="${own.hm ? tgt.hm : ""}" placeholder="${tgt.hm}"></label></form>
        <p class="hint">Nur auf diesem Gerät gespeichert. Leer lassen = Vorjahr ${Y - 1} aufgerundet (${C.fmt(last.h)} h, ${C.fmt(last.km)} km, ${C.fmt(last.hm)} m).</p></details>
      <p class="hint">Zeit = ${zeitName} (Regel zeit-1.0) für ${Y} und für das Vorjahresziel ${Y - 1}, also derselbe Zeitbegriff.${ohne ? ` ${ohne} ${ohne === 1 ? "Einheit" : "Einheiten"} ohne Sekundenwerte zählen mit der Timer-Zeit.` : ` Alle Einheiten beider Jahre haben eine ${zeitName}.`} Strich = Soll bis heute (${Math.round(frac * 100)} % des Jahres).</p>`;
    $("v53-gform").onchange = (e) => {
      const f = e.currentTarget, a = store.get("sf.ziele", {});
      a[sp || "alle"] = { km: +f.km.value || undefined, h: +f.h.value || undefined, hm: +f.hm.value || undefined };
      store.set("sf.ziele", a); goals(C);
    };
    cumulative(C, sp, msel ? msel.value : "h", bew);
  }
  function cumulative(C, sp, metric, bew) {
    if (!$("c-v53-cum")) return;
    const Y = C.today.getFullYear(), years = [Y - 2, Y - 1, Y], val = (a) => (metric === "h" ? C.hrsOf(a) : metric === "km" ? a.km || 0 : a.hm || 0);
    // Tag im Jahr nach Kalenderdatum eines Schaltjahrs: 1. März ist in jedem Jahr derselbe Index (gleiches Datum = gleiche Stelle)
    const unit = { h: "h", km: "km", hm: "m" }[metric], doyOf = (iso) => { const [, m, d] = iso.split("-").map(Number); return Math.round((Date.UTC(2024, m - 1, d) - Date.UTC(2024, 0, 1)) / DAY); };
    const todayDoy = doyOf(C.iso(C.today));
    const series = years.map((y) => {
      const arr = new Array(366).fill(0);
      for (const a of actsOf(C, sp)) if (a.date.startsWith(String(y))) arr[Math.min(365, doyOf(a.date))] += val(a);
      let c = 0; const out = arr.map((v) => (c += v));
      return y === Y ? out.slice(0, todayDoy + 1) : out;
    });
    const lab = Array.from({ length: 366 }, (_, i) => { const d = new Date(2024, 0, 1 + i); return `${d.getDate()}.${d.getMonth() + 1}.`; });
    const cols = [C.css("--line-2") || "#b8c4cc", C.css("--muted"), C.css("--accent")];
    C.chart("c-v53-cum", { type: "line", data: { labels: lab, datasets: years.map((y, i) => ({ label: String(y), data: series[i].map((v) => +v.toFixed(1)), borderColor: cols[i], backgroundColor: cols[i],
      borderWidth: y === Y ? 2 : 1.25, pointRadius: 0, tension: 0 })) },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: { ticks: { maxTicksLimit: innerWidth < 560 ? 5 : 12, maxRotation: 0, callback: function (v, i) { const d = new Date(2024, 0, 1 + i); return d.getDate() === 1 ? ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][d.getMonth()] : ""; }, autoSkip: false }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { maxTicksLimit: 5 }, title: { display: true, text: { h: bew ? "Stunden (Bewegung)" : "Stunden (Timer)", km: "Kilometer", hm: "Höhenmeter" }[metric] } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: (it) => it[0].label, label: (c) => `${c.dataset.label}: ${C.fmt(c.raw)} ${unit}` } } } } });
    const now = series[2][todayDoy] || 0, prev = series[1][todayDoy] || 0, d = now - prev;
    $("v53-cum-note").textContent = `Bis ${C.today.getDate()}.${C.today.getMonth() + 1}.: ${Y} ${C.fmt(now)} ${unit}, ${Y - 1} im gleichen Zeitraum ${C.fmt(prev)} ${unit} (${d >= 0 ? "+" : "−"}${C.fmt(Math.abs(d))} ${unit}). ` +
      `Gleicher Kalendertag, gleiche Zeitdefinition für alle Jahre${metric === "h" ? ` (${bew ? "Bewegungszeit" : "Timer-Zeit"})` : ""}.`;
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
  const PDC = [["5", "5 s"], ["15", "15 s"], ["30", "30 s"], ["60", "1 min"], ["300", "5 min"], ["600", "10 min"], ["1200", "20 min"], ["3600", "1 h"], ["7200", "2 h"]];
  const sysOf = (a) => (window.FK ? FK.bikeSys(a) : a.indoor ? "indoor" : "rennrad");
  const SYS = { draussen: { name: "Draussen (Leistungsmesser am Rad)", ok: (s) => s === "rennrad" || s === "mtb" }, indoor: { name: "Rolle (Zwift, Smarttrainer)", ok: (s) => s === "indoor" } };
  function pdcBest(C, from, to, sys) {
    const out = {};
    for (const a of C.D.activities) {
      if (!a.pdc || (from && a.date < from) || (to && a.date > to) || (sys && !SYS[sys].ok(sysOf(a)))) continue;
      for (const [k] of PDC) { const v = a.pdc[k]; if (isNum(v) && (!out[k] || v > out[k].w)) out[k] = { w: v, date: a.date, name: a.name, indoor: sysOf(a) === "indoor" }; }
    }
    return out;
  }
  const BS = { sys: "draussen" };
  /** Offizielle Wettkampfzeiten: getrennt von der FIT-Schätzung, auf dem Gerät verschlüsselt (Export «Eingaben»). */
  const pbList = () => (window.V5UI && V5UI.merged ? V5UI.merged("pb_offiziell", "pb") : []);
  const parseHms = (t) => { const p = String(t || "").trim().split(":").map(Number); if (!p.length || p.some((x) => !isFinite(x))) return null; return p.reduce((s, x) => s * 60 + x, 0) || null; };
  function bests(C) {
    const B = C.D.bestleistungen, Y = C.today.getFullYear();
    // Laufen: drei relevante Distanzen oben, alles andere im Drilldown
    let run = `<p class="hint">Noch keine Lauf-Bestleistungen berechnet (tools/bestleistungen.py beim Monatsexport).</p>`;
    if (B && B.lauf && B.lauf.length) {
      const off = new Map(pbList().map((e) => [e.dist, e]));
      const top = ["10 km", "Halbmarathon", "Marathon"].map((l) => B.lauf.find((r) => r.label === l)).filter(Boolean);
      const pick = top.length >= 3 ? top : B.lauf.slice(-3);
      const line = (r) => { const o = off.get(r.label);
        return `<div class="pb-row"><span class="pb-l">${C.esc(r.label)}</span><b>${mmss(r.s)}</b><span class="badge muted" title="${C.esc(B.quelle)}">aus FIT (Schätzung)</span>
          <small>${C.dateCH(r.date)}${r.name ? " · " + C.esc(r.name) : ""}</small>${o ? `<small class="pb-off">offiziell <b>${mmss(o.s)}</b>${o.anlass ? " · " + C.esc(o.anlass) : ""}${o.datum ? " · " + C.dateCH(o.datum) : ""} <span class="badge ok">Resultat</span></small>` : ""}</div>`; };
      run = `<h3 class="mini-h">Laufen</h3><div class="pb-rows">${pick.map(line).join("")}</div>
        <details class="more"><summary>Alle Distanzen und letzte 12 Monate</summary><div class="tablewrap"><table class="t"><tr><th>Distanz</th><th>FIT</th><th>Datum</th><th>12 Monate</th><th>offiziell</th></tr>${B.lauf.map((r) => {
          const y = (B.lauf_12m || []).find((x) => x.dist === r.dist), o = off.get(r.label);
          return `<tr><td>${C.esc(r.label)}</td><td><b>${mmss(r.s)}</b></td><td>${C.dateCH(r.date)}</td><td>${y ? mmss(y.s) : "–"}</td><td>${o ? mmss(o.s) : "–"}</td></tr>`; }).join("")}</table></div>
        <form class="inline" id="pb-form"><label>Distanz<select name="d">${B.lauf.map((r) => `<option>${C.esc(r.label)}</option>`).join("")}</select></label><label>Offizielle Zeit<input name="t" placeholder="1:26:54" inputmode="numeric" required></label>
          <label class="grow">Anlass<input name="a" placeholder="z. B. Halbmarathon Zürich"></label><label>Datum<input type="date" name="dt"></label><button class="btn" type="submit">Speichern</button></form>
        <p class="hint">${C.esc(B.quelle)}, Stand ${C.dateCH(B.erstellt)}. GPS-Sprünge ausgeschlossen. Die FIT-Zeit kann von der offiziellen Nettozeit um etwa eine Sekunde abweichen (Start/Ziel-Zeitpunkt, Aufzeichnung); die offizielle Zeit steht getrennt und wird nie verrechnet.</p></details>`;
    }
    // Rad: Leistungskurve je System (nie Rolle und Leistungsmesser am Rad mischen), log. Dauerachse 5 s – 2 h
    const sysSel = `<div class="seg" role="group" aria-label="System">${Object.entries(SYS).map(([k, v]) => `<button type="button" data-sys="${k}" aria-pressed="${BS.sys === k}">${k === "draussen" ? "Draussen" : "Rolle"}</button>`).join("")}</div>`;
    $("v53-bests").innerHTML = run + `<h3 class="mini-h pb-h">Rad: Leistungskurve ${sysSel}</h3><div class="chart"><canvas id="c-v53-pdc" aria-label="Leistungskurve: beste Watt je Dauer"></canvas></div><p class="hint" id="v53-pdc-note"></p>
      <h3 class="mini-h">Letzte 8 Wochen im Verhältnis zum Bestwert der letzten 12 Monate</h3><div class="v53-pct" id="v53-pct"></div>`;
    $("v53-bests").querySelectorAll("[data-sys]").forEach((b) => (b.onclick = () => { BS.sys = b.dataset.sys; bests(C); }));
    const f = $("pb-form");
    if (f) f.onsubmit = async (e) => { e.preventDefault(); const t = e.target, sec = parseHms(t.t.value);
      if (!sec) { t.t.setCustomValidity("Format h:mm:ss oder mm:ss"); t.t.reportValidity(); return; }
      await V5UI.Inbox.upsert("pb", { id: "pb-" + t.d.value, dist: t.d.value, s: sec, anlass: t.a.value.trim() || null, datum: t.dt.value || null, quelle: "von Hand (offizielles Resultat)", erfasst: new Date().toISOString() });
      bests(C); };
    const sys = BS.sys, iso = (d) => C.iso(d);
    const yA = pdcBest(C, `${Y - 1}-01-01`, `${Y - 1}-12-31`, sys), yB = pdcBest(C, `${Y}-01-01`, null, sys), w8 = pdcBest(C, iso(new Date(C.today.getTime() - 56 * DAY)), null, sys);
    const ref = pdcBest(C, iso(new Date(C.today.getTime() - 365 * DAY)), null, sys);
    const pts = (o) => PDC.filter(([k]) => o[k]).map(([k]) => ({ x: +k, y: o[k].w, d: o[k] }));
    const ds = [[String(Y - 1), yA, C.css("--muted"), 1.25, []], [String(Y), yB, C.css("--accent"), 2, []], ["letzte 8 Wochen", w8, C.css("--accent-2"), 1.5, [5, 4]]]
      .filter(([, o]) => Object.keys(o).length).map(([l, o, col, bw, dash]) => ({ label: l, data: pts(o), borderColor: col, backgroundColor: col, borderWidth: bw, borderDash: dash, pointRadius: 3, tension: 0 }));
    const tick = (v) => ({ 5: "5 s", 15: "15 s", 30: "30 s", 60: "1 min", 300: "5 min", 600: "10 min", 1200: "20 min", 3600: "1 h", 7200: "2 h" })[v] || "";
    if (!ds.length) { $("v53-pdc-note").textContent = `Keine Leistungsdaten (${SYS[sys].name}).`; }
    C.chart("c-v53-pdc", { type: "line", data: { datasets: ds }, options: { parsing: false, interaction: { mode: "nearest", intersect: false },
      scales: { x: { type: "logarithmic", min: 5, max: 7200, afterBuildTicks: (ax) => { ax.ticks = [5, 15, 60, 300, 1200, 3600, 7200].filter((v) => innerWidth >= 560 || v !== 15).map((v) => ({ value: v })); }, ticks: { callback: tick, maxRotation: 0 }, title: { display: true, text: "Dauer (logarithmisch)" } },
        y: { ticks: { maxTicksLimit: 5 }, title: { display: true, text: "beste Ø Watt" } } },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: (it) => tick(it[0].raw.x), label: (c) => `${c.dataset.label}: ${c.raw.y} W · ${C.dateCH(c.raw.d.date)} ${C.esc(c.raw.d.name || "")}` } } } } });
    if (ds.length) $("v53-pdc-note").textContent = `${SYS[sys].name}. Beste Ø Leistung je Dauer aus einzelnen Fahrten; Rolle und Leistungsmesser am Rad werden nie gemischt. Einzelbestwerte hängen davon ab, ob du die Dauer überhaupt voll gefahren bist, und sind kein Nachweis für Trainingsfortschritt.`;
    const keys = PDC.filter(([k]) => ref[k]);
    $("v53-pct").innerHTML = keys.length ? keys.map(([k, lab]) => { const p = w8[k] ? Math.round((100 * w8[k].w) / ref[k].w) : null;
      return `<div><span>${lab}</span><span class="trk"><i style="width:${p == null ? 0 : Math.min(100, p)}%"></i></span><b>${p == null ? "–" : p + " %"}</b><small>${w8[k] ? w8[k].w + " W" : "keine Fahrt"} / ${ref[k].w} W</small></div>`; }).join("") +
      `<p class="hint">Bestwert der letzten 12 Monate, gleiches System. «keine Fahrt»: in den letzten 8 Wochen keine so lange Leistungsaufzeichnung.</p>` : `<p class="hint">Keine Leistungsdaten der letzten 12 Monate (${SYS[sys].name}).</p>`;
  }
  function zonesMonth(C) {             // je Sportart (Auswahl der Zonenkarte), nie gemischt
    const sel = $("z-sport"), sp = (sel && sel.value) || "rad", name = C.SPORTS[sp] ? C.SPORTS[sp].label : sp;
    if ($("v53-zones-h")) $("v53-zones-h").textContent = `Garmin-Pulszonen ${name}, letzte 4 Wochen`;
    const t = C.today.getTime(), win = (a, b) => C.D.activities.filter((x) => x.sport === sp && x.zones && C.pd(x.date).getTime() > t - a * DAY && C.pd(x.date).getTime() <= t - b * DAY);
    const share = (list) => { const z = [0, 0, 0, 0, 0]; for (const a of list) a.zones.forEach((v, i) => (z[i] += v || 0)); const s = z.reduce((x, y) => x + y, 0); return { z, s, p: z.map((v) => (s ? v / s * 100 : 0)) }; };
    const now = share(win(28, 0)), prev = share(win(56, 28));
    if (!now.s) { $("v53-zones").innerHTML = `<p class="hint">Keine Garmin-Pulszonen (${name}) in den letzten 4 Wochen.</p>`; return; }
    const top = now.p.indexOf(Math.max(...now.p));
    $("v53-zones").innerHTML = `<p class="v53-lead"><b>${C.fmt(now.p[top])} %</b> der Zeit in Zone ${top + 1} (letzte 4 Wochen, ${C.hmm(now.s)} h)${prev.s ? `, ${now.p[top] - prev.p[top] >= 0 ? "+" : "−"}${C.fmt(Math.abs(now.p[top] - prev.p[top]))} Prozentpunkte gegenüber den 4 Wochen davor` : ""}.</p>
      <div class="v53-zbars">${now.p.map((p, i) => `<div><span>Z${i + 1}</span><span class="trk"><i style="width:${p.toFixed(1)}%;background:var(--z${i + 1})"></i>${prev.s ? `<em style="left:${prev.p[i].toFixed(1)}%" title="4 Wochen davor: ${C.fmt(prev.p[i])} %"></em>` : ""}</span><b>${C.fmt(p)} %</b><small>${prev.s ? (p - prev.p[i] >= 0 ? "+" : "−") + C.fmt(Math.abs(p - prev.p[i])) : ""}</small></div>`).join("")}</div>
      <p class="hint">Zeit je Garmin-Pulszone, wie die Zonen damals auf der Uhr eingestellt waren (nur ${name}). Strich = Anteil in den 4 Wochen davor. Anteile gerundet.</p>`;
  }
  V.zonesMonth = zonesMonth;

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
