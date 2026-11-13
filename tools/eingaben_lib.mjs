// Gemeinsame Zuordnung «Eingaben von der Seite» → Schlüssel für tools/merge_daily.py.
// Benutzt von tools/eingaben.mjs (Exportdatei aus dem Chat) und tools/eingang.mjs (V5.9.3, Dateien in eingang/).
// Die Listen heissen wie Inbox.data in js/v5-ui.js; die IDs wie in js/eingang.js (EG.LISTEN).

/** Kopie ohne lokale Kennzeichen («_lokal» u. ä.). */
export const clean = (l) => (l || []).map((e) => { if (!e || typeof e !== "object") return e; const c = { ...e }; for (const k of Object.keys(c)) if (k[0] === "_") delete c[k]; return c; });

/** Listen und ihre ID (gleiche ID → spätere Eingabe ersetzt die frühere). */
export const LISTEN = {
  fueling: (e) => e.id, befinden: (e) => e.date, test_entwuerfe: (e) => e.id, koppel: (e) => e.bike + "|" + e.run, langfahrt: (e) => e.id,
  coach: (e) => e.id, pb: (e) => e.id, css: (e) => e.id, fehler: (e) => e.id, rpe: (e) => e.id, intervalle: (e) => e.id,
  laktat_punkte: (e) => e.id, saison: (e) => e.id, trainingsrouten: (e) => e.id, routen: (e) => e.id,
  zonen: (e) => e.id,                                                                   // V6.2.2: auf der Seite bestätigte Zonenprofile
};

/** Entschlüsselte Eingaben (Struktur wie Inbox.data) → Eingabe für merge_daily.py. */
export function fuerMerge(d, quelle) {
  const out = {
    fueling_add: clean(d.fueling), befinden_add: clean(d.befinden), test_entwurf_add: clean(d.test_entwuerfe), koppel_set: clean(d.koppel),
    langfahrt_add: clean(d.langfahrt), laktat_bestaetigt: d.laktat_bestaetigt || [], coach_add: clean(d.coach), test_archiv: d.archiv || [],
    notizen_set: d.notizen || {}, quelle_eingaben: quelle,
    pb_add: clean(d.pb), css_add: clean(d.css), fehler_add: clean(d.fehler),
    rpe_add: clean(d.rpe), intervall_add: clean(d.intervalle), laktat_punkte_add: clean(d.laktat_punkte), saison_add: clean(d.saison),
    trainingsrouten_add: clean(d.trainingsrouten),
    routen_add: clean(d.routen), routen_entfernt: d.routen_entfernt || [], laktat_punkte_bestaetigt: d.laktat_punkte_bestaetigt || [],   // V5.9.3
    zonen_add: clean(d.zonen),                                                          // V6.2.2 zonenvorschlag-1.0 (merge_daily prüft Freigabe und Test)
  };
  if (d.fueling_produkte) out.fueling_produkte = d.fueling_produkte;
  if (Array.isArray(d.startorte)) out.startorte = clean(d.startorte);     // V5.7: ganze Liste (Startorte bleiben verschlüsselt in data.enc.json)
  if (d.garmin_verlauf && typeof d.garmin_verlauf === "object") out.garmin_verlauf = d.garmin_verlauf;   // V6.2.3: Garmin-Datenexport (merge_daily prüft)
  return out;
}

/** Mehrere Eingaben der Reihe nach zusammenführen (ältere zuerst): gleiche ID → spätere gewinnt; Mengen vereinigt;
 *  eine gelöschte Route verdrängt eine frühere Fassung derselben Route und umgekehrt. */
export function zusammen(liste) {
  const L = {}, mengen = { archiv: new Set(), laktat_bestaetigt: new Set(), laktat_punkte_bestaetigt: new Set() }, weg = new Set();
  const out = { notizen: {} };
  for (const d of liste) {
    for (const [k, idf] of Object.entries(LISTEN)) for (const e of d[k] || []) {
      const m = (L[k] = L[k] || new Map());
      m.set(idf(e), e);
      if (k === "routen") weg.delete(e.id);
    }
    for (const id of d.routen_entfernt || []) { weg.add(id); if (L.routen) L.routen.delete(id); }
    for (const k of Object.keys(mengen)) for (const x of d[k] || []) mengen[k].add(x);
    Object.assign(out.notizen, d.notizen || {});
    if (d.fueling_produkte) out.fueling_produkte = d.fueling_produkte;
    if (Array.isArray(d.startorte)) out.startorte = d.startorte;
    if (d.garmin_verlauf && typeof d.garmin_verlauf === "object") out.garmin_verlauf = d.garmin_verlauf;   // V6.2.3: der spätere gewinnt
  }
  for (const [k, m] of Object.entries(L)) out[k] = [...m.values()];
  for (const [k, s] of Object.entries(mengen)) out[k] = [...s];
  out.routen_entfernt = [...weg];
  return out;
}
