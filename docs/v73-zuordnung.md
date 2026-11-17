# V7.3 – Zuordnung des Auftrags «wie enduco» (16.11.2026)

Grundlage: Silas' Auftrag V7.3 (Bildschirmaufnahme der enduco-App vom 16.11.2026 und vier Bildschirmfotos der Planeinstellungen, verglichen mit
der Seite Stand V7.2). Video, Bilder und der Auftrag selbst (mit echten Werten) liegen **nicht** im Repository; hier steht nur die Zuordnung,
ohne Werte. Übernommen werden Aufbau, Reihenfolge, Antipp-Verhalten und Farbsprache – keine Texte, Fotos, Logos, Symbole oder Workouts von enduco.
Gebaut wird Etappe für Etappe, jede erst nach Silas' Okay.

## Etappen

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | Einheit wie Trainingsbriefing, mit allen Schritten (`schritte-1.0`, `einheit-2.0`, `einheit-felder-1.0`, `einheit-anpassen-1.0`, `rpe-zonen-1.0`) | V7.3 |
| 2 | Schwimm-Einheiten mit Technikübungen an Garmin (`garmin-senden-1.1`); Puls- und RPE-Ziele auf der Uhr | V7.3.1 (auf der Uhr noch nicht geprüft) |
| 3 | Planeinstellungen: Basis-Fitness je Sportart, Steigerung (ein Regler für alle drei Sportarten), Indoor-Phase, Schwimm-Equipment, Bahnlänge, Stile | offen |
| 4 | Kalender mit Zwei-Wochen-Raster und durchlaufender Liste, Zyklus, Bearbeiten-Modus, Tagesblatt; Aktivitäten draussen im Voraus planen (`aktivitaet-plan-1.0`) | offen |
| 5 | Heute, Navigation, Training planen mit Kategorien | offen |
| 6 | Ampel passt das Training des Tages automatisch an (`ampel-plan-1.0`): bei «vorsichtig» keine harten oder mittleren Abschnitte, Nachholen in der Woche, «Trotzdem wie geplant» | V7.4 (Garmin-Ersatz am Morgen auf der Uhr noch nicht geprüft) |
| 7 | Krafttraining als feste Zusatzeinheit je Woche (`kraft-plan-1.0`), Woche darauf abgestimmt | offen |

Reihenfolge (von Silas bestätigt am 16.11.2026): 1 → 2 → 6 → 3 → 7 → 4 → 5; jede Etappe erst nach seinem Okay (Etappe 2 freigegeben am
16.11.2026, Etappe 6 am 17.11.2026). Der Laufaufbau bleibt je Einzellauf (aufbau-1.1). Entscheid A7 (16.11.2026): Das Morgen-Update darf bei «vorsichtig» die eigene harte
Einheit des Tages in Garmin durch die lockere Fassung ersetzen – gilt ab Etappe 6; Enduco-Workouts bleiben unberührt.

## Etappe 1 – Vorlage → Ironman Notebook

| Vorlage (enduco) | V7.3 | Anders, weil |
|---|---|---|
| Einheit als ganze Seite von rechts, kurz Platzhalter, schmaler Kopf beim Scrollen | `js/v73-ui.js`, `.v73-seite` | – |
| Kopfbild mit Sportsymbol, Schloss, «Trainingsbriefing», Titel | eigener Bergausschnitt aus `logo.jpg` (`logo-einheit.jpg`), getönt in der Sportfarbe | eigene Bilder statt Fotos von enduco |
| Chips Datum · Festlegen · Sperren | Datum (verschieben in der Woche), Uhrzeit-Rad (5-min-Schritte), Sperre je Einheit | Verschieben nur innerhalb der Woche: Mein Plan wird je Woche gespeichert |
| Kacheln Outdoor/Indoor · Metrik · Optionen; Schwimmen Bahnlänge · Pace · Optionen | gleich; Indoor = `drinnen`, Bahnlänge je Gerät | kein eigenes Zonenprofil für die Rolle: Ziele bleiben aus dem aktiven Profil (Hinweis im Blatt) |
| Dauer · Training Load · Distanz (Rad «Grobe Distanz») | Dauer · TL ≈ · Distanz ≈ (Laufen, Schwimmen) | Rad ohne Distanz: kein Tempomodell für geplante Einheiten, nie geschätzt ohne Grundlage |
| Fokus Intensitäten mit «i», Equipment | Zonenskala mit Chips und Erklär-Blatt, Equipment (nötig/freiwillig) | – |
| Ablauf mit Zeitachse | Balkenprofil aus den Schritten, Achse alle 15/30/60 min | – |
| Schritte als Karten, Wiederholungen als Karte in der Karte, «Technikübungen» aufklappbar, Blockkopf → Blatt | `schritte-1.0`, Blockkopf → Blatt mit Erklärung und Schritten | Schritte entstehen aus den Abschnitten (`teile`), nicht umgekehrt: so bleiben TL ≈, Profil und Vergleich unverändert |
| Coach-Karte | Zweck und Aufbau der Einheit, «i» → Warum mit Quellen | – |
| Intensitätszonen mit «i» | Zone, Bereich, Zeit, Anteil, Balken; Erklär-Blatt | – |
| Workout bearbeiten (Dauer, Warm-up, Intervall-Intensität, Löschen) | `einheit-anpassen-1.0` (eigene Festlegung), Löschen mit Rückfrage | – |
| Trainingsmetrik | Rad Leistung/Puls/RPE, Laufen Pace/Puls/RPE, Schwimmen Pace/RPE (`rpe-zonen-1.0`) | auf der Uhr vorerst Leistung bzw. Tempo; Puls und RPE mit Etappe 2 (eine Format-Änderung mit Rücklese) |
| «Starten / Export» | Knopf «Export» → Auftrag «An Garmin senden» nur für diese Einheit | heisst «Export»: die Seite kann nichts starten; gesendet wird im Nacht-Update |

## Etappe 6 – Ampel passt das Training an (V7.4, ampel-plan-1.0)

| Soll (Auftrag) | V7.4 | Anders, weil |
|---|---|---|
| «bereit»/«normal» wie geplant, «vorsichtig» ohne harte und mittlere Abschnitte, lange Einheiten höchstens zwei Drittel | `V74.entscheid`, `V74.locker` | als lang gilt auch eine Einheit über 90 min (eigene Festlegung); Tests werden locker und im Testkalender verschoben |
| Krankheitszeichen = Ruhetag; «nicht beurteilbar» = Check-in entscheidet | gleich; ohne Morgenwerte der Nacht zählt nur der Check-in | – |
| Nachholen in derselben Woche, nicht neben harten Einheiten, nicht vor Test oder Rennen; sonst gemeldet | `V74.woche` | höchstens so lang wie die ersetzte lockere Einheit (sonst kurze Fassung), nie nach Krankheitszeichen, nie in Rennwochen |
| ab dem dritten Tag «vorsichtig»: «Woche anpassen?» | Karte auf Heute und im Tagesblatt, Aktion «erholung» (eigenplan-1.2) | – |
| «angepasst wegen Ampel» mit Gründen und ursprünglicher Einheit, «Trotzdem wie geplant» je Tag | Heute, Tagesblatt, Einheit-Seite, Kalender (`js/v74-ui.js`) | gesperrte Einheiten bleiben unverändert (Hinweis), wie bei enduco |
| eigene Schicht je Tag (`ampel_anpassung`, «Direkt speichern», Prüffunktion) | Eingabe `ampel`, `merge_daily.ampel_pruefen`, Seite speichert ohne Knopfdruck | gespeichert wird der Entscheid, die Einheiten rechnet die Seite daraus (Mein Plan bleibt) |
| Morgen-Update ersetzt die harte Einheit auf der Uhr (A7) | `tools/ampel_heute.mjs`, `garmin_senden.py ampel`, lockere Fassung im Auftrag | nur für Aufträge ab V7.4 (die tragen die lockere Fassung); auf der Uhr noch nicht geprüft |

