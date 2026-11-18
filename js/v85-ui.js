/* V8.5 «Modell Automatisch» auf der Seite (automatisch-1.0, js/v85.js): Entscheid je Woche mit den Daten der Seite – Verträglichkeit und Verteilung aus
   «Deine Reaktionen» (js/v82.js) bis zum Sonntag vor dem Block, Ampel der 7 Tage vor dem Montag (gespeicherter Entscheid, sonst wie am Morgen gerechnet)
   und Trainingsstatus zu Beginn des Montags. Je Datenstand zwischengespeichert. Angewendet im Plan-Kontext (js/v64-ui.js), gezeigt unter Plan →
   Trainingsmodell (auch als Vorschau, solange ein anderes Modell gewählt ist). Die Seite schreibt dafür nichts. */
(function () {
  "use strict";
  const U = (window.V85UI = window.V85UI || {});
  const UI = () => window.V5UI, V85 = () => window.V85, V82 = () => window.V82, FK = () => window.FK, V74 = () => window.V74, V74UI = () => window.V74UI,
    V78 = () => window.V78, V64 = () => window.V64, V64UI = () => window.V64UI, V6 = () => window.V6;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && V85()); };
  const add = (iso, n) => V85()._intern.add(iso, n), montag = (iso) => V85()._intern.montag(iso);
  const heute = () => C.iso(C.today);

  /* ---------- Zwischenspeicher je Datenstand ---------- */
  let CACHE = { key: null, reakt: new Map(), tag: new Map(), woche: new Map() };
  function datenKey() {
    let bef = "";
    try { const B = UI().befinden ? UI().befinden() : []; const l = B[B.length - 1]; bef = `${B.length}:${l ? l.date + (l.geaendert || "") : ""}`; } catch (e) { bef = "?"; }
    const lok = ((UI() && UI().Inbox && UI().Inbox.data) || {}).ampel || [];
    return [heute(), (C.D.activities || []).length, (C.D.days || []).length, C.D.updated || "", (C.D.zonen || []).length, (C.D.ampel_anpassung || []).length, lok.length, bef].join("|");
  }
  function frisch() { const k = datenKey(); if (CACHE.key !== k) CACHE = { key: k, reakt: new Map(), tag: new Map(), woche: new Map() }; }

  /** «Deine Reaktionen» bis zum Stichtag (Sonntag): Verträglichkeit und Verteilung (verteilung-1.1 prüft selbst die 4 Einteilungen der Blöcke; die erste an
   *  der Erholungswoche ausgerichtet wie unter Analyse → Deine Reaktionen). */
  function reaktionen(stichtag, anker) {
    const k = stichtag + "|" + (anker || "");
    if (!CACHE.reakt.has(k)) {
      let r = null;
      if (V82()) {
        try { const o = { heute: stichtag, zonen: C.D.zonen, anker: anker || null }; r = { stand: stichtag, vertraeglich: V82().vertraeglich(C.D, o), verteilung: V82().verteilung(C.D, o) }; }
        catch (e) { console.error(e); r = null; }
      }
      CACHE.reakt.set(k, r);
    }
    return CACHE.reakt.get(k);
  }
  /** Entscheid der Ampel an einem vergangenen Tag: gespeichert (was galt), sonst mit den Morgenwerten jenes Tages gerechnet. */
  function tagStatus(d) {
    if (!CACHE.tag.has(d)) {
      let s = null;
      try {
        const g = V74UI() && V74UI().gespeichert ? V74UI().gespeichert(d) : null;
        if (g && g.status) s = g.status;
        else if (FK() && V74()) {
          const r = FK().readiness(C.D.days, C.D.activities, UI().befinden ? UI().befinden() : [], d);
          const x = r ? V74().entscheid(r, { morgenwerte: V74().morgenwerte(C.D.days, d), datum: d }) : null;
          s = !x ? null : r.status === "nicht beurteilbar" && x.status === "wie_geplant" ? null : x.status;     // ohne Werte: ohne Ampel
        }
      } catch (e) { console.error(e); s = null; }
      CACHE.tag.set(d, s);
    }
    return CACHE.tag.get(d);
  }
  /** Ermüdung zu Beginn der Woche mo; kommende Wochen: null (zeigt sich erst am Montag). */
  function ermuedung(mo) {
    if (mo > montag(heute())) return null;
    const tage = [];
    for (let i = 7; i >= 1; i--) { const d = add(mo, -i); tage.push({ date: d, status: tagStatus(d) }); }
    let ratio = null;
    try { const A = FK().pmcMorgen(C.pmc(), mo); ratio = A && V78() ? V78().status(A.fitness, A.ermuedung) : null; } catch (e) { console.error(e); }
    return Object.assign(V85().ermuedung(tage, ratio), { stand: add(mo, -1) });
  }

  /**
   * Entscheid für die Woche o.woche. o = { woche, basis, wechsel, phase, erholung, taper, rennwoche, stunden, sportart, wochen (Saison: [{woche, erholung}]) }.
   * → V85.entscheid(…) mit { stichtag } oder null.
   */
  U.entscheid = function (o) {
    if (!bereit() || !o || !o.woche) return null;
    frisch();
    const k = JSON.stringify([o.woche, o.basis, o.wechsel, o.phase, !!o.erholung, !!o.taper, !!o.rennwoche, o.stunden, o.sportart]);
    if (CACHE.woche.has(k)) return CACHE.woche.get(k);
    let e = null;
    try {
      const W = o.wochen || [], anker = V85().anker(W), st = V85().stichtag(W, o.woche, heute(), anker), start = V85().blockStart(W, o.woche, anker);
      e = V85().entscheid(Object.assign({}, o, { reaktionen: reaktionen(st, anker), ermuedung: ermuedung(o.woche) }));
      e.stichtag = st; e.blockStart = start;
    } catch (err) { console.error(err); e = null; }
    CACHE.woche.set(k, e);
    return e;
  };
  U.leeren = () => { CACHE = { key: null, reakt: new Map(), tag: new Map(), woche: new Map() }; };

  /* ---------- Anzeige unter Plan → Trainingsmodell ---------- */
  const SYM = { bleibt: "=", weniger: "−", pyramidal: "↔", offen: "…" };
  const dkurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  function wocheHTML(titel, e) {
    if (!e) return `<div class="v85-w"><h4 class="mini-h">${esc(titel)}</h4><p class="hint">Nicht berechenbar.</p></div>`;
    return `<div class="v85-w"><h4 class="mini-h">${esc(titel)}</h4><p class="v85-kurz keep"><b>${esc(e.kurz)}</b>${e.abweichung ? ` <em class="v85-ab">anders als «kombiniert»</em>` : ""}</p>
      <ul class="v85-gr">${e.gruende.map((g) => `<li class="v85-g v85-${esc(g.wirkung)}"><span class="v85-s" aria-hidden="true">${esc(SYM[g.wirkung] || "·")}</span><span><b>${esc(g.titel)}.</b> ${esc(g.text)}</span></li>`).join("")}</ul></div>`;
  }
  /** Box mit dem Entscheid dieser und der nächsten Woche. gewaehlt = «Automatisch» ist das gewählte Modell. */
  U.zeichnen = function (box, gewaehlt) {
    if (!box || !bereit() || !V64UI() || !V64UI().kontextFuer) return;
    box.innerHTML = `<p class="hint">«Automatisch» rechnet …</p>`;
    setTimeout(() => {
      try {
        const mo = montag(heute()), K0 = V64UI().kontextFuer(mo), K1 = V64UI().kontextFuer(add(mo, 7));
        const e0 = K0 && (K0.auto || U.entscheid(K0.autoIn)), e1 = K1 && (K1.auto || U.entscheid(K1.autoIn));
        box.innerHTML = `<h3 class="abschnitt">${gewaehlt ? "So entscheidet «Automatisch»" : "Vorschau: so würde «Automatisch» entscheiden"}</h3>
          ${gewaehlt ? "" : `<p class="hint">Du hast ein anderes Modell gewählt; das bleibt, bis du «Automatisch» übernimmst. Gerechnet ist nur die Vorschau.</p>`}
          ${wocheHTML(`Diese Woche (ab ${dkurz(mo)})`, e0)}${wocheHTML(`Nächste Woche (ab ${dkurz(add(mo, 7))})`, e1)}
          <p class="hint">${esc(V85().VERSIONS.automatisch)}: startet bei «kombiniert» und weicht nur ab, wenn eine Regel mit genug Daten greift. Nie mehr als zwei harte Einheiten an Land und nie mehr Stunden –
            gute Erholung allein macht nichts härter. Die Verteilung wechselt nur zu Beginn eines Blocks (nach der Erholungswoche), die Zahl harter Einheiten von Woche zu Woche.
            Deine Intensität je Sportart und deine Änderungen in Mein Plan gelten weiter. Grenzen sind eigene Festlegungen (Wissen, Kapitel «modelle»).</p>`;
      } catch (err) { console.error(err); box.innerHTML = `<p class="hint">Nicht berechenbar.</p>`; }
    }, 0);
  };
})();
