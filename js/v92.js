/* Ironman Notebook V9.2 – Auftrag «Woche wie Enduco», Etappe W1 (docs/auftrag-enduco-woche.md): Rechenteile ohne DOM für «Umplanen».
   Der Kern selbst steht in js/v66.js (V66.aendern { art: "umplanen" }, umplanen-1.0, grenzen-1.0); hier nur, was Bericht, «Woche einstellen» und
   die Frage brauchen. Im Browser window.V92, in Node require("./v92.js").

   - bericht (umplanen-1.0): was sich durch eine Änderung an der Woche geändert hat – Einheiten über ihre Kennung, sonst über die Vorlage zugeordnet
     (gleicher Tag zuerst, sonst der nächste): verschoben, gekürzt, länger, entfallen, neu. Wochenlast vorher → nachher (TL ≈, Stunden).
   - fehlt-zeit-1.0 (Silas 22.11.2026, Punkt 6): passt Last nirgends in die Grenzen, fragt die Seite, ob an einem Tag mehr trainiert werden darf. Je Tag,
     der es aufnehmen könnte, das kleinste nötige Mehr in 5-min-Schritten (durchgerechnet mit dem echten Planer, nie grösser als das Fehlende); reicht
     kein Tag allein oder wäre das Mehr grösser als V92.GROSS, zusätzlich «verteilt» auf zwei Tage (je gleich viel). Eigene Festlegungen.
   - woche-einstellen-1.0: Zustand eines Tages (Standard · von Hand gesetzt · gesperrt) und die Einträge, die das Blatt «Woche einstellen» speichert. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V92 = factory();
  if (node) module.exports = V92;
  if (root) root.V92 = V92;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V92 = { VERSIONS: { umplanen: "umplanen-1.0", woche: "woche-einstellen-1.0", fehlt: "fehlt-zeit-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const TAG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const wtNr = (iso) => ((new Date(Date.parse(iso + "T12:00:00Z")).getUTCDay() + 6) % 7) + 1;
  V92.tag = (iso) => TAG[wtNr(iso) - 1];
  V92.kurz = (iso) => KURZ[wtNr(iso) - 1];
  const abstand = (a, b) => Math.abs(Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5));
  /** Dauer wie im Auftrag: «40 min», «1 h», «5 h 40». */
  V92.dauer = function (min) {
    const m = Math.round(min || 0); if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
  };
  /** Mehr-Zeit-Grenze, ab der zusätzlich «verteilt» angeboten wird (eigene Festlegung). */
  V92.GROSS = 60;

  /* ---------------- Bericht ---------------- */
  /** Einheiten einer Woche für den Vergleich: tage = [{ date, einheiten }] → [{ uid, id, titel, dauer, sport, date }] (ohne Krafttraining-Zählung, alles). */
  V92.liste = function (tage) {
    const out = [];
    for (const t of tage || []) for (const e of t.einheiten || []) out.push({ uid: e.uid || null, id: e.id || e.vorlage || null, titel: e.titel || "Einheit", dauer: isNum(e.dauer) ? e.dauer : 0, sport: e.sport || null, date: t.date });
    return out;
  };
  /** Was hat sich zwischen vor und nach (V92.liste) geändert? Zuordnung über die Kennung, sonst über die Vorlage (gleicher Tag zuerst, dann der nächste).
   *  → { verschoben [{titel, von, nach, dauer}], gekuerzt [{titel, date, von, nach}], laenger [...], weg [{titel, date, dauer}], neu [{titel, date, dauer}] } */
  /** Paare (vorher, nachher): über die Kennung, sonst gleiche Vorlage am selben Tag, sonst am nächsten Tag. → { A, B, paare } (frei = ohne Partner) */
  function paaren(vor, nach) {
    const A = (vor || []).map((x) => Object.assign({ frei: true }, x)), B = (nach || []).map((x) => Object.assign({ frei: true }, x)), paare = [];
    for (const b of B) { if (!b.uid) continue; const a = A.find((x) => x.frei && x.uid === b.uid && x.id === b.id); if (a) { a.frei = b.frei = false; paare.push([a, b]); } }
    for (const b of B) { if (!b.frei) continue; const a = A.find((x) => x.frei && x.id === b.id && x.date === b.date); if (a) { a.frei = b.frei = false; paare.push([a, b]); } }
    for (const b of B) {
      if (!b.frei) continue;
      let best = null; for (const a of A) if (a.frei && a.id === b.id && (!best || abstand(a.date, b.date) < abstand(best.date, b.date))) best = a;
      if (best) { best.frei = b.frei = false; paare.push([best, b]); }
    }
    return { A, B, paare };
  }
  /** Kennung vorher → Kennung nachher (für die Auswahl in Garmin-Aufträgen: eine Einheit bleibt gewählt, auch wenn sie den Tag oder die Kennung wechselt). */
  V92.zuordnung = function (vor, nach) {
    const m = new Map(); for (const [a, b] of paaren(vor, nach).paare) if (a.uid && b.uid) m.set(a.uid, b.uid);
    return m;
  };
  V92.diff = function (vor, nach) {
    const { A, B, paare } = paaren(vor, nach);
    const D = { verschoben: [], gekuerzt: [], laenger: [], weg: [], neu: [] };
    for (const [a, b] of paare) {
      if (a.date !== b.date) D.verschoben.push({ titel: b.titel, von: a.date, nach: b.date, dauer: b.dauer, vorher: a.dauer });
      if (b.dauer < a.dauer) D.gekuerzt.push({ titel: b.titel, date: b.date, von: a.dauer, nach: b.dauer });
      else if (b.dauer > a.dauer) D.laenger.push({ titel: b.titel, date: b.date, von: a.dauer, nach: b.dauer });
    }
    for (const a of A) if (a.frei) D.weg.push({ titel: a.titel, date: a.date, dauer: a.dauer });
    for (const b of B) if (b.frei) D.neu.push({ titel: b.titel, date: b.date, dauer: b.dauer });
    const ord = (x, y) => String(x.date || x.von).localeCompare(String(y.date || y.von));
    for (const k of Object.keys(D)) D[k].sort(ord);
    D.leer = !paare.some(([a, b]) => a.date !== b.date || a.dauer !== b.dauer) && !D.weg.length && !D.neu.length;
    return D;
  };
  /** Zeilen in Worten (Bericht und Tagesblatt). grund(titel, nach) → Grund des Verschiebens (aus dem Protokoll des Planers) oder null. */
  V92.zeilen = function (D, grund) {
    const out = [];
    for (const x of D.verschoben) { const g = grund ? grund(x.titel, x.nach) : null; out.push(`«${x.titel}» ${V92.kurz(x.von)} → ${V92.kurz(x.nach)}${x.dauer < x.vorher ? `, ${V92.dauer(x.dauer)} statt ${V92.dauer(x.vorher)}` : ""}${g ? ` (${g})` : ""}`); }
    for (const x of D.gekuerzt) if (!D.verschoben.some((v) => v.titel === x.titel && v.nach === x.date)) out.push(`«${x.titel}» am ${V92.kurz(x.date)} ${V92.dauer(x.nach)} statt ${V92.dauer(x.von)}`);
    for (const x of D.laenger) if (!D.verschoben.some((v) => v.titel === x.titel && v.nach === x.date)) out.push(`«${x.titel}» am ${V92.kurz(x.date)} ${V92.dauer(x.nach)} statt ${V92.dauer(x.von)}`);
    for (const x of D.weg) out.push(`«${x.titel}» (${V92.kurz(x.date)}) entfällt`);
    for (const x of D.neu) out.push(`«${x.titel}» neu am ${V92.kurz(x.date)}`);
    return out;
  };
  /** Grund eines Verschiebens aus den Meldungen des Planers («… von Mi auf Do verschoben (Verfügbarkeit)»). */
  V92.grundAus = function (meldungen) {
    const L = (meldungen || []).map((m) => /^«(.+)» von (\S+) auf (\S+) verschoben \((.+)\)$/.exec(String(m))).filter(Boolean);
    return (titel, nach) => { const m = L.find((x) => x[1] === titel && x[3] === V92.kurz(nach)); return m ? m[4] : null; };
  };

  /* ---------------- fehlt-zeit-1.0: die Frage ---------------- */
  /** Fingerabdruck der Eingaben einer Woche: Grenzen je Tag, Sperren, Anker, Streichungen. Die Antwort «Nein» gilt, bis er sich ändert. */
  V92.fingerabdruck = function (E, verf, tage) {
    const T = (tage || []).map((d) => { const v = verf ? verf(d) : null, t = E && E.tage ? E.tage[d] : null;
      return [d, v ? [v.min == null ? null : v.min, v.sport || null] : null, !!(t && t.gesperrt), t && Array.isArray(t.einheiten) ? t.einheiten.filter((s) => s && (s.quelle !== "vorschlag" || s.gesperrt || s.anker)).map((s) => [s.uid, s.vorlage || s.wid || null, s.dauer]) : null]; });
    const s = JSON.stringify([T, (E && E.gestrichen) || []]);
    let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return "fp-" + h.toString(36);
  };
  /** Soll die Frage kommen? Nur mit fehlender Last, nicht nach «Nein» für dieselben Eingaben. */
  V92.fragen = function (E, fp) {
    const V = E && E.verteilung; if (!V || !V.fehlt || !(V.fehlt.min > 0)) return false;
    return !(V.frage && V.frage.antwort === "nein" && V.frage.fp === fp);
  };
  /** Tage, die mehr aufnehmen könnten: nicht vergangen, nicht gesperrt/fest, nicht auf «kein Training», mit einer Zeitgrenze. kand = [{ date, min, sport, fest }] */
  V92.kandidaten = function (kand, heute) {
    return (kand || []).filter((k) => k && k.date >= heute && !k.fest && isNum(k.min) && k.min > 0 && !(Array.isArray(k.sport) && !k.sport.length));
  };
  /**
   * Vorschläge für die Frage. kand = V92.kandidaten(...), fehltMin = fehlende Minuten, probe(mehr: { Datum → neue Minuten }) → fehlende Minuten danach
   * (der echte Planer; 0 = alles untergebracht). Je Tag das kleinste Mehr in 5-min-Schritten (höchstens fehltMin, höchstens 12 h am Tag); dazu
   * «verteilt» auf zwei Tage, wenn kein Tag allein reicht oder das kleinste Mehr über V92.GROSS liegt. → [{ art: "tag"|"verteilt", tage: [{ date, min, plus }], plus }]
   */
  V92.vorschlaege = function (kand, fehltMin, probe, opt) {
    opt = opt || {};
    const MAX = opt.max || 720, out = [], cap = Math.floor(Math.max(0, fehltMin) / 5) * 5;
    if (!cap || typeof probe !== "function") return out;
    const geht = (mehr) => { try { return probe(mehr) === 0; } catch (e) { return false; } };
    // kleinstes x in [5, oben] (5er-Schritte) mit ok(x) – binär, unter der Annahme «mehr Zeit hilft nie weniger»; danach x − 5 geprüft
    const kleinstes = (oben, ok) => {
      if (oben < 5 || !ok(oben)) return null;
      let lo = 1, hi = oben / 5;                                          // in 5er-Einheiten
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (ok(mid * 5)) hi = mid; else lo = mid + 1; }
      return lo * 5;
    };
    for (const k of kand) {
      const oben = Math.min(cap, MAX - k.min); if (oben < 5) continue;
      const x = kleinstes(oben, (m) => geht({ [k.date]: k.min + m }));
      if (x != null) out.push({ art: "tag", tage: [{ date: k.date, min: k.min + x, plus: x }], plus: x });
    }
    out.sort((a, b) => a.plus - b.plus || a.tage[0].date.localeCompare(b.tage[0].date));
    const bester = out.length ? out[0].plus : null;
    if ((bester == null || bester > V92.GROSS) && kand.length >= 2) {
      // zwei Tage mit der meisten Zeit zuerst (so landen lange Einheiten dort, wo schon lange Tage sind); je gleich viel, zusammen höchstens das Fehlende
      const K = kand.slice().sort((a, b) => b.min - a.min || a.date.localeCompare(b.date)).slice(0, 4), paare = [];
      for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) paare.push([K[i], K[j]]);
      let gut = null;
      for (const [a, b] of paare) {
        const oben = Math.min(Math.floor(cap / 10) * 5, MAX - a.min, MAX - b.min); if (oben < 5) continue;
        const x = kleinstes(oben, (m) => geht({ [a.date]: a.min + m, [b.date]: b.min + m }));
        if (x != null && (!gut || 2 * x < gut.plus)) gut = { art: "verteilt", tage: [a, b].sort((p, q) => p.date.localeCompare(q.date)).map((k) => ({ date: k.date, min: k.min + x, plus: x })), plus: 2 * x };
      }
      if (gut && (bester == null || gut.plus <= cap)) out.push(gut);
    }
    return out.slice(0, 8);
  };
  /** Text eines Vorschlags: «Samstag auf 5 h 40 (+ 40 min)», «Samstag und Sonntag je + 1 h». */
  V92.vorschlagText = function (v) {
    if (!v || !v.tage || !v.tage.length) return "";
    if (v.art === "tag") { const t = v.tage[0]; return `${V92.tag(t.date)} auf ${V92.dauer(t.min)} (+ ${V92.dauer(t.plus)})`; }
    return `${v.tage.map((t) => V92.tag(t.date)).join(" und ")} je + ${V92.dauer(v.tage[0].plus)}`;
  };

  /* ---------------- woche-einstellen-1.0 ---------------- */
  /** Zustand eines Tages: «gesperrt» (Tag oder eine Einheit gesperrt), «hand» (eigener Eintrag vf-<Datum>), sonst «standard». */
  V92.zustand = function (verf, d, t) {
    if (t && (t.gesperrt || (Array.isArray(t.einheiten) && t.einheiten.some((s) => s && s.gesperrt)))) return "gesperrt";
    const e = verf && verf.eintrag ? verf.eintrag("vf-" + d) : null;
    return e && !e.entfernt ? "hand" : "standard";
  };
  V92.ZUSTAND = { standard: "Standard", hand: "von Hand", gesperrt: "gesperrt" };
  /**
   * Einträge aus dem Blatt «Woche einstellen». zeilen = [{ date, min (null = offen, 0 = kein Training), sport (null = alle), zurueck: true }],
   * modus «woche» (nur diese Woche: vf-<Datum>) oder «standard» (jede Woche so: vf-wt-N, dazu die Tageseinträge dieser Woche weg).
   * alt(id) → bisheriger Eintrag oder null; std(wt) → Standard des Wochentags { min, sport } oder null. → [{ ziel, wert }] (wert null = Eintrag weg)
   */
  V92.eintraege = function (zeilen, modus, alt, std) {
    const out = [], gleich = (a, b) => (a == null ? null : a) === (b == null ? null : b);
    const sp = (x) => (Array.isArray(x) && x.length < 3 ? x.slice().sort().join(",") : null);
    for (const z of zeilen || []) {
      const tagE = alt ? alt("vf-" + z.date) : null, hatTag = !!(tagE && !tagE.entfernt);
      const wert = { min: z.min == null ? null : z.min, sport: Array.isArray(z.sport) && z.sport.length < 3 ? z.sport.slice() : z.min === 0 ? [] : null };
      if (z.min === 0) wert.sport = [];
      if (modus === "standard") {
        const wt = wtNr(z.date), s0 = std ? std(wt) : null, offen = wert.min == null && wert.sport == null;
        const gleichStd = s0 ? gleich(s0.min, wert.min) && sp(s0.sport) === sp(wert.sport) : offen;
        if (!gleichStd) out.push({ ziel: { wt }, wert: offen ? null : wert });
        if (hatTag) out.push({ ziel: { date: z.date }, wert: null });
        continue;
      }
      if (z.zurueck) { if (hatTag) out.push({ ziel: { date: z.date }, wert: null }); continue; }
      const jetzt = hatTag ? { min: tagE.min, sport: tagE.sport } : std ? std(wtNr(z.date)) : null;
      const unv = jetzt ? gleich(jetzt.min, wert.min) && sp(jetzt.sport) === sp(wert.sport) : wert.min == null && wert.sport == null;
      if (!unv) out.push({ ziel: { date: z.date }, wert });
    }
    return out;
  };
  return V92;
});
