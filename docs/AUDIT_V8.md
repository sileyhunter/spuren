# Prüfung V8.0 · 18.11.2026 · Modelle, Szenarien A–H, Datenschutz

Etappe V8.0 des Auftrags «Masterprompt V8» (Abschnitt 14 und 15.1–15.2), von Silas am 18.11.2026 freigegeben. Geprüft wurden alle verbundenen
Modelle auf Bezugsgrössen, doppelte Rechnungen und Widersprüche – mit echten Daten über ein Jahr (Zahlen nur im Chat, nie hier) und mit einem
Simulator über mehrere Wochen (erfundene Daten). Fehler ohne Regeländerung sind behoben; alles andere steht unten mit der Etappe, die es löst.

## Werkzeuge

- **Simulator** `tests/sim/` (umgebung, seite, athlet, lauf): lädt die echten Module der Seite ohne Browser (leeres DOM, eigene Uhr) und spielt Tag für Tag:
  Morgenwerte und Check-in → Seite öffnen (Ampel speichert ihren Entscheid) → Plan des Tages, wie er gilt (`V64UI.kontextFuer`: Mein Plan, Verteilung, Kraft,
  Ampel-Schicht) → Ausführung durch einen erfundenen Athleten (Last je Abschnitt, Morgenwerte leicht nach der Last des Vortags). Szenarien greifen über Haken ein.
- **Abnahmetests** `tests/test_v80.cjs`: A–H als Szenarien und ein Lauf über acht Wochen. Was erst eine spätere Etappe bringt, steht als «todo» mit der Etappe
  (läuft mit, zählt nicht als Fehler).
- **Prüfung mit echten Daten** `tools/pruefung_v8.cjs work/data.json`: Datenbasis, doppelte Aktivitäten, Bezugsgrössen, zwei Lastverhältnisse, Ampel,
  Fitness voraus, Kraft und Garmin-Kalender, Regeln im Plan der nächsten vier Wochen. Gibt nur Zusammenfassungen aus; die Zahlen gehören in den Chat.

## Abnahmetests A–H

| Test | erfüllt (geprüft) | offen (todo, Etappe) |
|---|---|---|
| A Harte Einheit, Erholung schlechter | A1 zwei schlechte Morgen → spätestens am zweiten «vorsichtig», dann nichts Hartes, nichts länger; A2 Check-in «Beine 6/7» → sofort | A3 nach einem einzigen schlechten Morgen die nächsten Tage mit Grund prüfen (V8.3) |
| B 45 statt 120 min | B1 Samstag: Tag passt, Woche neu verteilt, Verschiebung genannt, keine Minuten dazu; B2 Donnerstag: Tag passt, beide harten Einheiten bleiben | B3 Kurzfassung derselben Sportart, keine zwei langen Einheiten an einem Tag (V8.3) |
| C Mehrere Tage sehr gut erholt | C1 Ampel meist «bereit», nichts länger oder härter; C2 vier Wochen: Plan wie ohne gute Erholung, Anstieg höchstens 10 % je Woche | – |
| D Einheit härter als geplant | D1 die Ampel rechnet am nächsten Morgen mit der tatsächlichen Last | D2 Abweichung geplant/absolviert je Einheit (V8.1); D3 folgende Einheiten neu prüfen (V8.3) |
| E Einheiten ausgelassen | E1 nichts nachgeholt, Rest der Woche und nächste Woche ohne zusätzliche Minuten | E2 von der Ampel gelockerte Schlüsseleinheit nur als Vorschlag nachholen (V8.3) |
| F Andere Auswahl, gleicher Reiz | F1 gleiche harte Einheiten je Sportart in jeder Belastungswoche | F2 andere Form desselben Reizes von Woche zu Woche (V8.4) |
| G Gesperrte Einheit | Einheit und Tag gesperrt; danach Verfügbarkeit 30 min + «Woche anpassen», «Neu berechnen», Ampel «vorsichtig», Krafttraining: unverändert | – |
| H Ohne neue Garmin-Daten | H1 Plan steht weiter, Ampel «nicht beurteilbar» mit den fehlenden Werten | H2 fehlende Daten nicht als Ruhetage (V8.3); H3 Datenstand durchgängig auf Heute (V8.6) |
| Zusammenwirken (8 Wochen) | Kraft, lange Tage, Krankheit, Lücken, Sperren, Verfügbarkeit 0 min: nie härter oder länger, Krank = Ruhetag, gesperrt bleibt, kein harter Rad- oder Lauftag nach Kraft, Kraft nie in der Last, Steigerung höchstens 10 % | – |

## Befunde

1. **Zwei LT2 für die Rad-Last.** TL ≈ geplant (tl-plan-1.0) rechnet mit dem Beginn von Z4 des aktiven Zonenprofils, die absolvierte Last auf der Rolle
   (last-2.1) mit der LT2 aus `config.last_ref` (älterer, vorläufiger Test). Der Unterschied geht im Quadrat in die Last ein. → V8.1 (eine Bezugsgrösse je
   System, Regeländerung, nur mit Silas' Okay).
2. **Geplante Last unterschätzt die absolvierte bei Grundlage.** Grundlagen-Einheiten (Ø-Puls in Z2 des Profils) haben eine höhere absolvierte Last pro Stunde
   als TL ≈ einer Z2-Einheit – Rad drinnen, Rad draussen (nach Puls) und Laufen. Schwimmen: ohne CSS-Test hat TL ≈ keinen Bezugswert. → V8.1 (geplant und
   absolviert kalibrieren).
3. **Zwei Lastverhältnisse.** Die Ampel (7 gegen 28 Tage je Woche, dazu 3 Tage gegen üblich) und der Trainingsstatus (Ermüdung ÷ Fitness) markieren
   grösstenteils verschiedene Tage als «hoch», obwohl sie stark zusammenhängen. → V8.1 (angleichen oder klar getrennt benennen).
4. **Einzelner schlechter Morgen.** Ein einzelner tiefer HRV-Wert zählt nicht in den 7-Tage-Schnitt (Ausreisser-Regel), der Ruhepuls zählt über 3 Tage: nach
   einem einzigen schlechten Morgen bleibt die Ampel «normal» (Test A3). In den echten Daten kam das einige Male vor, meist ohne «vorsichtig». → V8.3.
5. **Nachlauf des 7-Tage-Schnitts.** Nach zwei schlechten Morgen bleibt die Ampel bis zu fünf Tage «vorsichtig», auch wenn HRV und Ruhepuls wieder im Bereich
   sind (Simulator). In den echten Daten des letzten Jahres kam das nicht vor (der Ruhepuls blieb dort länger erhöht). → V8.2/V8.3 (Verlauf statt nur Schnitt).
6. **Fehlende Garmin-Daten zählen als Ruhetage.** Ohne Nacht-Update sinkt die Basis-Fitness am Montag, die nächste Woche plant weniger (Test H2). → V8.3
   (Datenstand aus `updated`).
7. **Fitness voraus, Naht nach drei Wochen.** Die Steigerung rechnet für dieselbe Woche etwas mehr Last als Mein Plan; an der Naht entsteht ein kleiner Knick
   nach oben (Befund 2 wirkt mit). → V8.1.
8. **Ampel holt von selbst nach** (ampel-plan-1.0, Test E2). → V8.3 als Vorschlag.
9. **Knappe Zeit an einem Tag.** «Woche anpassen» legt die lange Ausfahrt zum langen Lauf auf denselben Tag (zwei lange Einheiten an Land, Gewicht −50) und
   füllt den knappen Tag mit einer anderen Einheit; eine Kurzfassung derselben Sportart gibt es nicht (Test B3). → V8.3.
10. **Harte Einheiten an Land an zwei Tagen hintereinander** sind nach einer Verschiebung möglich (Gewicht −20 je Seite), z. B. wenn ein Tag nur Schwimmen
    erlaubt. Im Plan der nächsten Wochen einmal. → Frage an Silas, V8.3.
11. **Schlüsseleinheiten je Modell fest** (Test F2). → V8.4.
12. **Einheit härter als geplant** wird nicht erkannt (Test D2, D3). → V8.1, V8.3.
13. **Wochensummen im Kalender (behoben).** Der Wochenkopf der Liste rechnete mit der Timer-Zeit, Wochenauswertung, Plan-Übersicht und Planvergleich mit der
    Bewegungszeit; der Monat zählte alle Sportarten und das Krafttraining in Stunden und TL. Jetzt überall: Stunden nur Schwimmen, Rad, Laufen als
    Bewegungszeit (zeit-1.1), TL ohne Krafttraining (pmc-2.1), Mein Plan im Monat ebenso. Test in `tests/test_v80.cjs`, im Browser an der Demo verglichen.
14. **Gefühl-Kalibrierung** (`V59L.gefuehlKalibrierung`) nimmt die Last des Vortags mit Krafttraining – passt nicht zu pmc-2.1; ohne Check-ins derzeit ohne
    Wirkung. → V8.1 (Krafttraining als eigene Last).
15. **Check-in noch nie gespeichert:** die Ampel rechnet nur mit Garmin-Werten. → Hinweis in V8.1.
16. **Mehrere Rechnungen für Wochenstunden** (V7.wochenUmfang, AN.wochenIst, Wochenkopf, Wochenauswertung, Monat, V56): jetzt mit gleicher Definition, aber
    getrennt gerechnet. → V8.1 (eine gemeinsame Funktion).
17. **Datenschutz:** Leck-Prüfung, Reihen, Bilder und Eingang bestanden. Die alten Reihen (SPS1) zeigen ihre genaue Grösse; das steht ohnehin in der
    Git-Historie (bekannt).
18. **Mobil:** 22 Ansichten der Demo bei 390 px ohne horizontales Überlaufen und ohne Seitenfehler (Diagramme dabei nicht gezeichnet).
19. **Doppelte Aktivitäten:** keine überlappenden Paare gleicher Sportart im letzten Jahr. Garmin-Kalender: noch keine eigenen Einträge («IN · »).
    Krafttraining: keine Einheit in Fitness oder Ermüdung gezählt.
20. **Plan der nächsten vier Wochen (echte Einstellungen):** keine Überschreitung der Verfügbarkeit, kein harter Rad- oder Lauftag nach dem Krafttraining,
    keine harte und lange Einheit an Land am selben Tag, jede Einheit mit TL ≈. Simulator mit den echten Daten über drei Wochen: keine Regelverletzung,
    keine Fehler in den Modulen.

## Stand nach V8.1 (18.11.2026)
- Befunde 1, 2 und 7: TL ≈ rechnet mit denselben Bezugsgrössen wie die absolvierte Last (tl-plan-1.1). Nachprüfung mit `tools/pruefung_v8.cjs` (Abschnitt 3 zeigt beide
  Fassungen): Grundlage Rad drinnen, Rad draussen und Laufen jetzt nahe 1 (vorher deutlich darüber); Schwimmen gegen alle Schwimmeinheiten nahe 1. Abschnitt 6: Mein Plan
  und Steigerung je Woche nahe beieinander, die Naht nach drei Wochen ist klein.
- Befund 3: bewusst zwei Zahlen – die Ampel (7 gegen 28 Tage) und der Trainingsstatus (Ermüdung ÷ Fitness) messen Verschiedenes; die Karte «Anstieg der Belastung» zeigt
  beide Blicke nebeneinander, das Wissen erklärt den Unterschied. Eine gemeinsame Lastzahl brachte in der Prüfung keinen Vorteil (die Lastzeichen trennten den Puls in
  den 10-min-Blöcken nicht).
- Befund 10: harte Einheiten an Land nie an zwei Tagen hintereinander (verfuegbarkeit-1.2, kraft-plan-1.2); Test im Simulator über vier Wochen.
- Befund 12: Abweichung je Einheit (last-abweichung-1.0), Test D2 normal. D3 (die folgenden Tage neu prüfen) bleibt V8.3.
- Befund 14: Gefühl-Kalibrierung ohne Krafttraining. Befund 15: Hinweis auf Heute, solange Eingaben nur auf dem Gerät liegen.
- Offen: Befund 16 (Wochenstunden an mehreren Stellen), offene Punkte 105–108.

## Nicht geprüft

- Wie die Fenix Schwimm-Workouts und die lockere Fassung der Ampel zeigt (V8.7, mit Silas).
- Diagramme auf dem iPhone (im Test ersetzt) und Ziehen mit dem Finger (nur im Browser).
- Der Simulator bildet den Körper nur grob ab (Last je Abschnitt, Morgenwerte nach der Last des Vortags); er prüft die Regeln der Seite, nicht die Physiologie.
