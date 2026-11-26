"""Durchklick-Test «Laktat im Explorer» (V9.26.1, laktat-eingabe-1.0 und blatt-stapel-1.0): Chrome headless gegen demo.html (iPhone-Ansicht mit Touch, dazu Desktop).

Aufruf im Repository: python3 -I tools/durchklick_laktat.py [Ordner für Bilder]
Gerüst (Server, Karten-Attrappe) wie tools/durchklick_zwift.py. Erfundene Daten der Demo, nichts Echtes. Geprüft wird:
  1. Einheit-Seite: «Ganze Einheit», «Als Intervall», «Laktat hier» sind da, «Als Block A merken» und «Mit A vergleichen» nicht mehr.
  2. «Laktat hier»: Zeitfeld «h:mm:ss», vorbelegt als h:mm:ss; «1:10» wird bei einer Fahrt über 1 h als 1:10:00 gelesen (nicht als 1 min 10 s), die Anzeige sagt es;
     «0:01:10» warnt (Fenster am Start abgeschnitten); «abc» ist nicht lesbar und speichert nichts; Speichern legt t = 4200 mit dem Fenster 50:00–1:10:02 an.
  3. Laktat-Liste ohne Tabelle und ohne seitliches Wischen, «Bestätigen» ganz im Bild und antippbar (Touch).
  4. Das Blatt «Laktat bestätigen» liegt über der Einheit-Seite (Trefferprüfung am Blatt, z-index), «Abbrechen» schliesst es, die Einheit-Seite ist danach wieder bedienbar;
     bestätigen setzt «bestätigt».
  5. Ein Eintrag mit abgeschnittenem Fenster (t = 70 s, 0:00–1:11) zeigt in der Karte und im Blatt die Warnung.
  6. Keine Konsolenfehler. Der Test bestätigt nur Einträge der Demo auf dem Prüfgerät, nichts Echtes. Fehler: Exit-Code 1 und Liste der Schritte."""
import importlib.util
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_laktat")
BILDER.mkdir(parents=True, exist_ok=True)

_spec = importlib.util.spec_from_file_location("durchklick_karte", ROOT / "tools" / "durchklick_karte.py")
_dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dk)
ATTRAPPE, Still, PNG = _dk.ATTRAPPE, _dk.Still, _dk.PNG

FINDE = """() => { const C = window.V5UI.C; const L = C.D.activities.filter((x) => x.sport === 'rad' && (x.mv || x.dur) >= 5400).slice(-1)[0]; return L ? { id: L.id, name: L.name, dauer: L.mv || L.dur, date: L.date } : null; }"""
INBOX = "() => (window.V5UI.Inbox.data.laktat_punkte || []).map((p) => ({ id: p.id, t: p.t, la: p.la, von: p.abschnitt.von, bis: p.abschnitt.bis, status: p.status }))"
OBEN = """() => {
  const ov = document.getElementById('v59-ov'), ex = document.getElementById('ex'), box = ov && ov.querySelector('.te-box');
  if (!box || ov.hidden) return { offen: false };
  const r = box.getBoundingClientRect(), was = ex.inert; ex.inert = false;            // Einheit-Seite kurz nicht gesperrt: sonst übersieht die Trefferprüfung sie
  const e = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(30, r.height / 2));
  ex.inert = was;
  return { offen: true, oben: !!(e && e.closest('#v59-ov')), zBlatt: +getComputedStyle(ov).zIndex, zEx: +getComputedStyle(ex).zIndex, exGesperrt: was };
}"""


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

        def neue_seite(w, h, farbe, touch):
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme=farbe, service_workers="block", has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
            seite = ctx.new_page()
            seite.on("console", lambda m: konsole.append(m.text) if m.type == "error" and "ERR_FAILED" not in m.text and "Failed to load resource" not in m.text else None)
            seite.on("pageerror", lambda e: konsole.append(f"Seitenfehler: {e}"))

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
            return ctx, seite

        def tippen(seite, sel):
            """Antippen wie am iPhone: in den Bildschirm scrollen, dann Touch auf die Mitte des Knopfs; vorher prüfen, dass er ganz im Bild ist."""
            el = seite.locator(sel).first
            el.scroll_into_view_if_needed()
            seite.wait_for_timeout(150)
            b = el.bounding_box()
            vp = seite.viewport_size
            ganz = b["x"] >= 0 and b["y"] >= 0 and b["x"] + b["width"] <= vp["width"] + 0.5 and b["y"] + b["height"] <= vp["height"] + 0.5
            seite.touchscreen.tap(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
            seite.wait_for_timeout(350)
            return ganz

        for (w, h, farbe, touch, tag) in ((390, 844, "dark", True, "iphone"), (1280, 900, "light", False, "desktop")):
            ctx, s = neue_seite(w, h, farbe, touch)
            akt = s.evaluate(FINDE)
            pruefe(f"{tag}: Demo hat eine Rad-Einheit über 1,5 h", bool(akt), str(akt))
            if not akt:
                ctx.close()
                continue
            s.evaluate("() => { window.V5UI.C.IS_DEMO = false; }")        # sonst zeigt die Karte in der Demo keinen «Bestätigen»-Knopf
            s.evaluate("(id) => window.EX.open(id)", akt["id"])
            s.wait_for_selector("#ex-all", timeout=10000)
            s.wait_for_timeout(300)

            # 1. Knöpfe
            txt = s.locator("#ex-body .ex-acts").inner_text()
            pruefe(f"{tag}: Knöpfe «Ganze Einheit», «Als Intervall», «Laktat hier» sind da", all(k in txt for k in ("Ganze Einheit", "Als Intervall", "Laktat hier")), txt)
            body = s.locator("#ex").inner_text()
            pruefe(f"{tag}: «Als Block A merken» und «Mit A vergleichen» sind weg", "Block A" not in body and "Mit A vergleichen" not in body and s.locator("#ex-a, #ex-cmp-b, #ex-cmp").count() == 0, "")

            # 2. Dialog
            tippen(s, "#ex-la") if touch else s.locator("#ex-la").click()
            s.wait_for_selector("#ex-lf", timeout=5000)
            pruefe(f"{tag}: Zeitfeld heisst «h:mm:ss»", "h:mm:ss" in s.locator("#ex-lf label:has(input[name=t])").inner_text(), s.locator("#ex-lf").inner_text()[:200])
            vor = s.locator("#ex-lf input[name=t]").input_value()
            pruefe(f"{tag}: Zeit ist als h:mm:ss vorbelegt", bool(__import__("re").fullmatch(r"\d+:\d\d:\d\d", vor)), vor)
            s.select_option("#ex-lf select[name=fe]", "20")
            s.fill("#ex-lf input[name=la]", "1,2")
            s.fill("#ex-lf input[name=t]", "1:10")
            hint = s.locator("#ex-lf-hf").inner_text()
            pruefe(f"{tag}: «1:10» wird als 1:10:00 gelesen, die Anzeige sagt es", "Messung bei 1:10:00" in hint and "Vor der Messung sind nur" not in hint, hint)
            pruefe(f"{tag}: Fenster 50:00 bis 1:10:0x (20 min davor)", "Abschnitt 0:50:00–1:10:0" in hint, hint)
            s.fill("#ex-lf input[name=t]", "0:01:10")
            hint = s.locator("#ex-lf-hf").inner_text()
            pruefe(f"{tag}: «0:01:10» warnt, dass das Fenster am Start abgeschnitten ist", "Stimmt die Zeit?" in hint and "Vor der Messung sind nur 0:01:" in hint, hint)
            s.fill("#ex-lf input[name=t]", "abc")
            hint = s.locator("#ex-lf-hf").inner_text()
            pruefe(f"{tag}: «abc» ist nicht lesbar", "Zeit nicht lesbar" in hint, hint)
            s.locator("#ex-lf button[type=submit]").click()
            s.wait_for_timeout(200)
            pruefe(f"{tag}: bei nicht lesbarer Zeit wird nichts gespeichert", s.evaluate(INBOX) == [], str(s.evaluate(INBOX)))
            s.fill("#ex-lf input[name=t]", "1:10")
            s.locator("#ex-lf button[type=submit]").click()
            s.wait_for_selector("#ex-lak .ex-lp", timeout=5000)
            ib = s.evaluate(INBOX)
            pruefe(f"{tag}: gespeichert mit t = 4200 und Fenster 3000 bis ca. 4202", len(ib) == 1 and ib[0]["t"] == 4200 and abs(ib[0]["von"] - 3000) <= 2 and 4198 <= ib[0]["bis"] <= 4204 and ib[0]["status"] == "vorschau", str(ib))

            # 3. Liste
            pruefe(f"{tag}: Liste ohne Tabelle", s.locator("#ex-lak table").count() == 0 and s.locator("#ex-lak .ex-lp").count() == 1, "")
            kart = s.locator("#ex-lak .ex-lp").first.inner_text()
            pruefe(f"{tag}: Karte zeigt Wert, Zeit und Abschnitt unverkürzt", "1.2 mmol/l" in kart.replace(",", ".") and "bei 1:10:00" in kart and "0:50:00–1:10:0" in kart and "Ø Leistung" in kart and "Ø Puls" in kart, kart)
            ueber = s.evaluate("() => { const e = document.getElementById('ex-lak'); return e.scrollWidth - e.clientWidth; }")
            pruefe(f"{tag}: Laktat-Bereich läuft nicht seitlich über", ueber <= 1, str(ueber))
            s.locator("#ex-lak .ex-lp").first.scroll_into_view_if_needed()
            s.screenshot(path=str(BILDER / f"{tag}-1-liste.png"))

            # 4. Bestätigen-Blatt
            ganz = tippen(s, "#ex-lak [data-lpb]") if touch else (s.locator("#ex-lak [data-lpb]").click() or True)
            pruefe(f"{tag}: «Bestätigen» liegt ganz im Bild", ganz, "")
            s.wait_for_selector("#v59-ov .te-box", timeout=3000)
            o = s.evaluate(OBEN)
            pruefe(f"{tag}: «Laktat bestätigen» öffnet sich und liegt über der Einheit-Seite", o.get("offen") and o.get("oben") and o["zBlatt"] > o["zEx"] and o["exGesperrt"], str(o))
            pruefe(f"{tag}: Blatt zeigt 1:10:00 und keine Warnung", "Laktat bestätigen" in s.locator("#v59-ov").inner_text() and "bei 1:10:00" in s.locator("#v59-ov").inner_text() and "Stimmt die Zeit" not in s.locator("#v59-ov").inner_text(), s.locator("#v59-ov").inner_text()[:300])
            s.screenshot(path=str(BILDER / f"{tag}-2-blatt.png"))
            s.locator("#v59-ov [data-x]").last.click()
            s.wait_for_timeout(250)
            ex_gesperrt = s.evaluate("() => document.getElementById('ex').inert")
            pruefe(f"{tag}: «Abbrechen» schliesst das Blatt, die Einheit-Seite ist wieder bedienbar", s.locator("#v59-ov").evaluate("e => e.hidden") and not ex_gesperrt, "")
            tippen(s, "#ex-lak [data-lpb]") if touch else s.locator("#ex-lak [data-lpb]").click()
            s.wait_for_selector("#v59-ov .te-box", timeout=3000)
            s.locator("#v59-ov [data-ok]").click()
            s.wait_for_timeout(300)
            pruefe(f"{tag}: nach «Als Kurzcheck bestätigen» steht «bestätigt», der Knopf ist weg", "bestätigt" in s.locator("#ex-lak .ex-lp").first.inner_text() and s.locator("#ex-lak [data-lpb]").count() == 0, s.locator("#ex-lak").inner_text()[:200])

            # 5. Eintrag mit abgeschnittenem Fenster (wie die Eingabe «1:10» als 70 s)
            s.evaluate("""(id) => { const I = window.V5UI.Inbox; I.data.laktat_punkte.push({ id: 'lp-' + id + '-70', act: id, datum: '2026-11-25', sport: 'rad', t: 70, la: 1.4, abschnitt: { von: 0, bis: 71, grund: '20 min vor der Messung (Puls aus der Aufzeichnung, laktat-hf-1.0)', w: 170, np: 170, hr: 118, pace: 120, hr_max: 130, hr_anstieg: 12.5, fenster_s: 1200 }, status: 'vorschau', quelle: 'von Hand im Explorer' }); }""", akt["id"])
            s.evaluate("() => window.EX.open(window.V5UI.Inbox.data.laktat_punkte[0].act)")
            s.wait_for_selector("#ex-lak .ex-lp", timeout=10000)
            s.wait_for_timeout(300)
            pruefe(f"{tag}: zwei Karten, die mit abgeschnittenem Fenster warnt", s.locator("#ex-lak .ex-lp").count() == 2 and s.locator("#ex-lak .ex-lp-warn").count() == 1 and "Stimmt die Zeit (0:01:10)?" in s.locator("#ex-lak .ex-lp-warn").inner_text(), s.locator("#ex-lak").inner_text()[:400])
            karte = s.locator("#ex-lak .ex-lp", has=s.locator(".ex-lp-warn"))
            (tippen(s, "#ex-lak .ex-lp:has(.ex-lp-warn) [data-lpb]") if touch else karte.locator("[data-lpb]").click())
            s.wait_for_selector("#v59-ov .te-box", timeout=3000)
            blatt = s.locator("#v59-ov").inner_text()
            pruefe(f"{tag}: auch im Blatt steht die Warnung, Zeiten als h:mm:ss", "Nur 0:01:11 vor der Messung aufgezeichnet" in blatt and "bei 0:01:10" in blatt and "0:00:00–0:01:11" in blatt, blatt[:400])
            o = s.evaluate(OBEN)
            pruefe(f"{tag}: Blatt liegt auch hier über der Einheit-Seite", o.get("oben") and o["zBlatt"] > o["zEx"], str(o))
            s.screenshot(path=str(BILDER / f"{tag}-3-warnung.png"))
            s.locator("#v59-ov [data-x]").last.click()
            s.evaluate("() => window.EX.close()")
            s.wait_for_timeout(200)
            z = s.evaluate("() => ({ ex: document.getElementById('ex').style.zIndex, blatt: document.getElementById('v59-ov').style.zIndex, inert: document.querySelectorAll('[data-m-inert]').length })")
            pruefe(f"{tag}: nach dem Schliessen ist nichts mehr gesperrt und keine z-index-Reste", z["inert"] == 0 and z["ex"] == "" and z["blatt"] == "", str(z))
            ctx.close()
        br.close()
    srv.shutdown()
    echte = [k for k in konsole if "Unexpected" not in k and "net::" not in k]
    pruefe("keine Konsolenfehler", not echte, "; ".join(echte[:5]))
    print(f"{len(schritte)} Schritte, {len(fehler)} Fehler")
    for f in fehler:
        print("FEHLER:", f)
    sys.exit(1 if fehler else 0)


main()
