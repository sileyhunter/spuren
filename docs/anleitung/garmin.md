## Bilder (bilder/, V7.6.2, bilder-1.0, Silas' Wunsch vom 17.11.2026)
- Kopfbild der Einheit-Seite je Sportart aus Silas' eigenen Fotos (Schwimmen, Laufen, Rad, lange Ausfahrt, Wandern, Skitour). Die Fotos zeigen ihn, andere Personen,
  Startnummern oder Orte: darum **nur verschlüsselt** im Repository, nie als JPEG, nie in der Demo (die Demo zeigt das Symbol wie bisher).
- Format wie die Sekundenreihen (SPS2): AES-256-GCM mit dem Seitenschlüssel über «Länge | JPEG | Nullen», auf ein Vielfaches von 64 KiB aufgefüllt; Name = erste 24 Hex-Zeichen
  von SHA-256(«serien_salz:bild:<schlüssel>»). Welche Bilder es gibt und der Bildausschnitt (`pos`, «x% y%») stehen nur verschlüsselt in `config.bilder`.
- Neues oder anderes Bild: Foto in einen eigenen Ordner ausserhalb des Repos, zuschneiden (Querformat, höchstens 1600 px breit), EXIF entfernen (neu als JPEG speichern), dann
  `SPUREN_PW=… node tools/bilder_crypt.mjs schreiben <schlüssel>=<datei.jpg> …`, `config.bilder` über `work/new.json` `"config": {"bilder": {…ganze Liste…}}` und
  `merge_daily.py`, verschlüsseln, `node tools/bilder_crypt.mjs pruefen` («PRÜFUNG BILDER: bestanden»: entschlüsselbar, JPEG ohne EXIF, jede Datei mit Eintrag), committen.
  Schlüssel: Sportart (`schwimm`, `rad`, `lauf`, `wandern`, `skitour`, …), lange Ausfahrt `rad-lang`; fehlt ein Bild, zeigt die Seite das Symbol. Die Rohfotos nach dem
  Ablegen löschen; Archiv nur auf Silas' Wunsch.
- Die Seite lädt das Bild erst, wenn eine Einheit geöffnet wird (`js/v73-ui.js` `bildKey`/`bildLaden`, Blob-URL im Speicher); der Service Worker hält es wie die Reihen offline.

## Archiv (spuren-archiv, V6.5, archiv-1.0)
- Privates Repository `sileyhunter/spuren-archiv` (von Silas am 13.11.2026 angelegt) für Rohdaten, die nie ins öffentliche Repository gehören:
  Garmin-Exporte (ZIP), FIT-Dateien, Momentaufnahmen aus der Garmin-Verbindung (z. B. die Workout-Liste), Laktat-Tabellen. Die Seite liest es nie.
- Alles verschlüsselt mit `tools/archiv.mjs` (Format ARC1, Schlüssel aus dem Seitenpasswort mit eigenem Salz in `schluessel.json`, zufällige
  Dateinamen, Namen und Prüfsummen nur im verschlüsselten `index.bin`, Teile zu höchstens 40 MiB). Gleicher Inhalt nur einmal; nie ändern oder löschen.
- In einer Chat-Sitzung: `add_repo` (sileyhunter/spuren-archiv, push), nach `/home/claude/spuren-archiv` klonen, `SPUREN_PW=… node tools/archiv.mjs
  ablegen /home/claude/spuren-archiv <datei> --art <art> [--name …] [--notiz …]`, dann `pruefen` («PRÜFUNG ARCHIV: bestanden»), Commit «Archiv: …»,
  pushen (grosse Dateien Teil für Teil). Abgelegt werden: jedes hochgeladene Garmin-ZIP (Monatsexport und Datenexport, Art `garmin-export`),
  Laktat-Tabellen (`laktat`), gelegentlich die Workout-Liste (`garmin-workouts`). Nacht- und Morgen-Update fassen das Archiv nicht an.
- Nie Klartext ablegen; die Rohdateien bleiben ausserhalb beider Repositories in eigenen Ordnern und werden danach gelöscht.

## Garmin-Datenexport (Verlauf, V6.2.3, garmin-export-1.0)
Silas lädt Teile seines Garmin-Datenexports hoch (z. B. «Archiv.zip» mit `*_sleepData.json`, `*_healthStatusData.json`,
`TrainingReadinessDTO_*.json`). Gleiche Dateien nur einmal (Prüfsumme); jedes ZIP in einen eigenen, leeren Ordner ausserhalb des Repos entpacken
und (V6.5) unverändert im privaten Archiv ablegen (Abschnitt «Archiv», Art `garmin-export`).
1. `python3 -I tools/garmin_export.py lesen <ordner> [<ordner> …] work/garmin-verlauf.json` → Schlafdauer (Tief + Leicht + REM, ohne Wachzeit),
   Schlafwert, Stress im Schlaf (nicht OFF_WRIST/UNCONFIRMED) und Readiness nach dem Aufwachen (`AFTER_WAKEUP_RESET`; mehrere verschiedene
   Aufwach-Werte am selben Tag → Tag leer, nie geraten) und HRV aus dem Gesundheitsstatus. Am 13.11.2026 gegen die Daten der Garmin-Verbindung
   geprüft: Schlafdauer und Schlafwert gleich (1502 bzw. 1431 Nächte), HRV an 145 von 146 Tagen gleich; «HR» im Gesundheitsstatus ist der
   mittlere Puls im Schlaf, nicht der Ruhepuls (0 von 384 gleich) und wird nie übernommen. Ausgabe prüfen (Zeitraum, Anzahl je Feld, Stichproben).
2. Mit `SPUREN_PW`: entschlüsseln, `{"garmin_verlauf": <Datei>}` als JSON schreiben und mit `merge_daily.py` einspielen, verschlüsseln, pushen.
   Ohne Passwort (Normalfall im Chat): die Datei mit Datum im Namen an Silas senden; er wählt sie auf der Seite unter Einstellungen →
   «Garmin-Verlauf einlesen» (die Seite prüft sie, «Direkt speichern» bringt sie verschlüsselt nach `eingang/`), das nächste Update spielt sie ein.
3. `garmin_export.einspielen` füllt nur fehlende Felder (vorhandene Werte aus der Garmin-Verbindung bleiben; das Nachholen über die Verbindung
   überschreibt später mit den eigenen Werten), legt neue Tage an, setzt `config.days_backfill` nur, wenn er fehlt (auf den bisherigen Stand),
   und vermerkt den Import in `garmin_export` (ID = Inhalt, gleiche Datei nie doppelt) und im Audit. Nie die Rohdateien oder die Datei committen.


## An Garmin senden (V6.6, garmin-senden-1.0, Entscheid E3 vom 13.11.2026; 1.1 = V7.3 Etappe 2: Schwimmen, Puls, RPE; 1.2 = V7.5.1: Stil je Schritt)
- Silas' Wunsch: eigene Einheiten von Hand bis eine Woche voraus an Garmin (Fenix und Edge), automatisch nur am Vortag um 23 Uhr (er passt den
  nächsten Tag bis etwa 23 Uhr an). Die Seite legt dafür nur einen Auftrag an; ausgeführt wird er im Nacht-Update (Schritt 3, als Letztes).
- Auftrag je Tag (`garmin_auftraege`, ID «gs-<Datum>»): modus «senden» (nächstes Nacht-Update), «auto» (Nacht-Update am Vortag ab 23:00), «aus».
  Er trägt eine Momentaufnahme je Einheit (`V66.garminAuftrag`): Rad und Laufen als fertiges Workout (`V66.garminWorkout`: Name «IN · …»,
  Ziele in der Metrik der Einheit (`V66.metrikVon`): power.between in Watt bzw. pace.zone in m/s langsam → schnell, 1.1 Puls als heart.rate.zone
  mit eigenem Bereich in bpm (ID 4, ohne zoneNumber; `V66.garminPuls`, Renntempo = oberes Drittel von Z2, eigene Festlegung) oder RPE ohne Ziel
  mit RPE im Text; aus dem aktiven Zonenprofil, Z1 und Pausen ohne Ziel, Z5 nach oben +15 % bzw. Puls +10 % (eigene Festlegung), Wiederholungen
  als eine Ebene, höchstens 50 Schritte, Fassung = Prüfsumme). **1.1 Schwimmen** (`V66.garminSchwimm`, Format wie Enduco aus `get_workout_by_id`
  raw gelesen): sportType 4 «swimming», `poolLength` 25/50 mit `poolLengthUnit` meter (Bahnlänge der Einheit, sonst Standard aus den Planeinstellungen, `SWUI.becken`), Strecken in ganzen
  Bahnen (distance), Pausen am Beckenrand als rest/fixed.rest, Übungen als «other» über die ganze Bahn («½ L | Name | Technik | RPE … | Bahn locker
  beenden»), Wiederholungen mit `skipLastRestStep` false, Stil free (1.2: je Schritt wie in der Einheit, Rücken backstroke 2, Brust breaststroke 3 wie in den
  Enduco-Workouts mit Brust; das ganze Einschwimmen «warmup»), nötige Hilfsmittel als `equipmentType` (fins 1, kickboard 2, paddles 3 aus
  Enduco-Workouts; pull_buoy 4 am 17.11.2026 mit einem Test-Upload bestätigt), freiwillige im Text; mit CSS-Test Nebenziel
  swim.css.offset (17) = CSS-Geschwindigkeit − Zielgeschwindigkeit (m/s) und Tempo im Text, ohne Test bzw. Metrik RPE nur RPE im Text. Die Uhr
  rechnet die Tempo-Ziele mit ihrer eigenen CSS; Garmin liefert sie nicht (get_user_profile geprüft am 16.11.2026), die Seite sagt es im
  Export-Blatt. Die CSS nie nach Garmin schreiben. Die Schwimm-Einheit kommt immer aus `V66UI.schwimmEinheit` (dieselbe wie auf der Einheit-Seite,
  `opt.schwimm`), sonst gleiche Fassung nicht möglich. Bibliothek nur als `wid` (Enduco-Workout, wird nur eingeplant). Tests, Schwimmkurs,
  Kraft, Mobility: nicht gesendet, mit Grund.
- `tools/garmin_senden.py plan` vergleicht offene Aufträge mit den Vermerken in `plan_garmin` (uid, Tag, Fassung, workout_id, scheduled_id):
  gleiche Fassung = nichts; andere Fassung = neue Fassung senden, danach die alte austragen (`nach`); nicht mehr im Plan = austragen; verschoben
  (neuerer Auftrag an einem anderen Tag) = nur am neuen Tag. Tag schon da = «verpasst» (für heute nur im Chat).
- Aktionen im Nacht-Update (genau diese, nichts anderes; Ergebnis je `nr` in `work/garmin_ergebnis.json` als `{"garmin_ergebnis": [...]}`):
  - `hochladen`: `upload_workout(workout)` unverändert → `workout_id`. `get_workout_by_id(workout_id, raw=true)` unverändert als
    `work/garmin_rueck_<nr>.json` speichern (speichert das Werkzeug die Antwort selbst als Datei: deren Pfad nehmen), dann
    `python3 -I tools/garmin_senden.py rueck work/garmin_plan.json <nr> <datei>`. «RÜCKLESEN: gleich» →
    `get_scheduled_workouts(date, date)`, `schedule_workout(workout_id, date)`, nochmals `get_scheduled_workouts(date, date)`: neu ist der Eintrag mit
    dieser `workout_id`, der vorher nicht da war (fehlt er noch: 10 s warten, höchstens dreimal) → `{"nr", "ok": true, "workout_id", "scheduled_id"}`
    (ohne gefundene ID `scheduled_id: null`). Sonst das eigene Workout löschen (`delete_workout(workout_id)`, dann mit `confirm=true`) →
    `{"nr", "ok": false, "fehler": "<Zeile RÜCKLESEN …>"}`.
  - `einplanen` (Bibliothek): `get_scheduled_workouts(date, date)`; steht `wid` dort schon → `{"nr", "ok": true, "scheduled_id": <dessen ID>,
    "vorhanden": true}` ohne einzuplanen; sonst `schedule_workout(wid, date)` und die neue `scheduled_workout_id` wie oben → `"vorhanden": false`.
  - `austragen`: mit `nach`, dessen Aktion nicht «ok» war → `{"nr", "ok": false, "fehler": "übersprungen"}`. Sonst, wenn nicht `vorhanden`:
    `unschedule_workout(scheduled_id)` (fehlt sie: in `get_scheduled_workouts(date, date)` den Eintrag mit `workout_id` suchen); mit `loeschen`
    danach `delete_workout(workout_id)` und mit `confirm=true` → `{"nr", "ok": true}`.
  - Fehlschlag eines Aufrufs: `{"nr", "ok": false, "fehler": "<kurz>"}`, weiter mit der nächsten Aktion.
- Nie: Enduco-Workouts ändern oder löschen, Kalendereinträge ohne eigenen Vermerk austragen, Bibliotheks-Workouts löschen, Zonen oder die CSS
  nach Garmin schreiben, etwas senden, das nicht in `work/garmin_plan.json` steht. Das Morgen-Update sendet nur im Schritt «Ampel» (Entscheid A7 vom
  16.11.2026, seit V7.4): bei «vorsichtig» oder Krankheitszeichen die eigene harte Einheit des Tages durch ihre lockere Fassung ersetzen (seit V9.8 bei «vorsichtig» erst nach
  «Akzeptieren» auf der Seite; Krankheitszeichen wie bisher von selbst).
- **V9.2 umplanen-1.0 (Etappe W1):** Umplanen ändert Einheiten an bis zu sieben Tagen. Danach führt `V66UI.planen` die offenen Aufträge **aller sieben Tage** nach
  (`auftraegeWoche`): Auswahl vorher = Einheiten in den offenen Aufträgen (Momentaufnahme), über `V92.zuordnung` (Kennung, sonst Vorlage und nächster Tag) auf die neue Woche
  übertragen; Tag mit offenem Auftrag → neue Fassung nur, wenn sie sich ändert (gleicher Modus; mit «teil» nur die gewählten, die noch dort stehen); gewählte Einheit an einem Tag
  ohne Auftrag → neuer Auftrag mit ihrem Modus und «teil»; nicht mehr am Tag → fällt aus dem Auftrag (das Nacht-Update trägt sie aus). Heute nie (Nacht-Update «verpasst»); steht
  eine gesendete Einheit von heute nicht mehr im Plan, sagen Tagesblatt und Bericht «Auf der Uhr steht noch …». Im Bearbeiten-Modus nichts, erst mit ✓.
- **V7.4 lockere Fassung (ampel-plan-1.0):** jede Einheit im Auftrag mit harten, mittleren oder langen Abschnitten trägt `ampel` = { titel, fassung,
  workout } (aus `V74.locker`, Titel «… (Ampel)», gleiche Uhrzeit und Metrik); `pruefen` prüft sie wie jedes Workout. `garmin_senden.py ampel` ersetzt
  nur Vermerke von heute, deren Fassung im Auftrag steht; die neue trägt in `plan_garmin` `ampel: true` und wird nie zurückgesetzt («Trotzdem wie
  geplant» danach: die Seite sagt, dass auf der Uhr die lockere Fassung steht). Klappt das Ersetzen nicht, zeigt die Seite «Auf der Uhr steht noch die
  harte Fassung – locker fahren bzw. laufen». Ältere Aufträge ohne `ampel` werden nicht ersetzt.
- V7.3 «Export» einer Einheit (Einheit-Seite): der Auftrag des Tages trägt `teil: true` und enthält nur die gewählten Einheiten – diese und alle, die
  schon in Garmin oder im offenen Auftrag sind (`V66UI.einheitSenden`); was danach in Garmin ist, sind genau die Einheiten des Auftrags (wie bisher).
  Nach einer Änderung bleibt die Auswahl; ohne `teil` gilt der ganze Tag. `pruefen` lehnt ein `teil` ab, das nicht ja/nein ist.
- Eigene Einträge im Garmin-Kalender («IN · …», eingeplante Bibliothek ohne `vorhanden`) sind nie Enduco: `V66.eigenGarmin` (vergleich-1.4),
  `V64.enducoAusUhr`, `tools/bibliothek.py` (bib-1.1, kein Enduco-Termin).
- Die Seite zeigt je Einheit «in Garmin», «in Garmin, geändert» oder «wird gesendet» (`V66.garminStand`), je Tag den Auftrag (offen, gesendet,
  verpasst, Fehler mit Grund, abgelehnt). Rücklese geprüft am ersten echten Senden; bis dahin nie behaupten, das Format sei an Silas' Geräten geprüft.
  **Test-Upload 17.11.2026 (mit Silas' Okay):** ein Schwimm-Workout mit erfundenen Werten (50-m-Becken, Übungen «other», Brett, Pullbuoy, CSS-Abstand,
  Texte mit «½» und «–») hochgeladen, zurückgelesen («RÜCKLESEN: gleich», Garmin speichert es unverändert) und gleich wieder gelöscht, nie eingeplant.
  Damit nimmt Garmin das Format an; wie die Fenix es zeigt, ist weiter offen.
  1.1: `rueck` vergleicht zusätzlich die Texte der Schritte (gekürzt oder anders = abweichend), Bahnlänge, Stil, Hilfsmittel und Nebenziel (CSS-Abstand);
  «ohne Ziel» darf als null oder no.target zurückkommen. Erstes echtes Senden einer Schwimm-Einheit: Rücklese im Chat zeigen und Silas bitten, auf der
  Fenix zu prüfen (Übungsname sichtbar, Hilfsmittel, Pausen, Bahnen); bis dahin nie behaupten, Schwimmen sei auf dem Gerät geprüft.


