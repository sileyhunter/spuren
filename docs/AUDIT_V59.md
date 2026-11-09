# Audit V5.9 – Trainingslast, Morgen-Update, Eingaben, Schwimmen, Bedienung

Auftrag V5.9 vom 9.11.2026 (Entscheide E1–E7 von Silas). Wiederherstellungspunkt: Branch `vor-v59` (= V5.8, d0c8939).
Versionen je Paket: V5.9.1 = Paket 1 … V5.9.5 = Paket 5; gebaut in der Reihenfolge 3 → 5 → 2 → 1 → 4.
Legende: **implementiert** = im Code; **lokal getestet** = Abnahmetests und E2E auf iPhone-Grösse mit erfundenen Daten (hier ohne Internet:
GitHub-API, Garmin-Lauf, brouter.de, Open-Meteo nachgebildet oder nicht erreichbar); **produktiv getestet** = mit echten Daten bzw. am iPhone.

## Paket 3 · V5.9.3 · Eingaben ohne Tippen
| Punkt | implementiert | lokal getestet | produktiv getestet |
|---|---|---|---|
| 3a Morgen-Check-in (befinden-1.1): drei Fragen, je fünf Knöpfe, ohne Speichern-Knopf, krank/verletzt, Notiz | ja | ja (E2E: drei Tipps 0,6 s, Bereitschaft übernimmt das Befinden) | offen (iPhone) |
| 3a Gefühl gegen Morgenwerte ab 20 Morgen (Spearman, |ρ| ≥ 0,3) | ja | ja (test_v59: unter 20 keine Zahlen, HRV erkannt) | offen (braucht 20 Morgen) |
| 3a RPE-Liste und RPE im Explorer ausgeblendet, Daten bleiben | ja | ja | – |
| 3a Morgen-Briefing endet mit «Befinden eintragen» | ja (geplante Aufgabe geändert) | – | offen (nächster Morgen) |
| 3b Direkt speichern (eingang-1.0): EGS1, Delta, Warteschlange, Flugmodus, Fehlermeldungen | ja | ja (test_v59, test_tools, E2E mit nachgebildeter API) | offen (echter Schlüssel, «Verbindung testen») |
| 3b Einspielen und Aufräumen im Update (eingang.mjs, merge_daily.py) | ja | ja (test_tools) | offen (erstes Update mit Eingang) |
| 3b Startorte, Trainingsrouten, gespeicherte Routen auf alle Geräte | ja | ja (test_tools: Route neu und entfernt) | offen |
| 3c Test bestätigen (ganzer Test, Abweichungen sichtbar), Explorer «Laktat hier» bestätigen | ja | ja (E2E: eigene Bestätigungsdatei) | offen |
| 3c Prüfung im Update ohne FIT (check_referenz.py --ohne-fit), Bestätigung bleibt liegen, wenn sie scheitert | ja | ja (mit den echten Daten: 21 von 21 Schwellen) | offen |
