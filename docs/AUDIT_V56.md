# Audit V5.6 · 8.11.2026

Auftrag: «Weiterentwicklung V5.6 – TrainingPeaks-Funktionen und intelligente Trainingssteuerung». Bestehende Module erweitert,
keine neuen Haupttabs, keine parallelen Systeme. Regeln und Versionen: `CHANGELOG.md` (V5.6). Offene Punkte: `docs/offen-nach-v55.md`.

**Teststand – Begriffe**
- **Code:** im Code vorhanden.
- **Lokal:** lokal getestet – Abnahmetests mit erfundenen Werten (`tests/`), dazu die Seite im Browser in dieser Arbeitsumgebung
  (Chromium, iPhone-Emulation, Breiten 375/390/430 px; echte Daten nur im lokalen Testaufbau, nie im Repository).
- **Produktiv:** auf der veröffentlichten Seite getestet. **Für alle Module: nicht getestet.** Die veröffentlichte Seite ist von dieser
  Arbeitsumgebung aus gesperrt, und es ist kein Browser verbunden. Geprüft ist nur, dass GitHub Pages den Stand veröffentlicht hat.

**Wiederherstellungspunkt:** Git-Tag `v5.5.1-vor-v5.6` (Stand vor V5.6, Seite und Daten). Daten zurück: `git checkout v5.5.1-vor-v5.6 -- data.enc.json`.
Bestehende Werte unverändert: `check_referenz.py` GESAMT bestanden (alle Aktivitäten gleich, alle Schwellen innerhalb der Toleranz);
V5.6 ergänzt je Aktivität nur die neuen Felder `ser`, `wk`, `fr` und die Liste `serien/`.

## 1 · Aktivitäts-Explorer (höchste Priorität)
| | |
|---|---|
| Gab es schon | Karte mit GPS-Spuren, Kalender mit Kennzahlen je Einheit, Zeitbegriffe, Drift und Lauf-Abschnitte als Zahlen; keine Kurven gespeicherter Einheiten |
| Neu | Vollbild über jedem Tab («Analysieren» in Kalender, Karte, Heute): Leistung, Puls, Pace bzw. Tempo, Kadenz, Höhe auf einer Zeitachse; waagrecht wischen markiert, tippen zeigt Werte; Auswahl mit Ø/Max/NP, Puls Anfang → Ende, Drift (nur bei gleichmässiger Belastung), W bzw. m pro Schlag, Höhenmeter; Block A merken und mit B vergleichen; Intervalle und Pausen erkannt, von Hand korrigierbar; Laktat einem Abschnitt zuordnen (bleibt Vorschau); Plan-Zielbereich als Band; «Daten & Methode» |
| Lokal getestet | `test_analyse.cjs`: Entpacken mit Lücken und Einheiten, NP-Referenzwerte, Drift nur bei Gleichmässigkeit, Intervalle, Pausen, Laktat-Zuordnung, Reihe ohne Tempo, Dateiname. Browser: Rad, Lauf, Schwimmen mit Plan; Markieren per Touch-Wischen, Vergleich A/B, Intervall von Hand, Laktat, RPE; fehlende Reihe mit Meldung; Stichprobe aus allen Sportarten, Jahren, drinnen/draussen: alle mit Kurven ausser einer manuell erfassten Einheit (Meldung), keine Seitenfehler; Demo mit erfundener Reihe ohne Zugriff auf `serien/`; kein Überlauf bei 375/390/430 px |
| Einschränkungen | Reihen sind 2-s-Mittel (nicht jede Sekunde); Entpacken braucht Safari ab iOS 16.4; echtes iPhone nicht getestet; im Becken meist nur Puls (Bahnen gespeichert, noch nicht gezeichnet); neue Aktivitäten erhalten ihre Reihe mit dem Monatsexport (Nacht-Update darf `serien/` derzeit nicht committen) |
| Datenschutz | `serien/<Name>.bin` mit dem Seitenschlüssel verschlüsselt (AES-GCM); Name aus einem Zufallswert, der nur verschlüsselt in den Daten steht – keine Garmin-/Zwift-IDs öffentlich. Sichtbar bleiben Anzahl und Grösse der Dateien |

## 2 · Geplant gegenüber absolviert (Enduco)
| | |
|---|---|
| Gab es schon | Einträge aus dem Garmin-Kalender im Kalender («Plan: …») |
| Neu | je Workout-Schritt Plan, Ist, Zielbereich, Ø Ist, Anteil im Ziel, Puls; Plandauer bzw. geplante Distanz; «gleiche Einheit früher»; Tabelle im Kalender, Detail im Explorer |
| Nachweis Enduco | Enduco-Workouts erscheinen in der Garmin-Workoutliste mit Anbieter «Enduco» (geprüft 8.11.2026; daneben wenige von TrainingPeaks und ohne Anbieter) und laufen auf der Uhr; die FIT-Datei enthält dann `workout`/`workout_step`. **Keine direkte Enduco-Schnittstelle**, nichts wird an Enduco oder Garmin geschrieben. Welcher Dienst ein Workout erstellt hat, steht nicht in der FIT-Datei |
| Lokal getestet | `test_tools.py`: Gesamtdauer mit Wiederholungen, Plandauer «offen» bei Distanzschritten, Watt-Lesart, Anteil im Ziel, Rohwerte der Garmin-Verbindung, Rundenende bei falschem Zeitstempel, Lauf mit Tempoziel. Echte Daten: alle Einheiten mit Workout auf der Uhr abgeglichen (Rad, Lauf, Schwimmen); zwei Einheiten von Hand auf Plausibilität geprüft |
| Einschränkungen | Zwift-Dateien ohne Workout-Schritte → kein Plan; nicht ausgeführte Workouts nur, wenn sie im Garmin-Kalender stehen (dort spärlich); Leistungsziele ≤ 1000 sind nach FIT-Norm % FTP, Enduco schreibt Watt – je Workout nach der gefahrenen Leistung entschieden und angezeigt |

## 3 · Saisonplanung Ironman Hamburg 2027
| | |
|---|---|
| Gab es schon | Rennen in den Daten (Hamburg, Jesolo), Jahresziele, Testkalender |
| Neu | Phasen rückwärts ab Hamburg (Grundlage, Aufbau, wettkampfspezifisch, Taper), Jesolo als B-Rennen mit Mini-Taper und Erholungswoche, Erholung jede 4. Woche; Vorschlag der Wochenstunden aus den eigenen Wochen (änderbar, nur auf dem Gerät); Ist je Woche, Enduco-Stunden aus dem Garmin-Kalender, lange Einheiten und Koppel je Woche, Aufteilung nach dem eigenen Verhältnis |
| Lokal getestet | `test_analyse.cjs`: Phasen, Taper, B-Rennen, Erholungsrhythmus; Browser: Grafik und Tabelle bei 375–430 px |
| Einschränkungen | Entscheidungshilfe, keine Vorgabe; überschreibt Enduco nie; Vorschlag ist eine einfache Regel (linearer Anstieg), keine Belastungssteuerung |

## 4 · Ermüdungsresistenz und aerobe Entwicklung
| | |
|---|---|
| Gab es schon | gleichmässige 10-min-Blöcke `eb` und Urteil `entwicklung-1.0`, Drift je Einheit, Lauf-Abschnitte, Langfahrt-Orientierung |
| Neu | je lange Einheit Puls früh gegen spät bei gleicher Leistung bzw. Pace, beste 20 min ab Stunde 2/3/4/5 als Anteil der frischen; Tabelle (Ausdauer) mit Wetter bzw. Rolle; in «Meine Entwicklung» vier neue Metriken mit derselben Urteilsregel |
| Vergleichbarkeit | beide Blöcke aus derselben Einheit (Tagesform und Leistungsmesser fallen weitgehend heraus); Rolle und draussen getrennt; Temperatur angezeigt; ohne genug Messungen «nicht beurteilbar» statt einer Zahl |
| Lokal getestet | `test_tools.py` (Blöcke früh/spät, beste 20 min), Browser (Tabelle, «Meine Entwicklung»). Mit den vorhandenen Daten sind die neuen Metriken überwiegend «nicht beurteilbar» – zu wenig vergleichbare lange Einheiten je Zeitraum |
| Einschränkungen | Nahrung, Gelände und Hitze sind nicht herausgerechnet; Laktat bei vergleichbarer Leistung zählt erst bestätigt (B1) |

## 5 · Automatischer Fortschrittsbericht
| | |
|---|---|
| Gab es schon | «Meine Entwicklung» mit Antworten aus `entwicklung-1.0` |
| Neu | je Aussage Deutung («spricht bei vergleichbaren Bedingungen für …») und Zuverlässigkeit (n, Intervall, vorläufig); «stabil» heisst ausdrücklich «keine klare Veränderung nachweisbar» |
| Lokal getestet | `test_formkurve.cjs` (Urteil, Antworten), Browser |
| Einschränkungen | regelbasiert, keine freie Textdeutung; nur so gut wie die Zahl vergleichbarer Messungen |

## 6 · RPE, Befinden und Readiness
| | |
|---|---|
| Gab es schon | Bereitschaft aus HRV, Ruhepuls und Schlaf; Befinden je Tag |
| Neu | je Einheit RPE 1–10 (Borg CR-10), Gefühl, muskuläre Ermüdung, Bereich, Notiz; sRPE; Liste der letzten Einheiten in Heute; Kalibrierung mit Morgenwerten ab 20 Paaren (Rangkorrelation mit n, keine Prozentwerte) |
| Lokal getestet | Speichern im Browser (verschlüsselt auf dem Gerät), Export-Schlüssel, Übernahme mit `merge_daily.py` (`test_tools.py`) |
| Einschränkungen | Kalibrierung zeigt einen Zusammenhang, keine Ursache; Last der Einheit nicht herausgerechnet |

## 7 · Ernährung und Energie
| | |
|---|---|
| Gab es schon | Fueling-Protokoll, Train your Gut, geprüfte Garmin/FIT-Quellen (A15): keine Einnahmen während Einheiten in den Daten |
| Neu | Tabelle je lange Einheit: aufgenommen (nur Protokoll, sonst «nicht protokolliert»), Verbrauch geschätzt (Rad aus der Leistung, Wirkungsgrad als Annahme), KH-Verbrauch als Modell je Garmin-Pulszone, allgemeiner Richtwert (Jeukendrup 2014) |
| Lokal getestet | `test_analyse.cjs` (Energie aus Leistung, unbekannt ohne Leistung), Browser |
| Einschränkungen | ohne Leistung (Laufen) Verbrauch unbekannt; KH-Anteile sind allgemeine Physiologie, keine persönliche Messung; keine Gelmengen, keine Stoffwechselwerte erfunden |

## 8 · Design
Helles Design beibehalten; Karten in Heute, Kalender, Fortschritt und Ausdauer; Details unter «Daten & Methode»; Grafiken als Canvas bzw. SVG
in voller Breite; Tabellen mit Wischhinweis. Lokal geprüft bei 375/390/430 px (kein waagrechter Überlauf, keine zu kleinen Tippziele).
Auf dem iPhone nicht geprüft.

## 9 · Qualitätssicherung
- Abnahmetests: `test_analyse.cjs` 12, `test_tools.py` 60 Prüfungen, `test_formkurve.cjs` 53, `test_route.cjs` 28 – alle bestanden.
- `check_referenz.py`: GESAMT bestanden. Nacht-Weg geprüft: für die neusten Aktivitäten über die Garmin-Verbindung nachgerechnet –
  alle übrigen Kennzahlen gleich wie gespeichert (nichts überschrieben).
- Fehlende oder fehlerhafte Garmin-Daten: manuell erfasste Einheit ohne Sekundenwerte → Meldung; Workout ohne Zeit je Schritt →
  «Dauer offen»; Reihe ohne Tempo → kein Tempokanal; Runden mit falschem Zeitstempel → Ende aus verstrichener Zeit.
- Gefunden und vor der Veröffentlichung behoben: Explorer bei Reihen ohne Tempo, Plan bei Läufen/Schwimmen von der Uhr, Plandauer als
  Teilsumme, Richtwert für 1–2 h (siehe `CHANGELOG.md`).
