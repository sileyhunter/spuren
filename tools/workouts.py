"""Test-Workouts (Umsetzungsplan A9): Zwift-Datei (.zwo) und Garmin-Workout (JSON für upload_workout).

  python3 -I tools/workouts.py <zielordner>

Erzeugt je Vorlage eine .zwo- und eine .json-Datei. Nichts wird hochgeladen: Silas prüft die Dateien zuerst.
Garmin: Schritte mit Zeitende und Leistungsbereich «power.between» (Watt), je Stufe ein Schritt = eine Runde.
Zwift: ftpOverride 100, damit Power="1.2" genau 120 W bedeutet, unabhängig von der FTP in Zwift.
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
    return {"workoutName": w["name"][:80], "description": (w["hinweis"] or w["name"])[:500],
            "sportType": {"sportTypeId": 2, "sportTypeKey": "cycling"},
            "workoutSegments": [{"segmentOrder": 1, "sportType": {"sportTypeId": 2, "sportTypeKey": "cycling"}, "workoutSteps": steps}]}


ALL = [
    ("kurzcheck-220", kurzcheck("Kurzcheck Rad 220 W (Laktat)")),
    ("stufentest-120-300", stufentest("Stufentest Rad 120–300 W, 5 min, +20 W",
                                      hinweis="Wie 4.12.2025 und 29.4.2026: 10 min Einfahren bei 120 W, dann 10 Stufen bis 300 W. Laktat in den letzten 30 s jeder Stufe.")),
    ("stufentest-bis-ausbelastung", stufentest("Stufentest Rad bis Ausbelastung, 5 min, +20 W", bis=440,
                                               hinweis="Gleiche erste 10 Stufen wie bisher, danach weiter in 20-W-Stufen, bis die Trittfrequenz nicht mehr zu halten ist; Abbruchzeit und Grund notieren.")),
]


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for key, w in ALL:
        open(os.path.join(out, key + ".zwo"), "w", encoding="utf-8").write(zwo(w))
        json.dump(garmin(w), open(os.path.join(out, key + ".garmin.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        dur = sum(s[1] for s in w["steps"])
        print(f"{key}: {len(w['steps'])} Schritte, {dur // 60} min, Stufen {[s[2] for s in w['steps'] if s[0] == 'interval']}")


if __name__ == "__main__":
    main()
