# V7 – Bestandsaufnahme und Zuordnung der Enduco-Vorlage (14.11.2026)

Grundlage: Silas' Auftrag «Masterprompt V7» (Enduco als Vorbild für Aufbau, Übersicht und Bedienung) und 246 Bildschirmfotos der
Enduco-App (Bildfolge IMG_9603 … IMG_9849, hier als Nr. 1–246). Die Bilder und die PDF liegen **nicht** im Repository.
Übernommen werden Aufbau, Bedienlogik und visuelle Hierarchie – keine Texte, Logos, Fotos, Symbole oder Workouts von Enduco.

## Zuordnung Vorlage → Ironman Notebook

| Enduco (Nr.) | Was die Vorlage zeigt | Ironman Notebook vor V7 | V7 |
|---|---|---|---|
| Home (1, 35, 44, 62) | 3 Status-Kacheln, Gruss mit Check-in, «Heutiges Training» mit Balkenprofil, Wochenkarte | Heute (V6.0.1) mit denselben Teilen, darunter 8 weitere Karten; Einheiten aus dem Garmin-Kalender (= Enduco), «Neu von Enduco» | Heute nur noch Kacheln, Gruss, Heutiges Training (Mein Plan + erledigt), Woche; Rest unter Analyse → Belastung und Erholung |
| Check-in (2, 152–156) | 4 Regler, Verlauf je Frage | Check-in befinden-2.0 (V6.3) | bleibt |
| Optionen/Tag (3, 44, 65) | Kennzahlen, Training hinzufügen, Tag sperren | «Optionen für heute», Tagesblatt mit Mein Plan (V6.6) | bleibt |
| Training planen (4–34, 37–38) | Sportart → Trainingsart → Vorlage mit Balkenprofil → Dauer | «Training hinzufügen» (vorlagen-1.0) | Etappe 2 (Ablauf in Schritten) |
| Eigene Aktivität (40–43) | Titel, Datum, Zeit, Wiederholen, Dauer, RPE | Mein Plan: hinzufügen, ändern, verschieben | Etappe 2 (Wiederholen, Uhrzeit) |
| Trainingsbriefing (45–61) | Fokus-Intensitäten, Ablauf, Schritte mit Zonen-Chips, Zeit je Zone | Einheit-Blatt (V6.0.1) | bleibt |
| Kalender (39, 63–67) | Woche als Liste, 2-Wochen-Raster, Wochenauswertung (Umfang, Fitness, Verteilung) | kalender-2.0 mit Enduco-Zeilen und langer Liste «Geplant gegenüber absolviert» | kalender-3.0: nur Garmin + Mein Plan, Wochenauswertung grafisch; Enduco-Einzelvergleich ins Labor |
| Plan (68–69, 119–127) | Rennkarte, Ist vs. Plan, Diese Woche, Phasen, Saison als gestapelte Balken, Phase mit Wochen | Rennen, Phasen, Wochenübersicht, Woche nach Modell mit Enduco je Tag, Bibliothek | Übersichtskarte oben, Phasen, Saison; Plan-Werkzeuge als Unteransichten; Enduco-Teile ins Labor |
| Planeinstellungen (70–79) | Verfügbarkeit je Wochentag, lange Einheiten, Mindestdauer, Tests | Tests (testplan-1.0); Verfügbarkeit fehlt | Etappe 2 |
| Urlaub, Lager, Rennen (80–104) | Abwesenheiten, Rennen mit Etappen | Rennen; Abwesenheiten nur für Tests | Etappe 2 |
| Analyse (128–136, 148–151, 163–169) | Karten Trainingsdaten, Status, Check-in, Monitoring, Zonen, Historie; 1M/3M/6M/1J; Sportfilter | 6 Unterleisten (Fortschritt, Laktat, Ausdauer, Leistung, Körper, Schwimmen) mit je vielen Karten | Analyse-Start mit Karten, jede öffnet eine eigene Ansicht |
| Zonen (171–190) | Sportart, Metrik, Zonenskala, Zonen mit Grenzen und Unterzonen | Laktat & Zonen (alle vier Skalen) | bleibt unter Laktat und Schwellen |
| Profil/Einstellungen (170, 234–246) | Gruppen, Darstellung, Einheiten, Rechtliches | Einstellungen (Direkt speichern, Verlauf, Bedienung, ausgeblendete Karten) | gruppiert, mit Labor/Expertenbereich |
| Artikel (137–147, 157–162, 191–233) | Blogtexte | eigenes «Wissen» mit Quellen | nicht übernommen |

## Sichtbares Enduco vor V7
Heute (Heutiges Training aus dem Garmin-Kalender, «Neu von Enduco», Wochenleiste «geplant»), Kalender (Zeilen «Enduco», Symbole im Monat,
Tagesblatt, Karte «Geplant gegenüber absolviert»), Plan («Woche nach Modell» mit Enduco je Tag und «Ich folge», «Vorschlag und Enduco über die
Wochen», Unterleiste «Bibliothek»). Die Daten (`planned`, `workouts_neu`, `enduco_bib`, `wk`) bleiben in V7 vollständig erhalten.

## Muss erhalten bleiben
Garmin-Daten seit 2020 mit Sekundenreihen, Laktat und Schwellen, Zonenprofile mit Freigabe, CSS-Tests, Check-in, Trainingslast last-2.1,
Routenplaner und Karte, Eingang «Direkt speichern», Verschlüsselung, alle Tests und Prüfungen.
