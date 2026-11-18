/* V7.8 (Auftrag V7.3, Etappe 4, Teil 1) kalender-4.0: Kalender wie die Vorlage enduco – Zwei-Wochen-Raster (aufziehbar zum Monat) über einer
   durchlaufenden Tagesliste mit Wochenköpfen «Phase | Wochenart». Monatstitel, Raster und gewählter Tag folgen dem Scrollen; Tag im Raster antippen
   scrollt dorthin, «Heute» springt zurück. Einheit antippen → Einheit-Seite, «⋯» am Tag → Tagesblatt, «⋯» am Wochenkopf → Woche bearbeiten
   (Anpassen, Neu berechnen, Verwerfen, Leeren, An Garmin senden). Rechnet nichts Neues: Mein Plan aus V64UI.kontextFuer, Absolviertes aus Garmin,
   TL ≈ und Distanz ≈ aus V66.schaetzung, Mini-Profile aus den Teilen (profil-teile-1.0). Enduco erscheint nicht. */
(function () {
  "use strict";
  const N = (window.V78UI = window.V78UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V66 = () => window.V66, V78 = () => window.V78, P = () => window.V64UI, M = () => window.V66UI, TR = () => window.TR;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SPF = (sp) => `var(--sp-${["rad", "lauf", "schwimm", "wandern", "ski"].includes(sp) ? sp : "andere"})`;
  const WT = ["M", "D", "M", "D", "F", "S", "S"];
  let C = null;
  const ST = { von: null, bis: null, sel: null, offen: false, box: null, raster: null, titel: null, sub: null, KC: new Map(), lauf: 0 };
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && V78() && V66() && V6() && P() && P().kontextFuer && M()); };
  const heute = () => C.iso(C.today);
  const add = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  /** Scrollt die Ansicht (die View hat ein eigenes overflow-y), sonst das Dokument. */
  const scroller = () => (ST.box && ST.box.closest(".view")) || document.scrollingElement;

  /* ---------------- Daten je Woche (einmal je Zeichnen) ---------------- */
  function woche(mo) {
    if (ST.KC.has(mo)) return ST.KC.get(mo);
    let K = null; try { K = P().kontextFuer(mo); } catch (e) { console.error(e); }
    const gilt = !window.V7UI || window.V7UI.planGilt(mo);
    const ist = M().istWoche(mo), kopf = K ? M().wochenKopf(mo, K) : null;
    const bz = K ? V66().bezug(TR() ? TR().zonen(C.D.zonen).skalen : null, K.css ? K.css.s : null) : {};
    const tests = (C.tests ? C.tests() : []).filter((t) => t && t.date >= mo && t.date <= add(mo, 6));
    const tage = new Map();
    for (let i = 0; i < 7; i++) {
      const ds = add(mo, i), t = K ? K.w.tage.find((x) => x.date === ds) : null;
      const plan = gilt && t && !t.rennen ? t.einheiten : [], akt = ist.filter((a) => a.date === ds);
      const frei = akt.map((a) => (V6().sportVon ? V6().sportVon(a) : a.sport));
      const erl = plan.map((e) => { const j = frei.indexOf(e.sport); if (j >= 0) { frei.splice(j, 1); return true; } return false; });
      tage.set(ds, { ds, t, plan, erl, akt, tests: tests.filter((x) => x.date === ds), rennen: t && t.rennen ? t.rennen : null, v: K && K.verf && ds >= heute() ? K.verf(ds) : null });
    }
    const w = { mo, K, gilt, kopf, bz, tage };
    ST.KC.set(mo, w);
    return w;
  }
  const tagDaten = (ds) => woche(V78().montag(ds)).tage.get(ds);
  /** Zonenfarbe des Schwerpunkts einer Einheit (Fokus, sonst die Zone des längsten Abschnitts). */
  function zonenFarbe(e) {
    const Z = V6().ZONEN || {};
    try { const f = window.V7UI ? window.V7UI.profil(e).fokus : []; if (f && f.length && Z[f[0].key]) return Z[f[0].key].farbe; } catch (err) { /* ohne Profil */ }
    const lang = (e.teile || []).filter((x) => Array.isArray(x) && isNum(x[1])).sort((a, b) => b[1] - a[1])[0];
    return lang && Z[lang[0]] ? Z[lang[0]].farbe : "var(--muted)";
  }

  /* ---------------- Raster ---------------- */
  function rasterHTML() {
    const W = V6(), h = heute(), R = ST.edit ? V78().raster(V78().montag(ST.sel) < ST.editMo ? ST.editMo : V78().montag(ST.sel), 1) : ST.offen ? V78().monatsRaster(ST.sel) : V78().raster(ST.sel, 2), mon = new Date(ST.sel + "T12:00:00Z").getUTCMonth();
    const kopf = `<div class="k4-r-kw"></div>${WT.map((t) => `<div class="k4-r-wt">${t}</div>`).join("")}`;
    const zeilen = R.map((wk) => `<button type="button" class="k4-r-kw" data-k4kw="${wk.montag}" aria-label="KW ${W.isoWoche(wk.montag)}: Woche im Zyklus öffnen">${W.icon("kalender", 15)}</button>` + wk.tage.map((ds) => {
      let d = null; try { d = tagDaten(ds); } catch (e) { d = null; }
      const sp = []; if (d) { for (const a of d.akt) { const s = V6().sportVon ? V6().sportVon(a) : a.sport; if (!sp.includes(s)) sp.push(s); } for (const e of d.plan) if (!sp.includes(e.sport)) sp.push(e.sport); }
      const pkt = d ? d.plan.slice(0, 4).map((e) => `<i style="background:${zonenFarbe(e)}"></i>`).join("") : "";
      const leer = d && !sp.length && !(d.tests || []).length && !d.rennen;
      const aus = ST.offen && new Date(ds + "T12:00:00Z").getUTCMonth() !== mon;
      return `<button type="button" class="k4-r-t${ds === h ? " heute" : ""}${ds === ST.sel ? " sel" : ""}${aus ? " aus" : ""}" data-k4r="${ds}" aria-label="${esc(V78().tagText(ds))}">
        <span class="k4-r-d">${+ds.slice(8)}</span>${d && d.rennen ? `<span class="k4-r-p renn">${W.icon("flagge", 12)}</span>` : sp.length ? `<span class="k4-r-p">${sp.slice(0, 2).map((s) => `<i style="--sp:${SPF(s)}">${W.sportIcon(s, 11)}</i>`).join("")}</span>` : `<span class="k4-r-p leer">${leer ? "·" : ""}</span>`}
        <span class="k4-r-z">${pkt}${d && d.tests.length ? `<i class="test"></i>` : ""}</span></button>`;
    }).join("")).join("");
    return `<div class="k4-r-gitter" role="group" aria-label="Kalender">${kopf}${zeilen}</div>
      ${ST.edit ? "" : `<button type="button" class="k4-griff" data-k4griff aria-expanded="${ST.offen}" aria-label="${ST.offen ? "Raster zuklappen" : "Ganzen Monat zeigen"}"><span></span></button>`}`;
  }

  /* ---------------- Liste ---------------- */
  /** Darf eine Einheit im Bearbeiten-Modus gezogen oder gesperrt werden? Nicht: vergangene oder gesperrte Tage, Tests, Kurs, Aktivitäten draussen
   *  (eigener Eintrag), nachgeholte Einheiten (Ampel). */
  const beweglich = (e, d) => d.ds >= heute() && !(d.t && d.t.gesperrt) && !["test", "kurs", "draussen"].includes(e.art) && !e.test && !(e.ampel && e.ampel.nachgeholt);
  function einheitHTML(e, d, w, erl) {
    const W = V6(), S = V66().schaetzung(e, w.bz);
    const q = e.kraft_plan ? "Krafttraining" : e.art === "draussen" ? "draussen" : e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag";
    let prof = ""; try { prof = e.teile && e.teile.length && e.teile[0][0] !== "ohne" && P().profil ? W.profilSVG(P().profil(e), { h: 32 }) : ""; } catch (err) { prof = ""; }
    const inhalt = `<span class="mo-sp" style="--sp:${SPF(e.sport)}">${W.sportIcon(e.sport, 16)}</span>
      <span class="k4-et"><b>${e.gesperrt ? `<span class="mp-schloss">${W.icon("schloss", 12)}</span>` : ""}${esc(e.titel)}${erl ? ` <span class="k4-haken" title="erledigt">${W.icon("haken", 13)}</span>` : ""}</b>
        <small>${esc([e.uhrzeit, V78().zeile(e.dauer, S)].filter(Boolean).join(" · "))} · <span class="k4-q">${esc(q)}</span></small></span>`;
    if (ST.edit && d.ds >= heute() && !(d.t && d.t.gesperrt) && !(e.ampel && e.ampel.nachgeholt)) {
      const zieh = beweglich(e, d);
      return `<div class="k4-e k4-e-ed${e.gesperrt ? " gesperrt" : ""}" data-k4e="${esc(e.uid)}" data-k4d="${d.ds}">
        <button type="button" class="k4-e-auf" data-k4auf>${inhalt}</button>
        ${["test", "kurs", "draussen"].includes(e.art) || e.test ? "" : `<button type="button" class="k4-e-lock" data-k4elock aria-pressed="${!!e.gesperrt}" aria-label="${esc(e.titel)}: ${e.gesperrt ? "entsperren" : "sperren (bleibt beim Anpassen)"}">${W.icon("schloss", 16)}</button>`}
        ${zieh ? `<button type="button" class="k4-zieh" data-k4zieh aria-label="${esc(e.titel)} verschieben: ziehen oder antippen">${W.icon("griff", 20)}</button>` : `<span class="k4-zieh leer"></span>`}</div>`;
    }
    return `<button type="button" class="k4-e${erl ? " erl" : ""}${d.ds < heute() && !erl ? " verpasst" : ""}" data-k4e="${esc(e.uid)}" data-k4d="${d.ds}">${inhalt}
      <span class="k4-prof">${prof}</span></button>`;
  }
  function tagHTML(d, w) {
    const W = V6(), h = heute(), sek = (a) => (isNum(a.mv) ? a.mv : a.dur || 0);
    const akt = d.akt.map((a) => `<button type="button" class="k4-e ist" data-ex="${esc(a.id)}"><span class="mo-sp voll" style="--sp:${SPF(V6().sportVon ? V6().sportVon(a) : a.sport)}">${W.sportIcon(V6().sportVon ? V6().sportVon(a) : a.sport, 16)}</span>
      <span class="k4-et"><b>${esc(a.name || "Aktivität")} <span class="k4-haken">${W.icon("haken", 13)}</span></b><small>${esc([W.dauerText(sek(a)), isNum(a.km) && a.km > 0 ? `${String(Math.round(a.km * 10) / 10).replace(".", ",")} km` : null, isNum(a.tss) && a.tss > 0 ? `TL ${Math.round(a.tss)}` : null].filter(Boolean).join(" · "))} · <span class="k4-q">absolviert</span></small></span></button>`).join("");
    const plan = d.plan.map((e, i) => einheitHTML(e, d, w, d.erl[i])).join("");
    const NAME = { stufentest: "Stufentest", check: "Laktat-Kurzcheck", css: "CSS-Test" };
    const tests = d.plan.some((e) => e.art === "test" || e.test) ? "" : d.tests.map((x) => `<p class="k4-zeile test"><i class="c-test"></i>${esc(NAME[x.kind] || x.kind)}${x.done ? " ✓" : x.status === "vorschlag" ? " · Vorschlag" : ""}</p>`).join("");
    const renn = d.rennen ? `<p class="k4-zeile renn">${W.icon("flagge", 15)} ${esc(d.rennen.name || "Rennen")}</p>` : "";
    const L = !akt && !plan && !tests && !renn ? V78().leer(d.v, d.ds < h) : null;
    const leer = L ? `<p class="k4-zeile ${L.art}">${L.art === "kein" ? "✕" : L.art === "ruhe" ? "☾" : "–"} ${esc(L.text)}</p>` : "";
    const n = d.plan.length + d.akt.length;
    const amp = window.V74UI && w.gilt && d.t ? window.V74UI.kurz(d.t) : "";
    const gesp = !!(d.t && d.t.gesperrt);
    let rechts = n ? `<small>${n} ${n === 1 ? "Einheit" : "Einheiten"}</small>` : "";
    if (ST.edit) {                                                             // V7.9 bearbeiten-1.0: Trainingsstatus je Tag (zu Tagesbeginn) und Tag sperren
      const f = ST.form ? ST.form.get(d.ds) : null, ts = f ? V78().status(f.fitness, f.ermuedung) : null, stu = V78().stufe(ts);
      rechts = `${ts != null ? `<span class="k4-st" title="Trainingsstatus zu Tagesbeginn (Ermüdung ÷ Fitness)">${f.prognose ? "≈ " : ""}${String(ts).replace(".", ",")}<i class="k4-st-b k4-st-${stu.k}" aria-hidden="true"><i style="width:${Math.round(stu.anteil * 100)}%"></i></i></span>` : ""}
        ${d.ds >= h && !d.rennen ? `<button type="button" class="btn rp-ib k4-tlock" data-k4tlock="${d.ds}" aria-pressed="${gesp}" aria-label="${esc(V78().tagText(d.ds))}: ${gesp ? "entsperren" : "Tag sperren"}">${W.icon("schloss", 16)}</button>` : ""}`;
    }
    return `<div class="k4-tag${d.ds === h ? " heute" : ""}${d.ds < h ? " vorbei" : ""}${gesp ? " gesperrt" : ""}" id="k4-${d.ds}" data-k4tag="${d.ds}">
      <div class="k4-tk"><b>${esc(V78().tagText(d.ds))}${d.ds === h ? ` <span class="k4-heute">heute</span>` : ""}${gesp && !ST.edit ? ` ${W.icon("schloss", 12)}` : ""}</b>
        <span>${rechts}<button type="button" class="btn rp-ib k4-mehr" data-k4blatt="${d.ds}" aria-label="${esc(V78().tagText(d.ds))}: Tagesblatt öffnen">${W.icon("mehr", 18)}</button></span></div>
      ${amp}${renn}${akt}${plan}${tests}${leer}</div>`;
  }
  function wocheHTML(mo) {
    const W = V6(), w = woche(mo), k = w.kopf, hm = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h`;
    const titel = V78().wochenTitel(w.K && w.K.w ? w.K.w.phase : null, k ? k.art : null);
    const zahlen = k ? [w.gilt && k.planMin ? `Plan ${hm(k.planMin)}` : null, w.gilt && k.planTl ? `TL ≈ ${k.tlOffen ? "mind. " : ""}${k.planTl}` : null, k.istMin ? `absolviert ${hm(k.istMin)}` : null].filter(Boolean).join(" · ") : "";
    const tage = Array.from({ length: 7 }, (_, i) => tagHTML(w.tage.get(add(mo, i)), w)).join("");
    return `<section class="k4-woche" data-k4mo="${mo}">
      <div class="k4-wk"><div><b>${esc(titel)}</b>${w.K && w.K.w && w.K.w.bearbeitet ? `<small> · bearbeitet</small>` : ""}<span>KW ${W.isoWoche(mo)} · ${esc(V78().bereichText(mo))}</span>${zahlen ? `<small>${esc(zahlen)}</small>` : ""}</div>
        ${mo >= V78().montag(heute()) ? `<button type="button" class="btn rp-ib" data-k4wakt="${mo}" aria-label="KW ${W.isoWoche(mo)} bearbeiten">${W.icon("mehr", 20)}</button>` : ""}</div>
      ${w.gilt ? "" : `<p class="hint">Für diese Woche war kein eigener Plan gespeichert – gezeigt wird, was du absolviert hast.</p>`}${tage}</section>`;
  }

  /* ---------------- Zeichnen, Scrollen, Bedienen ---------------- */
  /** Liste in box zeichnen; raster = Element für das Raster (im Kopf), titel/sub = Monatstitel und Unterzeile. opt.ziel = Tag, zu dem gescrollt wird. */
  N.zeichnen = function (box, raster, titel, sub, opt) {
    if (!bereit()) { box.innerHTML = `<p class="hint">Kalender wird geladen …</p>`; return; }
    opt = opt || {};
    Object.assign(ST, { box, raster, titel, sub }); ST.KC = new Map();
    const h = heute();
    if (!ST.von) { ST.von = add(V78().montag(h), -7); ST.bis = add(V78().montag(h), 7 * 7); }
    if (opt.ziel) { const m = V78().montag(opt.ziel); if (m < ST.von) ST.von = m; if (m > ST.bis) ST.bis = m; }
    ST.sel = opt.ziel || ST.sel || h;
    const wochen = []; for (let m = ST.von; m <= ST.bis; m = add(m, 7)) wochen.push(m);
    const t0 = Date.now();
    if (ST.edit) {
      try { ST.form = M().formReihe ? M().formReihe(ST.von, add(ST.bis, 6)) : null; } catch (e) { console.error(e); ST.form = null; }
      box.innerHTML = wochen.map((m, i) => (i ? `<p class="k4-trenner"><span>Nächste Woche · KW ${V6().isoWoche(m)}</span></p>` : "") + wocheHTML(m)).join("") +
        `<p class="hint">Bearbeiten (${esc(V78().VERSIONS.bearbeiten)}): Einheit am Griff auf einen anderen Tag derselben Woche ziehen oder den Griff antippen; das Schloss hält eine Einheit oder einen Tag fest, wenn du die Woche anpasst. Gespeichert wird erst mit ✓; ↶ und ↷ gehen Schritte zurück und vor. Rechts der Trainingsstatus zu Tagesbeginn (${esc(V78().VERSIONS.status)}).</p>`;
    } else {
      ST.form = null;
      box.innerHTML = `<button type="button" class="btn k4-mehr-w" data-k4frueher>Frühere Wochen</button>${wochen.map(wocheHTML).join("")}
      <button type="button" class="btn k4-mehr-w" data-k4spaeter>Weitere Wochen</button>
      <p class="hint">Mein Plan (${esc(V66().VERSIONS.eigenplan)}) mit Absolviertem aus Garmin; TL ≈ und Distanz ≈ sind Schätzungen aus deinem Zonenprofil (${esc(V66().VERSIONS.tl)}). Enduco erscheint hier nicht (${esc(V78().VERSIONS.kalender)}).</p>`;
    }
    ST.ms = Date.now() - t0;
    rasterZeichnen(); kopfText(ST.sel); binden(); editZeichnen();
    if (opt.ziel) requestAnimationFrame(() => N.zu(opt.ziel, true));
  };
  function rasterZeichnen() {
    if (!ST.raster) return;
    ST.raster.innerHTML = rasterHTML();
    ST.raster.querySelectorAll("[data-k4r]").forEach((b) => (b.onclick = () => N.zu(b.dataset.k4r)));
    ST.raster.querySelectorAll("[data-k4kw]").forEach((b) => (b.onclick = () => window.APP && window.APP.kalenderWoche && window.APP.kalenderWoche(b.dataset.k4kw)));
    const g = ST.raster.querySelector("[data-k4griff]"); if (g) g.onclick = () => { ST.offen = !ST.offen; rasterZeichnen(); };
  }
  function kopfText(ds) {
    if (ST.titel) ST.titel.textContent = V78().monatText(ds);
    if (ST.sub) { const mo = V78().montag(ds); ST.sub.textContent = `KW ${V6().isoWoche(mo)} · ${V78().bereichText(mo)}`; }
  }
  /** Zum Tag ds scrollen (liegt er ausserhalb, wird die Liste erweitert). */
  N.zu = function (ds, still) {
    if (!ST.box) return;
    const el = document.getElementById("k4-" + ds);
    if (!el) { N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub, { ziel: ds }); return; }
    ST.sel = ds; ST.sperre = Date.now() + 700; rasterZeichnen(); kopfText(ds);
    el.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  };
  function aktuell() {
    if (!ST.box || !ST.box.isConnected || ST.box.offsetParent === null || (ST.sperre && Date.now() < ST.sperre)) return;
    const kopf = ST.raster ? ST.raster.closest(".k4-kopf") : null, oben = kopf ? kopf.getBoundingClientRect().bottom + 4 : 0;
    const T = ST.box.querySelectorAll(".k4-tag");
    for (const el of T) if (el.getBoundingClientRect().bottom > oben) {
      const ds = el.dataset.k4tag;
      if (ds !== ST.sel) { const alt = ST.sel; ST.sel = ds; kopfText(ds); rasterZeichnen(); if (ST.edit && V78().montag(alt || ds) !== V78().montag(ds)) editZeichnen(); }
      return;
    }
  }
  function binden() {
    const B = ST.box;
    B.querySelectorAll("[data-k4blatt]").forEach((b) => (b.onclick = () => window.APP && window.APP.tagBlatt && window.APP.tagBlatt(b.dataset.k4blatt)));
    const auf = (ds, uid) => M().einheit(ds, uid, { zurueck: () => { if (window.V59) window.V59.schliessen(); N.neu(); } });
    B.querySelectorAll("button[data-k4e]").forEach((b) => (b.onclick = () => auf(b.dataset.k4d, b.dataset.k4e)));
    B.querySelectorAll(".k4-e-ed").forEach((r) => {
      const ds = r.dataset.k4d, uid = r.dataset.k4e, mo = V78().montag(ds);
      const a = r.querySelector("[data-k4auf]"); if (a) a.onclick = () => auf(ds, uid);
      const l = r.querySelector("[data-k4elock]"); if (l) l.onclick = () => schritt(mo, { art: "einheit", date: ds, uid, felder: { gesperrt: l.getAttribute("aria-pressed") !== "true" } });
      const z = r.querySelector("[data-k4zieh]");
      if (z) { z.addEventListener("pointerdown", (ev) => ziehen(z, r, ev)); z.addEventListener("click", (ev) => { if (ev.detail === 0) verschiebenBlatt(ds, uid); }); }   // Tastatur: Tag wählen
    });
    B.querySelectorAll("[data-k4tlock]").forEach((b) => (b.onclick = () => schritt(V78().montag(b.dataset.k4tlock), { art: b.getAttribute("aria-pressed") === "true" ? "entsperren" : "sperren", date: b.dataset.k4tlock })));
    B.querySelectorAll("[data-k4wakt]").forEach((b) => (b.onclick = () => M().wocheAktionen(b.dataset.k4wakt, null)));
    const f = B.querySelector("[data-k4frueher]"); if (f) f.onclick = () => { const top = ST.sel; ST.von = add(ST.von, -28); N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub, { ziel: top }); };
    const s = B.querySelector("[data-k4spaeter]"); if (s) s.onclick = () => { ST.bis = add(ST.bis, 28); const sc = scroller(), y = sc.scrollTop; N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub); sc.scrollTop = y; };
    const sc = scroller();
    if (sc && ST.scrollEl !== sc) {
      ST.scrollEl = sc;
      sc.addEventListener("scroll", () => { if (ST.lauf) return; ST.lauf = requestAnimationFrame(() => { ST.lauf = 0; aktuell(); }); }, { passive: true });
    }
    const kopf = ST.raster ? ST.raster.closest(".k4-kopf") : null;
    if (kopf) B.style.setProperty("--k4-oben", `${Math.round(kopf.getBoundingClientRect().height) + 8}px`);
  }
  /** Nach einer Änderung (Ereignis «meinplan») neu zeichnen und die Stelle halten. */
  N.neu = function () { if (!ST.box || !ST.box.isConnected) return; const sc = scroller(), y = sc.scrollTop; N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub); sc.scrollTop = y; };
  N.heute = function () { if (!bereit()) return; N.zu(heute()); };

  /* ---------------- Bearbeiten (V7.9 bearbeiten-1.0, Vorlage «Bearbeiten») ---------------- */
  const EN = () => (P() && P().entwurf) || null;
  const $ = (id) => document.getElementById(id);
  N.imBearbeiten = () => !!ST.edit;
  /** Bearbeiten beginnen: die Woche oben in der Liste (frühestens die laufende) und die nächste; Leiste unten aus (body.k4-edit). */
  N.bearbeiten = function (mo) {
    if (!bereit() || !ST.box || ST.edit || !EN()) return;
    const h = heute(), m0 = V78().montag(h);
    let m = V78().montag(mo || ST.sel || h); if (m < m0) m = m0;
    EN().starten();
    ST.alt = { von: ST.von, bis: ST.bis, offen: ST.offen };
    Object.assign(ST, { edit: true, editMo: m, von: m, bis: add(m, 7), offen: false });
    document.body.classList.add("k4-edit");
    const k = ST.box.closest(".kal-v7"); if (k) k.classList.add("k4e");
    N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub, { ziel: h >= m && h <= add(m, 13) ? h : m });
  };
  function ende() {
    ST.edit = false; ST.form = null;
    document.body.classList.remove("k4-edit");
    const k = ST.box && ST.box.closest(".kal-v7"); if (k) k.classList.remove("k4e");
    const a = ST.alt || {}; ST.von = a.von || null; ST.bis = a.bis || null; ST.offen = !!a.offen;
    if (ST.von && ST.sel && ST.sel < ST.von) ST.von = V78().montag(ST.sel);
    if (ST.bis && ST.sel && ST.sel > add(ST.bis, 6)) ST.bis = V78().montag(ST.sel);
    N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub, { ziel: ST.sel });
  }
  /** ✓ speichern: Entwurf über «Direkt speichern» (V66UI.entwurfSpeichern), dann zurück zur Liste. */
  async function speichern() {
    const n = EN() ? EN().aenderungen().length : 0, f = await M().entwurfSpeichern();
    if (f) { meldung(f); return; }
    ende();
    meldung(n ? `Gespeichert: ${n} ${n === 1 ? "Woche" : "Wochen"}.` : "Keine Änderungen.", true);
  }
  /** ✕ verwerfen: ohne Änderungen gleich zurück, sonst nachfragen. */
  function abbrechen() {
    const n = EN() ? EN().aenderungen().length : 0;
    const raus = () => { if (EN()) EN().beenden(); ende(); try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); } };
    if (!n) { raus(); return; }
    const ov = window.V59.blatt("k4-ent", `<div class="blatt-titel"><h2 id="v59-ov-h" tabindex="-1">Änderungen verwerfen?</h2>
      <p class="sub">${n} ${n === 1 ? "Woche ist" : "Wochen sind"} geändert und noch nicht gespeichert. Verwerfen stellt den gespeicherten Plan wieder her.</p></div>
      <div class="blatt-fuss"><button type="button" class="btn" data-x>Weiter bearbeiten</button><button type="button" class="btn primary" data-k4weg>Verwerfen</button></div>`);
    ov.querySelector("[data-k4weg]").onclick = () => { window.V59.schliessen(); raus(); };
  }
  /** Eine Änderung in den Entwurf (V66UI.aendern geht im Bearbeiten-Modus nie in den Speicher); Fehler als Meldung. */
  async function schritt(mo, a) {
    let f = null; try { f = await M().aendern(mo, a); } catch (e) { console.error(e); f = "Änderung nicht möglich"; }
    if (f) meldung(f);
  }
  function meldung(t, gut) {
    const el = $("kal-meldung"); if (!el) return;
    el.textContent = t; el.hidden = !t; el.classList.toggle("gut", !!gut);
    clearTimeout(ST.mT); if (t) ST.mT = setTimeout(() => { el.hidden = true; }, 4500);
  }
  /** Leiste oben (✕, Titel, ✓), Wochenkarte der Woche oben in der Liste und die schwebenden Knöpfe (✨, ↶, ↷). */
  function editZeichnen() {
    const bar = $("kal-ebar"), karte = $("kal-wkarte"), fab = $("kal-fab");
    if (!bar || !karte || !fab) return;
    bar.hidden = karte.hidden = fab.hidden = !ST.edit;
    if (!ST.edit) { bar.innerHTML = karte.innerHTML = fab.innerHTML = ""; return; }
    const W = V6(), E = EN(), n = E ? E.aenderungen().length : 0, mo = V78().montag(ST.sel || ST.editMo);
    bar.innerHTML = `<button type="button" class="btn rp-ib k4-eb-x" data-k4ex aria-label="Bearbeiten beenden, Änderungen verwerfen">${W.icon("schliessen", 20)}</button>
      <div class="k4-eb-t"><b>Bearbeiten</b><small>${n ? `${n} ${n === 1 ? "Woche" : "Wochen"} geändert · noch nicht gespeichert` : "noch keine Änderung"}</small></div>
      <button type="button" class="btn rp-ib primary k4-eb-ok" data-k4eok aria-label="Speichern">${W.icon("haken", 20)}</button>`;
    bar.querySelector("[data-k4ex]").onclick = abbrechen;
    bar.querySelector("[data-k4eok]").onclick = speichern;
    karte.innerHTML = wochenKarte(mo);
    fab.innerHTML = `<button type="button" class="btn k4-fab-a" data-k4anp>${W.icon("funken", 18)} Woche anpassen</button>
      <button type="button" class="btn rp-ib" data-k4zur aria-label="Rückgängig"${E && E.kannZurueck() ? "" : " disabled"}>${W.icon("rueckgaengig", 20)}</button>
      <button type="button" class="btn rp-ib" data-k4vor aria-label="Wiederholen"${E && E.kannVor() ? "" : " disabled"}>${W.icon("vor", 20)}</button>`;
    fab.querySelector("[data-k4anp]").onclick = () => anpassenBlatt(mo);
    fab.querySelector("[data-k4zur]").onclick = () => { if (E && E.zurueck()) document.dispatchEvent(new CustomEvent("meinplan")); };
    fab.querySelector("[data-k4vor]").onclick = () => { if (E && E.vor()) document.dispatchEvent(new CustomEvent("meinplan")); };
    const kopf = ST.raster ? ST.raster.closest(".k4-kopf") : null;
    if (kopf && ST.box) ST.box.style.setProperty("--k4-oben", `${Math.round(kopf.getBoundingClientRect().height) + 8}px`);
  }
  /** Wochenkarte im Bearbeiten-Modus (Vorlage: Reg vs. HIT, HIT Zones, Training Load): locker gegen mittel/hart, Zonen, TL ≈ gegen den Bereich. */
  function wochenKarte(mo) {
    let d = null; try { d = zyklusDaten(mo); } catch (e) { console.error(e); }
    if (!d) return "";
    const W = V6(), A = d.drei.anteil, titel = V78().wochenTitel(d.w.K && d.w.K.w ? d.w.K.w.phase : null, d.k.art || null);
    const lo = A ? Math.round(A.locker * 100) : null, F = d.fokus, fs = F.reduce((s2, x) => s2 + x[1], 0);
    const tl = d.plan ? d.plan.tl : 0, max = Math.max(1, tl, d.bereich ? d.bereich[1] : 0) * 1.12, p = (x) => Math.max(0, Math.min(100, (100 * x) / max)).toFixed(1);
    return `<div class="k4-wkk"><div class="k4-wkk-t"><b>${esc(titel)}</b><small>KW ${W.isoWoche(mo)} · ${esc(V78().bereichText(mo))}</small></div>
      <div class="k4-wkk-z"><span>locker · Z3–Z5</span>${A ? `<span class="k4-wkk-v" aria-hidden="true"><i style="left:${lo}%"></i></span><b>${lo} % · ${100 - lo} %</b>` : `<b>–</b>`}</div>
      <div class="k4-wkk-z"><span>Zonen</span>${fs ? `<span class="v7-stapel k4-stapel">${F.map(([kk, m]) => `<i style="flex:${m};background:${ZFARBE(kk)}"></i>`).join("")}</span>` : `<b>–</b>`}</div>
      <div class="k4-wkk-z"><span>TL ≈</span><span class="k4-bal" aria-hidden="true">${d.bereich ? `<span class="k4-bal-ber" style="left:${p(d.bereich[0])}%;width:${(p(d.bereich[1]) - p(d.bereich[0])).toFixed(1)}%"></span>` : ""}<span class="k4-bal-w plan" style="width:${p(tl)}%"></span></span><b>${d.plan && d.plan.offen ? "mind. " : ""}${tl}${d.bereich ? ` <small>(${d.bereich[0]}–${d.bereich[1]})</small>` : ""}</b></div></div>`;
  }
  /** ✨ «Woche anpassen?» (Vorlage): was passiert, wie man Einheiten behält, Tipps; Anpassen = V66 «anpassen» in den Entwurf. */
  function anpassenBlatt(mo) {
    const W = V6();
    const ov = window.V59.blatt("k4-anp", `<div class="blatt-titel">${W.icon("funken", 30)}<h2 id="v59-ov-h" tabindex="-1">Woche anpassen?</h2><p class="sub">KW ${W.isoWoche(mo)} · ${esc(V78().bereichText(mo))}</p></div>
      <h3 class="abschnitt">Was passiert</h3><p>Alle Einheiten ab heute werden nach deiner Trainingsverfügbarkeit neu auf die Woche verteilt – um gesperrte Tage und Einheiten herum. Tests, Schwimmkurs und eigene Einheiten bleiben, wo sie sind.</p>
      <h3 class="abschnitt">Einheiten behalten</h3><p>Sperre eine Einheit (Schloss an der Einheit) oder den ganzen Tag (Schloss neben dem Datum), dann bleibt sie, wie sie ist.</p>
      <h3 class="abschnitt">Tipps</h3><p>Trage genug Zeit ein und sperre nur, was wirklich fest ist – sonst bleibt der Verteilung wenig Spielraum. Gekürzt oder weggelassen wird nur mit Meldung, nie still.</p>
      <div class="blatt-fuss"><button type="button" class="btn" data-x>${W.icon("schliessen", 16)} Abbrechen</button><button type="button" class="btn primary" data-k4anpok>${W.icon("funken", 16)} Anpassen</button></div>`);
    ov.querySelector("[data-k4anpok]").onclick = async () => { window.V59.schliessen(); await schritt(mo, { art: "anpassen" }); };
  }
  /** Griff antippen (oder Tastatur): Tag derselben Woche wählen. */
  function verschiebenBlatt(ds, uid) {
    const W = V6(), mo = V78().montag(ds), h = heute(), w = woche(mo), e = (w.tage.get(ds) || { plan: [] }).plan.find((x) => x.uid === uid);
    const tage = Array.from({ length: 7 }, (_, i) => add(mo, i)).filter((x) => x !== ds && x >= h && !(w.tage.get(x) && w.tage.get(x).t && w.tage.get(x).t.gesperrt) && !(w.tage.get(x) && w.tage.get(x).rennen));
    const ov = window.V59.blatt("k4-vs", `<div class="blatt-titel"><h2 id="v59-ov-h" tabindex="-1">Verschieben</h2><p class="sub">${esc(e ? e.titel : "Einheit")} · bisher ${esc(V78().tagText(ds))}</p></div>
      ${tage.length ? `<div class="k4-vs">${tage.map((x) => { const t = w.tage.get(x), n = t ? t.plan.length : 0; return `<button type="button" class="mp-zeile" data-k4nach="${x}"><span>${esc(V78().tagText(x))}</span><b>${n ? `${n} ${n === 1 ? "Einheit" : "Einheiten"}` : "frei"}</b>${W.icon("weiter", 16)}</button>`; }).join("")}</div>`
        : `<p class="hint">Kein anderer Tag dieser Woche ist frei wählbar (vergangen, gesperrt oder Renntag).</p>`}
      <p class="hint">Nur innerhalb derselben Woche; in eine andere Woche über «Entfernen» und «Training hinzufügen».</p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${W.icon("zurueck", 22)}</button></div>`);
    ov.querySelectorAll("[data-k4nach]").forEach((b) => (b.onclick = async () => { window.V59.schliessen(); await schritt(mo, { art: "verschieben", date: ds, uid, nach: b.dataset.k4nach }); }));
  }
  /** Ziehen am Griff (Zeiger: Maus, Finger, Stift): Geist folgt, Zieltag derselben Woche leuchtet, Ansicht scrollt am Rand mit; ohne Bewegung = antippen. */
  function ziehen(griff, zeile, ev) {
    if (ev.button > 0) return;
    const ds = zeile.dataset.k4d, uid = zeile.dataset.k4e, mo = V78().montag(ds), h = heute(), sc = scroller();
    const r = zeile.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY, dy = y0 - r.top;
    let geist = null, ziel = null, y = y0, lauf = 0, aktiv = false;
    try { griff.setPointerCapture(ev.pointerId); } catch (e) { /* ältere Browser */ }
    ev.preventDefault();
    const markieren = (el) => { ST.box.querySelectorAll(".k4-tag.ziel").forEach((t) => t !== el && t.classList.remove("ziel")); if (el) el.classList.add("ziel"); };
    const finde = (cx, cy) => {
      const el = document.elementFromPoint(cx, cy), t = el && el.closest ? el.closest(".k4-tag[data-k4tag]") : null, d = t ? t.dataset.k4tag : null;
      return d && d !== ds && d >= h && V78().montag(d) === mo && !t.classList.contains("gesperrt") ? t : null;
    };
    const rand = () => {
      if (!aktiv) return;
      const kopf = ST.raster ? ST.raster.closest(".k4-kopf") : null, oben = kopf ? kopf.getBoundingClientRect().bottom : 0, unten = window.innerHeight - 90;
      if (y < oben + 36) sc.scrollTop -= 10; else if (y > unten) sc.scrollTop += 10;
      lauf = requestAnimationFrame(rand);
    };
    const bewegen = (e) => {
      y = e.clientY;
      if (!aktiv) {
        if (Math.abs(e.clientY - y0) < 6 && Math.abs(e.clientX - x0) < 6) return;
        aktiv = true; geist = zeile.cloneNode(true); geist.classList.add("k4-geist"); geist.removeAttribute("id");
        Object.assign(geist.style, { left: `${r.left}px`, width: `${r.width}px`, top: `${r.top}px` });
        document.body.appendChild(geist); zeile.classList.add("k4-zieht"); lauf = requestAnimationFrame(rand);
      }
      geist.style.top = `${e.clientY - dy}px`;
      const t = finde(e.clientX, e.clientY); ziel = t ? t.dataset.k4tag : null; markieren(t);
    };
    const fertig = async (e, abbruch) => {
      griff.removeEventListener("pointermove", bewegen); griff.removeEventListener("pointerup", hoch); griff.removeEventListener("pointercancel", weg);
      cancelAnimationFrame(lauf); if (geist) geist.remove(); zeile.classList.remove("k4-zieht"); markieren(null);
      if (!aktiv) { if (!abbruch) verschiebenBlatt(ds, uid); return; }
      if (!abbruch && ziel) await schritt(mo, { art: "verschieben", date: ds, uid, nach: ziel });
      else if (!abbruch) meldung("Nur auf einen kommenden, nicht gesperrten Tag derselben Woche.");
    };
    const hoch = (e) => fertig(e, false), weg = (e) => fertig(e, true);
    griff.addEventListener("pointermove", bewegen); griff.addEventListener("pointerup", hoch); griff.addEventListener("pointercancel", weg);
  }

  /* ---------------- Zyklus (V7.9 zyklus-1.0 und fitness-prognose-1.0, Vorlage «Zyklus»): Raster je Woche und vier Karten ---------------- */
  const ZS = { mo: null, offen: false, PR: null };
  const hmT = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h`;
  const ZAEHLT = (e) => ["rad", "lauf", "schwimm"].includes(e.sport) || e.art === "draussen";        // wie die Wochenköpfe (V7.7: draussen zählt mit)
  const ZNAME = (k) => { const V = window.V64, Z = V6().ZONEN || {}; return (V && V.ZNAME && V.ZNAME[k]) || (Z[k] ? `${Z[k].kurz} ${Z[k].name}`.trim() : String(k).toUpperCase()); };
  const ZFARBE = (k) => { const V = window.V64, Z = V6().ZONEN || {}, kk = (V && V.FARBE && V.FARBE[k]) || k; return Z[kk] ? `var(${Z[kk].css})` : "var(--muted)"; };
  const SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  function tlVon(tage, bz) { let tl = 0, offen = false; for (const t of tage || []) if (!t.rennen) for (const e of t.einheiten || []) if (ZAEHLT(e)) { const S = V66().schaetzung(e, bz); if (isNum(S.tl)) tl += S.tl; else offen = true; } return { tl: Math.round(tl), offen }; }
  /** Kennzahlen einer Woche für die Karten. */
  function zyklusDaten(mo) {
    const w = woche(mo), K = w.K; if (!K) return null;
    const h = heute(), k = w.kopf || {}, vor = tlVon((K.w0 || K.w0roh || K.w).tage, w.bz), bereich = V78().bereich(vor.tl);
    let vf = 0, offen = 0; const alle = [];
    for (const t of K.w.tage) {
      const v = K.verf ? K.verf(t.date) : null;
      if (!v || v.min == null) { if (!(v && Array.isArray(v.sport) && !v.sport.length)) offen++; } else vf += v.min;
      if (w.gilt && !t.rennen) for (const e of t.einheiten || []) alle.push(e);
    }
    return { w, k, gilt: w.gilt, plan: w.gilt ? { tl: k.planTl || 0, offen: !!k.tlOffen } : null, ist: mo <= h ? Math.round(k.istTl || 0) : null,
      vor, bereich, vf, vfOffen: offen, planMin: w.gilt ? k.planMin || 0 : 0, drei: V78().drei(alle, window.V64 ? window.V64.DREI : null), fokus: V78().fokus(alle) };
  }
  /** Fitness ab heute bis zum Hauptrennen (fitness-prognose-1.0) – einmal je Zeichnen. */
  function prognose() {
    if (ZS.PR) return ZS.PR;
    const FK = window.FK, PM = C.pmc ? C.pmc() : null, h = heute(), out = (ZS.PR = { tag: new Map(), ziel: null, ohne: new Set(), stunde: new Set(), bis: null, PM, FK });
    if (!FK || !PM || !PM.length || !FK.pmcMorgen) return out;
    const A0 = FK.pmcMorgen(PM, h); if (!A0 || !isNum(A0.fitness)) return out;
    let PL = null; try { PL = window.V75UI && window.V75UI.plan ? window.V75UI.plan() : null; } catch (e) { console.error(e); }
    const haupt = PL && PL.S && PL.S.haupt && PL.S.haupt.date > h ? PL.S.haupt : null, bis = haupt ? haupt.date : add(h, 21), nah = add(h, 20);
    const RW = new Map(); if (PL && Array.isArray(PL.R)) for (const r of PL.R) RW.set(r.woche, r);
    const L = new Map();
    for (let d = h; d < bis; d = add(d, 1)) {
      let x = 0;
      const ist = d === h ? (C.D.activities || []).filter((a) => a && a.date === d && (!FK.zaehlt || FK.zaehlt(a))) : [];
      if (ist.length) x = ist.reduce((s2, a) => s2 + (isNum(a.tss) ? a.tss : 0), 0);
      else if (d <= nah) {                                                 // Mein Plan wie das Tagesblatt (V66UI.lastGeplant: TL ≈, sonst Last pro Stunde der Sportart)
        const w = woche(V78().montag(d)), t = w.K && w.K.w.tage.find((y) => y.date === d);
        if (t && !t.rennen) for (const e of t.einheiten || []) if (ZAEHLT(e)) { const q = M().lastGeplant(e, w.bz); if (isNum(q.tl)) { x += q.tl; if (q.aus === "stunde") out.stunde.add(e.titel); } else out.ohne.add(SPW[e.sport] || e.titel); }
      }
      else { const r = RW.get(V78().montag(d)); if (r) { const Wl = V78().wochenLast(r, PL.ba); Wl.ohne.forEach((s) => out.ohne.add(SPW[s] || s)); x = Wl.tl / 7; } }
      L.set(d, x);
    }
    const reihe = (f) => V78().prognose(A0.fitness, h, bis, (d) => L.get(d) * f), M0 = reihe(1), lo = reihe(1 - V78().SPANNE), hi = reihe(1 + V78().SPANNE);
    M0.forEach((x, i) => out.tag.set(x.date, { f: x.f, lo: lo[i].f, hi: hi[i].f }));
    out.bis = bis;
    if (haupt) { const z = out.tag.get(bis); out.ziel = { name: haupt.name || haupt.short || "Hauptrennen", date: bis, f: Math.round(z.f), lo: Math.round(z.lo), hi: Math.round(z.hi) }; }
    return out;
  }
  /** Fitness zu Beginn des Tages ds: gemessen bis heute, danach ≈ aus der Prognose. */
  function fitAm(ds) {
    const P0 = prognose(), h = heute();
    if (ds <= h) { const A = P0.FK && P0.PM && P0.PM.length ? P0.FK.pmcMorgen(P0.PM, ds) : null; return A && isNum(A.fitness) ? { f: A.fitness, gemessen: true } : null; }
    const x = P0.tag.get(ds); return x ? Object.assign({ gemessen: false }, x) : null;
  }
  function fitnessSVG(von, ende, selEnde) {
    const P0 = prognose(), h = heute(), pk = [];
    for (let d = V78().montag(von); d <= ende; d = add(d, 7)) { const x = fitAm(d); if (x) pk.push(Object.assign({ d }, x)); }
    if (P0.ziel && !pk.some((x) => x.d === P0.ziel.date)) { const x = fitAm(P0.ziel.date); if (x) pk.push(Object.assign({ d: P0.ziel.date }, x)); }
    if (pk.length < 2) return "";
    const W0 = 320, H0 = 92, t0 = Date.parse(pk[0].d), t1 = Date.parse(pk[pk.length - 1].d);
    const werte = pk.flatMap((x) => [x.f, isNum(x.lo) ? x.lo : x.f, isNum(x.hi) ? x.hi : x.f]), lo = Math.min(...werte) - 2, hi = Math.max(...werte) + 2;
    const X = (d) => (8 + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W0 - 16)).toFixed(1), Y = (f) => (H0 - 10 - ((f - lo) / Math.max(1, hi - lo)) * (H0 - 22)).toFixed(1);
    const g = pk.filter((x) => x.gemessen), p = pk.filter((x) => !x.gemessen), p0 = g.length ? [g[g.length - 1]].concat(p) : p;
    const band = p.length ? `<polygon points="${p0.map((x) => `${X(x.d)},${Y(isNum(x.hi) ? x.hi : x.f)}`).concat(p0.slice().reverse().map((x) => `${X(x.d)},${Y(isNum(x.lo) ? x.lo : x.f)}`)).join(" ")}" style="fill:var(--mon-fit);fill-opacity:.18"/>` : "";
    const linie = (L, gestr) => (L.length > 1 ? `<polyline points="${L.map((x) => `${X(x.d)},${Y(x.f)}`).join(" ")}" style="fill:none;stroke:var(--mon-fit);stroke-width:2${gestr ? ";stroke-dasharray:4 4" : ""}"/>` : "");
    const sel = pk.find((x) => x.d === selEnde), ziel = P0.ziel ? pk.find((x) => x.d === P0.ziel.date) : null;
    const hx = X(h);
    return `<svg class="k4-fit" viewBox="0 0 ${W0} ${H0}" role="img" aria-label="Fitness je Woche, gemessen und mit dem Plan fortgeschrieben">${band}
      <line x1="${hx}" y1="4" x2="${hx}" y2="${H0 - 6}" style="stroke:var(--line);stroke-width:1"/>${linie(g, false)}${linie(p0, true)}
      ${sel ? `<circle cx="${X(sel.d)}" cy="${Y(sel.f)}" r="4.5" style="fill:var(--fg)"/>` : ""}${ziel ? `<circle cx="${X(ziel.d)}" cy="${Y(ziel.f)}" r="4.5" style="fill:var(--race)"/>` : ""}
      <text x="${hx}" y="${H0 - 1}" text-anchor="middle" style="fill:var(--muted);font-size:9px">heute</text></svg>`;
  }
  function balken(L, max, bereich) {
    const p = (x) => Math.max(0, Math.min(100, (100 * x) / max));
    const band = bereich ? `<span class="k4-bal-ber" style="left:${p(bereich[0]).toFixed(1)}%;width:${(p(bereich[1]) - p(bereich[0])).toFixed(1)}%"></span>` : "";
    return L.map(([name, x, art]) => `<div class="k4-bal-z"><span>${esc(name)}</span><span class="k4-bal" aria-hidden="true">${band}<span class="k4-bal-w ${art}" style="width:${p(x).toFixed(1)}%"></span></span><b>${x}</b></div>`).join("");
  }
  function zyklusKarten(mo) {
    const W = V6(), d = zyklusDaten(mo); if (!d) return `<p class="warn-t">Woche nicht berechenbar.</p>`;
    const h = heute();
    // 1 Gesamtumfang: TL ≈ Mein Plan und absolviert gegen den Bereich des Vorschlags, Verfügbarkeit
    const zeilen = [d.plan ? ["Mein Plan", d.plan.tl, "plan"] : null, isNum(d.ist) ? ["absolviert", d.ist, "ist"] : null].filter(Boolean);
    const max = Math.max(1, ...zeilen.map((z) => z[1]), d.bereich ? d.bereich[1] : 0) * 1.12, lage = d.plan ? V78().lage(d.plan.tl, d.bereich) : null;
    const LAGE = { unter: "unter dem Bereich des Vorschlags", im: "im Bereich des Vorschlags", ueber: "über dem Bereich des Vorschlags" };
    const knapp = !d.vfOffen && d.vf > 0 && d.planMin > 0.9 * d.vf;
    const vfWert = d.vfOffen === 7 ? "offen" : `${hmT(d.vf)}${d.vfOffen ? ` + ${d.vfOffen} ${d.vfOffen === 1 ? "Tag" : "Tage"} offen` : ""}`;
    const k1 = `<div class="card k4-z"><h3 class="abschnitt">${W.icon("uhr", 16)} Gesamtumfang</h3>
      <div class="k4-z-zahl"><b>${d.plan ? (d.plan.offen ? "mind. " : "") + d.plan.tl : isNum(d.ist) ? d.ist : "–"}</b><span>TL ${d.plan ? "≈ Mein Plan" : "absolviert"}</span>${d.bereich ? `<small>Bereich ${d.bereich[0]}–${d.bereich[1]}</small>` : ""}</div>
      ${zeilen.length ? balken(zeilen, max, d.bereich) : ""}
      ${lage ? `<p class="hint">Mein Plan liegt ${esc(LAGE[lage])}. Bereich = TL ≈ des Wochenvorschlags (${d.vor.tl}) ± 7,5 % – eigene Festlegung (${esc(V78().VERSIONS.zyklus)}).</p>` : ""}
      <button type="button" class="mp-zeile k4-vf" data-k4vf><span>${knapp ? `<i class="k4-punkt" aria-hidden="true"></i>` : ""}Trainingsverfügbarkeit</span><b>${esc(vfWert)}</b>${W.icon("weiter", 16)}</button>
      ${knapp ? `<p class="warn-t">Mein Plan braucht ${esc(hmT(d.planMin))} von ${esc(hmT(d.vf))} – dein Training kann leiden, wenn die Zeit knapp ist. Mehr Zeit eintragen oder die Woche anpassen.</p>` : ""}</div>`;
    // 2 Fitness-Entwicklung (fitness-prognose-1.0)
    const P0 = prognose(), ende = add(mo, 7), fE = fitAm(ende), z = P0.ziel;
    const von = add(mo < V78().montag(h) ? mo : V78().montag(h), -42), bisC = z ? z.date : P0.bis || add(h, 21);
    const ohne = [...P0.ohne], std = [...P0.stunde];
    const k2 = `<div class="card k4-z"><h3 class="abschnitt">${W.icon("trend", 16)} Fitness-Entwicklung</h3>
      <div class="k4-z-zahl">${z ? `<b>≈ ${z.f}</b><span>Fitness am ${esc(z.name)}</span><small>Band ${z.lo}–${z.hi}</small>` : `<b>${fE ? (fE.gemessen ? "" : "≈ ") + Math.round(fE.f) : "–"}</b><span>Fitness Ende der Woche</span>`}</div>
      ${fitnessSVG(von, bisC, ende)}
      ${z && fE ? `<p class="kw-leg"><i class="k4-pkt" style="background:var(--fg)"></i>Ende dieser Woche ${fE.gemessen ? "" : "≈ "}${Math.round(fE.f)} · <i class="k4-pkt" style="background:var(--race)"></i>${esc(z.name)} ≈ ${z.f}</p>` : ""}
      <p class="hint">Bis heute gemessen (pmc-2.1), danach fortgeschrieben (gestrichelt): bis drei Wochen voraus mit Mein Plan (TL ≈), dann mit den Wochenstunden der Steigerung × deiner Last pro Stunde je Sportart. Einheiten ohne TL ≈ (z. B. Tests, Schwimmen ohne CSS-Test) mit deiner Last pro Stunde der Sportart${std.length ? ` (${esc(std.slice(0, 3).join(", "))}${std.length > 3 ? " …" : ""})` : ""}. Band: 7,5 % weniger bzw. mehr Last. Ein Modell (${esc(V78().VERSIONS.prognose)}), keine Vorhersage${ohne.length ? `; nicht gezählt: ${esc(ohne.slice(0, 3).join(", "))}` : ""}.</p></div>`;
    // 3 Intensitätsverteilung (tid-1.0)
    const A = d.drei.anteil, pc = (x) => Math.round(x * 100);
    const k3 = `<div class="card k4-z"><h3 class="abschnitt">${W.icon("tacho", 16)} Intensitätsverteilung</h3>
      ${A ? `<span class="v7-stapel k4-stapel">${[["locker", "--zc-z2"], ["mittel", "--zc-z3"], ["hart", "--zc-z5"]].filter(([k]) => d.drei[k] > 0).map(([k, v]) => `<i style="flex:${d.drei[k]};background:var(${v})"></i>`).join("")}</span>
        <p class="kw-leg"><i style="background:var(--zc-z2)"></i>locker ${pc(A.locker)} % · <i style="background:var(--zc-z3)"></i>mittel ${pc(A.mittel)} % · <i style="background:var(--zc-z5)"></i>hart ${pc(A.hart)} %</p>`
        : `<p class="hint">${d.gilt ? "Keine geplanten Rad- oder Laufminuten mit Ziel." : "Für diese Woche war kein eigener Plan gespeichert."}</p>`}
      <p class="hint">Rad und Laufen nach den Zielen der Abschnitte von Mein Plan (tid-1.0): locker = Z1–Z2 und Renntempo, mittel = Z3, hart = Z4–Z5.</p></div>`;
    // 4 Fokus der Woche
    const F = d.fokus, fs = F.reduce((s2, x) => s2 + x[1], 0);
    const k4 = `<div class="card k4-z"><h3 class="abschnitt">${W.icon("fokus", 16)} Fokus der Woche</h3>
      ${fs ? `<span class="v7-stapel k4-stapel">${F.map(([kk, m]) => `<i style="flex:${m};background:${ZFARBE(kk)}"></i>`).join("")}</span>
        <p class="k4-chips">${F.slice(0, 6).map(([kk, m]) => `<span class="k4-chip"><i class="zpunkt" style="--zc:${ZFARBE(kk)}"></i>${esc(ZNAME(kk))} · ${esc(hmT(m))}</span>`).join("")}</p>`
        : `<p class="hint">Keine geplanten Abschnitte.</p>`}
      <p class="hint">Minuten je Zone aus den Abschnitten aller Einheiten von Mein Plan, ohne Pausen.</p></div>`;
    return k1 + k2 + k3 + k4;
  }
  function zyklusRaster() {
    const W = V6(), h = heute(), R = ZS.offen ? V78().monatsRaster(ZS.mo) : V78().raster(ZS.mo, 2);
    const zeilen = R.map((wk) => {
      const w = woche(wk.montag), k = w.kopf || {}, titel = V78().wochenTitel(w.K && w.K.w ? w.K.w.phase : null, k.art || null);
      const zahlen = w.gilt && k.planMin ? `${hmT(k.planMin)} · ${k.tlOffen ? "mind. " : ""}${k.planTl}` : wk.montag <= h && k.istMin ? `absolviert ${hmT(k.istMin)} · ${Math.round(k.istTl || 0)}` : "–";
      return `<button type="button" class="k4-zw${wk.montag === ZS.mo ? " sel" : ""}${wk.montag === V78().montag(h) ? " jetzt" : ""}" data-k4zw="${wk.montag}" aria-pressed="${wk.montag === ZS.mo}"
        aria-label="KW ${W.isoWoche(wk.montag)}: ${esc(titel)}, ${esc(zahlen)}"><span class="k4-zw-kw"><small>KW</small>${W.isoWoche(wk.montag)}</span><b>${esc(titel)}</b><small>${esc(zahlen)}</small></button>`;
    }).join("");
    return `<div class="k4-zw-liste" role="group" aria-label="Wochen">${zeilen}</div>
      <button type="button" class="k4-griff" data-k4zgriff aria-expanded="${ZS.offen}" aria-label="${ZS.offen ? "Zwei Wochen zeigen" : "Ganzen Monat zeigen"}"><span></span></button>`;
  }
  /** Zyklus für die Woche mo: im Kopf das Raster mit einer Zeile je Woche, darunter die vier Karten und «Plan und absolviert» (V66UI). */
  N.zyklus = function (box, raster, titel, sub, mo, neu) {
    if (!bereit()) { box.innerHTML = `<p class="hint">Kalender wird geladen …</p>`; return; }
    ST.KC = new Map(); ZS.PR = null; ZS.mo = V78().montag(mo || heute());
    raster.innerHTML = zyklusRaster();
    raster.querySelectorAll("[data-k4zw]").forEach((b) => (b.onclick = () => { if (window.APP && window.APP.kalenderWoche) window.APP.kalenderWoche(b.dataset.k4zw); }));
    const g = raster.querySelector("[data-k4zgriff]"); if (g) g.onclick = () => { ZS.offen = !ZS.offen; N.zyklus(box, raster, titel, sub, ZS.mo, neu); };
    if (titel) titel.textContent = V78().monatText(ZS.mo);
    if (sub) sub.textContent = `KW ${V6().isoWoche(ZS.mo)} · ${V78().bereichText(ZS.mo)}`;
    let ausw = ""; try { ausw = M().wocheHTML(ZS.mo, { nurAuswertung: true }); } catch (e) { console.error(e); }
    box.innerHTML = `${zyklusKarten(ZS.mo)}<h3 class="abschnitt k4-z-ab">Plan und absolviert</h3>${ausw}
      <button type="button" class="btn k4-inliste" data-k4inliste>${V6().icon("kalender", 16)} Tage dieser Woche in der Liste</button>`;
    try { M().wocheBinden(box, ZS.mo, neu); } catch (e) { console.error(e); }
    const v = box.querySelector("[data-k4vf]"); if (v) v.onclick = () => M().verfuegbarkeitWoche && M().verfuegbarkeitWoche(null);
    const l = box.querySelector("[data-k4inliste]"); if (l) l.onclick = () => window.APP && window.APP.kalenderListe && window.APP.kalenderListe(ZS.mo);
  };
  N.stand = () => ({ von: ST.von, bis: ST.bis, sel: ST.sel, offen: ST.offen, ms: ST.ms });
})();
