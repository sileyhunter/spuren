/* V7.7 (Auftrag V7.3, Etappe 4, erster Teil): Aktivitäten draussen im Voraus planen (aktivitaet-plan-1.0) und Zonen nach Puls prüfen
   (zonenpruefung-hf-1.0). Ohne DOM; im Browser window.V77, in Node require("./v77.js").

   aktivitaet-plan-1.0 – Regeln (eigene Festlegungen; Vorschlag vom 17.11.2026, von Silas am 18.11.2026 bestätigt, den Ersatz hat er Claude überlassen):
   - Skitour, Wandern, Langlauf und Traillauf an einem Tag planen, auch Wochen im Voraus: Dauer 1–10 h in 15-min-Schritten, Intensität nach Puls Z1
     oder Z2 (Standard Z2), Pulszonen vom Laufen (wie beim Wandern in V6.SKALA). Eintrag «ak-JJJJ-MM-TT» (einer je Tag), über «Direkt speichern».
   - Der Tag gehört der Aktivität: andere Einheiten des Vorschlags ziehen auf andere Tage (V66.verteilen). Ab 2 h am Vortag und am Tag danach keine
     harte Rad- oder Laufeinheit (wie nach dem Krafttraining; passt sie nirgends, wird sie an ihrem Tag locker – gemeldet).
   - Ersatz: Skitour, Langlauf und Wandern ersetzen Rad-Stunden, Traillauf Lauf-Stunden. Laufen bleibt sonst unberührt: es ist für Hamburg am
     spezifischsten und sein Aufbau am heikelsten (Aufbau-Check); Skitour ersetzt wie die Rolle Ausdauer an Land ohne Schläge. Z2-Stunden zählen
     ganz, Z1-Stunden halb. Ab 2 h zuerst die lange Einheit der Sportart, dann lockere Einheiten (die nächste zuerst); unter 2 h umgekehrt.
     Schlüsseleinheiten, Tests, eigene und gesperrte Einheiten nie. Was übrig bleibt, kommt dazu (gemeldet) – Skitouren sind auch Freude, kein Abzug.
   - TL ≈ aus den eigenen Aktivitäten derselben Art (Median Last pro Stunde der letzten zwei Jahre, mindestens drei ab 1 h; Z1 × 0,8); ohne sie
     keine Zahl. Zählt in Fitness, Form und Ampel wie absolvierte Skitouren und Wanderungen (Entscheid vom 9.11.2026). Nicht an Garmin.
   - Ampel «vorsichtig»: höchstens zwei Drittel der Dauer und nur Z1 (V74.locker); Krankheitszeichen: Ruhetag (wie jede Einheit).

   zonenpruefung-hf-1.0 – jede bestätigte Messung mit Puls-Fenster ab 10 min (laktat-hf-1.0) und Pulsanstieg bis 5 % gegen das Laktat an der LT1 des
   letzten bestätigten Stufentests derselben Sportart davor (Basis + 0,5 mmol/l; Basis = Mittel der ersten drei Stufen; Rad mit Rad, alles andere
   mit Laufen): Puls in Z1–Z2 und Laktat deutlich darunter = «passt», deutlich darüber = «Z2 zu hoch», sonst «unklar» (deutlich = mehr als das
   Doppelte des gemeinsamen Messfehlers, σ = max(0,15; 7,5 %) wie laktat-drift-1.0). Erst nach drei gleichen Urteilen in acht Wochen ein Hinweis;
   Zonen ändern sich nie von selbst. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V64 = node ? require("./v64.js") : root.V64, V66 = node ? require("./v66.js") : root.V66;
  const V77 = factory(V64, V66);
  if (node) module.exports = V77;
  if (root) root.V77 = V77;
})(typeof window !== "undefined" ? window : null, function (V64, V66) {
  "use strict";
  const V77 = { VERSIONS: { aktivitaet: "aktivitaet-plan-1.0", zonenpruefung: "zonenpruefung-hf-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const add = (iso, n) => V64.addDays(iso, n);
  const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const wtK = (ds) => TAGE[(new Date(ds + "T12:00:00Z").getUTCDay() + 6) % 7];

  /** Arten: Titel, Sportart der Einheit (Symbol, Farbe), welche Stunden sie ersetzt, Standarddauer, Kopfbild, Erkennung absolvierter Aktivitäten. */
  V77.ARTEN = {
    skitour: { titel: "Skitour", sport: "ski", ersetzt: "rad", std: 300, bild: "skitour", akt: (a) => a.sport === "ski" && /skitour/i.test(a.typ || "") },
    wandern: { titel: "Wandern", sport: "wandern", ersetzt: "rad", std: 240, bild: "wandern", akt: (a) => a.sport === "wandern" && !/^gehen$/i.test(a.typ || "") },
    langlauf: { titel: "Langlauf", sport: "ski", ersetzt: "rad", std: 120, bild: "skitour", akt: (a) => a.sport === "ski" && /langl|cross/i.test(a.typ || "") },
    trail: { titel: "Traillauf", sport: "lauf", ersetzt: "lauf", std: 120, bild: "wandern", akt: (a) => a.sport === "lauf" && /trail/i.test(a.typ || "") },
  };
  V77.MIN = 60; V77.MAX = 600; V77.SCHRITT = 15;
  V77.LANG = 120;              // ab 2 h: lange Einheit ersetzen, Vortag und Tag danach ohne harte Einheit an Land
  V77.Z1_ANTEIL = 0.5;         // Z1-Stunden ersetzen halb so viel wie Z2-Stunden
  V77.TL_Z1 = 0.8;             // TL ≈ in Z1 (eigene Festlegung, ohne genaue Grundlage)
  V77.ANSTIEG_MAX = 5;         // zonenpruefung-hf-1.0: Pulsanstieg im Fenster höchstens 5 %
  V77.WOCHEN = 8;              // Hinweis erst nach drei gleichen Urteilen in acht Wochen
  V77.dauerText = (min) => (min >= 60 ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h` : `${min} min`);
  const istDatum = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

  /* ---------------- Eintrag prüfen und zusammenführen ---------------- */
  /** Eintrag «ak-JJJJ-MM-TT» prüfen (gleiche Regeln in tools/merge_daily.py aktivitaet_pruefen). → null oder Grund. */
  V77.pruefen = function (a) {
    if (!a || typeof a !== "object" || Array.isArray(a)) return "kein Eintrag";
    if (!istDatum(a.date)) return "Datum fehlt";
    if (a.id !== "ak-" + a.date) return "Kennung passt nicht zum Datum";
    if (typeof a.geaendert !== "string" || isNaN(Date.parse(a.geaendert))) return "ohne Zeitpunkt der Änderung";
    if (a.entfernt !== undefined && a.entfernt !== true) return "entfernt nur ja";
    if (a.entfernt === true) return null;
    if (!V77.ARTEN[a.art]) return "unbekannte Aktivität";
    if (!Number.isInteger(a.min) || a.min < V77.MIN || a.min > V77.MAX || a.min % V77.SCHRITT) return "Dauer 1–10 h in 15-min-Schritten";
    if (!["z1", "z2"].includes(a.zone)) return "Intensität Z1 oder Z2";
    if (a.uhrzeit != null && (typeof a.uhrzeit !== "string" || !/^([01]\d|2[0-3]):[0-5][05]$/.test(a.uhrzeit))) return "Uhrzeit hh:mm in 5-min-Schritten";
    if (a.notiz != null && (typeof a.notiz !== "string" || a.notiz.length > 300)) return "Notiz höchstens 300 Zeichen";
    return null;
  };
  /** Neuer Eintrag aus der Wahl auf der Seite. */
  V77.eintrag = function (ds, w, jetzt) {
    const e = { id: "ak-" + ds, date: ds, art: w.art, min: w.min, zone: w.zone || "z2", v: V77.VERSIONS.aktivitaet, geaendert: jetzt || new Date().toISOString() };
    if (w.uhrzeit) e.uhrzeit = w.uhrzeit;
    if (w.notiz) e.notiz = String(w.notiz).slice(0, 300);
    return e;
  };
  /** Gespeicherte Einträge (D.plan_aktivitaeten) und die noch nicht eingespielten auf diesem Gerät → Map Datum → Eintrag (neueste Fassung; entfernt = weg). */
  V77.liste = function (gespeichert, inbox) {
    const M = new Map();
    for (const e of [].concat(gespeichert || [], inbox || [])) {
      if (V77.pruefen(e)) continue;
      const alt = M.get(e.id);
      if (!alt || String(e.geaendert) >= String(alt.geaendert)) M.set(e.id, e);
    }
    const out = new Map();
    for (const e of M.values()) if (!e.entfernt) out.set(e.date, e);
    return out;
  };

  /* ---------------- Einheit und Woche ---------------- */
  /** Eintrag → Einheit wie in Mein Plan (V66.einheit mit der Vorlage der Aktivität), uid «akt-<Datum>». */
  V77.einheit = function (a, ctxE) {
    if (!a || V77.pruefen(a) || a.entfernt) return null;
    const spec = { uid: "akt-" + a.date, vorlage: a.art, dauer: a.min, zone: a.zone, quelle: "eigen" };
    if (a.uhrzeit) spec.uhrzeit = a.uhrzeit;
    const e = V66.einheit(spec, ctxE || {});
    if (!e) return null;
    return Object.assign(e, { aktivitaet: true, notiz: a.notiz || null, spec });
  };
  const hart = (e) => !!e && (!!e.schluessel || e.art === "schluessel_s");
  const LOCKER_ID = { rad: "rad_locker", lauf: "lauf_locker" };
  const r5 = (x) => Math.floor(x / 5) * 5;
  /** Wie viele Minuten der ersetzten Sportart eine Aktivität ersetzt (Z2 ganz, Z1 halb). */
  V77.ersatzMin = (a) => Math.round(a.min * (a.zone === "z1" ? V77.Z1_ANTEIL : 1));
  /** Ersatz in einer (unverteilten) Woche: Rad- bzw. Lauf-Einheiten des Vorschlags kürzen oder streichen. tage wird verändert. */
  function ersetzen(tage, ds, a, ctxE, schon) {
    const A = V77.ARTEN[a.art], sp = A.ersetzt, R0 = Math.max(0, V77.ersatzMin(a) - (isNum(schon) ? schon : 0)), di = tage.findIndex((t) => t.date === ds);
    let R = R0;
    const weg = [], kurz = [];
    const K = [];
    tage.forEach((t, ti) => (t.einheiten || []).forEach((e) => {
      if (e.sport !== sp || e.aktivitaet || e.art === "draussen" || hart(e) || e.test || e.art === "test" || e.gesperrt || e.quelle === "eigen" || e.quelle === "bibliothek") return;
      if (e.art === "lang" || e.art === "locker") K.push({ t, ti, e });
    }));
    const naehe = (k) => Math.abs(k.ti - di) * 10 + (k.ti < di ? 1 : 0);          // die nächste zuerst, bei gleichem Abstand der Tag danach
    const lange = K.filter((k) => k.e.art === "lang").sort((x, y) => y.e.dauer - x.e.dauer || naehe(x) - naehe(y));
    const lockere = K.filter((k) => k.e.art === "locker").sort((x, y) => naehe(x) - naehe(y));
    const folge = a.min >= V77.LANG ? lange.concat(lockere) : lockere.concat(lange);
    for (const k of folge) {
      if (R <= 0) break;
      const e = k.e, d = e.dauer || 0, rest = d - R, i = k.t.einheiten.indexOf(e);
      if (i < 0 || d <= 0) continue;
      const B = V66.bereich(e.id) || { min: d };
      let neu = null;
      if (rest >= B.min) neu = V66.einheit({ vorlage: e.id, dauer: Math.max(B.min, r5(rest)), quelle: "vorschlag" }, ctxE || {});
      else if (e.art === "lang" && rest >= (V66.bereich(LOCKER_ID[sp]) || { min: Infinity }).min) neu = V66.einheit({ vorlage: LOCKER_ID[sp], dauer: r5(rest), quelle: "vorschlag" }, ctxE || {});
      if (neu) {
        if (e.drinnen && !neu.drinnen) neu.drinnen = e.drinnen;
        delete neu.uid;
        k.t.einheiten[i] = neu; kurz.push({ titel: e.titel, date: k.t.date, von: d, nach: neu.dauer, zu: neu.titel !== e.titel ? neu.titel : null }); R -= d - neu.dauer;
      } else {
        k.t.einheiten.splice(i, 1); weg.push({ titel: e.titel, date: k.t.date, dauer: d }); R -= d;
        if (e.art === "lang" && sp === "rad") {                                           // der Koppellauf gehört zur langen Ausfahrt
          const j = k.t.einheiten.findIndex((x) => x.art === "koppel");
          if (j >= 0) { const [x] = k.t.einheiten.splice(j, 1); weg.push({ titel: x.titel, date: k.t.date, dauer: x.dauer, grund: "gehört zur langen Ausfahrt" }); }
        }
      }
      if (!k.t.einheiten.length) k.t.ruhetag = true;
    }
    return { ersatz: R0, ersetzt: Math.max(0, R0 - Math.max(0, R)), zusatz: Math.max(0, R), weg, kurz };
  }
  /** Text zum Ersatz (Hinweis in der Woche und auf der Einheit-Seite). */
  V77.ersatzText = function (a, r) {
    const A = V77.ARTEN[a.art], sp = A.ersetzt === "rad" ? "Rad" : "Laufen", T = [];
    for (const w of r.weg || []) T.push(`«${w.titel}» ${wtK(w.date)} entfällt`);
    for (const k of r.kurz || []) T.push(`«${k.titel}» ${wtK(k.date)} ${V77.dauerText(k.von)} → ${V77.dauerText(k.nach)}${k.zu ? ` (${k.zu})` : ""}`);
    const kopf = `${A.titel} am ${wtK(a.date)} (${V77.dauerText(a.min)}, ${a.zone.toUpperCase()})`;
    const teil = r.ersetzt > 0 ? `ersetzt ${V77.dauerText(r.ersetzt)} ${sp}${T.length ? ": " + T.join(", ") : ""}` : `ersetzt kein ${sp} (keine lockere oder lange Einheit übrig)`;
    return `${kopf} ${teil}${r.zusatz > 0 ? `; ${V77.dauerText(r.zusatz)} kommen dazu` : ""} (${V77.VERSIONS.aktivitaet})`;
  };
  /**
   * Aktivitäten einer Woche in den (unverteilten) Wochenvorschlag w: Einheit an ihren Tag (bleibt dort, eigene Quelle), dann der Ersatz.
   * akts = V77.liste(...) (Map Datum → Eintrag); opt = { ctxE }. In Rennwochen nur eintragen, nichts ersetzen (gemeldet).
   * → Woche mit tage, draussen (je Aktivität: Datum, Art, Ersatz) und hinweise.
   */
  V77.einplanen = function (w, akts, opt) {
    opt = opt || {};
    if (!w || !Array.isArray(w.tage) || !akts || !akts.size) return w;
    const tage = w.tage.map((t) => Object.assign({}, t, { einheiten: (t.einheiten || []).slice() }));
    const hinweise = (w.hinweise || []).slice(), info = [], renn = tage.some((t) => t.rennen);
    for (const t of tage) {
      const a = akts.get(t.date); if (!a) continue;
      const u = V77.einheit(a, opt.ctxE); if (!u) continue;
      t.einheiten.unshift(u); t.ruhetag = false;
      if (renn) { hinweise.push(`${V77.ARTEN[a.art].titel} am ${wtK(t.date)} in einer Rennwoche: eingetragen, sonst nichts geändert – bitte selbst prüfen (${V77.VERSIONS.aktivitaet})`); info.push({ date: t.date, art: a.art, min: a.min, zone: a.zone, renn: true }); continue; }
      const r = ersetzen(tage, t.date, a, opt.ctxE);
      const txt = V77.ersatzText(a, r);
      hinweise.push(txt);
      // Tests werden nie verschoben: am selben Tag oder am Tag danach nur melden (wie beim Krafttraining)
      const i = tage.indexOf(t), test = (x) => x && (x.einheiten || []).filter((e) => e.art === "test" || e.test).map((e) => e.titel);
      const T0 = test(t), T1 = test(tage[i + 1]);
      if (T0 && T0.length) hinweise.push(`${V77.ARTEN[a.art].titel} am ${wtK(t.date)}: am selben Tag ${T0.join(", ")} – Test im Testkalender verschieben oder die Aktivität an einen anderen Tag (${V77.VERSIONS.aktivitaet})`);
      else if (T1 && T1.length && a.min >= V77.LANG) hinweise.push(`${V77.ARTEN[a.art].titel} am ${wtK(t.date)}: am Tag danach ${T1.join(", ")} – müde gemessen gibt falsche Werte, Test verschieben (${V77.VERSIONS.aktivitaet})`);
      info.push(Object.assign({ date: t.date, art: a.art, min: a.min, zone: a.zone, text: txt }, r));
    }
    return Object.assign({}, w, { tage, draussen: info, hinweise });
  };
  /** Ersatz für eine gespeicherte Woche (Mein Plan, Listen mit Specs): gleiche Regeln auf die Einheiten des Vorschlags ab heute.
   *  E = Eintrag aus V66 (montag, tage{datum: {einheiten: [spec]}}), heute, ctxE. Verändert E. → Ergebnis wie ersetzen, plus Text. */
  V77.ersetzenGespeichert = function (E, a, heute, ctxE, schon) {
    const tage = Object.keys(E.tage || {}).sort().filter((d) => d >= heute && E.tage[d] && !E.tage[d].gesperrt && Array.isArray(E.tage[d].einheiten)).map((d) => ({
      date: d, einheiten: E.tage[d].einheiten.map((s) => { if (s.quelle !== "vorschlag" || s.gesperrt) return { spec: s, fest: true }; const e = V66.einheit(s, ctxE || {}); return e ? Object.assign(e, { spec: s }) : { spec: s, fest: true }; }) }));
    // feste Specs als Platzhalter (nie geändert): Sportart leer
    for (const t of tage) t.einheiten = t.einheiten.map((x) => (x.fest ? Object.assign({ sport: null, art: "fest", dauer: x.spec.dauer }, x) : x));
    const r = ersetzen(tage, a.date, a, ctxE, schon);                     // schon = Minuten, die die bisherige Fassung in dieser Woche schon ersetzt hat
    for (const t of tage) E.tage[t.date].einheiten = t.einheiten.map((x, i) => (x.fest ? x.spec : x.spec && x.dauer === x.spec.dauer && x.id === x.spec.vorlage ? x.spec
      : Object.assign({ uid: (x.spec && x.spec.uid) || `v-${t.date}-a${i}`, vorlage: x.id, dauer: x.dauer, quelle: "vorschlag" }, x.drinnen ? { drinnen: true } : {})));
    return Object.assign(r, { text: V77.ersatzText(a, r) });
  };

  /* ---------------- TL ≈ aus den eigenen Aktivitäten ---------------- */
  /** Last pro Stunde je Art: Median der eigenen Aktivitäten (ab 1 h, letzte zwei Jahre bis heute, mindestens drei). model = config.load_model. */
  V77.tlProStunde = function (acts, model, heute) {
    const bis = heute || new Date().toISOString().slice(0, 10), von = add(bis, -730), out = {};
    const tl = (a) => (model && /^last-2/.test(model) && isNum(a.tl2) ? a.tl2 : isNum(a.tss) ? a.tss : null);
    for (const [k, A] of Object.entries(V77.ARTEN)) {
      const W = (acts || []).filter((a) => a && a.date >= von && a.date <= bis && A.akt(a) && isNum(a.dur) && a.dur >= 3600 && isNum(tl(a)) && tl(a) > 0).map((a) => tl(a) / (a.dur / 3600)).sort((x, y) => x - y);
      if (W.length >= 3) out[k] = Math.round((W.length % 2 ? W[(W.length - 1) / 2] : (W[W.length / 2 - 1] + W[W.length / 2]) / 2) * 10) / 10;
    }
    return out;
  };

  /* ---------------- Zonen nach Puls prüfen (zonenpruefung-hf-1.0) ---------------- */
  const sigma = (la) => Math.max(0.15, 0.075 * la);
  const zoneVon = (L, hr) => {
    if (!Array.isArray(L) || !isNum(hr)) return null;
    for (const z of L) if (z && isNum(z.von) && isNum(z.bis) && hr >= z.von && hr < z.bis) return z.z;
    const o = L.filter((z) => z && isNum(z.von)).sort((x, y) => y.von - x.von)[0];
    return o && hr >= o.von ? o.z : null;
  };
  /** Messungen (D.lactate, Kurzchecks mit fenster_s) mit Urteil und Fazit der letzten acht Wochen. skalen = TR.zonen(D.zonen).skalen. */
  V77.zonenPruefung = function (lactate, skalen, heute) {
    const S = skalen || {}, L = lactate || [], bis = heute || new Date().toISOString().slice(0, 10);
    const tests = L.filter((x) => x && x.kind === "stufentest" && Array.isArray(x.stages) && x.stages.filter((s) => s && isNum(s.la)).length >= 3)
      .map((x) => { const la = x.stages.filter((s) => s && isNum(s.la)).slice(0, 3).map((s) => s.la); const basis = la.reduce((s, v) => s + v, 0) / la.length;
        return { date: x.date, sport: x.sport === "rad" ? "rad" : "lauf", lt1: Math.round((basis + 0.5) * 100) / 100 }; })
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const M = L.filter((x) => x && x.kind === "check" && isNum(x.fenster_s) && x.fenster_s >= 600 && isNum(x.hr_avg) && isNum(x.lactate)).map((x) => {
      const sp = x.sport === "rad" ? "rad" : "lauf", zone = zoneVon(sp === "rad" ? S.rad_hf : S.lauf_hf, x.hr_avg);
      const t = tests.filter((y) => y.sport === sp && y.date <= x.date).pop() || null;
      const m = { id: x.id || null, date: x.date, sport: x.sport || sp, hr: x.hr_avg, zone, la: x.lactate, fenster_min: Math.round(x.fenster_s / 60), anstieg: isNum(x.drift) ? x.drift : null,
        lt1: t ? t.lt1 : null, test: t ? t.date : null, urteil: "unklar", grund: null };
      if (isNum(m.anstieg) && m.anstieg > V77.ANSTIEG_MAX) m.grund = `Puls stieg im Fenster um ${m.anstieg} % – noch nicht gleichmässig`;
      else if (!zone) m.grund = "ohne Pulszonen im aktiven Zonenprofil";
      else if (!t) m.grund = "ohne bestätigten Stufentest davor";
      else if (!["Z1", "Z2"].includes(zone)) { m.urteil = "über Z2"; m.grund = "Puls über Z2 – nicht beurteilt"; }
      else {
        const d = m.la - t.lt1, s2 = 2 * Math.sqrt(sigma(m.la) ** 2 + sigma(t.lt1) ** 2);
        if (d < -s2) m.urteil = "passt";
        else if (d > s2) m.urteil = "Z2 zu hoch";
        else m.grund = "Laktat nahe am LT1-Wert – innerhalb des Messfehlers";
      }
      return m;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
    const ab = add(bis, -7 * V77.WOCHEN), neu = M.filter((m) => m.date >= ab && m.date <= bis);
    const n = (u) => neu.filter((m) => m.urteil === u).length;
    let fazit = null;
    if (n("Z2 zu hoch") >= 3) fazit = { art: "zu hoch", text: `In ${V77.WOCHEN} Wochen ${n("Z2 zu hoch")} Messungen mit Puls in Z1–Z2 und Laktat über dem LT1-Wert: die Puls-Obergrenze von Z2 ist für diese Aktivitäten wohl zu hoch. Mit dem nächsten Stufentest prüfen – die Seite ändert keine Zonen.` };
    else if (n("passt") >= 3 && !n("Z2 zu hoch")) fazit = { art: "bestätigt", text: `In ${V77.WOCHEN} Wochen ${n("passt")} Messungen mit Puls in Z1–Z2 und Laktat unter dem LT1-Wert: Z2 nach Puls passt.` };
    return { v: V77.VERSIONS.zonenpruefung, messungen: M, fazit, zaehler: { passt: n("passt"), zuHoch: n("Z2 zu hoch"), unklar: n("unklar"), ueber: n("über Z2") } };
  };

  return V77;
});
