"""Enduco-Bibliothek (bib-1.1, V6.5 Etappe 5; 1.1 V6.6): jedes Enduco-Workout, das über Garmin kommt, bleibt erhalten.

Quellen (alle nur lesend aus Garmin, nichts wird nach Garmin oder Enduco geschrieben):
  - Garmin-Workout-Liste (`get_workouts`): alle Workouts mit Volltext und Erstelldatum, auch die von 2024 an
  - Kalender (`planned` im Nacht- und Morgen-Update): Datum, Schritte, ab V6.5 auch Volltext und Änderungsdatum
  - neue Workouts ohne Kalenderdatum (`workouts_neu`)
  - rückwirkend die Schritte je Workout (`enduco_schritte`, je Nacht höchstens 10, siehe `offen`)

Regeln:
  - Nie etwas löschen oder überschreiben. Fehlende Felder einer Version werden ergänzt.
  - Neue Version: anderes Änderungsdatum von Garmin (`geaendert` = updated_date), oder – nur wenn kein Änderungsdatum bekannt ist –
    anderer Volltext bzw. andere Schritte (Kern: Art, Dauer, Ziele, Wiederholungen; gerundet, damit eine Abschrift nicht als Änderung zählt).
  - Volltexte stehen je Text einmal unter `texte` (Schlüssel = Prüfsumme). Die erste Zeile allein (`desc` im Kalender) gilt nicht als Volltext.
  - Termine nur aus dem Kalender; Garmin hebt vergangene Kalendereinträge nicht auf, darum zählen sie ab jetzt.
  - bib-1.1 (V6.6): Kalendereinträge, die Silas selbst über «An Garmin senden» eingeplant hat (Vermerk in `plan_garmin`, Bibliothek, nicht schon
    vorher im Kalender), sind kein Enduco-Termin und zählen nicht.

Aufrufe:
  python3 -I tools/bibliothek.py liste data.json <get_workouts-Antwort.json>   # Liste einspielen (Datei so, wie Garmin sie liefert)
  python3 -I tools/bibliothek.py offen data.json [n]                          # Workouts ohne Schritte (neueste zuerst, Standard 10)
  python3 -I tools/bibliothek.py stand data.json                              # Übersicht ohne Inhalte
"""
import datetime as dt
import hashlib
import json
import os
import sys
import zoneinfo

V = "bib-1.1"
ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
SPORT = {"cycling": "rad", "road_biking": "rad", "indoor_cycling": "rad", "virtual_ride": "rad", "mountain_biking": "rad", "gravel_cycling": "rad",
         "running": "lauf", "trail_running": "lauf", "treadmill_running": "lauf", "swimming": "schwimm", "lap_swimming": "schwimm",
         "open_water_swimming": "schwimm", "rad": "rad", "lauf": "lauf", "schwimm": "schwimm"}
KERN = ("type", "end_condition", "end_condition_value", "target_type", "target_value_low", "target_value_high",
        "secondary_target_type", "secondary_target_value_low", "secondary_target_value_high", "repeat_count")
VERSUCHE_MAX = 3


def heute():
    return dt.datetime.now(ZRH).strftime("%Y-%m-%d")


def _h(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]


def _rund(v):
    if isinstance(v, float):
        return round(v, 3)
    return v


def kern(steps):
    """Schritte ohne Texte und Reihenfolge-Nummern, Zahlen gerundet – nur für den Vergleich, gespeichert wird unverändert."""
    out = []
    for s in steps or []:
        if not isinstance(s, dict):
            continue
        k = {f: _rund(s.get(f)) for f in KERN if s.get(f) is not None}
        if s.get("steps"):
            k["steps"] = kern(s["steps"])
        out.append(k)
    return out


def kern_h(steps):
    return _h(json.dumps(kern(steps), sort_keys=True)) if steps else None


def sport(s):
    return SPORT.get(str(s or "").lower(), "andere")


def bib(D):
    B = D.setdefault("enduco_bib", {})
    B.setdefault("v", V)
    B.setdefault("workouts", {})
    B.setdefault("texte", {})
    return B


def _text(B, t):
    t = (t or "").strip()
    if not t:
        return None
    h = _h(t)
    B["texte"].setdefault(h, t)
    return h


def _version_finden(W, beob):
    """Version, in die eine Beobachtung gehört – oder None (dann neue Version)."""
    V_ = W["versionen"]
    if not V_:
        return None
    if beob.get("geaendert"):
        for v in V_:
            if v.get("geaendert") == beob["geaendert"]:
                return v
        # Version ohne Änderungsdatum (z. B. aus der Liste) mit gleichem Inhalt: dieselbe
        for v in reversed(V_):
            if not v.get("geaendert") and _passt(v, beob):
                v["geaendert"] = beob["geaendert"]
                return v
        return None
    letzte = V_[-1]
    return letzte if _passt(letzte, beob) else None


def _passt(v, beob):
    """Gleicher Inhalt, soweit beide etwas wissen (fehlende Felder widersprechen nicht)."""
    if beob.get("text_h") and v.get("text_h") and beob["text_h"] != v["text_h"]:
        return False
    if beob.get("kern_h") and v.get("kern_h") and beob["kern_h"] != v["kern_h"]:
        return False
    return True


def beobachten(D, w, tag=None, termin=None, quelle="kalender"):
    """Eine Beobachtung eines Workouts einspielen. w: wid, titel, sport, erstellt, geaendert, text (Volltext), steps, dauer_s,
    distanz_m, pool_m, kurz (erster Satz). Gibt 'neu', 'version', 'ergaenzt' oder None zurück."""
    B = bib(D)
    tag = tag or heute()
    wid = str(w.get("wid") or "").strip()
    if not wid or not wid.isdigit():
        return None
    W = B["workouts"].get(wid)
    status = None
    if W is None:
        W = B["workouts"][wid] = {"wid": wid, "titel": (w.get("titel") or "").strip(), "sport": sport(w.get("sport")),
                                  "erstellt": w.get("erstellt"), "versionen": [], "termine": []}
        status = "neu"
    for f in ("titel", "erstellt"):
        if not W.get(f) and w.get(f):
            W[f] = w[f].strip() if isinstance(w[f], str) else w[f]
    if W.get("sport") in (None, "andere") and w.get("sport"):
        W["sport"] = sport(w.get("sport"))
    beob = {"geaendert": w.get("geaendert"), "text_h": _text(B, w.get("text")), "kern_h": kern_h(w.get("steps"))}
    v = _version_finden(W, beob)
    if v is None:
        v = {"ab": (w.get("geaendert") or w.get("erstellt") or tag)[:10], "gesehen": tag}
        if w.get("geaendert"):
            v["geaendert"] = w["geaendert"]
        vor = W["versionen"][-1] if W["versionen"] else None
        kurz = (w.get("kurz") or "").strip()
        if not beob["text_h"] and vor and vor.get("text_h") and (not kurz or B["texte"].get(vor["text_h"], "").startswith(kurz[:40])):
            v["text_h"], v["text_aus"] = vor["text_h"], "vorige Version"   # nur der erste Satz bekannt und er passt: Text gekennzeichnet übernommen
        W["versionen"].append(v)
        status = status or "version"
    vorher = json.dumps(v, sort_keys=True)
    if beob["text_h"] and not v.get("text_h"):
        v["text_h"] = beob["text_h"]
    if w.get("kurz") and not v.get("kurz") and not v.get("text_h"):
        v["kurz"] = w["kurz"].strip()[:200]
    if w.get("steps") and not v.get("steps"):
        v["steps"], v["kern_h"], v["steps_quelle"] = w["steps"], beob["kern_h"], quelle
    for f in ("dauer_s", "distanz_m", "pool_m"):
        if w.get(f) and not v.get(f):
            v[f] = w[f]
    if json.dumps(v, sort_keys=True) != vorher and status is None:
        status = "ergaenzt"
    if termin and termin not in W["termine"]:
        W["termine"] = sorted(W["termine"] + [termin])
        status = status or "ergaenzt"
    if v.get("steps"):
        W.pop("versuche", None)
    return status


def _zaehlen(z, s):
    if s:
        z[s] = z.get(s, 0) + 1


def einspielen(D, N, tag=None):
    """Aus new.json: Kalender (planned), neue Workouts (workouts_neu) und rückwirkende Schritte (enduco_schritte)."""
    z = {}
    eigen = {(g.get("date"), str(g.get("wid"))) for g in D.get("plan_garmin") or []      # bib-1.1: selbst eingeplant (garmin-senden-1.0)
             if isinstance(g, dict) and g.get("quelle") == "bibliothek" and not g.get("vorhanden") and not g.get("entfernt")}
    for p in N.get("planned") or []:
        if not p.get("wid") or "enduco" not in str(p.get("quelle") or "").lower() or (p.get("date"), str(p.get("wid"))) in eigen:
            continue
        _zaehlen(z, beobachten(D, {"wid": p["wid"], "titel": p.get("title"), "sport": p.get("sport"), "erstellt": p.get("erstellt"),
                                   "geaendert": p.get("geaendert"), "text": p.get("desc_voll"), "kurz": p.get("desc"), "steps": p.get("steps"),
                                   "dauer_s": p.get("dur_s")}, tag, termin=p.get("date"), quelle="kalender"))
    for w in N.get("workouts_neu") or []:
        _zaehlen(z, beobachten(D, {"wid": w.get("wid"), "titel": w.get("title"), "sport": w.get("sport"), "erstellt": w.get("erstellt"),
                                   "geaendert": w.get("geaendert"), "text": w.get("desc_voll"), "kurz": w.get("desc"), "steps": w.get("steps"),
                                   "dauer_s": w.get("dur_s")}, tag, quelle="workout"))
    for w in N.get("enduco_schritte") or []:
        if w.get("fehlt"):
            W = bib(D)["workouts"].get(str(w.get("wid")))
            if W is not None:
                W["versuche"] = W.get("versuche", 0) + 1
                _zaehlen(z, "nicht abrufbar")
            continue
        _zaehlen(z, beobachten(D, {"wid": w.get("wid"), "titel": w.get("titel"), "sport": w.get("sport"), "erstellt": w.get("erstellt"),
                                   "geaendert": w.get("geaendert"), "text": w.get("desc_voll"), "steps": w.get("steps"), "dauer_s": w.get("dauer_s"),
                                   "distanz_m": w.get("distanz_m"), "pool_m": w.get("pool_m")}, tag, quelle="workout"))
    if z:
        bib(D)["stand"] = tag or heute()
        version_eintragen(D)
    return z


def version_eintragen(D):
    D.setdefault("versions", {})["enduco_bib"] = {"v": V, "text": "Enduco-Workouts aus Garmin (Liste, Kalender, Schritte): nie gelöscht, "
                                                  "Änderungen als neue Version, Volltexte je einmal"}


def einspielen_liste(D, L, tag=None):
    """Garmin-Workout-Liste (get_workouts: {count, workouts: [{id, name, sport, provider, created_date, description, estimated_…}]}).
    Nur Enduco. Die Liste kennt kein Änderungsdatum: ein anderer Volltext wird eine neue Version."""
    z = {}
    W = L.get("workouts") if isinstance(L, dict) else L
    if not isinstance(W, list):
        raise ValueError("keine Workout-Liste")
    for w in W:
        if str(w.get("provider") or "").lower() != "enduco":
            continue
        _zaehlen(z, beobachten(D, {"wid": w.get("id"), "titel": w.get("name"), "sport": w.get("sport"), "erstellt": w.get("created_date"),
                                   "text": w.get("description"), "dauer_s": w.get("estimated_duration_seconds"),
                                   "distanz_m": w.get("estimated_distance_meters")}, tag, quelle="liste"))
    B = bib(D)
    B["liste_stand"] = tag or heute()
    B["stand"] = tag or heute()
    version_eintragen(D)
    return z


def offen(D, n=10):
    """Workouts, deren neueste Version noch keine Schritte hat (neueste zuerst), ohne die nach 3 Versuchen nicht abrufbaren."""
    W = [w for w in bib(D)["workouts"].values()
         if w["versionen"] and not w["versionen"][-1].get("steps") and w.get("versuche", 0) < VERSUCHE_MAX]
    W.sort(key=lambda w: w.get("erstellt") or "", reverse=True)
    return {"wids": [int(w["wid"]) for w in W[:n]], "offen": len(W), "fertig": not W}


def stand(D):
    B = bib(D)
    W = list(B["workouts"].values())
    je = {}
    for w in W:
        je[w["sport"]] = je.get(w["sport"], 0) + 1
    e = sorted(w.get("erstellt") or "" for w in W if w.get("erstellt"))
    return {"v": B.get("v"), "workouts": len(W), "je_sportart": je, "versionen": sum(len(w["versionen"]) for w in W),
            "mit_schritten": sum(1 for w in W if w["versionen"] and w["versionen"][-1].get("steps")),
            "mit_termin": sum(1 for w in W if w["termine"]), "texte": len(B["texte"]),
            "erstellt_von": e[0][:10] if e else None, "erstellt_bis": e[-1][:10] if e else None, "stand": B.get("stand")}


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("liste", "offen", "stand"):
        print(__doc__)
        sys.exit(2)
    pfad = sys.argv[2]
    D = json.load(open(pfad, encoding="utf-8"))
    if sys.argv[1] == "liste":
        z = einspielen_liste(D, json.load(open(sys.argv[3], encoding="utf-8")))
        tmp = pfad + ".tmp"                    # atomar: data.json ist nie halb geschrieben
        json.dump(D, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, pfad)
        print(f"Bibliothek: {json.dumps(z, ensure_ascii=False)} | {json.dumps(stand(D), ensure_ascii=False)}")
    elif sys.argv[1] == "offen":
        print(json.dumps(offen(D, int(sys.argv[3]) if len(sys.argv) > 3 else 10)))
    else:
        print(json.dumps(stand(D), ensure_ascii=False))
