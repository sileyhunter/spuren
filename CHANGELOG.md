# Änderungen

## V5.5 · 8.11.2026 · Prüfbare Aussagen statt Rohdaten-Urteile
Grundlage: Auftrag V5.5 (Vorrang vor älteren Fassungen). Bestands- und Lückenmatrix sowie Ergebnis je Befund: `docs/AUDIT_V55.md`.
Offene Punkte (nur diese gehen in die nächste Änderungsdatei): `docs/offen-nach-v55.md`.

### Korrektur F1 · 8.11.2026 · fehlende Wetterwerte bleiben unbekannt
Befund aus dem Prüfbericht V5.5 (lokal gefunden): Fehlten in der Open-Meteo-Antwort Windwerte, rechnete die Seite Windstille
(in JavaScript ergibt `null × sin(…)` den Wert 0). Behoben in `js/route.js` (Wetterfeld, Fahrzeit) und `js/routen-ui.js` (Anzeige).

| Regel | vorher | jetzt | Änderung |
|---|---|---|---|
| Wetter (Routenplaner) | `wetter-rt-1.1` | `wetter-rt-1.2` | 0 km/h nur bei gemeldeter Windstille (gültiger Wert, ohne Richtung); fehlt Geschwindigkeit oder Richtung, sind Gegen-/Rückenwind unbekannt; Wind wird nie mit dem Nachbarwert gefüllt (fehlt ein Nachbar mit Gewicht, bleibt unbekannt) |
| Zeit (Routenplaner) | `zeit-rt-1.1` | `zeit-rt-1.2` | Abschnitte mit unbekanntem Wind ohne Wind gerechnet und gezählt; Hinweis «Wind nicht berücksichtigt» mit Grund; Band dort mit ±2 m/s (±7 km/h) Gegen- bis Rückenwind, wie ohne Prognose; Temperatur unbekannt → 15 °C, Niederschlag unbekannt → trocken, beides als Hinweis |

Anzeige: «Wind unbekannt», «Wind 18 km/h (Richtung unbekannt)», «windstill (0 km/h)», «Temperatur unbekannt», «Regen unbekannt»;
Wetterstreifen mit Lücken statt 0 und «Lücken = unbekannt (… %)»; «trocken» nur, wenn überall Niederschlagswerte vorliegen;
keine Windpfeile ohne Richtung. Geprüft: 7 neue Tests in `tests/test_route.cjs`, Planer lokal im Browser (7 Fälle, siehe
`docs/AUDIT_V55.md`); Routenplanung, Trainingsdaten und Dashboards unverändert (Regressionstests gleich wie vorher).
Produktiv (brouter.de, Open-Meteo) **nicht getestet**.

**Neue und geänderte Regelversionen**

| Bereich | vorher | jetzt | Was sich ändert |
|---|---|---|---|
| Form (Fitness/Ermüdung/Form) | – (unversioniert) | `pmc-2.0` | Form = Fitness − Ermüdung desselben Tages; die alte Konvention (Werte von gestern) nur als Zusatz «vor der Last von heute» |
| Zonenverteilung | – (Garmin-Zonen aller Sportarten addiert) | `zonenverteilung-2.0` | je Sportart, Zonen gültig je Datum (nur freigegebene Profile), Nenner = Pulszeit mit gültigen Schwellen, Garmin-Zonen nur blass und nicht beurteilt, Hypothese statt Warnung |
| Puls zu Watt/Pace (Power-HR) | Ganz-Fahrt-Mittel | `eb-1.0` (Blöcke), `entwicklung-1.0` (Urteil) | nur gleichmässige 10-min-Blöcke ab Minute 10 (Rad 190–210 W je System, Laufen 5:20–5:40/km flach); Urteil mit n, Bootstrap-Intervall, Guards (Hitze, Höhe, Drift, Ausreisser), mind. 3 je Zeitraum |
| Lauf-Effizienz | «m/min pro Herzschlag» | `laufeffizienz-1.0` | Einheit m/Schlag, Ausreisser gezählt und ausgewiesen |
| Koppellauf | `koppel-1.0` | `koppel-1.1` | Fenster und lange Pausen getrennt, Pace und Puls in getrennten Grafiken |
| Lange Ausfahrt | – | `langfahrt-orientierung-1.0` | Orientierung aus eigenen Fahrten, wenn die Prognose «nicht bestimmbar» ist |
| Zeit (Routenplaner) | `zeit-rt-1.0` | `zeit-rt-1.1` (seit F1: `zeit-rt-1.2`) | Pausen je Zwischenziel; Fehlerband nach Population (Länge, Hm/km, Steigungsklasse) |
| Wetter (Routenplaner) | `wetter-rt-1.0` | `wetter-rt-1.1` (seit F1: `wetter-rt-1.2`) | Wetterzeit nach Pausen verschoben; Windpfeile = Herkunft + 180° |
| Varianten (Routenplaner) | – | `varianten-1.0` | «Schnell / Weniger Verkehr / Ruhig» nur über das erlaubte Rennradprofil, Fazit mit Hauptstrassenanteil |
| Kalibrierung | `kalibrierung-1.0` | `kalibrierung-1.1` | Hold-out-Population und Fehler je Steigungsklasse |
| CSS | – | `css-1.0` | (T400 − T200) ÷ 2, von Hand gestoppt, korrigierbar |
| Fueling-Quellen | – | `fueling-quellen-1.0` | geprüfte Garmin/FIT-Quellen, nichts geschätzt |
| Zeitbegriffe | `zeit-1.0` | `zeit-1.0` (unverändert) | Anzeige: Jahresziele und Vorjahr in Bewegungszeit, Timer getrennt ausgewiesen |
| Stufen | `stufen-1.0` | `stufen-1.0` (unverändert) | – |
| Schwellen | `schwellen-1.0` | `schwellen-1.0` (unverändert) | Trend je Protokoll getrennt (Darstellung) |

**Neu**
- Fortschritt beginnt mit «Meine Entwicklung»: drei Antworten (verbessert, stabil/unklar, als Nächstes prüfen), Kacheln je Kennzahl,
  Messpunkte mit Referenz, Rechennachweis als Export («Daten & Methode», ohne Geheimnisse).
- Ausdauertrend je Kalenderjahr, Lauf-Effizienz, Langfahrt-Orientierung, Koppellauf mit synchronen Einzelgrafiken und Abschnittstabelle.
- Routenplaner: Varianten mit Hauptstrassenanteil, Pausen je Zwischenziel, Windpfeile, Wetter im eigenen Streifen, Startzeit oben,
  Wintersperren-Hinweis, Fehlerband nach Population.
- Schwimmen: CSS-Test zuoberst, Fehlerboard, Video-Coach-Status, Rohpace nur als Rohdaten.
- Fueling: leerer Zustand statt leerem Plot, «Import prüfen» mit den geprüften Quellen.
- Logo und App-Icon von Silas; Markenhinweis in der Fusszeile.

**Geändert**
- Heute ohne Ringe: Bereitschaft mit Datenqualität (fehlende Nacht sichtbar), HRV, Ruhepuls und Schlaf als drei kleine Grafiken.
- Ebenen je Tab (Methode und Details eingeklappt), Tab-Leiste mit Hinweis auf weitere Tabs, Touch-Flächen ≥ 44 px, breite Tabellen
  mit Wischhinweis; Rennen kompakt; Serie nachrangig.
- Laktat: Kopfzeile ohne alte Aufschrift, Filter und Messkontext, Trend je Protokoll.

**Daten** (verschlüsselt, alle 1759 Aktivitäten aus dem FIT-Export unverändert, `check_referenz.py`: GESAMT bestanden)
- `eb` (gleichmässige Blöcke) für die passenden Aktivitäten, `kalibrierung.*.population`, `fueling_quellen`.
- Sicherungen vor jeder Datenänderung in `work/backup/` (nicht im Repository); Rückweg: Sicherung zurückkopieren, verschlüsseln, committen.

## V5.3 · 8.11.2026 · Ironman Notebook
Grundlage: Masterauftrag V5.3 (Vorrang vor V5.2/V5.1), Konzept V5.3, Interaktionsvorlage (nur Verhalten, keine Daten). Prüfbericht: `docs/abnahme-v53.md`.

**Neu**
- Routenplaner mit echtem Routing (BRouter, OSM-Wegnetz): Sportprofile Rennrad, Gravel, MTB (Standard Forst-/Kieswege, Schalter
  «Technische Trails»), Laufen, Trail, Wandern (SAC-Grenze), Skitour (von Hand gezeichnet, ohne Wegnetz). Zwischenziele setzen,
  ziehen, löschen, umsortieren, «Zwischenziel hier», Rundtour, Rückgängig; Umkehren routet neu (Einbahnen). Fehler werden erklärt,
  nie durch eine Luftlinie ersetzt; GPX nur aus der gerouteten Linie. Zustimmung vor dem ersten Senden von Koordinaten.
- Ein Zustand für Karte und Profil (Kettenmass distanceAlong_m): Route antippen/Maus darüber → Profil; im Profil tippen/ziehen
  (Finger, Maus, Pfeiltasten) → Punkt auf der Karte; Cursor auf der Karte entlang der Route ziehen.
- Analyse: Höhe (Steigungsklassen), Anstiege und Abfahrten (Listen, klickbar, Zoom), Wegart, Belag, Zugang, Temperatur, Regen,
  Wind (Gegen-/Rückenwind je Abschnitt), Tempo; km und % inkl. «unbekannt»; Kategorie antippen hebt alle Stücke hervor.
- Intensität am Profil: Watt oder Puls (Rad), Pace oder Puls (Laufen/Trail), Tempo, Hm/h oder Puls (Wandern), Hm/h oder Puls
  (Skitour); Bewegungszeit mit Band, Ankunft je Wegpunkt, Pausen getrennt, Startzeit; Wetter je Abschnitt zur Durchfahrtszeit.
- Persönliche Kalibrierung aus FIT-Daten mit Hold-out (`tools/kalibrierung.py`, kalibrierung-1.0); ohne genügend Daten
  «Unzureichende Daten». Empirische Korrektur der Rad-Physik aus den eigenen Fahrten.
- Bottom Sheet mit drei Höhen auf dem iPhone, Desktop zweispaltig.
- Name «Ironman Notebook» mit eigenem Berg-Symbol (Titel, Kopfzeile, Home-Bildschirm, Manifest).
- Fortschritt: Jahresziele (Ringe, eigene Ziele), Serie, Trainingstagebuch, Bestleistungen (Laufen aus FIT, `tools/bestleistungen.py`;
  Rad beste Watt je Dauer), Leistungsfähigkeiten (8 Wochen gegen Bestwert), Zonen Monat gegen Vormonat.
- Körper: Kohlenhydrate und Protein pro kg gegen Richtwerte je Trainingsumfang.
- Schwimmen: Technikübungen mit eigenen Zeichnungen, Ablauf und typischen Fehlern.
- Aktivitäten mit Garmin-Wetter: «Wetter kopieren» (Text für die Strava-Beschreibung).

**Geändert**
- Karten «Trainingslast: Garmin-FTP oder geschätzte FTP» und «Rad: FTP und Watt/kg» ausgeblendet (Daten und Werkzeuge bleiben).
- Alte Luftlinien-Routen aus «Meine Routen» werden beim Bearbeiten als Wegpunkte geroutet (≤ 25 Punkte) oder als gezeichnete Linie geöffnet.
- Je Aktivität bleibt die Leistungskurve (`pdc`) erhalten (Import und Nachfüllen).

## V5 · 8.11.2026
Grundlage: Masterauftrag V5 und Konzept V5 vom 7.11.2026. V1–V4 bleiben erhalten; Rückweg: Branch `vor-v5`.

**Neu**
- Laktat & Zonen: Testkurven aus echten Stufenpunkten, Einzelmessungen als einzelne, anklickbare Punkte; Detailfeld mit Aktivität,
  Block, Ziel/Ist, Puls Ø/max, Dauer, Quelle und Qualitätshinweisen; Liste aller Punkte für Tastatur und Screenreader.
- Zonen-Cockpit: vier unabhängige Skalen (Rad Watt, Rad Puls, Lauf Pace links langsam → rechts schnell, Lauf Puls) mit LT1/LT2
  je Test, Popover mit Grenzen, Methode, Quelle, Datum, Status; Ansichten Aktuell, Voriger Test, Vergleichen.
- Schwellen je Methode (`tools/schwellen.py`, schwellen-1.0): SOMC, Basis + 0,5, log-log, Dickhuth; Dmax nur bei Ausbelastung;
  2/4 mmol/l nur Orientierung; 80-/95-%-Bänder aus der Messunsicherheit; LT1/LT2-Verlauf je Sportart und Protokoll.
- Zonenprofile versioniert (zonen-1.0) mit Freigabe und Gültigkeit; nie automatisch aus LT1/LT2.
- Testbibliothek mit Filtern, «Als Vorlage», «Archivieren», «Bestätigen» (Schritt B1 über den Export).
- Test erfassen am Handy: Vorlagen, grosse Eingabefelder, Entwurf verschlüsselt und offline, FIT-Datei im Browser lesen,
  Stufengrenzen verschieben, Werte je Stufe mit «prüfen»-Hinweisen.
- Bereitschaft (readiness-1.0): bereit / normal / vorsichtig / nicht beurteilbar mit 2–4 Gründen, ohne Prozentwert; Befinden,
  Krankheitszeichen, Nachtdienst; Verlauf 21/42 Tage mit HRV-Referenzband; eigene Entscheidung speicherbar.
- Lange Ausfahrt 1–6 h (langfahrt-1.0): Watt- und Pulsband aus eigenen Fahrten (Dauer, System, Gleichmässigkeit, Entkopplung),
  sonst «nicht bestimmbar» und Szenario von Hand; Plan gegen Ist mit Ø Watt, NP und Puls 1./2. Hälfte getrennt.
- Koppelläufe (koppel-1.0): Rad → Lauf mit 0–45 min Wechsel (einstellbar), koppeln/trennen, Abschnitte 0–5/5–10/10–20 min,
  Solo-Vergleich nur bei vergleichbaren Läufen.
- Fueling / Train your Gut (fueling-1.0): Produkte, Ereignisse mit Anteil, GI-Beschwerden 0–5, g/h, ml/h, mg Na/h aus aktiver Dauer;
  «nicht protokolliert» ≠ 0; 30-min-Blöcke; Magen-Darm gegen die Aufnahme davor (ohne Kausalbehauptung).
- Rad-Fahrzeit aus der Leistungsbilanz (eta-1.0) für Planer-Route, GPX oder Prüfstrecke; Aerotest CdA A-B-A (cda-1.0);
  Schwimm-Video-Coach lokal mit Marken, Winkeln, Lernbausteinen.
- Wetter je Aktivität aus Garmin mit Stationsqualität (wetter-1.0); Kartenklick auch für Wanderwege, Veloland, MTB-Land, Wanderland.
- Eingaben auf dem Gerät verschlüsselt (gleicher Schlüssel wie die Daten), Export/Import, `tools/eingaben.mjs`; Service Worker offline.
- Kennzahlen je Aktivität: `t0`, `dr`, `sp` (ausdauer-1.0); `tools/nachfuellen.py`; `tools/migrate_v5.py` mit Sicherung und Rückweg.

**Geändert**
- Helles Design (Petrol/Koralle, dünne Linien), Navigation neu gruppiert; «Training» heisst «Fortschritt».
- «Erholung %» ersetzt durch die Bereitschaft ohne Prozentmodell (V5 verlangt keine Scheingenauigkeit).
- Zonenverteilung nutzt das aktive Zonenprofil statt LT2 = 4 mmol/l.
- Laktat-Kurzchecks und Testzentrum stehen unter «Laktat & Zonen», die Schwimmpace unter «Schwimmen».

**Offen** siehe `docs/abnahme-v5.md` (Routing, Wetter entlang Routen, Strava, Live-Prüfung der Kartenabfragen).
