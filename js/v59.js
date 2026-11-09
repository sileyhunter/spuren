/* Ironman Notebook – V5.9 Oberflächen: Morgen-Check-in (befinden-1.1), Gefühl gegen Morgenwerte, Einstellungen («Direkt speichern»
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
    if (EG()) EG().beiStatus(() => { if ($("checkin")) V.checkin(); if (!$("v59-ov").hidden && V._ovArt === "einst") V.einstellungen(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("v59-ov").hidden) V.schliessen(); });
  };

  /* ======================= Morgen-Check-in (befinden-1.1) ======================= */
  const CI = { edit: false, wahl: {}, krank: false, krankListe: [], notiz: "", notizOffen: false, geladen: null, gerade: false };
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
  const wort = (f, v) => (v === 1 ? f.lo : v === 5 ? f.hi : v === 3 ? "mittel" : v < 3 ? "eher " + f.lo : "eher " + f.hi);
  V.checkin = function () {
    const box = $("checkin"); if (!box || !C || !L()) return;
    const day = heuteISO(), b = befHeute(), F = L().FRAGEN;
    if (CI.geladen !== day) { Object.assign(CI, { edit: false, wahl: {}, krank: false, krankListe: [], notiz: "", notizOffen: false, geladen: day }); }
    const karte = $("checkin-card");
    if (b && !CI.edit) {
      if (karte) karte.classList.add("ci-fertig");
      box.innerHTML = `<div class="ci-done" role="status"><span class="ci-ok" aria-hidden="true">✓</span><div><b>Befinden heute</b> ${F.map((f) => `${f.label} <b>${b[f.k] ?? "–"}</b><small> ${isNum(b[f.k]) ? esc(wort(f, b[f.k])) : ""}</small>`).join(" · ")}${b.krank ? ` · <b class="down">${esc(b.krank.join(", "))}</b>` : ""}${b.notiz ? ` · «${esc(b.notiz)}»` : ""}
        <div class="ci-meta">${syncText(b)} <button class="lnk" data-ci="edit">ändern</button></div></div></div>`;
      bind(box); return;
    }
    if (karte) karte.classList.remove("ci-fertig");
    if (!b && lsGet("sf.ci.aus") === day && !CI.edit) {
      box.innerHTML = `<div class="ci-done"><span>Check-in heute übersprungen.</span> <button class="lnk" data-ci="neu">Doch eintragen</button></div>`;
      bind(box); return;
    }
    if (CI.edit && b && !CI.gerade) {
      CI.gerade = true;
      CI.wahl = { muskel: b.muskel, muede: b.muede, stress: b.stress };
      CI.krank = !!(b.krank && b.krank.length); CI.krankListe = (b.krank || []).filter((k) => L().KRANK.includes(k)); CI.notiz = b.notiz || "";
    }
    box.innerHTML = `<div class="ci" role="group" aria-label="Morgen-Check-in">
      <div class="ci-head"><div><h2>${CI.edit ? "Befinden ändern" : "Guten Morgen – wie geht's?"}</h2><div class="sub">${CI.edit ? "Jeder Tipp speichert sofort." : "Drei Tipps, gespeichert wird von selbst."}</div></div>
        ${CI.edit ? `<button class="btn" type="button" data-ci="fertig">Fertig</button>` : `<button class="lnk" type="button" data-ci="aus">heute nicht</button>`}</div>
      ${F.map((f) => `<div class="ci-q"><span class="ci-l" id="ci-l-${f.k}">${f.label}</span>
        <div class="ci-b" role="radiogroup" aria-labelledby="ci-l-${f.k}">${[1, 2, 3, 4, 5].map((v) => `<button type="button" role="radio" class="ci-v v${v}" aria-checked="${CI.wahl[f.k] === v}" aria-label="${f.label} ${v}: ${esc(wort(f, v))}" data-q="${f.k}" data-v="${v}">${v}</button>`).join("")}</div>
        <span class="ci-e" aria-hidden="true"><span>${f.lo}</span><span>${f.hi}</span></span></div>`).join("")}
      <div class="ci-x"><label class="ci-k"><input type="checkbox" data-ci="krank" ${CI.krank ? "checked" : ""}> krank oder verletzt</label>
        ${CI.notizOffen || CI.notiz ? "" : `<button type="button" class="lnk" data-ci="notiz">＋ Notiz</button>`}</div>
      ${CI.krank ? `<div class="chips ci-kl" role="group" aria-label="Was genau? (optional)">${L().KRANK.map((k) => `<button type="button" class="chip" aria-pressed="${CI.krankListe.includes(k)}" data-kr="${esc(k)}">${esc(k)}</button>`).join("")}</div>` : ""}
      ${CI.notizOffen || CI.notiz ? `<input class="ci-n" type="text" maxlength="280" placeholder="Notiz (optional), z. B. schlecht geschlafen" aria-label="Notiz zum Befinden" value="${esc(CI.notiz)}">` : ""}
    </div>`;
    bind(box);
  };
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
  function bind(box) {
    box.querySelectorAll("[data-q]").forEach((btn) => (btn.onclick = async () => {
      const q = btn.dataset.q, v = +btn.dataset.v;
      if (CI.wahl[q] === v && !CI.edit) return;
      CI.wahl[q] = v;
      if (alleDa()) { await speichern(); if (!CI.edit) { CI.gerade = false; } }
      V.checkin();
      if (!alleDa()) { const next = L().FRAGEN.find((f) => !Number.isInteger(CI.wahl[f.k])); const el = next && box.querySelector(`[data-q="${next.k}"]`); if (el) el.focus({ preventScroll: true }); }
    }));
    box.querySelectorAll("[data-kr]").forEach((btn) => (btn.onclick = async () => {
      const k = btn.dataset.kr; CI.krankListe = CI.krankListe.includes(k) ? CI.krankListe.filter((x) => x !== k) : CI.krankListe.concat(k);
      if (alleDa()) await speichern(); V.checkin();
    }));
    const kr = box.querySelector('[data-ci="krank"]');
    if (kr) kr.onchange = async () => { CI.krank = kr.checked; if (!CI.krank) CI.krankListe = []; if (alleDa()) await speichern(); V.checkin(); };
    const n = box.querySelector(".ci-n");
    if (n) n.onchange = async () => { CI.notiz = n.value.trim(); if (alleDa()) await speichern(); };
    box.querySelectorAll("[data-ci]").forEach((btn) => {
      const a = btn.dataset.ci;
      if (a === "krank") return;
      btn.onclick = () => {
        if (a === "notiz") { CI.notizOffen = true; V.checkin(); const el = box.querySelector(".ci-n"); if (el) el.focus(); }
        if (a === "aus") { lsSet("sf.ci.aus", heuteISO()); V.checkin(); }
        if (a === "neu") { lsSet("sf.ci.aus", null); V.checkin(); }
        if (a === "edit") { CI.edit = true; CI.gerade = false; V.checkin(); }
        if (a === "fertig") { if (n) CI.notiz = n.value.trim(); const fertig = async () => { if (alleDa()) await speichern(); CI.edit = false; CI.gerade = false; V.checkin(); }; fertig(); }
        if (a === "einst") V.einstellungen("direkt");
      };
    });
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
    ov.querySelectorAll("[data-ein]").forEach((cb) => (cb.onchange = () => {
      const s = new Set(V.eingeblendet()); if (cb.checked) s.add(cb.dataset.ein); else s.delete(cb.dataset.ein);
      lsSet(AUS_KEY, JSON.stringify([...s])); location.reload();
    }));
    if (abschnitt) { const el = ov.querySelector("#es-" + abschnitt); if (el) el.scrollIntoView({ block: "start" }); }
  };

  /* ----- 3c Laktat bestätigen: ganzer Test auf einmal, Abweichungen sichtbar ----- */
  V.testBestaetigen = function (id) {
    const p = (C.D.laktat_vorschau || []).find((x) => x.id === id);
    const I = UI().Inbox;
    if (!p) return false;
    const rad = p.sport !== "lauf", u = rad ? "W" : "km/h", grenze = rad ? 5 : 0.3, d0 = (v) => (isNum(v) ? C.fmt(v, rad ? 0 : 1) : "–");
    const Z = p.zeilen || [];
    const flags = (z) => { const f = []; if (z.la == null) f.push("kein Laktatwert"); if (p.art === "stufentest" && z.status && z.status !== "eindeutig") f.push(z.status); if (z.fit && isNum(z.fit.dx) && Math.abs(z.fit.dx) > grenze) f.push(`Leistung ${C.fmt(z.fit.dx, rad ? 0 : 1)} ${u} neben der Tabelle`); if (z.hinweis) f.push(z.hinweis); return f; };
    const mitLa = Z.filter((z) => z.la != null).length, auff = Z.filter((z) => flags(z).length).length;
    const rows = Z.map((z, i) => { const f = flags(z); return `<tr class="${f.length ? "flag" : ""}"><td>${z.stufe ?? i + 1}</td><td>${d0(z.x)}</td><td>${z.fit ? d0(z.fit.x) : "–"}</td><td>${z.la != null ? C.fmt(z.la, 1) : "–"}</td><td>${isNum(z.hf) ? z.hf : "–"}${z.fit && isNum(z.fit.hr_vor) ? ` / ${Math.round(z.fit.hr_vor)}` : ""}</td><td class="l">${f.length ? `<small class="warn-t">${esc(f.join("; "))}</small>` : "ok"}</td></tr>`; }).join("");
    const ov = oeffne("best", `<div class="te-head"><h2 id="v59-ov-h" tabindex="-1">${p.art === "check" ? "Messung" : "Test"} bestätigen · ${esc(C.dateCH(p.datum))} · ${rad ? "Rad" : "Lauf"}</h2><button class="btn" data-x>Abbrechen</button></div>
      <p class="hint">Quelle: ${esc(p.datei || "–")}${p.zuordnung ? ` · Zuordnung zur Aktivität: ${esc(p.zuordnung)}` : ""}${p.regel ? ` (${esc(p.regel)})` : ""}. Bestätigst du, übernimmt das nächste Update ${p.art === "check" ? "die Messung" : `alle ${mitLa} Stufen mit Laktatwert`} als Laktatmessung und rechnet die Schwellen neu; deine Zonen ändern sich dadurch nicht.</p>
      <div class="tablewrap"><table class="t v59-bt" data-liste><tr><th>${p.art === "check" ? "Block" : "Stufe"}</th><th>Tabelle ${u}</th><th>FIT ${u}</th><th>Laktat</th><th>Puls Tab. / FIT</th><th class="l">Prüfen</th></tr>${rows}</table></div>
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
