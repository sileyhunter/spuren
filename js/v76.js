/* Ironman Notebook V7.6 – Etappe 7 «Krafttraining als feste Zusatzeinheit» (Auftrag V7.3 «wie enduco», Wunsch vom 16.11.2026), Rechenlogik ohne DOM.
   kraft-plan-1.0:
   - Termin je Woche aus den Planeinstellungen (pe-kraft: an/aus, Wochentag, Uhrzeit, Dauer – Standard 1:30 h –, Notiz für die Übungen). Er gilt ab der Woche
     nach dem Speichern wie Start und Basis-Fitness (V75.einstellungen opt.startBis); die laufende Woche bleibt, wie sie ist.
   - Ausnahme für eine kommende Woche (pe-kraft-<Montag>): auslassen oder ein anderer Tag derselben Woche (mit Uhrzeit). In der laufenden Woche und an
     gespeicherten Tagen geht das über Mein Plan (Datum ändern, Löschen) wie bei jeder Einheit.
   - Als feste Einheit «Krafttraining» im Wochenvorschlag: zählt nicht zu den Wochenstunden Schwimmen, Rad, Laufen und nicht in TL ≈ und Form, belegt aber
     ihre Zeit am Tag – beim Verteilen nach der Verfügbarkeit bleibt sie wie ein Test an ihrem Tag (V66.verteilen). Nach Garmin geht sie nicht.
   - sRPE = RPE × Minuten (Foster et al. 2001) als eigene Zahl, nicht in der Trainingslast.
   Die Abstimmung der Woche (Tag danach, Krafttag, Tests, Taper, Rennwochen, Erholungswoche) ging am 17.11.2026 als Vorschlag an Silas und wird erst
   nach seinem Okay gebaut (Auftrag: «zuerst als kurzer Vorschlag, dann bauen»). */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const V76 = factory(node ? require("./v64.js") : root && root.V64, node ? require("./v66.js") : root && root.V66);
  if (node) module.exports = V76;
  if (root) root.V76 = V76;
})(typeof window !== "undefined" ? window : null, function (V64, V66) {
  "use strict";
  const V76 = { VERSIONS: { kraft: "kraft-plan-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const add = (iso, n) => V64.addDays(iso, n);
  V76.TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  V76.TAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  /** «1:30 h» bzw. «45 min» */
  V76.dauerText = (min) => (min >= 60 ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h` : `${min} min`);

  /** Termin der Woche mit Montag mo aus den Einstellungen E (V75.einstellungen). null = kein Krafttraining eingestellt; sonst
   *  { date, regel (Tag laut Wochentag), uhrzeit, dauer, notiz, verschoben, aus } */
  V76.termin = function (E, mo) {
    const K = E && E.kraft;
    if (!K || !K.aktiv || !K.wt || !mo) return null;
    const regel = add(mo, K.wt - 1), x = (E.kraftWochen || {})[mo] || null;
    const date = x && x.tag ? x.tag : regel;
    return { date, regel, uhrzeit: (x && x.uhrzeit) || K.uhrzeit || null, dauer: isNum(K.dauer) ? K.dauer : 90, notiz: K.notiz || null,
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
    return Object.assign(e, { kraft_plan: true, notiz: t.notiz || null, spec, wissen: "kraft",
      zweck: "Dein fester Termin für Krafttraining aus den Planeinstellungen. Die Übungen planst du selbst; die Seite zählt die Einheit nicht in Stunden, TL ≈ und Form." });
  };
  /** Woche w (V64.woche) mit dem Krafttraining der Woche: am Tag des Termins als zusätzliche Einheit (nach den Einheiten des Tages).
   *  Ohne Termin w selbst; ausgelassen: w mit Hinweis. → neue Woche mit w.kraft = { status «geplant»|«aus», …Termin } */
  V76.einplanen = function (w, E) {
    if (!w || !Array.isArray(w.tage) || !w.tage.length) return w;
    const mo = w.woche || w.tage[0].date, t = V76.termin(E, mo);
    if (!t) return w;
    if (t.aus) return Object.assign({}, w, { kraft: Object.assign({ status: "aus" }, t), hinweise: (w.hinweise || []).concat(["Krafttraining in dieser Woche ausgelassen (Planeinstellungen)"]) });
    const i = w.tage.findIndex((x) => x.date === t.date), e = i >= 0 ? V76.einheit(t) : null;
    if (!e) return w;
    const tage = w.tage.map((x, j) => (j === i ? Object.assign({}, x, { einheiten: (x.einheiten || []).concat([e]), ruhetag: false }) : x));
    return Object.assign({}, w, { tage, kraft: Object.assign({ status: "geplant" }, t) });
  };
  /** Kurztext eines Termins: «Mittwoch 18:00 · 1:30 h» (K = E.kraft). */
  V76.text = function (K) {
    if (!K || !K.aktiv || !K.wt) return "nicht eingeplant";
    return `${V76.TAGE[K.wt - 1]}${K.uhrzeit ? " " + K.uhrzeit : ""} · ${V76.dauerText(isNum(K.dauer) ? K.dauer : 90)}`;
  };
  /** Kommende Ausnahmen ab Montag mo (inklusive), sortiert: [{ mo, aus, tag, uhrzeit }]. */
  V76.ausnahmen = function (E, mo) {
    return Object.entries((E && E.kraftWochen) || {}).filter(([m]) => m >= mo).sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, x]) => ({ mo: m, aus: !!x.aus, tag: x.tag || null, uhrzeit: x.uhrzeit || null }));
  };
  /** Garmin-Aktivität «Krafttraining» an einem Tag (Garmin-Typ Krafttraining/Strength) – die längste, sonst null. */
  V76.KRAFT_TYP = /^(krafttraining|strength|strength_training|kraft)$/i;
  V76.aktivitaet = function (acts, ds) {
    const L = (acts || []).filter((a) => a && a.date === ds && (a.sport === "kraft" || V76.KRAFT_TYP.test(String(a.typ || "").replace(/​/g, ""))
      || /^kraft\s*training$/i.test(String(a.name || "").replace(/​/g, ""))));
    return L.sort((a, b) => (b.mv || b.dur || 0) - (a.mv || a.dur || 0))[0] || null;
  };
  /** sRPE nach Foster et al. (2001): RPE (CR-10, 1–10) × Minuten der Einheit; null ohne beides. */
  V76.srpe = (rpe, min) => (isNum(rpe) && rpe >= 1 && rpe <= 10 && isNum(min) && min > 0 ? Math.round(rpe * min) : null);
  return V76;
});
