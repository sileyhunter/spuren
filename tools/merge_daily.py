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


FIT_KEYS = ("el", "mv", "st", "nst", "un", "rc", "ac", "us", "hh", "pdc", "t0", "dr", "sp", "eb", "ser", "wk", "fr", "poly")


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


def _upsert(D, key, items, idf=lambda e: e["id"], what=None):
    """Einträge nach ID ersetzen oder anhängen; die alte Fassung bleibt im Audit (V5: Korrekturen nachvollziehbar)."""
    lst = D.setdefault(key, [])
    pos = {idf(e): i for i, e in enumerate(lst)}
    n_new = n_rep = 0
    for e in items:
        k = idf(e)
        if k in pos:
            if lst[pos[k]] != e:
                D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": f"{what or key} ersetzt",
                                                  "id": str(k), "alt": lst[pos[k]]})
                lst[pos[k]] = e
                n_rep += 1
        else:
            pos[k] = len(lst)
            lst.append(e)
            n_new += 1
    return n_new, n_rep


def laktat_uebernehmen(D, pid):
    """Schritt B1: eine Vorschau nach Silas' Bestätigung als Laktatmessung übernehmen (Quelle bleibt je Wert)."""
    p = next((x for x in D.get("laktat_vorschau", []) if x["id"] == pid), None)
    if not p or p.get("status") != "vorschau":
        return False
    if p["art"] == "stufentest":
        stages = []
        for z in p["zeilen"]:
            if z.get("la") is None or z.get("x") is None:
                continue
            f = z.get("fit") or {}
            st = {"la": z["la"], "hr": f.get("hr_vor") if f.get("hr_vor") is not None else z.get("hf"), "hr_tab": z.get("hf"),
                  "quelle": z.get("quelle")}
            st["kmh" if p["sport"] == "lauf" else "w"] = z["x"]
            stages.append(st)
        e = {"id": pid, "kind": "stufentest", "date": p["datum"], "sport": p["sport"], "stages": stages, "activity": p.get("aktivitaet"),
             "ausbelastet": "Ausbelastet" in " ".join(p.get("hinweise") or []), "note": "; ".join(p.get("hinweise") or []),
             "quelle": p.get("datei"), "bestaetigt": dt.date.today().isoformat()}
    else:
        z = p["zeilen"][0]
        k = (p.get("kandidaten") or [None])[-1] or {}
        e = {"id": pid, "kind": "check", "date": p["datum"], "sport": p["sport"], "w": z.get("x"), "lactate": z.get("la"),
             "hr_avg": k.get("hr"), "hr_max": k.get("hr_max"), "np": k.get("np"), "drift": k.get("drift"),
             "block": p.get("block"), "activity": p.get("aktivitaet"), "zuordnung": p.get("zuordnung"),
             "note": "; ".join(p.get("hinweise") or []), "quelle": (z.get("quelle") or {}).get("stelle") or p.get("datei"),
             "bestaetigt": dt.date.today().isoformat()}
    _upsert(D, "lactate", [e], what="Laktat")
    p["status"] = "übernommen"
    return True


def v5_merge(D, N):
    """V5-Einträge aus der Seite (Export «Eingaben») oder dem Chat: Fueling, Befinden, Koppelläufe, Pläne, Tests, B1."""
    msg = []
    for key, src, idf in (("fueling", "fueling_add", lambda e: e["id"]), ("befinden", "befinden_add", lambda e: e["date"]),
                          ("langfahrt_plaene", "langfahrt_add", lambda e: e["id"]), ("test_entwuerfe", "test_entwurf_add", lambda e: e["id"]),
                          ("koppel", "koppel_set", lambda e: (e["bike"], e["run"])), ("schwimm_analysen", "coach_add", lambda e: e["id"]),
                          ("pb_offiziell", "pb_add", lambda e: e["id"]), ("css_tests", "css_add", lambda e: e["id"]), ("fehlerboard", "fehler_add", lambda e: e["id"]),
                          ("rpe", "rpe_add", lambda e: e["id"]), ("intervall_korr", "intervall_add", lambda e: e["id"]),
                          ("laktat_punkte", "laktat_punkte_add", lambda e: e["id"]), ("saison_plan", "saison_add", lambda e: e["id"]),
                          ("trainingsrouten", "trainingsrouten_add", lambda e: e["id"])):
        if N.get(src):
            a, b = _upsert(D, key, N[src], idf)
            msg.append(f"{key}: {a} neu, {b} ersetzt")
    if "fueling_produkte" in N:
        D["fueling_produkte"] = N["fueling_produkte"]
    if isinstance(N.get("startorte"), list):              # V5.7: Startorte als ganze Liste (alte Fassung ins Audit)
        if D.get("startorte") != N["startorte"]:
            if D.get("startorte"):
                D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Startorte ersetzt", "alt": D["startorte"]})
            D["startorte"] = N["startorte"]
            msg.append(f"startorte: {len(N['startorte'])}")
    if N.get("fueling_quellen"):                         # A15: geprüfte Datenquellen für Einnahmen (ersetzt den alten Stand)
        D["fueling_quellen"] = N["fueling_quellen"]
    if N.get("test_archiv"):
        D["test_archiv"] = sorted(set(D.get("test_archiv", [])) | set(N["test_archiv"]))
    if N.get("notizen_set"):
        D.setdefault("notizen", {}).update(N["notizen_set"])
    if N.get("quelle_eingaben"):
        D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Eingaben eingespielt", **N["quelle_eingaben"]})
    for gid, w in (N.get("wx") or {}).items():          # Wetter je Aktivität (Garmin), nie überschreiben
        for a in D.get("activities", []):
            if (a.get("gid") == gid or a["id"] == gid) and not a.get("wx"):
                a["wx"] = w
    for z in N.get("zonen_add") or []:                  # neue Zonenversion nur mit Freigabe von Silas
        if not (z.get("freigabe") or {}).get("datum"):
            msg.append(f"Zonen {z.get('id')} ohne Freigabe nicht übernommen")
            continue
        for old in D.setdefault("zonen", []):
            if old.get("status") == "aktiv":
                old["status"], old["gueltig_bis"] = "ersetzt", z["gueltig_ab"]
        _upsert(D, "zonen", [z], what="Zonenprofil")
    for pid in N.get("laktat_bestaetigt") or []:
        msg.append(f"B1 {pid}: {'übernommen' if laktat_uebernehmen(D, pid) else 'nicht gefunden oder schon übernommen'}")
    if msg:
        print("V5:", "; ".join(msg))


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
            if fr and fr.get("ok") and ("mv" not in match or "t0" not in match):   # nachtragen, Exportwerte nie überschreiben
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
    if isinstance(N.get("workouts_neu"), list):             # V5.7: neue Enduco-Workouts ohne Kalenderdatum (ersetzt die Liste)
        D["workouts_neu"] = N["workouts_neu"][:8]

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
    v5_merge(D, N)

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
