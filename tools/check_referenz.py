"""Referenzsatz und Neuberechnung (Umsetzungsplan A1, Abnahmen A1, A3, A5).

  python3 -I tools/check_referenz.py data.json --files work/files.json --raw-acts work/acts_raw.json [--init work/referenz_init.json]

--init   legt den Referenzsatz in data.json an (10 Einheiten mit von Hand geprüften Werten, siehe Datei)
Danach bei jedem Lauf:
  1. Referenzsatz: jede Einheit aus der FIT-Datei neu berechnen; alle gespeicherten Werte müssen gleich bleiben (A1).
  2. Zeitbegriffe gegen die Handwerte: Bewegungszeit höchstens 1 % daneben (A3).
  3. Stufentests: alle Stufen erkannt, Leistung höchstens 3 W neben der Zielleistung, kein Laktat ohne Quelle (A5).
  4. Alle Aktivitäten: neu berechnete Felder gegen die in data.json gespeicherten (A1).
Ergebnis steht in data.json unter referenz.pruefung (die Seite zeigt es) und als Liste auf der Konsole.
Der Referenzsatz liegt nur verschlüsselt in data.json, nie offen im Repository.
"""
import argparse
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kennzahlen  # noqa: E402
import series  # noqa: E402

VERSION = "referenz-1.0"
ZEIT_KEYS = ("el", "mv", "st", "nst", "un", "rc", "ac", "us")
OLD_KEYS = ("km", "hm", "dur", "hr", "watt", "np", "tss", "zones", "hh", "poly")


def fit_path(files, aid):
    key = aid if aid.startswith("zwift") else f"_{aid.split('-')[0]}.fit"
    return next((f["path"] for f in files if key in f["path"]), None)


def compute(path):
    S = series.from_fit(path)[0]
    f, z = kennzahlen.alles(S)
    st = f.get("stufen")
    return {**{k: f[k] for k in ZEIT_KEYS}, "timer": z["timer"],
            "stufen_n": st["n"] if st else 0,
            "stufen_x": [s["x"] for s in st["stufen"]] if st else [],
            "stufen_soll": [s["soll"] for s in st["stufen"]] if st else [],
            "stufen_hr_vor": [s["hr_vor"] for s in st["stufen"]] if st else []}, f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--files", default="work/files.json")
    ap.add_argument("--raw-acts", default="work/acts_raw.json")
    ap.add_argument("--init")
    a = ap.parse_args()
    D = json.load(open(a.data, encoding="utf-8"))
    files = json.load(open(a.files))
    today = dt.date.today().isoformat()
    if a.init:
        units = []
        for u in json.load(open(a.init, encoding="utf-8")):
            p = fit_path(files, u["id"])
            if not p:
                raise SystemExit(f"FIT-Datei fehlt: {u['id']}")
            exp, _ = compute(p)
            units.append({**u, "erwartet": exp, "versionen": {k: v["v"] for k, v in kennzahlen.VERSIONS.items()}})
        D["referenz"] = {"v": VERSION, "erstellt": today, "einheiten": units}
    R = D.get("referenz")
    if not R:
        raise SystemExit("kein Referenzsatz in data.json (zuerst --init)")
    abw, a3, a5 = [], [], []
    for u in R["einheiten"]:
        p = fit_path(files, u["id"])
        if not p:
            abw.append({"id": u["id"], "was": "FIT-Datei fehlt"})
            continue
        got, f = compute(p)
        for k, v in u["erwartet"].items():
            if got.get(k) != v:
                abw.append({"id": u["id"], "name": u["name"], "wert": k, "gespeichert": v, "neu": got.get(k)})
        h = u.get("hand") or {}
        if h.get("mv"):
            d = (got["mv"] - h["mv"]) / h["mv"] * 100
            a3.append({"id": u["id"], "name": u["name"], "mv": got["mv"], "hand": h["mv"], "abw_pct": round(d, 2), "ok": abs(d) <= 1.0})
        if u.get("stufen_soll"):
            tol = u.get("toleranz", 3)
            dx = [round(x - s, 2) for x, s in zip(got["stufen_x"], u["stufen_soll"])]
            ok = got["stufen_n"] == len(u["stufen_soll"]) and all(abs(v) <= tol for v in dx)
            a5.append({"id": u["id"], "name": u["name"], "n": got["stufen_n"], "soll_n": len(u["stufen_soll"]), "dx": dx,
                       "toleranz": tol, "grund": u.get("toleranz_grund"), "ok": ok})
    # kein Laktatwert ohne Quelle
    ohne = [(p["id"], z.get("stufe")) for p in D.get("laktat_vorschau", []) for z in p.get("zeilen", [])
            if z.get("la") is not None and not z.get("quelle")]
    ohne += [(l.get("date"), l.get("kind")) for l in D.get("lactate", []) if l.get("lactate") is not None and not (l.get("quelle") or l.get("note") or l.get("activity"))]
    # alle Aktivitäten: gespeicherte Felder gegen Neuberechnung (nur Einheiten aus dem FIT-Export)
    alle = {"n": 0, "gleich": 0, "abweichungen": []}
    if os.path.exists(a.raw_acts):
        raw = {x["id"]: x for x in json.load(open(a.raw_acts, encoding="utf-8"))}
        for act in D["activities"]:
            r = raw.get(act["id"])
            if r is None:
                continue
            alle["n"] += 1
            bad = [k for k in OLD_KEYS + ZEIT_KEYS if k in act and act.get(k) != r.get(k)]
            if bad:
                alle["abweichungen"].append({"id": act["id"], "date": act["date"], "felder": bad})
            else:
                alle["gleich"] += 1
        alle["abweichungen"] = alle["abweichungen"][:50]
    ok = not abw and all(x["ok"] for x in a3) and all(x["ok"] for x in a5) and not ohne and not alle["abweichungen"]
    R["pruefung"] = {"datum": today, "ok": ok, "einheiten": len(R["einheiten"]), "abweichungen": abw, "a3": a3, "a5": a5,
                     "laktat_ohne_quelle": len(ohne), "alle": alle,
                     "versionen": {k: v["v"] for k, v in kennzahlen.VERSIONS.items()}}
    json.dump(D, open(a.data, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"Referenzsatz: {len(R['einheiten'])} Einheiten, Abweichungen: {len(abw)}")
    for x in abw:
        print("  ", x)
    print("A3 Bewegungszeit gegen Handwerte:")
    for x in a3:
        print(f"   {'ok ' if x['ok'] else 'NEIN'} {x['name']}: {x['mv']} s gegen {x['hand']} s ({x['abw_pct']:+.2f} %)")
    print("A5 Stufen:")
    for x in a5:
        print(f"   {'ok ' if x['ok'] else 'NEIN'} {x['name']}: {x['n']}/{x['soll_n']} Stufen, gemessen minus Soll {x['dx']} (Grenze ±{x['toleranz']})")
    print(f"Laktatwerte ohne Quelle: {len(ohne)}")
    print(f"Alle Aktivitäten: {alle['gleich']} von {alle['n']} gleich; Abweichungen: {len(alle['abweichungen'])}")
    for x in alle["abweichungen"][:10]:
        print("  ", x)
    print("GESAMT:", "bestanden" if ok else "NICHT bestanden")


if __name__ == "__main__":
    main()
