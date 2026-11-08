# Audit V5.7 · 8.11.2026 · Smart Training Routes

Auftrag: «Ironman Notebook V5.7 – Smart Training Routes» (8.11.2026). Der Routenplaner (V5.3–V5.6) bleibt mit allen Funktionen erhalten
und wurde erweitert, nicht neu gebaut. Zugang nur über den Trainingskalender («Passende Route finden») und den Planer
(«Training → Route»); kein neuer Haupttab, helles Design. Regeln und Versionen: `CHANGELOG.md` (V5.7). Offene Punkte: `docs/offen-nach-v55.md`.

**Teststand – Begriffe**
- **Implementiert:** im Code vorhanden.
- **Lokal getestet:** Abnahmetests (`tests/`, erfundene Werte bzw. echte Antworten einer lokalen BRouter-Instanz mit den
  OSM-Testdaten **Dreieich (Deutschland)**), dazu die Seite im Browser in dieser Arbeitsumgebung (Chromium, iPhone-13-Emulation und
  Desktop) gegen dieselbe lokale BRouter-Instanz; echte Trainingsdaten nur im lokalen Testaufbau, nie im Repository.
- **Produktiv getestet:** auf der veröffentlichten Seite bzw. mit den echten Diensten. **Für alle V5.7-Funktionen: nicht getestet.**
  brouter.de, Open-Meteo und swisstopo sind von dieser Arbeitsumgebung aus gesperrt, und dein Computer war nicht verbunden.
  Die Dreieich-Tests sind **kein Nachweis für die Schweiz** (Kartenausschnitt nur wenige km, Höhenmodell nur im Ausschnitt).

**Wiederherstellungspunkt:** Branch `vor-v57` auf GitHub (Stand ed42b3d, Seite und Daten vor V5.7). Seite zurück: die V5.7-Commits
rückgängig machen (`git revert`). Persönliche Trainingsdaten wurden nicht verändert (V5.7 ergänzt nur neue Felder bzw. Listen).

## 1 · Trainingsroute aus einem Enduco-Workout
| | |
|---|---|
| Gab es schon | Geplante Einheiten aus dem Garmin-Kalender (Titel, Sportart, Dauer) im Kalender; Workout-Abgleich nach der Einheit (V5.6) |
| Neu | Kalender: Tag antippen → «Passende Route finden» (Rad, Laufen, Wandern; Schwimmen ohne Knopf). Erkannt werden Sportart, Dauer (Summe der Schritte), Zielwatt/Pace/Puls je Schritt, Wiederholungen, Pausen, intensive Schritte (ab Z3 deines aktiven Zonenprofils) und die Art (Grundlage, Intervalle, lange Intervalle, Sprints, Berg, Trail). «Eigene Angaben» für Einheiten ohne Workout. Nacht-Update holt die Schritte über die bestehende Garmin-Verbindung (`get_workout_by_id`), dazu neue Enduco-Workouts ohne Kalenderdatum (`workouts_neu`) |
| Lokal getestet | `test_training.cjs`: Enduco-Strukturen wie die echten Workouts «Lange VO2max Intervalle», «Fatmax», «Neuro Intervalle & Ausdauer» (Werte erfunden): Wiederholungen, Modus, Dauer, Grund-/Intensivwert, Art, Toleranz; Puls als Zone; Leistung ≤ 150 wird nicht als Watt geraten; Bergintervalle über die Trittfrequenz; Kalender ohne Schritte; eigene Angaben (2 h @ 200 W, 3 × 15 min @ 260 W, 20′ + 4 × 8′ + 15′). `test_tools.py`: Nacht-Update übernimmt Schritte, `workouts_neu`, GPS-Spur. Browser: Kalender → Knopf → Vorschau mit Struktur |
| Einschränkungen | Keine direkte Enduco-Schnittstelle (nur, was Enduco an Garmin sendet). Enduco plant nicht jede Einheit im Garmin-Kalender: dann «neu von Enduco» (ohne Datum) oder eigene Angaben. Die Schritte kommen erst mit dem nächsten Nacht-Update |

## 2 · Persönliche Startorte
| | |
|---|---|
| Neu | «Startorte verwalten» in der Trainingsvorschau: Zuhause, Arbeit oder eigener Name (weitere Orte mit eigenem Namen; der Name steht nur verschlüsselt in deinen Daten, nicht im öffentlichen Code) – auf der Karte tippen, aktueller Standort (GPS des Geräts) oder Adresssuche (swisstopo); zusätzlich jederzeit «Aktueller Standort», «Punkt auf der Karte», «Start im Planer» |
| Datenschutz | Gespeichert mit dem Seitenschlüssel verschlüsselt auf dem Gerät (Eingaben); mit «Exportieren» in `data.enc.json` (verschlüsselt). Nichts davon im Repository oder offen im Browser-Speicher. Für die Berechnung gehen Koordinaten (ohne Namen) an BRouter/Open-Meteo, wie bei jeder Route |
| Lokal getestet | Browser: Ort «Zuhause» auf der Karte gesetzt → gespeichert, ausgewählt; Browser-Speicher enthält weder Name noch Koordinaten im Klartext. `test_tools.py`: Startorte als ganze Liste ersetzt, alte Fassung im Audit |

## 3 · Datum, Startzeit, Wetter, Tageslicht
| | |
|---|---|
| Neu | Datum (aus dem Kalender), Startzeit, Startort, Pausen (z. B. 1 × 15 min), Trainingsziel, Routenart (Rundtour, Hin und zurück, zu einem Ziel). Wetter je Route an der erwarteten Position zur Durchfahrtszeit (Wind, Böen quer zur Fahrtrichtung, Temperatur, Regen); eine Open-Meteo-Anfrage für alle Vorschläge (Gitter 0,05°). Startzeit ändern → Wetter und Bewertung neu, ohne neue Routen. Tageslicht (Sonnenauf-/-untergang und Dämmerung, NOAA-Rechnung auf dem Gerät): «Licht nötig» bzw. «Dämmerung» |
| Lokal getestet | Wind Hin/Rück, Seitenböen, Regen auf synthetischen Strecken; fehlender Wind bleibt «unbekannt» (nie Windstille); Tageslicht gegen eine unabhängige Rechnung (SunCalc) ±3 min. Browser: Open-Meteo hier gesperrt → «Wetter nicht verfügbar», kein Vorschlag B, Zeit ohne Wind mit Band; danach **synthetische** Open-Meteo-Antwort abgefangen → B gewählt, eine Anfrage für alle Vorschläge |

## 4 · Drei Vorschläge A / B / C
| | |
|---|---|
| Neu | Echte Routen (BRouter, gleiche Profile wie der Planer): Rundtour = Kreis durch den Start in 6 Richtungen, dann Radius nach der persönlichen Fahrzeit nachgeregelt. **A Training** (Dauer, geeignete Intervallabschnitte, Gleichmässigkeit bzw. Anstiege, wenig Unterbrechungen, kein Gravel beim Rennrad), **B Wetter** (starke Seitenböen, Regen, zuerst Gegenwind/zurück Rückenwind), **C ruhig** (Rennrad: velofreundliches Profil; Gravel/MTB: Forst- und Feldwege; Laufen: Fuss- und Wanderwege). Verschieden heisst ≥ 15 % andere Wege; ist A schon die ruhigste bzw. wetterbeste Route, steht «wie A» |
| Profilfehler | Nimmt der Server das Rennradprofil nicht an: einmal neu hinterlegen, sonst Standardprofil fastbike – **sichtbar** als Warnung über den Vorschlägen und im Planer-Status, nie stillschweigend |
| Lokal getestet | Mit aufgezeichneten Antworten der lokalen BRouter-Instanz: Rennrad mit Intervallen (15 Anfragen), Laufen (13), Gravel mit Schotterpräferenz (11); nur echte Routen, keine Ersatzlinie; B nur mit Wetter; Wind aus Westen → beste Wetter-Runde nach Westen, B nie mit Rückenwind zuerst; Startzeit mit drehendem Wind → B wechselt die Richtung; starke Böen → B mit den wenigsten Seitenböen; Routingfehler → keine Vorschläge |

## 5 · Persönliche Fahrzeit
| | |
|---|---|
| Gab es schon | Planer-Zeitmodell (Leistungsbilanz je 20 m mit CdA, Rollwiderstand je Belag, Wind, Luftdichte, Systemgewicht; Lauf Minetti; Wandern Tobler; Puls über persönliche Kalibrierung; Korrektur aus echten Fahrten; Band aus Hold-out) |
| Neu | Leistung bzw. Tempo **je Workout-Schritt** (Einfahren, Intervalle, Pausen) statt eines Durchschnitts; im Vorschlag sichtbar, ob die Prognose persönlich kalibriert ist oder eine allgemeine Schätzung (zu wenige vergleichbare Einheiten) |
| Lokal getestet | Plan = konstante Leistung gibt dieselbe Zeit, härterer Abschnitt schneller, Puls-Plan = Watt aus der Kalibrierung. **Echte Garmin-Daten (Test 9):** Zeitprognose der Seite auf der GPS-Spur echter Fahrten (Höhe aus den Sekundenreihen, Ø-Leistung): 42 Rennradfahrten 2026 Median ±5,0 %, 39 im Band; im Hold-out-Zeitraum der Kalibrierung 11 Fahrten Median ±5,0 %, alle im Band; nach dem Kalibrierungsstand 1 Fahrt −4,0 %, im Band; MTB 8 Fahrten Median ±6,3 % |
| Einschränkungen | CdA, Rollwiderstand je Belag und Abfahrtsgrenzen sind Annahmen (durch die Korrektur aus echten Fahrten abgeglichen); Ampeln und Kreuzungen sind nicht in der Zeit, sondern nur in der Eignung |

## 6 · Dauer abstimmen
| | |
|---|---|
| Neu | Distanz aus der persönlichen Prognose auf flacher Strecke, dann 6 Richtungen und höchstens zwei Runden Nachregeln je guter Richtung (Sekantenschritt). Ziel ±5 % bei Dauertraining, ±10 % bei Intervallen (Eignung der Abschnitte zählt mehr). Die Plandauer bleibt massgebend: Abweichungen stehen beim Vorschlag, nichts wird angepasst |
| Lokal getestet | Verfahren mit einer Wegnetz-Attrappe (gerade Linien über flaches Land, unabhängig von Kartendaten): 2 h Rennrad @ 200 W Rundtour und Hin/zurück innerhalb ±5 %, 60 min Laufen @ 5:35 innerhalb ±5 %, ≤ 18 Anfragen. Auf der kleinen Dreieich-Karte ist ±5 % oft nicht erreichbar (Rand der Testdaten) – dort geprüft: nachgeregelt und Abweichung ehrlich angezeigt |

## 7 · Intervalle auf der Route
| | |
|---|---|
| Neu | Intensive Schritte nach der persönlichen Zeitprognose auf die Strecke gelegt; je Abschnitt «gut», «bedingt» oder «ungeeignet» mit Gründen: Abfahrt (< −4 % über 200 m), Rampe, Unterbrechungen laut OSM (Ampel, Stopp, Bahnübergang, Schranke, Kreisel …), Hauptstrasse, Gravel beim Rennrad, Belag unbekannt, Treppen/Pfad beim Laufen, Bergintervalle ≥ 4 %. Bänder im Höhenprofil und farbige Abschnitte auf der Karte; Hinweis, wenn früheres/späteres Einfahren besser passt (Plan bleibt). Unplausible Höhendaten → «Steigung nicht beurteilt», nie eine erfundene Abfahrt |
| Lokal getestet | Synthetische Strecken (Abfahrt, Anstieg, Ampeln, Gravel), Route zu kurz → «ungeeignet», nie erfunden; 3 × 15 min auf flachem Land alle «gut». Browser: Bänder im Profil, Liste im Planer, nach Umkehren und neuem Zwischenziel neu gelegt |

## 8 · Vergleich und Regler
| | |
|---|---|
| Neu | Tabelle A/B/C und je Vorschlag: Distanz, Zeit mit Band, Höhenmeter, Abweichung zur Plandauer, Belag (Asphalt, Pflaster, Beton, Kies/Natur, unbekannt, Gravel), Strassentypen, Wind 1./2. Hälfte, Böen, Regen, Temperatur, längster Anstieg, Unterbrechungen, Licht, Prognosegüte, Eignung, Begründung. Regler für Grundlage und Intervalle: Zeiten sofort neu; passt die Dauer nicht mehr → «Route neu berechnen». Auswählen → Planer mit denselben Wegpunkten (Abschnitte wiederverwendet, keine Doppelanfrage); Zwischenziele, Umkehren, Varianten wie bisher |
| Lokal getestet | Browser iPhone/Desktop: Regler −20 W → Zeit sofort länger; Regler mit dem Zeiger gezogen (mehrere Schritte, der Regler bleibt dabei bestehen); Auswählen → Planer gleiche Länge und Zeit wie der Vorschlag, Variante fest, Intervallbänder; Umkehren; Zwischenziel eingefügt (Start/Ziel fest) |
| Im Test gefunden und behoben | Regler wurde beim Ziehen neu gezeichnet (Ziehen brach nach einem Schritt ab); Fehler beim Neuzeichnen mit aktivem, geändertem Eingabefeld; Planer-Status bei Abschnitten mit unbekanntem Zugang (bestand seit V5.3) |

## 9 · Rennrad-Routing geprüft
| Frage | Ergebnis |
|---|---|
| Asphalt, Hartbelag, Pflaster, Gravel richtig? | Bisher: Pflaster unter «Anderer Hartbelag» (nie Gravel – korrekt, aber nicht sichtbar). **Neu** eigene Klasse «Pflaster» (Pflastersteine, Kopfstein, Klinker, Rasengitter) mit eigenem Rollwiderstand (Annahme); Gravel = Kies/Feinkies/verdichtet, Naturweg, unbefestigt, Feldweg grade2–5 |
| Unbekannte Beläge? | Bleiben «unbekannt» (Anteil je Vorschlag und im Planer, Warnung ab 20 %); Feldweg ohne Angabe = «möglicherweise Gravel» |
| Hauptstrassen genug gemieden? | **Nur schwach:** Grundkosten Hauptstrasse +20 %; die Verkehrsgewichtung (`consider_traffic`) wirkt nur, wenn die Kartendaten des Servers die geschätzte Verkehrsklasse enthalten – lokal nicht vorhanden, bei brouter.de nicht prüfbar. **Neu** `avoid_mainroads` in der velofreundlichen Variante (Hauptstrasse +60 %, Verbindungsstrasse +35 %/+15 % ohne Radstreifen). Lokal: weniger Verbindungsstrasse in 2 von 4 Testrouten (63 → 54 %, 50 → 38 %), gleich in 2 |
| Alternativen wirklich verschieden? | Ja: ≥ 85 % gleiche Wege in beide Richtungen werden weggelassen (unverändert); Vorschläge A/B/C nach derselben Regel |
| Velofreundlich wirklich besser? | Bisher nicht geprüft. **Neu** (`varianten-2.1`): nur gewählt, wenn weniger Verkehrsstrassen oder mehr Radweg (je ≥ 1 Prozentpunkt) – sonst die schnellste mit Begründung |
| 10 % auf die Zeit? | Ja, auf die persönliche Fahrzeit bei der aktuellen Intensität. Nur ohne Zeitprognose (z. B. Puls ohne Kalibrierung) auf die Distanz – **neu** ausdrücklich so beschriftet |
| Zwischenziel automatisch + von Hand umsortieren | Unverändert (kleinster Umweg; ↑ ↓ in der Liste); im Browser geprüft |
| BRouter schonen | **Neu:** höchstens 2 Anfragen gleichzeitig (Warteschlange für Planer und Vorschläge), Cache je URL, eine Anfrage je Vorschlag (alle Punkte), gewählter Vorschlag ohne neue Anfrage im Planer, Wetter eine Anfrage für alle Vorschläge |

## 10 · Nach dem Training
| | |
|---|---|
| Neu | Gewählter Vorschlag wird verschlüsselt gespeichert (Prognose, Intervallabschnitte, Wetterprognose, kompakte Linie). Im Kalender «Vorschlag vs. Ist»: Dauer, Distanz, Tempo/Pace, Leistung (Ø, NP), Puls, Höhenmeter, Abweichung der Zeitprognose, Prognose bei deiner tatsächlichen Leistung, Streckentreue aus der GPS-Spur, Zeit im Zielbereich der Workout-Schritte (Abgleich V5.6), Wetter Prognose vs. Garmin-Station. Modellgüte nur aus unabhängigen Einheiten (nach dem Kalibrierungsstand, ≥ 80 % der Strecke gefolgt). Nacht-Update liefert dafür neu die GPS-Spur (`poly`, verschlüsselt) |
| Lokal getestet | `test_training.cjs` (Vergleich, Streckentreue, Modellgüte), `test_tools.py` (GPS-Spur draussen, drinnen keine). Browser mit gespeichertem Testvorschlag auf der echten Spur einer Oktober-Fahrt (nur Testkopie) |

## 11 · Datensicherheit und nächtlicher Import
- Nacht-Update aktualisiert `serien/` **nicht** (Auftrag erlaubt nur `data.enc.json`). Nötige Änderung dokumentiert (CLAUDE.md, Schritt 4):
  Text des geplanten Auftrags auf «data.enc.json und serien/» erweitern; `serien_crypt.mjs` schreibt nur neue/geänderte Reihen, Namen gehasht,
  keine Duplikate. **Wartet auf deine Freigabe** – nicht geändert.
- Neu im Nacht-Update (nur lesend über Garmin, geschrieben wird weiter nur `data.enc.json`): Workout-Schritte, neue Enduco-Workouts, GPS-Spur.
- Startorte und Vorschläge nur verschlüsselt (Gerät bzw. `data.enc.json`); keine Adressen, Zugangsdaten oder GPS-Daten offen im Repository.

## 12 · Tests
| Test | Implementiert | Lokal getestet | Produktiv |
|---|---|---|---|
| 1 · 2 h Rennrad-Grundlage @ 200 W ab gespeichertem Startort | ja | Verfahren ±5 % (Attrappe); Startort gespeichert und Vorschläge mit lokaler BRouter (kurze Einheit, Testkarte) | nein |
| 2 · 60 min Laufen bei Pace | ja | ±5 % und Pace (Attrappe); 30 min mit lokaler BRouter | nein |
| 3 · Strukturierte Radeinheit | ja | Enduco-Struktur, Intervalle platziert und beurteilt; Bänder im Profil | nein |
| 4 · Gravel/MTB mit Schotterpräferenz | ja | Gravel-Profil `prefer_unpaved_paths=1`, C mit Forst-/Feldwegen | nein |
| 5 · Rundtour, Startzeiten, Wind | ja | Westwind → beste Wetter-Runde nach Westen; Wind dreht → B wechselt; starke Böen gemieden | nein |
| 6 · Start/Ziel/Zwischenziel, Umkehren | ja (Planer) | Browser: umkehren, Zwischenziel, Start/Ziel fest; bisherige Planer-Tests | nein |
| 7 · Schnellste vs. velofreundlich | ja | Regel 2.1, `avoid_mainroads` an der lokalen Instanz | nein |
| 8 · Fehlendes Wetter, Routingfehler | ja | Wind unbekannt ≠ windstill; Open-Meteo gesperrt; BRouter nicht erreichbar → keine Vorschläge, keine Linie | nein |
| 9 · Prognose mit echten Garmin-Daten | ja | 42 Fahrten Median ±5,0 %; Hold-out 11 Fahrten ±5,0 %, alle im Band | – |
| 10 · Vorschlag vs. absolvierte Aktivität | ja | Rechnung (erfunden) und Browser mit echter Aktivität (Testkopie) | nein |
| Schweiz (Chur–Lenzerheide über Paspels usw.) | – | **nicht möglich** (brouter.de gesperrt, Computer nicht verbunden) | nein |

**Rückwärtsprüfung (bestehende Funktionen):** Abnahmetests `test_formkurve.cjs` 53, `test_route.cjs` 35, `test_analyse.cjs` 12,
`test_training.cjs` 25, `test_tools.py` bestanden. Browser gegen die lokale BRouter-Instanz: Planer-Tests V5.3 (Rauchtest, iPhone, Desktop),
V5.5 (Planer iPhone: Varianten, Pausen, Wind, Wetter) und V5.6 (Profil, Varianten, Zwischenziel, andere Routen, Gravel-Umfahrung, Ersatzprofil)
ohne Seitenfehler; Demo ohne Fehler und ohne Anfragen an echte Daten oder BRouter. Der V5.5-Planertest lief zuerst parallel zu einem anderen
Browsertest in eine Zeitüberschreitung (30 s) und bestand allein ohne Änderung.
