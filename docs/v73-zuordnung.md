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
| 3 | Planeinstellungen: Basis-Fitness je Sportart, Steigerung (ein Regler für alle drei Sportarten), Indoor-Phase, Schwimm-Equipment, Bahnlänge, Anfänger-Modus, Stile | V7.5, V7.5.1, V7.5.2 (Basis-Fitness Variante A, 20/50/30 wählbar) |
| 4 | Kalender mit Zwei-Wochen-Raster und durchlaufender Liste, Zyklus, Bearbeiten-Modus, Tagesblatt; Aktivitäten draussen im Voraus planen (`aktivitaet-plan-1.0`) | offen |
| 5 | Heute, Navigation, Training planen mit Kategorien | offen |
| 6 | Ampel passt das Training des Tages automatisch an (`ampel-plan-1.0`): bei «vorsichtig» keine harten oder mittleren Abschnitte, Nachholen in der Woche, «Trotzdem wie geplant» | V7.4 (Garmin-Ersatz am Morgen auf der Uhr noch nicht geprüft) |
| 7 | Krafttraining als feste Zusatzeinheit je Woche (`kraft-plan-1.0`), Woche darauf abgestimmt | V7.6 Teil 1 (Termin, Anzeige, RPE); Abstimmung der Woche wartet auf Silas' Okay zum Vorschlag |

Reihenfolge (von Silas bestätigt am 16.11.2026): 1 → 2 → 6 → 3 → 7 → 4 → 5; jede Etappe erst nach seinem Okay (Etappe 2 freigegeben am
16.11.2026, Etappe 6 und Etappe 3 am 17.11.2026). Der Laufaufbau bleibt je Einzellauf (aufbau-1.1). Entscheid A7 (16.11.2026): Das Morgen-Update darf bei «vorsichtig» die eigene harte
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


## Etappe 3 – Planeinstellungen (V7.5, planeinstellungen-1.0; V7.5.1 nach dem Auftrag)

| Vorlage (enduco) | V7.5.1 | Anders, weil |
|---|---|---|
| Blätter nacheinander Laufen → Rad → Schwimmen → Trainingsumfang, unten «‹», zuletzt «Fertig ✓» | Blatt «Planeinstellungen» als Folge (`V75UI.flow`) aus Plan → Plan verwalten (zuoberst), dem Profil und den Wochenstunden | jede Auswahl wird schon beim «Übernehmen» gespeichert (nichts geht verloren, wenn das Blatt zugeht) |
| Je Sportart «Zusätzliche Einstellungen» mit Base Fitnesslevel (Zahl im Kreis) | je Sportart «Basis-Fitness» im Ring, antippen = eigener Wert mit Regler, «Zurück auf berechnet», Datum (basis-1.1); Start = 7 × Fitness ÷ Last pro Stunde | Fitness mit dem Stand vom Montag statt von heute (die Woche ändert sich nicht unter der Woche); Start wahlweise «jetzt» × 20/50/30 (Silas' Wunsch); Änderungen gelten ab der nächsten Woche |
| Trainingsumfang: Kurve, Bereich, Regler mit Prozent und Stufe, schraffierte Enden | Blatt «Trainingsumfang»: Kurve bis zum Hauptrennen, Bereich 50–150 %, Regler mit Sperrzonen, Wort und Farbe je Bereich (steigerung-1.0) | ein Regler für alle drei Sportarten (Silas' Wunsch); 100 % = gleichmässig bis zur Woche vor dem Taper (wie bisher), Obergrenze 10 % pro Woche als feste Grenze; eigene Worte (sanft, ausgewogen, zügig, steil, maximal) |
| Indoor Training Einstellungen (temporäre Phase) für Rad und Laufen | Indoor-Phase von … bis … (indoor-phase-1.0) | Dauer und Inhalt bleiben; einzelne Einheiten auf ihrer Seite umstellbar (nur Abweichungen gespeichert) |
| Schwimm Equipment | Brett, Pullbuoy, Flossen, Paddles (schwimmeinheit-1.2) | ohne Brett Beine in Seitlage mit Flossen, ohne Pullbuoy kein Pull – die Zeit geht in die Hauptserie |
| Standard Bahnlänge | Standard-Bahnlänge 25/50 m; je Einheit auf der Einheit-Seite (einheit-felder-1.1) | vorher je Gerät |
| Beginner Modus (Schalter) | Anfänger-Modus (Schalter): einfache Übungen, kürzere Wiederholungen, längere Pausen (schwimmeinheit-1.2) | Wirkung eigene Festlegung, im Wissen beschrieben |
| Stile | Kraul immer, dazu Rücken und/oder Brust: je Woche einer als Teil am Ende des Ein- und Ausschwimmens, auf der Uhr mit diesem Stil (garmin-senden-1.2) | Technik und Hauptserien bleiben Kraul (Triathlon); Kraul nicht abwählbar; Delfin plant die Seite nicht |

## Etappe 7 – Krafttraining (V7.6, kraft-plan-1.0, Teil 1)

| Soll (Auftrag) | V7.6 | Anders, weil |
|---|---|---|
| Einstellung «Krafttraining» in den Planeinstellungen, auch aus dem Tagesblatt: Wochentag, Uhrzeit, Dauer (1:30 h), wiederkehrend | Seite in der Blatt-Folge (fünf Blätter) und Blatt `V75UI.kraft`, dazu eine Notiz für die Übungen; gilt ab der Woche nach dem Speichern | wie Start und Basis-Fitness: die laufende Woche bleibt (`vorher`) |
| Einzelne Wochen verschieben oder auslassen | «Nur diese Woche» auf der Einheit-Seite: Ausnahme `pe-kraft-<Montag>` in kommenden Wochen, sonst über Mein Plan | in der laufenden Woche über Mein Plan, damit vergangene Tage nicht wechseln |
| «Direkt speichern» mit Prüfung in `merge_daily.py` | `planeinstellung` → `planeinstellung_pruefen` (gleich wie `V75.pruefen`) | – |
| Zählt nicht zu den Wochenstunden, belegt aber Zeit am Tag | feste Einheit im Vorschlag, beim Verteilen ortsfest (`V66.verteilen`) | – |
| Nicht in TL ≈ und Form | keine TL ≈, nicht in der Form-Prognose | aufgezeichnete Garmin-Krafteinheiten zählen wie bisher in pmc-2.0 (Rückfrage an Silas) |
| RPE nach der Einheit → sRPE als eigene Zahl | RPE 1–10 auf der Einheit-Seite, sRPE = RPE × Minuten (Garmin-Dauer, sonst geplant) | nicht in der Kalibrierung rpe-1.0 |
| Kalender, Heute, Tagesblatt mit Kraft-Symbol und Uhrzeit; Einheit-Seite mit Dauer, Uhrzeit, Notiz | gleich, Quelle «fester Termin» | ohne Ablauf, Zonen und Export |
| Garmin: nicht gesendet | nicht gesendet (Grund im Auftrag) | – |
| Abstimmung der Woche (Tag danach, Krafttag, Tests, Taper, Rennwochen, Erholungswoche) | Vorschlag an Silas am 17.11.2026 | wird erst nach seinem Okay gebaut |
| Wissen: Kapitel «Krafttraining» mit Quellen und Regeln; «Was nicht drin ist» | Kapitel «kraft» (wissen-1.17) mit Termin, Zeit, RPE und Quellen | die Regeln der Abstimmung kommen mit dem Okay dazu |
