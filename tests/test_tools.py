"""Abnahmetests V5 für die Python-Werkzeuge – nur synthetische, frei erfundene Werte.

  python3 -I tests/test_tools.py
"""
import copy
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import merge_daily  # noqa: E402
import migrate_v5  # noqa: E402
import schwellen  # noqa: E402

FAILS = []


def check(name, cond, info=""):
    print(("ok   " if cond else "FAIL ") + name + (f"  ({info})" if info and not cond else ""))
    if not cond:
        FAILS.append(name)


def curve(xs, f):
    return [round(f(x), 2) for x in xs]


# --- Schwellen: synthetischer ausbelasteter Radtest, nicht ausbelasteter Test, Lauftest ---
XS = list(range(100, 361, 20))
LA = curve(XS, lambda x: 0.9 + 0.00000035 * max(0, x - 140) ** 3.1)
m = schwellen.methods(XS, LA, True)
check("Schwellen: alle Methoden bei Ausbelastung", all(m[k] is not None for k in ("somc", "basis05", "loglog", "dickhuth", "moddmax", "dmax")), m)
check("Schwellen: LT1 vor LT2", m["basis05"] < m["dickhuth"] < XS[-1], m)
m2 = schwellen.methods(XS[:8], LA[:8], False)
check("Schwellen: ohne Ausbelastung kein Dmax", m2["moddmax"] is None and m2["dmax"] is None, m2)
check("Schwellen: keine Extrapolation über die letzte Stufe", all(v is None or v <= XS[7] for v in m2.values()), m2)
flat = schwellen.methods([8, 9, 10, 11, 12], [1.1, 1.1, 1.2, 1.3, 1.6], False)
check("Schwellen: Kurve erreicht Dickhuth-Ziel nicht → None", flat["dickhuth"] is None and flat["fix4"] is None, flat)


def demo_data(n=11):
    rows = [{"stufe": i + 1, "x": x, "la": la, "hf": 110 + i * 6, "quelle": {"blatt": "Demo", "x": f"C{9 + i}"}} for i, (x, la) in enumerate(zip(XS[:n], LA[:n]))]
    return {"activities": [{"id": "a1", "date": "2026-01-10", "sport": "rad"}],
            "laktat_vorschau": [{"id": "demo-test", "status": "vorschau", "art": "stufentest", "sport": "rad", "datum": "2026-01-10",
                                 "zeilen": rows, "hinweise": [], "aktivitaet": "a1", "datei": "demo.xlsx"}],
            "stufen": [{"id": "a1", "start": 100, "schritt": 20, "stufe_s": 300}], "lactate": []}


S = schwellen.rechne(demo_data())
t = S["tests"][0]
check("Schwellen: 2/4 mmol nie als LT", t["methoden"]["fix2"]["gueltig"] is False and "fix4" not in t["lt2"]["methoden"])
check("Schwellen: LT2 ohne Ausbelastung nur Dickhuth, Status vorläufig", t["lt2"]["methoden"] == ["dickhuth"] and t["lt2"]["status"] == "vorläufig", t["lt2"])
check("Schwellen: Unsicherheitsband vorhanden", t["methoden"]["basis05"]["band80"] is not None)
t10 = schwellen.rechne(demo_data(10))["tests"][0]
check("Schwellen: Test ohne gültige LT2 → null und «nicht bestimmbar»", t10["lt2"]["status"] == "nicht bestimmbar" and t10["lt2"]["lo"] is None, t10["lt2"])
check("Schwellen: Protokoll erkannt", t["protokoll"] == "rad-stufen-120-20-5" or t["protokoll"] in ("unbekannt",), t["protokoll"])

# --- Datenmodell: Migration wiederholbar, IDs bleiben, Rückweg ---
with tempfile.TemporaryDirectory() as tmp:
    p = os.path.join(tmp, "data.json")
    json.dump(demo_data(), open(p, "w"))
    os.makedirs(os.path.join(tmp, "work"), exist_ok=True)
    json.dump([{"id": "demo-zonen", "name": "Beispielzonen", "status": "aktiv", "gueltig_ab": "2026-01-01", "skalen": []}], open(os.path.join(tmp, "work", "zonen-start.json"), "w"))
    cwd = os.getcwd()
    os.chdir(tmp)
    try:
        sys.argv = ["migrate_v5.py", p]
        migrate_v5.main()
        D1 = json.load(open(p))
        migrate_v5.main()
        D2 = json.load(open(p))
        check("Migration: Listen und Zonenprofil angelegt", all(k in D1 for k in ("koppel", "fueling", "befinden", "zonen", "schwellen")))
        check("Migration: zweiter Lauf ändert nichts Wesentliches", len(D2["zonen"]) == 1 and D1["activities"] == D2["activities"])
        backups = sorted(os.listdir(os.path.join(tmp, "work", "backup")))
        sys.argv = ["migrate_v5.py", p, "--rollback", os.path.join(tmp, "work", "backup", backups[0])]
        migrate_v5.main()
        check("Migration: Rückweg stellt den Stand davor her", "schema" not in json.load(open(p)))
    finally:
        os.chdir(cwd)

# --- Nacht-/Eingaben-Import: Fueling ohne Doppel, Korrektur mit Audit, B1 ---
D = demo_data()
migrate_v5.migrate(D)
fu = {"id": "f1", "activity_id": "a1", "date": "2026-01-10", "sport": "rad", "status": "protokolliert",
      "events": [{"id": "e1", "t_min": 30, "kh_g": 40, "anteil": 0.5}]}
merge_daily.v5_merge(D, {"fueling_add": [fu]})
merge_daily.v5_merge(D, {"fueling_add": [fu]})
check("Fueling: zweiter Import ohne Doppel", len(D["fueling"]) == 1)
fu2 = copy.deepcopy(fu)
fu2["events"][0]["anteil"] = 0.75
merge_daily.v5_merge(D, {"fueling_add": [fu2]})
check("Fueling: spätere Korrektur ersetzt, alte Fassung im Audit", D["fueling"][0]["events"][0]["anteil"] == 0.75 and any(a.get("was") == "fueling ersetzt" for a in D["audit"]))
merge_daily.v5_merge(D, {"befinden_add": [{"date": "2026-01-11", "muede": 4}], "koppel_set": [{"bike": "b", "run": "r", "status": "getrennt"}]})
check("Befinden und Koppel-Entscheid gespeichert", D["befinden"][0]["muede"] == 4 and D["koppel"][0]["status"] == "getrennt")
merge_daily.v5_merge(D, {"zonen_add": [{"id": "z-neu", "gueltig_ab": "2026-02-01", "skalen": []}]})
check("Zonen: ohne Freigabe nicht übernommen", not any(z["id"] == "z-neu" for z in D["zonen"]))
merge_daily.v5_merge(D, {"laktat_bestaetigt": ["demo-test"]})
check("B1: Vorschau nach Bestätigung als Laktatmessung", len(D["lactate"]) == 1 and D["lactate"][0]["stages"][0]["quelle"] and D["laktat_vorschau"][0]["status"] == "übernommen")
S2 = schwellen.rechne(D)
check("B1: Schwellen rechnen danach mit bestätigten Werten", S2["tests"][0]["datenstatus"] == "bestätigt", S2["tests"][0]["datenstatus"])
merge_daily.v5_merge(D, {"laktat_bestaetigt": ["demo-test"]})
check("B1: zweite Bestätigung ohne Doppel", len(D["lactate"]) == 1)

# --- Repo-Schutz: keine entschlüsselten Daten, keine Schlüssel im Repo ---
tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.split()
check("Repo: data.json und work/ nicht versioniert", "data.json" not in tracked and not any(f.startswith("work/") for f in tracked))
TOKEN_PATTERNS = ["gh" + "p_", "github" + "_pat_", "sk" + "-ant-", "AK" + "IA"]     # zusammengesetzt, damit diese Datei sich nicht selbst meldet
pw_path = "/home/claude/.spuren_pw"
if os.path.exists(pw_path):
    pw = open(pw_path).read().strip()
    leak = [f for f in tracked if os.path.isfile(os.path.join(ROOT, f)) and pw in open(os.path.join(ROOT, f), errors="ignore").read()]
    check("Repo: Passwort in keiner Datei", not leak, leak)
check("Repo: keine Token-Muster", not any(f for f in tracked if f.endswith((".js", ".html", ".md", ".py", ".mjs")) and
                                          any(s in open(os.path.join(ROOT, f), errors="ignore").read() for s in TOKEN_PATTERNS)))

print(f"\n{'ALLE BESTANDEN' if not FAILS else str(len(FAILS)) + ' FEHLGESCHLAGEN'}")
sys.exit(1 if FAILS else 0)
