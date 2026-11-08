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
12. **Reihen im Nacht-Update (Freigabe offen, am 8.11.2026 erneut gefragt):** Der geplante Auftrag «Nacht-Update» erlaubt nur `data.enc.json` zu committen. Darum kommen Sekundenreihen
    neuer Aktivitäten erst mit dem Monatsexport (Plan `wk` und Ermüdung `fr` rechnet das Nacht-Update schon). Mit Silas' Freigabe den
    Auftrag um «und `serien/` (verschlüsselt)» ergänzen.
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
