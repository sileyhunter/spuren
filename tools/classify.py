"""Pass 1: Alle FIT-Dateien nach Dateityp sortieren (nur den Kopf lesen)."""
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitlib  # noqa: E402

raw, out = sys.argv[1], sys.argv[2]
types = collections.Counter()
acts = []
errors = 0
for root, _, files in os.walk(raw):
    for fn in files:
        if not fn.lower().endswith(".fit"):
            continue
        path = os.path.join(root, fn)
        try:
            with open(path, "rb") as fh:
                head = fh.read(8192)
            fid = fitlib.file_id(head)
        except Exception:
            errors += 1
            continue
        if not fid:
            errors += 1
            continue
        t = fid.get(0)
        types[t] += 1
        if t == 4:
            acts.append({"path": path, "size": os.path.getsize(path), "manu": fid.get(1), "prod": fid.get(2), "created": fid.get(4)})
print("Dateitypen:", dict(types.most_common()))
print("Fehler:", errors)
print("Aktivitätsdateien:", len(acts), "Grösse MB:", round(sum(a["size"] for a in acts) / 1e6))
print("Hersteller:", collections.Counter(a["manu"] for a in acts).most_common(8))
json.dump(acts, open(out, "w"))
