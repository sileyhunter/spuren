/* Ironman Notebook – V9.14.0 gpx-export-2.0 (Routen 7.2): Strecke an Garmin senden.
 * Die Seite kann nicht selbst mit Garmin sprechen. Wie bei den Workouts legt sie nur einen verschlüsselten Auftrag an (Eingabe strecke_senden →
 * strecken_auftraege); das Nacht-Update oder der Chat lädt die Strecke mit upload_course in Garmin Connect hoch, liest sie zurück und trägt
 * das Ergebnis ein (tools/strecken_senden.py). Aufs Gerät geschickt wird nie: das tippt Silas in Garmin Connect selbst («An Gerät senden»).
 * Ein Auftrag entsteht nur mit ausdrücklichem Ja (Knopf mit Bestätigung, `ja_am`), nie automatisch und nie über «Alle Tage senden».
 * Dieser Teil ist rein (läuft auch in Node, tests/test_v9140.cjs): GPX prüfen, Typ, Name, Beschreibung, Auftrag, Stand. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SG = { VERSION: "gpx-export-2.0", FORMAT: "strecke-senden-1.0", MAX_NAME: 128, MAX_BESCHR: 512, MAX_BYTES: 2 * 1024 * 1024, MIN_PUNKTE: 2, MAX_PUNKTE: 25000,
    HOEHEN_MIN: 0.9 };
  /** Streckentypen von Garmin Connect (upload_course) und ihr Text. */
  SG.TYP_TEXT = { road_biking: "Rennrad", gravel_cycling: "Gravel", mountain_biking: "MTB", cycling: "Rad", running: "Laufen", trail_running: "Trail", hiking: "Wandern", walking: "Gehen" };
  SG.TYPEN = Object.keys(SG.TYP_TEXT);
  const TYP = { rennrad: "road_biking", gravel: "gravel_cycling", mtb: "mountain_biking", laufen: "running", trail: "trail_running", wandern: "hiking", skitour: "hiking" };
  /** Sportart des Planers → Streckentyp (null = unbekannt, dann wird nicht gesendet). */
  SG.typFuer = (sport) => TYP[sport] || null;

  const num = (x) => typeof x === "number" && isFinite(x);
  const rad = (g) => (g * Math.PI) / 180;
  const hav = (a, b) => { const R = 6371000, dl = rad(b[0] - a[0]), dn = rad(b[1] - a[1]), x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); };
  const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(".", ",");

  /** Name für Garmin Connect: Leerraum bereinigt, höchstens 128 Zeichen, ohne Steuerzeichen. */
  SG.name = (s) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, SG.MAX_NAME);

  /** Beschreibung in Garmin Connect (höchstens 512 Zeichen). Nichts Persönliches: nur Sportart, Länge, Höhenmeter und die Herkunft. */
  SG.beschreibung = function (o) {
    o = o || {};
    const teile = ["Ironman Notebook", SG.TYP_TEXT[o.typ] || "Strecke"];
    if (num(o.km)) teile.push(fmt1(o.km) + " km");
    if (num(o.hm)) teile.push(Math.round(o.hm) + " Hm");
    let t = teile.join(" · ");
    if (num(o.handKm) && o.handKm > 0.05) t += ` · davon ${fmt1(o.handKm)} km von Hand gezeichnet (kein Wegnetz)`;
    return t.slice(0, SG.MAX_BESCHR);
  };

  /** GPX-Text prüfen, bevor er gesendet wird: ein Track mit mindestens zwei Punkten, gültige Koordinaten, Höhen, keine Entitäten.
   *  → { ok, grund, punkte, km, hoehen (Anteil mit Höhe), bytes }. Schlägt eine Prüfung an, wird nicht gesendet und der Grund gezeigt. */
  SG.pruefenGpx = function (text) {
    const r = { ok: false, grund: null, punkte: 0, km: 0, hoehen: 0, bytes: 0 };
    if (typeof text !== "string" || !text.trim()) { r.grund = "Die GPX-Datei ist leer."; return r; }
    r.bytes = text.length;
    if (text.length > SG.MAX_BYTES) { r.grund = "Die GPX-Datei ist zu gross (über 2 MB)."; return r; }
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) { r.grund = "Die GPX-Datei enthält unerlaubte Teile (DOCTYPE oder ENTITY)."; return r; }
    if (!/<gpx[\s>]/.test(text)) { r.grund = "Das ist keine GPX-Datei."; return r; }
    const md = /<metadata>([\s\S]*?)<\/metadata>/.exec(text);
    if (!md || !/<name>[^<]+<\/name>/.test(md[1])) { r.grund = "Der GPX-Datei fehlt der Name."; return r; }
    const re = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
    let m, vor = null, mitHoehe = 0, ungueltig = 0;
    while ((m = re.exec(text))) {
      const la = /\blat="(-?\d+(?:\.\d+)?)"/.exec(m[1]), lo = /\blon="(-?\d+(?:\.\d+)?)"/.exec(m[1]);
      const lat = la ? +la[1] : NaN, lon = lo ? +lo[1] : NaN;
      if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) { ungueltig++; continue; }
      if (/<ele>-?\d+(?:\.\d+)?<\/ele>/.test(m[2])) mitHoehe++;
      const p = [lat, lon];
      if (vor) r.km += hav(vor, p) / 1000;
      vor = p; r.punkte++;
      if (r.punkte > SG.MAX_PUNKTE) { r.grund = `Die Strecke hat zu viele Punkte (über ${SG.MAX_PUNKTE}).`; return r; }
    }
    if (ungueltig) { r.grund = "Die GPX-Datei enthält ungültige Koordinaten."; return r; }
    if (r.punkte < SG.MIN_PUNKTE) { r.grund = "Die GPX-Datei hat keinen Track mit mindestens zwei Punkten."; return r; }
    r.hoehen = mitHoehe / r.punkte;
    if (r.hoehen < SG.HOEHEN_MIN) { r.grund = "Der Strecke fehlen die Höhen (weniger als 90 % der Punkte haben eine)."; return r; }
    r.km = +r.km.toFixed(3);
    r.ok = true;
    return r;
  };

  /** SHA-256 des GPX-Textes (hex). Erkennt «gleiche Fassung» und Fehler beim Übertragen. */
  SG.pruefsumme = async function (text) {
    let sub = null;
    if (typeof crypto !== "undefined" && crypto.subtle) sub = crypto.subtle;
    else if (typeof require === "function") { try { sub = require("node:crypto").webcrypto.subtle; } catch (e) { /* ohne */ } }
    if (!sub) throw new Error("Keine Prüfsumme möglich.");
    const buf = await sub.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  /** Auftrag für eine gespeicherte Route. o: { routeId, name, sport, gpx, hm, handKm, jetzt (ISO) } → Auftrag oder { fehler }.
   *  `ja_am` ist der Zeitpunkt des ausdrücklichen Ja (Knopf «Ja, senden»). */
  SG.auftrag = async function (o) {
    o = o || {};
    const typ = SG.typFuer(o.sport);
    if (!typ) return { fehler: "Für diese Sportart gibt es keinen Streckentyp in Garmin Connect." };
    if (!o.routeId) return { fehler: "Die Route ist noch nicht gespeichert." };
    const name = SG.name(o.name);
    if (!name) return { fehler: "Die Strecke braucht einen Namen." };
    const g = SG.pruefenGpx(o.gpx);
    if (!g.ok) return { fehler: g.grund };
    const jetzt = o.jetzt || new Date().toISOString();
    return { id: "sg-" + String(o.routeId).replace(/[^\w.-]+/g, "").slice(0, 60), v: SG.FORMAT, route_id: String(o.routeId), name, sport: o.sport, typ,
      beschreibung: SG.beschreibung({ typ, km: g.km, hm: o.hm, handKm: o.handKm }), km: g.km, hm: num(o.hm) ? Math.round(o.hm) : null, punkte: g.punkte,
      pruefsumme: await SG.pruefsumme(o.gpx), bytes: g.bytes, gpx: o.gpx, erstellt: jetzt, ja_am: jetzt };
  };

  /** Stand einer Strecke aus den Daten und den lokalen Eingaben. D = Daten der Seite, lokal = Inbox.data.strecke_senden, id = Auftrags-ID.
   *  → { status: null | "offen" | "gesendet" | "fehler" | "abgelehnt", text, garmin_id, zeit }. */
  SG.stand = function (D, lokal, id, pruefsumme) {
    D = D || {};
    const a = (D.strecken_auftraege || []).find((x) => x && x.id === id), l = (lokal || []).find((x) => x && x.id === id);
    const ab = (D.strecken_abgelehnt || []).filter((x) => x && x.id === id).pop();
    const neuer = (x, y) => String((x && x.erstellt) || "") > String((y && y.erstellt) || "");
    if (l && (!a || neuer(l, a))) return { status: "offen", text: "Auftrag liegt bereit (noch nicht im Update angekommen).", gleich: !!pruefsumme && l.pruefsumme === pruefsumme };
    if (ab && (!a || String(ab.erstellt || "") >= String(a.erstellt || ""))) return { status: "abgelehnt", text: "Nicht übernommen: " + (ab.grund || "unbekannter Grund") };
    if (!a) return { status: null, text: "" };
    const gleich = !!pruefsumme && a.pruefsumme === pruefsumme;
    if (a.status === "gesendet") return { status: "gesendet", text: "In Garmin Connect" + (a.gesendet_am ? " seit " + datum(a.gesendet_am) : "") + (gleich ? "" : " (ältere Fassung)"), garmin_id: a.garmin_id, zeit: a.gesendet_am, gleich };
    if (a.status === "fehler") return { status: "fehler", text: "Fehlgeschlagen: " + ((a.fehler && a.fehler[0]) || a.fehler || "unbekannter Grund") + " – das Nacht-Update versucht es nicht noch einmal – sag mir Bescheid.", gleich };
    return { status: "offen", text: "Auftrag liegt bereit: das Nacht-Update legt die Strecke in Garmin Connect an.", gleich };
  };
  const datum = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("de-CH", { day: "numeric", month: "numeric", year: "numeric" }); };

  return SG;
});
