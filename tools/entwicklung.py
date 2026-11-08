"""Gleichmässige 10-min-Blöcke (eb-1.0) für «Meine Entwicklung» aus den FIT-Dateien nachrechnen.

  python3 -I tools/entwicklung.py data.json --files work/files.json [--nur-fehlende]

Setzt je Rad- und Laufaktivität das Feld «eb» (Rad: Blöcke bei 200 W ± 10 W, Laufen: bei 5:30/km ± 10 s), sonst nichts.
Das nächtliche Update rechnet «eb» für neue Aktivitäten über kennzahlen.alles() (gleiche Regel).
Zuordnung FIT-Datei ↔ Aktivität über die Datei-ID im Namen und die Startzeit (t0) der Session.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kennzahlen  # noqa: E402
import series  # noqa: E402


def sessions_for(path):
    try:
        return list(series.from_fit(path))
    except Exception:
        return []


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    files_path = argv[argv.index("--files") + 1] if "--files" in argv else "work/files.json"
    only_missing = "--nur-fehlende" in argv
    D = json.load(open(argv[1], encoding="utf-8"))
    idx = {os.path.basename(f["path"]).rsplit("_", 1)[-1].split(".")[0]: f["path"] for f in json.load(open(files_path, encoding="utf-8"))}
    n = {"rad": 0, "lauf": 0, "ohne_datei": 0, "ohne_block": 0, "geprueft": 0}
    for a in D["activities"]:
        if a.get("sport") not in ("rad", "lauf") or (only_missing and "eb" in a):
            continue
        p = idx.get(a["id"] if a["id"].startswith("zwift-") else a["id"].split("-")[0])     # Zwift-Dateien heissen wie die Aktivität
        if not p:
            n["ohne_datei"] += 1
            continue
        n["geprueft"] += 1
        cand = [S for S in sessions_for(p) if S.category == a["sport"]]
        if a.get("t0") and len(cand) > 1:
            cand.sort(key=lambda S: abs(int(S.start) - a["t0"]))
        eb = kennzahlen.bloecke(cand[0]) if cand else None
        if eb:
            a["eb"] = eb
            n[a["sport"]] += 1
        else:
            a.pop("eb", None)
            n["ohne_block"] += 1
    D.setdefault("versions", {})["entwicklung"] = kennzahlen.VERSIONS["entwicklung"]
    json.dump(D, open(argv[1], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("eb-1.0:", n)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
