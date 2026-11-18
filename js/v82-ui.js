/* V8.2 Oberfläche zu js/v82.js: Ansicht «Deine Reaktionen» unter Analyse – Erholung nach harten Einheiten (erholung-nach-1.0), was du bisher verträgst
   (vertraeglich-1.0), Verteilung und Entwicklung (verteilung-1.1) und Blockbilanz (blockbilanz-1.0). Nur beschreibend, mit Intervall und Mindestzahl;
   nichts davon ändert den Plan. */
(function () {
  "use strict";
  const U = (window.V82UI = window.V82UI || {});
  const UI = () => window.V5UI, V82 = () => window.V82, V6 = () => window.V6, AN = () => window.AN;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const komma = (x) => String(x).replace(".", ",");
  const $ = (id) => document.getElementById(id);
  let C = null, cache = null, cacheKey = null, gruppe = "intensiv";
  const bereit = () => { C = UI() && UI().C; return !!(C && C.D && V82()); };
  const datum = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { day: "numeric", month: "numeric" });
  const datumJ = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-CH", { day: "numeric", month: "numeric", year: "2-digit" });

  /** Montag einer Erholungswoche aus der Saison (saison-1.2), damit die Blöcke mit Erholungswochen enden. */
  function anker(heute) {
    try {
      const S = AN() && AN().saison ? AN().saison(heute, V6().rennenPrio(C.races ? C.races() : [])) : null;
      const w = S && (S.alle || []).find((x) => x.erholung && /Rhythmus/.test(x.grund || ""));
      return w ? w.woche : null;
    } catch (e) { return null; }
  }
  /* ---------------- Erholung nach harten Einheiten ---------------- */
  const GR = [["intensiv", "Alle harten"], ["rad", "Rad"], ["lauf", "Laufen"], ["lang", "Lange Einheiten"]];
  function erholungHTML(E) {
    const g = E.gruppen[gruppe], M = V82().MIN.faelle, MK = V82().MARKER;
    const zelle = (m, t) => {
      if (!t || t.n < M) return `<td>–<small>${t ? t.n : 0} Fälle</small></td>`;
      if (!isNum(t.diff)) return `<td>–</td>`;
      const dl = V82().deutlich(t.diff, t.kiDiff, E.swc[m], MK[m].schlecht);
      return `<td${dl ? ` class="down"` : ""}>${esc(V82().wert(t.diff, m))}<small>n ${t.n}</small></td>`;
    };
    const kopf = E.erholtTag === 1 ? "Nach harten Einheiten liegen HRV und Ruhepuls am Morgen danach im Rahmen deiner täglichen Schwankung."
      : E.erholtTag ? `Nach harten Einheiten zeigen HRV und Ruhepuls ab Tag ${E.erholtTag} keinen deutlichen Unterschied mehr zu ruhigen Tagen.`
      : E.gruppen.intensiv.n < M ? "Noch zu wenig harte Einheiten für ein Urteil." : "Noch kein klares Bild – siehe die Zahlen je Tag.";
    return `<div class="chips v82-chips" role="radiogroup" aria-label="Gruppe">${GR.map(([k, t]) => `<button type="button" class="chip" role="radio" data-v82g="${k}" aria-checked="${k === gruppe}">${esc(t)} <small>${E.gruppen[k].n}</small></button>`).join("")}</div>
      <p class="verdict keep">${esc(kopf)}</p>
      <div class="tablewrap"><table class="t v82-t" data-keine-liste aria-label="${esc(g.name)}: Unterschied zu ruhigen Tagen"><thead><tr><th></th><th>Tag 1</th><th>Tag 2</th><th>Tag 3</th></tr></thead><tbody>
        ${["hrv", "rhr", "puls"].map((m) => `<tr><td>${esc(MK[m].name)}</td>${g.marker[m].tage.map((t) => zelle(m, t)).join("")}</tr>`).join("")}
      </tbody></table></div>
      ${V82().gruppeText(g, E.swc).map((t) => `<p class="keep v82-satz">${esc(t)}</p>`).join("")}
      <p class="hint">Je Tag nach der Einheit: Abweichung vom Schnitt der 7 Morgen davor, verglichen mit derselben Abweichung nach Tagen ohne harte oder lange Einheit
        (Median, 90-%-Intervall, n = Fälle). Rot = deutlich ungünstiger: Intervall ohne 0 und mindestens so gross wie deine tägliche Schwankung (halbe Standardabweichung;
        HRV ±${komma(E.swc.hrv ?? "–")} %, Ruhepuls ±${komma(E.swc.rhr ?? "–")} bpm, Puls bei gleicher Leistung ±${komma(E.swc.puls ?? "–")} bpm). Hart = ab 5 min über dem Puls an LT2,
        mittel = ab 20 min über LT1, mit den Pulsgrenzen deines aktiven Zonenprofils für die ganzen zwei Jahre (${esc(datumJ(E.von))} bis ${esc(datumJ(E.bis))}); kommt die nächste
        harte Einheit, endet die Reihe. Beobachtung, keine Ursache (${esc(E.v)}).</p>`;
  }

  /* ---------------- Was du bisher verträgst ---------------- */
  function vertraeglichHTML(T) {
    const zeile = (q, bez) => {
      const w = (m) => (q.diff && q.diff[m] ? V82().wert(q.diff[m].d, m) : bez ? "Bezug" : "–");
      const kl = q.schlechter ? ` class="down"` : "";
      return `<tr${kl}><td>${esc(q.label)}${bez ? "<small>üblich</small>" : q.unter && q.n ? "<small>weniger als üblich</small>" : ""}</td><td>${q.n}</td>
        <td>${q.genug ? esc(w("rhr")) : "<small>zu wenig</small>"}</td><td>${q.genug ? esc(w("hrv")) : "<small>zu wenig</small>"}</td></tr>`;
    };
    const teil = (k) => {
      const d = T.dim[k];
      return `<h3 class="abschnitt">${esc(d.name)}</h3>
        <div class="tablewrap"><table class="t v82-t" data-keine-liste aria-label="${esc(d.name)}"><thead><tr><th></th><th>Wochen</th><th>Ruhepuls</th><th>HRV</th></tr></thead><tbody>
          ${d.gruppen.filter((q) => q.n > 0).map((q) => zeile(q, q.label === d.bezug)).join("")}</tbody></table></div>
        <p class="${d.ab ? "warn-t " : ""}keep v82-satz">${esc(d.text)}</p>`;
    };
    return `${["harte", "stunden", "laufkm"].map(teil).join("")}
      <p class="hint">${T.n} Wochen (${esc(datumJ(T.von))} bis ${esc(datumJ(T.bis))}). Antwort = Ruhepuls und HRV an den ersten drei Morgen der Woche danach gegen deinen Schnitt der
        vier Wochen davor; gezeigt als Unterschied zu deinen üblichen Wochen (Gruppe mit dem Median). Rot = deutlich schlechter: Intervall ohne 0 und mindestens die halbe
        Standardabweichung der Wochen, wenigstens aber deine tägliche Schwankung für drei Morgen (Ruhepuls ${komma(T.swc.rhr ?? "–")} bpm, HRV ${komma(T.swc.hrv ?? "–")} %). Wochen mit weniger als üblich sind oft Ferien- oder Krankheitswochen und werden
        nicht beurteilt. «Bisher verträglich» heisst nur: in deinen Daten ohne deutliche Verschlechterung – kein Freipass für mehr (${esc(T.v)}).</p>`;
  }

  /* ---------------- Verteilung und Entwicklung ---------------- */
  function verteilungHTML(V) {
    const letzte = V.bloecke.slice(-6).reverse();                      // neueste zuerst, wie die Blockbilanz
    const anz = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
    return `${V.zusammenhang.map((z) => `<p class="${z.status === "negativ" ? "warn-t " : ""}keep v82-satz">${esc(z.text)}</p>`).join("")}
      <div class="tablewrap"><table class="t v82-t" data-keine-liste aria-label="Verteilung und Effizienz je Block"><thead><tr><th>Block</th><th>L/M/H %</th><th>Rad</th><th>Laufen</th></tr></thead><tbody>
        ${letzte.map((b) => `<tr><td>${esc(datum(b.von))}–${esc(datum(b.bis))}</td><td>${b.tid ? b.tid.join("/") : "–"}</td>
          <td>${isNum(b.effRad) ? Math.round(b.effRad * 100) + " %" : "–"}<small>${anz(b.nRad, "Fahrt", "Fahrten")}</small></td><td>${isNum(b.effLauf) ? Math.round(b.effLauf * 100) + " %" : "–"}<small>${anz(b.nLauf, "Lauf", "Läufe")}</small></td></tr>`).join("")}
      </tbody></table></div>
      <p class="hint">Je 4-Wochen-Block die Verteilung nach Puls (L/M/H = locker, mittel, hart in %; Rad und Laufen) und die Effizienz: Rad = normierte Leistung je Pulsschlag in gleichmässigen Fahrten
        (ab 40 min, kaum hart, je System drinnen und draussen), Laufen = Meter je Pulsschlag in vergleichbaren Läufen; 100 % = dein Median, ab ${V82().MIN.block} Messungen je Block.
        Verglichen wird die Verteilung eines Blocks mit der Veränderung der Effizienz zum nächsten (Rangkorrelation, 90-%-Intervall, ab ${V82().MIN.paare} Block-Paaren);
        klar erst, wenn mindestens ${V82().EINTEILUNGEN.klar} der ${V82().EINTEILUNGEN.von} Einteilungen der Blöcke (Beginn um je eine Woche verschoben) dasselbe zeigen.
        Ein Zusammenhang ist keine Ursache: Hitze, Leistungsmesser, Rennen oder Krankheit können beides beeinflussen (${esc(V.v)}).</p>`;
  }

  /* ---------------- Blockbilanz ---------------- */
  function bloeckeHTML(B) {
    const L = B.bloecke.slice().reverse();
    const st = (s) => [s.rad ? `Rad ${komma(s.rad)}` : "", s.lauf ? `Laufen ${komma(s.lauf)}` : "", s.schwimm ? `Schwimmen ${komma(s.schwimm)}` : ""].filter(Boolean).join(" · ");
    return `<ul class="v82-bloecke">${L.map((b) => `<li class="v82-block">
        <div class="v82-bk"><b>${esc(datum(b.von))}–${esc(datum(b.bis))}</b>${b.tests.length ? `<small>${esc(b.tests.join(", "))}</small>` : ""}</div>
        <div class="kv"><div><b>${komma(b.stunden.proWoche)} h</b><span>pro Woche</span></div><div><b>${b.harte}</b><span>harte Einheiten</span></div>
          <div><b>${b.tid ? b.tid.join("/") : "–"}</b><span>locker/mittel/hart %</span></div><div><b>${isNum(b.ctl.ende) ? Math.round(b.ctl.ende) : "–"}</b><span>Fitness am Ende</span></div></div>
        <p class="keep v82-satz">${esc(b.satz)}</p><p class="hint">${esc([st(b.stunden) ? st(b.stunden) + " h" : "", b.stunden.andere ? `andere ${komma(b.stunden.andere)} h` : "",
          b.ampel ? `Ampel vorsichtig oder krank an ${b.ampel} Tagen` : ""].filter(Boolean).join(" · ") || "Keine Einheiten")}</p></li>`).join("")}</ul>
      <p class="hint">Blöcke zu vier Wochen, ${cache && cache.anker ? "so gelegt, dass sie mit den Erholungswochen deiner Saison enden" : "bis zur letzten abgeschlossenen Woche"}.
        Gegenüber dem Block davor: Fitness ab ±3 «steigt»/«sinkt», Erholung ab 1,5 bpm Ruhepuls oder 5 % HRV, Effizienz ab 2 % (eigene Festlegungen). Stunden ohne Krafttraining;
        Wanderungen und Skitouren zählen in der Fitness, nicht in den Stunden von Schwimmen, Rad und Laufen (${esc(B.v)}).</p>`;
  }

  /** Zeichnen in Schritten: jede Karte erscheint, sobald ihre Rechnung fertig ist (die Seite bleibt bedienbar). Ergebnis je Datenstand zwischengespeichert. */
  let lauf = 0;
  U.zeichnen = function () {
    if (!bereit()) return;
    const boxen = { e: $("v82-erholung"), t: $("v82-vertraeglich"), v: $("v82-verteilung"), b: $("v82-bloecke") };
    if (!boxen.e) return;
    const heute = C.iso(C.today), key = `${heute}|${(C.D.activities || []).length}|${(C.D.days || []).length}|${C.D.updated || ""}|${(C.D.zonen || []).length}`;
    if (!cache || cacheKey !== key) { cache = { anker: anker(heute) }; cacheKey = key; }
    const o = { heute, zonen: C.D.zonen, anker: cache.anker }, nr = ++lauf;
    const ctx = () => cache.ctx || (cache.ctx = V82().kontext(C.D, C.D.zonen, heute));
    const schritte = [
      ["erholung", boxen.e, erholungHTML, () => V82().erholung(C.D, o)],
      ["vertraeglich", boxen.t, vertraeglichHTML, () => V82().vertraeglich(C.D, o)],
      ["verteilung", boxen.v, verteilungHTML, () => V82().verteilung(C.D, o, ctx())],
      ["bloecke", boxen.b, bloeckeHTML, () => V82().bloecke(C.D, o, ctx())],
    ];
    let i = 0;
    const weiter = () => {
      if (nr !== lauf) return;                                                  // inzwischen neu gezeichnet
      const [k, box, f, rechne] = schritte[i++];
      if (!(k in cache)) { try { cache[k] = rechne(); } catch (e) { console.error(e); cache[k] = null; } }
      if (box) {
        try { box.innerHTML = cache[k] ? f(cache[k]) : `<p class="hint">Noch zu wenig Daten.</p>`; }
        catch (e) { console.error(e); box.innerHTML = `<p class="hint">Nicht berechenbar.</p>`; }
      }
      if (k === "erholung") U.binden();
      if (i < schritte.length) setTimeout(weiter, 0);
    };
    weiter();
  };
  U.binden = function () {
    const box = $("v82-erholung"); if (!box || !cache || !cache.erholung) return;
    box.querySelectorAll("[data-v82g]").forEach((b) => (b.onclick = () => { gruppe = b.dataset.v82g; box.innerHTML = erholungHTML(cache.erholung); U.binden(); }));
  };
  U.gezeigt = function (name) { if (name === "reaktionen") setTimeout(() => U.zeichnen(), 30); };
})();
