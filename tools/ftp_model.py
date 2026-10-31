"""FTP-Schätzung aus Leistungsdaten, getrennt nach Radsystem (Rennrad, MTB, Indoor).

Wird von import_export.py aufgerufen (monatlicher FIT-Export) oder direkt:
    python3 -I tools/ftp_model.py data.json acts_raw.json

Methode (alles aus den Bestwerten je Fahrt, keine erfundenen Werte):
- Schätzung = 0,95 × beste 20-Minuten-Leistung der letzten 180 Tage, je Radsystem
  (jedes System misst mit einem anderen Leistungsmesser bzw. unter anderen Bedingungen).
- Bandbreite aus weiteren Verfahren: Critical Power aus den besten 5, 10 und 20 Minuten,
  beste 60 Minuten (nur wenn sie mindestens 88 % der 20-Minuten-Leistung erreichen, also
  wirklich hart war) und 0,95 × beste 20 Minuten der letzten 90 Tage (aktuelle Form).
- Hinweis «unsicher», wenn die letzten 90 Tage keine vergleichbar harte 20-Minuten-Belastung
  enthalten (unter 90 % des 180-Tage-Bestwerts): dann ist die Schätzung eher zu hoch für die
  aktuelle Form bzw. die 90-Tage-Zahl eher zu tief.
- Pro Fahrt wird die Schätzung zum damaligen Datum gespeichert (`ftp_e`), dazu die damals in
  Garmin eingestellte FTP (`ftp_dev`). Die ursprüngliche Trainingslast (`tss`) bleibt unverändert.
"""
import datetime as dt
import json
import re
import statistics
import sys

SYSTEMS = ("rennrad", "mtb", "indoor")
LONG, SHORT = 180, 90


def system(a):
    if a.get("sport") != "rad":
        return None
    t = (a.get("typ") or "").lower()
    if a.get("indoor") or re.search(r"zwift|indoor|rolle|trainer|virtu", t):
        return "indoor"
    if re.search(r"mountain|mtb", t):
        return "mtb"
    if re.search(r"e-bike|ebike", t):
        return None
    return "rennrad"


def _best(rides, dur):
    b = None
    for r in rides:
        v = r["p"].get(dur)
        if v and (b is None or v > b[0]):
            b = (v, r)
    return b


def _cp(p5, p10, p20):
    """Critical Power aus Arbeit = CP·t + W′ (lineare Regression über 5, 10, 20 min)."""
    if not (p5 and p10 and p20):
        return None, None
    ts = [300, 600, 1200]
    ws = [p5 * 300, p10 * 600, p20 * 1200]
    mt, mw = sum(ts) / 3, sum(ws) / 3
    sxx = sum((t - mt) ** 2 for t in ts)
    cp = sum((t - mt) * (w - mw) for t, w in zip(ts, ws)) / sxx
    wp = mw - cp * mt
    if not (3000 <= wp <= 40000 and 0.85 * p20 <= cp <= 1.05 * p20):
        return None, None
    return cp, wp


def evaluate(rides, sysname, day):
    """Schätzung für ein Radsystem an einem Tag (Fenster endet an diesem Tag, inklusive)."""
    lo_long = day - dt.timedelta(days=LONG)
    lo_short = day - dt.timedelta(days=SHORT)
    W = [r for r in rides if r["s"] == sysname and lo_long < r["d"] <= day]
    b20 = _best(W, 1200)
    if not b20:
        return None
    p20, src = b20
    p5 = (_best(W, 300) or (None,))[0]
    p10 = (_best(W, 600) or (None,))[0]
    p60 = (_best(W, 3600) or (None,))[0]
    s20 = _best([r for r in W if r["d"] > lo_short], 1200)
    cp, wp = _cp(p5, p10, p20)
    est = 0.95 * p20
    methods = {"p20": round(est), "cp": round(cp) if cp else None,
               "p60": p60 if p60 and p60 >= 0.88 * p20 else None,
               "p20_90": round(0.95 * s20[0]) if s20 else None}
    vals = [v for v in methods.values() if v]
    return {"est": round(est), "lo": min(vals), "hi": max(vals), "m": methods, "n": len(W),
            "src": {"date": src["d"].isoformat(), "name": src["name"], "w20": p20},
            "unsicher": bool(not s20 or s20[0] < 0.9 * p20)}


def apply(D, raw):
    """Ergänzt D (data.json) um FTP-Schätzungen. raw: Liste aus parse_activities.py (mit pdc und ftp)."""
    rides = []
    for a in raw:
        s = system(a)
        if s and a.get("pdc"):
            p = {int(k): v for k, v in a["pdc"].items() if v}
            if p.get(1200):
                rides.append({"d": dt.date.fromisoformat(a["date"]), "s": s, "p": p, "name": a.get("name") or "", "id": a["id"]})
    rides.sort(key=lambda r: r["d"])
    if not rides:
        return 0
    cache = {}

    def ev(s, day):
        if (s, day) not in cache:
            cache[(s, day)] = evaluate(rides, s, day)
        return cache[(s, day)]

    today = dt.date.today()
    months, m = [], rides[0]["d"].replace(day=1)
    while m <= today:
        nxt = (m.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
        months.append(min(nxt - dt.timedelta(days=1), today))
        m = nxt
    # typisches Verhältnis der Systeme zum Rennrad (Median über Monate mit Werten beider Systeme)
    ratio = {"rennrad": 1.0}
    for s, fallback in (("indoor", 0.95), ("mtb", 1.0)):
        rs = [ev(s, d)["est"] / ev("rennrad", d)["est"] for d in months if ev(s, d) and ev("rennrad", d)]
        ratio[s] = round(statistics.median(rs), 3) if len(rs) >= 6 else fallback

    def reference(day):
        """FTP im Massstab Rennrad: beste Evidenz aus Rennrad und Indoor (umgerechnet), MTB nur als Notlösung."""
        cands = []
        for s in ("rennrad", "indoor"):
            e = ev(s, day)
            if e:
                cands.append((e["est"] / ratio[s], s, e))
        if not cands and ev("mtb", day):
            e = ev("mtb", day)
            cands.append((e["est"] / ratio["mtb"], "mtb", e))
        if not cands:
            return None
        est, s, e = max(cands, key=lambda c: c[0])
        vals = [v / ratio[s] for k, v in e["m"].items() if v and k != "p20_90"]
        return {"est": round(est), "lo": round(min(vals)), "hi": round(max(vals)), "von": s, "e": e}

    def sys_ftp(s, day):
        ref = reference(day)
        if not ref:
            return None, None
        if s == "rennrad":
            return ref["est"], ref
        own = ev(s, day)
        val = max(own["est"] if own else 0, ref["est"] * ratio[s])
        return round(val), ref

    dev = {a["id"]: a.get("ftp") for a in raw if a.get("sport") == "rad" and a.get("ftp") and 100 <= a["ftp"] <= 500}
    n_e = 0
    for a in D.get("activities", []):
        s = system(a)
        if not s:
            continue
        if a["id"] in dev:
            a["ftp_dev"] = dev[a["id"]]
        f, _ = sys_ftp(s, dt.date.fromisoformat(a["date"]))
        if f:
            a["ftp_e"] = f
            n_e += 1
    series = []
    for d in months:
        ref = reference(d)
        if not ref:
            continue
        row = {"date": d.isoformat(), "ref": {"est": ref["est"], "lo": ref["lo"], "hi": ref["hi"], "von": ref["von"]}}
        for s in SYSTEMS:
            own = ev(s, d)
            row[s] = {"ftp": sys_ftp(s, d)[0], "eigen": own["est"] if own else None}
        series.append(row)
    now_ref = reference(today)
    now = {"ref": {k: v for k, v in now_ref.items() if k != "e"} if now_ref else None, "sys": {}}
    for s in SYSTEMS:
        own = ev(s, today)
        now["sys"][s] = {"ftp": sys_ftp(s, today)[0], "eigen": own}
    D["ftp_est"] = {"series": series, "now": now, "ratio": ratio, "stand": today.isoformat(),
                    "method": "0,95 × beste 20 min der letzten 180 Tage; Massstab Rennrad aus Rennrad und Indoor (umgerechnet), MTB mit eigenem Leistungsmesser"}
    return n_e


def main(data_path, raw_path):
    D = json.load(open(data_path, encoding="utf-8"))
    raw = json.load(open(raw_path, encoding="utf-8"))
    n = apply(D, raw)
    json.dump(D, open(data_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    fe = D.get("ftp_est", {})
    ref = (fe.get("now") or {}).get("ref") or {}
    print(f"FTP-Schätzung für {n} Fahrten; Rennrad-Massstab {ref.get('est')} W ({ref.get('lo')}–{ref.get('hi')}, aus {ref.get('von')}); Verhältnis {fe.get('ratio')}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
