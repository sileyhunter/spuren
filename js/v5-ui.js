/* Spuren & Formkurve – Oberfläche V5: Laktat & Zonen, Bereitschaft, Eingaben auf dem Gerät.
   Rechnet nichts selbst, was in js/formkurve.js steht. Alle Eingaben bleiben verschlüsselt auf dem Gerät,
   bis sie als Datei exportiert und eingespielt werden (Claude: tools/eingaben.mjs + merge_daily.py). */
(function () {
  "use strict";
  const V = (window.V5UI = window.V5UI || {});
  let C = null;
  const $ = (id) => document.getElementById(id);
  const FK = () => window.FK;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (v, d = 0) => (v == null || !isFinite(v) ? "–" : Number(v).toLocaleString("de-CH", { minimumFractionDigits: d, maximumFractionDigits: d }));
  const isoToday = () => C.iso(C.today);
  const dch = (s) => (s ? C.dateCH(s) : "–");
  V.esc = esc; V.num = num; V.$ = $;
  const PROV = { messung: "Messung", fit: "FIT-abgeleitet", wetter: "Wettermodell", berechnet: "berechnet", plan: "Nutzerplan", abgeleitet: "abgeleitet", ungeprueft: "ungeprüft", manuell: "manuell" };
  V.prov = (k, title) => `<span class="prov prov-${k}" title="${esc(title || "Herkunft")}">${PROV[k] || k}</span>`;
  // Einheitliche Status-Pillen (V5.5): nie alarmistisch, «unbekannt» und «nicht beurteilbar» neutral
  const BADGE = { "vorläufig": "warn", "nicht bestimmbar": "muted", "bestätigt": "ok", "vorschau": "next", "bestimmbar": "ok", "entwurf": "next", "aktiv": "ok", "bereit": "ok", "normal": "info", "vorsichtig": "warn",
    "nicht beurteilbar": "muted", "unbekannt": "muted", "niedrige Qualität": "muted", "FIT-abgeleitet": "info", "verbessert": "ok", "stabil": "info", "unklar": "muted", "verschlechtert": "warn",
    "vorschlag": "next", "auswählen": "next", "getrennt": "muted", "nicht validiert": "warn", "explorativ": "muted",
    "offen": "next", "verbessern": "warn", "manueller Videovergleich": "info", "extern analysiert": "info", "nicht protokolliert": "muted" };
  V.badge = (s, extra) => `<span class="badge ${BADGE[s] || ""}">${esc(s)}${extra ? " · " + esc(extra) : ""}</span>`;
  const TEST_COLORS = ["#148a7e", "#7a68d8", "#d9694a", "#3a7bd5", "#8a9a2b"];
  const SINGLE_COLOR = "#e08a3c";

  /* ======================= Eingaben auf dem Gerät (verschlüsselt) ======================= */
  const Inbox = (V.Inbox = {
    data: null, vault: null, persistent: false,
    key() { return (C && C.IS_DEMO ? "demo." : "") + "sf.v5.eingaben"; },
    empty() { return { v: 1, fueling: [], befinden: [], test_entwuerfe: [], koppel: [], langfahrt: [], laktat_bestaetigt: [], archiv: [], coach: [], fueling_produkte: null, notizen: {},
      pb: [], css: [], fehler: [] }; },
    async ensureVault() {
      if (this.vault) return this.vault;
      if (window.SPUREN_VAULT) { this.vault = window.SPUREN_VAULT; this.persistent = true; return this.vault; }
      let raw = null;                                    // ohne Passwort (Testaufbau): Schlüssel nur für diese Sitzung
      try { const s = sessionStorage.getItem("sf.v5.tmpkey"); if (s) raw = Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); } catch (e) {}
      if (!raw) { raw = crypto.getRandomValues(new Uint8Array(32)); try { sessionStorage.setItem("sf.v5.tmpkey", btoa(String.fromCharCode(...raw))); } catch (e) {} }
      this.vault = await V.makeVault(raw);
      return this.vault;
    },
    async load() {
      this.data = this.empty();
      try {
        await this.ensureVault();
        const s = localStorage.getItem(this.key());
        if (s) this.data = Object.assign(this.empty(), await this.vault.open(s));
      } catch (e) { this.loadError = "Gespeicherte Eingaben konnten nicht geöffnet werden (anderes Passwort?)."; }
      this.dropSynced();
    },
    async save() {
      try { await this.ensureVault(); localStorage.setItem(this.key(), await this.vault.seal(this.data)); this.savedAt = new Date(); this.saveError = null; }
      catch (e) { this.saveError = "Nicht gespeichert: Speicher auf diesem Gerät nicht verfügbar."; }
      V.syncBar();
    },
    /** Eingaben, die schon in den Daten stehen (gleiche ID, gleicher Inhalt), werden lokal entfernt. */
    dropSynced() {
      const D = C.D, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const srv = (k, idf) => new Map((D[k] || []).map((e) => [idf(e), e]));
      const pairs = [["fueling", "fueling", (e) => e.id], ["befinden", "befinden", (e) => e.date], ["test_entwuerfe", "test_entwuerfe", (e) => e.id], ["langfahrt", "langfahrt_plaene", (e) => e.id], ["koppel", "koppel", (e) => e.bike + "|" + e.run],
        ["pb", "pb_offiziell", (e) => e.id], ["css", "css_tests", (e) => e.id], ["fehler", "fehlerboard", (e) => e.id]];
      for (const [loc, key, idf] of pairs) { const m = srv(key, idf); this.data[loc] = (this.data[loc] || []).filter((e) => !(m.has(idf(e)) && same(m.get(idf(e)), stripLocal(e)))); }
      const conf = new Set((D.lactate || []).map((l) => l.id));
      this.data.laktat_bestaetigt = (this.data.laktat_bestaetigt || []).filter((id) => !conf.has(id));
    },
    upsert(list, item, idf) { idf = idf || ((e) => e.id); const L = this.data[list]; const i = L.findIndex((e) => idf(e) === idf(item)); if (i >= 0) L[i] = item; else L.push(item); return this.save(); },
    remove(list, id, idf) { idf = idf || ((e) => e.id); this.data[list] = this.data[list].filter((e) => idf(e) !== id); return this.save(); },
    count() { const d = this.data || {}; return ["fueling", "befinden", "test_entwuerfe", "koppel", "langfahrt", "coach", "pb", "css", "fehler"].reduce((s, k) => s + (d[k] || []).length, 0) + (d.laktat_bestaetigt || []).length + (d.fueling_produkte ? 1 : 0); },
    async exportFile() {
      await this.ensureVault();
      const out = { format: "spuren-eingaben-1", erstellt: new Date().toISOString(), demo: !!C.IS_DEMO, salt: this.vault.salt || null, iter: this.vault.iter || null,
        verschluesselt: await this.vault.seal(this.data), hinweis: "Mit dem Seitenpasswort verschlüsselt. Im Chat schicken; eingespielt wird mit tools/eingaben.mjs." };
      const name = `spuren-eingaben-${isoToday()}-${String(new Date().getHours()).padStart(2, "0")}${String(new Date().getMinutes()).padStart(2, "0")}.json`;
      await C.shareOrDownload(name, JSON.stringify(out));
    },
    async importFile(file) {
      const j = JSON.parse(await file.text());
      if (j.format !== "spuren-eingaben-1") throw new Error("keine Eingaben-Datei");
      const d = await this.vault.open(j.verschluesselt);
      for (const k of ["fueling", "befinden", "test_entwuerfe", "koppel", "langfahrt", "coach", "pb", "css", "fehler"]) for (const e of d[k] || []) { const L = (this.data[k] = this.data[k] || []); const idf = k === "befinden" ? (x) => x.date : k === "koppel" ? (x) => x.bike + "|" + x.run : (x) => x.id; if (!L.some((x) => idf(x) === idf(e))) L.push(e); }
      for (const id of d.laktat_bestaetigt || []) if (!this.data.laktat_bestaetigt.includes(id)) this.data.laktat_bestaetigt.push(id);
      if (d.fueling_produkte && !this.data.fueling_produkte) this.data.fueling_produkte = d.fueling_produkte;
      await this.save();
    },
  });
  const stripLocal = (e) => { const c = Object.assign({}, e); delete c._lokal; return c; };
  V.makeVault = async function (raw) {
    const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
    const b64e = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    return {
      async seal(obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(obj)))); return b64e(iv) + "." + b64e(ct); },
      async open(s) { const [a, b] = String(s).split("."); const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(a) }, k, b64d(b)); return JSON.parse(new TextDecoder().decode(pt)); },
    };
  };
  /** Daten + lokale Eingaben zusammen (lokale gewinnen bei gleicher ID, tragen aber das Kennzeichen _lokal). */
  V.merged = function (srvKey, locKey, idf) {
    idf = idf || ((e) => e.id);
    const m = new Map((C.D[srvKey] || []).map((e) => [idf(e), e]));
    for (const e of (Inbox.data && Inbox.data[locKey]) || []) m.set(idf(e), Object.assign({}, e, { _lokal: true }));
    return [...m.values()];
  };
  V.syncBar = function () {
    const n = Inbox.data ? Inbox.count() : 0;
    for (const el of document.querySelectorAll("[data-v5-sync]")) {
      el.innerHTML = `<div class="syncbar${n ? " pending" : ""}" role="status">
        <span>${n ? `<b>${n}</b> Eingabe${n === 1 ? "" : "n"} nur auf diesem Gerät, verschlüsselt${Inbox.persistent ? "" : " (nur für diese Sitzung)"}.` : "Keine offenen Eingaben auf diesem Gerät."}
        ${Inbox.savedAt ? ` Gespeichert ${Inbox.savedAt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}.` : ""}${Inbox.saveError ? ` <b class="down">${esc(Inbox.saveError)}</b>` : ""}${Inbox.loadError ? ` <b class="down">${esc(Inbox.loadError)}</b>` : ""}</span>
        <span class="row">${n ? `<button class="btn primary" data-act="export">Exportieren</button>` : ""}<label class="btn">Sicherung laden<input type="file" accept="application/json,.json" data-act="import" hidden></label></span>
        <span class="hint">Exportierte Datei im Chat schicken: ich spiele sie ein. Ohne Netz bleibt alles hier gespeichert.</span></div>`;
      el.querySelector('[data-act="export"]')?.addEventListener("click", () => Inbox.exportFile());
      el.querySelector('[data-act="import"]')?.addEventListener("change", async (e) => { try { await Inbox.importFile(e.target.files[0]); V.refreshAll(); } catch (err) { alertBox(el, "Datei nicht lesbar: " + err.message); } });
    }
  };
  function alertBox(el, msg) { const p = document.createElement("p"); p.className = "hint down"; p.textContent = msg; el.appendChild(p); setTimeout(() => p.remove(), 6000); }
  V.refreshAll = function () { for (const f of V._refreshers || []) { try { f(); } catch (e) { console.error(e); } } V.syncBar(); };
  V.onRefresh = (f) => (V._refreshers = (V._refreshers || []).concat(f));

  V.init = async function (ctx) {
    C = V.C = ctx;
    await Inbox.load();
    V.syncBar();
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
    document.addEventListener("click", (e) => { if (pop && !pop.contains(e.target) && !e.target.closest(".ltm,.ltna")) closePop(); });
  };

  /* ======================= Laktat & Zonen ======================= */
  const LZ = { sport: "rad", sel: null, mode: "aktuell", shown: null, m1: "basis05", m2: "dickhuth" };
  const protName = (p) => ({ "rad-stufen-120-20-5": "Zwift 5 min +20 W", "labor-3min-40": "Labor 3 min +40 W", "lauf-stufen": "Lauf draussen", "rad-check-220-10": "Kurzcheck" }[p] || p);
  const unitOf = (sport) => (sport === "lauf" ? "km/h" : "W");
  const xMeas = (t, p) => (/^labor/.test(t.protokoll) ? p.x : (p.x_fit ?? p.x));
  function stageMeta(t, nr) {
    const st = (C.D.stufen || []).find((s) => s.id === t.aktivitaet);
    const p = t.punkte.find((x) => x.nr === nr);
    if (!st || !p || p.fit_nr == null) return null;
    return (st.stufen || []).find((s) => s.nr === p.fit_nr) || null;
  }
  V.laktat = function () {
    const D = C.D, L = FK().lactateData(D);
    LZ.L = L;
    const pv = (D.laktat_vorschau || []).filter((p) => p.status === "vorschau").length;
    const tests = L.tests.filter((t) => t.sport === LZ.sport);
    if (!LZ.shown || !LZ.shown.some((id) => tests.find((t) => t.id === id))) {
      const last = tests.filter((t) => !/^labor/.test(t.protokoll)).slice(-2).map((t) => t.id);
      LZ.shown = last.length ? last : tests.slice(-1).map((t) => t.id);
    }
    $("lz-head").innerHTML = `<div class="card-head"><div><h2>Laktat &amp; Trainingszonen</h2>
        <div class="sub">Tests vergleichen · Einzelmessungen öffnen · LT1/LT2 nur aus gültigen Stufentests</div></div>
        <div class="seg" role="group" aria-label="Sportart">${["rad", "lauf"].map((s) => `<button aria-pressed="${LZ.sport === s}" data-sp="${s}">${s === "rad" ? "Rad" : "Lauf"}</button>`).join("")}</div></div>
      ${pv ? `<div class="verdict warn">${pv} Laktatdateien sind Vorschau: die Werte stammen aus deinen Tabellen und dem Chat, du hast sie noch nicht bestätigt (Schritt B1). Schwellen und Marker gelten deshalb als <b>vorläufig</b>.</div>` : ""}`;
    $("lz-head").querySelectorAll("[data-sp]").forEach((b) => b.addEventListener("click", () => { LZ.sport = b.dataset.sp; LZ.shown = null; LZ.sel = null; V.laktat(); }));
    drawMain(tests, L.singles.filter((s) => s.sport === LZ.sport));
    drawDetail();
    V.cockpit();
    drawTrend();
    drawMethods();
    V.library();
  };
  function lt(t) { return ((C.D.schwellen && C.D.schwellen.tests) || []).find((x) => x.test === t.id) || null; }
  const ltPlugin = {
    id: "ltMarks",
    afterDatasetsDraw(chart, args, o) {
      const marks = (o && o.marks) || [];
      const { ctx, chartArea: a, scales } = chart;
      ctx.save();
      for (const m of marks) {
        const x0 = scales.x.getPixelForValue(m.lo), x1 = scales.x.getPixelForValue(m.hi);
        ctx.fillStyle = m.color + "22"; ctx.fillRect(Math.min(x0, x1), a.top, Math.max(2, Math.abs(x1 - x0)), a.bottom - a.top);
        ctx.strokeStyle = m.color; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
        for (const x of [x0, x1]) { ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke(); }
        ctx.setLineDash([]); ctx.fillStyle = m.color; ctx.font = "600 11px " + C.css("--f-body");
        ctx.fillText(m.label, Math.min(x0, x1) + 4, a.top + 12);
      }
      ctx.restore();
    },
  };
  function drawMain(tests, singlesAll) {
    LZ.filter = LZ.filter || "alle";
    const shown = LZ.filter === "einzel" ? [] : tests.filter((t) => LZ.shown.includes(t.id));
    const singles = LZ.filter === "stufen" ? [] : singlesAll;
    const u = unitOf(LZ.sport);
    const filt = `<div class="seg lz-filter" role="group" aria-label="Messart">${[["alle", "Alle"], ["stufen", "Stufentests"], ["einzel", "Einzelmessungen"]].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${LZ.filter === k}">${l}</button>`).join("")}</div>`;
    $("lz-legend").innerHTML = filt + (LZ.filter === "einzel" ? "" : tests.map((t, i) => `<button class="chip" aria-pressed="${LZ.shown.includes(t.id)}" data-t="${esc(t.id)}"><span class="dot" style="background:${TEST_COLORS[i % 5]}"></span>${dch(t.datum)} · ${esc(protName(t.protokoll))}${t.datenstatus === "vorschau" ? " · Vorschau" : ""}</button>`).join("")
      ) + (singles.length ? `<span class="chip static"><span class="dia" style="background:${SINGLE_COLOR}"></span>Einzelmessungen aus dem Training (${singles.length})</span>` : "");
    $("lz-legend").querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { LZ.filter = b.dataset.f; LZ.sel = null; V.laktat(); }));
    $("lz-legend").querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { const id = b.dataset.t; LZ.shown = LZ.shown.includes(id) ? LZ.shown.filter((x) => x !== id) : LZ.shown.concat(id); V.laktat(); }));
    const prots = [...new Set(shown.map((t) => t.protokoll))];
    const ref = shown.filter((t) => t.protokoll === prots[0]).slice(-1)[0];
    const r = ref && lt(ref);
    const marks = [];
    if (r && r.lt1 && r.lt1.lo != null) marks.push({ lo: r.lt1.lo, hi: r.lt1.hi, color: C.css("--lt1"), label: `LT1 ${r.lt1.status}` });
    if (r && r.lt2 && r.lt2.lo != null) marks.push({ lo: r.lt2.lo, hi: Math.max(r.lt2.hi, r.lt2.lo + (u === "W" ? 1 : 0.05)), color: C.css("--lt2"), label: `LT2 ${r.lt2.status}` });
    $("lz-note").innerHTML = [
      prots.length > 1 ? `<b>Verschiedene Protokolle</b> (${prots.map(protName).join(", ")}): Kurven nicht direkt vergleichbar.` : "",
      r ? `Marker: ${dch(ref.datum)}. LT1 ${r.lt1.lo != null ? `${num(r.lt1.lo, u === "W" ? 0 : 1)}–${num(r.lt1.hi, u === "W" ? 0 : 1)} ${u} (${r.lt1.methoden.map(mName).join(", ")})` : "nicht bestimmbar"}; LT2 ${r.lt2.lo != null ? `${num(r.lt2.lo, u === "W" ? 0 : 1)} ${u} (${r.lt2.methoden.map(mName).join(", ")})` : "nicht bestimmbar"}${r.lt2.grund ? ` – ${esc(r.lt2.grund)}` : ""}.` : "",
      "Linien verbinden nur Stufen desselben Tests (gerade Stücke = keine gemessenen Zwischenwerte). Einzelmessungen bleiben einzelne Punkte; aus ihnen wird keine Schwelle abgeleitet.",
    ].filter(Boolean).join(" ");
    const ds = shown.map((t) => {
      const i = tests.indexOf(t), col = TEST_COLORS[i % 5];
      return { type: "line", label: `${dch(t.datum)} · ${protName(t.protokoll)}`, data: t.punkte.filter((p) => p.la != null).map((p) => ({ x: xMeas(t, p), y: p.la, _r: { k: "stufe", t: t.id, nr: p.nr } })).sort((a, b) => a.x - b.x),
        borderColor: col, backgroundColor: col, borderWidth: 1.5, pointRadius: 4, pointHoverRadius: 7, tension: 0, borderDash: t.datenstatus === "vorschau" ? [] : [] };
    });
    if (singles.length) ds.push({ type: "scatter", label: "Einzelmessungen", data: singles.map((s) => ({ x: s.x, y: s.la, _r: { k: "einzel", id: s.id } })), backgroundColor: SINGLE_COLOR, borderColor: "#fff", borderWidth: 1, pointStyle: "rectRot", pointRadius: 7, pointHoverRadius: 9, showLine: false });
    for (const dr of (Inbox.data.test_entwuerfe || []).filter((d) => d.sport === LZ.sport && (d.stufen || []).some((s) => s.la != null))) {
      ds.push({ type: "line", label: `Entwurf ${dch(dr.datum)}`, data: dr.stufen.filter((s) => s.la != null).map((s) => ({ x: (s.fit && s.fit.x_median) || s.soll, y: s.la, _r: { k: "entwurf", id: dr.id, nr: s.nr } })), borderColor: C.css("--muted"), backgroundColor: C.css("--muted"), borderDash: [5, 4], borderWidth: 1.2, pointRadius: 3, tension: 0 });
    }
    C.chart("c-lac", { type: "scatter", data: { datasets: ds }, plugins: [ltPlugin], options: {
      parsing: { xAxisKey: "x", yAxisKey: "y" }, interaction: { mode: "nearest", intersect: true },
      onClick: (e, els, ch) => { if (!els.length) return; const p = ch.data.datasets[els[0].datasetIndex].data[els[0].index]; LZ.sel = p._r; drawDetail(); },
      scales: { x: { type: "linear", title: { display: true, text: u === "W" ? "Tatsächlich gemessene Stufenleistung (W)" : "Tempo (km/h) · Pace in der Liste" }, ticks: { callback: (v) => (u === "W" ? v : `${v} (${FK().pace(3600 / v)})`) } },
        y: { min: 0, title: { display: true, text: "Blutlaktat (mmol/l)" } } },
      plugins: { ltMarks: { marks }, legend: { display: false }, tooltip: { callbacks: { label: (c) => { const p = c.raw; return `${c.dataset.label}: ${num(p.x, u === "W" ? 0 : 1)} ${u}, ${num(p.y, 1)} mmol/l`; } } } },
    } });
    // Zugängliche Liste aller Punkte (Tastatur, Screenreader)
    const rows = [];
    for (const t of shown) for (const p of t.punkte.filter((p) => p.la != null)) rows.push({ lab: `${dch(t.datum)} Stufe ${p.nr}`, x: xMeas(t, p), la: p.la, hf: p.hf, r: { k: "stufe", t: t.id, nr: p.nr } });
    for (const s of singles) rows.push({ lab: `${dch(s.datum)} Einzelmessung`, x: s.x, la: s.la, hf: s.hf, r: { k: "einzel", id: s.id } });
    $("lz-list").innerHTML = `<table class="t"><tr><th>Messpunkt</th><th>${u}</th><th>mmol/l</th><th>Puls</th><th></th></tr>${rows.map((r, i) => `<tr><td>${esc(r.lab)}</td><td>${num(r.x, u === "W" ? 0 : 2)}</td><td>${num(r.la, 1)}</td><td>${num(r.hf)}</td><td><button class="btn" data-i="${i}">öffnen</button></td></tr>`).join("")}</table>`;
    $("lz-list").querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { LZ.sel = rows[+b.dataset.i].r; drawDetail(); $("lz-detail").focus(); }));
  }
  function drawDetail() {
    const box = $("lz-detail"), u = unitOf(LZ.sport);
    const L = LZ.L;
    if (!LZ.sel) {
      const s = L.singles.filter((x) => x.sport === LZ.sport).slice(-1)[0];
      if (s) LZ.sel = { k: "einzel", id: s.id };
      else { box.innerHTML = `<h2>Ausgewählte Messung</h2><p class="hint">Tippe auf einen Punkt im Diagramm oder öffne ihn in der Liste.</p>`; return; }
    }
    const kv = (rows) => `<dl class="dl">${rows.filter((r) => r[1] != null && r[1] !== "").map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
    if (LZ.sel.k === "einzel") {
      const s = L.singles.find((x) => x.id === LZ.sel.id); if (!s) return;
      const a = C.ACT_BY_ID.get(s.aktivitaet);
      const flags = FK().qualityFlags(s);
      const geraet = a ? `${esc(a.typ || "")}${a.indoor || /zwift|rolle|indoor/i.test(a.typ || "") ? " (Rolle, Leistung vom Trainer)" : " (draussen, eigener Leistungsmesser)"}` : null;
      box.innerHTML = `<div class="eyebrow">Ausgewählte Messung · Einzelwert im Training</div><div class="hero">${num(s.la, 1)} <small>mmol/l</small></div>
        <div class="sub2">${s.dauer_s ? `nach ${C.mmss(s.dauer_s)} min ` : ""}${s.x != null ? `bei ${num(s.x)} ${u}` : ""} · ${esc(a ? a.name : "Aktivität")} · ${dch(s.datum)}</div>${V.badge(s.status)} ${V.prov("messung", "Laktat: eigene Messung")}
        <p class="hint">Kein Stufentest und kein standardisierter Test (z. B. 20 min): vergleichbar nur mit Messungen gleicher Blockdauer, Leistung und Abnahme.</p>
        ${kv([["Art", "Einzelmessung im Training"], ["Sportart", s.sport === "lauf" ? "Laufen" : "Rad"], ["Gerät", geraet], ["Ziel", s.soll != null ? `${num(s.soll)} ${u}` : null], ["Ist (Median im Block)", s.x != null ? `${num(s.x)} ${u} ${V.prov("fit")}` : null],
          ["NP im Block", s.np != null ? `${num(s.np)} W` : null], ["Puls Ø / max", s.hf != null ? `${num(s.hf)} / ${num(s.hf_max)} bpm` : null], ["Puls letzte 30 s", s.hf30 != null ? `${num(s.hf30)} bpm` : null],
          ["Block", s.fenster ? `${s.fenster[0].slice(0, 5)}–${s.fenster[1].slice(0, 5)}` : s.ende ? `endet ${s.ende}` : null], ["Dauer", s.dauer_s ? C.mmss(s.dauer_s) + " min" : null],
          ["Vorbelastung (Arbeit vor dem Block)", s.kj_vor != null ? `${num(s.kj_vor)} kJ` : null], ["Abnahme", esc((s.regel && /Blut|Ende/i.test(s.regel) ? s.regel : (s.hinweise || []).find((h) => /Blut|Ende/i.test(h))) || "Zeitpunkt nicht erfasst")],
          ["Ruhezeit vor der Abnahme", "nicht erfasst"], ["Zuordnung", esc(s.zuordnung || "offen")], ["Quelle", esc(s.quelle)]])}
        ${flags.length ? `<ul class="flags">${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
        ${(s.hinweise || []).length ? `<p class="hint">${s.hinweise.map(esc).join(" · ")}</p>` : ""}
        <p class="hint">Einzelwerte zeigen den Verlauf bei fixer Leistung; LT1/LT2 entstehen nur aus Stufentests.</p>`;
      return;
    }
    if (LZ.sel.k === "entwurf") {
      const d = (Inbox.data.test_entwuerfe || []).find((x) => x.id === LZ.sel.id); if (!d) return;
      const s = d.stufen.find((x) => x.nr === LZ.sel.nr) || {};
      box.innerHTML = `<div class="eyebrow">Entwurf vom Handy</div><div class="hero">${num(s.la, 1)} <small>mmol/l</small></div><div class="sub2">Stufe ${s.nr} · Soll ${num(s.soll, u === "W" ? 0 : 1)} ${u}</div>${V.badge("entwurf")}
        ${kv([["Messzeit", s.zeit || null], ["Ist aus FIT", s.fit ? `${num(s.fit.x_median, u === "W" ? 0 : 1)} ${u}` : "noch keine FIT-Datei"], ["Puls Ø / max", s.fit ? `${num(s.fit.hr_mean)} / ${num(s.fit.hr_max)} bpm` : null], ["Bemerkung", esc(s.notiz || "")]])}`;
      return;
    }
    const t = L.tests.find((x) => x.id === LZ.sel.t); if (!t) return;
    const p = t.punkte.find((x) => x.nr === LZ.sel.nr) || {};
    const m = stageMeta(t, p.nr);
    const flags = [t.datenstatus === "vorschau" ? "Vorschau: noch nicht bestätigt" : null, p.hf_tab != null && p.hf != null && Math.abs(p.hf_tab - p.hf) > 3 ? `Puls Tabelle ${p.hf_tab}, FIT ${num(p.hf, 1)} bpm` : null,
      p.x_fit != null && Math.abs(p.x_fit - p.x) > 5 ? `Ist weicht ${num(p.x_fit - p.x)} ${u} vom Soll ab` : null, m && m.entnahme ? `Blutentnahme: ${m.entnahme.art} (${m.entnahme.vor_ende_s} s vor Ende)` : null].filter(Boolean);
    box.innerHTML = `<div class="eyebrow">Ausgewählte Messung · Stufe ${p.nr}</div><div class="hero">${num(p.la, 1)} <small>mmol/l</small></div>
      <div class="sub2">${esc(protName(t.protokoll))} · ${dch(t.datum)}</div>${V.badge(t.datenstatus)} ${V.prov("messung", "Laktat: Tabelle/Bericht")} ${p.x_fit != null ? V.prov("fit", "Leistung und Puls aus der FIT-Datei") : ""}
      ${kv([["Soll", `${num(p.x, u === "W" ? 0 : 2)} ${u}`], ["Ist (Median der Stufe)", p.x_fit != null ? `${num(p.x_fit, u === "W" ? 0 : 2)} ${u}` : "keine Sekundenwerte"],
        ["Puls", p.hf != null ? `${num(p.hf, 1)} bpm (${esc(p.hf_quelle || "")})` : null], ["Puls in der Tabelle", p.hf_tab != null ? `${p.hf_tab} bpm` : null],
        ["Puls Ø / max der Stufe", m && m.hr != null ? `${num(m.hr, 1)} / ${num(m.hr_max)} bpm` : null], ["Stufenende", m && m.uhr ? m.uhr : null], ["Dauer gewertet", m && m.win_s ? C.mmss(m.win_s) + " min" : null],
        ["Test endet", esc(t.ende || "")], ["Quelle", esc(p.quelle ? Object.entries(p.quelle).map(([k, v]) => `${k} ${v}`).join(", ") : "")]])}
      ${flags.length ? `<ul class="flags">${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}`;
  }
  const mName = (k) => (((C.D.schwellen || {}).methoden || {})[k] || {}).name || k;

  /* ----- Zonen-Cockpit: vier unabhängige Skalen ----- */
  let pop = null, popFrom = null;
  function closePop() { if (pop) { pop.remove(); pop = null; if (popFrom) popFrom.setAttribute("aria-expanded", "false"); popFrom?.focus(); popFrom = null; } }
  function openPop(btn, html) {
    closePop();
    pop = document.createElement("div"); pop.className = "pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", btn.getAttribute("aria-label")); pop.tabIndex = -1;
    pop.innerHTML = html + `<button class="btn pop-x" aria-label="Schliessen">Schliessen</button>`;
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    const w = Math.min(320, innerWidth - 24);
    pop.style.width = w + "px";
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + "px";
    pop.style.top = (r.bottom + scrollY + 8) + "px";
    pop.querySelector(".pop-x").addEventListener("click", closePop);
    btn.setAttribute("aria-expanded", "true"); popFrom = btn; pop.focus();
  }
  const fv = (s, v) => (v == null ? "–" : s.metrik === "pace" ? FK().pace(v) + " /km" : `${num(v)} ${s.unit}`);
  V.cockpit = function () {
    const box = $("zc-box"); if (!box) return;
    const ck = FK().cockpit(C.D.zonen, C.D.schwellen, isoToday());
    if (!ck) { box.innerHTML = `<p class="hint">Noch kein Zonenprofil. Zonen entstehen nie automatisch aus LT1/LT2; sie werden mit deiner Freigabe gesetzt.</p>`; return; }
    const P = ck.profil;
    $("zc-meta").innerHTML = `<b>${esc(P.name)}</b> ${V.badge(P.status)} ${V.prov("manuell", "Von Hand gesetzt")} · gültig ab ${dch(P.gueltig_ab)}${P.gueltig_bis ? " bis " + dch(P.gueltig_bis) : ""}
      <br><span class="hint">Freigabe: ${esc(P.freigabe.text)} Methodik: ${esc(P.methodik.text)}</span>`;
    $("zc-mode").querySelectorAll("button").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.m === LZ.mode)); b.onclick = () => { LZ.mode = b.dataset.m; V.cockpit(); }; });
    box.innerHTML = ck.skalen.map((k, si) => scaleHTML(k, si, P)).join("");
    box.classList.toggle("cmp", LZ.mode !== "aktuell");
    box.querySelectorAll(".ltm,.ltna").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); const k = ck.skalen[+b.dataset.s]; openPop(b, popHTML(k, b.dataset.w, b.dataset.which, P)); }));
  };
  function scaleHTML(k, si, P) {
    const s = k.skala, F = FK();
    const fr = (v) => F.scaleFrac(s, v);
    const segs = s.zonen.map((z, i) => {
      const a = fr(z.von == null ? s.umfang[0] : z.von), b = fr(z.bis == null ? s.umfang[1] : z.bis);
      return `<div class="zseg z${i + 1}" style="left:${(a * 100).toFixed(2)}%;width:${((b - a) * 100).toFixed(2)}%" title="${esc(z.z)}: ${z.von == null ? "bis" : fv(s, z.von)}${z.von != null && z.bis != null ? " – " : " "}${z.bis == null ? "und mehr" : fv(s, z.bis)}${z.text ? " · " + esc(z.text) : ""}"><span>${esc(z.z)}</span></div>`;
    }).join("");
    const ticks = [s.umfang[0], ...s.zonen.slice(1).map((z) => z.von), s.umfang[1]].map((v, i, arr) => `<span class="tick${i === 0 ? " first" : i === arr.length - 1 ? " last" : ""}" style="left:${(fr(v) * 100).toFixed(2)}%">${s.metrik === "pace" ? F.pace(v) : num(v)}${i === 0 && s.zonen[0].von == null ? "" : ""}</span>`).join("");
    const sets = [];
    if (LZ.mode !== "vorher" && k.aktuell) sets.push(["aktuell", k.aktuell]);
    if (LZ.mode !== "aktuell" && k.vorher) sets.push(["vorher", k.vorher]);
    let marks = "", na = "";
    for (const [w, set] of sets) for (const which of ["lt1", "lt2"]) {
      const m = set[which];
      if (!m) continue;
      const label = `${which.toUpperCase()} ${w === "vorher" ? "voriger Test " : ""}${m.status}${m.lo != null ? `: ${fv(s, m.lo)}${m.hi !== m.lo ? " bis " + fv(s, m.hi) : ""}` : ""}, ${s.disziplin === "rad" ? "Rad" : "Lauf"} ${s.metrik}`;
      if (m.lo == null) { na += `<button class="ltna ${which} ${w}" data-s="${si}" data-w="${w}" data-which="${which}" aria-expanded="false" aria-label="${esc(label)}">${which.toUpperCase()}${w === "vorher" ? " (vorher)" : ""}: nicht bestimmbar</button>`; continue; }
      const a = Math.min(fr(m.lo), fr(m.hi)), b = Math.max(fr(m.lo), fr(m.hi));
      marks += `<button class="ltm ${which} ${w}" data-s="${si}" data-w="${w}" data-which="${which}" aria-expanded="false" aria-label="${esc(label)}" style="left:${(a * 100).toFixed(2)}%;width:max(3px,${((b - a) * 100).toFixed(2)}%)"><span>${which.toUpperCase()}</span></button>`;
    }
    const none = !k.aktuell ? `<span class="hint">Kein Test dieser Disziplin mit diesem Protokoll: keine Schwellen.</span>` : LZ.mode !== "aktuell" && !k.vorher ? `<span class="hint">Kein vorheriger vergleichbarer Test (gleiche Sportart, gleiches Protokoll).</span>` : "";
    const name = `${s.disziplin === "rad" ? "Rad" : "Laufen"} / ${{ leistung: "Leistung", puls: "Herzfrequenz", pace: "Pace" }[s.metrik]} (${s.metrik === "pace" ? "min/km" : s.unit})`;
    return `<section class="zscale" aria-label="${esc(name)}"><div class="zhead"><h3>${esc(name)}</h3>${s.metrik === "pace" ? `<span class="hint">langsam → schnell</span>` : ""}${na}</div>
      <div class="zbar" role="group" aria-label="Zonen ${esc(name)}">${segs}${marks}</div><div class="zticks" aria-hidden="true">${ticks}</div>${none}
      ${s.hinweis ? `<p class="hint">${esc(s.hinweis)}</p>` : ""}</section>`;
  }
  function popHTML(k, w, which, P) {
    const s = k.skala, m = (w === "vorher" ? k.vorher : k.aktuell)[which];
    const t = ((C.D.schwellen || {}).tests || []).find((x) => x.test === m.test) || {};
    const grenz = Object.entries(s.grenzen || {}).map(([g, txt]) => `${s.metrik === "pace" ? FK().pace(+g) : g} ${s.metrik === "pace" ? "/km" : s.unit}: ${esc(txt)}`).join("<br>");
    let cmp = "";
    if (LZ.mode === "vergleich" && k.aktuell && k.vorher) {
      const v = ((C.D.schwellen || {}).vergleiche || []).find((x) => x.von === k.vorher[which].test && x.bis === k.aktuell[which].test);
      if (v) cmp = Object.entries(v.methoden).filter(([mk, x]) => (k.aktuell[which].methoden || []).includes(mk) && x.gueltig).map(([mk, x]) => {
        const zero = x.band80 && x.band80[0] <= 0 && x.band80[1] >= 0;
        return `${esc(mName(mk))}: ${x.diff > 0 ? "+" : ""}${num(x.diff, s.disziplin === "lauf" ? 2 : 0)} ${s.disziplin === "lauf" ? "km/h" : "W"} (80 %: ${num(x.band80[0], 0)} bis ${num(x.band80[1], 0)})${zero ? " – innerhalb der Messunsicherheit" : ""}`;
      }).join("<br>");
    }
    return `<h4>${which.toUpperCase()} · ${s.disziplin === "rad" ? "Rad" : "Lauf"} · ${{ leistung: "Leistung", puls: "Puls", pace: "Pace" }[s.metrik]}</h4>
      <dl class="dl"><dt>Status</dt><dd>${V.badge(m.status)}${m.grund ? `<br><small>${esc(m.grund)}</small>` : ""}</dd>
      ${m.lo != null ? `<dt>Untergrenze</dt><dd>${fv(s, s.metrik === "pace" ? m.hi : m.lo)}</dd><dt>Obergrenze</dt><dd>${fv(s, s.metrik === "pace" ? m.lo : m.hi)}</dd>` : ""}
      <dt>Methode</dt><dd>${(m.methoden || []).map(mName).map(esc).join(", ") || "–"}</dd>
      <dt>Quelle</dt><dd>Stufentest ${dch(m.datum)} · ${esc(protName(m.protokoll))} · Laktat ${esc(m.datenstatus)}${s.metrik === "puls" ? " · Puls aus FIT (30 s vor Entnahme)" : ""}</dd>
      <dt>Test</dt><dd>${t.ausbelastet ? "ausbelastet" : esc(t.ende || "")}</dd>
      <dt>Zonen</dt><dd>${esc(P.name)}<br><small>${grenz || "keine Angabe"}</small></dd>
      <dt>Freigabe</dt><dd>${esc(P.freigabe.art)} (${dch(P.freigabe.datum)}); Methodik ${P.methodik.bestaetigt ? "bestätigt" : "noch nicht bestätigt"}</dd></dl>
      ${cmp ? `<p class="hint"><b>Vergleich zum vorigen Test</b><br>${cmp}</p>` : ""}`;
  }

  /* ----- LT1/LT2 im Verlauf ----- */
  const errBars = {
    id: "errBars",
    afterDatasetsDraw(chart) {
      const { ctx, scales } = chart;
      ctx.save();
      chart.data.datasets.forEach((ds, i) => {
        if (!ds._bands || chart.getDatasetMeta(i).hidden) return;
        ctx.strokeStyle = ds.borderColor; ctx.lineWidth = 1.5;
        ds.data.forEach((p, j) => { const b = ds._bands[j]; if (!b) return; const x = scales.x.getPixelForValue(p.x), y0 = scales.y.getPixelForValue(b[0]), y1 = scales.y.getPixelForValue(b[1]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.moveTo(x - 4, y0); ctx.lineTo(x + 4, y0); ctx.moveTo(x - 4, y1); ctx.lineTo(x + 4, y1); ctx.stroke(); });
      });
      ctx.restore();
    },
  };
  function drawTrend() {
    const S = (C.D.schwellen || {}).tests || [], u = unitOf(LZ.sport), F = FK();
    const tests = S.filter((t) => t.sport === LZ.sport);
    const sel1 = $("lt-m1"), sel2 = $("lt-m2");
    sel1.innerHTML = ["somc", "basis05", "loglog"].map((k) => `<option value="${k}" ${LZ.m1 === k ? "selected" : ""}>${esc(mName(k))}</option>`).join("");
    sel2.innerHTML = ["dickhuth", "moddmax", "dmax"].map((k) => `<option value="${k}" ${LZ.m2 === k ? "selected" : ""}>${esc(mName(k))}</option>`).join("");
    sel1.onchange = () => { LZ.m1 = sel1.value; drawTrend(); }; sel2.onchange = () => { LZ.m2 = sel2.value; drawTrend(); };
    const prots = [...new Set(tests.map((t) => t.protokoll))];
    const ds = [];
    prots.forEach((p, pi) => {
      for (const [mk, col, nm] of [[LZ.m1, C.css("--lt1"), "LT1"], [LZ.m2, C.css("--lt2"), "LT2"]]) {
        const pts = tests.filter((t) => t.protokoll === p && t.methoden[mk] && t.methoden[mk].gueltig);
        if (!pts.length) continue;
        const fam = nm === "LT1" ? ["somc", "basis05", "loglog"] : ["dickhuth", "moddmax", "dmax"];
        const span = (t) => { const v = fam.map((k) => t.methoden[k]).filter((m) => m && m.gueltig).map((m) => m.x); return v.length > 1 ? [Math.min(...v), Math.max(...v), v.length] : null; };
        ds.push({ type: "line", label: `${nm} · ${mName(mk)} · ${protName(p)}`, data: pts.map((t) => ({ x: F.dayNum(t.datum), y: t.methoden[mk].x, st: t.datenstatus, sp: span(t) })), _bands: pts.map((t) => t.methoden[mk].band80),
          borderColor: col, backgroundColor: col, borderDash: pi ? [5, 4] : [], pointStyle: pi ? "triangle" : "circle", pointRadius: 5, tension: 0, showLine: pts.length > 1 });
      }
    });
    const none = tests.filter((t) => !(t.methoden[LZ.m2] || {}).gueltig).map((t) => `${dch(t.datum)}: ${esc(((t.methoden[LZ.m2] || {}).grund) || "nicht bestimmbar")}`);
    $("lt-note").innerHTML = `Punkte = Wert der gewählten Methode. Strich = 80-%-Band nur aus der Messunsicherheit des Laktatgeräts (Simulation) – kein vollständiges Konfidenzintervall: die Unsicherheit der Methode selbst zeigt die Spannweite zwischen den Methoden (im Tooltip und in «Schwellen je Methode»). Jede Linie verbindet nur Tests mit gleichem Protokoll und gleicher Sportart; verschiedene Protokolle (z. B. Labor 3 min +40 W und Zwift 5 min +20 W) werden nie verbunden. ${none.length ? `<br>${esc(mName(LZ.m2))} nicht bestimmbar: ${none.join("; ")}.` : ""}`;
    C.chart("c-ltt", { type: "scatter", data: { datasets: ds }, plugins: [errBars], options: { parsing: { xAxisKey: "x", yAxisKey: "y" },
      scales: { x: { type: "linear", ticks: { callback: (v) => new Date(v * 864e5).toLocaleDateString("de-CH", { month: "short", year: "2-digit" }) }, title: { display: true, text: "Testdatum" } }, y: { title: { display: true, text: u === "W" ? "Leistung (W)" : "Tempo (km/h)" } } },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => [`${c.dataset.label}: ${num(c.raw.y, u === "W" ? 0 : 2)} ${u} · ${new Date(c.raw.x * 864e5).toLocaleDateString("de-CH")}`,
        `Status: ${c.raw.st === "bestätigt" ? "bestätigt" : "Vorschau (nicht bestätigt)"}`, c.raw.sp ? `Spanne der ${c.raw.sp[2]} gültigen Methoden: ${num(c.raw.sp[0], u === "W" ? 0 : 2)}–${num(c.raw.sp[1], u === "W" ? 0 : 2)} ${u}` : "nur eine gültige Methode"] } } } } });
  }
  function drawMethods() {
    const S = (C.D.schwellen || {}), u = unitOf(LZ.sport);
    const tests = (S.tests || []).filter((t) => t.sport === LZ.sport);
    const keys = ["somc", "basis05", "loglog", "dickhuth", "moddmax", "dmax", "fix2", "fix4"];
    $("t-lmeth").innerHTML = `<tr><th>Methode</th>${tests.map((t) => `<th>${dch(t.datum)}<br><small>${esc(protName(t.protokoll))}</small></th>`).join("")}</tr>` + keys.map((k) => {
      const meta = (S.methoden || {})[k] || {};
      return `<tr class="${meta.rolle === "orientierung" ? "subrow" : ""}"><td class="wrap"><b>${esc(meta.name || k)}</b><br><small>${esc(meta.rolle === "orientierung" ? "nur Orientierung, keine Schwelle" : meta.regel || "")}</small></td>${tests.map((t) => {
        const m = t.methoden[k];
        if (!m || m.x == null) return `<td class="wrap"><small>– ${esc((m && m.grund) || "")}</small></td>`;
        return `<td>${num(m.x, u === "W" ? 0 : 2)} ${u}${m.hf != null ? `<br><small>${num(m.hf)} bpm</small>` : ""}${m.band80 ? `<br><small>80 %: ${num(m.band80[0], u === "W" ? 0 : 1)}–${num(m.band80[1], u === "W" ? 0 : 1)}</small>` : ""}${m.gueltig ? "" : `<br><small>${esc(m.grund || "Orientierung")}</small>`}</td>`;
      }).join("")}</tr>`;
    }).join("");
    $("lm-note").textContent = `Unsicherheit: ${(S.simulation || {}).n || "–"} Simulationen mit Messfehler ${(S.simulation || {}).sd || "–"}. Puls an der Schwelle aus der FIT-Datei (30 s vor der Blutentnahme), sonst aus der Tabelle. Version ${S.v || "–"}.`;
  }

  /* ----- Testbibliothek ----- */
  const LIB = { sport: "", prot: "", status: "" };
  V.library = function () {
    const L = LZ.L || FK().lactateData(C.D);
    const arch = new Set(Inbox.data.archiv || []);
    const conf = new Set(Inbox.data.laktat_bestaetigt || []);
    const rows = L.tests.map((t) => ({ id: t.id, datum: t.datum, sport: t.sport, prot: t.protokoll, n: t.punkte.length, quelle: ((C.D.laktat_vorschau || []).find((p) => p.id === t.id) || {}).datei || "bestätigt",
      geraet: /^labor/.test(t.protokoll) ? "Laborergometer" : t.sport === "lauf" ? "GPS" : "Zwift-Rolle", status: t.datenstatus, art: "Stufentest" }))
      .concat(L.singles.map((s) => ({ id: s.id, datum: s.datum, sport: s.sport, prot: "Einzelmessung", n: 1, quelle: s.quelle, geraet: "–", status: s.status, art: "Einzelmessung" })))
      .concat((Inbox.data.test_entwuerfe || []).map((d) => ({ id: d.id, datum: d.datum, sport: d.sport, prot: d.protokoll, n: (d.stufen || []).filter((s) => s.la != null).length, quelle: "Handy", geraet: d.fit ? "FIT geladen" : "ohne FIT", status: "entwurf", art: "Entwurf" })));
    const f = $("lib-f");
    if (!f.dataset.init) {
      f.dataset.init = 1;
      f.innerHTML = `<select data-k="sport" aria-label="Sportart"><option value="">Rad und Lauf</option><option value="rad">Rad</option><option value="lauf">Lauf</option></select>
        <select data-k="prot" aria-label="Protokoll"><option value="">Alle Protokolle</option>${[...new Set(rows.map((r) => r.prot))].map((p) => `<option value="${esc(p)}">${esc(protName(p))}</option>`).join("")}</select>
        <select data-k="status" aria-label="Status"><option value="">Alle Status</option><option value="vorschau">Vorschau</option><option value="bestätigt">bestätigt</option><option value="entwurf">Entwurf</option></select>
        <label class="row hint"><input type="checkbox" data-k="arch"> Archivierte zeigen</label>`;
      f.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("change", () => { LIB[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; V.library(); }));
    }
    const shown = rows.filter((r) => (!LIB.sport || r.sport === LIB.sport) && (!LIB.prot || r.prot === LIB.prot) && (!LIB.status || r.status === LIB.status) && (LIB.arch || !arch.has(r.id)));
    $("t-lib").innerHTML = `<tr><th>Datum</th><th class="l">Art</th><th class="l">Sport</th><th class="l">Protokoll</th><th>Werte</th><th class="l">Quelle</th><th class="l">Gerät</th><th class="l">Status</th><th class="l">Aktionen</th></tr>` + (shown.map((r) => `<tr>
      <td>${dch(r.datum)}</td><td>${esc(r.art)}</td><td>${r.sport === "lauf" ? "Lauf" : "Rad"}</td><td>${esc(protName(r.prot))}</td><td>${r.n}</td><td class="wrap"><small>${esc(r.quelle)}</small></td><td>${esc(r.geraet)}</td>
      <td>${V.badge(conf.has(r.id) ? "bestätigt" : r.status, conf.has(r.id) ? "zum Export" : "")}${arch.has(r.id) ? " " + V.badge("archiviert") : ""}</td>
      <td class="acts">${r.art !== "Entwurf" ? `<button class="btn" data-a="show" data-id="${esc(r.id)}">Ansehen</button>` : `<button class="btn" data-a="open" data-id="${esc(r.id)}">Weiter</button>`}
        ${r.art === "Stufentest" ? `<button class="btn" data-a="dup" data-id="${esc(r.id)}">Als Vorlage</button>` : ""}
        ${r.status === "vorschau" && !conf.has(r.id) ? `<button class="btn" data-a="conf" data-id="${esc(r.id)}">Bestätigen</button>` : ""}
        <button class="btn" data-a="arch" data-id="${esc(r.id)}">${arch.has(r.id) ? "Zurückholen" : "Archivieren"}</button></td></tr>`).join("") || `<tr><td colspan="9">Keine Tests mit diesen Filtern.</td></tr>`);
    $("t-lib").querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.id, r = rows.find((x) => x.id === id);
      if (b.dataset.a === "show") { LZ.sport = r.sport; if (r.art === "Stufentest") { LZ.shown = Array.from(new Set((LZ.shown || []).concat(id))); LZ.sel = { k: "stufe", t: id, nr: 1 }; } else LZ.sel = { k: "einzel", id }; V.laktat(); $("lz-main").scrollIntoView({ behavior: "smooth" }); }
      if (b.dataset.a === "dup") V.testEntry.open(null, { vorlageVon: id, sport: r.sport, protokoll: r.prot });
      if (b.dataset.a === "open") V.testEntry.open(id);
      if (b.dataset.a === "conf") { if (!Inbox.data.laktat_bestaetigt.includes(id)) Inbox.data.laktat_bestaetigt.push(id); await Inbox.save(); V.library(); }
      if (b.dataset.a === "arch") { Inbox.data.archiv = arch.has(id) ? Inbox.data.archiv.filter((x) => x !== id) : Inbox.data.archiv.concat(id); await Inbox.save(); V.library(); }
    }));
  };

  /* ======================= Test starten (Handy, offline) ======================= */
  const TEMPLATES = {
    "rad-stufen-120-20-5": { sport: "rad", name: "Stufentest Rad (Zwift, ERG)", start: 120, schritt: 20, stufe_s: 300, n: 10 },
    "rad-check-220-10": { sport: "rad", name: "Kurzcheck Rad 220 W", start: 220, schritt: 0, stufe_s: 600, n: 1 },
    "lauf-stufen": { sport: "lauf", name: "Stufentest Lauf (draussen)", start: 10, schritt: 1, stufe_s: 300, n: 5, hinweis: "Sollwerte vor dem Test anpassen" },
  };
  V.TEMPLATES = TEMPLATES;
  const TE = (V.testEntry = {
    cur: null,
    open(id, opt) {
      const ov = $("v5-test");
      ov.hidden = false; document.body.classList.add("noscroll");
      if (id) this.cur = JSON.parse(JSON.stringify((Inbox.data.test_entwuerfe || []).find((d) => d.id === id)));
      else this.cur = null;
      this.opt = opt || {};
      this.render();
      ov.querySelector("h2")?.focus();
    },
    close() { $("v5-test").hidden = true; document.body.classList.remove("noscroll"); V.laktat && LZ.L && V.laktat(); },
    newDraft(tid, cfg) {
      const T = Object.assign({}, TEMPLATES[tid] || {}, cfg || {});
      const now = new Date();
      const stufen = Array.from({ length: T.n }, (_, i) => ({ nr: i + 1, soll: +(T.start + i * T.schritt).toFixed(2), la: null, zeit: "", notiz: "", status: "ok" }));
      this.cur = { id: "app-" + now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14), v: "app-test-1", protokoll: tid, sport: T.sport, datum: C.iso(now), start_uhr: now.toTimeString().slice(0, 5),
        stufe_s: T.stufe_s, stufen, notiz: "", status: "entwurf", erstellt: now.toISOString(), geaendert: now.toISOString() };
      return this.save();
    },
    async save() { this.cur.geaendert = new Date().toISOString(); await Inbox.upsert("test_entwuerfe", JSON.parse(JSON.stringify(this.cur))); const s = $("te-saved"); if (s) s.textContent = "gespeichert " + new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); },
    render() {
      const ov = $("v5-test");
      const drafts = Inbox.data.test_entwuerfe || [];
      if (!this.cur) {
        const vorlage = this.opt.protokoll && TEMPLATES[this.opt.protokoll] ? this.opt.protokoll : null;
        ov.innerHTML = `<div class="te-box" role="dialog" aria-modal="true" aria-label="Test starten"><div class="te-head"><h2 tabindex="-1">Test starten</h2><button class="btn" data-x>Schliessen</button></div>
          <p class="hint">Während des Tests brauchst du nur das Laktat. Leistung, Puls und Tempo kommen später aus der FIT-Datei. Alles wird sofort verschlüsselt auf diesem Gerät gespeichert, auch ohne Netz.</p>
          <div class="te-templates">${Object.entries(TEMPLATES).map(([k, t]) => `<button class="te-tpl${vorlage === k ? " on" : ""}" data-t="${k}"><b>${esc(t.name)}</b><small>${t.n} ${t.n === 1 ? "Block" : "Stufen"} · ${t.stufe_s / 60} min · ab ${num(t.start, t.sport === "lauf" ? 1 : 0)} ${t.sport === "lauf" ? "km/h" : "W"}${t.schritt ? ` · +${num(t.schritt, t.sport === "lauf" ? 1 : 0)}` : ""}</small>${t.hinweis ? `<small>${esc(t.hinweis)}</small>` : ""}</button>`).join("")}</div>
          <form class="te-cfg inline" id="te-cfg" hidden><label>Start<input type="number" step="0.5" name="start"></label><label>Schritt<input type="number" step="0.5" name="schritt"></label><label>Stufe (min)<input type="number" step="0.5" name="min"></label><label>Stufen<input type="number" min="1" max="20" name="n"></label><button class="btn primary" type="submit">Test beginnen</button></form>
          ${drafts.length ? `<h3 class="mini-h">Entwürfe auf diesem Gerät</h3><div class="te-drafts">${drafts.map((d) => `<div class="te-draft"><span><b>${dch(d.datum)}</b> ${esc((TEMPLATES[d.protokoll] || {}).name || d.protokoll)} · ${(d.stufen || []).filter((s) => s.la != null).length} Laktatwerte${d.fit ? " · FIT" : ""}</span><span class="row"><button class="btn" data-o="${esc(d.id)}">Weiter</button><button class="btn" data-d="${esc(d.id)}">Löschen</button></span></div>`).join("")}</div>` : ""}</div>`;
        ov.querySelector("[data-x]").onclick = () => this.close();
        let chosen = vorlage;
        const cfgForm = ov.querySelector("#te-cfg");
        const showCfg = (k) => { chosen = k; const t = TEMPLATES[k]; cfgForm.hidden = false; cfgForm.start.value = t.start; cfgForm.schritt.value = t.schritt; cfgForm.min.value = t.stufe_s / 60; cfgForm.n.value = t.n; ov.querySelectorAll(".te-tpl").forEach((b) => b.classList.toggle("on", b.dataset.t === k)); };
        ov.querySelectorAll(".te-tpl").forEach((b) => (b.onclick = () => showCfg(b.dataset.t)));
        if (vorlage) showCfg(vorlage);
        cfgForm.onsubmit = async (e) => { e.preventDefault(); await this.newDraft(chosen, { start: +cfgForm.start.value, schritt: +cfgForm.schritt.value, stufe_s: Math.round(+cfgForm.min.value * 60), n: +cfgForm.n.value }); this.render(); };
        ov.querySelectorAll("[data-o]").forEach((b) => (b.onclick = () => { this.cur = JSON.parse(JSON.stringify(drafts.find((d) => d.id === b.dataset.o))); this.render(); }));
        ov.querySelectorAll("[data-d]").forEach((b) => (b.onclick = async () => { if (b.dataset.armed) { await Inbox.remove("test_entwuerfe", b.dataset.d); this.render(); } else { b.dataset.armed = 1; b.textContent = "Wirklich löschen?"; } }));
        return;
      }
      const d = this.cur, u = d.sport === "lauf" ? "km/h" : "W";
      ov.innerHTML = `<div class="te-box" role="dialog" aria-modal="true" aria-label="Test erfassen"><div class="te-head"><h2 tabindex="-1">${esc((TEMPLATES[d.protokoll] || {}).name || "Test")} · ${dch(d.datum)}</h2><button class="btn" data-x>Fertig</button></div>
        <p class="hint"><span id="te-saved">${d.geaendert ? "gespeichert" : ""}</span> · Stufen ${num(d.stufe_s / 60, 1)} min · Laktat in mmol/l</p>
        <div class="te-stages">${d.stufen.map((s, i) => `<div class="te-stage ${s.status !== "ok" ? "flag" : ""}"><div class="te-lab"><b>Stufe ${s.nr}</b><span>${num(s.soll, u === "W" ? 0 : 1)} ${u}</span></div>
          <input class="te-la" type="number" inputmode="decimal" step="0.1" min="0" max="25" placeholder="mmol/l" aria-label="Laktat Stufe ${s.nr}" data-i="${i}" value="${s.la ?? ""}">
          <button class="btn" data-more="${i}" aria-expanded="false">Mehr</button>
          <div class="te-more" hidden data-mi="${i}"><label>Messzeit<span class="row"><input type="time" step="1" data-f="zeit" data-i="${i}" value="${esc(s.zeit)}"><button class="btn" type="button" data-now="${i}">jetzt</button></span></label>
            <label>Soll ändern<input type="number" step="0.5" data-f="soll" data-i="${i}" value="${s.soll}"></label>
            <label>Status<select data-f="status" data-i="${i}">${["ok", "abgebrochen", "Pause", "geändert"].map((x) => `<option ${s.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
            <label>Bemerkung<input type="text" data-f="notiz" data-i="${i}" value="${esc(s.notiz)}" placeholder="z. B. schwere Beine"></label></div></div>`).join("")}</div>
        <div class="row"><button class="btn" data-add>+ Stufe</button><label class="btn">FIT-Datei einlesen<input type="file" accept=".fit,application/octet-stream" data-fit hidden></label><button class="btn" data-del>Entwurf löschen</button></div>
        <label class="te-note">Notiz zum Test<textarea rows="2" data-note placeholder="Tageszeit, Mahlzeit, Raumtemperatur, Helfer oder allein">${esc(d.notiz)}</textarea></label>
        <div id="te-fit">${d.fit ? fitTable(d) : `<p class="hint">Ohne FIT-Datei stehen nur deine Eingaben da. Kein Wert wird aufgefüllt.</p>`}</div></div>`;
      ov.querySelector("[data-x]").onclick = () => this.close();
      ov.querySelectorAll(".te-la").forEach((inp) => inp.addEventListener("input", () => { const v = inp.value.replace(",", "."); d.stufen[+inp.dataset.i].la = v === "" ? null : +v; if (!d.stufen[+inp.dataset.i].zeit) d.stufen[+inp.dataset.i].zeit = new Date().toTimeString().slice(0, 8); this.save(); }));
      ov.querySelectorAll("[data-f]").forEach((inp) => inp.addEventListener("change", () => { const s = d.stufen[+inp.dataset.i]; s[inp.dataset.f] = inp.dataset.f === "soll" ? +inp.value : inp.value; if (inp.dataset.f === "soll") s.status = "geändert"; this.save(); }));
      ov.querySelectorAll("[data-now]").forEach((b) => (b.onclick = () => { const s = d.stufen[+b.dataset.now]; s.zeit = new Date().toTimeString().slice(0, 8); this.save(); this.render(); }));
      ov.querySelectorAll("[data-more]").forEach((b) => (b.onclick = () => { const m = ov.querySelector(`[data-mi="${b.dataset.more}"]`); m.hidden = !m.hidden; b.setAttribute("aria-expanded", String(!m.hidden)); }));
      ov.querySelector("[data-add]").onclick = () => { const last = d.stufen[d.stufen.length - 1]; const T = TEMPLATES[d.protokoll] || { schritt: 20 }; d.stufen.push({ nr: d.stufen.length + 1, soll: +((last ? last.soll : 0) + (T.schritt || 0)).toFixed(2), la: null, zeit: "", notiz: "", status: "ok" }); this.save(); this.render(); };
      ov.querySelector("[data-note]").addEventListener("input", (e) => { d.notiz = e.target.value; this.save(); });
      ov.querySelector("[data-del]").onclick = async (e) => { if (e.target.dataset.armed) { await Inbox.remove("test_entwuerfe", d.id); this.cur = null; this.render(); } else { e.target.dataset.armed = 1; e.target.textContent = "Wirklich löschen?"; } };
      ov.querySelector("[data-fit]").addEventListener("change", async (e) => { try { await this.loadFit(e.target.files[0]); this.render(); } catch (err) { $("te-fit").innerHTML = `<p class="hint down">FIT-Datei nicht lesbar: ${esc(err.message)}</p>`; } });
      ov.querySelectorAll("[data-shift]").forEach((inp) => inp.addEventListener("change", () => { const [i, k] = inp.dataset.shift.split(":"); d.fit.shifts[i] = d.fit.shifts[i] || {}; d.fit.shifts[i][k] = +inp.value || 0; this.recompute(); this.save(); this.render(); }));
    },
    async loadFit(file) {
      const F = FK(), d = this.cur;
      const fit = F.parseFit(await file.arrayBuffer());
      const recs = fit.records.filter((r) => r.t);
      if (!recs.length) throw new Error("keine Datensätze");
      const unit = d.sport === "lauf" ? "km/h" : "W";
      let t0 = unit === "W" ? F.findTestStart(recs, d.stufen[0].soll) : null;
      const how = t0 ? "erste Stufe in der Leistung gefunden" : "Start der Aufzeichnung (bitte prüfen)";
      if (!t0) t0 = recs[0].t;
      this.records = recs;
      d.fit = { datei: file.name, records: recs.length, start: t0, wie: how, shifts: {}, geladen: new Date().toISOString() };
      d._recs = null;
      this.recompute();
      await this.save();
    },
    recompute() {
      const F = FK(), d = this.cur, unit = d.sport === "lauf" ? "km/h" : "W";
      if (!d.fit || !this.records) return;
      const w = F.stageWindows(d.fit.start, d.stufen.length, d.stufe_s, d.fit.shifts);
      d.stufen.forEach((s, i) => {
        const st = F.windowStats(this.records, w[i].t0, w[i].t1, unit);
        const flags = [];
        if (st.abdeckung < 0.9) flags.push("Datenlücken");
        if (st.x_median != null && Math.abs(st.x_median - s.soll) > (unit === "W" ? 5 : 0.3)) flags.push("Ist weicht vom Soll ab");
        if (st.puls_abdeckung != null && st.puls_abdeckung < 0.9) flags.push("Puls lückenhaft");
        s.fit = Object.assign(st, { t0: w[i].t0, t1: w[i].t1, pruefen: flags });
      });
    },
  });
  function fitTable(d) {
    const u = d.sport === "lauf" ? "km/h" : "W";
    return `<h3 class="mini-h">FIT: ${esc(d.fit.datei)} · Start ${new Date(d.fit.start * 1000).toLocaleTimeString("de-CH")} (${esc(d.fit.wie)})</h3>
      <div class="tablewrap"><table class="t"><tr><th>Stufe</th><th>Soll</th><th>Ist (Median)</th><th>Puls Ø</th><th>max</th><th>letzte 60 s</th><th>Dauer</th><th>Abdeckung</th><th>Laktat</th><th>Grenzen (s)</th><th>Prüfen</th></tr>
      ${d.stufen.map((s, i) => { const f = s.fit || {}; return `<tr><td>${s.nr}</td><td>${num(s.soll, u === "W" ? 0 : 1)}</td><td>${num(f.x_median, u === "W" ? 0 : 2)}</td><td>${num(f.hr_mean)}</td><td>${num(f.hr_max)}</td><td>${num(f.hr_60)}</td><td>${f.dauer_s ? C.mmss(f.dauer_s) : "–"}</td><td>${f.abdeckung != null ? num(f.abdeckung * 100) + " %" : "–"}</td><td>${num(s.la, 1)}</td>
        <td class="shift"><input type="number" step="5" aria-label="Beginn Stufe ${s.nr} verschieben (s)" data-shift="${i}:start" value="${(d.fit.shifts[i] || {}).start || 0}"><input type="number" step="5" aria-label="Ende Stufe ${s.nr} verschieben (s)" data-shift="${i}:ende" value="${(d.fit.shifts[i] || {}).ende || 0}"></td>
        <td>${(f.pruefen || []).length ? `<span class="badge warn">prüfen</span> <small>${esc(f.pruefen.join(", "))}</small>` : "ok"}</td></tr>`; }).join("")}</table></div>
      <p class="hint">Grenzen verschieben: Sekunden, positiv = später. Stufenwerte = Median der Leistung im Fenster; Puls Ø und letzte 60 s getrennt. Nach dem Export ordne ich die Stufen zusätzlich mit meinen Werkzeugen zu (Vorschau), bevor etwas übernommen wird.</p>`;
  }

  /* ======================= Heute: Bereitschaft ======================= */
  const RD = { n: 21 };
  V.befinden = () => V.merged("befinden", "befinden", (e) => e.date);
  V.heute = function () {
    const F = FK(), D = C.D, day = isoToday();
    const r = F.readiness(D.days, D.activities, V.befinden(), day);
    V.lastReadiness = r;
    const col = { bereit: C.css("--good"), normal: C.css("--strain"), vorsichtig: C.css("--warn"), "nicht beurteilbar": C.css("--muted") }[r.status];
    if (window.V55) window.V55.heute(C, r);                      // V5.5: Tagesurteil, Datenqualität, drei Kennzahlen statt Ringen
    const own = (Inbox.data.notizen || {})["plan-" + day];
    const ind = r.indikatoren;
    const row = (k, v, st) => `<div class="rd-row"><span>${k}</span><b class="${/unter|erhöht|kurz|hoch|belastet/.test(st || "") ? "down" : ""}">${esc(v)}</b></div>`;
    $("rd-card").innerHTML = `<div class="eyebrow">Tagesbereitschaft</div><h2 class="rd-status rd-${r.status.replace(/ /g, "-")}">${{ bereit: "Bereit", normal: "Normal", vorsichtig: "Vorsicht bei Intensität", "nicht beurteilbar": "Nicht beurteilbar" }[r.status]}</h2>
      <p class="sub">${esc(r.gruende.join(" · "))}</p>
      <h3 class="mini-h">Was wurde berücksichtigt?</h3>
      ${row("HRV-Trend", ind.hrv.status === "unbekannt" ? ind.hrv.grund : `${ind.hrv.status} (7 Tage Ø ${ind.hrv.wert7} ms)`, ind.hrv.status)}
      ${row("Ruhepuls", ind.rhr.status === "unbekannt" ? ind.rhr.grund : `${ind.rhr.status} (Ø ${num(ind.rhr.wert3, 1)} bpm)`, ind.rhr.status)}
      ${row("Schlaf", ind.schlaf.wert != null ? `${ind.schlaf.status} (${num(ind.schlaf.wert, 1)} h)` : ind.schlaf.grund, ind.schlaf.status)}
      ${row("Belastung 7 Tage", ind.last.status === "unbekannt" ? ind.last.grund : `${ind.last.status} (${ind.last.akut7} / Ø ${ind.last.chronisch7})`, ind.last.status)}
      ${row("Befinden", ind.befinden.status, ind.befinden.status)}${ind.krank ? row("Krankheitszeichen", ind.krank.zeichen.join(", "), "erhöht") : ""}
      <p class="hint">Vertrauen ${esc(r.vertrauen)} · Vorschlag: ${esc(r.empfehlung)} ${r.nachtdienst ? "· Nachtdienst berücksichtigt" : ""}</p>
      <details class="rd-own"><summary>Selbst entscheiden${own ? " · " + esc(own) : ""}</summary><form class="inline" id="rd-own"><label>Heute mache ich<input type="text" name="t" value="${esc(own || "")}" placeholder="z. B. 60 min locker statt Intervalle"></label><button class="btn" type="submit">Speichern</button></form></details>
      <details class="rd-bef"${(V.befinden().find((b) => b.date === day)) ? "" : " open"}><summary>Befinden heute eintragen</summary><form id="rd-bef" class="rd-form">${befForm(V.befinden().find((b) => b.date === day))}</form></details>
      <p class="hint">Kein medizinisches Diagnoseinstrument. Fehlende Werte werden nicht durch «normal» ersetzt. Version ${esc(r.v)}.</p>`;
    $("rd-own").onsubmit = async (e) => { e.preventDefault(); Inbox.data.notizen = Object.assign({}, Inbox.data.notizen, { ["plan-" + day]: e.target.t.value.trim() }); await Inbox.save(); V.heute(); };
    $("rd-bef").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const b = { date: day, muede: +f.muede.value || null, muskel: +f.muskel.value || null, stress: +f.stress.value || null, krank: [...f.querySelectorAll("[name=krank]:checked")].map((x) => x.value), nachtdienst: f.nacht.checked, notiz: f.notiz.value.trim(), erfasst: new Date().toISOString() };
      if (!b.krank.length) delete b.krank;
      await Inbox.upsert("befinden", b, (x) => x.date); V.heute();
    };
    const v = $("today-verdict");
    v.className = "verdict" + (r.status === "vorsichtig" ? " warn" : r.status === "nicht beurteilbar" ? " muted" : "");
    v.textContent = r.empfehlung;
    $("rd-range").querySelectorAll("button").forEach((b) => { b.setAttribute("aria-pressed", String(+b.dataset.n === RD.n)); b.onclick = () => { RD.n = +b.dataset.n; V.heute(); }; });
    const T = F.readinessTrend(D.days, D.activities, V.befinden(), day, RD.n);
    if (window.V55) window.V55.verlauf(C, T);                    // V5.5: drei synchronisierte Mini-Grafiken
  };
  function befForm(b) {
    b = b || {};
    const sc = (n, lab) => `<fieldset class="scale5"><legend>${lab}</legend>${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${n}" value="${v}" ${b[n] === v ? "checked" : ""}><span>${v}</span></label>`).join("")}</fieldset>`;
    const K = ["Halsweh", "Fieber", "Erkältung", "Magen-Darm", "Verletzung"];
    return `${sc("muede", "Müdigkeit (1 frisch – 5 erschöpft)")}${sc("muskel", "Muskeln (1 locker – 5 sehr schwer)")}${sc("stress", "Stress (1 ruhig – 5 sehr hoch)")}
      <fieldset class="checks"><legend>Krankheitszeichen</legend>${K.map((k) => `<label><input type="checkbox" name="krank" value="${k}" ${(b.krank || []).includes(k) ? "checked" : ""}> ${k}</label>`).join("")}</fieldset>
      <label class="row"><input type="checkbox" name="nacht" ${b.nachtdienst ? "checked" : ""}> Nachtdienst / Schlaf zu ungewohnter Zeit</label>
      <label>Notiz<input type="text" name="notiz" value="${esc(b.notiz || "")}"></label><button class="btn primary" type="submit">Speichern</button>`;
  }
})();
