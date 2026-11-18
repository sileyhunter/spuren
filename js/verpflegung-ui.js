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
  const liste = (L) => (L.length ? `<ul class="vp-liste">${L.map((x) => `<li>${esc(x.text || x)}</li>`).join("")}</ul>` : "");
  /** Abschnitt «Verpflegung» auf der Einheit-Seite. opt.vorbei = vergangener Tag (nur lesen). */
  U.abschnitt = function (ds, e, opt) {
    const R = U.plan(ds, e); if (!R) return "";
    const w = R.waehrend, Z = R.ziel, vorbei = !!(opt && opt.vorbei), darm = !vorbei && Z.stufe === "ja" && (e.dauer || 0) >= 120 ? U.darm() : null;
    const kopf = [];
    if (Z.stufe === "ja") { kopf.push([`${w.g_h} g/h`, "Kohlenhydrate"]); kopf.push([`${w.kh} g`, "während"]); if (isNum(w.natrium)) kopf.push([`${w.natrium} mg`, "Natrium"]); }
    const zeit = w.zeitplan.length ? `<ol class="vp-zeit">${w.zeitplan.map((z) => `<li><b>${z.bis != null ? `${z.min}–${z.bis}` : z.min}′</b><span>${esc(z.text)}</span></li>`).join("")}</ol>` : "";
    return `<section class="v73-ab vp-ab" id="vp-ab"><h2 class="abschnitt">${ic("flasche", 15)}Verpflegung${R.angepasst ? `<span class="vp-angepasst">angepasst</span>` : ""}</h2>
      ${kopf.length ? `<div class="kv vp-kv">${kopf.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>` : ""}
      <h3 class="abschnitt klein">Vorher</h3>${liste(R.vorher)}
      <h3 class="abschnitt klein">Während</h3>${zeit}${liste(w.text)}
      ${R.nachher.length ? `<h3 class="abschnitt klein">Nachher</h3>${liste(R.nachher)}` : ""}
      ${R.packliste.length ? `<p class="vp-pack"><b>Mitnehmen:</b> ${esc(R.packliste.join(" · "))}</p>` : ""}
      ${R.hinweise.map((h) => `<p class="hint keep">${esc(h)}</p>`).join("")}
      ${darm && Z.stufe === "ja" && (e.dauer || 0) >= 120 ? `<p class="hint keep">Darmtraining: ${esc(darm.text)}</p>` : ""}
      <p class="hint">${esc(Z.gruende.join(" · "))}. ${esc(R.annahmen.join(" · "))}.</p>
      <div class="vp-knoepfe">${vorbei ? "" : `<button type="button" class="btn" data-vp="anpassen" data-vpds="${esc(ds)}" data-vpuid="${esc(e.uid)}">${ic("regler", 16)} Anpassen</button>`}
        <button type="button" class="btn" data-vp="produkte">${ic("flasche", 16)} Produkte wählen</button></div></section>`;
  };

  /* ---------------- Blatt «Produkte wählen» ---------------- */
  const ZWECK = [["unterwegs", "unterwegs"], ["davor", "vorher"], ["danach", "nachher"]];
  U.blattProdukte = function (zurueck) {
    if (!bereit() || !V59() || !V75()) return;
    const P0 = produkte(), W = U.wahl(), e0 = einstellung();
    const sel = { unterwegs: new Set(W.unterwegs.map((p) => p.id)), davor: new Set(W.vorher.map((p) => p.id)), danach: new Set(W.nachher.map((p) => p.id)), fruktose: new Set(W.fruktose) };
    let max = W.max_g_h, alle = false;
    const darm = U.darm();
    const zeile = (p) => `<li class="vp-p${p.art === "anderes" ? " anderes" : ""}"><div><b>${esc(p.anzeige || p.name)}</b><small>${esc(VP().ART_WORT[p.art])} · ${esc(p.portion.text)}${isNum(p.kh) ? ` · ${komma(Math.round(p.kh * 10) / 10)} g KH` : ""}${isNum(p.protein) && p.protein >= 5 ? ` · ${komma(Math.round(p.protein))} g Protein` : ""}${isNum(p.natrium) ? ` · ${Math.round(p.natrium)} mg Natrium` : ""}</small></div>
      <div class="chips" role="group" aria-label="${esc(p.anzeige || p.name)}">${ZWECK.map(([k, t]) => `<button type="button" class="chip" data-vpz="${k}" data-vpid="${esc(p.id)}" aria-pressed="${sel[k].has(p.id)}">${t}</button>`).join("")}
        <button type="button" class="chip" data-vpz="fruktose" data-vpid="${esc(p.id)}" aria-pressed="${sel.fruktose.has(p.id)}" title="laut Etikett aus Glukose und Fruktose">Glukose + Fruktose</button></div></li>`;
    const html = () => `<div class="blatt-titel">${ic("flasche", 34)}<h2 id="v59-ov-h" tabindex="-1">Produkte für die Verpflegung</h2><p class="sub">aus deinen eigenen Lebensmitteln in Garmin Connect${C.D.garmin_lebensmittel_stand ? ` (Stand ${esc(new Date(C.D.garmin_lebensmittel_stand + "T12:00:00").toLocaleDateString("de-CH"))})` : ""}${P0.some((p) => p.quelle === "vorlage") ? " und deinen Fueling-Vorlagen" : ""}</p></div>
      ${P0.length ? "" : `<p class="warn-t">Noch keine Produkte: das Nacht-Update holt deine eigenen Lebensmittel aus Garmin Connect (Ernährung → eigene Lebensmittel).</p>`}
      <p class="hint">Wähle je Produkt, wofür du es nimmst; die Reihenfolge der Wahl gilt als Vorrang. «Glukose + Fruktose» nur, wenn es so auf dem Etikett steht – erst dann empfiehlt die Seite mehr als 60 g pro Stunde.</p>
      <ul class="vp-produkte">${P0.filter((p) => alle || p.art !== "anderes" || ZWECK.some(([k]) => sel[k].has(p.id))).map(zeile).join("")}</ul>
      <button type="button" class="lnk" data-vpalle>${alle ? "Nur passende zeigen" : "Alle Lebensmittel zeigen"}</button>
      <h3 class="abschnitt">Deine Stufe ab 2,5 h</h3>
      <div class="vp-stufe"><button type="button" class="btn" data-vpm="-10" aria-label="weniger">−</button><b data-vpmw>${max} g/h</b><button type="button" class="btn" data-vpm="10" aria-label="mehr">+</button></div>
      <p class="hint">Anfangs 60 g pro Stunde; erhöhen, wenn der Magen in langen Einheiten mitmacht (Darmtraining). Über 90 g nur, wenn du das schon erprobt hast.</p>
      ${darm ? `<p class="hint keep">${esc(darm.text)}</p>` : ""}
      <p class="warn-t" data-vpf hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-vpzu aria-label="Zurück">${ic("zurueck", 22)}</button>
        <button type="button" class="btn primary gross" data-vpok>${ic("check", 18)} Übernehmen</button></div>`;
    const ov = V59().blatt("verpflegung", html());
    const binden = () => {
      ov.querySelectorAll("[data-vpz]").forEach((b) => (b.onclick = () => {
        const s = sel[b.dataset.vpz], id = b.dataset.vpid;
        if (s.has(id)) s.delete(id); else s.add(id);
        b.setAttribute("aria-pressed", String(s.has(id)));
      }));
      ov.querySelectorAll("[data-vpm]").forEach((b) => (b.onclick = () => { max = Math.max(30, Math.min(120, max + +b.dataset.vpm)); ov.querySelector("[data-vpmw]").textContent = `${max} g/h`; }));
      ov.querySelector("[data-vpalle]").onclick = () => { alle = !alle; const box = ov.querySelector(".v59-inhalt") || ov; const y = box.scrollTop; ov.querySelector(".vp-produkte").outerHTML = `<ul class="vp-produkte">${P0.filter((p) => alle || p.art !== "anderes" || ZWECK.some(([k]) => sel[k].has(p.id))).map(zeile).join("")}</ul>`; ov.querySelector("[data-vpalle]").textContent = alle ? "Nur passende zeigen" : "Alle Lebensmittel zeigen"; binden(); box.scrollTop = y; };
      ov.querySelector("[data-vpzu]").onclick = () => { V59().schliessen(); if (zurueck) zurueck(); };
      ov.querySelector("[data-vpok]").onclick = async () => {
        const f = ov.querySelector("[data-vpf]"), Inb = UI().Inbox;
        if (!Inb || !Inb.data) { f.textContent = "Speicher auf diesem Gerät nicht verfügbar."; f.hidden = false; return; }
        const x = V75().eintrag("pe-verpflegung", { unterwegs: [...sel.unterwegs], davor: [...sel.davor], danach: [...sel.danach], fruktose: [...sel.fruktose], max_g_h: max }, undefined, e0);
        const fe = V75().pruefen(x); if (fe) { f.textContent = fe; f.hidden = false; return; }
        if (!Array.isArray(Inb.data.planeinstellung)) Inb.data.planeinstellung = [];
        try { await Inb.upsert("planeinstellung", x); } catch (err) { console.error(err); f.textContent = "Speichern auf diesem Gerät ging nicht."; f.hidden = false; return; }
        V59().schliessen();
        try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (err) { console.error(err); }
        try { if (window.V6H && window.V6H.zeichnen) window.V6H.zeichnen(); } catch (err) { console.error(err); }
        if (zurueck) zurueck();
      };
    };
    binden();
  };

  /* ---------------- Blatt «Verpflegung anpassen» je Einheit ---------------- */
  U.blattAnpassen = function (ds, uid, zurueck) {
    if (!bereit() || !V59()) return;
    const e = tagEinheiten(ds).find((x) => x.uid === uid); if (!e) return;
    const alt = VP().anpassung(C.D.plan_verpflegung || [], I().verpflegung || [], ds, uid);
    const ohne = VP().plan(e, { W: U.wahl(), kg: gewicht(ds) });
    const w = { g_h: alt && isNum(alt.g_h) ? alt.g_h : null, mix: (alt && alt.mix) || "auto", aus: !!(alt && alt.aus) };
    const emp = ohne.ziel.stufe === "ja" ? ohne.ziel.g_h : 0;
    const html = `<div class="blatt-titel">${ic("regler", 34)}<h2 id="v59-ov-h" tabindex="-1">Verpflegung anpassen</h2><p class="sub">${esc(e.titel)} · ${esc(new Date(ds + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" }))}</p></div>
      <h3 class="abschnitt">Kohlenhydrate während</h3>
      <div class="vp-stufe"><button type="button" class="btn" data-vpg="-5" aria-label="weniger">−</button><b data-vpgw></b><button type="button" class="btn" data-vpg="5" aria-label="mehr">+</button></div>
      <p class="hint">Empfehlung: ${emp ? `${emp} g pro Stunde` : "nichts nötig"}. Über 60 g pro Stunde nur mit Produkten aus Glukose und Fruktose.</p>
      <h3 class="abschnitt">Produkte</h3>
      <div class="chips" role="radiogroup">${VP().MIX.map((m) => `<button type="button" class="chip" role="radio" data-vpx="${m}">${esc(VP().MIX_WORT[m])}</button>`).join("")}</div>
      <label class="vp-aus"><input type="checkbox" data-vpaus${w.aus ? " checked" : ""}> Diesmal ohne Verpflegung</label>
      <p class="warn-t" data-vpf hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-vpzu aria-label="Zurück">${ic("zurueck", 22)}</button>
        ${alt ? `<button type="button" class="btn" data-vpweg>Zurück auf die Empfehlung</button>` : ""}
        <button type="button" class="btn primary gross" data-vpok>${ic("check", 18)} Speichern</button></div>`;
    const ov = V59().blatt("verpflegung", html), q = (s) => ov.querySelector(s);
    const zeig = () => {
      q("[data-vpgw]").textContent = w.g_h == null ? `${emp} g/h (Empfehlung)` : `${w.g_h} g/h`;
      ov.querySelectorAll("[data-vpx]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.vpx === w.mix)));
    };
    ov.querySelectorAll("[data-vpg]").forEach((b) => (b.onclick = () => { w.g_h = Math.max(0, Math.min(120, (w.g_h == null ? emp : w.g_h) + +b.dataset.vpg)); zeig(); }));
    ov.querySelectorAll("[data-vpx]").forEach((b) => (b.onclick = () => { w.mix = b.dataset.vpx; zeig(); }));
    q("[data-vpaus]").onchange = (ev) => { w.aus = ev.target.checked; };
    const fertig = () => { V59().schliessen(); try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (err) { console.error(err); } try { if (window.V6H && window.V6H.zeichnen) window.V6H.zeichnen(); } catch (err) { console.error(err); } if (zurueck) zurueck(); };
    const speichern = async (x) => {
      const f = q("[data-vpf]"), Inb = UI().Inbox;
      if (!x) { f.textContent = "Nichts geändert – die Empfehlung gilt."; f.hidden = false; return; }
      if (!Inb || !Inb.data) { f.textContent = "Speicher auf diesem Gerät nicht verfügbar."; f.hidden = false; return; }
      if (!Array.isArray(Inb.data.verpflegung)) Inb.data.verpflegung = [];
      try { await Inb.upsert("verpflegung", x); } catch (err) { console.error(err); f.textContent = "Speichern auf diesem Gerät ging nicht."; f.hidden = false; return; }
      fertig();
    };
    q("[data-vpok]").onclick = () => speichern(VP().eintrag(ds, uid, { g_h: w.g_h == null || w.g_h === emp ? null : w.g_h, mix: w.mix === "auto" ? null : w.mix, aus: w.aus || null }));
    if (q("[data-vpweg]")) q("[data-vpweg]").onclick = () => speichern({ id: `vp-${ds}-${uid}`, datum: ds, uid, entfernt: true, v: VP().VERSIONS.verpflegung, geaendert: new Date().toISOString() });
    q("[data-vpzu]").onclick = () => { V59().schliessen(); if (zurueck) zurueck(); };
    zeig();
  };

  // Knöpfe im Abschnitt (Einheit-Seite) – ein Klick-Hörer für alle
  document.addEventListener("click", (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-vp]") : null;
    if (!b) return;
    ev.preventDefault();
    if (b.dataset.vp === "produkte") U.blattProdukte(null);
    else if (b.dataset.vp === "anpassen") U.blattAnpassen(b.dataset.vpds, b.dataset.vpuid, null);
  });
})();
