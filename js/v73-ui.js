/* Ironman Notebook V7.3 – Einheit als ganze Seite wie ein Trainingsbriefing (einheit-2.0; Auftrag V7.3, Etappe 1). Vorbild enduco für
   Aufbau, Reihenfolge und Antippen; Texte, Symbole und Kopfbild sind eigene (Bergausschnitt aus logo.jpg, Verlauf in der Sportfarbe).
   - Mein Plan (Vorschlag, eigene Einheiten, eingeplante Bibliothek): Kopf, Chips (Datum, Uhrzeit «Festlegen», Sperren), Kacheln (Outdoor/Indoor
     bzw. Bahnlänge, Metrik, Optionen), Kennzahlen, Fokus, Equipment, Ablauf mit Zeitachse, alle Schritte (schritte-1.0, js/v73.js), Coach,
     Intensitätszonen; Blätter von unten (V59.blatt) für Datum, Uhrzeit, Indoor, Metrik, Workout bearbeiten, Bahnlänge, Block, Zone, Export.
   - Bibliothek (Workout aus Garmin): dieselbe Seite, nur lesen.
   Gespeichert wird über «Direkt speichern» (V66UI.aendern → planwoche); vergangene und gesperrte Tage bleiben unverändert. «Export» legt einen
   Auftrag «An Garmin senden» für diese Einheit an (garmin-senden-1.0 mit Auswahl, V66UI.einheitSenden); gesendet wird im Nacht-Update.
   V7.6 kraft-plan-1.0 (js/v76.js): Krafttraining mit Dauer, Uhrzeit, der Notiz für die Übungen, RPE nach der Einheit (sRPE als eigene Zahl), «Nur diese Woche»
   (anderer Tag, auslassen) und dem Weg zum Termin in den Planeinstellungen; ohne Ablauf, Zonen und Export (geht nicht an Garmin). */
(function () {
  "use strict";
  const M = (window.V73UI = window.V73UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V64 = () => window.V64, V66 = () => window.V66, V73 = () => window.V73, V59 = () => window.V59;
  const P = () => window.V64UI, U66 = () => window.V66UI, TR = () => window.TR, SW = () => window.SW, SWUI = () => window.SWUI, WS = () => window.WS;
  const V76 = () => window.V76, U75 = () => window.V75UI;
  const $ = (id) => document.getElementById(id);
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const komma = (x) => String(x).replace(".", ",");
  const mmss = (s) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
  const ic = (k, w) => V6().icon(k, w);
  let C = null, SEITE = null, Z = null, X = null, BL = [], MELD = null;
  const heute = () => C.iso(C.today);
  const reduziert = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const SPORT_WORT = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen", wandern: "Wandern", ski: "Ski", kraft: "Kraft", mobility: "Mobility", andere: "Training" };
  const spVar = (sp) => `var(--sp-${["rad", "lauf", "schwimm", "wandern", "ski"].includes(sp) ? sp : "andere"})`;
  const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  const datumKurz = (iso) => { const d = new Date(iso + "T12:00:00"); return `${WT[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`; };
  const tagText = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
  const skalen = () => (TR() && C ? TR().zonen(C.D.zonen).skalen : {}) || {};

  /* ---------- Zonen: Chips, Farben, Erklärungen (eigene Worte) ---------- */
  const ZCHIP = { z1: ["z1", "Z1·Erholung"], pause: ["z1", "Z1·Erholung"], z2: ["z2", "Z2·Grundlage"], renntempo: ["fatmax", "Z2·Renntempo"], z3: ["z3", "Z3·Tempo"],
    z3o: ["sweet", "Z3·unter LT2"], css: ["z4", "Z4·CSS"], vo2: ["vo2", "Z5·VO2max"], test: ["offen", "Test"], abc: ["z1", "Lauf-ABC"] };
  /** Schlüssel der Zonenfarben (V6.ZONEN) eines Schritts: Abschnittsart (Mein Plan) oder Zone des Workouts (Bibliothek). */
  const v6Key = (s) => (s.key ? (ZCHIP[s.key] || ["offen"])[0] : s.zone && V6().ZONEN[s.zone] ? s.zone : "offen");
  const farbe = (k) => (V6().ZONEN[k] || V6().ZONEN.offen).farbe;
  function chip(s) {
    if (s.key) { const [k, t] = ZCHIP[s.key] || ["offen", "ohne Ziel"]; const f = farbe(k); return `<span class="zchip" style="--zc:${f};background:${V6().rgba(f, 0.2)}">${esc(t)}</span>`; }
    return s.zone && s.zone !== "pause" ? V6().zchip(s.zone) : "";
  }
  const ZONE_INFO = {
    z1: "Sehr locker, deutlich unter LT1. Hilft der Erholung und lockert, ohne neue Ermüdung zu setzen – auch die Pausen zwischen harten Abschnitten liegen hier.",
    z2: "Unter LT1: Sprechen in ganzen Sätzen geht. Hier entsteht die aerobe Grundlage; der grösste Teil des Trainings liegt in diesem Bereich.",
    fatmax: "Oberer Teil der Grundlage, knapp unter LT1. Auf dieser Seite auch das Renntempo langer Rennen: gleichmässig, mit Verpflegung wie im Rennen.",
    z3: "Zwischen LT1 und LT2: zügig, die Atmung wird tiefer. Viel Zeit hier ermüdet schneller als Grundlage, ohne den Reiz harter Intervalle zu setzen.",
    sweet: "Oberer Teil zwischen LT1 und LT2, knapp unter der Schwelle: lange haltbar und doch anstrengend. Nicht über LT2 gehen.",
    z4: "Um LT2 – im Schwimmen das CSS-Tempo: die höchste Intensität, die sich über längere Zeit halten lässt.",
    z5: "Über LT2, nahe der maximalen Sauerstoffaufnahme: nur in kurzen Abschnitten mit Pausen, alle Wiederholungen gleich stark.",
    vo2: "Über LT2, nahe der maximalen Sauerstoffaufnahme: nur in kurzen Abschnitten mit Pausen, alle Wiederholungen gleich stark.",
    anaerob: "Deutlich härter als VO2max-Tempo: sehr kurze, sehr harte Abschnitte mit langen Pausen.",
    neuro: "Kurze Antritte für Technik und Nervensystem, mit langen Pausen – sie sollen schnell machen, nicht müde.",
    sprint: "Maximale Sprints von wenigen Sekunden, danach ganz locker.",
    pause: "Pause oder lockere Erholung zwischen zwei Abschnitten.",
    offen: "Für diesen Abschnitt ist kein Zielbereich bekannt.",
  };
  const POS6 = { pause: 0.25, z1: 0.5, z2: 1.5, fatmax: 1.85, z3: 2.5, sweet: 2.85, z4: 3.5, z5: 4.3, vo2: 4.3, anaerob: 4.6, neuro: 4.8, sprint: 5, offen: 0.9 };

  /* ---------- Rahmen: ganze Seite, schiebt von rechts herein ---------- */
  function rahmen() {
    if (SEITE) return SEITE;
    const el = document.createElement("div");
    el.id = "v73-seite"; el.className = "v73-seite"; el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "v73-titel");
    el.innerHTML = `<div class="v73-mini" aria-hidden="true"><b></b></div><div class="v73-scroll"></div>
      <p class="v73-meldung" role="status" aria-live="polite" hidden></p>
      <div class="v73-fuss"><button type="button" class="v73-zurueck" aria-label="Zurück">${ic("zurueck", 24)}</button><span class="v73-haupt"></span></div>`;
    document.body.appendChild(el);
    el.querySelector(".v73-zurueck").onclick = () => M.schliessen();
    const sc = el.querySelector(".v73-scroll");
    sc.addEventListener("scroll", () => { const h = sc.querySelector(".v73-hero"); el.classList.toggle("gescrollt", sc.scrollTop > (h ? h.offsetHeight - 64 : 150)); }, { passive: true });
    // Escape: zuerst ein offenes Blatt (V59), dann die Seite – im Fangen-Durchlauf, bevor V59 das Blatt schliesst
    window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && M.offen() && $("v59-ov") && $("v59-ov").hidden) { ev.preventDefault(); M.schliessen(); } }, true);
    SEITE = el;
    return el;
  }
  M.offen = () => !!(SEITE && !SEITE.hidden);
  function oeffnen(z) {
    C = UI() && UI().C; if (!C || !V73() || !V6()) return false;
    const el = rahmen(), war = M.offen();
    Z = z; X = null;
    if (V59() && V59()._ovArt) V59().schliessen();          // z. B. Tagesblatt: «Zurück» öffnet es wieder (z.zurueck)
    const sc = el.querySelector(".v73-scroll");
    sc.innerHTML = platzhalter(z.sport); sc.scrollTop = 0;
    el.classList.remove("gescrollt");
    el.querySelector(".v73-haupt").innerHTML = "";
    if (!war) {
      el.hidden = false; document.documentElement.classList.add("v73-offen");
      V59().modalAuf(el);
      if (reduziert()) el.classList.add("auf"); else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("auf")));
    }
    setTimeout(() => { zeichnen(); const h = $("v73-titel"); if (h) h.focus({ preventScroll: true }); }, war || reduziert() ? 0 : 160);
    return true;
  }
  /** Seite schliessen; opt.still = ohne «Zurück» (z. B. beim Wechsel ins Wissen). */
  M.schliessen = function (opt) {
    if (!M.offen()) return;
    const z = Z; Z = null; X = null;
    if (V59() && V59()._ovArt) V59().schliessen();
    SEITE.classList.remove("auf");
    const fertig = () => {
      SEITE.hidden = true; SEITE.querySelector(".v73-scroll").innerHTML = ""; document.documentElement.classList.remove("v73-offen");
      V59().modalZu(SEITE);
      if (!(opt && opt.still) && z && z.zurueck) z.zurueck();
    };
    if (reduziert()) fertig(); else setTimeout(fertig, 240);
  };
  /* ---------- V7.6.2 bilder-1.0: eigene Fotos im Kopf (verschlüsselt in bilder/, tools/bilder_crypt.mjs; welche es gibt: config.bilder) ---------- */
  const BILD = new Map(), BILD_OK = new Map();
  /** Bild zur Einheit: Schwimmen, Laufen, Rad (lange Ausfahrt mit eigenem Bild, sonst das Rad-Bild), Wandern, Skitour; sonst keins (Berg). */
  function bildKey(sport, e) {
    const cfg = C && C.D && C.D.config && C.D.config.bilder; if (!cfg || window.SPUREN_DEMO) return null;
    if (e && e.art === "draussen") {                                   // V7.7 aktivitaet-plan-1.0: Skitour, Wandern; Langlauf und Traillauf mit dem nächsten Bild
      const A = window.V77 && window.V77.ARTEN[e.draussen], k1 = e.draussen, k2 = A && A.bild;
      return cfg[k1] ? k1 : k2 && cfg[k2] ? k2 : null;
    }
    let k = sport === "rad" && e && (e.art === "lang" || /^rad_lang/.test(e.id || e.vorlage || "")) ? "rad-lang" : sport;
    if (k === "rad-lang" && !cfg[k]) k = "rad";
    return cfg[k] ? k : null;
  }
  function bildLaden(key) {
    const D = C && C.D, info = key && D && D.config && D.config.bilder ? D.config.bilder[key] : null;
    if (!info || !D.serien_salz || !window.AN || !window.SPUREN_VAULT || !window.SPUREN_VAULT.openBin) return Promise.resolve(null);
    if (!BILD.has(key)) BILD.set(key, (async () => {
      try {
        const r = await fetch(`bilder/${await window.AN.serieName(D.serien_salz, "bild:" + key)}.bin`);
        if (!r.ok) return null;
        const jpg = await window.SPUREN_VAULT.openBin(new Uint8Array(await r.arrayBuffer()));
        const o = { url: URL.createObjectURL(new Blob([jpg], { type: "image/jpeg" })), pos: /^\d{1,3}% \d{1,3}%$/.test(info.pos || "") ? info.pos : "50% 40%" };
        BILD_OK.set(key, o);
        return o;
      } catch (err) { console.error(err); return null; }
    })());
    return BILD.get(key);
  }
  /** Nach dem Zeichnen: Bild nachladen und einblenden, wenn es noch nicht da war. */
  function bildEinsetzen(key) {
    if (!key || BILD_OK.has(key)) return;
    bildLaden(key).then((o) => {
      const h = o && SEITE && !SEITE.hidden && SEITE.querySelector(`.v73-hero[data-bild="${key}"]`); if (!h) return;
      h.style.setProperty("--hero-bild", `url('${o.url}')`); h.style.setProperty("--hero-pos", o.pos); h.classList.add("bild");
    });
  }
  function platzhalter(sport) {
    return `<div class="v73-hero" style="--sp:${spVar(sport)}"><div class="v73-hero-text"><span class="v73-ph" style="width:46%;height:12px"></span>
        <span class="v73-ph" style="width:72%;height:28px;margin-top:10px"></span></div></div>
      <div class="v73-inhalt" aria-hidden="true"><div class="v73-chips"><span class="v73-ph" style="width:96px;height:34px;border-radius:999px"></span><span class="v73-ph" style="width:96px;height:34px;border-radius:999px"></span><span class="v73-ph" style="width:96px;height:34px;border-radius:999px"></span></div>
        <div class="v73-kacheln">${"<span class=\"v73-ph\" style=\"height:74px;border-radius:16px\"></span>".repeat(3)}</div>
        <span class="v73-ph" style="height:64px;border-radius:16px"></span><span class="v73-ph" style="height:120px;border-radius:16px"></span>
        <span class="v73-ph" style="height:56px;border-radius:14px"></span><span class="v73-ph" style="height:56px;border-radius:14px"></span></div>`;
  }
  function melden(text, ok) {
    if (!SEITE) return;
    const p = SEITE.querySelector(".v73-meldung");
    p.textContent = text || ""; p.hidden = !text; p.classList.toggle("ok", !!ok);
    clearTimeout(MELD); if (text) MELD = setTimeout(() => { p.hidden = true; }, 4200);
  }

  /* ---------- Einstiege ---------- */
  /** Einheit aus Mein Plan (ds, uid); opt.zurueck() öffnet danach z. B. das Tagesblatt wieder. → true, wenn die Seite aufging. */
  M.plan = function (ds, uid, opt) {
    C = UI() && UI().C; if (!C || !P() || !P().kontextFuer || !V66()) return false;
    const x = planSuchen(ds, uid); if (!x) return false;
    return oeffnen({ art: "plan", ds, uid, sport: x.e.sport, zurueck: (opt && opt.zurueck) || null });
  };
  /** Workout aus der Bibliothek (p wie ein Kalendereintrag, mit steps), nur lesen; opt.datumText, opt.extra (HTML). */
  M.workout = function (p, opt) {
    C = UI() && UI().C; if (!C || !window.V6H || !window.V6H.profilVon) return false;
    const x = window.V6H.profilVon(p); if (!x) return false;
    return oeffnen({ art: "workout", p, sport: x.sport, opt: opt || {}, zurueck: (opt && opt.zurueck) || null });
  };
  function planSuchen(ds, uid) {
    let K = null; try { K = P().kontextFuer(V64().montag(ds)); } catch (e) { console.error(e); }
    const t = K && K.w.tage.find((x) => x.date === ds), e = t && t.einheiten.find((x) => x.uid === uid);
    return e ? { K, t, e } : null;
  }
  /** Workout der Bibliothek zu einer Workout-ID (aus Mein Plan). */
  function bibWorkout(wid) {
    const B = C.D.enduco_bib; if (!B || !window.V65 || !window.V6H) return null;
    const e = window.V65.eintraege(B, C.D.activities || []).find((x) => +x.wid === +wid); if (!e || !Array.isArray(e.steps) || !e.steps.length) return null;
    return window.V6H.profilVon({ title: e.titel, sport: e.sport, dur_s: e.dauer_s, steps: e.steps, desc: e.text, quelle: "Enduco (Bibliothek)" });
  }

  /* ---------- Modell der Seite ---------- */
  function modell() {
    const sk = skalen();
    if (Z.art === "workout") {
      const x = window.V6H.profilVon(Z.p); if (!x) return null;
      const wo = x.wo, baum = wo ? V73().ausWorkout(wo, (s) => { const z = V6().schrittZone(s, wo, sk); return z ? z.key : null; }, (s) => V6().zielText(s, wo)) : [];
      return { art: "workout", sport: x.sport, titel: Z.p.title || Z.p.name || SPORT_WORT[x.sport] || "Training", ds: Z.p.date || null, baum, wo, pr: x.pr, sk,
        dauer_s: isNum(x.dauer) ? x.dauer : null, darf: false, lesen: true, quelle: Z.p.quelle || "Enduco (Bibliothek)" };
    }
    const y = planSuchen(Z.ds, Z.uid); if (!y) return null;
    const { K, t, e } = y, css = K.css ? K.css.s : null, swim = e.sport === "schwimm";
    let baum = [], S = null, wo = null, pr = null, pool = null;
    if (e.art === "bibliothek") {
      const b = bibWorkout(e.wid);
      if (b && b.wo) { wo = b.wo; pr = b.pr; baum = V73().ausWorkout(wo, (s) => { const z = V6().schrittZone(s, wo, sk); return z ? z.key : null; }, (s) => V6().zielText(s, wo)); }
    } else if (swim && SW() && SWUI()) {
      pool = e.pool || SWUI().becken();                                     // V7.5 einheit-felder-1.1: Bahnlänge dieser Einheit, sonst der Standard
      // dieselbe Schwimm-Einheit wie beim Senden an Garmin (garmin-senden-1.1)
      if (U66() && U66().schwimmEinheit) S = U66().schwimmEinheit(e, Z.ds, K);
      else try { S = SW().einheit(SW().artVon(e.id), Object.assign({ css_m: SW().cssStrecke ? SW().cssStrecke(e.id) : null, min: e.dauer, css_s: css, pool, ref_s: SW().refTempo(C.D.activities), woche: SWUI().woche(Z.ds) }, window.V75UI ? window.V75UI.schwimmOpt() : {})); } catch (err) { console.error(err); }
      baum = V73().ausSchwimm(S);
    } else baum = V73().ausTeilen(e);
    const vorbei = Z.ds < heute();
    const nachgeholt = !!(e.ampel && e.ampel.nachgeholt && !e.ampel.von);    // V7.4: nachgeholte Einheit ändert sich mit der Ampel, nicht von Hand
    return { art: "plan", K, t, e, sport: e.sport, titel: e.titel, ds: Z.ds, uid: Z.uid, baum, S, wo, pr, sk, css, pool, swim, vorbei, nachgeholt,
      darf: !vorbei && !t.gesperrt && !nachgeholt, lesen: vorbei, metrik: V73().metrik(e), dauer_s: e.dauer * 60 };
  }
  /** Warum eine Änderung nicht geht (oder null). */
  function sperre(nurEntsperren) {
    if (!X || X.art !== "plan") return "Nur lesen";
    if (X.vorbei) return "Vergangene Tage nur lesen.";
    if (X.nachgeholt) return "Nachgeholt wegen der Ampel – ändern im Tagesblatt des ursprünglichen Tages («Trotzdem wie geplant»).";
    if (X.t.gesperrt) return "Der Tag ist gesperrt – im Tagesblatt entsperren.";
    if (X.e.gesperrt && !nurEntsperren) return "Einheit gesperrt – zuerst entsperren.";
    return null;
  }

  /* ---------- Zeichnen ---------- */
  function zeichnen() {
    if (!Z || !SEITE) return;
    C = UI() && UI().C;
    try { X = modell(); } catch (err) { console.error(err); X = null; }
    const sc = SEITE.querySelector(".v73-scroll"), oben = sc.scrollTop;
    if (!X) { sc.innerHTML = `<div class="v73-inhalt"><p class="ek-ohne">Diese Einheit gibt es nicht mehr (verschoben oder entfernt).</p></div>`; SEITE.querySelector(".v73-haupt").innerHTML = ""; return; }
    BL = [];
    const offen = new Set([...sc.querySelectorAll("details[data-v73ab]")].filter((d) => !d.open).map((d) => d.dataset.v73ab));
    let aa = ""; try { aa = X.art === "plan" && window.V74UI ? window.V74UI.einheitBanner(X.ds, X.e, X.t) : ""; } catch (err) { console.error(err); }   // V7.4 ampel-plan-1.0
    const kraft = X.art === "plan" && X.sport === "kraft" && !!V76();      // V7.6 kraft-plan-1.0: ohne Ablauf, Schritte und Zonen
    const drau = X.art === "plan" && X.e && X.e.art === "draussen" && !!window.V77UI;   // V7.7 aktivitaet-plan-1.0: eigener Abschnitt (js/v77-ui.js)
    const bk = bildKey(X.sport, X.e);
    sc.innerHTML = drau ? kopf(bk) + `<div class="v73-inhalt"><div class="v73-chips"><span class="v73-chip still">${ic("kalender", 16)}${esc(datumKurz(X.ds))}</span>${X.e.uhrzeit ? `<span class="v73-chip still">${ic("uhr", 16)}${esc(X.e.uhrzeit)}</span>` : ""}</div>${aa}${window.V77UI.abschnitt(X)}${verpflegung()}</div>`
      : kopf(bk) + `<div class="v73-inhalt">${chips()}${aa}${kacheln()}${kennzahlen()}${kraft ? kraftAbschnitt() + verpflegung() + coach() : fokus() + equipment() + verpflegung() + ablauf() + schritte() + coach() + zonen()}${extra()}${fussnote()}</div>`;
    sc.querySelectorAll("details[data-v73ab]").forEach((d) => { if (offen.has(d.dataset.v73ab)) d.open = false; });
    sc.scrollTop = oben;
    SEITE.querySelector(".v73-mini b").textContent = X.titel;
    SEITE.querySelector(".v73-haupt").innerHTML = X.art === "plan" && !X.vorbei && !kraft && !drau ? `<button type="button" class="btn primary v73-export" data-v73="export">Export ${ic("play", 18)}</button>` : "";
    binden();
    if (kraft) kraftBinden(sc);
    if (drau) window.V77UI.binden(sc, X, () => zeichnen());
    bildEinsetzen(bk);
    if (window.V74UI) window.V74UI.binden(sc, () => zeichnen());
    const f = LETZT && SEITE.querySelector(`[data-v73="${LETZT}"]`);
    if (f && document.activeElement === document.body) try { f.focus({ preventScroll: true }); } catch (e) { /* */ }
  }
  function kopf(bk) {
    const W = V6(), gesperrt = X.art === "plan" && (X.e.gesperrt || X.t.gesperrt);
    const unter = X.art === "workout" ? `${SPORT_WORT[X.sport] || ""} · ${X.quelle}`
      : X.e.kraft_plan ? (X.e.kraft_auto ? "Tag automatisch · Planeinstellungen" : "fester Termin · Planeinstellungen") : X.e.art === "draussen" ? "Aktivität draussen · blockiert den Tag" : X.e.quelle === "bibliothek" ? "aus deiner Enduco-Bibliothek" : X.e.quelle === "eigen" ? "eigene Einheit · Mein Plan" : `Vorschlag «${X.K.w.modellName || "Modell"}» · Mein Plan`;
    const o = bk ? BILD_OK.get(bk) : null;
    return `<div class="v73-hero${o ? " bild" : ""}"${bk ? ` data-bild="${bk}"` : ""} style="--sp:${spVar(X.sport)}${o ? `;--hero-bild:url('${o.url}');--hero-pos:${o.pos}` : ""}"><span class="v73-hero-sym" aria-hidden="true">${W.sportIcon(X.sport, 150)}</span>
      <div class="v73-hero-text"><p class="v73-ueber">${W.sportIcon(X.sport, 16)}${gesperrt ? `<span class="v73-schloss" title="gesperrt">${ic("schloss", 15)}</span>` : ""}<span>Trainingsbriefing</span></p>
        <h1 id="v73-titel" tabindex="-1">${esc(X.titel)}</h1><p class="v73-unter">${esc(unter)}</p></div></div>`;
  }
  function chips() {
    if (X.art !== "plan") return Z.opt && Z.opt.datumText ? `<div class="v73-chips"><span class="v73-chip still">${ic("kalender", 16)}${esc(Z.opt.datumText)}</span></div>`
      : X.ds ? `<div class="v73-chips"><span class="v73-chip still">${ic("kalender", 16)}${esc(datumKurz(X.ds))}</span></div>` : "";
    const e = X.e, gesperrt = !!e.gesperrt;
    return `<div class="v73-chips" role="group" aria-label="Datum, Uhrzeit und Sperre">
      <button type="button" class="v73-chip" data-v73="datum" aria-label="Datum: ${esc(tagText(X.ds))} – verschieben">${ic("kalender", 16)}${esc(datumKurz(X.ds))}</button>
      <button type="button" class="v73-chip${e.uhrzeit ? " an" : ""}" data-v73="zeit" aria-label="${e.uhrzeit ? "Uhrzeit " + esc(e.uhrzeit) + " – ändern" : "Uhrzeit festlegen"}">${ic("uhr", 16)}${e.uhrzeit ? esc(e.uhrzeit) : "Festlegen"}</button>
      <button type="button" class="v73-chip${gesperrt ? " an" : ""}" data-v73="sperren" aria-pressed="${gesperrt}">${ic(gesperrt ? "schloss" : "offen", 16)}${gesperrt ? "Entsperren" : "Sperren"}</button></div>`;
  }
  function kachel(k, icon, wert, name, still) {
    return `<button type="button" class="v73-kachel${still ? " still" : ""}" data-v73="${k}"${still ? ` aria-disabled="true"` : ""}><span class="v73-k-ic">${ic(icon, 22)}</span><b>${esc(wert)}</b><small>${esc(name)}</small></button>`;
  }
  function kacheln() {
    const L = [];
    if (X.sport === "schwimm") L.push(kachel("becken", "becken", `${X.pool || (SWUI() ? SWUI().becken() : 25)} m`, "Bahnlänge", X.art !== "plan" || !!X.wo));
    else if (X.sport === "rad" || X.sport === "lauf") L.push(kachel("indoor", X.art === "plan" && X.e.drinnen ? "drinnen" : "draussen", X.art === "plan" && X.e.drinnen ? "Indoor" : "Outdoor", X.sport === "rad" ? (X.art === "plan" && X.e.drinnen ? "Rolle" : "Strasse") : X.art === "plan" && X.e.drinnen ? "Laufband" : "draussen", X.art !== "plan" || X.e.quelle === "bibliothek"));
    else L.push(kachel("sport", V6().ICON[X.sport] ? X.sport : "andere", SPORT_WORT[X.sport] || "Training", "Sportart", true));
    if (X.sport === "kraft") { /* V7.6: Krafttraining ohne Metrik */ }
    else if (X.art === "plan" && X.e.quelle !== "bibliothek" && V73().METRIKEN[X.sport]) L.push(kachel("metrik", metIcon(X.metrik), V73().METRIK_KURZ[X.metrik], "Metrik", false));
    else { const m = metrikWorkout(); L.push(kachel("metrik", { PWR: "energie", PACE: "tacho", HF: "herz" }[m] || "tacho", m, "Metrik", true)); }
    L.push(kachel("optionen", "regler", "Optionen", X.art === "plan" ? "Bearbeiten" : "nur lesen", X.art !== "plan"));
    return `<div class="v73-kacheln">${L.join("")}</div>`;
  }
  /** Metrik eines Workouts aus Garmin: Art der Ziele seiner Schritte. */
  function metrikWorkout() {
    const L = X.wo ? X.wo.schritte.map((s) => s.ziel && s.ziel.art).filter(Boolean) : [];
    return L.includes("watt") ? "PWR" : L.includes("pace") ? "PACE" : L.includes("hf") ? "HF" : X.sport === "schwimm" ? "PACE" : "–";
  }
  function schaetzung() {
    if (X.art !== "plan") return { tl: null, km: null };
    try { return V66().schaetzung(X.e, V66().bezug(X.sk, X.css)); } catch (e) { console.error(e); return { tl: null, km: null }; }
  }
  function kennzahlen() {
    if (X.art === "plan" && X.sport === "kraft" && V76()) return kraftZahlen();
    const W = V6(), S = schaetzung(), kv = [];
    const d = X.art === "plan" ? (X.S && X.e.art !== "kurs" ? X.S.dauer_s : null) : null;
    kv.push([X.dauer_s ? (X.art === "workout" && X.pr && X.pr.geschaetzt ? "≈ " : "") + W.dauerText(X.dauer_s) : "offen", "Dauer"]);
    kv.push([isNum(S.tl) ? `≈ ${S.vollstaendig ? "" : "mind. "}${S.tl}` : "–", "Training Load"]);
    if (X.sport === "schwimm") { const m = X.S ? X.S.meter : X.wo && isNum(X.wo.distanz_m) ? X.wo.distanz_m : null; if (isNum(m) && m > 0) kv.push([`${m.toLocaleString("de-CH")} m`, "Distanz"]); }
    else if (X.sport === "lauf" && isNum(S.km) && S.km > 0) kv.push([`≈ ${komma(S.km)} km`, "Distanz"]);
    else if (X.art === "workout" && X.wo && isNum(X.wo.distanz_m)) kv.push([W.distanzText(X.wo.distanz_m), "Distanz"]);
    const hinweise = [];
    if (X.art === "plan" && !isNum(S.tl) && S.grund) hinweise.push(`TL ≈ offen: ${S.grund}.`);
    if (X.art === "plan" && X.swim && X.S && !isNum(d) && X.e.id !== "schwimm_kurs") hinweise.push("Dauer der Serien offen (noch kein CSS-Test und keine Becken-Einheiten); gezeigt ist die geplante Zeit.");
    if (X.art === "plan" && X.e.check) hinweise.push("Mit Laktat-Kurzcheck (Testkalender).");
    let aufbau = null;
    try { if (X.art === "plan" && X.sport === "lauf" && !X.vorbei) aufbau = V66().aufbauHinweis(X.e, X.ds, S.km, V64().laeufe(C.D.activities), heute()); } catch (e) { console.error(e); }
    return `<div class="v73-kv">${kv.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      ${hinweise.length ? `<p class="hint">${esc(hinweise.join(" "))}</p>` : ""}${aufbau ? `<p class="warn-t">Aufbau: ${esc(aufbau)}</p>` : ""}`;
  }
  /** Fokus: Skala über alle Intensitäten, belegte hell; darunter die Hauptbereiche mit «i». */
  function fokus() {
    const W = V6(), F = V73().fokus(X.baum).map((f) => ({ key: v6Key({ key: X.art === "plan" && !X.wo ? f.key : null, zone: X.art === "plan" && !X.wo ? null : f.key }), anteil: f.anteil }));
    if (!X.baum.length) return "";
    const an = new Set(F.map((f) => (f.key === "z5" ? "vo2" : f.key)));
    const n = W.SKALA_REIHE.length, i4 = W.SKALA_REIHE.indexOf("z4");
    return `<section class="v73-ab"><h2 class="abschnitt">${ic("fokus", 15)}Fokus Intensitäten</h2>
      <div class="zskala v73-zskala" role="img" aria-label="Zonenskala, hervorgehoben: ${esc(F.map((f) => W.ZONEN[f.key].name).join(", ") || "keine")}">
        ${W.SKALA_REIHE.map((k) => `<span class="${an.has(k) ? "an" : ""}" style="--zc:${farbe(k)}"></span>`).join("")}</div>
      <div class="v73-skala-enden" aria-hidden="true"><span>Ruhe</span><span style="left:${((i4 + 0.5) / n * 100).toFixed(1)}%">Schwelle</span><span>max</span></div>
      <div class="v73-fokus">${F.map((f) => `<button type="button" class="v73-fchip" data-v73z="${esc(f.key)}" style="--zc:${farbe(f.key)}"><i></i>${esc(W.ZONEN[f.key].name)}<small>${Math.round(f.anteil * 100)} %</small>${ic("info", 15)}</button>`).join("")
        || `<span class="hint">Locker ohne Hauptbereich.</span>`}</div></section>`;
  }
  function equipment() {
    if (X.sport !== "schwimm" || !SW()) return "";
    const n = X.S ? X.S.hilfsmittel : V73().hilfsmittel(X.baum), f = X.S ? X.S.frei : [];
    if (!n.length && !f.length) return "";
    const g = (h, frei) => `<span class="v73-geraet${frei ? " frei" : ""}">${ic("geraet", 15)}${esc(SW().HILFSMITTEL[h] || h)}${frei ? " (freiwillig)" : ""}</span>`;
    return `<section class="v73-ab"><h2 class="abschnitt">${ic("geraet", 15)}Equipment</h2><div class="v73-geraete">${n.map((h) => g(h)).join("")}${f.map((h) => g(h, true)).join("")}</div></section>`;
  }
  /** Balkenprofil aus den Schritten (Breite = Dauer, ohne Dauer nach Strecke), Höhe = Intensität, Farbe = Zone. */
  function profil() {
    if (X.wo && X.pr) return { p: X.pr, zeit: !X.pr.ohneDauer };
    let t = 0, zeit = true; const balken = [];
    const L = V73().flach(X.baum);
    for (let i = 0; i < L.length; i++) {
      const s = L[i];
      const k = v6Key(s), w = isNum(s.s) && s.s > 0 ? s.s : isNum(s.m) && s.m > 0 ? s.m * 1.4 : 20;
      if (!(isNum(s.s) && s.s > 0) && s.art !== "bahn") zeit = false;
      balken.push({ x0: t, w, d: w, key: k, h: Math.max(0.12, Math.min(1, 0.1 + 0.9 * ((POS6[k] ?? 1) / 5))) }); t += w;
    }
    return { p: { balken, breite_s: t, dauer_s: t }, zeit };
  }
  function ablauf() {
    if (!X.baum.length) return "";
    const W = V6(), { p, zeit } = profil(), total = p.breite_s || 0;
    const ax = zeit ? V73().achse(total).map((a) => `<span style="left:${(a.s / total * 100).toFixed(2)}%">${esc(a.text)}</span>`).join("") : "";
    return `<section class="v73-ab"><h2 class="abschnitt">${ic("ablauf", 15)}Trainingsablauf</h2>
      ${W.profilSVG(p, { gross: true, h: 120, label: "Ablauf: Breite = Dauer, Höhe und Farbe = Intensität" })}
      ${ax ? `<div class="v73-achse" aria-hidden="true">${ax}</div>` : `<p class="hint">Breite nach Strecke (Dauer offen).</p>`}</section>`;
  }

  /* ---------- Schritte und Blöcke ---------- */
  const ART_ICON = { ein: "warm", aus: "kalt", belastung: "intervall", erholung: "runter2", pause: "runter2", bahn: "bahnende", technik: "technik", test: "fokus", abc: "technik" };
  const ART_WORT = { ein: "Einfahren", aus: "Ausfahren", belastung: "Belastung", erholung: "Erholung", pause: "Pause", bahn: "Bahn beenden", technik: "Technik", test: "Test", abc: "Lauf-ABC" };
  const metIcon = (m) => ({ leistung: "energie", pace: "tacho", puls: "herz", rpe: "kopf" }[m] || "energie");
  /** Ziel eines Schritts in der gewählten Metrik (Mein Plan) bzw. laut Workout (Bibliothek). */
  function zielVon(s) {
    if (s.ziel) return { text: s.ziel, icon: /bpm/.test(s.ziel) ? "herz" : X.sport === "rad" ? "energie" : "tacho" };
    if (X.art !== "plan" || X.wo) return null;
    if (X.swim) {
      if (s.art === "pause" || s.art === "bahn") return null;
      if (X.metrik === "rpe") return s.rpe ? { text: s.rpe, icon: "kopf" } : null;
      return s.tempo ? { text: s.tempo, icon: "tacho" } : s.rpe ? { text: s.rpe, icon: "kopf" } : null;
    }
    const t = V73().ziel(s.key, X.sport, X.sk, X.css, X.metrik);
    return t ? { text: t, icon: metIcon(X.metrik) } : null;
  }
  /** «langsam und sauber, RPE 2–3/10» → { rpe: "RPE 2–3", wort: "langsam und sauber" } */
  function rpeTeilen(t) { const m = /^(.*?)[,\s]*RPE\s*([\d–-]+)(?:\/10)?\s*$/.exec(String(t || "")); return m ? { rpe: `RPE ${m[2]}`, wort: m[1].trim() } : { rpe: t, wort: "" }; }
  function schrittHTML(s) {
    const D = V73(), k = v6Key(s), f = farbe(k), sw = X.sport === "schwimm";
    if (s.art === "abc") {                                               // lauf-abc-1.0: Übungen mit Sätzen und eigener Kurzbeschreibung
      return `<li class="v73-s v73-abc" style="--zc:${f}"><span class="v73-s-ic" title="Lauf-ABC">${ic("technik", 20)}</span>
        <div class="v73-s-m"><div class="v73-s-z"><b>${esc(D.dauerKurz(s.s))}</b></div><span class="v73-s-t">${esc(s.text)}</span>
        <ol class="v73-abc-l">${(s.uebungen || []).map((u) => `<li><b>${esc(u.name)}</b> · ${u.saetze}&nbsp;×&nbsp;${esc(u.wert)}<small>${esc(u.text)}</small></li>`).join("")}</ol>
        <small>Namen und Sätze wie in Enduco, die Beschreibung in eigenen Worten – im Zweifel wie im Enduco-Video.</small></div>
        <span class="v73-s-r">${chip(s)}</span></li>`;
    }
    let z = zielVon(s), wort = "";
    if (z && z.icon === "kopf" && sw) { const r = rpeTeilen(z.text); z = { text: r.rpe, icon: "kopf" }; wort = r.wort; }
    const icon = sw && s.art === "pause" ? "leiter" : ART_ICON[s.art] || "intervall";
    const zeile = [];
    if (isNum(s.m) && s.m > 0) {
      zeile.push(`<b>${komma(Math.round(s.m * 10) / 10)} m${s.bahnen ? ` · ${esc(s.bahnen)}` : ""}</b>`);
      if (isNum(s.s) && s.art !== "bahn") zeile.push(`<span class="v73-uhr">${ic("uhr", 14)}${sw || s.geschaetzt ? "≈ " : ""}${esc(D.dauerKurz(s.s))}</span>`);
    } else if (isNum(s.s)) zeile.push(`<b>${s.geschaetzt ? "≈ " : ""}${esc(D.dauerKurz(s.s))}</b>`);
    else zeile.push(`<b>offen</b>`);
    if (z) zeile.push(`<span class="v73-ziel">${ic(z.icon, 14)}${esc(z.text)}</span>`);
    const unter = [];
    if (s.kad) unter.push(`Trittfrequenz ${s.kad}`);
    const text = s.art === "bahn" ? "Bahn locker beenden" : s.text;
    const mehr = [wort, s.stil, ...(s.hilfsmittel || []).map((h) => (SW() && SW().HILFSMITTEL[h]) || h), ...(s.frei || []).map((h) => `${(SW() && SW().HILFSMITTEL[h]) || h} (freiwillig)`)].filter(Boolean);
    const ueb = s.uebung || (sw && s.text && SW() && s.art === "technik" ? (SW().finde(s.text) || {}).id : null);
    return `<li class="v73-s" style="--zc:${f}"><span class="v73-s-ic${s.art === "belastung" || s.art === "technik" ? " farbig" : ""}" title="${esc(ART_WORT[s.art] || "")}">${ic(icon, 20)}</span>
      <div class="v73-s-m"><div class="v73-s-z">${zeile.join("")}</div>${text ? `<span class="v73-s-t">${esc(text)}</span>` : ""}${unter.length ? `<small>${esc(unter.join(" · "))}</small>` : ""}${mehr.length ? `<small>${esc(mehr.join(" · "))}</small>` : ""}</div>
      <span class="v73-s-r">${s.art === "bahn" || s.art === "pause" ? "" : chip(s)}${ueb && SW() && SW().uebung(ueb) ? `<button type="button" class="v73-i" data-v73u="${esc(ueb)}" aria-label="Übung erklären: ${esc(SW().uebung(ueb).name)}">${ic("info", 16)}</button>` : ""}</span></li>`;
  }
  function knotenHTML(n, tiefe) {
    if (n.typ === "s") return schrittHTML(n);
    if (n.typ === "abschnitt") {
      return `<li class="v73-abschnitt"><details data-v73ab="${esc(n.name)}" open><summary><span>${ic("technik", 17)}${esc(n.name)}</span><small>${n.kinder.length} Übungen</small>${ic("runter", 18)}</summary>
        ${n.beschreibung ? `<p class="v73-ab-text">${esc(n.beschreibung)}</p>` : ""}<ol class="v73-schritte">${n.kinder.map((k) => knotenHTML(k, tiefe + 1)).join("")}</ol></details></li>`;
    }
    const i = BL.push(n) - 1;
    return `<li class="v73-b${tiefe ? " innen" : ""}"><button type="button" class="v73-b-kopf" data-v73b="${i}" aria-label="${n.wdh} mal ${esc(n.name)}: Erklärung öffnen">
        <span>${n.wdh} × ${esc(n.name)}</span>${ic("info", 16)}</button>
      <ol class="v73-schritte">${n.schritte.map((k) => knotenHTML(k, tiefe + 1)).join("")}</ol>${n.ohneLetzte ? `<p class="v73-b-fuss">nach der letzten Wiederholung ohne Erholung</p>` : ""}</li>`;
  }
  function schritte() {
    if (!X.baum.length) {
      const leer = X.art === "plan" && X.e.id === "schwimm_kurs" ? "Inhalt laut Kurs." : X.art === "plan" && ["kraft", "mobility"].includes(X.e.sport) ? "Inhalt nach deinem Programm – die Seite plant keine Übungen."
        : X.art === "plan" && X.e.quelle === "bibliothek" ? "Die Schritte dieses Enduco-Workouts sind noch nicht in der Bibliothek (das Nacht-Update holt sie nach)." : "Keine Schritte bekannt.";
      return `<section class="v73-ab"><h2 class="abschnitt">${ic("ablauf", 15)}Schritte</h2><p class="ek-ohne">${esc(leer)}</p></section>`;
    }
    return `<section class="v73-ab"><h2 class="abschnitt">${ic("ablauf", 15)}Schritte</h2><ol class="v73-schritte">${X.baum.map((n) => knotenHTML(n, 0)).join("")}</ol></section>`;
  }
  function coach() {
    let text = "";
    if (X.art === "plan" && X.e.quelle === "bibliothek" && X.wo && X.wo.beschreibung) text = X.wo.beschreibung;
    else if (X.art === "plan" && !X.baum.length) text = X.e.zweck || "";
    else if (X.art === "plan") { const a = V73().coach(X.e, X.baum); text = [X.e.zweck, a].filter(Boolean).join(" "); }
    else text = X.wo && X.wo.beschreibung ? X.wo.beschreibung : V73().coach(null, X.baum);
    // V8.4 abwechslung-1.0: Vergleichseinheit oder Form desselben Reizes (aus der Vorlage, auch in gespeicherten Wochen)
    const V64 = window.V64, vl = X.art === "plan" && X.e ? X.e.vorlage || X.e.id : null, fam = vl && V64 && V64.familieVon ? V64.familieVon(vl) : null;
    if (fam && V64.FAMILIEN[fam].length > 1) {
      const F = V64.FAMILIEN[fam], erste = (V64.BAUSTEINE[F[0]] || {}).titel || F[0];
      text = [text, vl === F[0] ? "Vergleichseinheit: Diese Form kommt jede dritte Woche gleich wieder – so siehst du, ob du dieselben Intervalle mit weniger Puls oder mehr Leistung schaffst."
        : `Gleicher Reiz in anderer Form (Abwechslung); die Vergleichseinheit «${erste}» kommt jede dritte Woche wieder.`].filter(Boolean).join(" ");
    }
    if (!text) return "";
    const warum = X.art === "plan" && (X.e.quellen && X.e.quellen.length || X.e.wissen);
    return `<section class="v73-coach"><span class="v73-coach-ic">${ic("coach", 22)}</span><div><b>Coach</b><p>${esc(text)}</p></div>
      ${warum ? `<button type="button" class="v73-i" data-v73="warum" aria-label="Warum diese Einheit">${ic("info", 18)}</button>` : ""}</section>`;
  }
  function zonen() {
    if (!X.baum.length) return "";
    const D = V73(), Zz = D.zonenZeiten(X.baum, V6().ZONEN); if (!Zz.total) return "";
    const met = X.art === "plan" && !X.wo ? X.metrik : X.sport === "schwimm" ? "pace" : X.sport === "rad" ? "leistung" : "pace";
    const zeile = (nr) => {
      const s = Zz.z[nr], a = Zz.total ? s / Zz.total : 0, f = farbe(["z1", "z2", "z3", "z4", "z5"][nr - 1]);
      const b = D.zonenBereich(nr, X.sport, X.sk, X.css, met, mmss);
      return `<li class="v73-zr" style="--zc:${f}"><span class="v73-zr-k"><b>Zone ${nr}</b>${b ? `<small>${esc(b)}</small>` : ""}</span>
        <span class="v73-zr-t">${s ? esc(V6().dauerText(s)) : "–"}<small>${Math.round(a * 100)} %</small></span><i class="v73-zr-bar"><b style="width:${(a * 100).toFixed(1)}%"></b></i></li>`;
    };
    return `<section class="v73-ab"><h2 class="abschnitt">${ic("status", 15)}Intensitätszonen<button type="button" class="v73-i klein" data-v73="verteilung" aria-label="Intensitätsverteilung erklärt">${ic("info", 16)}</button></h2>
      <ol class="v73-zonen">${[1, 2, 3, 4, 5].map(zeile).join("")}</ol>${Zz.ohne ? `<p class="hint">Ohne Zone: ${esc(V6().dauerText(Zz.ohne))} (Test oder ohne Ziel).</p>` : ""}</section>`;
  }
  function extra() { return Z.art === "workout" && Z.opt && Z.opt.extra ? `<section class="v73-ab v73-extra">${Z.opt.extra}</section>` : ""; }
  /** V8.1.1 verpflegung-1.0: Abschnitt «Verpflegung» (js/verpflegung-ui.js) – nur Einheiten aus Mein Plan. */
  function verpflegung() { try { return X.art === "plan" && window.VPUI ? window.VPUI.abschnitt(X.ds, X.e, { vorbei: !!X.vorbei }) : ""; } catch (e) { console.error(e); return ""; } }
  function fussnote() {
    const D = V73();
    if (X.art === "workout") return `<p class="ek-quelle">${esc(D.VERSIONS.einheit)}, ${esc(D.VERSIONS.schritte)}: Schritte und Ziele wie im Workout; Zonen und Farben aus deinem aktiven Zonenprofil. Nur lesen – geändert wird in Enduco bzw. Garmin.</p>`;
    if (X.sport === "kraft" && V76()) return `<p class="ek-quelle">${esc(D.VERSIONS.einheit)}, ${esc(V76().VERSIONS.kraft)}: ${X.e.kraft_plan ? "Termin aus den Planeinstellungen" : "eigene Einheit in Mein Plan"}; Übungen nach deiner Notiz. Änderungen gehen verschlüsselt über «Direkt speichern»; nach Garmin geht Krafttraining nicht.</p>`;
    return `<p class="ek-quelle">${esc(D.VERSIONS.einheit)}, ${esc(D.VERSIONS.schritte)}: Schritte aus dem Ablauf der Einheit (gleiche Zeiten wie TL ≈ und Profil), Ziele aus deinem aktiven Zonenprofil${X.metrik === "rpe" ? `, RPE nach ${esc(D.VERSIONS.rpe)} (eigene Festlegung)` : ""}${X.swim ? `; Schwimmen nach ${esc(SW() ? SW().VERSIONS.einheit : "schwimmeinheit")} (Hilfsmittel, Bahnlänge und Stile aus den Planeinstellungen)` : ""}. Änderungen gehen verschlüsselt über «Direkt speichern»; nach Garmin nur über «Export».</p>`;
  }

  /* ---------- V7.6 Krafttraining (kraft-plan-1.0, js/v76.js) ---------- */
  const kraftEinst = () => (U75() && U75().einstellungen ? U75().einstellungen() : null);
  /** RPE dieses Krafttrainings (Eingabe «rpe», ID «kraft-<Datum>»). */
  function rpeKraft() { try { return (UI().merged("rpe", "rpe") || []).find((r) => r && r.id === "kraft-" + X.ds) || null; } catch (e) { console.error(e); return null; } }
  /** Minuten für sRPE: Dauer der Garmin-Aktivität «Krafttraining» an diesem Tag, sonst die geplante Dauer. */
  function kraftMinuten() {
    const a = V76().aktivitaet(C.D.activities, X.ds);
    return a && (a.mv || a.dur) ? { min: Math.max(1, Math.round((a.mv || a.dur) / 60)), a } : { min: X.e.dauer, a: null };
  }
  function kraftZahlen() {
    const r = rpeKraft(), kv = [[V6().dauerText(X.e.dauer * 60), "Dauer"], [X.e.uhrzeit || "–", "Uhrzeit"], [r && isNum(r.srpe) ? String(r.srpe) : "–", "sRPE"]];
    return `<div class="v73-kv">${kv.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      <p class="hint">${esc(V76().VERSIONS.kraft)}: Krafttraining zählt nicht zu den Wochenstunden und nicht in TL ≈, Fitness und Form, belegt aber seine Zeit am Tag${X.e.kraft_auto ? "; den Tag hat die Seite gewählt (nicht vor einer harten Rad- oder Laufeinheit)" : ""}. sRPE = RPE × Minuten als eigene Zahl.</p>`;
  }
  /** Übungen (Notiz aus den Planeinstellungen), RPE nach der Einheit, «Nur diese Woche» und der Termin. */
  function kraftAbschnitt() {
    const E = kraftEinst(), K = E ? E.kraft : null, D = V76(), h = heute(), out = [];
    out.push(`<section class="v73-ab v76-kraft"><h2 class="abschnitt">${ic("notiz", 15)}Übungen</h2>
      <p class="v76-notiz">${K && K.notiz ? esc(K.notiz) : "Noch keine Notiz – du kannst sie beim Termin in den Planeinstellungen eintragen. Die Seite plant keine Übungen."}</p></section>`);
    if (X.ds <= h) {
      const r = rpeKraft(), w = r && isNum(r.rpe) ? r.rpe : null, m = kraftMinuten();
      const satz = w ? `RPE ${w} × ${r.min} min = sRPE ${r.srpe}${r.quelle === "garmin" ? " (Dauer laut Garmin)" : " (geplante Dauer)"}. Antippen zum Ändern.`
        : `1 = sehr leicht, 10 = maximal (CR-10 nach Foster). sRPE = RPE × ${m.min} min${m.a ? " (Dauer laut Garmin)" : " (geplante Dauer)"}.`;
      out.push(`<section class="v73-ab v76-kraft"><h2 class="abschnitt">${ic("kopf", 15)}Wie anstrengend war es?</h2>
        <div class="v76-rpe" role="group" aria-label="RPE von 1 bis 10">${Array.from({ length: 10 }, (_, k) => `<button type="button" data-v76r="${k + 1}" aria-pressed="${w === k + 1}">${k + 1}</button>`).join("")}</div>
        <p class="hint">${esc(satz)}</p></section>`);
    }
    if (!X.vorbei) {
      const zu = sperre(false);
      out.push(`<section class="v73-ab"><h2 class="abschnitt">${ic("ausnahme", 15)}Nur diese Woche</h2>
        <ul class="v6-aktionen v73-zeilen">
          <li><button type="button" class="v6-zeile v73-zeile" data-v76="tag"${zu ? " disabled" : ""}><span><b>Anderer Tag</b><small>${esc(zu || "innerhalb dieser Woche, ab heute – die Regel bleibt")}</small></span>${ic("weiter", 18)}</button></li>
          <li><button type="button" class="v6-zeile v73-zeile" data-v76="aus"${zu ? " disabled" : ""}><span><b>Auslassen</b><small>${esc(zu || "kein Krafttraining in dieser Woche")}</small></span>${ic("weiter", 18)}</button></li></ul></section>`);
    }
    out.push(`<ul class="v6-aktionen v73-zeilen v76-termin"><li><button type="button" class="v6-zeile v73-zeile" data-v76="termin"><span><b>Termin jede Woche</b>
      <small>${esc(K && D ? D.text(K) : "nicht eingeplant")} – Planeinstellungen</small></span>${ic("weiter", 18)}</button></li></ul>`);
    return out.join("");
  }
  function kraftBinden(sc) {
    sc.querySelectorAll("[data-v76r]").forEach((b) => (b.onclick = () => kraftRpe(+b.dataset.v76r)));
    sc.querySelectorAll("[data-v76]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.v76;
      if (k === "termin") { if (U75() && U75().kraft) U75().kraft({ zurueck: () => { V59().schliessen(); zeichnen(); } }); return; }
      const f = sperre(false); if (f) { melden(f); return; }
      if (k === "tag") { kraftDatumBlatt(); return; }
      if (k === "aus") {
        if (b.dataset.sicher !== "1") { b.dataset.sicher = "1"; b.querySelector("b").textContent = "Wirklich auslassen?"; b.querySelector("small").textContent = "Nochmals tippen"; return; }
        kraftAus();
      }
    }));
  }
  async function kraftRpe(n) {
    const I = UI() && UI().Inbox; if (!I || !I.data) { melden("Speicher auf diesem Gerät nicht verfügbar."); return; }
    if (!Array.isArray(I.data.rpe)) I.data.rpe = [];
    const m = kraftMinuten(), sr = V76().srpe(n, m.min);
    await I.upsert("rpe", { id: "kraft-" + X.ds, act: m.a ? m.a.id : null, datum: X.ds, sport: "kraft", rpe: n, min: m.min, quelle: m.a ? "garmin" : "plan", srpe: sr,
      v: (window.AN && window.AN.VERSIONS && window.AN.VERSIONS.rpe) || "rpe-1.0", kraft: V76().VERSIONS.kraft, erfasst: new Date().toISOString() });
    zeichnen(); melden(`RPE ${n} gespeichert – sRPE ${sr}.`, true);
  }
  /** Eine Ausnahme über die Planeinstellungen (pe-kraft-<Montag>) nur in kommenden Wochen und nur für das Krafttraining aus dem Termin, wenn beide Tage
   *  dem Vorschlag folgen – dann rechnet die Woche mit dem neuen Tag. Sonst (laufende Woche, gespeicherte Tage) über Mein Plan wie jede Einheit. */
  function ueberEinstellung(nach) {
    const mo = V64().montag(X.ds);
    if (mo <= V64().montag(heute()) || !X.e.kraft_plan || !U75() || !U75().speichern) return false;
    const W = X.K.wPlan || X.K.w; if (!W || W.festgehalten) return false;
    const frei = (d) => { const t = W.tage.find((x) => x.date === d); return !!t && !t.bearbeitet && !t.gesperrt; };
    return frei(X.ds) && (!nach || frei(nach));
  }
  function kraftSuchen(ds) {
    try { const K = P().kontextFuer(V64().montag(ds)), t = K.w.tage.find((x) => x.date === ds); return t ? t.einheiten.find((e) => e.kraft_plan) || null : null; }
    catch (e) { console.error(e); return null; }
  }
  async function kraftVerschieben(nach) {
    if (!ueberEinstellung(nach)) return speichern({ art: "verschieben", nach }, `Verschoben auf ${datumKurz(nach)} – nur diese Woche.`);
    const mo = V64().montag(X.ds), E = kraftEinst(), t = E && V76() ? V76().termin(E, mo) : null;
    const f = await U75().speichern("pe-kraft-" + mo, t && nach === t.regel ? { entfernt: true } : { tag: nach, uhrzeit: X.e.uhrzeit || null });
    if (f) { melden(f); return f; }
    if (V59()._ovArt) V59().schliessen();
    Z.ds = nach; const y = kraftSuchen(nach); if (y) Z.uid = y.uid;
    zeichnen(); melden(`Nur diese Woche: ${datumKurz(nach)}`, true);
    return null;
  }
  async function kraftAus() {
    if (!ueberEinstellung(null)) { await speichern({ art: "entfernen" }); return; }
    const f = await U75().speichern("pe-kraft-" + V64().montag(X.ds), { aus: true });
    if (f) { melden(f); return; }
    M.schliessen();
  }
  function kraftDatumBlatt() {
    const mo = V64().montag(X.ds), h = heute(), L = [], E = kraftEinst();
    for (let i = 0; i < 7; i++) {
      const d = V64().addDays(mo, i); if (d < h) continue;
      const t = X.K.w.tage.find((x) => x.date === d), zu = t && t.gesperrt;
      L.push(`<li><button type="button" class="mp-zeile v73-tag${d === X.ds ? " an" : ""}" data-v73d="${d}" ${d === X.ds || zu ? "disabled" : ""}><span class="mp-vt"><b>${esc(tagText(d))}</b><small>${d === X.ds ? "jetzt" : zu ? "gesperrt" : t && t.einheiten.length ? t.einheiten.map((e) => e.titel).join(", ") : "frei"}</small></span>${d === X.ds ? ic("haken", 18) : ic("weiter", 18)}</button></li>`);
    }
    const ov = blatt("v73-datum", `<h2 id="v59-ov-h" tabindex="-1">Nur diese Woche</h2><p class="sub">Krafttraining an einem anderen Tag der KW ${V6().isoWoche(mo)}, ab heute. Die Regel${E && V76() ? ` (${esc(V76().text(E.kraft))})` : ""} bleibt für die anderen Wochen.</p>
      <ul class="mp-wahl">${L.join("")}</ul><p class="warn-t" data-v73f hidden></p>${fuss()}`);
    ov.querySelectorAll("[data-v73d]").forEach((b) => (b.onclick = async () => { const f = await kraftVerschieben(b.dataset.v73d); if (f) fehlerIn(ov, f); }));
  }

  /* ---------- Antippen ---------- */
  function binden() {
    const sc = SEITE.querySelector(".v73-scroll");
    SEITE.querySelectorAll("[data-v73]").forEach((b) => (b.onclick = () => aktion(b.dataset.v73)));
    sc.querySelectorAll("[data-v73b]").forEach((b) => (b.onclick = () => blockBlatt(BL[+b.dataset.v73b])));
    sc.querySelectorAll("[data-v73z]").forEach((b) => (b.onclick = () => zoneBlatt(b.dataset.v73z)));
    sc.querySelectorAll("[data-v73u]").forEach((b) => (b.onclick = () => SWUI() && SWUI().uebungBlatt(b.dataset.v73u, () => V59().schliessen())));
  }
  let LETZT = null;
  function aktion(a) {
    LETZT = a;
    if (a === "warum") return warumBlatt();
    if (a === "verteilung") return verteilungBlatt();
    if (a === "export") return exportBlatt();
    if (X.art !== "plan") return melden("Nur lesen – geändert wird in Enduco bzw. Garmin.");
    if (a === "sperren") { const f = sperre(true); if (f) return melden(f); return speichern({ art: "einheit", felder: { gesperrt: !X.e.gesperrt } }, X.e.gesperrt ? "Entsperrt." : "Gesperrt – bleibt beim Anpassen und Neu berechnen."); }
    const f = sperre(false); if (f) return melden(f);
    if (a === "datum") return X.sport === "kraft" && V76() ? kraftDatumBlatt() : datumBlatt();
    if (a === "zeit") return zeitBlatt();
    if (a === "indoor") return X.e.quelle === "bibliothek" ? melden("Wie im Enduco-Workout.") : indoorBlatt();
    if (a === "metrik") return metrikBlatt();
    if (a === "optionen") return optionenBlatt();
    if (a === "becken") return beckenBlatt();
  }
  /** Änderung anwenden und sichern (V66UI.aendern), dann die Seite neu zeichnen; → Fehlertext oder null. */
  async function speichern(a, ok) {
    const ds = X.ds, mo = V64().montag(ds);
    const f = await U66().aendern(mo, Object.assign({ date: ds, uid: X.uid }, a));
    if (f) { melden(f); return f; }
    if (a.art === "verschieben") Z.ds = a.nach;
    if (V59()._ovArt) V59().schliessen();
    if (a.art === "entfernen") { M.schliessen(); return null; }
    zeichnen();
    if (ok) melden(ok, true);
    return null;
  }
  const fuss = (haupt, zurueck) => `<div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="${zurueck || "Zurück"}">${ic("zurueck", 22)}</button>${haupt || ""}</div>`;
  function blatt(art, html) { return V59().blatt(art, html); }
  const fehlerIn = (ov, f) => { const p = ov.querySelector("[data-v73f]"); if (p) { p.textContent = f || ""; p.hidden = !f; } };

  /* ---------- Blätter: Datum, Uhrzeit, Indoor, Metrik, Bahnlänge ---------- */
  function datumBlatt() {
    const mo = V64().montag(X.ds), h = heute(), L = [];
    for (let i = 0; i < 7; i++) {
      const d = V64().addDays(mo, i); if (d < h) continue;
      const t = X.K.w.tage.find((x) => x.date === d), zu = t && t.gesperrt;
      L.push(`<li><button type="button" class="mp-zeile v73-tag${d === X.ds ? " an" : ""}" data-v73d="${d}" ${d === X.ds || zu ? "disabled" : ""}><span class="mp-vt"><b>${esc(tagText(d))}</b><small>${d === X.ds ? "jetzt" : zu ? "gesperrt" : t && t.einheiten.length ? t.einheiten.map((e) => e.titel).join(", ") : "frei"}</small></span>${d === X.ds ? ic("haken", 18) : ic("weiter", 18)}</button></li>`);
    }
    const ov = blatt("v73-datum", `<h2 id="v59-ov-h" tabindex="-1">Datum wählen</h2><p class="sub">${esc(X.titel)} verschieben – innerhalb der Woche (KW ${V6().isoWoche(mo)}), ab heute.</p>
      <ul class="mp-wahl">${L.join("")}</ul><p class="warn-t" data-v73f hidden></p>${fuss()}`);
    ov.querySelectorAll("[data-v73d]").forEach((b) => (b.onclick = async () => { const f = await speichern({ art: "verschieben", nach: b.dataset.v73d }, `Verschoben auf ${datumKurz(b.dataset.v73d)}.`); if (f) fehlerIn(ov, f); }));
  }
  /** Uhrzeit-Rad: Stunden und Minuten (5er-Schritte) als Spalten zum Wischen, auch mit Pfeiltasten. */
  function rad(name, werte, i) {
    return `<div class="v73-rad-sp" data-rad="${name}" tabindex="0" role="spinbutton" aria-label="${name === "h" ? "Stunde" : "Minute"}" aria-valuemin="0" aria-valuemax="${werte.length - 1}" aria-valuenow="${i}" aria-valuetext="${werte[i]}">
      <div class="v73-rad-pad"></div>${werte.map((w, j) => `<div class="v73-rad-w${j === i ? " an" : ""}">${w}</div>`).join("")}<div class="v73-rad-pad"></div></div>`;
  }
  function zeitBlatt() {
    const [h0, m0] = (X.e.uhrzeit || "07:00").split(":").map(Number);
    const H = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), Mn = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
    const ov = blatt("v73-zeit", `<div class="blatt-titel">${ic("uhr", 34)}<h2 id="v59-ov-h" tabindex="-1">Plane dein Workout ein</h2><p class="sub">Uhrzeit für ${esc(X.titel)} am ${esc(tagText(X.ds))}; sie erscheint im Kalender.</p></div>
      <div class="v73-rad" role="group" aria-label="Uhrzeit">${rad("h", H, h0)}<span class="v73-rad-dp">:</span>${rad("m", Mn, Math.round(m0 / 5) % 12)}<i class="v73-rad-band" aria-hidden="true"></i></div>
      <p class="warn-t" data-v73f hidden></p>
      ${fuss(`${X.e.uhrzeit ? `<button type="button" class="btn" data-v73zeitweg>Ohne Uhrzeit</button>` : ""}<button type="button" class="btn primary gross" data-v73zeitok>Bestätigen</button>`)}`);
    const H_IT = 40;
    ov.querySelectorAll("[data-rad]").forEach((sp) => {
      const n = sp.querySelectorAll(".v73-rad-w").length;
      const wert = () => Math.max(0, Math.min(n - 1, Math.round(sp.scrollTop / H_IT)));
      const markieren = () => { const v = wert(); sp.setAttribute("aria-valuenow", v); sp.setAttribute("aria-valuetext", sp.querySelectorAll(".v73-rad-w")[v].textContent); sp.querySelectorAll(".v73-rad-w").forEach((w, j) => w.classList.toggle("an", j === v)); };
      sp.scrollTop = +sp.getAttribute("aria-valuenow") * H_IT;
      let t = null; sp.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(markieren, 70); }, { passive: true });
      sp.addEventListener("keydown", (ev) => { if (ev.key === "ArrowUp" || ev.key === "ArrowDown") { ev.preventDefault(); sp.scrollTop = Math.max(0, Math.min(n - 1, wert() + (ev.key === "ArrowDown" ? 1 : -1))) * H_IT; markieren(); } });
      sp.querySelectorAll(".v73-rad-w").forEach((w, j) => (w.onclick = () => { sp.scrollTo({ top: j * H_IT, behavior: reduziert() ? "auto" : "smooth" }); }));
    });
    const lesen = (k) => { const sp = ov.querySelector(`[data-rad="${k}"]`); return Math.max(0, Math.round(sp.scrollTop / H_IT)); };
    ov.querySelector("[data-v73zeitok]").onclick = async () => {
      const v = `${String(Math.min(23, lesen("h"))).padStart(2, "0")}:${String(Math.min(11, lesen("m")) * 5).padStart(2, "0")}`;
      const f = await speichern({ art: "einheit", felder: { uhrzeit: v } }, `Eingeplant um ${v}.`); if (f) fehlerIn(ov, f);
    };
    const weg = ov.querySelector("[data-v73zeitweg]"); if (weg) weg.onclick = async () => { const f = await speichern({ art: "einheit", felder: { uhrzeit: null } }, "Uhrzeit entfernt."); if (f) fehlerIn(ov, f); };
  }
  function indoorBlatt() {
    const nach = !X.e.drinnen, rad = X.sport === "rad";
    const was = nach ? (rad ? "auf der Rolle (Indoor)" : "auf dem Laufband (Indoor)") : rad ? "draussen auf der Strasse" : "draussen";
    // V7.5 indoor-phase-1.0: liegt der Tag in deiner Indoor-Phase, gilt «drinnen» von selbst; gespeichert wird nur, was davon abweicht (einheit-felder-1.1)
    const phase = window.V75UI && window.V75UI.indoorAm(X.sport, X.ds), E = window.V75UI ? window.V75UI.einstellungen() : null, p = E && E.indoor[X.sport];
    const ov = blatt("v73-indoor", `<div class="blatt-titel">${ic(nach ? "drinnen" : "draussen", 34)}<h2 id="v59-ov-h" tabindex="-1">Zu ${nach ? "Indoor" : "Outdoor"} ändern?</h2></div>
      <p class="ek-text">${esc(X.titel)} findet dann ${esc(was)} statt. Die Ziele bleiben aus deinem aktiven Zonenprofil – ein eigenes Profil für ${rad ? "die Rolle" : "das Laufband"} gibt es nicht${rad ? "; die Last rechnet weiter mit der LT2 aus dem Zonenprofil" : ""}.</p>
      ${phase && p ? `<p class="hint">Der Tag liegt in deiner Indoor-Phase (${esc(datumKurz(p.von))} bis ${esc(datumKurz(p.bis))}, Planeinstellungen)${nach ? "" : " – diese Einheit bleibt dann draussen, auch wenn du die Phase änderst"}.</p>` : ""}
      <p class="warn-t" data-v73f hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn gross" data-x>Abbrechen</button><button type="button" class="btn primary gross" data-v73ok>Ändern</button></div>`);
    const wert = window.V75UI ? window.V75UI.drinnenFeld(X.sport, X.ds, nach) : (nach ? true : null);
    ov.querySelector("[data-v73ok]").onclick = async () => { const f = await speichern({ art: "einheit", felder: { drinnen: wert } }, nach ? "Indoor." : "Outdoor."); if (f) fehlerIn(ov, f); };
  }
  function metrikBlatt() {
    const D = V73(), L = D.METRIKEN[X.sport] || [], jetzt = X.metrik;
    const SATZ = { leistung: "Ziele in Watt aus deinem Zonenprofil.", pace: X.sport === "schwimm" ? "Tempo je 100 m aus deinem CSS-Test." : "Tempo je Kilometer aus deinem Zonenprofil.",
      puls: "Ziele nach Puls aus den Pulszonen deines Zonenprofils.", rpe: "Nach Gefühl auf der Skala 1–10 (CR-10), ohne Messwert – eigene Zuordnung je Abschnitt." };
    const ov = blatt("v73-metrik", `<div class="blatt-titel">${ic(metIcon(jetzt), 34)}<h2 id="v59-ov-h" tabindex="-1">Trainingsmetrik</h2><p class="sub">Wonach du ${esc(X.titel)} steuerst.</p></div>
      <div class="v73-wahl" role="radiogroup" aria-label="Metrik">${L.map((m) => `<label class="v73-opt"><input type="radio" name="v73m" value="${m}"${m === jetzt ? " checked" : ""}><span>${ic(metIcon(m), 20)}<b>${esc(D.METRIK_NAME[m])}</b><small>${esc(SATZ[m])}</small></span></label>`).join("")}</div>
      <p class="hint">Die Wahl gilt für die Anzeige und für «Export» (${esc(V66().VERSIONS.garmin)}): ${X.sport === "schwimm" ? "mit Pace und CSS-Test Tempo-Ziele auf der Uhr, mit RPE nur der Text in den Schritten" : "Leistung bzw. Tempo und Puls als Bereich auf der Uhr, RPE ohne Ziel mit dem Text in den Schritten"}.</p>
      <p class="warn-t" data-v73f hidden></p>${fuss(`<button type="button" class="btn primary gross" data-v73ok>Auswählen</button>`)}`);
    ov.querySelector("[data-v73ok]").onclick = async () => {
      const v = (ov.querySelector("input[name=v73m]:checked") || {}).value; if (!v) return;
      const f = await speichern({ art: "einheit", felder: { metrik: v === L[0] ? null : v } }, `Metrik: ${D.METRIK_NAME[v]}.`); if (f) fehlerIn(ov, f);
    };
  }
  /** V7.5 einheit-felder-1.1: Bahnlänge dieser Einheit; den Standard stellst du in den Planeinstellungen ein. Gleich wie der Standard = Feld entfernt. */
  function beckenBlatt() {
    if (!SWUI()) return;
    const std = SWUI().becken(), p = X.pool || std;
    const ov = blatt("v73-becken", `<div class="blatt-titel">${ic("becken", 34)}<h2 id="v59-ov-h" tabindex="-1">Bahnlänge</h2><p class="sub">Für ${esc(X.titel)} am ${esc(tagText(X.ds))}. Standard: ${std} m (Planeinstellungen).</p></div>
      <div class="v73-wahl">${[25, 50].map((m) => `<button type="button" class="v73-opt knopf${m === p ? " an" : ""}" data-v73pool="${m}" aria-pressed="${m === p}"><span>${ic("becken", 20)}<b>${m} m${m === std ? " · Standard" : ""}</b><small>${m === 50 ? "Langbahn: Übungen über eine halbe Bahn, dann die Bahn locker beenden" : "Kurzbahn: Übungen über eine ganze Bahn"}</small></span></button>`).join("")}</div>
      <p class="warn-t" data-v73f hidden></p>${fuss()}`);
    ov.querySelectorAll("[data-v73pool]").forEach((b) => (b.onclick = async () => {
      const m = +b.dataset.v73pool; if (m === p) { V59().schliessen(); return; }
      const f = await speichern({ art: "einheit", felder: { pool: m === std ? null : m } }, `Bahnlänge ${m} m.`); if (f) fehlerIn(ov, f);
    }));
  }

  /* ---------- Workout bearbeiten (Optionen) ---------- */
  function hatIntervalle() { return !X.swim && X.e.quelle !== "bibliothek" && Array.isArray(X.e.teile) && X.e.teile.some(([k]) => ["z3", "z3o", "vo2", "css", "renntempo"].includes(k)) && X.e.art !== "test"; }
  const einfahrenMin = () => { if (isNum(X.e.ein_min)) return X.e.ein_min; let m = 0; for (const [k, v] of X.e.teile || []) { if (["z3", "z3o", "vo2", "css", "renntempo"].includes(k)) break; m += v; } return Math.round(m); };
  function optionenBlatt() {
    const e = X.e, B = e.quelle === "bibliothek" ? null : V66().bereich(e.vorlage || e.id), iv = hatIntervalle();
    const zeile = (k, titel, wert, satz, an) => `<li><button type="button" class="v6-zeile v73-zeile" data-v73o="${k}"${an ? "" : " disabled"}><span><b>${esc(titel)}</b><small>${esc(satz)}</small></span><em>${esc(wert)}</em>${ic("weiter", 18)}</button></li>`;
    const dauerSatz = B && !B.fest ? `${V6().dauerText(B.min * 60)} bis ${V6().dauerText(B.max * 60)}` : e.quelle === "bibliothek" ? "wie im Enduco-Workout" : "feste Dauer";
    const ov = blatt("v73-optionen", `<div class="blatt-titel">${ic("regler", 34)}<h2 id="v59-ov-h" tabindex="-1">Workout bearbeiten</h2><p class="sub">${esc(X.titel)} · ${esc(tagText(X.ds))}</p></div>
      <ul class="v6-aktionen v73-zeilen">
        ${zeile("dauer", "Trainingsdauer", V6().dauerText(e.dauer * 60), dauerSatz, !!(B && !B.fest))}
        ${zeile("ein", "Warm-up-Dauer", `${einfahrenMin()} min`, iv ? "Locker bis zum ersten Intervall (5–40 min)" : "nur bei Einheiten mit Intervallen", iv)}
        ${zeile("pausen", "Intervall-Intensität", `${isNum(e.pausen) ? e.pausen : 50} %`, iv ? "steuert die Pausenlänge zwischen den Intervallen" : "nur bei Einheiten mit Intervallen", iv)}
        <li><button type="button" class="v6-zeile v73-zeile v73-loeschen" data-v73o="weg"><span><b>Löschen</b><small>Einheit aus Mein Plan entfernen</small></span>${ic("loeschen", 18)}</button></li></ul>
      <p class="warn-t" data-v73f hidden></p>${fuss()}`);
    ov.querySelectorAll("[data-v73o]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.v73o;
      if (k === "weg") {
        if (b.dataset.sicher !== "1") { b.dataset.sicher = "1"; b.querySelector("b").textContent = "Wirklich löschen?"; b.querySelector("small").textContent = "Nochmals tippen zum Entfernen"; return; }
        speichern({ art: "entfernen" }).then((f) => f && fehlerIn(ov, f));
        return;
      }
      reglerBlatt(k);
    }));
  }
  /** Regler-Blatt für Dauer, Warm-up oder Intervall-Intensität, mit Vorschau (Dauer, TL ≈, Distanz ≈, Pausen). */
  function reglerBlatt(k) {
    const e = X.e, B = V66().bereich(e.vorlage || e.id);
    const R = k === "dauer" ? { min: B.min, max: B.max, step: 5, wert: e.dauer, titel: "Trainingsdauer", fmt: (v) => V6().dauerText(v * 60) }
      : k === "ein" ? { min: 5, max: 40, step: 5, wert: einfahrenMin(), titel: "Warm-up-Dauer", fmt: (v) => `${v} min` }
        : { min: 0, max: 100, step: 10, wert: isNum(e.pausen) ? e.pausen : 50, titel: "Intervall-Intensität", fmt: (v) => `${v} %` };
    R.wert = Math.max(R.min, Math.min(R.max, Math.round(R.wert / R.step) * R.step));
    const erkl = k === "pausen" ? "50 % = Pausen wie in der Vorlage. Höher = kürzere Pausen (bis halb so lang), tiefer = längere Pausen (bis 1,5-mal so lang). Die Intervalle selbst bleiben gleich (eigene Festlegung, einheit-anpassen-1.0)."
      : k === "ein" ? "Die Zeit vor dem ersten Intervall: zuerst locker (Z1), der Rest in der Grundlage (Z2). Die Gesamtdauer ändert sich mit." : "Schlüsseleinheiten werden mit lockerer Grundlage verlängert; unter der vollen Fassung gilt die kurze.";
    const ov = blatt("v73-regler", `<h2 id="v59-ov-h" tabindex="-1">${esc(R.titel)}</h2><p class="sub">${esc(X.titel)}</p>
      <label class="mp-dauer v73-regler"><span>${esc(R.titel)}</span><input type="range" min="${R.min}" max="${R.max}" step="${R.step}" value="${R.wert}" data-v73r aria-label="${esc(R.titel)}"><output data-v73ro>${esc(R.fmt(R.wert))}</output></label>
      <p class="mp-schaetz" data-v73rv></p><p class="hint">${esc(erkl)}</p><p class="warn-t" data-v73f hidden></p>
      ${fuss(`<button type="button" class="btn primary gross" data-v73ok>Übernehmen</button>`)}`);
    const sl = ov.querySelector("[data-v73r]"), out = ov.querySelector("[data-v73ro]"), vor = ov.querySelector("[data-v73rv]");
    const probe = (v) => {
      const s = { uid: "x", vorlage: e.vorlage || e.id, dauer: k === "dauer" ? v : e.dauer, quelle: "eigen", drinnen: e.drinnen, ein_min: k === "ein" ? v : e.ein_min, pausen: k === "pausen" ? (v === 50 ? null : v) : e.pausen };
      return V66().einheit(s, X.K.ctxE);
    };
    const zeig = () => {
      const v = +sl.value; out.textContent = R.fmt(v);
      const n = probe(v); if (!n) { vor.textContent = ""; return; }
      const S = V66().schaetzung(n, V66().bezug(X.sk, X.css));
      const p = (n.teile || []).filter(([kk], i, T) => (kk === "pause" || kk === "z1") && i > 0 && i < T.length - 1 && T.slice(0, i).some(([q]) => ["z3", "z3o", "vo2", "css", "renntempo"].includes(q)) && T.slice(i + 1).some(([q]) => ["z3", "z3o", "vo2", "css", "renntempo"].includes(q)));
      vor.textContent = [`Dauer ${V6().dauerText(n.dauer * 60)}`, isNum(S.tl) ? `TL ≈ ${S.vollstaendig ? "" : "mind. "}${S.tl}` : "", isNum(S.km) && S.km > 0 ? `≈ ${komma(S.km)} km` : "",
        k === "pausen" && p.length ? `Pause ${V73().dauerKurz(Math.round(p[0][1] * 60))}` : ""].filter(Boolean).join(" · ");
    };
    sl.oninput = zeig; zeig();
    ov.querySelector("[data-v73ok]").onclick = async () => {
      const v = +sl.value;
      const a = k === "dauer" ? { art: "dauer", dauer: v } : { art: "einheit", felder: k === "ein" ? { ein_min: v } : { pausen: v === 50 ? null : v } };
      const f = await speichern(a, `${R.titel}: ${R.fmt(v)}.`); if (f) fehlerIn(ov, f);
    };
  }

  /* ---------- Erklär-Blätter: Block, Zone, Verteilung, Warum ---------- */
  function blockBlatt(b) {
    if (!b) return;
    const D = V73(), flach = D.flach([b]), dauer = D.dauer([b]), m = D.strecke([b]);
    const hk = flach.map((s) => v6Key(s)).sort((x, y) => (V6().ZONEN[y] || {}).stufe - (V6().ZONEN[x] || {}).stufe)[0];
    const satz = b.beschreibung || (X.sport === "schwimm" && flach.some((s) => s.art === "technik") ? D.BLOCK_TEXT.technik
      : ["vo2", "z5", "anaerob", "neuro", "sprint"].includes(hk) ? D.BLOCK_TEXT.vo2 : ["z4", "sweet"].includes(hk) ? D.BLOCK_TEXT.z3o : hk === "z3" ? D.BLOCK_TEXT.z3
        : "Gleichmässig und ruhig: die Wiederholungen sollen sich gleich anfühlen; in den Pausen locker bleiben.");
    const ov = blatt("v73-block", `<p class="v73-ueber klein">${b.wdh} × Wiederholung</p><h2 id="v59-ov-h" tabindex="-1" class="v73-blatt-h">${esc(b.name)}</h2>
      <div class="kv ek-kv"><div><b>${b.wdh} ×</b><span>Wiederholungen</span></div>${isNum(dauer) ? `<div><b>${esc(V6().dauerText(dauer))}</b><span>Block</span></div>` : ""}${m ? `<div><b>${m.toLocaleString("de-CH")} m</b><span>Strecke</span></div>` : ""}</div>
      <p class="ek-text">${esc(satz)}</p>${b.ohneLetzte ? `<p class="hint">Nach der letzten Wiederholung folgt keine Erholung.</p>` : ""}
      <h3 class="abschnitt">Schritte des Blocks</h3><ol class="v73-schritte">${b.schritte.map((k) => knotenHTML(k, 1)).join("")}</ol>${fuss()}`);
    ov.querySelectorAll("[data-v73b]").forEach((x) => (x.onclick = () => blockBlatt(BL[+x.dataset.v73b])));
    ov.querySelectorAll("[data-v73u]").forEach((x) => (x.onclick = () => SWUI() && SWUI().uebungBlatt(x.dataset.v73u, () => blockBlatt(b))));
  }
  function zoneBlatt(k) {
    const W = V6(), z = W.ZONEN[k] || W.ZONEN.offen, nr = Math.min(5, Math.max(1, Math.floor(z.stufe || 1)));
    const met = X.art === "plan" && !X.wo ? X.metrik : X.sport === "rad" ? "leistung" : "pace";
    const b = V73().zonenBereich(nr, X.sport, X.sk, X.css, met, mmss);
    blatt("v73-zone", `<div class="blatt-titel"><span class="v73-zpunkt" style="--zc:${z.farbe}"></span><h2 id="v59-ov-h" tabindex="-1">${esc(z.kurz ? z.kurz + " · " : "")}${esc(z.name)}</h2>${b ? `<p class="sub">Zone ${nr}: ${esc(b)}</p>` : ""}</div>
      <p class="ek-text">${esc(ZONE_INFO[k] || ZONE_INFO.offen)}</p><p class="hint">Grenzen aus deinem aktiven Zonenprofil (Laktat-Stufentest; Schwimmen aus dem CSS-Test).</p>
      ${fuss(`<button type="button" class="btn primary gross" data-wissen="zonen">Im Wissen nachlesen</button>`)}`);
  }
  function verteilungBlatt() {
    blatt("v73-verteilung", `<div class="blatt-titel">${ic("status", 34)}<h2 id="v59-ov-h" tabindex="-1">Intensitätsverteilung</h2></div>
      <p class="ek-text">Wie viel Zeit diese Einheit in jeder Zone verbringt – aus ihren Schritten gerechnet, Pausen zählen zu Zone 1. Die Bereiche stammen aus deinem aktiven Zonenprofil (Leistung, Tempo oder Puls je nach Metrik).</p>
      <p class="ek-text">Über die Woche zählt die Mischung: viel locker, wenig hart, je nach Modell mit oder ohne mittleren Anteil. Eine einzelne harte Einheit ist darum kein Widerspruch zu einem lockeren Plan.</p>
      ${fuss(`<button type="button" class="btn primary gross" data-wissen="tid">Im Wissen nachlesen</button>`)}`);
  }
  function warumBlatt() {
    const e = X.e, Q = WS() && WS().QUELLEN ? WS().QUELLEN : {};
    const li = (id) => { const q = Q[id]; if (!q) return ""; const l = WS().link ? WS().link(id) : null; return `<li>${l ? `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(q.zit)}</a>` : `<b>${esc(q.zit)}</b>`} – ${esc(q.kern)}</li>`; };
    blatt("v73-warum", `<h2 id="v59-ov-h" tabindex="-1">Warum diese Einheit</h2><p class="ek-text">${esc(e.zweck || "")}</p>
      ${(e.quellen || []).length ? `<ul class="mo-quellen">${e.quellen.map(li).join("")}</ul>` : ""}
      ${e.ablauf && e.ablauf.length ? `<h3 class="abschnitt">Ablauf in Kürze</h3><ul class="mo-ablauf">${e.ablauf.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <p class="ek-quelle">Vorschlag nach ${esc(V64().VERSIONS.woche)} und ${esc(V64().VERSIONS.modell)}; nur ein Vorschlag – geändert wird nichts in Garmin oder Enduco.</p>
      ${fuss(e.wissen ? `<button type="button" class="btn primary gross" data-wissen="${esc(e.wissen)}">Im Wissen nachlesen</button>` : "")}`);
  }

  /* ---------- Export: An Garmin senden, nur diese Einheit (garmin-senden-1.0 mit Auswahl; 1.1 Schwimmen, Puls, RPE) ---------- */
  /** Was an Garmin geht, in Worten (garmin-senden-1.1): Ziele je Metrik, beim Schwimmen Bahnen, Übungen, Pausen und CSS. → [Hinweis, CSS-Hinweis] */
  function exportText(e, ds) {
    if (e.quelle === "bibliothek") return ["das Enduco-Workout wird nur eingeplant", ""];
    const V = V66(), m = V.metrikVon(e);
    if (e.sport === "schwimm") {
      let w = null; try { w = V.garminWorkout(e, X.sk, Object.assign({ date: ds, uid: e.uid }, U66().swOpt(ds, X.K))); } catch (err) { console.error(err); }
      if (!w || w.fehler) return [`als Workout «IN · ${e.titel}»`, ""];
      const css = X.css, satz = `als Workout «IN · ${e.titel}»: ${w.meter} m im ${w.workout.poolLength}-m-Becken mit Übungen${w.workout.poolLength === 50 ? " («½ L … Bahn locker beenden»)" : ""} und Pausen am Beckenrand`;
      if (w.css) return [`${satz}; Tempo-Ziele aus deinem CSS-Test (${mmss(css)}/100 m), dazu das Tempo im Text`,
        `Die Uhr rechnet die Tempo-Ziele mit ihrer eigenen CSS. Die Seite kann sie nicht lesen und schreibt sie nie nach Garmin – trag auf der Uhr bzw. in Garmin Connect dieselbe CSS ein (${mmss(css)}/100 m).`];
      return [`${satz}; ${m === "rpe" && isNum(css) ? "nach Anstrengung (RPE), wie gewählt" : "noch ohne CSS-Test: nach Anstrengung (RPE) im Text der Schritte"}`, ""];
    }
    const ziel = { leistung: "Leistung aus deinem Zonenprofil", pace: "Tempo aus deinem Zonenprofil", puls: "Puls aus deinem Zonenprofil (eigener Bereich in bpm)", rpe: "ohne Ziele, mit RPE im Text" }[m];
    return [`als Workout «IN · ${e.titel}» – ${m === "rpe" ? ziel : "Ziele nach " + ziel}`, ""];
  }
  function exportBlatt() {
    if (X.art !== "plan" || X.vorbei) return;
    const e = X.e, ds = X.ds, G = U66(), V = V66(), grund = V.garminGrund(e);
    const A = G.auftrag(ds), a = A && A.a, g = G.gesendet().find((x) => x && x.uid === e.uid && x.date === ds && !x.entfernt);
    let stand = null; try { stand = V.garminStand(e, ds, X.sk, G.gesendet(), a && (A.lokal ? Object.assign({ status: "offen" }, a) : a), G.swOpt(ds, X.K)); } catch (err) { console.error(err); }
    const zeit = (iso) => { try { return new Date(iso).toLocaleString("de-CH", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (err) { return iso; } };
    const zeilen = [];
    if (stand === "gesendet") zeilen.push(`<p class="v73-stand ok" role="status">${ic("haken", 18)}In Garmin${g && g.gesendet ? ` · gesendet ${esc(zeit(g.gesendet))}` : ""}.</p>`);
    if (stand === "geaendert") zeilen.push(`<p class="v73-stand warn" role="status">${ic("trend", 18)}In Garmin, aber seither geändert – die neue Fassung ersetzt die alte beim nächsten Senden.</p>`);
    if (stand === "wartet") zeilen.push(`<p class="v73-stand" role="status">${ic("uhr", 18)}Wird gesendet: ${a.modus === "auto" ? "am Vortag ab 23 Uhr (Änderungen bis dahin kommen mit)" : "mit dem nächsten Nacht-Update (gegen 23 Uhr)"}.</p>`);
    if (a && !A.lokal && a.status === "fehler") { const fe = (a.fehler || []).filter((x) => String(x).startsWith(e.titel) || String(x).includes(e.uid)); if (fe.length) zeilen.push(`<p class="warn-t">Nicht gesendet: ${esc(fe.join("; "))}</p>`); }
    const ab = (C.D.garmin_abgelehnt || []).filter((x) => x && x.id === "gs-" + ds && (!a || String(x.erstellt || "") >= String(a.erstellt || ""))).pop();
    if (ab) zeilen.push(`<p class="warn-t">Auftrag abgelehnt: ${esc(ab.grund)}</p>`);
    let knoepfe = "", hinweis = "", cssHinweis = "";
    const fenster = G.garminFenster(ds), zuSpaet = ds === heute() || (ds === V64().addDays(heute(), 1) && G.nachtGelaufen() && stand !== "gesendet");
    if (grund) hinweis = `Diese Einheit geht nicht an Garmin: ${grund}.`;
    else if (ds === heute()) hinweis = "Für heute geht es nur noch im Chat («schick die Einheit von heute an Garmin»).";
    else if (zuSpaet) hinweis = "Das Nacht-Update ist heute schon gelaufen – für morgen geht es nur noch im Chat.";
    else if (!fenster) hinweis = "Senden geht ab einer Woche vorher.";
    else {
      const auto = a && a.modus === "auto" && (A.lokal || a.status === "offen");
      knoepfe = `${stand !== "wartet" || auto ? `<div class="v73-wahl" role="radiogroup" aria-label="Wann senden"><label class="v73-opt"><input type="radio" name="v73g" value="senden" ${auto ? "" : "checked"}><span>${ic("play", 20)}<b>Mit dem nächsten Nacht-Update</b><small>gegen 23 Uhr; aufs Gerät beim Synchronisieren</small></span></label>
          <label class="v73-opt"><input type="radio" name="v73g" value="auto" ${auto ? "checked" : ""}><span>${ic("uhr", 20)}<b>Am Vortag um 23 Uhr</b><small>Änderungen bis dahin werden mitgenommen</small></span></label></div>` : ""}`;
      const [was, cssT] = exportText(e, ds);
      hinweis = `${V.VERSIONS.garmin}: ${was}. Andere Einheiten des Tages bleiben, wie sie in Garmin sind. Enduco bleibt unberührt.`;
      cssHinweis = cssT;
    }
    const kann = !grund && fenster && !zuSpaet;
    const haupt = kann && (stand !== "wartet" || (a && a.modus === "auto")) ? `<button type="button" class="btn primary gross" data-v73gs>${stand === "gesendet" ? "Nochmals senden" : "Senden"} ${ic("play", 18)}</button>` : "";
    const weg = kann && (g || stand === "wartet") ? `<button type="button" class="btn" data-v73gweg>${g ? "Aus Garmin austragen" : "Nicht senden"}</button>` : "";
    const ov = blatt("v73-export", `<div class="blatt-titel">${ic("play", 34)}<h2 id="v59-ov-h" tabindex="-1">An Garmin senden</h2><p class="sub">${esc(e.titel)} · ${esc(tagText(ds))}</p></div>
      ${zeilen.join("")}${knoepfe}<p class="hint">${esc(hinweis)}</p>${cssHinweis ? `<p class="hint keep">${esc(cssHinweis)}</p>` : ""}<p class="warn-t" data-v73f hidden></p>
      ${fuss(`${weg}${haupt}`)}`);
    const los = async (weg) => {
      const modus = weg ? (a && a.modus === "auto" ? "auto" : "senden") : ((ov.querySelector("input[name=v73g]:checked") || {}).value || "senden");
      const f = await U66().einheitSenden(ds, e.uid, modus, !!weg);
      if (f) return fehlerIn(ov, f);
      V59().schliessen(); zeichnen();
      melden(weg ? "Wird aus Garmin ausgetragen (nächstes Nacht-Update)." : modus === "auto" ? "Wird am Vortag um 23 Uhr gesendet." : "Wird mit dem nächsten Nacht-Update gesendet.", true);
    };
    const b1 = ov.querySelector("[data-v73gs]"); if (b1) b1.onclick = () => los(false);
    const b2 = ov.querySelector("[data-v73gweg]"); if (b2) b2.onclick = () => los(true);
  }

  // Die Seite folgt Änderungen aus anderen Teilen (z. B. «Direkt speichern» im Hintergrund)
  document.addEventListener("meinplan", () => { if (M.offen() && X && X.art === "plan" && !V59()._ovArt) { try { zeichnen(); } catch (e) { console.error(e); } } });
})();
