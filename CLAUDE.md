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
  `serien_salz` und gid bzw. ID, `serien_salz` steht nur verschlüsselt in den Daten; die Dateinamen verraten keine Garmin-/Zwift-IDs)
- **V5.7.2:** `tools/garmin_ernaehrung.py` – Garmin-Ernährungsprotokoll je Tag prüfen und Einnahmen während einer Aktivität als Fueling «fg-…» übernehmen
- **V5.7.1 Reihen im Nacht-Update:** `tools/serienlib.mjs` (Formate SPS1/SPS2, Dateiname, Ver-/Entschlüsseln), `tools/serien_pruefen.mjs`
  (Konsistenz Aktivitäten ↔ Reihen ↔ Zuordnung und Datenschutz nach jedem Import; Regeln im Abschnitt «Sekundenreihen»)
- **V5.7 Smart Training Routes:** `js/training-route.js` (Rechenlogik ohne DOM: Enduco-/Garmin-Workout lesen, Zeitplan je Schritt, Rundtour-Kandidaten,
  Dauerabstimmung, Intervall-Eignung, Wetter je Durchfahrtszeit, Tageslicht, Vorschläge A/B/C, Vorschlag vs. Ist), `js/training-ui.js`
  (Trainingsvorschau im Planer, Startorte verschlüsselt, Regler, Kalender «Passende Route finden» `data-str`, «Vorschlag vs. Ist» `data-trv`)
- **V5.9:** `js/eingang.js` (Direkt speichern: Delta, EGS1, GitHub-Schlüssel, Warteschlange), `js/v59-logik.js` (Rechenlogik ohne DOM:
  Check-in, Gefühl gegen Morgenwerte, Heute geplant, Trainingslast, CSS), `js/v59.js` (Check-in, Einstellungen, Laktat bestätigen …),
  `tools/eingang.mjs` (eingang/ einlesen, aufräumen, prüfen), `tools/eingaben_lib.mjs` (Zuordnung Eingaben → merge_daily.py), `tests/test_v59.cjs`,
  `tools/last.py` (V5.9.1 Trainingslast `tl2` mit der LT2, Vergleich; Abschnitt «FTP und Trainingslast»)
- **V6.0:** `css/v6.css` (Design design-1.0: dunkel als Standard, Zonen-, Sport- und Statusfarben, Pillen, Blätter), `js/v6.js` (ohne DOM:
  Zonen und Farben, Balkenprofil profil-1.0, Fokus, Trainingsstatus status-1.0, Wochenleiste, Rennen/Phasen, eigene Symbole), `js/v6-heute.js`
  (Heute: Kacheln, Heutiges Training, Einheit, Optionen, Bereitschaft als Blätter, Wochenleiste), `js/v6-plan.js` (Plan: Rennen, Phasen,
  Wochenübersicht), `tests/test_v6.cjs`
- **V6.1 (Etappe 1 Daten):** `tools/wellness.py` (Readiness, Body Battery, Stress je Tag, wellness-1.0; `offen` = Tage zum Nachholen),
  `tools/notizen.py` (Garmin-Notizen speichern, Laktat und Verpflegung daraus als Vorschau, notizen-1.0; `offen` = Aktivitäten ohne Notiz),
  `js/v61.js` (ohne DOM: Garmin-Werte eines Tages, Datenlage je Wert, Notiz-Vorschauen), `tests/test_v61.cjs`
- **V6.2 (Etappe 2):** `js/v62.js` (ohne DOM: Testplan testplan-1.0), `tests/test_v62.cjs`
- **V5.8:** keine neuen Dateien; Rechenlogik in `js/route.js` (Abschnitte von Hand, Skitourennetz, Hangneigung, MTB-Abfahrt, Wegende, drei
  Rennradvarianten, Windpfeile), Oberfläche in `js/routen-ui.js`, Ringe «Heute» in `js/formkurve.js` (`FK.ringeVerlauf`) und `js/v55.js` (`V55.ringe`)
- `tests/test_formkurve.cjs`, `tests/test_route.cjs`, `tests/test_analyse.cjs`, `tests/test_training.cjs`, `tests/test_tools.py` – Abnahmetests (erfundene Werte; `tests/fixtures/` = echte
  Antworten einer lokalen BRouter-Instanz mit OSM-Testdaten Dreieich, ODbL); `docs/` – Konzept, Abnahme (`abnahme-v53.md`), Audit V5.5 (`AUDIT_V55.md`),
  Audit V5.6 (`AUDIT_V56.md`), Audit V5.7 (`AUDIT_V57.md`), offene Punkte (`offen-nach-v55.md`)

## Nächtliches Update (nur Garmin-Verbindung)
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Letztes Aktivitätsdatum in `data.json` bestimmen. Dann über die Garmin-Verbindung:
   - `get_activities_by_date` von (letztes Datum − 2 Tage) bis heute, alle Seiten.
   - pro Einheit `get_activity` (Leistung, NP, Höhenmeter, Dauer) und `get_activity_hr_in_timezones` (Zeit in Zone 1–5).
   - `get_sleep_summary_range` letzte 7 Nächte; `get_stats_range` letzte 7 Tage; `get_nutrition_summary_between_dates` letzte 7 Tage; `get_weigh_ins` letzte 14 Tage; `get_scheduled_workouts` heute bis +14 Tage.
   - **Tageswerte (V6.1, wellness-1.0):** `get_morning_training_readiness(heute)`, `get_user_summary(gestern)` (abgeschlossener Tag) und
     `get_user_summary(heute)` (nur `bodyBattery`, `bbSleep`) → `days` (Zuordnung unten). «No … data found» oder Fehler: weglassen.
   - **Notizen (V6.1, notizen-1.0):** für jede Aktivität, die du mit `get_activity` abrufst, `description` unverändert als `notiz` (fehlt sie:
     `null`). Die Notiz nie ändern, kürzen oder zusammenfassen; `merge_daily.py` macht daraus Vorschauen für Laktat und Verpflegung.
   - **Workout-Schritte (V5.7, für «Passende Route finden»):** für jede Einheit aus `get_scheduled_workouts` mit `workout_id`:
     `get_workout_by_id(workout_id)` (vereinfachte Form, nicht `raw`) und im `planned`-Eintrag ergänzen: `wid` = workout_id,
     `quelle` = `<provider> über Garmin` (z. B. «Enduco über Garmin»), `desc` = erster Satz der Beschreibung (höchstens 200 Zeichen),
     `steps` = `segments[0].steps` unverändert (type, end_condition, end_condition_value, target_type, target_value_low/high,
     secondary_target_*, repeat_count, steps). Danach `get_workouts`: Workouts mit `provider` «Enduco», `created_date` in den letzten
     2 Tagen und nicht im Kalender → höchstens 5 als `"workouts_neu"` (je `get_workout_by_id`; Format unten; ersetzt die alte Liste).
     Schlägt ein Abruf fehl: ohne Schritte weitermachen, kein Abbruch, keine Nachricht. Enduco-Workouts nie ändern.
   - **Tageswerte rückwirkend nachholen** (bis sie ab 2020 vorhanden sind): Startpunkt ist `config.days_backfill` in `data.json`,
     fehlt der Wert, das früheste Datum in `days`. Liegt er nach 2020-01-01, mit `get_sleep_summary_range` die 180 Nächte davor holen
     (zwei Abfragen à 90 Nächte, nie vor 2020-01-01) und als zusätzliche Einträge in `days` aufnehmen, nur `hrv`, `rhr`, `sleepH`,
     `sleepScore`, `sleepStress` (Nächte ohne Werte weglassen). Dann in `work/new.json` `"config": {"days_backfill": "<frühestes abgefragtes Datum>"}` setzen.
     Liefern beide Abfragen keine einzige Nacht, `"days_backfill": "2020-01-01"` setzen (fertig). Schlägt das Nachholen fehl,
     einfach weglassen: kein Abbruch, keine Nachricht, nächste Nacht erneut.
   - **FIT-Sekundenwerte je neue Aktivität (A2)**, also für jede Aktivität aus `get_activities_by_date`, die noch nicht in `data.json`
     steht oder dort noch kein Feld `mv` oder `t0` hat:
     a) `get_activity_fit_data(activity_id=<id>, include_records=true)`. Die Antwort ist gross und wird als Datei gespeichert;
        der Pfad steht in der Meldung («Output has been saved to …»). Die Datei nicht lesen, nur den Pfad weitergeben.
     b) `get_activity_fit_messages(activity_id=<id>, message_types=["file_id","lap","length","event","workout","workout_step","zones_target"], message_limit=5000)`,
        ebenfalls als Datei.
     c) `python3 -I tools/fit_nacht.py <id> <pfad_a> <pfad_b> >> work/fit.jsonl` (V5.6: rechnet auch Workout-Abgleich `wk`, Ermüdung `fr`
        und die Reihe `work/serien/g<ID>.json` für den Explorer; V5.7: GPS-Spur `poly` draussen wie im Monatsexport, für «Vorschlag vs. Ist»)
     Kommt eine Antwort direkt statt als Datei (sehr kurze Aktivität), sie unverändert als `work/fit_<id>_a.json` bzw.
     `work/fit_<id>_b.json` speichern und diese Pfade nehmen. Schlägt ein Abruf fehl: ohne diese Datei weitermachen
     (`fit_nacht.py <id> fehlt`); die Lücke steht dann im Protokoll `fit_log`. Kein Abbruch, keine Nachricht.
   - **Wetter (V5):** für jede neue Aktivität draussen (nicht Rolle, nicht Laufband, nicht Becken) `get_activity_weather(activity_id)`;
     die Antwort unverändert unter `"wx": {"g<ID>": {…, "quelle": "Garmin get_activity_weather (Wetterstation)", "abgerufen": "<heute>"}}`
     in `work/new.json`. Zusätzlich höchstens 10 ältere Aktivitäten draussen mit `gid` und ohne `wx` (neueste zuerst). Fehlt die Antwort:
     weglassen, kein Abbruch. Bestehende `wx` werden nie überschrieben.
   - **Ernährung (V5.7.2, Garmin-Ernährungsprotokoll):** für jedes Datum von (letztes Aktivitätsdatum − 2 Tage) bis heute
     `get_nutrition_daily_food_log(date)` und `get_hydration_data(date)`. Je Tag mit Einträgen in `work/new.json` unter `"food_logs"`:
     `date` = `mealDate`, `dailyCalories` = `dailyNutritionContent.calories`, `dailyCarbs` = `dailyNutritionContent.carbs`,
     `hydration` = {`valueInML`, `activityIntakeInML`, `sweatLossInML`, `lastEntryTimestampLocal`} und `items`: je Eintrag aus
     `mealDetails[].loggedFoods[]` (jede `logId` nur einmal) unverändert `logId`, `foodName`/`brandName` (aus `foodMetaData`), `servingQty`,
     `numberOfUnits`/`servingUnit`/`calories`/`carbs`/`sodium` (aus `nutritionContent`; fehlt → null), `mealName` (aus `meal`), `mealTime`,
     `logTimestamp`. Nichts umrechnen oder ergänzen. `merge_daily.py` prüft jeden Tag gegen die Tageswerte (sonst nicht verwendet) und
     übernimmt Einträge mit Uhrzeit während einer Aktivität, die erst danach erfasst wurden, als Fueling «fg-<Aktivität>»
     (`tools/garmin_ernaehrung.py`). Schlägt ein Abruf fehl: weglassen, kein Abbruch, keine Nachricht.
   - **Zuletzt, rückwirkend (V6.1):** erst wenn alles oben abgerufen ist; aus den Antworten nur die genannten Felder übernehmen.
     a) Tageswerte: `python3 -I tools/wellness.py offen data.json` nennt die Tage dieser Nacht (`tage`, höchstens 10) und davon die mit
        Readiness (`readiness`); je Tag `get_user_summary` (abgeschlossener Tag) und für die Readiness-Tage `get_morning_training_readiness`
        → zusätzliche Einträge in `days`, dann `"config": {"wellness_backfill": "<neuer_zeiger>"}`. Bei `"fertig": true` nichts nachholen.
     b) Notizen: `python3 -I tools/notizen.py offen data.json` nennt höchstens 20 Garmin-IDs ohne abgerufene Notiz; je ID `get_activity`
        → `"notizen_garmin": {"<ID>": <description oder null>}`.
     Schlägt ein Abruf fehl: bei a) den Zeiger nicht verschieben, bei b) die ID weglassen (nächste Nacht erneut); kein Abbruch, keine Nachricht.
3. `work/new.json` schreiben (Format unten, mit `"lauf": "nacht"`), dann `python3 -I tools/merge_daily.py data.json work/new.json work/fit.jsonl`.
   **Eingaben vom Handy (V5.9.3, eingang-1.0, Abschnitt «Eingang»):** `SPUREN_PW=… node tools/eingang.mjs einlesen` (liest `eingang/*.bin`,
   schreibt `work/eingang_a.json`, `work/eingang_b.json`, `work/eingang_dateien.json`).
   - Gibt es `work/eingang_a.json`: `python3 -I tools/merge_daily.py data.json work/eingang_a.json`.
   - Gibt es `work/eingang_b.json` (Laktat auf der Seite bestätigt): `cp data.json work/vor_b.json`, dann
     `python3 -I tools/merge_daily.py data.json work/eingang_b.json`, `python3 -I tools/migrate_v5.py data.json` und
     `python3 -I tools/check_referenz.py data.json --ohne-fit`. Steht «GESAMT: bestanden» da, ist B übernommen. Sonst
     `cp work/vor_b.json data.json` (die Bestätigung bleibt in `eingang/` liegen) und Silas kurz informieren (Grund aus der Ausgabe, ohne Werte).
   - Meldet `einlesen` «abgelehnt …» (Demo, fremd, nicht entschlüsselbar): nie löschen, Silas kurz informieren.
4. `SPUREN_PW=… node tools/crypt.mjs encrypt data.json data.enc.json`.
   **Sekundenreihen (V5.7.1, von Silas am 8.11.2026 freigegeben):** `SPUREN_PW=… node tools/serien_crypt.mjs --nacht` (nur neue oder
   tatsächlich geänderte Reihen aus `work/serien/`, atomar geschrieben, nichts gelöscht oder umbenannt), dann
   `SPUREN_PW=… node tools/serien_pruefen.mjs --nacht --git` (Konsistenz und Datenschutz, siehe «Sekundenreihen»).
   - Beide ohne Fehler und letzte Zeile «PRÜFUNG REIHEN: bestanden» → `git add data.enc.json serien/`.
   - Sonst: `git checkout -- serien/ && git clean -fdq -- serien/` (die bisherigen Dateien bleiben unverändert), nur `data.enc.json`
     stagen, Commit-Nachricht mit dem Zusatz « (Reihen nicht übernommen)» und Silas kurz informieren (Grund aus der Ausgabe, ohne Daten).
   **Eingang aufräumen (V5.9.3):** `node tools/eingang.mjs aufraeumen work/eingang_dateien.json` (mit `--mit-b`, wenn B übernommen wurde;
   entfernt mit `git rm` nur die eingespielten Dateien und Testdateien), dann `SPUREN_PW=… node tools/eingang.mjs pruefen --git`
   («PRÜFUNG EINGANG: bestanden»; sonst Silas den Grund nennen). Die Löschungen gehören in denselben Commit wie `data.enc.json`.
   Nie `data.json` oder etwas aus `work/` committen. Commit «Nacht-Update JJJJ-MM-TT», auf `main` pushen. Scheitert der Push (neue Eingaben
   vom Handy während des Updates), einmal `git pull --rebase` und erneut pushen; die neuen Dateien spielt das nächste Update ein.

### Format `work/new.json`
```json
{
  "activities": [{"garmin_id": 0, "name": "", "type": "road_biking", "start_local": "2026-10-30T18:30:00",
                  "duration_s": 0, "distance_m": 0, "elev_gain_m": 0, "avg_hr": 0, "max_hr": 0,
                  "avg_power": null, "np": null, "hr_zones_s": [z1, z2, z3, z4, z5], "notiz": null}],
  "notizen_garmin": {"25000000000": "Text der Notiz wie in Garmin", "25000000001": null},
  "days": [{"date": "2026-10-30", "hrv": 0, "rhr": 0, "sleepH": 0, "sleepScore": 0, "sleepStress": 0, "kcalOut": 0,
            "kcalIn": 0, "protein": 0, "carbs": 0, "fat": 0, "readiness": 0, "readinessLevel": "MODERATE", "bodyBattery": 0,
            "bbSleep": 0, "bbHigh": 0, "bbLow": 0, "stress": 0, "stressHighMin": 0}],
  "weights": [{"date": "2026-10-30", "kg": 0, "ts_gmt": 0}],
  "planned": [{"date": "2026-11-02", "title": "", "sport": "rad", "dur_s": 3600, "wid": 0, "quelle": "Enduco über Garmin", "desc": "",
               "steps": [{"type": "warmup", "end_condition": "time", "end_condition_value": 600, "target_type": "power.zone",
                          "target_value_low": 120, "target_value_high": 180}]}],
  "planned_range": ["2026-10-31", "2026-11-14"],
  "workouts_neu": [{"wid": 0, "title": "", "sport": "cycling", "dur_s": 0, "erstellt": "2026-11-08T07:39:40", "desc": "", "steps": []}],
  "food_logs": [{"date": "2026-11-08", "dailyCalories": 0, "dailyCarbs": 0, "hydration": {"valueInML": 0, "activityIntakeInML": 0, "sweatLossInML": 0, "lastEntryTimestampLocal": ""},
                 "items": [{"logId": "", "foodName": "", "brandName": null, "servingQty": 1.0, "numberOfUnits": 1.0, "servingUnit": "SERVING",
                            "calories": 0, "carbs": 0, "sodium": null, "mealName": "SNACKS", "mealTime": "10:45:00", "logTimestamp": "2026-11-08T12:52:14.000Z"}]}],
  "config": {"days_backfill": "2026-04-04", "wellness_backfill": "2026-10-20"}
}
```
`config` ist optional und wird in `data.json` übernommen (nur die angegebenen Schlüssel). `"lauf": "nacht"` bzw. `"morgen"` (V5.9.2) setzt
`updated_lauf` (die Seite zeigt «Stand 08:31 (Morgen-Update)»).
Zuordnung: `type` = Garmin-Typ aus `get_activity`; `start_local` = `start_time_local`; `duration_s` = `duration_seconds`;
`elev_gain_m` = `elevation_gain_meters`; `avg_hr` = `avg_hr_bpm`; `avg_power` = `avg_power_watts`; `np` = `normalized_power_watts`;
Tage: `hrv` = `avg_overnight_hrv`, `rhr` = `resting_heart_rate_bpm`, `sleepH` = `sleep_hours`, `sleepScore` = `sleep_score`,
`sleepStress` = `avg_sleep_stress`, `kcalOut` = `total_calories` (nur abgeschlossene Tage), Ernährung nur für abgeschlossene Tage mit
`item_count` ≥ 4. V6.1 (wellness-1.0, `tools/wellness.py`): `readiness` = `score`, `readinessLevel` = `level` aus `get_morning_training_readiness`;
aus `get_user_summary`: `bodyBattery` = `bodyBatteryAtWakeTime`, `bbSleep` = `bodyBatteryDuringSleep`, und nur für abgeschlossene Tage
`stress` = `averageStressLevel`, `stressHighMin` = `highStressDuration` ÷ 60 (gerundet), `bbHigh` = `bodyBatteryHighestValue`,
`bbLow` = `bodyBatteryLowestValue`; negative Garmin-Werte = fehlend (`null`). Notiz: `notiz` bzw. `notizen_garmin` = `description` aus `get_activity`.
Gewicht: `weight_kg`, `ts_gmt` = `timestamp_gmt` (alle Messungen; das Skript nimmt pro Tag die Morgenmessung).
Leere Werte als `null`. Unbekannte Felder weglassen. Werte nie schätzen.

## Morgen-Update (V5.9.2, morgen-1.0, täglich 08:30, nur lesend auf Garmin)
Zweck: das Workout des Tages und die Werte der letzten Nacht auf «Heute», bevor Silas trainiert (er exportiert Enduco-Workouts oft erst am
Morgen nach Garmin). Keine Aktivitäten, keine FIT-Dateien, keine Sekundenreihen – das bleibt beim Nacht-Update. Nach Garmin wird nichts
geschrieben, Enduco-Workouts werden nie geändert. Jeder Abruf, der fehlschlägt, wird weggelassen: kein Abbruch, keine Nachricht.
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Über die Garmin-Verbindung, Zuordnung der Felder wie im Nacht-Update:
   - `get_sleep_summary_range` von gestern bis heute → `days` mit nur `hrv`, `rhr`, `sleepH`, `sleepScore`, `sleepStress` (Nächte ohne Werte weglassen).
   - `get_stats_range` für heute → `rhr` von heute, falls es im Schlaf fehlt. Kein `kcalOut` und keine Ernährung: der Tag läuft noch.
   - V6.1: `get_morning_training_readiness(heute)` → `readiness`, `readinessLevel`; `get_user_summary(heute)` → nur `bodyBattery`, `bbSleep`;
     `get_user_summary(gestern)` → `stress`, `stressHighMin`, `bbHigh`, `bbLow` (und `bodyBattery`, `bbSleep`) für gestern. Kein Nachholen.
   - `get_scheduled_workouts` heute bis +14 Tage, je Einheit mit `workout_id` `get_workout_by_id` → `planned` und `planned_range`,
     genau wie im Nacht-Update (Workout-Schritte V5.7).
   - `get_workouts` → `workouts_neu` wie im Nacht-Update (Enduco, letzte 2 Tage, nicht im Kalender, höchstens 5).
3. `work/new.json` mit `"lauf": "morgen"` und nur diesen Feldern schreiben, `python3 -I tools/merge_daily.py data.json work/new.json` (ohne
   fit.jsonl). Danach die Eingaben vom Handy wie im Nacht-Update (Schritt 3 «Eingaben vom Handy», mit Bestätigungen und Prüfung).
4. `SPUREN_PW=… node tools/crypt.mjs encrypt data.json data.enc.json`, dann «Eingang aufräumen» wie im Nacht-Update (keine Sekundenreihen).
   Commit «Morgen-Update JJJJ-MM-TT» mit `data.enc.json` (und den Löschungen in `eingang/`), auf `main` pushen. Scheitert der Push: einmal
   `git pull --rebase`, erneut pushen. Gibt es dabei einen Konflikt in `data.enc.json`: `git rebase --abort`, `git reset --hard origin/main`,
   Schritte 1, 3 und 4 mit dem schon geschriebenen `work/new.json` wiederholen und pushen.
5. Schlägt Entschlüsseln, `merge_daily.py` oder auch der zweite Push fehl: nichts committen (`data.enc.json` bleibt unverändert) und Silas
   kurz informieren. Klappt alles: keine Nachricht.
Das Nacht-Update danach ersetzt dieselben Tage, Workouts und `workouts_neu` (nichts doppelt).

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
5. verschlüsseln, dann `SPUREN_PW=… node tools/serien_crypt.mjs` (nur neue/geänderte Reihen; Reihen unter altem Namen werden auf die gid
   umbenannt; entfernt verwaiste, bricht das Löschen ab, wenn mehr als 5 % verwaist wären) und
   `SPUREN_PW=… node tools/serien_pruefen.mjs --git` («PRÜFUNG REIHEN: bestanden»), `data.enc.json` und `serien/` committen, pushen.

## Eingaben von der Seite (V5: Fueling, Befinden, Tests vom Handy, Koppelläufe, Pläne, B1)
**Seit V5.9.3 der Normalfall: «Direkt speichern»** (Abschnitt «Eingang»): Jede Eingabe geht verschlüsselt nach `eingang/`, Morgen- und
Nacht-Update spielen sie ein. Der Export bleibt der Rückweg (ohne Schlüssel, ohne Netz, anderes Gerät):
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
Prüfung ersetzen; nie Einnahmen aus Garmin schätzen oder ergänzen. V5.7.2: Einnahmen aus Garmin nur aus dem Ernährungsprotokoll mit Uhrzeit
(`fueling-garmin-1.0`: nur Rad/Laufen ab 40 min, Tag stimmt mit den Tageswerten, Uhrzeit zwischen Start und Ende, erst danach erfasst); eigene Fueling-Einträge haben
Vorrang, auf der Seite bearbeitete Garmin-Einträge (`geaendert`) werden nie überschrieben.
V6.1 (notizen-1.0): Verpflegung aus der Garmin-Notiz einer Aktivität nur als Vorschau `fueling_vorschau` («fn-<gid>», Werte laut Notiz,
Summe gegen «Total»); zu `fueling` wird sie erst, wenn Silas den Eintrag auf der Seite speichert (kommt als `fueling_add` «fn-…» zurück).
Gibt es zur Einheit schon einen Fueling-Eintrag, entsteht keine Vorschau; nie aus der Notiz etwas ergänzen oder schätzen.
V5.6: zusätzlich `rpe` (→ `rpe`), `intervalle` (Korrekturen von Hand → `intervall_korr`), `laktat_punkte` (Laktat einem Abschnitt
zugeordnet → `laktat_punkte`, Status «vorschau») und `saison` (Stunden «jetzt»/«Spitze» → `saison_plan`); gleiche ID ersetzt mit Audit.
V5.7: `startorte` (ganze Liste → `startorte`, alte Fassung ins Audit) und `trainingsrouten` (gewählte Vorschläge → `trainingsrouten`, gleiche
ID ersetzt mit Audit). Startorte und Routen nur verschlüsselt (data.enc.json), nie offen ins Repository.
V5.9.3: `routen` (im Planer gespeicherte Routen → `routes`, gleiche ID ersetzt mit Audit), `routen_entfernt` (auf der Seite gelöscht → aus
`routes` entfernt, alte Fassung ins Audit), `laktat_punkte_bestaetigt` («Laktat hier» aus dem Explorer auf der Seite bestätigt → Kurzcheck in
`lactate`, Quelle «aus Explorer», Punkt «übernommen»; übernommene Punkte werden nie wieder «vorschau»). Befinden kommt aus dem Morgen-Check-in
(`befinden-1.1`: Beine → `muskel`, Energie → `muede`, Kopf → `stress`, je 1–5; dazu `krank`, `notiz`; gleicher Tag ersetzt mit Audit).

## Eingang (eingang/, V5.9.3 «Direkt speichern», eingang-1.0)
- Die Seite legt jede Eingabe als `eingang/<JJJJMMTT>T<hhmmss>Z-<8 Hex>.bin` an (GitHub-Contents-API, Commit «Eingang»). Format EGS1:
  «EGS1» | IV | AES-256-GCM(Länge | gzip(JSON) | Nullen) | Tag, Seitenschlüssel wie data.enc.json, Datei auf eine Zweierpotenz ≥ 16 KiB
  aufgefüllt. Öffentlich sichtbar bleibt nur, dass und wann eine Eingabe kam. Bestätigungen (Laktat B1, Explorer) kommen in eine eigene Datei.
- Zugang: feingranularer GitHub-Schlüssel nur für sileyhunter/spuren, «Contents: Read and write», 1 Jahr gültig (E4). Er liegt mit dem
  Seitenschlüssel verschlüsselt auf dem Gerät (`sf.eg.schluessel`), nie im Repository, nie im Chat. Ohne Netz oder Schlüssel wartet die Eingabe.
- Nur Morgen- und Nacht-Update löschen Dateien in `eingang/`, und nur die eingespielten (`tools/eingang.mjs aufraeumen`). Abgelehnte Dateien
  (Demo, fremd, nicht entschlüsselbar) bleiben liegen und werden gemeldet. `tools/eingang.mjs pruefen --git`: nur gültige, aufgefüllte EGS1-Dateien.

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
  Profile: Rennrad eigenes Profil `brouter/rennrad-asphalt.brf` (aus `fastbike`, ohne Gravel; Rückfall `fastbike`), Gravel `gravel` (`prefer_unpaved_paths=1`), MTB Aufstieg `gravel` (`prefer_unpaved_paths=1`),
  Abfahrt wählbar, Singletrail `mtb` (`StrictNOBicycleaccess=1`, seit V5.8 nur noch als Abfahrt), Laufen/Trail/Wandern `hiking-mountain` (SAC-Grenze 1/3/wählbar), immer `processUnusedTags=1`.
  Profil-Parameter nur als Zahlen (`1`/`0`), nie `true`/`false` (Server bricht sonst mit HTTP 500 ab).
- Koordinaten werden erst nach Zustimmung im Planer gesendet (Routing an BRouter, Wetter an Open-Meteo); keine Schlüssel, kein Backend.
- Nie eine Luftlinie als Ersatz zeichnen oder als GPX speichern. Abschnitte «von Hand» (`hand-1.0`) gibt es nur auf ausdrückliche Wahl
  (Skitour, «→ von Hand» je Abschnitt, «Lücke von Hand schliessen», ohne Routing-Zustimmung): gerade Linien zwischen den gesetzten Punkten,
  gekennzeichnet (gestrichelt, Belag/Wegart/Zugang «von Hand / nicht geprüft»), im GPX genannt – nie als erlaubter Weg ausgegeben.
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

## Planer V5.8 (Wünsche vom 9.11.2026)
- Wegpunkte `wegpunkte-1.1`: Punkt-Modus bleibt an, keine Obergrenze; neuer Punkt zwischen die Wegpunkte, zwischen denen er auf der Linie liegt
  (gleich nahe Abschnitte ±10 m: kleinerer Umweg), ohne Linie kleinster Umweg. Ein Punkt in einem Abschnitt von Hand macht beide Teile von Hand.
- Skitour `skiroute-1.0`: swisstopo-Ebene `ch.swisstopo-karto.skitouren` über identify (Rechteck in LV95, `sr=2056`, 50 je Seite, höchstens 4 Seiten,
  nur nach Zustimmung `consent.skirouten`); Netz mit 12 m Zusammenlegen und 20 m Anschluss; Weg nur bis 150 m neben der Route und höchstens
  1,8 × Luftlinie + 800 m, sonst von Hand mit Grund. Quelle nennen: «swisstopo, mit dem SAC», nicht markiert, keine Haftung, keine Lawinenaussage.
- Hangneigung `hangneigung-1.0`: Gelände, nicht Spur; Höhenraster Mapzen/AWS Terrain Tiles (Zoom 14, bei sehr langen Touren 13), ±15 m, an der
  Linie und 20 m seitlich, Maximum je 20 m. Klassen nach SLF (30/35/40°) plus 25° als Hinweis; fehlendes Raster = unbekannt, nie 0°.
  Keine Lawinenbeurteilung behaupten.
- Wandern/Trail `wegende-1.0`: Lücke ab 60 m zwischen Punkt und Wegnetz zeigen (ohne Linie); schliessen nur auf Knopfdruck.
- MTB `mtb-abfahrt-1.0`: Aufstieg Gravel-Profil mit `prefer_unpaved_paths=1`; Abfahrten erst auf Knopfdruck (Singletrail `RT.MTB_TRAIL`, andere
  Strasse `RT.MTB_STRASSE` mit Sperrpunkten auf dem Aufstieg, gleicher Weg nur bei Rundtour ≤ 60 m); MTB-Skala nie raten; «gleich wie» nur aus
  den Abfahrten (`RT.istDoppelt` mit Bereichen), nie aus der ganzen Route mit dem gemeinsamen Aufstieg.
- Rennrad `varianten-3.0`: direkteste, velofreundliche, ruhigste (consider_traffic 1) – alle über das Profil ohne Gravel; `alternativen-1.1` ohne
  zusätzlichen Gravel. Windpfeile `windpfeile-1.1`: 3–20, Gegen-/Rückenwind ±5 km/h, abschaltbar (`sf.rt.windkarte`).
- Heute `ringe-1.0` (`FK.ringeVerlauf`): Erholung Φ((z_lnHRV − z_Ruhepuls)/2) gegen 60 Tage (mind. 14 Werte), Schlaf = Garmin-Schlafwert genau dieser
  Nacht, Belastung = (1 − 2^(−TSS/CTL_Vortag)) · 100; alle 0–100 %, Lücken bleiben leer, Tag mit Datum. Kein medizinisches Mass.

## Bedienung V5.9.5 (bedienung-1.0)
- Start auf «Heute» (Hash-Links wie `#laktat`, `#plan` oder `#checkin` gehen direkt; `#checkin` öffnet das Check-in-Blatt). Fünf Bereiche in
  der Leiste unten (`#leiste`, `GRUPPEN` in index.html, seit V6.0.2): Heute · Kalender · Plan · Analyse (training, laktat, ausdauer, leistung,
  koerper, schwimmen) · Karte; die Ansichten (`section.view`, `showTab(name)`) bleiben einzeln, oben wechselt `nav.unter` (wischbar).
  Im Planer (`body.plan-aktiv`) keine Leiste.
- Info-Knopf (`V59.ansicht`): Erklärtexte (`.sub` ohne id, `.hint`) einer Karte mit Ergebnis liegen hinter «i»; Warnungen (`.warn-t`, `.down`),
  `.verdict`, Status (`role=status`, `aria-live`) und `.keep` nie verstecken. Neue Erklärtexte deshalb als `.hint`, Warnungen mit `.warn-t`.
- Breite Tabellen: `data-liste` an der Tabelle (oder zu breit auf ≤ 640 px) → Liste (`.als-liste`, Spaltenname je Zelle). Tabellen, die
  nie Liste werden sollen: `data-keine-liste`.
- Ausblenden statt löschen: `hidden data-ausgeblendet="Grund"` an der Karte (mit id); Einstellungen → «Ausgeblendete Karten» blendet je Gerät ein.

## Design V6 (design-1.0, Vorlage «enduco als Vorbild» vom 13.11.2026)
- Übernommen werden Aufbau, Bedienlogik und Farbsprache, nie Texte, Logos, Symbole, Fotos oder Grafiken von enduco; eigene Symbole in `V6.ICON`.
- Eine Zone, eine Farbe: nur über `--zc-…` (css/v6.css) bzw. `V6.ZONEN`; Sportarten `--sp-…`, Monitoring `--mon-…`, Rennen und heute `--race`.
  Dunkel ist Standard, «Hell» je Gerät (`sf.theme`). Neue Blätter über `V59.blatt(art, html)` mit `.blatt-titel`, `.blatt-fuss` (Zurück links
  `.btn-zurueck`, Hauptaktion rechts `.btn.primary`), Kennzahlen als `.kv`, Abschnittstitel als `.abschnitt`.
- Heute (V6.0.1): Kacheln Ampel/Status/Check-in, Begrüssung mit Check-in-Blatt, Heutiges Training (Karten mit Zonen-Chips und Balkenprofil,
  Einheit als Blatt), Wochenleiste. Balkenprofil `profil-1.0`: Breite = Dauer, Höhe = Lage im aktiven Zonenprofil, Farbe = Zone (Unterzonen
  aus dem Text der Zone, z. B. «FatMax 220–240»); ohne Zielbereich grau, ohne Dauer blass. Fokus = Zeitanteile der aktiven Schritte ohne
  Ein-/Ausfahren und Erholung, ab 10 %, höchstens drei. Trainingsstatus `status-1.0` aus der Form (Bänder nach Coggan); «Übertraining» nie.
- Plan (V6.0.2, `js/v6-plan.js`): Rennen (A/B nach `V6.rennenPrio`, Streckenlängen nur bei bekanntem Format, keine Zielzeit erfunden),
  Phasen aus `AN.saison` als Zeitstrahl, Wochenübersicht (absolviert gefüllt, geplant als Rand, Phase als Streifen), Wochenstunden-Vorschlag
  (`V56.saison`) und Testkalender. Kalender: Wochenband «KW · Phase · Stunden · TL», heute orange, Sport-Symbole, Fokus-Punkte, Tagesliste
  mit Mini-Profilen (antippen öffnet die Einheit).
- Die Seite schreibt nichts nach Garmin oder Enduco: keine Knöpfe zum Anlegen, Verschieben, Starten oder Exportieren von Workouts.

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
- Lange Ausfahrt `langfahrt-2.0`: Sollband für Grundlage/Long Ride aus dem aktiven Zonenprofil (Z2 Watt nach Dauer: 1 h oberstes Viertel,
  ab 5 h unterstes Viertel, linear dazwischen; Puls Ende Z2 als Obergrenze); das beobachtete Band (Fahrten ähnlicher Dauer) steht daneben,
  Renn-Pacing bleibt beobachtet. Nie eigene Zonenwerte in öffentliche Tests oder Doku schreiben.
- RPE `rpe-1.0`: CR-10 nach Foster (modifizierte Borg-Skala), sRPE = RPE × Bewegungsminuten; Kalibrierung mit Morgenwerten erst ab 20 Paaren, nur Rangkorrelation, keine Prozentwerte.
- Energie `energie-1.0`: aufgenommen nur aus dem Fueling-Protokoll; Verbrauch Rad aus kJ mit Wirkungsgrad 22–25 % (Annahme); KH-Anteil
  je Garmin-Pulszone ist ein Modell; Richtwert Jeukendrup 2014. Nie Gelmengen oder Stoffwechselwerte erfinden.

## V5.7: Smart Training Routes (Trainingskalender und Routenplaner, kein eigener Tab)
- Workout `workout-1.1` (V6.0.1): feste Pause (`fixed.rest`) = Zeit; Schwimmstrecken aus der Pace der Beschreibung geschätzt («≈»); Dauer aus den
  Schritten nur, wenn jeder Schritt eine Zeit oder Schätzung hat, sonst laut Kalender.
- Workout `workout-1.0`: Schritte aus der Garmin-Verbindung (Enduco schreibt Watt, Tempo in m/s oder Puls), Wiederholungen aufgefaltet;
  intensiv = Mitte des Zielbereichs ab Z3 des aktiven Zonenprofils; Leistung ≤ 150 überall → «Watt oder % FTP?» offen, nie geraten.
  Dauertraining (Grundlage, Sprints < 10 %, Trail, Wandern) Ziel ±5 %, sonst ±10 %. **Keine direkte Enduco-Schnittstelle**, Workouts nie ändern.
- Vorschläge `trainingsroute-1.0`: Rundtour = Kreis durch den Start (3 Zwischenziele), 6 Richtungen, dann Radius nach der echten
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

## Prüfen vor jedem Push von Seite oder Werkzeugen
`node --test tests/test_formkurve.cjs`, `node --test tests/test_route.cjs`, `node --test tests/test_analyse.cjs`, `node --test tests/test_training.cjs`, `node --test tests/test_v59.cjs`, `node --test tests/test_v6.cjs`, `node --test tests/test_v61.cjs`, `node --test tests/test_v62.cjs`, `python3 -I tests/test_tools.py`, `python3 -I tools/make_demo.py`, bei Datenänderungen `check_referenz.py`.
Kein Live-Push, wenn ein Test fehlschlägt. Screenshots mit echten Daten nie ins Repo.

## FTP und Trainingslast
- Auf Silas' Wunsch sind die FTP-Karten (Fortschritt «Trainingslast: Garmin-FTP …», Leistung «Rad: FTP und Watt/kg») ausgeblendet
  (`data-ausgeblendet`); Daten und Werkzeuge bleiben. Er trainiert nach Laktat und testet keine FTP.
- `tss` ist die ursprüngliche Trainingslast (Rad mit der in Garmin eingestellten FTP). Sie wird nie überschrieben.
- **V5.9.1 last-2.0 (E1):** `tl2` je Aktivität neben `tss` (`tools/last.py`, rechnet `merge_daily.py` bei jedem Einspielen für alle
  Aktivitäten neu, also auch im Nacht-Update): Rad mit NP = Timer-Dauer × (NP / LT2)² × 100, LT2 aus `config.last_ref.rad` (je Datum der
  letzte Test davor, vor dem ersten der erste, gekennzeichnet; nie FTP, keine Umrechnung zwischen Leistungsmessern); sonst `tl2` = `tss`.
  Hinterlegt seit 9.11.2026: die LT2-Vorschau aus dem Rad-Stufentest 29.4.2026, «vorläufig» (Test nicht ausbelastet; Wert nur verschlüsselt
  in den Daten, nie in Doku oder Tests). Vergleich: `python3 -I tools/last.py data.json
  --vergleich [--wochen 12] [--bis JJJJ-MM-TT]`.
- **Neuer Rad-Stufentest:** erst nach B1 (bestätigt) und `check_referenz.py` «GESAMT: bestanden» einen Eintrag ergänzen
  (`ab` = Testdatum, `lt2_w`, `lt2_genau_w`, `methode`, `test` = ID in `schwellen.tests`, `quelle`, `status`, `festgelegt`) – mit Silas' Okay
  zur Methode, nie eine Schwelle ausserhalb der Stufen. Über `work/new.json` `"config": {"last_ref": {…}}` mit der **ganzen** Liste (config
  ersetzt den Schlüssel), dann `merge_daily.py`. Ältere Einträge bleiben (Fahrten davor rechnen weiter mit ihnen).
- `config.load_model` steuert, was die Seite verwendet: `"garmin"` (Standard, `tss` wie geliefert), `"last-2.0"` (`tl2`; erst nach Silas'
  Okay zum Vergleich) oder `"ftp_est"` (alte Probe aus NP und `ftp_e`, nicht mehr verfolgt). Die Seite zeigt den Vergleich in Fortschritt
  «Wochenlast je Sportart».
- `config.ftp` bleibt der Garmin-Wert (für `tss` im Nacht-Update); die Seite braucht ihn mit last-2.0 nicht mehr.
- Einspielen ohne Garmin-Daten (nur `config`, Laktat, Eingaben) lässt `updated` («Daten vom …») stehen.

## Laktat (kommt über den Chat)
- **Kurzcheck** (meist Zwift, Block z. B. 10 min @ 220 W, Laktat am Ende des Blocks): Einheit finden, Block über Runden
  (`get_activity_splits`) oder eine hochgeladene FIT-Datei bestimmen. Werte: NP, Puls Ø, Puls max, Pulsanstieg
  (Ø 2. Hälfte gegenüber 1. Hälfte in %).
  Eintrag: `{"kind":"check","date":"…","sport":"rad","block":"10 min @ 220 W","w":220,"np":…,"hr_avg":…,"hr_max":…,"drift":…,"lactate":…,"note":"…","activity":"g<ID>"}`
- **Stufentest** (Laktat in der letzten Minute jeder Stufe): Puls je Stufe aus der letzten Minute.
  Eintrag: `{"kind":"stufentest","date":"…","sport":"rad","stages":[{"w":180,"hr":132,"la":1.1}],"note":"…"}`; Lauf mit `"pace_s"` (s/km) statt `"w"`.
- Einträge über `"lactate_add": [ … ]` in `work/new.json` einspielen (merge_daily.py), dann verschlüsseln und pushen.
- **Kurzchecks aus Garmin-Notizen** (z. B. «Min 40: x,x mmol/l | 10 min davor (30–40) …»): seit V6.1 legt `merge_daily.py` daraus selbst eine
  Vorschau an (notizen-1.0, «ln-<gid>-<Minute>», Werte laut Notiz, nicht aus FIT nachgerechnet; nichts doppelt zu `lactate`, anderen Vorschauen
  oder `laktat_punkte`). Nachrechnen aus FIT wie bisher über `laktat_vorschau.py --extra` mit derselben ID, `aktivitaet_garmin` (gespeicherte
  `get_activity_fit_data`-Antwort), `aktivitaet_id` und `fenster` (Ortszeit des Blocks; hat Silas vor dem Abstechen schon angehalten, das
  Fenster bis zum Anhalten nehmen und das im Hinweis sagen). Bestätigung (B1) auf der Seite oder im Chat («bestätigt» → `"laktat_bestaetigt": [ids]`).
- **V5.9.6 Einzelmessungen über die Zeit (`laktat-drift-1.0`):** `laktat_vorschau.py` rechnet je Check-Block `t_s` (Fahrzeit bis zum Blockende),
  `el_s`, `pause_s`, `pause_timer_s`; B1 übernimmt sie nach `lactate`. Die Seite («Einzelmessungen») zeigt Laktat über die Zeit in der Einheit,
  verbindet nur gleiche Einheit und gleiche Leistung (±5 %) und urteilt «steigt/gleich/sinkt» erst über 2·√(σ₁² + σ₂²), σ = max(0,15; 7,5 %).
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
`tests` in den Daten: `[{"date":"…","kind":"stufentest"|"check"|"css","note":"…","status":"vorschlag"|"geplant"}]`.
Änderungen über `"tests": [ … ]` (ersetzt die ganze Liste) in `work/new.json`. Erledigt: Laktat-Tests durch einen Eintrag in `lactate` gleicher
Art, CSS-Tests durch einen CSS-Test in `css_tests` (bzw. auf dem Gerät), je höchstens 4 Tage daneben (`V59L.testsMitStatus`).
**Schwimmen (V5.9.4, css-2.0, E6):** Als Schwimm-Massstab zählt nur der CSS-Test (400 m und 200 m; CSS = (T400 − T200) ÷ 2 pro 100 m).
Termine (`kind` «css», «geplant»): 19.11.2026 Ausgangswert, 7.1.2027 vor Thailand, 11.2.2027 nach dem Trainingslager, 25.3.2027 vier Wochen
vor Jesolo, 13.5.2027 nach Jesolo, vor Hamburg – nicht an Kursabenden und nicht in Thailand. Eintrag auf der Seite mit zwei Zeiten (Rest
optional), über «Direkt speichern» → `css_tests`. Rohpace aus Garmin, Videovergleich und Fehlerboard sind ausgeblendet (Daten bleiben);
Technik wertet Claude im Chat aus (Videos Bild für Bild), nie auf der Seite.
Protokoll-Vorlagen: `protokolle` (Liste mit `id name sport ablauf blut ende rahmen status`), ändern über `"protokolle": [ … ]` in `work/new.json`.
**Testplan (V6.2, testplan-1.0, `js/v62.js`):** Die Seite schlägt Tests nach festen Regeln selbst vor (Status «vorschlag», Regel sichtbar), in
Testkalender, Kalender und auf Heute (heute/morgen): CSS alle 6–8 Wochen am gleichen Wochentag wie zuletzt; Rad-Stufentest alle 8 Wochen am Samstag
einer Erholungswoche (saison-1.0), zuerst ein ausbelasteter, wenn der letzte es nicht war; Lauf-Stufentest alle 8–12 Wochen in einer anderen
Erholungswoche; Kurzcheck alle 2 Wochen in einer Grundlagenfahrt (rollend 8 Wochen, nicht 4 Tage neben einem Stufentest); kein Stufentest 14 Tage
vor einem Rennen, in der Woche danach und im Taper. Eingetragene Termine (`tests`) gehen vor; Regelverstösse werden mit einem Vorschlag gezeigt,
nie still geändert. Abwesenheiten («keine Tests») trägt Silas auf der Seite ein (Notiz `tp-sperren`, verschlüsselt über «Direkt speichern»);
nie Reisedaten in Doku, Code oder Tests schreiben. Nach Garmin wird nichts geschrieben.

## Test-Workouts (A9)
`python3 -I tools/workouts.py <ordner>` erzeugt `.zwo` (Zwift, ftpOverride 100 → Power 1.2 = 120 W) und `.garmin.json`
(für `upload_workout`, Leistungsbereich `power.between`, eine Runde je Stufe). **Nie ohne Silas' Freigabe hochladen,
einplanen oder an ein Gerät senden.** Mit Freigabe: `upload_workout` → `schedule_workout(Datum)`; enduco-Workouts nie ändern.

## Referenzsatz und Versionen (A1)
Der Referenzsatz (10 Einheiten mit Handwerten) liegt nur verschlüsselt in `data.json` unter `referenz`, nie offen im Repo.
Jede Kennzahl hat eine Version (`versions`). Ändert sich eine Regel: Version erhöhen, `check_referenz.py` laufen lassen,
Abweichungen Silas zeigen, erst dann neue Werte speichern.
