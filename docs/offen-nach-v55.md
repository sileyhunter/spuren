# Offen nach V5.5, V5.6 und V5.7 (Stand 8.11.2026)

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

