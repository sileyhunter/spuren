"""Nächtliches Update: neue Garmin-Daten (work/new.json) in data.json einspielen.

Aufruf: python3 -I tools/merge_daily.py data.json work/new.json [work/fit.jsonl]
Format von new.json: siehe CLAUDE.md.
"""
import datetime as dt
import json
import sys
import zoneinfo

ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
TYPES = {  # Garmin-Typ -> (Kategorie, Bezeichnung, indoor)
    "cycling": ("rad", "Rad", False), "road_biking": ("rad", "Rennrad", False), "mountain_biking": ("rad", "Mountainbike", False),
    "gravel_cycling": ("rad", "Gravel", False), "cyclocross": ("rad", "Cyclocross", False), "track_cycling": ("rad", "Bahnrad", False),
    "indoor_cycling": ("rad", "Indoor Rad", True), "virtual_ride": ("rad", "Zwift", True),
    "running": ("lauf", "Laufen", False), "street_running": ("lauf", "Laufen", False), "trail_running": ("lauf", "Trail Run", False),
    "treadmill_running": ("lauf", "Laufband", True), "indoor_running": ("lauf", "Indoor-Lauf", True), "track_running": ("lauf", "Bahn", False),
    "virtual_run": ("lauf", "Virtueller Lauf", True), "ultra_run": ("lauf", "Ultra", False),
    "lap_swimming": ("schwimm", "Schwimmbad", True), "open_water_swimming": ("schwimm", "Freiwasser", False), "swimming": ("schwimm", "Schwimmen", False),
    "hiking": ("wandern", "Wandern", False), "walking": ("wandern", "Gehen", False), "casual_walking": ("wandern", "Gehen", False),
    "speed_walking": ("wandern", "Gehen", False), "mountaineering": ("wandern", "Bergsteigen", False),
    "snow_shoe_ws": ("wandern", "Schneeschuh", False), "snow_shoe": ("wandern", "Schneeschuh", False),
    "backcountry_skiing": ("ski", "Skitouren", False), "backcountry_skiing_snowboarding_ws": ("ski", "Skitouren", False),
    "resort_skiing": ("ski", "Skifahren", False), "resort_skiing_snowboarding_ws": ("ski", "Skifahren", False),
    "resort_snowboarding": ("ski", "Snowboard", False), "cross_country_skiing_ws": ("ski", "Langlauf", False),
    "skate_skiing_ws": ("ski", "Langl. Freistil", False), "cross_country_skiing": ("ski", "Langlauf", False),
    "strength_training": ("andere", "Krafttraining", True), "indoor_cardio": ("andere", "Indoor Cardio", True),
    "yoga": ("andere", "Yoga", True), "indoor_rowing": ("andere", "Indoor Rudern", True),
}


def tss_for(sport, dur, hr, np_, cfg):
    h = dur / 3600.0
    ftp = cfg.get("ftp")
    lthr = (cfg.get("lthr") or {}).get(sport) or (cfg.get("lthr") or {}).get("default")
    if sport == "rad" and np_ and ftp:
        return round(h * (np_ / ftp) ** 2 * 100)
    if hr and lthr:
        return round(h * min(1.15, hr / lthr) ** 2 * 100)
    return round(h * 36)


def minutes(hhmm):
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


FIT_KEYS = ("el", "mv", "st", "nst", "un", "rc", "ac", "us", "hh", "pdc")


def load_fit(path):
    """work/fit.jsonl aus tools/fit_nacht.py: je Zeile eine Aktivität."""
    out = {}
    try:
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line:
                r = json.loads(line)
                out[str(r.get("garmin_id"))] = r
    except FileNotFoundError:
        pass
    return out


def main(data_path, new_path, fit_path=None):
    D = json.load(open(data_path, encoding="utf-8"))
    N = json.load(open(new_path, encoding="utf-8"))
    FIT = load_fit(fit_path) if fit_path else {}
    fit_used, fit_missing = 0, []
    cfg = D.setdefault("config", {})
    cfg.update(N.get("config") or {})
    acts = D.setdefault("activities", [])
    added = updated = 0
    for n in N.get("activities", []):
        t = n.get("type") or ""
        sport, label, indoor = TYPES.get(t, ("andere", t.replace("_", " ").title() or "Aktivität", False))
        start = dt.datetime.fromisoformat(n["start_local"].replace(" ", "T")[:19])
        date, hhmm = start.strftime("%Y-%m-%d"), start.strftime("%H:%M")
        gid = "g" + str(n["garmin_id"])
        match = None
        for a in acts:
            if a.get("gid") == gid or a.get("id") == gid:
                match = a
                break
            if a["date"] == date and a["sport"] == sport and abs(minutes(a.get("start", "00:00")) - minutes(hhmm)) <= 3:
                match = a
                break
        fr = FIT.get(str(n["garmin_id"]))
        if match is not None:  # schon da (z. B. aus dem FIT-Export): nur Name und Garmin-ID ergänzen
            match["name"] = n.get("name") or match.get("name")
            match["gid"] = gid
            if n.get("poly") and not match.get("poly"):
                match["poly"] = n["poly"]
            if fr and fr.get("ok") and "mv" not in match:      # Zeitbegriffe nachtragen, Exportwerte nie überschreiben
                for k in FIT_KEYS:
                    if fr["fit"].get(k) is not None and match.get(k) is None:
                        match[k] = fr["fit"][k]
                match["src"] = match.get("src") or "garmin-fit"
                fit_used += 1
            elif fit_path and "mv" not in match:
                fit_missing.append({"gid": gid, "date": date, "grund": (fr or {}).get("grund", "keine FIT-Antwort")})
            updated += 1
            continue
        dur = int(round(n.get("duration_s") or 0))
        hr, np_ = n.get("avg_hr"), n.get("np")
        a = {"id": gid, "gid": gid, "sport": sport, "typ": label, "name": n.get("name") or label, "date": date, "start": hhmm,
             "km": round((n.get("distance_m") or 0) / 1000, 2), "hm": int(round(n.get("elev_gain_m") or 0)), "dur": dur,
             "tss": tss_for(sport, dur, hr, np_, cfg)}
        if indoor:
            a["indoor"] = True
        for k_src, k_dst in (("avg_hr", "hr"), ("avg_power", "watt"), ("np", "np")):
            if n.get(k_src):
                a[k_dst] = round(n[k_src])
        z = n.get("hr_zones_s")
        if z and len(z) >= 5:
            a["zones"] = [int(round(v or 0)) for v in z[:5]]
        if n.get("poly"):
            a["poly"] = n["poly"]
        if fr and fr.get("ok"):                 # A2: Sekundenwerte aus der Garmin-Verbindung, wie im Monatsexport
            for k in FIT_KEYS:
                if fr["fit"].get(k) is not None:
                    a[k] = fr["fit"][k]
            if not a.get("np") and fr["fit"].get("np"):
                a["np"] = fr["fit"]["np"]
            a["src"] = "garmin-fit"
            fit_used += 1
            if fr["fit"].get("stufen"):
                st = fr["fit"]["stufen"]
                e = {"id": gid, "date": date, "sport": sport, "name": a["name"], "quelle": "Garmin-Verbindung, Sekundenwerte",
                     **{k: v for k, v in st.items() if k != "stufen"}, "stufen": st["stufen"]}
                D["stufen"] = sorted([x for x in D.get("stufen", []) if x["id"] != gid] + [e], key=lambda x: x["date"])
        elif fit_path:
            fit_missing.append({"gid": gid, "date": date, "grund": (fr or {}).get("grund", "keine FIT-Antwort")})
        acts.append(a)
        added += 1
    acts.sort(key=lambda a: (a["date"], a.get("start", "")))

    days = {d["date"]: d for d in D.setdefault("days", [])}
    for d in N.get("days", []):
        cur = days.setdefault(d["date"], {"date": d["date"]})
        cur.update({k: v for k, v in d.items() if v is not None})
    D["days"] = [days[k] for k in sorted(days)]

    if N.get("weights"):
        per = {}
        for w in D.get("weights", []):
            per[w["date"]] = w["kg"]
        by_day = {}
        for m in N["weights"]:
            t = dt.datetime.fromtimestamp(m["ts_gmt"] / 1000, ZRH)
            by_day.setdefault(m["date"], []).append((t, m["kg"]))
        for d, lst in by_day.items():
            lst.sort()
            morning = [x for x in lst if x[0].hour < 12]
            per[d] = (morning[-1] if morning else lst[0])[1]
        D["weights"] = [{"date": k, "kg": v} for k, v in sorted(per.items())]

    if "planned" in N:
        lo, hi = N.get("planned_range") or [None, None]
        keep = [p for p in D.get("planned", []) if lo and hi and not (lo <= p["date"] <= hi)]
        D["planned"] = sorted(keep + N["planned"], key=lambda p: p["date"])

    for l in N.get("lactate_add", []):
        lac = D.setdefault("lactate", [])
        key = (l.get("date"), l.get("kind"), l.get("block") or l.get("sport"))
        lac[:] = [x for x in lac if (x.get("date"), x.get("kind"), x.get("block") or x.get("sport")) != key]
        lac.append(l)
        lac.sort(key=lambda x: x["date"])
    if "tests" in N:
        D["tests"] = N["tests"]
    if "protokolle" in N:                       # Protokoll-Vorlagen (ersetzt die ganze Liste)
        D["protokolle"] = N["protokolle"]

    if fit_path:                               # Protokoll für die Abnahme A2 (14 Nächte ohne fehlende Datei)
        log = D.setdefault("fit_log", [])
        log.append({"nacht": dt.datetime.now(ZRH).strftime("%Y-%m-%d"), "neu": added, "fit": fit_used, "fehlt": fit_missing})
        print(f"FIT-Sekundenwerte: {fit_used} ausgewertet, {len(fit_missing)} fehlen")
        del log[:-60]
    D["updated"] = dt.datetime.now(ZRH).strftime("%d.%m.%Y %H:%M")
    json.dump(D, open(data_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"Aktivitäten neu: {added}, ergänzt: {updated}, gesamt: {len(acts)} | Tage: {len(D['days'])} | Gewichte: {len(D.get('weights', []))}"
          f" | geplant: {len(D.get('planned', []))} | Laktat: {len(D.get('lactate', []))}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
