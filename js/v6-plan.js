/* V6.0.2 Plan (design-1.0): Rennen als Kacheln (Fahne, A/B, Countdown, Streckenlängen), Saisonphasen als senkrechter Zeitstrahl
   (aktive Phase hervorgehoben, Antippen öffnet die Wochen) und Wochenstunden je Sportart (absolviert und geplant, Phasen auf der Zeitachse).
   Phasen aus AN.saison (saison-1.2, nur Vorschlag); geplant = Garmin-Kalender. Die Seite schreibt nichts nach Garmin oder Enduco. */
(function () {
  "use strict";
  const P = (window.V6P = window.V6P || {});
  const $ = (id) => document.getElementById(id);
  const V6 = () => window.V6, AN = () => window.AN, FK = () => window.FK, UI = () => window.V5UI;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let C = null;
  const heuteISO = () => C.iso(C.today);
  const dch = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}.${+m}.${y}`; };
  const dkurz = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${+m}.`; };
  P.PHASE = { "Grundlage": ["Grundlage", "--zc-z2"], "Aufbau": ["Aufbau", "--zc-z3"], "Wettkampfspezifisch": ["Wettkampfspezifisch", "--zc-z4"],
    "Taper": ["Taper", "--zc-z5"], "B-Rennen (Mini-Taper)": ["Mini-Taper", "--race"] };
  const SP = ["schwimm", "rad", "lauf", "andere"], SP_WORT = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen", andere: "Andere" };

  function rennen() { return V6().rennenPrio(C.races ? C.races() : []); }
  function saison() {
    const R = rennen(); if (!R.length || !AN()) return null;
    try { return AN().saison(heuteISO(), R); } catch (e) { console.error(e); return null; }
  }
  P.zeichnen = function () {
    C = UI() && UI().C; if (!C || !V6()) return;
    V6().farbenLesen();
    const S = saison();
    try { rennenZeichnen(); } catch (e) { console.error(e); }
    try { phasenZeichnen(S); } catch (e) { console.error(e); }
    try { wochenZeichnen(S); } catch (e) { console.error(e); }
  };

  /* ---------- Rennen ---------- */
  function rennenZeichnen() {
    const box = $("pl-rennen"); if (!box) return;
    const W = V6(), h = heuteISO(), tage = (iso) => Math.round((Date.parse(iso + "T12:00:00Z") - Date.parse(h + "T12:00:00Z")) / 86400000);
    const R = rennen().filter((r) => r.date >= h);
    box.innerHTML = R.length ? R.map((r) => {
      const t = tage(r.date), d = W.distanzen(r.name);
      return `<div class="pl-rk${r.prio === "A" ? " a" : ""}"><div class="pl-rk-kopf"><span class="pl-flagge">${W.icon("flagge", 20)}</span><b>${esc(r.name)}</b><span class="pl-prio" title="${r.prio === "A" ? "Hauptrennen" : "Vorbereitungsrennen"}">${esc(r.prio)}</span></div>
        <div class="kv pl-rk-kv"><div><b>${Math.floor(t / 7)}</b><span>Wochen</span></div><div><b>${t}</b><span>Tage</span></div><div><b>${esc(dch(r.date))}</b><span>${esc(new Date(r.date + "T12:00:00").toLocaleDateString("de-CH", { weekday: "long" }))}</span></div></div>
        ${d ? `<div class="pl-etappen">${d.map((x) => `<span><i style="--sp:var(--sp-${x.sport})">${W.sportIcon(x.sport, 15)}</i>${String(x.km).replace(".", ",")} km</span>`).join("")}</div>` : ""}</div>`;
    }).join("") : `<p class="ek-ohne">Keine kommenden Rennen in den Daten.</p>`;
  }

  /* ---------- Phasen als Zeitstrahl ---------- */
  function phasenZeichnen(S) {
    const box = $("pl-phasen"); if (!box) return;
    const W = V6(), h = heuteISO();
    if (!S) { box.innerHTML = `<p class="ek-ohne">Ohne Hauptrennen keine Phasen.</p>`; return; }
    // saison-1.2: die laufende Phase ganz (ab ihrem Beginn), damit «Woche x von y» stimmt; Grundlage hat keinen festen Beginn
    const L = S.alle && S.ab ? S.alle.filter((w) => w.woche >= S.ab) : S.wochen;
    const seg = W.phasenSegmente(L, h), R = rennen(), ist = AN().wochenIst(C.D.activities, L[0].woche, FK().addDays(L[L.length - 1].woche, 6));
    const plan = new Map();
    for (const p of C.D.planned || []) { if (!p.date) continue; const mo = W.montag(p.date); plan.set(mo, (plan.get(mo) || 0) + ((window.V6H ? window.V6H.planDauer(p) : p.dur_s) || 0) / 3600); }
    const hh = (x) => (isNum(x) && x > 0 ? (Math.round(x * 2) / 2).toString().replace(".", ",") + " h" : "–");
    const items = [];
    seg.forEach((s) => {
      const [name, farbe] = P.PHASE[s.phase] || [s.phase, "--muted"], n = s.wochen.length;
      const wa = s.aktiv ? s.wochen.find((w) => h >= w.woche && h <= FK().addDays(w.woche, 6)) : null;
      const wiText = wa && isNum(wa.phaseNr) && (wa.basis || wa.phase) === s.phase ? ` · Woche ${wa.phaseNr} von ${wa.phaseN}` : "";
      const wochen = s.wochen.map((w) => {
        const r = ist.get(w.woche), istH = r ? r.rad + r.lauf + r.schwimm + r.andere : null, jetzt = h >= w.woche && h <= FK().addDays(w.woche, 6);
        return `<li class="${jetzt ? "jetzt" : ""}"><span>KW ${W.isoWoche(w.woche)} · ${esc(dkurz(w.woche))}–${esc(dkurz(FK().addDays(w.woche, 6)))}</span>
          <span class="pl-w-tags">${w.erholung ? `<em class="pl-tag erh">Erholung</em>` : ""}${(w.rennen || []).map((x) => `<em class="pl-tag rennen">${esc(x)}</em>`).join("")}</span>
          <span class="pl-w-h">${w.woche <= h ? `${hh(istH)} absolviert` : ""}${plan.get(w.woche) ? `${w.woche <= h ? " · " : ""}${hh(plan.get(w.woche))} geplant` : ""}</span></li>`;
      }).join("");
      items.push(`<li class="pl-ph${s.aktiv ? " aktiv" : ""}${s.bis < h ? " vorbei" : ""}" style="--ph:var(${farbe})">
        <button type="button" class="pl-ph-k" aria-expanded="false"><span class="pl-punkt" aria-hidden="true"></span>
          <span class="pl-ph-t"><b>${esc(name)}</b><small>${esc(dch(s.von))} – ${esc(dch(s.bis))} · ${n} ${n === 1 ? "Woche" : "Wochen"}${wiText}</small></span>
          ${s.aktiv ? `<span class="pl-jetzt">jetzt</span>` : ""}${W.icon("runter", 18)}</button>
        <ul class="pl-wochen" hidden>${wochen}</ul></li>`);
      for (const r of R) if (r.date >= s.von && r.date <= s.bis)
        items.push(`<li class="pl-ziel${r.prio === "A" ? " a" : ""}"><span class="pl-flagge">${W.icon("flagge", 18)}</span><b>${esc(r.short || r.name)}</b><span class="pl-prio">${esc(r.prio)}</span><small>${esc(dch(r.date))}</small></li>`);
    });
    box.innerHTML = `<ol class="pl-zeit">${items.join("")}</ol>
      <p class="hint">Phasen rückwärts ab ${esc(S.haupt.name)} (${esc(S.regel)}): ${esc(S.annahmen)}. Vorschlag zur Orientierung – massgebend bleibt der Plan in Enduco; Stunden «geplant» aus dem Garmin-Kalender.</p>`;
    box.querySelectorAll(".pl-ph-k").forEach((b) => (b.onclick = () => {
      const ul = b.parentElement.querySelector(".pl-wochen"), auf = ul.hidden;
      ul.hidden = !auf; b.setAttribute("aria-expanded", String(auf)); b.parentElement.classList.toggle("offen", auf);
    }));
  }

  /* ---------- Wochenstunden je Sportart: absolviert (gefüllt) und geplant (Rand), Phasen darunter ---------- */
  P.wochenDaten = function (acts, planned, heute, wochenZurueck, wochenVor, planDauer, saisonWochen) {
    const W = V6(), m0 = W.montag(heute), out = [];
    const add = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const phase = new Map((saisonWochen || []).map((w) => [w.woche, w.phase]));
    for (let k = -wochenZurueck; k <= wochenVor; k++) {
      const mo = add(m0, 7 * k), so = add(mo, 6), r = { woche: mo, kw: W.isoWoche(mo), jetzt: k === 0, ist: {}, plan: {}, phase: phase.get(mo) || null };
      for (const s of SP) { r.ist[s] = 0; r.plan[s] = 0; }
      for (const a of acts || []) if (a.date >= mo && a.date <= so) { const s = SP.includes(a.sport) ? a.sport : "andere"; r.ist[s] += (a.mv || a.dur || 0) / 3600; }
      for (const p of planned || []) if (p.date >= mo && p.date <= so && p.date >= heute) {
        const s = SP.includes(p.sport) ? p.sport : "andere", d = (planDauer ? planDauer(p) : p.dur_s) || 0;
        if (p.date === heute && (acts || []).some((a) => a.date === heute && a.sport === p.sport)) continue;    // heute schon erledigt
        r.plan[s] += d / 3600;
      }
      r.summe = SP.reduce((x, s) => x + r.ist[s] + r.plan[s], 0);
      out.push(r);
    }
    return out;
  };
  function wochenZeichnen(S) {
    const box = $("pl-wochen"); if (!box) return;
    const W = V6(), h = heuteISO();
    const D = P.wochenDaten(C.D.activities, C.D.planned, h, 7, 4, window.V6H ? window.V6H.planDauer : null, S ? S.wochen : []);
    const max = Math.max(5, Math.ceil(Math.max(...D.map((r) => r.summe)) / 5) * 5);
    const w = 360, hgt = 196, x0 = 30, y0 = 8, yb = 160, bw = (w - x0) / D.length, Y = (v) => yb - (v / max) * (yb - y0);
    const farbe = (s) => `var(--sp-${s === "andere" ? "andere" : s})`;
    const bars = D.map((r, i) => {
      let y = yb; const x = x0 + i * bw + 3, bwi = bw - 6, out = [];
      for (const s of SP) { const v = r.ist[s]; if (v > 0.01) { const hh = (v / max) * (yb - y0); y -= hh; out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bwi.toFixed(1)}" height="${Math.max(1, hh - 1).toFixed(1)}" rx="2" style="fill:${farbe(s)}"><title>KW ${r.kw}: ${SP_WORT[s]} ${v.toFixed(1)} h absolviert</title></rect>`); } }
      for (const s of SP) { const v = r.plan[s]; if (v > 0.01) { const hh = (v / max) * (yb - y0); y -= hh; out.push(`<rect x="${(x + 0.8).toFixed(1)}" y="${(y + 0.8).toFixed(1)}" width="${(bwi - 1.6).toFixed(1)}" height="${Math.max(1, hh - 2.6).toFixed(1)}" rx="2" style="fill:none;stroke:${farbe(s)};stroke-width:1.6"><title>KW ${r.kw}: ${SP_WORT[s]} ${v.toFixed(1)} h geplant</title></rect>`); } }
      const ph = r.phase ? `<rect x="${(x0 + i * bw + 1).toFixed(1)}" y="${yb + 6}" width="${(bw - 2).toFixed(1)}" height="5" rx="2" style="fill:var(${(P.PHASE[r.phase] || [0, "--muted"])[1]})"><title>${esc(r.phase)}</title></rect>` : "";
      const lab = i % 2 === (D.length % 2 ? 0 : 1) || r.jetzt ? `<text x="${(x0 + i * bw + bw / 2).toFixed(1)}" y="${yb + 26}" text-anchor="middle" class="pl-ax${r.jetzt ? " jetzt" : ""}">${r.jetzt ? "jetzt" : "KW " + r.kw}</text>` : "";
      return out.join("") + ph + lab;
    }).join("");
    const grid = [0, max / 2, max].map((v) => `<line x1="${x0}" x2="${w}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="pl-grid"/><text x="${x0 - 5}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" class="pl-ax">${v} h</text>`).join("");
    const jetzt = D.findIndex((r) => r.jetzt);
    const mark = jetzt >= 0 ? `<rect x="${(x0 + jetzt * bw).toFixed(1)}" y="${y0 - 4}" width="${bw.toFixed(1)}" height="${yb - y0 + 4}" rx="6" class="pl-jetzt-bg"/>` : "";
    const phasen = [...new Set(D.map((r) => r.phase).filter(Boolean))];
    box.innerHTML = `<svg class="pl-chart" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="Wochenstunden je Sportart, 7 Wochen zurück bis 4 Wochen voraus">${mark}${grid}${bars}</svg>
      <div class="pl-legende">${SP.filter((s) => D.some((r) => r.ist[s] + r.plan[s] > 0.01)).map((s) => `<span><i style="background:${farbe(s)}"></i>${SP_WORT[s]}</span>`).join("")}<span><i class="rand"></i>geplant</span>
        ${phasen.map((p) => `<span><i class="ph" style="background:var(${(P.PHASE[p] || [0, "--muted"])[1]})"></i>${esc((P.PHASE[p] || [p])[0])}</span>`).join("")}</div>
      <p class="hint">Gefüllt = absolviert (Bewegungszeit aus den Aktivitäten), Rand = noch geplant im Garmin-Kalender (Dauer aus den Workout-Schritten, sonst laut Kalender). Farbstreifen = Phase des Vorschlags.</p>`;
  }
})();
