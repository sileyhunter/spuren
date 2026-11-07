"""Monatlicher Garmin-Export: ausgelesene FIT-Aktivitäten (acts_raw.json aus parse_activities.py)
in data.json übernehmen. FIT-Daten sind genauer und ersetzen gleiche Einheiten aus dem nächtlichen Update;
Garmin-Namen und -IDs aus dem nächtlichen Update bleiben erhalten.

Aufruf: python3 -I tools/import_export.py data.json acts_raw.json [--ftp-neu]
--ftp-neu  FTP-Probe neu rechnen (sonst bleiben ftp_e, ftp_dev und ftp_est wie zuletzt berechnet)
"""
import collections
import datetime as dt
import json
import os
import sys
import zoneinfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ftp_model  # noqa: E402
import kennzahlen  # noqa: E402

ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
KEEP = ("id", "sport", "typ", "indoor", "name", "date", "start", "km", "hm", "dur", "hr", "watt", "np", "tss", "zones", "hh", "poly",
        "el", "mv", "st", "nst", "un", "rc", "ac", "us",      # Zeitbegriffe zeit-1.0 (A3)
        "t0", "dr", "sp")                                     # Start (Unix), Drift, Lauf-Abschnitte (ausdauer-1.0, V5)
PDC_D = [5, 15, 30, 60, 300, 600, 1200, 3600, 7200]


def richness(a):
    return (1 if a["watt"] else 0, 1 if a["poly"] else 0, 1 if a["hr"] else 0, len(a["poly"] or ""), a["dur"])


def dedupe(A):
    A.sort(key=lambda a: a["unix"])
    kept, removed = [], 0
    for a in A:
        dup = None
        for b in kept[-6:]:
            if b["sport"] != a["sport"]:
                continue
            s1, e1 = b["unix"], b["unix"] + max(b["el"], b["dur"])
            s2, e2 = a["unix"], a["unix"] + max(a["el"], a["dur"])
            if min(e1, e2) - max(s1, s2) > 0.5 * min(e1 - s1, e2 - s2):
                dup = b
                break
        if dup is None:
            kept.append(a)
            continue
        removed += 1
        better, worse = (a, dup) if richness(a) > richness(dup) else (dup, a)
        for k in ("hr", "hrmax", "zones", "hh"):
            if not better.get(k) and worse.get(k):
                better[k] = worse[k]
        if better is a:
            kept[kept.index(dup)] = a
    return kept, removed


def minutes(hhmm):
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


def main(data_path, raw_path):
    D = json.load(open(data_path, encoding="utf-8"))
    A, removed = dedupe(json.load(open(raw_path, encoding="utf-8")))
    # FTP-Verlauf (nur Radfahrten mit Watt), Monatsmaximum, nur Wechsel
    by_month = collections.OrderedDict()
    for a in A:
        if a["sport"] == "rad" and a["watt"] and a["ftp"] and 100 <= a["ftp"] <= 500:
            m = a["date"][:7]
            by_month[m] = max(by_month.get(m, 0), a["ftp"])
    ftp = []
    for m, w in by_month.items():
        if not ftp or ftp[-1]["w"] != w:
            ftp.append({"date": m + "-01", "w": w})
    year = dt.date.today().year
    best = {year: {}, year - 1: {}}
    for a in A:
        y = int(a["date"][:4])
        if y in best and a.get("pdc"):
            for d, v in a["pdc"].items():
                d = int(d)
                if v and v > best[y].get(d, 0):
                    best[y][d] = v
    new = [{k: a[k] for k in KEEP if a.get(k) not in (None, False, [], "")} for a in A]
    for a in new:
        a.setdefault("hm", 0)
        a.setdefault("km", 0)
    # Namen/IDs aus dem nächtlichen Update übernehmen, Doppel vermeiden
    old = D.get("activities", [])
    old_ftp = {o["id"]: {k: o[k] for k in ("ftp_e", "ftp_dev") if k in o} for o in old if o.get("ftp_e") or o.get("ftp_dev")}
    used = set()
    for a in new:
        for i, o in enumerate(old):
            if i in used or o["date"] != a["date"] or o["sport"] != a["sport"]:
                continue
            if abs(minutes(o.get("start", "00:00")) - minutes(a["start"])) <= 3:
                used.add(i)
                if o.get("gid"):
                    a["gid"] = o["gid"]
                    a["name"] = o.get("name") or a["name"]
                break
    fit_ids = {a["id"] for a in new}
    rest = [o for i, o in enumerate(old) if i not in used and o["id"] not in fit_ids and o["id"].startswith("g")]
    D["activities"] = sorted(new + rest, key=lambda a: (a["date"], a.get("start", "")))
    D["ftp"] = ftp
    D["pdc"] = {"dur": PDC_D, "now": [best[year].get(d) for d in PDC_D], "prev": [best[year - 1].get(d) for d in PDC_D]}
    if ftp:
        D.setdefault("config", {})["ftp"] = ftp[-1]["w"]
    # FTP-Probe: bisherige Berechnung bleibt, solange Silas keine neue verlangt (--ftp-neu); sie hängt vom Stichtag ab
    if FTP_NEU or not D.get("ftp_est"):
        n_ftp = ftp_model.apply(D, A)   # geschätzte FTP je Fahrt (ftp_e) und Verlauf (ftp_est), Original-TSS bleibt
    else:
        for a in D["activities"]:
            o = old_ftp.get(a["id"])
            if o:
                a.update(o)
        n_ftp = sum(1 for a in D["activities"] if a.get("ftp_e"))
    # Stufentests aus den Sekundenwerten (A5); Laktat kommt nur über tools/laktat_vorschau.py dazu
    old_st = {s["id"]: s for s in D.get("stufen", [])}
    for a in A:
        if a.get("stufen"):
            st = a["stufen"]
            e = {"id": a["id"], "date": a["date"], "sport": a["sport"], "name": a.get("name"), "quelle": "FIT-Sekundenwerte",
                 **{k: v for k, v in st.items() if k != "stufen"},
                 "stufen": [{k: v for k, v in s.items() if k not in ("t0", "t1")} |
                            {"uhr": dt.datetime.fromtimestamp(s["t1"], ZRH).strftime("%H:%M:%S")} for s in st["stufen"]]}
            if a["id"] in old_st and old_st[a["id"]].get("datei"):
                e["datei"] = old_st[a["id"]]["datei"]
            old_st[a["id"]] = e
    D["stufen"] = sorted(old_st.values(), key=lambda s: s["date"])
    D["versions"] = {**D.get("versions", {}), **kennzahlen.VERSIONS}
    D["updated"] = dt.datetime.now(ZRH).strftime("%d.%m.%Y %H:%M")
    json.dump(D, open(data_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"FTP-Schätzung für {n_ftp} Fahrten")
    print(f"FIT-Aktivitäten: {len(new)} (Doppel entfernt: {removed}), behaltene Nacht-Einträge: {len(rest)}, gesamt: {len(D['activities'])}")


FTP_NEU = "--ftp-neu" in sys.argv

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
