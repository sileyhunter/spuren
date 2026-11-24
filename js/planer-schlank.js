/* Ironman Notebook – V9.15.0 planer-schlank-1.0 (Outdoor O2, übernimmt Routen 7.3 «Planer übersichtlicher»).
 * Der Planer öffnet schlank: Sportleiste (Skitour · Wandern · Laufen ▾ · Rad ▾), Tippen setzt Punkte, unten eine Leiste mit km · ↑ · ↓ · Zeit und
 * ↶ · Details ▾ · ⋯ · Fertig. Alles Bisherige steht unverändert unter «Details»; «⋯» enthält Punkt, Umkehren, Rundtour, Training → Route,
 * Rückgängig, Alle Punkte löschen, Neu. Die Zustimmung zu BRouter, swisstopo und Open-Meteo wird einmal gebündelt gefragt.
 * Dieser Teil ist rein (läuft auch in Node, tests/test_v9150.cjs): Sportgruppen, zuletzt benutzte Sportart, Zustimmungs-Bündel, Magnet, Leiste, Name.
 * Die Verdrahtung steht in js/routen-ui.js, die Oberfläche prüft tools/durchklick_planer.py. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const PS = { VERSION: "planer-schlank-1.0", VERSIONEN: { planer: "planer-schlank-1.0", sportleiste: "sportleiste-1.0", zustimmung: "zustimmung-buendel-1.0", magnet: "magnet-1.0", leiste: "planer-leiste-1.0", fertig: "fertig-1.0" } };
  const isNum = (v) => typeof v === "number" && isFinite(v);

  /* Sportleiste: vier Knöpfe, Laufen und Rad klappen auf */
  PS.GRUPPEN = [
    { id: "skitour", label: "Skitour", sportarten: ["skitour"], standard: "skitour" },
    { id: "wandern", label: "Wandern", sportarten: ["wandern"], standard: "wandern" },
    { id: "laufen", label: "Laufen", sportarten: ["laufen", "trail"], standard: "laufen" },
    { id: "rad", label: "Rad", sportarten: ["rennrad", "gravel", "mtb"], standard: "rennrad" },
  ];
  PS.gruppe = (id) => PS.GRUPPEN.find((g) => g.id === id) || null;
  PS.gruppeVon = (sport) => PS.GRUPPEN.find((g) => g.sportarten.includes(sport)) || null;
  PS.klappt = (g) => !!g && g.sportarten.length > 1;
  PS.alleSportarten = () => PS.GRUPPEN.reduce((a, g) => a.concat(g.sportarten), []);
  /** Zuletzt benutzte Sportart; beim ersten Mal Skitour (nicht mehr Rennrad). `gueltig` = Liste der Sportarten, die RT.SPORTS kennt. */
  PS.startSport = function (gemerkt, gueltig) {
    const ok = (s) => typeof s === "string" && PS.alleSportarten().includes(s) && (!gueltig || gueltig.includes(s));
    return ok(gemerkt) ? gemerkt : "skitour";
  };
  /** Welche Sportart gilt nach einem Tipp auf den Gruppenknopf `gid`? Ist die aktuelle schon in der Gruppe, bleibt sie; sonst die gemerkte der Gruppe, sonst der Standard. */
  PS.nachGruppenTipp = function (gid, aktuell, gemerktJeGruppe) {
    const g = PS.gruppe(gid); if (!g) return aktuell;
    if (g.sportarten.includes(aktuell)) return aktuell;
    const m = gemerktJeGruppe && gemerktJeGruppe[gid];
    return g.sportarten.includes(m) ? m : g.standard;
  };
  PS.unterzeile = (sport) => { const g = PS.gruppeVon(sport); return PS.klappt(g) ? g.id : null; };

  /* Zustimmung: einmal gebündelt (BRouter = Wegnetz, swisstopo = Skitourenrouten, Open-Meteo = Wetter) */
  PS.DIENSTE = ["routing", "skirouten", "wetter"];
  PS.SATZ = "Zum Planen gehen Koordinaten an BRouter, swisstopo und Open-Meteo.";
  /** «Nur von Hand» ist gewählt: einmal entschieden und seither kein Dienst erlaubt. Das ist der einzige bleibende Zustand des Magneten. */
  PS.istNurHand = (consent) => { const c = consent || {}; return !!c.buendel_am && !PS.DIENSTE.some((k) => c[k]); };
  /** Muss das Bündel noch gefragt werden? Nein, sobald Silas etwas entschieden hat (auch früher einzeln erteilt) oder «Nur von Hand» gewählt ist. */
  PS.buendelOffen = (consent) => { const c = consent || {}; return !c.buendel_am && !PS.DIENSTE.some((k) => c[k]); };
  PS.erlauben = (consent, jetzt) => {
    const c = Object.assign({}, consent || {}), t = jetzt || new Date().toISOString();
    for (const k of PS.DIENSTE) { c[k] = true; c[k + "_am"] = t; }
    c.buendel_am = t;
    return c;
  };
  /** «Nur von Hand»: alle drei Dienste aus (Widerruf), Magnet aus. */
  PS.nurVonHand = (consent, jetzt) => {
    const c = Object.assign({}, consent || {});
    for (const k of PS.DIENSTE) c[k] = false;
    c.buendel_am = jetzt || new Date().toISOString();
    return c;
  };
  PS.einzeln = (consent, dienst, an, jetzt) => {
    if (!PS.DIENSTE.includes(dienst)) return Object.assign({}, consent || {});
    const c = Object.assign({}, consent || {});
    c[dienst] = !!an; if (an) c[dienst + "_am"] = jetzt || new Date().toISOString();
    return c;
  };
  PS.DIENST_TEXT = {
    routing: { name: "Wegnetz (BRouter)", wohin: "brouter.de", was: "gesetzte Punkte (nur Koordinaten)" },
    skirouten: { name: "Skitourenrouten (swisstopo)", wohin: "api3.geo.admin.ch", was: "ein Rechteck um deine Punkte (Schweizer Koordinaten)" },
    wetter: { name: "Wetter (Open-Meteo)", wohin: "open-meteo.com", was: "Stützpunkte der Route und die geplanten Zeiten" },
  };
  PS.anzahlErlaubt = (consent) => PS.DIENSTE.filter((k) => consent && consent[k]).length;

  /* Magnet: an = Linie rastet auf Wege bzw. Skitourenrouten ein (mit Zustimmung); aus = gerade Linie von Hand (hand-1.0, gekennzeichnet).
     Gilt je Sitzung; bleibend ist nur «Nur von Hand». Beim Start: an, ausser «Nur von Hand» ist gewählt. */
  PS.magnetStart = (nurHand) => !nurHand;
  /** Braucht der Magnet für diese Sportart eine Zustimmung, die fehlt? (Skitour: Skitourenrouten; sonst Wegnetz) */
  PS.magnetBrauchtZustimmung = (sport, consent) => { const c = consent || {}; return sport === "skitour" ? !c.skirouten : !c.routing; };

  /* Untere Leiste: km · ↑ · ↓ · Zeit */
  const dez = (n, d) => Number(n).toLocaleString("de-CH", { minimumFractionDigits: d, maximumFractionDigits: d });
  PS.zeit = (s) => { if (!isNum(s) || s < 0) return null; const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60); return m === 60 ? `${h + 1}:00` : `${h}:${String(m).padStart(2, "0")}`; };
  PS.leiste = function (r) {
    if (!r || !isNum(r.laenge_m)) return null;
    const km = r.laenge_m / 1000;
    return { km: dez(km, km < 10 ? 2 : 1), auf: isNum(r.auf_m) ? dez(Math.round(r.auf_m), 0) : "–", ab: isNum(r.ab_m) ? dez(Math.round(r.ab_m), 0) : "–", zeit: PS.zeit(r.zeit_s) || "–" };
  };
  PS.leisteText = (l) => (l ? `${l.km} km · ↑ ${l.auf} m · ↓ ${l.ab} m · ${l.zeit} h` : "");

  /* Fertig: speichert sofort unter «Sportart Datum» (kein Namensdialog); ein eigener Name bleibt */
  PS.name = (eingabe, sportLabel, datumCH) => { const n = String(eingabe || "").trim(); return n || `${sportLabel} ${datumCH}`; };
  /** Was zeigt der Planer nach «Fertig»? */
  PS.fertigText = (name, route, fehler) => (route ? `«${name}» ist unter «Meine Routen» gespeichert (mit Linie, auch offline).` : `«${name}» als Entwurf gespeichert (nur Wegpunkte, ${fehler ? "Routing fehlgeschlagen" : "noch nicht geroutet"}).`);

  /* ⋯-Menü: feste Reihenfolge der Einträge (die Knöpfe behalten ihre Kennungen) */
  PS.MENUE = [
    { id: "rp-add", text: "Punkte setzen" }, { id: "rp-rev", text: "Route umkehren" }, { id: "rp-loop", text: "Hin und zurück" },
    { id: "rp-tr", text: "Training → Route" }, { id: "rp-undo", text: "Rückgängig" }, { id: "rp-clear", text: "Alle Punkte löschen" }, { id: "rp-new", text: "Neu" },
  ];

  /* Höhe: Ohne «Details» passt sich der Planer dem Inhalt an, mit «Details» gelten die drei Blatthöhen wie bisher */
  PS.SHEET_KOMPAKT = "kompakt";
  return PS;
});
