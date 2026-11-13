"""Nächtliches Update: neue Garmin-Daten (work/new.json) in data.json einspielen.

Aufruf: python3 -I tools/merge_daily.py data.json work/new.json [work/fit.jsonl]
Format von new.json: siehe CLAUDE.md.
"""
import datetime as dt
import json
import math
import os
import re
import sys
import zoneinfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bibliothek  # noqa: E402          V6.5: Enduco-Bibliothek (bib-1.0), nichts wird gelöscht
import garmin_ernaehrung  # noqa: E402   V5.7.2: Garmin-Ernährungsprotokoll → Fueling
import garmin_export  # noqa: E402       V6.2.3: Garmin-Datenexport (Verlauf), füllt nur fehlende Tageswerte
import garmin_senden  # noqa: E402       V6.6: Aufträge «An Garmin senden» (garmin-senden-1.0) prüfen
import last  # noqa: E402                V5.9.1: Trainingslast mit LT2 (tl2, last-2.0)
import notizen  # noqa: E402             V6.1: Garmin-Notizen, Laktat und Verpflegung daraus als Vorschau (notizen-1.0)
import wellness  # noqa: E402            V6.1: Readiness, Body Battery, Stress je Tag (wellness-1.0)

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


def zonen_pruefen(D, z):
    """V6.2.2: Zonenprofil vor dem Einspielen prüfen. None = in Ordnung, sonst der Grund (das Profil wird dann nicht übernommen).
    Freigabe mit Datum, Skalen mit lückenlosen, streng geordneten Grenzen (Pace fallend); aus zonenvorschlag-* nur mit bestätigtem Test (B1)."""
    if not isinstance(z, dict) or not z.get("id") or str(z["id"]).startswith("demo"):
        return "ohne gültige ID"
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(z.get("gueltig_ab") or "")):
        return "ohne Gültigkeitsdatum"
    if not (z.get("freigabe") or {}).get("datum"):
        return "ohne Freigabe"
    sk = z.get("skalen")
    if not isinstance(sk, list) or not sk:
        return "ohne Skalen"
    zahl = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
    for s in sk:
        zs = s.get("zonen") if isinstance(s, dict) else None
        if not isinstance(zs, list) or len(zs) < 2 or s.get("metrik") not in ("leistung", "puls", "pace") or s.get("disziplin") not in ("rad", "lauf", "schwimm"):
            return f"Skala {s.get('key') if isinstance(s, dict) else '?'} unvollständig"
        if zs[0].get("von") is not None or zs[-1].get("bis") is not None or any(a.get("bis") != b.get("von") for a, b in zip(zs, zs[1:])):
            return f"Skala {s.get('key')}: Grenzen nicht lückenlos"
        g = [x.get("bis") for x in zs[:-1]]
        if not all(zahl(v) for v in g) or not all((a > b) if s["metrik"] == "pace" else (a < b) for a, b in zip(g, g[1:])):
            return f"Skala {s.get('key')}: Grenzen nicht geordnet"
    meth = z.get("methodik") or {}
    if str(meth.get("art", "")).startswith("zonenvorschlag-"):
        tests = {t.get("test"): t for t in (D.get("schwellen") or {}).get("tests", [])}
        for sp, x in (meth.get("je_sportart") or {}).items():
            t = tests.get((x or {}).get("test"))
            if not t or t.get("datenstatus") != "bestätigt":
                return f"{sp}: Stufentest {(x or {}).get('test')} nicht bestätigt (B1)"
    return None


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
        # V5.9.6 laktat-drift-1.0: Zeitpunkt in der Einheit und Pause für die Messung mitnehmen (für «Einzelmessungen über die Zeit»)
        for f in ("t_s", "el_s", "pause_s", "pause_timer_s", "uhr", "kj_vor", "win_s", "hr30"):
            if k.get(f) is not None:
                e[f] = k[f]
        if z.get("pace_s") is not None:            # V6.1: Lauf-Messung aus der Garmin-Notiz mit Pace
            e["pace_s"] = z["pace_s"]
        if p.get("fenster"):
            e["fenster"] = p["fenster"]
    _upsert(D, "lactate", [e], idf=lambda x: x.get("id"), what="Laktat")
    p["status"] = "übernommen"
    return True


def laktatpunkt_uebernehmen(D, pid):
    """V5.9.3 (3c): «Laktat hier» aus dem Explorer nach Silas' Bestätigung auf der Seite als Kurzcheck übernehmen."""
    p = next((x for x in D.get("laktat_punkte", []) if x.get("id") == pid), None)
    if not p or p.get("status") != "vorschau":
        return False
    ab = p.get("abschnitt") or {}
    mmss = lambda s: f"{int(s) // 60}:{int(s) % 60:02d}" if isinstance(s, (int, float)) else "?"  # noqa: E731
    e = {"id": pid, "kind": "check", "date": p.get("datum"), "sport": p.get("sport"), "block": f"Explorer {mmss(ab.get('von'))}–{mmss(ab.get('bis'))}",
         "w": ab.get("w") if p.get("sport") != "lauf" else None, "pace_s": ab.get("pace") if p.get("sport") == "lauf" else None,
         "np": ab.get("np"), "hr_avg": ab.get("hr"), "hr_max": None, "drift": None, "lactate": p.get("la"),
         "note": "aus Explorer" + (f"; {p['notiz']}" if p.get("notiz") else ""), "activity": p.get("act"),
         "quelle": f"{p.get('quelle') or 'Explorer'}, Abschnitt {mmss(ab.get('von'))}–{mmss(ab.get('bis'))} ({ab.get('grund') or 'Zuordnung'})",
         "bestaetigt": dt.date.today().isoformat()}
    _upsert(D, "lactate", [e], idf=lambda x: x.get("id"), what="Laktat")
    p["status"] = "übernommen"
    return True


MODELLE = ("kombiniert", "polarisiert", "pyramidal", "schwelle", "rennspezifisch")   # wie V64.MODELLE in js/v64.js


INTENSITAET_STUFEN = ("locker", "schwelle", "alles")


def modell_pruefen(m):
    """V6.4 modell-1.0: Eintrag «modell» von der Seite → Fehlertext oder None (bekanntes Modell, Wechsel als Datum).
    V6.4.2 intensitaet-1.0/1.1: optional «intensitaet» = {schwimm, rad, lauf} mit «locker», «schwelle» oder «alles»."""
    if not isinstance(m, dict) or m.get("id") != "modell":
        return "kein Eintrag «modell»"
    if m.get("modell") not in MODELLE:
        return f"unbekanntes Modell {m.get('modell')!r}"
    try:                                                 # Audit V6.4 B22: nur JJJJ-MM-TT, wie die Seite liest (fromisoformat nähme auch «20270315»)
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(m.get("wechsel"))):
            raise ValueError
        dt.date.fromisoformat(str(m.get("wechsel")))
    except ValueError:
        return "Wechsel ist kein Datum"
    it = m.get("intensitaet")
    if it is not None:
        if not isinstance(it, dict) or not it:
            return "Intensität je Sportart ist keine Liste"
        for sp, st in it.items():
            if sp not in ("schwimm", "rad", "lauf"):
                return f"unbekannte Sportart {sp!r} bei der Intensität"
            if st not in INTENSITAET_STUFEN:
                return f"unbekannte Intensität {st!r} ({sp})"
    return None


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
            items = N[src]
            if key == "laktat_punkte":                   # V5.9.3: schon übernommene Punkte bleiben übernommen (nie zurück auf «vorschau»)
                done = {x.get("id") for x in D.get("laktat_punkte", []) if x.get("status") == "übernommen"}
                items = [dict(e, status="übernommen") if e.get("id") in done else e for e in items]
            a, b = _upsert(D, key, items, idf)
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
    for z in N.get("zonen_add") or []:                  # neue Zonenversion nur mit Freigabe von Silas (V6.2.2: auch von der Seite, geprüft)
        fehler = zonen_pruefen(D, z)
        if fehler:
            msg.append(f"Zonen {z.get('id') if isinstance(z, dict) else '?'} nicht übernommen: {fehler}")
            if isinstance(z, dict) and z.get("id"):          # die Seite zeigt den Grund beim noch offenen Profil (V6.2.2)
                abg = [x for x in D.get("zonen_abgelehnt", []) if x.get("id") != z["id"]]
                abg.append({"id": z["id"], "grund": fehler, "zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds")})
                D["zonen_abgelehnt"] = abg[-20:]
            continue
        for old in D.setdefault("zonen", []):
            if old.get("status") == "aktiv" and old.get("id") != z["id"]:
                old["status"], old["gueltig_bis"] = "ersetzt", z["gueltig_ab"]
        _upsert(D, "zonen", [z], what="Zonenprofil")
        msg.append(f"Zonen {z['id']} übernommen (gültig ab {z['gueltig_ab']})")
        if str((z.get("methodik") or {}).get("art", "")).startswith("zonenvorschlag-"):
            D.setdefault("versions", {})["zonenvorschlag"] = {"v": z["methodik"]["art"], "text": "Zonen-Vorschlag aus LT1/LT2 (js/v62.js), gilt nur nach Bestätigung auf der Seite"}
    for pid in N.get("laktat_bestaetigt") or []:
        msg.append(f"B1 {pid}: {'übernommen' if laktat_uebernehmen(D, pid) else 'nicht gefunden oder schon übernommen'}")
    for pid in N.get("laktat_punkte_bestaetigt") or []:   # V5.9.3: Laktat aus dem Explorer, auf der Seite bestätigt
        msg.append(f"Laktat {pid}: {'als Kurzcheck übernommen' if laktatpunkt_uebernehmen(D, pid) else 'nicht gefunden oder schon übernommen'}")
    if N.get("routen_add"):                              # V5.9.3: gespeicherte Routen aller Geräte (nur verschlüsselt in data.enc.json)
        a, b = _upsert(D, "routes", N["routen_add"], what="Route")
        msg.append(f"routes: {a} neu, {b} ersetzt")
    for rid in N.get("routen_entfernt") or []:
        alt = next((r for r in D.get("routes", []) if r.get("id") == rid), None)
        if alt is not None:
            D["routes"] = [r for r in D["routes"] if r.get("id") != rid]
            D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Route entfernt", "id": rid, "alt": alt})
            msg.append(f"Route {rid} entfernt")
    gv = N.get("garmin_verlauf")                         # V6.2.3: Garmin-Datenexport über die Seite; füllt nur fehlende Tageswerte
    for G in (gv if isinstance(gv, list) else [gv] if gv else []):   # Audit V6.4 B9: mehrere Verläufe aus dem Eingang, jeder einzeln
        msg.append(garmin_export.einspielen(D, G))
    for m in N.get("modell_add") or []:                  # V6.4 modell-1.0: gewähltes Trainingsmodell (nur Vorschlag; Enduco/Garmin bleiben unverändert)
        fehler = modell_pruefen(m)
        if fehler:
            msg.append(f"Trainingsmodell nicht übernommen: {fehler}")
            continue
        a, b = _upsert(D, "plan_modell", [m], what="Trainingsmodell")
        msg.append(f"Trainingsmodell {m['modell']}" + (f" (Wechsel {m['wechsel']})" if m["modell"] == "kombiniert" else "") + (" übernommen" if a or b else " unverändert"))
    for w in N.get("planwahl_add") or []:                # V6.5 planwahl-1.0: welchem Plan Silas an einem Tag folgt (nur zum Vergleich)
        fehler = planwahl_pruefen(w)
        if fehler:
            msg.append(f"Wahl nicht übernommen: {fehler}")
            continue
        a, b = _upsert(D, "plan_wahl", [w], what="Wahl des Plans")
        if a or b:
            msg.append(f"Wahl {w['date']}: {w['wahl']}")
    for w in N.get("planwoche_add") or []:              # V6.6 eigenplan-1.0: Mein Plan einer Woche (ganze Woche; gleiche ID ersetzt mit Audit)
        vorher = next((x for x in D.get("plan_woche") or [] if isinstance(w, dict) and x.get("id") == w.get("id")), None)
        fehler = planwoche_pruefen(w, vorher)
        if fehler:
            msg.append(f"Mein Plan nicht übernommen: {fehler}")
            continue
        a, b = _upsert(D, "plan_woche", [w], what="Mein Plan")
        if a or b:
            msg.append(f"Mein Plan Woche {w['montag']}")
    for g in N.get("garmin_senden_add") or []:          # V6.6 garmin-senden-1.0: Auftrag je Tag; gesendet wird im Nacht-Update (tools/garmin_senden.py)
        fehler = garmin_senden.pruefen(g)
        if fehler:
            msg.append(f"Garmin-Auftrag nicht übernommen: {fehler}")
            if isinstance(g, dict) and g.get("id"):       # die Seite zeigt den Grund (und räumt den Auftrag auf dem Gerät weg)
                ab = [x for x in D.get("garmin_abgelehnt") or [] if not (x.get("id") == g.get("id") and x.get("erstellt") == g.get("erstellt"))]
                D["garmin_abgelehnt"] = (ab + [{"id": str(g.get("id")), "erstellt": g.get("erstellt"), "grund": fehler,
                                                "zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds")}])[-20:]
            continue
        L = D.setdefault("garmin_auftraege", [])
        i = next((k for k, x in enumerate(L) if isinstance(x, dict) and x.get("id") == g["id"]), None)
        if i is not None and str(L[i].get("erstellt") or "") >= str(g.get("erstellt") or ""):
            continue                                     # schon bekannt (gleiche oder neuere Fassung) – nie zweimal senden
        if i is not None:                                # Audit ohne die Workouts (die stehen in plan_garmin bzw. im neuen Auftrag)
            x = L[i]
            D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Garmin-Auftrag ersetzt", "id": g["id"],
                                              "alt": {"modus": x.get("modus"), "erstellt": x.get("erstellt"), "status": x.get("status"),
                                                      "fassungen": {u.get("uid"): u.get("fassung") for u in x.get("einheiten") or [] if isinstance(u, dict)}}})
            L[i] = dict(g, status="offen")
        else:
            L.append(dict(g, status="offen"))
        msg.append(f"Garmin-Auftrag {g['date']} ({g['modus']})")
    if msg:
        print("V5:", "; ".join(msg))


PLANWAHL = ("enduco", "vorschlag", "frei")


def planwahl_pruefen(w):
    """V6.5 planwahl-1.0: Eintrag «planwahl» von der Seite → Fehlertext oder None (ID «pw-JJJJ-MM-TT», Datum, Wahl)."""
    if not isinstance(w, dict):
        return "kein Eintrag"
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(w.get("date"))):
            raise ValueError
        dt.date.fromisoformat(str(w.get("date")))
    except ValueError:
        return "kein Datum"
    if w.get("id") != "pw-" + w["date"]:
        return "ID passt nicht zum Datum"
    if w.get("wahl") not in PLANWAHL:
        return f"unbekannte Wahl {w.get('wahl')!r}"
    return None


PLANWOCHE_QUELLEN = ("vorschlag", "eigen", "bibliothek")


def planwoche_pruefen(w, vorher=None):
    """V6.6 eigenplan-1.0: Eintrag «planwoche» (Mein Plan einer Woche) → Fehlertext oder None. ID «wo-<Montag>», Tage nur in dieser Woche,
    Einheiten mit eindeutiger Kennung, bekannter Quelle und Dauer 5–600 min. Unveränderlich gegenüber dem bisherigen Stand: Tage vor dem Tag
    der Änderung (`geaendert`) und Tage, die gesperrt waren und gesperrt bleiben."""
    if not isinstance(w, dict):
        return "kein Eintrag"
    try:
        mo = dt.date.fromisoformat(str(w.get("montag")))
    except ValueError:
        return "kein Montag"
    if mo.weekday() != 0:
        return "die Woche beginnt nicht an einem Montag"
    if w.get("id") != "wo-" + mo.isoformat():
        return "ID passt nicht zur Woche"
    tage = w.get("tage")
    if not isinstance(tage, dict):
        return "ohne Tage"
    try:
        ge = dt.date.fromisoformat(str(w.get("geaendert") or "")[:10])
    except ValueError:
        return "ohne Zeitpunkt der Änderung"
    for d, t in tage.items():
        try:
            dd = dt.date.fromisoformat(str(d))
        except ValueError:
            return f"kein Datum {d!r}"
        if not mo <= dd <= mo + dt.timedelta(days=6):
            return f"{d} liegt nicht in dieser Woche"
        if not isinstance(t, dict) or not isinstance(t.get("gesperrt", False), bool):
            return f"{d}: ungültig"
        E = t.get("einheiten")
        if E is None:
            continue
        if not isinstance(E, list) or len(E) > 12:
            return f"{d}: Einheiten ungültig"
        uids = set()
        for e in E:
            if not isinstance(e, dict) or not isinstance(e.get("uid"), str) or not e["uid"] or e["uid"] in uids:
                return f"{d}: Einheit ohne eindeutige Kennung"
            uids.add(e["uid"])
            if e.get("quelle") not in PLANWOCHE_QUELLEN:
                return f"{d}: unbekannte Quelle"
            if isinstance(e.get("dauer"), bool) or not isinstance(e.get("dauer"), (int, float)) or not 5 <= e["dauer"] <= 600:
                return f"{d}: Dauer ausserhalb 5–600 min"
            if e["quelle"] == "bibliothek":
                if isinstance(e.get("wid"), bool) or not isinstance(e.get("wid"), int) or e.get("sport") not in ("rad", "lauf", "schwimm"):
                    return f"{d}: Bibliothek ohne Workout oder Sportart"
            elif not re.fullmatch(r"[a-z0-9_]{1,40}", str(e.get("vorlage") or "")):
                return f"{d}: unbekannte Vorlage"
    alt = (vorher or {}).get("tage") or {}
    for d in set(tage) | set(alt):
        try:
            dd = dt.date.fromisoformat(str(d))
        except ValueError:
            continue
        neu, vor = tage.get(d) or {}, alt.get(d) or {}
        gleich = neu.get("einheiten") == vor.get("einheiten") and bool(neu.get("gesperrt")) == bool(vor.get("gesperrt"))
        if dd < ge and not gleich:
            return f"{d} lag beim Ändern schon zurück"
        if vor.get("gesperrt") and neu.get("gesperrt") and neu.get("einheiten") != vor.get("einheiten"):
            return f"{d} ist gesperrt"
    return None


GARMIN_KEYS = ("activities", "days", "weights", "planned", "planned_range", "workouts_neu", "food_logs", "wx", "notizen_garmin", "enduco_schritte")


def main(data_path, new_path, fit_path=None):
    D = json.load(open(data_path, encoding="utf-8"))
    N = json.load(open(new_path, encoding="utf-8"))
    FIT = load_fit(fit_path) if fit_path else {}
    fit_used, fit_missing = 0, []
    cfg = D.setdefault("config", {})
    cfg.update(N.get("config") or {})
    acts = D.setdefault("activities", [])
    added = updated = 0
    notes_in = {}                              # V6.1: Notiz je Aktivität (description aus get_activity), auch für schon vorhandene
    for n in N.get("activities", []):
        if "notiz" in n:
            notes_in["g" + str(n["garmin_id"])] = n["notiz"]
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
        if not any(v is not None for k, v in d.items() if k != "date"):
            continue                           # Tag ohne einen einzigen Wert: kein leerer Eintrag
        cur = days.setdefault(d["date"], {"date": d["date"]})
        cur.update({k: v for k, v in d.items() if v is not None})
    D["days"] = [days[k] for k in sorted(days)]
    if any(k in d for d in N.get("days", []) for k in wellness.FELDER):   # V6.1: Garmins eigene Werte, nicht Teil der Ampel
        D.setdefault("versions", {})["wellness"] = {"v": wellness.V, "text": "Readiness, Body Battery und Stress wie von Garmin geliefert (je Tag); "
                                                    "fehlende Werte bleiben leer; angezeigt, nicht in die Ampel eingerechnet"}

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
    if N.get("planned") or N.get("workouts_neu") or N.get("enduco_schritte"):   # V6.5 bib-1.0: jedes Enduco-Workout bleibt erhalten
        try:                                   # die Bibliothek darf das Update nie aufhalten
            zb = bibliothek.einspielen(D, N)
            if zb:
                print(f"Enduco-Bibliothek: {json.dumps(zb, ensure_ascii=False)}")
        except Exception as e:  # noqa: BLE001
            print(f"Enduco-Bibliothek nicht ergänzt ({type(e).__name__}) – Update geht weiter")

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
    # V5.7.2: Garmin-Ernährungsprotokoll je Tag (geprüft gegen die Tageswerte), dann Einnahmen während Aktivitäten → Fueling «fg-…»
    if N.get("food_logs"):
        print(f"Garmin-Ernährung: {garmin_ernaehrung.einlesen(D, N['food_logs'])} Tag(e) neu oder geändert")
    nf, hw = garmin_ernaehrung.fueling_ableiten(D)
    if nf or hw:
        print(f"Fueling aus Garmin: {nf} neu" + "".join(f"\n  {h['date']}: {h['text']}" for h in hw))
    # V6.1 notizen-1.0: Notizen aus Garmin speichern (neu abgerufene und rückwirkende), dann Laktat und Verpflegung daraus als Vorschau
    notes_in.update(N.get("notizen_garmin") or {})
    if notes_in:
        print(f"Garmin-Notizen: {len(notes_in)} abgerufen, {notizen.einlesen(D, notes_in)} neu oder geändert")
    n_la, n_fu, hw_n = notizen.ableiten(D)
    if n_la or n_fu:
        print(f"Aus Notizen: {n_la} Laktat-Vorschau(en), {n_fu} Verpflegungs-Vorschau(en) neu")

    if fit_path:                               # Protokoll für die Abnahme A2 (14 Nächte ohne fehlende Datei)
        log = D.setdefault("fit_log", [])
        log.append({"nacht": dt.datetime.now(ZRH).strftime("%Y-%m-%d"), "neu": added, "fit": fit_used, "fehlt": fit_missing})
        print(f"FIT-Sekundenwerte: {fit_used} ausgewertet, {len(fit_missing)} fehlen")
        del log[:-60]
    last.alle(D)                               # V5.9.1: tl2 je Aktivität (Rad NP gegen LT2), tss bleibt unverändert
    # «Daten vom …» = letzter Abruf aus Garmin: Einspielen ohne Garmin-Daten (nur config, Laktat, Eingaben) lässt den Stand stehen
    if fit_path or any(N.get(k) for k in GARMIN_KEYS) or not D.get("updated"):
        D["updated"] = dt.datetime.now(ZRH).strftime("%d.%m.%Y %H:%M")
    if N.get("lauf") in ("morgen", "nacht"):              # V5.9.2 morgen-1.0: welcher Lauf zuletzt (Stand auf «Heute»)
        D["updated_lauf"] = "Morgen-Update" if N["lauf"] == "morgen" else "Nacht-Update"
    json.dump(D, open(data_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"Aktivitäten neu: {added}, ergänzt: {updated}, gesamt: {len(acts)} | Tage: {len(D['days'])} | Gewichte: {len(D.get('weights', []))}"
          f" | geplant: {len(D.get('planned', []))} | Laktat: {len(D.get('lactate', []))}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
