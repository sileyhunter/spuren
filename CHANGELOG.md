# Änderungen

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
