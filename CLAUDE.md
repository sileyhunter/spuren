# Ironman Notebook (vormals Spuren & Formkurve) – Arbeitsanleitung (Kern)

Private Trainingsseite (GitHub Pages) von Silas, auf dem iPhone «Ironman Notebook». Sprache mit ihm: Deutsch (Schweiz, «ss» statt «ß»).
Alle Trainingsdaten liegen verschlüsselt in `data.enc.json`. Das Passwort steht **nie** im Repository; es kommt aus dem Auftrag als Umgebungsvariable `SPUREN_PW`.
`data.json` und `work/` niemals committen (stehen in `.gitignore`).

## Wie diese Anleitung aufgeteilt ist (Etappe 0, V9.0, anleitung-kurz-1.0)
Dieser Kern bleibt kurz (Dateien im Überblick, Prüfen vor dem Push, Datenschutz). Alle Einzelheiten je Thema – jede Regel, jede Versionskennung,
jede Freigabe von Silas – stehen unverändert in `docs/anleitung/*.md`. Zu Beginn einer Etappe nur dieses Kern-CLAUDE.md und die Datei(en) lesen,
die die Etappe tatsächlich braucht (Spalte rechts).

| Thema | Datei unter `docs/anleitung/` |
|---|---|
| Alle Dateien mit ihrer Versionsgeschichte (welches Modul in welcher Version entstand, `js/`, `tools/`, `tests/`) | `dateien.md` |
| Nächtliches Update, Morgen-Update, monatlicher Garmin-Export, Eingaben von der Seite («Direkt speichern»), Eingang (`eingang/`) | `updates.md` |
| An Garmin senden, Bilder (`bilder/`), Archiv (`spuren-archiv`), Garmin-Datenexport (Verlauf) | `garmin.md` |
| Einheit als Seite, Planeinstellungen, Täglicher Coach, Modell «Automatisch», Verpflegung je Einheit, Aktivitäten draussen, Ampel passt das
  Training an, Trainingsmodell/Woche nach Modell/Wissen, Enduco als Vergleichsdatenbank | `plan.md` |
| Routenplaner (V5.3), Planer-Wünsche V5.8 (Skitour, Hangneigung, MTB-Abfahrt, Rennrad-Varianten, Ampel-Nacht …) | `karte-routen.md` |
| Laktatschwellen und Zonen, FTP und Trainingslast, Laktat (kommt über den Chat), Punkte/GPX, Testkalender | `laktat.md` |
| Bedienung V7 (Navigation, Leiste, Blätter), Design V6 (Farben, Variablen) | `bedienung-design.md` |
| Meine Entwicklung, Explorer/Geplant vs. Ist/Saison/RPE/Ermüdung/Energie, Smart Training Routes, Sekundenreihen (`serien/`) | `entwicklung.md` |
| Test-Workouts (A9), Referenzsatz und Versionen (A1) | `technik.md` |
| Älterer CHANGELOG (alles vor V7.0) | `../changelog-alt.md` |

Diese Tabelle ist die einzige Stelle, die neu entstanden ist; der Inhalt aller Themen-Dateien ist unverändert aus der bisherigen CLAUDE.md übernommen
(siehe `docs/versionsliste-v9.0.md` für den vorher/nachher-Abgleich aller Versionskennungen aus Etappe 0).

## Dateien (Überblick, Einzelheiten und Versionsgeschichte in `docs/anleitung/dateien.md`)
- `index.html` – die Seite (Passwortabfrage, Entschlüsselung im Browser, Karte, Tabs). `demo.html`/`manifest-demo.webmanifest` – Demo mit
  erfundenen Daten (aus `index.html` erzeugt: nach jeder Änderung `python3 -I tools/make_demo.py`, `demo.html` mitcommitten).
- `data.enc.json` – verschlüsselte Daten (AES-256-GCM, PBKDF2-SHA256); `serien/` – Sekundenreihen verschlüsselt (SPS1/SPS2); `bilder/` –
  Kopfbilder verschlüsselt; `sw.js` – Service Worker (offline).
- `js/` – die ganze Rechenlogik und Oberfläche der Seite, modulweise (`v5…v85`, `formkurve`, `route`, `analyse`, `wissen`, `verpflegung`,
  `schwimmen`, `kompat` …); `css/v6.css` – Design (Variablen, dunkel/hell).
- `tools/` – alle Python-/Node-Werkzeuge für Garmin-Einspielen, FIT-Verarbeitung, Laktat, Verschlüsseln, Prüfen (`crypt.mjs`,
  `merge_daily.py`, `garmin_senden.py`, `leck_pruefen.py`, `check_referenz.py`, `migrate_v5.py`, `series.py`, `serien_crypt.mjs`, `archiv.mjs` …).
- `tests/` – Abnahmetests (`tests/fixtures/` = echte BRouter-Antworten mit OSM-Testdaten, ODbL; `tests/sim/` = Simulator ohne Browser für
  Szenario-Tests V8.0).
- `docs/` – Konzept, Abnahmen, Audits, offene Punkte (`offen-nach-v55.md`), Aufträge (`auftrag-v9.md` u. a.), `docs/anleitung/*.md` (diese
  Themen-Dateien), `docs/changelog-alt.md` (CHANGELOG vor V7.0).
- `brouter/rennrad-asphalt.brf` – eigenes BRouter-Profil «Rennrad ohne Gravel».

## Prüfen vor jedem Push von Seite oder Werkzeugen
`node --test tests/test_archiv.cjs`, `node --test tests/test_kompat.cjs`, `node --test tests/test_formkurve.cjs`, `node --test tests/test_route.cjs`, `node --test tests/test_analyse.cjs`, `node --test tests/test_training.cjs`, `node --test tests/test_v59.cjs`, `node --test tests/test_v6.cjs`, `node --test tests/test_v61.cjs`, `node --test tests/test_v62.cjs`, `node --test tests/test_v64.cjs`, `node --test tests/test_v65.cjs`, `node --test tests/test_v66.cjs`, `node --test tests/test_v7.cjs`, `node --test tests/test_v72.cjs`, `node --test tests/test_v73.cjs`, `node --test tests/test_v74.cjs`, `node --test tests/test_v75.cjs`, `node --test tests/test_v76.cjs`, `node --test tests/test_v77.cjs`, `node --test tests/test_v78.cjs`, `node --test tests/test_v80.cjs`, `node --test tests/test_v81.cjs`, `node --test tests/test_v82.cjs`, `node --test tests/test_v83.cjs`, `node --test tests/test_v85.cjs`, `node --test tests/test_v91.cjs`, `node --test tests/test_v911.cjs`, `node --test tests/test_v92.cjs`, `node --test tests/test_v93.cjs`, `node --test tests/test_verpflegung.cjs`, `python3 -I tests/test_tools.py`, `python3 -I tools/make_demo.py`, bei Datenänderungen `check_referenz.py`,
bei Änderungen an `bilder/` oder `config.bilder` `SPUREN_PW=… node tools/bilder_crypt.mjs pruefen` («PRÜFUNG BILDER: bestanden»).
**Leck-Prüfung (V6.4.4):** `SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json work/data.json`, `python3 -I tools/leck_pruefen.py work/data.json`
(«LECK-PRÜFUNG: bestanden»), danach `rm work/data.json`. Gilt für jeden Push von Seite, Werkzeugen, Tests oder Doku (nicht für die reinen Daten-Updates).
Kein Live-Push, wenn ein Test oder die Leck-Prüfung fehlschlägt. Screenshots mit echten Daten nie ins Repo. **Ein Force-Push entfernt nichts von GitHub:**
hängende Commits bleiben per SHA öffentlich abrufbar – echte Werte darum gar nicht erst committen.

## Datenschutz (Zusammenfassung – Einzelregeln je Thema in den Dateien oben)
- `SPUREN_PW` nie ins Repository, nie in Doku/Tests/Chat-Protokollen; `data.json` und `work/` nie committen (`.gitignore`).
- Echte Werte (Zonen, Schwellen, Distanzen mit Datum, Testtermine, Abwesenheiten, Reisedaten, E-Mail, Zahlen aus Prüfungen mit echten Daten) nie
  in Code, Tests oder Doku – nur im verschlüsselten `data.enc.json`/`serien/`/`bilder/` oder im Chat. `tools/leck_pruefen.py` prüft das vor jedem Push.
- Fotos (Kopfbilder) nie als Klartext-JPEG ins Repository und nie in die Demo. Rohdateien (FIT, ZIP, Laktat-Tabellen, GPX) bleiben ausserhalb
  beider Repositories in eigenen Ordnern; Garmin-Exporte, Laktat-Tabellen usw. gehören ins private Archiv (`spuren-archiv`, siehe `garmin.md`).
- Jede Etappe in einer eigenen Sitzung; Version, Tests, `CHANGELOG.md` und `docs/offen-nach-v55.md` nachführen, Push erst nach bestandenen Tests.
