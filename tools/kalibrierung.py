"""Persönliche Kalibrierung für den Routenplaner (kalibrierung-1.0).

Quelle: FIT-Sekundenreihen aus dem Garmin-Export (work/files.json), nur Outdoor-Einheiten mit Höhe und Strecke.
Validierung: die jüngsten 25 % der passenden Einheiten werden zurückgehalten (nie zum Anpassen verwendet);
darauf Fehler (MAE) und Vergleich mit einer einfachen Distanz-/Höhenmeter-Faustregel. Die Werte für die Anzeige
werden danach mit allen Einheiten der letzten drei Jahre neu angepasst; der Fehler stammt aus dem Hold-out.

- rad_hf_w      HF → Watt aus konstanten 10-min-Blöcken (30-s-Mittel schwanken ≤ 12 %, HF = Mittel der letzten 5 min,
                HF-Drift im Block ≤ 6/min, erste 10 min der Fahrt ausgelassen)
- rad_modell    Physik-Fahrzeit (wie js/route.js) gegen echte Bewegungszeit, je Rennrad/MTB, mit empirischer Korrektur
- lauf_hf_pace  HF → Flachtempo aus 5-min-Blöcken (|Steigung| < 1,5 %, Tempo-Schwankung ≤ 8 %)
- lauf_gap      ganze Läufe: Flachtempo aus der HF-Kalibrierung bei der Ø-HF + Minetti je 20 m gegen Bewegungszeit
- wandern_tobler persönlicher Faktor auf Tobler; wandern_vam / wandern_hf_vam Hm/h in steilen 10-min-Blöcken
- skitour_vam / skitour_hf_vam Aufstieg Hm/h; skitour_abfahrt nur zur Information (nicht für Prognosen)
- pausen        (Gesamtzeit − Bewegungszeit) / Bewegungszeit je Sportart, Einheiten ≥ 90 min

Aufruf: python3 -I tools/kalibrierung.py data.json --files work/files.json [--zeigen]
"""
import datetime as dt
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import series  # noqa: E402

VERSION = "kalibrierung-1.1"     # 1.1: Hold-out-Population (Länge, Hm/km) und Fehler je Steigungsklasse
G = 9.80665
RAD_TYPEN = {"rennrad": {"Rennrad", "Radfahren"}, "mtb": {"Mountainbike", "Mountainbiken"}}
LAUF_TYPEN = {"Laufen", "Run", "Trail Run"}
WANDER_TYPEN = {"Wandern", "Hike", "Bergsteigen"}
SKI_TYPEN = {"Skitouren"}
RAD_PAR = {"rennrad": {"kg": 8.5, "cda": 0.30, "crr": 0.0040, "vmax": 60}, "mtb": {"kg": 13, "cda": 0.42, "crr": 0.0100, "vmax": 40}}


# ---------------------------------------------------------------- Hilfen
def resample(S, step=1.0, maxgap=12):
    """Auf 1 s gleichmässig; Lücken > maxgap s bleiben NaN (Pause)."""
    ts = np.asarray(S.ts, float)
    if len(ts) < 10:
        return None
    t = np.arange(ts[0], ts[-1] + 1, step)
    idx = np.searchsorted(ts, t, side="right") - 1
    gap = t - ts[idx]
    out = {"t": t}
    for name in ("pw", "hr", "spd", "dist", "alt"):
        v = np.asarray([np.nan if x is None else x for x in getattr(S, name)], float)
        a = v[idx]
        a[gap > maxgap] = np.nan
        out[name] = a
    # Strecke und Höhe linear statt Stufen
    for name in ("dist", "alt"):
        v = np.asarray([np.nan if x is None else x for x in getattr(S, name)], float)
        ok = ~np.isnan(v)
        if ok.sum() > 2:
            out[name] = np.interp(t, ts[ok], v[ok])
    return out


def ols(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    b, a = np.polyfit(x, y, 1)
    r = float(np.corrcoef(x, y)[0, 1]) if len(x) > 2 else None
    return float(a), float(b), r


def split_by_date(items, key="date", frac=0.25):
    """Jüngste frac der Einheiten als Hold-out (nach Datum, nie gemischt)."""
    acts = sorted({(i[key], i["act"]) for i in items})
    n_test = max(1, int(round(len(acts) * frac))) if len(acts) >= 4 else 0
    test_ids = {a for _, a in acts[len(acts) - n_test:]} if n_test else set()
    return [i for i in items if i["act"] not in test_ids], [i for i in items if i["act"] in test_ids]


def recent(items, days, key="date"):
    if not items:
        return items
    last = max(i[key] for i in items)
    lim = (dt.date.fromisoformat(last) - dt.timedelta(days=days)).isoformat()
    return [i for i in items if i[key] >= lim]


def profile20(dist, alt, step=20.0):
    """Strecke/Höhe → 20-m-Schritte, Höhe gleitend über 100 m gemittelt (wie hoehe-1.0 im Planer)."""
    ok = ~(np.isnan(dist) | np.isnan(alt))
    d, a = dist[ok], alt[ok]
    if len(d) < 20 or d[-1] - d[0] < 500:
        return None
    o = np.argsort(d, kind="stable")
    d, a = d[o], a[o]
    grid = np.arange(d[0], d[-1], step)
    e = np.interp(grid, d, a)
    k = np.ones(5) / 5
    pad = np.pad(e, 2, mode="edge")
    es = np.convolve(pad, k, mode="valid")
    return grid, es


# ---------------------------------------------------------------- Modelle (gleich wie js/route.js)
def rho(temp, alt):
    p = 101325 * (1 - 2.25577e-5 * alt) ** 5.25588
    return p / (287.05 * (temp + 273.15))


def power_at(v, grade, m, cda, crr, r, eta=0.976):
    th = math.atan(grade)
    return (m * G * (math.sin(th) + crr * math.cos(th)) * v + 0.5 * r * cda * v * v * v) / eta


def speed_from_power(P, grade, m, cda, crr, r, vmax):
    if power_at(vmax, grade, m, cda, crr, r) <= P:
        return vmax
    if power_at(0.05, grade, m, cda, crr, r) >= P:
        return 0.05
    lo, hi = 0.05, vmax
    for _ in range(50):
        mid = (lo + hi) / 2
        if power_at(mid, grade, m, cda, crr, r) < P:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def bike_time(grid, es, P, m, par, temp=15.0):
    t = 0.0
    for k in range(len(grid) - 1):
        ds = grid[k + 1] - grid[k]
        g = (es[k + 1] - es[k]) / ds
        Pk = P if g >= -0.02 else 0.0 if g <= -0.05 else P * (0.3 + 0.7 * (g + 0.05) / 0.03)
        v = speed_from_power(Pk, g, m, par["cda"], par["crr"], rho(temp, es[k]), par["vmax"] / 3.6)
        if v < 0.3:
            v = 1.0
        t += ds / v
    return t


def minetti(i):
    i = max(-0.45, min(0.45, i))
    return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6


def run_time(grid, es, vflat, vam_walk=900.0):
    t, c0 = 0.0, minetti(0)
    for k in range(len(grid) - 1):
        ds = grid[k + 1] - grid[k]
        g = (es[k + 1] - es[k]) / ds
        v = vflat * c0 / minetti(g)
        if g < 0:
            v = min(v, vflat * 1.2)
        if g > 0.2:
            v = min(v, max(vam_walk / 3600 / g, 0.6))
        t += ds / v
    return t


def tobler(g):
    return 6 * math.exp(-3.5 * abs(g + 0.05))


def hike_time(grid, es):
    t = 0.0
    for k in range(len(grid) - 1):
        ds = grid[k + 1] - grid[k]
        g = (es[k + 1] - es[k]) / ds
        t += ds / (tobler(g) / 3.6)
    return t


def din_hours(km, up, dn, h_kmh=4.0, up_mh=300.0, dn_mh=500.0):
    th, tv = km / h_kmh, up / up_mh + dn / dn_mh
    return max(th, tv) + min(th, tv) / 2


def ascent(es, hyst=3.0):
    up = dn = 0.0
    ref = es[0]
    for v in es[1:]:
        if v - ref >= hyst:
            up += v - ref
            ref = v
        elif ref - v >= hyst:
            dn += ref - v
            ref = v
    return up, dn


# ---------------------------------------------------------------- Blöcke aus Sekundenwerten
def bike_blocks(R):
    pw, hr, spd = R["pw"], R["hr"], R["spd"]
    n, out, i = len(pw), [], 600
    while i + 600 <= n:
        p, h, v = pw[i:i + 600], hr[i:i + 600], spd[i:i + 600]
        if np.isnan(p).mean() > 0.05 or np.isnan(h).mean() > 0.05 or (np.nan_to_num(v) < 2).mean() > 0.05:
            i += 60
            continue
        p30 = np.nanmean(p.reshape(20, 30), axis=1)
        mp = float(np.nanmean(p))
        if mp < 100 or np.std(p30) / np.mean(p30) > 0.12:
            i += 60
            continue
        h1, h2 = np.nanmean(h[240:420]), np.nanmean(h[420:600])
        if abs(h2 - h1) > 6:
            i += 60
            continue
        out.append({"hr": float(np.nanmean(h[300:600])), "w": mp})
        i += 600
    return out


def run_blocks(R):
    dist, alt, hr = R["dist"], R["alt"], R["hr"]
    n, out, i = len(dist), [], 600
    while i + 300 <= n:
        d, a, h = dist[i:i + 300], alt[i:i + 300], hr[i:i + 300]
        if np.isnan(d).any() or np.isnan(a).any() or np.isnan(h).mean() > 0.05:
            i += 30
            continue
        ds = d[-1] - d[0]
        v = ds / 300.0
        if v < 2.0 or v > 6.5:
            i += 30
            continue
        a30 = a.reshape(10, 30).mean(axis=1)
        d30 = np.diff(d[::30].tolist() + [d[-1]])
        v30 = d30 / 30.0
        up = np.clip(np.diff(a30), 0, None).sum()
        if abs(a30[-1] - a30[0]) / ds > 0.015 or up > 5 or np.std(v30) / np.mean(v30) > 0.08:
            i += 30
            continue
        out.append({"hr": float(np.nanmean(h[120:300])), "v": float(v)})
        i += 300
    return out


def climb_blocks(R, min_grade, vmin=0.2):
    """10-min-Blöcke stetig bergauf: Hm/h und HF (letzte 5 min); auch Abfahrtsblöcke zur Information."""
    dist, alt, hr = R["dist"], R["alt"], R["hr"]
    n, up_b, dn_b, i = len(alt), [], [], 300
    while i + 600 <= n:
        d, a, h = dist[i:i + 600], alt[i:i + 600], hr[i:i + 600]
        if np.isnan(a).any() or np.isnan(d).any():
            i += 60
            continue
        ds = d[-1] - d[0]
        if ds / 600 < vmin:
            i += 60
            continue
        a60 = a.reshape(10, 60).mean(axis=1)          # Minutenmittel gegen Höhenrauschen
        diffs = np.diff(a60)
        gain = a60[-1] - a60[0]                       # Mitten der ersten und letzten Minute: 540 s auseinander
        rate = gain / 540.0 * 3600.0
        if gain > 0 and gain / max(ds * 0.9, 1) >= min_grade and (diffs > -2).all():
            if np.isnan(h).mean() <= 0.05:
                up_b.append({"vam": float(rate), "hr": float(np.nanmean(h[300:600]))})
            i += 600
            continue
        if gain < 0 and -gain / max(ds * 0.9, 1) >= min_grade and (diffs < 2).all():
            dn_b.append({"vam": float(-rate)})
            i += 600
            continue
        i += 60
    return up_b, dn_b


# ---------------------------------------------------------------- Auswertung
def load_series(path, cat):
    try:
        for S in series.from_fit(path):
            if S.category == cat and not S.indoor:
                return S
    except Exception:
        return None
    return None


def regress_report(items, xk, yk, min_train, min_test, unit_err, err_fn=None):
    tr, te = split_by_date(items)
    rep = {"n": len(items), "n_aktiv": len({i["act"] for i in items}), "n_train": len(tr), "n_test": len(te),
           "n_test_aktiv": len({i["act"] for i in te})}
    if len(tr) < min_train or len(te) < min_test or len({i["act"] for i in tr}) < 5:
        rep.update(ok=False, grund=f"zu wenige Blöcke (Training {len(tr)}, Test {len(te)})")
        return rep
    a, b, r = ols([i[xk] for i in tr], [i[yk] for i in tr])
    pred = [a + b * i[xk] for i in te]
    err = [(err_fn(p, i[yk]) if err_fn else abs(p - i[yk])) for p, i in zip(pred, te)]
    base = float(np.mean([i[yk] for i in tr]))
    err0 = [(err_fn(base, i[yk]) if err_fn else abs(base - i[yk])) for i in te]
    mae, mae0 = float(np.mean(err)), float(np.mean(err0))
    rec = recent(items, 3 * 365)
    a2, b2, r2 = ols([i[xk] for i in rec], [i[yk] for i in rec])
    rep.update(ok=bool(b2 > 0 and mae < mae0), a=a2, b=b2, r=r2, mae=mae, mae_konstant=mae0, einheit_fehler=unit_err,
               verbesserung=1 - mae / mae0 if mae0 else None, schwach=bool(mae0 and 1 - mae / mae0 < 0.15),
               hold_out={"a": a, "b": b, "r": r, "von": min(i["date"] for i in te), "bis": max(i["date"] for i in te)},
               x_bereich=[float(np.percentile([i[xk] for i in rec], 5)), float(np.percentile([i[xk] for i in rec], 95))],
               punkte=[[i["date"], round(i[xk], 1), round(i[yk], 3 if yk == "v" else 1)] for i in rec][-300:])
    if not rep["ok"]:
        rep["grund"] = "Hold-out-Fehler nicht besser als ein konstanter Wert" if mae >= mae0 else "Zusammenhang nicht positiv"
    return rep


def klasse(r):
    """Steigungsklasse einer Fahrt nach Höhenmetern je km (kalibrierung-1.1)."""
    hk = r["up"] / r["km"] if r.get("km") else 0.0
    return "flach" if hk < 8 else "wellig" if hk < 20 else "bergig"


def population(te, rel):
    """In welcher Population wurde der Fehler geprüft? Länge und Hm/km der Hold-out-Fahrten, Fehler je Steigungsklasse."""
    if not te or "km" not in te[0]:
        return {}
    km = [r["km"] for r in te]
    hk = [r["up"] / r["km"] for r in te if r["km"]]
    out = {"km": [round(float(np.percentile(km, 10)), 1), round(float(np.percentile(km, 90)), 1)], "km_min": round(min(km), 1),
           "hm_km": [round(float(np.percentile(hk, 10)), 1), round(float(np.percentile(hk, 90)), 1)], "klassen": {}}
    for k in ("flach", "wellig", "bergig"):
        e = [x for r, x in zip(te, rel) if klasse(r) == k]
        out["klassen"][k] = {"n": len(e), "mae_rel": float(np.mean(e)) if e else None, "p80_rel": float(np.percentile(e, 80)) if len(e) >= 5 else None}
    return out


def ratio_report(rows, pred_key, act_key, min_train=8, min_test=4, base_key=None):
    """Faktor = Median(Vorhersage/Ist) im Training; Fehler im Hold-out relativ zur Ist-Zeit."""
    tr, te = split_by_date(rows)
    rep = {"n": len(rows), "n_train": len(tr), "n_test": len(te)}
    if len(tr) < min_train or len(te) < min_test:
        rep.update(ok=False, grund=f"zu wenige Einheiten (Training {len(tr)}, Test {len(te)})")
        return rep
    f = float(np.median([r[pred_key] / r[act_key] for r in tr]))
    rel = [abs(r[pred_key] / f - r[act_key]) / r[act_key] for r in te]
    rel_raw = [abs(r[pred_key] - r[act_key]) / r[act_key] for r in te]
    bias = float(np.median([(r[pred_key] / f - r[act_key]) / r[act_key] for r in te]))
    rep.update(ok=True, faktor=f, mae_rel=float(np.mean(rel)), mae_rel_ohne_faktor=float(np.mean(rel_raw)), bias_rel=bias,
               p80_rel=float(np.percentile(rel, 80)), von=min(r["date"] for r in te), bis=max(r["date"] for r in te), population=population(te, rel))
    if base_key:
        rep["mae_rel_faustregel"] = float(np.mean([abs(r[base_key] - r[act_key]) / r[act_key] for r in te]))
    rec = recent(rows, 3 * 365)
    rep["faktor"] = float(np.median([r[pred_key] / r[act_key] for r in rec]))
    rep["faktor_hold_out"] = f
    return rep


def rechne(D, files, log=print):
    idx = {os.path.basename(f["path"]).rsplit("_", 1)[-1].split(".")[0]: f["path"] for f in files}
    weights = sorted((w["date"], w["kg"]) for w in D.get("weights", []) if w.get("kg"))
    kg_at = lambda d: next((kg for wd, kg in reversed(weights) if wd <= d), weights[-1][1] if weights else 75.0)  # noqa: E731
    acts = [a for a in D["activities"] if not a.get("indoor") and a["id"].split("-")[0] in idx]
    bike_items, bike_rows = [], {"rennrad": [], "mtb": []}
    run_items, run_rows = [], []
    hike_rows, hike_up, hike_dn = [], [], []
    ski_up, ski_dn = [], []
    for k, a in enumerate(acts):
        typ, path = a.get("typ"), idx[a["id"].split("-")[0]]
        fam = next((f for f, ts in RAD_TYPEN.items() if typ in ts), None)
        cat = "rad" if fam else "lauf" if typ in LAUF_TYPEN else "wandern" if typ in WANDER_TYPEN else "ski" if typ in SKI_TYPEN else None
        if not cat:
            continue
        S = load_series(path, cat)
        if not S or len(S.ts) < 600:
            continue
        R = resample(S)
        if R is None:
            continue
        mv = a.get("mv") or a.get("dur")
        base = {"act": a["id"], "date": a["date"]}
        if cat == "rad":
            if a.get("watt"):
                for b in bike_blocks(R):
                    bike_items.append({**base, **b})
            prof = profile20(R["dist"], R["alt"])
            pw = R["pw"]
            moving = (np.nan_to_num(R["spd"]) > 1.5)
            if prof and a.get("watt") and mv and mv > 2700 and np.isfinite(pw).mean() > 0.9:
                tret = pw[moving & (np.nan_to_num(pw) > 0)]
                if len(tret) > 600:
                    P = float(np.mean(tret))
                    temp = np.nanmean([x for x in S.temp if x is not None]) if any(x is not None for x in S.temp) else 15.0
                    m = kg_at(a["date"]) + RAD_PAR[fam]["kg"]
                    grid, es = prof
                    up, dn = ascent(es)
                    km = (grid[-1] - grid[0]) / 1000
                    pred = bike_time(grid, es, P, m, RAD_PAR[fam], float(temp))
                    faust = (km / 26 + up / 750) * 3600 if fam == "rennrad" else (km / 16 + up / 550) * 3600
                    bike_rows[fam].append({**base, "pred": pred, "ist": float(mv), "faust": faust, "P": P, "km": km, "up": up})
        elif cat == "lauf":
            for b in run_blocks(R):
                run_items.append({**base, **b})
            prof = profile20(R["dist"], R["alt"])
            hrm = np.nanmean(R["hr"][np.nan_to_num(R["spd"]) > 1.5]) if np.isfinite(R["hr"]).mean() > 0.8 else None
            if prof and mv and mv > 1200 and hrm:
                grid, es = prof
                up, dn = ascent(es)
                run_rows.append({**base, "hr": float(hrm), "grid": grid, "es": es, "ist": float(mv), "km": (grid[-1] - grid[0]) / 1000, "up": up})
        elif cat == "wandern":
            prof = profile20(R["dist"], R["alt"])
            if prof and mv and mv > 2700:
                grid, es = prof
                up, dn = ascent(es)
                km = (grid[-1] - grid[0]) / 1000
                hike_rows.append({**base, "pred": hike_time(grid, es), "ist": float(mv), "faust": din_hours(km, up, dn) * 3600})
            u, d_ = climb_blocks(R, 0.10, 0.3)
            hike_up += [{**base, **x} for x in u]
            hike_dn += [{**base, **x} for x in d_]
        elif cat == "ski":
            u, d_ = climb_blocks(R, 0.08, 0.2)
            ski_up += [{**base, **x} for x in u]
            ski_dn += [{**base, **x} for x in d_]
        if k % 100 == 0:
            log(f"… {k}/{len(acts)} Einheiten gelesen")

    K = {"v": VERSION, "erstellt": dt.date.today().isoformat(),
         "quelle": "FIT-Sekundenwerte aus dem Garmin-Export, nur Outdoor; Hold-out = jüngste 25 % der Einheiten"}
    K["rad_hf_w"] = regress_report(bike_items, "hr", "w", 30, 10, "W")
    for fam in ("rennrad", "mtb"):
        rows = bike_rows[fam]
        rep = ratio_report(rows, "pred", "ist", base_key="faust")
        rep["text"] = "Physik (Annahmen CdA/Crr, ohne Wind) gegen echte Bewegungszeit; Faktor = Median Vorhersage/Ist"
        rep["P_median"] = float(np.median([r["P"] for r in rows])) if rows else None
        K.setdefault("rad_modell", {})[fam] = rep
    pace_err = lambda pv, v: abs(1000 / pv - 1000 / v)  # noqa: E731  (s/km)
    K["lauf_hf_pace"] = regress_report(run_items, "hr", "v", 25, 8, "s/km", pace_err)
    lp = K["lauf_hf_pace"]
    if lp.get("ok") and len(run_rows) >= 12:
        # strikt: HF-Modell nur aus Blöcken VOR dem Testzeitraum der ganzen Läufe
        _, te_runs = split_by_date(run_rows)
        cut = min(r["date"] for r in te_runs)
        blk = [b for b in run_items if b["date"] < cut]
        a, b, _ = ols([x["hr"] for x in blk], [x["v"] for x in blk])
        rows = []
        for r in run_rows:
            vflat = a + b * r["hr"]
            if vflat <= 0.5:
                continue
            rows.append({"act": r["act"], "date": r["date"], "pred": run_time(r["grid"], r["es"], vflat), "ist": r["ist"],
                         "faust": (r["km"] / 10 + r["up"] / 700) * 3600})
        rep = ratio_report(rows, "pred", "ist", base_key="faust")
        rep["text"] = "HF-Kalibrierung (bei Ø-HF) + Minetti je 20 m gegen echte Bewegungszeit ganzer Läufe"
        K["lauf_gap"] = rep
    else:
        K["lauf_gap"] = {"ok": False, "grund": "keine HF-Kalibrierung für Läufe"}
    rep = ratio_report(hike_rows, "pred", "ist", base_key="faust")
    if rep.get("ok"):
        rep["faktor"] = 1 / rep["faktor"]            # Tempo-Faktor: >1 = schneller als Tobler
        rep["faktor_hold_out"] = 1 / rep["faktor_hold_out"]
    rep["text"] = "Tobler-Gehzeit je 20 m × persönlicher Faktor gegen echte Bewegungszeit"
    K["wandern_tobler"] = rep
    K["wandern_vam"] = vam_summary(hike_up)
    K["wandern_hf_vam"] = regress_report([x for x in hike_up if x.get("hr")], "hr", "vam", 25, 8, "Hm/h")
    K["skitour_vam"] = vam_summary(ski_up)
    K["skitour_hf_vam"] = regress_report([x for x in ski_up if x.get("hr")], "hr", "vam", 25, 8, "Hm/h")
    K["skitour_abfahrt"] = dict(vam_summary(ski_dn), hinweis="nur Information: Abfahrt hängt von Schnee, Gelände und Sicht ab")
    K["pausen"] = pausen(D)
    return K


def vam_summary(items):
    if len(items) < 10:
        return {"ok": False, "n": len(items), "grund": "zu wenige steile 10-min-Blöcke"}
    rec = recent(items, 3 * 365)
    v = [i["vam"] for i in rec]
    return {"ok": True, "n": len(rec), "n_aktiv": len({i["act"] for i in rec}), "median": float(np.median(v)),
            "p25": float(np.percentile(v, 25)), "p75": float(np.percentile(v, 75))}


def pausen(D):
    fam = {"rad": lambda a: a["sport"] == "rad" and not a.get("indoor"), "lauf": lambda a: a["sport"] == "lauf" and not a.get("indoor"),
           "wandern": lambda a: a.get("typ") in WANDER_TYPEN, "skitour": lambda a: a.get("typ") in SKI_TYPEN}
    out = {}
    for k, f in fam.items():
        xs = [(a["el"] - a["mv"]) / a["mv"] for a in D["activities"] if f(a) and a.get("mv") and a.get("el") and a["mv"] >= 5400 and a["el"] >= a["mv"]]
        out[k] = {"n": len(xs), "median": float(np.median(xs)) if xs else None, "p25": float(np.percentile(xs, 25)) if xs else None,
                  "p75": float(np.percentile(xs, 75)) if xs else None}
    return out


def main(argv):
    import warnings
    warnings.simplefilter("ignore", RuntimeWarning)      # leere Teilfenster (NaN) sind erwartet
    if len(argv) < 2:
        print(__doc__)
        return 2
    path = argv[1]
    files_path = argv[argv.index("--files") + 1] if "--files" in argv else "work/files.json"
    D = json.load(open(path, encoding="utf-8"))
    files = json.load(open(files_path, encoding="utf-8"))
    K = rechne(D, files)
    D["kalibrierung"] = K
    D.setdefault("versions", {})["kalibrierung"] = VERSION
    json.dump(D, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    if "--zeigen" in argv:
        for k, v in K.items():
            if isinstance(v, dict):
                print(k, json.dumps({x: y for x, y in v.items() if x not in ("punkte",)}, ensure_ascii=False)[:600])
    print("Kalibrierung gespeichert:", ", ".join(f"{k}={'ok' if isinstance(v, dict) and v.get('ok') else '–'}" for k, v in K.items() if isinstance(v, dict) and "ok" in v))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
