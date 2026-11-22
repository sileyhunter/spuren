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
  const ST = { von: null, bis: null, sel: null, offen: false, zeilen: 2, box: null, raster: null, titel: null, sub: null, KC: new Map(), lauf: 0 };
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
      // V9.1 zusammen-1.0: eine passende absolvierte Aktivität ersetzt die geplante Einheit (ein Eintrag mit Haken); nicht zugeordnete Pläne bleiben sichtbar
      const Z = window.V91 ? window.V91.zuordnen(plan, akt, { sportVon: V6().sportVon }) : null;
      let erl;
      if (Z) erl = plan.map((e) => Z.zu.has(e.uid));
      else { const frei = akt.map((a) => (V6().sportVon ? V6().sportVon(a) : a.sport)); erl = plan.map((e) => { const j = frei.indexOf(e.sport); if (j >= 0) { frei.splice(j, 1); return true; } return false; }); }
      tage.set(ds, { ds, t, plan, erl, Z, akt, tests: tests.filter((x) => x.date === ds), rennen: t && t.rennen ? t.rennen : null, v: K && K.verf && ds >= heute() ? K.verf(ds) : null });
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

  /** V9.3 kugel-1.0: Kugel einer Einheit – senkrechte Streifen je Zone des Hauptteils (V93.kugel), links die höchste. */
  function kugelHTML(e) {
    const V = window.V93, Z = V6().ZONEN || {};
    let st = "";
    try { const S = V ? V.kugel(e.teile, window.V64 ? window.V64.FARBE : null) : []; st = S.length ? V.kugelStil(S, (z) => (Z[z] ? Z[z].farbe : null)) : ""; } catch (err) { st = ""; }
    return `<i class="k4-kugel" style="background:${st || zonenFarbe(e)}"></i>`;
  }
  /** V9.3 woche-look-1.0: Zustand eines Tages (Standard · von Hand gesetzt · gesperrt) wie in «Woche einstellen» (V92.zustand). */
  function zustandVon(d, w) {
    if (!d || d.ds < heute()) return "standard";
    if (d.t && d.t.gesperrt) return "gesperrt";
    try { return window.V92 && w && w.K ? (window.V92.zustand(w.K.verf, d.ds, null) === "hand" ? "hand" : "standard") : "standard"; } catch (e) { return "standard"; }
  }
  /** Zeit, die an einem von Hand gesetzten Tag gilt («1:30 h», «kein Training», «offen»). */
  function handZeit(d) {
    const v = d && d.v; if (!v) return "";
    if (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length)) return "kein Training";
    return v.min == null ? "offen" : v.min >= 60 ? `${Math.floor(v.min / 60)}:${String(v.min % 60).padStart(2, "0")} h` : `${v.min} min`;
  }

  /* ---------------- Raster ---------------- */
  function rasterHTML() {
    const W = V6(), h = heute(), R = ST.edit ? V78().raster(V78().montag(ST.sel) < ST.editMo ? ST.editMo : V78().montag(ST.sel), 1) : ST.offen ? V78().monatsRaster(ST.sel) : V78().raster(ST.sel, ST.zeilen === 1 ? 1 : 2), mon = new Date(ST.sel + "T12:00:00Z").getUTCMonth();
    // V9.3 woche-look-1.0 (Vorlage): sieben Spalten, die Woche des gewählten Tags in einer dunklen Pille; je Tag eine Pille mit weissen Sportsymbolen
    // (je Einheit eines, höchstens zwei) und je Einheit einer Kugel; vergangene Tage gefüllt, kommende mit Umriss; freier Tag = Kalender-✕ ohne Pille
    const kopf = `<div class="k4-r-kopf">${WT.map((t) => `<div class="k4-r-wt">${t}</div>`).join("")}</div>`, selMo = V78().montag(ST.sel);
    const zeilen = R.map((wk) => `<div class="k4-r-w${wk.montag === selMo ? " sel" : ""}" data-k4rw="${wk.montag}">` + wk.tage.map((ds) => {
      let d = null; try { d = tagDaten(ds); } catch (e) { d = null; }
      const syms = [], kug = [];
      if (d) {
        for (const a of d.akt) { if (d.Z && d.Z.von && d.Z.von.has(a.id)) continue; syms.push(V6().sportVon ? V6().sportVon(a) : a.sport); kug.push(`<i class="k4-kugel ist"></i>`); }
        for (const e of d.plan) { syms.push(e.sport); kug.push(kugelHTML(e)); }
      }
      const leer = d && !syms.length && !(d.tests || []).length && !d.rennen;
      const aus = ST.offen && new Date(ds + "T12:00:00Z").getUTCMonth() !== mon;
      const zs = d ? zustandVon(d, woche(V78().montag(ds))) : "standard";
      const pille = d && d.rennen ? `<span class="k4-r-p renn">${W.icon("flagge", 13)}</span>`
        : syms.length || (d && d.tests.length) ? `<span class="k4-r-p${ds < h ? " voll" : ""}${zs === "gesperrt" ? " gesp" : ""}">${zs === "gesperrt" ? `<i class="k4-r-lock">${W.icon("schloss", 10)}</i>` : ""}${syms.slice(0, 2).map((x) => `<i class="k4-r-ic">${W.sportIcon(x, 13)}</i>`).join("")}<span class="k4-r-k">${kug.slice(0, 3).join("")}${d && d.tests.length ? `<i class="k4-kugel test"></i>` : ""}</span></span>`
        : `<span class="k4-r-frei${leer ? "" : " leer"}"${zs === "hand" ? ` title="von Hand gesetzt"` : ""}>${leer ? W.icon("kalenderfrei", 17) : ""}</span>`;
      return `<button type="button" class="k4-r-t${ds === h ? " heute" : ""}${ds === ST.sel ? " sel" : ""}${aus ? " aus" : ""}${zs === "hand" ? " hand" : ""}" data-k4r="${ds}" aria-label="${esc(V78().tagText(ds))}${zs === "gesperrt" ? ", gesperrt" : zs === "hand" ? ", Zeit von Hand gesetzt" : ""}">
        <span class="k4-r-d">${+ds.slice(8)}</span>${pille}</button>`;
    }).join("") + `</div>`).join("");
    return `<div class="k4-r-gitter" role="group" aria-label="Kalender">${kopf}${zeilen}</div>`;
  }
  /** kalender-4.1: Griff in der Leiste unter dem Raster (wie die Vorlage), sonst unter dem Raster. */
  const griffHTML = (offen, attr) => `<button type="button" class="k4-griff" ${attr} aria-expanded="${offen}" aria-label="${offen ? "Raster zuklappen" : "Ganzen Monat zeigen"} – nach oben oder unten ziehen"><span></span></button>`;
  /** V9.3.2 woche-look-1.1 (Vorlage, Aufnahme 22.11. 23:06): den Griff ziehen – nach unten mehr Wochen (1 → 2 → Monat), nach oben weniger (Monat → 2 → 1);
   *  antippen wechselt wie bisher zwischen zwei Wochen und dem Monat. Gilt für Liste und Zyklus (ein Zustand). */
  const ZEILEN = [1, 2, "monat"];
  function zeilenSetzen(z) { ST.zeilen = z; ST.offen = z === "monat"; ZS.offen = ST.offen; }
  function griffZiehen(g) {
    if (g._zieh) return; g._zieh = true;
    let y0 = null, i0 = 1, bewegt = false;
    g.addEventListener("pointerdown", (ev) => { y0 = ev.clientY; i0 = Math.max(0, ZEILEN.indexOf(ST.zeilen)); bewegt = false; try { g.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture */ } });
    g.addEventListener("pointermove", (ev) => {
      if (y0 == null) return;
      const dy = ev.clientY - y0; if (Math.abs(dy) > 8) bewegt = true;
      const i = Math.max(0, Math.min(ZEILEN.length - 1, i0 + Math.trunc(dy / 44)));          // je 44 px eine Stufe
      if (bewegt && ZEILEN[i] !== ST.zeilen && typeof g._neu === "function") { zeilenSetzen(ZEILEN[i]); g._neu(); }
    });
    const ende = () => { y0 = null; };
    g.addEventListener("pointerup", ende); g.addEventListener("pointercancel", ende);
    g.addEventListener("click", (ev) => { if (bewegt) { bewegt = false; ev.preventDefault(); ev.stopImmediatePropagation(); return; } if (typeof g._klick === "function") g._klick(); });
  }
  /** Griff in der Leiste (kalender-4.1) oder unter dem Raster; derselbe Knopf bleibt beim Neuzeichnen stehen (sonst risse das Ziehen ab). neu = Ansicht neu zeichnen. */
  function griffSetzen(raster, html, onclick, neu) {
    const platz = document.getElementById("kal-griff");
    let g = platz && !platz.hidden ? platz.querySelector(".k4-griff") : null;
    if (platz && !platz.hidden) { if (!g) { platz.innerHTML = html; g = platz.firstElementChild; } }
    else if (raster) { raster.insertAdjacentHTML("beforeend", html); g = raster.lastElementChild; }
    if (!g) return;
    g.setAttribute("aria-expanded", String(ST.offen));
    g.setAttribute("aria-label", `${ST.offen ? "Raster zuklappen" : "Ganzen Monat zeigen"} – nach oben oder unten ziehen: ${ST.zeilen === "monat" ? "Monat" : ST.zeilen === 1 ? "eine Woche" : "zwei Wochen"}`);
    g._klick = onclick; g._neu = neu || onclick; g.onclick = null;
    griffZiehen(g);
  }
  /** kalender-4.1: Wochenleiste über der Liste – Phase | Wochenart, Tage, Stunden und Last der Woche, die gerade oben steht (Vorlage enduco). */
  function wochenZahlen(w, h) {
    const k = w.kopf || {};
    if (w.gilt && k.planMin) return { h: hmT(k.planMin), tl: `${k.tlOffen ? "mind. " : ""}${k.planTl}`, was: "Mein Plan" };
    if (w.mo <= h && k.istMin) return { h: hmT(k.istMin), tl: `${Math.round(k.istTl || 0)}`, was: "absolviert" };
    return null;
  }
  function wbarZeichnen(ds) {
    const el = document.getElementById("kal-wbar"); if (!el || el.hidden || ST.edit) return;
    const mo = V78().montag(ds), w = woche(mo), Z = wochenZahlen(w, heute());
    const titel = V78().wochenTitel(w.K && w.K.w ? w.K.w.phase : null, w.kopf ? w.kopf.art : null);
    // V9.3 woche-look-1.0: wie die Vorlage «Phase | Wochenart» und der Zeitraum; Stunden und TL ≈ stehen im Zyklus und in der Wochenkarte
    el.innerHTML = `<b>${esc(titel)}</b><span class="k4-wbar-z"${Z ? ` title="${esc(`${Z.h} · TL ≈ ${Z.tl} (${Z.was})`)}"` : ""}><span>${esc(V78().bereichText(mo))}</span></span>`;
  }

  /* ---------------- Liste ---------------- */
  /** Darf eine Einheit im Bearbeiten-Modus gezogen oder gesperrt werden? Nicht: vergangene oder gesperrte Tage, Tests, Kurs, Aktivitäten draussen
   *  (eigener Eintrag), nachgeholte Einheiten (Ampel). */
  const beweglich = (e, d) => d.ds >= heute() && !(d.t && d.t.gesperrt) && !["test", "kurs", "draussen"].includes(e.art) && !e.test && !(e.ampel && e.ampel.nachgeholt);
  function einheitHTML(e, d, w, erl) {
    const W = V6(), S = V66().schaetzung(e, w.bz);
    const q = e.kraft_plan ? "Krafttraining" : e.art === "draussen" ? "draussen" : e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag";
    let prof = ""; try {
      // V9.3 woche-look-1.0: in der Liste flacher abgestuft wie die Vorlage (lockere Teile nicht als dünne Linie): h' = 0,35 + 0,65 × h
      const pr = e.teile && e.teile.length && e.teile[0][0] !== "ohne" && P().profil ? P().profil(e) : null;
      prof = pr ? W.profilSVG(Object.assign({}, pr, { balken: pr.balken.map((b) => Object.assign({}, b, { h: 0.35 + 0.65 * b.h })) }), { h: 28 }) : "";
    } catch (err) { prof = ""; }
    // V9.3 woche-look-1.0: Schloss und weisses Sportsymbol vor dem Titel, darunter Dauer, Distanz ≈ und TL ≈ mit Abstand; die Quelle steht im Tagesblatt
    const dt = isNum(e.dauer) ? (e.dauer >= 60 ? `${Math.floor(e.dauer / 60)}:${String(Math.round(e.dauer % 60)).padStart(2, "0")} h` : `${Math.round(e.dauer)} min`) : "";
    const Z = window.V93 ? window.V93.zeile(dt, S && S.km, S && S.tl, { uhrzeit: e.uhrzeit }) : [V78().zeile(e.dauer, S)];
    const inhalt = `<span class="k4-et"><b>${e.gesperrt ? `<span class="mp-schloss">${W.icon("schloss", 13)}</span>` : ""}<span class="k4-ic" aria-hidden="true">${W.sportIcon(e.sport, 17)}</span>${esc(e.titel)}${erl ? ` <span class="k4-haken" title="erledigt">${W.icon("haken", 13)}</span>` : ""}</b>
        <small class="k4-ez">${Z.map((x) => `<span>${esc(x)}</span>`).join("")}<span class="k4-q">${esc(q)}</span></small></span>`;
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
    const akt = d.akt.map((a) => { const km = isNum(a.km) && a.km > 0 ? `${String(Math.round(a.km * 10) / 10).replace(".", ",")} km` : null, tl = isNum(a.tss) && a.tss > 0 ? `${Math.round(a.tss)} TL` : null, zu = d.Z && d.Z.von.get(a.id);
      return `<button type="button" class="k4-e ist" data-ex="${esc(a.id)}">
      <span class="k4-et"><b><span class="k4-ic" aria-hidden="true">${W.sportIcon(V6().sportVon ? V6().sportVon(a) : a.sport, 17)}</span>${esc(a.name || "Aktivität")} <span class="k4-haken">${W.icon("haken", 13)}</span></b><small class="k4-ez">${[W.dauerText(sek(a)), km, tl].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("")}<span class="sr-only">absolviert${zu ? ` · Passt zu: ${esc(zu.titel)}` : ""}</span></small></span></button>`; }).join("");
    // V9.1: zugeordnete Einheiten stehen nicht mehr daneben (nur im Bearbeiten-Modus, wo sie gezogen oder gesperrt werden)
    const sichtbar = d.plan.map((e, i) => ({ e, i })).filter((x) => ST.edit || !d.erl[x.i]);
    const plan = sichtbar.map((x) => einheitHTML(x.e, d, w, d.erl[x.i])).join("");
    const NAME = { stufentest: "Stufentest", check: "Laktat-Kurzcheck", css: "CSS-Test" };
    const tests = d.plan.some((e) => e.art === "test" || e.test) ? "" : d.tests.map((x) => `<p class="k4-zeile test"><i class="c-test"></i>${esc(NAME[x.kind] || x.kind)}${x.done ? " ✓" : x.status === "vorschlag" ? " · Vorschlag" : ""}</p>`).join("");
    const renn = d.rennen ? `<p class="k4-zeile renn">${W.icon("flagge", 15)} ${esc(d.rennen.name || "Rennen")}</p>` : "";
    const L = !akt && !plan && !tests && !renn ? V78().leer(d.v, d.ds < h) : null;
    const leer = L ? `<p class="k4-zeile k4-frei ${L.art}"><span class="k4-frei-x" aria-hidden="true">${L.art === "ruhe" ? W.icon("mond", 15) : W.icon("schliessen", 15)}</span>${esc(L.text)}</p>` : "";
    const n = sichtbar.length + d.akt.length;
    const amp = window.V74UI && w.gilt && d.t ? window.V74UI.kurz(d.t) : "";
    const gesp = !!(d.t && d.t.gesperrt);
    const zs = zustandVon(d, w), anz = window.V93 ? window.V93.anzahl(n) : n > 1 ? String(n) : "";
    const hand = zs === "hand" ? `<small class="k4-hand" title="Zeit von Hand gesetzt">${W.icon("uhr", 12)}${esc(handZeit(d))}</small>` : "";
    let rechts = `${hand}${anz ? `<span class="k4-anz" aria-label="${n} Einträge">${anz}</span>` : ""}`;
    if (ST.edit) {                                                             // V7.9 bearbeiten-1.0: Trainingsstatus je Tag (zu Tagesbeginn); V9.3.2: «Tag sperren» im Tagesblatt
      const f = ST.form ? ST.form.get(d.ds) : null, ts = f ? V78().status(f.fitness, f.ermuedung) : null, stu = V78().stufe(ts);
      const bal = window.V93 ? window.V93.balkenAnteil(ts) : stu ? stu.anteil : 0;
      rechts = `${hand}${ts != null ? `<span class="k4-st" title="Trainingsstatus zu Tagesbeginn (Ermüdung ÷ Fitness)">${f.prognose ? "≈ " : ""}${String(ts).replace(".", ",")}<i class="k4-st-b k4-st-${stu.k}" aria-hidden="true"><i style="width:${Math.round(bal * 100)}%"></i></i></span>` : ""}`;
    }
    return `<div class="k4-tag${d.ds === h ? " heute" : ""}${d.ds < h ? " vorbei" : ""}${gesp ? " gesperrt" : ""}" id="k4-${d.ds}" data-k4tag="${d.ds}">
      <div class="k4-tk"><b>${d.ds === ST.sel ? `<i class="k4-punkt" aria-hidden="true"></i>` : ""}${esc(V78().tagText(d.ds))}${d.ds === h ? ` <span class="k4-heute sr-only">heute</span>` : ""}${gesp ? ` <span class="k4-tlk" title="Tag gesperrt">${W.icon("schloss", 13)}</span>` : ""}</b>
        <span>${rechts}<button type="button" class="btn rp-ib k4-mehr" data-k4blatt="${d.ds}" aria-label="${esc(V78().tagText(d.ds))}: Tagesblatt öffnen">${W.icon("mehr", 18)}</button></span></div>
      ${amp}${renn}${akt}${plan}${tests}${leer}</div>`;
  }
  function wocheHTML(mo) {
    const W = V6(), w = woche(mo), k = w.kopf, hm = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h`;
    const titel = V78().wochenTitel(w.K && w.K.w ? w.K.w.phase : null, k ? k.art : null);
    const zahlen = k ? [w.gilt && k.planMin ? `Plan ${hm(k.planMin)}` : null, w.gilt && k.planTl ? `TL ≈ ${k.tlOffen ? "mind. " : ""}${k.planTl}` : null, k.istMin ? `absolviert ${hm(k.istMin)}` : null].filter(Boolean).join(" · ") : "";
    const tage = Array.from({ length: 7 }, (_, i) => tagHTML(w.tage.get(add(mo, i)), w)).join("");
    return `<section class="k4-woche" data-k4mo="${mo}">
      <div class="k4-wk"><div><b>${esc(titel)}</b><span title="${esc(zahlen)}">${esc(V78().bereichText(mo))}</span></div>
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
      box.innerHTML = wochen.map((m, i) => (i ? `<p class="k4-trenner k4-trenner2"><i aria-hidden="true">↓</i><span>Nächste Woche</span><i aria-hidden="true">↓</i></p>` : "") + wocheHTML(m)).join("") +
        `<p class="hint">Bearbeiten (${esc(V78().VERSIONS.bearbeiten)}): Einheit am Griff auf einen anderen Tag derselben Woche ziehen oder den Griff antippen; das Schloss hält eine Einheit oder einen Tag fest, wenn du die Woche anpasst. Gespeichert wird erst mit ✓; ↶ und ↷ gehen Schritte zurück und vor. Rechts der Trainingsstatus zu Tagesbeginn (${esc(V78().VERSIONS.status)}).</p>`;
    } else {
      ST.form = null;
      box.innerHTML = `<button type="button" class="btn k4-mehr-w" data-k4frueher>Frühere Wochen</button>${wochen.map(wocheHTML).join("")}
      <button type="button" class="btn k4-mehr-w" data-k4spaeter>Weitere Wochen</button>
      <p class="hint">Mein Plan (${esc(V66().VERSIONS.eigenplan)}) mit Absolviertem aus Garmin; TL ≈ und Distanz ≈ sind Schätzungen aus deinem Zonenprofil (${esc(V66().VERSIONS.tl)}). Enduco erscheint hier nicht (${esc(V78().VERSIONS.kalender)}).</p>`;
    }
    ST.ms = Date.now() - t0;
    rasterZeichnen(); kopfText(ST.sel); binden(); editZeichnen(); berichtZeichnen();
    if (opt.ziel) requestAnimationFrame(() => N.zu(opt.ziel, true));
  };
  function rasterZeichnen() {
    if (!ST.raster) return;
    ST.raster.innerHTML = rasterHTML();
    ST.raster.querySelectorAll("[data-k4r]").forEach((b) => (b.onclick = () => N.zu(b.dataset.k4r)));
    ST.raster.querySelectorAll("[data-k4kw]").forEach((b) => (b.onclick = () => window.APP && window.APP.kalenderWoche && window.APP.kalenderWoche(b.dataset.k4kw)));
    if (!ST.edit) griffSetzen(ST.raster, griffHTML(ST.offen, "data-k4griff"), () => { zeilenSetzen(ST.zeilen === "monat" ? 2 : "monat"); rasterZeichnen(); }, () => rasterZeichnen());
    const kopf = ST.raster.closest(".k4-kopf");                                 // V9.3.2: Raster ändert die Höhe (Griff) → Abstand beim Scrollen zum Tag nachführen
    if (kopf && ST.box) ST.box.style.setProperty("--k4-oben", `${Math.round(kopf.getBoundingClientRect().height) + 8}px`);
  }
  function kopfText(ds) {
    if (ST.titel) ST.titel.textContent = V78().monatText(ds);
    if (ST.sub) { const mo = V78().montag(ds); ST.sub.textContent = `KW ${V6().isoWoche(mo)} · ${V78().bereichText(mo)}`; }
    try { wbarZeichnen(ds); } catch (e) { console.error(e); }
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
  /** V9.2 umplanen-1.0: Bericht nach dem Umplanen oben im Kalender (bleibt bis zum Wegwischen; js/v92-ui.js). */
  function berichtZeichnen() {
    const el = $("kal-bericht"); if (!el) return;
    let h = ""; try { h = !ST.edit && window.V92UI && window.V92UI.berichtHTML ? window.V92UI.berichtHTML() : ""; } catch (e) { console.error(e); h = ""; }
    el.innerHTML = h; el.hidden = !h;
    if (h) window.V92UI.berichtBinden(el);
  }
  /** Nach einer Änderung (Ereignis «meinplan») neu zeichnen und die Stelle halten. */
  N.neu = function () { if (!ST.box || !ST.box.isConnected) return; const sc = scroller(), y = sc.scrollTop; N.zeichnen(ST.box, ST.raster, ST.titel, ST.sub); sc.scrollTop = y; };
  N.heute = function () { if (!bereit()) return; N.zu(heute()); };
  N.waehle = function (ds) { if (ds) ST.sel = ds; };

  /* ---------------- Bearbeiten (V7.9 bearbeiten-1.0, Vorlage «Bearbeiten») ---------------- */
  const EN = () => (P() && P().entwurf) || null;
  const $ = (id) => document.getElementById(id);
  N.imBearbeiten = () => !!ST.edit;
  /** Bearbeiten beginnen: die Woche oben in der Liste (frühestens die laufende) und die nächste; Leiste unten aus (body.k4-edit). */
  N.bearbeiten = function (mo) {
    if (!bereit() || !ST.box || ST.edit || !EN()) return;
    const h = heute();
    // bearbeiten-1.1 (V9.3.2): am Sonntag folgt in der laufenden Woche kein Tag mehr → gleich die Woche danach, wie die Vorlage
    const m = V78().bearbeitenAb(mo || ST.sel || h, h);
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
    fab.innerHTML = `<button type="button" class="btn rp-ib k4-fab-a" data-k4anp aria-label="Woche anpassen" title="Woche anpassen">${W.icon("funken", 22)}</button>
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
    const lo = A ? Math.round(A.locker * 100) : null, F = d.fokus;
    const tl = d.plan ? d.plan.tl : 0, max = Math.max(1, tl, d.bereich ? d.bereich[1] : 0) * 1.12, p = (x) => Math.max(0, Math.min(100, (100 * x) / max)).toFixed(1);
    // V9.3 woche-look-1.0 (Vorlage «Reg vs. HIT», «HIT Zones», «Training Load»): zwei Spalten – links locker gegen Z3–Z5 und TL ≈ gegen den Bereich,
    // rechts die Zonen als Gruppen Z1–Z5 (Breite ∝ Zeitanteil, leere Zone abgedunkelt) und der Status je Tag (Ermüdung ÷ Fitness am Tagesende, ≈ mit Mein Plan)
    const GR = [["z1", ["z1"]], ["z2", ["z2", "fatmax"]], ["z3", ["z3", "sweet"]], ["z4", ["z4"]], ["z5", ["vo2", "z5", "anaerob", "neuro", "sprint"]]];
    const zk = (k) => (window.V64 && window.V64.FARBE && window.V64.FARBE[k]) || k, sum = new Map(); let ges = 0;
    for (const [k, m] of F) { const z = zk(k); if (z === "pause" || z === "offen" || !isNum(m)) continue; sum.set(z, (sum.get(z) || 0) + m); ges += m; }
    const zonen = ges ? GR.map(([g, keys]) => {
      const t = keys.reduce((s2, k) => s2 + (sum.get(k) || 0), 0), seg = keys.filter((k) => sum.get(k)).map((k) => `<i style="flex:${sum.get(k)};background:${ZFARBE(k)}"></i>`).join("");
      return `<span class="k4-zgp${t ? "" : " leer"}" style="flex:${Math.max(0.1, t / ges).toFixed(3)};--zc:var(--zc-${g})" title="${esc(g.toUpperCase())}: ${Math.round((100 * t) / ges)} %">${seg}</span>`;
    }).join("") : "";
    return `<div class="k4-wkk"><div class="k4-wkk-t"><b>${esc(titel)}</b><small>${esc(V78().bereichText(mo))}</small></div>
      <div class="k4-wkk-g">
        <div class="k4-wkk-c"><div class="k4-wkk-l"><span>locker · Z3–Z5</span><b>${A ? `${lo} % · ${100 - lo} %` : "–"}</b></div>${A ? `<span class="k4-wkk-v" style="--lo:${lo}%" aria-hidden="true"><i style="left:${lo}%"></i></span>` : ""}</div>
        <div class="k4-wkk-c"><div class="k4-wkk-l"><span>Zonen</span></div>${zonen ? `<span class="k4-zgr" aria-hidden="true">${zonen}</span>` : `<b>–</b>`}</div>
        <div class="k4-wkk-c"><div class="k4-wkk-l"><span>TL ≈</span><b>${d.plan && d.plan.offen ? "mind. " : ""}${tl}</b></div><span class="k4-bal" aria-hidden="true">${d.bereich ? `<span class="k4-bal-ber" style="left:${p(d.bereich[0])}%;width:${(p(d.bereich[1]) - p(d.bereich[0])).toFixed(1)}%"></span>` : ""}<span class="k4-bal-w plan" style="width:${p(tl)}%"></span></span>${d.bereich ? `<small class="k4-wkk-b">Bereich ${d.bereich[0]}–${d.bereich[1]}</small>` : ""}</div>
        <div class="k4-wkk-c">${statusKurve(mo)}</div>
      </div>${fehltZeile(mo)}</div>`;
  }
  /** V9.3: Status (Ermüdung ÷ Fitness) am Ende jedes Tags der Woche als kleine Kurve; grünes Band = üblich (0,8–1,3, trainingsstatus-1.0), gewählter Tag gross. */
  function statusKurve(mo) {
    if (!ST.form) return "";
    const pts = []; for (let i = 0; i < 7; i++) { const ds = add(mo, i), f = ST.form.get(add(ds, 1)), s2 = f ? V78().status(f.fitness, f.ermuedung) : null; if (isNum(s2)) pts.push({ i, ds, s: s2 }); }
    if (pts.length < 2) return "";
    const Wd = 300, Hd = 64, lo = 0.4, hi = 1.8, y = (v) => (Hd - 4 - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (Hd - 8)).toFixed(1), x = (i) => (6 + (i / 6) * (Wd - 12)).toFixed(1);
    const band = `<rect x="0" y="${y(1.3)}" width="${Wd}" height="${(y(0.8) - y(1.3)).toFixed(1)}" class="k4-sk-band"/>`;
    const linie = `<polyline points="${pts.map((q) => `${x(q.i)},${y(q.s)}`).join(" ")}" class="k4-sk-l"/>`;
    const punkte = pts.map((q, k) => `<circle cx="${x(q.i)}" cy="${y(q.s)}" r="${q.ds === ST.sel ? 6.5 : 4}" class="k4-sk-p${k === 0 ? " erst" : ""}"><title>${esc(V78().tagText(q.ds))}: ${String(q.s).replace(".", ",")}</title></circle>`).join("");
    return `<svg class="k4-sk" viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Status am Ende jedes Tags (Ermüdung ÷ Fitness), grün = üblich">${band}${linie}${punkte}</svg>`;
  }
  /** V9.2 fehlt-zeit-1.0: im Bearbeiten-Modus steht die fehlende Zeit live in der Wochenkarte (die Frage kommt erst mit ✓). */
  function fehltZeile(mo) {
    const E = P() && P().planEintrag ? P().planEintrag(mo) : null, F = E && E.verteilung && E.verteilung.fehlt;
    if (!F || !(F.min > 0)) return "";
    return `<p class="k4-wkk-f warn-t">Es fehlen ${esc(window.V92 ? window.V92.dauer(F.min) : F.min + " min")}${isNum(F.tl) ? ` (${F.tl} TL)` : ""}: ${esc(F.einheiten.map((x) => x.titel).join(", "))} – mit ✓ fragt die Seite.</p>`;
  }
  /** ✨ «Woche anpassen?» (Vorlage): was passiert, wie man Einheiten behält, Tipps; Anpassen = V66 «umplanen» in den Entwurf (V9.2). */
  /** ✨ (Vorlage «Adaptieren oder Neuberechnen?», V9.3.2): «Anpassen» ändert so wenig wie möglich (Anker, eigene und verschobene Einheiten bleiben),
   *  «Neu» rechnet alle Einheiten der Woche neu aus dem Vorschlag (alles-neu-1.0 Stufe 2: nur gesperrte Tage und Einheiten bleiben). */
  function anpassenBlatt(mo) {
    const W = V6();
    const ov = window.V59.blatt("k4-anp", `<div class="blatt-titel">${W.icon("funken", 30)}<h2 id="v59-ov-h" tabindex="-1">Anpassen oder neu berechnen?</h2><p class="sub">${esc(V78().bereichText(mo))}</p></div>
      <p>Du kannst die Woche entweder anpassen oder neu berechnen. Beim Anpassen ändert die Seite deine bestehenden Einheiten so wenig wie möglich – deine eigenen,
        verschobenen und gesperrten bleiben, wo sie sind. Eine Neuberechnung erstellt alle Einheiten der Woche neu aus dem Vorschlag; nur gesperrte Tage und Einheiten bleiben.</p>
      <p>Wenn die Anpassung die Ziele der Woche nicht erreicht – zum Beispiel die richtige Trainingslast –, ist eine Neuberechnung oft die bessere Wahl.</p>
      <h3 class="abschnitt">Bestimmte Einheiten behalten</h3><p>Sperre eine Einheit (Schloss an der Einheit) oder den ganzen Tag (Tagesblatt hinter «…»), dann bleibt sie bei beidem, wie sie ist.</p>
      <h3 class="abschnitt">Training optimieren</h3><p>Je mehr Freiheit die Seite hat, desto besser erreicht sie die Ziele der Woche:</p>
      <ul class="k4-anp-l"><li>genügend Trainingszeit einstellen</li><li>so wenige Einheiten wie möglich sperren</li></ul>
      ${window.V92UI ? `<button type="button" class="mp-zeile" data-k4we><span>${W.icon("kalender", 18)} Woche einstellen – Zeiten, Sportarten, Sperren</span>${W.icon("weiter", 16)}</button>` : ""}
      <div class="blatt-fuss k4-anp-f"><button type="button" class="btn k4-neu" data-k4neu>Neu ${W.icon("loeschen", 16)}</button><button type="button" class="btn primary k4-anp-ok" data-k4anpok>Anpassen ${W.icon("funken", 16)}</button></div>`);
    const we = ov.querySelector("[data-k4we]"); if (we) we.onclick = () => window.V92UI.wocheEinstellen(mo, {});
    ov.querySelector("[data-k4anpok]").onclick = async () => { window.V59.schliessen(); await schritt(mo, { art: "umplanen" }); nachUmplanen(mo, "Woche angepasst"); };
    ov.querySelector("[data-k4neu]").onclick = async () => {
      window.V59.schliessen();
      let f = null; try { f = M().planen ? await M().planen(mo, { aktionen: [{ art: "neuberechnen" }], ohneUmplanen: true, grund: "neu" }) : await M().aendern(mo, { art: "neuberechnen" }); } catch (e) { console.error(e); f = "Neu berechnen nicht möglich"; }
      if (f) { meldung(f); return; }
      nachUmplanen(mo, "Woche neu berechnet");
    };
  }
  /** Meldung nach ✨: was sich geändert hat (V9.2: sagt auch, wenn es nichts zu ändern gab). */
  function nachUmplanen(mo, was) {
    const B = M().bericht ? M().bericht() : null;
    if (!B || B.mo !== mo) return;
    meldung(B.leer ? "Es musste nichts verschoben werden – alle Einheiten passen zu deiner Verfügbarkeit." : `${was}: ${B.zeilen.length} ${B.zeilen.length === 1 ? "Änderung" : "Änderungen"}${B.fehlt ? ` · es fehlen ${window.V92 ? window.V92.dauer(B.fehlt.min) : `${B.fehlt.min} min`}` : ""}.`, !B.fehlt);
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
    const W = V6(), h = heute(), R = ZS.offen ? V78().monatsRaster(ZS.mo) : V78().raster(ZS.mo, ST.zeilen === 1 ? 1 : 2), mon = new Date(ZS.mo + "T12:00:00Z").getUTCMonth();
    const selTag = ST.sel && V78().montag(ST.sel) === ZS.mo ? ST.sel : V78().montag(h) === ZS.mo ? h : ZS.mo;
    const zeilen = R.map((wk) => {
      const w = woche(wk.montag), k = w.kopf || {}, titel = V78().wochenTitel(w.K && w.K.w ? w.K.w.phase : null, k.art || null), Z = wochenZahlen(w, h);
      const tage = wk.tage.map((ds) => `<span data-k4zt="${ds}" class="${ds === h ? "heute" : ""}${ds === selTag ? " sel" : ""}${ZS.offen && new Date(ds + "T12:00:00Z").getUTCMonth() !== mon ? " aus" : ""}"><i>${+ds.slice(8)}</i></span>`).join("");
      return `<div class="k4-zg-d${wk.montag === ZS.mo ? " sel" : ""}" aria-hidden="true">${tage}</div><button type="button" class="k4-zw${wk.montag === ZS.mo ? " sel" : ""}${wk.montag === V78().montag(h) ? " jetzt" : ""}" data-k4zw="${wk.montag}" aria-pressed="${wk.montag === ZS.mo}"
        aria-label="KW ${W.isoWoche(wk.montag)}: ${esc(titel)}${Z ? `, ${esc(Z.was)} ${esc(Z.h)}, TL ${esc(Z.tl)}` : ""}"><b>${esc(titel)}</b>${Z ? `<span class="k4-zw-z">${esc(Z.h)} ${W.icon("uhr", 13)}</span><span class="k4-zw-z">${esc(Z.tl.replace(/^mind\. /, "≥ "))} ${W.icon("funken", 13)}</span>` : `<span class="k4-zw-z">–</span>`}</button>`;
    }).join("");
    return `<div class="k4-zg" role="group" aria-label="Wochen"><div class="k4-zg-d k4-zg-wt" aria-hidden="true">${WT.map((t) => `<span>${t}</span>`).join("")}</div>${zeilen}</div>`;
  }
  /** Zyklus für die Woche mo: im Kopf das Raster mit einer Zeile je Woche, darunter die vier Karten und «Plan und absolviert» (V66UI). */
  N.zyklus = function (box, raster, titel, sub, mo, neu) {
    if (!bereit()) { box.innerHTML = `<p class="hint">Kalender wird geladen …</p>`; return; }
    ST.KC = new Map(); ZS.PR = null; ZS.mo = V78().montag(mo || heute());
    // V9.3.2: Griff ändert nur das Raster (1 Woche, 2 Wochen, Monat) – die Karten darunter bleiben stehen
    const rasterNeu = () => {
      raster.innerHTML = zyklusRaster();
      raster.querySelectorAll("[data-k4zw]").forEach((b) => (b.onclick = () => { if (window.APP && window.APP.kalenderWoche) window.APP.kalenderWoche(b.dataset.k4zw); }));
      raster.querySelectorAll("[data-k4zt]").forEach((t) => (t.onclick = () => { ST.sel = t.dataset.k4zt; if (window.APP && window.APP.kalenderWoche) window.APP.kalenderWoche(V78().montag(ST.sel)); }));
      griffSetzen(raster, griffHTML(ZS.offen, "data-k4zgriff"), () => { zeilenSetzen(ST.zeilen === "monat" ? 2 : "monat"); rasterNeu(); }, rasterNeu);
    };
    rasterNeu();
    if (titel) titel.textContent = V78().monatText(ZS.mo);
    if (sub) sub.textContent = `KW ${V6().isoWoche(ZS.mo)} · ${V78().bereichText(ZS.mo)}`;
    try { wbarZeichnen(ZS.mo); } catch (e) { console.error(e); }
    let ausw = ""; try { ausw = M().wocheHTML(ZS.mo, { nurAuswertung: true }); } catch (e) { console.error(e); }
    box.innerHTML = `${zyklusKarten(ZS.mo)}<h3 class="abschnitt k4-z-ab">Plan und absolviert</h3>${ausw}
      <button type="button" class="btn k4-inliste" data-k4inliste>${V6().icon("kalender", 16)} Tage dieser Woche in der Liste</button>`;
    try { M().wocheBinden(box, ZS.mo, neu); } catch (e) { console.error(e); }
    const v = box.querySelector("[data-k4vf]"); if (v) v.onclick = () => M().verfuegbarkeitWoche && M().verfuegbarkeitWoche(null, ZS.mo);   // V9.2: «Woche einstellen» dieser Woche
    const l = box.querySelector("[data-k4inliste]"); if (l) l.onclick = () => window.APP && window.APP.kalenderListe && window.APP.kalenderListe(ZS.mo);
  };
  N.stand = () => ({ von: ST.von, bis: ST.bis, sel: ST.sel, offen: ST.offen, ms: ST.ms });
})();
