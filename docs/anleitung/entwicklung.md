## Meine Entwicklung und Regeln V5.5
- **Vergleichbare Läufe `laufvergleich-1.0` (V7.1, Silas' Wunsch 16.11.2026):** Puls und Pace verschiedener Läufe nur aus Läufen, die `FK.laufVergleichbar`
  zulässt (draussen, ab 20 min und 3 km, ≤ 10 Hm/km, keine Intervalle/Tempo laut Titel oder Workout, 2. Hälfte ≤ 8 % anders, TL ≤ 95 je Stunde, < 25 °C,
  kein Trail/Laufband/Koppellauf); Gründe immer sichtbar. Gilt auch für Lauf-Vergleiche im Chat und in den Aufträgen. Effektive Zeit = Bewegungszeit
  (`zeit-1.1`: auch Navigieren, Tracker, Jagen u. a. draussen mit GPS; nicht im Wasser).
- **Kranke oder untypische Einheiten `analyse-gesund-1.0` (V9.3.1, Silas' Wunsch 22.11.2026):** Pace/Puls-Auswertungen lassen Einheiten weg, die nicht repräsentativ sind –
  Check-in «krank» (Krankheitszeichen) samt den 3 Tagen danach, Ruhepuls am Morgen ≥ 7 Schläge über dem Median der 28 Tage davor (≥ 10 Morgenwerte), in der Lauf-Effizienz
  dazu Meter je Herzschlag > 10 % unter/über dem Median der vergleichbaren Läufe der 8 Wochen davor (≥ 4). Grund immer sichtbar (laufvergleich-1.1, laufeffizienz-1.2,
  entwicklung-1.1 «krank»). `FK.gesundheit(D)`, `FK.nichtRepraesentativ`, `FK.gesundheitSetzen(D)` (beim Laden der Seite), `FK.nichtRepraesentativGrund(a)`. Zahlen = eigene Festlegungen
  (`FK.GESUND`); ändern = Version erhöhen, `tests/test_formkurve.cjs` nachführen.
- Vergleiche nur aus `eb`-Blöcken (Rad 190–210 W je System Rolle/Rennrad/MTB, Laufen 5:20–5:40/km flach), Urteil `entwicklung-1.0`
  (mind. 3 je Zeitraum, Bootstrap-Intervall, Guards Hitze/Höhe/Drift/Ausreisser). Laktat zählt erst bestätigt (B1), CSS nur aus Tests.
- Form `pmc-2.1` (Fitness − Ermüdung desselben Tages; 2.1 = ohne Krafttraining, Silas' Wunsch vom 17.11.2026; «Heute» zeigt seit status-1.1 die Form zu Tagesbeginn), Zonen `zonenverteilung-2.0` (je Sportart, Zonen je Datum, Garmin-Zonen nicht beurteilt).
- Routenplaner: Varianten (seit V5.6 `varianten-2.0`) nur über das erlaubte Rennradprofil, nie ein unzulässiger Weg;
  `zeit-rt-1.2`/`wetter-rt-1.2` (Pausen je Zwischenziel; fehlende Wetterwerte bleiben unbekannt, nie 0 – Fahrzeit dann mit
  «Wind nicht berücksichtigt» und ±2 m/s im Band); Fehlerband aus `kalibrierung-1.1` (Population, Steigungsklasse).
- Regel ändern = Version erhöhen, Test ergänzen, `CHANGELOG.md` nachführen. Offene Punkte nur in `docs/offen-nach-v55.md`.

## V5.6: Explorer, Geplant vs. Ist, Saison, RPE, Ermüdung, Energie
- Reihen `serie-1.0`: 2-s-Mittel aus FIT, Lücken > 30 s trennen Abschnitte, fehlende Werte bleiben `null`. Explorer-Kennzahlen `explorer-1.0`
  (NP aus 30-s-Mitteln; HF-Drift nur bei gleichmässiger Belastung: VI ≤ 1,10 bzw. Tempo-CV ≤ 0,15), Intervalle `intervalle-1.0`.
- Geplant vs. Ist `plan-1.0`: nur das Workout, das auf der Uhr lief (FIT `workout`/`workout_step`, Runden mit `wkt_step_index`) und der
  Garmin-Kalender. **Keine direkte Enduco-Schnittstelle behaupten**; Enduco-Workouts nie ändern. Leistungsziele ≤ 1000 je Workout als
  Watt oder % FTP nach der gefahrenen Leistung gelesen und offen ausgewiesen. Plandauer nur, wenn jeder Schritt eine Zeit hat (sonst «offen»).
- Saison `saison-1.2` (Phasen wie 1.0, Rhythmus seit 1.2 fest): Phasen rückwärts ab Hamburg (A), Jesolo als B-Rennen; Stunden nur als Vorschlag aus den eigenen Wochen, nie als
  Vorgabe und nie nach Garmin/Enduco geschrieben.
- Ermüdung `ermuedung-1.0`: Puls früh gegen spät bei gleicher Leistung bzw. Pace in derselben Einheit; beste 20 min ab Stunde 2–5.
  «Meine Entwicklung» urteilt darüber nur mit `entwicklung-1.0` (mind. 3 je Zeitraum, Intervall).
- Lange Ausfahrt `langfahrt-2.0`: Sollband für Grundlage/Long Ride aus dem aktiven Zonenprofil (Z2 Watt nach Dauer: 1 h oberstes Viertel,
  ab 5 h unterstes Viertel, linear dazwischen; Puls Ende Z2 als Obergrenze); das beobachtete Band (Fahrten ähnlicher Dauer) steht daneben,
  Renn-Pacing bleibt beobachtet. Nie eigene Zonenwerte in öffentliche Tests oder Doku schreiben.
- RPE `rpe-1.0`: CR-10 nach Foster (modifizierte Borg-Skala), sRPE = RPE × Bewegungsminuten; Kalibrierung mit Morgenwerten erst ab 20 Paaren, nur Rangkorrelation, keine Prozentwerte.
- Energie `energie-1.0`: aufgenommen nur aus dem Fueling-Protokoll; Verbrauch Rad aus kJ mit Wirkungsgrad 22–25 % (Annahme); KH-Anteil
  je Garmin-Pulszone ist ein Modell; Richtwert Jeukendrup 2014. Nie Gelmengen oder Stoffwechselwerte erfinden.

## V5.7: Smart Training Routes (Trainingskalender und Routenplaner, kein eigener Tab)
- Workout `workout-1.1` (V6.0.1): feste Pause (`fixed.rest`) = Zeit; Schwimmstrecken aus der Pace der Beschreibung geschätzt («≈»), lockere Strecken
  ohne Pace mit der langsamsten Pace des Workouts, harte ohne Pace bleiben offen (Intensitätswörter `TR.SCHWIMM_WORT`, auch für `V6.schwimmZone`); Dauer aus den
  Schritten nur, wenn jeder Schritt eine Zeit oder Schätzung hat, sonst laut Kalender.
- Workout `workout-1.0`: Schritte aus der Garmin-Verbindung (Enduco schreibt Watt, Tempo in m/s oder Puls), Wiederholungen aufgefaltet;
  intensiv = Mitte des Zielbereichs ab Z3 des aktiven Zonenprofils; Leistung ≤ 150 überall → «Watt oder % FTP?» offen, nie geraten.
  Dauertraining (Grundlage, Sprints < 10 %, Trail, Wandern) Ziel ±5 %, sonst ±10 %. **Keine direkte Enduco-Schnittstelle**, Workouts nie ändern.
- Vorschläge `trainingsroute-1.1` (1.1 V6.6: Rennrad-Kandidaten mit mehr als 20 m Gravel, auch «möglicherweise», werden verworfen; bleibt keiner,
  kein Vorschlag mit Grund): Rundtour = Kreis durch den Start (3 Zwischenziele), 6 Richtungen, dann Radius nach der echten
  Fahrzeit nachregeln (höchstens 2 Runden), Rennrad C mit dem velofreundlichen Profil; eine Anfrage je Kandidat (Mehrpunkt), Warteschlange
  höchstens 2 gleichzeitig (`anfragen-1.0`), gleiche URL nur einmal. Plandauer bleibt massgebend: Abweichung wird gezeigt, nie angepasst.
- Intervalle `intervall-rt-1.0` (Abfahrt < −4 % über 200 m = ungeeignet, Unterbrechungen laut OSM-Knoten, Gravel beim Rennrad, Berg ≥ 4 %);
  ungeeignete Abschnitte werden so gezeigt, nie als passend. Wetter `wetteroptimiert-1.0` (Seitenböen > 36 km/h, Regen, Gegenwind auf dem
  Rückweg; unbekannt bleibt unbekannt, B nur mit ≥ 70 % bekanntem Wind). Ruhig `ruhig-1.0`, Tageslicht `tageslicht-1.0` (NOAA, ±2 min).
- Rennrad (V5.7): Pflaster eigener Belag (`belag-1.1`, kein Gravel), Varianten `varianten-2.1` (10 % auf die Fahrzeit; ohne Zeit ausdrücklich
  Distanz; velofreundlich nur, wenn wirklich ruhiger), Profil `gravel-rt-1.1` (`avoid_mainroads`). Ersatzprofil fastbike immer sichtbar melden.
- Vorschlag vs. Ist `auswertung-rt-1.0`: Prognosefehler, Prognose bei Ist-Leistung, Streckentreue aus `poly`; Modellgüte nur aus Einheiten
  nach dem Kalibrierungsstand und mit ≥ 80 % gefolgter Strecke.

## Sekundenreihen (serien/, V5.7.1)
- Format SPS2 (neu geschriebene Reihen): AES-256-GCM mit dem Seitenschlüssel über «Länge | gzip(JSON) | Nullen», Datei auf eine Zweierpotenz
  ≥ 16 KiB aufgefüllt (die Grösse verrät die Dauer nur grob). SPS1 (bis V5.6, exakte Grösse) wird weiter gelesen, nicht neu geschrieben.
- Name = erste 24 Hex-Zeichen von SHA-256(«serien_salz:gid», sonst «serien_salz:id»); `serien_salz` (128 Bit Zufall) nur verschlüsselt in
  den Daten. Die gid bleibt beim Monatsexport erhalten → gleicher Name, kein Neuimport, nichts verwaist.
- Nur neue oder tatsächlich geänderte Reihen werden geschrieben (Vergleich mit dem entschlüsselten Bestand); das Nacht-Update löscht und
  benennt nie um. Schlägt ein Import fehl, bleiben die bisherigen Dateien (atomar schreiben, sonst `git checkout`/`git clean` auf `serien/`).
- `tools/serien_pruefen.mjs` nach jedem Import: jede Datei entschlüsselbar und aufgefüllt, Inhalt gehört zur Aktivität (ID, Anzahl Werte =
  `ser.n`), keine zweite Datei je Aktivität, keine Klartext-/Restdateien, kein Name aus einer ID ohne Salz, keine doppelten IDs/gids,
  `data.json`/`work/`/FIT nicht im Repository; im Nacht-Update keine Löschung und nur Änderungen laut Lauf-Bericht.
- Sichtbar bleibt öffentlich: Anzahl der Dateien, Zeitpunkt neuer Dateien (Nacht-Update → Tag einer Aktivität) und die grobe Grössenstufe.
  Die exakten Grössen der SPS1-Dateien stehen in der Git-Historie.


