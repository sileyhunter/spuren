/* V8.3 «Täglicher Coach» (Masterprompt V8, Abschnitte 2, 9, 10; Etappe V8.3, von Silas am 18.11.2026 freigegeben) – Rechenlogik ohne DOM (tagescoach-1.0).
   Der Coach prüft heute und die nächsten Tage, sobald die Seite neue Daten hat (Morgenwerte, Check-in, neue Einheit, geänderte Verfügbarkeit), und
   schlägt Änderungen an Mein Plan vor – jede mit Grund, Annehmen und Ablehnen. Er ändert nie selbst etwas; angenommene Änderungen gehen über
   V66.aendern in Mein Plan und lassen sich zurückholen. Vier Prüfungen (eigene Festlegungen, Wissen Kapitel «coach»):
   - morgen: ein einzelner Morgen deutlich daneben (HRV und Ruhepuls gegen die 7 Tage davor, gemessen an deiner täglichen Schwankung), solange die
     Ampel noch nicht «vorsichtig» zeigt → harte Einheit heute oder morgen tauschen oder locker.
   - last: gestern (oder heute schon eingespielt) deutlich härter als geplant → die harte Einheit am Tag danach tauschen oder locker
     (zwei harte Tage an Land hintereinander vermeiden, wie verfuegbarkeit-1.2).
   - zeit: an einem Tag weniger Zeit als geplant → Kurzfassung derselben Sportart statt Verschieben (keine zwei langen Einheiten an einem Tag).
   - nachholen: eine von der Ampel gelockerte Schlüsseleinheit (V74, ampel-plan-1.2) nur als Vorschlag für einen passenden Tag derselben Woche.
   Nie: gesperrte Tage und Einheiten, Tests, Rennen, der Schwimmkurs, vergangene Tage; nie härter oder länger als Mein Plan an diesem Tag vorsah.
   tagescoach-1.1 (V8.4, Silas am 18.11.2026: «lange Einheiten, wenn die Verfügbarkeit reicht – mit der Laufentwicklung aufpassen», «eine Verletzung, die die
   Laufkilometer bremst», «Folgewochen dürfen angepasst werden»):
   - ausgefallen: eine Schlüsseleinheit von gestern ohne Aktivität derselben Sportart → an einem der nächsten Tage an Stelle einer lockeren nachholen
     (auch in der nächsten Woche).
   - umfang: fehlen in der laufenden Woche bisher mindestens 20 min einer Sportart gegenüber Mein Plan → eine kommende lockere oder lange Einheit derselben
     Sportart verlängern, höchstens um das Fehlende, die Hälfte ihrer Dauer, die Zeit laut Verfügbarkeit, die längste Einheit der Phase und beim Laufen die
     Aufbau-Grenze (10 % über dem längsten Lauf der 30 Tage) – die Woche wird nie länger als Mein Plan.
   - schmerz: Schmerzen an Beinen oder Füssen im Check-in von heute → Laufkilometer bremsen (leicht: Läufe der nächsten 3 Tage locker und 30 % kürzer;
     deutlich: Läufe heute und morgen weglassen oder locker Rad statt Laufen; an 3 der letzten 5 Tage: die ganze Woche, mit dem Rat zur Abklärung).
   - Tauschen geht seither auch in die nächste Woche (entfernen und hinzufügen statt verschieben). */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V83 = factory(node ? require("./v64.js") : root && root.V64, node ? require("./v66.js") : root && root.V66, node ? require("./v74.js") : root && root.V74);
  if (node) module.exports = V83;
  if (root) root.V83 = V83;
})(typeof window !== "undefined" ? window : null, function (V64, V66, V74) {
  "use strict";
  const V83 = { VERSIONS: { coach: "tagescoach-1.1" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const add = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const montag = (iso) => add(iso, -((new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7));
  const mittel = (L) => (L.length ? L.reduce((s, x) => s + x, 0) / L.length : null);
  const sd = (L) => { if (L.length < 2) return null; const m = mittel(L); return Math.sqrt(L.reduce((s, x) => s + (x - m) ** 2, 0) / (L.length - 1)); };
  const WT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  V83.wt = (iso) => WT[(new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7];
  const zahl = (x, n) => String(Math.round(x * 10 ** (n || 0)) / 10 ** (n || 0)).replace(".", ",");
  const vz = (x, n) => (x > 0 ? "+" : x < 0 ? "−" : "±") + zahl(Math.abs(x), n);
  const dauerT = (m) => (m >= 60 ? `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h` : `${Math.round(m)} min`);

  /* ---------------- Festlegungen (eigene, tagescoach-1.0) ---------------- */
  // Einzelner Morgen deutlich daneben: HRV mindestens 10 % bzw. zweimal die tägliche Schwankung tiefer UND Ruhepuls mindestens 5 Schläge bzw. zweimal
  // die Schwankung höher als im Schnitt der 7 Tage davor – oder eines davon allein stark (HRV 20 % bzw. dreimal, Ruhepuls 8 Schläge bzw. dreimal).
  V83.EINZEL = { hrv: 10, rhr: 5, faktor: 2, hrv_stark: 20, rhr_stark: 8, stark: 3 };
  // Deutlich härter als geplant: Last mindestens 1,3 × geplant und 15 mehr (wie last-abweichung-1.0) oder hart nach Puls, wo locker geplant war;
  // ohne Pulsverteilung zählt eine Last ab 75 pro Stunde (Intensität um 0,87 der Schwelle) als hart.
  V83.LAST = { faktor: 1.3, min: 15, hart_tl_h: 75, hart_min: 30 };
  V83.KURZ_MIN = 20;                                                     // kürzer als 20 min wird keine Kurzfassung vorgeschlagen
  // V9.2 grenzen-1.0: Vorschläge des Coaches halten die Zeit eines Tages hart ein (keine Toleranz mehr). Die 5 min gelten nur noch beim Bewerten
  // bestehender Pläne (Anlass «zeit»: ein Tag gilt erst ab 5 min über seiner Zeit als knapp) – so meldet der Coach keine Kleinigkeiten aus Rundungen
  // oder deinen eigenen Einheiten; was die Seite selbst setzt, liegt nie darüber (Entscheid in docs/anleitung/plan.md).
  V83.TOLERANZ = 5;
  const LOCKER = { rad: "rad_locker", lauf: "lauf_locker", schwimm: "schwimm_locker" };
  V83.LOCKER = LOCKER;
  const ANLASS = ["schmerz", "morgen", "last", "ausgefallen", "zeit", "nachholen", "umfang"];
  V83.ANLASS = ANLASS;
  const ARTEN = ["tauschen", "locker", "kurz", "nachholen", "verlaengern", "weglassen", "rad"];
  // tagescoach-1.1 (eigene Festlegungen): Umfang nachholen ab 20 fehlenden Minuten, mindestens 15 und höchstens die Hälfte der Einheit mehr;
  // Schmerzen an diesen Orten bremsen das Laufen (leicht: 70 % der Dauer, 3 Tage; deutlich: 2 Tage ohne Laufen; anhaltend = 3 der letzten 5 Check-ins)
  V83.UMFANG = { min_defizit: 20, min_plus: 15, max_anteil: 0.5 };
  V83.SCHMERZ = { orte: ["Fuss", "Achilles/Wade", "Schienbein", "Knie", "Hüfte/Leiste", "Oberschenkel"], leicht: 0.7, tage_leicht: 3, tage_deutlich: 2, anhaltend: 3, fenster: 5 };
  V83.ARTEN = ARTEN;
  const AKTIONEN = ["verschieben", "ersetzen", "dauer", "entfernen", "hinzufuegen"];

  /* ---------------- Einheiten ---------------- */
  const land = (e) => !!e && (e.sport === "rad" || e.sport === "lauf");
  const istTest = (e) => !!e && (e.art === "test" || !!e.test);
  const fest = (e) => !!e && (e.gesperrt || istTest(e) || e.art === "kurs" || e.id === "schwimm_kurs" || e.art === "draussen" || e.id === "aktivierung" || !!e.kraft_plan);
  /** Harte Einheit für den Coach: Schlüsseleinheit oder hartes Workout aus der Bibliothek (wie V74.nachholbar), eigene Einheit mit harten Minuten. */
  V83.hart = (e) => !!e && !istTest(e) && (V74.nachholbar(e) || (e.art === "eigen" && !!e.minuten && e.minuten.hart > 0));
  /** Gespeicherte Form einer Einheit (für V66.aendern «ersetzen» und das Zurückholen). */
  V83.spec = function (e) {
    if (!e) return null;
    if (e.spec) return Object.assign({}, e.spec, { uid: e.uid });
    if (e.quelle === "bibliothek") return { uid: e.uid, quelle: "bibliothek", wid: e.wid, sport: e.sport, titel: e.titel, dauer: e.dauer };
    const s = { uid: e.uid, vorlage: e.vorlage || e.id, dauer: e.dauer, quelle: e.quelle || "vorschlag" };
    for (const k of ["uhrzeit", "metrik", "pool", "ein_min"]) if (e[k] != null && e[k] !== false) s[k] = e[k];
    if (e.pausen != null && e.pausen !== 50) s.pausen = e.pausen;
    if (e.drinnen_fest) s.drinnen = !!e.drinnen;
    return s;
  };
  /** Neue Einheit derselben Sportart an Stelle von e (gleiche Kennung, Uhrzeit, Metrik, drinnen, Bahnlänge) als gespeicherte Form. */
  function neueSpec(e, vorlage, dauer) {
    const s = { uid: e.uid, vorlage, dauer, quelle: "eigen" };
    for (const k of ["uhrzeit", "metrik", "pool"]) if (e[k] != null && e[k] !== false) s[k] = e[k];
    if (e.drinnen_fest) s.drinnen = !!e.drinnen;
    return s;
  }
  const r5 = (m) => Math.floor(m / 5) * 5;
  const summe = (L) => (L || []).reduce((s, e) => s + (isNum(e.dauer) ? e.dauer : 0), 0);
  const kurzE = (e) => ({ titel: e.titel, dauer: e.dauer, sport: e.sport });

  /* ---------------- Morgen: ein einzelner Morgen deutlich daneben ---------------- */
  /** HRV und Ruhepuls von heute gegen den Schnitt der 7 Tage davor (mindestens 4 Werte); tägliche Schwankung = halbe Standardabweichung derselben
   *  Abweichung in den 60 Tagen davor (mindestens 20; wie beim kleinsten bedeutsamen Unterschied der HRV). → { status «auffaellig»|«normal»|«fehlt»,
   *  hrv: { wert, schnitt, abw (%), swc }, rhr: { … abw (bpm) }, gruende: [] } */
  V83.morgen = function (days, heute) {
    const by = new Map();
    for (const d of days || []) if (d && d.date) by.set(d.date, d);
    const t = by.get(heute), out = { v: V83.VERSIONS.coach, status: "fehlt", hrv: null, rhr: null, gruende: [] };
    const ok = (x, k) => !!x && isNum(x[k]) && (k === "hrv" ? x[k] > 0 : x[k] > 20);
    if (!t || !(ok(t, "hrv") || ok(t, "rhr"))) return out;
    out.status = "normal";
    const schnitt = (k, d) => { const L = []; for (let i = 1; i <= 7; i++) { const x = by.get(add(d, -i)); if (ok(x, k)) L.push(x[k]); } return L.length >= 4 ? mittel(L) : null; };
    const mark = (k, rel) => {
      if (!ok(t, k)) return null;
      const b = schnitt(k, heute); if (b == null) return null;
      const dev = [];
      for (let i = 1; i <= 60; i++) { const d = add(heute, -i), x = by.get(d); if (!ok(x, k)) continue; const bb = schnitt(k, d); if (bb != null) dev.push(rel ? (x[k] / bb - 1) * 100 : x[k] - bb); }
      const s = dev.length >= 20 ? sd(dev) : null;
      return { wert: t[k], schnitt: Math.round(b * 10) / 10, abw: rel ? (t[k] / b - 1) * 100 : t[k] - b, swc: s != null ? 0.5 * s : null };
    };
    const H = (out.hrv = mark("hrv", true)), R = (out.rhr = mark("rhr", false)), E = V83.EINZEL;
    const grenze = (x, min, f) => Math.max(min, x && isNum(x.swc) ? f * x.swc : 0);
    const hAb = !!H && H.abw <= -grenze(H, E.hrv, E.faktor), rAuf = !!R && R.abw >= grenze(R, E.rhr, E.faktor);
    const hStark = !!H && H.abw <= -grenze(H, E.hrv_stark, E.stark), rStark = !!R && R.abw >= grenze(R, E.rhr_stark, E.stark);
    if ((hAb && rAuf) || hStark || rStark) {
      out.status = "auffaellig";
      const sw = (x, u, n) => (x && isNum(x.swc) ? `, deine tägliche Schwankung ±${zahl(x.swc, n)} ${u}` : "");
      if (hAb || hStark) out.gruende.push(`HRV heute ${vz(H.abw, 0)} % gegenüber den 7 Tagen davor${sw(H, "%", 0)}`);
      if (rAuf || rStark) out.gruende.push(`Ruhepuls heute ${vz(R.abw, 0)} bpm gegenüber den 7 Tagen davor${sw(R, "bpm", 1)}`);
    }
    return out;
  };

  /* ---------------- Aktivitäten: härter als geplant ---------------- */
  /** Eine absolvierte Rad- oder Laufeinheit gegen ihre geplante: a = { date, sport, tss, dur_s, hart (nach Puls, oder null), plan: { stufe, tl, titel } | null }.
   *  → { urteil «haerter»|«wie geplant», faktor, grund } */
  V83.haerter = function (a) {
    if (!a || !land(a)) return { urteil: "wie geplant" };
    const h = (isNum(a.dur_s) ? a.dur_s : 0) / 3600, tlh = h > 0 && isNum(a.tss) ? a.tss / h : null, L = V83.LAST;
    const hartPuls = a.hart === true || (a.hart == null && isNum(tlh) && tlh >= L.hart_tl_h && h * 60 >= L.hart_min);
    const p = a.plan || null, f = p && isNum(p.tl) && p.tl > 0 && isNum(a.tss) ? a.tss / p.tl : null;
    const mehr = f != null && f >= L.faktor && a.tss - p.tl >= L.min;
    const geplantHart = !!p && p.stufe === "hart";
    if (mehr) return { urteil: "haerter", faktor: Math.round(f * 10) / 10, grund: `«${p.titel || "Einheit"}» mit Last ≈ ${zahl(f, 1)} × geplant gefahren` };
    if (hartPuls && !geplantHart) return { urteil: "haerter", faktor: f != null ? Math.round(f * 10) / 10 : null,
      grund: p ? `«${p.titel || "Einheit"}» hart statt ${p.stufe === "mittel" ? "mittel" : "locker"} gefahren` : "eine harte Einheit ohne Plan" };
    return { urteil: "wie geplant", faktor: f != null ? Math.round(f * 10) / 10 : null };
  };

  /* ---------------- Optionen ---------------- */
  /** Tausch der harten Einheit U (Tag i) mit der lockeren derselben Sportart an einem späteren Tag j der Woche: dort keine harte Einheit an Land
   *  daneben, kein Test, kein Rennen, kein Krafttraining am Vortag (Rad, Laufen), keine Aktivität draussen, genug Zeit an beiden Tagen. → Option oder null */
  /** Einheit U von Tag t auf Tag z: in derselben Woche verschieben, sonst entfernen und dort hinzufügen (gleiche Kennung, tagescoach-1.1). */
  function bewegen(t, z, U) {
    if (t.mo === z.mo) return { hin: [{ art: "verschieben", date: t.date, uid: U.uid, nach: z.date }], rueck: [{ art: "verschieben", date: z.date, uid: U.uid, nach: t.date }] };
    const sp = V83.spec(imPlan(t, U));
    return { hin: [{ art: "entfernen", date: t.date, uid: U.uid }, { art: "hinzufuegen", date: z.date, uid: U.uid, einheit: sp }],
      rueck: [{ art: "entfernen", date: z.date, uid: U.uid }, { art: "hinzufuegen", date: t.date, uid: U.uid, einheit: sp }] };
  }
  /** Gleiche Sportart hart innert zwei Tagen um Tag j (ohne die Einheit selbst) – über die Wochengrenze gezählt. */
  const hartNahe = (T, j, U, ohne) => [j - 2, j - 1, j + 1, j + 2].some((k) => { const y = T[k]; return !!y && y.einheiten.some((x) => x !== U && x !== ohne && x.sport === U.sport && V83.hart(x)); });
  function tauschen(T, i, U, heute) {
    const t = T[i];
    for (let j = i + 1; j < T.length; j++) {
      const z = T[j]; if (!z || z.date <= heute) continue;
      if (z.mo !== t.mo && (z.schonung || hartNahe(T, j, U, null))) continue;                      // nächste Woche: nicht in eine Erholungs-, Taper- oder Rennwoche, keine harte derselben Sportart daneben
      if (z.gesperrt || z.rennen || z.vorbei || z.einheiten.some(istTest) || z.einheiten.some((x) => x.art === "draussen")) continue;
      const n = T[j + 1], v = T[j - 1];
      if (n && (n.rennen || n.einheiten.some(istTest))) continue;                                   // nicht am Tag vor einem Test oder Rennen
      if (land(U) && v && v.einheiten.some((x) => x.sport === "kraft")) continue;                     // nicht am Tag nach dem Krafttraining
      const X = z.einheiten.find((x) => x.sport === U.sport && x.id === LOCKER[U.sport] && !x.gesperrt && x.quelle !== "bibliothek" && !x.ampel);
      if (!X) continue;
      if (z.einheiten.some((x) => x !== X && V83.hart(x) && (x.sport === U.sport || (land(x) && land(U))))) continue;
      // nach dem Tausch: an den Nachbartagen von j keine harte Einheit an Land (Tag i hat dann die lockere Einheit)
      const nachbarHart = [j - 1, j + 1].some((k) => { const y = T[k]; return !!y && y.einheiten.some((x) => x !== U && V83.hart(x) && land(x) && land(U)); });
      if (nachbarHart) continue;
      const vj = z.verf, vi = t.verf;
      if (vj && Array.isArray(vj.sport) && !vj.sport.includes(U.sport)) continue;
      if (vj && isNum(vj.min) && summe(z.einheiten) - X.dauer + U.dauer > vj.min) continue;                 // grenzen-1.0: hart, ohne Toleranz
      if (vi && isNum(vi.min) && summe(t.einheiten) - U.dauer + X.dauer > vi.min) continue;
      const a = bewegen(t, z, U), b = bewegen(z, t, X), naechste = z.mo !== t.mo ? " (nächste Woche)" : "";
      return { art: "tauschen", titel: `«${U.titel}» auf ${V83.wt(z.date)}${naechste} – dafür «${X.titel}» (${dauerT(X.dauer)}) ${t.date === heute ? "heute" : "am " + V83.wt(t.date)}`,
        aktionen: a.hin.concat(b.hin), rueck: a.rueck.concat(b.rueck),
        markiert: [{ date: z.date, uid: U.uid, vorher: `vom ${V83.wt(t.date)}` }, { date: t.date, uid: X.uid, vorher: `vom ${V83.wt(z.date)}` }] };
    }
    return null;
  }
  /** Einheit so, wie Mein Plan sie vorsieht (ohne Ampel-Schicht; gleiche Kennung). */
  const imPlan = (t, e) => ((t && t.plan) || []).find((x) => x.uid === e.uid) || e;
  /** Lockere Fassung der Einheit U (V74.locker: gleiche Sportart, nie länger, keine harten und mittleren Abschnitte). → Option oder null */
  function locker(t, U0, ctx) {
    const U = imPlan(t, U0), n = V74.locker(U, ctx || {}); if (!n) return null;
    const s = neueSpec(U, n.id, n.dauer);
    if (V66.einheitPruefen(s)) return null;
    return { art: "locker", titel: `«${n.titel.replace(/ \(Ampel\)$/, "")}» ${dauerT(n.dauer)} statt «${U.titel}»`,
      aktionen: [{ art: "ersetzen", date: t.date, uid: U.uid, einheit: s }], rueck: [{ art: "ersetzen", date: t.date, uid: U.uid, einheit: V83.spec(U) }],
      markiert: [{ date: t.date, uid: U.uid, vorher: `statt «${U.titel}»` }] };
  }
  /** Kurzfassung eines Tages mit zu wenig Zeit: die längste bewegliche Einheit einer erlaubten Sportart bleibt (gekürzt bzw. locker derselben Sportart),
   *  die übrigen beweglichen fallen weg. Gesperrte Einheiten, Tests, Kurs, Kraft und Aktivitäten draussen bleiben und zählen zur Zeit. → Option oder null */
  function kurz(t) {
    const v = t.verf; if (!v || !isNum(v.min)) return null;
    const E = (t.plan && t.plan.length ? t.plan : t.einheiten), fix = E.filter(fest), frei = E.filter((e) => !fest(e) && isNum(e.dauer));
    if (!frei.length) return null;
    const T0 = v.min - summe(fix), ok = (e) => !Array.isArray(v.sport) || v.sport.includes(e.sport);
    if (T0 < V83.KURZ_MIN && fix.length) return null;                     // die festen Einheiten (Kraft, Test, Kurs, gesperrt) füllen die Zeit schon: nur Hinweis
    const M = frei.filter((e) => LOCKER[e.sport] && ok(e)).sort((a, b) => b.dauer - a.dauer)[0];
    const akt = [], rueck = [], mark = [];
    let neu = null, titel;
    if (M && T0 >= V83.KURZ_MIN) {
      const d = Math.min(M.dauer, r5(T0)), B = M.quelle === "bibliothek" ? null : V66.bereich(M.vorlage || M.id);
      if (d < M.dauer) {
        if (B && !B.fest && d >= B.min && !(V83.hart(M) && d < B.std * 0.6)) {
          akt.push({ art: "dauer", date: t.date, uid: M.uid, dauer: d }); neu = { titel: M.titel, dauer: d };
        } else {
          const BL = V66.bereich(LOCKER[M.sport]);
          if (!BL || d < BL.min) return null;
          const s = neueSpec(M, LOCKER[M.sport], d);
          if (V66.einheitPruefen(s)) return null;
          akt.push({ art: "ersetzen", date: t.date, uid: M.uid, einheit: s });
          neu = { titel: (V66.einheit(s, {}) || { titel: "locker" }).titel, dauer: d };
        }
        rueck.push({ art: "ersetzen", date: t.date, uid: M.uid, einheit: V83.spec(M) });
        mark.push({ date: t.date, uid: M.uid, vorher: `statt «${M.titel}» ${dauerT(M.dauer)}` });
      } else neu = { titel: M.titel, dauer: M.dauer };
    }
    for (const e of frei) {
      if (M && neu && e === M) continue;
      akt.push({ art: "entfernen", date: t.date, uid: e.uid });
      rueck.push({ art: "hinzufuegen", date: t.date, uid: e.uid, einheit: V83.spec(e) });
    }
    if (!akt.length) return null;
    const weg = frei.filter((e) => !(M && neu && e === M)).map((e) => `«${e.titel}»`);
    titel = neu ? `«${neu.titel}» ${dauerT(neu.dauer)}${M && neu.dauer < M.dauer ? ` statt «${M.titel}» ${dauerT(M.dauer)}` : ""}${weg.length ? `, ohne ${weg.join(", ")}` : ""}`
      : `${V83.wt(t.date)} frei statt ${weg.join(", ")}`;
    return { art: "kurz", titel, aktionen: akt, rueck, markiert: mark };
  }

  /* ---------------- tagescoach-1.1: nachholen, verlängern, Schmerzen ---------------- */
  /** Ausgefallene Schlüsseleinheit U (gestern) an einem der nächsten Tage an Stelle einer lockeren derselben Sportart (auch nächste Woche): wie beim Tauschen
   *  keine harte Einheit an Land daneben, nicht vor Test oder Rennen, nicht nach dem Krafttraining, keine harte derselben Sportart innert 2 Tagen, Zeit laut
   *  Verfügbarkeit. → Option oder null */
  function nachholen(T, U0, tU, heute) {
    const U = imPlan(tU, U0);
    for (let j = 0; j < T.length; j++) {
      const z = T[j]; if (!z || z.date < heute || z.gesperrt || z.rennen || z.vorbei) continue;
      if (z.mo !== tU.mo && z.schonung) continue;                                                     // nicht in eine Erholungs-, Taper- oder Rennwoche nachholen
      if (z.date === heute && (z.erledigt || []).includes(U.sport)) continue;
      if (z.einheiten.some(istTest) || z.einheiten.some((x) => x.art === "draussen")) continue;
      const n = T[j + 1], v = T[j - 1];
      if (n && (n.rennen || n.einheiten.some(istTest))) continue;
      if (land(U) && v && v.einheiten.some((x) => x.sport === "kraft")) continue;
      const X = z.einheiten.find((x) => x.sport === U.sport && x.id === LOCKER[U.sport] && !x.gesperrt && x.quelle !== "bibliothek" && !x.ampel);
      if (!X) continue;
      if (z.einheiten.some((x) => x !== X && V83.hart(x) && (x.sport === U.sport || (land(x) && land(U))))) continue;
      if (land(U) && [j - 1, j + 1].some((k) => { const y = T[k]; return !!y && y.einheiten.some((x) => V83.hart(x) && land(x)); })) continue;
      if (hartNahe(T, j, U, X)) continue;
      const vz = z.verf;
      if (vz && Array.isArray(vz.sport) && !vz.sport.includes(U.sport)) continue;
      if (vz && isNum(vz.min) && summe(z.einheiten) - X.dauer + U.dauer > vz.min) continue;                 // grenzen-1.0: hart, ohne Toleranz
      const sp = Object.assign(V83.spec(U), { uid: X.uid });
      if (X.uhrzeit && !sp.uhrzeit) sp.uhrzeit = X.uhrzeit;
      if (V66.einheitPruefen(sp)) continue;
      return { z, X, o: { art: "nachholen", titel: `«${U.titel}» ${dauerT(U.dauer)} am ${V83.wt(z.date)}${z.mo !== tU.mo ? " (nächste Woche)" : ""} statt «${X.titel}»`,
        aktionen: [{ art: "ersetzen", date: z.date, uid: X.uid, einheit: sp }], rueck: [{ art: "ersetzen", date: z.date, uid: X.uid, einheit: V83.spec(imPlan(z, X)) }],
        markiert: [{ date: z.date, uid: X.uid, vorher: `nachgeholt vom ${V83.wt(tU.date)} statt «${X.titel}»` }] } };
    }
    return null;
  }
  /** Längste Einheit der Phase (V64.LANG, Erholungswoche 70 %) für Rad und Laufen, sonst null. */
  const langGrenze = (t, sport) => {
    if (!V64 || !V64.LANG || (sport !== "rad" && sport !== "lauf")) return null;
    const L = V64.LANG[t.phase] || (String(t.phase || "").startsWith("B-Rennen") ? V64.LANG.Taper : V64.LANG.Grundlage);
    return t.erholung ? Math.round(L[sport] * 0.7) : L[sport];
  };
  /** Verlängern (umfang): kommende lockere oder lange Einheit derselben Sportart in der laufenden Woche um höchstens das Fehlende. → { t, U, plus, km } oder null */
  function verlaengern(T, h, sport, defizit, L) {
    let best = null;
    for (const t of T) {
      if (t.date < h || t.mo !== montag(h) || t.gesperrt || t.rennen || t.vorbei) continue;
      if (t.date === h && (t.erledigt || []).includes(sport)) continue;
      const v = t.verf, frei = v && isNum(v.min) ? v.min - summe(t.einheiten) : null;
      if (frei != null && frei < V83.UMFANG.min_plus) continue;
      if (v && Array.isArray(v.sport) && !v.sport.includes(sport)) continue;
      for (const U0 of t.einheiten) {
        if (U0.sport !== sport || fest(U0) || V83.hart(U0) || U0.quelle === "bibliothek" || U0.gesperrt || U0.ampel || U0.kraft_plan) continue;
        const U = imPlan(t, U0), B = V66.bereich(U.vorlage || U.id); if (!B || B.fest || !isNum(U.dauer)) continue;
        const lg = langGrenze(t, sport);
        let plus = Math.min(defizit, frei == null ? defizit : frei, Math.floor(U.dauer * V83.UMFANG.max_anteil), B.max - U.dauer, lg != null ? lg - U.dauer : Infinity);
        let km = null;
        if (sport === "lauf") {                                                    // Laufen nur mit Distanz ≈ und Aufbau-Grenze (aufbau-1.2)
          const k0 = L.laufKm ? L.laufKm(U) : null, g = t.laufGrenze;
          if (!isNum(k0) || k0 <= 0 || !g || !isNum(g.km)) continue;
          plus = Math.min(plus, Math.floor((U.dauer * g.km) / k0) - U.dauer);
          km = { vorher: k0, grenze: g.km };
        }
        plus = r5(plus);
        if (plus < V83.UMFANG.min_plus) continue;
        if (!best || plus > best.plus || (plus === best.plus && U.art === "lang")) best = { t, U, plus, km };
      }
    }
    return best;
  }
  /** Schmerzen an Beinen oder Füssen im Check-in von heute → { stufe, orte, anhaltend } oder null. */
  V83.schmerz = function (befinden, h) {
    const S = V83.SCHMERZ, von = add(h, -(S.fenster - 1));
    const B = (befinden || []).filter((b) => b && typeof b.date === "string" && b.date >= von && b.date <= h);
    const lauf = (b) => !!b.schmerz && ["leicht", "deutlich"].includes(b.schmerz.stufe) && (b.schmerz.ort || []).some((o) => S.orte.includes(o));
    const heute = B.find((b) => b.date === h);
    if (!heute || !lauf(heute)) return null;
    return { stufe: heute.schmerz.stufe, orte: heute.schmerz.ort.filter((o) => S.orte.includes(o)), anhaltend: B.filter(lauf).length >= S.anhaltend };
  };

  /* ---------------- Prüfung ---------------- */
  /**
   * Prüft heute und die nächsten Tage. lage = {
   *   heute, tage: [{ date, mo, einheiten (was gilt, mit Ampel-Schicht), gesperrt, rennen, vorbei, verf { min, sport } | null, ampel (V74), ctx, erledigt: [Sportarten] }]
   *     (gestern bis höchstens 6 Tage voraus), days (Morgenwerte), ampelHeute (V74-Entscheid von heute), aktivitaeten: [{ id, date, sport, tss, dur_s, hart,
   *     plan }] (gestern und heute), entscheide: [Einträge «tagescoach»], enduco_bis, reaktion: { erholtTag } | null }
   * → { v, heute, probelauf, morgen, vorschlaege: [{ id, anlass, date, uid, mo, titel, grund: [], optionen: [{ art, titel, aktionen, rueck, markiert }] }],
   *     geprueft: [], hinweise: [] }
   */
  V83.pruefen = function (lage) {
    const L = lage || {}, h = L.heute, T = (L.tage || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const out = { v: V83.VERSIONS.coach, heute: h, probelauf: !!(L.enduco_bis && h && h <= L.enduco_bis), morgen: null, vorschlaege: [], geprueft: [], hinweise: [] };
    if (!h || !ISO.test(h)) return out;
    const entschieden = new Set((L.entscheide || []).filter((e) => e && typeof e.id === "string").map((e) => e.id));
    const idx = new Map(T.map((t, i) => [t.date, i]));
    const vorschlag = (anlass, t, U, titel, grund, optionen) => {
      const id = `co-${t.date}-${anlass}-${U.uid}`;
      if (entschieden.has(id) || !optionen.filter(Boolean).length) return;
      const da = out.vorschlaege.find((p) => p.date === t.date && p.uid === U.uid);
      if (da) { for (const g of grund) if (!da.grund.includes(g)) da.grund.push(g); return; }
      out.vorschlaege.push({ id, anlass, date: t.date, uid: U.uid, mo: t.mo, titel, grund, optionen: optionen.filter(Boolean) });
    };
    const offen = (t, e) => t && !t.vorbei && t.date >= h && !t.gesperrt && !t.rennen && !e.gesperrt && !(t.date === h && (t.erledigt || []).includes(e.sport));
    const hartHeuteMorgen = (t) => (t ? t.einheiten.filter((e) => V83.hart(e) && land(e) && offen(t, e)) : []);

    // 0) Schmerzen an Beinen oder Füssen (tagescoach-1.1): Laufkilometer bremsen
    const SZ = V83.schmerz(L.befinden, h);
    if (SZ) {
      const S = V83.SCHMERZ, n = SZ.anhaltend ? 7 : SZ.stufe === "deutlich" ? S.tage_deutlich : S.tage_leicht;
      const gr0 = `Schmerzen ${SZ.stufe}: ${SZ.orte.join(", ")} (Check-in heute) – Laufkilometer bremsen, bis es weg ist.`;
      for (let k = 0; k < n; k++) {
        const t = T[idx.get(add(h, k))]; if (!t) continue;
        for (const U0 of t.einheiten.filter((e) => e.sport === "lauf" && !fest(e) && offen(t, e))) {
          const U = imPlan(t, U0), opts = [];
          if (SZ.stufe === "deutlich" || SZ.anhaltend) {
            opts.push({ art: "weglassen", titel: `«${U.titel}» weglassen`, aktionen: [{ art: "entfernen", date: t.date, uid: U.uid }],
              rueck: [{ art: "hinzufuegen", date: t.date, uid: U.uid, einheit: V83.spec(U) }], markiert: [] });
            const vr = t.verf, d = Math.max(20, r5(U.dauer)), sp = neueSpec(U, "rad_locker", d);
            const zeitOk = !(vr && isNum(vr.min) && summe(t.einheiten) - U.dauer + d > vr.min);                 // grenzen-1.0: nie über die Zeit des Tages
            if ((!vr || !Array.isArray(vr.sport) || vr.sport.includes("rad")) && zeitOk && !V66.einheitPruefen(sp) && V66.bereich("rad_locker") && d >= V66.bereich("rad_locker").min)
              opts.push({ art: "rad", titel: `Rad locker ${dauerT(d)} statt «${U.titel}»`, aktionen: [{ art: "ersetzen", date: t.date, uid: U.uid, einheit: sp }],
                rueck: [{ art: "ersetzen", date: t.date, uid: U.uid, einheit: V83.spec(U) }], markiert: [{ date: t.date, uid: U.uid, vorher: `statt «${U.titel}» (Schmerzen)` }] });
          } else {
            const d = Math.max(V83.KURZ_MIN, r5(U.dauer * S.leicht)), BL = V66.bereich(LOCKER.lauf), sp = neueSpec(U, LOCKER.lauf, Math.max(d, BL ? BL.min : d));
            if (!V66.einheitPruefen(sp) && (sp.dauer < U.dauer || V83.hart(U)))
              opts.push({ art: "kurz", titel: `Lauf locker ${dauerT(sp.dauer)} statt «${U.titel}» ${dauerT(U.dauer)}`, aktionen: [{ art: "ersetzen", date: t.date, uid: U.uid, einheit: sp }],
                rueck: [{ art: "ersetzen", date: t.date, uid: U.uid, einheit: V83.spec(U) }], markiert: [{ date: t.date, uid: U.uid, vorher: `statt «${U.titel}» (Schmerzen)` }] });
          }
          const gr = [gr0]; if (SZ.anhaltend) gr.push("Seit mehreren Tagen – bitte ärztlich abklären lassen.");
          vorschlag("schmerz", t, U, `${t.date === h ? "Heute" : V83.wt(t.date)}: «${U.titel}» bei Schmerzen`, gr, opts);
        }
      }
    }
    out.geprueft.push(SZ ? `Schmerzen ${SZ.stufe} (${SZ.orte.join(", ")}): Laufen gebremst` : "keine Schmerzen an Beinen oder Füssen angegeben");

    // 1) Morgen: ein einzelner Morgen deutlich daneben, die Ampel noch nicht «vorsichtig»
    const M = (out.morgen = V83.morgen(L.days, h));
    const A = L.ampelHeute || null, ampelAktiv = !!A && (A.status === "vorsichtig" || A.status === "krank");
    out.geprueft.push(M.status === "fehlt" ? "Morgenwerte von heute fehlen" : M.status === "auffaellig" ? "Morgenwerte: heute deutlich daneben" : "Morgenwerte im Rahmen");
    if (M.status === "auffaellig" && !ampelAktiv) {
      for (const k of [0, 1]) {
        const t = T[idx.get(add(h, k))]; if (!t) continue;
        for (const U of hartHeuteMorgen(t)) {
          const i = idx.get(t.date), wann = k === 0 ? "heute" : "morgen";
          vorschlag("morgen", t, U, `${k === 0 ? "Heute" : `Morgen (${V83.wt(t.date)})`}: «${U.titel}» nicht nach einem auffälligen Morgen`,
            M.gruende.concat([`Ein einzelner Morgen zählt in der Ampel noch kaum (7-Tage-Schnitt); hart ${wann} wäre der Tag danach – lieber verschieben oder locker.`]),
            [tauschen(T, i, U, h), locker(t, U, t.ctx)]);
        }
      }
    } else if (M.status === "auffaellig" && ampelAktiv) out.hinweise.push("Die Ampel zeigt heute schon «vorsichtig» – sie lockert den Tag, der Coach schlägt nichts zusätzlich vor.");

    // 2) Last: gestern (oder heute schon eingespielt) deutlich härter als geplant → harte Einheit an Land am Tag danach
    let akt = 0;
    for (const a of L.aktivitaeten || []) {
      if (!a || !a.date || a.date < add(h, -1) || a.date > h) continue;
      akt++;
      const r = V83.haerter(a); if (r.urteil !== "haerter") continue;
      const t = T[idx.get(add(a.date, 1))]; if (!t) continue;
      for (const U of hartHeuteMorgen(t)) {
        const gr = [`${a.date === h ? "Heute" : "Gestern"}: ${r.grund} – zwei harte Tage an Land hintereinander vermeiden (wie beim Verteilen, ${V66.VERSIONS.verfuegbarkeit || "verfuegbarkeit"}).`];
        if (L.reaktion && isNum(L.reaktion.erholtTag)) gr.push(`In deinen Daten liegen HRV und Ruhepuls nach harten Einheiten meist ab Tag ${L.reaktion.erholtTag} wieder im Rahmen (Deine Reaktionen) – entscheide nach Gefühl.`);
        vorschlag("last", t, U, `${t.date === h ? "Heute" : V83.wt(t.date)}: «${U.titel}» nach einer härteren Einheit`, gr, [tauschen(T, idx.get(t.date), U, h), locker(t, U, t.ctx)]);
      }
    }
    out.geprueft.push(akt ? `${akt} ${akt === 1 ? "Einheit" : "Einheiten"} von gestern und heute gegen den Plan` : "keine neue Einheit seit gestern");

    // 2b) Ausgefallen (tagescoach-1.1): Schlüsseleinheit von gestern ohne Aktivität derselben Sportart → nachholen (auch in der nächsten Woche)
    const g = T[idx.get(add(h, -1))];
    let aus = 0;
    const nachgeholt = {};                                                    // Minuten, die als Schlüsseleinheit nachgeholt werden (zählen nicht nochmals ins Umfang-Defizit)
    if (g && !g.rennen) {
      const frei = (g.erledigt || []).slice();
      for (const U of g.einheiten) {
        if (!["rad", "lauf", "schwimm"].includes(U.sport) || fest(U)) continue;
        const k = frei.indexOf(U.sport); if (k >= 0) { frei.splice(k, 1); continue; }
        if (!V83.hart(U)) continue;
        aus++;
        const r = nachholen(T, U, g, h); if (!r) { out.hinweise.push(`Gestern ausgefallen: «${U.titel}» – in den nächsten Tagen passt kein Platz an Stelle einer lockeren Einheit.`); continue; }
        nachgeholt[U.sport] = (nachgeholt[U.sport] || 0) + (U.dauer || 0);
        vorschlag("ausgefallen", g, U, `Gestern ausgefallen: «${U.titel}» – am ${V83.wt(r.z.date)}${r.z.mo !== g.mo ? " (nächste Woche)" : ""} nachholen?`,
          [`Am ${V83.wt(r.z.date)} passt sie an die Stelle von «${r.X.titel}» (${dauerT(r.X.dauer)}): keine harte Einheit daneben, genug Zeit.`,
            "Nur wenn du dich frisch fühlst – an jenem Morgen entscheidet wieder die Ampel."], [r.o]);
        const p = out.vorschlaege.find((x) => x.anlass === "ausgefallen" && x.uid === U.uid && x.date === g.date); if (p) p.mo = r.z.mo;
      }
    }

    // 2c) Umfang (tagescoach-1.1): fehlen in der laufenden Woche bisher Minuten gegenüber Mein Plan → eine kommende lockere oder lange Einheit verlängern
    const WB = L.woche && L.woche.mo === montag(h) && h !== L.woche.mo ? L.woche : null;
    if (WB) for (const sp of ["rad", "lauf", "schwimm"]) {
      const def = Math.round((WB.plan[sp] || 0) - (WB.ist[sp] || 0) - (nachgeholt[sp] || 0));
      if (def < V83.UMFANG.min_defizit) continue;
      const b = verlaengern(T, h, sp, def, L); if (!b) continue;
      const neu = b.U.dauer + b.plus, wort = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen" }[sp];
      const gr = [`Diese Woche bisher ${dauerT(WB.ist[sp] || 0)} ${wort} absolviert, ${dauerT(WB.plan[sp] || 0)} geplant – es fehlen ≈ ${dauerT(def)}.`,
        `Am ${V83.wt(b.t.date)} reicht die Zeit für ${dauerT(neu)}${b.t.verf && isNum(b.t.verf.min) ? ` (Verfügbarkeit ${dauerT(b.t.verf.min)})` : ""}; die Woche bleibt bei Mein Plan.`];
      if (b.km) gr.push(`Laufen: ≈ ${zahl((b.km.vorher * neu) / b.U.dauer, 1)} km, unter deiner Aufbau-Grenze von ${zahl(b.km.grenze, 1)} km.`);
      vorschlag("umfang", b.t, b.U, `${b.t.date === h ? "Heute" : V83.wt(b.t.date)}: «${b.U.titel}» auf ${dauerT(neu)} verlängern?`, gr,
        [{ art: "verlaengern", titel: `«${b.U.titel}» ${dauerT(neu)} statt ${dauerT(b.U.dauer)}`, aktionen: [{ art: "dauer", date: b.t.date, uid: b.U.uid, dauer: neu }],
          rueck: [{ art: "dauer", date: b.t.date, uid: b.U.uid, dauer: b.U.dauer }], markiert: [{ date: b.t.date, uid: b.U.uid, vorher: `verlängert, statt ${dauerT(b.U.dauer)}` }] }]);
    }
    if (aus || WB) out.geprueft.push(aus ? `gestern ${aus} Schlüsseleinheit${aus === 1 ? "" : "en"} ausgefallen` : "Woche bisher wie geplant oder nichts zu verlängern");

    // 3) Zeit: an einem Tag weniger Zeit als geplant (gilt für festgehaltene Wochen; eine automatisch verteilte Woche passt sich selbst an)
    let knapp = 0;
    for (const t of T) {
      if (t.vorbei || t.date < h || t.gesperrt || t.rennen || !t.verf || !isNum(t.verf.min)) continue;
      const s = summe(t.einheiten); if (s <= t.verf.min + V83.TOLERANZ) continue;
      knapp++;
      if (t.date === h && (t.erledigt || []).length) continue;
      const o = kurz(t); if (!o) { out.hinweise.push(`${V83.wt(t.date)}: ${dauerT(s)} geplant, ${dauerT(t.verf.min)} Zeit – die festen Einheiten (gesperrt, Test, Kurs, Krafttraining) brauchen die Zeit schon; ändern im Tagesblatt.`); continue; }
      const U = (t.plan && t.plan.length ? t.plan : t.einheiten).filter((e) => !fest(e)).sort((a, b) => b.dauer - a.dauer)[0];
      vorschlag("zeit", t, U, `${t.date === h ? "Heute" : V83.wt(t.date)}: ${dauerT(t.verf.min)} Zeit, ${dauerT(s)} geplant`,
        [`Kurzfassung derselben Sportart statt Verschieben – so landen keine zwei langen Einheiten auf einem Tag.`], [o]);
    }
    out.geprueft.push(knapp ? `Verfügbarkeit: ${knapp} ${knapp === 1 ? "Tag" : "Tage"} knapp` : "Plan passt zur Verfügbarkeit");

    // 4) Nachholen: eine von der Ampel gelockerte Schlüsseleinheit (V74 ampel-plan-1.2) – nur als Vorschlag
    for (const t of T) {
      const NA = t.ampel && Array.isArray(t.ampel.nachholen) ? t.ampel.nachholen.filter((x) => x && x.vorschlag) : [];
      for (const x of NA) {
        const z = T[idx.get(x.nach)]; if (!z || z.date <= h || z.gesperrt || z.vorbei) continue;
        const X = z.einheiten.find((e) => e.uid === x.ziel.uid); if (!X || X.gesperrt) continue;
        const s = Object.assign({}, x.spec, { uid: X.uid });
        if (X.uhrzeit && !s.uhrzeit) s.uhrzeit = X.uhrzeit;
        if (V66.einheitPruefen(s)) continue;
        const id = `co-${t.date}-nachholen-${x.von_uid}`;
        if (entschieden.has(id)) continue;
        out.vorschlaege.push({ id, anlass: "nachholen", date: t.date, uid: x.von_uid, mo: z.mo, titel: `«${x.titel}» vom ${V83.wt(t.date)} am ${V83.wt(z.date)} nachholen?`,
          grund: [`Die Ampel hat sie am ${V83.wt(t.date)} gelockert. Am ${V83.wt(z.date)} passt sie an die Stelle von «${X.titel}» (${dauerT(X.dauer)}): keine harte Einheit daneben, genug Zeit.`,
            "Nur wenn du dich frisch fühlst – an jenem Morgen entscheidet wieder die Ampel."],
          optionen: [{ art: "nachholen", titel: `«${x.einheit.titel}» ${dauerT(x.einheit.dauer)} am ${V83.wt(z.date)} statt «${X.titel}»`,
            aktionen: [{ art: "ersetzen", date: z.date, uid: X.uid, einheit: s }], rueck: [{ art: "ersetzen", date: z.date, uid: X.uid, einheit: V83.spec(X) }],
            markiert: [{ date: z.date, uid: X.uid, vorher: `nachgeholt statt «${X.titel}»` }] }] });
      }
    }
    out.vorschlaege.sort((a, b) => a.date.localeCompare(b.date) || ANLASS.indexOf(a.anlass) - ANLASS.indexOf(b.anlass));
    return out;
  };

  /* ---------------- Entscheid (Eingabe «tagescoach» → coach_entscheide) ---------------- */
  const UID = /^[A-Za-z0-9_.:-]{1,80}$/;
  const ID = /^co-(\d{4}-\d{2}-\d{2})-(morgen|last|zeit|nachholen|ausgefallen|schmerz|umfang)-([A-Za-z0-9_.:-]{1,80})$/;
  V83.STATUS = ["angenommen", "abgelehnt", "zurueck"];
  /** Entscheid zu einem Vorschlag. p = Vorschlag, o = { status, option (Index), jetzt } → Eintrag */
  V83.eintrag = function (p, o) {
    o = o || {};
    const opt = p.optionen[o.option || 0] || p.optionen[0], e = { id: p.id, v: V83.VERSIONS.coach, status: o.status || "abgelehnt", am: o.jetzt || new Date().toISOString(),
      date: p.date, anlass: p.anlass, titel: String(p.titel).slice(0, 200) };
    if (e.status === "angenommen") { e.art = opt.art; e.woche = p.mo; e.option = String(opt.titel).slice(0, 200); e.rueck = opt.rueck; e.markiert = opt.markiert || []; }
    return e;
  };
  const aktionPruefen = (a) => {
    if (!a || typeof a !== "object" || !AKTIONEN.includes(a.art)) return "unbekannte Änderung";
    if (!ISO.test(String(a.date || ""))) return "Änderung ohne Datum";
    if (a.art !== "hinzufuegen" && !UID.test(String(a.uid || ""))) return "Änderung ohne Einheit";
    if (a.art === "verschieben" && !ISO.test(String(a.nach || ""))) return "Verschieben ohne Ziel";
    if (a.art === "dauer" && !(Number.isInteger(a.dauer) && a.dauer >= 5 && a.dauer <= 600)) return "Dauer 5–600 min";
    if ((a.art === "ersetzen" || a.art === "hinzufuegen") && (!a.einheit || typeof a.einheit !== "object" || V66.einheitPruefen(Object.assign({ uid: "x" }, a.einheit)))) return "ungültige Einheit";
    return null;
  };
  /** Prüft einen Entscheid (gleiche Regeln wie tools/tagescoach.py) → Fehlertext oder null. */
  V83.eintragPruefen = function (e) {
    if (!e || typeof e !== "object") return "kein Eintrag";
    const m = ID.exec(String(e.id || "")); if (!m) return "ID «co-<Datum>-<Anlass>-<Einheit>»";
    if (e.date !== m[1] || e.anlass !== m[2]) return "Datum oder Anlass passt nicht zur ID";
    if (!V83.STATUS.includes(e.status)) return "unbekannter Status";
    if (typeof e.am !== "string" || isNaN(Date.parse(e.am))) return "ohne Zeitpunkt";
    if (typeof e.titel !== "string" || !e.titel || e.titel.length > 200) return "Titel 1–200 Zeichen";
    if (e.status === "angenommen") {
      if (!ARTEN.includes(e.art)) return "unbekannte Art";
      if (!ISO.test(String(e.woche || "")) || montag(e.woche) !== e.woche) return "Woche (Montag) fehlt";
      if (!Array.isArray(e.rueck) || !e.rueck.length || e.rueck.length > 8) return "Rückweg fehlt";
      for (const a of e.rueck) { const f = aktionPruefen(a); if (f) return "Rückweg: " + f; }
      if (!Array.isArray(e.markiert) || e.markiert.length > 8 || e.markiert.some((x) => !x || !ISO.test(String(x.date || "")) || !UID.test(String(x.uid || "")) || typeof x.vorher !== "string" || x.vorher.length > 200)) return "Markierung ungültig";
    }
    return null;
  };
  V83.aktionPruefen = aktionPruefen;
  /** Entscheide aus mehreren Listen (Daten, darüber das Gerät; der spätere Zeitpunkt gewinnt) → Map id → Eintrag. */
  V83.entscheide = function (...listen) {
    const m = new Map();
    for (const L of listen) for (const e of L || []) if (e && !V83.eintragPruefen(e)) { const a = m.get(e.id); if (!a || String(e.am) >= String(a.am)) m.set(e.id, e); }
    return m;
  };
  /** Markierung einer Einheit aus angenommenen Entscheiden (gekennzeichnet gegenüber dem ursprünglichen Plan) → Text oder null. */
  V83.marke = function (entscheide, date, uid) {
    for (const e of entscheide instanceof Map ? entscheide.values() : entscheide || []) {
      if (!e || e.status !== "angenommen") continue;
      const x = (e.markiert || []).find((y) => y.date === date && y.uid === uid);
      if (x) return x.vorher;
    }
    return null;
  };
  return V83;
});
