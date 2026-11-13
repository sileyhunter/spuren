/* V6.5 Etappe 5 · Oberfläche: Plan → «Bibliothek» (Enduco-Bibliothek, Enduco über die Monate, Schwimmübungen).
   Rechenlogik in js/v65.js (bibliothek-1.0, monate-1.0, uebungen-1.0); Daten `enduco_bib` (bib-1.0, tools/bibliothek.py).
   Nur lesen: nichts wird nach Garmin oder Enduco geschrieben. Eine Einheit öffnet das gleiche Blatt wie im Kalender (V6H.einheitP). */
(function () {
  "use strict";
  const M = (window.V65UI = window.V65UI || {});
  const $ = (id) => document.getElementById(id);
  const V65 = () => window.V65, V6 = () => window.V6, H = () => window.V6H, UI = () => window.V5UI;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dch = (iso) => { if (!iso) return "–"; const [y, m, d] = iso.split("-"); return `${+d}.${+m}.${y}`; };
  const SPORT_WORT = { alle: "Alle", rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen" };
  const STUFE_WORT = { alles: "hart", schwelle: "Schwelle", locker: "locker", offen: "offen" };
  const spFarbe = (sp) => `var(--sp-${["rad", "lauf", "schwimm"].includes(sp) ? sp : "andere"})`;
  const F = { sport: "alle", suche: "", stufe: "alle" };
  let C = null, E = [], ZEIGEN = 30;
  const STUFE = new Map();

  /** Kalender-ähnlicher Eintrag für das Einheit-Blatt (js/v6-heute.js). */
  function pVon(e) {
    return { title: e.titel, sport: e.sport, dur_s: e.dauer_s, steps: e.steps || undefined, desc: e.text, quelle: "Enduco (Bibliothek)",
      date: e.termine.length ? e.termine[e.termine.length - 1] : undefined };
  }
  /** Stufe: aus den Zielen der Schritte (Balkenprofil), sonst laut Titel; einmal je Workout gerechnet. */
  function stufeVon(e) {
    if (STUFE.has(e.wid)) return STUFE.get(e.wid);
    let balken = null;
    if (Array.isArray(e.steps) && e.steps.length && H() && H().profilVon) { try { const x = H().profilVon(pVon(e)); balken = x && x.pr ? x.pr.balken : null; } catch (err) { console.error(err); } }
    const st = V65().stufe(e, balken);
    STUFE.set(e.wid, st.stufe);
    return st.stufe;
  }
  const stufeTag = (st) => `<span class="vg-st ${st === "alles" ? "alles" : st}">${STUFE_WORT[st] || "offen"}</span>`;
  const dauer = (e) => (isNum(e.dauer_s) && e.dauer_s > 0 ? V6().dauerText(e.dauer_s) : isNum(e.distanz_m) ? V6().distanzText(e.distanz_m) : "Dauer offen");

  /** V6.6: ein Workout der Bibliothek als Einheit-Blatt öffnen (aus «Mein Plan», eigenplan-1.0). */
  M.einheitWid = function (wid) {
    C = UI() && UI().C; if (!C || !V65() || !H() || !C.D.enduco_bib) return;
    const e = V65().eintraege(C.D.enduco_bib, C.D.activities || []).find((x) => +x.wid === +wid); if (!e) return;
    H().einheitP(pVon(e), { datumText: "aus deiner Enduco-Bibliothek" });
  };
  /** V6.6 (vergleich-1.3): Stufe eines Bibliotheks-Workouts für Mein Plan (aus den Schritten, sonst laut Titel); null, wenn unbekannt. */
  let EW = null, EW_B = null;
  M.stufeWid = function (wid) {
    C = UI() && UI().C; if (!C || !V65() || !C.D.enduco_bib) return null;
    if (EW_B !== C.D.enduco_bib) { EW_B = C.D.enduco_bib; EW = V65().eintraege(C.D.enduco_bib, C.D.activities || []); }
    const e = EW.find((x) => +x.wid === +wid);
    return e ? stufeVon(e) : null;
  };
  M.zeichnen = function () {
    C = UI() && UI().C; if (!C || !V65() || !V6()) return;
    const B = C.D.enduco_bib, box = $("bib-inhalt"); if (!box) return;
    if (!B || !B.workouts || !Object.keys(B.workouts).length) {
      box.innerHTML = `<p class="ek-ohne">Noch keine Enduco-Workouts in der Bibliothek. Sie füllt sich mit jedem Workout, das du aus Enduco nach Garmin exportierst.</p>`;
      for (const id of ["bib-monate", "bib-uebungen"]) if ($(id)) $(id).innerHTML = "";
      return;
    }
    E = V65().eintraege(B, C.D.activities || []);
    const S = V65().stand(B, E);
    box.innerHTML = `<div class="kv bib-kv"><div><b>${S.n}</b><span>Workouts seit ${esc(dch(S.seit))}</span></div><div><b>${S.mitSchritten}</b><span>mit Schritten</span></div>
        <div><b>${S.mitTermin}</b><span>mit Termin</span></div><div><b>${S.gelaufen}</b><span>auf der Uhr gelaufen</span></div></div>
      <p class="bib-je keep">${["rad", "lauf", "schwimm"].map((k) => `<span><i style="background:${spFarbe(k)}"></i>${SPORT_WORT[k]} ${S.je[k]}</span>`).join("")}${S.versionen > S.n ? `<span>${S.versionen - S.n} geänderte Fassung${S.versionen - S.n > 1 ? "en" : ""}</span>` : ""}</p>
      <div class="seg bib-seg" role="group" aria-label="Sportart">${Object.entries(SPORT_WORT).map(([k, w]) => `<button type="button" data-bsp="${k}" aria-pressed="${F.sport === k}">${w}</button>`).join("")}</div>
      <div class="bib-filter"><label class="sr-only" for="bib-suche">Suchen in Titel und Text</label><input id="bib-suche" type="search" placeholder="Suchen (Titel, Text, Übung)" value="${esc(F.suche)}" autocomplete="off">
        <label class="sr-only" for="bib-stufe">Stufe</label><select id="bib-stufe">${[["alle", "alle Stufen"], ["alles", "hart"], ["schwelle", "Schwelle"], ["locker", "locker"], ["offen", "offen"]].map(([k, w]) => `<option value="${k}"${F.stufe === k ? " selected" : ""}>${w}</option>`).join("")}</select></div>
      <ol class="bib-liste" id="bib-liste"></ol>
      <p class="hint">${esc(V65().VERSIONS.liste)} (Daten ${esc((C.D.versions && C.D.versions.enduco_bib && C.D.versions.enduco_bib.v) || "bib-1.0")}): jedes Enduco-Workout, das über Garmin kam – auch wenn es dort
        gelöscht oder geändert wird; eine geänderte Fassung bleibt neben der alten. Datum = Termin im Garmin-Kalender (ab 13.11.2026 gesammelt), sonst der Tag des Exports.
        «Gelaufen» = dieses Workout lief auf der Uhr (gleicher Titel; am Termin, ohne Termin bis 14 Tage nach dem Export). Stufe aus den Zielen der Schritte, sonst laut Titel.
        Die Schritte älterer Workouts holt das Nacht-Update nach und nach. Stand ${esc(dch(S.stand))}.</p>`;
    box.querySelectorAll("[data-bsp]").forEach((b) => (b.onclick = () => { F.sport = b.dataset.bsp; ZEIGEN = 30; M.zeichnen(); }));
    $("bib-suche").oninput = (ev) => { F.suche = ev.target.value; ZEIGEN = 30; liste(); };
    $("bib-stufe").onchange = (ev) => { F.stufe = ev.target.value; ZEIGEN = 30; liste(); };
    liste();
    monate();
    uebungen();
  };

  function liste() {
    const L = V65().filtern(E, F, stufeVon), ol = $("bib-liste"); if (!ol) return;
    ol.innerHTML = L.slice(0, ZEIGEN).map((e) => `<li><button type="button" class="bib-e" data-bib="${esc(e.wid)}">
        <span class="ek-sport" style="--sp:${spFarbe(e.sport)}">${V6().sportIcon(e.sport, 20)}</span>
        <span class="bib-t"><b>${esc(e.titel || "Workout")}</b><small>${e.datumArt === "Termin" ? "" : "exportiert "}${esc(dch(e.datum))} · ${esc(dauer(e))}${e.versionen > 1 ? ` · ${e.versionen} Fassungen` : ""}</small></span>
        <span class="bib-r">${stufeTag(stufeVon(e))}${e.gelaufen.length ? `<small class="bib-ok">gelaufen</small>` : ""}</span></button></li>`).join("")
      || `<li class="ek-ohne">Nichts gefunden.</li>`;
    if (L.length > ZEIGEN) ol.insertAdjacentHTML("beforeend", `<li><button type="button" class="btn bib-mehr" id="bib-mehr">${Math.min(30, L.length - ZEIGEN)} weitere zeigen (${L.length - ZEIGEN} übrig)</button></li>`);
    const mehr = $("bib-mehr"); if (mehr) mehr.onclick = () => { ZEIGEN += 30; liste(); };
    ol.querySelectorAll("[data-bib]").forEach((b) => (b.onclick = () => oeffnen(b.dataset.bib)));
  }

  function oeffnen(wid) {
    const e = E.find((x) => String(x.wid) === String(wid)); if (!e) return;
    const B = C.D.enduco_bib, W = B.workouts[wid], vs = W.versionen || [];
    const vText = (v, i) => { const t = V65().text(B, v), vor = i ? vs[i - 1] : null;
      const was = !vor ? "erste Fassung" : [vor.text_h !== v.text_h ? "Text" : null, vor.kern_h && v.kern_h && vor.kern_h !== v.kern_h ? "Schritte" : null, vor.dauer_s !== v.dauer_s ? "Dauer" : null].filter(Boolean).join(", ") || "neu exportiert";
      return `<li><b>ab ${esc(dch(v.ab))}</b> – ${esc(was)}${isNum(v.dauer_s) ? ` · ${esc(V6().dauerText(v.dauer_s))}` : ""}${v.steps ? " · mit Schritten" : ""}${t.voll ? "" : " · nur erster Satz"}</li>`; };
    const extra = `${!e.textVoll && e.text ? `<p class="hint keep">Von dieser Fassung ist nur der erste Satz bekannt; den ganzen Text bringt das nächste Update.</p>` : ""}
      ${e.textGeerbt ? `<p class="hint keep">Text von der vorigen Fassung übernommen (die neue kam nur mit dem ersten Satz, und er passt).</p>` : ""}
      ${vs.length > 1 ? `<h3 class="abschnitt">Fassungen</h3><ol class="bib-vers">${vs.map(vText).join("")}</ol>` : ""}
      <h3 class="abschnitt">Termine und Uhr</h3>
      <p class="ek-text">${e.termine.length ? `Im Garmin-Kalender am ${e.termine.map(dch).map(esc).join(", ")}.` : `Kein Termin bekannt (exportiert am ${esc(dch(e.erstellt))}).`}
        ${e.gelaufen.length ? "" : " Auf der Uhr nicht gefunden."}</p>
      ${e.gelaufen.length ? `<ul class="bib-lauf">${e.gelaufen.map((a) => `<li><span>Gelaufen am ${esc(dch(a.date))}${isNum(a.ist_s) ? ` · ${esc(V6().dauerText(a.ist_s))}` : ""}</span><button type="button" class="btn" data-ex="${esc(a.id)}">Analysieren</button></li>`).join("")}</ul>` : ""}`;
    H().einheitP(pVon(e), { datumText: e.termine.length ? null : `exportiert am ${dch(e.erstellt)}`, extra });
  }

  /* ---------- Enduco über die Monate (monate-1.0) ---------- */
  function monate() {
    const box = $("bib-monate"); if (!box) return;
    const Mo = V65().monate(E, stufeVon, { bis: C.iso(C.today) }).slice(-18);
    if (!Mo.length) { box.innerHTML = `<p class="ek-ohne">Noch keine Monate mit Enduco-Workouts.</p>`; return; }
    const w = Math.round(Math.max(320, Math.min(760, box.clientWidth || 360))), h = 196, l = 30, unten = 44, bw = (w - l - 4) / Mo.length;
    const max = Math.max(1, ...Mo.map((m) => m.h.rad + m.h.lauf + m.h.schwimm)) * 1.1, Y = (v) => h - unten - (v / max) * (h - unten - 10);
    const balken = Mo.map((m, i) => { let y0 = h - unten; return ["schwimm", "rad", "lauf"].map((k) => { const v = m.h[k]; if (v <= 0) return ""; const hh = (v / max) * (h - unten - 10), y = y0 - hh;
      const r = `<rect x="${(l + i * bw + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, bw - 3).toFixed(1)}" height="${hh.toFixed(1)}" fill="${spFarbe(k)}"><title>${m.monat}: ${SPORT_WORT[k]} ${v.toFixed(1)} h</title></rect>`; y0 = y; return r; }).join(""); }).join("");
    const mix = Mo.map((m, i) => { let x0 = l + i * bw + 1; const tot = m.n || 1, bwi = Math.max(2, bw - 3);
      return ["locker", "schwelle", "alles", "offen"].map((k) => { const ww = (m.stufen[k] / tot) * bwi; if (ww <= 0) return ""; const r = `<rect x="${x0.toFixed(1)}" y="${h - unten + 6}" width="${ww.toFixed(1)}" height="8" fill="var(${{ locker: "--zc-z2", schwelle: "--zc-z3", alles: "--zc-z5", offen: "--zc-offen" }[k]})"><title>${m.monat}: ${m.stufen[k]} ${STUFE_WORT[k]}</title></rect>`; x0 += ww; return r; }).join(""); }).join("");
    const lab = Mo.map((m, i) => (i % Math.max(1, Math.ceil(Mo.length / 6)) === 0 ? `<text x="${(l + i * bw + bw / 2).toFixed(1)}" y="${h - 8}" text-anchor="middle" class="v56-ax">${m.monat.slice(5)}.${m.monat.slice(2, 4)}</text>` : "")).join("");
    const ax = [0, Math.round(max / 2), Math.floor(max)].map((v) => `<text x="${l - 4}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="v56-ax">${v}</text><line x1="${l}" x2="${w}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)"/>`).join("");
    const ohne = Mo.reduce((s, m) => s + m.ohneDauer, 0), letzte = Mo[Mo.length - 1];
    box.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="bib-svg" role="img" aria-label="Enduco-Stunden je Monat und Sportart, darunter der Anteil der Stufen">${ax}${balken}${mix}${lab}</svg>
      <div class="pl-legende bib-leg"><b>Stunden</b>${["schwimm", "rad", "lauf"].map((k) => `<span><i class="rund" style="background:${spFarbe(k)}"></i>${SPORT_WORT[k]}</span>`).join("")}</div>
      <div class="pl-legende bib-leg"><b>Stufen (Streifen)</b>${[["locker", "--zc-z2"], ["Schwelle", "--zc-z3"], ["hart", "--zc-z5"], ["offen", "--zc-offen"]].map(([k, v]) => `<span><i style="background:var(${v})"></i>${k}</span>`).join("")}</div>
      <p class="vg-fenster keep">${esc(letzte.monat.slice(5))}.${esc(letzte.monat.slice(0, 4))}: ${letzte.n} Workouts, ${(letzte.h.rad + letzte.h.lauf + letzte.h.schwimm).toFixed(1).replace(".", ",")} h mit bekannter Dauer${letzte.stufen.alles ? `, davon ${letzte.stufen.alles} hart` : ""}.</p>
      <p class="hint">${esc(V65().VERSIONS.monate)}: Stunden je Monat (Balken, nur mit bekannter Dauer${ohne ? `; ${ohne} Workouts ohne Dauer` : ""}) und Anteil der Stufen nach Anzahl (Streifen).
        Monat nach Termin, sonst nach dem Tag des Exports. Nur Workouts, die über Garmin kamen – direkt nach Zwift exportierte fehlen; vor dem 13.11.2026 hast du nicht alles nach Garmin exportiert.
        Das zeigt, was Enduco geplant hat, nicht was du gemacht hast.</p>`;
  }

  /* ---------- Schwimmübungen (uebungen-1.0) ---------- */
  function uebungen() {
    const box = $("bib-uebungen"); if (!box) return;
    const U = V65().uebungen(E), Ue = U.filter((u) => u.art === "Übung"), Se = U.filter((u) => u.art === "Serie");
    const n = E.filter((e) => e.sport === "schwimm").length, mit = E.filter((e) => e.sport === "schwimm" && Array.isArray(e.steps)).length;
    if (!U.length) { box.innerHTML = `<p class="ek-ohne">${mit ? "In den Schwimm-Workouts mit Schritten stehen keine Übungen." : `Noch kein Schwimm-Workout mit Schritten (${n} ohne). Die Schritte holt das Nacht-Update nach und nach.`}</p>`; return; }
    const zeile = (u) => `<tr><td class="wrap"><button type="button" class="bib-ue" data-bue="${esc(u.name)}">${esc(u.name)}</button></td><td>${u.workouts}</td><td>${u.meter ? u.meter.toLocaleString("de-CH") + " m" : "–"}</td>
      <td>${u.hilfsmittel.map((x) => esc(V65().HILFSMITTEL[x] || x)).join(", ") || "–"}</td><td>${esc(dch(u.zuletzt))}</td></tr>`;
    const tab = (L) => `<div class="tablewrap"><table class="t" data-liste><tr class="kopf"><th>Name</th><th>Workouts</th><th>Meter</th><th>Hilfsmittel</th><th>zuletzt</th></tr>${L.map(zeile).join("")}</table></div>`;
    box.innerHTML = `${Ue.length ? tab(Ue) : `<p class="ek-ohne">Keine Übungen erkannt – nur Serien.</p>`}
      ${Se.length ? `<details class="bib-se"><summary>Serien und Bereiche (${Se.length})</summary>${tab(Se)}</details>` : ""}
      <p class="hint">${esc(V65().VERSIONS.uebungen)}: aus den Texten der Schritte in ${mit} von ${n} Schwimm-Workouts (Name wie in Enduco; als «Serie» zählt, was nach Bereich oder Tempo klingt).
        Meter mit Wiederholungen; Antippen sucht die Workouts mit dieser Übung. Erklärt werden die Übungen hier nicht.</p>`;
    box.querySelectorAll("[data-bue]").forEach((b) => (b.onclick = () => { F.suche = b.dataset.bue; F.sport = "schwimm"; ZEIGEN = 30; M.zeichnen(); const c = $("bib-card"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  }
})();
