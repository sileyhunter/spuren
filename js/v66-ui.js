/* Ironman Notebook V6.6 – Etappe 6, Oberfläche «Mein Plan» (Auftrag docs/auftrag-etappen-6-8.md; eigenplan-1.0, vorlagen-1.0, tl-plan-1.0,
   wochenblatt-1.0, kalender-2.0): Abschnitt «Mein Plan» im Tagesblatt mit «Training hinzufügen» und «Tag sperren», Einheit ändern, verschieben
   oder entfernen, Wochenaktionen, Kalender-Wochenansicht und Wochenblatt im Plan. Gespeichert wird verschlüsselt über «Direkt speichern»
   (Eingabe planwoche → plan_woche). Aufbau und Bedienung nach dem Vorbild enduco, Texte eigen.
   garmin-senden-1.0 (6.7, Entscheid E3): «An Garmin senden» je Tag oder Woche (bis eine Woche voraus) und «am Vortag um 23 Uhr automatisch» legen
   einen Auftrag mit Momentaufnahme an (Eingabe garmin_senden → garmin_auftraege); gesendet wird im Nacht-Update (tools/garmin_senden.py).
   Die Seite selbst schreibt nie nach Garmin; Enduco wird nie geändert.
   V7.2 (verfuegbarkeit-1.0, eigenplan-1.1, Vorbild enduco): im Tagesblatt Form zu Tagesbeginn (bis heute gemessen, danach ≈ mit der geplanten
   Last), Verfügbarkeit (Zeit und Sportarten je Tag oder je Wochentag, Eingabe verfuegbarkeit → plan_verfuegbarkeit), danach «Anpassen» oder
   «Neu berechnen»; dieselben Aktionen unter «Woche bearbeiten». */
(function () {
  "use strict";
  const M = (window.V66UI = window.V66UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V64 = () => window.V64, V66 = () => window.V66, V59 = () => window.V59;
  const P = () => window.V64UI, H = () => window.V6H, TR = () => window.TR, V65 = () => window.V65, AN = () => window.AN;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const heute = () => C.iso(C.today);
  const montag = (iso) => V64().montag(iso);
  const add = (iso, n) => V64().addDays(iso, n);
  const tagText = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
  const wt = (iso) => ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][new Date(iso + "T12:00:00").getDay()];
  const dkurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  const hm = (min) => { const m = Math.round(min); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
  const komma = (x) => String(x).replace(".", ",");
  const spFarbe = (sp) => `var(--sp-${["rad", "lauf", "schwimm", "wandern", "ski"].includes(sp) ? sp : "andere"})`;
  const bereit = () => { C = UI() && UI().C; return !!(C && V64() && V66() && V6() && P() && P().kontextFuer); };
  const kontext = (mo) => { try { return P().kontextFuer(mo); } catch (e) { console.error(e); return null; } };
  function tagVon(ds) { const K = kontext(montag(ds)); const t = K ? K.w.tage.find((x) => x.date === ds) : null; return t ? { K, t } : null; }
  const bezug = (K) => V66().bezug(TR() ? TR().zonen(C.D.zonen).skalen : null, K && K.css ? K.css.s : null);
  // V8.1 tl-plan-1.1: TL ≈ geplant mit den Bezugsgrössen der absolvierten Last (config.last_ref, config.lthr) – für jeden Aufruf von V66.bezug auf der Seite
  if (window.V66 && !window.V66.lastBezug) window.V66.lastBezug = () => {
    const c = UI() && UI().C, k = c && c.D && c.D.config; if (!k) return null;
    let bd = null; try { bd = window.V75UI && window.V75UI.basisDaten ? window.V75UI.basisDaten(V64().montag(c.iso(c.today))) : null; } catch (e) { bd = null; }
    return { ref: k.last_ref || null, lthr: k.lthr || null, tlh: { schwimm: bd && bd.schwimm && isNum(bd.schwimm.tl_h) ? bd.schwimm.tl_h : null } };
  };
  const istAenderbar = (ds, t) => ds >= heute() && !(t && t.gesperrt);
  const neuZeichnen = () => { try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); } };
  /** aufbau-1.1: Hinweis zu einem Lauf an einem Tag (V66.aufbauHinweis) – gemeldet, nicht verhindert. */
  const aufbauText = (e, ds, km) => { try { return ds >= heute() ? V66().aufbauHinweis(e, ds, km, V64().laeufe(C.D.activities), heute()) : null; } catch (err) { console.error(err); return null; } };
  const aufbauZeigen = (p, text) => { if (p) { p.textContent = text ? "Aufbau: " + text : ""; p.hidden = !text; } };

  /* ---------- An Garmin senden (garmin-senden-1.0; 1.1: Schwimmen, Puls, RPE) ---------- */
  const skalen = () => (TR() && C ? TR().zonen(C.D.zonen).skalen : null);
  const gesendet = () => (C && Array.isArray(C.D.plan_garmin) ? C.D.plan_garmin : []);
  /** garmin-senden-1.1: Schwimm-Einheit aus Mein Plan wie auf der Einheit-Seite (schwimmeinheit-1.0: Bahnlänge des Geräts, CSS aus dem Test,
   *  Tempo aus Becken-Einheiten, Übungen der Woche). Gleiche Werte → gleiche Fassung beim Senden und beim Stand. */
  function schwimmEinheit(e, ds, K) {
    if (!e || e.sport !== "schwimm" || !window.SW || !window.SWUI || !(C || bereit())) return null;
    const k = K || kontext(montag(ds));
    try {
      // V7.5: Bahnlänge der Einheit (einheit-felder-1.1), sonst der Standard; Hilfsmittel und Stile aus den Planeinstellungen (schwimmeinheit-1.2)
      return window.SW.einheit(window.SW.artVon(e.id), Object.assign({ css_m: window.SW.cssStrecke ? window.SW.cssStrecke(e.id) : null, min: e.dauer, css_s: k && k.css ? k.css.s : null, pool: e.pool || window.SWUI.becken(), ref_s: window.SW.refTempo(C.D.activities),
        woche: window.SWUI.woche(ds) }, window.V75UI ? window.V75UI.schwimmOpt() : {}));
    } catch (err) { console.error(err); return null; }
  }
  const swOpt = (ds, K) => ({ schwimm: (e) => schwimmEinheit(e, ds, K) });
  /** V7.4 ampel-plan-1.0: lockere Fassung je Einheit (V74.locker) – der Auftrag trägt sie mit, damit das Morgen-Update bei «vorsichtig» ersetzen kann. */
  const ampelOpt = (ds, K) => ({ ampel: (e) => (window.V74 ? window.V74.locker(e, (K || kontext(montag(ds)) || {}).ctxE || {}) : null) });
  M.schwimmEinheit = (e, ds, K) => (bereit() ? schwimmEinheit(e, ds, K) : null);
  M.swOpt = (ds, K) => swOpt(ds, K);
  /** Auftrag eines Tages: noch nicht eingespielt (auf dem Gerät) vor dem Stand in den Daten. → { a, lokal } oder null */
  function auftrag(ds) {
    const id = "gs-" + ds, lok = ((UI() && UI().Inbox && UI().Inbox.data && UI().Inbox.data.garmin_senden) || []).find((x) => x && x.id === id);
    if (lok) return { a: lok, lokal: true };
    const d = (C.D.garmin_auftraege || []).find((x) => x && x.id === id);
    return d ? { a: d, lokal: false } : null;
  }
  const garminFenster = (ds) => ds > heute() && ds <= add(heute(), 7);          // von Hand und automatisch: morgen bis eine Woche voraus
  /** Lief das Nacht-Update heute schon? Dann geht ein neuer Auftrag für morgen erst in der nächsten Nacht – zu spät (nur noch im Chat). */
  const nachtGelaufen = () => { const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(String(C.D.updated || "")); return !!m && C.D.updated_lauf === "Nacht-Update" && `${m[3]}-${m[2]}-${m[1]}` === heute(); };
  const istAktiv = (A) => A && (A.lokal || A.a.status === "offen") && A.a.modus !== "aus";
  /** Auftrag für einen Tag neu anlegen (Momentaufnahme der Einheiten von Mein Plan). uids (V7.3, «Export» einer Einheit): nur diese Einheiten
   *  (Auftrag mit «teil»); ohne uids alle Einheiten des Tages. */
  async function garminAuftragSpeichern(ds, modus, uids) {
    if (P().entwurf && P().entwurf.aktiv()) return IM_ENTWURF;              // V7.9: nie einen Entwurf an Garmin
    const x = tagVon(ds); if (!x) return "Tag nicht berechenbar";
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.garmin_senden)) I.data.garmin_senden = [];
    const U = x.t.rennen ? [] : uids ? x.t.einheiten.filter((e) => uids.has(e.uid)) : x.t.einheiten;
    await I.upsert("garmin_senden", V66().garminAuftrag(ds, U, skalen(), modus, new Date().toISOString(), Object.assign(swOpt(ds, x.K), ampelOpt(ds, x.K), uids ? { teil: true } : {})));
    neuZeichnen();
    return null;
  }
  /** Auswahl eines Auftrags mit «teil»: seine Einheiten (auch die nicht sendbaren). */
  const auswahl = (a) => new Set([...(a.einheiten || []), ...(a.ohne || [])].map((u) => u && u.uid).filter(Boolean));
  /** Nach einer Änderung: offene Aufträge der betroffenen Tage mit der neuen Fassung erneuern (gleicher Modus, gleiche Auswahl). Eine verschobene
   *  Einheit bleibt ausgewählt, wenn sie es am alten Tag war (V7.3). */
  async function auftraegeNachfuehren(tage, a) {
    // Verschoben: war die Einheit am alten Tag zum Senden gewählt, kommt sie am neuen Tag mit (dort ohne offenen Auftrag: neuer Auftrag mit Auswahl)
    const B = a && a.art === "verschieben" ? auftrag(a.date) : null, mit = !!(B && istAktiv(B) && (!B.a.teil || auswahl(B.a).has(a.uid)));
    for (const d of tage) {
      const A = auftrag(d);
      if (!(istAktiv(A) && garminFenster(d))) {
        if (mit && d === a.nach && garminFenster(d)) await garminAuftragSpeichern(d, B.a.modus, new Set([a.uid, ...gesendet().filter((g) => g && g.date === d && !g.entfernt).map((g) => g.uid)]));
        continue;
      }
      let uids = A.a.teil ? auswahl(A.a) : null;
      if (uids && mit && a.nach === d) uids.add(a.uid);
      await garminAuftragSpeichern(d, A.a.modus, uids);
    }
  }
  M.auftrag = (ds) => (bereit() ? auftrag(ds) : null);
  /** V7.4 ampel-plan-1.0: offene Aufträge einer Woche erneuern, wenn sich die Einheiten durch die Ampel geändert haben (nachgeholte Einheit an einem
   *  kommenden Tag, «Trotzdem wie geplant»). Gleicher Modus, gleiche Auswahl; unveränderte Aufträge bleiben, wie sie sind. */
  M.auftraegeAbgleichen = async function (mo) {
    if (!bereit()) return;
    const fp = (L) => (L || []).map((u) => `${u.uid}:${u.fassung}:${(u.ampel && u.ampel.fassung) || ""}`).sort().join("|");
    for (let i = 0; i < 7; i++) {
      const d = add(mo, i), A = auftrag(d);
      if (!(istAktiv(A) && garminFenster(d))) continue;
      const x = tagVon(d); if (!x) continue;
      const uids = A.a.teil ? auswahl(A.a) : null, U = x.t.rennen ? [] : uids ? x.t.einheiten.filter((e) => uids.has(e.uid)) : x.t.einheiten;
      const neu = V66().garminAuftrag(d, U, skalen(), A.a.modus, "", Object.assign(swOpt(d, x.K), ampelOpt(d, x.K)));
      if (fp(neu.einheiten) !== fp(A.a.einheiten)) await garminAuftragSpeichern(d, A.a.modus, uids);
    }
  };
  /** V7.3 «Export» einer Einheit: Auftrag des Tages mit dieser Einheit (weg = austragen) und allen, die schon in Garmin oder im offenen Auftrag sind. */
  M.einheitSenden = async function (ds, uid, modus, weg) {
    if (!bereit()) return "Seite noch nicht bereit";
    if (P().entwurf && P().entwurf.aktiv()) return IM_ENTWURF;
    const A = auftrag(ds), uids = new Set(gesendet().filter((g) => g && g.date === ds && !g.entfernt).map((g) => g.uid));
    if (!weg && istAktiv(A) && !A.a.teil) return garminAuftragSpeichern(ds, modus);       // ganzer Tag schon im Auftrag: bleibt ganz (neuer Modus)
    if (istAktiv(A)) for (const u of A.a.teil ? auswahl(A.a) : (tagVon(ds) || { t: { einheiten: [] } }).t.einheiten.map((e) => e.uid)) uids.add(u);
    if (weg) uids.delete(uid); else uids.add(uid);
    return garminAuftragSpeichern(ds, modus, uids);
  };
  M.garminFenster = (ds) => bereit() && garminFenster(ds);
  M.nachtGelaufen = () => bereit() && nachtGelaufen();
  M.gesendet = () => (bereit() ? gesendet() : []);

  /** Kontext für V66.aendern aus der Woche, wie sie gilt (Vorschlag, Verfügbarkeit, Verteilung, Erholungswoche, Aktivitäten draussen). */
  function aendernCtx(K, mo, a) {
    const vorschlag = (d) => ((K.w0 || K.w).tage.find((t) => t.date === d) || { einheiten: [] }).einheiten;
    const roh = (d) => ((K.w0roh || K.w0 || K.w).tage.find((t) => t.date === d) || { einheiten: [] }).einheiten;
    return { heute: heute(), montag: mo, vorschlag, roh, verf: K.verf || null, verteilt: !!K.verteilt, ctxE: K.ctxE, lang: K.lang || null,
      o: { phase: K.w.phase, css_s: K.css ? K.css.s : null, kurz: !!(K.w.taper || K.w.erholung) }, jetzt: new Date().toISOString(),
      erholung: K.erh || null, grund: a && a.art === "erholung" ? "Ampel: mehrere Tage «vorsichtig» (ampel-plan-1.0)" : null,
      ersetzen: window.V77 ? (E, x) => window.V77.ersetzenGespeichert(E, x.akt, heute(), K.ctxE, x.schon) : null };   // V7.7 aktivitaet-plan-1.0
  }
  /** Eine Änderung anwenden (V66.aendern) und über «Direkt speichern» sichern; → Fehlertext oder null. */
  async function aendern(mo, a) {
    if (!bereit()) return "Seite noch nicht bereit";
    const K = kontext(mo); if (!K) return "Plan dieser Woche nicht berechenbar";
    const r = V66().aendern(P().planEintrag(mo), a, aendernCtx(K, mo, a));
    if (r.fehler) return r.fehler;
    const EN = P().entwurf;
    if (EN && EN.aktiv()) { EN.neu(mo, r.eintrag, a); neuZeichnen(); return null; }   // V7.9 bearbeiten-1.0: im Bearbeiten-Modus erst mit ✓ gespeichert
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.planwoche)) I.data.planwoche = [];
    await I.upsert("planwoche", r.eintrag);
    const tage = a.date ? [a.date].concat(a.nach ? [a.nach] : []) : Array.from({ length: 7 }, (_, i) => add(mo, i));
    try { await auftraegeNachfuehren(tage.filter((d) => d >= heute()), a); } catch (e) { console.error(e); }
    neuZeichnen();
    return null;
  }
  M.aendern = aendern;
  /** V8.3 tagescoach-1.0: mehrere Änderungen einer Woche nacheinander (V66.aendern) und einmal speichern – für angenommene Vorschläge des Coaches
   *  und ihr Zurückholen. Schlägt eine fehl, wird nichts gespeichert. Nicht im Bearbeiten-Modus. → Fehlertext oder null */
  M.aendernFolge = async function (mo, aktionen, opt) {
    if (!bereit()) return "Seite noch nicht bereit";
    if (P().entwurf && P().entwurf.aktiv()) return IM_ENTWURF;
    const K = kontext(mo); if (!K) return "Plan dieser Woche nicht berechenbar";
    let E = P().planEintrag(mo);
    for (const a of aktionen || []) {
      const r = V66().aendern(E, a, aendernCtx(K, mo, a));
      if (r.fehler) return r.fehler;
      E = r.eintrag;
    }
    if (opt && opt.trocken) return null;                                  // V8.4 tagescoach-1.1: nur prüfen (mehrere Wochen erst speichern, wenn alle gehen)
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.planwoche)) I.data.planwoche = [];
    await I.upsert("planwoche", E);
    for (const a of aktionen || []) {
      const tage = [a.date].concat(a.nach ? [a.nach] : []).filter((d) => d >= heute());
      try { await auftraegeNachfuehren(tage, a); } catch (e) { console.error(e); }
    }
    neuZeichnen();
    return null;
  };
  /** V7.9 bearbeiten-1.0: Entwurf speichern (✓) – jede geänderte Woche über «Direkt speichern», danach die offenen Garmin-Aufträge der betroffenen Tage
   *  wie nach jeder einzelnen Änderung (verschobene Einheiten behalten ihre Auswahl). → Fehlertext oder null */
  M.entwurfSpeichern = async function () {
    if (!bereit()) return "Seite noch nicht bereit";
    const EN = P().entwurf; if (!EN || !EN.aktiv()) return null;
    const L = EN.aenderungen(), S = EN.schritte(), I = UI().Inbox;
    if (L.length && (!I || !I.data)) return "Speicher auf diesem Gerät nicht verfügbar";
    if (L.length && !Array.isArray(I.data.planwoche)) I.data.planwoche = [];
    for (const x of L) if (x.E) await I.upsert("planwoche", x.E);
    EN.beenden();
    const h = heute(), tage = new Set(), geaendert = new Set(L.map((x) => x.mo));
    for (const x of S) {
      if (!geaendert.has(x.mo)) continue;
      const a = x.a || {};
      if (a.art === "verschieben") { try { await auftraegeNachfuehren([a.date, a.nach].filter((d) => d && d >= h), a); } catch (e) { console.error(e); } continue; }
      (a.date ? [a.date] : Array.from({ length: 7 }, (_, i) => add(x.mo, i))).forEach((d) => tage.add(d));
    }
    try { await auftraegeNachfuehren([...tage].filter((d) => d >= h).sort(), { art: "entwurf" }); } catch (e) { console.error(e); }
    neuZeichnen();
    return null;
  };
  const IM_ENTWURF = "Im Bearbeiten-Modus nicht möglich – zuerst mit ✓ speichern oder mit ✕ verwerfen.";
  M.imEntwurf = () => !!(bereit() && P().entwurf && P().entwurf.aktiv());
  /** Im Bearbeiten-Modus: Hinweis als Blatt und true (für Werkzeuge, die direkt speichern: Draussen planen, Planeinstellungen, Verfügbarkeit der Woche). */
  M.entwurfSperre = function () {
    if (!M.imEntwurf()) return false;
    V59().blatt("k4-ent", `<div class="blatt-titel"><h2 id="v59-ov-h" tabindex="-1">Bearbeiten läuft</h2><p class="sub">${esc(IM_ENTWURF)}</p></div>
      <div class="blatt-fuss"><span></span><button type="button" class="btn primary" data-x>OK</button></div>`);
    return true;
  };

  /* ---------- Karten ---------- */
  const STAND_WORT = { gesendet: "in Garmin", geaendert: "in Garmin, geändert", wartet: "wird gesendet" };
  function karte(e, K, ds) {
    const W = V6(), S = V66().schaetzung(e, bezug(K)), hk = e.teile && e.teile.length && P().hauptKey ? P().hauptKey(e) : null;
    let st = null; try { const A = ds ? auftrag(ds) : null; st = ds ? V66().garminStand(e, ds, skalen(), gesendet(), A && (A.lokal ? Object.assign({ status: "offen" }, A.a) : A.a), swOpt(ds, K)) : null; } catch (err) { console.error(err); }
    const teile = [W.dauerText(e.dauer * 60), isNum(S.tl) ? `TL ≈ ${S.vollstaendig ? "" : "mind. "}${S.tl}` : "", isNum(S.km) && S.km > 0 ? `≈ ${komma(S.km)} km` : "", st ? STAND_WORT[st] : ""].filter(Boolean);
    const cm = ds && window.V83UI && window.V83UI.marke ? window.V83UI.marke(ds, e.uid) : null;   // V8.3: vom Coach geändert
    const q = (e.kraft_plan ? (e.kraft_auto ? "Tag automatisch" : "fester Termin") : e.art === "draussen" ? "draussen" : cm ? "Coach" : e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag") + (e.ampel ? (e.ampel.von ? " · Ampel" : " · nachgeholt") : "");   // V7.6
    if (e.uhrzeit) teile.unshift(e.uhrzeit);                               // V7.3: Uhrzeit aus «Festlegen»
    return `<button type="button" class="mo-e mp-e${e.quelle === "eigen" ? " eigen" : ""}" data-mpe="${esc(e.uid)}">
      <span class="mo-sp" style="--sp:${spFarbe(e.sport)}">${W.sportIcon(e.sport, 16)}</span>
      <span class="mo-et"><b>${e.gesperrt ? `<span class="mp-schloss" title="Einheit gesperrt">${W.icon("schloss", 13)}</span>` : ""}${esc(e.titel)}</b><small>${esc(teile.join(" · "))} · ${q}</small></span>${hk ? P().chip(hk) : ""}</button>`;
  }
  /** V7.10 tagesblatt-2.0: Einheit wie im Kalender (Symbol, Titel, «Dauer · ≈ km · TL ≈», Quelle, Mini-Profil); antippen öffnet die Einheit-Seite. */
  function zeileEinheit(e, K, ds) {
    const W = V6(), S = V66().schaetzung(e, bezug(K));
    let st = null; try { const A = ds ? auftrag(ds) : null; st = ds ? V66().garminStand(e, ds, skalen(), gesendet(), A && (A.lokal ? Object.assign({ status: "offen" }, A.a) : A.a), swOpt(ds, K)) : null; } catch (err) { console.error(err); }
    const cm = ds && window.V83UI && window.V83UI.marke ? window.V83UI.marke(ds, e.uid) : null;   // V8.3: vom Coach geändert
    const q = e.kraft_plan ? (e.kraft_auto ? "Tag automatisch" : "fester Termin") : e.art === "draussen" ? "draussen" : e.art === "eigen" ? `eigen · RPE ${e.rpe}` : cm ? `Coach · ${cm}` : e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag";
    let prof = ""; try { prof = e.teile && e.teile.length && e.teile[0][0] !== "ohne" && P().profil ? W.profilSVG(P().profil(e), { h: 30 }) : ""; } catch (err) { prof = ""; }
    const z = [e.uhrzeit, window.V78 ? window.V78.zeile(e.dauer, S) : W.dauerText(e.dauer * 60), st ? STAND_WORT[st] : null].filter(Boolean).join(" · ");
    return `<button type="button" class="k4-e tb-e${e.quelle === "eigen" ? " eigen" : ""}" data-mpe="${esc(e.uid)}">
      <span class="mo-sp" style="--sp:${spFarbe(e.sport)}">${W.sportIcon(e.sport, 16)}</span>
      <span class="k4-et"><b>${e.gesperrt ? `<span class="mp-schloss" title="Einheit gesperrt">${W.icon("schloss", 12)}</span>` : ""}${esc(e.titel)}</b><small>${esc(z)} · <span class="k4-q">${esc(q)}</span></small></span>
      <span class="k4-prof">${prof}</span></button>`;
  }
  /** V7.10 tagesblatt-2.0 (Vorlage): Verfügbarkeit des Tages direkt im Blatt – Sportarten als Symbol (antippen: je Sportart ein Chip) und Regler 0–8 h in
   *  15-min-Schritten, ganz rechts «offen». Sofort gespeichert als Eintrag des Tages (gleich wie der Wochentag = Tageseintrag weg); die Woche passt sich
   *  an wie bisher (verfuegbarkeit-1.0). */
  let TB_RE = null;
  function vfInline(ds, K) {
    const verf = K.verf || (P().verfuegbarkeit ? P().verfuegbarkeit() : null), v = verf ? verf(ds) : null, W = V6(), SP = V66().VF_SPORT;
    if (P().entwurf && P().entwurf.aktiv()) {                          // V7.9 bearbeiten-1.0: Verfügbarkeit erst nach dem Speichern ändern
      return `<div class="tb-vf"><div class="tb-vf-k"><span class="abschnitt">${W.icon("kalender", 14)}Verfügbarkeit</span><b>${esc(v ? V66().vfText(v) : "nicht festgelegt")}</b></div>
        <p class="hint">Ändern geht nach dem Speichern (✓) bzw. ohne Bearbeiten-Modus.</p></div>`;
    }
    const kein = !!v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length));
    const sp = v && Array.isArray(v.sport) && v.sport.length ? SP.filter((x) => v.sport.includes(x)) : SP.slice();
    const offenI = Math.max(32, v && isNum(v.min) ? Math.ceil(v.min / 15) : 0) + 1, idx = !v || v.min == null ? offenI : kein ? 0 : Math.round(v.min / 15);
    const quelle = !v ? "nicht festgelegt – der Vorschlag plant frei" : v.quelle === "tag" ? "nur an diesem Tag" : `wie jeden ${WT_LANG[V66().wtNr(ds) - 1]}`;
    const text = idx >= offenI ? "offen" : idx === 0 ? "Kein Training" : W.dauerText(idx * 15 * 60);
    let re = "";
    if (TB_RE === ds) {
      TB_RE = null;
      const E = P().planEintrag(montag(ds));
      re = E && E.ganz ? `<div class="tb-vf-re" role="status"><span>Gespeichert. Diese Woche ist festgehalten und bleibt, wie sie ist – «Woche anpassen» verteilt sie ab heute neu.</span><button type="button" class="btn klein" data-tbvfanp>${W.icon("funken", 14)} Woche anpassen</button></div>`
        : `<div class="tb-vf-re" role="status"><span>Gespeichert – die Woche verteilt sich danach.</span></div>`;
    }
    return `<div class="tb-vf" data-tbvf data-offen="${offenI}">
      <div class="tb-vf-k"><span class="abschnitt">${W.icon("kalender", 14)}Verfügbarkeit</span><small>${esc(quelle)}</small></div>
      <div class="tb-vf-z"><button type="button" class="tb-vf-sp" data-tbvfsp aria-expanded="false" aria-label="Sportarten: ${esc(sp.map((x) => VW_SPW[x]).join(", "))} – ändern">${sp.map((x) => `<i style="--sp:${spFarbe(x)}">${W.sportIcon(x, 15)}</i>`).join("")}</button>
        <input type="range" min="0" max="${offenI}" step="1" value="${idx}" data-tbvfmin aria-label="Trainingszeit an diesem Tag, ganz rechts offen" aria-valuetext="${esc(text)}">
        <output data-tbvfout>${esc(text)}</output></div>
      <div class="tb-vf-chips" data-tbvfchips hidden>${SP.map((x) => `<button type="button" class="chip" data-tbvfc="${x}" aria-pressed="${sp.includes(x)}"><span class="mo-sp" style="--sp:${spFarbe(x)}">${W.sportIcon(x, 14)}</span>${esc(VW_SPW[x])}</button>`).join("")}</div>
      ${re}<button type="button" class="mp-vf-woche" data-mpvfw>${W.icon("kalender", 14)}Trainingsverfügbarkeit der ganzen Woche ${W.icon("weiter", 14)}</button></div>`;
  }
  /** Abschnitt «Mein Plan» im Tagesblatt (Einheiten, Sperre, Aktionen). */
  M.tagSektion = function (ds) {
    if (!bereit()) return "";
    if (window.V7UI && !window.V7UI.planGilt(montag(ds))) return "";      // V7: frühere Wochen ohne gespeicherten Plan zeigen keinen nachgerechneten Vorschlag
    const x = tagVon(ds); if (!x) return "";
    const { K, t } = x, W = V6();
    // V9.1 zusammen-1.0: eine passende absolvierte Aktivität (steht unten unter «Absolviert») ersetzt die geplante Einheit; nicht zugeordnete bleiben sichtbar
    const Z = window.V91 && !(P().entwurf && P().entwurf.aktiv()) ? window.V91.zuordnen(t.einheiten, (C.D.activities || []).filter((a) => a && a.date === ds), { sportVon: W.sportVon }) : null;
    const offen = Z ? Z.offen : t.einheiten, erledigt = Z ? Z.zu.size : 0;
    const karten = t.rennen ? `<p class="mp-leer">${W.icon("flagge", 16)} ${esc(t.rennen.name)}</p>`
      : offen.length ? offen.map((e) => zeileEinheit(e, K, ds)).join("")
      : erledigt ? `<p class="mp-leer">${W.icon("check", 15)} ${erledigt === 1 ? "Die geplante Einheit ist erledigt" : "Alle geplanten Einheiten sind erledigt"} (unten bei «Absolviert»).</p>`
      : `<p class="mp-leer">${esc(t.notiz || "frei")}</p>`;
    const status = t.gesperrt ? `<span class="mp-tag">${W.icon("schloss", 13)}gesperrt</span>` : t.bearbeitet ? `<span class="mp-tag">bearbeitet</span>` : "";
    const mo = montag(ds), art = M.wochenart(mo);
    const woche = `<p class="sub mp-wo">KW ${W.isoWoche(mo)}${K.w.phase ? " · " + esc(K.w.phase) : ""}${art ? " · " + esc(art.text) : ""}</p>`;
    const aufbau = t.einheiten.filter((e) => e.sport === "lauf").map((e) => aufbauText(e, ds, V66().schaetzung(e, bezug(K)).km)).filter(Boolean)
      .map((a) => `<p class="warn-t">Aufbau: ${esc(a)}</p>`).join("");
    // V7.10 tagesblatt-2.0 (Vorlage): Zeilen «Training hinzufügen ›» und «Eigene Aktivität planen ›»; «Tag sperren» klein und weiter unten
    const vorbei = ds < heute();
    const zeilen = vorbei || t.gesperrt || t.rennen ? "" : `<div class="tb-zeilen">
        <button type="button" class="mp-zeile" data-mpadd><span>${W.icon("plus", 18)} Training hinzufügen</span>${W.icon("weiter", 16)}</button>
        <button type="button" class="mp-zeile" data-mpeigen><span>${W.icon("stift", 18)} Eigene Aktivität planen</span>${W.icon("weiter", 16)}</button></div>`;
    const akt = vorbei ? `<p class="hint">Vergangene Tage nur lesen.</p>`
      : `<div class="tb-sperre"><button type="button" class="btn klein" data-mplock aria-pressed="${t.gesperrt}">${W.icon("schloss", 14)} ${t.gesperrt ? "Entsperren" : "Tag sperren"}</button>
         <small>${t.gesperrt ? "Gesperrt: «Woche leeren», «Anpassen» und «Neu berechnen» lassen ihn stehen." : "Einheiten und Tage sperrst du auch im Kalender unter «Bearbeiten»."}</small></div>`;
    // V7.4 ampel-plan-1.0: Anpassung durch die Ampel (Gründe, ursprüngliche Einheit, «Trotzdem wie geplant») und «Woche anpassen?»
    let ampel = ""; try { ampel = window.V74UI ? window.V74UI.banner(ds, t) + window.V74UI.erholungKarte(ds, K) : ""; } catch (err) { console.error(err); }
    try { if (window.V83UI && window.V83UI.tag) ampel += window.V83UI.tag(ds); } catch (err) { console.error(err); }   // V8.3 Vorschläge des Coaches für diesen Tag
    return `${woche}${formHTML(ds)}${ampel}<h3 class="abschnitt mp-kopf">Mein Plan ${status}</h3><div class="mp-liste tb-liste4">${karten}</div>${aufbau}${zeilen}
      ${vorbei ? "" : vfInline(ds, K)}${kraftHTML(ds, K)}<div class="tb-unten">${akt}${garminHTML(ds, t)}</div><p class="warn-t" data-mpfehler hidden></p>`;
  };

  /* ---------- V7.2: Form zu Tagesbeginn und Verfügbarkeit im Tagesblatt ---------- */
  /** Form zu Tagesbeginn (status-1.1): bis heute aus deinen Daten, für kommende Tage ≈ mit der geplanten Last von Mein Plan (TL ≈, Modell). */
  /** V7.9 fitness-prognose-1.0: geplante Last einer Einheit für Fitness, Ermüdung und Form ≈ – TL ≈ (tl-plan-1.0), sonst Dauer × deine Last pro Stunde
   *  der Sportart (basis-1.1: 8 abgeschlossene Wochen bis zum Montag dieser Woche). Nur Schwimmen, Rad, Laufen und Aktivitäten draussen (pmc-2.1: kein
   *  Krafttraining). → { tl (null = keine Schätzung), aus: "tl" | "stunde" | null } */
  function lastGeplant(e, BZ) {
    if (!e || (!["rad", "lauf", "schwimm"].includes(e.sport) && e.art !== "draussen")) return { tl: 0, aus: null };
    const S = V66().schaetzung(e, BZ); if (isNum(S.tl)) return { tl: S.tl, aus: "tl" };
    let D = null; try { D = window.V75UI && window.V75UI.basisDaten ? window.V75UI.basisDaten(montag(heute())) : null; } catch (err) { D = null; }
    const q = D && D[e.sport] && isNum(D[e.sport].tl_h) && D[e.sport].tl_h > 0 ? D[e.sport].tl_h : null;
    return q != null && isNum(e.dauer) && e.dauer > 0 ? { tl: Math.round((e.dauer / 60) * q), aus: "stunde" } : { tl: null, aus: null };
  }
  M.lastGeplant = (e, BZ) => (bereit() ? lastGeplant(e, BZ) : { tl: null, aus: null });
  function formTag(ds) {
    const PM = C.pmc ? C.pmc() : null, FK = window.FK; if (!PM || !PM.length || !FK) return null;
    const h = heute();
    if (ds <= h) { const A = FK.pmcMorgen(PM, ds); return A ? { fitness: A.fitness, ermuedung: A.ermuedung, form: A.form, prognose: false } : null; }
    if (ds > add(h, 21)) return null;                                   // weiter voraus: zu unsicher, nichts zeigen
    let st = null; for (let i = PM.length - 1; i >= 0; i--) if (PM[i] && PM[i].date < h) { st = PM[i]; break; }
    if (!st) return null;
    const KM = new Map(), K = (d) => { const mo = montag(d); if (!KM.has(mo)) KM.set(mo, kontext(mo)); return KM.get(mo); };
    const ohne = new Set(), stunde = new Set();                         // ohne Schätzung: nicht gezählt; V7.9: ohne TL ≈ mit der Last pro Stunde der Sportart
    const lastAm = (d) => {
      const ist = (C.D.activities || []).filter((a) => a && a.date === d && (!window.FK || window.FK.zaehlt(a)));   // pmc-2.1: Krafttraining zählt nicht
      if (ist.length) return ist.reduce((s2, a) => s2 + (isNum(a.tss) ? a.tss : 0), 0);
      const k = K(d), t = k && k.w.tage.find((x) => x.date === d); if (!t) return 0; if (t.rennen) return null;
      let sum = 0;
      for (const e of t.einheiten) { if (!["rad", "lauf", "schwimm"].includes(e.sport) && e.art !== "draussen") continue; const x = lastGeplant(e, bezug(k)); if (isNum(x.tl)) { sum += x.tl; if (x.aus === "stunde") stunde.add(e.titel); } else ohne.add(e.titel); }   // V7.7: Aktivitäten draussen zählen
      return sum;
    };
    const r = V66().formPrognose({ ctl: st.ctl, atl: st.atl }, h, ds, lastAm);
    return r ? { fitness: Math.round(r.ctl), ermuedung: Math.round(r.atl), form: r.form, prognose: true, offen: r.offen, ohne: [...ohne], stunde: [...stunde] } : null;
  }
  /** V7.9 bearbeiten-1.0: Fitness, Ermüdung und Form zu Tagesbeginn für alle Tage von «von» bis «bis» in einem Durchgang (gleiche Regeln wie formTag;
   *  kommende Tage höchstens drei Wochen voraus). → Map Datum → { fitness, ermuedung, form, prognose } */
  M.formReihe = function (von, bis) {
    const out = new Map(); if (!bereit()) return out;
    const PM = C.pmc ? C.pmc() : null, FK = window.FK; if (!PM || !PM.length || !FK) return out;
    const h = heute(), ende = bis > add(h, 21) ? add(h, 21) : bis;
    for (let d = von; d <= ende && d <= h; d = add(d, 1)) { const A = FK.pmcMorgen(PM, d); if (A) out.set(d, { fitness: A.fitness, ermuedung: A.ermuedung, form: A.form, prognose: false }); }
    if (ende <= h) return out;
    let st = null; for (let i = PM.length - 1; i >= 0; i--) if (PM[i] && PM[i].date < h) { st = PM[i]; break; }
    if (!st) return out;
    const KM = new Map(), K = (d) => { const mo = montag(d); if (!KM.has(mo)) KM.set(mo, kontext(mo)); return KM.get(mo); };
    let ctl = st.ctl, atl = st.atl;
    for (let d = h; d < ende; d = add(d, 1)) {
      const ist = (C.D.activities || []).filter((a) => a && a.date === d && FK.zaehlt(a));
      let l = 0;
      if (ist.length) l = ist.reduce((s2, a) => s2 + (isNum(a.tss) ? a.tss : 0), 0);
      else { const k = K(d), t = k && k.w.tage.find((x) => x.date === d); if (t && !t.rennen) for (const e of t.einheiten) { const x = lastGeplant(e, bezug(k)); if (isNum(x.tl)) l += x.tl; } }
      ctl += (l - ctl) / 42; atl += (l - atl) / 7;
      const n = add(d, 1); if (n >= von) out.set(n, { fitness: Math.round(ctl), ermuedung: Math.round(atl), form: Math.round(ctl) - Math.round(atl), prognose: true });
    }
    return out;
  };
  function formHTML(ds) {
    let f = null; try { f = formTag(ds); } catch (e) { console.error(e); }
    if (!f) return "";
    const st = V6().status(f.form), pre = f.prognose ? "≈ " : "";
    // V7.8 trainingsstatus-1.0 (Vorlage enduco): Ermüdung ÷ Fitness, dazu die Veränderung zum Vortag
    let v = null; try { v = formTag(add(ds, -1)); } catch (e) { v = null; }
    const D8 = window.V78, ts = D8 ? D8.status(f.fitness, f.ermuedung) : null, tv = D8 && v ? D8.status(v.fitness, v.ermuedung) : null, stu = D8 ? D8.stufe(ts) : null;
    const dl = (a, b2, n) => { const x = D8 && v ? D8.delta(a, b2, n) : null; return x ? ` <small class="mp-dl">(${x.text})</small>` : ""; };
    return `<div class="tb-kopf"><button type="button" class="tb-i" data-tbi aria-expanded="false" aria-label="Erklärung zu Fitness, Ermüdung, Status und Form">i</button><div class="kv ek-kv mp-form mp-form4"><div><b>${pre}${f.fitness}${dl(f.fitness, v && v.fitness)}</b><span>Fitness</span></div><div><b>${pre}${f.ermuedung}${dl(f.ermuedung, v && v.ermuedung)}</b><span>Ermüdung</span></div>
      ${ts != null ? `<div><b>${pre}${String(ts).replace(".", ",")}${dl(ts, tv, 2)}</b><span>Status · ${esc(stu.text)}</span><i class="mp-skala" aria-hidden="true"><i style="left:${(stu.anteil * 100).toFixed(0)}%"></i></i></div>` : ""}
      <div><b>${pre}${f.form > 0 ? "+" : ""}${f.form}</b><span>Form${st ? ` · <i class="st-farbe" style="--stc:${st.farbe}">${esc(st.name)}</i>` : ""}</span></div></div>
      <div class="tb-erkl" data-tberkl hidden>${ts != null ? `<p class="hint">Status = Ermüdung ÷ Fitness (${esc(D8.VERSIONS.status)}): unter 0,8 wenig Last, bis 1,3 üblich, darüber hoch – eine Orientierung, kein Grenzwert; in Klammern die Veränderung zum Vortag.</p>` : ""}
      ${f.prognose ? `<p class="hint">Zu Tagesbeginn, fortgeschrieben mit der geplanten Last von Mein Plan (TL ≈ aus deinem Zonenprofil)${f.stunde && f.stunde.length ? `; ohne TL ≈ mit deiner Last pro Stunde der Sportart: ${esc(f.stunde.slice(0, 3).join(", "))}${f.stunde.length > 3 ? " …" : ""}` : ""}${f.ohne && f.ohne.length ? `; ohne Schätzung nicht gezählt: ${esc(f.ohne.slice(0, 3).join(", "))}` : ""}${f.offen ? `; ${f.offen} Renntag${f.offen === 1 ? "" : "e"} als 0` : ""}; Krafttraining zählt nicht – ein Modell, keine Messung (${window.FK ? window.FK.VERSIONS.pmc : "pmc"}).</p>` : ""}</div></div>`;
  }
  const WT_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  /** V7.6 kraft-plan-1.1: Krafttraining aus den Planeinstellungen (Tag automatisch oder fest) und was daraus in dieser Woche wurde; änderbar aus dem Tagesblatt. */
  function kraftHTML(ds, KW) {
    if (!window.V76 || !window.V75UI || !window.V75UI.kraft) return "";
    const E = window.V75UI.einstellungen(); if (!E) return "";
    const W = V6(), K = E.kraft, x = KW && KW.w ? KW.w.kraft : null, D = window.V76;
    const woche = !x ? "" : x.status === "geplant" ? `diese Woche: ${x.date === ds ? "an diesem Tag" : D.TAGE[V66().wtNr(x.date) - 1]}${x.kurz ? ` · ${D.dauerText(x.dauer)} (${x.kurz})` : ""}`
      : x.status === "aus" ? "diese Woche ausgelassen" : `diese Woche keins: ${x.grund === "kein Tag" ? "kein möglicher Tag" : x.grund}`;
    const satz = K.aktiv ? `${K.modus === "auto" ? "den Tag wählt die Seite" : "fester Tag"} · Planeinstellungen${woche ? " · " + woche : ""}` : "kein Krafttraining – in den Planeinstellungen festlegen";
    return `<div class="mp-vf mp-kraft"><div class="mp-vf-t"><span class="abschnitt">${W.icon("kraft", 14)}Krafttraining</span><b>${esc(D.text(K))}</b>
        <small>${esc(satz)}</small></div>
      ${ds >= heute() ? `<button type="button" class="btn" data-mpkraft>${K.aktiv ? "Ändern" : "Festlegen"}</button>` : ""}</div>`;
  }
  /** Verfügbarkeit eines Tages oder Wochentags ändern (Zeit, Sportarten); danach «Anpassen» oder «Neu berechnen». */
  M.verfuegbarkeitBlatt = function (ds, zurueck) {
    if (!bereit()) return;
    const W = V6(), K = kontext(montag(ds)), verf = K && K.verf, v = verf ? verf(ds) : null, wtn = V66().wtNr(ds);
    const startMin = v && v.min != null ? v.min : 90, offenZ = !!(v && v.min == null), sp0 = v && v.sport ? v.sport : V66().VF_SPORT.slice();
    const html = `<h2 id="v59-ov-h" tabindex="-1">Verfügbarkeit</h2><p class="sub">${esc(tagText(ds))}</p>
      <label class="mp-dauer"><span>Zeit</span><input type="range" min="0" max="480" step="15" value="${Math.min(480, startMin)}" data-vfmin aria-label="Trainingszeit in Minuten" ${offenZ ? "disabled" : ""}><output data-vfout></output></label>
      <label class="mp-auto"><input type="checkbox" data-vfoffen ${offenZ ? "checked" : ""}> Zeit offen (keine Grenze)</label>
      <h3 class="abschnitt">Sportarten</h3>
      <div class="row mp-vf-wahl" role="group" aria-label="Erlaubte Sportarten">${V66().VF_SPORT.map((x) => `<button type="button" class="chip" data-vfsp="${x}" aria-pressed="${sp0.includes(x)}"><span class="mo-sp" style="--sp:${spFarbe(x)}">${W.sportIcon(x, 15)}</span>${x === "schwimm" ? "Schwimmen" : x === "rad" ? "Rad" : "Laufen"}</button>`).join("")}</div>
      <h3 class="abschnitt">Gilt für</h3>
      <div class="row mp-vf-wahl" role="radiogroup" aria-label="Gilt für"><button type="button" class="chip" data-vfziel="tag" aria-pressed="${!v || v.quelle === "tag"}">nur ${esc(dkurz(ds))}</button><button type="button" class="chip" data-vfziel="wt" aria-pressed="${!!(v && v.quelle === "wochentag")}">jeden ${esc(WT_LANG[wtn - 1])}</button></div>
      <p class="hint">${esc(V66().VERSIONS.verfuegbarkeit)}: Der Vorschlag verteilt sich danach – Einheiten bleiben an ihrem Tag, wenn sie passen, sonst kommen sie auf einen anderen erlaubten Tag oder werden gekürzt (immer gemeldet). Wochen, die du bearbeitet hast, bleiben, bis du «Anpassen» wählst. Nichts geht an Garmin oder Enduco.</p>
      <p class="warn-t" data-mpfehler hidden></p>
      ${fuss("data-mpz", `<button type="button" class="btn" data-vfweg ${v ? "" : "disabled"}>Zurücksetzen</button><button type="button" class="btn primary gross" data-vfok>${W.icon("check", 18)} Speichern</button>`)}`;
    const ov = V59().blatt("mp-vf", html);
    const sl = ov.querySelector("[data-vfmin]"), out = ov.querySelector("[data-vfout]"), of = ov.querySelector("[data-vfoffen]");
    const zeig = () => { out.textContent = of.checked ? "offen" : +sl.value === 0 ? "kein Training" : hm(+sl.value) + " h"; sl.disabled = of.checked; };
    sl.oninput = zeig; of.onchange = zeig; zeig();
    ov.querySelectorAll("[data-vfsp]").forEach((b) => (b.onclick = () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))));
    ov.querySelectorAll("[data-vfziel]").forEach((b) => (b.onclick = () => ov.querySelectorAll("[data-vfziel]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)))));
    ov.querySelector("[data-mpz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    const fehler = (f) => { const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = !f; };
    const ziel = () => (ov.querySelector('[data-vfziel="wt"]').getAttribute("aria-pressed") === "true" ? { wt: wtn } : { date: ds });
    const speichern = async (wert) => {
      const z = ziel(), id = z.date ? "vf-" + z.date : "vf-wt-" + z.wt;
      const f = await vfSpeichern(ds, z, wert && wert.zuruecksetzen ? (verf && verf.eintrag(id) ? null : undefined) : wert);
      if (f) return fehler(f);
      M.reaktionBlatt(ds, zurueck);
    };
    ov.querySelector("[data-vfok]").onclick = () => {
      const sport = [...ov.querySelectorAll("[data-vfsp]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.vfsp);
      speichern({ min: of.checked ? null : +sl.value, sport: sport.length === 3 ? null : sport });
    };
    ov.querySelector("[data-vfweg]").onclick = () => speichern({ zuruecksetzen: true });
  };
  /** Speichert einen Eintrag; die laufende Woche wird vorher so festgehalten, wie sie gezeigt wird (vergangene Tage bleiben). */
  async function vfSpeichern(ds, ziel, wert) {
    if (wert === undefined) return "Für diese Auswahl ist nichts eingetragen.";
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    const e = V66().vfEintrag(ziel, wert, new Date().toISOString()), f = V66().vfPruefen(e); if (f) return f;
    const moH = montag(heute()), betrifft = ziel.wt ? true : montag(ziel.date) === moH;
    if (betrifft && heute() > moH) { const r = await aendern(moH, { art: "festhalten" }); if (r) return r; }     // vergangene Tage bleiben, wie sie gezeigt wurden
    if (!Array.isArray(I.data.verfuegbarkeit)) I.data.verfuegbarkeit = [];
    await I.upsert("verfuegbarkeit", e);
    neuZeichnen();
    return null;
  }
  /** V7.6.1 verfuegbarkeit-1.1 (Vorbild enduco «Trainingsverfügbarkeit», Silas' Wunsch vom 17.11.2026): alle sieben Wochentage in einem Blatt – kein Training
   *  oder Sportarten und höchstens so viel Zeit (15-min-Schritte bis 10 h, ganz rechts «offen»). «Fertig» speichert je geänderten Wochentag einen Eintrag
   *  vf-wt-N (offen mit allen Sportarten = Eintrag entfernt); die laufende Woche wird vorher einmal festgehalten. Danach «Anpassen», «Neu berechnen» oder «Nur speichern». */
  const VW_MAX = 600, VW_OFFEN = VW_MAX + 15, VW_SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  M.verfuegbarkeitWoche = function (zurueck) {
    if (!bereit() || M.entwurfSperre()) return;
    const W = V6(), SP = V66().VF_SPORT, mo = montag(heute()), K = kontext(mo), verf = (K && K.verf) || (P().verfuegbarkeit ? P().verfuegbarkeit() : null);
    const alt = (n) => { const e = verf && verf.eintrag ? verf.eintrag("vf-wt-" + n) : null; return e && !e.entfernt ? e : null; };
    const aus = (v) => !!v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length));
    const S = WT_LANG.map((_, k) => { const e = alt(k + 1); return { an: !aus(e), sport: e && Array.isArray(e.sport) && e.sport.length ? SP.filter((x) => e.sport.includes(x)) : SP.slice(), min: e && e.min ? e.min : null }; });
    const wert = (s) => (!s.an ? "Kein Training" : s.min == null ? "offen" : W.dauerText(s.min * 60));
    const zeile = (s, k) => `<li class="vw-tag" data-vw="${k}"><div class="vw-kopf"><b id="vw-t${k}">${WT_LANG[k]}</b><em data-vwwert>${esc(wert(s))}</em></div>
        <div class="vw-zeile"><button type="button" class="vw-an" role="switch" aria-checked="${s.an}" aria-label="${WT_LANG[k]}: trainieren" data-vwan><i>${W.icon(s.an ? "haken" : "schlaf", 16)}</i></button>
          <span class="vw-sp" role="group" aria-labelledby="vw-t${k}" data-vwsps${s.an ? "" : " hidden"}>${SP.map((x) => `<button type="button" class="vw-chip" data-vwsp="${x}" aria-pressed="${s.sport.includes(x)}" aria-label="${VW_SPW[x]}" style="--sp:${spFarbe(x)}">${W.sportIcon(x, 17)}<i aria-hidden="true">${W.icon("haken", 11)}</i></button>`).join("")}</span></div>
        <div class="vw-regler pe-fit" data-vwreg${s.an ? "" : " hidden"}><button type="button" class="btn" data-vwm aria-label="${WT_LANG[k]}: 15 min weniger">−</button>
          <input type="range" min="15" max="${VW_OFFEN}" step="15" value="${s.min == null ? VW_OFFEN : Math.min(VW_MAX, Math.max(15, s.min))}" data-vwr aria-label="${WT_LANG[k]}: höchstens">
          <button type="button" class="btn" data-vwp aria-label="${WT_LANG[k]}: 15 min mehr">+</button></div></li>`;
    const html = `<div class="blatt-titel">${W.icon("kalender", 34)}<h2 id="v59-ov-h" tabindex="-1">Trainingsverfügbarkeit</h2>
        <p class="sub">Wie viel Zeit du an jedem Wochentag höchstens hast und welche Sportarten gehen.</p></div>
      <ul class="vw-liste">${S.map(zeile).join("")}</ul>
      <p class="hint">${esc(V66().VERSIONS.verfuegbarkeit)}: gilt jede Woche; einen einzelnen Tag änderst du im Tagesblatt (geht vor). Der Vorschlag verteilt sich danach – Einheiten bleiben an
        ihrem Tag, wenn sie passen, sonst kommen sie auf einen anderen erlaubten Tag oder werden gekürzt (immer gemeldet). Ganz rechts = offen (keine Grenze). Krafttraining belegt seine Zeit am Tag.
        Die laufende Woche bleibt, wie sie gezeigt wird («Anpassen» verteilt sie neu). Nichts geht an Garmin oder Enduco.</p>
      <p class="warn-t" data-mpfehler hidden></p>
      ${fuss("data-mpz", `<button type="button" class="btn primary gross" data-vwok>Fertig ${W.icon("haken", 18)}</button>`)}`;
    const ov = V59().blatt("mp-vf", html);
    const aria = (r, s) => r.setAttribute("aria-valuetext", s.min == null ? "offen" : W.dauerText(s.min * 60));
    ov.querySelectorAll("[data-vw]").forEach((li) => {
      const k = +li.dataset.vw, s = S[k], r = li.querySelector("[data-vwr]");
      const zeig = () => {
        li.querySelector("[data-vwwert]").textContent = wert(s);
        const an = li.querySelector("[data-vwan]"); an.setAttribute("aria-checked", String(s.an)); an.querySelector("i").innerHTML = W.icon(s.an ? "haken" : "schlaf", 16);
        li.querySelector("[data-vwsps]").hidden = !s.an; li.querySelector("[data-vwreg]").hidden = !s.an; li.classList.toggle("aus", !s.an); aria(r, s);
      };
      const setz = (v) => { v = Math.max(15, Math.min(VW_OFFEN, v)); r.value = v; s.min = v >= VW_OFFEN ? null : v; zeig(); };
      li.querySelector("[data-vwan]").onclick = () => { s.an = !s.an; if (s.an && !s.sport.length) s.sport = SP.slice(); zeig(); };
      li.querySelectorAll("[data-vwsp]").forEach((b) => (b.onclick = () => {
        const x = b.dataset.vwsp, drin = s.sport.includes(x);
        if (drin && s.sport.length === 1) return;                                          // mindestens eine Sportart – sonst «Kein Training»
        s.sport = drin ? s.sport.filter((y) => y !== x) : SP.filter((y) => y === x || s.sport.includes(y));
        b.setAttribute("aria-pressed", String(!drin));
      }));
      r.oninput = () => setz(+r.value);
      li.querySelector("[data-vwm]").onclick = () => setz((s.min == null ? VW_OFFEN : s.min) - 15);
      li.querySelector("[data-vwp]").onclick = () => setz((s.min == null ? VW_OFFEN : s.min) + 15);
      zeig();
    });
    ov.querySelector("[data-mpz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    const norm = (v) => (!v ? "frei" : aus(v) ? "aus" : JSON.stringify([v.min == null ? null : v.min, Array.isArray(v.sport) && v.sport.length < SP.length ? SP.filter((x) => v.sport.includes(x)) : null]));
    ov.querySelector("[data-vwok]").onclick = async (ev) => {
      const L = [];
      S.forEach((s, k) => {
        const neu = !s.an ? { min: 0, sport: [] } : { min: s.min, sport: s.sport.length === SP.length ? null : s.sport.slice() };
        const offen = s.an && neu.min == null && neu.sport == null, e = alt(k + 1);
        if (offen ? !e : e && norm(e) === norm(neu)) return;                                 // unverändert
        L.push({ wt: k + 1, wert: offen ? null : neu });
      });
      if (!L.length) { if (zurueck) zurueck(); else V59().schliessen(); return; }
      ev.currentTarget.disabled = true;
      const f = await vfWocheSpeichern(L);
      if (f) { ev.currentTarget.disabled = false; const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = false; return; }
      M.reaktionBlatt(heute(), zurueck, `Trainingsverfügbarkeit: ${L.length === 1 ? WT_LANG[L[0].wt - 1] : `${L.length} Wochentage`} geändert – gilt jede Woche.`);
    };
  };
  /** Mehrere Wochentage auf einmal speichern; die laufende Woche vorher einmal festhalten (vergangene Tage bleiben, wie sie gezeigt wurden). */
  async function vfWocheSpeichern(L) {
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    const jetzt = new Date().toISOString(), E = L.map((x) => V66().vfEintrag({ wt: x.wt }, x.wert, jetzt));
    for (const e of E) { const f = V66().vfPruefen(e); if (f) return `${WT_LANG[e.wt - 1]}: ${f}`; }
    const moH = montag(heute());
    if (heute() > moH) { const r = await aendern(moH, { art: "festhalten" }); if (r) return r; }
    if (!Array.isArray(I.data.verfuegbarkeit)) I.data.verfuegbarkeit = [];
    for (const e of E) await I.upsert("verfuegbarkeit", e);
    neuZeichnen();
    return null;
  }
  /** Kurztext der Wochenvorlage für die Planeinstellungen: «Mo kein Training · Di–Fr 2:45 h · Sa, So 5:00 h» (gleiche Tage zusammen). */
  M.verfuegbarkeitText = function () {
    if (!bereit() || !P().verfuegbarkeit) return "";
    const verf = P().verfuegbarkeit(), W = V6(), K = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const t = (n) => { const e = verf.eintrag ? verf.eintrag("vf-wt-" + n) : null; if (!e || e.entfernt) return "frei";
      if (e.min === 0 || (Array.isArray(e.sport) && !e.sport.length)) return "kein Training";
      const sp = Array.isArray(e.sport) && e.sport.length < 3 ? ` (${e.sport.map((x) => VW_SPW[x]).join(", ")})` : "";
      return (e.min == null ? "offen" : W.dauerText(e.min * 60)) + sp; };
    const T = [1, 2, 3, 4, 5, 6, 7].map(t);
    if (T.every((x) => x === "frei")) return "nicht festgelegt – der Vorschlag plant frei";
    const out = []; let a = 0;
    while (a < 7) { let b = a; while (b + 1 < 7 && T[b + 1] === T[a]) b++; out.push(`${b - a >= 2 ? `${K[a]}–${K[b]}` : K.slice(a, b + 1).join(", ")} ${T[a]}`); a = b + 1; }
    return out.join(" · ");
  };
  /** Nach einer Änderung der Verfügbarkeit: wie soll der Plan reagieren? */
  M.reaktionBlatt = function (ds, zurueck, sub) {
    const W = V6(), mo = montag(ds), K = kontext(mo);
    const html = `<h2 id="v59-ov-h" tabindex="-1">Gespeichert</h2><p class="sub">${esc(sub || `Verfügbarkeit ${tagText(ds)}: ${K && K.verf ? V66().vfText(K.verf(ds)) : ""}`)}</p>
      <ul class="mp-wahl">
        <li><button type="button" class="mp-zeile" data-mpre="anpassen"><span class="mp-vt"><b>Woche anpassen</b><small>KW ${V6().isoWoche(mo)} ab heute neu verteilen; gesperrte Tage und deine eigenen Einheiten bleiben.</small></span>${W.icon("weiter", 18)}</button></li>
        <li><button type="button" class="mp-zeile" data-mpre="neu"><span class="mp-vt"><b>Neu berechnen</b><small>Diese und alle folgenden Wochen wieder nach dem Vorschlag mit deiner Verfügbarkeit; nur gesperrte Tage bleiben.</small></span>${W.icon("weiter", 18)}</button></li>
        <li><button type="button" class="mp-zeile" data-mpre="nichts"><span class="mp-vt"><b>Nur speichern</b><small>Wochen ohne eigene Änderungen folgen der Verfügbarkeit von selbst; bearbeitete bleiben.</small></span>${W.icon("weiter", 18)}</button></li></ul>
      <p class="warn-t" data-mpfehler hidden></p>${fuss("data-mpz")}`;
    const ov = V59().blatt("mp-vf", html);
    const weiter = () => (zurueck ? zurueck() : V59().schliessen());
    ov.querySelector("[data-mpz]").onclick = weiter;
    ov.querySelectorAll("[data-mpre]").forEach((b) => (b.onclick = async () => {
      const art = b.dataset.mpre; let f = null;
      if (art === "anpassen") f = await aendern(mo, { art: "anpassen" });
      if (art === "neu") f = await neuAlle(mo);
      if (f) { const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = false; return; }
      weiter();
    }));
  };
  /** «Neu berechnen»: diese Woche (ab heute) und alle späteren Wochen mit eigenem Plan wieder nach dem Vorschlag; gesperrte Tage bleiben. */
  async function neuAlle(mo) {
    const ab = mo < montag(heute()) ? montag(heute()) : mo;
    const ids = new Set([...(C.D.plan_woche || []), ...((UI().Inbox.data || {}).planwoche || [])].filter((w) => w && w.montag >= ab).map((w) => w.montag));
    ids.add(ab);
    for (const m of [...ids].sort()) { if (m === ab || P().planEintrag(m)) { const f = await aendern(m, { art: "neuberechnen" }); if (f && m === ab) return f; } }
    return null;
  }
  /** Abschnitt «Garmin» im Tagesblatt: Stand des Auftrags, «An Garmin senden», «am Vortag um 23 Uhr automatisch». */
  function garminHTML(ds, t) {
    if (ds < heute()) return "";
    if (P().entwurf && P().entwurf.aktiv()) return `<p class="hint mp-garmin-ent">${V6().icon("geraet", 14)} An Garmin senden geht erst nach dem Speichern (✓).</p>`;   // V7.9 bearbeiten-1.0
    const W = V6(), A = auftrag(ds), a = A && A.a, G = gesendet().filter((g) => g && g.date === ds && !g.entfernt);
    const U = t.rennen ? [] : t.einheiten, sendbar = U.filter((e) => !V66().garminGrund(e));
    const ohne = U.filter((e) => V66().garminGrund(e)).map((e) => `${esc(e.titel)} (${esc(V66().garminGrund(e))})`);
    const zeit = (iso) => { try { return new Date(iso).toLocaleString("de-CH", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } };
    let stand = "";
    if (a && A.lokal) stand = a.modus === "aus" ? "Automatisch senden abgestellt (wird mit dem nächsten Update übernommen)."
      : a.modus === "auto" ? "Wird am Vortag ab 23 Uhr automatisch gesendet (die Fassung von jetzt; Änderungen hier werden mitgenommen)." : "Wird mit dem nächsten Nacht-Update gesendet (gegen 23 Uhr).";
    else if (a && a.status === "offen") stand = a.modus === "auto" ? "Wird am Vortag ab 23 Uhr automatisch gesendet." : "Wird mit dem nächsten Nacht-Update gesendet (gegen 23 Uhr).";
    else if (a && a.status === "erledigt") stand = `Gesendet ${esc(zeit(a.erledigt))}.`;
    else if (a && a.status === "verpasst") stand = "Nicht gesendet: der Tag war schon da.";
    const fehl = a && !A.lokal && a.status === "fehler" ? `<p class="warn-t">Nicht gesendet: ${esc((a.fehler || []).join("; "))}</p>` : "";
    const abgelehnt = (C.D.garmin_abgelehnt || []).filter((x) => x && x.id === "gs-" + ds && (!a || String(x.erstellt || "") >= String(a.erstellt || ""))).pop();
    const zuSpaet = ds === heute() || (ds === add(heute(), 1) && nachtGelaufen() && !(a && !A.lokal && a.status === "erledigt"));
    if (!garminFenster(ds) || zuSpaet) return `<h3 class="abschnitt">Garmin</h3>${stand && !A.lokal ? `<p class="mp-g keep" role="status">${stand}</p>` : G.length ? `<p class="mp-g">${G.length} ${G.length === 1 ? "Einheit" : "Einheiten"} in Garmin.</p>` : ""}${fehl}
      <p class="hint">${ds === heute() ? "Für heute geht es nur noch im Chat («schick die Einheiten von heute an Garmin»)."
        : zuSpaet ? "Das Nacht-Update ist heute schon gelaufen – für morgen geht es nur noch im Chat." : "Senden geht ab einer Woche vorher."}</p>`;
    const auto = !!(a && a.modus === "auto" && (A.lokal || a.status === "offen"));
    return `<h3 class="abschnitt">Garmin</h3>
      ${stand ? `<p class="mp-g keep" role="status">${stand}</p>` : G.length ? `<p class="mp-g">${G.length} ${G.length === 1 ? "Einheit" : "Einheiten"} in Garmin.</p>` : ""}${fehl}
      ${abgelehnt ? `<p class="warn-t">Abgelehnt: ${esc(abgelehnt.grund)}</p>` : ""}
      ${ohne.length ? `<p class="hint">Nicht gesendet: ${ohne.join(", ")}.</p>` : ""}
      <div class="row mp-akt"><button type="button" class="btn" data-mpgs ${sendbar.length || G.length ? "" : "disabled"}>${W.icon("weiter", 15)} ${sendbar.length || !G.length ? "An Garmin senden" : "Aus Garmin austragen"}</button></div>
      <label class="mp-auto"><input type="checkbox" data-mpgsauto ${auto ? "checked" : ""} ${sendbar.length || auto ? "" : "disabled"}> Am Vortag um 23 Uhr automatisch senden</label>
      <p class="hint">${esc(V66().VERSIONS.garmin)}: Rad, Laufen und Schwimmen als Workout (Name «IN · ») mit Zielen in der Metrik der Einheit – Leistung bzw. Tempo, Puls oder RPE; Schwimmen mit Bahnen, Übungen und Pausen am Beckenrand. Bibliotheks-Workouts nur eingeplant; aufs Gerät kommen sie beim Synchronisieren (Fenix, Edge nur Rad). Gesendet wird im Nacht-Update; geänderte Einheiten werden ersetzt, Enduco bleibt unberührt.</p>`;
  }
  /** Knöpfe des Abschnitts binden; zurueck() öffnet das Tagesblatt wieder (nach einer Änderung oder aus einem Unterblatt). */
  M.binden = function (ov, ds, zurueck) {
    const fehler = (f) => { const p = ov.querySelector("[data-mpfehler]"); if (p) { p.textContent = f; p.hidden = !f; } };
    ov.querySelectorAll("[data-mpe]").forEach((b) => (b.onclick = () => M.einheit(ds, b.dataset.mpe, { zurueck })));
    ov.querySelectorAll("[data-mpadd]").forEach((b) => (b.onclick = () => M.hinzufuegen(ds, zurueck)));
    ov.querySelectorAll("[data-mpeigen]").forEach((b) => (b.onclick = () => M.eigeneAktivitaet(ds, zurueck)));      // V7.10 tagesblatt-2.0
    ov.querySelectorAll("[data-tbi]").forEach((b) => (b.onclick = () => {                                          // Erklärung hinter «i»
      const x = b.closest(".tb-kopf") && b.closest(".tb-kopf").querySelector("[data-tberkl]"); if (!x) return;
      x.hidden = !x.hidden; b.setAttribute("aria-expanded", String(!x.hidden));
    }));
    vfBinden(ov, ds, zurueck, fehler);
    ov.querySelectorAll("[data-mpvf]").forEach((b) => (b.onclick = () => M.verfuegbarkeitBlatt(ds, zurueck)));
    ov.querySelectorAll("[data-mpvfw]").forEach((b) => (b.onclick = () => M.verfuegbarkeitWoche(zurueck)));   // V7.6.1 verfuegbarkeit-1.1
    ov.querySelectorAll("[data-mpkraft]").forEach((b) => (b.onclick = () => window.V75UI.kraft({ zurueck: zurueck || (() => V59().schliessen()) })));   // V7.6
    if (window.V74UI) window.V74UI.binden(ov, zurueck);                    // V7.4: «Trotzdem wie geplant», «Woche anpassen?»
    ov.querySelectorAll("[data-mplock]").forEach((b) => (b.onclick = async () => {
      const x = tagVon(ds); if (!x) return;
      const f = await aendern(montag(ds), { art: x.t.gesperrt ? "entsperren" : "sperren", date: ds });
      if (f) fehler(f); else if (zurueck) zurueck();
    }));
    ov.querySelectorAll("[data-mpgs]").forEach((b) => (b.onclick = async () => {        // garmin-senden-1.1: von Hand (nächstes Nacht-Update)
      const f = await garminAuftragSpeichern(ds, "senden");
      if (f) fehler(f); else if (zurueck) zurueck();
    }));
    ov.querySelectorAll("[data-mpgsauto]").forEach((c) => (c.onchange = async () => {   // garmin-senden-1.0: automatisch am Vortag ab 23 Uhr
      const f = await garminAuftragSpeichern(ds, c.checked ? "auto" : "aus");
      if (f) fehler(f); else if (zurueck) zurueck();
    }));
  };

  /** V7.10 tagesblatt-2.0: Verfügbarkeit im Blatt – Regler und Sportarten speichern sofort (nach kurzer Pause); danach das Tagesblatt an derselben Stelle neu. */
  function vfBinden(ov, ds, zurueck, fehler) {
    const vf = ov.querySelector("[data-tbvf]"); if (!vf) return;
    const W = V6(), sl = vf.querySelector("[data-tbvfmin]"), out = vf.querySelector("[data-tbvfout]"), offenI = +vf.dataset.offen;
    const text = (i) => (i >= offenI ? "offen" : i === 0 ? "Kein Training" : W.dauerText(i * 15 * 60));
    const sports = () => [...vf.querySelectorAll("[data-tbvfc]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.tbvfc);
    const neuHalten = () => {
      const b = ov.querySelector(".te-box"), y = b ? b.scrollTop : 0;
      if (zurueck) zurueck(); else V59().schliessen();
      const b2 = document.querySelector("#v59-ov .te-box"); if (b2) b2.scrollTop = y;
    };
    let t = null;
    const speichern = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const i = +sl.value, s = sports(), wert = { min: i >= offenI ? null : i * 15, sport: s.length === V66().VF_SPORT.length ? null : s };
        const K = kontext(montag(ds)), verf = K && K.verf, wt = verf && verf.eintrag ? verf.eintrag("vf-wt-" + V66().wtNr(ds)) : null, tg = verf && verf.eintrag ? verf.eintrag("vf-" + ds) : null;
        const wtW = wt && !wt.entfernt ? { min: wt.min == null ? null : wt.min, sport: wt.sport == null ? null : wt.sport } : { min: null, sport: null };
        const gleich = wtW.min === wert.min && JSON.stringify(wtW.sport) === JSON.stringify(wert.sport);
        let f = null;
        if (gleich) { if (!(tg && !tg.entfernt)) return; f = await vfSpeichern(ds, { date: ds }, null); }   // wie der Wochentag: Eintrag des Tages weg
        else f = await vfSpeichern(ds, { date: ds }, wert);
        if (f) { fehler(f); return; }
        TB_RE = ds; neuHalten();
      }, 450);
    };
    sl.oninput = () => { out.textContent = text(+sl.value); sl.setAttribute("aria-valuetext", out.textContent); };
    sl.onchange = speichern;
    vf.querySelector("[data-tbvfsp]").onclick = (e) => { const c = vf.querySelector("[data-tbvfchips]"); c.hidden = !c.hidden; e.currentTarget.setAttribute("aria-expanded", String(!c.hidden)); };
    vf.querySelectorAll("[data-tbvfc]").forEach((b) => (b.onclick = () => {
      const an = b.getAttribute("aria-pressed") !== "true";
      if (!an && sports().length <= 1) { fehler("Mindestens eine Sportart – für keinen Sport den Regler ganz nach links."); return; }
      b.setAttribute("aria-pressed", String(an)); fehler(""); speichern();
    }));
    const a = vf.querySelector("[data-tbvfanp]");
    if (a) a.onclick = async () => { const f = await aendern(montag(ds), { art: "anpassen" }); if (f) fehler(f); else neuHalten(); };
  }

  /* ---------- V7.10 tagesblatt-2.0 / eigene-aktivitaet-1.0: «Eigene Aktivität planen» ---------- */
  const EIGEN_SP = [["rad", "Rad"], ["lauf", "Laufen"], ["schwimm", "Schwimmen"], ["andere", "Andere"]];       // V8.4.1: ohne Mobility
  const DRAUSSEN_SP = [["skitour", "Skitour", "ski"], ["wandern", "Wandern", "wandern"], ["langlauf", "Langlauf", "ski"], ["trail", "Traillauf", "lauf"]];
  const RPE_WORT = ["", "sehr leicht", "leicht", "moderat", "etwas hart", "hart", "hart", "sehr hart", "sehr hart", "sehr hart", "maximal"];
  M.eigeneAktivitaet = function (ds, zurueck) {
    if (!bereit()) return;
    const W = V6(), h = heute(), d0 = ds < h ? h : ds;
    const html = `<div class="blatt-titel"><h2 id="v59-ov-h" tabindex="-1">Eigene Aktivität planen</h2><p class="sub">${esc(tagText(d0))}</p></div>
      <label class="tb-feld"><span>Titel</span><input type="text" maxlength="60" data-eatitel placeholder="z. B. Velo zur Arbeit" autocomplete="off"></label>
      <h3 class="abschnitt">Sportart</h3>
      <div class="row mp-vf-wahl" role="radiogroup" aria-label="Sportart">${EIGEN_SP.map(([k, n], i) => `<button type="button" class="chip" role="radio" data-easp="${k}" aria-checked="${i === 0}" aria-pressed="${i === 0}"><span class="mo-sp" style="--sp:${spFarbe(k)}">${W.sportIcon(k, 14)}</span>${esc(n)}</button>`).join("")}</div>
      <div class="row mp-vf-wahl" aria-label="Draussen">${DRAUSSEN_SP.map(([k, n, s]) => `<button type="button" class="chip" data-eadr="${k}"><span class="mo-sp" style="--sp:${spFarbe(s)}">${W.sportIcon(s, 14)}</span>${esc(n)} ${W.icon("weiter", 12)}</button>`).join("")}</div>
      <p class="hint">Skitour, Wandern, Langlauf und Traillauf haben ein eigenes Blatt: Dauer und Zone nach Puls, der Tag gehört dann der Aktivität (aktivitaet-plan-1.0).</p>
      <div class="tb-2"><label class="tb-feld"><span>Datum</span><input type="date" data-eadatum min="${h}" value="${d0}"></label>
        <label class="tb-feld"><span>Uhrzeit</span><input type="time" step="300" data-eazeit></label></div>
      <h3 class="abschnitt">Wiederholen</h3>
      <div class="row mp-vf-wahl" role="radiogroup" aria-label="Wiederholen"><button type="button" class="chip" role="radio" data-eaw="nie" aria-checked="true" aria-pressed="true">Nie</button><button type="button" class="chip" role="radio" data-eaw="woche" aria-checked="false" aria-pressed="false">Jede Woche</button></div>
      <label class="tb-feld" data-eabis hidden><span>bis (höchstens 16 Wochen)</span><input type="date" data-eabisd></label>
      <label class="mp-dauer"><span>Dauer</span><input type="range" min="10" max="360" step="5" value="60" data-eadauer aria-label="Dauer in Minuten"><output data-eadout>1:00 h</output></label>
      <label class="mp-dauer"><span>RPE</span><input type="range" min="1" max="10" step="1" value="3" data-earpe aria-label="Anstrengung RPE 1 bis 10"><output data-earout>3 · moderat</output></label>
      <p class="hint">Anstrengung auf der Skala 1–10 (CR-10 nach Foster). Daraus die Zone für TL ≈ (${esc(V66().VERSIONS.eigen)}, eigene Festlegung): RPE 1–2 Z1, 3–4 Z2, 5–6 Z3, 7 knapp unter LT2, 8–10 VO2max; Schwimmen ab 7 CSS-Tempo. Andere ohne TL ≈.</p>
      <p class="warn-t" data-mpfehler hidden></p>
      ${fuss("data-mpz", `<button type="button" class="btn primary gross" data-eaok>${W.icon("plus", 18)} Planen</button>`)}`;
    const ov = V59().blatt("mp-eigen", html);
    const $q = (s) => ov.querySelector(s), fehler = (f) => { const p = $q("[data-mpfehler]"); p.textContent = f || ""; p.hidden = !f; };
    $q("[data-mpz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    const wahl = (sel, b) => ov.querySelectorAll(sel).forEach((x) => { x.setAttribute("aria-pressed", String(x === b)); x.setAttribute("aria-checked", String(x === b)); });
    ov.querySelectorAll("[data-easp]").forEach((b) => (b.onclick = () => wahl("[data-easp]", b)));
    ov.querySelectorAll("[data-eadr]").forEach((b) => (b.onclick = () => { if (window.V77UI && window.V77UI.blatt) window.V77UI.blatt($q("[data-eadatum]").value || d0, b.dataset.eadr, zurueck); }));
    const bisL = $q("[data-eabis]"), bis = $q("[data-eabisd]");
    const bisGrenzen = () => { const d = $q("[data-eadatum]").value || d0; bis.min = add(d, 7); bis.max = add(d, 7 * 16); if (!bis.value || bis.value < bis.min || bis.value > bis.max) bis.value = add(d, 7 * 4); };
    ov.querySelectorAll("[data-eaw]").forEach((b) => (b.onclick = () => { wahl("[data-eaw]", b); bisL.hidden = b.dataset.eaw !== "woche"; bisGrenzen(); }));
    $q("[data-eadatum]").onchange = bisGrenzen;
    const du = $q("[data-eadauer]"), rp = $q("[data-earpe]");
    du.oninput = () => { $q("[data-eadout]").textContent = W.dauerText(+du.value * 60); };
    rp.oninput = () => { $q("[data-earout]").textContent = `${rp.value} · ${RPE_WORT[+rp.value]}`; };
    $q("[data-eaok]").onclick = async () => {
      const sport = (ov.querySelector('[data-easp][aria-pressed="true"]') || {}).dataset.easp || "rad";
      const name = (EIGEN_SP.find((x) => x[0] === sport) || [0, "Aktivität"])[1];
      const titel = ($q("[data-eatitel]").value || "").trim() || `${name} nach Gefühl`;
      const datum = $q("[data-eadatum]").value || d0;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || datum < h) return fehler("Datum ab heute wählen.");
      let uhr = $q("[data-eazeit]").value || null;
      if (uhr) { const [hh, mm] = uhr.split(":").map(Number); const m5 = Math.min(55, Math.round(mm / 5) * 5); uhr = `${String(hh).padStart(2, "0")}:${String(m5).padStart(2, "0")}`; }
      const tage = [datum];
      if (ov.querySelector('[data-eaw="woche"]').getAttribute("aria-pressed") === "true") {
        const b = bis.value; if (!b || b < add(datum, 7)) return fehler("Bis-Datum mindestens eine Woche nach dem ersten Tag.");
        for (let d = add(datum, 7); d <= b && tage.length < 17; d = add(d, 7)) tage.push(d);
      }
      const einheit = Object.assign({ vorlage: "eigen", titel, sport, dauer: +du.value, rpe: +rp.value }, uhr ? { uhrzeit: uhr } : {});
      const nicht = [];
      for (const d of tage) { const f = await aendern(montag(d), { art: "hinzufuegen", date: d, einheit }); if (f) nicht.push(`${dkurz(d)}: ${f}`); }
      if (nicht.length === tage.length) return fehler(nicht.slice(0, 3).join(" · "));
      if (nicht.length) { fehler(`${tage.length - nicht.length} von ${tage.length} geplant – nicht: ${nicht.slice(0, 3).join(" · ")}${nicht.length > 3 ? " …" : ""}`); $q("[data-eaok]").disabled = true; return; }
      if (zurueck) zurueck(); else V59().schliessen();
    };
  };

  /* ---------- Einheit: Blatt mit Ändern, Verschieben, Entfernen ---------- */
  function tageOptionen(mo, ds) {
    const h = heute(), K = kontext(mo), out = [`<option value="">nicht verschieben</option>`];
    for (let i = 0; i < 7; i++) {
      const d = add(mo, i); if (d === ds || d < h) continue;
      const t = K && K.w.tage.find((x) => x.date === d); if (t && t.gesperrt) continue;
      out.push(`<option value="${d}">${esc(tagText(d))}</option>`);
    }
    return out.join("");
  }
  function einfachBlatt(e, ds, extra, nachher) {
    const W = V6();
    const html = `<div class="ek-blatt-kopf"><span class="ek-sport gross" style="--sp:${spFarbe(e.sport)}">${W.sportIcon(e.sport, 28)}</span>
        <div><h2 id="v59-ov-h" tabindex="-1">${esc(e.titel)}</h2><p class="sub">${esc(tagText(ds))} · ${e.quelle === "bibliothek" ? "aus der Enduco-Bibliothek" : "eigene Einheit (Mein Plan)"}</p></div></div>
      <div class="kv ek-kv"><div><b>${esc(W.dauerText(e.dauer * 60))}</b><span>Dauer</span></div></div>
      <p class="ek-text">${esc(e.zweck || "")}</p>
      ${e.quelle === "bibliothek" && window.V65UI && window.V65UI.einheitWid ? `<div class="row"><button type="button" class="btn" data-mpbib="${esc(e.wid)}">Workout ansehen</button></div>` : ""}
      ${extra}
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${W.icon("zurueck", 22)}</button></div>`;
    const ov = V59().blatt("mp-einheit", html);
    const bb = ov.querySelector("[data-mpbib]"); if (bb) bb.onclick = () => window.V65UI.einheitWid(+bb.dataset.mpbib);
    nachher(ov);
  }
  M.einheit = function (ds, uid, opt) {
    opt = opt || {};
    if (!bereit()) return;
    // V7.3 einheit-2.0: die Einheit öffnet als ganze Seite (js/v73-ui.js); «Zurück» führt dorthin, woher sie kam
    if (window.V73UI && window.V73UI.plan && window.V73UI.plan(ds, uid, { zurueck: opt.zurueck || null })) return;
    const x = tagVon(ds); const e = x && x.t.einheiten.find((y) => y.uid === uid); if (!e) return;
    const mo = montag(ds), zurueck = opt.zurueck || null, darf = istAenderbar(ds, x.t);
    const B = e.quelle === "bibliothek" ? null : V66().bereich(e.vorlage || e.id);
    const extra = `<h3 class="abschnitt">Ändern</h3>` + (darf ? `
      ${B && !B.fest ? `<label class="mp-dauer"><span>Dauer</span><input type="range" min="${B.min}" max="${B.max}" step="5" value="${e.dauer}" data-mpdauer aria-label="Dauer in Minuten"><output data-mpdout>${esc(V6().dauerText(e.dauer * 60))}</output></label>
        <p class="mp-schaetz" data-mptl></p>` : `<p class="hint">${e.quelle === "bibliothek" ? "Dauer wie im Enduco-Workout." : "Feste Dauer."}</p>`}
      <p class="warn-t" data-mpaufbau hidden></p>
      <label class="mp-nach"><span>Verschieben auf</span><select data-mpnach>${tageOptionen(mo, ds)}</select></label>
      <div class="row mp-akt"><button type="button" class="btn primary" data-mpok>Speichern</button><button type="button" class="btn" data-mpweg>Entfernen</button></div>
      <p class="warn-t" data-mpfehler hidden></p>`
      : `<p class="hint">${x.t.gesperrt ? "Der Tag ist gesperrt – im Tagesblatt entsperren, dann lässt sich die Einheit ändern." : "Vergangene Tage nur lesen."}</p>`);
    const nachher = (ov) => {
      if (zurueck) ov.querySelectorAll("[data-x]").forEach((b) => (b.onclick = zurueck));
      if (!darf) return;
      const fehler = (f) => { const p = ov.querySelector("[data-mpfehler]"); if (p) { p.textContent = f; p.hidden = !f; } };
      const sl = ov.querySelector("[data-mpdauer]"), out = ov.querySelector("[data-mpdout]"), tl = ov.querySelector("[data-mptl]");
      const sel = ov.querySelector("[data-mpnach]");
      const zeig = () => {
        let neu = e;
        if (sl) {
          const d = +sl.value; if (out) out.textContent = V6().dauerText(d * 60);
          neu = V66().einheit({ uid: "x", vorlage: e.vorlage || e.id, dauer: d, quelle: "eigen", drinnen: e.drinnen }, x.K.ctxE);
        }
        const S = V66().schaetzung(neu, bezug(x.K));
        if (sl && tl) tl.textContent = [isNum(S.tl) ? `TL ≈ ${S.vollstaendig ? "" : "mind. "}${S.tl}` : `TL ≈ – (${S.grund || "offen"})`, isNum(S.km) && S.km > 0 ? `Distanz ≈ ${komma(S.km)} km` : ""].filter(Boolean).join(" · ");
        aufbauZeigen(ov.querySelector("[data-mpaufbau]"), aufbauText(neu, (sel && sel.value) || ds, S.km));
      };
      if (sl) sl.oninput = zeig;
      if (sel) sel.onchange = zeig;
      zeig();
      ov.querySelector("[data-mpok]").onclick = async () => {
        let f = null;
        if (sl && +sl.value !== e.dauer) f = await aendern(mo, { art: "dauer", date: ds, uid, dauer: +sl.value });
        const nach = ov.querySelector("[data-mpnach]").value;
        if (!f && nach) f = await aendern(mo, { art: "verschieben", date: ds, uid, nach });
        if (f) fehler(f); else if (zurueck) zurueck(); else V59().schliessen();
      };
      ov.querySelector("[data-mpweg]").onclick = async () => {
        const f = await aendern(mo, { art: "entfernen", date: ds, uid });
        if (f) fehler(f); else if (zurueck) zurueck(); else V59().schliessen();
      };
    };
    if (e.quelle === "bibliothek" || !e.teile || !e.teile.length || e.teile[0][0] === "ohne") einfachBlatt(e, ds, extra, nachher);
    else P().einheitE(e, ds, { K: x.K, extra, nachher });
  };

  /* ---------- Training hinzufügen: Sportart → Vorlage → Dauer ---------- */
  function fuss(zurueckAttr, haupt) {
    return `<div class="blatt-fuss"><button type="button" class="btn-zurueck" ${zurueckAttr} aria-label="Zurück">${V6().icon("zurueck", 22)}</button>${haupt || ""}</div>`;
  }
  M.hinzufuegen = function (ds, zurueck) {
    if (!bereit()) return;
    const W = V6();
    // V7.5 indoor-phase-1.0: liegt der Tag in einer Indoor-Phase, heisst die Wahl ohne «drinnen» ausdrücklich «draussen»
    const phase = (sp) => !!(window.V75UI && window.V75UI.indoorAm(sp, ds));
    const name = (k, n) => ((k === "rad" || k === "lauf") && phase(k) ? `${n} draussen` : n);
    const html = `<h2 id="v59-ov-h" tabindex="-1">Training hinzufügen</h2><p class="sub">${esc(tagText(ds))} · Sportart wählen</p>
      <ul class="mp-wahl">${V66().SPORTARTEN.map(([k, n]) => [k, name(k, n)]).map(([k, name]) => `<li><button type="button" class="mp-zeile" data-mpsp="${k}">
        <span class="mo-sp" style="--sp:${spFarbe(k.replace("_drinnen", ""))}">${W.sportIcon(k.replace("_drinnen", ""), 18)}</span><b>${esc(name)}</b>${W.icon("weiter", 18)}</button></li>`).join("")}</ul>
      ${window.V77UI ? window.V77UI.wahlZeilen() : ""}
      ${fuss("data-mpz")}`;
    const ov = V59().blatt("mp-neu", html);
    ov.querySelector("[data-mpz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    ov.querySelectorAll("[data-mpsp]").forEach((b) => (b.onclick = () => vorlagenBlatt(ds, b.dataset.mpsp, zurueck)));
    // V7.7 aktivitaet-plan-1.0: Skitour, Wandern, Langlauf, Traillauf – eigenes Blatt (js/v77-ui.js), zurück hierher
    ov.querySelectorAll("[data-akneu]").forEach((b) => (b.onclick = () => window.V77UI.blatt(ds, b.dataset.akneu, () => (zurueck ? zurueck() : V59().schliessen()))));
  };
  function vorlagenBlatt(ds, sp, zurueck) {
    const W = V6(), x = tagVon(ds); if (!x) return;
    const L = V66().vorlagen(sp), basis = sp.replace("_drinnen", "");
    const profil = (v) => {
      const e = V66().einheit({ uid: "x", vorlage: v.id, dauer: v.std, quelle: "eigen" }, x.K.ctxE);
      return e && e.teile && e.teile.length && e.teile[0][0] !== "ohne" && P().profil ? W.profilSVG(P().profil(e), { h: 22 }) : "";
    };
    const gruppen = [];
    for (const [art, name] of Object.entries(V66().ARTEN)) {
      const G = L.filter((v) => v.art === art); if (!G.length) continue;
      gruppen.push(`<h3 class="abschnitt">${esc(name)}</h3><ul class="mp-wahl">${G.map((v) => `<li><button type="button" class="mp-zeile mp-vorlage" data-mpv="${v.id}">
        <span class="mp-vt"><b>${esc(v.titel)}</b><small>${v.fest ? esc(W.dauerText(v.std * 60)) : `${esc(W.dauerText(v.min * 60))} – ${esc(W.dauerText(v.max * 60))}`}</small></span>
        <span class="mp-vp">${profil(v)}</span></button></li>`).join("")}</ul>`);
    }
    const bib = ["rad", "lauf", "schwimm"].includes(basis) && C.D.enduco_bib && C.D.enduco_bib.workouts && Object.keys(C.D.enduco_bib.workouts).length;
    const html = `<h2 id="v59-ov-h" tabindex="-1">${esc((V66().SPORTARTEN.find((s) => s[0] === sp) || [, sp])[1])}</h2><p class="sub">${esc(tagText(ds))} · Vorlage wählen</p>
      ${gruppen.join("")}
      ${bib ? `<h3 class="abschnitt">Aus deiner Enduco-Bibliothek</h3><ul class="mp-wahl"><li><button type="button" class="mp-zeile" data-mpbibl><b>Workout aus der Bibliothek wählen</b>${W.icon("weiter", 18)}</button></li></ul>` : ""}
      <p class="hint">Vorlagen aus den Trainingsmodellen der Seite (${esc(V66().VERSIONS.vorlagen)}); Ziele aus deinem aktiven Zonenprofil. Nach Garmin geht nur, was du mit «An Garmin senden» auslöst; Enduco bleibt unverändert.</p>
      ${fuss("data-mpz")}`;
    const ov = V59().blatt("mp-neu", html);
    ov.querySelector("[data-mpz]").onclick = () => M.hinzufuegen(ds, zurueck);
    ov.querySelectorAll("[data-mpv]").forEach((b) => (b.onclick = () => dauerBlatt(ds, sp, b.dataset.mpv, zurueck)));
    const bb = ov.querySelector("[data-mpbibl]"); if (bb) bb.onclick = () => bibBlatt(ds, sp, zurueck);
  }
  function dauerBlatt(ds, sp, id, zurueck) {
    const W = V6(), x = tagVon(ds); if (!x) return;
    const B = V66().bereich(id), drinnen = sp.endsWith("_drinnen");
    const html = `<h2 id="v59-ov-h" tabindex="-1">${esc((V66().vorlagen(sp).find((v) => v.id === id) || {}).titel || "Training")}</h2><p class="sub">${esc(tagText(ds))}${drinnen ? " · drinnen" : ""}</p>
      <div class="kv ek-kv mp-kv"><div><b data-mpk="dauer"></b><span>Dauer</span></div><div><b data-mpk="tl"></b><span>TL ≈</span></div><div><b data-mpk="km"></b><span>Distanz ≈</span></div></div>
      <p class="warn-t" data-mpaufbau hidden></p>
      <div class="mp-prof" data-mpprof></div>
      ${B.fest ? `<p class="hint">Feste Dauer.</p>` : `<label class="mp-dauer"><span>Dauer</span><input type="range" min="${B.min}" max="${B.max}" step="5" value="${B.std}" data-mpdauer aria-label="Dauer in Minuten"></label>`}
      <ul class="mo-ablauf" data-mpablauf></ul>
      <p class="hint">TL und Distanz sind Schätzungen aus deinem Zonenprofil (${esc(V66().VERSIONS.tl)}), keine Messung.</p>
      <p class="warn-t" data-mpfehler hidden></p>
      ${fuss("data-mpz", `<button type="button" class="btn primary gross" data-mpok>${W.icon("check", 18)} Speichern</button>`)}`;
    const ov = V59().blatt("mp-neu", html);
    const sl = ov.querySelector("[data-mpdauer]"), k = (n) => ov.querySelector(`[data-mpk="${n}"]`);
    const zeig = () => {
      const d = sl ? +sl.value : B.std;
      const e = V66().einheit({ uid: "x", vorlage: id, dauer: d, quelle: "eigen", drinnen }, x.K.ctxE), S = V66().schaetzung(e, bezug(x.K));
      k("dauer").textContent = W.dauerText(e.dauer * 60);
      k("tl").textContent = isNum(S.tl) ? `${S.vollstaendig ? "" : "mind. "}${S.tl}` : "–";
      k("km").textContent = isNum(S.km) && S.km > 0 ? `${komma(S.km)} km` : "–";
      aufbauZeigen(ov.querySelector("[data-mpaufbau]"), aufbauText(e, ds, S.km));
      ov.querySelector("[data-mpprof]").innerHTML = e.teile && e.teile.length && e.teile[0][0] !== "ohne" && P().profil ? W.profilSVG(P().profil(e), { gross: true, h: 90 }) : "";
      ov.querySelector("[data-mpablauf]").innerHTML = (e.ablauf || []).map((a) => `<li>${esc(a)}</li>`).join("");
    };
    if (sl) sl.oninput = zeig; zeig();
    ov.querySelector("[data-mpz]").onclick = () => vorlagenBlatt(ds, sp, zurueck);
    ov.querySelector("[data-mpok]").onclick = async () => {
      // V7.5 einheit-felder-1.1: «drinnen» nur gespeichert, wenn es von der Indoor-Phase abweicht (draussen in der Phase = false)
      const sport = sp.replace("_drinnen", ""), dw = (sport === "rad" || sport === "lauf") && window.V75UI ? window.V75UI.drinnenFeld(sport, ds, drinnen) : (drinnen || null);
      const f = await aendern(montag(ds), { art: "hinzufuegen", date: ds, einheit: Object.assign({ vorlage: id, dauer: sl ? +sl.value : B.std }, dw != null ? { drinnen: dw } : {}) });
      if (f) { const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = false; return; }
      if (zurueck) zurueck(); else V59().schliessen();
    };
  }
  function bibBlatt(ds, sp, zurueck) {
    const W = V6(), basis = sp.replace("_drinnen", "");
    const E = V65() ? V65().eintraege(C.D.enduco_bib, C.D.activities || []).filter((e) => e.sport === basis && isNum(e.dauer_s) && e.dauer_s >= 300) : [];
    const html = `<h2 id="v59-ov-h" tabindex="-1">Aus der Bibliothek</h2><p class="sub">${esc(tagText(ds))} · ${E.length} Workouts mit Dauer</p>
      <input type="search" class="mp-suche" data-mpq placeholder="Titel oder Text suchen" aria-label="Bibliothek durchsuchen">
      <ul class="mp-wahl" data-mpbl></ul>
      <p class="hint">Eingeplant wird nur in «Mein Plan»; das Workout in Enduco und Garmin bleibt unverändert.</p>
      <p class="warn-t" data-mpfehler hidden></p>
      ${fuss("data-mpz")}`;
    const ov = V59().blatt("mp-neu", html);
    const liste = (q) => {
      const n = String(q || "").toLowerCase();
      const L = E.filter((e) => !n || `${e.titel} ${e.text || ""}`.toLowerCase().includes(n)).slice(0, 40);
      ov.querySelector("[data-mpbl]").innerHTML = L.map((e) => `<li><button type="button" class="mp-zeile" data-mpw="${esc(e.wid)}"><span class="mp-vt"><b>${esc(e.titel)}</b><small>${esc(W.dauerText(e.dauer_s))}</small></span>${W.icon("plus", 18)}</button></li>`).join("")
        || `<li class="mp-leer">Nichts gefunden.</li>`;
      ov.querySelectorAll("[data-mpw]").forEach((b) => (b.onclick = async () => {
        const e = E.find((x) => String(x.wid) === b.dataset.mpw); if (!e) return;
        const f = await aendern(montag(ds), { art: "hinzufuegen", date: ds, einheit: { quelle: "bibliothek", wid: +e.wid, sport: basis, titel: e.titel, dauer: Math.max(5, Math.round(e.dauer_s / 60)) } });
        if (f) { const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = false; return; }
        if (zurueck) zurueck(); else V59().schliessen();
      }));
    };
    ov.querySelector("[data-mpq]").oninput = (ev) => liste(ev.target.value); liste("");
    ov.querySelector("[data-mpz]").onclick = () => vorlagenBlatt(ds, sp, zurueck);
  }

  /* ---------- Wochenaktionen ---------- */
  M.wocheAktionen = function (mo, zurueck) {
    if (!bereit()) return;
    const K = kontext(mo); if (!K) return;
    const ganzVorbei = add(mo, 6) < heute();
    const html = `<h2 id="v59-ov-h" tabindex="-1">Woche bearbeiten</h2><p class="sub">KW ${V6().isoWoche(mo)} · ${esc(dkurz(mo))}–${esc(dkurz(add(mo, 6)))}</p>
      ${ganzVorbei ? `<p class="hint">Vergangene Wochen nur lesen.</p>` : `<ul class="mp-wahl">
        <li><button type="button" class="mp-zeile" data-mpwa="anpassen"><span class="mp-vt"><b>Woche anpassen</b><small>Ab heute nach deiner Verfügbarkeit neu verteilen; gesperrte Tage und eigene Einheiten bleiben.</small></span></button></li>
        <li><button type="button" class="mp-zeile" data-mpwa="neu"><span class="mp-vt"><b>Neu berechnen</b><small>Diese und alle folgenden Wochen wieder nach dem Vorschlag (mit deiner Verfügbarkeit); nur gesperrte Tage bleiben.</small></span></button></li>
        <li><button type="button" class="mp-zeile" data-mpwa="verwerfen" ${K.w.bearbeitet ? "" : "disabled"}><span class="mp-vt"><b>Änderungen verwerfen</b><small>Nur diese Woche: ab heute wieder der Vorschlag; gesperrte Tage bleiben.</small></span></button></li>
        <li><button type="button" class="mp-zeile" data-mpwa="leeren"><span class="mp-vt"><b>Woche leeren</b><small>Ab heute alle Tage frei, zum selbst Planen; gesperrte Tage bleiben.</small></span></button></li>
        <li><button type="button" class="mp-zeile" data-mpwgs ${wocheGarminTage(mo, K).length ? "" : "disabled"}><span class="mp-vt"><b>Woche an Garmin senden</b><small>Rad und Laufen ab morgen bis eine Woche voraus, mit dem nächsten Nacht-Update (${esc(V66().VERSIONS.garmin)}).</small></span></button></li></ul>
        <p class="mp-frage" data-mpfrage hidden></p>`}
      ${verteilHTML(mo, K)}
      <p class="hint">Verfügbarkeit je Tag im Tagesblatt (${esc(V66().VERSIONS.verfuegbarkeit)}). Enduco und Garmin bleiben unverändert.</p>
      <p class="warn-t" data-mpfehler hidden></p>
      ${fuss("data-x")}`;
    const ov = V59().blatt("mp-woche", html);
    if (zurueck) ov.querySelectorAll("[data-x]").forEach((b) => (b.onclick = zurueck));
    const wg = ov.querySelector("[data-mpwgs]");
    if (wg) wg.onclick = async () => {
      const T = wocheGarminTage(mo, K); let f = null;
      for (const d of T) { f = await garminAuftragSpeichern(d, "senden"); if (f) break; }
      const p = ov.querySelector("[data-mpfrage]");
      if (f) { const q = ov.querySelector("[data-mpfehler]"); q.textContent = f; q.hidden = false; }
      else if (p) { p.textContent = `${T.length} ${T.length === 1 ? "Tag wird" : "Tage werden"} mit dem nächsten Nacht-Update an Garmin gesendet.`; p.hidden = false; }
    };
    let offen = null;
    ov.querySelectorAll("[data-mpwa]").forEach((b) => (b.onclick = async () => {
      const art = b.dataset.mpwa, frage = ov.querySelector("[data-mpfrage]");
      const FRAGE = { leeren: "Alle künftigen Tage der Woche leeren?", verwerfen: "Alle Änderungen dieser Woche ab heute verwerfen?", anpassen: "Den Rest der Woche nach deiner Verfügbarkeit neu verteilen?",
        neu: "Diese und alle folgenden Wochen neu berechnen? Eigene Einheiten an nicht gesperrten Tagen fallen weg." };
      if (offen !== art) { offen = art; frage.innerHTML = `${FRAGE[art]} <button type="button" class="btn primary" data-mpja>Ja</button>`; frage.hidden = false;
        frage.querySelector("[data-mpja]").onclick = async () => { const f = art === "neu" ? await neuAlle(mo) : await aendern(mo, { art }); if (f) { const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = false; } else if (zurueck) zurueck(); else V59().schliessen(); }; return; }
    }));
  };

  /** V7.2: was die Verfügbarkeit in dieser Woche bewirkt hat (automatisch verteilt oder zuletzt angepasst/neu berechnet). */
  function verteilHTML(mo, K) {
    const E = P().planEintrag ? P().planEintrag(mo) : null;
    const L = E && E.ganz ? (E.verteilung && E.verteilung.meldungen) || [] : K.w.verteilung ? V66().verteilText(K.w.verteilung) : [];
    if (!L.length) return "";
    const titel = E && E.ganz ? (E.verteilung && E.verteilung.art === "neu" ? "Zuletzt neu berechnet" : "Zuletzt angepasst") : "Nach deiner Verfügbarkeit verteilt";
    return `<details class="kw-vt"><summary class="hint">${esc(titel)}: ${L.length} ${L.length === 1 ? "Meldung" : "Meldungen"}</summary><ul class="mo-ablauf">${L.slice(0, 12).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
  }
  /** Tage einer Woche, die sich senden lassen (morgen bis eine Woche voraus, mit sendbaren Einheiten oder schon gesendeten). */
  function wocheGarminTage(mo, K) {
    return K.w.tage.filter((t) => garminFenster(t.date) && !(t.date === add(heute(), 1) && nachtGelaufen()) && (!t.rennen && t.einheiten.some((e) => !V66().garminGrund(e))
      || gesendet().some((g) => g && g.date === t.date && !g.entfernt))).map((t) => t.date);
  }

  /* ---------- Kalender: Wochenansicht (kalender-2.0) ---------- */
  function istWoche(mo) { const bis = add(mo, 6); return (C.D.activities || []).filter((a) => a && a.date >= mo && a.date <= bis); }
  M.istWoche = (mo) => (bereit() ? istWoche(mo) : []);                                  // V7.8 kalender-4.0 (js/v78-ui.js)
  function wochenKopf(mo, K) {
    const art = M.wochenart(mo), alle = istWoche(mo), ist = alle.filter((a) => ["rad", "lauf", "schwimm"].includes(a.sport));
    // Stunden nur Schwimmen, Rad, Laufen; TL wie Fitness (pmc-2.1: alles ausser Krafttraining) – so vergleichbar mit der Plan-TL, die Aktivitäten draussen enthält (V7.9).
    // V8.0: Bewegungszeit wie die Wochenauswertung darunter, die Plan-Übersicht und der Planvergleich (zeit-1.1; bis V7.10 hier die Timer-Zeit)
    const istMin = ist.reduce((s, a) => s + (isNum(a.mv) ? a.mv : a.dur || a.dauer_s || 0) / 60, 0), istTl = alle.filter((a) => !window.FK || !window.FK.zaehlt || window.FK.zaehlt(a)).reduce((s, a) => s + (isNum(a.tss) ? a.tss : 0), 0);
    let planMin = 0, planTl = 0, tlOffen = false; const BZ = bezug(K);
    for (const t of K.w.tage) for (const e of t.einheiten) if (["rad", "lauf", "schwimm"].includes(e.sport) || e.art === "draussen") { if (e.art !== "draussen") planMin += e.dauer; const S = V66().schaetzung(e, BZ); if (isNum(S.tl)) planTl += S.tl; else tlOffen = true; }
    return { art, istMin, istTl, planMin, planTl: Math.round(planTl), tlOffen };
  }
  M.wochenKopf = (mo, K) => (bereit() ? wochenKopf(mo, K) : null);                                       // V7.8 kalender-4.0
  M.wochenart = function (mo) {
    try { const S = AN().saison(heute(), V6().rennenPrio(C.races ? C.races() : [])); if (!S) return null; return V66().wochenart(S.alle || S.wochen).get(mo) || null; }
    catch (e) { return null; }
  };
  /** V7 kalender-3.0 (Vorlage enduco): Woche = Tagesleiste, Wochenauswertung (Mein Plan gegenüber absolviert, je Sportart, Zeit in Zonen,
      Trainingslast) und die Tage als Liste mit erledigten Garmin-Aktivitäten und den Einheiten von Mein Plan. Enduco erscheint hier nicht
      (es bleibt gespeichert und zählt unter Analyse → Planvergleich). */
  M.wocheHTML = function (mo, opt) {
    if (!bereit()) return "";
    const K = kontext(mo); if (!K) return `<p class="warn-t">Plan dieser Woche nicht berechenbar.</p>`;
    const W = V6(), X = window.V7, h = heute(), ist = istWoche(mo);
    const gilt = !window.V7UI || window.V7UI.planGilt(mo);          // frühere Wochen ohne gespeicherten Plan: nur Absolviertes
    if (!gilt) K.w = Object.assign({}, K.w, { tage: K.w.tage.map((t) => Object.assign({}, t, { einheiten: [], gesperrt: false })) });
    const k = wochenKopf(mo, K);
    const MP = []; for (const t of K.w.tage) if (!t.rennen) for (const e of t.einheiten) MP.push({ date: t.date, sport: e.sport, dur_s: e.dauer * 60 });
    const tageZ = X ? X.wocheTage(ist, MP, mo, h) : [];
    const leiste = tageZ.map((t) => `<button type="button" class="wl-tag${t.heute ? " heute" : ""}" data-kwtag="${t.iso}" aria-label="${esc(tagText(t.iso))}: Tagesblatt öffnen">
        <span class="wl-wt">${t.wt}</span><span class="wl-d">${+t.iso.slice(8)}</span>
        <span class="wl-sp">${t.zeichen.slice(0, 3).map((z) => `<i class="${z.art}" style="--sp:${spFarbe(z.sport)}">${W.sportIcon(z.sport, 14)}</i>`).join("")}${t.zeichen.length > 3 ? `<small>+${t.zeichen.length - 3}</small>` : ""}</span></button>`).join("");
    // Wochenauswertung
    const SP3 = ["schwimm", "rad", "lauf"], sek = (x) => (isNum(x.mv) ? x.mv : x.dur || 0);
    const planSp = { schwimm: 0, rad: 0, lauf: 0 }, istSp = { schwimm: 0, rad: 0, lauf: 0 };
    for (const p of MP) if (planSp[p.sport] != null) planSp[p.sport] += p.dur_s;
    for (const a of ist) if (istSp[a.sport] != null) istSp[a.sport] += sek(a);
    const planS = SP3.reduce((s2, x) => s2 + planSp[x], 0), istS = SP3.reduce((s2, x) => s2 + istSp[x], 0), maxS = Math.max(planS, istS, 1);
    // V7.6.1 (Silas' Wunsch vom 17.11.2026): Krafttraining als eigene Zeile – geplant aus Mein Plan, erledigt = Garmin-Krafttraining (V6.sportVon)
    const kraftIst = ist.filter((a) => (W.sportVon ? W.sportVon(a) : a.sport) === "kraft");
    const kraftZ = { plan: MP.filter((p) => p.sport === "kraft").length, ist: kraftIst.length, s: kraftIst.reduce((s2, a) => s2 + sek(a), 0) };
    const z5 = [0, 0, 0, 0, 0]; let zOhne = 0;
    for (const a of ist) {
      if (a.sport !== "rad" && a.sport !== "lauf") continue;
      const g = X && window.FK ? X.pulsGrenzen(window.FK.activeProfile(C.D.zonen, a.date), a.sport) : null, z = g && Array.isArray(a.hh) ? X.histZonen(a.hh, g) : null;
      if (z) z.forEach((v, i) => (z5[i] += v)); else zOhne += sek(a);
    }
    const z3 = X ? X.drei(z5) : [0, 0, 0], p3 = X ? X.prozent(z3) : null;
    const stapel = (obj, max, rand) => `<span class="kw-stapel${rand ? " rand" : ""}" style="width:${Math.max(2, (100 * SP3.reduce((s2, x) => s2 + obj[x], 0)) / max).toFixed(1)}%">${SP3.map((x) => (obj[x] > 0 ? `<i style="flex:${obj[x]};--sp:${spFarbe(x)}"></i>` : "")).join("")}</span>`;
    const tl = `${k.planTl || "–"} / ${Math.round(k.istTl) || "–"}`;
    const ausw = `<div class="card kw-ausw">
        <div class="kw-ausw-k"><div>${k.art ? `<span class="pl-tag${k.art.art === "erholung" ? " erh" : ""}">${esc(k.art.text)}</span>` : ""}<b>${esc(K.w.phase || "Woche")}</b>${K.w.bearbeitet ? `<small> · bearbeitet</small>` : ""}</div>
          <button type="button" class="btn rp-ib" data-kwakt aria-label="Woche bearbeiten">${W.icon("mehr", 20)}</button></div>
        ${gilt ? "" : `<p class="hint">Für diese Woche war kein eigener Plan gespeichert – gezeigt wird, was du absolviert hast.</p>`}
        <div class="v7-k-zahlen"><div><b>${gilt ? hm(planS / 60) + " h" : "–"}</b><span>Mein Plan</span></div><div><b>${hm(istS / 60)} h</b><span>absolviert</span></div><div><b>${esc(tl)}</b><span>TL ${k.tlOffen ? "mind. " : "≈ "}Plan / Ist</span></div></div>
        <div class="kw-st"><span>geplant</span>${stapel(planSp, maxS, true)}</div>
        <div class="kw-st"><span>absolviert</span>${stapel(istSp, maxS, false)}</div>
        <p class="kw-leg">${SP3.map((x) => `<i style="background:${spFarbe(x)}"></i>${x === "schwimm" ? "Schwimmen" : x === "rad" ? "Rad" : "Laufen"} ${hm(istSp[x] / 60)}<small>/${hm(planSp[x] / 60)}</small>`).join(" ")}</p>
        ${kraftZ.plan || kraftZ.ist ? `<p class="kw-leg kw-kraft">${W.icon("kraft", 14)}Krafttraining ${kraftZ.ist}${gilt ? `<small>/${kraftZ.plan}</small>` : ""}${kraftZ.s ? ` · ${esc(W.dauerText(kraftZ.s))}` : ""} <small>– Zusatz, nicht in Stunden, TL und Form</small></p>` : ""}
        ${p3 ? `<div class="kw-st"><span>Zonen</span><span class="v7-stapel">${z5.map((v, i) => (v > 0 ? `<i style="flex:${v};background:var(--zc-z${i + 1})"></i>` : "")).join("")}</span></div>
          <p class="kw-leg">Rad und Laufen nach Puls: ${p3[0]} % unter LT1 · ${p3[1]} % LT1–LT2 · ${p3[2]} % über LT2${zOhne > 0 ? ` · ${esc(W.dauerText(zOhne))} ohne Puls` : ""}</p>` : ""}
      </div>`;
    const tests = (C.tests ? C.tests() : []).filter((t) => t && t.date >= mo && t.date <= add(mo, 6));
    const NAME = { stufentest: "Stufentest", check: "Laktat-Kurzcheck", css: "CSS-Test" };
    const vfZeile = (d) => { if (d < h || !K.verf) return ""; const v = K.verf(d); return v ? `<p class="kw-vf">verfügbar: ${esc(V66().vfText(v))}</p>` : ""; };
    const tage = K.w.tage.map((t) => {
      const ia = ist.filter((a) => a.date === t.date), tt = tests.filter((x) => x.date === t.date);
      const done = ia.map((a) => `<button type="button" class="kw-akt" data-ex="${esc(a.id)}" aria-label="${esc(a.name || "Aktivität")} analysieren"><span class="mo-sp voll" style="--sp:${spFarbe(a.sport)}">${W.sportIcon(a.sport, 15)}</span>
          <span class="mo-et"><b>${esc(a.name || "Aktivität")}</b><small>${esc(W.dauerText(sek(a)))}${isNum(a.km) && a.km > 0 ? ` · ${komma(Math.round(a.km * 10) / 10)} km` : ""}${isNum(a.tss) && a.tss > 0 ? ` · TL ${Math.round(a.tss)}` : ""}</small></span><span class="kw-ok">${W.icon("check", 14)}</span></button>`).join("");
      // V9.1 zusammen-1.0 (erledigt, V7.6: Garmin-Krafttraining = kraft): eine Aktivität derselben Sportart am selben Tag ersetzt die geplante Einheit (die Aktivität steht oben mit Haken)
      const Z = window.V91 ? window.V91.zuordnen(t.einheiten, ia, { sportVon: V6().sportVon }) : null;
      const meins = t.rennen ? `<p class="mp-leer">${W.icon("flagge", 15)} ${esc(t.rennen.name)}</p>` : (Z ? Z.offen : t.einheiten).map((e) => karte(e, K, t.date)).join("");
      const tx = tt.map((x) => `<p class="kw-test"><i class="c-test"></i>${esc(NAME[x.kind] || x.kind)}${x.done ? " ✓" : x.status === "vorschlag" ? " (Vorschlag)" : ""}</p>`).join("");
      return `<li class="kw-tag${t.date === h ? " heute" : ""}${t.gesperrt ? " gesperrt" : ""}${t.date < h ? " vorbei" : ""}">
        <button type="button" class="kw-tk" data-kwtag="${t.date}" aria-label="${esc(tagText(t.date))}${t.gesperrt ? ", gesperrt" : ""}: Tagesblatt öffnen"><b>${wt(t.date)}</b><small>${esc(dkurz(t.date))}</small>${t.gesperrt ? W.icon("schloss", 13) : ""}</button>
        <div class="kw-inh">${window.V74UI && gilt ? window.V74UI.kurz(t) : ""}${done}${meins}${tx}${!done && !meins && !tx ? `<p class="mp-leer">${t.gesperrt ? "gesperrt" : esc(t.notiz || "frei")}</p>` : ""}${vfZeile(t.date)}</div></li>`;
    }).join("");
    if (opt && opt.nurAuswertung) return `${ausw}${gilt && mo >= montag(h) ? verteilHTML(mo, K) : ""}`;      // V7.9 zyklus-1.0: Auswertung unter den vier Karten
    return `<div class="wl kw-leiste" role="group" aria-label="Tage der Woche">${leiste}</div>${ausw}${gilt && mo >= montag(h) ? verteilHTML(mo, K) : ""}
      <ol class="kw-tage">${tage}</ol>
      <p class="hint">Mein Plan = Wochenvorschlag mit deinen Änderungen (${esc(V66().VERSIONS.eigenplan)}); Tag antippen für Training hinzufügen, sperren oder ändern. Absolviert = Bewegungszeit laut Garmin, TL ≈ aus deinem Zonenprofil (${esc(window.V7 ? window.V7.VERSIONS.kalender : "")}).</p>`;
  };
  M.wocheBinden = function (box, mo, neu) {
    box.querySelectorAll("[data-kwtag]").forEach((b) => (b.onclick = () => window.APP && window.APP.tagBlatt && window.APP.tagBlatt(b.dataset.kwtag)));
    box.querySelectorAll("[data-mpe]").forEach((b) => { const ds = b.closest(".kw-tag").querySelector("[data-kwtag]").dataset.kwtag; b.onclick = () => M.einheit(ds, b.dataset.mpe, { zurueck: () => { V59().schliessen(); if (neu) neu(); } }); });
    const a = box.querySelector("[data-kwakt]"); if (a) a.onclick = () => M.wocheAktionen(mo, null);
  };

  /* ---------- Plan: Wochenblatt (wochenblatt-1.0) ---------- */
  M.wochenblatt = function (mo) {
    if (!bereit()) return;
    const K = kontext(mo); if (!K) return;
    const W = V6(), k = wochenKopf(mo, K);
    const schl = []; for (const t of K.w.tage) for (const e of t.einheiten) if (e.schluessel || e.art === "test") schl.push(`${wt(t.date)} ${esc(e.titel)}`);
    const sp = { schwimm: 0, rad: 0, lauf: 0 }; for (const t of K.w.tage) for (const e of t.einheiten) if (sp[e.sport] != null) sp[e.sport] += e.dauer;
    const html = `<h2 id="v59-ov-h" tabindex="-1">KW ${W.isoWoche(mo)} · ${esc(dkurz(mo))}–${esc(dkurz(add(mo, 6)))}</h2>
      <p class="sub">${esc(K.w.phase || "")}${k.art ? " · " + esc(k.art.text) : ""} · Modell «${esc(K.w.modellName || "")}»${K.w.bearbeitet ? " · bearbeitet" : ""}</p>
      <div class="kv ek-kv"><div><b>${hm(k.planMin)} h</b><span>Mein Plan</span></div><div><b>${hm(k.istMin)} h</b><span>absolviert</span></div>
        <div><b>${k.planTl ? (k.tlOffen ? "mind. " : "") + k.planTl : "–"}</b><span>TL ≈ geplant</span></div><div><b>${Math.round(k.istTl) || "–"}</b><span>TL absolviert</span></div></div>
      <p class="mp-sp">Schwimmen ${hm(sp.schwimm)} h · Rad ${hm(sp.rad)} h · Laufen ${hm(sp.lauf)} h</p>
      ${schl.length ? `<h3 class="abschnitt">Schlüsseleinheiten und Tests</h3><ul class="mo-ablauf">${schl.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
      <p class="hint">Wochenart aus der Saisonplanung (3:1-Rhythmus, ${esc(V66().VERSIONS.wochenblatt)}); TL ≈ aus deinem Zonenprofil (${esc(V66().VERSIONS.tl)}), absolviert = Trainingslast laut Garmin.</p>
      ${fuss("data-x", `<button type="button" class="btn primary gross" data-mpkal>${W.icon("kalender", 18)} Im Kalender öffnen</button>`)}`;
    const ov = V59().blatt("mp-wochenblatt", html);
    ov.querySelector("[data-mpkal]").onclick = () => { V59().schliessen(); if (window.APP && window.APP.kalenderListe) window.APP.kalenderListe(mo); else if (window.APP && window.APP.kalenderWoche) window.APP.kalenderWoche(mo); };   // V7.9: Tage in der Liste
  };
})();
