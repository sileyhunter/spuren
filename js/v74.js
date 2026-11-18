/* Ironman Notebook V7.4 – Etappe 6 «Ampel passt das Training an» (ampel-plan-1.0), Rechenlogik ohne DOM.
   Auftrag V7.3 «wie enduco» (16.11.2026), Etappe 6, freigegeben am 17.11.2026; die Regeln sind eigene Festlegungen (Wissen, Kapitel «erholung»).
   - Entscheid je Tag aus der Ampel (readiness-2.1): «bereit», «normal» und «nicht beurteilbar» = wie geplant; «vorsichtig» = keine harten und
     keine mittleren Abschnitte (lockere Einheit derselben Sportart; lange Einheiten höchstens zwei Drittel); Krankheitszeichen = Ruhetag.
     Ohne Morgenwerte von heute (Schlaf oder HRV der Nacht) zählt nur der Check-in.
   - Nachholen: eine Schlüsseleinheit, die locker wurde, kommt am nächsten passenden Tag derselben Woche an die Stelle einer lockeren Einheit
     derselben Sportart (keine harte Einheit daneben bzw. am selben Tag, nicht am Tag vor einem Test oder Rennen, nicht an gesperrten Tagen,
     nur mit genug Zeit); ob sie stattfindet, entscheidet die Ampel jenes Morgens. In Rennwochen und nach Krankheitszeichen wird nichts
     nachgeholt; passt kein Tag, entfällt sie – gemeldet, nie still.
   - Gesperrte Einheiten und Tage bleiben unverändert (nur Hinweis). «Trotzdem wie geplant» gilt je Tag.
   - Gespeichert wird je Tag nur der Entscheid (Eingabe «ampel» → ampel_anpassung); die Schicht wird beim Zeichnen angewendet, Mein Plan bleibt.
   Die Schicht macht eine Einheit nur leichter oder kürzer, nie härter oder länger, und nie zu einer anderen Sportart. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V74 = factory(node ? require("./v64.js") : root && root.V64, node ? require("./v66.js") : root && root.V66);
  if (node) module.exports = V74;
  if (root) root.V74 = V74;
})(typeof window !== "undefined" ? window : null, function (V64, V66) {
  "use strict";
  const V74 = { VERSIONS: { ampelplan: "ampel-plan-1.1" } };            // 1.1 (V7.6.1): kein Nachholen von Rad oder Laufen am Tag nach einem Krafttraining
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const add = (iso, n) => { const d = new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5); return d.toISOString().slice(0, 10); };

  /* ---------------- Festlegungen (eigene, ampel-plan-1.0) ---------------- */
  V74.LANG_AB = 90;            // Einheiten über 90 min (oder der Art «lang») gelten als lang
  V74.ANTEIL = 2 / 3;          // lange Einheiten bei «vorsichtig» höchstens zwei Drittel der Dauer
  V74.SERIE = 3;               // ab dem dritten Tag «vorsichtig» in Folge: «Woche anpassen?»
  V74.STATUS = ["wie_geplant", "vorsichtig", "krank"];
  V74.AMPEL = ["bereit", "normal", "vorsichtig", "nicht beurteilbar"];
  const LOCKER = { rad: "rad_locker", lauf: "lauf_locker", schwimm: "schwimm_locker" };
  const OHNE_RT = { rad_lang_rt: "rad_lang", lauf_lang_rt: "lauf_lang" };
  const TEST_MIN = { rad: 60, lauf: 40, schwimm: 45 };          // statt eines Tests: locker, höchstens so lang (wie vor einem Stufentest)
  const HART_K = new Set(["z3", "z3o", "vo2", "css", "renntempo", "test"]);   // Abschnitte, die bei «vorsichtig» wegfallen (mittel und hart)
  const SPW = { schwimm: "Schwimmen", rad: "Rad", lauf: "Laufen" };
  const WT = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  V74.wochentag = (iso) => WT[(new Date(Date.parse(iso + "T12:00:00Z")).getUTCDay() + 6) % 7];

  /* ---------------- Entscheid je Tag ---------------- */
  /** Liegen die Morgenwerte von heute vor (Schlaf oder HRV der letzten Nacht)? Vorher zählt nur der Check-in. */
  V74.morgenwerte = (days, datum) => (days || []).some((d) => d && d.date === datum && ((isNum(d.sleepH) && d.sleepH > 0) || (isNum(d.hrv) && d.hrv > 0)));
  /** Entscheid aus der Ampel (FK.readiness) → { v, date, status «wie_geplant»|«vorsichtig»|«krank», ampel, gruende, morgenwerte, hinweis }.
   *  opt = { morgenwerte (bool), datum }. Ohne Morgenwerte zählt nur der Check-in: Krankheitszeichen = «krank», Befinden «belastet» = «vorsichtig». */
  V74.entscheid = function (r, opt) {
    const o = opt || {}, mw = !!o.morgenwerte;
    const out = { v: V74.VERSIONS.ampelplan, date: (r && r.datum) || o.datum || null, status: "wie_geplant", ampel: r ? r.status : "nicht beurteilbar",
      gruende: [], morgenwerte: mw, hinweis: null };
    if (!r) { out.hinweis = "Ampel nicht berechenbar – wie geplant"; return out; }
    const ind = r.indikatoren || {}, krank = ind.krank && Array.isArray(ind.krank.zeichen) ? ind.krank.zeichen : null, A = r.alle_gruende || [];
    if (krank && krank.length) {
      out.status = "krank"; out.gruende = [`Krankheitszeichen angegeben (${krank.join(", ")})`];
      out.hinweis = "Ruhetag. Bei Fieber oder allgemeinen Symptomen pausieren und ärztlich abklären.";
      return out;
    }
    if (!mw) {
      if (ind.befinden && ind.befinden.status === "belastet") { out.status = "vorsichtig"; out.gruende = A.filter((x) => x.kind === "befinden" && x.w >= 4).map((x) => x.txt).slice(0, 2); }
      out.hinweis = "Morgenwerte von heute fehlen noch – bis dahin zählt nur der Check-in.";
      return out;
    }
    if (r.status === "vorsichtig") { out.status = "vorsichtig"; out.gruende = A.filter((x) => x.w >= 4).map((x) => x.txt).slice(0, 4); }
    else if (r.status === "normal") out.hinweis = "Wie geplant; bei harten Einheiten auf das Gefühl achten.";
    else if (r.status === "nicht beurteilbar") out.hinweis = "Zu wenig Morgenwerte für ein Urteil – der Check-in entscheidet.";
    return out;
  };

  /* ---------------- Einheiten ---------------- */
  const teilKeys = (e) => (e && Array.isArray(e.teile) ? e.teile.map((t) => t[0]) : []);
  /** Hat die Einheit mittlere oder harte Abschnitte (oder ist sie ein Test)? Bibliothek: Stufe aus den Zielen bzw. dem Titel, unbekannt = ja. */
  V74.istHart = (e) => !!e && (e.art === "test" || !!e.test || (e.art === "bibliothek" ? e.stufe !== "locker" : teilKeys(e).some((k) => HART_K.has(k))));
  /** Wird eine ausgefallene Einheit nachgeholt? Nur Schlüsseleinheiten (Rad, Laufen, CSS) und harte Workouts aus der Bibliothek – keine Tests
   *  (die stehen im Testkalender), keine Aktivierung, keine langen Einheiten (die werden nur kürzer). */
  V74.nachholbar = (e) => !!e && !e.test && e.art !== "test" && e.id !== "aktivierung"
    && (e.art === "bibliothek" ? ["alles", "schwelle"].includes(e.stufe) : !!e.schluessel || e.art === "schluessel_s");
  const kurz = (e) => (e ? { id: e.id || null, titel: e.titel, dauer: e.dauer, sport: e.sport } : null);
  /** Lockere Fassung einer Einheit bei «vorsichtig» → neue Einheit mit `ampel` { von, grund } oder null (bleibt, wie sie ist).
   *  Gleiche Sportart, gleiche Uhrzeit und Metrik; Intensität nur locker; lange Einheiten höchstens zwei Drittel. ctx = { phase, css_s }. */
  V74.locker = function (e, ctx) {
    // V7.7 aktivitaet-plan-1.0: Aktivität draussen bei «vorsichtig» höchstens zwei Drittel der Dauer (ab 90 min) und nur Z1
    if (e && !e.gesperrt && e.art === "draussen" && e.spec) {
      const gr = []; let d = e.dauer;
      if (d > V74.LANG_AB) { const k = Math.max(60, Math.floor((d * V74.ANTEIL) / 15) * 15); if (k < d) { d = k; gr.push(`auf zwei Drittel gekürzt (${d} min)`); } }
      if (e.zone !== "z1") gr.push("nur Z1");
      if (!gr.length) return null;
      const n = V66.einheit(Object.assign({}, e.spec, { dauer: d, zone: "z1" }), ctx || {});
      if (!n) return null;
      n.titel += " (Ampel)"; n.ablauf = [`Ampel: statt «${e.titel}» (${e.dauer} min)`].concat(n.ablauf || []); n.ampel = { von: kurz(e), grund: gr };
      return n;
    }
    if (!e || e.gesperrt || !LOCKER[e.sport] || e.id === "schwimm_kurs") return null;      // Kraft, Mobility und der Schwimmkurs bleiben
    let id = null, d = isNum(e.dauer) ? e.dauer : null; const gr = [];
    if (!isNum(d)) return null;
    if (e.art === "test" || e.test) {
      id = LOCKER[e.sport]; d = Math.min(d, TEST_MIN[e.sport]);
      gr.push("kein Test heute: müde gemessen gibt falsche Werte – den Termin im Testkalender verschieben");
    } else if (V74.istHart(e)) {
      id = OHNE_RT[e.id] || LOCKER[e.sport];
      gr.push(e.art === "bibliothek" ? (e.stufe === "offen" ? "Enduco-Workout mit unbekannter Intensität: locker" : "Enduco-Workout: locker")
        : OHNE_RT[e.id] ? "ohne Renntempo-Abschnitte" : "ohne harte und mittlere Abschnitte");
    }
    if (e.art === "lang" || d > V74.LANG_AB) {
      const k = Math.max(5, Math.floor((d * V74.ANTEIL) / 5) * 5);
      if (k < d) { d = k; gr.push(`auf zwei Drittel gekürzt (${d} min)`); if (!id) id = e.art === "bibliothek" ? LOCKER[e.sport] : e.id; }
    }
    if (!id) return null;
    const B = V66.bereich(id);
    if (B && !B.fest && d < B.min) id = LOCKER[e.sport];                // lange Vorlage unter ihrer kürzesten Dauer: lockere Einheit
    const spec = { uid: e.uid, vorlage: id, dauer: d, quelle: e.quelle === "bibliothek" ? "eigen" : e.quelle || "vorschlag" };
    for (const k of ["uhrzeit", "metrik", "drinnen", "pool"]) if (e[k] != null && e[k] !== false) spec[k] = e[k];   // V7.5: auch die Bahnlänge der Einheit
    const n = V66.einheit(spec, ctx || {});
    if (!n) return null;
    n.titel += " (Ampel)";                                              // auch auf der Uhr sichtbar: «IN · Rad locker (Ampel)»
    n.ablauf = [`Ampel: statt «${e.titel}» (${e.dauer} min)`].concat(n.ablauf || []);
    n.ampel = { von: kurz(e), grund: gr };
    return n;
  };

  /* ---------------- Woche ---------------- */
  const land = (x) => x.sport === "rad" || x.sport === "lauf";
  const stoert = (a, b) => a.sport === b.sport || (land(a) && land(b));          // wie verfuegbarkeit-1.0: harte Einheiten an Land stören sich
  const hartAmTag = (x) => V74.nachholbar(x);                                   // eine wieder gelockerte Einheit ist keine harte mehr
  const istTest = (x) => x.art === "test" || !!x.test;
  /**
   * Mein Plan einer Woche mit der Ampel-Schicht (was galt bzw. gilt). w = Woche aus V66.meinPlan; stand(date) → { status, gruende, hinweis,
   * trotzdem } oder null (kein Entscheid: wie geplant); opt = { ctx: { phase, css_s } (Einheiten), verf: Verfügbarkeit (V66.verfuegbarkeit) }.
   * → neue Woche; Tage mit Entscheid tragen `ampel` = { status, gruende, hinweis, trotzdem, geaendert [{uid, von, nach, grund}],
   *   nachholen [{titel, nach}], weg [{titel, grund}], gesperrt [Titel] }; nachgeholte Einheiten tragen `ampel.nachgeholt`. Ohne Wirkung: w.
   */
  V74.woche = function (w, stand, opt) {
    if (!w || !Array.isArray(w.tage) || typeof stand !== "function") return w;
    const o = opt || {}, ctx = o.ctx || {};
    const S = w.tage.map((t) => { try { return stand(t.date) || null; } catch (e) { return null; } });
    if (!S.some((s) => s && (s.status === "vorsichtig" || s.status === "krank"))) return w;
    const rennwoche = w.tage.some((t) => t.rennen);
    const tage = w.tage.map((t) => Object.assign({}, t, { einheiten: (t.einheiten || []).slice() }));
    const info = (i) => {
      const s = S[i] || {};
      if (!tage[i].ampel) tage[i].ampel = { v: V74.VERSIONS.ampelplan, status: s.status || "wie_geplant", ampel: s.ampel || null, gruende: (s.gruende || []).slice(),
        hinweis: s.hinweis || null, trotzdem: !!s.trotzdem, geaendert: [], nachholen: [], weg: [], gesperrt: [] };
      return tage[i].ampel;
    };
    // Platz für eine nachgeholte Einheit H an Tag i: Index der lockeren Einheit derselben Sportart, die sie ersetzt, oder −1
    const platz = (i, H) => {
      const t = tage[i], nach = tage[i + 1];
      if (t.rennen || t.gesperrt || t.einheiten.some(istTest)) return -1;
      if (nach && (nach.rennen || nach.einheiten.some(istTest))) return -1;                       // nicht am Tag vor einem Test oder Rennen
      const vor = tage[i - 1];                                                                    // V7.6 kraft-plan-1.1: nicht am Tag nach einem Krafttraining (Rad, Laufen)
      if (vor && (H.sport === "rad" || H.sport === "lauf") && vor.einheiten.some((x) => x.sport === "kraft")) return -1;
      // V7.7 aktivitaet-plan-1.0: nicht am Tag einer Aktivität draussen, als Rad- oder Laufeinheit nicht neben einer ab 2 h
      if (t.einheiten.some((x) => x.art === "draussen")) return -1;
      if ((H.sport === "rad" || H.sport === "lauf") && [vor, nach].some((n) => n && n.einheiten.some((x) => x.art === "draussen" && (x.dauer || 0) >= 120))) return -1;
      for (const k of [i - 1, i, i + 1]) { const n = tage[k]; if (n && n.einheiten.some((x) => hartAmTag(x) && stoert(x, H))) return -1; }
      const j = t.einheiten.findIndex((x) => x.sport === H.sport && x.id === LOCKER[x.sport] && !x.gesperrt && x.quelle !== "bibliothek" && !x.ampel);
      if (j < 0) return -1;
      const v = o.verf ? o.verf(t.date) : null;
      if (v) {
        if (Array.isArray(v.sport) && !v.sport.includes(H.sport)) return -1;
        const sum = t.einheiten.reduce((s, x) => s + (x.dauer || 0), 0) - (t.einheiten[j].dauer || 0) + (H.dauer || 0);
        if (isNum(v.min) && sum > v.min) return -1;
      }
      return j;
    };
    // Die nachgeholte Einheit passt in die Dauer der ersetzten (nie länger): sonst ihre kurze Fassung, sonst nicht an diesem Tag
    const passend = (H, X) => {
      if (!isNum(H.dauer) || !isNum(X.dauer)) return null;
      if (H.dauer <= X.dauer) return H;
      if (H.art === "bibliothek" || !V64.BAUSTEINE[H.id]) return null;
      const spec = { uid: H.uid, vorlage: H.id, dauer: X.dauer, quelle: H.quelle || "vorschlag" };
      for (const k of ["metrik", "drinnen"]) if (H[k] != null && H[k] !== false) spec[k] = H[k];
      const k = V66.einheit(spec, ctx);
      return k && k.dauer <= X.dauer && V74.nachholbar(k) ? k : null;
    };
    const ersetzt = new Map();                                              // nachgeholte Einheit → die lockere Einheit, deren Platz sie nahm
    const offen = [];                                                       // ausgefallene Schlüsseleinheiten { e, von, i }
    for (let i = 0; i < tage.length; i++) {
      const t = tage[i];
      for (const q of offen.slice()) {                                      // a) nachholen, bevor der Tag selbst entschieden wird
        const j = platz(i, q.e); if (j < 0) continue;
        const X = t.einheiten[j], P = passend(q.e, X); if (!P) continue;
        const H = Object.assign({}, P, { uid: X.uid, ampel: { nachgeholt: { von: q.von, titel: q.e.titel }, ersetzt: kurz(X) } });
        delete H.gesperrt; if (X.uhrzeit) H.uhrzeit = X.uhrzeit; else delete H.uhrzeit;
        t.einheiten[j] = H; ersetzt.set(H, X);
        offen.splice(offen.indexOf(q), 1);
        info(q.i).nachholen.push({ titel: q.e.titel, nach: t.date, dauer: H.dauer });
      }
      const s = S[i];                                                       // b) Entscheid dieses Tages
      if (!s || (s.status !== "vorsichtig" && s.status !== "krank")) continue;
      const A = info(i);
      if (s.trotzdem) continue;                                             // «Trotzdem wie geplant»: dieser Tag bleibt
      if (t.gesperrt) { A.gesperrt = t.einheiten.map((e) => e.titel); continue; }
      if (s.status === "krank") {
        const bleibt = t.einheiten.filter((e) => e.gesperrt);
        for (const e of t.einheiten) if (!e.gesperrt) A.geaendert.push({ uid: e.uid, von: kurz(e), nach: null, grund: ["Ruhetag (Krankheitszeichen)"] });
        A.gesperrt = bleibt.map((e) => e.titel);
        t.einheiten = bleibt;
        if (!bleibt.length) { t.ruhetag = true; t.notiz = "Ruhetag (Krankheitszeichen)"; }
        continue;                                                           // nach Krankheitszeichen wird nichts nachgeholt
      }
      t.einheiten = t.einheiten.map((e) => {
        if (e.gesperrt) { A.gesperrt.push(e.titel); return e; }
        if (ersetzt.has(e)) {                                               // nachgeholt, aber auch hier «vorsichtig»: die lockere Einheit des Tages
          const X = ersetzt.get(e), nx = V74.locker(X, ctx);                // gilt wieder (nie länger als geplant), nicht nochmals verschoben
          A.weg.push({ titel: e.titel, grund: `nachgeholt vom ${V74.wochentag(e.ampel.nachgeholt.von)}, auch hier «vorsichtig» – entfällt` });
          if (nx) A.geaendert.push({ uid: X.uid, von: kurz(X), nach: kurz(nx), grund: nx.ampel.grund });
          return nx || X;
        }
        const n = V74.locker(e, ctx);
        if (!n) return e;
        A.geaendert.push({ uid: e.uid, von: kurz(e), nach: kurz(n), grund: n.ampel.grund });
        if (V74.nachholbar(e)) {
          if (rennwoche) A.weg.push({ titel: e.titel, grund: "Rennwoche: nichts wird verschoben" });
          else offen.push({ e, von: t.date, i });
        }
        return n;
      });
    }
    for (const q of offen) info(q.i).weg.push({ titel: q.e.titel, grund: "kein passender Tag mehr in dieser Woche" });
    const out = Object.assign({}, w, { tage, ampel: { v: V74.VERSIONS.ampelplan, tage: tage.filter((t) => t.ampel).map((t) => t.date) } });
    const hinweise = [];
    for (const t of tage) {
      const A = t.ampel; if (!A || A.trotzdem) continue;
      const wt = V74.wochentag(t.date).slice(0, 2);
      for (const g of A.geaendert) hinweise.push(g.nach ? `Ampel ${wt}: «${g.nach.titel}» ${g.nach.dauer} min statt «${g.von.titel}» ${g.von.dauer} min` : `Ampel ${wt}: «${g.von.titel}» entfällt (Ruhetag)`);
      for (const x of A.nachholen) hinweise.push(`Ampel: «${x.titel}» nachgeholt am ${V74.wochentag(x.nach)}`);
      for (const x of A.weg) hinweise.push(`Ampel: «${x.titel}» entfällt – ${x.grund}`);
    }
    out.hinweise = (w.hinweise || []).concat(hinweise);
    return V66.summen ? V66.summen(out, w) : out;
  };

  /** Tage «vorsichtig» bzw. mit Krankheitszeichen in Folge bis heute (heute eingeschlossen; «Trotzdem» zählt mit – es geht um den Körper). */
  V74.serie = function (stand, heute, max) {
    let n = 0;
    for (let i = 0; i < (max || 21); i++) {
      let s = null; try { s = stand(add(heute, -i)); } catch (e) { s = null; }
      if (s && (s.status === "vorsichtig" || s.status === "krank")) n++; else break;
    }
    return n;
  };

  /* ---------------- Gespeicherter Entscheid (Eingabe «ampel» → ampel_anpassung) ---------------- */
  /** Eintrag für einen Tag: { id «aa-JJJJ-MM-TT», date, v, status, ampel, gruende, morgenwerte, quelle, geaendert[, trotzdem { an, am }] }. */
  V74.eintrag = function (e, o) {
    o = o || {};
    const x = { id: "aa-" + e.date, date: e.date, v: V74.VERSIONS.ampelplan, status: e.status, ampel: V74.AMPEL.includes(e.ampel) ? e.ampel : "nicht beurteilbar",
      gruende: (e.gruende || []).slice(0, 6).map((g) => String(g).slice(0, 300)), morgenwerte: !!e.morgenwerte, quelle: o.quelle === "morgen-update" ? "morgen-update" : "seite",
      geaendert: o.jetzt || new Date().toISOString() };
    if (o.trotzdem && typeof o.trotzdem === "object") x.trotzdem = { an: !!o.trotzdem.an, am: String(o.trotzdem.am || x.geaendert) };
    return x;
  };
  const zeitOk = (s) => typeof s === "string" && !isNaN(Date.parse(s));
  /** Prüft einen Eintrag (gleiche Regeln wie merge_daily.ampel_pruefen) → Fehlertext oder null. */
  V74.pruefen = function (x) {
    if (!x || typeof x !== "object") return "kein Eintrag";
    if (!ISO_RE.test(String(x.date || "")) || isNaN(Date.parse(x.date + "T12:00:00Z"))) return "kein Datum";
    if (x.id !== "aa-" + x.date) return "ID passt nicht zum Datum";
    if (!V74.STATUS.includes(x.status)) return "unbekannter Entscheid";
    if (!V74.AMPEL.includes(x.ampel)) return "unbekannter Ampel-Stand";
    if (!Array.isArray(x.gruende) || x.gruende.length > 6 || x.gruende.some((g) => typeof g !== "string" || g.length > 300)) return "Gründe ungültig";
    if (typeof x.morgenwerte !== "boolean") return "Morgenwerte ja oder nein";
    if (!["seite", "morgen-update"].includes(x.quelle)) return "unbekannte Quelle";
    if (!zeitOk(x.geaendert)) return "ohne Zeitpunkt";
    if (Math.abs(Date.parse(x.date + "T12:00:00Z") - Date.parse(x.geaendert)) > 1.5 * 864e5) return "Entscheid nicht am selben Tag";
    if (x.trotzdem != null && !(typeof x.trotzdem === "object" && typeof x.trotzdem.an === "boolean" && zeitOk(x.trotzdem.am))) return "«Trotzdem» ungültig";
    return null;
  };
  /** Zwei Fassungen desselben Tages zusammenführen (Daten und Gerät): Entscheid aus der neueren, «Trotzdem» aus der zuletzt gedrückten. */
  V74.zusammen = function (a, b) {
    const L = [a, b].filter((x) => x && !V74.pruefen(x));
    if (!L.length) return null;
    L.sort((x, y) => String(x.geaendert).localeCompare(String(y.geaendert)));
    const out = Object.assign({}, L[L.length - 1]);
    const T = L.map((x) => x.trotzdem).filter((t) => t && typeof t === "object").sort((x, y) => String(x.am).localeCompare(String(y.am)));
    if (T.length) out.trotzdem = T[T.length - 1]; else delete out.trotzdem;
    return out;
  };
  /** Gespeicherter Eintrag eines Tages aus einer oder mehreren Listen. */
  V74.gespeichert = function (datum, ...listen) {
    let x = null;
    for (const L of listen) for (const e of L || []) if (e && e.date === datum) x = V74.zusammen(x, e);
    return x;
  };
  /** Stand für die Schicht: gespeicherter Eintrag → { status, ampel, gruende, hinweis, trotzdem } */
  V74.ausEintrag = (x) => (x ? { status: x.status, ampel: x.ampel, gruende: x.gruende || [], hinweis: null, trotzdem: !!(x.trotzdem && x.trotzdem.an), morgenwerte: !!x.morgenwerte } : null);
  /** Kurztext eines Entscheids für Banner und Kalender. */
  V74.titel = (s) => (!s ? "" : s.status === "krank" ? "Ruhetag wegen Krankheitszeichen" : s.status === "vorsichtig" ? "Angepasst wegen Ampel" : "Wie geplant");
  V74.sportWort = (sp) => SPW[sp] || "Training";
  return V74;
});
