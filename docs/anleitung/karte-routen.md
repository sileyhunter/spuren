## Routenplaner (V5.3)
- Routing: öffentlicher BRouter-Server `https://brouter.de/brouter` (ohne Schlüssel), einstellbar über localStorage `sf.rt.endpoint`.
  Profile: Rennrad eigenes Profil `brouter/rennrad-asphalt.brf` (aus `fastbike`, ohne Gravel; Rückfall `fastbike`), Gravel `gravel` (`prefer_unpaved_paths=1`), MTB Aufstieg `gravel` (`prefer_unpaved_paths=1`),
  Abfahrt wählbar, Singletrail `mtb` (`StrictNOBicycleaccess=1`, seit V5.8 nur noch als Abfahrt), Laufen/Trail/Wandern `hiking-mountain` (SAC-Grenze 1/3/wählbar), immer `processUnusedTags=1`.
  Profil-Parameter nur als Zahlen (`1`/`0`), nie `true`/`false` (Server bricht sonst mit HTTP 500 ab).
- Koordinaten werden erst nach Zustimmung im Planer gesendet (Routing an BRouter, Wetter an Open-Meteo); keine Schlüssel, kein Backend.
- Nie eine Luftlinie als Ersatz zeichnen oder als GPX speichern. Abschnitte «von Hand» (`hand-1.0`) gibt es nur auf ausdrückliche Wahl
  (Skitour, «→ von Hand» je Abschnitt, «Lücke von Hand schliessen», ohne Routing-Zustimmung): gerade Linien zwischen den gesetzten Punkten,
  gekennzeichnet (gestrichelt, Belag/Wegart/Zugang «von Hand / nicht geprüft»), im GPX genannt – nie als erlaubter Weg ausgegeben.
- Neue Kennzahlen/Regeln: Version in `RT.VERSIONS` erhöhen, `node --test tests/test_route.cjs`.
- **V5.6 Rennrad:** das Profil wird beim Server über `POST <endpoint>/profile` hinterlegt (nur Text, ID «custom_…», 6 h wiederverwendet;
  HTTP 5xx beim Routing → einmal neu hinterlegen, sonst `fastbike` mit Hinweis). Änderungen am Profil nur mit Test in `tests/test_route.cjs`
  und Version `gravel-rt-x`. Varianten `varianten-2.0`: «Schnellste» und «Velofreundlich» (`consider_traffic` 0.5, `prefer_cycleways` 1)
  werden immer beide gerechnet; velofreundlich, solange höchstens Toleranz (Standard 10 %, localStorage `sf.rt.toleranz`) langsamer und
  nicht mehr Gravel. Gravel `gravel-rt-1.0` (Kies/Feinkies, Naturweg, unbefestigt, tracktype grade2–5; Feldweg ohne Angabe = «möglicherweise»;
  Pflaster nie): Meldung je Abschnitt, «für mich ok» oder Umfahrung mit Sperrpunkten (`nogos`, 3–10 m, nie näher als 30 m an Wegpunkten,
  höchstens 3 Runden, nur bei weniger Gravel übernommen). Andere Routen `alternativen-1.0` (`alternativeidx` 1–2, Doppel ≥ 85 % weg).
  Wegpunkte `wegpunkte-1.0`: Start und Ziel fest, neue Punkte als Zwischenziel mit kleinstem Umweg. Ortssuche `ortssuche-1.0` über swisstopo
  (`api3.geo.admin.ch`, nur der Suchtext). Fixtures dafür aus der lokalen BRouter-Instanz (`tests/fixtures/brouter_dreieich_*`).
- Testen ohne Internet: BRouter aus github.com/abrensch/brouter mit `javac` bauen (OsmParser durch XML-Leser ersetzen, PBF braucht
  Protobuf), Segmente aus `brouter-map-creator/src/test/resources/dreieich.osm.gz` + `srtm_38_0*.bef`, Server lokal starten;
  MapLibre/Chart.js aus den GitHub-Releases. Nie behaupten, brouter.de oder Open-Meteo live getestet zu haben, wenn sie gesperrt waren.

## Planer V5.8 (Wünsche vom 9.11.2026)
- Wegpunkte `wegpunkte-1.1`: Punkt-Modus bleibt an, keine Obergrenze; neuer Punkt zwischen die Wegpunkte, zwischen denen er auf der Linie liegt
  (gleich nahe Abschnitte ±10 m: kleinerer Umweg), ohne Linie kleinster Umweg. Ein Punkt in einem Abschnitt von Hand macht beide Teile von Hand.
- Skitour `skiroute-1.0`: swisstopo-Ebene `ch.swisstopo-karto.skitouren` über identify (Rechteck in LV95, `sr=2056`, 50 je Seite, höchstens 4 Seiten,
  nur nach Zustimmung `consent.skirouten`); Netz mit 12 m Zusammenlegen und 20 m Anschluss; Weg nur bis 150 m neben der Route und höchstens
  1,8 × Luftlinie + 800 m, sonst von Hand mit Grund. Quelle nennen: «swisstopo, mit dem SAC», nicht markiert, keine Haftung, keine Lawinenaussage.
- Hangneigung `hangneigung-1.0`: Gelände, nicht Spur; Höhenraster Mapzen/AWS Terrain Tiles (Zoom 14, bei sehr langen Touren 13), ±15 m, an der
  Linie und 20 m seitlich, Maximum je 20 m. Klassen nach SLF (30/35/40°) plus 25° als Hinweis; fehlendes Raster = unbekannt, nie 0°.
  Keine Lawinenbeurteilung behaupten.
- Wandern/Trail `wegende-1.0`: Lücke ab 60 m zwischen Punkt und Wegnetz zeigen (ohne Linie); schliessen nur auf Knopfdruck.
- MTB `mtb-abfahrt-1.0`: Aufstieg Gravel-Profil mit `prefer_unpaved_paths=1`; Abfahrten erst auf Knopfdruck (Singletrail `RT.MTB_TRAIL`, andere
  Strasse `RT.MTB_STRASSE` mit Sperrpunkten auf dem Aufstieg, gleicher Weg nur bei Rundtour ≤ 60 m); MTB-Skala nie raten; «gleich wie» nur aus
  den Abfahrten (`RT.istDoppelt` mit Bereichen), nie aus der ganzen Route mit dem gemeinsamen Aufstieg.
- Rennrad `varianten-3.0`: direkteste, velofreundliche, ruhigste (consider_traffic 1) – alle über das Profil ohne Gravel; `alternativen-1.1` ohne
  zusätzlichen Gravel. Windpfeile `windpfeile-1.1`: 3–20, Gegen-/Rückenwind ±5 km/h, abschaltbar (`sf.rt.windkarte`).
- **Ampel `readiness-3.0` (V8.4, Silas' Wunsch vom 18.11.2026 «strenger, wie Whoop», von ihm mit Wirkung aufs Training gewählt): dazu die Erholung der einzelnen Nacht
  (`FK.erholungNacht`, HRV und Ruhepuls dieser Nacht gegen die 60 Tage, wie der Ring): unter 34 % schwaches Zeichen, «bereit» erst ab 50 %; Atemfrequenz im Schlaf ≥ 1 /min über dem
  Median der 28 Nächte davor und Hauttemperatur ≥ +0,5 °C je ein schwaches Zeichen, erst ab 14 Nächten mit Wert (`FK.NACHT`). Am 18.11.2026 an den eigenen Daten geprüft
  (Puls bei gleicher Leistung, eb-Blöcke): vorher an Tagen «ok» mit tiefer Nacht messbar höher; Garmins Readiness zeigte keinen Zusammenhang und bleibt draussen.
  Zahlen nur im Chat. Vorher:** **Ampel `readiness-2.3` (V6.3, Etappe 3; 2.1 V6.4.4; 2.2 V7.6.1: Last ohne Krafttraining, am 17.11.2026 an 180 Tagen nachgerechnet; 2.3 V8.1: Motivation tief =
  schwaches Zeichen, Schmerzen deutlich = starkes, leicht = schwaches Zeichen mit Empfehlung je Ort; Last bleibt 7/28 Tage):** wie readiness-1.0 (HRV-7-Tage gegen eigene 60 Tage nach Plews/Buchheit, Ruhepuls 3 Tage, Schlaf,
  Last 7/28 Tage, Befinden, Krankheit), dazu: Befinden als Anteil auf der Skala (belastet ab 0,75, mittel ab 0,5; vier Fragen inkl. Schlaf);
  Schlaf 5–6 h nur noch Hinweis (kein Warnzeichen, aber dann nicht «bereit»; unter 5 h weiter starkes Zeichen). **readiness-2.1 (V6.4.4):** Last
  nur bis gestern (die Ampel ist der Stand am Morgen; eine Einheit des Tages ändert sie nicht). Grundlage `ampel-pruefung-1.1` (`FK.ampelPruefung`,
  1.1 mit dem Morgen-Stand ohne die Last des Tages; am 13.11.2026 wiederholt, die Entscheide von 2.0 bestätigt): Puls in gleichmässigen
  10-min-Blöcken (`eb`) gegen dieselbe Blockart in den 60 Tagen davor, je Ampel-Stand jenes Morgens; am 13.11.2026 an den eigenen
  Daten geprüft, daraus die beiden Änderungen (Schlaf 5–6 h nur Hinweis; Garmins Readiness nur gezeigt, nicht in die Ampel eingerechnet). Die Seite zeigt die Prüfung live unter «Passt die Ampel zu dir?» (Gruppen unter 5 Blöcken ohne Wert).
  Keine Zahlen daraus in Doku oder Tests schreiben; Regeländerung = neue Version und neue Prüfung.
- Heute `ringe-1.1` (`FK.ringeVerlauf`; 1.1 = Belastung ohne Krafttraining): Erholung Φ((z_lnHRV − z_Ruhepuls)/2) gegen 60 Tage (mind. 14 Werte), Schlaf = Garmin-Schlafwert genau dieser
  Nacht, Belastung = (1 − 2^(−TSS/CTL_Vortag)) · 100; alle 0–100 %, Lücken bleiben leer, Tag mit Datum. Kein medizinisches Mass. Ein Tag, dessen
  Einheiten noch nicht eingespielt sind (`FK.aktivitaetenBis`: Nacht-Update = Tag des Laufs, Morgen-Update = Vortag), hat Belastung «offen», nie 0 %.

## GPX direkt zu Garmin (V9.14.0, gpx-export-2.0, Routen 7.2)
Planer → «An Garmin senden»: Auftrag nach Bestätigung («Ja, senden»), hochgeladen als Garmin-Strecke im Nacht-Update oder im Chat; nur Garmin Connect, nie aufs Gerät, nie automatisch. «GPX teilen» und «GPX in Dateien» bleiben
als Rückfall. Regeln und Ablauf: `garmin.md`, Abschnitt «Strecken an Garmin Connect». Routing-Regeln unverändert (Rennrad nie mit Gravel, keine Luftlinie als Weg, `hand-1.0`).

## Karte einfach (V9.13.0, karte-einfach-1.0, Outdoor O1)
- Karte: drei runde Knöpfe **Ebenen · Planen · Meine Daten**, oben links die Ortssuche (`kartensuche-1.0`; nur der Suchtext geht an swisstopo, nur Schweiz). Alles Reine steht in `js/karte-ebenen.js` (`KE`), die Verdrahtung mit MapLibre in `index.html` (`initLayerPanel`, `vorlageAnwenden`, `ovSchalten`, `setBase`, `opAnwenden`).
- **Ebenen-Blatt:** Vorlagen (`ebenen-vorlagen-1.0`: Skitour, Wandern, Rad, Jagd), Grundkarte Schweiz | Ausland, «Aktive Ebenen» mit Deckkraft-Regler (`deckkraft-1.0`, Speicher `sf.ebenen.op`, nur Abweichungen), «Weitere Ebenen», «Quellen und Lizenzen» (`KE.QUELLEN`). Neue Dienste immer in `KE.GRUND` / `KE.EBENEN_NEU` eintragen **mit Quellenangabe und Eintrag in `KE.QUELLEN`**; keine Dienste mit Schlüssel im öffentlichen Code (Mapy-Schlüssel gehört in die verschlüsselte Konfiguration, O4).
- Grundkarten Ausland (`grundkarten-ausland-1.0`): OpenTopoMap, IGN Plan, IGN Topo, basemap.at; Ebenen Waymarked Trails. Im Ausland deckt die Grundkarte die Welt allein ab (die Weltkarte darunter wird abgeschaltet).
- **«Meine Daten»** (`meine-daten-1.0`): Blatt mit den Reitern Spuren · Punkte · Routen (`datenTab`); ein Treffer in der Karte öffnet «Spuren».
- Prüfen: `node --test tests/test_v9130.cjs`; Bedienung: `python3 -I tools/durchklick_karte.py` (Chrome, Demo, Karten-Attrappe). Die echte Karte und die Dienste sind in der Umgebung nicht prüfbar – nie behaupten, sie live geprüft zu haben.
