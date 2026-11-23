# Änderungen

## V9.9.2 · 23.11.2026 · Z5 «bis Max» (zone5-max-1.0)
Silas (23.11.): «Z5 ohne Obergrenze» – Absicht, «bis Max» nachgeliefert; «ja du kannst das alles machen».
- Die Pulszone Z5 zeigt die Obergrenze, wenn das Zonenprofil einen Maximalpuls (`hfmax` der Pulsskala) hat: Zonenliste «180–190 bpm (Max)» (Beispielwerte), Pace und Leistung «… (bis Max)»,
  Briefing-Text «Puls 180–190 (bis Max, steigt verzögert)», «Intensitätszonen» «Puls 180–190 (Max)».
- Garmin-Pulsziel VO2max: geschlossen bis zum Maximalpuls (statt «über», Obergrenze 1,1 × Untergrenze). Ohne Maximalpuls im Profil ändert sich nichts.
- `TR.zonen` gibt den Maximalpuls je Pulsskala mit (nicht aufzählbar, Daten unverändert). Test `tests/test_v992.cjs` (neu, 4).

## V9.9.1 · 23.11.2026 · Fehler «W is not defined» im Blatt «Woche bearbeiten» behoben
Prüfung 23.11. (Stand-Sitzung): das «…» an einer Woche öffnete «Woche bearbeiten» nicht (`V66UI.wocheAktionen`, seit V9.1, von keinem Test erfasst).
- Behoben: `const W = V6();` in `js/v66-ui.js`. Test `tests/test_v991.cjs` (neu, 2) öffnet das Blatt im Simulator für diese, die nächste und eine vergangene Woche (schlug vorher fehl).

## V9.3.3 · 23.11.2026 · Enduco-Look für Plan, Heute und Profil (W2c, enduco-look-1.0)
Silas (23.11.): «W2c kannst du machen» – nach seinen Enduco-Screenshots (Archiv_1.zip, nicht im Repo).
- Plan: Kopf mit zwei Kacheln «Training» (absolviert / Mein Plan dieser Woche) und «Bis zum Rennen» (Wochen, Tage), Knöpfe «Kalender» und «Plan verwalten».
- Heute, «Diese Woche»: Phase unter dem Titel (wie Enduco «Du bist in Woche …»), der lange Erklärtext ist weg.
- Profil: heisst «Profil» und beginnt mit einem Kopf (Kreis, «Dein Profil», Trainingsdaten seit … · Anzahl Aktivitäten).
- Analyse: folgt schon dem Karten-Muster; Zeitraum-Umschalter und Sportfilter der Detailseiten bleiben bei den Etappen E2/E3.
- Test `tests/test_v933.cjs` (neu, 4).

## V9.6 · 23.11.2026 · Automatisch senden als Einstellung (W5, garmin-auto-1.0) – gebaut, nicht eingeschaltet
Silas (23.11.): «W5 bauen, jedoch noch nicht aktivieren.»
- Planeinstellungen → Allgemein → «Garmin senden»: Aus · Nur Tage mit Häkchen (Standard, wie bisher) · Alle Tage; «Senden ab» am Vortag 20:00–23:30 (Standard 23:00).
  Ohne Eintrag ändert sich nichts.
- «Aus»: das Nacht-Update schliesst automatische Aufträge mit «automatisch senden abgestellt» ab; «An Garmin senden» von Hand geht weiter; das Tagesblatt sagt es.
- «Alle Tage» (nur wenn Silas es einschaltet): die Seite legt für morgen bis eine Woche voraus je Tag mit sendbaren Einheiten einen automatischen Auftrag an und erneuert ihn nur bei
  geänderter Fassung; einzelne Tage lassen sich im Tagesblatt abstellen.
- `tools/garmin_senden.py` liest die Einstellung (`einstellung`), `merge_daily.py` prüft sie; Texte «um 23 Uhr» zeigen die eingestellte Uhrzeit.
- Tests `tests/test_v96.cjs` (neu, 5), `tests/test_tools.py` (+4).

## V9.4 · 23.11.2026 · Training planen und bearbeiten wie Enduco (W3, planen-fluss-1.0)
Etappe W3 des Auftrags «Woche wie Enduco» (nach V9.9 gebaut; die Nummer V9.4 war für W3 reserviert).
- «Training planen» statt «Training hinzufügen»: Sportart → **Intensität** (neu: Grundlage · Tempo/Schwelle · VO2max · Test, mit Farbkachel und Kurzsatz; nur, was die Sportart hat)
  → Workout (Name, Dauerbereich, Profil, «Über») → Trainingsdauer (Kacheln Training Load und Distanz, grosses Profil mit Minutenachse, grosse Dauer, Regler; «Speichern» wird weiss,
  sobald der Regler bewegt wurde). Sportarten mit weissen Symbolen.
- «Training bearbeiten» statt «Workout bearbeiten», neu mit «Zu Indoor ändern» / «Zu Draussen ändern». Im Bearbeiten-Modus des Kalenders öffnet Tippen auf eine Einheit gleich dieses Blatt.
- Rechenregeln, Felder und Grenzen unverändert. `js/v94.js` (neu), `js/v66-ui.js`, `js/v73-ui.js`, `js/v78-ui.js`, `js/v6-heute.js`, `js/wissen.js` (1.40), `css/v6.css`, `index.html`,
  `sw.js`; Test `tests/test_v94.cjs` (neu, 5); Demo-Durchlauf mit Playwright (Rad → Tempo/Schwelle → Tempo 2 × 20 → Regler → Speichern → Einheit im Plan; Bearbeiten → Einheit →
  «Training bearbeiten»).

## V9.9 · 23.11.2026 · Heute schlicht (heute-einfach-1.0)
Silas (23.11.): «Es soll möglichst einfach aussehen und sich einfach handhaben.» Punkt «Heute entrümpeln» der offenen Liste (frühere Bedingung «erst Mockup» mit Silas' Freigabe vom 23.11.
«ohne mich andauernd zu fragen» ersetzt).
- Begrüssung = eine Antwort auf «Was mache ich heute?»: «Heute: «Lauf locker» · 50 min.», «Heute noch: …», «Heute erledigt: Schwimmen 51 min.», «Heute ist alles erledigt.», «Heute frei.».
- Fehler behoben: Eine absolvierte Aktivität ohne Einheit in Mein Plan ergab «Heute ist nichts geplant» und die Ampel-Empfehlung dazu.
- Die Ampel-Empfehlung steht nicht mehr unter der Begrüssung (Kachel und Vorschlag zeigen sie), ausser bei Krankheitszeichen oder deutlichen Schmerzen.
- Nach dem Check-in eine Zeile «Check-in erledigt · Ändern» statt aller Werte (Schmerzen und Krankheitszeichen bleiben sichtbar).
- Ampel «vorsichtig» ohne harte Einheit: keine zusätzliche Zeile. «Je Sportart» in Diese Woche mit Pfeil (war nicht als aufklappbar erkennbar).
- `js/v91.js`, `js/v59.js`, `js/v74-ui.js`, `css/v6.css`; Test `tests/test_v99.cjs` (neu, 4).

## V9.8 · 23.11.2026 · Check-in passt an wie Enduco (checkin-anpassung-1.0, ampel-plan-1.3)
Silas (23.11., Aufnahmen 12:27/12:29): «Bei Enduco kommt die Anpassung mit dem Check-in. Dann zeigt er, was er streicht und was er hinzufügt.» Entscheid: wie Enduco, mit Ausnahme.
- Ampel «vorsichtig» ändert heute nicht mehr von selbst: Karte «Heute lieber locker?» mit Grund, «Ignorieren» / «Überprüfen ✨» → Blatt mit «Geändert» (harte Einheit
  durchgestrichen, darunter die lockere) bzw. «Gestrichen» → «Akzeptieren». Bis dahin bleibt der Plan. Angewendet: eine Zeile mit «Rückgängig»; ignoriert: eine Zeile «Doch anpassen».
- Ausnahme: Krankheitszeichen im Check-in → Ruhetag wie bisher von selbst. Ändert sich nichts, keine Frage. Einträge vor ampel-plan-1.3 gelten weiter, wie sie galten.
- Morgen-Update ersetzt auf der Uhr bei «vorsichtig» erst nach «Akzeptieren» (sonst Hinweis); merge_daily prüft und führt `angenommen` zusammen.
- `js/v74.js`, `js/v74-ui.js`, `js/v64-ui.js`, `js/wissen.js` (1.39), `css/v6.css`, `tools/ampel_heute.mjs`, `tools/merge_daily.py`, `tools/garmin_senden.py`, Simulator-Haken `ampel`;
  Tests `tests/test_v98.cjs` (neu, 6), `tests/test_tools.py` (+2), Versionen in `test_v64/v74/v83`. Demo-Durchlauf mit Playwright (Karte → Überprüfen → Akzeptieren → Rückgängig).
- Zurückgestellt: Coach und Ampel in einer Karte (Auftrag Punkt 6).

## V9.5.2 · 23.11.2026 · Coach-Karte schlicht (coach-einfach-1.0)
Silas (23.11., Bild 12:48): «Braucht es diese Infos? Ich will so Sachen nicht sehen – es soll möglichst einfach aussehen und sich einfach handhaben.»
- Die Karte «Coach» auf Heute erscheint nur noch, wenn es etwas zu entscheiden gibt (oder gerade etwas angenommen wurde). Weg: Probelauf-Text, «Keine Änderung nötig …», die Liste
  «Angenommen» der letzten Tage, «Geprüft: …» und der Erklärtext. Je Vorschlag: Titel, ein Grund, was sich ändert, Knöpfe. Nach «Annehmen» eine Zeile mit «Rückgängig» (bis zum nächsten Laden).
- Rechenregeln des Coaches unverändert. `js/v83-ui.js`, `index.html` (Karte ohne Untertitel, anfangs verborgen), `css/v6.css`.

## V9.5.1 · 23.11.2026 · Griff fliessend (kalender-4.3)
Silas (23.11., Aufnahme 12:20): «Das Verschieben des Balkens funktioniert nicht flüssig … es soll nicht eine Stufe oben und unten geben, sondern fliessend eingestellt werden können.»
- Der Griff unter dem Raster (Liste und Zyklus) zieht das Raster jetzt Pixel für Pixel mit: bis zwei Wochen wächst es nach unten, darüber klappen die übrigen Wochen des Monats um die
  gewählte Woche auf. Beim Loslassen rastet es weich auf 1 Woche, 2 Wochen oder Monat ein (die nächste; ein schneller Wisch geht weiter in seine Richtung). Vorher sprang es je 44 px um
  eine Stufe und zeichnete dabei alles neu.
- Fehler behoben: Beim Ziehen konnte das Mitführen des Tags (Scrollen der Liste) das Raster neu zeichnen und das Ziehen abreissen.
- `js/v78.js` (kalender-4.3: `V78.ziehRaster`, `V78.ziehFenster`, `V78.ziehZiel`), `js/v78-ui.js` (`griffZiehen`, Ausschnitt `.k4-auf`), `css/v6.css`; Tests `tests/test_v93.cjs`
  (+1, kalender-4.3), `tests/test_v78.cjs` (Version). Demo-Durchlauf mit Playwright (Liste und Zyklus: Höhe folgt dem Finger in 13-px-Schritten ohne Sprung, rastet ein).

## V9.5 · 23.11.2026 · Woche wie Enduco W4: Zeit und Intensität als Stellschrauben (zeit-intensitaet-1.0)
Silas' Anliegen (23.11.2026): «Wenn ich die Zeit eines Tages ändere, soll die Woche angepasst werden. Heute bringt mehr Zeit kein Mehr an Training.» Entscheide vom 22.11.2026
(Punkte 3 und 4 des Auftrags), Zahlen und Begründungen von Claude in `docs/anleitung/plan.md` («Zeit und Intensität als Stellschrauben»).
- **Zeit als Ziel (`V66.zeitZiel`, `V66.zielWoche`):** Hat ein Tag mehr Zeit, als der Plan braucht, wird dort die längste lockere Einheit (Rad, Schwimmen) in 5-min-Schritten länger –
  innerhalb ihres Bereichs, höchstens bis zur Zeit des Tages und bis zur Obergrenze des Korridors (TL ≈ des verteilten Vorschlags + 7,5 %, wie der Zyklus). Stösst sie an ihren Bereich
  und bleiben ≥ 45 min, kommt eine lockere Einheit der Sportart mit dem grössten Rückstand zur Wochenverteilung dazu. Laufen wird nie länger (Aufbau-Grenze), Ruhetage bleiben leer.
- **Verdichten (in `V66.verteilen`, opt.`ziel`):** Bleibt nach Verschieben und Kürzen Last übrig, wird eine lockere oder lange Rad- oder Laufeinheit kürzer und bekommt Tempo (Z3, unter
  LT2, 10-min-Blöcke, höchstens ein Drittel), bis das TL ≈ wieder bei ± 10 % liegt. Höchstens zwei je Woche, nie am Tag einer harten Einheit an Land oder daneben, nicht am Tag nach dem
  Krafttraining. Reicht es nicht, kommt wie bisher die Frage.
- **Nie:** in Erholungs-, Taper- und Rennwochen, an gesperrten oder vergangenen Tagen, an eigenen Einheiten; Verdichten nicht bei Ampel «vorsichtig». Nichts wird «von Hand» eingetragen.
- **Bericht** mit Grund zuerst: «Mittwoch: Rad + 35 min, die Zeit war da», «Samstag Rad: 2 h 15 statt 2 h 45, dafür mit Anteilen Tempo – gleiche Last» (`V92.zielBericht`,
  `V66.zielZeilen`); ohne gespeicherte Woche nimmt der Bericht das Ergebnis des Umplanens. ↶ nimmt beides zurück; «Neu berechnen» speichert `zielAus` (Fingerabdruck der Eingaben,
  `V66.zielFp`) und plant ohne beides, bis sich die Eingaben ändern.
- **Wo:** `js/v66.js` (Kern, `V66.ZIEL`, `V66.dichtTeile`/`dichtMax`/`dichtAnwenden`, `V66.einheit` mit `dicht`/`zusatz`, `V66.stehtFuer`, umplanen und «Neu berechnen»),
  `js/v64-ui.js` (`K.ziel`, `K.w0vorZiel`; Vorschlag mit Zeit als Ziel), `js/v66-ui.js` (`ctx.ziel`, Bericht, `leerE`), `js/v78-ui.js` (Zyklus-Bereich ohne Verlängerungen),
  `js/v92.js` (`V92.liste` mit `dicht`/`zusatz`, `V92.zielBericht`), `tools/merge_daily.py` (optionale Felder `dicht`, `zusatz`, `zielAus` geprüft), `js/wissen.js` (1.38).
- Tests: neu `tests/test_v95.cjs` (14, Simulator und Rechentests, erfunden), `tests/test_tools.py` (+1), `tests/test_v80.cjs` B3 (am Sonntag darf eine zusätzliche lockere Einheit
  dazukommen, das Übrige bleibt), Version in `tests/test_v64.cjs`. Demo-Durchlauf mit Playwright (demo.html). `sw.js` Cache `notebook-v95-zeit-2026-11-23`.

## V9.7 · 22.11.2026 · Tag-Update: Belastung tagsüber aktuell (tag-update-1.0)
Silas' Wunsch vom 22.11.2026 (Widget aufs iPhone, Belastung soll tagsüber stimmen): bisher stand die Belastung bis zum Nacht-Update auf «offen».
- **Neuer Lauf «Tag-Update»** (`docs/anleitung/updates.md`): 13, 15, 17, 19 und 21 Uhr, nur lesend auf Garmin, ohne «Ampel», ohne Eingaben vom Handy. Spielt die Einheiten von heute
  ohne FIT-Sekundenwerte und die Tageswerte ein; das Nacht-Update ergänzt dieselben Einheiten danach (gleiche Garmin-ID, nichts doppelt).
- `tools/merge_daily.py`: `"lauf": "tag"` setzt den Stand «Tag-Update». `FK.aktivitaetenBis` (`js/formkurve.js`): beim Tag-Update gelten die Einheiten bis heute als eingespielt.
  Ring Belastung (`js/v55.js`): «Bisher heute: Tageslast …» statt «offen»; der Hinweis bei fehlenden Einheiten nennt «das nächste Update».
- Tests: `tests/test_tools.py` (+2: Tag-Update ohne FIT, danach Nacht-Update ohne Doppelung), `tests/test_formkurve.cjs` (+1).
- Noch offen aus demselben Auftrag (`claude/auftrag-widget.md` im Projekt): T2 Widget-Ansicht, T3 Bild im privaten Archiv, T4 Scriptable-Skript, T5 Food-Shortcut prüfen.
## V9.3.2 · 22.11.2026 · Woche wie Enduco: Bearbeiten-Woche, Griff ziehen, Feinschliff; eigene Markierung «nicht werten» (bearbeiten-1.1, kalender-4.2, woche-look-1.1, analyse-gesund-1.1)
Silas' Rückmeldung vom 22.11.2026 abends (18 Bilder Enduco neben der Seite, Aufnahme 23:06): «bearbeiten lässt sich die Woche nicht», «bei Enduco lässt sich der horizontale Balken
verwenden, um das Fenster nach oben oder unten zu ziehen», «ich habe einfach die Einheit bewertet», «ganz viel Sachen sind noch nicht gleich wie bei Enduco».
- **Bearbeiten (bearbeiten-1.1):** Folgt in der laufenden Woche kein Tag mehr (Sonntag), beginnt Bearbeiten mit der nächsten Woche (`V78.bearbeitenAb`) – vorher zeigte es am
  Sonntagabend die fast vergangene Woche, und «Woche einstellen» und ✨ bezogen sich auf sie (alles «Vergangen – nur lesen»). Kein Schloss mehr im Tageskopf (wie die Vorlage):
  «Tag sperren» steht im Tagesblatt hinter «…», ein gesperrter Tag zeigt das Schloss am Namen. ✨ fragt «Anpassen oder neu berechnen?»: «Anpassen» plant um (umplanen-1.1, ändert so
  wenig wie möglich), «Neu» (orange) rechnet die Woche neu aus dem Vorschlag (alles-neu-1.0 Stufe 2: nur Gesperrtes bleibt), mit Bericht und Folgewoche.
- **Griff ziehen (kalender-4.2):** Den Balken unter dem Raster nach unten ziehen zeigt mehr Wochen (1 → 2 → Monat), nach oben weniger (je 44 px eine Stufe); antippen wechselt wie
  bisher zwischen zwei Wochen und Monat. Liste und Zyklus teilen den Zustand; im Zyklus ändert der Griff nur das Raster. Die Monatsansicht als eigener Knopf entfällt (eine gespeicherte
  Wahl «Monat» öffnet die Liste; ohne `V78UI` bleibt die alte Monatsansicht).
- **Aussehen (woche-look-1.1):** «Heute» umrandet; keine Zeile «KW …» mehr. Zyklus-Raster wie die Vorlage: Zahlen mit Kreis (heute orange, gewählter Tag weiss, Tag antippbar), je
  Woche eine dunkle Pille ohne Umriss («mind.» dort als «≥»), darüber die Wochenzeile «Phase | Wochenart · Zeitraum». Fehler behoben: Zonen-Gruppen der Wochenkarte und Zyklus-Raster
  teilten die Klasse `k4-zg` (Panel im Panel) – jetzt `k4-zgp`. Absolvierte Aktivitäten in der Liste wie die geplanten (Dauer, km, TL mit Abstand; «absolviert» und «Passt zu» nur noch
  für Screenreader); keine Striche «von Hand» unter den Tageszahlen; Trenner «Nächste Woche» als graue Leiste mit Pfeilen; Griff der Bearbeiten-Leiste in der Mitte, ✕ ✓ rechts.
- **Analysen (analyse-gesund-1.1):** Es zählt auch die eigene Markierung – im Namen der Aktivität, in der Notiz der Uhr (Garmin) oder in «Nach dem Training»: «nicht werten» (auch
  «nicht zählen», «nicht repräsentativ» …) lässt diese Einheit weg; Krankheitszeichen (krank, Fieber, Infekt, Magen-Darm, Erbrechen …) gelten wie «krank» im Check-in – der Tag und
  die 3 Tage danach; «abgebrochen» im Namen und starke Magenbeschwerden in «Nach dem Training» lassen die Einheit weg (`FK.MARKE`, `FK.markierung`, Grund je Einheit wie bisher).
  `index.html` gibt die Einträge «Nach dem Training» der Seite mit. wissen-1.37.
- **Entscheid W4 «Zeit als Ziel»** (Silas: «das muss trainingstechnisch Sinn machen … falls das so Sinn macht, dann ja»): ja, in der Form des Auftrags – freie Zeit verlängert die
  längste lockere Einheit, höchstens bis zur Zeit des Tages und nur bis zur Obergrenze des Wochenkorridors, nie in Erholungs- und Rennwochen. Gebaut wird es in W4 (eigene Sitzung).
- Tests: `tests/test_v93.cjs` (+4), `tests/test_formkurve.cjs` (+1), Versionen in `tests/test_v78.cjs` und `tests/test_v64.cjs`. `sw.js` Cache `notebook-v932-woche-2026-11-22`.

## V9.3.1 · 22.11.2026 · Analysen ohne kranke oder untypische Einheiten (analyse-gesund-1.0)
Silas' Wunsch vom 22.11.2026: Einheiten, bei denen er krank war oder der Puls ungewöhnlich hoch ist, verfälschen Pace/Puls-Auswertungen und sollen nicht zählen.
- **Regel (eigene Festlegungen, `FK.GESUND`):** nicht repräsentativ ist eine Einheit an einem Tag mit Check-in «krank» (Krankheitszeichen) und an den 3 Tagen danach, oder an einem Morgen
  mit Ruhepuls mindestens 7 Schläge über dem Median der 28 Tage davor (mindestens 10 Morgenwerte). In der Lauf-Effizienz zusätzlich: Meter je Herzschlag mehr als 10 % unter (Puls
  ungewöhnlich hoch) oder über (Puls ungewöhnlich tief, oft der Sensor) dem Median der vergleichbaren Läufe der 8 Wochen davor (mindestens 4).
- **Wo:** `FK.laufVergleichbar` (laufvergleich-1.1: Grund «krank (Check-in)», «kurz nach Krankheit», «Ruhepuls am Morgen erhöht» – sichtbar im Explorer und bei jedem Lauf),
  `FK.laufEffizienz` (laufeffizienz-1.2: gezählt als «Puls ungewöhnlich hoch/tief», Liste `ungewoehnlich`), `FK.entwicklungPunkte`/`FK.entwicklung` (entwicklung-1.1: Puls bei 200 W
  bzw. 5:30/km ohne diese Tage, gezählt als «krank»), «Deine Reaktionen» (Rad-Effizienz, `js/v82.js`). Die Seite meldet ihre Daten nach dem Laden an (`FK.gesundheitSetzen`), der
  Grund hängt an der Einheit – auch in Teillisten. Notiz unter der Lauf-Effizienz nennt die neuen Gründe.
- Tests: `tests/test_formkurve.cjs` (+3; Versionen und Zählung der bestehenden Tests nachgeführt: der Lauf mit sehr tiefem Puls ist jetzt «Puls ungewöhnlich tief» statt Ausreisser),
  `tests/test_v64.cjs` (wissen-1.36). `sw.js` Cache `notebook-v931-analyse-gesund-2026-11-22`.

## V9.3 · 22.11.2026 · «Woche wie Enduco» Etappe W2: Aussehen (woche-look-1.0, kugel-1.0)
Auftrag `docs/auftrag-enduco-woche.md`, Etappe W2 (W2a und W2b in einer Sitzung) nach Silas' Enduco-Screenshots vom 22.11.2026. Neues Modul `js/v93.js` (`V93`, ohne DOM),
Test `tests/test_v93.cjs` (9 Tests). Nur Aussehen, keine Rechenlogik.
- **Raster:** sieben Spalten (die Wochenspalte mit dem Kalender-Symbol entfällt – der Zyklus bleibt über ◎ erreichbar); die Woche des gewählten Tags liegt in einer dunklen Pille;
  heute orange, gewählter Tag weiss mit schwarzer Zahl; je Tag eine Pille mit **weissen** Sportsymbolen (je Einheit eines, höchstens zwei) und je Einheit einer **Kugel**;
  vergangene Tage gefüllt, kommende mit Umriss; freier Tag = Kalender-✕ ohne Pille. Monat, Wochentage und Raster auf einem Panel (unten gerundet).
- **Kugel (kugel-1.0):** senkrechte Streifen je Zone des Hauptteils (Einfahren, Auslaufen und Pausen zählen nicht), links die höchste, Breite = Zeitanteil, mindestens 20 %,
  höchstens vier Streifen (`V93.kugel`, `V93.kugelStil`).
- **Liste:** Wochenleiste «Phase | Wochenart» mit Zeitraum (Stunden und TL ≈ stehen im Zyklus und in der Wochenkarte); Tageskopf «• Wochentag, 12. Nov.» (Punkt = gewählter Tag,
  heute orange), rechts die Zahl der Einträge ab zwei und ein kleiner weisser «…»-Knopf; Einheit mit Schloss und weissem Symbol vor dem Titel, darunter Dauer, Distanz ≈ und
  TL ≈ mit Abstand (ohne «Vorschlag» – die Quelle steht im Tagesblatt), rechts das Profil (120 pt, flacher abgestuft wie die Vorlage; vorher eine dünne Linie, weil die Höhe
  fehlte); «Kein Training» bzw. «Ruhetag» mit Kreis-Symbol.
- **Bearbeiten:** Kopf-Panel in zwei Spalten (locker · Z3–Z5 mit Verlauf und Strichmarke, Zonen als Gruppen Z1–Z5, TL ≈ gegen den Bereich, Status je Tag als Kurve mit grünem Band
  «üblich» 0,8–1,3); darunter Griff mit ✕ und ✓; Tageskopf mit Status und Mini-Balken (Füllung = Status ÷ 2,1); schwebend ✨ links, ↶ ↷ rechts (56 × 56, Radius 16).
- **Tagesblatt:** Titel mittig, Kennzahlen-Kachel Fitness · Ermüdung · Status (Form darunter), Zeilen mit Haarlinien, Sportart-Pille weiss.
- **Zustand eines Tages:** gesperrt = Schloss in der Pille und am Tagesnamen; von Hand gesetzt = Strich unter der Zahl im Raster und die gesetzte Zeit in Grau am Tageskopf
  (schlichte Fassung – die Screenshots zeigen keinen gesperrten oder von Hand verkürzten Tag in Leiste und Liste).
- **Farben:** Zonen auf die gemessenen Werte (Z1 #5445da, Z2 #5365f6/#82aff6, Z3 #5bbbd5/#88e6e7, Z4 #88e1a7, Z5 #f5c347/#d6533c; überall dieselbe Zone = dieselbe Farbe), dazu
  `--wk-…` für Seite, Panel, Pillen, Griff, Text, ✕, ✓, TL, Band (dunkel und hell). Neue Symbole `kalenderfrei`, `mond` (`js/v6.js`). `js/v59.js`: Blatt trägt `data-art`.
- **Bewusst nicht übernommen:** «54m» für Minuten (V6.6 Teil 0: nie «m» für Minuten), Enduco-Texte und -Symbole, Kartenbild und «52 %»-Abzeichen bei absolvierten Einheiten.
- `sw.js` Cache `notebook-v93-woche-look-2026-11-22`, `index.html`, `tests/sim/umgebung.cjs`, Demo nachgeführt; Playwright-Bilder (dunkel und hell, 390 × 844) ohne Fehler.

## V9.2.1 · 22.11.2026 · Folgewoche (umplanen-1.1)
Silas' Wunsch vom 22.11.2026 (nach V9.2): Ändert er die Zeit eines Tages, soll auch die Woche danach angepasst werden, «wenn es einen Einfluss hat».
- **Der Sonntag davor bindet den Montag:** `V66.verteilen` kennt den letzten Tag der Woche davor (`opt.vorher`). Steht dort eine harte Einheit an Land, ein
  Krafttraining oder eine Aktivität draussen ab 2 h, plant die Woche am Montag keine harte Einheit an Land (dieselben Regeln wie innerhalb der Woche:
  verfuegbarkeit-1.2, kraft-plan-1.1, aktivitaet-plan-1.0). `V66.vortagBindet`; `V64UI` liefert den Sonntag je Woche (zwischengespeichert wie die geplanten Läufe).
- **Folgewoche:** Nach jeder gespeicherten Änderung (auch ↶ und ✓ im Bearbeiten-Modus) wird die Woche danach neu geplant: gespeicherte Wochen über umplanen
  (Eigenes, Sperren, Streichungen bleiben), Wochen ohne Eigenes folgen von selbst; die Garmin-Aufträge ihrer Tage werden nachgeführt. Der Bericht nennt es
  («Nächste Woche: «…» Mo → Fr (harte Einheit am Sonntag davor)»), ↶ nimmt beides zurück.
- **Eigene Festlegung:** Fehlende Last wird nicht in die Folgewoche nachgeholt – die Wochenlast folgt weiter dem Aufbau (plan.md «Umplanen»).
- Tests: `tests/test_v92.cjs` (+3: Kern, Folgewoche automatisch mit ↶, gespeicherte Folgewoche mit gesperrtem Tag; 23 Tests), `tests/test_v64.cjs` (wissen-1.35).
- `sw.js` Cache `notebook-v921-folgewoche-2026-11-22`, Wissen 1.35.

## V9.2 · 22.11.2026 · «Woche wie Enduco» Etappe W1: Umplanen (umplanen-1.0, grenzen-1.0, woche-einstellen-1.0, fehlt-zeit-1.0)
Auftrag `docs/auftrag-enduco-woche.md` (neu im Repo), Etappe W1. Neue Module `js/v92.js` (`V92`: Bericht, Frage, Einträge von «Woche einstellen»), `js/v92-ui.js` (`V92UI`),
Test `tests/test_v92.cjs` (20 Tests, Abnahme 1–15). Versionen: `eigenplan-1.3`, `verfuegbarkeit-1.3`, `wissen-1.34`.
- **Jede Einstellung rechnet die ganze Woche neu:** Die Woche ist eine Funktion ihrer Eingaben (Vorschlag, Zeit und Sportarten je Tag, Festes). Neu `V66.aendern { art: "umplanen" }`:
  aus dem unverteilten Vorschlag, nicht aus dem gespeicherten Stand. Vergangene Tage, gesperrte Tage (auch Tage mit gesperrter Einheit) und – sobald heute schon trainiert wurde – heute
  bleiben; deine eigenen, geänderten, ersetzten und von Hand verschobenen Einheiten bleiben an ihrem Tag (Anker); Gelöschtes bleibt gestrichen (`E.gestrichen`). Gleiche Eingaben ergeben
  dieselbe Woche, egal in welcher Reihenfolge: Zeit auf 0 und wieder zurück gibt die Ausgangswoche (gekürzte Einheiten wachsen zurück). Wochen ohne Eigenes folgen wieder von selbst.
- **Die Last fliesst dorthin, wo Zeit ist:** auch auf Tage, die im Vorschlag frei waren; mehrere Einheiten an einem Tag, wenn es nicht anders geht. Einheiten, deren Tag fest ist
  (z. B. vorbei, aber noch nicht gemacht, weil sie verschoben waren), plant der Kern auf die übrigen Tage (`V66.verteilen` opt.`extra`).
- **Harte Grenzen (grenzen-1.0):** Die Zeit eines Tages – Standard des Wochentags oder von Hand gesetzt – überschreitet die Seite nie: Planer, automatischer Krafttrainings-Tag (`js/v76.js`:
  nur Tage, an denen das Krafttraining mit dem Festen in die Zeit passt, nie an einem von Hand gesetzten Tag mit gewählten Sportarten), Coach (`js/v83.js`: Tauschen und Nachholen ohne die
  5 min Toleranz, Rad statt Laufen nie über die Zeit), «Ausgleichen». Ampel-Ersatz geprüft (gleiche Sportart, nie länger – unverändert). Über der Zeit steht nur, was du selbst fest
  gesetzt hast, mit Meldung («Mittwoch: 30 min mehr geplant als verfügbar (deine eigene Einheit)»).
- **Geht es nicht auf, fragt die Seite (fehlt-zeit-1.0):** «Die Woche geht nicht auf: Es fehlen … Darf an einem Tag mehr trainiert werden?» – je Tag das kleinste nötige Mehr
  (mit dem Planer durchgerechnet, 5-min-Schritte, nie mehr als das Fehlende), bei mehr als 1 h auch auf zwei Tage verteilt. «Ja» setzt die Zeit wie am Regler (von Hand), «Nein» lässt
  alles; die Frage kommt erst nach deiner nächsten Änderung wieder. Nur nach eigenen Änderungen (Tagesblatt schliessen, «Woche einstellen», ✓, ✨), nie beim Öffnen, nie in der
  Rennwoche, nie für vergangene Wochen, im Bearbeiten-Modus erst mit ✓.
- **«Woche einstellen» (woche-einstellen-1.0):** ein Blatt für Zeiten (0 = kein Training bis 5 h, ganz rechts offen), Sportarten und Sperren aller Tage, mit Zustand je Tag (Standard ·
  von Hand · gesperrt), «Zurück auf Standard» und «nur diese Woche · jede Woche so». Ersetzt «Trainingsverfügbarkeit der ganzen Woche» (Tagesblatt, Zyklus, Planeinstellungen, ✨,
  Woche bearbeiten). «Jede Woche so» plant auch die späteren gespeicherten Wochen neu.
- **Bearbeiten-Modus:** Zeiten und Sportarten gehen jetzt auch im Entwurf (Tagesblatt und «Woche einstellen»): Überlagerung der Verfügbarkeit (`V78.entwurf`: `vfSetzen`, `vf`), mit ✓
  zusammen mit der Woche gespeichert, mit ✕ verworfen, ↶/↷ Schritt für Schritt. Die Woche rechnet nach jeder Änderung live; die fehlende Zeit steht in der Wochenkarte.
- **Bericht oben im Kalender** (bleibt bis zum Wegwischen): was sich geändert hat (mit Grund), Wochenlast vorher → nachher (TL ≈, Stunden), was fehlt («Mehr Zeit erlauben …»),
  ↶ Rückgängig (Woche **und** Verfügbarkeit, solange die Seite nicht neu geladen wurde), Details, «Ausgleichen» bei gestrichenen Einheiten unter dem Wochenbereich. Im Tagesblatt
  dieselbe Meldung unter der Verfügbarkeit.
- **Garmin:** Nach jedem Umplanen werden die offenen Aufträge aller sieben Tage nachgeführt; eine gewählte Einheit bleibt gewählt – mit ihrem Modus auch an ihrem neuen Tag. Unveränderte
  Aufträge bleiben, heute nie. Steht eine gesendete Einheit von heute nicht mehr im Plan: «Auf der Uhr steht noch …».
- **Stufen:** 1 «Woche anpassen» (= umplanen, läuft bei jeder Einstellung von selbst), 2 «Neu berechnen» (vergisst Anker und Streichungen; jetzt über denselben Kern – eine Einheit, deren Tag
  schon vorbei war, geht nicht mehr verloren), 3 «Alles neu verteilen» (auch Sperren weg; deine Zeiten bleiben). «Nur speichern» entfällt. «Woche leeren» merkt die Einheiten als gestrichen.
- **Datenformat (nur optionale Felder):** `gestrichen` [{ vorlage, date }] je Woche, `anker` und `statt` je Einheit, `verteilung.fehlt` / `verteilung.frage`; geprüft in
  `tools/merge_daily.py` (`planwoche_pruefen`, Test in `tests/test_tools.py`).
- **Umgeschriebene Tests (nichts gelöscht):** `tests/test_v66.cjs` (Version eigenplan-1.3; «anpassen» meldet jetzt `art: "umplanen"`), `tests/test_v74.cjs` (Version), `tests/test_v911.cjs`
  Test 4 («nur teilweise gespeichert» entsteht nicht mehr – jetzt: Hinzufügen hält die Woche ganz fest, Verfügbarkeit plant gleich neu), `tests/test_v64.cjs` (wissen-1.34).
- `sw.js` Cache `notebook-v92-umplanen-2026-11-22`, `tests/sim/umgebung.cjs`, `index.html` (Module, `#kal-bericht`), `js/v59.js` (`V59.nachSchliessen`), Demo nachgeführt.
- Demo im Browser durchgespielt (Playwright, CDN-Stub, 390 × 844): Dienstag Zeit 0 im Tagesblatt → Woche neu, Bericht oben, «Woche einstellen», ↶ gibt die Ausgangswoche – ohne Fehler.
- Alle Node-Tests und `tests/test_tools.py` bestanden. Leck-Prüfung: der datenunabhängige Teil (E-Mail-Adressen) bestanden; mit echten Daten konnte sie ohne
  `SPUREN_PW` nicht laufen – es wurden keine echten Werte eingefügt, Zahlen aus den Aufnahmen sind im Auftrag durch erfundene ersetzt.

## V9.1 Etappe 1 · 20.11.2026 · Geplant und absolviert als eine Einheit (zusammen-1.0)
Auftrag V9 (`docs/auftrag-v9.md`), Etappe 1. Neues Modul `js/v91.js` (`V91`, Version `zusammen-1.0`), Test `tests/test_v91.cjs` (10 Tests).
- **Eine Zuordnung für alle Stellen:** `V91.zuordnen(plan, akt, {sportVon})` ordnet absolvierte Aktivitäten den geplanten Einheiten desselben Tages und derselben
  Sportart zu (kleinster Dauerunterschied zuerst, jede Einheit und jede Aktivität nur einmal). Dieselbe Zuordnung nutzen Heute, Liste, Tagesblatt, Wochenansicht
  und die Einheit-Seite (vorher stand die «erste Einheit gleicher Sportart» an sieben Stellen einzeln im Code).
- **Kalender, Tagesblatt, Heute, Liste:** Eine absolvierte Aktivität, die zu einer geplanten Einheit passt, erscheint nur noch einmal (Aktivitätsname, Haken, «Passt zu:
  <Einheit> (Mein Plan)»). Nicht erledigte Einheiten bleiben sichtbar. Im Bearbeiten-Modus der Liste bleiben alle Einheiten sichtbar.
- **Aktivitäts-Seite:** «Passt zu: <Einheit> (Mein Plan)» mit Vergleich geplant gegen absolviert (Dauer, TL ≈); ohne passende Einheit «Vorschlag der Seite wäre: …»
  (Wochenvorschlag ohne deine Änderungen) bzw. ein Hinweis, dass nichts Passendes geplant war.
- **Heute-Begrüssung:** zählt nur offene Einheiten; am Abend «Heute ist alles erledigt.», dazwischen «Heute steht noch …». Die Ampel-Empfehlung entfällt, wenn alles erledigt ist.
- Monatspunkte (Kalender-Monat), `js/v6.js`, `js/v7.js`, `js/v83.js` bleiben bewusst bei ihrer eigenen Zählung (Summen, keine Doppeleinträge).
- `sw.js`: v91.js im Shell, Cache `notebook-v91-zusammen-2026-11-20`; `tests/sim/umgebung.cjs` und Demo (`demo.html`) nachgeführt.
- Alle Node-Tests und `tests/test_tools.py` bestanden. Leck-Prüfung mit echten Daten konnte ohne `SPUREN_PW` nicht laufen; es wurden keine echten Werte eingefügt.
- **Nachtrag alles-neu-1.0 (Silas 20.11.2026):** Neue Wahl «Alles neu verteilen» (nach der Verfügbarkeit und unter «Woche bearbeiten»): wie «Neu berechnen», gibt aber auch
  gesperrte Tage und Einheiten ab heute frei (zweites Antippen nötig). «Woche anpassen» verschiebt weiter nur, was nicht zur Verfügbarkeit passt (bewusst); passt alles, steht
  jetzt «Es musste nichts verschoben werden». Test in `tests/test_v66.cjs`.
- **Nachtrag kalender-direkt-1.0 / anpassen-automatisch-1.0 (Silas 22.11.2026, Vergleich mit Enduco anhand deiner Bildschirmaufnahmen):**
  - *Nach einer Änderung gleich in den Kalender (kalender-direkt-1.0):* Wer in der Liste eine Einheit hinzufügt (Vorlage, Bibliothek, eigene Aktivität, Aktivität draussen),
    ihre Dauer ändert oder sie löscht, landet danach wieder in der Kalender-Liste an diesem Tag (`V66UI.nachAenderung`; vorher blieb ein Blatt offen oder man stand am
    alten Ort). Gilt im Tagesblatt wie auf der Einheit-Seite («Löschen»). Verfügbarkeit ändern bleibt bewusst im Tagesblatt (Regler, Sportarten-Auswahl bleibt offen).
  - *Verfügbarkeit eines Tages ändert den Plan gleich (anpassen-automatisch-1.0):* `V66UI.vfFolgen` ruft nach dem Speichern der Tages-Verfügbarkeit «Woche anpassen» selbst
    auf, wenn die Woche bearbeitet ist (ganz festgehalten **oder** nur teilweise gespeichert – so entsteht sie, wenn man ohne Verfügbarkeit eine Einheit hinzufügt, sie blieb
    bisher beim unverteilten Vorschlag). Verschoben oder gekürzt wird nur, was nicht mehr passt; gesperrte Tage, Tests, eigene Einheiten und vergangene Tage bleiben.
    Das Tagesblatt meldet, was sich geändert hat («Woche angepasst: …»), bzw. «Es musste nichts verschoben werden»; Wochen, die der Verfügbarkeit von selbst folgen,
    zeigen ihre Verteilung. «Neu verteilen …» öffnet die bekannte Wahl (Woche anpassen, Neu berechnen, Alles neu verteilen).
  - *Bewusst nicht übernommen:* Hat ein Tag mehr Zeit als geplant, bleibt die Wochenlast, wie sie im Plan steht (die Verfügbarkeit ist eine Obergrenze); das Blatt weist darauf hin
    («Du hast … mehr Zeit als geplant») und verweist auf «Training hinzufügen». Enduco verlängert dann die Einheit – offener Punkt 135.
  - Test `tests/test_v911.cjs` (4 Tests, Simulator); Ablauf zusätzlich im Demo mit einem Browser durchgespielt (Einheit hinzufügen → Kalender; Verfügbarkeit ändern → Plan und
    Meldung; Löschen → Kalender). Leck-Prüfung mit echten Daten konnte ohne `SPUREN_PW` nicht laufen; es wurden keine echten Werte eingefügt.
- Offen: Entwurf «Heute entrümpeln» (Mockup 390 px) wartet auf deine Freigabe, gebaut ist noch nichts.

## V9.0 Etappe 0 · 20.11.2026 · Anleitung gekürzt (anleitung-kurz-1.0)
Auftrag V9 (`docs/auftrag-v9.md`), Etappe 0: Keine Verhaltensänderung an der Seite, reine Reorganisation der Dokumentation.
- `CLAUDE.md` (170 kB) aufgeteilt: kurzer Kern (~7 kB, Dateien im Überblick, Prüfen vor dem Push, Datenschutz, Verweistabelle) + neun Themen-Dateien
  unter `docs/anleitung/*.md` (dateien, updates, garmin, plan, karte-routen, laktat, bedienung-design, entwicklung, technik) mit dem vollständigen,
  unveränderten Inhalt der bisherigen Abschnitte.
- `CHANGELOG.md` (157 kB) aufgeteilt: alles vor V7.0 nach `docs/changelog-alt.md` (unverändert), dieser Datei bleiben V7.0 und neuer.
- Vorher/nachher-Abgleich aller Versionskennungen (z. B. `last-2.1`) und zeilenweiser Vergleich des Fliesstexts: keine Regel und keine Freigabe
  verloren (`docs/versionsliste-v9.0.md`). `docs/offen-nach-v55.md` nachgeführt (Punkte 131–132).
- Alle Node-Tests (27) und `tests/test_tools.py` weiterhin bestanden (keine Codeänderung); Leck-Prüfung mit echten Daten konnte in dieser Sitzung
  ohne `SPUREN_PW` nicht laufen – nur bestehender, bereits geprüfter Text verschoben, keine neuen Werte eingefügt.

## V8.5 · 19.11.2026 · Modell «Automatisch» (automatisch-1.0), verteilung-1.1, wissen-1.33
- **Neues Modell «Automatisch (individuell)»** unter Plan → Trainingsmodell: startet wie «kombiniert» und entscheidet je Woche Verteilung und Zahl harter Einheiten an Land aus Phase,
  Zeit, deiner Verträglichkeit und Ermüdung – jede Wahl mit Grund. Solange ein anderes Modell gewählt ist, zeigt die Seite, was «Automatisch» entscheiden würde.
- Weniger harte Einheiten (der harte Lauf wird locker, das Rad bleibt) nach einer Woche mit mindestens 3 Tagen «vorsichtig», bei sehr hohem Trainingsstatus, wenn deine Daten zeigen,
  dass so viele harte Einheiten schlechter vertragen wurden, oder unter 5 Stunden. Pyramidal statt polarisiert nur, wenn deine Daten das klar und unabhängig von den Blockgrenzen zeigen.
  Nie mehr als die Vorlage: gute Erholung allein macht nichts härter (Test C über mehrere Wochen).
- **verteilung-1.1** («Deine Reaktionen»): ein Zusammenhang zwischen Verteilung und Effizienz gilt erst als klar, wenn ihn mindestens 3 der 4 Einteilungen der 4-Wochen-Blöcke zeigen.

## V8.4.1 Teil 3 · 18.11.2026 · Nur Rad oder nur Laufen (sportart-1.0), wissen-1.32
- **Sportart wählbar:** Planeinstellungen → Allgemein → Sportart: Triathlon (wie bisher), «Nur Rad» oder «Nur Laufen». Gilt ab der nächsten Woche.
- Mit nur einer Sportart: Wochenstunden aus deinem Training in dieser Sportart, eigene Wochenvorlage (Mo frei, Di Schlüssel, Do zweite Schlüsseleinheit ab 6 h Rad bzw. 4,5 h Laufen,
  lange Einheit am Samstag bzw. Sonntag, sonst locker), Tests nur für diese Sportart, kein Schwimmkurs; die Planeinstellungen zeigen nur ihre Seiten.
- Rennen: Marathon und Halbmarathon haben ihre Streckenlänge.

## V8.4.1 Teil 2 · 18.11.2026 · Lauf-ABC statt Mobility (lauf-abc-1.0), wissen-1.31
- **Lauf-ABC in jedem harten Lauf:** nach 10 min Einlaufen die Lauf-ABC aus deinen Enduco-Einheiten – vor VO2max-Läufen die Koordination (Hohe Knie, A-Skip, Anfersen …),
  vor Tempo- und Schwellenläufen die Beweglichkeit. Auf der Einheit-Seite als eigener Schritt mit allen Übungen, auf der Uhr als Einlauf-Schritt mit den Übungen im Text.
  Die Einheit bleibt gleich lang (Auslaufen kürzer).
- **Mobility** ist bei «Training hinzufügen» und «Eigene Aktivität» weg.
- Die Lauf-ABC kommt nicht über Garmin: In keinem der Enduco-Workouts aus Garmin steht eine; die Übungen stammen aus deinen Bildschirmfotos (Namen und Sätze wie dort, Texte eigen).

## V8.4.1 · 18.11.2026 · Ältere Browser (kompat-1.0)
- **Älterer Mac:** Die Seite lief in älteren Safari-Versionen nicht mehr (logische Zuweisung «||=» erst ab Safari 14, «inset» erst ab 14.1, gzip-Entpacken erst ab 16.4).
  Neu lädt `js/kompat.js` vor allem anderen: Ersatz für `at`, `Object.hasOwn` und `Blob.arrayBuffer`, ein eigener gzip-Dekoder für Explorer und Eingang
  (geprüft gegen zlib und an echten Reihen) und ein klarer Hinweis, wenn der Browser zu alt ist oder beim Start ein Fehler auftritt.
- Seite und Module nutzen nur noch Syntax bis ES2020 (Safari 13.1); CSS ohne «inset», «dvh» mit «vh» davor. `tests/test_kompat.cjs` prüft das bei jedem Push.

## V8.4 Teil 4 · 18.11.2026 · Abwechslung (abwechslung-1.0), wissen-1.30
- **Gleicher Reiz, andere Form:** Die Schlüsseleinheiten wechseln von Woche zu Woche die Form – Rad VO2max 30/15 · 4 × 5 min · 40/20, Laufen 4 × 4 · 5 × 3 min · 30/30,
  Schwelle 3 × 15 · 4 × 10 · 3 × 12 min, Tempo 2 × 20 · 3 × 15 min bzw. 3 × 10 · 2 × 15 · 4 × 8 min, Schwimmen CSS über 100 · 200 · 300 m (`V64.FAMILIEN`, `V64.formFuer`).
- **Vergleichseinheit:** Jede dritte Woche kommt die erste Form gleich wieder (fest ab der Woche vom 5.1.2026), damit sich Puls und Leistung über die Wochen vergleichen lassen;
  die Einheit-Seite sagt, ob es die Vergleichseinheit oder eine andere Form ist. Die Schwelle mit Laktat (norwegisch) bleibt gleich.
- Nur im Wochenvorschlag (`V64.woche` mit `abwechslung`, auf der Seite immer an); gespeicherte Wochen behalten ihre Einheiten. Varianten erben Stufe und Ersatz (intensitaet-1.1),
  Vorlagen in `js/v66.js`, Schwimm-Hauptserie über 200/300 m in `js/schwimmen.js` (`SW.cssStrecke`, `o.css_m`).
- Tests: `tests/test_v64.cjs` (+1), `tests/test_v72.cjs` (+1), Szenario F2 in `tests/test_v80.cjs` ist jetzt ein normaler Test; Wissen Kapitel «intervalle».

## V8.4 Teil 3 · 18.11.2026 · Coach 1.1 (tagescoach-1.1)
- **Ausgefallen:** Eine Schlüsseleinheit von gestern ohne Aktivität schlägt der Coach an Stelle einer lockeren an einem der nächsten Tage vor – auch in der nächsten Woche,
  nie in eine Erholungs-, Taper- oder Rennwoche.
- **Verlängern:** Fehlen in der Woche bisher Minuten, darf eine lockere oder lange Einheit länger werden – nie über deine Zeit an jenem Tag, die längste Einheit der Phase
  und beim Laufen die Aufbau-Grenze. Die Woche bleibt bei Mein Plan.
- **Schmerzen an Beinen oder Füssen** im Check-in bremsen die Laufkilometer (leicht: locker und kürzer, deutlich: weglassen oder Rad statt Laufen).
- **Über die Woche hinaus:** Tauschen und Nachholen dürfen die nächste Woche ändern; gespeichert wird erst, wenn es in beiden Wochen geht.
- Tests: `tests/test_v83.cjs` (+4), Szenarien I1 und I2 in `tests/test_v80.cjs`; Wissen Kapitel «coach».

## V8.4 Teil 1 · 18.11.2026 · Strengere Ampel (readiness-3.0), Nachtwerte (nacht-1.0), Verpflegung kurz (verpflegung-2.0), wissen-1.29
- **Ampel zählt die einzelne Nacht:** Erholung der Nacht (HRV und Ruhepuls dieser Nacht gegen deine 60 Tage) unter 34 % ist ein Warnzeichen, «bereit» gibt es erst ab 50 %.
  Mit deinen Daten geprüft: an Tagen, die bisher «ok» waren, deren Nacht aber tief lag, kostete die gleiche Leistung mehr Puls. Die Kachel auf Heute zeigt die Erholung in %.
- **Atemfrequenz und Hauttemperatur** aus Garmin (jede Nacht neu geholt): je ein mögliches Krankheitszeichen, sobald 14 Nächte beisammen sind; SpO2 und Schlafbedarf werden gespeichert.
- **Verpflegung kurz und bündig:** nur noch g/h und Menge, dazu je eine Zeile vorher und nachher, wenn sie etwas ändert. Welche Produkte du nimmst, entscheidest du; «Anpassen» mit g/h,
  «Diesmal ohne» und deiner Stufe ab 2,5 h.
- Wissen: Kapitel «erholung» (Kiviniemi et al. 2007) und «verpflegung» nachgeführt.
- Tests: `tests/test_formkurve.cjs` (+2), `tests/test_verpflegung.cjs` (neu gefasst), `tests/test_tools.py` (+1), Szenarien A3/A4 und C2 in `tests/test_v80.cjs` an die strengere Ampel angepasst.

## V8.3 · 18.11.2026 · Täglicher Coach (Masterprompt V8, Etappe V8.3), ampel-plan-1.2, basis-1.2, wissen-1.28
- **Karte «Coach» auf Heute** und Vorschläge im Tagesblatt: Der Coach prüft heute und die nächsten Tage nach dem Morgen-Update, dem Check-in, jeder neuen Einheit und wenn
  sich deine Zeit ändert, und schlägt vor – mit Grund, Annehmen, Ablehnen und Rückgängig (tagescoach-1.0). Er ändert nie selbst etwas.
- **Ein einzelner Morgen deutlich daneben** (HRV tiefer und Ruhepuls höher als in den 7 Tagen davor, gemessen an deiner täglichen Schwankung), solange die Ampel noch nicht
  reagiert: harte Einheit heute oder morgen tauschen oder locker.
- **Härter als geplant** (Last ≥ 1,3 × TL ≈ und +15, oder hart statt locker): die harte Einheit an Land am Tag danach tauschen oder locker – mit dem Hinweis aus «Deine Reaktionen».
- **Weniger Zeit an einem Tag:** Kurzfassung derselben Sportart statt Verschieben (keine zwei langen Einheiten an einem Tag).
- **Nachholen der Ampel nur noch als Vorschlag** (ampel-plan-1.2): die gelockerte Schlüsseleinheit kommt erst in Mein Plan, wenn du annimmst.
- **Fehlende Garmin-Daten zählen nicht als Ruhetage** (basis-1.2): die Basis-Fitness gilt vom letzten Tag mit Daten.
- Probelauf bis 30.11.2026 (Enduco-Stichtag, `config.enduco_bis`); vom Coach geänderte Einheiten tragen «Coach».
- Mein Plan: Änderung «ersetzen» (gleiche Kennung), mehrere Änderungen auf einmal speichern, Zurückholen mit derselben Kennung.
- Tests: `tests/test_v83.cjs` (10), Szenarien A3, B3, D3, E2, H2 in `tests/test_v80.cjs` sind jetzt normale Tests, `tests/test_v74.cjs` und `tests/test_v75.cjs` nachgeführt,
  `tests/test_tools.py` (+2).

## V8.2 · 18.11.2026 · Persönliche Reaktionen (Masterprompt V8, Etappe V8.2), wissen-1.27
- **Neue Ansicht «Deine Reaktionen»** unter Analyse (Karte auf dem Analyse-Start, Link `#reaktionen`). Nur beschreibend; der Plan ändert sich dadurch nicht.
- **Erholung nach harten Einheiten** (erholung-nach-1.0): HRV und Ruhepuls an den drei Morgen nach harten Rad- und Laufeinheiten (ab 5 min über LT2 oder 20 min über LT1)
  gegen den Schnitt der 7 Morgen davor, dazu Puls bei gleicher Leistung – verglichen mit derselben Rechnung nach ruhigen Tagen. Gruppen: alle harten, Rad, Laufen, lange
  Einheiten. Deutlich erst mit 90-%-Intervall ohne 0 und mindestens der täglichen Schwankung (halbe Standardabweichung); je Gruppe und Vergleich mindestens 6 Fälle.
  Eingeteilt mit den Pulsgrenzen des aktuellen Zonenprofils für die ganzen zwei Jahre (Garmins Pulszonen zählten zu viel lockeres Training als mittel).
- **Was du bisher verträgst** (vertraeglich-1.0): Wochen nach Zahl harter Einheiten, Wochenstunden und Lauf-km gegen Ruhepuls und HRV an den ersten drei Morgen der Woche
  danach. Bezug sind die üblichen Wochen (Median); weniger als üblich wird nicht beurteilt (oft Ferien oder Krankheit). Je Gruppe mindestens 4 Wochen.
- **Verteilung und Entwicklung** (verteilung-1.0): locker/mittel/hart je 4-Wochen-Block gegen die Effizienz im Block danach (Rad: Leistung je Pulsschlag in gleichmässigen
  Fahrten je System, Laufen: Meter je Pulsschlag in vergleichbaren Läufen); Rangkorrelation mit Intervall ab 8 Block-Paaren, «Zusammenhang, keine Ursache».
- **Blockbilanz** (blockbilanz-1.0): je vier Wochen, endend mit den Erholungswochen der Saison – Stunden, harte Einheiten, Verteilung, Fitness, Ruhepuls und HRV, Effizienz,
  Tests und ein Satz gegenüber dem Block davor.
- Bootstrap ohne Sortieren je Ziehung (gleiche Daten, gleiches Ergebnis); die Karten erscheinen nacheinander, die Seite bleibt bedienbar.
- Wissen «reaktionen» (wissen-1.27): Hecksteden et al. 2015, Stanley et al. 2013, Plews et al. 2013; Grenzen und Mindestzahlen als eigene Festlegungen gekennzeichnet.
- Tests: `tests/test_v82.cjs` (10, erfundene Wochen mit bekannter Reaktion).

## V8.1.2 · 18.11.2026 · Verpflegung nur mit deinen Produktgruppen (verpflegung-1.1), wissen-1.26
- Ohne eigene Auswahl nimmt die Empfehlung nur deine Gruppen: Gels, Fruchtgummi (neu, z. B. Haribo), Kohlenhydrat-Getränke, Hafer-Riegel, Hafer-Getränk (neu, z. B.
  Instant Oats), Whey und Bananen. Apfel, Honig und andere eigene Lebensmittel nur, wenn du sie selbst auswählst; das Blatt zeigt sie erst unter «Alle Lebensmittel».
- Hafer-Getränk als Beispiel für die Mahlzeit vorher und mit Menge beim raschen Auffüllen (nur wenn die nächste harte oder lange Einheit in weniger als 8 h kommt).
- Fruchtgummi unterwegs nach Getränk und Gel, auf Wanderung, Skitour und Langlauf nach dem Riegel; beim Laufen weiter nur Gels.
- Einfacher: höchstens zwei Produktarten je Einheit, Banane unterwegs höchstens 200 g. Draussen (Wanderung, Skitour, Langlauf) zuerst Riegel, höchstens 30 g/h in Z1
  und 45 g/h in Z2; Skitour und Langlauf werden jetzt als draussen erkannt (vorher wie Rad behandelt).
- Wissen «verpflegung»: was du genommen hast, trägst du über Claude ins Garmin-Ernährungsprotokoll ein (Uhrzeit während der Einheit) oder als Notiz an der Aktivität.

## V8.1.1 · 18.11.2026 · Verpflegung je Einheit (verpflegung-1.0), nachher-1.1, wissen-1.26
- **Verpflegung je Einheit** (verpflegung-1.0, Silas' Wunsch vom 18.11.2026): auf der Einheit-Seite ein Abschnitt «Verpflegung» mit vorher · während · nachher –
  Zeitplan entlang der Schritte (nie in harten Abschnitten), Kohlenhydrate pro Stunde, Natrium, Packliste; auf Heute eine Zeile unter der Einheit des Tages. Grundlage sind
  deine eigenen Lebensmittel aus Garmin Connect (das Nacht-Update holt sie mit `get_custom_foods`) und die Fueling-Vorlagen; Nährwerte nur wie eingetragen.
- **Produkte für die Verpflegung** (Blatt, auch aus dem Abschnitt): je Produkt unterwegs / vorher / nachher und «Glukose + Fruktose» (erst dann mehr als 60 g/h),
  dazu deine Stufe ab 2,5 h (Standard 60 g/h). Gespeichert als Planeinstellung «pe-verpflegung» (Listen `davor`/`danach`, weil `vorher` dort schon belegt ist).
- **Verpflegung anpassen** je Einheit (g/h, nur Gels, Getränk zuerst, feste Nahrung zuerst, diesmal ohne) – Eingabe «verpflegung» → `plan_verpflegung`.
- **Nach dem Training** (nachher-1.1): ab 60 min (nicht Schwimmen, nicht Krafttraining) Magen und Energie gegen Ende; daraus mit dem Fueling-Protokoll der Abgleich geplant
  gegen genommen und der Vorschlag fürs Darmtraining.
- Wissen «verpflegung» (wissen-1.26): Thomas et al. 2016, Jäger et al. 2017; eigene Festlegungen gekennzeichnet.
- Ausgewählte Chips mit `aria-checked` sind jetzt sichtbar markiert (betraf auch «Nach dem Training» und die Schmerz-Frage im Check-in).
- Tests: `tests/test_verpflegung.cjs` (13), `tests/test_v81.cjs` (+1), `tests/test_tools.py` (+6).

## V8.1 · 18.11.2026 · Daten zusammenführen (Masterprompt V8, Etappe V8.1): Nach dem Training, Puls zur Leistung, TL ≈ wie gemessen, Anstieg der Belastung, wissen-1.25
- **Nach dem Training** (nachher-1.0): unter jeder erledigten Aktivität auf Heute und im Tagesblatt eine Zeile, die ein Blatt öffnet – Anstrengung (RPE 1–10), Gefühl in
  fünf Stufen wie auf der Uhr, leichter / wie erwartet / schwerer, bei Intervallen «alle / nicht alle / keine», Notiz. Was du auf der Uhr schon eingegeben hast (Garmins
  Selbsteinschätzung), holt das Nacht-Update und die Seite schlägt es vor; deine Eingabe gilt. Gespeichert in der Liste «rpe» über «Direkt speichern».
- **Puls zur Leistung** (hf-leistung-1.0) im Blatt: Puls bei gleicher Leistung bzw. gleichem Tempo gegen deine Basis – gleichmässige 10-min-Blöcke derselben Art (60 Tage)
  oder Abschnitte eines Workouts mit gleicher Leistung ±5 % und ähnlicher Dauer (90 Tage), nie das Mittel der ganzen Einheit. Zusammen mit «schwerer als erwartet» ein Satz
  zur Einheit; eine Einheit allein ändert den Plan nie.
- **Abweichung je Einheit** (last-abweichung-1.0): gemessene Last neben TL ≈ der geplanten Einheit, «mehr» bzw. «weniger als geplant» ab 1,3× (+15) bzw. 0,7× (−15).
  Abnahmetest D2 ist jetzt ein normaler Test.
- **TL ≈ wie gemessen** (tl-plan-1.1, Befunde 1–2 und 7 der Prüfung V8.0): geplante Last mit denselben Bezugsgrössen wie die absolvierte – Rad drinnen mit der LT2 der
  Rolle, draussen nach Puls (bzw. LT2 für draussen), Laufen nach Puls, Schwimmen mit der Last pro Bewegungsstunde deiner Schwimmeinheiten (die CSS gibt nur noch die
  Distanz). An deinen Daten liegen geplante und absolvierte Grundlage jetzt nahe beieinander (vorher war geplant deutlich leichter); die Naht der Fitness-Vorschau
  nach drei Wochen ist damit fast weg.
- **Anstieg der Belastung** (anstieg-1.0): Karte unter Analyse → Belastung und Erholung – langfristig (Fitness gegen vor vier Wochen), aktuell (Ermüdung ÷ Fitness) und
  geplant (Mein Plan, drei Wochen); über 1,5 «nimmt zu schnell zu». Fitness, Ermüdung, Last und Ampel bleiben getrennte Zahlen (Befund 3).
- **Check-in** (befinden-2.1): fünfte Frage «Motivation» und Schmerzen (keine / leicht / deutlich, mit Ort); Ampel readiness-2.3: Motivation tief und leichte Schmerzen
  sind schwache, deutliche Schmerzen ein starkes Zeichen, mit Empfehlung je Ort. Hinweis auf Heute, solange Eingaben nur auf dem Gerät liegen (Befund 15).
- **Harte Tage** (verfuegbarkeit-1.2, kraft-plan-1.2, Befund 10): harte Rad- und Laufeinheiten nie an zwei Tagen hintereinander; geht es nicht, meldet es die Woche.
- Gefühl-Kalibrierung ohne Krafttraining (Befund 14). Fitness-Karte: Krafttraining zählt nicht (Text nachgeführt).

## V8.0 · 18.11.2026 · Prüfung aller Modelle und Szenario-Tests A–H (Masterprompt V8, Etappe V8.0)
- **Simulator** (`tests/sim/`): lädt die echten Module der Seite ohne Browser und spielt Woche für Woche durch – Morgenwerte, Check-in, Ampel, Plan des Tages,
  Ausführung durch einen erfundenen Athleten. **Abnahmetests A–H** (`tests/test_v80.cjs`) über mehrere Wochen und ein Lauf über acht Wochen mit Kraft, langen
  Tagen, Krankheit, Lücken und Sperren: 20 Prüfungen erfüllt, 8 offen als «todo» mit der Etappe, die sie bringt (V8.1, V8.3, V8.4, V8.6).
- **Prüfung mit echten Daten** (`tools/pruefung_v8.cjs`, Zahlen nur im Chat): Befunde zu Bezugsgrössen (zwei LT2 für die Rad-Last, geplante Last unter der
  absolvierten), zwei Lastverhältnissen, Ampel (einzelner schlechter Morgen, Nachlauf des 7-Tage-Schnitts), fehlenden Daten, Fitness voraus und Wochensummen –
  Bericht in `docs/AUDIT_V8.md`.
- **Behoben:** Wochenkopf der Kalender-Liste und Wochenband im Monat rechnen wie die Wochenauswertung – Stunden nur Schwimmen, Rad, Laufen als Bewegungszeit,
  TL ohne Krafttraining, Mein Plan ohne Kraft und Mobility (bis V7.10: Timer-Zeit bzw. alle Sportarten und Kraft).
- Mobil: alle 22 Ansichten der Demo bei 390 px ohne Überlaufen; Datenschutz-Prüfungen bestanden.

## V7.10 · 18.11.2026 · Tagesblatt wie die Vorlage (tagesblatt-2.0), eigene Aktivität nach RPE (eigene-aktivitaet-1.0), wissen-1.23
- **Tagesblatt** (Etappe 4, Teil 3): oben Fitness, Ermüdung, Status und Form mit der Veränderung zum Vortag, die Erklärung hinter «i»; die Einheiten wie im Kalender
  (mit Mini-Profil); Zeilen «Training hinzufügen ›» und «Eigene Aktivität planen ›»; die Verfügbarkeit des Tages direkt im Blatt – Sportarten antippen, Zeit mit dem
  Regler (0–8 h, ganz rechts «offen»), sofort gespeichert; danach Krafttraining und unten klein «Tag sperren» und Garmin.
- **Eigene Aktivität planen:** Titel, Sportart, Datum, Uhrzeit, auf Wunsch jede Woche (bis 16 Wochen), Dauer und Anstrengung (RPE 1–10). Aus der Anstrengung die Zone
  für TL ≈ (Umkehrung von rpe-zonen-1.0); Skitour, Wandern, Langlauf und Traillauf öffnen «Draussen planen». Eigene Aktivitäten bleiben beim Anpassen an ihrem Tag.
- Etappe 4 ist damit vollständig (V7.7–V7.10).

## V7.9 · 18.11.2026 · Zyklus (zyklus-1.0), Fitness voraus (fitness-prognose-1.0), Bearbeiten als Modus (bearbeiten-1.0), wissen-1.22
- **Zyklus** (Etappe 4, Teil 2): oben je Woche eine Zeile «Phase | Wochenart · Stunden · TL» (Griff zieht den Monat auf), darunter vier Karten der gewählten Woche –
  Gesamtumfang (TL ≈ von Mein Plan und absolviert gegen den Bereich des Wochenvorschlags ± 7,5 %, Trainingsverfügbarkeit mit Hinweis, wenn die Zeit knapp wird),
  Fitness-Entwicklung bis zum Hauptrennen (gemessen, dann mit Mein Plan und der Steigerung fortgeschrieben, mit Band), Intensitätsverteilung und Fokus der Woche;
  darunter «Plan und absolviert» wie bisher. «Tage dieser Woche in der Liste» springt zur Liste.
- **Bearbeiten** wie die Vorlage: Knopf «Bearbeiten» in Liste und Zyklus. Oben ✕ und ✓, die Wochenkarte (locker gegen Z3–Z5, Zonen, TL ≈ mit Bereich) und die Woche als Zeile;
  je Tag der Trainingsstatus und ein Schloss, je Einheit ein Schloss und ein Griff zum Ziehen auf einen anderen Tag (antippen = Tag wählen). Unten ✨ «Woche anpassen?», ↶ und ↷.
  Alles bleibt ein Entwurf, bis ✓ speichert; ✕ verwirft. Währenddessen geht nichts an Garmin.
- Fitness, Ermüdung und Form ≈ im Tagesblatt rechnen Einheiten ohne TL ≈ (Tests, Schwimmen ohne CSS-Test) jetzt mit ihrer Dauer × deiner Last pro Stunde der Sportart
  statt mit 0. «absolviert» im Wochenkopf zählt Aktivitäten draussen mit (wie die Fitness).
- «Im Kalender öffnen» im Wochenblatt öffnet die Liste bei dieser Woche.

## V7.8 · 18.11.2026 · Kalender als Liste mit Raster (kalender-4.0), Trainingsstatus (trainingsstatus-1.0), wissen-1.21
- **Kalender wie die Vorlage** (Etappe 4, Teil 1): oben ein Raster mit zwei Wochen (Griff ziehen bzw. antippen = ganzer Monat), je Tag Sportsymbole und je Einheit ein Punkt
  in der Zonenfarbe ihres Schwerpunkts; darunter alle Tage als durchlaufende Liste mit Wochenköpfen «Phase | Wochenart», Plan- und Ist-Stunden und TL ≈. Einheiten mit
  Mini-Profil und «Dauer · ≈ km · TL ≈», Absolviertes mit Haken, Ruhetag und «Kein Training». Monatstitel und gewählter Tag folgen dem Scrollen; Tag im Raster antippen
  scrollt dorthin, «Heute» springt zurück. «⋯» am Tag öffnet das Tagesblatt, «⋯» am Wochenkopf «Woche bearbeiten». Ansichten: Liste · Zyklus (bisher «Woche») · Monat.
- **Trainingsstatus** im Tagesblatt: Ermüdung ÷ Fitness mit kleiner Skala, dazu bei Fitness, Ermüdung und Status die Veränderung zum Vortag.
- Aktivitäten draussen zählen jetzt auch in der Form-Vorschau und im TL ≈ der Woche.

## V7.7 · 18.11.2026 · Draussen planen: Skitour, Wandern, Langlauf, Traillauf (aktivitaet-plan-1.0), Zonen nach Puls prüfen (zonenpruefung-hf-1.0), wissen-1.20
- **Draussen planen** (Etappe 4, erster Teil; Regeln am 17.11. vorgeschlagen, am 18.11. bestätigt): im Tagesblatt unter «Training hinzufügen» → «Draussen – blockiert den Tag».
  Dauer 1–10 h, Z1 oder Z2 nach Puls (Pulszonen vom Laufen), Uhrzeit und Notiz. Der Tag gehört der Aktivität; ab 2 h am Vortag und am Tag danach keine harte Rad- oder
  Laufeinheit. Skitour, Langlauf und Wandern ersetzen Rad-Stunden (Z2 ganz, Z1 halb; zuerst die lange Ausfahrt, dann lockere), Traillauf Lauf-Stunden; Schlüsseleinheiten
  bleiben, der Rest kommt dazu. TL ≈ aus den eigenen Skitouren bzw. Wanderungen. Nicht an Garmin. Auch für die laufende, schon gespeicherte Woche.
- **Einheit-Seite** für diese Aktivitäten: Kopfbild, Dauer, Puls-Bereich, TL ≈, was sich in der Woche ändert, Regeln, «Ändern» und «Entfernen».
- **Zonen nach Puls prüfen** (Analyse → Laktat): bestätigte Messungen mit Puls aus den 10–20 min davor gegen den LT1-Wert des letzten Stufentests – «passt», «Z2 zu hoch»
  oder «unklar»; ein Hinweis erst nach drei gleichen Urteilen in acht Wochen, Zonen ändern sich nie von selbst.
- Schwimmkurs: letzter Kurstag eingetragen; danach plant die Seite dienstags wieder alle Sportarten.

## V7.6.2 · 17.11.2026 · Offene Punkte bereinigt, Kopfbilder, Kurzcheck nach Puls (bilder-1.0, kurs-1.0, aufbau-1.2, laktat-hf-1.0, wissen-1.19)
- **Kopfbilder der Einheit-Seite aus Silas' Fotos** (Wunsch vom 17.11.2026): Schwimmen, Laufen, Rad, lange Ausfahrt, Wandern und Skitour statt des Berg-Symbols. Die Fotos
  liegen nur verschlüsselt im Repository (`bilder/`, Format wie die Reihen, 64-KiB-Stufen, Namen aus dem Salz, ohne EXIF); die Demo zeigt weiter das Symbol.
  Neues Werkzeug `tools/bilder_crypt.mjs` (schreiben, pruefen).
- **Schwimmkurs mit letztem Kurstag** (kurs-1.0): unter Schwimmen «Schwimmkurs (Dienstag)» mit Datum und «An Kurstagen nur Schwimmen». Der Dienstag steht wieder auf 2:45 h
  mit allen Sportarten; solange der Kurs läuft, bleibt er ein reiner Schwimmtag, danach plant die Seite dort ohne weiteres Zutun alle Sportarten und lockeres Schwimmen.
- **Aufbau-Grenze weit voraus** (aufbau-1.2, offener Punkt 96): geplante Läufe der Wochen dazwischen zählen mit – Wochen ab etwa vier Wochen voraus sahen bisher wie nach
  einer Laufpause aus (lange Läufe höchstens 30 min).
- **Langer Lauf am Sonntag** (offener Punkt 97, ab der Woche vom 23.11.2026): am Donnerstag hatte er neben Rad-Schlüssel und CSS keinen Platz.
- **Kurzcheck nach Puls** (laktat-hf-1.0, Wunsch vom 17.11.2026 für Skitour, Wandern, Langlauf und Grundlage): im Explorer «Puls aus den 10, 15 oder 20 min vor der
  Messung»; gespeichert mit höchstem Puls, Pulsanstieg und Zeit. Eine Messung aus der Garmin-Notiz lässt sich im Bestätigen-Blatt mit «Puls aus der Aufzeichnung» so erfassen.
  Zonen ändern sich dadurch nicht; die Zonen-Prüfung für Einheiten nach Puls ist mit der Planung von Skitour, Wandern und Langlauf (Etappe 4) vorgeschlagen.

## V7.6.1 · 17.11.2026 · Etappe 7, Teil 2: Woche ums Krafttraining abgestimmt, Tag automatisch; Planeinstellungen «Allgemein» (kraft-plan-1.1, verfuegbarkeit-1.1, pmc-2.1, wissen-1.18)
- **Krafttraining, Tag automatisch oder fest** (Silas' Wunsch: der Tag soll nicht fix sein, nie vor Intervallen, ein Tag mit kurzem Lauf geht, Donnerstag nie): «Automatisch»
  mit möglichen Tagen – die Seite bewertet jeden möglichen Tag an der schon nach der Verfügbarkeit verteilten Woche (eigene Gewichte, Wissen «kraft») und nimmt den besten;
  passt das Krafttraining dort ohne Umziehen, bleibt die Woche, sonst wird sie mit ihm neu verteilt. «Fester Tag» wie bisher.
- **Die neun Regeln (von Silas am 17.11.2026 freigegeben):** am Tag danach keine harte Rad- oder Laufeinheit (umziehen, sonst locker, gemeldet; die Ampel holt dort nichts
  nach, ampel-plan-1.1); am Krafttag darf eine harte Einheit bleiben (Hinweis unter 6 h Abstand), eine lockere Einheit an Land höchstens 60 min, lange nur Hinweis; belegt
  seine Zeit, zählt nicht; nicht am Test- und Vortag; keine Kraft in Rennwochen, im Taper nur 7–10 Tage vor dem A-Rennen mit zwei Dritteln; Erholungswoche zwei Drittel;
  «vorsichtig»: bleibt; sRPE als eigene Zahl; nicht an Garmin.
- **Krafttraining zählt nicht mehr in Fitness, Ermüdung und Form** (pmc-2.1), in der Ampel-Last (readiness-2.2; an 180 Tagen nachgerechnet: ein Tag anders) und in den Ringen
  (ringe-1.1), in der Form-Prognose und in «Wochenlast je Sportart». In «Diese Woche» (Heute) und in der Wochenauswertung (Kalender) steht es als eigene Zeile, nicht in
  Trainings und Dauer.
- **Planeinstellungen → Allgemein** (neue erste Seite, Vorbild «Allgemeine Planeinstellungen» von enduco, Texte eigen): **Trainingsverfügbarkeit** aller sieben Wochentage
  in einem Blatt (Kein Training, Sportarten, Zeit in 15-min-Schritten bis 10 h oder offen; auch aus dem Tagesblatt), **Tage für lange Einheiten** (Rad und Laufen, ab der
  nächsten Woche; Empfehlung, eine lange Einheit zieht nur auf einen gewählten Tag mit Platz und ohne harte Einheit an Land, sonst Hinweis), Testkalender.
- Verteilen (verfuegbarkeit-1.1): Meldungen nennen den Grund (Verfügbarkeit, Tag für lange Einheiten, Tag nach dem Krafttraining); hart und lang an Land am selben Tag −120
  statt −40. Silas' Einstellungen aus Enduco übernommen (Mo frei, Di nur Schwimmen, Mi–Fr 2:45 h, Sa/So 5:00 h, lange Ausfahrt Sa/So, langer Lauf Do; Krafttraining
  automatisch ohne Do, 1:30 h) – die laufende Woche bleibt, wie sie war.
- Tests: `tests/test_v76.cjs` (Regeln, Tag automatisch, lange Tage, ab nächster Woche), `tests/test_formkurve.cjs` (Last ohne Krafttraining), `tests/test_tools.py`
  (Python prüft modus, mögliche Tage und pe-lang wie die Seite).

## V7.6 · 17.11.2026 · Etappe 7, Teil 1: Krafttraining als fester Termin (kraft-plan-1.0, wissen-1.17)
- **Planeinstellungen → Krafttraining** (neue Seite zwischen Schwimmen und Trainingsumfang, auch aus dem Tagesblatt und der Einheit-Seite): an/aus, Wochentag,
  Uhrzeit (Stunde und Minute in 5er-Schritten oder ohne), Dauer 15–180 min (Standard 1:30 h), Notiz für die Übungen. Gilt ab der Woche nach dem Speichern.
- **Im Plan:** die Einheit «Krafttraining» (fester Termin) mit Kraft-Symbol und Uhrzeit in Mein Plan, im Kalender, im Tagesblatt und auf Heute. Sie zählt nicht zu den
  Wochenstunden Schwimmen, Rad, Laufen, hat keine TL ≈ und geht nicht in die Form-Prognose und nicht an Garmin; beim Verteilen nach der Verfügbarkeit bleibt sie an
  ihrem Tag und belegt dort ihre Zeit (V66.verteilen: wie ein Test). Aufgezeichnete Garmin-Krafteinheiten zählen wie bisher in Fitness und Form (pmc-2.0).
- **Einheit-Seite:** Dauer, Uhrzeit und sRPE, die Übungen (Notiz), RPE 1–10 nach der Einheit → sRPE = RPE × Minuten (Foster 2001; Dauer aus Garmin, wenn aufgezeichnet,
  sonst geplant), «Nur diese Woche» (anderer Tag, auslassen) und der Termin; ohne Ablauf, Zonen und Export. In kommenden Wochen wird «Nur diese Woche» als Ausnahme
  «pe-kraft-<Montag>» gespeichert (die Woche rechnet mit dem neuen Tag), in der laufenden Woche und an gespeicherten Tagen über Mein Plan.
- **Planeinstellungen `vorher`:** Start, Basis-Fitness und Krafttraining gelten ab der nächsten Woche. Da die Daten je ID nur die neueste Fassung behalten, trägt ein
  Eintrag nun die Fassung mit, die in der Woche des Speicherns noch gilt – sonst fiele die laufende Woche nach dem nächsten Update auf den Standard (betraf auch
  Start und Basis-Fitness aus V7.5.2). Prüfung gleich in `V75.pruefen` und `merge_daily.planeinstellung_pruefen`.
- **Offen:** die Abstimmung der Woche (Tag danach, Krafttag, Tests, Taper, Rennwochen, Erholungswoche, Ampel) – Vorschlag an Silas vom 17.11.2026, gebaut wird erst
  nach seinem Okay.
- Wissen 1.17: Kapitel «Krafttraining» (Rønnestad & Mujika 2014, Rønnestad et al. 2010, Doma et al. 2017, Lauersen et al. 2014, Foster et al. 2001), «Was nicht drin ist»
  im Kapitel «Modelle» und «Kraft» im Kapitel «Langdistanz» nachgeführt. Neue Symbole «notiz» und «ausnahme» (eigene). Tests: `tests/test_v76.cjs`, `tests/test_tools.py`.
- Eine mit Garmin aufgezeichnete Krafteinheit (Typ «Krafttraining»/«Strength») erledigt das geplante Krafttraining desselben Tages (Tagesleiste, Kalender,
  Tagesblatt; `V6.sportVon`), sonst stünde es nach dem Tag als verpasst da.
- Nebenbei: `chart()` zeichnet ohne Chart.js beim zweiten Mal nicht mehr ins Leere (Fehler nur ohne Netz); RPE der Krafttrainings zählt nicht in der Kalibrierung rpe-1.0.

## V7.5.2 · 17.11.2026 · Basis-Fitness Variante A, 20/50/30 wählbar (basis-1.1, wissen-1.16)
- **Start des Plans aus der Basis-Fitness (Silas' Wahl):** je Sportart 7 × Fitness ÷ Trainingslast pro Stunde (deine 8 Wochen) = der Umfang, bei dem die Fitness
  gleich bleibt. Fitness mit dem Stand vom Montag (bis zum Sonntag davor), damit sich eine Woche unter der Woche nicht ändert. Ohne Last pro Stunde (weniger
  als 1 h in 52 Wochen) beginnt die Sportart mit «jetzt» × Anteil.
- **Eigener Wert je Sportart:** Ring antippen → Regler (mit − und +), live der Start daraus, «Zurück auf berechnet», Datum der Änderung (`pe-basis-schwimm`/`-rad`/`-lauf`).
- **Wahl im Trainingsumfang:** «Basis-Fitness» oder «jetzt» mit 20/50/30 wie bisher (`pe-start`); die Kurve zeigt die Wahl sofort.
- Start, eigene Fitness und Steigerung gelten ab der nächsten Woche; die laufende Woche bleibt. Standard «Basis-Fitness» ab der Woche vom 23.11.2026.
  Wochenstunden zeigen «diese Woche» und den neuen Start; «jetzt» steht dort nur, solange ein Start mit 20/50/30 gilt.
- Prüfung in `merge_daily.planeinstellung_pruefen` wie `V75.pruefen`, Tests in `tests/test_v75.cjs` und `tests/test_tools.py`, Wissen 1.16 (Kapitel
  «Planeinstellungen» und «Aufbau»).

## V7.5.1 · 17.11.2026 · Etappe 3 nach dem Auftrag: Blatt-Folge, Anfänger-Modus, Stile auf der Uhr (garmin-senden-1.2, wissen-1.15)
- **Planeinstellungen als Folge wie die Vorlage:** Laufen → Rad → Schwimmen → Trainingsumfang, unten «‹» und «Weiter», auf dem letzten «Fertig ✓».
  Geöffnet über Plan → Plan verwalten (zuoberst), das Profil (Training) und die Wochenstunden («Trainingsumfang ändern»); der Link `#plan-einstellungen`
  öffnet Plan mit dem Blatt. Die eigene Ansicht aus V7.5 entfällt. Jede Auswahl wird beim «Übernehmen» gespeichert, die Steigerung mit «Fertig ✓».
- **Basis-Fitness:** Die Ringe zeigen die Fitness je Sportart; wie sie den Start des Plans bestimmt, legt Silas nach dem Vorschlag vom 17.11.2026 fest
  (so verlangt der Auftrag: «Rechenregel zuerst als Vorschlag»). Bis dahin beginnt der Plan wieder wie bis V7.4 bei «jetzt» mit 20/50/30 (die Regel aus V7.5,
  «Anteil der 8 Wochen», ist zurückgenommen), «jetzt» steht wieder in den Wochenstunden, und es gibt keinen eigenen Wert («pe-basis» wird abgelehnt).
- **Trainingsumfang:** je Bereich ein Wort und eine Farbe (sanft, ausgewogen mit dem Standard 100 %, zügig, steil, maximal), Griff in der Farbe des Bereichs;
  die Kurve reicht bis zum Hauptrennen (mit Taper, Achse ab 0 h), Fläche = Bereich 50–150 %, live beim Ziehen.
- **Schwimmen (schwimmeinheit-1.2):** Anfänger-Modus als Schalter – nur einfache Übungen mit 15 s Pause, Hauptserie 100 m mit 45 s, CSS 50 m mit 30 s, Beine
  und Steigerungen 25 m, Pull 50 m mit 30 s; die Übungen bleiben direkt nach dem Einschwimmen. Stile: Kraul immer, dazu Rücken und/oder Brust (Delfin
  entfällt); je Woche ein gewählter Stil (abwechselnd) als eigener Teil am Ende des Ein- und des Ausschwimmens, in ganzen Bahnen, statt «gemischt».
- **An Garmin (garmin-senden-1.2):** dieser Teil geht mit seinem Stil an die Uhr – Rücken «backstroke», Brust «breaststroke» (Kennung aus einem
  Enduco-Workout mit Brust gelesen), alles andere «free»; das ganze Einschwimmen ist «warmup». `tools/garmin_senden.py` prüft die drei Stile und liest sie
  zurück. Auf der Fenix noch nicht geprüft.
- Auf dem Gerät fallen Planeinstellungen weg, sobald die Daten dieselbe oder eine neuere Fassung haben oder sie ungültig sind (z. B. «pe-basis» aus V7.5).
- Wissen 1.15 (Kapitel «Planeinstellungen»: Basis offen, Worte des Reglers, Stile, Anfänger-Modus; «Aufbau» ohne «eigenes Verhältnis»). Tests in
  `tests/test_v75.cjs` (Stil-Teile, Anfänger-Modus, Garmin-Stile), `tests/test_tools.py`, `tests/test_v73.cjs`.

## V7.5 · 17.11.2026 · Etappe 3: Planeinstellungen wie bei enduco (planeinstellungen-1.0, basis-1.0, steigerung-1.0, indoor-phase-1.0, wissen-1.14)
- **Neue Ansicht Plan → Planeinstellungen** (erste Zeile unter «Plan verwalten»): Trainingsumfang mit Kurve, je Sportart Basis-Fitness, für Rad und Laufen
  die Indoor-Phase, fürs Schwimmen Equipment, Standard-Bahnlänge und Stile. Gespeichert mit «Direkt speichern» (Eingabe `planeinstellung` →
  `plan_einstellungen`, `merge_daily.planeinstellung_pruefen`, gleiche ID ersetzt mit Audit, ältere Fassung nie). Ohne Einstellung rechnet alles wie bisher.
- **Basis-Fitness je Sportart (basis-1.0):** im Kreis die Fitness der Sportart (42-Tage-Mittel ihrer Trainingslast, Stand zu Tagesbeginn) zum Vergleich mit
  Enduco; der Plan beginnt beim gewohnten Umfang je Sportart = Anteil der Sportart an den 8 abgeschlossenen Wochen × «jetzt» (zusammen genau «jetzt»), oder
  bei deinem Wert je Sportart. Neu beginnt die laufende Woche damit nicht mehr mit 20/50/30, sondern mit deinem Verhältnis; vergangene Wochen im Vergleich
  werden mit dieser Regel nachgerechnet.
- **Steigerung (steigerung-1.0), ein Regler für alle drei Sportarten** (50–150 %): jede Sportart von ihrem Start zu ihrem Anteil an der Spitzenwoche;
  100 % = gleichmässig bis zur Woche vor dem Taper (genau wie bisher saison-1.2), mehr = früher an der Spitze, weniger = darunter. Neu höchstens 10 %
  (mindestens eine halbe Stunde) mehr als in der Woche davor. Die Wochenstunden-Ansicht zeigt den Start aus den Planeinstellungen und speichert nur noch
  die Spitzenwoche («jetzt» kommt aus der Basis; ein früher gespeichertes «jetzt» gilt weiter, bis du die Spitzenwoche neu speicherst).
- **Indoor-Phase (indoor-phase-1.0):** Rad- bzw. Laufeinheiten von … bis … gelten als drinnen (Rolle, Laufband) – in Mein Plan, Kalender, Ampel-Fassung und
  Export; Dauer und Inhalt bleiben. Eine einzelne Einheit stellst du auf ihrer Seite um; gespeichert wird nur, was von der Phase abweicht
  (einheit-felder-1.1: `drinnen` false = ausdrücklich draussen). «Training hinzufügen» heisst in der Phase «Rad draussen» bzw. «Laufen draussen».
- **Schwimmen (schwimmeinheit-1.2):** Übungen nur mit vorhandenen Hilfsmitteln; ohne Brett Beine in Seitlage mit Flossen, ohne beides kein Beine-Block,
  ohne Pullbuoy kein Pull (die Zeit geht in die Hauptserie); Ein- und Ausschwimmen gemischt mit deinen Stilen (Kraul immer, Standard wie bisher Kraul und
  Rücken). Die Technikübungen stehen weiter direkt nach dem Einschwimmen (Test für alle Arten, Dauern, Bahnlängen und Ausrüstungen). Standard-Bahnlänge in
  den Planeinstellungen (vorher je Gerät); je Einheit auf der Einheit-Seite (`pool`, einheit-felder-1.1). Auf der Uhr bleibt der Stil «Freistil».
- Nachtrag zu V7.4: Ampel-Entscheide und Planeinstellungen werden auf dem Gerät aufgeräumt, sobald sie eingespielt sind.
- Wissen 1.14: Kapitel «Planeinstellungen» (Basis, Steigerung mit Buist 2008, Nielsen 2014, Frandsen 2025, Gabbett 2016 – eine sichere Rate gibt es nicht;
  Indoor, Schwimmen). Tests `tests/test_v75.cjs` und `tests/test_tools.py` (gleiche Prüfung in JS und Python), alles mit erfundenen Werten.

## V7.4 · 17.11.2026 · Etappe 6: Die Ampel passt das Training an (ampel-plan-1.0, eigenplan-1.2, wissen-1.13)
- **Ohne Knopfdruck:** Zeigt die Ampel am Morgen «vorsichtig», werden die Einheiten von heute leichter – harte und mittlere Abschnitte (VO2max,
  Schwelle, Tempo, Renntempo, CSS) fallen weg, die Einheit wird zur lockeren derselben Sportart; Einheiten über 90 min oder der Art «lang» dauern
  höchstens zwei Drittel; ein Test wird nicht müde gemessen (locker, im Testkalender verschieben). Mit Krankheitszeichen im Check-in ist Ruhetag.
  Vor den Morgenwerten der Nacht zählt nur der Check-in. Nie härter, nie länger, nie eine andere Sportart; gesperrte Einheiten bleiben (Hinweis).
- **Nachholen:** Die ausgefallene Schlüsseleinheit kommt am nächsten passenden Tag derselben Woche an die Stelle einer lockeren Einheit derselben
  Sportart (höchstens so lang, nicht neben einer harten Einheit an Land, nicht vor Test oder Rennen, nie in Rennwochen); passt kein Tag, entfällt sie –
  gemeldet. Ob sie stattfindet, entscheidet die Ampel jenes Morgens.
- **Sichtbar überall:** «Angepasst wegen Ampel» mit Gründen und der ursprünglichen Einheit auf Heute, im Tagesblatt und auf der Einheit-Seite, Zeile
  im Kalender; «Trotzdem wie geplant» je Tag. Ab dem dritten Tag «vorsichtig» in Folge: «Woche anpassen?» – Rest der Woche als Erholungswoche, nur auf
  Knopfdruck (eigenplan-1.2). TL ≈, Form, Kalender und Plan-Übersicht rechnen mit dem, was galt; Mein Plan bleibt gespeichert, wie er war.
- **Gespeichert** wird je Tag nur der Entscheid (Eingabe `ampel` → `ampel_anpassung`, `merge_daily.ampel_pruefen`), von der Seite und vom Morgen-Update.
- **Garmin (Entscheid A7):** Jeder Auftrag trägt zu harten Einheiten die lockere Fassung mit; das Morgen-Update ersetzt bei «vorsichtig» die eigene harte
  Einheit von heute auf der Uhr (`tools/ampel_heute.mjs`, `garmin_senden.py ampel`, gleiche Rücklese wie beim Senden). Klappt das nicht, sagt die Seite:
  «Auf der Uhr steht noch die harte Fassung – locker fahren bzw. laufen». Auf der Uhr noch nicht geprüft.
- Wissen 1.13: Kapitel «Erholung, HRV und die Ampel» mit den Regeln und zwei Meta-Analysen (Düking et al. 2021, Manresa-Rocamora et al. 2021: mindestens
  gleich gut wie ein fester Plan, mit weniger Fehlschlägen – nicht «besser»). Tests `tests/test_v74.cjs` (jede Stufe, Krankheit, Nachholen, Rennwoche,
  gesperrt, «Trotzdem», Woche anpassen, Garmin-Auftrag) und `tests/test_tools.py` (Prüfung, Zusammenführen, Morgen-Update), alles mit erfundenen Werten.

## V7.3.2 · 17.11.2026 · Technikübungen wie in den Enduco-Einheiten (uebungen-2.1, schwimmeinheit-1.1)
- **Übungsliste von Silas** (27 Kraul-Übungen aus 34 Enduco-Einheiten, Stand 16.11.2026): alle werden erkannt (`SW.finde`, Namen wie in Enduco); 13 neue
  Übungen mit eigenen Beschreibungen (Scheibenwischer, Kraul mit gespreizten Fingern, Entenpaddeln, Wasserwerfen, Schulterdehnung, Po – Achsel – Kopf,
  Zurückspulen, Einarmig mit Brett, 3-3-3, Zwei Züge pro Seite, Balance-Übung, Atmung im Zweierzug, Atempyramide); «Schulter tippen» heisst jetzt
  «Achsel tippen», «Kopf-hoch-Kraul» «Wasserball-Kraul». Nötige Hilfsmittel wie dort (Flossen bei 9, Brett bei 4 Übungen; Einarmig kraulen mit beidem).
- **Abwechslung:** je Woche drei Übungen aus drei von fünf Gruppen (Armzug unter Wasser, Rückholung, Einarmig und Timing, Wasserlage und Beinschlag,
  Atmung und Kopf), jede Gruppe beim nächsten Mal mit der nächsten Übung – in 60 Wochen kommt jede vor, keine zweimal hintereinander. «Schulterdehnung»
  steht nur im Katalog (die Ausführung ist nicht eindeutig beschrieben).
- **Schwimm-Einheit 1.1:** immer drei Übungen je 2 ×, Übungsstrecke wie bei Enduco (12,5, 25 oder 50 m), danach die Bahn locker fertig, 5 s Pause am
  Beckenrand; «¼ L», «¾ L» und «1½ L» in der Anzeige. Im Übungsblatt steht, ob die Übung aus den Enduco-Einheiten kommt.
- **Garmin:** Test-Upload eines Schwimm-Workouts mit erfundenen Werten (mit Silas' Okay): Garmin speichert Übungen («other»), Brett, Pullbuoy (ID 4 jetzt
  bestätigt), CSS-Abstände und Texte unverändert; danach gelöscht, nie eingeplant. Wie die Fenix es zeigt, ist weiter offen.
- Wissen wissen-1.12; Tests `tests/test_v72.cjs` (Liste, Strecken, Hilfsmittel, Abwechslung über 60 Wochen, ganze Bahnen), `tests/test_v73.cjs` nachgeführt.

## V7.3.1 · 17.11.2026 · Auftrag V7.3, Etappe 2: Schwimmen an Garmin, Puls und RPE auf der Uhr (garmin-senden-1.1)
- **Schwimmen wie Enduco:** «Export» bzw. «An Garmin senden» schickt eigene Schwimm-Einheiten aus Mein Plan als Garmin-Workout – Format aus den
  Enduco-Workouts gelesen (`get_workout_by_id` raw): Bahnlänge des Geräts (25/50 m), Strecken in ganzen Bahnen, Pausen am Beckenrand (fixed.rest),
  jede Technikübung als eigener Schritt «other» über die ganze Bahn («½ L | Reissverschluss | Technik | RPE 2–3 | Bahn locker beenden», im 25-m-Becken
  ohne «Bahn beenden»), Wiederholungen als Gruppe, Stil Kraul, nötige Hilfsmittel als Hilfsmittel des Schritts (Brett, Pullbuoy, Flossen, Paddles),
  freiwillige im Text. Mit CSS-Test bekommt jeder Schritt mit Tempo das Nebenziel «Abstand zur CSS» wie bei Enduco und das Tempo im Text; ohne Test
  (oder Metrik RPE) die Anstrengung im Text. Die Uhr rechnet mit ihrer eigenen CSS – Garmin liefert sie nicht, das Export-Blatt sagt es; die CSS geht
  nie nach Garmin. Schwimmkurs und CSS-Test werden nicht gesendet (mit Grund). Die Schwimm-Einheit ist dieselbe wie auf der Einheit-Seite
  (`V66UI.schwimmEinheit`), deshalb stimmen Meter, Übungen und Fassung überein.
- **Puls und RPE auf der Uhr:** Rad und Laufen mit Metrik Puls gehen mit eigenem Pulsbereich (bpm) je Schritt an Garmin (heart.rate.zone ohne
  Garmin-Zone; Lage wie auf der Seite, Renntempo = oberes Drittel von Z2 und offene Z5 + 10 % als eigene Festlegungen), mit Metrik RPE ohne Ziel und
  mit RPE im Text. Metrik-Blatt und Export-Blatt sagen, was gesendet wird.
- **`tools/garmin_senden.py` 1.1:** Prüfung für Schwimmen (Bahnlänge, ganze Bahnen, Kraul, bekannte Hilfsmittel, Nebenziel CSS, Pausen) und Puls;
  Rücklese vergleicht zusätzlich Texte (gekürzt = abweichend), Bahnlänge, Stil, Hilfsmittel und CSS-Abstand. Ablauf im Nacht-Update unverändert.
- `js/schwimmen.js`: Teile tragen das Tempo als Zahl (`tempo_s`), die Einheit die CSS (`css_s`) – nur ergänzt, schwimmeinheit-1.0 unverändert.
- Wissen wissen-1.11 (Kapitel «Modelle», Abschnitt «An Garmin senden»).
- Tests: `tests/test_v73.cjs` (Schwimmen 25/50 m, 30–75 min, mit und ohne CSS, Hilfsmittel, Puls und RPE, gleiche Lage wie die Seite),
  `tests/test_tools.py` (Prüfung und Rücklese für Schwimmen, Ablehnungen, Puls, Ablauf plan → rueck), `tests/test_v66.cjs` nachgeführt.
  Noch nicht an Silas' Geräten geprüft: das erste echte Senden zeigt die Rücklese.

## V7.3 · 16.11.2026 · Auftrag V7.3 «wie enduco», Etappe 1: Einheit wie Trainingsbriefing, mit allen Schritten
- **Schritte `schritte-1.0` (`js/v73.js`, ohne DOM):** jede Einheit als Schritte und Blöcke – einfahren, Belastung, Erholung, ausfahren, Pause; beim
  Schwimmen dazu Technikübung, «Bahn locker beenden» und Pause am Beckenrand. Wiederholungen werden erkannt, auch verschachtelt («3 × Serien» mit
  «13 × 30 s hart / 15 s locker»), auch wenn der letzten Wiederholung die Erholung fehlt. Blöcke heissen nach ihrem Inhalt (VO2max-Intervalle,
  Schwellen-Intervalle, Schwelle mit Laktat, Tempo-Blöcke, Renntempo-Blöcke, CSS-Wiederholungen …), jeder Schritt hat eine eigene Anweisung.
  Quelle sind immer die Abschnitte der Einheit (`teile`, Schwimm-Einheit, Workout aus Garmin): Zeiten und Zonen sind dieselben wie bei TL ≈, Profil,
  Fokus und Verteilung. Bibliotheks-Workouts: Blockname aus der Schritt-Beschreibung, «Finish Lane» → Zeile «Bahn beenden», «Break» → «Pause am
  Beckenrand», Übungsblöcke als Abschnitt «Technikübungen», Hilfsmittel und Stil aus Garmin (`stroke_type` neu in `TR.auffalten`).
- **Einheit als ganze Seite `einheit-2.0` (`js/v73-ui.js`, Vorbild enduco, eigene Gestaltung):** schiebt von rechts herein (kurz graue Platzhalter),
  Kopfbild über die ganze Breite (eigener Bergausschnitt aus logo.jpg, `logo-einheit.jpg`, getönt in der Sportfarbe) mit «Trainingsbriefing», Schloss
  und Titel; beim Scrollen bleibt oben ein schmaler Kopf. Chips Datum · Uhrzeit «Festlegen» · Sperren; Kacheln Outdoor/Indoor bzw. Bahnlänge ·
  Metrik · Optionen; Dauer · Training Load ≈ · Distanz ≈; Fokus-Skala mit Chips und «i»; Equipment (Schwimmen); Ablauf mit Zeitachse; alle Schritte als
  Karten (Symbol je Art, Dauer bzw. Meter und Bahnen mit ≈ Zeit, Ziel in der gewählten Metrik, Anweisung, Trittfrequenz, Stil, Hilfsmittel, Zonen-Chip);
  Blockkopf → Blatt mit Erklärung und Schritten; Coach-Karte (Zweck und Aufbau, «i» → Warum mit Quellen); Intensitätszonen mit Bereich, Zeit und Anteil
  («i» → Intensitätsverteilung). Unten schwebend «Zurück» und «Export». Gilt für Mein Plan (Kalender, Tagesblatt, Heute, Woche nach Modell) und für
  Bibliotheks-Workouts (nur lesen); «Zurück» führt dorthin, woher die Einheit kam.
- **Blätter aus der Seite:** Datum (verschieben innerhalb der Woche), Uhrzeit-Rad (Stunden, Minuten in 5er-Schritten; die Uhrzeit steht danach in
  Kalender, Tagesblatt und Heute), Sperren je Einheit (bleibt bei «Woche anpassen» und «Neu berechnen»), «Zu Indoor ändern?», Trainingsmetrik (Rad
  Leistung/Puls/RPE, Laufen Pace/Puls/RPE, Schwimmen Pace/RPE), Bahnlänge, «Workout bearbeiten» (Trainingsdauer, Warm-up-Dauer, Intervall-Intensität,
  Löschen mit Rückfrage), Zone erklärt, Export.
- **Felder je Einheit `einheit-felder-1.0`:** `uhrzeit`, `gesperrt`, `metrik`, `drinnen`, `ein_min`, `pausen` in `plan_woche` (`V66.aendern` Art
  «einheit», `V66.feldPruefen` = `merge_daily.einheit_feld_pruefen`). Eine gesperrte Einheit lässt sich nur entsperren; verschieben, entfernen und
  ändern lehnt die Seite ab; «Neu berechnen» lässt Tage mit gesperrten Einheiten stehen.
- **Einfahren und Intervall-Intensität `einheit-anpassen-1.0` (eigene Festlegung):** Warm-up 5–40 min (zuerst Z1, Rest Z2); Intervall-Intensität
  0–100 % in 10er-Schritten, 50 % = Vorlage: Pausen zwischen den Intervallen × (1,5 − Wert/100); Intervalle und Ausfahren bleiben. Ändert den Inhalt –
  aus «Vorschlag» wird «eigen».
- **RPE je Abschnitt `rpe-zonen-1.0` (eigene Zuordnung auf der CR-10-Skala):** locker 1–2, Grundlage 3–4, Renntempo 4–5, Tempo 5–6, knapp unter LT2 6–7,
  CSS 7, VO2max 8–9. Pulsziele aus den Pulszonen des aktiven Zonenprofils (gleiche Lage wie die Leistungs- und Pace-Ziele).
- **Export einer Einheit (garmin-senden-1.0 mit Auswahl):** «Export» legt den Auftrag des Tages mit dieser Einheit an; Einheiten, die schon in Garmin
  oder im offenen Auftrag sind, bleiben drin (`teil: true`, `V66UI.einheitSenden`; nach Änderungen bleibt die Auswahl). Stand im Blatt: in Garmin,
  geändert, wird gesendet, Fehler, abgelehnt; «Aus Garmin austragen». `tools/garmin_senden.py` prüft `teil` (ja/nein). An Garmin gehen weiter die Ziele
  nach Leistung bzw. Tempo; Puls- und RPE-Ziele auf der Uhr kommen mit dem Schwimm-Export (Etappe 2).
- Wissen wissen-1.10 (Kapitel «Intervalle»: Einheit als Schritte, Einfahren und Intervall-Intensität, Steuern nach Anstrengung; Regeln ergänzt).
- Tests: `tests/test_v73.cjs` (neu: Dauer und Zonen aller Vorlagen, Blöcke und Namen, Schwimmen, Enduco-Beschreibung, Workout aus Garmin, Achse,
  Fokus, Coach, Ziele je Metrik, Felder, Sperre, Anpassen, Neu berechnen), `tests/test_tools.py` (Felder in `planwoche_pruefen`, Auftrag mit `teil`),
  `tests/test_v64.cjs` (Wissen 1.10). Im Browser geprüft (390 px, Demo, hell und dunkel, 1280 px): Rad, Laufen, Schwimmen locker (25/50 m),
  CSS-Test, Schwimmkurs, lange Ausfahrt, Bibliothek; alle Blätter; Zurück ins Tagesblatt und in den Kalender.
- Nachtrag nach der Prüfung mit den echten Daten: Übungen aus Bibliotheks-Workouts («½Lanes … Finish Lane», die Strecke des Schritts ist die ganze
  Bahn) erscheinen wie in Mein Plan als «25 m · ½ L» Übung und «Bahn locker beenden» (Zeit nach Strecke geteilt, Summe gleich); «Diese Woche» auf Heute
  zeigt «0 min» statt «0 s».

## V7.2 · 16.11.2026 · Wünsche vom 16.11.2026, Teil 2: Schwimmen wie im Becken, Verfügbarkeit und Kalender wie enduco
- **Schwimm-Einheiten `schwimmeinheit-1.0` (`js/schwimmen.js`, `js/schwimmen-ui.js`):** eigene Schwimm-Einheiten (locker, CSS-Wiederholungen,
  CSS-Test) stehen beim Antippen als Serien da wie im Becken: Einschwimmen, Technikübungen (aufklappbar), Beine mit Brett, Hauptserie, Pull mit
  Pullbuoy bei langen Einheiten, Ausschwimmen – je Teil Meter, Bahnen («½ L» im 50-m-Becken), ≈ Zeit, Pause am Beckenrand, Tempo aus dem CSS-Test
  oder Anstrengung (RPE) ohne Test, Hilfsmittel nötig/freiwillig. Meter aus der Plandauer (mit CSS aus dem CSS-Tempo, sonst Richtwert aus deinen
  Becken-Einheiten, ohne Tempoziel). Beckenlänge 25/50 m je Gerät (Standard: häufigste in deinen Enduco-Schwimm-Workouts). Die Übungen wechseln
  jede Woche (drei Gruppen: Lage und Rotation, Armzug, Beine und Atmung).
- **Technikübungen `uebungen-2.0`:** 22 Übungen, je mit Wofür, So geht's, Worauf achten, Typische Fehler, Hilfsmitteln (Brett, Pullbuoy, Flossen,
  Paddles; nötig oder freiwillig) und üblicher Dosierung – eigene Beschreibungen. Karte «Technikübungen» unter Analyse → Schwimmen mit Filter nach
  Hilfsmittel und Schwerpunkt. In Enduco-Schwimm-Workouts (Bibliothek) zeigt jeder Schritt, der eine bekannte Übung ist, ein «i» mit dieser
  Erklärung, dazu das Hilfsmittel aus Garmin (`equipment_type`).
- **Verfügbarkeit `verfuegbarkeit-1.0` (Vorbild enduco):** im Tagesblatt je Tag oder «jeden Dienstag» Zeit (0–8 h, «offen») und erlaubte Sportarten
  (Schwimmen, Rad, Laufen); gespeichert über «Direkt speichern» (Eingabe `verfuegbarkeit` → `plan_verfuegbarkeit`, `merge_daily.verfuegbarkeit_pruefen`).
  Der Vorschlag verteilt sich danach (`V66.verteilen`): Einheiten bleiben an ihrem Tag, wenn sie dort passen (wenig zu lang: um höchstens ein Viertel
  gekürzt); sonst auf den besten anderen erlaubten Tag – nahe am ursprünglichen, harte Rad- und Laufeinheiten nicht hintereinander und nicht am selben
  Tag, nicht zweimal dieselbe Sportart, Ruhetag nur mit eingetragener Zeit; lockere Einheiten von vollen Tagen weg. Was nirgends passt, wird gekürzt
  (bis zur kürzesten Vorlage bzw. kurzen Fassung) oder fällt weg – alles gemeldet. Tests, Schwimmkurs (fällt weg ohne Schwimmen), Aktivierung und
  eigene Einheiten bleiben am Tag; in Rennwochen wird nichts verschoben (nur gemeldet). Gewichte sind eigene Festlegungen.
- **Mein Plan `eigenplan-1.1`:** Wochen ohne eigene Änderungen folgen der Verfügbarkeit von selbst. Wird eine verteilte Woche bearbeitet, wird sie als
  Ganzes festgehalten (vergangene Tage «eingefroren»; `merge_daily.planwoche_pruefen` erlaubt das einmal je vergangenem Tag), damit nichts
  zurückspringt. Neu unter «Woche bearbeiten» und nach jeder Änderung der Verfügbarkeit: **«Woche anpassen»** (ab heute neu verteilen; gesperrte Tage
  und eigene Einheiten bleiben) und **«Neu berechnen»** (diese und alle folgenden Wochen wieder nach dem Vorschlag; nur gesperrte Tage bleiben).
  Damit ist «Rest der Woche neu planen» (offen seit V6.6) erledigt.
- **Tagesblatt wie enduco:** oben Fitness, Ermüdung und Form zu Tagesbeginn mit Status (bis heute aus den Daten; kommende Tage ≈, fortgeschrieben mit
  der geplanten Last von Mein Plan, bis 3 Wochen voraus, `V66.formPrognose`), darunter die Verfügbarkeit mit «Ändern». Kalender-Woche: «verfügbar …»
  je Tag und was die Verfügbarkeit bewirkt hat.
- Wissen wissen-1.9 (Kapitel «Schwimmen: CSS» mit Schwimm-Einheit und Übungen, Kapitel «Die Modelle zur Auswahl» mit Verfügbarkeit; Regeln ergänzt).
- Tests: `tests/test_v72.cjs` (neu: Übungen, Finden aus Enduco-Schritten, Filter, Schwimm-Einheiten, Bahnen), `tests/test_v66.cjs` (Verfügbarkeit,
  Verteilen, eigenplan-1.1, Anpassen, Neu berechnen, Form-Prognose), `tests/test_tools.py` (verfuegbarkeit_pruefen, Einfrieren vergangener Tage),
  `tests/test_v64.cjs` (Wissen 1.9). Im Browser geprüft (390 px, echte Daten): Schwimm-Einheit, Übungsblatt, Enduco-Schwimm-Workout, Übungskatalog,
  Tagesblatt mit Form und Verfügbarkeit, Verfügbarkeit speichern, Kalender-Woche nach der Änderung.

## V7.1 · 16.11.2026 · Wünsche vom 16.11.2026, Teil 1: Umfang, Tagebuch, effektive Zeit, vergleichbare Läufe, Morgen-Update
- **Trainingsumfang `umfang-tabelle-1.0`:** Jahresstatistik als eine kompakte Tabelle für alle Sportarten (auch auf dem Handy keine Liste mehr):
  Kopfzeile = Legende (Anz., Std., km, Hm, ± Vorjahr), unter der Sportart klein Ø Puls und Rad Ø Watt / Laufen Ø Pace / Schwimmen CSS, unter den
  Stunden klein die Timer-Zeit, wenn sie abweicht; Legende in Worten darunter. Fehler behoben: eine Tabelle, die auf dem Handy als Liste gezeigt und
  danach neu gezeichnet wurde, verlor die Spaltennamen je Wert (jetzt werden sie nach jedem Zeichnen wieder gesetzt).
- **Trainingstagebuch `tagebuch-2.0`:** Sportfilter (Auswahl je Gerät, wirkt auch auf die Serie), Farblegende, jeder Tag antippbar (Tagesblatt mit den
  Aktivitäten und «Analysieren»), «8 Wochen mehr», darunter die Liste aller Aktivitäten der gezeigten Wochen (antippen öffnet den Explorer).
  Kreisgrösse neu abgestuft (ab 2 h gleich gross), Kreise bleiben rund.
- **Effektive Zeit `zeit-1.1`:** Navigieren, Tracker, Jagen und andere Aktivitäten draussen mit GPS-Strecke bekommen dieselbe Stopp-Regel wie Wandern
  (weniger als 12 m und 3 Höhenmeter je Minute, ab 3 min = Halt); nicht im Wasser (GPS unter Wasser) und nicht motorisiert. Nachgerechnet aus den
  2-s-Reihen (`tools/serien_klar.mjs`, `tools/zeit_nachrechnen.py`, Markierung `zq` = «reihe-2s», alte Werte im Audit): 8 Aktivitäten geändert.
  Wandern, Skitouren, Laufen und Rad hatten die Regel schon (zeit-1.0). Dauer in Kartenliste, Tagesblatt, Kalender-Monat, Tagebuch und Explorer = Bewegungszeit,
  die Timer-Zeit steht daneben, wenn sie mehr als 5 min abweicht. Die Trainingslast rechnet weiter mit der Timer-Zeit (offen, Prüfbericht Nr. 82).
- **Vergleichbare Läufe `laufvergleich-1.0` (eigene Festlegung):** bevor Puls und Pace verglichen werden, prüft `FK.laufVergleichbar`: draussen, ab
  20 min und 3 km, höchstens 10 Hm je km, keine Intervalle oder Tempo-Abschnitte (Titel oder Workout auf der Uhr), 2. Hälfte höchstens 8 % schneller
  oder langsamer, TL höchstens 95 je Stunde, unter 25 °C, kein Trail, Laufband oder Koppellauf. Gilt für «Puls zu Pace» (mit Liste der Gründe unter dem
  Diagramm), Lauf-Effizienz (`laufeffizienz-1.1`) und den Vergleich Koppellauf gegen Solo-Läufe; der Explorer zeigt je Lauf, ob er taugt und warum nicht.
  Wissen wissen-1.8 (Kapitel «Läufe vergleichen und effektive Zeit»). Morgen-Briefing: dieselbe Regel für Lauf-Vergleiche im Auftrag.
- **Morgen-Update:** am 16.11.2026 kam um 08:34 nichts an (die Uhr hatte noch nicht synchronisiert; letzte Synchronisation 09:41) – im Chat nachgeholt.
  Auf Silas' Wunsch läuft der Auftrag jetzt zweimal: 07:00 und 11:00 (der zweite holt nach, was um 07:00 noch fehlte).
- Tests: `tests/test_tools.py` (zeit-1.1 aus FIT und aus der 2-s-Reihe, Wasser ohne Regel), `tests/test_formkurve.cjs` (laufvergleich-1.0, Lauf-Effizienz 1.1),
  `tests/test_v64.cjs` (Wissen 1.8). Im Browser geprüft (390 px, echte Daten): Umfang, Tagebuch, Tagesblatt aus dem Tagebuch.

## V7.0 · 14.11.2026 · Bedienung nach dem Vorbild enduco (Etappe A: Phasen 1–4 des Auftrags «Masterprompt V7»)
Auftrag von Silas vom 14.11.2026 mit 246 Bildschirmfotos der Enduco-App als Vorlage (Bilder und PDF nicht im Repository). Übernommen sind Aufbau,
Bedienlogik und Hierarchie, keine Texte, Logos, Fotos oder Workouts. Zuordnung der Vorlage: `docs/v7-bestandsaufnahme.md`.
- **Navigation navigation-7.0:** Leiste Heute · Kalender · Plan · Analyse · Outdoor; ab 1024 px als Seitenleiste links. Keine Unterleisten mehr:
  erste Ebene einfach, Einzelheiten als eigene Ansicht mit «Zurück» oben links. Profil oben rechts (Einstellungen nach Gruppen: Training, Labor,
  Daten, Darstellung). Alte Links bleiben gültig (`#training` → Trainingsumfang).
- **Heute heute-7.0:** nur noch Kacheln, Begrüssung mit Check-in, Heutiges Training und Diese Woche. Heutiges Training = erledigte Garmin-Aktivitäten
  von heute und die Einheiten aus Mein Plan (mit Balkenprofil, profil-teile-1.0). Keine Enduco-Workouts und kein «Neu von Enduco» mehr; die
  Begrüssung nennt die Einheiten aus Mein Plan. Ringe, Bereitschaft, Gefühl und Verlauf stehen unter Analyse → Belastung und Erholung.
- **Kalender kalender-3.0:** Monat und Jahr als Titel (antippen: Monat wählen), «Heute» rechts. Woche = Tagesleiste, grafische Wochenauswertung
  (Mein Plan gegenüber absolviert, je Sportart, Zeit in Zonen nach Puls, Trainingslast) und die Tage mit erledigten Aktivitäten und Mein Plan. Monat
  mit Mein Plan statt Garmin-Kalender, Woche als «absolviert / geplant». Enduco erscheint weder in Woche, Monat noch Tagesblatt. Frühere Wochen
  zeigen Mein Plan nur, wenn er gespeichert war – kein nachgerechneter Vorschlag als «verpasst».
- **Analyse analyse-start-1.0:** Start mit Karten (Trainingsumfang, Intensitätsverteilung, Belastung und Erholung, Leistungsentwicklung, Laktat und
  Schwellen, Planvergleich) und «Weitere Analysen»; jede Karte öffnet ihre Ansicht. Alle bisherigen Karten bleiben, nur neu gegliedert.
- **Planvergleich planvergleich-1.0 (neu):** Enduco geplant gegenüber Garmin absolviert, nur zusammengefasst je Woche: Stunden gesamt und je
  Sportart, Abweichung in Stunden und Prozent, Intensität Rad und Laufen in 5 Zonen oder 3 Bereichen (LT1/LT2), Netto/Brutto/Pausen, nicht
  zuordenbare Zeit getrennt, Verlauf über bis zu 12 Wochen. Urteil nur bei vollständigem Soll; frühere Wochen als «unvollständig» sichtbar.
- **Plan:** oben die Übersicht (Hauptrennen, Phase, Mein Plan diese Woche), Phasen und die Saisonübersicht bis zum Hauptrennen (geplant = Mein Plan);
  «Plan verwalten» öffnet Rennen, Trainingsmodell, Wochenstunden, Aufbau-Check und Testkalender.
- **Labor (Expertenbereich, über das Profil):** Methodische Grundlagen (Wissen), Enduco-Datenbestand (Bibliothek), «Woche nach Modell» mit Enduco
  und «Ich folge», «Vorschlag und Enduco über die Wochen», Enduco-Workouts auf der Uhr, Datenbasis und Prüfung, Modellversionen.
- **Outdoor:** Werkzeuge oben schlanker (Heatmap · Nach Sport · 3D; Entdecken · Route planen · Meine Routen); «Meine Routen» öffnet das Blatt bei den
  gespeicherten Routen. Die Karte selbst ist unverändert.
- Keine Daten gelöscht oder umgerechnet; Enduco-Daten bleiben vollständig gespeichert. Tests: `tests/test_v7.cjs` (neu); alle bisherigen Tests unverändert bestanden.
- Rückweg: Branch `vor-v7` (Stand V6.6.4 vor V7) – `git revert` der V7-Commits oder die Seitendateien aus diesem Branch wiederherstellen.

