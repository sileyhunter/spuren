"""Neue Felder aus einem frischen FIT-Durchlauf in bestehende Aktivitäten übernehmen, ohne andere Werte anzufassen.

  python3 -I tools/parse_activities.py work/files.json work/acts_raw.json
  python3 -I tools/nachfuellen.py data.json work/acts_raw.json t0 dr sp

Nur fehlende Felder werden gesetzt; vorhandene bleiben. Zuordnung über die Aktivitäts-ID (wie import_export.py).
"""
import json
import sys


def main():
    path, raw, keys = sys.argv[1], sys.argv[2], sys.argv[3:]
    D = json.load(open(path, encoding="utf-8"))
    A = {a["id"]: a for a in json.load(open(raw, encoding="utf-8"))}
    n = {k: 0 for k in keys}
    for a in D["activities"]:
        src = A.get(a["id"])
        if not src:
            continue
        for k in keys:
            if k not in a and src.get(k) not in (None, [], {}, ""):
                a[k] = src[k]
                n[k] += 1
    json.dump(D, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("ergänzt:", n, "von", len(D["activities"]), "Aktivitäten")


if __name__ == "__main__":
    main()
