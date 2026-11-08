# Offen nach V5.5 (Stand 8.11.2026)

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
