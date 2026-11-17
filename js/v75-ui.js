/* Ironman Notebook V7.5 – Etappe 3 · Oberfläche «Planeinstellungen», Vorbild: die Planeinstellungen von enduco (Blätter nacheinander, Aufbau,
   Antipp-Verhalten; Texte, Symbole und Grafiken eigen). Rechenlogik in js/v75.js (planeinstellungen-1.0, basis-1.0, steigerung-1.0, indoor-phase-1.0),
   Schwimm-Einheit in js/schwimmen.js (schwimmeinheit-1.2).
   V7.5.1: ein Blatt als Folge Laufen → Rad → Schwimmen → Trainingsumfang → «Fertig ✓» (unten «‹», auf dem letzten «Fertig ✓»), geöffnet über
   Plan → Plan verwalten (zuoberst), das Profil und die Wochenstunden (dort direkt beim Trainingsumfang). Je Sportart die Basis-Fitness (Fitness der
   Sportart im Ring); Rad und Laufen: Indoor-Phase; Schwimmen: Equipment, Standard-Bahnlänge, Anfänger-Modus (Schalter), Stile. Trainingsumfang: ein
   Regler für alle drei Sportarten mit Wort und Farbe je Bereich, Kurve bis zum Hauptrennen mit dem Bereich 50–150 %, live beim Ziehen.
   Gespeichert über «Direkt speichern» (Eingabe planeinstellung → plan_einstellungen): jede Auswahl beim Übernehmen, die Steigerung mit «Fertig ✓».
   Danach rechnen Plan, Kalender und Heute neu (Ereignis «meinplan»), offene Garmin-Aufträge dieser und der nächsten Woche werden nachgeführt.
   Nichts davon geht an Enduco. */
(function () {
  "use strict";
  const M = (window.V75UI = window.V75UI || {});
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
  let FIT = null;
  /** Fitness je Sportart (basis-1.0), einmal je Datenstand gerechnet. Die Seite hat a.tss schon nach config.load_model gesetzt. */
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
  function rampen(K, wert) {
    if (!K || !K.S || !K.basis75 || !K.vg) return null;
    const A = V64().AUFTEILUNG, R = (x) => V75().rampe(K.S.wochen, K.basis75, K.vg.spitze, x, A);
    return { R: R(wert), lo: R(V75().STEIGERUNG.min), hi: R(V75().STEIGERUNG.max), spitze: K.vg.spitze, S: K.S, start: K.basis75.summe };
  }
  function verlaufText(X, wert) {
    const v = V75().verlauf(X.R, X.spitze); if (!v) return "";
    const kw = (mo) => `KW ${V6().isoWoche(mo)} (${tagKurz(mo)})`;
    const plus = v.plus_h > 0.01 ? `Ø +${hm(v.plus_h)} pro Woche${isNum(v.plus_pct) ? ` (≈ +${komma(v.plus_pct)} %)` : ""}` : "kaum Zuwachs";
    let t = v.spitzeAb ? `Spitzenwoche (${komma(X.spitze)} h) ab ${kw(v.spitzeAb)}, bis dahin ${plus}.`
      : `Bis zum Taper ≈ ${komma(v.ende)} h – die Spitzenwoche (${komma(X.spitze)} h) wird nicht erreicht; ${plus}.`;
    if (v.gedeckelt) t += ` In ${v.gedeckelt} ${v.gedeckelt === 1 ? "Woche" : "Wochen"} greift die Grenze: höchstens 10 % mehr als in der Woche davor.`;
    return t + ` Die laufende Woche bleibt bei deinem Start (${komma(X.start)} h)${wert === 100 ? "; 100 % = gleichmässig bis zur Woche vor dem Taper" : ""}.`;
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

  /* ---------- Blatt-Folge: Laufen → Rad → Schwimmen → Trainingsumfang ---------- */
  const SEITEN = ["lauf", "rad", "schwimm", "umfang"];
  const TITEL = { lauf: "Laufen", rad: "Rad", schwimm: "Schwimmen", umfang: "Trainingsumfang" };
  let FLOW = { zurueck: null, entwurf: null };
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
    if (!bereit()) return;
    FLOW = { zurueck: typeof opt.zurueck === "function" ? opt.zurueck : null, entwurf: null };
    const i = typeof opt.seite === "string" ? SEITEN.indexOf(opt.seite) : opt.seite;
    seite(isNum(i) && i >= 0 && i < SEITEN.length ? i : 0);
  };
  M.oeffnen = M.flow;
  function indoorSatz(E, sport) {
    const p = E.indoor[sport];
    return p ? `${tagLang(p.von)} bis ${tagLang(p.bis)} – ${sport === "rad" ? "Rad-Einheiten auf der Rolle" : "Läufe auf dem Laufband"}`
      : `keine – lege eine Zeit fest, in der ${sport === "rad" ? "deine Rad-Einheiten auf der Rolle" : "deine Läufe auf dem Laufband"} geplant werden`;
  }
  function seite(i, meldung) {
    const s = SEITEN[i], E = M.einstellungen(), F = fitness() || {};
    if (!E) return;
    let inhalt;
    if (s === "lauf" || s === "rad") {
      inhalt = `<div class="blatt-titel"><span class="pe-sp gross" style="--sp:var(--sp-${s})">${V6().sportIcon(s, 34)}</span><h2 id="v59-ov-h" tabindex="-1">${esc(TITEL[s])}</h2>
          <p class="sub">Was dein Plan ${esc(IM_SPORT[s])} berücksichtigt.</p></div>${meldungHTML(meldung)}
        <ul class="v6-aktionen pe-liste">
          ${zeile(`data-pe="basis" data-sport="${s}"`, ring(s, F[s]), "Basis-Fitness", `Wie viel Training ${IM_SPORT[s]} dein Körper gewohnt ist`)}
          ${zeile(`data-pe="indoor" data-sport="${s}"`, ic("drinnen", 22), "Indoor-Phase", indoorSatz(E, s))}</ul>`;
    } else if (s === "schwimm") {
      const S = E.schwimm, pool = S.pool || (window.SWUI && window.SWUI.becken ? window.SWUI.becken() : 25);
      inhalt = `<div class="blatt-titel"><span class="pe-sp gross" style="--sp:var(--sp-schwimm)">${V6().sportIcon("schwimm", 34)}</span><h2 id="v59-ov-h" tabindex="-1">Schwimmen</h2>
          <p class="sub">Was dein Plan im Schwimmen berücksichtigt.</p></div>${meldungHTML(meldung)}
        <ul class="v6-aktionen pe-liste">
          ${zeile(`data-pe="basis" data-sport="schwimm"`, ring("schwimm", F.schwimm), "Basis-Fitness", "Wie viel Schwimmtraining dein Körper gewohnt ist")}
          ${zeile(`data-pe="equipment"`, ic("geraet", 22), "Schwimm-Equipment", S.hilfsmittel.length ? S.hilfsmittel.map((k) => HM_NAME[k].replace(" (Kickboard)", "")).join(", ") : "keine Hilfsmittel")}
          ${zeile(`data-pe="pool"`, ic("becken", 22), "Standard-Bahnlänge", S.pool ? "für deine Schwimm-Einheiten; je Einheit änderbar" : "noch nicht festgelegt – bisher wie dein Gerät bzw. deine Enduco-Workouts", `${pool} m`)}
          <li class="pe-schalter-z"><label>${ic("technik", 22)}<span><b>Anfänger-Modus</b><small>Kürzere Wiederholungen, längere Pausen, nur einfache Übungen</small></span>
            <input type="checkbox" role="switch" data-pe-anf${S.anfaenger ? " checked" : ""}><i class="pe-schalter" aria-hidden="true"></i></label></li>
          ${zeile(`data-pe="stile"`, ic("schwimm", 22), "Stile", SW() ? SW().stileText(S.stile) : "Kraul")}</ul>`;
    } else {
      const st = FLOW.entwurf != null ? FLOW.entwurf : E.steigerung;
      inhalt = `<div class="blatt-titel">${ic("trend", 34)}<h2 id="v59-ov-h" tabindex="-1">Trainingsumfang</h2>
          <p class="sub">Lege fest, wie schnell dein Umfang bis zur Spitzenwoche steigt – ein Regler für Schwimmen, Rad und Laufen.</p></div>${meldungHTML(meldung)}
        <div class="pe-legende"><span><i class="l"></i>Trainingsumfang</span><span><i class="b"></i>Bereich 50–150 %</span></div>
        <div class="pe-kurve" data-pek></div>
        <div class="pe-wert" data-pewb><b data-pew></b><span><i aria-hidden="true"></i><em data-pel></em></span></div>
        <div class="pe-regler"><input type="range" min="${V75().STEIGERUNG.min}" max="${V75().STEIGERUNG.max}" step="${V75().STEIGERUNG.schritt}" value="${st}" data-per aria-label="Steigerung in Prozent"></div>
        <p class="pe-text" data-pet></p>
        <p class="hint">${esc(V75().VERSIONS.steigerung)} (eigene Festlegung): Jede Sportart geht von ihrem Start zu ihrem Anteil an der Spitzenwoche (Schwimmen 20, Rad 50, Laufen 30 %).
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
      if (s === "umfang") FLOW.entwurf = +ov.querySelector("[data-per]").value;
      if (i > 0) seite(i - 1); else if (FLOW.zurueck) FLOW.zurueck(); else V59().schliessen();
    };
    ov.querySelectorAll("[data-pe]").forEach((b) => (b.onclick = () => unterBlatt(b.dataset.pe, b.dataset.sport, i)));
    const anf = ov.querySelector("[data-pe-anf]");
    if (anf) anf.onchange = async () => {
      anf.disabled = true;
      const f = await schwimmSpeichern(E, { anfaenger: anf.checked });
      if (f) { anf.checked = !anf.checked; anf.disabled = false; const p = ov.querySelector(".pe-meldung"); if (p) { p.textContent = f; p.hidden = false; } return; }
      seite(i, anf.checked ? "Anfänger-Modus an – gilt für deine Schwimm-Einheiten." : "Anfänger-Modus aus.");
    };
    if (letzte) umfangBinden(ov, E); else ov.querySelector("[data-pe-weiter]").onclick = () => seite(i + 1);
  }
  function umfangBinden(ov, E) {
    const K = kontext(), inp = ov.querySelector("[data-per]");
    const zeig = () => {
      const v = +inp.value, X = rampen(K, v), st = M.stufe(v);
      ov.querySelector("[data-pew]").textContent = `${v} %`;
      ov.querySelector("[data-pel]").textContent = stufeText(v);
      const box = ov.querySelector(".te-box") || ov; box.style.setProperty("--stufe", `var(${st.farbe})`);   // Punkt und Griff in der Farbe des Bereichs
      inp.setAttribute("aria-valuetext", `${v} %, ${stufeText(v)}`);
      ov.querySelector("[data-pek]").innerHTML = X ? kurve(X) : `<p class="hint">Ohne Hauptrennen keine Saison – die Steigerung wirkt erst mit einem Rennen.</p>`;
      ov.querySelector("[data-pet]").textContent = X ? verlaufText(X, v) : "";
    };
    inp.oninput = zeig; zeig();
    ov.querySelector("[data-pe-fertig]").onclick = async (ev) => {
      const v = +inp.value, b = ev.currentTarget;
      if (v === E.steigerung) { V59().schliessen(); return; }
      b.disabled = true;
      const f = await sichern("pe-steigerung", { wert: v });
      if (f) { b.disabled = false; const p = ov.querySelector("[data-pef]"); p.textContent = f; p.hidden = false; return; }
      V59().schliessen(); toast(`Steigerung ${v} % (${stufeText(v)}) – gilt ab der nächsten Woche.`);
    };
  }

  /* ---------- Unterblätter (zurück = dieselbe Seite der Folge) ---------- */
  const fuss = (haupt) => `<div class="blatt-fuss"><button type="button" class="btn-zurueck" data-pe-z aria-label="Zurück ohne zu speichern">${ic("zurueck", 22)}</button>${haupt || ""}</div>`;
  const okKnopf = () => `<button type="button" class="btn primary" data-peok>Übernehmen ${ic("haken", 18)}</button>`;
  function unterBlatt(art, sport, i) {
    if (!bereit()) return;
    const ov = art === "basis" ? basisBlatt(sport) : art === "indoor" ? indoorBlatt(sport, i) : art === "equipment" ? equipmentBlatt(i) : art === "pool" ? poolBlatt(i) : art === "stile" ? stileBlatt(i) : null;
    if (!ov) return;
    ov.querySelectorAll("[data-pe-z]").forEach((b) => (b.onclick = () => seite(i)));
  }
  async function speichernUnd(ov, i, id, felder, ok) {
    ov.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const f = await sichern(id, felder);
    if (f) { ov.querySelectorAll("button").forEach((b) => (b.disabled = false)); const p = ov.querySelector("[data-pef]"); if (p) { p.textContent = f; p.hidden = false; } return; }
    seite(i, ok);
  }
  function basisBlatt(sport) {
    const F = fitness() || {}, K = kontext(), b = K && K.basis75 ? K.basis75[sport] : null, jetzt = K && K.basis75 ? K.basis75.jetzt : null;
    // Last wie auf der ganzen Seite (config.load_model): last-2.1 ändert nur das Rad (LT2 auf der Rolle, sonst nach Puls)
    const lastText = sport === "rad" && C.D.config && /^last-2/.test(C.D.config.load_model || "") ? "mit deiner LT2 bzw. nach Puls, last-2.1" : "wie von Garmin geliefert";
    const t1 = `<b>Fitness ${isNum(F[sport]) ? Math.round(F[sport]) : "–"}</b> = 42-Tage-Mittel deiner Trainingslast ${esc(IM_SPORT[sport])} bis gestern (Last ${esc(lastText)}), wie pmc-2.0, nur mit dieser Sportart. `
      + `Bei enduco heisst das «Base Fitnesslevel»; dort wird die Last etwas anders gerechnet, darum ist die Zahl ähnlich, aber nicht gleich.`;
    const t2 = `Wie diese Zahl den Start deines Plans bestimmt, ist noch offen. Bis dahin beginnt dein Plan wie bisher bei «jetzt»${isNum(jetzt) ? ` (${hm(jetzt)} pro Woche)` : ""} `
      + `mit der Aufteilung 20/50/30${b ? `: ${esc(SPORT_NAME[sport])} ${hm(b.h)} pro Woche` : ""}.`;
    return V59().blatt("pe", `<div class="blatt-titel">${ring(sport, F[sport], true)}<h2 id="v59-ov-h" tabindex="-1">Basis-Fitness ${esc(SPORT_NAME[sport])}</h2>
        <p class="sub">Wie viel Training ${esc(IM_SPORT[sport])} dein Körper gewohnt ist.</p></div>
      <p class="ek-text">${t1}</p>
      <p class="ek-text">${t2}</p>
      <p class="hint">${esc(V75().VERSIONS.basis)}. Einen eigenen Wert (Regler, «zurück auf berechnet», Datum der Änderung) gibt es, sobald die Regel feststeht.</p>${fuss()}`);
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
  /** Gruppe «pe-schwimm» als Ganzes (Hilfsmittel, Bahnlänge, Stile, Anfänger-Modus); → Fehlertext oder null. */
  function schwimmSpeichern(E, aenderung) {
    const s = Object.assign({ hilfsmittel: E.schwimm.hilfsmittel, pool: E.schwimm.pool, stile: E.schwimm.stile, anfaenger: E.schwimm.anfaenger === true }, aenderung);
    return sichern("pe-schwimm", { hilfsmittel: s.hilfsmittel, pool: s.pool, stile: s.stile, anfaenger: s.anfaenger });
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
})();
