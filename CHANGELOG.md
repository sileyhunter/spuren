# Änderungen

## V6.6.2 · 14.11.2026 · Prüfbericht: Form zu Tagesbeginn und Rad-Last je System
Aus dem Prüfbericht vom 13.11.2026 (Befunde 3 und 5–7), nach Silas' Okay vom 14.11.2026.
- **Befund 3, status-1.1:** «Heute» (Status-Kachel, «Optionen für heute» und die Werte unter der Ampel) zeigt die Form zu Tagesbeginn: Fitness und
  Ermüdung bis gestern (`FK.pmcMorgen`). Vorher zählte der laufende Tag bis zum Nacht-Update als Ruhetag, die Form lag morgens um etwa
  Ermüdung/7 − Fitness/42 zu hoch. Die Ampel rechnet schon so (readiness-2.1); die Grafik unter Analyse zeigt weiter den laufenden Tag, beschriftet.
- **Befunde 5–7, last-2.1 (`tools/last.py`):** eine LT2 gilt nur für das System, auf dem sie gemessen wurde (`system` «rolle» oder «draussen» je
  Referenz; ohne Angabe Rolle). Fahrten auf der Rolle rechnen gegen die LT2 der Rolle; Fahrten draussen gegen eine eigene LT2 für draussen, solange
  es keine gibt nach Puls wie Einheiten ohne Leistung (Schwellenpuls Rad). Keine Umrechnung zwischen Leistungsmessern. Neues Feld `tl2q` sagt je
  Radeinheit, wie gerechnet wurde. Die Seite rechnet damit erst, wenn `config.load_model` umgestellt ist (Entscheid bei Silas); bis dahin zeigt
  «Fortschritt → Wochenlast je Sportart» den Vergleich.
- Wissen wissen-1.7 (Kapitel «last»), Tests in `tests/test_formkurve.cjs`, `tests/test_v59.cjs`, `tests/test_v6.cjs` und `tests/test_tools.py`.

## V6.6.1 · 14.11.2026 · Karte: Fehler aus der Prüfung vom 13.11.2026 (Auftrag `docs/auftrag-karte-fehler.md`, Teil 0b)
Im Auftrag als «V6.5.1» bezeichnet; weil V6.6 schon live war, heisst die Fassung V6.6.1.
- **K1 design-1.1:** Planer, «Training → Route» und die Diagramme haben keine festen Farben mehr. Hintergründe, Schrift, Status
  (ok, Warnung, Fehler), Auswahl, Diagrammfläche, -linie und -titel kommen aus Variablen in `css/v6.css` (dunkel und hell je ein Block,
  helle Werte nur im Block für `[data-theme="light"]`). Daten- und Markerfarben (Belag, Wegart, Zugang, Steigung, Hangneigung, Wetter, Tempo,
  Vorschläge A/B/C, Intervall-Eignung, Marker auf der Karte) sind in beiden Designs gleich und stehen im gemeinsamen Block; die Karte liest sie
  über `RTUI.farbe()`. Start, Ziel, Varianten und A/B/C etwas dunkler, damit die weisse Schrift darauf mindestens 4,5 : 1 hat.
  Gemessen an den berechneten Farben (Demo und echte Daten, 390 und 1280 px, dunkel und hell): jeder Text mindestens 4,5 : 1 (vorher dunkel bis 1,02 : 1).
- **K2:** Zusatzdiagramm unter dem Höhenprofil (Temperatur, Regen, Wind, Tempo) mit Fläche, Titel, Achsen und Gitter aus den Variablen;
  Zwischenziele im Profil lesbar (vorher weiss auf weiss).
- **K3:** Tabelle der Vorschläge A/B/C ohne eigene Knopfspalte: die ganze Zeile wählt, Tippziel mindestens 44 px; passt ohne seitliches
  Scrollen (vorher 375 px Inhalt in 332 px, «Wählen» abgeschnitten).
- **K4:** ✕ im Planer nimmt alles von der Karte, was Planer und «Training → Route» gezeichnet haben (Route, Windpfeile, Varianten und andere
  Routen samt Nummern, Vorschläge A/B/C, Intervalle, Marker); gespeicherte Routen bleiben. Öffnen zeichnet den letzten Stand wieder, die
  Vorschläge nur, solange «Training → Route» offen ist (✕ in «Training → Route» nimmt sie ebenfalls weg). Späte Antworten zeichnen nichts mehr
  auf eine geschlossene Karte.
- **K5:** Suchfelder (`input[type=search]`) in der Grundregel für Felder und in der 44-px-Regel: Ortssuche im Planer und Startort-Suche 44 px
  (vorher 28 px ohne Innenabstand).
- **K6:** «Punkt setzen» schlägt die zuletzt benutzte Kategorie vor (je Gerät), sonst «Sonstiges». Speichern in eine ausgeblendete Kategorie
  meldet «Gespeichert. Jagdposten sind ausgeblendet» mit «Einblenden» (nichts wird von selbst eingeblendet). Im Punkt-Modus steht oben auf der
  Karte das Band «Tippe auf die Karte · Abbrechen».
- **K7:** Massstab unten links unter der Legende, Quellenangabe unten rechts unter «Filter & Punkte» – beide rücken mit der Höhe der
  Kartenknöpfe mit. Die Quellenangabe startet zugeklappt (nur «i»), aufgeklappt reicht sie nicht unter die Legende; der «i»-Knopf wird nicht
  mehr von der 44-px-Regel gestreckt (vorher doppeltes «i»). Planer ganz offen: Kartenknöpfe und Marker ausgeblendet. Beim Einpassen einer
  Route zählen Massstab und Quellenangabe zum Rand, und die Kartenpolsterung nimmt die Zielhöhe des Blatts (nicht die gerade animierte):
  Start und Ziel liegen ganz im freien Kartenbereich. Geprüft per Skript: keine Überschneidung in 2D und 3D, Heatmap und «Nach Sport», Planer
  in allen drei Höhen.
- **K8 (Sofortmassnahme):** Ein Tipp auf eine Spur öffnet das Blatt bei «N Aktivitäten an dieser Stelle»; die Liste zeigt zuerst 30 Treffer
  und darunter «Weitere 30 anzeigen», auf dem Handy ohne eigene Höhengrenze (kein Scrollen im Scrollen).
- Geprüft: alle Tests aus CLAUDE.md, neu in `tests/test_v6.cjs` (keine festen Farben im Planer-CSS und in `js/routen-ui.js`,
  `js/training-ui.js`, `js/route.js`; jede benutzte Variable in beiden Designs definiert; Schrift auf Markern und Statusflächen mindestens
  4,5 : 1). Im Browser Demo und echte Daten bei 390 × 844 und 1280 × 800, dunkel und hell: Konsole ohne Fehler, kein seitlicher Überlauf in
  allen Ansichten. Routing mit nachgebildeten Antworten im BRouter-Format und mit aufgezeichneten Antworten einer lokalen BRouter-Instanz
  (`tests/fixtures`, OSM-Testdaten Dreieich), Wetter mit nachgebildeten Open-Meteo-Antworten; brouter.de und Open-Meteo nicht live getestet.
  Messwerte vorher/nachher und die Liste der geprüften Stellen: `docs/abnahme-teil0b.md`.

## V6.6 · 13.11.2026 · Etappe 6.7: An Garmin senden (Entscheid E3)
- **garmin-senden-1.0:** Im Tagesblatt (Kalender) gibt es den Abschnitt «Garmin»: «An Garmin senden» (ab morgen bis eine Woche voraus, mit dem
  nächsten Nacht-Update) und «Am Vortag um 23 Uhr automatisch senden» je Tag; im Wochenmenü «Woche an Garmin senden». Die Seite legt nur einen
  Auftrag mit einer Momentaufnahme an (Eingabe `garmin_senden` → `garmin_auftraege`); Änderungen an einem Tag mit offenem Auftrag werden
  mitgenommen. Gesendet wird im Nacht-Update (`tools/garmin_senden.py`): Rad und Laufen als Garmin-Workout «IN · …» mit Zielen aus dem aktiven
  Zonenprofil (Watt bzw. Tempo; Z1 und Pausen ohne Ziel; Z5 nach oben 15 % über der Untergrenze, eigene Festlegung), Bibliotheks-Workouts nur
  eingeplant; aufs Gerät beim Synchronisieren (Fenix, Edge nur Rad). Nach jedem Hochladen liest das Update das Workout zurück und vergleicht es;
  weicht es ab, wird das eigene Workout gleich wieder gelöscht. Geänderte Einheiten: zuerst die neue Fassung, dann die alte austragen.
  Schwimmen, Tests, Kraft und Mobility werden nicht gesendet (Grund steht da). Für heute geht es nur im Chat.
- Je Einheit «in Garmin», «in Garmin, geändert» oder «wird gesendet»; je Tag der Stand des Auftrags (gesendet, verpasst, Fehler mit Grund, abgelehnt).
- **vergleich-1.4 / bib-1.1:** Selbst gesendete Einträge im Garmin-Kalender (Name «IN · », eingeplante Bibliothek) zählen nie als Enduco –
  weder im Vergleich noch als Termin in der Enduco-Bibliothek.
- **wissen-1.6:** Absatz «An Garmin senden» im Kapitel «modelle».
- Nie: Enduco-Workouts ändern oder löschen, Zonen nach Garmin schreiben, etwas austragen oder löschen ohne eigenen Vermerk. Das Morgen-Update sendet nichts.
- Geprüft: `tests/test_v66.cjs` (+ Workout Rad und Laufen, Wiederholungen, Reihenfolge, Ziele, Fassung, Gründe, Auftrag, Stand, eigene Einträge),
  `tests/test_tools.py` (+ jedes Workout der Seite besteht die Prüfung des Werkzeugs, 13 Ablehnungsgründe, Einspielen ohne Doppel, automatisch erst ab
  23 Uhr am Vortag, Senden/Einplanen/Austragen, verschoben, Fehler lässt die alte Fassung stehen, verpasst, Rücklese, bib-1.1), Browser Demo.
  Das Format an Silas' Geräten ist erst mit dem ersten echten Senden geprüft (Rücklese).

## V6.6 · 13.11.2026 · Etappe 6: Kalender und Woche bearbeiten (Auftrag `docs/auftrag-etappen-6-8.md`, 6.1–6.6)
- **Wochenansicht im Kalender (kalender-2.0):** Umschalter «Woche · Monat» (Standard Woche, je Gerät gemerkt). Die Woche zeigt oben Wochenart,
  Stunden (Mein Plan / absolviert) und TL ≈, darunter die Tage untereinander mit den Einheiten als Karten, daneben Enduco aus dem Garmin-Kalender
  und Absolviertes; Pfeile blättern wochenweise. Im Monat öffnet ein Tippen auf «KW» die Wochenansicht dieser Woche. Das Tagesblatt nennt KW,
  Phase und Wochenart.
- **Mein Plan (eigenplan-1.0):** Der Wochenvorschlag lässt sich je Tag bearbeiten: Training hinzufügen (Sportart → Vorlage mit Mini-Profil →
  Dauer mit Regler und TL ≈ / Distanz ≈ → Speichern), Dauer ändern, verschieben, entfernen, Tag sperren. Vergangene und gesperrte Tage bleiben
  unverändert. Wochenaktionen «Änderungen verwerfen» und «Woche leeren» (mit Rückfrage). Ein Tag, der wieder dem Vorschlag entspricht, gilt
  nicht mehr als bearbeitet. Gespeichert wird verschlüsselt mit «Direkt speichern» (Eingabe `planwoche` → `plan_woche`; `merge_daily.planwoche_pruefen`:
  Montag und ID, Tage in der Woche, eindeutige Einheiten, bekannte Quelle, Dauer 5–600 min, vergangene und gesperrte Tage unverändert; gleiche
  Woche ersetzt mit Audit). Enduco-Einheiten bleiben, wie sie sind; nichts geht nach Garmin oder Enduco.
- **Vorlagen (vorlagen-1.0):** die Bausteine der Trainingsmodelle (eigene Texte) für Schwimmen, Rad, Rad drinnen, Laufen, Laufen drinnen,
  dazu Kraft/Athletik und Mobility (ohne Ziele) und Workouts aus der Enduco-Bibliothek (Dauer fest). Schlüsseleinheiten ab ihrer kurzen
  Fassung; länger gewünscht = danach locker (Z2).
- **TL ≈ und Distanz ≈ (tl-plan-1.0, eigene Festlegung):** geplante Einheiten aus dem aktiven Zonenprofil wie last-2.0 (Rad Leistung ÷ LT2,
  Laufen Tempo an der LT2 ÷ Ziel-Tempo, je im Quadrat; Schwimmen Tempo ÷ CSS hoch drei; × Stunden × 100). Ohne Bezugswert keine Zahl, sonst
  «mind.»; Tests, Kraft, Mobility und Bibliothek ohne TL.
- **Aufbau (aufbau-1.1):** Ein Lauf über deiner Aufbau-Grenze oder nach einer Laufpause wird beim Hinzufügen, Ändern und im Tagesblatt gemeldet,
  nicht verhindert.
- **Plan (wochenblatt-1.0):** jede KW in «Phasen» ist antippbar und zeigt schon geschlossen die Wochenart (Belastung 1–3, Erholung, Taper,
  Rennwoche) → Wochenblatt mit Stunden, TL ≈ geplant und absolviert, Schwimmen/Rad/Laufen, Schlüsseleinheiten und Tests, «Im Kalender öffnen».
- **vergleich-1.3:** «Woche nach Modell» und der Vergleich mit Enduco nehmen die bearbeitete Woche (gekennzeichnet «bearbeitet»); Stunden und
  Intensitätsverteilung werden aus deinen Einheiten neu gerechnet. Bibliotheks-Workouts zählen mit ihrer Stufe aus den Schritten bzw. laut Titel,
  sonst «offen» (nie geraten).
- **Heute «Je Sportart»:** Schwimmen, Rad und Laufen immer, mit «geplant (Garmin)».
- **wissen-1.6:** Mein Plan (Kapitel «modelle»), TL ≈ geplanter Einheiten (Kapitel «last»), bearbeitete Woche im Vergleich (Kapitel «vergleich»).
- Noch offen aus Etappe 6: «Rest der Woche neu planen» (wochenplan-1.3); «An Garmin senden» (6.7) folgt im nächsten Eintrag.
- Geprüft: `tests/test_v66.cjs` (neu: Vorlagen, Einheiten, Änderungsregeln, Verwerfen/Leeren, TL/km, Wochenart, bearbeitete Woche im Vergleich,
  Aufbau-Hinweis), `tests/test_tools.py` (+ Mein Plan: Prüfung, Sperren, vergangene Tage, Audit; Eingang bis `plan_woche`), `tests/test_v64.cjs`
  (vergleich-1.3, Versionen im Wissen inkl. V66), alle bisherigen Tests, Browser Demo und echte Daten (390 px, ohne Änderungen an echten Daten), Leck-Prüfung.

## V6.6 · 13.11.2026 · Teil 0: Fehler in Bestehendem (Auftrag `docs/auftrag-etappen-6-8.md`)
- **Tag antippen (kalender-2.0, Teil 1):** Im Kalender öffnet ein Tag jetzt ein Blatt mit Geplantem, Absolviertem, Tests und Rennen (vorher
  erschien die Liste unter dem ganzen Monat, auf dem iPhone ausserhalb des Bildschirms). Auch die Tage unter Heute «Diese Woche» sind antippbar,
  künftige ebenso. Aus der Einheit führt «Zurück» wieder ins Tagesblatt.
- **trainingsroute-1.1:** «Training → Route» schlägt fürs Rennrad nie eine Route mit Gravel vor: Kandidaten mit mehr als 20 m Gravel (auch
  «möglicherweise») werden verworfen; bleibt keiner, gibt es keinen Vorschlag, mit Grund. Vorher wurden sie nur abgewertet.
- **Routenplaner:** «Letzten Schritt rückgängig» und «Alle Punkte löschen» (eigene Symbole) stehen im eingeklappten Blatt; gelöschte Punkte
  holt ↶ zurück. «Pausen» heisst «Stopps unterwegs» und ist erklärt (verschieben Ankunft und Wetter, zählen nicht zur Trainingsdauer).
- **GPX zu Garmin:** neben «GPX teilen» neu «GPX in Dateien» und die Schritte über die Dateien-App zu Garmin Connect (im Teilen-Menü fehlt
  Garmin Connect oft).
- **Zonen-Vorschlag:** Gibt es für LT1 oder LT2 nur eine gültige Methode, steht sie als Text da (statt einer gesperrten Auswahl), darunter die
  nicht verwendeten Methoden mit Grund.
- **Dauer:** überall «1:15 h», «36 min», «5:30 min» – nie mehr «m» für Minuten (beim Schwimmen las sich «56m» wie Meter).
- Geprüft: `tests/test_training.cjs` (+ Rennrad ohne Gravel), `tests/test_v6.cjs` (Dauer), alle bisherigen Tests, Browser Demo und echte
  Daten (390 px), Leck-Prüfung.

## V6.5 · 13.11.2026 · Etappe 5, Teil 2: «Ich folge» – deine Wahl je Tag
- **planwahl-1.0:** In «Woche nach Modell» hält «Ich folge» je Tag fest, welchem Plan du folgst: Enduco, Vorschlag oder frei. Die Wahl geht
  verschlüsselt mit «Direkt speichern» (Eingabe `planwahl` → `plan_wahl`, gleicher Tag ersetzt mit Audit; `merge_daily.planwahl_pruefen`: Datum,
  ID «pw-Datum», bekannte Wahl). Sie ändert nichts in Enduco oder Garmin. Keine Knöpfe an Renntagen und an Tagen, an denen weder Vorschlag noch Enduco etwas planen.
- **vergleich-1.2:** Der Vergleich zeigt deine Wahl der Woche und für abgeschlossene Tage, wie weit das Absolvierte neben dem gewählten Plan lag
  (Minuten je Sportart als Betrag, Schwimmen, Rad, Laufen). «Frei» = keinem Plan gefolgt: gezählt, aber nicht mit einem leeren Plan verglichen.
  Tage mit Enduco-Einheiten ohne bekannte Dauer zählen nicht und werden genannt. Die Wochenliste «Vorschlag und Enduco über die Wochen» nennt die Wahl je Woche. Welcher Plan besser ist, sagt das weiterhin nicht.
- **wissen-1.5:** Kapitel «Vorschlag und Enduco vergleichen» um «Deine Wahl je Tag» ergänzt.
- Geprüft: `tests/test_v64.cjs` (+ Wahl je Tag: Abweichung je Sportart, nur abgeschlossene Tage, Dauer offen, frei ohne Vergleich), `tests/test_tools.py`
  (+ Wahl je Tag: falsches Datum, falsche ID und unbekannte Wahl abgelehnt, gleicher Tag ersetzt mit Audit), alle bisherigen Tests, Leck-Prüfung.

## V6.5 · 13.11.2026 · Etappe 5, Teil 1: Enduco-Bibliothek und privates Archiv
- **Enduco-Bibliothek (bib-1.0, `tools/bibliothek.py`):** Jedes Enduco-Workout, das über Garmin kommt, bleibt erhalten – mit Volltext, Schritten
  (beim Schwimmen mit Übung, Hilfsmittel und Pace je Abschnitt), Kalenderterminen und Versionen. Nichts wird gelöscht; ändert Enduco ein Workout
  (neues Änderungsdatum in Garmin, sonst anderer Inhalt), entsteht eine neue Version, die alte bleibt. Eine nochmals abgeschriebene gleiche Fassung
  (Rundung, fehlende Texte) zählt nicht als Änderung. Startbestand: die 332 Enduco-Workouts in Garmin seit April 2024 (Volltext, Dauer, Sportart);
  Termine zählen ab jetzt, weil Garmin vergangene Kalendereinträge nicht aufhebt; die Schritte der älteren Workouts holt das Nacht-Update nach
  (10 je Nacht). Nacht- und Morgen-Update übernehmen neu den ganzen Beschreibungstext und das Änderungsdatum.
- **Privates Archiv (archiv-1.0, `tools/archiv.mjs`, Repository `spuren-archiv`):** Rohdaten (Garmin-Exporte, FIT, Momentaufnahmen aus Garmin,
  Laktat-Tabellen) verschlüsselt, mit zufälligen Dateinamen und verschlüsseltem Verzeichnis, in Teilen unter 40 MiB; gleicher Inhalt nur einmal,
  nichts wird geändert oder gelöscht; Prüfung vor jedem Push. Erster Inhalt: die Garmin-Workout-Liste vom 13.11.2026.
- **Ansicht «Bibliothek» (Plan → Bibliothek, bibliothek-1.0):** alle Enduco-Workouts mit Suche (Titel, Text, Übung), Sportart und Stufe; antippen
  öffnet das gewohnte Einheit-Blatt mit Ablauf, Zielen, Text, Fassungen, Terminen und ob das Workout auf der Uhr lief (mit «Analysieren»).
  **Enduco über die Monate (monate-1.0):** geplante Stunden je Sportart und Anteil der Stufen – was Enduco geplant hat, nicht was du gemacht hast.
  **Schwimmübungen aus Enduco (uebungen-1.0):** Übungen und Serien aus den Schritt-Texten mit Anzahl Workouts, Metern, Hilfsmitteln und
  letztem Einsatz; antippen sucht die Workouts dazu.
- Geprüft: `tests/test_v65.cjs` (neu: Liste, Termin oder Export, Text voll oder erster Satz, «gelaufen», Filter, Übungen mit Wiederholungen
  und Hilfsmitteln, Monate), `tests/test_tools.py` (+ 13 Prüfungen Bibliothek: Liste nur Enduco, Kalender ergänzt statt verdoppelt, Abschrift ohne neue Version,
  neue Version bei Änderung, nichts gelöscht, Fehlversuche, Nacht-Update), `tests/test_archiv.cjs` (neu: Passwort, Teile, Prüfsumme, kein
  Klartext, Prüfung findet fehlende und veränderte Teile), alle bisherigen Tests, Leck-Prüfung.

## V6.4.4 · 13.11.2026 · Prüfung V6.4: Befunde behoben (`docs/AUDIT_V64.md`)
Vier unabhängige Prüfungen (Rechenlogik, Wissen und Quellen, Datenschutz, Oberfläche); alle Befunde sind nachgeprüft und behoben oder als
offen geführt (Oberfläche im zweiten Teil unten).
- **saison-1.2:** Der 3:1-Rhythmus ist fest am Hauptrennen verankert (rückwärts ab der Woche vor dem Taper jede 4. Woche Erholung; B-Rennen mit
  Mini-Taper und Erholungswoche danach, eine Rhythmus-Erholung direkt davor oder kurz danach entfällt). Bis 1.1 begann er bei «heute»: Die
  Erholungswoche rückte jede Woche weiter, «diese Woche» war nie eine, und der Rad-Stufentest kam nie an. «Woche x von y» zählt ab dem Beginn
  der Phase. Wochen ohne Schwimmen, Rad und Laufen zählen für «jetzt» mit 0 Stunden (nach einer Pause beginnt der Vorschlag tiefer).
- **readiness-2.1 / ampel-pruefung-1.1:** Die Last zählt nur bis gestern – die Ampel ist der Stand am Morgen, ein Training am selben Tag ändert
  sie nicht mehr (auch nicht in der Prüfung an deinen Daten). Prüfung wiederholt: ein Block wechselte die Gruppe, die Entscheide von 2.0 gelten.
- **Notizen:** Eine aus FIT nachgerechnete Laktat-Vorschau mit derselben ID wird beim nächsten Update nicht mehr durch die Notiz-Fassung ersetzt.
- **Testplan (Regeln wie beschrieben):** Kurzcheck auch am gewählten Tag nicht 4 Tage neben einem Stufentest; eingetragene Lauf-Stufentests
  sperren ihre Woche für den Rad-Vorschlag; CSS-Vorschläge 6–8 Wochen nach dem letzten (sonst mit Begründung). Sportart eines Tests ohne Feld
  `sport` aus der Notiz (`V62.testSport`, gemeinsamer Rad- und Lauf-Test = beide), auch im Testkalender, auf «Heute» und in der Woche nach Modell;
  ein Rad-Stufentest hakt keinen Lauf-Stufentest mehr ab.
- **wochenplan-1.2 / aufbau-1.1:** nach einer Laufpause (kein Lauf in 30 Tagen) höchstens 30 min locker, harte Läufe gemeldet; gekürzte Läufe mit
  der Schätzung nachgeprüft; mehr Stunden als geplant (Mindestdauern) wird gemeldet; Erholungswoche mit lockerem Schwimmen; Taper-Text wie
  gerechnet (ein Drittel bis die Hälfte weniger Wiederholungen). Vergangene Wochen mit dem Stand vom Montag (`V64.stand`).
- **vergleich-1.1:** Ein verschobenes Enduco-Workout zählt nur einmal; Uhr-Workouts ohne Plandauer bleiben «ohne Dauer» (nie die gelaufene Zeit
  als Plan), ihre Sportart zählt für «näher an» nicht. **intensitaet-1.1:** Version für die Titel-Regel aus V6.4.3 nachgeführt.
- Kleineres: Statusband −30 = «Produktiv» wie im Regeltext; Fokus nur aus Schritten mit Dauer (harte ohne Dauer als «Dauer offen»); harte
  Schwimmstrecken ohne Pace nicht mehr geschätzt; Wechsel «kombiniert» bei Rennen am 29.2. und ohne Hauptrennen nicht mehr von der Geräteuhr
  abhängig; Laufen Z1 «langsamer als»; Trainingsmodell nur mit Datum JJJJ-MM-TT; zwei Garmin-Verläufe vor einem Update werden beide eingespielt;
  Check-in-Texte «4 Fragen».
- **Wissen (wissen-1.4):** alle 84 Quellen geprüft; Titel Rosenblat 2019 korrigiert, sechsstufige Skala nach Tønnessen 2024, Formulierungen
  nicht stärker als die Studien (u. a. Muñoz 2014, Frandsen 2025, Maunder 2021, Millet 2000), eigene Festlegungen gekennzeichnet, Ampel-Text mit
  Nacht-HRV und Lastverhältnis; Regelliste um Verpflegung, Koppelläufe und Ringe ergänzt; Test: Versionen in den Texten wie im Code.
- **Datenschutz:** echte Werte aus Doku und Tests entfernt (Unterzonen-Beispiele, Testtermine mit Reisebezug, eine Aktivitäts-ID, ein FTP-Wert);
  neue Leck-Prüfung `tools/leck_pruefen.py` vor jedem Push; `.gitignore` erweitert; entschlüsselte Datei nur für den eigenen Benutzer lesbar; Seite mit `noindex`.
- Geprüft: alle Tests (+ 30 neue Prüfungen zu den Befunden), Leck-Prüfung, Demo und eigene Daten im Browser (390 px) ohne Programmfehler.

**Zweiter Teil: Oberfläche (Prüfung D, 26 Befunde, davon 2 schon im ersten Teil erledigt)**
- **Ampel (readiness-2.1, Regel unverändert):** Die Begründung nennt die HRV nicht mehr zugleich «unter» und «im Bereich» der Referenz (positive
  Gründe nur, wenn der Wert wirklich im Bereich liegt). Dabei gefunden: Lagen mehrere der 7 Tage mehr als 3 Standardabweichungen von der Referenz
  weg, fielen alle als «Ausreisser» weg – jetzt zählt wie beschrieben nur ein einzelner Ausreisser nicht, eine echte Veränderung über mehrere
  Tage bleibt im Schnitt.
- **Ring «Belastung» (ringe-1.0, Regel unverändert):** Ein Tag, dessen Einheiten noch nicht eingespielt sind (vor dem Nacht-Update), zeigt «noch
  offen» statt «0 % · Ruhetag» (`FK.aktivitaetenBis`); «Fitness (Vortag)» beschriftet.
- **Gleiche Grösse, gleiche Zahl:** Phasen, Wochenstunden-Vorschlag und Woche nach Modell zählen Stunden nur für Schwimmen, Rad und Laufen und
  die Enduco-Dauer aus den Workout-Schritten; der Wochenstunden-Vorschlag teilt wie die Woche nach Modell nach aufteilung-1.0 (dein Verhältnis
  daneben). Was die Woche nach Modell durch die Rundung je Einheit nicht verteilt, wird gemeldet (wochenplan-1.2, Rest nie still). Explorer:
  «Dauer (von–bis)» und «Bewegungszeit» getrennt, Ø Leistung «aus den 2-s-Werten».
- **Vergleich mit Enduco (vergleich-1.1):** Ist der Enduco-Plan nur teilweise bekannt, stehen Summen und Stufen als «mind.»; in der laufenden
  Woche nennt jeder Unterschied sein Fenster («bis Sa …»).
- **Bedienung:** Leiste oben zeigt den gewählten Unterbereich auch bei «Körper» und «Schwimmen»; Sprungziele liegen nicht mehr unter der Leiste;
  lange Dateinamen in Laktat brechen um (Ansicht nicht mehr breiter als der Bildschirm); Erklärtexte mit einer Warnung bleiben sichtbar (nicht
  hinter «i»); Kalendertage mit Enter und Leertaste; Blätter modal (Hintergrund nicht bedienbar, Fokus zurück zum Knopf), Seitentitel als h1.
- **Farben (design-1.0):** Zonenbalken auch hell in den Zonenfarben; Text überall mindestens 4,5 : 1 (u. a. vergangene Tage in der Woche nach
  Modell ohne Abdunkeln, Statuswort, Zonen-Chips, Links im Wissen, helle Darstellung); Test im Kalender als Ring (nicht wie ein Z5-Punkt);
  Phasenfarben im Wochenstunden-Vorschlag auch hell wie im Plan; Grafik dort in Kartenbreite, Rennnamen ohne Überlappung; LT1/LT2 und
  Zonengrenzen in Laktat ohne Überlappung.
- Kleineres: «Lernbausteine im Verlauf» ausgeblendet (die Bewertung kam aus dem ausgeblendeten Technik-Coach, Daten bleiben); Demo-Text ohne «seit –».
- Geprüft: alle Tests (+ 5 neue zu D1, D5, D6, D12), Leck-Prüfung, Kontrast und Breite in Demo und mit eigenen Daten (390 px, dunkel und hell).

## V6.4.3 · 13.11.2026 · Vorschlag und Enduco im Vergleich
- **Vergleich mit Enduco (vergleich-1.0):** «Woche nach Modell» zeigt neu auch die letzte Woche (ältere über die neue Karte «Vorschlag und Enduco
  über die Wochen»), bei jeder Enduco-Einheit die Stufe (hart, Schwelle, locker, offen) und einen Abschnitt «Vergleich mit Enduco»: Stunden und
  Einheiten je Sportart, harte und Tempo-/Schwellen-Einheiten, längste Einheiten, freie Tage, Unterschiede in Worten und welchem Plan dein Training
  näher war. Vergangene Wochen werden so nachgerechnet, wie die Seite am Montag geplant hätte (gekennzeichnet).
- Enduco-Einheiten aus dem Garmin-Kalender und, wo dort nichts stand, aus den Workouts auf der Uhr; Wochen mit weniger als 60 % Abdeckung bekommen
  kein Urteil. Titel-Regel für Einheiten ohne Ziele erweitert (Neuro = hart; Fatmax, Grundlage = locker).
- **saison-1.1:** «jetzt» im Wochenstunden-Vorschlag nur noch aus den 8 abgeschlossenen Wochen vor der laufenden – der Vorschlag ändert sich
  nicht mehr im Lauf der Woche.
- **Wissen (wissen-1.3):** Kapitel «Vorschlag und Enduco vergleichen» (Hecksteden et al. 2015: Aussagen für eine einzelne Person brauchen
  wiederholte Messungen und Trainingsphasen). Demo mit erfundenem Enduco-Verlauf.
- Geprüft: `tests/test_v64.cjs` (+ Uhr-Workouts, Fenster, Summen, Stufen, Abdeckung, Urteil, Titel-Regel), `tests/test_analyse.cjs`
  (+ laufende Woche zählt nicht), alle bisherigen Tests; Plan in Demo und mit eigenen Daten im Browser (390 px) ohne Programmfehler.

## V6.4.2 · 13.11.2026 · Aufbau-Check und Intensität je Sportart
- Testwerte bereinigt (nur erfundene Werte), die Commits dieser Version auf `main` zu einem zusammengefasst.
- **Aufbau-Check (aufbau-1.0)**, neue Karte unter Plan: Grenze für den nächsten Lauf (10 % über dem längsten Lauf der letzten 30 Tage, nach
  Frandsen et al. 2025), bis wann der Referenzlauf zählt und was danach gilt, geplante Enduco-Läufe der nächsten 14 Tage gegen die Grenze
  (Distanz aus den Pace-Zielen geschätzt), Sprünge der letzten 12 Wochen mit Klasse, Verlauf von Lauf-km, Schwimm-Metern und Rad-Stunden.
- **Intensität je Sportart (intensitaet-1.0)** im Trainingsmodell: Schwimmen, Rad und Laufen je «nur locker», «bis Schwelle» oder «alles».
  Der Wochenvorschlag nimmt bei einer Schlüsseleinheit über der Wahl die nächst leichtere derselben Sportart und verschiebt nichts; «Woche nach
  Modell» zeigt, wo der Enduco-Plan darüber liegt (aus den Zielen der Schritte, sonst laut Titel). Gespeichert verschlüsselt im Eintrag «modell».
- **Woche nach Modell (wochenplan-1.1):** langer und lockerer Lauf bleiben unter der Aufbau-Grenze (Distanz aus dem Zonenprofil geschätzt);
  übrige Läufe darüber werden gemeldet.
- **Wissen (wissen-1.2):** Kapitel «Sportarten verteilen und Umfang aufbauen» um Intensität je Sportart und den Aufbau-Check ergänzt
  (Millet et al. 2009, Etxebarria et al. 2019); zwei neue Regeln in der Regelliste.
- Geprüft: `tests/test_v64.cjs` (+ Intensität, Enduco-Stufe, Aufbau-Klassen, Grenze und Fenster, Begrenzung im Vorschlag, Distanz geplanter
  Läufe), `tests/test_tools.py` (+ Intensität übernehmen und ablehnen), alle bisherigen Tests.

## V6.4.1 · 13.11.2026 · Wissen: Sportarten verteilen und Umfang aufbauen
- **Neues Kapitel (wissen-1.1)** unter Plan → Wissen: wie die Stunden auf Schwimmen, Rad und Laufen verteilt werden (aufteilung-1.0 neben den
  Trainingsstunden von Freizeit-Ironman-Athleten und den Anteilen im Rennen), was sich zwischen den Sportarten überträgt, wo Überlastungen
  entstehen, Belastung gegen Belastbarkeit, wie man den Laufumfang aufbaut (10-%-Regel pro Woche, Sprünge über zwei Wochen, einzelner Lauf
  gegen den längsten der letzten 30 Tage), Krafttraining, die Scores (Belastungsverhältnis mit Kritik, Laufbelastbarkeit, Einzellauf) und
  Schwimmen und Rad. 15 neue Quellen (DOI bzw. Garmin-Handbuch als Herstellerangabe). Die Regel «Stunden je Sportart» verweist neu hierher.
- Geprüft: `tests/test_v64.cjs` (+ Kapitel, Verweise, Quellenliste, Regel-Verweis), alle bisherigen Tests.

## V6.4.0 · 13.11.2026 · Etappe 4: Trainingsmodell, Woche nach Modell und Wissen
- **Trainingsmodell (modell-1.0):** Unter Plan wählbar: polarisiert, pyramidal, Schwelle mit Laktat (norwegisch), rennspezifisch und
  **kombiniert** (Standard: Winter polarisiert, ab 1. Februar rennspezifisch; Datum änderbar). Gespeichert verschlüsselt mit «Direkt
  speichern» (`modell` → `modell_add` → `plan_modell`, `merge_daily.py` prüft Modell und Datum, ersetzt mit Audit).
- **Woche nach Modell (wochenplan-1.0):** diese und nächste Woche als Vorschlag neben dem Enduco-Plan: feste Wochenstruktur, Stunden aus dem
  Wochenstunden-Vorschlag (saison-1.0), Aufteilung 20/50/30 (aufteilung-1.0, eigene Festlegung), Schlüsseleinheiten je Modell, Erholungs-,
  Taper- und Rennwochen, Tests aus dem Testkalender (ersetzen die Einheit; vor einem Stufentest locker), Ziele in Watt, Pace und Puls aus dem
  aktiven Zonenprofil, Schwimmen nach CSS. Jede Einheit als Blatt mit Ablauf, Zielen, Zweck und Studien.
- **Intensitätsverteilung (tid-1.0):** Vorschlag, Enduco-Plan (aus den Workout-Schritten) und Absolviertes (letzte 4 Wochen, Puls) als
  locker/mittel/hart mit Muster und Polarisierungsindex (Treff et al. 2019), abgeglichen mit dem gewählten Modell.
- **Wissen (wissen-1.0):** neue Ansicht unter Plan mit 18 Kapiteln – Zonen, Laktat, Messen, Schwellen-Methoden, Intensitätsverteilung, die
  Modelle, norwegische Methode, Periodisierung, Taper, Langdistanz, Intervalle, Trainingslast, Erholung und Ampel, CSS, Verpflegung, Regeln mit
  Versionen – in eigenen Worten, mit 66 Quellen (DOI-Links), Suche und Verweisen aus Plan und Blättern (`data-wissen`).
- Stundenregel saison-1.0 nach `js/analyse.js` verschoben (`AN.saisonStunden`, `AN.saisonVorgaben`), gleiche Werte wie zuvor; Blätter drücken
  im Scrollen nichts mehr zusammen (Balkenprofil im Einheiten-Blatt blieb bei langem Inhalt 0 px hoch).
- Geprüft: `tests/test_v64.cjs` (17 Tests: Modelle, Wechsel, Wochenstruktur und Stunden, Verteilung je Modell, Erholung, Taper, Tests, Rennwoche,
  PI, Enduco-Balken, Ziele, Bausteine, Speichern, Wissen: Verweise, Quellen, Schreibweise, Regeln), `tests/test_analyse.cjs` (+ Stundenregel),
  `tests/test_tools.py` (+ Trainingsmodell übernehmen, ersetzen, ablehnen, Eingang), alle bisherigen Tests; Plan, Blatt und Wissen im Browser
  (Demo und eigene Daten, 390 px) ohne Programmfehler.

## V6.3.0 · 13.11.2026 · Etappe 3: Check-in mit vier Fragen und sieben Stufen, Ampel an deinen Daten geprüft
- **Check-in (befinden-2.0):** Schlaf, Energie, Beine und Kopf, je sieben Stufen von «sehr gut» über «durchschnittlich» bis «sehr schlecht»
  (Türkis → Pink). Ältere Einträge mit fünf Stufen bleiben, wie sie sind; gerechnet wird mit dem Anteil auf der jeweiligen Skala.
- **Ampel (readiness-2.0):** Befinden mit allen vier Fragen (belastet ab der zweitschlechtesten Stufe); 5–6 h Schlaf nur noch Hinweis, unter
  5 h weiter ein starkes Zeichen. Garmins Readiness bleibt draussen.
- **Prüfung an deinen Daten (ampel-pruefung-1.0):** «Passt die Ampel zu dir?» in der Tagesbereitschaft zeigt den Puls bei gleicher Leistung
  (gleichmässige 10-min-Blöcke gegen die eigenen 60 Tage davor) je Ampel-Stand jenes Morgens und je Garmin-Readiness. Auf dieser Grundlage
  wurden die beiden Änderungen oben entschieden.
- Geprüft: `tests/test_formkurve.cjs` (+3: Befinden 7 Stufen, Schlaf nur Hinweis, Prüfung), `tests/test_v59.cjs` (Check-in 2.0, alte Einträge),
  alle bisherigen Tests, Check-in und Tagesbereitschaft im Browser (Demo, 390 px).

## V6.2.3 · 13.11.2026 · Garmin-Verlauf aus dem Datenexport (garmin-export-1.0)
- **Leser:** `tools/garmin_export.py` liest den Garmin-Datenexport (Schlaf, Readiness; Format am echten Export geprüft) und schreibt eine
  Verlauf-Datei: Schlafdauer ohne Wachzeit, Schlafwert, Stress im Schlaf, Readiness nach dem Aufwachen. Nächte ohne Uhr oder unbestätigt
  bleiben leer; gibt es am selben Tag mehrere verschiedene Aufwach-Werte, bleibt die Readiness leer (nicht geraten). Gesundheitsstatus
  (HRV, Ruhepuls) erst nach dem Abgleich mit der Garmin-Verbindung.
- **Einlesen ohne Passwort im Chat:** Einstellungen → «Garmin-Verlauf einlesen» prüft die Datei auf dem Gerät (Zeitraum, Werte je Feld) und
  schickt sie mit «Direkt speichern» verschlüsselt ins Update. Das Update füllt nur fehlende Tageswerte; was über die Garmin-Verbindung kommt,
  bleibt massgebend, das Nachholen läuft weiter. Gleiche Datei wird nie doppelt eingespielt.
- Geprüft: `tests/test_tools.py` (+ Schlaf, Readiness eindeutig/mehrdeutig, Prüfung, Einspielen ohne Überschreiben, Eingang), `tests/test_v61.cjs`
  (+ Prüfung auf der Seite), `tests/test_v59.cjs` (+ Senden einmal je Datei), alle bisherigen Tests, Einstellungen im Browser (Demo, 390 px).

## V6.2.2 · 13.11.2026 · Etappe 2, Teil 2: Zonen-Vorschlag aus LT1/LT2 (zonenvorschlag-1.0)
- **Vorschlag:** Unter Analyse → Laktat schlägt die Seite je Sportart Zonen aus dem neuesten Stufentest vor (`js/v62.js`): Grenze Z2/Z3 = LT1,
  Z3/Z4 = LT2 (Mitte der gültigen Methoden oder eine gewählte Methode; Puls an der Schwelle aus der FIT-Datei). Z1/Z2 und Z4/Z5 sind nicht
  gemessen: 0,81 × LT1 und 1,07 × LT2 (Leistung, Tempo) bzw. 0,88 × und 1,06 × (Puls), gleiche Verhältnisse wie in der Intensitätsskala nach
  Tønnessen et al. 2024 (Sports Medicine 54); die Grenzen an LT1 und LT2 entsprechen den physiologischen Zonen von Swiss Olympic (2005).
  Daneben stehen die aktiven Grenzen mit Unterschied. Ohne LT2 oder ohne Puls an der Schwelle wird nichts geraten.
- **Bestätigen:** nur bei bestätigtem Test (B1). Das Blatt zeigt alle fünf Zonen; «Zonen bestätigen» legt ein neues Profil an (nur diese
  Sportart ersetzt, der Rest unverändert, Freigabe mit Datum), «Direkt speichern» bringt es ins Update (`zonen` → `zonen_add`). Zurücknehmen
  geht, solange es nicht gesendet ist. Danach trägst du die Grenzen in Garmin und enduco ein; die Seite schreibt nichts dorthin.
- **Update:** `merge_daily.py` prüft jedes Profil (`zonen_pruefen`: Freigabe, lückenlose und geordnete Grenzen, Test bestätigt) und ersetzt das
  bisherige aktive Profil (bleibt gespeichert, «ersetzt»). Abgelehnte Profile stehen mit Grund in `zonen_abgelehnt`; die Seite zeigt ihn.
- Geprüft: `tests/test_v62.cjs` (+5: Faktoren, Rad mit Mitte der Methoden, gewählte Methode, Pace, kein Raten ohne LT2/Puls, Profil je Sportart),
  `tests/test_tools.py` (+ Profil von der Seite übernommen, gleiche Fassung erweitert, fünf Ablehnungsgründe, Eingang → `zonen_add`), alle
  bisherigen Tests, Demo im Browser (390 px und breit: Vorschau, bestätigter Test, Methode wählen, Blatt, Zurücknehmen, Ablehnung) ohne Programmfehler.

## V6.2.1 · 13.11.2026 · Garmin-Verlauf schneller nachholen
- Das Nacht-Update holt Readiness und Stress jetzt mit 20 Tagen je Nacht nach und nimmt dafür die kleinen Abfragen
  (`get_stress_summary`, Readiness); Body Battery gibt es nur ab jetzt. So füllt sich der Verlauf ohne Garmin-Export.
- Geprüft: `tests/test_tools.py` (+ Nachholen mit der kleinen Abfrage, 20 Tage je Nacht), alle bisherigen Tests.

## V6.2.0 · 13.11.2026 · Etappe 2, Teil 1: Tests planen sich selbst ein (testplan-1.0)
- **Testplan:** CSS-Test, Rad- und Lauf-Stufentest und Laktat-Kurzcheck werden nach den am 13.11. bestätigten Abständen vorgeschlagen
  (`js/v62.js`): CSS alle 6–8 Wochen am gleichen Wochentag, Rad-Stufentest alle 8 Wochen am Samstag einer Erholungswoche (zuerst ein
  ausbelasteter, wenn der letzte es nicht war), Lauf-Stufentest alle 8–12 Wochen in einer anderen Erholungswoche, Kurzcheck alle 2 Wochen in
  einer Grundlagenfahrt aus dem Garmin-Kalender. Kein Stufentest 14 Tage vor einem Rennen, in der Woche danach und im Taper.
- **Anzeige:** Vorschläge im Testkalender (mit Regel), im Kalender («Vorschlag») und auf Heute als Hinweis «Test heute/morgen».
  Eingetragene Termine gehen vor; verletzt einer die Regeln (zu kurzer Abstand, Abwesenheit, Rennen), steht der Grund mit einem Vorschlag da.
- **Abwesenheiten:** im Testkalender eintragen (von–bis, Grund); dort plant der Testplan nichts. Gespeichert verschlüsselt mit «Direkt speichern».

Geprüft: `tests/test_v62.cjs` (neu: Erholungswochen, Rennabstand, Taper, Lauf ≠ Rad-Woche, CSS-Regelverstoss mit Vorschlag, Kurzcheck
in der Grundlagenfahrt), alle bisherigen Tests, Screenshots 390 px (Testkalender, Abwesenheit eintragen, Kalender), Demo ohne Programmfehler.

## V6.1.0 · 13.11.2026 · Etappe 1 «Daten»: Readiness, Body Battery, Stress, Garmin-Notizen (wellness-1.0, notizen-1.0, datenlage-1.0)
Erste Etappe aus «Plan in Etappen: Ironman Notebook statt enduco» (Entscheide vom 13.11.).

- **Tageswerte aus Garmin (wellness-1.0, `tools/wellness.py`):** je Tag `readiness` und `readinessLevel` (Morning Training Readiness),
  `bodyBattery` (beim Aufwachen), `bbSleep` (Aufladung im Schlaf), für abgeschlossene Tage `stress` (Tagesmittel), `stressHighMin`, `bbHigh`,
  `bbLow`, dazu `sleepStress` aus dem Schlaf. Morgen- und Nacht-Update holen sie; rückwirkend 10 Tage je Nacht bis 2020 (`config.wellness_backfill`,
  Readiness liefert Garmin bei Silas erst ab Spätsommer 2024). Garmins eigene Werte: gezeigt, **nicht** in die Ampel eingerechnet.
- **Notizen der Aktivitäten (notizen-1.0, `tools/notizen.py`):** die Garmin-Notiz (`description`) wörtlich je Garmin-ID in `garmin_notizen`
  (übersteht den Monatsexport); rückwirkend 20 Aktivitäten je Nacht. Daraus nur Vorschauen:
  Laktat («Min m: x mmol/l | Block (von–bis): Ø W, Ø HF | …») → `laktat_vorschau` «ln-…», Werte laut Notiz, nicht aus FIT nachgerechnet,
  nichts doppelt zu `lactate`, anderen Vorschauen oder Explorer-Punkten, Bestätigung wie bisher (B1);
  Verpflegung («Min m: … (x g KH)», Zeilen ohne Zeit, «Total: … g KH») → `fueling_vorschau` «fn-…» mit Gegenprobe gegen das Total,
  «vor Start» zählt nie; zählt erst, wenn du den Eintrag auf der Seite prüfst und speicherst. Geänderte Notiz in Garmin: Vorschau folgt
  (alte Fassung im Audit), übernommene Werte bleiben.
- **Seite:** Bereitschaft (Blatt) mit Zeile «Garmin» (Readiness, Body Battery beim Aufwachen, Stress gestern); «Heute» mit Datenqualität
  inkl. Garmin-Werte (bleibt sichtbar, sobald etwas fehlt) und «Datenlage je Wert» (seit wann, Tage mit Wert in 30/365 Tagen); Kennzahlen
  rechts nur mit Werten von heute bzw. gestern (vorher wurde der letzte vorhandene Tag gezeigt). Train your Gut: «Aus deinen Garmin-Notizen –
  Vorschau» mit «Prüfen und übernehmen» (Editor vorausgefüllt). Laktat-Kurzchecks und «Messung bestätigen» kennzeichnen Werte laut Notiz.
  Explorer zeigt die Notiz aus Garmin. Aktivitäten sind auch über ihre Garmin-ID auffindbar (Verweise «g…» bleiben nach dem Monatsexport gültig).
- **Schwimmübungen:** die Zeichnungen sind weg (Wunsch vom 13.11.); Ziel, Ablauf und typische Fehler bleiben, bis die neue Übungsseite steht.
- `merge_daily.py`: Tage ohne einen einzigen Wert werden nicht angelegt; B1 übernimmt bei Lauf-Messungen aus der Notiz auch die Pace.

Geprüft: `tests/test_tools.py` (+ Notiz lesen, Vorschauen, Doppel, B1, Notiz geändert/gelöscht, Tageswerte, Zeiger), `tests/test_v61.cjs`
(neu), alle bisherigen Tests, Screenshots 390 px mit der Demo (Bereitschaft, Heute, Train your Gut, Laktat, Schwimmen, Explorer), Demo ohne Programmfehler.

## V6.0.3 · 13.11.2026 · Trainingszonen als Liste (Vorlage Bild 7)
- Unter jeder Skala von «Trainingszonen: alle vier Skalen» (Laktat) stehen die Zonen als Liste: Farbbalken links in der Zonenfarbe, Name
  (Erholung, Grundlage, Tempo, Schwelle, Intensiv) und Grenzen rechts, darunter die Unterzonen aus dem Text der Zone (FatMax, Sweet Spot,
  VO2max) mit Punkt und Bereich. Pace als «langsamer als …» / «schneller als …». Nur in der Ansicht «Aktuell».
- Geprüft: `tests/test_v6.cjs` (Zonenliste mit Unterzonen, auch Pace), Screenshot 390 px.

## V6.0.2 · 13.11.2026 · Leiste Heute · Kalender · Plan · Analyse · Karte, neue Ansicht «Plan», Kalender neu
Dritter Schritt der Layout-Vorlage vom 13.11. (Bilder Kalender, Plan und Rennen, Analyse).

- **Leiste unten:** Heute · Kalender · Plan · Analyse · Karte (eigene Symbole). Körper und Schwimmen sind jetzt Unterbereiche von Analyse;
  die Leiste oben lässt sich wischen und zeigt den gewählten Bereich.
- **Plan:** Rennen als Kacheln (Fahne, A/B, Wochen und Tage bis zum Start, Streckenlängen nach Format – keine Zielzeit erfunden), die
  Saisonphasen als senkrechter Zeitstrahl bis zum Hauptrennen (aktive Phase hervorgehoben mit «Woche x von y», Antippen zeigt die Wochen mit
  Erholungswochen, Rennen, absolvierten und geplanten Stunden), Wochenübersicht der letzten 7 und nächsten 4 Wochen (Stunden je Sportart,
  absolviert gefüllt, geplant als Rand, Phase als Farbstreifen), dazu der bisherige Wochenstunden-Vorschlag (saison-1.0, jetzt in den Farben
  des Plans) und der Testkalender (beide bisher im Kalender).
- **Kalender:** Wochenband «KW · Phase · Stunden · Trainingslast», heutiger Tag orange, je Tag Sport-Symbole (ausgefüllt = erledigt, Rand =
  geplant, grau = geplant ohne Aktivität), Punkte der Fokus-Intensitäten geplanter Einheiten, Test und Rennen. Ein Tag zeigt die Tagesliste:
  Aktivitäten mit Kennzahlen und «% im Ziel» (plan-1.0), geplante Einheiten als Karten mit Mini-Profil (antippen öffnet die Einheit).
- «Geplant gegenüber absolviert» listet nur noch Tage bis heute; Schwimm-Workouts ohne Kalenderdauer zeigen die Dauer aus den Schritten
  statt «0:00 h».

Geprüft: `tests/test_v6.cjs` (+ Kalenderwoche, Rennen mit Priorität, Streckenlängen, Phasen), alle bisherigen Tests, Screenshots 390 px
dunkel und hell (Plan, Kalender mit Tagesliste, Einheit aus dem Kalender, Analyse-Leiste), Demo ohne Programmfehler.

## V6.0.1 · 13.11.2026 · Heute neu: Kacheln, Begrüssung, Heutiges Training, Einheit, Wochenleiste (profil-1.0, status-1.0, workout-1.1)
Zweiter Schritt der Layout-Vorlage vom 13.11. (Bilder Heute, Woche, Einheit).

- **Drei Kacheln oben:** Ampel (Bereitschaft heute, Antippen → Blatt mit Gründen, Erholung/Schlaf/Belastung und «Einzelheiten»),
  Status (Trainingsstatus aus der Form, Antippen → «Optionen für heute») und Check-in (offen, erledigt oder später).
- **Begrüssung** mit einem Satz zur Lage (geplante Einheiten und Vorschlag der Bereitschaft) und den Knöpfen «Heute nicht» und «Check-in».
  Der **Check-in ist ein Blatt**: drei Fragen mit Symbol, grossem Wert («Eher frisch») und Farbskala mit fünf Punkten (Türkis = bestens …
  Pink = schlecht), gespeichert wird mit «Speichern» (weiter befinden-1.1, drei Fragen 1–5 nach E5). Der Link `#checkin` öffnet das Blatt.
- **Heutiges Training** als Karten: Sport-Symbol, Name, Quelle, Dauer, Distanz, Zeit ab Zone 3, bis drei Zonen-Chips und das Balkenprofil
  (Breite = Dauer, Höhe = Lage in der Zone, Farbe = Zone; `profil-1.0`). «Neu von Enduco, noch ohne Datum» klein darunter.
- **Einheit als Blatt:** Kennzahlen, Zonenskala mit Fokus-Intensitäten (Anteil der aktiven Schritte ohne Ein-/Ausfahren und Erholung),
  grosses Balkenprofil mit Zeitachse, Schritte mit Dauer oder Strecke, Zielbereich, Kadenz, Name (Schwimmen) und Zonen-Chip, Wiederholungen
  als Block «3 × Sweet Spot», Beschreibung, Hinweise und «Passende Route finden». Die Seite ändert nichts in Enduco oder Garmin.
- **Optionen für heute:** Fitness, Ermüdung, Form und Trainingsstatus mit Mini-Skala; Aktionen Check-in, Passende Route, Verpflegung,
  Laktat, CSS-Test, Kalender. **Trainingsstatus `status-1.0`:** Form > +25 Formverlust, +5…+25 Erholt, −10…+5 Erhaltung, −30…−10 Produktiv,
  < −30 Hohe Belastung (Bänder nach Coggan, eigene Wörter; «Übertraining» wird nie aus Zahlen behauptet).
- **Wochenleiste Mo–So:** heutiger Tag orange, Sport-Symbole ausgefüllt = erledigt, Rand = geplant, grau = geplant ohne Aktivität dieser
  Sportart; Fortschritt Trainings und Dauer = erledigt / (erledigt + noch geplant + verpasst). Die Tabelle je Sportart liegt darunter.
- **Workout lesen `workout-1.1`:** feste Pausen («Break: 30s») zählen als Zeit statt als offener Schritt; Schwimmstrecken werden aus der Pace
  in der Beschreibung geschätzt (lockere Strecken ohne Pace mit der langsamsten Pace des Workouts, als «≈» gekennzeichnet); die Dauer aus den
  Schritten gilt nur, wenn jeder Schritt eine Zeit oder Schätzung hat (sonst die Dauer laut Kalender).
- Demo: heute immer ein Rad- und ein Schwimm-Workout, Beispielzonen mit FatMax, Sweet Spot und VO2max (alles erfunden).

Geprüft: `tests/test_v6.cjs` (Zonen inkl. Unterzonen und Pace, Schwimm-Beschreibungen, workout-1.1, Profil und Fokus, Blöcke und
Zieltexte, Statusbänder, Wochenleiste), alle bisherigen Tests, Screenshots 390 × 844 dunkel und hell sowie 1280 px (erfundene Daten).

## V6.0.0 · 13.11.2026 · Design: dunkel als Standard (design-1.0, enduco als Vorbild)
Vorlage «Layout-Referenz: enduco als Vorbild» (13.11.): Aufbau, Bedienlogik und Farbsprache der Intensitäten übernehmen, eigene Farbtöne,
Symbole und Texte.

- **Dunkles Design als Standard** (Seite schwarz, Karten #1f1f22, Blätter #141416, Leiste #18181b, Text #fcfcfc/#a4a4a7/#78787c), «Hell» bleibt
  unter Einstellungen → Bedienung → Darstellung wählbar (je Gerät). Neue Datei `css/v6.css`; die Logos erscheinen im Dunkeln hell auf schwarz.
- **Eine Zone, eine Farbe** (eigene Töne, Z2 nahe #4E66FF): Z1 #5a49e2 · Z2 #4f69f8 · FatMax #7ab4fa · Z3 #27bdd8 · Sweet Spot #69e4e6 ·
  Z4 #6ce0a4 · Z5 #fdc22b · Anaerob #f9a71a · Neuro #d6573f · Sprint #dc3f8d. «Mache ich das Richtige?» zeigt locker/mittel/hart in Zonenfarben.
- **Sportarten** Schwimmen türkis, Rad grün, Laufen violett (Wandern sand, Ski eisblau, Andere grau); die Spuren auf der Karte behalten ihre auf
  swisstopo abgestimmten Farben. **Fitness grün, Ermüdung türkis, Form blau.**
- **Bausteine:** Knöpfe als Pillen (Hauptaktion weiss, Nebenaktion grau), Segmente und Chips dunkel, Kennzahlen mit grosser Zahl und grauer
  Beschriftung darunter, Abschnittstitel klein in Grossbuchstaben, Blätter von unten mit Griff (Einstellungen, Bestätigen, Test starten).

## V5.9.6 · 12.11.2026 · Laktat-Einzelmessungen über die Zeit (laktat-drift-1.0)
Wunsch vom 12.11.: Einzelmessungen filtern, beim Antippen mehr Infos, und sehen, ob Laktat bei gleicher Leistung mit der Zeit steigt.

- **«Einzelmessungen» zeigt die Werte über die Zeit in der Einheit** (Fahrzeit bis zum Blockende) statt über die Leistung, wo Messungen
  derselben Einheit aufeinander lagen. Eine Linie verbindet nur Messungen derselben Einheit bei gleicher Leistung (±5 %); gestrichelt =
  Vorschau. Ohne Fahrzeit aus der FIT-Datei gilt die Uhrzeit des Blockendes minus Start (gekennzeichnet «ab Start»), sonst bleibt die Zeit offen.
- **Antippen zeigt mehr:** Zeitpunkt in der Einheit, Pause für die Messung (bis zum Weiterfahren, davon Timer gestoppt), Vorbelastung und
  unter «In dieser Einheit» alle Messungen der Einheit mit der Veränderung je Paar (Laktat, Puls, Leistung, Minuten dazwischen) und dem Urteil
  «steigt», «gleich», «sinkt» oder «nicht vergleichbar».
- **Regel laktat-drift-1.0:** gleiche Leistung = höchstens 5 % Unterschied; ein Unterschied zählt erst, wenn er grösser ist als
  2·√(σ₁² + σ₂²) mit σ = max(0,15 mmol/l; 7,5 %) je Wert (Messfehler wie schwellen-1.0), sonst «gleich».
- `tools/laktat_vorschau.py` rechnet je Check-Block `t_s` (Fahrzeit), `el_s` (ab Start), `pause_s` und `pause_timer_s`; die Bestätigung
  (B1, `merge_daily.py`) nimmt sie mit Fenster, Uhrzeit, Vorbelastung und Puls der letzten 30 s in `lactate` mit. Die beiden Checks vom
  11.11. sind damit ergänzt (nur neue Felder, Werte unverändert).

Geprüft: `test_formkurve.cjs` (Zeitpunkt aus Fahrzeit bzw. Uhrzeit, über Mitternacht, offen ohne Zeit; «gleich», «steigt», «nicht
vergleichbar»), `test_tools.py` (Fahrzeit, Pause und gestoppter Timer aus einer erfundenen Sekundenreihe; B1 nimmt die Felder mit),
E2E 390 × 844 (Filter, Diagramm über die Zeit, Antippen, Wechsel zwischen Messungen derselben Einheit, ohne Programmfehler).

## V5.9.4 · 9.11.2026 · Paket 4 «Schwimmen – nur der CSS-Test zählt» (css-2.0)
Auftrag V5.9, Entscheid E6 (nur der CSS-Test zählt; Termine wie im Auftrag).

- **Testkalender mit CSS-Tests** (400 m und 200 m) an fünf Terminen bis zum Hauptrennen (Status «geplant»; die Termine stehen nur verschlüsselt
  in den Daten). Ein eingetragener CSS-Test bis
  4 Tage daneben hakt den Termin ab; ein Test ausserhalb des Plans erscheint im Kalender als «✓ CSS-Test».
- **Eintragen mit zwei Zeiten:** Datum, 400 m und 200 m – fertig. Becken, Reihenfolge, Pause, Wassertemperatur, Zeitnahme, Einschwimmen und
  Notiz liegen unter «Mehr Angaben» (sonst 25-m-Becken, 400 → 200, 10 min Pause, von Hand gestoppt). Der Test geht über «Direkt speichern»
  in die Daten («gesendet · kommt mit dem nächsten Update»). Oben in der Karte: der nächste geplante Test; ab zwei Tests der Verlauf je Becken.
- **CSS ist der einzige Schwimmwert:** «Meine Entwicklung» zeigt unter «Alle Sportarten» wieder die vier Belegkennzahlen Rad, Laufen, Laktat
  und CSS (die Ermüdungs-Kacheln mit der Sportart Rad bzw. Laufen); die Jahresstatistik zeigt beim Schwimmen den letzten CSS-Test des Jahres
  statt der Rohpace. Rohpace, Videovergleich und Fehlerboard sind ausgeblendet, die Daten bleiben. Technik wertet Claude im Chat aus.
- Nebenbei: Die Ermüdungs-Kacheln in «Meine Entwicklung» nennen jetzt ihre richtige Quelle (FIT-Sekundenwerte, ermuedung-1.0) statt
  «eingetragene CSS-Tests».

Geprüft: `test_v59.cjs` (Termin erledigt bis 4 Tage daneben, nie durch einen Laktat-Eintrag; nächster offener Termin), `test_tools.py`
(Testkalender über «tests», CSS-Test vom Handy über eingang/ bis `css_tests`), `check_referenz.py` «GESAMT: bestanden». E2E (erfundene
Zeiten 6:40/3:10 → CSS 1:45 /100 m) auf 390 × 844: Plan, Speichern, Verlauf, Kachel in «Meine Entwicklung», Testkalender, Jahresstatistik.

## V5.9.1 · 9.11.2026 · Paket 1 «Trainingslast richtig rechnen» (last-2.0)
Auftrag V5.9, Entscheide E1 (Rad-Last mit der LT2, nie FTP; bis zum neuen Stufentest gilt die LT2-Vorschau vom 29.4.) und E2 (alle Sportarten zählen).

- **Neues Feld `tl2` je Aktivität** neben `tss` (`tools/last.py`, Regel last-2.0): Rad (Rolle und draussen) mit Leistung =
  Timer-Dauer × (NP / LT2)² × 100; die LT2 kommt aus `config.last_ref` (Datum, Test, Methode, Quelle, Status), je Datum gilt der letzte
  Test davor, vor dem ersten Test der erste (gekennzeichnet). Alle anderen Sportarten und Rad ohne Leistung wie bisher. `tss` bleibt
  unverändert. Hinterlegt: LT2 (Dickhuth) aus dem Rad-Stufentest 29.4.2026, «vorläufig» (Test nicht ausbelastet, nicht bestätigt); der Wert
  steht nur verschlüsselt in den Daten.
- **Nacht-Update rechnet `tl2` gleich mit** (`merge_daily.py`), auch für alle älteren Aktivitäten, wenn sich die Referenz ändert.
- **Fortschritt: «Wochenlast je Sportart»** – Trainingslast pro Woche in den Farben der Sportarten (12/26/52 Wochen, Antippen zeigt die
  Woche), damit sichtbar ist, woher die Belastung kommt (Wandern zählt weiter mit, E2). Darunter der **Vergleich Garmin-FTP → LT2** für die
  letzten 12 Wochen je Woche und Sportart, mit Fitness, Ermüdung und Form heute vorher/nachher.
- **Noch nicht umgeschaltet:** Die Seite rechnet weiter mit der Garmin-Last, bis Silas den Vergleich bestätigt; dann
  `config.load_model = "last-2.0"`. Danach rechnen Fitness, Ermüdung, Form, stärkster Fitness-Anstieg, Belastungs-Ring, «Belastung 7 Tage»
  und die Last je Einheit im Kalender mit `tl2`; Fahrten vor dem ersten Test sind im Kalender gekennzeichnet.
- «Daten vom …» bleibt beim letzten Garmin-Abruf, wenn nur `config`, Laktat oder Eingaben eingespielt werden (bisher sprang der Stand mit).

Geprüft: `test_tools.py` (erfundene Fahrt: NP 210 W, Timer 2:30:00, LT2 250 W → tl2 176; vor dem ersten Test gekennzeichnet; Lauf/Wandern/Rad ohne
NP unverändert; je Datum der letzte Test davor; Vergleich je Woche und Sportart; neue Fahrt im Nacht-Update bekommt tl2; Stand bleibt bei
config allein), `test_v59.cjs` (Referenz je Datum, Vergleich), `check_referenz.py` «GESAMT: bestanden» und `tss` aller 1776 Aktivitäten
gleich wie vorher. Mit den echten Daten (nur lokal, verschlüsselt): die Fahrt vom 8.11. ergibt den Abnahmewert aus dem Auftrag (± 1); die
Vergleichstabelle der letzten 12 Wochen ging an Silas. E2E (erfundene Daten) in beiden Modi auf 390 × 844 und 1280 × 900, ohne Programmfehler.

## V5.9.2 · 9.11.2026 · Paket 2 «Morgen-Update» (morgen-1.0)
Auftrag V5.9, Entscheid E3 (täglich 08:30, nur lesend auf Garmin).

- **Morgen-Update um 08:30** (neue geplante Aufgabe, nach dem Morgen-Briefing um 07:40): holt nur lesend über die Garmin-Verbindung die
  Werte der letzten Nacht (HRV, Ruhepuls, Schlaf), die geplanten Einheiten von heute bis +14 Tage mit Schritten und neue Enduco-Workouts,
  spielt die Eingaben vom Handy ein und committet «Morgen-Update JJJJ-MM-TT». Keine Aktivitäten, FIT-Dateien oder Reihen (das bleibt beim
  Nacht-Update); nach Garmin wird nichts geschrieben, Enduco-Workouts werden nie geändert. Ein fehlgeschlagener Lauf committet nichts
  (`data.enc.json` bleibt unverändert); scheitert der Push, einmal neu holen und neu einspielen. Ablauf in `CLAUDE.md`, Abschnitt «Morgen-Update».
- **«Heute geplant»** (oben auf «Heute», seit V5.9.5): Name, Dauer, Ziele aus den Schritten (Watt, Pace oder Puls), Quelle «Enduco über
  Garmin» und «Passende Route finden»; ohne Workout «Für heute noch kein Workout in Garmin (Stand 08:31)» – nie geraten.
- **Stand mit Lauf**: `merge_daily.py` merkt sich, ob zuletzt das Morgen- oder das Nacht-Update lief (`updated_lauf`); «Heute» zeigt
  «Stand 08:31 (Morgen-Update)» bei «Heute geplant» und bei der Bereitschaft («Morgenwerte von heute»).
- Check-in kompakter: die Endpunkte (frisch/schwer, voll/leer, ruhig/gestresst) stehen in den Knöpfen 1 und 5, damit Check-in, Workout und
  Bereitschaft auf 390 × 844 ohne Scrollen sichtbar sind.

Geprüft: `test_tools.py` (Morgen-Update übernimmt nur Nachtwerte, Plan und neue Workouts, ohne Verbrauch des laufenden Tages; das Nacht-Update
danach ersetzt dieselben Tage und Workouts, nichts doppelt), `test_v59.cjs` (Heute geplant, Stand). E2E mit einem erfundenen Enduco-Workout
von heute: Ziele «15:00 Einfahren (140–180 W) · 3 × (8:00 @ 250–270 W / 4:00 @ 130–160 W) · …», Dauer 1:30 h, «Passende Route finden» öffnet
den Planer mit diesem Workout; Check-in, Workout und Bereitschaft auf 390 × 844 ohne Scrollen. Der erste echte Lauf ist morgen um 08:30.

## V5.9.5 · 9.11.2026 · Paket 5 «Einfacher bedienen» (bedienung-1.0)
Auftrag V5.9, Entscheid E7 (9.11.2026): ja, als zweites Paket nach Paket 3.

- **Start auf «Heute»** statt auf der Karte (Links mit `#…` gehen weiter direkt in einen Bereich, `#checkin` zum Check-in). Oben: Check-in,
  solange er fehlt, dann «Heute geplant» (Workouts des Tages aus dem Garmin-Kalender mit Zielen aus den Schritten, Quelle und «Passende Route
  finden»; ohne Workout «Für heute noch kein Workout in Garmin (Stand …)»), die Bereitschaft in einem Satz mit Erholung, Schlaf, Belastung und
  dem Stand der Daten, dann «Diese Woche». Auf 390 × 844 (App vom Home-Bildschirm) ohne Scrollen sichtbar: Check-in, Workout, Bereitschaft.
- **Fünf Bereiche in einer Leiste unten**: Heute · Kalender · Karte · Analyse · Körper & Schwimmen. «Analyse» bündelt Fortschritt,
  Laktat & Zonen, Ausdauer und Leistung, «Körper & Schwimmen» die beiden Ansichten; oben wechselt eine Leiste (bleibt beim Scrollen
  sichtbar), der zuletzt gewählte Unterbereich bleibt gemerkt. Im Routenplaner ist die Leiste weg, damit sie das Bottom Sheet nicht stört.
  Einstellungen über das Zahnrad oben rechts.
- **Info-Knopf je Karte**: Erklärtexte, Regelversionen und Quellen liegen hinter «i»; sichtbar bleibt das Ergebnis. Hat eine Karte kein
  Ergebnis (z. B. noch keine Daten), bleibt der Text sichtbar. Warnungen, Statusmeldungen und Eingaben werden nie versteckt. In den
  Einstellungen: «Erklärtexte immer zeigen».
- **Breite Tabellen als Liste** auf dem iPhone statt seitlich wischen: «Geplant gegenüber absolviert», Ermüdungsresistenz, Saison,
  Testkalender, «Diese Woche» und jede andere Tabelle, die nicht in die Breite passt (je Zeile eine Karte, Spaltennamen davor).
- **Ausblenden statt löschen**: RPE-Liste der Einheiten, Videovergleich, Fehlerboard und Rohpace beim Schwimmen sind ausgeblendet; die Daten
  bleiben, und in den Einstellungen («Ausgeblendete Karten») lässt sich jede Karte auf diesem Gerät wieder einblenden.
- Der Markenhinweis steht jetzt unten auf «Heute» (vorher schimmerte er hinter den Bereichen durch).

Geprüft: E2E auf iPhone-Grösse (390 × 844 und 390 × 664) mit erfundenen Daten: Start auf «Heute», alle drei Karten oben sichtbar (844),
jeder Bereich mit einem Tipp, Unterbereich gemerkt, Info-Knopf blendet Erklärungen ein und aus, Tabellen als Liste ohne seitliches Wischen
(in keinem Bereich mehr eine zu breite Tabelle), Leiste im Planer weg und danach wieder da, Demo mit gleicher Navigation, keine Programmfehler.

## V5.9.3 · 9.11.2026 · Paket 3 «Eingaben ohne Tippen»: Morgen-Check-in, Direkt speichern, Laktat bestätigen
Auftrag V5.9 (Entscheide vom 9.11.2026: E4 GitHub-Schlüssel nur für dieses Repository, E5 Befinden als Check-in auf der Seite statt auf der Uhr).
Wiederherstellungspunkt vor dem Bau: Branch `vor-v59`. Versionen je Paket: V5.9.1 = Paket 1 … V5.9.5 = Paket 5 (gebaut in der Reihenfolge 3 → 5 → 2 → 1 → 4).

- **Morgen-Check-in** (`befinden-1.1`): oben auf «Heute», solange das Befinden von heute fehlt. Beine (frisch–schwer), Energie (voll–leer),
  Kopf (ruhig–gestresst), je fünf grosse Knöpfe; nach dem dritten Tipp ist er gespeichert und zu, ohne Speichern-Knopf. Dazu «krank oder
  verletzt» (optional genauer) und eine freie Notiz; «heute nicht» blendet ihn für den Tag aus, «ändern» öffnet ihn wieder. Er füllt dieselben
  Felder wie das bisherige Befinden (Beine → Muskeln, Energie → Müdigkeit, Kopf → Stress), die Bereitschaft rechnet unverändert damit.
- **Gefühl und Morgenwerte**: Ab 20 Morgen mit Check-in zeigt «Heute», welcher Wert (HRV und Ruhepuls gegen die eigenen 60 Tage, Schlafwert
  der Nacht, Trainingslast am Vortag) am besten zum Gefühl passt – Rangkorrelation nach Spearman mit n, |ρ| ab 0,3 brauchbar, Richtung geprüft;
  keine Prozente, keine Ursache. Ersetzt die RPE-Kalibrierung; die Liste «Letzte Einheiten bewerten» und die RPE-Abfrage im Explorer sind
  ausgeblendet (Daten bleiben, in den Einstellungen wieder einblendbar).
- **Direkt speichern** (`eingang-1.0`, `js/eingang.js`): Jede Eingabe geht als verschlüsselte Datei `eingang/<Zeit>-<Zufall>.bin` ins
  Repository (Format EGS1 wie die Sekundenreihen: Seitenschlüssel, auf eine Zweierpotenz ≥ 16 KiB aufgefüllt; sichtbar bleibt nur, dass und wann
  etwas kam). Gesendet wird nur Neues oder Geändertes; Laktat-Bestätigungen in einer eigenen Datei. Zugang mit einem feingranularen
  GitHub-Schlüssel (nur sileyhunter/spuren, «Contents: Read and write», 1 Jahr), verschlüsselt auf dem Gerät; Einstellungen mit Anleitung,
  «Verbindung testen» und klaren Meldungen (ungültig/abgelaufen, kein Schreibrecht, kein Zugriff). Ohne Netz oder Schlüssel wartet die
  Eingabe und geht später von selbst raus; «Exportieren» bleibt der Rückweg. Auch Startorte, Trainingsrouten und neu die im Planer
  gespeicherten Routen kommen so verschlüsselt auf alle Geräte (gelöschte Routen werden auch dort entfernt).
- **Einspielen** (`tools/eingang.mjs`, `tools/eingaben_lib.mjs`): Morgen- und Nacht-Update lesen `eingang/` (spätere Eingabe gewinnt bei
  gleicher ID), spielen über `merge_daily.py` ein (alte Fassung ins Audit) und entfernen danach nur die eingespielten Dateien im selben Commit.
  Demo-, fremde oder nicht entschlüsselbare Dateien werden nie eingespielt und nie gelöscht, nur gemeldet. `eingang.mjs pruefen --git`:
  nur gültige, aufgefüllte EGS1-Dateien.
- **Laktat bestätigen (B1)**: In der Testbibliothek «Test bestätigen» zeigt alle Stufen auf einmal mit Tabelle, FIT-Leistung, Laktat und Puls;
  fehlende Werte, unklare Zuordnung und Abweichungen über 5 W bzw. 0,3 km/h sind markiert. Gleich für «Laktat hier» im Explorer (wird als
  Kurzcheck übernommen, Quelle «aus Explorer»). Das Update übernimmt Bestätigungen, rechnet `migrate_v5.py` und
  `check_referenz.py --ohne-fit` (neu: Laktat mit Quelle und Schwellen je Methode, ohne FIT-Dateien); besteht die Prüfung nicht, bleibt die
  Bestätigung in `eingang/` liegen und Silas bekommt eine Nachricht. Zonen ändern sich dadurch nie.

Geprüft: `tests/test_v59.cjs` (neu, 8 Tests: Delta, Format EGS1, Dateiname, Meldungen, Check-in, Rangkorrelation, Kalibrierung ab 20 Morgen),
`test_tools.py` (Eingang: Seite verschlüsselt → Werkzeug liest, spätere Eingabe gewinnt, Route entfernt, Laktat aus dem Explorer, nichts doppelt,
Prüfung, Aufräumen). E2E auf iPhone-Grösse mit erfundenen Daten und einer nachgebildeten GitHub-API: drei Tipps in unter einer Sekunde,
Datei EGS1 16 KiB mit richtigem Schlüssel und Commit «Eingang», Änderung schickt nur den geänderten Eintrag, Flugmodus wartet und sendet danach,
abgelaufener Schlüssel gibt eine klare Meldung ohne Verlust, Bestätigung als eigene Datei, nach dem Neuladen bleibt der Schlüssel (nur
verschlüsselt im Speicher). Die echte GitHub-API konnte von hier aus nicht geprüft werden: bitte am iPhone «Verbindung testen».

## V5.8 · 9.11.2026 · Planer: Skitourenrouten, Hangneigung, MTB-Abfahrt, Wegende, drei Rennradrouten, Windpfeile; Ringe auf «Heute»
Wünsche von Silas (9.11.2026).

- **Skitour** (`skiroute-1.0`): Die Linie folgt, wo möglich, den Skitourenrouten von swisstopo/SAC (Ebene «Skitourenrouten», identify-Schnittstelle
  von geo.admin.ch, LV95, je Seite 50 Objekte, höchstens 4 Seiten). Netz: Punkte innerhalb 12 m zusammengelegt, Linienenden bis 20 m angeschlossen;
  je Abschnitt kürzester Weg zwischen den nächsten Stellen (höchstens 150 m neben der Route). Anschlüsse und Abschnitte ohne Route bleiben «von Hand»
  (gestrichelt, mit Grund), ebenso bei Umweg über 1,8 × Luftlinie + 800 m. Nur nach Zustimmung (gesendet wird ein Rechteck um die Punkte).
- **Hangneigung** (`hangneigung-1.0`): Gelände an der Linie und 20 m daneben aus dem Höhenraster (Mapzen/AWS Terrain Tiles, Zoom 14, ±15 m),
  nicht die Steigung der Spur. Klassen nach SLF: ab 30° steil (Lawinengelände), ab 35° sehr steil, ab 40° extrem steil; 25–30° als Hinweis
  (Gradgrenzen sind Richtwerte, das Raster glättet Steilstufen). Warnstellen im Winterhinweis, Ansicht «Hangneigung», swisstopo-Karte «Hangneigung
  über 30°» per Knopf. Fehlt das Raster: unbekannt, nie «flach». Bei Skitouren und im Winter zu Fuss.
- **Wegpunkte** (`wegpunkte-1.1`): Punkt-Modus bleibt an (beliebig viele Punkte); ein neuer Punkt kommt zwischen die beiden Wegpunkte, zwischen
  denen er auf der bestehenden Linie liegt (auch bei Schlaufen und Hin- und Rückweg), ohne Linie wie bisher mit kleinstem Umweg.
- **Abschnitte von Hand** (`hand-1.0`): nur auf ausdrückliche Wahl («→ von Hand» je Abschnitt, «Lücke von Hand schliessen», Skitour) – gerade
  Linien zwischen deinen Punkten, Höhe aus dem Höhenmodell, Belag/Wegart/Zugang «von Hand / nicht geprüft», gestrichelt auf der Karte, im GPX genannt.
- **Wandern und Trail** (`wegende-1.0`): Liegt ein Punkt neben dem Wegnetz, führt die Route bis zum Wegende (roter Punkt), die Lücke wird ohne
  Linie gezeigt; «Lücke von Hand schliessen» setzt das Wegende als Punkt, der Rest ist von Hand und lässt sich mit Punkten präzisieren. Findet
  BRouter gar keinen Weg, werden Ersatzziele auf der Luftlinie versucht (85/70/50/30 %) und das Wegende vorgeschlagen.
- **MTB** (`mtb-abfahrt-1.0`): Aufstieg immer über Forst- und Kieswege (Gravel-Profil, Kies bevorzugt; die alte Option «Technische Trails» gilt
  nicht mehr für die ganze Route). Ab dem höchsten Punkt (als Umkehrpunkt setzen) zum Vergleich: wie geplant, Singletrail (MTB-Profil, reine
  Fusswege gesperrt), andere Strasse (Sperrpunkte auf dem Aufstieg) und – bei Rundtouren – der gleiche Weg zurück (Einbahnen gemeldet); je
  Abfahrt eine Karte mit Trail-Anteil, MTB-Skala (fehlt = «keine Angabe», nie geraten), Belag, Zugang; grau auf der Karte, Wahl übernimmt die
  Route. «Gleich wie» vergleicht nur die Abfahrten (der gemeinsame Aufstieg zählt nicht), «grösstenteils gleich» bei anderer Länge.
- **Rennrad** (`varianten-3.0`, `alternativen-1.1`): drei Routen nebeneinander – am direktesten, velofreundlich, am ruhigsten (Verkehr sehr wichtig) –,
  alle mit dem Profil ohne Gravel; «am ruhigsten» wird gewählt, wenn sie innerhalb der Toleranz liegt, nicht mehr Gravel hat und wirklich ruhiger
  ist. «Andere Routen» ohne zusätzlichen Gravel (kein Standardprofil mit Gravel mehr).
- **Windpfeile** (`windpfeile-1.1`): mit Prognose immer entlang der Route (3–20 Pfeile, abschaltbar), Farbe nach Gegen-, Rücken- oder Seitenwind
  zur Fahrtrichtung (±5 km/h).
- **Bedienung:** alle Analyse-Ansichten umbrechen (jede ohne Wischen antippbar), breite Tabellen seitlich scrollbar, Anstiege schmaler;
  «Zugang» heisst «Erlaubt?» und ist erklärt.
- **Heute: Ringe** (`ringe-1.0`): Erholung (HRV und Ruhepuls gegen die eigenen 60 Tage, Φ(z)), Schlaf (Garmin-Schlafwert der Nacht davor),
  Belastung (Tageslast gegen die Fitness, 50 % = Tageslast so gross wie die Fitness) – alle 0–100 %, mit Verlauf 7/28 Tage. Fehlende Werte bleiben
  leer (Audit V5.5: keine andere Nacht, gleiche Skala für alle drei). Angezeigt wird der letzte Tag mit Morgenwerten, mit Datum.
  Korrigiert: Die Zahl in der Mitte eines Rings war klein, weil der Schriftname mit Anführungszeichen das SVG-Stilattribut beendete.

Geprüft: `test_route.cjs` (44, davon 9 neu: Einfügen per Linie, von Hand, Skitourennetz, identify/LV95, Hangneigung auf synthetischem Raster,
MTB, Wegende, drei Varianten, Windpfeile), `test_formkurve.cjs` (Ringe), E2E auf iPhone-Grösse gegen eine lokale BRouter-Instanz (OSM-Testdaten
Dreieich) mit nachgebildeten swisstopo-, Höhen- und Wetterantworten (synthetisch). brouter.de, swisstopo, AWS-Höhenraster und Open-Meteo sind von
hier aus gesperrt und wurden nicht live getestet.

## V5.7.2 · 8.11.2026 · Fueling aus dem Garmin-Ernährungsprotokoll
Wunsch von Silas: Ernährung nur einmal in Garmin Connect erfassen. Geprüft mit dem Tagesprotokoll der bestehenden Garmin-Verbindung (8.11.2026):
jeder Eintrag hat Produkt, Portion, Menge, kcal, KH, teils Natrium, eine Uhrzeit (`mealTime`) und die Erfassungszeit (`logTimestamp`);
keine Flüssigkeitsmenge je Eintrag und keine Verknüpfung mit einer Aktivität.

- **Nacht-Update:** Tagesprotokoll und Trinken der letzten Tage (`food_logs`), verschlüsselt in `data.enc.json` (`ernaehrung_garmin`).
- **Prüfung je Tag:** Summe der Einträge (gerundet wie bei Garmin) = Tageswerte (KH ±1 g, kcal ±2), sonst wird der Tag nicht verwendet.
- **Zuordnung** `fueling-garmin-1.0` (nur Rad und Laufen ab 40 min, wie das Fueling-Protokoll – nach dem ersten Nachtlauf ergänzt, weil ein
  Proteinshake am Ende eines Krafttrainings als Fueling erschien): nur Einträge, deren Uhrzeit zwischen Start und Ende (inkl. Pausen) liegt und die erst danach erfasst
  wurden; vorher erfasste (geplante) Einträge werden angezeigt, aber nicht gezählt; Tages- oder Mahlzeitensummen nie.
- **Train your Gut:** Ergebnis als Fueling «fg-<Aktivität>» mit Herkunft «Garmin»; ein eigener Eintrag zur Einheit hat Vorrang (Hinweis, nichts
  überschrieben), ein auf der Seite bearbeiteter Garmin-Eintrag wird nie überschrieben, in Garmin gelöschte Einträge verschwinden (Audit).
- Kein neuer Schlüssel oder Zugang: Abruf über die bestehende Garmin-Verbindung; nichts davon steht offen im Repository.

Geprüft: `test_tools.py` (Zuordnung, geplant vs. nachträglich, Tagesprüfung, Wiederholung ohne Doppel, Änderung mit Audit, Vorrang eigener
Einträge, bearbeitet bleibt, gelöscht wird entfernt, Nacht-Update), echte Daten vom 8.11.2026 (Tagesprüfung bestanden), Seite (Liste, Detail).

## V5.7.1 · 8.11.2026 · Sekundenreihen im Nacht-Update
Freigabe von Silas (8.11.2026): Das Nacht-Update aktualisiert neben `data.enc.json` auch die verschlüsselten Reihen in `serien/`.

- **Nur Neues:** Reihen werden nur geschrieben, wenn sie neu sind oder sich tatsächlich geändert haben (Vergleich mit dem entschlüsselten
  Bestand); ein wiederholter Import derselben Aktivität ändert keine Datei. Das Nacht-Update löscht und benennt nie um.
- **Kein Neuimport beim Monatsexport:** Der Dateiname kommt neu aus der Garmin-ID (gid), die beim Monatsexport erhalten bleibt. Vorher hätte
  der Monatsexport die Reihen der Nacht-Aktivitäten als verwaist gelöscht und (mit `--nur-fehlende`) nicht neu angelegt. 2 Reihen umbenannt.
- **Datenschutz:** neues Format SPS2 – auf Zweierpotenzen ≥ 16 KiB aufgefüllt, damit die Dateigrösse die Dauer nur grob verrät; Namen weiter
  aus einem 128-Bit-Geheimwert (`serien_salz`, nur verschlüsselt) – ohne ihn lässt sich zu einer Garmin-ID kein Name berechnen.
- **Prüfung nach jedem Import** (`tools/serien_pruefen.mjs`): Entschlüsselung, Auffüllung, Zuordnung (ID, Anzahl Werte), keine Doppel,
  keine Klartext- oder Restdateien, keine Namen ohne Salz, keine Datendateien im Repository. Nicht bestanden → bisherige Dateien bleiben,
  nur `data.enc.json` wird übernommen.
- Atomares Schreiben (temporäre Datei, dann umbenennen). Seite liest SPS1 und SPS2, sucht Reihen unter gid und (für ältere) unter der ID.
- **Lange Ausfahrt: Sollband aus den Trainingszonen** (`langfahrt-2.0`, Wunsch Silas): Für «Grundlage» und «Long Ride» kommt das Watt-Sollband
  aus dem aktiven Zonenprofil – Z2 nach Dauer: bei 1 h das oberste Viertel von Z2, ab 5 h das unterste, dazwischen linear; Puls als
  Obergrenze (Ende Z2). Daneben das Band deiner Fahrten ähnlicher Dauer (beobachtet). Renn-Pacing bleibt aus beobachteten Fahrten. Der
  Hinweis aus dem Zonenprofil (Watt für die Rolle bestimmt, draussen Puls als Grenze bis zur Vergleichsfahrt) steht beim Band.
- **Keine Beispieldaten bei Ladefehler:** Ist `data.enc.json` nicht erreichbar, versucht die Seite es noch zweimal und zeigt dann «Erneut
  versuchen» statt erfundener Zahlen (vorher still Beispieldaten). Der Offline-Speicher übernimmt Daten und Reihen beim Wechsel der Fassung.
- **Startorte wiederherstellen:** in «Startorte verwalten» neu «Startorte sichern» (verschlüsselte Datei, Seitenpasswort) und «Sicherung laden»
  (ergänzt fehlende Orte, keine Doppel). Nach dem Einspielen über den Chat stehen sie in `data.enc.json` und sind auf jedem Gerät da.

| Regel | vorher | jetzt |
|---|---|---|
| Reihen-Format | SPS1 (exakte Grösse) | SPS2 (aufgefüllt), SPS1 wird weiter gelesen |
| Dateiname | SHA-256(Salz:ID) | SHA-256(Salz:gid, sonst ID) |
| Nacht-Update | nur `data.enc.json` | `data.enc.json` und `serien/` nach bestandener Prüfung |

Geprüft: `test_tools.py` (neu: neue Aktivität, wiederholter Import, geänderte Reihe, Fehler mit Wiederherstellung, falsches Passwort,
Monatsexport mit neuer ID, Umbenennen, verwaiste Reihe im Nacht-Update, Prüfung erkennt Klartext, Restdatei und Namen ohne Salz);
echte Aktivität vom 8.11.2026 lokal durch den ganzen Nacht-Ablauf (neu → 1 Datei; noch einmal → keine Änderung); Seite entschlüsselt SPS1
und SPS2 im Browser, Manipulation wird erkannt; Browser mit Test-Passwort und erfundenen Daten: Explorer lädt neue (gid) und ältere Reihen
(ID), Startorte nach Löschen der Browserdaten und auf einem neuen Gerät aus der Sicherung wiederhergestellt, nach dem Einspielen ohne Sicherung.

## V5.7 · 8.11.2026 · Smart Training Routes (Trainingsroute aus dem geplanten Workout)
Auftrag «Ironman Notebook V5.7 – Smart Training Routes». Der Planer bleibt mit allen Funktionen erhalten (Start/Ziel fest, Zwischenziele,
Rennrad ohne Gravel, Varianten, andere Routen, Umfahrung, Umkehren, Profil/Belag/Wegart/Wetter synchron). Kein neuer Haupttab.
Ergebnis je Punkt mit Teststand (implementiert / lokal getestet / produktiv getestet): `docs/AUDIT_V57.md`. Wiederherstellungspunkt: Branch `vor-v57` (ed42b3d).

**Neu**
- Kalender: «Passende Route finden» bei geplanten Rad-, Lauf- und Wandereinheiten; im Planer «Training → Route». Workout aus der
  Garmin-Verbindung (Enduco): Schritte, Wiederholungen, Ziele (Watt, Pace, Puls), intensive Schritte nach deinem Zonenprofil, Art und Dauer;
  sonst eigene Angaben.
- Drei echte Vorschläge: A Training, B Wetter, C ruhig/velofreundlich bzw. laufgeeignet – mit Distanz, Zeit und Band, Höhenmetern, Belag,
  Strassentypen, Wind 1./2. Hälfte, Seitenböen, Regen, Tageslicht, Eignung, Begründung; Regler für Grundlage und Intervalle.
- Dauer auf das Workout abgestimmt (Ziel ±5 % bzw. ±10 % bei Intervallen); die Plandauer wird nie verändert, Abweichungen stehen da.
- Intervalle auf der Route: Bänder im Höhenprofil, farbig auf der Karte, je Abschnitt gut/bedingt/ungeeignet mit Gründen.
- Startorte (Zuhause, Arbeit oder eigener Name) verschlüsselt auf dem Gerät, mit «Exportieren» in die verschlüsselten Daten.
- Vorschlag vs. Ist im Kalender nach dem Training; Modellgüte nur aus unabhängigen Einheiten.
- Nacht-Update (nur lesend über Garmin): Workout-Schritte, neue Enduco-Workouts ohne Datum, GPS-Spur `poly`. Geschrieben wird weiter nur `data.enc.json`.

**Rennrad-Routing geprüft und verbessert**
- Pflaster eigener Belag (kein Gravel); unbekannt bleibt unbekannt.
- Velofreundlich nur, wenn wirklich ruhiger; 10 % gelten der Fahrzeit (ohne Zeitprognose ausdrücklich der Distanz).
- Profil: velofreundliche Variante meidet Hauptstrassen zusätzlich (`avoid_mainroads`), unabhängig von Verkehrsdaten des Servers.
- Ersatzprofil fastbike immer sichtbar im Planer-Status; BRouter-Anfragen höchstens 2 gleichzeitig.

**Behoben (im Browsertest gefunden)**
- Planer-Status brach bei einem Abschnitt mit unbekanntem Zugang ab (seit V5.3 möglich): jetzt «Zugang unbekannt», erst ab 5 m gemeldet.
- Regler der Trainingsvorschau: beim Ziehen wird nur der Vergleich darunter neu gezeichnet – vorher wurde der Regler selbst ersetzt und das
  Ziehen brach nach einem Schritt ab.
- Neuzeichnen der Trainingsvorschau, während ein Eingabefeld mit geändertem Wert aktiv war, löste einen Fehler aus (doppeltes Zeichnen über
  das «change» beim Verlassen des Felds); jetzt wird das Feld vorher verlassen und nur einmal gezeichnet.

| Regel | vorher | jetzt |
|---|---|---|
| Zeitmodell | `zeit-rt-1.2` (eine Intensität) | `zeit-rt-1.3` (Leistung bzw. Tempo je Workout-Schritt; Rollwiderstand Pflaster) |
| Belag | Pflaster = «Anderer Hartbelag» | `belag-1.1` (Pflaster eigene Klasse) |
| Varianten | `varianten-2.0` | `varianten-2.1` (nur ruhiger = velofreundlich; Distanz-Ersatz beschriftet) |
| Rennradprofil | `gravel-rt-1.0` | `gravel-rt-1.1` (`avoid_mainroads`) |
| Anfragen | alle Abschnitte gleichzeitig | `anfragen-1.0` (höchstens 2 gleichzeitig, Cache je URL) |
| Neu | – | `workout-1.0`, `trainingsroute-1.0`, `dauer-1.0`, `intervall-rt-1.0`, `wetteroptimiert-1.0`, `ruhig-1.0`, `tageslicht-1.0`, `auswertung-rt-1.0` |

Geprüft: `tests/test_training.cjs` 25 (neu; Enduco-Strukturen, Zeitplan, Dauerabstimmung, Intervalle, Wetter, Tageslicht, Suche mit lokal
aufgezeichneten BRouter-Antworten Rennrad/Laufen/Gravel, Fehler, Auswertung), `test_route.cjs`, `test_formkurve.cjs`, `test_analyse.cjs`,
`test_tools.py` (neu: Nacht-Update mit Schritten und Spur, Startorte, Vorschläge); Browser iPhone und Desktop gegen die lokale BRouter-Instanz;
Zeitprognose an 42 echten Rennradfahrten (Median ±5,0 %). **Nicht getestet:** brouter.de, Open-Meteo, swisstopo, Routen in der Schweiz, echtes iPhone.

## V5.6 · Routenplaner · 8.11.2026 · Start/Ziel fest, Rennrad ohne Gravel, velofreundlich, andere Routen
Wunsch von Silas (8.11.2026, Chat). Betrifft nur den Routenplaner; andere Sportarten routen wie bisher (zusätzlich «Andere Routen»).

**Neu**
- Start und Ziel bleiben fest: Ein weiterer Punkt (Karte oder Suche) wird als Zwischenziel dort eingefügt, wo er den kleinsten Umweg macht
  (Chur → Lenzerheide plus Paspels ergibt Chur → Paspels → Lenzerheide). Vorher wurde er als neues Ziel angehängt. Start bzw. Ziel ändern:
  Punkt A/B ziehen, Liste ↑↓ oder «als Start/als Ziel» neben der Suche.
- Ortssuche (Schweiz) über swisstopo; gesendet wird nur der eingegebene Text.
- Rennrad mit eigenem BRouter-Profil «ohne Gravel» (`brouter/rennrad-asphalt.brf`, aus fastbike): Feinkies und Naturbelag werden gemieden,
  auch auf Radwegen; Pflaster ist ok. Nimmt der Server das Profil nicht an: Standardprofil fastbike mit Hinweis.
- Schnellste und velofreundliche Variante werden immer beide gerechnet; gewählt wird velofreundlich, solange sie höchstens 10 % langsamer ist
  (einstellbar 0–30 %) und nicht mehr Gravel hat. Die andere ist grau auf der Karte und mit einem Tippen wählbar.
- Gravel-Meldung beim Rennrad: Abschnitte mit km, Länge, Belag und Wegart; «für mich ok» oder «Umfahrung zeigen» (BRouter mit
  Sperrpunkten auf den Gravel-Stücken) mit Mehr-km und Mehrzeit; übernehmen oder zurück.
- «Andere Routen» wie bei Google Maps: bis zwei Alternativen (BRouter `alternativeidx`), grau mit Nummer, Tabelle mit Zeit, km, Hm,
  höchstem Punkt, Hauptstrasse und Gravel; beim Rennrad zum Vergleich das Standardprofil, falls es kürzer über Gravel führt.

| Regel | vorher | jetzt |
|---|---|---|
| Varianten | `varianten-1.0` (auf Knopfdruck Schnell/Weniger Verkehr/Ruhig, Fazit nach Hauptstrassenanteil) | `varianten-2.0` (immer Schnellste und Velofreundlich, Wahl nach Zeit-Toleranz und Gravel) |
| Gravel | – (nur Summe «unbefestigt» im Hinweis) | `gravel-rt-1.0` |
| Andere Routen | – | `alternativen-1.0` |
| Wegpunkte | neuer Punkt = neues Ziel | `wegpunkte-1.0` |
| Ortssuche | – | `ortssuche-1.0` |

Geprüft: `tests/test_route.cjs` 35 (neu 7, mit echten Antworten einer lokalen BRouter-Instanz: Profilvergleich, Umfahrung, Alternativen,
Varianten), Browser lokal (iPhone-Emulation) gegen die lokale BRouter-Instanz mit hochgeladenem Profil; bisherige Planer-Tests (V5.3, V5.5)
bestanden. **Nicht getestet:** brouter.de (Profil-Upload, Routen in der Schweiz) und die swisstopo-Suche – beide hier gesperrt.

## V5.6 · 8.11.2026 · Aktivitäts-Explorer, Geplant vs. Ist, Saison 2027, Ermüdungsresistenz, RPE, Energie
Grundlage: Auftrag V5.6 («TrainingPeaks-Funktionen und intelligente Trainingssteuerung»). Ergebnis je Modul mit Teststand
(im Code / lokal getestet / produktiv getestet): `docs/AUDIT_V56.md`. Offene Punkte: `docs/offen-nach-v55.md` (Abschnitt V5.6).
Keine neuen Haupttabs; bestehende Module erweitert. Wiederherstellungspunkt: Branch `vor-v56` auf GitHub (Stand ea037c3, Seite und Daten vor V5.6).

**Neu**
- Aktivitäts-Explorer (Kalender «Analysieren», Karte, Heute): synchronisierte Kurven Leistung, Puls, Pace bzw. Tempo, Kadenz, Höhe;
  Abschnitt mit dem Finger wählen, Block A/B vergleichen, Intervalle und Pausen mit Korrektur von Hand, Laktat einem Abschnitt zuordnen.
  Sekundenwerte als verschlüsselte Dateien `serien/` (1774 Aktivitäten, 2-s-Raster), Dateinamen ohne Aktivitäts-IDs.
- Geplant vs. Ist je Workout-Schritt aus dem Workout, das auf der Uhr lief (278 Einheiten: Rad 154, Lauf 92, Schwimmen 32), Zeit im
  Zielbereich, gleiche Einheiten früher. Keine Enduco-Schnittstelle; Zwift-Dateien enthalten keine Workout-Schritte.
- Saison 2027: Phasen rückwärts ab Ironman Hamburg mit Jesolo als B-Rennen, Vorschlag der Wochenstunden aus den eigenen Wochen
  (änderbar, nur auf dem Gerät), Ist je Woche, Enduco-Stunden aus dem Garmin-Kalender.
- Ermüdungsresistenz je lange Einheit und in «Meine Entwicklung»; Fortschrittsbericht mit Deutung und Zuverlässigkeit je Aussage.
- RPE 1–10 mit Gefühl, Muskulatur, Bereich und Notiz je Einheit; persönliche Kalibrierung mit Morgenwerten ab 20 Paaren.
- Konstanz und Belastungsverträglichkeit (Fortschritt); Energie und Kohlenhydrate getrennt nach aufgenommen / geschätzt / Modell / unbekannt.

**Neue Regelversionen**

| Bereich | Version | Regel |
|---|---|---|
| Sekundenreihe | `serie-1.0` | 2-s-Mittel aus FIT, Lücken > 30 s trennen Abschnitte, fehlende Werte bleiben leer; Formatversion unter `ver` |
| Explorer-Kennzahlen | `explorer-1.0` | Ø, Max, NP (30-s-Mittel), Puls Anfang/Ende (je 30 s), Höhenmeter mit 2-m-Hysterese; HF-Drift nur bei gleichmässiger Belastung (VI ≤ 1,10 bzw. Tempo-CV ≤ 0,15) |
| Intervalle | `intervalle-1.0` | Runden mit Workout-Schritt, sonst 30-s-Mittel > 115 % des Medians, mind. 60 s; Korrektur von Hand ersetzt die Erkennung |
| Geplant vs. Ist | `plan-1.0` | Schritte aus FIT `workout`/`workout_step`, Runden über `wkt_step_index`; Rundenende aus Start + verstrichener Zeit, wenn die Uhr den Aktivitätsstart als Zeitstempel schreibt; Leistungsziele ≤ 1000 je Workout als Watt oder % FTP nach der gefahrenen Leistung (offen ausgewiesen); Plandauer nur, wenn jeder Schritt eine Zeit hat |
| Ermüdungsresistenz | `ermuedung-1.0` | gleichmässige 10-min-Blöcke ab Minute 10; Puls früh (Start < 90 min) gegen spät (≥ 150 min) bei ±10 W bzw. gleicher Pace; beste 20 min ab Stunde 2/3/4/5 |
| RPE | `rpe-1.0` | CR-10 nach Foster (modifizierte Borg-Skala); sRPE = RPE × Bewegungsminuten; Kalibrierung ab 20 Paaren, Spearman-Rangkorrelation, keine Prozentwerte |
| Energie | `energie-1.0` | Rad: kJ = Ø W × Bewegungszeit, kcal mit Wirkungsgrad 22–25 % (Annahme); KH-Anteil je Garmin-Pulszone als Modell; Richtwert Jeukendrup 2014 |
| Saison | `saison-1.0` | Taper 2 Wochen, wettkampfspezifisch 8, Aufbau 16, Erholung jede 4. Woche, B-Rennen mit Mini-Taper und Erholungswoche |
| Entwicklung | `entwicklung-1.0` (unverändert) | neue Metriken `dauer_rad`, `p20_3h`, `dauer_lauf`, `lauf_hf150` mit derselben Urteilsregel |

**Korrekturen während der Abnahme (vor der Veröffentlichung)**
- Explorer brach bei Reihen ohne Tempo ab (Becken, Kraft, Rolle ohne Sensor; 353 von 1774): Versionstext lag unter dem Tempokanal `v`.
- Workout-Abgleich fehlte für Läufe und Schwimmen von der Uhr (Rundenende = Aktivitätsstart): jetzt 278 statt 158 Einheiten.
- Plandauer war bei Schritten nach Distanz eine Teilsumme: jetzt «Dauer offen» bzw. geplante Distanz.
- Richtwert Kohlenhydrate für 1–2 h: ca. 30 g/h (vorher fälschlich 30–60 g/h).

Geprüft: `tests/test_analyse.cjs` (12), `tests/test_tools.py` (60 Prüfungen), `tests/test_formkurve.cjs` (53), `tests/test_route.cjs` (28),
`check_referenz.py` GESAMT bestanden; im Browser lokal (Chromium, iPhone-Emulation 375/390/430 px). Produktiv **nicht getestet**.

## V5.5 · 8.11.2026 · Prüfbare Aussagen statt Rohdaten-Urteile
Grundlage: Auftrag V5.5 (Vorrang vor älteren Fassungen). Bestands- und Lückenmatrix sowie Ergebnis je Befund: `docs/AUDIT_V55.md`.
Offene Punkte (nur diese gehen in die nächste Änderungsdatei): `docs/offen-nach-v55.md`.

### Korrektur F1 · 8.11.2026 · fehlende Wetterwerte bleiben unbekannt
Befund aus dem Prüfbericht V5.5 (lokal gefunden): Fehlten in der Open-Meteo-Antwort Windwerte, rechnete die Seite Windstille
(in JavaScript ergibt `null × sin(…)` den Wert 0). Behoben in `js/route.js` (Wetterfeld, Fahrzeit) und `js/routen-ui.js` (Anzeige).

| Regel | vorher | jetzt | Änderung |
|---|---|---|---|
| Wetter (Routenplaner) | `wetter-rt-1.1` | `wetter-rt-1.2` | 0 km/h nur bei gemeldeter Windstille (gültiger Wert, ohne Richtung); fehlt Geschwindigkeit oder Richtung, sind Gegen-/Rückenwind unbekannt; Wind wird nie mit dem Nachbarwert gefüllt (fehlt ein Nachbar mit Gewicht, bleibt unbekannt) |
| Zeit (Routenplaner) | `zeit-rt-1.1` | `zeit-rt-1.2` | Abschnitte mit unbekanntem Wind ohne Wind gerechnet und gezählt; Hinweis «Wind nicht berücksichtigt» mit Grund; Band dort mit ±2 m/s (±7 km/h) Gegen- bis Rückenwind, wie ohne Prognose; Temperatur unbekannt → 15 °C, Niederschlag unbekannt → trocken, beides als Hinweis |

Anzeige: «Wind unbekannt», «Wind 18 km/h (Richtung unbekannt)», «windstill (0 km/h)», «Temperatur unbekannt», «Regen unbekannt»;
Wetterstreifen mit Lücken statt 0 und «Lücken = unbekannt (… %)»; «trocken» nur, wenn überall Niederschlagswerte vorliegen;
keine Windpfeile ohne Richtung. Geprüft: 7 neue Tests in `tests/test_route.cjs`, Planer lokal im Browser (7 Fälle, siehe
`docs/AUDIT_V55.md`); Routenplanung, Trainingsdaten und Dashboards unverändert (Regressionstests gleich wie vorher).
Produktiv (brouter.de, Open-Meteo) **nicht getestet**.

**Neue und geänderte Regelversionen**

| Bereich | vorher | jetzt | Was sich ändert |
|---|---|---|---|
| Form (Fitness/Ermüdung/Form) | – (unversioniert) | `pmc-2.0` | Form = Fitness − Ermüdung desselben Tages; die alte Konvention (Werte von gestern) nur als Zusatz «vor der Last von heute» |
| Zonenverteilung | – (Garmin-Zonen aller Sportarten addiert) | `zonenverteilung-2.0` | je Sportart, Zonen gültig je Datum (nur freigegebene Profile), Nenner = Pulszeit mit gültigen Schwellen, Garmin-Zonen nur blass und nicht beurteilt, Hypothese statt Warnung |
| Puls zu Watt/Pace (Power-HR) | Ganz-Fahrt-Mittel | `eb-1.0` (Blöcke), `entwicklung-1.0` (Urteil) | nur gleichmässige 10-min-Blöcke ab Minute 10 (Rad 190–210 W je System, Laufen 5:20–5:40/km flach); Urteil mit n, Bootstrap-Intervall, Guards (Hitze, Höhe, Drift, Ausreisser), mind. 3 je Zeitraum |
| Lauf-Effizienz | «m/min pro Herzschlag» | `laufeffizienz-1.0` | Einheit m/Schlag, Ausreisser gezählt und ausgewiesen |
| Koppellauf | `koppel-1.0` | `koppel-1.1` | Fenster und lange Pausen getrennt, Pace und Puls in getrennten Grafiken |
| Lange Ausfahrt | – | `langfahrt-orientierung-1.0` | Orientierung aus eigenen Fahrten, wenn die Prognose «nicht bestimmbar» ist |
| Zeit (Routenplaner) | `zeit-rt-1.0` | `zeit-rt-1.1` (seit F1: `zeit-rt-1.2`) | Pausen je Zwischenziel; Fehlerband nach Population (Länge, Hm/km, Steigungsklasse) |
| Wetter (Routenplaner) | `wetter-rt-1.0` | `wetter-rt-1.1` (seit F1: `wetter-rt-1.2`) | Wetterzeit nach Pausen verschoben; Windpfeile = Herkunft + 180° |
| Varianten (Routenplaner) | – | `varianten-1.0` | «Schnell / Weniger Verkehr / Ruhig» nur über das erlaubte Rennradprofil, Fazit mit Hauptstrassenanteil |
| Kalibrierung | `kalibrierung-1.0` | `kalibrierung-1.1` | Hold-out-Population und Fehler je Steigungsklasse |
| CSS | – | `css-1.0` | (T400 − T200) ÷ 2, von Hand gestoppt, korrigierbar |
| Fueling-Quellen | – | `fueling-quellen-1.0` | geprüfte Garmin/FIT-Quellen, nichts geschätzt |
| Zeitbegriffe | `zeit-1.0` | `zeit-1.0` (unverändert) | Anzeige: Jahresziele und Vorjahr in Bewegungszeit, Timer getrennt ausgewiesen |
| Stufen | `stufen-1.0` | `stufen-1.0` (unverändert) | – |
| Schwellen | `schwellen-1.0` | `schwellen-1.0` (unverändert) | Trend je Protokoll getrennt (Darstellung) |

**Neu**
- Fortschritt beginnt mit «Meine Entwicklung»: drei Antworten (verbessert, stabil/unklar, als Nächstes prüfen), Kacheln je Kennzahl,
  Messpunkte mit Referenz, Rechennachweis als Export («Daten & Methode», ohne Geheimnisse).
- Ausdauertrend je Kalenderjahr, Lauf-Effizienz, Langfahrt-Orientierung, Koppellauf mit synchronen Einzelgrafiken und Abschnittstabelle.
- Routenplaner: Varianten mit Hauptstrassenanteil, Pausen je Zwischenziel, Windpfeile, Wetter im eigenen Streifen, Startzeit oben,
  Wintersperren-Hinweis, Fehlerband nach Population.
- Schwimmen: CSS-Test zuoberst, Fehlerboard, Video-Coach-Status, Rohpace nur als Rohdaten.
- Fueling: leerer Zustand statt leerem Plot, «Import prüfen» mit den geprüften Quellen.
- Logo und App-Icon von Silas; Markenhinweis in der Fusszeile.

**Geändert**
- Heute ohne Ringe: Bereitschaft mit Datenqualität (fehlende Nacht sichtbar), HRV, Ruhepuls und Schlaf als drei kleine Grafiken.
- Ebenen je Tab (Methode und Details eingeklappt), Tab-Leiste mit Hinweis auf weitere Tabs, Touch-Flächen ≥ 44 px, breite Tabellen
  mit Wischhinweis; Rennen kompakt; Serie nachrangig.
- Laktat: Kopfzeile ohne alte Aufschrift, Filter und Messkontext, Trend je Protokoll.

**Daten** (verschlüsselt, alle 1759 Aktivitäten aus dem FIT-Export unverändert, `check_referenz.py`: GESAMT bestanden)
- `eb` (gleichmässige Blöcke) für die passenden Aktivitäten, `kalibrierung.*.population`, `fueling_quellen`.
- Sicherungen vor jeder Datenänderung in `work/backup/` (nicht im Repository); Rückweg: Sicherung zurückkopieren, verschlüsseln, committen.

## V5.3 · 8.11.2026 · Ironman Notebook
Grundlage: Masterauftrag V5.3 (Vorrang vor V5.2/V5.1), Konzept V5.3, Interaktionsvorlage (nur Verhalten, keine Daten). Prüfbericht: `docs/abnahme-v53.md`.

**Neu**
- Routenplaner mit echtem Routing (BRouter, OSM-Wegnetz): Sportprofile Rennrad, Gravel, MTB (Standard Forst-/Kieswege, Schalter
  «Technische Trails»), Laufen, Trail, Wandern (SAC-Grenze), Skitour (von Hand gezeichnet, ohne Wegnetz). Zwischenziele setzen,
  ziehen, löschen, umsortieren, «Zwischenziel hier», Rundtour, Rückgängig; Umkehren routet neu (Einbahnen). Fehler werden erklärt,
  nie durch eine Luftlinie ersetzt; GPX nur aus der gerouteten Linie. Zustimmung vor dem ersten Senden von Koordinaten.
- Ein Zustand für Karte und Profil (Kettenmass distanceAlong_m): Route antippen/Maus darüber → Profil; im Profil tippen/ziehen
  (Finger, Maus, Pfeiltasten) → Punkt auf der Karte; Cursor auf der Karte entlang der Route ziehen.
- Analyse: Höhe (Steigungsklassen), Anstiege und Abfahrten (Listen, klickbar, Zoom), Wegart, Belag, Zugang, Temperatur, Regen,
  Wind (Gegen-/Rückenwind je Abschnitt), Tempo; km und % inkl. «unbekannt»; Kategorie antippen hebt alle Stücke hervor.
- Intensität am Profil: Watt oder Puls (Rad), Pace oder Puls (Laufen/Trail), Tempo, Hm/h oder Puls (Wandern), Hm/h oder Puls
  (Skitour); Bewegungszeit mit Band, Ankunft je Wegpunkt, Pausen getrennt, Startzeit; Wetter je Abschnitt zur Durchfahrtszeit.
- Persönliche Kalibrierung aus FIT-Daten mit Hold-out (`tools/kalibrierung.py`, kalibrierung-1.0); ohne genügend Daten
  «Unzureichende Daten». Empirische Korrektur der Rad-Physik aus den eigenen Fahrten.
- Bottom Sheet mit drei Höhen auf dem iPhone, Desktop zweispaltig.
- Name «Ironman Notebook» mit eigenem Berg-Symbol (Titel, Kopfzeile, Home-Bildschirm, Manifest).
- Fortschritt: Jahresziele (Ringe, eigene Ziele), Serie, Trainingstagebuch, Bestleistungen (Laufen aus FIT, `tools/bestleistungen.py`;
  Rad beste Watt je Dauer), Leistungsfähigkeiten (8 Wochen gegen Bestwert), Zonen Monat gegen Vormonat.
- Körper: Kohlenhydrate und Protein pro kg gegen Richtwerte je Trainingsumfang.
- Schwimmen: Technikübungen mit eigenen Zeichnungen, Ablauf und typischen Fehlern.
- Aktivitäten mit Garmin-Wetter: «Wetter kopieren» (Text für die Strava-Beschreibung).

**Geändert**
- Karten «Trainingslast: Garmin-FTP oder geschätzte FTP» und «Rad: FTP und Watt/kg» ausgeblendet (Daten und Werkzeuge bleiben).
- Alte Luftlinien-Routen aus «Meine Routen» werden beim Bearbeiten als Wegpunkte geroutet (≤ 25 Punkte) oder als gezeichnete Linie geöffnet.
- Je Aktivität bleibt die Leistungskurve (`pdc`) erhalten (Import und Nachfüllen).

## V5 · 8.11.2026
Grundlage: Masterauftrag V5 und Konzept V5 vom 7.11.2026. V1–V4 bleiben erhalten; Rückweg: Branch `vor-v5`.

**Neu**
- Laktat & Zonen: Testkurven aus echten Stufenpunkten, Einzelmessungen als einzelne, anklickbare Punkte; Detailfeld mit Aktivität,
  Block, Ziel/Ist, Puls Ø/max, Dauer, Quelle und Qualitätshinweisen; Liste aller Punkte für Tastatur und Screenreader.
- Zonen-Cockpit: vier unabhängige Skalen (Rad Watt, Rad Puls, Lauf Pace links langsam → rechts schnell, Lauf Puls) mit LT1/LT2
  je Test, Popover mit Grenzen, Methode, Quelle, Datum, Status; Ansichten Aktuell, Voriger Test, Vergleichen.
- Schwellen je Methode (`tools/schwellen.py`, schwellen-1.0): SOMC, Basis + 0,5, log-log, Dickhuth; Dmax nur bei Ausbelastung;
  2/4 mmol/l nur Orientierung; 80-/95-%-Bänder aus der Messunsicherheit; LT1/LT2-Verlauf je Sportart und Protokoll.
- Zonenprofile versioniert (zonen-1.0) mit Freigabe und Gültigkeit; nie automatisch aus LT1/LT2.
- Testbibliothek mit Filtern, «Als Vorlage», «Archivieren», «Bestätigen» (Schritt B1 über den Export).
- Test erfassen am Handy: Vorlagen, grosse Eingabefelder, Entwurf verschlüsselt und offline, FIT-Datei im Browser lesen,
  Stufengrenzen verschieben, Werte je Stufe mit «prüfen»-Hinweisen.
- Bereitschaft (readiness-1.0): bereit / normal / vorsichtig / nicht beurteilbar mit 2–4 Gründen, ohne Prozentwert; Befinden,
  Krankheitszeichen, Nachtdienst; Verlauf 21/42 Tage mit HRV-Referenzband; eigene Entscheidung speicherbar.
- Lange Ausfahrt 1–6 h (langfahrt-1.0): Watt- und Pulsband aus eigenen Fahrten (Dauer, System, Gleichmässigkeit, Entkopplung),
  sonst «nicht bestimmbar» und Szenario von Hand; Plan gegen Ist mit Ø Watt, NP und Puls 1./2. Hälfte getrennt.
- Koppelläufe (koppel-1.0): Rad → Lauf mit 0–45 min Wechsel (einstellbar), koppeln/trennen, Abschnitte 0–5/5–10/10–20 min,
  Solo-Vergleich nur bei vergleichbaren Läufen.
- Fueling / Train your Gut (fueling-1.0): Produkte, Ereignisse mit Anteil, GI-Beschwerden 0–5, g/h, ml/h, mg Na/h aus aktiver Dauer;
  «nicht protokolliert» ≠ 0; 30-min-Blöcke; Magen-Darm gegen die Aufnahme davor (ohne Kausalbehauptung).
- Rad-Fahrzeit aus der Leistungsbilanz (eta-1.0) für Planer-Route, GPX oder Prüfstrecke; Aerotest CdA A-B-A (cda-1.0);
  Schwimm-Video-Coach lokal mit Marken, Winkeln, Lernbausteinen.
- Wetter je Aktivität aus Garmin mit Stationsqualität (wetter-1.0); Kartenklick auch für Wanderwege, Veloland, MTB-Land, Wanderland.
- Eingaben auf dem Gerät verschlüsselt (gleicher Schlüssel wie die Daten), Export/Import, `tools/eingaben.mjs`; Service Worker offline.
- Kennzahlen je Aktivität: `t0`, `dr`, `sp` (ausdauer-1.0); `tools/nachfuellen.py`; `tools/migrate_v5.py` mit Sicherung und Rückweg.

**Geändert**
- Helles Design (Petrol/Koralle, dünne Linien), Navigation neu gruppiert; «Training» heisst «Fortschritt».
- «Erholung %» ersetzt durch die Bereitschaft ohne Prozentmodell (V5 verlangt keine Scheingenauigkeit).
- Zonenverteilung nutzt das aktive Zonenprofil statt LT2 = 4 mmol/l.
- Laktat-Kurzchecks und Testzentrum stehen unter «Laktat & Zonen», die Schwimmpace unter «Schwimmen».

**Offen** siehe `docs/abnahme-v5.md` (Routing, Wetter entlang Routen, Strava, Live-Prüfung der Kartenabfragen).
