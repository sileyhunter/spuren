/* Ironman Notebook – V5.6 Aktivitäts-Explorer (explorer-1.0).
 * Öffnet sich über jedem Tab (kein neuer Haupttab): data-ex="<Aktivitäts-ID>" an Knöpfen in Kalender, Karte, Heute.
 * Reihe: serien/<Name>.bin (Name aus serien_salz und ID, AES-GCM mit dem Seitenschlüssel, gzip), nur bei Bedarf geladen. Rechnen: js/analyse.js (AN).
 * Auswahl: waagrecht über die Grafiken ziehen (senkrecht scrollt die Seite), Tippen setzt den Cursor.
 * Eingaben (RPE, Intervall-Korrekturen, Laktatpunkte) bleiben verschlüsselt auf dem Gerät bis «Exportieren». */
(function () {
  "use strict";
  const EX = (window.EX = window.EX || {});
  const $ = (id) => document.getElementById(id);
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const UI = () => window.V5UI, C = () => window.V5UI && V5UI.C;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f0 = (x) => (isNum(x) ? Math.round(x).toLocaleString("de-CH") : "–"), f1 = (x) => (isNum(x) ? (Math.round(x * 10) / 10).toFixed(1) : "–");
  const hms = (s) => { if (!isNum(s)) return "–"; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
  const pace = (sPerKm) => (isNum(sPerKm) ? `${Math.floor(sPerKm / 60)}:${String(Math.round(sPerKm % 60)).padStart(2, "0")}` : "–");
  const meter = (m) => (!isNum(m) ? "–" : m >= 2000 ? `${f1(m / 1000)} km` : `${f0(m)} m`);
  const ST = { a: null, S: null, sel: null, cur: null, A: null, ints: null, plan: null };

  /* ---------------- Laden ---------------- */
  async function gunzip(u8) {
    if (typeof DecompressionStream === "undefined") throw new Error("Dieser Browser kann die Sekundenwerte nicht entpacken (Safari ab iOS 16.4 nötig).");
    const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }
  async function laden(a) {
    if (window.SPUREN_DEMO) return AN.decode(demoSerie(a));
    const salz = C().D.serien_salz;
    if (!salz) throw Object.assign(new Error("Für diese Daten liegen noch keine Sekundenwerte vor."), { art: "fehlt" });
    // V5.7.1: Name aus der gid (bleibt beim Monatsexport gleich); ältere Reihen liegen evtl. noch unter der Aktivitäts-ID
    const keys = [AN.serieKey(a)]; if (String(a.id) !== keys[0]) keys.push(String(a.id));
    let r = null;
    for (const k of keys) { r = await fetch(`serien/${await AN.serieName(salz, k)}.bin`); if (r.status !== 404) break; }
    if (r.status === 404) throw Object.assign(new Error("Für diese Aktivität liegen noch keine Sekundenwerte vor. Sie kommen mit dem nächsten Nacht-Update, sonst mit dem nächsten Export der FIT-Dateien (manuell erfasste Einheiten haben keine)."), { art: "fehlt" });
    if (!r.ok) throw new Error(`Sekundenwerte nicht geladen (HTTP ${r.status}).`);
    const u8 = new Uint8Array(await r.arrayBuffer());
    const V = window.SPUREN_VAULT; if (!V || !V.openBin) throw new Error("Seite zuerst entsperren.");
    const plain = await gunzip(await V.openBin(u8));
    return AN.decode(JSON.parse(new TextDecoder().decode(plain)));
  }
  /** Demo: frei erfundene Reihe passend zur Beispielaktivität (keine echten Daten). */
  function demoSerie(a) {
    let s = 0; for (const ch of a.id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const dur = Math.min(a.mv || a.dur || 3600, 6 * 3600), n = Math.floor(dur / 2), rad = a.sport === "rad", R = { ver: "serie-1.0", dt: 2, t0: a.t0 || 0, seg: [[0, n]], id: a.id, sport: a.sport, hr: [], v: [], alt: [], d: [] };
    if (rad) { R.w = []; R.cad = []; }
    let d = 0, hr = 110, alt = 600;
    for (let i = 0; i < n; i++) {
      const t = i * 2, on = rad && t > 1200 && t < dur - 900 && ((t - 1200) % 600) < 300;
      const w = rad ? (on ? 260 : 185) + (rnd() - 0.5) * 30 : null, v = rad ? 8 + (rnd() - 0.5) : 3 + (rnd() - 0.5) * 0.2;
      hr += ((rad ? 100 + 0.22 * w : 150) + t / 300 - hr) * 0.02; alt += Math.sin(t / 700) * 0.6; d += v * 2;
      R.hr.push(Math.round(hr)); R.v.push(Math.round(v * 100)); R.alt.push(Math.round(alt * 10)); R.d.push(Math.round(d));
      if (rad) { R.w.push(Math.round(w)); R.cad.push(Math.round(88 + (rnd() - 0.5) * 6)); }
    }
    return R;
  }

  /* ---------------- Öffnen ---------------- */
  EX.open = async function (id, opt) {
    const c = C(); if (!c) return;
    const a = c.ACT_BY_ID.get(id); if (!a) return;
    let ov = $("ex"); if (!ov) { ov = document.createElement("div"); ov.id = "ex"; ov.className = "v5-overlay ex-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); document.body.appendChild(ov); }
    ov.hidden = false; document.body.classList.add("ex-offen");
    Object.assign(ST, { a, S: null, sel: null, cur: null, ints: null });
    ov.innerHTML = `<div class="te-box ex"><div class="te-head ex-head"><div><h2>${esc(a.name)}</h2><div class="sub">${c.dateCH(a.date)} · ${esc((c.SPORTS[a.sport] || {}).label || a.sport)} · ${c.hmm(a.mv || a.dur)} h${a.km ? ` · ${c.fmt(a.km, 1)} km` : ""}</div></div>
      <button class="btn icon" id="ex-close" aria-label="Schliessen">×</button></div><div id="ex-rpe"></div><div id="ex-body"><p class="hint"><span class="spin" aria-hidden="true"></span> Sekundenwerte werden geladen …</p></div></div>`;
    $("ex-close").onclick = EX.close;
    ov.onclick = (e) => { if (e.target === ov) EX.close(); };
    if (window.RPE) RPE.karte($("ex-rpe"), a, !!(opt && opt.rpe));
    try { ST.S = await laden(a); }
    catch (e) { $("ex-body").innerHTML = `<p class="verdict ${e.art === "fehlt" ? "unsure" : "warn"}">${esc(e.message)}</p>${planHtml(a)}`; return; }
    if (ST.a !== a) return;
    ST.sel = [0, ST.S.n - 1];
    aufbauen();
  };
  EX.close = function () { const ov = $("ex"); if (ov) { ov.hidden = true; ov.innerHTML = ""; } document.body.classList.remove("ex-offen"); };
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-ex]"); if (b) { e.preventDefault(); EX.open(b.dataset.ex, { rpe: b.dataset.exRpe === "1" }); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("ex") && !$("ex").hidden) EX.close(); });

  /* ---------------- Aufbau ---------------- */
  const SCHRITT = (sport) => sport === "lauf" || sport === "wandern";   // FIT-Kadenz zu Fuss = Doppelschritte/min → ×2 = Schritte/min
  const KANAELE = (S, sport) => [
    S.w && S.w.some(isNum) ? { k: "w", label: "Leistung", unit: "W", col: "#7a68d8", get: (i) => S.w[i] } : null,
    S.hr && S.hr.some(isNum) ? { k: "hr", label: "Puls", unit: "bpm", col: "#d9694a", get: (i) => S.hr[i] } : null,
    S.v && S.v.some(isNum) ? (sport === "lauf" ? { k: "pace", label: "Pace", unit: "min/km", col: "#148a7e", inv: true, get: (i) => (isNum(S.v[i]) && S.v[i] > 1.2 ? 1000 / S.v[i] : null), fmt: pace }
      : { k: "v", label: "Tempo", unit: "km/h", col: "#148a7e", get: (i) => (isNum(S.v[i]) ? S.v[i] * 3.6 : null) }) : null,
    S.cad && S.cad.some((x) => x > 0) ? { k: "cad", label: "Kadenz", unit: SCHRITT(sport) ? "spm" : "rpm", col: "#8a9a2b", get: (i) => (S.cad[i] > 0 ? (SCHRITT(sport) ? S.cad[i] * 2 : S.cad[i]) : null) } : null,
    S.alt && S.alt.some(isNum) ? { k: "alt", label: "Höhe", unit: "m", col: "#5b6b7a", fill: true, get: (i) => S.alt[i] } : null,
  ].filter(Boolean);
  function aufbauen() {
    const S = ST.S, a = ST.a;
    ST.kan = KANAELE(S, a.sport);
    ST.ints = AN.mitKorrektur(S, AN.intervalle(S), korrektur(a.id));
    $("ex-body").innerHTML = `<div class="ex-selbox"><div id="ex-sel"></div>
        <div class="row ex-acts"><button class="btn" id="ex-all">Ganze Einheit</button><button class="btn" id="ex-a">Als Block A merken</button><button class="btn" id="ex-cmp-b" ${ST.A ? "" : "disabled"}>Mit A vergleichen</button>
        <button class="btn" id="ex-int-add">Als Intervall</button><button class="btn" id="ex-la">Laktat hier</button></div><div id="ex-cmp"></div></div>
      <p class="hint ex-tip">Waagrecht über die Grafik ziehen markiert einen Abschnitt; tippen zeigt die Werte an dieser Stelle.</p>
      <div class="ex-read" id="ex-read" aria-live="polite"></div>
      <div class="ex-charts" id="ex-charts">${ST.kan.map((k) => `<div class="ex-ch"><span class="ex-lab">${k.label} <small>${k.unit}</small></span><canvas data-k="${k.k}" aria-label="${k.label} über die Zeit"></canvas></div>`).join("")}<div class="ex-x" id="ex-x"></div></div>
      <div id="ex-plan">${planHtml(a)}</div>
      <h3 class="mini-h">Intervalle und Pausen <small id="ex-int-q"></small></h3><div id="ex-int"></div>
      <div id="ex-lak"></div>
      <details class="layer"><summary>Daten &amp; Methode</summary><div class="hint">${methode(S)}</div></details>`;
    $("ex-all").onclick = () => { ST.sel = [0, S.n - 1]; zeichne(); sel(); };
    $("ex-a").onclick = () => { ST.A = { act: a, von: S.t[ST.sel[0]], bis: S.t[ST.sel[1]], s: AN.stats(S, ST.sel[0], ST.sel[1]) }; sel(); $("ex-cmp-b").disabled = false; };
    $("ex-cmp-b").onclick = () => vergleich();
    $("ex-int-add").onclick = () => intervallAus();
    $("ex-la").onclick = () => laktatDialog();
    bindCharts();
    zeichne(); sel(); intervalle(); laktat();
  }
  function methode(S) {
    return `Sekundenwerte aus der FIT-Datei, je ${S.dt} s gemittelt (serie-1.0). NP: 30-s-Mittel, 4. Potenz, Wurzel (Lücken unterbrechen). Drift (Pw:HR bzw. Tempo:Puls):
      Verhältnis Leistung/Puls in der 1. gegenüber der 2. Hälfte des Abschnitts, in % (positiv = Puls stieg bei gleicher Leistung). Puls Anfang/Ende: erste und letzte 30 s.
      Höhenmeter mit 2-m-Hysterese. Intervalle (intervalle-1.0): Runden mit Workout-Schritt, sonst 30-s-Mittel > 115 % des Medians, ≥ 60 s; von Hand korrigierbar.
      Fehlende Werte bleiben Lücken, nie 0. Regeln: ${Object.values(AN.VERSIONS).join(", ")}.`;
  }

  /* ---------------- Grafiken (Canvas, ein Raster für alle) ---------------- */
  function bindCharts() {
    const box = $("ex-charts"); let start = null, mode = null;
    const idxFromX = (x) => { const r = box.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left - PADL) / (r.width - PADL - PADR))); return AN.idxAt(ST.S, ST.S.t[0] + f * (ST.S.t[ST.S.n - 1] - ST.S.t[0])); };
    box.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY, i: idxFromX(e.clientX), id: e.pointerId }; mode = null; });
    box.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!mode && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { mode = "sel"; try { box.setPointerCapture(e.pointerId); } catch (x) {} }
      if (mode === "sel") { e.preventDefault(); const i = idxFromX(e.clientX); ST.sel = [Math.min(start.i, i), Math.max(start.i, i)]; ST.cur = i; zeichne(); sel(); }
    });
    const end = (e) => { if (start && !mode) { ST.cur = idxFromX(e.clientX); zeichne(); lesen(); } start = null; mode = null; };
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", () => { start = null; mode = null; });
    addEventListener("resize", () => { if (ST.S && $("ex-charts")) zeichne(); });
  }
  const PADL = 40, PADR = 8;
  function zeichne() {
    const S = ST.S; if (!S) return;
    const t0 = S.t[0], t1 = S.t[S.n - 1] || 1, dpr = window.devicePixelRatio || 1;
    for (const cv of document.querySelectorAll("#ex-charts canvas")) {
      const K = ST.kan.find((k) => k.k === cv.dataset.k), w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const X = (t) => PADL + (t - t0) / (t1 - t0) * (w - PADL - PADR);
      // Wertebereich robust (1.–99. Perzentil), Pace umgekehrt (schneller oben)
      const vals = []; for (let i = 0; i < S.n; i += Math.max(1, Math.floor(S.n / 2000))) { const v = K.get(i); if (isNum(v)) vals.push(v); }
      vals.sort((p, q) => p - q);
      if (!vals.length) continue;
      let lo = vals[Math.floor(vals.length * 0.01)], hi = vals[Math.ceil(vals.length * 0.99) - 1];
      if (K.k === "w") lo = 0; if (hi - lo < 1) hi = lo + 1;
      const pad = (hi - lo) * 0.08; lo -= K.k === "w" ? 0 : pad; hi += pad;
      const Y = (v) => { const f = (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo); return 4 + (K.inv ? f : 1 - f) * (h - 8); };
      // Auswahl, Intervalle, Plan-Zielbereich
      if (ST.ints && K.k === ST.kan[0].k) { g.fillStyle = "rgba(122,104,216,.07)"; for (const x of ST.ints.liste) g.fillRect(X(S.t[x.i0]), 0, X(S.t[x.i1]) - X(S.t[x.i0]), h); }
      if (K.k === "w" && S.wkt && S.laps) zielband(g, S, X, Y);
      if (ST.sel && (ST.sel[0] > 0 || ST.sel[1] < S.n - 1)) { g.fillStyle = "rgba(20,138,126,.14)"; g.fillRect(X(S.t[ST.sel[0]]), 0, X(S.t[ST.sel[1]]) - X(S.t[ST.sel[0]]), h); }
      // Achse
      g.strokeStyle = "rgba(31,51,71,.12)"; g.lineWidth = 1; g.fillStyle = "#6b7785"; g.font = "10px system-ui, sans-serif"; g.textAlign = "right";
      for (const v of [lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.85]) { const y = Y(v); g.beginPath(); g.moveTo(PADL, y); g.lineTo(w - PADR, y); g.stroke(); g.fillText(K.fmt ? K.fmt(v) : f0(v), PADL - 4, y + 3); }
      // Linie: je Pixelspalte Min/Max (keine Werte erfunden, Lücken unterbrechen)
      g.strokeStyle = K.col; g.lineWidth = 1.2; g.beginPath();
      let pen = false, col = -1, mn = null, mx = null, prevT = null;
      const flush = () => { if (mn == null) return; const x = PADL + col; if (!pen) { g.moveTo(x, Y(mn)); pen = true; } else g.lineTo(x, Y(mn)); if (mx !== mn) g.lineTo(x, Y(mx)); };
      for (let i = 0; i < S.n; i++) {
        const v = K.get(i), c = Math.round(X(S.t[i]) - PADL);
        if (prevT != null && S.t[i] - prevT > 30) { flush(); mn = mx = null; pen = false; }
        prevT = S.t[i];
        if (!isNum(v)) { flush(); mn = mx = null; pen = false; col = c; continue; }
        if (c !== col) { flush(); col = c; mn = mx = v; } else { if (v < mn) mn = v; if (v > mx) mx = v; }
      }
      flush(); g.stroke();
      if (K.fill) { g.lineTo(w - PADR, h); g.lineTo(PADL, h); g.closePath(); g.fillStyle = "rgba(91,107,122,.10)"; g.fill(); }
      for (const p of laktatPunkte()) { const x = X(p.t); g.fillStyle = "#d9694a"; g.beginPath(); g.moveTo(x, 2); g.lineTo(x - 4, 9); g.lineTo(x + 4, 9); g.fill(); if (K.k === ST.kan[0].k) { g.textAlign = "left"; g.fillText(`${f1(p.la)} mmol/l`, x + 5, 10); } }
      if (ST.cur != null) { g.strokeStyle = "rgba(31,51,71,.55)"; g.beginPath(); g.moveTo(X(S.t[ST.cur]), 0); g.lineTo(X(S.t[ST.cur]), h); g.stroke(); }
    }
    const xa = $("ex-x"); if (xa) { const n = 5; xa.innerHTML = Array.from({ length: n + 1 }, (_, i) => `<span>${hms(i * (t1 - t0) / n)}</span>`).join(""); }
  }
  function zielband(g, S, X, Y) {
    const steps = new Map((S.wkt.steps || []).map((s) => [s.i, s]));
    g.fillStyle = "rgba(29,143,94,.13)";
    for (const L of S.laps) { const st = steps.get(L[3]); if (!st || st.einheit !== "W" || !isNum(st.lo) || !isNum(st.hi)) continue; const y1 = Y(st.hi), y0 = Y(st.lo); g.fillRect(X(L[0]), y1, X(L[1]) - X(L[0]), y0 - y1); }
  }
  function lesen() {
    const S = ST.S, i = ST.cur; if (i == null) return;
    $("ex-read").innerHTML = `<b>${hms(S.t[i])}</b> ${ST.kan.map((k) => { const v = k.get(i); return `${k.label} <b>${k.fmt ? k.fmt(v) : f0(v)}</b> ${k.unit}`; }).join(" · ")}`;
  }

  /* ---------------- Auswahl und Kennzahlen ---------------- */
  function zeilen(s, sport) {
    const r = [["Dauer", hms(s.dauer)], ["Strecke", isNum(s.strecke) ? `${f1(s.strecke / 1000)} km` : null]];
    if (isNum(s.w)) r.push(["Ø Leistung", `${f0(s.w)} W`], ["NP", `${f0(s.np)} W`], ["Max", `${f0(s.wmax)} W`]);
    if (isNum(s.hr)) r.push(["Ø Puls", `${f0(s.hr)} bpm`], ["Puls Anfang → Ende", `${f0(s.hrA)} → ${f0(s.hrE)} bpm`], ["Max Puls", `${f0(s.hrmax)} bpm`]);
    if (isNum(s.drift)) r.push(["Drift", `${f1(s.drift)} %`]); else if (s.driftGrund) r.push(["Drift", `<small>${s.driftGrund}</small>`]);
    if (isNum(s.wproschlag)) r.push(["W pro Schlag", (Math.round(s.wproschlag * 100) / 100).toFixed(2)]);
    if (isNum(s.v)) r.push(sport === "lauf" ? ["Ø Pace", `${pace(s.pace)} /km`] : ["Ø Tempo", `${f1(s.v * 3.6)} km/h`]);
    if (sport === "lauf" && isNum(s.mproschlag)) r.push(["m pro Schlag", (Math.round(s.mproschlag * 100) / 100).toFixed(2)]);
    if (isNum(s.cad)) r.push(["Ø Kadenz", `${f0(SCHRITT(sport) ? s.cad * 2 : s.cad)} ${SCHRITT(sport) ? "spm" : "rpm"}`]);
    if (isNum(s.hm_auf)) r.push(["Höhenmeter", `↑ ${f0(s.hm_auf)} · ↓ ${f0(s.hm_ab)} m`]);
    return r.filter((x) => x[1] != null);
  }
  function sel() {
    const S = ST.S, s = AN.stats(S, ST.sel[0], ST.sel[1]); ST.selStats = s;
    const ganz = ST.sel[0] === 0 && ST.sel[1] === S.n - 1;
    $("ex-sel").innerHTML = `<div class="ex-selhead"><b>${ganz ? "Ganze Einheit" : `Auswahl ${hms(S.t[ST.sel[0]])}–${hms(S.t[ST.sel[1]] + S.dt)}`}</b>${ST.A ? `<span class="hint">Block A: ${esc(ST.A.act.name)} ${hms(ST.A.von)}–${hms(ST.A.bis)}</span>` : ""}</div>
      <dl class="ex-kv">${zeilen(s, ST.a.sport).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  }
  function vergleich() {
    const A = ST.A, B = ST.selStats; if (!A || !B) return;
    const sp = ST.a.sport, ra = new Map(zeilen(A.s, A.act.sport)), rb = new Map(zeilen(B, sp)), d = AN.vergleich(A.s, B);
    const keys = [...new Set([...ra.keys(), ...rb.keys()])];
    const dtxt = { "Ø Leistung": d.w, "NP": d.np, "Ø Puls": d.hr, "Drift": d.drift, "W pro Schlag": d.wproschlag };
    $("ex-cmp").innerHTML = `<div class="tablewrap"><table class="t ex-cmpt"><tr><th>Kennzahl</th><th>A</th><th>B (Auswahl)</th><th>B − A</th></tr>${keys.map((k) => `<tr><td>${k}</td><td>${ra.get(k) || "–"}</td><td>${rb.get(k) || "–"}</td><td>${isNum(dtxt[k]) ? (dtxt[k] > 0 ? "+" : "") + (k === "W pro Schlag" ? dtxt[k].toFixed(2) : f1(dtxt[k])) : ""}</td></tr>`).join("")}</table></div>
      <p class="hint">A: ${esc(A.act.name)} (${C().dateCH(A.act.date)}), ${hms(A.von)}–${hms(A.bis)}. Vergleichbar nur bei ähnlicher Belastung, Gelände, Temperatur und gleichem Leistungsmesser.</p>`;
  }

  /* ---------------- Intervalle (mit Korrektur) ---------------- */
  const korrektur = (id) => { const L = (UI() && UI().Inbox.data && UI().Inbox.data.intervalle) || []; return L.find((x) => x.id === id) || ((C().D.intervall_korr || []).find((x) => x.id === id)); };
  async function speichereKorr(zeiten) { await UI().Inbox.upsert("intervalle", { id: ST.a.id, zeiten, v: AN.VERSIONS.intervalle, geaendert: new Date().toISOString() }); }
  function intervalle() {
    const S = ST.S, I = ST.ints;
    $("ex-int-q").textContent = I.quelle;
    $("ex-int").innerHTML = I.liste.length ? `<div class="tablewrap"><table class="t ex-it"><tr><th>#</th><th>Zeit</th><th>Dauer</th><th>${S.w ? "Ø W" : "Pace"}</th><th>Ø Puls</th><th></th></tr>${I.liste.map((x, k) => { const s = AN.stats(S, x.i0, x.i1);
        return `<tr><td><button class="btn ex-sel-i" data-k="${k}">${k + 1}</button></td><td>${hms(S.t[x.i0])}</td><td>${hms(s.dauer)}</td><td>${S.w ? f0(s.w) : pace(s.pace)}</td><td>${f0(s.hr)}</td><td><button class="btn" data-rm="${k}" aria-label="Intervall ${k + 1} entfernen">×</button></td></tr>`; }).join("")}</table></div>`
      : `<p class="hint">Keine Intervalle erkannt. Abschnitt markieren und «Als Intervall» tippen.</p>`;
    const P = AN.pausen(S);
    $("ex-int").insertAdjacentHTML("beforeend", `<p class="hint">${P.length ? `Pausen: ${P.slice(0, 8).map((p) => `${hms(p.von)} (${hms(p.bis - p.von)}, ${p.art})`).join(" · ")}${P.length > 8 ? " …" : ""}` : "Keine Pausen ≥ 30 s."}${I.quelle === "von Hand korrigiert" ? ' <button class="btn" id="ex-int-auto">Automatisch neu</button>' : ""}</p>`);
    $("ex-int").querySelectorAll(".ex-sel-i").forEach((b) => (b.onclick = () => { const x = I.liste[+b.dataset.k]; ST.sel = [x.i0, x.i1]; zeichne(); sel(); $("ex-sel").scrollIntoView({ block: "nearest" }); }));
    $("ex-int").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => { const L = I.liste.filter((_, k) => k !== +b.dataset.rm); await speichereKorr(L.map((x) => [S.t[x.i0], S.t[x.i1], x.typ])); ST.ints = AN.mitKorrektur(S, AN.intervalle(S), korrektur(ST.a.id)); zeichne(); intervalle(); }));
    const au = $("ex-int-auto"); if (au) au.onclick = async () => { const L = UI().Inbox.data.intervalle || []; UI().Inbox.data.intervalle = L.filter((x) => x.id !== ST.a.id); await UI().Inbox.save(); ST.ints = AN.intervalle(S); zeichne(); intervalle(); };
  }
  async function intervallAus() {
    const S = ST.S; if (ST.sel[1] - ST.sel[0] < 5) return;
    const L = ST.ints.liste.map((x) => [S.t[x.i0], S.t[x.i1], x.typ]).concat([[S.t[ST.sel[0]], S.t[ST.sel[1]], "Intervall"]]).sort((p, q) => p[0] - q[0]);
    await speichereKorr(L); ST.ints = AN.mitKorrektur(S, AN.intervalle(S), korrektur(ST.a.id)); zeichne(); intervalle();
  }

  /* ---------------- Laktat einem Abschnitt zuordnen ---------------- */
  function laktatPunkte() {
    const id = ST.a && ST.a.id; if (!id) return [];
    const lok = ((UI() && UI().Inbox.data && UI().Inbox.data.laktat_punkte) || []).filter((p) => p.act === id);
    const srv = (C().D.laktat_punkte || []).filter((p) => p.act === id);
    const m = new Map(srv.concat(lok).map((p) => [p.id, p])); return [...m.values()];
  }
  function laktatDialog() {
    const S = ST.S, ts = ST.cur != null ? S.t[ST.cur] : S.t[ST.sel[1]];
    $("ex-lak").innerHTML = `<form class="css-form ex-lf" id="ex-lf"><h3 class="mini-h">Laktat bei ${hms(ts)}</h3><div class="css-grid">
      <label>Laktat (mmol/l)<input name="la" inputmode="decimal" placeholder="1.8" required></label><label>Zeit (min:s)<input name="t" value="${hms(ts)}"></label>
      <label class="span2">Notiz<input name="n" placeholder="z. B. Ohrläppchen, Lactate Scout"></label></div>
      <div class="row"><button class="btn primary" type="submit">Zuordnen</button><button class="btn" type="button" id="ex-lf-x">Abbrechen</button></div></form>`;
    $("ex-lf-x").onclick = () => laktat();
    $("ex-lf").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, la = parseFloat(String(f.la.value).replace(",", "."));
      const p = String(f.t.value).split(":").map(Number), t = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : ts;
      if (!isNum(la) || la <= 0 || la > 25) { f.la.focus(); return; }
      const ab = AN.laktatAbschnitt(S, t, ST.ints.liste), st = AN.stats(S, ab.i0, ab.i1);
      await UI().Inbox.upsert("laktat_punkte", { id: `lp-${ST.a.id}-${Math.round(t)}`, act: ST.a.id, datum: ST.a.date, sport: ST.a.sport, t: Math.round(t), la,
        abschnitt: { von: S.t[ab.i0], bis: S.t[ab.i1] + S.dt, grund: ab.grund, w: st.w != null ? Math.round(st.w) : null, np: st.np != null ? Math.round(st.np) : null,
          hr: st.hr != null ? Math.round(st.hr) : null, pace: st.pace != null ? Math.round(st.pace) : null }, notiz: f.n.value.trim() || null, status: "vorschau", quelle: "von Hand im Explorer" });
      zeichne(); laktat();
    };
  }
  function laktat() {
    const P = laktatPunkte();
    const best = new Set((UI() && UI().Inbox.data && UI().Inbox.data.laktat_punkte_bestaetigt) || []);       // V5.9.3 (3c)
    $("ex-lak").innerHTML = P.length ? `<h3 class="mini-h">Laktat in dieser Einheit</h3><div class="tablewrap"><table class="t"><tr><th>Zeit</th><th>mmol/l</th><th>Abschnitt</th><th>${ST.a.sport === "lauf" ? "Pace" : "Ø W"}</th><th>Ø Puls</th><th>Status</th></tr>${P.sort((a, b) => a.t - b.t).map((p) =>
      `<tr><td>${hms(p.t)}</td><td>${f1(p.la)}</td><td>${hms(p.abschnitt.von)}–${hms(p.abschnitt.bis)}</td><td>${ST.a.sport === "lauf" ? pace(p.abschnitt.pace) : f0(p.abschnitt.w)}</td><td>${f0(p.abschnitt.hr)}</td><td>${best.has(p.id) ? UI().badge("bestätigt", "kommt mit dem nächsten Update") : (p.status || "vorschau") === "vorschau" && window.V59 && !C().IS_DEMO ? `${UI().badge("vorschau")} <button class="btn" type="button" data-lpb="${esc(p.id)}">Bestätigen</button>` : UI().badge(p.status || "vorschau")}</td></tr>`).join("")}</table></div>
      <p class="hint">Zuordnung: ${esc(P[0].abschnitt.grund)}. Bleibt Vorschau: zählt weder für Schwellen noch für «Meine Entwicklung», bis du den Wert bestätigst (dann übernimmt ihn das nächste Update als Kurzcheck).</p>` : "";
    $("ex-lak").querySelectorAll("[data-lpb]").forEach((b) => (b.onclick = () => { const p = P.find((x) => x.id === b.dataset.lpb); if (p) window.V59.punktBestaetigen(p, laktat); }));
  }

  /* ---------------- Geplant gegenüber Ist (plan-1.0) ---------------- */
  function planHtml(a) {
    const W = a.wk; if (!W) return "";
    const c = C(), fr = (r) => r.einheit === "W" ? `${f0(r.lo)}–${f0(r.hi)} W` : r.einheit === "m/s" ? `${pace(1000 / r.hi)}–${pace(1000 / r.lo)} /km` : r.einheit === "bpm" ? `${f0(r.lo)}–${f0(r.hi)} bpm` : esc(r.einheit || "offen");
    const ist = (r) => (r.ziel === "leistung" ? `${f0(r.w)} W` : r.ziel === "tempo" ? `${pace(r.v ? 1000 / r.v : null)} /km` : r.ziel === "puls" ? `${f0(r.hr)} bpm` : isNum(r.w) ? `${f0(r.w)} W` : "–");
    const gleich = AN.gleicheEinheiten ? AN.gleicheEinheiten(c.D.activities, a) : [];
    return `<h3 class="mini-h">Geplant gegenüber absolviert: «${esc(W.name || "Workout")}»</h3>
      <p class="hint">Plan ${W.plan_s ? c.hmm(W.plan_s) + " h" : W.plan_m ? meter(W.plan_m) + " (Dauer offen)" : "Dauer offen"} · absolviert ${c.hmm(W.ist_s)} h${isNum(W.im_ziel) ? ` · ${W.im_ziel} % der Intervallzeit im Zielbereich` : ""}. Quelle: ${esc(W.quelle)}.</p>
      <div class="tablewrap"><table class="t ex-pt"><tr><th>Schritt</th><th>Plan</th><th>Ist</th><th>Ziel</th><th>Ø Ist</th><th>im Ziel</th><th>Ø Puls</th></tr>${W.schritte.map((r) =>
        `<tr><td>${esc(r.typ)}</td><td>${r.plan_s ? hms(r.plan_s) : r.plan_m ? meter(r.plan_m) : "offen"}</td><td>${hms(r.ist_s)}</td><td>${fr(r)}</td><td>${ist(r)}</td><td>${isNum(r.im_ziel) ? r.im_ziel + " %" : "–"}</td><td>${f0(r.hr)}</td></tr>`).join("")}</table></div>
      ${W.schritte.some((r) => r.bezug) ? `<p class="hint">${esc(W.schritte.find((r) => r.bezug).bezug)}.</p>` : ""}
      ${gleich.length ? `<p class="hint"><b>Gleiche Einheit früher:</b> ${gleich.slice(0, 4).map((g) => `${c.dateCH(g.date)}: ${g.text}`).join(" · ")}</p>` : ""}`;
  }
})();
