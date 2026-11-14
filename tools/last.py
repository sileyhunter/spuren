"""Trainingslast mit der LT2 statt der FTP (last-2.0 seit V5.9.1, last-2.1 seit V6.6.2).

  python3 -I tools/last.py data.json                      # tl2 für alle Aktivitäten (neu) rechnen, tss bleibt unverändert
  python3 -I tools/last.py data.json --vergleich [--wochen 12] [--bis JJJJ-MM-TT]   # zusätzlich: Wochenlast bisher gegen neu je Sportart

Regel last-2.0 (Auftrag V5.9, Entscheid E1):
- Neues Feld `tl2` je Aktivität neben `tss`; `tss` wird nie überschrieben.
- Rad mit NP: tl2 = Dauer (h) × (NP / LT2)² × 100, Dauer = `dur` (Timer, wie bisher bei tss).
  LT2 aus `config.last_ref.rad` (Datum, Quelle, Status): je Datum gilt der letzte Test davor; vor dem ersten Test der erste (gekennzeichnet).
  Nie FTP.
- Alle anderen Sportarten und Rad ohne NP: tl2 = tss (wie bisher).
- Die Seite rechnet erst mit tl2, wenn `config.load_model` gesetzt ist (nach Silas' Okay zum Vergleich).

last-2.1 (Prüfbericht vom 13.11.2026, Befunde 5–7): keine Umrechnung zwischen Leistungsmessern – eine LT2 gilt nur für das System, auf dem
sie gemessen wurde.
- Jede Referenz hat ein `system`: «rolle» (Zwift/Indoor-Rad) oder «draussen». Einträge ohne `system` gelten für die Rolle (alle Rad-Stufentests
  bis V6.6.1 liefen auf Zwift).
- Rad auf der Rolle (`indoor`) mit NP: gegen die LT2 der Rolle (wie last-2.0).
- Rad draussen mit NP: gegen eine LT2 für draussen, sobald es eine gibt (eigener Test mit dem Leistungsmesser draussen). Bis dahin nach Puls
  wie jede Einheit ohne Leistung: tl2 = Dauer (h) × min(1,15; Ø-Puls / Schwellenpuls Rad)² × 100 mit `config.lthr.rad` (sonst `default`).
- Fehlen dafür die Werte (kein Puls, kein Schwellenpuls), bleibt tl2 = tss (wie geliefert), gekennzeichnet.
- `tl2q` je Radeinheit sagt, wie gerechnet wurde: «lt2-rolle», «lt2-draussen», «puls», «wie geliefert».
"""
import datetime as dt
import json
import sys

VERSION = "last-2.1"
TEXT = ("Trainingslast: Rad mit Leistung NP gegen die LT2 aus einem Rad-Stufentest auf demselben System (Rolle bzw. draussen; je Datum der letzte "
        "Test davor, vorher der erste, gekennzeichnet; nie FTP, keine Umrechnung zwischen Leistungsmessern); Rad draussen ohne eigene LT2 nach Puls "
        "wie Einheiten ohne Leistung (Schwellenpuls Rad); alle anderen Sportarten wie bisher; tss bleibt unverändert")
SYSTEME = ("rolle", "draussen")


def system_der(r):
    """System einer Referenz: «rolle» (Standard, alle bisherigen Tests auf Zwift) oder «draussen»."""
    s = (r or {}).get("system") or "rolle"
    return s if s in SYSTEME else None


def system_von(a):
    """System einer Radeinheit: Indoor (Zwift, Rolle) → «rolle», sonst «draussen»."""
    return "rolle" if a.get("indoor") else "draussen"


def ref_fuer(cfg, datum, system="rolle"):
    """LT2-Referenz für ein Datum und System → (Eintrag, vor_erstem_test) oder (None, False)."""
    lst = sorted((r for r in (((cfg or {}).get("last_ref") or {}).get("rad") or []) if system_der(r) == system), key=lambda r: r["ab"])
    if not lst:
        return None, False
    davor = [r for r in lst if r["ab"] <= datum]
    return (davor[-1], False) if davor else (lst[0], True)


def schwellenpuls(cfg):
    lt = (cfg or {}).get("lthr") or {}
    v = lt.get("rad") or lt.get("default")
    return v if isinstance(v, (int, float)) and v > 0 else None


def tl2_und_art(a, cfg):
    """(tl2, Art) einer Aktivität; tl2 None, wenn auch tss fehlt. Art nur für Rad, sonst None."""
    tss = a.get("tss")
    wie = tss if isinstance(tss, (int, float)) else None
    if a.get("sport") != "rad":
        return wie, None
    sysm = system_von(a)
    if a.get("np") and a.get("dur"):
        r, _ = ref_fuer(cfg, a["date"], sysm)
        if r and r.get("lt2_w"):
            return int(round(a["dur"] / 3600.0 * (a["np"] / r["lt2_w"]) ** 2 * 100)), "lt2-" + sysm
    if sysm == "draussen" and a.get("np"):
        hr, lthr = a.get("hr"), schwellenpuls(cfg)
        if hr and lthr and a.get("dur"):
            return int(round(a["dur"] / 3600.0 * min(1.15, hr / lthr) ** 2 * 100)), "puls"
    return wie, ("wie geliefert" if wie is not None else None)


def tl2_fuer(a, cfg):
    """tl2 einer Aktivität (ganze Zahl wie tss) oder None, wenn auch tss fehlt."""
    return tl2_und_art(a, cfg)[0]


def alle(D):
    """tl2 (und für Rad tl2q) für alle Aktivitäten neu rechnen (idempotent); Anzahl Rad-Aktivitäten mit eigener Rad-Last zurück."""
    cfg = D.get("config") or {}
    n_rad = 0
    for a in D.get("activities", []):
        v, art = tl2_und_art(a, cfg)
        if v is None:
            a.pop("tl2", None)
        else:
            a["tl2"] = v
        if art:
            a["tl2q"] = art
        else:
            a.pop("tl2q", None)
        if art in ("lt2-rolle", "lt2-draussen", "puls"):
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
    heute = dt.date.today().isoformat()
    r, _ = ref_fuer(D.get("config"), heute, "rolle")
    rd, _ = ref_fuer(D.get("config"), heute, "draussen")
    arten = {}
    for a in D.get("activities", []):
        if a.get("tl2q"):
            arten[a["tl2q"]] = arten.get(a["tl2q"], 0) + 1
    print(f"tl2 ({VERSION}) für {len(D.get('activities', []))} Aktivitäten; Rad mit eigener Last: {n} "
          f"({', '.join(f'{k} {v}' for k, v in sorted(arten.items()))}); Referenz heute Rolle: {r['lt2_w'] if r else '–'} W "
          f"({r.get('status') if r else 'keine'}), draussen: {rd['lt2_w'] if rd else '– (nach Puls)'}")
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
