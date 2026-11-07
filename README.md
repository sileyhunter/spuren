# Spuren & Formkurve

Private Trainingsseite mit swisstopo-Heatmap und Trainingsauswertung. Die Daten sind verschlüsselt (`data.enc.json`);
ohne Passwort zeigt die Seite nichts. `demo.html` zeigt dieselbe Seite mit frei erfundenen Beispieldaten.

## Aufbau
- `index.html` – Seite: Karte, Heute, Kalender, Fortschritt, Laktat & Zonen, Ausdauer, Leistung, Schwimmen, Körper
- `js/formkurve.js` – Rechenlogik (Zonen-Cockpit, Bereitschaft, 1–6-h-Ziele, Koppelläufe, Fueling, Fahrzeit, CdA, FIT-Leser)
- `js/v5-ui.js`, `js/v5-ausdauer.js`, `js/v5-extra.js` – Oberflächen der V5-Module; `sw.js` – offline
- `tools/` – Import, Kennzahlen, Schwellen, Migration (Python/Node), siehe `CLAUDE.md`
- `docs/konzept.md` – Gesamtkonzept V1–V5 · `docs/abnahme-v5.md` – Prüfbericht · `CHANGELOG.md`

## Tests
```
node --test tests/test_formkurve.cjs
python3 -I tests/test_tools.py
```
Beide arbeiten nur mit erfundenen Werten. Prüfungen mit echten Daten laufen verschlüsselt (`tools/check_referenz.py`).

## Datenschutz
Keine Schlüssel, Passwörter, Tokens, entschlüsselten Daten oder Videos im Repository. Eingaben auf der Seite bleiben
verschlüsselt auf dem Gerät, bis sie bewusst exportiert werden.
