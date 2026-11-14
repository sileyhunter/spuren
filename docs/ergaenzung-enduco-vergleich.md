# Ergänzung zum Auftrag Etappen 6–8: Vergleich mit enduco (Review vom 13.11.2026, Stand V6.5)

Geprüft: die Seite auf `main` (V6.5 inkl. `docs/auftrag-etappen-6-8.md`) mit echten Daten auf 390 px, verglichen mit den
enduco-Bildern 0–7 der Layout-Vorlage. Bildschirmfotos mit echten Daten liegen nicht im Repository.
Gebaut wird erst nach Silas' Okay; es gelten die Regeln aus `CLAUDE.md` und «Was immer gilt» im Auftrag 6–8.

## A. Schon im Auftrag 6–8 – nicht doppelt aufnehmen
Tagesblatt (6.1), Wochenansicht mit den Tagen untereinander (6.2), Training hinzufügen mit Kategorien, Vorlagen und Dauer-Regler (6.3,
Bilder 2 und 4), Tag sperren (6.3), TL ≈ und Distanz ≈ geplanter Einheiten (6.4), Wochenblatt mit Belastung 1–3 (6.5), «Je Sportart» (6.6),
Testkalender bearbeiten (8.2), Übungsblatt Schwimmen (8.5), Export auf die Uhr (E3).

## B. Befunde aus dem Vergleich
- **Seitenlängen auf dem iPhone (390 × 844):** Analyse → Fortschritt ≈ 17 Bildschirme, Laktat ≈ 17, Ausdauer ≥ 19, Plan ≈ 13, Heute ≈ 5.
  enduco: Heute ≈ 2 Bildschirme, Analyse = 3 Kurzkarten mit Detailseiten.
- **Doppelt auf Heute:** die Ampel steht dreimal (Kachel, Karte «Heute», «Tagesbereitschaft»), Fitness/Ermüdung/Form zweimal,
  «Rennen» auch unter Plan.
- **Lange Listen:** «Geplant gegenüber absolviert» im Kalender ≈ 3,5 Bildschirme, Testkalender ≈ 3.
- **Heute und Kalender zeigen nur Enduco:** Der Vorschlag («Woche nach Modell») und die Wahl «Ich folge» erscheinen nur unter Plan.

## C. Neu vorgeschlagen (nach Nutzen)
1. **Analyse als Übersicht mit Detailseiten (Bild 6).** Oben 3–4 Kurzkarten: Monitoring (Fitness, Ermüdung, Form mit Mini-Verlauf),
   Intensitätszonen (Segmentbalken mit Prozent), Workout-Historie (4 Wochen als Kalender mit Sport-Symbolen und Zonen-Punkten),
   Trainingsstatus. Jede öffnet eine Detailseite mit Zeitraum 1M · 3M · 6M · 1J und ‹ Letzte 30 Tage ›. Sportfilter Alle · Schwimmen ·
   Rad · Laufen. Die bestehenden Karten wandern in die Detailseiten; nichts geht verloren.
2. **Trainingsstatus im Verlauf:** Tage je Status im Zeitraum (Anzahl und Prozent, Bänder aus `status-1.0`) und Verlauf mit Band.
   Kennzahlen mit Veränderung zum Vortag bzw. zur Vorwoche (z. B. «91 +3»), auch im Blatt «Optionen für heute».
3. **Heute entschlacken (Bilder 1 und 2):** Heute = Kacheln, Begrüssung, Heutiges Training, Diese Woche. Datenqualität,
   Tagesbereitschaft, Bereitschaft im Verlauf, Gefühl und Morgenwerte und die Garmin-Werte ins Ampel-Blatt bzw. Analyse → Körper/Erholung;
   «Rennen» nur unter Plan. «Heutiges Training» zeigt den Plan, dem Silas folgt (Enduco, Vorschlag bzw. Mein Plan), gekennzeichnet.
   Karten kompakter: Kennzahlen in einer Zeile («40 min · ≈ 6,9 km · ≈ 26 TL»), damit zwei Einheiten auf einen Bildschirm passen.
4. **Trainingsverfügbarkeit je Tag (Bild 7):** in den Einstellungen je Wochentag Sportart(en) und Stunden mit Regler («kein Training»
   bis z. B. 5 h). Der Wochenvorschlag verteilt danach statt nach dem festen Muster von `wochenplan-1.2`. Dazu im Blatt «Optionen für heute»
   ein Regler «heute nur …» mit Sportart, der den Vorschlag des Tages kürzt oder verlängert (Ein- und Ausfahren bleiben).
5. **Plan über die ganze Saison (Bild 5):** Wochenübersicht bis zum Hauptrennen (alle Wochen; geplant aus `saison-1.2` bzw. Mein Plan,
   absolviert; Rennen als Fahnen, Phasen auf der Achse) und darüber Ø Woche (Stunden, TL je Sportart). Phasen-Zeitstrahl mit den
   vergangenen Phasen und einer Erholungsphase nach jedem Rennen. In «Diese Woche»: «Woche x von y» bis zum Hauptrennen.
6. **Renn-Blatt mit Zielzeit und Wettkampfpace (Bild 5, Wunsch vom 13.11.):** Rennen antippen → Format (70.3 / Langdistanz),
   Gesamtdistanz, Höhenmeter (nur wenn eingetragen), Etappen mit erwarteter Zeit und TL ≈, **gewünschte Zielzeit** (Eingabe, verschlüsselt)
   und die **Wettkampfpace** je Disziplin mit offener Herleitung (CSS, LT1/LT2, lange Einheiten, Ermüdungsresistenz, Koppelläufe),
   Bandbreite und Quellen; die Zielzeit daneben, nicht als Vorgabe.
7. **Einheit-Blatt vervollständigen (Bild 3):** Hilfsmittel als Chips (Paddles, Brett, Flossen – stehen schon in den Schritten als
   `equipment_type`), Schwimmlage (`stroke_type`), Bahnen («150 m · 3 Bahnen» aus der Beckenlänge), «Pause am Beckenrand»; Achse unter der
   Zonenskala (Ruhepuls · Schwelle · max HF); «i» an den Fokus-Chips → passendes Wissen-Kapitel; Raster und Zeitmarken im Ablauf;
   ist die Einheit gelaufen: Haken, «% im Ziel» und «Analysieren».
8. **Agenda im Kalender (Bild 4):** je erledigte Einheit das Badge «% im Ziel» (`plan-1.0`) und eine kleine Streckenskizze aus der
   GPS-Spur; am Ende der Woche Wochenkarten: Fitness-Entwicklung, Intensitätsverteilung und Fokus-Intensitäten der Woche. «Geplant gegenüber
   absolviert» geht darin auf (Details über das Badge).
9. **Zonen kompakter (Bild 7):** Umschalter Puls · Leistung · Pace und Sportart statt vier Skalen untereinander; Grenzen als grosse
   Zahlen zwischen den Zonen. Unterzonen wie Anaerob, Neuro, Sprint nur, wenn Silas sie festlegt – nie raten.
10. **Check-in schneller (Bild 1):** enduco steht jede Frage zuerst auf «durchschnittlich», ein Tipp genügt. Bei uns braucht es vier Tipps.
    Vorschlag: Knopf «Alles durchschnittlich» (nichts wird ungefragt vorbelegt; einzelne Fragen danach änderbar).
11. **Bibliothek:** Mini-Profil je Workout in der Liste (wie die Vorlagen bei enduco); Testkalender als kompakte Zeitleiste.
12. **Technikfehler → Übungen (Wunsch vom 13.11.):** Fehler auf der Seite auswählen (aus der Video-Auswertung im Chat); Übungsblatt und
    Einheit zeigen, welche Übung welchen Fehler angeht; Vorlagen für Schwimmen (6.3) bauen passende Übungen ein.

## D. Kleine Fehler
- Einheit: «0s ab Zone 3», wenn nichts intensiv ist → ausblenden.
- Schwimmen: 50 m locker zwischen den Serien heisst «Pause» → «locker» bzw. «zurück zum Start».
- Schwimmschritt: Name und Schätzung kleben zusammen («Einschwimmen≈ 2m 34s»).
- Kalender: künftige Wochen zeigen «–», obwohl der Vorschlag Stunden kennt → «≈ 9 h (Vorschlag)».
- (Dauer «≈ 56m» ist schon 0.5 im Auftrag.)

## E. Nicht übernehmen
Streak, Coach-Avatar, Fotos, Artikel- und Tippkarten, Texte, Symbole und Workouts von enduco; «Übertraining» als Status
(eine Diagnose, nicht aus Zahlen ablesbar).
