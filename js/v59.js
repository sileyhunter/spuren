/* Ironman Notebook – V5.9 Oberflächen: Morgen-Check-in (befinden-2.0 seit V6.3), Gefühl gegen Morgenwerte, Einstellungen («Direkt speichern»
 * mit GitHub-Schlüssel, ausgeblendete Karten), Laktat bestätigen (B1, 3c). Rechenlogik in js/v59-logik.js, Senden in js/eingang.js.
 * Grundsätze: fehlend bleibt fehlend; nichts wird geschätzt; Eingaben bleiben verschlüsselt (Gerät, eingang/, data.enc.json). */
(function () {
  "use strict";
  const V = (window.V59 = window.V59 || {});
  const $ = (id) => document.getElementById(id);
  const UI = () => window.V5UI, L = () => window.V59L, EG = () => window.EG;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  let C = null;
  const esc = (s) => (C ? C.esc(s) : String(s ?? ""));
  const heuteISO = () => C.iso(C.today);
  const lsKey = (k) => (C && C.IS_DEMO ? "demo." : "") + k;
  const lsGet = (k) => { try { return localStorage.getItem(lsKey(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(lsKey(k)); else localStorage.setItem(lsKey(k), v); } catch (e) {} };

  V.init = function (ctx) {
    C = ctx;
    beobachten();
    if (EG()) EG().beiStatus(() => { if ($("checkin")) V.checkin(); if (!$("v59-ov").hidden && V._ovArt === "einst") V.einstellungen(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("v59-ov").hidden) V.schliessen(); });
  };

  /* ======================= Morgen-Check-in (befinden-2.0) =======================
   * V6.0.1: Begrüssungskarte auf «Heute» (ein Satz zur Lage, «Heute nicht» und «Check-in»). V6.3 (Etappe 3): Blatt mit vier Fragen
   * (Schlaf, Energie, Beine, Kopf) und sieben Stufen als Farbskala (1 = sehr gut … 4 = durchschnittlich … 7 = sehr schlecht, Türkis → Pink).
   * Gespeichert wird mit «Speichern» (als «befinden», verschlüsselt); ältere Einträge mit fünf Stufen bleiben, wie sie sind. */
  const CI = { wahl: {}, krank: false, krankListe: [], notiz: "", geladen: null };
  const befHeute = () => (UI() ? UI().befinden().find((b) => b.date === heuteISO()) : null) || null;
  /** Steht der Eintrag schon in den Daten, ist er gesendet oder wartet er? */
  function syncText(b) {
    if (!b._lokal) return `<span class="ci-s ok">in den Daten</span>`;
    const I = UI().Inbox, E = EG();
    if (C.IS_DEMO) return `<span class="ci-s">Demo: nur auf diesem Gerät</span>`;
    if (!E || !E.aktiv() || !E.hatSchluessel()) return `<span class="ci-s">nur auf diesem Gerät – <button class="lnk" data-ci="einst">Direkt speichern einrichten</button></span>`;
    const offen = E.offen(I.data, (I.data.eg || {}).gesendet).normal.keys["befinden|" + b.date];
    const st = E.status();
    if (!offen) return `<span class="ci-s ok">gesendet ✓</span>`;
    return `<span class="ci-s${st.zustand === "fehler" ? " down" : ""}">${st.zustand === "sendet" ? "wird gesendet …" : st.zustand === "fehler" ? esc(st.text) : "wartet, geht von selbst raus"}</span>`;
  }
  const wort = (f, v) => L().wort(f, v);
  const gross1 = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const FRAGE_ICON = { schlaf: "schlaf", muskel: "beine", muede: "energie", stress: "kopf" };
  const ico = (k, w) => (window.V6 ? window.V6.icon(k, w) : "");
  /** Ein Satz zur Lage: geplante Einheit(en) und Bereitschaft (nur aus vorhandenen Werten). */
  function lageSatz() {
    const r = UI() && UI().lastReadiness, E = L().geplantAm(C.D.planned, heuteISO());
    const titel = (p) => `«${p.title || SPORT_WORT[p.sport] || "Training"}»`;
    const teil1 = E.length === 1 ? `Heute steht ${titel(E[0].p)} an (${SPORT_WORT[E[0].p.sport] || E[0].p.sport || "Training"}).`
      : E.length > 1 ? `Heute stehen ${E.length} Einheiten an: ${E.map((e) => titel(e.p)).join(" und ")}.` : "Heute ist nichts geplant.";
    let teil2 = "";
    if (r) teil2 = E.length ? r.empfehlung : { bereit: "Die Morgenwerte sehen gut aus.", normal: "Die Morgenwerte liegen im üblichen Bereich.",
      vorsichtig: r.empfehlung, "nicht beurteilbar": "Für eine Einschätzung fehlen Morgenwerte." }[r.status] || "";
    return esc(teil1) + (teil2 ? " " + esc(teil2) : "");
  }
  V.checkin = function () {
    const box = $("checkin"); if (!box || !C || !L()) return;
    const day = heuteISO(), b = befHeute(), F = L().FRAGEN;
    if (CI.geladen !== day) Object.assign(CI, { wahl: {}, krank: false, krankListe: [], notiz: "", geladen: day });
    const h = new Date().getHours(), gruss = window.V6 ? window.V6.gruss(h) : "Guten Morgen";
    const karte = $("checkin-card"); if (karte) karte.classList.toggle("ci-fertig", !!b);
    let unten;
    if (b) unten = `<div class="ci-done" role="status"><span class="ci-ok" aria-hidden="true">✓</span><div><b>Befinden heute</b> ${F.filter((f) => isNum(b[f.k])).map((f) => `${f.label} <b>${b[f.k]}/${L().skalaVon(b)}</b><small> ${esc(L().wortVon(b, f))}</small>`).join(" · ")}${b.krank ? ` · <b class="down">${esc(b.krank.join(", "))}</b>` : ""}${b.notiz ? ` · «${esc(b.notiz)}»` : ""}
        <div class="ci-meta">${syncText(b)}</div></div></div>
      <div class="gr-knoepfe"><button class="btn" type="button" data-ci="blatt">Ändern</button></div>`;
    else if (lsGet("sf.ci.aus") === day) unten = `<p class="gr-zeile">Check-in heute übersprungen.</p><div class="gr-knoepfe"><button class="btn" type="button" data-ci="neu">Doch eintragen</button></div>`;
    else unten = `<div class="gr-knoepfe"><button class="btn gross" type="button" data-ci="aus">Heute nicht</button><button class="btn primary gross" type="button" data-ci="blatt">${ico("check", 20)} Check-in</button></div>`;
    box.innerHTML = `<div class="gruss"><h2>${esc(gruss)}</h2><p class="gr-lage">${lageSatz()}</p>${unten}</div>`;
    bindKarte(box);
    if (window.V59_CI_AUF) { window.V59_CI_AUF = false; if (!b) V.checkinBlatt(); }
  };
  function bindKarte(box) {
    box.querySelectorAll("[data-ci]").forEach((btn) => (btn.onclick = () => {
      const a = btn.dataset.ci;
      if (a === "blatt") V.checkinBlatt();
      if (a === "aus") { lsSet("sf.ci.aus", heuteISO()); V.checkin(); V.heuteOben(); }
      if (a === "neu") { lsSet("sf.ci.aus", null); V.checkinBlatt(); }
      if (a === "einst") V.einstellungen("direkt");
    }));
  }
  async function speichern() {
    const alt = befHeute();
    const b = L().checkinEintrag(heuteISO(), CI.wahl, { krank: CI.krank ? (CI.krankListe.length ? CI.krankListe : true) : null, notiz: CI.notiz, nachtdienst: alt && alt.nachtdienst });
    if (!b) return false;
    await UI().Inbox.upsert("befinden", b, (x) => x.date);
    try { UI().heute(); } catch (e) { console.error(e); }
    V.gefuehlKarte();
    return true;
  }
  const alleDa = () => L().FRAGEN.every((f) => Number.isInteger(CI.wahl[f.k]));
  /** Check-in als Blatt: drei Fragen, je Symbol, Frage, grosser Wert und Farbskala mit fünf Punkten. */
  V.checkinBlatt = function () {
    if (!C || !L()) return;
    const day = heuteISO(), b = befHeute(), F = L().FRAGEN;
    if (CI.geladen !== day) CI.geladen = day;
    if (b) Object.assign(CI, { wahl: L().skalaVon(b) === L().SKALA ? { schlaf: b.schlaf, muskel: b.muskel, muede: b.muede, stress: b.stress } : {},   // alte 5er-Einträge nicht umdeuten
      krank: !!(b.krank && b.krank.length), krankListe: (b.krank || []).filter((k) => L().KRANK.includes(k)), notiz: b.notiz || "" });
    const frage = (f) => {
      const v = CI.wahl[f.k], ic = FRAGE_ICON[f.k] || "check", text = f.text || f.label, N = L().SKALA;
      return `<div class="ci-frage" data-f="${f.k}"><h3 class="abschnitt">${ico(ic, 15)}${esc(f.label)}</h3><p class="ci-text" id="ci-l-${f.k}">${esc(text)}</p>
        <b class="ci-wert" aria-live="polite">${Number.isInteger(v) ? esc(gross1(wort(f, v))) : "–"}</b>
        <div class="ci-skala ci7" role="radiogroup" aria-labelledby="ci-l-${f.k}">${Array.from({ length: N }, (_, i) => i + 1).map((n) => `<button type="button" role="radio" class="ci-p" style="--ci:var(--c7-${n})" aria-checked="${v === n}" aria-label="${esc(f.label)} ${n} von ${N}: ${esc(wort(f, n))}" data-q="${f.k}" data-v="${n}"></button>`).join("")}</div>
        <div class="ci-enden" aria-hidden="true"><span>${esc(f.lo)}</span><span>${esc(f.hi)}</span></div></div>`;
    };
    const html = `<div class="blatt-titel">${ico("check", 34)}<h2 id="v59-ov-h" tabindex="-1">Check-in</h2><p class="sub">${b ? "Befinden von heute ändern" : "Wie geht es dir heute? Vier Tipps, dann speichern."}</p></div>
      ${F.map(frage).join("")}
      <div class="ci-x"><label class="ci-k"><input type="checkbox" data-ci="krank" ${CI.krank ? "checked" : ""}> krank oder verletzt</label></div>
      <div class="chips ci-kl" role="group" aria-label="Was genau? (optional)" ${CI.krank ? "" : "hidden"}>${L().KRANK.map((k) => `<button type="button" class="chip" aria-pressed="${CI.krankListe.includes(k)}" data-kr="${esc(k)}">${esc(k)}</button>`).join("")}</div>
      <input class="ci-n" type="text" maxlength="280" placeholder="Notiz (optional), z. B. schlecht geschlafen" aria-label="Notiz zum Befinden" value="${esc(CI.notiz)}">
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück ohne zu speichern">${ico("zurueck", 22)}</button>
        <button type="button" class="btn primary gross" data-ci="speichern" ${alleDa() ? "" : "disabled"}>Speichern</button></div>`;
    const ov = oeffne("checkin", html);
    bindBlatt(ov);
  };
  function bindBlatt(ov) {
    const F = L().FRAGEN, save = ov.querySelector('[data-ci="speichern"]');
    ov.querySelectorAll("[data-q]").forEach((btn) => (btn.onclick = () => {
      const q = btn.dataset.q, v = +btn.dataset.v, f = F.find((x) => x.k === q);
      CI.wahl[q] = v;
      const blk = btn.closest(".ci-frage");
      blk.querySelectorAll("[data-q]").forEach((x) => x.setAttribute("aria-checked", String(+x.dataset.v === v)));
      blk.querySelector(".ci-wert").textContent = gross1(wort(f, v));
      save.disabled = !alleDa();
      const next = F.find((x) => !Number.isInteger(CI.wahl[x.k]));
      if (next) { const el = ov.querySelector(`.ci-frage[data-f="${next.k}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    }));
    const kr = ov.querySelector('[data-ci="krank"]'), kl = ov.querySelector(".ci-kl");
    if (kr) kr.onchange = () => { CI.krank = kr.checked; if (!CI.krank) { CI.krankListe = []; kl.querySelectorAll("[data-kr]").forEach((x) => x.setAttribute("aria-pressed", "false")); } kl.hidden = !CI.krank; };
    ov.querySelectorAll("[data-kr]").forEach((btn) => (btn.onclick = () => {
      const k = btn.dataset.kr; CI.krankListe = CI.krankListe.includes(k) ? CI.krankListe.filter((x) => x !== k) : CI.krankListe.concat(k);
      btn.setAttribute("aria-pressed", String(CI.krankListe.includes(k)));
    }));
    const n = ov.querySelector(".ci-n");
    if (n) n.oninput = () => { CI.notiz = n.value.trim(); };
    save.onclick = async () => {
      if (!alleDa()) return;
      save.disabled = true; save.textContent = "Speichert …";
      try { await speichern(); lsSet("sf.ci.aus", null); V.schliessen(); V.checkin(); V.heuteOben(); }
      catch (e) { console.error(e); save.disabled = false; save.textContent = "Speichern"; }
    };
  }
  /** Gefühl gegen Morgenwerte (ab 20 Morgen mit Check-in; ersetzt die RPE-Kalibrierung der Einheiten). */
  V.gefuehlKarte = function () {
    const box = $("gefuehl"); if (!box || !C || !L()) return;
    const K = L().gefuehlKalibrierung(UI().befinden(), C.D.days, C.D.activities);
    if (K.n < K.noetig) {
      box.innerHTML = `<p class="ci-kal"><b>${K.n}</b> von ${K.noetig} Morgen mit Check-in. Ab ${K.noetig} zeigt diese Karte, welcher Wert – HRV, Ruhepuls, Schlaf oder Trainingslast – bei dir am besten zu deinem Gefühl passt.</p>
        <p class="hint">Rangkorrelation (Spearman) aus deinen eigenen Morgen; keine Prozente, keine Ursache. Regel ${esc(K.v)}.</p>`;
      return;
    }
    const best = K.werte.find((w) => w.k === K.bester);
    box.innerHTML = `<p class="ci-kal">${best ? `Am besten passt bei dir: <b>${esc(best.label)}</b> (ρ = ${best.rho.toFixed(2)}, n = ${best.n}).` : "Bisher passt kein Wert brauchbar zu deinem Gefühl (|ρ| unter 0.3)."}</p>
      <div class="tablewrap"><table class="t" data-liste><tr><th class="l">Wert</th><th>ρ</th><th>n</th><th class="l">Einordnung</th></tr>${K.werte.map((w) => `<tr><td class="l">${esc(w.label)}</td><td>${w.rho == null ? "–" : w.rho.toFixed(2)}</td><td>${w.n}</td><td class="l">${w.rho == null ? "zu wenige Paare" : !w.brauchbar ? "kein brauchbarer Zusammenhang" : w.erwartet ? "passt, in der erwarteten Richtung" : "passt, aber umgekehrt als erwartet"}</td></tr>`).join("")}</table></div>
      <p class="hint">Gefühl = Mittel aus Beine, Energie und Kopf. HRV und Ruhepuls gegen deine eigenen 60 Tage davor, Schlaf = Garmin-Schlafwert der Nacht, Last = Trainingslast am Vortag (alle Sportarten). |ρ| ab 0.3 = brauchbar. Nur Zusammenhang, keine Ursache. Regel ${esc(K.v)}.</p>`;
  };

  /* ======================= Heute oben (V6.0.1): Kacheln, Heutiges Training, Wochenleiste – in js/v6-heute.js =======================
   * Ersetzt «Heute geplant» und «Bereitschaft in einem Satz» (morgen-1.0): dieselben Daten, jetzt als Kacheln, Karten und Blätter. */
  const SPORT_WORT = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen", wandern: "Wandern", ski: "Ski", andere: "Training", kraft: "Kraft" };
  V.heuteOben = function () {
    if (!C || !L()) return;
    if (window.V6H) { try { window.V6H.zeichnen(); } catch (e) { console.error(e); } }
  };

  /* ======================= Bedienung (bedienung-1.0): Info-Knopf und Tabellen als Liste ======================= */
  const ERKL = '.card-head .sub:not([id]), .card > .sub:not([id]), .card > h2 + .sub:not([id]), .card p.hint, .card div.hint, .card .td-dq';
  const BLEIBT = '[role="status"], [aria-live], .warn-t, .down, .verdict, .keep, .ci, .ci *, .ci-done, .ci-done *, .hp-leer, .syncbar, .syncbar *, .info-knopf';
  const ERGEBNIS = 'canvas, table, ul, ol, dl, .kv, .verdict, .rg, .dev-num, .ci, .ci-done, .race, .cal, .rd-status, .td-tiles, .td-verdict, input, textarea, .bk-satz, .hp-wo, .hp-leer, img, .dev-tile';
  const LISTEN_IN = ["#v56-plan", "#v56-saison", "#v56-ermuedung"];
  V.erklImmer = () => lsGet("sf.erkl.immer") === "1";
  function infoKarte(card) {
    if (card.closest("#view-karte") || card.hidden) return;
    if (V.erklImmer()) { card.querySelectorAll(".erkl").forEach((e) => e.classList.remove("erkl")); card.classList.remove("hat-info"); card.querySelector(":scope > .info-knopf")?.remove(); return; }
    const kand = [...card.querySelectorAll(ERKL)].filter((e) => !e.matches(BLEIBT) && !e.closest(BLEIBT.replace(/, \.[a-z-]+ \*/g, "")) && e.textContent.trim());
    const ergebnis = [...card.querySelectorAll(ERGEBNIS)].some((e) => !kand.some((k) => k.contains(e)) && !(e.tagName === "TABLE" && ![...e.rows].some((r) => [...r.cells].some((c) => c.tagName === "TD"))));   // leere Tabelle ist kein Ergebnis
    card.querySelectorAll(".erkl").forEach((e) => { if (!kand.includes(e) || !ergebnis) e.classList.remove("erkl"); });
    if (!ergebnis || !kand.length) { card.classList.remove("hat-info"); card.querySelector(":scope > .info-knopf")?.remove(); return; }
    kand.forEach((e) => e.classList.add("erkl"));
    card.classList.add("hat-info");
    let b = card.querySelector(":scope > .info-knopf");
    if (!b) {
      b = document.createElement("button"); b.type = "button"; b.className = "info-knopf"; b.textContent = "i";
      b.setAttribute("aria-label", "Erklärung, Regel und Quelle zeigen"); b.setAttribute("aria-expanded", "false");
      b.onclick = () => { const auf = card.classList.toggle("info-auf"); b.setAttribute("aria-expanded", String(auf)); };
      card.insertBefore(b, card.firstChild);
    }
  }
  function alsListe(t) {
    t.classList.add("als-liste");
    const rows = [...t.rows]; if (!rows.length) return;
    const kopf = rows.find((r) => r.cells.length && [...r.cells].every((c) => c.tagName === "TH"));
    if (!kopf) return;
    kopf.classList.add("kopf");
    const lab = []; for (const c of kopf.cells) for (let k = 0; k < (c.colSpan || 1); k++) lab.push(c.textContent.trim());
    for (const r of rows) { if (r === kopf) continue; let j = 0; for (const c of r.cells) { const l = lab[j]; if (l && j > 0 && !c.hasAttribute("data-l")) c.setAttribute("data-l", l); j += c.colSpan || 1; } }
  }
  const schmal = () => typeof matchMedia === "function" && matchMedia("(max-width: 640px)").matches;
  V.ansicht = function (name) {
    const sec = document.getElementById("view-" + name); if (!sec || name === "karte") return;
    sec.querySelectorAll("table.t[data-liste]").forEach(alsListe);
    for (const sel of LISTEN_IN) sec.querySelectorAll(sel + " table.t").forEach(alsListe);
    if (schmal()) sec.querySelectorAll(".tablewrap > table.t:not(.als-liste):not([data-keine-liste])").forEach((t) => { const w = t.parentElement; if (w.offsetParent && w.scrollWidth > w.clientWidth + 8) alsListe(t); });   // jede zu breite Tabelle: Liste statt Wischen
    sec.querySelectorAll(".card").forEach(infoKarte);
  };
  let beobachter = null, geplant = 0;
  function beobachten() {
    if (beobachter || typeof MutationObserver === "undefined") return;
    const main = document.querySelector("main"); if (!main) return;
    beobachter = new MutationObserver(() => { if (geplant) return; geplant = requestAnimationFrame(() => { geplant = 0; const v = document.querySelector("section.view:not([hidden])"); if (v) V.ansicht(v.id.slice(5)); }); });
    beobachter.observe(main, { childList: true, subtree: true });
  }

  /* ======================= Overlay (Einstellungen, Bestätigen) ======================= */
  function oeffne(art, html) {
    const ov = $("v59-ov"); V._ovArt = art;
    ov.innerHTML = `<div class="te-box" role="dialog" aria-modal="true" aria-labelledby="v59-ov-h">${html}</div>`;
    ov.hidden = false; document.body.classList.add("noscroll");
    ov.querySelectorAll("[data-x]").forEach((b) => (b.onclick = V.schliessen));
    ov.onclick = (e) => { if (e.target === ov) V.schliessen(); };
    const h = $("v59-ov-h"); if (h) h.focus();
    return ov;
  }
  V.blatt = oeffne;                  // V6.0.1: Blätter für Check-in, Einheit, Optionen, Bereitschaft (js/v6-heute.js)
  V.schliessen = function () { const ov = $("v59-ov"); ov.hidden = true; ov.innerHTML = ""; V._ovArt = null; document.body.classList.remove("noscroll"); };

  /* ----- Einstellungen: Direkt speichern, ausgeblendete Karten ----- */
  const AUS_KEY = "sf.eingeblendet";
  V.eingeblendet = () => { try { return JSON.parse(lsGet(AUS_KEY) || "[]"); } catch (e) { return []; } };
  /** Beim Start: Karten mit data-ausgeblendet bleiben verborgen, ausser du hast sie wieder eingeblendet (Daten bleiben immer). */
  V.ausblenden = function () {
    const ein = new Set(V.eingeblendet());
    for (const el of document.querySelectorAll("[data-ausgeblendet]")) {
      el.dataset.ausblendbar = el.dataset.ausgeblendet;
      if (el.id && ein.has(el.id)) { delete el.dataset.ausgeblendet; el.hidden = false; } else el.hidden = true;
    }
  };
  V.einstellungen = function (abschnitt) {
    if (!C) return;
    const E = EG(), st = E ? E.status() : null, aktiv = E && E.aktiv(), hat = E && E.hatSchluessel();
    const eg = (UI().Inbox.data && UI().Inbox.data.eg) || { dateien: [] };
    const ein = new Set(V.eingeblendet());
    const karten = [...document.querySelectorAll("[data-ausblendbar]")].filter((el) => el.id);
    const titel = (el) => (el.querySelector("h2") || {}).textContent || el.id;
    const ov = oeffne("einst", `<div class="te-head"><h2 id="v59-ov-h" tabindex="-1">Einstellungen</h2><button class="btn" data-x>Schliessen</button></div>
      <section class="es" id="es-direkt"><h3>Direkt speichern (GitHub)</h3>
        ${C.IS_DEMO ? `<p class="hint">In der Demo wird nichts gesendet.</p>` : !aktiv ? `<p class="hint">Erst mit deinem Seitenpasswort entsperren.</p>` : `
        <p class="es-st${st && st.zustand === "fehler" ? " down" : ""}" role="status">${hat ? "Schlüssel gespeichert (verschlüsselt auf diesem Gerät)." : "Noch kein Schlüssel: Eingaben bleiben auf diesem Gerät, Rückweg «Exportieren»."} ${st ? esc(st.text) : ""}${st && st.offen ? ` <b>${st.offen}</b> Eingabe${st.offen === 1 ? "" : "n"} noch nicht gesendet.` : ""}</p>
        <form class="es-f" id="es-gh" autocomplete="off"><label>GitHub-Schlüssel${hat ? " ersetzen" : ""}<input type="password" name="t" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="github_pat_…"></label>
          <div class="row"><button class="btn primary" type="submit">Speichern</button>${hat ? `<button class="btn" type="button" data-es="test">Verbindung testen</button><button class="btn" type="button" data-es="senden">Jetzt senden</button><button class="btn" type="button" data-es="weg">Schlüssel entfernen</button>` : ""}</div>
          <p class="hint" id="es-msg" aria-live="polite"></p></form>
        <details class="es-hilfe"${hat ? "" : " open"}><summary>So legst du den Schlüssel an (einmal, etwa 2 Minuten)</summary><ol>
          <li>Auf github.com anmelden und <b>github.com/settings/personal-access-tokens/new</b> öffnen (Einstellungen → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token).</li>
          <li>Name z. B. «Ironman Notebook iPhone», Ablauf <b>1 Jahr</b>.</li>
          <li>Repository access: <b>Only select repositories</b> → <b>sileyhunter/spuren</b>.</li>
          <li>Permissions → Repository permissions → <b>Contents: Read and write</b> (sonst nichts).</li>
          <li>«Generate token», den Schlüssel kopieren (beginnt mit github_pat_) und oben einfügen.</li></ol>
          <p class="hint">Der Schlüssel liegt mit deinem Seitenschlüssel verschlüsselt auf diesem Gerät, nie im Repository. Risiko: Wer dein Gerät und dein Seitenpasswort hat, kann in dieses eine Repository schreiben, aber nirgends sonst. Widerrufen kannst du ihn jederzeit auf GitHub. Pro Gerät einmal einrichten.</p></details>
        ${(eg.dateien || []).length ? `<details><summary>Zuletzt gesendet</summary><ul class="es-l">${eg.dateien.slice(-8).reverse().map((d) => `<li>${new Date(d.zeit).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · ${d.n} ${d.art === "bestaetigung" ? "Bestätigung" : "Eingabe"}${d.n === 1 ? "" : "n"}</li>`).join("")}</ul></details>` : ""}`}
      </section>
      <section class="es" id="es-verlauf"><h3>Garmin-Verlauf einlesen</h3>${verlaufHtml()}</section>
      <section class="es" id="es-bed"><h3>Bedienung</h3>
        <div class="es-thema" role="radiogroup" aria-label="Darstellung"><span>Darstellung</span>
          <label class="row"><input type="radio" name="es-thema" value="dunkel" ${lsGet("sf.theme") === "hell" ? "" : "checked"}> Dunkel (Standard)</label>
          <label class="row"><input type="radio" name="es-thema" value="hell" ${lsGet("sf.theme") === "hell" ? "checked" : ""}> Hell</label></div>
        <label class="row"><input type="checkbox" data-erkl ${V.erklImmer() ? "checked" : ""}> <span>Erklärtexte, Regeln und Quellen immer zeigen (sonst hinter dem Knopf <b>i</b> je Karte)</span></label></section>
      <section class="es" id="es-aus"><h3>Ausgeblendete Karten</h3><p class="hint">Ausgeblendet heisst nicht gelöscht: Die Daten bleiben. Einblenden gilt für dieses Gerät.</p>
        <ul class="es-l">${karten.map((el) => `<li><label class="row"><input type="checkbox" data-ein="${esc(el.id)}" ${ein.has(el.id) ? "checked" : ""}> <span><b>${esc(titel(el))}</b><br><small>${esc(el.dataset.ausblendbar)}</small></span></label></li>`).join("") || "<li>Keine.</li>"}</ul></section>`);
    const f = ov.querySelector("#es-gh"), msg = ov.querySelector("#es-msg");
    if (f) f.onsubmit = async (e) => { e.preventDefault(); try { await E.schluesselSetzen(f.t.value); f.t.value = ""; msg.textContent = "Gespeichert. Ich sende jetzt, was offen ist."; await E.senden(); V.einstellungen(); } catch (err) { msg.textContent = err.message; } };
    ov.querySelectorAll("[data-es]").forEach((b) => (b.onclick = async () => {
      const a = b.dataset.es; b.disabled = true;
      if (a === "test") { msg.textContent = "Teste …"; await E.testen(); msg.textContent = E.status().text; }
      if (a === "senden") { await E.senden(); msg.textContent = E.status().text; }
      if (a === "weg") { E.schluesselEntfernen(); V.einstellungen(); return; }
      b.disabled = false;
    }));
    ov.querySelectorAll('input[name="es-thema"]').forEach((r) => (r.onchange = () => { lsSet("sf.theme", r.value === "hell" ? "hell" : null); location.reload(); }));
    const ek = ov.querySelector("[data-erkl]");
    if (ek) ek.onchange = () => { lsSet("sf.erkl.immer", ek.checked ? "1" : null); const v = document.querySelector("section.view:not([hidden])"); if (v) V.ansicht(v.id.slice(5)); };
    ov.querySelectorAll("[data-ein]").forEach((cb) => (cb.onchange = () => {
      const s = new Set(V.eingeblendet()); if (cb.checked) s.add(cb.dataset.ein); else s.delete(cb.dataset.ein);
      lsSet(AUS_KEY, JSON.stringify([...s])); location.reload();
    }));
    verlaufBinden(ov);
    if (abschnitt) { const el = ov.querySelector("#es-" + abschnitt); if (el) el.scrollIntoView({ block: "start" }); }
  };
  /* ----- V6.2.3 Garmin-Verlauf aus dem Datenexport (Datei aus dem Chat, garmin-export-1.0): verschlüsselt über «Direkt speichern» ins Update ----- */
  const fNamen = (anz) => Object.entries(anz || {}).filter(([k]) => k !== "readinessLevel").map(([k, n]) => `${esc((window.V61 && V61.VERLAUF.namen[k]) || k)} ${n}`).join(" · ");
  function verlaufHtml() {
    const I = UI().Inbox, gv = I.data && I.data.garmin_verlauf, imp = (C.D.garmin_export || []).slice(-1)[0];
    const z = (a) => (a && a.length === 2 ? `${C.dateCH(a[0])}–${C.dateCH(a[1])}` : "–");
    const gesendet = gv && ((I.data.eg && I.data.eg.gesendet) || {})["garmin_verlauf|" + gv.id] === "1";
    return `${imp ? `<p class="es-st" role="status">Eingespielt am ${C.dateCH(String(imp.eingespielt || "").slice(0, 10))}: ${z(imp.zeitraum)}, ${imp.neue_tage} neue Tage; ergänzt: ${fNamen(imp.gefuellt) || "nichts (alles schon da)"}.</p>` : ""}
      ${gv ? `<p class="es-st" role="status">Bereit: Verlauf ${z(gv.zeitraum)} (${(gv.tage || []).length} Tage). ${gesendet ? "Gesendet – das nächste Update spielt ihn ein." : C.IS_DEMO ? "In der Demo wird nichts gesendet." : "Geht mit «Direkt speichern» ins nächste Update."}</p>
        ${gesendet ? "" : `<div class="row"><button class="btn" type="button" data-gv-weg>Entfernen</button></div>`}` : ""}
      <p class="hint">Datei «garmin-verlauf-….json» aus dem Chat wählen (aus deinem Garmin-Datenexport: Schlafdauer, Schlafwert, Stress im Schlaf, Readiness).
        Das Update füllt damit nur Tage und Werte, die noch fehlen; was über die Garmin-Verbindung kommt, bleibt massgebend. Die Datei geht verschlüsselt weg.</p>
      <label class="btn es-datei">Datei wählen<input type="file" accept=".json,application/json" data-gv hidden></label>
      <div data-gv-info aria-live="polite"></div>`;
  }
  function verlaufBinden(ov) {
    const I = UI().Inbox, inp = ov.querySelector("[data-gv]"), info = ov.querySelector("[data-gv-info]"), weg = ov.querySelector("[data-gv-weg]");
    if (weg) weg.onclick = async () => { I.data.garmin_verlauf = null; await I.save(); V.einstellungen("verlauf"); };
    if (!inp || !info) return;
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      let G = null, p = null;
      try {
        if (f.size > 5e6) throw new Error("Datei zu gross.");
        G = JSON.parse(await f.text());
        p = window.V61 ? V61.verlaufPruefen(G, C.iso(C.today)) : { ok: false, grund: "Prüfung nicht verfügbar." };
      } catch (e) { p = { ok: false, grund: e.message && /JSON/.test(e.message) ? "Datei ist kein lesbares JSON." : e.message || "Datei nicht lesbar." }; }
      if (!p.ok) { info.innerHTML = `<p class="verdict warn">${esc(p.grund)}</p>`; return; }
      const schon = (C.D.garmin_export || []).some((x) => x.id === p.id);
      info.innerHTML = `<dl class="dl"><dt>Zeitraum</dt><dd>${C.dateCH(p.zeitraum[0])}–${C.dateCH(p.zeitraum[1])}</dd><dt>Tage</dt><dd>${p.tage}</dd>
          <dt>Werte</dt><dd>${fNamen(p.anzahl)}</dd>${p.verworfen ? `<dt>Verworfen</dt><dd>${p.verworfen} Tage mit ungültigen Werten</dd>` : ""}</dl>
        ${schon ? `<p class="hint keep">Diese Datei ist schon eingespielt.</p>` : `<div class="row"><button class="btn primary" type="button" data-gv-ok>Einlesen</button></div>`}`;
      const ok = info.querySelector("[data-gv-ok]");
      if (ok) ok.onclick = async () => { I.data.garmin_verlauf = G; await I.save(); V.einstellungen("verlauf"); };
    };
  }

  /* ----- 3c Laktat bestätigen: ganzer Test auf einmal, Abweichungen sichtbar ----- */
  V.testBestaetigen = function (id) {
    const p = (C.D.laktat_vorschau || []).find((x) => x.id === id);
    const I = UI().Inbox;
    if (!p) return false;
    const rad = p.sport !== "lauf", u = rad ? "W" : "km/h", grenze = rad ? 5 : 0.3, d0 = (v) => (isNum(v) ? C.fmt(v, rad ? 0 : 1) : "–");
    const Z = p.zeilen || [];
    const flags = (z) => { const f = []; if (z.la == null) f.push("kein Laktatwert"); if (p.art === "stufentest" && z.status && z.status !== "eindeutig") f.push(z.status); if (z.fit && isNum(z.fit.dx) && Math.abs(z.fit.dx) > grenze) f.push(`Leistung ${C.fmt(z.fit.dx, rad ? 0 : 1)} ${u} neben der Tabelle`); if (z.hinweis) f.push(z.hinweis); return f; };
    const mitLa = Z.filter((z) => z.la != null).length, auff = Z.filter((z) => flags(z).length).length;
    const ausNotiz = p.quelle_art === "notiz";      // V6.1 notizen-1.0: Werte laut Garmin-Notiz, nicht aus FIT nachgerechnet
    const rows = Z.map((z, i) => { const f = flags(z); return `<tr class="${f.length ? "flag" : ""}"><td>${ausNotiz && p.block ? esc(p.block) : z.stufe ?? i + 1}</td><td>${d0(z.x)}</td><td>${z.fit ? d0(z.fit.x) : "–"}</td><td>${z.la != null ? C.fmt(z.la, 1) : "–"}</td><td>${isNum(z.hf) ? z.hf : "–"}${z.fit && isNum(z.fit.hr_vor) ? ` / ${Math.round(z.fit.hr_vor)}` : ""}</td><td class="l">${f.length ? `<small class="warn-t">${esc(f.join("; "))}</small>` : "ok"}</td></tr>`; }).join("");
    const ov = oeffne("best", `<div class="te-head"><h2 id="v59-ov-h" tabindex="-1">${p.art === "check" ? "Messung" : "Test"} bestätigen · ${esc(C.dateCH(p.datum))} · ${rad ? "Rad" : "Lauf"}</h2><button class="btn" data-x>Abbrechen</button></div>
      <p class="hint">Quelle: ${esc(p.datei || "–")}${p.zuordnung ? ` · Zuordnung zur Aktivität: ${esc(p.zuordnung)}` : ""}${p.regel ? ` (${esc(p.regel)})` : ""}. Bestätigst du, übernimmt das nächste Update ${p.art === "check" ? "die Messung" : `alle ${mitLa} Stufen mit Laktatwert`} als Laktatmessung und rechnet die Schwellen neu; deine Zonen ändern sich dadurch nicht.</p>
      <div class="tablewrap"><table class="t v59-bt" data-liste><tr><th>${p.art === "check" ? "Block" : "Stufe"}</th><th>${ausNotiz ? "Notiz" : "Tabelle"} ${u}</th><th>FIT ${u}</th><th>Laktat</th><th>Puls ${ausNotiz ? "Notiz" : "Tab."} / FIT</th><th class="l">Prüfen</th></tr>${rows}</table></div>
      ${(p.hinweise || []).length ? `<ul class="es-l">${p.hinweise.map((h) => `<li><small>${esc(h)}</small></li>`).join("")}</ul>` : ""}
      ${auff ? `<p class="verdict warn">${auff} von ${Z.length} Zeilen mit Hinweis – bitte ansehen. Falsche Werte korrigiere ich im Chat, bevor du bestätigst.</p>` : ""}
      <div class="row"><button class="btn primary" type="button" data-ok>${p.art === "check" ? "Messung bestätigen" : `Test bestätigen – alle ${mitLa} Stufen`}</button><button class="btn" type="button" data-x>Abbrechen</button></div>`);
    ov.querySelector("[data-ok]").onclick = async () => {
      if (!I.data.laktat_bestaetigt.includes(id)) I.data.laktat_bestaetigt.push(id);
      await I.save(); V.schliessen(); try { UI().library(); } catch (e) { console.error(e); }
    };
    return true;
  };
  /** «Laktat hier» aus dem Explorer: als Kurzcheck bestätigen. */
  V.punktBestaetigen = function (p, fertig) {
    const I = UI().Inbox, a = (C.ACT_BY_ID && C.ACT_BY_ID.get(p.act)) || {};
    const hms = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
    const ab = p.abschnitt || {}, lauf = p.sport === "lauf";
    const ov = oeffne("best", `<div class="te-head"><h2 id="v59-ov-h" tabindex="-1">Laktat bestätigen · ${esc(C.dateCH(p.datum))}</h2><button class="btn" data-x>Abbrechen</button></div>
      <p>${esc(a.name || "Einheit")}: <b>${C.fmt(p.la, 1)} mmol/l</b> bei ${hms(p.t)} · Abschnitt ${hms(ab.von)}–${hms(ab.bis)} · ${lauf ? (isNum(ab.pace) ? "Pace " + Math.floor(ab.pace / 60) + ":" + String(Math.round(ab.pace % 60)).padStart(2, "0") + " /km" : "Pace –") : `Ø ${isNum(ab.w) ? ab.w + " W" : "–"}${isNum(ab.np) ? ` · NP ${ab.np} W` : ""}`} · Puls Ø ${isNum(ab.hr) ? ab.hr : "–"}</p>
      <p class="hint">Zuordnung: ${esc(ab.grund || "–")}. Bestätigst du, übernimmt das nächste Update den Wert als Kurzcheck (Quelle «aus Explorer»). Zonen ändern sich dadurch nicht.</p>
      <div class="row"><button class="btn primary" type="button" data-ok>Als Kurzcheck bestätigen</button><button class="btn" type="button" data-x>Abbrechen</button></div>`);
    ov.querySelector("[data-ok]").onclick = async () => {
      I.data.laktat_punkte_bestaetigt = I.data.laktat_punkte_bestaetigt || [];
      if (!I.data.laktat_punkte_bestaetigt.includes(p.id)) I.data.laktat_punkte_bestaetigt.push(p.id);
      await I.save(); V.schliessen(); if (fertig) fertig();
    };
  };
})();
