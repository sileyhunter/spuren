# Ironman Notebook (vormals Spuren & Formkurve) – Arbeitsanleitung

Private Trainingsseite (GitHub Pages) von Silas, auf dem iPhone «Ironman Notebook». Sprache mit ihm: Deutsch (Schweiz, «ss» statt «ß»).
Alle Trainingsdaten liegen verschlüsselt in `data.enc.json`. Das Passwort steht **nie** im Repository; es kommt aus dem Auftrag als Umgebungsvariable `SPUREN_PW`.
`data.json` und `work/` niemals committen (stehen in `.gitignore`).

## Dateien
- `index.html` – die Seite (Passwortabfrage, Entschlüsselung im Browser, Karte, Tabs)
- `demo.html`, `manifest-demo.webmanifest` – Demo mit erfundenen Beispieldaten zum Teilen (ohne Passwort, lädt keine echten Daten).
  Wird aus `index.html` erzeugt: nach jeder Änderung an `index.html` `python3 -I tools/make_demo.py` ausführen und `demo.html` mitcommitten.
- `data.enc.json` – verschlüsselte Daten (AES-256-GCM, PBKDF2-SHA256, Salz bleibt fix)
- `tools/crypt.mjs` – ver-/entschlüsseln
- `tools/merge_daily.py` – nächtliche Garmin-Daten einspielen
- `tools/classify.py`, `tools/parse_activities.py`, `tools/fitlib.py`, `tools/import_export.py` – monatlicher FIT-Export
- `tools/ftp_model.py` – FTP-Schätzung aus Leistungsdaten (wird von `import_export.py` nur mit `--ftp-neu` neu gerechnet)
- `tools/series.py` – Sekundenreihen aus FIT-Datei oder Garmin-Verbindung (gleiche Struktur für beide Wege)
- `tools/zeit.py`, `tools/stufen.py`, `tools/kennzahlen.py` – Zeitbegriffe (A3), Stufen (A5), gemeinsame Kennzahlen mit Versionen
- **V7.1:** `tools/serien_klar.mjs` (Reihen ausgewählter Aktivitäten nach `work/` entschlüsseln, nie committen), `tools/zeit_nachrechnen.py`
  (zeit-1.1 für Aktivitäten draussen mit GPS ohne eigene Regel aus der 2-s-Reihe nachrechnen, alte Werte ins Audit, `zq` = «reihe-2s»);
  `FK.laufVergleichbar` (laufvergleich-1.0) in `js/formkurve.js`; Tagebuch tagebuch-2.0 in `js/v53-extra.js`; Jahresstatistik umfang-tabelle-1.0 in `index.html`
- **V7.2:** `js/schwimmen.js` (ohne DOM: Technikübungen uebungen-2.0, Schwimm-Einheit schwimmeinheit-1.0, Übung aus Enduco-Schritt finden),
  `js/schwimmen-ui.js` (Einheit wie im Becken, Übungsblatt, Katalog unter Analyse → Schwimmen), `tests/test_v72.cjs`; Verfügbarkeit verfuegbarkeit-1.0
  und Mein Plan eigenplan-1.1 in `js/v66.js` (`V66.verfuegbarkeit`, `V66.verteilen`, `V66.wocheVerteilt`, Aktionen «anpassen», «neuberechnen»,
  «festhalten», `V66.formPrognose`), Oberfläche im Tagesblatt `js/v66-ui.js`, Anwendung im Plan-Kontext `js/v64-ui.js`
- **V7.3 (Auftrag «wie enduco», Etappe 1):** `js/v73.js` (ohne DOM: Schritte und Blöcke jeder Einheit schritte-1.0 aus `teile`, Schwimm-Einheit oder
  Workout aus Garmin; RPE je Abschnitt rpe-zonen-1.0; Ziele je Metrik, Zeit je Zone, Fokus, Achse), `js/v73-ui.js` (Einheit als ganze Seite
  einheit-2.0 mit Blättern für Datum, Uhrzeit, Sperre, Indoor, Metrik, Workout bearbeiten, Bahnlänge, Block, Zone, Export), `tests/test_v73.cjs`,
  `logo-einheit.jpg` (Kopfbild, Ausschnitt aus logo.jpg), `docs/v73-zuordnung.md` (Zuordnung ohne Werte); Felder je Einheit einheit-felder-1.0 und
  Einfahren/Intervall-Intensität einheit-anpassen-1.0 in `js/v66.js` (`V66.feldPruefen`, `V66.teileAnpassen`, `V66.aendern` Art «einheit»)
- **V7.3 Etappe 2 (Schwimmen an Garmin):** garmin-senden-1.1 in `js/v66.js` (`V66.garminSchwimm`, `V66.garminPuls`, `V66.metrikVon`), `tools/garmin_senden.py`
  (Prüfung und Rücklese für Schwimmen, Puls, RPE), `V66UI.schwimmEinheit`/`V66UI.swOpt` (dieselbe Schwimm-Einheit für Seite, Auftrag und Stand),
  Export-Blatt in `js/v73-ui.js`; Tests in `tests/test_v73.cjs` und `tests/test_tools.py`
- **V7.4 (Etappe 6 «Ampel passt das Training an», ampel-plan-1.0):** `js/v74.js` (ohne DOM: Entscheid je Tag `V74.entscheid`, lockere Fassung `V74.locker`,
  Wochen-Schicht mit Nachholen `V74.woche`, Serie, Eintrag/Prüfung/Zusammenführen), `js/v74-ui.js` (Stand je Tag, Speichern ohne Knopfdruck, Banner auf
  Heute, im Tagesblatt, auf der Einheit-Seite und im Kalender, «Trotzdem wie geplant», «Woche anpassen?»), `tools/ampel_heute.mjs` (Entscheid im
  Morgen-Update), `tests/test_v74.cjs`; Schicht angewendet in `js/v64-ui.js` (kontext: `K.w` = was gilt, `K.wPlan` = Mein Plan); eigenplan-1.2
  (`V66.aendern` Art «erholung»), lockere Fassung im Garmin-Auftrag (`V66.garminAuftrag` opt.ampel, `garmin_senden.py ampel`, Entscheid A7)
- **V7.5 (Etappe 3 «Planeinstellungen», planeinstellungen-1.0):** `js/v75.js` (ohne DOM: Einstellungen prüfen und zusammenführen `V75.pruefen`/`V75.einstellungen`,
  Basis-Fitness je Sportart basis-1.1 `V75.basis`/`V75.basisDaten`/`V75.fitness`, Steigerung steigerung-1.0 `V75.rampe`/`V75.verlauf`, Indoor-Phase indoor-phase-1.0
  `V75.indoorAnwenden`), `js/v75-ui.js` (V7.5.1: Blatt-Folge Laufen → Rad → Schwimmen → Trainingsumfang `V75UI.flow`; `V75UI.einstellungen`, `.schwimmOpt`,
  `.pool`, `.drinnenFeld`; V7.5.2 `V75UI.basisDaten` (Stand Montag) und `V75UI.plan` (laufende Woche + Rampe ab der nächsten, für Kurve und Wochenstunden)), `tests/test_v75.cjs`; Schwimm-Einheit schwimmeinheit-1.2 in `js/schwimmen.js` (Hilfsmittel, Stile als eigener Teil, Anfänger-Modus),
  Stil je Schritt an Garmin garmin-senden-1.2 (`V66.STIL_GARMIN`, `tools/garmin_senden.py`), Bahnlänge je Einheit und `drinnen` false einheit-felder-1.1
  in `js/v66.js`, Stunden je Sportart im Plan-Kontext `js/v64-ui.js` (`K.basis75`, `K.rampe`), Wochenstunden `js/v56.js`
- **V7.6 (Etappe 7 «Krafttraining», kraft-plan-1.1; Teil 1 Termin, Anzeige, RPE; V7.6.1 Abstimmung der Woche, Regeln von Silas am 17.11.2026 freigegeben):**
  `js/v76.js` (ohne DOM: Termin je Woche `V76.termin` (Tag automatisch oder fest), Einheit `V76.einheit`, Tag wählen und eintragen `V76.einplanen` (Bewertung
  `V76.bewerten`), `V76.passt`, Regel 2 nach dem Verteilen `V76.abstimmen`, Ausnahmen `V76.ausnahmen`, Garmin-Aktivität «Krafttraining» des Tages `V76.aktivitaet`,
  sRPE `V76.srpe`), Seite «Krafttraining» in der Blatt-Folge und Blatt `V75UI.kraft` (`js/v75-ui.js`, auch aus dem Tagesblatt `js/v66-ui.js` und der Einheit-Seite),
  Abschnitt auf der Einheit-Seite `js/v73-ui.js` (Übungen, RPE, «Nur diese Woche», Termin), `tests/test_v76.cjs`; im Plan-Kontext `js/v64-ui.js` (`mitKraft`): Tag an der
  schon verteilten Woche wählen, passt es dort nicht, mit dem Krafttraining neu verteilen; Krafttraining bleibt beim Verteilen an seinem Tag, am Tag danach keine harte
  Einheit an Land (`V66.verteilen`), Dauer 15–180 min (Standard 1:30 h); `vorher` in den Planeinstellungen (`V75.eintrag`, `V75.aktuell`, `merge_daily.planeinstellung_pruefen`)
- **V7.6.1 (Silas' Wünsche vom 17.11.2026, Vorbild «Allgemeine Planeinstellungen» von enduco):** erste Seite «Allgemein» der Planeinstellungen (`js/v75-ui.js`):
  Trainingsverfügbarkeit aller Wochentage (`V66UI.verfuegbarkeitWoche`, `V66UI.verfuegbarkeitText` in `js/v66-ui.js`, auch aus dem Tagesblatt), Tage für lange Einheiten
  (`pe-lang`, verfuegbarkeit-1.1 in `V66.verteilen`), Testkalender; Krafttraining zählt nicht in Fitness, Ermüdung, Form, Ampel-Last und Ringe (`FK.istKraft`, `FK.zaehlt`;
  pmc-2.1, readiness-2.2, ringe-1.1) und steht in «Diese Woche» (Heute) und in der Wochenauswertung (Kalender) als eigene Zeile
- **V7.6.2 (offene Punkte und Wünsche vom 17.11.2026):** `tools/bilder_crypt.mjs` und `bilder/` (Kopfbilder der Einheit-Seite, bilder-1.0, Abschnitt «Bilder»);
  Schwimmkurs kurs-1.0 (`pe-schwimm` `kurs_bis`/`kurs_nur`, `V66.mitKurs`, `V64.woche` `kurs_bis`, Blatt «Schwimmkurs» in `js/v75-ui.js`); Aufbau-Grenze mit geplanten
  Läufen aufbau-1.2 (`V64.laufGrenze`, `geplanteLaeufe` in `js/v64-ui.js`); Kurzcheck nach Puls laktat-hf-1.0 (`AN.laktatFenster`, `AN.pulsAnstieg`, Explorer und Notiz-Vorschau)
- **V7.7 (Etappe 4, erster Teil «Draussen», aktivitaet-plan-1.0 und zonenpruefung-hf-1.0; Regeln von Silas am 18.11.2026 bestätigt):** `js/v77.js` (ohne DOM: Eintrag
  prüfen und zusammenführen `V77.pruefen`/`V77.liste`, Einheit `V77.einheit`, Woche `V77.einplanen` (Ersatz), gespeicherte Woche `V77.ersetzenGespeichert`, TL je Stunde
  `V77.tlProStunde`, Zonen nach Puls `V77.zonenPruefung`), `js/v77-ui.js` (Blatt «Draussen planen» aus «Training hinzufügen», Abschnitt auf der Einheit-Seite, Karte
  `#zp-card` unter Laktat), `tests/test_v77.cjs`; Vorlagen skitour/wandern/langlauf/trail und Tag/Nachbartage in `js/v66.js` (`V66.verteilen`, `V66.aendern` «aktivitaet»,
  «aktivitaet_weg», `V66.schaetzung` mit `V66.draussenTL`), `js/v74.js` (lockere Fassung, Nachholen), `js/v76.js` (Kraft nicht am Tag der Aktivität)
- **V7.8 (Etappe 4, Teil 1, kalender-4.0 und trainingsstatus-1.0; Okay von Silas am 18.11.2026):** `js/v78.js` (ohne DOM: Trainingsstatus `V78.status`/`V78.stufe`/`V78.delta`,
  Wochen und Raster `V78.wochen`/`V78.raster`/`V78.monatsRaster`, Texte), `js/v78-ui.js` (Kalender «Liste»: Zwei-Wochen-Raster im festen Kopf, mit dem Griff zum Monat
  aufziehbar, durchlaufende Tagesliste mit Wochenköpfen «Phase | Wochenart», Einheiten mit Mini-Profil und «Dauer · ≈ km · TL ≈», Absolviertes mit Haken, Ruhetag/Kein Training;
  Titel, Raster und gewählter Tag folgen dem Scrollen der Ansicht), `tests/test_v78.cjs`; Status im Tagesblatt (`formHTML` in `js/v66-ui.js`); Ansichten Liste · Zyklus
  (bisher «Woche») · Monat (`sf.kal.ansicht4`, Standard Liste)
- **V7.9 (Etappe 4, Teil 2, zyklus-1.0, fitness-prognose-1.0, bearbeiten-1.0):** `js/v78.js` (Bereich `V78.bereich`/`V78.lage`, Verteilung `V78.drei`, Fokus `V78.fokus`,
  Wochenlast der Steigerung `V78.wochenLast`, Fitness Tag für Tag `V78.prognose`, Entwurf mit Verlauf `V78.entwurf`), `js/v78-ui.js` (Zyklus `V78UI.zyklus`: Raster je Woche und vier
  Karten, darunter «Plan und absolviert» aus `V66UI.wocheHTML(mo, { nurAuswertung })`; Bearbeiten `V78UI.bearbeiten`: Leiste ✕/✓, Wochenkarte, Status je Tag, Schloss, Griff zum
  Ziehen, ✨ «Woche anpassen?», ↶/↷); Entwurf in `js/v64-ui.js` (`V64UI.entwurf`, `planEintrag` liefert im Bearbeiten-Modus den Entwurf), `V66UI.aendern` schreibt dann nur in den
  Entwurf, `V66UI.entwurfSpeichern` (✓), `V66UI.entwurfSperre` (Draussen planen, Planeinstellungen und Verfügbarkeit der Woche warten), Garmin gesperrt; geplante Last für Fitness,
  Ermüdung und Form ≈ `V66UI.lastGeplant` (ohne TL ≈ Dauer × Last pro Stunde der Sportart), Status je Tag `V66UI.formReihe`
- **V7.10 (Etappe 4, Teil 3, tagesblatt-2.0, eigene-aktivitaet-1.0):** Tagesblatt in `js/v66-ui.js` (`tagSektion`: Kopf mit «i», Einheiten wie im Kalender `zeileEinheit`,
  Zeilen «Training hinzufügen ›» und «Eigene Aktivität planen ›» `V66UI.eigeneAktivitaet`, Verfügbarkeit im Blatt `vfInline`/`vfBinden`, unten klein «Tag sperren» und Garmin);
  eigene Aktivität in `js/v66.js` (Vorlage «eigen» mit Titel, Sportart `V66.EIGEN_SPORT`, RPE → Zone `V66.rpeZone`), geprüft in `merge_daily.planwoche_pruefen`
- **V8.0 (Masterprompt V8, Etappe V8.0 «Prüfung und Szenario-Test», von Silas am 18.11.2026 freigegeben; Bericht `docs/AUDIT_V8.md`):** `tests/sim/` (Simulator ohne Browser:
  `umgebung.cjs` leeres DOM und eigene Uhr, `seite.cjs` Kontext C und V5UI wie index.html, `athlet.cjs` erfundener Athlet, `lauf.cjs` Tag für Tag mit Haken für Morgenwerte,
  Check-in, Änderungen und Ausführung), `tests/test_v80.cjs` (Abnahmetests A–H und acht Wochen Zusammenwirken; was eine spätere Etappe bringt, steht als `todo` mit der Etappe –
  kommt sie, wird daraus ein normaler Test), `tools/pruefung_v8.cjs` (Prüfung der Modelle mit echten Daten: `node tools/pruefung_v8.cjs work/data.json`, seit V8.2 mit Abschnitt 9 «Reaktionen», seit V8.3 mit Abschnitt 10 «Tagescoach», seit V8.5 mit Abschnitt 11 «Modell Automatisch», nur Zusammenfassungen,
  Zahlen nur in den Chat, nie ins Repository). Neue Module, die Planen, Ampel oder Last betreffen, in `MODULE` von `tests/sim/umgebung.cjs` aufnehmen.
- **V8.1 (Masterprompt V8, Etappe V8.1 «Daten zusammenführen», von Silas am 18.11.2026 freigegeben):** `js/v81.js` (ohne DOM: Nach dem Training nachher-1.0
  `V81.nachher`/`V81.eintrag`/`V81.garminSelbst`, Puls zur Leistung hf-leistung-1.0 `V81.pulsZurLeistung`, Satz zur Einheit `V81.hinweis`, Abweichung von der geplanten
  Last last-abweichung-1.0 `V81.abweichung`, Anstieg der Belastung anstieg-1.0 `V81.anstieg`/`V81.projektion`), `js/v81-ui.js` (Zeile «Nach dem Training» unter jeder
  erledigten Aktivität auf Heute und im Tagesblatt `V81UI.zeile`, Blatt `V81UI.blatt`, Karte `#v81-anstieg-card` unter Analyse → Belastung und Erholung), `tests/test_v81.cjs`;
  TL ≈ tl-plan-1.1 in `js/v66.js` (`V66.bezug(skalen, css, last)`, auf der Seite `V66.lastBezug` aus `js/v66-ui.js`: dieselben Bezugsgrössen wie last-2.1);
  Garmins Selbsteinschätzung `garmin_selbst` (`tools/notizen.py` `selbst_von`/`selbst_einlesen`, `merge_daily.py`); Check-in befinden-2.1 (Motivation, Schmerzen) in
  `js/v59-logik.js`/`js/v59.js`, Ampel readiness-2.3 in `js/formkurve.js`; harte Einheiten an Land nie an zwei Tagen hintereinander verfuegbarkeit-1.2 (`V66.verteilen`) und
  kraft-plan-1.2 (`V76.einplanen` opt.nurPassend, `mitKraft` in `js/v64-ui.js`)
- **V8.1.1 (Verpflegung je Einheit, verpflegung-1.0, Silas' Wunsch vom 18.11.2026, Prompt «Verpflegung je Einheit» von ihm freigegeben):** `js/verpflegung.js` (ohne DOM:
  Produkte aus `garmin_lebensmittel` und den Fueling-Vorlagen `VP.produkte`, Wahl `VP.wahl`, Ziel je Einheit `VP.ziel`, vorher · während · nachher mit Zeitplan und Packliste
  `VP.plan`, Kurzfassung `VP.kurz`, Anpassung je Einheit `VP.eintrag`/`VP.pruefen`/`VP.anpassung`, geplant gegen genommen `VP.vergleich`, Darmtraining `VP.darm`),
  `js/verpflegung-ui.js` (Abschnitt «Verpflegung» auf der Einheit-Seite, Zeile unter der heutigen Einheit auf Heute, Blätter «Produkte für die Verpflegung» und «Verpflegung
  anpassen»), `tools/verpflegung.py` (eigene Lebensmittel aus Garmin einlesen, Prüfungen wie die Seite), `tests/test_verpflegung.cjs`; «Nach dem Training» nachher-1.1
  (Magen und Energie ab 60 min, `V81.mitVerpflegung`); Regeln im Abschnitt «Verpflegung je Einheit»
- **V8.2 (Masterprompt V8, Etappe V8.2 «Persönliche Reaktionen», von Silas am 18.11.2026 freigegeben):** `js/v82.js` (ohne DOM: Erholung nach harten Einheiten
  erholung-nach-1.0 `V82.erholung`, was du bisher verträgst vertraeglich-1.0 `V82.vertraeglich`, Verteilung gegen Effizienz verteilung-1.1 `V82.verteilung` (V8.5: klar nur in mindestens 3 der 4 Einteilungen der Blöcke, `V82.EINTEILUNGEN`), Blockbilanz
  blockbilanz-1.0 `V82.bloecke`, `V82.alles`; Einteilung `V82.art` mit den Pulsgrenzen des Profils vom Stichtag für die ganze Historie; Bootstrap mit festem Startwert),
  `js/v82-ui.js` (Ansicht `#reaktionen` unter Analyse, vier Karten, nacheinander gezeichnet), `tests/test_v82.cjs`. Nur Anzeige: nichts davon ändert den Plan (V8.3/V8.5 erst
  mit Silas' Okay). Mindestzahlen `V82.MIN`; ohne sie «noch zu wenig Daten». Ergebnisse mit echten Daten nur im Chat, nie in Doku oder Tests. Regel ändern = Version in
  `V82.VERSIONS`, Wissen (Kapitel «reaktionen») und `tests/test_v82.cjs`.
- **V8.3 (Masterprompt V8, Etappe V8.3 «Täglicher Coach», von Silas am 18.11.2026 freigegeben; Enduco bis 30.11.2026 laut Silas, `config.enduco_bis`):** `js/v83.js`
  (ohne DOM: tagescoach-1.0 `V83.pruefen` mit vier Prüfungen – einzelner Morgen deutlich daneben `V83.morgen`, härter als geplant `V83.haerter`, weniger Zeit, Nachholen
  der Ampel nur als Vorschlag –, Optionen tauschen/locker/kurz/nachholen mit Aktionen für `V66.aendern` und Rückweg, Entscheid `V83.eintrag`/`V83.eintragPruefen`/
  `V83.entscheide`, Markierung `V83.marke`), `js/v83-ui.js` (Karte «Coach» auf Heute `#coach-card`, Vorschläge im Tagesblatt `V83UI.tag`, Annehmen/Ablehnen/Rückgängig,
  Probelauf bis `config.enduco_bis`), `tools/tagescoach.py` (Prüfung der Entscheide wie die Seite), `tests/test_v83.cjs`; `V66.aendern` Art «ersetzen» (gleiche Kennung) und
  «hinzufuegen» mit freier Kennung beim Zurückholen, `V66UI.aendernFolge` (mehrere Änderungen, einmal gespeichert); ampel-plan-1.2 in `js/v74.js` (Nachholen nur als Vorschlag,
  `ampel.nachholen[].vorschlag`); basis-1.2 in `js/v75.js` (`V75.datenBis`: Tage nach den letzten Garmin-Daten zählen nicht als Ruhetage). Der Coach ändert nie selbst etwas.
- **V8.4.1 Sportart (sportart-1.0, Silas' Wunsch vom 18.11.2026: «auch nur für Radrennen oder Laufrennen und Training»):** Planeinstellung «pe-sportart» {art triathlon/rad/lauf}
  (`V75.SPORTARTEN`, `V75.sportenVon`, `V75.aufteilungFuer`; in `START_IDS`, gilt ab der nächsten Woche; `V75.basis` gibt Sportarten ohne Anteil 0 h), «jetzt» und Spitze nur aus den Stunden
  dieser Sportarten (`AN.saisonVorgaben(…, sportarten)`), Woche `V64.woche` opt.`sportart` (`V64.EINZEL`, `V64.SCHLUESSEL2`), Tests nur der Sportart (`V64.woche`, `V62.testplan` ctx.`sportarten`),
  im Plan-Kontext Aufteilung, Vorgaben und kein Schwimmkurs (`js/v64-ui.js`, `K.sportart`), Wochenstunden `js/v56.js`; Planeinstellungen: Zeile «Sportart» auf «Allgemein» (`sportartBlatt`),
  die Folge nur mit den Seiten der Sportart (`seitenNeu`); `V6.distanzen` kennt Marathon und Halbmarathon; geprüft in `merge_daily.planeinstellung_pruefen` (`PE_SPORTARTEN`)
- **V8.4.1 Lauf-ABC (lauf-abc-1.0, Silas am 18.11.2026: «lösche bei Trainings Mobility, ergänze dafür die Lauf-ABC von Enduco – auch bei den Schwellen/VO2max-Einheiten»):**
  `V64.LAUF_ABC` (zwei Formen aus seinen Enduco-Bildschirmfotos, nie im Repository: A Beweglichkeit 6 min, B Koordination 7:30 min; Namen, Sätze und Zeiten wie dort, Texte eigen),
  `V64.abcVon` (harte Läufe: VO2max-Familie B, sonst A; Tests und lockere Läufe nie), `V64.mitAbc` (10 min einlaufen, Lauf-ABC, Hauptteil; Auslaufen trägt den Rest, mind. 5 min),
  `V64.abcText` (Uhr, ≤ 100 Zeichen); Abschnitt `abc` = locker wie Z1, ohne Strecke (`V64.kmSchaetzung`, `V66.schaetzung`), bleibt bei «Einfahren» (`V66.teileAnpassen`), auf Garmin
  ein Einlauf-Schritt ohne Ziel mit den Übungen im Text, auf der Einheit-Seite ein Schritt `art` «abc» mit der Übungsliste (`V73.ausTeilen`, `js/v73-ui.js`), Profil wie Z1, nicht im Fokus.
  Mobility wird nicht mehr angeboten (`V66.SPORTARTEN`, `V66.EIGEN_SPORT`, `merge_daily.EIGEN_SPORT`); die Vorlage bleibt nur für ältere Einträge. Wissen Kapitel «intervalle» (McGowan et al. 2015).
- **V8.4.1 (ältere Browser, kompat-1.0, Silas' älterer Mac vom 18.11.2026):** `js/kompat.js` (vor allen anderen Skripten geladen, absichtlich ES5: Ersatz für `at`,
  `Object.hasOwn`, `Blob.arrayBuffer`; `KOMPAT.gunzip` = eigener gzip-Dekoder, wo `DecompressionStream` fehlt (Explorer, Eingang); Hinweis «Browser zu alt» ohne `?.`/`??` und
  Skriptfehler der ersten 20 s mit Browser und Version), `tests/test_kompat.cjs` (Dekoder gegen zlib, Ersatz in frischer Umgebung, nur ES2020-Syntax = Safari 13.1, keine
  fehlenden Funktionen); CSS ohne `inset` (top/right/bottom/left), `dvh` nur mit `vh` davor. Neue Syntax und Funktionen nur, was Safari 13.1 kennt oder `js/kompat.js` ersetzt.
- **V8.4 Teil 4 (Masterprompt V8, Etappe V8.4 «Abwechslung», von Silas am 18.11.2026 freigegeben):** abwechslung-1.0 in `js/v64.js` (`V64.FAMILIEN` = Formen desselben Reizes, die erste
  ist die Vergleichseinheit; `V64.formFuer(id, woche)`: Woche 0, 3, 6 … ab `V64.FORM_START` die Vergleichseinheit, dazwischen die anderen der Reihe nach; `V64.woche` opt.`abwechslung`, von
  `V64UI.kontextFuer` immer gesetzt; Einheit trägt `form` {nr, n, vergleich, familie}), neue Bausteine `rad_vo2_4x5`, `rad_vo2_4020`, `rad_schwelle_4x10`, `rad_schwelle_3x12`, `rad_tempo_3x15`,
  `lauf_vo2_5x3`, `lauf_vo2_3030`, `lauf_tempo_2x15`, `lauf_tempo_4x8`, `schwimm_css_200`, `schwimm_css_300` (Vorlagen in `js/v66.js` `ZU`, Schwimmen `SW.artVon`/`SW.cssStrecke`, `o.css_m`
  in `SW.einheit`, übergeben an allen drei Aufrufen); Hinweis «Vergleichseinheit» bzw. «gleicher Reiz in anderer Form» im Coach-Text der Einheit-Seite (`js/v73-ui.js`)
- **V8.4 Teil 1 (Silas' Rückmeldungen vom 18.11.2026, «Ampel zu mild, Verpflegung zu kompliziert»):** Ampel readiness-3.0 in `js/formkurve.js` (`FK.erholungNacht` = Erholung der
  einzelnen Nacht wie der Ring, `FK.ERHOLUNG` 34/50 %, `FK.NACHT` Atemfrequenz und Hauttemperatur als mögliche Krankheitszeichen ab 14 Nächten; Anzeige in `js/v5-ui.js`,
  `js/v55.js`, Kachel auf Heute `js/v6-heute.js`); Nachtwerte nacht-1.0 (`tools/wellness.py nacht`, Nacht- und Morgen-Update); Verpflegung verpflegung-2.0 (`VP.knapp`, `VP.kurz`:
  nur g/h und Menge, je eine Zeile vorher/nachher; Produktwahl aus der Oberfläche genommen, Blatt «Anpassen» mit g/h, «Diesmal ohne» und Stufe ab 2,5 h)
- **V8.5 (Masterprompt V8, Etappe V8.5 «Modell Automatisch», automatisch-1.0; von Silas am 18.11.2026 freigegeben):** `js/v85.js` (ohne DOM: Entscheid je Woche `V85.entscheid` –
  Verteilung polarisiert/pyramidal/rennspezifisch und Zahl harter Einheiten an Land (Vorlage `V85.vorlage`, höchstens zwei) aus Phase, Zeit, Verträglichkeit und Ermüdung, jede Wahl mit
  Grund; Block `V85.blockStart`/`V85.stichtag`/`V85.anker`, Ermüdung `V85.ermuedung`, Grenzen `V85.GRENZEN`), `js/v85-ui.js` (`V85UI.entscheid` mit den Daten der Seite: V82 bis zum
  Sonntag vor dem Block, Ampel der 7 Tage davor, Trainingsstatus am Montag; Box `#mo-auto` unter Plan → Trainingsmodell, auch als Vorschau), `tests/test_v85.cjs`; Modell «automatisch» in
  `V64.MODELLE`/`V64.REIHE` und `merge_daily.MODELLE`, `V64.woche` opt.`harte` (1 = harter Lauf locker, gleiche Dauer; nur Rad/Laufen ohne zweite Schlüsseleinheit) und `autoGrund`, im
  Plan-Kontext `K.auto`, `K.autoIn` (`js/v64-ui.js`), Hinweis auf der Einheit-Seite (`e.auto`); verteilung-1.1 in `js/v82.js` (klar nur in mindestens 3 der 4 Einteilungen der Blöcke);
  Test C über mehrere Wochen in `tests/test_v80.cjs` (C3, C4)
- `tools/fit_nacht.py` – Nacht-Update: Sekundenwerte einer neuen Aktivität auswerten (A2)
- `tools/laktat_vorschau.py` – Laktat-Tabellen einlesen, Stufen zuordnen, als Vorschau speichern (A5)
- `tools/check_referenz.py` – Referenzsatz und Neuberechnung prüfen (A1)
- `tools/workouts.py` – Test-Workouts für Zwift (.zwo) und Garmin (JSON), A9
- **V5:** `js/formkurve.js` (Rechenlogik ohne DOM: Zonen-Cockpit, Readiness, 1–6-h-Ziele, Koppelläufe, Fueling, Rad-Fahrzeit, CdA, FIT lesen),
  `js/v5-ui.js` (Laktat & Zonen, Bereitschaft, Eingaben auf dem Gerät), `js/v5-ausdauer.js`, `js/v5-extra.js`, `sw.js` (offline)
- `tools/schwellen.py` – LT1/LT2 je Methode mit Unsicherheit (V5); `tools/migrate_v5.py` – Datenmodell V5 mit Sicherung und Rückweg
- `tools/nachfuellen.py` – neue Kennzahlen aus einem FIT-Durchlauf ergänzen, ohne andere Werte anzufassen
- `tools/eingaben.mjs` – Export «Eingaben» von der Seite entschlüsseln und für `merge_daily.py` aufbereiten
- **V5.3:** `js/route.js` (Routenplaner-Rechenlogik ohne DOM: BRouter-Antwort lesen, Kettenmass, Belag/Wegart/Zugang, Anstiege,
  Tempo-Modelle, Wetterfeld, GPX), `js/routen-ui.js` (Planer-Oberfläche, Bottom Sheet, Karte ↔ Profil), `js/v53-extra.js`
  (Jahresziele, Serie, Tagebuch, Bestleistungen, Leistungsfähigkeiten, Zonen, Protein/KH pro kg, Schwimmübungen, Wetter kopieren)
- `tools/kalibrierung.py` – persönliche Kalibrierung aus FIT (HF→Watt, Physik-Korrektur, HF→Pace, Tobler-Faktor, Hm/h, Pausen) mit Hold-out
- `tools/bestleistungen.py` – Lauf-Bestleistungen aus FIT (400 m … Marathon), GPS-Sprünge ausgeschlossen
- **V5.5:** `js/v55.js` («Meine Entwicklung», Heute mit Datenqualität, Ausdauertrend, Wischhinweis für breite Tabellen, Rechennachweis),
  `js/v55-schwimmen.js` (CSS-Test, Fehlerboard, Rohpace-Hinweis); `tools/entwicklung.py` – gleichmässige 10-min-Blöcke `eb` (eb-1.0)
  aus FIT nachrechnen (`--nur-fehlende`); das Nacht-Update rechnet `eb` über `kennzahlen.alles()` mit
- `brouter/rennrad-asphalt.brf` – eigenes BRouter-Profil «Rennrad ohne Gravel» (aus fastbike, MIT), wird beim Routing-Server hinterlegt
- **V5.6:** `js/analyse.js` (Rechenlogik ohne DOM: Reihen entpacken, Kennzahlen einer Auswahl, Intervalle/Pausen, Ermüdungsresistenz,
  sRPE, Energie, Saisonphasen), `js/explorer.js` (Aktivitäts-Explorer, öffnet über jedem Tab: `data-ex="<ID>"`), `js/v56.js` (RPE und
  Kalibrierung, Geplant vs. Ist, Konstanz, Saison 2027, Ermüdung, Energie); `tools/serien.py` – Sekundenreihen im 2-s-Raster, Workout-Abgleich
  `wk` und Ermüdung `fr` aus FIT; `tools/serien_crypt.mjs` – Reihen verschlüsseln nach `serien/<Name>.bin` (Name = SHA-256 aus
  `serien_salz` und gid bzw. ID, `serien_salz` steht nur verschlüsselt in den Daten; die Dateinamen verraten keine Garmin-/Zwift-IDs)
- **V5.7.2:** `tools/garmin_ernaehrung.py` – Garmin-Ernährungsprotokoll je Tag prüfen und Einnahmen während einer Aktivität als Fueling «fg-…» übernehmen
- **V5.7.1 Reihen im Nacht-Update:** `tools/serienlib.mjs` (Formate SPS1/SPS2, Dateiname, Ver-/Entschlüsseln), `tools/serien_pruefen.mjs`
  (Konsistenz Aktivitäten ↔ Reihen ↔ Zuordnung und Datenschutz nach jedem Import; Regeln im Abschnitt «Sekundenreihen»)
- **V5.7 Smart Training Routes:** `js/training-route.js` (Rechenlogik ohne DOM: Enduco-/Garmin-Workout lesen, Zeitplan je Schritt, Rundtour-Kandidaten,
  Dauerabstimmung, Intervall-Eignung, Wetter je Durchfahrtszeit, Tageslicht, Vorschläge A/B/C, Vorschlag vs. Ist), `js/training-ui.js`
  (Trainingsvorschau im Planer, Startorte verschlüsselt, Regler, Kalender «Passende Route finden» `data-str`, «Vorschlag vs. Ist» `data-trv`)
- **V5.9:** `js/eingang.js` (Direkt speichern: Delta, EGS1, GitHub-Schlüssel, Warteschlange), `js/v59-logik.js` (Rechenlogik ohne DOM:
  Check-in, Gefühl gegen Morgenwerte, Heute geplant, Trainingslast, CSS), `js/v59.js` (Check-in, Einstellungen, Laktat bestätigen …),
  `tools/eingang.mjs` (eingang/ einlesen, aufräumen, prüfen), `tools/eingaben_lib.mjs` (Zuordnung Eingaben → merge_daily.py), `tests/test_v59.cjs`,
  `tools/last.py` (V5.9.1 Trainingslast `tl2` mit der LT2, seit V6.6.2 last-2.1 je System; Vergleich; Abschnitt «FTP und Trainingslast»)
- **V6.0:** `css/v6.css` (Design design-1.0, seit V6.6.1 design-1.1 mit den Planer- und Datenfarben: dunkel als Standard, Zonen-, Sport- und Statusfarben, Pillen, Blätter), `js/v6.js` (ohne DOM:
  Zonen und Farben, Balkenprofil profil-1.0, Fokus, Trainingsstatus status-1.1, Wochenleiste, Rennen/Phasen, eigene Symbole), `js/v6-heute.js`
  (Heute: Kacheln, Heutiges Training, Einheit, Optionen, Bereitschaft als Blätter, Wochenleiste), `js/v6-plan.js` (Plan: Rennen, Phasen,
  Wochenübersicht), `tests/test_v6.cjs`
- **V6.1 (Etappe 1 Daten):** `tools/wellness.py` (Readiness, Body Battery, Stress je Tag, wellness-1.0; `offen` = Tage zum Nachholen),
  `tools/notizen.py` (Garmin-Notizen speichern, Laktat und Verpflegung daraus als Vorschau, notizen-1.0; `offen` = Aktivitäten ohne Notiz),
  `js/v61.js` (ohne DOM: Garmin-Werte eines Tages, Datenlage je Wert, Notiz-Vorschauen), `tests/test_v61.cjs`
- **V6.2 (Etappe 2):** `js/v62.js` (ohne DOM: Testplan testplan-1.0, V6.2.2 Zonen-Vorschlag zonenvorschlag-1.0), `tests/test_v62.cjs`;
  Oberfläche des Zonen-Vorschlags in `js/v5-ui.js` (`V.zonenVorschlag`, Karte `#zv-card` unter Laktat)
- **V6.3 (Etappe 3 Ampel und Check-in):** keine neuen Dateien; Check-in befinden-2.0 in `js/v59-logik.js`/`js/v59.js`, Ampel readiness-2.0 und
  Prüfung an den eigenen Daten ampel-pruefung-1.0 in `js/formkurve.js` (`FK.readiness`, `FK.ampelPruefung`), Anzeige in `js/v5-ui.js` (Tagesbereitschaft)
- **V6.2.3:** `tools/garmin_export.py` – Garmin-Datenexport (DSGVO-Export) → Verlauf `spuren-garmin-verlauf-1` (garmin-export-1.0, Abschnitt
  «Garmin-Datenexport»); Prüfung auf der Seite `V61.verlaufPruefen`, Einstellungen «Garmin-Verlauf einlesen» (`js/v59.js`)
- **V6.4 (Etappe 4 Modell und Wissen):** `js/v64.js` (ohne DOM: Trainingsmodelle modell-1.0, Woche nach Modell wochenplan-1.2, Aufteilung
  aufteilung-1.0, Intensitätsverteilung tid-1.0, V6.4.2 Intensität je Sportart intensitaet-1.1 und Aufbau-Check aufbau-1.1, V6.4.3 Vergleich mit
  Enduco vergleich-1.4 (1.2 = V6.5 Wahl je Tag, 1.3/1.4 = V6.6), Stand vergangener Wochen `V64.stand`), `js/wissen.js` (wissen-1.6: Kapitel in eigenen Worten, Quellen mit DOI),
  `js/v64-ui.js` (Plan: «Woche nach Modell» mit «Vergleich mit Enduco», «Vorschlag und Enduco über die Wochen», «Aufbau-Check», «Trainingsmodell»
  mit Intensität je Sportart; Ansicht «Wissen» unter Plan), `tests/test_v64.cjs`; Saison saison-1.2 in `js/analyse.js` (`AN.saison`,
  `AN.saisonStunden`, `AN.saisonVorgaben`)
- **V6.5 (Etappe 5 Enduco-Bibliothek und Archiv):** `tools/bibliothek.py` (bib-1.1: jedes Enduco-Workout aus Garmin bleibt in `enduco_bib`,
  mit Volltext, Schritten, Schwimmübungen, Terminen und Versionen; Startbestand aus der Garmin-Workout-Liste am 13.11.2026), `tools/archiv.mjs`
  (archiv-1.0: privates Archiv `sileyhunter/spuren-archiv`, Abschnitt «Archiv»), `tests/test_archiv.cjs`; `js/v65.js` (ohne DOM: Liste bibliothek-1.0,
  Enduco über die Monate monate-1.0, Schwimmübungen uebungen-1.0), `js/v65-ui.js` (Ansicht «Bibliothek» unter Plan; eine Einheit öffnet das
  Einheit-Blatt über `V6H.einheitP`), `tests/test_v65.cjs`
- **V6.6 (Etappe 6 Kalender und Woche bearbeiten):** `js/v66.js` (ohne DOM: Mein Plan eigenplan-1.0, Vorlagen vorlagen-1.0, TL ≈ und Distanz ≈
  geplanter Einheiten tl-plan-1.0, Wochenart wochenblatt-1.0, Aufbau-Hinweis), `js/v66-ui.js` (Abschnitt «Mein Plan» im Tagesblatt, Training
  hinzufügen, Einheit ändern, Wochenaktionen, Kalender-Wochenansicht kalender-2.0, Wochenblatt im Plan, Abschnitt «Garmin»), `tests/test_v66.cjs`;
  `tools/garmin_senden.py` (garmin-senden-1.0: Aufträge prüfen, was zu senden ist, Rücklese, Ergebnisse eintragen; Abschnitt «An Garmin senden»)
- **V7.0 (Bedienung nach Vorlage enduco, Auftrag «Masterprompt V7» vom 14.11.2026, Etappe A):** `js/v7.js` (ohne DOM: Planvergleich
  planvergleich-1.0, Balkenprofil eigener Einheiten profil-teile-1.0, Tage einer beliebigen Woche kalender-3.0, Wochenumfang), `js/v7-ui.js`
  (Analyse-Start analyse-start-1.0, Planvergleich, Plan-Übersicht und «Plan verwalten», Labor, Mein Plan für Heute und Kalender), `tests/test_v7.cjs`,
  `docs/v7-bestandsaufnahme.md` (Zuordnung der Vorlage). Die Enduco-PDF und die Bildschirmfotos liegen **nie** im Repository.
- **V6.4.4 (Prüfung V6.4, `docs/AUDIT_V64.md`):** `tools/leck_pruefen.py` – Leck-Prüfung vor jedem Push: sucht echte Werte (IDs, Zonentexte und
  -grenzen, Schwellen, Distanzen mit Datum, Testtermine und Abwesenheiten, E-Mail) in allen getrackten Dateien, gibt nur Fundorte aus
- **V5.8:** keine neuen Dateien; Rechenlogik in `js/route.js` (Abschnitte von Hand, Skitourennetz, Hangneigung, MTB-Abfahrt, Wegende, drei
  Rennradvarianten, Windpfeile), Oberfläche in `js/routen-ui.js`, Ringe «Heute» in `js/formkurve.js` (`FK.ringeVerlauf`) und `js/v55.js` (`V55.ringe`)
- `tests/test_formkurve.cjs`, `tests/test_route.cjs`, `tests/test_analyse.cjs`, `tests/test_training.cjs`, `tests/test_v64.cjs`, `tests/test_tools.py` – Abnahmetests (erfundene Werte; `tests/fixtures/` = echte
  Antworten einer lokalen BRouter-Instanz mit OSM-Testdaten Dreieich, ODbL); `docs/` – Konzept, Abnahme (`abnahme-v53.md`, Teil 0b `abnahme-teil0b.md`), Audit V5.5 (`AUDIT_V55.md`),
  Audit V5.6 (`AUDIT_V56.md`), Audit V5.7 (`AUDIT_V57.md`), offene Punkte (`offen-nach-v55.md`),
  Auftrag für die nächsten Etappen (`auftrag-etappen-6-8.md`, Wünsche vom 13.11.2026; jede Etappe erst nach Silas' Okay), Teil 0b Karte (`auftrag-karte-fehler.md`, V6.6.1), Vorschläge zum Enduco-Vergleich (`ergaenzung-enduco-vergleich.md`, erst nach Okay)

## Nächtliches Update (nur Garmin-Verbindung)
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Letztes Aktivitätsdatum in `data.json` bestimmen. Dann über die Garmin-Verbindung:
   - `get_activities_by_date` von (letztes Datum − 2 Tage) bis heute, alle Seiten.
   - pro Einheit `get_activity` (Leistung, NP, Höhenmeter, Dauer) und `get_activity_hr_in_timezones` (Zeit in Zone 1–5).
   - `get_sleep_summary_range` letzte 7 Nächte; `get_stats_range` letzte 7 Tage; `get_nutrition_summary_between_dates` letzte 7 Tage; `get_weigh_ins` letzte 14 Tage; `get_scheduled_workouts` heute bis +14 Tage.
   - **Tageswerte (V6.1, wellness-1.0):** `get_morning_training_readiness(heute)`, `get_user_summary(gestern)` (abgeschlossener Tag) und
     `get_user_summary(heute)` (nur `bodyBattery`, `bbSleep`) → `days` (Zuordnung unten). «No … data found» oder Fehler: weglassen.
   - **Nachtwerte (V8.4, nacht-1.0, für die Ampel readiness-3.0):** `get_sleep_data(heute)` – die Antwort ist gross und wird als Datei gespeichert; die Datei nicht lesen,
     nur `python3 -I tools/wellness.py nacht <pfad>` → ein Tag mit `atem`, `haut`, `spo2`, `spo2min`, `schlafBedarf` (nur vorhandene Werte); ist die Ausgabe nicht `{}`,
     als zusätzlichen Eintrag in `days` aufnehmen. Fehler: weglassen, kein Abbruch, keine Nachricht.
   - **Notizen (V6.1, notizen-1.0):** für jede Aktivität, die du mit `get_activity` abrufst, `description` unverändert als `notiz` (fehlt sie:
     `null`). Die Notiz nie ändern, kürzen oder zusammenfassen; `merge_daily.py` macht daraus Vorschauen für Laktat und Verpflegung.
   - **Selbsteinschätzung (V8.1, nachher-1.0):** aus derselben Antwort von `get_activity` `workout_rpe` und `workout_feel` unverändert in den Eintrag der
     Aktivität (fehlen sie: `null`). `merge_daily.py` legt sie je Garmin-ID in `garmin_selbst` ab (`rpe_g` 1–10, `feel_g` 0/25/50/75/100); die Seite schlägt
     sie unter «Nach dem Training» vor. Nie selbst etwas eintragen oder nach Garmin schreiben.
   - **Eigene Lebensmittel (V8.1.1, verpflegung-1.0):** `get_custom_foods(start=0, limit=20)`, dann `start` 20, 40 … solange `moreDataAvailable` true ist (höchstens
     10 Seiten; ein `limit` über 20 lehnt Garmin ab). Jede Antwort unverändert als `work/lm_<n>.json` speichern (kommt sie als Datei, deren Pfad nehmen), dann
     `python3 -I tools/verpflegung.py liste work/lm_*.json > work/lebensmittel.json` und in `work/new.json` `"garmin_lebensmittel"` = Inhalt dieser Datei (ganze Liste,
     ersetzt die bisherige). Schlägt eine Seite fehl: den ganzen Schritt weglassen (sonst fehlten Produkte), kein Abbruch, keine Nachricht. Nie Lebensmittel in Garmin
     anlegen, ändern oder löschen.
   - **Workout-Schritte (V5.7, für «Passende Route finden»):** für jede Einheit aus `get_scheduled_workouts` mit `workout_id`:
     `get_workout_by_id(workout_id)` (vereinfachte Form, nicht `raw`) und im `planned`-Eintrag ergänzen: `wid` = workout_id,
     `quelle` = `<provider> über Garmin` (z. B. «Enduco über Garmin»), `desc` = erster Satz der Beschreibung (höchstens 200 Zeichen),
     `steps` = `segments[0].steps` unverändert (type, description, end_condition, end_condition_value, target_type, target_value_low/high,
     secondary_target_*, repeat_count, stroke_type, equipment_type, steps). **V6.5 (Enduco-Bibliothek):** zusätzlich `desc_voll` =
     `description` unverändert und vollständig, `geaendert` = `updated_date`, `erstellt` = `created_date`. Danach `get_workouts`: Workouts mit `provider` «Enduco», `created_date` in den letzten
     2 Tagen und nicht im Kalender → höchstens 5 als `"workouts_neu"` (je `get_workout_by_id`; Format unten, mit denselben Feldern; ersetzt die alte Liste).
     Schlägt ein Abruf fehl: ohne Schritte weitermachen, kein Abbruch, keine Nachricht. Enduco-Workouts nie ändern.
   - **Enduco-Bibliothek (V6.5, bib-1.1, `tools/bibliothek.py`):** Die Antwort von `get_workouts` ist gross und wird als Datei gespeichert;
     den Pfad merken (die Datei nicht abschreiben). Nach dem Einspielen in Schritt 3: `python3 -I tools/bibliothek.py liste data.json <pfad>`
     (alle Enduco-Workouts mit Volltext; nichts wird gelöscht, Änderungen werden neue Versionen). Kommt die Antwort ausnahmsweise direkt
     statt als Datei: diesen Schritt weglassen. Fehlschlag: kein Abbruch, keine Nachricht.
   - **Tageswerte rückwirkend nachholen** (bis sie ab 2020 vorhanden sind): Startpunkt ist `config.days_backfill` in `data.json`,
     fehlt der Wert, das früheste Datum in `days`. Liegt er nach 2020-01-01, mit `get_sleep_summary_range` die 180 Nächte davor holen
     (zwei Abfragen à 90 Nächte, nie vor 2020-01-01) und als zusätzliche Einträge in `days` aufnehmen, nur `hrv`, `rhr`, `sleepH`,
     `sleepScore`, `sleepStress` (Nächte ohne Werte weglassen). Dann in `work/new.json` `"config": {"days_backfill": "<frühestes abgefragtes Datum>"}` setzen.
     Liefern beide Abfragen keine einzige Nacht, `"days_backfill": "2020-01-01"` setzen (fertig). Schlägt das Nachholen fehl,
     einfach weglassen: kein Abbruch, keine Nachricht, nächste Nacht erneut.
   - **FIT-Sekundenwerte je neue Aktivität (A2)**, also für jede Aktivität aus `get_activities_by_date`, die noch nicht in `data.json`
     steht oder dort noch kein Feld `mv` oder `t0` hat:
     a) `get_activity_fit_data(activity_id=<id>, include_records=true)`. Die Antwort ist gross und wird als Datei gespeichert;
        der Pfad steht in der Meldung («Output has been saved to …»). Die Datei nicht lesen, nur den Pfad weitergeben.
     b) `get_activity_fit_messages(activity_id=<id>, message_types=["file_id","lap","length","event","workout","workout_step","zones_target"], message_limit=5000)`,
        ebenfalls als Datei.
     c) `python3 -I tools/fit_nacht.py <id> <pfad_a> <pfad_b> >> work/fit.jsonl` (V5.6: rechnet auch Workout-Abgleich `wk`, Ermüdung `fr`
        und die Reihe `work/serien/g<ID>.json` für den Explorer; V5.7: GPS-Spur `poly` draussen wie im Monatsexport, für «Vorschlag vs. Ist»)
     Kommt eine Antwort direkt statt als Datei (sehr kurze Aktivität), sie unverändert als `work/fit_<id>_a.json` bzw.
     `work/fit_<id>_b.json` speichern und diese Pfade nehmen. Schlägt ein Abruf fehl: ohne diese Datei weitermachen
     (`fit_nacht.py <id> fehlt`); die Lücke steht dann im Protokoll `fit_log`. Kein Abbruch, keine Nachricht.
   - **Wetter (V5):** für jede neue Aktivität draussen (nicht Rolle, nicht Laufband, nicht Becken) `get_activity_weather(activity_id)`;
     die Antwort unverändert unter `"wx": {"g<ID>": {…, "quelle": "Garmin get_activity_weather (Wetterstation)", "abgerufen": "<heute>"}}`
     in `work/new.json`. Zusätzlich höchstens 10 ältere Aktivitäten draussen mit `gid` und ohne `wx` (neueste zuerst). Fehlt die Antwort:
     weglassen, kein Abbruch. Bestehende `wx` werden nie überschrieben.
   - **Ernährung (V5.7.2, Garmin-Ernährungsprotokoll):** für jedes Datum von (letztes Aktivitätsdatum − 2 Tage) bis heute
     `get_nutrition_daily_food_log(date)` und `get_hydration_data(date)`. Je Tag mit Einträgen in `work/new.json` unter `"food_logs"`:
     `date` = `mealDate`, `dailyCalories` = `dailyNutritionContent.calories`, `dailyCarbs` = `dailyNutritionContent.carbs`,
     `hydration` = {`valueInML`, `activityIntakeInML`, `sweatLossInML`, `lastEntryTimestampLocal`} und `items`: je Eintrag aus
     `mealDetails[].loggedFoods[]` (jede `logId` nur einmal) unverändert `logId`, `foodName`/`brandName` (aus `foodMetaData`), `servingQty`,
     `numberOfUnits`/`servingUnit`/`calories`/`carbs`/`sodium` (aus `nutritionContent`; fehlt → null), `mealName` (aus `meal`), `mealTime`,
     `logTimestamp`. Nichts umrechnen oder ergänzen. `merge_daily.py` prüft jeden Tag gegen die Tageswerte (sonst nicht verwendet) und
     übernimmt Einträge mit Uhrzeit während einer Aktivität, die erst danach erfasst wurden, als Fueling «fg-<Aktivität>»
     (`tools/garmin_ernaehrung.py`). Schlägt ein Abruf fehl: weglassen, kein Abbruch, keine Nachricht.
   - **Zuletzt, rückwirkend (V6.1):** erst wenn alles oben abgerufen ist; aus den Antworten nur die genannten Felder übernehmen.
     a) Tageswerte: `python3 -I tools/wellness.py offen data.json` nennt die Tage dieser Nacht (`tage`, höchstens 20) und davon die mit
        Readiness (`readiness`); je Tag `get_stress_summary` (nur `stress` = `avg_stress_level`) und für die Readiness-Tage
        `get_morning_training_readiness` → zusätzliche Einträge in `days`, dann `"config": {"wellness_backfill": "<neuer_zeiger>"}`.
        Kein `get_user_summary` beim Nachholen (zu gross); Body Battery gibt es nur ab jetzt. Bei `"fertig": true` nichts nachholen.
     b) Notizen: `python3 -I tools/notizen.py offen data.json` nennt höchstens 20 Garmin-IDs ohne abgerufene Notiz bzw. (V8.1) aus den letzten 90 Tagen ohne
        abgerufene Selbsteinschätzung; je ID `get_activity` → `"notizen_garmin": {"<ID>": <description oder null>}` und
        `"selbst_garmin": {"<ID>": {"workout_rpe": <Wert oder null>, "workout_feel": <Wert oder null>}}`.
     c) Enduco-Bibliothek (V6.5): `python3 -I tools/bibliothek.py offen data.json` nennt unter `wids` höchstens 10 Workouts ohne Schritte;
        je ID `get_workout_by_id(<ID>)` (vereinfachte Form) → `"enduco_schritte": [{"wid", "titel" = name, "sport", "erstellt" = created_date,
        "geaendert" = updated_date, "desc_voll" = description, "steps" = segments[0].steps unverändert (alle Felder), "dauer_s" =
        estimated_duration_seconds, "distanz_m" = estimated_distance_meters, "pool_m" = pool_length}]` (fehlende Felder weglassen).
        Bei `"fertig": true` nichts nachholen.
     Schlägt ein Abruf fehl: bei a) den Zeiger nicht verschieben, bei b) die ID weglassen (nächste Nacht erneut), bei c) `{"wid": <ID>, "fehlt": true}`
     (nach drei Fehlversuchen fragt `offen` nicht mehr danach); kein Abbruch, keine Nachricht.
3. `work/new.json` schreiben (Format unten, mit `"lauf": "nacht"`), dann `python3 -I tools/merge_daily.py data.json work/new.json work/fit.jsonl`
   und `python3 -I tools/bibliothek.py liste data.json <pfad der get_workouts-Antwort>` (V6.5, siehe oben).
   **Eingaben vom Handy (V5.9.3, eingang-1.0, Abschnitt «Eingang»):** `SPUREN_PW=… node tools/eingang.mjs einlesen` (liest `eingang/*.bin`,
   schreibt `work/eingang_a.json`, `work/eingang_b.json`, `work/eingang_dateien.json`).
   - Gibt es `work/eingang_a.json`: `python3 -I tools/merge_daily.py data.json work/eingang_a.json`.
   - Gibt es `work/eingang_b.json` (Laktat auf der Seite bestätigt): `cp data.json work/vor_b.json`, dann
     `python3 -I tools/merge_daily.py data.json work/eingang_b.json`, `python3 -I tools/migrate_v5.py data.json` und
     `python3 -I tools/check_referenz.py data.json --ohne-fit`. Steht «GESAMT: bestanden» da, ist B übernommen. Sonst
     `cp work/vor_b.json data.json` (die Bestätigung bleibt in `eingang/` liegen) und Silas kurz informieren (Grund aus der Ausgabe, ohne Werte).
   - Meldet `einlesen` «abgelehnt …» (Demo, fremd, nicht entschlüsselbar): nie löschen, Silas kurz informieren.
   **An Garmin senden (V6.6, garmin-senden-1.0, von Silas am 13.11.2026 freigegeben, Entscheid E3; Abschnitt «An Garmin senden»):** als Letztes
   in Schritt 3. Ist es vor 23:00 Europe/Zurich: bis 23:00 warten. `git fetch origin main`; zeigt `git diff --name-only HEAD origin/main -- eingang/`
   neue Dateien: `git pull --ff-only` und den Block «Eingaben vom Handy» oben nochmals (spielt nur Neues ein). Dann
   `python3 -I tools/garmin_senden.py plan data.json > work/garmin_plan.json` und die `aktionen` der Reihe nach ausführen, wie im Abschnitt
   «An Garmin senden» beschrieben; danach `python3 -I tools/garmin_senden.py eintragen data.json work/garmin_plan.json work/garmin_ergebnis.json`
   (auch ohne Aktionen). Meldet es «GARMIN FEHLER …»: Silas kurz informieren (Titel und Grund). Fehler beim Senden brechen das Update nie ab.
4. `SPUREN_PW=… node tools/crypt.mjs encrypt data.json data.enc.json`.
   **Sekundenreihen (V5.7.1, von Silas am 8.11.2026 freigegeben):** `SPUREN_PW=… node tools/serien_crypt.mjs --nacht` (nur neue oder
   tatsächlich geänderte Reihen aus `work/serien/`, atomar geschrieben, nichts gelöscht oder umbenannt), dann
   `SPUREN_PW=… node tools/serien_pruefen.mjs --nacht --git` (Konsistenz und Datenschutz, siehe «Sekundenreihen»).
   - Beide ohne Fehler und letzte Zeile «PRÜFUNG REIHEN: bestanden» → `git add data.enc.json serien/`.
   - Sonst: `git checkout -- serien/ && git clean -fdq -- serien/` (die bisherigen Dateien bleiben unverändert), nur `data.enc.json`
     stagen, Commit-Nachricht mit dem Zusatz « (Reihen nicht übernommen)» und Silas kurz informieren (Grund aus der Ausgabe, ohne Daten).
   **Eingang aufräumen (V5.9.3):** `node tools/eingang.mjs aufraeumen work/eingang_dateien.json` (mit `--mit-b`, wenn B übernommen wurde;
   entfernt mit `git rm` nur die eingespielten Dateien und Testdateien), dann `SPUREN_PW=… node tools/eingang.mjs pruefen --git`
   («PRÜFUNG EINGANG: bestanden»; sonst Silas den Grund nennen). Die Löschungen gehören in denselben Commit wie `data.enc.json`.
   Nie `data.json` oder etwas aus `work/` committen. Commit «Nacht-Update JJJJ-MM-TT», auf `main` pushen. Scheitert der Push (neue Eingaben
   vom Handy während des Updates), einmal `git pull --rebase` und erneut pushen; die neuen Dateien spielt das nächste Update ein.

### Format `work/new.json`
```json
{
  "activities": [{"garmin_id": 0, "name": "", "type": "road_biking", "start_local": "2026-10-30T18:30:00",
                  "duration_s": 0, "distance_m": 0, "elev_gain_m": 0, "avg_hr": 0, "max_hr": 0,
                  "avg_power": null, "np": null, "hr_zones_s": [z1, z2, z3, z4, z5], "notiz": null, "workout_rpe": null, "workout_feel": null}],
  "notizen_garmin": {"25000000000": "Text der Notiz wie in Garmin", "25000000001": null},
  "selbst_garmin": {"25000000000": {"workout_rpe": 60, "workout_feel": 75}, "25000000001": {"workout_rpe": null, "workout_feel": null}},
  "days": [{"date": "2026-10-30", "hrv": 0, "rhr": 0, "sleepH": 0, "sleepScore": 0, "sleepStress": 0, "kcalOut": 0,
            "kcalIn": 0, "protein": 0, "carbs": 0, "fat": 0, "readiness": 0, "readinessLevel": "MODERATE", "bodyBattery": 0,
            "bbSleep": 0, "bbHigh": 0, "bbLow": 0, "stress": 0, "stressHighMin": 0}],
  "weights": [{"date": "2026-10-30", "kg": 0, "ts_gmt": 0}],
  "planned": [{"date": "2026-11-02", "title": "", "sport": "rad", "dur_s": 3600, "wid": 0, "quelle": "Enduco über Garmin", "desc": "",
               "desc_voll": "", "geaendert": "2026-11-01T20:00:00.0", "erstellt": "2026-11-01T20:00:00.0",
               "steps": [{"type": "warmup", "end_condition": "time", "end_condition_value": 600, "target_type": "power.zone",
                          "target_value_low": 120, "target_value_high": 180}]}],
  "planned_range": ["2026-10-31", "2026-11-14"],
  "workouts_neu": [{"wid": 0, "title": "", "sport": "cycling", "dur_s": 0, "erstellt": "2026-11-08T07:39:40", "geaendert": "2026-11-08T07:39:40",
                    "desc": "", "desc_voll": "", "steps": []}],
  "enduco_schritte": [{"wid": 0, "titel": "", "sport": "swimming", "erstellt": "", "geaendert": "", "desc_voll": "", "steps": [],
                       "distanz_m": 2000.0, "pool_m": 50.0}, {"wid": 0, "fehlt": true}],
  "garmin_lebensmittel": [{"id": "", "name": "", "marke": null, "menge": 1.0, "einheit": "SERVING", "kcal": 0, "kh": 0, "zucker": null, "protein": 0, "fett": 0,
                           "natrium": null, "kalium": null}],
  "food_logs": [{"date": "2026-11-08", "dailyCalories": 0, "dailyCarbs": 0, "hydration": {"valueInML": 0, "activityIntakeInML": 0, "sweatLossInML": 0, "lastEntryTimestampLocal": ""},
                 "items": [{"logId": "", "foodName": "", "brandName": null, "servingQty": 1.0, "numberOfUnits": 1.0, "servingUnit": "SERVING",
                            "calories": 0, "carbs": 0, "sodium": null, "mealName": "SNACKS", "mealTime": "10:45:00", "logTimestamp": "2026-11-08T12:52:14.000Z"}]}],
  "config": {"days_backfill": "2026-04-04", "wellness_backfill": "2026-10-20"}
}
```
`config` ist optional und wird in `data.json` übernommen (nur die angegebenen Schlüssel). `"lauf": "nacht"` bzw. `"morgen"` (V5.9.2) setzt
`updated_lauf` (die Seite zeigt «Stand 08:31 (Morgen-Update)»).
Zuordnung: `type` = Garmin-Typ aus `get_activity`; `start_local` = `start_time_local`; `duration_s` = `duration_seconds`;
`elev_gain_m` = `elevation_gain_meters`; `avg_hr` = `avg_hr_bpm`; `avg_power` = `avg_power_watts`; `np` = `normalized_power_watts`;
Tage: `hrv` = `avg_overnight_hrv`, `rhr` = `resting_heart_rate_bpm`, `sleepH` = `sleep_hours`, `sleepScore` = `sleep_score`,
`sleepStress` = `avg_sleep_stress`, `kcalOut` = `total_calories` (nur abgeschlossene Tage), Ernährung nur für abgeschlossene Tage mit
`item_count` ≥ 4. V6.1 (wellness-1.0, `tools/wellness.py`): `readiness` = `score`, `readinessLevel` = `level` aus `get_morning_training_readiness`;
aus `get_user_summary`: `bodyBattery` = `bodyBatteryAtWakeTime`, `bbSleep` = `bodyBatteryDuringSleep`, und nur für abgeschlossene Tage
`stress` = `averageStressLevel`, `stressHighMin` = `highStressDuration` ÷ 60 (gerundet), `bbHigh` = `bodyBatteryHighestValue`,
`bbLow` = `bodyBatteryLowestValue`; negative Garmin-Werte = fehlend (`null`). V8.4 (nacht-1.0, `tools/wellness.py nacht`): `atem` = `averageRespirationValue`,
`haut` = `avgSkinTempDeviationC` (nur mit `skinTempDataExists`), `spo2` = `averageSpO2Value`, `spo2min` = `lowestSpO2Value`, `schlafBedarf` = `sleepNeed.actual` (Minuten). Notiz: `notiz` bzw. `notizen_garmin` = `description` aus `get_activity`; Selbsteinschätzung (V8.1): `workout_rpe`, `workout_feel` aus `get_activity` (Garmin 10–100 bzw. 0–100).
Gewicht: `weight_kg`, `ts_gmt` = `timestamp_gmt` (alle Messungen; das Skript nimmt pro Tag die Morgenmessung).
Leere Werte als `null`. Unbekannte Felder weglassen. Werte nie schätzen.

## Morgen-Update (V5.9.2, morgen-1.0, seit 16.11.2026 täglich 07:00 und 11:00; lesend auf Garmin bis auf den Schritt «Ampel» seit V7.4)
Zweck: das Workout des Tages und die Werte der letzten Nacht auf «Heute», bevor Silas trainiert (er exportiert Enduco-Workouts oft erst am
Morgen nach Garmin). Keine Aktivitäten, keine FIT-Dateien, keine Sekundenreihen – das bleibt beim Nacht-Update. Nach Garmin geschrieben wird nur
im Schritt «Ampel» (V7.4, Entscheid A7 vom 16.11.2026, gebaut am 17.11.2026): die eigene harte Einheit des Tages durch ihre lockere Fassung ersetzen.
Enduco-Workouts werden nie geändert. Jeder Abruf, der fehlschlägt, wird weggelassen: kein Abbruch, keine Nachricht.
1. `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json data.json`
2. Über die Garmin-Verbindung, Zuordnung der Felder wie im Nacht-Update:
   - `get_sleep_summary_range` von gestern bis heute → `days` mit nur `hrv`, `rhr`, `sleepH`, `sleepScore`, `sleepStress` (Nächte ohne Werte weglassen).
   - `get_stats_range` für heute → `rhr` von heute, falls es im Schlaf fehlt. Kein `kcalOut` und keine Ernährung: der Tag läuft noch.
   - V6.1: `get_morning_training_readiness(heute)` → `readiness`, `readinessLevel`; `get_user_summary(heute)` → nur `bodyBattery`, `bbSleep`;
     `get_user_summary(gestern)` → `stress`, `stressHighMin`, `bbHigh`, `bbLow` (und `bodyBattery`, `bbSleep`) für gestern. Kein Nachholen.
   - V8.4 (nacht-1.0): `get_sleep_data(heute)` als Datei → `python3 -I tools/wellness.py nacht <pfad>` → zusätzlicher Eintrag in `days` (wie im Nacht-Update).
   - `get_scheduled_workouts` heute bis +14 Tage, je Einheit mit `workout_id` `get_workout_by_id` → `planned` und `planned_range`,
     genau wie im Nacht-Update (Workout-Schritte V5.7).
   - `get_workouts` → `workouts_neu` wie im Nacht-Update (Enduco, letzte 2 Tage, nicht im Kalender, höchstens 5); den Pfad der gespeicherten
     Antwort für die Enduco-Bibliothek merken (V6.5).
3. `work/new.json` mit `"lauf": "morgen"` und nur diesen Feldern schreiben, `python3 -I tools/merge_daily.py data.json work/new.json` (ohne
   fit.jsonl), dann `python3 -I tools/bibliothek.py liste data.json <pfad der get_workouts-Antwort>` (V6.5; ohne Datei weglassen, kein Nachholen). Danach die Eingaben vom Handy wie im Nacht-Update (Schritt 3 «Eingaben vom Handy», mit Bestätigungen und Prüfung).
   **Ampel (V7.4, ampel-plan-1.0, Entscheid A7):** als Letztes in Schritt 3. `node tools/ampel_heute.mjs data.json > work/ampel_heute.json` (Entscheid von
   heute mit den Morgenwerten und dem Check-in, gleiche Regeln wie die Seite), dann `python3 -I tools/merge_daily.py data.json work/ampel_heute.json`
   (speichert ihn als `ampel_anpassung`, wenn er neu ist oder sich geändert hat; «Trotzdem wie geplant» vom Handy bleibt). Dann
   `python3 -I tools/garmin_senden.py ampel data.json > work/garmin_plan.json`: nur bei «vorsichtig» oder Krankheitszeichen und ohne «Trotzdem» stehen dort
   Aktionen – je eigene Einheit von heute in Garmin, deren Auftrag eine lockere Fassung trägt, `hochladen` (lockere Fassung, mit Rücklese) und danach
   `austragen` (die harte, mit `nach`). Genau diese Aktionen ausführen wie im Abschnitt «An Garmin senden» (sonst nichts), dann
   `python3 -I tools/garmin_senden.py eintragen data.json work/garmin_plan.json work/garmin_ergebnis.json` (auch ohne Aktionen). Meldet es
   «GARMIN FEHLER …»: Silas kurz informieren («Auf der Uhr steht noch die harte Fassung – locker fahren bzw. laufen», mit Titel). Nie etwas anderes
   nach Garmin schreiben, nie für einen anderen Tag als heute, nie die harte Fassung zurücksetzen; Fehler hier brechen das Update nicht ab.
4. `SPUREN_PW=… node tools/crypt.mjs encrypt data.json data.enc.json`, dann «Eingang aufräumen» wie im Nacht-Update (keine Sekundenreihen).
   Commit «Morgen-Update JJJJ-MM-TT» mit `data.enc.json` (und den Löschungen in `eingang/`), auf `main` pushen. Scheitert der Push: einmal
   `git pull --rebase`, erneut pushen. Gibt es dabei einen Konflikt in `data.enc.json`: `git rebase --abort`, `git reset --hard origin/main`,
   Schritte 1, 3 und 4 mit dem schon geschriebenen `work/new.json` wiederholen und pushen.
5. Schlägt Entschlüsseln, `merge_daily.py` oder auch der zweite Push fehl: nichts committen (`data.enc.json` bleibt unverändert) und Silas
   kurz informieren. Klappt alles: keine Nachricht.
Das Nacht-Update danach ersetzt dieselben Tage, Workouts und `workouts_neu` (nichts doppelt).

## Monatlicher Garmin-Export (FIT, volle Genauigkeit inkl. GPS-Spuren)
Silas lädt `UploadedFiles_0-_Part*.zip` hoch. Jedes ZIP in einen eigenen, leeren Ordner ausserhalb des Repos entpacken und (V6.5) unverändert
im privaten Archiv ablegen (Abschnitt «Archiv», Art `garmin-export`).
1. `python3 -I tools/classify.py <rohordner> work/files.json`
2. `python3 -I tools/parse_activities.py work/files.json work/acts_raw.json`
3. entschlüsseln, `python3 -I tools/import_export.py data.json work/acts_raw.json`.
   Die FTP-Probe (`ftp_est`, `ftp_e`, `ftp_dev`) bleibt wie zuletzt berechnet; neu nur mit `--ftp-neu`, wenn Silas das will.
   Neu je Aktivität: Zeitbegriffe `el mv st nst un rc ac us` (zeit-1.0); Stufentests aus den Sekundenwerten unter `stufen`;
   V5: `t0` (Start, Unix), `dr` (Drift 1./2. Hälfte), `sp` (Lauf-Abschnitte 0–5/5–10/10–20 min/Rest), ausdauer-1.0.
   Danach `python3 -I tools/migrate_v5.py data.json` (Schwellen neu, V5-Listen vorhanden).
   V5.3: `python3 -I tools/kalibrierung.py data.json --files work/files.json` (persönliche Zeitmodelle, Hold-out) und
   `python3 -I tools/bestleistungen.py data.json --files work/files.json` (Lauf-Bestleistungen). Fehlt `pdc` bei älteren Aktivitäten:
   `python3 -I tools/nachfuellen.py data.json work/acts_raw.json pdc`.
   V5.5: `python3 -I tools/entwicklung.py data.json --files work/files.json --nur-fehlende` (Blöcke `eb` für «Meine Entwicklung»).
   V5.6: `python3 -I tools/serien.py data.json --files work/files.json --nur-fehlende` (Reihen für den Explorer, Workout-Abgleich `wk`,
   Ermüdung `fr`; ändert nur diese drei Felder). Nach einer Regeländerung bei `wk`/`fr`: ohne `--nur-fehlende`, mit `--ohne-reihen`.
4. Prüfen: `python3 -I tools/check_referenz.py data.json --files work/files.json --raw-acts work/acts_raw.json`
   (Referenzsatz, Handwerte, Stufen, alle Aktivitäten). «GESAMT: bestanden» muss dastehen; sonst Silas die Liste zeigen.
5. verschlüsseln, dann `SPUREN_PW=… node tools/serien_crypt.mjs` (nur neue/geänderte Reihen; Reihen unter altem Namen werden auf die gid
   umbenannt; entfernt verwaiste, bricht das Löschen ab, wenn mehr als 5 % verwaist wären) und
   `SPUREN_PW=… node tools/serien_pruefen.mjs --git` («PRÜFUNG REIHEN: bestanden»), `data.enc.json` und `serien/` committen, pushen.

## Bilder (bilder/, V7.6.2, bilder-1.0, Silas' Wunsch vom 17.11.2026)
- Kopfbild der Einheit-Seite je Sportart aus Silas' eigenen Fotos (Schwimmen, Laufen, Rad, lange Ausfahrt, Wandern, Skitour). Die Fotos zeigen ihn, andere Personen,
  Startnummern oder Orte: darum **nur verschlüsselt** im Repository, nie als JPEG, nie in der Demo (die Demo zeigt das Symbol wie bisher).
- Format wie die Sekundenreihen (SPS2): AES-256-GCM mit dem Seitenschlüssel über «Länge | JPEG | Nullen», auf ein Vielfaches von 64 KiB aufgefüllt; Name = erste 24 Hex-Zeichen
  von SHA-256(«serien_salz:bild:<schlüssel>»). Welche Bilder es gibt und der Bildausschnitt (`pos`, «x% y%») stehen nur verschlüsselt in `config.bilder`.
- Neues oder anderes Bild: Foto in einen eigenen Ordner ausserhalb des Repos, zuschneiden (Querformat, höchstens 1600 px breit), EXIF entfernen (neu als JPEG speichern), dann
  `SPUREN_PW=… node tools/bilder_crypt.mjs schreiben <schlüssel>=<datei.jpg> …`, `config.bilder` über `work/new.json` `"config": {"bilder": {…ganze Liste…}}` und
  `merge_daily.py`, verschlüsseln, `node tools/bilder_crypt.mjs pruefen` («PRÜFUNG BILDER: bestanden»: entschlüsselbar, JPEG ohne EXIF, jede Datei mit Eintrag), committen.
  Schlüssel: Sportart (`schwimm`, `rad`, `lauf`, `wandern`, `skitour`, …), lange Ausfahrt `rad-lang`; fehlt ein Bild, zeigt die Seite das Symbol. Die Rohfotos nach dem
  Ablegen löschen; Archiv nur auf Silas' Wunsch.
- Die Seite lädt das Bild erst, wenn eine Einheit geöffnet wird (`js/v73-ui.js` `bildKey`/`bildLaden`, Blob-URL im Speicher); der Service Worker hält es wie die Reihen offline.

## Archiv (spuren-archiv, V6.5, archiv-1.0)
- Privates Repository `sileyhunter/spuren-archiv` (von Silas am 13.11.2026 angelegt) für Rohdaten, die nie ins öffentliche Repository gehören:
  Garmin-Exporte (ZIP), FIT-Dateien, Momentaufnahmen aus der Garmin-Verbindung (z. B. die Workout-Liste), Laktat-Tabellen. Die Seite liest es nie.
- Alles verschlüsselt mit `tools/archiv.mjs` (Format ARC1, Schlüssel aus dem Seitenpasswort mit eigenem Salz in `schluessel.json`, zufällige
  Dateinamen, Namen und Prüfsummen nur im verschlüsselten `index.bin`, Teile zu höchstens 40 MiB). Gleicher Inhalt nur einmal; nie ändern oder löschen.
- In einer Chat-Sitzung: `add_repo` (sileyhunter/spuren-archiv, push), nach `/home/claude/spuren-archiv` klonen, `SPUREN_PW=… node tools/archiv.mjs
  ablegen /home/claude/spuren-archiv <datei> --art <art> [--name …] [--notiz …]`, dann `pruefen` («PRÜFUNG ARCHIV: bestanden»), Commit «Archiv: …»,
  pushen (grosse Dateien Teil für Teil). Abgelegt werden: jedes hochgeladene Garmin-ZIP (Monatsexport und Datenexport, Art `garmin-export`),
  Laktat-Tabellen (`laktat`), gelegentlich die Workout-Liste (`garmin-workouts`). Nacht- und Morgen-Update fassen das Archiv nicht an.
- Nie Klartext ablegen; die Rohdateien bleiben ausserhalb beider Repositories in eigenen Ordnern und werden danach gelöscht.

## Garmin-Datenexport (Verlauf, V6.2.3, garmin-export-1.0)
Silas lädt Teile seines Garmin-Datenexports hoch (z. B. «Archiv.zip» mit `*_sleepData.json`, `*_healthStatusData.json`,
`TrainingReadinessDTO_*.json`). Gleiche Dateien nur einmal (Prüfsumme); jedes ZIP in einen eigenen, leeren Ordner ausserhalb des Repos entpacken
und (V6.5) unverändert im privaten Archiv ablegen (Abschnitt «Archiv», Art `garmin-export`).
1. `python3 -I tools/garmin_export.py lesen <ordner> [<ordner> …] work/garmin-verlauf.json` → Schlafdauer (Tief + Leicht + REM, ohne Wachzeit),
   Schlafwert, Stress im Schlaf (nicht OFF_WRIST/UNCONFIRMED) und Readiness nach dem Aufwachen (`AFTER_WAKEUP_RESET`; mehrere verschiedene
   Aufwach-Werte am selben Tag → Tag leer, nie geraten) und HRV aus dem Gesundheitsstatus. Am 13.11.2026 gegen die Daten der Garmin-Verbindung
   geprüft: Schlafdauer und Schlafwert gleich (1502 bzw. 1431 Nächte), HRV an 145 von 146 Tagen gleich; «HR» im Gesundheitsstatus ist der
   mittlere Puls im Schlaf, nicht der Ruhepuls (0 von 384 gleich) und wird nie übernommen. Ausgabe prüfen (Zeitraum, Anzahl je Feld, Stichproben).
2. Mit `SPUREN_PW`: entschlüsseln, `{"garmin_verlauf": <Datei>}` als JSON schreiben und mit `merge_daily.py` einspielen, verschlüsseln, pushen.
   Ohne Passwort (Normalfall im Chat): die Datei mit Datum im Namen an Silas senden; er wählt sie auf der Seite unter Einstellungen →
   «Garmin-Verlauf einlesen» (die Seite prüft sie, «Direkt speichern» bringt sie verschlüsselt nach `eingang/`), das nächste Update spielt sie ein.
3. `garmin_export.einspielen` füllt nur fehlende Felder (vorhandene Werte aus der Garmin-Verbindung bleiben; das Nachholen über die Verbindung
   überschreibt später mit den eigenen Werten), legt neue Tage an, setzt `config.days_backfill` nur, wenn er fehlt (auf den bisherigen Stand),
   und vermerkt den Import in `garmin_export` (ID = Inhalt, gleiche Datei nie doppelt) und im Audit. Nie die Rohdateien oder die Datei committen.

## Eingaben von der Seite (V5: Fueling, Befinden, Tests vom Handy, Koppelläufe, Pläne, B1)
**Seit V5.9.3 der Normalfall: «Direkt speichern»** (Abschnitt «Eingang»): Jede Eingabe geht verschlüsselt nach `eingang/`, Morgen- und
Nacht-Update spielen sie ein. Der Export bleibt der Rückweg (ohne Schlüssel, ohne Netz, anderes Gerät):
Auf der Seite erfasste Werte bleiben verschlüsselt auf dem Gerät, bis Silas «Exportieren» tippt und die Datei
`spuren-eingaben-….json` im Chat schickt (sie ist mit dem Seitenpasswort verschlüsselt). Einspielen:
1. Datei in einen eigenen Ordner ausserhalb des Repos kopieren, entschlüsseln: `SPUREN_PW=… node tools/eingaben.mjs <datei> work/eingaben.json`
2. `python3 -I tools/merge_daily.py data.json work/eingaben.json` (ersetzt Einträge mit gleicher ID, alte Fassung ins `audit`; nichts doppelt).
3. Enthält die Datei `laktat_bestaetigt` (Schritt B1), werden diese Vorschauen zu `lactate`. Danach `python3 -I tools/migrate_v5.py data.json`
   (rechnet `schwellen` neu) und `python3 -I tools/check_referenz.py …` laufen lassen.
4. Test-Entwürfe vom Handy (`test_entwuerfe`) sind nur Vorschau: mit der FIT-Datei über `tools/laktat_vorschau.py --extra` zuordnen, Silas zeigen.
5. verschlüsseln, nur `data.enc.json` committen, pushen.
Demo-Exporte (`"demo": true`) werden abgelehnt.
V5.5: Der Export enthält auch `pb` (offizielle Bestzeiten → `pb_offiziell`), `css` (CSS-Tests → `css_tests`, Zeiten von Hand, Korrektur
ersetzt mit Audit) und `fehler` (Fehlerboard → `fehlerboard`). `fueling_quellen` (geprüfte Garmin/FIT-Quellen, A15) nur nach einer neuen
Prüfung ersetzen; nie Einnahmen aus Garmin schätzen oder ergänzen. V5.7.2: Einnahmen aus Garmin nur aus dem Ernährungsprotokoll mit Uhrzeit
(`fueling-garmin-1.0`: nur Rad/Laufen ab 40 min, Tag stimmt mit den Tageswerten, Uhrzeit zwischen Start und Ende, erst danach erfasst); eigene Fueling-Einträge haben
Vorrang, auf der Seite bearbeitete Garmin-Einträge (`geaendert`) werden nie überschrieben.
V6.1 (notizen-1.0): Verpflegung aus der Garmin-Notiz einer Aktivität nur als Vorschau `fueling_vorschau` («fn-<gid>», Werte laut Notiz,
Summe gegen «Total»); zu `fueling` wird sie erst, wenn Silas den Eintrag auf der Seite speichert (kommt als `fueling_add` «fn-…» zurück).
Gibt es zur Einheit schon einen Fueling-Eintrag, entsteht keine Vorschau; nie aus der Notiz etwas ergänzen oder schätzen.
V5.6: zusätzlich `rpe` (→ `rpe`; seit V8.1 nachher-1.0 auch aus «Nach dem Training»: ID = Aktivität, dazu `gefuehl` (sehr schwach … sehr stark wie die Uhr),
`erwartung` leichter/wie erwartet/schwerer, `intervalle` alle/nicht alle/keine, `notiz`, `rpe_uhr`/`feel_uhr` = Vorschlag der Uhr; ältere Felder bleiben; nachher-1.1 (V8.1.1) ab 60 min ausser Schwimmen und Krafttraining auch `magen` ok/leicht/stark und
`energie` gut/nachgelassen/leer), `intervalle` (Korrekturen von Hand → `intervall_korr`), `laktat_punkte` (Laktat einem Abschnitt
zugeordnet → `laktat_punkte`, Status «vorschau») und `saison` (Stunden «jetzt»/«Spitze» → `saison_plan`); gleiche ID ersetzt mit Audit.
V5.7: `startorte` (ganze Liste → `startorte`, alte Fassung ins Audit) und `trainingsrouten` (gewählte Vorschläge → `trainingsrouten`, gleiche
ID ersetzt mit Audit). Startorte und Routen nur verschlüsselt (data.enc.json), nie offen ins Repository.
V6.6: `garmin_senden` (Auftrag «An Garmin senden» je Tag → `garmin_senden_add` → `garmin_auftraege` mit `status` «offen»; `garmin_senden.pruefen`:
ID «gs-<Datum>», modus senden/auto/aus, Tag vom Erstellen bis eine Woche voraus, Workouts nur Rad/Laufen/Schwimmen (1.1) mit bekannten Feldern; abgelehnte mit
Grund in `garmin_abgelehnt`; dieselbe oder ältere Fassung wird nie nochmals offen). `planwoche` (Mein Plan einer Woche → `planwoche_add` → `plan_woche`, eigenplan-1.0; `merge_daily.planwoche_pruefen`: Montag, ID «wo-<Montag>»,
Tage in der Woche, eindeutige Einheiten, Quelle vorschlag/eigen/bibliothek, Dauer 5–600 min, Tage vor der Änderung und gesperrte Tage unverändert
gegenüber dem Stand davor; gleiche Woche ersetzt mit Audit; V7.10 eigene-aktivitaet-1.0: Vorlage «eigen» mit `titel` 1–60 Zeichen, `sport` rad/lauf/schwimm/andere (bis V8.4 auch mobility), `rpe` 1–10). V6.2.2: `zonen` (auf der Seite bestätigte Zonenprofile → `zonen_add`, geprüft wie oben). V7.2: `verfuegbarkeit` (Zeit und Sportarten je Tag
«vf-JJJJ-MM-TT» oder je Wochentag «vf-wt-1…7», `entfernt` = zurücksetzen → `verfuegbarkeit_add` → `plan_verfuegbarkeit`; `merge_daily.verfuegbarkeit_pruefen`;
gleiche ID ersetzt mit Audit). V7.4: `ampel` (Entscheid der Ampel je Tag «aa-JJJJ-MM-TT» mit Ampel-Stand, Gründen, Morgenwerte ja/nein, Quelle seite/morgen-update
und optional `trotzdem` {an, am} → `ampel_add` → `ampel_anpassung`; `merge_daily.ampel_pruefen` wie `V74.pruefen`; je Tag ein Eintrag: Entscheid aus der neueren
Fassung, «Trotzdem» aus der zuletzt gedrückten, alte Fassung ins Audit). Mein Plan eigenplan-1.1: vergangene Tage einer Woche dürfen einmal mit `eingefroren: true` festgehalten werden (so, wie sie
gezeigt wurden), danach nie mehr geändert; `ganz: true` = ganze Woche gespeichert. V7.3 einheit-felder-1.0: je Einheit optional `uhrzeit` (hh:mm, 5-min-Schritte),
`gesperrt`, `metrik` (leistung/pace/puls/rpe), `drinnen`, `ein_min` (5–40, 5er-Schritte), `pausen` (0–100, 10er-Schritte, 50 = Vorlage); 1.1 (V7.5): `pool` (25/50,
nur Schwimmen, nicht Bibliothek) und `drinnen: false` bleibt (ausdrücklich draussen in einer Indoor-Phase; gespeichert wird nur, was von der Phase abweicht); geprüft mit
`merge_daily.einheit_feld_pruefen` (gleiche Regeln wie `V66.feldPruefen`); eine gesperrte Einheit wird nur entsperrt, nie verschoben, geändert oder entfernt. V6.4: `modell` (gewähltes Trainingsmodell
→ `modell_add` → `plan_modell`; `merge_daily.modell_pruefen`: bekanntes Modell (seit V8.5 auch «automatisch»), Wechsel als Datum; gleiche ID ersetzt mit Audit). V6.5: `planwahl`
(«Ich folge» je Tag → `planwahl_add` → `plan_wahl`; `merge_daily.planwahl_pruefen`: Datum, ID «pw-Datum», Wahl enduco/vorschlag/frei; gleicher Tag ersetzt mit Audit).
V7.5: `planeinstellung` (je Gruppe «pe-start» {art fitness/aufteilung} und «pe-basis-schwimm»/«-rad»/«-lauf» {wert: eigene Fitness 0–200 oder null} (V7.5.2, basis-1.1),
«pe-steigerung» {wert}, «pe-sportart» {art triathlon/rad/lauf} (V8.4.1 sportart-1.0, mit `vorher`), «pe-indoor-rad»/«pe-indoor-lauf» {von, bis}, «pe-schwimm» {hilfsmittel, pool, stile (ruecken/brust), anfaenger (V7.5.1), kurs_bis (letzter Kurstag oder null), kurs_nur (V7.6.2 kurs-1.0)} → `planeinstellung_add`
→ `plan_einstellungen`; `merge_daily.planeinstellung_pruefen` wie `V75.pruefen`; gleiche ID ersetzt mit Audit, eine ältere Fassung (`geaendert`) nie; «pe-basis» mit Stunden
aus V7.5 wird abgelehnt). V7.7 aktivitaet-plan-1.0: `aktivitaet` (Aktivität draussen je Tag «ak-JJJJ-MM-TT» {art skitour/wandern/langlauf/trail, min 60–600 in 15er-Schritten, zone z1/z2, uhrzeit, notiz ≤ 300}
oder {entfernt: true} → `aktivitaet_add` → `plan_aktivitaeten`; `merge_daily.aktivitaet_pruefen` wie `V77.pruefen`; gleiche ID ersetzt mit Audit, ältere Fassung nie).
V8.3 tagescoach-1.0: `tagescoach` (Entscheid zu einem Vorschlag «co-<Datum>-<Anlass>-<Einheit>» {status angenommen/abgelehnt/zurueck, am, date, anlass, titel; angenommen
mit art, woche (Montag), option, rueck (Änderungen für V66.aendern), markiert} → `tagescoach_add` → `coach_entscheide`; `tagescoach.pruefen` wie `V83.eintragPruefen`; gleiche ID:
der spätere Zeitpunkt gilt, alte Fassung ins Audit). Die Änderung an Mein Plan kommt dabei als `planwoche` (geprüft wie jede).
V8.1.1 verpflegung-1.0: `verpflegung` (Anpassung je Einheit «vp-<Datum>-<uid>» {g_h 0–120 in 5er-Schritten, mix auto/gel/getraenk/fest, aus} oder {entfernt: true} = zurück
auf die Empfehlung → `verpflegung_add` → `plan_verpflegung`; `verpflegung.pruefen` wie `VP.pruefen`; gleiche ID ersetzt mit Audit, ältere Fassung nie) und «pe-verpflegung»
in `planeinstellung` {unterwegs, davor, danach, fruktose: Listen von Produkt-IDs aus `garmin_lebensmittel` bzw. den Fueling-Vorlagen (höchstens 60, ohne Doppel), max_g_h
30–120 in 10er-Schritten; gilt sofort, ohne `vorher` – die Listen heissen davor/danach, weil `vorher` in den Planeinstellungen die Fassung der laufenden Woche trägt}.
V7.6 kraft-plan-1.1: «pe-kraft» {aktiv, modus auto/fest (ohne = fest), tage 1–7 je einmal (auto), wt 1–7 (fest), uhrzeit, dauer 15–180 in
5er-Schritten, notiz ≤ 500} und «pe-kraft-<Montag>» {aus und/oder tag dieser Woche, uhrzeit; entfernt = wieder die Regel}; V7.6.1 «pe-lang» {rad, lauf: Wochentage 1–7 je
einmal, leer = keine Vorliebe}; «pe-start», «pe-basis-…», «pe-kraft» und «pe-lang» tragen optional `vorher` = die Fassung, die in der Woche des Speicherns
noch gilt (gleiche Regeln, mit `geaendert`, ohne eigenes `vorher`) – sie gelten ab der nächsten Woche, und `plan_einstellungen` behält je ID nur die neueste Fassung.
`rpe` mit ID «kraft-<Datum>» (sport «kraft», min, srpe, quelle garmin/plan) wie jedes RPE; die Kalibrierung rpe-1.0 lässt es aus. V6.2.3: `garmin_verlauf` (Datei aus
`tools/garmin_export.py`, auf der Seite gewählt → `garmin_export.einspielen`, nur fehlende Tageswerte; mehrere Dateien vor einem Update werden seit
V6.4.4 alle eingespielt, `garmin_verlauf` darf eine Liste sein). V5.9.3: `routen` (im Planer gespeicherte Routen → `routes`, gleiche ID ersetzt mit Audit), `routen_entfernt` (auf der Seite gelöscht → aus
`routes` entfernt, alte Fassung ins Audit), `laktat_punkte_bestaetigt` («Laktat hier» aus dem Explorer auf der Seite bestätigt → Kurzcheck in
`lactate`, Quelle «aus Explorer», Punkt «übernommen»; übernommene Punkte werden nie wieder «vorschau»). Befinden kommt aus dem Morgen-Check-in
(`befinden-2.0` seit V6.3: Schlaf → `schlaf`, Energie → `muede`, Beine → `muskel`, Kopf → `stress`, je 1–7 mit `skala: 7` (1 = sehr gut,
4 = durchschnittlich, 7 = sehr schlecht); dazu `krank`, `notiz`; gleicher Tag ersetzt mit Audit. **befinden-2.1 (V8.1):** dazu Motivation → `motivation` (1–7, auf der Seite
Pflicht, im Eintrag optional) und Schmerzen → `schmerz` {`stufe` leicht/deutlich, `ort` [Fuss, Achilles/Wade, Schienbein, Knie, Hüfte/Leiste, Oberschenkel, Rücken, Schulter,
anderes]}; ohne Schmerzen kein Feld. Ältere Einträge `befinden-1.1` (drei Fragen, 1–5,
ohne `skala`) bleiben unverändert; gerechnet wird mit dem Anteil auf der eigenen Skala, `V59L.befindenAnteil`).

## Eingang (eingang/, V5.9.3 «Direkt speichern», eingang-1.0)
- Die Seite legt jede Eingabe als `eingang/<JJJJMMTT>T<hhmmss>Z-<8 Hex>.bin` an (GitHub-Contents-API, Commit «Eingang»). Format EGS1:
  «EGS1» | IV | AES-256-GCM(Länge | gzip(JSON) | Nullen) | Tag, Seitenschlüssel wie data.enc.json, Datei auf eine Zweierpotenz ≥ 16 KiB
  aufgefüllt. Öffentlich sichtbar bleibt nur, dass und wann eine Eingabe kam. Bestätigungen (Laktat B1, Explorer) kommen in eine eigene Datei.
- Zugang: feingranularer GitHub-Schlüssel nur für sileyhunter/spuren, «Contents: Read and write», bis 1 Jahr gültig (E4; Expiration «Custom», notfalls 90 Tage – eine Auswahl «1 Jahr» gibt es bei GitHub nicht). Er liegt mit dem
  Seitenschlüssel verschlüsselt auf dem Gerät (`sf.eg.schluessel`), nie im Repository, nie im Chat. Ohne Netz oder Schlüssel wartet die Eingabe.
- Nur Morgen- und Nacht-Update löschen Dateien in `eingang/`, und nur die eingespielten (`tools/eingang.mjs aufraeumen`). Abgelehnte Dateien
  (Demo, fremd, nicht entschlüsselbar) bleiben liegen und werden gemeldet. `tools/eingang.mjs pruefen --git`: nur gültige, aufgefüllte EGS1-Dateien.

## Laktatschwellen und Zonen (V5)
- `tools/schwellen.py`: LT1 = SOMC (letzte Stufe vor Anstieg ≥ 0,4), Basis + 0,5 (Basis = Mittel der ersten drei Stufen), log-log (≥ 6 Stufen);
  LT2 = Dickhuth; mod. Dmax und Dmax nur bei ausbelastetem Test. 2/4 mmol/l nur Orientierung, nie LT. Keine Extrapolation.
  Unsicherheit: 4000 Simulationen, Messfehler max(0,15 mmol/l; 7,5 %), je Test eigene Zufallsfolge. Puls an der Schwelle aus FIT (30 s vor der Entnahme).
- Nach jeder Änderung an Laktatwerten: `python3 -I tools/migrate_v5.py data.json` (rechnet `schwellen`, legt fehlende V5-Listen an, Sicherung in
  `work/backup/`, Rückweg mit `--rollback <datei>`). `check_referenz.py` prüft die Schwellen gegen `referenz.schwellen_soll`.
- Zonenprofile (`zonen`) sind versioniert und werden **nie** ohne Silas' Freigabe aus LT1/LT2 gesetzt. Neue Version nur über `"zonen_add"` mit
  `freigabe.datum`; die alte wird «ersetzt». Aktiv: «Zonen vom 23.10.2026» (in Garmin eingetragen).
- **V6.2.2 Zonen-Vorschlag (zonenvorschlag-1.0, `js/v62.js`):** aus dem neuesten Stufentest je Sportart: Z2/Z3 = LT1, Z3/Z4 = LT2 (Mitte der
  gültigen Methoden oder gewählte Methode, Puls an der Schwelle aus FIT); Z1/Z2 und Z4/Z5 im Verhältnis der Skala nach Tønnessen et al. 2024
  (0,81/1,07 × bei Leistung und Tempo, 0,88/1,06 × beim Puls). Bestätigen nur bei bestätigtem Test (B1): die Seite legt ein Profil mit Freigabe
  an (`Inbox.data.zonen` → «Direkt speichern» → `zonen_add`). `merge_daily.py` prüft es (`zonen_pruefen`: Freigabe, lückenlose und geordnete
  Grenzen, Test in `schwellen.tests` bestätigt); Ablehnungen mit Grund in `zonen_abgelehnt` (die Seite zeigt sie). Nach einer Übernahme
  Silas daran erinnern, die Grenzen in Garmin/enduco einzutragen, und die Zonen in den Aufträgen Morgen-Briefing und Abend-Check nachführen.
  Nie Zonen nach Garmin schreiben.
- Zonenverteilung «Mache ich das Richtige?» nutzt die Pulsgrenzen des aktiven Profils (ab dessen Gültigkeit), davor die Garmin-Zonen.

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

## Einheit als Seite (V7.3, einheit-2.0, schritte-1.0)
- Jede Einheit aus Mein Plan (Kalender, Tagesblatt, Heute, Woche nach Modell) und jedes Bibliotheks-Workout öffnet als ganze Seite (`V73UI.plan(ds, uid,
  { zurueck })`, `V73UI.workout(p, opt)`); `V66UI.einheit` und `V6H.einheitP` leiten dorthin, das alte Blatt bleibt nur als Rückfall. Die Seite liegt unter den
  Blättern (`#v59-ov`): Auswahl, Bestätigung und Erklärung kommen als Blatt von unten (`V59.blatt`); «Zurück» schliesst die Seite und ruft `zurueck()`
  (z. B. Tagesblatt wieder auf). Wissen-Links schliessen die Seite (`V64UI.oeffneWissen`).
- Schritte nur aus den Abschnitten der Einheit ableiten (`V73.ausTeilen`, `V73.ausSchwimm`, `V73.ausWorkout`) – nie eigene Zeiten oder Zonen erfinden; neue
  Vorlagen brauchen nur `teile`, Blockname und Anweisung kommen aus `js/v73.js` (Texte eigen, keine Zahlen). Regel ändern = Version in `V73.VERSIONS` und
  `tests/test_v73.cjs` nachführen.
- Änderungen nur über `V66UI.aendern` (Mein Plan) bzw. `V66UI.einheitSenden` (Export); vergangene Tage nur lesen, gesperrte Tage und Einheiten wie oben.
- Farben nur über Variablen bzw. `V6.ZONEN`; neue Symbole in `V6.ICON`.

## Planeinstellungen (V7.5, planeinstellungen-1.0, Etappe 3 des Auftrags V7.3, freigegeben am 17.11.2026; V7.5.1 nach dem Auftrag nachgebaut)
- Ein Blatt als Folge wie die Vorlage: Laufen → Rad → Schwimmen → Trainingsumfang (unten «‹», «Weiter», auf dem letzten «Fertig ✓»; `V75UI.flow`), geöffnet über
  Plan → «Plan verwalten» (zuoberst), das Profil (Training; «‹» auf dem ersten Blatt zurück ins Profil), die Wochenstunden («Trainingsumfang ändern», direkt beim
  letzten Blatt) und den Link `#plan-einstellungen` (Plan mit dem Blatt). Vorbild die Planeinstellungen von enduco (Aufbau und Antippen; Texte, Symbole und Grafiken
  eigen). Jede Auswahl wird beim «Übernehmen» gespeichert, der Anfänger-Modus beim Umschalten, die Steigerung mit «Fertig ✓» (über «Direkt speichern», Eingabe
  `planeinstellung`); ohne Eintrag gilt der Standard = Verhalten bis V7.4.
- **Basis-Fitness (basis-1.1, Variante A, von Silas gewählt am 17.11.2026, «20/50/30 soll wählbar bleiben»):** im Ring die Fitness je Sportart (42-Tage-Mittel ihrer
  Last mit `config.load_model`) am Montag der Woche, also bis zum Sonntag davor (`V75.basisDaten`) – damit sich eine Woche unter der Woche nicht ändert. Start je
  Sportart = 7 × Fitness ÷ Last pro Stunde der Sportart (Last ÷ Bewegungszeit der 8 abgeschlossenen Wochen, unter 1 h die 52 Wochen davor), höchstens 30 h; ohne
  Last pro Stunde «jetzt» × Anteil. Eigener Wert je Sportart (Regler 0–200, «Zurück auf berechnet», Datum der Änderung). Wahl im Trainingsumfang: «Basis-Fitness»
  (Standard ab der Woche vom 23.11.2026, `V75.START_AB`) oder «jetzt» × 20/50/30 wie bis V7.5.1. Start und eigene Fitness gelten ab der Woche nach dem Speichern
  (`V75.einstellungen` opt.startBis): die laufende Woche bleibt, ab der nächsten rechnet die Rampe vom neuen Start (`V75UI.plan` für Kurve und Wochenstunden).
  «jetzt» steht in den Wochenstunden nur, solange ein Start mit 20/50/30 gilt. **basis-1.2 (V8.3, Datenstand):** liegen die letzten Garmin-Daten (`V75.datenBis`: mit
  `fit_log` die letzte Nacht bzw. Aktivität, sonst die letzte Aktivität oder Morgenwerte) vor dem Sonntag, gilt die Fitness vom letzten Tag mit Daten (`basisDaten(…, { datenBis })`,
  `luecke`) – fehlende Daten zählen nicht als Ruhetage.
- **Steigerung (steigerung-1.0):** ein Regler für alle drei Sportarten (Silas' Wunsch), 50–150 % in 5er-Schritten. Jede Sportart von der Basis zu Spitze ×
  aufteilung-1.0; Anteil des Wegs nach i Wochen min(1, Regler · i/(N − 1)), N = Wochen bis zum Taper; 100 % = genau saison-1.2. Höchstens 10 % (mindestens 0,5 h)
  über der Woche davor (eigene Festlegung, wie das Maximum bei enduco). Woche 0 bleibt die Basis; Erholung 65 %, B-Rennen 50 %, Taper 60/40 % unverändert.
  Vergangene Wochen (vergleich-1.4) mit den Einstellungen, die vor ihrem Montag gespeichert waren (`V75.einstellungen` opt.bis). Je Bereich ein Wort und eine Farbe
  (`V75UI.STUFEN`, eigene Worte): sanft 50–70, ausgewogen 75–110 (100 = Standard), zügig 115–125, steil 130–140, maximal 145–150 %; Kurve bis zum Hauptrennen
  (Belastungswochen ohne Erholungs-Dellen, Taper, Achse ab 0 h) mit dem Bereich 50–150 %, live beim Ziehen; Sperrzonen an beiden Enden des Reglers.
- **Indoor-Phase (indoor-phase-1.0):** je Rad und Laufen ein Zeitraum (höchstens ein Jahr). Einheiten ohne eigene Wahl (`drinnen_fest`) gelten dort als drinnen –
  angewendet in `js/v64-ui.js` nach Mein Plan und vor der Ampel (lockere Fassung und Garmin-Auftrag bleiben drinnen). Dauer und Inhalt bleiben; Bibliothek bleibt.
- **Schwimmkurs (V7.6.2, kurs-1.0):** Zeile «Schwimmkurs (Dienstag)» auf der Seite Schwimmen: letzter Kurstag (Datum, leer = läuft weiter) und «An Kurstagen nur Schwimmen».
  `V64.woche` setzt nach dem letzten Kurstag lockeres Schwimmen statt des Kurses; `V66.mitKurs` macht Kurs-Dienstage zu reinen Schwimmtagen (Zeit des Tages bleibt;
  «Kein Training» oder eine Verfügbarkeit ohne Schwimmen gehen vor). Gilt sofort (kein `vorher`), wie die übrigen Schwimm-Einstellungen.
- **Schwimmen:** Equipment (Brett, Pullbuoy, Flossen, Paddles), Standard-Bahnlänge (25/50; vorher je Gerät `sf.sw.becken`, das als Rückfall bleibt), Anfänger-Modus
  (Schalter), Stile neben Kraul (Rücken, Brust; Kraul immer; Standard Rücken wie bisher; Delfin plant die Seite nicht) → schwimmeinheit-1.2: je Woche ein gewählter Stil
  (abwechselnd) als eigener Teil am Ende des Ein- und Ausschwimmens, ganze Bahnen, auf der Uhr mit diesem Stil (garmin-senden-1.2). Je Einheit die Bahnlänge auf
  der Einheit-Seite (einheit-felder-1.1 `pool`). Vorbelegt am 17.11.2026 aus Silas' Enduco-Einstellungen (Bildschirmfoto): 50 m, Kraul und Brust, alle vier Hilfsmittel.
- Nach dem Speichern rechnen Plan, Kalender und Heute neu (Ereignis «meinplan»); offene Garmin-Aufträge dieser und der nächsten Woche werden abgeglichen
  (`V66UI.auftraegeAbgleichen`). Nichts davon geht an Enduco. Regel ändern = Version in `V75.VERSIONS`, Wissen (Kapitel «planeinstellungen») und `tests/test_v75.cjs`.
- **Sportart (V8.4.1, sportart-1.0):** «Allgemein → Sportart»: Triathlon (Standard, wie bisher), «Nur Rad» oder «Nur Laufen» – ab der nächsten Woche. Nur Rad/Laufen: Stunden aus dem Training
  dieser Sportart («jetzt», Spitze, Basis-Fitness), Woche mit 3–6 Einheiten (Rad 3/4/5/6 unter 4/7/10 h bzw. ab 10 h, Laufen unter 3,5/5/7 h bzw. ab 7 h): Mo frei, Di Schlüssel des Modells, Do zweite
  Schlüsseleinheit ab 6 h Rad bzw. 4,5 h Laufen (`V64.SCHLUESSEL2`: polarisiert eine andere VO2max-Form, pyramidal Tempo, mit Laktat Schwelle bzw. Tempo, rennspezifisch VO2max), lange Einheit
  Sa (Rad) bzw. So (Laufen) mit 1,6- bzw. 1,4-mal dem Anteil einer lockeren (höchstens `V64.LANG`), lockere Rad 45–150 min, Laufen 30–75 min, nie länger als die lange; Erholungswoche Rad eine
  Schlüsseleinheit, Laufen alles locker; Aufbau-Grenze wie bisher; Rest gemeldet. Tests nur der Sportart (kein CSS-Test, kein Rad-Kurzcheck beim Laufen), kein Schwimmkurs, keine Koppelläufe. Alles
  eigene Festlegungen (Wissen, Kapitel «planeinstellungen»). Regel ändern = Version in `V64.VERSIONS`, Wissen und `tests/test_v64.cjs`, `tests/test_v75.cjs`, `tests/test_v62.cjs`.
- **Allgemein (V7.6.1, verfuegbarkeit-1.1, Vorbild «Allgemeine Planeinstellungen» von enduco, Texte eigen):** erste Seite der Folge (sechs Blätter: Allgemein → Laufen →
  Rad → Schwimmen → Krafttraining → Trainingsumfang). «Trainingsverfügbarkeit»: alle sieben Wochentage in einem Blatt (`V66UI.verfuegbarkeitWoche`, auch aus dem Tagesblatt
  «Trainingsverfügbarkeit der ganzen Woche»): Schalter Kein Training, Sportarten (mindestens eine), Zeit in 15-min-Schritten bis 10 h, ganz rechts «offen»; «Fertig» speichert
  je geänderten Wochentag «vf-wt-N» (offen mit allen Sportarten = entfernt), die laufende Woche wird vorher einmal festgehalten, danach wie im Tagesblatt «Anpassen»,
  «Neu berechnen» oder «Nur speichern». «Tage für lange Einheiten» (`pe-lang`, ab der nächsten Woche): Empfehlung beim Verteilen (+80 am gewählten Tag, −20 an anderen);
  eine lange Einheit verlässt ihren Tag nur, wenn ein gewählter Tag Sportart, Zeit und keine harte Einheit an Land hat, sonst bleibt sie und die Woche meldet es; hart und
  lang an Land am selben Tag −120 (bis 1.0 −40). Verschieben trägt einen Grund (Verfügbarkeit, Tag für lange Einheiten, Tag nach dem Krafttraining).
  **verfuegbarkeit-1.2 (V8.1, Silas am 18.11.2026: «entscheide, was trainingstechnisch mehr Sinn macht»):** harte Einheiten an Land (Rad, Laufen) nie an zwei Tagen
  hintereinander – beim Verteilen −100 je Seite (Wasser derselben Sportart −20), danach wird eine von zwei benachbarten harten Einheiten auf einen Tag ohne harte oder lange
  Einheit an Land daneben verschoben (Grund «nicht zwei harte Tage hintereinander»); geht das nicht, meldet es die Woche. kraft-plan-1.2: braucht der automatische Krafttag
  ein Neuverteilen, das zwei harte Tage hintereinander ergäbe, nimmt die Seite einen Tag, an dem das Krafttraining ohne Verschieben passt.
  **Übernommen am 17.11.2026 aus Silas' Enduco-Einstellungen (Bildschirmfotos) und seiner Nachricht:** Mo kein Training, Di nur Schwimmen (Schwimmkurs bis Dezember), Mi–Fr 2:45 h,
  Sa und So 5:00 h; lange Ausfahrt Sa/So, langer Lauf Do (wie Enduco); Krafttraining automatisch ohne Do. **Seit 17.11.2026 (V7.6.2, Silas: «offene Punkte bereinigen»):** Di 2:45 h
  mit allen Sportarten und «An Kurstagen nur Schwimmen» (kurs-1.0; letzter Kurstag am 18.11.2026 von Silas genannt und eingetragen, nur verschlüsselt; danach gilt der
  Dienstag ohne weiteres Zutun wieder für alle Sportarten); langer Lauf So (am Do war neben Rad-Schlüssel und CSS kein Platz, die Woche meldete es jede Woche).
- **Krafttraining (V7.6, kraft-plan-1.1, Etappe 7; Regeln von Silas am 17.11.2026 freigegeben):** Seite zwischen Schwimmen und Trainingsumfang, Blatt `V75UI.kraft` (auch aus
  dem Tagesblatt und der Einheit-Seite): an/aus, Tag «Automatisch» (mögliche Tage; Silas: alle ausser Do, dort schliesst der Kraftraum früh) oder «Fester Tag» (Wochentag),
  Uhrzeit (oder ohne), Dauer 15–180 min (Standard 1:30 h), Notiz für die Übungen (die Seite plant keine Übungen). Gilt ab der Woche nach dem Speichern (`vorher` hält die
  laufende Woche fest). Einheit «Krafttraining» (`kraft_plan`, `kraft_auto`) im Wochenvorschlag: nicht in den Wochenstunden, nicht in TL ≈, Fitness, Form und Ampel-Last
  (pmc-2.1), nicht an Garmin; belegt beim Verteilen seine Zeit. **Regeln:** (1) am Tag danach keine harte Rad- oder Laufeinheit (umziehen, sonst locker, gemeldet); (2) am
  Krafttag darf eine harte Einheit bleiben (Kraft danach, Hinweis unter 6 h Abstand), eine lockere Einheit an Land aus dem Vorschlag höchstens 60 min (`V76.abstimmen`, nach
  dem Verteilen), lange Einheit nur Hinweis; (3) belegt Zeit, zählt nicht; (4) nicht am Test- und am Vortag (fest: einen Tag früher, sonst fällt es aus); (5) keine Kraft in
  Rennwochen, im Taper des A-Rennens nur 7–10 Tage davor mit zwei Dritteln; (6) Erholungswoche zwei Drittel; (7) «vorsichtig»: bleibt (die Ampel holt am Tag danach keine
  harte Rad- oder Laufeinheit nach); (8) sRPE = RPE × Minuten als eigene Zahl; (9) nicht an Garmin. **Automatisch:** jeder mögliche Tag (nicht «Kein Training», nicht gesperrt,
  nicht test-nah, im Taper nur im Fenster) wird an der schon verteilten Woche bewertet (`V76.bewerten`, eigene Gewichte: Tag danach hart an Land −100, lang −10; am Tag lang
  −50, hart −5, locker bis 60 min +10, länger −20; Zeit reicht nicht −30 und −5 je 15 min, höchstens −80); passt es dort (`V76.passt`), bleibt die Woche, sonst neu verteilt.
  Aufgezeichnete Garmin-Krafteinheiten (Typ «Krafttraining»/«Strength») zählen seit pmc-2.1 nicht mehr in Fitness und Form; sie stehen in «Diese Woche» und in der
  Wochenauswertung als eigene Zeile. «Nur diese Woche» auf der Einheit-Seite: in kommenden Wochen, deren Tage dem Vorschlag folgen, als Ausnahme «pe-kraft-<Montag>»; in der
  laufenden Woche und an gespeicherten Tagen über Mein Plan (verschieben, entfernen). Regel ändern = Version in `V76.VERSIONS`, Wissen (Kapitel «kraft») und `tests/test_v76.cjs`.

## Täglicher Coach (V8.3, tagescoach-1.0, Masterprompt V8 Abschnitte 2, 9, 10; von Silas am 18.11.2026 freigegeben)
- Der Coach rechnet bei jedem Zeichnen neu (nach Morgen-Update, Check-in, neuer Einheit, geänderter Verfügbarkeit) über gestern bis sechs Tage voraus, wie es gilt
  (`V64UI.kontextFuer`: Mein Plan mit Verteilung, Kraft, Aktivitäten draussen und Ampel-Schicht). Vier Prüfungen (eigene Festlegungen, Wissen Kapitel «coach»):
  **morgen** (einzelner Morgen: HRV ≥ 10 % bzw. 2 × tägliche Schwankung tiefer UND Ruhepuls ≥ 5 bzw. 2 × höher als die 7 Tage davor, oder einer allein stark 20 %/8 bzw. 3 ×;
  nur solange die Ampel nicht «vorsichtig» zeigt) → harte Einheit an Land heute oder morgen; **last** (gestern oder heute ≥ 1,3 × und +15 über TL ≈ oder hart nach Puls, wo locker
  geplant; ohne Pulsverteilung Last ≥ 75 je Stunde) → harte Einheit an Land am Tag danach; **zeit** (festgehaltener Tag über der Verfügbarkeit + 5 min) → Kurzfassung derselben
  Sportart (längste bewegliche Einheit gekürzt, sonst locker; übrige bewegliche weg; feste – gesperrt, Test, Kurs, Kraft, draussen – bleiben, füllen sie die Zeit: nur Hinweis);
  **nachholen** (ampel-plan-1.2) → Schlüsseleinheit an Stelle der lockeren am vorgeschlagenen Tag. Optionen: tauschen (mit der lockeren derselben Sportart an einem späteren Tag
  der Woche, Regeln wie das Nachholen der Ampel), locker (`V74.locker`), kurz, nachholen.
- Nie: gesperrte Tage oder Einheiten, Tests, Rennen, Schwimmkurs, vergangene Tage, heute schon absolvierte Sportart; nie härter oder länger als Mein Plan. Abgelehnte und
  zurückgeholte Vorschläge (gleiche ID) kommen nicht wieder. Annehmen = `V66UI.aendernFolge` (Mein Plan, offene Garmin-Aufträge nachgeführt) + Entscheid; Rückgängig = Rückweg,
  solange kein betroffener Tag vorbei ist. Geänderte Einheiten tragen «Coach» (Tagesblatt, Heute, Kalender).
- Probelauf bis `config.enduco_bis` (2026-11-30, Silas trainiert bis Ende November mit Enduco): Hinweis auf der Karte; danach gilt nur noch Mein Plan. Selbst handelt der Coach
  nicht – Automatik erst nach Silas' Okay und nur in Grenzen, die er setzt. Regel ändern = Version in `V83.VERSIONS`, Wissen (Kapitel «coach») und `tests/test_v83.cjs`.
- **tagescoach-1.1 (V8.4, Silas am 18.11.2026: «lange Einheiten, wenn die Verfügbarkeit reicht – mit der Laufentwicklung aufpassen», «eine Verletzung, die die Laufkilometer
  bremst», «Folgewochen dürfen angepasst werden»):** drei neue Anlässe (`V83.ANLASS`): **ausgefallen** (Schlüsseleinheit von gestern ohne Aktivität derselben Sportart →
  an Stelle einer lockeren an einem der nächsten Tage, auch nächste Woche, nie in Erholungs-, Taper- oder Rennwoche, keine harte derselben Sportart innert 2 Tagen);
  **umfang** (`V83.UMFANG`: ab 20 fehlenden Minuten einer Sportart in der laufenden Woche eine kommende lockere oder lange Einheit verlängern, höchstens um das Fehlende, die
  Hälfte ihrer Dauer, die Verfügbarkeit, `V64.LANG` der Phase und beim Laufen die Aufbau-Grenze mit Distanz ≈ aus `V64.kmSchaetzung`; ohne Distanz kein längerer Lauf;
  Nachgeholtes zählt nicht doppelt) – damit ist «nie länger als Mein Plan» je Einheit aufgehoben, die Woche bleibt bei Mein Plan; **schmerz** (`V83.SCHMERZ`: Schmerzen an
  Beinen oder Füssen im Check-in von heute → leicht: Läufe der nächsten 3 Tage locker und 70 %; deutlich: heute und morgen weglassen oder Rad locker statt Laufen; an 3 der
  letzten 5 Tage die ganze Woche mit Rat zur Abklärung). Tauschen und Nachholen auch in die nächste Woche (`entfernen` + `hinzufuegen` statt `verschieben`); die Seite prüft
  erst alle betroffenen Wochen (`V66UI.aendernFolge(mo, aktionen, { trocken: true })`) und speichert dann je Woche (`V83UI` `anwenden`), Rückgängig ebenso.

## Modell «Automatisch» (V8.5, automatisch-1.0, Masterprompt V8 Abschnitt 6; von Silas am 18.11.2026 freigegeben)
- Sechstes Modell unter Plan → Trainingsmodell; der Standard bleibt «kombiniert» (Silas' Wahl), «Automatisch» gilt erst, wenn er es übernimmt. Startet wie «kombiniert» (polarisiert bis
  zum Wechsel, danach rennspezifisch; der Wechsel ist wählbar wie dort) und entscheidet je Woche, jede Wahl mit Grund (Box `#mo-auto`, auch als Vorschau bei anderem Modell):
  **Verteilung** (nur in polarisierten Wochen): pyramidal (Rad Schwelle statt VO2max, Laufen bleibt), wenn «Verteilung und Entwicklung» klar zeigt, dass mehr Anteil hart mit schlechterer
  oder mehr Anteil mittel mit besserer Rad-Effizienz im Block danach einherging (verteilung-1.1: mindestens 3 der 4 Einteilungen der Blöcke); gewechselt wird nur zu Beginn eines Blocks
  (Daten bis zum Sonntag davor, `V85.stichtag`). **Harte Einheiten an Land:** höchstens die Vorlage (Triathlon zwei, Erholungswoche eine, Rennwoche keine; nur Rad/Laufen wie
  sportart-1.0); eine weniger, wenn an mindestens 3 der 7 Tage vor dem Montag die Ampel «vorsichtig» oder krank zeigte, der Trainingsstatus am Montag ab 1,5 liegt, Wochen mit so vielen
  harten Einheiten bei ihm mit schlechterer Erholung einhergingen («Was du bisher verträgst», `dim.harte.ab`) oder die Woche (Triathlon) unter 5 h hat. Dann wird der harte Lauf locker
  (gleiche Dauer), das Rad bleibt; nur Rad/Laufen: keine zweite Schlüsseleinheit. Erholungswoche, Taper und Rennwoche wie die Vorlage. Kommende Wochen: Ermüdung «zeigt sich am Montag».
- Nie mehr als die Vorlage, nie mehr Stunden: gute Erholung macht nichts härter (Test C3). Intensität je Sportart und Mein Plan gelten weiter; gespeicherte Wochen behalten ihre Einheiten.
  Vergangene Wochen (Vergleich) mit ihrem eigenen Stichtag. Grenzen und Reihenfolge sind eigene Festlegungen (Wissen, Kapitel «modelle»). Nichts davon geht an Garmin oder Enduco,
  ausser über die gewohnten Aufträge. Am 19.11.2026 mit echten Daten geprüft (Ergebnis nur im Chat). Regel ändern = Version in `V85.VERSIONS`, Wissen und
  `tests/test_v85.cjs`, `tests/test_v80.cjs`.

## Verpflegung je Einheit (V8.1.1, verpflegung-1.0, Silas' Wunsch vom 18.11.2026; 1.1 = V8.1.2 nur seine Produktgruppen; 2.0 = V8.4 kurz und bündig)
- **verpflegung-2.0 (Silas am 18.11.2026: «zu kompliziert, so füll ich das nie aus – Vorschlag g/h, ich entscheide, wie ich sie aufnehme; kurz und bündig»):** auf der Einheit-Seite
  nur noch g/h gross, Menge für die Einheit, «ab Minute 20, dann alle 20–30 min», je eine Zeile «Vorher» (lange oder harte Einheit) und «Nachher» (nur rasch auffüllen vor der
  nächsten harten oder langen Einheit in weniger als 8 h); keine Produkte, kein Zeitplan, keine Packliste in der Oberfläche (`VP.knapp`; die Produktlogik bleibt im Modul für
  den Vergleich, wird aber nicht gezeigt). Über 60 g/h kein Deckel mehr, nur der Hinweis «Glukose und Fruktose zusammen». «Anpassen»: g/h dieser Einheit, «Diesmal ohne» und die
  Stufe ab 2,5 h (`pe-verpflegung` `max_g_h`). Die Absätze unten zu Produkten gelten nur noch für die Rechnung im Hintergrund.
- Je Einheit aus Mein Plan eine Empfehlung vorher · während · nachher (`VP.plan`), nur mit Silas' eigenen Produkten: eigene Lebensmittel aus Garmin Connect
  (`garmin_lebensmittel`, Nacht-Update) und die Fueling-Vorlagen. Nährwerte nur wie dort eingetragen, nie geschätzt oder ergänzt; ohne passende Produkte nur Gramm
  Kohlenhydrate. Welche Produkte wofür (unterwegs, vorher, nachher) und welche aus Glukose und Fruktose sind, wählt Silas auf der Seite («Produkte für die Verpflegung»);
  **verpflegung-1.1 (Silas am 18.11.2026: «nicht zu viele Lebensmittel»):** ohne Wahl nur seine Gruppen (`VP.GRUPPEN`, `VP.imSet`): unterwegs Gels, Fruchtgummi
  (Art «gummi», z. B. Haribo), Kohlenhydrat-Getränke und Bananen; vorher Banane, Hafer-Riegel und Hafer-Getränk (Art «hafer», z. B. Instant Oats, als Beispiel für die
  Mahlzeit); nachher Whey und Hafer (Beispiel zum Auffüllen); andere eigene Lebensmittel (Apfel, Honig …) nur mit eigener Auswahl; was im Fueling-Protokoll vorkommt zuerst.
  Während höchstens zwei Produktarten je Einheit, Frucht nach Gewicht höchstens 200 g; Wanderung, Skitour, Langlauf (Sport «wandern»/«ski», nicht Traillauf) zuerst
  Riegel, dann Fruchtgummi bzw. Gel, und höchstens 30 g/h in Z1 bzw. 45 g/h in Z2 (eigene Festlegungen, niedrige Intensität).
- **Was er genommen hat:** Silas trägt es nach der Einheit über Claude ins Garmin-Ernährungsprotokoll ein – im Chat mit `log_custom_food` (food_id und serving_id
  aus `get_custom_foods`, `meal_time` = Uhrzeit der Einnahme während der Aktivität); das Nacht-Update ordnet es zu (fueling-garmin-1.0, «fg-…»). Oder als Notiz an der
  Garmin-Aktivität (notizen-1.0, Vorschau «fn-…», auf der Seite einmal bestätigen). Ein neues Produkt (z. B. Haribo) nur mit den Werten vom Etikett als eigenes
  Lebensmittel anlegen und nur mit seinem Okay; nie Nährwerte schätzen.
- Während (Richtwerte Jeukendrup 2014, Thomas et al. 2016): unter 75 min nichts (hart ab 45 min: eine kleine Portion in der ersten Pause ab Minute 20, «oder nichts»),
  75 bis unter 120 min 30 g/h (hart 45 g/h), 120 bis unter 150 min 60 g/h, ab 150 min seine Stufe (Standard 60, 30–120 einstellbar; über 60 nur mit Produkten aus Glukose und Fruktose);
  Schwimmen, Krafttraining, Mobility nichts; Tests «wie beim letzten Test». Zeitpunkte ab Minute 20 gleichmässig bis 10 min vor Schluss, nie in harten Abschnitten.
  Vorher Mahlzeit 1–4 h (≈ 1 g/kg je Stunde Abstand) und Snack 30–60 min; nachher Protein 0,25 g/kg (20–40 g, Jäger et al. 2017), rasch Kohlenhydrate (1–1,2 g/kg)
  nur, wenn die nächste harte oder lange Einheit in weniger als 8 h kommt. Alles Weitere sind eigene Festlegungen (Wissen, Kapitel «verpflegung»).
- Anpassen je Einheit («Verpflegung anpassen»: g/h, Produktart, ohne Verpflegung) gilt nur für diese Einheit. «Nach dem Training» fragt ab 60 min Magen und Energie
  (nachher-1.1); daraus und aus dem Fueling-Protokoll der Abgleich geplant gegen genommen und der Vorschlag fürs Darmtraining (+10 g/h nach dreimal ohne Beschwerden,
  −10 nach zweimal starken; nur Vorschlag, die Stufe ändert nur Silas).
- Nichts davon geht an Garmin oder Enduco; Lebensmittel in Garmin werden nur gelesen. Regel ändern = Version in `VP.VERSIONS`, Wissen (Kapitel «verpflegung») und
  `tests/test_verpflegung.cjs` nachführen.

## Aktivitäten draussen (V7.7, aktivitaet-plan-1.0, Etappe 4 Teil 1; Vorschlag vom 17.11.2026, von Silas am 18.11.2026 bestätigt, Ersatz «nur Rad» von Claude entschieden)
- Skitour, Wandern, Langlauf und Traillauf im Voraus planen (Tagesblatt → «Training hinzufügen» → «Draussen – blockiert den Tag», Blatt `V77UI.blatt`): Dauer 1–10 h in
  15-min-Schritten, Z1 oder Z2 nach Puls (Pulszonen vom Laufen, wie Wandern in `V6.SKALA`), Uhrzeit und Notiz optional; ein Eintrag je Tag. Der Rest von Etappe 4 (Kalender,
  Zyklus, Bearbeiten, Tagesblatt wie enduco) erst nach Silas' Okay.
- Wirkung (eigene Festlegungen, Wissen Kapitel «draussen»): der Tag gehört der Aktivität (`V66.verteilen` `aktTag`: keine andere Einheit des Vorschlags), ab 2 h am Vortag
  und am Tag danach keine harte Rad- oder Laufeinheit (wie nach dem Krafttraining, sonst locker, gemeldet). Ersatz: Skitour, Langlauf, Wandern ersetzen Rad-Stunden, Traillauf
  Lauf-Stunden (Laufen sonst unberührt – für Hamburg am spezifischsten, Aufbau am heikelsten); Z2 ganz, Z1 halb; ab 2 h zuerst die lange Einheit, dann lockere (die nächste
  zuerst), unter 2 h umgekehrt; Schlüssel, Tests, eigene und gesperrte Einheiten nie; Rest kommt dazu (gemeldet). Tests am selben Tag oder am Tag danach nur gemeldet, nie
  verschoben. Krafttraining nicht am Tag der Aktivität (`V76.einplanen`), Nachholen der Ampel nicht dort und (Rad, Laufen) nicht daneben (`V74.woche`).
- Ungespeicherte Wochen rechnen die Aktivität von selbst ein (`V64UI` kontext `mitAkt`, vor dem Krafttraining und dem Verteilen; vergangene Wochen nicht). Gespeicherte Wochen
  (`ganz`): beim Speichern `V66.aendern` «aktivitaet» (Einheit «akt-<Datum>» rein, Ersatz ab heute mit `schon` = was die bisherige Fassung schon ersetzt hat, dann «Anpassen»);
  entfernen = «aktivitaet_weg» (Ersetztes kommt mit «Neu berechnen» zurück).
- TL ≈ aus den eigenen Aktivitäten derselben Art (`V77.tlProStunde`: Median Last pro Stunde, zwei Jahre, mind. drei ab 1 h; Z1 × 0,8), sonst keine Zahl. Zählt in Fitness,
  Form und Ampel wie absolvierte Skitouren. Ampel «vorsichtig»: zwei Drittel (ab 90 min) und Z1 (`V74.locker`). Nie an Garmin (`V66.garminGrund`). Traillauf erhöht die
  Aufbau-Grenze im Voraus nicht (Distanz unbekannt), absolvierte Trailläufe zählen wie jeder Lauf. Kopfbilder: Skitour, Wandern; Langlauf mit dem Skitour-, Traillauf mit dem
  Wanderbild.
- **Zonen nach Puls prüfen (zonenpruefung-hf-1.0, Karte `#zp-card` unter Laktat):** bestätigte Kurzchecks mit Puls-Fenster ab 10 min (laktat-hf-1.0) und Pulsanstieg bis 5 %
  gegen LT1 ≈ = Basis + 0,5 mmol/l des letzten bestätigten Stufentests davor (Rad mit Rad, sonst Laufen): Puls in Z1–Z2 und Laktat deutlich darunter «passt», deutlich darüber
  «Z2 zu hoch», sonst «unklar» (deutlich = 2·√(σ₁² + σ₂²), σ = max(0,15; 7,5 %)); Puls über Z2 nicht beurteilt. Hinweis erst nach drei gleichen Urteilen in acht Wochen;
  Zonen ändern sich nie von selbst. Regel ändern = Version in `V77.VERSIONS`, Wissen (Kapitel «draussen») und `tests/test_v77.cjs`.

## Ampel passt das Training an (V7.4, ampel-plan-1.0, Etappe 6 des Auftrags V7.3, freigegeben am 17.11.2026)
- Entscheid je Tag aus der Ampel (readiness-2.2, `V74.entscheid`): «bereit», «normal», «nicht beurteilbar» = wie geplant; «vorsichtig» = keine harten und
  keine mittleren Abschnitte (Rad, Laufen, Schwimmen: lockere Einheit derselben Sportart, `V74.locker`; Renntempo fällt weg; Einheiten über 90 min oder
  der Art «lang» höchstens zwei Drittel; Tests werden locker und im Testkalender verschoben); Krankheitszeichen im Check-in = Ruhetag. Solange für heute
  weder Schlaf noch HRV der Nacht da sind, zählt nur der Check-in (Befinden «belastet» = vorsichtig). Gesperrte Einheiten und Tage bleiben unverändert
  (Hinweis), Schwimmkurs, Kraft und Mobility auch. Nie härter, nie länger, nie eine andere Sportart.
- Nachholen (`V74.woche`; **seit ampel-plan-1.2 (V8.3) nur als Vorschlag des Tagescoaches**, nie von selbst – angenommen über `V66.aendern` «ersetzen»): eine
  Schlüsseleinheit (Rad, Laufen, CSS; harte Bibliothek), die locker wurde, kommt am nächsten passenden kommenden Tag derselben Woche (Tage ohne Entscheid)
  an die Stelle einer lockeren Einheit derselben Sportart (Platz und Kennung der ersetzten Einheit, höchstens so lang, sonst die kurze Fassung): nicht
  neben einer harten Einheit an Land bzw. derselben Sportart, nicht an Test- oder Renntagen und deren Vortag, nicht an gesperrten Tagen, nur mit Zeit
  laut Verfügbarkeit, als Rad- oder Laufeinheit nicht am Tag nach einem Krafttraining (ampel-plan-1.1, V7.6.1), nie in Rennwochen und nie nach Krankheitszeichen.
  Ist der Nachhol-Tag selbst «vorsichtig», gilt dort wieder die lockere Einheit.
  Passt kein Tag, entfällt sie – gemeldet, nie still.
- Gespeichert wird nur der Entscheid je Tag (`ampel_anpassung`, von der Seite ohne Knopfdruck, wenn er sich ändert, und vom Morgen-Update); vergangene
  Tage gelten so, wie entschieden, heute live, kommende Tage ohne Entscheid. Die Schicht wird beim Zeichnen angewendet (`V64UI` kontext → `V74UI.anwenden`):
  Heute, Kalender, Tagesblatt, Einheit-Seite, TL ≈, Form und Plan-Übersicht rechnen mit dem, was galt; Mein Plan (`plan_woche`) bleibt unverändert,
  Änderungen gehen weiter über `V66.aendern`. Nachgeholte Einheiten sind auf der Einheit-Seite nur zu lesen.
- «Trotzdem wie geplant» gilt je Tag (nur heute antippbar). Ab dem dritten Tag «vorsichtig» bzw. krank in Folge zeigt die Seite «Woche anpassen?»: Rest
  der Woche als Erholungswoche (V64-Vorschlag mit Erholung, 65 % der Stunden, nach der Verfügbarkeit verteilt; Aktion «erholung», eigenplan-1.2) – nur
  auf Knopfdruck, gesperrte Tage bleiben, nicht in Erholungs-, Taper- oder Rennwochen.
- Garmin: siehe «An Garmin senden» (lockere Fassung im Auftrag, Morgen-Update Schritt «Ampel»). Regel ändern = Version in `V74.VERSIONS`, Wissen (Kapitel
  «erholung») und `tests/test_v74.cjs` nachführen.

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
  der Wochentag = Tageseintrag weg; danach wie bisher festhalten bzw. «Woche anpassen»), Krafttraining, unten klein «Tag sperren» und Garmin.
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

## Trainingsmodell, Woche nach Modell und Wissen (V6.4, Etappe 4)
- **Modelle `modell-1.0` (`V64.MODELLE`):** polarisiert (Schlüssel Rad 30/15, Laufen 4 × 4 min), pyramidal (Rad 3 × 15 min unter LT2, Laufen 4 × 4),
  Schwelle mit Laktat/norwegisch (Rad 5 × 8, Laufen 6 × 5 min unter LT2, Laktat nach der 2. und 4. Wiederholung; über dem eigenen LT2-Wert die
  nächste leichter – eigene Regel), rennspezifisch (Tempo Rad 2 × 20, Laufen 3 × 10 min, Renntempo in den langen Einheiten, Koppellauf Sa) und
  **kombiniert = Standard** (von Silas gewählt am 13.11.2026): polarisiert bis zum Wechsel (vorgegeben 1. Februar im Jahr des Hauptrennens,
  auf der Seite änderbar), ab der Woche des Wechsels rennspezifisch. Die Wahl kommt nur über «Direkt speichern» (`modell` → `plan_modell`).
- **Woche `wochenplan-1.2` (`V64.woche`, 1.1 = mit Aufbau-Grenze und Intensität je Sportart; 1.2 = Prüfung V6.4, siehe unten):** Mo frei · Di Laufen (Schlüssel) und Schwimmkurs · Mi Rad locker · Do Rad (Schlüssel) und CSS-Schwimmen ·
  Fr Laufen locker · Sa lange Ausfahrt (+ Koppel) · So langer Lauf (+ Schwimmen). Stunden aus saison-1.2 (`AN.saisonStunden`/`AN.saisonVorgaben`),
  seit V7.5 je Sportart aus basis-1.1 und steigerung-1.0 (`V75.rampe`, Planeinstellungen; `V64.woche` mit `aufteilung` je Woche),
  `aufteilung-1.0` Schwimmen 20 %, Rad 50 %, Laufen 30 % (eigene Festlegung, seit V7.5 das Ziel an der Spitze); Anzahl je Sportart nach Stunden (unter 7 h je 2 Rad/Lauf, 1 Schwimmen);
  längste Einheit je Phase begrenzt (`V64.LANG`), Rest wird gemeldet, nie still verteilt; mehr als geplant (Mindestdauern bei wenigen Stunden)
  ebenso. Erholungswoche: nur Rad-Schlüssel gekürzt, Laufen und Schwimmen locker. Taper: Schlüssel mit einem Drittel bis der Hälfte weniger
  Wiederholungen, Intensität bleibt. Rennwoche: 2 Tage vorher frei, Vortag Aktivierung, danach frei. Tests der Woche (Testkalender und
  Vorschläge, nicht erledigt) ersetzen die Einheit derselben Sportart, Kurzcheck in einer lockeren Ausfahrt (±2 Tage); vor einem Stufentest wird
  die Schlüsseleinheit derselben Sportart in den 3 Tagen davor locker. Sportart eines Tests über `V62.testSport` (fehlt `sport`: aus der Notiz).
  Ziele aus dem aktiven Zonenprofil (`V64.ziel`; Laufen Z1 «langsamer als»), ohne Profil bzw. CSS-Test
  nichts geraten. Renntempo = Rad 95–100 % der Leistung an LT1, Laufen bis 3 % langsamer als an LT1 (eigene Festlegung), zählt als locker.
- **Abwechslung `abwechslung-1.0` (V8.4, Masterprompt V8):** gleicher Reiz in anderer Form (`V64.FAMILIEN`): Rad VO2max 30/15 · 4 × 5 · 40/20, Laufen 4 × 4 · 5 × 3 · 30/30, Schwelle 3 × 15 ·
  4 × 10 · 3 × 12 min, Tempo Rad 2 × 20 · 3 × 15, Laufen 3 × 10 · 2 × 15 · 4 × 8 min, Schwimmen CSS 100/200/300 m (Pause 15/20/30 s, CSS-Strecke höchstens ≈ 1600 m, Anfänger-Modus bleibt bei 50 m).
  Die erste Form ist die Vergleichseinheit: jede dritte Woche ab der Woche vom 5.1.2026 (`V64.FORM_START`), sonst die anderen der Reihe nach; Schwelle mit Laktat bleibt immer gleich.
  Ähnliche Zeit im Bereich wie die Vergleichseinheit (Test in `tests/test_v64.cjs`); Varianten erben `V64.STUFE_BAUSTEIN` und `V64.ERSATZ`. Gilt nur für den Vorschlag; gespeicherte
  Wochen und Mein Plan behalten ihre Einheiten. Formen ausser 30/15, 4 × 5 und 4 × 4 und die Reihenfolge sind eigene Festlegungen (Wissen, Kapitel «intervalle»). Regel ändern = Version
  in `V64.VERSIONS`, Wissen und Tests nachführen.
- **Lauf-ABC `lauf-abc-1.0` (V8.4.1):** jeder harte Lauf (Schlüssel: VO2max, Tempo, Schwelle mit Laktat) mit Lauf-ABC nach 10 min Einlaufen – vor VO2max die Koordination (B), sonst
  die Beweglichkeit (A); Einheit gleich lang (Auslaufen kürzer, mind. 5 min, sonst höchstens 1 min länger). Nicht in Tests, lockeren, langen und Koppelläufen, nie beim Rad. Regel ändern =
  Version in `V64.VERSIONS`, Wissen (Kapitel «intervalle») und `tests/test_v64.cjs`.
- **Intensität je Sportart `intensitaet-1.1` (V6.4.2; 1.1 = Titel-Regel mit Neuro und locker, V6.4.3, Version nachgeführt in V6.4.4; `V64.kappen`, `V64.planStufe`):** je Sportart «nur locker», «bis Schwelle» (Tempo, knapp unter
  LT2, CSS; keine VO2max-Intervalle) oder «alles» (Standard). Gespeichert im Eintrag «modell» (`intensitaet` = {schwimm, rad, lauf}, `vi`;
  `merge_daily.modell_pruefen` lehnt unbekannte Sportarten oder Stufen ab). Der Vorschlag ersetzt eine Schlüsseleinheit über der Wahl durch die nächst
  leichtere derselben Sportart (`V64.ERSATZ`; locker mit gleicher Dauer) und verschiebt nichts auf eine andere Sportart; die Prüfung der Verteilung
  ist dann «nicht beurteilt» mit Grund. Enduco-Plan nur geprüft: Stufe aus den Zielen der Schritte, ohne Ziele aus dem Titel («laut Titel»).
- **Aufbau-Check `aufbau-1.1` (V6.4.2; 1.1 V6.4.4: Laufpause und Nachprüfung, siehe Ende; `V64.aufbau`, Karte `#ab-card` unter Plan):** jeder Lauf (0,5–100 km) gegen den längsten Lauf der 30 Tage
  davor (frühere am selben Tag zählen), Klassen nach Frandsen et al. 2025 (bis 10 %, 10–30, 30–100, über 100 %; Raten 1,64/1,52/2,28 nur als
  Beobachtung), Grenze für den nächsten Lauf = 10 % über dem längsten der 30 Tage (auf 0,1 km abgerundet, nur absolvierte Läufe), wann der
  Referenzlauf wegfällt, geplante Enduco-Läufe (Distanz aus Pace-Zielen geschätzt, offene Schritte = «mind.»), Wochen-km Laufen, Schwimm-Meter,
  Rad-Stunden (12 Wochen). Schwimmen und Rad ohne Grenze (keine geprüfte). Der Wochenvorschlag kürzt den langen und den lockeren Lauf unter die
  Grenze (Distanz aus dem Zonenprofil, Z1 mit dem langsamen Rand von Z2; nach dem Kürzen nachgeprüft, liegt auch die Untergrenze von 20 min darüber,
  ausdrücklich gemeldet), übrige Läufe nur als Hinweis; ohne Lauf-Pace-Zonen keine Begrenzung. aufbau-1.1: kein Lauf in den 30 Tagen davor (Pause) →
  langer und lockerer Lauf höchstens 30 min locker (`V64.PAUSE_MIN`, eigene Festlegung), harte Läufe gemeldet; ohne Läufe in den Daten nichts begrenzt. **aufbau-1.2 (V7.6.2):**
  für Wochen weiter voraus zählen die geplanten Läufe der Wochen dazwischen (Mein Plan bzw. Vorschlag, Distanz ≈ aus dem Zonenprofil, `r.geplant`, bis zum Vortag) – sonst
  sah eine Woche ab etwa vier Wochen voraus wie nach einer Laufpause aus (offener Punkt 96).
- **Vergleich mit Enduco `vergleich-1.4` (V6.4.3; 1.1 V6.4.4; 1.2 V6.5 Wahl je Tag, siehe Ende; 1.3 V6.6: bearbeitete Woche aus Mein Plan; 1.4 V6.6:
  selbst gesendete Workouts «IN · …» und eingeplante Bibliothek sind nie Enduco; `V64.vergleich`, `V64.enducoAusUhr`, `V64.stand`, `V64.wahlAuswerten`):** Woche nach Modell wählbar «Letzte · Diese Woche · Nächste»,
  ältere über die Karte `#vg-card` (letzte 8 Wochen). Vergangene Wochen nachgerechnet, wie die Seite am Montag geplant hätte (`V64.stand`: Saison ab
  jener Woche, Stunden aus den 8 abgeschlossenen Wochen davor – von Hand gesetzte nur, wenn sie vor dem Montag gespeichert wurden –, CSS, Läufe und
  Aufbau-Grenze bis zum Sonntag davor, Tests der Woche auch wenn inzwischen erledigt; Modell, Intensität je Sportart und Zonenprofil von heute,
  gekennzeichnet). Enduco = Garmin-Kalender, dazu Workouts auf der Uhr (`wk`), wo am selben Tag für dieselbe Sportart nichts im Kalender stand (ohne
  Tests; ein verschobenes Workout – gleicher Titel ±2 Tage im Kalender, dort nicht gelaufen – zählt nur einmal; Dauer = Plandauer `wk.plan_s`, ohne sie
  «ohne Dauer», nie die gelaufene Zeit); Zwift ohne Uhr-Workout und ausgelassene Einheiten fehlen. Fenster: vergangene Wochen ganz, sonst Pläne bis zum letzten Enduco-Tag, Absolviertes bis gestern.
  Vergleich je Sportart (Stunden, Anzahl), Stufen (hart, Tempo/Schwelle), längste Einheiten, freie Tage, Unterschiede in Worten; «näher an» =
  kleinere Summe der Stunden-Abweichungen je Sportart (±15 min = «ähnlich»), nur bei Abdeckung ≥ 60 % (absolvierte Einheiten mit Enduco-Eintrag
  derselben Sportart am selben Tag), sonst kein Urteil; Sportarten mit Enduco-Einheiten ohne Dauer zählen dafür auf keiner Seite (sind sie mehr als
  die Hälfte des Absolvierten: kein Urteil). Titel-Regel: VO2max/anaerob/Sprint/Neuro = hart, Schwelle/Tempo/Sweet Spot/CSS/Über-Unter =
  Schwelle, Fatmax/Grundlage/locker = locker, sonst offen. Welcher Plan besser ist, sagt der Vergleich nicht (Kapitel «vergleich»).
  **Wahl je Tag `planwahl-1.0` (V6.5):** «Ich folge» Enduco · Vorschlag · frei je Tag (nicht an Renntagen, nur an Tagen mit Einheiten in einem der
  Pläne), gespeichert über «Direkt speichern» (`planwahl` → `plan_wahl`); für abgeschlossene Tage mit Enduco oder Vorschlag die Abweichung des
  Absolvierten vom gewählten Plan (Minuten je Sportart als Betrag), ohne Tage mit Enduco-Einheiten ohne Dauer; «frei» wird gezählt, nie mit einem
  leeren Plan verglichen. Die Wahl ändert nichts in Enduco oder Garmin.
- **Saison `saison-1.2` (V6.4.3/V6.4.4):** «jetzt» = Median der 8 abgeschlossenen Wochen vor der laufenden (die laufende zählt nicht mit; 1.2: jede
  Woche zählt, auch ohne Schwimmen/Rad/Laufen mit 0 h – nach einer Pause beginnt der Vorschlag tiefer; Wochen vor der ersten Aktivität nicht),
  «Spitze» aus den 52 Wochen davor. 1.2: auch der 3:1-Rhythmus ist fest am Hauptrennen verankert (rückwärts ab der Woche vor dem Taper jede 4. Woche
  Erholung; B-Rennen: Mini-Taper, Woche danach Erholung, Rhythmus-Erholung direkt davor oder 1–2 Wochen nach dieser entfällt) – unabhängig vom
  Rechentag. `AN.saison(...).wochen` ab der laufenden Woche, `alle`/`ab` mit der laufenden Phase ab ihrem Beginn (`phaseNr`/`phaseN` = Woche x von y;
  Grundlage ohne festen Beginn). Nur kommende Rennen können Hauptrennen sein.
- **Verteilung `tid-1.0`:** locker (Z1–Z2, Renntempo) · mittel (Z3) · hart (Z4–Z5); Muster nach Treff et al. 2019 (PI > 2,00 = polarisiert, ohne
  Mitte nicht berechenbar), Abgleich mit dem Modell (`V64.pruefen`; Erholung/Taper «nur locker» ok, Rennwoche nicht beurteilt). Vorschlag und
  Enduco-Plan (Workout-Schritte, profil-1.0) nach den Zielen der Abschnitte, Absolviertes nach Puls (letzte 4 Wochen, `FK.zoneSummary`).
- **Wissen `wissen-1.33` (`js/wissen.js`; 1.33 = V8.5 Modell «Automatisch» im Kapitel «modelle», verteilung-1.1 im Kapitel «reaktionen»; 1.32 = V8.4.1 nur Rad oder nur Laufen im Kapitel «planeinstellungen»; 1.31 = V8.4.1 Lauf-ABC im Kapitel «intervalle»; 1.30 = V8.4 Abwechslung im Kapitel «intervalle»; 1.29 = V8.4 Ampel readiness-3.0, Verpflegung kurz, Coach 1.1; 1.28 = V8.3 Kapitel «coach», ampel-plan-1.2 und basis-1.2; 1.27 = V8.2 Kapitel «reaktionen»; 1.26 = V8.1.1 Kapitel «verpflegung»; 1.25 = V8.1 TL ≈ mit den Bezugsgrössen, Abweichung, Anstieg,
  Nach dem Training, Puls zur Leistung; 1.24 = V8.1 harte Einheiten an Land nie an zwei Tagen hintereinander; 1.23 = V7.10 Tagesblatt und eigene Aktivität nach RPE im Kapitel «modelle»; 1.22 = V7.9 Fitness voraus im Kapitel «last», Zyklus und Bearbeiten im Kapitel «modelle»; 1.21 = V7.8 Trainingsstatus im Kapitel «last»; 1.20 = V7.7 Kapitel «draussen»; 1.19 = V7.6.2 Schwimmkurs, aufbau-1.2, Kurzcheck nach Puls; 1.18 = V7.6.1 Abstimmung ums Krafttraining, Tag automatisch, Tage für lange Einheiten, Form ohne Krafttraining; 1.17 = V7.6 Kapitel «kraft» (Rønnestad & Mujika 2014, Rønnestad et al. 2010, Doma et al. 2017, Lauersen et al. 2014, Foster et al. 2001); 1.16 = V7.5.2 Basis-Fitness Variante A; 1.15 = V7.5.1 Planeinstellungen als Blatt-Folge, Basis-Regel offen, Anfänger-Modus, Stile auf der Uhr; 1.14 = V7.5 Kapitel «planeinstellungen», 1.8 = V7.1 Kapitel «vergleichbar», 1.9 = V7.2 Schwimm-Einheit, Übungen und Verfügbarkeit, 1.13 = V7.4 Ampel passt das Training an (Kapitel «erholung», Düking 2021, Manresa-Rocamora 2021), 1.12 = V7.3.2 Übungen aus der Enduco-Liste, 1.11 = V7.3 Etappe 2 Schwimmen,
  Puls und RPE an Garmin im Kapitel «modelle», 1.10 = V7.3 Einheit als
  Schritte, Einfahren und Intervall-Intensität, RPE je Abschnitt im Kapitel «intervalle»; 1.1: Kapitel «Sportarten verteilen und Umfang aufbauen», 1.2: Intensität je Sportart und Aufbau-Check,
  1.3: Kapitel «Vorschlag und Enduco vergleichen», 1.4: Prüfung der Quellen – Formulierungen nicht stärker als die Studien, eigene Festlegungen
  gekennzeichnet, Versionen wie im Code, 1.5: Wahl je Tag und Bibliothek im Kapitel «vergleich», 1.6: Mein Plan, TL ≈ geplanter Einheiten,
  bearbeitete Woche im Vergleich, 1.7: Form zu Tagesbeginn und Rad-Last je System im Kapitel «last»):** alle Modelle und Regeln der Seite in eigenen Worten (nie Text aus Studien oder Webseiten übernehmen),
  jede Aussage mit Quelle `[[id]]` aus `WS.QUELLEN` (Autoren, Jahr, Titel, Zeitschrift, DOI; ohne DOI begründet), Kapitel-Verweise `[[#id]]`.
  Neue oder geänderte Regel: Kapitel und `WS.REGELN` nachführen; `tests/test_v64.cjs` prüft Verweise, DOI-Form, jede Quelle verwendet,
  Schweizer Schreibweise (kein ß) und keine Wattwerte in den Texten. Nie persönliche Zahlen in die Wissenstexte.
- Der Vorschlag steht neben dem Enduco-Plan, solange Enduco läuft; Enduco wird nie geändert. Nach Garmin geht nur, was Silas mit «An Garmin senden»
  auslöst (Abschnitt «An Garmin senden»), und seit V7.4 die lockere Fassung einer solchen Einheit am Morgen bei «vorsichtig» (Entscheid A7).

## Enduco nur als Vergleichsdatenbank (V7, planvergleich-1.0)
- Enduco-Workouts (`planned`, `workouts_neu`, `enduco_bib`, `wk`) bleiben vollständig gespeichert, erscheinen aber nicht in Heute, Kalender oder Plan.
  Sichtbar nur zusammengefasst unter Analyse → Planvergleich; Einzelheiten (Bibliothek, «Woche nach Modell» mit «Ich folge», Vorschlag und Enduco
  über die Wochen, Workouts auf der Uhr) im Labor.
- Planvergleich je Woche Mo–So (Datum wie in den Daten): Soll = Garmin-Kalender ohne eigene «IN · …» (`V66.eigenGarmin`), wo dort nichts stand die
  Plandauer der Uhr-Workouts (`V64.enducoAusUhr`); Ist = Netto (mv, sonst dur), Brutto (el), Pausen. Zonen nur Rad/Laufen: Soll aus den Zielen der
  Schritte im aktiven Zonenprofil (profil-1.0), Ist aus dem Puls-Histogramm `hh` in den Pulszonen des Profils am Tag (`V7.histZonen`, nicht
  hochgerechnet); 5 Zonen oder 3 Bereiche (LT1/LT2). Ohne Dauer, ohne Ziel, ohne Puls = «Nicht zuordenbar», nie verteilt.
- Urteil (Abweichung, Verlauf) nur für Wochen mit vollständigem Soll (`status` «ok»): Kalender vorhanden, kein Uhr-Workout, das im Kalender fehlte,
  und ab `config.planvergleich_ab` (falls gesetzt; sonst erste ganze Woche nach dem ersten Kalendereintrag). Sonst «teil» bzw. «nur-uhr», sichtbar.
  Regel ändern = Version in `V7.VERSIONS` erhöhen und `tests/test_v7.cjs` nachführen.

## An Garmin senden (V6.6, garmin-senden-1.0, Entscheid E3 vom 13.11.2026; 1.1 = V7.3 Etappe 2: Schwimmen, Puls, RPE; 1.2 = V7.5.1: Stil je Schritt)
- Silas' Wunsch: eigene Einheiten von Hand bis eine Woche voraus an Garmin (Fenix und Edge), automatisch nur am Vortag um 23 Uhr (er passt den
  nächsten Tag bis etwa 23 Uhr an). Die Seite legt dafür nur einen Auftrag an; ausgeführt wird er im Nacht-Update (Schritt 3, als Letztes).
- Auftrag je Tag (`garmin_auftraege`, ID «gs-<Datum>»): modus «senden» (nächstes Nacht-Update), «auto» (Nacht-Update am Vortag ab 23:00), «aus».
  Er trägt eine Momentaufnahme je Einheit (`V66.garminAuftrag`): Rad und Laufen als fertiges Workout (`V66.garminWorkout`: Name «IN · …»,
  Ziele in der Metrik der Einheit (`V66.metrikVon`): power.between in Watt bzw. pace.zone in m/s langsam → schnell, 1.1 Puls als heart.rate.zone
  mit eigenem Bereich in bpm (ID 4, ohne zoneNumber; `V66.garminPuls`, Renntempo = oberes Drittel von Z2, eigene Festlegung) oder RPE ohne Ziel
  mit RPE im Text; aus dem aktiven Zonenprofil, Z1 und Pausen ohne Ziel, Z5 nach oben +15 % bzw. Puls +10 % (eigene Festlegung), Wiederholungen
  als eine Ebene, höchstens 50 Schritte, Fassung = Prüfsumme). **1.1 Schwimmen** (`V66.garminSchwimm`, Format wie Enduco aus `get_workout_by_id`
  raw gelesen): sportType 4 «swimming», `poolLength` 25/50 mit `poolLengthUnit` meter (Bahnlänge der Einheit, sonst Standard aus den Planeinstellungen, `SWUI.becken`), Strecken in ganzen
  Bahnen (distance), Pausen am Beckenrand als rest/fixed.rest, Übungen als «other» über die ganze Bahn («½ L | Name | Technik | RPE … | Bahn locker
  beenden»), Wiederholungen mit `skipLastRestStep` false, Stil free (1.2: je Schritt wie in der Einheit, Rücken backstroke 2, Brust breaststroke 3 wie in den
  Enduco-Workouts mit Brust; das ganze Einschwimmen «warmup»), nötige Hilfsmittel als `equipmentType` (fins 1, kickboard 2, paddles 3 aus
  Enduco-Workouts; pull_buoy 4 am 17.11.2026 mit einem Test-Upload bestätigt), freiwillige im Text; mit CSS-Test Nebenziel
  swim.css.offset (17) = CSS-Geschwindigkeit − Zielgeschwindigkeit (m/s) und Tempo im Text, ohne Test bzw. Metrik RPE nur RPE im Text. Die Uhr
  rechnet die Tempo-Ziele mit ihrer eigenen CSS; Garmin liefert sie nicht (get_user_profile geprüft am 16.11.2026), die Seite sagt es im
  Export-Blatt. Die CSS nie nach Garmin schreiben. Die Schwimm-Einheit kommt immer aus `V66UI.schwimmEinheit` (dieselbe wie auf der Einheit-Seite,
  `opt.schwimm`), sonst gleiche Fassung nicht möglich. Bibliothek nur als `wid` (Enduco-Workout, wird nur eingeplant). Tests, Schwimmkurs,
  Kraft, Mobility: nicht gesendet, mit Grund.
- `tools/garmin_senden.py plan` vergleicht offene Aufträge mit den Vermerken in `plan_garmin` (uid, Tag, Fassung, workout_id, scheduled_id):
  gleiche Fassung = nichts; andere Fassung = neue Fassung senden, danach die alte austragen (`nach`); nicht mehr im Plan = austragen; verschoben
  (neuerer Auftrag an einem anderen Tag) = nur am neuen Tag. Tag schon da = «verpasst» (für heute nur im Chat).
- Aktionen im Nacht-Update (genau diese, nichts anderes; Ergebnis je `nr` in `work/garmin_ergebnis.json` als `{"garmin_ergebnis": [...]}`):
  - `hochladen`: `upload_workout(workout)` unverändert → `workout_id`. `get_workout_by_id(workout_id, raw=true)` unverändert als
    `work/garmin_rueck_<nr>.json` speichern (speichert das Werkzeug die Antwort selbst als Datei: deren Pfad nehmen), dann
    `python3 -I tools/garmin_senden.py rueck work/garmin_plan.json <nr> <datei>`. «RÜCKLESEN: gleich» →
    `get_scheduled_workouts(date, date)`, `schedule_workout(workout_id, date)`, nochmals `get_scheduled_workouts(date, date)`: neu ist der Eintrag mit
    dieser `workout_id`, der vorher nicht da war (fehlt er noch: 10 s warten, höchstens dreimal) → `{"nr", "ok": true, "workout_id", "scheduled_id"}`
    (ohne gefundene ID `scheduled_id: null`). Sonst das eigene Workout löschen (`delete_workout(workout_id)`, dann mit `confirm=true`) →
    `{"nr", "ok": false, "fehler": "<Zeile RÜCKLESEN …>"}`.
  - `einplanen` (Bibliothek): `get_scheduled_workouts(date, date)`; steht `wid` dort schon → `{"nr", "ok": true, "scheduled_id": <dessen ID>,
    "vorhanden": true}` ohne einzuplanen; sonst `schedule_workout(wid, date)` und die neue `scheduled_workout_id` wie oben → `"vorhanden": false`.
  - `austragen`: mit `nach`, dessen Aktion nicht «ok» war → `{"nr", "ok": false, "fehler": "übersprungen"}`. Sonst, wenn nicht `vorhanden`:
    `unschedule_workout(scheduled_id)` (fehlt sie: in `get_scheduled_workouts(date, date)` den Eintrag mit `workout_id` suchen); mit `loeschen`
    danach `delete_workout(workout_id)` und mit `confirm=true` → `{"nr", "ok": true}`.
  - Fehlschlag eines Aufrufs: `{"nr", "ok": false, "fehler": "<kurz>"}`, weiter mit der nächsten Aktion.
- Nie: Enduco-Workouts ändern oder löschen, Kalendereinträge ohne eigenen Vermerk austragen, Bibliotheks-Workouts löschen, Zonen oder die CSS
  nach Garmin schreiben, etwas senden, das nicht in `work/garmin_plan.json` steht. Das Morgen-Update sendet nur im Schritt «Ampel» (Entscheid A7 vom
  16.11.2026, seit V7.4): bei «vorsichtig» oder Krankheitszeichen die eigene harte Einheit des Tages durch ihre lockere Fassung ersetzen.
- **V7.4 lockere Fassung (ampel-plan-1.0):** jede Einheit im Auftrag mit harten, mittleren oder langen Abschnitten trägt `ampel` = { titel, fassung,
  workout } (aus `V74.locker`, Titel «… (Ampel)», gleiche Uhrzeit und Metrik); `pruefen` prüft sie wie jedes Workout. `garmin_senden.py ampel` ersetzt
  nur Vermerke von heute, deren Fassung im Auftrag steht; die neue trägt in `plan_garmin` `ampel: true` und wird nie zurückgesetzt («Trotzdem wie
  geplant» danach: die Seite sagt, dass auf der Uhr die lockere Fassung steht). Klappt das Ersetzen nicht, zeigt die Seite «Auf der Uhr steht noch die
  harte Fassung – locker fahren bzw. laufen». Ältere Aufträge ohne `ampel` werden nicht ersetzt.
- V7.3 «Export» einer Einheit (Einheit-Seite): der Auftrag des Tages trägt `teil: true` und enthält nur die gewählten Einheiten – diese und alle, die
  schon in Garmin oder im offenen Auftrag sind (`V66UI.einheitSenden`); was danach in Garmin ist, sind genau die Einheiten des Auftrags (wie bisher).
  Nach einer Änderung bleibt die Auswahl; ohne `teil` gilt der ganze Tag. `pruefen` lehnt ein `teil` ab, das nicht ja/nein ist.
- Eigene Einträge im Garmin-Kalender («IN · …», eingeplante Bibliothek ohne `vorhanden`) sind nie Enduco: `V66.eigenGarmin` (vergleich-1.4),
  `V64.enducoAusUhr`, `tools/bibliothek.py` (bib-1.1, kein Enduco-Termin).
- Die Seite zeigt je Einheit «in Garmin», «in Garmin, geändert» oder «wird gesendet» (`V66.garminStand`), je Tag den Auftrag (offen, gesendet,
  verpasst, Fehler mit Grund, abgelehnt). Rücklese geprüft am ersten echten Senden; bis dahin nie behaupten, das Format sei an Silas' Geräten geprüft.
  **Test-Upload 17.11.2026 (mit Silas' Okay):** ein Schwimm-Workout mit erfundenen Werten (50-m-Becken, Übungen «other», Brett, Pullbuoy, CSS-Abstand,
  Texte mit «½» und «–») hochgeladen, zurückgelesen («RÜCKLESEN: gleich», Garmin speichert es unverändert) und gleich wieder gelöscht, nie eingeplant.
  Damit nimmt Garmin das Format an; wie die Fenix es zeigt, ist weiter offen.
  1.1: `rueck` vergleicht zusätzlich die Texte der Schritte (gekürzt oder anders = abweichend), Bahnlänge, Stil, Hilfsmittel und Nebenziel (CSS-Abstand);
  «ohne Ziel» darf als null oder no.target zurückkommen. Erstes echtes Senden einer Schwimm-Einheit: Rücklese im Chat zeigen und Silas bitten, auf der
  Fenix zu prüfen (Übungsname sichtbar, Hilfsmittel, Pausen, Bahnen); bis dahin nie behaupten, Schwimmen sei auf dem Gerät geprüft.

## Meine Entwicklung und Regeln V5.5
- **Vergleichbare Läufe `laufvergleich-1.0` (V7.1, Silas' Wunsch 16.11.2026):** Puls und Pace verschiedener Läufe nur aus Läufen, die `FK.laufVergleichbar`
  zulässt (draussen, ab 20 min und 3 km, ≤ 10 Hm/km, keine Intervalle/Tempo laut Titel oder Workout, 2. Hälfte ≤ 8 % anders, TL ≤ 95 je Stunde, < 25 °C,
  kein Trail/Laufband/Koppellauf); Gründe immer sichtbar. Gilt auch für Lauf-Vergleiche im Chat und in den Aufträgen. Effektive Zeit = Bewegungszeit
  (`zeit-1.1`: auch Navigieren, Tracker, Jagen u. a. draussen mit GPS; nicht im Wasser).
- Vergleiche nur aus `eb`-Blöcken (Rad 190–210 W je System Rolle/Rennrad/MTB, Laufen 5:20–5:40/km flach), Urteil `entwicklung-1.0`
  (mind. 3 je Zeitraum, Bootstrap-Intervall, Guards Hitze/Höhe/Drift/Ausreisser). Laktat zählt erst bestätigt (B1), CSS nur aus Tests.
- Form `pmc-2.1` (Fitness − Ermüdung desselben Tages; 2.1 = ohne Krafttraining, Silas' Wunsch vom 17.11.2026; «Heute» zeigt seit status-1.1 die Form zu Tagesbeginn), Zonen `zonenverteilung-2.0` (je Sportart, Zonen je Datum, Garmin-Zonen nicht beurteilt).
- Routenplaner: Varianten (seit V5.6 `varianten-2.0`) nur über das erlaubte Rennradprofil, nie ein unzulässiger Weg;
  `zeit-rt-1.2`/`wetter-rt-1.2` (Pausen je Zwischenziel; fehlende Wetterwerte bleiben unbekannt, nie 0 – Fahrzeit dann mit
  «Wind nicht berücksichtigt» und ±2 m/s im Band); Fehlerband aus `kalibrierung-1.1` (Population, Steigungsklasse).
- Regel ändern = Version erhöhen, Test ergänzen, `CHANGELOG.md` nachführen. Offene Punkte nur in `docs/offen-nach-v55.md`.

## V5.6: Explorer, Geplant vs. Ist, Saison, RPE, Ermüdung, Energie
- Reihen `serie-1.0`: 2-s-Mittel aus FIT, Lücken > 30 s trennen Abschnitte, fehlende Werte bleiben `null`. Explorer-Kennzahlen `explorer-1.0`
  (NP aus 30-s-Mitteln; HF-Drift nur bei gleichmässiger Belastung: VI ≤ 1,10 bzw. Tempo-CV ≤ 0,15), Intervalle `intervalle-1.0`.
- Geplant vs. Ist `plan-1.0`: nur das Workout, das auf der Uhr lief (FIT `workout`/`workout_step`, Runden mit `wkt_step_index`) und der
  Garmin-Kalender. **Keine direkte Enduco-Schnittstelle behaupten**; Enduco-Workouts nie ändern. Leistungsziele ≤ 1000 je Workout als
  Watt oder % FTP nach der gefahrenen Leistung gelesen und offen ausgewiesen. Plandauer nur, wenn jeder Schritt eine Zeit hat (sonst «offen»).
- Saison `saison-1.2` (Phasen wie 1.0, Rhythmus seit 1.2 fest): Phasen rückwärts ab Hamburg (A), Jesolo als B-Rennen; Stunden nur als Vorschlag aus den eigenen Wochen, nie als
  Vorgabe und nie nach Garmin/Enduco geschrieben.
- Ermüdung `ermuedung-1.0`: Puls früh gegen spät bei gleicher Leistung bzw. Pace in derselben Einheit; beste 20 min ab Stunde 2–5.
  «Meine Entwicklung» urteilt darüber nur mit `entwicklung-1.0` (mind. 3 je Zeitraum, Intervall).
- Lange Ausfahrt `langfahrt-2.0`: Sollband für Grundlage/Long Ride aus dem aktiven Zonenprofil (Z2 Watt nach Dauer: 1 h oberstes Viertel,
  ab 5 h unterstes Viertel, linear dazwischen; Puls Ende Z2 als Obergrenze); das beobachtete Band (Fahrten ähnlicher Dauer) steht daneben,
  Renn-Pacing bleibt beobachtet. Nie eigene Zonenwerte in öffentliche Tests oder Doku schreiben.
- RPE `rpe-1.0`: CR-10 nach Foster (modifizierte Borg-Skala), sRPE = RPE × Bewegungsminuten; Kalibrierung mit Morgenwerten erst ab 20 Paaren, nur Rangkorrelation, keine Prozentwerte.
- Energie `energie-1.0`: aufgenommen nur aus dem Fueling-Protokoll; Verbrauch Rad aus kJ mit Wirkungsgrad 22–25 % (Annahme); KH-Anteil
  je Garmin-Pulszone ist ein Modell; Richtwert Jeukendrup 2014. Nie Gelmengen oder Stoffwechselwerte erfinden.

## V5.7: Smart Training Routes (Trainingskalender und Routenplaner, kein eigener Tab)
- Workout `workout-1.1` (V6.0.1): feste Pause (`fixed.rest`) = Zeit; Schwimmstrecken aus der Pace der Beschreibung geschätzt («≈»), lockere Strecken
  ohne Pace mit der langsamsten Pace des Workouts, harte ohne Pace bleiben offen (Intensitätswörter `TR.SCHWIMM_WORT`, auch für `V6.schwimmZone`); Dauer aus den
  Schritten nur, wenn jeder Schritt eine Zeit oder Schätzung hat, sonst laut Kalender.
- Workout `workout-1.0`: Schritte aus der Garmin-Verbindung (Enduco schreibt Watt, Tempo in m/s oder Puls), Wiederholungen aufgefaltet;
  intensiv = Mitte des Zielbereichs ab Z3 des aktiven Zonenprofils; Leistung ≤ 150 überall → «Watt oder % FTP?» offen, nie geraten.
  Dauertraining (Grundlage, Sprints < 10 %, Trail, Wandern) Ziel ±5 %, sonst ±10 %. **Keine direkte Enduco-Schnittstelle**, Workouts nie ändern.
- Vorschläge `trainingsroute-1.1` (1.1 V6.6: Rennrad-Kandidaten mit mehr als 20 m Gravel, auch «möglicherweise», werden verworfen; bleibt keiner,
  kein Vorschlag mit Grund): Rundtour = Kreis durch den Start (3 Zwischenziele), 6 Richtungen, dann Radius nach der echten
  Fahrzeit nachregeln (höchstens 2 Runden), Rennrad C mit dem velofreundlichen Profil; eine Anfrage je Kandidat (Mehrpunkt), Warteschlange
  höchstens 2 gleichzeitig (`anfragen-1.0`), gleiche URL nur einmal. Plandauer bleibt massgebend: Abweichung wird gezeigt, nie angepasst.
- Intervalle `intervall-rt-1.0` (Abfahrt < −4 % über 200 m = ungeeignet, Unterbrechungen laut OSM-Knoten, Gravel beim Rennrad, Berg ≥ 4 %);
  ungeeignete Abschnitte werden so gezeigt, nie als passend. Wetter `wetteroptimiert-1.0` (Seitenböen > 36 km/h, Regen, Gegenwind auf dem
  Rückweg; unbekannt bleibt unbekannt, B nur mit ≥ 70 % bekanntem Wind). Ruhig `ruhig-1.0`, Tageslicht `tageslicht-1.0` (NOAA, ±2 min).
- Rennrad (V5.7): Pflaster eigener Belag (`belag-1.1`, kein Gravel), Varianten `varianten-2.1` (10 % auf die Fahrzeit; ohne Zeit ausdrücklich
  Distanz; velofreundlich nur, wenn wirklich ruhiger), Profil `gravel-rt-1.1` (`avoid_mainroads`). Ersatzprofil fastbike immer sichtbar melden.
- Vorschlag vs. Ist `auswertung-rt-1.0`: Prognosefehler, Prognose bei Ist-Leistung, Streckentreue aus `poly`; Modellgüte nur aus Einheiten
  nach dem Kalibrierungsstand und mit ≥ 80 % gefolgter Strecke.

## Sekundenreihen (serien/, V5.7.1)
- Format SPS2 (neu geschriebene Reihen): AES-256-GCM mit dem Seitenschlüssel über «Länge | gzip(JSON) | Nullen», Datei auf eine Zweierpotenz
  ≥ 16 KiB aufgefüllt (die Grösse verrät die Dauer nur grob). SPS1 (bis V5.6, exakte Grösse) wird weiter gelesen, nicht neu geschrieben.
- Name = erste 24 Hex-Zeichen von SHA-256(«serien_salz:gid», sonst «serien_salz:id»); `serien_salz` (128 Bit Zufall) nur verschlüsselt in
  den Daten. Die gid bleibt beim Monatsexport erhalten → gleicher Name, kein Neuimport, nichts verwaist.
- Nur neue oder tatsächlich geänderte Reihen werden geschrieben (Vergleich mit dem entschlüsselten Bestand); das Nacht-Update löscht und
  benennt nie um. Schlägt ein Import fehl, bleiben die bisherigen Dateien (atomar schreiben, sonst `git checkout`/`git clean` auf `serien/`).
- `tools/serien_pruefen.mjs` nach jedem Import: jede Datei entschlüsselbar und aufgefüllt, Inhalt gehört zur Aktivität (ID, Anzahl Werte =
  `ser.n`), keine zweite Datei je Aktivität, keine Klartext-/Restdateien, kein Name aus einer ID ohne Salz, keine doppelten IDs/gids,
  `data.json`/`work/`/FIT nicht im Repository; im Nacht-Update keine Löschung und nur Änderungen laut Lauf-Bericht.
- Sichtbar bleibt öffentlich: Anzahl der Dateien, Zeitpunkt neuer Dateien (Nacht-Update → Tag einer Aktivität) und die grobe Grössenstufe.
  Die exakten Grössen der SPS1-Dateien stehen in der Git-Historie.

## Prüfen vor jedem Push von Seite oder Werkzeugen
`node --test tests/test_archiv.cjs`, `node --test tests/test_kompat.cjs`, `node --test tests/test_formkurve.cjs`, `node --test tests/test_route.cjs`, `node --test tests/test_analyse.cjs`, `node --test tests/test_training.cjs`, `node --test tests/test_v59.cjs`, `node --test tests/test_v6.cjs`, `node --test tests/test_v61.cjs`, `node --test tests/test_v62.cjs`, `node --test tests/test_v64.cjs`, `node --test tests/test_v65.cjs`, `node --test tests/test_v66.cjs`, `node --test tests/test_v7.cjs`, `node --test tests/test_v72.cjs`, `node --test tests/test_v73.cjs`, `node --test tests/test_v74.cjs`, `node --test tests/test_v75.cjs`, `node --test tests/test_v76.cjs`, `node --test tests/test_v77.cjs`, `node --test tests/test_v78.cjs`, `node --test tests/test_v80.cjs`, `node --test tests/test_v81.cjs`, `node --test tests/test_v82.cjs`, `node --test tests/test_v83.cjs`, `node --test tests/test_v85.cjs`, `node --test tests/test_verpflegung.cjs`, `python3 -I tests/test_tools.py`, `python3 -I tools/make_demo.py`, bei Datenänderungen `check_referenz.py`,
bei Änderungen an `bilder/` oder `config.bilder` `SPUREN_PW=… node tools/bilder_crypt.mjs pruefen` («PRÜFUNG BILDER: bestanden»).
**Leck-Prüfung (V6.4.4):** `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json work/data.json`, `python3 -I tools/leck_pruefen.py work/data.json`
(«LECK-PRÜFUNG: bestanden»), danach `rm work/data.json`. Gilt für jeden Push von Seite, Werkzeugen, Tests oder Doku (nicht für die reinen Daten-Updates).
Kein Live-Push, wenn ein Test oder die Leck-Prüfung fehlschlägt. Screenshots mit echten Daten nie ins Repo. **Ein Force-Push entfernt nichts von GitHub:**
hängende Commits bleiben per SHA öffentlich abrufbar – echte Werte darum gar nicht erst committen.

## FTP und Trainingslast
- Auf Silas' Wunsch sind die FTP-Karten (Fortschritt «Trainingslast: Garmin-FTP …», Leistung «Rad: FTP und Watt/kg») ausgeblendet
  (`data-ausgeblendet`); Daten und Werkzeuge bleiben. Er trainiert nach Laktat und testet keine FTP.
- `tss` ist die ursprüngliche Trainingslast (Rad mit der in Garmin eingestellten FTP). Sie wird nie überschrieben.
- **V5.9.1 last-2.0 (E1):** `tl2` je Aktivität neben `tss` (`tools/last.py`, rechnet `merge_daily.py` bei jedem Einspielen für alle
  Aktivitäten neu, also auch im Nacht-Update): Rad mit NP = Timer-Dauer × (NP / LT2)² × 100, LT2 aus `config.last_ref.rad` (je Datum der
  letzte Test davor, vor dem ersten der erste, gekennzeichnet; nie FTP, keine Umrechnung zwischen Leistungsmessern); sonst `tl2` = `tss`.
  Hinterlegt seit 9.11.2026: die LT2-Vorschau aus dem Rad-Stufentest 29.4.2026, «vorläufig» (Test nicht ausbelastet; Wert nur verschlüsselt
  in den Daten, nie in Doku oder Tests). Vergleich: `python3 -I tools/last.py data.json
  --vergleich [--wochen 12] [--bis JJJJ-MM-TT]`.
- **V6.6.2 last-2.1 (Prüfbericht vom 13.11.2026, Befunde 5–7):** eine LT2 gilt nur für das System, auf dem sie gemessen wurde – `system` je Eintrag
  in `config.last_ref.rad`: «rolle» (Zwift/Indoor; ohne Angabe, alle Tests bis V6.6.1) oder «draussen». Rad auf der Rolle mit NP gegen die LT2 der Rolle;
  Rad draussen mit NP gegen eine LT2 für draussen, sonst nach Puls: Timer-Dauer × min(1,15; Ø-Puls / `config.lthr.rad`)² × 100 (wie Einheiten ohne
  Leistung); ohne Puls bleibt die gelieferte Last (gekennzeichnet). `tl2q` je Radeinheit: «lt2-rolle», «lt2-draussen», «puls», «wie geliefert».
- **Neuer Rad-Stufentest:** erst nach B1 (bestätigt) und `check_referenz.py` «GESAMT: bestanden» einen Eintrag ergänzen
  (`ab` = Testdatum, `lt2_w`, `lt2_genau_w`, `methode`, `test` = ID in `schwellen.tests`, `system` «rolle»/«draussen», `quelle`, `status`, `festgelegt`) – mit Silas' Okay
  zur Methode, nie eine Schwelle ausserhalb der Stufen. Über `work/new.json` `"config": {"last_ref": {…}}` mit der **ganzen** Liste (config
  ersetzt den Schlüssel), dann `merge_daily.py`. Ältere Einträge bleiben (Fahrten davor rechnen weiter mit ihnen).
- `config.load_model` steuert, was die Seite verwendet: `"garmin"` (Standard, `tss` wie geliefert), `"last-2.1"` bzw. `"last-2.0"` (beide `tl2` in der
  Fassung von `tools/last.py`; erst nach Silas' Okay zum Vergleich) oder `"ftp_est"` (alte Probe aus NP und `ftp_e`, nicht mehr verfolgt). Die Seite zeigt den Vergleich in Fortschritt
  «Wochenlast je Sportart». **Seit 14.11.2026 `"last-2.1"`** (Silas' Okay: Rolle mit der LT2, draussen nach Puls mit dem Schwellenpuls Rad; im Audit vermerkt).
  Zurück auf die Garmin-Werte nur auf seinen Wunsch (`tss` bleibt immer gespeichert).
- `config.ftp` bleibt der Garmin-Wert (für `tss` im Nacht-Update); die Seite braucht ihn mit last-2.0 nicht mehr.
- Einspielen ohne Garmin-Daten (nur `config`, Laktat, Eingaben) lässt `updated` («Daten vom …») stehen.

## Laktat (kommt über den Chat)
- **Kurzcheck** (meist Zwift, Block z. B. 10 min @ 220 W, Laktat am Ende des Blocks): Einheit finden, Block über Runden
  (`get_activity_splits`) oder eine hochgeladene FIT-Datei bestimmen. Werte: NP, Puls Ø, Puls max, Pulsanstieg
  (Ø 2. Hälfte gegenüber 1. Hälfte in %).
  Eintrag: `{"kind":"check","date":"…","sport":"rad","block":"10 min @ 220 W","w":220,"np":…,"hr_avg":…,"hr_max":…,"drift":…,"lactate":…,"note":"…","activity":"g<ID>"}`
- **Stufentest** (Laktat in der letzten Minute jeder Stufe): Puls je Stufe aus der letzten Minute.
  Eintrag: `{"kind":"stufentest","date":"…","sport":"rad","stages":[{"w":180,"hr":132,"la":1.1}],"note":"…"}`; Lauf mit `"pace_s"` (s/km) statt `"w"`.
- Einträge über `"lactate_add": [ … ]` in `work/new.json` einspielen (merge_daily.py), dann verschlüsseln und pushen.
- **Kurzchecks aus Garmin-Notizen** (z. B. «Min 40: x,x mmol/l | 10 min davor (30–40) …»): seit V6.1 legt `merge_daily.py` daraus selbst eine
  Vorschau an (notizen-1.0, «ln-<gid>-<Minute>», Werte laut Notiz, nicht aus FIT nachgerechnet; nichts doppelt zu `lactate`, anderen Vorschauen
  oder `laktat_punkte`). Nachrechnen aus FIT wie bisher über `laktat_vorschau.py --extra` mit derselben ID, `aktivitaet_garmin` (gespeicherte
  `get_activity_fit_data`-Antwort), `aktivitaet_id` und `fenster` (Ortszeit des Blocks; hat Silas vor dem Abstechen schon angehalten, das
  Fenster bis zum Anhalten nehmen und das im Hinweis sagen). Seit V6.4.4 bleibt eine so nachgerechnete Vorschau beim nächsten Update stehen
  (`notizen.ableiten` ersetzt nur Vorschauen, die selbst aus der Notiz stammen). Bestätigung (B1) auf der Seite oder im Chat («bestätigt» → `"laktat_bestaetigt": [ids]`).
- **V5.9.6 Einzelmessungen über die Zeit (`laktat-drift-1.0`):** `laktat_vorschau.py` rechnet je Check-Block `t_s` (Fahrzeit bis zum Blockende),
  `el_s`, `pause_s`, `pause_timer_s`; B1 übernimmt sie nach `lactate`. Die Seite («Einzelmessungen») zeigt Laktat über die Zeit in der Einheit,
  verbindet nur gleiche Einheit und gleiche Leistung (±5 %) und urteilt «steigt/gleich/sinkt» erst über 2·√(σ₁² + σ₂²), σ = max(0,15; 7,5 %).
- **V5.6 Laktatpunkte aus dem Explorer** (`laktat_punkte`, Status «vorschau», mit Abschnitt von/bis, Ø W, NP, Puls bzw. Pace): Silas zeigen;
  erst nach seiner Bestätigung als Kurzcheck über `lactate_add` übernehmen (`activity` = ID, Werte aus dem Abschnitt, Notiz «aus Explorer»).
- **V7.6.2 Kurzcheck nach Puls (`laktat-hf-1.0`, Silas' Wunsch vom 17.11.2026, für Skitour, Wandern, Langlauf, Grundlage):** im Explorer wählbar «Puls aus den 10, 15 oder 20 min
  vor der Messung» (`AN.laktatFenster`; Standard 10 min ausser Rad und Laufen, dort wie bisher Intervall bzw. 5 min). Gespeichert im Laktatpunkt: `abschnitt.hr_max`,
  `hr_anstieg` (2. gegen 1. Hälfte in %, wie beim Kurzcheck), `fenster_s`, `t_timer`; aus einer Notiz-Vorschau «ln-…» mit `vorschau` = deren ID (die Seite bietet im
  Bestätigen-Blatt «Puls aus der Aufzeichnung»; `notizen._gleiche_messung` legt die Vorschau dann nicht erneut an). `merge_daily.laktatpunkt_uebernehmen` übernimmt
  `hr_max`, `drift` = Pulsanstieg, `el_s`, `t_s`, `fenster_s`. Zonen ändern sich dadurch nie; die Zonen-Prüfung für Einheiten nach Puls ist nur vorgeschlagen (Etappe 4).
- **Tabellen (Excel der SOMC-Vorlage), Laborberichte, Werte aus dem Chat: zuerst nur Vorschau (A5).**
  Excel in einen eigenen Ordner ausserhalb des Repos kopieren, Rohdaten (FIT) wie beim Monatsexport bereitstellen, dann
  `python3 -I tools/laktat_vorschau.py data.json --files work/files.json --xlsx <datei.xlsx> [--extra <werte.json>]`.
  Jeder Wert trägt seine Quelle (Datei, Blatt, Zelle). Abweichung > 5 W bzw. 0,3 km/h oder keine Aktivität = «unklar».
  Die Vorschau zeigt die Seite im Testzentrum. Übernommen (nach `lactate`) wird erst nach Silas' Bestätigung (Schritt B1).
  Schwellen je Methode erst mit B1; nie eine Schwelle ausserhalb der gemessenen Stufen.

## Punkte (GPX kommt über den Chat)
Wegpunkte, z. B. Jagdposten aus Garmin Explore: GPX in einen eigenen, leeren Ordner ausserhalb des Repos kopieren, entschlüsseln,
`python3 -I tools/import_points.py data.json <datei.gpx>` (ersetzt früher importierte Punkte), verschlüsseln, nur `data.enc.json` committen.
Kategorie nach Name (Post, Hochsitz, Ansitz … → Jagdposten, sonst «Sonstiges» usw.). **punkte-1.1:** Kategorien von Hand (`cat_hand`, seit 14.11.2026
die Punkte im Jagdgebiet als Jagdposten, im Audit vermerkt) bleiben beim neuen Import (gleicher Name, höchstens 50 m entfernt). Jagdposten sind auf
der Karte ausgeblendet, bis Silas sie unter «Karten & Ebenen» → «Jagdposten» (oder «Filter & Punkte») einblendet; die anderen Kategorien sind an.
Neue Punkte ohne erkennbare Art im Jagdgebiet landen unter «Sonstiges»: Silas fragen, nie selbst raten.

## Testkalender
`tests` in den Daten: `[{"date":"…","kind":"stufentest"|"check"|"css","note":"…","status":"vorschlag"|"geplant"}]`.
Änderungen über `"tests": [ … ]` (ersetzt die ganze Liste) in `work/new.json`. Erledigt: Laktat-Tests durch einen Eintrag in `lactate` gleicher
Art (Stufentests nur derselben Sportart, `V62.testSport`; fehlt `sport` im Testkalender, gilt «Lauf» in der Notiz), CSS-Tests durch einen CSS-Test in `css_tests` (bzw. auf dem Gerät), je höchstens 4 Tage daneben (`V59L.testsMitStatus`).
**Schwimmen (V5.9.4, css-2.0, E6):** Als Schwimm-Massstab zählt nur der CSS-Test (400 m und 200 m; CSS = (T400 − T200) ÷ 2 pro 100 m).
Termine (`kind` «css», «geplant») stehen nur verschlüsselt im Testkalender (nicht an Kursabenden und nie während Abwesenheiten; Termine und
Abwesenheiten nie in Doku, Code oder Tests). Eintrag auf der Seite mit zwei Zeiten (Rest
optional), über «Direkt speichern» → `css_tests`. Rohpace aus Garmin, Videovergleich und Fehlerboard sind ausgeblendet (Daten bleiben);
Technik wertet Claude im Chat aus (Videos Bild für Bild), nie auf der Seite.
**Schwimm-Einheiten (V7.2, schwimmeinheit-1.0, uebungen-2.0; seit V7.3.2 schwimmeinheit-1.1, uebungen-2.1; seit V7.5 schwimmeinheit-1.2):** eigene Schwimm-Einheiten werden als Serien wie im Becken gezeigt (Meter, Bahnen,
Pausen, Hilfsmittel); Tempo nur aus dem CSS-Test (locker CSS + 15–20 s, Grundlage CSS + 8–12 s, Annahmen), ohne Test nach Anstrengung. Übungstexte
sind eigene Beschreibungen (nie aus Enduco oder Webseiten übernehmen); Hilfsmittel nur Brett, Pullbuoy, Flossen, Paddles (Schnorchel nur als Garmin-Feld).
**uebungen-2.1 (V7.3.2):** `SW.ENDUCO` = die 27 Kraul-Übungen aus Silas' Enduco-Einheiten (seine Liste vom 16.11.2026, PDF nie ins Repository): Name als
Name oder Synonym, Übungsstrecke 12,5/25/50 m und nötige Hilfsmittel wie dort, Texte eigen. Abwechslung `SW.uebungenDerWoche`: je Woche drei Übungen
aus drei von fünf Gruppen (`SW.ROTATION`, eigene Einteilung), jede Gruppe beim nächsten Mal mit der nächsten Übung; «Schulterdehnung» nur im Katalog
(Ausführung unklar). schwimmeinheit-1.1: immer drei Übungen je 2 ×, Strecke laut Liste, dann die Bahn locker fertig, 5 s Pause (wie Enduco); keine
Brett-Beine als Übung, wenn die Einheit einen Beine-Block hat. schwimmeinheit-1.2 (V7.5, Planeinstellungen): Übungen nur mit vorhandenen Hilfsmitteln; ohne Brett
Beine in Seitlage mit Flossen, ohne beides kein Beine-Block; ohne Pullbuoy kein Pull; im Ein- und Ausschwimmen am Ende ein Teil im Stil der Woche (Rücken bzw. Brust,
abwechselnd, wenn beide gewählt; auf der Uhr backstroke bzw. breaststroke, sonst «free», V7.5.1); Anfänger-Modus (V7.5.1): keine anspruchsvollen Übungen (`SW.ANSPRUCHSVOLL`),
15 s Pause, Hauptserie 100 m mit 45 s, CSS 50 m mit 30 s, Beine und Steigerungen 25 m, Pull 50 m mit 30 s; die Technikübungen stehen immer direkt nach dem
Einschwimmen (Silas' Wunsch vom 17.11.2026, Test in `tests/test_v75.cjs`).
Protokoll-Vorlagen: `protokolle` (Liste mit `id name sport ablauf blut ende rahmen status`), ändern über `"protokolle": [ … ]` in `work/new.json`.
**Testplan (V6.2, testplan-1.0, `js/v62.js`):** Die Seite schlägt Tests nach festen Regeln selbst vor (Status «vorschlag», Regel sichtbar), in
Testkalender, Kalender und auf Heute (heute/morgen): CSS alle 6–8 Wochen am gleichen Wochentag wie zuletzt; Rad-Stufentest alle 8 Wochen am Samstag
einer Erholungswoche (saison-1.2), zuerst ein ausbelasteter, wenn der letzte es nicht war; Lauf-Stufentest alle 8–12 Wochen in einer anderen
Erholungswoche (auch eingetragene Lauf-Tests sperren ihre Woche für den Rad-Vorschlag und umgekehrt); Kurzcheck alle 2 Wochen in einer Grundlagenfahrt
(rollend 8 Wochen, der gewählte Tag nicht 4 Tage neben einem Stufentest); CSS-Vorschläge nur 6–8 Wochen nach dem letzten, sonst mit Begründung; kein Stufentest 14 Tage
vor einem Rennen, in der Woche danach und im Taper. Eingetragene Termine (`tests`) gehen vor; Regelverstösse werden mit einem Vorschlag gezeigt,
nie still geändert. Abwesenheiten («keine Tests») trägt Silas auf der Seite ein (Notiz `tp-sperren`, verschlüsselt über «Direkt speichern»);
nie Reisedaten in Doku, Code oder Tests schreiben. Nach Garmin wird nichts geschrieben.

## Test-Workouts (A9)
`python3 -I tools/workouts.py <ordner>` erzeugt `.zwo` (Zwift, ftpOverride 100 → Power 1.2 = 120 W) und `.garmin.json`
(für `upload_workout`, Leistungsbereich `power.between`, eine Runde je Stufe). **Nie ohne Silas' Freigabe hochladen,
einplanen oder an ein Gerät senden.** Mit Freigabe: `upload_workout` → `schedule_workout(Datum)`; enduco-Workouts nie ändern.

## Referenzsatz und Versionen (A1)
Der Referenzsatz (10 Einheiten mit Handwerten) liegt nur verschlüsselt in `data.json` unter `referenz`, nie offen im Repo.
Jede Kennzahl hat eine Version (`versions`). Ändert sich eine Regel: Version erhöhen, `check_referenz.py` laufen lassen,
Abweichungen Silas zeigen, erst dann neue Werte speichern.
