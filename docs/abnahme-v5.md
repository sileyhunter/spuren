# Abnahme V5 – Prüfbericht (8.11.2026)

Gezählt wird nur, was ein dokumentierter Test zeigt. Testdaten in `tests/` sind frei erfunden; Prüfungen mit echten
Daten laufen verschlüsselt (`tools/check_referenz.py`) und stehen hier ohne persönliche Werte.

## Status je Modul

| Modul | Status | Nachweis | Was noch fehlt |
|---|---|---|---|
| Laktat-Hauptdiagramm, Einzelpunkte, Detailfeld | fertig | Node: «Einzelmessung …», Smoke-Test, Screenshots | Bestätigung der Werte durch Silas (B1) |
| Zonen-Cockpit (4 Skalen, Popover, Aktuell/Voriger/Vergleichen) | fertig | Node: «Cockpit …», Playwright Klick + Escape, Screenshots Desktop/iPhone | – |
| Schwellen je Methode, Unsicherheit, LT-Verlauf | fertig | Python: «Schwellen …»; check_referenz 21/21 gegen die Auswertung | Freigabe der Methodik (B1) |
| Zonenprofile versioniert | fertig | Python: «Zonen ohne Freigabe nicht übernommen» | neue Zonen erst nach dem nächsten Test und deiner Freigabe |
| Testbibliothek | fertig | Smoke-Test, Screenshot | – |
| Test erfassen am Handy, offline, FIT-Abgleich | teilweise | iPhone-Test: 7 Werte erfasst, nach Neuladen erhalten; FIT-Leser mit synthetischer Datei | Abgleich mit einer echten Zwift-FIT-Datei auf dem iPhone |
| Bereitschaft | fertig | Node: 10 Fälle (fehlende HRV, 1 Tag HRV, Ausreisser, 4 Nachtdienste, Schlafdefizit, Stress, Last, Krankheit, 0 Ruhepuls, Müdigkeit) | Befinden musst du selbst eintragen |
| 5-h-/1–6-h-Zielbereiche | fertig | Node: «5 h …» (nicht bestimmbar, Band, Indoor/Outdoor getrennt, Plan-Ist) | Wetter und Höhe je Abschnitt fehlen in den Daten |
| Koppelläufe | fertig | Node: 0/8/45/46 min, 10:45/10:46, zwei Läufe, Mehrsport, ohne NP, 40-min-Lauf, manuell | – |
| Fueling | fertig | Node: 80 g/h, halbe Flasche, Gel + Getränk, unbekannt ≠ 0, Untergrenze, GI Minute 195; Python: Import ohne Doppel, Korrektur mit Audit; E2E | Einträge von dir |
| Eingaben verschlüsselt, Export, Einspielen | fertig | E2E: Entsperren, Eingabe, Export verschlüsselt, `tools/eingaben.mjs`, `merge_daily.py` | – |
| Offline (Service Worker) | fertig | E2E: offline neu geladen, Daten mit gespeichertem Schlüssel geöffnet | Prüfung in Safari auf dem iPhone |
| Helles Design, Navigation | fertig | Screenshots Desktop und iPhone | – |
| Datenmodell V5, Migration, Rückweg | fertig | Python: Migration wiederholbar, Rückweg; check_referenz: alle Aktivitäten unverändert | – |
| Rad-Fahrzeit (Physik) | fertig | Node: Ebene, 8 %, Abfahrt begrenzt, Gegen-/Rückenwind, 0 W | echte Routen (Routing) fehlen, Planer nutzt Luftlinie |
| CdA A-B-A | teilweise | Node: bekanntes CdA aus synthetischen Daten wiedergefunden, A-B-A erkennt Unterschied | Feldtest mit echter FIT-Datei |
| Schwimm-Video-Coach | teilweise | Smoke-Test, Marken/JSON in der Oberfläche | Test mit echtem Video auf dem iPhone |
| Wetter je Aktivität | teilweise | 7 Aktivitäten mit Garmin-Wetter, Stationsqualität | Garmin meldet Flugplatz-Stationen (oft weit weg); Wetter entlang der Spur (Open-Meteo) nicht umgesetzt |
| Kartenlayer-Klick (Wanderwege, Veloland, MTB-Land, Wanderland) | teilweise | gleiche Abfrage wie Skitouren | Live-Test gegen geo.admin.ch (hier kein Netz) |
| Routing (Rennrad, Gravel, MTB, Lauf, Trail, Wandern) | blockiert | – | Entscheid Anbieter und Schlüssel, Netztest |
| Wetter entlang geplanter Routen, Wind-ETA | blockiert | – | hängt am Routing |
| Strava-Wetterblock | blockiert (aus) | – | OAuth-Freigabe durch dich; Schreiben bleibt aus |

## Abnahmefälle aus `ABNAHMETESTS_V5.md`

| Fall | Ergebnis | Test |
|---|---|---|
| Test mit mehreren Methoden: Punkte und Methodenergebnis getrennt | bestanden | Methodentabelle + Diagramm; Python «LT1 vor LT2» |
| Unvollständiger Radtest: LT2 null, «nicht bestimmbar», keine erfundene Kurve | bestanden | Python «Test ohne gültige LT2»; Node «Cockpit …» |
| Pace 6:30 links, 4:15 rechts | bestanden | Node «Pace links langsam …» |
| Sportwechsel: keine Radzonen als Laufzonen | bestanden | Node «Radzonen werden nie als Laufzonen verwendet» |
| Einzelmessung anklickbar, kein Segment, keine Schwelle | bestanden | Node «Einzelmessung …» |
| 5 h ohne Vergleichsdaten: null + «nicht bestimmbar» | bestanden | Node «5 h: keine verlässlichen …» |
| Indoor gegen Outdoor, Leistungsmesser getrennt | bestanden | Node «Indoor und Outdoor …» |
| Plan-Ist: Ø W, NP, Puls mit Drift getrennt | bestanden | Node «Plan-Ist …» |
| HRV nur 1 Tag → kein sicherer Status | bestanden | Node |
| Erschöpft + HRV normal → nicht «bereit» | bestanden | Node |
| Krankheit → kein Hochintensitäts-Vorschlag | bestanden | Node |
| 0 Ruhepulsmessungen → unbekannt, nicht 0 | bestanden | Node |
| Koppellauf 10:45 ja, 10:46 nein | bestanden | Node (Ortszeit, Sommerzeit) |
| Zweiter Lauf am Tag → auswählen | bestanden | Node |
| Ohne Watt kein NP | bestanden | Node |
| 150 min, 200 g → 80 g/h | bestanden | Node |
| Flasche 80 g, 50 % → 40 g | bestanden | Node, E2E |
| Gel 25 g + Getränk 40 g → 65 g, keine Doppelzählung | bestanden | Node |
| Fehlende Erfassung = unbekannt | bestanden | Node |
| GI bei Minute 195 gegen die Aufnahme davor | bestanden | Node |
| Heatmap/Kartenlayer weiterhin funktionsfähig | bestanden (ohne Netz) | Smoke-Test ohne Fehler; Klick-Abfrage unverändert, Live-Test offen |
| Beispielfixtures nie in echte Daten | bestanden | Demo-Daten nur in `demo.html`; Demo-Export wird von `eingaben.mjs` abgelehnt |
| Import wiederholbar ohne Doppel | bestanden | Python «zweiter Import ohne Doppel», «zweite Bestätigung ohne Doppel» |
| Kein Token, kein Passwort, keine Klartextdaten im Repo | bestanden | Python «Repo: …» (3 Prüfungen) |

## Ende-zu-Ende (Playwright, Chromium)
1. Seite mit echter, verschlüsselter Datei entsperren → Tresor aktiv.
2. Ausdauer › Fueling: Produkt anlegen, 2 × Gel, Flasche 80 g zu 50 %, Magen-Darm Minute 95 → 90 g, Rate aus der Einheit.
3. Gespeichert verschlüsselt (kein Klartext im Speicher).
4. Heute › Befinden Müdigkeit 4 → «Vorsicht bei Intensität».
5. Export → Datei verschlüsselt → `tools/eingaben.mjs` → `merge_daily.py`: 1 Fueling, 1 Befinden.
6. Service Worker aktiv → offline neu laden → Daten offen, Eingaben noch da.

## Regression
- `tools/check_referenz.py`: Referenzsatz 10/10, Bewegungszeit, Stufen, Schwellen 21/21, alle 1759 Aktivitäten unverändert: **bestanden**.
- Alle Bereiche (Seite und Demo) ohne JavaScript-Fehler geöffnet.

## Grenzen dieser Prüfung
- Chart.js und MapLibre sind aus dieser Arbeitsumgebung nicht erreichbar: Diagramme wurden mit einem einfachen Testzeichner gerendert,
  die Konfiguration aber gegen Chart.js 4.4 geschrieben. Erste Sichtprüfung auf dem iPhone in Safari steht aus.
- Externe Dienste (geo.admin.ch, Open-Meteo, Routing) konnten nicht live geprüft werden.
