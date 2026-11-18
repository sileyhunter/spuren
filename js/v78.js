/* V7.8 (Auftrag V7.3, Etappe 4, Teil 1): Kalender als durchlaufende Liste mit Zwei-Wochen-Raster (kalender-4.0) und Trainingsstatus je Tag
   (trainingsstatus-1.0). Ohne DOM; im Browser window.V78, in Node require("./v78.js").

   trainingsstatus-1.0 (wie die Vorlage enduco: Ermüdung ÷ Fitness): Verhältnis der kurzfristigen zur langfristigen Last (ATL ÷ CTL desselben Modells
   wie Fitness und Ermüdung, pmc-2.1). Stufen als Orientierung (eigene Festlegung, angelehnt an das Verhältnis akuter zu chronischer Last, das als
   Verletzungsmarker umstritten ist): unter 0,8 wenig Last, 0,8–1,3 üblich, 1,3–1,5 hoch, über 1,5 sehr hoch. Ohne Fitness ab 1 keine Zahl.

   zyklus-1.0 (V7.9, Etappe 4 Teil 2, Vorlage «Zyklus»): vier Karten je Woche aus Seitendaten. Bereich der Wochenlast = TL ≈ des Wochenvorschlags
   ± 7,5 % (eigene Festlegung; die Vorlage nennt einen «optimalen Bereich», ohne zu sagen, wie sie ihn rechnet). Verteilung locker/mittel/hart wie
   tid-1.0 (nur Rad und Laufen, nach den Zielen der Abschnitte). Fokus = Minuten je Zone aus den Abschnitten aller geplanten Einheiten (ohne Pausen).

   fitness-prognose-1.0: Fitness wie pmc-2.1 (x += (Last − x) ÷ 42 je Tag) ab dem Stand zu Beginn von heute, fortgeschrieben mit der geplanten Last je
   Tag – Mein Plan bis drei Wochen voraus wie das Tagesblatt (TL ≈; Einheiten ohne TL ≈, z. B. Tests oder Schwimmen ohne CSS-Test, mit Dauer × deiner
   Last pro Stunde der Sportart, basis-1.1), danach die Wochenstunden der Steigerung (steigerung-1.0) × deine Last pro Stunde je Sportart gleichmässig
   auf die Tage verteilt. Band = dieselbe Rechnung mit 7,5 % weniger bzw. mehr Last. Ein Modell, keine Vorhersage.

   bearbeiten-1.0 (V7.9, Vorlage «Bearbeiten»): Bearbeiten als Modus. Jede Änderung (V66.aendern) geht in einen Entwurf je Woche (V64UI.entwurf) mit
   Verlauf für ↶/↷; gespeichert wird erst mit ✓, ✕ verwirft. Einheiten am Griff auf einen anderen Tag derselben Woche ziehen (oder den Griff antippen
   und den Tag wählen); Schloss je Einheit und je Tag; ✨ «Woche anpassen?» verteilt um die gesperrten herum neu (V66 «anpassen»). Nie an Garmin,
   solange der Entwurf offen ist; Werkzeuge, die direkt speichern (Draussen planen, Planeinstellungen, Verfügbarkeit der Woche), warten bis danach.

   tagesblatt-2.0 (V7.10, Vorlage «Tagesblatt», Oberfläche in js/v66-ui.js): Kopf mit Fitness, Ermüdung, Status und Form (Erklärung hinter «i»), die Einheiten wie im
   Kalender, Zeilen «Training hinzufügen ›» und «Eigene Aktivität planen ›» (eigene-aktivitaet-1.0 in js/v66.js), Verfügbarkeit des Tages direkt im Blatt (Sportarten
   und Regler 0–8 h, ganz rechts «offen», sofort gespeichert), Krafttraining, unten klein «Tag sperren» und Garmin. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V78 = factory();
  if (node) module.exports = V78;
  if (root) root.V78 = V78;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V78 = { VERSIONS: { kalender: "kalender-4.1", status: "trainingsstatus-1.0", zyklus: "zyklus-1.0", prognose: "fitness-prognose-1.0", bearbeiten: "bearbeiten-1.0", tagesblatt: "tagesblatt-2.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const pd = (s) => new Date(s + "T12:00:00Z");
  const iso = (d) => d.toISOString().slice(0, 10);
  const add = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  V78.montag = (s) => add(s, -((pd(s).getUTCDay() + 6) % 7));
  const TAG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  const MONAT = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  /* ---------------- Trainingsstatus (trainingsstatus-1.0) ---------------- */
  V78.STUFEN = [[0.8, "wenig", "wenig Last"], [1.3, "ueblich", "üblich"], [1.5, "hoch", "hoch"], [Infinity, "sehr", "sehr hoch"]];
  /** Ermüdung ÷ Fitness, auf zwei Stellen; ohne Fitness ab 1 null. */
  V78.status = (fitness, ermuedung) => (isNum(fitness) && fitness >= 1 && isNum(ermuedung) && ermuedung >= 0 ? Math.round((ermuedung / fitness) * 100) / 100 : null);
  /** Stufe eines Status: { k, text, anteil (0–1 auf der Skala bis 2) }. */
  V78.stufe = function (s) {
    if (!isNum(s)) return null;
    const x = V78.STUFEN.find(([g]) => s < g) || V78.STUFEN[V78.STUFEN.length - 1];
    return { k: x[1], text: x[2], anteil: Math.max(0, Math.min(1, s / 2)) };
  };
  /** Veränderung zum Vortag (gerundet) und Text mit Vorzeichen. */
  V78.delta = (heute, vortag, stellen) => {
    if (!isNum(heute) || !isNum(vortag)) return null;
    const f = Math.pow(10, stellen || 0), d = Math.round((heute - vortag) * f) / f;
    return { d, text: (d > 0 ? "+" : d < 0 ? "−" : "±") + String(Math.abs(d)).replace(".", ",") };
  };

  /* ---------------- Kalender (kalender-4.0) ---------------- */
  /** Wochen (Montage) für die durchlaufende Liste: vor Wochen zurück und nach Wochen voraus ab der Woche von heute. */
  V78.wochen = function (heute, vor, nach) {
    const mo = V78.montag(heute), out = [];
    for (let i = -(vor || 0); i <= (nach || 0); i++) out.push(add(mo, 7 * i));
    return out;
  };
  /** Raster: n Wochen ab der Woche von ds (2 = zusammengeklappt, 6 = Monat), je Woche Montag und Tage. */
  V78.raster = function (ds, n) {
    const mo = V78.montag(ds), out = [];
    for (let w = 0; w < (n || 2); w++) { const m = add(mo, 7 * w); out.push({ montag: m, tage: Array.from({ length: 7 }, (_, i) => add(m, i)) }); }
    return out;
  };
  /** Raster als Monat: die Wochen, die den Monat von ds berühren (vier bis sechs). */
  V78.monatsRaster = function (ds) {
    const d = pd(ds), erster = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))), letzter = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    const out = []; for (let m = V78.montag(erster); m <= letzter; m = add(m, 7)) out.push({ montag: m, tage: Array.from({ length: 7 }, (_, i) => add(m, i)) });
    return out;
  };
  V78.tagText = (ds) => { const d = pd(ds); return `${TAG[d.getUTCDay()]}, ${d.getUTCDate()}. ${MON[d.getUTCMonth()]}`; };
  V78.monatText = (ds) => { const d = pd(ds); return `${MONAT[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  V78.bereichText = (mo) => { const a = pd(mo), b = pd(add(mo, 6)); return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}.–${b.getUTCDate()}. ${MON[b.getUTCMonth()]}` : `${a.getUTCDate()}. ${MON[a.getUTCMonth()]} – ${b.getUTCDate()}. ${MON[b.getUTCMonth()]}`; };
  /** Kopf einer Woche: «Phase | Wochenart» (Vorlage «Build | Belastung 3»), ohne Angaben nur die Phase oder «Woche». */
  V78.wochenTitel = (phase, art) => [phase || null, art && art.text ? art.text : null].filter(Boolean).join(" | ") || "Woche";
  /** Zeile «1:52 h · ≈ 47,6 km · TL ≈ 101» einer Einheit aus Dauer (min) und Schätzung (V66.schaetzung). */
  V78.zeile = function (min, S) {
    const T = [];
    if (isNum(min)) T.push(min >= 60 ? `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")} h` : `${Math.round(min)} min`);
    if (S && isNum(S.km) && S.km > 0) T.push(`≈ ${String(Math.round(S.km * 10) / 10).replace(".", ",")} km`);
    if (S && isNum(S.tl)) T.push(`TL ≈ ${S.vollstaendig === false ? "mind. " : ""}${S.tl}`);
    return T.join(" · ");
  };
  /** Was ein leerer Tag ist: Kein Training laut Verfügbarkeit, sonst Ruhetag (vergangene Tage ohne Plan: frei). */
  V78.leer = function (v, vorbei) {
    if (vorbei) return { art: "frei", text: "frei" };
    if (v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length))) return { art: "kein", text: "Kein Training" };
    return { art: "ruhe", text: "Ruhetag" };
  };

  /* ---------------- Zyklus (zyklus-1.0) ---------------- */
  V78.SPANNE = 0.075;
  /** Bereich [tief, hoch] um eine Wochenlast (TL ≈ des Vorschlags ± 7,5 %); ohne Last null. */
  V78.bereich = (tl, spanne) => (isNum(tl) && tl > 0 ? [Math.round(tl * (1 - (isNum(spanne) ? spanne : V78.SPANNE))), Math.round(tl * (1 + (isNum(spanne) ? spanne : V78.SPANNE)))] : null);
  /** Wo eine Zahl zum Bereich liegt: "unter", "im", "ueber" (ohne Bereich null). */
  V78.lage = (x, b) => (!b || !isNum(x) ? null : x < b[0] ? "unter" : x > b[1] ? "ueber" : "im");
  /** Minuten locker/mittel/hart der Einheiten (tid-1.0: nur Rad und Laufen). Einheiten ohne «minuten» aus ihren Abschnitten über DREI (Zone → Bereich). */
  V78.drei = function (einheiten, DREI) {
    const z = { locker: 0, mittel: 0, hart: 0 };
    for (const e of einheiten || []) {
      if (!e || (e.sport !== "rad" && e.sport !== "lauf") || e.art === "draussen") continue;
      if (e.minuten && ["locker", "mittel", "hart"].every((k) => isNum(e.minuten[k]))) { for (const k of ["locker", "mittel", "hart"]) z[k] += e.minuten[k]; continue; }
      for (const x of e.teile || []) { const b = Array.isArray(x) && DREI ? DREI[x[0]] : null; if (b && isNum(x[1])) z[b] += x[1]; }
    }
    const s = z.locker + z.mittel + z.hart;
    return Object.assign(z, { summe: s, anteil: s ? { locker: z.locker / s, mittel: z.mittel / s, hart: z.hart / s } : null });
  };
  /** Fokus: Minuten je Zone aus den Abschnitten aller Einheiten (ohne Pausen und Abschnitte ohne Ziel), absteigend → [[zone, min], …]. */
  V78.fokus = function (einheiten) {
    const m = new Map();
    for (const e of einheiten || []) for (const x of (e && e.teile) || []) {
      if (!Array.isArray(x) || !isNum(x[1]) || x[1] <= 0 || ["pause", "ohne", "offen", "test"].includes(x[0])) continue;
      m.set(x[0], (m.get(x[0]) || 0) + x[1]);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  };

  /* ---------------- Bearbeiten (bearbeiten-1.0): Entwurf je Woche mit Verlauf ---------------- */
  /** gespeichert(mo) → gespeicherter Eintrag der Woche (oder null); geaendert() wird nach jeder Änderung des Entwurfs gerufen (Zwischenspeicher leeren).
   *  Solange aktiv, gilt für jede Woche mit Entwurf dessen Stand (hat/eintrag); neu() verwirft Schritte nach einem ↶. */
  V78.entwurf = function (gespeichert, geaendert) {
    const S = { aktiv: false, wochen: new Map(), verlauf: [], pos: 0 }, fertig = () => { if (geaendert) geaendert(); };
    const leer = () => { S.wochen = new Map(); S.verlauf = []; S.pos = 0; fertig(); };
    const gleich = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
    return {
      aktiv: () => S.aktiv,
      starten() { leer(); S.aktiv = true; },
      beenden() { leer(); S.aktiv = false; },
      hat: (mo) => S.aktiv && S.wochen.has(mo),
      eintrag: (mo) => (S.wochen.has(mo) ? S.wochen.get(mo) : gespeichert(mo)),
      neu(mo, E, a) {
        if (!S.aktiv) return false;
        const vor = S.wochen.has(mo) ? S.wochen.get(mo) : gespeichert(mo);
        S.verlauf.length = S.pos; S.verlauf.push({ mo, vor, nach: E, a: a || null }); S.pos = S.verlauf.length; S.wochen.set(mo, E); fertig();
        return true;
      },
      zurueck() { if (!S.aktiv || !S.pos) return null; const x = S.verlauf[--S.pos]; S.wochen.set(x.mo, x.vor); fertig(); return x; },
      vor() { if (!S.aktiv || S.pos >= S.verlauf.length) return null; const x = S.verlauf[S.pos++]; S.wochen.set(x.mo, x.nach); fertig(); return x; },
      kannZurueck: () => S.aktiv && S.pos > 0,
      kannVor: () => S.aktiv && S.pos < S.verlauf.length,
      /** Wochen, deren Entwurf vom Gespeicherten abweicht → [{ mo, E }], nach Montag */
      aenderungen: () => [...S.wochen.entries()].filter(([mo, E]) => !gleich(E, gespeichert(mo))).sort((x, y) => x[0].localeCompare(y[0])).map(([mo, E]) => ({ mo, E })),
      /** die gültigen Schritte bis zur Stelle von ↶/↷ */
      schritte: () => S.verlauf.slice(0, S.pos),
    };
  };

  /* ---------------- Fitness-Prognose (fitness-prognose-1.0) ---------------- */
  /** Wochenlast einer Woche der Steigerung: Stunden je Sportart × Last pro Stunde (basis-1.1). → { tl, ohne: [Sportarten mit Stunden, aber ohne Last pro Stunde] } */
  V78.wochenLast = function (r, ba) {
    let tl = 0; const ohne = [];
    for (const s of ["schwimm", "rad", "lauf"]) {
      const h = r && isNum(r[s]) ? r[s] : 0; if (!(h > 0)) continue;
      const q = ba && ba[s] && isNum(ba[s].tl_h) && ba[s].tl_h > 0 ? ba[s].tl_h : null;
      if (q == null) ohne.push(s); else tl += h * q;
    }
    return { tl: Math.round(tl), ohne };
  };
  /** Fitness ab f0 (Stand zu Beginn von «von») Tag für Tag bis zum Beginn von «bis» mit lastAm(Datum) (Zahl; null zählt 0). → [{ date, f }]:
   *  je Tag die Fitness zu Beginn dieses Tages, erster Eintrag = von mit f0, letzter = bis. */
  V78.prognose = function (f0, von, bis, lastAm) {
    if (!isNum(f0) || !von || !bis || bis < von) return [];
    const out = [{ date: von, f: f0 }]; let x = f0;
    for (let d = von; d < bis; d = add(d, 1)) { const L = lastAm(d); x += ((isNum(L) ? L : 0) - x) / 42; out.push({ date: add(d, 1), f: x }); }
    return out;
  };
  return V78;
});
