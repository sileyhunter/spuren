# Audit V6.4 · 13.11.2026 · Prüfung von V6.0 bis V6.4.3

Auftrag: «Wenn du fertig bist, will ich alles verifizieren lassen» (13.11.2026). Geprüft wurde der Stand `534af5b` (V6.4.3), Umfang seit dem
letzten Audit (V5.9, `f7676be`). Vier unabhängige Prüfungen, jede ohne Kenntnis der Arbeit der anderen; ihre Berichte und Nachweis-Skripte liegen
nur in der Arbeitsumgebung (nicht im Repository, weil sie zum Teil mit den echten Daten arbeiten). Hier stehen nur Befunde und Massnahmen, keine
persönlichen Werte. Regeln und Versionen: `CHANGELOG.md` (V6.4.4). Offene Punkte: `docs/offen-nach-v55.md`.

| Prüfung | Gegenstand | Befunde |
|---|---|---|
| A · Rechenlogik | alle versionierten Regeln von V6.0 bis V6.4.3 gegen Regeltext, Randfälle, Tests | 1 kritisch, 2 hoch, 8 mittel, 15 niedrig |
| B · Wissen und Quellen | 84 Quellen (Angaben und Inhalt), Texte der Kapitel und Bausteine | 0 hoch, 7 mittel, 28 niedrig; keine falsche Zahl |
| C · Datenschutz und Sicherheit | Repository mit Historie und hängenden Commits, Seite, Verschlüsselung, Dritte | 0 kritisch, 3 hoch, 6 mittel, 7 niedrig |
| D · Oberfläche | Demo und eigene Daten im Browser (390 px und 1280 px, dunkel und hell), alle Ansichten und Blätter | 0 kritisch, 1 hoch, 8 mittel, 17 niedrig |

**Teststand – Begriffe.** *Lokal getestet*: Abnahmetests mit erfundenen Werten (`tests/`) und die Seite im Browser in dieser Arbeitsumgebung
(Chromium, iPhone-Grösse und breit) mit der Demo und mit den eigenen Daten (nur lokal entschlüsselt, danach gelöscht). *Produktiv*: auf der
veröffentlichten Seite – von hier aus nicht abrufbar (github.io gesperrt).

## A · Rechenlogik
Alle Befunde mit Nachweis-Skript bestätigt, behoben und mit einem Test abgesichert (Skripte erneut ausgeführt: alle behobenen Befunde «nicht
bestätigt»; wo ein Skript die Oberfläche umgeht oder ein Textbefund durch eine Textänderung behoben ist, prüft ein neuer Test die Stelle).

| Nr | Schwere | Befund | Massnahme |
|---|---|---|---|
| B1 | kritisch | 3:1-Rhythmus begann bei «heute»: Erholungswoche und Rad-Stufentest rückten jede Woche weiter, «Woche x von y» immer 1 | saison-1.2: Rhythmus fest am Hauptrennen, ganze Phase für «Woche x von y»; Test über 20 Rechentage |
| B2 | hoch | aus FIT nachgerechnete Laktat-Vorschau wurde beim nächsten Update durch die Notiz-Fassung ersetzt | nur Vorschauen aus der Notiz folgen der Notiz; Test |
| B3 | hoch | Ampel-Prüfung rechnete den Morgen-Stand mit der Last desselben Tages | readiness-2.1 (Last bis gestern), ampel-pruefung-1.1; an den eigenen Daten wiederholt: ein Block wechselte die Gruppe, die beiden Entscheide von readiness-2.0 (Schlaf 5–6 h nur Hinweis, Garmins Readiness nicht in der Ampel) bestätigt |
| B4 | mittel | Kurzcheck konnte 1–2 Tage vor einem Stufentest landen | gewählter Tag geprüft; Test |
| B5 | mittel | Rad-Stufentest in der Woche eines eingetragenen Lauf-Stufentests | eingetragene Tests sperren ihre Woche für die andere Sportart; Test |
| B6 | mittel | Lauf-Stufentest ohne Feld `sport` wurde als Rad-Test eingesetzt | `V62.testSport`/`testSporten` (aus der Notiz, gemeinsamer Test = beide) in Testplan, Testkalender, «Heute» und Woche; Tests |
| B7 | mittel | vergangene Wochen nutzten Wissen nach dem Montag | `V64.stand` (Läufe bis Sonntag davor, Tests auch wenn erledigt, Stunden von Hand nur, wenn sie damals galten); Test |
| B8 | mittel | nach einer Laufpause keine Grenze und kein Hinweis | aufbau-1.1: höchstens 30 min locker, harte Läufe gemeldet; Test |
| B9 | mittel | zweiter Garmin-Verlauf im Eingang verdrängte den ersten | Liste je ID, jede Datei einzeln eingespielt; Test |
| B10 | mittel | verschobenes Enduco-Workout zählte doppelt | vergleich-1.1: gleicher Titel ±2 Tage im Kalender, dort nicht gelaufen → einmal; Test |
| B11 | mittel | Uhr-Workout ohne Plandauer galt mit der gelaufenen Zeit als Plan | «ohne Dauer», Sportart zählt für «näher an» nicht, bei mehr als der Hälfte kein Urteil; Tests |
| B12–B26 | niedrig | gekürzter Lauf über der Grenze, Budget still überschritten, Taper-Text, Wechseldatum, «andere»-Wochen, Statusband −30, Fokus mit Platzhalter, Schlaf-Text, «erledigt» ohne Sportart, CSS-Abstand, Datumsform, Z1-Text, Schwimm-Schätzung, Version der Titel-Regel, «3 Fragen» | alle behoben (Regeltext oder Code), Tests ergänzt |

Ohne Befund geprüft (Auszug): Datumsrechnung über Sommerzeit und Jahreswechsel in allen Zeitzonen, Fenster von aufbau und vergleich, tid-1.0,
zonenvorschlag-1.0, befinden-2.0, wellness-1.0, garmin-export-1.0, Division durch null an allen neuen Stellen.

## B · Wissen und Quellen
Alle 84 Quellen existieren; 83 Angaben korrekt, ein falscher Titel (Rosenblat 2019, korrigiert). Keine Zahl im Text falsch, keine wörtlichen
Übernahmen, keine persönlichen Werte. Korrigiert (wissen-1.4) wurden Formulierungen, die mehr versprechen als die Studien:

| Befund | Massnahme |
|---|---|
| Muñoz 2014 (Läufer): «mehr verbessert», Unterschied aber nicht gesichert | Text und Kern nennen beide Verbesserungen und «nicht gesichert» |
| Tønnessen 2024: Skala hat sechs Zonen; Übertragung %VO2max → Watt/Tempo nicht als eigene Annahme genannt | «sechsstufige Skala», Übertragung als eigene Festlegung |
| Frandsen 2025: Beobachtung als Regel dargestellt | «Zusammenhang», Grenze als eigene Folgerung |
| Ampel: Lastverhältnis 7:28, das die Seite selbst als ungenau einstuft; Nacht-HRV statt Morgenmessung; Grenzen nicht als eigene Festlegung | im Ampel-Text ergänzt (readiness-2.1) |
| Baustein «Schwelle 3 × 15 min» «hebt die Schwelle» ohne Beleg | Wirkung als wenig belegt beschrieben (Stöggl & Sperlich 2014) |
| «Stark für die VO2max» (polarisiert) | «leicht im Vorteil, kleiner Effekt» |
| kleinere Punkte (u. a. Ermüdungsresistenz «trainierbar», Koppeln «Schritt verändert sich», Taper «halbiert», Einheiten statt Zeit, Doppel-Schwelle, Sekundärzitat, Laktat-Messfehler, Population bei 4 × 4) | angepasst bzw. als übliche Praxis oder eigene Festlegung gekennzeichnet |

Neuer Test: Versionsangaben in den Wissenstexten entsprechen dem Code. Nicht prüfbar (Volltext nicht erreichbar): die Trainingsstunden aus
Knechtle et al. 2011.

## C · Datenschutz und Sicherheit
Passwort, Schlüssel, Salz und Token sind nirgends öffentlich; die Daten sind in allen Fassungen sauber verschlüsselt (AES-256-GCM, kein IV
doppelt); `serien/`-Namen gesalzen; die Demo lädt keine echten Daten.

| Nr | Schwere | Befund | Massnahme |
|---|---|---|---|
| H1 | hoch | vollständiges Zonenprofil in zwei hängenden Commits (Force-Push vom 7.11.2026), per SHA öffentlich abrufbar | **offen – Entscheid von Silas** (Support, privat schalten oder neu aufsetzen) |
| H2 | hoch | echte Unterzonen-Beispiele in einem Code-Kommentar und in CLAUDE.md (seit V6.0.1) | durch Platzhalter ersetzt; in der Historie bis zum Entscheid zu H1 |
| H3 | hoch | Testtermine mit Reisebezug in CLAUDE.md, CHANGELOG und einem Test | entfernt bzw. durch erfundene Daten ersetzt; Historie wie H2 |
| M1 | mittel | heute ersetzter Commit mit Laufdistanzen per SHA abrufbar | wie H1 |
| M2, M3 | mittel | echte Aktivitäts-ID und echter FTP-Wert in Tests | durch erfundene Werte ersetzt |
| M4–M6 | mittel | Schlüssel im Browser-Speicher ohne Abmelden, Klartextreste auf dem Gerät, gemeinsamer Ursprung aller Pages-Seiten des Kontos; Fremdskripte ohne SRI, keine CSP, JSONP-Rückfall; Schreibschlüssel für den veröffentlichten Branch | **offen – Vorschläge** in `docs/offen-nach-v55.md` |
| N1–N7 | niedrig | persönlicher Kontext (Rennen, Region), Metadaten, Anfragen an Dritte, Härtung der Verschlüsselung, `.gitignore`, Pages liefert alles aus, Lücken der Selbstprüfung | `.gitignore` erweitert, `data.json` mit Rechten 600, `noindex` gesetzt, **Leck-Prüfung `tools/leck_pruefen.py` vor jedem Push** (findet alle Fälle aus H2, H3, M2, M3 im alten Stand und keinen im neuen); Rest offen |

Lehre: **Ein Force-Push entfernt nichts von GitHub.** Hängende Commits bleiben per SHA abrufbar und ihre SHAs stehen in der öffentlichen
Ereignisliste – echte Werte dürfen gar nicht erst committet werden (Leck-Prüfung).

## D · Oberfläche
Geprüft wurden V6.4.3 und am Schluss V6.4.4 (erster Teil). Keine Programmfehler, kein sichtbares NaN/undefined, alle Blätter und 86 Knöpfe mit
Wirkung, keine Knöpfe nach Garmin oder Enduco. Jeder Befund nachgeprüft (Browser-Skript bzw. Kontrastmessung) und behoben; danach erneut
gemessen: Kontrast überall mindestens 4,5 : 1 (Demo und eigene Daten, dunkel und hell), nichts breiter als der Bildschirm.

| Nr | Schwere | Befund | Massnahme |
|---|---|---|---|
| D1 | hoch | Ampel-Begründung: HRV zugleich «unter» und «im Bereich» der Referenz | positive Gründe nur bei passendem Status; dabei gefunden und behoben: mehrere weit abweichende Tage fielen alle als «Ausreisser» weg (jetzt nur ein einzelner); Test |
| D2 | mittel | Leiste oben zeigte «Körper»/«Schwimmen» nach dem Wechsel nicht | erst ausrichten, wenn die Ansicht sichtbar ist |
| D3 | mittel | Laktat mit eigenen Daten breiter als der Bildschirm (lange Dateinamen) | Umbruch in Listen und Quellenzellen |
| D4 | mittel | Enduco-Stunden derselben Woche an drei Stellen verschieden | überall Schwimmen/Rad/Laufen und Dauer aus den Workout-Schritten; Unterschied «Enduco bekannt» (mit Uhr-Workouts) erklärt |
| D5 | mittel | zwei Vorschläge derselben Woche mit anderer Aufteilung und Summe | Wochenstunden-Vorschlag teilt nach aufteilung-1.0; Rest der Rundung wird gemeldet; Test |
| D6 | mittel | Ring «Belastung» abends «0 % · Ruhetag», bevor die Einheiten da sind | Tag ohne eingespielte Einheiten = «noch offen» (`FK.aktivitaetenBis`); Test |
| D7 | mittel | Warnung in «Train your Gut» hinter «i» versteckt | Erklärtexte mit Warnung oder Status bleiben sichtbar |
| D8 | mittel | hell: Zonenbalken in alten Farben | Zonenfarben auch hell |
| D9 | mittel | Text mit zu wenig Kontrast (bis 1,8 : 1) | Farben angepasst, vergangene Tage ohne Abdunkeln; nachgemessen |
| D10 | niedrig | Sprungziele unter der Leiste oben | Abstand für Sprungziele |
| D11 | niedrig | «nicht verglichen», Tabelle zeigte trotzdem Summen | Enduco-Werte als «mind.» mit Hinweis |
| D12 | niedrig | Unterschiede ohne Zeitfenster | Fenster in jedem Unterschied; Test |
| D13 | niedrig | «Fitness» im Ring und in den Kennzahlen verschieden | Ring beschriftet «(Vortag)» |
| D14 | niedrig | absolvierte Stunden derselben Woche verschieden | Plan zählt Schwimmen/Rad/Laufen (beschriftet); Heute und Kalender zählen alle Sportarten (im Hinweis genannt) |
| D15 | niedrig | Explorer: zwei Dauern, Ø Leistung weicht ab | «Dauer (von–bis)», «Bewegungszeit», Ø Leistung «aus 2-s-Werten» |
| D16 | niedrig | «Lernbausteine im Verlauf» bleibt leer | ausgeblendet wie der Technik-Coach (Daten bleiben) |
| D17 | niedrig | Testpunkt im Kalender wie Fokus Z5 | Test als Ring |
| D18 | niedrig | hell: andere Phasenfarben im Wochenstunden-Vorschlag | Phasenfarben des Plans |
| D19 | niedrig | Beschriftung der Grafik 6–7 px | Grafik in Kartenbreite, Rennnamen ohne Überlappung |
| D20 | niedrig | LT1/LT2 und Zonengrenzen überlappen | Beschriftungen gestaffelt |
| D21 | niedrig | Kalendertage nicht mit der Tastatur | Enter und Leertaste |
| D22 | niedrig | Blätter ohne Fokusfalle, keine h1 | Hintergrund «inert», Fokus zurück, Seitentitel h1 |
| D23 | niedrig | Demo: «seit –» | Text ohne Platzhalter |
| D24 | niedrig | Aktivitätsname ohne «Ü» (so aus Zwift/Garmin geliefert) | kein Fehler der Seite; **offen** in `docs/offen-nach-v55.md` |
| D25, D26 | niedrig | «3 kurze Fragen»; zwei Stufentests am selben Tag | im ersten Teil behoben (Check-in-Texte; B4–B6) |

Nicht geprüft: produktive Seite, Kartenkacheln, BRouter, Open-Meteo, swisstopo, «Direkt speichern» (Netz gesperrt bzw. mit echten Daten
ausgeschlossen); Safari/iOS selbst und VoiceOver.

## Teststand nach den Massnahmen
- Abnahmetests: `test_formkurve` 63, `test_route` 44, `test_analyse` 14, `test_training` 25, `test_v59` 12, `test_v6` 10, `test_v61` 7,
  `test_v62` 14, `test_v64` 38 – alle bestanden; `test_tools.py` alle bestanden; `make_demo.py` ausgeführt.
- Leck-Prüfung: bestanden.
- Browser (lokal): Demo und eigene Daten, 390 px – Heute, Plan (Phasen mit «Woche x von y», Woche nach Modell, Vergleich, letzte Woche,
  Verlauf, Aufbau-Check, Testkalender), Ampel-Prüfung, Kalender, Wissen; ohne Programmfehler, nichts zu breit. «Woche x von y» zusätzlich mit
  gestellter Uhr (März 2027) geprüft. Nach Teil D: Leiste oben, Ring vor dem Nacht-Update (Uhr 20:30), Ampel-Gründe, Warnung in «Train your Gut»,
  Sprungziele, Kalender mit Tastatur, Blätter (inert, Fokus zurück), Kontrast dunkel und hell – Demo und eigene Daten.
