"""Erzeugt demo.html (Demo mit erfundenen Beispieldaten) aus index.html.

Aufruf im Repository: python3 -I tools/make_demo.py
Nach jeder Änderung an index.html erneut ausführen und demo.html mitcommitten.
Die Demo lädt keine echten Daten (kein data.enc.json, kein Passwort) und speichert
Punkte und Routen getrennt von der echten Seite.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
s = (ROOT / "index.html").read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:100])
    s = s.replace(a, b)


rep("<title>Spuren &amp; Formkurve</title>", "<title>Spuren &amp; Formkurve · Demo</title>")
rep('<link rel="manifest" href="manifest.webmanifest">', '<link rel="manifest" href="manifest-demo.webmanifest">')
rep('<meta name="apple-mobile-web-app-title" content="Spuren">', '<meta name="apple-mobile-web-app-title" content="Spuren Demo">')
rep('<b>Beispieldaten.</b> Alle Spuren und Zahlen sind erfunden, damit du Aufbau und Funktionen beurteilen kannst. Mit dem ersten Garmin-Import werden sie ersetzt.',
    '<b>Demo.</b> Alle Spuren, Orte und Zahlen sind erfunden. So sieht die Trainingsseite mit echten Garmin-Daten aus.')
rep('Die Werte gibst du mir im Chat, ich hole Puls und Watt aus der Einheit.', 'Laktat wird von Hand gemessen, Puls und Watt kommen aus der Einheit.')
rep('Schick mir nach dem nächsten Check im Chat Datum, Block und Laktatwert.', 'In dieser Demo sind keine weiteren Checks hinterlegt.')
# Demo-Schalter vor dem Lade-Skript: keine echten Daten, keine Passwortabfrage
i = s.index("<script>\n(() => {")
s = s[:i] + "<script>window.SPUREN_DEMO = true;</script>\n" + s[i:]
assert "data.enc.json" in s  # wird in der Demo nie abgerufen (SPUREN_DEMO startet direkt)
(ROOT / "demo.html").write_text(s, encoding="utf-8")

man = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
man.update({"name": "Spuren & Formkurve Demo", "short_name": "Spuren Demo", "start_url": "demo.html"})
(ROOT / "manifest-demo.webmanifest").write_text(json.dumps(man, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("demo.html und manifest-demo.webmanifest erstellt")
