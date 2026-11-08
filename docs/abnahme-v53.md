# Abnahme V5.3 · Routenplaner, persönliche Zeitprognose, Ironman Notebook

Stand 8.11.2026. Grundlage: Masterauftrag V5.3 (mit V5.2/V5.1 als Bestand), Konzept-PDF V5.3, Interaktionsvorlage (nur als
Verhaltensvorlage; deren synthetische Daten sind nirgends übernommen).

## Testumgebung – was echt war und was nicht

| Teil | In den Tests | Bemerkung |
|---|---|---|
| Routing-Engine | **echt**: BRouter aus dem Originalquellcode (github.com/abrensch/brouter, Stand 11/2026), lokal gebaut | öffentlicher Server brouter.de aus der Testumgebung **nicht erreichbar** (Netzsperre) |
| Wegnetz | **echt**: OSM-Ausschnitt Dreieich (Hessen) aus dem BRouter-Testdatensatz, mit SRTM-Höhen | keine Schweizer Daten in der Testumgebung; Bad Ragaz → Pfäfers konnte nicht live geprüft werden |
| Karte, Diagramme | **echt**: MapLibre GL 4.7.1 und Chart.js 4.4.1 (offizielle Releases, gleiche Versionen wie live) | Kartenkacheln (swisstopo/CARTO) nicht erreichbar → Testhintergrund aus den OSM-Testdaten |
| iPhone | Chromium mit iPhone-13-Emulation (Touch, 390×664, DPR 3) | **kein echtes Safari/iOS**: auf dem Gerät selbst noch prüfen (Liste unten) |
| Wetter | Oberfläche mit **synthetischer** Open-Meteo-Antwort (Westwind 8 m/s, abgefangen) | api.open-meteo.com nicht erreichbar; Rechenregeln (Windrichtung, Zeitbezug) zusätzlich in Unit-Tests |
| Kalibrierung | **echt**: FIT-Sekundenwerte aus dem Garmin-Export | Hold-out = jüngste 25 % der Einheiten |

## Status je Funktion

| Funktion | Status | Tests |
|---|---|---|
| Echtes Routing über erlaubte Wege (BRouter), je Abschnitt eine Anfrage, Zwischenspeicher | **fertig** (live: braucht brouter.de) | E2E iPhone/Desktop gegen lokale Engine; Unit `parseBRouter`, Länge = BRouter-track-length ±0,5 % |
| Sportprofile Rennrad (fastbike), Gravel (gravel, Schotter bevorzugt), MTB (Standard gravel, «Technische Trails» = mtb mit StrictNOBicycleaccess=1), Laufen/Trail/Wandern (hiking-mountain mit SAC-Grenze T1/T3/wählbar) | **fertig**; ob brouter.de alle vier Profile anbietet, ist **nicht geprüft** (sonst erklärter Fehler mit Profilname) | Unit `engineFor`; lokale Routen je Profil unterschiedlich (Fixtures) |
| Zwischenziele setzen, verschieben (ziehen), löschen, umsortieren (↑/↓), «Zwischenziel hier», Rundtour, Rückgängig | **fertig** | E2E (Setzen, Rückgängig), Unit |
| T01 Route umkehren B→2→1→A mit Neu-Routing | **fertig** | E2E: 3 neue Anfragen, Reihenfolge umgekehrt, 0 Abschnitte gegen Einbahn, 10 % der Linie anders |
| T02 Keine Ersatzlinie bei Fehler, kein GPX | **fertig** | E2E: Punkt 2,3 km neben Weg → Fehler; Gebiet ohne Daten → Serverfehler erklärt; 0 Linien, GPX gesperrt |
| Abstand Punkt ↔ Wegnetz (BRouter schiebt Punkte sonst still auf weit entfernte Wege) | **fertig** (> 60 m Hinweis, > 500 m Fehler) | Unit, E2E |
| T03 Karte → Profil → Karte (1/3, 2/3), Finger-Ziehen im Profil, Cursor auf der Karte ziehen | **fertig** | E2E iPhone-Emulation: Abweichung 0,8–2,1 m beim Tippen (4,2 m/px), Rundweg 0,0 m |
| T04 Belag/Wegart/Zugang: Summe 100 % inkl. unbekannt, Asphalt hebt getrennte Stücke hervor | **fertig** | E2E: 2 getrennte Asphaltstücke markiert (Karte + Profil), Tabwechsel setzt Auswahl sichtbar zurück |
| T05 Anstiege/Abfahrten getrennt, klickbar, dokumentierte Glättung, Max.-Steigung nur bei genügender Auflösung | **fertig** | Unit (synthetisches Profil); Dreieich ist flach → E2E ohne Anstieg |
| T06 Wind: meteorologische Richtung, Zeitzone, Hin/Rück gegensätzlich | **fertig (Logik)**, **live ungetestet** (Open-Meteo) | Unit (Vorzeichen, Vektormittel 350°/10°, Rundtour); E2E mit synthetischer Antwort: Hinweg 78 % Rückenwind, Rückweg 78 % Gegenwind |
| T07 180/220/260 W ändern Zeit und Ankunft, Abfahrtsgrenze | **fertig** | E2E: Zeit und Ankunft sinken schrittweise mit der Leistung; Unit: Grenze 60 km/h greift, 0 W ohne Stillstand |
| HF-Modus Rad (persönlich), Pace/HF Laufen und Trail, Tempo/Hm/h/HF Wandern, Hm/h/HF Skitour | **fertig**; ohne Kalibrierung «Unzureichende Daten» | Unit; E2E (Puls-Modus Rad und Trail rechnen mit der Kalibrierung) |
| Persönliche Kalibrierung mit Hold-out (tools/kalibrierung.py) | **fertig** | Python-Tests (synthetisch), echte Auswertung siehe unten |
| Bottom Sheet 3 Zustände (iPhone), Desktop zweispaltig, Tastatur, VoiceOver-Texte | **fertig**; VoiceOver auf echtem iPhone **nicht geprüft** | E2E: Tastatur Home/→ = 200 m, aria-valuetext |
| GPX aus der gerouteten Linie mit Zwischenzielen; Speichern offline wieder aufbaubar | **fertig** | E2E: 108 Trackpunkte = Routenpunkte, 4 Wegpunkte; Laden ohne neue Anfrage |
| Skitour: von Hand gezeichnet, ohne Wegnetz, keine Lawinenaussage, Abfahrt «nicht bestimmbar» | **fertig** | E2E (Tabs ohne Belag/Wegart, Hinweis) |
| Wetter entlang der Route (Open-Meteo, Zustimmung) | **teilfertig**: Code und Oberfläche fertig, **live ungetestet** | siehe T06 |
| Name «Ironman Notebook», eigenes Berg-Symbol | **fertig** (eigenes Symbol, kein Markenlogo) | Smoke-Test aller Tabs |
| FTP-Karten ausgeblendet (Daten bleiben) | **fertig** | Smoke-Test |
| Jahresziele, Serie, Trainingstagebuch, Bestleistungen, Leistungsfähigkeiten, Zonen Monat/Vormonat | **fertig** | Smoke-Test mit echten Daten |
| Protein/Kohlenhydrate pro kg mit Richtwerten | **fertig** (nur 15 Tage mit Protokoll) | Smoke-Test |
| Schwimm-Technikübungen mit eigenen Zeichnungen | **fertig** | Smoke-Test |
| Wetter je Aktivität kopieren (für Strava-Beschreibung) | **teilfertig**: aus Garmin-Wetter (Nacht-Update); automatisches Schreiben nach Strava **blockiert** (kein OAuth/Backend) | – |
| Wetter zu älteren Aktivitäten ohne Garmin-Wetter (Open-Meteo historisch) | **offen** | – |

## Persönliche Kalibrierung (echte FIT-Daten, Hold-out = jüngste 25 %)

Ausgewertet wurden je Modell nur Outdoor-Einheiten mit Sekundenwerten; die jüngsten 25 % der Einheiten sind zurückgehalten und dienen
nur der Fehlerschätzung. Verglichen wird jeweils mit einem konstanten Wert bzw. einer einfachen Distanz-/Höhenmeter-Faustregel.
Ergebnis in Kürze (ohne persönliche Zahlen, diese stehen nur verschlüsselt in `data.enc.json` und auf der Seite unter
«Herkunft, Methode, Annahmen» bzw. bei den Puls-Modi):

| Modell | Ergebnis im Hold-out |
|---|---|
| Rad HF → Watt (konstante 10-min-Blöcke) | besser als konstanter Wert, Fehler wird als Band angezeigt |
| Rad-Physik gegen echte Bewegungszeit (Rennrad, MTB/Gravel) | deutlich besser als die Faustregel; empirische Korrektur verbessert weiter |
| Laufen HF → Flachtempo | leicht besser als konstanter Wert (als «schwacher Zusammenhang» gekennzeichnet) |
| Ganze Läufe (HF-Kalibrierung + Minetti) | deutlich besser als die Faustregel |
| Wandern Tobler × persönlicher Faktor | besser als Tobler ohne Faktor und als die Faustregel |
| Wandern/Skitour HF → Hm/h | nur leicht besser als konstant (als «schwach» gekennzeichnet) |

## Auf dem iPhone selbst prüfen (5 Minuten)
1. Karte › «Route planen» › Rennrad › zwei Punkte setzen → Zustimmung → Linie folgt Strassen (nicht gerade).
2. «＋ Punkt» → zwei weitere Punkte; «⇄» → Route wird neu berechnet (kurz «Route wird berechnet …»).
3. Im Profil mit dem Finger ziehen → Punkt auf der Karte läuft mit; Route in der Karte antippen → Profil springt dorthin.
4. «Belag» › «Asphalt» antippen → alle Asphaltstücke hervorgehoben.
5. Watt mit +/− ändern → Bewegungszeit und Ankunft ändern sich. «Wetter laden» → Wind/Temperatur in den Ansichten.

## Bekannte Grenzen
- brouter.de ist ein freiwilliger, öffentlicher Dienst ohne Verfügbarkeitsgarantie; der Endpunkt ist einstellbar
  (`localStorage` `sf.rt.endpoint`), z. B. für eine eigene BRouter-Instanz.
- Belag fehlt in OSM oft (in den Testrouten 11–33 % unbekannt); er wird nicht geraten.
- Zugang: BRouter sperrt access=no/private und für das Verkehrsmittel verbotene Wege; Pfade ohne Velo-Angabe sind als «Zugang unklar»
  markiert (kantonale Regeln, Signalisation). Temporäre Sperrungen sind nicht enthalten.
- Höhe aus SRTM (BRouter): kurze steile Rampen werden unterschätzt; Maximalsteigung nur bei dichten Höhenpunkten.
- Nicht modelliert: Ampeln, Verkehr, Bremsen vor Kurven (nur Kurvengrenze), Ermüdung, Schnee bei Skitouren.
