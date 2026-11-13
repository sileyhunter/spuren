"""garmin-senden-1.0 (V6.6, Etappe 6.7, Entscheid E3 von Silas am 13.11.2026): Einheiten aus «Mein Plan» an Garmin senden.

Die Seite legt je Tag einen Auftrag an (Eingabe garmin_senden → merge_daily.py → garmin_auftraege), mit einer Momentaufnahme je Einheit:
fertiges Garmin-Workout (Format von upload_workout, Name «IN · …») bzw. bei der Bibliothek nur die Workout-ID (Enduco-Workout, wird nur
eingeplant), dazu die Fassung. modus «senden» = im nächsten Nacht-Update, «auto» = im Nacht-Update am Vortag frühestens um 23:00 Ortszeit,
«aus» = automatisches Senden für diesen Tag abgestellt. Dieses Werkzeug rechnet nur, was zu tun ist, prüft die Rücklese und trägt Ergebnisse
ein; die Aufrufe an Garmin macht das Nacht-Update (CLAUDE.md, «An Garmin senden»). Gelöscht oder ausgetragen wird nur, was einen eigenen
Vermerk in plan_garmin hat; Enduco-Workouts werden nie geändert oder gelöscht.

  python3 -I tools/garmin_senden.py plan data.json [--jetzt 2026-11-14T23:05] > work/garmin_plan.json
  python3 -I tools/garmin_senden.py rueck work/garmin_plan.json <nr> <antwort.json>      # nach upload_workout: Rücklese mit get_workout_by_id(raw)
  python3 -I tools/garmin_senden.py eintragen data.json work/garmin_plan.json work/garmin_ergebnis.json
"""
import datetime as dt
import json
import os
import re
import sys
import zoneinfo

V = "garmin-senden-1.0"
PREFIX = "IN · "
TZ = zoneinfo.ZoneInfo("Europe/Zurich")
AB_UHR = dt.time(23, 0)                   # automatisch frühestens um 23:00 am Vortag (Silas, E3)
MAX_TAGE = 8                              # von Hand bis eine Woche voraus (+1 Tag Spielraum für Mitternacht)
MAX_SCHRITTE = 50
SPORTARTEN = {1: "running", 2: "cycling"}
SCHRITT_TYP = {1: "warmup", 2: "cooldown", 3: "interval", 4: "recovery"}
QUELLEN = ("vorschlag", "eigen", "bibliothek")


def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _datum(s):
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(s)):
            raise ValueError
        return dt.date.fromisoformat(str(s))
    except ValueError:
        return None


def _zeit(s):
    try:
        t = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return t if t.tzinfo else t.replace(tzinfo=TZ)
    except ValueError:
        return None


def workout_pruefen(w):
    """Garmin-Workout aus der Seite (V66.garminWorkout) → Fehlertext oder None. Nur bekannte Felder, Zeit als Ende, Ziele Watt bzw. m/s."""
    if not isinstance(w, dict) or set(w) - {"workoutName", "description", "sportType", "workoutSegments"}:
        return "Workout mit unbekannten Feldern"
    name = w.get("workoutName")
    if not isinstance(name, str) or not name.startswith(PREFIX) or len(name) > 80:
        return "Name ohne «IN · » oder zu lang"
    if not isinstance(w.get("description", ""), str) or len(w.get("description", "")) > 600:
        return "Beschreibung zu lang"
    st = w.get("sportType") or {}
    if not isinstance(st, dict) or SPORTARTEN.get(st.get("sportTypeId")) != st.get("sportTypeKey"):
        return "nur Rad und Laufen"
    segs = w.get("workoutSegments")
    if not isinstance(segs, list) or len(segs) != 1 or not isinstance(segs[0], dict) or set(segs[0]) - {"segmentOrder", "sportType", "workoutSteps"}:
        return "genau ein Abschnitt erwartet"
    if segs[0].get("segmentOrder") != 1 or segs[0].get("sportType") != st:
        return "Abschnitt passt nicht zur Sportart"
    rad = st.get("sportTypeKey") == "cycling"
    zaehler = {"n": 0, "order": 0, "s": 0}

    def schritt(x, in_gruppe, faktor):
        if not isinstance(x, dict):
            return "Schritt ungültig"
        zaehler["n"] += 1
        zaehler["order"] += 1
        if x.get("stepOrder") != zaehler["order"]:
            return "Reihenfolge der Schritte stimmt nicht"
        if x.get("type") == "RepeatGroupDTO":
            if in_gruppe:
                return "Wiederholung in einer Wiederholung"
            if set(x) - {"type", "stepOrder", "stepType", "numberOfIterations", "endCondition", "endConditionValue", "smartRepeat", "workoutSteps"}:
                return "Wiederholung mit unbekannten Feldern"
            k = x.get("numberOfIterations")
            if x.get("stepType") != {"stepTypeId": 6, "stepTypeKey": "repeat"} or not isinstance(k, int) or isinstance(k, bool) or not 2 <= k <= 50 \
                    or x.get("endCondition") != {"conditionTypeId": 7, "conditionTypeKey": "iterations"} or x.get("endConditionValue") != k:
                return "Wiederholung ungültig"
            kinder = x.get("workoutSteps")
            if not isinstance(kinder, list) or not 1 <= len(kinder) <= 8:
                return "Wiederholung ohne Schritte"
            for y in kinder:
                f = schritt(y, True, faktor * k)
                if f:
                    return f
            return None
        if x.get("type") != "ExecutableStepDTO":
            return "unbekannter Schritt"
        if set(x) - {"type", "stepOrder", "stepType", "description", "endCondition", "endConditionValue", "targetType", "targetValueOne", "targetValueTwo"}:
            return "Schritt mit unbekannten Feldern"
        t = x.get("stepType") or {}
        if SCHRITT_TYP.get(t.get("stepTypeId")) != t.get("stepTypeKey"):
            return "Schrittart ungültig"
        if not isinstance(x.get("description", ""), str) or len(x.get("description", "")) > 100:
            return "Text eines Schritts zu lang"
        if x.get("endCondition") != {"conditionTypeId": 2, "conditionTypeKey": "time"} or not _num(x.get("endConditionValue")) or not 5 <= x["endConditionValue"] <= 36000:
            return "Schritt ohne Zeit (5 s bis 10 h)"
        zaehler["s"] += x["endConditionValue"] * faktor
        tt = x.get("targetType") or {}
        lo, hi = x.get("targetValueOne"), x.get("targetValueTwo")
        if tt == {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}:
            return None if lo is None and hi is None else "Ohne Ziel, aber mit Werten"
        if tt == {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "power.between"} and rad:
            return None if _num(lo) and _num(hi) and 30 <= lo <= hi <= 1500 else "Leistung ausserhalb 30–1500 W"
        if tt == {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "pace.zone"} and not rad:
            return None if _num(lo) and _num(hi) and 0.5 <= lo <= hi <= 10 else "Tempo ausserhalb 0,5–10 m/s"
        return "Ziel ungültig"

    steps = segs[0].get("workoutSteps")
    if not isinstance(steps, list) or not steps:
        return "ohne Schritte"
    for x in steps:
        f = schritt(x, False, 1)
        if f:
            return f
    if zaehler["n"] > MAX_SCHRITTE:
        return f"zu viele Schritte ({zaehler['n']})"
    if zaehler["s"] > 12 * 3600:
        return "länger als 12 h"
    return None


def pruefen(a):
    """Eingabe «garmin_senden» von der Seite → Fehlertext oder None. ID «gs-<Datum>», modus senden/auto/aus, Tag heute bis eine Woche nach dem
    Erstellen (nie zurück), Einheiten mit eindeutiger Kennung, bekannter Quelle und gültigem Workout bzw. Workout-ID der Bibliothek."""
    if not isinstance(a, dict):
        return "kein Auftrag"
    d = _datum(a.get("date"))
    if not d:
        return "kein Datum"
    if a.get("id") != "gs-" + d.isoformat():
        return "ID passt nicht zum Datum"
    if a.get("modus") not in ("senden", "auto", "aus"):
        return f"unbekannter Modus {a.get('modus')!r}"
    t = _zeit(a.get("erstellt"))
    if not t:
        return "ohne Zeitpunkt"
    e0 = t.astimezone(TZ).date()
    if a["modus"] != "aus" and not e0 <= d <= e0 + dt.timedelta(days=MAX_TAGE):
        return "Tag liegt zurück oder mehr als eine Woche voraus"
    E = a.get("einheiten")
    if not isinstance(E, list) or len(E) > 12:
        return "Einheiten ungültig"
    if a["modus"] == "aus" and E:
        return "«aus» ohne Einheiten"
    uids = set()
    for u in E:
        if not isinstance(u, dict) or not isinstance(u.get("uid"), str) or not u["uid"] or len(u["uid"]) > 60 or u["uid"] in uids:
            return "Einheit ohne eindeutige Kennung"
        uids.add(u["uid"])
        if u.get("quelle") not in QUELLEN:
            return "unbekannte Quelle"
        if not isinstance(u.get("titel", ""), str) or len(u.get("titel", "")) > 120 or not isinstance(u.get("fassung"), str) or not 1 <= len(u["fassung"]) <= 40:
            return "Titel oder Fassung ungültig"
        if u["quelle"] == "bibliothek":
            if not isinstance(u.get("wid"), int) or isinstance(u.get("wid"), bool) or u["wid"] <= 0 or "workout" in u:
                return "Bibliothek ohne Workout-ID"
            continue
        f = workout_pruefen(u.get("workout"))
        if f:
            return f"{u.get('titel') or u['uid']}: {f}"
    if not isinstance(a.get("ohne", []), list):
        return "Liste «ohne» ungültig"
    return None


def _jetzt(arg=None):
    if arg:
        t = dt.datetime.fromisoformat(arg)
        return t if t.tzinfo else t.replace(tzinfo=TZ)
    return dt.datetime.now(TZ)


def plan(D, jetzt):
    """Was zu tun ist. → {v, jetzt, aktionen [{nr, art, auftrag, date, uid, …}], abschluesse [{auftrag, status, grund}], warten_bis}"""
    jetzt = jetzt.astimezone(TZ)
    heute, morgen = jetzt.date(), jetzt.date() + dt.timedelta(days=1)
    G = [g for g in D.get("plan_garmin") or [] if isinstance(g, dict) and not g.get("entfernt")]
    aktionen, abschluesse, warten = [], [], None
    nr = 0

    def neu(**k):
        nonlocal nr
        nr += 1
        aktionen.append(dict(nr=nr, **k))
        return nr

    def austragen(g, auftrag, grund, nach=None):
        # nach = Nummer der Aktion, die vorher klappen muss (neue Fassung zuerst senden, dann die alte austragen: scheitert das Senden, bleibt die alte)
        neu(art="austragen", auftrag=auftrag, date=g["date"], uid=g["uid"], titel=g.get("titel"), scheduled_id=g.get("scheduled_id"),
            workout_id=g.get("workout_id"), loeschen=g.get("quelle") != "bibliothek" and bool(g.get("workout_id")),
            vorhanden=bool(g.get("vorhanden")), grund=grund, **({"nach": nach} if nach else {}))

    erledigt = set()
    offen = [x for x in D.get("garmin_auftraege") or [] if isinstance(x, dict) and x.get("status") == "offen"]
    neuester = {}                                         # Einheit → Tag laut dem neuesten Auftrag (verschoben: der neue Tag gilt)
    for a in sorted(offen, key=lambda x: str(x.get("erstellt") or "")):
        for u in a.get("einheiten") or []:
            if isinstance(u, dict) and u.get("uid"):
                neuester[u["uid"]] = a.get("date")
    def faellig(a):
        d = _datum(a.get("date"))
        return bool(d) and a.get("modus") in ("senden", "auto") and d > heute and (a["modus"] == "senden" or (d == morgen and jetzt.time() >= AB_UHR))
    jetzt_dran = {a.get("date") for a in offen if faellig(a)}   # Tage, die in diesem Lauf gesendet werden
    for a in sorted(offen, key=lambda x: x.get("date") or ""):
        d = _datum(a.get("date"))
        if not d:
            continue
        if a.get("modus") == "aus":
            abschluesse.append({"auftrag": a["id"], "status": "aus", "grund": "automatisch senden abgestellt"})
            continue
        if d <= heute:
            abschluesse.append({"auftrag": a["id"], "status": "verpasst", "grund": "Tag schon da – im Chat senden"})
            continue
        if a.get("modus") == "auto":
            if d > morgen:
                continue
            if jetzt.time() < AB_UHR:
                warten = dt.datetime.combine(heute, AB_UHR, TZ).isoformat()
                continue
        ds = d.isoformat()
        U = [u for u in a.get("einheiten") or [] if neuester.get(u["uid"]) == ds]
        R = [g for g in G if g.get("date") == ds]
        for u in U:
            r = next((g for g in R if g.get("uid") == u["uid"]), None)
            k = None
            if not (r and r.get("fassung") == u.get("fassung")):
                if u.get("quelle") == "bibliothek":
                    k = neu(art="einplanen", auftrag=a["id"], date=ds, uid=u["uid"], titel=u.get("titel"), quelle="bibliothek", sport=u.get("sport"),
                            wid=u["wid"], fassung=u.get("fassung"))
                else:
                    k = neu(art="hochladen", auftrag=a["id"], date=ds, uid=u["uid"], titel=u.get("titel"), quelle=u.get("quelle"), sport=u.get("sport"),
                            fassung=u.get("fassung"), workout=u.get("workout"))
                if r:
                    erledigt.add(id(r))
                    austragen(r, a["id"], "geändert", nach=k)
            for g in G:                                       # dieselbe Einheit an einem anderen Tag gesendet (verschoben): dort austragen,
                if g.get("uid") == u["uid"] and g.get("date") != ds and g.get("date", "") >= heute.isoformat() and id(g) not in erledigt:
                    erledigt.add(id(g))                       # erst wenn sie am neuen Tag angekommen ist
                    austragen(g, a["id"], f"verschoben auf {ds}", nach=k)
        uids = {u["uid"] for u in U}
        for g in R:
            weiter = neuester.get(g.get("uid"))                # verschoben auf einen Tag, der jetzt auch gesendet wird: dort austragen (mit «nach»)
            if weiter and weiter != ds and weiter in jetzt_dran:
                continue
            if g.get("uid") not in uids and id(g) not in erledigt:
                erledigt.add(id(g))
                austragen(g, a["id"], "nicht mehr im Plan")
        if not any(x["auftrag"] == a["id"] for x in aktionen):
            abschluesse.append({"auftrag": a["id"], "status": "erledigt", "grund": "schon so in Garmin"})
    return {"v": V, "jetzt": jetzt.isoformat(timespec="seconds"), "aktionen": aktionen, "abschluesse": abschluesse, "warten_bis": warten}


def _flach(steps, k=1):
    out = []
    for s in steps or []:
        if s.get("type") == "RepeatGroupDTO" or (s.get("stepType") or {}).get("stepTypeKey") == "repeat":
            n = s.get("numberOfIterations") or s.get("endConditionValue")
            out.append(("wdh", int(n) if _num(n) else None))
            out += _flach(s.get("workoutSteps"), k)
            out.append(("ende",))
        else:
            out.append(("schritt", (s.get("stepType") or {}).get("stepTypeKey"), (s.get("endCondition") or {}).get("conditionTypeKey"),
                        s.get("endConditionValue"), (s.get("targetType") or {}).get("workoutTargetTypeKey"), s.get("targetValueOne"), s.get("targetValueTwo")))
    return out


def rueck(soll, ist):
    """Rücklese: das gespeicherte Workout (get_workout_by_id raw) gegen das gesendete. → Liste der Abweichungen (leer = gleich)."""
    if isinstance(ist, dict) and "workout" in ist and "workoutSegments" not in ist:
        ist = ist["workout"]
    A = _flach(soll["workoutSegments"][0]["workoutSteps"])
    segs = (ist or {}).get("workoutSegments") or []
    B = _flach(segs[0].get("workoutSteps") if segs else [])
    ab = []
    if (ist or {}).get("workoutName") != soll.get("workoutName"):
        ab.append("Name")
    if len(A) != len(B):
        return ab + [f"{len(B)} statt {len(A)} Schritte"]
    for i, (a, b) in enumerate(zip(A, B), 1):
        if a[0] != b[0]:
            ab.append(f"Schritt {i}: Aufbau")
            continue
        if a[0] == "wdh" and a[1] != b[1]:
            ab.append(f"Schritt {i}: {b[1]} statt {a[1]} Wiederholungen")
        if a[0] != "schritt":
            continue
        if a[1:3] != b[1:3] or not _num(b[3]) or abs(b[3] - a[3]) > 1:
            ab.append(f"Schritt {i}: Art oder Dauer")
        if a[4] != b[4]:
            ab.append(f"Schritt {i}: Ziel {b[4]} statt {a[4]}")
        for x, y in ((a[5], b[5]), (a[6], b[6])):
            if x is None and y in (None, 0, 0.0):
                continue
            if not _num(y) or abs(y - x) > max(0.01, abs(x) * 0.005):
                ab.append(f"Schritt {i}: Zielwert {y} statt {x}")
                break
    return ab


def eintragen(D, P, ergebnis, jetzt=None):
    """Ergebnisse der Garmin-Aufrufe eintragen: plan_garmin (Vermerk je gesendeter Einheit), Status der Aufträge, Audit. → Meldungen."""
    jetzt = (jetzt or dt.datetime.now(TZ)).astimezone(TZ).isoformat(timespec="seconds")
    R = {int(r["nr"]): r for r in ergebnis if isinstance(r, dict) and _num(r.get("nr"))}
    G = D.setdefault("plan_garmin", [])
    A = {a.get("id"): a for a in D.get("garmin_auftraege") or [] if isinstance(a, dict)}
    audit = D.setdefault("audit", [])
    fehler, msg = {}, []
    for x in P.get("aktionen") or []:
        r = R.get(int(x["nr"]))
        if not r or not r.get("ok"):
            fehler.setdefault(x["auftrag"], []).append(f"{x.get('titel') or x['uid']}: {(r or {}).get('fehler') or 'nicht ausgeführt'}")
            continue
        if x["art"] == "austragen":
            for g in G:
                if g.get("uid") == x["uid"] and g.get("date") == x["date"] and not g.get("entfernt") \
                        and g.get("scheduled_id") == x.get("scheduled_id") and g.get("workout_id") == x.get("workout_id"):
                    g["entfernt"] = jetzt
                    g["grund_entfernt"] = x.get("grund")
            audit.append({"zeit": jetzt, "was": "Garmin: ausgetragen", "id": x["uid"], "date": x["date"], "grund": x.get("grund")})
            msg.append(f"ausgetragen {x['date']} {x.get('titel') or x['uid']}")
        else:
            # ohne Kalender-ID (Garmin-Liste noch nicht nachgeführt): eingeplant ist es trotzdem; beim Austragen wird die ID gesucht
            g = {"uid": x["uid"], "date": x["date"], "quelle": x.get("quelle"), "titel": x.get("titel"), "sport": x.get("sport"),
                 "fassung": x.get("fassung"), "workout_id": r.get("workout_id") if x["art"] == "hochladen" else x.get("wid"),
                 "scheduled_id": r.get("scheduled_id"), "gesendet": jetzt, "auftrag": x["auftrag"], "v": V}
            if x["art"] == "einplanen":
                g["wid"] = x.get("wid")
                g["vorhanden"] = bool(r.get("vorhanden"))
            G.append(g)
            audit.append({"zeit": jetzt, "was": "Garmin: gesendet" if x["art"] == "hochladen" else "Garmin: eingeplant", "id": x["uid"], "date": x["date"]})
            msg.append(f"{'gesendet' if x['art'] == 'hochladen' else 'eingeplant'} {x['date']} {x.get('titel') or x['uid']}")
    betroffen = {x["auftrag"] for x in P.get("aktionen") or []}
    for aid in betroffen:
        a = A.get(aid)
        if not a:
            continue
        if aid in fehler:
            a.update(status="fehler", fehler=fehler[aid], geprueft=jetzt)
        else:
            a.update(status="erledigt", erledigt=jetzt)
            a.pop("fehler", None)
    for s in P.get("abschluesse") or []:
        a = A.get(s["auftrag"])
        if a and a.get("status") == "offen":
            a.update(status=s["status"], grund=s.get("grund"), geprueft=jetzt)
    return msg, fehler


def main(argv):
    if len(argv) >= 3 and argv[1] == "plan":
        jetzt = _jetzt(argv[argv.index("--jetzt") + 1] if "--jetzt" in argv else None)
        D = json.load(open(argv[2], encoding="utf-8"))
        print(json.dumps(plan(D, jetzt), ensure_ascii=False, indent=1))
        return 0
    if len(argv) == 5 and argv[1] == "rueck":
        P = json.load(open(argv[2], encoding="utf-8"))
        x = next((a for a in P.get("aktionen") or [] if a["nr"] == int(argv[3])), None)
        if not x or x["art"] != "hochladen":
            print("RÜCKLESEN: keine Aktion «hochladen» mit dieser Nummer")
            return 2
        ab = rueck(x["workout"], json.load(open(argv[4], encoding="utf-8")))
        print("RÜCKLESEN: gleich" if not ab else "RÜCKLESEN: abweichend – " + "; ".join(ab[:8]))
        return 0 if not ab else 1
    if len(argv) == 5 and argv[1] == "eintragen":
        D = json.load(open(argv[2], encoding="utf-8"))
        P = json.load(open(argv[3], encoding="utf-8"))
        E = json.load(open(argv[4], encoding="utf-8"))
        msg, fehler = eintragen(D, P, E.get("garmin_ergebnis") if isinstance(E, dict) else E)
        tmp = argv[2] + ".tmp"                          # atomar schreiben: bricht etwas ab, bleibt data.json wie vorher
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(D, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, argv[2])
        print("GARMIN:", "; ".join(msg) or "nichts gesendet")
        for aid, f in fehler.items():
            print(f"GARMIN FEHLER {aid}: {'; '.join(f)}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
