/* Spuren & Formkurve – V5 Ausdauer: lange Ausfahrten (1–6 h), Koppelläufe, Fueling. Rechenlogik in js/formkurve.js. */
(function () {
  "use strict";
  const V = (window.V5UI = window.V5UI || {});
  const $ = (id) => document.getElementById(id);
  const FK = () => window.FK;
  const esc = (s) => V.esc(s), num = (v, d) => V.num(v, d);
  const C = () => V.C;
  const dch = (s) => (s ? C().dateCH(s) : "–");
  const SYS = { rennrad: "Rennrad", mtb: "MTB/Gravel", indoor: "Rolle (Zwift)" };

  /* ======================= Lange Ausfahrt 1–6 h ======================= */
  const LR = { zweck: "longride", h: 5, system: "rennrad", ist: null };
  function lt1Indoor() {
    const t = ((C().D.schwellen || {}).tests || []).filter((x) => x.sport === "rad" && x.protokoll === "rad-stufen-120-20-5" && x.lt1 && x.lt1.lo != null).sort((a, b) => b.datum.localeCompare(a.datum))[0];
    return t ? t.lt1.lo : null;
  }
  V.langfahrt = function () {
    const D = C().D, F = FK();
    const f = $("lr-ctl");
    if (!f.dataset.init) {
      f.dataset.init = 1;
      f.innerHTML = `<label>Zweck<select data-k="zweck">${Object.entries(F.ZWECK).map(([k, z]) => `<option value="${k}">${esc(z.name)}</option>`).join("")}</select></label>
        <label>Dauer<select data-k="h">${[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map((h) => `<option value="${h}">${num(h, 1)} h</option>`).join("")}</select></label>
        <label>System<select data-k="system">${Object.entries(SYS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>`;
      f.querySelectorAll("[data-k]").forEach((el) => { el.value = String(LR[el.dataset.k]); el.addEventListener("change", () => { LR[el.dataset.k] = el.dataset.k === "h" ? +el.value : el.value; LR.ist = null; V.langfahrt(); }); });
    }
    const lt1 = LR.system === "indoor" ? lt1Indoor() : null;
    const r = F.longRide(D.activities, { stunden: LR.h, zweck: LR.zweck, system: LR.system, heute: C().iso(C().today), lt1 });
    const plans = V.merged("langfahrt_plaene", "langfahrt");
    const plan = plans.find((p) => p.zweck === LR.zweck && p.stunden === LR.h && p.system === LR.system) || null;
    const fu = V.merged("fueling", "fueling");
    const noFuel = r.basis.filter((b) => !fu.some((e) => e.activity_id === b.id && e.status !== "nicht protokolliert")).length;
    const hot = r.basis.filter((b) => b.wx && b.wx.temperature != null && b.wx.temperature >= 25).length;
    const risks = [
      LR.system !== "indoor" ? "Draussen: Leistung mit deinem Leistungsmesser; nie mit Zwift-Watt mischen (keine Umrechnung)." : "Rolle: Raumtemperatur und Ventilator verändern den Puls stark.",
      r.basis.length ? `Wetter bekannt bei ${r.basis.filter((b) => b.wx).length} von ${r.basis.length} Fahrten${hot ? `, davon ${hot} ab 25 °C` : ""}. Hitze hebt den Puls bei gleicher Leistung.` : null,
      "Höhe und Gelände sind nicht berücksichtigt (keine verlässlichen Daten je Abschnitt).",
      r.basis.length ? `Fueling protokolliert bei ${r.basis.length - noFuel} von ${r.basis.length} Fahrten.` : null,
    ].filter(Boolean);
    $("lr-out").innerHTML = `<div class="lr-grid">
      <div class="lr-box"><div class="eyebrow">Watt-Sollband · ${esc(r.zweck_name)} · ${num(LR.h, 1)} h</div>
        ${r.watt ? `<div class="hero">${r.watt.lo}–${r.watt.hi} <small>W</small></div>${V.badge(r.status)} ${V.prov("abgeleitet", "aus beobachteten Fahrten abgeleitet")}<p class="hint">Median der Fahrten ${r.watt.median} W (Ø Watt, nicht NP)</p>`
          : `<div class="hero muted">nicht bestimmbar</div>${V.badge("nicht bestimmbar")}`}</div>
      <div class="lr-box"><div class="eyebrow">Puls · Beobachtung</div>
        ${r.puls ? `<div class="hero">${r.puls.lo}–${r.puls.hi} <small>bpm</small></div><p class="hint">erwartete Drift: +${num(r.puls.drift_bpm, 1)} bpm in der 2. Hälfte · Entkopplung Median ${num(r.puls.entkopplung_median, 1)} %</p>` : `<div class="hero muted">–</div><p class="hint">ohne Evidenz kein Pulsband</p>`}</div>
      <div class="lr-box"><div class="eyebrow">Begründung</div><ul class="flags">${r.gruende.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
        <p class="hint">Evidenz: ${r.evidenz.dauer} Fahrten ${num(r.fenster_h[0], 1)}–${num(r.fenster_h[1], 1)} h · ${r.evidenz.mit_leistung} mit Leistung und Puls · ${r.evidenz.gleichmaessig} gleichmässig · ${r.evidenz.mit_drift} mit Drift · ${r.evidenz.entkopplung_ok} mit Entkopplung ≤ ${F.ZWECK[LR.zweck].maxDec} %</p></div>
      <div class="lr-box"><div class="eyebrow">Risiken und Bedingungen</div><ul class="flags">${risks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>`;
    // Band über 1–6 h, nur wo bestimmbar
    const hs = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
    const bands = hs.map((h) => F.longRide(D.activities, { stunden: h, zweck: LR.zweck, system: LR.system, heute: C().iso(C().today), lt1 }));
    const pts = F.longRide(D.activities, { stunden: 3.5, zweck: LR.zweck, system: LR.system, heute: C().iso(C().today), lt1, minN: 0 });
    const all = D.activities.filter((a) => a.sport === "rad" && F.bikeSys(a) === LR.system && a.watt && a.dr && (a.mv || a.dur) >= 3600 && a.date >= F.addDays(C().iso(C().today), -548));
    C().chart("c-lr", { type: "scatter", data: { datasets: [
      { type: "line", label: "Band unten", data: bands.map((b, i) => (b.watt ? { x: hs[i], y: b.watt.lo } : { x: hs[i], y: null })), borderColor: C().css("--accent"), pointRadius: 0, spanGaps: false },
      { type: "line", label: "Sollband (beobachtet)", data: bands.map((b, i) => (b.watt ? { x: hs[i], y: b.watt.hi } : { x: hs[i], y: null })), borderColor: C().css("--accent"), backgroundColor: C().css("--accent") + "22", pointRadius: 0, fill: "-1", spanGaps: false },
      { label: "Fahrten (Ø Watt)", data: all.map((a) => ({ x: +((a.mv || a.dur) / 3600).toFixed(2), y: a.watt, dec: a.dr.dec, id: a.id })), backgroundColor: all.map((a) => (a.dr.dec <= F.ZWECK[LR.zweck].maxDec ? C().css("--strain") : C().css("--muted"))), pointRadius: 3 },
      plan ? { type: "line", label: "Dein Plan", data: [{ x: LR.h, y: plan.watt_lo }, { x: LR.h, y: plan.watt_hi }], borderColor: C().css("--accent-2"), borderWidth: 4, pointRadius: 0 } : null,
    ].filter(Boolean) }, options: { parsing: { xAxisKey: "x", yAxisKey: "y" }, onClick: (e, els, ch) => { const p = els.length && ch.data.datasets[els[0].datasetIndex].data[els[0].index]; if (p && p.id) { LR.ist = p.id; V.langfahrt(); } },
      scales: { x: { type: "linear", min: 1, max: 6, title: { display: true, text: "Bewegungszeit (h)" } }, y: { title: { display: true, text: "Ø Leistung (W)" } } },
      plugins: { legend: { position: "bottom", labels: { filter: (i) => i.text !== "Band unten" } }, tooltip: { callbacks: { label: (c) => (c.raw.dec != null ? `${num(c.raw.x, 1)} h · ${c.raw.y} W · Entkopplung ${num(c.raw.dec, 1)} %` : `${num(c.raw.x, 1)} h · ${c.raw.y} W`) } } } } });
    $("lr-chart-note").textContent = `Band nur für Dauern mit mindestens 3 passenden Fahrten. Blaue Punkte: Entkopplung ≤ ${F.ZWECK[LR.zweck].maxDec} %, graue darüber. Tippe auf einen Punkt für Plan gegen Ist.${pts.evidenz ? "" : ""}`;
    // Plan (editierbares Szenario)
    const P = plan || { id: `lp-${LR.zweck}-${LR.h}-${LR.system}`, zweck: LR.zweck, stunden: LR.h, system: LR.system, watt_lo: r.watt ? r.watt.lo : "", watt_hi: r.watt ? r.watt.hi : "", puls_max: "", kh_g_h: "", notiz: "" };
    $("lr-plan").innerHTML = `<h3 class="mini-h">Dein Plan ${plan ? V.prov("plan", "von dir festgelegt") : ""} ${r.watt ? "" : "<small>(Szenario: ohne Evidenz von Hand)</small>"}</h3>
      <form class="inline" id="lr-form"><label>Watt von<input type="number" name="lo" value="${P.watt_lo}"></label><label>bis<input type="number" name="hi" value="${P.watt_hi}"></label>
      <label>Puls höchstens<input type="number" name="hr" value="${P.puls_max}"></label><label>KH g/h<input type="number" name="kh" value="${P.kh_g_h}"></label>
      <label class="grow">Notiz<input type="text" name="n" value="${esc(P.notiz)}" placeholder="z. B. Zernez–Ofenpass, heiss"></label><button class="btn primary" type="submit">Plan speichern</button></form>
      <p class="hint">90–120 g/h nur mit erprobter Verträglichkeit (bedingter Hochbereich, kein Standard).</p>`;
    $("lr-form").onsubmit = async (e) => { e.preventDefault(); const t = e.target; const p = Object.assign({}, P, { watt_lo: +t.lo.value || null, watt_hi: +t.hi.value || null, puls_max: +t.hr.value || null, kh_g_h: +t.kh.value || null, notiz: t.n.value.trim(), geaendert: new Date().toISOString(), quelle: "Nutzerplan" }); delete p._lokal; await V.Inbox.upsert("langfahrt", p); V.langfahrt(); };
    // Plan gegen Ist
    const cands = all.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
    const sel = LR.ist && C().ACT_BY_ID.get(LR.ist);
    const pi = sel ? F.planIst(plan ? { lo: plan.watt_lo, hi: plan.watt_hi } : r.watt, sel) : null;
    $("lr-ist").innerHTML = `<h3 class="mini-h">Plan gegen Ist</h3><label class="row">Fahrt <select id="lr-sel"><option value="">wählen …</option>${cands.map((a) => `<option value="${esc(a.id)}" ${a.id === LR.ist ? "selected" : ""}>${dch(a.date)} · ${esc(a.name)} · ${num((a.mv || a.dur) / 3600, 1)} h</option>`).join("")}</select></label>
      ${pi ? `<div class="kv"><div><span>Ø Watt</span><b>${num(pi.avg_w)}</b><small>${esc(pi.lage_avg)}</small></div><div><span>NP</span><b>${num(pi.np_w)}</b><small>${esc(pi.lage_np)}</small></div><div><span>Puls Ø</span><b>${num(pi.hr)}</b></div><div><span>Puls 1./2. Hälfte</span><b>${num(pi.h1)} / ${num(pi.h2)}</b></div><div><span>Entkopplung</span><b>${num(pi.entkopplung, 1)} %</b></div></div>${pi.hinweis ? `<p class="hint">${esc(pi.hinweis)}</p>` : ""}` : `<p class="hint">Wähle eine Fahrt, um sie mit dem Band zu vergleichen. Ø Watt und NP stehen getrennt.</p>`}`;
    $("lr-sel").onchange = (e) => { LR.ist = e.target.value || null; V.langfahrt(); };
    $("t-lr").innerHTML = `<tr><th>Datum</th><th class="l">Fahrt</th><th>h</th><th>Ø W</th><th>NP</th><th>Puls Ø</th><th>Puls 1./2.</th><th>Entkopplung</th><th>Wetter</th></tr>` + (r.basis.map((b) => `<tr><td>${dch(b.date)}</td><td class="wrap">${esc(b.name)}</td><td>${num(b.h, 1)}</td><td>${b.watt}</td><td>${num(b.np)}</td><td>${b.hr}</td><td>${num(b.h1)} / ${num(b.h2)}</td><td>${num(b.dec, 1)} %</td><td>${b.wx ? `${num(b.wx.temperature)} °C ${V.prov("wetter", (FK().wxQuality(b.wx, (C().ACT_BY_ID.get(b.id) || {}).coords && C().ACT_BY_ID.get(b.id).coords[0]) || {}).text || "Garmin-Wetter")}` : "–"}</td></tr>`).join("") || `<tr><td colspan="9">Keine passenden Fahrten.</td></tr>`);
  };

  /* ======================= Koppelläufe ======================= */
  const BR = { max: 45, sel: null };
  V.koppel = function () {
    const D = C().D, F = FK();
    const dec = V.merged("koppel", "koppel", (e) => e.bike + "|" + e.run);
    const inp = $("br-max");
    if (!inp.dataset.init) { inp.dataset.init = 1; inp.value = BR.max; inp.addEventListener("change", () => { BR.max = Math.max(0, Math.min(180, +inp.value || 45)); V.koppel(); }); }
    const pairs = F.findBricks(D.activities, { maxMin: BR.max, entscheide: dec });
    const A = C().ACT_BY_ID;
    const live = pairs.filter((p) => p.status !== "getrennt");
    if (!BR.sel && live.length) BR.sel = live[0].bike + "|" + live[0].run;
    $("t-br").innerHTML = `<tr><th>Datum</th><th class="l">Rad</th><th>Wechsel</th><th class="l">Lauf</th><th class="l">Status</th><th></th></tr>` + (pairs.slice(0, 60).map((p) => {
      const b = A.get(p.bike), r = A.get(p.run), m = F.brickMetrics(b, r, p);
      return `<tr class="${BR.sel === p.bike + "|" + p.run ? "on" : ""}"><td>${dch(b.date)}</td><td class="wrap">${esc(b.typ)} ${C().hmm(m.rad.dauer_s || 0)} h · ${m.rad.watt ? m.rad.watt + " W" : "ohne Watt"}${m.rad.np ? " · NP " + m.rad.np : ""}</td>
        <td>${num(p.wechsel_min, 1)} min${p.genau ? "" : " <small>±1</small>"}${p.mehrsport ? " <small>Mehrsport</small>" : ""}${p.hinweis ? `<br><small>${esc(p.hinweis)}</small>` : ""}</td>
        <td class="wrap">${C().hmm(m.lauf.dauer_s || 0)} h · ${num(r.km, 1)} km${m.lauf.pace_0_5 ? " · 0–5 min " + FK().pace(m.lauf.pace_0_5) : ""}</td><td>${V.badge(p.status)}</td>
        <td class="acts"><button class="btn" data-s="${esc(p.bike)}|${esc(p.run)}">Ansehen</button>${p.status !== "bestätigt" ? `<button class="btn" data-c="${esc(p.bike)}|${esc(p.run)}">Koppeln</button>` : ""}${p.status !== "getrennt" ? `<button class="btn" data-t="${esc(p.bike)}|${esc(p.run)}">Trennen</button>` : ""}</td></tr>`;
    }).join("") || `<tr><td colspan="6">Keine Rad-Lauf-Folge mit höchstens ${BR.max} min Wechsel gefunden.</td></tr>`);
    const set = async (k, status) => { const [bike, run] = k.split("|"); await V.Inbox.upsert("koppel", { bike, run, status, datum: new Date().toISOString() }, (e) => e.bike + "|" + e.run); V.koppel(); };
    $("t-br").querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { BR.sel = b.dataset.s; V.koppel(); }));
    $("t-br").querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => set(b.dataset.c, "bestätigt")));
    $("t-br").querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => set(b.dataset.t, "getrennt")));
    // manuell koppeln
    const recentB = D.activities.filter((a) => a.sport === "rad").slice(-40).reverse(), recentR = D.activities.filter((a) => a.sport === "lauf").slice(-40).reverse();
    $("br-man").innerHTML = `<summary>Von Hand koppeln</summary><form class="inline" id="br-manf"><label>Rad<select name="b">${recentB.map((a) => `<option value="${esc(a.id)}">${dch(a.date)} ${esc(a.start || "")} ${esc(a.name)}</option>`).join("")}</select></label>
      <label>Lauf<select name="r">${recentR.map((a) => `<option value="${esc(a.id)}">${dch(a.date)} ${esc(a.start || "")} ${esc(a.name)}</option>`).join("")}</select></label><button class="btn" type="submit">Koppeln</button></form>`;
    $("br-manf").onsubmit = (e) => { e.preventDefault(); set(e.target.b.value + "|" + e.target.r.value, "bestätigt"); };
    // Detail
    const p = pairs.find((x) => x.bike + "|" + x.run === BR.sel);
    if (!p) { $("br-detail").innerHTML = `<p class="hint">Wähle einen Koppellauf.</p>`; C().chart("c-br", { type: "bar", data: { labels: [], datasets: [] } }); }
    else {
      const b = A.get(p.bike), r = A.get(p.run), m = F.brickMetrics(b, r, p);
      const brickRuns = new Set(pairs.filter((x) => x.status !== "getrennt").map((x) => x.run));
      const sc = F.soloCompare(D.activities, r, brickRuns);
      $("br-detail").innerHTML = `<div class="kv"><div><span>Rad</span><b>${C().hmm(m.rad.dauer_s || 0)} h</b><small>${m.rad.watt ? `Ø ${m.rad.watt} W` : "ohne Watt"}${m.rad.np ? ` · NP ${m.rad.np} W` : " · kein NP"} · Puls ${num(m.rad.hr)}</small></div>
        <div><span>Wechsel</span><b>${num(m.wechsel_min, 1)} min</b><small>${p.genau ? "aus Sekundenwerten" : "aus Startminute ±1 min"}</small></div>
        <div><span>Lauf 0–5 min</span><b>${FK().pace(m.lauf.pace_0_5)}</b><small>Puls ${num((m.lauf.splits[0] || {}).hr)}</small></div><div><span>Lauf 10–20 min</span><b>${FK().pace(m.lauf.pace_10_20)}</b><small>Pulsanstieg ${m.lauf.hr_anstieg != null ? "+" + num(m.lauf.hr_anstieg, 1) : "–"} bpm</small></div>
        <div><span>Drift Lauf</span><b>${m.lauf.drift != null ? num(m.lauf.drift, 1) + " %" : "–"}</b></div><div><span>Solo-Vergleich</span><b>${sc.status === "vergleichbar" ? (sc.diff_s > 0 ? "+" : "") + sc.diff_s + " s/km" : "nicht vergleichbar"}</b><small>${sc.status === "vergleichbar" ? `gegen ${sc.n} ähnliche Solo-Läufe (0–5 min)` : esc(sc.grund)}</small></div></div>
        ${m.hinweise.length ? `<ul class="flags">${m.hinweise.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}<p class="hint">Kein Kausalbeweis: Wetter, Gelände, Verpflegung und Ermüdung bleiben offen.</p>`;
      const sp = m.lauf.splits;
      C().chart("c-br", { type: "bar", data: { labels: sp.map((s) => s.bis ? `${s.von / 60}–${s.bis / 60} min` : `ab ${s.von / 60} min`), datasets: [
        { type: "line", label: "Pace (min/km)", data: sp.map((s) => s.pace), borderColor: C().css("--accent"), backgroundColor: C().css("--accent"), yAxisID: "y", tension: 0, pointRadius: 4 },
        { label: "Puls Ø (bpm)", data: sp.map((s) => s.hr), backgroundColor: C().css("--lt2") + "66", yAxisID: "y2", borderRadius: 3 },
      ] }, options: { scales: { y: { reverse: true, title: { display: true, text: "Pace min/km (oben schneller)" }, ticks: { callback: (v) => FK().pace(v) } }, y2: { position: "right", grid: { display: false }, title: { display: true, text: "Puls bpm" } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => (c.dataset.yAxisID === "y" ? `Pace ${FK().pace(c.raw)} /km` : `Puls ${num(c.raw)} bpm`) } } } } });
    }
    const tr = live.map((x) => ({ x, r: A.get(x.run) })).filter((o) => o.r.sp).map((o) => ({ d: o.r.date, p: (o.r.sp.find((s) => s.von === 0) || {}).pace, w: o.x.wechsel_min })).filter((o) => o.p).reverse();
    C().chart("c-br-trend", { type: "line", data: { labels: tr.map((o) => C().dLabel(o.d)), datasets: [{ label: "Pace 0–5 min nach dem Rad", data: tr.map((o) => o.p), borderColor: C().css("--accent"), backgroundColor: C().css("--accent"), showLine: false, pointRadius: 4 }] },
      options: { scales: { y: { reverse: true, ticks: { callback: (v) => FK().pace(v) }, title: { display: true, text: "min/km" } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${FK().pace(c.raw)} /km · Wechsel ${num(tr[c.dataIndex].w, 1)} min` } } } } });
    $("br-note").textContent = `Erkennung: Lauf beginnt 0–${BR.max} min nach dem Ende einer Radeinheit (Grenze eingeschlossen). Mehrere Läufe oder Fahrten in Frage: Status «auswählen», nichts wird still gekoppelt. Trend ohne Linie, weil Bedingungen selten vergleichbar sind.`;
  };

  /* ======================= Fueling / Train your Gut ======================= */
  const FU = { cur: null, sel: null, sport: "" };
  const prods = () => (V.Inbox.data.fueling_produkte || C().D.fueling_produkte || []);
  V.fueling = function () {
    const D = C().D, F = FK(), A = C().ACT_BY_ID;
    const logs = V.merged("fueling", "fueling").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const dur = (e) => { const a = A.get(e.activity_id); return e.dauer_s || (a ? a.mv || a.dur : null); };
    // Liste
    $("t-fu").innerHTML = `<tr><th>Datum</th><th class="l">Einheit</th><th class="l">Status</th><th>KH</th><th>KH/h</th><th>ml/h</th><th>Na mg/h</th><th>GI max</th><th></th></tr>` + (logs.map((e) => {
      const t = F.fuelingTotals(e, dur(e)), a = A.get(e.activity_id), gi = Math.max(-1, ...(e.gi || []).map((g) => g.schwere ?? -1));
      return `<tr class="${FU.sel === e.id ? "on" : ""}"><td>${dch(e.date)}</td><td class="wrap">${esc(a ? a.name : e.titel || "ohne Aktivität")}${e._lokal ? " " + V.badge("nur hier") : ""}</td><td>${esc(t.status)}</td>
        <td>${t.kh_g != null ? num(t.kh_g) + " g" : t.status === "nicht protokolliert" ? "–" : `≥ ${num(t.kh_min_g)} g`}</td><td>${t.kh_g_h != null ? num(t.kh_g_h) : "–"}</td><td>${t.ml_h != null ? num(t.ml_h) : "–"}</td><td>${t.na_mg_h != null ? num(t.na_mg_h) : "–"}</td><td>${gi >= 0 ? gi + "/5" : "–"}</td>
        <td class="acts"><button class="btn" data-v="${esc(e.id)}">Ansehen</button><button class="btn" data-e="${esc(e.id)}">Bearbeiten</button></td></tr>`;
    }).join("") || `<tr><td colspan="9">Noch keine Einträge. Fehlende Einträge zählen als «nicht protokolliert», nie als 0 g.</td></tr>`);
    $("t-fu").querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => { FU.sel = b.dataset.v; V.fueling(); }));
    $("t-fu").querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => { FU.cur = JSON.parse(JSON.stringify(logs.find((x) => x.id === b.dataset.e))); delete FU.cur._lokal; editor(); $("fu-edit").scrollIntoView({ behavior: "smooth" }); }));
    // Train your Gut: KH/h und Beschwerden je Einheit
    const sp = $("fu-sport"); if (!sp.dataset.init) { sp.dataset.init = 1; sp.onchange = () => { FU.sport = sp.value; V.fueling(); }; }
    const chron = logs.filter((e) => !FU.sport || e.sport === FU.sport).slice().reverse();
    const zt = (V.Inbox.data.notizen || {})["fu-ziel"] || null;
    C().chart("c-fu-gut", { type: "bar", data: { labels: chron.map((e) => C().dLabel(e.date)), datasets: [
      { type: "line", label: "KH g/h (konsumiert)", data: chron.map((e) => F.fuelingTotals(e, dur(e)).kh_g_h), borderColor: C().css("--accent"), backgroundColor: C().css("--accent"), yAxisID: "y", tension: 0, spanGaps: false, pointRadius: 4 },
      { label: "GI-Beschwerden 0–5", data: chron.map((e) => ((e.gi || []).length ? Math.max(...e.gi.map((g) => g.schwere || 0)) : null)), backgroundColor: C().css("--accent-2") + "55", yAxisID: "y2", borderRadius: 3 },
      zt ? { type: "line", label: `Planungsbereich ${zt}`, data: chron.map(() => +zt.split("–")[1]), borderColor: C().css("--accent-2"), borderDash: [5, 4], pointRadius: 0, yAxisID: "y" } : null,
    ].filter(Boolean) }, options: { scales: { y: { min: 0, title: { display: true, text: "g/h" } }, y2: { position: "right", min: 0, max: 5, grid: { display: false }, title: { display: true, text: "GI 0–5" } } }, plugins: { legend: { position: "bottom" } } } });
    $("fu-ziel").value = zt || "";
    $("fu-ziel").onchange = async (e) => { const v = e.target.value.trim().replace(/\s*-\s*/, "–"); V.Inbox.data.notizen = Object.assign({}, V.Inbox.data.notizen, { "fu-ziel": /^\d+–\d+$/.test(v) ? v : null }); await V.Inbox.save(); V.fueling(); };
    // Verlauf einer Einheit
    const s = logs.find((x) => x.id === FU.sel) || logs[0];
    if (s) {
      const d = dur(s) || 3600, bl = F.fuelingBlocks(s, d, 30), gi = F.giContext(s, 60), t = F.fuelingTotals(s, d);
      C().chart("c-fu-time", { type: "bar", data: { labels: bl.map((b) => `${b.von}–${b.bis}`), datasets: [
        { label: "KH je 30 min (g)", data: bl.map((b) => b.kh_g), backgroundColor: C().css("--accent") + "aa", borderRadius: 3, yAxisID: "y" },
        { type: "line", label: "GI-Beschwerde", data: bl.map((b) => { const g = (s.gi || []).filter((x) => x.t_min >= b.von && x.t_min < b.bis); return g.length ? Math.max(...g.map((x) => x.schwere || 0)) : null; }), borderColor: C().css("--lt2"), backgroundColor: C().css("--lt2"), showLine: false, pointStyle: "triangle", pointRadius: 7, yAxisID: "y2" },
      ] }, options: { scales: { x: { title: { display: true, text: "Minuten nach Start" } }, y: { min: 0, title: { display: true, text: "g je 30 min (Summe, keine Stundenrate)" } }, y2: { position: "right", min: 0, max: 5, grid: { display: false } } }, plugins: { legend: { position: "bottom" } } } });
      $("fu-sel").innerHTML = `<b>${dch(s.date)} · ${esc((A.get(s.activity_id) || {}).name || s.titel || "")}</b> · ${esc(t.status)} · aktive Dauer ${t.dauer_s ? C().hmm(t.dauer_s) + " h" : "unbekannt"}${t.unvollstaendig.length ? ` · <span class="down">${esc(t.unvollstaendig.join("; "))}</span>` : ""}
        ${gi.length ? `<ul class="flags">${gi.map((g) => `<li>Minute ${g.t_min}: Beschwerde ${g.schwere}/5${g.notiz ? ` («${esc(g.notiz)}»)` : ""} · davor ${g.vorher_min} min: ${num(g.kh_g)} g KH, ${num(g.wasser_ml)} ml (${esc(g.produkte.join(", ") || "nichts")}) · ${esc(g.hinweis)}</li>`).join("")}</ul>` : ""}`;
    } else { $("fu-sel").innerHTML = ""; C().chart("c-fu-time", { type: "bar", data: { labels: [], datasets: [] } }); }
    editor();
    produkte();
  };
  function newEntry(actId) {
    const a = actId && C().ACT_BY_ID.get(actId);
    return { id: "fu-" + (actId || Date.now()), v: "fueling-1.0", activity_id: actId || null, date: a ? a.date : C().iso(C().today), sport: a ? a.sport : "rad", status: "protokolliert", events: [], gi: [], notiz: "", erfasst: new Date().toISOString() };
  }
  function editor() {
    const box = $("fu-edit"), A = C().ACT_BY_ID, F = FK();
    const acts = C().D.activities.filter((a) => (a.sport === "rad" || a.sport === "lauf") && (a.mv || a.dur || 0) >= 2400).slice(-40).reverse();
    if (!FU.cur) FU.cur = newEntry(acts[0] && acts[0].id);
    const e = FU.cur, a = A.get(e.activity_id), t = F.fuelingTotals(e, e.dauer_s || (a ? a.mv || a.dur : null));
    box.innerHTML = `<form id="fu-form" class="fu-form">
      <div class="row"><label>Einheit<select name="act"><option value="">ohne Aktivität</option>${acts.map((x) => `<option value="${esc(x.id)}" ${x.id === e.activity_id ? "selected" : ""}>${dch(x.date)} · ${esc(x.name)} · ${C().hmm(x.mv || x.dur)} h</option>`).join("")}</select></label>
        <fieldset class="seg2"><legend>Status</legend><label><input type="radio" name="st" value="protokolliert" ${e.status === "protokolliert" ? "checked" : ""}> protokolliert</label><label><input type="radio" name="st" value="nicht protokolliert" ${e.status === "nicht protokolliert" ? "checked" : ""}> nicht protokolliert</label></fieldset>
        <label>Dauer (min, leer = aus der Einheit)<input type="number" name="dur" value="${e.dauer_s ? Math.round(e.dauer_s / 60) : ""}"></label></div>
      <div class="fu-quick">${prods().map((p, i) => `<button type="button" class="btn" data-p="${i}">+ ${esc(p.name)}</button>`).join("") || `<span class="hint">Noch keine Produkte: unten anlegen, dann mit einem Tipp erfassen.</span>`}</div>
      <div class="tablewrap"><table class="t fu-ev"><tr><th>min</th><th>Produkt</th><th>KH g</th><th>ml</th><th>Na mg</th><th>Koffein mg</th><th>getrunken/gegessen</th><th></th></tr>
      ${e.events.map((x, i) => `<tr><td><input type="number" data-ev="${i}:t_min" value="${x.t_min ?? ""}"></td><td><input type="text" data-ev="${i}:produkt" value="${esc(x.produkt || "")}"></td><td><input type="number" step="0.5" data-ev="${i}:kh_g" value="${x.kh_g ?? ""}"></td>
        <td><input type="number" data-ev="${i}:wasser_ml" value="${x.wasser_ml ?? ""}"></td><td><input type="number" data-ev="${i}:natrium_mg" value="${x.natrium_mg ?? ""}"></td><td><input type="number" data-ev="${i}:koffein_mg" value="${x.koffein_mg ?? ""}"></td>
        <td><select data-ev="${i}:anteil">${[1, 0.75, 0.5, 0.25, 0].map((f) => `<option value="${f}" ${(x.anteil ?? 1) === f ? "selected" : ""}>${f * 100} %</option>`).join("")}</select></td><td><button type="button" class="btn" data-rm="${i}">×</button></td></tr>`).join("")}</table></div>
      <div class="row"><button type="button" class="btn" data-add-ev>+ Eintrag</button><button type="button" class="btn" data-add-gi>+ Magen-Darm</button></div>
      ${(e.gi || []).length ? `<div class="tablewrap"><table class="t"><tr><th>min</th><th>Beschwerde 0–5</th><th>Notiz</th><th></th></tr>${e.gi.map((g, i) => `<tr><td><input type="number" data-gi="${i}:t_min" value="${g.t_min ?? ""}"></td><td><input type="number" min="0" max="5" data-gi="${i}:schwere" value="${g.schwere ?? ""}"></td><td><input type="text" data-gi="${i}:notiz" value="${esc(g.notiz || "")}"></td><td><button type="button" class="btn" data-rmg="${i}">×</button></td></tr>`).join("")}</table></div>` : ""}
      <p class="fu-tot">${esc(t.status)} · KH ${t.kh_g != null ? num(t.kh_g) + " g" : t.kh_min_g != null ? "≥ " + num(t.kh_min_g) + " g (unvollständig)" : "–"} · <b>${t.kh_g_h != null ? num(t.kh_g_h) + " g/h" : "– g/h"}</b> · ${t.ml_h != null ? num(t.ml_h) + " ml/h" : "– ml/h"} · ${t.na_mg_h != null ? num(t.na_mg_h) + " mg Na/h" : "– mg Na/h"}</p>
      <label>Notiz<input type="text" name="notiz" value="${esc(e.notiz || "")}" placeholder="Wetter, Hitze, Produktwechsel, nächste kleine Änderung"></label>
      <div class="row"><button type="submit" class="btn primary">Speichern</button><button type="button" class="btn" data-new>Neuer Eintrag</button></div></form>
      <p class="hint">Gezählt wird nur, was eingenommen wurde (halbe Flasche = 50 %). Raten = Summe ÷ aktive Dauer (Bewegungszeit). Leere Felder bleiben unbekannt.</p>`;
    const f = $("fu-form");
    const sync = () => { FU.cur = e; editor(); };
    f.act.onchange = () => { const id = f.act.value || null; const keep = e.events; FU.cur = Object.assign(newEntry(id), { events: keep, gi: e.gi, status: e.status }); editor(); };
    f.querySelectorAll("[name=st]").forEach((r) => (r.onchange = () => { e.status = r.value; sync(); }));
    f.dur.onchange = () => { e.dauer_s = +f.dur.value ? Math.round(+f.dur.value * 60) : null; sync(); };
    f.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { const p = prods()[+b.dataset.p]; const last = e.events.reduce((m, x) => Math.max(m, x.t_min || 0), 0); e.events.push(FK().eventFromProduct(p, e.events.length ? last + 20 : 0, 1)); sync(); }));
    f.querySelectorAll("[data-ev]").forEach((inp) => (inp.onchange = () => { const [i, k] = inp.dataset.ev.split(":"); const v = inp.value; e.events[+i][k] = k === "produkt" ? v : v === "" ? null : +v; sync(); }));
    f.querySelectorAll("[data-gi]").forEach((inp) => (inp.onchange = () => { const [i, k] = inp.dataset.gi.split(":"); const v = inp.value; e.gi[+i][k] = k === "notiz" ? v : v === "" ? null : +v; sync(); }));
    f.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { e.events.splice(+b.dataset.rm, 1); sync(); }));
    f.querySelectorAll("[data-rmg]").forEach((b) => (b.onclick = () => { e.gi.splice(+b.dataset.rmg, 1); sync(); }));
    f.querySelector("[data-add-ev]").onclick = () => { e.events.push({ id: "e" + Date.now(), t_min: null, produkt: "", kh_g: null, wasser_ml: null, natrium_mg: null, koffein_mg: null, anteil: 1 }); sync(); };
    f.querySelector("[data-add-gi]").onclick = () => { e.gi = e.gi || []; e.gi.push({ t_min: null, schwere: null, notiz: "" }); sync(); };
    f.querySelector("[data-new]").onclick = () => { FU.cur = null; editor(); };
    f.onsubmit = async (ev) => { ev.preventDefault(); e.notiz = f.notiz.value.trim(); e.geaendert = new Date().toISOString(); e.events.forEach((x, i) => { if (!x.id) x.id = "e" + i; }); await V.Inbox.upsert("fueling", JSON.parse(JSON.stringify(e))); FU.sel = e.id; V.fueling(); };
  }
  function produkte() {
    const P = prods();
    $("fu-prod").innerHTML = `<summary>Produkte (${P.length})</summary><p class="hint">Deine Vorlagen mit Angaben je Stück bzw. Flasche, z. B. von der Packung. Beim Erfassen werden die Werte ins Ereignis kopiert; die Vorlage selbst zählt nie.</p>
      <div class="tablewrap"><table class="t"><tr><th>Name</th><th>Art</th><th>KH g</th><th>ml</th><th>Na mg</th><th>Koffein mg</th><th></th></tr>${P.map((p, i) => `<tr><td>${esc(p.name)}</td><td>${esc(p.art || "")}</td><td>${num(p.kh_g, 1)}</td><td>${num(p.wasser_ml)}</td><td>${num(p.natrium_mg)}</td><td>${num(p.koffein_mg)}</td><td><button class="btn" data-d="${i}">×</button></td></tr>`).join("")}</table></div>
      <form class="inline" id="fu-pf"><label>Name<input name="n" required></label><label>Art<select name="a"><option>Gel</option><option>Getränk</option><option>Riegel</option><option>andere</option></select></label><label>KH g<input type="number" step="0.5" name="kh"></label><label>ml<input type="number" name="ml"></label><label>Na mg<input type="number" name="na"></label><label>Koffein mg<input type="number" name="kf"></label><button class="btn" type="submit">Anlegen</button></form>`;
    const save = async (list) => { V.Inbox.data.fueling_produkte = list; await V.Inbox.save(); V.fueling(); };
    $("fu-prod").querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => save(P.filter((_, i) => i !== +b.dataset.d))));
    $("fu-pf").onsubmit = (e) => { e.preventDefault(); const f = e.target; const n = (x) => (x.value === "" ? null : +x.value); save(P.concat({ id: "p" + Date.now(), name: f.n.value.trim(), art: f.a.value, kh_g: n(f.kh), wasser_ml: n(f.ml), natrium_mg: n(f.na), koffein_mg: n(f.kf) })); };
  }
})();
