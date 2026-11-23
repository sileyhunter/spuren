"""Test-Workouts (Umsetzungsplan A9): Zwift-Datei (.zwo) und Garmin-Workout (JSON für upload_workout).

  python3 -I tools/workouts.py <zielordner>

Erzeugt je Vorlage eine .zwo- und eine .json-Datei (Laufen und Schwimmen nur .json). Nichts wird hochgeladen: Silas prüft die Dateien zuerst.
Garmin Rad: Schritte mit Zeitende und Leistungsbereich «power.between» (Watt), je Stufe ein Schritt = eine Runde.
Garmin Laufen (V9.10): Stufentest wie am 12.12.2025 (Start 10,3 km/h, +1 km/h, 4:30 min je Stufe), bis zur Ausbelastung; je Stufe ein Tempobereich
«pace.zone» (m/s), dazwischen eine Pause mit Tastenende (Laktat). Garmin Schwimmen: CSS-Test 400/200 m (Bahn 50 m), Erholung per Taste.
Zwift: ftpOverride 100, damit Power="1.2" genau 120 W bedeutet, unabhängig von der FTP in Zwift.
Namen beginnen mit «IN · » (wie alle Workouts der Seite).
"""
import json
import os
import sys
from xml.sax.saxutils import escape

TOL = 2   # Garmin-Zielbereich ±2 W um die Stufenleistung


def stufentest(name, start=120, schritt=20, stufe_s=300, bis=300, einfahren_s=600, ausfahren_s=600, hinweis=""):
    steps = [("warmup", einfahren_s, start, f"Einfahren {einfahren_s // 60} min bei {start} W")]
    w = start
    n = 1
    while w <= bis:
        steps.append(("interval", stufe_s, w, f"Stufe {n}: {w} W. Laktat in den letzten 30 s, weiterfahren"))
        w += schritt
        n += 1
    steps.append(("cooldown", ausfahren_s, None, "Ausfahren locker"))
    return {"name": name, "hinweis": hinweis, "steps": steps}


def kurzcheck(name, block_w=220, block_s=600, einfahren=((360, 130), (360, 170)), ausfahren_s=600):
    steps = [("warmup", s, w, f"Einfahren {w} W") for s, w in einfahren]
    steps.append(("interval", block_s, block_w, f"Block {block_w} W. Laktat in den letzten 30 s, ohne Anhalten"))
    steps.append(("cooldown", ausfahren_s, None, "Ausfahren locker"))
    return {"name": name, "hinweis": "", "steps": steps}


def zwo(w):
    out = ['<workout_file>', '  <author>Spuren &amp; Formkurve</author>', f'  <name>{escape(w["name"])}</name>',
           f'  <description>{escape(w["hinweis"] or w["name"])}</description>', '  <sportType>bike</sportType>',
           '  <ftpOverride>100</ftpOverride>', '  <tags><tag name="TEST"/></tags>', '  <workout>']
    for kind, dur, watt, text in w["steps"]:
        p = (watt or 120) / 100.0
        if kind == "cooldown" and watt is None:
            out.append(f'    <Cooldown Duration="{dur}" PowerLow="1.40" PowerHigh="1.00"/>')
        elif kind == "warmup":
            out.append(f'    <SteadyState Duration="{dur}" Power="{p:.2f}">')
            out.append(f'      <textevent timeoffset="10" message="{escape(text)}"/>')
            out.append('    </SteadyState>')
        else:
            out.append(f'    <SteadyState Duration="{dur}" Power="{p:.2f}">')
            out.append(f'      <textevent timeoffset="10" message="{escape(text)}"/>')
            out.append(f'      <textevent timeoffset="{max(10, dur - 40)}" message="Gleich Blutentnahme: letzte 30 s, weiterfahren"/>')
            out.append('    </SteadyState>')
    out += ['  </workout>', '</workout_file>', '']
    return "\n".join(out)


def garmin(w):
    steps = []
    for i, (kind, dur, watt, text) in enumerate(w["steps"], 1):
        st = {"type": "ExecutableStepDTO", "stepOrder": i,
              "stepType": {"stepTypeId": {"warmup": 1, "cooldown": 2, "interval": 3}[kind], "stepTypeKey": kind},
              "description": text[:100],
              "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"}, "endConditionValue": float(dur)}
        if watt is None:
            st["targetType"] = {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}
        else:
            st["targetType"] = {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "power.between"}
            st["targetValueOne"] = float(watt - TOL)
            st["targetValueTwo"] = float(watt + TOL)
        steps.append(st)
    return {"workoutName": (PREFIX + w["name"])[:80], "description": (w["hinweis"] or w["name"])[:500],
            "sportType": {"sportTypeId": 2, "sportTypeKey": "cycling"},
            "workoutSegments": [{"segmentOrder": 1, "sportType": {"sportTypeId": 2, "sportTypeKey": "cycling"}, "workoutSteps": steps}]}


PREFIX = "IN · "
LAUF_TOL_MS = 0.06     # Tempo-Zielbereich ±0,06 m/s (≈ ±0,2 km/h) um die Stufengeschwindigkeit


def lauftest(name, start_kmh=10.3, schritt_kmh=1.0, stufe_s=270, stufen=9, einlaufen_s=600, auslaufen_s=600, hinweis=""):
    """Lauf-Stufentest wie 12.12.2025 (Start 10,3 km/h, +1 km/h, 270 s je Stufe, Laktat in einer Pause per Taste), aber bis zur Ausbelastung:
    mehr Stufen als bisher. Schritte: ("warmup"|"interval"|"rest"|"cooldown", dauer_s oder None (Taste), km/h oder None, Text)."""
    steps = [("warmup", einlaufen_s, None, f"Einlaufen {einlaufen_s // 60} min locker, Puls unter 140")]
    for n in range(stufen):
        v = round(start_kmh + n * schritt_kmh, 1)
        steps.append(("interval", stufe_s, v, f"Stufe {n + 1}: {v:.1f} km/h ({int(3600 / v // 60)}:{int(round(3600 / v % 60)) % 60:02d}/km). Laktat nach der Stufe".replace(".", ",", 1)))
        if n < stufen - 1:
            steps.append(("rest", None, None, "Laktat messen, Taste drücken wenn bereit (höchstens 2 min)"))
    steps.append(("cooldown", auslaufen_s, None, "Auslaufen locker"))
    return {"name": name, "hinweis": hinweis, "sport": "running", "steps": steps}


def garmin_lauf(w):
    typ = {"warmup": 1, "cooldown": 2, "interval": 3, "rest": 5}
    steps = []
    for i, (kind, dur, kmh, text) in enumerate(w["steps"], 1):
        st = {"type": "ExecutableStepDTO", "stepOrder": i, "stepType": {"stepTypeId": typ[kind], "stepTypeKey": kind}, "description": text[:100]}
        if dur is None:
            st["endCondition"] = {"conditionTypeId": 1, "conditionTypeKey": "lap.button"}
        else:
            st["endCondition"] = {"conditionTypeId": 2, "conditionTypeKey": "time"}
            st["endConditionValue"] = float(dur)
        if kmh is None:
            st["targetType"] = {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}
        else:
            v = kmh / 3.6
            st["targetType"] = {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "pace.zone"}
            st["targetValueOne"] = round(v - LAUF_TOL_MS, 3)
            st["targetValueTwo"] = round(v + LAUF_TOL_MS, 3)
        steps.append(st)
    return {"workoutName": (PREFIX + w["name"])[:80], "description": (w["hinweis"] or w["name"])[:500],
            "sportType": {"sportTypeId": 1, "sportTypeKey": "running"},
            "workoutSegments": [{"segmentOrder": 1, "sportType": {"sportTypeId": 1, "sportTypeKey": "running"}, "workoutSteps": steps}]}


def css_test(name="CSS-Test 400/200", bahn=50, hinweis=""):
    """Schwimm-Test wie das Probe-Workout vom 23.11.2026 (Connect-ID 1772229247): 400 m einschwimmen, 4 × 50 m steigernd (15 s Pause), 2 min Pause,
    TEST 400 m, Erholung per Taste, TEST 200 m, 200 m ausschwimmen. Bahn 50 m (Silas' Becken), Strecken in ganzen Bahnen."""
    assert bahn in (25, 50)
    return {"name": name, "hinweis": hinweis, "sport": "swimming", "bahn": bahn}


def garmin_schwimm(w):
    FREE = {"strokeTypeId": 6, "strokeTypeKey": "free"}
    kein = {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}
    n = [0]

    def step(kind, text, end, wert=None, **extra):
        n[0] += 1
        typ = {"warmup": 1, "cooldown": 2, "interval": 3, "rest": 5}[kind]
        st = {"type": "ExecutableStepDTO", "stepOrder": n[0], "stepType": {"stepTypeId": typ, "stepTypeKey": kind}, "description": text[:100], "targetType": kein}
        if end == "distance":
            st["endCondition"] = {"conditionTypeId": 3, "conditionTypeKey": "distance"}
            st["endConditionValue"] = float(wert)
            st["preferredEndConditionUnit"] = {"unitId": 1, "unitKey": "meter", "factor": 100.0}
            st["strokeType"] = FREE
        elif end == "fixed.rest":
            st["endCondition"] = {"conditionTypeId": 8, "conditionTypeKey": "fixed.rest"}
            st["endConditionValue"] = float(wert)
        else:
            st["endCondition"] = {"conditionTypeId": 1, "conditionTypeKey": "lap.button"}
        st.update(extra)
        return st
    ein = step("warmup", "400 m locker einschwimmen, Kraul", "distance", 400)
    n[0] += 1
    gruppe = {"type": "RepeatGroupDTO", "stepOrder": n[0], "stepType": {"stepTypeId": 6, "stepTypeKey": "repeat"}, "numberOfIterations": 4,
              "endCondition": {"conditionTypeId": 7, "conditionTypeKey": "iterations"}, "endConditionValue": 4.0, "smartRepeat": False, "skipLastRestStep": False,
              "workoutSteps": [step("interval", "50 m steigernd bis zügig", "distance", 50), step("rest", "Pause 15 s", "fixed.rest", 15)]}
    rest = [step("rest", "Pause 2 min vor dem Test", "fixed.rest", 120),
            step("interval", "TEST 400 m: gleichmässig maximal, Zeit merken", "distance", 400),
            step("rest", "Erholung 5-10 min locker, Taste drücken wenn bereit", "lap.button"),
            step("interval", "TEST 200 m: maximal, Zeit merken", "distance", 200),
            step("cooldown", "200 m locker ausschwimmen", "distance", 200)]
    return {"workoutName": (PREFIX + w["name"])[:80], "description": (w["hinweis"] or w["name"])[:500],
            "sportType": {"sportTypeId": 4, "sportTypeKey": "swimming"}, "poolLength": float(w["bahn"]), "poolLengthUnit": {"unitId": 1, "unitKey": "meter", "factor": 100.0},
            "workoutSegments": [{"segmentOrder": 1, "sportType": {"sportTypeId": 4, "sportTypeKey": "swimming"}, "workoutSteps": [ein, gruppe] + rest}]}


ALL = [
    ("kurzcheck-220", kurzcheck("Kurzcheck Rad 220 W (Laktat)")),
    ("stufentest-120-300", stufentest("Stufentest Rad 120–300 W, 5 min, +20 W",
                                      hinweis="Wie 4.12.2025 und 29.4.2026: 10 min Einfahren bei 120 W, dann 10 Stufen bis 300 W. Laktat in den letzten 30 s jeder Stufe.")),
    ("stufentest-bis-ausbelastung", stufentest("Stufentest Rad bis Ausbelastung, 5 min, +20 W", bis=440,
                                               hinweis="Gleiche erste 10 Stufen wie bisher, danach weiter in 20-W-Stufen, bis die Trittfrequenz nicht mehr zu halten ist; Abbruchzeit und Grund notieren.")),
    ("stufentest-lauf-bis-ausbelastung", lauftest("Stufentest Lauf bis Ausbelastung, 4:30 min, +1 km/h",
                                                   hinweis="Wie 12.12.2025 (Start 10,3 km/h, +1 km/h, 4:30 min je Stufe, Laktat in der Pause nach jeder Stufe), diesmal weiter bis zur Ausbelastung: "
                                                           "Stufe halten, solange es geht; Abbruchzeit, Stufe und Grund notieren. Bahn oder Laufband (1 % Steigung).")),
    ("css-test-400-200", css_test(hinweis="400 m und 200 m maximal, gleiches Becken (50 m); Zeiten im Tab Schwimmen eintragen.")),
]


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for key, w in ALL:
        sport = w.get("sport", "cycling")
        if sport == "cycling":
            open(os.path.join(out, key + ".zwo"), "w", encoding="utf-8").write(zwo(w))
            g = garmin(w)
        else:
            g = garmin_lauf(w) if sport == "running" else garmin_schwimm(w)
        json.dump(g, open(os.path.join(out, key + ".garmin.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if sport == "swimming":
            print(f"{key}: {len(g['workoutSegments'][0]['workoutSteps'])} Schritte (1400 m, Bahn {int(g['poolLength'])} m)")
        else:
            dur = sum(s[1] or 0 for s in w["steps"])
            print(f"{key}: {len(w['steps'])} Schritte, {dur // 60} min (ohne Tastenpausen), Stufen {[s[2] for s in w['steps'] if s[0] == 'interval']}")


if __name__ == "__main__":
    main()
