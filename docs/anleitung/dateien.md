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
- **V9.1 (Auftrag V9, Etappe 1, zusammen-1.0; 20.11.2026):** `js/v91.js` (ohne DOM: `V91.zuordnen` – absolvierte Aktivität gehört zur geplanten Einheit desselben Tages und derselben
  Sportart, `V91.vergleich`, `V91.heuteSatz`), genutzt von `js/v7-ui.js` (Liste/Wochenansicht), `js/v6-heute.js`, `js/v59.js` (Tagesblatt), `js/v78-ui.js`, `js/v81-ui.js`
  (Einheit-Seite, «Passt zu: … (Mein Plan)»), `js/explorer.js`; `tests/test_v91.cjs`. Nachträge: alles-neu-1.0 (`V66.aendern` Art «neuberechnen» mit `alles`, `js/v66-ui.js` «Alles neu
  verteilen», Test in `tests/test_v66.cjs`) und V9.1.1 (22.11.2026) kalender-direkt-1.0 / anpassen-automatisch-1.0: `V66UI.nachAenderung(ds)` (Blatt zu, Kalender-Liste am Tag; in
  `js/v66-ui.js`, `js/v73-ui.js`, `js/v77-ui.js`), `V66UI.vfFolgen(ds)` (nach der Tages-Verfügbarkeit «Woche anpassen» bei bearbeiteter Woche, ganz festgehalten oder teilweise gespeichert),
  `tests/test_v911.cjs`
- **V9.2 (Auftrag «Woche wie Enduco», Etappe W1; 22.11.2026):** `js/v66.js` (umplanen-1.0, grenzen-1.0, eigenplan-1.3, verfuegbarkeit-1.3: `V66.aendern` Art «umplanen»
  (Alias «anpassen»), `V66.stehtFuer`, `V66.istAnker`, `V66.umplanenRein`, «Neu berechnen» über denselben Kern, Streichungen aus «entfernen»/«leeren», `anker` beim Verschieben,
  `statt` beim Ersetzen, `V66.verteilen` opt.`extra`), `js/v92.js` (neu, ohne DOM: `V92.diff`, `V92.zuordnung`, `V92.zeilen`, `V92.fingerabdruck`, `V92.fragen`, `V92.kandidaten`,
  `V92.vorschlaege`, `V92.eintraege`, `V92.zustand`), `js/v92-ui.js` (neu: `V92UI.wocheEinstellen`, `V92UI.frage`, `V92UI.berichtHTML`/`berichtBinden`/`berichtDetails`),
  `js/v66-ui.js` (`V66UI.planen`, `stand`, `bericht`, `berichtWeg`, `rueckgaengig`, `ausgleichen`, `frageDaten`, `probe`, `frageJa`, `frageNein`, `frageWennNoetig`, `vfSpeichern`;
  Garmin `auftraegeWoche`, «Auf der Uhr steht noch …»; Tagesblatt-Verfügbarkeit auch im Entwurf), `js/v78.js` (Entwurf mit Verfügbarkeit: `vfSetzen`, `vfZurueck`, `vf`),
  `js/v64-ui.js` (Verfügbarkeit mit Entwurf), `js/v78-ui.js` (Bericht `#kal-bericht`, ✨ = umplanen, fehlende Zeit in der Wochenkarte), `js/v59.js` (`V59.nachSchliessen`),
  `js/v76.js` (Krafttag in der Zeit, nicht an von Hand gesetzten Tagen mit Sportarten), `js/v83.js` (Vorschläge ohne Toleranz), `js/v75-ui.js`, `js/wissen.js` (1.34),
  `tools/merge_daily.py` (gestrichen, anker, statt), `css/v6.css`, `index.html`, `sw.js`, `tests/sim/umgebung.cjs`; Test `tests/test_v92.cjs`; Auftrag `docs/auftrag-enduco-woche.md`
- **V9.2.1 (Folgewoche, umplanen-1.1; 22.11.2026):** `js/v66.js` (`V66.verteilen` opt.`vorher`/`vorherDatum`, `V66.vortagBindet`, `V66.wocheVerteilt` mit Vortag),
  `js/v64-ui.js` (`vortag`, `K.vorher`, `V64UI.projLeeren`), `js/v66-ui.js` (`folgeWoche`, `folgeZeilen`, Bericht «Nächste Woche», ↶ und ✓ mit Folgewoche), `js/wissen.js` (1.35)
- **V9.3 (Auftrag «Woche wie Enduco», Etappe W2; 22.11.2026):** `js/v93.js` (neu, ohne DOM: `V93.kugel`, `V93.kugelStil`, `V93.balkenAnteil`, `V93.anzahl`, `V93.zeile`, `V93.zeichen`),
  `js/v78-ui.js` (Raster, Tageskopf, Einheit, Wochenkopf, Wochenleiste, Wochenkarte mit Statuskurve), `js/v6.js` (Zonenfarben, Symbole `kalenderfrei`, `mond`), `js/v59.js` (`data-art`),
  `css/v6.css` (Abschnitt V9.3), `index.html`, `sw.js`, `tests/sim/umgebung.cjs`; Test `tests/test_v93.cjs`
- **V9.3.1 (Analysen ohne kranke oder untypische Einheiten, analyse-gesund-1.0; 22.11.2026):** `js/formkurve.js` (`FK.GESUND`, `FK.gesundheit`, `FK.nichtRepraesentativ`,
  `FK.gesundheitSetzen`, `FK.nichtRepraesentativGrund`; laufvergleich-1.1, laufeffizienz-1.2, entwicklung-1.1), `js/v82.js` (Rad-Effizienz), `index.html` (Anmeldung beim Laden, Notiz
  Lauf-Effizienz), `js/wissen.js` (1.36)
- **V9.3.2 (Bearbeiten-Woche, Griff ziehen, Feinschliff, eigene Markierung; 22.11.2026):** `js/v78.js` (`V78.bearbeitenAb`, kalender-4.2, bearbeiten-1.1), `js/v78-ui.js` (Griff ziehen
  `griffZiehen`/`zeilenSetzen`, Zyklus-Raster, absolvierte Zeile, Tageskopf ohne Schloss, ✨ «Anpassen oder neu berechnen?»), `js/v93.js` (woche-look-1.1), `js/formkurve.js`
  (`FK.MARKE`, `FK.markierung`, analyse-gesund-1.1), `index.html` (Monat-Knopf aus, KW-Zeile aus, Wochenzeile im Zyklus, «Nach dem Training» an `FK.gesundheitSetzen`), `css/v6.css`
  (Abschnitt V9.3.2, `--wk-neu`), `js/wissen.js` (1.37), `tests/test_v93.cjs`, `tests/test_formkurve.cjs`
- **V9.5 (Zeit und Intensität, zeit-intensitaet-1.0; 23.11.2026):** `js/v66.js` (`V66.ZIEL`, `V66.zeitZiel`, `V66.zielWoche`, Verdichten in `V66.verteilen` opt.`ziel`,
  `V66.dichtTeile`/`dichtMax`/`dichtAnwenden`, `V66.zielText`/`zielZeilen`, `V66.zielFp`/`zielAusGilt`; `V66.einheit` mit `dicht`/`zusatz`), `js/v64-ui.js` (`K.ziel`,
  `K.w0vorZiel`), `js/v66-ui.js` (`ctx.ziel`, Bericht), `js/v78-ui.js` (Zyklus-Bereich), `js/v92.js` (`V92.zielBericht`), `tools/merge_daily.py` (`dicht`, `zusatz`, `zielAus`),
  `js/wissen.js` (1.38), `tests/test_v95.cjs`, `tests/test_tools.py`
- **V9.11.0 (Tagesregel, tagesregel-1.0; 23.11.2026):** `js/v66.js` (`V66.TAGESMAX`/`LANG_ANTEIL`/`LANG_UMBENENNEN`, `regelGrund`, Zusammenlegen, «Grundlage» statt kurzer «Lange Ausfahrt»,
  `E.verteilung.dritte`/`zusammen`), `js/v66-ui.js` (`M.probe(...).info`), `js/v92.js` (`V92.hinweise`, `V92.mehrVon`), `js/v92-ui.js` (Hinweis im Dialog), `tests/test_v9110.cjs`
- **V9.12.0 (Schwimm-Datenseiten, schwimmseiten-1.0, schwimmzonen-1.0; 23.11.2026):** `js/v55-schwimmen.js` (`V.zonen`, `V.zonenHTML`, `V.testHTML`, `V.cssAktuell`, Feld «Schätzung»), `js/schwimmen.js`
  (`SW.cssZonen`, `SW.zoneText`, `SW.ZONEN_ANTEIL`), `js/v59-logik.js` und `js/v82.js` und `js/formkurve.js` (Schätzung erledigt keinen Test, ist nur Vorschau), `index.html` (Karten «CSS und Zonen im Wasser»,
  «Test-Einheit»; Kalender, Jahresübersicht, Testplan), `js/v5-ui.js` (Pille «geschätzt»), `css/v6.css`, `tests/sim/seite.cjs`, `tests/test_v9120.cjs`
- **V9.20.0 (Mapy, mapy-1.0; 24.11.2026):** `js/karte-ebenen.js` (`KE.MAPY`, `mapySchluessel`, `mapyQuellen`, `mapyLayer`, Eintrag in `KE.QUELLEN`), `index.html` (`MAPY_KEY`, Knöpfe, `mapyLogo`, Sperre in `setBase`), `sw.js` (Cache `notebook-v9200-mapy-2026-11-24`), `tests/test_v9200.cjs`, `tools/durchklick_karte.py` (121 Schritte), `docs/versionsliste-v9.20.md`.
- **V9.13.0 (Karte einfach, karte-einfach-1.0; 24.11.2026):** `js/karte-ebenen.js` (neu, `KE`: Grundkarten, Vorlagen, Deckkraft, aktive Ebenen, Quellen, Reiter), `index.html` (Kartenknöpfe, Ebenen-Blatt, Reiter in «Meine Daten», Ortssuche, Stil), `sw.js`, `tests/test_v9130.cjs`, `tools/durchklick_karte.py`.
- **V9.16.0 (Vorschläge antippen, bearbeiten, abbrechen; trainingsroute-1.2, abbrechen-1.0; 24.11.2026):** `js/training-ui.js` (Linien antippbar: `tr-kand-sel`, `tr-kand-hit`, `markiere`, `kartenKlick`; «Bearbeiten»; «Schritt x von y» und «Abbrechen»: `abbrechen`, `statusZeichnen`), `js/training-route.js` (`TR.name`/`TR.NAME`, `TR.FORM`-Texte, Fortschritt mit `{n, von}` und `io.abbruch` in `TR.suche`), `js/route.js` (`RT.signalKoppeln`, `opt.signal` in `fetchLeg`/`fetchPts`), `js/routen-ui.js` (Klick an `TRUI.kartenKlick`, Menü «Hin und zurück»), `js/planer-schlank.js` (Menütext), `index.html` (CSS), `sw.js` (`notebook-v9160-routen-2026-11-24`), `tests/test_v9160.cjs`, `tools/durchklick_vorschlaege.py`, `docs/versionsliste-v9.16.md`.
- **V9.15.1 (24.11.2026):** `js/training-ui.js` (`TRUI.gpxExtras` gibt `null` zurück: keine Intervall-Wegpunkte im GPX; Hinweistext), `sw.js`, `tests/test_v9151.cjs`
- **V9.15.0 (Planer schlank, planer-schlank-1.0; 24.11.2026):** `js/planer-schlank.js` (neu, `PS`: Sportgruppen, Merken, gebündelte Einwilligung, Magnet, Leiste, Name), `js/routen-ui.js` (Gerüst, Sportleiste, Magnet, Einwilligung, Leiste, Details, ⋯-Menü, Fertig), `index.html` (Skript, CSS `.rp-top/.rp-fuss/.rp-menu …`, Blatt-Mindesthöhe 200 px), `sw.js`, `tests/test_v9150.cjs`, `tools/durchklick_planer.py`, `docs/versionsliste-v9.15.md`
- **V9.14.0 (Strecke an Garmin senden, gpx-export-2.0, strecken-senden-1.0; 24.11.2026):** `js/strecke-garmin.js` (neu, `SG`: `pruefenGpx`, `auftrag`, `stand`, `typFuer`, `beschreibung`), `js/routen-ui.js` (Knopf «An Garmin senden»,
  Bestätigungsfeld, Stand), `js/eingang.js` und `js/v5-ui.js` (Eingabe `strecke_senden`), `tools/strecken_senden.py` (neu: Prüfung, `plan`, `eintragen`), `tools/merge_daily.py` und `tools/eingaben_lib.mjs`
  (`strecke_senden_add` → `strecken_auftraege`, `strecken_abgelehnt`), `index.html` (Skript, Stil `.rp-gs`), `sw.js`, `tests/test_v9140.cjs`, `tests/test_tools.py` (Abschnitt V9.14)
- **V9.14.1 (24.11.2026):** `js/strecke-garmin.js` (`SG.UPLOAD_MOEGLICH = false`), `js/routen-ui.js` (Knopf und Hinweis nur bei `UPLOAD_MOEGLICH`), `sw.js`, `tests/test_v9140.cjs`; Grund in `garmin.md` («Einschränkung Upload»)
- **V9.3.3 (W2c Enduco-Look für Plan, Heute, Profil, enduco-look-1.0; 23.11.2026):** `js/v7-ui.js` (Plan-Kopf), `js/v6-heute.js` und `index.html` («Diese Woche»), `js/v59.js` (Profil-Kopf),
  `js/v6.js` (Symbol `person`), `css/v6.css`, `tests/test_v933.cjs`
- **V9.6 (W5 Automatisch senden als Einstellung, garmin-auto-1.0; 23.11.2026, nicht eingeschaltet):** `js/v75.js` (`pe-garmin`, `V75.GARMIN`, `garminZeiten`), `js/v75-ui.js`
  (Zeile und Blatt «Garmin senden», `V75UI.garmin`), `js/v66-ui.js` (`garminAuto`, `alleTage`, Tagesblatt), `js/v74-ui.js`, `js/v73-ui.js`, `css/v6.css`, `tools/garmin_senden.py`
  (`einstellung`, «Senden ab», «Aus»), `tools/merge_daily.py` (`pe-garmin` geprüft), `tests/test_v96.cjs`, `tests/test_tools.py`
- **V9.4 (W3 Training planen und bearbeiten wie Enduco, planen-fluss-1.0; 23.11.2026, nach V9.9 gebaut):** `js/v94.js` (neu: `V94.STUFEN`, `V94.stufeVon`, `V94.stufen`,
  `V94.achse`), `js/v66-ui.js` (`stufenBlatt`, `vorlagenBlatt` je Stufe, `dauerBlatt` neu), `js/v73-ui.js` («Training bearbeiten» mit «Zu Indoor/Draussen ändern», `opt.bearbeiten`),
  `js/v78-ui.js` (Bearbeiten-Modus öffnet gleich «Training bearbeiten»), `js/v6-heute.js`, `js/wissen.js` (1.40), `css/v6.css`, `index.html`, `sw.js`, `tests/test_v94.cjs`
- **V9.9 (Heute schlicht, heute-einfach-1.0; 23.11.2026):** `js/v91.js` (`V91.heuteAntwort`, `V91.dauerText`), `js/v59.js` (Begrüssung, Check-in-Zeile), `js/v74-ui.js`, `css/v6.css`,
  `tests/test_v99.cjs`
- **V9.8 (Check-in passt an, checkin-anpassung-1.0 / ampel-plan-1.3; 23.11.2026):** `js/v74.js` (`V74.wirkung`, `angenommen` in `eintrag`/`pruefen`/`zusammen`), `js/v74-ui.js`
  (Karte `aa-vorschlag`, `V74UI.vorschau`, `V74UI.ueberpruefen`, «Ignorieren»/«Doch anpassen»/«Rückgängig»), `js/v64-ui.js` (Ampel-Hinweis), `js/wissen.js` (1.39), `css/v6.css`,
  `tools/ampel_heute.mjs`, `tools/merge_daily.py`, `tools/garmin_senden.py`, `tests/sim/lauf.cjs` (Haken `ampel`), `tests/test_v98.cjs`, `tests/test_tools.py`
- **V9.5.1 (Griff fliessend, kalender-4.3; 23.11.2026):** `js/v78.js` (`V78.ziehRaster`, `V78.ziehFenster`, `V78.ziehZiel`), `js/v78-ui.js` (`griffZiehen`), `css/v6.css`, `tests/test_v93.cjs`
- `tools/fit_nacht.py` – Nacht-Update: Sekundenwerte einer neuen Aktivität auswerten (A2)
- `tools/laktat_vorschau.py` – Laktat-Tabellen einlesen, Stufen zuordnen, als Vorschau speichern (A5)
- `tools/check_referenz.py` – Referenzsatz und Neuberechnung prüfen (A1)
- `tools/workouts.py` – Test-Workouts für Zwift (.zwo) und Garmin (JSON), A9; V9.10.0: Lauf-Stufentest und CSS-Test 400/200
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


- **V9.17.0 (Intensitätszonen wie enduco, zonen-ansicht-1.0; 24.11.2026):** `js/zonen-ansicht.js` (neu, `ZA`, rein: Angebot der Sportarten und Messgrössen, Ruhepuls, Modell, Bereich, HTML), `index.html` (Karte `#iz-card`), `js/v5-ui.js` (`V.intensitaetszonen`), `css/v6.css` (`.iz-*`), `sw.js`, `tests/test_v9170.cjs`, `tools/durchklick_zonen.py`
- **V9.18.0 (FatMax und Sweet Spot als Stufen, intensitaet-stufen-1.0; 24.11.2026):** `js/v94.js` (Stufen `fatmax`, `sweet` mit `unter`), `js/v66-ui.js` und `css/v6.css` (eingerückte Unterstufen), `js/v64.js` (Abschnitt `fatmax`: Farbe, Name, Ziel, Pace), `js/v64-ui.js`, `js/v66.js` (`ARTEN`, `ZU`, `fatmax` in Wert-Tabellen, RPE, `garminZiel`, `garminPuls`, Baustein-Marke `dyn`), `js/v73.js` und `js/v73-ui.js` (Zone, Text, Blockname, Z2-Erholung, Gruppieren), `tests/test_v9180.cjs`, `tests/test_v94.cjs`, `tools/durchklick_stufen.py`
- **V9.19.0 (Neue Vorlagen nach enduco, vorlagen-enduco-1.0; 24.11.2026):** `js/v64.js` (Bausteine `rad_fatmax`, `rad_fatmax_int`, `rad_fatmax_pyr`, `rad_sweet`, `rad_sweet_int`, `lauf_fatmax`, `lauf_fatmax_int`, `lauf_sweet`), `js/v66.js` (`ZU`), `sw.js`, `tests/test_v9190.cjs`, `docs/versionsliste-v9.19.md`
