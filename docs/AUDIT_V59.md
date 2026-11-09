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

## Paket 5 · V5.9.5 · Einfacher bedienen (E7: ja, als zweites Paket)
| Punkt | implementiert | lokal getestet | produktiv getestet |
|---|---|---|---|
| Start auf «Heute»: Check-in, Heute geplant, Bereitschaft in einem Satz, diese Woche | ja | ja (E2E 390 × 844: alle drei oben sichtbar; 390 × 664 im Browser: Bereitschaft knapp darunter) | offen (iPhone) |
| Leiste unten mit 5 Bereichen, Unterbereiche, im Planer ausgeblendet | ja | ja (E2E: jeder Bereich mit einem Tipp, Planer ohne Leiste) | offen |
| Info-Knopf je Karte, «Erklärtexte immer zeigen» | ja | ja (E2E: 34 Erklärungen versteckt, per Knopf sichtbar) | offen |
| Breite Tabellen als Liste (zuerst Geplant/Ist, Ermüdung, Saison) | ja (alle zu breiten Tabellen) | ja (E2E: keine zu breite Tabelle mehr) | offen |
| Ausblenden statt löschen, wieder einblendbar | ja (Einstellungen) | ja | – |
| demo.html mit gleicher Navigation | ja | ja | – |

## Paket 2 · V5.9.2 · Morgen-Update (E3: täglich 08:30, nur lesend)
| Punkt | implementiert | lokal getestet | produktiv getestet |
|---|---|---|---|
| Abschnitt «Morgen-Update» in CLAUDE.md (nur lesend, keine Aktivitäten/FIT/Reihen, Commit «Morgen-Update …») | ja | – (Ablauf; Teile wie im Nacht-Update) | offen (erster Lauf 10.11. 08:30) |
| Geplante Aufgabe täglich 08:30 | ja | – | offen (drei Morgen prüfen) |
| «Heute geplant» mit Zielen aus den Schritten, Quelle, «Passende Route finden»; ohne Workout «noch kein Workout (Stand …)» | ja | ja (E2E mit erfundenem Workout) | offen |
| Ringe und Bereitschaft mit Morgenwerten und Uhrzeit des Stands | ja | ja (E2E: «Morgenwerte von heute · Stand 08:31 (Morgen-Update)») | offen |
| Nacht-Update danach ohne Doppel | ja | ja (test_tools) | offen |
| Fehlgeschlagener Morgenlauf lässt data.enc.json unverändert | ja (nichts committen) | – | offen |

## Paket 1 · V5.9.1 · Trainingslast richtig rechnen (E1: LT2, vorläufig bis zum neuen Test; E2: alle Sportarten)
| Punkt | implementiert | lokal getestet | produktiv getestet |
|---|---|---|---|
| Feld `tl2` neben `tss`, Rad NP gegen LT2 aus `config.last_ref`, nie FTP, keine Umrechnung zwischen Leistungsmessern | ja (`tools/last.py`) | ja (test_tools mit erfundener Fahrt, ± 1) | ja (echte Daten, lokal: Fahrt 8.11. = Abnahmewert aus dem Auftrag ± 1) |
| Je Datum der letzte Test davor; vor dem ersten Test der erste, gekennzeichnet; Referenz «vorläufig» | ja | ja (test_tools, test_v59) | ja (Referenz aus dem Test 29.4.2026, vorläufig) |
| `tss` aller 1776 Aktivitäten unverändert | ja | ja | ja (Vergleich mit der Sicherung; check_referenz «GESAMT: bestanden») |
| Fitness, Ermüdung, Form, Ring, Bereitschaft zählen alle Sportarten (auch Wandern) | ja (unverändert) | ja | ja |
| Wochenlast je Sportart in Farbe | ja (Fortschritt) | ja (E2E 390 × 844, 1280 × 900) | offen (iPhone) |
| Vergleich alt → neu je Woche und Sportart, 12 Wochen | ja (Seite und `last.py --vergleich`) | ja | ja (Tabelle an Silas) |
| Umschalten `config.load_model = "last-2.0"` erst nach Silas' Okay | vorbereitet (Seite rechnet in beiden Modi; E2E beide) | ja | offen (Okay von Silas) |
| Nacht-Update rechnet `tl2` für neue Einheiten | ja (`merge_daily.py`) | ja (test_tools) | offen (nächste Nacht) |

## Paket 4 · V5.9.4 · Schwimmen – nur der CSS-Test zählt (E6)
| Punkt | implementiert | lokal getestet | produktiv getestet |
|---|---|---|---|
| Testkalender: fünf CSS-Termine (19.11., 7.1., 11.2., 25.3., 13.5.), «geplant», erledigt bis 4 Tage daneben | ja (Daten und Seite) | ja (test_v59, test_tools, E2E) | ja (Termine in den Daten) |
| «Meine Entwicklung» und Schwimmen: CSS einziger Fortschrittswert, Rohpace ausgeblendet | ja (auch Jahresstatistik) | ja (E2E: CSS-Kachel unter «Alle Sportarten» und «Schwimmen») | offen (erster echter Test 19.11.) |
| Eintragen mit zwei Zeiten über «Direkt speichern» | ja | ja (E2E ohne Schlüssel; test_tools: CSS vom Handy bis `css_tests`) | offen (iPhone, mit Schlüssel) |
| CSS = (T400 − T200) ÷ 2 pro 100 m | ja (unverändert, `FK.css`) | ja | – |
| Technik nicht auf der Seite; Videovergleich und Fehlerboard ausgeblendet, Daten bleiben | ja (seit V5.9.5) | ja | – |
| Abnahme: erster CSS-Test nach dem nächsten Update in den Daten und in «Meine Entwicklung» | Weg vorbereitet | ja (lokal) | offen (nach dem Test am 19.11.) |
| Nebenbei: Quelle der Ermüdungs-Kacheln (`quelle()` in js/v55.js) | ja | ja | – |

