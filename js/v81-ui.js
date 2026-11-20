/* V8.1 Oberfläche zu js/v81.js: Blatt «Nach dem Training» (nachher-1.0, 1.1 mit Magen und Energie ab 60 min) je Aktivität – Anstrengung und Gefühl von der Uhr vorbelegt, dazu
   leichter/schwerer als erwartet, Intervalle, Notiz; daneben Puls zur Leistung gegen deine Basis (hf-leistung-1.0) und geplante gegen absolvierte Last
   (last-abweichung-1.0). Gespeichert wird in der Liste «rpe» über «Direkt speichern». Zeile unter jeder erledigten Aktivität auf Heute, Karte «Anstieg der
   Belastung» (anstieg-1.0) unter Analyse → Belastung und Erholung. Eine Einheit ist immer nur ein Hinweis: nichts hier ändert den Plan. */
(function () {
  "use strict";
  const N = (window.V81UI = window.V81UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V64 = () => window.V64, V66 = () => window.V66, V81 = () => window.V81, V59 = () => window.V59, FK = () => window.FK;
  const P = () => window.V64UI, M = () => window.V66UI;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const komma = (x) => String(x).replace(".", ",");
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && V81() && V59() && V6()); };
  const heute = () => C.iso(C.today);
  const tagText = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
  const dauer = (s) => (V6() && V6().dauerText ? V6().dauerText(s) : Math.round(s / 60) + " min");      // V6.dauerText nimmt Sekunden
  const SPW = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen" };

  const eintragVon = (id) => { try { return UI().merged("rpe", "rpe").find((r) => r.id === id) || null; } catch (e) { return null; } };
  const aktVon = (id) => (C && C.D ? (C.D.activities || []).find((a) => a.id === id) : null) || null;
  /** Geplante Einheit derselben Sportart am Tag der Aktivität (Mein Plan, nur Wochen, die gelten) und ihr TL ≈. */
  function geplant(a) {
    try {
      if (!P() || !P().kontextFuer || !window.V7UI || !window.V7UI.planGilt || !window.V7UI.planGilt(V64().montag(a.date))) return null;
      const K = P().kontextFuer(V64().montag(a.date)), t = K && K.w ? K.w.tage.find((x) => x.date === a.date) : null;
      const L = t ? (t.einheiten || []).filter((e) => e.sport === a.sport) : [];
      if (!L.length) return null;
      // V9.1 zusammen-1.0: dieselbe Zuordnung wie Kalender, Tagesblatt und Heute (V91.zuordnen); ohne das Modul wie bisher die nächste Dauer
      const mv = (isNum(a.mv) ? a.mv : a.dur || 0) / 60;
      const Z = window.V91 && t ? window.V91.zuordnen(t.einheiten || [], (C.D.activities || []).filter((x) => x && x.date === a.date), { sportVon: V6().sportVon }) : null;
      const e = Z ? Z.von.get(a.id) : L.slice().sort((x, y) => Math.abs((x.dauer || 0) - mv) - Math.abs((y.dauer || 0) - mv))[0];
      if (!e) return null;
      const bz = V66().bezug(K.skalen, K.css ? K.css.s : null), q = M() && M().lastGeplant ? M().lastGeplant(e, bz) : V66().schaetzung(e, bz);
      return { e, tl: isNum(q.tl) ? q.tl : null, stufe: e.minuten ? (e.minuten.hart > 0 ? "hart" : e.minuten.mittel > 0 ? "mittel" : "locker") : null };
    } catch (err) { console.error(err); return null; }
  }
  /** V9.1 zusammen-1.0: Aktivitäts-Seite (Explorer) – «Passt zu: … (Mein Plan)» mit Vergleich geplant gegen absolviert; ohne passende Einheit
   *  «Vorschlag der Seite wäre: …» (der Wochenvorschlag ohne deine Änderungen), sonst nichts. Nur Anzeige. */
  N.passtZu = function (a) {
    try {
      if (!bereit() || !a || !window.V91 || (window.FK && FK().zaehlt && !FK().zaehlt(a))) return "";
      const G = geplant(a);
      if (G) {
        const Vg = window.V91.vergleich(G.e, a), AB = G.tl != null ? V81().abweichung(G.tl, a) : null;
        const teile = [Vg ? `Dauer ${dauer((Vg.dauerPlan != null ? Vg.dauerPlan : 0) * 60)} geplant, ${dauer(Vg.dauerIst * 60)} absolviert (${Vg.text})` : "",
          AB ? `TL ≈ ${AB.plan} geplant, ${AB.ist} absolviert (${AB.urteil})` : ""].filter(Boolean);
        return `<p class="hint v91-passt keep"><b>Passt zu: ${esc(G.e.titel)} (Mein Plan)</b>${teile.length ? "<br>" + teile.map(esc).join("<br>") : ""}</p>`;
      }
      if (!P() || !P().kontextFuer || !window.V7UI || !window.V7UI.planGilt || !window.V7UI.planGilt(V64().montag(a.date))) return "";
      const K = P().kontextFuer(V64().montag(a.date)), W0 = K && (K.w0 || K.w0roh), t0 = W0 && W0.tage ? W0.tage.find((x) => x.date === a.date) : null;
      const L = t0 ? (t0.einheiten || []).filter((e) => e.sport === (V6().sportVon ? V6().sportVon(a) : a.sport)) : [];
      if (!L.length) return `<p class="hint v91-passt keep">Zu dieser Aktivität gibt es keine geplante Einheit in Mein Plan.</p>`;
      const mv = (isNum(a.mv) ? a.mv : a.dur || 0) / 60, e = L.slice().sort((x, y) => Math.abs((x.dauer || 0) - mv) - Math.abs((y.dauer || 0) - mv))[0], Vg = window.V91.vergleich(e, a);
      return `<p class="hint v91-passt keep"><b>Vorschlag der Seite wäre: ${esc(e.titel)}</b>${Vg && Vg.dauerPlan != null ? `<br>${esc(`Dauer ${dauer(Vg.dauerPlan * 60)} im Vorschlag, ${dauer(Vg.dauerIst * 60)} absolviert (${Vg.text})`)}` : ""}</p>`;
    } catch (err) { console.error(err); return ""; }
  };
  /** Zeile unter einer erledigten Aktivität (Heute, Tagesblatt): was schon da ist und was fehlt. */
  N.zeile = function (a) {
    if (!bereit() || !a || !["rad", "lauf", "schwimm", "wandern", "ski", "andere"].includes(a.sport) || window.FK && !FK().zaehlt(a)) return "";
    const s = V81().selbstVon(C.D, a), X = V81().nachher(a, eintragVon(a.id), s);
    const teile = [];
    if (X.rpe != null) teile.push(`RPE ${X.rpe}${X.rpeQuelle === "uhr" ? " (Uhr)" : ""}`);
    if (X.gefuehl) teile.push(X.gefuehl);
    if (X.erwartung) teile.push(X.erwartung);
    const offen = !X.erwartung;
    return `<button type="button" class="nt-zeile${offen ? " offen" : ""}" data-v81="${esc(a.id)}">${V6().icon("check", 15)}<span><b>Nach dem Training</b>
      <small>${esc(teile.join(" · ") || "noch nichts erfasst")}${offen ? " – leichter oder schwerer als erwartet?" : ""}</small></span>${V6().icon("weiter", 16)}</button>`;
  };

  /* ---------------- Blatt «Nach dem Training» ---------------- */
  N.blatt = function (aid, zurueck) {
    if (!bereit()) return;
    const a = aktVon(aid); if (!a) return;
    const W = V6(), D = V81(), s = D.selbstVon(C.D, a), alt = eintragVon(a.id), X = D.nachher(a, alt, s);
    const w = { rpe: X.rpe, gefuehl: X.gefuehl, erwartung: X.erwartung, intervalle: X.intervalle, notiz: X.notiz || "", magen: X.magen, energie: X.energie };
    const H = D.pulsZurLeistung(C.D.activities || [], a), G = geplant(a), AB = G ? D.abweichung(G.tl, a) : null;
    if (!w.intervalle && G && G.stufe === "locker" && !(a.wk && Array.isArray(a.wk.schritte) && a.wk.schritte.length > 3)) w.intervalle = "keine";
    const chips = (attr, L, wert) => `<div class="chips" role="radiogroup">${L.map((t) => `<button type="button" class="chip" role="radio" ${attr}="${esc(t)}" aria-checked="${t === wert}">${esc(t)}</button>`).join("")}</div>`;
    const chipsW = (attr, L, wert) => `<div class="chips" role="radiogroup">${L.map(([k, t]) => `<button type="button" class="chip" role="radio" ${attr}="${esc(k)}" aria-checked="${k === wert}">${esc(t)}</button>`).join("")}</div>`;
    // V8.1.1 nachher-1.1 / verpflegung-1.0: Magen und Energie ab 60 min, Verpflegung geplant gegen genommen (Fueling-Protokoll)
    const mitV = D.mitVerpflegung ? D.mitVerpflegung(a) : false;
    let VN = null; try { VN = mitV && G && window.VPUI && window.VPUI.nachher ? window.VPUI.nachher(a, G.e) : null; } catch (err) { console.error(err); }
    const vpText = VN && VN.R.ziel.stufe === "ja" ? `Verpflegung: empfohlen ${VN.R.ziel.g_h} g/h${VN.V ? ` · genommen ${VN.V.genommen} g/h (${VN.V.urteil})` : " · genommen: noch nicht im Fueling-Protokoll"}.` : "";
    const zahlen = [[dauer(isNum(a.mv) ? a.mv : a.dur || 0), "Dauer"]];
    if (isNum(a.tss)) zahlen.push([String(Math.round(a.tss)), "TL"]);
    if (AB) zahlen.push([`≈ ${AB.plan}`, "TL geplant"]);
    const html = `<div class="blatt-titel">${W.icon("check", 34)}<h2 id="v59-ov-h" tabindex="-1">Nach dem Training</h2><p class="sub">${esc(a.name || SPW[a.sport] || "Aktivität")} · ${esc(tagText(a.date))}</p></div>
      <div class="kv ek-kv">${zahlen.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      ${AB && AB.urteil !== "wie geplant" ? `<p class="${AB.urteil === "mehr als geplant" ? "warn-t" : "hint"}">${esc(AB.urteil === "mehr als geplant" ? "Mehr Last als geplant" : "Weniger Last als geplant")}: ${AB.ist} gegen ≈ ${AB.plan} (${esc(G.e.titel)}). Die nächsten Tage prüft künftig der Tagescoach (V8.3); heute ist das nur ein Hinweis.</p>` : ""}
      <h3 class="abschnitt">Anstrengung (RPE 1–10)</h3>
      <div class="rpe-skala" role="radiogroup" aria-label="RPE">${Array.from({ length: 10 }, (_, i) => `<button type="button" class="btn rpe-b" role="radio" data-ntr="${i + 1}" aria-checked="${w.rpe === i + 1}">${i + 1}</button>`).join("")}</div>
      <p class="hint">${s && isNum(s.rpe_g) ? `Von deiner Uhr: ${s.rpe_g}. ` : ""}1 sehr leicht · 3 moderat · 5 hart · 7 sehr hart · 10 maximal (CR-10).</p>
      <h3 class="abschnitt">Gefühl</h3>${chips("data-ntg", D.GEFUEHL.map((x) => x[1]), w.gefuehl)}
      ${s && isNum(s.feel_g) ? `<p class="hint">Von deiner Uhr: ${esc(D.gefuehlWort(s.feel_g))}.</p>` : ""}
      <h3 class="abschnitt">Im Vergleich zur Erwartung</h3>${chips("data-nte", D.ERWARTUNG, w.erwartung)}
      <h3 class="abschnitt">Intervalle</h3>${chips("data-nti", ["alle", "nicht alle", "keine"], w.intervalle)}
      ${mitV ? `<h3 class="abschnitt">Magen</h3>${chipsW("data-ntm", D.MAGEN, w.magen)}<h3 class="abschnitt">Energie gegen Ende</h3>${chips("data-ntv", D.ENERGIE, w.energie)}${vpText ? `<p class="hint keep">${esc(vpText)}</p>` : ""}` : ""}
      <label class="nt-notiz">Notiz (optional)<input type="text" maxlength="500" data-ntn value="${esc(w.notiz)}" placeholder="z. B. Wind, Beine schwer, Magen"></label>
      <h3 class="abschnitt">Puls zur Leistung</h3>
      <p class="${H.urteil === "höher" ? "warn-t" : "hint"}">${H.quelle ? `${esc(H.urteil === "wie üblich" ? "Wie üblich" : H.urteil === "höher" ? "Höher als üblich" : "Tiefer als üblich")}: ${H.delta > 0 ? "+" : ""}${komma(H.delta)} bpm gegen deine Basis (${esc(H.bezug)}, ${H.n_ref} Vergleiche aus den Wochen davor; ab ±${komma(H.grenze)} bpm gilt es als anders)${H.vorbehalte.length ? ` – Vorsicht: ${esc(H.vorbehalte.join(", "))}` : ""}.` : esc(`Kein Vergleich: ${H.grund}.`)}</p>
      <p data-nth></p>
      <p class="hint">Laktat zu dieser Einheit trägst du im Explorer ein (Abschnitt wählen, «Laktat hier»). <button type="button" class="lnk" data-ex="${esc(a.id)}">Explorer öffnen</button></p>
      <p class="warn-t" data-ntf hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-ntz aria-label="Zurück">${W.icon("zurueck", 22)}</button>
        <button type="button" class="btn primary gross" data-ntok>${W.icon("check", 18)} Speichern</button></div>`;
    const ov = V59().blatt("nachher", html);
    const q = (x) => ov.querySelector(x), ok = q("[data-ntok]");
    const zeig = () => {
      ov.querySelectorAll("[data-ntr]").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.ntr === w.rpe)));
      for (const [attr, k] of [["data-ntg", "gefuehl"], ["data-nte", "erwartung"], ["data-nti", "intervalle"], ["data-ntm", "magen"], ["data-ntv", "energie"]]) ov.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute("aria-checked", String(b.getAttribute(attr) === w[k])));
      const h = D.hinweis({ rpe: w.rpe, erwartung: w.erwartung }, H, { stufe: G ? G.stufe : null }), el = q("[data-nth]");
      el.className = h ? (h.art === "warn" ? "warn-t" : "hint") : "hint"; el.textContent = h ? h.text : "";
      ok.disabled = !Number.isInteger(w.rpe);
    };
    ov.querySelectorAll("[data-ntr]").forEach((b) => (b.onclick = () => { w.rpe = +b.dataset.ntr; zeig(); }));
    ov.querySelectorAll("[data-ntg]").forEach((b) => (b.onclick = () => { w.gefuehl = b.dataset.ntg; zeig(); }));
    ov.querySelectorAll("[data-nte]").forEach((b) => (b.onclick = () => { w.erwartung = b.dataset.nte; zeig(); }));
    ov.querySelectorAll("[data-nti]").forEach((b) => (b.onclick = () => { w.intervalle = b.dataset.nti; zeig(); }));
    ov.querySelectorAll("[data-ntm]").forEach((b) => (b.onclick = () => { w.magen = w.magen === b.dataset.ntm ? null : b.dataset.ntm; zeig(); }));
    ov.querySelectorAll("[data-ntv]").forEach((b) => (b.onclick = () => { w.energie = w.energie === b.dataset.ntv ? null : b.dataset.ntv; zeig(); }));
    zeig();
    q("[data-ntz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    ok.onclick = async () => {
      w.notiz = q("[data-ntn]").value.trim();
      const e = D.eintrag(a, w, new Date().toISOString(), s), f = q("[data-ntf]");
      if (!e) { f.textContent = "Anstrengung (RPE) antippen."; f.hidden = false; return; }
      // ältere Angaben derselben Einheit (z. B. Muskulatur, Bereich aus dem Explorer) bleiben; ein Gefühl in anderen Worten nur, wenn es nicht geändert wurde
      const neu = Object.assign({}, alt || {}, e);
      if (!e.gefuehl && alt && alt.gefuehl && w.gefuehl === alt.gefuehl) neu.gefuehl = alt.gefuehl;
      ok.disabled = true;
      try { await UI().Inbox.upsert("rpe", neu); } catch (err) { console.error(err); f.textContent = "Speichern auf diesem Gerät ging nicht."; f.hidden = false; ok.disabled = false; return; }
      V59().schliessen();
      if (zurueck) zurueck();
      try { if (window.V6H && window.V6H.zeichnen) window.V6H.zeichnen(); } catch (err) { console.error(err); }      // Heute: Zeile «Nach dem Training» neu
    };
  };
  // Zeilen auf Heute und im Tagesblatt öffnen das Blatt (ein Klick-Hörer für alle)
  document.addEventListener("click", (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-v81]") : null;
    if (!b) return;
    ev.preventDefault();
    // aus dem Tagesblatt (Blatt über der Seite): danach wieder dorthin
    const a = bereit() ? aktVon(b.dataset.v81) : null, imBlatt = !!b.closest("#v59-ov");
    N.blatt(b.dataset.v81, imBlatt && a && window.APP && window.APP.tagBlatt ? () => window.APP.tagBlatt(a.date) : null);
  });

  /* ---------------- Karte «Anstieg der Belastung» (anstieg-1.0) ---------------- */
  /** Lasten der nächsten 21 Tage aus Mein Plan (TL ≈, ohne Wert: Dauer × Last pro Stunde der Sportart, wie die Fitness-Vorschau). */
  function planLasten(ab) {
    const L = [];
    try {
      for (let i = 0; i < 21; i++) {
        const d = window.V81._intern.addDays(ab, i), mo = V64().montag(d), K = P().kontextFuer(mo), t = K && K.w ? K.w.tage.find((x) => x.date === d) : null;
        const bz = K ? V66().bezug(K.skalen, K.css ? K.css.s : null) : {};
        L.push(t && !t.rennen ? (t.einheiten || []).reduce((s, e) => { const q = M().lastGeplant(e, bz); return s + (isNum(q.tl) ? q.tl : 0); }, 0) : 0);
      }
    } catch (e) { console.error(e); return null; }
    return L;
  }
  N.anstiegKarte = function () {
    const el = document.getElementById("v81-anstieg"); if (!el || !bereit() || !FK()) return;
    try {
      const PM = C.pmc(), h = heute(), A = V81().anstieg(FK().pmcMorgen(PM, h), FK().pmcMorgen(PM, V81()._intern.addDays(h, -28)), planLasten(h));
      if (!A) { el.innerHTML = `<p class="hint">Noch zu wenig Trainingsdaten.</p>`; return; }
      const farbe = (st) => (st === "zu schnell" || st === "sehr hoch" ? "down" : st === "hoch" ? "warn-t" : "");
      el.innerHTML = `<div class="kv"><div><b class="${farbe(A.lang.status)}">${esc(A.lang.status)}</b><span>langfristig (4 Wochen)</span></div>
        <div><b class="${farbe(A.kurz.stufe)}">${A.kurz.wert != null ? komma(A.kurz.wert) : "–"}</b><span>Ermüdung ÷ Fitness (${esc(A.kurz.stufe || "–")})</span></div>
        ${A.geplant ? `<div><b class="${farbe(A.geplant.status)}">${esc(A.geplant.status)}</b><span>Mein Plan, 3 Wochen</span></div>` : ""}</div>
        <p class="${A.urteil === "zu schnell" || (A.geplant && A.geplant.status === "zu schnell") ? "warn-t " : ""}keep v81-satz">${A.text.map(esc).join(" ")}</p>
        <p class="hint">Fitness, Ermüdung, Last und Ampel bleiben getrennte Zahlen; eine gute Tagesform steigert den Plan nie. Ab Ermüdung ÷ Fitness über 1,5 nimmt die Belastung zu schnell zu (wie der Trainingsstatus).</p>`;
    } catch (e) { console.error(e); el.innerHTML = `<p class="hint">Nicht berechenbar.</p>`; }
  };
  N.gezeigt = function (name) { if (name === "erholung") N.anstiegKarte(); };
  document.addEventListener("meinplan", () => { if (document.getElementById("v81-anstieg") && !document.getElementById("view-erholung").hidden) N.anstiegKarte(); });
})();
