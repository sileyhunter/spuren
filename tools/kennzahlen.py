"""Kennzahlen einer Session aus den Sekundenreihen (series.Session), gleich für Monatsexport und Nacht-Update.

Versionen: jede Kennzahl trägt die Version ihrer Regel (Umsetzungsplan A1). Ändert sich eine Regel,
steigt die Version, und tools/check_referenz.py zeigt, welche Werte sich dadurch ändern.

Felder je Aktivität (kurz, weil die Seite alles lädt):
  el  Gesamtzeit s · mv Bewegungszeit s · st Stopps s · nst Anzahl Stopps · un Unterbrechungen s
  rc  geplante Erholung s · ac aktive Belastungszeit s · us Uhr gestoppt s
  hh  Puls-Histogramm (5-bpm-Klassen ab 60, Sekunden) · pdc beste Leistung je Dauer · np
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
}


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
    return f, z
