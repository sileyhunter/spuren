"""Bestleistungen Laufen aus den FIT-Sekundenwerten (best-1.0): schnellste Zeit über feste Distanzen innerhalb
eines Laufs (wie «Bestleistungen» bei Strava). Nur Outdoor-Läufe; Abschnitte mit GPS-Sprung (Strecke wächst zwischen
zwei Datensätzen schneller als 7,5 m/s) oder Ø-Tempo über 7 m/s werden verworfen.

Aufruf: python3 -I tools/bestleistungen.py data.json --files work/files.json
"""
import datetime as dt
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kalibrierung as K  # noqa: E402

VERSION = "best-1.0"
DISTS = [(400, "400 m"), (1000, "1 km"), (1609.34, "1 Meile"), (5000, "5 km"), (10000, "10 km"), (21097.5, "Halbmarathon"), (42195, "Marathon")]


def glitches(t, d, vmax=7.5):
    """Kumulierte Zahl GPS-Sprünge (Strecke wächst schneller als vmax zwischen zwei Datensätzen)."""
    dt_ = np.diff(t)
    dd = np.diff(d)
    bad = (dd > vmax * np.maximum(dt_, 1) + 2).astype(int)
    return np.concatenate([[0], np.cumsum(bad)])


def best_for(t, d, dist, g=None):
    """Kürzeste Zeit für dist Meter (Start linear interpoliert). t, d: gleich lange Arrays, d monoton.
    Abschnitte mit GPS-Sprung (g = kumulierte Sprungzahl) werden übersprungen."""
    if len(d) < 2 or d[-1] - d[0] < dist:
        return None
    if g is None:
        g = glitches(np.asarray(t, float), np.asarray(d, float))
    best, i = None, 0
    for j in range(1, len(d)):
        while i + 1 < j and d[j] - d[i + 1] >= dist:
            i += 1
        if d[j] - d[i] >= dist and g[j] == g[i]:
            # Startpunkt zwischen i und i+1 so, dass genau dist bis j bleibt
            over = d[j] - d[i] - dist
            seg = d[i + 1] - d[i] if i + 1 < len(d) else 0
            frac = over / seg if seg > 0 else 0
            sec = t[j] - (t[i] + frac * (t[i + 1] - t[i]))
            if sec > 0 and dist / sec <= 7.0 and (best is None or sec < best):
                best = sec
    return best


def rechne(D, files):
    idx = {os.path.basename(f["path"]).rsplit("_", 1)[-1].split(".")[0]: f["path"] for f in files}
    rows = []
    for a in D["activities"]:
        if a.get("sport") != "lauf" or a.get("indoor") or a["id"].split("-")[0] not in idx:
            continue
        S = K.load_series(idx[a["id"].split("-")[0]], "lauf")
        if not S or len(S.ts) < 120:
            continue
        t = np.asarray(S.ts, float)
        d = np.asarray([np.nan if x is None else x for x in S.dist], float)
        ok = ~np.isnan(d)
        t, d = t[ok], d[ok]
        if len(d) < 2:
            continue
        d = np.maximum.accumulate(d)
        g = glitches(t, d)
        for dist, lab in DISTS:
            s = best_for(t, d, dist, g)
            if s:
                rows.append({"dist": dist, "label": lab, "s": round(float(s), 1), "date": a["date"], "act": a["id"], "name": a.get("name", "")})
    today = max((a["date"] for a in D["activities"]), default=dt.date.today().isoformat())
    lim = (dt.date.fromisoformat(today) - dt.timedelta(days=365)).isoformat()
    out = {"v": VERSION, "erstellt": dt.date.today().isoformat(), "quelle": "FIT-Sekundenwerte (Garmin-Export), schnellster Abschnitt innerhalb eines Laufs", "lauf": [], "lauf_12m": []}
    for dist, lab in DISTS:
        cand = [r for r in rows if r["dist"] == dist]
        if cand:
            out["lauf"].append(min(cand, key=lambda r: r["s"]))
            rec = [r for r in cand if r["date"] >= lim]
            if rec:
                out["lauf_12m"].append(min(rec, key=lambda r: r["s"]))
    return out


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    files_path = argv[argv.index("--files") + 1] if "--files" in argv else "work/files.json"
    D = json.load(open(argv[1], encoding="utf-8"))
    D["bestleistungen"] = rechne(D, json.load(open(files_path, encoding="utf-8")))
    D.setdefault("versions", {})["bestleistungen"] = VERSION
    json.dump(D, open(argv[1], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for r in D["bestleistungen"]["lauf"]:
        m, s = divmod(r["s"], 60)
        print(f"{r['label']:>13}: {int(m)}:{s:04.1f} ({r['date']})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
