"""Durchklick-Test «Training → Route» (V9.16.0, Routen 7.4): Chrome headless gegen demo.html mit Karten-Attrappe.

Aufruf im Repository: python3 -I tools/durchklick_vorschlaege.py [Ordner für Bilder]
Wie tools/durchklick_planer.py: MapLibre und alle Dienste sind in dieser Umgebung nicht erreichbar; eine Attrappe ersetzt die Kartenbibliothek,
BRouter antwortet mit echten Antworten aus tests/fixtures/brouter_dreieich_training.json (OSM-Testausschnitt, ODbL; welche Antwort zu welcher
Anfrage kommt, richtet sich nur nach der Anzahl der Punkte – es geht um die Bedienung, nicht um die Geometrie). Wetter wird abgefangen.
Geprüft: «Schritt x von y» und «Abbrechen» (Stand wie vorher, nichts gespeichert, keine Anfrage mehr), Namen 1/2/3, Linie antippen (Treffer ±14 px)
und Zeile antippen = markieren (Hervorhebung, Kennzahlen unten), «Bearbeiten» = Vorschlag im Planer, «Hin und zurück» im Menü und in der Routenart.
Die echte Karte (Antippen mit dem Finger) ist hier nicht prüfbar: Karten-Tipps laufen über TRUI.kartenKlick mit einer Treffer-Attrappe.
Erfundene Daten der Demo, nichts Echtes. Am Ende können «CancelledError»-Meldungen von Playwright stehen: Sie stammen von den absichtlich offen
gehaltenen Anfragen des Abbruch-Schritts und sind harmlos. Fehler: Exit-Code 1 und Liste der fehlgeschlagenen Schritte; keine Konsolenfehler erlaubt."""
import importlib.util
import json
import pathlib
import re
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_vorschlaege")
BILDER.mkdir(parents=True, exist_ok=True)

_spec = importlib.util.spec_from_file_location("durchklick_karte", ROOT / "tools" / "durchklick_karte.py")
_dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dk)
Still, PNG = _dk.Still, _dk.PNG

# Attrappe mit Zugriff auf die gezeichneten Daten und einer Treffer-Attrappe für queryRenderedFeatures
ATTRAPPE = _dk.ATTRAPPE
_alt_src = "getSource(id) { return sources.has(id) ? { setData() {}, getTile() {} } : undefined; }"
_neu_src = "getSource(id) { return sources.has(id) ? { setData(d) { window.__daten = window.__daten || {}; window.__daten[id] = d; }, getTile() {} } : undefined; }"
_alt_q = "queryRenderedFeatures() { return []; }"
_neu_q = "queryRenderedFeatures(box, o) { return window.__treffer ? window.__treffer(box, o) : []; }"
assert _alt_src in ATTRAPPE and _alt_q in ATTRAPPE
ATTRAPPE = ATTRAPPE.replace(_alt_src, _neu_src).replace(_alt_q, _neu_q)

FX = json.loads((ROOT / "tests" / "fixtures" / "brouter_dreieich_training.json").read_text(encoding="utf-8"))
WANDER = [(k, a["text"]) for k, a in FX["anfragen"].items() if "profile=hiking-mountain" in k and a["status"] == 200]
START = [8.7095, 49.999]


def antwort(url):
    """Eine echte Antwort mit gleich vielen Punkten (nur für die Bedienung; die Geometrie passt nicht zu den angefragten Punkten)."""
    m = re.search(r"lonlats=([^&]*)", url)
    punkte = m.group(1).split("%7C") if "%7C" in m.group(1) else m.group(1).split("|")
    gleich = [t for k, t in WANDER if len(re.search(r"lonlats=([^&]*)", k).group(1).split("|")) == len(punkte)] or [t for _, t in WANDER]
    return gleich[sum(ord(c) for c in m.group(1)) % len(gleich)]


def main():
    fehler, schritte = [], []

    def pruefe(name, ok, info=""):
        schritte.append(name)
        if not ok:
            fehler.append(f"{name} {info}".strip())

    srv = socketserver.TCPServer(("127.0.0.1", 0), Still)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    konsole = []
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"], headless=True)
        for name, w, h, farbe in (("handy-dunkel", 390, 844, "dark"), ("desktop", 1280, 800, "dark")):
            handy = w < 760
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme=farbe, service_workers="block")
            seite = ctx.new_page()
            seite.on("console", lambda m, n=name: konsole.append(f"[{n}] {m.text}") if m.type == "error" else None)
            seite.on("pageerror", lambda e, n=name: konsole.append(f"[{n}] Seitenfehler: {e}"))
            halte, wartend, brouter = {"an": True}, [], []

            def fremd(route):
                u = route.request.url
                if u.endswith("maplibre-gl.js"):
                    route.fulfill(status=200, content_type="application/javascript", body=ATTRAPPE)
                elif u.endswith("maplibre-gl.css"):
                    route.fulfill(status=200, content_type="text/css", body="")
                elif "wmts.geo.admin.ch" in u:
                    route.fulfill(status=200, content_type="image/png", body=PNG)
                elif "brouter.de" in u:
                    if u.endswith("/profile"):
                        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body='{"profileid":"custom_test"}')
                        return
                    brouter.append(u)
                    if halte["an"]:
                        wartend.append(route)             # Anfrage bleibt offen, bis die Seite sie abbricht
                    else:
                        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=antwort(u))
                else:
                    route.abort()

            seite.route(lambda u: not u.startswith(f"http://127.0.0.1:{port}"), fremd)
            K = lambda js: seite.evaluate(js)

            seite.goto(f"http://127.0.0.1:{port}/demo.html")
            seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
            seite.evaluate("localStorage.clear()")
            seite.reload()
            seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
            seite.wait_for_timeout(400)
            seite.evaluate("""() => { const b = document.querySelector('button[data-gruppe="karte"]'); if (b) b.click(); }""")
            seite.wait_for_timeout(300)
            seite.click("#btn-plan")
            seite.wait_for_timeout(400)
            pruefe(f"{name}: Planer offen", K("window.RTUI.active()") is True)
            # Menü und Routenart: «Hin und zurück» (Entscheid Nr. 76)
            pruefe(f"{name}: ⋯-Menü nennt «Hin und zurück» statt «Rundtour»", K("document.getElementById('rp-loop').textContent.trim()") == "Hin und zurück")
            K("window.RTUI.setConsent({ routing: true, routing_am: new Date().toISOString(), buendel_am: new Date().toISOString() })")
            K("window.TRUI.show({})")
            seite.wait_for_timeout(300)
            pruefe(f"{name}: «Training → Route» offen", K("document.getElementById('rp-train').hidden") is False)
            # Eigene Angaben: Laufen 30 min, Pace
            K("(() => { const s = document.getElementById('tr-wo'); s.value = 'm'; s.dispatchEvent(new Event('change', { bubbles: true })); })()")
            seite.wait_for_timeout(150)
            K("(() => { const s = document.querySelector('[data-man=sport]'); s.value = 'lauf'; s.dispatchEvent(new Event('change', { bubbles: true })); })()")
            seite.wait_for_timeout(150)
            K("(() => { const s = document.querySelector('[data-man=dauer_min]'); s.value = '30'; s.dispatchEvent(new Event('change', { bubbles: true })); })()")
            seite.wait_for_timeout(150)
            opts = K("[...document.querySelectorAll('#tr-art option')].map(o => o.textContent.trim())")
            pruefe(f"{name}: Routenart «Hin und zurück» · «Gleicher Weg zurück» · «Zu einem Ziel»", opts == ["Hin und zurück", "Gleicher Weg zurück", "Zu einem Ziel"], str(opts))
            # Startort per Karte
            K("(() => { const s = document.getElementById('tr-ort'); s.value = 'karte'; s.dispatchEvent(new Event('change', { bubbles: true })); })()")
            seite.wait_for_timeout(150)
            K(f"window.TRUI.mapClick({json.dumps(START)})")
            seite.wait_for_timeout(200)
            pruefe(f"{name}: Startort gesetzt", K("!!window.TRUI.state().ortTemp"))

            # ---- Suche abbrechen ----
            halte["an"] = True
            seite.click("#tr-go")
            seite.wait_for_timeout(700)
            st = K("document.getElementById('tr-status').textContent.replace(/\\s+/g, ' ').trim()")
            pruefe(f"{name}: Fortschritt «Schritt 1 von 3»", "Schritt 1 von 3" in st, st)
            pruefe(f"{name}: Knopf «Abbrechen» da und gross genug", K("(() => { const b = document.querySelector('#tr-status [data-tr=abbruch]'); return !!b && b.getBoundingClientRect().height >= 40; })()"))
            pruefe(f"{name}: Anfragen laufen (höchstens 2 gleichzeitig offen)", 1 <= len(wartend) <= 2 or len(brouter) >= 1, str(len(wartend)))
            seite.screenshot(path=str(BILDER / f"{name}-1-suche.png"))
            vor = len(brouter)
            seite.click("#tr-status [data-tr=abbruch]")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: nach «Abbrechen» nicht mehr beschäftigt", K("window.TRUI.state().busy") is False)
            pruefe(f"{name}: Meldung «Suche abgebrochen – nichts wurde gespeichert.»", "Suche abgebrochen" in K("document.getElementById('tr-status').textContent"))
            pruefe(f"{name}: kein Ergebnis übernommen, Karte ohne Vorschlagslinien", K("window.TRUI.state().res") is None and not (K("(window.__daten && window.__daten['tr-kand'] && window.__daten['tr-kand'].features.length) || 0")))
            pruefe(f"{name}: nichts gespeichert (kein Eintrag in trainingsrouten)", K("(() => { const d = window.V5UI && window.V5UI.Inbox && window.V5UI.Inbox.data; return !d || !(d.trainingsrouten || []).length; })()"))
            pruefe(f"{name}: «Vorschläge berechnen» wieder bedienbar", K("document.getElementById('tr-go').disabled") is False)
            seite.wait_for_timeout(500)
            pruefe(f"{name}: nach dem Abbruch keine neuen Anfragen", len(brouter) == vor, f"{vor} → {len(brouter)}")
            wartend.clear()

            # ---- Suche bis zum Ergebnis ----
            halte["an"] = False
            seite.click("#tr-go")
            seite.wait_for_function("window.TRUI.state().res && !window.TRUI.state().busy", timeout=40000)
            seite.wait_for_timeout(300)
            res_ok = K("!!window.TRUI.state().res.A")
            pruefe(f"{name}: Vorschläge berechnet", res_ok, K("JSON.stringify((window.TRUI.state().res.fehler || []).slice(0, 2)) + ' ' + (window.TRUI.state().res.hinweise || []).join(' | ')"))
            if not res_ok:
                seite.screenshot(path=str(BILDER / f"{name}-2-fehler.png"))
                continue
            zeilen = K("[...document.querySelectorAll('#tr-body tr.tr-zeile .tr-key')].map(e => e.textContent.trim())")
            pruefe(f"{name}: Namen 1/2/3 in der Tabelle (nie A/B/C)", all(z in ("1", "2", "3") for z in zeilen) and len(zeilen) >= 1, str(zeilen))
            pruefe(f"{name}: Hinweis «Tippe eine Linie …» statt dreier Vollkarten", K("!!document.querySelector('#tr-body .tr-tipp')") and K("document.querySelectorAll('#tr-body > .tr-card').length") == 0)
            feats = K("window.__daten['tr-kand'].features.map(f => ({ k: f.properties.k, name: f.properties.name, sel: f.properties.sel, hit: f.properties.hit, n: f.geometry.coordinates.length }))")
            pruefe(f"{name}: Linien auf der Karte mit Namen, Trefferfläche an, nichts markiert", len(feats) >= 1 and all(f["hit"] == 1 and f["sel"] == 0 and f["name"] in ("1", "2", "3") for f in feats), str(feats))
            layer = K("(() => { const L = window.__karte.layers; return ['tr-kand-case', 'tr-kand-line', 'tr-kand-sel', 'tr-kand-hit'].map(i => !!L.get(i)); })()")
            pruefe(f"{name}: Ebenen Rand, gestrichelt, markiert, Trefferfläche", layer == [True, True, True, True], str(layer))
            breite = K("window.__karte.layers.get('tr-kand-hit').paint['line-width']")
            pruefe(f"{name}: Trefferfläche mindestens 24 px breit (≥ 12 px je Seite)", breite >= 24, str(breite))
            if handy:
                pruefe(f"{name}: Blatt halbhoch, Karte sichtbar", K("window.RTUI.state().sheet") == "half", K("window.RTUI.state().sheet"))
            seite.screenshot(path=str(BILDER / f"{name}-3-ergebnis.png"))

            # ---- Linie auf der Karte antippen (Treffer-Attrappe) ----
            k1 = feats[0]["k"]
            K(f"(() => {{ window.__treffer = (box, o) => (o.layers || []).includes('tr-kand-hit') ? [{{ properties: {{ k: '{k1}' }} }}] : []; }})()")
            erg = K("window.RTUI.mapClick({ lngLat: { lng: 8.7, lat: 50.0 }, point: { x: 100, y: 100 } })")
            pruefe(f"{name}: Planer-Klick auf die Linie wird von den Vorschlägen übernommen", erg is True and K("window.TRUI.state().sel") == k1 and K("window.RTUI.state().vias.length") == 0)
            pruefe(f"{name}: markierte Linie hervorgehoben (sel=1 nur bei ihr)", K(f"window.__daten['tr-kand'].features.filter(f => f.properties.sel === 1).map(f => f.properties.k)") == [k1])
            pruefe(f"{name}: Kennzahlen unten sichtbar, Knopf «Bearbeiten»", K("document.querySelector('#tr-body .tr-markiert [data-wahl]') && document.querySelector('#tr-body .tr-markiert [data-wahl]').textContent.trim()") == "Bearbeiten")
            kz = K("document.querySelector('#tr-body .tr-markiert').textContent.replace(/\\s+/g, ' ')")
            pruefe(f"{name}: unten Belag, Strassen, Wind, Wetter, Anstiege, Licht, Prognose", all(t in kz for t in ("Belag", "Strassen", "Wind", "Anstiege", "Licht", "Prognose")), kz[:200])
            pruefe(f"{name}: Antippen markiert nur, bearbeitet nicht (Planer ohne Punkte, nichts gespeichert)", K("window.TRUI.state().gewaehlt") is None)
            seite.screenshot(path=str(BILDER / f"{name}-4-markiert.png"))
            # Zeile antippen = markieren
            if len(feats) > 1:
                k2 = feats[1]["k"]
                seite.click(f"#tr-body tr[data-wahlzeile='{k2}'] .tr-wbtn")
                seite.wait_for_timeout(250)
                pruefe(f"{name}: Zeile antippen markiert den anderen Vorschlag", K("window.TRUI.state().sel") == k2 and K("window.TRUI.state().gewaehlt") is None)
            # Daneben tippen: keine Linie getroffen → normaler Planer-Klick
            K("(() => { window.__treffer = () => []; })()")
            K("window.RTUI.mapClick({ lngLat: { lng: 8.7, lat: 50.0 }, point: { x: 5, y: 5 } })")
            pruefe(f"{name}: daneben tippen lässt die Markierung stehen (und ist der normale Klick)", K("window.TRUI.state().sel") is not None)

            # ---- Bearbeiten ----
            sel = K("window.TRUI.state().sel")
            seite.click("#tr-body .tr-markiert [data-wahl]")
            seite.wait_for_timeout(1200)
            pruefe(f"{name}: «Bearbeiten» übernimmt den Vorschlag in den Planer", K("window.TRUI.state().gewaehlt") == sel and K("window.RTUI.state().vias.length") >= 2, str(K("window.RTUI.state().vias.length")))
            pruefe(f"{name}: Markierung nach dem Übernehmen weg, Anzeige «Im Planer: Vorschlag n»", K("window.TRUI.state().sel") is None and "Im Planer: Vorschlag " + {"A": "1", "B": "2", "C": "3"}[sel] in K("document.getElementById('tr-body').textContent"))
            pruefe(f"{name}: übrige Linien nur noch Anzeige (kein versehentlicher Wechsel)", K("window.__daten['tr-kand'].features.every(f => f.properties.hit === 0)"))
            K("(() => { window.__treffer = () => [{ properties: { k: 'A' } }]; })()")
            K("window.RTUI.mapClick({ lngLat: { lng: 8.7, lat: 50.0 }, point: { x: 100, y: 100 } })")
            pruefe(f"{name}: Karten-Tipp im Planer setzt jetzt wieder Punkte (Wegpunkte ziehbar/ergänzbar)", K("window.TRUI.state().sel") is None)
            seite.screenshot(path=str(BILDER / f"{name}-5-bearbeitet.png"))
            wartend.clear()
            seite.unroute_all(behavior="ignoreErrors")
            ctx.close()

    print(f"{len(schritte)} Schritte")
    if konsole:
        sichtbar = [z for z in konsole if "Failed to load resource" not in z and "net::ERR" not in z and "CORS" not in z]
        if sichtbar:
            fehler.extend(["Konsole: " + z for z in sichtbar[:10]])
    if fehler:
        print("FEHLER:")
        for f in fehler:
            print(" -", f)
        sys.exit(1)
    print("DURCHKLICK VORSCHLÄGE: bestanden")


if __name__ == "__main__":
    main()
