## Prüfen vor jedem Push von Seite oder Werkzeugen
Steht jetzt im Kern (`CLAUDE.md`, Abschnitt «Prüfen vor jedem Push von Seite oder Werkzeugen») – dort nachführen, nicht hier verdoppeln.

## Test-Workouts (A9)
`python3 -I tools/workouts.py <ordner>` erzeugt `.zwo` (Zwift, ftpOverride 100 → Power 1.2 = 120 W) und `.garmin.json`
(für `upload_workout`, Leistungsbereich `power.between`, eine Runde je Stufe). Seit V9.10.0 auch **Lauf-Stufentest** (`pace.zone`, 9 Stufen 10,3–18,3 km/h, 270 s, Tastenpausen für Laktat) und **CSS-Test 400/200** (nur `.garmin.json`; Namen «IN · …»). **Nie ohne Silas' Freigabe hochladen,
einplanen oder an ein Gerät senden.** Mit Freigabe: `upload_workout` → `schedule_workout(Datum)`; enduco-Workouts nie ändern.

## Referenzsatz und Versionen (A1)
Der Referenzsatz (10 Einheiten mit Handwerten) liegt nur verschlüsselt in `data.json` unter `referenz`, nie offen im Repo.
Jede Kennzahl hat eine Version (`versions`). Ändert sich eine Regel: Version erhöhen, `check_referenz.py` laufen lassen,
Abweichungen Silas zeigen, erst dann neue Werte speichern.

