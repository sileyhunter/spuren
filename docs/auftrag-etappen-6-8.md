# Auftrag Etappen 6–8: Wünsche vom 13.11.2026

Quelle: Nachricht von Silas am 13.11.2026 mit Bildschirmfotos der Seite und von enduco (nicht im Repository).
Dieser Auftrag ist der Prompt für die nächsten Etappen. **Gebaut wird jede Etappe erst nach Silas' Okay**, auch Teil 0.
Die offenen Punkte stehen kurz in `docs/offen-nach-v55.md` (Nr. 66–70); Silas' Entscheide vom 13.11.2026 am Ende (E1–E4).

## Was immer gilt
- Sprache Deutsch (Schweiz), «ss» statt «ß». Jede neue oder geänderte Regel: Version, Test mit erfundenen Werten, `CHANGELOG.md`,
  `CLAUDE.md`, Kapitel im Wissen (`js/wissen.js`) mit Quelle oder als «eigene Festlegung» gekennzeichnet.
- Gemessen, berechnet und geschätzt unterscheiden: Schätzungen mit «≈» und Grund, fehlend bleibt fehlend, nie raten.
- Eingaben auf der Seite nur über «Direkt speichern» (EGS1 → `eingang/`), in `merge_daily.py` mit eigener Prüffunktion `…_pruefen`
  (Ablehnung mit Grund), gleiche ID ersetzt mit Audit. Die Demo speichert nichts.
- Nach Garmin wird nur geschrieben, was E3 freigibt (6.7: eigene Einheiten und Strecken); nach Enduco nie. Enduco-Workouts nie ändern.
- enduco ist Vorbild für Aufbau und Bedienung (Wochenansicht, Tagesoptionen, «Training planen», Dauer-Regler), nie für Texte, Symbole,
  Bilder oder Workouts im Code; eigene Symbole in `V6.ICON`. Silas' eigene Enduco-Workouts aus Garmin dürfen als seine Daten erscheinen
  (wie in der Bibliothek). Keine Bilder oder Texte aus dem Internet kopieren.
- Keine persönlichen Werte (Zonen, Schwellen, Termine, Orte, IDs) in Code, Tests oder Doku; Beispiele mit «JJJJ-MM-TT» oder erfundenen Werten.
  Leck-Prüfung vor jedem Push; Bildschirmfotos mit echten Daten nie ins Repository.
- Oberfläche: 390 px ohne Überlauf, Blätter über `V59.blatt` und modal (`V59.modalAuf`/`modalZu`), Knöpfe mindestens 44 px, Farben nur über
  Variablen, Kontrast 4,5 : 1 in dunkel und hell, Erklärungen als `.hint` hinter «i», Warnungen `.warn-t`. Demo mit erfundenen Daten nachführen.
- Prüfen wie in `CLAUDE.md` («Prüfen vor jedem Push»), dazu Browser-Prüfung Demo und echte Daten (390 px, ohne Fehler in der Konsole).
  Nicht zwischen 22:45 und 23:15 pushen (Nacht-Update).

## Reihenfolge (E1: «wie du willst» → so umgesetzt)
Teil 0 (Fehler in Bestehendem, klein) → Etappe 6 (Kalender und Woche bearbeiten) → Etappe 7 (Routen) → Etappe 8 (Intensität, Tests, Analyse,
Schwimmen). Etappe 6 zuerst, weil Wochenansicht, Tagesblatt und Wochenblatt die Grundlage für die anderen Bearbeitungen sind.

## Teil 0 – Fehler in Bestehendem
0.1 **Tag im Kalender antippen zeigt scheinbar nichts.** Befund: Das Tagesdetail (`#cal-day`) erscheint unter dem ganzen Monatsraster, auf dem
    iPhone ausserhalb des Bildschirms. Sofort: Tagesdetail als Blatt öffnen (endgültig mit 6.1).
0.2 **Rennrad-Vorschläge mit Gravel.** Befund: «Training → Route» zeigt beim Rennrad Kandidaten mit Gravel und markiert sie nur als
    «ungeeignet»; fällt das eigene Profil aus, rechnet `fastbike`. Regel siehe 7.1 (`trainingsroute-1.1`).
0.3 **«Rückgängig» und «Neu» im Planer nicht sichtbar.** Befund: Beide Knöpfe liegen im eingeklappten Blatt unter dem Bildschirmrand.
    Sofort: im Kopf des Blatts neben «+ Punkt» (endgültig mit 7.3).
0.4 **LT2-Auswahl «funktioniert nicht».** Befund: Bei einem nicht ausbelasteten Test gilt nur eine LT2-Methode (Dmax und mod. Dmax nur bei
    ausbelastetem Test), die Auswahl hat darum eine einzige Möglichkeit und ist gesperrt. Neu: Text statt Auswahl («einzige gültige Methode»),
    darunter die ausgeschlossenen Methoden mit Grund, nicht wählbar. Gilt für LT1 gleich.
0.5 **Dauer «≈ 56m» beim Schwimmen** liest sich wie Meter. Dauer überall als «h:mm» oder «min», nie «m».
0.6 **GPX zu Garmin Connect** (Teil «In Dateien sichern» und Anleitung aus 7.2).

## Etappe 6 – Kalender und Woche bearbeiten
### 6.1 Tag antippen, überall (`kalender-2.0`)
- Kalender (Woche und Monat) und Heute «Diese Woche»: jeder Tag ist ein Knopf und öffnet das **Tagesblatt**, auch künftige Tage
  («Samstag schon heute ansehen»). Inhalt: Wochentag und Datum, Phase und Wochenart (siehe 6.5); «Geplant» (Enduco aus dem Garmin-Kalender,
  Vorschlag bzw. Mein Plan, eigene Einheiten; je Einheit Karte mit Zonen-Chips und Balkenprofil), «Absolviert» (mit «Analysieren»), Tests,
  Rennen; unten die Aktionen aus 6.3. Einheit antippen → Einheit-Blatt (`V6H.einheitP`).
- Abnahme: Blatt ohne Scrollen sichtbar, Fokus zurück auf den Tag, Tastatur (Enter/Leertaste), Screenreader-Name mit Wochentag, Datum und Anzahl Einheiten.

### 6.2 Wochenansicht im Kalender (`kalender-2.0`)
- Umschalter «Woche · Monat», Standard Woche, Wahl je Gerät (`sf.kal.ansicht`).
- Woche: oben das Wochenband Mo–So (Datum, Sport-Symbole, heute markiert, gesperrte Tage mit Schloss), wischen oder Pfeile für die Woche
  davor/danach, «Heute». Darunter der Wochenkopf: KW, Phase, Wochenart (Belastung 1–3, Erholung, Taper, Rennwoche), Stunden geplant/absolviert,
  TL geplant ≈ / absolviert. Dann die Tage **untereinander**, je Tag die Einheiten als Karten (Quelle Enduco, Vorschlag, eigen; erledigt mit
  Haken und Kennzahlen). Tippen auf den Tageskopf → Tagesblatt mit Aktionen.
- Monat: Raster wie heute; Tag → Tagesblatt; Tippen auf «KW» → Wochenansicht dieser Woche.

### 6.3 Tag bearbeiten (`eigenplan-1.0`)
- Aktionen im Tagesblatt (nur heute und künftige Tage; vergangene Tage nur lesen):
  «Training hinzufügen», «Tag sperren» / «Tag entsperren»; bei Einheiten aus Vorschlag oder eigen: «Verschieben» (Tag wählen),
  «Dauer ändern», «Entfernen». Enduco-Einheiten bleiben unverändert (dort nur «Ich folge»).
- **Gesperrter Tag:** nicht bearbeitbar (Aktionen aus, Hinweis «gesperrt»); «Rest der Woche neu planen» lässt ihn stehen.
- **Training hinzufügen** in Schritten, jeder als Blatt mit «Zurück»:
  1. Sportart: Schwimmen, Rad, Rad drinnen, Laufen, Laufen drinnen, Kraft/Athletik, Mobility.
  2. Art: Grundlage, Lang, Tempo, Schwelle, VO2max, Sprint/anaerob, Renntempo, Koppel, Technik (Schwimmen), Test.
  3. Vorlage mit Mini-Profil und Dauerbereich: eigene Vorlagen (`vorlagen-1.0`, aus den Modellen `modell-1.0` und `wochenplan-1.2`, eigene
     Namen und Texte) oder «Aus der Bibliothek» (Silas' Enduco-Workouts, Dauer fest, Quelle `bibliothek` mit `wid`).
  4. Dauer mit Regler in 5-min-Schritten: Ein- und Ausfahren bleiben, die Hauptserie wächst oder schrumpft im Bereich der Vorlage.
     Daneben TL ≈ und Distanz ≈ (6.4), ohne Bezugswert «offen».
  5. Speichern → erscheint sofort im Kalender (auf dem Gerät), über «Direkt speichern» in den Daten.
- Ziele nur aus dem aktiven Zonenprofil (wie `V64.ziel`), ohne Profil bzw. CSS-Test keine Ziele. Vorlagen über der Intensitätswahl der
  Sportart (8.1) ausgegraut mit Grund. Ein Lauf über der Aufbau-Grenze (`aufbau-1.1`) wird gemeldet, nicht verhindert.
- **Daten:** `plan_woche` je Montag: `{"id": "wo-JJJJ-MM-TT", "v": "eigenplan-1.0", "tage": {"JJJJ-MM-TT": {"gesperrt": true|false,
  "einheiten": null | [{"id", "sport", "art", "titel", "dauer_min", "vorlage", "quelle": "vorschlag"|"eigen"|"bibliothek", "wid", "schritte"}]}},
  "geaendert": "<ISO>"}`. `einheiten: null` = der Tag folgt dem Vorschlag (nur gesperrt oder unverändert); eine Liste ersetzt den Vorschlag
  dieses Tages. Eingabe `planwoche` → `planwoche_add` → `plan_woche`; `merge_daily.planwoche_pruefen`: Montag, Tage in der Woche, bekannte
  Sportarten und Arten, Dauer 5–600 min, an gesperrten und vergangenen Tagen keine Änderung gegenüber dem Stand davor; gleiche ID ersetzt mit Audit.
- **Wochenaktionen** (Menü in der Wochenansicht, je mit Vorschau der Änderungen und Bestätigen):
  «Änderungen verwerfen» (zurück zum Vorschlag), «Rest der Woche neu planen» (`wochenplan-1.3`: ab heute neu verteilt; Absolviertes und
  Ausgefallenes zählen: verpasste Schlüsseleinheit auf den nächsten freien passenden Tag, wenn 48 h Abstand zur nächsten derselben Sportart
  bleiben, sonst weggelassen und gemeldet; Wochenstunden und Aufteilung `aufteilung-1.0` minus Absolviertes; keine Schlüsseleinheit am Vortag
  eines Tests oder Rennens; Aufbau-Grenze), «Woche leeren» (alle künftigen, nicht gesperrten Tage frei, zum selbst Planen).
  Gesperrte und vergangene Tage bleiben immer.
- **Vergleich (`vergleich-1.3`):** «Vorschlag» ist die bearbeitete Woche, falls es eine gibt (gekennzeichnet «bearbeitet»); der unveränderte
  Modell-Vorschlag bleibt nachrechenbar (`V64.stand`). «Ich folge» bleibt Enduco · Vorschlag · frei.

### 6.4 TL ≈ und Distanz ≈ geplanter Einheiten (`tl-plan-1.0`, eigene Festlegung)
- Rad: je Schritt Dauer × (Mitte des Leistungsziels ÷ LT2)² × 100 wie `last-2.0` (LT2 aus `config.last_ref.rad`); Laufen: Dauer ×
  (LT2-Pace ÷ Ziel-Pace)² × 100 (flach angenommen); Schwimmen: Dauer × (CSS ÷ Ziel-Pace)³ × 100, nur mit CSS-Test. Schritte ohne Ziel
  oder fehlender Bezugswert → «offen» bzw. «mind.». Kraft/Athletik und Mobility ohne TL.
- Distanz: Laufen und Schwimmen aus Dauer und Ziel-Pace; Rad draussen aus dem Median-Tempo eigener Fahrten ähnlicher Dauer und Leistung
  (mindestens 5, sonst keine), drinnen keine. Immer «≈». Im Wissen erklären, dass das Modelle sind (Garmin rechnet die gelaufene TL anders).

### 6.5 Wochen im Plan antippen (`wochenblatt-1.0`)
- In «Phasen» und in der Wochenübersicht ist jede KW antippbar, auch künftige → **Wochenblatt**: Wochenart aus `saison-1.2`
  (Belastungswoche 1, 2 oder 3 = Stelle im 3:1-Block seit der letzten Erholung; Erholung mit Grund; Taper; Rennwoche), Stunden (Vorschlag bzw.
  bearbeitet, Enduco bekannt, absolviert), TL (geplant ≈, absolviert), Schlüsseleinheiten, Tests; Knopf «Im Kalender öffnen».
- Die KW-Zeilen zeigen schon geschlossen «Belastung 2 · 9 h» bzw. «Erholung · 6 h».

### 6.6 Heute
- «Diese Woche»: Tage antippbar (6.1). «Je Sportart»: Schwimmen, Rad und Laufen immer, mit geplant (Anzahl, Dauer) und absolviert (Anzahl,
  Dauer, km, TL); andere Sportarten nur, wenn absolviert. Befund: «Je Sportart» zeigt nur Absolviertes; eine Einheit vom selben Tag fehlt bis zum Nacht-Update.

### 6.7 An Garmin senden (`garmin-senden-1.0`, E3; nach 6.1–6.6)
- Gesendet werden nur Einheiten aus «Mein Plan» (Vorschlag, eigen, Bibliothek), nie etwas an Enduco; Enduco-Workouts werden nie geändert.
  Eine Bibliotheks-Einheit wird nur im Garmin-Kalender eingeplant (das Workout gibt es dort schon); Vorschlag und eigene Einheiten werden als
  neues Garmin-Workout hochgeladen (`upload_workout`, Ziele in Watt bzw. m/s aus dem aktiven Zonenprofil, Name mit Kennung «IN ·») und am Tag
  eingeplant (`schedule_workout`). Eingeplante Workouts kommen beim Synchronisieren von selbst auf die Geräte (Fenix; Edge nur Rad).
- **Von Hand:** im Tagesblatt und in der Wochenansicht «An Garmin senden» (Einheit, Tag oder Woche, bis eine Woche voraus). Die Seite legt den
  Auftrag verschlüsselt in `eingang/` (`garmin_senden` → `merge_daily.garmin_senden_pruefen`), das nächste Nacht-Update sendet ihn. Sofort geht
  es im Chat («schick die Einheiten vom …»).
- **Automatisch:** je Tag einschaltbar («am Vortag um 23 Uhr senden», Standard aus). Das Nacht-Update sendet frühestens um 23:00 Ortszeit
  (sonst wartet es), nach dem Einspielen des Eingangs, nur Einheiten von morgen, die noch nicht oder in anderer Fassung gesendet sind.
- Gesendetes wird je Einheit vermerkt (`garmin`: Workout-ID, Kalender-ID, Fassung, Zeitpunkt). Ändert sich eine gesendete Einheit vor dem Tag:
  die eigene alte Fassung in Garmin austragen und löschen (`unschedule_workout`, `delete_workout` nur für Workouts mit Vermerk), neu senden.
  Nach dem Senden geänderte Einheiten zeigt die Seite mit «geändert – nochmals senden?». Fehler beim Senden: Grund auf der Seite, kein Abbruch
  des Updates, Silas kurz informieren.
- Strecken (7.2, 7.4): Hochladen als Garmin-Strecke (`upload_course`, Typ `road_biking`), aufs Gerät über «An Gerät senden» in Garmin Connect
  (ob Strecken von selbst synchronisieren, an Silas' Geräten prüfen; nie behaupten).
- Ändert die Aufträge Nacht-Update (Garmin schreiben, Commit wie bisher) und `CLAUDE.md` («Die Seite schreibt nichts nach Garmin» gilt
  dann mit dieser Ausnahme). Tests: Umwandlung Plan → Garmin-Workout (Schritte, Wiederholungen, Ziele), Prüffunktion, «schon gesendet».

## Etappe 7 – Routen
### 7.1 Rennrad nie mit Gravel (`trainingsroute-1.1`)
- Vorschläge A/B/C, «Andere Routen» und Varianten fürs Rennrad nur über das Profil ohne Gravel. Kandidat mit Gravel oder «möglicherweise
  Gravel» → Umfahrung mit Sperrpunkten wie `gravel-rt` (höchstens 3 Runden); bleibt Gravel, wird der Kandidat verworfen, nie gezeigt.
  Gibt es keinen ohne Gravel: «Keine Rennrad-Route ohne Gravel gefunden» mit Grund (z. B. Startort), auf Wunsch die beste mit den
  Gravel-Abschnitten rot. Gilt auch beim Ersatzprofil `fastbike`. Tests mit Fixtures aus der lokalen BRouter-Instanz.

### 7.2 GPX zu Garmin (`gpx-export-2.0`)
- Befund: Die Seite übergibt die GPX-Datei dem Teilen-Menü von iOS. Garmin Connect erscheint dort nur, wenn iOS die Datei als GPX erkennt;
  aus Safari geteilte Dateien werden oft nicht so erkannt, und andere GPX-Apps können Garmin Connect aus dem Menü verdrängen. Komoot sendet
  Strecken direkt über seine Verbindung zu Garmin, nicht über eine Datei.
- Neu: zwei Knöpfe «Teilen» und «In Dateien sichern» (Download mit `.gpx`), dazu die Anleitung: Dateien-App → Datei lange drücken → Teilen →
  Garmin Connect → Streckentyp → Speichern; Alternative Garmin Connect im Browser (Training → Strecken → Importieren).
- GPX prüfen: ein Track mit Punkten und Höhen, Name ohne Sonderzeichen, Rundtour mit Endpunkt am Start; Intervall-Beginne als Wegpunkte.
- Testseite für Silas (nur Demo-Route): drei Varianten (Typ `application/gpx+xml`, Typ `application/octet-stream`, Download). Er meldet,
  bei welcher Garmin Connect erscheint; die wird Standard. Nie behaupten, es auf dem iPhone geprüft zu haben.
- Direkt an Garmin wie Komoot: über 6.7 (`upload_course`, E3).

### 7.3 Planer übersichtlicher (`planer-ui-2.0`)
- Im eingeklappten Blatt immer sichtbar: «+ Punkt», «↶ Zurück» (letzter Schritt), «Alle Punkte löschen» (mit Bestätigung, rückgängig machbar).
- Blatt in Reiter: Übersicht (Distanz, Zeit, Hm, Ankunft), Profil, Belag und Wege, Wetter und Wind, Export; seltene Optionen unter «Mehr»,
  Erklärungen hinter «i». Weniger gleichzeitig offen.
- «Pausen» heisst neu «Stopps unterwegs» und erklärt sich: geplante Halte (z. B. 1 × 15 min), sie verschieben Ankunft, Tageslicht und das
  Wetter entlang der Strecke; zur Trainingsdauer zählen sie nicht. Im Planer: «wie bisher» = dein üblicher Stopp-Anteil aus früheren Touren.

### 7.4 Trainingsvorschlag auf der Karte wählen und bearbeiten (`trainingsroute-1.2`)
- Die Linien A/B/C sind auf der Karte antippbar (Treffer mindestens 12 px), die gewählte wird hervorgehoben, unten erscheinen ihre Kennzahlen.
- «Bearbeiten» übernimmt den Vorschlag als normale Planer-Route: Start, Ziel und Zwischenziele ziehbar, beliebig viele neue Punkte
  (`wegpunkte-1.1`), sofort neu gerechnet; das Training bleibt verknüpft (Intervalle wandern mit, Abweichung zur Plandauer wird gezeigt).
- Unten dieselben Angaben wie im Planer: Belag, Wegart, Steigungen und Anstiege, Wetter und Wind je Durchfahrt, Tageslicht, Gravel,
  Intervall-Eignung. Speichern als Route (verschlüsselt), Export wie 7.2.

## Etappe 8 – Intensität, Tests, Analyse, Schwimmen
### 8.1 Intensität je Sportart: Grundlage · Schwelle · VO2max (`intensitaet-2.0`)
- Drei Stufen je Sportart: Grundlage (immer dabei), Schwelle (mit Tempo und knapp unter LT2, Schwimmen CSS), VO2max (alle Intensitäten).
  Entspricht dem bisherigen «locker / Schwelle / alles»; alte Einträge gelten weiter (locker → Grundlage, schwelle → Schwelle,
  alles → VO2max), `merge_daily.modell_pruefen` nimmt beide Schreibweisen. E2: VO2max schliesst alles ein, keine freie Kombination.
- Wirkt auf Wochenvorschlag, Vorlagen (6.3) und Prüfung des Enduco-Plans wie bisher.

### 8.2 Testkalender auf der Seite bearbeiten (`testplan-1.1`)
- Test antippen (Testkalender, Tagesblatt, Wochenblatt): «Verschieben» (Datum), «Übernehmen» (Vorschlag → geplant), «Entfernen»;
  «Test hinzufügen» (Art, Sportart, Datum, Notiz). Verstösse gegen die Regeln von `testplan-1.0` werden beim Verschieben gezeigt, nie still
  korrigiert. Termine nur verschlüsselt: Eingabe `tests` → `tests_aenderung` → `merge_daily.tests_pruefen`, gleicher Termin ersetzt mit Audit;
  der Weg über den Chat bleibt.

### 8.3 Laktat
- «Einzelmessungen» lässt sich direkt an der Karte ein- und ausblenden (Zustand je Gerät).
- LT1/LT2-Auswahl wie 0.4.

### 8.4 Ausdauertrend nach Zeitraum (`ausdauertrend-1.1`)
- Wählbar Jahr (Standard) · Quartal · Monat; je Zelle Median, n und mittlere Hälfte; unter 3 Werten «zu wenig» statt Zahl. Beim Monat ein
  Hinweis: meist nur 2–5 gleichmässige Blöcke je System, ein Monat schwankt stark; das Quartal ist der bessere Kompromiss. Ob ein Unterschied
  gesichert ist, sagt weiterhin nur «Meine Entwicklung» (`entwicklung-1.0`).

### 8.5 Schwimmübungen (`uebungen-2.0`, Technik)
- In der Einheit (Ablauf und Balkenprofil) einen Schwimmblock antippen → Übungsblatt: Name wie im Workout, Beschreibung in eigenen Worten
  (Ziel, Ablauf in 3–4 Schritten, worauf achten, typische Fehler, Hilfsmittel) und der Abschnitt im Workout (Meter, Pace, Pause).
- Ein Glossar für Einheit, Bibliothek und Karte «Technikübungen»: alle Übungsnamen, die in der Bibliothek vorkommen (die Liste wächst mit dem
  Nachholen der Schritte, 10 Workouts je Nacht), Zuordnung über normalisierte Namen (ß → ss, Gross/klein, Bindestriche) und Synonyme.
  Unbekannte Namen: «Noch keine Beschreibung» und eine Liste in den Daten, die ich im Chat ergänze.
- Mehr Beinübungen in eigenen Worten (z. B. Kraulbeine mit Brett, Beine in Seitlage, Rückenbeine, Beine mit Flossen, Delfinbeine,
  senkrechte Beine).
- Bilder (E4): frei lizenzierte Bilder mit Quelle und Lizenz, möglichst alle aus **einer** Quelle, damit sie einheitlich aussehen; vor dem
  Einbauen Lizenz je Bild prüfen (z. B. CC BY oder CC0, Namensnennung wie verlangt) und im Repository mit Quelle ablegen. Deckt keine einzelne
  Quelle alle Übungen ab: Silas die Lücke nennen und fragen, statt Quellen zu mischen. Nie Bilder ohne freie Lizenz.

## Entscheide von Silas (13.11.2026)
- **E1 Reihenfolge:** «wie du willst» → Teil 0 → Etappe 6 → 7 → 8.
- **E2 Intensität:** VO2max schliesst alles ein (nur aufbauend: Grundlage → Schwelle → VO2max).
- **E3 Uhr und Garmin:** eigene Einheiten von Hand schon bis eine Woche vorher senden, wenn sie feststehen; automatisch nur am Vortag um
  23 Uhr (bis etwa 23 Uhr passt Silas den nächsten Tag an, danach steht er). An Fenix und Edge. Umsetzung 6.7.
- **E4 Bilder:** frei lizenzierte Bilder mit Quelle, möglichst alle aus derselben Quelle (8.5).

## Weiter offen (nicht Teil dieses Auftrags)
GitHub-Historie (Nr. 58), Härtung der Seite und des Eingangs (Nr. 59–61), Zeitpunkt last-3.0, Abend-Check → Testplan.
