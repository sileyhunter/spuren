# Auftrag Teil 0b – Karte und Planer: Fehler beheben
Prüfung vom 13.11.2026 (Handy 390 × 844 und Mac-Breite 1280 × 800,
dunkel und hell, Demo und echte Daten). Gebaut wird nur, was hier steht.
Den Auftrag als docs/auftrag-karte-fehler.md ablegen. Er ergänzt Teil 0
aus docs/auftrag-etappen-6-8.md; 7.3 und 7.4 bauen später darauf auf.
Es gilt «Was immer gilt» aus docs/auftrag-etappen-6-8.md und CLAUDE.md.
Passwort wie üblich als SPUREN_PW, nie ins Repo.

## Vorgehen
Jeden Befund zuerst mit der Demo nachstellen (390 × 844, dunkel) und
festhalten. Was sich nicht nachstellen lässt: melden, nicht raten.

## K1 Dunkles Design im Planer und bei «Training → Route»
Befund: Feste helle Hintergründe aus V5.x im Planer-CSS von index.html,
z. B. .tr-box (#f7fbfa), .tr-kpi div (#f1f7f6), .tr-sel,
.tr-vt tr.on td, .rp-tbl tr.on td, .rp-res div, .rp-leg.on, .rp-mo.on,
.rp-status.err. Im dunklen Design (Standard) weisse Schrift auf fast
weiss: Titel «Training → passende Route», Werte der Tabelle A/B/C
(km, Zeit, Hm, vs. Plan), Kacheln Distanz/Zeit/Höhe/vs. Plan,
Startorte. Der Knopf «Vorschläge berechnen» hebt sich kaum ab.
Im hellen Design ist alles lesbar.
Soll: Alle Farben im Planer, in «Training → Route» und in den
Diagrammen über die Variablen aus css/v6.css; helle Werte nur im
Block für [data-theme="light"]. Alle festen background-, fill- und
color-Werte in diesen Bereichen durchgehen, nicht nur die Beispiele.
Version design-1.1.
Abnahme: Demo und echte Daten, 390 und 1280 px, dunkel und hell:
jeder Text mindestens 4,5 : 1, per Skript an den berechneten Farben
gemessen; Liste der geprüften Stellen in den Bericht.

## K2 Zusatzdiagramm unter dem Höhenprofil
Befund: .rp-chart .ovbg { fill: #f6f8fa } ergibt im Dunkeln eine
weisse Fläche (Reiter Wind, Tempo usw.); der Titel .rp-chart .ova
{ fill: #3e3394 } hat dunkel etwa 1,6 : 1.
Soll: Fläche, Titel, Achsen und Gitter über Variablen, wie beim
Höhenprofil.
Abnahme: Jeder Reiter mit Zusatzdiagramm ist in beiden Designs lesbar.

## K3 Tabelle der Trainingsvorschläge zu breit
Befund: Die «Wählen»-Knöpfe der Tabelle A/B/C sind rechts
abgeschnitten (390 px und im 440 px breiten Planer am Mac).
Soll: Alles sichtbar, ohne seitliches Scrollen, Tippziele mindestens
44 px (z. B. ganze Zeile antippbar oder schmalere Spalten).
Abnahme: Im Blatt ist scrollWidth = clientWidth bei 390 und 1280 px.

## K4 Planer schliessen räumt die Karte auf
Befund: close() in js/routen-ui.js leert nur rt, rt-cur und rt-draft.
Nach ✕ bleiben rt-wind (Windpfeile), rt-alt (Varianten, andere
Routen), tr-kand (Vorschläge) und die Marker D/V/R und A/B/C
(altMarkers; kandMarker in js/training-ui.js) auf der Karte.
Soll: Schliessen entfernt alles, was Planer und «Training → Route»
gezeichnet haben. Öffnen zeichnet den letzten Stand wieder; die
Vorschläge nur, wenn «Training → Route» offen ist. Gespeicherte
Routen (Ebene routes) bleiben sichtbar. Nichts aus 7.4 vorwegnehmen.
Abnahme: Nach ✕ sind keine Planer-Marker im DOM und die genannten
Quellen leer; nach erneutem Öffnen ist alles wieder da.

## K5 Suchfelder zu klein
Befund: input[type=search] fehlt in der Grundregel für Felder
(input[type=number], input[type=date], input[type=text], select)
und in der 44-px-Regel (@media (max-width: 760px)). Das Suchfeld im
Planer ist 28 px hoch und hat keinen Innenabstand; das gilt auch für
die Startort-Suche in «Training → Route».
Soll: in beide Regeln aufnehmen.
Abnahme: Auf 390 px sind Suchfelder mindestens 44 px hoch, gleich
hoch wie die Auswahl daneben.

## K6 Neuer Punkt verschwindet
Befund: «Punkt setzen» schlägt die erste Kategorie vor (Jagdposten).
Jagdposten sind standardmässig ausgeblendet (sf.jagd). Der Punkt
wird gespeichert, ist aber unsichtbar; die Liste zeigt «Keine Punkte
passen zur Suche». Auf dem Handy fehlt im Punkt-Modus jeder Hinweis
auf der Karte; der Hinweis steht nur im zugeklappten Blatt.
Soll:
- Vorgeschlagen wird die zuletzt benutzte Kategorie (je Gerät),
  sonst «Sonstiges».
- Speichern in eine ausgeblendete Kategorie: Meldung «Gespeichert.
  Jagdposten sind ausgeblendet» mit Knopf «Einblenden». Nicht
  automatisch einblenden.
- Während «Punkt setzen» oben auf der Karte ein Band «Tippe auf die
  Karte · Abbrechen».
Abnahme: In jeder Kategorie einen Punkt setzen. Er ist danach
sichtbar, oder die Meldung erscheint. «Abbrechen» beendet den Modus.

## K7 Überlappungen unten auf der Karte
Befund (390 × 844):
- Der Massstab liegt hinter «Filter & Punkte».
- In 3D wird die Quellenangabe zweizeilig und liegt unter der Legende.
- Die Quellenangabe startet aufgeklappt.
- Nach dem Berechnen kann das Ziel B unter der Quellenangabe liegen.
Soll: Kein Element verdeckt ein anderes: in 2D und 3D, mit Heatmap
und «Nach Sport», mit dem Planer in allen drei Höhen. Die
Quellenangabe startet zugeklappt (nur «i»). Beim Einpassen einer
Route liegen Start und Ziel ganz im freien Kartenbereich.
Abnahme: Die Rechtecke der Elemente überschneiden sich nicht (per
Skript geprüft). Bildschirmfotos der Zustände nur mit Demo-Daten.

## K8 Sofortmassnahme: Tipp auf eine Spur zeigt die Treffer
Befund: Auf dem Handy öffnet showHits() das Blatt oben bei «Auswahl».
Die Treffer beginnen rund 1'160 px tiefer, in einer eigenen Liste
mit max-height 280px (Scrollen im Scrollen). An viel befahrenen
Stellen sind es mehrere hundert Treffer.
Soll, bis es später ein eigenes Treffer-Blatt gibt: Das Blatt so
öffnen, dass «N Aktivitäten an dieser Stelle» oben steht. Auf bis
760 px Breite hat die Liste keine eigene Höhengrenze; sie zeigt
zuerst 30 Einträge und darunter «Weitere 30 anzeigen».
Abnahme: Nach einem Tipp auf eine Spur sind der Titel und die ersten
Treffer ohne Scrollen sichtbar.

## Prüfen und Abschluss
- Prüfen wie in CLAUDE.md («Prüfen vor jedem Push»), mit make_demo
  und Leck-Prüfung. Im Browser Demo und echte Daten prüfen, bei
  390 × 844 und 1280 × 800, dunkel und hell: Konsole ohne Fehler,
  kein seitlicher Überlauf.
- Routing und Wetter ohne Internet: lokale BRouter-Instanz wie in
  CLAUDE.md; die Open-Meteo-Antwort im gleichen Format nachbilden.
  Nie behaupten, brouter.de oder Open-Meteo live getestet zu haben.
- CHANGELOG: «V6.5.1 · Karte: Fehler aus der Prüfung vom 13.11.2026».
  In CLAUDE.md bei Bedienung/Design ergänzen: «Planer und
  Trainingsrouten: Farben nur über Variablen, auch in SVG».
- Nicht zwischen 22:45 und 23:15 pushen.
- Bericht an Silas: je Punkt behoben oder offen, mit Nachweis
  (Messwert). Vorher/Nachher-Bilder nur mit Demo-Daten.

## Nicht Teil dieses Auftrags
In docs/offen-nach-v55.md als neue Nummern ab 71 eintragen:
- Eigenes Treffer-Blatt mit Gruppen nach Sport und Jahr, «Nur diese
  auf der Karte», später Abschnitte vergleichen.
- Filter-Blatt mit Reitern Filter · Punkte · Routen; aktive Filter
  als Chips auf der Karte; Anzahl am Knopf; aktiver Zeitraum markiert.
- Planer: Ergebniszeile mit Wetter, GPX und Speichern oben; Suche
  oben (zu 7.3).
- Kartenknöpfe: «Route planen» als Hauptknopf, +/− auf dem Handy weg,
  Ebenen als Blatt mit Vorschaubildern, Farblegende bei «Nach Sport»,
  «Aus» als dritte Wahl.
- Punkte: langes Drücken setzt einen Punkt; Punkte über «Direkt
  speichern» auf alle Geräte bringen.
- Namen: Vorschläge 1/2/3 statt A/B/C (mit 7.4 entscheiden);
  «Rundtour» heisst neu «Hin und zurück».
- Wetter: Kurzzeile im Planer; MeteoSwiss-Modell über Open-Meteo
  (models=meteoswiss_icon_seamless, bis 5 Tage), vorher live prüfen.
- «Training → Route»: Fortschritt anzeigen und Abbrechen erlauben.
- Kartenkacheln offline entlang gespeicherter Routen.
