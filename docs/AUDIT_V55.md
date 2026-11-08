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

## Ergebnis (8.11.2026, nach der Umsetzung)

Status: **erledigt** · **teilweise** · **offen** (braucht Daten, Freigabe oder einen Live-Test, der hier nicht möglich ist).
«Prüfung» nennt das Testprotokoll: `tests/test_formkurve.cjs` (53 Tests), `tests/test_route.cjs` (21), `tests/test_tools.py`,
Browser-Prüfungen mit echten Daten nur lokal (Ergebnisse im Chatbericht, nicht im Repository). n = Anzahl geprüfter Fälle.

| # | Status | Umsetzung · Codeort | Datenquelle · Methodik | Prüfung · n | Offen |
|---|---|---|---|---|---|
| P0.1 | erledigt | `FK.pmc`, `FK.pmcAnzeige`; `index.html` `pmc()`, Heute | Trainingslast `tss`; Form = Fitness − Ermüdung desselben Tages (`pmc-2.0`), alte Konvention als Zusatz | 3 Tests; echte Daten 10 von 10 Tagen gleich | – |
| P0.2 | erledigt | `FK.zoneSummary`, `FK.zoneVerdict`; `index.html` `zones()` | Puls-Histogramm `hh` je Aktivität; nur freigegebene Zonenprofile je Datum, sonst Garmin-Zonen blass (`zonenverteilung-2.0`) | 4 Tests; Browser je Sportart 4/12 Wochen | Schwimmen ohne Pulsschwellen: bleibt «unsicher» |
| P0.3 | erledigt | `js/v5-ausdauer.js` Koppel-Detail | FIT-Abschnitte `sp` (0–5, 5–10, 10–20 min, Rest); Fenster/lange Pause (`koppel-1.1`) | 2 Tests; 4 von 4 Abschnitten gleich den Rohwerten | – |
| P0.4 | erledigt | `js/v53-extra.js` `goals()`, Jahresstatistik | Bewegungszeit `mv`, Timer `dur` getrennt; Ziele/Vorjahr in Bewegungszeit | Tests Zeitbegriff; Browser | – |
| P0.4 | erledigt | `js/v53-extra.js` `bests()` | Lauf-Bestzeiten aus FIT als «aus FIT (Schätzung)», offizielle Zeiten als eigene Eingabe (`pb`) | Browser | offizielle Zeiten von Hand eintragen |
| P0.5 | erledigt | `tools/kennzahlen.py` `bloecke()`, `FK.entwicklung*`, `js/v55.js` | gleichmässige 10-min-Blöcke `eb-1.0` je System; Urteil `entwicklung-1.0` mit Guards und Intervall | 5 + 8 Tests; Daten neu für die passenden Aktivitäten | – |
| P0.5 | erledigt | `FK.laufEffizienz`, Leistung | m/Schlag, Ausreisser gezählt (`laufeffizienz-1.0`) | 1 Test | – |
| P0.6 | erledigt | `FK.longRideOrientierung`, `v5-ausdauer.js` | eigene Fahrten ≥ 3 h als Orientierung, Prognose bleibt «nicht bestimmbar» | 2 Tests | – |
| P1 Entwicklung | erledigt | `js/v55.js`, `index.html` Fortschritt | wie P0.5; drei Antworten, Kacheln, Rechennachweis-Export | Browser 6 Vergleiche (4/12/52 Wochen × Vorjahr/davor) | Laktat zählt erst nach B1; CSS erst mit Tests |
| P1 Hierarchie/Navigation | erledigt | `index.html` (Ebenen, Tab-Leiste) | – | A10/A13 | untere Navigationsleiste nicht umgesetzt (siehe offen) |
| P1 Tabellen 375 px | erledigt | `.tablewrap.scrollx`, `markScroll()` | – | A10: 0 Fehler bei 375/390/430 px | – |
| P1 Jahresziele, Jahresvergleich, Wochenumfang | erledigt | `v53-extra.js`, `index.html` `volume()`, `years()` | kumuliert im gleichen Kalenderzeitraum; Anzahl Einheiten, 4-Wochen-Mittel | Browser | – |
| P1 Bestleistungen/Radar | erledigt | `v53-extra.js` | Radar entfernt; Leistungskurve je System | Browser | – |
| P1 Schwellen-Trend | erledigt | `js/v5-ui.js` `drawTrend` | je Protokoll eigene Linie, Tooltip mit Protokoll | Browser | – |
| P1 Laktat-Einzelwerte | erledigt | `js/v5-ui.js` | Filter, Messkontext je Wert | Browser | – |
| P1 Readiness/HRV | erledigt | `js/v55.js` `heute()`, `index.html` Heute | Datenqualität je Quelle; drei kleine Grafiken statt Ringe | A12 | – |
| P1 Leistungssimulator | erledigt | `js/v5-extra.js` | Annahmen als Annahmen markiert | Browser | – |
| P1 Routenplaner | erledigt / teilweise | `js/route.js`, `js/routen-ui.js` | BRouter (`fastbike` mit Verkehrsgewichtung), Open-Meteo; `varianten-1.0`, `zeit-rt-1.1`, `wetter-rt-1.1` | 21 Tests; lokale BRouter-Instanz, Wetter synthetisch | Live-Test Ilanz–Flims und Open-Meteo auf dem iPhone |
| P1 Fehlerband | erledigt | `tools/kalibrierung.py` (`kalibrierung-1.1`), `RT.modelError` | Hold-out-Population, Fehler je Steigungsklasse, konservativ ausserhalb | 1 Test; Daten neu | – |
| P1 Schwimmen | erledigt | `js/v55-schwimmen.js`, `v5-extra.js`, `v53-extra.js` | CSS (`css-1.0`), Fehlerboard, Rohpace als Rohdaten | 1 Test JS, 2 Tests Python; Browser | CSS-Test durchführen |
| P1 Fueling | erledigt | `js/v5-ausdauer.js` | «nicht protokolliert» ≠ 0 g; leerer Zustand | Browser | Einträge erfassen |
| P1 Fueling aus Garmin (A15) | erledigt | `fueling_quellen` (Daten), «Import prüfen» | 1773 FIT-Dateien (Nachrichten- und Ereignistypen gezählt), Garmin Ernährung/Trinken (Stichprobe) | 1 Test; Befund in den Daten | undokumentierte Herstellernachrichten bleiben ungenutzt |
| P1 Mahlzeiten mit Uhrzeit | offen | – | Garmin liefert je Eintrag eine Uhrzeit, teils vorab geplant | – | Regel «echte Uhrzeit» und Nacht-Abruf nötig |
| P2 | erledigt / teilweise | `index.html`, `js/v5-ui.js` | Kopfzeile, Serie nachrangig, Rennen kompakt, Pillen einheitlich, Markenhinweis | Browser | lange Auswahllisten nur teilweise gekürzt |
| Daten | erledigt | `check_referenz.py` | 1759 Aktivitäten, Schwellen, Referenzsatz | GESAMT bestanden nach jedem Daten-Commit | – |

## Abnahme A01–A15

| Test | Ergebnis | Nachweis |
|---|---|---|
| A01 | bestanden | Form-Formel erklärt (Regel `pmc-2.0`, Hinweis unter der Grafik); 10 zusätzliche Tage mit echten Daten gleich |
| A02 | bestanden | Rad/Lauf/Schwimmen getrennt, Zonen je Datum, Nenner sichtbar, keine starre Warnung (Tests + Browser) |
| A03 | bestanden | Pace und Puls in getrennten Grafiken; Tabelle = FIT-Abschnitte (4 von 4 gleich) |
| A04 | bestanden | Timer und Bewegungszeit getrennt; Ziel und Vorjahr in Bewegungszeit |
| A05 | bestanden (Methode geändert) | Aussagen nur aus gleichmässigen Blöcken mit n, Status und Intervall; frühere Einzelaussagen aus ungleichen Ganz-Aktivitäten werden nicht mehr gezeigt |
| A06 | bestanden | 9:00 und 4:20 → 2:20/100 m (Test); Korrektur bleibt nach Neuladen gespeichert; Rohpace «nicht validiert» |
| A07 | bestanden | ohne Einträge kein g/h-Plot; «nicht protokolliert» ohne 0-g-Verlauf; «nichts eingenommen» = 0 g |
| A08 | teilweise | Logik, Fazit und Varianten mit lokaler BRouter-Instanz geprüft; Ilanz–Flims nicht live (brouter.de hier gesperrt) |
| A09 | bestanden (lokal) | Pause 20 min → Ankunft +20 min, Wetterzeit verschoben, 3 Windpfeile richtig gedreht; Wetter synthetisch, Open-Meteo nicht live |
| A10 | bestanden | 375/390/430 px: keine Elemente < 44 px, nichts übersteht, breite Tabellen mit Hinweis; Planer-Varianten passen bei 375 px |
| A11 | bestanden | Schwellentrend je Protokoll eigene Linie |
| A12 | bestanden | fehlende Nacht als «fehlt», Datenqualität sichtbar, keine Schlafprozente |
| A13 | bestanden | Ebenen je Tab; Vorher/Nachher-Screenshots (nur im Chat, echte Daten) |
| A14 | bestanden | `check_referenz.py`: 1759/1759 Aktivitäten, 21/21 Schwellen, Referenzsatz; Daten-Commits nur mit neuen Feldern, Sicherung und Rückweg |
| A15 | bestanden | Befund dokumentiert; keine Einnahmen aus Garmin übernommen oder geschätzt |

## Korrektur F1 (8.11.2026): fehlende Wetterwerte

Gefunden bei der lokalen Prüfung des veröffentlichten Stands 7fdcada: Fehlende Windwerte wurden als Windstille gerechnet.
Codeort `js/route.js` (`RT.weatherField`, `RT.simulate`, `RT.eta`), `js/routen-ui.js` (Infozeile, Ankunftsliste, Wetterstreifen,
Hinweis zur Fahrzeit). Regeln `wetter-rt-1.2`, `zeit-rt-1.2`. Status: **behoben, lokal getestet, produktiv nicht getestet**.

| Fall | Erwartung | Unit-Test | Browser lokal (Planer, Wetter synthetisch) |
|---|---|---|---|
| 0 km/h, Richtung gültig | Windstille = gültiger Wert, kein Hinweis | bestanden | bestanden: «windstill (0 km/h)», kein Hinweis, keine Pfeile |
| Geschwindigkeit da, Richtung fehlt | Tempo bekannt, Gegen-/Rückenwind unbekannt | bestanden | bestanden: «Wind 18 km/h (Richtung unbekannt)», «Wind nicht berücksichtigt» |
| Geschwindigkeit fehlt | unbekannt, nie 0 | bestanden | bestanden: «Wind unbekannt», Hinweis, Band mit ±7 km/h |
| Wetterdienst nicht erreichbar | Hinweis mit Grund, Band mit ±7 km/h | bestanden | bestanden: «Wind nicht berücksichtigt (Wetterdienst nicht erreichbar)» |
| Einzelne Abschnitte ohne Wind | nur dort unbekannt, nie mit Nachbarwert gefüllt | bestanden | bestanden: «teilweise nicht berücksichtigt (… km, … %)», Lücken im Streifen, Pfeile nur wo bekannt |
| Startzeit geändert | neu gerechnet | bestanden | bestanden: Start 15:00 Wind bekannt, Start 19:00 in der Lücke → Hinweis |
| Temperatur, Niederschlag, Böen fehlen | unbekannt, nie 0; Fahrzeit 15 °C bzw. trocken mit Hinweis | bestanden | bestanden: «Temperatur unbekannt», «Regen unbekannt», kein «trocken» |

Weitere Parameter: Das 0-Problem betraf nur den Wind (Vektorrechnung) und in der Anzeige den Niederschlag (Infozeile «0.0 mm/h»,
Streifen «trocken» bei fehlenden Werten) – beides behoben. Temperatur und Böen werden nie zu 0; fehlt nur einer von zwei
Nachbarwerten (Stunde oder Stützpunkt), wird der vorhandene verwendet – unverändert, als offener Entscheid in `docs/offen-nach-v55.md`.
Regression: Planer-Tests V5.3 (iPhone, Desktop) und V5.5 mit denselben Werten wie vorher bestanden.

