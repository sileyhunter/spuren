/* V8.3 Oberfläche des Tagescoaches (tagescoach-1.0, Rechenteil js/v83.js): Karte «Coach» auf Heute und Vorschläge im Tagesblatt.
   Die Lage kommt aus dem Plan, wie er gilt (V64UI.kontextFuer: Mein Plan mit Verteilung, Kraft, Aktivitäten draussen und Ampel-Schicht), den Morgenwerten,
   den Einheiten von gestern und heute und der Verfügbarkeit; gerechnet wird bei jedem Zeichnen neu (nach Morgen-Update, Check-in, neuer Einheit,
   geänderter Verfügbarkeit). Annehmen ändert Mein Plan über V66UI.aendernFolge und speichert den Entscheid (Eingabe «tagescoach» → coach_entscheide);
   Ablehnen speichert nur den Entscheid; «Rückgängig» holt den Stand vor dem Annehmen zurück. Bis zum Enduco-Stichtag (config.enduco_bis) Probelauf. */
(function () {
  "use strict";
  const U = (window.V83UI = window.V83UI || {});
  const UI = () => window.V5UI, V83 = () => window.V83, V64 = () => window.V64, P = () => window.V64UI, V66 = () => window.V66, U66 = () => window.V66UI;
  const V6 = () => window.V6, FK = () => window.FK, V74UI = () => window.V74UI, V82 = () => window.V82;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && V83() && V64() && P() && P().kontextFuer); };
  const heute = () => C.iso(C.today);
  const lokal = () => ((UI() && UI().Inbox && UI().Inbox.data) || {}).tagescoach || [];
  const ANLASS_WORT = { morgen: "Morgenwerte", last: "Belastung", zeit: "Zeit", nachholen: "Ampel" };
  const neuZeichnen = () => { try { document.dispatchEvent(new CustomEvent("meinplan")); } catch (e) { console.error(e); } };

  /** Entscheide (Daten, darüber das Gerät) → Map id → Eintrag. */
  U.entscheide = () => (bereit() ? V83().entscheide(C.D.coach_entscheide || [], lokal()) : new Map());
  /** Markierung einer Einheit, die ein angenommener Vorschlag geändert hat (gekennzeichnet gegenüber dem ursprünglichen Plan). */
  U.marke = (ds, uid) => (bereit() && ds && uid ? V83().marke(U.entscheide(), ds, uid) : null);

  /* ---------------- Lage ---------------- */
  function geplantVon(a, K, t) {
    const L = t ? (t.einheiten || []).filter((e) => e.sport === a.sport) : [];
    if (!L.length) return null;
    const mv = (isNum(a.mv) ? a.mv : a.dur || 0) / 60, e = L.slice().sort((x, y) => Math.abs((x.dauer || 0) - mv) - Math.abs((y.dauer || 0) - mv))[0];
    let tl = null;
    try { const bz = V66().bezug(K.skalen, K.css ? K.css.s : null), q = U66() && U66().lastGeplant ? U66().lastGeplant(e, bz) : V66().schaetzung(e, bz); tl = isNum(q.tl) ? q.tl : null; } catch (err) { console.error(err); }
    return { uid: e.uid, titel: e.titel, tl, stufe: e.minuten ? (e.minuten.hart > 0 ? "hart" : e.minuten.mittel > 0 ? "mittel" : "locker") : V83().hart(e) ? "hart" : "locker" };
  }
  let REAKT = null;
  function reaktion() {
    if (!V82() || !V82().erholung) return null;
    const k = `${heute()}|${(C.D.activities || []).length}|${(C.D.days || []).length}`;
    if (REAKT && REAKT.k === k) return REAKT.r;
    let r = null; try { const E = V82().erholung(C.D, { heute: heute(), zonen: C.D.zonen, mitPuls: false }); r = E && isNum(E.erholtTag) ? { erholtTag: E.erholtTag } : null; } catch (e) { console.error(e); }
    REAKT = { k, r };
    return r;
  }
  /** Lage für V83.pruefen: gestern bis sechs Tage voraus, wie es gilt. */
  U.lage = function () {
    if (!bereit()) return null;
    const h = heute(), KW = new Map();
    const K = (mo) => { if (!KW.has(mo)) { let k = null; try { k = P().kontextFuer(mo); } catch (e) { console.error(e); } KW.set(mo, k); } return KW.get(mo); };
    const zaehlt = (a) => !FK() || !FK().zaehlt || FK().zaehlt(a);
    const tage = [], akt = [];
    for (let i = -1; i <= 6; i++) {
      const d = V64().addDays(h, i), mo = V64().montag(d), k = K(mo);
      if (!k || !k.w || !k.wPlan) continue;
      const t = (k.w.tage || []).find((x) => x.date === d), tp = (k.wPlan.tage || []).find((x) => x.date === d);
      if (!t) continue;
      const ist = (C.D.activities || []).filter((a) => a && a.date === d && zaehlt(a));
      tage.push({ date: d, mo, einheiten: t.einheiten || [], plan: (tp && tp.einheiten) || [], gesperrt: !!t.gesperrt, rennen: !!t.rennen, vorbei: d < h,
        verf: typeof k.verf === "function" ? k.verf(d) : null, ampel: t.ampel || null, ctx: k.ctxE || {}, erledigt: [...new Set(ist.map((a) => a.sport))] });
      if (i <= 0) for (const a of ist) {
        const hart = V82() && V82().art && Array.isArray(a.hh) ? (() => { try { return V82().art(a, C.D.zonen, h) === "hart"; } catch (e) { return null; } })() : null;
        akt.push({ id: a.id, date: a.date, sport: a.sport, tss: a.tss, dur_s: isNum(a.mv) ? a.mv : a.dur, hart, plan: geplantVon(a, k, t) });
      }
    }
    const L = { heute: h, tage, days: C.D.days || [], ampelHeute: V74UI() && V74UI().live ? V74UI().live() : null, aktivitaeten: akt,
      entscheide: [...U.entscheide().values()], enduco_bis: (C.D.config && C.D.config.enduco_bis) || null, reaktion: null };
    if (akt.some((a) => V83().haerter(a).urteil === "haerter")) L.reaktion = reaktion();
    return L;
  };
  let MEMO = null;
  document.addEventListener("meinplan", () => { MEMO = null; });
  /** Ergebnis von V83.pruefen (einmal je Datenstand; neu bei «meinplan», neuen Daten, neuem Tag). */
  U.pruefen = function () {
    if (!bereit()) return null;
    const I = (UI() && UI().Inbox && UI().Inbox.data) || {}, n = (k) => (Array.isArray(I[k]) ? I[k].length : 0);
    const bef = UI().befinden ? UI().befinden().find((b) => b.date === heute()) : null;
    const key = JSON.stringify([heute(), C.D.updated || "", (C.D.activities || []).length, (C.D.days || []).length, n("planwoche"), n("verfuegbarkeit"), n("tagescoach"), n("ampel"), bef]);
    if (MEMO && MEMO.key === key) return MEMO.r;
    let r = null; try { r = V83().pruefen(U.lage()); } catch (e) { console.error(e); }
    MEMO = { key, r };
    return r;
  };

  /* ---------------- Annehmen, Ablehnen, Rückgängig ---------------- */
  async function sichern(e) {
    const I = UI().Inbox; if (!I || !I.data) return "Speicher auf diesem Gerät nicht verfügbar";
    if (!Array.isArray(I.data.tagescoach)) I.data.tagescoach = [];
    const f = V83().eintragPruefen(e); if (f) return f;
    await I.upsert("tagescoach", e);
    MEMO = null;
    return null;
  }
  const finde = (id) => { const R = U.pruefen(); return R ? R.vorschlaege.find((p) => p.id === id) || null : null; };
  /** Vorschlag annehmen (Option o): Mein Plan ändern, dann den Entscheid speichern. → Fehlertext oder null */
  U.annehmen = async function (id, o) {
    if (!bereit()) return "Seite noch nicht bereit";
    const p = finde(id); if (!p) return "Vorschlag nicht mehr aktuell";
    const opt = p.optionen[o || 0]; if (!opt) return "Option nicht gefunden";
    const f = await U66().aendernFolge(p.mo, opt.aktionen); if (f) return f;
    const g = await sichern(V83().eintrag(p, { status: "angenommen", option: o || 0, jetzt: new Date().toISOString() }));
    neuZeichnen();
    return g;
  };
  U.ablehnen = async function (id) {
    if (!bereit()) return "Seite noch nicht bereit";
    const p = finde(id); if (!p) return "Vorschlag nicht mehr aktuell";
    const g = await sichern(V83().eintrag(p, { status: "abgelehnt", jetzt: new Date().toISOString() }));
    neuZeichnen();
    return g;
  };
  /** Angenommenen Vorschlag zurückholen (Rückweg anwenden). Geht nur, solange die betroffenen Tage nicht vorbei sind. → Fehlertext oder null */
  U.zurueck = async function (id) {
    if (!bereit()) return "Seite noch nicht bereit";
    const e = U.entscheide().get(id); if (!e || e.status !== "angenommen") return "nichts zurückzuholen";
    if ((e.rueck || []).some((a) => a.date < heute() || (a.nach && a.nach < heute()))) return "Ein betroffener Tag ist schon vorbei – ändern im Tagesblatt.";
    const f = await U66().aendernFolge(e.woche, e.rueck); if (f) return `Zurückholen ging nicht (${f}) – seither geändert? Ändern im Tagesblatt.`;
    const g = await sichern(Object.assign({}, e, { status: "zurueck", am: new Date().toISOString() }));
    neuZeichnen();
    return g;
  };

  /* ---------------- Anzeige ---------------- */
  const wtLang = (iso) => ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"][(new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7];
  function vorschlagHTML(p) {
    const o2 = p.optionen[1];
    return `<div class="co-v" data-co-id="${esc(p.id)}">
      <div class="co-kopf"><b>${esc(p.titel)}</b><small>${esc(ANLASS_WORT[p.anlass] || p.anlass)}</small></div>
      <ul class="co-gruende">${p.grund.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
      <p class="co-opt"><span>Vorschlag:</span> ${esc(p.optionen[0].titel)}</p>
      <div class="row co-knoepfe"><button type="button" class="btn primary" data-co="an" data-id="${esc(p.id)}" data-o="0">Annehmen</button>
        ${o2 ? `<button type="button" class="btn" data-co="an" data-id="${esc(p.id)}" data-o="1" title="${esc(o2.titel)}">Lieber ${o2.art === "locker" ? "locker" : "so"}</button>` : ""}
        <button type="button" class="btn" data-co="ab" data-id="${esc(p.id)}">Ablehnen</button></div>
      <p class="co-fehler warn-t" role="status" hidden></p></div>`;
  }
  function angenommenHTML(liste) {
    if (!liste.length) return "";
    return `<h3 class="abschnitt">Angenommen</h3><ul class="co-ok">${liste.map((e) => `<li><span>✓ ${esc(wtLang(e.date).slice(0, 2))}: ${esc(e.option || e.titel)}</span>
      ${(e.rueck || []).every((a) => a.date >= heute() && (!a.nach || a.nach >= heute())) ? `<button type="button" class="btn co-zurueck" data-co="zurueck" data-id="${esc(e.id)}">Rückgängig</button>` : ""}</li>`).join("")}</ul>`;
  }
  /** Karte «Coach» auf Heute. */
  U.heute = function () {
    const box = document.getElementById("coach"); if (!box || !bereit()) return;
    const R = U.pruefen(); if (!R) { box.innerHTML = `<p class="hint">Coach nicht berechenbar.</p>`; return; }
    const h = heute(), mo = V64().montag(h);
    const ok = [...U.entscheide().values()].filter((e) => e.status === "angenommen" && (e.woche === mo || e.woche === V64().addDays(mo, 7)) && e.date >= V64().addDays(h, -6))
      .sort((a, b) => a.date.localeCompare(b.date));
    const pl = R.probelauf ? `<p class="co-probe keep">Probelauf bis ${esc(C.dateCH ? C.dateCH(C.D.config.enduco_bis) : C.D.config.enduco_bis)}: Du trainierst noch nach Enduco. Die Vorschläge zeigen, wie der Coach arbeitet; Annehmen ändert nur Mein Plan.</p>` : "";
    const kern = R.vorschlaege.length ? R.vorschlaege.map(vorschlagHTML).join("")
      : `<p class="verdict keep">Keine Änderung nötig – ${esc(R.morgen && R.morgen.status === "fehlt" ? "Plan und Verfügbarkeit passen; die Morgenwerte von heute fehlen noch" : "Plan, Erholung und Verfügbarkeit passen")}.</p>`;
    box.innerHTML = `${pl}${kern}${angenommenHTML(ok)}<p id="co-status" class="warn-t" role="status" hidden></p>
      <p class="co-geprueft keep">Geprüft: ${esc(R.geprueft.join(" · "))}.</p>${R.hinweise.map((h) => `<p class="hint">${esc(h)}</p>`).join("")}
      <p class="hint">Der Coach prüft nach dem Morgen-Update, nach dem Check-in, nach jeder neuen Einheit und wenn sich deine Zeit ändert. Jede Änderung ist ein Vorschlag:
        Annehmen ändert Mein Plan, Rückgängig holt den Stand davor zurück (${esc(R.v)}). Gesperrte Tage und Einheiten, Tests und Rennen bleiben immer.</p>`;
    const card = document.getElementById("coach-card"); if (card) card.hidden = false;
  };
  /** Vorschläge eines Tages im Tagesblatt. */
  U.tag = function (ds) {
    if (!bereit()) return "";
    const R = U.pruefen(); if (!R) return "";
    const L = R.vorschlaege.filter((p) => p.date === ds || p.optionen.some((o) => o.aktionen.some((a) => a.date === ds || a.nach === ds)));
    return L.length ? `<div class="co-tag"><h3 class="abschnitt">${V6().icon("coach", 16)} Vorschlag des Coaches</h3>${L.map(vorschlagHTML).join("")}</div>` : "";
  };
  document.addEventListener("click", async (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-co]") : null; if (!b) return;
    ev.preventDefault();
    const id = b.dataset.id, art = b.dataset.co, box = b.closest(".co-v"), fe = box ? box.querySelector(".co-fehler") : null;
    b.disabled = true;
    let f = null;
    try { f = art === "an" ? await U.annehmen(id, Number(b.dataset.o || 0)) : art === "ab" ? await U.ablehnen(id) : art === "zurueck" ? await U.zurueck(id) : null; }
    catch (e) { console.error(e); f = "Ging nicht – bitte nochmals versuchen."; }
    b.disabled = false;
    if (f) { const st = fe || document.getElementById("co-status"); if (st) { st.textContent = f; st.hidden = false; } else console.error(f); return; }
    U.heute();
  });
  document.addEventListener("meinplan", () => { try { U.heute(); } catch (e) { console.error(e); } });
})();
