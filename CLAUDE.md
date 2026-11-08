# Ironman Notebook (vormals Spuren & Formkurve) – Arbeitsanleitung

Private Trainingsseite (GitHub Pages) von Silas, auf dem iPhone «Ironman Notebook». Sprache mit ihm: Deutsch (Schweiz, «ss» statt «ß»).
Alle Trainingsdaten liegen verschlüsselt in `data.enc.json`. Das Passwort steht **nie** im Repository; es kommt aus dem Auftrag als Umgebungsvariable `SPUREN_PW`.
`data.json` und `work/` niemals committen (stehen in `.gitignore`).

## Dateien
- `index.html` – die Seite (Passwortabfrage, Entschlüsselung im Browser, Karte, Tabs)
- `demo.html`, `manifest-demo.webmanifest` – Demo mit erfundenen Beispieldaten zum Teilen (ohne Passwort, lädt keine echten Daten).
  Wird aus `index.html` erzeugt: nach jeder Änderung an `index.html` `python3 -I tools/make_demo.py` ausführen und `demo.html` mitcommitten.
- `data.enc.json` – verschlüsselte Daten (AES-256-GCM, PBKDF2-SHA256, Salz bleibt fix)
- `tools/crypt.mjs` – ver-/entschlüsseln
- `tools/merge_daily.py` – nächtliche Garmin-Daten einspielen
- `tools/classify.py`, `tools/parse_activities.py`, `tools/fitlib.py`, `tools/import_export.py` – monatlicher FIT-Export
- `tools/ftp_model.py` – FTP-Schätzung aus Leistungsdaten (wird von `import_export.py` nur mit `--ftp-neu` neu gerechnet)
- `tools/series.py` – Sekundenreihen aus FIT-Datei oder Garmin-Verbindung (gleiche Struktur für beide Wege)
- `tools/zeit.py`, `tools/stufen.py`, `tools/kennzahlen.py` – Zeitbegriffe (A3), Stufen (A5), gemeinsame Kennzahlen mit Versionen
- `tools/fit_nacht.py` – Nacht-Update: Sekundenwerte einer neuen Aktivität auswerten (A2)
- `tools/laktat_vorschau.py` – Laktat-Tabellen einlesen, Stufen zuordnen, als Vorschau speichern (A5)
- `tools/check_referenz.py` – Referenzsatz und Neuberechnung prüfen (A1)
- `tools/workouts.py` – Test-Workouts für Zwift (.zwo) und Garmin (JSON), A9
- **V5:** `js/formkurve.js` (Rechenlogik ohne DOM: Zonen-Cockpit, Readiness, 1–6-h-Ziele, Koppelläufe, Fueling, Rad-Fahrzeit, CdA, FIT lesen),
  `js/v5-ui.js` (Laktat & Zonen, Bereitschaft, Eingaben auf dem Gerät), `js/v5-ausdauer.js`, `js/v5-extra.js`, `sw.js` (offline)
- `tools/schwellen.py` – LT1/LT2 je Methode mit Unsicherheit (V5); `tools/migrate_v5.py` – Datenmodell V5 mit Sicherung und Rückweg
- `tools/nachfuellen.py` – neue Kennzahlen aus einem FIT-Durchlauf ergänzen, ohne andere Werte anzufassen
- `tools/eingaben.mjs` – Export «Eingaben» von der Seite entschlüsseln und für `merge_daily.py` aufbereiten
- **V5.3:** `js/route.js` (Routenplaner-Rechenlogik ohne DOM: BRouter-Antwort lesen, Kettenmass, Belag/Wegart/Zugang, Anstiege,
  Tempo-Modelle, Wetterfeld, GPX), `js/routen-ui.js` (Planer-Oberfläche, Bottom Sheet, Karte ↔ Profil), `js/v53-extra.js`
  (Jahresziele, Serie, Tagebuch, Bestleistungen, Leistungsfähigkeiten, Zonen, Protein/KH pro kg, Schwimmübungen, Wetter kopieren)
- `tools/kalibrierung.py` – persönliche Kalibrierung aus FIT (HF→Watt, Physik-Korrektur, HF→Pace, Tobler-Faktor, Hm/h, Pausen) mit Hold-out
- `tools/bestleistungen.py` – Lauf-Bestleistungen aus FIT (400 m … Marathon), GPS-Sprünge ausgeschlossen
- **V5.5:** `js/v55.js` («Meine Entwicklung», Heute mit Datenqualität, Ausdauertrend, Wischhinweis für breite Tabellen, Rechennachweis),
  `js/v55-schwimmen.js` (CSS-Test, Fehlerboard, Rohpace-Hinweis); `tools/entwicklung.py` – gleichmässige 10-min-Blöcke `eb` (eb-1.0)
  aus FIT nachrechnen (`--nur-fehlende`); das Nacht-Update rechnet `eb` über `kennzahlen.alles()` mit
- `brouter/rennrad-asphalt.brf` – eigenes BRouter-Profil «Rennrad ohne Gravel» (aus fastbike, MIT), wird beim Routing-Server hinterlegt
- **V5.6:** `js/analyse.js` (Rechenlogik ohne DOM: Reihen entpacken, Kennzahlen einer Auswahl, Intervalle/Pausen, Ermüdungsresistenz,
  sRPE, Energie, Saisonphasen), `js/explorer.js` (Aktivitäts-Explorer, öffnet über jedem Tab: `data-ex="<ID>"`), `js/v56.js` (RPE und
  Kalibrierung, Geplant vs. Ist, Konstanz, Saison 2027, Ermüdung, Energie); `tools/serien.py` – Sekundenreihen im 2-s-Raster, Workout-Abgleich
  `wk` und Ermüdung `fr` aus FIT; `tools/serien_crypt.mjs` – Reihen verschlüsseln nach `serien/<Name>.bin` (Name = SHA-256 aus
  `serien_salz` und ID, `serien_salz` steht nur verschlüsselt in den Daten; die Dateinamen verraten keine Garmin-/Zwift-IDs)
- `tests/test_formkurve.cjs`, `tests/test_route.cjs`, `tests/test_analyse.cjs`, `tests/test_tools.py` – Abnahmetests (erfundene Werte; `tests/fixtures/` = echte
  Antworten einer lokalen BRouter-Instanz mit OSM-Testdaten Dreieich, ODbL); `docs/` – Konzept, Abnahme (`abnahme-v53.md`), Audit V5.5 (`AUDIT_V55.md`),
  Audit V5.6 (`AUDIT_V56.md`), offene Punkte (`offen-nach-v55.md`)

## Nächtliches Update (nur Garmin-Verbindung)
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Letztes Aktivitätsdatum in `data.json` bestimmen. Dann über die Garmin-Verbindung:
   - `get_activities_by_date` von (letztes Datum − 2 Tage) bis heute, alle Seiten.
   - pro Einheit `get_activity` (Leistung, NP, Höhenmeter, Dauer) und `get_activity_hr_in_timezones` (Zeit in Zone 1–5).
   - `get_sleep_summary_range` letzte 7 Nächte; `get_stats_range` letzte 7 Tage; `get_nutrition_summary_between_dates` letzte 7 Tage; `get_weigh_ins` letzte 14 Tage; `get_scheduled_workouts` heute bis +14 Tage.
   - **Tageswerte rückwirkend nachholen** (bis sie ab 2020 vorhanden sind): Startpunkt ist `config.days_backfill` in `data.json`,
     fehlt der Wert, das früheste Datum in `days`. Liegt er nach 2020-01-01, mit `get_sleep_summary_range` die 180 Nächte davor holen
     (zwei Abfragen à 90 Nächte, nie vor 2020-01-01) und als zusätzliche Einträge in `days` aufnehmen, nur `hrv`, `rhr`, `sleepH`,
     `sleepScore` (Nächte ohne Werte weglassen). Dann in `work/new.json` `"config": {"days_backfill": "<frühestes abgefragtes Datum>"}` setzen.
     Liefern beide Abfragen keine einzige Nacht, `"days_backfill": "2020-01-01"` setzen (fertig). Schlägt das Nachholen fehl,
     einfach weglassen: kein Abbruch, keine Nachricht, nächste Nacht erneut.
   - **FIT-Sekundenwerte je neue Aktivität (A2)**, also für jede Aktivität aus `get_activities_by_date`, die noch nicht in `data.json`
     steht oder dort noch kein Feld `mv` oder `t0` hat:
     a) `get_activity_fit_data(activity_id=<id>, include_records=true)`. Die Antwort ist gross und wird als Datei gespeichert;
        der Pfad steht in der Meldung («Output has been saved to …»). Die Datei nicht lesen, nur den Pfad weitergeben.
     b) `get_activity_fit_messages(activity_id=<id>, message_types=["file_id","lap","length","event","workout","workout_step","zones_target"], message_limit=5000)`,
        ebenfalls als Datei.
     c) `python3 -I tools/fit_nacht.py <id> <pfad_a> <pfad_b> >> work/fit.jsonl` (V5.6: rechnet auch Workout-Abgleich `wk`, Ermüdung `fr`
        und die Reihe `work/serien/g<ID>.json` für den Explorer)
     Kommt eine Antwort direkt statt als Datei (sehr kurze Aktivität), sie unverändert als `work/fit_<id>_a.json` bzw.
     `work/fit_<id>_b.json` speichern und diese Pfade nehmen. Schlägt ein Abruf fehl: ohne diese Datei weitermachen
     (`fit_nacht.py <id> fehlt`); die Lücke steht dann im Protokoll `fit_log`. Kein Abbruch, keine Nachricht.
   - **Wetter (V5):** für jede neue Aktivität draussen (nicht Rolle, nicht Laufband, nicht Becken) `get_activity_weather(activity_id)`;
     die Antwort unverändert unter `"wx": {"g<ID>": {…, "quelle": "Garmin get_activity_weather (Wetterstation)", "abgerufen": "<heute>"}}`
     in `work/new.json`. Zusätzlich höchstens 10 ältere Aktivitäten draussen mit `gid` und ohne `wx` (neueste zuerst). Fehlt die Antwort:
     weglassen, kein Abbruch. Bestehende `wx` werden nie überschrieben.
3. `work/new.json` schreiben (Format unten), dann `python3 -I tools/merge_daily.py data.json work/new.json work/fit.jsonl`.
4. `SPUREN_PW=… node tools/crypt.mjs encrypt data.json data.enc.json`, dann nur `data.enc.json` committen («Nacht-Update JJJJ-MM-TT») und auf `main` pushen.
   Sekundenreihen (`serien/`, verschlüsselt) nur, wenn der Auftrag das Committen von `serien/` ausdrücklich erlaubt: dann nach dem
   Verschlüsseln `SPUREN_PW=… node tools/serien_crypt.mjs` und `serien/` mitcommitten. Sonst kommen die Reihen mit dem Monatsexport.

### Format `work/new.json`
```json
{
  "activities": [{"garmin_id": 0, "name": "", "type": "road_biking", "start_local": "2026-10-30T18:30:00",
                  "duration_s": 0, "distance_m": 0, "elev_gain_m": 0, "avg_hr": 0, "max_hr": 0,
                  "avg_power": null, "np": null, "hr_zones_s": [z1, z2, z3, z4, z5]}],
  "days": [{"date": "2026-10-30", "hrv": 0, "rhr": 0, "sleepH": 0, "sleepScore": 0, "kcalOut": 0,
            "kcalIn": 0, "protein": 0, "carbs": 0, "fat": 0}],
  "weights": [{"date": "2026-10-30", "kg": 0, "ts_gmt": 0}],
  "planned": [{"date": "2026-11-02", "title": "", "sport": "rad", "dur_s": 3600}],
  "planned_range": ["2026-10-31", "2026-11-14"],
  "config": {"days_backfill": "2026-04-04"}
}
```
`config` ist optional und wird in `data.json` übernommen (nur die angegebenen Schlüssel).
Zuordnung: `type` = Garmin-Typ aus `get_activity`; `start_local` = `start_time_local`; `duration_s` = `duration_seconds`;
`elev_gain_m` = `elevation_gain_meters`; `avg_hr` = `avg_hr_bpm`; `avg_power` = `avg_power_watts`; `np` = `normalized_power_watts`;
Tage: `hrv` = `avg_overnight_hrv`, `rhr` = `resting_heart_rate_bpm`, `sleepH` = `sleep_hours`, `sleepScore` = `sleep_score`,
`kcalOut` = `total_calories` (nur abgeschlossene Tage), Ernährung nur für abgeschlossene Tage mit `item_count` ≥ 4.
Gewicht: `weight_kg`, `ts_gmt` = `timestamp_gmt` (alle Messungen; das Skript nimmt pro Tag die Morgenmessung).
Leere Werte als `null`. Unbekannte Felder weglassen. Werte nie schätzen.

## Monatlicher Garmin-Export (FIT, volle Genauigkeit inkl. GPS-Spuren)
Silas lädt `UploadedFiles_0-_Part*.zip` hoch. Jedes ZIP in einen eigenen, leeren Ordner ausserhalb des Repos entpacken.
1. `python3 -I tools/classify.py <rohordner> work/files.json`
2. `python3 -I tools/parse_activities.py work/files.json work/acts_raw.json`
3. entschlüsseln, `python3 -I tools/import_export.py data.json work/acts_raw.json`.
   Die FTP-Probe (`ftp_est`, `ftp_e`, `ftp_dev`) bleibt wie zuletzt berechnet; neu nur mit `--ftp-neu`, wenn Silas das will.
   Neu je Aktivität: Zeitbegriffe `el mv st nst un rc ac us` (zeit-1.0); Stufentests aus den Sekundenwerten unter `stufen`;
   V5: `t0` (Start, Unix), `dr` (Drift 1./2. Hälfte), `sp` (Lauf-Abschnitte 0–5/5–10/10–20 min/Rest), ausdauer-1.0.
   Danach `python3 -I tools/migrate_v5.py data.json` (Schwellen neu, V5-Listen vorhanden).
   V5.3: `python3 -I tools/kalibrierung.py data.json --files work/files.json` (persönliche Zeitmodelle, Hold-out) und
   `python3 -I tools/bestleistungen.py data.json --files work/files.json` (Lauf-Bestleistungen). Fehlt `pdc` bei älteren Aktivitäten:
   `python3 -I tools/nachfuellen.py data.json work/acts_raw.json pdc`.
   V5.5: `python3 -I tools/entwicklung.py data.json --files work/files.json --nur-fehlende` (Blöcke `eb` für «Meine Entwicklung»).
   V5.6: `python3 -I tools/serien.py data.json --files work/files.json --nur-fehlende` (Reihen für den Explorer, Workout-Abgleich `wk`,
   Ermüdung `fr`; ändert nur diese drei Felder). Nach einer Regeländerung bei `wk`/`fr`: ohne `--nur-fehlende`, mit `--ohne-reihen`.
4. Prüfen: `python3 -I tools/check_referenz.py data.json --files work/files.json --raw-acts work/acts_raw.json`
   (Referenzsatz, Handwerte, Stufen, alle Aktivitäten). «GESAMT: bestanden» muss dastehen; sonst Silas die Liste zeigen.
5. verschlüsseln, dann `SPUREN_PW=… node tools/serien_crypt.mjs` (schreibt nur neue/geänderte Reihen, entfernt verwaiste; bricht das
   Löschen ab, wenn mehr als 5 % verwaist wären), `data.enc.json` und `serien/` committen, pushen.

## Eingaben von der Seite (V5: Fueling, Befinden, Tests vom Handy, Koppelläufe, Pläne, B1)
Auf der Seite erfasste Werte bleiben verschlüsselt auf dem Gerät, bis Silas «Exportieren» tippt und die Datei
`spuren-eingaben-….json` im Chat schickt (sie ist mit dem Seitenpasswort verschlüsselt). Einspielen:
1. Datei in einen eigenen Ordner ausserhalb des Repos kopieren, entschlüsseln: `SPUREN_PW=… node tools/eingaben.mjs <datei> work/eingaben.json`
2. `python3 -I tools/merge_daily.py data.json work/eingaben.json` (ersetzt Einträge mit gleicher ID, alte Fassung ins `audit`; nichts doppelt).
3. Enthält die Datei `laktat_bestaetigt` (Schritt B1), werden diese Vorschauen zu `lactate`. Danach `python3 -I tools/migrate_v5.py data.json`
   (rechnet `schwellen` neu) und `python3 -I tools/check_referenz.py …` laufen lassen.
4. Test-Entwürfe vom Handy (`test_entwuerfe`) sind nur Vorschau: mit der FIT-Datei über `tools/laktat_vorschau.py --extra` zuordnen, Silas zeigen.
5. verschlüsseln, nur `data.enc.json` committen, pushen.
Demo-Exporte (`"demo": true`) werden abgelehnt.
V5.5: Der Export enthält auch `pb` (offizielle Bestzeiten → `pb_offiziell`), `css` (CSS-Tests → `css_tests`, Zeiten von Hand, Korrektur
ersetzt mit Audit) und `fehler` (Fehlerboard → `fehlerboard`). `fueling_quellen` (geprüfte Garmin/FIT-Quellen, A15) nur nach einer neuen
Prüfung ersetzen; nie Einnahmen aus Garmin schätzen oder ergänzen.
V5.6: zusätzlich `rpe` (→ `rpe`), `intervalle` (Korrekturen von Hand → `intervall_korr`), `laktat_punkte` (Laktat einem Abschnitt
zugeordnet → `laktat_punkte`, Status «vorschau») und `saison` (Stunden «jetzt»/«Spitze» → `saison_plan`); gleiche ID ersetzt mit Audit.

## Laktatschwellen und Zonen (V5)
- `tools/schwellen.py`: LT1 = SOMC (letzte Stufe vor Anstieg ≥ 0,4), Basis + 0,5 (Basis = Mittel der ersten drei Stufen), log-log (≥ 6 Stufen);
  LT2 = Dickhuth; mod. Dmax und Dmax nur bei ausbelastetem Test. 2/4 mmol/l nur Orientierung, nie LT. Keine Extrapolation.
  Unsicherheit: 4000 Simulationen, Messfehler max(0,15 mmol/l; 7,5 %), je Test eigene Zufallsfolge. Puls an der Schwelle aus FIT (30 s vor der Entnahme).
- Nach jeder Änderung an Laktatwerten: `python3 -I tools/migrate_v5.py data.json` (rechnet `schwellen`, legt fehlende V5-Listen an, Sicherung in
  `work/backup/`, Rückweg mit `--rollback <datei>`). `check_referenz.py` prüft die Schwellen gegen `referenz.schwellen_soll`.
- Zonenprofile (`zonen`) sind versioniert und werden **nie** automatisch aus LT1/LT2 gerechnet. Neue Version nur über `"zonen_add"` mit
  `freigabe.datum` (Silas' Freigabe); die alte wird «ersetzt». Aktiv: «Zonen vom 23.10.2026» (in Garmin eingetragen).
- Zonenverteilung «Mache ich das Richtige?» nutzt die Pulsgrenzen des aktiven Profils (ab dessen Gültigkeit), davor die Garmin-Zonen.

## Routenplaner (V5.3)
- Routing: öffentlicher BRouter-Server `https://brouter.de/brouter` (ohne Schlüssel), einstellbar über localStorage `sf.rt.endpoint`.
  Profile: Rennrad eigenes Profil `brouter/rennrad-asphalt.brf` (aus `fastbike`, ohne Gravel; Rückfall `fastbike`), Gravel `gravel` (`prefer_unpaved_paths=1`), MTB `gravel` bzw. «Technische Trails» `mtb`
  (`StrictNOBicycleaccess=1`), Laufen/Trail/Wandern `hiking-mountain` (SAC-Grenze 1/3/wählbar), immer `processUnusedTags=1`.
  Profil-Parameter nur als Zahlen (`1`/`0`), nie `true`/`false` (Server bricht sonst mit HTTP 500 ab).
- Koordinaten werden erst nach Zustimmung im Planer gesendet (Routing an BRouter, Wetter an Open-Meteo); keine Schlüssel, kein Backend.
- Nie eine Luftlinie als Ersatz zeichnen oder als GPX speichern; Skitour ist ausdrücklich «von Hand gezeichnet».
- Neue Kennzahlen/Regeln: Version in `RT.VERSIONS` erhöhen, `node --test tests/test_route.cjs`.
- **V5.6 Rennrad:** das Profil wird beim Server über `POST <endpoint>/profile` hinterlegt (nur Text, ID «custom_…», 6 h wiederverwendet;
  HTTP 5xx beim Routing → einmal neu hinterlegen, sonst `fastbike` mit Hinweis). Änderungen am Profil nur mit Test in `tests/test_route.cjs`
  und Version `gravel-rt-x`. Varianten `varianten-2.0`: «Schnellste» und «Velofreundlich» (`consider_traffic` 0.5, `prefer_cycleways` 1)
  werden immer beide gerechnet; velofreundlich, solange höchstens Toleranz (Standard 10 %, localStorage `sf.rt.toleranz`) langsamer und
  nicht mehr Gravel. Gravel `gravel-rt-1.0` (Kies/Feinkies, Naturweg, unbefestigt, tracktype grade2–5; Feldweg ohne Angabe = «möglicherweise»;
  Pflaster nie): Meldung je Abschnitt, «für mich ok» oder Umfahrung mit Sperrpunkten (`nogos`, 3–10 m, nie näher als 30 m an Wegpunkten,
  höchstens 3 Runden, nur bei weniger Gravel übernommen). Andere Routen `alternativen-1.0` (`alternativeidx` 1–2, Doppel ≥ 85 % weg).
  Wegpunkte `wegpunkte-1.0`: Start und Ziel fest, neue Punkte als Zwischenziel mit kleinstem Umweg. Ortssuche `ortssuche-1.0` über swisstopo
  (`api3.geo.admin.ch`, nur der Suchtext). Fixtures dafür aus der lokalen BRouter-Instanz (`tests/fixtures/brouter_dreieich_*`).
- Testen ohne Internet: BRouter aus github.com/abrensch/brouter mit `javac` bauen (OsmParser durch XML-Leser ersetzen, PBF braucht
  Protobuf), Segmente aus `brouter-map-creator/src/test/resources/dreieich.osm.gz` + `srtm_38_0*.bef`, Server lokal starten;
  MapLibre/Chart.js aus den GitHub-Releases. Nie behaupten, brouter.de oder Open-Meteo live getestet zu haben, wenn sie gesperrt waren.

## Meine Entwicklung und Regeln V5.5
- Vergleiche nur aus `eb`-Blöcken (Rad 190–210 W je System Rolle/Rennrad/MTB, Laufen 5:20–5:40/km flach), Urteil `entwicklung-1.0`
  (mind. 3 je Zeitraum, Bootstrap-Intervall, Guards Hitze/Höhe/Drift/Ausreisser). Laktat zählt erst bestätigt (B1), CSS nur aus Tests.
- Form `pmc-2.0` (Fitness − Ermüdung desselben Tages), Zonen `zonenverteilung-2.0` (je Sportart, Zonen je Datum, Garmin-Zonen nicht beurteilt).
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
- Saison `saison-1.0`: Phasen rückwärts ab Hamburg (A), Jesolo als B-Rennen; Stunden nur als Vorschlag aus den eigenen Wochen, nie als
  Vorgabe und nie nach Garmin/Enduco geschrieben.
- Ermüdung `ermuedung-1.0`: Puls früh gegen spät bei gleicher Leistung bzw. Pace in derselben Einheit; beste 20 min ab Stunde 2–5.
  «Meine Entwicklung» urteilt darüber nur mit `entwicklung-1.0` (mind. 3 je Zeitraum, Intervall).
- RPE `rpe-1.0`: CR-10 nach Foster (modifizierte Borg-Skala), sRPE = RPE × Bewegungsminuten; Kalibrierung mit Morgenwerten erst ab 20 Paaren, nur Rangkorrelation, keine Prozentwerte.
- Energie `energie-1.0`: aufgenommen nur aus dem Fueling-Protokoll; Verbrauch Rad aus kJ mit Wirkungsgrad 22–25 % (Annahme); KH-Anteil
  je Garmin-Pulszone ist ein Modell; Richtwert Jeukendrup 2014. Nie Gelmengen oder Stoffwechselwerte erfinden.

## Prüfen vor jedem Push von Seite oder Werkzeugen
`node --test tests/test_formkurve.cjs`, `node --test tests/test_route.cjs`, `node --test tests/test_analyse.cjs`, `python3 -I tests/test_tools.py`, `python3 -I tools/make_demo.py`, bei Datenänderungen `check_referenz.py`.
Kein Live-Push, wenn ein Test fehlschlägt. Screenshots mit echten Daten nie ins Repo.

## FTP und Trainingslast
- Auf Silas' Wunsch sind die FTP-Karten (Fortschritt «Trainingslast: Garmin-FTP …», Leistung «Rad: FTP und Watt/kg») ausgeblendet
  (`data-ausgeblendet`); Daten und Werkzeuge bleiben. Er trainiert nach Laktat und testet keine FTP.
- `tss` ist die ursprüngliche Trainingslast (Rad mit der in Garmin eingestellten FTP). Sie wird nie überschrieben.
- Die Seite rechnet daneben eine Probe aus NP und `ftp_e` (geschätzte FTP des Radsystems zum damaligen Datum,
  neue Fahrten ohne `ftp_e` mit `ftp_est.now`). `config.load_model` steuert, was die Seite verwendet:
  `"garmin"` (Standard) oder `"ftp_est"`. Auf `"ftp_est"` erst umstellen, wenn Silas die Probe bestätigt.
- `config.ftp` bleibt der Garmin-Wert (für die bisherige Berechnung im Nacht-Update).

## Laktat (kommt über den Chat)
- **Kurzcheck** (meist Zwift, Block z. B. 10 min @ 220 W, Laktat am Ende des Blocks): Einheit finden, Block über Runden
  (`get_activity_splits`) oder eine hochgeladene FIT-Datei bestimmen. Werte: NP, Puls Ø, Puls max, Pulsanstieg
  (Ø 2. Hälfte gegenüber 1. Hälfte in %).
  Eintrag: `{"kind":"check","date":"…","sport":"rad","block":"10 min @ 220 W","w":220,"np":…,"hr_avg":…,"hr_max":…,"drift":…,"lactate":…,"note":"…","activity":"g<ID>"}`
- **Stufentest** (Laktat in der letzten Minute jeder Stufe): Puls je Stufe aus der letzten Minute.
  Eintrag: `{"kind":"stufentest","date":"…","sport":"rad","stages":[{"w":180,"hr":132,"la":1.1}],"note":"…"}`; Lauf mit `"pace_s"` (s/km) statt `"w"`.
- Einträge über `"lactate_add": [ … ]` in `work/new.json` einspielen (merge_daily.py), dann verschlüsseln und pushen.
- **V5.6 Laktatpunkte aus dem Explorer** (`laktat_punkte`, Status «vorschau», mit Abschnitt von/bis, Ø W, NP, Puls bzw. Pace): Silas zeigen;
  erst nach seiner Bestätigung als Kurzcheck über `lactate_add` übernehmen (`activity` = ID, Werte aus dem Abschnitt, Notiz «aus Explorer»).
- **Tabellen (Excel der SOMC-Vorlage), Laborberichte, Werte aus dem Chat: zuerst nur Vorschau (A5).**
  Excel in einen eigenen Ordner ausserhalb des Repos kopieren, Rohdaten (FIT) wie beim Monatsexport bereitstellen, dann
  `python3 -I tools/laktat_vorschau.py data.json --files work/files.json --xlsx <datei.xlsx> [--extra <werte.json>]`.
  Jeder Wert trägt seine Quelle (Datei, Blatt, Zelle). Abweichung > 5 W bzw. 0,3 km/h oder keine Aktivität = «unklar».
  Die Vorschau zeigt die Seite im Testzentrum. Übernommen (nach `lactate`) wird erst nach Silas' Bestätigung (Schritt B1).
  Schwellen je Methode erst mit B1; nie eine Schwelle ausserhalb der gemessenen Stufen.

## Punkte (GPX kommt über den Chat)
Wegpunkte, z. B. Jagdposten aus Garmin Explore: GPX in einen eigenen, leeren Ordner ausserhalb des Repos kopieren, entschlüsseln,
`python3 -I tools/import_points.py data.json <datei.gpx>` (ersetzt früher importierte Punkte), verschlüsseln, nur `data.enc.json` committen.

## Testkalender
`tests` in den Daten: `[{"date":"…","kind":"stufentest"|"check","note":"…","status":"vorschlag"}]`.
Änderungen über `"tests": [ … ]` (ersetzt die ganze Liste) in `work/new.json`.
Protokoll-Vorlagen: `protokolle` (Liste mit `id name sport ablauf blut ende rahmen status`), ändern über `"protokolle": [ … ]` in `work/new.json`.

## Test-Workouts (A9)
`python3 -I tools/workouts.py <ordner>` erzeugt `.zwo` (Zwift, ftpOverride 100 → Power 1.2 = 120 W) und `.garmin.json`
(für `upload_workout`, Leistungsbereich `power.between`, eine Runde je Stufe). **Nie ohne Silas' Freigabe hochladen,
einplanen oder an ein Gerät senden.** Mit Freigabe: `upload_workout` → `schedule_workout(Datum)`; enduco-Workouts nie ändern.

## Referenzsatz und Versionen (A1)
Der Referenzsatz (10 Einheiten mit Handwerten) liegt nur verschlüsselt in `data.json` unter `referenz`, nie offen im Repo.
Jede Kennzahl hat eine Version (`versions`). Ändert sich eine Regel: Version erhöhen, `check_referenz.py` laufen lassen,
Abweichungen Silas zeigen, erst dann neue Werte speichern.
