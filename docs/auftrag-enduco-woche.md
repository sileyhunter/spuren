# Auftrag V9 – «Woche wie Enduco»: Verhalten und Aussehen (Silas, 22.11.2026, geschärft um 19:26 und 20:00)

> **Stand 23.11.2026:** Etappe W1 gebaut in V9.2 (umplanen-1.0, grenzen-1.0, woche-einstellen-1.0, fehlt-zeit-1.0; CHANGELOG V9.2, Regeln in `docs/anleitung/plan.md`
> «Umplanen»; V9.2.1 Folgewoche). W2 (W2a und W2b) gebaut in V9.3 (woche-look-1.0, kugel-1.0) nach Silas' Screenshots vom 22.11.; V9.3.2 Feinschliff nach seinen 18 Bildern
> und der Aufnahme 23:06 (Bearbeiten-Woche, Griff ziehen 1/2 Wochen/Monat, Zyklus-Raster, ✨ «Anpassen oder neu berechnen?»); W4 gebaut in V9.5 (zeit-intensitaet-1.0: Verdichten und Zeit als Ziel; Regeln und Zahlen in `docs/anleitung/plan.md` «Zeit und Intensität als Stellschrauben»); offen: W2c, W3, W5. Zahlen aus Bildschirmfotos und Aufnahmen sind in dieser Fassung durch erfundene ersetzt, sonst ist der Auftrag unverändert
> (gleich im Repo als `docs/auftrag-enduco-woche.md` und im Projekt als `claude/auftrag-v9-enduco-woche.md`).

Repo: sileyhunter/spuren. Es gilt CLAUDE.md. Passwort nur als SPUREN_PW, nie ins Repo.
**Jede Etappe in einer eigenen Sitzung** (W1 bis W5 – nicht mit den Etappen 2–8 aus auftrag-v9.md verwechseln). Zu Beginn nur CLAUDE.md und die Dateien lesen,
die die Etappe braucht (`docs/anleitung/plan.md`, `garmin.md`, `bedienung-design.md`, `dateien.md`). Jede Etappe: Version, Tests (neue Testdatei in die Liste «Prüfen vor jedem Push»
in CLAUDE.md eintragen), CHANGELOG, docs/offen-nach-v55.md nachführen, `python3 -I tools/make_demo.py` und `demo.html` mitcommitten, Push erst nach bestandenen Tests
und Leck-Prüfung. Am Ende kurz melden: was gebaut, was offen, was Silas prüfen soll.
Diesen Auftrag als docs/auftrag-enduco-woche.md ins Repo legen. Alle Beispiele hier sind erfunden; echte Werte und Bilder gehören nicht ins Repo.

**Vorlagen (nicht ins Repo):** Silas hängt zu Beginn jeder Etappe an: (1) Screenshot «Enduco, Woche im Bearbeiten-Modus» (IMG_0093), (2) Aufnahme «Enduco: planen,
Dauer, Bearbeiten, Tag sperren» (18-19-06), (3) Aufnahme «unsere Seite, alter Stand» (18-14-10) – sie zeigt, was nicht geht, (4) Aufnahmen «Enduco: Tagesblatt mit Sportart-Pille
und Zeitregler, Training planen» (17-31-12, 17-33-57). Fehlen sie, einmal danach fragen. Dazu seit W1: (5) Aufnahme «Enduco plant nach der Verfügbarkeit die ganze Woche neu»
(20-17-01: Tagesblatt Mittwoch, Zeit und Sportarten ändern, beim Schliessen schimmern alle Tage, danach steht die neue Woche) und (6) Aufnahme «Export je Einheit»
(20-22-00: «Starten / Export» → Garmin Connect, TrainingPeaks oder PDF; die Einheiten stehen auch im Outlook-Kalender).
Verhalten und Farben stehen unten vollständig; für die Anordnung sind die Bilder massgebend. Enduco-Symbole und -Texte werden nicht nachgebaut: Symbole der Seite
(weiss), Texte deutsch wie bisher.

## Was Silas will (seine Worte, 22.11.2026)
**Das Ziel ist ein flexibler Trainingsplan:**
- Silas klickt die einzelnen Tage an, an denen es ihm nicht passt, und stellt **Zeit (Dauer) oder Sportarten** ein. Das **bleibt so**. Danach rechnet die Seite die ganze Woche neu.
- **Gesperrte Tage** bleiben unverändert; dort wird nichts angepasst.
- **Von Hand gesetzte Zeit und Sportarten sind für die Seite unantastbar:** Dort setzt sie nie mehr Zeit ein, als er eingestellt hat, und empfiehlt nie eine andere Sportart –
  weder der Planer noch der Coach noch «Ausgleichen» noch die automatische Wahl des Krafttrainings-Tags.
- Fehlt an mehreren Tagen die Zeit, **fällt die Last auf die Tage, an denen Zeit ist** – z. B. 10 h aufs Wochenende. Auch Tage, die im Vorschlag trainingsfrei sind, nehmen
  Last auf («am Mittwoch ist dann sicher nicht trainingsfrei»).
- Bei **jeder Einstellung neu rechnen**, nicht nur anpassen: Die Folge einer Änderung ist immer eine Änderung der Gesamtwoche. Verlässt er den Tag, plant die Seite um,
  «so wie es am meisten Sinn macht».
- Die Einheiten gehen **Tag für Tag automatisch** nach Garmin (und TrainingPeaks). Umplanen darf diese Aufträge nie veralten lassen (siehe «Garmin und TrainingPeaks»).
- Zeiten der Woche einstellen und Tage gleich sperren: **ein Blatt** dafür.
- Layout wie Enduco: klarer, einfacher. Einheiten-Symbole in Weiss, daneben eine Kugel in der Farbe der Einheit.
- «Genauso aussehen und genauso funktionieren.»

**Seine Antworten vom 22.11.2026 (19:58) auf meine Ideen und Fragen:**
1. **Zustand eines Tages sichtbar:** ja, «gleiche dort ab, wie es dargestellt ist» (bei Enduco sieht man das auch).
2. **Standard gilt, bis er etwas umstellt:** «Wird von mir nichts eingetragen, gilt die standardmässige Einstellung. Nur wenn ich etwas umstelle, gilt an diesem Tag, was ich definiere.
   Bei allen anderen Tagen kannst du einstellen, was du willst, solange du die standardmässige Zeit einhältst, die ich übergeordnet bei den Einstellungen definiert habe.»
   Damit trägt die Seite **nie selbst etwas als «von Hand» ein**, auch keinen Vorschlag.
3. **Fehlt Zeit und geht es nicht anders:** «Dann muss vielleicht mit der Intensität gespielt werden. Im Normalfall habe ich ja die Zeit fürs Training.» Kein Wochenend-Wächter.
4. **Zeit als Ziel:** ja, «einfach so lange die maximale Trainingszeit eingehalten wird».
5. **Automatisch senden:** ja, jeden Abend – «was wir aber nicht schon jetzt starten». Dazu **eine Einstellung**, mit der man das automatische Senden **stoppen** und die **Uhrzeit**
   festlegen kann, ab wann gesendet wird (z. B. Vortag 23:00).
6. **Geht es «dummerweise» nicht auf:** Es darf eine **Meldung mit der Frage** erscheinen, ob an einem Tag mehr trainiert werden darf als die übergeordnete Zeit.

**Bestätigt (22.11., 19:58):** Die Zeit, die an einem Tag gilt – Standard des Wochentags oder von Hand gesetzt –, ist für alles, was die Seite selbst setzt, eine **harte Obergrenze**
(seine frühere Formulierung «darf lediglich … überziehen» war als «nicht überziehen» gemeint; mit Punkt 2 bestätigt). Sie wird nur überschritten, wenn Silas es auf die Frage
(Punkt 6) bestätigt oder selbst etwas Festes setzt (eigene oder gesperrte Einheit – dann Meldung, nie still).
Trainingstechnische Entscheide (Verteilung, Reihenfolge, Erholung, Intensität) trifft Claude selbst nach den bestehenden Regeln in `plan.md`.

## Was heute nicht geht (Aufnahme 18-14-10)
1. Im Bearbeiten-Modus ist die Verfügbarkeit gesperrt («Ändern geht nach dem Speichern (✓)», `js/v66-ui.js` um Zeile 270, dazu `M.entwurfSperre`). Nur Sperren geht.
2. «Woche anpassen» (V9.1.1 `anpassen`) schiebt oder kürzt nur, was die Zeit verletzt. Passt alles, ändert sich nichts. Wird eine Sportart abgewählt, verschwindet die Last
   statt woanders zu landen (Beispiel aus dem Video: Mittwoch ohne Schwimmen → Mittwoch «frei», die Wochenlast sinkt, nichts verschoben).
3. Gekürzte Einheiten wachsen nicht zurück, wenn die Zeit wieder da ist: Das Ergebnis hängt vom Weg ab.
4. Zeiten, Sportarten und Sperren stehen in verschiedenen Blättern und Modi.

## Etappe W1 – «Umplanen»: jede Einstellung rechnet die ganze Woche neu (umplanen-1.0, grenzen-1.0, woche-einstellen-1.0, fehlt-zeit-1.0 · V9.2)

### Grundsatz
Die Woche ist eine **Funktion ihrer Eingaben**, kein Zustand, den man flickt:
`Woche = Planer(Vorschlag, Grenzen je Tag, Festes)`
- **Vorschlag:** der unverteilte Vorschlag der Seite (`K.w0roh`, `ctx.roh(d)`), wie ihn Modell, Phase und Wochentyp ergeben.
- **Grenzen je Tag:** Zeit (Maximum) und erlaubte Sportarten. `vf-<Datum>` = **von Hand gesetzt**; `vf-wt-N` = Standard des Wochentags (gilt für Tage ohne eigenen Eintrag).
- **Festes (Inhalt):** vergangene Tage · gesperrte Tage und Einheiten · **Anker** = alles, was Silas selbst gesetzt hat (hinzugefügte oder aus der Bibliothek geholte Einheiten, Dauer
  von Hand geändert, von Hand verschoben oder ersetzt, vom Coach angenommene Änderungen, Aktivitäten draussen) sowie Tests, Schwimmkurs, Rennen und das automatische
  Krafttraining (ortsfest wie bisher: `istEigen`, `istOrtsfest` in `js/v66.js`) · **Streichungen** (Einheit bewusst gelöscht).

**Drei Zustände eines Tages** (so zeigt und rechnet es die Seite):
| Zustand | Inhalt | Grenzen (Zeit, Sportarten) |
|---|---|---|
| Standard (kein eigener Eintrag) | frei für den Planer | Standard des Wochentags: **Zeit = harte Obergrenze**, Sportarten = die dort gewählten |
| **von Hand gesetzt** (`vf-<Datum>`) | frei für den Planer, **solange er die Grenzen einhält** | **fest**: Zeit = Maximum, Sportarten = nur die gewählten |
| **gesperrt** (Schloss am Tag oder an der Einheit) | **fest**: nichts rein, nichts raus, nichts geändert | wie gesetzt; gelten nur für Neues, das Silas selbst einfügt |

«Von Hand gesetzt» entsteht **nur durch Silas** (Zeitregler, Sportart-Schalter, Antwort «Ja» auf die Frage unten) – nie durch einen Planerlauf.

Ändert sich ein Eingang, rechnet der Planer **die ganze Woche aus dem Vorschlag neu** (nicht aus dem aktuellen Stand) und speichert das Ergebnis. Technisch ist das
`neuBerechnen` in `js/v66.js` mit diesen Unterschieden: Anker auf entsperrten Tagen bleiben (heute fallen sie weg); Streichungen werden gemerkt (neues optionales Feld,
z. B. `E.gestrichen` mit Vorlagen-Kennungen; je Eintrag fällt beim Umplanen eine passende Vorschlags-Einheit aus dem Pool); vergangene und gesperrte Tage bleiben;
Einheiten auf festen Tagen verbrauchen passende Vorschlags-Einheiten (`verbraucht`), damit nichts doppelt steht. `V66.verteilen` bleibt der Rechenkern (Prioritäten, harte
Einheiten an Land nicht an zwei Tagen hintereinander, Tag nach Kraft, Aktivität draussen, lange Einheiten an gewählten Tagen, Rennwoche = nichts verschieben, nur melden)
und wird nur erweitert, nicht umgebaut. `anpassen` (V9.1.1) entfällt; `vfFolgen` und die Knöpfe rufen `umplanen`.
Neue Art in `V66.aendern`: `{ art: "umplanen" }`.

### Regeln
- **Die Last fliesst dorthin, wo Zeit ist.** Was an einem Tag nicht passt (Zeit 0, weniger Zeit, Sportart abgewählt), kommt an einen anderen Tag – auch auf einen Tag, der im Vorschlag
  trainingsfrei war, sobald dort Zeit und Sportart da sind. Mehrere Einheiten an einem Tag sind erlaubt, auch derselben Sportart, wenn es nicht anders geht (die weichen Abzüge in
  `V66.verteilen` bleiben, ein Verbot gibt es nicht). Schlüsseleinheiten zuerst (`PRIO`), lockere zuletzt. Reihenfolge je Einheit: ganz verschieben → erst wenn nirgends Platz ist kürzen
  (nie unter die Mindestdauer der Vorlage) → bleibt noch etwas übrig, kommt die **Frage** (siehe «Geht es nicht auf»); bis zur Antwort steht die Einheit nicht in der Woche. (Ab W4 steht
  zwischen Kürzen und Frage das «Verdichten».) Entfällt eine Einheit am Ende (Antwort «Nein»), dann **mit Meldung und Grund** (nie still).
  **Beispiel Silas:** Mo–Fr von Hand Zeit 0, Sa und So je 5 h → die ganze Wochenlast landet am Wochenende (bis 5 h je Tag), nichts geht verloren, was reinpasst.
- **Harte Grenzen:** Die Zeit eines Tages – Standard des Wochentags **oder** von Hand gesetzt – überschreitet die Seite nie. An einem von Hand gesetzten Tag setzt sie auch nie eine
  Sportart, die nicht gewählt ist; an Standardtagen gelten die Sportarten des Wochentag-Standards wie bisher. Das gilt für **alles, was die Seite selbst setzt oder empfiehlt**: Planer,
  automatische Wahl des Krafttrainings-Tags, Vorschläge des Coaches (V8.3; die Toleranz `V83.TOLERANZ` = 5 min gilt dafür nirgends mehr – Claude prüft, ob sie fürs Bewerten
  bestehender Pläne nötig bleibt, und schreibt den Entscheid in `plan.md`), Ampel-Ersatz (V7.4), «Ausgleichen». Claude prüft jede dieser Stellen und schliesst Lücken. Was Silas selbst
  fest gesetzt hat (Anker, gesperrt), darf darüber: Meldung «Dienstag: 30 min mehr geplant als verfügbar (deine eigene Einheit)». Der Planer ändert nie die Zahlen, die Silas eingestellt hat.
- **Die Seite trägt nichts selbst ein.** Ein Planerlauf legt nie einen `vf-…`-Eintrag an und ändert nie einen. Auch keine «Vorschläge zum Eintragen»: Wo etwas fehlt, fragt die Seite (siehe unten).
- **Gleiche Eingaben, gleiche Woche (Pfadunabhängigkeit):** Die Reihenfolge der Änderungen spielt keine Rolle. Zeit auf 0 und wieder zurück ergibt wieder die Ausgangswoche
  (gekürzte Einheiten wachsen zurück).
- **Nach hinten nie:** Vergangene Tage und gesperrte Tage oder Einheiten ändern sich nie.
- **Streichen:** Gestrichen bleibt gestrichen (kein heimlicher Ersatz). Die Folge ist sichtbar: Der Kopf zeigt die Last gegen den Korridor. Liegt sie darunter, bietet der Bericht
  «Ausgleichen» an: bringt die gestrichene Einheit auf den besten freien Tag zurück (`umplanen` mit `ausgleichen: true`, Streichungen für diesen Lauf ignoriert, Grenzen gelten weiter).
- Wochen ohne Eigenes (kein Anker, keine Sperre, keine Streichung) werden nicht gespeichert, sie folgen dem Vorschlag und der Verfügbarkeit von selbst (`wocheVerteilt`);
  dieselben Regeln, derselbe Kern.

### Geht es nicht auf: Meldung mit Frage (Silas, 22.11., Punkt 6)
Bleibt nach dem Umplanen Last übrig, die nirgends in die Grenzen passt, überzieht die Seite nie von selbst und trägt auch nichts selbst ein. Sie **fragt** – als Blatt wie `M.reaktionBlatt`
(kein Browser-`confirm`): «Die Woche geht nicht auf: Es fehlen 1 h 20 (62 TL). Darf an einem Tag mehr trainiert werden als die eingestellte Zeit?»
- **Antworten als Knöpfe**, je einer pro Tag, der es aufnehmen könnte (nicht vergangen, nicht gesperrt, nicht von Silas auf «kein Training» gestellt), mit dem **kleinsten** nötigen Mehr:
  «Samstag auf 5 h 40 (+ 40 min)»; reicht kein Tag allein oder wäre das Mehr sehr gross, zusätzlich ein Vorschlag «verteilt» (z. B. «Samstag und Sonntag je + 1 h»). Dazu «Nein, so lassen».
  Die genauen Vorschläge legt Claude fest; jeder nennt Tag und neue Zeit.
- **«Ja»:** Die Seite setzt die Zeit dieses Tages auf den gewählten Wert (wie wenn Silas sie am Regler gestellt hätte: Zustand «von Hand gesetzt»), plant um, Bericht «Samstag: 5 h 40 –
  auf deine Bestätigung»; ↶ nimmt Woche **und** Zeit zurück.
- **«Nein»:** Nichts ändert sich; die nicht untergebrachte Last bleibt im Bericht («Fehlt: …»). Die Frage kommt erst nach der nächsten Änderung von Silas wieder, nicht bei jedem Öffnen
  (Antwort und Fingerabdruck der Eingaben als optionales Feld in `E.verteilung`).
- Die Frage erscheint **nur nach einer eigenen Änderung** von Silas (Tagesblatt schliessen, «Woche einstellen» speichern, ✓ im Bearbeiten-Modus), nie beim blossen Öffnen der Seite, nie im
  Heute-Tab, und im Bearbeiten-Modus nicht bei jedem Schritt (dort steht die fehlende Zeit live im Kopf; die Frage kommt mit ✓).
- Keine Frage für vergangene Wochen, in der Rennwoche (dort wird nichts verschoben, nur gemeldet) und für Last, die nur an gesperrten Tagen oder Einheiten hängt.

### Auslöser (alle rufen dieselbe Funktion)
Verfügbarkeit eines Tages oder des Wochentag-Standards geändert (Zeit, Sportarten) · Tag oder Einheit gesperrt oder entsperrt · Einheit hinzugefügt, gestrichen, Dauer geändert,
verschoben, ersetzt · Aktivität draussen · vom Coach angenommene Änderung · **beim Verlassen des Tagesblatts**, wenn sich etwas geändert hat (einmal beim Schliessen oder nach
450 ms Pause wie `vfBinden`, nicht bei jedem Schieberuck) · Knopf ✨ «Woche anpassen» (immer; sagt auch «nichts zu ändern»). Danach wie bisher `V66UI.nachAenderung`
(Blatt zu, Kalender auf den Tag); bleibt Last übrig, folgt die Frage.
«Neu berechnen» (vergisst Anker und Streichungen, Sperren bleiben) und «Alles neu» (auch Sperren weg) bleiben wie in V9.1 und werden im Blatt als Stufe 2 und 3 beschriftet
(Stufe 1 = ✨ «Woche anpassen», automatisch bei jeder Einstellung). «Alles neu» setzt auch von Hand gesetzte Grenzen **nicht** zurück (nur Sperren und Anker).

### «Woche einstellen» – ein Blatt für Zeiten, Sportarten und Sperren
Das Blatt «Trainingsverfügbarkeit der ganzen Woche» (`M.verfuegbarkeitWoche`) wird zu **«Woche einstellen»**: eine Zeile je Tag (Wochentag und Datum, Zeitregler
0 = kein Training bis 5 h in 15-min-Schritten, Sportart-Schalter Schwimmen · Rad · Laufen, **Schloss** zum Sperren des Tags) und der Umschalter «nur diese Woche · jede Woche so».
Je Zeile ein kleines Zeichen für den Zustand (Standard · von Hand gesetzt · gesperrt; in W2 wie bei Enduco) und «Zurück auf Standard» für von Hand gesetzte Tage – denn was Silas einstellt, bleibt.
Speichern → einmal umplanen → Blatt zu → Bericht. Erreichbar aus dem Tagesblatt, aus dem Kopf der Woche und aus ✨.
**Im Bearbeiten-Modus gilt dasselbe:** Zeiten, Sportarten und Sperren sind Teil des Entwurfs (eine Überlagerung der Verfügbarkeit im Entwurf: gilt nur dort, wird mit ✓ zusammen
mit der Woche gespeichert, mit ✕ verworfen, ↶/↷ nehmen sie schrittweise zurück). Der Hinweis «Ändern geht nach dem Speichern (✓)» und die Sperre `M.entwurfSperre` für die
Verfügbarkeit entfallen. Im Entwurf rechnet der Planer nach **jeder** Änderung live (Kopf, Tageszahlen und Liste folgen sofort); das ist zugleich die Vorschau vor dem Speichern.

### Bericht nach jedem Umplanen
Kurze Meldung oben in der Liste (bleibt bis zum Wegwischen, Details im Blatt): was verschoben, gekürzt oder entfallen ist, mit Grund; Wochenlast vorher → nachher (TL, Stunden);
fehlende Zeit samt Frage (siehe «Geht es nicht auf»); «↶ Rückgängig» (stellt die Woche **und** die Verfügbarkeit vom Zustand davor wieder her). Muss nichts geändert werden: «Es musste
nichts verschoben werden – alle Einheiten passen zu deiner Verfügbarkeit.» (Text von V9.1.1). Meldungen weiter in `E.verteilung.meldungen`.

### Garmin und TrainingPeaks (die Einheiten gehen Tag für Tag automatisch)
- Die Seite legt je Tag einen Garmin-Auftrag an (`gs-<Datum>`; Modus «auto» = am Vortag ab 23 Uhr im Nacht-Update; Fenster: morgen bis eine Woche voraus, `garminFenster`;
  Einzelheiten in `docs/anleitung/garmin.md`). Umplanen ändert Einheiten an bis zu sieben Tagen. Danach **die Aufträge aller sieben Tage nachführen** (`auftraegeNachfuehren` mit allen
  Tagen der Woche, nicht nur dem geänderten): Tage mit Auftrag bekommen die neue Fassung (das Nacht-Update sendet sie und trägt die alte aus), verschobene Einheiten behalten ihre
  Auswahl (`teil`) und den Modus am neuen Tag, nicht mehr vorhandene werden ausgetragen.
- Heute und Vergangenes: Die Uhr wird für heute nie automatisch geändert (Nacht-Update: «verpasst»). Steht eine schon gesendete Einheit von heute nach einer ausdrücklichen Änderung
  von heute nicht mehr im Plan, sagt die Seite «Auf der Uhr steht noch …» (Muster der Ampel, V7.4).
- Im Bearbeiten-Modus wird nichts gesendet; erst mit ✓ (wie heute `entwurfSpeichern`).
- Das automatische Senden selbst (Stopp, Uhrzeit, alle Tage) ist **Etappe W5**; W1 ändert daran nichts ausser dem Nachführen.
- **TrainingPeaks:** Die Seite sendet nur an Garmin. **Beantwortet am 22.11.2026 (Aufnahme 20-22-00):** Heute exportiert Silas je Einheit über Enduco («Starten / Export» →
  Garmin Connect oder TrainingPeaks, dazu PDF); die Einheiten stehen auch in seinem Outlook-Kalender. Ein direkter Versand der Seite an TrainingPeaks (oder ein Kalender-Export)
  wäre eine eigene Etappe, nicht Teil von W1–W5 – nur, wenn Silas es will.

### Abnahme W1 (Simulator `tests/sim`, neue Datei `tests/test_v92.cjs`, erfundene Daten)
1. Dienstag Zeit 0 → seine Einheiten stehen an anderen Tagen (verschoben, nicht entfallen); Wochenlast gleich (Kürzung nur mit Meldung); ein Vorschlags-Ruhetag nimmt Last auf,
   wenn dort Zeit ist.
2. Mittwoch Sportart Schwimmen abgewählt → die Schwimm-Einheit steht an einem anderen Tag; der Mittwoch ist nicht leer, wenn Rad oder Laufen dort erlaubt sind und Last übrig ist.
3. Zeit am Donnerstag 2:30 → 1:00 → 2:30 ergibt dieselbe Woche wie am Anfang (Pfadunabhängigkeit).
4. (Di Zeit 0, dann Mi 1 h) = (Mi 1 h, dann Di Zeit 0) = beides auf einmal in «Woche einstellen».
5. Gesperrter Tag, gesperrte Einheit, vergangene Tage und Anker bleiben unverändert am Tag (vergleichen mit `JSON.stringify`).
6. **Flexible Woche:** Mo–Fr von Hand Zeit 0, Sa und So je 5 h → alle Einheiten stehen am Wochenende, mehrere je Tag, Summe je Tag ≤ 5 h, Schlüsseleinheiten bleiben, lockere werden
   zuerst gekürzt; passt nicht alles, kommt die Frage (Abnahme 14) und es wird **nichts überzogen**.
7. **Grenzen:** Tag mit von Hand gewählter Sportart «nur Laufen» → dort nie Rad oder Schwimmen, auch nicht durch Planer, Krafttrainings-Tag, Coach, Ampel-Ersatz oder «Ausgleichen»;
   jeder Tag (Standard und von Hand gesetzt) → kein vom Planer, Coach oder «Ausgleichen» gesetztes Ergebnis über der Zeit des Tages (auch nicht 5 min Toleranz); Festes darüber → Meldung.
8. Passt etwas nirgends hin und Silas antwortet «Nein» → entfällt mit Meldung samt Grund; die Wochenlast im Bericht stimmt.
9. Streichung bleibt über weitere Änderungen gestrichen; «Ausgleichen» bringt sie zurück (Grenzen gelten); «Neu berechnen» vergisst sie; von Hand gesetzte Zeit bleibt bei «Alles neu».
10. Bearbeiten-Modus: Zeit, Sportart, Sperre im Entwurf ändern → Liste live neu; ✕ stellt alles her (auch die Verfügbarkeit); ✓ speichert beides; ↶/↷ gehen schrittweise.
11. Garmin: nach dem Umplanen sind die offenen Aufträge aller sieben Tage der Woche erneuert (soweit der Simulator Aufträge abbildet, sonst Test der Tageliste), Modus und Auswahl
    verschobener Einheiten bleiben, heute wird nicht angefasst.
12. Bestehende Tests grün; Tests, die auf `anpassen` beruhten, auf `umplanen` umschreiben und im CHANGELOG nennen (nichts stillschweigend löschen).
13. Demo-Durchlauf mit Playwright (wie bei V9.1.1, CDN-Stub): Dienstag Zeit 0 → Tagesblatt schliessen → Liste zeigt die neue Woche und den Bericht.
14. **Frage:** Mo–Fr von Hand Zeit 0, Sa und So je 3 h, Wochenlast etwa 10 h → es fehlt Last: Das Blatt nennt die fehlende Zeit und Vorschläge (Tag, neue Zeit; kein Vorschlag grösser als
    das Fehlende). «Ja» → Zeit des Tags erhöht (Zustand «von Hand gesetzt»), Woche neu, nichts fehlt, ↶ stellt Woche **und** Zeit wieder her. «Nein» → nichts ändert sich, Bericht nennt
    «Fehlt …», die Frage kommt nicht wieder bis zur nächsten Änderung von Silas. Keine Frage beim blossen Öffnen, in der Rennwoche, für vergangene Wochen oder im Bearbeiten-Modus bei
    Zwischenschritten (erst mit ✓).
15. **Kein Eintrag durch die Seite:** Nach jedem Planerlauf sind alle `vf-…`-Einträge gleich wie davor; nur Silas' Eingaben und seine Antwort «Ja» ändern sie.
**Silas prüft auf dem iPhone:** (a) Bearbeiten → Dienstag Zeit 0 → ✓: Dienstags-Einheiten stehen an anderen Tagen, Bericht oben. (b) Mittwoch Schwimmen abwählen: Schwimmen wandert,
Mittwoch bleibt nicht leer. (c) Zeit zurücksetzen: Woche wie vorher. (d) Tag sperren: bleibt, wie er ist. (e) Mo–Fr Zeit 0, Sa/So je 5 h: alles liegt am Wochenende, keiner der Tage über 5 h.
(f) Ein Tag nur «Laufen»: dort steht nie etwas anderes. (g) Mo–Fr Zeit 0, Sa/So je 3 h: die Frage erscheint mit Vorschlägen; «Ja» → Wochenende länger, nichts fehlt, ↶ → zurück; «Nein» →
bleibt, Bericht sagt, was fehlt. (h) Tage, die er nicht angefasst hat, liegen nie über der Standardzeit.

### Was aus den Ideen vom 22.11. wurde (Silas' Antworten oben)
1. Zustand des Tags sichtbar → kleines Zeichen in «Woche einstellen» (W1), in Leiste, Liste und Tagesblatt wie Enduco (W2).
2. «Zeit fehlt»-Vorschlag zum Eintragen → **entfällt**; ersetzt durch die Frage in W1 (die Seite trägt nichts selbst ein).
3. Wochenend-Wächter → **entfällt**; ersetzt durch Intensität als Hebel (W4). Im Normalfall ist die Zeit da.
4. Zeit als Ziel → W4; **entschieden am 22.11. abends** (Silas: «das muss trainingstechnisch Sinn machen … falls das so Sinn macht, dann ja»): ja, siehe W4.
5. Automatisch senden → W5, nicht gestartet.

## Etappe W2 – Aussehen «Woche wie Enduco» (woche-look-1.0, kugel-1.0 · V9.3)
Kann in zwei Sitzungen laufen: W2a = Kopf, Tagesleiste, Kugel; W2b = Tagesliste, Einheitszeilen, Bearbeiten-Leiste, Tagesblatt. Danach W2c = übrige Ansichten (Zyklus, Monat,
Heute, Plan) erst nach Silas' Okay. Nur Aussehen, keine Rechenlogik ändern.

### Farben (dunkel, aus dem Screenshot gemessen; helles Thema: gleiche Struktur mit eigenen Werten)
Seite `#000000` · Kopf-Panel und Tagesliste `#161617` · Pillen, Spuren, Umrisse `#27292d` · Griff `#4d4d4d` · Text weiss `#ffffff`, Nebentext `#b2b2b2` · ✕-Knopf `#484b52` ·
✓-Knopf weiss mit schwarzem Haken · schwebende Knöpfe (✨, ↶, ↷) halbtransparent grau (≈ `#6a6a6b`, Weichzeichner), weisse Symbole, ausgegraut wenn nicht möglich.
**Zonenfarben** (Kugel, Profilbalken, Zonen-Pillen): Z1 `#5445da` · Z2 `#5365f6`, hell `#82aff6` · Z3 `#5bbbd5`, hell `#88e6e7` · Z4 `#88e1a7` · Z5 gelb `#f5c347`, rot `#d6533c`;
nicht belegte Zone abgedunkelt (`#42331a`). Balken «Training Load» `#6d70dd` auf `#27292d` (bis zur Obergrenze `#3d3f42`); Balken «Reg» Verlauf `#514bdc → #4f7eef → #4897c8 →
#48a18c → #4ca869`, «HIT»-Teil gedämpft `#8c723b → #8c5843 → #8b4260`; Korridor-Band `#95e39c`. Als CSS-Variablen `--wk-…` in `css/v6.css`. Wie unsere Intensitätsstufen
(Grundlage · Schwelle · VO2max, Laktatzonen aus `laktat.md`) auf diese Farben fallen, legt Claude fest und schreibt es in `docs/anleitung/bedienung-design.md`.

### Kopf-Panel (Kalender → Liste und Bearbeiten-Modus; bleibt oben stehen; unten gerundet)
Masse in pt bei 430 pt Breite, auf 390 pt herunterskalieren; Seitenrand 16 pt.
1. **Titelzeile:** links «Grundlage | Belastung 2» (17 pt halbfett, weiss), rechts «23.–29. Nov.» grau.
2. **Zwei Spalten:** links «Reg vs. HIT» mit «88 % • 12 %» (erfunden) rechts daneben und darunter ein Verlaufsbalken (19 pt hoch, Radius 8) mit weisser Strichmarke am Zielanteil; rechts
   «Zonen» und darunter eine Reihe farbiger Pillen, Breite ∝ Zeitanteil der Zone.
3. **Training Load:** links Beschriftung mit Wert (z. B. «450», erfunden) und Balken (17 pt hoch; Füllung `#6d70dd`; zwei weisse Strichmarken = Korridor der Woche, z. B. 500–580); rechts ein
   kleines Verlaufsdiagramm: grünes Korridor-Band, weisse Linie mit einem Punkt je Tag (gewählter Tag grösser und gefüllt, erster Punkt hohl). Wert = Status (Ermüdung ÷ Fitness)
   am Tagesende, aus der Formkurve der Seite mit der geplanten Last fortgeschrieben.
4. **Tagesleiste:** eine dunkle Pille (26 pt hoch, volle Rundung) mit den sieben Tageszahlen; der gewählte Tag ist ein weisser Kreis mit schwarzer Zahl. Darunter sieben
   Umriss-Pillen gleicher Breite (26 pt hoch, Umriss `#27292d`) mit **weissen Sportsymbolen** (≈ 16 pt; mehrere Einheiten = mehrere Symbole) und je Einheit einer **Kugel**.
   Freier Tag = nur ein Kalender-✕-Symbol, keine Pille. Tippen auf eine Zahl springt in der Liste zum Tag; Blättern in der Liste setzt den gewählten Tag nach (Punkt vor dem Tagesnamen).
5. **Kugel** (Ø ≈ 7 pt, bei Bedarf bis 9): ein Kreis, **senkrecht in Streifen** geteilt, **ein Streifen je Zone, in der die Einheit im Hauptteil Zeit verbringt** (Einfahren und
   Auslaufen zählen nicht), links die höchste Zone, rechts die niedrigste, Breite ≈ Zeitanteil (mindestens 20 %). Nur eine Zone = einfarbig. Beispiele aus dem Screenshot:
   VO2max-Schwimmen = rot | gelb | cyan | blau; lockere Einheit = einfarbig blau. Umsetzung: `border-radius: 50%` mit `linear-gradient(90deg, …)` und harten Stopps.

### Zustand eines Tages (Silas, 22.11.: «gleiche dort ab, wie es dargestellt ist»)
Standard, von Hand gesetzt und gesperrt müssen in Tagesleiste, Tagesliste und Tagesblatt auf einen Blick zu unterscheiden sein; dazu die Sportarten und die Zeit, die an dem Tag gelten.
Aus den Aufnahmen belegt: «Tag sperren» mit Schloss-Symbol und dem Satz «Dieser Tag bleibt bei Anpassungen … unverändert» (nur im Bearbeiten-Modus); im Tagesblatt eine Zeile mit
Sportart-Pille, Zeitregler und Wert (siehe unten). **Nicht zu sehen** ist, wie Enduco in Leiste und Liste einen **gesperrten** oder **von Hand verkürzten** Tag zeichnet – in den Aufnahmen
kommt keiner vor. Darum: Silas hängt zu W2 einen Enduco-Screenshot mit einem gesperrten und einem von Hand verkürzten Tag an (Leiste und Liste); Claude gleicht daran ab. Ohne Screenshot
baut Claude eine schlichte Fassung (Schloss, weiss, am Tagesnamen und an der Pille; von Hand gesetzt: eingestellte Zeit in Grau neben der Status-Zahl) und meldet, dass der Abgleich fehlt.
Seit W1 zeigt «Woche einstellen» den Zustand schon als kleines Zeichen (Standard · von Hand · gesperrt).

### Tagesliste (Karte `#161617`, oben gerundet)
- Je Tag eine Kopfzeile: **«• Dienstag, 12. Mai»** (18 pt halbfett; der Punkt nur beim gewählten Tag), rechts die Status-Zahl (grau, z. B. «0,60»), ein Mini-Balken (≈ 54 × 8 pt,
  Spur `#27292d`, weisse Füllung, Füllung = Zahl ÷ 2,1 der Spurbreite, im Video gemessen) und ein kleiner weisser Rundknopf «…» (Ø 16 pt, dunkle Punkte).
- Darunter je Einheit eine Zeile: weisses Sportsymbol, Titel (weiss, 16 pt), grau «34 min · 1,2 km · 27 TL» (14 pt); rechts das **Profil** (Balken: Breite = Dauer, Höhe =
  Intensität, Farbe = Zone; ≈ 120 pt breit, 16–28 pt hoch; vorhandenes `profilSVG` verwenden).
- Tag ohne Einheit: Zeile «Kein Training» mit ✕-Kreis (Ø 34 pt, `#484b52`). Haarlinie zwischen den Tagen.
- **Weg:** farbige Sportsymbole und graue Symbol-Kacheln, «1 Einheit»-Texte, grosse «…»-Kreise, Quellenzeilen («Vorschlag», «eigen») in der Liste (bleiben im Tagesblatt und auf der
  Einheit-Seite). Erledigte Einheiten behalten ihren Haken.

### Bearbeiten-Modus
Gleicher Kopf. Darunter der Griff (100 × 6 pt, `#4d4d4d`), rechts ✕ (grau) und ✓ (weiss), je Ø 34 pt. Unten schwebend: ✨ links, ↶ ↷ rechts (56 × 56 pt, Radius 16).
Kopf, Tageszahlen, Diagramm und Wochenlast **ändern sich live** mit jeder Änderung und beim Zurücknehmen (↶ ↷). Schloss und Ziehgriff der Einheiten wie bisher, aber in der
neuen Optik (weiss auf dunkel).

### Tagesblatt hinter «…»
Titel «Montag, 12. Mai»; Kennzahlen-Kachel **Fitness · Ermüdung · Training Status** (Zahl mit kleiner Skala); Zeilen «Training hinzufügen >», «Tag sperren» (Schloss, darunter
«Dieser Tag bleibt bei Anpassungen unverändert»), **Verfügbarkeit** (jetzt auch im Bearbeiten-Modus – W1), Garmin; gleiche Zeilen-Optik (Symbol links, Text, Chevron rechts, Haarlinien).
**Verfügbarkeit wie bei Enduco** (Aufnahme 17-31-12): eine Zeile mit weisser **Sportart-Pille** (zeigt die gewählten Sportarten; antippen klappt drei Pillen Schwimmen · Rad · Laufen
mit Häkchen auf, ‹ klappt zu) und **Zeitregler** (grüne Spur, weisser Griff mit dunkler Mitte, Wert rechts, z. B. «1 h 30»); ändern wirkt sofort (W1: Umplanen beim Schliessen).
Aus der Aufnahme 20-17-01: während Enduco umplant, schimmern die Pillen aller Tage der Woche (Funken-Symbol) – in W2 als Zeichen «rechnet» vorsehen (die Seite rechnet ohne Warten).

### Abnahme W2
- Playwright-Bilder der Demo (390 × 844, dunkel und hell) von Liste, Bearbeiten, Tagesblatt; Silas bekommt sie **neben IMG_0093** gelegt (nicht ins Repo).
- Farbwerte der Variablen stimmen mit den Hex-Werten oben; Kugel je Einheit mit Streifen; Status-Zahl in Liste, Tagesblatt und Diagramm ist dieselbe; nichts überlappt bei 360 pt Breite;
  helles Thema lesbar; Zustandszeichen (Standard, von Hand gesetzt, gesperrt) in Leiste, Liste und Tagesblatt; `tests/test_v93.cjs` (Kugel-Streifen aus den Zonen, Zonenfarbe-Zuordnung,
  Mini-Balken-Skala, freie Tage, Zustandszeichen); alle Tests grün; Leck-Prüfung.

## Etappe W3 – Planen und Bearbeiten wie Enduco (bearbeiten-2.0, planen-fluss-1.0 · V9.4)
- **«Training planen»** (statt «Training hinzufügen») als Blätter hintereinander mit ‹ zurück: **1 Sportart** (Zeilen mit weissem Symbol und >: Schwimmen, Rad, Laufen, Indoor Rad,
  Indoor Laufen, Kraft, Mobility – was die Seite kennt) → **2 Intensität** (Grundlage · Tempo/Schwelle · VO2max · anaerob · Test, mit Farbkachel und Kurzbeschrieb) →
  **3 Workout-Liste** (Name, Dauerbereich «37 min – 1 h 45», Profil; unten «Über» mit Beschrieb) → **4 Trainingsdauer**: Uhr-Symbol, Titel, Kacheln TRAINING LOAD und DISTANZ,
  grosses Profil mit Minutenachse, grosse Dauer, Regler; unten ‹ und «Speichern ✓» (grau, bis der Regler bewegt wurde, dann weiss). Profil, TL und Distanz laufen live mit dem Regler.
  Die Sportauswahl zeigt an einem von Hand gesetzten Tag nur die erlaubten Sportarten (Silas' eigene Einheit darf er aber bewusst trotzdem setzen: dann Meldung, wie in W1).
- **«Training bearbeiten»** (Tippen auf die Einheit): Titel, Untertitel, Zeilen «Zu Indoor ändern» bzw. «Zu Draussen ändern», «Trainingsdauer 34 min >», «Einfahren 2 min 34 >»,
  «Intervall-Intensität 50 % >» (mit Erklärung), unten rot «Löschen». Dauer führt auf denselben Regler-Bildschirm. (Felder und Grenzen wie `einheit-felder-1.0`; nichts Neues erfinden.)
- Beim Speichern: Anker setzen und umplanen (W1), im Entwurf live; Löschen merkt die Streichung (W1).
- Unverändert: Einheit-Seite (`V73UI`), Garmin-Karten, lange Texte.

### Abnahme W3
`tests/test_v94.cjs`; Durchlauf in der Demo per Playwright: Sport → Intensität → Workout → Dauer → Speichern → Einheit steht in der Liste, Kopf aktualisiert, ↶ nimmt zurück ·
Bearbeiten → Dauer ändern → Kopf live · Löschen → Streichung gemerkt. **Silas prüft:** eine Einheit planen und wieder löschen, Dauer ändern und ↶/↷, Ablauf wie in der Enduco-Aufnahme.

## Etappe W4 – Zeit und Intensität als Stellschrauben (zeit-intensitaet-1.0 · V9.5)
**Stand 23.11.2026: gebaut in V9.5** (Regeln, Zahlen und Begründungen in `docs/anleitung/plan.md`, «Zeit und Intensität als Stellschrauben»; Abnahme `tests/test_v95.cjs`;
offener Punkt 153).
Nach W1 (W2 und W3 nicht nötig). Beides immer **innerhalb der Maximalzeit** eines Tages; nichts davon trägt etwas als «von Hand» ein.
- **Verdichten (Silas, Punkt 3):** Bleibt nach «Verschieben» und «Kürzen» Last übrig, versucht die Seite vor der Frage (W1), **dieselbe Last in weniger Zeit** unterzubringen: Die Einheit
  wird kürzer und dafür um **eine** Intensitätsstufe höher (z. B. Grundlage → Anteile Tempo). Es ist die Ausnahme («im Normalfall habe ich ja die Zeit»). Bedingungen – Claude legt die Zahlen
  nach `plan.md` und `laktat.md` fest und schreibt sie in `plan.md`: nur Einheiten der Seite (nie Eigenes, Gesperrtes, Tests, Rennen, Schwimmkurs); Last (TL) etwa gleich (± 10 %);
  höchstens zwei verdichtete Einheiten je Woche; die Zahl harter Einheiten der Phase wird nicht überschritten; keine harte Einheit an Land neben einer harten; nicht in Erholungs- und
  Rennwochen; nicht, wenn die Ampel auf «vorsichtig» steht. Jede Verdichtung steht im Bericht mit Grund («Mittwoch Rad: 1 h 15 statt 2 h, dafür mit Anteilen Tempo – gleiche Last»);
  ↶ und «Neu berechnen» nehmen sie zurück. Reicht auch das nicht, kommt die Frage.
- **Zeit als Ziel (Silas, Punkt 4; offener Punkt «Mehr Zeit als geplant», Nr. 135):** Hat ein Tag mehr Zeit, als der Plan braucht, und liegt die Wochenlast unter der Obergrenze des
  Korridors, verlängert die Seite dort die längste **lockere** Einheit (innerhalb ihres Bereichs) – **höchstens bis zur Zeit des Tages** und nur, bis die Wochenlast im Korridor liegt.
  Nie in Erholungs- und Rennwochen, nie auf gesperrten Tagen, nie an Einheiten, die Silas selbst gesetzt hat. Steht im Bericht («Donnerstag: Rad + 25 min, die Zeit war da»).
  (Aus der Aufnahme 20-17-01: Enduco legte bei viel Zeit am Mittwoch zusätzlich einen Lauf zur Ausfahrt.)
  **Entscheid (Claude, 22.11.2026 – Silas überlässt es der Trainingslehre):** ja, genau so begrenzt. Begründung: Für die Langdistanz ist zusätzlicher Umfang im lockeren Bereich der
  wirksamste und am wenigsten riskante Reiz; die Wochenlast bleibt im Korridor der Periodisierung (keine Lastsprünge, Erholungs- und Rennwochen bleiben, was sie sind), mehr Zeit wird nie
  zu mehr Intensität. Eine zusätzliche Einheit (wie Enduco den Lauf zur Ausfahrt) nur, wenn die längste lockere Einheit schon an ihrem Bereich anstösst und der Tag mindestens 45 min
  übrig hat – dann eine lockere Einheit der Sportart mit dem grössten Rückstand zur Wochenverteilung, nie eine zweite harte.
### Abnahme W4 (`tests/test_v95.cjs`, erfundene Daten)
Verdichten: knappe Woche → Einheit kürzer und eine Stufe höher, TL ± 10 %, höchstens zwei je Woche; kein Verdichten in Erholungs-/Rennwoche, bei Ampel «vorsichtig», bei Eigenem und
Gesperrtem; reicht es nicht, kommt die Frage. Zeit als Ziel: Tag mit viel Zeit → längste lockere Einheit länger, nie über die Zeit des Tages, Wochenlast ≤ Obergrenze des Korridors;
Erholungswoche und gesperrter Tag unverändert. Pfadunabhängigkeit bleibt (gleiche Eingaben, gleiche Woche). **Silas prüft:** (a) knappe Woche → Bericht nennt die Verdichtung mit Grund;
(b) Tag mit viel Zeit → längste lockere Einheit wird länger, nie über seine Zeit.

## Etappe W5 – Automatisch senden als Einstellung (garmin-auto-1.0 · V9.6)
Silas, 22.11.: Jeder Abend automatisch gesendet – «was wir aber nicht schon jetzt starten». Dazu eine Einstellung, mit der man das automatische Senden **stoppen** und die **Uhrzeit** festlegen
kann, ab wann gesendet wird (z. B. Vortag 23:00). Baut auf W1 (Aufträge aller Tage nachführen).
**Heute:** je Tag das Häkchen «Am Vortag um 23 Uhr automatisch senden» (Auftrag `gs-<Datum>`, Modus «auto»); `AB_UHR` = 23:00 fest in `tools/garmin_senden.py`; das Nacht-Update läuft kurz
vor 23 Uhr, wartet bis 23:00 und sendet als Letztes (`updates.md`, «An Garmin senden»).
**Neu:** Planeinstellungen → Abschnitt «Garmin senden» (Eingabe `planeinstellung`, ID «pe-garmin», Muster wie `pe-kraft` und `pe-lang` in `updates.md`; die Prüfung lehnt Unbekanntes ab):
- **Automatisch senden:** «Aus» (stoppt alles Automatische; «An Garmin senden» von Hand bleibt) · «Nur Tage mit Häkchen» (**Standard = heutiges Verhalten**) · «Alle Tage» (jeder Abend;
  **bleibt aus, bis Silas es einschaltet – die Etappe schaltet nichts ein**).
- **Senden ab:** Uhrzeit am Vortag, Standard 23:00, in 15-min-Schritten von 20:00 bis 23:30.
- **Die Seite sagt, wie es wirklich ist:** «Gesendet wird im Nacht-Update. Es läuft kurz vor 23 Uhr: eine frühere Uhrzeit ändert nichts, eine spätere verlängert das Update um die
  Wartezeit.» (Die Zeit der geplanten Aufgabe ändert Silas im Chat, nicht auf der Seite.)
- **«Alle Tage»:** Die Seite legt beim Laden und nach jeder Änderung (`auftraegeNachfuehren`, W1) für jeden Tag von morgen bis eine Woche voraus mit sendbaren Einheiten einen Auftrag mit
  Modus «auto» an bzw. erneuert ihn (nur wenn sich die Fassung ändert); ein Tag mit Modus «aus» bleibt aus (Tageskarte: «automatisch (alle Tage)» mit Häkchen zum Abstellen).
  Bekannte Grenze, im Blatt sagen: Aufträge entstehen im Browser – öffnet Silas die Seite tagelang nicht, bleibt der zuletzt angelegte Stand. Später möglich: das Nacht-Update erzeugt die
  Aufträge selbst (Planer in Node, `tests/sim`) – eigener Auftrag, nicht jetzt.
- **Werkzeug:** `tools/garmin_senden.py plan` liest die Einstellung aus `data.json` (ohne Eintrag: wie heute); «Aus» → offene `auto`-Aufträge abschliessen mit «automatisch senden
  abgestellt» (wie Modus «aus»); `AB_UHR` kommt aus «Senden ab». `updates.md` und `garmin.md`: «bis 23:00 warten» wird «bis zur eingestellten Uhrzeit warten, höchstens bis 23:30».
### Abnahme W5 (`tests/test_v96.cjs`, `tests/test_tools.py`, erfundene Daten)
Ohne Eintrag verhält sich alles wie heute · «Aus»: kein `auto`-Auftrag wird gesendet, ein Auftrag mit Modus «senden» schon · `plan --jetzt` um 22:58, 23:10 und 23:40 mit «Senden ab» 23:00 und
23:30 · «Alle Tage» legt Aufträge für sieben Tage an und erneuert sie nur bei geänderter Fassung; ein Tag mit «aus» bleibt aus · die Eingabe wird geprüft · die Demo startet mit «Nur Tage mit
Häkchen». **Silas prüft:** Einstellung sichtbar, Standard «Nur Tage mit Häkchen»; «Aus» zeigt am Tag «automatisch senden abgestellt»; «Alle Tage» schaltet er erst ein, wenn er es will.

## Reihenfolge, Aufwand, Modell
W1 zuerst (Silas' Hauptärger), dann W2, W3, W4, W5. W5 hängt nur von W1 ab und lässt sich vorziehen; W4 ebenso. Aufwand: W1 mittel bis gross (Grenzen an allen Stellen prüfen, Entwurf mit
Verfügbarkeit, Frage), W2 gross (zwei Sitzungen möglich), W3 mittel, W4 mittel, W5 klein bis mittel.
Sonnet 5.5 für alle; Opus nur, wenn eine Etappe zweimal an derselben Stelle scheitert.

## Nicht ändern
`V66.verteilen` nur erweitern, nicht umbauen · Datenformat der Wochen nur um optionale Felder ergänzen (`gestrichen`, Entwurfs-Überlagerung der Verfügbarkeit, Antwort auf die Frage in
`E.verteilung`; W5: Planeinstellung «pe-garmin») · Garmin-Senden (ausser W5), Verschlüsselung, Planmodell (Phasen, Wochenlast, Korridor; W4 nutzt es nur), Einheit-Seite unverändert ·
`data.json` und `work/` nie committen · Leck-Prüfung vor jedem Push (mit `SPUREN_PW` aus dem Auftrag der Sitzung).

## Offen für Silas
- TrainingPeaks: beantwortet am 22.11.2026 (Export je Einheit über Enduco an Garmin Connect und TrainingPeaks). Offen: Soll die Seite später selbst an TrainingPeaks senden oder einen
  Kalender-Export anbieten? Eigene Etappe, blockiert keine.
- Für W2 (Zustandszeichen): ein Enduco-Screenshot (Leiste und Liste) mit einem **gesperrten** und einem von Hand **verkürzten** Tag – in den Aufnahmen kommt keiner vor.
- Beantwortet am 22.11. (19:58): «nicht überziehen» bestätigt; Ideen 1–5 entschieden (siehe «Was aus den Ideen vom 22.11. wurde»).
