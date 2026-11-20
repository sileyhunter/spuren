# Auftrag V9 – Ironman Notebook (Entscheide von Silas, 19.11.2026)

Repo: sileyhunter/spuren. Es gilt CLAUDE.md und «Was immer gilt» aus docs/auftrag-etappen-6-8.md. Passwort nur als SPUREN_PW, nie ins Repo.
**Jede Etappe in einer eigenen Sitzung.** Zu Beginn nur CLAUDE.md und die Dateien lesen, die die Etappe braucht. Jede Etappe: Version, Tests, CHANGELOG,
docs/offen-nach-v55.md nachführen, Push nach bestandenen Tests. Am Ende jeder Etappe kurz melden: was gebaut, was offen, was Silas prüfen soll.
Diesen Auftrag als docs/auftrag-v9.md ins Repo legen.

## Etappe 0 – Anleitung kürzen
CLAUDE.md (170 kB) aufteilen: kurzer Kern (Dateien, Regeln, Prüfen vor dem Push, Datenschutz) max. ~25 kB, Details nach Thema in docs/anleitung/*.md
(Updates, Plan, Karte/Routen, Garmin, Laktat …). Im Kern steht, welche Datei für welches Thema gilt. Keine Regel und keine Freigabe darf verloren gehen:
vorher/nachher Liste aller Versionskennungen (z. B. last-2.1) vergleichen. CHANGELOG: alles vor V7.0 nach docs/changelog-alt.md.

## Etappe 1 – Geplant und absolviert zusammenführen · Heute-Vorschlag
- Kalender, Tagesblatt und Heute: eine absolvierte Aktivität, die zu einer geplanten Einheit passt (gleiche Sportart, gleicher Tag, Zuordnung wie last-abweichung-1.0),
  erscheint als **ein** Eintrag (Name der Aktivität, Haken). Nicht zugeordnete Pläne bleiben sichtbar.
- Auf der Einheit-Seite: «Passt zu: VO2max 30/15 (Mein Plan)» bzw. «Vorschlag der Seite wäre: …» mit Vergleich geplant gegen absolviert.
- Heute-Begrüssung zählt nur noch nicht erledigte Einheiten («Alles erledigt» am Abend).
- **Heute entschlacken – erst ein Bild:** Mockup (390 px, dunkel) mit oben einer klaren Antwort «Was mache ich heute?» (Einheit, Dauer, Ziel, Ampel in einer Zeile), Rest einklappbar.
  Bild an Silas, **bauen erst nach seinem Okay.**

## Etappe 2 – Karte
- **Landeskarte grau** (swisstopo `ch.swisstopo.pixelkarte-grau`) als Grundkarte; **Transparenz-Regler** für die Grundkarte (0–100 %, je Gerät gespeichert), damit Routen und Spuren besser sichtbar sind.
- **Punkt per langem Drücken** (Handy und Maus), Kategorie wie K6 (zuletzt benutzte, sonst «Sonstiges»).
- **Treffer-Blatt** (Gruppen nach Sport und Jahr, «Nur diese auf der Karte») und **Filter-Blatt** mit Reitern Filter · Punkte · Routen, aktive Filter als Chips auf der Karte, Anzahl am Knopf.
- **Wetter MeteoSwiss** über Open-Meteo (`models=meteoswiss_icon_seamless`, bis 5 Tage), Rückfall auf das bisherige Modell; Kurzzeile im Planer.
- **Offline:** MapLibre und Chart.js ins Repo statt CDN; Kartenkacheln entlang gespeicherter Routen und für ein wählbares Gebiet vorladen (Grösse anzeigen, Obergrenze).
  Nutzungsbedingungen von swisstopo zum Speichern prüfen und nennen.

## Etappe 3 – Routenplaner (alte 7.2–7.4)
7.2 GPX zu Garmin (gpx-export-2.0, `upload_course` nur mit ausdrücklichem Ja) · 7.3 Planer übersichtlicher (Zurück, Alle Punkte löschen, Reiter, «Stopps unterwegs», Suche und Ergebniszeile oben) ·
7.4 Trainingsvorschlag auf der Karte antippen, als normale Route bearbeiten, Fortschritt und Abbrechen bei «Training → Route»; Namen 1/2/3, «Hin und zurück».

## Etappe 4 – Karten ausserhalb der Schweiz
Grundkarte wählbar: swisstopo (CH), **OpenTopoMap** (Europa/Welt), **IGN Plan/Topo** (Frankreich, Géoplateforme), **basemap.at** (Österreich); Ebenen **Waymarked Trails** Wandern · Rennrad · MTB.
Italien: beste freie Quelle suchen und vorschlagen. **Mapy** nur, wenn Silas einen eigenen API-Schlüssel anlegt (auf seine Domain beschränkt) – vorher fragen.
Je Dienst Lizenz und Nutzungsgrenzen prüfen und Quelle anzeigen. **Nicht bauen:** Schneehöhen, Skitourenwahl, Lawinenabschätzung (Silas nutzt Skitourenguru).

## Etappe 5 – Etappe 8 aus dem Auftrag vom 13.11.
Intensität Grundlage · Schwelle · VO2max (intensitaet-2.0) · Testkalender auf der Seite bearbeiten inkl. Konfliktprüfung für Stufentests (testplan-1.1, Punkt 90) ·
Laktat-Einzelmessungen ein-/ausblenden · Ausdauertrend nach Jahr/Quartal/Monat (ausdauertrend-1.1).

## Etappe 6 – Schwimm-Workouts auf der Fenix (V8.7)
Je Schritt das **Hilfsmittel** als Garmin-Ausrüstung (Pullbuoy, Paddles, Brett, Flossen) setzen, damit die Uhr das Symbol zeigt. Vor jedem Wechsel des Hilfsmittels eine
**Pause «bis Lap-Taste»** (zählt nicht als Schwimmzeit). An Garmin senden, zurücklesen und prüfen, dass Ausrüstung und Pause ankommen. Ein Test-Workout für morgen an Silas;
er prüft auf der Fenix (Symbole, Pause, Ton vor Streckenende wie bisher).

## Etappe 7 – enduco als Lernquelle (bis April 2027)
Silas exportiert weiter alle enduco-Einheiten nach Garmin; die Bibliothek (V6.5) sammelt sie. Neue Ansicht unter Analyse **«So plant enduco»**: Intensitätsverteilung je Woche und Phase
(polarisiert/pyramidal), Anteil Grundlage · Schwelle · VO2max · Renntempo, Wochenaufbau, Steigerung, Reaktion auf «nicht fit». Übungen (Lauf-ABC, Schwimmtechnik, Sets) aus den
Einheiten als Vorlagen übernehmen (Namen wie dort, Texte eigen). Monatlich kurzer Bericht im Chat.

## Etappe 8 – Entscheide umsetzen (klein, kann mit Etappe 1 laufen)
- **Kein Enddatum für enduco:** `config.enduco_bis` weg; Parallelbetrieb, bis Silas wechselt. Die Seite plant voll mit, Silas überträgt einzelne Einheiten zum Testen nach Garmin.
  Coach-Vorschläge, die nur wegen Abweichung zu enduco entstehen, als «Parallelbetrieb» kennzeichnen.
- **Modell «Automatisch» einschalten** (von Claude entschieden).
- **Verpflegung ohne Glukose/Fruktose-Markierung** (von Claude entschieden): nur g/h Kohlenhydrate – unter 75 min nichts nötig, bis 2,5 h 30–60 g/h, darüber 60–90 g/h
  mit dem Hinweis «über 60 g/h nur mit Gels/Getränken, die Glukose und Fruktose mischen (die meisten)». Markierung entfällt.
- **CSS-Test:** Silas schwimmt diese Woche und trägt ein; der gilt.
- **Laktat-Stufentests:** Vorschlag in der nächsten Erholungswoche (aus Mein Plan und den enduco-Wochen erkennen), Rad und Lauf nicht am selben Tag, an Silas zur Bestätigung.

## Später, eigener Auftrag
Code nach Themen ordnen (55 Skripte v55…v85) und Laden je Ansicht – erst nach Etappe 0–8, mit allen Tests, ohne Verhaltensänderung.

## Modell
Sonnet 5.5 für alle Etappen. Opus nur, wenn eine Etappe zweimal an derselben Stelle scheitert.
