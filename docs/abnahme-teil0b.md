# Abnahme Teil 0b – Karte und Planer (V6.6.1, 14.11.2026)

Auftrag: `docs/auftrag-karte-fehler.md` (Prüfung vom 13.11.2026). Im Auftrag «V6.5.1»; weil V6.6 schon live war, heisst die Fassung V6.6.1.
Gemessen per Skript im Browser (Chrome), Handy 390 × 844 und Mac-Breite 1280 × 800, dunkel und hell, Demo und echte Daten (echte Daten nur
gemessen, keine Bilder). «Vorher» = gleiche Skripte auf dem Stand vor V6.6.1 (Demo).

**Routing und Wetter ohne Internet:** nachgebildete Antworten im BRouter-Format (Linie durch die angefragten Punkte, Wegtags und Zeiten wie in
`tests/fixtures`), dazu der Planer mit den aufgezeichneten Antworten einer lokalen BRouter-Instanz (`tests/fixtures/brouter_dreieich_rennrad_hin.json`,
OSM-Testdaten Dreieich: drei Abschnitte unverändert ausgeliefert). Open-Meteo im gleichen Format nachgebildet. Eine eigene lokale BRouter-Instanz
wurde für diese Abnahme nicht neu gebaut. brouter.de und Open-Meteo sind nicht live getestet.

## Ergebnis je Befund

| Befund | Vorher (Demo, 390 px, dunkel) | Nachher | Stand |
|---|---|---|---|
| K1 Dunkles Design | Planer bis 3,28 : 1 (Knopf «Punkte: an», Start A, Ziel B), «Training → Route» bis 1,02 : 1 (Werte der Tabelle, Kacheln, Regler, Titel); hell: Ziel B 3,46, Vorschläge B/C 4,22 | jeder Text ≥ 4,5 : 1 in allen 8 Fällen; kleinster Wert Planer 4,91 (dunkel) / 4,64 (hell), Formular 4,99 / 5,05, Ergebnisse 4,86 | behoben |
| K2 Zusatzdiagramm | Titel 2,11 : 1, Fläche weiss; Zwischenziele im Profil 1,03 : 1 | alle Reiter (9 Ansichten, 6 Kategorien): dunkel ≥ 6,61, hell ≥ 5,06; mit den aufgezeichneten BRouter-Antworten dunkel ≥ 5,01, hell ≥ 5,06 | behoben |
| K3 Tabelle A/B/C | 375 px Inhalt in 332 px (1280: 423 in 381), «Wählen» rechts abgeschnitten | scrollWidth = clientWidth: 332/332 (390), 381/381 (1280); Tippziel 44 × 44 px, ganze Zeile wählt | behoben |
| K4 Schliessen | nach ✕ stehen: Windpfeile 5, andere Routen 2 (+ 2 Nummern), Vorschläge 3 (+ 3 Marker) | nach ✕ alle Quellen leer, keine Planer-Marker im DOM, gespeicherte Routen bleiben (1); nach Öffnen alles wieder da; ✕ in «Training → Route» nimmt die Vorschläge weg | behoben |
| K5 Suchfelder | Ortssuche 28 px, Innenabstand 2 px; Startort-Suche 28 px neben 44-px-Knopf | 44 px, Innenabstand 8 px, gleich hoch wie Auswahl bzw. Knopf daneben (1280: 33/33 und 36/36) | behoben |
| K6 Punkt setzen | Vorschlag «Jagdposten»; Punkt danach unsichtbar; kein Hinweis auf der Karte | Vorschlag «Sonstiges», danach die zuletzt benutzte; in jeder der 7 Kategorien ein Punkt: 6 sichtbar (Karte und Liste), Jagdposten mit Meldung «Gespeichert. Jagdposten sind ausgeblendet» und «Einblenden»; Band «Tippe auf die Karte · Abbrechen», «Abbrechen» beendet den Modus | behoben |
| K7 Überlappungen | Massstab × «Filter & Punkte» (57 × 22 px); 3D: Quellenangabe × Legende und × Knopf; Quellenangabe offen beim Start; Ziel B × Quellenangabe (Planer min und halb) | keine Überschneidung (2D, 3D, Heatmap, «Nach Sport», Quellenangabe von Hand aufgeklappt, Planer min/halb/ganz bzw. 1280 offen); Quellenangabe startet zugeklappt; Start und Ziel ganz im freien Kartenbereich | behoben |
| K8 Treffer | Titel 1'140 px unter dem Blattanfang, Liste mit eigener Höhe 280 px, alle Treffer auf einmal | Titel und erste Treffer ohne Scrollen sichtbar, 30 Einträge und «Weitere 30 anzeigen», auf dem Handy ohne eigene Höhengrenze | behoben (bis zum eigenen Treffer-Blatt, Punkt 71) |

Dazu in allen 8 Fällen: Konsole ohne Fehler; kein seitlicher Überlauf in den Ansichten Heute, Kalender, Plan, Wissen, Bibliothek, Training,
Laktat, Ausdauer, Leistung, Körper, Schwimmen und Karte; Suchfelder in Wissen und Bibliothek 44 px.

## Messung
- Kontrast nach WCAG 2.x an den berechneten Farben: Schrift aus `getComputedStyle` (HTML `color`, SVG `fill`), Hintergrund aus dem Stapel unter
  der Schrift (`elementsFromPoint`, halbtransparente Flächen verrechnet, nur Formen im SVG); SVG-Schrift mit deckendem Rand (Halo) gegen den Rand.
  Über die ganze Scrollhöhe des Blatts; Stellen, die gerade verdeckt oder abgeschnitten sind, werden an einer anderen Scrollposition gemessen.
  Inaktive Knöpfe (`disabled`) zählen nicht (WCAG-Ausnahme), z. B. «↑» beim Start.
- Gemessene Textstellen je Fall: Planer 210–226, Diagramm 180–187 (alle Reiter), «Training → Route» Formular 37–39, Ergebnisse 139–149.
- Überschneidungen: Rechtecke von Massstab, Quellenangabe, «Filter & Punkte», Legende, Statuszeile, Kartenknöpfen oben links und rechts,
  Planer-Blatt, Punkt-Band und Start/Ziel; Start und Ziel zusätzlich innerhalb der Karte und über dem Blatt.

## Geprüfte Stellen (K1, K2)
- **Planer:** Titel und Kurzzeile (`h2`, `.rp-mini`), Knöpfe im Kopf (Punkte an, Rückgängig, Löschen, Umkehren, ✕), Sportarten (`.chip`),
  Optionen (`label.rp-opt`), Ortssuche mit Hinweis, Wegpunkte (`.rp-vname`, Start/Ziel/Zwischenziel `.rp-pin`, «→ von Hand» `.rp-leg`, ↑/↓),
  Status (`.rp-status`), Varianten und andere Routen (Tabelle, Nummern `.rp-altnr`, «Wählen», «gewählt»), Kennzahlen, Reiter, Legende der
  Kategorien, Hinweise, Infozeile, Intensität, Ankunft je Wegpunkt, Wetter, Herkunft (`summary`), GPX und Speichern.
- **Diagramm (SVG):** Achsen (`.ya`, `.xa`), Zwischenziele (`.vial` auf `.viac`), Titel des Zusatzdiagramms (`.ova`), Hinweis im Zusatzdiagramm
  (`.ovt`), Intervall-Nummern (`.ivl`); Reiter Höhe, Anstiege, Wegart, Belag, Erlaubt?, Temperatur, Regen, Wind, Tempo und die
  Kategorien der Steigung.
- **«Training → Route»:** Titel und ✕, Einheit, Formular (Datum, Start, Startort, Sportart, Routenart, Stopps, Trainingsziel), Badges,
  Startorte verwalten (offen), Hinweise, «Vorschläge berechnen»; Regler mit Wert, Tabelle A/B/C (Kopf, Werte, «wählen», Eignung), Karten A/B/C
  (Titel, Kacheln Distanz/Zeit/Höhe/vs. Plan, Fakten, Intervalle, «Auswählen», «Auf der Karte»).
