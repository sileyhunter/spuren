/* Ironman Notebook V7 – Oberfläche (navigation-7.0, analyse-start-1.0, planvergleich-1.0; Auftrag V7 vom 14.11.2026, Vorlage enduco):
   - Analyse-Start: wenige Karten mit den wichtigsten Zahlen; jede öffnet ihre Ansicht (Einzelheiten erst dort).
   - Planvergleich: Enduco geplant gegenüber Garmin absolviert, nur je Woche zusammengefasst (Rechenteil js/v7.js).
   - Plan: Übersicht oben (Hauptrennen, Phase, diese Woche), Werkzeuge als Unteransichten.
   - Labor: Expertenbereich (Wissen, Enduco-Datenbestand, Rechennachweise, Einzelvergleiche) – über das Profil oben rechts.
   - Mein Plan für Heute und Kalender (eigene Einheiten mit Balkenprofil aus ihren Teilen, profil-teile-1.0).
   Aufbau und Bedienlogik nach dem Vorbild enduco, Texte, Symbole und Grafiken eigen. Die Seite schreibt nichts nach Garmin oder Enduco. */
(function () {
  "use strict";
  const M = (window.V7UI = window.V7UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V7 = () => window.V7, FK = () => window.FK, P = () => window.V64UI;
  const V66 = () => window.V66, H = () => window.V6H, V59 = () => window.V59, AN = () => window.AN, V64 = () => window.V64;
  const $ = (id) => document.getElementById(id);
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && V6() && V7()); };
  const heute = () => C.iso(C.today);
  const dt = (s) => V6().dauerText(Math.max(0, Math.round(s || 0)));
  const std = (s) => { const m = Math.round((s || 0) / 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`; };
  const vz = (n) => (n > 0 ? "+" : n < 0 ? "−" : "±");
  const dkurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  const SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen", andere: "Andere" };
  const spVar = (k) => `var(--sp-${["rad", "lauf", "schwimm", "wandern", "ski"].includes(k) ? k : "andere"})`;
  const ZW = ["Z1", "Z2", "Z3", "Z4", "Z5"], ZVAR = ["--zc-z1", "--zc-z2", "--zc-z3", "--zc-z4", "--zc-z5"];
  const DREI = [["unter LT1", "--zc-z2"], ["LT1–LT2", "--zc-z3"], ["über LT2", "--zc-z5"]];
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat */ } };
  function geh(view, id) {
    if (window.APP && window.APP.showTab) window.APP.showTab(view); else location.hash = "#" + view;
    if (id) setTimeout(() => { const el = $(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 160);
  }
  const pfeil = () => V6().icon("weiter", 18);

  /* ---------------- Mein Plan (für Heute und Kalender) ---------------- */
  /** Gilt Mein Plan für diese Woche? Ab der laufenden Woche immer (Vorschlag mit Änderungen); frühere Wochen nur, wenn du sie selbst
      gespeichert hattest – sonst wäre es ein nachträglich gerechneter Vorschlag, dem du nie gefolgt bist (kalender-3.0). */
  M.planGilt = function (mo) {
    if (!bereit() || !V64()) return false;
    if (mo >= V64().montag(heute())) return true;
    try { return !!(P() && P().planEintrag && P().planEintrag(mo)); } catch (e) { return false; }
  };
  /** Tag aus Mein Plan (eigenplan-1.0): { t, K } oder null. */
  M.meinTag = function (ds) {
    if (!bereit() || !P() || !P().kontextFuer || !V64() || !M.planGilt(V64().montag(ds))) return null;
    try { const K = P().kontextFuer(V64().montag(ds)); const t = K ? K.w.tage.find((x) => x.date === ds) : null; return t ? { t, K } : null; } catch (e) { console.error(e); return null; }
  };
  /** Einheiten von Mein Plan einer Woche als Liste { date, sport, dur_s, titel, uid, e } (ohne Renntage). */
  M.meinPlanWoche = function (mo) {
    const out = [];
    if (!bereit() || !P() || !P().kontextFuer || !M.planGilt(mo)) return out;
    let K = null; try { K = P().kontextFuer(mo); } catch (e) { console.error(e); }
    if (!K) return out;
    for (const t of K.w.tage) { if (t.rennen) continue; for (const e of t.einheiten) out.push({ date: t.date, sport: e.sport, dur_s: (e.dauer || 0) * 60, titel: e.titel, uid: e.uid, e }); }
    return out;
  };
  /** Balkenprofil einer eigenen Einheit (profil-teile-1.0). */
  M.profil = function (e) { return V7().profilAusTeile(e && e.teile, V6().ZONEN); };
  /** Karte einer eigenen Einheit (Heute und Kalender, Aufbau wie «Heutiges Training»). */
  M.einheitKarte = function (e, ds, klein) {
    const W = V6(), pr = M.profil(e), hk = e.teile && e.teile.length && P() && P().hauptKey ? P().hauptKey(e) : null;
    let S = null; try { const x = M.meinTag(ds); S = x ? V66().schaetzung(e, V66().bezug(window.TR ? window.TR.zonen(C.D.zonen).skalen : null, x.K && x.K.css ? x.K.css.s : null)) : null; } catch (err) { console.error(err); }
    const q = e.quelle === "eigen" ? "eigen" : e.quelle === "bibliothek" ? "Bibliothek" : "Vorschlag";
    const zahlen = [[dt((e.dauer || 0) * 60), "Dauer"]];
    if (S && isNum(S.km) && S.km > 0) zahlen.push([`≈ ${String(S.km).replace(".", ",")} km`, "Distanz"]);
    if (S && isNum(S.tl)) zahlen.push([`${S.vollstaendig ? "≈ " : "mind. "}${S.tl}`, "TL"]);
    const chips = pr.fokus.length ? pr.fokus.map((f) => W.zchip(f.key)).join("") : hk ? (P().chip ? P().chip(hk) : "") : "";
    return `<div class="card ek-karte v7-ek${klein ? " klein" : ""}">
      <div class="ek-oben"><span class="ek-sport" style="--sp:${spVar(e.sport)}">${W.sportIcon(e.sport, klein ? 18 : 22)}</span>
        <div class="ek-titel"><b>${esc(e.titel)}</b><span>${esc(SPW[e.sport] || "Training")} · Mein Plan · ${q}</span></div>
        <div class="ek-chips">${chips}</div></div>
      ${klein ? "" : `<div class="ek-zahlen">${zahlen.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("")}</div>`}
      ${pr.balken.length ? W.profilSVG(pr, { h: klein ? 26 : 40, label: "Ablauf: Breite = Dauer, Höhe und Farbe = Zone" }) : `<p class="ek-ohne">Ohne Zielzonen.</p>`}
      <button type="button" class="ek-auf" data-v7ek="${esc(ds)}|${esc(e.uid)}" aria-label="Einheit öffnen: ${esc(e.titel)}"></button></div>`;
  };
  /** Karte einer absolvierten Garmin-Aktivität (erledigt). */
  M.aktKarte = function (a) {
    const W = V6(), sp = ["rad", "lauf", "schwimm", "wandern", "ski"].includes(a.sport) ? a.sport : "andere";
    const z = [[dt(isNum(a.mv) ? a.mv : a.dur), "Dauer"]];
    if (isNum(a.km) && a.km > 0) z.push([`${String(Math.round(a.km * 10) / 10).replace(".", ",")} km`, "Distanz"]);
    if (isNum(a.tss) && a.tss > 0) z.push([String(Math.round(a.tss)), "TL"]);
    return `<div class="card ek-karte v7-akt">
      <div class="ek-oben"><span class="ek-sport voll" style="--sp:${spVar(sp)}">${W.sportIcon(a.sport, 22)}</span>
        <div class="ek-titel"><b>${esc(a.name || SPW[sp])}</b><span>${esc(SPW[sp] || "Training")} · Garmin</span></div>
        <span class="v7-erledigt">${W.icon("check", 14)}erledigt</span></div>
      <div class="ek-zahlen">${z.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      <button type="button" class="ek-auf" data-ex="${esc(a.id)}" aria-label="Aktivität analysieren: ${esc(a.name || "")}"></button></div>`;
  };
  /** Klicks auf Karten von Mein Plan binden (öffnet die Einheit im Blatt von V66UI). */
  M.binden = function (box) {
    box.querySelectorAll("[data-v7ek]").forEach((b) => (b.onclick = () => {
      const [ds, uid] = b.dataset.v7ek.split("|");
      if (window.V66UI && window.V66UI.einheit) window.V66UI.einheit(ds, uid, { zurueck: () => V59().schliessen() });
    }));
  };

  /* ---------------- Analyse-Start (analyse-start-1.0) ---------------- */
  function miniBalken(U) {
    const max = Math.max(1, ...U.map((w) => w.s)), Wd = 160, Hd = 44, bw = Wd / U.length;
    const r = U.map((w, i) => {
      let y = Hd; const x = i * bw + 2, b = bw - 4;
      return ["schwimm", "rad", "lauf", "andere"].map((k) => { const h = (w[k] / max) * (Hd - 2); if (h <= 0) return ""; y -= h; return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" style="fill:${spVar(k)}"/>`; }).join("");
    }).join("");
    return `<svg class="v7-mini" viewBox="0 0 ${Wd} ${Hd}" preserveAspectRatio="none" role="img" aria-label="Stunden der letzten ${U.length} Wochen je Sportart">${r}</svg>`;
  }
  function segBalken(teile, label) {
    const t = teile.reduce((s, [v]) => s + (v || 0), 0);
    if (!t) return "";
    return `<div class="v7-seg" role="img" aria-label="${esc(label)}">${teile.map(([v, farbe]) => (v > 0 ? `<i style="flex:${v};background:var(${farbe})"></i>` : "")).join("")}</div>`;
  }
  function intensitaet28() {
    const D = C.D, bis = heute(), von = V7().addDays(bis, -27), z = [0, 0, 0]; let basis = null;
    for (const sp of ["rad", "lauf"]) {
      const S = FK().zoneSummary(D.activities, D.zonen, sp, von, bis);
      const B = S.profil.s > 0 ? S.profil : S.garmin;
      if (B.s > 0) { B.z.forEach((v, i) => (z[i] += v)); basis = basis === "profil" || S.profil.s > 0 ? "profil" : "garmin"; }
    }
    return { z, pct: V7().prozent(z), basis };
  }
  function laktatWerte() {
    const P0 = FK().activeProfile(C.D.zonen, heute());
    if (!P0) return null;
    const grenze = (sc, a) => { const z = (sc.zonen || []).find((x) => x.z === a); return z && isNum(z.bis) ? z.bis : null; };
    const fmt = (sc, v) => (!isNum(v) ? "–" : /s\/km/.test(sc.unit || "") ? `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}` : `${Math.round(v)}`);
    const out = [];
    for (const [d, m, lab] of [["rad", "leistung", "Rad"], ["lauf", "pace", "Laufen"]]) {
      const sc = (P0.skalen || []).find((x) => x.disziplin === d && x.metrik === m); if (!sc) continue;
      out.push({ lab, lt1: fmt(sc, grenze(sc, "Z2")), lt2: fmt(sc, grenze(sc, "Z3")), unit: /s\/km/.test(sc.unit || "") ? "/km" : sc.unit || "" });
    }
    return { P: P0, out };
  }
  const BEREIT = { bereit: ["Bereit", "--good"], normal: ["Normal", "--fg"], vorsichtig: ["Vorsicht", "--warn"], "nicht beurteilbar": ["offen", "--muted"] };
  function analyseZeichnen() {
    const box = $("v7-analyse"); if (!box || !bereit()) return;
    const D = C.D, W = V6(), t = heute();
    const U = V7().wochenUmfang(D.activities, t, 8), u = U[U.length - 1];
    const I = intensitaet28();
    const pa = C.pmcHeute ? C.pmcHeute() : null, st = pa ? W.status(pa.form) : null, r = UI().lastReadiness, [bw, bf] = r ? BEREIT[r.status] || [r.status, "--fg"] : ["–", "--muted"];
    const L = laktatWerte();
    const pv = M.planvergleichDaten(12), lw = pv ? pv.wochen.filter((w) => w.status === "ok" && w.abgeschlossen).pop() : null;
    const sg = (v) => (v > 0 ? "+" + v : v < 0 ? "−" + Math.abs(v) : "0");
    const karte = (ziel, ic, titel, inhalt, extra) => `<button type="button" class="card v7-karte${extra ? " " + extra : ""}" data-ziel="${ziel}">
        <span class="v7-k-kopf">${W.icon(ic, 15)}<span>${esc(titel)}</span>${pfeil()}</span>${inhalt}</button>`;
    const html = [
      karte("umfang", "kalender", "Trainingsumfang", `<span class="v7-k-unter">Diese Woche</span>
        <div class="v7-k-zahlen"><div><b>${std(u.s)}</b><span>Dauer</span></div><div><b>${Math.round(u.km)} km</b><span>Distanz</span></div><div><b>${Math.round(u.hm)} m</b><span>Höhenmeter</span></div></div>
        ${miniBalken(U)}<span class="v7-k-fuss">${["schwimm", "rad", "lauf"].map((k) => `<i style="background:${spVar(k)}"></i>${SPW[k]} ${std(u[k])}`).join(" ")}</span>`),
      karte("intensitaet", "fokus", "Intensitätsverteilung", I.pct ? `<span class="v7-k-unter">Rad und Laufen · letzte 4 Wochen</span>
        <div class="v7-k-zahlen"><div><b>${I.pct[0]} %</b><span>locker</span></div><div><b>${I.pct[1]} %</b><span>mittel</span></div><div><b>${I.pct[2]} %</b><span>hart</span></div></div>
        ${segBalken([[I.z[0], "--zc-z2"], [I.z[1], "--zc-z3"], [I.z[2], "--zc-z5"]], `Verteilung locker ${I.pct[0]} %, mittel ${I.pct[1]} %, hart ${I.pct[2]} %`)}
        <span class="v7-k-fuss">${I.basis === "profil" ? "nach Puls in deinen Zonen (Grenzen LT1 und LT2)" : "nach Garmin-Pulszonen (noch ohne eigenes Profil)"}</span>`
        : `<p class="v7-k-leer">Keine Einheiten mit Puls in den letzten 4 Wochen.</p>`),
      karte("erholung", "status", "Belastung und Erholung", pa ? `<span class="v7-k-unter">Stand zu Tagesbeginn</span>
        <div class="v7-k-zahlen"><div><b>${pa.fitness}</b><span>Fitness</span></div><div><b>${pa.ermuedung}</b><span>Ermüdung</span></div><div><b>${sg(pa.form)}</b><span>Form</span></div></div>
        <span class="v7-k-fuss"><b class="st-farbe" style="--stc:${st.farbe}">${esc(st.name)}</b> · Ampel <b class="k-farbe" style="--kc:var(${bf})">${esc(bw)}</b> · Trendmodell, keine Messung</span>`
        : `<p class="v7-k-leer">Noch zu wenige Einheiten für Fitness und Form.</p>`),
      karte("leistung", "trend", "Leistungsentwicklung", `<span class="v7-k-unter">Rad · Laufen · Schwimmen</span>
        <p class="v7-k-text">Puls bei gleicher Leistung, Leistungskurve, Effizienz, Bestleistungen – nur geprüfte Vergleiche.</p>`),
      karte("laktat", "ampel", "Laktat und Schwellen", L && L.out.length ? `<span class="v7-k-unter">${esc(L.P.name || "Aktives Zonenprofil")}${L.P.freigabe && L.P.freigabe.datum ? " · bestätigt" : ""}</span>
        <div class="v7-lt"><span></span><small>LT1</small><small>LT2</small>${L.out.map((x) => `<span>${esc(x.lab)}</span><b>${esc(x.lt1)}<small> ${esc(x.unit)}</small></b><b>${esc(x.lt2)}<small> ${esc(x.unit)}</small></b>`).join("")}</div>
        <span class="v7-k-fuss">Stufentests, Einzelmessungen, Kurven und Zonen</span>` : `<p class="v7-k-leer">Noch kein bestätigtes Zonenprofil – Tests und Kurven ansehen.</p>`),
      karte("planvergleich", "plan", "Planvergleich", lw ? `<span class="v7-k-unter">KW ${W.isoWoche(lw.mo)} · Enduco geplant gegenüber absolviert</span>
        <div class="v7-k-zahlen"><div><b>${std(lw.soll.s)}</b><span>geplant</span></div><div><b>${std(lw.ist.netto)}</b><span>absolviert</span></div><div><b>${lw.diff_pct != null ? vz(lw.diff_pct) + Math.abs(lw.diff_pct) + " %" : "–"}</b><span>Abweichung</span></div></div>`
        : `<span class="v7-k-unter">Enduco geplant gegenüber absolviert</span><p class="v7-k-text">${pv && pv.wochen.some((w) => w.soll.n) ? "Noch keine abgeschlossene Woche mit vollständigem Enduco-Plan im Garmin-Kalender – die bisherigen Wochen sind als unvollständig sichtbar." : "Noch keine Woche mit Enduco-Plan im Garmin-Kalender."}</p>`),
    ].join("");
    const weitere = [["ausdauer", "energie", "Ausdauer und Verpflegung", "Ermüdungsresistenz, lange Ausfahrt, Koppelläufe, Train your Gut"],
      ["tagebuch", "ablauf", "Aktivitäten", "Serie und Trainingstagebuch – jede Einheit im Explorer"],
      ["leistung#bests-card", "flagge", "Bestleistungen", "Lauf-Bestzeiten aus den Sekundenwerten"],
      ["umfang#year-card", "kalender", "Jahresstatistik", "Jahre im Vergleich"],
      ["schwimmen", "schwimm", "Schwimmen", "CSS-Tests und Technikübungen"],
      ["koerper", "beine", "Körper und Energie", "Gewicht, Energiebilanz, Makros"]];
    box.innerHTML = `<div class="v7-gitter">${html}</div>
      <h2 class="v7-abschnitt">Weitere Analysen</h2>
      <ul class="v6-aktionen v7-liste">${weitere.map(([z, ic, t2, s2]) => `<li><button type="button" data-ziel="${z}">${W.icon(ic, 22)}<span><b>${esc(t2)}</b><small>${esc(s2)}</small></span>${pfeil()}</button></li>`).join("")}</ul>`;
    box.querySelectorAll("[data-ziel]").forEach((b) => (b.onclick = () => { const [v, id] = b.dataset.ziel.split("#"); geh(v, id); }));
  }

  /* ---------------- Planvergleich (planvergleich-1.0) ---------------- */
  const eigenGarmin = (p) => (V66() && V66().eigenGarmin ? V66().eigenGarmin(p, C.D.plan_garmin) : false);
  function sollWoche(mo) {
    const D = C.D, bis = V7().addDays(mo, 6), out = [];
    const PL = (D.planned || []).filter((p) => p && p.date >= mo && p.date <= bis && !eigenGarmin(p));
    for (const p of PL) {
      let e = null; try { e = H() && H().profilVon ? H().profilVon(p) : null; } catch (err) { console.error(err); }
      const d = e && isNum(e.dauer) ? e.dauer : isNum(p.dur_s) ? p.dur_s : null;
      const z = e && e.pr && e.pr.balken.length && (p.sport === "rad" || p.sport === "lauf") ? V7().balkenZonen(e.pr.balken) : null;
      out.push({ date: p.date, sport: p.sport, dauer_s: d, zonen: z, herkunft: "kalender", titel: p.title });
    }
    try {
      for (const u of V64().enducoAusUhr((D.activities || []).filter((a) => a && a.date >= mo && a.date <= bis), PL))
        out.push({ date: u.date, sport: u.sport, dauer_s: u.dauer_s, zonen: null, herkunft: "uhr", titel: u.titel });
    } catch (err) { console.error(err); }
    return out;
  }
  function istWoche(mo) {
    const D = C.D, bis = V7().addDays(mo, 6), out = [];
    for (const a of D.activities || []) {
      if (!a || !a.date || a.date < mo || a.date > bis) continue;
      let zonen = null;
      if ((a.sport === "rad" || a.sport === "lauf") && Array.isArray(a.hh)) {
        const g = V7().pulsGrenzen(FK().activeProfile(D.zonen, a.date), a.sport);
        if (g) zonen = V7().histZonen(a.hh, g);
      }
      out.push({ date: a.date, sport: a.sport, netto_s: isNum(a.mv) ? a.mv : a.dur, brutto_s: isNum(a.el) ? a.el : null, zonen });
    }
    return out;
  }
  /** Wochen von der ersten mit Enduco-Spur (Kalender oder Uhr-Workout) bis zur laufenden, höchstens n (älteste zuerst). */
  M.planvergleichDaten = function (n) {
    if (!bereit() || !V64()) return null;
    const t = heute(), m0 = V7().montag(t), wochen = [];
    // vollständig ab: config.planvergleich_ab (Datum, ab dem alle Enduco-Einheiten in den Garmin-Kalender kommen), sonst die erste ganze Woche
    // nach dem ersten Enduco-Eintrag im Kalender
    const ersterK = (C.D.planned || []).filter((p) => p && p.date && !eigenGarmin(p)).map((p) => p.date).sort()[0] || null;
    const cfg = C.D.config && /^\d{4}-\d{2}-\d{2}$/.test(C.D.config.planvergleich_ab || "") ? C.D.config.planvergleich_ab : null;
    const vollAb = cfg ? (V7().montag(cfg) === cfg ? cfg : V7().addDays(V7().montag(cfg), 7)) : ersterK ? (V7().montag(ersterK) === ersterK ? ersterK : V7().addDays(V7().montag(ersterK), 7)) : null;
    for (let i = (n || 12) - 1; i >= 0; i--) {
      const mo = V7().addDays(m0, -7 * i);
      wochen.push(V7().woche(sollWoche(mo), istWoche(mo), { mo, heute: t, vollAb }));
    }
    const erste = wochen.findIndex((w) => w.soll.n > 0);
    return { wochen: erste < 0 ? wochen.slice(-1) : wochen.slice(erste), verlauf: V7().verlauf(wochen), vollAb };
  };
  let pvWoche = null;
  function balkenPaar(a, b, max, farbe) {
    const w = (v) => (max > 0 ? Math.max(0, Math.min(100, (100 * v) / max)) : 0);
    return `<div class="v7-paar"><div><span>geplant</span><i class="v7-b soll" style="width:${w(a)}%;--f:${farbe}"></i><b>${std(a)}</b></div>
      <div><span>absolviert</span><i class="v7-b" style="width:${w(b)}%;--f:${farbe}"></i><b>${std(b)}</b></div></div>`;
  }
  function stapel(z, vars, label) {
    const t = z.reduce((s, v) => s + v, 0);
    if (!t) return `<div class="v7-stapel leer"><span>keine Zeit</span></div>`;
    return `<div class="v7-stapel" role="img" aria-label="${esc(label)}">${z.map((v, i) => (v > 0 ? `<i style="flex:${v};background:var(${vars[i]})" title="${Math.round((100 * v) / t)} %"></i>` : "")).join("")}</div>`;
  }
  function planvergleichZeichnen() {
    const box = $("v7-pv"); if (!box || !bereit()) return;
    const W = V6(), R = M.planvergleichDaten(12);
    if (!R) { box.innerHTML = `<p class="hint">Wird berechnet …</p>`; return; }
    const L = R.wochen;
    if (!L.some((w) => w.soll.n > 0)) {
      box.innerHTML = `<div class="card v7-pv-leer"><h2>Noch kein Enduco-Plan erfasst</h2><p>Sobald Enduco-Einheiten im Garmin-Kalender stehen, vergleicht diese Ansicht je Woche: geplante Stunden, Sportarten und Intensität gegenüber dem, was du absolviert hast. Einzelne Workouts erscheinen hier nicht.</p></div>`;
      return;
    }
    const abg = L.filter((w) => w.abgeschlossen && w.soll.n > 0);
    if (!pvWoche || !L.some((w) => w.mo === pvWoche)) pvWoche = (abg.length ? abg[abg.length - 1] : L[L.length - 1]).mo;
    const w = L.find((x) => x.mo === pvWoche), i = L.indexOf(w), modus = lsGet("sf.pv.zonen", "5");
    const STAT = { ok: "abgeschlossen", laufend: "laufende Woche", "nur-uhr": "unvollständig · nur Uhr-Workouts", teil: "unvollständig · Kalender lückenhaft", "ohne-plan": "kein Enduco-Plan" };
    const maxS = Math.max(w.soll.s, w.ist.netto, 1), maxSp = Math.max(1, ...["schwimm", "rad", "lauf"].map((k) => Math.max(w.je[k].soll, w.je[k].ist)));
    const zS = modus === "3" ? w.zonen.soll3 : w.zonen.soll, zI = modus === "3" ? w.zonen.ist3 : w.zonen.ist;
    const vars = modus === "3" ? DREI.map((x) => x[1]) : ZVAR, namen = modus === "3" ? DREI.map((x) => x[0]) : ZW;
    const pS = V7().prozent(zS), pI = V7().prozent(zI);
    const nz = [];
    if (w.soll.ohneDauer) nz.push(`${w.soll.ohneDauer} geplante ${w.soll.ohneDauer === 1 ? "Einheit" : "Einheiten"} ohne Dauer (nicht mitgezählt)`);
    if (w.zonen.sollOffen > 0) nz.push(`${dt(w.zonen.sollOffen)} geplant ohne Zielbereich`);
    if (w.zonen.sollOhneZonen > 0) nz.push(`${dt(w.zonen.sollOhneZonen)} geplant ohne Schritte (nur Plandauer von der Uhr)`);
    if (w.zonen.istOhneZonen > 0) nz.push(`${dt(w.zonen.istOhneZonen)} absolviert ohne Puls oder ohne Zonenprofil`);
    const vl = R.verlauf, maxV = Math.max(1, ...L.map((x) => Math.max(x.soll.s, x.ist.netto)));
    const verlauf = L.map((x) => `<button type="button" class="v7-vl-w${x.mo === w.mo ? " akt" : ""}${x.status !== "ok" ? " blass" : ""}" data-pvw="${x.mo}" aria-label="KW ${W.isoWoche(x.mo)}: geplant ${std(x.soll.s)}, absolviert ${std(x.ist.netto)}">
        <span class="v7-vl-s"><i class="soll" style="height:${((100 * x.soll.s) / maxV).toFixed(1)}%"></i><i style="height:${((100 * x.ist.netto) / maxV).toFixed(1)}%"></i></span><small>${W.isoWoche(x.mo)}</small></button>`).join("");
    box.innerHTML = `
      <div class="card v7-pv-kopf">
        <div class="v7-pv-nav"><button type="button" class="btn rp-ib" data-pvn="-1" ${i > 0 ? "" : "disabled"} aria-label="Woche davor">${W.icon("zurueck", 18)}</button>
          <div><h2>KW ${W.isoWoche(w.mo)} · ${dkurz(w.mo)}–${dkurz(w.so)}</h2><span class="v7-pill${w.status === "ok" ? "" : " warn"}">${esc(STAT[w.status])}</span></div>
          <button type="button" class="btn rp-ib" data-pvn="1" ${i < L.length - 1 ? "" : "disabled"} aria-label="Woche danach">${W.icon("weiter", 18)}</button></div>
        <div class="v7-k-zahlen"><div><b>${std(w.soll.s)}</b><span>Enduco geplant</span></div><div><b>${std(w.ist.netto)}</b><span>Garmin absolviert</span></div>
          <div><b>${w.diff_pct != null ? `${vz(w.diff_s)}${std(Math.abs(w.diff_s))}` : "–"}</b><span>${w.diff_pct != null ? `${vz(w.diff_pct)}${Math.abs(w.diff_pct)} %` : "Abweichung"}</span></div></div>
        ${balkenPaar(w.soll.s, w.ist.netto, maxS, "var(--accent)")}
      </div>
      <div class="card"><h2 class="v7-h2">Je Sportart</h2>
        ${["schwimm", "rad", "lauf"].map((k) => `<div class="v7-sp"><span class="v7-sp-k"><span class="ek-sport" style="--sp:${spVar(k)}">${W.sportIcon(k, 16)}</span>${SPW[k]}<small>${w.je[k].diff_pct != null ? `${vz(w.je[k].diff_s)}${std(Math.abs(w.je[k].diff_s))} (${vz(w.je[k].diff_pct)}${Math.abs(w.je[k].diff_pct)} %)` : w.je[k].ist > 0 ? "nicht geplant" : ""}</small></span>
          ${balkenPaar(w.je[k].soll, w.je[k].ist, maxSp, spVar(k))}</div>`).join("")}
        ${w.je.andere.ist > 0 || w.je.andere.soll > 0 ? `<p class="hint">Andere Sportarten: geplant ${std(w.je.andere.soll)}, absolviert ${std(w.je.andere.ist)}.</p>` : ""}
      </div>
      <div class="card"><div class="card-head"><h2 class="v7-h2">Intensität Rad und Laufen</h2>
          <div class="seg" role="group" aria-label="Einteilung"><button type="button" data-pvz="5" aria-pressed="${modus !== "3"}">5 Zonen</button><button type="button" data-pvz="3" aria-pressed="${modus === "3"}">LT1 / LT2</button></div></div>
        <div class="v7-st-zeile"><span>geplant</span>${stapel(zS, vars, "Intensität geplant")}</div>
        <div class="v7-st-zeile"><span>absolviert</span>${stapel(zI, vars, "Intensität absolviert")}</div>
        <table class="t v7-zt" data-keine-liste><tr><th></th>${namen.map((n2, j) => `<th><i class="v7-dot" style="background:var(${vars[j]})"></i>${esc(n2)}</th>`).join("")}</tr>
          <tr><td>geplant</td>${zS.map((v, j) => `<td>${pS ? pS[j] + " %" : "–"}<small>${v > 0 ? dt(v) : ""}</small></td>`).join("")}</tr>
          <tr><td>absolviert</td>${zI.map((v, j) => `<td>${pI ? pI[j] + " %" : "–"}<small>${v > 0 ? dt(v) : ""}</small></td>`).join("")}</tr></table>
        <p class="hint">Geplant: Zielbereiche der Workout-Schritte in deinem Zonenprofil (Leistung bzw. Tempo). Absolviert: Zeit nach Puls in deinen Pulszonen. Unterschiedliche Messgrössen – vergleiche vor allem die Anteile.</p>
      </div>
      <div class="card"><h2 class="v7-h2">Zeit</h2>
        <div class="v7-k-zahlen"><div><b>${std(w.ist.netto)}</b><span>Netto (Bewegung)</span></div><div><b>${std(w.ist.brutto)}</b><span>Brutto (gesamt)</span></div><div><b>${std(w.ist.pausen)}</b><span>Pausen</span></div></div>
        ${nz.length ? `<h3 class="abschnitt">Nicht zuordenbar</h3><ul class="v7-nz">${nz.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="hint">Alle Zeit zugeordnet.</p>`}
        ${w.ist.bruttoFehlt ? `<p class="hint">${w.ist.bruttoFehlt} Aktivität${w.ist.bruttoFehlt === 1 ? "" : "en"} ohne Gesamtzeit: Brutto = Netto.</p>` : ""}
      </div>
      <div class="card"><h2 class="v7-h2">Verlauf</h2>
        <div class="v7-vl" role="group" aria-label="Wochen: geplant (Rand) und absolviert (gefüllt)">${verlauf}</div>
        <p class="v7-vl-leg"><i class="soll"></i>geplant <i></i>absolviert</p>
        ${vl.n ? `<p>${vl.n} abgeschlossene ${vl.n === 1 ? "Woche" : "Wochen"} mit Plan: geplant ${std(vl.soll_s)}, absolviert ${std(vl.ist_s)} (${vz(vl.diff_pct)}${Math.abs(vl.diff_pct)} %); ${vl.treffer} davon innerhalb ±10 %.</p>` : `<p class="hint">Noch keine abgeschlossene Woche mit vollständigem Plan.</p>`}
      </div>
      <details class="v7-methode"><summary>So wird gerechnet</summary>
        <p>Woche = Montag bis Sonntag (Datum der Aktivität in Schweizer Zeit). Geplant = Enduco-Einheiten aus dem Garmin-Kalender, ohne die selbst gesendeten «IN · …»; stand an einem Tag nichts im Kalender, zählt die Plandauer eines Enduco-Workouts, das auf der Uhr lief. Vergangene Kalendertage ändern sich nach dem Tag nicht mehr – ein später geänderter Plan schreibt alte Wochen nicht um.</p>
        <p>Ein Urteil (Abweichung, Verlauf) gibt es nur für Wochen mit vollständigem Soll: ab ${R.vollAb ? esc(C.dateCH(R.vollAb)) : "dem ersten Kalendereintrag"} und ohne Enduco-Workouts auf der Uhr, die im Kalender fehlten. Frühere Wochen bleiben sichtbar, aber «unvollständig».</p>
        <p>Absolviert = Netto-Zeit (Bewegungszeit, sonst Timer-Dauer) der erfassten Aktivitäten; Brutto = Gesamtzeit; Pausen = Brutto − Netto. Zonen nur Rad und Laufen; Schwimmen ohne Zonenvergleich (Puls im Wasser unsicher).</p>
        <p>Was fehlt, bleibt fehlend: Einheiten ohne Dauer, Schritte ohne Ziel und Zeit ohne Puls stehen unter «Nicht zuordenbar» und werden nie verteilt. ${esc(V7().VERSIONS.planvergleich)}.</p></details>`;
    box.querySelectorAll("[data-pvn]").forEach((b) => (b.onclick = () => { const j = i + +b.dataset.pvn; if (L[j]) { pvWoche = L[j].mo; planvergleichZeichnen(); } }));
    box.querySelectorAll("[data-pvw]").forEach((b) => (b.onclick = () => { pvWoche = b.dataset.pvw; planvergleichZeichnen(); }));
    box.querySelectorAll("[data-pvz]").forEach((b) => (b.onclick = () => { lsSet("sf.pv.zonen", b.dataset.pvz); planvergleichZeichnen(); }));
  }

  /* ---------------- Plan: Übersicht und Werkzeuge ---------------- */
  function planKopfZeichnen() {
    const box = $("v7-plan-kopf"); if (!box || !bereit()) return;
    const W = V6(), t = heute(), mo = V7().montag(t);
    let R = []; try { R = W.rennenPrio(C.races ? C.races() : []).filter((r) => r.date >= t); } catch (e) { console.error(e); }
    const A = R.find((r) => r.prio === "A") || R[0] || null;
    let S = null; try { S = AN() ? AN().saison(t, W.rennenPrio(C.races ? C.races() : [])) : null; } catch (e) { console.error(e); }
    const jetzt = S ? (S.alle || S.wochen || []).find((w) => w.woche === mo) : null;
    const mp = M.meinPlanWoche(mo).filter((x) => ["schwimm", "rad", "lauf"].includes(x.sport));
    const planS = mp.reduce((s, x) => s + x.dur_s, 0);
    const istS = V7().wochenUmfang(C.D.activities, t, 1)[0];
    const istSum = istS.schwimm + istS.rad + istS.lauf;
    const tage = A ? Math.round((Date.parse(A.date + "T12:00:00Z") - Date.parse(t + "T12:00:00Z")) / 864e5) : null;
    const p = planS > 0 ? Math.min(100, Math.round((100 * istSum) / planS)) : 0;
    box.innerHTML = `<div class="card v7-plan-held">
        ${A ? `<span class="v7-k-unter">${W.icon("flagge", 14)} Hauptrennen</span><h2 class="v7-held-t">${esc(A.name || A.short || "Rennen")}</h2>
          <p class="v7-held-s">${esc(C.dateCH(A.date))} · in ${Math.floor(tage / 7)} Wochen (${tage} Tage)</p>` : `<h2 class="v7-held-t">Kein Rennen eingetragen</h2>`}
        ${jetzt ? `<p class="v7-held-ph"><b>${esc(jetzt.phase || "")}</b>${jetzt.phaseNr && jetzt.phaseN ? ` · Woche ${jetzt.phaseNr} von ${jetzt.phaseN}` : ""}${jetzt.erholung ? " · Erholungswoche" : ""}</p>` : ""}
        <div class="v7-k-zahlen"><div><b>${std(planS)}</b><span>Mein Plan diese Woche</span></div><div><b>${std(istSum)}</b><span>absolviert</span></div><div><b>${planS ? p + " %" : "–"}</b><span>erreicht</span></div></div>
        <div class="v7-fort"><i style="width:${p}%"></i></div>
        <button type="button" class="btn v7-held-k" data-ziel="kalender">${W.icon("kalender", 16)} Woche im Kalender</button></div>`;
    box.querySelector("[data-ziel]").onclick = () => geh("kalender");
  }
  function planWerkzeugeZeichnen() {
    const box = $("v7-plan-werkzeuge"); if (!box || !bereit()) return;
    const W = V6(), L = [["plan-rennen", "flagge", "Rennen", "Haupt- und Vorbereitungsrennen mit Strecken"],
      ["plan-modell", "intervall", "Trainingsmodell", "Polarisiert, pyramidal, rennspezifisch – Intensität je Sportart"],
      ["plan-stunden", "status", "Wochenstunden", "Vorschlag je Woche aus deinen Wochen, Erholung und Taper"],
      ["plan-aufbau", "lauf", "Aufbau-Check", "Laufumfang ohne Sprünge steigern"],
      ["plan-tests", "ampel", "Testkalender", "Stufentests, Laktat-Kurzchecks und CSS-Tests"]];
    box.innerHTML = `<h2 class="v7-abschnitt">Plan verwalten</h2><ul class="v6-aktionen v7-liste">${L.map(([z, ic, t2, s2]) => `<li><button type="button" data-ziel="${z}">${W.icon(ic, 22)}<span><b>${esc(t2)}</b><small>${esc(s2)}</small></span>${pfeil()}</button></li>`).join("")}</ul>`;
    box.querySelectorAll("[data-ziel]").forEach((b) => (b.onclick = () => geh(b.dataset.ziel)));
  }

  /* ---------------- Labor (Expertenbereich) ---------------- */
  function laborZeichnen() {
    const box = $("v7-labor"); if (!box || !bereit()) return;
    const W = V6(), L = [["wissen", null, "ablauf", "Methodische Grundlagen", "Alle Modelle und Regeln der Seite mit Quellen"],
      ["bibliothek", null, "plan", "Enduco-Datenbestand", "Alle Enduco-Workouts aus Garmin mit Fassungen und Terminen"],
      ["labor", "mo-woche-card", "intervall", "Woche nach Modell und Enduco", "Vorschlag je Tag neben dem Enduco-Plan, «Ich folge»"],
      ["labor", "vg-card", "trend", "Vorschlag und Enduco über die Wochen", "Wochenweise nachgerechnet"],
      ["labor", "v56-plan", "check", "Enduco-Workouts auf der Uhr", "Einzelne Workouts: Dauer, Zielbereich, Hauptteil"],
      ["labor", "db-card", "status", "Datenbasis und Prüfung", "Datenqualität, Referenzsatz"],
      ["labor", "method-card", "fokus", "Modellversionen und Rechennachweis", "Trainingslast-Methoden und Versionen"]];
    box.innerHTML = `<div class="card v7-labor-intro"><p>Hier liegt alles, was du nicht täglich brauchst: Rechennachweise, Modellversionen, Methoden und die Enduco-Daten im Einzelnen. Die normale Bedienung kommt ohne diesen Bereich aus.</p></div>
      <ul class="v6-aktionen v7-liste">${L.map(([v, id, ic, t2, s2]) => `<li><button type="button" data-ziel="${v}${id ? "#" + id : ""}">${W.icon(ic, 22)}<span><b>${esc(t2)}</b><small>${esc(s2)}</small></span>${pfeil()}</button></li>`).join("")}</ul>`;
    box.querySelectorAll("[data-ziel]").forEach((b) => (b.onclick = () => { const [v, id] = b.dataset.ziel.split("#"); if (v === "labor") { const el = $(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } else geh(v, id); }));
  }

  /* ---------------- Seitenleiste ab 1024 px: Abstand oben ---------------- */
  function kopfHoehe() {
    const m = document.querySelector("main"); if (!m) return;
    document.documentElement.style.setProperty("--v7-oben", Math.round(m.getBoundingClientRect().top) + "px");
  }
  window.addEventListener("resize", kopfHoehe); setTimeout(kopfHoehe, 50);

  /* ---------------- Ansicht gezeigt / neu zeichnen ---------------- */
  const ZEICHNER = { analyse: analyseZeichnen, planvergleich: planvergleichZeichnen, plan: () => { planKopfZeichnen(); planWerkzeugeZeichnen(); }, labor: laborZeichnen };
  M.gezeigt = function (name) {
    kopfHoehe();
    const f = ZEICHNER[name]; if (!f) return;
    const los = () => { try { f(); } catch (e) { console.error(e); } };
    if (typeof V5_READY !== "undefined") V5_READY.then(los); else los();
  };
  M.neu = function () { const v = document.querySelector("section.view:not([hidden])"); if (v) M.gezeigt(v.id.slice(5)); };
})();
