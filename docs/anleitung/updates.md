## Nächtliches Update (nur Garmin-Verbindung)
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Letztes Aktivitätsdatum in `data.json` bestimmen. Dann über die Garmin-Verbindung:
   - `get_activities_by_date` von (letztes Datum − 2 Tage) bis heute, alle Seiten.
   - pro Einheit `get_activity` (Leistung, NP, Höhenmeter, Dauer) und `get_activity_hr_in_timezones` (Zeit in Zone 1–5).
   - `get_sleep_summary_range` letzte 7 Nächte; `get_stats_range` letzte 7 Tage; `get_nutrition_summary_between_dates` letzte 7 Tage; `get_weigh_ins` letzte 14 Tage; `get_scheduled_workouts` heute bis +14 Tage.
   - **Tageswerte (V6.1, wellness-1.0):** `get_morning_training_readiness(heute)`, `get_user_summary(gestern)` (abgeschlossener Tag) und
     `get_user_summary(heute)` (nur `bodyBattery`, `bbSleep`) → `days` (Zuordnung unten). «No … data found» oder Fehler: weglassen.
   - **Nachtwerte (V8.4, nacht-1.0, für die Ampel readiness-3.0):** `get_sleep_data(heute)` – die Antwort ist gross und wird als Datei gespeichert; die Datei nicht lesen,
     nur `python3 -I tools/wellness.py nacht <pfad>` → ein Tag mit `atem`, `haut`, `spo2`, `spo2min`, `schlafBedarf` (nur vorhandene Werte); ist die Ausgabe nicht `{}`,
     als zusätzlichen Eintrag in `days` aufnehmen. Fehler: weglassen, kein Abbruch, keine Nachricht.
   - **Notizen (V6.1, notizen-1.0):** für jede Aktivität, die du mit `get_activity` abrufst, `description` unverändert als `notiz` (fehlt sie:
     `null`). Die Notiz nie ändern, kürzen oder zusammenfassen; `merge_daily.py` macht daraus Vorschauen für Laktat und Verpflegung.
   - **Selbsteinschätzung (V8.1, nachher-1.0):** aus derselben Antwort von `get_activity` `workout_rpe` und `workout_feel` unverändert in den Eintrag der
     Aktivität (fehlen sie: `null`). `merge_daily.py` legt sie je Garmin-ID in `garmin_selbst` ab (`rpe_g` 1–10, `feel_g` 0/25/50/75/100); die Seite schlägt
     sie unter «Nach dem Training» vor. Nie selbst etwas eintragen oder nach Garmin schreiben.
   - **Eigene Lebensmittel (V8.1.1, verpflegung-1.0):** `get_custom_foods(start=0, limit=20)`, dann `start` 20, 40 … solange `moreDataAvailable` true ist (höchstens
     10 Seiten; ein `limit` über 20 lehnt Garmin ab). Jede Antwort unverändert als `work/lm_<n>.json` speichern (kommt sie als Datei, deren Pfad nehmen), dann
     `python3 -I tools/verpflegung.py liste work/lm_*.json > work/lebensmittel.json` und in `work/new.json` `"garmin_lebensmittel"` = Inhalt dieser Datei (ganze Liste,
     ersetzt die bisherige). Schlägt eine Seite fehl: den ganzen Schritt weglassen (sonst fehlten Produkte), kein Abbruch, keine Nachricht. Nie Lebensmittel in Garmin
     anlegen, ändern oder löschen.
   - **Workout-Schritte (V5.7, für «Passende Route finden»):** für jede Einheit aus `get_scheduled_workouts` mit `workout_id`:
     `get_workout_by_id(workout_id)` (vereinfachte Form, nicht `raw`) und im `planned`-Eintrag ergänzen: `wid` = workout_id,
     `quelle` = `<provider> über Garmin` (z. B. «Enduco über Garmin»), `desc` = erster Satz der Beschreibung (höchstens 200 Zeichen),
     `steps` = `segments[0].steps` unverändert (type, description, end_condition, end_condition_value, target_type, target_value_low/high,
     secondary_target_*, repeat_count, stroke_type, equipment_type, steps). **V6.5 (Enduco-Bibliothek):** zusätzlich `desc_voll` =
     `description` unverändert und vollständig, `geaendert` = `updated_date`, `erstellt` = `created_date`. Danach `get_workouts`: Workouts mit `provider` «Enduco», `created_date` in den letzten
     2 Tagen und nicht im Kalender → höchstens 5 als `"workouts_neu"` (je `get_workout_by_id`; Format unten, mit denselben Feldern; ersetzt die alte Liste).
     Schlägt ein Abruf fehl: ohne Schritte weitermachen, kein Abbruch, keine Nachricht. Enduco-Workouts nie ändern.
   - **Enduco-Bibliothek (V6.5, bib-1.1, `tools/bibliothek.py`):** Die Antwort von `get_workouts` ist gross und wird als Datei gespeichert;
     den Pfad merken (die Datei nicht abschreiben). Nach dem Einspielen in Schritt 3: `python3 -I tools/bibliothek.py liste data.json <pfad>`
     (alle Enduco-Workouts mit Volltext; nichts wird gelöscht, Änderungen werden neue Versionen). Kommt die Antwort ausnahmsweise direkt
     statt als Datei: diesen Schritt weglassen. Fehlschlag: kein Abbruch, keine Nachricht.
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
     a) Tageswerte: `python3 -I tools/wellness.py offen data.json` nennt die Tage dieser Nacht (`tage`, höchstens 20) und davon die mit
        Readiness (`readiness`); je Tag `get_stress_summary` (nur `stress` = `avg_stress_level`) und für die Readiness-Tage
        `get_morning_training_readiness` → zusätzliche Einträge in `days`, dann `"config": {"wellness_backfill": "<neuer_zeiger>"}`.
        Kein `get_user_summary` beim Nachholen (zu gross); Body Battery gibt es nur ab jetzt. Bei `"fertig": true` nichts nachholen.
     b) Notizen: `python3 -I tools/notizen.py offen data.json` nennt höchstens 20 Garmin-IDs ohne abgerufene Notiz bzw. (V8.1) aus den letzten 90 Tagen ohne
        abgerufene Selbsteinschätzung; je ID `get_activity` → `"notizen_garmin": {"<ID>": <description oder null>}` und
        `"selbst_garmin": {"<ID>": {"workout_rpe": <Wert oder null>, "workout_feel": <Wert oder null>}}`.
     c) Enduco-Bibliothek (V6.5): `python3 -I tools/bibliothek.py offen data.json` nennt unter `wids` höchstens 10 Workouts ohne Schritte;
        je ID `get_workout_by_id(<ID>)` (vereinfachte Form) → `"enduco_schritte": [{"wid", "titel" = name, "sport", "erstellt" = created_date,
        "geaendert" = updated_date, "desc_voll" = description, "steps" = segments[0].steps unverändert (alle Felder), "dauer_s" =
        estimated_duration_seconds, "distanz_m" = estimated_distance_meters, "pool_m" = pool_length}]` (fehlende Felder weglassen).
        Bei `"fertig": true` nichts nachholen.
     Schlägt ein Abruf fehl: bei a) den Zeiger nicht verschieben, bei b) die ID weglassen (nächste Nacht erneut), bei c) `{"wid": <ID>, "fehlt": true}`
     (nach drei Fehlversuchen fragt `offen` nicht mehr danach); kein Abbruch, keine Nachricht.
3. `work/new.json` schreiben (Format unten, mit `"lauf": "nacht"`), dann `python3 -I tools/merge_daily.py data.json work/new.json work/fit.jsonl`
   und `python3 -I tools/bibliothek.py liste data.json <pfad der get_workouts-Antwort>` (V6.5, siehe oben).
   **Eingaben vom Handy (V5.9.3, eingang-1.0, Abschnitt «Eingang»):** `SPUREN_PW=… node tools/eingang.mjs einlesen` (liest `eingang/*.bin`,
   schreibt `work/eingang_a.json`, `work/eingang_b.json`, `work/eingang_dateien.json`).
   - Gibt es `work/eingang_a.json`: `python3 -I tools/merge_daily.py data.json work/eingang_a.json`.
   - Gibt es `work/eingang_b.json` (Laktat auf der Seite bestätigt): `cp data.json work/vor_b.json`, dann
     `python3 -I tools/merge_daily.py data.json work/eingang_b.json`, `python3 -I tools/migrate_v5.py data.json` und
     `python3 -I tools/check_referenz.py data.json --ohne-fit`. Steht «GESAMT: bestanden» da, ist B übernommen. Sonst
     `cp work/vor_b.json data.json` (die Bestätigung bleibt in `eingang/` liegen) und Silas kurz informieren (Grund aus der Ausgabe, ohne Werte).
   - Meldet `einlesen` «abgelehnt …» (Demo, fremd, nicht entschlüsselbar): nie löschen, Silas kurz informieren.
   **An Garmin senden (V6.6, garmin-senden-1.0, von Silas am 13.11.2026 freigegeben, Entscheid E3; Abschnitt «An Garmin senden»):** als Letztes
   in Schritt 3. Ist es vor 23:00 Europe/Zurich: bis 23:00 warten. `git fetch origin main`; zeigt `git diff --name-only HEAD origin/main -- eingang/`
   neue Dateien: `git pull --ff-only` und den Block «Eingaben vom Handy» oben nochmals (spielt nur Neues ein). Dann
   `python3 -I tools/garmin_senden.py plan data.json > work/garmin_plan.json` und die `aktionen` der Reihe nach ausführen, wie im Abschnitt
   «An Garmin senden» beschrieben; danach `python3 -I tools/garmin_senden.py eintragen data.json work/garmin_plan.json work/garmin_ergebnis.json`
   (auch ohne Aktionen). Meldet es «GARMIN FEHLER …»: Silas kurz informieren (Titel und Grund). Fehler beim Senden brechen das Update nie ab.
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
                  "avg_power": null, "np": null, "hr_zones_s": [z1, z2, z3, z4, z5], "notiz": null, "workout_rpe": null, "workout_feel": null}],
  "notizen_garmin": {"25000000000": "Text der Notiz wie in Garmin", "25000000001": null},
  "selbst_garmin": {"25000000000": {"workout_rpe": 60, "workout_feel": 75}, "25000000001": {"workout_rpe": null, "workout_feel": null}},
  "days": [{"date": "2026-10-30", "hrv": 0, "rhr": 0, "sleepH": 0, "sleepScore": 0, "sleepStress": 0, "kcalOut": 0,
            "kcalIn": 0, "protein": 0, "carbs": 0, "fat": 0, "readiness": 0, "readinessLevel": "MODERATE", "bodyBattery": 0,
            "bbSleep": 0, "bbHigh": 0, "bbLow": 0, "stress": 0, "stressHighMin": 0}],
  "weights": [{"date": "2026-10-30", "kg": 0, "ts_gmt": 0}],
  "planned": [{"date": "2026-11-02", "title": "", "sport": "rad", "dur_s": 3600, "wid": 0, "quelle": "Enduco über Garmin", "desc": "",
               "desc_voll": "", "geaendert": "2026-11-01T20:00:00.0", "erstellt": "2026-11-01T20:00:00.0",
               "steps": [{"type": "warmup", "end_condition": "time", "end_condition_value": 600, "target_type": "power.zone",
                          "target_value_low": 120, "target_value_high": 180}]}],
  "planned_range": ["2026-10-31", "2026-11-14"],
  "workouts_neu": [{"wid": 0, "title": "", "sport": "cycling", "dur_s": 0, "erstellt": "2026-11-08T07:39:40", "geaendert": "2026-11-08T07:39:40",
                    "desc": "", "desc_voll": "", "steps": []}],
  "enduco_schritte": [{"wid": 0, "titel": "", "sport": "swimming", "erstellt": "", "geaendert": "", "desc_voll": "", "steps": [],
                       "distanz_m": 2000.0, "pool_m": 50.0}, {"wid": 0, "fehlt": true}],
  "garmin_lebensmittel": [{"id": "", "name": "", "marke": null, "menge": 1.0, "einheit": "SERVING", "kcal": 0, "kh": 0, "zucker": null, "protein": 0, "fett": 0,
                           "natrium": null, "kalium": null}],
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
`bbLow` = `bodyBatteryLowestValue`; negative Garmin-Werte = fehlend (`null`). V8.4 (nacht-1.0, `tools/wellness.py nacht`): `atem` = `averageRespirationValue`,
`haut` = `avgSkinTempDeviationC` (nur mit `skinTempDataExists`), `spo2` = `averageSpO2Value`, `spo2min` = `lowestSpO2Value`, `schlafBedarf` = `sleepNeed.actual` (Minuten). Notiz: `notiz` bzw. `notizen_garmin` = `description` aus `get_activity`; Selbsteinschätzung (V8.1): `workout_rpe`, `workout_feel` aus `get_activity` (Garmin 10–100 bzw. 0–100).
Gewicht: `weight_kg`, `ts_gmt` = `timestamp_gmt` (alle Messungen; das Skript nimmt pro Tag die Morgenmessung).
Leere Werte als `null`. Unbekannte Felder weglassen. Werte nie schätzen.

## Morgen-Update (V5.9.2, morgen-1.0, seit 16.11.2026 täglich 07:00 und 11:00; lesend auf Garmin bis auf den Schritt «Ampel» seit V7.4)
Zweck: das Workout des Tages und die Werte der letzten Nacht auf «Heute», bevor Silas trainiert (er exportiert Enduco-Workouts oft erst am
Morgen nach Garmin). Keine Aktivitäten, keine FIT-Dateien, keine Sekundenreihen – das bleibt beim Nacht-Update. Nach Garmin geschrieben wird nur
im Schritt «Ampel» (V7.4, Entscheid A7 vom 16.11.2026, gebaut am 17.11.2026): die eigene harte Einheit des Tages durch ihre lockere Fassung ersetzen.
Enduco-Workouts werden nie geändert. Jeder Abruf, der fehlschlägt, wird weggelassen: kein Abbruch, keine Nachricht.
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Über die Garmin-Verbindung, Zuordnung der Felder wie im Nacht-Update:
   - `get_sleep_summary_range` von gestern bis heute → `days` mit nur `hrv`, `rhr`, `sleepH`, `sleepScore`, `sleepStress` (Nächte ohne Werte weglassen).
   - `get_stats_range` für heute → `rhr` von heute, falls es im Schlaf fehlt. Kein `kcalOut` und keine Ernährung: der Tag läuft noch.
   - V6.1: `get_morning_training_readiness(heute)` → `readiness`, `readinessLevel`; `get_user_summary(heute)` → nur `bodyBattery`, `bbSleep`;
     `get_user_summary(gestern)` → `stress`, `stressHighMin`, `bbHigh`, `bbLow` (und `bodyBattery`, `bbSleep`) für gestern. Kein Nachholen.
   - V8.4 (nacht-1.0): `get_sleep_data(heute)` als Datei → `python3 -I tools/wellness.py nacht <pfad>` → zusätzlicher Eintrag in `days` (wie im Nacht-Update).
   - `get_scheduled_workouts` heute bis +14 Tage, je Einheit mit `workout_id` `get_workout_by_id` → `planned` und `planned_range`,
     genau wie im Nacht-Update (Workout-Schritte V5.7).
   - `get_workouts` → `workouts_neu` wie im Nacht-Update (Enduco, letzte 2 Tage, nicht im Kalender, höchstens 5); den Pfad der gespeicherten
     Antwort für die Enduco-Bibliothek merken (V6.5).
3. `work/new.json` mit `"lauf": "morgen"` und nur diesen Feldern schreiben, `python3 -I tools/merge_daily.py data.json work/new.json` (ohne
   fit.jsonl), dann `python3 -I tools/bibliothek.py liste data.json <pfad der get_workouts-Antwort>` (V6.5; ohne Datei weglassen, kein Nachholen). Danach die Eingaben vom Handy wie im Nacht-Update (Schritt 3 «Eingaben vom Handy», mit Bestätigungen und Prüfung).
   **Ampel (V7.4, ampel-plan-1.0, Entscheid A7):** als Letztes in Schritt 3. `node tools/ampel_heute.mjs data.json > work/ampel_heute.json` (Entscheid von
   heute mit den Morgenwerten und dem Check-in, gleiche Regeln wie die Seite), dann `python3 -I tools/merge_daily.py data.json work/ampel_heute.json`
   (speichert ihn als `ampel_anpassung`, wenn er neu ist oder sich geändert hat; «Trotzdem wie geplant» vom Handy bleibt). Dann
   `python3 -I tools/garmin_senden.py ampel data.json > work/garmin_plan.json`: nur bei «vorsichtig» oder Krankheitszeichen und ohne «Trotzdem» stehen dort
   Aktionen – je eigene Einheit von heute in Garmin, deren Auftrag eine lockere Fassung trägt, `hochladen` (lockere Fassung, mit Rücklese) und danach
   `austragen` (die harte, mit `nach`). Genau diese Aktionen ausführen wie im Abschnitt «An Garmin senden» (sonst nichts), dann
   `python3 -I tools/garmin_senden.py eintragen data.json work/garmin_plan.json work/garmin_ergebnis.json` (auch ohne Aktionen). Meldet es
   «GARMIN FEHLER …»: Silas kurz informieren («Auf der Uhr steht noch die harte Fassung – locker fahren bzw. laufen», mit Titel). Nie etwas anderes
   nach Garmin schreiben, nie für einen anderen Tag als heute, nie die harte Fassung zurücksetzen; Fehler hier brechen das Update nicht ab.
4. `SPUREN_PW=… node tools/crypt.mjs encrypt data.json data.enc.json`, dann «Eingang aufräumen» wie im Nacht-Update (keine Sekundenreihen).
   Commit «Morgen-Update JJJJ-MM-TT» mit `data.enc.json` (und den Löschungen in `eingang/`), auf `main` pushen. Scheitert der Push: einmal
   `git pull --rebase`, erneut pushen. Gibt es dabei einen Konflikt in `data.enc.json`: `git rebase --abort`, `git reset --hard origin/main`,
   Schritte 1, 3 und 4 mit dem schon geschriebenen `work/new.json` wiederholen und pushen.
5. Schlägt Entschlüsseln, `merge_daily.py` oder auch der zweite Push fehl: nichts committen (`data.enc.json` bleibt unverändert) und Silas
   kurz informieren. Klappt alles: keine Nachricht.
Das Nacht-Update danach ersetzt dieselben Tage, Workouts und `workouts_neu` (nichts doppelt).

## Monatlicher Garmin-Export (FIT, volle Genauigkeit inkl. GPS-Spuren)
Silas lädt `UploadedFiles_0-_Part*.zip` hoch. Jedes ZIP in einen eigenen, leeren Ordner ausserhalb des Repos entpacken und (V6.5) unverändert
im privaten Archiv ablegen (Abschnitt «Archiv», Art `garmin-export`).
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
V5.6: zusätzlich `rpe` (→ `rpe`; seit V8.1 nachher-1.0 auch aus «Nach dem Training»: ID = Aktivität, dazu `gefuehl` (sehr schwach … sehr stark wie die Uhr),
`erwartung` leichter/wie erwartet/schwerer, `intervalle` alle/nicht alle/keine, `notiz`, `rpe_uhr`/`feel_uhr` = Vorschlag der Uhr; ältere Felder bleiben; nachher-1.1 (V8.1.1) ab 60 min ausser Schwimmen und Krafttraining auch `magen` ok/leicht/stark und
`energie` gut/nachgelassen/leer), `intervalle` (Korrekturen von Hand → `intervall_korr`), `laktat_punkte` (Laktat einem Abschnitt
zugeordnet → `laktat_punkte`, Status «vorschau») und `saison` (Stunden «jetzt»/«Spitze» → `saison_plan`); gleiche ID ersetzt mit Audit.
V5.7: `startorte` (ganze Liste → `startorte`, alte Fassung ins Audit) und `trainingsrouten` (gewählte Vorschläge → `trainingsrouten`, gleiche
ID ersetzt mit Audit). Startorte und Routen nur verschlüsselt (data.enc.json), nie offen ins Repository.
V6.6: `garmin_senden` (Auftrag «An Garmin senden» je Tag → `garmin_senden_add` → `garmin_auftraege` mit `status` «offen»; `garmin_senden.pruefen`:
ID «gs-<Datum>», modus senden/auto/aus, Tag vom Erstellen bis eine Woche voraus, Workouts nur Rad/Laufen/Schwimmen (1.1) mit bekannten Feldern; abgelehnte mit
Grund in `garmin_abgelehnt`; dieselbe oder ältere Fassung wird nie nochmals offen). `planwoche` (Mein Plan einer Woche → `planwoche_add` → `plan_woche`, eigenplan-1.0; `merge_daily.planwoche_pruefen`: Montag, ID «wo-<Montag>»,
Tage in der Woche, eindeutige Einheiten, Quelle vorschlag/eigen/bibliothek, Dauer 5–600 min, Tage vor der Änderung und gesperrte Tage unverändert
gegenüber dem Stand davor; gleiche Woche ersetzt mit Audit; V7.10 eigene-aktivitaet-1.0: Vorlage «eigen» mit `titel` 1–60 Zeichen, `sport` rad/lauf/schwimm/andere (bis V8.4 auch mobility), `rpe` 1–10). V6.2.2: `zonen` (auf der Seite bestätigte Zonenprofile → `zonen_add`, geprüft wie oben). V7.2: `verfuegbarkeit` (Zeit und Sportarten je Tag
«vf-JJJJ-MM-TT» oder je Wochentag «vf-wt-1…7», `entfernt` = zurücksetzen → `verfuegbarkeit_add` → `plan_verfuegbarkeit`; `merge_daily.verfuegbarkeit_pruefen`;
gleiche ID ersetzt mit Audit). V7.4: `ampel` (Entscheid der Ampel je Tag «aa-JJJJ-MM-TT» mit Ampel-Stand, Gründen, Morgenwerte ja/nein, Quelle seite/morgen-update
und optional `trotzdem` {an, am} → `ampel_add` → `ampel_anpassung`; `merge_daily.ampel_pruefen` wie `V74.pruefen`; je Tag ein Eintrag: Entscheid aus der neueren
Fassung, «Trotzdem» aus der zuletzt gedrückten, alte Fassung ins Audit). Mein Plan eigenplan-1.1: vergangene Tage einer Woche dürfen einmal mit `eingefroren: true` festgehalten werden (so, wie sie
gezeigt wurden), danach nie mehr geändert; `ganz: true` = ganze Woche gespeichert. V7.3 einheit-felder-1.0: je Einheit optional `uhrzeit` (hh:mm, 5-min-Schritte),
`gesperrt`, `metrik` (leistung/pace/puls/rpe), `drinnen`, `ein_min` (5–40, 5er-Schritte), `pausen` (0–100, 10er-Schritte, 50 = Vorlage); 1.1 (V7.5): `pool` (25/50,
nur Schwimmen, nicht Bibliothek) und `drinnen: false` bleibt (ausdrücklich draussen in einer Indoor-Phase; gespeichert wird nur, was von der Phase abweicht); geprüft mit
`merge_daily.einheit_feld_pruefen` (gleiche Regeln wie `V66.feldPruefen`); eine gesperrte Einheit wird nur entsperrt, nie verschoben, geändert oder entfernt. V6.4: `modell` (gewähltes Trainingsmodell
→ `modell_add` → `plan_modell`; `merge_daily.modell_pruefen`: bekanntes Modell (seit V8.5 auch «automatisch»), Wechsel als Datum; gleiche ID ersetzt mit Audit). V6.5: `planwahl`
(«Ich folge» je Tag → `planwahl_add` → `plan_wahl`; `merge_daily.planwahl_pruefen`: Datum, ID «pw-Datum», Wahl enduco/vorschlag/frei; gleicher Tag ersetzt mit Audit).
V7.5: `planeinstellung` (je Gruppe «pe-start» {art fitness/aufteilung} und «pe-basis-schwimm»/«-rad»/«-lauf» {wert: eigene Fitness 0–200 oder null} (V7.5.2, basis-1.1),
«pe-steigerung» {wert}, «pe-sportart» {art triathlon/rad/lauf} (V8.4.1 sportart-1.0, mit `vorher`), «pe-indoor-rad»/«pe-indoor-lauf» {von, bis}, «pe-schwimm» {hilfsmittel, pool, stile (ruecken/brust), anfaenger (V7.5.1), kurs_bis (letzter Kurstag oder null), kurs_nur (V7.6.2 kurs-1.0)} → `planeinstellung_add`
→ `plan_einstellungen`; `merge_daily.planeinstellung_pruefen` wie `V75.pruefen`; gleiche ID ersetzt mit Audit, eine ältere Fassung (`geaendert`) nie; «pe-basis» mit Stunden
aus V7.5 wird abgelehnt). V7.7 aktivitaet-plan-1.0: `aktivitaet` (Aktivität draussen je Tag «ak-JJJJ-MM-TT» {art skitour/wandern/langlauf/trail, min 60–600 in 15er-Schritten, zone z1/z2, uhrzeit, notiz ≤ 300}
oder {entfernt: true} → `aktivitaet_add` → `plan_aktivitaeten`; `merge_daily.aktivitaet_pruefen` wie `V77.pruefen`; gleiche ID ersetzt mit Audit, ältere Fassung nie).
V8.3 tagescoach-1.0: `tagescoach` (Entscheid zu einem Vorschlag «co-<Datum>-<Anlass>-<Einheit>» {status angenommen/abgelehnt/zurueck, am, date, anlass, titel; angenommen
mit art, woche (Montag), option, rueck (Änderungen für V66.aendern), markiert} → `tagescoach_add` → `coach_entscheide`; `tagescoach.pruefen` wie `V83.eintragPruefen`; gleiche ID:
der spätere Zeitpunkt gilt, alte Fassung ins Audit). Die Änderung an Mein Plan kommt dabei als `planwoche` (geprüft wie jede).
V8.1.1 verpflegung-1.0: `verpflegung` (Anpassung je Einheit «vp-<Datum>-<uid>» {g_h 0–120 in 5er-Schritten, mix auto/gel/getraenk/fest, aus} oder {entfernt: true} = zurück
auf die Empfehlung → `verpflegung_add` → `plan_verpflegung`; `verpflegung.pruefen` wie `VP.pruefen`; gleiche ID ersetzt mit Audit, ältere Fassung nie) und «pe-verpflegung»
in `planeinstellung` {unterwegs, davor, danach, fruktose: Listen von Produkt-IDs aus `garmin_lebensmittel` bzw. den Fueling-Vorlagen (höchstens 60, ohne Doppel), max_g_h
30–120 in 10er-Schritten; gilt sofort, ohne `vorher` – die Listen heissen davor/danach, weil `vorher` in den Planeinstellungen die Fassung der laufenden Woche trägt}.
V7.6 kraft-plan-1.1: «pe-kraft» {aktiv, modus auto/fest (ohne = fest), tage 1–7 je einmal (auto), wt 1–7 (fest), uhrzeit, dauer 15–180 in
5er-Schritten, notiz ≤ 500} und «pe-kraft-<Montag>» {aus und/oder tag dieser Woche, uhrzeit; entfernt = wieder die Regel}; V7.6.1 «pe-lang» {rad, lauf: Wochentage 1–7 je
einmal, leer = keine Vorliebe}; «pe-start», «pe-basis-…», «pe-kraft» und «pe-lang» tragen optional `vorher` = die Fassung, die in der Woche des Speicherns
noch gilt (gleiche Regeln, mit `geaendert`, ohne eigenes `vorher`) – sie gelten ab der nächsten Woche, und `plan_einstellungen` behält je ID nur die neueste Fassung.
`rpe` mit ID «kraft-<Datum>» (sport «kraft», min, srpe, quelle garmin/plan) wie jedes RPE; die Kalibrierung rpe-1.0 lässt es aus. V6.2.3: `garmin_verlauf` (Datei aus
`tools/garmin_export.py`, auf der Seite gewählt → `garmin_export.einspielen`, nur fehlende Tageswerte; mehrere Dateien vor einem Update werden seit
V6.4.4 alle eingespielt, `garmin_verlauf` darf eine Liste sein). V5.9.3: `routen` (im Planer gespeicherte Routen → `routes`, gleiche ID ersetzt mit Audit), `routen_entfernt` (auf der Seite gelöscht → aus
`routes` entfernt, alte Fassung ins Audit), `laktat_punkte_bestaetigt` («Laktat hier» aus dem Explorer auf der Seite bestätigt → Kurzcheck in
`lactate`, Quelle «aus Explorer», Punkt «übernommen»; übernommene Punkte werden nie wieder «vorschau»). Befinden kommt aus dem Morgen-Check-in
(`befinden-2.0` seit V6.3: Schlaf → `schlaf`, Energie → `muede`, Beine → `muskel`, Kopf → `stress`, je 1–7 mit `skala: 7` (1 = sehr gut,
4 = durchschnittlich, 7 = sehr schlecht); dazu `krank`, `notiz`; gleicher Tag ersetzt mit Audit. **befinden-2.1 (V8.1):** dazu Motivation → `motivation` (1–7, auf der Seite
Pflicht, im Eintrag optional) und Schmerzen → `schmerz` {`stufe` leicht/deutlich, `ort` [Fuss, Achilles/Wade, Schienbein, Knie, Hüfte/Leiste, Oberschenkel, Rücken, Schulter,
anderes]}; ohne Schmerzen kein Feld. Ältere Einträge `befinden-1.1` (drei Fragen, 1–5,
ohne `skala`) bleiben unverändert; gerechnet wird mit dem Anteil auf der eigenen Skala, `V59L.befindenAnteil`).

## Eingang (eingang/, V5.9.3 «Direkt speichern», eingang-1.0)
- Die Seite legt jede Eingabe als `eingang/<JJJJMMTT>T<hhmmss>Z-<8 Hex>.bin` an (GitHub-Contents-API, Commit «Eingang»). Format EGS1:
  «EGS1» | IV | AES-256-GCM(Länge | gzip(JSON) | Nullen) | Tag, Seitenschlüssel wie data.enc.json, Datei auf eine Zweierpotenz ≥ 16 KiB
  aufgefüllt. Öffentlich sichtbar bleibt nur, dass und wann eine Eingabe kam. Bestätigungen (Laktat B1, Explorer) kommen in eine eigene Datei.
- Zugang: feingranularer GitHub-Schlüssel nur für sileyhunter/spuren, «Contents: Read and write», bis 1 Jahr gültig (E4; Expiration «Custom», notfalls 90 Tage – eine Auswahl «1 Jahr» gibt es bei GitHub nicht). Er liegt mit dem
  Seitenschlüssel verschlüsselt auf dem Gerät (`sf.eg.schluessel`), nie im Repository, nie im Chat. Ohne Netz oder Schlüssel wartet die Eingabe.
- Nur Morgen- und Nacht-Update löschen Dateien in `eingang/`, und nur die eingespielten (`tools/eingang.mjs aufraeumen`). Abgelehnte Dateien
  (Demo, fremd, nicht entschlüsselbar) bleiben liegen und werden gemeldet. `tools/eingang.mjs pruefen --git`: nur gültige, aufgefüllte EGS1-Dateien.


