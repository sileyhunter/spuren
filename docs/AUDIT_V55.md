# AUDIT V5.5 · Bestands- und Lückenmatrix

Stand 8.11.2026, vor der Umsetzung. Grundlage: Code (`index.html`, `js/*.js`, `tools/*.py`), Tests, `docs/abnahme-v53.md`,
25 iPhone-Screenshots vom 8.11.2026 (nur Darstellung, keine Rohdatenquelle). Kategorien: **ok** funktioniert ·
**fachlich** fachlich fraglich · **UI** Bedienung/Darstellung · **ungetestet** · **fehlt**.
Personenbezogene Zahlen stehen hier bewusst nicht (öffentliches Repository); Prüfungen mit echten Daten sind im Chatbericht.

| # | Bereich | Befund | Kat. | Codeort | Ursache / Datenquelle |
|---|---|---|---|---|---|
| P0.1 | Fitness/Ermüdung/Form | Form passt nicht zur angezeigten Differenz | fachlich | `index.html` `pmc()` | Form = Fitness **gestern** − Ermüdung **gestern** (Trainingspeaks-Konvention), Fitness/Ermüdung = **heute**; unbeschriftet |
| P0.2 | Zonen «Mache ich das Richtige?» | Rad, Lauf, Schwimmen gemischt; rote Pauschalwarnung 75–80 % / 10–15 % | fachlich, UI | `index.html` `zones()` | Garmin-Pulszonen aller Sportarten addiert; Norm als Diagnose formuliert |
| P0.3 | Koppellauf-Abschnitte | Pace (Balken) und Puls (Linie) auf zwei Achsen überlagert | UI | `js/v5-ausdauer.js` | Kombigrafik; Fenster 35–45 min nicht gesondert markiert |
| P0.4 | Jahresziele/Jahresstatistik | Timer- und Bewegungszeit nebeneinander; Ziel aus Vorjahr | fachlich (prüfen) | `js/v53-extra.js` `goals()` | Bewegungszeit `mv`, Rückfall auf Timer `dur` ohne Hinweis |
| P0.4 | Lauf-Bestleistungen | FIT-Sekunden ≠ offizielle Nettozeit (±1 s) | fachlich | `tools/bestleistungen.py`, `v53-extra.js` | als Bestzeit beschriftet statt «aus FIT (Schätzung)» |
| P0.5 | Puls zu Watt/Pace | ganze Aktivitäten, Geräte gemischt | fachlich | `index.html` Leistung | Ganz-Fahrt-Mittel; kein Vergleich gleichmässiger Blöcke je System |
| P0.5 | Lauf-Effizienz | Einheit «m/min pro Herzschlag» falsch; Ausreisser ohne Zählung | fachlich | `index.html` Leistung | (m/min)/(Schläge/min) = m/Schlag |
| P0.6 | Lange Ausfahrt 5 h | «nicht bestimmbar» korrekt; keine Orientierung | fehlt | `js/formkurve.js` `longRide`, `v5-ausdauer.js` | – |
| P1 | «Meine Entwicklung» | Startseite mit geprüften Aussagen fehlt | fehlt | – | – |
| P1 | Informationshierarchie | lange Karten (Datenbasis, Methoden) im Hauptscroll | UI | alle Tabs | – |
| P1 | Navigation | 9 Tabs, Hinweis auf weitere fehlt | UI | `index.html` `.tabs` | – |
| P1 | Tabellen 375 px | rechts abgeschnitten (Koppelläufe, Jahresstatistik, Datenbasis) | UI | CSS `.t`, `.tablewrap` | – |
| P1 | Jahresziele | drei Ringe brauchen viel Höhe | UI | `v53-extra.js` | – |
| P1 | Leere Grafiken | Train Your Gut zeigt 0–1 g/h-Achse ohne Daten | UI, fachlich | `js/v5-ausdauer.js` | «nicht protokolliert» nicht als eigener Zustand gezeigt |
| P1 | Jahresvergleich | kumulierter Vergleich im gleichen Kalenderzeitraum fehlt | fehlt | `index.html` `yearChart()` | – |
| P1 | Wochenumfang | Segmente ohne Anzahl Einheiten, kein 4-Wochen-Mittel | UI | `index.html` `volume()` | – |
| P1 | Bestleistungen/Radar | lange Tabellen; Radar schwer lesbar | UI | `v53-extra.js` | – |
| P1 | Schwellen-Trend | Protokolle (3 min +40 W / 5 min +20 W) in einer Linie | fachlich | `js/v5-ui.js` | – |
| P1 | Laktat-Einzelwerte | Filter und Messkontext (Blockdauer, Vorbelastung, Gerät) unvollständig | UI | `js/v5-ui.js` | – |
| P1 | Readiness | drei gleich grosse Ringe mit verschiedenen Skalen; Schlaf 84 % trotz fehlender Nacht | fachlich, UI | `js/v5-ui.js`, `index.html` Heute | – |
| P1 | HRV/Ruhepuls/Schlaf | eine Grafik mit zwei Skalen | UI | `index.html` Heute | – |
| P1 | Leistungssimulator | Annahmen (CdA, Crr, Gewicht) nicht als Annahmen markiert | fachlich | `js/v5-extra.js` | – |
| P1 | Routenplaner | Hauptstrassenanteil ohne Alternative/Begründung | fachlich | `js/routen-ui.js` | BRouter `fastbike` |
| P1 | Routenplaner | Startzeit versteckt, Pausen nur pauschal, Wind nicht auf der Karte, Wetter/Tempo über der Höhenachse | UI | `js/routen-ui.js` | – |
| P1 | Routenplaner | Fehlerband gilt pauschal für alle Fahrten | fachlich | `tools/kalibrierung.py` | Hold-out nicht nach Steigung geschichtet |
| P1 | Routenplaner live | Routing und Wetter auf dem iPhone | ok (Screenshots) | – | brouter.de, Open-Meteo |
| P1 | Schwimmen | Rohpace aus Pool-Aktivitäten als Verlauf | fachlich | `index.html` Schwimmen | Pausen/Bahnerkennung |
| P1 | CSS-Test | Formular fehlt | fehlt | – | – |
| P1 | Video-Coach | Status «manuell» nicht klar | UI | `js/v5-extra.js` | – |
| P1 | Übungsskizzen | auf kleinen Displays abgeschnitten, fachlich ungeprüft | UI | `v53-extra.js` | – |
| P1 | Fueling aus Garmin | ob Gels/Getränke in FIT/API vorhanden sind | ungetestet | – | Garmin Connect (A15) |
| P1 | Mahlzeiten mit Uhrzeit | fehlt in den Daten | fehlt (braucht Daten) | Nacht-Update | `get_nutrition_daily_meals` |
| P2 | Kopfzeile Laktat | alte Aufschrift «Spuren / Formkurve» | UI | `js/v5-ui.js` | – |
| P2 | Logo/App-Icon | neue Bilder von Silas | fehlt | `index.html`, Manifest | – |
| – | Daten | 1759 Aktivitäten, Schwellen, Referenzsatz | ok | `check_referenz.py` | GESAMT bestanden (8.11.2026) |

Ergebnis der Umsetzung je Befund: siehe Abschnitt «Ergebnis» (wird nach der Umsetzung ergänzt).
