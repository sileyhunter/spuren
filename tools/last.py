"""V5.9.1 Trainingslast mit der LT2 statt der FTP (last-2.0).

  python3 -I tools/last.py data.json                      # tl2 für alle Aktivitäten (neu) rechnen, tss bleibt unverändert
  python3 -I tools/last.py data.json --vergleich [--wochen 12] [--bis JJJJ-MM-TT]   # zusätzlich: Wochenlast bisher gegen neu je Sportart

Regel last-2.0 (Auftrag V5.9, Entscheid E1):
- Neues Feld `tl2` je Aktivität neben `tss`; `tss` wird nie überschrieben.
- Rad (Rolle und draussen) mit NP: tl2 = Dauer (h) × (NP / LT2)² × 100, Dauer = `dur` (Timer, wie bisher bei tss).
  LT2 aus `config.last_ref.rad` (Datum, Quelle, Status): je Datum gilt der letzte Test davor; vor dem ersten Test der erste (gekennzeichnet).
  Nie FTP. Keine Umrechnung zwischen Leistungsmessern (eine eigene Referenz je System erst nach einer Vergleichsfahrt).
- Alle anderen Sportarten und Rad ohne NP: tl2 = tss (wie bisher).
- Die Seite rechnet erst mit tl2, wenn `config.load_model = "last-2.0"` gesetzt ist (nach Silas' Okay zum Vergleich).
"""
import datetime as dt
import json
import sys

VERSION = "last-2.0"
TEXT = ("Trainingslast: Rad mit Leistung NP gegen die LT2 aus dem Rad-Stufentest (je Datum der letzte Test davor, vorher der erste, "
        "gekennzeichnet; nie FTP, keine Umrechnung zwischen Leistungsmessern); alle anderen Sportarten wie bisher; tss bleibt unverändert")


def ref_fuer(cfg, datum):
    """LT2-Referenz für ein Datum → (Eintrag, vor_erstem_test) oder (None, False)."""
    lst = sorted(((cfg or {}).get("last_ref") or {}).get("rad") or [], key=lambda r: r["ab"])
    if not lst:
        return None, False
    davor = [r for r in lst if r["ab"] <= datum]
    return (davor[-1], False) if davor else (lst[0], True)


def tl2_fuer(a, cfg):
    """tl2 einer Aktivität (ganze Zahl wie tss) oder None, wenn auch tss fehlt."""
    tss = a.get("tss")
    if a.get("sport") == "rad" and a.get("np") and a.get("dur"):
        r, _ = ref_fuer(cfg, a["date"])
        if r and r.get("lt2_w"):
            return int(round(a["dur"] / 3600.0 * (a["np"] / r["lt2_w"]) ** 2 * 100))
    return tss if isinstance(tss, (int, float)) else None


def alle(D):
    """tl2 für alle Aktivitäten neu rechnen (idempotent); Anzahl Rad-Aktivitäten mit eigener Rad-Last zurück."""
    cfg = D.get("config") or {}
    n_rad = 0
    for a in D.get("activities", []):
        v = tl2_fuer(a, cfg)
        if v is None:
            a.pop("tl2", None)
        else:
            a["tl2"] = v
            if a.get("sport") == "rad" and a.get("np") and ref_fuer(cfg, a["date"])[0]:
                n_rad += 1
    if (cfg.get("last_ref") or {}).get("rad"):
        D.setdefault("versions", {})["last"] = {"v": VERSION, "text": TEXT}
    return n_rad


def montag(d):
    x = dt.date.fromisoformat(d)
    return (x - dt.timedelta(days=x.weekday())).isoformat()


def vergleich(D, wochen=12, bis=None):
    """Je Woche (Montag) und Sportart: Last bisher (tss) und neu (tl2) der letzten n Wochen."""
    bis = bis or dt.date.today().isoformat()
    w0 = (dt.date.fromisoformat(montag(bis)) - dt.timedelta(weeks=wochen - 1)).isoformat()
    out = {(dt.date.fromisoformat(w0) + dt.timedelta(weeks=i)).isoformat(): {} for i in range(wochen)}   # auch leere Wochen
    for a in D.get("activities", []):
        if a["date"] < w0 or a["date"] > bis:
            continue
        w = out.setdefault(montag(a["date"]), {})
        s = w.setdefault(a.get("sport", "andere"), [0, 0])
        s[0] += a.get("tss") or 0
        s[1] += a.get("tl2", a.get("tss")) or 0
    return dict(sorted(out.items()))


def main(argv):
    path = argv[1]
    D = json.load(open(path, encoding="utf-8"))
    n = alle(D)
    json.dump(D, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    r, _ = ref_fuer(D.get("config"), dt.date.today().isoformat())
    print(f"tl2 ({VERSION}) für {len(D.get('activities', []))} Aktivitäten; Rad mit eigener Last: {n}; "
          f"Referenz heute: {r['lt2_w'] if r else '–'} W ({r.get('status') if r else 'keine'})")
    if "--vergleich" in argv:
        wochen = int(argv[argv.index("--wochen") + 1]) if "--wochen" in argv else 12
        V = vergleich(D, wochen, argv[argv.index("--bis") + 1] if "--bis" in argv else None)
        sports = ["rad", "lauf", "schwimm", "wandern", "ski", "andere"]
        print("Woche ab    " + " ".join(f"{s:>13}" for s in sports) + "    Summe bisher → neu")
        for w, row in V.items():
            cells = []
            for s in sports:
                a, b = row.get(s, [0, 0])
                cells.append(f"{a:>5}→{b:<5}  " if s == "rad" else f"{a:>11}  ")
            print(f"{w}  " + " ".join(cells) + f"  {sum(v[0] for v in row.values()):>6} → {sum(v[1] for v in row.values())}")
        tot = [sum(r.get(s, [0, 0])[i] for r in V.values() for s in sports) for i in (0, 1)]
        rad = [sum(r.get("rad", [0, 0])[i] for r in V.values()) for i in (0, 1)]
        print(f"{wochen} Wochen: Rad {rad[0]} → {rad[1]} ({(rad[1] / rad[0] - 1) * 100:+.0f} %), alle {tot[0]} → {tot[1]} ({(tot[1] / tot[0] - 1) * 100:+.0f} %)"
              if rad[0] and tot[0] else f"{wochen} Wochen: keine Last")


if __name__ == "__main__":
    main(sys.argv)
