/* Ironman Notebook V7.4 – Etappe 6, Oberfläche «Ampel passt das Training an» (ampel-plan-1.0, Rechenteil js/v74.js).
   - Stand je Tag: vergangene Tage aus dem gespeicherten Entscheid (ampel_anpassung, darüber die noch nicht eingespielten Eingaben auf diesem Gerät),
     heute live aus der Ampel (Morgenwerte und Check-in); kommende Tage ohne Entscheid. Ändert sich der Entscheid von heute, speichert die Seite
     ihn über «Direkt speichern» (Eingabe «ampel» → ampel_anpassung) – ohne Knopfdruck. «Trotzdem wie geplant» gilt je Tag.
   - Angewendet wird die Schicht beim Zeichnen (js/v64-ui.js, kontext): Heute, Kalender, Tagesblatt, Einheit-Seite, TL ≈, Form und Plan-Übersicht
     rechnen mit dem, was galt bzw. gilt; Mein Plan bleibt, wie er gespeichert ist.
   - Ab dem dritten Tag «vorsichtig» in Folge: Vorschlag «Woche anpassen?» (Rest der Woche als Erholungswoche) – ändert erst auf Knopfdruck.
   Die Seite schreibt nichts nach Garmin; die lockere Fassung auf der Uhr setzt das Morgen-Update (Entscheid A7, tools/garmin_senden.py ampel). */
(function () {
  "use strict";
  const M = (window.V74UI = window.V74UI || {});
  const UI = () => window.V5UI, V74 = () => window.V74, FK = () => window.FK, V6 = () => window.V6, V59 = () => window.V59, V64 = () => window.V64;
  // checkin-anpassung-1.0 (V9.8): V59().blatt / schliessen für das Blatt «Überprüfen»
  const V66 = () => window.V66, U66 = () => window.V66UI, P = () => window.V64UI, TR = () => window.TR;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && V74() && FK() && V6()); };
  const heute = () => C.iso(C.today);
  const lsGet = (k) => { try { return localStorage.getItem((C && C.IS_DEMO ? "demo." : "") + k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem((C && C.IS_DEMO ? "demo." : "") + k); else localStorage.setItem((C && C.IS_DEMO ? "demo." : "") + k, v); } catch (e) { /* privat */ } };
  const lokal = () => ((UI() && UI().Inbox && UI().Inbox.data) || {}).ampel || [];
  const daten = () => (C && Array.isArray(C.D.ampel_anpassung) ? C.D.ampel_anpassung : []);
  const neuZeichnen = () => { try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); } };
  const wt = (iso) => V74().wochentag(iso);
  const AMPEL_WORT = { bereit: "Bereit", normal: "Normal", vorsichtig: "Vorsicht", "nicht beurteilbar": "nicht beurteilbar" };

  /* ---------- Stand je Tag ---------- */
  let MEMO = null;
  /** Entscheid von heute aus der Ampel (Morgenwerte, Check-in); einmal je Datenstand gerechnet. */
  function live() {
    const d = heute(), bef = UI().befinden(), b = bef.find((x) => x.date === d) || null, day = (C.D.days || []).find((x) => x.date === d) || null;
    const key = JSON.stringify([d, b, day, (C.D.activities || []).length, (C.D.days || []).length]);
    if (MEMO && MEMO.key === key) return MEMO.e;
    let r = null; try { r = FK().readiness(C.D.days, C.D.activities, bef, d); } catch (e) { console.error(e); }
    const e = V74().entscheid(r, { morgenwerte: V74().morgenwerte(C.D.days, d), datum: d });
    MEMO = { key, e };
    return e;
  }
  M.live = () => (bereit() ? live() : null);
  /** Gespeicherter Entscheid eines Tages (Daten, darüber das Gerät). */
  M.gespeichert = (d) => (bereit() ? V74().gespeichert(d, daten(), lokal()) : null);
  /** Stand für die Schicht: vergangene Tage gespeichert, heute live (mit «Trotzdem»), kommende Tage nichts. */
  M.stand = function (d) {
    if (!bereit()) return null;
    const h = heute();
    if (d > h) return null;
    const g = M.gespeichert(d);
    if (d < h) return V74().ausEintrag(g);
    const e = live(), w = V74().wirkung(e.status, g);                          // ampel-plan-1.3: «vorsichtig» erst nach «Akzeptieren»
    return Object.assign({}, e, { trotzdem: w.aus, offen: w.offen });
  };
  /** Woche mit der Ampel-Schicht (aus js/v64-ui.js). opt = { ctx, verf }. */
  M.anwenden = function (w, opt) {
    if (!bereit() || !w) return w;
    try { return V74().woche(w, M.stand, opt); } catch (e) { console.error(e); return w; }
  };

  /* ---------- Speichern (Eingabe «ampel», «Direkt speichern») ---------- */
  let SPEICHERT = false;
  async function sichern(x) {
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.ampel)) I.data.ampel = [];
    await I.upsert("ampel", x);
    try { if (U66() && U66().auftraegeAbgleichen && V64()) await U66().auftraegeAbgleichen(V64().montag(heute())); } catch (e) { console.error(e); }
    return null;
  }
  /** Ändert sich der Entscheid von heute (Morgenwerte da, Check-in), wird er gespeichert – ohne Knopfdruck. «Trotzdem» bleibt. */
  let ABGEGLICHEN = null;
  M.pruefen = async function () {
    if (!bereit() || SPEICHERT) return;
    const d = heute(), e = live(), g = M.gespeichert(d);
    if (g ? g.status === e.status : e.status === "wie_geplant") {
      // einmal je Tag: offene Aufträge der Woche mit dem abgleichen, was gilt (z. B. Entscheid vom Morgen-Update mit nachgeholter Einheit,
      // ältere Aufträge ohne lockere Fassung) – nur geänderte werden neu gespeichert
      if (ABGEGLICHEN !== d && U66() && U66().auftraegeAbgleichen && V64()) { ABGEGLICHEN = d; try { await U66().auftraegeAbgleichen(V64().montag(d)); } catch (err) { console.error(err); } }
      return;
    }
    SPEICHERT = true;
    try { await sichern(V74().eintrag(e, { quelle: "seite", trotzdem: g && g.trotzdem, angenommen: g && g.angenommen })); neuZeichnen(); }
    catch (err) { console.error(err); } finally { SPEICHERT = false; }
  };
  /** «Trotzdem wie geplant» / «Ignorieren» (an = true) oder «Doch anpassen» / «Akzeptieren» (an = false) – nur für heute. ampel-plan-1.3: speichert dazu die Antwort. */
  M.trotzdem = async function (an) {
    if (!bereit()) return "Seite noch nicht bereit";
    const jetzt = new Date().toISOString(), f = await sichern(V74().eintrag(live(), { quelle: "seite", jetzt, trotzdem: { an: !!an, am: jetzt }, angenommen: { an: !an, am: jetzt } }));
    neuZeichnen();
    return f;
  };
  /** checkin-anpassung-1.0: was «Akzeptieren» heute ändern würde (Woche mit angewendetem Entscheid) → Ampel-Info des Tages oder null. */
  M.vorschau = function (ds) {
    if (!bereit() || !P() || !P().kontextFuer) return null;
    const K = P().kontextFuer(V64().montag(ds)); if (!K || !K.wPlan) return null;
    const st = (d) => { const x = M.stand(d); return d === ds && x ? Object.assign({}, x, { trotzdem: false, offen: false }) : x; };
    let w = null; try { w = V74().woche(K.wPlan, st, { ctx: K.ctxE || {}, verf: K.verf }); } catch (e) { console.error(e); return null; }
    const t = w && w.tage.find((x) => x.date === ds);
    return t ? Object.assign({ einheiten: t.einheiten }, t.ampel || {}) : null;
  };
  /** Blatt «Überprüfen» (wie Enduco): Grund, gestrichen / geändert, «Ignorieren» und «Akzeptieren». */
  M.ueberpruefen = function (ds) {
    if (!bereit() || !V59() || !V59().blatt) return;
    const A = M.vorschau(ds), W = V6(); if (!A) return;
    const weg = A.geaendert.filter((g) => !g.nach).concat(A.status === "krank" ? [] : []), neu = A.geaendert.filter((g) => g.nach);
    const zeile = (e, alt) => `<li><span class="${alt ? "aa-alt" : ""}">${W.sportIcon ? W.sportIcon(e.sport, 14) : ""} ${esc(e.titel)}</span><small>${esc(dauer(e.dauer))}</small></li>`;
    const ov = V59().blatt("aa-pruefen", `<div class="blatt-titel"><h2 id="v59-ov-h" tabindex="-1">${W.icon("funken", 18)} Überprüfen</h2></div>
      <p class="aa-text">${esc(textVon(A))}</p>
      ${weg.length ? `<h3 class="abschnitt">Gestrichen</h3><ul class="aa-pl">${weg.map((g) => zeile(g.von, true)).join("")}</ul>` : ""}
      ${neu.length ? `<h3 class="abschnitt">Geändert</h3><ul class="aa-pl">${neu.map((g) => `${zeile(g.von, true)}${zeile(g.nach, false)}`).join("")}</ul>` : ""}
      ${!weg.length && !neu.length ? `<p class="hint">Heute ändert sich nichts an den Einheiten.</p>` : ""}
      <div class="blatt-fuss"><button type="button" class="btn" data-aaw="nein">Ignorieren</button><button type="button" class="btn primary" data-aaw="ja">Akzeptieren ✓</button></div>
      <p class="warn-t" data-aafehler hidden></p>`);
    ov.querySelectorAll("[data-aaw]").forEach((b) => (b.onclick = async () => {
      b.disabled = true; const f = await M.trotzdem(b.dataset.aaw === "nein"); b.disabled = false;
      if (f) { const p = ov.querySelector("[data-aafehler]"); if (p) { p.textContent = f; p.hidden = false; } return; }
      V59().schliessen();
    }));
  };
  /** Ein Satz Grund (aus den Gründen der Ampel). */
  function textVon(A) {
    const g = (A.gruende || []).slice(0, 2).map((x) => String(x).replace(/[.\s]+$/, "") + ".").join(" ");
    return (g ? g + " " : "") + (A.status === "krank" ? "Heute ist Ruhetag." : "Darum heute lieber locker – die harten Abschnitte fallen weg.");
  }

  /* ---------- Anzeige ---------- */
  const skalen = () => (TR() && C ? TR().zonen(C.D.zonen).skalen : null);
  /** Stand auf der Uhr für eine heute gelockerte Einheit: «hart» (noch die harte Fassung), «locker» (lockere Fassung vom Morgen-Update) oder null. */
  function uhr(ds, e) {
    const G = (Array.isArray(C.D.plan_garmin) ? C.D.plan_garmin : []).find((g) => g && g.uid === e.uid && g.date === ds && !g.entfernt);
    if (!G) return null;
    if (G.ampel) return "locker";
    let st = null; try { const A = U66() && U66().auftrag ? U66().auftrag(ds) : null; st = V66().garminStand(e, ds, skalen(), C.D.plan_garmin, A && A.a, U66() && U66().swOpt ? U66().swOpt(ds) : null); } catch (err) { console.error(err); }
    return st === "geaendert" ? "hart" : null;
  }
  const dauer = (m) => V6().dauerText(Math.max(0, Math.round(m || 0)) * 60);
  /** Banner eines Tages mit Entscheid (Heute, Tagesblatt): Gründe, was sich änderte, Nachholen, Gesperrtes, Uhr, «Trotzdem wie geplant». */
  M.banner = function (ds, t) {
    if (!bereit() || !t) return "";
    const A = t.ampel, h = heute(), W = V6(), nach = (t.einheiten || []).filter((e) => e.ampel && e.ampel.nachgeholt && !e.ampel.von);
    let html = "";
    const V = A && A.status === "vorsichtig" && A.offen && ds === h ? M.vorschau(ds) : null;
    const zuTun = !!(V && ((V.geaendert || []).length || (V.weg || []).length));
    if (A && A.status === "vorsichtig" && A.offen && ds === h && !zuTun) {
      html += `<p class="hint aa-hinweis">${W.icon("ampel", 14)} Ampel: Vorsicht – heute ist nichts Hartes mehr geplant.</p>`;   // nichts zu ändern: keine Frage
    } else if (A && A.status === "vorsichtig" && A.offen && ds === h) {
      // checkin-anpassung-1.0 (V9.8, wie Enduco): Vorschlag mit Grund – «Ignorieren» oder «Überprüfen» (dort «Akzeptieren»); Mein Plan bleibt, bis du akzeptierst
      html += `<div class="card aa-banner aa-vorschlag" role="status"><div class="aa-kopf">${W.icon("funken", 16)}<b>Heute lieber locker?</b></div>
        <p class="aa-text">${esc(textVon(A))}</p>
        <div class="row aa-knoepfe"><button type="button" class="btn" data-aa="ignorieren">Ignorieren</button><button type="button" class="btn primary" data-aa="pruefen">Überprüfen ${W.icon("funken", 14)}</button></div>
        <p class="warn-t" data-aafehler hidden></p></div>`;
    } else if (A && A.status === "vorsichtig" && A.trotzdem && ds === h && !A.offen) {
      html += `<p class="hint aa-hinweis">${W.icon("ampel", 14)} Ampel: Vorsicht – heute wie geplant (deine Wahl). <button type="button" class="btn klein" data-aa="pruefen">Doch anpassen</button></p>`;
    } else if (A && (A.status === "vorsichtig" || A.status === "krank")) {
      const knopf = ds === h ? `<div class="row aa-knoepfe"><button type="button" class="btn" data-aa="trotzdem" aria-pressed="${A.trotzdem}">${A.trotzdem ? "Doch anpassen" : A.status === "vorsichtig" ? "Rückgängig" : "Trotzdem wie geplant"}</button></div>` : "";
      const gr = A.gruende.length ? `<ul class="aa-gruende">${A.gruende.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : "";
      if (A.trotzdem) {
        html += `<div class="card aa-banner aa-trotzdem" role="status"><div class="aa-kopf">${W.icon("ampel", 16)}<b>${ds === h ? "Heute" : "Dieser Tag"} wie geplant – deine Wahl</b></div>
          <p class="aa-text">Ampel: ${esc(AMPEL_WORT[A.ampel] || "Vorsicht")}. ${A.status === "krank" ? "Mit Krankheitszeichen nicht trainieren, bei Fieber pausieren." : "Harte Abschnitte nur, wenn es sich gut anfühlt."}</p>${gr}
          ${(t.einheiten || []).some((e) => ds === h && uhr(ds, e) === "locker") ? `<p class="hint">Auf der Uhr steht die lockere Fassung vom Morgen-Update; die geplante Fassung steht hier.</p>` : ""}${knopf}</div>`;
      } else {
        const liste = A.geaendert.map((g) => `<li>${g.nach ? `«${esc(g.von.titel)}» ${esc(dauer(g.von.dauer))} → <b>«${esc(g.nach.titel)}» ${esc(dauer(g.nach.dauer))}</b>` : `«${esc(g.von.titel)}» entfällt`}${g.grund && g.grund.length ? `<small>${esc(g.grund.join("; "))}</small>` : ""}</li>`).join("");
        const holen = A.nachholen.map((x) => `<p class="aa-text">Nachholen möglich: «${esc(x.titel)}» am ${esc(wt(x.nach))}${x.dauer ? ` (${esc(dauer(x.dauer))})` : ""} – nur wenn du den Vorschlag des Coaches annimmst (ampel-plan-1.2).</p>`).join("");
        const weg = A.weg.map((x) => `<p class="warn-t">«${esc(x.titel)}» entfällt: ${esc(x.grund)}.</p>`).join("");
        const gesp = A.gesperrt.length ? `<p class="hint">Gesperrt, bleibt wie geplant: ${A.gesperrt.map((x) => `«${esc(x)}»`).join(", ")} – ${A.status === "krank" ? "mit Krankheitszeichen besser nicht trainieren" : "nach Gefühl locker"}.</p>` : "";
        const hart = ds === h ? (t.einheiten || []).filter((e) => e.ampel && e.ampel.von && uhr(ds, e) === "hart") : [];
        const uhrT = hart.length ? `<p class="warn-t">Auf der Uhr steht noch die harte Fassung – ${hart.some((e) => e.sport === "lauf") ? "locker laufen" : hart.some((e) => e.sport === "rad") ? "locker fahren" : "locker schwimmen"} (Ziele hier).</p>`
          : ds === h && (t.einheiten || []).some((e) => e.ampel && e.ampel.von && uhr(ds, e) === "locker") ? `<p class="hint">Auf der Uhr steht die lockere Fassung (Morgen-Update).</p>` : "";
        html += `<div class="card aa-banner aa-${A.status}" role="status"><div class="aa-kopf">${W.icon("ampel", 16)}<b>${esc(V74().titel(A))}</b><small>Ampel: ${esc(AMPEL_WORT[A.ampel] || "Vorsicht")}</small></div>
          ${gr}${liste ? `<ul class="aa-liste">${liste}</ul>` : ""}${A.status === "krank" ? `<p class="aa-text">Bei Fieber oder allgemeinen Symptomen pausieren und ärztlich abklären.</p>` : ""}
          ${holen}${weg}${gesp}${uhrT}${knopf}</div>`;
      }
    } else if (ds === h) {
      const e = live();
      if (e.hinweis && e.status === "wie_geplant" && !e.morgenwerte && (t.einheiten || []).some((x) => V74().istHart(x))) html += `<p class="hint aa-hinweis">${W.icon("ampel", 14)} ${esc(e.hinweis)}</p>`;
    }
    for (const e of nach) html += `<div class="card aa-banner aa-nach" role="status"><div class="aa-kopf">${W.icon("ampel", 16)}<b>Nachgeholt vom ${esc(wt(e.ampel.nachgeholt.von))}</b></div>
      <p class="aa-text">«${esc(e.titel)}» ${esc(dauer(e.dauer))} statt «${esc(e.ampel.ersetzt.titel)}» ${esc(dauer(e.ampel.ersetzt.dauer))}${ds >= h ? " – ob sie stattfindet, entscheidet die Ampel an diesem Morgen" : ""}.</p></div>`;
    return html;
  };
  /** Kurzzeile für den Kalender (Woche): «Ampel: angepasst», «Ruhetag (Ampel)», «nachgeholt». */
  M.kurz = function (t) {
    if (!t) return "";
    const A = t.ampel, n = (t.einheiten || []).some((e) => e.ampel && e.ampel.nachgeholt && !e.ampel.von);
    const x = A && !A.trotzdem && (A.status === "vorsichtig" || A.status === "krank") ? (A.status === "krank" ? "Ampel: Krankheitszeichen" : A.geaendert.length ? "Ampel: angepasst" : "Ampel: Vorsicht") : A && A.trotzdem ? "Ampel: trotzdem wie geplant" : "";
    const parts = [x, n ? "nachgeholt" : ""].filter(Boolean);
    return parts.length ? `<p class="kw-ampel">${V6().icon("ampel", 12)} ${esc(parts.join(" · "))}</p>` : "";
  };
  /** Banner auf der Einheit-Seite: gelockert (mit ursprünglicher Einheit) oder nachgeholt. */
  M.einheitBanner = function (ds, e, t) {
    if (!bereit() || !e || !e.ampel) return "";
    const W = V6(), h = heute(), A = t && t.ampel;
    if (e.ampel.nachgeholt && !e.ampel.von) return `<div class="aa-banner aa-nach v73-aa" role="status"><div class="aa-kopf">${W.icon("ampel", 16)}<b>Nachgeholt vom ${esc(wt(e.ampel.nachgeholt.von))}</b></div>
      <p class="aa-text">Statt «${esc(e.ampel.ersetzt.titel)}» ${esc(dauer(e.ampel.ersetzt.dauer))}. Ob sie stattfindet, entscheidet die Ampel an diesem Morgen; ändern im Tagesblatt des ${esc(wt(e.ampel.nachgeholt.von))}s («Trotzdem wie geplant»).</p></div>`;
    const v = e.ampel.von, hart = ds === h && uhr(ds, e) === "hart";
    return `<div class="aa-banner aa-vorsichtig v73-aa" role="status"><div class="aa-kopf">${W.icon("ampel", 16)}<b>Angepasst wegen Ampel</b><small>${esc(AMPEL_WORT[A && A.ampel] || "Vorsicht")}</small></div>
      <p class="aa-text">Geplant war «${esc(v.titel)}» ${esc(dauer(v.dauer))}${e.ampel.grund && e.ampel.grund.length ? ` – ${esc(e.ampel.grund.join("; "))}` : ""}.</p>
      ${A && A.gruende && A.gruende.length ? `<ul class="aa-gruende">${A.gruende.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
      ${hart ? `<p class="warn-t">Auf der Uhr steht noch die harte Fassung – locker ${e.sport === "lauf" ? "laufen" : e.sport === "rad" ? "fahren" : "schwimmen"}, mit den Zielen hier.</p>` : ""}
      ${ds === h ? `<div class="row aa-knoepfe"><button type="button" class="btn" data-aa="trotzdem" aria-pressed="false">Trotzdem wie geplant</button></div>` : ""}</div>`;
  };

  /* ---------- «Woche anpassen?» ab dem dritten Tag «vorsichtig» in Folge ---------- */
  /** Karte mit dem Vorschlag (nur heute, nicht in Erholungs-, Taper- oder Rennwochen, nicht nach «Nicht jetzt» in dieser Woche). */
  M.erholungKarte = function (ds, K) {
    if (!bereit() || ds !== heute() || !K || !K.w) return "";
    const mo = V64().montag(ds), n = V74().serie(M.stand, ds);
    if (n < V74().SERIE || K.w.erholung || K.w.taper || K.w.erholung_ab || K.w.tage.some((t) => t.rennen) || lsGet("sf.aa.nein") === mo) return "";
    const W = V6();
    return `<div class="card aa-banner aa-erh" role="status"><div class="aa-kopf">${W.icon("ampel", 16)}<b>Seit ${n} Tagen Vorsicht</b></div>
      <p class="aa-text">Rest der Woche wie eine Erholungswoche rechnen? Weniger Stunden, nur eine kurze Schlüsseleinheit, Laufen und Schwimmen locker; gesperrte Tage bleiben. Es ändert sich erst, wenn du tippst.</p>
      <div class="row aa-knoepfe"><button type="button" class="btn primary" data-aa="erholung">Woche anpassen</button><button type="button" class="btn" data-aa="nein">Nicht jetzt</button></div>
      <p class="warn-t" data-aafehler hidden></p></div>`;
  };
  /** Knöpfe im Banner und in der Karte binden. nachher() zeichnet die Ansicht neu (optional). */
  M.binden = function (box, nachher) {
    if (!box) return;
    const fehler = (f) => { const p = box.querySelector("[data-aafehler]"); if (p) { p.textContent = f || ""; p.hidden = !f; } };
    box.querySelectorAll('[data-aa="trotzdem"]').forEach((b) => (b.onclick = async () => {
      b.disabled = true; const f = await M.trotzdem(b.getAttribute("aria-pressed") !== "true"); b.disabled = false; if (f) fehler(f); if (nachher) nachher();
    }));
    box.querySelectorAll('[data-aa="ignorieren"]').forEach((b) => (b.onclick = async () => {
      b.disabled = true; const f = await M.trotzdem(true); b.disabled = false; if (f) fehler(f); if (nachher) nachher();
    }));
    box.querySelectorAll('[data-aa="pruefen"]').forEach((b) => (b.onclick = () => M.ueberpruefen(heute())));
    box.querySelectorAll('[data-aa="nein"]').forEach((b) => (b.onclick = () => { lsSet("sf.aa.nein", V64().montag(heute())); neuZeichnen(); if (nachher) nachher(); }));
    box.querySelectorAll('[data-aa="erholung"]').forEach((b) => (b.onclick = async () => {
      if (!U66() || !U66().aendern) return;
      b.disabled = true; const f = await U66().aendern(V64().montag(heute()), { art: "erholung" }); b.disabled = false;
      if (f) fehler(f); else if (nachher) nachher();
    }));
  };
})();
