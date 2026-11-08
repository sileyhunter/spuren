/* Ironman Notebook – V5.5: «Meine Entwicklung» (Startbildschirm im Fortschritt).
 * Nur geprüfte Vergleiche: Belegkennzahlen aus FK.entwicklungPunkte, Urteil aus FK.entwicklung (Guards, deterministisch),
 * Text aus FK.entwicklungAntworten. Keine Diagnose, keine Trainingsanweisung, keine freie Auslegung von Rohdaten. */
(function () {
  "use strict";
  const V = (window.V55 = window.V55 || {});
  const $ = (id) => document.getElementById(id);
  const DAY = 864e5;
  const SYS = [["indoor", "Rolle (Zwift)"], ["rennrad", "Rennrad draussen"], ["mtb", "MTB/Gravel draussen"]];
  const ST = { w: 12, ref: "vorjahr", sport: "", sys: null, von: null, bis: null, last: null };
  const pill = (s) => `<span class="badge ${{ verbessert: "ok", stabil: "info", unklar: "muted", verschlechtert: "warn", "nicht beurteilbar": "muted" }[s] || "muted"}">${s}</span>`;

  function perioden(C) {
    const F = window.FK, bis = C.iso(C.today), von = F.addDays(bis, -7 * ST.w + 1);
    let R;
    if (ST.ref === "vorher") R = { von: F.addDays(von, -7 * ST.w), bis: F.addDays(von, -1) };
    else if (ST.ref === "frei" && ST.von && ST.bis && ST.von <= ST.bis) R = { von: ST.von, bis: ST.bis };
    else R = { von: String(+von.slice(0, 4) - 1) + von.slice(4), bis: String(+bis.slice(0, 4) - 1) + bis.slice(4) };
    return { P: { von, bis }, R };
  }
  const lab = (C, r) => `${C.dateCH(r.von)}–${C.dateCH(r.bis)}`;

  /** Alle Kennzahlen rechnen (für Antworten und Rechennachweis). */
  function rechne(C) {
    const F = window.FK, D = C.D, { P, R } = perioden(C), out = [];
    const sport = ST.sport;
    if (!sport || sport === "rad") {
      for (const [k, name] of SYS) {
        const pts = F.entwicklungPunkte(D, "rad200", { sys: k });
        if (!pts.length) continue;
        const r = F.entwicklung("rad200", pts, P, R);
        r.sys = k; r.label = `Rad ${name}: Puls bei 200 W`; r.kurz = `Rad ${name}`; r.alle = pts;
        r.naechstes = `${name}: mehr gleichmässige 10-min-Blöcke bei 190–210 W (ab Minute 10) – jetzt ${r.n.P} im Zeitraum, ${r.n.R} in der Referenz, nötig je ${F.EW.minN}.`;
        out.push(r);
      }
    }
    if (!sport || sport === "lauf") {
      const pts = F.entwicklungPunkte(D, "lauf330");
      const r = F.entwicklung("lauf330", pts, P, R);
      r.label = "Laufen: Puls bei 5:30/km (Strasse, flach)"; r.kurz = "Laufen 5:30/km"; r.alle = pts;
      r.naechstes = `Laufen: flache Strassenläufe mit 10 min gleichmässig bei 5:20–5:40/km – jetzt ${r.n.P} im Zeitraum, ${r.n.R} in der Referenz.`;
      out.push(r);
    }
    if (!sport || sport === "rad") {
      const L = F.lactateData(D).tests.filter((t) => t.sport === "rad");
      const byP = {}; for (const t of L) (byP[t.protokoll] = byP[t.protokoll] || []).push(t);
      const prot = Object.keys(byP).sort((a, b) => byP[b].length - byP[a].length)[0];
      if (prot) {
        const x = F.laktatFixX(byP[prot]);
        const pts = x ? F.entwicklungPunkte(D, "laktat", { protokoll: prot, x }) : [];
        // Tests sind selten: letzter Test im Zeitraum gegen den letzten Test davor (gleiches Protokoll), nicht Mediane über Perioden
        const RT = { von: "1900-01-01", bis: F.addDays(P.von, -1) }, lastIn = (L) => L.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
        const conf = pts.filter((p) => !(p.q && p.q.status === "vorschau")), pool = conf.length ? conf : pts;   // ohne bestätigte Tests: Vorschau zählt als ausgeschlossen
        const pick = [lastIn(pool.filter((p) => p.date >= P.von && p.date <= P.bis)), lastIn(pool.filter((p) => p.date <= RT.bis))].filter(Boolean);
        const r = F.entwicklung("laktat", pick, P, RT, { minN: 1 });
        r.label = `Laktat bei ${x || "–"} W (Protokoll ${prot})`; r.kurz = `Laktat bei ${x || "–"} W`; r.alle = pts; r.protokoll = prot; r.x = x; r.testvergleich = true;
        const unbest = byP[prot].filter((t) => t.datenstatus !== "bestätigt");
        r.naechstes = unbest.length ? `Laktat: Werte der Stufentests vom ${unbest.map((t) => C.dateCH(t.datum)).join(" und ")} bestätigen (Schritt B1 im Testzentrum); erst dann zählt der Vergleich bei ${x} W.`
          : `Laktat: Stufentest mit demselben Protokoll wiederholen (letzter am ${C.dateCH(byP[prot].at(-1).datum)}).`;
        if (r.status !== "nicht beurteilbar" && Math.min(r.n.P, r.n.R) < 2) {      // Einzeltests: nie «verbessert» ohne Wiederholung
          r.gruende.push("nur Einzeltests: Unterschied höchstens als Hinweis"); if (r.status === "verbessert" || r.status === "verschlechtert") r.status = "unklar";
        }
        out.push(r);
      }
    }
    if (!sport || sport === "schwimm") {
      const lok = (window.V5UI && V5UI.Inbox && V5UI.Inbox.data && V5UI.Inbox.data.css) || [];
      const pts = F.entwicklungPunkte(D, "css", { lokal: lok });
      const RT = { von: "1900-01-01", bis: F.addDays(P.von, -1) }, lastIn = (L) => L.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      const conf = pts.filter((p) => !(p.q && p.q.status === "vorschau")), pool = conf.length ? conf : pts;
      const pick = [lastIn(pool.filter((p) => p.date >= P.von && p.date <= P.bis)), lastIn(pool.filter((p) => p.date <= RT.bis))].filter(Boolean);
      const r = F.entwicklung("css", pick, P, RT, { minN: 1 });
      r.label = "Schwimmen: CSS (validierte Tests)"; r.kurz = "CSS"; r.alle = pts; r.testvergleich = true;
      r.naechstes = pts.length ? "Schwimmen: CSS-Test im gleichen Becken und mit gleichem Protokoll wiederholen." : "Schwimmen: CSS-Test (400 m und 200 m) machen und im Schwimmen-Tab eintragen; rohe Pool-Pace zählt nicht.";
      if (r.status !== "nicht beurteilbar" && Math.min(r.n.P, r.n.R) < 2 && (r.status === "verbessert" || r.status === "verschlechtert")) { r.gruende.push("nur Einzeltests"); r.status = "unklar"; }
      out.push(r);
    }
    return { P, R, ergebnisse: out };
  }

  V.entwicklung = function (C) {
    const box = $("dev-card"); if (!box || !window.FK) return;
    const F = window.FK;
    if (!box.dataset.init) {
      box.dataset.init = 1;
      box.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => { ST.w = +b.dataset.w; V.entwicklung(C); }));
      $("dev-ref").onchange = (e) => { ST.ref = e.target.value; $("dev-frei").hidden = ST.ref !== "frei"; V.entwicklung(C); };
      $("dev-von").onchange = (e) => { ST.von = e.target.value; V.entwicklung(C); };
      $("dev-bis").onchange = (e) => { ST.bis = e.target.value; V.entwicklung(C); };
      $("dev-sport").onchange = (e) => { ST.sport = e.target.value; V.entwicklung(C); };
    }
    box.querySelectorAll("[data-w]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.w === ST.w)));
    const res = rechne(C), { P, R } = res;
    ST.last = res;
    $("dev-per").textContent = `Zeitraum ${lab(C, P)} gegenüber ${lab(C, R)}${ST.ref === "vorjahr" ? " (gleicher Zeitraum im Vorjahr)" : ST.ref === "vorher" ? " (direkt davor)" : ""}.`;
    const A = F.entwicklungAntworten(res.ergebnisse);
    const li = (L, leer) => (L.length ? L.map((t) => `<li>${C.esc(t)}</li>`).join("") : `<li class="muted">${leer}</li>`);
    $("dev-a1").innerHTML = li(A.verbessert, "Keine gesicherte Verbesserung in diesem Vergleich.");
    $("dev-a2").innerHTML = li(A.stabil, "–");
    $("dev-a3").innerHTML = li(A.pruefen, "Nichts Dringendes: die Belegkennzahlen haben genug vergleichbare Messungen.");
    // Kacheln: höchstens vier Belegkennzahlen (Rad mit Systemwahl)
    const rad = res.ergebnisse.filter((r) => r.metric === "rad200");
    if (!ST.sys || !rad.some((r) => r.sys === ST.sys)) {
      const best = rad.slice().sort((a, b) => (b.n.P + b.n.R) - (a.n.P + a.n.R))[0];
      ST.sys = best ? best.sys : null;
    }
    const tiles = [rad.find((r) => r.sys === ST.sys), ...res.ergebnisse.filter((r) => r.metric !== "rad200")].filter(Boolean).slice(0, 4);
    $("dev-metrics").innerHTML = tiles.map((r, i) => tile(C, r, i, rad)).join("") || `<p class="hint">Für diese Auswahl gibt es keine Belegkennzahlen.</p>`;
    $("dev-metrics").querySelectorAll("[data-sys]").forEach((b) => (b.onclick = () => { ST.sys = b.dataset.sys; V.entwicklung(C); }));
    tiles.forEach((r, i) => miniChart(C, r, i, P, R));
    $("dev-how").innerHTML = how(C, res);
  };

  function tile(C, r, i, rad) {
    const F = window.FK, M = F.EW_METRIKEN[r.metric], dec = M.dec, f = (v) => (v == null ? "–" : C.fmt(v, dec));
    const sysSel = r.metric === "rad200" && rad.length > 1 ? `<div class="seg" role="group" aria-label="Gerätesystem">${rad.map((x) => `<button type="button" data-sys="${x.sys}" aria-pressed="${x.sys === r.sys}">${x.sys === "indoor" ? "Rolle" : x.sys === "rennrad" ? "Rennrad" : "MTB"}</button>`).join("")}</div>` : "";
    const ex = r.ausgeschlossen, exs = Object.entries(ex).filter(([, v]) => v).map(([k, v]) => `${v} ${{ hitze: "Hitze ≥ 25 °C", hoehe: "Höhe ≥ 1500 m", drift: "unruhiger Puls im Block", vorschau: "Vorschau (nicht bestätigt)", ausreisser: "Ausreisser" }[k]}`);
    const body = r.status === "nicht beurteilbar" ? `<p class="dev-num muted">keine ausreichenden vergleichbaren Daten</p><p class="hint">${C.esc(r.gruende.join("; "))}.</p>`
      : `<div class="dev-num"><b>${f(r.median.P)}</b> <small>${M.unit}</small> <span class="dev-vs">gegen ${f(r.median.R)}</span></div>
         <p class="hint">Unterschied <b>${r.diff > 0 ? "+" : r.diff < 0 ? "−" : "±"}${C.fmt(Math.abs(r.diff), dec)} ${M.unit}</b>, 90-%-Intervall ${C.fmt(r.ci90[0], dec)} bis ${C.fmt(r.ci90[1], dec)} · n ${r.n.P} gegen ${r.n.R}${r.vorlaeufig ? " · vorläufig" : ""} · Streuung (25.–75. Perzentil) ${f(r.streuung.P[0])}–${f(r.streuung.P[1])} gegen ${f(r.streuung.R[0])}–${f(r.streuung.R[1])}</p>`;
    return `<div class="dev-tile"><div class="dev-th"><h3>${C.esc(r.label)}</h3>${pill(r.status)}</div>${sysSel}${body}
      <div class="chart dev-chart"><canvas id="c-dev-${i}" aria-label="${C.esc(r.label)}: Messungen über die Zeit"></canvas></div>
      <p class="hint">${r.urteil && r.status !== "nicht beurteilbar" ? C.esc(r.urteil[0].toUpperCase() + r.urteil.slice(1)) + ". " : ""}Quelle: ${C.esc(quelle(r))}. Qualität: ${r.alle.length} Messungen insgesamt${exs.length ? "; ausgeschlossen im Vergleich: " + exs.join(", ") : ""}.</p></div>`;
  }
  function quelle(r) {
    if (r.metric === "rad200" || r.metric === "lauf330") return "FIT-Sekundenwerte, gleichmässige 10-min-Blöcke (eb-1.0), je Aktivität ein Wert";
    if (r.metric === "laktat") return `Stufentests ${r.protokoll || ""}, Laktat linear zwischen gemessenen Stufen`;
    return "eingetragene CSS-Tests (400 m und 200 m)";
  }
  function miniChart(C, r, i, P, R) {
    const F = window.FK, M = F.EW_METRIKEN[r.metric], x = (d) => F.dayNum(d);
    const inP = new Set(r.punkte.P.map((p) => p.id + p.date)), inR = new Set(r.punkte.R.map((p) => p.id + p.date));
    const lo = Math.min(x(R.von), x(P.von)), hi = Math.max(x(R.bis), x(P.bis));
    const vis = r.alle.filter((p) => x(p.date) >= lo - 30 && x(p.date) <= hi);
    const pt = (p) => ({ x: x(p.date), y: p.v, p });
    const ds = [
      { label: "Referenz", data: vis.filter((p) => inR.has(p.id + p.date)).map(pt), backgroundColor: C.css("--muted"), borderColor: C.css("--muted"), pointRadius: 4 },
      { label: "Zeitraum", data: vis.filter((p) => inP.has(p.id + p.date)).map(pt), backgroundColor: C.css("--accent"), borderColor: C.css("--accent"), pointRadius: 4.5 },
      { label: "nicht im Vergleich", data: vis.filter((p) => !inP.has(p.id + p.date) && !inR.has(p.id + p.date)).map(pt), backgroundColor: "transparent", borderColor: C.css("--line-2") || "#c4ccd3", pointRadius: 3.5, pointBorderWidth: 1.25 },
    ];
    if (r.median) {
      ds.push({ type: "line", label: "Median Referenz", data: [{ x: x(R.von), y: r.median.R }, { x: x(R.bis), y: r.median.R }], borderColor: C.css("--muted"), borderWidth: 1.5, pointRadius: 0 });
      ds.push({ type: "line", label: "Median Zeitraum", data: [{ x: x(P.von), y: r.median.P }, { x: x(P.bis), y: r.median.P }], borderColor: C.css("--accent"), borderWidth: 2, pointRadius: 0 });
    }
    const mon = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    C.chart("c-dev-" + i, { type: "scatter", data: { datasets: ds }, options: { animation: false, parsing: false,
      scales: { x: { type: "linear", min: lo - 3, max: hi + 3, ticks: { maxTicksLimit: innerWidth < 560 ? 4 : 6, callback: (v) => { const d = new Date(v * DAY); return `${mon[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`; } }, grid: { display: false } },
        y: { ticks: { maxTicksLimit: 4 }, title: { display: true, text: M.unit, font: { size: 11 } } } },
      plugins: { legend: { display: false }, tooltip: { filter: (it) => it.raw && it.raw.p, callbacks: { label: (c) => { const p = c.raw.p, q = p.q || {};
        return `${C.dateCH(p.date)} · ${p.name || ""}: ${C.fmt(p.v, M.dec)} ${M.unit}${r.metric === "rad200" ? ` bei ${C.fmt(p.x)} W` : r.metric === "lauf330" ? ` bei ${F.pace(p.x)}/km` : ""}${q.n ? ` (${q.n} ${q.n === 1 ? "Block" : "Blöcke"})` : ""}${q.status === "vorschau" ? " · Vorschau" : ""}`; } } } } } });
  }
  function how(C, res) {
    const F = window.FK, E = F.EW, dv = (C.D.versions || {}).entwicklung;
    const rows = res.ergebnisse.map((r) => `<tr><td>${C.esc(r.label)}</td><td>${r.n.P} / ${r.n.R}</td><td>${r.median ? C.fmt(r.median.P, F.EW_METRIKEN[r.metric].dec) + " / " + C.fmt(r.median.R, F.EW_METRIKEN[r.metric].dec) : "–"}</td><td>${r.diff != null ? C.fmt(r.diff, 1) : "–"}</td><td>${r.ci90 ? C.fmt(r.ci90[0], 1) + " bis " + C.fmt(r.ci90[1], 1) : "–"}</td><td>${r.status}</td><td>${Object.values(r.ausgeschlossen).reduce((s, v) => s + v, 0)}</td></tr>`).join("");
    return `<p>Jede Aussage vergleicht den Median des Zeitraums mit dem Median der Referenz. Je Aktivität zählt ein Wert (Median ihrer Blöcke), damit eine lange Einheit nicht mehrfach zählt.</p>
      <ul class="flags"><li>Rad: gleichmässige 10-min-Blöcke ab Minute 10 mit Ø 190–210 W, 30-s-Mittel schwanken höchstens 10 %, nie unter 75 %, höchstens 3 % ohne Treten; je Gerätesystem getrennt (Rolle, Rennrad, MTB), nie gemischt.</li>
        <li>Laufen: 10-min-Blöcke ab Minute 10 mit Ø 5:20–5:40/km auf der Strasse, Steigung höchstens ±2 %, höchstens 15 m Anstieg; Laufband und Trail ausgeschlossen.</li>
        <li>Laktat: nur bestätigte Stufentests desselben Protokolls, Wert bei fixer Leistung linear zwischen zwei gemessenen Stufen, nie ausserhalb. CSS: nur eingetragene 400/200-m-Tests, CSS = (T400 − T200) / 2.</li>
        <li>Guards: mindestens ${E.minN} Messungen je Zeitraum (Laktat und CSS: je 1, dann höchstens «unklar»); ausgeschlossen werden Hitze ab ${E.hitze} °C (Wetterstation), Höhe ab ${E.hoehe} m (draussen), Puls im Block um mehr als ${E.dhrMax} bpm steigend oder fallend, Ausreisser mehr als ${E.madK} MAD vom Median (ab 5 Werten).</li>
        <li>Unsicherheit: 90-%-Intervall des Medianunterschieds aus ${E.boot} Bootstrap-Ziehungen mit festem Startwert (gleiche Daten = gleiches Ergebnis).</li>
        <li>Urteil: «verbessert» bzw. «verschlechtert» nur, wenn der Unterschied mindestens die Messschwelle erreicht (Puls 3 bpm, Laktat 0,3 mmol/l, CSS 2 s/100 m) und das Intervall 0 nicht einschliesst; unter der Schwelle mit 0 im Intervall «stabil», sonst «unklar». Unter 6 Messungen je Seite: «vorläufig».</li></ul>
      <div class="tablewrap"><table class="t"><tr><th>Kennzahl</th><th>n Zeitraum / Ref.</th><th>Median Zeitraum / Ref.</th><th>Unterschied</th><th>90-%-Intervall</th><th>Urteil</th><th>ausgeschl.</th></tr>${rows}</table></div>
      <p class="hint">Regeln ${F.VERSIONS.entwicklung}, Blöcke ${dv ? (typeof dv === "string" ? dv : dv.v) : "eb-1.0"}. Text aus festen Regeln erzeugt (kein Sprachmodell); er darf umformuliert, aber Zahlen und Unsicherheit dürfen nicht verändert werden. Keine medizinische Diagnose, keine Trainingsanweisung.</p>`;
  }
  /** Leistung: primärer Ausdauertrend je Jahr und System (Median der Blöcke, n, Streuung). Kein Mischen der Systeme. */
  V.trend = function (C) {
    const box = $("trend-tab"); if (!box || !window.FK) return;
    const F = window.FK, D = C.D, Y = C.today.getFullYear(), years = [Y - 3, Y - 2, Y - 1, Y];
    const rows = [["rad200", "indoor", "Rad Rolle (Zwift) · Puls bei 200 W"], ["rad200", "rennrad", "Rennrad draussen · Puls bei 200 W"], ["rad200", "mtb", "MTB/Gravel · Puls bei 200 W"], ["lauf330", null, "Laufen Strasse · Puls bei 5:30/km"]];
    const q = (v, p) => F.util.quant(v, p);
    // gestapelt statt breiter Tabelle: je Kennzahl eine Zeile mit vier Jahreszellen (passt auf 375 px)
    box.innerHTML = rows.map(([art, sys, name]) => {
      const pts = F.entwicklungPunkte(D, art, sys ? { sys } : {});
      return `<div class="tr-row"><h3>${C.esc(name)}</h3><div class="tr-years">${years.map((y) => { const v = pts.filter((p) => p.date.startsWith(String(y))).map((p) => p.v);
        return `<div><span>${y}</span>${v.length ? `<b>${C.fmt(F.util.median(v), 0)}</b><small>n ${v.length}${v.length >= 4 ? `<br>${C.fmt(q(v, 0.25), 0)}–${C.fmt(q(v, 0.75), 0)}` : ""}</small>` : `<b class="muted">–</b><small>keine</small>`}</div>`; }).join("")}</div></div>`;
    }).join("");
    $("trend-note").textContent = `Median je Kalenderjahr aus gleichmässigen 10-min-Blöcken (eb-1.0), je Aktivität ein Wert; darunter n und die mittlere Hälfte der Werte (25.–75. Perzentil). Jahre sind nur innerhalb einer Zeile vergleichbar. Ob ein Unterschied gesichert ist, prüft «Meine Entwicklung» (Fortschritt) mit Guards und Unsicherheit.`;
  };
  /** Breite Tabellen auf dem Handy: Schatten am Rand und Hinweis «seitlich wischen», damit keine Spalte still verschwindet. */
  function markScroll() {
    document.querySelectorAll(".tablewrap").forEach((w) => {
      if (!w.offsetParent) return;
      const over = w.scrollWidth > w.clientWidth + 2;
      w.classList.toggle("scrollx", over);
      let h = w.previousElementSibling && w.previousElementSibling.classList.contains("scroll-hint") ? w.previousElementSibling : null;
      if (over && !h) { h = document.createElement("p"); h.className = "scroll-hint"; h.textContent = "↔ seitlich wischen: weitere Spalten"; w.parentNode.insertBefore(h, w); }
      if (h) h.hidden = !over;
    });
  }
  let mt = null;
  const kick = () => { clearTimeout(mt); mt = setTimeout(markScroll, 250); };
  if (typeof MutationObserver !== "undefined") new MutationObserver(kick).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener("resize", kick);
  V.markScroll = markScroll;
  /** Für den Rechennachweis (Daten & Methode): nur Zahlen, keine Rohreihen. */
  window.DEV_PROOF = () => {
    const r = ST.last; if (!r) return null;
    return { regel: window.FK.VERSIONS.entwicklung, zeitraum: r.P, referenz: r.R, ergebnisse: r.ergebnisse.map((e) => ({ kennzahl: e.label, status: e.status, n: e.n,
      median: e.median || null, unterschied: e.diff ?? null, intervall90: e.ci90 || null, ausgeschlossen: e.ausgeschlossen, gruende: e.gruende,
      punkte_zeitraum: e.punkte.P.map((p) => ({ datum: p.date, wert: p.v, id: p.id })), punkte_referenz: e.punkte.R.map((p) => ({ datum: p.date, wert: p.v, id: p.id })) })) };
  };
})();
