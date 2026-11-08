"""Kennzahlen einer Session aus den Sekundenreihen (series.Session), gleich für Monatsexport und Nacht-Update.

Versionen: jede Kennzahl trägt die Version ihrer Regel (Umsetzungsplan A1). Ändert sich eine Regel,
steigt die Version, und tools/check_referenz.py zeigt, welche Werte sich dadurch ändern.

Felder je Aktivität (kurz, weil die Seite alles lädt):
  el  Gesamtzeit s · mv Bewegungszeit s · st Stopps s · nst Anzahl Stopps · un Unterbrechungen s
  rc  geplante Erholung s · ac aktive Belastungszeit s · us Uhr gestoppt s
  hh  Puls-Histogramm (5-bpm-Klassen ab 60, Sekunden) · pdc beste Leistung je Dauer · np
  t0  Start (Unix-Sekunden, UTC, aus der Session) · dr Drift/Entkopplung 1. gegen 2. Hälfte der Bewegungszeit
  sp  Lauf-Abschnitte ab Start 0–5, 5–10, 10–20 min und Rest (Pace, Puls, Schrittfrequenz)   [ausdauer-1.0]
  eb  gleichmässige 10-min-Blöcke für «Meine Entwicklung»: Rad bei 200 W ± 10 W, Laufen bei 5:30/km ± 10 s   [eb-1.0]
"""
import itertools
import operator
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import series  # noqa: E402
import stufen  # noqa: E402
import zeit  # noqa: E402

PDC_D = [5, 15, 30, 60, 300, 600, 1200, 3600, 7200]
VERSIONS = {
    "series": {"v": series.VERSION, "text": "Sekundenreihen aus FIT-Datei oder Garmin-Verbindung, Puls 0 = fehlend"},
    "zeit": {"v": zeit.VERSION, "text": "Gesamtzeit, Timer-Zeit, Bewegungszeit, Stopps, Unterbrechungen ab 5 min, geplante Erholung, aktive Zeit; "
                                        "Rad still < 2 km/h ab 2 min, Rolle ohne Treten, Laufen < 1 m/s ab 1 min, Wandern/Skitour ohne "
                                        "Strecke (< 12 m) und Höhe (< 3 m) je Minute ab 3 min, Becken: Ruhebahnen"},
    "stufen": {"v": stufen.VERSION, "text": "Stufen aus Zwift-Zielleistung oder Plateaus; Leistung = Median der Stufe; Puls = 30 s vor der Blutentnahme"},
    "hh_pdc": {"v": "hh-pdc-1.0", "text": "Puls-Histogramm 5 bpm ab 60, gewichtet bis zum nächsten Datensatz (max. 10 s); Leistungskurve aus 1-s-Reihe, Lücken bis 3 s gefüllt"},
    "ausdauer": {"v": "ausdauer-1.0", "text": "Drift: Bewegungszeit halbiert, Leistung bzw. Tempo je Puls in beiden Hälften, Entkopplung in %; "
                                              "Lauf-Abschnitte ab Start 0–5, 5–10, 10–20 min und Rest der Bewegungszeit; nur Sekunden mit Puls"},
    "entwicklung": {"v": "eb-1.0", "text": "Gleichmässige 10-min-Blöcke ab Minute 10: Rad Ø 190–210 W, 30-s-Mittel mit Variationskoeffizient ≤ 10 %, kein 30-s-Mittel "
                                          "unter 75 %, höchstens 3 % Sekunden ohne Treten; Laufen Ø 5:20–5:40/km, 30-s-Tempo CV ≤ 8 %, kein 30-s-Tempo unter 80 %, "
                                          "Steigung |≤ 2 %|, Anstieg ≤ 15 m; Puls in ≥ 95 % der Sekunden; je Aktivität Median der nicht überlappenden Blöcke"},
}
EB = {"v": "eb-1.0", "fenster": 600, "ab": 600, "schritt": 30,
      "rad": {"lo": 190.0, "hi": 210.0, "cv": 0.10, "min_rel": 0.75, "zero": 0.03},
      "lauf": {"lo": 320.0, "hi": 340.0, "cv": 0.08, "min_rel": 0.80, "steig": 0.02, "anstieg": 15.0}}
SPLITS = [(0, 300), (300, 600), (600, 1200), (1200, None)]


def _moving_idx(S):
    """Indizes der Datensätze in Bewegung (gleiche Stillstand-Regel wie zeit.py) mit Gewicht in Sekunden."""
    key = zeit.rule_key(S)
    if key is None or len(S.ts) < 2:
        return [], []
    w = zeit._covered(S)
    still = zeit._still_flags(S, key)
    idx = [i for i in range(len(S.ts)) if not still[i]]
    return idx, [w[i] for i in idx]


def _avg(vals, ws):
    num = den = 0.0
    for v, x in zip(vals, ws):
        if v is not None:
            num += v * x
            den += x
    return (num / den) if den else None


def ausdauer(S):
    """Drift (Rad und Lauf ab 30 min Bewegung) und Lauf-Abschnitte. Ohne Puls: nichts (kein Schätzen)."""
    out = {}
    cat = S.category
    if cat not in ("rad", "lauf") or not any(h for h in S.hr):
        return out
    idx, ws = _moving_idx(S)
    if not idx:
        return out
    tot = sum(ws)
    hr_cov = sum(x for i, x in zip(idx, ws) if S.hr[i]) / tot if tot else 0
    if tot >= 1800:
        cum, half = 0.0, tot / 2
        a, b = [], []
        for i, x in zip(idx, ws):
            (a if cum < half else b).append((i, x))
            cum += x
        def part(lst):
            hrv = _avg([S.hr[i] for i, _ in lst], [x for _, x in lst])
            if cat == "rad":
                xv = _avg([S.pw[i] for i, _ in lst], [x for _, x in lst]) if any(S.pw[i] for i, _ in lst) else None
            else:
                xv = _avg([(S.spd[i] * 3.6 if S.spd[i] is not None else None) for i, _ in lst], [x for _, x in lst])
            return xv, hrv
        x1, h1 = part(a)
        x2, h2 = part(b)
        if x1 and x2 and h1 and h2:
            e1, e2 = x1 / h1, x2 / h2
            out["dr"] = {"m": round(tot), "x1": round(x1, 2 if cat == "lauf" else 1), "x2": round(x2, 2 if cat == "lauf" else 1),
                         "h1": round(h1, 1), "h2": round(h2, 1), "dec": round((e1 - e2) / e1 * 100, 1), "cov": round(hr_cov, 3),
                         "unit": "km/h" if cat == "lauf" else "W"}
    if cat == "lauf":
        sp, cum = [], 0.0
        bounds = [[] for _ in SPLITS]
        for i, x in zip(idx, ws):
            for k, (lo, hi) in enumerate(SPLITS):
                if cum >= lo and (hi is None or cum < hi):
                    bounds[k].append((i, x))
                    break
            cum += x
        for (lo, hi), lst in zip(SPLITS, bounds):
            if not lst:
                sp.append({"von": lo, "bis": hi, "s": 0})
                continue
            secs = sum(x for _, x in lst)
            d0, d1 = S.dist[lst[0][0]], S.dist[lst[-1][0]]
            dist = (d1 - d0) if d0 is not None and d1 is not None else None
            hrv = _avg([S.hr[i] for i, _ in lst], [x for _, x in lst])
            cad = _avg([(S.cad[i] * 2 if S.cad[i] else None) for i, _ in lst], [x for _, x in lst])
            sp.append({"von": lo, "bis": hi, "s": round(secs), "m": round(dist) if dist else None,
                       "pace": round(secs / dist * 1000) if dist and dist > 50 else None,
                       "hr": round(hrv, 1) if hrv else None, "cad": round(cad) if cad else None})
        out["sp"] = sp
    return out


def _grid(S, vals, gap=3):
    """1-s-Raster ab Start: Wert oder None; Lücken bis gap Sekunden mit dem letzten Wert gefüllt."""
    import numpy as np
    st = int(S.start or (S.ts[0] if S.ts else 0))
    L = int((S.ts[-1] - st) if S.ts else 0) + 1
    if L < 2 or L > 200000:
        return None
    arr = np.full(L, np.nan)
    for t, v in zip(S.ts, vals):
        if v is not None:
            k = int(t - st)
            if 0 <= k < L:
                arr[k] = v
    last, li = np.nan, -100
    for i in range(L):
        if not np.isnan(arr[i]):
            last, li = arr[i], i
        elif i - li <= gap:
            arr[i] = last
    return arr


def bloecke(S):
    """Gleichmässige 10-min-Blöcke (eb-1.0) für «Meine Entwicklung». Rad bei 200 W ± 10 W, Laufen bei 5:30/km ± 10 s.
    Je Aktivität: Anzahl nicht überlappender Blöcke und Median von Leistung/Pace, Puls, Pulsanstieg im Block,
    Temperatur und Höhe. Ohne Puls oder ohne Leistung/Tempo: nichts (kein Schätzen)."""
    import numpy as np
    cat = S.category
    if cat not in ("rad", "lauf") or not any(h for h in S.hr) or len(S.ts) < 600:
        return None
    hr = _grid(S, S.hr)
    if hr is None:
        return None
    W, A, step = EB["fenster"], EB["ab"], EB["schritt"]
    L = len(hr)
    if L < A + W:
        return None
    if cat == "rad":
        if not any(p for p in S.pw if p):
            return None
        x = _grid(S, S.pw)
        # Höhe nur draussen: Zwift und andere virtuelle Fahrten liefern eine virtuelle Höhe
        alt = _grid(S, S.alt, gap=10) if not S.indoor and any(v is not None for v in S.alt) else None
        cfg = EB["rad"]
    else:
        if S.indoor or not any(v for v in S.dist if v):
            return None
        x = _grid(S, S.spd, gap=5)
        dist = _grid(S, S.dist, gap=10)
        alt = _grid(S, S.alt, gap=10)
        cfg = EB["lauf"]
    temp = _grid(S, S.temp, gap=60)
    hv = ~np.isnan(hr)
    hrz = np.where(hv, hr, 0.0)
    ch, cv_ = np.concatenate([[0], np.cumsum(hrz)]), np.concatenate([[0], np.cumsum(hv)])
    found, t = [], A
    while t + W <= L:
        seg = x[t:t + W]
        if np.isnan(seg).mean() > 0.03 or cv_[t + W] - cv_[t] < 0.95 * W:
            t += step
            continue
        blocks = np.nanmean(seg.reshape(-1, 30), axis=1)
        m = float(np.nanmean(seg))
        ok = m > 0 and np.nanstd(blocks) / m <= cfg["cv"] and np.nanmin(blocks) >= cfg["min_rel"] * m
        if ok and cat == "rad":
            ok = cfg["lo"] <= m <= cfg["hi"] and float(np.mean(np.nan_to_num(seg) <= 0)) <= cfg["zero"]
            val = m
        elif ok:
            d0, d1 = dist[t], dist[t + W - 1]
            if np.isnan(d0) or np.isnan(d1) or d1 - d0 < 500:
                ok = False
            else:
                pace = W / (d1 - d0) * 1000
                a = alt[t:t + W]
                if np.isnan(a).mean() > 0.2:
                    ok = False
                else:
                    a30 = np.nanmean(a.reshape(-1, 30), axis=1)
                    steig = (a30[-1] - a30[0]) / (d1 - d0)
                    anst = float(np.sum(np.clip(np.diff(a30), 0, None)))
                    ok = cfg["lo"] <= pace <= cfg["hi"] and abs(steig) <= cfg["steig"] and anst <= cfg["anstieg"]
                    val = pace
        if not ok:
            t += step
            continue
        n1 = cv_[t + W // 2] - cv_[t]
        n2 = cv_[t + W] - cv_[t + W // 2]
        h1 = (ch[t + W // 2] - ch[t]) / n1 if n1 else None
        h2 = (ch[t + W] - ch[t + W // 2]) / n2 if n2 else None
        hm = (ch[t + W] - ch[t]) / (cv_[t + W] - cv_[t])
        tp = temp[t:t + W] if temp is not None else None
        tt = float(np.nanmean(tp)) if tp is not None and not np.isnan(tp).all() else None
        al = float(np.nanmean(alt[t:t + W])) if alt is not None and not np.isnan(alt[t:t + W]).all() else None
        found.append({"x": val, "hr": hm, "dhr": (h2 - h1) if h1 and h2 else None, "t": tt, "alt": al, "s0": t})
        t += W
    if not found:
        return None
    med = lambda k: (float(np.median([f[k] for f in found if f[k] is not None])) if any(f[k] is not None for f in found) else None)
    out = {"v": EB["v"], "art": "rad200" if cat == "rad" else "lauf330", "n": len(found),
           ("w" if cat == "rad" else "pace"): round(med("x"), 1), "hr": round(med("hr"), 1),
           "dhr": round(med("dhr"), 1) if med("dhr") is not None else None,
           "t": round(med("t"), 1) if med("t") is not None else None, "alt": round(med("alt")) if med("alt") is not None else None,
           "s0": [f["s0"] for f in found]}
    return out


def hh(S):
    """Puls-Histogramm wie parse_activities.py (Version hh-pdc-1.0)."""
    hrs, ts = S.hr, S.ts
    if not any(h for h in hrs):
        return None
    out = [0] * 30
    for i in range(len(ts) - 1):
        h = hrs[i]
        if h:
            d = ts[i + 1] - ts[i]
            if 0 < d <= 10:
                b = min(29, max(0, (h - 60) // 5))
                out[b] += d
    while out and out[-1] == 0:
        out.pop()
    return out


def power_curve(S):
    """NP (falls nicht in der Session) und Leistungskurve wie parse_activities.py."""
    np_ = S.session_fields.get("np")
    if S.sport != 2 or not any(p for p in S.pw if p):
        return np_, None
    st = S.start
    en = st + S.elapsed + 1
    L = int(en - st) + 1
    if not (0 < L < 200000):
        return np_, None
    arr = [0] * L
    filled = bytearray(L)
    for t, p in zip(S.ts, S.pw):
        if p is not None:
            k = t - st
            if 0 <= k < L:
                arr[k] = p
                filled[k] = 1
    last, lasti = 0, -100
    for i in range(L):
        if filled[i]:
            last, lasti = arr[i], i
        elif i - lasti <= 3:
            arr[i] = last
    cs = list(itertools.accumulate(arr, initial=0))
    if L >= 30 and not np_:
        r4 = [((cs[i] - cs[i - 30]) / 30.0) ** 4 for i in range(30, L + 1)]
        np_ = round((sum(r4) / len(r4)) ** 0.25)
    pdc = {}
    for d in PDC_D:
        if L >= d:
            pdc[d] = round(max(map(operator.sub, cs[d:], cs[:-d])) / d)
    return np_, pdc


def zeitfelder(S):
    z = zeit.zeit(S)
    return {"el": int(S.elapsed or 0), "mv": z["mov"], "st": z["stop"], "nst": z["nstop"], "un": z["unt"], "rc": z["rec"],
            "ac": z["act"], "us": z["uhr_stop"]}, z


def alles(S):
    """Alle Kennzahlen einer Session (für Nacht-Update und Prüfungen)."""
    f, z = zeitfelder(S)
    np_, pdc = power_curve(S)
    f["hh"] = hh(S)
    f["np"] = np_
    f["pdc"] = pdc
    st = stufen.stufen(S) if S.category in ("rad", "lauf") else None
    f["stufen"] = st if stufen.relevant(st) else None
    f["t0"] = int(S.start) if S.start else None
    f.update(ausdauer(S))
    eb = bloecke(S)
    if eb:
        f["eb"] = eb
    return f, z
