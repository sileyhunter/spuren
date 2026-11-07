"""Datenmodell V5 einführen (Zonenprofile, Schwellen, Readiness-, Koppel- und Fueling-Listen).
Das erste Zonenprofil steht nur in den verschlüsselten Daten bzw. lokal in work/zonen-start.json, nie im Repository.

  python3 -I tools/migrate_v5.py data.json                  # sichert zuerst, dann Migration
  python3 -I tools/migrate_v5.py data.json --rollback <sicherung.json>

Regeln: vor jeder Änderung eine Sicherung in work/backup/; bestehende IDs und Felder bleiben unverändert;
die Migration ist wiederholbar (zweiter Lauf ändert nichts ausser Schwellen und Prüfdatum).
"""
import datetime as dt
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schwellen  # noqa: E402

SCHEMA = "v5"
START_PROFILE = "work/zonen-start.json"   # erstes Zonenprofil (persönliche Werte): nur lokal bzw. verschlüsselt, nie im Repo
LISTS = {"koppel": [], "fueling": [], "fueling_produkte": [], "befinden": [], "langfahrt_plaene": [], "audit": []}


def backup(path):
    os.makedirs("work/backup", exist_ok=True)
    dst = f"work/backup/{os.path.basename(path).replace('.json', '')}-{dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")}.json"
    shutil.copy2(path, dst)
    return dst


def migrate(D):
    changes = []
    if D.get("schema") != SCHEMA:
        changes.append(f"schema {D.get('schema')} → {SCHEMA}")
        D["schema"] = SCHEMA
    for k, v in LISTS.items():
        if k not in D:
            D[k] = list(v)
            changes.append(f"{k} angelegt")
    zon = D.setdefault("zonen", [])
    if not zon and os.path.exists(START_PROFILE):         # nur beim ersten Mal: Profil aus der lokalen Datei übernehmen
        for prof in json.load(open(START_PROFILE, encoding="utf-8")):
            zon.append(prof)
            changes.append(f"Zonenprofil {prof.get('name', prof.get('id'))} angelegt")
    D["schwellen"] = schwellen.rechne(D)
    D.setdefault("versions", {})["schwellen"] = {"v": schwellen.VERSION, "text": "LT1: SOMC, Basis + 0,5, log-log; LT2: Dickhuth, mod. Dmax und Dmax nur bei Ausbelastung; 2/4 mmol nur Orientierung; Simulation Messfehler max(0,15; 7,5 %)"}
    D["versions"]["zonen"] = {"v": "zonen-1.0", "text": "Zonenprofile versioniert: Disziplin, Messgrösse, Protokoll, Tests, Methode, Freigabe, Gültigkeit; nie automatisch aus LT1/LT2"}
    D["versions"]["schema"] = {"v": SCHEMA, "text": "V5: zonen, schwellen, befinden, koppel, fueling, fueling_produkte, langfahrt_plaene, audit"}
    D["audit"].append({"zeit": dt.datetime.now().isoformat(timespec="seconds"), "was": "migrate_v5", "aenderungen": changes or ["keine"]})
    D["audit"] = D["audit"][-200:]
    return changes


def main():
    path = sys.argv[1]
    if "--rollback" in sys.argv:
        src = sys.argv[sys.argv.index("--rollback") + 1]
        json.load(open(src, encoding="utf-8"))            # muss lesbar sein
        shutil.copy2(src, path)
        print("zurückgesetzt auf", src)
        return
    b = backup(path)
    D = json.load(open(path, encoding="utf-8"))
    ids_before = [a["id"] for a in D.get("activities", [])]
    ch = migrate(D)
    assert [a["id"] for a in D.get("activities", [])] == ids_before, "IDs verändert"
    json.dump(D, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("Sicherung:", b)
    print("Änderungen:", "; ".join(ch) if ch else "keine (Schwellen neu gerechnet)")
    print(f"Rückgängig: python3 -I tools/migrate_v5.py {path} --rollback {b}")


if __name__ == "__main__":
    main()
