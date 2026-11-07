# Spuren & Formkurve – Gesamtkonzept V1–V5

Stand 8.11.2026. Dieses Dokument fasst die Masteraufträge V1–V5 und die Konzept-PDFs zusammen. Ältere Anforderungen werden nie
gestrichen; V5 geht bei Widersprüchen vor. Beispielzahlen aus PDFs und Grafiken sind erfunden und gehören nie in echte Daten.

## Grundsätze
- **Keine Scheinlösungen:** keine erfundenen Messwerte, keine Knöpfe ohne Datenquelle, Unfertiges als «nicht verfügbar» kennzeichnen.
- **Fehlend bleibt fehlend:** null heisst unbekannt, nie 0; «nicht protokolliert» ≠ «0 konsumiert».
- **Herkunft je Wert:** Messung · FIT-abgeleitet · Wettermodell · berechnet · Nutzerplan · abgeleitet · ungeprüft · manuell.
- **Versionen:** jede Kennzahl trägt die Version ihrer Regel (`versions` in den Daten); Regeländerung = neue Version + `check_referenz.py`.
- **Datenschutz:** Daten verschlüsselt (AES-256-GCM, PBKDF2-SHA256), Eingaben auf dem Gerät verschlüsselt, keine Schlüssel/Tokens/Videos im Repo,
  externe Schreibaktionen (Strava, Garmin-Workouts) nur mit ausdrücklicher Freigabe.
- **Zeit:** Europe/Zurich, Sommerzeit berücksichtigt; Bewegungszeit als Zeitbasis (seit 3.11.2026).

## Navigation
Karte · Heute · Kalender · Fortschritt · Laktat & Zonen · Ausdauer · Leistung · Schwimmen · Körper.

## Module
### V1 Karte und Fortschritt
- Heatmap mit Filtern und Spurwahl (unverändert), thematische Ebenen mit Klick-Abfrage (Skitouren, Schneeschuh, Wildruhezonen,
  Jagdbanngebiete, Wildschutzgebiete GR; V5 zusätzlich Wanderwege, Veloland, MTB-Land, Wanderland), Trefferliste, Hervorhebung, GPX.
- Fortschritt: Jahresstatistik, Jahre im Vergleich, Wochenumfang, Trainingslast, Zonenverteilung, Datenbasis/Prüfung.
### V2 Routen, Wetter, Fahrzeit
- Luftlinien-Planer mit Höhenprofil (vorhanden). Echtes Routing für Rennrad, Gravel, MTB, Lauf, Trail, Wandern: **offen** (Anbieterentscheid).
- Rad-Fahrzeit aus der Leistungsbilanz `η·P = [m·g·(sin θ + Crr·cos θ) + ½·ρ·CdA·(v − w)·|v − w|]·v`, Abfahrt begrenzt, Spanne aus Wind.
### V3 FIT, Wetter, CdA, Stufentest-Eingabe
- Stufen aus Sekundenwerten (stufen-1.0), Zeitbegriffe (zeit-1.0), Laktat-Vorschau mit Quelle je Wert (laktat-vorschau-1.0).
- Wetter je Outdoor-Aktivität: Garmin-Wetter (Station) mit Qualitätsangabe; entlang der Spur (Open-Meteo) offen.
- CdA: virtuelle Höhe nach Chung, A-B-A, Ergebnis «geschätzt».
### V4 helles Design, Einzel-Laktat, Schwimmtechnik
- Hell, Petrol/Koralle; Laktat-Explorer; Test starten am Handy mit Offline-Entwurf; Schwimm-Video-Coach lokal.
### V5 Zonen, Readiness, Langdistanz, Koppelläufe, Fueling
- **Laktat & Zonen:** Testkurven aus echten Stufen, Einzelpunkte einzeln; LT1/LT2 nur aus gültigen Stufentests:
  LT1 SOMC / Basis + 0,5 / log-log, LT2 Dickhuth, Dmax nur bei Ausbelastung, 2/4 mmol nur Orientierung; 80/95-%-Bänder.
  Zonen-Cockpit mit vier unabhängigen Skalen; Zonenprofile versioniert, Freigabe von Hand, nie automatisch aus LT1/LT2.
- **1–6 h:** Band aus eigenen Fahrten (gleiches System, gleichmässig, Entkopplung), sonst «nicht bestimmbar» + Szenario; nie FTP-Prozent.
- **Bereitschaft:** HRV (7 Tage gegen eigene 60/28-Tage-Referenz, ±0,5 SD), Ruhepuls, Schlaf, Last, Befinden, Krankheit →
  bereit / normal / vorsichtig / nicht beurteilbar mit Gründen; Vorschlag, den du übersteuern kannst; kein Diagnoseinstrument.
- **Koppelläufe:** Rad → Lauf 0–45 min (einstellbar), Auswahl bei mehreren Kandidaten, Abschnitte, Solo-Vergleich nur wenn vergleichbar.
- **Fueling:** Ereignisse mit Anteil, Produkte als Vorlagen, Raten aus aktiver Dauer, GI-Verlauf ohne Kausalbehauptung.

## Datenmodell (V5)
`zonen` (Profile) · `schwellen` (je Test und Methode) · `befinden` · `koppel` · `fueling` · `fueling_produkte` · `langfahrt_plaene` ·
`test_entwuerfe` · `schwimm_analysen` · `audit` · je Aktivität zusätzlich `t0`, `dr`, `sp`, `wx`. Migration: `tools/migrate_v5.py`
(Sicherung, Rückweg). Eingaben kommen über den verschlüsselten Export und `tools/eingaben.mjs` in die Daten.

## Offen und nächste Schritte
1. Schritt B1: Laktat-Vorschauen bestätigen (in der Testbibliothek «Bestätigen», dann Export) → Schwellen «bestätigt».
2. Routing-Anbieter wählen (BRouter, GraphHopper oder openrouteservice) und Nutzungsbedingungen klären; dann R1–R4.
3. Wetter entlang der Spur mit Open-Meteo (nicht kommerziell, Quelle sichtbar) als Ergänzung zur Garmin-Station.
4. Nächster ausbelasteter Stufentest (Dmax gültig) und danach neue Zonenversion mit deiner Freigabe.

Änderungen: `CHANGELOG.md`. Prüfbericht: `docs/abnahme-v5.md`.
