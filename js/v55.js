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
  const pill = (s) => (window.V5UI && V5UI.badge ? V5UI.badge(s) : `<span class="badge">${s}</span>`);   // gleiche Pillen wie überall

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
    // V5.6 Ermüdungsresistenz (ermuedung-1.0): je Einheit früh gegenüber spät, dann Zeitraum gegen Referenz wie oben
    if (window.AN && (!sport || sport === "rad" || sport === "lauf")) {
      const A = D.activities || [], wx = (a) => (a.wx && typeof a.wx.temperature === "number" ? a.wx.temperature : null);
      const add = (id, pts, label, kurz, naechstes, extra) => { const r = F.entwicklung(id, pts, P, R); Object.assign(r, { label, kurz, alle: pts, naechstes }, extra || {}); out.push(r); };
      if (!sport || sport === "rad") {
        for (const [sys, name] of [["indoor", "Rolle"], ["draussen", "draussen"]]) {
          const pts = A.filter((a) => a.sport === "rad" && a.fr && (F.bikeSys(a) === "indoor") === (sys === "indoor")).map((a) => ({ a, e: AN.ermuedungRad(a.fr) }))
            .filter((x) => x.e && x.e.status === "ok").map(({ a, e }) => ({ date: a.date, v: e.dhr, id: a.id, name: a.name, x: e.spaet[1], q: { wx: wx(a), n: 1, alt: null, dhr: null } }));
          if (pts.length) add("dauer_rad", pts, `Rad ${name}: Pulsanstieg bei gleicher Leistung nach ≥ 2.5 h`, `Ermüdungsresistenz Rad ${name}`,
            `Rad ${name}: lange Fahrten (≥ 3 h) mit je einem gleichmässigen 10-min-Block früh und nach 2.5 h bei ähnlicher Leistung – jetzt ${pts.length} insgesamt.`, { sys });
        }
        const p3 = A.filter((a) => a.sport === "rad" && a.fr && a.fr.p20 && typeof a.fr.p20[2] === "number").map((a) => { const d = AN.dauerleistung(a.fr); return { date: a.date, v: Math.round(100 * d.rel[3]), id: a.id, name: a.name, x: d.nach[3], q: { wx: wx(a) } }; });
        if (p3.length) add("p20_3h", p3, "Rad: beste 20 min ab Stunde 3 (Anteil der frischen 20 min)", "Leistung nach 3 h", `Rad: Fahrten über 3 h 20 min mit einem harten Block nach Stunde 3 – jetzt ${p3.length}.`);
      }
      if (!sport || sport === "lauf") {
        const pl = A.filter((a) => a.sport === "lauf" && a.fr).map((a) => ({ a, e: AN.ermuedungLauf(a.fr) })).filter((x) => x.e && x.e.status === "ok")
          .map(({ a, e }) => ({ date: a.date, v: e.dhr, id: a.id, name: a.name, x: e.spaet[1], q: { wx: wx(a) } }));
        if (pl.length) add("dauer_lauf", pl, "Laufen: Pulsanstieg bei gleicher Pace nach ≥ 60 min", "Ermüdungsresistenz Laufen", `Laufen: lange flache Läufe mit gleichmässigem Tempo früh und nach 60 min – jetzt ${pl.length}.`);
        const ph = A.filter((a) => a.sport === "lauf" && a.fr && a.fr.bl).map((a) => { const b = a.fr.bl.filter((x) => x[2] >= 145 && x[2] <= 155).map((x) => x[1]); return b.length ? { date: a.date, v: AN.util.median(b), id: a.id, name: a.name, q: { wx: wx(a) } } : null; }).filter(Boolean);
        if (ph.length) add("lauf_hf150", ph, "Laufen: Pace bei 145–155 bpm (flach, gleichmässig, Läufe ≥ 60 min)", "Pace bei 150 bpm", `Laufen: lange flache Läufe im Bereich 145–155 bpm – jetzt ${ph.length}.`);
      }
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
      r.label = "Schwimmen: CSS-Test (einziger Schwimm-Massstab)"; r.kurz = "CSS"; r.alle = pts; r.testvergleich = true;
      const nx = window.V59L ? window.V59L.cssPlan(D.tests, (window.V5UI && V5UI.merged ? V5UI.merged("css_tests", "css") : D.css_tests) || [], C.iso(C.today)).naechster : null;
      const wann = nx ? ` – nächster geplant am ${C.dateCH(nx.date)}${nx.note ? " (" + nx.note + ")" : ""}` : "";
      r.naechstes = pts.length ? `Schwimmen: CSS-Test im gleichen Becken und mit gleichem Protokoll wiederholen${wann}.` : `Schwimmen: CSS-Test (400 m und 200 m) machen und im Schwimmen-Tab eintragen${wann}; die Pace ganzer Einheiten aus Garmin zählt nicht.`;
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
    // V5.9.4: «Alle Sportarten» zeigt die vier Belegkennzahlen Rad, Laufen, Laktat und CSS (Schwimmen nur mit dem CSS-Test, E6);
    // Ermüdung und weitere Rad-/Laufwerte mit der Sportart-Wahl. Die Antworten oben nutzen immer alle Ergebnisse.
    const KERN = ["lauf330", "laktat", "css"], andere = res.ergebnisse.filter((r) => r.metric !== "rad200");
    const tiles = [rad.find((r) => r.sys === ST.sys), ...(ST.sport ? andere : KERN.map((k) => andere.find((r) => r.metric === k)))].filter(Boolean);
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
    if (r.metric === "css") return "eingetragene CSS-Tests (400 m und 200 m)";
    if (r.metric === "dauer_rad" || r.metric === "dauer_lauf") return "FIT-Sekundenwerte (ermuedung-1.0): je Einheit Puls früh gegen spät bei gleicher Leistung bzw. Pace, je Einheit ein Wert";
    if (r.metric === "p20_3h") return "FIT-Sekundenwerte (ermuedung-1.0): beste 20 min ab Stunde 3 gegen die besten frischen 20 min derselben Fahrt";
    if (r.metric === "lauf_hf150") return "FIT-Sekundenwerte (ermuedung-1.0): Pace in Abschnitten mit 145–155 bpm, flach und gleichmässig, je Lauf der Median";
    return "FIT-Sekundenwerte";
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
  /* ======================= Heute: Tagesurteil, Datenqualität, drei Kennzahlen (A12) ======================= */
  /** Datenqualität als Liste: was vorhanden ist und was fehlt – fehlende Werte werden nie als «normal» gezeigt. */
  V.datenqualitaet = function (r, g) {
    const I = r.indikatoren, L = [];
    L.push(I.hrv.status === "unbekannt" ? { ok: false, t: I.hrv.grund } : { ok: true, t: `HRV vorhanden (${I.hrv.n7} von 7 Nächten)` });
    L.push(I.rhr.status === "unbekannt" ? { ok: false, t: I.rhr.grund } : { ok: true, t: "Ruhepuls vorhanden" });
    L.push(I.schlaf.status === "unbekannt" ? { ok: false, t: "letzte Schlafnacht fehlt" } : { ok: true, t: "Schlaf der letzten Nacht vorhanden" });
    L.push(I.befinden.status === "nicht angegeben" ? { ok: false, t: "subjektives Befinden fehlt" } : { ok: true, t: "Befinden eingetragen" });
    if (g) {          // V6.1 wellness-1.0: Garmins eigene Werte – gezeigt, nicht in die Ampel eingerechnet
      L.push(g.readiness != null ? { ok: true, t: `Garmin-Readiness ${g.readiness}${g.wort ? ` (${g.wort})` : ""}` } : { ok: false, t: "Garmin-Readiness von heute fehlt" });
      L.push(g.bodyBattery != null ? { ok: true, t: `Body Battery beim Aufwachen ${g.bodyBattery}` } : { ok: false, t: "Body Battery beim Aufwachen fehlt" });
      L.push(g.stressGestern != null ? { ok: true, t: `Stress gestern Ø ${g.stressGestern}` } : { ok: false, t: "Stress von gestern fehlt" });
    }
    return L;
  };
  /** V6.1 datenlage-1.0: je Wert seit wann vorhanden und wie lückenlos (abgeschlossene Tage bis gestern). */
  V.datenlage = function (C) {
    if (!window.V61) return "";
    const day = C.iso(C.today), bef = window.V5UI && window.V5UI.befinden ? window.V5UI.befinden().map((b) => b.date) : null;
    const L = window.V61.datenlage(C.D.days, day, bef);
    return `<details class="td-lage"><summary>Datenlage je Wert – seit wann, wie lückenlos</summary>
      <div class="tablewrap"><table class="t td-lage-t" data-keine-liste><tr><th class="l">Wert</th><th>seit</th><th>30 T.</th><th>365 T.</th></tr>${L.map((r) => `<tr><td class="l">${C.esc(r.label)}</td>
        <td>${r.seit ? C.dateCH(r.seit) : "–"}</td><td>${r.n30}</td><td>${r.n365}</td></tr>`).join("")}</table></div>
      <p class="hint">Tage mit Wert in den letzten 30 bzw. 365 abgeschlossenen Tagen (bis gestern); fehlende Tage bleiben fehlend. Readiness und Stress holt das Nacht-Update rückwirkend nach (20 Tage je Nacht; Readiness liefert Garmin erst ab Spätsommer 2024); Body Battery gibt es ab jetzt.</p></details>`;
  };
  V.heute = function (C, r) {
    const box = $("today-main"); if (!box) return;
    const D = C.D, day = C.iso(C.today), I = r.indikatoren, F = window.FK;
    const lastSleep = D.days.filter((d) => d.date <= day && d.sleepH > 0).at(-1);
    const nacht = (iso) => { const p = F.addDays(iso, -1); return `Nacht ${C.dateCH(p).replace(/\.\d{4}$/, ".")}–${C.dateCH(iso).replace(/\.\d{4}$/, ".")}`; };
    const head = { bereit: "Bereit", normal: "Normal", vorsichtig: "Vorsicht bei Intensität", "nicht beurteilbar": "Nicht beurteilbar" }[r.status];
    const dq = V.datenqualitaet(r, window.V61 ? window.V61.garminTag(D.days, day) : null);
    const tile = (lab, val, sub, miss) => `<div class="${miss ? "miss" : ""}"><span>${lab}</span><b>${val}</b><small>${sub}</small></div>`;
    const hrvT = I.hrv.status === "unbekannt" ? tile("HRV, Ø 7 Nächte", "fehlt", C.esc(I.hrv.grund), true)
      : tile("HRV, Ø 7 Nächte", `${I.hrv.wert7} ms`, `Referenz ${I.hrv.refLo}–${I.hrv.refHi} ms (${I.hrv.referenz}) · ${C.esc(I.hrv.status)}`);
    const rhrT = I.rhr.status === "unbekannt" ? tile("Ruhepuls, Ø 3 Tage", "fehlt", C.esc(I.rhr.grund), true)
      : tile("Ruhepuls, Ø 3 Tage", `${C.fmt(I.rhr.wert3, 0)} bpm`, `Referenz ${C.fmt(I.rhr.ref, 0)} bpm (${I.rhr.referenz}) · ${C.esc(I.rhr.status)}`);
    const sT = I.schlaf.status === "unbekannt"
      ? tile(`Schlaf, ${nacht(day)}`, "fehlt", lastSleep ? `zuletzt erfasst: ${nacht(lastSleep.date)}, ${C.fmt(lastSleep.sleepH, 1)} h – zählt heute nicht` : "keine Schlafdaten", true)
      : tile(`Schlaf, ${nacht(day)}`, `${C.fmt(I.schlaf.wert, 1)} h`, `${I.schlaf.score != null ? `Garmin-Schlafwert ${I.schlaf.score} von 100 · ` : ""}${C.esc(I.schlaf.status)}${I.schlaf.ref != null ? ` (Ø 28 Tage ${C.fmt(I.schlaf.ref, 1)} h)` : ""}`);
    box.innerHTML = `<div class="td-verdict rd-${r.status.replace(/ /g, "-")}"><b>${head}</b><span>${C.esc(r.empfehlung)}</span></div>
      <p class="td-dq${dq.some((x) => !x.ok) ? " keep" : ""}"><span>Datenqualität:</span> ${dq.map((x) => `<i class="${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "–"} ${C.esc(x.t)}</i>`).join("")}</p>
      <div class="td-tiles">${hrvT}${rhrT}${sT}</div>${V.datenlage(C)}`;
  };
  /* V5.8 Ringe (ringe-1.0): Erholung, Schlaf, Belastung je 0–100 % mit Wochenverlauf. Angezeigt wird der letzte Tag mit
   * Morgenwerten (die Werte von heute kommen mit dem Garmin-Update in der Nacht) – immer mit Datum, nie eine andere Nacht. */
  const RG = { n: 7 };
  V.ringe = function (C) {
    const box = $("ringe"); if (!box || !window.FK) return;
    const F = window.FK, D = C.D, heute = C.iso(C.today), isN = (v) => typeof v === "number" && isFinite(v);
    let tag = heute;
    for (let i = 0; i < 8; i++) { const d = F.addDays(heute, -i), r = (D.days || []).find((x) => x.date === d); if (r && (isN(r.hrv) || isN(r.rhr) || isN(r.sleepScore))) { tag = d; break; } }
    const T = F.ringeVerlauf(D.days, D.activities, tag, RG.n), r = T[T.length - 1];
    const col = { gut: C.css("--good"), mittel: C.css("--warn"), tief: C.css("--bad"), unbekannt: C.css("--muted") };
    const ring = (v, color, label, sub) => `<div class="rg${v == null ? " miss" : ""}">${C.ringSVG(v == null ? 0 : v / 100, v == null ? C.css("--muted") : color, v == null ? "–" : v + " %", v == null ? "fehlt" : "", label)}<b style="color:${v == null ? "inherit" : color}">${label}</b><small>${sub}</small></div>`;
    const e = r.erholung, sE = e == null ? (r.hrv == null && r.rhr == null ? "keine Morgenwerte" : "zu wenig Referenz (unter 14 Tage)") : `${r.hrv != null ? `HRV ${C.fmt(r.hrv, 0)} ms` : "HRV fehlt"} · ${r.rhr != null ? `Ruhepuls ${C.fmt(r.rhr, 0)}` : "Ruhepuls fehlt"}<br>gegen deine 60 Tage${r.quelleE && /nur/.test(r.quelleE) ? ` (${C.esc(r.quelleE)})` : ""}`;
    const sS = r.schlaf == null ? "Nacht fehlt – keine andere Nacht eingesetzt" : `Garmin-Schlafwert${r.sleepH != null ? ` · ${C.fmt(r.sleepH, 1)} h` : ""}`;
    const sB = r.belastung == null ? "zu wenig Daten für die Fitness" : `Tageslast ${C.fmt(r.tss, 0)} bei Fitness ${C.fmt(r.ctl, 0)}<br>${r.tss ? "50 % = so viel wie deine Fitness" : "Ruhetag"}`;
    box.innerHTML = ring(e, col[F.ringFarbe(e)], "Erholung", sE) + ring(r.schlaf, C.css("--sleep"), "Schlaf", sS) + ring(r.belastung, C.css("--strain"), "Belastung", sB);
    $("ringe-sub").textContent = tag === heute ? `Heute, ${C.dateCH(tag)}` : `Stand ${C.dateCH(tag)} – die Morgenwerte von heute kommen mit dem Garmin-Update in der Nacht`;
    const labs = T.map((x) => C.dLabel(x.date));
    C.chart("c-ringe", { type: "line", data: { labels: labs, datasets: [
      { label: "Erholung", data: T.map((x) => x.erholung), borderColor: C.css("--good"), backgroundColor: C.css("--good"), borderWidth: 2, pointRadius: RG.n > 14 ? 1.5 : 3, tension: 0.25, spanGaps: false },
      { label: "Schlaf", data: T.map((x) => x.schlaf), borderColor: C.css("--sleep"), backgroundColor: C.css("--sleep"), borderWidth: 2, pointRadius: RG.n > 14 ? 1.5 : 3, tension: 0.25, spanGaps: false },
      { label: "Belastung", data: T.map((x) => x.belastung), borderColor: C.css("--strain"), backgroundColor: C.css("--strain"), borderWidth: 2, pointRadius: RG.n > 14 ? 1.5 : 3, tension: 0.25, spanGaps: false }] },
      options: { animation: false, interaction: { mode: "index", intersect: false },
        scales: { y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => v + " %" } }, x: { ticks: { maxTicksLimit: innerWidth < 560 ? 5 : 8, maxRotation: 0 }, grid: { display: false } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? "fehlt" : c.raw + " %"}`, afterBody: (it) => { const x = T[it[0].dataIndex]; return [`HRV ${x.hrv ?? "–"} ms · Ruhepuls ${x.rhr ?? "–"}`, `Schlaf ${x.sleepH != null ? C.fmt(x.sleepH, 1) + " h" : "–"} · Tageslast ${C.fmt(x.tss, 0)}`]; } } } } } });
    const miss = T.filter((x) => x.erholung == null || x.schlaf == null).length;
    $("ringe-note").textContent = `Alle drei von 0 bis 100 %, mehr = mehr. Erholung: HRV und Ruhepuls dieses Morgens gegen deine eigenen 60 Tage davor (50 % = für dich typischer Morgen, 84 % = eine Standardabweichung besser). Schlaf: Garmin-Schlafwert der Nacht davor. Belastung: Trainingslast des Tages gegen deine Fitness (50 % = Tageslast so gross wie die Fitness, 75 % = doppelt so gross). Lücken bleiben leer${miss ? ` (an ${miss} von ${T.length} Tagen fehlt mindestens ein Wert)` : ""}. Kein medizinisches Mass. Regel ${F.VERSIONS.ringe}.`;
    $("ringe-range").querySelectorAll("button").forEach((b) => { b.setAttribute("aria-pressed", String(+b.dataset.n === RG.n)); b.onclick = () => { RG.n = +b.dataset.n; V.ringe(C); }; });
  };
  /** Bereitschaft im Verlauf: drei synchronisierte Mini-Grafiken mit gemeinsamer Zeitachse statt einer Grafik mit zwei Skalen. */
  V.verlauf = function (C, T) {
    const ids = ["c-rd-hrv", "c-rd-rhr", "c-rd-sleep"], labs = T.map((x) => C.dLabel(x.date));
    const sync = (idx) => { for (const id of ids) { const ch = C.charts[id]; if (!ch) continue; const el = idx == null ? [] : [{ datasetIndex: 0, index: idx }];
      const pt = idx == null ? null : ch.getDatasetMeta(0).data[idx]; ch.setActiveElements(el); ch.tooltip.setActiveElements(el, pt ? { x: pt.x, y: pt.y } : { x: 0, y: 0 }); ch.update("none"); } };
    const base = (last, unit) => ({ animation: false, interaction: { mode: "index", intersect: false }, layout: { padding: { right: 8 } },
      onHover: (e, els) => sync(els.length ? els[0].index : null), onClick: (e, els) => sync(els.length ? els[0].index : null),
      scales: { x: { offset: true, ticks: { display: last, maxTicksLimit: innerWidth < 560 ? 5 : 8, maxRotation: 0 }, grid: { display: false } },   // gleiche Lage wie die Schlafbalken
        y: { ticks: { maxTicksLimit: 3 }, title: { display: true, text: unit, font: { size: 11 } }, afterFit: (sc) => { sc.width = 58; } } },
      plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { title: (it) => it[0].label, label: () => null,
        afterBody: (it) => { const x = T[it[0].dataIndex]; return [`HRV ${x.hrv ?? "–"} ms${x.refLo ? ` (Referenz ${x.refLo}–${x.refHi})` : ""}`, `Ruhepuls ${x.rhr ?? "–"} bpm`, `Schlaf ${x.sleepH != null ? C.fmt(x.sleepH, 1) + " h" : "fehlt"}`, `Bereitschaft: ${x.status}`]; } } } } });
    C.chart(ids[0], { type: "line", data: { labels: labs, datasets: [
      { label: "HRV", data: T.map((x) => x.hrv), borderColor: C.css("--accent"), backgroundColor: C.css("--accent"), borderWidth: 1.75, pointRadius: 2.5, tension: 0, spanGaps: false },
      { label: "Referenz unten", data: T.map((x) => x.refLo), borderColor: "transparent", pointRadius: 0, fill: false },
      { label: "Referenz", data: T.map((x) => x.refHi), borderColor: "transparent", backgroundColor: C.css("--accent") + "1f", pointRadius: 0, fill: "-1" }] }, options: base(false, "HRV ms") });
    C.chart(ids[1], { type: "line", data: { labels: labs, datasets: [{ label: "Ruhepuls", data: T.map((x) => x.rhr), borderColor: C.css("--strain"), backgroundColor: C.css("--strain"), borderWidth: 1.75, pointRadius: 2.5, tension: 0, spanGaps: false }] }, options: base(false, "Ruhepuls bpm") });
    C.chart(ids[2], { type: "bar", data: { labels: labs, datasets: [{ label: "Schlaf", data: T.map((x) => x.sleepH), backgroundColor: C.css("--sleep") + "99", borderRadius: 2, maxBarThickness: 14 }] }, options: (() => { const o = base(true, "Schlaf h"); o.scales.y.min = 0; o.scales.y.suggestedMax = 10; return o; })() });
    const miss = T.filter((x) => x.sleepH == null).length;
    $("rd-trend-note").textContent = `Band = deine HRV-Referenz (eigene 60 bzw. 28 Tage vor der Woche, ±0,5 SD). Lücken bleiben Lücken${miss ? ` (Schlaf fehlt an ${miss} von ${T.length} Tagen)` : ""}. Antippen zeigt alle Werte des Tages.`;
  };

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
