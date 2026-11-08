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
cs = {"id": "css-1", "datum": "2026-01-12", "t400": 540, "t200": 260, "becken": 25, "validiert": True, "quelle": "von Hand gestoppt"}
merge_daily.v5_merge(D, {"css_add": [cs]})
cs2 = dict(cs, t200=262, korrigiert="2026-01-13T08:00:00")
merge_daily.v5_merge(D, {"css_add": [cs2]})
check("A06: CSS-Test von Hand gespeichert, Korrektur ersetzt, alte Zeiten im Audit",
      len(D["css_tests"]) == 1 and D["css_tests"][0]["t200"] == 262 and any(a.get("was") == "css_tests ersetzt" and a.get("alt", {}).get("t200") == 260 for a in D["audit"]),
      [a.get("was") for a in D["audit"]])
merge_daily.v5_merge(D, {"fehler_add": [{"id": "fb-1", "datum": "2026-01-12", "kategorie": "ellbogen", "beobachtung": "Ellbogen fällt ab", "status": "offen"}]})
check("Fehlerboard: Eintrag übernommen", D["fehlerboard"][0]["status"] == "offen")
merge_daily.v5_merge(D, {"fueling_quellen": {"datum": "2026-01-12", "v": "fueling-quellen-1.0", "befunde": ["FIT: keine Nachricht mit Mengen"]}})
check("A15: geprüfte Fueling-Quellen gespeichert, ohne Fueling-Einträge zu erzeugen", D["fueling_quellen"]["befunde"] and not any(f.get("quelle") == "Garmin" for f in D.get("fueling", [])))
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

# --- Kalibrierung Routenplaner (kalibrierung-1.0) – synthetische Sekundenreihen ---
import numpy as np  # noqa: E402
import kalibrierung as KAL  # noqa: E402

rng = np.random.default_rng(7)


def fake_ride(watts, hr0=120.0, n=3600, hr_per_w=0.25):
    t = np.arange(n, dtype=float)
    pw = np.array([watts(i) for i in range(n)], float) + rng.normal(0, 8, n)
    hr = hr0 + hr_per_w * pw + np.minimum(t, 300) / 300 * 2
    return {"t": t, "pw": pw, "hr": hr, "spd": np.full(n, 9.0), "dist": t * 9.0, "alt": np.full(n, 500.0)}


steady = KAL.bike_blocks(fake_ride(lambda i: 200))
check("Kalibrierung: konstante Fahrt ergibt 10-min-Blöcke", len(steady) >= 4 and all(abs(b["w"] - 200) < 5 for b in steady), steady[:2])
inter = KAL.bike_blocks(fake_ride(lambda i: 300 if (i // 60) % 2 else 120))
check("Kalibrierung: Intervalle (1 min hart/locker) ergeben keine Blöcke", len(inter) == 0, len(inter))
items = []
for k in range(40):
    w = 150 + 3 * k
    items.append({"act": f"a{k}", "date": f"2026-{1 + k // 4:02d}-{1 + k % 4 * 7:02d}", "hr": (w + 60) / 1.75 + rng.normal(0, 2), "w": w})
rep = KAL.regress_report(items, "hr", "w", 20, 5, "W")
check("Kalibrierung: linearer Zusammenhang erkannt, Hold-out-Fehler klein", rep["ok"] and rep["mae"] < rep["mae_konstant"] and abs(rep["b"] - 1.75) < 0.2, {k: rep.get(k) for k in ("ok", "mae", "b")})
check("Kalibrierung: Hold-out sind die jüngsten Einheiten", rep["hold_out"]["von"] >= max(i["date"] for i in items[:30]), rep["hold_out"])
noise = [{"act": f"n{k}", "date": f"2026-{1 + k // 4:02d}-{1 + k % 4 * 7:02d}", "hr": float(rng.uniform(120, 170)), "w": float(rng.uniform(150, 250))} for k in range(40)]
check("Kalibrierung: reines Rauschen wird nicht als Modell freigegeben", not KAL.regress_report(noise, "hr", "w", 20, 5, "W")["ok"])
few = KAL.regress_report(items[:6], "hr", "w", 20, 5, "W")
check("Kalibrierung: zu wenige Blöcke → nicht ok mit Grund", not few["ok"] and "wenige" in few["grund"], few)
n = 2400
t = np.arange(n, dtype=float)
flat_run = {"t": t, "hr": np.full(n, 150.0), "dist": t * 3.0, "alt": np.full(n, 600.0), "spd": np.full(n, 3.0), "pw": np.full(n, np.nan)}
hill_run = dict(flat_run, alt=600 + t * 3.0 * 0.06)
check("Kalibrierung: flacher gleichmässiger Lauf ergibt Blöcke", len(KAL.run_blocks(flat_run)) >= 3)
check("Kalibrierung: Lauf mit 6 % Steigung ergibt keine Flachblöcke", len(KAL.run_blocks(hill_run)) == 0)
up, dn = KAL.climb_blocks({"t": t, "hr": np.full(n, 140.0), "dist": t * 0.8, "alt": 1500 + t * 0.8 * 0.15, "spd": np.full(n, 0.8), "pw": np.full(n, np.nan)}, 0.08)
check("Kalibrierung: Aufstieg 15 % mit 0,8 m/s ≈ 432 Hm/h", up and abs(up[0]["vam"] - 432) < 5, up[:1])
# gleiche Physik wie im Browser (js/formkurve.js + js/route.js)
js = "const FK=require('./js/formkurve.js');const r=[];for(const [P,g] of [[200,0],[250,0.08],[0,-0.06],[180,-0.03]])" \
     "r.push(FK.speedFromPower(P,{m:83,cda:0.3,crr:0.004,grade:g,rho:FK.rho(15,500),wind:0,eta:0.976,vmax:60/3.6}));console.log(JSON.stringify(r))"
jsv = json.loads(subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True).stdout)
pyv = [KAL.speed_from_power(P, g, 83, 0.3, 0.004, KAL.rho(15, 500), 60 / 3.6) for P, g in [(200, 0), (250, 0.08), (0, -0.06), (180, -0.03)]]
check("Kalibrierung: Physik in Python = Physik im Browser", all(abs(a - b) < 0.01 for a, b in zip(jsv, pyv)), (jsv, pyv))
jsm = json.loads(subprocess.run(["node", "-e", "const RT=require('./js/route.js');console.log(JSON.stringify([-0.2,0,0.1,0.3].map(RT.minetti)))"], cwd=ROOT, capture_output=True, text=True).stdout)
check("Kalibrierung: Minetti in Python = im Browser", all(abs(a - KAL.minetti(g)) < 1e-9 for a, g in zip(jsm, [-0.2, 0, 0.1, 0.3])))

# --- Bestleistungen Laufen (best-1.0) – synthetisch ---
import bestleistungen as BL  # noqa: E402
tt = np.arange(0, 1200.0)
vv = np.where((tt >= 300) & (tt < 500), 5.0, 3.0)
dd = np.concatenate([[0.0], np.cumsum(vv[1:])])
check("Bestleistung: schnellster 1-km-Abschnitt gefunden", abs(BL.best_for(tt, dd, 1000) - 200.0) < 0.6, BL.best_for(tt, dd, 1000))
dj = dd.copy(); dj[800:] += 400                       # GPS-Sprung um 400 m
check("Bestleistung: Abschnitt mit GPS-Sprung wird nicht gewertet", abs(BL.best_for(tt, dj, 1000) - 200.0) < 0.6, BL.best_for(tt, dj, 1000))
check("Bestleistung: zu kurze Strecke → keine Zeit", BL.best_for(tt[:100], dd[:100], 1000) is None)

# --- Meine Entwicklung: gleichmässige Blöcke (eb-1.0) – synthetische Sessions ---
import kennzahlen as KZ  # noqa: E402
import series as SER  # noqa: E402


def sess(sport, n, pw=None, hr=None, spd=None, alt=None):
    S = SER.Session()
    S.sport, S.start, S.elapsed, S.timer = sport, 1_700_000_000, n, n
    S.ts = [S.start + i for i in range(n)]
    S.pw = [pw(i) if pw else None for i in range(n)]
    S.hr = [hr(i) if hr else None for i in range(n)]
    S.spd = [spd(i) if spd else None for i in range(n)]
    d, S.dist = 0.0, []
    for i in range(n):
        d += S.spd[i] or 0.0
        S.dist.append(d)
    S.alt = [alt(i) if alt else 500.0 for i in range(n)]
    S.cad, S.temp, S.target = [90] * n, [18] * n, [None] * n
    return S


r = rng
ride = sess(2, 3600, pw=lambda i: 140 if i < 600 else 200 + float(r.normal(0, 6)), hr=lambda i: 120 if i < 600 else 142 + (i - 600) / 3000 * 2)
eb = KZ.bloecke(ride)
check("Blöcke: 50 min bei 200 W ab Minute 10 → Blöcke mit Ø Leistung und Puls", eb and eb["art"] == "rad200" and eb["n"] >= 4 and abs(eb["w"] - 200) < 3 and 141 < eb["hr"] < 145, eb)
check("Blöcke: Aufwärmen (erste 10 min) zählt nie", eb and min(eb["s0"]) >= 600, eb and eb["s0"])
inter = sess(2, 3600, pw=lambda i: 320 if (i // 60) % 2 else 80, hr=lambda i: 150)
check("Blöcke: Intervalle (Ø 200 W, aber 1 min hart/locker) → kein Block", KZ.bloecke(inter) is None, KZ.bloecke(inter))
low = sess(2, 3600, pw=lambda i: 170 + float(r.normal(0, 5)), hr=lambda i: 135)
check("Blöcke: gleichmässig, aber 170 W (ausserhalb 190–210 W) → kein Block", KZ.bloecke(low) is None)
nohr = sess(2, 3600, pw=lambda i: 200)
check("Blöcke: ohne Puls → nichts (kein Schätzen)", KZ.bloecke(nohr) is None)
run_flat = sess(1, 2700, hr=lambda i: 150, spd=lambda i: 1000 / 330)
run_hill = sess(1, 2700, hr=lambda i: 150, spd=lambda i: 1000 / 330, alt=lambda i: 500 + i * (1000 / 330) * 0.05)
ef = KZ.bloecke(run_flat)
check("Blöcke: flacher Lauf 5:30/km → Block mit Pace 330 s/km", ef and ef["art"] == "lauf330" and abs(ef["pace"] - 330) < 2 and ef["hr"] == 150, ef)
check("Blöcke: Lauf mit 5 % Steigung → kein Flachblock", KZ.bloecke(run_hill) is None)
fast = sess(1, 2700, hr=lambda i: 160, spd=lambda i: 1000 / 290)
check("Blöcke: Lauf 4:50/km (ausserhalb 5:20–5:40) → kein Block", KZ.bloecke(fast) is None)

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
