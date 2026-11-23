# Auftrag – «Check-in passt an» wie Enduco (checkin-anpassung-1.0 · V9.8)

Silas, 23.11.2026 (Aufnahmen 12:27 und 12:29, Enduco): «Bei Enduco kommt die Anpassung mit dem Check-in. Dann zeigt er dadurch, was er streicht und was er hinzufügt.»
Entscheid von Silas am 23.11.2026: **wie Enduco, mit einer Ausnahme** – Ampel und Coach schlagen nach dem Check-in vor, Silas entscheidet mit «Akzeptieren» oder «Ignorieren»;
**nur Krankheitszeichen** machen den Tag weiterhin von selbst zum Ruhetag. Eigene Sitzung. Alle Beispiele hier sind erfunden; echte Werte und Bilder gehören nicht ins Repo.

**Stand 23.11.2026: gebaut in V9.8** (Abnahme 1–5, 7, 8). Bewusst schlichter als hier beschrieben (Silas 23.11.: «möglichst einfach»): «Ignorieren» gilt für den ganzen Tag (kein
Fingerabdruck; eine Zeile «Doch anpassen» bleibt); das Blatt zeigt nur «Gestrichen»/«Geändert» mit Sportart und Dauer (ohne Profil und Wochenlast); bei Krankheitszeichen bleibt der
bisherige Hinweis mit «Trotzdem wie geplant»; ist nichts zu ändern, eine Zeile statt Karte. Die Uhr wird nach «Akzeptieren» nicht sofort nachgeführt (das macht das Morgen-Update; danach
Hinweis «Auf der Uhr steht noch die harte Fassung»). Zurückgestellt: Punkt 6 «Coach und Ampel in einer Karte» (die Coach-Karte ist seit V9.5.2 schlicht). Siehe CHANGELOG.

Repo: sileyhunter/spuren. Es gilt CLAUDE.md. Zu Beginn nur CLAUDE.md, diesen Auftrag und `docs/anleitung/plan.md` (Abschnitte «Ampel passt das Training an», «Täglicher Coach»,
«Umplanen», «Zeit und Intensität») lesen, bei Bedarf `bedienung-design.md`. Ablauf wie immer: Version V9.8, neue Testdatei `tests/test_v98.cjs` (in CLAUDE.md eintragen),
CHANGELOG, `docs/offen-nach-v55.md` (Nr. 156), `docs/anleitung/plan.md`, `python3 -I tools/make_demo.py` (demo.html mitcommitten), Leck-Prüfung, Push erst nach bestandenen Tests.
Danach `claude/offene-punkte.md` und diesen Auftrag im Projekt nachführen. Am Ende kurz melden: was gebaut, was offen, was Silas auf dem iPhone prüfen soll.

## So macht es Enduco (Aufnahmen)
1. Check-in: vier Regler (Schlaf/Stress, Ermüdung, Muskelkater, Stresslevel), «Weiter», danach kurz «Wow, das hat geklappt!».
2. Home: oben eine Karte mit Spinner «Anpassungen prüfen …», dann der **Befund mit Grund**, z. B. Titel «Training heute gestrichen», Text «Dein Check-in zeigt normale Ermüdung,
   aber du bist heute nicht verfügbar. Deshalb wird das VO2max-Intervalltraining gestrichen. Nutze den Tag zur Erholung …», Knöpfe **«Ignorieren»** und **«Überprüfen ✨»**.
   Ist nichts zu ändern: «Gut erholt und auf Kurs!» ohne Knöpfe.
3. «Überprüfen» öffnet ein Blatt «Überprüfen» (✨): derselbe Text, darunter je Art eine Liste – gesehen: **«Trainings gelöscht:»** mit der Einheit durchgestrichen, Datum, Dauer und
   Profil (Enduco hat dafür vermutlich auch «geändert» und «hinzugefügt»). Unten «Ignorieren» und **«Akzeptieren ✓»**.
4. «Akzeptieren» → Meldung oben («Zack – sitzt, passt …»), der Tag zeigt die neue Fassung («Kein Training»). «Ignorieren» → alles bleibt.

## Was die Seite heute tut
- Ampel (ampel-plan-1.0): Der Entscheid je Tag wird **von selbst** angewendet (Schicht beim Zeichnen, `V74UI.anwenden`): «vorsichtig» → lockere Fassung; Krankheitszeichen → Ruhetag;
  «Trotzdem wie geplant» je Tag. Gespeichert wird nur der Entscheid (`ampel_anpassung`).
- Coach (tagescoach-1.0/1.1): Vorschläge auf einer Karte (Heute), **Annehmen** über `V66UI.aendernFolge`, Rückgängig, abgelehnte kommen nicht wieder.
- Zeit/Verfügbarkeit: plant **sofort** um, wenn Silas sie ändert (umplanen-1.0) – der Enduco-Fall «heute nicht verfügbar» entsteht auf der Seite darum nicht erst beim Check-in.

## Was neu sein soll
### Ein Ablauf nach dem Check-in
Nach dem Speichern des Check-ins (Heute) rechnet die Seite **einmal** alles, was der Check-in auslöst, und zeigt es als **eine Karte oben auf Heute** (Muster Enduco):
- Kurz «Anpassungen prüfen …» (die Seite rechnet ohne Warten; der Spinner höchstens so lange, wie sie wirklich rechnet).
- **Befund mit Grund** in einem Satz Titel + zwei bis drei Sätzen Text, aus den Gründen der Ampel und des Coaches gebaut (z. B. erfunden: «Heute locker statt VO2max – Ermüdung
  erhöht und Ruhepuls 6 über dem Üblichen. Die harte Einheit kommt am Donnerstag an die Stelle der lockeren.»). Ist nichts zu ändern: «Gut erholt und auf Kurs» (ohne Knöpfe).
- Knöpfe «Ignorieren» und «Überprüfen ✨» → Blatt **«Überprüfen»** mit den Listen **gestrichen** (durchgestrichen), **geändert** (vorher → nachher: Titel, Dauer, Stufe) und
  **neu**, je Zeile Tag, Dauer, ≈ TL und Profil (vorhandenes `profilSVG`), darunter die Wochenlast vorher → nachher; unten «Ignorieren» und «Akzeptieren ✓».
- **Akzeptieren** wendet alles auf einmal an (Ampel-Entscheid «angenommen» je betroffenen Tag; Coach-Vorschläge über `V66UI.aendernFolge`, mehrere Wochen wie tagescoach-1.1),
  Garmin-Aufträge nachgeführt, Meldung oben (kurz, eigene Worte), **↶** nimmt es zurück, solange kein betroffener Tag vorbei ist.
- **Ignorieren**: nichts ändert sich; der Entscheid wird gespeichert («ignoriert» mit Fingerabdruck der Eingaben wie bei der Frage fehlt-zeit-1.0) – dieselbe Karte kommt erst
  wieder, wenn sich die Lage ändert (neuer Check-in, neue Nacht-Daten, Silas ändert die Woche). Der Tag bleibt «wie geplant» (wie heute «Trotzdem wie geplant»).
- Die Karte gilt für heute und die Folgen in den nächsten Tagen; sie ersetzt für diese Fälle die bisherige Coach-Karte (keine zwei Karten für dasselbe).

### Ausnahme: Krankheitszeichen
Krankheitszeichen im Check-in (wie heute: krank, Fieber, Infekt, Magen-Darm …) machen den Tag **weiterhin von selbst** zum Ruhetag (Gesundheit geht vor; ampel-plan-1.0).
Die Karte zeigt es trotzdem mit Grund und Liste («gestrichen»), Knöpfe «Verstanden» und «Trotzdem wie geplant» (wie bisher je Tag); kein «Akzeptieren» nötig.

### Was bleibt
- Rechenregeln der Ampel (`V74.entscheid`, `V74.locker`, Nachholen) und des Coaches (Anlässe, Grenzen, «nie härter oder länger als Mein Plan» bzw. tagescoach-1.1) bleiben;
  neu ist **wann** und **wie** sie wirken: «vorsichtig» wird nicht mehr von selbst angewendet, sondern vorgeschlagen.
- Ohne Check-in heute (nur Nacht-Daten): dieselbe Karte, sobald die Nacht-Daten da sind (Morgen-Update), mit Hinweis «ohne Check-in».
- Garmin: Am Morgen bei «vorsichtig» sendet das Morgen-Update heute die lockere Fassung (Entscheid A7). Neu: erst nach «Akzeptieren» – Claude prüft, wie das mit dem Morgen-Update
  zusammenspielt (Silas akzeptiert meist nach dem Morgen-Update), und schreibt den Entscheid in `plan.md` / `garmin.md`. Heute wird nie automatisch auf die Uhr geschrieben, ohne
  dass Silas akzeptiert hat (Ausnahme Krankheitszeichen wie bisher).
- Datenformat nur um optionale Felder ergänzen (`ampel_anpassung` je Tag: `angenommen` / `ignoriert` mit Fingerabdruck); `merge_daily.py` prüft sie.

## Abnahme (`tests/test_v98.cjs`, Simulator `tests/sim`, erfundene Daten)
1. Check-in «vorsichtig» → Plan unverändert, Karte mit Grund; Überprüfen-Liste nennt die harte Einheit «geändert → locker» (und eine Nachhol-Einheit «geändert» am späteren Tag).
2. Akzeptieren → Plan wie bisher bei «vorsichtig» (gleiches Ergebnis wie ampel-plan-1.0), Garmin-Aufträge nachgeführt, ↶ stellt alles her.
3. Ignorieren → Plan bleibt, Karte weg; kommt erst nach neuem Check-in bzw. neuen Nacht-Daten wieder; gleiche Eingaben → keine neue Karte.
4. Krankheitszeichen → Ruhetag von selbst, Karte mit «Verstanden»/«Trotzdem wie geplant».
5. Nichts zu ändern → «Gut erholt und auf Kurs», keine Knöpfe.
6. Coach-Vorschläge (morgen, last, schmerz …) erscheinen in derselben Karte und Liste, nicht doppelt.
7. Alle bestehenden Tests grün; Tests, die das automatische Anwenden von «vorsichtig» erwarten, auf «nach Akzeptieren» umschreiben und im CHANGELOG nennen.
8. Demo-Durchlauf mit Playwright: Check-in mit schlechten Werten → Karte → Überprüfen → Akzeptieren → Tag geändert → ↶.
**Silas prüft (iPhone):** (a) Check-in mit müden Werten → Karte mit Grund, «Überprüfen» zeigt, was gestrichen/geändert/neu ist; (b) Akzeptieren → Plan geändert, ↶ zurück;
(c) Ignorieren → bleibt wie geplant; (d) neben Enduco: was anders aussieht, mit Screenshot melden.

## Nicht ändern
Rechenregeln von Ampel und Coach (nur Zeitpunkt und Darstellung), `V66.verteilen`, Umplanen und W4, Verschlüsselung, Einheit-Seite. `data.json` und `work/` nie committen.
