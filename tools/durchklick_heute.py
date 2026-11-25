"""Durchklick-Test «Heute senden» (V9.24.4, heute-senden-1.0): Chrome headless gegen demo.html, Uhr fest gestellt (Europe/Zurich).

Aufruf im Repository: python3 -I tools/durchklick_heute.py [Ordner für Bilder]
Gerüst (Server, Karten-Attrappe) wie tools/durchklick_zwift.py. Geprüft wird: Einheit-Seite einer Rad- und einer Lauf-Einheit von heute (um 14:00) → «Export» → im Garmin-Teil steht
«Heute senden» (ohne die Wahl Nacht-Update/Vortag) und der Hinweis auf die Updates um 13, 15, 17, 19, 21 und 23 Uhr; Tippen legt auf dem Gerät einen Auftrag «gs-<heute>» mit Modus «heute»
an, danach steht «Wird gesendet: mit dem nächsten Update …» und «Nicht senden» legt einen Auftrag ohne die Einheit an; um 23:00 gibt es keinen Knopf mehr, nur den Hinweis auf den Chat; eine Einheit
von morgen hat weiter «Senden» mit der Wahl; keine Konsolenfehler. Erfundene Daten der Demo, nichts Echtes. Fehler: Exit-Code 1 und Liste der Schritte."""
import datetime as dt
import importlib.util
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_heute")
BILDER.mkdir(parents=True, exist_ok=True)

_spec = importlib.util.spec_from_file_location("durchklick_karte", ROOT / "tools" / "durchklick_karte.py")
_dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dk)
ATTRAPPE, Still, PNG = _dk.ATTRAPPE, _dk.Still, _dk.PNG

# erste Rad- und erste Lauf-Einheit (eigen, sendbar) ab heute in den nächsten 13 Tagen – Tag als Abstand zu heute
FINDE = """() => {
  const C = window.V5UI.C, V64 = window.V64, P = window.V64UI, heute = C.iso(C.today), out = { rad: null, lauf: null, morgen: null };
  for (let i = 0; i <= 13; i++) {
    const ds = V64.addDays(heute, i), K = P.kontextFuer(V64.montag(ds)), t = K && K.w.tage.find((x) => x.date === ds);
    if (!t || t.rennen) continue;
    for (const e of t.einheiten) {
      if (e.quelle === 'bibliothek' || e.art === 'bibliothek' || window.V66.garminGrund(e)) continue;
      if (!out.rad && e.sport === 'rad') out.rad = { ds, i, uid: e.uid, titel: e.titel };
      if (!out.lauf && e.sport === 'lauf') out.lauf = { ds, i, uid: e.uid, titel: e.titel };
    }
  }
  return out;
}"""
INBOX = "() => (window.V5UI.Inbox && window.V5UI.Inbox.data && window.V5UI.Inbox.data.garmin_senden) || []"


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

        def neue_seite(w, h, zeit=None):
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme="dark", service_workers="block", timezone_id="Europe/Zurich", locale="de-CH")
            if zeit:
                ctx.clock.set_fixed_time(zeit)
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

        # 1. Welcher Tag der Demo hat eine Rad- und eine Lauf-Einheit? (Uhr der echten Zeit)
        ctx0, s0 = neue_seite(390, 844)
        fund = s0.evaluate(FINDE)
        ctx0.close()
        pruefe("Demo hat eine Rad- und eine Lauf-Einheit in den nächsten 13 Tagen", bool(fund["rad"]) and bool(fund["lauf"]), str(fund))
        if not (fund["rad"] and fund["lauf"]):
            print("FEHLER: keine passenden Einheiten")
            sys.exit(1)
        heute_real = dt.date.today()

        def uhr(tag, hh, mm=0):
            return dt.datetime.combine(tag, dt.time(hh, mm))

        def export_oeffnen(seite, e):
            seite.evaluate("([ds, uid]) => window.V66UI.einheit(ds, uid)", [e["ds"], e["uid"]])
            seite.wait_for_selector(".v73-export[data-v73='export']", timeout=8000)
            seite.locator(".v73-export[data-v73='export']").click()
            seite.wait_for_selector("#v59-ov h2", timeout=8000)
            seite.wait_for_timeout(250)

        for sport in ("rad", "lauf"):
            e = fund[sport]
            tag = heute_real + dt.timedelta(days=e["i"])          # dieser Tag ist im Test «heute», um 14:00
            ctx, seite = neue_seite(390, 844, uhr(tag, 14))
            eh = {"ds": tag.isoformat(), "uid": e["uid"], "titel": e["titel"]}
            export_oeffnen(seite, eh)
            ov = seite.locator("#v59-ov")
            if sport == "rad":
                pruefe(f"{sport}: Wahl Garmin | Zwift, Garmin ist vorgewählt (Garmin geht heute)", ov.locator("[data-v73z]").count() == 2 and seite.locator("#v59-ov [data-v73pan='garmin']").is_visible())
            else:
                pruefe(f"{sport}: Lauf heisst «An Garmin senden» ohne Wahl", ov.locator("h2").first.inner_text().strip() == "An Garmin senden" and ov.locator("[data-v73z]").count() == 0)
            pruefe(f"{sport}: Knopf «Heute senden» ist da", ov.locator("[data-v73gs]").count() == 1 and "Heute senden" in ov.locator("[data-v73gs]").inner_text(), ov.inner_text()[:200])
            pruefe(f"{sport}: keine Wahl «Nacht-Update / Vortag» für heute", ov.locator("input[name=v73g]").count() == 0)
            pruefe(f"{sport}: Hinweis nennt die Updates (13, 15, 17, 19, 21 oder 23 Uhr)", "um 13, 15, 17, 19, 21 oder 23 Uhr" in ov.inner_text(), ov.inner_text()[:300])
            pruefe(f"{sport}: kein «nur noch im Chat» vor 22:30", "nur noch im Chat" not in ov.inner_text())
            seite.screenshot(path=str(BILDER / f"{sport}-1-heute-senden.png"))
            ov.locator("[data-v73gs]").click()
            seite.wait_for_function("(window.V5UI.Inbox && window.V5UI.Inbox.data && (window.V5UI.Inbox.data.garmin_senden || []).length) > 0", timeout=8000)
            auf = seite.evaluate(INBOX)
            a = auf[-1] if auf else {}
            pruefe(f"{sport}: Auftrag «gs-<heute>» mit Modus «heute» auf dem Gerät", a.get("id") == "gs-" + tag.isoformat() and a.get("modus") == "heute" and a.get("date") == tag.isoformat()
                   and any(u.get("uid") == e["uid"] for u in a.get("einheiten", [])), str(a)[:200])
            seite.wait_for_timeout(400)
            export_oeffnen(seite, eh)
            ov = seite.locator("#v59-ov")
            pruefe(f"{sport}: danach steht «Wird gesendet: mit dem nächsten Update …»", "Wird gesendet: mit dem nächsten Update" in ov.locator(".v73-stand").first.inner_text(), ov.inner_text()[:300])
            pruefe(f"{sport}: «Nicht senden» ist da", ov.locator("[data-v73gweg]").count() == 1)
            seite.screenshot(path=str(BILDER / f"{sport}-2-wartet.png"))
            ov.locator("[data-v73gweg]").click()
            seite.wait_for_timeout(500)
            auf = seite.evaluate(INBOX)
            a = auf[-1] if auf else {}
            pruefe(f"{sport}: «Nicht senden» legt einen Auftrag «heute» ohne die Einheit an", a.get("modus") == "heute" and not any(u.get("uid") == e["uid"] for u in a.get("einheiten", [])), str(a)[:200])
            ctx.close()

            # 23:00 – zu spät für heute
            ctx, seite = neue_seite(390, 844, uhr(tag, 23, 0))
            export_oeffnen(seite, eh)
            ov = seite.locator("#v59-ov")
            if sport == "rad":
                ov.locator("[data-v73z='garmin']").click()
            pruefe(f"{sport}: um 23:00 kein Knopf mehr, nur der Hinweis auf den Chat", ov.locator("[data-v73gs]").count() == 0 and "jetzt nur noch im Chat" in ov.inner_text(), ov.inner_text()[:300])
            seite.screenshot(path=str(BILDER / f"{sport}-3-zu-spaet.png"))
            ctx.close()

        # Einheit von morgen: unverändert «Senden» mit der Wahl
        if fund["rad"]["i"] <= 12:
            tag0 = heute_real + dt.timedelta(days=fund["rad"]["i"])
            ctx, seite = neue_seite(390, 844, uhr(tag0 - dt.timedelta(days=1), 14))
            eh = {"ds": tag0.isoformat(), "uid": fund["rad"]["uid"], "titel": fund["rad"]["titel"]}
            export_oeffnen(seite, eh)
            ov = seite.locator("#v59-ov")
            ov.locator("[data-v73z='garmin']").click()
            pruefe("morgen: weiter «Senden» mit der Wahl Nacht-Update / Vortag", ov.locator("input[name=v73g]").count() == 2 and "Heute senden" not in ov.inner_text(), ov.inner_text()[:300])
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
