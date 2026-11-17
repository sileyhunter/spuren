/* Ironman Notebook V7.2 – Oberfläche Schwimmen (uebungen-2.1, schwimmeinheit-1.1 seit V7.3.2): Schwimm-Einheit wie im Becken (Blöcke mit Metern, Bahnen,
   Pause am Beckenrand, Tempo oder Anstrengung, Hilfsmittel), Technikübungen aufklappbar, jede Übung als Blatt (Zweck, Ablauf, worauf achten,
   Fehler, Hilfsmittel), Übungskatalog mit Filtern. Rechenteile in js/schwimmen.js. */
(function () {
  "use strict";
  const U = (window.SWUI = window.SWUI || {});
  const SW = () => window.SW, V6 = () => window.V6, V59 = () => window.V59, UI = () => window.V5UI;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const dauer = (s) => (isNum(s) ? (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.round((s % 3600) / 60)).padStart(2, "0")} h` : `${Math.max(1, Math.round(s / 60))} min`) : "");
  const ZK = { z1: "zc-z1", z2: "zc-z2", z3: "zc-z3", css: "zc-z4", tech: "zc-z2", max: "zc-z5" };
  const ZN = { z1: "Z1 · locker", z2: "Z2 · Grundlage", z3: "Z3 · zügig", css: "CSS", tech: "Technik", max: "Test" };
  const store = { get(k) { try { return localStorage.getItem((window.SPUREN_DEMO ? "demo." : "") + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem((window.SPUREN_DEMO ? "demo." : "") + k, v); } catch (e) { /* */ } } };
  /** Beckenlänge: Wahl auf diesem Gerät, sonst die häufigste in deinen Enduco-Schwimm-Workouts, sonst 25 m. */
  U.becken = function () {
    const w = +store.get("sf.sw.becken"); if (w === 25 || w === 50) return w;
    const C = UI() && UI().C, B = C && C.D && C.D.enduco_bib && C.D.enduco_bib.workouts, n = { 25: 0, 50: 0 };
    if (B) for (const k in B) for (const v of (B[k].versionen || [])) if (v && (v.pool_m === 25 || v.pool_m === 50)) n[v.pool_m]++;
    return n[50] > n[25] ? 50 : 25;
  };
  const geraet = (h, frei) => `<span class="sw-hm${frei ? " frei" : ""}" title="${frei ? "freiwillig" : "nötig"}">${esc(SW().HILFSMITTEL[h] || h)}${frei ? " (freiw.)" : ""}</span>`;
  function teilHTML(t, pool) {
    const u = t.uebung ? SW().uebung(t.uebung) : null, L = SW().bahnen(t.m, pool);
    const ziel = t.tempo ? `${esc(t.tempo)}` : t.rpe ? esc(t.rpe) : "";
    return `<li class="sw-t" style="--zc:var(--${ZK[t.zone] || "zc-z2"})">
      <div class="sw-t-k"><b>${t.wdh > 1 ? `${t.wdh} × ` : ""}${t.m ? `${String(t.m).replace(".", ",")} m` : ""}</b>${L ? `<small>${esc(L)}</small>` : ""}${isNum(t.schwimm_s) && t.m ? `<small>≈ ${esc(dauer(t.schwimm_s))}</small>` : ""}</div>
      <div class="sw-t-m"><span>${esc(t.text || "")}</span>${ziel ? `<small>${ziel}</small>` : ""}
        ${(t.hilfsmittel || []).length || (t.frei || []).length ? `<span class="sw-hms">${(t.hilfsmittel || []).map((h) => geraet(h)).join("")}${(t.frei || []).map((h) => geraet(h, true)).join("")}</span>` : ""}
        ${t.zuende_m ? `<small>dann ${String(t.zuende_m).replace(".", ",")} m locker zu Ende schwimmen</small>` : ""}${t.pause_s ? `<small>${t.pause_s >= 60 ? dauer(t.pause_s) : t.pause_s + " s"} Pause am Beckenrand</small>` : ""}</div>
      <div class="sw-t-r"><span class="zchip sw-z" style="--zc:var(--${ZK[t.zone] || "zc-z2"})">${esc(ZN[t.zone] || "")}</span>${u ? `<button type="button" class="sw-i" data-swu="${esc(u.id)}" aria-label="Übung erklären: ${esc(u.name)}">i</button>` : ""}</div></li>`;
  }
  /** Schwimm-Einheit als HTML (Blöcke, Technikübungen aufklappbar). */
  U.html = function (S) {
    if (!S) return "";
    const kv = [S.meter ? [`${S.meter.toLocaleString("de-CH")} m`, "Umfang"] : null, S.dauer_s ? [`≈ ${dauer(S.dauer_s)}`, "Dauer"] : null, [`${S.pool} m`, "Becken"]].filter(Boolean);
    const blk = (b) => {
      const inner = `<ol class="sw-teile">${b.teile.map((t) => teilHTML(t, S.pool)).join("")}</ol>`;
      return b.id === "technik" ? `<details class="sw-block sw-technik" open><summary>${V6() ? V6().sportIcon("schwimm", 16) : ""} Technikübungen</summary>${inner}</details>`
        : `<div class="sw-block"><h4 class="sw-bt">${esc(b.titel)}</h4>${inner}</div>`;
    };
    return `<div class="kv ek-kv">${kv.map(([w, l]) => `<div><b>${esc(w)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      ${S.hilfsmittel.length || S.frei.length ? `<p class="sw-mit">Mitnehmen: ${S.hilfsmittel.map((h) => geraet(h)).join("")}${S.frei.map((h) => geraet(h, true)).join("")}</p>` : ""}
      ${S.bloecke.map(blk).join("")}
      <div class="row sw-becken" role="group" aria-label="Beckenlänge"><span class="hint">Becken</span>${[25, 50].map((p) => `<button type="button" class="chip" data-swpool="${p}" aria-pressed="${S.pool === p}">${p} m</button>`).join("")}</div>
      <p class="hint">${esc(SW().VERSIONS.einheit)}: ${S.umfang_quelle ? `Umfang ${esc(S.umfang_quelle)}` : "ohne CSS-Test und ohne Becken-Einheiten: Meter als Richtwert, Dauer offen"}. Tempo nur aus dem CSS-Test (locker CSS + 15–20 s, Grundlage CSS + 8–12 s, Annahmen); ohne Test nach Anstrengung (RPE). Jede Woche drei andere Übungen aus deinen Enduco-Einheiten, Strecke und Pause (5 s) wie dort. «i» erklärt eine Übung.</p>`;
  };
  /** Knöpfe binden: Übung erklären, Beckenlänge wechseln (neu = Funktion, die das Blatt neu zeichnet). */
  U.binden = function (ov, neu, zurueck) {
    ov.querySelectorAll("[data-swu]").forEach((b) => (b.onclick = () => U.uebungBlatt(b.dataset.swu, zurueck)));
    ov.querySelectorAll("[data-swpool]").forEach((b) => (b.onclick = () => { store.set("sf.sw.becken", b.dataset.swpool); if (neu) neu(); }));
  };
  function uebungInhalt(u) {
    const S = SW();
    return `<p class="ek-text"><b>Wofür:</b> ${esc(u.zweck)}</p>
      <h3 class="abschnitt">So geht's</h3><ol class="sw-ablauf">${u.ablauf.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
      <h3 class="abschnitt">Worauf achten</h3><ul class="sw-achten">${u.achten.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3 class="abschnitt">Typische Fehler</h3><ul class="sw-fehler">${u.fehler.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3 class="abschnitt">Hilfsmittel</h3><p class="sw-mit">${u.h.noetig.length || u.h.frei.length ? u.h.noetig.map((h) => geraet(h)).join("") + u.h.frei.map((h) => geraet(h, true)).join("") : "keine"}</p>
      ${S.ENDUCO[u.id] ? `<p class="hint">Aus deinen Enduco-Einheiten: ${String(S.ENDUCO[u.id][0]).replace(".", ",")} m Übung, dann die Bahn locker fertig schwimmen${S.ENDUCO[u.id][1] ? `; in der Abwechslung unter «${esc(S.ROTATION_NAME[S.ROTATION_KEYS.indexOf(S.ENDUCO[u.id][1])])}»` : "; nicht in der wöchentlichen Abwechslung"}.</p>` : ""}
      <p class="hint">Schwerpunkt: ${u.s.map((k) => esc(S.SCHWERPUNKTE[k] || k)).join(", ")} · übliche Dosierung: ${esc(u.dos)} (${esc(S.VERSIONS.uebungen)}, eigene Beschreibung).</p>`;
  }
  /** Eine Übung als Blatt; zurueck() öffnet das vorige Blatt wieder. */
  U.uebungBlatt = function (id, zurueck) {
    const u = SW() && SW().uebung(id); if (!u || !V59()) return;
    const ov = V59().blatt("sw-uebung", `<h2 id="v59-ov-h" tabindex="-1">${esc(u.name)}</h2>${uebungInhalt(u)}
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${V6() ? V6().icon("zurueck", 22) : "‹"}</button></div>`);
    if (zurueck) ov.querySelectorAll("[data-x]").forEach((b) => (b.onclick = zurueck));
  };
  /** Katalog aller Übungen mit Filter (Hilfsmittel, Schwerpunkt) – Karte «Technikübungen» unter Analyse → Schwimmen. */
  U.katalog = function (box) {
    if (!box || !SW()) return;
    const S = SW(), f = { hilfsmittel: store.get("sf.sw.f.h") || "", schwerpunkt: store.get("sf.sw.f.s") || "" };
    const zeichnen = () => {
      const L = S.filtern({ hilfsmittel: f.hilfsmittel || null, schwerpunkt: f.schwerpunkt || null });
      box.innerHTML = `<div class="row sw-filter"><label>Hilfsmittel <select data-swf="h"><option value="">alle</option><option value="ohne"${f.hilfsmittel === "ohne" ? " selected" : ""}>ohne Hilfsmittel</option>
          ${["brett", "pullbuoy", "flossen", "paddles"].map((k) => `<option value="${k}"${f.hilfsmittel === k ? " selected" : ""}>${esc(S.HILFSMITTEL[k])}</option>`).join("")}</select></label>
        <label>Schwerpunkt <select data-swf="s"><option value="">alle</option>${Object.entries(S.SCHWERPUNKTE).map(([k, n]) => `<option value="${k}"${f.schwerpunkt === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label></div>
        <p class="hint">${L.length} von ${S.UEBUNGEN.length} Übungen. Antippen zum Aufklappen.</p>
        <div class="sw-katalog">${L.map((u) => `<details class="sw-k"><summary><b>${esc(u.name)}</b><small>${u.h.noetig.length ? u.h.noetig.map((h) => esc(S.HILFSMITTEL[h])).join(", ") : "ohne Hilfsmittel"} · ${u.s.slice(0, 2).map((k) => esc(S.SCHWERPUNKTE[k])).join(", ")}</small></summary>${uebungInhalt(u)}</details>`).join("")}</div>`;
      box.querySelectorAll("[data-swf]").forEach((s) => (s.onchange = () => { if (s.dataset.swf === "h") { f.hilfsmittel = s.value; store.set("sf.sw.f.h", s.value); } else { f.schwerpunkt = s.value; store.set("sf.sw.f.s", s.value); } zeichnen(); }));
    };
    zeichnen();
  };
  /** Kalenderwoche (für die wechselnden Übungen). */
  U.woche = function (iso) { const d = new Date(String(iso || "") + "T12:00:00Z"); if (isNaN(d)) return 0; const t = new Date(d); t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7)); const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - j) / 864e5 - 3 + ((j.getUTCDay() + 6) % 7)) / 7); };
})();
