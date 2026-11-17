/* Ironman Notebook V7.5 – Etappe 3 · Oberfläche «Planeinstellungen» (Plan → Plan verwalten → Planeinstellungen), Vorbild: die Planeinstellungen von enduco
   (Aufbau, Reihenfolge, Antipp-Verhalten; Texte, Symbole und Grafiken eigen). Rechenlogik in js/v75.js (planeinstellungen-1.0, basis-1.0, steigerung-1.0,
   indoor-phase-1.0), Schwimm-Einheit in js/schwimmen.js (schwimmeinheit-1.2).
   - Trainingsumfang: ein Regler für alle drei Sportarten mit Kurve (gewählte Steigerung, Bereich 50–150 %), Spitzenwoche und Zuwachs je Woche.
   - Je Sportart: Basis-Fitness (Fitness der Sportart und Start in Stunden pro Woche, eigener Wert möglich); Rad und Laufen: Indoor-Phase;
     Schwimmen: Equipment, Standard-Bahnlänge, Stile.
   Gespeichert über «Direkt speichern» (Eingabe planeinstellung → plan_einstellungen); danach rechnen Plan, Kalender und Heute neu (Ereignis «meinplan»),
   offene Garmin-Aufträge dieser und der nächsten Woche werden nachgeführt. Nichts davon geht an Enduco. */
(function () {
  "use strict";
  const M = (window.V75UI = window.V75UI || {});
  const $ = (id) => document.getElementById(id);
  const V75 = () => window.V75, V64 = () => window.V64, V6 = () => window.V6, V59 = () => window.V59, UI = () => window.V5UI, SW = () => window.SW;
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
  const STIL_SATZ = { ruecken: "im Ein- und Ausschwimmen", brust: "im Ein- und Ausschwimmen", delfin: "im Ein- und Ausschwimmen" };
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && V75() && V64() && V6() && V59() && window.AN); };
  const heute = () => C.iso(C.today);
  const tagKurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  const tagLang = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}.${+m}.${y}`; };

  /* ---------- Daten ---------- */
  /** Einstellungen aus den Daten, darüber die noch nicht eingespielten Eingaben dieses Geräts (V75.einstellungen; opt.bis wie dort). */
  M.einstellungen = function (opt) {
    C = C || (UI() && UI().C);
    if (!C || !V75()) return null;
    const I = UI() && UI().Inbox && UI().Inbox.data;
    return V75().einstellungen(C.D.plan_einstellungen || [], (I && I.planeinstellung) || [], opt);
  };
  /** Für SW.einheit (schwimmeinheit-1.2): vorhandene Hilfsmittel und Stile. */
  M.schwimmOpt = function () { const E = M.einstellungen(); return E ? { hilfsmittel: E.schwimm.hilfsmittel.slice(), stile: E.schwimm.stile.slice() } : {}; };
  /** Standard-Bahnlänge aus den Einstellungen (null = nicht gesetzt). */
  M.pool = function () { const E = M.einstellungen(); return E && E.schwimm.pool ? E.schwimm.pool : null; };
  M.indoorAm = (sport, datum) => { const E = M.einstellungen(); return !!(E && V75().indoorAm(E, sport, datum)); };
  /** Wert für das Feld drinnen (einheit-felder-1.1): nur ausdrücklich, wenn er von der Indoor-Phase abweicht. */
  M.drinnenFeld = (sport, datum, drinnen) => { const E = M.einstellungen(); return E ? V75().drinnenFeld(E, sport, datum, drinnen) : (drinnen ? true : null); };
  let FIT = null;
  /** Fitness je Sportart (basis-1.0), einmal je Datenstand gerechnet. */
  function fitness() {
    const k = `${heute()}|${(C.D.activities || []).length}|${C.D.updated || ""}`;
    if (FIT && FIT.k === k) return FIT.f;
    let f = null; try { f = V75().fitness(C.D.activities, heute()); } catch (e) { console.error(e); }
    FIT = { k, f }; return f;
  }
  /** Stand der laufenden Woche aus der Woche nach Modell: Saison, Vorgaben («jetzt», Spitze), Basis und Rampe. */
  function kontext() { try { return P() && P().kontextFuer ? P().kontextFuer(V64().montag(heute())) : null; } catch (e) { console.error(e); return null; } }
  async function sichern(id, felder) {
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.planeinstellung)) I.data.planeinstellung = [];
    const x = V75().eintrag(id, felder), f = V75().pruefen(x); if (f) return f;
    await I.upsert("planeinstellung", x);
    try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); }
    // offene Garmin-Aufträge (morgen bis eine Woche voraus) mit dem neuen Stand abgleichen – nur geänderte werden neu gespeichert
    try { if (U66() && U66().auftraegeAbgleichen) { const mo = V64().montag(heute()); await U66().auftraegeAbgleichen(mo); await U66().auftraegeAbgleichen(V64().addDays(mo, 7)); } } catch (e) { console.error(e); }
    return null;
  }
  /** Bestätigung unter der Überschrift der Ansicht (bleibt beim Neuzeichnen nach «meinplan» ein paar Sekunden stehen). */
  let MELD = null;
  const meldungHTML = () => `<p class="pe-meldung" role="status" aria-live="polite"${MELD && Date.now() < MELD.bis ? "" : " hidden"}>${MELD ? esc(MELD.t) : ""}</p>`;
  function melden(t) {
    MELD = { t, bis: Date.now() + 5000 };
    const p = document.querySelector(".pe-meldung"); if (p) { p.textContent = t; p.hidden = false; }
    setTimeout(() => { const q = document.querySelector(".pe-meldung"); if (q && MELD && Date.now() >= MELD.bis) q.hidden = true; }, 5200);
  }

  /* ---------- Steigerung: Text, Kurve ---------- */
  M.stufe = (v) => (v <= 75 ? "langsam" : v < 100 ? "etwas langsamer" : v === 100 ? "Standard" : v <= 120 ? "etwas schneller" : "schnell – hohe Belastung");
  function rampen(K, wert) {
    if (!K || !K.S || !K.basis75 || !K.vg) return null;
    const A = V64().AUFTEILUNG, R = (x) => V75().rampe(K.S.wochen, K.basis75, K.vg.spitze, x, A);
    return { R: R(wert), lo: R(V75().STEIGERUNG.min), hi: R(V75().STEIGERUNG.max), spitze: K.vg.spitze, S: K.S };
  }
  function verlaufText(X, wert) {
    const v = V75().verlauf(X.R, X.spitze); if (!v) return "";
    const kw = (mo) => `KW ${V6().isoWoche(mo)} (${tagKurz(mo)})`;
    const plus = v.plus_h > 0.01 ? `Ø +${hm(v.plus_h)} pro Woche${isNum(v.plus_pct) ? ` (≈ +${komma(v.plus_pct)} %)` : ""}` : "kaum Zuwachs";
    let t = v.spitzeAb ? `Spitzenwoche (${komma(X.spitze)} h) ab ${kw(v.spitzeAb)}, bis dahin ${plus}.`
      : `Bis zum Taper ≈ ${komma(v.ende)} h – die Spitzenwoche (${komma(X.spitze)} h) wird nicht erreicht; ${plus}.`;
    if (v.gedeckelt) t += ` In ${v.gedeckelt} ${v.gedeckelt === 1 ? "Woche" : "Wochen"} greift die Grenze: höchstens 10 % mehr als in der Woche davor.`;
    return t + ` Die laufende Woche bleibt bei deinem Start (${wert === 100 ? "100 % = gleichmässig bis zur Woche vor dem Taper" : "100 % wäre gleichmässig bis zur Woche vor dem Taper"}).`;
  }
  /** Kurve wie bei enduco: Linie = gewählte Steigerung, Fläche = Bereich von 50 bis 150 %, Punkt am Ende (Woche vor dem Taper). Belastungswochen ohne
   *  Erholungs-Dellen (roh), Taper weggelassen. klein = für die Karte in der Ansicht. */
  function kurve(X, klein) {
    const L = (A) => A.filter((r) => r.phase !== "Taper").map((r) => r.roh.summe);
    const a = L(X.R), lo = L(X.lo), hi = L(X.hi), n = a.length; if (n < 2) return "";
    const w = 320, h = klein ? 92 : 170, x0 = klein ? 4 : 30, y0 = 8, yb = h - (klein ? 6 : 18);
    const max = Math.max(...hi, ...a, X.spitze || 0) * 1.08, min = Math.min(...lo, ...a) * 0.85;
    const X_ = (i) => x0 + (i / (n - 1)) * (w - x0 - 8), Y = (v) => yb - ((v - min) / Math.max(0.1, max - min)) * (yb - y0);
    const pfad = (A) => A.map((v, i) => `${i ? "L" : "M"}${X_(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
    const band = `${pfad(hi)} ${lo.map((v, i) => `L${X_(n - 1 - i).toFixed(1)} ${Y(lo[n - 1 - i]).toFixed(1)}`).join(" ")} Z`;
    const gitter = klein ? "" : [0, 1, 2, 3, 4].map((k) => { const y = y0 + (k / 4) * (yb - y0); return `<line x1="${x0}" x2="${w - 8}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="pe-gitter"/>`; }).join("")
      + Array.from({ length: 7 }, (_, k) => { const x = x0 + (k / 6) * (w - x0 - 8); return `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y0}" y2="${yb}" class="pe-gitter"/>`; }).join("");
    const achse = klein ? "" : `<text x="${x0 - 4}" y="${(Y(max / 1.08) + 4).toFixed(1)}" text-anchor="end" class="pe-ax">${komma(max / 1.08, 0)} h</text>
      <text x="${x0}" y="${h - 3}" class="pe-ax">jetzt</text><text x="${w - 8}" y="${h - 3}" text-anchor="end" class="pe-ax">Taper</text>`;
    return `<svg class="pe-svg${klein ? " klein" : ""}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Stunden pro Woche bis zum Taper: gewählte Steigerung als Linie, Bereich von 50 bis 150 % als Fläche">
      ${gitter}<path d="${band}" class="pe-band"/><path d="${pfad(a)}" class="pe-linie"/><circle cx="${X_(n - 1).toFixed(1)}" cy="${Y(a[n - 1]).toFixed(1)}" r="${klein ? 4 : 6}" class="pe-punkt"/>${achse}</svg>`;
  }

  /* ---------- Ansicht ---------- */
  const pfeil = () => ic("weiter", 18);
  function zeile(attr, links, titel, satz, wert) {
    return `<li><button type="button" ${attr}>${links}<span><b>${esc(titel)}</b>${satz ? `<small>${esc(satz)}</small>` : ""}</span><em>${esc(wert || "")}</em>${pfeil()}</button></li>`;
  }
  const ring = (sport, v) => `<span class="pe-ring" style="--sp:var(--sp-${sport})" aria-hidden="true">${isNum(v) ? Math.round(v) : "–"}</span>`;
  M.zeichnen = function () {
    const box = $("pe-inhalt"); if (!box || !bereit()) return;
    const E = M.einstellungen(), K = kontext(), F = fitness() || {}, B = K && K.basis75, X = rampen(K, E.steigerung);
    const indoorSatz = (sport) => { const p = E.indoor[sport];
      return p ? `${tagLang(p.von)} bis ${tagLang(p.bis)} – ${sport === "rad" ? "Rad-Einheiten auf der Rolle" : "Läufe auf dem Laufband"}`
        : `keine – lege eine Zeit fest, in der ${sport === "rad" ? "deine Rad-Einheiten auf der Rolle" : "deine Läufe auf dem Laufband"} geplant werden`; };
    const basisSatz = (sport) => { const b = B && B[sport]; if (!b) return "Start offen"; return `Start ${hm(b.h)} pro Woche · ${b.eigen != null ? "dein Wert" : "aus deinen 8 Wochen"}`; };
    const S = E.schwimm, pool = S.pool || (window.SWUI && window.SWUI.becken ? window.SWUI.becken() : 25);
    const abschnitt = (sport, zeilen) => `<h2 class="v7-abschnitt pe-sport"><span class="pe-sp" style="--sp:var(--sp-${sport})">${V6().sportIcon(sport, 16)}</span>${esc(SPORT_NAME[sport])}</h2>
      <ul class="v6-aktionen pe-liste">${zeilen.join("")}</ul>`;
    box.innerHTML = `${meldungHTML()}<p class="pe-ein">So rechnet die Seite deinen Plan – wie die Planeinstellungen bei enduco. Gilt für Mein Plan, Kalender und Heute; nichts davon geht an Enduco.</p>
      <button type="button" class="pe-umfang" data-pe="steigerung">
        <span class="pe-umfang-k"><span><small>Trainingsumfang</small><b>Steigerung ${E.steigerung} %</b><em>${esc(M.stufe(E.steigerung))}</em></span>${pfeil()}</span>
        ${X ? kurve(X, true) : ""}
        <small class="pe-umfang-t">${X ? esc(verlaufText(X, E.steigerung).split(". ")[0] + ".") : "Ohne Hauptrennen keine Saison – die Steigerung wirkt erst mit einem Rennen."}</small></button>
      ${abschnitt("schwimm", [
        zeile(`data-pe="basis" data-sport="schwimm"`, ring("schwimm", F.schwimm), "Basis-Fitness", basisSatz("schwimm")),
        zeile(`data-pe="equipment"`, ic("geraet", 22), "Schwimm-Equipment", S.hilfsmittel.length ? S.hilfsmittel.map((k) => HM_NAME[k].replace(" (Kickboard)", "")).join(", ") : "keine Hilfsmittel"),
        zeile(`data-pe="pool"`, ic("becken", 22), "Standard-Bahnlänge", S.pool ? "für deine Schwimm-Einheiten; je Einheit änderbar" : "noch nicht festgelegt – bisher wie dein Gerät bzw. deine Enduco-Workouts", `${pool} m`),
        zeile(`data-pe="stile"`, ic("schwimm", 22), "Stile", SW() ? SW().stileText(S.stile) : "Kraul")])}
      ${abschnitt("rad", [
        zeile(`data-pe="basis" data-sport="rad"`, ring("rad", F.rad), "Basis-Fitness", basisSatz("rad")),
        zeile(`data-pe="indoor" data-sport="rad"`, ic("drinnen", 22), "Indoor-Phase", indoorSatz("rad"))])}
      ${abschnitt("lauf", [
        zeile(`data-pe="basis" data-sport="lauf"`, ring("lauf", F.lauf), "Basis-Fitness", basisSatz("lauf")),
        zeile(`data-pe="indoor" data-sport="lauf"`, ic("drinnen", 22), "Indoor-Phase", indoorSatz("lauf"))])}
      <p class="hint">${esc(V75().VERSIONS.einstellungen)}, ${esc(V75().VERSIONS.basis)}, ${esc(V75().VERSIONS.steigerung)}, ${esc(V75().VERSIONS.indoor)}, ${esc(SW() ? SW().VERSIONS.einheit : "")}: eigene Festlegungen,
        erklärt im Wissen (Kapitel «Planeinstellungen»). Gespeichert mit «Direkt speichern» auf allen Geräten. Die Spitzenwoche stellst du unter Plan → Wochenstunden ein.
</p>
      <div class="row mo-knoepfe"><button type="button" class="btn" data-wissen="planeinstellungen">Planeinstellungen erklärt</button></div>`;
    box.querySelectorAll("[data-pe]").forEach((b) => (b.onclick = () => oeffnen(b.dataset.pe, b.dataset.sport)));
  };
  function oeffnen(art, sport) {
    if (!bereit()) return;
    if (art === "steigerung") return steigerungBlatt();
    if (art === "basis") return basisBlatt(sport);
    if (art === "indoor") return indoorBlatt(sport);
    if (art === "equipment") return equipmentBlatt();
    if (art === "pool") return poolBlatt();
    if (art === "stile") return stileBlatt();
  }
  M.oeffnen = (art, sport) => oeffnen(art, sport);

  /* ---------- Blätter ---------- */
  const fuss = (haupt) => `<div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${ic("zurueck", 22)}</button>${haupt || ""}</div>`;
  const fertigKnopf = () => `<button type="button" class="btn primary gross" data-peok>Fertig ${ic("haken", 18)}</button>`;
  const fehlerIn = (ov, f) => { const p = ov.querySelector("[data-pef]"); if (p) { p.textContent = f || ""; p.hidden = !f; } };
  async function speichernUnd(ov, id, felder, ok) {
    const f = await sichern(id, felder);
    if (f) return fehlerIn(ov, f);
    V59().schliessen(); melden(ok);
  }
  function steigerungBlatt() {
    const E = M.einstellungen(), K = kontext();
    const ov = V59().blatt("pe-steigerung", `<div class="blatt-titel">${ic("trend", 34)}<h2 id="v59-ov-h" tabindex="-1">Trainingsumfang</h2>
        <p class="sub">Lege fest, wie schnell dein Umfang bis zur Spitzenwoche steigt – ein Regler für Schwimmen, Rad und Laufen.</p></div>
      <div class="pe-legende"><span><i class="l"></i>Trainingsumfang</span><span><i class="b"></i>Bereich 50–150 %</span></div>
      <div class="pe-kurve" data-pek></div>
      <div class="pe-wert"><b data-pew></b><span data-pel></span></div>
      <div class="pe-regler"><input type="range" min="${V75().STEIGERUNG.min}" max="${V75().STEIGERUNG.max}" step="${V75().STEIGERUNG.schritt}" value="${E.steigerung}" data-per aria-label="Steigerung in Prozent"></div>
      <p class="pe-text" data-pet></p>
      <p class="hint">${esc(V75().VERSIONS.steigerung)} (eigene Festlegung): Jede Sportart geht von ihrem Start zu ihrem Anteil an der Spitzenwoche (Schwimmen 20, Rad 50, Laufen 30 %).
        100 % = gleichmässig bis zur Woche vor dem Taper, mehr = früher an der Spitze, weniger = darunter. Erholungswochen, Taper und B-Rennen wie bisher.
        Bei Enduco entspricht der höchste Wert etwa 10 % mehr Umfang pro Woche; hier ist das die feste Obergrenze.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(fertigKnopf())}`);
    const inp = ov.querySelector("[data-per]");
    const zeig = () => {
      const v = +inp.value, X = rampen(K, v);
      ov.querySelector("[data-pew]").textContent = `${v} %`;
      ov.querySelector("[data-pel]").textContent = M.stufe(v);
      ov.querySelector("[data-pel]").className = v > 120 ? "hoch" : "";
      inp.setAttribute("aria-valuetext", `${v} %, ${M.stufe(v)}`);
      ov.querySelector("[data-pek]").innerHTML = X ? kurve(X, false) : `<p class="hint">Ohne Hauptrennen keine Saison – die Steigerung wirkt erst mit einem Rennen.</p>`;
      ov.querySelector("[data-pet]").textContent = X ? verlaufText(X, v) : "";
    };
    inp.oninput = zeig; zeig();
    ov.querySelector("[data-peok]").onclick = () => {
      const v = +inp.value; if (v === E.steigerung) { V59().schliessen(); return; }
      speichernUnd(ov, "pe-steigerung", { wert: v }, `Steigerung ${v} % – gilt ab der nächsten Woche.`);
    };
  }
  function basisBlatt(sport) {
    const E = M.einstellungen(), K = kontext(), F = fitness() || {}, b = K && K.basis75 ? K.basis75[sport] : null;
    const jetzt = K && K.basis75 ? K.basis75.jetzt : null, eigen = E.basis[sport];
    let wert = eigen != null ? eigen : b ? Math.round(b.gewohnt * 2) / 2 : 1;
    const lastText = (C.D.config && /^last-2/.test(C.D.config.load_model || "")) ? "Rad mit deiner LT2 bzw. nach Puls (last-2.1)" : "wie von Garmin geliefert";
    const ov = V59().blatt("pe-basis", `<div class="blatt-titel">${ring(sport, F[sport])}<h2 id="v59-ov-h" tabindex="-1">Basis-Fitness ${esc(SPORT_NAME[sport])}</h2>
        <p class="sub">Womit dein Plan ${esc(IM_SPORT[sport])} beginnt.</p></div>
      <p class="ek-text"><b>Fitness ${isNum(F[sport]) ? Math.round(F[sport]) : "–"}</b> = 42-Tage-Mittel deiner Trainingslast ${esc(IM_SPORT[sport])} bis gestern (Last ${esc(lastText)}).
        Zum Vergleich mit Enduco – dort wird die Last etwas anders gerechnet, darum ist die Zahl ähnlich, aber nicht gleich.</p>
      <p class="ek-text">${b ? `<b>Gewohnt: ${hm(b.gewohnt)} pro Woche</b> = ${komma(b.anteil * 100, 0)} % deiner Stunden der letzten 8 abgeschlossenen Wochen × ${komma(jetzt)} h («jetzt», Median der Wochen).` : "Noch keine Wochen mit Training – gewohnter Umfang offen."}</p>
      <div class="v73-wahl" role="radiogroup" aria-label="Start ${esc(SPORT_NAME[sport])}">
        <label class="v73-opt"><input type="radio" name="peb" value="auto"${eigen == null ? " checked" : ""}><span>${ic("trend", 20)}<b>Aus deinen Daten</b><small>${b ? `${hm(b.gewohnt)} pro Woche, rechnet jede Woche neu` : "offen"}</small></span></label>
        <label class="v73-opt"><input type="radio" name="peb" value="eigen"${eigen != null ? " checked" : ""}><span>${ic("regler", 20)}<b>Eigener Wert</b><small>z. B. nach einer Verletzung oder wenn Einheiten fehlen</small></span></label></div>
      <div class="pe-stepper" data-pes><button type="button" class="btn" data-pe-minus aria-label="Eine halbe Stunde weniger">−</button><output data-peo aria-live="polite"></output><button type="button" class="btn" data-pe-plus aria-label="Eine halbe Stunde mehr">+</button></div>
      <p class="hint">${esc(V75().VERSIONS.basis)}: Von diesem Start geht ${esc(SPORT_NAME[sport])} mit der Steigerung zu ${komma(V64().AUFTEILUNG[sport] * 100, 0)} % der Spitzenwoche. Dein Wert gilt ab der laufenden Woche, bis du «Aus deinen Daten» wählst.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(fertigKnopf())}`);
    const out = ov.querySelector("[data-peo]"), st = ov.querySelector("[data-pes]");
    const modus = () => (ov.querySelector("input[name=peb]:checked") || {}).value;
    const zeig = () => { out.textContent = `${hm(wert)} pro Woche`; st.hidden = modus() !== "eigen"; };
    ov.querySelectorAll("input[name=peb]").forEach((r) => (r.onchange = zeig));
    ov.querySelector("[data-pe-minus]").onclick = () => { wert = Math.max(0, wert - 0.5); zeig(); };
    ov.querySelector("[data-pe-plus]").onclick = () => { wert = Math.min(V75().BASIS_MAX, wert + 0.5); zeig(); };
    zeig();
    ov.querySelector("[data-peok]").onclick = () => {
      const neu = Object.assign({}, E.basis, { [sport]: modus() === "eigen" ? wert : null });
      if (JSON.stringify(neu) === JSON.stringify(E.basis)) { V59().schliessen(); return; }
      speichernUnd(ov, "pe-basis", { schwimm: neu.schwimm, rad: neu.rad, lauf: neu.lauf }, `${SPORT_NAME[sport]}: Start ${neu[sport] != null ? hm(neu[sport]) + " pro Woche" : "aus deinen Daten"}.`);
    };
  }
  function indoorBlatt(sport) {
    const E = M.einstellungen(), p = E.indoor[sport], rad = sport === "rad";
    const ov = V59().blatt("pe-indoor", `<div class="blatt-titel">${ic("drinnen", 34)}<h2 id="v59-ov-h" tabindex="-1">Indoor-Phase ${esc(SPORT_NAME[sport])}</h2>
        <p class="sub">Lege eine Zeit fest, in der ${rad ? "deine Rad-Einheiten auf der Rolle" : "deine Läufe auf dem Laufband"} geplant werden.</p></div>
      <div class="pe-daten"><label>von<input type="date" data-pev value="${esc(p ? p.von : heute())}"></label><label>bis<input type="date" data-peb value="${esc(p ? p.bis : "")}"></label></div>
      <p class="ek-text">In dieser Zeit stehen ${rad ? "Rad-Einheiten als «drinnen» (Rolle)" : "Läufe als «drinnen» (Laufband)"} in Mein Plan, im Kalender und beim Export. Dauer und Inhalt bleiben; lange Einheiten bleiben lang.
        Eine einzelne Einheit stellst du auf ihrer Seite um (Outdoor bzw. Indoor) – diese Wahl bleibt, auch wenn du die Phase änderst.</p>
      <p class="hint">${esc(V75().VERSIONS.indoor)} (eigene Festlegung), höchstens ein Jahr. Einheiten aus der Enduco-Bibliothek bleiben wie dort.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(`${p ? `<button type="button" class="btn" data-pe-weg>Keine Indoor-Phase</button>` : ""}${fertigKnopf()}`)}`);
    const weg = ov.querySelector("[data-pe-weg]");
    if (weg) weg.onclick = () => speichernUnd(ov, "pe-indoor-" + sport, { von: null, bis: null }, `Indoor-Phase ${SPORT_NAME[sport]} entfernt.`);
    ov.querySelector("[data-peok]").onclick = () => {
      const von = ov.querySelector("[data-pev]").value, bis = ov.querySelector("[data-peb]").value;
      if (!von || !bis) return fehlerIn(ov, "Von und bis wählen.");
      if (p && p.von === von && p.bis === bis) { V59().schliessen(); return; }
      speichernUnd(ov, "pe-indoor-" + sport, { von, bis }, `Indoor-Phase ${SPORT_NAME[sport]}: ${tagLang(von)} bis ${tagLang(bis)}.`);
    };
  }
  function schwimmSpeichern(ov, E, aenderung, ok) {
    const s = Object.assign({ hilfsmittel: E.schwimm.hilfsmittel, pool: E.schwimm.pool, stile: E.schwimm.stile }, aenderung);
    return speichernUnd(ov, "pe-schwimm", { hilfsmittel: s.hilfsmittel, pool: s.pool, stile: s.stile }, ok);
  }
  function equipmentBlatt() {
    const E = M.einstellungen(), H = E.schwimm.hilfsmittel;
    const ov = V59().blatt("pe-equipment", `<div class="blatt-titel">${ic("geraet", 34)}<h2 id="v59-ov-h" tabindex="-1">Schwimm-Equipment</h2><p class="sub">Was du ins Becken mitnimmst.</p></div>
      <div class="v73-wahl" role="group" aria-label="Hilfsmittel">${V75().HILFSMITTEL.map((k) => `<label class="v73-opt pe-check"><input type="checkbox" value="${k}"${H.includes(k) ? " checked" : ""}><span>${ic("haken", 20)}<b>${esc(HM_NAME[k])}</b><small>${esc(HM_SATZ[k])}</small></span></label>`).join("")}</div>
      <p class="hint">schwimmeinheit-1.2: Technikübungen nur mit vorhandenen Hilfsmitteln; ohne Brett die Beine in Seitlage mit Flossen, ohne beides kein Beine-Block; ohne Pullbuoy kein Pull – die Zeit geht in die Hauptserie.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(fertigKnopf())}`);
    ov.querySelector("[data-peok]").onclick = () => {
      const neu = V75().HILFSMITTEL.filter((k) => ov.querySelector(`input[value="${k}"]`).checked);
      if (JSON.stringify(neu) === JSON.stringify(H)) { V59().schliessen(); return; }
      schwimmSpeichern(ov, E, { hilfsmittel: neu }, "Schwimm-Equipment gespeichert.");
    };
  }
  function poolBlatt() {
    const E = M.einstellungen(), p = E.schwimm.pool || (window.SWUI ? window.SWUI.becken() : 25);
    const ov = V59().blatt("pe-pool", `<div class="blatt-titel">${ic("becken", 34)}<h2 id="v59-ov-h" tabindex="-1">Standard-Bahnlänge</h2><p class="sub">Gilt für deine Schwimm-Einheiten; auf der Seite einer Einheit kannst du sie für diese Einheit ändern.</p></div>
      <div class="v73-wahl">${[25, 50].map((m) => `<button type="button" class="v73-opt knopf${m === p ? " an" : ""}" data-pep="${m}" aria-pressed="${m === p}"><span>${ic("becken", 20)}<b>${m} m</b><small>${m === 50 ? "Langbahn: Übungen über eine halbe Bahn, dann die Bahn locker beenden" : "Kurzbahn: Übungen über eine ganze Bahn"}</small></span></button>`).join("")}</div>
      ${E.schwimm.pool ? "" : `<p class="hint">Noch nicht festgelegt: bisher galt die Wahl auf diesem Gerät bzw. die häufigste Bahnlänge deiner Enduco-Workouts (${p} m).</p>`}
      <p class="warn-t" data-pef hidden></p>${fuss()}`);
    ov.querySelectorAll("[data-pep]").forEach((b) => (b.onclick = () => {
      const m = +b.dataset.pep; if (m === E.schwimm.pool) { V59().schliessen(); return; }
      schwimmSpeichern(ov, E, { pool: m }, `Standard-Bahnlänge ${m} m.`);
    }));
  }
  function stileBlatt() {
    const E = M.einstellungen(), L = E.schwimm.stile, S = SW();
    const ov = V59().blatt("pe-stile", `<div class="blatt-titel">${ic("schwimm", 34)}<h2 id="v59-ov-h" tabindex="-1">Stile</h2><p class="sub">Welche Stile in deinen Schwimm-Einheiten vorkommen.</p></div>
      <div class="v73-wahl" role="group" aria-label="Stile">
        <label class="v73-opt pe-check"><input type="checkbox" checked disabled><span>${ic("haken", 20)}<b>Kraul</b><small>immer: Technikübungen, Beine, Haupt- und Pull-Serien</small></span></label>
        ${V75().STILE.map((k) => `<label class="v73-opt pe-check"><input type="checkbox" value="${k}"${L.includes(k) ? " checked" : ""}><span>${ic("haken", 20)}<b>${esc(S ? S.STILE[k] : k)}</b><small>${esc(STIL_SATZ[k])}</small></span></label>`).join("")}</div>
      <p class="hint">schwimmeinheit-1.2: Ein- und Ausschwimmen gemischt mit diesen Stilen, alles andere Kraul (Triathlon). Auf der Uhr bleibt der Stil «Freistil», die Stile stehen im Text des Schritts.</p>
      <p class="warn-t" data-pef hidden></p>${fuss(fertigKnopf())}`);
    ov.querySelector("[data-peok]").onclick = () => {
      const neu = V75().STILE.filter((k) => ov.querySelector(`input[value="${k}"]`).checked);
      if (JSON.stringify(neu) === JSON.stringify(L)) { V59().schliessen(); return; }
      schwimmSpeichern(ov, E, { stile: neu }, `Stile: ${S ? S.stileText(neu) : neu.join(", ")}.`);
    };
  }
})();
