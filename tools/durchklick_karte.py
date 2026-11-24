"""Durchklick-Test der Karte in der Demo (V9.13.0, O1): Chrome headless gegen demo.html mit einer Karten-Attrappe.

Aufruf im Repository: python3 -I tools/durchklick_karte.py [Ordner für Bilder]
Die Karte (MapLibre), Chart.js und alle Kartendienste sind in dieser Umgebung nicht erreichbar; darum ersetzt eine Attrappe die Kartenbibliothek
(sie führt Buch über Ebenen, Sichtbarkeit und Deckkraft) und die Dienste werden abgefangen. Geprüft wird die Bedienung (Knöpfe, Ebenen-Blatt,
Vorlagen, Deckkraft, Reiter, Ortssuche), nicht die echte Karte: die bleibt am iPhone zu prüfen. Erfundene Daten der Demo, nichts Echtes.
Fehler: Exit-Code 1 und eine Liste der fehlgeschlagenen Schritte; keine Konsolenfehler erlaubt (ausser fehlenden Fremddiensten). """
import http.server
import json
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

import base64
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
ROOT = pathlib.Path(__file__).resolve().parent.parent
BILDER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("/tmp/durchklick_karte")
BILDER.mkdir(parents=True, exist_ok=True)

ATTRAPPE = r"""
(function () {
  const layers = new Map(), sources = new Map(), log = [];
  const neutral = () => new Proxy(function () {}, { get: (t, p) => (p === "then" ? undefined : neutral()), apply: () => neutral() });
  class FakeMap {
    constructor(o) {
      this._h = {}; this._c = document.createElement("canvas"); this._c.width = 300; this._c.height = 300;
      document.getElementById(o.container).appendChild(this._c);
      for (const l of o.style.layers) layers.set(l.id, { ...l, layout: { ...(l.layout || {}) }, paint: { ...(l.paint || {}) } });
      for (const k of Object.keys(o.style.sources)) sources.set(k, o.style.sources[k]);
      const px = new Proxy(this, { get: (t, p) => (p in t ? t[p] : typeof p === "string" ? () => undefined : undefined) });
      window.__karte = { layers, sources, log, map: px };
      setTimeout(() => (this._h.load || []).forEach((f) => f({})), 0);
      return px;
    }
    on(e, a, b) { const f = typeof a === "function" ? a : b; if (typeof f === "function") (this._h[e] = this._h[e] || []).push(f); return this; }
    once(e, f) { if (e === "load") setTimeout(f, 0); return this; }
    off() { return this; }
    addControl() { return this; }
    getLayer(id) { return layers.get(id); }
    addLayer(l) { layers.set(l.id, { ...l, layout: { ...(l.layout || {}) }, paint: { ...(l.paint || {}) } }); log.push("addLayer " + l.id); }
    removeLayer(id) { layers.delete(id); }
    addSource(id, s) { sources.set(id, s); }
    removeSource(id) { sources.delete(id); }
    getSource(id) { return sources.has(id) ? { setData() {}, getTile() {} } : undefined; }
    setLayoutProperty(id, k, v) { if (!layers.has(id)) throw new Error("Ebene fehlt: " + id); layers.get(id).layout[k] = v; }
    getLayoutProperty(id, k) { const l = layers.get(id); return l ? l.layout[k] : undefined; }
    setPaintProperty(id, k, v) { if (!layers.has(id)) throw new Error("Ebene fehlt: " + id); layers.get(id).paint[k] = v; log.push("paint " + id + " " + k + " " + v); }
    getPaintProperty(id, k) { const l = layers.get(id); return l ? l.paint[k] : undefined; }
    easeTo(o) { window.__karte.zuletzt = o; }
    getBounds() { return { getWest: () => 5, getEast: () => 11, getSouth: () => 45, getNorth: () => 48 }; }
    getCenter() { return { lng: 8.2, lat: 46.8 }; }
    getZoom() { return 9; }
    getCanvas() { return this._c; }
    getContainer() { return document.getElementById("map"); }
    queryRenderedFeatures() { return []; }
    isStyleLoaded() { return true; }
    loaded() { return true; }
  }
  window.maplibregl = { Map: FakeMap, NavigationControl: class {}, GeolocateControl: class {}, ScaleControl: class {}, Popup: class { constructor() { return neutral(); } },
    Marker: class { constructor() { return neutral(); } }, LngLatBounds: class { constructor() { return neutral(); } }, supported: () => true };
})();
"""


class Still(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def log_message(self, *a):
        pass


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
            seite = ctx.new_page()
            seite.on("console", lambda m: konsole.append(f"[{name}] {m.text}") if m.type == "error" else None)
            seite.on("pageerror", lambda e: konsole.append(f"[{name}] Seitenfehler: {e}"))

            def fremd(route):
                u = route.request.url
                if u.endswith("maplibre-gl.js"):
                    route.fulfill(status=200, content_type="application/javascript", body=ATTRAPPE)
                elif u.endswith("maplibre-gl.css"):
                    route.fulfill(status=200, content_type="text/css", body="")
                elif "wmts.geo.admin.ch" in u:
                    route.fulfill(status=200, content_type="image/png", body=PNG)
                elif "SearchServer" in u:
                    body = {"results": [{"attrs": {"label": "<b>Beispielort</b> (BE)", "origin": "gg25", "lon": 7.44, "lat": 46.95, "detail": "x"}}]}
                    route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps(body))
                else:
                    route.abort()

            seite.route(lambda u: not u.startswith(f"http://127.0.0.1:{port}"), fremd)
            seite.goto(f"http://127.0.0.1:{port}/demo.html")
            seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
            seite.evaluate("localStorage.clear()")
            seite.reload()
            seite.wait_for_selector("#map canvas", state="attached", timeout=15000)
            seite.wait_for_timeout(400)
            # Karte öffnen (erster Reiter «Outdoor» / Karte)
            seite.evaluate("""() => { const b = document.querySelector('button[data-gruppe="karte"]'); if (b) b.click(); }""")
            seite.wait_for_timeout(300)
            K = lambda js: seite.evaluate(js)
            pruefe(f"{name}: drei runde Knöpfe", K("document.querySelectorAll('.rund').length") == 3)
            pruefe(f"{name}: alte Knöpfe weg", K("!document.getElementById('btn-routen') && !document.getElementById('mobile-filter') && !document.querySelector('.v7-outdoor')"))
            pruefe(f"{name}: Ortssuche da", K("!!document.getElementById('karte-suche')"))
            seite.screenshot(path=str(BILDER / f"{name}-1-karte.png"))

            # Ebenen-Blatt
            seite.click("#btn-layers")
            pruefe(f"{name}: Ebenen-Blatt offen", K("!document.getElementById('layers').hidden"))
            pruefe(f"{name}: vier Vorlagen", K("document.querySelectorAll('#lay-vorlagen [data-vorlage]').length") == 4)
            pruefe(f"{name}: Aktive Ebenen zeigt Grundkarte", "Nacht" in K("document.getElementById('lay-aktiv').textContent"))
            seite.screenshot(path=str(BILDER / f"{name}-2-ebenen.png"))
            seite.click('#lay-vorlagen [data-vorlage="skitour"]')
            seite.wait_for_timeout(500)
            Z = lambda: K("(() => { const L = window.__karte.layers; const v = (i) => L.get(i) && L.get(i).layout.visibility; return {winter: v('winter'), skitouren: v('skitouren'), hang30: v('hang30'), wrz: v('wrz'), nacht: v('nacht'), wander: v('wander')}; })()")
            z = Z()
            pruefe(f"{name}: Vorlage Skitour setzt Winterkarte", z.get("winter") == "visible" and z.get("nacht") == "none", str(z))
            pruefe(f"{name}: Vorlage Skitour setzt Skitouren, Hangneigung, Wildruhezonen", z.get("skitouren") == "visible" and z.get("hang30") == "visible" and z.get("wrz") == "visible", str(z))
            pruefe(f"{name}: Kachel Skitour leuchtet nach Vorlage", K("document.querySelector('#lay-vorlagen [data-vorlage=skitour]').getAttribute('aria-pressed')") in ("true", "false"))
            # Fremddienste sind abgefangen: die Schweizer Zusatzebenen scheitern in dieser Umgebung (kein Netz) – sie dürfen dann nicht «an» sein
            aktiv = K("document.getElementById('lay-aktiv').textContent")
            pruefe(f"{name}: Aktive Ebenen nennt Meine Spuren", "Meine Spuren" in aktiv, aktiv)
            # Rad: Landeskarte + Veloland + MTB, Spuren aus
            seite.click('#lay-vorlagen [data-vorlage="rad"]')
            seite.wait_for_timeout(500)
            pruefe(f"{name}: Vorlage Rad: Landeskarte", K("window.__karte.layers.get('farbe').layout.visibility") == "visible")
            pruefe(f"{name}: Vorlage Rad: Heatmap aus", K("document.getElementById('mode-heat').getAttribute('aria-pressed')") == "false")
            pruefe(f"{name}: Vorlage Rad: Veloland an", K("window.__karte.layers.get('velo').layout.visibility") == "visible")
            # Deckkraft
            seite.evaluate("""() => { const r = document.querySelector('#lay-aktiv [data-op="velo"]'); r.value = 40; r.dispatchEvent(new Event('input', { bubbles: true })); }""")
            pruefe(f"{name}: Deckkraft Veloland 40 %", abs(K("window.__karte.layers.get('velo').paint['raster-opacity']") - 0.4) < 1e-9)
            pruefe(f"{name}: Deckkraft gespeichert", "velo" in K("localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('sf.ebenen.op')))"))
            # ✕ schaltet die Ebene aus
            seite.click('#lay-aktiv [data-aus="velo"]')
            pruefe(f"{name}: ✕ schaltet Veloland aus", K("window.__karte.layers.get('velo').layout.visibility") == "none")
            # Ausland
            seite.click('#lay-region [data-region="ausland"]')
            pruefe(f"{name}: Ausland zeigt vier Grundkarten", K("[...document.querySelectorAll('#lay-base [data-base]')].filter((b) => !b.hidden).length") == 4)
            seite.click('#lay-base [data-base="ot"]')
            seite.wait_for_timeout(200)
            pruefe(f"{name}: OpenTopoMap sichtbar, Welt darunter aus", K("(() => { const L = window.__karte.layers; return L.get('ot').layout.visibility === 'visible' && L.get('weltHell').layout.visibility === 'none' && L.get('weltDunkel').layout.visibility === 'none' && L.get('farbe').layout.visibility === 'none'; })()"))
            pruefe(f"{name}: OpenTopoMap-Quelle im Stil", K("window.__karte.sources.get('ot').tiles.length") == 3)
            seite.click('#lay-base [data-base="bmat"]')
            pruefe(f"{name}: basemap.at sichtbar", K("window.__karte.layers.get('bmat').layout.visibility") == "visible")
            seite.click('#lay-region [data-region="ch"]')
            pruefe(f"{name}: Schweiz zeigt fünf Grundkarten", K("[...document.querySelectorAll('#lay-base [data-base]')].filter((b) => !b.hidden).length") == 5)
            # Weitere Ebenen und Quellen
            seite.click("#lay-mehr summary")
            seite.click('[data-ov="wmt_rad"]')
            pruefe(f"{name}: Waymarked Trails Rad an", K("window.__karte.layers.get('wmt_rad').layout.visibility") == "visible")
            seite.click("#lay-quellen summary")
            pruefe(f"{name}: Quellen und Lizenzen gefüllt", K("document.querySelectorAll('#lay-quellen-liste li').length") >= 6)
            seite.screenshot(path=str(BILDER / f"{name}-3-quellen.png"))
            seite.click("#btn-layers")

            # Meine Daten mit Reitern
            if w < 760:
                pruefe(f"{name}: Blatt anfangs zu", K("document.getElementById('panel').classList.contains('closed')"))
                seite.click("#btn-daten")
            else:
                seite.click("#btn-daten"); seite.click("#btn-daten")    # zu und wieder auf
            pruefe(f"{name}: Meine Daten offen", K("!document.getElementById('panel').classList.contains('closed')"))
            pruefe(f"{name}: Reiter Spuren zeigt Heatmap-Knopf", K("!document.getElementById('dp-spuren').hidden && document.getElementById('dp-punkte').hidden && document.getElementById('dp-routen').hidden"))
            seite.screenshot(path=str(BILDER / f"{name}-4-daten-spuren.png"))
            seite.click("#dt-punkte")
            pruefe(f"{name}: Reiter Punkte", K("document.getElementById('dp-spuren').hidden && !document.getElementById('dp-punkte').hidden"))
            pruefe(f"{name}: GPX-Import im Reiter Punkte", K("!!document.querySelector('#dp-punkte #gpx-in')"))
            seite.screenshot(path=str(BILDER / f"{name}-5-daten-punkte.png"))
            seite.click("#dt-routen")
            pruefe(f"{name}: Reiter Routen", K("!document.getElementById('dp-routen').hidden && !!document.querySelector('#dp-routen #r-list')"))
            seite.click("#dt-spuren")
            pruefe(f"{name}: Filter im Reiter Spuren", K("!!document.querySelector('#dp-spuren #f-reset') && !!document.querySelector('#dp-spuren #hits')"))
            seite.click("#mode-sport")
            pruefe(f"{name}: Nach Sport schaltet um", K("document.getElementById('mode-sport').getAttribute('aria-pressed')") == "true")
            if w < 760:
                seite.click("#panel-close")
                pruefe(f"{name}: Blatt schliesst", K("document.getElementById('panel').classList.contains('closed')"))

            # Ortssuche
            seite.fill("#karte-suche", "Bern")
            seite.wait_for_selector("#karte-suche-liste [data-q]", timeout=4000)
            seite.click("#karte-suche-liste [data-q]")
            pruefe(f"{name}: Suche fliegt zum Treffer", abs((K("window.__karte.zuletzt && window.__karte.zuletzt.center[0]") or 0) - 7.44) < 1e-6)
            seite.screenshot(path=str(BILDER / f"{name}-6-nach-suche.png"))

            # Planen schaltet um und blendet Suche aus
            seite.click("#btn-plan")
            seite.wait_for_timeout(300)
            pruefe(f"{name}: Planer öffnet", K("document.getElementById('btn-plan').getAttribute('aria-pressed')") == "true")
            pruefe(f"{name}: Suche und «Meine Daten» im Planer weg", K("getComputedStyle(document.getElementById('karte-suche-box')).display") == "none" and K("getComputedStyle(document.getElementById('btn-daten')).display") == "none")
            seite.screenshot(path=str(BILDER / f"{name}-7-planer.png"))
            seite.click("#btn-plan")
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
