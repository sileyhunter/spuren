/* Ironman Notebook – V5.5 Schwimmen: CSS-Test (400/200 m, von Hand, korrigierbar), Fehlerboard aus dem Videovergleich,
 * Rohpace aus Garmin nur als «Rohdaten, eingeschränkte Aussagekraft».
 * Keine automatische Bewegungsanalyse, keine Trainingsanweisung: alles stammt aus Silas' eigenen Messungen und Beobachtungen. */
(function () {
  "use strict";
  const V = (window.V55S = window.V55S || {});
  const $ = (id) => document.getElementById(id);
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const UI = () => window.V5UI;
  const pill = (s, extra) => (UI() && UI().badge ? UI().badge(s, extra) : `<span class="badge">${s}</span>`);
  V.VERSION = "css-2.0";            // V5.9.4: CSS einziger Schwimm-Massstab (E6), Eintrag mit zwei Zeiten; Formel unverändert (css-1.0)
  V.VERSION_ZONEN = "schwimmseiten-1.0";   // V9.12: Schätzung markiert, Tempo-Zonen aus dem CSS, Puls im Wasser, Test-Einheit

  /** «9:00», «9.00», «9:00.5» oder Sekunden («540») → Sekunden; sonst null. */
  V.parseZeit = function (s) {
    s = String(s == null ? "" : s).trim().replace(",", ".");
    if (!s) return null;
    let m = s.match(/^(\d{1,2})[:.'](\d{1,2}(?:\.\d+)?)$/);
    if (m && +m[2] < 60) return +m[1] * 60 + +m[2];
    m = s.match(/^(\d{2,4}(?:\.\d+)?)$/);
    return m ? +m[1] : null;
  };
  const mmss = (s) => { if (!isNum(s)) return "–"; const r = Math.round(s * 10) / 10, m = Math.floor(r / 60), x = r - m * 60; return `${m}:${(x < 10 ? "0" : "") + (Number.isInteger(x) ? x : x.toFixed(1))}`; };
  V.mmss = mmss;

  /** Prüfung eines CSS-Tests: Fehler verhindern das Speichern, Hinweise nicht. */
  V.pruefe = function (t400, t200) {
    const fehler = [], hinweise = [];
    if (!isNum(t400) || !isNum(t200)) fehler.push("Beide Zeiten eingeben (mm:ss).");
    else {
      if (t400 <= t200) fehler.push("Die 400-m-Zeit muss länger sein als die 200-m-Zeit.");
      else if (t400 / 4 < t200 / 2) hinweise.push("Die 400 m sind pro 100 m schneller als die 200 m – Zeiten vertauscht oder Distanz falsch?");
      const css = window.FK.css(t400, t200);
      if (isNum(css) && (css < 55 || css > 300)) hinweise.push(`CSS ${mmss(css)} /100 m liegt ausserhalb von 0:55–5:00 – Zeiten prüfen.`);
    }
    return { fehler, hinweise, css: fehler.length ? null : window.FK.css(t400, t200) };
  };

  const tests = () => (UI() ? UI().merged("css_tests", "css") : []).slice().sort((a, b) => (a.datum || "").localeCompare(b.datum || "") || (a.id || "").localeCompare(b.id || ""));
  let EDIT = null, MSG = null;
  const wtag = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
  const gesendet = (t) => !!(window.EG && UI() && UI().Inbox && window.EG.istGesendet(UI().Inbox.data, "css", t));
  V.status = (t) => (t.geschaetzt ? pill("geschätzt", "noch nicht geschwommen") : t._lokal ? (gesendet(t) ? pill("gesendet", "kommt mit dem nächsten Update") : pill("entwurf", "auf dem Gerät")) : pill(t.validiert === false ? "vorschau" : "bestätigt"));

  /* ---------------- CSS-Test (css-2.0: einziger Massstab, zwei Zeiten genügen) ---------------- */
  V.css = function (C) {
    const box = $("sw-css"); if (!box) return;
    const L = tests(), e = EDIT ? L.find((t) => t.id === EDIT) : null;
    const v = (k, d) => C.esc(e ? (e[k] ?? d) : d);
    const pr = e && e.protokoll || {};
    const plan = window.V59L ? window.V59L.cssPlan(C.D.tests, L, C.iso(C.today)) : { liste: [], naechster: null }, nx = plan.naechster;
    const planTxt = plan.liste.length ? `<p class="keep css-plan">${nx ? `Nächster CSS-Test: <b>${C.esc(wtag(nx.date))}</b>${nx.note ? " – " + C.esc(nx.note) : ""}` : "Alle geplanten CSS-Tests sind eingetragen."}`
      + `<br><small>${plan.liste.map((t) => `${t.done ? "✓ " : ""}${C.dateCH(t.date)}`).join(" · ")} (Testkalender)</small></p>` : "";
    const msg = MSG; MSG = null;
    box.innerHTML = `${planTxt}<form class="css-form" id="css-form" novalidate>
        <div class="css-grid">
          <label>Datum<input type="date" name="datum" value="${v("datum", C.iso(C.today))}" required></label>
          <label>400 m (mm:ss)<input name="t400" inputmode="decimal" autocomplete="off" placeholder="9:00" value="${e ? mmss(e.t400) : ""}" required></label>
          <label>200 m (mm:ss)<input name="t200" inputmode="decimal" autocomplete="off" placeholder="4:20" value="${e ? mmss(e.t200) : ""}" required></label>
        </div>
        <details class="more css-mehr"${e ? " open" : ""}><summary><span>Mehr Angaben<small class="css-std">sonst: 25-m-Becken, 400 → 200, 10 min Pause, von Hand gestoppt</small></span></summary>
        <div class="css-grid">
          <label>Becken<select name="becken">${[["25", "25 m"], ["50", "50 m"], ["frei", "Freiwasser"]].map(([k, l]) => `<option value="${k}" ${String(e ? e.becken : "25") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label>Reihenfolge<select name="reihenfolge">${[["400 zuerst, dann 200", "400 → 200"], ["200 zuerst, dann 400", "200 → 400"]].map(([x, l]) => `<option value="${x}" ${pr.reihenfolge === x ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label>Pause dazwischen (min)<input name="pause" type="number" min="0" max="60" step="1" value="${C.esc(pr.pause_min ?? 10)}"></label>
          <label>Wassertemperatur (°C)<input name="wtemp" type="number" min="10" max="35" step="0.5" value="${C.esc(e && e.wasser && e.wasser.temp_c != null ? e.wasser.temp_c : "")}" placeholder="optional"></label>
          <label>Zeit genommen<select name="quelle">${[["von Hand gestoppt", "von Hand"], ["Uhr: manuelle Runde", "Uhr (Runde)"], ["Trainer/Begleitung", "Begleitung"]].map(([x, l]) => `<option value="${x}" ${e && e.quelle === x ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="span2">Einschwimmen / Ablauf<input name="einschwimmen" value="${C.esc(pr.einschwimmen ?? "")}" placeholder="z. B. 10 min locker, 4 × 25 m steigernd"></label>
          <label class="span2 css-schaetz"><input type="checkbox" name="geschaetzt"${e && e.geschaetzt ? " checked" : ""}> Schätzung – noch nicht geschwommen (zählt für den Plan, nicht für «Meine Entwicklung»)</label>
          <label class="span2">Notiz (Bedingungen)<input name="notiz" value="${v("notiz", "")}" placeholder="z. B. Bahn geteilt, Wende ohne Rolle"></label>
        </div></details>
        ${msg ? `<p class="keep" role="status">${msg}</p>` : ""}
        <p class="css-live" id="css-live" aria-live="polite"></p>
        <div class="row"><button class="btn primary" type="submit">${e ? "Korrektur speichern" : "Test speichern"}</button>${e ? '<button class="btn" type="button" id="css-cancel">Abbrechen</button>' : ""}</div>
      </form>
      <div id="css-list"></div>`;
    const f = $("css-form");
    const live = () => {
      const t4 = V.parseZeit(f.t400.value), t2 = V.parseZeit(f.t200.value), p = V.pruefe(t4, t2);
      $("css-live").innerHTML = !f.t400.value && !f.t200.value ? `<span class="hint">CSS = (Zeit 400 m − Zeit 200 m) ÷ 2, als Pace pro 100 m.</span>`
        : p.fehler.length ? `<span class="hint">${C.esc(p.fehler[0])}</span>`
        : `<b>CSS ${mmss(p.css)} /100 m</b> <span class="hint">= (${mmss(t4)} − ${mmss(t2)}) ÷ 2</span>${p.hinweise.map((h) => `<br><span class="down">${C.esc(h)}</span>`).join("")}`;
    };
    f.addEventListener("input", live); live();
    if ($("css-cancel")) $("css-cancel").onclick = () => { EDIT = null; V.css(C); };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const t4 = V.parseZeit(f.t400.value), t2 = V.parseZeit(f.t200.value), p = V.pruefe(t4, t2);
      if (p.fehler.length) { live(); f.t400.focus(); return; }
      const alt = e || {};
      const item = { id: alt.id || `css-${f.datum.value}-${Date.now().toString(36)}`, datum: f.datum.value, t400: t4, t200: t2, css_s: +p.css.toFixed(1),
        becken: f.becken.value === "frei" ? null : +f.becken.value, wasser: { art: f.becken.value === "frei" ? "Freiwasser" : "Hallen-/Freibad", temp_c: f.wtemp.value ? +f.wtemp.value : null },
        protokoll: { reihenfolge: f.reihenfolge.value, pause_min: f.pause.value !== "" ? +f.pause.value : null, einschwimmen: f.einschwimmen.value.trim() || null },
        quelle: f.geschaetzt.checked ? "Schätzung" : f.quelle.value, notiz: f.notiz.value.trim() || null, validiert: !f.geschaetzt.checked, ...(f.geschaetzt.checked ? { geschaetzt: true } : {}), v: V.VERSION,
        erfasst: alt.erfasst || new Date().toISOString(), ...(alt.id ? { korrigiert: new Date().toISOString() } : {}) };
      await UI().Inbox.upsert("css", item);
      MSG = `Gespeichert: CSS <b>${mmss(p.css)} /100 m</b> vom ${C.esc(C.dateCH(item.datum))}${window.EG && window.EG.aktiv && window.EG.aktiv() && window.EG.hatSchluessel() ? " – wird direkt gesendet und kommt mit dem nächsten Update in die Daten." : " – auf diesem Gerät; mit «Direkt speichern» oder «Exportieren» in die Daten."}`;
      EDIT = null; V.css(C);
      if (window.V55 && V55.refresh) V55.refresh();
    };
    // Liste
    const rows = L.slice().reverse();
    const prevOf = (t) => { const i = L.indexOf(t); for (let k = i - 1; k >= 0; k--) if ((L[k].becken || "frei") === (t.becken || "frei") && isNum(window.FK.css(L[k].t400, L[k].t200))) return L[k]; return null; };
    $("css-list").innerHTML = rows.length ? `<h3 class="mini-h">Gespeicherte Tests <small>${rows.length}</small></h3><ul class="css-tests">${rows.map((t) => {
      const c = window.FK.css(t.t400, t.t200), pv = prevOf(t), d = pv ? c - window.FK.css(pv.t400, pv.t200) : null;
      return `<li><div class="css-top"><b>${C.dateCH(t.datum)}</b> <span class="css-val">CSS ${t.geschaetzt ? "≈ " : ""}${mmss(c)} /100 m</span> ${V.status(t)}</div>
        <div class="hint">400 m ${mmss(t.t400)} · 200 m ${mmss(t.t200)} · ${t.becken ? t.becken + " m Becken" : "Freiwasser"}${t.wasser && t.wasser.temp_c != null ? ` · ${C.fmt(t.wasser.temp_c, 1)} °C` : ""}${t.protokoll && t.protokoll.pause_min != null ? ` · Pause ${t.protokoll.pause_min} min` : ""} · ${C.esc(t.quelle || "von Hand")}${t.korrigiert ? " · korrigiert" : ""}${t.notiz ? ` · ${C.esc(t.notiz)}` : ""}</div>
        ${pv ? `<div class="hint">Gegenüber ${C.dateCH(pv.datum)} (gleiches Becken): ${d === 0 ? "gleich" : `${d < 0 ? "−" : "+"}${mmss(Math.abs(d))} /100 m`} – Einzelvergleich, ohne Unsicherheit; gesichert erst in «Meine Entwicklung» ab drei Tests je Zeitraum.</div>` : ""}
        ${t.geschaetzt ? `<div class="hint">Schätzung: gilt für Tempo und Planung, bis ein echter Test eingetragen ist. Der echte Test ersetzt sie von selbst (der jüngere Test zählt).</div>` : ""}
        <div class="row"><button class="btn" data-css-edit="${C.esc(t.id)}">${t.geschaetzt ? "Schätzung ändern" : "Zeiten korrigieren"}</button></div></li>`; }).join("")}</ul>`
      : `<p class="hint">Noch kein CSS-Test gespeichert. Ablauf: gut einschwimmen, 400 m maximal gleichmässig, Pause (z. B. 5–10 min locker), 200 m maximal. Zeiten von Hand stoppen oder als manuelle Runde nehmen und hier eintragen.</p>`;
    $("css-list").querySelectorAll("[data-css-edit]").forEach((b) => (b.onclick = () => { EDIT = b.dataset.cssEdit; V.css(C); $("sw-css").scrollIntoView({ block: "start" }); }));
    V.cssVerlauf(C, L);
  };

  /** Verlauf der CSS-Tests (ab 2 Tests), je Becken eine Linie – tiefer ist schneller. */
  V.cssVerlauf = function (C, L) {
    const wrap = $("css-chart-wrap"); if (!wrap) return;
    const P = L.map((t) => ({ t, c: window.FK.css(t.t400, t.t200) })).filter((x) => isNum(x.c));
    wrap.hidden = P.length < 2;
    if (P.length < 2) return;
    const labels = [...new Set(P.map((x) => x.t.datum))].sort(), bk = (t) => (t.becken ? t.becken + " m" : "Freiwasser");
    const farben = { "25 m": C.css("--accent"), "50 m": C.css("--sleep"), Freiwasser: C.css("--accent-2") };
    const ds = [...new Set(P.map((x) => bk(x.t)))].map((b) => ({ label: b === "Freiwasser" ? "CSS Freiwasser" : `CSS ${parseInt(b, 10)}-m-Becken`, spanGaps: true, tension: 0, pointRadius: 4, borderWidth: 2,
      borderColor: farben[b] || C.css("--fg"), backgroundColor: farben[b] || C.css("--fg"),
      pointBackgroundColor: labels.map((d) => { const x = P.filter((y) => y.t.datum === d && bk(y.t) === b).at(-1); return x && x.t.geschaetzt ? "transparent" : (farben[b] || C.css("--fg")); }),   // geschätzt = hohler Punkt
      data: labels.map((d) => { const x = P.filter((y) => y.t.datum === d && bk(y.t) === b).at(-1); return x ? +x.c.toFixed(1) : null; }) }));
    C.chart("c-css", { type: "line", data: { labels: labels.map((d) => C.dLabel(d)), datasets: ds },
      options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${mmss(c.raw)} /100 m` } } },
        scales: { y: { reverse: true, ticks: { callback: (v) => mmss(v) }, title: { display: true, text: "CSS pro 100 m (oben = schneller)" } } } } });
  };

  /* ---------------- Fehlerboard ---------------- */
  const KAT = { wasserlage: "Wasserlage", kopf: "Kopfhaltung", atmung: "Atmung", ellbogen: "Armzug / hoher Ellbogen", beine: "Beinschlag", rotation: "Rotation", wende: "Wende", anderes: "Anderes" };
  const ANSICHT = ["seitlich über Wasser", "seitlich unter Wasser", "frontal unter Wasser", "von oben / Beckenrand", "von hinten", "unbekannt"];
  const UNSICHER = ["sicher erkennbar", "unsicher (Bildwinkel/Qualität)", "nur vermutet"];
  const STATUS = ["offen", "verbessern", "bestätigt", "nicht beurteilbar"];
  V.STATUS = STATUS;
  const UEBUNG = ["Abschlagschwimmen (Catch-up)", "Seitlage 6-1-6", "Fingerspitzen ziehen", "Faustschwimmen", "Atmung 3er-Zug", "Scullen vorne", "Beinschlag in Seitlage", "Rollwende aus dem Gleiten"];
  const board = () => (UI() ? UI().merged("fehlerboard", "fehler") : []).slice().sort((a, b) => STATUS.indexOf(a.status) - STATUS.indexOf(b.status) || (b.datum || "").localeCompare(a.datum || ""));
  let PREFILL = null;
  /** Vom Video-Coach: Marke ins Fehlerboard übernehmen (Formular wird vorausgefüllt). */
  V.prefill = function (p) { PREFILL = p; const C = UI() && UI().C; if (C) { V.board(C); const d = $("fb-form"); if (d) { d.open = true; d.scrollIntoView({ block: "start" }); } } };

  V.board = function (C) {
    const box = $("sw-board"); if (!box) return;
    const p = PREFILL || {}, L = board();
    const opt = (list, sel) => list.map((x) => `<option ${x === sel ? "selected" : ""}>${C.esc(x)}</option>`).join("");
    box.innerHTML = `<details class="more" id="fb-form" ${PREFILL ? "open" : ""}><summary>Beobachtung erfassen</summary>
      <form class="fb-form" id="fb-f" novalidate><div class="css-grid">
        <label>Datum<input type="date" name="datum" value="${C.esc(p.datum || C.iso(C.today))}"></label>
        <label>Videozeit (s)<input name="t" type="number" step="0.01" min="0" value="${p.t != null ? C.esc(p.t) : ""}" placeholder="optional"></label>
        <label>Ansicht<select name="ansicht">${opt(ANSICHT, p.ansicht || "seitlich unter Wasser")}</select></label>
        <label>Bereich<select name="kategorie">${Object.entries(KAT).map(([k, l]) => `<option value="${k}" ${k === (p.kategorie || "wasserlage") ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="span2">Beobachtung<input name="beobachtung" value="${C.esc(p.beobachtung || "")}" placeholder="z. B. Ellbogen fällt beim Einsetzen ab" required></label>
        <label>Unsicherheit<select name="unsicherheit">${opt(UNSICHER, p.unsicherheit)}</select></label>
        <label>Status<select name="status">${opt(STATUS, p.status || "offen")}</select></label>
        <label class="span2">Sollzustand<input name="soll" value="${C.esc(p.soll || "")}" placeholder="z. B. Unterarm früh senkrecht, Ellbogen über der Hand"></label>
        <label class="span2">Übung<input name="uebung" list="fb-ueb" value="${C.esc(p.uebung || "")}" placeholder="aus der Liste oder eigene"></label>
        <label class="span2">Nächste Messaufnahme<input name="naechste" value="${C.esc(p.naechste || "")}" placeholder="z. B. Video seitlich unter Wasser, 25 m locker, gleiche Bahn"></label>
      </div><datalist id="fb-ueb">${UEBUNG.map((u) => `<option value="${C.esc(u)}">`).join("")}</datalist>
      <p class="hint" id="fb-msg"></p>
      <div class="row"><button class="btn primary" type="submit">${p.id ? "Änderung speichern" : "Ins Fehlerboard"}</button>${PREFILL ? '<button class="btn" type="button" id="fb-cancel">Abbrechen</button>' : ""}</div></form></details>
      <div id="fb-list">${L.length ? STATUS.map((s) => { const g = L.filter((x) => (x.status || "offen") === s); return g.length ? `<h3 class="mini-h">${pill(s)} <small>${g.length}</small></h3><ul class="fb-list">${g.map((x) => `<li>
          <div class="fb-top"><b>${C.esc(KAT[x.kategorie] || x.kategorie || "")}</b><span class="hint">${C.dateCH(x.datum)}${x.t != null ? ` · ${C.fmt(x.t, 2)} s` : ""} · ${C.esc(x.ansicht || "")}</span></div>
          <p>${C.esc(x.beobachtung || "")} <small class="hint">(${C.esc(x.unsicherheit || "")}${x.quelle ? ", " + C.esc(x.quelle) : ""})</small></p>
          <dl class="fb-dl">${x.soll ? `<dt>Soll</dt><dd>${C.esc(x.soll)}</dd>` : ""}${x.uebung ? `<dt>Übung</dt><dd>${C.esc(x.uebung)}</dd>` : ""}${x.naechste ? `<dt>Nächste Aufnahme</dt><dd>${C.esc(x.naechste)}</dd>` : ""}</dl>
          <div class="row"><label class="fb-st">Status <select data-fb-st="${C.esc(x.id)}">${opt(STATUS, x.status || "offen")}</select></label><button class="btn" data-fb-ed="${C.esc(x.id)}">Bearbeiten</button></div></li>`).join("")}</ul>` : ""; }).join("")
        : `<p class="hint">Noch keine Einträge. Beobachtungen kommen aus deinem Videovergleich (oben: Marke setzen → «Ins Fehlerboard») oder aus einer externen Analyse mit Quelle.</p>`}</div>`;
    const f = $("fb-f");
    if ($("fb-cancel")) $("fb-cancel").onclick = () => { PREFILL = null; V.board(C); };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!f.beobachtung.value.trim()) { $("fb-msg").textContent = "Beobachtung eintragen."; f.beobachtung.focus(); return; }
      const item = { id: p.id || `fb-${Date.now().toString(36)}`, datum: f.datum.value, t: f.t.value !== "" ? +f.t.value : null, ansicht: f.ansicht.value, kategorie: f.kategorie.value,
        beobachtung: f.beobachtung.value.trim(), unsicherheit: f.unsicherheit.value, soll: f.soll.value.trim() || null, uebung: f.uebung.value.trim() || null,
        naechste: f.naechste.value.trim() || null, status: f.status.value, sitzung: p.sitzung || null, video: p.video || null, quelle: p.quelle || "manueller Videovergleich",
        verlauf: (p.verlauf || []).concat([{ datum: C.iso(C.today), status: f.status.value }]) };
      await UI().Inbox.upsert("fehler", item);
      PREFILL = null; V.board(C);
    };
    box.querySelectorAll("[data-fb-st]").forEach((s) => (s.onchange = async () => {
      const x = board().find((y) => y.id === s.dataset.fbSt); if (!x) return;
      const y = Object.assign({}, x, { status: s.value, verlauf: (x.verlauf || []).concat([{ datum: C.iso(C.today), status: s.value }]) }); delete y._lokal;
      await UI().Inbox.upsert("fehler", y); V.board(C);
    }));
    box.querySelectorAll("[data-fb-ed]").forEach((b) => (b.onclick = () => { const x = board().find((y) => y.id === b.dataset.fbEd); if (!x) return; PREFILL = Object.assign({}, x); delete PREFILL._lokal; V.board(C); $("fb-form").scrollIntoView({ block: "start" }); }));
  };

  /* ---------------- Rohpace (Garmin) ---------------- */
  V.rohpace = function (C) {
    const n = $("swim-raw-note"); if (!n || ($("sw-raw-card") && $("sw-raw-card").hidden)) return;      // V5.9.4: ausgeblendet (E6)
    const sw = C.D.activities.filter((a) => a.sport === "schwimm" && a.km > 0 && a.dur);
    const bad = sw.filter((a) => /freiwasser|open/i.test(a.typ || a.type || "")).length;
    n.innerHTML = `${pill("nicht validiert")} Pace = Dauer ÷ Distanz der ganzen Einheit aus Garmin (${sw.length} Einheiten${bad ? `, davon ${bad} Freiwasser` : ""}). Enthält Pausen am Rand, Technik-, Bein- und Pull-Serien; Bahnen und Wenden erkennt die Uhr nicht immer. Darum <b>kein bestätigter Fortschritt</b> – Vergleiche nur über den CSS-Test oben.`;
  };

  /* ---------------- V9.12 schwimmseiten-1.0: CSS und Zonen im Wasser, Test-Einheit ---------------- */
  const hm = (s) => (window.SW && isNum(s) ? window.SW.mmss(s) : mmss(s));
  /** Der gültige CSS: der jüngste Test mit beiden Zeiten (wie die Planung, V64UI.cssAktuell) – geschätzt oder geschwommen. → { s, datum, geschaetzt } oder null */
  V.cssAktuell = function (L) {
    const x = (L || []).filter((t) => t && t.datum && isNum(t.t400) && isNum(t.t200) && isNum(window.FK.css(t.t400, t.t200))).sort((a, b) => a.datum.localeCompare(b.datum)).at(-1);
    return x ? { s: window.FK.css(x.t400, x.t200), datum: x.datum, geschaetzt: !!x.geschaetzt, vorschau: x.validiert === false && !x.geschaetzt } : null;
  };
  /** Text einer Pulszone: «unter 129», «129–142», «ab 159 (bis 175)». */
  V.pulsText = function (z, hfmax) {
    if (!z) return "";
    if (z.von == null) return `unter ${z.bis}`;
    if (z.bis == null) return `ab ${z.von}${isNum(hfmax) && hfmax > z.von ? ` (bis ${hfmax})` : ""}`;
    return `${z.von}–${z.bis}`;
  };
  /** HTML der Karte «CSS und Zonen im Wasser» (rein). o = { css: V.cssAktuell(…), hf: Zonenliste Schwimm-Puls | null, hfmax, hinweis, esc, dateCH, pill } */
  V.zonenHTML = function (o) {
    const esc = o.esc || ((x) => String(x)), pl = o.pill || ((s) => `<span class="badge">${esc(s)}</span>`), SW = window.SW;
    if (!o.css) return `<p class="hint">Noch kein CSS – ohne CSS gibt es keine Tempo-Zonen im Wasser. Trag oben einen Test oder eine Schätzung (400 m und 200 m) ein.</p>`;
    const Z = SW ? SW.cssZonen(o.css.s) : null;
    const kopf = `<p class="keep css-wert">CSS <b>${o.css.geschaetzt ? "≈ " : ""}${hm(o.css.s)} /100 m</b> ${o.css.geschaetzt ? pl("geschätzt", "noch nicht geschwommen") : pl(o.css.vorschau ? "vorschau" : "bestätigt")} <small>vom ${esc(o.dateCH ? o.dateCH(o.css.datum) : o.css.datum)}</small></p>`;
    const tempo = Z ? `<h3 class="mini-h">Tempo pro 100 m <small>aus dem CSS (${esc(SW.VERSIONS.zonen)})</small></h3><table class="t zonen-tab"><tbody>${Z.map((z) => `<tr><th>${esc(z.z)}</th><td>${esc(z.name)}</td><td>${esc(SW.zoneText(z))}</td></tr>`).join("")}</tbody></table>
      <p class="hint">Eigene Festlegung, keine Studienvorgabe: Anteile der CSS-Zeit (Z1 über 115 %, Z2 105–115 %, Z3 100–105 %, Z4 96–100 %, Z5 schneller). ${o.css.geschaetzt ? "Mit einer Schätzung gelten sie nur grob." : ""}</p>` : "";
    const puls = o.hf && o.hf.length ? `<h3 class="mini-h">Puls im Wasser <small>Orientierung${o.stand ? ", Stand " + esc(o.dateCH ? o.dateCH(o.stand) : o.stand) : ""}</small></h3><table class="t zonen-tab"><tbody>${o.hf.map((z) => `<tr><th>${esc(z.z)}</th><td>${esc(V.pulsText(z, o.hfmax))} bpm</td></tr>`).join("")}</tbody></table>
      <p class="hint">${esc(o.hinweis || "Der Puls am Handgelenk ist im Wasser ungenau und verzögert; das Tempo (CSS) bleibt der Massstab.")}</p>`
      : `<p class="hint">Eigene Pulszonen fürs Schwimmen sind noch nicht festgelegt – bis dahin gilt der Standard der Uhr.</p>`;
    return kopf + tempo + puls;
  };
  /** HTML der Karte «Test-Einheit» (rein). o = { naechster: { date, note } | null, verpasst: { date, note } | null (geplant, vorbei, nicht eingetragen), esc, wtag } */
  V.testHTML = function (o) {
    const esc = o.esc || ((x) => String(x)), nx = o.naechster;
    const vp = o.verpasst;
    return `<p class="keep">${nx ? `Nächster CSS-Test: <b>${esc(o.wtag ? o.wtag(nx.date) : nx.date)}</b>${nx.note ? " – " + esc(nx.note) : ""}.` : "Kein CSS-Test im Testkalender offen."}${vp ? ` <small>Offen aus der Vergangenheit: ${esc(o.wtag ? o.wtag(vp.date) : vp.date)}${vp.note ? " (" + esc(vp.note) + ")" : ""} – der CSS gilt bis dahin als Schätzung.</small>` : ""}</p>
      <ol class="css-ablauf"><li>400 m einschwimmen, dann 4 × 50 m steigernd mit 15 s Pause</li><li>2 min Pause</li><li><b>400 m</b> maximal, gleichmässig – Zeit merken</li>
        <li>Erholung 5–10 min locker, Taste drücken, wenn bereit</li><li><b>200 m</b> maximal – Zeit merken</li><li>200 m ausschwimmen</li></ol>
      <p class="hint">Bahn 50 m (wie in den Planeinstellungen; ein anderes Becken beim Eintragen angeben). Zeiten nach der Einheit oben bei «CSS-Test» eintragen. Als Workout für die Uhr gibt es «IN · CSS-Test 400/200» (1400 m, Bahn 50 m, Erholung per Taste); es kommt nach Garmin Connect, wenn du es willst – die Seite lädt nichts selbst hoch.</p>`;
  };
  V.zonen = function (C) {
    const box = $("sw-zonen"), tb = $("sw-test"); if (!box && !tb) return;
    const L = tests();
    if (box) {
      // Puls im Wasser: eigener Datenschlüssel «schwimm_puls» (nicht im Zonenprofil: keine LT1/LT2-Bezüge, keine Intensitätsverteilung, nur Orientierung)
      const sp = C.D && C.D.schwimm_puls, hf = sp && Array.isArray(sp.zonen) && sp.zonen.length ? sp.zonen : null;
      box.innerHTML = V.zonenHTML({ css: V.cssAktuell(L), hf, hfmax: null, hinweis: sp ? sp.hinweis : null, stand: sp ? sp.stand : null, esc: C.esc, dateCH: C.dateCH, pill });
    }
    if (tb) {
      const plan = window.V59L ? window.V59L.cssPlan(C.D.tests, L, C.iso(C.today)) : { naechster: null };
      const heute = C.iso(C.today), vp = (plan.liste || []).filter((t) => !t.done && t.date < heute).pop() || null;
      tb.innerHTML = V.testHTML({ naechster: plan.naechster, verpasst: vp, esc: C.esc, wtag });
    }
  };
  V.schwimmen = function (C) { V.css(C); V.zonen(C); V.board(C); V.rohpace(C); };
})();
