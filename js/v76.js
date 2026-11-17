/* Ironman Notebook V7.6 – Etappe 7 «Krafttraining als Zusatzeinheit» (Auftrag V7.3 «wie enduco», Wunsch vom 16.11.2026), Rechenlogik ohne DOM.
   kraft-plan-1.1 (Regeln von Silas am 17.11.2026 freigegeben; 1.0 = fester Tag ohne Abstimmung):
   - Termin je Woche aus den Planeinstellungen (pe-kraft: an/aus, Tag automatisch aus den möglichen Tagen oder fest, Uhrzeit, Dauer – Standard 1:30 h –,
     Notiz für die Übungen). Gilt ab der Woche nach dem Speichern wie Start und Basis-Fitness. Ausnahme für eine kommende Woche (pe-kraft-<Montag>):
     auslassen oder ein bestimmter Tag. In der laufenden Woche und an gespeicherten Tagen über Mein Plan.
   - Automatisch: der beste mögliche Tag – nicht vor einer harten Rad- oder Laufeinheit, lieber mit einer kurzen lockeren Einheit, mit Zeit laut
     Verfügbarkeit (eigene Gewichte, Wissen «kraft»).
   - Regeln: (1) am Tag danach keine harte Rad- oder Laufeinheit (umziehen beim Verteilen, sonst locker – V66.verteilen); (2) am Krafttag darf eine harte
     Einheit bleiben, Kraft danach (Hinweis, wenn vorher oder weniger als 6 h danach), eine lockere Einheit an Land höchstens 60 min; (3) belegt Zeit,
     zählt nicht in Stunden, TL ≈ und Form; (4) nicht am Test- und am Vortag – fest: einen Tag früher, sonst fällt es aus; (5) keine Kraft in Rennwochen
     (A und B); im Taper des A-Rennens nur 7–10 Tage davor mit zwei Dritteln der Dauer; (6) Erholungswoche zwei Drittel; (7) Ampel «vorsichtig»: bleibt;
     (8) sRPE = RPE × Minuten als eigene Zahl; (9) nicht an Garmin. */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V76 = factory(node ? require("./v64.js") : root && root.V64, node ? require("./v66.js") : root && root.V66);
  if (node) module.exports = V76;
  if (root) root.V76 = V76;
})(typeof window !== "undefined" ? window : null, function (V64, V66) {
  "use strict";
  const V76 = { VERSIONS: { kraft: "kraft-plan-1.1" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const add = (iso, n) => V64.addDays(iso, n);
  const wtNr = (iso) => ((new Date(Date.parse(iso + "T12:00:00Z")).getUTCDay() + 6) % 7) + 1;
  const tageZwischen = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  V76.TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  V76.TAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  V76.LOCKER_MAX = 60;                                                    // Regel 2: lockere Einheit an Land am Krafttag höchstens 60 min
  V76.ABSTAND_H = 6;                                                      // Regel 2: Kraft mindestens 6 h nach einer harten Einheit
  /** «1:30 h» bzw. «45 min» */
  V76.dauerText = (min) => (min >= 60 ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h` : `${min} min`);
  const land = (e) => !!e && (e.sport === "rad" || e.sport === "lauf");
  const hart = (e) => !!e && (V66.hart ? V66.hart(e) : !!e.schluessel);
  const istTest = (e) => !!e && (e.art === "test" || !!e.test);
  const zweiDrittel = (d) => Math.max(15, Math.round((d * 2) / 3 / 5) * 5);

  /** Termin der Woche mit Montag mo aus den Einstellungen E (V75.einstellungen). null = kein Krafttraining eingestellt; sonst
   *  { auto, tage (mögliche Wochentage), date (fest oder Ausnahme, sonst null), regel, uhrzeit, dauer, notiz, verschoben, aus } */
  V76.termin = function (E, mo) {
    const K = E && E.kraft;
    if (!K || !K.aktiv || !mo) return null;
    const auto = K.modus === "auto";
    if (!auto && !K.wt) return null;
    const x = (E.kraftWochen || {})[mo] || null, regel = auto ? null : add(mo, K.wt - 1);
    const date = x && x.tag ? x.tag : regel;
    return { auto: auto && !(x && x.tag), tage: auto ? (K.tage && K.tage.length ? K.tage.slice() : [1, 2, 3, 4, 5, 6, 7]) : [K.wt], date, regel,
      uhrzeit: (x && x.uhrzeit) || K.uhrzeit || null, dauer: isNum(K.dauer) ? K.dauer : 90, notiz: K.notiz || null,
      verschoben: !!(x && x.tag && x.tag !== regel), aus: !!(x && x.aus) };
  };
  /** Einheit «Krafttraining» für einen Termin, wie eine gespeicherte Einheit der Vorlage «kraft» (V66.einheit). spec bleibt dabei, damit «Festhalten»
   *  in Mein Plan Dauer und Uhrzeit behält; kraft_plan = kommt aus den Planeinstellungen. */
  V76.einheit = function (t) {
    if (!t || !t.date) return null;
    const spec = { uid: "kraft-" + t.date, vorlage: "kraft", dauer: t.dauer, quelle: "vorschlag" };
    if (t.uhrzeit) spec.uhrzeit = t.uhrzeit;
    const e = V66.einheit(spec, {});
    if (!e) return null;
    return Object.assign(e, { kraft_plan: true, kraft_auto: !!t.auto, notiz: t.notiz || null, spec, wissen: "kraft",
      zweck: "Dein Krafttraining aus den Planeinstellungen. Die Übungen planst du selbst; die Seite zählt die Einheit nicht in Stunden, TL ≈ und Form."
        + (t.auto ? " Den Tag wählt die Seite: nie vor einer harten Rad- oder Laufeinheit, lieber an einem Tag mit einer kurzen lockeren Einheit." : "") });
  };
  /** Bleibt die Einheit e an Tag date (Sportart laut Verfügbarkeit erlaubt)? Ohne Verfügbarkeit immer. */
  const bleibt = (verf, date, e) => { const v = verf ? verf(date) : null; return !v || !Array.isArray(v.sport) || !["schwimm", "rad", "lauf"].includes(e.sport) || v.sport.includes(e.sport); };
  const keinTraining = (v) => !!v && (v.min === 0 || (Array.isArray(v.sport) && !v.sport.length));
  /** Lockere Einheit an Land aus dem Vorschlag, die am Krafttag auf 60 min gekürzt wird (Regel 2). */
  const kuerzbar = (e) => land(e) && !hart(e) && e.art === "locker" && !e.gesperrt && e.quelle !== "eigen" && e.quelle !== "bibliothek" && (e.dauer || 0) > V76.LOCKER_MAX;
  /** Minuten eines Tages mit dem Krafttraining, die gekürzte lockere Einheit schon mit 60 min. */
  const tagMin = (L) => L.reduce((x, e) => x + (kuerzbar(e) ? V76.LOCKER_MAX : e.dauer || 0), 0);
  /** Bewertung eines möglichen Krafttags i (eigene Gewichte, kraft-plan-1.1): Tag danach mit harter Einheit an Land −100, mit langer −10; am Tag selbst
   *  lange Einheit an Land −50, harte −5, lockere an Land bis 60 min +10, länger −20; passt das Krafttraining laut Verfügbarkeit nicht mehr in den Tag:
   *  −30 und −5 je 15 min darüber (höchstens −80). w am besten schon nach der Verfügbarkeit verteilt (so steht jede Einheit an ihrem Tag). */
  V76.bewerten = function (w, i, dauer, verf) {
    const t = w.tage[i], n = w.tage[i + 1], am = (x) => (x.einheiten || []).filter((e) => bleibt(verf, x.date, e) && e.sport !== "kraft");
    let s = 0;
    if (n && am(n).some((e) => hart(e) && land(e))) s -= 100;
    else if (n && am(n).some((e) => e.art === "lang" && land(e))) s -= 10;
    const E = am(t), lockerMin = E.filter((e) => land(e) && !hart(e) && e.art !== "lang").reduce((x, e) => x + (e.dauer || 0), 0);
    if (E.some((e) => e.art === "lang" && land(e))) s -= 50;
    if (E.some((e) => hart(e) && land(e))) s -= 5;
    if (lockerMin > 0) s += lockerMin <= V76.LOCKER_MAX ? 10 : -20;
    const v = verf ? verf(t.date) : null;
    if (v && isNum(v.min)) { const ueber = tagMin(E) + dauer - v.min; if (ueber > 0) s -= Math.min(80, 30 + Math.ceil(ueber / 15) * 5); }
    return s;
  };
  /** Passt das eingeplante Krafttraining in die schon verteilte Woche w, ohne dass etwas umziehen muss? (Zeit am Tag laut Verfügbarkeit mit der gekürzten
   *  lockeren Einheit; am Tag danach keine harte Einheit an Land.) Sonst muss die Woche mit dem Krafttraining neu verteilt werden (V66.verteilen). */
  V76.passt = function (w, verf) {
    if (!w || !w.kraft || w.kraft.status !== "geplant" || !Array.isArray(w.tage)) return true;
    const i = w.tage.findIndex((x) => x.date === w.kraft.date); if (i < 0) return false;
    const n = w.tage[i + 1], v = verf ? verf(w.tage[i].date) : null;
    if (n && (n.einheiten || []).some((e) => hart(e) && land(e))) return false;
    return !(v && isNum(v.min) && tagMin(w.tage[i].einheiten || []) > v.min);
  };
  /**
   * Woche w (V64.woche) mit dem Krafttraining der Woche (kraft-plan-1.1): Tag wählen (automatisch oder fest) und als Einheit eintragen. Den automatischen
   * Tag am besten an der schon verteilten Woche wählen (so steht jede Einheit an ihrem Tag); passt er dort (V76.passt), bleibt die verteilte Woche, sonst
   * wird die Woche mit dem Krafttraining neu verteilt (es belegt seine Zeit, am Tag danach keine harte Einheit an Land, V66.verteilen).
   * opt = { verf (V66.verfuegbarkeit), haupt (Datum des A-Rennens), tag (automatischer Tag schon gewählt, z. B. an der verteilten Woche) }.
   * Regel 2 (lockere Einheit am Krafttag kürzen, Hinweise) erst nach dem Verteilen: V76.abstimmen.
   * → neue Woche mit w.kraft = { status «geplant»|«aus»|«weg», date, auto, dauer, grund, kurz } und Hinweisen; ohne Termin w selbst.
   */
  V76.einplanen = function (w, E, opt) {
    opt = opt || {};
    if (!w || !Array.isArray(w.tage) || !w.tage.length) return w;
    const mo = w.woche || w.tage[0].date, t = V76.termin(E, mo);
    if (!t) return w;
    const hinweise = (w.hinweise || []).slice(), info = Object.assign({ status: "geplant" }, t);
    const fertig = (status, grund, tage) => Object.assign({}, w, tage ? { tage } : {}, { kraft: Object.assign(info, { status, grund: grund || null }), hinweise });
    if (t.aus) { hinweise.push("Krafttraining in dieser Woche ausgelassen (Planeinstellungen)"); return fertig("aus", "ausgelassen"); }
    // Regel 5: keine Kraft in Rennwochen (A und B)
    if (w.tage.some((x) => x.rennen)) { hinweise.push("Rennwoche: kein Krafttraining (kraft-plan-1.1)"); return fertig("weg", "Rennwoche"); }
    let dauer = t.dauer, fenster = null;
    // Regel 5: im Taper des A-Rennens nur 7–10 Tage davor, zwei Drittel der Dauer
    if (w.phase === "Taper" && opt.haupt) {
      fenster = w.tage.map((x, i) => i).filter((i) => { const d = tageZwischen(w.tage[i].date, opt.haupt); return d >= 7 && d <= 10; });
      if (!fenster.length) { hinweise.push("Taper: Krafttraining nur noch 7–10 Tage vor dem Rennen (kraft-plan-1.1)"); return fertig("weg", "Taper"); }
      dauer = zweiDrittel(dauer); info.kurz = "Taper";
    } else if (w.erholung) { dauer = zweiDrittel(dauer); info.kurz = "Erholungswoche"; }      // Regel 6
    // Regel 4: nicht am Tag eines Tests und nicht am Vortag
    const testNah = (i) => [i, i + 1].some((k) => w.tage[k] && (w.tage[k].einheiten || []).some(istTest));
    const moeglich = (i) => { const x = w.tage[i]; return !!x && !x.gesperrt && !testNah(i) && (!fenster || fenster.includes(i)); };
    let i = -1;
    if (t.auto && opt.tag) {
      i = w.tage.findIndex((x) => x.date === opt.tag);
      if (i < 0) return w;
    } else if (t.auto) {
      const K = w.tage.map((x, k) => k).filter((k) => t.tage.includes(wtNr(w.tage[k].date)) && moeglich(k) && !keinTraining(opt.verf ? opt.verf(w.tage[k].date) : null));
      let best = -Infinity;
      for (const k of K) { const s = V76.bewerten(w, k, dauer, opt.verf); if (s > best) { best = s; i = k; } }
      if (i < 0) { hinweise.push("Krafttraining: in dieser Woche kein möglicher Tag (Tests, Verfügbarkeit oder Taper) – fällt aus"); return fertig("weg", "kein Tag"); }
    } else {
      const k0 = w.tage.findIndex((x) => x.date === t.date);
      if (k0 < 0) return w;
      if (fenster && !fenster.includes(k0)) i = fenster.slice().sort((a, b) => Math.abs(a - k0) - Math.abs(b - k0) || a - b)[0];
      else if (moeglich(k0)) i = k0;
      else if (k0 > 0 && moeglich(k0 - 1) && !w.tage[k0].gesperrt) { i = k0 - 1; hinweise.push(`Krafttraining einen Tag früher (${V76.TAGE[wtNr(w.tage[i].date) - 1]}): Test am Tag danach (kraft-plan-1.1)`); }
      else { hinweise.push("Krafttraining fällt diese Woche aus: Test am selben oder am nächsten Tag (kraft-plan-1.1)"); return fertig("weg", "Test"); }
      if (fenster && i !== k0) hinweise.push(`Taper: Krafttraining am ${V76.TAGE[wtNr(w.tage[i].date) - 1]} (7–10 Tage vor dem Rennen)`);
      if (keinTraining(opt.verf ? opt.verf(w.tage[i].date) : null)) hinweise.push(`Krafttraining am ${V76.TAGE[wtNr(w.tage[i].date) - 1]}: laut Verfügbarkeit kein Training an diesem Tag`);
    }
    const ds = w.tage[i].date, k = V76.einheit(Object.assign({}, t, { date: ds, dauer }));
    if (!k) return w;
    if (info.kurz) hinweise.push(`${info.kurz}: Krafttraining ${V76.dauerText(dauer)} statt ${V76.dauerText(t.dauer)} (kraft-plan-1.1)`);
    const tage = w.tage.map((x, j) => (j === i ? Object.assign({}, x, { einheiten: (x.einheiten || []).concat([k]), ruhetag: false }) : x));
    Object.assign(info, { date: ds, dauer });
    return fertig("geplant", null, tage);
  };
  /**
   * Regel 2 nach dem Verteilen (kraft-plan-1.1): am Krafttag eine lockere Einheit an Land (aus dem Vorschlag) höchstens 60 min, eine lange Einheit und
   * die Reihenfolge zu einer harten Einheit (Kraft danach, mindestens 6 h Abstand) nur als Hinweis. opt = { ctxE } für die gekürzte Einheit (V66.einheit).
   */
  V76.abstimmen = function (w, opt) {
    opt = opt || {};
    if (!w || !w.kraft || w.kraft.status !== "geplant" || !Array.isArray(w.tage)) return w;
    const i = w.tage.findIndex((x) => (x.einheiten || []).some((e) => e.kraft_plan));
    if (i < 0) return w;
    const ds = w.tage[i].date, hinweise = (w.hinweise || []).slice(), k = w.tage[i].einheiten.find((e) => e.kraft_plan);
    let gekuerzt = false;
    const einheiten = w.tage[i].einheiten.map((e) => {
      if (kuerzbar(e)) {
        const n = V66.einheit({ uid: e.uid || `kraft-kurz-${ds}`, vorlage: e.id, dauer: V76.LOCKER_MAX, quelle: "vorschlag" }, opt.ctxE || {});
        if (n) { gekuerzt = true; hinweise.push(`«${e.titel}» am Krafttag (${V76.TAGE[wtNr(ds) - 1]}) auf ${V76.LOCKER_MAX} min gekürzt (kraft-plan-1.1)`); return Object.assign(n, e.uid ? { uid: e.uid } : {}); }
      }
      return e;
    });
    if (einheiten.some((e) => e.art === "lang" && land(e))) hinweise.push(w.kraft.auto
      ? `Krafttraining am ${V76.TAGE[wtNr(ds) - 1]} mit einer langen Einheit – in dieser Woche der passendste Tag (kraft-plan-1.1)`
      : `Krafttraining am Tag einer langen Einheit (${V76.TAGE[wtNr(ds) - 1]}) – besser an einem anderen Tag`);
    const H = einheiten.find((e) => hart(e) && land(e) && e.uhrzeit);
    if (H && k && k.uhrzeit) {
      const min = (u) => +u.slice(0, 2) * 60 + +u.slice(3, 5), ende = min(H.uhrzeit) + (H.dauer || 0);
      if (min(k.uhrzeit) < min(H.uhrzeit) || min(k.uhrzeit) - ende < V76.ABSTAND_H * 60) hinweise.push(`Krafttraining nach «${H.titel}» mit mindestens ${V76.ABSTAND_H} h Abstand (kraft-plan-1.1)`);
    }
    const out = Object.assign({}, w, { tage: w.tage.map((x, j) => (j === i ? Object.assign({}, x, { einheiten }) : x)), hinweise });
    return gekuerzt && V66.summen ? V66.summen(out, w) : out;
  };
  /** Kurztext eines Termins: «automatisch (Mo, Di, Mi, Fr–So) · 1:30 h» bzw. «Mittwoch 18:00 · 1:30 h» (K = E.kraft). */
  V76.tageText = function (L) {
    const s = (L || []).slice().sort();
    if (s.length === 7) return "jeder Tag";
    const teile = []; let a = 0;
    while (a < s.length) { let b = a; while (b + 1 < s.length && s[b + 1] === s[b] + 1) b++; teile.push(b - a >= 2 ? `${V76.TAGE_KURZ[s[a] - 1]}–${V76.TAGE_KURZ[s[b] - 1]}` : s.slice(a, b + 1).map((x) => V76.TAGE_KURZ[x - 1]).join(", ")); a = b + 1; }
    return teile.join(", ");
  };
  V76.text = function (K) {
    if (!K || !K.aktiv || (K.modus !== "auto" && !K.wt)) return "nicht eingeplant";
    const d = V76.dauerText(isNum(K.dauer) ? K.dauer : 90);
    if (K.modus === "auto") return `automatisch (${V76.tageText(K.tage || [1, 2, 3, 4, 5, 6, 7])})${K.uhrzeit ? " " + K.uhrzeit : ""} · ${d}`;
    return `${V76.TAGE[K.wt - 1]}${K.uhrzeit ? " " + K.uhrzeit : ""} · ${d}`;
  };
  /** Kommende Ausnahmen ab Montag mo (inklusive), sortiert: [{ mo, aus, tag, uhrzeit }]. */
  V76.ausnahmen = function (E, mo) {
    return Object.entries((E && E.kraftWochen) || {}).filter(([m]) => m >= mo).sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, x]) => ({ mo: m, aus: !!x.aus, tag: x.tag || null, uhrzeit: x.uhrzeit || null }));
  };
  /** Garmin-Aktivität «Krafttraining» an einem Tag (Garmin-Typ Krafttraining/Strength) – die längste, sonst null. */
  V76.KRAFT_TYP = /^(krafttraining|strength|strength_training|kraft)$/i;
  V76.istKraft = (a) => !!a && (a.sport === "kraft" || (a.sport === "andere" && (V76.KRAFT_TYP.test(String(a.typ || "").replace(/​/g, ""))
    || /^kraft\s*training$/i.test(String(a.name || "").replace(/​/g, "")))));
  V76.aktivitaet = function (acts, ds) {
    const L = (acts || []).filter((a) => a && a.date === ds && V76.istKraft(a));
    return L.sort((a, b) => (b.mv || b.dur || 0) - (a.mv || a.dur || 0))[0] || null;
  };
  /** sRPE nach Foster et al. (2001): RPE (CR-10, 1–10) × Minuten der Einheit; null ohne beides. */
  V76.srpe = (rpe, min) => (isNum(rpe) && rpe >= 1 && rpe <= 10 && isNum(min) && min > 0 ? Math.round(rpe * min) : null);
  return V76;
});
