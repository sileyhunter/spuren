"""Durchklick-Test der Zonenansicht «Intensitätszonen» in der Demo (V9.17.0, zonen-ansicht-1.0): Chrome headless gegen demo.html.

Aufruf im Repository: python3 -I tools/durchklick_zonen.py [Ordner für Bilder]
Gerüst (Server, Karten-Attrappe) wie tools/durchklick_planer.py. Geprüft wird: Ansicht Laktat und Zonen öffnen, die Karte «Intensitätszonen» zeigt Balken,
Teilstriche und Liste; jede Sportart und jede Messgrösse wird einmal angetippt; der Balken hat so viele Zonen wie die Liste; nichts läuft seitlich über; keine
Konsolenfehler (ausser fehlenden Fremddiensten). Erfundene Daten der Demo, nichts Echtes. Fehler: Exit-Code 1 und eine Liste der fehlgeschlagenen Schritte. """
import importlib.util
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_zonen")
BILDER.mkdir(parents=True, exist_ok=True)

_spec = importlib.util.spec_from_file_location("durchklick_karte", ROOT / "tools" / "durchklick_karte.py")
_dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dk)
ATTRAPPE, Still, PNG = _dk.ATTRAPPE, _dk.Still, _dk.PNG


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
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme=farbe, service_workers="block")
            if farbe == "light":
                ctx.add_init_script("document.addEventListener('DOMContentLoaded', () => document.documentElement.setAttribute('data-theme', 'light'));")
            seite = ctx.new_page()
            seite.on("console", lambda m, n=name: konsole.append(f"[{n}] {m.text}") if m.type == "error" and "ERR_FAILED" not in m.text else None)
            seite.on("pageerror", lambda e, n=name: konsole.append(f"[{n}] Seitenfehler: {e}"))

            def fremd(route):
                u = route.request.url
                if u.endswith("maplibre-gl.js"):
                    route.fulfill(status=200, content_type="application/javascript", body=ATTRAPPE)
                elif u.endswith("maplibre-gl.css"):
                    route.fulfill(status=200, content_type="text/css", body="")
                elif "wmts.geo.admin.ch" in u:
                    route.fulfill(status=200, content_type="image/png", body=PNG)
                else:
                    route.abort()

            seite.route(lambda u: not u.startswith(f"http://127.0.0.1:{port}"), fremd)
            seite.goto(f"http://127.0.0.1:{port}/demo.html")
            seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
            seite.wait_for_timeout(500)
            seite.evaluate("location.hash = '#laktat'")
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Karte vorhanden", seite.locator("#iz-card").count() == 1)
            pruefe(f"{name}: Balken gezeichnet", seite.locator("#iz-box .iz-bar .iz-z").count() >= 2, "(keine Zonen im Balken)")
            sports = seite.locator("#iz-sport button").all_inner_texts()
            pruefe(f"{name}: Sportarten", len(sports) >= 1, str(sports))
            for sp in range(len(sports)):
                seite.locator("#iz-sport button").nth(sp).click()
                seite.wait_for_timeout(120)
                mets = seite.locator("#iz-metrik button").all_inner_texts()
                pruefe(f"{name}: {sports[sp]} hat Messgrössen", len(mets) >= 1, str(mets))
                for mi in range(len(mets)):
                    seite.locator("#iz-metrik button").nth(mi).click()
                    seite.wait_for_timeout(120)
                    n_bar = seite.locator("#iz-box .iz-bar .iz-z").count()
                    n_li = seite.locator("#iz-box .iz-liste > li:not(.unter)").count()
                    pruefe(f"{name}: {sports[sp]}/{mets[mi]} Balken und Liste gleich viele Zonen", n_bar == n_li and n_bar >= 2, f"{n_bar} vs {n_li}")
                    pruefe(f"{name}: {sports[sp]}/{mets[mi]} gedrückt", seite.locator("#iz-metrik button[aria-pressed='true']").count() == 1)
                    if mets[mi] == "Kalorien":
                        pruefe(f"{name}: {sports[sp]}/Kalorien Annahmen sichtbar", seite.locator("#iz-box .iz-annahmen").count() == 1 and "Schätzung, keine Messung" in seite.locator("#iz-box .iz-annahmen").inner_text())
                        pruefe(f"{name}: {sports[sp]}/Kalorien Zeilen oder Grund", seite.locator("#iz-box .iz-kcal").count() >= 5 or "Körpergewicht" in seite.locator("#iz-box .iz-annahmen").inner_text(), "weder Zahlen noch Grund")
                    ueber = seite.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                    pruefe(f"{name}: {sports[sp]}/{mets[mi]} kein seitliches Überlaufen", ueber <= 1, f"{ueber} px")
                    ticks = seite.evaluate("(() => { const L = [...document.querySelectorAll('#iz-box .iz-t')].map(e => e.getBoundingClientRect()); const bar = document.querySelector('#iz-box .iz-bar').getBoundingClientRect(); return L.every(r => r.left >= bar.left - 2 && r.right <= bar.right + 2); })()")
                    pruefe(f"{name}: {sports[sp]}/{mets[mi]} Teilstriche im Balken", ticks)
                    seite.locator("#iz-card").scroll_into_view_if_needed()
                    seite.locator("#iz-card").screenshot(path=str(BILDER / f"{name}-{sports[sp]}-{mets[mi]}.png"))
            ctx.close()
        br.close()
    for z in konsole:
        pruefe("Konsole", False, z)
    print(f"{len(schritte)} Schritte, {len(fehler)} Fehler")
    for f in fehler:
        print("FEHLER:", f)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
