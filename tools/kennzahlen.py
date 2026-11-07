"""Kennzahlen einer Session aus den Sekundenreihen (series.Session), gleich für Monatsexport und Nacht-Update.

Versionen: jede Kennzahl trägt die Version ihrer Regel (Umsetzungsplan A1). Ändert sich eine Regel,
steigt die Version, und tools/check_referenz.py zeigt, welche Werte sich dadurch ändern.

Felder je Aktivität (kurz, weil die Seite alles lädt):
  el  Gesamtzeit s · mv Bewegungszeit s · st Stopps s · nst Anzahl Stopps · un Unterbrechungen s
  rc  geplante Erholung s · ac aktive Belastungszeit s · us Uhr gestoppt s
  hh  Puls-Histogramm (5-bpm-Klassen ab 60, Sekunden) · pdc beste Leistung je Dauer · np
  t0  Start (Unix-Sekunden, UTC, aus der Session) · dr Drift/Entkopplung 1. gegen 2. Hälfte der Bewegungszeit
  sp  Lauf-Abschnitte ab Start 0–5, 5–10, 10–20 min und Rest (Pace, Puls, Schrittfrequenz)   [ausdauer-1.0]
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
}
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
    return f, z
