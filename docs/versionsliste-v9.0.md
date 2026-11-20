# Versionsliste – Etappe 0 (V9.0, Anleitung kürzen)

Vorher/nachher-Abgleich aller Versionskennungen (z. B. `last-2.1`) aus der alten, einteiligen `CLAUDE.md` (170 kB) gegen den neuen Kern
(`CLAUDE.md`) zusammen mit den Themen-Dateien unter `docs/anleitung/*.md`.

- Vorher: 160 Versionskennungen (automatisch mit einem regulären Ausdruck aus der alten `CLAUDE.md` extrahiert).
- Nachher: 161 Versionskennungen in `CLAUDE.md` + `docs/anleitung/*.md` – dieselben 160 plus `anleitung-kurz-1.0` (die neue Versionskennung
  für diese Etappe selbst, siehe `CLAUDE.md`).
- Keine Versionskennung ist verloren gegangen; keine wurde verändert.

Zusätzlich geprüft: der gesamte Fliesstext der alten `CLAUDE.md` ab «## Dateien» (also ohne die drei einleitenden Sätze, die unverändert im
neuen Kern stehen) wurde zeilenweise mit dem Fliesstext aller `docs/anleitung/*.md`-Dateien verglichen (als sortierte Liste, ohne Leerzeilen):
exakt gleiche Zeilenzahl (1170) und keine Abweichung. Jede Regel und jede Freigabe von Silas steht damit unverändert in einer der Themen-Dateien;
der neue Kern selbst enthält nur die Übersicht, die Datei-Kurzliste, «Prüfen vor jedem Push» (unverändert) und eine Zusammenfassung des
Datenschutz-Abschnitts (die Einzelregeln bleiben in den Themen-Dateien).

Vorgehen (nachvollziehbar, reproduzierbar):
```
grep -oE '[a-zA-ZäöüÄÖÜß][a-zA-ZäöüÄÖÜß_]*-[0-9]+\.[0-9]+(\.[0-9]+)?' CLAUDE.md(alt) | sort -u   # vorher
grep -oE '[a-zA-ZäöüÄÖÜß][a-zA-ZäöüÄÖÜß_]*-[0-9]+\.[0-9]+(\.[0-9]+)?' CLAUDE.md docs/anleitung/*.md | sort -u   # nachher
diff vorher nachher
```
