"""Durchklick-Test «Training planen» mit den Unterstufen FatMax und Sweet Spot in der Demo (V9.18.0, intensitaet-stufen-1.0): Chrome headless gegen demo.html.

Aufruf im Repository: python3 -I tools/durchklick_stufen.py [Ordner für Bilder]
Gerüst wie tools/durchklick_zonen.py. Geprüft: Blatt «Training planen» → Rad und Lauf zeigen FatMax (eingerückt unter Grundlage) und Sweet Spot (eingerückt unter Tempo · Schwelle);
FatMax-Vorlagen öffnen sich mit Dauerblatt und Profil; Schwimmen zeigt beide nicht; kein Konsolenfehler. Erfundene Daten der Demo. Fehler: Exit-Code 1. """
import importlib.util
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_stufen")
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
            seite.wait_for_timeout(600)
            morgen = seite.evaluate("(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()")
            for sp, erwartet in (("rad", True), ("lauf", True), ("schwimm", False)):
                seite.evaluate("(a) => window.V66UI.hinzufuegen(a[0], () => {})", [morgen])
                seite.wait_for_timeout(250)
                seite.locator(f'[data-mpsp="{sp}"]').click()
                seite.wait_for_timeout(250)
                stufen = seite.locator(".mp-stufen li").all_inner_texts()
                unter = seite.locator(".mp-stufen li.mp-unter").count()
                pruefe(f"{name}: {sp} Stufen", len(stufen) >= 2, str(stufen))
                hat = any("FatMax" in t for t in stufen) and any("Sweet Spot" in t for t in stufen)
                pruefe(f"{name}: {sp} {'mit' if erwartet else 'ohne'} FatMax und Sweet Spot", hat == erwartet, str(stufen))
                pruefe(f"{name}: {sp} Unterstufen eingerückt", unter == (2 if erwartet else 0), f"{unter}")
                if erwartet:
                    eingerueckt = seite.evaluate("(() => { const a = document.querySelector('.mp-stufen li.mp-unter'), b = document.querySelector('.mp-stufen li:not(.mp-unter)'); return a.getBoundingClientRect().left - b.getBoundingClientRect().left; })()")
                    pruefe(f"{name}: {sp} Einzug sichtbar", eingerueckt >= 10, str(eingerueckt))
                    pruefe(f"{name}: {sp} Blatt läuft nicht seitlich über", seite.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
                    seite.locator('.mp-stufen li.mp-unter button').first.click()      # FatMax
                    seite.wait_for_timeout(250)
                    vorl = seite.locator(".mp-vorlage").all_inner_texts()
                    pruefe(f"{name}: {sp} FatMax-Vorlagen", len(vorl) >= 2 and all("FatMax" in v for v in vorl), str(vorl))
                    seite.locator(".mp-vorlage").first.click()
                    seite.wait_for_timeout(300)
                    pruefe(f"{name}: {sp} Dauerblatt öffnet", seite.locator("#v59-ov-h").count() >= 1)
                    if sp == "rad" and name == "handy-dunkel":
                        seite.screenshot(path=str(BILDER / f"{name}-{sp}-dauer.png"))
                seite.evaluate("document.querySelectorAll('.v59-ov, .ov, [data-mpz]').forEach(() => {}); history.length")
                seite.reload(); seite.wait_for_selector("#map canvas", state="attached", timeout=15000); seite.wait_for_timeout(500)
            ctx.close()
        br.close()
    srv.shutdown()
    echte = [k for k in konsole if "maplibre" not in k.lower()]
    pruefe("Konsole ohne Fehler", not echte, " | ".join(echte[:5]))
    print(f"{len(schritte)} Schritte, {len(fehler)} Fehler")
    for f in fehler:
        print("  FEHLER:", f)
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
