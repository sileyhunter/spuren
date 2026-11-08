/* Ironman Notebook – V5.6 Oberflächen: RPE und Readiness (rpe-1.0), Geplant/Ist (plan-1.0), Konstanz, Saison 2027 (saison-1.0),
 * Verpflegung erweitert (energie-1.0). Keine neuen Haupttabs: Karten in Heute, Kalender, Fortschritt und Ausdauer.
 * Regeln: unbekannt bleibt unbekannt; Modelle heissen Modell; keine Trainingsanweisung, Enduco wird nie überschrieben. */
(function () {
  "use strict";
  const V = (window.V56 = window.V56 || {});
  const $ = (id) => document.getElementById(id);
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const UI = () => window.V5UI;
  const pill = (s, x) => (UI() && UI().badge ? UI().badge(s, x) : `<span class="badge">${s}</span>`);
  const median = (a) => (window.AN ? AN.util.median(a) : null);

  /* ======================= RPE nach jeder Einheit (rpe-1.0) ======================= */
  const GEFUEHL = ["sehr gut", "gut", "normal", "zäh", "schlecht"];
  const BEREICH = ["Beine", "Waden/Achilles", "Knie", "Hüfte", "Rücken", "Schulter/Nacken", "anderes"];
  const rpeListe = (C) => UI().merged("rpe", "rpe");
  V.rpeVon = (C, id) => rpeListe(C).find((r) => r.id === id) || null;
  window.RPE = {
    karte(el, a, offen) {
      const C = UI().C, r = V.rpeVon(C, a.id) || {};
      el.innerHTML = `<details class="more ex-rpe" ${offen ? "open" : ""}><summary>${r.rpe ? `Gefühl: RPE ${r.rpe}${r.gefuehl ? " · " + r.gefuehl : ""}${r.muskel ? ` · Muskulatur ${r.muskel}/3` : ""} – ändern` : "Wie war die Einheit? (RPE 1–10) – noch nicht bewertet"}</summary>
        <form class="rpe-f" id="rpe-f"><div class="rpe-skala" role="group" aria-label="RPE">${Array.from({ length: 10 }, (_, i) => `<button type="button" class="btn rpe-b" data-r="${i + 1}" aria-pressed="${r.rpe === i + 1}">${i + 1}</button>`).join("")}</div>
        <p class="hint">1 = sehr leicht, 3 = locker, 5 = mittel, 7 = hart, 9–10 = maximal (Borg CR-10).</p>
        <div class="css-grid"><label>Gefühl<select name="g"><option value="">–</option>${GEFUEHL.map((g) => `<option ${r.gefuehl === g ? "selected" : ""}>${g}</option>`).join("")}</select></label>
          <label>Muskuläre Ermüdung<select name="m"><option value="">–</option>${["0 keine", "1 leicht", "2 deutlich", "3 stark"].map((x, i) => `<option value="${i}" ${r.muskel === i ? "selected" : ""}>${x}</option>`).join("")}</select></label>
          <label>Bereich<select name="b"><option value="">–</option>${BEREICH.map((b) => `<option ${r.bereich === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <label class="span2">Beschwerden / Notiz<input name="n" value="${(r.notiz || "").replace(/"/g, "&quot;")}" placeholder="optional"></label></div>
        <div class="row"><button class="btn primary" type="submit">Speichern</button><span class="hint" id="rpe-ok"></span></div></form></details>`;
      const f = el.querySelector("#rpe-f"); let wahl = r.rpe || null;
      f.querySelectorAll(".rpe-b").forEach((b) => (b.onclick = () => { wahl = +b.dataset.r; f.querySelectorAll(".rpe-b").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
      f.onsubmit = async (e) => {
        e.preventDefault(); if (!wahl) { el.querySelector("#rpe-ok").textContent = "RPE antippen."; return; }
        const mv = a.mv || a.dur;
        await UI().Inbox.upsert("rpe", { id: a.id, act: a.id, datum: a.date, sport: a.sport, rpe: wahl, gefuehl: f.g.value || null, muskel: f.m.value === "" ? null : +f.m.value,
          bereich: f.b.value || null, notiz: f.n.value.trim() || null, srpe: AN.srpe(wahl, mv), tl: isNum(a.tss) ? Math.round(a.tss) : null, v: AN.VERSIONS.rpe, erfasst: new Date().toISOString() });
        el.querySelector("#rpe-ok").textContent = "Gespeichert (auf dem Gerät, verschlüsselt).";
        if ($("v56-rpe")) V.heute(UI().C);
      };
    },
  };

  /* ======================= Heute: Einheiten bewerten, Gefühl ↔ Morgenwerte ======================= */
  V.heute = function (C) {
    const box = $("v56-rpe"); if (!box) return;
    const A = C.D.activities.filter((a) => (a.mv || a.dur || 0) >= 1200).slice(-6).reverse();
    const R = new Map(rpeListe(C).map((r) => [r.id, r]));
    box.innerHTML = `<ul class="v56-acts">${A.map((a) => { const r = R.get(a.id);
      return `<li><span class="dot" style="background:${(C.SPORTS[a.sport] || C.SPORTS.andere).color}"></span><span class="v56-an"><b>${C.dateCH(a.date)}</b> ${C.esc(a.name)}<small>${C.hmm(a.mv || a.dur)} h${isNum(a.tss) ? ` · TL ${Math.round(a.tss)}` : ""}${a.wk ? ` · Plan «${C.esc(a.wk.name || "")}»${isNum(a.wk.im_ziel) ? ` ${a.wk.im_ziel} % im Ziel` : ""}` : ""}</small></span>
        <span class="v56-r">${r ? `<span class="badge ok">RPE ${r.rpe}</span>` : `<span class="badge next">offen</span>`}</span><button class="btn" data-ex="${C.esc(a.id)}" ${r ? "" : 'data-ex-rpe="1"'}>${r ? "Analysieren" : "Bewerten"}</button></li>`; }).join("")}</ul>`;
    kalibrierung(C);
  };
  /** Individuelle Readiness-Kalibrierung: Morgenwerte (HRV-, Ruhepuls-Abweichung zur eigenen 60-Tage-Referenz, Schlaf) ↔ RPE
   *  derselben Tages-Einheiten bei ähnlicher Last. Erst ab 20 Paaren; nur Rangkorrelation mit n, keine Prozentwerte. */
  function kalibrierung(C) {
    const el = $("v56-kal"); if (!el) return;
    const R = rpeListe(C).filter((r) => isNum(r.rpe));
    const days = new Map((C.D.days || []).map((d) => [d.date, d])), byDate = [...days.keys()].sort();
    const ref = (date, k) => { const i = byDate.indexOf(date); const v = byDate.slice(Math.max(0, i - 60), i).map((d) => days.get(d)[k]).filter(isNum); return v.length >= 20 ? median(v) : null; };
    const pairs = R.map((r) => { const d = days.get(r.datum); if (!d) return null; const h = ref(r.datum, "hrv"), rh = ref(r.datum, "rhr");
      return { rpe: r.rpe, tl: r.tl, dhrv: isNum(d.hrv) && h ? (d.hrv - h) / h : null, drhr: isNum(d.rhr) && rh ? d.rhr - rh : null, schlaf: d.sleepH }; }).filter(Boolean);
    const N = 20, n = pairs.length;
    if (n < N) { el.innerHTML = `<p class="hint">Persönliche Kalibrierung: ${n} von ${N} bewerteten Einheiten mit Morgenwerten. Ab ${N} zeigt die Seite, welcher Morgenwert bei dir mit dem Belastungsgefühl zusammenhängt (Rangkorrelation, keine Prozentwerte).</p>`; return; }
    const kor = (k) => { const p = pairs.filter((x) => isNum(x[k]) && isNum(x.rpe)); return p.length >= N ? { r: AN.rang(p.map((x) => x[k]), p.map((x) => x.rpe)), n: p.length } : null; };
    const L = [["dhrv", "HRV gegenüber Referenz"], ["drhr", "Ruhepuls gegenüber Referenz"], ["schlaf", "Schlafdauer"]].map(([k, l]) => ({ l, ...(kor(k) || {}) })).filter((x) => isNum(x.r));
    el.innerHTML = `<p class="hint">Persönliche Kalibrierung (rpe-1.0, n = ${n}): ${L.map((x) => `${x.l}: ρ = ${x.r.toFixed(2)} (n ${x.n})`).join(" · ")}. |ρ| unter 0.3 = kein brauchbarer Zusammenhang. Nur Zusammenhang, keine Ursache; Last der Einheit nicht herausgerechnet.</p>`;
  }

  /* ======================= Fortschritt: Konstanz und Belastungsverträglichkeit ======================= */
  V.konstanz = function (C) {
    const el = $("v56-konstanz"); if (!el) return;
    const F = window.FK, bis = C.iso(C.today), von = F.addDays(bis, -364), W = AN.wochenIst(C.D.activities, von, bis);
    const wochen = []; for (let d = F.addDays(von, -((new Date(von + "T12:00:00Z").getUTCDay() + 6) % 7)); d <= bis; d = F.addDays(d, 7)) wochen.push(d);
    const h = wochen.map((w) => { const r = W.get(w); return r ? r.rad + r.lauf + r.schwimm + r.andere : 0; });
    const n = (w) => C.D.activities.filter((a) => a.date >= w && a.date <= F.addDays(w, 6) && (a.mv || a.dur || 0) >= 1200).length;
    const mitTraining = wochen.filter((w) => n(w) >= 3).length, m = h.reduce((s, x) => s + x, 0) / h.length, sd = Math.sqrt(h.reduce((s, x) => s + (x - m) ** 2, 0) / h.length);
    const dates = [...new Set(C.D.activities.filter((a) => a.date >= von).map((a) => a.date))].sort();
    let gap = 0, gapAt = null; for (let i = 1; i < dates.length; i++) { const g = (new Date(dates[i]) - new Date(dates[i - 1])) / 864e5 - 1; if (g > gap) { gap = g; gapAt = dates[i - 1]; } }
    const load = new Map(); for (const a of C.D.activities) load.set(a.date, (load.get(a.date) || 0) + (a.tss || 0));
    const pm = C.D.activities.length ? F.pmc(load, F.addDays(von, -120), bis) : null;
    let ramp = null;
    if (pm && pm.length > 8) { const r = []; for (let i = 7; i < pm.length; i++) if (pm[i].date >= von && new Date(pm[i].date + "T12:00:00Z").getUTCDay() === 0) r.push(pm[i].ctl - pm[i - 7].ctl); ramp = r.length ? { max: Math.max(...r), ueber: r.filter((x) => x > 8).length } : null; }
    const rp = rpeListe(C).filter((r) => r.datum >= von);
    el.innerHTML = `<dl class="ex-kv v56-kk"><div><dt>Wochen mit ≥ 3 Einheiten</dt><dd>${mitTraining} von ${wochen.length}</dd></div>
      <div><dt>Ø Stunden pro Woche</dt><dd>${C.fmt(m, 1)} h ± ${C.fmt(sd, 1)}</dd></div><div><dt>Längste Pause</dt><dd>${gap} Tage${gapAt ? ` (ab ${C.dateCH(gapAt)})` : ""}</dd></div>
      ${ramp ? `<div><dt>Stärkster Fitness-Anstieg</dt><dd>+${C.fmt(ramp.max, 1)} pro Woche</dd></div><div><dt>Wochen (Mo–So) mit Anstieg > 8</dt><dd>${ramp.ueber}</dd></div>` : ""}
      <div><dt>Bewertete Einheiten (RPE)</dt><dd>${rp.length}</dd></div></dl>
      <p class="hint">Letzte 52 Wochen, Bewegungszeit aller Sportarten. Fitness-Anstieg = Veränderung der Fitness (42-Tage-Mittel der Trainingslast) innerhalb einer Woche; Werte über etwa 8 pro Woche gelten in der Literatur oft als steil (Orientierung, keine Grenze). Belastungsverträglichkeit wird mit RPE und Beschwerden aussagekräftiger: jetzt ${rp.length} Einträge.</p>`;
  };

  /* ======================= Kalender: Geplant gegenüber absolviert (plan-1.0) ======================= */
  V.plan = function (C) {
    const el = $("v56-plan"); if (!el) return;
    const A = C.D.activities.filter((a) => a.wk).sort((x, y) => y.date.localeCompare(x.date));
    const F = window.FK, von = F.addDays(C.iso(C.today), -27);
    const plan = (C.D.planned || []).filter((p) => p.date >= von);
    const ist = (p) => C.D.activities.find((a) => a.date === p.date && (a.sport === p.sport || (p.sport === "rad" && a.sport === "rad")));
    el.innerHTML = `<p class="hint">Quelle der Pläne: das Workout, das auf der Uhr lief (aus der FIT-Datei), und der Garmin-Kalender. Enduco-Einheiten kommen über Garmin auf die Uhr; eine direkte Enduco-Schnittstelle gibt es hier nicht, und welcher Dienst ein Workout erstellt hat, steht nicht in der FIT-Datei. Zwift-Dateien enthalten keine Workout-Schritte. ${A.length} Einheiten mit Workout-Struktur seit ${A.length ? C.dateCH(A[A.length - 1].date) : "–"}.</p>
      <div class="tablewrap"><table class="t v56-pt"><tr><th>Datum</th><th>Workout</th><th>Plan</th><th>Ist</th><th>im Ziel</th><th>Hauptteil</th><th>RPE</th><th></th></tr>${A.slice(0, 12).map((a) => {
        const h = AN.hauptteil(a.wk), r = V.rpeVon(C, a.id), g = AN.gleicheEinheiten(C.D.activities, a)[0];
        const ht = h ? (a.sport === "rad" ? `${h.w ?? "–"} W` : h.v ? `${Math.floor(1000 / h.v / 60)}:${String(Math.round((1000 / h.v) % 60)).padStart(2, "0")}` : "–") + ` · ${h.hr ?? "–"} bpm` : "–";
        return `<tr><td>${C.dateCH(a.date)}</td><td class="wrap">${C.esc(a.wk.name || "")}${g ? `<br><small>früher ${C.dateCH(g.date)}: ${C.esc(g.text)}</small>` : ""}</td><td>${a.wk.plan_s ? C.hmm(a.wk.plan_s) : a.wk.plan_m ? (a.wk.plan_m >= 2000 ? C.fmt(a.wk.plan_m / 1000, 1) + " km" : a.wk.plan_m + " m") : "offen"}</td><td>${C.hmm(a.wk.ist_s)}</td>
          <td>${isNum(a.wk.im_ziel) ? a.wk.im_ziel + " %" : "–"}</td><td>${ht}</td><td>${r ? r.rpe : "–"}</td><td><button class="btn" data-ex="${C.esc(a.id)}">Details</button></td></tr>`; }).join("")}</table></div>
      ${plan.length ? `<p class="hint">Garmin-Kalender, letzte 4 Wochen: ${plan.map((p) => `${C.dateCH(p.date)} «${C.esc(p.title)}» ${C.hmm(p.dur_s)} h → ${ist(p) ? "absolviert" : "keine Einheit gefunden"}`).join(" · ")}</p>` : ""}`;
  };

  /* ======================= Kalender: Saison 2027 (saison-1.0) ======================= */
  const PH_COL = { "Grundlage": "#cfe3f1", "Aufbau": "#9cc7e6", "Wettkampfspezifisch": "#5f9fd1", "Taper": "#f2c14e", "B-Rennen (Mini-Taper)": "#f6d98a" };
  V.saison = function (C) {
    const el = $("v56-saison"); if (!el) return;
    const F = window.FK, heute = C.iso(C.today);
    const races = ((C.D.config || {}).races || []).map((r) => ({ ...r, prio: /hamburg/i.test(r.name) ? "A" : "B" }));
    const S = AN.saison(heute, races); if (!S) { el.innerHTML = `<p class="hint">Kein Hauptwettkampf in den Daten.</p>`; return; }
    const lokal = ((UI().Inbox.data || {}).saison || [])[0] || (C.D.saison_plan || [])[0] || {};
    const ist8 = AN.wochenIst(C.D.activities, F.addDays(heute, -56), heute), h8 = [...ist8.values()].map((r) => r.rad + r.lauf + r.schwimm);
    const j52 = AN.wochenIst(C.D.activities, F.addDays(heute, -364), heute), h52 = [...j52.values()].map((r) => r.rad + r.lauf + r.schwimm).sort((a, b) => b - a);
    const top4 = h52.length >= 4 ? (h52[0] + h52[1] + h52[2] + h52[3]) / 4 : null;
    const jetzt = lokal.jetzt ?? (h8.length ? Math.round(median(h8) * 2) / 2 : 8);
    const spitze = lokal.spitze ?? Math.round(Math.max(jetzt * 1.35, top4 || 0) * 2) / 2;   // nie über eigene Erfahrung hinaus geraten: Ø deiner 4 grössten Wochen
    const W = S.wochen, iT = W.findIndex((w) => w.phase === "Taper"), N = iT > 0 ? iT : W.length;
    const plan = W.map((w, i) => { if (w.phase === "Taper") return Math.round(spitze * (i === W.length - 1 ? 0.4 : 0.6) * 2) / 2; const ziel = jetzt + (spitze - jetzt) * Math.min(1, i / Math.max(1, N - 1));
      return Math.round(ziel * (w.erholung ? 0.65 : w.phase.startsWith("B-Rennen") ? 0.5 : 1) * 2) / 2; });
    const IST = AN.wochenIst(C.D.activities, W[0].woche, F.addDays(W[W.length - 1].woche, 6));
    const enduco = new Map(); for (const p of C.D.planned || []) { const mo = F.addDays(p.date, -((new Date(p.date + "T12:00:00Z").getUTCDay() + 6) % 7)); enduco.set(mo, (enduco.get(mo) || 0) + (p.dur_s || 0) / 3600); }
    const w = 760, h = 240, bw = (w - 34) / W.length, maxH = Math.max(spitze, ...W.map((x) => { const r = IST.get(x.woche); return r ? r.rad + r.lauf + r.schwimm : 0; })) * 1.1;
    const Y = (v) => h - 22 - (v / maxH) * (h - 40);
    const svg = `<svg viewBox="0 0 ${w} ${h}" class="v56-saison" role="img" aria-label="Saison bis ${S.haupt.name}: Phasen, geplante und absolvierte Stunden je Woche">
      ${W.map((x, i) => `<rect x="${(34 + i * bw).toFixed(1)}" y="0" width="${(bw - 1).toFixed(1)}" height="14" fill="${PH_COL[x.phase] || "#ddd"}"><title>${x.woche}: ${x.phase}${x.erholung ? " · Erholungswoche" : ""}</title></rect>`).join("")}
      ${W.map((x, i) => `<rect x="${(34 + i * bw + 1).toFixed(1)}" y="${Y(plan[i]).toFixed(1)}" width="${Math.max(1, bw - 3).toFixed(1)}" height="${(h - 22 - Y(plan[i])).toFixed(1)}" fill="${x.erholung ? "#e9eef2" : "#d7e6f2"}" stroke="${x.erholung ? "#9aa8b4" : "none"}" stroke-dasharray="2 2"><title>${x.woche}: Vorschlag ${plan[i]} h${x.erholung ? " (Erholung)" : ""}</title></rect>`).join("")}
      ${W.map((x, i) => { const r = IST.get(x.woche); if (!r || x.woche > heute) return ""; const v = r.rad + r.lauf + r.schwimm; return `<circle cx="${(34 + i * bw + bw / 2).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4.5" fill="#148a7e"><title>${x.woche}: absolviert ${v.toFixed(1)} h</title></circle>`; }).join("")}
      ${W.map((x, i) => (x.rennen.length ? `<text x="${Math.min(w - 30, 34 + i * bw + bw / 2).toFixed(1)}" y="${h - 4}" text-anchor="middle" class="v56-rl">${x.rennen.join(", ")}</text>` : "")).join("")}
      ${[0, Math.round(maxH / 2), Math.round(maxH)].map((v) => `<text x="28" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="v56-ax">${v} h</text><line x1="34" x2="${w}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(31,51,71,.1)"/>`).join("")}
    </svg>`;
    const naechste = W.filter((x) => x.woche >= F.addDays(heute, -6)).slice(0, 4);
    const ant = (() => { const r = { rad: 0, lauf: 0, schwimm: 0 }; for (const v of ist8.values()) { r.rad += v.rad; r.lauf += v.lauf; r.schwimm += v.schwimm; } const s = r.rad + r.lauf + r.schwimm || 1; return { rad: r.rad / s, lauf: r.lauf / s, schwimm: r.schwimm / s }; })();
    el.innerHTML = `<div class="v56-legend">${Object.entries(PH_COL).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join("")}<span><i class="dot" style="background:#148a7e"></i>absolviert</span><span><i style="background:#d7e6f2"></i>Vorschlag</span></div>
      <div class="v56-svgwrap">${svg}</div>
      <p class="hint">Deine Referenzen (Schwimmen, Rad, Laufen): letzte 8 Wochen Median ${h8.length ? C.fmt(median(h8), 1) : "–"} h; grösste Woche der letzten 52 Wochen ${h52.length ? C.fmt(h52[0], 1) : "–"} h; Ø der 4 grössten ${top4 ? C.fmt(top4, 1) : "–"} h.</p>
      <form class="css-form v56-sf" id="v56-sf"><div class="css-grid"><label>Stunden pro Woche jetzt<input name="j" type="number" step="0.5" min="2" max="30" value="${jetzt}"></label>
        <label>Stunden in der Spitzenwoche<input name="s" type="number" step="0.5" min="2" max="35" value="${spitze}"></label></div>
        <div class="row"><button class="btn" type="submit">Vorschlag neu rechnen</button><span class="hint">nur auf diesem Gerät, überschreibt Enduco nicht</span></div></form>
      <div class="tablewrap"><table class="t"><tr><th>Woche ab</th><th>Phase</th><th>Vorschlag</th><th>Rad · Lauf · Schwimmen</th><th>Enduco (Garmin)</th><th>Ist</th><th>lange · Koppel</th></tr>${naechste.map((x) => { const i = W.indexOf(x), r = IST.get(x.woche), e = enduco.get(x.woche);
        return `<tr><td>${C.dateCH(x.woche)}</td><td>${x.phase}${x.erholung ? " · Erholung" : ""}</td><td>${plan[i]} h</td><td>${C.fmt(plan[i] * ant.rad, 1)} · ${C.fmt(plan[i] * ant.lauf, 1)} · ${C.fmt(plan[i] * ant.schwimm, 1)} h</td><td>${e ? C.fmt(e, 1) + " h" : "–"}</td><td>${r ? C.fmt(r.rad + r.lauf + r.schwimm, 1) + " h" : "–"}</td><td>${r ? r.lang : "–"} · ${(C.D.koppel || []).filter((k) => k.status !== "getrennt" && k.date >= x.woche && k.date <= F.addDays(x.woche, 6)).length}</td></tr>`; }).join("")}</table></div>
      <p class="hint">Entscheidungshilfe (${S.regel}), keine Vorgabe: ${S.annahmen}; Spitzenwoche vorbelegt mit dem grösseren Wert aus 1.35 × «jetzt» und dem Ø deiner 4 grössten Wochen; Stunden linear von «jetzt» bis zur Spitzenwoche vor dem Taper, Erholungswochen 65 %, Taper 60 % und 40 %. Aufteilung nach deinem Verhältnis der letzten 8 Wochen (Rad ${Math.round(ant.rad * 100)} %, Lauf ${Math.round(ant.lauf * 100)} %, Schwimmen ${Math.round(ant.schwimm * 100)} %). «Lange» = Rad ≥ 3 h oder Lauf ≥ 1.5 h. Enduco-Stunden nur, soweit Workouts im Garmin-Kalender stehen.</p>`;
    $("v56-sf").onsubmit = async (e) => { e.preventDefault(); await UI().Inbox.upsert("saison", { id: "saison-2027", jetzt: +e.target.j.value, spitze: +e.target.s.value, v: AN.VERSIONS.saison, geaendert: new Date().toISOString() }); V.saison(C); };
  };

  /* ======================= Ausdauer: Ermüdungsresistenz (ermuedung-1.0) ======================= */
  V.ermuedung = function (C) {
    const el = $("v56-ermuedung"); if (!el) return;
    const A = C.D.activities.filter((a) => a.sport === "rad" && a.fr).sort((x, y) => y.date.localeCompare(x.date));
    const rows = A.slice(0, 10).map((a) => { const e = AN.ermuedungRad(a.fr), d = AN.dauerleistung(a.fr);
      return `<tr><td>${C.dateCH(a.date)}</td><td class="wrap">${C.esc(a.name)}</td><td>${C.hmm(a.mv || a.dur)}</td><td>${e && e.status === "ok" ? `${e.frueh[1]}→${e.spaet[1]} W: ${e.dhr > 0 ? "+" : ""}${C.fmt(e.dhr, 1)} bpm` : `<small>${C.esc(e ? e.grund : "–")}</small>`}</td>
        <td>${d ? [2, 3, 4, 5].map((h) => (isNum(d.rel[h]) ? `${h} h: ${Math.round(d.rel[h] * 100)} %` : "")).filter(Boolean).join(" · ") || "–" : "–"}</td><td>${a.wx && isNum(a.wx.temperature) ? Math.round(a.wx.temperature) + " °C" : a.indoor ? "Rolle" : "–"}</td><td><button class="btn" data-ex="${C.esc(a.id)}">Öffnen</button></td></tr>`; });
    el.innerHTML = `<div class="tablewrap"><table class="t"><tr><th>Datum</th><th>Fahrt</th><th>Dauer</th><th>Puls früh → spät bei gleicher Leistung</th><th>beste 20 min nach X h (Anteil frisch)</th><th>Wetter</th><th></th></tr>${rows.join("")}</table></div>
      <p class="hint">Ermüdungsresistenz (ermuedung-1.0): je Fahrt ≥ 2 h gleichmässige 10-min-Blöcke ab Minute 10; Puls früh (Start < 90 min) gegen spät (≥ 150 min) bei ±10 W. Weil beide Blöcke aus derselben Fahrt stammen, fallen Tagesform und Leistungsmesser weitgehend heraus; Hitze, Nahrung und Gelände nicht. Beste 20 min nach X h: nur aussagekräftig, wenn du spät auch hart gefahren bist. Den Vergleich über Zeiträume zeigt «Meine Entwicklung» (Fortschritt).</p>`;
  };

  /* ======================= Ausdauer: Verpflegung erweitert (energie-1.0) ======================= */
  const KH_ANTEIL = { z1: [0.4, 0.6], z2: [0.6, 0.8], z3: [0.85, 1.0] };   // Modell (Annahme), nicht gemessen
  V.verpflegung = function (C) {
    const el = $("v56-energie"); if (!el) return;
    const logs = UI().merged("fueling", "fueling").filter((e) => e.status !== "nicht protokolliert");
    const lang = C.D.activities.filter((a) => (a.mv || a.dur || 0) >= 5400 && ["rad", "lauf"].includes(a.sport)).slice(-8).reverse();
    const zon = (a) => { const z = a.zones || []; const s = z.reduce((x, y) => x + (y || 0), 0); return s ? { z1: ((z[0] || 0) + (z[1] || 0)) / s, z2: (z[2] || 0) / s, z3: ((z[3] || 0) + (z[4] || 0)) / s } : null; };
    const rows = lang.map((a) => {
      const E = AN.energie(a, null), log = logs.find((l) => l.activity_id === a.id), t = log ? FK.fuelingTotals(log, a.mv || a.dur) : null, z = zon(a), h = (a.mv || a.dur) / 3600;
      let kh = null;
      if (E.kcal && z) { const lo = (z.z1 * KH_ANTEIL.z1[0] + z.z2 * KH_ANTEIL.z2[0] + z.z3 * KH_ANTEIL.z3[0]) * E.kcal[0] / 4.1 / h, hi = (z.z1 * KH_ANTEIL.z1[1] + z.z2 * KH_ANTEIL.z2[1] + z.z3 * KH_ANTEIL.z3[1]) * E.kcal[1] / 4.1 / h; kh = [Math.round(lo), Math.round(hi)]; }
      const ref = h >= 2.5 ? "bis 90 g/h" : h >= 2 ? "bis 60 g/h" : h >= 1 ? "ca. 30 g/h" : "–";   // Jeukendrup 2014: 1–2 h ≈ 30, > 2 h bis 60, > 2.5 h bis 90 g/h
      return `<tr><td>${C.dateCH(a.date)}</td><td class="wrap">${C.esc(a.name)}</td><td>${C.hmm(a.mv || a.dur)}</td><td>${t ? (isNum(t.kh_g_h) ? `${C.fmt(t.kh_g_h)} g/h` : t.status) : `<span class="badge muted">nicht protokolliert</span>`}</td>
        <td>${E.kcal ? `${E.kcal[0]}–${E.kcal[1]} kcal` : "unbekannt"}</td><td>${kh ? `${kh[0]}–${kh[1]} g/h` : "–"}</td><td>${ref}</td></tr>`; });
    el.innerHTML = `<div class="tablewrap"><table class="t v56-et"><tr><th>Datum</th><th>Einheit</th><th>Dauer</th><th>aufgenommen (KH)</th><th>Verbrauch (geschätzt)</th><th>KH-Verbrauch (Modell)</th><th>Richtwert Zufuhr</th></tr>${rows.join("")}</table></div>
      <p class="hint"><b>Aufgenommen</b> = nur deine Einträge im Fueling-Protokoll (fehlt der Eintrag: «nicht protokolliert», nie 0 g). <b>Verbrauch</b> Rad = Arbeit aus der Leistung (Ø W × Bewegungszeit) mit Wirkungsgrad 22–25 % (Annahme); ohne Leistung (z. B. Laufen) unbekannt, weil Kalorien je Einheit nicht in den Daten stehen. <b>KH-Verbrauch (Modell)</b> = Verbrauch × KH-Anteil je Garmin-Pulszone (Z1–2: 40–60 %, Z3: 60–80 %, Z4–5: 85–100 %; allgemeine Physiologie, nicht gemessen – persönlich nur mit Spiroergometrie). <b>Richtwert</b> = allgemeine Empfehlung zur Zufuhr nach Dauer (Jeukendrup 2014: 1–2 h ca. 30 g/h, über 2 h bis 60 g/h, über 2.5 h bis 90 g/h), keine persönliche Vorgabe. In deinen FIT- und Garmin-Daten sind keine Einnahmen während der Einheit erfasst (geprüft, siehe «Import prüfen»).</p>`;
  };

  /* ======================= Einbindung ======================= */
  V.zeichnen = function (tab, C) {
    if (tab === "heute") V.heute(C);
    if (tab === "kalender") { V.plan(C); V.saison(C); }
    if (tab === "training") V.konstanz(C);
    if (tab === "ausdauer") { V.ermuedung(C); V.verpflegung(C); }
  };
})();
