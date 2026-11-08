/* Spuren & Formkurve – V5/V4-Module: Rad-Fahrzeit (Physik), Aerotest CdA (A-B-A), Schwimm-Video-Coach, Demo-Daten. */
(function () {
  "use strict";
  const V = (window.V5UI = window.V5UI || {});
  const $ = (id) => document.getElementById(id);
  const FK = () => window.FK;
  const esc = (s) => V.esc(s), num = (v, d) => V.num(v, d);
  const C = () => V.C;
  const hav = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b[1] - a[1]) * r, dLo = (b[0] - a[0]) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const toPts = (ll, ele) => { const out = []; let d = 0; ll.forEach((p, i) => { if (i) d += hav(ll[i - 1], p); out.push({ d, ele: ele ? ele[i] ?? null : null }); }); return out; };
  function parseGpxPts(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const ns = [...doc.getElementsByTagName("trkpt")].concat([...doc.getElementsByTagName("rtept")]);
    const ll = [], ele = [];
    for (const n of ns) { ll.push([+n.getAttribute("lon"), +n.getAttribute("lat")]); const e = n.getElementsByTagName("ele")[0]; ele.push(e ? +e.textContent : null); }
    return { ll, ele: ele.some((x) => x != null) ? ele : null };
  }

  /* ======================= Rad-Fahrzeit (eta-1.0) ======================= */
  const ETA = { src: "flach", gpx: null };
  V.eta = function () {
    const box = $("eta-card"); if (!box) return;
    if (!box.dataset.init) {
      box.dataset.init = 1;
      const kg = (C().weights && C().weights().slice(-1)[0] || {}).kg;
      $("eta-form").innerHTML = `<label>Leistung (W)<input type="number" name="P" value="200"></label><label>Fahrer + Rad (kg) <small class="badge muted">Annahme</small><input type="number" name="m" value="${Math.round((kg || 75) + 8.5)}" title="${kg ? `letzte Waage ${kg} kg + 8,5 kg Rad und Ausrüstung` : "kein Gewicht erfasst: 75 kg + 8,5 kg angenommen"}"></label>
        <label>CdA Rad + Position (m²) <small class="badge muted">Annahme</small><input type="number" step="0.005" name="cda" value="0.30"></label><label>Crr Reifen + Belag <small class="badge muted">Annahme</small><input type="number" step="0.0005" name="crr" value="0.0040"></label>
        <label>Temperatur (°C)<input type="number" name="temp" value="15"></label><label>Wind längs (km/h)<input type="number" name="wind" value="0" title="positiv = Rückenwind, negativ = Gegenwind"></label>
        <label>Abfahrt höchstens (km/h)<input type="number" name="vmax" value="60"></label><label>Pausen (min)<input type="number" name="pause" value="0"></label>
        <label>Strecke<select name="src"><option value="flach">40 km flach (nur Prüffall)</option><option value="plan">Route aus dem Planer</option><option value="gpx">GPX-Datei</option></select></label>
        <p class="hint eta-ann">Annahmen, nicht kalibriert: CdA 0,30 m² gilt für ein Rennrad in aufrechter Position, das Zeitfahrrad oder der Aufsatz liegen meist tiefer – Messwert aus dem Aerotest unten eintragen. Crr 0,004 = guter Asphalt. Gewicht = letzte Waage + 8,5 kg. Leistungsmesser (±1–2 %) und Wind ändern das Ergebnis spürbar.</p>`;
      $("eta-form").insertAdjacentHTML("beforeend", `<label class="btn" id="eta-gpxl" hidden>GPX wählen<input type="file" accept=".gpx,application/gpx+xml" name="gpx" hidden></label>`);
      const f = $("eta-form");
      f.addEventListener("input", () => V.eta());
      f.src.addEventListener("change", () => { ETA.src = f.src.value; $("eta-gpxl").hidden = ETA.src !== "gpx"; V.eta(); });
      f.gpx.addEventListener("change", async () => { try { ETA.gpx = parseGpxPts(await f.gpx.files[0].text()); ETA.gpxName = f.gpx.files[0].name; } catch (e) { ETA.gpx = null; } V.eta(); });
    }
    const f = $("eta-form"), F = FK();
    const q = { P: +f.P.value || 0, m: +f.m.value || 80, cda: +f.cda.value || 0.3, crr: +f.crr.value || 0.004, temp: +f.temp.value, wind: (+f.wind.value || 0) / 3.6, vmax: (+f.vmax.value || 60) / 3.6, eta: 0.976 };
    let pts = null, srcTxt = "", warn = [];
    if (ETA.src === "flach") { pts = Array.from({ length: 201 }, (_, i) => ({ d: i * 200, ele: 450 })); srcTxt = "40 km flach auf 450 m"; }
    else if (ETA.src === "plan") { const r = C().planRoute && C().planRoute(); if (r) { pts = toPts(r.ll, r.ele); srcTxt = "Route aus dem Planer (geroutete Strecke, Höhe aus dem Höhenmodell)"; } else warn.push("Im Planer ist keine Route mit Höhenprofil: Karte › Route planen."); }
    else if (ETA.gpx) { pts = toPts(ETA.gpx.ll, ETA.gpx.ele); srcTxt = `GPX ${ETA.gpxName}`; if (!ETA.gpx.ele) warn.push("GPX ohne Höhe: Steigungen fehlen, gerechnet wird flach."); }
    else warn.push("GPX-Datei wählen.");
    let out = `<p class="hint">${esc(warn.join(" "))}</p>`;
    if (pts && pts.length > 1) {
      const r = F.routeTime(pts, q, { pausen_min: +f.pause.value || 0, windSzen: [-2, 0, 2] });
      if (r.unmoeglich) out = `<div class="verdict warn">Mit ${q.P} W kommst du in der Ebene nicht vorwärts: keine Fahrzeit.</div>`;
      else {
        const km = r.distanz_m / 1000, hm = pts.reduce((s, p, i) => s + (i && p.ele != null && pts[i - 1].ele != null ? Math.max(0, p.ele - pts[i - 1].ele) : 0), 0);
        out = `<div class="kv"><div><span>Strecke</span><b>${num(km, 1)} km</b><small>+${num(hm)} hm</small></div><div><span>Bewegungszeit</span><b>${C().hmm(r.bewegung_s)}</b><small>Ø ${num(km / (r.bewegung_s / 3600), 1)} km/h</small></div>
          <div><span>Spanne Wind ±7 km/h</span><b>${C().hmm(r.spanne_s[0])}–${C().hmm(r.spanne_s[1])}</b></div><div><span>mit Pausen</span><b>${C().hmm(r.mit_pausen_s)}</b></div></div>
          <p class="hint">${esc(srcTxt)}. Schätzung aus der Leistungsbilanz je 200-m-Abschnitt, Abfahrt auf ${f.vmax.value} km/h begrenzt; Kurven, Kreuzungen und Bremsen sind nicht abgebildet. Kein Aufruf, ein modelliertes Tempo zu fahren.${r.hoehe_fehlt ? " Teilweise ohne Höhe." : ""}</p>`;
        const segs = r.abschnitte.filter((_, i) => i % Math.max(1, Math.round(r.abschnitte.length / 120)) === 0);
        C().chart("c-eta", { type: "line", data: { labels: segs.map((s) => num(s.d0 / 1000, 1)), datasets: [
          { label: "Tempo (km/h)", data: segs.map((s) => +(s.v * 3.6).toFixed(1)), borderColor: C().css("--accent"), backgroundColor: C().css("--accent"), pointRadius: 0, tension: 0, yAxisID: "y" },
          { label: "Höhe (m)", data: segs.map((s) => s.ele), borderColor: C().css("--muted"), backgroundColor: C().css("--muted") + "22", fill: true, pointRadius: 0, yAxisID: "y2" }] },
          options: { scales: { x: { title: { display: true, text: "km" }, ticks: { maxTicksLimit: 10 } }, y: { title: { display: true, text: "km/h" } }, y2: { position: "right", grid: { display: false }, title: { display: true, text: "m" } } }, plugins: { legend: { position: "bottom" } } } });
      }
    }
    $("eta-out").innerHTML = out;
    const rho = F.rho(q.temp, 450);
    const row = (lab, g, w) => { const v = F.speedFromPower(q.P, { ...q, grade: g, wind: q.wind + (w || 0), rho }); return `<tr><td>${lab}</td><td>${num(v * 3.6, 1)} km/h</td></tr>`; };
    $("t-eta").innerHTML = `<tr><th>Prüffall (${q.P} W)</th><th>Tempo</th></tr>${row("Ebene", 0)}${row("8 % bergauf", 0.08)}${row("6 % bergab", -0.06)}${row("Gegenwind 20 km/h", 0, -20 / 3.6)}${row("Rückenwind 20 km/h", 0, 20 / 3.6)}<tr><td>0 W in der Ebene</td><td>${num(F.speedFromPower(0, { ...q, grade: 0, rho }) * 3.6, 1)} km/h</td></tr>`;
  };

  /* ======================= Aerotest CdA (A-B-A, virtuelle Höhe) ======================= */
  const AERO = { fit: null, labels: {} };
  V.aero = function () {
    const box = $("cda-card"); if (!box) return;
    if (!box.dataset.init) {
      box.dataset.init = 1;
      $("cda-file").addEventListener("change", async (e) => { try { AERO.fit = FK().parseFit(await e.target.files[0].arrayBuffer()); AERO.name = e.target.files[0].name; AERO.labels = {}; } catch (err) { AERO.fit = null; AERO.err = err.message; } V.aero(); });
      $("cda-par").addEventListener("input", () => V.aero());
    }
    const F = FK(), f = $("cda-par");
    if (!AERO.fit) { $("cda-out").innerHTML = `<p class="hint">${AERO.err ? "FIT nicht lesbar: " + esc(AERO.err) : "FIT-Datei eines A-B-A-Tests laden: gleiche Runde, je Position mehrere Durchgänge als eigene Runden (Lap-Taste)."}</p>`; return; }
    const laps = AERO.fit.laps.filter((l) => l.start && l.t_end && l.t_end - l.start > 60);
    const q = { m: +f.m.value || 80, crr: +f.crr.value || 0.004, rho: F.rho(+f.temp.value, +f.alt.value || 0), eta: 0.976 };
    const parts = [];
    let n = { A: 0, B: 0 };
    laps.forEach((l, i) => { const lab = AERO.labels[i]; if (!lab) return; n[lab]++; parts.push({ name: `${lab}${n[lab]}`, samples: AERO.fit.records.filter((r) => r.t >= l.start && r.t <= l.t_end && r.speed != null).map((r) => ({ t: r.t, v: r.speed, P: r.power || 0, alt: r.alt })) }); });
    const res = parts.length >= 3 ? F.abaTest(parts, q) : null;
    const tempo = res && res.cda_a && res.cda_b ? [180, 220, 260].map((P) => { const a = F.speedFromPower(P, { ...q, grade: 0, cda: res.cda_a }), b = F.speedFromPower(P, { ...q, grade: 0, cda: res.cda_b }); return `${P} W: ${num(a * 3.6, 1)} → ${num(b * 3.6, 1)} km/h (${b > a ? "+" : ""}${num((b - a) * 3.6, 1)})`; }) : [];
    $("cda-out").innerHTML = `<p class="hint">${esc(AERO.name)} · ${laps.length} Runden. Ordne jede Runde A (Ausgangsposition) oder B (geänderte Position) zu.</p>
      <div class="tablewrap"><table class="t"><tr><th>Runde</th><th>Dauer</th><th>Ø km/h</th><th>Ø W</th><th>Zuordnung</th></tr>${laps.map((l, i) => { const rs = AERO.fit.records.filter((r) => r.t >= l.start && r.t <= l.t_end); const v = F.util.mean(rs.map((r) => r.speed)), p = F.util.mean(rs.map((r) => r.power));
        return `<tr><td>${i + 1}</td><td>${C().mmss(l.t_end - l.start)}</td><td>${num((v || 0) * 3.6, 1)}</td><td>${num(p)}</td><td><select data-l="${i}"><option value="">–</option><option ${AERO.labels[i] === "A" ? "selected" : ""}>A</option><option ${AERO.labels[i] === "B" ? "selected" : ""}>B</option></select></td></tr>`; }).join("")}</table></div>
      ${res ? `<div class="kv"><div><span>CdA A</span><b>${num(res.cda_a, 3)}</b><small>m², geschätzt</small></div><div><span>CdA B</span><b>${num(res.cda_b, 3)}</b><small>m², geschätzt</small></div><div><span>Unterschied</span><b>${res.diff > 0 ? "+" : ""}${num(res.diff, 3)}</b></div><div><span>Streuung A</span><b>${num(res.drift_a, 3)}</b></div></div>
        <div class="verdict ${res.status === "Unterschied über der Streuung" ? "" : "warn"}">${esc(res.status)}. ${V.prov("berechnet", "virtuelle Höhe nach Chung")}</div>
        <ul class="flags">${res.abschnitte.map((a) => `<li>${esc(a.name)}: ${a.cda ? num(a.cda, 3) + " m², Abweichung " + num(a.rmse_m, 2) + " m" : esc(a.grund || a.status)}${a.hinweis ? " · " + esc(a.hinweis) : ""}</li>`).join("")}</ul>
        ${tempo.length ? `<p class="hint">Tempo in der Ebene (A → B): ${tempo.join(" · ")}</p>` : ""}` : `<p class="hint">Mindestens drei Runden zuordnen (A, B, A).</p>`}
      <p class="hint">Rollwiderstand, Wind, Leistungsmesser und Steigung lassen sich mit CdA verwechseln: nur eine Grösse ändern, gleiche Strecke, möglichst windstill. Garmin Rally und Quarq nicht in derselben Serie mischen. Keine riskanten Positionen oder Strecken.</p>`;
    $("cda-out").querySelectorAll("[data-l]").forEach((s) => (s.onchange = () => { AERO.labels[+s.dataset.l] = s.value || undefined; V.aero(); }));
  };

  /* ======================= Schwimm-Video-Coach (lokal) ======================= */
  const KAT = { wasserlage: "Wasserlage", kopf: "Kopfhaltung", atmung: "Atmung", ellbogen: "Armzug / hoher Ellbogen", beine: "Beinschlag", rotation: "Rotation", wende: "Wende", anderes: "Anderes" };
  const UEB = {
    wasserlage: ["Gleiten in Bauchlage mit Blick zum Boden", "Seitlage mit Beinschlag (Kick on side)"],
    kopf: ["Blick zum Boden, Wasserlinie am Hinterkopf", "Catch-up mit ruhigem Kopf"],
    atmung: ["Atmen jeden 3. Zug", "Einarmig mit Atmung zur Gegenseite"],
    ellbogen: ["Scullen vorne (Front Scull)", "Fingertip Drag", "Einarmiges Kraulen"],
    beine: ["Beinschlag mit Brett, kurze Amplitude", "Beinschlag in Seitlage"],
    rotation: ["6-Kick-Switch", "Seitlage mit Rotation"],
    wende: ["Rollwende aus dem Gleiten", "Abstoss in Seitlage, Unterwasser-Gleiten"],
    anderes: [],
  };
  const SW = { a: null, b: null, offset: 0, rate: 1, draw: false, p1: null };
  const sess = () => { V.Inbox.data.coach = V.Inbox.data.coach || []; let s = V.Inbox.data.coach.find((x) => x.id === SW.sid); if (!s) { s = { id: SW.sid = "sw-" + Date.now(), datum: C().iso(C().today), video_a: null, video_b: null, marken: [], winkel: [], bewertung: {} }; V.Inbox.data.coach.push(s); } return s; };
  V.schwimmen = function () {
    const box = $("sw-coach"); if (!box) return;
    const all = (V.Inbox.data.coach || []).slice().sort((a, b) => b.datum.localeCompare(a.datum));
    if (!SW.sid && all.length) SW.sid = all[0].id;
    if (!box.dataset.init) {
      box.dataset.init = 1;
      box.innerHTML = `<div class="sw-grid"><div class="sw-pane"><div class="sw-lab">Video A <label class="btn">wählen<input type="file" accept="video/*" data-v="a" hidden></label></div><div class="sw-v"><video id="sw-va" playsinline muted preload="metadata"></video><canvas id="sw-ca"></canvas></div></div>
        <div class="sw-pane"><div class="sw-lab">Video B <label class="btn">wählen<input type="file" accept="video/*" data-v="b" hidden></label> <label class="hint">Versatz B (s) <input type="number" step="0.05" id="sw-off" value="0"></label></div><div class="sw-v"><video id="sw-vb" playsinline muted preload="metadata"></video></div></div></div>
        <div class="row sw-ctl"><button class="btn primary" id="sw-play">▶ Beide</button><button class="btn" id="sw-pause">Pause</button><button class="btn" id="sw-back" aria-label="Ein Bild zurück">−1 Bild</button><button class="btn" id="sw-fwd" aria-label="Ein Bild vor">+1 Bild</button>
          <select id="sw-rate" aria-label="Tempo"><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1" selected>1×</option></select><span class="hint" id="sw-t">0,00 s</span>
          <button class="btn" id="sw-line" aria-pressed="false">Winkel messen</button></div>
        <form class="inline" id="sw-mark"><label>Kategorie<select name="k">${Object.entries(KAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label><label class="grow">Beobachtung<input name="n" placeholder="z. B. Ellbogen fällt beim Einsetzen ab"></label><button class="btn" type="submit">Marke setzen</button></form>
        <div id="sw-list"></div><div class="row"><label class="btn">Analyse (JSON) laden<input type="file" accept="application/json,.json" id="sw-imp" hidden></label><button class="btn" id="sw-exp">Analyse als JSON</button><select id="sw-sess" aria-label="Sitzung"></select><button class="btn" id="sw-new">Neue Sitzung</button></div>`;
      const va = $("sw-va"), vb = $("sw-vb");
      box.querySelectorAll("[data-v]").forEach((inp) => inp.addEventListener("change", () => { const fl = inp.files[0]; if (!fl) return; const v = inp.dataset.v === "a" ? va : vb; if (v.src) URL.revokeObjectURL(v.src); v.src = URL.createObjectURL(fl); const s = sess(); s["video_" + inp.dataset.v] = { name: fl.name, groesse: fl.size }; V.Inbox.save(); V.schwimmen(); }));
      const sync = () => { if (vb.src && va.src) { const t = va.currentTime + SW.offset; if (Math.abs(vb.currentTime - t) > 0.08) vb.currentTime = Math.max(0, t); } $("sw-t").textContent = num(va.currentTime, 2) + " s"; };
      va.addEventListener("timeupdate", sync); va.addEventListener("seeked", sync);
      $("sw-off").addEventListener("input", (e) => { SW.offset = +e.target.value || 0; sync(); });
      $("sw-play").onclick = () => { va.playbackRate = vb.playbackRate = SW.rate; va.play?.(); if (vb.src) vb.play?.(); };
      $("sw-pause").onclick = () => { va.pause(); vb.pause(); sync(); };
      $("sw-back").onclick = () => { va.pause(); vb.pause(); va.currentTime = Math.max(0, va.currentTime - 1 / 30); };
      $("sw-fwd").onclick = () => { va.pause(); vb.pause(); va.currentTime = va.currentTime + 1 / 30; };
      $("sw-rate").onchange = (e) => { SW.rate = +e.target.value; va.playbackRate = vb.playbackRate = SW.rate; };
      $("sw-mark").onsubmit = async (e) => { e.preventDefault(); const s = sess(); s.marken.push({ t: +va.currentTime.toFixed(2), kategorie: e.target.k.value, notiz: e.target.n.value.trim(), quelle: "von Hand" }); e.target.n.value = ""; await V.Inbox.save(); V.schwimmen(); };
      const cv = $("sw-ca");
      $("sw-line").onclick = () => { SW.draw = !SW.draw; SW.p1 = null; $("sw-line").setAttribute("aria-pressed", String(SW.draw)); cv.style.pointerEvents = SW.draw ? "auto" : "none"; };
      cv.addEventListener("click", async (e) => {
        if (!SW.draw) return;
        const r = cv.getBoundingClientRect(); const p = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
        if (!SW.p1) { SW.p1 = p; drawAngles([{ a: p, b: p }]); return; }
        const dx = (p[0] - SW.p1[0]) * r.width, dy = (p[1] - SW.p1[1]) * r.height, ang = Math.abs(Math.atan2(-dy, dx) * 180 / Math.PI);
        const s = sess(); s.winkel.push({ t: +va.currentTime.toFixed(2), a: SW.p1, b: p, grad: +(ang > 90 ? 180 - ang : ang).toFixed(1), quelle: "von Hand gemessen" });
        SW.p1 = null; await V.Inbox.save(); V.schwimmen();
      });
      $("sw-imp").addEventListener("change", async (e) => { try { const j = JSON.parse(await e.target.files[0].text()); const s = sess(); for (const m of j.marken || j.markers || []) s.marken.push({ t: +(m.t ?? m.time ?? 0), kategorie: m.kategorie || m.category || "anderes", notiz: m.notiz || m.label || m.note || "", quelle: "importiert" }); await V.Inbox.save(); V.schwimmen(); } catch (err) { $("sw-list").insertAdjacentHTML("afterbegin", `<p class="hint down">JSON nicht lesbar.</p>`); } });
      $("sw-exp").onclick = () => C().shareOrDownload(`schwimmanalyse-${sess().datum}.json`, JSON.stringify(Object.assign({ format: "spuren-schwimmanalyse-1", hinweis: "Nur Notizen, keine Videos" }, sess()), null, 1));
      $("sw-new").onclick = () => { SW.sid = null; sess(); V.Inbox.save(); V.schwimmen(); };
      $("sw-sess").onchange = (e) => { SW.sid = e.target.value; V.schwimmen(); };
    }
    const s = all.find((x) => x.id === SW.sid);
    $("sw-sess").innerHTML = all.map((x) => `<option value="${esc(x.id)}" ${x.id === SW.sid ? "selected" : ""}>${C().dateCH(x.datum)} · ${x.marken.length} Marken</option>`).join("") || `<option>keine Sitzung</option>`;
    const va = $("sw-va");
    $("sw-list").innerHTML = s ? `<h3 class="mini-h">Marken ${s.video_a ? "· A: " + esc(s.video_a.name) : ""}${s.video_b ? " · B: " + esc(s.video_b.name) : ""}</h3>
      <div class="tablewrap"><table class="t"><tr><th>Zeit</th><th>Kategorie</th><th>Beobachtung</th><th>Übungsideen</th><th></th></tr>${s.marken.slice().sort((a, b) => a.t - b.t).map((m, i) => `<tr><td><button class="btn" data-seek="${m.t}">${num(m.t, 2)} s</button></td><td>${esc(KAT[m.kategorie] || m.kategorie)}</td><td class="wrap">${esc(m.notiz)} <small>${esc(m.quelle || "")}</small></td><td class="wrap"><small>${(UEB[m.kategorie] || []).map(esc).join(" · ") || "–"}</small></td><td><button class="btn" data-rm="${i}">×</button></td></tr>`).join("") || `<tr><td colspan="5">Noch keine Marken.</td></tr>`}</table></div>
      ${s.winkel.length ? `<p class="hint">Winkel (von Hand, gegen die Waagrechte): ${s.winkel.map((w) => `${num(w.t, 2)} s: ${num(w.grad, 1)}°`).join(" · ")}</p>` : ""}
      <h3 class="mini-h">Lernbausteine bewerten (1 = noch nicht, 5 = sicher)</h3><div class="sw-rate">${Object.entries(KAT).filter(([k]) => k !== "anderes").map(([k, v]) => `<label>${v}<select data-b="${k}"><option value="">–</option>${[1, 2, 3, 4, 5].map((x) => `<option ${s.bewertung[k] === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`).join("")}</div>` : `<p class="hint">Videos wählen und Marken setzen. Videos bleiben auf diesem Gerät, werden weder gespeichert noch hochgeladen. Notizen sind verschlüsselt.</p>`;
    $("sw-list").querySelectorAll("[data-seek]").forEach((b) => (b.onclick = () => { va.currentTime = +b.dataset.seek; }));
    $("sw-list").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => { const sorted = s.marken.slice().sort((a, c) => a.t - c.t); const m = sorted[+b.dataset.rm]; s.marken = s.marken.filter((x) => x !== m); await V.Inbox.save(); V.schwimmen(); }));
    $("sw-list").querySelectorAll("[data-b]").forEach((sel) => (sel.onchange = async () => { s.bewertung[sel.dataset.b] = sel.value ? +sel.value : undefined; await V.Inbox.save(); V.schwimmen(); }));
    if (s) drawAngles(s.winkel.filter((w) => Math.abs(w.t - va.currentTime) < 0.5));
    const hist = (V.Inbox.data.coach || []).slice().sort((a, b) => a.datum.localeCompare(b.datum));
    const cols = ["--accent", "--accent-2", "--strain", "--sleep", "--lt2", "--good", "--warn"];
    C().chart("c-sw-tech", { type: "line", data: { labels: hist.map((x) => C().dLabel(x.datum)), datasets: Object.entries(KAT).filter(([k]) => k !== "anderes").map(([k, v], i) => ({ label: v, data: hist.map((x) => x.bewertung[k] ?? null), borderColor: C().css(cols[i % cols.length]), backgroundColor: C().css(cols[i % cols.length]), spanGaps: true, tension: 0, pointRadius: 3 })).filter((d) => d.data.some((x) => x != null)) },
      options: { scales: { y: { min: 0.5, max: 5.5, ticks: { stepSize: 1 }, title: { display: true, text: "eigene Bewertung 1–5" } } }, plugins: { legend: { position: "bottom" } } } });
  };
  function drawAngles(list) {
    const cv = $("sw-ca"), va = $("sw-va"); if (!cv) return;
    cv.width = va.clientWidth || 320; cv.height = va.clientHeight || 180;
    const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); g.strokeStyle = "#ffb020"; g.lineWidth = 2; g.fillStyle = "#ffb020"; g.font = "600 13px sans-serif";
    for (const w of list) { g.beginPath(); g.moveTo(w.a[0] * cv.width, w.a[1] * cv.height); g.lineTo(w.b[0] * cv.width, w.b[1] * cv.height); g.stroke(); if (w.grad != null) g.fillText(num(w.grad, 1) + "°", w.b[0] * cv.width + 6, w.b[1] * cv.height); }
  }

  /* ======================= Demo: frei erfundene V5-Daten ======================= */
  V.demoAugment = function (D, iso) {
    const F = FK();
    D.zonen = [{ id: "demo-zonen", v: "zonen-1.0", name: "Beispielzonen (erfunden)", status: "aktiv", gueltig_ab: "2020-01-01", gueltig_bis: null, provenienz: "manuell",
      freigabe: { art: "manuell", datum: "2020-01-01", durch: "Demo", text: "Beispiel, keine persönlichen Zonen." }, methodik: { art: "manuell", bestaetigt: false, text: "Beispiel." },
      skalen: [
        { key: "rad_w", disziplin: "rad", metrik: "leistung", unit: "W", protokoll: "demo-rad", umfang: [120, 350], zonen: [{ z: "Z1", von: null, bis: 165 }, { z: "Z2", von: 165, bis: 205 }, { z: "Z3", von: 205, bis: 245 }, { z: "Z4", von: 245, bis: 285 }, { z: "Z5", von: 285, bis: null }], grenzen: {}, hinweis: "Beispiel / nicht persönliche Zonen" },
        { key: "rad_hf", disziplin: "rad", metrik: "puls", unit: "bpm", protokoll: "demo-rad", umfang: [110, 190], zonen: [{ z: "Z1", von: null, bis: 125 }, { z: "Z2", von: 125, bis: 140 }, { z: "Z3", von: 140, bis: 158 }, { z: "Z4", von: 158, bis: 176 }, { z: "Z5", von: 176, bis: null }], grenzen: {}, hinweis: "" },
        { key: "lauf_pace", disziplin: "lauf", metrik: "pace", unit: "s/km", protokoll: "demo-lauf", umfang: [420, 216], zonen: [{ z: "Z1", von: null, bis: 372 }, { z: "Z2", von: 372, bis: 330 }, { z: "Z3", von: 330, bis: 291 }, { z: "Z4", von: 291, bis: 252 }, { z: "Z5", von: 252, bis: null }], grenzen: {}, hinweis: "Pace: links langsam, rechts schnell" },
        { key: "lauf_hf", disziplin: "lauf", metrik: "puls", unit: "bpm", protokoll: "demo-lauf", umfang: [130, 210], zonen: [{ z: "Z1", von: null, bis: 150 }, { z: "Z2", von: 150, bis: 165 }, { z: "Z3", von: 165, bis: 179 }, { z: "Z4", von: 179, bis: 193 }, { z: "Z5", von: 193, bis: null }], grenzen: {}, hinweis: "" }] }];
    const pv = (D.laktat_vorschau || []).filter((p) => p.art === "stufentest");
    const tests = pv.map((p, i) => {
      const rows = (p.zeilen || []).filter((z) => z.x != null && z.la != null).map((z) => ({ x: z.x, la: z.la, hf: (z.fit && z.fit.hr_vor) || z.hf, hf_tab: z.hf, x_fit: z.fit ? z.fit.x : null, fit_nr: z.fit ? z.fit.nr : null, stufe: z.stufe, quelle: z.quelle, hf_quelle: "FIT (Beispiel)" }));
      const xs = rows.map((r) => r.x), la = rows.map((r) => r.la), hf = rows.map((r) => r.hf);
      const cross = (lv, from) => { for (let k = Math.max(1, (from || 0) + 1); k < xs.length; k++) if (la[k - 1] < lv && la[k] >= lv) return xs[k - 1] + (lv - la[k - 1]) / (la[k] - la[k - 1]) * (xs[k] - xs[k - 1]); return null; };
      const at = (x) => { for (let k = 1; k < xs.length; k++) if (xs[k - 1] <= x && x <= xs[k]) return hf[k - 1] + (x - xs[k - 1]) / (xs[k] - xs[k - 1]) * (hf[k] - hf[k - 1]); return null; };
      const b05 = cross(la.slice(0, 3).reduce((s, v) => s + v, 0) / 3 + 0.5);
      const ie = la.map((v, k) => v / xs[k]).reduce((m, v, k, a) => (v < a[m] ? k : m), 0);
      const dk = cross(la[ie] + 1.5, ie);
      const M = (x, g) => ({ x, hf: x != null ? at(x) : null, band80: x != null ? [x - 12, x + 9] : null, gueltig: x != null && g, grund: x == null ? "nicht erreicht" : null, rolle: "LT" });
      return { test: p.id, datum: p.datum, sport: "rad", protokoll: "demo-rad", datenstatus: "vorschau", aktivitaet: p.aktivitaet, ausbelastet: false, ende: "Beispiel", unit: "W", stufen: rows,
        methoden: { basis05: M(b05, true), dickhuth: M(dk, true), somc: M(null, false), loglog: M(null, false), moddmax: M(null, false), dmax: M(null, false), fix2: M(cross(2), false), fix4: M(cross(4), false) },
        lt1: b05 != null ? { status: "vorläufig", lo: b05 - 4, hi: b05 + 3, hf_lo: at(b05 - 4), hf_hi: at(b05 + 3), methoden: ["basis05"], grund: "Beispiel" } : { status: "nicht bestimmbar", lo: null, hi: null, methoden: [] },
        lt2: dk != null ? { status: "vorläufig", lo: dk, hi: dk, hf_lo: at(dk), hf_hi: at(dk), methoden: ["dickhuth"], grund: "Beispiel: nicht ausbelastet, Dmax ungültig" } : { status: "nicht bestimmbar", lo: null, hi: null, methoden: [], grund: "Beispiel" } };
    });
    const runTest = { test: "demo-lauf", datum: tests.length ? tests[0].datum : iso, sport: "lauf", protokoll: "demo-lauf", datenstatus: "vorschau", ausbelastet: false, ende: "Beispiel, submaximal", unit: "km/h",
      stufen: [9.5, 10.5, 11.5, 12.5, 13.5].map((x, k) => ({ x, la: [1.1, 1.2, 1.4, 1.9, 2.8][k], hf: 140 + k * 8, hf_tab: 140 + k * 8, stufe: k + 1 })),
      methoden: { basis05: { x: 11.9, hf: 159, band80: [11.6, 12.2], gueltig: true }, somc: { x: 11.5, hf: 156, band80: [10.5, 12.5], gueltig: true }, dickhuth: { x: null, gueltig: false, grund: "Beispiel: nicht erreicht" } },
      lt1: { status: "vorläufig", lo: 11.5, hi: 11.9, hf_lo: 156, hf_hi: 159, methoden: ["somc", "basis05"] }, lt2: { status: "nicht bestimmbar", lo: null, hi: null, methoden: [], grund: "Beispiel: Test ohne Ausbelastung" } };
    D.schwellen = { v: "schwellen-1.0", simulation: { n: 0, sd: "Beispiel" }, methoden: { somc: { name: "Erste Schwelle SOMC", rolle: "LT1" }, basis05: { name: "Basis + 0,5 mmol/l", rolle: "LT1" }, loglog: { name: "log-log-Knick", rolle: "LT1" }, dickhuth: { name: "Dickhuth", rolle: "LT2" }, moddmax: { name: "mod. Dmax", rolle: "LT2" }, dmax: { name: "Dmax", rolle: "LT2" }, fix2: { name: "fix 2 mmol/l", rolle: "orientierung" }, fix4: { name: "fix 4 mmol/l", rolle: "orientierung" } },
      tests: tests.concat(runTest), vergleiche: [] };
    D.laktat_vorschau = (D.laktat_vorschau || []).concat([{ id: "demo-check-1", art: "check", status: "vorschau", sport: "rad", datum: F.addDays(iso, -9), zeilen: [{ x: 230, la: 1.7, hf: 146, quelle: { stelle: "Beispiel" } }],
      kandidaten: [{ x: 229, hr: 145.6, hr_max: 151, hr60: 146.2, hr30: 146.8, np: 231, win_s: 1200, uhr: "18:40", kj_vor: 512, cad: 88 }], zuordnung: "letzter Block", regel: "Beispiel", hinweise: ["Beispielwert, erfunden"], aktivitaet: null }]);
    let n = 0;
    for (const a of D.activities) {
      if (a.sport === "rad" && (a.dur || 0) >= 7200 && a.watt) { n++; a.dr = { m: a.dur, x1: a.watt + 3, x2: a.watt - 3, h1: (a.hr || 135) - 3, h2: (a.hr || 135) + 3, dec: +(2 + (n % 7)).toFixed(1), cov: 1, unit: "W" }; }
      if (a.sport === "lauf" && (a.dur || 0) >= 1500) { const p = Math.round((a.dur / Math.max(1, a.km)) || 330); a.sp = [{ von: 0, bis: 300, s: 300, pace: p + 8, hr: (a.hr || 150) - 8, cad: 170 }, { von: 300, bis: 600, s: 300, pace: p + 2, hr: (a.hr || 150) - 3, cad: 172 }, { von: 600, bis: 1200, s: 600, pace: p, hr: a.hr || 150, cad: 172 }, { von: 1200, bis: null, s: a.dur - 1200, pace: p - 1, hr: (a.hr || 150) + 3, cad: 173 }]; }
    }
    const ride = D.activities.filter((a) => a.sport === "rad" && !a.indoor && (a.dur || 0) >= 5400).slice(-1)[0];
    if (ride) {
      const t0 = F.zurichToUnix(ride.date, ride.start || "09:00") + (ride.el || ride.dur) + 8 * 60;
      const st = F.zurichParts(t0);
      D.activities.push({ id: "demo-koppel-lauf", sport: "lauf", typ: "Laufen", name: "Koppellauf (Beispiel)", date: st.date, start: `${String(st.hh).padStart(2, "0")}:${String(st.mm).padStart(2, "0")}`, km: 7.8, hm: 20, dur: 2400, el: 2400, mv: 2400, hr: 158, tss: 40,
        sp: [{ von: 0, bis: 300, s: 300, pace: 318, hr: 150, cad: 168 }, { von: 300, bis: 600, s: 300, pace: 309, hr: 156, cad: 170 }, { von: 600, bis: 1200, s: 600, pace: 305, hr: 159, cad: 171 }, { von: 1200, bis: null, s: 1200, pace: 303, hr: 161, cad: 172 }], _t: ride._t, _wd: ride._wd });
    }
    D.befinden = [{ date: F.addDays(iso, -1), muede: 3, muskel: 2, stress: 2 }];
    D.fueling_produkte = [{ id: "dp1", name: "Gel (Beispiel)", art: "Gel", kh_g: 25, wasser_ml: null, natrium_mg: 50, koffein_mg: 0 }, { id: "dp2", name: "Getränk 500 ml (Beispiel)", art: "Getränk", kh_g: 40, wasser_ml: 500, natrium_mg: 300, koffein_mg: 0 }];
    const rides = D.activities.filter((a) => a.sport === "rad" && (a.dur || 0) >= 5400).slice(-10);
    D.fueling = rides.map((a, i) => ({ id: "demo-fu-" + i, activity_id: a.id, date: a.date, sport: "rad", status: i === 3 ? "nicht protokolliert" : "protokolliert",
      events: i === 3 ? [] : Array.from({ length: Math.max(2, Math.round(a.dur / 1800)) }, (_, k) => ({ id: "e" + k, t_min: 15 + k * 30, produkt: k % 2 ? "Gel (Beispiel)" : "Getränk 500 ml (Beispiel)", kh_g: k % 2 ? 25 : 40, wasser_ml: k % 2 ? null : 500, natrium_mg: k % 2 ? 50 : 300, anteil: 1 })),
      gi: i % 3 === 2 ? [{ t_min: Math.round(a.dur / 60 * 0.7), schwere: 2 + (i % 2), notiz: "Beispiel" }] : [] }));
    D.koppel = []; D.langfahrt_plaene = [];
  };
})();
