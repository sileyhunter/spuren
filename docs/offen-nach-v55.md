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
    **Erledigt mit V6.6 Etappe 6 (6.1–6.7),** «Rest der Woche neu planen» mit V7.2 («Woche anpassen», verfuegbarkeit-1.0); offen: «An Garmin senden» ohne Schwimmen (Garmin braucht
    Strecken je Abschnitt) und ohne Strecken (`upload_course`, kommt mit Etappe 7); das Format ist erst mit dem ersten echten Senden geprüft (Rücklese);
    Vorlagen über der Intensitätswahl ausgrauen kommt mit 8.1. Die Wochenansicht hat kein eigenes Band Mo–So über den Tagen (die Tagesliste
    zeigt Datum, Schloss und heute selbst); Wischen zwischen Wochen fehlt (Pfeile).
68. **Etappe 7, Routen:** Rennrad nie mit Gravel, GPX-Export und Weg zu Garmin, Planer übersichtlicher (Zurück, Alle Punkte löschen, Reiter,
    «Stopps unterwegs» statt «Pausen»), Trainingsvorschlag auf der Karte antippen und als normale Route bearbeiten.
69. **Etappe 8:** Intensität Grundlage · Schwelle · VO2max, Testkalender auf der Seite bearbeiten, Einzelmessungen ein- und ausblenden,
    Ausdauertrend nach Jahr, Quartal oder Monat, Schwimmübung im Workout antippen mit Beschreibung, mehr Beinübungen.
70. **Entscheide Silas (13.11.2026, E1–E4):** Reihenfolge Teil 0 → 6 → 7 → 8; VO2max schliesst alles ein; eigene Einheiten von Hand bis eine
    Woche voraus und automatisch nur am Vortag um 23 Uhr an Garmin (Fenix und Edge, 6.7); Übungsbilder frei lizenziert, möglichst aus einer Quelle.

## Prüfung Karte vom 13.11.2026 – nicht Teil von Teil 0b (`docs/auftrag-karte-fehler.md`)
71. **Treffer-Blatt:** eigenes Blatt mit Gruppen nach Sport und Jahr, «Nur diese auf der Karte», später Abschnitte vergleichen.
72. **Filter-Blatt:** Reiter Filter · Punkte · Routen; aktive Filter als Chips auf der Karte; Anzahl am Knopf; aktiver Zeitraum markiert.
73. **Planer:** Ergebniszeile mit Wetter, GPX und Speichern oben; Suche oben (zu 7.3).
74. **Kartenknöpfe:** «Route planen» als Hauptknopf, +/− auf dem Handy weg, Ebenen als Blatt mit Vorschaubildern, Farblegende bei «Nach Sport»,
    «Aus» als dritte Wahl.
75. **Punkte:** langes Drücken setzt einen Punkt; Punkte über «Direkt speichern» auf alle Geräte bringen.
76. **Namen:** Vorschläge 1/2/3 statt A/B/C (mit 7.4 entscheiden); «Rundtour» heisst neu «Hin und zurück».
77. **Wetter:** Kurzzeile im Planer; MeteoSwiss-Modell über Open-Meteo (`models=meteoswiss_icon_seamless`, bis 5 Tage), vorher live prüfen.
78. **«Training → Route»:** Fortschritt anzeigen und Abbrechen erlauben.
79. **Kartenkacheln offline** entlang gespeicherter Routen.

## Ergänzung enduco-Vergleich vom 13.11.2026 (`docs/ergaenzung-enduco-vergleich.md`; gebaut wird erst nach Silas' Okay)
80. **Vorschläge C1–C12 und kleine Fehler D:** Analyse als Übersicht mit Detailseiten, Trainingsstatus im Verlauf, Heute entschlacken,
    Trainingsverfügbarkeit je Tag (erledigt mit V7.2, verfuegbarkeit-1.0), Plan über die ganze Saison, Renn-Blatt mit Zielzeit und Wettkampfpace, Einheit-Blatt vervollständigen,
    Agenda im Kalender, Zonen kompakter, Check-in «Alles durchschnittlich», Bibliothek mit Mini-Profil, Technikfehler → Übungen; dazu die vier
    kleinen Fehler unter D. Reihenfolge und Umfang entscheidet Silas.

## Prüfbericht Rechenmodelle, Grafiken und Trainingsplan vom 13.11.2026 (nicht im Repository: enthält echte Werte)
81. **Wochenstunden «jetzt» nach einer Pause zu tief** (saison-1.2: Median der 8 Wochen inkl. Pause). Sofort: Stunden auf der Seite von Hand setzen;
    Regel: kürzeres Fenster oder Abwesenheiten ausnehmen.
82. **Jagd- und Wandertage zählen mit Sitzzeit** (Last aus Timer-Dauer × Puls): Bewegungszeit statt Timer-Dauer, besser mit Pulsreserve.
83. ~~**«Heute» zeigt morgens eine zu gute Form**~~ – erledigt in V6.6.2 (status-1.1, `FK.pmcMorgen`: Form zu Tagesbeginn, Last bis gestern).
84. **Zwei verschiedene LT2** (Zonenprofil gegen Stufentest bzw. last-2.0): «knapp unter LT2» liegt dadurch über der gemessenen Schwelle.
85. **Watt-Ziele aus Zwift gelten auch draussen** (Plan, Langfahrt-Band); Puls bei gleicher Leistung draussen höher. Für die Last erledigt in V6.6.2
    (last-2.1: LT2 nur für ihr System, draussen ohne eigene LT2 nach Puls); Plan-Ziele und Langfahrt-Band offen.
86. ~~**Pauschallast bei Zwift-Fahrten im Monatsexport**~~ (FTP/LTHR fehlen in der FIT-Datei) – erledigt: last-2.1 rechnet sie mit der LT2 der Rolle,
    seit 14.11.2026 eingeschaltet (`config.load_model` «last-2.1», Silas' Okay).
87. **Intensitätsverteilung:** Plan nach Zielen, Absolviertes nach Puls – ungleich; besser Rad nach Leistung aus den Sekundenreihen.
88. **Lauf-VO2max-Pulsziel** an der Untergrenze Z5 statt 90–95 % HFmax laut Text.
89. **Ampel:** sehr hohe HRV zählt als gut (besser «ungewöhnlich hoch – beobachten»); «Passt die Ampel zu dir?» teilweise zirkulär, ohne Streubereich.
90. **Testkalender:** Stufentests verletzen die eigene Regel ohne Meldung (Konfliktprüfung nur für CSS).
91. **Plan ignoriert Skitouren und andere Sportarten** (Stunden und Vorlage nur Schwimmen, Rad, Laufen).
92. **Garmin-Tageswerte kommen kaum an** (Readiness, Body Battery, Stress; wellness-1.0) – Nacht- und Morgen-Update prüfen.
93. **Gering:** Aufbau-Grenze für Wochen mehr als 30 Tage voraus; Titel gekürzter Einheiten; Schwimm-Last mit dem Rad-Schwellenpuls; Renntempo
    Rad für die Langdistanz am oberen Rand und kein 70.3-Renntempo; Dickhuth am rohen Minimum (ein einzelner tiefer Wert bestimmt die Basis).

## Nach V7.2 (16.11.2026)
94. **Verfügbarkeit:** die Verteilung tauscht keine Einheiten (z. B. lange Ausfahrt und langer Lauf, wenn das Wochenende fehlt) und plant die Stunden
    nicht neu – weniger Zeit heisst gekürzt oder weggelassen, mehr Zeit wird nicht gefüllt. Gewichte der Verteilung sind eigene Festlegungen,
    noch nicht an echten Wochen geprüft. Mehrere Zeitfenster je Tag (morgens/abends) und «drinnen/draussen» gibt es noch nicht.
95. **Schwimm-Einheiten:** Umfang ohne CSS-Test nur aus dem Tempo der Becken-Einheiten (Richtwert); Übungen werden nicht nach deinen Technikfehlern
    gewählt (C12 «Technikfehler → Übungen» offen); Schwimm-Einheiten gehen weiter nicht an Garmin.

## Nach V7.6.1 (17.11.2026)
96. **Aufbau-Grenze in Wochen mehr als 4 Wochen voraus** (aufbau-1.1): geplante, noch nicht gelaufene Läufe zählen nicht – liegt der letzte gelaufene Lauf mehr als
    30 Tage vor einer Woche, plant sie lange und lockere Läufe mit höchstens 30 min («kein Lauf in den 30 Tagen davor»). Betrifft nur weit vorausgeplante Wochen; mit
    jedem gelaufenen Lauf rückt die Grenze nach. Vorschlag: geplante Läufe von Mein Plan bis zur Woche als «geplant» mitrechnen.
    **Erledigt in V7.6.2 (aufbau-1.2):** die geplanten Läufe der Wochen dazwischen zählen mit (bis zum Vortag, Distanz ≈ aus dem Zonenprofil).
97. **Langer Lauf am Donnerstag** (aus enduco übernommen) hat neben Rad-Schlüssel und CSS-Schwimmen (Wochenmodell Do) keinen Platz und bleibt am Sonntag; der Hinweis
    steht jede Woche. Entweder einen anderen Tag wählen oder das Wochenmodell anders verteilen (Rad-Schlüssel auf einen anderen Tag).
    **Erledigt am 17.11.2026 (V7.6.2, Silas: «offene Punkte bereinigen»):** Tage für lange Einheiten Laufen = Sonntag (gilt ab der Woche vom 23.11.2026).
99. **Schwimmkurs: letzter Kurstag** (kurs-1.0, V7.6.2): bis Silas das Datum nennt, gilt jeder Dienstag als Kurstag (nur Schwimmen). Sobald bekannt: unter Planeinstellungen →
    Schwimmen → «Schwimmkurs» eintragen; danach plant die Seite dienstags wieder alle Sportarten (2:45 h) und lockeres Schwimmen statt des Kurses.
    **Erledigt am 18.11.2026:** von Silas genannt und eingetragen (nur verschlüsselt).
100. **Zonen-Prüfung für Einheiten nach Puls** (laktat-hf-1.0 erfasst Puls und Laktat; die Prüfung «passt / Z2 zu hoch / unklar» ist nur vorgeschlagen, Etappe 4 mit
    aktivitaet-plan-1.0 für Skitour, Wandern, Langlauf und Traillauf – erst nach Silas' Okay).
     **Erledigt in V7.7 (zonenpruefung-hf-1.0, Karte «Zonen nach Puls prüfen»)**, mit der Planung von Skitour, Wandern, Langlauf und Traillauf (aktivitaet-plan-1.0).
101. **Etappe 4** (Okay am 18.11.2026): erledigt in V7.8 (Liste mit Raster, Trainingsstatus), V7.9 (Zyklus, Bearbeiten als Modus) und V7.10 (Tagesblatt, eigene
     Aktivität nach RPE). Bekannte Grenze: Einheiten in eine andere Woche ziehen geht nicht (Mein Plan ist je Woche gespeichert) – dafür entfernen und dort hinzufügen.
     Wie sich Ziehen auf dem iPhone anfühlt (Finger, Rand-Scrollen), ist nur im Browser geprüft.
98. **Krafttraining:** der automatische Tag wird an der schon verteilten Woche gewählt; eine Woche mit Tests am Wochenende lässt oft nur den Tag des langen Laufs
    (Hinweis). Die Übungen plant die Seite nicht; Kraft geht nicht an Garmin.

## Nach V8.0 (18.11.2026, Prüfung und Szenario-Tests, `docs/AUDIT_V8.md`)
102. **Offene Abnahmetests (todo in `tests/test_v80.cjs`):** A3 nach einem einzigen schlechten Morgen die nächsten Tage prüfen, B3 Kurzfassung bei knapper Zeit,
     D3 nach einer zu harten Einheit die folgenden prüfen, E2 Nachholen der Ampel nur als Vorschlag, H2 fehlende Garmin-Daten nicht als Ruhetage (alle V8.3);
     D2 geplant gegen absolviert je Einheit (V8.1); F2 andere Form desselben Reizes (V8.4); H3 Datenstand auf Heute (V8.6).
103. **Bezugsgrössen und Lastverhältnisse** (Befunde 1–3, 7, 14, 16): zwei LT2 für die Rad-Last, geplante Last unter der absolvierten, zwei Lastverhältnisse,
     Naht der Fitness-Vorschau, Gefühl-Kalibrierung mit Kraft, mehrere Rechnungen für Wochenstunden → V8.1, Regeländerungen nur mit Silas' Okay.
104. **Harte Einheiten an Land an zwei Tagen hintereinander** nach einer Verschiebung (Befund 10, z. B. solange dienstags nur Schwimmen geht): Frage an Silas.
     → erledigt in V8.1 (verfuegbarkeit-1.2, kraft-plan-1.2; Silas: «entscheide, was trainingstechnisch mehr Sinn macht»).

## Nach V8.1 (18.11.2026, Daten zusammenführen)
102. (Stand) D2 ist ein normaler Test; A3, B3, D3, E2, H2 (V8.3), F2 (V8.4) und H3 (V8.6) bleiben «todo».
103. (Stand) Bezugsgrössen (Befunde 1, 2, 7) mit tl-plan-1.1 erledigt; zwei Lastverhältnisse bewusst getrennt (Befund 3, erklärt im Wissen «last»); Gefühl-Kalibrierung
     ohne Kraft (Befund 14). Offen: Befund 16 – die Wochenstunden werden an mehreren Stellen gerechnet (gleiche Definition, aber kein gemeinsamer Code).
105. **Simulator: Körpermodell Laufen nicht auf TL ≈ abgeglichen** (wie geplant gelaufen ≈ 0,7 × TL ≈, weil die erfundenen Pace-Zonen und die Intensitätstabelle nicht
     zusammenpassen). D2 prüft darum nur «mehr als geplant». Vor V8.3 (Coach prüft die folgenden Tage mit der tatsächlichen Last) angleichen.
106. **Garmins Selbsteinschätzung** wird nur für die letzten 90 Tage nachgeholt (je Nacht höchstens 20 zusammen mit den Notizen); ältere Einheiten haben keinen Vorschlag.
     Ob Silas Anstrengung und Gefühl auf der Uhr überhaupt eingibt, zeigt sich erst nach einigen Nächten.
107. **«Nach dem Training» für Schwimmen:** Puls zur Leistung gibt es nur für Rad und Laufen (im Wasser kein Bezug). Kraft hat sein RPE weiter auf der Einheit-Seite.
108. **Schwimmen TL ≈ aus der Last pro Stunde** unterscheidet nicht zwischen locker und CSS; die absolvierte Last kommt beim Schwimmen aus dem Puls (Schwellenpuls Rad als
     Standard). Eigene Pulszonen fürs Schwimmen wären genauer – erst mit Silas' Okay.

## Nach V8.1.1 (18.11.2026, Verpflegung je Einheit)
109. **Glukose + Fruktose** muss Silas je Produkt markieren (Blatt «Produkte für die Verpflegung»); ohne Markierung bleibt jede Empfehlung bei höchstens 60 g/h.
110. **Verpflegung im Garmin-Workout** (Text im Schritt, z. B. «Gel bei 60 min»): erst nach Silas' Okay; bis dahin nur auf der Seite.
111. **Trinkmenge:** Garmins Schweissverlust wird erst ab 5 Tagen mit mindestens 45 min Training verwendet; Hitze und Höhe sind nicht eingerechnet (nur Hinweis).
112. **Koffein** wird nicht geplant (nicht unter den übernommenen Nährwerten); Renn-Verpflegung (Jesolo, Hamburg) kommt mit dem Rennplan, nicht je Einheit.
113. **Zuordnung Aktivität ↔ Einheit** für «geplant gegen genommen»: dieselbe Sportart am selben Tag, die Dauer am nächsten (wie last-abweichung-1.0).

## Nach V8.2 (18.11.2026, Persönliche Reaktionen)
114. (Stand V8.5) **Reaktionen im Plan:** Das Modell «Automatisch» liest «Was du bisher verträgst» (harte Einheiten pro Woche) und «Verteilung und Entwicklung» – nur nach unten
     bzw. zwischen polarisiert und pyramidal, nie für mehr. Wochenstunden und Lauf-km aus «Was du bisher verträgst» wirken nicht auf die Steigerung (nur mit Silas' Okay).
115. **Lauf-Effizienz je Block** braucht mindestens 3 vergleichbare Läufe je 4 Wochen; im Winter und nach Laufpausen fehlen sie, dann bleibt der Zusammenhang
     «noch zu wenig Daten». Ein lockereres Kriterium wäre möglich, aber weniger sauber.
116. **Stunden ohne «andere» Sportarten:** Wanderungen, Skitouren und Langlauf zählen in der Fitness, nicht in den Wochenstunden (wie in den Wochenstunden des Plans).
     Die Blockbilanz zeigt sie getrennt («andere»); «Was du bisher verträgst» gruppiert nur nach Schwimmen, Rad und Laufen.
117. **Grenzen und Mindestzahlen** (6 Fälle, 4 Wochen, 8 Block-Paare, Blockbilanz Fitness 3, Ruhepuls 1,5, HRV 5 %, Effizienz 2 %) sind eigene Festlegungen; nach einem
     halben Jahr mit mehr Daten prüfen.

## Nach V8.3 (18.11.2026, Täglicher Coach)
102. (Stand) A3, B3, D3, E2 und H2 sind normale Tests; F2 seit V8.4 auch (abwechslung-1.0); H3 (V8.6) bleibt «todo».
105. (Stand) Für den Coach reichte der Abgleich über «mehr als geplant» (D3); das Körpermodell Laufen im Simulator ist weiter nicht auf TL ≈ abgeglichen.
118. ~~**Verlängern** schlägt der Coach noch nicht vor~~ → erledigt in V8.4 (tagescoach-1.1, Anlass «umfang»; Silas: «wenn die Verfügbarkeit reicht, mit der Laufentwicklung aufpassen»). (nur Tauschen, locker, Kurzfassung, Nachholen) – die Seite macht von selbst nie mehr; eine Verlängerung käme nur mit einer klaren Regel
     (z. B. mehr Zeit als geplant und Woche unter dem Plan) und Silas' Okay.
119. ~~**Schmerzen** aus dem Check-in~~ → erledigt in V8.4 (tagescoach-1.1, Anlass «schmerz», «Rad locker statt Laufen» auf Silas' Wunsch). Motivation wirkt weiter nur über die Ampel. Bisher: **Schmerzen und Motivation** aus dem Check-in wirken weiter nur über die Ampel; ein Vorschlag «heute Rad statt Laufen» bei Schmerzen am Fuss wäre ein Sportwechsel und kommt
     nur mit Silas' Okay.
120. **Automatik in Grenzen:** Der Coach ändert nichts von selbst. Ob und in welchen Grenzen (z. B. nur kürzer oder lockerer) er später selbst handeln darf, entscheidet Silas nach
     dem Probelauf.
121. ~~**Wochenübergreifend** tauscht der Coach nicht~~ → erledigt in V8.4 (tagescoach-1.1: Tauschen, Nachholen und Ausgefallenes auch in die nächste Woche). Bisher: **Wochenübergreifend** tauscht der Coach nicht (nur innerhalb Mo–So); am Sonntag prüft er den Montag, tauscht aber nur innerhalb der neuen Woche.

## Nach V8.4 (18.11.2026, Rückmeldungen und Abwechslung)
122. **Atemfrequenz und Hauttemperatur** wirken in der Ampel erst ab 14 Nächten mit Wert (readiness-3.0); bis dahin nur gezeigt. Rückwirkend holen ginge nur Nacht für Nacht über
     `get_sleep_data` (grosse Antworten) – nur mit Silas' Okay.
123. **Schlafbedarf und SpO2** (nacht-1.0) werden gespeichert, aber weder gezeigt noch eingerechnet: keine geprüfte Regel.
124. **Probelauf des Coaches bis 30.11.2026:** Solange Silas nach Enduco trainiert, weichen Mein Plan und das Absolvierte ab – Vorschläge wie «ausgefallen» oder «verlängern» können
     deshalb danebenliegen. Nach dem 30.11. die Entscheide auswerten (`tools/pruefung_v8.cjs`, Abschnitt 10).
125. **Abwechslung:** Die Form folgt einer festen Reihe (nicht dem Erfolg der letzten Einheit). Eine Auswertung «Vergleichseinheit über die Wochen» (Puls bzw. Leistung in denselben
     Intervallen) fehlt noch – Kandidat für V8.5/V8.6.
126. **Verpflegung 2.0:** Die Produktwahl ist aus der Oberfläche genommen; gespeicherte Listen (`pe-verpflegung`) bleiben und wirken nur noch im Hintergrund.

## Nach V8.5 (19.11.2026, Modell «Automatisch»)
127. **«Automatisch» ist nicht gewählt:** Silas' Wahl bleibt «kombiniert»; die Seite zeigt unter Plan → Trainingsmodell, was «Automatisch» entscheiden würde.
128. **Grenzen** (3 Tage «vorsichtig», Trainingsstatus 1,5, 5 h, 3 von 4 Einteilungen) sind eigene Festlegungen. Nach einem halben Jahr mit «Automatisch» prüfen, wie oft sie
     griffen und ob die Wochen danach (Ampel, Puls bei gleicher Leistung) davon profitierten (Ergebnis nur im Chat).
129. **verteilung-1.1:** Mit wenigen Blöcken kann schon die Wahl der Blockgrenzen einen Zusammenhang erzeugen; seit V8.5 zählt er erst, wenn ihn mindestens 3 der 4 Einteilungen
     zeigen. Was «Deine Reaktionen» vorher als klar zeigte, kann darum jetzt «kein klarer» heissen. Laufen bleibt mangels vergleichbarer Läufe je Block offen (Punkt 115).
130. **Mehr als zwei harte Einheiten an Land** plant «Automatisch» nie; eine dritte (z. B. Renntempo-Block in der langen Ausfahrt zählt als locker) wäre eine neue Regel mit Silas' Okay.

## Nach V9.0 Etappe 0 (20.11.2026, Anleitung gekürzt)
131. **CLAUDE.md aufgeteilt:** Kern (~7 kB) + `docs/anleitung/*.md` je Thema, `docs/changelog-alt.md` (alles vor V7.0). Vorher/nachher-Abgleich aller
     Versionskennungen in `docs/versionsliste-v9.0.md` – keine Regel oder Freigabe verloren. Künftige Etappen: zu Beginn nur den Kern und die
     Themen-Datei(en) lesen, die die Etappe braucht (Tabelle im Kern).
132. **Verfügbarkeit je Tag (Silas' Nachricht 20.11.2026):** Er möchte Zeit und Sportarten je einzeln angeklicktem Tag individuell einstellen bzw.
     eine Sportart abwählen können, mit dem Wochentag als Richtwert. Laut Anleitung (verfuegbarkeit-1.0/1.1) ist das schon so gebaut (Tagesblatt
     überschreibt den Wochentag-Richtwert); in der nächsten Session mit Silas live prüfen, ob es auf der Seite wirklich so funktioniert, v. a. ob
     eine Sportart an einem Tag ganz abwählbar ist.
133. **Etappe 1 zusammen-1.0 (V9.1, 20.11.2026):** Geplant und absolviert erscheinen als eine Einheit (Kalender/Tagesblatt/Heute/Liste/Einheit-Seite über `V91.zuordnen`).
     Silas bitte prüfen: (a) Tag mit zwei gleichen Sportarten (z. B. zwei Läufe), (b) Tag mit Aktivität ohne Plan, (c) Abendbegrüssung «Heute ist alles erledigt.»,
     (d) «Passt zu:» auf der Aktivitäts-Seite. Offen: Monatspunkte und `v6.js`/`v7.js`/`v83.js` zählen weiter einzeln; Heute-Mockup wartet auf Freigabe.
134. **Zwei Einheiten derselben Sportart am Tag (Silas 20.11.2026):** Er ist einverstanden, wenn es trainingstechnisch Vorteile bringt (Enduco macht es beim Laufen auch);
     die Entscheidung liegt bei Claude. Stand: `V66.verteilen` meidet es nur weich (−45), das Modell plant keine gezielten Doppeleinheiten. Offen: für eine spätere Etappe
     prüfen, ob eine zweite, lockere Einheit (z. B. Lauf oder Schwimmen an knappen Tagen) ins Modell gehört.
135. **Vergleich mit Enduco: Anpassen wirkt gleich (V9.1.1, 22.11.2026):** Nach Hinzufügen, Dauer ändern und Löschen springt die Seite jetzt in die Kalender-Liste, und die
     Verfügbarkeit eines Tages passt die bearbeitete Woche sofort an (`V66UI.vfFolgen`, Meldung im Tagesblatt). Silas bitte prüfen: (a) Einheit hinzufügen → Kalender steht am
     Tag, (b) Verfügbarkeit eines Tages in einer bearbeiteten Woche kürzen → Plan ändert sich gleich, (c) Löschen auf der Einheit-Seite → Kalender. **Nicht gebaut:**
     (1) Hat ein Tag mehr Zeit als geplant, verlängert die Seite nichts (Enduco tut es); die Wochenlast ist Sache des Modells, die Verfügbarkeit nur eine Obergrenze. Mögliche
     spätere Etappe: «Zusatzeinheit vorschlagen» (lockere Einheit am freien Tag, als Vorschlag des Coaches mit Annehmen), Entscheid über die Art liegt bei Claude.
     (2) Das Blatt «Trainingsverfügbarkeit der ganzen Woche» fragt nach dem Speichern weiter nach der Wahl (Woche anpassen / Neu berechnen / Alles neu verteilen / Nur speichern),
     statt gleich anzupassen. (3) Die Tonspur der drei Aufnahmen war stumm; gedeutet wurde aus dem Bild – wenn «Kalender wechseln» etwas anderes meinte, bitte kurz sagen.

## Nach V9.2 (22.11.2026, «Woche wie Enduco» Etappe W1: Umplanen)
136. **Umplanen (umplanen-1.0, grenzen-1.0, woche-einstellen-1.0, fehlt-zeit-1.0):** Jede Einstellung rechnet die ganze Woche aus dem Vorschlag neu; Zeit ist harte Obergrenze;
     fehlt Last, fragt die Seite. Punkt 135 (2) erledigt («Woche einstellen» plant gleich um, «Nur speichern» entfällt). **Silas bitte auf dem iPhone prüfen** (Auftrag
     `docs/auftrag-enduco-woche.md`, Abnahme W1): (a) Bearbeiten → Dienstag Zeit 0 → ✓: Dienstags-Einheiten stehen an anderen Tagen, Bericht oben. (b) Mittwoch Schwimmen abwählen:
     Schwimmen wandert, Mittwoch bleibt nicht leer, wenn dort Rad oder Laufen erlaubt sind. (c) Zeit zurücksetzen: Woche wie vorher. (d) Tag sperren: bleibt, wie er ist. (e) Mo–Fr Zeit 0,
     Sa/So je 5 h: alles liegt am Wochenende, keiner der Tage über 5 h. (f) Ein Tag nur «Laufen»: dort steht nie etwas anderes. (g) Mo–Fr Zeit 0, Sa/So je 3 h: die Frage erscheint mit
     Vorschlägen; «Ja» → Wochenende länger, nichts fehlt, ↶ → zurück; «Nein» → bleibt, Bericht sagt, was fehlt. (h) Tage, die er nicht angefasst hat, liegen nie über der Standardzeit.
137. **Eigene Festlegungen in W1 (trainingstechnisch, Silas' Freigabe vom 22.11.):** heute ist fest, sobald heute schon trainiert wurde; «verteilt» als zweiter Vorschlag ab 60 min Mehr
     (`V92.GROSS`); `V83.TOLERANZ` nur noch fürs Bewerten bestehender Pläne; «Ausgleichen» erscheint unter 92,5 % der vorgeschlagenen Last; der automatische Krafttrainings-Tag meidet
     von Hand gesetzte Tage mit gewählten Sportarten. Wenn eine davon im Alltag stört: kurz melden.
138. **Grenzen von W1:** ↶ «Rückgängig» gilt nur, bis die Seite neu geladen wird (Zustand im Speicher, nicht gespeichert). Die Frage rechnet die Vorschläge mit dem Planer durch;
     bei vielen gesperrten Tagen kann es sein, dass kein Tag Platz hat – dann bleibt nur «Nein, so lassen» (und von Hand mehr Zeit geben). Die Garmin-Auftragsübernahme verschobener
     Einheiten stützt sich auf die Kennung bzw. Vorlage; zwei gleiche Vorlagen in einer Woche werden dem nächsten Tag zugeordnet.
139. **Vorlagen für W2:** Screenshot IMG_0093 und die Aufnahmen vom 22.11. (18-19-06, 18-14-10, 17-31-12, 17-33-57) lagen in der W1-Sitzung nicht bei (nur 20-17-01 und 20-22-00);
     für W2 bitte wieder anhängen, dazu einen Enduco-Screenshot mit einem gesperrten und einem von Hand verkürzten Tag (Leiste und Liste).
140. **TrainingPeaks:** Silas exportiert heute je Einheit über Enduco («Starten / Export» → Garmin Connect, TrainingPeaks, PDF); die Einheiten stehen auch in seinem Outlook-Kalender.
     Ein direkter Versand der Seite an TrainingPeaks oder ein Kalender-Export (z. B. .ics) wäre eine eigene Etappe – nur, wenn er es will.
141. **Leck-Prüfung in der W1-Sitzung:** Ohne `SPUREN_PW` im Auftrag konnte `tools/leck_pruefen.py` nicht über die entschlüsselten Daten laufen (wie in V9.0, V9.1 und V9.1.1 vermerkt; der datenunabhängige Teil, E-Mail-Adressen, ist bestanden);
     geändert wurden nur Code, Tests und Doku mit erfundenen Werten, `data.enc.json` blieb unverändert. Beim nächsten Daten-Update oder in der nächsten Sitzung mit Passwort nachholen.

## Nach V9.2.1 (22.11.2026, Folgewoche)
142. **Folgewoche (umplanen-1.1):** Eine Änderung plant auch die Woche danach, wenn sie dort wirkt (harte Einheit, Krafttraining oder lange Aktivität am Sonntag →
     Montag danach ohne harte Einheit an Land; Läufe im Aufbau-Fenster). **Silas bitte prüfen:** eine harte Einheit auf den Sonntag legen → der Bericht nennt «Nächste Woche: …».
     Nicht nachgeholt wird fehlende Last (eigene Festlegung). Offen, falls gewünscht: wie Enduco die Folgewoche bei weniger Zeit ändert (Silas bietet ein Video an).

## Nach V9.3 (22.11.2026, «Woche wie Enduco» W2: Aussehen)
143. **Aussehen wie Enduco (woche-look-1.0, kugel-1.0):** Raster, Liste, Bearbeiten und Tagesblatt nach den Screenshots. **Silas bitte prüfen:** (a) Kalender-Liste neben Enduco:
     Pillen mit weissen Symbolen und Kugeln, Tageskopf, Einheitszeilen; (b) Bearbeiten: Kopf-Panel, ✕/✓, ✨ ↶ ↷; (c) Tagesblatt; (d) helles Thema. Was noch anders aussieht: bitte mit
     Screenshot melden.
144. **W2c offen:** Zyklus, Monat, Heute und Plan im selben Look – erst nach Silas' Okay (Auftrag). Die Screenshots (Analyse, Profil, Planeinstellungen, Training planen) liegen vor.
145. **Zustand im Raster und in der Liste (schlichte Fassung):** In den Screenshots kommt kein gesperrter oder von Hand verkürzter Tag in Leiste und Liste vor. Gebaut: Schloss in der Pille,
     Strich unter der Zahl und gesetzte Zeit in Grau. Mit einem Enduco-Screenshot eines solchen Tags gleicht Claude ab.
146. **Bewusst anders als Enduco:** Minuten als «45 min» statt «45m» (V6.6 Teil 0: «56m» las sich beim Schwimmen wie Meter), eigene Texte und Symbole, keine Kartenbilder und kein
     «52 %»-Abzeichen bei absolvierten Einheiten (dafür fehlen der Seite die Daten bzw. das wäre eine eigene Etappe).

## Nach V9.3.1 (22.11.2026, Analysen ohne kranke oder untypische Einheiten)
147. **analyse-gesund-1.0:** Kranke Tage (Check-in mit Krankheitszeichen, 3 Tage danach), Morgen mit Ruhepuls ≥ 7 über dem Üblichen und Läufe mit > 10 % ungewöhnlichem Puls zählen nicht
     für Pace/Puls. **Silas bitte prüfen:** einen Lauf an einem kranken Tag im Explorer öffnen → «nicht vergleichbar: krank (Check-in)». Grenzen: Krankheit zählt nur, wenn sie im
     Check-in steht (Enduco-Phasen «Krank» kennt die Seite nicht); fehlen Morgenwerte, greift nur der Check-in und der Puls in der Einheit. Die Zahlen sind eigene Festlegungen –
     wenn zu viel oder zu wenig wegfällt, kurz melden.

## Nach V9.3.2 (22.11.2026, Bearbeiten-Woche, Griff ziehen, Feinschliff, eigene Markierung)
148. **Bearbeiten am Sonntag (bearbeiten-1.1):** Am Sonntag beginnt Bearbeiten mit der nächsten Woche; den heutigen Tag ändert das Tagesblatt. **Silas bitte prüfen:** Sonntagabend
     Kalender → Bearbeiten → oben steht die nächste Woche; «Woche einstellen» und ✨ gelten für sie. Wer im Zyklus oder in der Liste eine spätere Woche gewählt hat, bearbeitet diese.
149. **Griff ziehen (kalender-4.2):** **Silas bitte prüfen:** Griff unter dem Raster nach unten ziehen → zwei Wochen → Monat; nach oben → zwei Wochen → eine Woche (Liste und Zyklus);
     antippen wechselt zwischen zwei Wochen und Monat. Fühlt sich der Weg (44 px je Stufe) zu kurz oder zu lang an: melden.
150. **Noch anders als Enduco (Stand V9.3.2):** ~~«⊖» im Tageskopf des Bearbeitens~~ – geklärt mit Silas' Aufnahme vom 23.11. (06:46): es sind drei Punkte «…» (in den kleinen
     Bildern wie ein Minus gelesen); sie öffnen das Tagesblatt mit «Training hinzufügen» und «Tag sperren» – wie auf der Seite. Enduco zeigt im Bearbeiten nur diese zwei Zeilen, ausserhalb
     «Training hinzufügen», «Eigene Aktivität planen» und die Verfügbarkeit; die Seite zeigt alles in beiden, weil Silas die Verfügbarkeit auch im Bearbeiten will (W1). Weiter anders: Wochen-Pille im
     Zyklus mit «h:mm h» statt «7h 23m»; Kartenbilder und «76 %»-Abzeichen bei absolvierten Einheiten (siehe 146); Analyse, Heute/Home und Plan im Enduco-Look = W2c (eigene Sitzung).
151. **Eigene Markierung (analyse-gesund-1.1):** «nicht werten» im Namen, in der Notiz der Uhr oder in «Nach dem Training» lässt eine Einheit aus Pace/Puls-Auswertungen weg;
     Krankheitszeichen gelten für den Tag und 3 Tage danach. **Silas bitte prüfen:** die Einheit, die du mit «nicht werten» benannt hast, im Explorer öffnen → «nicht vergleichbar: krank
     (von dir markiert)» bzw. «von dir als «nicht werten» markiert». Grenze: Notizen der Uhr kommen mit dem Nacht-Update; «Nach dem Training» auf der Seite zählt nach dem nächsten Laden.
152. ~~**W4 «Zeit als Ziel» entschieden (22.11.):** ja, trainingstechnisch begrenzt (längste lockere Einheit, höchstens Zeit des Tages, nur bis zur Obergrenze des Korridors, nie in
     Erholungs- und Rennwochen) – Umsetzung in Etappe W4.~~ **Gebaut in V9.5** (zeit-intensitaet-1.0, mit Verdichten; siehe 153).
153. **Zeit und Intensität (V9.5, zeit-intensitaet-1.0):** **Silas bitte prüfen (iPhone):** (a) knappe Woche: in «Woche einstellen» den Samstag (lange Ausfahrt) um etwa 30 min
     kürzer stellen → Bericht «Samstag Rad: … statt …, dafür mit Anteilen Tempo – gleiche Last»; die Einheit heisst «Lange Ausfahrt mit Tempo» und zeigt die Tempo-Blöcke.
     (b) Tag mit viel Zeit: an einem Tag mit lockerem Rad oder Schwimmen mehr Zeit geben → Bericht «<Tag>: Rad + … min, die Zeit war da»; der Tag bleibt unter seiner Zeit, die
     Wochenlast im Zyklus unter dem oberen Strich. ↶ nimmt beides zurück. **Zu wissen:** (1) Der Korridor ist schmal (+ 7,5 %): sind deine Standard-Zeiten grosszügig, ist er
     oft schon durch die Standard-Tage gefüllt – dann bringt mehr Zeit an einem weiteren Tag nichts mehr (so gewollt, keine Lastsprünge). (2) Laufen wird nie länger, verdichtet
     wird nur Rad und Laufen und vor allem am Wochenende (nicht neben Di/Do hart); Verdichten spart höchstens etwa ein Viertel der Zeit. (3) Schwimmen ohne CSS-Test hat kein
     TL ≈ und wird darum nicht verlängert. (4) Abweichung: ist der Wochenkopf in der Indoor-Phase (Rad drinnen nach der LT2 der Rolle) etwas anders als das TL ≈ ohne
     Indoor, kann die Wochenlast um wenige Punkte über dem oberen Strich liegen. (5) «Neu berechnen» schaltet beides für die Woche aus, bis du etwas änderst.
154. **Prüfung mit echten Daten offen:** Leck-Prüfung und Probelauf V9.2–V9.5 mit `SPUREN_PW` (in dieser Sitzung nicht gesetzt) – nachholen, sobald es in einer Sitzung da ist.
155. **Griff fliessend (V9.5.1, kalender-4.3):** **Silas bitte prüfen (iPhone):** Griff langsam nach unten ziehen → das Raster folgt dem Finger, die Wochen des Monats klappen auf;
     loslassen → rastet auf 1 Woche, 2 Wochen oder Monat ein. Fühlt sich das Einrasten zu früh/spät an oder soll es auch bei 3, 4 Wochen stehen bleiben können: melden.
156. **Anpassung mit dem Check-in wie Enduco (Silas 23.11., Aufnahmen 12:27 und 12:29):** Enduco prüft nach dem Check-in («Anpassungen prüfen …») und zeigt eine Karte mit Grund
     («Training heute gestrichen – … du bist heute nicht verfügbar»), «Ignorieren» / «Überprüfen» → Blatt «Trainings gelöscht: …» (durchgestrichen, mit Profil) → «Akzeptieren». Die
     Seite passt heute nach der Ampel von selbst an (ampel-plan-1.0) und der Coach schlägt vor (tagescoach-1.0). **Entschieden 23.11.:** wie Enduco (Karte, «Überprüfen», «Akzeptieren»/
     «Ignorieren»), nur Krankheitszeichen bleiben von selbst Ruhetag. Auftrag `docs/auftrag-checkin-anpassung.md` (V9.8, eigene Sitzung).
     **Gebaut in V9.8 (23.11., checkin-anpassung-1.0 / ampel-plan-1.3).** Offen: Coach und Ampel in eine Karte (Auftrag Punkt 6, zurückgestellt). Auf dem iPhone prüfen: nach einem
     müden Check-in an einem Tag mit harter Einheit erscheint «Heute lieber locker?»; «Überprüfen» zeigt die harte Einheit durchgestrichen und die lockere; «Akzeptieren» ändert den
     Tag, «Rückgängig» stellt ihn zurück; «Ignorieren» lässt den Plan und die Karte kommt nicht wieder; mit Krankheitszeichen wird der Tag ohne Frage Ruhetag.
157. **Heute schlicht (V9.9, heute-einfach-1.0, 23.11.):** gebaut (Begrüssung als eine Antwort «Was mache ich heute?», Check-in als eine Zeile, Ampel-Empfehlung nur noch bei
     Krankheitszeichen/Schmerzen). Auf dem iPhone prüfen: Satz oben passt zum Tag (geplant, erledigt, frei); nach dem Check-in nur eine Zeile. Weiter vereinfachen nach Rückmeldung.
158. **W3 Training planen und bearbeiten wie Enduco (V9.4, planen-fluss-1.0, 23.11.):** gebaut (Sportart → Intensität → Workout → Dauer; «Training bearbeiten» mit Indoor/Draussen;
     Bearbeiten-Modus öffnet es gleich). Auf dem iPhone prüfen: eine Einheit planen und wieder löschen, Dauer ändern und ↶/↷; neben Enduco: was anders aussieht, mit Screenshot.
159. **W5 Automatisch senden als Einstellung (V9.6, garmin-auto-1.0, 23.11.):** gebaut, **nicht eingeschaltet** (Standard «Nur Tage mit Häkchen» wie bisher). Silas schaltet «Alle Tage» selbst
     ein (Planeinstellungen → Allgemein → Garmin senden). Auf dem iPhone prüfen: Einstellung sichtbar, Standard «Nur Tage mit Häkchen»; «Aus» zeigt im Tagesblatt «Automatisch senden
     abgestellt». Später möglich: Aufträge im Nacht-Update erzeugen (ohne geöffnete Seite).
