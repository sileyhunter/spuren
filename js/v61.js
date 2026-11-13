/* V6.1 Daten (wellness-1.0, notizen-1.0, datenlage-1.0): Garmins Tageswerte (Readiness, Body Battery, Stress) für «Heute», Datenlage je Wert
   (seit wann, wie lückenlos) und Verpflegung aus der Garmin-Notiz als Vorschau. Rechenteile ohne DOM (auch unter Node testbar).
   Garmins Werte werden gezeigt, aber nicht in die Ampel eingerechnet; fehlende Werte bleiben fehlend. */
(function (root, factory) {
  const V61 = factory();
  if (typeof module === "object" && module.exports) module.exports = V61;
  if (root) root.V61 = V61;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const V61 = { VERSIONS: { wellness: "wellness-1.0", notizen: "notizen-1.0", datenlage: "datenlage-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  V61.addDays = addDays;

  /* ---------------- Garmin-Werte eines Tages ---------------- */
  /** Garmins Stufen der Readiness in eigenen Worten (Garmin liefert «POOR» … «PRIME»). */
  V61.READINESS_WORT = { POOR: "sehr tief", LOW: "tief", MODERATE: "mittel", HIGH: "hoch", PRIME: "sehr hoch" };
  /** Für «Heute»: Readiness und Body Battery vom Morgen dieses Tages, Stress vom abgeschlossenen Vortag; nichts aus anderen Tagen eingesetzt. */
  V61.garminTag = function (days, heute) {
    const by = new Map((days || []).map((d) => [d.date, d])), h = by.get(heute) || {}, g = by.get(addDays(heute, -1)) || {};
    const n = (v) => (isNum(v) ? v : null);
    return {
      datum: heute, readiness: n(h.readiness), level: h.readinessLevel || null, wort: V61.READINESS_WORT[h.readinessLevel] || null,
      bodyBattery: n(h.bodyBattery), bbSleep: n(h.bbSleep), sleepStress: n(h.sleepStress),
      stressGestern: n(g.stress), stressHighMinGestern: n(g.stressHighMin), bbHighGestern: n(g.bbHigh), bbLowGestern: n(g.bbLow),
    };
  };

  /* ---------------- Datenlage je Wert (datenlage-1.0) ---------------- */
  V61.WERTE = [
    { key: "hrv", label: "HRV (Nacht)" }, { key: "rhr", label: "Ruhepuls" }, { key: "sleepH", label: "Schlaf" },
    { key: "sleepStress", label: "Stress im Schlaf" }, { key: "readiness", label: "Garmin-Readiness" },
    { key: "bodyBattery", label: "Body Battery (Aufwachen)" }, { key: "stress", label: "Stress (Tag)" },
  ];
  /** Je Wert: erster Tag mit Wert («seit»), Tage mit Wert in den 30 bzw. 365 abgeschlossenen Tagen bis gestern. Befinden aus dem Check-in. */
  V61.datenlage = function (days, heute, befindenDaten) {
    const bis = addDays(heute, -1), von30 = addDays(bis, -29), von365 = addDays(bis, -364);
    const zeile = (label, daten) => {
      const s = [...daten].sort();
      return { label, seit: s[0] || null, n30: s.filter((d) => d >= von30 && d <= bis).length, n365: s.filter((d) => d >= von365 && d <= bis).length };
    };
    const out = V61.WERTE.map((w) => Object.assign({ key: w.key }, zeile(w.label, (days || []).filter((d) => isNum(d[w.key])).map((d) => d.date))));
    if (befindenDaten) out.push(Object.assign({ key: "befinden" }, zeile("Check-in", new Set(befindenDaten))));
    return out;
  };

  /* ---------------- Verpflegung aus der Garmin-Notiz (notizen-1.0) ---------------- */
  /** Vorschau → Fueling-Eintrag, so wie die Seite ihn speichert; übernommen ist er erst mit «Speichern» (Silas prüft vorher). */
  V61.fuelingAusVorschau = function (pv, actId) {
    const copy = (x) => JSON.parse(JSON.stringify(x || []));
    return { id: pv.id, v: "fueling-1.0", activity_id: actId || pv.activity_id, date: pv.date, sport: pv.sport, status: "protokolliert",
      quelle: "Garmin-Notiz der Aktivität (von dir geprüft)", regel: pv.regel || V61.VERSIONS.notizen, aus_vorschau: pv.id,
      events: copy(pv.events), vorher: copy(pv.vorher), gi: [], notiz: "" };
  };
  /** Offene Vorschauen: Status «vorschau» und zur Einheit noch kein Fueling-Eintrag (auch keiner nur auf dem Gerät).
   *  einheit(id) gibt die Aktivität zu einer ID oder gid zurück (gleiche Einheit = gleiches Objekt). */
  V61.offeneFueling = function (vorschauen, fueling, einheit) {
    const hat = new Set();
    for (const e of fueling || []) { const a = e.activity_id && einheit(e.activity_id); if (a) hat.add(a); if (e.id) hat.add(e.id); }
    return (vorschauen || []).filter((p) => p.status === "vorschau" && !hat.has(p.id) && !hat.has(einheit(p.activity_id) || p.activity_id));
  };
  return V61;
});
