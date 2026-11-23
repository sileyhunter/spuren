## Einheit als Seite (V7.3, einheit-2.0, schritte-1.0)
- Jede Einheit aus Mein Plan (Kalender, Tagesblatt, Heute, Woche nach Modell) und jedes Bibliotheks-Workout öffnet als ganze Seite (`V73UI.plan(ds, uid,
  { zurueck })`, `V73UI.workout(p, opt)`); `V66UI.einheit` und `V6H.einheitP` leiten dorthin, das alte Blatt bleibt nur als Rückfall. Die Seite liegt unter den
  Blättern (`#v59-ov`): Auswahl, Bestätigung und Erklärung kommen als Blatt von unten (`V59.blatt`); «Zurück» schliesst die Seite und ruft `zurueck()`
  (z. B. Tagesblatt wieder auf). Wissen-Links schliessen die Seite (`V64UI.oeffneWissen`).
- Schritte nur aus den Abschnitten der Einheit ableiten (`V73.ausTeilen`, `V73.ausSchwimm`, `V73.ausWorkout`) – nie eigene Zeiten oder Zonen erfinden; neue
  Vorlagen brauchen nur `teile`, Blockname und Anweisung kommen aus `js/v73.js` (Texte eigen, keine Zahlen). Regel ändern = Version in `V73.VERSIONS` und
  `tests/test_v73.cjs` nachführen.
- Änderungen nur über `V66UI.aendern` (Mein Plan) bzw. `V66UI.einheitSenden` (Export); vergangene Tage nur lesen, gesperrte Tage und Einheiten wie oben.
- Farben nur über Variablen bzw. `V6.ZONEN`; neue Symbole in `V6.ICON`.

## Planeinstellungen (V7.5, planeinstellungen-1.0, Etappe 3 des Auftrags V7.3, freigegeben am 17.11.2026; V7.5.1 nach dem Auftrag nachgebaut)
- Ein Blatt als Folge wie die Vorlage: Laufen → Rad → Schwimmen → Trainingsumfang (unten «‹», «Weiter», auf dem letzten «Fertig ✓»; `V75UI.flow`), geöffnet über
  Plan → «Plan verwalten» (zuoberst), das Profil (Training; «‹» auf dem ersten Blatt zurück ins Profil), die Wochenstunden («Trainingsumfang ändern», direkt beim
  letzten Blatt) und den Link `#plan-einstellungen` (Plan mit dem Blatt). Vorbild die Planeinstellungen von enduco (Aufbau und Antippen; Texte, Symbole und Grafiken
  eigen). Jede Auswahl wird beim «Übernehmen» gespeichert, der Anfänger-Modus beim Umschalten, die Steigerung mit «Fertig ✓» (über «Direkt speichern», Eingabe
  `planeinstellung`); ohne Eintrag gilt der Standard = Verhalten bis V7.4.
- **Basis-Fitness (basis-1.1, Variante A, von Silas gewählt am 17.11.2026, «20/50/30 soll wählbar bleiben»):** im Ring die Fitness je Sportart (42-Tage-Mittel ihrer
  Last mit `config.load_model`) am Montag der Woche, also bis zum Sonntag davor (`V75.basisDaten`) – damit sich eine Woche unter der Woche nicht ändert. Start je
  Sportart = 7 × Fitness ÷ Last pro Stunde der Sportart (Last ÷ Bewegungszeit der 8 abgeschlossenen Wochen, unter 1 h die 52 Wochen davor), höchstens 30 h; ohne
  Last pro Stunde «jetzt» × Anteil. Eigener Wert je Sportart (Regler 0–200, «Zurück auf berechnet», Datum der Änderung). Wahl im Trainingsumfang: «Basis-Fitness»
  (Standard ab der Woche vom 23.11.2026, `V75.START_AB`) oder «jetzt» × 20/50/30 wie bis V7.5.1. Start und eigene Fitness gelten ab der Woche nach dem Speichern
  (`V75.einstellungen` opt.startBis): die laufende Woche bleibt, ab der nächsten rechnet die Rampe vom neuen Start (`V75UI.plan` für Kurve und Wochenstunden).
  «jetzt» steht in den Wochenstunden nur, solange ein Start mit 20/50/30 gilt. **basis-1.2 (V8.3, Datenstand):** liegen die letzten Garmin-Daten (`V75.datenBis`: mit
  `fit_log` die letzte Nacht bzw. Aktivität, sonst die letzte Aktivität oder Morgenwerte) vor dem Sonntag, gilt die Fitness vom letzten Tag mit Daten (`basisDaten(…, { datenBis })`,
  `luecke`) – fehlende Daten zählen nicht als Ruhetage.
- **Steigerung (steigerung-1.0):** ein Regler für alle drei Sportarten (Silas' Wunsch), 50–150 % in 5er-Schritten. Jede Sportart von der Basis zu Spitze ×
  aufteilung-1.0; Anteil des Wegs nach i Wochen min(1, Regler · i/(N − 1)), N = Wochen bis zum Taper; 100 % = genau saison-1.2. Höchstens 10 % (mindestens 0,5 h)
  über der Woche davor (eigene Festlegung, wie das Maximum bei enduco). Woche 0 bleibt die Basis; Erholung 65 %, B-Rennen 50 %, Taper 60/40 % unverändert.
  Vergangene Wochen (vergleich-1.4) mit den Einstellungen, die vor ihrem Montag gespeichert waren (`V75.einstellungen` opt.bis). Je Bereich ein Wort und eine Farbe
  (`V75UI.STUFEN`, eigene Worte): sanft 50–70, ausgewogen 75–110 (100 = Standard), zügig 115–125, steil 130–140, maximal 145–150 %; Kurve bis zum Hauptrennen
  (Belastungswochen ohne Erholungs-Dellen, Taper, Achse ab 0 h) mit dem Bereich 50–150 %, live beim Ziehen; Sperrzonen an beiden Enden des Reglers.
- **Indoor-Phase (indoor-phase-1.0):** je Rad und Laufen ein Zeitraum (höchstens ein Jahr). Einheiten ohne eigene Wahl (`drinnen_fest`) gelten dort als drinnen –
  angewendet in `js/v64-ui.js` nach Mein Plan und vor der Ampel (lockere Fassung und Garmin-Auftrag bleiben drinnen). Dauer und Inhalt bleiben; Bibliothek bleibt.
- **Schwimmkurs (V7.6.2, kurs-1.0):** Zeile «Schwimmkurs (Dienstag)» auf der Seite Schwimmen: letzter Kurstag (Datum, leer = läuft weiter) und «An Kurstagen nur Schwimmen».
  `V64.woche` setzt nach dem letzten Kurstag lockeres Schwimmen statt des Kurses; `V66.mitKurs` macht Kurs-Dienstage zu reinen Schwimmtagen (Zeit des Tages bleibt;
  «Kein Training» oder eine Verfügbarkeit ohne Schwimmen gehen vor). Gilt sofort (kein `vorher`), wie die übrigen Schwimm-Einstellungen.
- **Schwimmen:** Equipment (Brett, Pullbuoy, Flossen, Paddles), Standard-Bahnlänge (25/50; vorher je Gerät `sf.sw.becken`, das als Rückfall bleibt), Anfänger-Modus
  (Schalter), Stile neben Kraul (Rücken, Brust; Kraul immer; Standard Rücken wie bisher; Delfin plant die Seite nicht) → schwimmeinheit-1.2: je Woche ein gewählter Stil
  (abwechselnd) als eigener Teil am Ende des Ein- und Ausschwimmens, ganze Bahnen, auf der Uhr mit diesem Stil (garmin-senden-1.2). Je Einheit die Bahnlänge auf
  der Einheit-Seite (einheit-felder-1.1 `pool`). Vorbelegt am 17.11.2026 aus Silas' Enduco-Einstellungen (Bildschirmfoto): 50 m, Kraul und Brust, alle vier Hilfsmittel.
- Nach dem Speichern rechnen Plan, Kalender und Heute neu (Ereignis «meinplan»); offene Garmin-Aufträge dieser und der nächsten Woche werden abgeglichen
  (`V66UI.auftraegeAbgleichen`). Nichts davon geht an Enduco. Regel ändern = Version in `V75.VERSIONS`, Wissen (Kapitel «planeinstellungen») und `tests/test_v75.cjs`.
- **Sportart (V8.4.1, sportart-1.0):** «Allgemein → Sportart»: Triathlon (Standard, wie bisher), «Nur Rad» oder «Nur Laufen» – ab der nächsten Woche. Nur Rad/Laufen: Stunden aus dem Training
  dieser Sportart («jetzt», Spitze, Basis-Fitness), Woche mit 3–6 Einheiten (Rad 3/4/5/6 unter 4/7/10 h bzw. ab 10 h, Laufen unter 3,5/5/7 h bzw. ab 7 h): Mo frei, Di Schlüssel des Modells, Do zweite
  Schlüsseleinheit ab 6 h Rad bzw. 4,5 h Laufen (`V64.SCHLUESSEL2`: polarisiert eine andere VO2max-Form, pyramidal Tempo, mit Laktat Schwelle bzw. Tempo, rennspezifisch VO2max), lange Einheit
  Sa (Rad) bzw. So (Laufen) mit 1,6- bzw. 1,4-mal dem Anteil einer lockeren (höchstens `V64.LANG`), lockere Rad 45–150 min, Laufen 30–75 min, nie länger als die lange; Erholungswoche Rad eine
  Schlüsseleinheit, Laufen alles locker; Aufbau-Grenze wie bisher; Rest gemeldet. Tests nur der Sportart (kein CSS-Test, kein Rad-Kurzcheck beim Laufen), kein Schwimmkurs, keine Koppelläufe. Alles
  eigene Festlegungen (Wissen, Kapitel «planeinstellungen»). Regel ändern = Version in `V64.VERSIONS`, Wissen und `tests/test_v64.cjs`, `tests/test_v75.cjs`, `tests/test_v62.cjs`.
- **Allgemein (V7.6.1, verfuegbarkeit-1.1, Vorbild «Allgemeine Planeinstellungen» von enduco, Texte eigen):** erste Seite der Folge (sechs Blätter: Allgemein → Laufen →
  Rad → Schwimmen → Krafttraining → Trainingsumfang). «Trainingsverfügbarkeit»: alle sieben Wochentage in einem Blatt (`V66UI.verfuegbarkeitWoche`, auch aus dem Tagesblatt
  «Trainingsverfügbarkeit der ganzen Woche»): Schalter Kein Training, Sportarten (mindestens eine), Zeit in 15-min-Schritten bis 10 h, ganz rechts «offen»; «Fertig» speichert
  je geänderten Wochentag «vf-wt-N» (offen mit allen Sportarten = entfernt), die laufende Woche wird vorher einmal festgehalten, danach wie im Tagesblatt «Anpassen»,
  «Neu berechnen» oder «Nur speichern» (**seit V9.2** ersetzt durch «Woche einstellen», aus den Planeinstellungen mit «jede Woche so» vorgewählt – siehe «Umplanen» unten). «Tage für lange Einheiten» (`pe-lang`, ab der nächsten Woche): Empfehlung beim Verteilen (+80 am gewählten Tag, −20 an anderen);
  eine lange Einheit verlässt ihren Tag nur, wenn ein gewählter Tag Sportart, Zeit und keine harte Einheit an Land hat, sonst bleibt sie und die Woche meldet es; hart und
  lang an Land am selben Tag −120 (bis 1.0 −40). Verschieben trägt einen Grund (Verfügbarkeit, Tag für lange Einheiten, Tag nach dem Krafttraining).
  **verfuegbarkeit-1.2 (V8.1, Silas am 18.11.2026: «entscheide, was trainingstechnisch mehr Sinn macht»):** harte Einheiten an Land (Rad, Laufen) nie an zwei Tagen
  hintereinander – beim Verteilen −100 je Seite (Wasser derselben Sportart −20), danach wird eine von zwei benachbarten harten Einheiten auf einen Tag ohne harte oder lange
  Einheit an Land daneben verschoben (Grund «nicht zwei harte Tage hintereinander»); geht das nicht, meldet es die Woche. kraft-plan-1.2: braucht der automatische Krafttag
  ein Neuverteilen, das zwei harte Tage hintereinander ergäbe, nimmt die Seite einen Tag, an dem das Krafttraining ohne Verschieben passt.
  **Übernommen am 17.11.2026 aus Silas' Enduco-Einstellungen (Bildschirmfotos) und seiner Nachricht:** Mo kein Training, Di nur Schwimmen (Schwimmkurs bis Dezember), Mi–Fr 2:45 h,
  Sa und So 5:00 h; lange Ausfahrt Sa/So, langer Lauf Do (wie Enduco); Krafttraining automatisch ohne Do. **Seit 17.11.2026 (V7.6.2, Silas: «offene Punkte bereinigen»):** Di 2:45 h
  mit allen Sportarten und «An Kurstagen nur Schwimmen» (kurs-1.0; letzter Kurstag am 18.11.2026 von Silas genannt und eingetragen, nur verschlüsselt; danach gilt der
  Dienstag ohne weiteres Zutun wieder für alle Sportarten); langer Lauf So (am Do war neben Rad-Schlüssel und CSS kein Platz, die Woche meldete es jede Woche).
- **Krafttraining (V7.6, kraft-plan-1.1, Etappe 7; Regeln von Silas am 17.11.2026 freigegeben):** Seite zwischen Schwimmen und Trainingsumfang, Blatt `V75UI.kraft` (auch aus
  dem Tagesblatt und der Einheit-Seite): an/aus, Tag «Automatisch» (mögliche Tage; Silas: alle ausser Do, dort schliesst der Kraftraum früh) oder «Fester Tag» (Wochentag),
  Uhrzeit (oder ohne), Dauer 15–180 min (Standard 1:30 h), Notiz für die Übungen (die Seite plant keine Übungen). Gilt ab der Woche nach dem Speichern (`vorher` hält die
  laufende Woche fest). Einheit «Krafttraining» (`kraft_plan`, `kraft_auto`) im Wochenvorschlag: nicht in den Wochenstunden, nicht in TL ≈, Fitness, Form und Ampel-Last
  (pmc-2.1), nicht an Garmin; belegt beim Verteilen seine Zeit. **Regeln:** (1) am Tag danach keine harte Rad- oder Laufeinheit (umziehen, sonst locker, gemeldet); (2) am
  Krafttag darf eine harte Einheit bleiben (Kraft danach, Hinweis unter 6 h Abstand), eine lockere Einheit an Land aus dem Vorschlag höchstens 60 min (`V76.abstimmen`, nach
  dem Verteilen), lange Einheit nur Hinweis; (3) belegt Zeit, zählt nicht; (4) nicht am Test- und am Vortag (fest: einen Tag früher, sonst fällt es aus); (5) keine Kraft in
  Rennwochen, im Taper des A-Rennens nur 7–10 Tage davor mit zwei Dritteln; (6) Erholungswoche zwei Drittel; (7) «vorsichtig»: bleibt (die Ampel holt am Tag danach keine
  harte Rad- oder Laufeinheit nach); (8) sRPE = RPE × Minuten als eigene Zahl; (9) nicht an Garmin. **Automatisch:** jeder mögliche Tag (nicht «Kein Training», nicht gesperrt,
  nicht test-nah, im Taper nur im Fenster) wird an der schon verteilten Woche bewertet (`V76.bewerten`, eigene Gewichte: Tag danach hart an Land −100, lang −10; am Tag lang
  −50, hart −5, locker bis 60 min +10, länger −20; Zeit reicht nicht −30 und −5 je 15 min, höchstens −80); passt es dort (`V76.passt`), bleibt die Woche, sonst neu verteilt.
  Aufgezeichnete Garmin-Krafteinheiten (Typ «Krafttraining»/«Strength») zählen seit pmc-2.1 nicht mehr in Fitness und Form; sie stehen in «Diese Woche» und in der
  Wochenauswertung als eigene Zeile. «Nur diese Woche» auf der Einheit-Seite: in kommenden Wochen, deren Tage dem Vorschlag folgen, als Ausnahme «pe-kraft-<Montag>»; in der
  laufenden Woche und an gespeicherten Tagen über Mein Plan (verschieben, entfernen). Regel ändern = Version in `V76.VERSIONS`, Wissen (Kapitel «kraft») und `tests/test_v76.cjs`.

## Täglicher Coach (V8.3, tagescoach-1.0, Masterprompt V8 Abschnitte 2, 9, 10; von Silas am 18.11.2026 freigegeben)
- Der Coach rechnet bei jedem Zeichnen neu (nach Morgen-Update, Check-in, neuer Einheit, geänderter Verfügbarkeit) über gestern bis sechs Tage voraus, wie es gilt
  (`V64UI.kontextFuer`: Mein Plan mit Verteilung, Kraft, Aktivitäten draussen und Ampel-Schicht). Vier Prüfungen (eigene Festlegungen, Wissen Kapitel «coach»):
  **morgen** (einzelner Morgen: HRV ≥ 10 % bzw. 2 × tägliche Schwankung tiefer UND Ruhepuls ≥ 5 bzw. 2 × höher als die 7 Tage davor, oder einer allein stark 20 %/8 bzw. 3 ×;
  nur solange die Ampel nicht «vorsichtig» zeigt) → harte Einheit an Land heute oder morgen; **last** (gestern oder heute ≥ 1,3 × und +15 über TL ≈ oder hart nach Puls, wo locker
  geplant; ohne Pulsverteilung Last ≥ 75 je Stunde) → harte Einheit an Land am Tag danach; **zeit** (festgehaltener Tag über der Verfügbarkeit + 5 min) → Kurzfassung derselben
  Sportart (längste bewegliche Einheit gekürzt, sonst locker; übrige bewegliche weg; feste – gesperrt, Test, Kurs, Kraft, draussen – bleiben, füllen sie die Zeit: nur Hinweis);
  **nachholen** (ampel-plan-1.2) → Schlüsseleinheit an Stelle der lockeren am vorgeschlagenen Tag. Optionen: tauschen (mit der lockeren derselben Sportart an einem späteren Tag
  der Woche, Regeln wie das Nachholen der Ampel), locker (`V74.locker`), kurz, nachholen.
- Nie: gesperrte Tage oder Einheiten, Tests, Rennen, Schwimmkurs, vergangene Tage, heute schon absolvierte Sportart; nie härter oder länger als Mein Plan. Abgelehnte und
  zurückgeholte Vorschläge (gleiche ID) kommen nicht wieder. Annehmen = `V66UI.aendernFolge` (Mein Plan, offene Garmin-Aufträge nachgeführt) + Entscheid; Rückgängig = Rückweg,
  solange kein betroffener Tag vorbei ist. Geänderte Einheiten tragen «Coach» (Tagesblatt, Heute, Kalender).
- **coach-einfach-1.0 (V9.5.2, Silas 23.11.: «möglichst einfach aussehen und einfach handhaben»):** Die Karte auf Heute erscheint nur, wenn es etwas zu entscheiden gibt; je Vorschlag Titel,
  der erste Grund, was sich ändert, Knöpfe. Keine Liste «Angenommen», kein «Geprüft», kein Erklärtext, kein Probelauf-Hinweis; nach «Annehmen» eine Zeile mit «Rückgängig» (`V83UI.zuletzt`,
  bis zum nächsten Laden). Das Tagesblatt zeigt die Vorschläge des Tages wie bisher.
- Probelauf bis `config.enduco_bis` (2026-11-30, Silas trainiert bis Ende November mit Enduco): Hinweis auf der Karte; danach gilt nur noch Mein Plan. Selbst handelt der Coach
  nicht – Automatik erst nach Silas' Okay und nur in Grenzen, die er setzt. Regel ändern = Version in `V83.VERSIONS`, Wissen (Kapitel «coach») und `tests/test_v83.cjs`.
- **tagescoach-1.1 (V8.4, Silas am 18.11.2026: «lange Einheiten, wenn die Verfügbarkeit reicht – mit der Laufentwicklung aufpassen», «eine Verletzung, die die Laufkilometer
  bremst», «Folgewochen dürfen angepasst werden»):** drei neue Anlässe (`V83.ANLASS`): **ausgefallen** (Schlüsseleinheit von gestern ohne Aktivität derselben Sportart →
  an Stelle einer lockeren an einem der nächsten Tage, auch nächste Woche, nie in Erholungs-, Taper- oder Rennwoche, keine harte derselben Sportart innert 2 Tagen);
  **umfang** (`V83.UMFANG`: ab 20 fehlenden Minuten einer Sportart in der laufenden Woche eine kommende lockere oder lange Einheit verlängern, höchstens um das Fehlende, die
  Hälfte ihrer Dauer, die Verfügbarkeit, `V64.LANG` der Phase und beim Laufen die Aufbau-Grenze mit Distanz ≈ aus `V64.kmSchaetzung`; ohne Distanz kein längerer Lauf;
  Nachgeholtes zählt nicht doppelt) – damit ist «nie länger als Mein Plan» je Einheit aufgehoben, die Woche bleibt bei Mein Plan; **schmerz** (`V83.SCHMERZ`: Schmerzen an
  Beinen oder Füssen im Check-in von heute → leicht: Läufe der nächsten 3 Tage locker und 70 %; deutlich: heute und morgen weglassen oder Rad locker statt Laufen; an 3 der
  letzten 5 Tage die ganze Woche mit Rat zur Abklärung). Tauschen und Nachholen auch in die nächste Woche (`entfernen` + `hinzufuegen` statt `verschieben`); die Seite prüft
  erst alle betroffenen Wochen (`V66UI.aendernFolge(mo, aktionen, { trocken: true })`) und speichert dann je Woche (`V83UI` `anwenden`), Rückgängig ebenso.

## Modell «Automatisch» (V8.5, automatisch-1.0, Masterprompt V8 Abschnitt 6; von Silas am 18.11.2026 freigegeben)
- Sechstes Modell unter Plan → Trainingsmodell; der Standard bleibt «kombiniert» (Silas' Wahl), «Automatisch» gilt erst, wenn er es übernimmt. Startet wie «kombiniert» (polarisiert bis
  zum Wechsel, danach rennspezifisch; der Wechsel ist wählbar wie dort) und entscheidet je Woche, jede Wahl mit Grund (Box `#mo-auto`, auch als Vorschau bei anderem Modell):
  **Verteilung** (nur in polarisierten Wochen): pyramidal (Rad Schwelle statt VO2max, Laufen bleibt), wenn «Verteilung und Entwicklung» klar zeigt, dass mehr Anteil hart mit schlechterer
  oder mehr Anteil mittel mit besserer Rad-Effizienz im Block danach einherging (verteilung-1.1: mindestens 3 der 4 Einteilungen der Blöcke); gewechselt wird nur zu Beginn eines Blocks
  (Daten bis zum Sonntag davor, `V85.stichtag`). **Harte Einheiten an Land:** höchstens die Vorlage (Triathlon zwei, Erholungswoche eine, Rennwoche keine; nur Rad/Laufen wie
  sportart-1.0); eine weniger, wenn an mindestens 3 der 7 Tage vor dem Montag die Ampel «vorsichtig» oder krank zeigte, der Trainingsstatus am Montag ab 1,5 liegt, Wochen mit so vielen
  harten Einheiten bei ihm mit schlechterer Erholung einhergingen («Was du bisher verträgst», `dim.harte.ab`) oder die Woche (Triathlon) unter 5 h hat. Dann wird der harte Lauf locker
  (gleiche Dauer), das Rad bleibt; nur Rad/Laufen: keine zweite Schlüsseleinheit. Erholungswoche, Taper und Rennwoche wie die Vorlage. Kommende Wochen: Ermüdung «zeigt sich am Montag».
- Nie mehr als die Vorlage, nie mehr Stunden: gute Erholung macht nichts härter (Test C3). Intensität je Sportart und Mein Plan gelten weiter; gespeicherte Wochen behalten ihre Einheiten.
  Vergangene Wochen (Vergleich) mit ihrem eigenen Stichtag. Grenzen und Reihenfolge sind eigene Festlegungen (Wissen, Kapitel «modelle»). Nichts davon geht an Garmin oder Enduco,
  ausser über die gewohnten Aufträge. Am 19.11.2026 mit echten Daten geprüft (Ergebnis nur im Chat). Regel ändern = Version in `V85.VERSIONS`, Wissen und
  `tests/test_v85.cjs`, `tests/test_v80.cjs`.

## Verpflegung je Einheit (V8.1.1, verpflegung-1.0, Silas' Wunsch vom 18.11.2026; 1.1 = V8.1.2 nur seine Produktgruppen; 2.0 = V8.4 kurz und bündig)
- **verpflegung-2.0 (Silas am 18.11.2026: «zu kompliziert, so füll ich das nie aus – Vorschlag g/h, ich entscheide, wie ich sie aufnehme; kurz und bündig»):** auf der Einheit-Seite
  nur noch g/h gross, Menge für die Einheit, «ab Minute 20, dann alle 20–30 min», je eine Zeile «Vorher» (lange oder harte Einheit) und «Nachher» (nur rasch auffüllen vor der
  nächsten harten oder langen Einheit in weniger als 8 h); keine Produkte, kein Zeitplan, keine Packliste in der Oberfläche (`VP.knapp`; die Produktlogik bleibt im Modul für
  den Vergleich, wird aber nicht gezeigt). Über 60 g/h kein Deckel mehr, nur der Hinweis «Glukose und Fruktose zusammen». «Anpassen»: g/h dieser Einheit, «Diesmal ohne» und die
  Stufe ab 2,5 h (`pe-verpflegung` `max_g_h`). Die Absätze unten zu Produkten gelten nur noch für die Rechnung im Hintergrund.
- Je Einheit aus Mein Plan eine Empfehlung vorher · während · nachher (`VP.plan`), nur mit Silas' eigenen Produkten: eigene Lebensmittel aus Garmin Connect
  (`garmin_lebensmittel`, Nacht-Update) und die Fueling-Vorlagen. Nährwerte nur wie dort eingetragen, nie geschätzt oder ergänzt; ohne passende Produkte nur Gramm
  Kohlenhydrate. Welche Produkte wofür (unterwegs, vorher, nachher) und welche aus Glukose und Fruktose sind, wählt Silas auf der Seite («Produkte für die Verpflegung»);
  **verpflegung-1.1 (Silas am 18.11.2026: «nicht zu viele Lebensmittel»):** ohne Wahl nur seine Gruppen (`VP.GRUPPEN`, `VP.imSet`): unterwegs Gels, Fruchtgummi
  (Art «gummi», z. B. Haribo), Kohlenhydrat-Getränke und Bananen; vorher Banane, Hafer-Riegel und Hafer-Getränk (Art «hafer», z. B. Instant Oats, als Beispiel für die
  Mahlzeit); nachher Whey und Hafer (Beispiel zum Auffüllen); andere eigene Lebensmittel (Apfel, Honig …) nur mit eigener Auswahl; was im Fueling-Protokoll vorkommt zuerst.
  Während höchstens zwei Produktarten je Einheit, Frucht nach Gewicht höchstens 200 g; Wanderung, Skitour, Langlauf (Sport «wandern»/«ski», nicht Traillauf) zuerst
  Riegel, dann Fruchtgummi bzw. Gel, und höchstens 30 g/h in Z1 bzw. 45 g/h in Z2 (eigene Festlegungen, niedrige Intensität).
- **Was er genommen hat:** Silas trägt es nach der Einheit über Claude ins Garmin-Ernährungsprotokoll ein – im Chat mit `log_custom_food` (food_id und serving_id
  aus `get_custom_foods`, `meal_time` = Uhrzeit der Einnahme während der Aktivität); das Nacht-Update ordnet es zu (fueling-garmin-1.0, «fg-…»). Oder als Notiz an der
  Garmin-Aktivität (notizen-1.0, Vorschau «fn-…», auf der Seite einmal bestätigen). Ein neues Produkt (z. B. Haribo) nur mit den Werten vom Etikett als eigenes
  Lebensmittel anlegen und nur mit seinem Okay; nie Nährwerte schätzen.
- Während (Richtwerte Jeukendrup 2014, Thomas et al. 2016): unter 75 min nichts (hart ab 45 min: eine kleine Portion in der ersten Pause ab Minute 20, «oder nichts»),
  75 bis unter 120 min 30 g/h (hart 45 g/h), 120 bis unter 150 min 60 g/h, ab 150 min seine Stufe (Standard 60, 30–120 einstellbar; über 60 nur mit Produkten aus Glukose und Fruktose);
  Schwimmen, Krafttraining, Mobility nichts; Tests «wie beim letzten Test». Zeitpunkte ab Minute 20 gleichmässig bis 10 min vor Schluss, nie in harten Abschnitten.
  Vorher Mahlzeit 1–4 h (≈ 1 g/kg je Stunde Abstand) und Snack 30–60 min; nachher Protein 0,25 g/kg (20–40 g, Jäger et al. 2017), rasch Kohlenhydrate (1–1,2 g/kg)
  nur, wenn die nächste harte oder lange Einheit in weniger als 8 h kommt. Alles Weitere sind eigene Festlegungen (Wissen, Kapitel «verpflegung»).
- Anpassen je Einheit («Verpflegung anpassen»: g/h, Produktart, ohne Verpflegung) gilt nur für diese Einheit. «Nach dem Training» fragt ab 60 min Magen und Energie
  (nachher-1.1); daraus und aus dem Fueling-Protokoll der Abgleich geplant gegen genommen und der Vorschlag fürs Darmtraining (+10 g/h nach dreimal ohne Beschwerden,
  −10 nach zweimal starken; nur Vorschlag, die Stufe ändert nur Silas).
- Nichts davon geht an Garmin oder Enduco; Lebensmittel in Garmin werden nur gelesen. Regel ändern = Version in `VP.VERSIONS`, Wissen (Kapitel «verpflegung») und
  `tests/test_verpflegung.cjs` nachführen.

## Aktivitäten draussen (V7.7, aktivitaet-plan-1.0, Etappe 4 Teil 1; Vorschlag vom 17.11.2026, von Silas am 18.11.2026 bestätigt, Ersatz «nur Rad» von Claude entschieden)
- Skitour, Wandern, Langlauf und Traillauf im Voraus planen (Tagesblatt → «Training hinzufügen» → «Draussen – blockiert den Tag», Blatt `V77UI.blatt`): Dauer 1–10 h in
  15-min-Schritten, Z1 oder Z2 nach Puls (Pulszonen vom Laufen, wie Wandern in `V6.SKALA`), Uhrzeit und Notiz optional; ein Eintrag je Tag. Der Rest von Etappe 4 (Kalender,
  Zyklus, Bearbeiten, Tagesblatt wie enduco) erst nach Silas' Okay.
- Wirkung (eigene Festlegungen, Wissen Kapitel «draussen»): der Tag gehört der Aktivität (`V66.verteilen` `aktTag`: keine andere Einheit des Vorschlags), ab 2 h am Vortag
  und am Tag danach keine harte Rad- oder Laufeinheit (wie nach dem Krafttraining, sonst locker, gemeldet). Ersatz: Skitour, Langlauf, Wandern ersetzen Rad-Stunden, Traillauf
  Lauf-Stunden (Laufen sonst unberührt – für Hamburg am spezifischsten, Aufbau am heikelsten); Z2 ganz, Z1 halb; ab 2 h zuerst die lange Einheit, dann lockere (die nächste
  zuerst), unter 2 h umgekehrt; Schlüssel, Tests, eigene und gesperrte Einheiten nie; Rest kommt dazu (gemeldet). Tests am selben Tag oder am Tag danach nur gemeldet, nie
  verschoben. Krafttraining nicht am Tag der Aktivität (`V76.einplanen`), Nachholen der Ampel nicht dort und (Rad, Laufen) nicht daneben (`V74.woche`).
- Ungespeicherte Wochen rechnen die Aktivität von selbst ein (`V64UI` kontext `mitAkt`, vor dem Krafttraining und dem Verteilen; vergangene Wochen nicht). Gespeicherte Wochen
  (`ganz`): beim Speichern `V66.aendern` «aktivitaet» (Einheit «akt-<Datum>» rein, Ersatz ab heute mit `schon` = was die bisherige Fassung schon ersetzt hat, dann «Anpassen»);
  entfernen = «aktivitaet_weg» (Ersetztes kommt mit «Neu berechnen» zurück).
- TL ≈ aus den eigenen Aktivitäten derselben Art (`V77.tlProStunde`: Median Last pro Stunde, zwei Jahre, mind. drei ab 1 h; Z1 × 0,8), sonst keine Zahl. Zählt in Fitness,
  Form und Ampel wie absolvierte Skitouren. Ampel «vorsichtig»: zwei Drittel (ab 90 min) und Z1 (`V74.locker`). Nie an Garmin (`V66.garminGrund`). Traillauf erhöht die
  Aufbau-Grenze im Voraus nicht (Distanz unbekannt), absolvierte Trailläufe zählen wie jeder Lauf. Kopfbilder: Skitour, Wandern; Langlauf mit dem Skitour-, Traillauf mit dem
  Wanderbild.
- **Zonen nach Puls prüfen (zonenpruefung-hf-1.0, Karte `#zp-card` unter Laktat):** bestätigte Kurzchecks mit Puls-Fenster ab 10 min (laktat-hf-1.0) und Pulsanstieg bis 5 %
  gegen LT1 ≈ = Basis + 0,5 mmol/l des letzten bestätigten Stufentests davor (Rad mit Rad, sonst Laufen): Puls in Z1–Z2 und Laktat deutlich darunter «passt», deutlich darüber
  «Z2 zu hoch», sonst «unklar» (deutlich = 2·√(σ₁² + σ₂²), σ = max(0,15; 7,5 %)); Puls über Z2 nicht beurteilt. Hinweis erst nach drei gleichen Urteilen in acht Wochen;
  Zonen ändern sich nie von selbst. Regel ändern = Version in `V77.VERSIONS`, Wissen (Kapitel «draussen») und `tests/test_v77.cjs`.

## Ampel passt das Training an (V7.4, ampel-plan-1.0, Etappe 6 des Auftrags V7.3, freigegeben am 17.11.2026)
- Entscheid je Tag aus der Ampel (readiness-2.2, `V74.entscheid`): «bereit», «normal», «nicht beurteilbar» = wie geplant; «vorsichtig» = keine harten und
  keine mittleren Abschnitte (Rad, Laufen, Schwimmen: lockere Einheit derselben Sportart, `V74.locker`; Renntempo fällt weg; Einheiten über 90 min oder
  der Art «lang» höchstens zwei Drittel; Tests werden locker und im Testkalender verschoben); Krankheitszeichen im Check-in = Ruhetag. Solange für heute
  weder Schlaf noch HRV der Nacht da sind, zählt nur der Check-in (Befinden «belastet» = vorsichtig). Gesperrte Einheiten und Tage bleiben unverändert
  (Hinweis), Schwimmkurs, Kraft und Mobility auch. Nie härter, nie länger, nie eine andere Sportart.
- Nachholen (`V74.woche`; **seit ampel-plan-1.2 (V8.3) nur als Vorschlag des Tagescoaches**, nie von selbst – angenommen über `V66.aendern` «ersetzen»): eine
  Schlüsseleinheit (Rad, Laufen, CSS; harte Bibliothek), die locker wurde, kommt am nächsten passenden kommenden Tag derselben Woche (Tage ohne Entscheid)
  an die Stelle einer lockeren Einheit derselben Sportart (Platz und Kennung der ersetzten Einheit, höchstens so lang, sonst die kurze Fassung): nicht
  neben einer harten Einheit an Land bzw. derselben Sportart, nicht an Test- oder Renntagen und deren Vortag, nicht an gesperrten Tagen, nur mit Zeit
  laut Verfügbarkeit, als Rad- oder Laufeinheit nicht am Tag nach einem Krafttraining (ampel-plan-1.1, V7.6.1), nie in Rennwochen und nie nach Krankheitszeichen.
  Ist der Nachhol-Tag selbst «vorsichtig», gilt dort wieder die lockere Einheit.
  Passt kein Tag, entfällt sie – gemeldet, nie still.
- Gespeichert wird nur der Entscheid je Tag (`ampel_anpassung`, von der Seite ohne Knopfdruck, wenn er sich ändert, und vom Morgen-Update); vergangene
  Tage gelten so, wie entschieden, heute live, kommende Tage ohne Entscheid. Die Schicht wird beim Zeichnen angewendet (`V64UI` kontext → `V74UI.anwenden`):
  Heute, Kalender, Tagesblatt, Einheit-Seite, TL ≈, Form und Plan-Übersicht rechnen mit dem, was galt; Mein Plan (`plan_woche`) bleibt unverändert,
  Änderungen gehen weiter über `V66.aendern`. Nachgeholte Einheiten sind auf der Einheit-Seite nur zu lesen.
- **checkin-anpassung-1.0 / ampel-plan-1.3 (V9.8, Silas 23.11.2026: «wie Enduco, mit Ausnahme»):** «vorsichtig» passt heute nicht mehr von selbst an, sondern
  schlägt vor: Karte «Heute lieber locker?» mit Grund (höchstens zwei Gründe der Ampel), «Ignorieren» / «Überprüfen» → Blatt «Geändert» (alte Einheit durchgestrichen, darunter die
  lockere) bzw. «Gestrichen» → «Akzeptieren». Bis zur Antwort bleibt Mein Plan, wie er ist (`V74.wirkung`: `offen`); «Akzeptieren» speichert `angenommen {an, am}` (und
  `trotzdem.an = false`), «Ignorieren» `trotzdem.an = true` – die Karte kommt an diesem Tag nicht wieder, eine Zeile «Doch anpassen» bleibt. Angewendet: kurzer Hinweis mit
  «Rückgängig». Ändert sich heute nichts (keine harte Einheit), gibt es keine Frage, nur eine Zeile. **Ausnahme:** Krankheitszeichen im Check-in machen den Tag wie bisher von
  selbst zum Ruhetag. Einträge vor ampel-plan-1.3 gelten, wie sie galten (Vergangenes bleibt). Das Morgen-Update ersetzt auf der Uhr bei «vorsichtig» erst nach «Akzeptieren»;
  wird später am Morgen akzeptiert, steht auf der Uhr noch die harte Fassung (Hinweis wie bei W1). Der Coach (tagescoach) bleibt eine eigene Karte; das Zusammenlegen beider
  Karten (Auftrag Punkt 6) ist zurückgestellt, die Coach-Karte ist seit V9.5.2 schlicht.
- «Trotzdem wie geplant» gilt je Tag (nur heute antippbar). Ab dem dritten Tag «vorsichtig» bzw. krank in Folge zeigt die Seite «Woche anpassen?»: Rest
  der Woche als Erholungswoche (V64-Vorschlag mit Erholung, 65 % der Stunden, nach der Verfügbarkeit verteilt; Aktion «erholung», eigenplan-1.2) – nur
  auf Knopfdruck, gesperrte Tage bleiben, nicht in Erholungs-, Taper- oder Rennwochen.
- Garmin: siehe «An Garmin senden» (lockere Fassung im Auftrag, Morgen-Update Schritt «Ampel»). Regel ändern = Version in `V74.VERSIONS`, Wissen (Kapitel
  «erholung») und `tests/test_v74.cjs` nachführen.


## Trainingsmodell, Woche nach Modell und Wissen (V6.4, Etappe 4)
- **Modelle `modell-1.0` (`V64.MODELLE`):** polarisiert (Schlüssel Rad 30/15, Laufen 4 × 4 min), pyramidal (Rad 3 × 15 min unter LT2, Laufen 4 × 4),
  Schwelle mit Laktat/norwegisch (Rad 5 × 8, Laufen 6 × 5 min unter LT2, Laktat nach der 2. und 4. Wiederholung; über dem eigenen LT2-Wert die
  nächste leichter – eigene Regel), rennspezifisch (Tempo Rad 2 × 20, Laufen 3 × 10 min, Renntempo in den langen Einheiten, Koppellauf Sa) und
  **kombiniert = Standard** (von Silas gewählt am 13.11.2026): polarisiert bis zum Wechsel (vorgegeben 1. Februar im Jahr des Hauptrennens,
  auf der Seite änderbar), ab der Woche des Wechsels rennspezifisch. Die Wahl kommt nur über «Direkt speichern» (`modell` → `plan_modell`).
- **Woche `wochenplan-1.2` (`V64.woche`, 1.1 = mit Aufbau-Grenze und Intensität je Sportart; 1.2 = Prüfung V6.4, siehe unten):** Mo frei · Di Laufen (Schlüssel) und Schwimmkurs · Mi Rad locker · Do Rad (Schlüssel) und CSS-Schwimmen ·
  Fr Laufen locker · Sa lange Ausfahrt (+ Koppel) · So langer Lauf (+ Schwimmen). Stunden aus saison-1.2 (`AN.saisonStunden`/`AN.saisonVorgaben`),
  seit V7.5 je Sportart aus basis-1.1 und steigerung-1.0 (`V75.rampe`, Planeinstellungen; `V64.woche` mit `aufteilung` je Woche),
  `aufteilung-1.0` Schwimmen 20 %, Rad 50 %, Laufen 30 % (eigene Festlegung, seit V7.5 das Ziel an der Spitze); Anzahl je Sportart nach Stunden (unter 7 h je 2 Rad/Lauf, 1 Schwimmen);
  längste Einheit je Phase begrenzt (`V64.LANG`), Rest wird gemeldet, nie still verteilt; mehr als geplant (Mindestdauern bei wenigen Stunden)
  ebenso. Erholungswoche: nur Rad-Schlüssel gekürzt, Laufen und Schwimmen locker. Taper: Schlüssel mit einem Drittel bis der Hälfte weniger
  Wiederholungen, Intensität bleibt. Rennwoche: 2 Tage vorher frei, Vortag Aktivierung, danach frei. Tests der Woche (Testkalender und
  Vorschläge, nicht erledigt) ersetzen die Einheit derselben Sportart, Kurzcheck in einer lockeren Ausfahrt (±2 Tage); vor einem Stufentest wird
  die Schlüsseleinheit derselben Sportart in den 3 Tagen davor locker. Sportart eines Tests über `V62.testSport` (fehlt `sport`: aus der Notiz).
  Ziele aus dem aktiven Zonenprofil (`V64.ziel`; Laufen Z1 «langsamer als»), ohne Profil bzw. CSS-Test
  nichts geraten. Renntempo = Rad 95–100 % der Leistung an LT1, Laufen bis 3 % langsamer als an LT1 (eigene Festlegung), zählt als locker.
- **Abwechslung `abwechslung-1.0` (V8.4, Masterprompt V8):** gleicher Reiz in anderer Form (`V64.FAMILIEN`): Rad VO2max 30/15 · 4 × 5 · 40/20, Laufen 4 × 4 · 5 × 3 · 30/30, Schwelle 3 × 15 ·
  4 × 10 · 3 × 12 min, Tempo Rad 2 × 20 · 3 × 15, Laufen 3 × 10 · 2 × 15 · 4 × 8 min, Schwimmen CSS 100/200/300 m (Pause 15/20/30 s, CSS-Strecke höchstens ≈ 1600 m, Anfänger-Modus bleibt bei 50 m).
  Die erste Form ist die Vergleichseinheit: jede dritte Woche ab der Woche vom 5.1.2026 (`V64.FORM_START`), sonst die anderen der Reihe nach; Schwelle mit Laktat bleibt immer gleich.
  Ähnliche Zeit im Bereich wie die Vergleichseinheit (Test in `tests/test_v64.cjs`); Varianten erben `V64.STUFE_BAUSTEIN` und `V64.ERSATZ`. Gilt nur für den Vorschlag; gespeicherte
  Wochen und Mein Plan behalten ihre Einheiten. Formen ausser 30/15, 4 × 5 und 4 × 4 und die Reihenfolge sind eigene Festlegungen (Wissen, Kapitel «intervalle»). Regel ändern = Version
  in `V64.VERSIONS`, Wissen und Tests nachführen.
- **Lauf-ABC `lauf-abc-1.0` (V8.4.1):** jeder harte Lauf (Schlüssel: VO2max, Tempo, Schwelle mit Laktat) mit Lauf-ABC nach 10 min Einlaufen – vor VO2max die Koordination (B), sonst
  die Beweglichkeit (A); Einheit gleich lang (Auslaufen kürzer, mind. 5 min, sonst höchstens 1 min länger). Nicht in Tests, lockeren, langen und Koppelläufen, nie beim Rad. Regel ändern =
  Version in `V64.VERSIONS`, Wissen (Kapitel «intervalle») und `tests/test_v64.cjs`.
- **Intensität je Sportart `intensitaet-1.1` (V6.4.2; 1.1 = Titel-Regel mit Neuro und locker, V6.4.3, Version nachgeführt in V6.4.4; `V64.kappen`, `V64.planStufe`):** je Sportart «nur locker», «bis Schwelle» (Tempo, knapp unter
  LT2, CSS; keine VO2max-Intervalle) oder «alles» (Standard). Gespeichert im Eintrag «modell» (`intensitaet` = {schwimm, rad, lauf}, `vi`;
  `merge_daily.modell_pruefen` lehnt unbekannte Sportarten oder Stufen ab). Der Vorschlag ersetzt eine Schlüsseleinheit über der Wahl durch die nächst
  leichtere derselben Sportart (`V64.ERSATZ`; locker mit gleicher Dauer) und verschiebt nichts auf eine andere Sportart; die Prüfung der Verteilung
  ist dann «nicht beurteilt» mit Grund. Enduco-Plan nur geprüft: Stufe aus den Zielen der Schritte, ohne Ziele aus dem Titel («laut Titel»).
- **Aufbau-Check `aufbau-1.1` (V6.4.2; 1.1 V6.4.4: Laufpause und Nachprüfung, siehe Ende; `V64.aufbau`, Karte `#ab-card` unter Plan):** jeder Lauf (0,5–100 km) gegen den längsten Lauf der 30 Tage
  davor (frühere am selben Tag zählen), Klassen nach Frandsen et al. 2025 (bis 10 %, 10–30, 30–100, über 100 %; Raten 1,64/1,52/2,28 nur als
  Beobachtung), Grenze für den nächsten Lauf = 10 % über dem längsten der 30 Tage (auf 0,1 km abgerundet, nur absolvierte Läufe), wann der
  Referenzlauf wegfällt, geplante Enduco-Läufe (Distanz aus Pace-Zielen geschätzt, offene Schritte = «mind.»), Wochen-km Laufen, Schwimm-Meter,
  Rad-Stunden (12 Wochen). Schwimmen und Rad ohne Grenze (keine geprüfte). Der Wochenvorschlag kürzt den langen und den lockeren Lauf unter die
  Grenze (Distanz aus dem Zonenprofil, Z1 mit dem langsamen Rand von Z2; nach dem Kürzen nachgeprüft, liegt auch die Untergrenze von 20 min darüber,
  ausdrücklich gemeldet), übrige Läufe nur als Hinweis; ohne Lauf-Pace-Zonen keine Begrenzung. aufbau-1.1: kein Lauf in den 30 Tagen davor (Pause) →
  langer und lockerer Lauf höchstens 30 min locker (`V64.PAUSE_MIN`, eigene Festlegung), harte Läufe gemeldet; ohne Läufe in den Daten nichts begrenzt. **aufbau-1.2 (V7.6.2):**
  für Wochen weiter voraus zählen die geplanten Läufe der Wochen dazwischen (Mein Plan bzw. Vorschlag, Distanz ≈ aus dem Zonenprofil, `r.geplant`, bis zum Vortag) – sonst
  sah eine Woche ab etwa vier Wochen voraus wie nach einer Laufpause aus (offener Punkt 96).
- **Vergleich mit Enduco `vergleich-1.4` (V6.4.3; 1.1 V6.4.4; 1.2 V6.5 Wahl je Tag, siehe Ende; 1.3 V6.6: bearbeitete Woche aus Mein Plan; 1.4 V6.6:
  selbst gesendete Workouts «IN · …» und eingeplante Bibliothek sind nie Enduco; `V64.vergleich`, `V64.enducoAusUhr`, `V64.stand`, `V64.wahlAuswerten`):** Woche nach Modell wählbar «Letzte · Diese Woche · Nächste»,
  ältere über die Karte `#vg-card` (letzte 8 Wochen). Vergangene Wochen nachgerechnet, wie die Seite am Montag geplant hätte (`V64.stand`: Saison ab
  jener Woche, Stunden aus den 8 abgeschlossenen Wochen davor – von Hand gesetzte nur, wenn sie vor dem Montag gespeichert wurden –, CSS, Läufe und
  Aufbau-Grenze bis zum Sonntag davor, Tests der Woche auch wenn inzwischen erledigt; Modell, Intensität je Sportart und Zonenprofil von heute,
  gekennzeichnet). Enduco = Garmin-Kalender, dazu Workouts auf der Uhr (`wk`), wo am selben Tag für dieselbe Sportart nichts im Kalender stand (ohne
  Tests; ein verschobenes Workout – gleicher Titel ±2 Tage im Kalender, dort nicht gelaufen – zählt nur einmal; Dauer = Plandauer `wk.plan_s`, ohne sie
  «ohne Dauer», nie die gelaufene Zeit); Zwift ohne Uhr-Workout und ausgelassene Einheiten fehlen. Fenster: vergangene Wochen ganz, sonst Pläne bis zum letzten Enduco-Tag, Absolviertes bis gestern.
  Vergleich je Sportart (Stunden, Anzahl), Stufen (hart, Tempo/Schwelle), längste Einheiten, freie Tage, Unterschiede in Worten; «näher an» =
  kleinere Summe der Stunden-Abweichungen je Sportart (±15 min = «ähnlich»), nur bei Abdeckung ≥ 60 % (absolvierte Einheiten mit Enduco-Eintrag
  derselben Sportart am selben Tag), sonst kein Urteil; Sportarten mit Enduco-Einheiten ohne Dauer zählen dafür auf keiner Seite (sind sie mehr als
  die Hälfte des Absolvierten: kein Urteil). Titel-Regel: VO2max/anaerob/Sprint/Neuro = hart, Schwelle/Tempo/Sweet Spot/CSS/Über-Unter =
  Schwelle, Fatmax/Grundlage/locker = locker, sonst offen. Welcher Plan besser ist, sagt der Vergleich nicht (Kapitel «vergleich»).
  **Wahl je Tag `planwahl-1.0` (V6.5):** «Ich folge» Enduco · Vorschlag · frei je Tag (nicht an Renntagen, nur an Tagen mit Einheiten in einem der
  Pläne), gespeichert über «Direkt speichern» (`planwahl` → `plan_wahl`); für abgeschlossene Tage mit Enduco oder Vorschlag die Abweichung des
  Absolvierten vom gewählten Plan (Minuten je Sportart als Betrag), ohne Tage mit Enduco-Einheiten ohne Dauer; «frei» wird gezählt, nie mit einem
  leeren Plan verglichen. Die Wahl ändert nichts in Enduco oder Garmin.
- **Saison `saison-1.2` (V6.4.3/V6.4.4):** «jetzt» = Median der 8 abgeschlossenen Wochen vor der laufenden (die laufende zählt nicht mit; 1.2: jede
  Woche zählt, auch ohne Schwimmen/Rad/Laufen mit 0 h – nach einer Pause beginnt der Vorschlag tiefer; Wochen vor der ersten Aktivität nicht),
  «Spitze» aus den 52 Wochen davor. 1.2: auch der 3:1-Rhythmus ist fest am Hauptrennen verankert (rückwärts ab der Woche vor dem Taper jede 4. Woche
  Erholung; B-Rennen: Mini-Taper, Woche danach Erholung, Rhythmus-Erholung direkt davor oder 1–2 Wochen nach dieser entfällt) – unabhängig vom
  Rechentag. `AN.saison(...).wochen` ab der laufenden Woche, `alle`/`ab` mit der laufenden Phase ab ihrem Beginn (`phaseNr`/`phaseN` = Woche x von y;
  Grundlage ohne festen Beginn). Nur kommende Rennen können Hauptrennen sein.
- **Verteilung `tid-1.0`:** locker (Z1–Z2, Renntempo) · mittel (Z3) · hart (Z4–Z5); Muster nach Treff et al. 2019 (PI > 2,00 = polarisiert, ohne
  Mitte nicht berechenbar), Abgleich mit dem Modell (`V64.pruefen`; Erholung/Taper «nur locker» ok, Rennwoche nicht beurteilt). Vorschlag und
  Enduco-Plan (Workout-Schritte, profil-1.0) nach den Zielen der Abschnitte, Absolviertes nach Puls (letzte 4 Wochen, `FK.zoneSummary`).
- **Wissen `wissen-1.33` (`js/wissen.js`; 1.33 = V8.5 Modell «Automatisch» im Kapitel «modelle», verteilung-1.1 im Kapitel «reaktionen»; 1.32 = V8.4.1 nur Rad oder nur Laufen im Kapitel «planeinstellungen»; 1.31 = V8.4.1 Lauf-ABC im Kapitel «intervalle»; 1.30 = V8.4 Abwechslung im Kapitel «intervalle»; 1.29 = V8.4 Ampel readiness-3.0, Verpflegung kurz, Coach 1.1; 1.28 = V8.3 Kapitel «coach», ampel-plan-1.2 und basis-1.2; 1.27 = V8.2 Kapitel «reaktionen»; 1.26 = V8.1.1 Kapitel «verpflegung»; 1.25 = V8.1 TL ≈ mit den Bezugsgrössen, Abweichung, Anstieg,
  Nach dem Training, Puls zur Leistung; 1.24 = V8.1 harte Einheiten an Land nie an zwei Tagen hintereinander; 1.23 = V7.10 Tagesblatt und eigene Aktivität nach RPE im Kapitel «modelle»; 1.22 = V7.9 Fitness voraus im Kapitel «last», Zyklus und Bearbeiten im Kapitel «modelle»; 1.21 = V7.8 Trainingsstatus im Kapitel «last»; 1.20 = V7.7 Kapitel «draussen»; 1.19 = V7.6.2 Schwimmkurs, aufbau-1.2, Kurzcheck nach Puls; 1.18 = V7.6.1 Abstimmung ums Krafttraining, Tag automatisch, Tage für lange Einheiten, Form ohne Krafttraining; 1.17 = V7.6 Kapitel «kraft» (Rønnestad & Mujika 2014, Rønnestad et al. 2010, Doma et al. 2017, Lauersen et al. 2014, Foster et al. 2001); 1.16 = V7.5.2 Basis-Fitness Variante A; 1.15 = V7.5.1 Planeinstellungen als Blatt-Folge, Basis-Regel offen, Anfänger-Modus, Stile auf der Uhr; 1.14 = V7.5 Kapitel «planeinstellungen», 1.8 = V7.1 Kapitel «vergleichbar», 1.9 = V7.2 Schwimm-Einheit, Übungen und Verfügbarkeit, 1.13 = V7.4 Ampel passt das Training an (Kapitel «erholung», Düking 2021, Manresa-Rocamora 2021), 1.12 = V7.3.2 Übungen aus der Enduco-Liste, 1.11 = V7.3 Etappe 2 Schwimmen,
  Puls und RPE an Garmin im Kapitel «modelle», 1.10 = V7.3 Einheit als
  Schritte, Einfahren und Intervall-Intensität, RPE je Abschnitt im Kapitel «intervalle»; 1.1: Kapitel «Sportarten verteilen und Umfang aufbauen», 1.2: Intensität je Sportart und Aufbau-Check,
  1.3: Kapitel «Vorschlag und Enduco vergleichen», 1.4: Prüfung der Quellen – Formulierungen nicht stärker als die Studien, eigene Festlegungen
  gekennzeichnet, Versionen wie im Code, 1.5: Wahl je Tag und Bibliothek im Kapitel «vergleich», 1.6: Mein Plan, TL ≈ geplanter Einheiten,
  bearbeitete Woche im Vergleich, 1.7: Form zu Tagesbeginn und Rad-Last je System im Kapitel «last»):** alle Modelle und Regeln der Seite in eigenen Worten (nie Text aus Studien oder Webseiten übernehmen),
  jede Aussage mit Quelle `[[id]]` aus `WS.QUELLEN` (Autoren, Jahr, Titel, Zeitschrift, DOI; ohne DOI begründet), Kapitel-Verweise `[[#id]]`.
  Neue oder geänderte Regel: Kapitel und `WS.REGELN` nachführen; `tests/test_v64.cjs` prüft Verweise, DOI-Form, jede Quelle verwendet,
  Schweizer Schreibweise (kein ß) und keine Wattwerte in den Texten. Nie persönliche Zahlen in die Wissenstexte.
- Der Vorschlag steht neben dem Enduco-Plan, solange Enduco läuft; Enduco wird nie geändert. Nach Garmin geht nur, was Silas mit «An Garmin senden»
  auslöst (Abschnitt «An Garmin senden»), und seit V7.4 die lockere Fassung einer solchen Einheit am Morgen bei «vorsichtig» (Entscheid A7).

## Enduco nur als Vergleichsdatenbank (V7, planvergleich-1.0)
- Enduco-Workouts (`planned`, `workouts_neu`, `enduco_bib`, `wk`) bleiben vollständig gespeichert, erscheinen aber nicht in Heute, Kalender oder Plan.
  Sichtbar nur zusammengefasst unter Analyse → Planvergleich; Einzelheiten (Bibliothek, «Woche nach Modell» mit «Ich folge», Vorschlag und Enduco
  über die Wochen, Workouts auf der Uhr) im Labor.
- Planvergleich je Woche Mo–So (Datum wie in den Daten): Soll = Garmin-Kalender ohne eigene «IN · …» (`V66.eigenGarmin`), wo dort nichts stand die
  Plandauer der Uhr-Workouts (`V64.enducoAusUhr`); Ist = Netto (mv, sonst dur), Brutto (el), Pausen. Zonen nur Rad/Laufen: Soll aus den Zielen der
  Schritte im aktiven Zonenprofil (profil-1.0), Ist aus dem Puls-Histogramm `hh` in den Pulszonen des Profils am Tag (`V7.histZonen`, nicht
  hochgerechnet); 5 Zonen oder 3 Bereiche (LT1/LT2). Ohne Dauer, ohne Ziel, ohne Puls = «Nicht zuordenbar», nie verteilt.
- Urteil (Abweichung, Verlauf) nur für Wochen mit vollständigem Soll (`status` «ok»): Kalender vorhanden, kein Uhr-Workout, das im Kalender fehlte,
  und ab `config.planvergleich_ab` (falls gesetzt; sonst erste ganze Woche nach dem ersten Kalendereintrag). Sonst «teil» bzw. «nur-uhr», sichtbar.
  Regel ändern = Version in `V7.VERSIONS` erhöhen und `tests/test_v7.cjs` nachführen.

## Umplanen (V9.2, Auftrag «Woche wie Enduco» Etappe W1: umplanen-1.0, grenzen-1.0, woche-einstellen-1.0, fehlt-zeit-1.0; Silas' Antworten vom 22.11.2026)
- **Grundsatz:** Woche = Planer(Vorschlag, Grenzen je Tag, Festes). `V66.aendern { art: "umplanen" }` (intern `umplanen` in `js/v66.js`; «anpassen» ist ein Alias) rechnet die ganze
  Woche aus dem unverteilten Vorschlag (`ctx.roh`; ab dem Start einer Erholungswoche nach der Ampel deren Einheiten) neu, nie aus dem gespeicherten Stand. **Fest** bleiben:
  vergangene Tage, gesperrte Tage und Tage mit gesperrter Einheit (ganz), heute, sobald heute schon eine Aktivität gezählt ist (`ctx.heuteFest`, eigene Festlegung: was schon
  trainiert ist, verschiebt die Seite nicht), und an den übrigen Tagen die **Anker** (`V66.istAnker`: Quelle «eigen» oder «bibliothek», gesperrt, `anker: true` = von Hand
  verschoben; Dauer oder Felder von Hand geändert, ersetzt und vom Coach angenommen machen die Einheit zur eigenen). Was bleibt und für eine Einheit des Vorschlags steht
  (`V66.stehtFuer`: Vorschlags-Einheit mit Kennung «v-…», `statt` nach «ersetzen», Kraft, Tests, Kurs, Aktivierung, Aktivitäten draussen), verbraucht diese im Pool (gleicher Tag
  zuerst, sonst der nächste) – nichts steht doppelt. **Streichungen** `E.gestrichen` [{ vorlage, date }] (aus «entfernen» und «Woche leeren», höchstens 40) nehmen je Eintrag die
  nächste passende Einheit aus dem Pool; dieselbe Einheit wieder hinzufügen hebt die Streichung auf. Der Rest des Pools geht an `V66.verteilen` (der Kern bleibt; neu nur
  `opt.extra` für Einheiten, deren Tag fest ist, und `P.weg` mit Vorlage, Dauer, Sportart, TL ≈). Danach Regel 2 des Krafttrainings (`ctx.abstimmen` = `V76.abstimmen`).
- **Kennungen:** Eine Vorschlags-Einheit behält Kennung, Uhrzeit, Metrik und Bahnlänge ihrer Vorgängerin derselben Vorlage (gleicher Tag zuerst) – so bleiben Garmin-Auswahl und
  Bericht stabil. **Ohne Eigenes** (kein Anker, keine Sperre, keine Streichung, keine Erholungswoche, nichts fehlt) und mit festen Tagen genau wie im automatischen Vorschlag wird
  die Woche nicht gespeichert (`E.tage = {}`): Sie folgt wieder von selbst (`wocheVerteilt`). Darum gibt «Zeit zurück» exakt die Ausgangswoche (Pfadunabhängigkeit).
- **Harte Grenzen (grenzen-1.0, Silas 22.11.2026 «nicht überziehen»):** Die Zeit eines Tages (Standard `vf-wt-N` oder von Hand `vf-<Datum>`) ist für alles, was die Seite setzt, eine
  harte Obergrenze; an von Hand gesetzten Tagen auch die Sportarten. Geprüft und geschlossen: Planer (`V66.verteilen` setzt Einheiten nur in den Rest des Tages; über der Zeit steht
  nur Festes, gemeldet «<Tag>: n min mehr geplant als verfügbar (deine eigene Einheit)»), automatischer Krafttrainings-Tag (`V76.einplanen`: Kraft und das Feste des Tages müssen in
  die Zeit passen; nie an einem von Hand gesetzten Tag mit gewählten Sportarten, ausser dem Kurs; ein fester Tag aus den Planeinstellungen bleibt Silas' Wahl und wird über der Zeit
  gemeldet), Coach (`js/v83.js`: Tauschen und Nachholen ohne Toleranz, Kurzfassung und Verlängern in 5-min-Schritten abgerundet, «Rad statt Laufen» nur, wenn es in die Zeit passt),
  Ampel-Ersatz (`V74.locker`: gleiche Sportart und nie länger; das Nachholen der Ampel prüfte Zeit und Sportart schon hart – unverändert), «Ausgleichen» (= umplanen).
  **Entscheid `V83.TOLERANZ` (5 min):** gilt nur noch beim Bewerten bestehender Pläne (Anlass «zeit»: ein Tag gilt erst ab 5 min über seiner Zeit als knapp), damit der Coach nicht
  wegen Rundungen oder Silas' eigener Einheiten meldet; für Vorschläge gilt sie nirgends mehr.
- **Auslöser** (alle über `V66UI.planen`: Änderungen, dann einmal umplanen, speichern bzw. in den Entwurf, Garmin, Bericht): Verfügbarkeit eines Tages oder Wochentags, Sperren,
  Hinzufügen, Löschen, Dauer, Verschieben, Felder einer Einheit, Ersetzen, Aktivität draussen, vom Coach angenommene Änderung, ✨. Im Tagesblatt nach 450 ms Pause wie bisher; die
  Frage kommt beim Schliessen des Blatts (`V59.nachSchliessen`). Eigene Regeln behalten: «Woche leeren», «Neu berechnen», «Alles neu», «Woche anpassen?» der Ampel.
  **Stufen:** 1 = «Woche anpassen» (umplanen, läuft bei jeder Einstellung von selbst), 2 = «Neu berechnen» (vergisst Anker und Streichungen; jetzt derselbe Kern, darum geht eine
  Einheit, deren Tag schon vorbei war, nicht mehr verloren), 3 = «Alles neu» (dazu Sperren); Silas' Zeiten bleiben immer. «Jede Woche so» (Wochentag-Standard) plant auch alle
  späteren gespeicherten Wochen neu. Ein Planerlauf legt nie einen `vf-…`-Eintrag an und ändert nie einen.
  **✨ im Bearbeiten (V9.3.2, bearbeiten-1.1):** fragt «Anpassen oder neu berechnen?» – «Anpassen» = Stufe 1, «Neu» (orange) = Stufe 2 über `V66UI.planen` (aktionen
  `neuberechnen`, ohne zusätzliches Umplanen: Bericht und Folgewoche wie jede Änderung). **Welche Woche Bearbeiten zeigt (`V78.bearbeitenAb`):** die gewählte, frühestens die laufende;
  folgt in der laufenden nach heute kein Tag mehr (Sonntag), die nächste – den heutigen Tag ändert das Tagesblatt.
- **Frage (fehlt-zeit-1.0, Silas' Punkt 6):** Fehlt Last (`E.verteilung.fehlt`, ohne Ortsfestes wie den Kurs), fragt die Seite nach einer eigenen Änderung. Kandidaten: Tage ab heute,
  nicht fest, nicht «kein Training», mit Zeitgrenze. Je Tag das kleinste Mehr in 5-min-Schritten (binäre Suche mit dem echten Planer, `V66UI.probe`; höchstens das Fehlende, höchstens
  12 h am Tag); liegt das beste Mehr über `V92.GROSS` = 60 min (eigene Festlegung) oder reicht kein Tag allein, dazu «verteilt»: gleich viel auf zwei der Tage mit der meisten Zeit,
  zusammen höchstens das Fehlende. «Ja» = `vf-<Datum>` mit der neuen Zeit (Sportarten wie bisher; Zustand «von Hand»), «Nein» = `E.verteilung.frage` { fp, antwort } – gilt, bis
  sich der Fingerabdruck der Eingaben ändert (`V92.fingerabdruck`: Grenzen, Sperren, Anker, Streichungen). Keine Frage in Rennwochen (dort wird nichts verschoben, nur gemeldet), für
  vergangene Wochen, im Bearbeiten-Modus (erst mit ✓). Trainingstechnisch ist ein sehr voller Tag die Ausnahme («im Normalfall ist die Zeit da»); vor der Frage verdichtet die Seite seit V9.5 (siehe «Zeit und Intensität»).
- **Bericht:** `V92.diff` über Kennung, sonst Vorlage (gleicher Tag, dann nächster): verschoben (mit Grund aus dem Planer), gekürzt, länger, entfällt, neu; Wochenlast vorher → nachher
  (TL ≈, Stunden wie im Wochenkopf). ↶ stellt Woche und Verfügbarkeit von vorher her (nur bis die Seite neu geladen wird). «Ausgleichen» erscheint, wenn gestrichen ist und die
  geplante Last unter 92,5 % des Vorschlags liegt (Bereich wie zyklus-1.0); es vergisst die Streichungen und plant innerhalb der Grenzen neu.
- **Folgewoche (V9.2.1, umplanen-1.1, Silas 22.11.2026 «die Woche darauf auch, wenn es einen Einfluss hat»):** Der letzte Tag der Woche davor ist fester
  Nachbar des Montags (`V66.verteilen` opt.`vorher`, `V66.vortagBindet`): harte Einheit an Land, Krafttraining oder Aktivität draussen ab 2 h am Sonntag → am
  Montag keine harte Einheit an Land (Paar über die Wochengrenze wie zwei harte Tage in der Woche; geht kein anderer Tag, bleibt sie und die Woche meldet es).
  `V64UI.kontextFuer` gibt den Sonntag davor als `K.vorher` (zwischengespeichert je Durchgang, neu bei «meinplan»; `V64UI.projLeeren`). Nach jeder gespeicherten
  Änderung an einer Woche (`V66UI.planen`, ↶, ✓) plant `folgeWoche` die Woche danach: gespeichert → umplanen, sonst folgt sie von selbst; Garmin-Aufträge ihrer
  Tage im Fenster werden nachgeführt; Bericht «Nächste Woche: …». Nicht bei «jede Woche so» (dort planen alle späteren gespeicherten Wochen ohnehin neu).
  **Eigene Festlegung:** Was in einer Woche fehlt, holt die Folgewoche nicht nach (verpasste Last nachzujagen erhöht das Risiko; die Wochenlast folgt dem Aufbau,
  die Ermüdung fliesst über Ampel und «Automatisch» ein). Auch die Läufe im Aufbau-Fenster (aufbau-1.2) wirken so in die Folgewochen.
- Regel ändern = Version in `V66.VERSIONS` (umplanen, grenzen) bzw. `V92.VERSIONS` (woche-einstellen, fehlt-zeit), Wissen (Kapitel «modelle») und `tests/test_v92.cjs` nachführen.

## Zeit und Intensität als Stellschrauben (V9.5, Auftrag «Woche wie Enduco» Etappe W4: zeit-intensitaet-1.0; Silas' Entscheide vom 22.11.2026, Zahlen und Begründungen von Claude)
- **Grundsatz:** Die Zeit eines Tages wirkt in beide Richtungen, immer **innerhalb der Maximalzeit** des Tages (grenzen-1.0 bleibt hart). Nichts davon trägt etwas «von Hand» ein (kein
  `vf-…`-Eintrag); beides ist Teil derselben Funktion der Eingaben wie das Umplanen: gleiche Eingaben, gleiche Woche (Vorschlag ohne Eigenes: `V64UI.kontextFuer` → `V66.wocheVerteilt`
  + `V66.zielWoche`; gespeicherte Woche: `V66.aendern { art: "umplanen" }` mit `ctx.ziel` → `V66.verteilen` opt.`ziel` + `V66.zeitZiel`). Kontext `K.ziel` = { tl (TL ≈ wie der
  Wochenkopf, `V66.schaetzung`), tlMax, minuten (je Sportart im Vorschlag), aus, vorsichtig }. Version `V66.VERSIONS.ziel`, Festlegungen `V66.ZIEL`.
- **Wann nicht (`ziel.aus`):** vergangene Wochen, Rennwochen, Erholungswochen (auch die Erholungswoche der Ampel, `E.erholung`), Taper (Phase «Taper» oder «B-Rennen …») und nach
  «Neu berechnen» (siehe unten). Verdichten zusätzlich nicht, wenn die Ampel heute auf «vorsichtig» oder Krankheitszeichen steht (nur die laufende Woche; die nächsten Wochen werden
  ohnehin neu gerechnet, wenn sie kommen). Nie an gesperrten oder vergangenen Tagen, nie an Silas' eigenen, gesperrten, verschobenen oder geänderten Einheiten (Anker).
- **Zeit als Ziel (Silas' Punkt 4):** nach dem Verteilen (`V66.zeitZiel`). Ein Tag mit Zeitgrenze, der mehr Zeit hat, als seine Einheiten brauchen: dort wird die längste lockere
  Einheit in 5-min-Schritten länger – innerhalb ihres Bereichs (`V66.bereich`), höchstens bis zur Zeit des Tages und nur, solange die Wochenlast ≤ Obergrenze des Korridors bleibt.
  Die Tage mit der meisten freien Zeit zuerst. **Korridor** = Bereich des Zyklus (zyklus-1.0, `V78.bereich`): TL ≈ des verteilten Vorschlags ± 7,5 %; die Obergrenze ist
  `K.ziel.tlMax`. Der Zyklus misst den Bereich weiter am Vorschlag **ohne** Verlängerungen (`K.w0vorZiel`), sonst wanderte er mit. Einheiten ohne TL ≈ (Tests, Schwimmen ohne CSS)
  zählen wie im Zyklus nicht mit und werden nicht verlängert. Gestrichenes bleibt gestrichen: die Obergrenze sinkt um seine Last (kein heimlicher Ersatz).
  **Zusätzliche Einheit:** stösst die längste lockere Einheit an ihren Bereich (oder hat der Tag keine verlängerbare) und bleiben am Tag ≥ 45 min (`V66.ZIEL.zusatzAb`), kommt eine
  lockere Einheit der Sportart mit dem grössten Rückstand zur Wochenverteilung dazu (Anteil der Sportart an den Minuten des Vorschlags × geplante Minuten − ihre Minuten), höchstens so
  lang wie die Vorlage im Standard (Rad 60, Schwimmen 45, Laufen 45 min), nicht unter ihrem Minimum, nur so lang, wie die Obergrenze erlaubt. Nie dieselbe Sportart zweimal am Tag,
  nie an einem leeren Tag (ein Ruhetag des Plans bleibt Ruhetag), nie hart. Gespeichert mit `zusatz: true`; sie steht für keine Einheit des Vorschlags (`V66.stehtFuer`).
  **Entscheide (Claude, Begründung):** (1) Verlängert werden nur lockeres Rad und lockeres Schwimmen (`rad_locker`, `rad_lang`, `schwimm_locker`): mehr Umfang im lockeren Bereich ist für
  die Langdistanz der wirksamste und am wenigsten riskante Reiz (Seiler 2010); **Laufen nicht** – Laufen belastet Sehnen und Knochen am meisten, sein Umfang folgt der Aufbau-Grenze
  (aufbau-1.2, 10-%-Regel); eine zusätzliche lockere Laufeinheit nur bis zu den Laufminuten des Vorschlags (also nur, um Ausgefallenes aufzufüllen). Renntempo-Varianten nicht: ihre
  Blöcke wüchsen mit der Dauer (mehr Zeit würde zu mehr Intensität). (2) Die Obergrenze des Korridors (+ 7,5 %) hält die Woche in der Periodisierung (keine Lastsprünge);
  Erholungs-, Taper- und Rennwochen bleiben, was sie sind. (3) Leerer Tag bleibt leer: Ruhetage sind Teil der Erholung.
- **Verdichten (Silas' Punkt 3):** in `V66.verteilen` (opt.`ziel`), nach den drei Runden und der Regel «zwei harte Tage». Bleibt nach Verschieben und Kürzen Last übrig – eine
  Einheit fällt weg (`P.weg`) oder wurde so gekürzt, dass ihr TL ≈ unter 90 % liegt –, bringt die Seite dieselbe Last in weniger Zeit unter: kürzer und **eine Stufe höher**
  (Grundlage → Anteile Tempo). **Zahlen (Claude, nach `laktat.md`):** Tempo = Z3 (zwischen LT1 und LT2, nie darüber – Stufe «bis Schwelle» ohne z3o), in Blöcken von 10 min mit 5 min Z2
  dazwischen, nach dem Einfahren und 15 min (Laufen 10 min) Z2, am Schluss mindestens 10 min Z2 (`V66.dichtTeile`); höchstens ein Drittel der Einheit, Rad höchstens 4, Laufen 3 Blöcke
  (`V66.dichtMax`). Die kleinste Menge Tempo, mit der das TL ≈ wieder bei ± 10 % (`V66.ZIEL.toleranz`) des ursprünglichen liegt; bei einer weggefallenen Einheit der Tag und die
  längste Dauer, bei der das gelingt. Nur lockere und lange Rad- und Laufeinheiten des Vorschlags (`rad_locker`, `rad_lang`, `lauf_locker`, `lauf_lang`); nie Eigenes, Gesperrtes, Tests,
  Rennen, Schwimmkurs, Schlüsseleinheiten, Koppellauf, Schwimmen (sein TL ≈ hängt nicht von der Intensität ab, wenn es aus der Last pro Stunde kommt). Höchstens **zwei** je Woche
  (`V66.ZIEL.maxDicht`, mit denen an festen Tagen), zuerst die grösste Lücke. Gespeichert als Einheit der Seite mit `dicht: { z3 }` (Titel «Grundlage mit Tempo», «Lange Ausfahrt mit
  Tempo», «Lauf locker mit Tempo», «Langer Lauf mit Tempo»); kein Anker, die nächste Änderung rechnet sie neu. Reicht es nicht, bleibt die Last in `E.verteilung.fehlt` und die Frage
  (fehlt-zeit-1.0) kommt.
  **Entscheide (Claude, Begründung):** (1) Die verdichtete Einheit ist «mittel» (Z3 unter LT2), keine Schlüsseleinheit – im Drei-Bereiche-Modell ist «hart» über LT2; die Zahl harter
  Einheiten der Phase wird darum nicht überschritten (sie zählt nicht dazu). (2) Weil Tempo aber mehr ermüdet als Grundlage: nie am Tag einer harten Einheit an Land oder am Tag davor
  oder danach (auch über die Wochengrenze), nicht am Tag nach dem Krafttraining und nicht neben einer langen Aktivität draussen, nicht am Tag eines Tests – im üblichen Wochenmuster
  (Di und Do hart) also vor allem am Wochenende. (3) Tempo bringt etwa 1,5-mal so viel Last pro Minute wie Grundlage; mit höchstens einem Drittel Tempo und 10 % Spielraum spart das
  höchstens etwa ein Viertel der Zeit – mehr wäre keine Grundlage mit Anteilen Tempo mehr, sondern eine Tempoeinheit. (4) Schwimmen nicht verdichtet (siehe oben); Renntempo-Varianten und Schlüssel nicht
  (eine Stufe höher wäre dort über LT2).
- **Bericht:** `E.verteilung.ziel` = { laenger, zusatz, dicht } (auch in einer Woche, die danach wieder von selbst folgt; der Bericht nimmt das Ergebnis des Umplanens). Zeilen mit
  Grund zuerst (`V66.zielText`, `V92.zielBericht`): «Donnerstag: Rad + 25 min, die Zeit war da», «Mittwoch: zusätzlich Schwimmen locker 45 min, die Zeit war da (Schwimmen lag
  hinter der Wochenverteilung)», «Samstag Rad: 2 h 15 statt 2 h 45, dafür mit Anteilen Tempo – gleiche Last». Nur, was mit dieser Änderung neu ist; die blosse Änderung derselben
  Einheit fällt aus der Liste (keine Doppelzeile). Details nennen alles (`meldungen`).
- **Rückgängig und «Neu»:** ↶ stellt Woche und Verfügbarkeit von vorher her – damit auch ohne Verlängerung bzw. Verdichtung. «Neu berechnen» (Stufe 2, auch ✨ «Neu» und «Alles
  neu») speichert `E.zielAus` { fp } = Fingerabdruck der Eingaben (`V66.zielFp`: Grenzen je Tag, Sperren, Anker, Streichungen): solange er gilt (`V66.zielAusGilt`), plant die Woche
  ohne Zeit als Ziel und ohne Verdichten; die nächste eigene Änderung (andere Eingaben) bringt beides zurück. Folgewoche und Entwurf im Bearbeiten wie bisher.
- **Datenformat:** nur optionale Felder (eigenplan-1.3 bleibt): Einheit `dicht` { z3: 10–40 in 10er-Schritten }, `zusatz: true`; Woche `zielAus` { fp «zf-…», am }. Geprüft in
  `merge_daily.planwoche_pruefen`. Ändert Silas die Dauer einer verdichteten Einheit, bleibt das Tempo, solange es in die neue Dauer passt (sonst die gewöhnliche Fassung).
- Regel ändern = `V66.VERSIONS.ziel`, `V66.ZIEL`, Wissen (Kapitel «modelle»), `tests/test_v95.cjs` nachführen.
