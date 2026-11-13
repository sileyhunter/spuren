/* V6.4 Etappe 4 · Oberfläche: Plan → «Woche nach Modell» und «Trainingsmodell», Ansicht «Wissen» (Plan → Wissen).
   Rechenlogik in js/v64.js (modell-1.0, wochenplan-1.1, tid-1.0, intensitaet-1.0, aufbau-1.0), Inhalte in js/wissen.js (wissen-1.2).
   V6.4.2: Karte «Aufbau-Check» (Plan) und «Intensität je Sportart» im Trainingsmodell (gespeichert im selben Eintrag «modell»).
   Das Modell wird verschlüsselt über «Direkt speichern» gespeichert (Liste «modell» → plan_modell). Die Seite schreibt nichts nach
   Garmin oder Enduco; der Wochenvorschlag steht neben dem Enduco-Plan. Links mit data-wissen="<Kapitel>" öffnen das Wissen überall. */
(function () {
  "use strict";
  const M = (window.V64UI = window.V64UI || {});
  const $ = (id) => document.getElementById(id);
  const V64 = () => window.V64, WS = () => window.WS, V6 = () => window.V6, AN = () => window.AN, FK = () => window.FK, TR = () => window.TR;
  const UI = () => window.V5UI, V59 = () => window.V59, H = () => window.V6H;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null, WOCHE = 0, LETZTE = null;
  const heuteISO = () => C.iso(C.today);
  const dkurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  const dch = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}.${+m}.${y}`; };
  const hm = (min) => { const m = Math.round(min); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
  const komma = (x) => String(x).replace(".", ",");
  const tagText = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
  const SPORT_WORT = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen", wandern: "Wandern", ski: "Ski", kraft: "Kraft", andere: "Training" };
  const spFarbe = (sp) => `var(--sp-${["rad", "lauf", "schwimm", "wandern", "ski"].includes(sp) ? sp : "andere"})`;
  const ZKURZ = { z1: "Z1", z2: "Z2", renntempo: "Renntempo", z3: "Z3 Tempo", z3o: "unter LT2", vo2: "VO2max", css: "CSS", test: "Test" };
  const STUFE = { test: 0, pause: 0, z1: 1, z2: 2, renntempo: 2.5, z3: 3, z3o: 3.5, css: 4, vo2: 5 };
  const POS = { pause: 0.25, z1: 0.5, z2: 1.5, renntempo: 1.9, z3: 2.5, z3o: 2.9, css: 3.6, vo2: 4.3, test: 2.2 };
  const FARB3 = { locker: "--zc-z2", mittel: "--zc-z3", hart: "--zc-z5" };

  /* ---------- Daten ---------- */
  function wahlEintrag() {
    const f = (L) => (L || []).find((e) => e && e.id === "modell") || null;
    return f((UI().Inbox.data || {}).modell) || f(C.D.plan_modell);
  }
  const rennen = () => V6().rennenPrio(C.races ? C.races() : []);
  function saison() { try { return AN().saison(heuteISO(), rennen()); } catch (e) { console.error(e); return null; } }
  function cssAktuell() {
    const L = (UI().merged ? UI().merged("css_tests", "css") : C.D.css_tests || []).filter((c) => c && c.datum && isNum(c.t400) && isNum(c.t200)).sort((a, b) => b.datum.localeCompare(a.datum));
    const v = L[0] ? FK().css(L[0].t400, L[0].t200) : null;
    return isNum(v) ? { s: v, datum: L[0].datum } : null;
  }
  /** Woche nach Modell (0 = diese, 1 = nächste) mit Phase und Stunden aus saison-1.0, Tests aus testplan-1.0, Rennen und CSS. */
  function kontext(offset) {
    const V = V64(), h = heuteISO(), mo = V.addDays(V.montag(h), 7 * offset), S = saison();
    const lokal = window.V56 && window.V56.saisonLokal ? window.V56.saisonLokal(C) : {};
    const vg = AN().saisonVorgaben(C.D.activities, h, lokal);
    let phase = "Grundlage", erholung = false, stunden = vg.jetzt, ausSaison = false;
    if (S) {
      const i = S.wochen.findIndex((w) => w.woche === mo);
      if (i >= 0) { phase = S.wochen[i].phase; erholung = !!S.wochen[i].erholung; stunden = AN().saisonStunden(S.wochen, vg.jetzt, vg.spitze)[i]; ausSaison = true; }
    }
    const wahl = V.wahl(wahlEintrag(), S && S.haupt ? S.haupt.date : null), modell = V.modellFuer(wahl, mo);
    const tests = (C.tests ? C.tests() : []).filter((t) => t && t.date >= mo && t.date <= V.addDays(mo, 6));
    const css = cssAktuell(), sk = TR() ? TR().zonen(C.D.zonen).skalen : null;
    const w = V.woche({ woche: mo, phase, erholung, stunden, modell, tests, rennen: rennen(), css_s: css ? css.s : null,
      intensitaet: V.intensitaet(wahlEintrag()), laeufe: V.laeufe(C.D.activities), heute: h, skalen: sk });
    return { w, wahl, S, css, vg, ausSaison };
  }
  /** Enduco-Plan der Woche (Garmin-Kalender): Stunden und Verteilung aus den Workout-Schritten (Rad und Laufen). */
  function enducoWoche(mo) {
    const bis = V64().addDays(mo, 6), P = (C.D.planned || []).filter((p) => p && p.date >= mo && p.date <= bis);
    const z = { locker: 0, mittel: 0, hart: 0, offen: 0 }, stufen = []; let s = 0, mit = 0, ohne = 0;
    for (const p of P) {
      const e = H() && H().profilVon ? H().profilVon(p) : null, d = e ? e.dauer : p.dur_s;
      if (isNum(d)) s += d;
      if (["schwimm", "rad", "lauf"].includes(p.sport)) stufen.push({ p, st: V64().planStufe(e && e.pr ? e.pr.balken : null, `${p.title || ""} ${p.desc || ""}`) });
      if (p.sport !== "rad" && p.sport !== "lauf") continue;
      if (e && e.pr && e.pr.balken.length) { const t = V64().tidAusBalken(e.pr.balken); for (const k in z) z[k] += t[k]; mit++; } else ohne++;
    }
    return { P, stunden: s / 3600, z, mit, ohne, stufen };
  }
  /** Absolviert, letzte 4 Wochen, Rad und Laufen: Puls in den Bereichen des aktiven Zonenprofils (sonst Garmin-Zonen). */
  function istTid() {
    const h = heuteISO(), von = FK().addDays(h, -27), z = [0, 0, 0], g = [0, 0, 0]; let n = 0, ng = 0;
    for (const sp of ["rad", "lauf"]) {
      const S = FK().zoneSummary(C.D.activities, C.D.zonen, sp, von, h);
      S.profil.z.forEach((v, j) => (z[j] += v)); n += S.profil.n; S.garmin.z.forEach((v, j) => (g[j] += v)); ng += S.garmin.n;
    }
    const q = n ? z : g;
    return { z: { locker: q[0], mittel: q[1], hart: q[2] }, n: n || ng, basis: n ? "profil" : ng ? "garmin" : null };
  }

  /* ---------- Bausteine der Anzeige ---------- */
  function zFarbe(k) { const Z = V6().ZONEN[V64().FARBE[k] || "offen"] || V6().ZONEN.offen; return Z.farbe; }
  function chip(k) { const f = zFarbe(k); return `<span class="zchip" style="--zc:${f};background:${V6().rgba(f, 0.2)}">${esc(ZKURZ[k] || k)}</span>`; }
  function hauptKey(e) { let best = null; for (const [k] of e.teile) if (STUFE[k] != null && (best == null || STUFE[k] > STUFE[best])) best = k; return best; }
  /** Balkenprofil eines Vorschlags im Format von V6.profil (für V6.profilSVG). */
  function profil(e) {
    let t = 0; const balken = e.teile.map(([k, m]) => { const b = { x0: t, w: m * 60, d: m * 60, key: V64().FARBE[k] || "offen", h: Math.max(0.12, Math.min(1, 0.1 + 0.9 * ((POS[k] ?? 1) / 5))) }; t += m * 60; return b; });
    return { balken, breite_s: t, dauer_s: t };
  }
  function quelleLi(id) {
    const q = WS() && WS().QUELLEN[id]; if (!q) return "";
    const l = WS().link(id);
    return `<li>${l ? `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(q.zit)}</a>` : `<b>${esc(q.zit)}</b>`} – ${esc(q.kern)}</li>`;
  }
  function tidZeile(name, t, zusatz) {
    if (!t) return `<div class="mo-tz leer"><div class="mo-tk2"><span class="mo-tn">${esc(name)}</span></div><p class="mo-leer">${esc(zusatz || "keine Zeiten mit Zielbereich")}</p></div>`;
    const seg = ["locker", "mittel", "hart"].map((k, i) => (t.anteil[i] > 0 ? `<i style="flex:${t.anteil[i].toFixed(4)};background:var(${FARB3[k]})"></i>` : "")).join("");
    return `<div class="mo-tz"><div class="mo-tk2"><span class="mo-tn">${esc(name)}</span><span class="mo-tm">${esc(t.muster)}${t.pi != null ? ` · PI ${komma(t.pi.toFixed(2))}` : ""}</span></div>
      <div class="mo-bar" role="img" aria-label="${esc(name)}: ${t.pct[0]} % locker, ${t.pct[1]} % mittel, ${t.pct[2]} % hart">${seg}</div>
      <div class="mo-tp"><span><i style="background:var(${FARB3.locker})"></i>${t.pct[0]} % locker</span><span><i style="background:var(${FARB3.mittel})"></i>${t.pct[1]} % mittel</span><span><i style="background:var(${FARB3.hart})"></i>${t.pct[2]} % hart</span></div>
      ${zusatz ? `<small class="mo-tz-z">${esc(zusatz)}</small>` : ""}</div>`;
  }

  /* ---------- Plan: Zeichnen ---------- */
  M.zeichnen = function () {
    C = UI() && UI().C; if (!C || !V64() || !V6() || !AN()) return;
    try { V6().farbenLesen(); } catch (e) { /* ohne Farben weiter */ }
    try { wocheZeichnen(); } catch (e) { console.error(e); const b = $("mo-woche"); if (b) b.innerHTML = `<p class="warn-t">Wochenvorschlag nicht berechenbar.</p>`; }
    try { modellZeichnen(); } catch (e) { console.error(e); }
    try { aufbauZeichnen(); } catch (e) { console.error(e); const b = $("ab-inhalt"); if (b) b.innerHTML = `<p class="warn-t">Aufbau-Check nicht berechenbar.</p>`; }
  };

  function wocheZeichnen() {
    const box = $("mo-woche"); if (!box) return;
    const K = (LETZTE = kontext(WOCHE)), w = K.w, E = enducoWoche(w.woche), h = heuteISO(), V = V64();
    const planDauer = (p) => (H() && H().planDauer ? H().planDauer(p) : p.dur_s);
    const tage = w.tage.map((t, ti) => {
      const ist = (C.D.activities || []).filter((a) => a.date === t.date), plan = E.P.filter((p) => p.date === t.date);
      const vor = t.rennen ? `<div class="mo-rennen">${V6().icon("flagge", 17)}<b>${esc(t.rennen.name)}</b>${t.rennen.prio ? `<span class="pl-prio">${esc(t.rennen.prio)}</span>` : ""}</div>`
        : !t.einheiten.length ? `<span class="mo-frei">${esc(t.notiz || "frei")}</span>`
        : t.einheiten.map((e, ei) => `<button type="button" class="mo-e${e.art === "test" ? " test" : ""}" data-moe="${ti}:${ei}">
            <span class="mo-sp" style="--sp:${spFarbe(e.sport)}">${V6().sportIcon(e.sport, 16)}</span>
            <span class="mo-et"><b>${esc(e.titel)}</b><small>${hm(e.dauer)} h${e.check ? " · mit Laktat-Check" : ""}${e.ersetzt ? " · statt " + esc(e.ersetzt) : ""}${e.gekappt ? " · statt " + esc(e.gekappt) : ""}${e.vorTest ? " · locker vor dem Test" : ""}</small></span>
            ${hauptKey(e) ? chip(hauptKey(e)) : ""}</button>`).join("");
      const end = plan.length ? `<p class="mo-neben"><span class="mo-q">Enduco</span>${plan.map((p) => { const d = planDauer(p); return `${esc(p.title || SPORT_WORT[p.sport] || "Einheit")}${isNum(d) ? " " + hm(d / 60) : ""}`; }).join(" · ")}</p>` : "";
      const done = ist.length ? `<p class="mo-neben ist"><span class="mo-q">absolviert</span>${ist.map((a) => `${esc(SPORT_WORT[a.sport] || a.sport)} ${hm((a.mv || a.dur || 0) / 60)}`).join(" · ")}</p>` : "";
      return `<li class="mo-tag${t.date === h ? " heute" : ""}${t.date < h ? " vorbei" : ""}"><div class="mo-tk"><b>${esc(t.wt)}</b><small>${esc(dkurz(t.date))}</small></div><div class="mo-te">${vor}${end}${done}</div></li>`;
    }).join("");
    const tE = V.tid(E.z), pE = tE ? V.pruefen(w.modell, tE, { erholung: w.erholung, taper: w.taper, rennwoche: w.tage.some((t) => t.rennen) }) : null;
    const I = istTid(), tI = V.tid(I.z);
    const offen = E.z.offen ? ` · ${Math.round(E.z.offen / 60)} min ohne Zielbereich` : "";
    const kw = V6().isoWoche(w.woche), WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const konflikt = E.stufen.filter((x) => x.st && V.RANG[x.st.stufe] > V.RANG[w.intensitaet[x.p.sport]]).map((x) =>
      `<li>${esc(WT[new Date(x.p.date + "T12:00:00").getDay()])} ${esc(dkurz(x.p.date))} · ${esc(SPORT_WORT[x.p.sport])} «${esc(String(x.p.title || "Einheit").trim())}»: ${x.st.stufe === "alles" ? "harte Abschnitte" : "Tempo oder Schwelle"}${x.st.quelle === "titel" ? " (laut Titel)" : ""} – du hast «${esc(V.STUFE_TEXT[w.intensitaet[x.p.sport]])}» gewählt</li>`).join("");
    box.innerHTML = `<div class="seg mo-seg" role="group" aria-label="Woche wählen"><button type="button" data-mow="0" aria-pressed="${WOCHE === 0}">Diese Woche</button><button type="button" data-mow="1" aria-pressed="${WOCHE === 1}">Nächste Woche</button></div>
      <p class="mo-titel keep">KW ${kw} · ${esc(dkurz(w.woche))}–${esc(dkurz(V.addDays(w.woche, 6)))} · <b>${esc(w.modellName)}</b> · ${esc(w.phase)}${w.erholung ? " · Erholungswoche" : ""}</p>
      <div class="kv mo-kv"><div><b>${hm(w.minuten.total)} h</b><span>Vorschlag</span></div><div><b>${E.stunden ? hm(E.stunden * 60) + " h" : "–"}</b><span>Enduco geplant</span></div><div><b>${isNum(w.stunden) ? hm(w.stunden * 60) + " h" : "–"}</b><span>laut Phase</span></div></div>
      <ol class="mo-tage">${tage}</ol>
      <h3 class="abschnitt">Intensität Rad und Laufen</h3>
      <div class="mo-tid">${tidZeile("Vorschlag", w.tid, w.pruefung.text)}
        ${tidZeile("Enduco geplant", tE, tE ? (pE && pE.text ? pE.text : "") + offen : E.P.length ? "Keine Rad- oder Lauf-Workouts mit Schritten in dieser Woche." : "Nichts im Garmin-Kalender für diese Woche.")}
        ${tidZeile("Absolviert, letzte 4 Wochen", tI, tI ? `${I.n} Einheiten, nach Puls${I.basis === "garmin" ? " (Garmin-Zonen, andere Grenzen)" : ""} – zählt harte Anteile eher zu tief` : "Keine Einheiten mit Pulszonen in den letzten 4 Wochen.")}</div>
      ${w.hinweise.length ? `<ul class="mo-hinweise">${w.hinweise.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${konflikt ? `<h3 class="abschnitt">Enduco und deine Intensität je Sportart</h3><ul class="mo-hinweise mo-konflikt">${konflikt}</ul>
        <p class="hint">Enduco lässt sich hier nicht ändern; die Seite zeigt nur, wo sein Plan über deiner Wahl liegt (${esc(V.VERSIONS.intensitaet)}: aus den Zielen der Schritte, ohne Ziele aus dem Titel).</p>` : ""}
      <div class="row mo-knoepfe"><button type="button" class="btn" data-wissen="modelle">Vorschlag erklärt</button><button type="button" class="btn" data-wissen="tid">Verteilung erklärt</button></div>
      <p class="hint">Vorschlag neben Enduco (${esc(V.VERSIONS.woche)}, ${esc(V.VERSIONS.tid)}): Phase und Stunden aus dem Wochenstunden-Vorschlag${K.ausSaison ? "" : " (Woche ausserhalb der Saisonplanung: Stunden «jetzt»)"}, Tests aus dem Testkalender, Ziele aus dem aktiven Zonenprofil${K.css ? `, CSS vom ${esc(dch(K.css.datum))}` : ", noch kein CSS-Test"}. Vorschlag und Enduco werden nach den Zielen der Abschnitte gezählt (nur die Arbeitsintervalle hart), Absolviertes nach Puls. Nichts wird nach Garmin oder Enduco geschrieben.</p>`;
    box.querySelectorAll("[data-mow]").forEach((b) => (b.onclick = () => { WOCHE = +b.dataset.mow; wocheZeichnen(); }));
    box.querySelectorAll("[data-moe]").forEach((b) => (b.onclick = () => { const [ti, ei] = b.dataset.moe.split(":").map(Number); M.einheit(ti, ei); }));
  }

  /** Blatt einer vorgeschlagenen Einheit: Ablauf, Ziele aus dem Zonenprofil, Zweck und Quellen. */
  M.einheit = function (ti, ei) {
    C = C || (UI() && UI().C); if (!C || !LETZTE) return;
    const t = LETZTE.w.tage[ti], e = t && t.einheiten[ei]; if (!e) return;
    const W = V6(), sk = TR() ? TR().zonen(C.D.zonen).skalen : {}, css = LETZTE.css ? LETZTE.css.s : null;
    const ziele = V64().ziele(e, sk, css), ueber = Math.round(e.minuten.mittel + e.minuten.hart);
    const fehlt = e.sport === "schwimm" ? "noch kein CSS-Test: nach Gefühl" : "kein aktives Zonenprofil: nach Gefühl";
    const html = `<div class="ek-blatt-kopf"><span class="ek-sport gross" style="--sp:${spFarbe(e.sport)}">${W.sportIcon(e.sport, 28)}</span>
        <div><h2 id="v59-ov-h" tabindex="-1">${esc(e.titel)}</h2><p class="sub">${esc(tagText(t.date))} · Vorschlag «${esc(LETZTE.w.modellName)}»</p></div></div>
      <div class="kv ek-kv"><div><b>${hm(e.dauer)} h</b><span>Dauer</span></div>${(e.sport === "rad" || e.sport === "lauf") && e.art !== "test" ? `<div><b>${ueber} min</b><span>über LT1</span></div>` : ""}${e.check ? `<div><b>Laktat</b><span>Kurzcheck</span></div>` : ""}</div>
      <h3 class="abschnitt">${W.icon("ablauf", 15)}Ablauf</h3>
      ${e.art !== "test" ? W.profilSVG(profil(e), { gross: true, h: 96, label: "Ablauf: Breite = Dauer, Höhe und Farbe = Intensität" }) : ""}
      <ul class="mo-ablauf">${e.ablauf.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${ziele.length ? `<h3 class="abschnitt">${W.icon("fokus", 15)}Ziele</h3><ul class="mo-ziele">${ziele.map((z) => `<li>${chip(z.key)}<span>${z.text ? esc(z.text) : `<em>${esc(fehlt)}</em>`}</span></li>`).join("")}</ul>` : ""}
      <h3 class="abschnitt">Warum</h3><p class="ek-text">${esc(e.zweck)}</p>
      ${e.quellen.length ? `<ul class="mo-quellen">${e.quellen.map(quelleLi).join("")}</ul>` : ""}
      <p class="ek-quelle">Vorschlag nach ${esc(V64().VERSIONS.woche)} und ${esc(V64().VERSIONS.modell)}; Ziele aus dem aktiven Zonenprofil${ziele.some((z) => z.key === "renntempo") ? ", Renntempo = knapp unter LT1 (eigene Festlegung)" : ""}. Nur ein Vorschlag – geändert wird nichts in Garmin oder Enduco.</p>
      <div class="blatt-fuss"><button type="button" class="btn-zurueck" data-x aria-label="Zurück">${W.icon("zurueck", 22)}</button>
        <button type="button" class="btn primary gross" data-wissen="${esc(e.wissen)}">Im Wissen nachlesen</button></div>`;
    V59().blatt("modell-einheit", html);
  };

  function modellZeichnen() {
    const box = $("mo-wahl"); if (!box) return;
    const V = V64(), S = saison(), e = wahlEintrag(), wahl = V.wahl(e, S && S.haupt ? S.haupt.date : null);
    const jetzt = V.modellFuer(wahl, V.montag(heuteISO())), I = V.intensitaet(e);
    const zeile = (sp, name) => `<div class="mo-int-z"><span class="mo-int-n">${name}</span><div class="mo-int-seg" role="radiogroup" aria-label="${name}: höchste Intensität">${
      V.STUFEN.map((st) => `<label><input type="radio" name="i_${sp}" value="${st}"${I[sp] === st ? " checked" : ""}><span>${esc({ locker: "locker", schwelle: "Schwelle", alles: "alles" }[st])}</span></label>`).join("")}</div></div>`;
    const iText = [["schwimm", "Schwimmen"], ["rad", "Rad"], ["lauf", "Laufen"]].map(([sp, n]) => `${n} ${V.STUFE_TEXT[I[sp]]}`).join(" · ");
    const opts = V.REIHE.map((id) => { const Mo = V.MODELLE[id];
      return `<label class="mo-opt"><input type="radio" name="m" value="${id}"${id === wahl.modell ? " checked" : ""}><span><b>${esc(Mo.name)}${Mo.standard ? ` <em class="mo-std">Standard</em>` : ""}</b><small>${esc(Mo.kurz)}</small></span></label>`; }).join("");
    box.innerHTML = `<form id="mo-form" class="mo-form"><fieldset class="mo-liste"><legend class="mini-h">Modell</legend>${opts}</fieldset>
        <label class="mo-wechsel"${wahl.modell !== "kombiniert" ? " hidden" : ""}>Rennspezifisch ab<input type="date" name="w" value="${esc(wahl.wechsel)}" required></label>
        <fieldset class="mo-int"><legend class="mini-h">Intensität je Sportart</legend>${zeile("schwimm", "Schwimmen")}${zeile("rad", "Rad")}${zeile("lauf", "Laufen")}
          <small class="mo-int-h">Höchste Intensität je Sportart. «Schwelle» = bis Tempo und knapp unter LT2, im Schwimmen CSS – keine VO2max-Intervalle. «locker» = nur Grundlage (Renntempo zählt dazu). Im Schwimmen plant der Vorschlag ohnehin höchstens CSS.</small></fieldset>
        <div class="row mo-knoepfe"><button class="btn primary" type="submit">Übernehmen</button><button type="button" class="btn" data-wissen="modelle">Modelle erklärt</button></div></form>
      <p class="mo-jetzt keep" role="status">Diese Woche gilt <b>${esc(V.MODELLE[jetzt].name)}</b>${wahl.modell === "kombiniert" ? (jetzt === "polarisiert" ? `, ab ${esc(dch(wahl.wechsel))} rennspezifisch` : ` (seit ${esc(dch(wahl.wechsel))})`) : ""}.${e ? "" : " Standard – noch nicht gespeichert."}<br><span class="mo-int-jetzt">Intensität: ${esc(iText)}</span></p>
      <p class="hint">Gespeichert wird verschlüsselt mit «Direkt speichern» (${esc(V.VERSIONS.modell)}, ${esc(V.VERSIONS.intensitaet)}). Das Modell bestimmt die Schlüsseleinheiten im Wochenvorschlag; liegt eine über deiner Intensität je Sportart, nimmt der Vorschlag die nächst leichtere derselben Sportart und verschiebt nichts. Phase und Stunden bleiben wie im Wochenstunden-Vorschlag. Enduco und Garmin bleiben unverändert.</p>`;
    const f = $("mo-form");
    f.addEventListener("change", (ev) => { if (ev.target.name === "m") f.querySelector(".mo-wechsel").hidden = ev.target.value !== "kombiniert"; });
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const m = f.elements.m.value, w = f.elements.w.value;
      if (!V.MODELLE[m] || (m === "kombiniert" && !/^\d{4}-\d{2}-\d{2}$/.test(w))) return;
      const intensitaet = {}; for (const sp of ["schwimm", "rad", "lauf"]) { const x = f.elements["i_" + sp].value; intensitaet[sp] = V.STUFEN.includes(x) ? x : "alles"; }
      await UI().Inbox.upsert("modell", { id: "modell", modell: m, wechsel: m === "kombiniert" ? w : wahl.wechsel, intensitaet, v: V.VERSIONS.modell, vi: V.VERSIONS.intensitaet, geaendert: new Date().toISOString() });
      M.zeichnen();
    };
  }

  /* ---------- Aufbau-Check (aufbau-1.0) ---------- */
  const km1 = (x) => komma((Math.round(x * 10) / 10).toFixed(1));
  const tausend = (x) => Math.round(x).toLocaleString("de-CH");
  function aufbauZeichnen() {
    const box = $("ab-inhalt"); if (!box) return;
    const V = V64(), W = V6(), h = heuteISO(), A = V.aufbau(C.D.activities, h), g = A.grenze, jetzt = A.wochen[A.wochen.length - 1];
    const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], wt = (iso) => WT[new Date(iso + "T12:00:00").getDay()];
    const fuer = A.naechster === h ? "für einen Lauf heute" : "ab morgen";
    const kern = g ? `Höchstens 10 % über deinem längsten Lauf der letzten 30 Tage (<b>${km1(g.ref.km)} km</b> am ${esc(dkurz(g.ref.date))}). Er zählt bis ${esc(dkurz(g.bis))}; ${
        A.danach && isNum(A.danach.km) ? `danach höchstens <b>${km1(A.danach.km)} km</b> (${km1(A.danach.ref.km)} km vom ${esc(dkurz(A.danach.ref.date))}), wenn bis dahin kein längerer Lauf dazukommt.`
        : "danach fehlt ohne neue Läufe der Vergleich – dann kurz und locker wieder beginnen."}`
      : "In den letzten 30 Tagen kein Lauf: kein Vergleich möglich. Nach einer Pause kurz und locker wieder beginnen und erst dann verlängern.";
    // geplante Läufe (Enduco über Garmin), heute bis +13 Tage
    const bis = V.addDays(h, 13), plan = (C.D.planned || []).filter((p) => p && p.sport === "lauf" && p.date >= h && p.date <= bis).sort((a, b) => a.date.localeCompare(b.date));
    const planLi = plan.map((p) => {
      const e = H() && H().profilVon ? H().profilVon(p) : null, k = e ? V.planKm(e.wo) : null, gr = V.laufGrenze(A.laeufe, p.date, h);
      const hat = k && k.km > 0, d = e && isNum(e.dauer) ? e.dauer : p.dur_s;
      const urteil = !hat || !gr ? `<span class="ab-u offen">${!gr ? "kein Vergleich" : "Distanz offen"}</span>`
        : k.km > gr.km ? `<span class="ab-u ueber">über ${km1(gr.km)} km</span>` : k.vollst ? `<span class="ab-u ok">passt</span>` : `<span class="ab-u offen">bis hier passt</span>`;
      return `<li><span class="ab-pl"><b>${esc(wt(p.date))} ${esc(dkurz(p.date))}</b> ${esc(String(p.title || "Lauf").trim())}<small>${isNum(d) ? hm(d / 60) + " h" : "Dauer offen"}${hat ? ` · ${k.vollst ? "≈" : "mind. ≈"} ${km1(k.km)} km` : ""}</small></span>${urteil}</li>`;
    }).join("");
    // Sprünge der letzten 12 Wochen
    const sprLi = A.spruenge.map((r) => `<li><span class="ab-pl"><b>${esc(dkurz(r.date))} · ${km1(r.km)} km</b> +${Math.round(r.anteil * 100)} % gegenüber ${km1(r.ref.km)} km (${esc(dkurz(r.ref.date))})
        <small>${esc(V.KLASSE_TEXT[r.klasse])} · in der Studie rund ${komma(V.HRR[r.klasse].toFixed(1))}-mal so hohe Verletzungsrate</small></span></li>`).join("");
    // Verlauf: 12 Wochen je Sportart
    const reihe = (name, sp, werte, fmt, einheit) => {
      const max = Math.max(0, ...werte), n = werte.length;
      const bars = werte.map((v, i) => `<i class="${i === n - 1 ? "jetzt" : ""}" style="height:${max > 0 ? Math.max(v > 0 ? 5 : 0, Math.round((v / max) * 100)) : 0}%"></i>`).join("");
      return `<div class="ab-reihe"><div class="ab-rk"><span class="ab-rn" style="--sp:${spFarbe(sp)}">${W.sportIcon(sp, 15)}${esc(name)}</span><span class="ab-rw"><b>${fmt(werte[n - 1])}</b> ${einheit} diese Woche · Spitze ${fmt(max)} ${einheit}</span></div>
        <div class="ab-bars" style="--sp:${spFarbe(sp)}" role="img" aria-label="${esc(name)} je Woche, letzte ${n} Wochen: ${werte.map((v) => fmt(v)).join(", ")} ${einheit}">${bars}</div></div>`;
    };
    const Wk = A.wochen;
    box.innerHTML = `<div class="kv mo-kv"><div><b>${g ? km1(g.km) + " km" : "–"}</b><span>nächster Lauf höchstens</span></div><div><b>${g ? km1(g.ref.km) + " km" : "–"}</b><span>längster, 30 Tage</span></div><div><b>${km1(jetzt.lauf_km)} km</b><span>Laufen diese Woche</span></div></div>
      <p class="ab-kern keep" role="status">${kern} <span class="ab-fuer">(${fuer})</span></p>
      ${plan.length ? `<h3 class="abschnitt">Geplante Läufe (Enduco, 14 Tage)</h3><ul class="ab-liste">${planLi}</ul>` : ""}
      <h3 class="abschnitt">Sprünge der letzten 12 Wochen</h3>
      ${sprLi ? `<ul class="ab-liste">${sprLi}</ul>` : `<p class="ab-leer">Kein Lauf mehr als 10 % über dem längsten der 30 Tage davor.</p>`}
      <h3 class="abschnitt">Verlauf, 12 Wochen</h3>
      <div class="ab-verlauf">${reihe("Laufen", "lauf", Wk.map((w) => w.lauf_km), km1, "km")}${reihe("Schwimmen", "schwimm", Wk.map((w) => w.schwimm_m), tausend, "m")}${reihe("Rad", "rad", Wk.map((w) => w.rad_h * 60), hm, "h")}
        <div class="ab-achse"><span>vor 11 Wochen</span><span>diese Woche</span></div></div>
      <div class="row mo-knoepfe"><button type="button" class="btn" data-wissen="aufbau">Aufbau erklärt</button></div>
      <p class="hint">${esc(V.VERSIONS.aufbau)} nach Frandsen et al. 2025: jeder Lauf gegen den längsten Lauf der 30 Tage davor (Distanz; frühere Läufe am selben Tag zählen mit). Die Raten stammen aus einer Beobachtungsstudie mit über 5000 Läuferinnen und Läufern und sagen über einen einzelnen Lauf nichts Sicheres. Geplante Läufe: Distanz aus den Pace-Zielen der Schritte geschätzt (≈); offene Schritte zählen nicht. Schwimmen und Rad: keine geprüfte Grenze – der Verlauf zeigt, wie schnell du steigerst. Der Wochenvorschlag hält die Grenze selbst ein (${esc(V.VERSIONS.woche)}).</p>`;
  }

  /* ---------- Wissen ---------- */
  const version = (mod, key) => { const o = window[mod]; return o && o.VERSIONS && o.VERSIONS[key] ? o.VERSIONS[key] : null; };
  function zitat(id) {
    const W = WS(), q = W.QUELLEN[id]; if (!q) return esc(id);
    const l = W.link(id);
    return l ? `<a class="ws-zit" href="${esc(l)}" target="_blank" rel="noopener" title="${esc(q.t)}">${esc(q.zit)}</a>` : `<span class="ws-zit" title="${esc(q.t)}">${esc(q.zit)}</span>`;
  }
  /** [[a]] [[b]] → (Autor Jahr; Autor Jahr) mit DOI-Links; [[#kapitel]] → Link auf das Kapitel. */
  function textHTML(t) {
    const W = WS();
    return String(t)
      .replace(/\[\[[a-z0-9-]+\]\](?:\s*\[\[[a-z0-9-]+\]\])*/g, (m) => `(${m.match(/[a-z0-9-]+/g).map(zitat).join("; ")})`)
      .replace(/\[\[#([a-z0-9-]+)\]\]/g, (_, id) => { const k = W.kapitel(id); return `<a href="#wissen" class="ws-kap" data-wissen="${esc(id)}">«${esc(k ? k.titel : id)}»</a>`; })
      .replace(/(\d) %/g, "$1&nbsp;%");   // «10 %» nicht umbrechen
  }
  function quelleVoll(id) {
    const q = WS().QUELLEN[id], l = WS().link(id);
    return `<li id="ws-q-${esc(id)}"><span class="ws-qa">${esc(q.a)} (${q.j}).</span> ${esc(q.t)}. <i>${esc(q.q)}</i>.
      ${l ? `<a href="${esc(l)}" target="_blank" rel="noopener">${q.doi ? "doi:" + esc(q.doi) : "Dokument"}</a>` : `<span class="ws-ohne">${esc(q.ohneDoi || "")}</span>`}
      <span class="ws-kern">${esc(q.kern)}</span></li>`;
  }
  function regelnHTML() {
    const D = (C && C.D) || {};
    const zeilen = WS().REGELN.map(([mod, key, text, kap]) => `<li><span class="ws-rn">${esc(text)}<a href="#wissen" class="ws-kap" data-wissen="${esc(kap)}">${esc((WS().kapitel(kap) || {}).titel || kap)}</a></span><code>${esc(version(mod, key) || "–")}</code></li>`).join("");
    const werkz = Object.entries(D.versions || {}).map(([k, v]) => `<li><code>${esc(typeof v === "string" ? v : v.v || k)}</code> ${esc(typeof v === "string" ? k : v.text || k)}</li>`).join("");
    return `<ul class="ws-regeln">${zeilen}</ul>
      ${werkz ? `<h4 class="mini-h">Werkzeuge (Version in deinen Daten)</h4><ul class="ws-werkz">${werkz}</ul>` : ""}`;
  }
  M.wissenZeichnen = function (neu) {
    C = C || (UI() && UI().C);
    const box = $("ws-inhalt"); if (!box || !WS()) return;
    if (box.dataset.fertig && !neu) return;                       // Inhalt ist fest: einmal zeichnen (Suche und offene Kapitel bleiben)
    box.dataset.fertig = C ? "1" : "";                             // ohne Daten (vor dem Entsperren): später nochmals mit den Werkzeug-Versionen
    const W = WS(), K = W.KAPITEL, offen = new Set([...box.querySelectorAll("details[open]")].map((d) => d.dataset.k));
    const kap = (k, i) => `<details class="ws-k" id="ws-${esc(k.id)}" data-k="${esc(k.id)}"${offen.has(k.id) ? " open" : ""}>
        <summary><span class="ws-nr">${i + 1}</span><span class="ws-t"><b>${esc(k.titel)}</b>${k.quellen.length ? `<small>${k.quellen.length} ${k.quellen.length === 1 ? "Quelle" : "Quellen"}</small>` : ""}</span>${V6() ? V6().icon("runter", 18) : ""}</summary>
        <div class="ws-body">
          <div class="ws-kurz keep"><b>Kurz gesagt</b><div>${textHTML(k.kurz)}</div></div>
          ${k.text.map((p) => `<div class="ws-p">${textHTML(p)}</div>`).join("")}
          ${k.regeln ? regelnHTML() : ""}
          ${(k.seite || []).length ? `<p class="ws-seite"><b>In der Seite:</b> ${k.seite.map(([m, key]) => version(m, key)).filter(Boolean).map((v) => `<code>${esc(v)}</code>`).join(" ")}</p>` : ""}
          ${k.quellen.length ? `<h4 class="mini-h">Quellen</h4><ol class="ws-ql">${k.quellen.map(quelleVoll).join("")}</ol>` : ""}
        </div></details>`;
    const alle = Object.keys(W.QUELLEN).sort((a, b) => W.QUELLEN[a].a.localeCompare(W.QUELLEN[b].a, "de") || W.QUELLEN[a].j - W.QUELLEN[b].j);
    box.innerHTML = `<p class="ws-intro">Nach welchen Modellen die Seite rechnet und wie sie funktionieren – in eigenen Worten, mit den Studien zum Nachlesen. Kursive Kurzzitate wie <a class="ws-zit" href="${esc(W.link("seiler2010"))}" target="_blank" rel="noopener">Seiler 2010</a> öffnen die Studie (DOI). Antippen öffnet ein Kapitel.</p>
      <label class="ws-such"><span class="mini-h">Suchen</span><input type="search" id="ws-suche" placeholder="z. B. Laktat, Taper, CSS, HRV" autocomplete="off" aria-label="Im Wissen suchen"></label>
      <p class="ws-treffer" id="ws-treffer" role="status" aria-live="polite"></p>
      <div class="ws-liste">${K.map(kap).join("")}
        <details class="ws-k" id="ws-quellen" data-k="quellen"${offen.has("quellen") ? " open" : ""}><summary><span class="ws-nr">∑</span><span class="ws-t"><b>Alle Quellen</b><small>${alle.length} Arbeiten, alphabetisch</small></span>${V6() ? V6().icon("runter", 18) : ""}</summary>
          <div class="ws-body"><ol class="ws-ql">${alle.map(quelleVoll).join("")}</ol>
          <p class="ws-p">Alle Texte hier sind eigene Zusammenfassungen; für Einzelheiten gilt die Originalarbeit. ${esc(W.VERSION)}.</p></div></details></div>`;
    const such = $("ws-suche"), tr = $("ws-treffer");
    such.oninput = () => {
      const q = such.value.trim().toLowerCase(); let n = 0;
      box.querySelectorAll("details.ws-k").forEach((d) => {
        const hit = !q || d.textContent.toLowerCase().includes(q);
        d.hidden = !hit; if (hit && q) { d.open = true; n++; }
      });
      tr.textContent = q ? (n ? `${n} ${n === 1 ? "Kapitel" : "Kapitel"} mit «${such.value.trim()}»` : `Nichts gefunden für «${such.value.trim()}».`) : "";
    };
  };
  /** Kapitel öffnen (aus jedem Teil der Seite): Ansicht «Wissen», Kapitel aufklappen und hinscrollen. */
  M.oeffneWissen = function (id) {
    if (V59() && V59()._ovArt) V59().schliessen();
    if (window.APP && window.APP.showTab) window.APP.showTab("wissen"); else location.hash = "#wissen";
    setTimeout(() => {
      M.wissenZeichnen();
      const d = id ? document.getElementById("ws-" + id) : null;
      if (d) { d.hidden = false; d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); const s = d.querySelector("summary"); if (s) s.focus({ preventScroll: true }); }
    }, 60);
  };
  document.addEventListener("click", (ev) => {
    const a = ev.target.closest && ev.target.closest("[data-wissen]");
    if (!a) return;
    ev.preventDefault();
    M.oeffneWissen(a.dataset.wissen);
  });
})();
