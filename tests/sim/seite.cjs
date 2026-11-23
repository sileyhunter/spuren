/* V8.0 Szenario-Simulator: «Seite» ohne Browser. Baut den gemeinsamen Kontext C wie index.html (v5Start) und V5UI (Inbox, merged, befinden)
   nach und lädt die Module. Ein Tag wird mit seite.tag(iso) gesetzt; Änderungen an den Daten mit seite.neu() bekannt machen (Zwischenspeicher wie
   auf der Seite nach neuen Daten bzw. dem Ereignis «meinplan»). */
"use strict";
const { umgebung, MODULE } = require("./umgebung.cjs");

const isoLokal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pdLokal = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };

/** Seite mit den Daten D an «heute». → { win, C, U (V5UI), tag(iso), neu(), inbox, alle Module über win } */
function seite(D, heute) {
  const U0 = umgebung(), win = U0.win;
  { const d = pdLokal(heute); d.setHours(6, 30, 0, 0); U0.uhr.setzen(d.getTime()); }
  let pmcMemo = {}, testsMemo = null;
  const C = {
    D, IS_DEMO: false, iso: isoLokal, pd: pdLokal, today: pdLokal(heute),
    esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    fmt: (x, n) => (x == null ? "–" : Number(x).toFixed(n || 0)), dateCH: (s) => String(s), hmm: (s) => String(s), css: () => "", SPORTS: {},
    races: () => (C.D.config && C.D.config.races) || [],
    pmc(key) {
      key = key || "tss";
      if (pmcMemo[key]) return pmcMemo[key];
      if (!C.D.activities.length) return (pmcMemo[key] = []);
      const byDay = new Map(); C.D.activities.forEach((a) => { if (win.FK.zaehlt(a)) byDay.set(a.date, (byDay.get(a.date) || 0) + (a[key] || 0)); });
      return (pmcMemo[key] = win.FK.pmc(byDay, C.D.activities[0].date, isoLokal(C.today)));
    },
    pmcHeute: () => win.FK.pmcMorgen(C.pmc(), isoLokal(C.today)),
    tests() {
      if (testsMemo) return testsMemo;
      let vor = [];
      try {
        const h = isoLokal(C.today), rennen = win.V6.rennenPrio(C.races()), S = win.AN.saison(h, rennen);
        if (S) {
          const lac = C.D.lactate || [], stufen = (sp) => lac.filter((l) => l.kind === "stufentest" && (l.sport || "rad") === sp).map((l) => ({ date: l.date, ausbelastet: l.ausbelastet }));
          vor = win.V62.testplan({ heute: h, bis: S.haupt.date, wochen: S.wochen, rennen, fest: C.D.tests || [], planned: C.D.planned || [], sperren: [],
            erledigt: { css: (C.D.css_tests || []).filter((c) => !c.geschaetzt).map((c) => c.datum).filter(Boolean), rad: stufen("rad"), lauf: stufen("lauf"), check: lac.filter((l) => l.kind === "check").map((l) => l.date) } }).vorschlaege;
        }
      } catch (e) { vor = []; }
      return (testsMemo = win.V59L.testsMitStatus([...(C.D.tests || []), ...vor], C.D.lactate, C.D.css_tests || []).sort((a, b) => a.date.localeCompare(b.date)));
    },
  };
  const Inbox = {
    data: {},
    count() { return Object.values(this.data).reduce((s, L) => s + (Array.isArray(L) ? L.length : 0), 0); },
    upsert(list, item, idf) {
      idf = idf || ((e) => e.id);
      if (!Array.isArray(this.data[list])) this.data[list] = [];
      const L = this.data[list], i = L.findIndex((e) => idf(e) === idf(item));
      if (i >= 0) L[i] = item; else L.push(item);
      return Promise.resolve(true);
    },
  };
  const V5UI = {
    C, Inbox,
    merged(srvKey, locKey, idf) {
      idf = idf || ((e) => e.id);
      const m = new Map((C.D[srvKey] || []).map((e) => [idf(e), e]));
      for (const e of (Inbox.data && Inbox.data[locKey]) || []) m.set(idf(e), Object.assign({}, e, { _lokal: true }));
      return [...m.values()];
    },
    badge: () => "",
  };
  V5UI.befinden = () => V5UI.merged("befinden", "befinden", (e) => e.date);
  win.V5UI = V5UI;
  for (const m of MODULE) U0.laden(m);
  const S = {
    win, C, U: V5UI, inbox: Inbox,
    /** Datenstand geändert (neue Aktivitäten, Tageswerte, Einträge): Zwischenspeicher leeren wie auf der Seite. */
    neu() { pmcMemo = {}; testsMemo = null; C.D.updated = isoLokal(C.today) + "T" + String(Date.now() % 86400000).padStart(8, "0"); win.document.dispatchEvent(new win.CustomEvent("meinplan")); },
    /** Neuer Tag (Uhr des Simulators auf hh:mm Ortszeit dieses Tages). */
    tag(iso, hhmm) { C.today = pdLokal(iso); S.uhr(iso, hhmm || "06:30"); S.neu(); },
    uhr(iso, hhmm) { const [h, m] = String(hhmm || "12:00").split(":").map(Number); const d = pdLokal(iso); d.setHours(h, m, 0, 0); U0.uhr.setzen(d.getTime()); },
    heute: () => isoLokal(C.today),
    /** Woche, wie sie auf der Seite gilt (Mein Plan, Verteilung, Kraft, Ampel-Schicht) – V64UI.kontextFuer. */
    kontext: (mo) => win.V64UI.kontextFuer(mo),
    montag: (iso) => win.V64.montag(iso),
    /** Einheiten eines Tages, wie sie gelten (Ampel-Schicht eingerechnet). */
    tagPlan(iso) { const K = S.kontext(S.montag(iso)); const t = K && K.w ? (K.w.tage || []).find((x) => x.date === iso) : null; return { K, t, einheiten: (t && t.einheiten) || [] }; },
  };
  return S;
}

module.exports = { seite, isoLokal, pdLokal };
