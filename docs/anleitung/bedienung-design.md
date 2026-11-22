## Bedienung V7 (navigation-7.0; vorher bedienung-1.0)
- Start auf «Heute» (Hash-Links wie `#laktat`, `#plan`, `#wissen`, `#planvergleich` oder `#checkin` gehen direkt; `#checkin` öffnet das Check-in-Blatt;
  alte Namen über `ALIAS`: `#training` → `#umfang`). Fünf Bereiche in der Leiste (`#leiste`, `GRUPPEN` in index.html): Heute · Kalender · Plan · Analyse ·
  Outdoor (Karte); ab 1024 px als Seitenleiste links (`--v7-oben` aus `V7UI`). Erste Ebene einfach, Einzelheiten als eigene Ansicht mit «Zurück» oben
  links (`ELTERN`: Ansicht → [Elternansicht, Titel]; `.v7-kopf`), keine Unterleisten mehr. Plan: plan-rennen, plan-modell, plan-stunden, plan-aufbau,
  plan-tests. Analyse: Start `analyse` (Karten, `V7UI`) → umfang, intensitaet, erholung, leistung, laktat, planvergleich, ausdauer, tagebuch,
  schwimmen, koerper, reaktionen (V8.2). Labor (labor, wissen, bibliothek) öffnet über das Profil oben rechts (Einstellungen), nicht über die Leiste.
- Karten wurden in V7 zwischen Ansichten verschoben, ihre IDs blieben. `QUELLEN` in index.html nennt, welche alte Ansicht sie zeichnet (z. B.
  erholung ← heute + training, labor ← training + kalender + plan); `showTab` zeichnet die Quellen zuerst (`zeichneTab`) und ruft `V56.zeichnen` für
  jede. Neue Karten deshalb in die Ansicht legen, deren `TABS`-Eintrag sie füllt, oder `QUELLEN` ergänzen. Leiste antippen = erste Ebene des Bereichs.
  Im Planer (`body.plan-aktiv`) keine Leiste.
- Info-Knopf (`V59.ansicht`): Erklärtexte (`.sub` ohne id, `.hint`) einer Karte mit Ergebnis liegen hinter «i»; Warnungen (`.warn-t`, `.down`),
  `.verdict`, Status (`role=status`, `aria-live`) und `.keep` nie verstecken – auch nicht, wenn sie in einem Erklärtext stehen (dann bleibt der ganze
  Text sichtbar). Neue Erklärtexte deshalb als `.hint`, Warnungen mit `.warn-t`.
- Blätter und Overlays sind modal (V6.4.4): `V59.modalAuf(ov)` beim Öffnen, `V59.modalZu(ov)` beim Schliessen (Hintergrund `inert`, Fokus zurück).
  Text in Farben (Status, Zonen, Links) über die Klassen `.st-farbe`, `.k-farbe`, `--accent-text` (mindestens 4,5 : 1 in dunkel und hell); Inhalte nie über
  `opacity` abdunkeln. Stunden im Plan nur Schwimmen, Rad, Laufen; Enduco-Dauer über `V6H.planDauer`.
- Breite Tabellen: `data-liste` an der Tabelle (oder zu breit auf ≤ 640 px) → Liste (`.als-liste`, Spaltenname je Zelle). Tabellen, die
  nie Liste werden sollen: `data-keine-liste`.
- Ausblenden statt löschen: `hidden data-ausgeblendet="Grund"` an der Karte (mit id); Einstellungen → «Ausgeblendete Karten» blendet je Gerät ein.
- **Auswahl auf der Karte `auswahl-1.0` (V6.6.4):** gewählte Spur (`sel`, `selId`), Treffer-Liste, Markierung (`hl`, `hlAktiv`) und Infofenster
  (`popupMerken`) gehören zur Auswahl; `auswahlWeg()` hebt alles auf (Tipp ohne Spur, Punkt oder Route, «Auswahl aufheben», Planer öffnen) und fragt
  dabei nichts Neues ab. Neue Infofenster in der Karte immer über `popupMerken(new maplibregl.Popup(…))`; Eingabe-Fenster (Punkt setzen) nicht.
- Planer und Trainingsrouten: Farben nur über Variablen, auch in SVG (design-1.1, Teil 0b). Designfarben (Flächen, Schrift, Status, Diagramm)
  je im Block dunkel und hell von `css/v6.css`, helle Werte nur im Block für `[data-theme="light"]`; Daten- und Markerfarben (gleich in beiden
  Designs) im gemeinsamen `:root`. Im SVG als `style="fill:var(--…)"` (nicht als `fill="…"`), auf der Karte (MapLibre) über `RTUI.farbe()`.
  `tests/test_v6.cjs` prüft: keine festen Farben, jede Variable in beiden Designs, Schrift auf Markern ≥ 4,5 : 1.


## Design V6 (design-1.1; design-1.0 Vorlage «enduco als Vorbild» vom 13.11.2026, 1.1 Planer-Farben aus Variablen, Teil 0b)
- Übernommen werden Aufbau, Bedienlogik und Farbsprache, nie Texte, Logos, Symbole, Fotos oder Grafiken von enduco; eigene Symbole in `V6.ICON`.
- Eine Zone, eine Farbe: nur über `--zc-…` (css/v6.css) bzw. `V6.ZONEN`; Sportarten `--sp-…`, Monitoring `--mon-…`, Rennen und heute `--race`.
  Dunkel ist Standard, «Hell» je Gerät (`sf.theme`). Neue Blätter über `V59.blatt(art, html)` mit `.blatt-titel`, `.blatt-fuss` (Zurück links
  `.btn-zurueck`, Hauptaktion rechts `.btn.primary`), Kennzahlen als `.kv`, Abschnittstitel als `.abschnitt`.
- **Heute (V7 heute-7.0):** nur Kacheln, Begrüssung mit Check-in, Heutiges Training und Diese Woche. Heutiges Training = erledigte Garmin-Aktivitäten von
  heute und die Einheiten aus Mein Plan (Balkenprofil aus ihren Teilen, profil-teile-1.0); keine Enduco-Workouts, kein «Neu von Enduco». Die übrigen
  Karten (Ringe, Bereitschaft, Gefühl, Verlauf) stehen unter Analyse → Belastung und Erholung (`#erholung`).
- Heute (V6.0.1): Kacheln Ampel/Status/Check-in, Begrüssung mit Check-in-Blatt, Heutiges Training (Karten mit Zonen-Chips und Balkenprofil,
  Einheit als Blatt), Wochenleiste. Balkenprofil `profil-1.0`: Breite = Dauer, Höhe = Lage im aktiven Zonenprofil, Farbe = Zone (Unterzonen
  aus dem Text der Zone, z. B. «FatMax a–b»); ohne Zielbereich grau, ohne Dauer blass. Fokus = Zeitanteile der aktiven Schritte ohne
  Ein-/Ausfahren und Erholung, nur Schritte mit Dauer (aktive Schritte ohne Dauer separat als «Dauer offen»), ab 10 %, höchstens drei. Trainingsstatus `status-1.1` aus der Form zu Tagesbeginn
  (`FK.pmcMorgen`: Fitness und Ermüdung bis gestern, wie die Ampel – sonst zählt der laufende Tag bis zum Nacht-Update als Ruhetag; Bänder nach Coggan); «Übertraining» nie.
- **Plan (V7):** oben die Übersicht (Hauptrennen, Phase, Mein Plan diese Woche gegenüber absolviert), darunter Phasen und die Saisonübersicht
  (8 Wochen zurück bis zum Hauptrennen, geplant = Mein Plan), dann «Plan verwalten» mit den Unteransichten Rennen, Trainingsmodell, Wochenstunden,
  Aufbau-Check, Testkalender. «Woche nach Modell» (mit Enduco je Tag und «Ich folge») und «Vorschlag und Enduco über die Wochen» liegen im Labor.
- Plan (V6.0.2, `js/v6-plan.js`): Rennen (A/B nach `V6.rennenPrio`, Streckenlängen nur bei bekanntem Format, keine Zielzeit erfunden),
  Phasen aus `AN.saison` als Zeitstrahl, Wochenübersicht (absolviert gefüllt, geplant als Rand, Phase als Streifen), Wochenstunden-Vorschlag
  (`V56.saison`) und Testkalender. Kalender: Wochenband «KW · Phase · Stunden · TL», heute orange, Sport-Symbole, Fokus-Punkte; ein Tag
  öffnet das Tagesblatt (V6.6, `TABS.kalender.blatt`, auch aus Heute «Diese Woche» über `APP.tagBlatt`) mit Mini-Profilen (antippen öffnet die
  Einheit, «Zurück» führt ins Tagesblatt). Dauer immer als «1:15 h» bzw. «36 min» (`V6.dauerText`), nie «m» für Minuten.
- **Kalender V8.4 (kalender-4.1, Silas am 18.11.2026: «bei enduco sehe ich oben Wochenart, Stunden und Last»):** Leiste unter dem Raster wie die Vorlage – Symbole Zyklus
  (Zielscheibe) · Liste · Monat, Griff (Monat aufziehen) in der Mitte, «Bearbeiten» rechts; über der Liste klebt die Wochenleiste der Woche, die oben steht
  («Phase | Wochenart», Stunden und TL ≈ von Mein Plan bzw. absolviert, Tage); im Zyklus über jeder Wochenleiste die Tageszahlen. Daten wie bisher aus `V66UI.wochenKopf`.
- **Kalender V7.8 (kalender-4.0, Etappe 4 Teil 1):** Ansichten «Liste · Zyklus · Monat» (`sf.kal.ansicht4`, Standard Liste; «Zyklus» ist vorerst die bisherige Wochenansicht,
  Teil 2 bringt die vier Karten und den Bearbeiten-Modus, Teil 3 das Tagesblatt mit Verfügbarkeit im Blatt und «Eigene Aktivität planen»). Liste = `V78UI.zeichnen`: Raster und
  Kopf kleben oben in der Ansicht (die View scrollt, nicht das Dokument), Liste von einer Woche vor bis sieben Wochen nach heute, «Frühere/Weitere Wochen» erweitern um vier.
  Daten nur aus `V64UI.kontextFuer`, `V66UI.istWoche`/`wochenKopf`, `V66.schaetzung` – keine eigene Rechnung. Trainingsstatus (trainingsstatus-1.0) = Ermüdung ÷ Fitness im Tagesblatt,
  Stufen unter 0,8/bis 1,3/bis 1,5/darüber als Orientierung (Wissen, Kapitel «last»).
  **V7.9 Zyklus (zyklus-1.0):** Raster mit einer Zeile je Woche «Phase | Wochenart · Stunden · TL» (Griff = Monat), vier Karten der gewählten Woche: Gesamtumfang (TL ≈ Mein Plan und
  absolviert gegen den Bereich = TL ≈ des Wochenvorschlags ± 7,5 %, eigene Festlegung; Verfügbarkeit mit Punkt, wenn Mein Plan über 90 % der Zeit braucht), Fitness-Entwicklung
  (fitness-prognose-1.0: gemessen bis heute, dann bis drei Wochen Mein Plan, danach Steigerung × Last pro Stunde je Sportart bis zum Hauptrennen, Band ± 7,5 %), Intensitätsverteilung
  (tid-1.0) und Fokus (Minuten je Zone). **Bearbeiten (bearbeiten-1.0):** Modus statt Aktionsblatt, Leiste unten aus; jede Änderung (auch aus Tagesblatt und Einheit-Seite) geht in den
  Entwurf je Woche, ↶/↷, ✕ verwirft (mit Rückfrage), ✓ speichert alle geänderten Wochen und führt offene Garmin-Aufträge nach. Ziehen nur innerhalb der Woche (sonst Griff antippen:
  Tag wählen); Tests, Kurs, Aktivitäten draussen und nachgeholte Einheiten bleiben. Solange der Entwurf offen ist: nichts an Garmin, kein Draussen planen, keine Planeinstellungen.
  **V7.10 Tagesblatt (tagesblatt-2.0):** Kopf Fitness, Ermüdung, Status, Form mit Veränderung zum Vortag (Erklärung hinter «i»), Einheiten wie im Kalender, «Training hinzufügen ›»,
  «Eigene Aktivität planen ›» (eigene-aktivitaet-1.0: Titel, Sportart Rad/Laufen/Schwimmen/Andere (seit V8.4.1 ohne Mobility), Datum, Uhrzeit, jede Woche bis höchstens 16 Wochen, Dauer 10–360 min,
  RPE 1–10 → Zone für TL ≈: 1–2 Z1, 3–4 Z2, 5–6 Z3, 7 knapp unter LT2, 8–10 VO2max, Schwimmen ab 7 CSS; Skitour, Wandern, Langlauf, Traillauf öffnen «Draussen planen»),
  Verfügbarkeit des Tages im Blatt (Sportarten als Symbol, antippen = Chips; Regler 0–8 h in 15-min-Schritten, ganz rechts «offen»; sofort gespeichert als «vf-<Datum>», gleich wie
  der Wochentag = Tageseintrag weg; danach wie bisher festhalten bzw. «Woche anpassen»; **seit V9.2** auch im Bearbeiten-Modus, umgeplant wird die ganze Woche, siehe unten), Krafttraining, unten klein «Tag sperren» und Garmin.
- **Kalender und Mein Plan (V7 kalender-3.0, eigenplan-1.0):** «Woche · Monat» (Standard Woche, `sf.kal.ansicht`); Titel = Monat und Jahr (antippen:
  Monat wählen), «Heute» rechts. Woche = Tagesleiste, Wochenauswertung (Mein Plan gegenüber absolviert, je Sportart, Zeit in Zonen nach Puls, TL) und
  die Tage mit erledigten Garmin-Aktivitäten und Mein Plan; im Monat öffnet «KW» die Woche (`TABS.kalender.zurWoche`, auch `APP.kalenderWoche`).
  **Enduco erscheint im Kalender nicht** (weder Woche, Monat noch Tagesblatt; `calEvents` ohne `planned`). Mein Plan früherer Wochen nur, wenn sie
  gespeichert waren (`V7UI.planGilt`), sonst nur Absolviertes – kein nachgerechneter Vorschlag als «verpasst».
  Mein Plan = Wochenvorschlag (`V64UI.kontextFuer`) mit `plan_woche` (`V66.meinPlan`); Änderungen nur über `V66.aendern` (vergangene und gesperrte
  Tage nie), gespeichert mit «Direkt speichern».
  **V7.2 verfuegbarkeit-1.0 / eigenplan-1.1:** ab der laufenden Woche wird der Vorschlag nach der Verfügbarkeit verteilt (`V66.wocheVerteilt`, ganze
  Woche, unabhängig vom heutigen Tag; Wochen davor nie). Wochen ohne gespeicherte Listen folgen ihr von selbst; die erste Änderung an einer verteilten
  Woche hält sie ganz fest (`ganz`, vergangene Tage `eingefroren`); vor dem Speichern einer Verfügbarkeit, die die laufende Woche betrifft, wird sie
  festgehalten («festhalten»), damit vergangene Tage nicht wechseln. «Anpassen» verteilt ab heute neu (gesperrte Tage und eigene Einheiten bleiben),
  «Neu berechnen» setzt diese und alle folgenden gespeicherten Wochen zurück (nur gesperrte Tage bleiben; künftige Wochen ohne Sperre wieder automatisch).
  Tests, Schwimmkurs, Aktivierung und eigene Einheiten werden nie verschoben; in Rennwochen wird nichts verschoben. Gekürzt oder weggelassen wird nur
  gemeldet, nie still. Die Gewichte der Verteilung sind eigene Festlegungen (Wissen, Kapitel «modelle»). Nichts davon geht an Garmin oder Enduco. Bearbeitete Wochen: Stunden und Verteilung aus den eigenen Einheiten, «bearbeitet» sichtbar
  (vergleich-1.3, seit 1.4 ohne eigene Garmin-Einträge als Enduco). TL ≈ und Distanz ≈ (tl-plan-1.0, seit V8.1 tl-plan-1.1: mit den Bezugsgrössen der absolvierten Last – Rad drinnen LT2 der Rolle, draussen LT2 für draussen oder Puls,
Laufen nach Puls, Schwimmen Last pro Bewegungsstunde der letzten acht Wochen) sind Modelle, immer mit «≈»; ohne Bezugswert keine Zahl. Ein Lauf über der Aufbau-Grenze
  wird gemeldet, nie verhindert. Nach Garmin nur über «An Garmin senden» (Abschnitt «An Garmin senden») und am Morgen die lockere Fassung bei «vorsichtig»
  (Abschnitt «Ampel passt das Training an»); Enduco wird nie geändert.
- Die Seite schreibt selbst nie nach Garmin oder Enduco: keine Knöpfe zum Verschieben, Starten oder Löschen von Workouts. Einzige Ausnahme
  (V6.6, Entscheid E3): «An Garmin senden» legt einen Auftrag an, den das Nacht-Update ausführt (Abschnitt «An Garmin senden»).

## V9.2 Woche einstellen, Frage, Bericht (Auftrag «Woche wie Enduco» Etappe W1; `js/v92-ui.js`, Klassen in `css/v6.css` am Ende)
- **«Woche einstellen»** (`V92UI.wocheEinstellen(mo, { zurueck, standard })`, Klassen `.we-*`): Titel mit KW, Umschalter «nur diese Woche · jede Woche so» (Chips), je Tag eine Zeile
  mit Wochentag und Datum, Zustandszeichen (Standard · von Hand · gesperrt, `.we-zst`), Wert rechts, Schloss (`.we-lock`), Sportart-Schalter (`.vw-chip` wie bisher) und Zeitregler
  (`.we-r`, 0 = kein Training bis 5 h in 15-min-Schritten, länger, wenn schon eingestellt; ganz rechts «offen»); «Zurück auf Standard» nur bei von Hand gesetzten Tagen. Vergangene
  Tage und Renntage nur lesen. Unten «Abbrechen» und «Speichern ✓» (im Bearbeiten-Modus «Übernehmen»). Erreichbar aus dem Tagesblatt («Woche einstellen – Zeiten, Sportarten,
  Sperren ›»), aus «Woche bearbeiten», aus ✨, aus dem Zyklus («Trainingsverfügbarkeit») und aus den Planeinstellungen («jede Woche so» vorgewählt). Ersetzt das Blatt
  «Trainingsverfügbarkeit der ganzen Woche».
- **Frage** (`V92UI.frage`): Blatt «Die Woche geht nicht auf» mit dem Fehlenden, je Vorschlag eine Zeile «Ja: Samstag auf 5 h 40 (+ 40 min)» und «Nein, so lassen»; die Vorschläge
  werden nach dem Öffnen gerechnet («Rechne die Vorschläge durch …»). Kommt nach dem Schliessen des Tagesblatts über `V59.nachSchliessen(key, fn)` (einmal nach dem nächsten
  `V59.schliessen`), nach «Woche einstellen», nach ✓ und nach ✨.
- **Bericht** (`#kal-bericht` im Kalenderkopf unter `#kal-meldung`, `.k4-bericht`): Kopfzeile «Woche neu geplant · KW · TL vorher → nachher · Stunden» mit ✕ zum Wegwischen, bis drei
  Zeilen (Rest in «Details»), «Fehlt: …» in Warnfarbe, Knöpfe «Rückgängig», «Mehr Zeit erlauben …», «Ausgleichen», «Details». Nicht im Bearbeiten-Modus (dort steht die fehlende
  Zeit in der Wochenkarte, `.k4-wkk-f`). Im Tagesblatt dieselbe Meldung unter der Verfügbarkeit (`.tb-vf-re`). Das Aussehen wie Enduco kommt mit Etappe W2.

## V9.3 Woche wie Enduco – Aussehen (Auftrag «Woche wie Enduco» Etappe W2: woche-look-1.0, kugel-1.0; `js/v93.js`, Abschnitt am Ende von `css/v6.css`)
- **Farben:** Zonen `--zc-…` aus dem Screenshot der Vorlage gemessen (Z1 #5445da, Z2 #5365f6, FatMax/Renntempo #82aff6, Z3 #5bbbd5, Sweet Spot/knapp unter LT2 #88e6e7, Z4 und CSS #88e1a7,
  VO2max #f5c347, Neuro #d6533c); `js/v6.js` (`V6.ZONEN`) hat dieselben Vorgaben. Unsere Bausteine fallen so auf die Farben der Vorlage: Z1/Lauf-ABC → Z1, Z2 → Z2, Renntempo → Z2 hell,
  Z3 → Z3, knapp unter LT2 → Z3 hell, CSS → Z4, VO2max → Z5 gelb (Festlegung in `V64.FARBE`, unverändert). Woche: `--wk-seite`, `--wk-panel` (#161617), `--wk-pille` (#27292d),
  `--wk-umriss`, `--wk-griff` (#4d4d4d), `--wk-text`/`--wk-text2` (#b2b2b2), `--wk-x` (#484b52), `--wk-ok`, `--wk-fab`, `--wk-tl` (#6d70dd), `--wk-tl-ber` (#3d3f42), `--wk-band` (#95e39c),
  `--wk-leer` (#42331a); hell mit eigenen Werten.
- **Kugel (kugel-1.0, `V93.kugel`):** Teile ohne Einfahren und Auslaufen (erster/letzter Teil, wenn locker und mindestens drei Teile) und ohne Pausen; je Zone ein senkrechter Streifen,
  links die höchste (Rang rot · gelb · grün · türkis · cyan · hellblau · blau · lila), Breite = Zeitanteil, mindestens 20 %, höchstens vier; nur Pausen → Zone des längsten Teils.
  Absolvierte Aktivität ohne Plan: graue Kugel; Test ohne Ziel: Ring.
- **Raster (`V78UI`):** sieben Spalten; Woche des gewählten Tags in einer Pille (`.k4-r-w.sel::before`); Tagespille `.k4-r-p` (vergangen `.voll`, sonst Umriss), weisse Symbole
  (je Einheit, höchstens zwei), Kugeln (höchstens drei); freier Tag `kalenderfrei`. Zustand: gesperrt = Schloss in der Pille, von Hand = Strich unter der Zahl (`.k4-r-t.hand`).
- **Liste:** Wochenleiste und Wochenkopf «Phase | Wochenart» + Zeitraum (Stunden/TL ≈ im Tooltip, im Zyklus und in der Wochenkarte); Tageskopf mit Punkt (gewählter Tag), Zahl ab zwei
  Einträgen (`V93.anzahl`), gesetzte Zeit in Grau (`.k4-hand`), kleiner weisser «…»; Einheit: Titelzeile über die ganze Breite, darunter Zahlen (`V93.zeile`, Klasse `.k4-ez`) und Profil
  (120 pt, Höhe h' = 0,35 + 0,65 × h); Quelle nur im Tagesblatt. Dauer bleibt «1:30 h» / «45 min» (V6.6 Teil 0).
- **Bearbeiten:** Reihenfolge Kopf-Panel (Wochenkarte), Raster, Griff mit ✕/✓ (`#kal-ebar`, CSS `order`), Liste; Werkzeugleiste aus. Wochenkarte: zwei Spalten (`.k4-wkk-g`), Verlauf
  locker → Z3–Z5 über `--lo`, Zonengruppen `.k4-zg` (leer abgedunkelt), TL-Balken mit Bereich, Statuskurve `.k4-sk` (Ende jedes Tags aus `V66UI.formReihe`, Band 0,8–1,3).
  Mini-Balken am Tag: `V93.balkenAnteil` (Status ÷ 2,1).
- **Tagesblatt:** `#v59-ov[data-art="tag"]` – Titel mittig, Kennzahlen-Kachel drei Spalten (Form darunter), Zeilen mit Haarlinien, Sportart-Pille weiss.
- Regel ändern = Version in `V93.VERSIONS` und `tests/test_v93.cjs` nachführen. Offen (W2c): Zyklus, Monat, Heute, Plan im selben Look – erst nach Silas' Okay.

