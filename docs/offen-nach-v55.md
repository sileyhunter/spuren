# Offen nach V5.5, V5.6 und V5.7 (Stand 13.11.2026)

Nur offene Punkte. Erledigtes steht in `CHANGELOG.md` und `docs/AUDIT_V55.md`.

## Braucht Silas (Daten oder Freigabe)
1. **Laktat B1:** die zwei Stufentests in der Vorschau im Testzentrum bestätigen. Erst dann zählt «Laktat bei 200 W» in «Meine Entwicklung».
2. **CSS-Test:** 400 m und 200 m schwimmen, Zeiten im Tab Schwimmen eintragen, «Exportieren» und die Datei im Chat schicken.
3. **Fueling:** Einnahmen langer Einheiten im Protokoll erfassen; ohne Einträge bleibt alles «nicht protokolliert».
4. **Offizielle Bestzeiten:** Nettozeiten aus Ranglisten von Hand eintragen (FIT-Werte bleiben «Schätzung»).

## Live-Prüfungen auf dem iPhone (hier gesperrt)
5. **A08 Ilanz–Flims:** Route planen, «Varianten vergleichen»; Hauptstrassenanteil und Fazit prüfen (brouter.de war hier nicht erreichbar).
6. **A09 mit echter Prognose:** Pause am Zwischenziel und Windpfeile mit Open-Meteo prüfen (hier nur synthetische Wetterdaten).
   Dabei auch F1 (wetter-rt-1.2): erscheint bei fehlenden Winddaten «Wind nicht berücksichtigt»? Hier nur mit synthetischen Antworten geprüft.

## Noch nicht umgesetzt
7. **Mahlzeiten nach Typ mit Uhrzeit:** Garmin liefert je Eintrag eine Uhrzeit, bei vorab erfassten Mahlzeiten aber eine geplante.
   Vorher Regel festlegen, welche Uhrzeit als echt gilt; dann Tagesprotokoll im Nacht-Update abrufen. Fehlende Uhrzeiten nie rekonstruieren.
8. **Untere Navigationsleiste:** nicht umgesetzt, weil sie mit dem Bottom Sheet des Routenplaners kollidiert; jetzt Tab-Leiste mit Pfeilen.
9. **Lange Auswahllisten:** nur teilweise gekürzt (CSS-Formular, Varianten). Fueling-Einheit und Testauswahl als Detailkarten prüfen.
10. **Undokumentierte FIT-Nachrichten:** nur nutzen, wenn Garmin sie beschreibt; bis dahin keine Einnahmen daraus.
11. **Temperatur und Böen bei halben Lücken:** Fehlt nur einer von zwei Nachbarwerten (Stunde oder Stützpunkt), nimmt die Seite den
    vorhandenen (nie 0). Entscheid offen, ob das wie beim Wind streng «unbekannt» werden soll.

## Nach V5.6 (Stand 8.11.2026)
12. ~~Reihen im Nacht-Update~~ – **erledigt mit V5.7.1** (Freigabe 8.11.2026): Auftrag ergänzt, Reihen nur nach bestandener Prüfung
    (`tools/serien_pruefen.mjs`). Nach den ersten Nächten prüfen: Commits «Nacht-Update …» mit neuen Dateien in `serien/`, keine «(Reihen nicht übernommen)».
13. **Auf dem iPhone prüfen (hier nicht möglich):** Explorer in Safari (Wischen zum Markieren, Entpacken braucht iOS 16.4 oder neuer),
    Offline-Verhalten bereits geöffneter Reihen, Saisongrafik und RPE-Eingabe.
14. **Zwift-Workouts:** Zwift-Dateien enthalten keine Workout-Schritte. Plan vs. Ist nur, wenn das Workout auf der Uhr lief oder im
    Garmin-Kalender steht; ein Abgleich über Zwift-Runden wäre eine Vermutung und ist nicht umgesetzt.
15. **Garmin-Kalender spärlich:** Im Nacht-Update stehen nur einzelne geplante Einheiten (Enduco legt sie offenbar kurzfristig an).
    Die Saisontabelle zeigt Enduco-Stunden nur, soweit sie dort stehen.
16. **Laktatpunkte aus dem Explorer:** bleiben Vorschau; Übernahme als Kurzcheck erst nach Bestätigung im Chat (CLAUDE.md, Laktat).
17. **Schwimmen im Explorer:** im Becken meist nur Puls; Bahnen (`len`) sind gespeichert, aber noch nicht als eigene Grafik dargestellt.
18. **RPE-Kalibrierung:** braucht 20 bewertete Einheiten mit Morgenwerten; vorher nur Zähler.

## Routenplaner nach dem Wunsch vom 8.11.2026
19. **Live auf dem iPhone prüfen:** Chur → Lenzerheide mit Zwischenziel Paspels (Reihenfolge, Weg über Thusis/Tiefencastel), Rheintal-Velowege
    (Feinkies auf Dämmen soll gemieden werden), Chur → Milano mit «Andere Routen» (San Bernardino, Splügen, Lukmanier?). brouter.de war hier gesperrt.
20. **Profil auf brouter.de:** Upload über `/brouter/profile` ist laut BRouter-Quellcode mit CORS möglich; ob der öffentliche Server das Profil
    annimmt (Version der Kartendaten), ist ungeprüft. Sonst gilt automatisch fastbike mit Hinweis «eigenes Rennradprofil nicht verfügbar».
21. **swisstopo-Suche:** Antwortformat nach Dokumentation (x = Nord, y = Ost, wahlweise lat/lon) umgesetzt, live ungeprüft; Orte ausserhalb
    der Schweiz (z. B. Milano) nur über die Karte.
22. **Pässe benennen:** Alternativen tragen nur Nummer, Abweichung und höchsten Punkt; Passnamen bräuchten einen weiteren Dienst.

## Smart Training Routes (V5.7)
23. **Live in der Schweiz prüfen (hier gesperrt):** «Passende Route finden» ab deinen gespeicherten Startorten mit einer echten Enduco-Einheit;
    2 h Grundlage @ 200 W (Dauer ±5 %?), Intervalle (liegen sie auf ruhigen, gleichmässigen Abschnitten?), Laufen 60 min, Gravel mit Schotter,
    Wetter-Vorschlag B mit echter Open-Meteo-Prognose, Tageslicht abends. Chur–Lenzerheide über Paspels im Planer wie bei Punkt 19.
24. **Rundtouren in Tälern:** Die Kandidaten liegen auf einem Kreis durch den Start (6 Richtungen). In engen Tälern (Domleschg, Schanfigg)
    schiebt BRouter Zwischenziele auf den nächsten Weg – oft Hin und zurück auf derselben Strasse oder eine Stichstrasse. Ob die Auswahl dort
    gute Runden findet, ist ohne Schweizer Kartendaten ungeprüft. Später: «Meine bewährten Trainingsstrecken» aus deinen Garmin-Spuren.
25. **Verkehr:** `consider_traffic` wirkt nur mit der geschätzten Verkehrsklasse in den Kartendaten von brouter.de (ungeprüft); dafür neu
    `avoid_mainroads` in der velofreundlichen Variante. Windschutz (Wald, Siedlung) wird nicht beurteilt, nur Böen quer zur Fahrtrichtung.
26. **Workouts ohne Kalenderdatum:** Enduco legt nicht jede Einheit im Garmin-Kalender an; dann «neu von Enduco» (ohne Datum) oder eigene
    Angaben. Ob das Nacht-Update die neuen Workouts zuverlässig findet, zeigt sich erst nach einigen Nächten.
27. **Export zu Garmin:** GPX mit Intervall-Wegpunkten herunterladen und in Garmin Connect importieren; ein direktes Hochladen von der Seite
    gibt es nicht (kein Server). Auf Wunsch lade ich eine GPX-Datei aus dem Chat als Strecke hoch – nur mit ausdrücklichem Ja.
28. **Vorschläge im Speicher:** Je gewähltem Vorschlag ~10 kB (kompakte Linie) in den Eingaben bzw. `data.enc.json`. Nach einigen Monaten
    alte, ausgewertete Vorschläge auf die Kennzahlen kürzen.

## Planer V5.8 (Wünsche vom 9.11.2026)
29. **Skitourenrouten live prüfen (hier gesperrt):** Antwort der swisstopo-identify-Schnittstelle für `ch.swisstopo-karto.skitouren` mit einem
    Rechteck (Geometrie, Attributnamen, Teilung in mehrere Objekte je Route) ist nach Dokumentation umgesetzt und nur mit einer nachgebildeten
    Antwort getestet. Zu prüfen: eine Tour bei Chur (z. B. Fürhörnli oder Piz Beverin), ob Anschlüsse an Kreuzungen und Varianten passen.
30. **Hangneigung:** Raster Mapzen/AWS Terrain Tiles (~25–30 m Auflösung in der Schweiz) unterschätzt kurze Steilstufen; die swisstopo-Karte
    «Hangneigung über 30°» (swissALTI3D) ist genauer und per Knopf einblendbar, wird aber nicht ausgewertet (nur Bild). Später: Profil-Dienst
    von swisstopo (DTM2) für die Spur oder Auswertung der Rasterfarben – beides live ungeprüft.
31. **MTB-Abfahrt:** «Singletrail» nutzt das BRouter-MTB-Profil mit `MTB_factor` 1; ob es in Graubünden bekannte Trails findet (OSM `mtb:scale`
    oft leer), ist ungeprüft. Kantonale Regeln für Velos auf Wanderwegen prüft die Seite nicht (Hinweis «unklar»).
32. **Wegende beim Wandern:** BRouter sucht Wege für einen Punkt bis 60 km weit (dynamischer Radius); das Wegende kann deshalb auf einem Weg
    liegen, der nicht zum Gipfel führt. Dann die Lücke von Hand schliessen und mit Punkten führen.
33. **Ringe auf «Heute»:** Die Morgenwerte des Tages kommen mit dem Nacht-Update; tagsüber zeigen die Ringe den letzten vollständigen Tag
    (mit Datum). Ein Abruf am Morgen (z. B. mit dem Morgen-Briefing) würde sie aktueller machen – nur mit deiner Freigabe für einen weiteren Lauf.

## V5.9 (Auftrag vom 9.11.2026)
34. **Direkt speichern einrichten (Silas, einmal je Gerät):** feingranularen GitHub-Schlüssel anlegen (nur sileyhunter/spuren,
    «Contents: Read and write», 1 Jahr) und in den Einstellungen einfügen, dann «Verbindung testen». Die echte GitHub-API war hier nicht
    erreichbar; getestet mit einer nachgebildeten Antwort. Zu prüfen am iPhone: Check-in, eine Eingabe im Flugmodus, danach mit Netz.
35. **Schlüssel läuft nach einem Jahr ab:** Die Seite meldet dann «ungültig oder abgelaufen», die Eingaben warten. Erinnerung im
    Morgen-Briefing einen Monat vorher wäre möglich (nur mit Freigabe).
36. **Jede Eingabe ist ein Commit auf main** («Eingang») und löst einen Pages-Build aus. Bei vielen Eingaben am Tag wäre ein eigener Zweig für
    `eingang/` möglich; das Update müsste ihn dann zusätzlich holen.
37. **Trainingslast umschalten (Silas):** Vergleich Garmin-FTP → LT2 liegt vor; die Seite rechnet weiter mit der Garmin-Last, bis Silas
    bestätigt (`config.load_model = "last-2.0"`). Die hinterlegte LT2 ist eine Vorschau aus einem nicht ausbelasteten Test (29.4.2026); nach
    dem neuen Stufentest mit Ausbelastung neuen Eintrag in `config.last_ref.rad` (ab Testdatum) – Fahrten davor behalten die bisherige.
    Ältere Tests (Labor 15.8.2024, Stufentest 4.12.2025) sind nicht eingetragen (Vorschauen; E1: die Vorschau vom 29.4. bis zum neuen Test).
38. **Eigene Referenz je Leistungsmesser:** Zwift-Rolle, Quarq und EngineCheck werden nicht ineinander umgerechnet; eine eigene LT2 je
    System erst nach einer Vergleichsfahrt (gleiche Fahrt, zwei Messer).
39. **CSS-Test am 19.11. (Silas):** 400 m und 200 m maximal, Zeiten auf der Seite eintragen (Schwimmen → zwei Zeiten). Der Termin wird
    bis 4 Tage daneben abgehakt. Ein Vergleich in «Meine Entwicklung» braucht einen Test im Zeitraum und einen davor (gleiches Becken).


## V6.1 Etappe 1 «Daten» (13.11.2026)
40. **Rückwirkend nachholen (V6.2.1):** Readiness und Stress kommen mit 20 Tagen je Nacht über die kleinen Abfragen (Readiness bis
    Spätsommer 2024 rund 6 Wochen, Stress bis 2020 einige Monate), Notizen mit 20 Aktivitäten je Nacht. Body Battery und Minuten mit hohem
    Stress gibt es nur ab jetzt (die grosse Tagesabfrage wäre für Hunderte Tage zu schwer). Der vollständige Garmin-Export liess sich am
    13.11. nicht aus iCloud laden; ein Leser dafür wird erst gebaut, wenn eine echte Datei vorliegt (Format nicht geraten).
41. **Garmin-Werte und Ampel:** Readiness, Body Battery und Stress werden gezeigt, aber nicht eingerechnet. Ob und wie sie in die Ampel
    kommen, entscheidet Etappe 3 (Kalibrierung an den eigenen Daten).
42. **Notizen in anderem Format:** Gelesen werden die Abschnitte «Laktat …:» und «Verpflegung …:» im bisherigen Format. Zeilen, die nicht
    passen, stehen als Hinweis da (`notizen_hinweise`); nichts wird erraten. Neue Formate nur mit neuer Version (notizen-1.1) und Test.
43. **Monatsexport und Wetter:** `import_export.py` baut die Aktivitäten aus FIT neu und übernimmt nur gid und Name; `wx` holt das
    Nacht-Update danach wieder (10 je Nacht). Die Notizen liegen deshalb getrennt je Garmin-ID (`garmin_notizen`) und gehen nicht verloren.

## V6.2 Etappe 2 «Zonen, Last und Tests» (13.11.2026)
44. **Zonen-Vorschlag (Silas):** Die Rad- und Lauf-Tests in den Daten sind teils noch Vorschau (B1 offen); bis zur Bestätigung zeigt die Seite
    den Vorschlag, übernimmt ihn aber nicht. Der Rad-Test vom 29.4.2026 war nicht ausbelastet (LT2 nur Dickhuth); sinnvoll wird der Vorschlag
    mit dem ausbelasteten Test am 5.12. Die aktiven Zonen vom 23.10.2026 nutzen auch Felddaten und sind jünger als die Tests: die Seite sagt das.
45. **Innere Grenzen (zonenvorschlag-1.0):** Z1/Z2 und Z4/Z5 sind Verhältnisse aus einer allgemeinen Skala, keine Messung. Liegt der LT2-Puls
    hoch (beim Laufen nahe am Maximalpuls), wird Z5 im Puls kaum erreichbar; dann Intervalle nach Tempo bzw. Leistung steuern. Eine Regel mit
    Maximalpuls (eigene Version, Test) erst, wenn ein gemessener Maximalpuls in den Daten steht.
46. **Nach neuen Zonen:** Die Aufträge «Morgen-Briefing» und «Abend-Check» enthalten die Zonen vom 23.10.2026 als Text. Nach einer Bestätigung
    müssen sie im Chat nachgeführt werden (die Aufträge liegen nicht im Repository).
47. **Garmin-Datenexport (V6.2.3):** Der Abgleich mit der Garmin-Verbindung war am 13.11. nicht möglich (Dienst nicht erreichbar). Darum
    kein Gesundheitsstatus (HRV, Ruhepuls) im Verlauf; das Nachholen über die Verbindung überschreibt die eingelesenen Werte später mit den
    eigenen, Abweichungen gleichen sich so aus. Im hochgeladenen Teil fehlten die Tagesübersichten (Stress und Body Battery je Tag) und die
    Aktivitäten (FIT). Weitere Inhalte (Garmin-Trainingsstatus, akute Last, VO2max-Verlauf, Ausdauer- und Hill-Score, Hitze/Höhe,
    Laufprognosen) sind nicht übernommen – erst bei Bedarf (Etappe 3 oder 10) mit eigener Version und Test.

## V6.3 Etappe 3 «Ampel und Check-in» (13.11.2026)
48. **Prüfung der Ampel mit wenigen Fällen:** Einzelne Gruppen haben noch wenige gleichmässige Blöcke, und HRV fehlt in den älteren Jahren.
    Die Entscheide (Schlaf 5–6 h nur Hinweis, Garmin-Readiness draussen) gelten als vorläufig; nach weiteren drei Monaten Check-ins neu prüfen
    (auch: hilft die HRV-Regel bei dir, und wie gut sagt der neue Check-in den Puls bei gleicher Leistung voraus).
49. **Weitere Zielgrössen:** Geprüft wird nur der Puls bei gleicher Leistung. Krankheitstage (Check-in «krank») und RPE der Einheiten kommen
    dazu, sobald genug Einträge da sind.

## V6.4 Etappe 4 «Modell und Wissen» (13.11.2026)
50. **Wochenstruktur fest:** Tage und Kurstag (Di) sind im Vorschlag fest (wochenplan-1.0). Eigene Tage, Abwesenheiten (Ferien, Reisen) und
    Krafttraining kennt der Vorschlag noch nicht; das kommt mit dem eigenen Plan (spätere Etappe), jeweils mit neuer Version und Test.
51. **Aufteilung 20/50/30 und Stunden:** Annahme, keine Studie. Die Stunden kommen aus dem Wochenstunden-Vorschlag («jetzt» = Median der
    letzten 8 Wochen); liegt er tief, fallen die lockeren Einheiten unter der Woche weg. Werte «jetzt»/«Spitze» lassen sich dort anpassen.
52. **Verteilung vergleichen:** Vorschlag und Enduco werden nach den Zielen der Abschnitte gezählt, Absolviertes nach Puls (unterschätzt harte
    Anteile). Ein Vergleich nach Leistung/Pace je Abschnitt (aus den Sekundenreihen) wäre genauer – erst mit eigener Version und Test.
53. **Wissen aktuell halten:** Neue Regel oder Version → Kapitel und `WS.REGELN` nachführen. Die Studienlage zur Reihenfolge polarisiert →
    rennspezifisch ist offen (Filipas 2022 fand die umgekehrte Reihenfolge bei Läufern besser); nach der Saison mit den eigenen Daten prüfen.

54. **Aufbau-Check auf «Heute»:** Liegt der geplante Lauf des Tages über der Aufbau-Grenze, steht das bisher nur unter Plan → Aufbau-Check.
    Ein Hinweis in der Karte «Heutiges Training» wäre direkter (gleiche Rechnung `V64.planKm`/`V64.laufGrenze`, keine neue Regel).
55. **Intensität je Sportart und Enduco:** Die Stufe einer Enduco-Einheit ohne Ziele in den Schritten (z. B. Schwimmen) kommt aus dem Titel.
    Enduco selbst lässt sich nicht einstellen; ob eine Einheit trotzdem gemacht wird, entscheidet Silas. Nach einigen Wochen prüfen, ob die
    Titel-Regel Fehlalarme gibt.
56. **Vergleich mit Enduco – Datenlücken:** Enduco ist nur über den Garmin-Kalender (Export meist am Vortag) und die Workouts auf der Uhr bekannt;
    Zwift-Einheiten ohne Uhr-Workout und ausgelassene Einheiten fehlen. Vergangene Vorschläge werden mit den heutigen Einstellungen nachgerechnet.
    Wenn die Einstellungen oft wechseln: Vorschlag jede Woche am Montag einfrieren (Nacht-Update), statt nachzurechnen.
57. **«jetzt» nach einer Pause:** Der Median der 8 Wochen davor reagiert langsam (nach der Pause im September liegt der Vorschlag deutlich unter
    dem, was trainiert wird). Silas kann «jetzt» und «Spitze» im Wochenstunden-Vorschlag selbst setzen; eine andere Regel nur mit neuer Version.

## Prüfung V6.4 (13.11.2026, `docs/AUDIT_V64.md`)
58. **Hängende Commits auf GitHub (Entscheid Silas):** Zwei alte Commits mit dem damaligen Zonenprofil und ein Commit mit Laufdistanzen sind
    in keinem Branch mehr, aber per SHA öffentlich abrufbar; dazu stehen bis V6.4.3 Unterzonen-Beispiele und Testtermine in der Historie.
    Wege: GitHub Support bitten, die hängenden Commits und gecachten Ansichten zu entfernen; das Repository privat schalten (Pages braucht dann
    ein bezahltes Konto) oder neu aufsetzen (neuer Schreibschlüssel fürs Handy, Pages neu aktivieren). Kopien in fremden Archiven lassen sich
    nicht zurückholen; ein neues Zonenprofil nach dem nächsten Test entwertet die alten Werte.
59. **Seite im Browser härten (Vorschläge):** Schlüssel nicht als Rohdaten im Browser-Speicher, «Merken» standardmässig aus, Knopf «Abmelden»;
    Routen, Punkte, Rad- und Zielwerte in den verschlüsselten Tresor; Bibliotheken mit SRI-Prüfsumme oder im Repository, Content-Security-Policy,
    kein JSONP-Rückfall, Schriften lokal; keine Referrer-Angabe an Dritte (`noindex` ist seit V6.4.4 gesetzt). Jeweils mit Test und ohne Live-Prüfung (Netz gesperrt)
    nur, wo die Dienste es sicher erlauben.
60. **Eingang (Vorschlag):** eigenes Repository nur für `eingang/` mit eigenem Schlüssel (der heutige darf den veröffentlichten Branch ändern),
    nur feingranulare Schlüssel, Commit-Identität ausdrücklich auf eine noreply-Adresse.
61. **Persönlicher Kontext im Code:** Rennen (Namen, Daten) stehen in `index.html`; sie könnten nur verschlüsselt in `config.races` liegen.
    Die Reihen in `serien/` sind grösstenteils noch SPS1 mit exakter Grösse (neu schreiben hilft nur für die Zukunft).
62. **Wissen:** Die Trainingsstunden aus Knechtle et al. 2011 sind nicht gegen den Volltext geprüft (nicht erreichbar). Testplan,
    Sollband lange Ausfahrt und «Meine Entwicklung» sind in den Kapiteln nur erwähnt, nicht erklärt.
63. **Gemeinsamer Stufentest im Testkalender:** Ein Eintrag «Rad und Lauf» gilt jetzt als zwei Tests am selben Tag. Besser wären zwei Einträge
    mit Feld `sport`, wenn die Termine das nächste Mal ersetzt werden.
64. **Aktivitätsnamen mit fehlendem Umlaut (Audit D24):** eine Zwift-Aktivität heisst wie geliefert ohne «Ü» am Anfang, das gleichnamige Workout
    im Garmin-Kalender mit. Vermutlich schon so aus Zwift/Garmin; beim nächsten Import prüfen, Namen nie still ändern.
65. **Oberfläche (Audit D, Rest):** Heute und Kalender zählen die Wochenstunden aller Sportarten, der Plan nur Schwimmen, Rad und Laufen –
    beschriftet, aber zwei Zahlen. Vergangene Phasen im Plan sind noch abgedunkelt (Kontrast nur aufgeklappt prüfbar). Safari/iOS und VoiceOver
    selbst sind nicht geprüft.

## Wünsche vom 13.11.2026 (Auftrag `docs/auftrag-etappen-6-8.md`; gebaut wird erst nach Silas' Okay)
66. **Teil 0, Fehler in Bestehendem:** Tagesdetail im Kalender liegt unter dem Bildschirmrand; Rennrad-Vorschläge mit Gravel; «Rückgängig» und
    «Neu» im eingeklappten Planer verdeckt; LT-Auswahl mit nur einer gültigen Methode gesperrt statt erklärt; «≈ 56m» beim Schwimmen; GPX-Weg zu Garmin Connect.
    **Erledigt mit V6.6 Teil 0.**
67. **Etappe 6, Kalender und Woche:** jeden Tag antippen (Tagesblatt, auch künftige Tage), Wochenansicht mit Umschalter Monat, Training hinzufügen
    (Sportart, Art, Vorlage, Dauer), Tag sperren, Verschieben und Entfernen, Änderungen verwerfen / Rest der Woche neu planen / Woche leeren,
    TL ≈ und Distanz ≈ geplanter Einheiten, jede KW im Plan antippen (Belastung 1–3 oder Erholung, Stunden, TL), «Je Sportart» mit allen drei Sportarten.
    **Erledigt mit V6.6 Etappe 6 (6.1–6.7),** offen: «Rest der Woche neu planen» (wochenplan-1.3); «An Garmin senden» ohne Schwimmen (Garmin braucht
    Strecken je Abschnitt) und ohne Strecken (`upload_course`, kommt mit Etappe 7); das Format ist erst mit dem ersten echten Senden geprüft (Rücklese);
    Vorlagen über der Intensitätswahl ausgrauen kommt mit 8.1. Die Wochenansicht hat kein eigenes Band Mo–So über den Tagen (die Tagesliste
    zeigt Datum, Schloss und heute selbst); Wischen zwischen Wochen fehlt (Pfeile).
68. **Etappe 7, Routen:** Rennrad nie mit Gravel, GPX-Export und Weg zu Garmin, Planer übersichtlicher (Zurück, Alle Punkte löschen, Reiter,
    «Stopps unterwegs» statt «Pausen»), Trainingsvorschlag auf der Karte antippen und als normale Route bearbeiten.
69. **Etappe 8:** Intensität Grundlage · Schwelle · VO2max, Testkalender auf der Seite bearbeiten, Einzelmessungen ein- und ausblenden,
    Ausdauertrend nach Jahr, Quartal oder Monat, Schwimmübung im Workout antippen mit Beschreibung, mehr Beinübungen.
70. **Entscheide Silas (13.11.2026, E1–E4):** Reihenfolge Teil 0 → 6 → 7 → 8; VO2max schliesst alles ein; eigene Einheiten von Hand bis eine
    Woche voraus und automatisch nur am Vortag um 23 Uhr an Garmin (Fenix und Edge, 6.7); Übungsbilder frei lizenziert, möglichst aus einer Quelle.
