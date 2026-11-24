"""Durchklick-Test des schlanken Planers in der Demo (V9.15.0, O2): Chrome headless gegen demo.html mit Karten-Attrappe.

Aufruf im Repository: python3 -I tools/durchklick_planer.py [Ordner für Bilder]
Wie tools/durchklick_karte.py: MapLibre und alle Dienste sind in dieser Umgebung nicht erreichbar; eine Attrappe ersetzt die Kartenbibliothek,
BRouter antwortet mit einer echten Antwort aus tests/fixtures (OSM-Testausschnitt, ODbL), alle anderen Dienste werden abgefangen oder
zählen als «gesendet». Karten-Tipps werden über window.RTUI.mapClick ausgelöst (die Attrappe kann keine Pixel in Koordinaten umrechnen).
Geprüft wird die Bedienung des Planers: Sportleiste, Magnet, gebündelte Einwilligung, untere Leiste, Details, ⋯-Menü, Fertig, Merken der Sportart.
Das ist die Lehre aus «W is not defined»: jedes Blatt und jeder Knopf wird einmal wirklich geöffnet. Erfundene Daten der Demo, nichts Echtes.
Fehler: Exit-Code 1 und eine Liste der fehlgeschlagenen Schritte; keine Konsolenfehler erlaubt (ausser fehlenden Fremddiensten). """
import http.server
import importlib.util
import json
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_planer")
BILDER.mkdir(parents=True, exist_ok=True)

# Gerüst (Attrappe, Server) aus dem Karten-Durchklick übernehmen
_spec = importlib.util.spec_from_file_location("durchklick_karte", ROOT / "tools" / "durchklick_karte.py")
_dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dk)
ATTRAPPE, Still, PNG = _dk.ATTRAPPE, _dk.Still, _dk.PNG

FX = json.loads((ROOT / "tests" / "fixtures" / "brouter_dreieich_wandern.json").read_text(encoding="utf-8"))
PUNKTE = FX["punkte"]
ANTWORT = json.dumps(FX["antworten"][0])

IDS = ["rp-grip", "rp-scroll", "rp-sport2", "rp-sports", "rp-sub", "rp-magnet", "rp-consent", "rp-train", "rp-status", "rp-gap", "rp-gravel", "rp-saverow", "pl-gpx",
       "pl-gpx-dl", "pl-garmin", "pl-gs", "pl-msg", "pl-gs-stand", "rp-garmin", "rp-details", "rp-dienste", "rp-opts", "rp-search", "rp-q", "rp-qrole", "rp-qres", "rp-vias",
       "pl-name", "pl-save", "rp-ski", "rp-kpis", "rp-when", "rp-var", "rp-mtb", "rp-alt", "rp-winter", "rp-ana", "rp-tabs", "rp-int", "rp-arr", "rp-wx", "rp-srcbox", "rp-live",
       "rp-bar", "rp-mini", "rp-menu", "rp-add", "rp-rev", "rp-loop", "rp-tr", "rp-undo", "rp-clear", "rp-new", "rp-undo-k", "rp-det-btn", "rp-more", "pl-fertig", "pl-close"]
MENUE = ["rp-add", "rp-rev", "rp-loop", "rp-tr", "rp-undo", "rp-clear", "rp-new"]


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
        for name, w, h, farbe in (("handy-dunkel", 390, 844, "dark"), ("handy-hell", 390, 844, "light"), ("desktop", 1280, 800, "dark")):
            handy = w < 760
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme=farbe, service_workers="block")
            if farbe == "light":
                ctx.add_init_script("document.addEventListener('DOMContentLoaded', () => document.documentElement.setAttribute('data-theme', 'light'));")
            seite = ctx.new_page()
            gesendet = []
            seite.on("console", lambda m, n=name: konsole.append(f"[{n}] {m.text}") if m.type == "error" else None)
            seite.on("pageerror", lambda e, n=name: konsole.append(f"[{n}] Seitenfehler: {e}"))

            def fremd(route):
                u = route.request.url
                if u.endswith("maplibre-gl.js"):
                    route.fulfill(status=200, content_type="application/javascript", body=ATTRAPPE)
                elif u.endswith("maplibre-gl.css"):
                    route.fulfill(status=200, content_type="text/css", body="")
                elif "wmts.geo.admin.ch" in u:
                    route.fulfill(status=200, content_type="image/png", body=PNG)
                elif "brouter.de" in u:
                    gesendet.append("brouter")
                    if u.endswith("/profile"):
                        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body='{"profileid":"custom_test"}')
                    else:
                        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=ANTWORT)
                elif "api3.geo.admin.ch" in u and "SearchServer" not in u:
                    gesendet.append("swisstopo")
                    route.abort()
                elif "open-meteo" in u:
                    gesendet.append("wetter")
                    route.abort()
                elif "SearchServer" in u:
                    route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body='{"results":[]}')
                else:
                    route.abort()

            seite.route(lambda u: not u.startswith(f"http://127.0.0.1:{port}"), fremd)
            K = lambda js: seite.evaluate(js)

            def laden(loeschen=False):
                seite.goto(f"http://127.0.0.1:{port}/demo.html")
                seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
                if loeschen:
                    seite.evaluate("localStorage.clear()")
                    seite.reload()
                    seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
                seite.wait_for_timeout(400)
                seite.evaluate("""() => { const b = document.querySelector('button[data-gruppe="karte"]'); if (b) b.click(); }""")
                seite.wait_for_timeout(300)

            def tipp(i):
                K(f"window.RTUI.mapClick({{ lngLat: {{ lng: {PUNKTE[i][0]}, lat: {PUNKTE[i][1]} }}, point: {{ x: 0, y: 0 }} }})")
                seite.wait_for_timeout(250)

            def warte_route(ms=6000):
                seite.wait_for_function("window.RTUI.route() || window.RTUI.state().error", timeout=ms)
                seite.wait_for_timeout(300)

            laden(True)
            # alter Schlüssel zählt nicht mehr; erstes Mal Skitour
            K("localStorage.setItem('demo.sf.rt.sport', JSON.stringify('rennrad'))")
            seite.reload(); seite.wait_for_selector("#map canvas", state="attached", timeout=15000); seite.wait_for_timeout(400)
            seite.evaluate("""() => { const b = document.querySelector('button[data-gruppe="karte"]'); if (b) b.click(); }""")
            seite.wait_for_timeout(300)
            seite.click("#btn-plan")                                                   # Tipp 1: Planen
            seite.wait_for_timeout(400)
            pruefe(f"{name}: Planer offen", K("window.RTUI.active()") is True)
            pruefe(f"{name}: alle Kennungen genau einmal", all(K(f"document.querySelectorAll('#{i}').length") == 1 for i in IDS), str([i for i in IDS if K(f"document.querySelectorAll('#{i}').length") != 1]))
            pruefe(f"{name}: erstes Mal Skitour (alter Schlüssel «sport» zählt nicht)", K("window.RTUI.state().sport") == "skitour")
            pruefe(f"{name}: Sportleiste hat vier Knöpfe", K("[...document.querySelectorAll('#rp-sport2 [data-g]')].map(b => b.textContent.trim()).join('|')") == "Skitour|Wandern|Laufen ▾|Rad ▾")
            pruefe(f"{name}: Skitour leuchtet, Unterleiste zu", K("document.querySelector('#rp-sport2 [data-g=skitour]').getAttribute('aria-pressed')") == "true" and K("document.getElementById('rp-sports').hidden") is True)
            pruefe(f"{name}: Details zu", K("document.getElementById('rp-details').hidden") is True and K("document.getElementById('rp-det-btn').getAttribute('aria-expanded')") == "false")
            pruefe(f"{name}: Menü zu", K("document.getElementById('rp-menu').hidden") is True)
            pruefe(f"{name}: Magnet an", K("document.getElementById('rp-magnet').getAttribute('aria-pressed')") == "true")
            pruefe(f"{name}: Leiste am unteren Rand sichtbar", K("(() => { const r = document.getElementById('rp-bar').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.height > 50; })()"))
            pruefe(f"{name}: Fertig und Details sichtbar und gross genug", K("(() => { const f = document.getElementById('pl-fertig').getBoundingClientRect(), d = document.getElementById('rp-det-btn').getBoundingClientRect(); return f.height >= 40 && d.height >= 40 && f.right <= innerWidth && f.width > 60; })()"))
            pruefe(f"{name}: Sportleiste ohne Überlauf", K("(() => { const t = document.querySelector('.rp-top'); return t.scrollWidth <= t.clientWidth + 1 && [...document.querySelectorAll('#rp-sport2 [data-g]')].every(b => b.getBoundingClientRect().height < 60); })()"))
            pruefe(f"{name}: kein waagrechtes Scrollen im Blatt", K("(() => { const s = document.getElementById('rp-scroll'); return s.scrollWidth <= s.clientWidth + 1; })()"))
            pruefe(f"{name}: ohne Punkte zeigt die Leiste «Start antippen»", "Start antippen" in K("document.getElementById('rp-mini').textContent"))
            pruefe(f"{name}: ⋯-Menü hat die sieben Einträge in fester Reihenfolge", K("[...document.querySelectorAll('#rp-menu button')].map(b => b.id)") == MENUE)
            seite.screenshot(path=str(BILDER / f"{name}-1-leer.png"))

            # Start, Ziel: vor der Einwilligung geht nichts weg
            tipp(0)
            pruefe(f"{name}: Start gesetzt", K("window.RTUI.state().vias.length") == 1)
            pruefe(f"{name}: Leiste fordert das Ziel", "Ziel antippen" in K("document.getElementById('rp-mini').textContent"))
            tipp(1)                                                                    # Tipp 3: Ziel
            seite.wait_for_timeout(300)
            pruefe(f"{name}: Ziel gesetzt, Einwilligung gefragt", K("window.RTUI.state().vias.length") == 2 and K("document.getElementById('rp-consent').hidden") is False)
            pruefe(f"{name}: gebündelt mit «Erlauben» und «Nur von Hand»", K("document.getElementById('rp-ok').textContent") == "Erlauben" and K("document.getElementById('rp-manual').textContent") == "Nur von Hand")
            pruefe(f"{name}: Satz nennt BRouter, swisstopo, Open-Meteo", all(x in K("document.getElementById('rp-consent').textContent") for x in ("BRouter", "swisstopo", "Open-Meteo")))
            pruefe(f"{name}: «Erlauben» und «Nur von Hand» ohne Scrollen sichtbar", K("(() => { const s = document.getElementById('rp-scroll').getBoundingClientRect(); return ['rp-ok', 'rp-manual'].every(i => { const r = document.getElementById(i).getBoundingClientRect(); return r.top >= s.top - 1 && r.bottom <= s.bottom + 1 && r.height >= 36; }); })()"))
            pruefe(f"{name}: vor dem Ja ging nichts an einen Dienst", gesendet == [], str(gesendet))
            pruefe(f"{name}: Einwilligung noch nicht gespeichert", K("localStorage.getItem('demo.sf.rt.consent')") in (None, "{}"))
            seite.screenshot(path=str(BILDER / f"{name}-2-einwilligung.png"))
            seite.click("#rp-ok")                                                      # Tipp 4: Erlauben
            seite.wait_for_timeout(800)
            c = K("JSON.parse(localStorage.getItem('demo.sf.rt.consent') || '{}')")
            pruefe(f"{name}: Erlauben setzt alle drei Dienste", c.get("routing") is True and c.get("skirouten") is True and c.get("wetter") is True and bool(c.get("buendel_am")), str(c))
            pruefe(f"{name}: Karte der Einwilligung weg", K("document.getElementById('rp-consent').hidden") is True)
            warte_route()
            seite.screenshot(path=str(BILDER / f"{name}-3-skitour.png"))
            pruefe(f"{name}: Skitour fragt swisstopo erst nach dem Ja", "swisstopo" in gesendet)
            kopf = K("document.getElementById('rp-mini').textContent")
            pruefe(f"{name}: Leiste zeigt km · ↑ · ↓", "km" in kopf and "↑" in kopf and "↓" in kopf, kopf)
            seite.click("#pl-fertig")                                                  # Tipp 5: Fertig
            seite.wait_for_timeout(500)
            gespeichert = K("JSON.parse(localStorage.getItem('demo.sf.routes') || '[]')")
            pruefe(f"{name}: Fertig speichert sofort (ohne Namensdialog)", len(gespeichert) == 1, str(len(gespeichert)))
            pruefe(f"{name}: Name = «Sportart Datum»", bool(gespeichert) and gespeichert[0]["name"].startswith("Skitour ") and any(ch.isdigit() for ch in gespeichert[0]["name"]), str(gespeichert and gespeichert[0]["name"]))
            pruefe(f"{name}: Meldung bestätigt das Speichern", "gespeichert" in K("document.getElementById('pl-msg').textContent"))
            if K("window.RTUI.route()"):
                pruefe(f"{name}: GPX-Zeile erscheint erst nach Fertig", K("document.getElementById('rp-saverow').hidden") is False)
                pruefe(f"{name}: GPX teilen und in Dateien sichtbar", K("getComputedStyle(document.getElementById('pl-gpx')).display") != "none" and K("getComputedStyle(document.getElementById('pl-gpx-dl')).display") != "none")
            else:
                pruefe(f"{name}: ohne Linie bleibt die GPX-Zeile zu (Entwurf)", K("document.getElementById('rp-saverow').hidden") is True)
            pruefe(f"{name}: An Garmin senden bleibt verborgen (UPLOAD_MOEGLICH aus)", K("getComputedStyle(document.getElementById('pl-garmin')).display") == "none")
            seite.screenshot(path=str(BILDER / f"{name}-4-fertig.png"))

            # Details
            seite.click("#rp-det-btn")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Details offen", K("document.getElementById('rp-details').hidden") is False and K("document.getElementById('rp-det-btn').textContent") == "Details ▴")
            pruefe(f"{name}: Details beginnen am oberen Rand des Blatts", K("(() => { const s = document.getElementById('rp-scroll').getBoundingClientRect(), d = document.getElementById('rp-details').getBoundingClientRect(); return d.top >= s.top - 2 && d.top < s.top + s.height * 0.6; })()"))
            pruefe(f"{name}: Details enthält Wegpunkte, Suche, Dienste, Wetter, Herkunft", K("['rp-vias','rp-search','rp-dienste','rp-wx','rp-srcbox','rp-opts','pl-name'].every(i => document.getElementById('rp-details').contains(document.getElementById(i)))"))
            pruefe(f"{name}: Wegpunkte aufgelistet", K("document.querySelectorAll('#rp-vias li').length") == 2)
            pruefe(f"{name}: drei Dienste einzeln schaltbar", K("document.querySelectorAll('#rp-dienste [data-dienst]').length") == 3)
            if handy:
                pruefe(f"{name}: Blatt wächst mit Details (nicht mehr min)", K("document.getElementById('planner').dataset.sheet") in ("half", "full"))
            if K("window.RTUI.route()"):
                pruefe(f"{name}: Profil gezeichnet", K("document.getElementById('rp-svg').children.length") > 0)
            seite.screenshot(path=str(BILDER / f"{name}-5-details.png"))
            # einzelner Widerruf: Wetter aus
            seite.click("#rp-dienste [data-dienst=wetter]")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Wetter einzeln widerrufbar", K("JSON.parse(localStorage.getItem('demo.sf.rt.consent')).wetter") is False and K("JSON.parse(localStorage.getItem('demo.sf.rt.consent')).routing") is True)
            seite.click("#rp-dienste [data-dienst=wetter]")
            seite.wait_for_timeout(300)
            seite.click("#rp-det-btn")
            seite.wait_for_timeout(300)
            pruefe(f"{name}: Details wieder zu", K("document.getElementById('rp-details').hidden") is True)

            # ⋯-Menü
            seite.click("#rp-more")
            pruefe(f"{name}: Menü offen", K("document.getElementById('rp-menu').hidden") is False and K("document.getElementById('rp-more').getAttribute('aria-expanded')") == "true")
            pruefe(f"{name}: Menü liegt im Bild", K("(() => { const r = document.getElementById('rp-menu').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0; })()"), str(K("JSON.stringify(document.getElementById('rp-menu').getBoundingClientRect())")))
            seite.screenshot(path=str(BILDER / f"{name}-6-menue.png"))
            seite.click("#rp-rev")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Umkehren schliesst das Menü und dreht die Punkte", K("document.getElementById('rp-menu').hidden") is True and abs(K("window.RTUI.state().vias[0][0]") - PUNKTE[1][0]) < 1e-9)
            seite.click("#rp-more"); seite.click("#rp-clear")
            seite.wait_for_timeout(400)
            pruefe(f"{name}: Alle Punkte löschen", K("window.RTUI.state().vias.length") == 0)
            seite.click("#rp-undo-k")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: ↶ holt die Punkte zurück", K("window.RTUI.state().vias.length") == 2)
            seite.click("#rp-more"); seite.click("#rp-new")
            seite.wait_for_timeout(300)
            pruefe(f"{name}: Neu leert", K("window.RTUI.state().vias.length") == 0)
            seite.click("#rp-more"); seite.keyboard.press("Escape")
            pruefe(f"{name}: Escape schliesst das Menü", K("document.getElementById('rp-menu').hidden") is True)
            seite.click("#rp-more"); seite.mouse.click(200, 24)          # Kopfzeile der Seite, nicht die Karte
            seite.wait_for_timeout(200)
            pruefe(f"{name}: Tippen daneben schliesst das Menü", K("document.getElementById('rp-menu').hidden") is True)
            seite.click("#rp-more"); seite.click("#rp-tr")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Training → Route öffnet ohne Fehler", K("document.getElementById('rp-menu').hidden") is True)
            seite.screenshot(path=str(BILDER / f"{name}-7-training.png"))

            # zweiter Durchgang: Einwilligung bleibt, nur 4 Tipps (Planen schon offen, Start, Ziel, Fertig)
            K("window.RTUI.state().editId = null")
            tipp(0); tipp(1)
            seite.wait_for_timeout(400)
            pruefe(f"{name}: zweites Mal keine Frage mehr", K("document.getElementById('rp-consent').hidden") is True)
            warte_route()
            seite.click("#pl-fertig"); seite.wait_for_timeout(400)
            pruefe(f"{name}: zweite Strecke gespeichert", len(K("JSON.parse(localStorage.getItem('demo.sf.routes') || '[]')")) >= 2)

            # Sportarten
            seite.click("#rp-sport2 [data-g=rad]")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Rad klappt auf (Rennrad, Gravel, MTB)", K("[...document.querySelectorAll('#rp-sports [data-s]')].map(b => b.dataset.s).join(',')") == "rennrad,gravel,mtb" and K("document.getElementById('rp-sports').hidden") is False)
            pruefe(f"{name}: Rad wählt zuerst Rennrad", K("window.RTUI.state().sport") == "rennrad")
            seite.click("#rp-sports [data-s=gravel]")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Gravel gewählt", K("window.RTUI.state().sport") == "gravel")
            seite.click("#rp-sport2 [data-g=skitour]"); seite.wait_for_timeout(300)
            seite.click("#rp-sport2 [data-g=rad]"); seite.wait_for_timeout(300)
            pruefe(f"{name}: Rad merkt Gravel für die Gruppe", K("window.RTUI.state().sport") == "gravel")
            seite.click("#rp-sport2 [data-g=laufen]"); seite.wait_for_timeout(300)
            pruefe(f"{name}: Laufen klappt auf (Laufen, Trail)", K("[...document.querySelectorAll('#rp-sports [data-s]')].map(b => b.dataset.s).join(',')") == "laufen,trail")
            seite.click("#rp-sports [data-s=trail]"); seite.wait_for_timeout(300)
            seite.click("#rp-sport2 [data-g=wandern]"); seite.wait_for_timeout(300)
            pruefe(f"{name}: Wandern hat keine Unterleiste", K("window.RTUI.state().sport") == "wandern" and K("document.getElementById('rp-sports').hidden") is True)
            pruefe(f"{name}: Sportart gemerkt (sport2)", K("JSON.parse(localStorage.getItem('demo.sf.rt.sport2'))") == "wandern")
            seite.screenshot(path=str(BILDER / f"{name}-8-wandern.png"))

            # Magnet aus / an
            K("window.RTUI.state().editId = null")
            tipp(0); tipp(1)
            warte_route()
            vor = len([g for g in gesendet if g == "brouter"])
            pruefe(f"{name}: Wandern routet über BRouter", vor > 0)
            seite.click("#rp-magnet")
            seite.wait_for_timeout(600)
            pruefe(f"{name}: Magnet aus", K("document.getElementById('rp-magnet').getAttribute('aria-pressed')") == "false" and K("window.RTUI.state().manual") is True)
            nach = len([g for g in gesendet if g == "brouter"])
            pruefe(f"{name}: Magnet aus fragt keinen Dienst", nach == vor, f"{vor} → {nach}")
            pruefe(f"{name}: von Hand gekennzeichnet, nicht als Weg", "von Hand" in K("document.getElementById('rp-status').textContent + document.getElementById('rp-mini').textContent + document.getElementById('rp-sub').textContent"))
            pruefe(f"{name}: Magnet aus ist nicht bleibend", K("JSON.parse(localStorage.getItem('demo.sf.rt.consent')).routing") is True)
            seite.click("#rp-magnet")
            seite.wait_for_timeout(600)
            pruefe(f"{name}: Magnet wieder an", K("window.RTUI.state().manual") is False)

            # Nur von Hand: widerruft alle drei, Magnet aus, bleibend
            seite.click("#rp-det-btn"); seite.wait_for_timeout(300)
            seite.click("#rp-d-hand"); seite.wait_for_timeout(500)
            c = K("JSON.parse(localStorage.getItem('demo.sf.rt.consent'))")
            pruefe(f"{name}: Nur von Hand widerruft alle drei", c.get("routing") is False and c.get("skirouten") is False and c.get("wetter") is False, str(c))
            pruefe(f"{name}: Nur von Hand schaltet den Magneten aus", K("window.RTUI.state().manual") is True and K("document.getElementById('rp-magnet').getAttribute('aria-pressed')") == "false")
            vor = len(gesendet)
            seite.click("#rp-sport2 [data-g=skitour]"); seite.wait_for_timeout(500)
            pruefe(f"{name}: danach bleibt der Magnet bei jeder Sportart aus", K("window.RTUI.state().manual") is True)
            pruefe(f"{name}: danach geht nichts mehr an Dienste", len(gesendet) == vor, str(gesendet[vor:]))
            laden(False)
            seite.click("#btn-plan"); seite.wait_for_timeout(400)
            pruefe(f"{name}: nach Neustart: Sportart gemerkt", K("window.RTUI.state().sport") == "skitour")
            pruefe(f"{name}: nach Neustart: Magnet bleibt aus", K("window.RTUI.state().manual") is True and K("document.getElementById('rp-consent').hidden") is True)
            # Magnet wieder an: Skitour fragt nach der Einwilligung (nicht stumm)
            seite.click("#rp-magnet"); seite.wait_for_timeout(400)
            pruefe(f"{name}: Magnet an nach «Nur von Hand» fragt wieder", K("document.getElementById('rp-consent').hidden") is False or K("window.RTUI.state().manual") is False)
            seite.screenshot(path=str(BILDER / f"{name}-9-nach-neustart.png"))
            seite.click("#pl-close"); seite.wait_for_timeout(300)
            pruefe(f"{name}: Planer schliesst", K("window.RTUI.active()") is False)
            ctx.close()
        br.close()
    srv.shutdown()
    echte = [k for k in konsole if not any(x in k for x in ("net::ERR", "Failed to load resource", "ERR_FAILED", "fonts.g"))]
    for k in echte:
        fehler.append("Konsole: " + k)
    print(f"{len(schritte)} Schritte, {len(fehler)} Fehler")
    for f in fehler:
        print("  FEHLER:", f)
    print("Bilder:", BILDER)
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
