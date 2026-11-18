/* V8.1.1 Oberfläche zu js/verpflegung.js (verpflegung-1.0): Abschnitt «Verpflegung» auf der Einheit-Seite (vorher · während · nachher, Zeitplan, Packliste),
   eine Zeile zur heutigen Einheit auf Heute, Blatt «Produkte wählen» (Planeinstellung «pe-verpflegung») und Blatt «Verpflegung anpassen» je Einheit
   (Eingabe «verpflegung», ID «vp-<Datum>-<uid>»). Gespeichert wird über «Direkt speichern»; nichts davon geht an Garmin oder Enduco. */
(function () {
  "use strict";
  const U = (window.VPUI = window.VPUI || {});
  const UI = () => window.V5UI, VP = () => window.VP, V6 = () => window.V6, V59 = () => window.V59, V64 = () => window.V64, V75 = () => window.V75, P = () => window.V64UI;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const komma = (x) => String(x).replace(".", ",");
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && VP() && V6()); };
  const I = () => (UI() && UI().Inbox && UI().Inbox.data) || {};
  const ic = (k, w) => V6().icon(k, w || 16);
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const min = (hhmm) => (/^\d\d:\d\d$/.test(hhmm || "") ? +hhmm.slice(0, 2) * 60 + +hhmm.slice(3) : null);

  /* ---------------- Daten ---------------- */
  function einstellung() { try { return V75() ? V75().aktuell(C.D.plan_einstellungen || [], I().planeinstellung || [], "pe-verpflegung") : null; } catch (e) { return null; } }
  /** Wie oft ein Produkt im Fueling-Protokoll vorkommt (Name → Anzahl): bevorzugt, was du schon nimmst. */
  function genutzt() {
    const m = new Map();
    for (const f of [...(C.D.fueling || []), ...(I().fueling || [])]) for (const ev of (f && f.events) || []) if (ev && ev.produkt) m.set(ev.produkt, (m.get(ev.produkt) || 0) + 1);
    return m;
  }
  const produkte = () => VP().produkte(C.D, I().fueling_produkte || C.D.fueling_produkte || []);
  U.wahl = () => VP().wahl(produkte(), einstellung(), genutzt());
  /** Gewicht der letzten Morgenmessung bis zum Tag. */
  function gewicht(ds) {
    let best = null;
    for (const w of C.D.weights || []) if (w && isNum(w.kg) && w.date <= ds && (!best || w.date > best.date)) best = w;
    return best ? best.kg : null;
  }
  /** Garmins Schätzung des Schweissverlusts je Stunde Training: Median über Tage mit mindestens 45 min Training (erst ab 5 Tagen). */
  function schweiss() {
    const dauer = new Map();
    for (const a of C.D.activities || []) if (a && a.date) dauer.set(a.date, (dauer.get(a.date) || 0) + (isNum(a.mv) ? a.mv : a.dur || 0));
    const L = [];
    for (const f of C.D.food_logs || []) {
      const s = f && f.hydration ? f.hydration.sweatLossInML : null, h = (dauer.get(f && f.date) || 0) / 3600;
      if (isNum(s) && s > 0 && h >= 0.75) L.push(s / h);
    }
    if (L.length < 5) return null;
    L.sort((a, b) => a - b);
    return L[Math.floor(L.length / 2)];
  }
  const hartLang = (e) => e && (["schluessel", "schluessel_s", "lang", "test"].includes(e.art) || (e.dauer || 0) >= 90 || (e.minuten && (e.minuten.hart || 0) >= 10));
  /** Einheiten eines Tages so, wie sie gelten (Mein Plan mit Ampel). */
  function tagEinheiten(ds) {
    try { const K = P().kontextFuer(V64().montag(ds)), t = K && K.w ? K.w.tage.find((x) => x.date === ds) : null; return t && !t.rennen ? t.einheiten || [] : []; } catch (e) { return []; }
  }
  /** Stunden bis zur nächsten harten oder langen Einheit nach dem Ende dieser (ohne Uhrzeiten: am selben Tag 4 h, am nächsten Tag 16 h – Annahme). */
  function naechste(ds, e) {
    const heuteL = tagEinheiten(ds), i = heuteL.findIndex((x) => x.uid === e.uid), ende = min(e.uhrzeit) != null ? min(e.uhrzeit) + (e.dauer || 0) : null;
    for (const x of heuteL.slice(i + 1)) if (hartLang(x)) return min(x.uhrzeit) != null && ende != null ? Math.max(0, (min(x.uhrzeit) - ende) / 60) : 4;
    for (const x of tagEinheiten(addDays(ds, 1))) if (hartLang(x)) return min(x.uhrzeit) != null && ende != null ? (24 * 60 + min(x.uhrzeit) - ende) / 60 : 16;
    return null;
  }
  /** Empfehlung zu einer Einheit (oder null). */
  U.plan = function (ds, e) {
    if (!bereit() || !e) return null;
    try {
      return VP().plan(e, { W: U.wahl(), kg: gewicht(ds), anpassung: VP().anpassung(C.D.plan_verpflegung || [], I().verpflegung || [], ds, e.uid),
        naechsteStd: naechste(ds, e), schweiss_ml_h: schweiss(), genutzt: new Set(genutzt().keys()) });
    } catch (err) { console.error(err); return null; }
  };

  /** Fueling-Eintrag einer Aktivität (eigener vor dem aus Garmin «fg-…»), ohne «nicht protokolliert». */
  function fuelingVon(a) {
    try {
      const L = UI().merged("fueling", "fueling").filter((f) => f && f.activity_id === a.id && f.status !== "nicht protokolliert");
      return L.find((f) => !String(f.id || "").startsWith("fg-")) || L[0] || null;
    } catch (e) { return null; }
  }
  const sekVon = (a) => (isNum(a.mv) ? a.mv : a.dur);
  /** Nach dem Training: Empfehlung zur geplanten Einheit e gegen das Fueling-Protokoll der Aktivität a. → { R, V (VP.vergleich), T } oder null */
  U.nachher = function (a, e) {
    if (!bereit() || !a || !e) return null;
    const R = U.plan(a.date, e); if (!R) return null;
    const f = fuelingVon(a), T = f && window.FK ? window.FK.fuelingTotals(f, sekVon(a)) : null;
    return { R, V: VP().vergleich(R, T), T };
  };
  /** Darmtraining (VP.darm): lange Einheiten (ab 2 h) der letzten 8 Wochen mit Angabe zum Magen, neueste zuerst. */
  U.darm = function () {
    if (!bereit()) return null;
    try {
      const ab = addDays(C.iso(C.today), -56), akt = new Map((C.D.activities || []).map((a) => [a.id, a]));
      const L = UI().merged("rpe", "rpe").filter((r) => r && r.magen && (r.datum || "") >= ab).map((r) => {
        const a = akt.get(r.act || r.id); if (!a || !(sekVon(a) >= 7200)) return null;
        const f = fuelingVon(a), T = f && window.FK ? window.FK.fuelingTotals(f, sekVon(a)) : null;
        return { datum: r.datum, genommen: T && isNum(T.kh_g_h) ? T.kh_g_h : null, magen: r.magen };
      }).filter(Boolean).sort((x, y) => (x.datum < y.datum ? 1 : x.datum > y.datum ? -1 : 0));
      return VP().darm(L, U.wahl().max_g_h);
    } catch (e) { console.error(e); return null; }
  };

  /* ---------------- Anzeige ---------------- */
  /** Zeile unter der heutigen Einheit auf Heute (nur wenn es etwas zu nehmen gibt). */
  U.zeile = function (ds, e) {
    const R = U.plan(ds, e); if (!R) return "";
    const k = VP().kurz(R);
    if (!k || k === "nichts nötig") return "";
    return `<button type="button" class="vp-zeile" data-v7ek="${esc(ds)}|${esc(e.uid)}">${ic("flasche", 18)}<span><b>Verpflegung</b><small>${esc(k)}</small></span>${ic("weiter", 16)}</button>`;
  };
  /** verpflegung-2.0 (Silas am 18.11.2026: «zu kompliziert – Vorschlag g/h, ich entscheide, wie ich sie aufnehme; kurz und bündig»):
   *  Abschnitt «Verpflegung» auf der Einheit-Seite – g/h und Menge, je eine Zeile vorher und nachher nur, wenn sie etwas ändert. opt.vorbei = nur lesen. */
  U.abschnitt = function (ds, e, opt) {
    const R = U.plan(ds, e); if (!R) return "";
    const K = VP().knapp(R, e, { naechsteStd: naechste(ds, e) }); if (!K) return "";
    const vorbei = !!(opt && opt.vorbei), Z = R.ziel;
    if (!K.waehrend && !K.vorher && !K.nachher) return "";
    const darm = !vorbei && Z.stufe === "ja" && (e.dauer || 0) >= 120 ? U.darm() : null;
    const z = (t, x) => (x ? `<p class="vp-z"><b>${t}</b><span>${esc(x)}</span></p>` : "");
    return `<section class="v73-ab vp-ab" id="vp-ab"><h2 class="abschnitt">${ic("flasche", 15)}Verpflegung${R.angepasst ? `<span class="vp-angepasst">angepasst</span>` : ""}</h2>
      ${K.g_h != null ? `<div class="vp-gross"><b>${K.g_h} g/h</b><span>≈ ${K.gramm} g Kohlenhydrate · ${esc(K.wann)}</span></div>` : z("Während", K.waehrend)}
      ${z("Vorher", K.vorher)}${z("Nachher", K.nachher)}
      ${K.hinweis ? `<p class="hint keep">${esc(K.hinweis)}</p>` : ""}${darm ? `<p class="hint keep">${esc(darm.text)}</p>` : ""}
      <p class="hint">${R.angepasst || /draussen/.test(Z.gruende.join(" ")) ? esc(Z.gruende.filter((g) => /draussen|von dir/.test(g)).join(" · ")) + ". " : ""}Richtwerte nach Jeukendrup 2014 und Thomas et al. 2016; wie du die Kohlenhydrate nimmst, entscheidest du.</p>
      ${vorbei ? "" : `<div class="vp-knoepfe"><button type="button" class="btn" data-vp="anpassen" data-vpds="${esc(ds)}" data-vpuid="${esc(e.uid)}">${ic("regler", 16)} Anpassen</button></div>`}</section>`;
  };

  /* ---------------- Blatt «Verpflegung anpassen» je Einheit ---------------- */
  U.blattAnpassen = function (ds, uid, zurueck) {
    if (!bereit() || !V59()) return;
    const e = tagEinheiten(ds).find((x) => x.uid === uid); if (!e) return;
    const alt = VP().anpassung(C.D.plan_verpflegung || [], I().verpflegung || [], ds, uid);
    const W0 = U.wahl(), ohne = VP().plan(e, { W: W0, kg: gewicht(ds) }), e0 = einstellung();
    const w = { g_h: alt && isNum(alt.g_h) ? alt.g_h : null, aus: !!(alt && alt.aus) };
    let stufe = W0.max_g_h;
    const emp = ohne.ziel.stufe === "ja" ? ohne.ziel.g_h : 0;
    const html = `<div class="blatt-titel">${ic("regler", 34)}<h2 id="v59-ov-h" tabindex="-1">Verpflegung anpassen</h2><p class="sub">${esc(e.titel)} · ${esc(new Date(ds + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" }))}</p></div>
      <h3 class="abschnitt">Diese Einheit</h3>
      <div class="vp-stufe"><button type="button" class="btn" data-vpg="-5" aria-label="weniger">−</button><b data-vpgw></b><button type="button" class="btn" data-vpg="5" aria-label="mehr">+</button></div>
      <p class="hint">Empfehlung: ${emp ? `${emp} g pro Stunde` : "nichts nötig"}.</p>
      <label class="vp-aus"><input type="checkbox" data-vpaus${w.aus ? " checked" : ""}> Diesmal ohne Verpflegung</label>
      <h3 class="abschnitt">Deine Stufe ab 2,5 h</h3>
      <div class="vp-stufe"><button type="button" class="btn" data-vpm="-10" aria-label="weniger">−</button><b data-vpmw>${stufe} g/h</b><button type="button" class="btn" data-vpm="10" aria-label="mehr">+</button></div>
      <p class="hint">Gilt für alle langen Einheiten. Erhöhen, wenn der Magen mitmacht; über 60 g/h nur mit Glukose und Fruktose zusammen.</p>
      <p class="warn-t" data-vpf hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-vpzu aria-label="Zurück">${ic("zurueck", 22)}</button>
        ${alt ? `<button type="button" class="btn" data-vpweg>Zurück auf die Empfehlung</button>` : ""}
        <button type="button" class="btn primary gross" data-vpok>${ic("check", 18)} Speichern</button></div>`;
    const ov = V59().blatt("verpflegung", html), q = (x) => ov.querySelector(x);
    const zeig = () => { q("[data-vpgw]").textContent = w.g_h == null ? `${emp} g/h (Empfehlung)` : `${w.g_h} g/h`; q("[data-vpmw]").textContent = `${stufe} g/h`; };
    ov.querySelectorAll("[data-vpg]").forEach((b) => (b.onclick = () => { w.g_h = Math.max(0, Math.min(120, (w.g_h == null ? emp : w.g_h) + +b.dataset.vpg)); zeig(); }));
    ov.querySelectorAll("[data-vpm]").forEach((b) => (b.onclick = () => { stufe = Math.max(30, Math.min(120, stufe + +b.dataset.vpm)); zeig(); }));
    q("[data-vpaus]").onchange = (ev) => { w.aus = ev.target.checked; };
    const fertig = () => { V59().schliessen(); try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (err) { console.error(err); } try { if (window.V6H && window.V6H.zeichnen) window.V6H.zeichnen(); } catch (err) { console.error(err); } if (zurueck) zurueck(); };
    const speichern = async (x) => {
      const f = q("[data-vpf]"), Inb = UI().Inbox;
      if (!Inb || !Inb.data) { f.textContent = "Speicher auf diesem Gerät nicht verfügbar."; f.hidden = false; return; }
      if (stufe !== W0.max_g_h && V75()) {                     // Stufe ab 2,5 h: «pe-verpflegung» wie bisher, die übrigen Felder bleiben
        const vorher = e0 || {};
        const pe = V75().eintrag("pe-verpflegung", { unterwegs: vorher.unterwegs || [], davor: vorher.davor || [], danach: vorher.danach || [], fruktose: vorher.fruktose || [], max_g_h: stufe }, undefined, e0);
        const fe = V75().pruefen(pe); if (fe) { f.textContent = fe; f.hidden = false; return; }
        if (!Array.isArray(Inb.data.planeinstellung)) Inb.data.planeinstellung = [];
        try { await Inb.upsert("planeinstellung", pe); } catch (err) { console.error(err); f.textContent = "Speichern auf diesem Gerät ging nicht."; f.hidden = false; return; }
      }
      if (x) {
        if (!Array.isArray(Inb.data.verpflegung)) Inb.data.verpflegung = [];
        try { await Inb.upsert("verpflegung", x); } catch (err) { console.error(err); f.textContent = "Speichern auf diesem Gerät ging nicht."; f.hidden = false; return; }
      } else if (stufe === W0.max_g_h) { f.textContent = "Nichts geändert – die Empfehlung gilt."; f.hidden = false; return; }
      fertig();
    };
    const weg = () => ({ id: `vp-${ds}-${uid}`, datum: ds, uid, entfernt: true, v: VP().VERSIONS.verpflegung, geaendert: new Date().toISOString() });
    q("[data-vpok]").onclick = () => speichern(w.aus ? VP().eintrag(ds, uid, { aus: true }) : w.g_h != null && w.g_h !== emp ? VP().eintrag(ds, uid, { g_h: w.g_h }) : alt ? weg() : null);
    if (q("[data-vpweg]")) q("[data-vpweg]").onclick = () => speichern(weg());
    q("[data-vpzu]").onclick = () => { V59().schliessen(); if (zurueck) zurueck(); };
    zeig();
  };

  // Knöpfe im Abschnitt (Einheit-Seite) – ein Klick-Hörer für alle
  document.addEventListener("click", (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-vp]") : null;
    if (!b) return;
    ev.preventDefault();
    if (b.dataset.vp === "anpassen") U.blattAnpassen(b.dataset.vpds, b.dataset.vpuid, null);
  });
})();
