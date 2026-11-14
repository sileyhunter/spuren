/* V6.0.1 Heute (design-1.0, profil-1.0, status-1.0): drei Kacheln (Bereitschaft, Status, Check-in), «Heutiges Training» als Karten mit
   Zonen-Chips und Balkenprofil, jede Einheit als Blatt (Ablauf, Schritte mit Zonen, «Passende Route finden»), «Optionen für heute» und die
   Wochenleiste Mo–So. Rechenteile in js/v6.js, Workout lesen in js/training-route.js (workout-1.1), Check-in und Blätter in js/v59.js.
   Die Seite schreibt nichts nach Garmin oder Enduco; fehlende Werte bleiben leer. */
(function () {
  "use strict";
  const H = (window.V6H = window.V6H || {});
  const $ = (id) => document.getElementById(id);
  const V6 = () => window.V6, TR = () => window.TR, UI = () => window.V5UI, V59 = () => window.V59, L = () => window.V59L;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  let C = null;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const heuteISO = () => C.iso(C.today);
  const SPORT_WORT = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen", wandern: "Wandern", ski: "Ski", kraft: "Kraft", andere: "Training" };
  const spFarbe = (sp) => `var(--sp-${["rad", "lauf", "schwimm", "wandern", "ski"].includes(sp) ? sp : "andere"})`;
  const tagText = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
  const ROUTBAR = ["rad", "lauf", "wandern"];

  /* ---------- Einheiten: geplant heute (Garmin-Kalender) und neu von Enduco ohne Datum ---------- */
  function einheit(p, key) {
    const T = TR(), D = C.D;
    const sport = (T && T.GARMIN_SPORT[p.sport]) || p.sport || "andere";
    let wo = null;
    try { wo = T ? T.workout(Object.assign({}, p, { sport_plan: sport }), { zonen: T.zonen(D.zonen) }) : null; } catch (e) { console.error(e); }
    const pr = wo ? V6().profil(wo, T.zonen(D.zonen).skalen) : null;
    return { key, p, sport, wo, pr, dauer: wo && isNum(wo.dauer_s) ? wo.dauer_s : isNum(p.dur_s) ? p.dur_s : null };
  }
  H.heute = function () {
    const D = C.D, day = heuteISO(), out = [];
    (D.planned || []).forEach((p, i) => { if (p && p.date === day) out.push(einheit(p, "p:" + i)); });
    return out;
  };
  H.neu = function () { return (C.D.workouts_neu || []).slice(0, 5).map((w, i) => einheit(w, "n:" + i)); };
  function finde(key) {
    const [art, n] = String(key).split(":"), D = C.D;
    const p = art === "p" ? (D.planned || [])[+n] : art === "n" ? (D.workouts_neu || [])[+n] : null;
    return p ? einheit(p, key) : null;
  }
  H.planDauer = function (p) { C = C || (UI() && UI().C); if (!C) return p.dur_s || null; const e = einheit(p, null); return e.dauer; };
  /** V6.4: Einheit mit Balkenprofil (für die Intensitätsverteilung des Enduco-Plans in «Woche nach Modell»). */
  H.profilVon = function (p) { C = C || (UI() && UI().C); return C && V6() ? einheit(p, null) : null; };
  /** Fokus-Intensitäten einer geplanten Einheit (für die Punkte im Kalender). */
  H.fokus = function (p) { C = C || (UI() && UI().C); if (!C || !V6()) return []; const e = einheit(p, null); return e.pr ? e.pr.fokus.map((f) => f.key) : []; };
  /** Karte einer Einheit (Kalender-Tagesliste): key «p:<Stelle in planned>» oder «n:<Stelle in workouts_neu>». */
  H.karteHTML = function (key, klein) { C = C || (UI() && UI().C); if (!C || !V6()) return ""; const e = finde(key); return e ? karte(e, klein) : ""; };

  /* ---------- Zeichnen ---------- */
  H.zeichnen = function () {
    C = UI() && UI().C; if (!C || !V6()) return;
    V6().farbenLesen();
    try { kacheln(); } catch (e) { console.error(e); }
    try { plan(); } catch (e) { console.error(e); }
    try { woche(); } catch (e) { console.error(e); }
  };

  /* ---------- Kacheln: Bereitschaft, Status, Check-in ---------- */
  const BEREIT = { bereit: ["Bereit", "--good"], normal: ["Normal", "--fg"], vorsichtig: ["Vorsicht", "--warn"], "nicht beurteilbar": ["offen", "--muted"] };
  function befundHeute() { const u = UI(); return u ? u.befinden().find((b) => b.date === heuteISO()) || null : null; }
  function ciAus() { try { return localStorage.getItem((C.IS_DEMO ? "demo." : "") + "sf.ci.aus") === heuteISO(); } catch (e) { return false; } }
  function morgenTag() {
    const D = C.D, day = heuteISO();
    for (let i = 0; i < 8; i++) { const d = L().addDays(day, -i), x = (D.days || []).find((z) => z.date === d); if (x && (isNum(x.hrv) || isNum(x.rhr) || isNum(x.sleepScore))) return d; }
    return null;
  }
  function kacheln() {
    const box = $("heute-kacheln"); if (!box) return;
    const r = UI() && UI().lastReadiness, [bw, bf] = r ? BEREIT[r.status] || [r.status, "--fg"] : ["…", "--muted"];
    const tag = morgenTag(), pa = C.pmcHeute ? C.pmcHeute() : null, st = pa ? V6().status(pa.form) : null;
    const b = befundHeute(), aus = !b && ciAus();
    const sg = (v) => (v > 0 ? "+" + v : v < 0 ? "−" + Math.abs(v) : "0");
    const ciSub = b ? (b._lokal ? (C.IS_DEMO ? "nur hier (Demo)" : "auf dem Gerät") : "in den Daten") : aus ? "übersprungen" : "4 kurze Fragen";
    box.innerHTML = `
      <button type="button" class="kachel" data-v6="bereit" aria-label="Ampel, Bereitschaft heute: ${esc(bw)} – Einzelheiten">
        <span class="k-kopf">${V6().icon("ampel", 15)}Ampel</span><b class="k-wert k-farbe" style="--kc:var(${bf})">${esc(bw)}</b>
        <small>${!r ? "wird berechnet" : tag === heuteISO() ? "Morgenwerte heute" : tag ? "Werte vom " + esc(C.dateCH(tag).slice(0, 6)) : "keine Morgenwerte"}</small></button>
      <button type="button" class="kachel" data-v6="optionen" aria-label="Trainingsstatus zu Tagesbeginn: ${esc(st ? st.name : "offen")} – Optionen für heute">
        <span class="k-kopf">${V6().icon("status", 15)}Status</span><b class="k-wert${st ? " st-farbe" : ""}" style="${st ? `--stc:${st.farbe}` : "color:var(--muted)"}">${esc(st ? st.name : "offen")}</b>
        <small>${pa ? "Form " + sg(pa.form) : "ohne Einheiten"}</small></button>
      <button type="button" class="kachel" data-v6="checkin" aria-label="Check-in: ${b ? "erledigt" : aus ? "übersprungen" : "offen"}">
        <span class="k-kopf">${V6().icon("check", 15)}Check-in</span><b class="k-wert" style="color:var(${b ? "--good" : aus ? "--muted" : "--fg"})">${b ? "erledigt" : aus ? "später" : "offen"}</b>
        <small>${esc(ciSub)}</small></button>`;
    binden(box);
  }

  /* ---------- Heutiges Training ---------- */
  function chips(e, max) { const F = e.pr ? e.pr.fokus.concat(e.pr.fokusOffen || []) : []; return F.length ? F.slice(0, max || 3).map((f) => V6().zchip(f.key)).join("") : ""; }
  function zahlen(e) {
    const z = [[geschaetzt(e) + V6().dauerText(e.dauer), "Dauer"]];
    const dist = e.wo && isNum(e.wo.distanz_m) ? e.wo.distanz_m : null;
    if (dist) z.push([V6().distanzText(dist), "Distanz"]);
    if (e.pr && e.pr.intensiv_s > 0) z.push([V6().dauerText(e.pr.intensiv_s), "ab Zone 3"]);
    return z.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("");
  }
  const geschaetzt = (e) => (e.wo && /geschätzt/.test(e.wo.dauer_quelle || "") ? "≈ " : "");
  function karte(e, klein) {
    const titel = e.p.title || e.p.name || SPORT_WORT[e.sport] || "Training";
    const q = e.p.quelle || (e.key[0] === "n" ? "neu von Enduco, noch ohne Datum" : "Garmin-Kalender");
    return `<div class="card ek-karte${klein ? " klein" : ""}">
      <div class="ek-oben"><span class="ek-sport" style="--sp:${spFarbe(e.sport)}">${V6().sportIcon(e.sport, klein ? 18 : 22)}</span>
        <div class="ek-titel"><b>${esc(titel)}</b><span>${esc(SPORT_WORT[e.sport] || e.sport)}${klein && isNum(e.dauer) ? " · " + esc(geschaetzt(e) + V6().dauerText(e.dauer)) : ""} · ${esc(q)}</span></div>
        <div class="ek-chips">${chips(e, klein ? 2 : 3)}</div></div>
      ${klein ? "" : `<div class="ek-zahlen">${zahlen(e)}</div>`}
      ${e.pr && e.pr.balken.length ? V6().profilSVG(e.pr, { h: klein ? 28 : 44 }) : `<p class="ek-ohne">Keine Schritte im Kalender – Ziele siehe Garmin.</p>`}
      <button type="button" class="ek-auf" data-ek="${esc(e.key)}" aria-label="Einheit öffnen: ${esc(titel)}"></button></div>`;
  }
  /** V7 heute-7.0: Heutiges Training = erledigte Garmin-Aktivitäten von heute und die Einheiten aus Mein Plan (eigenplan-1.0).
      Enduco-Workouts (Garmin-Kalender, «neu von Enduco») erscheinen hier nicht mehr – sie bleiben gespeichert und zählen im Planvergleich. */
  function plan() {
    const box = $("heute-plan"); if (!box) return;
    const D = C.D, day = heuteISO(), st = L().standText(D.updated, day, D.updated_lauf), U = window.V7UI;
    const X = U ? U.meinTag(day) : null, rennen = X && X.t.rennen, E = X && !rennen ? X.t.einheiten : [];
    const A = (D.activities || []).filter((a) => a && a.date === day);
    const frei = A.map((a) => a.sport);                                           // eine erfasste Aktivität derselben Sportart erledigt eine geplante Einheit
    const karten = E.map((e) => { const k = frei.indexOf(e.sport); if (k >= 0) frei.splice(k, 1); return { e, erledigt: k >= 0 }; });
    const leer = !A.length && !E.length && !rennen;
    box.innerHTML = `<div class="ek-kopfzeile"><div><h2>Heutiges Training</h2>${st ? `<span class="ek-stand">${esc(st.text)}</span>` : ""}</div>
        <button type="button" class="btn" data-v6="optionen">Optionen ${V6().icon("plus", 18)}</button></div>
      ${rennen ? `<div class="card ek-test v7-rennen">${V6().icon("flagge", 18)}<b>${esc(rennen.name)}</b><small>Renntag</small></div>` : ""}
      ${U ? A.map((a) => U.aktKarte(a)).join("") : ""}
      ${U ? karten.map((k) => k.erledigt ? U.einheitKarte(k.e, day, true).replace('class="card ek-karte v7-ek klein"', 'class="card ek-karte v7-ek klein v7-erl"') : U.einheitKarte(k.e, day)).join("") : ""}
      ${leer ? `<div class="card ek-leer"><p>${X && X.t.gesperrt ? "Heute ist gesperrt – kein Training geplant." : "Für heute ist nichts geplant."}</p>
        ${X && !X.t.gesperrt ? `<button type="button" class="btn" data-v7add>${V6().icon("plus", 16)} Training hinzufügen</button>` : ""}</div>` : ""}
      ${testHinweis(day)}`;
    binden(box);
    if (U) U.binden(box);
    const add = box.querySelector("[data-v7add]");
    if (add) add.onclick = () => { if (window.V66UI && window.V66UI.hinzufuegen) window.V66UI.hinzufuegen(day, () => V59().schliessen()); };
  }
  /** V6.2 testplan-1.0: Test heute oder morgen (eingetragen oder Vorschlag nach Regel) – nur Hinweis, nichts wird nach Garmin geschrieben. */
  function testHinweis(day) {
    if (!C.tests) return "";
    const morgen = L().addDays ? L().addDays(day, 1) : null, NAME = { stufentest: "Stufentest", check: "Laktat-Kurzcheck", css: "CSS-Test" };
    const T = C.tests().filter((t) => !t.done && (t.date === day || t.date === morgen));
    return T.map((t) => `<div class="card ek-test"><span class="abschnitt">${V6().icon("ampel", 15)}${t.date === day ? "Test heute" : "Test morgen"}${t.status === "vorschlag" ? " · Vorschlag" : ""}</span>
      <b>${esc(NAME[t.kind] || t.kind)}${t.kind === "stufentest" && t.sport ? ({ lauf: " Laufen", rad: " Rad", beide: " Rad und Laufen" }[t.sport] || "") : ""}</b><small>${esc(t.note || "")}</small></div>`).join("");
  }

  /* ---------- Einheit als Blatt ---------- */
  function schrittZeile(s, e) {
    const W = V6(), z = W.schrittZone(s, e.wo, TR().zonen(C.D.zonen).skalen), farbe = z ? W.ZONEN[z.key].farbe : W.ZONEN.offen.farbe;
    const dauer = isNum(s.dauer_s) ? W.dauerText(s.dauer_s) : isNum(s.distanz_m) ? W.distanzText(s.distanz_m) : "offen";
    const zusatz = [];
    if (!isNum(s.dauer_s) && isNum(s.dauer_est)) zusatz.push("≈ " + W.dauerText(s.dauer_est));
    if (s.cad && isNum(s.cad.lo) && isNum(s.cad.hi) && s.cad.hi > 0) zusatz.push(`Kadenz ${Math.round(s.cad.lo)}–${Math.round(s.cad.hi)}`);
    const name = e.sport === "schwimm" ? W.schrittName(s.text) : null;
    const ziel = W.zielText(s, e.wo);
    return `<li class="ek-s" style="--zc:${farbe}"><div class="ek-s-d"><b>${esc(dauer)}</b><span>${esc(W.schrittTyp(s, e.wo))}</span></div>
      <div class="ek-s-m"><span>${ziel ? esc(ziel) : s.typ === "rest" ? "" : "ohne Zielbereich"}</span>${name ? `<small>${esc(name)}</small>` : ""}${zusatz.length ? `<small>${esc(zusatz.join(" · "))}</small>` : ""}</div>
      ${z && z.key !== "pause" ? W.zchip(z.key) : ""}</li>`;
  }
  function schritteListe(e) {
    const W = V6(), sk = TR().zonen(C.D.zonen).skalen;
    return W.bloecke(e.wo).map((b) => {
      if (b.art === "einzel") return schrittZeile(b.schritte[0], e);
      const ks = b.schritte.map((s) => W.schrittZone(s, e.wo, sk)).filter((z) => z && z.key !== "pause");
      const top = ks.sort((x, y) => W.ZONEN[y.key].stufe - W.ZONEN[x.key].stufe)[0];
      return `<li class="ek-wdh"><div class="ek-wdh-k">${b.n} ×${top ? " " + esc(W.ZONEN[top.key].name) : ""}</div><ol>${b.schritte.map((s) => schrittZeile(s, e)).join("")}</ol></li>`;
    }).join("");
  }
  function zonenSkala(e) {
    const W = V6(), F = e.pr ? e.pr.fokus.concat(e.pr.fokusOffen || []) : [], fokus = new Map(F.map((f) => [f.key, f.anteil]));
    const an = (k) => fokus.has(k) || (k === "vo2" && fokus.has("z5"));
    return `<div class="zskala" role="img" aria-label="Zonenskala, hervorgehoben: ${esc(F.map((f) => W.ZONEN[f.key].name).join(", ") || "keine")}">
      ${W.SKALA_REIHE.map((k) => `<span class="${an(k) ? "an" : ""}" style="--zc:${W.ZONEN[k].farbe}"></span>`).join("")}</div>
      <div class="ek-fokus">${F.map((f) => `<span>${W.zchip(f.key)}<small>${isNum(f.anteil) ? Math.round(f.anteil * 100) + " %" : "Dauer offen"}</small></span>`).join("") || `<span class="muted">Ohne Zielbereiche keine Fokus-Intensität.</span>`}</div>`;
  }
  H.einheit = function (key, opt) {   // V6.6: opt wie bei einheitP (z. B. nachher: «Zurück» führt ins Tagesblatt)
    C = UI() && UI().C; if (!C) return;
    const e = finde(key); if (!e) return;
    blatt(e, key, opt || null);
  };
  /** V6.5: beliebige Einheit als Blatt (z. B. aus der Enduco-Bibliothek): p wie ein Kalendereintrag, opt.extra = HTML vor dem Fuss,
   *  opt.datumText statt des Datums (z. B. «exportiert am …»). Ohne «Passende Route finden». */
  H.einheitP = function (p, opt) {
    C = UI() && UI().C; if (!C || !V6()) return;
    blatt(einheit(p, null), "x", opt || {});
  };
  function blatt(e, key, opt) {
    opt = opt || {};
    const W = V6(), titel = e.p.title || e.p.name || SPORT_WORT[e.sport] || "Training";
    const q = e.p.quelle || (key[0] === "n" ? "Enduco über Garmin, noch ohne Datum" : "Garmin-Kalender");
    const total = e.pr ? e.pr.breite_s : 0, ca = e.pr && e.pr.ohneDauer ? "≈ " : "";
    const kv = [[geschaetzt(e) + W.dauerText(e.dauer), "Dauer"]];
    if (e.wo && isNum(e.wo.distanz_m)) kv.push([W.distanzText(e.wo.distanz_m), "Distanz"]);
    if (e.pr && e.pr.balken.length) kv.push([(e.pr.ohneDauer && e.pr.intensiv_s ? "≥ " : "") + W.dauerText(e.pr.intensiv_s || 0), "ab Zone 3"]);
    const route = ROUTBAR.includes(e.sport) && window.TRUI && !C.IS_DEMO;
    const rKey = key[0] === "p" ? `${e.p.date}|${key.slice(2)}` : null;
    const html = `<div class="ek-blatt-kopf"><span class="ek-sport gross" style="--sp:${spFarbe(e.sport)}">${W.sportIcon(e.sport, 28)}</span>
        <div><h2 id="v59-ov-h" tabindex="-1">${esc(titel)}</h2><p class="sub">${opt.datumText ? esc(opt.datumText) + " · " : e.p.date ? esc(tagText(e.p.date)) + " · " : ""}${esc(SPORT_WORT[e.sport] || e.sport)} · ${esc(q)}</p></div></div>
      <div class="kv ek-kv">${kv.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      ${e.wo && e.wo.schritte.length ? `
      <h3 class="abschnitt">${W.icon("fokus", 15)}Fokus-Intensitäten</h3>${zonenSkala(e)}
      <h3 class="abschnitt">${W.icon("ablauf", 15)}Ablauf</h3>
      ${W.profilSVG(e.pr, { gross: true, h: 120 })}
      <div class="ek-achse" aria-hidden="true"><span>0</span><span>${ca}${esc(W.dauerText(total / 2))}</span><span>${ca}${esc(W.dauerText(total))}</span></div>
      <ol class="ek-schritte">${schritteListe(e)}</ol>` : `<p class="ek-ohne">Keine Schritte im Kalender – Ziele siehe Garmin.</p>`}
      ${e.wo && e.wo.beschreibung ? `<h3 class="abschnitt">Beschreibung</h3><p class="ek-text">${esc(e.wo.beschreibung)}</p>` : ""}
      ${e.wo && e.wo.hinweise.length ? e.wo.hinweise.map((h) => `<p class="warn-t">${esc(h)}</p>`).join("") : ""}
      ${opt.extra || ""}
      <p class="ek-quelle">Dauer: ${esc((e.wo && e.wo.dauer_quelle) || "unbekannt")}. Zonen und Farben: ${esc((e.wo && e.wo.zonen) || "kein aktives Zonenprofil")}; Balkenhöhe = Lage in der Zone (${esc(W.VERSIONS.profil)}, ${esc(TR().VERSIONS.workout)}). Nur lesen – geändert wird in Enduco bzw. Garmin.</p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${W.icon("zurueck", 22)}</button>
        ${key === "x" ? "" : route && rKey ? `<button type="button" class="btn primary gross" data-str="${esc(rKey)}">${W.icon("route", 20)} Passende Route finden</button>`
          : route && key[0] === "n" && e.p.wid ? `<button type="button" class="btn primary gross" data-v6str="n:${esc(e.p.wid)}">${W.icon("route", 20)} Passende Route finden</button>` : ""}</div>`;
    const ov = V59().blatt("einheit", html);
    const sb = ov.querySelector("[data-str]"); if (sb) sb.addEventListener("click", () => V59().schliessen());
    const nb = ov.querySelector("[data-v6str]");
    if (nb) nb.onclick = () => { V59().schliessen(); if (window.APP) { window.APP.showTab("karte"); window.APP.setPlanActive(true); } window.TRUI.show({ key: nb.dataset.v6str }); };
    if (opt.nachher) opt.nachher(ov);
  }

  /* ---------- Optionen für heute ---------- */
  function gehe(view, id) {
    V59().schliessen();
    if (window.APP && window.APP.showTab) window.APP.showTab(view); else location.hash = "#" + view;
    if (id) setTimeout(() => { const el = $(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
  }
  H.optionen = function () {
    C = UI() && UI().C; if (!C) return;
    const W = V6(), pa = C.pmcHeute ? C.pmcHeute() : null, st = pa ? W.status(pa.form) : null;
    const sg = (v) => (v > 0 ? "+" + v : v < 0 ? "−" + Math.abs(v) : "0");
    const lage = pa ? W.statusLage(pa.form) : null;
    const akt = [
      ["check", "Check-in", befundHeute() ? "Befinden von heute ansehen oder ändern" : "Vier kurze Fragen zum Befinden", "checkin"],
      ["energie", "Verpflegung erfassen", "Fueling einer Einheit (Ausdauer)", "fueling"],
      ["trend", "Laktat eintragen", "Kurzcheck oder Stufentest (Laktat)", "laktat"],
      ["schwimm", "CSS-Test eintragen", "400 m und 200 m (Schwimmen)", "css"],
      ["kalender", "Kalender öffnen", "Woche und Monat mit geplanten Einheiten", "kalender"],
    ];
    akt.splice(1, 0, ["plus", "Training hinzufügen", "Eigene Einheit für heute (Mein Plan)", "hinzu"]);
    const html = `<div class="blatt-titel">${W.icon("plus", 34)}<h2 id="v59-ov-h" tabindex="-1">Optionen für heute</h2></div>
      ${pa ? `<div class="kv ek-kv"><div><b>${pa.fitness}</b><span>Fitness</span></div><div><b>${pa.ermuedung}</b><span>Ermüdung</span></div><div><b>${sg(pa.form)}</b><span>Form</span></div></div>
      <div class="st-block"><div class="st-kopf"><span class="abschnitt">${W.icon("status", 15)}Trainingsstatus</span><b class="st-farbe" style="--stc:${st.farbe}">${esc(st.name)}</b></div>
        <div class="st-skala" role="img" aria-label="Form ${sg(pa.form)} auf der Skala von hoher Belastung bis Formverlust">${W.statusBaender().map((b) => `<i style="left:${(b.von * 100).toFixed(1)}%;width:${((b.bis - b.von) * 100).toFixed(1)}%;background:${b.farbe}"></i>`).join("")}<span class="st-marke" style="left:${(lage * 100).toFixed(1)}%"></span></div>
        <div class="st-enden"><span>hohe Belastung</span><span>Formverlust</span></div>
        <p class="st-text">${esc(st.text)}. Stand zu Tagesbeginn: Fitness und Ermüdung bis ${esc(pa.bis ? C.dateCH(pa.bis).slice(0, 6) : "gestern")}, die Einheiten von heute zählen ab morgen früh – wie bei der Ampel.
          Form = Fitness − Ermüdung (${esc(pa.v)}); Bänder nach Coggan, eigene Wörter (${esc(W.VERSIONS.status)}). Kein medizinisches Mass.</p></div>`
        : `<p class="ek-ohne">Für den Trainingsstatus fehlen noch Einheiten.</p>`}
      <ul class="v6-aktionen">${akt.map(([ic, t, s, a]) => `<li><button type="button" data-akt="${a}">${W.icon(ic, 22)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span>${W.icon("weiter", 18)}</button></li>`).join("")}</ul>
      <p class="ek-quelle">Eigene Einheiten planst du in Mein Plan (Kalender, Tag antippen). Nach Garmin geht nur, was du mit «An Garmin senden» auslöst.</p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${W.icon("zurueck", 22)}</button></div>`;
    const ov = V59().blatt("optionen", html);
    ov.querySelectorAll("[data-akt]").forEach((b) => (b.onclick = () => {
      const a = b.dataset.akt;
      if (a === "checkin") { V59().checkinBlatt(); return; }
      if (a === "fueling") gehe("ausdauer", "fu-card");
      if (a === "laktat") gehe("laktat");
      if (a === "css") gehe("schwimmen", "sw-css-card");
      if (a === "kalender") gehe("kalender");
      if (a === "hinzu" && window.V66UI && window.V66UI.hinzufuegen) window.V66UI.hinzufuegen(heuteISO(), () => V59().schliessen());
    }));
  };

  /* ---------- Bereitschaft als Blatt ---------- */
  H.bereitschaft = function () {
    C = UI() && UI().C; if (!C) return;
    const W = V6(), r = UI().lastReadiness, F = window.FK, D = C.D;
    if (!r) return;
    const [bw, bf] = BEREIT[r.status] || [r.status, "--fg"], tag = morgenTag();
    const ring = tag && F && F.ringeVerlauf ? F.ringeVerlauf(D.days, D.activities, tag, 1, { aktBis: F.aktivitaetenBis ? F.aktivitaetenBis(D) : null })[0] : null;
    const pz = (v, offen) => (isNum(v) ? v + " %" : offen ? "offen" : "–");
    const html = `<div class="blatt-titel">${W.icon("ampel", 34)}<h2 id="v59-ov-h" tabindex="-1">Bereitschaft</h2><b class="bk-wort k-farbe" style="--kc:var(${bf})">${esc(bw)}</b></div>
      <p class="verdict${r.status === "vorsichtig" ? " warn" : ""}">${esc(r.empfehlung)}</p>
      ${r.gruende && r.gruende.length ? `<ul class="bk-gruende">${r.gruende.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
      ${ring ? `<div class="kv ek-kv"><div><b>${pz(ring.erholung)}</b><span>Erholung</span></div><div><b>${pz(ring.schlaf)}</b><span>Schlaf</span></div><div><b>${pz(ring.belastung, ring.belastungOffen)}</b><span>Belastung</span></div></div>` : ""}
      ${garminZeile()}
      <p class="ek-quelle">${tag ? (tag === heuteISO() ? "Morgenwerte von heute" : "Morgenwerte vom " + esc(C.dateCH(tag))) : "Keine Morgenwerte"} · Vertrauen ${esc(r.vertrauen)} · ${esc(r.v)}. Kein medizinisches Mass; fehlende Werte werden nicht durch «normal» ersetzt.</p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${W.icon("zurueck", 22)}</button>
        <button type="button" class="btn primary gross" data-akt="mehr">Einzelheiten</button></div>`;
    const ov = V59().blatt("bereit", html);
    ov.querySelector('[data-akt="mehr"]').onclick = () => gehe("erholung", "rd-wrap");
  };

  /** V6.1 wellness-1.0: Garmins eigene Werte (Readiness, Body Battery beim Aufwachen, Stress gestern) – nur von heute bzw. gestern. */
  function garminZeile() {
    const g = window.V61 ? window.V61.garminTag(C.D.days, heuteISO()) : null;
    if (!g || (g.readiness == null && g.bodyBattery == null && g.stressGestern == null)) return "";
    const w = (v) => (v == null ? "–" : v);
    return `<p class="abschnitt">Garmin</p>
      <div class="kv ek-kv"><div><b>${w(g.readiness)}</b><span>Readiness${g.wort ? " · " + esc(g.wort) : ""}</span></div><div><b>${w(g.bodyBattery)}</b><span>Body Battery beim Aufwachen</span></div>
        <div><b>${w(g.stressGestern)}</b><span>Stress gestern Ø</span></div></div>
      <p class="ek-quelle">Garmins eigene Werte (${esc(window.V61.VERSIONS.wellness)}): gezeigt, nicht in die Ampel eingerechnet.</p>`;
  }

  /* ---------- Wochenleiste Mo–So ---------- */
  function woche() {
    const box = $("wochen-leiste"); if (!box) return;
    const W = V6(), D = C.D, day = heuteISO();
    const mo = window.V64 ? window.V64.montag(day) : day;
    const MP = window.V7UI ? window.V7UI.meinPlanWoche(mo).map((x) => ({ date: x.date, sport: x.sport, dur_s: x.dur_s })) : [];   // V7: Mein Plan statt Garmin-Kalender
    const w = W.woche(D.activities, MP, day, (p) => p.dur_s);
    const WORT = { ist: "erledigt", plan: "geplant", verpasst: "geplant, keine Aktivität dieser Sportart erfasst" };
    const tage = w.tage.map((t) => {
      const lab = `${tagText(t.iso)}: ${t.zeichen.length ? t.zeichen.map((z) => `${SPORT_WORT[z.sport] || z.sport} ${WORT[z.art]}`).join(", ") : "nichts"}`;
      return `<button type="button" class="wl-tag${t.heute ? " heute" : ""}" data-wltag="${esc(t.iso)}" aria-label="${esc(lab)}"><span class="wl-wt">${t.wt}</span><span class="wl-d">${+t.iso.slice(8)}</span>
        <span class="wl-sp">${t.zeichen.slice(0, 3).map((z) => `<i class="${z.art}" style="--sp:${spFarbe(z.sport)}">${W.sportIcon(z.sport, 14)}</i>`).join("")}${t.zeichen.length > 3 ? `<small>+${t.zeichen.length - 3}</small>` : ""}</span></button>`;
    }).join("");
    const bar = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
    box.innerHTML = `<div class="wl" role="group" aria-label="Diese Woche, Tag antippen für die Einheiten">${tage}</div>
      <div class="wl-fort">
        <div><span>Trainings</span><b>${w.n_ist} <small>/ ${w.n_woche}</small></b><i style="--p:${bar(w.n_ist, w.n_woche)}%"></i></div>
        <div><span>Dauer</span><b>${esc(W.dauerText(w.s_ist))} <small>/ ${esc(W.dauerText(w.s_woche))}</small></b><i style="--p:${bar(w.s_ist, w.s_woche)}%"></i></div></div>
      <p class="hint">Erledigt = erfasste Aktivitäten (kommen mit dem Nacht-Update); geplant = Mein Plan. Ausgefüllt = erledigt, Rand = geplant, grau = geplant, aber an diesem Tag keine Aktivität dieser Sportart erfasst.
        Woche = erledigt + noch geplant + verpasst${w.n_verpasst ? ` (${w.n_verpasst} verpasst)` : ""}.</p>`;
    box.querySelectorAll("[data-wltag]").forEach((b) => (b.onclick = () => { if (window.APP && window.APP.tagBlatt) window.APP.tagBlatt(b.dataset.wltag); }));   // V6.6
  }

  /* ---------- Klicks ---------- */
  function binden(box) {
    box.querySelectorAll("[data-v6]").forEach((b) => (b.onclick = () => {
      const a = b.dataset.v6;
      if (a === "bereit") H.bereitschaft();
      if (a === "optionen") H.optionen();
      if (a === "checkin") V59().checkinBlatt();
    }));
    box.querySelectorAll("[data-ek]").forEach((b) => (b.onclick = () => H.einheit(b.dataset.ek)));
  }
})();
