"""Abnahmetests V5 für die Python-Werkzeuge – nur synthetische, frei erfundene Werte.

  python3 -I tests/test_tools.py
"""
import copy
import datetime as dt_mod
import json
import os
import subprocess
import sys
import tempfile
import zoneinfo as zoneinfo_mod

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
# V6.4 modell-1.0: Trainingsmodell von der Seite (ersetzt mit Audit, unbekanntes Modell oder kein Datum abgelehnt)
_m1 = {"id": "modell", "modell": "kombiniert", "wechsel": "2027-02-01", "v": "modell-1.0", "geaendert": "2026-11-13T10:00:00Z"}
merge_daily.v5_merge(D, {"modell_add": [_m1]})
check("V6.4 Trainingsmodell übernommen", D.get("plan_modell") == [_m1], json.dumps(D.get("plan_modell")))
merge_daily.v5_merge(D, {"modell_add": [dict(_m1, modell="pyramidal", geaendert="2026-11-14T10:00:00Z")]})
check("V6.4 Trainingsmodell ersetzt, alte Wahl im Audit", D["plan_modell"][0]["modell"] == "pyramidal" and len(D["plan_modell"]) == 1
      and any(a.get("was") == "Trainingsmodell ersetzt" and a.get("alt", {}).get("modell") == "kombiniert" for a in D["audit"]))
merge_daily.v5_merge(D, {"modell_add": [dict(_m1, modell="erfunden"), dict(_m1, wechsel="Februar"), dict(_m1, id="anders")]})
check("V6.4 Trainingsmodell: unbekannt, ohne Datum oder fremde ID abgelehnt", D["plan_modell"][0]["modell"] == "pyramidal" and len(D["plan_modell"]) == 1)
# V6.4.2 intensitaet-1.0: Intensität je Sportart im selben Eintrag (nur bekannte Sportarten und Stufen)
_m2 = dict(_m1, modell="kombiniert", intensitaet={"schwimm": "schwelle", "rad": "alles", "lauf": "locker"}, vi="intensitaet-1.0", geaendert="2026-11-15T10:00:00Z")
merge_daily.v5_merge(D, {"modell_add": [_m2]})
check("V6.4.2 Intensität je Sportart übernommen", D["plan_modell"][0].get("intensitaet") == {"schwimm": "schwelle", "rad": "alles", "lauf": "locker"})
merge_daily.v5_merge(D, {"modell_add": [dict(_m2, intensitaet={"rad": "maximal"}), dict(_m2, intensitaet={"kraft": "alles"}), dict(_m2, intensitaet="alles")]})
check("V6.4.2 Intensität: unbekannte Stufe, Sportart oder Form abgelehnt", D["plan_modell"][0].get("intensitaet", {}).get("lauf") == "locker" and len(D["plan_modell"]) == 1)
check("V6.4.2 Intensität: Prüfung nennt den Grund", merge_daily.modell_pruefen(dict(_m2, intensitaet={"rad": "maximal"})) == "unbekannte Intensität 'maximal' (rad)")
check("Trainingsmodell (Audit V6.4 B22): Wechsel nur als JJJJ-MM-TT – andere ISO-Formen abgelehnt",
      [merge_daily.modell_pruefen(dict(_m1, wechsel=w)) for w in ("20270315", "2027-W11-1", "2027-02-01")] == ["Wechsel ist kein Datum", "Wechsel ist kein Datum", None])
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
import re as _re  # noqa: E402
# V5.9.3: echte Schlüssel-Formen statt nur Präfixe (die Seite nennt «github_pat_» als Hinweis für die Eingabe des eigenen Schlüssels)
_TOKEN_RE = [_re.compile(TOKEN_PATTERNS[0] + r"[A-Za-z0-9]{30,}"), _re.compile(TOKEN_PATTERNS[1] + r"[A-Za-z0-9_]{40,}"),
             _re.compile(TOKEN_PATTERNS[2] + r"[A-Za-z0-9_-]{20,}"), _re.compile(TOKEN_PATTERNS[3] + r"[0-9A-Z]{16}")]
_tok = [f for f in tracked if f.endswith((".js", ".html", ".md", ".py", ".mjs", ".json", ".txt")) and os.path.isfile(os.path.join(ROOT, f))
        and any(r.search(open(os.path.join(ROOT, f), errors="ignore").read()) for r in _TOKEN_RE)]
check("Repo: keine Schlüssel (Token) in Dateien", not _tok, _tok)
check("Token-Prüfung erkennt einen Schlüssel", any(r.search("x " + TOKEN_PATTERNS[1] + "A" * 60) for r in _TOKEN_RE) and not any(r.search('placeholder="' + TOKEN_PATTERNS[1] + '…"') for r in _TOKEN_RE))

# --- V5.6 tools/serien.py: Raster, Workout-Abgleich, Ermüdungsresistenz (synthetisch) ---
import series as _series  # noqa: E402
import serien  # noqa: E402
S6 = _series.Session(); S6.sport, S6.start = 2, 1700000000
for i in range(4 * 3600):
    blk = (i // 600) % 2
    S6.ts.append(1700000000 + i); S6.pw.append(200 if blk == 0 else 250); S6.hr.append(130 + 5 * i / 3600 + (10 if blk else 0))
    S6.cad.append(90); S6.spd.append(9.0); S6.dist.append(9.0 * i); S6.alt.append(500.0); S6.temp.append(None); S6.target.append(None)
R6 = serien.raster(S6, 2)
check("Serie: 2-s-Raster ohne Lücke, Mittelwerte", R6["seg"] == [[0, 7200]] and R6["w"][0] == 200 and R6["v"][0] == 900 and "tw" not in R6, str(R6["seg"]))
S6b = _series.Session(); S6b.sport, S6b.start = 5, 1700000000
for i in range(120):
    S6b.ts.append(1700000000 + i); S6b.hr.append(120); S6b.pw.append(None); S6b.cad.append(None); S6b.spd.append(None); S6b.dist.append(None); S6b.alt.append(None); S6b.temp.append(None); S6b.target.append(None)
R6b = serien.raster(S6b, 2)
check("Serie ohne Tempo: Formatversion unter ver, kein Feld v (v ist der Tempokanal)", R6b.get("ver") == "serie-1.0" and "v" not in R6b and len(R6b["hr"]) == 60, str({k: R6b[k] for k in R6b if k != "hr"}))
F6 = serien.ermuedung(S6, "rad", 4 * 3600)
fr_b = [b for b in F6["bl"] if b[1] == 200]
check("Ermüdungsresistenz: Blöcke bei 200 W früh und spät mit Startminute und Puls", fr_b and fr_b[0][0] < 90 and fr_b[-1][0] >= 150 and fr_b[-1][2] > fr_b[0][2], str(fr_b[:2]))
# 10 min 200 W / 10 min 250 W im Wechsel → jede 20-min-Spanne 225 W; nach 4 h bleibt keine 20-min-Spanne (Fahrt dauert 4 h)
check("Ermüdungsresistenz: beste 20 min ab 0/2/3/4/5 h", F6["p20"] == [225, 225, 225, None, None], str(F6["p20"]))
steps = [{"i": 0, "typ": "einlaufen", "dauer": "zeit", "s": 600}, {"i": 1, "typ": "aktiv", "dauer": "zeit", "s": 300}, {"i": 2, "typ": "erholung", "dauer": "zeit", "s": 120},
         {"i": 3, "dauer": "wiederholen", "ab": 1, "mal": 3}, {"i": 4, "typ": "auslaufen", "dauer": "zeit", "s": 300}]
check("Plan: Gesamtdauer mit Wiederholungen (600 + 3 × 420 + 300)", serien.plan_gesamt(steps) == 2160, str(serien.plan_gesamt(steps)))
swim = [{"i": 0, "typ": "einlaufen", "dauer": "distanz", "m": 200}, {"i": 1, "typ": "aktiv", "dauer": "distanz", "m": 50}, {"i": 2, "typ": "pause", "dauer": "zeit", "s": 15},
        {"i": 3, "dauer": "wiederholen", "ab": 1, "mal": 4}, {"i": 4, "typ": "auslaufen", "dauer": "offen"}]
check("Plan: Schwimm-Workout nach Distanz – Plandauer unbekannt statt Teilsumme, Distanz 200 + 4 × 50 m",
      serien.plan_gesamt(swim) is None and serien.plan_distanz(swim) == 400, f"{serien.plan_gesamt(swim)} {serien.plan_distanz(swim)}")
FE = 631065600
W6 = {"name": "Test", "geraet": {"ftp": 200}, "steps": [{"i": 0, "typ": "aktiv", "ziel": "leistung", "lo": 190, "hi": 260, "einheit": "W?", "s": 1200}],
      "laps": [(1700000000 - FE, 1700000000 - FE + 1200, 1200000, 0)]}
A6 = serien.abgleich(S6, W6)
check("Plan: Enduco-Watt ohne Versatz als Watt gelesen (passt zur gefahrenen Leistung)", A6["schritte"][0]["einheit"] == "W" and A6["schritte"][0]["lo"] == 190 and "Watt gelesen" in A6["schritte"][0]["bezug"], str(A6["schritte"][0]))
check("Plan: Zeit im Zielbereich (10-s-Mittel) nur aus vorhandenen Werten", A6["im_ziel"] == 100, str(A6["im_ziel"]))
_tmp = tempfile.mkdtemp()
json.dump({"messages": [{"global_message_number": 26, "fields": [{"definition_number": 8, "raw_value": "Fatmax"}]},
                        {"global_message_number": 27, "fields": [{"definition_number": 254, "raw_value": 0}, {"definition_number": 1, "raw_value": 0}, {"definition_number": 2, "raw_value": 370000},
                                                                 {"definition_number": 3, "raw_value": 0}, {"definition_number": 5, "raw_value": 1904}, {"definition_number": 6, "raw_value": 2899}, {"definition_number": 7, "raw_value": 2}]}]},
          open(os.path.join(_tmp, "m.json"), "w"))
WG = serien.workout_garmin(os.path.join(_tmp, "m.json"))
check("Plan aus der Garmin-Verbindung: gleiche Rohwerte wie FIT (Tempo m/s, Dauer s)", WG["name"] == "Fatmax" and WG["steps"][0]["lo"] == 1.904 and WG["steps"][0]["s"] == 370.0, str(WG["steps"][0]))
# Uhr schreibt in jede Runde den Aktivitätsstart als Zeitstempel → Ende aus Start + verstrichener Zeit (sonst leeres Fenster, kein Abgleich)
RL = [serien._runde({2: 1000, 253: 1000, 7: 332000, 8: 300000, 71: 0}), serien._runde({2: 1332, 253: 1000, 7: None, 8: 316000, 71: 1}),
      serien._runde({2: 2000, 253: 2500, 7: 400000, 8: 400000, 71: 2}), serien._runde({2: 3000, 71: 3})]
check("Plan: Rundenende bei falschem Zeitstempel aus verstrichener Zeit bzw. Timer, gültiger Zeitstempel bleibt", RL == [(1000, 1332, 300000, 0), (1332, 1648, 316000, 1), (2000, 2500, 400000, 2), (3000, None, None, 3)], str(RL))
W7 = {"name": "Lauf", "geraet": {}, "steps": [{"i": 0, "typ": "aktiv", "ziel": "tempo", "lo": 8.5, "hi": 9.5, "einheit": "m/s", "s": 1200}],
      "laps": [serien._runde({2: 1700000000 - FE, 253: 1700000000 - FE, 7: 1200000, 8: 1200000, 71: 0})]}
A7 = serien.abgleich(S6, W7)
check("Plan: Lauf-Workout mit Tempoziel trotz falschem Runden-Zeitstempel abgeglichen", A7 and A7["schritte"][0]["im_ziel"] == 100 and A7["schritte"][0]["ist_s"] == 1200, str(A7 and A7["schritte"]))
merge_daily.v5_merge(D, {"rpe_add": [{"id": "a1", "act": "a1", "datum": "2026-01-10", "rpe": 6}], "laktat_punkte_add": [{"id": "lp-a1-600", "act": "a1", "t": 600, "la": 1.8, "status": "vorschau"}]})
check("Eingaben V5.6: RPE und Laktatpunkte gespeichert (Laktat bleibt Vorschau)", D["rpe"][0]["rpe"] == 6 and D["laktat_punkte"][0]["status"] == "vorschau")

# ---------- V5.7 Smart Training Routes: Eingaben, Nacht-Update ----------
merge_daily.v5_merge(D, {"startorte": [{"id": "o1", "name": "Zuhause", "lon": 9.5, "lat": 46.8}], "trainingsrouten_add": [{"id": "tr-2026-11-09-x", "datum": "2026-11-09", "vorschlag": "A"}]})
merge_daily.v5_merge(D, {"startorte": [{"id": "o1", "name": "Zuhause", "lon": 9.51, "lat": 46.81}, {"id": "o2", "name": "Arbeit", "lon": 9.6, "lat": 46.9}],
                         "trainingsrouten_add": [{"id": "tr-2026-11-09-x", "datum": "2026-11-09", "vorschlag": "B"}]})
check("V5.7: Startorte als ganze Liste ersetzt (alte Fassung im Audit), Trainingsroute mit gleicher ID ersetzt",
      len(D["startorte"]) == 2 and any(a.get("was") == "Startorte ersetzt" for a in D["audit"]) and len(D["trainingsrouten"]) == 1 and D["trainingsrouten"][0]["vorschlag"] == "B")
_t7 = tempfile.mkdtemp()
_d7 = {"activities": [], "days": [], "config": {}, "planned": [{"date": "2026-11-01", "title": "alt", "sport": "rad", "dur_s": 60}]}
json.dump(_d7, open(os.path.join(_t7, "d.json"), "w"))
json.dump({"activities": [{"garmin_id": 77, "name": "Runde", "type": "road_biking", "start_local": "2026-11-09T10:00:00", "duration_s": 3600, "distance_m": 30000, "elev_gain_m": 300, "avg_hr": 140, "avg_power": 200, "np": 205}],
           "planned": [{"date": "2026-11-10", "title": "Lange VO2max Intervalle", "sport": "rad", "dur_s": 5199, "wid": 1743810739, "quelle": "Enduco über Garmin",
                        "steps": [{"type": "warmup", "end_condition": "time", "end_condition_value": 571, "target_type": "power.zone", "target_value_low": 71.4, "target_value_high": 200}]}],
           "planned_range": ["2026-11-09", "2026-11-23"], "workouts_neu": [{"wid": 1, "title": "Neu", "sport": "cycling", "steps": []}]}, open(os.path.join(_t7, "n.json"), "w"))
open(os.path.join(_t7, "f.jsonl"), "w").write(json.dumps({"garmin_id": 77, "ok": True, "fit": {"mv": 3500, "poly": "_p~iF~ps|U_ulLnnqC"}}) + "\n")
merge_daily.main(os.path.join(_t7, "d.json"), os.path.join(_t7, "n.json"), os.path.join(_t7, "f.jsonl"))
_r7 = json.load(open(os.path.join(_t7, "d.json")))
check("V5.7 Nacht-Update: Workout-Schritte im Plan, alte Pläne ausserhalb des Bereichs bleiben, neue Enduco-Workouts, GPS-Spur aus der Garmin-Verbindung",
      _r7["planned"][-1]["steps"][0]["end_condition_value"] == 571 and _r7["planned"][0]["title"] == "alt" and _r7["workouts_neu"][0]["wid"] == 1
      and _r7["activities"][0]["poly"] == "_p~iF~ps|U_ulLnnqC" and _r7["activities"][0]["mv"] == 3500, json.dumps(_r7)[:300])
import fit_nacht  # noqa: E402
_S7 = _series.Session()
_S7.sport, _S7.lat, _S7.lon = 2, [46.85, 46.851, 46.852, None, 46.853], [9.53, 9.531, 9.532, None, 9.533]
_p7 = fit_nacht.spur(_S7)
_S7.manu = 260
check("V5.7: GPS-Spur draussen wie im Monatsexport (Polyline), drinnen keine", isinstance(_p7, str) and len(_p7) > 4 and fit_nacht.spur(_S7) is None, str(_p7))

# ---------- V5.7.1 Nacht-Update mit Sekundenreihen (serien/): neu, wiederholt, geändert, Fehler, Monatsexport, Datenschutz ----------
import hashlib  # noqa: E402
import secrets  # noqa: E402
import shutil  # noqa: E402
_t8 = tempfile.mkdtemp()
_PW8 = "nur-ein-test-passwort"                      # erfunden – nie das Seitenpasswort
os.makedirs(os.path.join(_t8, "tools")); os.makedirs(os.path.join(_t8, "work", "serien"))
for _f in ("serienlib.mjs", "serien_crypt.mjs", "serien_pruefen.mjs", "crypt.mjs"):
    shutil.copy(os.path.join(ROOT, "tools", _f), os.path.join(_t8, "tools", _f))


def _run(*a, pw=_PW8):
    env = {k: v for k, v in os.environ.items() if k != "SPUREN_PW"}
    if pw is not None:
        env["SPUREN_PW"] = pw
    r = subprocess.run(list(a), cwd=_t8, capture_output=True, text=True, env=env)
    return r.returncode, r.stdout + r.stderr


def _git(*a):
    return _run("git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid", *a)[1]


def _reihe(aid, n, laps=1):
    return json.dumps({"ver": "serie-1.0", "id": aid, "sport": "rad", "dt": 2, "seg": [[0, n]], "w": [200] * n, "hr": [130] * n,
                       "laps": [[0, 2 * n, None]] * laps}, separators=(",", ":"))


def _daten(acts):
    json.dump({"serien_salz": _salz8, "activities": acts}, open(os.path.join(_t8, "data.json"), "w"))
    return _run("node", "tools/crypt.mjs", "encrypt", "data.json", "data.enc.json")[0]


def _bytes():
    return {f: open(os.path.join(_t8, "serien", f), "rb").read() for f in sorted(os.listdir(os.path.join(_t8, "serien")))}


def _work(name, text):
    for f in os.listdir(os.path.join(_t8, "work", "serien")):
        os.remove(os.path.join(_t8, "work", "serien", f))
    if name:
        open(os.path.join(_t8, "work", "serien", name), "w").write(text)


_salz8 = secrets.token_hex(16)
_A1 = {"id": "1001", "date": "2026-10-01", "start": "08:00", "sport": "rad", "ser": {"dt": 2, "n": 100}}
_A2 = {"id": "g555", "gid": "g555", "date": "2026-11-08", "start": "10:00", "sport": "rad", "ser": {"dt": 2, "n": 50}}
_name = lambda key: hashlib.sha256(f"{_salz8}:{key}".encode()).hexdigest()[:24] + ".bin"  # noqa: E731
_run("git", "init", "-q")
open(os.path.join(_t8, ".gitignore"), "w").write("data.json\nwork/\n")
_daten([_A1])
_work("1001.json", _reihe("1001", 100))
_rc0, _o0 = _run("node", "tools/serien_crypt.mjs")                       # Monatsexport: Ausgangslage mit einer Reihe
_git("add", "-A"); _git("commit", "-qm", "Basis")
_B0 = _bytes()
# Nacht 1: neue Aktivität
_daten([_A1, _A2]); _work("g555.json", _reihe("g555", 50))
_rc1, _o1 = _run("node", "tools/serien_crypt.mjs", "--nacht")
_p1, _po1 = _run("node", "tools/serien_pruefen.mjs", "--nacht", "--git")
_B1 = _bytes()
_neu = _B1.get(_name("g555"))
check("Reihen Nacht 1: neue Aktivität → genau 1 neue Datei, bestehende Byte für Byte unverändert, Prüfung bestanden",
      _rc0 == 0 and _rc1 == 0 and _p1 == 0 and len(_B1) == 2 and _B1[_name("1001")] == _B0[_name("1001")] and _neu is not None and "1 neu" in _o1, _o1 + _po1)
check("Reihen: neue Datei verschlüsselt (SPS2) und auf eine Zweierpotenz ≥ 16 KiB aufgefüllt; Name aus Salz und gid, nicht aus der ID allein",
      _neu[:4] == b"SPS2" and len(_neu) >= 16384 and (len(_neu) & (len(_neu) - 1)) == 0 and b'"seg"' not in _neu and b"g555" not in _neu
      and _name("g555") != hashlib.sha256(b"g555").hexdigest()[:24] + ".bin", str(len(_neu)))
_git("add", "-A"); _git("commit", "-qm", "Nacht 1")
# Nacht 2: dieselbe Aktivität noch einmal importiert
_rc2, _o2 = _run("node", "tools/serien_crypt.mjs", "--nacht")
_p2, _po2 = _run("node", "tools/serien_pruefen.mjs", "--nacht", "--git")
check("Reihen Nacht 2: wiederholter Import derselben Aktivität → nichts neu, nichts geändert, keine Doppel, Git unverändert",
      _rc2 == 0 and _p2 == 0 and "0 neu, 0 geändert" in _o2 and "1 unverändert" in _o2 and _bytes() == _B1 and _git("status", "--porcelain", "serien") == "", _o2 + _po2)
# tatsächlich geänderte Reihe: gleiche Datei, neuer Inhalt
_work("g555.json", _reihe("g555", 50, laps=2))
_rc3, _o3 = _run("node", "tools/serien_crypt.mjs", "--nacht")
_p3, _po3 = _run("node", "tools/serien_pruefen.mjs", "--nacht", "--git")
check("Reihen: geänderte Reihe → dieselbe Datei neu geschrieben, keine zweite", _rc3 == 0 and _p3 == 0 and "1 geändert" in _o3 and len(_bytes()) == 2
      and _bytes()[_name("g555")] != _B1[_name("g555")], _o3 + _po3)
_git("checkout", "-q", "--", "serien")
# Fehler: beschädigte Eingabe bzw. falsches Passwort → bisherige Dateien bleiben (Wiederherstellen wie im Nacht-Update)
_work("g555.json", _reihe("g555", 50)[:40])
_rc4, _o4 = _run("node", "tools/serien_crypt.mjs", "--nacht")
_p4, _po4 = _run("node", "tools/serien_pruefen.mjs", "--nacht", "--git")
_git("checkout", "-q", "--", "serien"); _git("clean", "-fdq", "--", "serien")
_rc5, _o5 = _run("node", "tools/serien_crypt.mjs", "--nacht", pw="falsch")
_p5, _po5 = _run("node", "tools/serien_pruefen.mjs", "--nacht", "--git", pw="falsch")
check("Reihen: Import schlägt fehl (Eingabe beschädigt, falsches Passwort) → Abbruch mit Fehler, Prüfung nicht bestanden, bisherige Dateien unverändert",
      _rc4 == 1 and _p4 == 1 and _rc5 == 2 and _p5 == 1 and _bytes() == _B1 and not any(".tmp" in f for f in os.listdir(os.path.join(_t8, "serien"))), _o4 + _o5)
# Prüfung erkennt Klartext, Rest eines Abbruchs, Doppel unter altem Namen, Namen ohne Salz
_work("g555.json", _reihe("g555", 50))
_run("node", "tools/serien_crypt.mjs", "--nacht")
open(os.path.join(_t8, "serien", "0123456789abcdef01234567.bin"), "w").write(_reihe("x", 3))
open(os.path.join(_t8, "serien", _name("g555") + ".tmp-1"), "wb").write(b"x")
shutil.copy(os.path.join(_t8, "serien", _name("g555")), os.path.join(_t8, "serien", hashlib.sha256(b"g555").hexdigest()[:24] + ".bin"))
_p6, _po6 = _run("node", "tools/serien_pruefen.mjs", "--nacht", "--git")
check("Reihen-Prüfung erkennt unverschlüsselte Datei, Rest eines Abbruchs und Dateinamen ohne Salz",
      _p6 == 1 and "unverschlüsselter Inhalt" in _po6 and "fremde Datei" in _po6 and "ohne Salz" in _po6, _po6)
_git("checkout", "-q", "--", "serien"); _git("clean", "-fdq", "--", "serien")
# Monatsexport: Nacht-ID g555 wird zur FIT-ID, gid bleibt → gleicher Dateiname, nichts verwaist, kein Neuimport
_A2m = dict(_A2, id="4990001")
_daten([_A1, _A2m]); _work(None, "")
_rc7, _o7 = _run("node", "tools/serien_crypt.mjs")
_p7, _po7 = _run("node", "tools/serien_pruefen.mjs", "--git", "--bericht", "work/serien_lauf.json")
check("Reihen Monatsexport: neue ID mit gleicher gid → Reihe bleibt unter ihrem Namen, nichts gelöscht, keine Doppel",
      _rc7 == 0 and _p7 == 0 and "0 verwaist entfernt" in _o7 and _bytes() == _B1 and _git("status", "--porcelain", "serien") == "", _o7 + _po7)
# Alter Name (Aktivitäts-ID statt gid) wird beim Monatsexport einmal umbenannt, Inhalt unverändert
_git("mv", "serien/" + _name("g555"), "serien/" + _name("4990001")); _git("commit", "-qm", "alter Name")
_rc8, _o8 = _run("node", "tools/serien_crypt.mjs")
check("Reihen: alter Name wird umbenannt (Inhalt Byte für Byte gleich)", _rc8 == 0 and "1 umbenannt" in _o8 and _bytes() == _B1, _o8)
# Nacht-Update löscht nie: Aktivität fehlt in den Daten → Reihe bleibt, wird nur gemeldet
_daten([_A1]); _work(None, "")
_rc9, _o9 = _run("node", "tools/serien_crypt.mjs", "--nacht")
check("Reihen Nacht-Update: verwaiste Reihe wird nicht gelöscht, nur gemeldet", _rc9 == 0 and len(_bytes()) == 2 and "verwaist (nicht gelöscht)" in _o9, _o9)

# ---------- V5.7.2 Garmin-Ernährungsprotokoll → Fueling (erfundene Werte) ----------
import garmin_ernaehrung as GE  # noqa: E402
_KR = {"id": "g88", "gid": "g88", "date": "2026-03-01", "start": "13:00", "sport": "andere", "el": 2700, "dur": 2700, "mv": 2700}
_DK = {"activities": [_KR], "fueling": [{"id": "fg-g88", "activity_id": "g88", "date": "2026-03-01", "status": "protokolliert", "events": []}]}
GE.einlesen(_DK, [{"date": "2026-03-01", "dailyCalories": 114, "dailyCarbs": 4.0, "items": [{"logId": "w", "foodName": "Whey", "brandName": None, "servingQty": 1.5,
             "numberOfUnits": 30.0, "servingUnit": "G", "calories": 76, "carbs": 2.7, "sodium": None, "mealName": "SNACKS", "mealTime": "13:40:00", "logTimestamp": "2026-03-01T13:00:00.000Z"}]}])
GE.fueling_ableiten(_DK)
check("Garmin-Ernährung: nur Rad und Laufen ab 40 min (Shake am Ende eines Krafttrainings ist kein Fueling; früherer Eintrag entfernt)", _DK["fueling"] == [])
def _it(lid, name, qty, kh, kc, zeit, erfasst_utc, units=1.0, unit="SERVING", na=None):
    return {"logId": lid, "foodName": name, "brandName": None, "servingQty": qty, "numberOfUnits": units, "servingUnit": unit, "calories": kc, "carbs": kh,
            "sodium": na, "mealName": "SNACKS", "mealTime": zeit, "logTimestamp": erfasst_utc}
_IT = [_it("a", "Gel Test (1 Gel)", 2.0, 25.0, 100, "09:30:00", "2026-03-01T12:00:00.000Z"),             # während, nachträglich erfasst
       _it("b", "Pulver Test", 1.0, 50.0, 200, "10:30:00", "2026-03-01T12:00:00.000Z", units=60.0, unit="G", na=300.0),
       _it("c", "Riegel geplant", 1.0, 40.0, 180, "10:00:00", "2026-03-01T07:00:00.000Z"),           # während, aber vorher erfasst (geplant)
       _it("d", "Frühstück", 1.0, 80.0, 400, "07:30:00", "2026-03-01T06:40:00.000Z"),                 # vor der Einheit
       _it("e", "Mittag", 1.0, 90.0, 600, "12:30:00", "2026-03-01T12:00:00.000Z")]                    # nach der Einheit
_TAG = {"date": "2026-03-01", "dailyCalories": 200 + 200 + 180 + 400 + 600, "dailyCarbs": 50 + 50 + 40 + 80 + 90, "items": _IT}
_ACT = {"id": "g77", "gid": "g77", "date": "2026-03-01", "start": "09:00", "sport": "rad", "el": 7200, "dur": 7000, "mv": 6900}
_D8 = {"activities": [_ACT], "fueling": []}
GE.einlesen(_D8, [_TAG], "2026-03-01"); _n8, _h8 = GE.fueling_ableiten(_D8)
_e8 = _D8["fueling"][0] if _D8["fueling"] else {}
check("Garmin-Ernährung: Tag gegen Tageswerte geprüft, nur nachträglich erfasste Einträge mit Uhrzeit in der Einheit zählen",
      _D8["ernaehrung_garmin"]["2026-03-01"]["pruefung"] == "ok" and _e8.get("id") == "fg-g77" and [x["garmin_log_id"] for x in _e8["events"]] == ["a", "b"]
      and [x["kh_g"] for x in _e8["events"]] == [50.0, 50.0] and [x["t_min"] for x in _e8["events"]] == [30, 90] and [x["garmin_log_id"] for x in _e8["unsicher"]] == ["c"]
      and _e8["events"][0]["wasser_ml"] is None and _e8["events"][0]["natrium_mg"] is None and _e8["events"][1]["natrium_mg"] == 300, json.dumps(_e8)[:300])
_a8 = len(_D8.get("audit", []))
GE.einlesen(_D8, [_TAG], "2026-03-02"); GE.fueling_ableiten(_D8)
check("Garmin-Ernährung: wiederholter Abruf → kein Doppel, kein neuer Audit-Eintrag", len(_D8["fueling"]) == 1 and len(_D8.get("audit", [])) == _a8)
_T2 = dict(_TAG, items=[dict(_IT[0], servingQty=3.0)] + _IT[1:], dailyCarbs=_TAG["dailyCarbs"] + 25, dailyCalories=_TAG["dailyCalories"] + 100)
GE.einlesen(_D8, [_T2]); GE.fueling_ableiten(_D8)
check("Garmin-Ernährung: in Garmin geändert → derselbe Eintrag ersetzt, alte Fassung im Audit", len(_D8["fueling"]) == 1 and _D8["fueling"][0]["events"][0]["kh_g"] == 75.0
      and any(a.get("was") == "Fueling aus Garmin ersetzt" for a in _D8["audit"]))
_D9 = {"activities": [_ACT], "fueling": []}
GE.einlesen(_D9, [dict(_TAG, dailyCarbs=_TAG["dailyCarbs"] - 30)]); _n9, _h9 = GE.fueling_ableiten(_D9)
check("Garmin-Ernährung: Tageswerte passen nicht (unvollständig/falsch übertragen) → nichts zugeordnet, Hinweis", not _D9["fueling"] and _h9 and "nicht vollständig" in _h9[0]["text"])
_man = {"id": "fu-g77", "v": "fueling-1.0", "activity_id": "g77", "date": "2026-03-01", "status": "protokolliert", "events": [{"t_min": 20, "kh_g": 30}]}
_D10 = {"activities": [_ACT], "fueling": [dict(_man)]}
GE.einlesen(_D10, [_TAG]); _n10, _h10 = GE.fueling_ableiten(_D10)
check("Garmin-Ernährung: eigener Eintrag zur Einheit hat Vorrang → Garmin nicht übernommen, eigener unverändert, Hinweis",
      _D10["fueling"] == [_man] and _h10 and "manueller Fueling-Eintrag" in _h10[0]["text"])
_D11 = {"activities": [_ACT], "fueling": []}
GE.einlesen(_D11, [_TAG]); GE.fueling_ableiten(_D11)
_D11["fueling"][0]["gi"] = [{"t_min": 60, "schwere": 2}]; _D11["fueling"][0]["geaendert"] = "2026-03-02T08:00:00"
GE.einlesen(_D11, [_T2]); GE.fueling_ableiten(_D11)
check("Garmin-Ernährung: auf der Seite bearbeiteter Garmin-Eintrag wird nie überschrieben", _D11["fueling"][0]["gi"] and _D11["fueling"][0]["events"][0]["kh_g"] == 50.0)
_D12 = {"activities": [_ACT], "fueling": []}
GE.einlesen(_D12, [_TAG]); GE.fueling_ableiten(_D12)
GE.einlesen(_D12, [dict(_TAG, items=_IT[3:], dailyCarbs=170, dailyCalories=1000)]); GE.fueling_ableiten(_D12)
check("Garmin-Ernährung: Einträge in Garmin gelöscht → abgeleiteter Eintrag entfernt (Audit)", not _D12["fueling"] and any(a.get("was") == "Fueling aus Garmin entfernt" for a in _D12["audit"]))
_t13 = tempfile.mkdtemp()
json.dump({"activities": [], "days": [], "config": {}}, open(os.path.join(_t13, "d.json"), "w"))
json.dump({"activities": [{"garmin_id": 77, "name": "Runde", "type": "road_biking", "start_local": "2026-03-01T09:00:00", "duration_s": 7000, "distance_m": 60000,
                           "elev_gain_m": 300, "avg_hr": 140, "avg_power": 200, "np": 205}], "food_logs": [_TAG]}, open(os.path.join(_t13, "n.json"), "w"))
open(os.path.join(_t13, "f.jsonl"), "w").write(json.dumps({"garmin_id": 77, "ok": True, "fit": {"mv": 6900, "el": 7200, "t0": int(dt_mod.datetime(2026, 3, 1, 9, 0, tzinfo=zoneinfo_mod.ZoneInfo("Europe/Zurich")).timestamp())}}) + "\n")
merge_daily.main(os.path.join(_t13, "d.json"), os.path.join(_t13, "n.json"), os.path.join(_t13, "f.jsonl"))
_r13 = json.load(open(os.path.join(_t13, "d.json")))
check("Nacht-Update: Ernährungsprotokoll übernommen und Einnahmen der neuen Aktivität im Fueling", "2026-03-01" in _r13.get("ernaehrung_garmin", {})
      and [e["id"] for e in _r13.get("fueling", [])] == ["fg-g77"] and sum(x["kh_g"] for x in _r13["fueling"][0]["events"]) == 100.0, json.dumps(_r13.get("fueling"))[:300])

# ---------- V5.9.3 Eingaben direkt gespeichert (eingang/): einlesen, zusammenführen, prüfen, aufräumen (erfundene Werte) ----------
_t9 = tempfile.mkdtemp()
os.makedirs(os.path.join(_t9, "tools")); os.makedirs(os.path.join(_t9, "js"))
for _f in ("eingang.mjs", "eingaben_lib.mjs", "crypt.mjs"):
    shutil.copy(os.path.join(ROOT, "tools", _f), os.path.join(_t9, "tools", _f))
shutil.copy(os.path.join(ROOT, "js", "eingang.js"), os.path.join(_t9, "js", "eingang.js"))


def _run9(*a, pw=_PW8):
    env = {k: v for k, v in os.environ.items() if k != "SPUREN_PW"}
    if pw is not None:
        env["SPUREN_PW"] = pw
    r = subprocess.run(list(a), cwd=_t9, capture_output=True, text=True, env=env)
    return r.returncode, r.stdout + r.stderr


_D9 = {"activities": [], "routes": [{"id": "u-r0", "name": "Alt", "coords": [[9.5, 46.8], [9.6, 46.9]]}],
       "laktat_vorschau": [{"id": "check-test", "art": "check", "sport": "rad", "datum": "2026-11-04", "status": "vorschau", "aktivitaet": "g2", "datei": "Chat",
                            "zeilen": [{"x": 225, "la": 1.2, "hf": 146, "quelle": {"stelle": "Chat"}}], "kandidaten": [{"hr": 146, "hr_max": 150, "np": 226, "drift": 1.0}]}]}
json.dump(_D9, open(os.path.join(_t9, "data.json"), "w"))
_run9("node", "tools/crypt.mjs", "encrypt", "data.json", "data.enc.json")
_lp9 = {"id": "lp-g1-600", "act": "g1", "datum": "2026-11-09", "sport": "rad", "t": 600, "la": 1.6, "status": "vorschau", "quelle": "von Hand im Explorer",
        "abschnitt": {"von": 0, "bis": 600, "w": 220, "np": 225, "hr": 140, "pace": None, "grund": "gleichmässiger Block"}}
_spec9 = [
    {"name": "20261110T060000Z-00000001.bin", "art": "eingaben", "zeit": "2026-11-10T06:00:00Z", "daten": {"befinden": [{"date": "2026-11-10", "muede": 2, "muskel": 3, "stress": 1}],
     "routen": [{"id": "u-r1", "name": "Runde", "coords": [[9.5, 46.8], [9.51, 46.81]]}], "laktat_punkte": [_lp9],
     "garmin_verlauf": {"format": "spuren-garmin-verlauf-1", "id": "0123456789abcdef", "tage": [{"date": "2026-11-01", "sleepH": 7.5, "readiness": 66, "readinessLevel": "HIGH"}]},
     "modell": [{"id": "modell", "modell": "schwelle", "wechsel": "2027-02-01", "v": "modell-1.0", "geaendert": "2026-11-10T06:00:00Z"}],
     "zonen": [{"id": "zonen-20261110", "status": "aktiv", "gueltig_ab": "2026-11-10", "freigabe": {"datum": "2026-11-10"}, "methodik": {"art": "zonenvorschlag-1.0", "je_sportart": {"rad": {"test": "t-unbekannt"}}},
                "skalen": [{"key": "rad_w", "disziplin": "rad", "metrik": "leistung", "zonen": [{"z": "Z1", "von": None, "bis": 150}, {"z": "Z2", "von": 150, "bis": None}]}]}]}},
    {"name": "20261110T061000Z-00000002.bin", "art": "eingaben", "zeit": "2026-11-10T06:10:00Z", "daten": {"befinden": [{"date": "2026-11-10", "muede": 2, "muskel": 3, "stress": 3}],
     "routen_entfernt": ["u-r0"], "css": [{"id": "css-2026-11-10-t", "datum": "2026-11-10", "t400": 400, "t200": 190, "css_s": 105, "becken": 25, "validiert": True, "v": "css-2.0"}],
     "garmin_verlauf": {"format": "spuren-garmin-verlauf-1", "id": "fedcba9876543210", "tage": [{"date": "2026-11-02", "sleepH": 6.9}]}}},
    {"name": "20261110T062000Z-00000003.bin", "art": "bestaetigung", "zeit": "2026-11-10T06:20:00Z", "daten": {"laktat_punkte_bestaetigt": ["lp-g1-600"], "laktat_bestaetigt": ["check-test"]}},
    {"name": "20261110T062100Z-00000004.bin", "art": "probe", "zeit": "2026-11-10T06:21:00Z", "daten": {"probe": True}},
    {"name": "20261110T062200Z-00000005.bin", "art": "eingaben", "zeit": "2026-11-10T06:22:00Z", "demo": True, "daten": {"befinden": [{"date": "2026-11-10", "muede": 5, "muskel": 5, "stress": 5}]}},
]
_js9 = """const EG = require("./js/eingang.js"); const fs = require("fs"); const { pbkdf2Sync } = require("node:crypto");
(async () => { const p = JSON.parse(fs.readFileSync("data.enc.json", "utf8"));
  const key = await crypto.subtle.importKey("raw", pbkdf2Sync(process.env.SPUREN_PW, Buffer.from(p.salt, "base64"), p.iter, 32, "sha256"), "AES-GCM", false, ["encrypt", "decrypt"]);
  fs.mkdirSync("eingang", { recursive: true });
  for (const s of JSON.parse(process.argv[1])) { const o = EG.inhalt(s.daten, s.art, new Date(s.zeit)); if (s.demo) o.demo = true; fs.writeFileSync("eingang/" + s.name, await EG.schliessen(key, o)); }
})();"""
_rc9, _o9 = _run9("node", "-e", _js9, json.dumps(_spec9))
open(os.path.join(_t9, "eingang", "20261110T063000Z-0000000f.bin"), "wb").write(secrets.token_bytes(16384))
_rc9b, _o9b = _run9("node", "tools/eingang.mjs", "einlesen")
_L9 = json.load(open(os.path.join(_t9, "work", "eingang_dateien.json")))
_A9 = json.load(open(os.path.join(_t9, "work", "eingang_a.json")))
check("Eingang: Seite verschlüsselt (EGS1), Werkzeug liest – Eingaben, Bestätigung, Test getrennt; Demo und fremde Datei abgelehnt",
      _rc9 == 0 and _rc9b == 0 and _L9["a"] == ["20261110T060000Z-00000001.bin", "20261110T061000Z-00000002.bin"] and _L9["b"] == ["20261110T062000Z-00000003.bin"]
      and _L9["probe"] == ["20261110T062100Z-00000004.bin"] and sorted(x["name"] for x in _L9["abgelehnt"]) == ["20261110T062200Z-00000005.bin", "20261110T063000Z-0000000f.bin"], _o9 + _o9b)
check("Eingang: gleiche ID → spätere Eingabe gewinnt; gelöschte Route geht mit", _A9["befinden_add"] == [{"date": "2026-11-10", "muede": 2, "muskel": 3, "stress": 3}]
      and [r["id"] for r in _A9["routen_add"]] == ["u-r1"] and _A9["routen_entfernt"] == ["u-r0"], json.dumps(_A9)[:300])
check("Eingang: auf der Seite bestätigte Zonen gehen als zonen_add ins Update", [z["id"] for z in _A9.get("zonen_add", [])] == ["zonen-20261110"], json.dumps(_A9.get("zonen_add"))[:200])
check("Eingang: Garmin-Verläufe von der Seite gehen unverändert ins Update – zwei vor einem Update beide (Audit V6.4 B9)",
      [g["id"] for g in _A9.get("garmin_verlauf") or []] == ["0123456789abcdef", "fedcba9876543210"], json.dumps(_A9.get("garmin_verlauf"))[:200])
check("Eingang: gewähltes Trainingsmodell geht als modell_add ins Update (V6.4)", [m["modell"] for m in _A9.get("modell_add", [])] == ["schwelle"], json.dumps(_A9.get("modell_add")))
merge_daily.main(os.path.join(_t9, "data.json"), os.path.join(_t9, "work", "eingang_a.json"))
_R9 = json.load(open(os.path.join(_t9, "data.json")))
check("Eingang A eingespielt: Befinden, Route auf alle Geräte, alte Route entfernt (Audit), Laktatpunkt als Vorschau, CSS-Test vom Handy in css_tests",
      _R9["befinden"][0]["stress"] == 3 and [r["id"] for r in _R9["routes"]] == ["u-r1"] and any(a.get("was") == "Route entfernt" for a in _R9["audit"])
      and _R9["laktat_punkte"][0]["status"] == "vorschau" and not _R9.get("lactate") and [c["css_s"] for c in _R9.get("css_tests", [])] == [105]
      and [m["modell"] for m in _R9.get("plan_modell", [])] == ["schwelle"])
check("Eingang A eingespielt: beide Garmin-Verläufe eingespielt (Audit V6.4 B9)", sorted(g["id"] for g in _R9.get("garmin_export", [])) == ["0123456789abcdef", "fedcba9876543210"],
      str(_R9.get("garmin_export")))
check("Eingang A: Zonen aus einem nicht bestätigten Test werden nicht übernommen", not any(z["id"] == "zonen-20261110" for z in _R9.get("zonen", [])))
check("Eingang A: Garmin-Verlauf eingespielt (Tag mit Schlaf und Readiness)", any(d.get("date") == "2026-11-01" and d.get("readiness") == 66 and d.get("sleepH") == 7.5 for d in _R9.get("days", []))
      and _R9["garmin_export"][0]["id"] == "0123456789abcdef")
merge_daily.main(os.path.join(_t9, "data.json"), os.path.join(_t9, "work", "eingang_b.json"))
_R9 = json.load(open(os.path.join(_t9, "data.json")))
_k9 = {l["id"]: l for l in _R9.get("lactate", [])}
check("Eingang B (Bestätigungen): Explorer-Laktat als Kurzcheck, Vorschau als Messung, Status «übernommen»",
      _k9.get("lp-g1-600", {}).get("kind") == "check" and _k9["lp-g1-600"]["w"] == 220 and _k9["lp-g1-600"]["lactate"] == 1.6 and "aus Explorer" in _k9["lp-g1-600"]["note"]
      and _k9.get("check-test", {}).get("lactate") == 1.2 and _R9["laktat_punkte"][0]["status"] == "übernommen", json.dumps(_R9.get("lactate"))[:300])
merge_daily.main(os.path.join(_t9, "data.json"), os.path.join(_t9, "work", "eingang_a.json"))
check("Eingang: dieselbe Datei noch einmal → nichts doppelt, übernommener Laktatpunkt bleibt übernommen",
      len(json.load(open(os.path.join(_t9, "data.json")))["laktat_punkte"]) == 1 and json.load(open(os.path.join(_t9, "data.json")))["laktat_punkte"][0]["status"] == "übernommen")
_p9, _po9 = _run9("node", "tools/eingang.mjs", "pruefen")
for _f in ("20261110T062200Z-00000005.bin", "20261110T063000Z-0000000f.bin"):
    os.remove(os.path.join(_t9, "eingang", _f))
open(os.path.join(_t9, "eingang", "notiz.txt"), "w").write("klartext")
_p9b, _po9b = _run9("node", "tools/eingang.mjs", "pruefen")
os.remove(os.path.join(_t9, "eingang", "notiz.txt"))
_run9("git", "init", "-q"); _run9("git", "-c", "user.name=T", "-c", "user.email=t@example.invalid", "add", "-A"); _run9("git", "-c", "user.name=T", "-c", "user.email=t@example.invalid", "commit", "-qm", "x")
_p9c, _po9c = _run9("node", "tools/eingang.mjs", "pruefen", "--git")
_p9d, _po9d = _run9("node", "tools/eingang.mjs", "pruefen", pw="falsch")
check("Eingang-Prüfung: Demo, fremde und unverschlüsselte Dateien → nicht bestanden; nur gültige → bestanden; falsches Passwort → nicht bestanden",
      _p9 == 1 and "Demo" in _po9 and "kein EGS1" in _po9 and _p9b == 1 and "fremde Datei" in _po9b and _p9c == 0 and "PRÜFUNG EINGANG: bestanden" in _po9c and _p9d == 1, _po9 + _po9b + _po9c)
_a9, _ao9 = _run9("node", "tools/eingang.mjs", "aufraeumen", "work/eingang_dateien.json")
_rest9 = sorted(os.listdir(os.path.join(_t9, "eingang")))
check("Eingang aufräumen: nur eingespielte Dateien und Test entfernt, Bestätigung bleibt ohne --mit-b liegen",
      _a9 == 0 and _rest9 == ["20261110T062000Z-00000003.bin"] and "1 Bestätigung(en) bleiben liegen" in _ao9, _ao9 + str(_rest9))

# ---------- V5.9.2 Morgen-Update (morgen-1.0): nur Tageswerte, Workouts und Plan; das Nacht-Update danach ersetzt statt ergänzt ----------
_t10 = tempfile.mkdtemp()
json.dump({"activities": [], "days": [{"date": "2026-11-09", "hrv": 70, "rhr": 50, "sleepH": 7.5, "sleepScore": 80, "kcalOut": 2900}], "config": {},
           "planned": [{"date": "2026-11-09", "title": "Alt", "sport": "rad", "dur_s": 3600}, {"date": "2026-11-10", "title": "Alt morgen", "sport": "lauf", "dur_s": 1800}],
           "workouts_neu": [{"wid": 1, "title": "alt"}]}, open(os.path.join(_t10, "d.json"), "w"))
_morgen = {"lauf": "morgen", "days": [{"date": "2026-11-10", "hrv": 66, "rhr": 51, "sleepH": 6.9, "sleepScore": 71}],
           "planned": [{"date": "2026-11-10", "title": "Lauf locker", "sport": "lauf", "dur_s": 3000, "wid": 5, "quelle": "Enduco über Garmin", "steps": []}],
           "planned_range": ["2026-11-10", "2026-11-24"], "workouts_neu": [{"wid": 7, "title": "Rad Grundlage", "sport": "cycling", "dur_s": 5400}]}
json.dump(_morgen, open(os.path.join(_t10, "m.json"), "w"))
merge_daily.main(os.path.join(_t10, "d.json"), os.path.join(_t10, "m.json"))
_m10 = json.load(open(os.path.join(_t10, "d.json")))
_nacht = {"lauf": "nacht", "days": [{"date": "2026-11-10", "hrv": 66, "rhr": 51, "sleepH": 6.9, "sleepScore": 71, "kcalOut": 2750}],
          "planned": [{"date": "2026-11-10", "title": "Lauf locker", "sport": "lauf", "dur_s": 3000, "wid": 5, "quelle": "Enduco über Garmin", "steps": []},
                      {"date": "2026-11-11", "title": "Rad", "sport": "rad", "dur_s": 3600}], "planned_range": ["2026-11-10", "2026-11-24"],
          "workouts_neu": [{"wid": 7, "title": "Rad Grundlage", "sport": "cycling", "dur_s": 5400}]}
json.dump(_nacht, open(os.path.join(_t10, "n.json"), "w"))
merge_daily.main(os.path.join(_t10, "d.json"), os.path.join(_t10, "n.json"))
_n10 = json.load(open(os.path.join(_t10, "d.json")))
check("Morgen-Update: Werte der Nacht und Workout des Tages da, Stand «Morgen-Update», kein Verbrauch für den laufenden Tag",
      [d["date"] for d in _m10["days"]] == ["2026-11-09", "2026-11-10"] and _m10["days"][1]["hrv"] == 66 and "kcalOut" not in _m10["days"][1]
      and [p["title"] for p in _m10["planned"]] == ["Alt", "Lauf locker"] and _m10["workouts_neu"][0]["wid"] == 7 and _m10.get("updated_lauf") == "Morgen-Update")
check("Nacht-Update danach: gleiche Tage und Workouts ersetzt, nicht ergänzt",
      [d["date"] for d in _n10["days"]] == ["2026-11-09", "2026-11-10"] and _n10["days"][1]["kcalOut"] == 2750
      and [p["title"] for p in _n10["planned"]] == ["Alt", "Lauf locker", "Rad"] and len(_n10["workouts_neu"]) == 1 and _n10.get("updated_lauf") == "Nacht-Update")

# ---------- V5.9.6 Laktat-Einzelmessungen über die Zeit (laktat-drift-1.0, erfundene Sekundenreihe) ----------
import series as SER14  # noqa: E402
import laktat_vorschau as LV14  # noqa: E402
_S14 = SER14.Session()
_S14.sport, _S14.start = 2, 1_000_000
_ts, _pw = [], []
for _i in range(0, 600):                     # 10 min fahren (Timer läuft)
    _ts.append(_S14.start + _i); _pw.append(220)
for _i in range(600, 640):                   # 40 s angehalten, Timer läuft weiter (0 W)
    _ts.append(_S14.start + _i); _pw.append(0)
_t = _S14.start + 640 + 90                   # 90 s Lücke: Timer gestoppt für die Messung
for _i in range(0, 120):                     # weiterfahren
    _ts.append(_t + _i); _pw.append(215)
_S14.ts, _S14.pw = _ts, _pw
_S14.cad = [85 if p_ else 0 for p_ in _pw]
_S14.hr = [140] * len(_ts)
_z14 = LV14.zeitpunkt(_S14, _S14.start + 599)
check("Laktat-Zeitpunkt: Fahrzeit bis zum Blockende, Pause bis zum Weiterfahren und gestoppter Timer",
      _z14 == {"t_s": 600, "el_s": 599, "pause_s": 40 + 90, "pause_timer_s": 90}, str(_z14))
_D14 = {"laktat_vorschau": [{"id": "check-z", "art": "check", "status": "vorschau", "sport": "rad", "datum": "2026-05-10", "aktivitaet": "g9", "datei": "Notiz",
        "fenster": ["18:00:00", "18:09:59"], "zeilen": [{"x": 220, "la": 1.4, "quelle": {"stelle": "Notiz"}}],
        "kandidaten": [{"x": 220, "hr": 140, "np": 221, "uhr": "18:10", "kj_vor": 120, "win_s": 600, "hr30": 141, **_z14}]}], "lactate": [], "audit": []}
merge_daily.laktat_uebernehmen(_D14, "check-z")
_e14 = _D14["lactate"][0]
check("Bestätigung (B1) nimmt Zeitpunkt, Pause und Fenster mit", _e14["t_s"] == 600 and _e14["pause_timer_s"] == 90 and _e14["fenster"] == ["18:00:00", "18:09:59"] and _e14["uhr"] == "18:10", str(_e14))

# ---------- V5.9.4 Testkalender mit CSS-Tests (css-2.0) ----------
_t13 = tempfile.mkdtemp()
json.dump({"activities": [], "days": [], "config": {}, "updated": "08.11.2026 23:26", "tests": [{"date": "2026-11-21", "kind": "check", "note": "x", "status": "vorschlag"}]}, open(os.path.join(_t13, "d.json"), "w"))
json.dump({"tests": [{"date": "2026-12-03", "kind": "css", "note": "erster", "status": "geplant"}, {"date": "2026-11-21", "kind": "check", "note": "x", "status": "vorschlag"}]},
          open(os.path.join(_t13, "n.json"), "w"))
merge_daily.main(os.path.join(_t13, "d.json"), os.path.join(_t13, "n.json"))
_d13 = json.load(open(os.path.join(_t13, "d.json")))
check("Testkalender: CSS-Termine über «tests» (ganze Liste), Stand bleibt", [t["kind"] for t in _d13["tests"]] == ["css", "check"] and _d13["updated"] == "08.11.2026 23:26")

# ---------- V5.9.1 Trainingslast mit LT2 (last-2.0, erfundene Werte) ----------
import last as LAST  # noqa: E402
_cfg11 = {"ftp": 300, "last_ref": {"rad": [{"ab": "2026-05-01", "lt2_w": 250, "status": "vorläufig", "quelle": "Test"}]}}
_A11 = [{"id": "r1", "date": "2026-11-08", "sport": "rad", "dur": 9000, "np": 210, "tss": 123},
        {"id": "r0", "date": "2025-06-01", "sport": "rad", "dur": 3600, "np": 250, "tss": 80},
        {"id": "l1", "date": "2026-11-07", "sport": "lauf", "dur": 3600, "tss": 70},
        {"id": "w1", "date": "2026-11-06", "sport": "wandern", "dur": 14400, "tss": 90},
        {"id": "r2", "date": "2026-11-05", "sport": "rad", "dur": 3600, "tss": 50}]
_D11 = {"config": _cfg11, "activities": copy.deepcopy(_A11)}
_n11 = LAST.alle(_D11)
_t11 = {a["id"]: a.get("tl2") for a in _D11["activities"]}
check("Trainingslast last-2.0: Fahrt NP 210 W, Timer 2:30:00 mit LT2 250 W → 176 ± 1 (Garmin-Last 123 bleibt)", abs(_t11["r1"] - 176) <= 1, str(_t11))
check("Trainingslast: vor dem ersten Test gilt der erste (gekennzeichnet), Lauf/Wandern/Rad ohne NP wie bisher, tss nie überschrieben",
      _t11["r0"] == 100 and LAST.ref_fuer(_cfg11, "2025-06-01")[1] is True and _t11["l1"] == 70 and _t11["w1"] == 90 and _t11["r2"] == 50
      and [a["tss"] for a in _D11["activities"]] == [a["tss"] for a in _A11] and _n11 == 2 and _D11["versions"]["last"]["v"] == "last-2.0", str(_t11))
_cfg11b = dict(_cfg11, last_ref={"rad": [{"ab": "2026-05-01", "lt2_w": 250}, {"ab": "2026-12-05", "lt2_w": 262}]})
check("Trainingslast: je Datum gilt der letzte Test davor", LAST.ref_fuer(_cfg11b, "2026-12-04")[0]["lt2_w"] == 250 and LAST.ref_fuer(_cfg11b, "2026-12-05")[0]["lt2_w"] == 262)
_V11 = LAST.vergleich(_D11, 2, "2026-11-08")
check("Trainingslast: Vergleich je Woche und Sportart bisher → neu (nur Rad ändert)", _V11["2026-11-02"]["rad"] == [123 + 50, 176 + 50] and _V11["2026-11-02"]["lauf"] == [70, 70], json.dumps(_V11))
_t12 = tempfile.mkdtemp()
json.dump({"activities": [], "days": [], "config": {"ftp": 300}}, open(os.path.join(_t12, "d.json"), "w"))
json.dump({"config": {"last_ref": _cfg11["last_ref"]}, "activities": [{"garmin_id": 88, "name": "Rolle", "type": "virtual_ride", "start_local": "2026-11-09T18:00:00",
           "duration_s": 3600, "distance_m": 30000, "elev_gain_m": 0, "avg_hr": 140, "avg_power": 220, "np": 230}]}, open(os.path.join(_t12, "n.json"), "w"))
merge_daily.main(os.path.join(_t12, "d.json"), os.path.join(_t12, "n.json"))
_a12 = json.load(open(os.path.join(_t12, "d.json")))["activities"][0]
check("Nacht-Update: neue Radeinheit bekommt tl2 gleich mit, tss weiter mit der Garmin-FTP", _a12["tss"] == round((230 / 300) ** 2 * 100) and _a12["tl2"] == round((230 / 250) ** 2 * 100), str(_a12))
_d12 = json.load(open(os.path.join(_t12, "d.json")))
_d12["updated"] = "08.11.2026 23:26"; json.dump(_d12, open(os.path.join(_t12, "d.json"), "w"))
json.dump({"config": {"last_ref": {"rad": [{"ab": "2026-04-29", "lt2_w": 270}]}}}, open(os.path.join(_t12, "c.json"), "w"))
merge_daily.main(os.path.join(_t12, "d.json"), os.path.join(_t12, "c.json"))
_e12 = json.load(open(os.path.join(_t12, "d.json")))
check("Nur config eingespielt: tl2 neu gerechnet, «Daten vom …» bleibt beim letzten Garmin-Abruf",
      _e12["activities"][0]["tl2"] == round((230 / 270) ** 2 * 100) and _e12["updated"] == "08.11.2026 23:26", str(_e12.get("updated")))


# ---------- V6.1 Garmin-Notizen (notizen-1.0) und Tageswerte (wellness-1.0) – erfundene Notiz und Werte ----------
import notizen as NZ  # noqa: E402
import wellness as WL  # noqa: E402
_NOTIZ = """Verpflegung / Train your Gut:
- Ca. 15 min vor Start: Riegel X (50 g, 25 g KH)
- Min 35: Gel A (25 g KH)
- Min 70: Gel B (25 g KH)
- Während der Fahrt: 1 Bidon 500 ml mit Pulver Y (20 g KH, 300 mg Natrium), Trinkzeitpunkte nicht erfasst
- 2 Gels C à 22 g KH
Total während der Fahrt: 114 g KH in 1:55 h ≈ 59 g KH/h
Vorher: 4 Reiswaffeln (~30 g KH) ca. 2 h vor Start

Laktat (Messgerät Z, Rolle Q):
- Min 40: 1,7 mmol/l | 10 min davor (30–40): Ø 205 W, Ø HF 138 | Pause 3:10 min, 2× gestochen
- Min 95: 2,1 mmol/l | 10 min Fahren davor (84:20–94:20): Ø 204 W, Ø HF 143 | Stopp ab 94:20, Pause 0:55 min
Wert jeweils ca. 1 min nach Abstechen.

Gefühl: gut"""
_r = NZ.lesen(_NOTIZ)
_la = _r["laktat"]
check("Notiz lesen: zwei Laktatmessungen mit Block, Ø W, Ø HF und Pause laut Notiz",
      [(e["t_min"], e["la"], e["w"], e["hr"], e["von_s"], e["bis_s"], e["pause_s"]) for e in _la] == [(40, 1.7, 205, 138, 1800, 2400, 190), (95, 2.1, 204, 143, 5060, 5660, 55)], str(_la))
check("Notiz lesen: Bemerkung im Laktat-Abschnitt gilt für jede Messung, Stiche und Stopp wörtlich als Hinweis",
      all("Notiz: Wert jeweils ca. 1 min nach Abstechen." in e["hinweise"] for e in _la) and "Notiz: Pause 3:10 min, 2× gestochen" in _la[0]["hinweise"]
      and "Notiz: Stopp ab 94:20, Pause 0:55 min" in _la[1]["hinweise"], str([e["hinweise"] for e in _la]))
_fu = _r["fueling"]
check("Notiz lesen: Verpflegung während der Fahrt mit und ohne Zeitpunkt, «2 × 22 g», Wasser und Natrium nur wo genannt",
      [(e["t_min"], e["kh_g"]) for e in _fu["waehrend"]] == [(35, 25), (70, 25), (None, 20), (None, 44)] and _fu["waehrend"][2]["wasser_ml"] == 500
      and _fu["waehrend"][2]["natrium_mg"] == 300 and _fu["waehrend"][0]["wasser_ml"] is None and _fu["waehrend"][3].get("rechnung") == "2 × 22 g KH", str(_fu["waehrend"]))
check("Notiz lesen: «vor Start» und «Vorher» nie mitgezählt (Zeitpunkt negativ, ungefähr gekennzeichnet), Total mit Dauer",
      [(e["t_min"], e["kh_g"], e.get("ungefaehr", False)) for e in _fu["vorher"]] == [(-15, 25, False), (-120, 30, True)]
      and _fu["total"]["kh_g"] == 114 and _fu["total"]["dauer_s"] == 6900, str(_fu["vorher"]))
check("Notiz lesen: Text ausserhalb der Abschnitte wird nicht gelesen", not any("Gefühl" in str(x) for x in (_fu["bemerkungen"], _la)))

_t20 = tempfile.mkdtemp()
_D20 = {"activities": [{"id": "g501", "gid": "g501", "sport": "rad", "typ": "Zwift", "name": "Rolle", "date": "2026-11-03", "start": "18:00", "km": 60, "hm": 0, "dur": 7000, "mv": 6950},
                       {"id": "f777", "gid": "g777", "sport": "rad", "typ": "Rennrad", "name": "Ausfahrt", "date": "2026-10-20", "start": "09:00", "km": 80, "hm": 900, "dur": 10800},
                       {"id": "g888", "gid": "g888", "sport": "schwimm", "typ": "Schwimmbad", "name": "Technik", "date": "2026-11-02", "start": "07:00", "km": 2, "hm": 0, "dur": 3000},
                       {"id": "g999", "gid": "g999", "sport": "rad", "typ": "Rennrad", "name": "Kurz", "date": "2026-11-01", "start": "12:00", "km": 20, "hm": 100, "dur": 1800}],
        "days": [], "config": {}, "lactate": [{"id": "alt1", "kind": "check", "date": "2026-10-20", "activity": "g777", "t_s": 3610, "lactate": 1.4, "w": 200}],
        "fueling": [], "audit": []}
json.dump(_D20, open(os.path.join(_t20, "d.json"), "w"))
_N20 = {"lauf": "nacht",
        "activities": [{"garmin_id": 501, "name": "Rolle", "type": "virtual_ride", "start_local": "2026-11-03T18:00:00", "duration_s": 7000, "notiz": _NOTIZ}],
        "notizen_garmin": {"777": "Laktat:\n- Min 60: 1,4 mmol/l | 10 min davor (50–60): Ø 200 W, Ø HF 135\n- Min 120: 1,9 mmol/l | 10 min davor (110–120): Ø 201 W, Ø HF 140",
                           "g888": "Verpflegung:\n- Min 20: Gel (25 g KH)", "999": "Verpflegung:\n- Min 10: Gel (25 g KH)\nTotal: 25 g KH", "12345": None},
        "days": [{"date": "2026-11-03", "readiness": 64, "readinessLevel": "MODERATE", "bodyBattery": 71, "bbSleep": 48, "stress": 31, "stressHighMin": 40,
                  "bbHigh": 90, "bbLow": 18, "sleepStress": 19}, {"date": "2026-11-02", "hrv": None, "stress": None}]}
json.dump(_N20, open(os.path.join(_t20, "n.json"), "w"))
merge_daily.main(os.path.join(_t20, "d.json"), os.path.join(_t20, "n.json"))
_d20 = json.load(open(os.path.join(_t20, "d.json")))
_G20 = _d20["garmin_notizen"]
check("Notizen: wörtlich je Garmin-ID gespeichert (nicht in der Aktivität), leere Notiz als «ohne Text» abgerufen",
      _G20["g501"]["text"] == _NOTIZ and _G20["g12345"]["text"] is None and "notiz" not in _d20["activities"][-1] and set(_G20) == {"g501", "g777", "g888", "g999", "g12345"}, str(list(_G20)))
_lv20 = {p["id"]: p for p in _d20["laktat_vorschau"]}
check("Notizen → Laktat: Vorschau je Messung mit Werten laut Notiz, Zeitpunkt = Blockende, Fenster, Pause und Quelle",
      set(_lv20) == {"ln-g501-40", "ln-g501-95", "ln-g777-120"} and _lv20["ln-g501-40"]["kandidaten"] == [{"x": 205, "hr": 138, "np": None, "t_s": 2400, "win_s": 600, "pause_s": 190}]
      and _lv20["ln-g501-95"]["block"] == "Min 84:20–94:20" and _lv20["ln-g501-40"]["status"] == "vorschau"
      and "nicht aus FIT nachgerechnet" in _lv20["ln-g501-40"]["hinweise"][0] and _lv20["ln-g501-40"]["zeilen"][0]["quelle"]["stelle"].startswith("Garmin-Notiz der Aktivität: «Min 40: 1,7"), str(_lv20.get("ln-g501-40")))
check("Notizen → Laktat: dieselbe Messung schon in lactate (gleiche Aktivität über die gid, ±2 min) → keine Vorschau, Hinweis",
      "ln-g777-60" not in _lv20 and any("Min 60: schon als Laktatmessung erfasst" in h["text"] for h in _d20["notizen_hinweise"]), str(_d20["notizen_hinweise"]))
_fv20 = {p["id"]: p for p in _d20.get("fueling_vorschau", [])}
check("Notizen → Verpflegung: Vorschau nur für Rad/Laufen ab 40 min; Summe 114 g = Total, vorher nicht gezählt",
      set(_fv20) == {"fn-g501"} and _fv20["fn-g501"]["pruefung"] == "ok" and _fv20["fn-g501"]["summe_kh_g"] == 114 and len(_fv20["fn-g501"]["vorher"]) == 2
      and _fv20["fn-g501"]["status"] == "vorschau" and _d20["fueling"] == [], str(_fv20))
check("Tageswerte: Readiness, Body Battery, Stress und Schlaf-Stress übernommen, leere Tage ohne Eintrag, Version wellness-1.0",
      _d20["days"] == [{"date": "2026-11-03", "readiness": 64, "readinessLevel": "MODERATE", "bodyBattery": 71, "bbSleep": 48, "stress": 31, "stressHighMin": 40,
                        "bbHigh": 90, "bbLow": 18, "sleepStress": 19}] and _d20["versions"]["wellness"]["v"] == "wellness-1.0" and _d20["versions"]["notizen"]["v"] == "notizen-1.0", str(_d20["days"]))
# B1: Laktat aus der Notiz bestätigen; Verpflegung auf der Seite gespeichert (fueling «fn-…»)
_ev = copy.deepcopy(_fv20["fn-g501"]["events"])
json.dump({"laktat_bestaetigt": ["ln-g501-40"], "fueling_add": [{"id": "fn-g501", "v": "fueling-1.0", "activity_id": "g501", "date": "2026-11-03", "sport": "rad",
           "status": "protokolliert", "quelle": "Garmin-Notiz der Aktivität", "events": _ev, "gi": [], "notiz": ""}]}, open(os.path.join(_t20, "b.json"), "w"))
merge_daily.main(os.path.join(_t20, "d.json"), os.path.join(_t20, "b.json"))
_d21 = json.load(open(os.path.join(_t20, "d.json")))
_l21 = next(l for l in _d21["lactate"] if l["id"] == "ln-g501-40")
check("Notizen → B1: Messung übernommen mit Zeitpunkt, Block, Pause und Quelle laut Notiz; Vorschau «übernommen» und nicht neu angelegt",
      _l21["lactate"] == 1.7 and _l21["w"] == 205 and _l21["hr_avg"] == 138 and _l21["t_s"] == 2400 and _l21["win_s"] == 600 and _l21["pause_s"] == 190
      and _l21["activity"] == "g501" and "nicht aus FIT" in _l21["note"]
      and [p["status"] for p in _d21["laktat_vorschau"] if p["id"] == "ln-g501-40"] == ["übernommen"], str(_l21))
check("Notizen → Verpflegung auf der Seite gespeichert: Vorschau «übernommen», Eintrag zählt als eigener (Garmin-Protokoll tritt zurück)",
      [p["status"] for p in _d21["fueling_vorschau"]] == ["übernommen"] and [e["id"] for e in _d21["fueling"]] == ["fn-g501"], str(_d21.get("fueling_vorschau")))
# Notiz in Garmin geändert bzw. gelöscht: eigene Vorschauen folgen (alte Fassung im Audit), übernommene bleiben
json.dump({"notizen_garmin": {"501": _NOTIZ.replace("2,1 mmol/l", "2,3 mmol/l"), "777": ""}}, open(os.path.join(_t20, "c.json"), "w"))
merge_daily.main(os.path.join(_t20, "d.json"), os.path.join(_t20, "c.json"))
_d22 = json.load(open(os.path.join(_t20, "d.json")))
_lv22 = {p["id"]: p for p in _d22["laktat_vorschau"]}
check("Notiz geändert: Vorschau neu (2,3 statt 2,1 mmol/l), übernommene Messung unverändert; gelöschte Notiz entfernt ihre Vorschau – alles im Audit",
      _lv22["ln-g501-95"]["zeilen"][0]["la"] == 2.3 and _lv22["ln-g501-40"]["status"] == "übernommen" and "ln-g777-120" not in _lv22
      and _d22["garmin_notizen"]["g777"]["text"] is None
      and {a["was"] for a in _d22["audit"]} >= {"Garmin-Notiz geändert", "Garmin-Notiz gelöscht", "Laktat-Vorschau ersetzt (Notiz geändert)", "Laktat-Vorschau entfernt (nicht mehr in der Notiz)"},
      str({a["was"] for a in _d22["audit"]}))
# Audit V6.4 B2: aus FIT nachgerechnete Vorschau mit derselben ID (laktat_vorschau.py --extra) bleibt beim nächsten Update stehen
_d23 = copy.deepcopy(_d22)
_fit = {"id": "ln-g501-95", "status": "vorschau", "art": "check", "sport": "rad", "datum": "2026-11-03", "aktivitaet": "g501", "datei": "Garmin-Verbindung",
        "zeilen": [{"x": 203, "la": 2.3, "quelle": {"stelle": "Chat"}}], "zuordnung": "unklar", "regel": "1 Blöcke bei 203 W in der Aktivität; Zuordnung offen",
        "kandidaten": [{"x": 203, "hr": 144, "np": 205, "t_s": 5660, "uhr": "19:34", "hr30": 146}], "fenster": ["19:24:20", "19:34:20"], "hinweise": []}
_d23["laktat_vorschau"] = [p for p in _d23["laktat_vorschau"] if p["id"] != "ln-g501-95"] + [copy.deepcopy(_fit)]
_n23 = len(_d23.get("audit", []))
NZ.ableiten(_d23)
_p23 = next(p for p in _d23["laktat_vorschau"] if p["id"] == "ln-g501-95")
check("Notizen (Audit V6.4 B2): aus FIT nachgerechnete Vorschau mit gleicher ID wird nicht durch die Notiz-Fassung ersetzt und nicht entfernt",
      _p23 == _fit and not any("Laktat-Vorschau" in a["was"] for a in _d23["audit"][_n23:]), str(_p23.get("regel")))
check("Notizen offen: Aktivitäten mit Garmin-ID ohne abgerufene Notiz, neueste zuerst",
      NZ.offen({"activities": [{"gid": "g1", "date": "2026-01-01"}, {"gid": "g2", "date": "2026-02-01"}, {"id": "x", "date": "2026-03-01"}, {"gid": "g3", "date": "2025-12-01"}],
                "garmin_notizen": {"g3": {"text": None}}}, 5) == (["2", "1"], 2))
check("Notiz nur mit Total: ein Eintrag ohne Zeitpunkt, so wie er dasteht",
      NZ._fueling_vorschau({"date": "2026-11-01", "sport": "rad"}, NZ.lesen("Verpflegung:\nTotal: 50 g KH in 1:40 h")["fueling"], "g1")["events"][0]["kh_g"] == 50)
check("Notiz mit zwei KH-Angaben in einer Zeile: nicht gezählt, Hinweis statt Rate",
      NZ.lesen("Verpflegung:\n- Min 30: 2 Gels (je 25 g KH, zusammen 50 g KH)")["fueling"]["waehrend"][0]["kh_g"] is None)
check("Lauf-Messung aus der Notiz: Pace als km/h und Pace mitgeführt",
      NZ._laktat_vorschau({"sport": "lauf", "date": "2026-11-01"}, NZ.lesen("Laktat:\n- Min 30: 2,0 mmol/l | 10 min davor (20–30): Ø 5:00 /km, Ø HF 150")["laktat"][0], "g5")["zeilen"][0]
      == {"x": 12.0, "la": 2.0, "hf": 150, "quelle": {"stelle": "Garmin-Notiz der Aktivität: «Min 30: 2,0 mmol/l | 10 min davor (20–30): Ø 5:00 /km, Ø HF 150»"}, "pace_s": 300})

_us = {"bodyBatteryAtWakeTime": 77, "bodyBatteryDuringSleep": 52, "averageStressLevel": 28, "highStressDuration": 3660, "bodyBatteryHighestValue": 95, "bodyBatteryLowestValue": 21}
check("Tageswerte aus get_user_summary: Aufwachen und Schlaf immer, Stress und Höchst-/Tiefstwert nur für abgeschlossene Tage",
      WL.aus_summary(_us) == {"bodyBattery": 77, "bbSleep": 52, "stress": 28, "stressHighMin": 61, "bbHigh": 95, "bbLow": 21}
      and WL.aus_summary(_us, abgeschlossen=False) == {"bodyBattery": 77, "bbSleep": 52}, str(WL.aus_summary(_us)))
check("Tageswerte: negative oder fehlende Garmin-Werte bleiben leer, Readiness nur mit Score",
      WL.aus_summary({"averageStressLevel": -1, "bodyBatteryAtWakeTime": None}) == {} and WL.aus_readiness({"score": 58, "level": "MODERATE"}) == {"readiness": 58, "readinessLevel": "MODERATE"}
      and WL.aus_readiness("No morning training readiness data found") == {})
check("Nachholen mit der kleinen Abfrage: nur das Tagesmittel, «zu wenig Daten» (negativ) bleibt leer",
      WL.aus_stress_summary({"avg_stress_level": 23, "max_stress_level": 90}) == {"stress": 23} and WL.aus_stress_summary({"avg_stress_level": -1}) == {})
_o = WL.offen({"config": {}}, "2026-11-13")
check("Tageswerte rückwirkend: ohne Zeiger die 20 Tage vor gestern; Readiness erst ab 1.8.2024; Ende bei 2020",
      _o["tage"][0] == "2026-11-11" and _o["tage"][-1] == "2026-10-23" and _o["neuer_zeiger"] == "2026-10-23"
      and WL.offen({"config": {"wellness_backfill": "2024-08-05"}}, "2026-11-13")["readiness"] == ["2024-08-04", "2024-08-03", "2024-08-02", "2024-08-01"]
      and WL.offen({"config": {"wellness_backfill": "2020-01-04"}}, "2026-11-13")["tage"] == ["2020-01-03", "2020-01-02", "2020-01-01"]
      and WL.offen({"config": {"wellness_backfill": "2020-01-01"}}, "2026-11-13")["fertig"] is True, str(_o))

# --- V6.2.3 garmin-export-1.0: Garmin-Datenexport → Verlauf (Format wie im echten Export, erfundene Werte) ---
import garmin_export as GX  # noqa: E402
_gx = tempfile.mkdtemp()
os.makedirs(os.path.join(_gx, "w")); os.makedirs(os.path.join(_gx, "m"))
json.dump([
    {"calendarDate": "2026-01-10", "sleepWindowConfirmationType": "ENHANCED_CONFIRMED_FINAL", "deepSleepSeconds": 3600, "lightSleepSeconds": 14400,
     "remSleepSeconds": 5400, "awakeSleepSeconds": 900, "avgSleepStress": 12.34, "sleepScores": {"overallScore": 88}},
    {"calendarDate": "2026-01-11", "sleepWindowConfirmationType": "OFF_WRIST", "deepSleepSeconds": 0, "lightSleepSeconds": 0, "awakeSleepSeconds": 0},
    {"calendarDate": "2026-01-12", "sleepWindowConfirmationType": "UNCONFIRMED"},
    {"calendarDate": "2021-03-01", "sleepWindowConfirmationType": "ENHANCED_CONFIRMED_FINAL", "deepSleepSeconds": 7200, "lightSleepSeconds": 18000, "awakeSleepSeconds": 600},
    {"napList": [{"napTimeSec": 1200, "calendarDate": "2026-01-10"}], "retro": False}], open(os.path.join(_gx, "w", "2026-01-01_2026-04-01_12345678_sleepData.json"), "w"))
json.dump([{"calendarDate": "2026-01-10", "metrics": [{"type": "HRV", "value": 80.0}, {"type": "HR", "value": 48.0}, {"type": "SPO2", "value": 96.0}]}],
          open(os.path.join(_gx, "w", "2026-01-01_2026-04-01_12345678_healthStatusData.json"), "w"))
json.dump([
    {"calendarDate": "2026-01-10", "timestamp": "2026-01-10T05:30:00.0", "inputContext": "AFTER_WAKEUP_RESET", "score": 71, "level": "HIGH"},
    {"calendarDate": "2026-01-10", "timestamp": "2026-01-10T09:00:00.0", "inputContext": "UPDATE_REALTIME_VARIABLES", "score": 60, "level": "MODERATE"},
    {"calendarDate": "2026-01-11", "timestamp": "2026-01-11T05:30:00.0", "inputContext": "AFTER_WAKEUP_RESET", "score": 70, "level": "HIGH"},
    {"calendarDate": "2026-01-11", "timestamp": "2026-01-11T13:00:00.0", "inputContext": "AFTER_WAKEUP_RESET", "score": 90, "level": "PRIME"},
    {"calendarDate": "2026-01-12", "timestamp": "2026-01-12T17:00:00.0", "inputContext": "AFTER_POST_EXERCISE_RESET", "score": 40, "level": "LOW"},
    {"calendarDate": "2024-09-01", "timestamp": "2024-09-01T06:00:00.0", "score": 30, "level": "LOW"}], open(os.path.join(_gx, "m", "TrainingReadinessDTO_20260101_20260401_12345678.json"), "w"))
_G = GX.lesen([_gx], erstellt="2026-11-13T12:00:00+01:00")
_T = {t["date"]: t for t in _G["tage"]}
check("Garmin-Export: Schlaf ohne Wachzeit (Tief + Leicht + REM), Schlafwert, Stress im Schlaf; ohne REM nur Tief + Leicht",
      _T["2026-01-10"]["sleepH"] == 6.5 and _T["2026-01-10"]["sleepScore"] == 88 and _T["2026-01-10"]["sleepStress"] == 12.3
      and _T["2021-03-01"]["sleepH"] == 7.0 and "sleepScore" not in _T["2021-03-01"], str(_G["tage"]))
check("Garmin-Export: Nacht ohne Uhr (OFF_WRIST) und unbestätigte Nacht ohne Schlafwerte; HRV aus dem Gesundheitsstatus, dessen «HR» nie als Ruhepuls",
      "sleepH" not in _T.get("2026-01-11", {}) and "2026-01-12" not in _T and _T["2026-01-10"]["hrv"] == 80 and "rhr" not in _T["2026-01-10"]
      and "hrv" not in GX.lesen([_gx], mit_gesundheit=False)["tage"][-1])
check("Garmin-Export: Readiness nach dem Aufwachen; zwei verschiedene Aufwach-Werte → Tag leer (nicht geraten); nach Training zählt nicht; alter Eintrag ohne inputContext",
      _T["2026-01-10"]["readiness"] == 71 and _T["2026-01-10"]["readinessLevel"] == "HIGH" and "readiness" not in _T.get("2026-01-11", {})
      and "2026-01-12" not in _T and _T["2024-09-01"]["readiness"] == 30 and _G["ausgelassen"] == {"readiness_mehrdeutig": 1}, str(_G))
check("Garmin-Export: gleiche Daten → gleiche ID (Inhalt), Format für die Seite",
      _G["format"] == "spuren-garmin-verlauf-1" and GX.lesen([_gx])["id"] == _G["id"] and _G["zeitraum"] == ["2021-03-01", "2026-01-10"])
_bad = dict(_G, tage=_G["tage"] + [{"date": "2099-01-01", "sleepH": 7}, {"date": "2026-01-13", "sleepH": 40, "readiness": 50}, {"date": "2026-01-14", "foo": 1}])
_ok, _f = GX.pruefen(_bad, "2026-11-13")
check("Garmin-Verlauf prüfen: Datum in der Zukunft, Wert ausserhalb, unbekanntes Feld verworfen; gültige Werte desselben Tags bleiben",
      [t["date"] for t in _ok][-1] == "2026-01-13" and "sleepH" not in _ok[-1] and _ok[-1]["readiness"] == 50 and len(_f) == 2
      and GX.pruefen({"format": "x", "tage": []})[0] == [], str(_f))
_DG = {"days": [{"date": "2026-01-10", "sleepH": 6.4, "hrv": 70}, {"date": "2025-12-01", "rhr": 50}], "config": {}}
_m1 = GX.einspielen(_DG, _G, "2026-11-13")
_d10 = next(d for d in _DG["days"] if d["date"] == "2026-01-10")
check("Garmin-Verlauf einspielen: vorhandene Werte bleiben (Garmin-Verbindung massgebend), fehlende gefüllt, neue Tage, Nachholen läuft weiter",
      _d10["sleepH"] == 6.4 and _d10["sleepScore"] == 88 and _d10["readiness"] == 71 and _d10["hrv"] == 70
      and any(d["date"] == "2021-03-01" for d in _DG["days"]) and _DG["config"]["days_backfill"] == "2025-12-01"
      and _DG["garmin_export"][0]["id"] == _G["id"] and _DG["garmin_export"][0]["neue_tage"] == 2, _m1)
_n1 = len(_DG["days"])
GX.einspielen(_DG, _G, "2026-11-13")
check("Garmin-Verlauf: dieselbe Datei noch einmal → nichts doppelt", len(_DG["days"]) == _n1 and len(_DG["garmin_export"]) == 1 and _DG["garmin_export"][0]["gefuellt"] == {})
_DG2 = {"days": [], "config": {"days_backfill": "2024-01-01"}}
merge_daily.v5_merge(_DG2, {"garmin_verlauf": _G})
check("Garmin-Verlauf über merge_daily (Eingang): eingespielt, gesetzter Zeiger fürs Nachholen bleibt",
      len(_DG2["days"]) == len(_G["tage"]) and _DG2["config"]["days_backfill"] == "2024-01-01" and _DG2["versions"]["garmin_export"]["v"] == "garmin-export-1.0")

# --- V6.2.2 zonenvorschlag-1.0: Zonenprofil von der Seite (erfundene Grenzen) ---
def _skala(key, disziplin, metrik, g):
    zs = [{"z": f"Z{i + 1}", "von": None if i == 0 else g[i - 1], "bis": None if i == 4 else g[i]} for i in range(5)]
    return {"key": key, "disziplin": disziplin, "metrik": metrik, "zonen": zs}


def _zprof(pid, test="t-b", rad=(150, 185, 230, 246), pace=(400, 330, 270, 250)):
    return {"id": pid, "name": "Zonen vom 15.1.2026", "status": "aktiv", "gueltig_ab": "2026-01-15", "gueltig_bis": None,
            "freigabe": {"art": "seite", "datum": "2026-01-15", "durch": "Silas"},
            "methodik": {"art": "zonenvorschlag-1.0", "bestaetigt": True, "je_sportart": {"rad": {"test": test}}},
            "skalen": [_skala("rad_w", "rad", "leistung", rad), _skala("lauf_pace", "lauf", "pace", pace)]}


_DZ = {"zonen": [{"id": "alt", "status": "aktiv", "gueltig_ab": "2025-10-01", "skalen": []}],
       "schwellen": {"tests": [{"test": "t-b", "datenstatus": "bestätigt"}, {"test": "t-v", "datenstatus": "vorschau"}]}}
merge_daily.v5_merge(_DZ, {"zonen_add": [_zprof("zonen-20260115")]})
check("Zonen von der Seite: aus bestätigtem Test übernommen, bisheriges Profil ersetzt (gültig bis zum neuen Datum)",
      [z["id"] for z in _DZ["zonen"]] == ["alt", "zonen-20260115"] and _DZ["zonen"][0]["status"] == "ersetzt" and _DZ["zonen"][0]["gueltig_bis"] == "2026-01-15"
      and _DZ["versions"]["zonenvorschlag"]["v"] == "zonenvorschlag-1.0", str(_DZ["zonen"]))
merge_daily.v5_merge(_DZ, {"zonen_add": [dict(_zprof("zonen-20260115"), name="Zonen vom 15.1.2026 (Rad und Laufen)")]})
check("Zonen: gleiche Fassung am selben Tag erweitert – ersetzt mit Audit, bleibt aktiv",
      len(_DZ["zonen"]) == 2 and _DZ["zonen"][1]["status"] == "aktiv" and _DZ["zonen"][1]["name"].endswith("(Rad und Laufen)")
      and any(a.get("was") == "Zonenprofil ersetzt" for a in _DZ["audit"]))
for _bad, _grund in ((_zprof("z-v", test="t-v"), "nicht bestätigt (B1)"), (_zprof("z-o", rad=(150, 230, 185, 246)), "nicht geordnet"),
                     (_zprof("z-p", pace=(250, 270, 330, 400)), "nicht geordnet"), (dict(_zprof("z-f"), freigabe={}), "ohne Freigabe"),
                     (_zprof("demo-zonen"), "ohne gültige ID")):
    _g = merge_daily.zonen_pruefen(_DZ, _bad)
    merge_daily.v5_merge(_DZ, {"zonen_add": [_bad]})
    check(f"Zonen nicht übernommen: {_grund}", not any(z["id"] == _bad["id"] for z in _DZ["zonen"]) and _DZ["zonen"][1]["status"] == "aktiv"
          and _grund in (_g or ""), str(_g))
_lz = dict(_zprof("z-l"))
_lz["skalen"] = [dict(_lz["skalen"][0], zonen=[{"z": "Z1", "von": None, "bis": 150}, {"z": "Z2", "von": 160, "bis": None}])]
check("Zonen: Lücke zwischen zwei Zonen wird abgelehnt", "nicht lückenlos" in (merge_daily.zonen_pruefen(_DZ, _lz) or ""))
check("Zonen abgelehnt: Grund je Profil in den Daten (für die Seite), je ID nur einmal",
      [x["id"] for x in _DZ.get("zonen_abgelehnt", [])] == ["z-v", "z-o", "z-p", "z-f", "demo-zonen"] and "B1" in _DZ["zonen_abgelehnt"][0]["grund"], str(_DZ.get("zonen_abgelehnt")))

# ---------- V6.4.4 Leck-Prüfung (tools/leck_pruefen.py) mit erfundenen «echten» Werten in einem Test-Repository ----------
_tl = tempfile.mkdtemp()
_DL = {"activities": [{"id": "g10000000123", "gid": "g10000000123", "sport": "lauf", "date": "2026-03-05", "km": 12.34}],
       "zonen": [{"id": "z", "skalen": [{"key": "rad_w", "unit": "W", "zonen": [{"z": "Z1", "von": None, "bis": 143}, {"z": "Z2", "von": 143, "bis": 197, "text": "FatMax 171–183"},
                                                                          {"z": "Z3", "von": 197, "bis": 229}, {"z": "Z4", "von": 229, "bis": 251}, {"z": "Z5", "von": 251, "bis": None}]}]}],
       "schwellen": {"tests": [{"lt2": {"x": 231}}]}, "config": {"ftp": 263},
       "tests": [{"date": "2027-02-18", "kind": "css", "note": "nach dem Lager"}]}
json.dump(_DL, open(os.path.join(_tl, "data.json"), "w"))
os.makedirs(os.path.join(_tl, "repo"))
_files = {"a.js": "// Beispiel: FatMax 171–183\n", "b.md": "Zonen 143, 197 und 229 W\n", "c.py": "ftp = 263  # FTP\n", "d.cjs": 'x("g10000000123")\n',
          "e.md": "Lauf am 5.3.2026: 12,34 km\n", "f.md": "CSS 18.2.2027 nach dem Lager\n", "g.md": "kontakt" + "@" + "beispiel.ch\n", "ok.md": "FatMax a–b, FTP 200, 10 km am 1.1.2026\n"}
for n, t in _files.items():
    open(os.path.join(_tl, "repo", n), "w", encoding="utf-8").write(t)
subprocess.run(["git", "init", "-q"], cwd=os.path.join(_tl, "repo"))
_lk = subprocess.run([sys.executable, "-I", os.path.join(ROOT, "tools", "leck_pruefen.py"), os.path.join(_tl, "data.json")], cwd=os.path.join(_tl, "repo"), capture_output=True, text=True)
_lkf = {l.split(":")[0] for l in _lk.stdout.splitlines() if ":" in l and not l.startswith("LECK")}
check("Leck-Prüfung: findet ID, Zonentext, Zonengrenzen, FTP, Distanz mit Datum, Testtermin und E-Mail – nie den Wert in der Ausgabe; erfundene Werte ok",
      _lk.returncode == 1 and _lkf == {"a.js", "b.md", "c.py", "d.cjs", "e.md", "f.md", "g.md"} and "12,34" not in _lk.stdout and "263" not in _lk.stdout, _lk.stdout)

# ---------- V6.5 Wahl je Tag (planwahl-1.0) ----------
_DW = {}
merge_daily.v5_merge(_DW, {"planwahl_add": [{"id": "pw-2026-03-02", "date": "2026-03-02", "wahl": "vorschlag", "v": "planwahl-1.0"},
                                             {"id": "pw-2026-03-03", "date": "2026-03-03", "wahl": "enduco", "v": "planwahl-1.0"},
                                             {"id": "pw-20260304", "date": "20260304", "wahl": "enduco"}, {"id": "pw-2026-03-05", "date": "2026-03-05", "wahl": "beides"},
                                             {"id": "pw-2026-03-01", "date": "2026-03-06", "wahl": "frei"}]})
merge_daily.v5_merge(_DW, {"planwahl_add": [{"id": "pw-2026-03-02", "date": "2026-03-02", "wahl": "enduco", "v": "planwahl-1.0"}]})
check("Wahl je Tag: nur gültiges Datum, passende ID und bekannte Wahl; gleiche ID ersetzt mit Audit",
      [(w["date"], w["wahl"]) for w in _DW.get("plan_wahl", [])] == [("2026-03-02", "enduco"), ("2026-03-03", "enduco")]
      and any(a.get("was") == "Wahl des Plans ersetzt" for a in _DW.get("audit", [])), str(_DW.get("plan_wahl")))

# ---------- V6.5 Enduco-Bibliothek (tools/bibliothek.py, bib-1.0) – erfundene Workouts ----------
import bibliothek  # noqa: E402
_S1 = [{"order": 1, "type": "warmup", "end_condition": "time", "end_condition_value": 600.0, "target_type": "power.zone", "target_value_low": 120.0, "target_value_high": 150.0},
       {"order": 2, "type": "repeat", "end_condition": "iterations", "end_condition_value": 3.0, "repeat_count": 3, "step_count": 2, "steps": [
           {"order": 3, "type": "interval", "description": "3 min hart", "end_condition": "time", "end_condition_value": 180.0, "target_type": "power.zone", "target_value_low": 260.0, "target_value_high": 280.0},
           {"order": 4, "type": "recovery", "end_condition": "time", "end_condition_value": 120.0}]}]
_LISTE = {"count": 4, "workouts": [
    {"id": 1000000001, "name": "Beispiel Intervalle", "sport": "cycling", "provider": "Enduco", "created_date": "2026-01-10T20:00:00.0", "description": "Text A über Intervalle.", "estimated_duration_seconds": 3600},
    {"id": 1000000002, "name": "Beispiel Grundlage", "sport": "running", "provider": "Enduco", "created_date": "2026-01-12T20:00:00.0", "description": "Text B.", "estimated_duration_seconds": 2700},
    {"id": 1000000003, "name": "Beispiel Schwimmen", "sport": "swimming", "provider": "Enduco", "created_date": "2026-01-14T20:00:00.0", "description": "Text B."},
    {"id": 1000000009, "name": "Eigenes Workout", "sport": "cycling", "provider": None, "created_date": "2026-01-15T20:00:00.0", "description": "privat"}]}
_DB = {}
_zl = bibliothek.einspielen_liste(_DB, _LISTE, "2026-01-20")
_B = _DB["enduco_bib"]
check("Bibliothek: Liste nur Enduco, Volltext je Text einmal, Sportart übersetzt",
      _zl == {"neu": 3} and sorted(_B["workouts"]) == ["1000000001", "1000000002", "1000000003"] and len(_B["texte"]) == 2
      and _B["workouts"]["1000000003"]["sport"] == "schwimm" and _DB["versions"]["enduco_bib"]["v"] == "bib-1.0", str(_zl))
check("Bibliothek: Liste ein zweites Mal – nichts Neues, nichts doppelt", bibliothek.einspielen_liste(_DB, _LISTE, "2026-01-21") == {}
      and all(len(w["versionen"]) == 1 for w in _B["workouts"].values()))
_p = {"date": "2026-01-22", "title": "Beispiel Intervalle", "sport": "rad", "dur_s": 3600, "wid": 1000000001, "quelle": "Enduco über Garmin",
      "desc": "Text A über Intervalle.", "desc_voll": "Text A über Intervalle.", "geaendert": "2026-01-10T20:00:00.0", "erstellt": "2026-01-10T20:00:00.0", "steps": _S1}
_z = bibliothek.einspielen(_DB, {"planned": [_p]}, "2026-01-21")
_w1 = _B["workouts"]["1000000001"]
check("Bibliothek: Kalender ergänzt die Version aus der Liste (Schritte, Termin, Änderungsdatum) statt eine zweite anzulegen",
      _z == {"ergaenzt": 1} and len(_w1["versionen"]) == 1 and _w1["versionen"][0]["steps"] == _S1 and _w1["termine"] == ["2026-01-22"]
      and _w1["versionen"][0]["geaendert"] == "2026-01-10T20:00:00.0" and _w1["versionen"][0]["steps_quelle"] == "kalender", str(_w1))
_S1b = copy.deepcopy(_S1)
_S1b[1]["steps"][0]["target_value_low"] = 260.0000000001
_S1b[1]["steps"][0].pop("description")
del _S1b[0]["order"]
bibliothek.einspielen(_DB, {"planned": [dict(_p, steps=_S1b, date="2026-01-23")]}, "2026-01-22")
check("Bibliothek: dieselbe Fassung nochmals abgeschrieben (Rundung, ohne Text) – keine neue Version, Schritte bleiben die ersten",
      len(_w1["versionen"]) == 1 and _w1["versionen"][0]["steps"] == _S1 and _w1["termine"] == ["2026-01-22", "2026-01-23"])
_S2 = copy.deepcopy(_S1)
_S2[1]["repeat_count"] = 4
bibliothek.einspielen(_DB, {"planned": [dict(_p, steps=_S2, geaendert="2026-01-24T07:00:00.0", date="2026-01-25")]}, "2026-01-24")
check("Bibliothek: Enduco ändert das Workout (neues Änderungsdatum) – neue Version, die alte bleibt",
      len(_w1["versionen"]) == 2 and _w1["versionen"][0]["steps"] == _S1 and _w1["versionen"][1]["steps"] == _S2 and _w1["versionen"][1]["ab"] == "2026-01-24")
_w2 = _B["workouts"]["1000000002"]
bibliothek.einspielen(_DB, {"planned": [{"date": "2026-01-26", "title": "Beispiel Grundlage", "sport": "lauf", "wid": 1000000002, "quelle": "Enduco über Garmin",
                                          "desc": "Text B.", "steps": _S1}]}, "2026-01-25")
bibliothek.einspielen(_DB, {"planned": [{"date": "2026-01-26", "title": "Beispiel Grundlage", "sport": "lauf", "wid": 1000000002, "quelle": "Enduco über Garmin",
                                          "desc": "Text B.", "steps": _S2}]}, "2026-01-26")
check("Bibliothek: ohne Änderungsdatum zählt der Inhalt – andere Wiederholungen = neue Version, gleicher Text bleibt verknüpft",
      len(_w2["versionen"]) == 2 and _w2["versionen"][1]["steps"] == _S2 and _w2["versionen"][0].get("text_h") and not _w2["versionen"][1].get("kurz"), str(_w2["versionen"]))
check("Bibliothek: nur der erste Satz aus dem Kalender gilt nicht als Volltext", "Text B." in _B["texte"].values() and len(_B["texte"]) == 2)
_o = bibliothek.offen(_DB, 15)
check("Bibliothek: offen = neueste Version ohne Schritte, neueste zuerst", _o["wids"] == [1000000003] and _o["offen"] == 1 and not _o["fertig"], str(_o))
for _i in range(3):
    bibliothek.einspielen(_DB, {"enduco_schritte": [{"wid": 1000000003, "fehlt": True}]}, "2026-01-27")
check("Bibliothek: nach drei Fehlversuchen nicht mehr offen (nie endlos)", bibliothek.offen(_DB)["wids"] == [] and bibliothek.offen(_DB)["fertig"])
bibliothek.einspielen(_DB, {"enduco_schritte": [{"wid": 1000000003, "titel": "Beispiel Schwimmen", "sport": "swimming", "geaendert": "2026-01-14T20:00:00.0",
                                                  "desc_voll": "Text B.", "distanz_m": 2000.0, "pool_m": 25.0,
                                                  "steps": [{"order": 1, "type": "interval", "description": "4 × 50 m | Übung frei | 2:10/100m", "end_condition": "distance",
                                                             "end_condition_value": 50.0, "stroke_type": "free", "equipment_type": "fins"}]}]}, "2026-01-28")
_w3 = _B["workouts"]["1000000003"]
check("Bibliothek: Schritte rückwirkend (Schwimmen mit Übung und Hilfsmittel unverändert)", len(_w3["versionen"]) == 1
      and _w3["versionen"][0]["steps"][0]["equipment_type"] == "fins" and _w3["versionen"][0]["pool_m"] == 25.0 and "versuche" not in _w3, str(_w3))
_L2 = copy.deepcopy(_LISTE)
_L2["workouts"] = [w for w in _L2["workouts"] if w["id"] != 1000000002]
bibliothek.einspielen_liste(_DB, _L2, "2026-01-29")
check("Bibliothek: ein Workout fehlt in der Liste (in Garmin gelöscht) – bleibt erhalten", "1000000002" in _B["workouts"])
_td = tempfile.mkdtemp()
json.dump({"activities": [], "days": [], "planned": []}, open(os.path.join(_td, "d.json"), "w"))
json.dump({"planned": [_p], "planned_range": ["2026-01-20", "2026-02-03"], "workouts_neu": [{"wid": 1000000005, "title": "Neu ohne Termin", "sport": "cycling",
           "dur_s": 1800, "erstellt": "2026-01-21T10:00:00", "desc": "Kurz.", "desc_voll": "Kurz. Und mehr.", "steps": []}]}, open(os.path.join(_td, "n.json"), "w"))
merge_daily.main(os.path.join(_td, "d.json"), os.path.join(_td, "n.json"))
json.dump({"planned": [], "planned_range": ["2026-01-20", "2026-02-03"], "workouts_neu": []}, open(os.path.join(_td, "n.json"), "w"))
merge_daily.main(os.path.join(_td, "d.json"), os.path.join(_td, "n.json"))
_DM = json.load(open(os.path.join(_td, "d.json")))
check("Bibliothek im Nacht-Update: Kalender und neue Workouts bleiben, auch wenn sie aus Kalender und Liste verschwinden",
      sorted(_DM["enduco_bib"]["workouts"]) == ["1000000001", "1000000005"] and _DM["planned"] == [] and _DM["enduco_bib"]["workouts"]["1000000001"]["termine"] == ["2026-01-22"]
      and "Kurz. Und mehr." in _DM["enduco_bib"]["texte"].values(), str(_DM.get("enduco_bib", {}).get("workouts", {}).keys()))

print(f"\n{'ALLE BESTANDEN' if not FAILS else str(len(FAILS)) + ' FEHLGESCHLAGEN'}")
sys.exit(1 if FAILS else 0)
