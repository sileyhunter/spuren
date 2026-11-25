"""Durchklick-Test «Zwift-Export» (V9.24.1 und V9.24.3, zwift-export-2.0/2.1): Chrome headless gegen demo.html, Intervals.icu wird abgefangen.

Aufruf im Repository: python3 -I tools/durchklick_zwift.py [Ordner für Bilder]
Gerüst (Server, Karten-Attrappe) wie tools/durchklick_zonen.py. Geprüft wird: Einheit-Seite einer Rad-Einheit öffnen → «Export» → oben nur die Wahl Garmin | Zwift, darunter nur das Gewählte (Wahl bleibt gemerkt);
ohne Einrichtung steht im Zwift-Teil nur das offene Einrichten; Schlüssel und FTP speichern (nur im Gerät); Senden schickt eine Anfrage an
intervals.icu mit genau einem Eintrag (Kategorie WORKOUT, Ride, indoor, fester external_id, Workout-Text in Prozent) und danach steht «Gesendet» in der Zeile;
ein zweites Senden ersetzt statt zu verdoppeln (gleicher external_id); lehnt Intervals.icu das Feld «indoor» ab (400), geht es ohne und die Seite sagt es;
401 meldet den Schlüssel; ohne Netz bleibt «Text kopieren» als Ersatz; eine Lauf-Einheit hat im Export-Blatt keinen Zwift-Abschnitt; nichts läuft seitlich über;
keine Konsolenfehler (ausser fehlenden Fremddiensten). Erfundene Daten der Demo und ein erfundener Schlüssel, nichts Echtes. Fehler: Exit-Code 1 und Liste der Schritte."""
import importlib.util
import json
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_zwift")
BILDER.mkdir(parents=True, exist_ok=True)

_spec = importlib.util.spec_from_file_location("durchklick_karte", ROOT / "tools" / "durchklick_karte.py")
_dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dk)
ATTRAPPE, Still, PNG = _dk.ATTRAPPE, _dk.Still, _dk.PNG

CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS"}
KEY = "TESTSCHLUESSEL0123456789"          # erfunden

FINDE = """() => {
  const C = window.V5UI.C, V64 = window.V64, P = window.V64UI, heute = C.iso(C.today), out = { rad: null, lauf: null };
  for (let i = 1; i <= 13; i++) {
    const ds = V64.addDays(heute, i), K = P.kontextFuer(V64.montag(ds)), t = K && K.w.tage.find((x) => x.date === ds);
    if (!t || t.rennen) continue;
    for (const e of t.einheiten) {
      if (!out.rad && e.sport === 'rad' && e.art !== 'bibliothek' && e.quelle !== 'bibliothek' && !window.V66.garminGrund(e)) out.rad = { ds, uid: e.uid, titel: e.titel };
      if (!out.lauf && e.sport === 'lauf' && e.quelle !== 'bibliothek' && !window.V66.garminGrund(e)) out.lauf = { ds, uid: e.uid, titel: e.titel };
    }
  }
  return out;
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
        for name, w, h in (("handy", 390, 844), ("desktop", 1280, 800)):
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme="dark", service_workers="block")
            ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=f"http://127.0.0.1:{port}")
            seite = ctx.new_page()
            seite.on("console", lambda m, n=name: konsole.append(f"[{n}] {m.text}") if m.type == "error" and "ERR_FAILED" not in m.text and "Failed to load resource" not in m.text else None)
            seite.on("pageerror", lambda e, n=name: konsole.append(f"[{n}] Seitenfehler: {e}"))
            anfragen, modus = [], {"m": "ok"}

            def fremd(route):
                u, req = route.request.url, route.request
                if u.endswith("maplibre-gl.js"):
                    route.fulfill(status=200, content_type="application/javascript", body=ATTRAPPE)
                elif u.endswith("maplibre-gl.css"):
                    route.fulfill(status=200, content_type="text/css", body="")
                elif "wmts.geo.admin.ch" in u:
                    route.fulfill(status=200, content_type="image/png", body=PNG)
                elif "intervals.icu/api/v1/athlete/" in u:
                    if req.method == "OPTIONS":
                        return route.fulfill(status=204, headers=CORS)
                    body = json.loads(req.post_data or "[]")
                    anfragen.append({"url": u, "auth": req.headers.get("authorization", ""), "body": body})
                    m = modus["m"]
                    if m == "netz":
                        return route.abort()
                    if m == "401":
                        return route.fulfill(status=401, headers=CORS, content_type="application/json", body="{}")
                    if m == "indoor400" and any("indoor" in x for x in body):
                        return route.fulfill(status=400, headers=CORS, content_type="application/json", body='{"error":"unknown field indoor"}')
                    route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps([{"id": 1, "external_id": x.get("external_id")} for x in body]))
                else:
                    route.abort()

            seite.route(lambda u: not u.startswith(f"http://127.0.0.1:{port}"), fremd)
            seite.goto(f"http://127.0.0.1:{port}/demo.html")
            seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
            seite.wait_for_timeout(600)
            fund = seite.evaluate(FINDE)
            pruefe(f"{name}: Rad-Einheit in den nächsten 13 Tagen der Demo", bool(fund["rad"]), str(fund))
            if not fund["rad"]:
                continue
            rad = fund["rad"]

            def export_oeffnen(e):
                seite.evaluate("([ds, uid]) => window.V66UI.einheit(ds, uid)", [e["ds"], e["uid"]])
                seite.wait_for_selector(".v73-export[data-v73='export']", timeout=8000)
                seite.locator(".v73-export[data-v73='export']").click()
                seite.wait_for_selector("#v59-ov .v73-export, #v59-ov [data-zwabschnitt], #v59-ov h2", timeout=8000)
                seite.wait_for_timeout(250)

            def status():
                p = seite.locator("#v59-ov [data-zwstatus]")
                return p.inner_text() if p.count() and p.is_visible() else ""

            export_oeffnen(rad)
            ov = seite.locator("#v59-ov")
            pruefe(f"{name}: Export-Blatt heisst «Export» und bietet oben nur Garmin | Zwift an", ov.locator("h2").first.inner_text().strip() == "Export" and ov.locator("[data-v73z]").count() == 2 and ov.locator("[data-zwabschnitt]").count() == 1, ov.inner_text()[:120])
            pruefe(f"{name}: genau ein Teil ist sichtbar", seite.locator("#v59-ov [data-v73pan]:not([hidden])").count() == 1)
            ov.locator("[data-v73z='garmin']").click()
            pruefe(f"{name}: Wahl Garmin zeigt Garmin und blendet Zwift aus", seite.locator("#v59-ov [data-v73pan='garmin']").is_visible() and not seite.locator("#v59-ov [data-v73pan='zwift']").is_visible())
            ov.locator("[data-v73z='zwift']").click()
            pruefe(f"{name}: Wahl Zwift zeigt Zwift und blendet Garmin aus", seite.locator("#v59-ov [data-v73pan='zwift']").is_visible() and not seite.locator("#v59-ov [data-v73pan='garmin']").is_visible())
            pruefe(f"{name}: ohne Einrichtung kein «An Zwift senden»-Knopf, nur das Einrichten (offen)", ov.locator("[data-zwsend]").count() == 0 and ov.locator("details.mp-zw").get_attribute("open") is not None and "Einmal einrichten" in ov.locator("[data-zwabschnitt]").inner_text())
            seite.screenshot(path=str(BILDER / f"{name}-1-export-ungesetzt.png"))

            # FTP ohne Schlüssel → Meldung, nichts gespeichert
            ov.locator("[data-zwftp]").fill("250")
            ov.locator("[data-zwsave]").click()
            pruefe(f"{name}: ohne Schlüssel wird nichts gespeichert", "Schlüssel" in status() and seite.evaluate("localStorage.getItem('in-zwift')") is None, status())
            ov.locator("[data-zwkey]").fill(KEY)
            ov.locator("[data-zwsave]").click()
            seite.wait_for_timeout(150)
            pruefe(f"{name}: gespeichert, Knopf frei", status() == "Gespeichert." and not seite.locator("#v59-ov [data-zwsend]").is_disabled(), status())
            gesp = seite.evaluate("JSON.parse(localStorage.getItem('in-zwift') || '{}')")
            pruefe(f"{name}: Schlüssel und FTP nur im Gerät", gesp.get("key") == KEY and gesp.get("ftp") == 250, str(gesp))
            pruefe(f"{name}: Einrichten klappt zu", seite.locator("#v59-ov details.mp-zw").get_attribute("open") is None)

            # Senden
            seite.locator("#v59-ov [data-zwsend]").click()
            seite.wait_for_function("document.querySelector('#v59-ov [data-zwstatus]') && /Gesendet/.test(document.querySelector('#v59-ov [data-zwstatus]').textContent)", timeout=8000)
            pruefe(f"{name}: eine Anfrage an Intervals.icu", len(anfragen) == 1, str(len(anfragen)))
            a = anfragen[0]
            x = a["body"][0] if a["body"] else {}
            pruefe(f"{name}: URL mit upsert und Athlet 0", a["url"].endswith("/athlete/0/events/bulk?upsert=true"), a["url"])
            pruefe(f"{name}: Anmeldung mit API_KEY", a["auth"].startswith("Basic "), a["auth"][:12])
            pruefe(f"{name}: genau ein Eintrag, nur diese Einheit", len(a["body"]) == 1, str(len(a["body"])))
            pruefe(f"{name}: Eintrag: WORKOUT, Ride, indoor, Tag, external_id", x.get("category") == "WORKOUT" and x.get("type") == "Ride" and x.get("indoor") is True
                   and x.get("start_date_local") == rad["ds"] + "T00:00:00" and str(x.get("external_id", "")).startswith("in-"), json.dumps({k: v for k, v in x.items() if k != "description"}))
            pruefe(f"{name}: Workout-Text in Prozent der FTP, Warmup und Cooldown", "Warmup" in x.get("description", "") and "%" in x.get("description", "") and "Cooldown" in x.get("description", ""), x.get("description", "")[:80])
            pruefe(f"{name}: Zeile zeigt «Gesendet»", "Gesendet" in seite.locator("#v59-ov [data-zwz]").first.inner_text(), seite.locator("#v59-ov [data-zwz]").first.inner_text())
            pruefe(f"{name}: Knopf heisst jetzt «Nochmals an Zwift senden»", "Nochmals" in seite.locator("#v59-ov [data-zwsend]").inner_text())
            pruefe(f"{name}: Erinnerung im Gerät", seite.evaluate("Object.keys(JSON.parse(localStorage.getItem('in-zwift-gesendet') || '{}')).length") == 1)
            seite.screenshot(path=str(BILDER / f"{name}-2-export-gesendet.png"))
            pruefe(f"{name}: Blatt läuft nicht seitlich über", seite.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))

            # Blatt zu, neu öffnen: Stand bleibt
            seite.keyboard.press("Escape")
            seite.wait_for_timeout(300)
            export_oeffnen(rad)
            pruefe(f"{name}: die Wahl Zwift bleibt beim Neuöffnen", seite.locator("#v59-ov [data-v73z='zwift']").get_attribute("aria-pressed") == "true" and seite.locator("#v59-ov [data-v73pan='zwift']").is_visible())
            pruefe(f"{name}: nach dem Neuöffnen steht noch «Gesendet»", "Gesendet" in seite.locator("#v59-ov [data-zwz]").first.inner_text())

            # zweites Senden: gleicher external_id (ersetzt statt doppelt)
            seite.locator("#v59-ov [data-zwsend]").click()
            seite.wait_for_timeout(500)
            pruefe(f"{name}: zweites Senden = gleicher external_id", len(anfragen) == 2 and anfragen[1]["body"][0]["external_id"] == x["external_id"], str(len(anfragen)))

            # Intervals.icu lehnt «indoor» ab → ohne Feld, mit Hinweis
            modus["m"] = "indoor400"
            seite.locator("#v59-ov [data-zwsend]").click()
            seite.wait_for_function("/Ohne Indoor/.test(document.querySelector('#v59-ov [data-zwstatus]').textContent)", timeout=8000)
            pruefe(f"{name}: bei 400 zweiter Versuch ohne «indoor»", len(anfragen) == 4 and "indoor" in anfragen[2]["body"][0] and "indoor" not in anfragen[3]["body"][0], str(len(anfragen)))

            # 401
            modus["m"] = "401"
            seite.locator("#v59-ov [data-zwsend]").click()
            seite.wait_for_function("/lehnt den Schl/.test(document.querySelector('#v59-ov [data-zwstatus]').textContent)", timeout=8000)
            pruefe(f"{name}: 401 sagt «Schlüssel»", "lehnt den Schlüssel ab" in status(), status())

            # Netz weg: Fehlertext und «Text kopieren» geht
            modus["m"] = "netz"
            seite.locator("#v59-ov [data-zwsend]").click()
            seite.wait_for_function("/kommt nicht an Intervals/.test(document.querySelector('#v59-ov [data-zwstatus]').textContent)", timeout=8000)
            pruefe(f"{name}: ohne Netz Hinweis auf «Text kopieren»", "Text kopieren" in status(), status())
            seite.locator("#v59-ov [data-zwcopy]").click()
            seite.wait_for_function("/Text kopiert|Kopieren nicht/.test(document.querySelector('#v59-ov [data-zwstatus]').textContent)", timeout=5000)
            pruefe(f"{name}: Text kopieren meldet sich", "Text kopiert" in status() or "Kopieren nicht möglich" in status(), status())
            try:
                zwischen = seite.evaluate("navigator.clipboard.readText()")
                pruefe(f"{name}: Zwischenablage hat den Workout-Text", "Warmup" in zwischen and "%" in zwischen, zwischen[:60])
            except Exception:
                pass

            # Lauf-Einheit: kein Zwift
            seite.keyboard.press("Escape")
            seite.wait_for_timeout(300)
            if fund["lauf"]:
                export_oeffnen(fund["lauf"])
                pruefe(f"{name}: Lauf hat keine Wahl und keinen Zwift-Abschnitt und heisst weiter «An Garmin senden»", seite.locator("#v59-ov [data-zwabschnitt]").count() == 0 and seite.locator("#v59-ov [data-v73z]").count() == 0 and "An Garmin senden" in seite.locator("#v59-ov h2").first.inner_text())
                seite.keyboard.press("Escape")
                seite.wait_for_timeout(300)

            seite.close()
            ctx.close()
        br.close()
    srv.shutdown()
    ignoriert = ("Unexpected", "net::", "Failed to fetch")   # «Failed to fetch» kommt vom absichtlichen Netz-weg-Schritt
    echte = [k for k in konsole if not any(i in k for i in ignoriert)]
    pruefe("keine Konsolenfehler", not echte, "; ".join(echte[:5]))
    print(f"{len(schritte)} Schritte, {len(fehler)} Fehler")
    for f in fehler:
        print("FEHLER:", f)
    sys.exit(1 if fehler else 0)


main()
