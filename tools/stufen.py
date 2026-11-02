"""Stufen eines Stufentests aus den Sekundenwerten (Umsetzungsplan A5), Version stufen-1.0.

Rad mit Zwift-Zielleistung (Entwicklerfeld target_power): Abschnitte gleicher Zielleistung.
Rad ohne Zielleistung: Plateaus der Leistung (gleitender Median über 20 s).
Laufen: Plateaus des Tempos innerhalb der Abschnitte, in denen die Uhr lief.

Eine Stufenfolge sind mindestens 4 aufeinanderfolgende Abschnitte mit gleich grossem Anstieg
(Rad 10–50 W, Lauf 0,4–2,5 km/h) und je mindestens 150 s Belastung. Für jede Stufe zählt das
Ende des Abschnitts: die letzten `stufe_s` Sekunden mit Treten bzw. Laufen (Einfahren auf gleicher
Stufe fällt so weg). Werte einer Stufe (Konzept, Abschnitt 2, «Werte pro Messpunkt»):
Leistung als Median der Stufe (robust gegen Blutentnahme und Wiedereinstieg im ERG-Modus), dazu Mittel, letzte 3 min, NP; Puls Ø, max, letzte 60 s und 30 s, Anstieg 2. gegen 1. Hälfte;
Trittfrequenz; gefahrene Sekunden; Pause davor; Arbeit vor der Stufe (kJ).
Laktat steht hier nie: es kommt nur mit Quelle aus einer Tabelle oder dem Chat dazu.
"""
import statistics

VERSION = "stufen-1.0"
MIN_STAGE_S = 150
MIN_STAGES = 4


def _ride(S, i):
    if S.category == "lauf":
        return (S.spd[i] or 0) >= 1.0
    return (S.pw[i] or 0) > 0 or (S.cad[i] or 0) > 0


def _runs_target(S):
    runs, cur = [], None
    for i, tp in enumerate(S.target):
        if cur is not None and tp == cur["level"]:
            cur["idx"].append(i)
        else:
            cur = {"level": tp, "idx": [i]}
            runs.append(cur)
    return [r for r in runs if r["level"]]


def _rolling_median(vals, half=10):
    out, n = [], len(vals)
    for i in range(n):
        w = [v for v in vals[max(0, i - half):i + half + 1] if v is not None]
        out.append(statistics.median(w) if w else None)
    return out


def _runs_plateau(S, key):
    """Plateaus einer Grösse (Leistung in W oder Tempo in km/h)."""
    if key == "pw":
        raw = [(p if (p or 0) > 0 else None) for p in S.pw]
        tol_abs, tol_rel = 8.0, 0.06
    else:
        raw = [((v or 0) * 3.6 if (v or 0) >= 1.0 else None) for v in S.spd]
        tol_abs, tol_rel = 0.35, 0.04
    med = _rolling_median(raw)
    runs, cur, out_cnt = [], None, 0
    for i, m in enumerate(med):
        gap = i and S.ts[i] - S.ts[i - 1] > 10
        if m is None:
            if cur:
                cur["idx"].append(i)
            continue
        if cur is None or gap:
            cur = {"vals": [m], "idx": [i]}
            runs.append(cur)
            out_cnt = 0
            continue
        lvl = statistics.fmean(cur["vals"][-120:])
        if abs(m - lvl) > max(tol_abs, tol_rel * lvl):
            out_cnt += 1
            if out_cnt > 12:                        # 12 s anhaltend daneben: neuer Abschnitt
                back = cur["idx"][-out_cnt:]
                del cur["idx"][-out_cnt:]
                del cur["vals"][-out_cnt:]
                cur = {"vals": [med[k] for k in back if med[k] is not None] + [m], "idx": back + [i]}
                runs.append(cur)
                out_cnt = 0
                continue
        else:
            out_cnt = 0
        cur["vals"].append(m)
        cur["idx"].append(i)
    out = []
    for r in runs:
        if r["vals"]:
            lv = statistics.median(r["vals"])
            r["level"] = round(lv / 5) * 5 if key == "pw" else round(lv, 1)
            out.append(r)
    return out


def _chain(runs, S, inc_lo, inc_hi):
    qual = []
    for r in runs:
        r["ride"] = [i for i in r["idx"] if _ride(S, i)]
        if len(r["ride"]) >= MIN_STAGE_S:
            qual.append(r)
    best = []
    for a in range(len(qual)):
        ch = [qual[a]]
        inc = None
        for b in range(a + 1, len(qual)):
            d = qual[b]["level"] - ch[-1]["level"]
            if inc is None:
                if not (inc_lo <= d <= inc_hi):
                    break
                inc = d
            elif abs(d - inc) > (max(5.0, 0.25 * inc) if inc >= 5 else max(0.25, 0.3 * inc)):
                break
            # zwischen zwei Stufen keine längere andere Belastung
            between = S.ts[qual[b]["ride"][0]] - S.ts[ch[-1]["ride"][-1]]
            if between > 900:
                break
            ch.append(qual[b])
        if len(ch) > len(best):
            best = ch
    return best if len(best) >= MIN_STAGES else []


def _mean(v):
    v = [x for x in v if x is not None]
    return statistics.fmean(v) if v else None


def _np(p):
    if len(p) < 30:
        return None
    cs = [0.0]
    for x in p:
        cs.append(cs[-1] + (x or 0))
    r4 = [((cs[i] - cs[i - 30]) / 30.0) ** 4 for i in range(30, len(cs))]
    return (sum(r4) / len(r4)) ** 0.25


def relevant(r):
    """Für das Testzentrum: mindestens 5 Stufen oder Stufen ab 5 Minuten (Laktat braucht lange Stufen)."""
    return bool(r) and (r["n"] >= 5 or r["stufe_s"] >= 300)


def stufen(S, stufe_s=None):
    """Erkannte Stufenfolge oder None."""
    sport = S.category
    if sport not in ("rad", "lauf") or len(S.ts) < 600:
        return None
    if sport == "rad" and sum(1 for t in S.target if t) > 0.5 * len(S.ts):
        runs, how, unit = _runs_target(S), "zielleistung", "W"
        chain = _chain(runs, S, 10, 50)
    elif sport == "rad":
        runs, how, unit = _runs_plateau(S, "pw"), "plateau", "W"
        chain = _chain(runs, S, 10, 50)
    else:
        runs, how, unit = _runs_plateau(S, "spd"), "plateau", "km/h"
        chain = _chain(runs, S, 0.5, 2.5)
    if not chain:
        return None
    rides = [len(r["ride"]) for r in chain]
    if stufe_s is None:                        # Stufendauer: Zielleistung → Länge der Abschnitte, sonst gefahrene Zeit
        lens = sorted(len(r["idx"]) if how == "zielleistung" else len(r["ride"]) for r in chain[1:])
        stufe_s = int(round(lens[len(lens) // 2] / 30.0) * 30) if lens else rides[0]
    stages, prev_end = [], None
    work = [0.0]
    for i in range(len(S.ts)):                 # Arbeit bis zu jedem Datensatz (J), Lücken ohne Arbeit
        work.append(work[-1] + (S.pw[i] or 0))
    for n, r in enumerate(chain, 1):
        # Stufe = letzter zusammenhängender Teil des Abschnitts (Unterbrüche bis 15 s zählen nicht).
        # Wer nach dem Zielwechsel noch kurz fährt und dann für die Blutentnahme anhält, beginnt die Stufe danach.
        segs = [[r["ride"][0]]]
        for a, b in zip(r["ride"], r["ride"][1:]):
            if S.ts[b] - S.ts[a] > 15:
                segs.append([b])
            else:
                segs[-1].append(b)
        keep = []
        for sg in reversed(segs):
            keep = sg + keep
            if len(keep) >= MIN_STAGE_S:
                break
        r_stage = {"idx": r["idx"], "ride": keep}
        st = block(S, r_stage, stufe_s, unit, work)
        st = {"nr": n, "soll": r["level"], "unit": unit, **st}
        if prev_end is not None:
            between = [i for i in range(prev_end + 1, keep[0]) if _ride(S, i)]
            st["pause_vor"] = max(0, S.ts[keep[0]] - S.ts[prev_end] - 1 - len(between))
            st["zwischen_s"] = len(between) or None
        else:
            st["pause_vor"] = None
        st["abschnitt_s"] = len(r["ride"])
        stages.append(st)
        prev_end = keep[-1]
    last = chain[-1]
    after = [r for r in runs if r["idx"][0] > last["idx"][-1]]
    nxt = after[0] if after else None
    ende = {"letzte": last["level"], "naechste": nxt["level"] if nxt else None,
            "naechste_s": len([i for i in nxt["idx"] if _ride(S, i)]) if nxt else None}
    inc = round(statistics.median([chain[k + 1]["level"] - chain[k]["level"] for k in range(len(chain) - 1)]), 1)
    return {"v": VERSION, "erkennung": how, "unit": unit, "start": chain[0]["level"], "schritt": inc,
            "stufe_s": stufe_s, "n": len(stages), "stufen": stages, "ende": ende}


def block(S, r, stufe_s=None, unit=None, work=None):
    """Werte eines Abschnitts (Stufe oder Check-Block): r = {"idx": alle Datensätze, "ride": mit Belastung}."""
    if unit is None:
        unit = "km/h" if S.category == "lauf" else "W"
    if work is None:
        work = [0.0]
        for i in range(len(S.ts)):
            work.append(work[-1] + (S.pw[i] or 0))
    if True:
        ride = r["ride"]
        win = ride[-stufe_s:] if stufe_s and len(ride) > stufe_s else ride
        pw = [S.pw[i] for i in win]
        hr = [S.hr[i] for i in win]
        last180, last60, last30 = win[-180:], win[-60:], win[-30:]
        half = len(win) // 2
        h1, h2 = _mean(hr[:half]), _mean(hr[half:])
        st = {
            "x": round(statistics.median([S.pw[i] or 0 for i in win]), 1) if unit == "W" else round(statistics.median([(S.spd[i] or 0) * 3.6 for i in win]), 2),
            "x_mean": round(_mean([S.pw[i] for i in win]), 1) if unit == "W" else round(_mean([(S.spd[i] or 0) * 3.6 for i in win]), 2),
            "x3": round(_mean([S.pw[i] for i in last180]), 1) if unit == "W" else round(_mean([(S.spd[i] or 0) * 3.6 for i in last180]), 2),
            "np": round(_np(pw)) if unit == "W" and _np(pw) else None,
            "hr": round(_mean(hr), 1) if _mean(hr) else None,
            "hr_max": max((h for h in hr if h), default=None),
            "hr60": round(_mean([S.hr[i] for i in last60]), 1) if _mean([S.hr[i] for i in last60]) else None,
            "hr30": round(_mean([S.hr[i] for i in last30]), 1) if _mean([S.hr[i] for i in last30]) else None,
            "drift": round((h2 / h1 - 1) * 100, 1) if h1 and h2 else None,
            "cad": round(_mean([S.cad[i] for i in win])) if _mean([S.cad[i] for i in win]) else None,
            "ride_s": len(ride), "win_s": len(win),
            "t0": S.ts[win[0]], "t1": S.ts[win[-1]],
            "kj_vor": round(work[win[0]] / 1000.0),
        }
        if unit == "km/h" and S.alt[win[0]] is not None and S.alt[win[-1]] is not None and S.dist[win[0]] is not None:
            dd = (S.dist[win[-1]] or 0) - (S.dist[win[0]] or 0)
            st["steigung"] = round((S.alt[win[-1]] - S.alt[win[0]]) / dd * 100, 1) if dd > 50 else None
        # Blutentnahme: erster Unterbruch (Lücke oder Sekunde ohne Treten) in den letzten 120 s des Abschnitts.
        # Puls dafür: Mittel der 30 s davor (so liest man ihn bei der Entnahme ab).
        idx = r["idx"]
        tend = S.ts[idx[-1]]
        cut = None
        for a, b in zip(idx, idx[1:]):
            if S.ts[b] >= tend - 120 and S.ts[b] - S.ts[a] > 1:
                cut = S.ts[a] + 1
                break
        for i in idx:
            if S.ts[i] >= tend - 120 and not _ride(S, i):
                if cut is None or S.ts[i] < cut:
                    cut = S.ts[i]
                break
        tc = cut if cut is not None else S.ts[win[-1]] + 1
        hv = [S.hr[i] for i in idx if tc - 30 <= S.ts[i] < tc and _ride(S, i)]
        st["hr_vor"] = round(_mean(hv), 1) if _mean(hv) else st["hr30"]
        if cut is not None:
            resumed = any(S.ts[i] > cut + 15 and _ride(S, i) for i in idx)
            st["entnahme"] = {"vor_ende_s": int(tend - cut), "art": "Unterbruch, weitergefahren" if resumed else "angehalten"}
        else:
            st["entnahme"] = None
        return st
