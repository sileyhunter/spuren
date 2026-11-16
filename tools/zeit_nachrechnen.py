"""zeit-1.1 nachrechnen (V7.1, Wunsch Silas 16.11.2026): Bewegungszeit für Aktivitäten draussen mit GPS-Strecke, die bisher keine
Bewegungsregel hatten (Navigieren, Tracker, Jagen, Eislaufen …; nicht im Wasser; zeit-1.0 nahm dort die Timer-Zeit). Gerechnet wird aus der
2-s-Reihe (serien/, vorher mit tools/serien_klar.mjs nach work/ entschlüsselt) mit der Regel «Wandern» aus tools/zeit.py.

Aufruf: python3 -I tools/zeit_nachrechnen.py data.json work/serien_klar [--nur-zeigen]
Ändert nur mv, st, nst, un, ac (und setzt zq = "reihe-2s"); die alten Werte gehen ins Audit. Aktivitäten mit eigener Regel
(Rad, Laufen, Wandern, Ski, Schwimmen) bleiben unverändert. Ohne Reihe: unverändert, gemeldet.
"""
import datetime as dt
import json
import os
import re
import sys
import zoneinfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kennzahlen  # noqa: E402
import zeit  # noqa: E402

ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
WASSER = re.compile(r"schnorch|raft|kajak|kanu|sup\b|paddel|rudern|segeln|surf|tauch|boot", re.I)   # wie zeit.OHNE_GEH (Typ nur als Text)
FELDER = ("mv", "st", "nst", "un", "ac")


def kandidaten(D):
    """Aktivitäten «andere» draussen (GPS-Spur) mit Reihe, deren Bewegungszeit noch der Timer-Zeit entspricht (keine Regel)."""
    out = []
    for a in D.get("activities") or []:
        if a.get("sport") != "andere" or a.get("indoor") or not a.get("poly") or not a.get("ser"):
            continue
        if a.get("zq") == "reihe-2s" or (a.get("st") or 0) > 0 or WASSER.search(a.get("typ") or ""):
            continue
        out.append(a)
    return out


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    path, ordner, nur = argv[1], argv[2], "--nur-zeigen" in argv
    D = json.load(open(path, encoding="utf-8"))
    jetzt = dt.datetime.now(ZRH).isoformat(timespec="seconds")
    sum_alt = sum_neu = 0.0
    n_neu = n_ohne = 0
    zeilen = []
    for a in kandidaten(D):
        f = os.path.join(ordner, a["id"] + ".json")
        if not os.path.exists(f):
            n_ohne += 1
            continue
        R = json.load(open(f, encoding="utf-8"))
        z = zeit.zeit_reihe(R, a.get("dur"), a.get("el"))
        neu = {"mv": z["mov"], "st": z["stop"], "nst": z["nstop"], "un": z["unt"], "ac": z["act"]}
        alt = {k: a.get(k) for k in FELDER}
        sum_alt += (a.get("mv") or a.get("dur") or 0)
        sum_neu += neu["mv"]
        zeilen.append(f"{a['date']} {a.get('typ') or ''} «{a.get('name') or ''}»: {round((a.get('mv') or a.get('dur') or 0) / 60)} → {round(neu['mv'] / 60)} min ({neu['nst']} Stopps)")
        if nur or neu["st"] <= 0:
            continue
        for k, v in neu.items():
            if v:
                a[k] = v
            else:
                a.pop(k, None)
        a["zq"] = "reihe-2s"
        D.setdefault("audit", []).append({"zeit": jetzt, "was": f"Bewegungszeit nachgerechnet ({zeit.VERSION}, 2-s-Reihe)", "id": a["id"], "alt": alt, "neu": neu})
        n_neu += 1
    print("\n".join(zeilen))
    print(f"zeit-1.1: {len(zeilen)} Aktivitäten geprüft, {n_neu} geändert, {n_ohne} ohne entschlüsselte Reihe; "
          f"Bewegungszeit {sum_alt / 3600:.1f} h → {sum_neu / 3600:.1f} h")
    if not nur:
        D.setdefault("versions", {})["zeit"] = kennzahlen.VERSIONS["zeit"]
        json.dump(D, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
