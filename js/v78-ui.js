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
    const W = V6(), h = heute(), R = ST.offen ? V78().monatsRaster(ST.sel) : V78().raster(ST.sel, 2), mon = new Date(ST.sel + "T12:00:00Z").getUTCMonth();
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
      <button type="button" class="k4-griff" data-k4griff aria-expanded="${ST.offen}" aria-label="${ST.offen ? "Raster zuklappen" : "Ganzen Monat zeigen"}"><span></span></button>`;
  }

  /* ---------------- Liste ---------------- */
  function einheitHTML(e, d, w, erl) {
    const W = V6(), S = V66().schaetzung(e, w.bz);
    const q = e.kraft_plan ? "Krafttraining" : e.art === "draussen" ? "draussen" : e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag";
    let prof = ""; try { prof = e.teile && e.teile.length && e.teile[0][0] !== "ohne" && P().profil ? W.profilSVG(P().profil(e), { h: 32 }) : ""; } catch (err) { prof = ""; }
    return `<button type="button" class="k4-e${erl ? " erl" : ""}${d.ds < heute() && !erl ? " verpasst" : ""}" data-k4e="${esc(e.uid)}" data-k4d="${d.ds}">
      <span class="mo-sp" style="--sp:${SPF(e.sport)}">${W.sportIcon(e.sport, 16)}</span>
      <span class="k4-et"><b>${e.gesperrt ? `<span class="mp-schloss">${W.icon("schloss", 12)}</span>` : ""}${esc(e.titel)}${erl ? ` <span class="k4-haken" title="erledigt">${W.icon("haken", 13)}</span>` : ""}</b>
        <small>${esc([e.uhrzeit, V78().zeile(e.dauer, S)].filter(Boolean).join(" · "))} · <span class="k4-q">${esc(q)}</span></small></span>
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
    return `<div class="k4-tag${d.ds === h ? " heute" : ""}${d.ds < h ? " vorbei" : ""}" id="k4-${d.ds}" data-k4tag="${d.ds}">
      <div class="k4-tk"><b>${esc(V78().tagText(d.ds))}${d.ds === h ? ` <span class="k4-heute">heute</span>` : ""}${d.t && d.t.gesperrt ? ` ${W.icon("schloss", 12)}` : ""}</b>
        <span>${n ? `<small>${n} ${n === 1 ? "Einheit" : "Einheiten"}</small>` : ""}<button type="button" class="btn rp-ib k4-mehr" data-k4blatt="${d.ds}" aria-label="${esc(V78().tagText(d.ds))}: Tagesblatt öffnen">${W.icon("mehr", 18)}</button></span></div>
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
    box.innerHTML = `<button type="button" class="btn k4-mehr-w" data-k4frueher>Frühere Wochen</button>${wochen.map(wocheHTML).join("")}
      <button type="button" class="btn k4-mehr-w" data-k4spaeter>Weitere Wochen</button>
      <p class="hint">Mein Plan (${esc(V66().VERSIONS.eigenplan)}) mit Absolviertem aus Garmin; TL ≈ und Distanz ≈ sind Schätzungen aus deinem Zonenprofil (${esc(V66().VERSIONS.tl)}). Enduco erscheint hier nicht (${esc(V78().VERSIONS.kalender)}).</p>`;
    ST.ms = Date.now() - t0;
    rasterZeichnen(); kopfText(ST.sel); binden();
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
      if (ds !== ST.sel) { const alt = ST.sel; ST.sel = ds; kopfText(ds); if (!ST.offen || V78().montag(alt).slice(0, 7) !== V78().montag(ds).slice(0, 7) || true) rasterZeichnen(); }
      return;
    }
  }
  function binden() {
    const B = ST.box;
    B.querySelectorAll("[data-k4blatt]").forEach((b) => (b.onclick = () => window.APP && window.APP.tagBlatt && window.APP.tagBlatt(b.dataset.k4blatt)));
    B.querySelectorAll("[data-k4e]").forEach((b) => (b.onclick = () => M().einheit(b.dataset.k4d, b.dataset.k4e, { zurueck: () => { if (window.V59) window.V59.schliessen(); N.neu(); } })));
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
  N.stand = () => ({ von: ST.von, bis: ST.bis, sel: ST.sel, offen: ST.offen, ms: ST.ms });
})();
