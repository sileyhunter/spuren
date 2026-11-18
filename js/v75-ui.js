/* Ironman Notebook V7.5 – Etappe 3 · Oberfläche «Planeinstellungen», Vorbild: die Planeinstellungen von enduco (Blätter nacheinander, Aufbau,
   Antipp-Verhalten; Texte, Symbole und Grafiken eigen). Rechenlogik in js/v75.js (planeinstellungen-1.0, basis-1.1, steigerung-1.0, indoor-phase-1.0, V7.6 kraft-plan-1.0 mit js/v76.js),
   Schwimm-Einheit in js/schwimmen.js (schwimmeinheit-1.2).
   V7.5.1: ein Blatt als Folge Laufen → Rad → Schwimmen → Trainingsumfang → «Fertig ✓» (unten «‹», auf dem letzten «Fertig ✓»), geöffnet über
   Plan → Plan verwalten (zuoberst), das Profil und die Wochenstunden (dort direkt beim Trainingsumfang). Je Sportart die Basis-Fitness (basis-1.1: Fitness
   der Sportart am Montag im Ring, antippen = eigener Wert mit Regler, «Zurück auf berechnet», Datum der Änderung); Rad und Laufen: Indoor-Phase; Schwimmen:
   Equipment, Standard-Bahnlänge, Anfänger-Modus (Schalter), Stile. Trainingsumfang: Start des Plans (Basis-Fitness oder «jetzt» mit 20/50/30), ein Regler
   für alle drei Sportarten mit Wort und Farbe je Bereich, Kurve bis zum Hauptrennen mit dem Bereich 50–150 %, live beim Ziehen.
   Gespeichert über «Direkt speichern» (Eingabe planeinstellung → plan_einstellungen): jede Auswahl beim Übernehmen, Start und Steigerung mit «Fertig ✓».
   Start, eigene Basis-Fitness und Steigerung gelten ab der nächsten Woche; die laufende Woche bleibt, wie sie ist.
   V7.6 (kraft-plan-1.0, js/v76.js): Seite «Krafttraining» zwischen Schwimmen und Trainingsumfang – fester Termin (Wochentag, Uhrzeit, Dauer, Notiz für die
   Übungen) ab der nächsten Woche, Ausnahmen kommender Wochen zurück zur Regel; auch aus dem Tagesblatt (V75UI.flow({ seite: "kraft" })).
   V7.6.1 (kraft-plan-1.1, verfuegbarkeit-1.1, Silas' Wünsche vom 17.11.2026, Vorbild «Allgemeine Planeinstellungen» von enduco): erste Seite «Allgemein» mit
   Trainingsverfügbarkeit (alle Wochentage, V66UI.verfuegbarkeitWoche), Tagen für lange Einheiten (pe-lang, ab der nächsten Woche) und dem Testkalender;
   Krafttraining mit Tag automatisch (mögliche Tage) oder fest.
   Danach rechnen Plan, Kalender und Heute neu (Ereignis «meinplan»), offene Garmin-Aufträge dieser und der nächsten Woche werden nachgeführt.
   Nichts davon geht an Enduco. */
(function () {
  "use strict";
  const M = (window.V75UI = window.V75UI || {});
  const V75 = () => window.V75, V64 = () => window.V64, V6 = () => window.V6, V59 = () => window.V59, UI = () => window.V5UI, SW = () => window.SW, V76 = () => window.V76;
  const P = () => window.V64UI, U66 = () => window.V66UI;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, s) => (V6() ? V6().icon(n, s || 20) : "");
  const komma = (x, d) => String(Math.round(x * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)).replace(".", ",");
  const hm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`; };
  const SPORT_NAME = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  const IM_SPORT = { schwimm: "im Schwimmen", rad: "auf dem Rad", lauf: "im Laufen" };
  const HM_NAME = { brett: "Brett (Kickboard)", pullbuoy: "Pullbuoy", flossen: "Flossen", paddles: "Paddles" };
  const HM_SATZ = { brett: "Kraulbeine und Übungen mit Brett", pullbuoy: "Pull-Serie in langen Einheiten", flossen: "Übungen mit Flossen; ohne Brett die Beine in Seitlage",
    paddles: "freiwillig im Pull" };
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && V75() && V64() && V6() && V59() && window.AN); };
  const heute = () => C.iso(C.today);
  const tagKurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  const tagLang = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}.${+m}.${y}`; };
  const wtVon = (iso) => ((new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;

  /* ---------- Daten ---------- */
  /** Einstellungen aus den Daten, darüber die noch nicht eingespielten Eingaben dieses Geräts (V75.einstellungen; opt.bis wie dort). */
  M.einstellungen = function (opt) {
    C = C || (UI() && UI().C);
    if (!C || !V75()) return null;
    const I = UI() && UI().Inbox && UI().Inbox.data;
    return V75().einstellungen(C.D.plan_einstellungen || [], (I && I.planeinstellung) || [], opt);
  };
  /** Für SW.einheit (schwimmeinheit-1.2): vorhandene Hilfsmittel, Stile, Anfänger-Modus. */
  M.schwimmOpt = function () {
    const E = M.einstellungen();
    return E ? { hilfsmittel: E.schwimm.hilfsmittel.slice(), stile: E.schwimm.stile.slice(), anfaenger: E.schwimm.anfaenger === true } : {};
  };
  /** Standard-Bahnlänge aus den Einstellungen (null = nicht gesetzt). */
  M.pool = function () { const E = M.einstellungen(); return E && E.schwimm.pool ? E.schwimm.pool : null; };
  M.indoorAm = (sport, datum) => { const E = M.einstellungen(); return !!(E && V75().indoorAm(E, sport, datum)); };
  /** Wert für das Feld drinnen (einheit-felder-1.1): nur ausdrücklich, wenn er von der Indoor-Phase abweicht. */
  M.drinnenFeld = (sport, datum, drinnen) => { const E = M.einstellungen(); return E ? V75().drinnenFeld(E, sport, datum, drinnen) : (drinnen ? true : null); };
  let BD = { k: "", m: new Map() };
  /** Grundlagen der Basis am Montag mo (V75.basisDaten: Fitness bis zum Sonntag davor, Last pro Stunde der 8 Wochen), einmal je Datenstand.
   *  Die Seite hat a.tss schon nach config.load_model gesetzt. */
  M.basisDaten = function (mo) {
    C = C || (UI() && UI().C); if (!C || !V75() || !mo) return null;
    const k = `${(C.D.activities || []).length}|${C.D.updated || ""}|${(C.D.config && C.D.config.load_model) || ""}`;
    if (BD.k !== k) BD = { k, m: new Map() };
    if (!BD.m.has(mo)) { let d = null; try { d = V75().basisDaten(C.D.activities, mo); } catch (e) { console.error(e); } BD.m.set(mo, d); }
    return BD.m.get(mo);
  };
  /** Stand der laufenden Woche aus der Woche nach Modell: Saison, Vorgaben («jetzt», Spitze), Basis und Rampe. */
  function kontext() { try { return P() && P().kontextFuer ? P().kontextFuer(V64().montag(heute())) : null; } catch (e) { console.error(e); return null; } }
  /** Basis, wie sie ab der nächsten Woche gilt: Einstellungen von jetzt, Fitness vom Montag dieser Woche. sel = { start, steigerung, basis } (Vorschau). */
  function basisAb(K, sel) {
    const mo = V64().montag(heute()), ab = V64().addDays(mo, 7), E = M.einstellungen({ startBis: ab, montag: ab });
    if (sel) { if (sel.start) E.start = sel.start; if (isNum(sel.steigerung)) E.steigerung = sel.steigerung; if (sel.basis) Object.assign(E.basis, sel.basis); }
    const D = M.basisDaten(mo);
    return { E, ab, mo, D, ba: K && K.vg ? V75().basis(K.vg, E, V64().AUFTEILUNG, D) : null };
  }
  /** Plan bis zum Hauptrennen, wie er gilt: die laufende Woche mit ihrem Start, ab der nächsten Woche mit den Einstellungen von jetzt (Start, eigene
   *  Basis-Fitness, Steigerung); sel wie bei basisAb. → { R (laufende Woche + neue Rampe), Rneu (nur neue Rampe), lo, hi, S, spitze, jetzt, ba0, ba, E, ab } */
  M.plan = function (sel) {
    if (!bereit()) return null;
    const K = kontext(); if (!K || !K.S || !K.vg || !K.basis75) return null;
    const { E, ab, ba } = basisAb(K, sel); if (!ba) return null;
    const A = V64().AUFTEILUNG, R1 = (x) => V75().rampe(K.S.wochen, ba, K.vg.spitze, x, A);
    const R0 = K.rampe && K.rampe.length ? K.rampe[0] : null, mix = (R) => R.map((r, i) => (i === 0 && R0 ? R0 : r));
    const Rneu = R1(E.steigerung);
    return { R: mix(Rneu), Rneu, lo: mix(R1(V75().STEIGERUNG.min)), hi: mix(R1(V75().STEIGERUNG.max)), S: K.S, spitze: K.vg.spitze, jetzt: K.vg.jetzt,
      ba0: K.basis75, ba, E, ab };
  };
  async function sichern(id, felder) {
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.planeinstellung)) I.data.planeinstellung = [];
    // V7.6: Gruppen ab der nächsten Woche tragen die Fassung mit, die diese Woche noch gilt (V75.eintrag mit der bisher neuesten)
    const alt = V75().aktuell(C.D.plan_einstellungen || [], I.data.planeinstellung, id);
    const x = V75().eintrag(id, felder, undefined, alt), f = V75().pruefen(x); if (f) return f;
    await I.upsert("planeinstellung", x);
    try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); }
    // offene Garmin-Aufträge (morgen bis eine Woche voraus) mit dem neuen Stand abgleichen – nur geänderte werden neu gespeichert
    try { if (U66() && U66().auftraegeAbgleichen) { const mo = V64().montag(heute()); await U66().auftraegeAbgleichen(mo); await U66().auftraegeAbgleichen(V64().addDays(mo, 7)); } } catch (e) { console.error(e); }
    return null;
  }
  /** V7.6: speichern von aussen (Einheit-Seite: Ausnahme einer Woche fürs Krafttraining); → Fehlertext oder null. */
  M.speichern = (id, felder) => (bereit() ? sichern(id, felder) : Promise.resolve("Seite noch nicht bereit"));
  /** Kurze Bestätigung unten am Bildschirm (nach «Fertig ✓», wenn das Blatt schon zu ist). */
  function toast(t) {
    let el = document.getElementById("pe-toast");
    if (!el) { el = document.createElement("p"); el.id = "pe-toast"; el.className = "pe-toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 4500);
  }

  /* ---------- Steigerung: Bereiche, Kurve ---------- */
  /** Bereiche des Reglers (eigene Worte, Farben wie der Verlauf des Reglers): bis … % → Wort, Farbe. 100 % = Standard. */
  M.STUFEN = [{ bis: 70, wort: "sanft", farbe: "--ci1" }, { bis: 110, wort: "ausgewogen", farbe: "--ci2" }, { bis: 125, wort: "zügig", farbe: "--ci3" },
    { bis: 140, wort: "steil", farbe: "--ci4" }, { bis: 150, wort: "maximal", farbe: "--ci5" }];
  M.stufe = (v) => M.STUFEN.find((s) => v <= s.bis) || M.STUFEN[M.STUFEN.length - 1];
  const stufeText = (v) => `${M.stufe(v).wort}${v === V75().STEIGERUNG.standard ? " (Standard)" : ""}`;
  const startWort = (ba) => (ba && ba.quelle === "fitness" ? "aus deiner Basis-Fitness" : "mit «jetzt» und 20/50/30");
  function verlaufText(X, wert) {
    const v = V75().verlauf(X.Rneu, X.spitze); if (!v) return "";
    const kw = (mo) => `KW ${V6().isoWoche(mo)} (${tagKurz(mo)})`;
    const plus = v.plus_h > 0.01 ? `Ø +${hm(v.plus_h)} pro Woche${isNum(v.plus_pct) ? ` (≈ +${komma(v.plus_pct)} %)` : ""}` : "kaum Zuwachs";
    let t = v.spitzeAb ? `Spitzenwoche (${komma(X.spitze)} h) ab ${kw(v.spitzeAb)}, bis dahin ${plus}.`
      : `Bis zum Taper ≈ ${komma(v.ende)} h – die Spitzenwoche (${komma(X.spitze)} h) wird nicht erreicht; ${plus}.`;
    if (v.gedeckelt) t += ` In ${v.gedeckelt} ${v.gedeckelt === 1 ? "Woche" : "Wochen"} greift die Grenze: höchstens 10 % mehr als in der Woche davor.`;
    const neu = Math.round(X.ba.summe * 2) / 2, diese = X.ba0 ? Math.round(X.ba0.summe * 2) / 2 : null;
    t += diese != null && Math.abs(diese - neu) >= 0.25 ? ` Diese Woche bleibt bei ${komma(diese)} h; ab ${kw(X.ab)} beginnt der Plan bei ${komma(neu)} h ${startWort(X.ba)}.`
      : ` Start ${komma(neu)} h ${startWort(X.ba)}.`;
    return t + (wert === 100 ? " 100 % = gleichmässig bis zur Woche vor dem Taper." : "");
  }
  /** Kurve bis zum Hauptrennen: Linie = Trainingsumfang mit der gewählten Steigerung (Belastungswochen, ohne die Dellen der Erholungswochen; im Taper
   *  die Taper-Stunden), Fläche = Bereich von 50 bis 150 %, Punkt = Rennwoche. Achse ab 0 h, damit der Anstieg nicht grösser aussieht, als er ist. */
  function kurve(X) {
    const wert = (r) => (r.phase === "Taper" ? r.schwimm + r.rad + r.lauf : r.roh.summe);
    const a = X.R.map(wert), lo = X.lo.map(wert), hi = X.hi.map(wert), n = a.length; if (n < 2) return "";
    const w = 320, h = 178, x0 = 30, xr = w - 10, y0 = 10, yb = h - 20;
    const top = Math.max(...hi, ...a, X.spitze || 0, 1), max = top * 1.08;
    const X_ = (i) => x0 + (i / (n - 1)) * (xr - x0), Y = (v) => yb - (v / max) * (yb - y0);
    const pfad = (A) => A.map((v, i) => `${i ? "L" : "M"}${X_(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
    const band = `${pfad(hi)} ${lo.map((_, i) => `L${X_(n - 1 - i).toFixed(1)} ${Y(lo[n - 1 - i]).toFixed(1)}`).join(" ")} Z`;
    const iT = X.R.findIndex((r) => r.phase === "Taper");
    const stufen = [0, top / 2, top].map((v) => `<line x1="${x0}" x2="${xr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="pe-gitter"/>
      <text x="${x0 - 4}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" class="pe-ax">${komma(v, 0)} h</text>`).join("");
    const taper = iT > 0 ? `<line x1="${X_(iT).toFixed(1)}" x2="${X_(iT).toFixed(1)}" y1="${y0}" y2="${yb}" class="pe-taper"/><text x="${(X_(iT) - 3).toFixed(1)}" y="${y0 + 8}" text-anchor="end" class="pe-ax">Taper</text>` : "";
    const haupt = X.S && X.S.haupt ? X.S.haupt : null;
    return `<svg class="pe-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Stunden pro Woche bis zum Hauptrennen: gewählte Steigerung als Linie, Bereich von 50 bis 150 % als Fläche">
      ${stufen}<path d="${band}" class="pe-band"/>${taper}<path d="${pfad(a)}" class="pe-linie"/>
      <circle cx="${X_(n - 1).toFixed(1)}" cy="${Y(a[n - 1]).toFixed(1)}" r="5" class="pe-punkt"/>
      <text x="${x0}" y="${h - 4}" class="pe-ax">jetzt</text><text x="${xr}" y="${h - 4}" text-anchor="end" class="pe-ax">${esc(haupt ? `${haupt.name || "Rennen"} ${haupt.date ? tagKurz(haupt.date) : ""}` : "Rennen")}</text></svg>`;
  }

  /* ---------- Blatt-Folge: Laufen → Rad → Schwimmen → Krafttraining → Trainingsumfang ---------- */
  const SEITEN = ["allgemein", "lauf", "rad", "schwimm", "kraft", "umfang"];
  const TITEL = { allgemein: "Allgemein", lauf: "Laufen", rad: "Rad", schwimm: "Schwimmen", kraft: "Krafttraining", umfang: "Trainingsumfang" };
  let FLOW = { zurueck: null, entwurf: null, entwurfStart: null };
  const pfeil = () => ic("weiter", 18);
  function zeile(attr, links, titel, satz, wert) {
    return `<li><button type="button" ${attr}>${links}<span><b>${esc(titel)}</b>${satz ? `<small>${esc(satz)}</small>` : ""}</span><em>${esc(wert || "")}</em>${pfeil()}</button></li>`;
  }
  const ring = (sport, v, gross) => `<span class="pe-ring${gross ? " gross" : ""}" style="--sp:var(--sp-${sport})" aria-hidden="true">${isNum(v) ? Math.round(v) : "–"}</span>`;
  const kopf = (i) => `<div class="pe-kopf"><span>Planeinstellungen</span><ol class="pe-punkte" aria-label="Schritt ${i + 1} von ${SEITEN.length}">${SEITEN.map((x, k) =>
    `<li class="${k === i ? "an" : k < i ? "fertig" : ""}"${k === i ? ' aria-current="step"' : ""}><span class="sr-only">${esc(TITEL[x])}</span></li>`).join("")}</ol></div>`;
  const meldungHTML = (t) => `<p class="pe-meldung" role="status" aria-live="polite"${t ? "" : " hidden"}>${esc(t || "")}</p>`;
  /** Öffnet die Planeinstellungen. opt.seite = Index oder Name («umfang»), opt.zurueck = was «‹» auf dem ersten Blatt tut (sonst schliessen). */
  M.flow = function (opt) {
    opt = opt || {};
    if (!bereit() || (U66() && U66().entwurfSperre && U66().entwurfSperre())) return;   // V7.9: Planeinstellungen nicht im Bearbeiten-Modus
    FLOW = { zurueck: typeof opt.zurueck === "function" ? opt.zurueck : null, entwurf: null, entwurfStart: null };
    const i = typeof opt.seite === "string" ? SEITEN.indexOf(opt.seite) : opt.seite;
    seite(isNum(i) && i >= 0 && i < SEITEN.length ? i : 0);
  };
  M.oeffnen = M.flow;
  function indoorSatz(E, sport) {
    const p = E.indoor[sport];
    return p ? `${tagLang(p.von)} bis ${tagLang(p.bis)} – ${sport === "rad" ? "Rad-Einheiten auf der Rolle" : "Läufe auf dem Laufband"}`
      : `keine – lege eine Zeit fest, in der ${sport === "rad" ? "deine Rad-Einheiten auf der Rolle" : "deine Läufe auf dem Laufband"} geplant werden`;
  }
  /** Zeile «Basis-Fitness»: Ring = Fitness, die ab der nächsten Woche zählt (eigene oder berechnete vom Montag), darunter der Start der Sportart. */
  function basisZeile(s, BA) {
    const b = BA && BA.ba ? BA.ba[s] : null, d = BA && BA.D ? BA.D[s] : null, fit = b ? b.fitness : d ? d.fitness : null;
    const satz = !b ? `Wie viel Training ${IM_SPORT[s]} dein Körper gewohnt ist`
      : BA.E.start !== "fitness" ? "zurzeit nicht verwendet – Start mit «jetzt» und 20/50/30"
      : b.quelle !== "fitness" ? "zu wenig Training für die Last pro Stunde – Start mit «jetzt» × Anteil"
      : `Start ≈ ${hm(b.h)} pro Woche${b.eigen != null ? " · eigener Wert" : ""}`;
    return zeile(`data-pe="basis" data-sport="${s}"`, ring(s, fit), "Basis-Fitness", satz);
  }
  function seite(i, meldung) {
    const s = SEITEN[i], E = M.einstellungen(), BA = basisAb(kontext());
    if (!E) return;
    let inhalt;
    if (s === "allgemein") {                                              // V7.6.1: wie «Allgemeine Planeinstellungen» bei enduco (Texte eigen)
      const vt = U66() && U66().verfuegbarkeitText ? U66().verfuegbarkeitText() : "";
      inhalt = `<div class="blatt-titel">${ic("regler", 34)}<h2 id="v59-ov-h" tabindex="-1">Allgemein</h2>
          <p class="sub">Wann du trainieren kannst – für Schwimmen, Rad und Laufen.</p></div>${meldungHTML(meldung)}
        <ul class="v6-aktionen pe-liste">
          ${zeile(`data-pe="verf"`, ic("kalender", 22), "Trainingsverfügbarkeit", vt || "Höchstens so viel Zeit je Wochentag")}
          ${zeile(`data-pe="lang"`, ic("uhr", 22), "Tage für lange Einheiten", langText(E.lang))}
          ${zeile(`data-pe="tests"`, ic("tacho", 22), "Leistungstests", "Testkalender – die Seite schlägt die Termine vor")}</ul>
        <p class="hint">Die Verfügbarkeit gilt jede Woche (einen einzelnen Tag änderst du im Tagesblatt); die Tage für lange Einheiten ab der nächsten Woche.
          Beides sind Grenzen und Wünsche für den Vorschlag – was nicht passt, wird gemeldet, nie still verschoben.</p>`;
    } else if (s === "lauf" || s === "rad") {
      inhalt = `<div class="blatt-titel"><span class="pe-sp gross" style="--sp:var(--sp-${s})">${V6().sportIcon(s, 34)}</span><h2 id="v59-ov-h" tabindex="-1">${esc(TITEL[s])}</h2>
          <p class="sub">Was dein Plan ${esc(IM_SPORT[s])} berücksichtigt.</p></div>${meldungHTML(meldung)}
        <ul class="v6-aktionen pe-liste">
          ${basisZeile(s, BA)}
          ${zeile(`data-pe="indoor" data-sport="${s}"`, ic("drinnen", 22), "Indoor-Phase", indoorSatz(E, s))}</ul>`;
    } else if (s === "schwimm") {
      const S = E.schwimm, pool = S.pool || (window.SWUI && window.SWUI.becken ? window.SWUI.becken() : 25);
      inhalt = `<div class="blatt-titel"><span class="pe-sp gross" style="--sp:var(--sp-schwimm)">${V6().sportIcon("schwimm", 34)}</span><h2 id="v59-ov-h" tabindex="-1">Schwimmen</h2>
          <p class="sub">Was dein Plan im Schwimmen berücksichtigt.</p></div>${meldungHTML(meldung)}
        <ul class="v6-aktionen pe-liste">
          ${basisZeile("schwimm", BA)}
          ${zeile(`data-pe="equipment"`, ic("geraet", 22), "Schwimm-Equipment", S.hilfsmittel.length ? S.hilfsmittel.map((k) => HM_NAME[k].replace(" (Kickboard)", "")).join(", ") : "keine Hilfsmittel")}
          ${zeile(`data-pe="pool"`, ic("becken", 22), "Standard-Bahnlänge", S.pool ? "für deine Schwimm-Einheiten; je Einheit änderbar" : "noch nicht festgelegt – bisher wie dein Gerät bzw. deine Enduco-Workouts", `${pool} m`)}
          <li class="pe-schalter-z"><label>${ic("technik", 22)}<span><b>Anfänger-Modus</b><small>Kürzere Wiederholungen, längere Pausen, nur einfache Übungen</small></span>
            <input type="checkbox" role="switch" data-pe-anf${S.anfaenger ? " checked" : ""}><i class="pe-schalter" aria-hidden="true"></i></label></li>
          ${zeile(`data-pe="stile"`, ic("schwimm", 22), "Stile", SW() ? SW().stileText(S.stile) : "Kraul")}
          ${zeile(`data-pe="kurs"`, ic("kalender", 22), "Schwimmkurs (Dienstag)", kursText(S))}</ul>`;
    } else if (s === "kraft") {
      const K = E.kraft, D = V76(), ab = V64().addDays(V64().montag(heute()), 7), AUS = D ? D.ausnahmen(E, ab) : [];
      const ausText = (a) => (a.aus ? "ausgelassen" : `am ${D.TAGE[wtVon(a.tag) - 1]}${a.uhrzeit ? " " + a.uhrzeit : ""}`);
      inhalt = `<div class="blatt-titel"><span class="pe-sp gross" style="--sp:var(--fg)">${ic("kraft", 34)}</span><h2 id="v59-ov-h" tabindex="-1">Krafttraining</h2>
          <p class="sub">Einmal pro Woche – zusätzlich zu Schwimmen, Rad und Laufen.</p></div>${meldungHTML(meldung)}
        <ul class="v6-aktionen pe-liste">
          ${zeile(`data-pe="kraft"`, ic("kalender", 22), "Termin", K.aktiv ? (D ? D.text(K) : "jede Woche") : "kein Krafttraining eingeplant", "")}
          ${K.aktiv ? zeile(`data-pe="kraft"`, ic("notiz", 22), "Übungen", K.notiz ? K.notiz : "noch keine Notiz – für dich, die Seite plant keine Übungen", "") : ""}
          ${AUS.map((a) => zeile(`data-pe="kraftwoche" data-mo="${a.mo}"`, ic("ausnahme", 22), `Woche vom ${tagLang(a.mo)}`, `nur diese Woche: ${ausText(a)}`, "")).join("")}</ul>
        <p class="hint">${esc(D ? D.VERSIONS.kraft : "kraft-plan")}: zählt nicht zu den Wochenstunden Schwimmen, Rad, Laufen und nicht in TL ≈, Fitness und Form, belegt aber seine Zeit am Tag.
          Am Tag danach steht keine harte Rad- oder Laufeinheit; nicht am Tag eines Tests und nicht am Vortag, nicht in Rennwochen; in Erholungswochen und im Taper kürzer.
          Nach Garmin geht es nicht. Eine einzelne Woche verschiebst oder lässt du auf der Seite der Einheit aus.</p>`;
    } else {
      const st = FLOW.entwurf != null ? FLOW.entwurf : E.steigerung, start = FLOW.entwurfStart || BA.E.start;
      inhalt = `<div class="blatt-titel">${ic("trend", 34)}<h2 id="v59-ov-h" tabindex="-1">Trainingsumfang</h2>
          <p class="sub">Lege fest, womit dein Plan beginnt und wie schnell dein Umfang bis zur Spitzenwoche steigt – für Schwimmen, Rad und Laufen.</p></div>${meldungHTML(meldung)}
        <div class="pe-start" role="radiogroup" aria-label="Start des Plans">${[["fitness", "Basis-Fitness", "je Sportart aus deinem Training"], ["aufteilung", "«jetzt» 20/50/30", "wie bisher"]].map(([k, t, u]) =>
          `<button type="button" role="radio" aria-checked="${k === start}" data-pes="${k}"><b>${t}</b><small>${u}</small></button>`).join("")}</div>
        <div class="pe-legende"><span><i class="l"></i>Trainingsumfang</span><span><i class="b"></i>Bereich 50–150 %</span></div>
        <div class="pe-kurve" data-pek></div>
        <div class="pe-wert" data-pewb><b data-pew></b><span><i aria-hidden="true"></i><em data-pel></em></span></div>
        <div class="pe-regler"><input type="range" min="${V75().STEIGERUNG.min}" max="${V75().STEIGERUNG.max}" step="${V75().STEIGERUNG.schritt}" value="${st}" data-per aria-label="Steigerung in Prozent"></div>
        <p class="pe-text" data-pet></p>
        <p class="hint">${esc(V75().VERSIONS.basis)}: Start mit der Basis-Fitness = je Sportart 7 × Fitness ÷ Trainingslast pro Stunde (deine 8 Wochen), der Umfang, bei
          dem die Fitness gleich bleibt; mit «jetzt» = Median deiner 8 Wochen, aufgeteilt 20/50/30. ${esc(V75().VERSIONS.steigerung)} (eigene Festlegung): Jede Sportart geht von ihrem Start zu ihrem Anteil an der Spitzenwoche (Schwimmen 20, Rad 50, Laufen 30 %).
          100 % = gleichmässig bis zur Woche vor dem Taper (der Vorschlag wie bisher), mehr = früher an der Spitze, weniger = darunter. Die Linie zeigt die Belastungswochen;
          Erholungswochen (65 %), Taper, B-Rennen, deine Verfügbarkeit und der Aufbau-Check Laufen gelten wie bisher. Bei enduco ist der höchste Wert etwa 10 % mehr Umfang pro
          Woche; hier ist das die feste Obergrenze. Die Spitzenwoche stellst du unter Plan → Wochenstunden ein.</p>
        <p class="warn-t" data-pef hidden></p>`;
    }
    const letzte = i === SEITEN.length - 1;
    const ov = V59().blatt("pe", `${kopf(i)}${inhalt}
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-pe-zur aria-label="${i === 0 ? (FLOW.zurueck ? "Zurück" : "Schliessen") : `Zurück zu ${esc(TITEL[SEITEN[i - 1]])}`}">${ic("zurueck", 22)}</button>
        ${letzte ? `<button type="button" class="btn primary gross" data-pe-fertig>Fertig ${ic("haken", 18)}</button>` : `<button type="button" class="btn primary" data-pe-weiter>Weiter ${ic("weiter", 18)}</button>`}</div>`);
    ov.querySelector("[data-pe-zur]").onclick = () => {
      if (s === "umfang") { FLOW.entwurf = +ov.querySelector("[data-per]").value; const g = ov.querySelector('[data-pes][aria-checked="true"]'); if (g) FLOW.entwurfStart = g.dataset.pes; }
      if (i > 0) seite(i - 1); else if (FLOW.zurueck) FLOW.zurueck(); else V59().schliessen();
    };
    ov.querySelectorAll("[data-pe]").forEach((b) => (b.onclick = () => unterBlatt(b.dataset.pe, b.dataset.sport || b.dataset.mo, i)));
    const anf = ov.querySelector("[data-pe-anf]");
    if (anf) anf.onchange = async () => {
      anf.disabled = true;
      const f = await schwimmSpeichern(E, { anfaenger: anf.checked });
      if (f) { anf.checked = !anf.checked; anf.disabled = false; const p = ov.querySelector(".pe-meldung"); if (p) { p.textContent = f; p.hidden = false; } return; }
      seite(i, anf.checked ? "Anfänger-Modus an – gilt für deine Schwimm-Einheiten." : "Anfänger-Modus aus.");
    };
    if (letzte) umfangBinden(ov, BA.E); else ov.querySelector("[data-pe-weiter]").onclick = () => seite(i + 1);
  }
  /** Trainingsumfang: Start und Steigerung live in der Kurve; «Fertig ✓» speichert, was sich geändert hat (gilt ab der nächsten Woche). */
  function umfangBinden(ov, E) {
    const inp = ov.querySelector("[data-per]");
    const g0 = ov.querySelector('[data-pes][aria-checked="true"]');
    let start = g0 ? g0.dataset.pes : E.start;
    const zeig = () => {
      const v = +inp.value, X = M.plan({ start, steigerung: v }), st = M.stufe(v);
      ov.querySelector("[data-pew]").textContent = `${v} %`;
      ov.querySelector("[data-pel]").textContent = stufeText(v);
      const box = ov.querySelector(".te-box") || ov; box.style.setProperty("--stufe", `var(${st.farbe})`);   // Punkt und Griff in der Farbe des Bereichs
      inp.setAttribute("aria-valuetext", `${v} %, ${stufeText(v)}`);
      ov.querySelector("[data-pek]").innerHTML = X ? kurve(X) : `<p class="hint">Ohne Hauptrennen keine Saison – die Steigerung wirkt erst mit einem Rennen.</p>`;
      ov.querySelector("[data-pet]").textContent = X ? verlaufText(X, v) : "";
    };
    inp.oninput = zeig; zeig();
    ov.querySelectorAll("[data-pes]").forEach((b) => (b.onclick = () => {
      start = b.dataset.pes; FLOW.entwurfStart = start;
      ov.querySelectorAll("[data-pes]").forEach((x) => x.setAttribute("aria-checked", String(x.dataset.pes === start)));
      zeig();
    }));
    ov.querySelector("[data-pe-fertig]").onclick = async (ev) => {
      const v = +inp.value, b = ev.currentTarget, L = [];
      if (start !== E.start) L.push(["pe-start", { art: start }]);
      if (v !== E.steigerung) L.push(["pe-steigerung", { wert: v }]);
      if (!L.length) { V59().schliessen(); return; }
      b.disabled = true;
      for (const [id, felder] of L) {
        const f = await sichern(id, felder);
        if (f) { b.disabled = false; const p = ov.querySelector("[data-pef]"); p.textContent = f; p.hidden = false; return; }
      }
      V59().schliessen();
      toast(`${start === "fitness" ? "Start aus deiner Basis-Fitness" : "Start mit «jetzt» und 20/50/30"}, Steigerung ${v} % (${stufeText(v)}) – gilt ab der nächsten Woche.`);
    };
  }

  /* ---------- Unterblätter (zurück = dieselbe Seite der Folge) ---------- */
  const fuss = (haupt) => `<div class="blatt-fuss"><button type="button" class="btn-zurueck" data-pe-z aria-label="Zurück ohne zu speichern">${ic("zurueck", 22)}</button>${haupt || ""}</div>`;
  const okKnopf = () => `<button type="button" class="btn primary" data-peok>Übernehmen ${ic("haken", 18)}</button>`;
  function unterBlatt(art, sport, i) {
    if (!bereit()) return;
    if (art === "verf") { if (U66() && U66().verfuegbarkeitWoche) U66().verfuegbarkeitWoche(() => seite(i)); return; }   // V7.6.1 verfuegbarkeit-1.1
    if (art === "tests") { V59().schliessen(); if (window.APP && window.APP.showTab) window.APP.showTab("plan-tests"); else location.hash = "#plan-tests"; return; }
    const ov = art === "basis" ? basisBlatt(sport, i) : art === "indoor" ? indoorBlatt(sport, i) : art === "equipment" ? equipmentBlatt(i) : art === "pool" ? poolBlatt(i) : art === "stile" ? stileBlatt(i)
      : art === "kraft" ? kraftBlatt(i) : art === "kraftwoche" ? kraftWocheBlatt(sport, i) : art === "lang" ? langBlatt(i) : art === "kurs" ? kursBlatt(i) : null;
    if (!ov) return;
    ov.querySelectorAll("[data-pe-z]").forEach((b) => (b.onclick = () => seite(i)));
  }
  /** Speichern und zurück auf die Seite der Folge – oder, mit zur (Blatt direkt geöffnet, z. B. aus dem Tagesblatt), Meldung unten und zur(). */
  async function speichernUnd(ov, i, id, felder, ok, zur) {
    ov.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const f = await sichern(id, felder);
    if (f) { ov.querySelectorAll("button").forEach((b) => (b.disabled = false)); const p = ov.querySelector("[data-pef]"); if (p) { p.textContent = f; p.hidden = false; } return; }
    if (zur) { toast(ok); zur(); } else seite(i, ok);
  }
  /** Basis-Fitness einer Sportart: berechnet (Stand Montag) oder eigener Wert mit Regler; live der Start daraus (basis-1.1). */
  function basisBlatt(sport, i) {
    const K = kontext(), BA = basisAb(K), D = BA.D && BA.D[sport] ? BA.D[sport] : {}, Ejetzt = M.einstellungen();
    const eigen = isNum(Ejetzt.basis[sport]) ? Ejetzt.basis[sport] : null, ber = isNum(D.fitness) ? D.fitness : null, am = Ejetzt.stand["pe-basis-" + sport];
    const wert0 = eigen != null ? eigen : ber != null ? Math.round(ber) : 0;
    const max = Math.min(V75().FIT_MAX, Math.max(50, 10 * Math.ceil((2 * Math.max(ber || 0, eigen || 0, 1)) / 10)));
    const lastText = sport === "rad" && C.D.config && /^last-2/.test(C.D.config.load_model || "") ? "mit deiner LT2 bzw. nach Puls, last-2.1" : "wie von Garmin geliefert";
    const t1 = `Die Fitness ist das 42-Tage-Mittel deiner Trainingslast ${esc(IM_SPORT[sport])} (Last ${esc(lastText)}), wie ${esc(window.FK ? window.FK.VERSIONS.pmc : "pmc")}, nur mit dieser Sportart, Stand Montag ${tagKurz(BA.mo)} `
      + `(bis zum Sonntag davor) – so ändert sich eine Woche unter der Woche nicht. Bei enduco heisst das «Base Fitnesslevel»; dort wird die Last etwas anders gerechnet.`;
    const t2 = isNum(D.tl_h) ? `Last pro Stunde ${esc(IM_SPORT[sport])}: ${komma(D.tl_h)} (${komma(D.h)} h in den ${D.wochen} Wochen vor dem Montag).`
      : `Für die Last pro Stunde fehlt Training ${esc(IM_SPORT[sport])} (weniger als 1 h in 52 Wochen): diese Sportart beginnt mit «jetzt» × Anteil.`;
    const ov = V59().blatt("pe", `<div class="blatt-titel"><span data-pefring>${ring(sport, wert0, true)}</span><h2 id="v59-ov-h" tabindex="-1">Basis-Fitness ${esc(SPORT_NAME[sport])}</h2>
        <p class="sub">Wie viel Training ${esc(IM_SPORT[sport])} dein Körper gewohnt ist.</p></div>
      <div class="pe-fit"><button type="button" class="btn" data-pefm aria-label="1 weniger">−</button>
        <input type="range" min="0" max="${max}" step="1" value="${wert0}" data-pefr aria-label="Basis-Fitness ${esc(SPORT_NAME[sport])}">
        <button type="button" class="btn" data-pefp aria-label="1 mehr">+</button></div>
      <p class="pe-text" data-pefs role="status" aria-live="polite"></p>
      <p class="ek-text">${t1}</p>
      <p class="ek-text">${t2}</p>
      <p class="hint">${esc(V75().VERSIONS.basis)} (Variante A): Start der Sportart = 7 × Fitness ÷ Last pro Stunde = der Umfang, bei dem die Fitness gleich bleibt (höchstens 30 h).
        Ein eigener Wert gilt ab der nächsten Woche, bis du ihn zurücksetzt.${BA.E.start !== "fitness" ? " Zurzeit beginnt dein Plan mit «jetzt» und 20/50/30 (Trainingsumfang); dein Wert zählt, sobald dort «Basis-Fitness» gewählt ist." : ""}</p>
      <p class="warn-t" data-pef hidden></p>${fuss(`${eigen != null ? `<button type="button" class="btn" data-pe-ber>Zurück auf berechnet</button>` : ""}${okKnopf()}`)}`);
    const inp = ov.querySelector("[data-pefr]");
    const zeig = () => {
      // auf dem berechneten Wert mit der ungerundeten Fitness rechnen (wie der Plan), sonst mit dem gewählten Wert
      const v = +inp.value, fit = eigen == null && ber != null && v === Math.round(ber) ? ber : v;
      const h = isNum(D.tl_h) ? Math.min(V75().BASIS_MAX, (7 * fit) / D.tl_h) : null;
      ov.querySelector("[data-pefring]").innerHTML = ring(sport, v, true);
      inp.setAttribute("aria-valuetext", String(v));
      const her = eigen != null && v === eigen ? `Eigener Wert${am ? ` seit ${tagLang(String(am).slice(0, 10))}` : ""}${ber != null ? ` (berechnet: ${Math.round(ber)})` : ""}.`
        : ber != null && v === Math.round(ber) ? `Berechnet aus deinem Training (Stand Montag ${tagKurz(BA.mo)}).` : `Eigener Wert${ber != null ? ` (berechnet: ${Math.round(ber)})` : ""}.`;
      ov.querySelector("[data-pefs]").textContent = `${her} ${h != null ? `Start ≈ ${hm(h)} pro Woche (7 × ${komma(fit)} ÷ ${komma(D.tl_h)}).` : ""}`;
    };
    inp.oninput = zeig;
    ov.querySelector("[data-pefm]").onclick = () => { inp.value = Math.max(0, +inp.value - 1); zeig(); };
    ov.querySelector("[data-pefp]").onclick = () => { inp.value = Math.min(max, +inp.value + 1); zeig(); };
    zeig();
    const ab = tagLang(BA.ab);
    ov.querySelector("[data-peok]").onclick = () => {
      const v = +inp.value;
      if (eigen != null ? v === eigen : ber != null && v === Math.round(ber)) { seite(i); return; }
      speichernUnd(ov, i, "pe-basis-" + sport, { wert: v }, `Basis-Fitness ${SPORT_NAME[sport]} ${v} – gilt ab der Woche vom ${ab}.`);
    };
    const zur = ov.querySelector("[data-pe-ber]");
    if (zur) zur.onclick = () => speichernUnd(ov, i, "pe-basis-" + sport, { wert: null }, `Basis-Fitness ${SPORT_NAME[sport]} wieder berechnet – gilt ab der Woche vom ${ab}.`);
    return ov;
  }
  function indoorBlatt(sport, i) {
    const E = M.einstellungen(), p = E.indoor[sport], rad = sport === "rad";
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("drinnen", 34)}<h2 id="v59-ov-h" tabindex="-1">Indoor-Phase ${esc(SPORT_NAME[sport])}</h2>
        <p class="sub">Lege eine Zeit fest, in der ${rad ? "deine Rad-Einheiten auf der Rolle" : "deine Läufe auf dem Laufband"} geplant werden.</p></div>
      <div class="pe-daten"><label>von<input type="date" data-pev value="${esc(p ? p.von : heute())}"></label><label>bis<input type="date" data-peb value="${esc(p ? p.bis : "")}"></label></div>
      <p class="ek-text">${`In dieser Zeit stehen ${rad ? "Rad-Einheiten als «drinnen» (Rolle)" : "Läufe als «drinnen» (Laufband)"} in Mein Plan, im Kalender und beim Export, die Einheit zeigt «Indoor». `
        + "Dauer und Inhalt bleiben; lange Einheiten bleiben lang. Eine einzelne Einheit stellst du auf ihrer Seite um (Outdoor bzw. Indoor) – diese Wahl bleibt, auch wenn du die Phase änderst."}</p>
      <p class="hint">${esc(V75().VERSIONS.indoor)} (eigene Festlegung), höchstens ein Jahr. Einheiten aus der Enduco-Bibliothek bleiben wie dort.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(`${p ? `<button type="button" class="btn" data-pe-weg>Keine Indoor-Phase</button>` : ""}${okKnopf()}`)}`);
    const weg = ov.querySelector("[data-pe-weg]");
    if (weg) weg.onclick = () => speichernUnd(ov, i, "pe-indoor-" + sport, { von: null, bis: null }, `Indoor-Phase ${SPORT_NAME[sport]} entfernt.`);
    ov.querySelector("[data-peok]").onclick = () => {
      const von = ov.querySelector("[data-pev]").value, bis = ov.querySelector("[data-peb]").value;
      if (!von || !bis) { const f = ov.querySelector("[data-pef]"); f.textContent = "Von und bis wählen."; f.hidden = false; return; }
      if (p && p.von === von && p.bis === bis) { seite(i); return; }
      speichernUnd(ov, i, "pe-indoor-" + sport, { von, bis }, `Indoor-Phase ${SPORT_NAME[sport]}: ${tagLang(von)} bis ${tagLang(bis)}.`);
    };
    return ov;
  }
  /** Gruppe «pe-schwimm» als Ganzes (Hilfsmittel, Bahnlänge, Stile, Anfänger-Modus, V7.6.2 Schwimmkurs); → Fehlertext oder null. */
  function schwimmSpeichern(E, aenderung) {
    const s = Object.assign({ hilfsmittel: E.schwimm.hilfsmittel, pool: E.schwimm.pool, stile: E.schwimm.stile, anfaenger: E.schwimm.anfaenger === true,
      kurs_bis: E.schwimm.kurs_bis || null, kurs_nur: E.schwimm.kurs_nur === true }, aenderung);
    return sichern("pe-schwimm", { hilfsmittel: s.hilfsmittel, pool: s.pool, stile: s.stile, anfaenger: s.anfaenger, kurs_bis: s.kurs_bis, kurs_nur: s.kurs_nur });
  }
  /** V7.6.2 kurs-1.0: Schwimmkurs am Dienstag – bis wann, und ob an Kurstagen nur geschwommen wird (kein Rad, kein Laufen). */
  const kursText = (S) => (S.kurs_bis && S.kurs_bis < heute() ? `vorbei (letzter Kurstag ${tagLang(S.kurs_bis)})`
    : `${S.kurs_bis ? `bis ${tagLang(S.kurs_bis)}` : "ohne Enddatum"}${S.kurs_nur ? " · an Kurstagen nur Schwimmen" : ""}`);
  function kursBlatt(i) {
    const E = M.einstellungen(), S = E.schwimm;
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("kalender", 34)}<h2 id="v59-ov-h" tabindex="-1">Schwimmkurs</h2>
        <p class="sub">Dein Kurs am Dienstag: im Plan als eigene Einheit, nach dem letzten Kurstag wird daraus lockeres Schwimmen.</p></div>
      <label class="pe-notiz"><span>Letzter Kurstag</span><input type="date" data-kbis value="${esc(S.kurs_bis || "")}"></label>
      <p class="hint">Leer = der Kurs läuft weiter. Nach diesem Tag plant die Seite am Dienstag wieder normal.</p>
      <div class="pe-schalter-z einzeln"><label><span></span><span><b>An Kurstagen nur Schwimmen</b><small>Kein Rad und kein Laufen am Dienstag, solange der Kurs läuft</small></span>
        <input type="checkbox" role="switch" data-knur${S.kurs_nur ? " checked" : ""}><i class="pe-schalter" aria-hidden="true"></i></label></div>
      <p class="hint">kurs-1.0: Die Zeit des Tages kommt aus deiner Trainingsverfügbarkeit; «Kein Training» geht vor. Einheiten, die am Dienstag stünden, verteilt die Seite auf andere Tage
        (gemeldet). Gilt sofort – die laufende Woche, wenn sie schon festgehalten ist, erst mit «Anpassen».</p>
      <p class="warn-t" data-pef hidden></p>${fuss(okKnopf())}`);
    ov.querySelector("[data-peok]").onclick = () => {
      const bis = ov.querySelector("[data-kbis]").value || null, nur = ov.querySelector("[data-knur]").checked;
      if (bis === (S.kurs_bis || null) && nur === (S.kurs_nur === true)) { seite(i); return; }
      schwimmUnd(ov, i, E, { kurs_bis: bis, kurs_nur: nur }, `Schwimmkurs: ${kursText({ kurs_bis: bis, kurs_nur: nur })}.`);
    };
    return ov;
  }
  async function schwimmUnd(ov, i, E, aenderung, ok) {
    ov.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const f = await schwimmSpeichern(E, aenderung);
    if (f) { ov.querySelectorAll("button").forEach((b) => (b.disabled = false)); const p = ov.querySelector("[data-pef]"); if (p) { p.textContent = f; p.hidden = false; } return; }
    seite(i, ok);
  }
  function equipmentBlatt(i) {
    const E = M.einstellungen(), H = E.schwimm.hilfsmittel;
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("geraet", 34)}<h2 id="v59-ov-h" tabindex="-1">Schwimm-Equipment</h2><p class="sub">Was du ins Becken mitnimmst.</p></div>
      <div class="v73-wahl" role="group" aria-label="Hilfsmittel">${V75().HILFSMITTEL.map((k) => `<label class="v73-opt pe-check"><input type="checkbox" value="${k}"${H.includes(k) ? " checked" : ""}><span>${ic("haken", 20)}<b>${esc(HM_NAME[k])}</b><small>${esc(HM_SATZ[k])}</small></span></label>`).join("")}</div>
      <p class="hint">${esc(SW() ? SW().VERSIONS.einheit : "schwimmeinheit")}: Technikübungen nur mit vorhandenen Hilfsmitteln; ohne Brett die Beine in Seitlage mit Flossen, ohne beides kein Beine-Block; ohne Pullbuoy kein Pull – die Zeit geht in die Hauptserie.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(okKnopf())}`);
    ov.querySelector("[data-peok]").onclick = () => {
      const neu = V75().HILFSMITTEL.filter((k) => ov.querySelector(`input[value="${k}"]`).checked);
      if (JSON.stringify(neu) === JSON.stringify(H)) { seite(i); return; }
      schwimmUnd(ov, i, E, { hilfsmittel: neu }, "Schwimm-Equipment gespeichert.");
    };
    return ov;
  }
  function poolBlatt(i) {
    const E = M.einstellungen(), p = E.schwimm.pool || (window.SWUI ? window.SWUI.becken() : 25);
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("becken", 34)}<h2 id="v59-ov-h" tabindex="-1">Standard-Bahnlänge</h2><p class="sub">Gilt für deine Schwimm-Einheiten; auf der Seite einer Einheit kannst du sie für diese Einheit ändern.</p></div>
      <div class="v73-wahl">${[25, 50].map((m) => `<button type="button" class="v73-opt knopf${m === p ? " an" : ""}" data-pep="${m}" aria-pressed="${m === p}"><span>${ic("becken", 20)}<b>${m} m</b><small>${m === 50 ? "Langbahn: Übungen über eine halbe Bahn, dann die Bahn locker beenden" : "Kurzbahn: Übungen über eine ganze Bahn"}</small></span></button>`).join("")}</div>
      ${E.schwimm.pool ? "" : `<p class="hint">Noch nicht festgelegt: bisher galt die Wahl auf diesem Gerät bzw. die häufigste Bahnlänge deiner Enduco-Workouts (${p} m).</p>`}
      <p class="warn-t" data-pef hidden></p>${fuss()}`);
    ov.querySelectorAll("[data-pep]").forEach((b) => (b.onclick = () => {
      const m = +b.dataset.pep; if (m === E.schwimm.pool) { seite(i); return; }
      schwimmUnd(ov, i, E, { pool: m }, `Standard-Bahnlänge ${m} m.`);
    }));
    return ov;
  }
  function stileBlatt(i) {
    const E = M.einstellungen(), L = E.schwimm.stile, S = SW();
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("schwimm", 34)}<h2 id="v59-ov-h" tabindex="-1">Stile</h2><p class="sub">Welche Stile in deinen Schwimm-Einheiten vorkommen.</p></div>
      <div class="v73-wahl" role="group" aria-label="Stile">
        <label class="v73-opt pe-check"><input type="checkbox" checked disabled><span>${ic("haken", 20)}<b>Kraul</b><small>immer – dein Wettkampfstil: Technikübungen, Beine, Haupt- und Pull-Serien</small></span></label>
        ${V75().STILE.map((k) => `<label class="v73-opt pe-check"><input type="checkbox" value="${k}"${L.includes(k) ? " checked" : ""}><span>${ic("haken", 20)}<b>${esc(S ? S.STILE[k] : k)}</b><small>am Ende des Ein- und des Ausschwimmens</small></span></label>`).join("")}</div>
      <p class="hint">${esc(S ? S.VERSIONS.einheit : "schwimmeinheit")}: Je Woche ein gewählter Stil (abwechselnd) als eigener Teil am Ende des Ein- und des Ausschwimmens; alles andere Kraul.
        Auf der Uhr steht dieser Teil mit seinem Stil (garmin-senden-1.2). Andere Stile plant die Seite nicht.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(okKnopf())}`);
    ov.querySelector("[data-peok]").onclick = () => {
      const neu = V75().STILE.filter((k) => ov.querySelector(`input[value="${k}"]`).checked);
      if (JSON.stringify(neu) === JSON.stringify(L)) { seite(i); return; }
      schwimmUnd(ov, i, E, { stile: neu }, `Stile: ${S ? S.stileText(neu) : neu.join(", ")}.`);
    };
    return ov;
  }
  /** V7.6: das Blatt «Krafttraining» direkt (Tagesblatt, Seite der Einheit); opt.zurueck = was «Zurück» und das Speichern danach tun. */
  M.kraft = function (opt) {
    if (!bereit() || (U66() && U66().entwurfSperre && U66().entwurfSperre())) return;
    const zur = (opt && opt.zurueck) || (() => V59().schliessen());
    const ov = kraftBlatt(null, zur); if (!ov) return;
    ov.querySelectorAll("[data-pe-z]").forEach((b) => (b.onclick = () => zur()));
  };
  /** V7.6 kraft-plan-1.1: an/aus, Tag automatisch (mögliche Tage, die Seite wählt jede Woche den besten) oder fest (Wochentag), Uhrzeit (Stunde und Minute
   *  in 5er-Schritten oder ohne), Dauer 15–180 min, Notiz. */
  function kraftBlatt(i, zur) {
    const E = M.einstellungen(), K = E.kraft, D = V76(); if (!D) return null;
    const ab = tagLang(V64().addDays(V64().montag(heute()), 7));
    let wt = K.wt || 3, an = !!K.aktiv, modus = K.modus === "fest" ? "fest" : "auto", tage = (K.tage && K.tage.length ? K.tage : [1, 2, 3, 4, 5, 6, 7]).slice();
    const [h0, m0] = K.uhrzeit ? K.uhrzeit.split(":") : ["", "00"];
    const opt = (n, w, f) => Array.from({ length: n }, (_, k) => { const v = String(k * f).padStart(2, "0"); return `<option value="${v}"${v === w ? " selected" : ""}>${v}</option>`; }).join("");
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("kraft", 34)}<h2 id="v59-ov-h" tabindex="-1">Krafttraining</h2><p class="sub">Einmal pro Woche, zusätzlich zu Schwimmen, Rad und Laufen.</p></div>
      <div class="pe-schalter-z einzeln"><label><span></span><span><b>Jede Woche einplanen</b><small>als eigene Einheit in Mein Plan, im Kalender und auf Heute</small></span>
        <input type="checkbox" role="switch" data-pek-an${an ? " checked" : ""}><i class="pe-schalter" aria-hidden="true"></i></label></div>
      <div class="pe-kraft" data-pek-felder${an ? "" : " hidden"}>
        <p class="pe-feld-t" id="pek-modus">Tag</p>
        <div class="pe-start pe-modus" role="radiogroup" aria-labelledby="pek-modus">${[["auto", "Automatisch", "die Seite wählt jede Woche den besten Tag"], ["fest", "Fester Tag", "immer am selben Wochentag"]].map(([k, t, u]) =>
          `<button type="button" role="radio" aria-checked="${k === modus}" data-pekmo="${k}"><b>${t}</b><small>${u}</small></button>`).join("")}</div>
        <div data-pek-auto${modus === "auto" ? "" : " hidden"}><p class="pe-feld-t" id="pek-tage">Mögliche Tage</p>
          <div class="pe-tage" role="group" aria-labelledby="pek-tage">${D.TAGE_KURZ.map((t, k) => `<button type="button" aria-pressed="${tage.includes(k + 1)}" aria-label="${D.TAGE[k]}" data-pekat="${k + 1}">${t}</button>`).join("")}</div>
          <p class="hint">Nie am Tag vor einer harten Rad- oder Laufeinheit, lieber an einem Tag mit einer kurzen lockeren Einheit, mit Zeit laut deiner Verfügbarkeit; Tage mit «Kein Training» nie.</p></div>
        <div data-pek-fest${modus === "fest" ? "" : " hidden"}><p class="pe-feld-t" id="pek-wt">Wochentag</p>
          <div class="pe-tage" role="radiogroup" aria-labelledby="pek-wt">${D.TAGE_KURZ.map((t, k) => `<button type="button" role="radio" aria-checked="${k + 1 === wt}" aria-label="${D.TAGE[k]}" data-pekt="${k + 1}">${t}</button>`).join("")}</div></div>
        <p class="pe-feld-t" id="pek-zeit">Uhrzeit</p>
        <div class="pe-zeit" role="group" aria-labelledby="pek-zeit"><select data-pekh aria-label="Stunde"><option value=""${h0 ? "" : " selected"}>ohne</option>${opt(24, h0, 1)}</select>
          <span aria-hidden="true">:</span><select data-pekm aria-label="Minute"${h0 ? "" : " disabled"}>${opt(12, m0, 5)}</select></div>
        <p class="pe-feld-t" id="pek-d">Dauer</p>
        <div class="pe-fit"><button type="button" class="btn" data-pekdm aria-label="5 min weniger">−</button>
          <input type="range" min="${V75().KRAFT.min}" max="${V75().KRAFT.max}" step="5" value="${K.dauer || V75().KRAFT.dauer}" data-pekd aria-labelledby="pek-d">
          <button type="button" class="btn" data-pekdp aria-label="5 min mehr">+</button></div>
        <p class="pe-text" data-peks role="status" aria-live="polite"></p>
        <label class="pe-notiz"><span>Notiz für die Übungen</span><textarea data-pekn rows="3" maxlength="${V75().KRAFT.notiz}" placeholder="z. B. Kniebeugen, Kreuzheben, Rumpf">${esc(K.notiz || "")}</textarea></label></div>
      <p class="hint">${esc(D.VERSIONS.kraft)}: gilt ab der Woche vom ${ab}; die laufende Woche bleibt, wie sie ist (dort änderst du die Einheit auf ihrer Seite).
        Standard 1:30 h. Das Krafttraining zählt nicht zu den Wochenstunden und nicht in TL ≈, Fitness und Form; seine Zeit fehlt am Tag für Schwimmen, Rad und Laufen.
        Am Tag danach keine harte Rad- oder Laufeinheit, nicht am Tag eines Tests und am Vortag, nicht in Rennwochen; Erholungswoche und Taper zwei Drittel.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(okKnopf())}`);
    const sw = ov.querySelector("[data-pek-an]"), felderEl = ov.querySelector("[data-pek-felder]"), dEl = ov.querySelector("[data-pekd]");
    const hEl = ov.querySelector("[data-pekh]"), mEl = ov.querySelector("[data-pekm]");
    const entwurf = () => ({ aktiv: true, modus, tage: modus === "auto" ? tage.slice().sort() : null, wt: modus === "fest" ? wt : null,
      uhrzeit: hEl.value ? `${hEl.value}:${mEl.value}` : null, dauer: +dEl.value });
    const zeig = () => {
      dEl.setAttribute("aria-valuetext", D.dauerText(+dEl.value));
      ov.querySelector("[data-peks]").textContent = modus === "auto" && !tage.length ? "Mindestens ein möglicher Tag" : D.text(entwurf());
      ov.querySelector("[data-pek-auto]").hidden = modus !== "auto"; ov.querySelector("[data-pek-fest]").hidden = modus !== "fest";
    };
    sw.onchange = () => { an = sw.checked; felderEl.hidden = !an; };
    ov.querySelectorAll("[data-pekmo]").forEach((b) => (b.onclick = () => {
      modus = b.dataset.pekmo; ov.querySelectorAll("[data-pekmo]").forEach((x) => x.setAttribute("aria-checked", String(x.dataset.pekmo === modus))); zeig();
    }));
    ov.querySelectorAll("[data-pekat]").forEach((b) => (b.onclick = () => {
      const n = +b.dataset.pekat; tage = tage.includes(n) ? tage.filter((x) => x !== n) : tage.concat([n]).sort(); b.setAttribute("aria-pressed", String(tage.includes(n))); zeig();
    }));
    ov.querySelectorAll("[data-pekt]").forEach((b) => (b.onclick = () => {
      wt = +b.dataset.pekt; ov.querySelectorAll("[data-pekt]").forEach((x) => x.setAttribute("aria-checked", String(+x.dataset.pekt === wt))); zeig();
    }));
    hEl.onchange = () => { mEl.disabled = !hEl.value; zeig(); };
    mEl.onchange = zeig; dEl.oninput = zeig;
    ov.querySelector("[data-pekdm]").onclick = () => { dEl.value = Math.max(V75().KRAFT.min, +dEl.value - 5); zeig(); };
    ov.querySelector("[data-pekdp]").onclick = () => { dEl.value = Math.min(V75().KRAFT.max, +dEl.value + 5); zeig(); };
    zeig();
    ov.querySelector("[data-peok]").onclick = () => {
      const notiz = ov.querySelector("[data-pekn]").value.trim() || null;
      const vorher = { aktiv: !!K.aktiv, modus: K.modus || "fest", tage: K.modus === "auto" ? K.tage.slice() : null, wt: K.modus === "auto" ? null : K.wt || null,
        uhrzeit: K.uhrzeit || null, dauer: K.dauer || V75().KRAFT.dauer, notiz: K.notiz || null };
      const neu = an ? Object.assign(entwurf(), { notiz }) : Object.assign({}, vorher, { aktiv: false });
      if (an && modus === "auto" && !tage.length) { const p = ov.querySelector("[data-pef]"); p.textContent = "Wähle mindestens einen möglichen Tag."; p.hidden = false; return; }
      if (neu.tage == null) delete neu.tage;
      if (vorher.tage == null) delete vorher.tage;
      if (JSON.stringify(neu) === JSON.stringify(vorher)) { if (zur) zur(); else seite(i); return; }
      speichernUnd(ov, i, "pe-kraft", neu, an ? `Krafttraining ${D.text(neu)} – gilt ab der Woche vom ${ab}.` : `Kein Krafttraining mehr – ab der Woche vom ${ab}.`, zur);
    };
    return ov;
  }
  /** V7.6.1 verfuegbarkeit-1.1 (Vorbild «Bevorzugte Tage für lange Einheiten» bei enduco, Texte eigen): Tage je Rad und Laufen, ab der nächsten Woche. */
  const langText = (L) => {
    const D = V76(), t = (x) => (x && x.length ? (D ? D.tageText(x) : x.join(", ")) : "egal");
    return L && ((L.rad && L.rad.length) || (L.lauf && L.lauf.length)) ? `Lange Ausfahrt ${t(L.rad)} · langer Lauf ${t(L.lauf)}` : "keine Vorliebe – die Seite plant Sa und So";
  };
  function langBlatt(i, zur) {
    const E = M.einstellungen(), D = V76(); if (!D) return null;
    const ab = tagLang(V64().addDays(V64().montag(heute()), 7)), W = { rad: (E.lang.rad || []).slice(), lauf: (E.lang.lauf || []).slice() };
    const gruppe = (sp) => `<p class="pe-feld-t" id="pel-${sp}"><span class="pe-sp" style="--sp:var(--sp-${sp})">${V6().sportIcon(sp, 18)}</span>${sp === "rad" ? "Lange Ausfahrt" : "Langer Lauf"}</p>
      <div class="pe-tage" role="group" aria-labelledby="pel-${sp}">${D.TAGE_KURZ.map((t, k) => `<button type="button" aria-pressed="${W[sp].includes(k + 1)}" aria-label="${D.TAGE[k]}" data-pel="${sp}" data-pelt="${k + 1}">${t}</button>`).join("")}</div>`;
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("uhr", 34)}<h2 id="v59-ov-h" tabindex="-1">Tage für lange Einheiten</h2>
        <p class="sub">An welchen Tagen die lange Ausfahrt und der lange Lauf am liebsten stehen.</p></div>
      ${gruppe("rad")}${gruppe("lauf")}
      <p class="pe-info">${ic("info", 16)}<span>Eine Empfehlung, keine Pflicht: Die Seite legt die lange Einheit bevorzugt auf einen dieser Tage. Passt sie dort nicht (Zeit oder Sportart laut deiner
        Verfügbarkeit, eine harte Rad- oder Laufeinheit am selben Tag), bleibt sie an ihrem Tag – das steht dann in den Hinweisen der Woche. Ohne Wahl plant die Seite die lange Ausfahrt am
        Samstag und den langen Lauf am Sonntag.</span></p>
      <p class="hint">${esc(window.V66 ? window.V66.VERSIONS.verfuegbarkeit : "verfuegbarkeit")}: gilt ab der Woche vom ${ab}; die laufende Woche bleibt, wie sie ist.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(okKnopf())}`);
    ov.querySelectorAll("[data-pel]").forEach((b) => (b.onclick = () => {
      const sp = b.dataset.pel, n = +b.dataset.pelt;
      W[sp] = W[sp].includes(n) ? W[sp].filter((x) => x !== n) : W[sp].concat([n]).sort();
      b.setAttribute("aria-pressed", String(W[sp].includes(n)));
    }));
    ov.querySelector("[data-peok]").onclick = () => {
      const neu = { rad: W.rad.slice().sort(), lauf: W.lauf.slice().sort() };
      if (JSON.stringify(neu) === JSON.stringify({ rad: (E.lang.rad || []).slice().sort(), lauf: (E.lang.lauf || []).slice().sort() })) { if (zur) zur(); else seite(i); return; }
      speichernUnd(ov, i, "pe-lang", neu, `Tage für lange Einheiten: ${langText(neu)} – gilt ab der Woche vom ${ab}.`, zur);
    };
    return ov;
  }
  /** Ausnahme einer kommenden Woche anzeigen und auf die Regel zurücksetzen (entfernt). */
  function kraftWocheBlatt(mo, i) {
    const E = M.einstellungen(), D = V76(), x = (E.kraftWochen || {})[mo]; if (!D || !x) return null;
    const ov = V59().blatt("pe", `<div class="blatt-titel">${ic("ausnahme", 34)}<h2 id="v59-ov-h" tabindex="-1">Woche vom ${tagLang(mo)}</h2>
        <p class="sub">${x.aus ? "Krafttraining in dieser Woche ausgelassen." : `Krafttraining in dieser Woche am ${esc(D.TAGE[wtVon(x.tag) - 1])}${x.uhrzeit ? " um " + esc(x.uhrzeit) : ""}.`}</p></div>
      <p class="ek-text">Regel: ${esc(D.text(E.kraft))}.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(`<button type="button" class="btn primary" data-pekw>Wieder nach der Regel ${ic("haken", 18)}</button>`)}`);
    ov.querySelector("[data-pekw]").onclick = () => speichernUnd(ov, i, "pe-kraft-" + mo, { entfernt: true }, `Woche vom ${tagLang(mo)}: wieder nach der Regel.`);
    return ov;
  }
})();
