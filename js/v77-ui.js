/* V7.7 Oberfläche zu js/v77.js: «Draussen planen» (aktivitaet-plan-1.0) im Tagesblatt unter «Training hinzufügen», Abschnitt auf der Einheit-Seite
   (js/v73-ui.js) und Karte «Zonen nach Puls prüfen» (zonenpruefung-hf-1.0) unter Analyse → Laktat. Gespeichert wird je Tag ein Eintrag «ak-<Datum>»
   über «Direkt speichern» (Eingabe aktivitaet → plan_aktivitaeten); ist die Woche schon gespeichert (Mein Plan), wird sie gleich mit angepasst
   (V66.aendern «aktivitaet»), sonst rechnet der Wochenvorschlag die Aktivität von selbst ein. Nichts geht an Garmin oder Enduco. */
(function () {
  "use strict";
  const N = (window.V77UI = window.V77UI || {});
  const UI = () => window.V5UI, V6 = () => window.V6, V64 = () => window.V64, V66 = () => window.V66, V77 = () => window.V77, V59 = () => window.V59;
  const P = () => window.V64UI, M = () => window.V66UI, TR = () => window.TR;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const heute = () => C.iso(C.today);
  const montag = (iso) => V64().montag(iso);
  const tagText = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
  const dkurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  const komma = (x) => String(x).replace(".", ",");
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && V77() && V66() && V64() && V59() && V6()); };
  const neuZeichnen = () => { try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); } };

  /* TL ≈ einer geplanten Aktivität aus den eigenen Aktivitäten derselben Art (V66.schaetzung liest V66.draussenTL) */
  let TLC = null;
  function tlMap() {
    const c = UI() && UI().C; if (!c || !c.D || !V77()) return {};
    const t = c.iso(c.today);
    if (!TLC || TLC.d !== c.D || TLC.t !== t) TLC = { d: c.D, t, m: V77().tlProStunde(c.D.activities || [], (c.D.config || {}).load_model, t) };
    return TLC.m;
  }
  if (window.V66 && !window.V66.draussenTL) window.V66.draussenTL = tlMap;

  /** Geplante Aktivitäten (Daten und noch nicht eingespielte auf diesem Gerät): Map Datum → Eintrag. */
  N.liste = function () {
    C = UI() && UI().C;
    if (!C || !C.D || !V77()) return new Map();
    return V77().liste(C.D.plan_aktivitaeten || [], ((UI().Inbox && UI().Inbox.data) || {}).aktivitaet || []);
  };
  N.am = (ds) => N.liste().get(ds) || null;
  /** Pulsbereich einer Zone aus den Lauf-Pulszonen des aktiven Profils (wie beim Wandern in V6.SKALA). */
  function puls(z) {
    try {
      const L = TR() ? TR().zonen(C.D.zonen).skalen.lauf_hf : null, Z = Array.isArray(L) ? L.find((x) => x && x.z === String(z).toUpperCase()) : null;
      if (!Z) return null;
      if (isNum(Z.von) && isNum(Z.bis)) return `${Math.round(Z.von)}–${Math.round(Z.bis)}`;
      return isNum(Z.bis) ? `< ${Math.round(Z.bis)}` : null;
    } catch (e) { return null; }
  }
  const ersatzText = (art, min, zone) => {
    const A = V77().ARTEN[art], m = V77().ersatzMin({ art, min, zone }), sp = A.ersetzt === "rad" ? "Rad" : "Laufen";
    return `Ersetzt bis ${V77().dauerText(m)} ${sp} dieser Woche${zone === "z1" ? " (Z1 zählt halb)" : ""}: ${min >= V77().LANG ? `zuerst die lange ${A.ersetzt === "rad" ? "Ausfahrt" : "Einheit"}, dann lockere` : "zuerst lockere, dann die lange Einheit"}. Schlüsseleinheiten bleiben; was übrig bleibt, kommt dazu.`;
  };

  /* ---------------- Blatt «Draussen planen» ---------------- */
  /** Blatt für Tag ds; art = vorgewählte Aktivität (ohne: die schon geplante oder Skitour); zurueck() führt zurück (z. B. «Training hinzufügen»). */
  /** nach (V9.1.1 kalender-direkt-1.0, optional): wird nach dem Speichern oder Entfernen statt zurueck aufgerufen (z. B. gleich in den Kalender). */
  N.blatt = function (ds, art, zurueck, nach) {
    if (!bereit() || (window.V66UI && window.V66UI.entwurfSperre && window.V66UI.entwurfSperre())) return;   // V7.9: speichert direkt – nicht im Bearbeiten-Modus
    const W = V6(), D = V77(), alt = N.am(ds);
    const w = { art: art || (alt && alt.art) || "skitour", min: alt ? alt.min : D.ARTEN[art || "skitour"].std, zone: alt ? alt.zone : "z2", uhrzeit: alt && alt.uhrzeit ? alt.uhrzeit : "", notiz: alt && alt.notiz ? alt.notiz : "" };
    if (alt && art && art !== alt.art) w.min = D.ARTEN[art].std;
    const seg = (attr, L, wert) => `<div class="seg" role="group">${L.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${k === wert}">${esc(t)}</button>`).join("")}</div>`;
    const html = `<h2 id="v59-ov-h" tabindex="-1">Draussen planen</h2><p class="sub">${esc(tagText(ds))}${alt ? " · schon geplant" : ""}</p>
      ${seg("data-akart", Object.entries(D.ARTEN).map(([k, A]) => [k, A.titel]), w.art)}
      <div class="kv ek-kv mp-kv"><div><b data-akk="dauer"></b><span>Dauer</span></div><div><b data-akk="tl"></b><span>TL ≈</span></div><div><b data-akk="puls"></b><span data-akk="pz">Puls</span></div></div>
      <label class="mp-dauer"><span>Dauer</span><input type="range" min="${D.MIN}" max="${D.MAX}" step="${D.SCHRITT}" value="${w.min}" data-akdauer aria-label="Dauer in Minuten"></label>
      ${seg("data-akzone", [["z1", "Z1 locker"], ["z2", "Z2 Grundlage"]], w.zone)}
      <p class="hint" data-akersatz></p>
      <div class="css-grid"><label>Uhrzeit (optional)<input type="time" step="300" data-akzeit value="${esc(w.uhrzeit)}"></label>
        <label>Notiz<input type="text" maxlength="300" data-aknotiz value="${esc(w.notiz)}" placeholder="z. B. Route, mit wem"></label></div>
      <p class="hint">Der Tag gehört der Aktivität: andere Einheiten ziehen auf andere Tage${""}; ab 2 h am Vortag und am Tag danach keine harte Rad- oder Laufeinheit. Puls aus deinen Lauf-Pulszonen. TL ≈ aus deinen eigenen Aktivitäten dieser Art. Nichts davon geht an Garmin (${esc(D.VERSIONS.aktivitaet)}).</p>
      <p class="warn-t" data-akfehler hidden></p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-akz aria-label="Zurück">${W.icon("zurueck", 22)}</button>
        ${alt ? `<button type="button" class="btn" data-akweg>Entfernen</button>` : ""}<button type="button" class="btn primary gross" data-akok>${W.icon("check", 18)} ${alt ? "Speichern" : "Planen"}</button></div>`;
    const ov = V59().blatt("ak-plan", html);
    const q = (s) => ov.querySelector(s), k = (n) => q(`[data-akk="${n}"]`), sl = q("[data-akdauer]");
    const fehler = (t) => { const p = q("[data-akfehler]"); p.textContent = t; p.hidden = !t; };
    const zeig = () => {
      w.min = +sl.value;
      const e = D.einheit(D.eintrag(ds, w, "2000-01-01T00:00:00Z"), {}), S = e ? V66().schaetzung(e, {}) : {};
      k("dauer").textContent = D.dauerText(w.min);
      k("tl").textContent = isNum(S.tl) ? String(S.tl) : "–";
      k("puls").textContent = puls(w.zone) || w.zone.toUpperCase();
      k("pz").textContent = puls(w.zone) ? `Puls ${w.zone.toUpperCase()} (bpm)` : "Puls";
      q("[data-akersatz]").textContent = ersatzText(w.art, w.min, w.zone) + (isNum(S.tl) ? "" : ` TL ≈: ${S.grund || "offen"}.`);
      ov.querySelectorAll("[data-akart]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.akart === w.art)));
      ov.querySelectorAll("[data-akzone]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.akzone === w.zone)));
    };
    sl.oninput = zeig;
    ov.querySelectorAll("[data-akart]").forEach((b) => (b.onclick = () => { if (w.art !== b.dataset.akart && !alt) { w.art = b.dataset.akart; sl.value = String(D.ARTEN[w.art].std); } else w.art = b.dataset.akart; zeig(); }));
    ov.querySelectorAll("[data-akzone]").forEach((b) => (b.onclick = () => { w.zone = b.dataset.akzone; zeig(); }));
    zeig();
    q("[data-akz]").onclick = () => (zurueck ? zurueck() : V59().schliessen());
    q("[data-akok]").onclick = async () => {
      w.uhrzeit = q("[data-akzeit]").value || ""; w.notiz = q("[data-aknotiz]").value.trim();
      if (ds < heute()) { fehler("Vergangene Tage nur lesen."); return; }
      const e = D.eintrag(ds, w), f = D.pruefen(e);
      if (f) { fehler(f); return; }
      const g = await N.speichern(e, alt);
      if (g) { fehler(g); return; }
      V59().schliessen();
      if (nach) nach(); else if (zurueck) zurueck();
    };
    const wb = q("[data-akweg]");
    if (wb) wb.onclick = async () => { const g = await N.entfernen(ds); if (g) { fehler(g); return; } V59().schliessen(); if (nach) nach(); else if (zurueck) zurueck(); };
  };
  /** Speichern: Eintrag ins Gerät («Direkt speichern»); eine schon gespeicherte Woche gleich anpassen. → null oder Fehlertext. */
  N.speichern = async function (e, alt) {
    if (!bereit()) return "Seite noch nicht bereit";
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.aktivitaet)) I.data.aktivitaet = [];
    const mo = montag(e.date), E = P() && P().planEintrag ? P().planEintrag(mo) : null;
    if (E && E.ganz && M() && M().aendern) {
      const u = V77().einheit(e, {});
      const f = await M().aendern(mo, { art: "aktivitaet", date: e.date, einheit: u.spec, akt: e, schon: alt && montag(alt.date) === mo ? V77().ersatzMin(alt) : 0 });
      if (f) return f;
    }
    await I.upsert("aktivitaet", e);
    neuZeichnen();
    return null;
  };
  N.entfernen = async function (ds) {
    if (!bereit()) return "Seite noch nicht bereit";
    if (ds < heute()) return "Vergangene Tage nur lesen.";
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.aktivitaet)) I.data.aktivitaet = [];
    const mo = montag(ds), E = P() && P().planEintrag ? P().planEintrag(mo) : null;
    if (E && E.ganz && M() && M().aendern) { const f = await M().aendern(mo, { art: "aktivitaet_weg", date: ds }); if (f) return f; }
    await I.upsert("aktivitaet", { id: "ak-" + ds, date: ds, entfernt: true, v: V77().VERSIONS.aktivitaet, geaendert: new Date().toISOString() });
    neuZeichnen();
    return null;
  };
  /** Zeilen für «Training hinzufügen» (js/v66-ui.js): die vier Aktivitäten, antippen öffnet das Blatt. */
  N.wahlZeilen = function () {
    if (!V77() || !V6()) return "";
    const W = V6();
    return `<h3 class="abschnitt">Draussen – blockiert den Tag</h3><ul class="mp-wahl">${Object.entries(V77().ARTEN).map(([k, A]) => `<li><button type="button" class="mp-zeile" data-akneu="${k}">
      <span class="mo-sp" style="--sp:var(--sp-${["ski", "wandern", "lauf"].includes(A.sport) ? A.sport : "andere"})">${W.sportIcon(A.sport, 18)}</span><b>${esc(A.titel)}</b><small>nach Puls, Z1 oder Z2</small>${W.icon("weiter", 18)}</button></li>`).join("")}</ul>`;
  };

  /* ---------------- Einheit-Seite (js/v73-ui.js) ---------------- */
  /** Abschnitt für eine Aktivität draussen: Kennzahlen, Puls, Ersatz in der Woche, Regeln, Ändern und Entfernen. X = Modell der Einheit-Seite. */
  N.abschnitt = function (X) {
    if (!bereit() || !X || !X.e) return "";
    const D = V77(), e = X.e, A = D.ARTEN[e.draussen] || { titel: e.titel }, S = V66().schaetzung(e, {});
    let info = null;
    try { const K = P().kontextFuer(montag(X.ds)); info = ((K && (K.w0roh || K.w0 || K.w).draussen) || []).find((x) => x.date === X.ds) || null; } catch (err) { info = null; }
    const plan = N.am(X.ds), z = e.zone || "z2";
    const kv = `<div class="kv ek-kv"><div><b>${esc(D.dauerText(e.dauer))}</b><span>Dauer</span></div><div><b>${esc(puls(z) || z.toUpperCase())}</b><span>${puls(z) ? `Puls ${esc(z.toUpperCase())} (bpm)` : "nach Puls"}</span></div><div><b>${isNum(S.tl) ? S.tl : "–"}</b><span>TL ≈</span></div></div>`;
    const ersatz = info && info.text ? `<p>${esc(info.text)}</p>` : `<p class="hint">${esc(ersatzText(e.draussen, e.dauer, z))}</p>`;
    const regeln = `<ul class="mo-ablauf"><li>Der Tag gehört der Aktivität – andere Einheiten ziehen auf andere Tage.</li>${e.dauer >= D.LANG ? "<li>Am Vortag und am Tag danach keine harte Rad- oder Laufeinheit.</li>" : ""}
      <li>Ampel «vorsichtig»: höchstens zwei Drittel der Dauer, nur Z1.</li><li>Laktat messen? Im Explorer «Puls aus den 10–20 min vor der Messung» wählen – die Karte «Zonen nach Puls prüfen» vergleicht mit deinem Stufentest.</li>
      <li>Nicht an Garmin: einfach als ${esc(A.titel)} aufzeichnen.</li></ul>`;
    const knopf = X.vorbei ? "" : `<div class="row"><button type="button" class="btn" data-akaendern>Ändern</button><button type="button" class="btn" data-akentf>Entfernen</button></div>`;
    return `<section class="v73-abschnitt"><h2 class="abschnitt">${esc(A.titel)} · nach Puls</h2>${kv}${plan && plan.notiz ? `<p>${esc(plan.notiz)}</p>` : ""}
      <h3 class="abschnitt">Was sich in der Woche ändert</h3>${ersatz}<h3 class="abschnitt">Regeln</h3>${regeln}${knopf}
      <p class="ek-quelle">${esc(D.VERSIONS.aktivitaet)}: eigene Festlegungen (Wissen, Kapitel «Draussen»); TL ≈ ${esc(S.grund || "")}.</p></section>`;
  };
  N.binden = function (sc, X, neu) {
    const a = sc.querySelector("[data-akaendern]"), b = sc.querySelector("[data-akentf]");
    if (a) a.onclick = () => N.blatt(X.ds, X.e.draussen, () => { V59().schliessen(); if (neu) neu(); });
    if (b) b.onclick = async () => { const f = await N.entfernen(X.ds); if (f) { V59().blatt("ak-f", `<h2 id="v59-ov-h" tabindex="-1">Nicht entfernt</h2><p class="warn-t">${esc(f)}</p>`); return; } if (neu) neu(); };
  };

  /* ---------------- Karte «Zonen nach Puls prüfen» (zonenpruefung-hf-1.0) ---------------- */
  N.zonenPruefung = function () {
    const box = document.getElementById("zp-box"); if (!box) return;
    if (!bereit() || !TR()) { box.innerHTML = `<p class="hint">Nicht verfügbar.</p>`; return; }
    let R = null;
    try { R = V77().zonenPruefung(C.D.lactate || [], TR().zonen(C.D.zonen).skalen, heute()); } catch (e) { console.error(e); }
    if (!R) { box.innerHTML = `<p class="hint">Nicht berechenbar.</p>`; return; }
    if (!R.messungen.length) {
      box.innerHTML = `<p class="hint">Noch keine bestätigte Messung mit Puls-Fenster. So geht es: nach der Messung die Aktivität im Explorer öffnen, «Laktat hier» und «Puls aus den 10 (15, 20) min vor der Messung» wählen, dann bestätigen. Für Skitour, Wandern, Langlauf und Grundlage nach Puls.</p>`;
      return;
    }
    const farbe = { passt: "ok", "Z2 zu hoch": "warn", "über Z2": "", unklar: "" };
    const zeilen = R.messungen.slice(0, 12).map((m) => `<tr><td>${esc(dkurz(m.date))}</td><td>${esc(m.sport)}</td><td>${Math.round(m.hr)}${m.zone ? ` (${esc(m.zone)})` : ""}</td>
      <td>${esc(komma(m.la))}</td><td>${isNum(m.lt1) ? esc(komma(m.lt1)) : "–"}</td><td><span class="st-farbe ${farbe[m.urteil] || ""}">${esc(m.urteil)}</span>${m.grund ? `<br><small>${esc(m.grund)}</small>` : ""}</td></tr>`).join("");
    box.innerHTML = `${R.fazit ? `<p class="${R.fazit.art === "zu hoch" ? "warn-t" : "verdict"}">${esc(R.fazit.text)}</p>` : `<p class="hint">Ein Hinweis kommt erst nach drei gleichen Urteilen in ${V77().WOCHEN} Wochen (bisher: ${R.zaehler.passt}× passt, ${R.zaehler.zuHoch}× Z2 zu hoch).</p>`}
      <table data-liste><thead><tr><th>Datum</th><th>Sport</th><th>Ø Puls</th><th>Laktat</th><th>LT1 ≈</th><th>Urteil</th></tr></thead><tbody>${zeilen}</tbody></table>
      <p class="hint">LT1 ≈ = Basis + 0,5 mmol/l aus dem letzten bestätigten Stufentest davor (Rad mit Rad, alles andere mit Laufen); «deutlich» = mehr als das Doppelte des Messfehlers. Nur Messungen mit Fenster ab 10 min und Pulsanstieg bis ${V77().ANSTIEG_MAX} %. Die Seite ändert keine Zonen (${esc(R.v)}).</p>`;
  };
})();
