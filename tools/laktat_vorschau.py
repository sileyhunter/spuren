"""Import-Vorschau für Laktatwerte (Umsetzungsplan A5): liest Tabellen, ordnet sie den Stufen aus den
Sekundenwerten zu und speichert alles als «Vorschau». Nichts wird als Test übernommen, bevor Silas bestätigt.

Aufruf:
  python3 -I tools/laktat_vorschau.py data.json --raw <rohordner> [--files work/files.json]
          --xlsx <datei.xlsx> [--xlsx …] [--extra work/laktat_extra.json]

--xlsx   Vorlage «Automatische Schwellenberechnungen bei Laktatstufentests» der SOMC Magglingen (Blatt Stufentestdaten)
--extra  weitere Werte mit Quelle (z. B. abgeschriebene Laborberichte, Werte aus dem Chat), Format siehe unten

Regeln (Konzept Abschnitt 2, Excel-Import):
- Jede Zeile wird der Stufe aus den Sekundenwerten derselben Aktivität zugeordnet. Weicht die Leistung um mehr als
  5 W ab (Lauf 0,3 km/h) oder fehlt die Aktivität, bleibt die Zeile «unklar», bis Silas bestätigt.
- Der Puls kommt aus der FIT-Datei (30 s vor der Blutentnahme). Weicht die Tabelle mehr als 3 bpm ab, stehen beide da.
- Jeder Wert speichert seine Herkunft (Datei, Blatt, Zelle). Fehlende Laktatwerte bleiben leer; nichts wird interpoliert.

Format --extra: [{"id","art":"stufentest"|"check","sport","datum","quelle","aktivitaet_fit": "<FIT-Name>"
                  oder "aktivitaet_garmin": "<gespeicherte get_activity_fit_data-Antwort>", "aktivitaet_id": "g…",
                  "zeilen":[{"x":160,"la":1.11,"hf":141,"zelle":"S. 1, Tabelle 2, Zeile 3", …}], "hinweise":[…]}]
"""
import argparse
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import series  # noqa: E402
import stufen  # noqa: E402

VERSION = "laktat-vorschau-1.0"
TOL = {"rad": 5.0, "lauf": 0.3}
TOL_HR = 3.0
ZRH = dt.timezone(dt.timedelta(hours=1))


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def read_somc(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Stufentestdaten"]
    mode = "lauf" if "km/h" in str(ws["C8"].value or "") else "rad"
    datum = ws["L6"].value
    kopf = {"name": ws["C6"].value, "gewicht": ws["H6"].value, "datum": datum.strftime("%d.%m.%Y") if hasattr(datum, "strftime") else datum,
            "titel": ws["B3"].value, "vorlage": ws["B4"].value}
    zeilen, hinweise = [], []
    for r in range(9, 21):
        nr, x, la, hf, borg = (ws.cell(r, c).value for c in (2, 3, 4, 5, 6))
        if x is None and la is None and hf is None:
            continue
        z = {"stufe": nr, "x": _num(x), "la": _num(la), "hf": _num(hf), "borg": _num(borg),
             "quelle": {"blatt": "Stufentestdaten", "x": f"C{r}", "la": f"D{r}", "hf": f"E{r}", "borg": f"F{r}"}}
        if la is not None and _num(la) is None:
            hinweise.append(f"Stufe {nr}: Laktatfeld enthält «{la}» (keine Zahl), nicht verwendet")
        if _num(x) is not None and z["la"] is None:
            hinweise.append(f"Stufe {nr}: Leistung {x} ohne Laktatwert; die Vorlage rechnet solche Stufen mit dem Wert der Vorstufe")
            z["ohne_laktat"] = True
        zeilen.append(z)
    if not isinstance(_num(ws["H6"].value), (int, float)):
        hinweise.append(f"Feld Gewicht enthält Text «{ws['H6'].value}»; Watt pro kg rechnet die Vorlage deshalb nicht")
    cells = {"rad": {"AeS": ("E28", "F28", "H28"), "AnS": ("E30", "F30", "H30"), "2 mmol/l": (None, "K28", "M28"), "4 mmol/l": (None, "K30", "M30")},
             "lauf": {"AeS": ("F28", "G28", "H28"), "AnS": ("F30", "G30", "H30"), "2 mmol/l": (None, "L28", "M28"), "4 mmol/l": (None, "L30", "M30")}}[mode]
    excel = {}
    for k, (cla, cx, chf) in cells.items():
        e = {"la": _num(ws[cla].value) if cla else None, "x": _num(ws[cx].value), "hf": _num(ws[chf].value), "zellen": [c for c in (cla, cx, chf) if c]}
        if e["x"] is not None:
            excel[k] = e
    return {"sport": mode, "datum": datum.date().isoformat() if hasattr(datum, "date") else None, "kopf": kopf,
            "zeilen": zeilen, "hinweise": hinweise, "excel": excel}


def load_sessions(raw_files, fitname):
    p = next((f["path"] for f in raw_files if f["path"].endswith(fitname) or fitname in f["path"]), None)
    return (series.from_fit(p), p) if p else ([], None)


def find_activity(D, raw_files, datum, sport):
    """Sucht die Aktivität des Tages mit erkannter Stufenfolge (FIT-Rohdaten nötig)."""
    cands = [a for a in D.get("activities", []) if a["date"] == datum and a["sport"] == sport]
    best = None
    for a in cands:
        key = a["id"].split("-")[0] if not a["id"].startswith("zwift") else a["id"]
        S_list, p = load_sessions(raw_files, key if key.startswith("zwift") else f"_{key}.fit")
        for S in S_list:
            r = stufen.stufen(S)
            if r and (best is None or r["n"] > best[1]["n"]):
                best = (a, r, S, p)
    return best


def match(rows, st, sport):
    """Zeilen der Tabelle den erkannten Stufen zuordnen (gleiche Reihenfolge, Toleranz je Sportart)."""
    tol = TOL[sport]
    stages = st["stufen"] if st else []
    used = set()
    lo = min((s["x"] for s in stages), default=None)
    for z in rows:
        z["fit"] = None
        if z.get("x") is not None and lo is not None and z["x"] < lo - tol:
            z["status"] = "ohne Sekundenwerte"
            z["regel"] = "Stufe vor Beginn der Aufzeichnung; Werte nur aus der Quelle"
            continue
        if z.get("x") is None:
            z["status"] = "unklar"
            z["regel"] = "keine Leistung bzw. kein Tempo in der Tabelle"
            continue
        if z.get("la") is None:
            z["status"] = "ohne Laktat"
            z["regel"] = "Feld Laktat leer; Zeile zählt nicht"
            continue
        best = None
        for s in stages:
            if s["nr"] in used:
                continue
            d = abs(s["x"] - z["x"]) if sport == "lauf" else abs(s["soll"] - z["x"])
            if best is None or d < best[0]:
                best = (d, s)
        if best and abs(best[1]["x"] - z["x"]) <= tol:
            s = best[1]
            used.add(s["nr"])
            z["fit"] = {"nr": s["nr"], "x": s["x"], "hr_vor": s.get("hr_vor"), "hr60": s.get("hr60"),
                        "dx": round(s["x"] - z["x"], 2), "dhf": round(s["hr_vor"] - z["hf"], 1) if s.get("hr_vor") and z.get("hf") else None}
            z["status"] = "eindeutig"
            z["regel"] = f"Stufe {s['nr']} der Aktivität, Abstand {abs(round(s['x'] - z['x'], 1))} {'km/h' if sport == 'lauf' else 'W'} (Grenze {tol})"
            if z["fit"]["dhf"] is not None and abs(z["fit"]["dhf"]) > TOL_HR:
                z["hinweis"] = f"Puls Tabelle {z['hf']} gegen FIT {s['hr_vor']} bpm: beide stehen da"
        else:
            z["status"] = "unklar"
            z["regel"] = "keine passende Stufe in den Sekundenwerten" if stages else "keine Aktivität mit Stufen gefunden"
    return rows


def duplicate_of(a, b):
    ka = [(z["x"], z["la"], z["hf"]) for z in a["zeilen"] if z.get("la") is not None]
    kb = [(z["x"], z["la"], z["hf"]) for z in b["zeilen"] if z.get("la") is not None]
    return a["datum"] == b["datum"] and ka == kb and ka


def stufen_entry(a, st, p):
    return {"id": a["id"], "date": a["date"], "sport": a["sport"], "name": a.get("name"), "datei": os.path.basename(p) if p else None,
            "quelle": "FIT-Sekundenwerte", **{k: v for k, v in st.items() if k != "stufen"},
            "stufen": [{k: v for k, v in s.items() if k not in ("t0", "t1")} | {"uhr": dt.datetime.fromtimestamp(s["t1"], dt.timezone.utc).astimezone(ZRH_TZ).strftime("%H:%M:%S")} for s in st["stufen"]]}


try:
    import zoneinfo
    ZRH_TZ = zoneinfo.ZoneInfo("Europe/Zurich")
except Exception:  # pragma: no cover
    ZRH_TZ = ZRH


def zeitpunkt(S, t1):
    """V5.9.6 (laktat-drift-1.0): Blockende in der Einheit und die Pause für die Messung danach.
    t_s = Fahrzeit (Timer) bis zum Blockende: Abstände zwischen Datensätzen bis 10 s zählen ganz, längere Lücken
    (Timer gestoppt) als 1 s. el_s = Zeit ab Start (Uhr). pause_s = vom Blockende bis zum Weiterfahren (mind. 30 s am Stück),
    pause_timer_s = davon mit gestopptem Timer. Ohne Anhalten in den 3 min nach dem Block: pause_s = 0."""
    ts = S.ts
    if not ts or t1 is None:
        return {}
    k = max((i for i, t in enumerate(ts) if t <= t1), default=None)
    if k is None:
        return {}
    fahr = 1.0
    for i in range(1, k + 1):
        d = ts[i] - ts[i - 1]
        fahr += d if d <= 10 else 1
    out = {"t_s": int(round(fahr)), "el_s": int(round(t1 - S.start)) if S.start else None}
    j0, stop0 = None, None
    for i in range(k + 1, len(ts)):
        if ts[i] - t1 > 180:
            break
        if ts[i] - ts[i - 1] > 10:
            j0, stop0 = i, ts[i - 1] + 1
            break
        if not stufen._ride(S, i):
            j0, stop0 = i, ts[i]
            break
    if j0 is None:
        out["pause_s"], out["pause_timer_s"] = 0, 0
        return out
    m = None
    for i in range(j0, len(ts)):
        seg = range(i, min(i + 30, len(ts)))
        if len(seg) == 30 and all(stufen._ride(S, q) for q in seg) and all(ts[q] - ts[q - 1] <= 2 for q in seg if q > i):
            m = i
            break
    ende = ts[m] if m is not None else ts[-1]
    out["pause_s"] = int(round(ende - stop0))
    out["pause_timer_s"] = int(sum(ts[i] - ts[i - 1] - 1 for i in range(max(j0, 1), (m if m is not None else len(ts) - 1) + 1) if ts[i] - ts[i - 1] > 10))
    if m is None:
        out["pause_s"] = None                  # nicht weitergefahren (Ende der Einheit)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--raw", required=False)
    ap.add_argument("--files", default="work/files.json")
    ap.add_argument("--xlsx", action="append", default=[])
    ap.add_argument("--extra")
    args = ap.parse_args()
    D = json.load(open(args.data, encoding="utf-8"))
    raw_files = json.load(open(args.files)) if os.path.exists(args.files) else []
    today = dt.date.today().isoformat()
    previews, stufen_list = [], {s["id"]: s for s in D.get("stufen", [])}
    items = []
    for path in args.xlsx:
        t = read_somc(path)
        t.update({"datei": os.path.basename(path), "art": "stufentest", "vorlage": "SOMC Magglingen 2015, mod. Dmax"})
        items.append(t)
    if args.extra:
        for e in json.load(open(args.extra, encoding="utf-8")):
            e.setdefault("hinweise", [])
            items.append(e)
    # Doppel erkennen: gleiche Werte, gleiches Datum -> die Datei mit Fehlern gilt als Kopie
    for i, a in enumerate(items):
        for b in items[:i]:
            if a.get("art") == "stufentest" and b.get("art") == "stufentest" and duplicate_of(a, b):
                worse = a if len(a["hinweise"]) >= len(b["hinweise"]) else b
                other = b if worse is a else a
                worse["duplikat_von"] = other.get("datei")
    for t in items:
        sport, datum = t["sport"], t["datum"]
        if not any(z.get("x") is not None or z.get("la") is not None for z in t["zeilen"]):
            print(f"leer, nicht verwendet: {t.get('datei')}")
            continue
        pid = t.get("id") or f"{t.get('art', 'test')}-{datum}-{sport}" + ("-kopie" if t.get("duplikat_von") else "")
        entry = {"id": pid, "v": VERSION, "status": "vorschau", "art": t.get("art", "stufentest"), "sport": sport, "datum": datum,
                 "datei": t.get("datei") or t.get("quelle"), "vorlage": t.get("vorlage"), "kopf": t.get("kopf"),
                 "importiert": today, "hinweise": list(t["hinweise"]), "excel": t.get("excel")}
        if t.get("duplikat_von"):
            entry["status"] = "verworfen"
            entry["hinweise"].insert(0, f"Kopie von {t['duplikat_von']} mit Eingabefehlern; nicht verwendet")
        found = None
        if t.get("aktivitaet_garmin"):                 # Sekundenwerte aus der Garmin-Verbindung (Nacht-Update-Weg)
            S = series.from_garmin(t["aktivitaet_garmin"], t.get("aktivitaet_garmin_msg"))[0]
            act = next((a for a in D.get("activities", []) if a["id"] == t.get("aktivitaet_id")), None)
            found = (act, stufen.stufen(S), S, None) if act else None
        elif t.get("aktivitaet_fit"):
            S_list, p = load_sessions(raw_files, t["aktivitaet_fit"])
            S = S_list[0] if S_list else None
            r = stufen.stufen(S) if S else None
            act = next((a for a in D.get("activities", []) if t["aktivitaet_fit"].split(".")[0].split("_")[-1] in a["id"]), None)
            found = (act, r, S, p) if act else None
        elif raw_files and datum:
            found = find_activity(D, raw_files, datum, sport)
        st = found[1] if found else None
        entry["aktivitaet"] = found[0]["id"] if found else None
        entry["zeilen"] = match([dict(z) for z in t["zeilen"]], st, sport) if t.get("art") != "check" else t["zeilen"]
        for z in entry["zeilen"]:
            if z.get("la") is not None and not z.get("quelle") and not z.get("zelle"):
                raise SystemExit(f"Laktatwert ohne Quelle in {entry['id']}: {z}")
            if z.get("zelle") and not z.get("quelle"):
                z["quelle"] = {"stelle": z.pop("zelle")}
        if t.get("art") == "check":
            entry["zuordnung"] = "unklar"
            S = found[2] if found else None
            if S is not None:                      # Kandidaten: Blöcke mit der Leistung des Checks
                x = t["zeilen"][0]["x"]
                cand = []
                runs = stufen._runs_target(S) or stufen._runs_plateau(S, "pw")   # ohne Zwift-Zielleistung: Plateaus
                if t.get("fenster"):                   # Blockgrenzen aus der Quelle (Ortszeit), z. B. ["19:26:00", "19:33:00"]
                    d0 = dt.date.fromisoformat(t["datum"])
                    a, b = (dt.datetime.combine(d0, dt.time.fromisoformat(h), ZRH_TZ).timestamp() for h in t["fenster"])
                    idx = [i for i, ts in enumerate(S.ts) if a <= ts <= b]
                    runs = [{"idx": idx, "level": x}] if idx else []
                for r in runs:
                    ride = [i for i in r["idx"] if stufen._ride(S, i)]
                    if abs(r["level"] - x) <= TOL["rad"] and len(ride) >= 300:
                        r["ride"] = ride
                        b = stufen.block(S, r)
                        b.update(zeitpunkt(S, b["t1"]))             # V5.9.6 laktat-drift-1.0: Zeit in der Einheit, Pause für die Messung
                        b["uhr"] = dt.datetime.fromtimestamp(b.pop("t1"), dt.timezone.utc).astimezone(ZRH_TZ).strftime("%H:%M")
                        b.pop("t0", None)
                        cand.append(b)
                entry["kandidaten"] = cand
                entry["regel"] = f"{len(cand)} Blöcke bei {x} W in der Aktivität; Zuordnung offen"
                if t.get("block"):
                    entry["block"] = t["block"]
                if t.get("fenster"):
                    entry["fenster"] = t["fenster"]
                if t.get("zuordnung"):                 # von Silas angegeben (z. B. «letzter Block»)
                    entry["zuordnung"], entry["regel"] = t["zuordnung"], t.get("zuordnung_regel", entry["regel"])
        else:
            n_ok = sum(1 for z in entry["zeilen"] if z.get("status") == "eindeutig")
            n_la = sum(1 for z in entry["zeilen"] if z.get("la") is not None and z.get("status") != "ohne Sekundenwerte")
            entry["zuordnung"] = "eindeutig" if found and n_ok == n_la else "unklar"
            entry["regel"] = f"{n_ok} von {n_la} Laktatwerten einer Stufe zugeordnet (Leistung ±{TOL[sport]:g} {'km/h' if sport == 'lauf' else 'W'}, Puls ±{TOL_HR:g} bpm)"
        if found and st and stufen.relevant(st):
            stufen_list[found[0]["id"]] = stufen_entry(found[0], st, found[3])
        previews.append(entry)
    prev = {p["id"]: p for p in D.get("laktat_vorschau", [])}
    for e in previews:                             # Antworten von Silas aus früheren Läufen bleiben erhalten
        for h in (prev.get(e["id"]) or {}).get("hinweise", []):
            if "(Silas, " in h and h not in e["hinweise"]:
                e["hinweise"].append(h)
        if any(h.startswith("Feld Gewicht «") for h in e["hinweise"]):
            e["hinweise"] = [h for h in e["hinweise"] if not h.startswith("Feld Gewicht enthält")]
    old = [p for p in D.get("laktat_vorschau", []) if p["id"] not in {e["id"] for e in previews}]
    D["laktat_vorschau"] = sorted(old + previews, key=lambda e: (e.get("datum") or "", e["id"]))
    D["stufen"] = sorted(stufen_list.values(), key=lambda s: s["date"])
    json.dump(D, open(args.data, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for e in D["laktat_vorschau"]:
        print(f"{e['datum']} {e['sport']:5s} {e['status']:9s} {e['zuordnung'] if 'zuordnung' in e else '':9s} {e.get('aktivitaet')} · {e.get('regel', '')}")
        for h in e["hinweise"]:
            print("     -", h)


if __name__ == "__main__":
    main()
