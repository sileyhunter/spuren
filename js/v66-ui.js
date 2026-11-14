/* Ironman Notebook V6.6 – Etappe 6, Oberfläche «Mein Plan» (Auftrag docs/auftrag-etappen-6-8.md; eigenplan-1.0, vorlagen-1.0, tl-plan-1.0,
   wochenblatt-1.0, kalender-2.0): Abschnitt «Mein Plan» im Tagesblatt mit «Training hinzufügen» und «Tag sperren», Einheit ändern, verschieben
   oder entfernen, Wochenaktionen, Kalender-Wochenansicht und Wochenblatt im Plan. Gespeichert wird verschlüsselt über «Direkt speichern»
   (Eingabe planwoche → plan_woche). Aufbau und Bedienung nach dem Vorbild enduco, Texte eigen.
   garmin-senden-1.0 (6.7, Entscheid E3): «An Garmin senden» je Tag oder Woche (bis eine Woche voraus) und «am Vortag um 23 Uhr automatisch» legen
   einen Auftrag mit Momentaufnahme an (Eingabe garmin_senden → garmin_auftraege); gesendet wird im Nacht-Update (tools/garmin_senden.py).
   Die Seite selbst schreibt nie nach Garmin; Enduco wird nie geändert. */
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
  const istAenderbar = (ds, t) => ds >= heute() && !(t && t.gesperrt);
  const neuZeichnen = () => { try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); } };
  /** aufbau-1.1: Hinweis zu einem Lauf an einem Tag (V66.aufbauHinweis) – gemeldet, nicht verhindert. */
  const aufbauText = (e, ds, km) => { try { return ds >= heute() ? V66().aufbauHinweis(e, ds, km, V64().laeufe(C.D.activities), heute()) : null; } catch (err) { console.error(err); return null; } };
  const aufbauZeigen = (p, text) => { if (p) { p.textContent = text ? "Aufbau: " + text : ""; p.hidden = !text; } };

  /* ---------- An Garmin senden (garmin-senden-1.0) ---------- */
  const skalen = () => (TR() && C ? TR().zonen(C.D.zonen).skalen : null);
  const gesendet = () => (C && Array.isArray(C.D.plan_garmin) ? C.D.plan_garmin : []);
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
  /** Auftrag für einen Tag neu anlegen (Momentaufnahme der Einheiten von Mein Plan). */
  async function garminAuftragSpeichern(ds, modus) {
    const x = tagVon(ds); if (!x) return "Tag nicht berechenbar";
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.garmin_senden)) I.data.garmin_senden = [];
    await I.upsert("garmin_senden", V66().garminAuftrag(ds, x.t.rennen ? [] : x.t.einheiten, skalen(), modus, new Date().toISOString()));
    neuZeichnen();
    return null;
  }
  /** Nach einer Änderung: offene Aufträge der betroffenen Tage mit der neuen Fassung erneuern (gleicher Modus). */
  async function auftraegeNachfuehren(tage) {
    for (const d of tage) { const A = auftrag(d); if (istAktiv(A) && garminFenster(d)) await garminAuftragSpeichern(d, A.a.modus); }
  }
  M.auftrag = auftrag;

  /** Eine Änderung anwenden (V66.aendern) und über «Direkt speichern» sichern; → Fehlertext oder null. */
  async function aendern(mo, a) {
    if (!bereit()) return "Seite noch nicht bereit";
    const K = kontext(mo); if (!K) return "Plan dieser Woche nicht berechenbar";
    const vorschlag = (d) => ((K.w0 || K.w).tage.find((t) => t.date === d) || { einheiten: [] }).einheiten;
    const r = V66().aendern(P().planEintrag(mo), a, { heute: heute(), montag: mo, vorschlag });
    if (r.fehler) return r.fehler;
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.planwoche)) I.data.planwoche = [];
    await I.upsert("planwoche", r.eintrag);
    const tage = a.date ? [a.date].concat(a.nach ? [a.nach] : []) : Array.from({ length: 7 }, (_, i) => add(mo, i));
    try { await auftraegeNachfuehren(tage.filter((d) => d >= heute())); } catch (e) { console.error(e); }
    neuZeichnen();
    return null;
  }
  M.aendern = aendern;

  /* ---------- Karten ---------- */
  const STAND_WORT = { gesendet: "in Garmin", geaendert: "in Garmin, geändert", wartet: "wird gesendet" };
  function karte(e, K, ds) {
    const W = V6(), S = V66().schaetzung(e, bezug(K)), hk = e.teile && e.teile.length && P().hauptKey ? P().hauptKey(e) : null;
    let st = null; try { const A = ds ? auftrag(ds) : null; st = ds ? V66().garminStand(e, ds, skalen(), gesendet(), A && (A.lokal ? Object.assign({ status: "offen" }, A.a) : A.a)) : null; } catch (err) { console.error(err); }
    const teile = [W.dauerText(e.dauer * 60), isNum(S.tl) ? `TL ≈ ${S.vollstaendig ? "" : "mind. "}${S.tl}` : "", isNum(S.km) && S.km > 0 ? `≈ ${komma(S.km)} km` : "", st ? STAND_WORT[st] : ""].filter(Boolean);
    const q = e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag";
    return `<button type="button" class="mo-e mp-e${e.quelle === "eigen" ? " eigen" : ""}" data-mpe="${esc(e.uid)}">
      <span class="mo-sp" style="--sp:${spFarbe(e.sport)}">${W.sportIcon(e.sport, 16)}</span>
      <span class="mo-et"><b>${esc(e.titel)}</b><small>${esc(teile.join(" · "))} · ${q}</small></span>${hk ? P().chip(hk) : ""}</button>`;
  }
  /** Abschnitt «Mein Plan» im Tagesblatt (Einheiten, Sperre, Aktionen). */
  M.tagSektion = function (ds) {
    if (!bereit()) return "";
    if (window.V7UI && !window.V7UI.planGilt(montag(ds))) return "";      // V7: frühere Wochen ohne gespeicherten Plan zeigen keinen nachgerechneten Vorschlag
    const x = tagVon(ds); if (!x) return "";
    const { K, t } = x, W = V6();
    const karten = t.rennen ? `<p class="mp-leer">${W.icon("flagge", 16)} ${esc(t.rennen.name)}</p>`
      : t.einheiten.length ? t.einheiten.map((e) => karte(e, K, ds)).join("") : `<p class="mp-leer">${esc(t.notiz || "frei")}</p>`;
    const status = t.gesperrt ? `<span class="mp-tag">${W.icon("schloss", 13)}gesperrt</span>` : t.bearbeitet ? `<span class="mp-tag">bearbeitet</span>` : "";
    const mo = montag(ds), art = M.wochenart(mo);
    const woche = `<p class="sub mp-wo">KW ${W.isoWoche(mo)}${K.w.phase ? " · " + esc(K.w.phase) : ""}${art ? " · " + esc(art.text) : ""}</p>`;
    const aufbau = t.einheiten.filter((e) => e.sport === "lauf").map((e) => aufbauText(e, ds, V66().schaetzung(e, bezug(K)).km)).filter(Boolean)
      .map((a) => `<p class="warn-t">Aufbau: ${esc(a)}</p>`).join("");
    const akt = ds < heute() ? `<p class="hint">Vergangene Tage nur lesen.</p>`
      : `<div class="row mp-akt">${t.gesperrt ? "" : `<button type="button" class="btn primary" data-mpadd>${W.icon("plus", 16)} Training hinzufügen</button>`}
         <button type="button" class="btn" data-mplock aria-pressed="${t.gesperrt}">${W.icon("schloss", 15)} ${t.gesperrt ? "Entsperren" : "Tag sperren"}</button></div>
         ${t.gesperrt ? `<p class="hint">Gesperrt: nicht bearbeitbar, «Woche leeren» und «Änderungen verwerfen» lassen ihn stehen.</p>` : ""}`;
    return `${woche}<h3 class="abschnitt mp-kopf">Mein Plan ${status}</h3><div class="mp-liste">${karten}</div>${aufbau}${akt}${garminHTML(ds, t)}<p class="warn-t" data-mpfehler hidden></p>`;
  };
  /** Abschnitt «Garmin» im Tagesblatt: Stand des Auftrags, «An Garmin senden», «am Vortag um 23 Uhr automatisch». */
  function garminHTML(ds, t) {
    if (ds < heute()) return "";
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
      <p class="hint">${esc(V66().VERSIONS.garmin)}: Rad und Laufen als Workout mit Zielen aus deinem Zonenprofil (Name «IN · »), Bibliotheks-Workouts nur eingeplant; aufs Gerät kommen sie beim Synchronisieren (Fenix, Edge nur Rad). Gesendet wird im Nacht-Update; geänderte Einheiten werden ersetzt, Enduco bleibt unberührt.</p>`;
  }
  /** Knöpfe des Abschnitts binden; zurueck() öffnet das Tagesblatt wieder (nach einer Änderung oder aus einem Unterblatt). */
  M.binden = function (ov, ds, zurueck) {
    const fehler = (f) => { const p = ov.querySelector("[data-mpfehler]"); if (p) { p.textContent = f; p.hidden = !f; } };
    ov.querySelectorAll("[data-mpe]").forEach((b) => (b.onclick = () => M.einheit(ds, b.dataset.mpe, { zurueck })));
    ov.querySelectorAll("[data-mpadd]").forEach((b) => (b.onclick = () => M.hinzufuegen(ds, zurueck)));
    ov.querySelectorAll("[data-mplock]").forEach((b) => (b.onclick = async () => {
      const x = tagVon(ds); if (!x) return;
      const f = await aendern(montag(ds), { art: x.t.gesperrt ? "entsperren" : "sperren", date: ds });
      if (f) fehler(f); else if (zurueck) zurueck();
    }));
    ov.querySelectorAll("[data-mpgs]").forEach((b) => (b.onclick = async () => {        // garmin-senden-1.0: von Hand (nächstes Nacht-Update)
      const f = await garminAuftragSpeichern(ds, "senden");
      if (f) fehler(f); else if (zurueck) zurueck();
    }));
    ov.querySelectorAll("[data-mpgsauto]").forEach((c) => (c.onchange = async () => {   // garmin-senden-1.0: automatisch am Vortag ab 23 Uhr
      const f = await garminAuftragSpeichern(ds, c.checked ? "auto" : "aus");
      if (f) fehler(f); else if (zurueck) zurueck();
    }));
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
    const html = `<h2 id="v59-ov-h" tabindex="-1">Training hinzufügen</h2><p class="sub">${esc(tagText(ds))} · Sportart wählen</p>
      <ul class="mp-wahl">${V66().SPORTARTEN.map(([k, name]) => `<li><button type="button" class="mp-zeile" data-mpsp="${k}">
        <span class="mo-sp" style="--sp:${spFarbe(k.replace("_drinnen", ""))}">${W.sportIcon(k.replace("_drinnen", ""), 18)}</span><b>${esc(name)}</b>${W.icon("weiter", 18)}</button></li>`).join("")}</ul>
      ${fuss("data-mpz")}`;
    const ov = V59().blatt("mp-neu", html);
    ov.querySelector("[data-mpz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    ov.querySelectorAll("[data-mpsp]").forEach((b) => (b.onclick = () => vorlagenBlatt(ds, b.dataset.mpsp, zurueck)));
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
      const f = await aendern(montag(ds), { art: "hinzufuegen", date: ds, einheit: { vorlage: id, dauer: sl ? +sl.value : B.std, drinnen: drinnen || undefined } });
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
        <li><button type="button" class="mp-zeile" data-mpwa="verwerfen" ${K.w.bearbeitet ? "" : "disabled"}><span class="mp-vt"><b>Änderungen verwerfen</b><small>Ab heute wieder der Vorschlag; gesperrte Tage bleiben.</small></span></button></li>
        <li><button type="button" class="mp-zeile" data-mpwa="leeren"><span class="mp-vt"><b>Woche leeren</b><small>Ab heute alle Tage frei, zum selbst Planen; gesperrte Tage bleiben.</small></span></button></li>
        <li><button type="button" class="mp-zeile" data-mpwgs ${wocheGarminTage(mo, K).length ? "" : "disabled"}><span class="mp-vt"><b>Woche an Garmin senden</b><small>Rad und Laufen ab morgen bis eine Woche voraus, mit dem nächsten Nacht-Update (${esc(V66().VERSIONS.garmin)}).</small></span></button></li></ul>
        <p class="mp-frage" data-mpfrage hidden></p>`}
      <p class="hint">Rest der Woche neu planen (verpasste Einheiten neu verteilen) folgt mit wochenplan-1.3. Enduco bleibt unverändert.</p>
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
      if (offen !== art) { offen = art; frage.innerHTML = `${art === "leeren" ? "Alle künftigen Tage der Woche leeren?" : "Alle Änderungen ab heute verwerfen?"} <button type="button" class="btn primary" data-mpja>Ja</button>`; frage.hidden = false;
        frage.querySelector("[data-mpja]").onclick = async () => { const f = await aendern(mo, { art }); if (f) { const p = ov.querySelector("[data-mpfehler]"); p.textContent = f; p.hidden = false; } else if (zurueck) zurueck(); else V59().schliessen(); }; return; }
    }));
  };

  /** Tage einer Woche, die sich senden lassen (morgen bis eine Woche voraus, mit sendbaren Einheiten oder schon gesendeten). */
  function wocheGarminTage(mo, K) {
    return K.w.tage.filter((t) => garminFenster(t.date) && !(t.date === add(heute(), 1) && nachtGelaufen()) && (!t.rennen && t.einheiten.some((e) => !V66().garminGrund(e))
      || gesendet().some((g) => g && g.date === t.date && !g.entfernt))).map((t) => t.date);
  }

  /* ---------- Kalender: Wochenansicht (kalender-2.0) ---------- */
  function istWoche(mo) { const bis = add(mo, 6); return (C.D.activities || []).filter((a) => a && a.date >= mo && a.date <= bis); }
  function wochenKopf(mo, K) {
    const art = M.wochenart(mo), ist = istWoche(mo).filter((a) => ["rad", "lauf", "schwimm"].includes(a.sport));
    const istMin = ist.reduce((s, a) => s + (a.dur || a.dauer_s || 0) / 60, 0), istTl = ist.reduce((s, a) => s + (isNum(a.tss) ? a.tss : 0), 0);
    let planMin = 0, planTl = 0, tlOffen = false; const BZ = bezug(K);
    for (const t of K.w.tage) for (const e of t.einheiten) if (["rad", "lauf", "schwimm"].includes(e.sport)) { planMin += e.dauer; const S = V66().schaetzung(e, BZ); if (isNum(S.tl)) planTl += S.tl; else tlOffen = true; }
    return { art, istMin, istTl, planMin, planTl: Math.round(planTl), tlOffen };
  }
  M.wochenart = function (mo) {
    try { const S = AN().saison(heute(), V6().rennenPrio(C.races ? C.races() : [])); if (!S) return null; return V66().wochenart(S.alle || S.wochen).get(mo) || null; }
    catch (e) { return null; }
  };
  /** V7 kalender-3.0 (Vorlage enduco): Woche = Tagesleiste, Wochenauswertung (Mein Plan gegenüber absolviert, je Sportart, Zeit in Zonen,
      Trainingslast) und die Tage als Liste mit erledigten Garmin-Aktivitäten und den Einheiten von Mein Plan. Enduco erscheint hier nicht
      (es bleibt gespeichert und zählt unter Analyse → Planvergleich). */
  M.wocheHTML = function (mo) {
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
        ${p3 ? `<div class="kw-st"><span>Zonen</span><span class="v7-stapel">${z5.map((v, i) => (v > 0 ? `<i style="flex:${v};background:var(--zc-z${i + 1})"></i>` : "")).join("")}</span></div>
          <p class="kw-leg">Rad und Laufen nach Puls: ${p3[0]} % unter LT1 · ${p3[1]} % LT1–LT2 · ${p3[2]} % über LT2${zOhne > 0 ? ` · ${esc(W.dauerText(zOhne))} ohne Puls` : ""}</p>` : ""}
      </div>`;
    const tests = (C.tests ? C.tests() : []).filter((t) => t && t.date >= mo && t.date <= add(mo, 6));
    const NAME = { stufentest: "Stufentest", check: "Laktat-Kurzcheck", css: "CSS-Test" };
    const tage = K.w.tage.map((t) => {
      const ia = ist.filter((a) => a.date === t.date), tt = tests.filter((x) => x.date === t.date);
      const done = ia.map((a) => `<button type="button" class="kw-akt" data-ex="${esc(a.id)}" aria-label="${esc(a.name || "Aktivität")} analysieren"><span class="mo-sp voll" style="--sp:${spFarbe(a.sport)}">${W.sportIcon(a.sport, 15)}</span>
          <span class="mo-et"><b>${esc(a.name || "Aktivität")}</b><small>${esc(W.dauerText(sek(a)))}${isNum(a.km) && a.km > 0 ? ` · ${komma(Math.round(a.km * 10) / 10)} km` : ""}${isNum(a.tss) && a.tss > 0 ? ` · TL ${Math.round(a.tss)}` : ""}</small></span><span class="kw-ok">${W.icon("check", 14)}</span></button>`).join("");
      const frei = ia.map((a) => a.sport);          // erledigt: eine Aktivität derselben Sportart am selben Tag (wie die Tagesleiste)
      const meins = t.rennen ? `<p class="mp-leer">${W.icon("flagge", 15)} ${esc(t.rennen.name)}</p>` : t.einheiten.map((e) => { const j = frei.indexOf(e.sport); if (j >= 0) frei.splice(j, 1);
        const kk = karte(e, K, t.date); return j >= 0 ? kk.replace('class="mo-e mp-e', 'class="mo-e mp-e erl') : kk; }).join("");
      const tx = tt.map((x) => `<p class="kw-test"><i class="c-test"></i>${esc(NAME[x.kind] || x.kind)}${x.done ? " ✓" : x.status === "vorschlag" ? " (Vorschlag)" : ""}</p>`).join("");
      return `<li class="kw-tag${t.date === h ? " heute" : ""}${t.gesperrt ? " gesperrt" : ""}${t.date < h ? " vorbei" : ""}">
        <button type="button" class="kw-tk" data-kwtag="${t.date}" aria-label="${esc(tagText(t.date))}${t.gesperrt ? ", gesperrt" : ""}: Tagesblatt öffnen"><b>${wt(t.date)}</b><small>${esc(dkurz(t.date))}</small>${t.gesperrt ? W.icon("schloss", 13) : ""}</button>
        <div class="kw-inh">${done}${meins}${tx}${!done && !meins && !tx ? `<p class="mp-leer">${t.gesperrt ? "gesperrt" : "frei"}</p>` : ""}</div></li>`;
    }).join("");
    return `<div class="wl kw-leiste" role="group" aria-label="Tage der Woche">${leiste}</div>${ausw}
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
    ov.querySelector("[data-mpkal]").onclick = () => { V59().schliessen(); if (window.APP && window.APP.kalenderWoche) window.APP.kalenderWoche(mo); };
  };
})();
