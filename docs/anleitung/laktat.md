## Laktatschwellen und Zonen (V5)
- `tools/schwellen.py`: LT1 = SOMC (letzte Stufe vor Anstieg ≥ 0,4), Basis + 0,5 (Basis = Mittel der ersten drei Stufen), log-log (≥ 6 Stufen);
  LT2 = Dickhuth; mod. Dmax und Dmax nur bei ausbelastetem Test. 2/4 mmol/l nur Orientierung, nie LT. Keine Extrapolation.
  Unsicherheit: 4000 Simulationen, Messfehler max(0,15 mmol/l; 7,5 %), je Test eigene Zufallsfolge. Puls an der Schwelle aus FIT (30 s vor der Entnahme).
- Nach jeder Änderung an Laktatwerten: `python3 -I tools/migrate_v5.py data.json` (rechnet `schwellen`, legt fehlende V5-Listen an, Sicherung in
  `work/backup/`, Rückweg mit `--rollback <datei>`). `check_referenz.py` prüft die Schwellen gegen `referenz.schwellen_soll`.
- Zonenprofile (`zonen`) sind versioniert und werden **nie** ohne Silas' Freigabe aus LT1/LT2 gesetzt. Neue Version nur über `"zonen_add"` mit
  `freigabe.datum`; die alte wird «ersetzt». Aktiv: «zonen-2026-11-23».
  **Ändern von Zonen durch Claude (Regel seit 23.11.2026):** nur auf Silas' ausdrücklichen Auftrag («kontrolliere/korrigiere meine Zonen»), nie von sich aus. Dann: Werte im Profil ändern, `freigabe.nachtrag`
  (Datum, Auftrag), `vorher` (Alt-Werte im Profil), Audit-Eintrag mit Alt-Werten, Rücklesung der entschlüsselten Datei, und im Chat die Alt- und Neu-Werte nennen.
  Stand der Laufzonen: vorläufig, bis ein ausbelasteter Lauf-Stufentest vorliegt (Test-Workout `IN · Lauf-Stufentest`, `tools/workouts.py`); danach das Profil nach dem Zonen-Vorschlag erneuern.
- **V6.2.2 Zonen-Vorschlag (zonenvorschlag-1.0, `js/v62.js`):** aus dem neuesten Stufentest je Sportart: Z2/Z3 = LT1, Z3/Z4 = LT2 (Mitte der
  gültigen Methoden oder gewählte Methode, Puls an der Schwelle aus FIT); Z1/Z2 und Z4/Z5 im Verhältnis der Skala nach Tønnessen et al. 2024
  (0,81/1,07 × bei Leistung und Tempo, 0,88/1,06 × beim Puls). Bestätigen nur bei bestätigtem Test (B1): die Seite legt ein Profil mit Freigabe
  an (`Inbox.data.zonen` → «Direkt speichern» → `zonen_add`). `merge_daily.py` prüft es (`zonen_pruefen`: Freigabe, lückenlose und geordnete
  Grenzen, Test in `schwellen.tests` bestätigt); Ablehnungen mit Grund in `zonen_abgelehnt` (die Seite zeigt sie). Nach einer Übernahme
  Silas daran erinnern, die Grenzen in Garmin/enduco einzutragen, und die Zonen in den Aufträgen Morgen-Briefing und Abend-Check nachführen.
  Zonen nach Garmin schreiben (`set_heart_rate_zones`) nur auf ausdrücklichen Auftrag («Garmin ja»), mit Rücklesung und den Alt-Werten im Chat; Pulszonen trägt sonst Silas selbst ein.
- Zonenverteilung «Mache ich das Richtige?» nutzt die Pulsgrenzen des aktiven Profils (ab dessen Gültigkeit), davor die Garmin-Zonen.


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
- **V6.6.2 last-2.1 (Prüfbericht vom 13.11.2026, Befunde 5–7):** eine LT2 gilt nur für das System, auf dem sie gemessen wurde – `system` je Eintrag
  in `config.last_ref.rad`: «rolle» (Zwift/Indoor; ohne Angabe, alle Tests bis V6.6.1) oder «draussen». Rad auf der Rolle mit NP gegen die LT2 der Rolle;
  Rad draussen mit NP gegen eine LT2 für draussen, sonst nach Puls: Timer-Dauer × min(1,15; Ø-Puls / `config.lthr.rad`)² × 100 (wie Einheiten ohne
  Leistung); ohne Puls bleibt die gelieferte Last (gekennzeichnet). `tl2q` je Radeinheit: «lt2-rolle», «lt2-draussen», «puls», «wie geliefert».
- **Neuer Rad-Stufentest:** erst nach B1 (bestätigt) und `check_referenz.py` «GESAMT: bestanden» einen Eintrag ergänzen
  (`ab` = Testdatum, `lt2_w`, `lt2_genau_w`, `methode`, `test` = ID in `schwellen.tests`, `system` «rolle»/«draussen», `quelle`, `status`, `festgelegt`) – mit Silas' Okay
  zur Methode, nie eine Schwelle ausserhalb der Stufen. Über `work/new.json` `"config": {"last_ref": {…}}` mit der **ganzen** Liste (config
  ersetzt den Schlüssel), dann `merge_daily.py`. Ältere Einträge bleiben (Fahrten davor rechnen weiter mit ihnen).
- `config.load_model` steuert, was die Seite verwendet: `"garmin"` (Standard, `tss` wie geliefert), `"last-2.1"` bzw. `"last-2.0"` (beide `tl2` in der
  Fassung von `tools/last.py`; erst nach Silas' Okay zum Vergleich) oder `"ftp_est"` (alte Probe aus NP und `ftp_e`, nicht mehr verfolgt). Die Seite zeigt den Vergleich in Fortschritt
  «Wochenlast je Sportart». **Seit 14.11.2026 `"last-2.1"`** (Silas' Okay: Rolle mit der LT2, draussen nach Puls mit dem Schwellenpuls Rad; im Audit vermerkt).
  Zurück auf die Garmin-Werte nur auf seinen Wunsch (`tss` bleibt immer gespeichert).
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
  Fenster bis zum Anhalten nehmen und das im Hinweis sagen). Seit V6.4.4 bleibt eine so nachgerechnete Vorschau beim nächsten Update stehen
  (`notizen.ableiten` ersetzt nur Vorschauen, die selbst aus der Notiz stammen). Bestätigung (B1) auf der Seite oder im Chat («bestätigt» → `"laktat_bestaetigt": [ids]`).
- **V5.9.6 Einzelmessungen über die Zeit (`laktat-drift-1.0`):** `laktat_vorschau.py` rechnet je Check-Block `t_s` (Fahrzeit bis zum Blockende),
  `el_s`, `pause_s`, `pause_timer_s`; B1 übernimmt sie nach `lactate`. Die Seite («Einzelmessungen») zeigt Laktat über die Zeit in der Einheit,
  verbindet nur gleiche Einheit und gleiche Leistung (±5 %) und urteilt «steigt/gleich/sinkt» erst über 2·√(σ₁² + σ₂²), σ = max(0,15; 7,5 %).
- **V5.6 Laktatpunkte aus dem Explorer** (`laktat_punkte`, Status «vorschau», mit Abschnitt von/bis, Ø W, NP, Puls bzw. Pace): Silas zeigen;
  erst nach seiner Bestätigung als Kurzcheck über `lactate_add` übernehmen (`activity` = ID, Werte aus dem Abschnitt, Notiz «aus Explorer»).
- **V7.6.2 Kurzcheck nach Puls (`laktat-hf-1.0`, Silas' Wunsch vom 17.11.2026, für Skitour, Wandern, Langlauf, Grundlage):** im Explorer wählbar «Puls aus den 10, 15 oder 20 min
  vor der Messung» (`AN.laktatFenster`; Standard 10 min ausser Rad und Laufen, dort wie bisher Intervall bzw. 5 min). Gespeichert im Laktatpunkt: `abschnitt.hr_max`,
  `hr_anstieg` (2. gegen 1. Hälfte in %, wie beim Kurzcheck), `fenster_s`, `t_timer`; aus einer Notiz-Vorschau «ln-…» mit `vorschau` = deren ID (die Seite bietet im
  Bestätigen-Blatt «Puls aus der Aufzeichnung»; `notizen._gleiche_messung` legt die Vorschau dann nicht erneut an). `merge_daily.laktatpunkt_uebernehmen` übernimmt
  `hr_max`, `drift` = Pulsanstieg, `el_s`, `t_s`, `fenster_s`. Zonen ändern sich dadurch nie; die Zonen-Prüfung für Einheiten nach Puls ist nur vorgeschlagen (Etappe 4).
- **V9.26.1 Zeit-Eingabe und Liste (`laktat-eingabe-1.0`, 26.11.2026):** Das Zeitfeld im Explorer heisst «Zeit seit Start (h:mm:ss)» und wird mit `AN.zeitLesen` gelesen (drei Teile h:mm:ss; eine Zahl = Minuten; zwei Teile h:mm bei Aufzeichnungen ab 1 h, wenn die Zeit darin liegt, sonst min:s; nicht lesbar = nichts speichern). Die Zeit ist die der Zeitachse (seit Start, mit Timer-Pausen); `t_timer` im Eintrag ist die Zeit ohne Pausen. Früher las das Feld «1:10» als 1 min 10 s: das Fenster «20 min vor der Messung» wurde am Start abgeschnitten, der Eintrag zeigte das Einfahren. **Prüfen, wenn ein Laktatpunkt auffällt:** Abschnitt von/bis gegen `fenster_s` (Abschnitt viel kürzer als gewählt und `von` = 0 = Zeit falsch eingegeben); die Seite zeigt dafür eine Warnung in der Karte und im Bestätigen-Blatt. Ein solcher Eintrag ist eine Vorschau und zählt nicht, bis Silas bestätigt; ersetzen heisst: Eintrag aus `laktat_punkte` entfernen (Datenänderung, nur auf Silas' Auftrag) und neu erfassen lassen. Die Liste «Laktat in dieser Einheit» ist eine Karte je Messung (keine Tabelle).
- **Tabellen (Excel der SOMC-Vorlage), Laborberichte, Werte aus dem Chat: zuerst nur Vorschau (A5).**
  Excel in einen eigenen Ordner ausserhalb des Repos kopieren, Rohdaten (FIT) wie beim Monatsexport bereitstellen, dann
  `python3 -I tools/laktat_vorschau.py data.json --files work/files.json --xlsx <datei.xlsx> [--extra <werte.json>]`.
  Jeder Wert trägt seine Quelle (Datei, Blatt, Zelle). Abweichung > 5 W bzw. 0,3 km/h oder keine Aktivität = «unklar».
  Die Vorschau zeigt die Seite im Testzentrum. Übernommen (nach `lactate`) wird erst nach Silas' Bestätigung (Schritt B1).
  Schwellen je Methode erst mit B1; nie eine Schwelle ausserhalb der gemessenen Stufen.

## Punkte (GPX kommt über den Chat)
Wegpunkte, z. B. Jagdposten aus Garmin Explore: GPX in einen eigenen, leeren Ordner ausserhalb des Repos kopieren, entschlüsseln,
`python3 -I tools/import_points.py data.json <datei.gpx>` (ersetzt früher importierte Punkte), verschlüsseln, nur `data.enc.json` committen.
Kategorie nach Name (Post, Hochsitz, Ansitz … → Jagdposten, sonst «Sonstiges» usw.). **punkte-1.1:** Kategorien von Hand (`cat_hand`, seit 14.11.2026
die Punkte im Jagdgebiet als Jagdposten, im Audit vermerkt) bleiben beim neuen Import (gleicher Name, höchstens 50 m entfernt). Jagdposten sind auf
der Karte ausgeblendet, bis Silas sie unter «Ebenen» → «Weitere Ebenen» → «Jagdposten» (oder Vorlage «Jagd»; die Punkte stehen unter «Meine Daten» → Punkte) einblendet; die anderen Kategorien sind an.
Neue Punkte ohne erkennbare Art im Jagdgebiet landen unter «Sonstiges»: Silas fragen, nie selbst raten.

## Testkalender
`tests` in den Daten: `[{"date":"…","kind":"stufentest"|"check"|"css","note":"…","status":"vorschlag"|"geplant"}]`.
Änderungen über `"tests": [ … ]` (ersetzt die ganze Liste) in `work/new.json`. Erledigt: Laktat-Tests durch einen Eintrag in `lactate` gleicher
Art (Stufentests nur derselben Sportart, `V62.testSport`; fehlt `sport` im Testkalender, gilt «Lauf» in der Notiz), CSS-Tests durch einen CSS-Test in `css_tests` (bzw. auf dem Gerät), je höchstens 4 Tage daneben (`V59L.testsMitStatus`).
**Schwimmen (V5.9.4, css-2.0, E6):** Als Schwimm-Massstab zählt nur der CSS-Test (400 m und 200 m; CSS = (T400 − T200) ÷ 2 pro 100 m).
Termine (`kind` «css», «geplant») stehen nur verschlüsselt im Testkalender (nicht an Kursabenden und nie während Abwesenheiten; Termine und
Abwesenheiten nie in Doku, Code oder Tests). Eintrag auf der Seite mit zwei Zeiten (Rest
optional), über «Direkt speichern» → `css_tests`. Rohpace aus Garmin, Videovergleich und Fehlerboard sind ausgeblendet (Daten bleiben);
Technik wertet Claude im Chat aus (Videos Bild für Bild), nie auf der Seite.
**Schwimm-Datenseiten (V9.12.0, schwimmseiten-1.0, schwimmzonen-1.0, Auftrag 3.3):** Der Tab Schwimmen zeigt oben den CSS-Test, darunter «CSS und Zonen im Wasser» und «Test-Einheit».
- **CSS «geschätzt»:** Eintrag in `css_tests` mit `geschaetzt: true`, `validiert: false`, Quelle «Schätzung» (Feld «Schätzung – noch nicht geschwommen» im Formular). Er gilt für Tempo und Plan
  (der jüngste Eintrag zählt, ein echter Test ersetzt ihn von selbst), erledigt aber **keinen** Testkalender-Termin (`V59L.testsMitStatus`), erscheint nicht als «✓ CSS-Test» im Kalender, nicht in
  der Wochenübersicht und ist in «Meine Entwicklung» nur Vorschau. Anzeige immer mit «≈» und der Pille «geschätzt», im Verlauf als hohler Punkt.
- **Tempo-Zonen:** `SW.cssZonen(css_s)` – Z1 über 115 % der CSS-Zeit, Z2 105–115 %, Z3 100–105 %, Z4 (Schwelle) 96–100 %, Z5 schneller; eigene Festlegung, keine Studienvorgabe.
- **Puls im Wasser (A.21):** nur Orientierung, im eigenen Datenschlüssel `schwimm_puls` (`zonen`, `grenzen`, `quelle`, `hinweis`, `stand`) und **nicht** im Zonenprofil: so entstehen keine
  LT1/LT2-Bezüge, keine Intensitätsverteilung und keine Wirkung auf die Trainingslast (der Puls am Handgelenk ist im Wasser ungenau, Werte über dem Maximalpuls kommen vor). Grundlage waren die
  Einheiten ab 25 min seit April 2026 ohne Werte über dem Maximalpuls (Verteilung von Durchschnitt und besten 10 Minuten). Neu festlegen nur nach neuem Auftrag und mit Rücklesung.
- **Test-Einheit:** Ablauf des CSS-Tests, nächster Termin aus dem Testkalender, offene Termine der Vergangenheit; das Workout «IN · CSS-Test 400/200» kommt aus `tools/workouts.py`, die Seite lädt nichts hoch.
**Schwimm-Einheiten (V7.2, schwimmeinheit-1.0, uebungen-2.0; seit V7.3.2 schwimmeinheit-1.1, uebungen-2.1; seit V7.5 schwimmeinheit-1.2):** eigene Schwimm-Einheiten werden als Serien wie im Becken gezeigt (Meter, Bahnen,
Pausen, Hilfsmittel); Tempo nur aus dem CSS-Test (locker CSS + 15–20 s, Grundlage CSS + 8–12 s, Annahmen), ohne Test nach Anstrengung. Übungstexte
sind eigene Beschreibungen (nie aus Enduco oder Webseiten übernehmen); Hilfsmittel nur Brett, Pullbuoy, Flossen, Paddles (Schnorchel nur als Garmin-Feld).
**uebungen-2.1 (V7.3.2):** `SW.ENDUCO` = die 27 Kraul-Übungen aus Silas' Enduco-Einheiten (seine Liste vom 16.11.2026, PDF nie ins Repository): Name als
Name oder Synonym, Übungsstrecke 12,5/25/50 m und nötige Hilfsmittel wie dort, Texte eigen. Abwechslung `SW.uebungenDerWoche`: je Woche drei Übungen
aus drei von fünf Gruppen (`SW.ROTATION`, eigene Einteilung), jede Gruppe beim nächsten Mal mit der nächsten Übung; «Schulterdehnung» nur im Katalog
(Ausführung unklar). schwimmeinheit-1.1: immer drei Übungen je 2 ×, Strecke laut Liste, dann die Bahn locker fertig, 5 s Pause (wie Enduco); keine
Brett-Beine als Übung, wenn die Einheit einen Beine-Block hat. schwimmeinheit-1.2 (V7.5, Planeinstellungen): Übungen nur mit vorhandenen Hilfsmitteln; ohne Brett
Beine in Seitlage mit Flossen, ohne beides kein Beine-Block; ohne Pullbuoy kein Pull; im Ein- und Ausschwimmen am Ende ein Teil im Stil der Woche (Rücken bzw. Brust,
abwechselnd, wenn beide gewählt; auf der Uhr backstroke bzw. breaststroke, sonst «free», V7.5.1); Anfänger-Modus (V7.5.1): keine anspruchsvollen Übungen (`SW.ANSPRUCHSVOLL`),
15 s Pause, Hauptserie 100 m mit 45 s, CSS 50 m mit 30 s, Beine und Steigerungen 25 m, Pull 50 m mit 30 s; die Technikübungen stehen immer direkt nach dem
Einschwimmen (Silas' Wunsch vom 17.11.2026, Test in `tests/test_v75.cjs`).
Protokoll-Vorlagen: `protokolle` (Liste mit `id name sport ablauf blut ende rahmen status`), ändern über `"protokolle": [ … ]` in `work/new.json`.
**Testplan (V6.2, testplan-1.0, `js/v62.js`):** Die Seite schlägt Tests nach festen Regeln selbst vor (Status «vorschlag», Regel sichtbar), in
Testkalender, Kalender und auf Heute (heute/morgen): CSS alle 6–8 Wochen am gleichen Wochentag wie zuletzt; Rad-Stufentest alle 8 Wochen am Samstag
einer Erholungswoche (saison-1.2), zuerst ein ausbelasteter, wenn der letzte es nicht war; Lauf-Stufentest alle 8–12 Wochen in einer anderen
Erholungswoche (auch eingetragene Lauf-Tests sperren ihre Woche für den Rad-Vorschlag und umgekehrt); Kurzcheck alle 2 Wochen in einer Grundlagenfahrt
(rollend 8 Wochen, der gewählte Tag nicht 4 Tage neben einem Stufentest); CSS-Vorschläge nur 6–8 Wochen nach dem letzten, sonst mit Begründung; kein Stufentest 14 Tage
vor einem Rennen, in der Woche danach und im Taper. Eingetragene Termine (`tests`) gehen vor; Regelverstösse werden mit einem Vorschlag gezeigt,
nie still geändert. Abwesenheiten («keine Tests») trägt Silas auf der Seite ein (Notiz `tp-sperren`, verschlüsselt über «Direkt speichern»);
nie Reisedaten in Doku, Code oder Tests schreiben. Nach Garmin wird nichts geschrieben.


