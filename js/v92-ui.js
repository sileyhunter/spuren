/* Ironman Notebook V9.2 – Auftrag «Woche wie Enduco», Etappe W1 (docs/auftrag-enduco-woche.md), Oberfläche:
   - woche-einstellen-1.0: EIN Blatt für Zeiten, Sportarten und Sperren der Woche (statt «Trainingsverfügbarkeit der ganzen Woche»): je Tag Wochentag und Datum,
     Zeitregler (0 = kein Training bis 5 h in 15-min-Schritten, ganz rechts «offen»), Sportarten Schwimmen · Rad · Laufen, Schloss; Zustand des Tages
     (Standard · von Hand · gesperrt) und «Zurück auf Standard»; «nur diese Woche» oder «jede Woche so». Speichern → einmal umplanen → Bericht.
     Im Bearbeiten-Modus gehört alles zum Entwurf (✓ speichert, ✕ verwirft, ↶/↷ Schritt für Schritt).
   - fehlt-zeit-1.0: die Frage als Blatt («Die Woche geht nicht auf …») mit je einem Knopf je Tag (kleinstes nötiges Mehr) und «verteilt», dazu «Nein, so lassen».
   - umplanen-1.0: Bericht nach dem Umplanen oben im Kalender (bleibt bis zum Wegwischen): was sich geändert hat, Wochenlast vorher → nachher, was fehlt,
     ↶ Rückgängig (Woche und Verfügbarkeit), Details, «Ausgleichen» bei gestrichenen Einheiten unter dem Wochenbereich.
   Texte eigen, Symbole der Seite. Rechnet nichts selbst: Kern in js/v66.js (V66 «umplanen»), Hilfen in js/v92.js, Speichern über V66UI.planen. */
(function () {
  "use strict";
  const N = (window.V92UI = window.V92UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V66 = () => window.V66, V92 = () => window.V92, P = () => window.V64UI, M = () => window.V66UI, V59 = () => window.V59;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const spFarbe = (sp) => `var(--sp-${["rad", "lauf", "schwimm"].includes(sp) ? sp : "andere"})`;
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && V66() && V92() && V6() && P() && P().kontextFuer && M() && M().planen); };
  const heute = () => C.iso(C.today);
  const add = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const montag = (s) => add(s, -((new Date(s + "T12:00:00Z").getUTCDay() + 6) % 7));
  const dkurz = (s) => { const [, m, d] = s.split("-"); return `${+d}.${+m}.`; };
  const SP = ["schwimm", "rad", "lauf"], SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  const STD_MAX = 20;                                                       // 20 × 15 min = 5 h (woche-einstellen-1.0)
  const imEnt = () => !!(M() && M().imEntwurf && M().imEntwurf());

  /* ---------------- woche-einstellen-1.0 ---------------- */
  /** Blatt «Woche einstellen» für die Woche mo. opt = { zurueck, standard: true (aus den Planeinstellungen: «jede Woche so» vorgewählt) } */
  N.wocheEinstellen = function (mo, opt) {
    if (!bereit()) return;
    opt = opt || {};
    mo = montag(mo || heute());
    const W = V6(), K = P().kontextFuer(mo); if (!K) return;
    const verf = K.verf || (P().verfuegbarkeit ? P().verfuegbarkeit() : null), E = P().planEintrag(mo), h = heute();
    const std = (wt) => { const e = verf && verf.eintrag ? verf.eintrag("vf-wt-" + wt) : null; return e && !e.entfernt ? { min: e.min == null ? null : e.min, sport: Array.isArray(e.sport) ? e.sport.slice() : null } : null; };
    const zeilen = Array.from({ length: 7 }, (_, i) => {
      const d = add(mo, i), v = verf ? verf(d) : null, t = E && E.tage ? E.tage[d] : null, kw = (K.w.tage.find((x) => x.date === d) || {});
      const kein = !!v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length));
      const te = verf && verf.eintrag ? verf.eintrag("vf-" + d) : null;
      return { date: d, vorbei: d < h, rennen: !!kw.rennen, zustand: V92().zustand(verf, d, t), hand: !!(te && !te.entfernt), gesperrt: !!(t && t.gesperrt), gesperrt0: !!(t && t.gesperrt), einheitGesperrt: !!(t && Array.isArray(t.einheiten) && t.einheiten.some((s) => s && s.gesperrt)),
        min: kein ? 0 : v && isNum(v.min) ? v.min : null, sport: !kein && v && Array.isArray(v.sport) && v.sport.length ? SP.filter((x) => v.sport.includes(x)) : SP.slice(), geaendert: false, zurueck: false };
    });
    const S = { modus: opt.standard ? "standard" : "woche" };
    const maxI = (z) => Math.max(STD_MAX, z.min != null ? Math.ceil(z.min / 15) : 0), idx = (z) => (z.min == null ? maxI(z) + 1 : Math.round(z.min / 15));
    const wert = (z) => (z.min == null ? "offen" : z.min === 0 ? "Kein Training" : V92().dauer(z.min));
    // Zustand des Tages (Silas 22.11.: «gleiche dort ab, wie es dargestellt ist»): gesperrt · von Hand · Standard – so, wie er nach dem Speichern gilt
    const zustandText = (z) => (z.gesperrt || z.einheitGesperrt ? "gesperrt" : z.zurueck || S.modus === "standard" ? "Standard" : z.geaendert || z.hand ? "von Hand" : "Standard");
    const zeile = (z, i) => {
      const aus = z.vorbei || z.rennen;
      return `<li class="we-tag${z.min === 0 ? " aus" : ""}${aus ? " vorbei" : ""}" data-we="${i}">
        <div class="we-kopf"><b id="we-t${i}">${esc(V92().tag(z.date))} <small>${esc(dkurz(z.date))}</small></b>
          <span class="we-zst" data-wezst>${esc(zustandText(z))}</span><em data-wewert>${esc(wert(z))}</em>
          <button type="button" class="we-lock" data-welock aria-pressed="${z.gesperrt}" aria-label="${esc(V92().tag(z.date))} sperren" ${aus || z.einheitGesperrt ? "disabled" : ""}>${W.icon("schloss", 16)}</button></div>
        ${aus ? `<p class="hint we-hint">${z.rennen ? "Renntag – bleibt, wie er ist." : "Vergangen – nur lesen."}</p>` : `<div class="we-zeile">
          <span class="we-sp" role="group" aria-labelledby="we-t${i}">${SP.map((x) => `<button type="button" class="vw-chip" data-wesp="${x}" aria-pressed="${z.sport.includes(x)}" aria-label="${SPW[x]}" style="--sp:${spFarbe(x)}" ${z.min === 0 ? "disabled" : ""}>${W.sportIcon(x, 17)}<i aria-hidden="true">${W.icon("haken", 11)}</i></button>`).join("")}</span>
          <input type="range" class="we-r" min="0" max="${maxI(z) + 1}" step="1" value="${idx(z)}" data-wer aria-label="${esc(V92().tag(z.date))}: Trainingszeit, ganz links kein Training, ganz rechts offen" aria-valuetext="${esc(wert(z))}"></div>
          <button type="button" class="btn klein we-std" data-westd ${z.hand && S.modus === "woche" && !z.zurueck ? "" : "hidden"}>Zurück auf Standard</button>`}</li>`;
    };
    const html = `<div class="blatt-titel">${W.icon("kalender", 30)}<h2 id="v59-ov-h" tabindex="-1">Woche einstellen</h2>
        <p class="sub">KW ${W.isoWoche(mo)} · ${esc(dkurz(mo))}–${esc(dkurz(add(mo, 6)))}${imEnt() ? " · im Entwurf (✓ speichert)" : ""}</p></div>
      <div class="row we-modus" role="radiogroup" aria-label="Gilt für"><button type="button" class="chip" role="radio" data-wemod="woche" aria-checked="${S.modus === "woche"}" aria-pressed="${S.modus === "woche"}">nur diese Woche</button>
        <button type="button" class="chip" role="radio" data-wemod="standard" aria-checked="${S.modus === "standard"}" aria-pressed="${S.modus === "standard"}">jede Woche so</button></div>
      <ul class="we-liste">${zeilen.map(zeile).join("")}</ul>
      <p class="hint">${esc(V92().VERSIONS.woche)}: Zeit = höchstens so viel trainiert die Seite an diesem Tag (harte Grenze), Sportarten = nur diese plant sie dort. «Von Hand» gilt nur an diesem Tag und
        bleibt, bis du ihn «Zurück auf Standard» stellst; «Standard» ist deine Zeit für diesen Wochentag. Das Schloss hält einen Tag fest: dort ändert sich beim Umplanen nichts.
        Beim Speichern rechnet die Seite die ganze Woche einmal neu (${esc(V66().VERSIONS.umplanen)}); was nicht mehr passt, kommt an einen anderen Tag – fehlt Zeit, fragt sie.</p>
      <p class="warn-t" data-wefehler hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn" data-wez>${W.icon("zurueck", 16)} Abbrechen</button><button type="button" class="btn primary gross" data-weok>${W.icon("haken", 18)} ${imEnt() ? "Übernehmen" : "Speichern"}</button></div>`;
    const ov = V59().blatt("we-blatt", html);
    const zeig = (li, z) => {
      li.querySelector("[data-wewert]").textContent = wert(z);
      li.classList.toggle("aus", z.min === 0);
      const zs = li.querySelector("[data-wezst]"); if (zs) zs.textContent = zustandText(z);
      li.querySelectorAll("[data-wesp]").forEach((b) => { b.disabled = z.min === 0; b.setAttribute("aria-pressed", String(z.sport.includes(b.dataset.wesp))); });
      const r = li.querySelector("[data-wer]"); if (r) r.setAttribute("aria-valuetext", wert(z));
      const st = li.querySelector("[data-westd]"); if (st) st.hidden = !(z.hand && S.modus === "woche" && !z.zurueck);
      const lk = li.querySelector("[data-welock]"); if (lk) lk.setAttribute("aria-pressed", String(z.gesperrt));
    };
    ov.querySelectorAll("[data-we]").forEach((li) => {
      const z = zeilen[+li.dataset.we]; if (z.vorbei || z.rennen) return;
      const r = li.querySelector("[data-wer]");
      r.oninput = () => { const i = +r.value, m = maxI(z); z.min = i > m ? null : i * 15; z.geaendert = true; z.zurueck = false; zeig(li, z); };
      li.querySelectorAll("[data-wesp]").forEach((b) => (b.onclick = () => {
        const x = b.dataset.wesp, drin = z.sport.includes(x);
        if (drin && z.sport.length === 1) { fehler("Mindestens eine Sportart – für keinen Sport den Regler ganz nach links."); return; }
        z.sport = drin ? z.sport.filter((y) => y !== x) : SP.filter((y) => y === x || z.sport.includes(y)); z.geaendert = true; z.zurueck = false; fehler(""); zeig(li, z);
      }));
      const lk = li.querySelector("[data-welock]"); if (lk) lk.onclick = () => { z.gesperrt = !z.gesperrt; zeig(li, z); };
      const st = li.querySelector("[data-westd]"); if (st) st.onclick = () => {
        const s0 = std(V66().wtNr(z.date)); z.zurueck = true; z.geaendert = false;
        z.min = s0 ? (s0.min === 0 || (Array.isArray(s0.sport) && !s0.sport.length) ? 0 : s0.min) : null; z.sport = s0 && Array.isArray(s0.sport) && s0.sport.length ? SP.filter((x) => s0.sport.includes(x)) : SP.slice();
        const r2 = li.querySelector("[data-wer]"), m = maxI(z); if (r2) { r2.max = String(m + 1); r2.value = String(z.min == null ? m + 1 : Math.round(z.min / 15)); }
        zeig(li, z);
      };
    });
    ov.querySelectorAll("[data-wemod]").forEach((b) => (b.onclick = () => {
      S.modus = b.dataset.wemod;
      ov.querySelectorAll("[data-wemod]").forEach((x) => { const an = x === b; x.setAttribute("aria-checked", String(an)); x.setAttribute("aria-pressed", String(an)); });
      ov.querySelectorAll("[data-we]").forEach((li) => { const z = zeilen[+li.dataset.we]; if (!z.vorbei && !z.rennen) zeig(li, z); });
    }));
    const fehler = (t) => { const p = ov.querySelector("[data-wefehler]"); p.textContent = t || ""; p.hidden = !t; };
    const weiter = () => (opt.zurueck ? opt.zurueck() : V59().schliessen());
    ov.querySelector("[data-wez]").onclick = weiter;
    ov.querySelector("[data-weok]").onclick = async (ev) => {
      const offen = zeilen.filter((z) => !z.vorbei && !z.rennen);
      // im Modus «jede Woche so» gelten alle Zeilen der Woche als Standard (auch unveränderte), sonst nur die geänderten
      const L = S.modus === "standard" ? offen : offen.filter((z) => z.geaendert || z.zurueck);
      const alt = (id) => (verf && verf.eintrag ? verf.eintrag(id) : null), jetzt = new Date().toISOString();
      const eintr = V92().eintraege(L.map((z) => ({ date: z.date, min: z.min, sport: z.min === 0 ? [] : z.sport.length === 3 ? null : z.sport.slice(), zurueck: z.zurueck })), S.modus, alt, std);
      const vf = [], doppelt = new Set();
      for (const x of eintr) { const e = V66().vfEintrag(x.ziel, x.wert, jetzt); if (doppelt.has(e.id)) continue; doppelt.add(e.id); vf.push(e); }
      const aktionen = offen.filter((z) => z.gesperrt !== z.gesperrt0).map((z) => ({ art: z.gesperrt ? "sperren" : "entsperren", date: z.date }));
      if (!vf.length && !aktionen.length) { weiter(); return; }
      ev.currentTarget.disabled = true;
      const f = await M().planen(mo, { vf, aktionen, grund: "woche" });
      if (f) { ev.currentTarget.disabled = false; fehler(f); return; }
      V59().schliessen();
      if (!imEnt()) M().frageWennNoetig(mo);
    };
  };

  /* ---------------- fehlt-zeit-1.0: die Frage ---------------- */
  /** Frage als Blatt: was fehlt, Vorschläge (durchgerechnet), «Nein, so lassen». D = V66UI.frageDaten(mo). */
  N.frage = function (mo, D) {
    if (!bereit() || !D) return;
    const W = V6(), F = D.fehlt;
    const was = F.einheiten.slice(0, 4).map((x) => `«${x.titel}»`).join(", ") + (F.einheiten.length > 4 ? ` und ${F.einheiten.length - 4} weitere` : "");
    const html = `<div class="blatt-titel">${W.icon("funken", 30)}<h2 id="v59-ov-h" tabindex="-1">Die Woche geht nicht auf</h2>
        <p class="sub">Es fehlen ${esc(V92().dauer(F.min))}${isNum(F.tl) ? ` (${F.tl} TL)` : ""}: ${esc(was)}. Darf an einem Tag mehr trainiert werden als die eingestellte Zeit?</p></div>
      <ul class="mp-wahl fz-wahl" data-fzwahl><li><p class="hint">Rechne die Vorschläge durch …</p></li></ul>
      <ul class="mp-wahl"><li><button type="button" class="mp-zeile" data-fznein><span class="mp-vt"><b>Nein, so lassen</b><small>Nichts ändert sich; der Bericht nennt, was fehlt. Die Frage kommt erst nach deiner nächsten Änderung wieder.</small></span></button></li></ul>
      <p class="hint">${esc(V92().VERSIONS.fehlt)}: Die Seite überzieht deine Zeit nie von selbst. «Ja» setzt die Zeit dieses Tages so, wie wenn du sie am Regler gestellt hättest (von Hand),
        und plant die Woche neu; ↶ im Bericht nimmt Woche und Zeit zurück. Jeder Vorschlag ist mit dem Planer durchgerechnet und nie grösser als das Fehlende.</p>
      <p class="warn-t" data-fzfehler hidden></p>`;
    const ov = V59().blatt("fz-blatt", html);
    const fehler = (t) => { const p = ov.querySelector("[data-fzfehler]"); p.textContent = t || ""; p.hidden = !t; };
    ov.querySelector("[data-fznein]").onclick = async () => { const f = await M().frageNein(mo, D.fp); if (f) { fehler(f); return; } V59().schliessen(); };
    setTimeout(() => {
      let L = [];
      try {
        const pr = M().probe(mo); L = V92().vorschlaege(D.kand, F.min, pr);
        // V9.11 tagesregel-1.0: was ein Vorschlag sonst auslöst (3. Einheit an einem Werktag, zusammengelegtes Schwimmen) – Vorschläge ohne so etwas zuerst
        if (pr.info) { const basis = pr.info({}); L.forEach((v) => { try { v.hinweise = V92().hinweise(pr.info(V92().mehrVon(v)), basis); } catch (e) { v.hinweise = []; } });
          L.sort((a, b) => (a.hinweise.length ? 1 : 0) - (b.hinweise.length ? 1 : 0)); }
      } catch (e) { console.error(e); L = []; }
      const box = ov.querySelector("[data-fzwahl]"); if (!box || !box.isConnected) return;
      box.innerHTML = L.length ? L.map((v, i) => `<li><button type="button" class="mp-zeile" data-fzja="${i}"><span class="mp-vt"><b>Ja: ${esc(V92().vorschlagText(v))}</b><small>${v.art === "tag" ? "Dieser Tag allein reicht" : "Auf zwei Tage verteilt"} – danach fehlt nichts mehr.${v.hinweise && v.hinweise.length ? ` <b>Achtung:</b> ${esc(v.hinweise.join("; "))}.` : ""}</small></span>${W.icon("weiter", 18)}</button></li>`).join("")
        : `<li><p class="hint">Kein Tag kann das allein oder zu zweit aufnehmen (Zeit, Sportart oder gesperrt). Stell die Zeiten in «Woche einstellen» ein.</p>
           <button type="button" class="btn" data-fzwoche>${W.icon("kalender", 16)} Woche einstellen</button></li>`;
      box.querySelectorAll("[data-fzja]").forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        const f = await M().frageJa(mo, L[+b.dataset.fzja]);
        if (f) { b.disabled = false; fehler(f); return; }
        V59().schliessen();
      }));
      const wb = box.querySelector("[data-fzwoche]"); if (wb) wb.onclick = () => N.wocheEinstellen(mo, {});
    }, 30);
  };

  /* ---------------- umplanen-1.0: Bericht oben im Kalender ---------------- */
  /** HTML des Berichts (leer ohne Bericht oder im Bearbeiten-Modus). */
  N.berichtHTML = function () {
    if (!bereit() || imEnt()) return "";
    const B = M().bericht(); if (!B || B.entwurf) return "";
    const W = V6(), lst = B.zeilen.slice(0, 3), mehr = B.zeilen.length - lst.length;
    const tl = isNum(B.vorher.tl) && isNum(B.nachher.tl) ? `${B.vorher.tl} → ${B.nachher.tl} TL` : "", hm = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h`;
    const st = isNum(B.vorher.min) && isNum(B.nachher.min) ? `${hm(B.vorher.min)} → ${hm(B.nachher.min)}` : "";
    const titel = B.rueck ? "Zurückgenommen" : B.leer ? "Nichts zu verschieben" : "Woche neu geplant";
    const text = B.leer && !B.rueck ? "Es musste nichts verschoben werden – alle Einheiten passen zu deiner Verfügbarkeit." : "";
    const F = B.fehlt;
    let aus = false; try { aus = !!B.gestrichen && unterBereich(B.mo); } catch (e) { aus = false; }
    return `<div class="k4-bericht" role="status" data-k4ber>
      <div class="k4-b-kopf"><b>${esc(titel)}</b><small>KW ${W.isoWoche(B.mo)}${tl ? " · " + esc(tl) : ""}${st ? " · " + esc(st) : ""}</small>
        <button type="button" class="btn rp-ib k4-b-x" data-k4bx aria-label="Bericht wegwischen">${W.icon("schliessen", 16)}</button></div>
      ${text ? `<p class="k4-b-t">${esc(text)}</p>` : ""}${lst.length ? `<ul class="k4-b-l">${lst.map((x) => `<li>${esc(x)}</li>`).join("")}${mehr > 0 ? `<li class="hint">… und ${mehr} weitere</li>` : ""}</ul>` : ""}
      ${F ? `<p class="k4-b-f">Fehlt: ${esc(V92().dauer(F.min))}${isNum(F.tl) ? ` (${F.tl} TL)` : ""} – ${esc(F.einheiten.map((x) => x.titel).join(", "))}</p>` : ""}
      ${B.hinweise && B.hinweise.length ? `<p class="hint k4-b-h">${esc(B.hinweise[0])}</p>` : ""}
      <div class="k4-b-k">${B.undo ? `<button type="button" class="btn klein" data-k4bundo>${W.icon("rueckgaengig", 14)} Rückgängig</button>` : ""}
        ${F ? `<button type="button" class="btn klein" data-k4bfrage>${W.icon("funken", 14)} Mehr Zeit erlauben …</button>` : ""}
        ${aus ? `<button type="button" class="btn klein" data-k4baus>Ausgleichen</button>` : ""}
        <button type="button" class="btn klein" data-k4bdet>Details</button></div></div>`;
  };
  /** Liegt die geplante Wochenlast unter dem Bereich (TL ≈ des Vorschlags − 7,5 %, wie zyklus-1.0)? */
  function unterBereich(mo) {
    const K = P().kontextFuer(mo); if (!K) return false;
    const BZ = V66().bezug(window.TR ? window.TR().zonen(C.D.zonen).skalen : null, K.css ? K.css.s : null);
    const tl = (tage) => tage.reduce((s, t) => s + t.einheiten.reduce((x, e) => { const v = V66().schaetzung(e, BZ).tl; return x + (isNum(v) ? v : 0); }, 0), 0);
    const plan = tl((K.wPlan || K.w).tage), vor = tl(((K.w0roh && K.w0roh.tage) || (K.w0 && K.w0.tage) || []));
    return vor > 0 && plan < vor * 0.925;
  }
  /** Knöpfe des Berichts binden (box = Element, das N.berichtHTML() enthält). */
  N.berichtBinden = function (box) {
    if (!box) return;
    const B = M().bericht(); if (!B) return;
    const q = (s) => box.querySelector(s), meld = (t) => { const p = q(".k4-b-t") || q(".k4-b-k"); if (p && t) p.insertAdjacentHTML("beforebegin", `<p class="warn-t">${esc(t)}</p>`); };
    const x = q("[data-k4bx]"); if (x) x.onclick = () => M().berichtWeg();
    const u = q("[data-k4bundo]"); if (u) u.onclick = async () => { u.disabled = true; const f = await M().rueckgaengig(); if (f) { u.disabled = false; meld(f); } };
    const fr = q("[data-k4bfrage]"); if (fr) fr.onclick = () => { const D = M().frageDaten(B.mo, { immer: true }); if (D) N.frage(B.mo, D); else meld("Für diese Woche gibt es nichts zu fragen."); };
    const a = q("[data-k4baus]"); if (a) a.onclick = async () => { a.disabled = true; const f = await M().ausgleichen(B.mo); if (f) { a.disabled = false; meld(f); } else M().frageWennNoetig(B.mo); };
    const d = q("[data-k4bdet]"); if (d) d.onclick = () => N.berichtDetails();
  };
  /** Details als Blatt: alle Änderungen, Meldungen des Planers, was fehlt. */
  N.berichtDetails = function () {
    if (!bereit()) return;
    const B = M().bericht(); if (!B) return;
    const W = V6(), F = B.fehlt;
    V59().blatt("k4-ber", `<div class="blatt-titel"><h2 id="v59-ov-h" tabindex="-1">Woche neu geplant</h2><p class="sub">KW ${W.isoWoche(B.mo)} · Wochenlast ${isNum(B.vorher.tl) ? B.vorher.tl : "–"} → ${isNum(B.nachher.tl) ? B.nachher.tl : "–"} TL${B.nachher.offen ? " (mind.)" : ""}</p></div>
      <h3 class="abschnitt">Was sich geändert hat</h3>${B.zeilen.length ? `<ul class="mo-ablauf">${B.zeilen.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>` : `<p>Es musste nichts verschoben werden – alle Einheiten passen zu deiner Verfügbarkeit.</p>`}
      ${F ? `<h3 class="abschnitt">Fehlt</h3><ul class="mo-ablauf">${F.einheiten.map((x) => `<li>${esc(x.titel)} · ${esc(V92().dauer(x.dauer))}${isNum(x.tl) ? ` · ${x.tl} TL` : ""}</li>`).join("")}</ul>` : ""}
      ${B.meldungen.length ? `<h3 class="abschnitt">So verteilt der Planer die Woche</h3><ul class="mo-ablauf">${B.meldungen.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>` : ""}
      <p class="hint">${esc(V66().VERSIONS.umplanen)}, ${esc(V66().VERSIONS.grenzen)}: Die ganze Woche wird aus Vorschlag, deinen Zeiten und Sportarten und allem Festen neu gerechnet. Gesperrte Tage, deine eigenen
        Einheiten und vergangene Tage bleiben; Gestrichenes bleibt gestrichen. Die Zeit eines Tages überschreitet die Seite nie von selbst.</p>
      <div class="blatt-fuss"><span></span><button type="button" class="btn primary" data-x>OK</button></div>`);
  };
})();
