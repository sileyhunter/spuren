"""strecken-senden-1.0 (V9.14.0, Routen 7.2, gpx-export-2.0; Silas 24.11.2026): Strecken aus dem Routenplaner nach Garmin Connect legen.

Die Seite legt nur einen Auftrag an (Eingabe strecke_senden → merge_daily.py → strecken_auftraege), mit der GPX-Datei, dem Streckentyp und dem
ausdrücklichen Ja (`ja_am`, Knopf «Ja, senden»). Dieses Werkzeug prüft, schreibt die GPX-Dateien und trägt Ergebnisse ein; die Aufrufe an Garmin
macht das Tag-/Nacht-Update oder der Chat (upload_course, danach get_courses zum Zurücklesen). Regeln:
- Nur nach Garmin Connect hochladen, nie aufs Gerät schicken (das tippt Silas in Garmin Connect selbst: «An Gerät senden»).
- Nur mit Ja je Strecke; nie über «Alle Tage senden», nie ohne Auftrag.
- Nie löschen: eine geänderte Strecke kommt als neue Fassung dazu, die ältere (`ersetzt_garmin_id`) bleibt in Garmin Connect, bis Silas sie
  selbst oder im Chat (delete_course: erst Vorschau, dann mit confirm) entfernt.
- Gleiche Fassung (Prüfsumme) wird nie zweimal hochgeladen. Ein fehlgeschlagener Auftrag wird nicht von selbst wiederholt (kein Doppel).

  python3 -I tools/strecken_senden.py plan work/data.json work/strecken [--jetzt 2026-11-24T23:05] > work/strecken_plan.json
      → schreibt je offenem Auftrag work/strecken/<id>.gpx und gibt die Aktionen aus (Name, Typ, Beschreibung, Pfad)
  (Claude: je Aktion upload_course(gpx_path, course_name, activity_type, description), dann get_courses → work/strecken_ergebnis.json)
  python3 -I tools/strecken_senden.py eintragen work/data.json work/strecken_plan.json work/strecken_ergebnis.json
      → Status gesendet/fehler, Garmin-ID, Audit; die GPX-Datei im Auftrag fällt weg. Danach work/strecken/ löschen.
Ergebnis je Aktion: {"nr": 1, "ok": true, "course_id": 123, "name": "…", "distanz_m": 85200, "typ": "road_biking"} bzw. {"nr": 1, "ok": false, "fehler": "…"}.
"""
import datetime as dt
import hashlib
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
import zoneinfo

V = "strecken-senden-1.0"
FORMAT = "strecke-senden-1.0"
TZ = zoneinfo.ZoneInfo("Europe/Zurich")
TYPEN = ("road_biking", "gravel_cycling", "mountain_biking", "cycling", "running", "trail_running", "hiking", "walking")
SPORTARTEN = ("rennrad", "gravel", "mtb", "laufen", "trail", "wandern", "skitour")
MAX_NAME = 128
MAX_BESCHR = 512
MAX_BYTES = 2 * 1024 * 1024
MIN_PUNKTE = 2
MAX_PUNKTE = 25000
HOEHEN_MIN = 0.9
FELDER = {"id", "v", "route_id", "name", "sport", "typ", "beschreibung", "km", "hm", "punkte", "pruefsumme", "bytes", "gpx", "erstellt", "ja_am"}
GPX_NS = "{http://www.topografix.com/GPX/1/1}"


def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _zeit(s):
    try:
        t = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return t if t.tzinfo else t.replace(tzinfo=TZ)
    except ValueError:
        return None


def _hav(a, b):
    r = 6371000.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dl, dn = p2 - p1, math.radians(b[1] - a[1])
    x = math.sin(dl / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dn / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(x)))


def gpx_pruefen(text):
    """GPX-Text → (Fehlertext oder None, {punkte, km, hoehen}). Wie SG.pruefenGpx auf der Seite, hier mit einem echten XML-Parser."""
    info = {"punkte": 0, "km": 0.0, "hoehen": 0.0}
    if not isinstance(text, str) or not text.strip():
        return "GPX leer", info
    if len(text) > MAX_BYTES:
        return "GPX zu gross", info
    if re.search(r"<!DOCTYPE|<!ENTITY", text, re.I):
        return "GPX mit DOCTYPE oder ENTITY", info
    try:
        wurzel = ET.fromstring(text.encode("utf-8"))
    except ET.ParseError as e:
        return f"GPX nicht lesbar ({e})", info
    if wurzel.tag != GPX_NS + "gpx":
        return "keine GPX-Datei (Wurzel ≠ gpx 1.1)", info
    meta = wurzel.find(GPX_NS + "metadata/" + GPX_NS + "name")
    if meta is None or not (meta.text or "").strip():
        return "GPX ohne Namen", info
    punkte = wurzel.findall(f"{GPX_NS}trk/{GPX_NS}trkseg/{GPX_NS}trkpt")
    if len(punkte) < MIN_PUNKTE:
        return "GPX ohne Track mit mindestens zwei Punkten", info
    if len(punkte) > MAX_PUNKTE:
        return f"GPX mit zu vielen Punkten (über {MAX_PUNKTE})", info
    vor, mit_hoehe = None, 0
    for p in punkte:
        try:
            lat, lon = float(p.get("lat")), float(p.get("lon"))
        except (TypeError, ValueError):
            return "GPX mit ungültiger Koordinate", info
        if not (math.isfinite(lat) and math.isfinite(lon) and abs(lat) <= 90 and abs(lon) <= 180):
            return "GPX mit ungültiger Koordinate", info
        e = p.find(GPX_NS + "ele")
        try:
            if e is not None and math.isfinite(float(e.text)):
                mit_hoehe += 1
        except (TypeError, ValueError):
            pass
        if vor:
            info["km"] += _hav(vor, (lat, lon)) / 1000
        vor = (lat, lon)
    info.update(punkte=len(punkte), km=round(info["km"], 3), hoehen=mit_hoehe / len(punkte))
    if info["hoehen"] < HOEHEN_MIN:
        return "GPX: weniger als 90 % der Punkte haben eine Höhe", info
    return None, info


def pruefen(a):
    """Eingabe «strecke_senden» von der Seite → Fehlertext oder None. ID «sg-<Routen-ID>», bekannter Typ, Name und Beschreibung in Garmin-Grenzen,
    ausdrückliches Ja (`ja_am`), gültige GPX-Datei mit passender Prüfsumme und Länge."""
    if not isinstance(a, dict):
        return "kein Auftrag"
    if set(a) - FELDER:
        return "Auftrag mit unbekannten Feldern"
    if not isinstance(a.get("id"), str) or not re.fullmatch(r"sg-[\w.-]{1,60}", a["id"]):
        return "ungültige ID"
    if a.get("v") != FORMAT:
        return "unbekanntes Format"
    if not isinstance(a.get("route_id"), str) or not a["route_id"]:
        return "ohne Routen-ID"
    n = a.get("name")
    if not isinstance(n, str) or not n.strip() or len(n) > MAX_NAME or re.search(r"[\x00-\x1f\x7f]", n):
        return "ungültiger Name (1–128 Zeichen, ohne Steuerzeichen)"
    if a.get("typ") not in TYPEN:
        return f"unbekannter Streckentyp {a.get('typ')!r}"
    if a.get("sport") is not None and a.get("sport") not in SPORTARTEN:
        return "unbekannte Sportart"
    b = a.get("beschreibung")
    if not isinstance(b, str) or len(b) > MAX_BESCHR or re.search(r"[\x00-\x08\x0b-\x1f\x7f]", b):
        return "ungültige Beschreibung (höchstens 512 Zeichen)"
    if not _num(a.get("km")) or not 0 < a["km"] <= 3000:
        return "ungültige Länge"
    if a.get("hm") is not None and (not _num(a["hm"]) or a["hm"] < 0 or a["hm"] > 30000):
        return "ungültige Höhenmeter"
    t, ja = _zeit(a.get("erstellt")), _zeit(a.get("ja_am"))
    if not t:
        return "ohne Zeitpunkt"
    if not ja:
        return "ohne ausdrückliches Ja (ja_am)"
    if ja > t + dt.timedelta(minutes=5):
        return "Ja nach dem Auftrag"
    gpx = a.get("gpx")
    if not isinstance(gpx, str):
        return "ohne GPX"
    ps = a.get("pruefsumme")
    if not isinstance(ps, str) or not re.fullmatch(r"[0-9a-f]{64}", ps) or hashlib.sha256(gpx.encode("utf-8")).hexdigest() != ps:
        return "Prüfsumme passt nicht zur GPX-Datei"
    fehler, info = gpx_pruefen(gpx)
    if fehler:
        return fehler
    if abs(info["km"] - a["km"]) > max(0.05, 0.005 * a["km"]):
        return "Länge passt nicht zur GPX-Datei"
    return None


def _jetzt(arg=None):
    if arg:
        t = dt.datetime.fromisoformat(arg)
        return t if t.tzinfo else t.replace(tzinfo=TZ)
    return dt.datetime.now(TZ)


def _dateiname(aid):
    return re.sub(r"[^\w.-]+", "_", aid) + ".gpx"


def plan(D, ordner, jetzt=None):
    """Offene Aufträge → GPX-Dateien in `ordner` und Aktionen für upload_course. Verändert D nicht.
    Ein Auftrag, dessen GPX nicht mehr zur Prüfsumme passt, wird nicht gesendet (Abschluss «fehler»)."""
    jetzt = (jetzt or _jetzt()).astimezone(TZ).isoformat(timespec="seconds")
    P = {"v": V, "erstellt": jetzt, "ordner": os.path.abspath(ordner), "aktionen": [], "abschluesse": []}
    os.makedirs(ordner, exist_ok=True)
    for a in D.get("strecken_auftraege") or []:
        if not isinstance(a, dict) or a.get("status") != "offen":
            continue
        fehler = pruefen({k: v for k, v in a.items() if k in FELDER})
        if fehler:
            P["abschluesse"].append({"auftrag": a.get("id"), "status": "fehler", "grund": f"nicht gesendet: {fehler}"})
            continue
        datei = os.path.join(os.path.abspath(ordner), _dateiname(a["id"]))
        with open(datei, "w", encoding="utf-8", newline="") as f:
            f.write(a["gpx"])
        P["aktionen"].append({"nr": len(P["aktionen"]) + 1, "auftrag": a["id"], "datei": datei, "name": a["name"], "typ": a["typ"],
                              "beschreibung": a["beschreibung"], "km": a["km"], "pruefsumme": a["pruefsumme"],
                              "ersetzt_garmin_id": a.get("ersetzt_garmin_id")})
    return P


def eintragen(D, P, ergebnis, jetzt=None):
    """Ergebnisse der Garmin-Aufrufe eintragen: Status, Garmin-ID, Audit. Die GPX-Datei fällt aus dem Auftrag. → (Meldungen, Fehler je Auftrag)."""
    jetzt = (jetzt or _jetzt()).astimezone(TZ).isoformat(timespec="seconds")
    R = {int(r["nr"]): r for r in (ergebnis or []) if isinstance(r, dict) and _num(r.get("nr"))}
    A = {a.get("id"): a for a in D.get("strecken_auftraege") or [] if isinstance(a, dict)}
    audit = D.setdefault("audit", [])
    msg, fehler = [], {}
    for x in P.get("aktionen") or []:
        a = A.get(x["auftrag"])
        if not a or a.get("status") != "offen" or a.get("pruefsumme") != x.get("pruefsumme"):
            continue                                              # inzwischen ersetzt oder erledigt: nichts eintragen
        r = R.get(int(x["nr"]))
        if not r or not r.get("ok"):
            fehler[x["auftrag"]] = [str((r or {}).get("fehler") or "nicht ausgeführt")]
            a.update(status="fehler", fehler=fehler[x["auftrag"]], geprueft=jetzt)
            audit.append({"zeit": jetzt, "was": "Strecke: Hochladen fehlgeschlagen", "id": a["id"], "name": a.get("name"), "grund": fehler[x["auftrag"]][0]})
            continue
        abw = []
        if str(r.get("name") or "").strip() != str(x["name"]).strip():
            abw.append(f"Name in Garmin «{r.get('name')}»")
        if _num(r.get("distanz_m")) and abs(r["distanz_m"] / 1000 - x["km"]) > max(0.15, 0.03 * x["km"]):
            abw.append(f"Länge in Garmin {r['distanz_m'] / 1000:.1f} km statt {x['km']:.1f} km")
        a.update(garmin_id=str(r.get("course_id")), gesendet_am=jetzt, garmin_typ=r.get("typ"), geprueft=jetzt)
        a.pop("gpx", None)
        if r.get("course_id"):
            a.setdefault("fassungen", {})[a["pruefsumme"]] = a["garmin_id"]  # die Strecke liegt in Garmin Connect, auch wenn die Rücklese abweicht
        if abw or not r.get("course_id"):
            fehler[a["id"]] = ["Rücklese weicht ab: " + "; ".join(abw or ["keine Garmin-ID"]) + (f" (Strecke liegt in Garmin Connect, ID {r.get('course_id')})" if r.get("course_id") else "")]
            a.update(status="fehler", fehler=fehler[a["id"]])
            audit.append({"zeit": jetzt, "was": "Strecke: in Garmin Connect, Rücklese weicht ab", "id": a["id"], "name": a.get("name"), "garmin_id": a.get("garmin_id"), "abweichung": abw})
            continue
        a.update(status="gesendet")
        a.pop("fehler", None)
        a.setdefault("fassungen", {})[a["pruefsumme"]] = a["garmin_id"]       # diese Fassung ist in Garmin Connect (nie nochmals hochladen)
        audit.append({"zeit": jetzt, "was": "Strecke: in Garmin Connect angelegt", "id": a["id"], "name": a.get("name"), "km": a.get("km"), "typ": a.get("typ"),
                      "garmin_id": a["garmin_id"], "ersetzt_garmin_id": a.get("ersetzt_garmin_id")})
        msg.append(f"{a['id']} ({a['km']:.1f} km, {a['typ']}) in Garmin Connect, ID {a['garmin_id']}" + (f"; ältere Fassung {a['ersetzt_garmin_id']} bleibt dort" if a.get("ersetzt_garmin_id") else ""))
    for s in P.get("abschluesse") or []:
        a = A.get(s["auftrag"])
        if a and a.get("status") == "offen":
            a.update(status=s["status"], fehler=[s.get("grund")], geprueft=jetzt)
            a.pop("gpx", None)
            fehler[a["id"]] = [s.get("grund")]
    return msg, fehler


def main(argv):
    if len(argv) >= 4 and argv[1] == "plan":
        jetzt = _jetzt(argv[argv.index("--jetzt") + 1] if "--jetzt" in argv else None)
        D = json.load(open(argv[2], encoding="utf-8"))
        print(json.dumps(plan(D, argv[3], jetzt), ensure_ascii=False, indent=1))
        return 0
    if len(argv) == 5 and argv[1] == "eintragen":
        D = json.load(open(argv[2], encoding="utf-8"))
        P = json.load(open(argv[3], encoding="utf-8"))
        E = json.load(open(argv[4], encoding="utf-8"))
        msg, fehler = eintragen(D, P, E.get("garmin_ergebnis") if isinstance(E, dict) else E)
        tmp = argv[2] + ".tmp"                          # atomar schreiben: bricht etwas ab, bleibt data.json wie vorher
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(D, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, argv[2])
        print("STRECKEN:", "; ".join(msg) or "nichts angelegt")
        for aid, f in fehler.items():
            print(f"STRECKEN FEHLER {aid}: {'; '.join(f)}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
