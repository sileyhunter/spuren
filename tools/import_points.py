"""Wegpunkte aus einer GPX-Datei (z. B. Garmin Explore / Fenix) als feste Punkte in data.json übernehmen.

Aufruf: python3 -I tools/import_points.py data.json <datei.gpx>
Ersetzt alle früher so importierten Punkte (id beginnt mit «gpx-»), andere Punkte bleiben.
Kategorie nach Name: Post, Posten, Hochsitz, Ansitz, Kanzel … → Jagdposten, sonst Sonstiges usw.
Namen, die nur Datum/Uhrzeit oder Koordinaten sind, werden zu «Punkt TT.MM.JJJJ»;
liegt am gleichen Ort ein gleichzeitig gespeicherter Punkt mit richtigem Namen, fällt der namenlose weg.
punkte-1.1 (14.11.2026): Kategorien von Hand (`cat_hand`, z. B. Punkte im Jagdgebiet als Jagdposten auf Silas' Wunsch) bleiben beim
neuen Import, wenn derselbe Punkt wieder vorkommt (gleicher Name, höchstens 50 m entfernt); sonst gilt die Kategorie nach Name.
"""
import datetime as dt
import json
import math
import re
import sys
import xml.etree.ElementTree as ET

JAGD = re.compile(r"\b(post|posten|hochsitz|ansitz|kanzel|kanzla|pirsch|hochstand)\b", re.I)
VERSION = "punkte-1.1"
HAND_M = 50          # Kategorie von Hand bleibt bei gleichem Namen bis zu diesem Abstand (m)
AUTO = re.compile(r"^(\d{1,2}\.? ?[a-zäöü]{3,9}\.?,? ?(\d{4},? ?)?\d{1,2}:\d{2}\s*[ap]?m?|[NS] ?\d{1,2}°.*)$", re.I)


def cat(name):
    n = name.lower()
    if JAGD.search(n):
        return "jagd"
    if re.search(r"wasser|brunnen|quelle", n):
        return "wasser"
    if re.search(r"\bbad\b|badestelle|strand", n):
        return "bad"
    if re.search(r"parkplatz|\bpark\b", n):
        return "park"
    if re.search(r"caf[eé]|beiz|restaurant|bäck", n):
        return "cafe"
    return "sonst"


def dist_m(a, b):
    return math.hypot((a["lon"] - b["lon"]) * 111320 * math.cos(math.radians(a["lat"])), (a["lat"] - b["lat"]) * 110574)


def hand_kat(alt, q):
    """Kategorie von Hand eines früher importierten Punkts mit gleichem Namen, höchstens HAND_M entfernt (sonst None)."""
    for a in alt:
        if a.get("cat_hand") and (a.get("name") or "").lower() == q["name"].lower() and dist_m(a, q) <= HAND_M:
            return a.get("cat")
    return None


def main(data_path, gpx_path):
    D = json.load(open(data_path, encoding="utf-8"))
    root = ET.parse(gpx_path).getroot()
    ns = root.tag.split("}")[0] + "}" if root.tag.startswith("{") else ""
    raw = []
    for w in root.iter(ns + "wpt"):
        try:
            lat, lon = float(w.get("lat")), float(w.get("lon"))
        except (TypeError, ValueError):
            continue
        name = (w.findtext(ns + "name") or "").strip()
        t = (w.findtext(ns + "time") or "").strip()
        when = None
        if t:
            try:
                when = dt.datetime.fromisoformat(t.replace("Z", "+00:00"))
            except ValueError:
                when = None
        try:
            ele = round(float(w.findtext(ns + "ele") or 0))
        except ValueError:
            ele = 0
        raw.append({"name": name, "lat": round(lat, 6), "lon": round(lon, 6), "ele": ele if ele > 0 else None, "when": when, "auto": not name or bool(AUTO.match(name))})

    keep = []
    for p in raw:
        if p["auto"] and any(not q["auto"] and dist_m(p, q) < 10 and p["when"] and q["when"] and abs((p["when"] - q["when"]).total_seconds()) < 120 for q in raw):
            continue          # namenloser Doppelpunkt
        dup = next((q for q in keep if q["name"].lower() == p["name"].lower() and dist_m(p, q) < 15), None)
        if dup:
            if p["when"] and (not dup["when"] or p["when"] > dup["when"]):
                keep[keep.index(dup)] = p
            continue
        keep.append(p)

    alt = [p for p in D.get("points", []) if str(p.get("id", "")).startswith("gpx-")]
    pts, n_hand = [], 0
    for i, p in enumerate(keep, 1):
        date = p["when"].date().isoformat() if p["when"] else None
        name = p["name"]
        if p["auto"]:
            name = "Punkt " + (p["when"].strftime("%-d.%-m.%Y") if p["when"] else str(i))
        q = {"id": f"gpx-{i}", "name": name, "cat": cat(name), "lat": p["lat"], "lon": p["lon"]}
        h = hand_kat(alt, q)
        if h:
            q["cat"], q["cat_hand"] = h, True
            n_hand += 1
        if p["ele"]:
            q["ele"] = p["ele"]
        if date:
            q["date"] = date
        pts.append(q)

    D["points"] = [p for p in D.get("points", []) if not str(p.get("id", "")).startswith("gpx-")] + pts
    D.setdefault("versions", {})["punkte"] = {"v": VERSION, "text": "Wegpunkte aus GPX: Kategorie nach Name; Kategorien von Hand bleiben "
                                              "(gleicher Name, höchstens 50 m)"}
    json.dump(D, open(data_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    n = {}
    for p in pts:
        n[p["cat"]] = n.get(p["cat"], 0) + 1
    print(f"{len(raw)} Wegpunkte gelesen, {len(pts)} übernommen ({', '.join(f'{k}: {v}' for k, v in sorted(n.items()))})"
          + (f", Kategorie von Hand behalten: {n_hand}" if n_hand else ""))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
