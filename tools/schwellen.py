"""Laktatschwellen je Methode (V5, Version schwellen-1.0).

  python3 -I tools/schwellen.py data.json            # rechnet D["schwellen"] neu und speichert
  python3 -I tools/schwellen.py data.json --zeigen   # nur anzeigen

Quelle der Stufen: bestätigte Stufentests in D["lactate"] (kind "stufentest") und, solange Silas nicht bestätigt
hat (Schritt B1), die Vorschau D["laktat_vorschau"] (Status «vorschau»). Jede Schwelle trägt deshalb den Datenstatus.

Regeln (V5):
  - keine Schwelle aus Einzelmessungen, nur aus Stufentests mit mindestens 4 Stufen mit Laktat;
  - fixe 2 und 4 mmol/l werden nur zur Orientierung gerechnet, nie als LT1 oder LT2;
  - Dmax und mod. Dmax nur, wenn der Test ausbelastet war (sonst «nicht erfüllt»);
  - keine Schwelle ausserhalb der gemessenen Stufen (keine Extrapolation);
  - Unsicherheit: Simulation mit dem Messfehler des Laktatgeräts, Standardabweichung max(0,15 mmol/l; 7,5 %).

Methoden
  somc      Erste Schwelle SOMC: letzte Stufe vor dem ersten Anstieg um mindestens 0,4 mmol/l (Stufenwert)
  basis05   Basis + 0,5 mmol/l: Basis = Mittel der ersten drei Stufen, linear zwischen den Stufen
  loglog    log-log-Knick (Beaver 1985): zwei Geraden in log(Laktat) gegen log(Leistung), je ≥ 3 Stufen
  dickhuth  Dickhuth: Laktat am Minimum des Laktatäquivalents (Laktat/Leistung) + 1,5 mmol/l
  moddmax   mod. Dmax (Bishop 1998): Polynom 3. Grades, Gerade ab der Stufe vor dem ersten Anstieg > 0,4 mmol/l
  dmax      Dmax (Cheng 1992): Polynom 3. Grades, Gerade von der ersten zur letzten Stufe
  fix2/fix4 fixe 2 bzw. 4 mmol/l, nur Orientierung
"""
import datetime as dt
import json
import math
import random
import sys

VERSION = "schwellen-1.0"
N_SIM = 4000
SEED = 20261107
LT1_METHODS = ["somc", "basis05", "loglog"]
LT2_METHODS = ["dickhuth", "moddmax", "dmax"]
ORIENT = ["fix2", "fix4"]
METHOD_TEXT = {
    "somc": ("Erste Schwelle SOMC", "letzte Stufe vor dem ersten Anstieg um mindestens 0,4 mmol/l", "LT1"),
    "basis05": ("Basis + 0,5 mmol/l", "Basis = Mittel der ersten drei Stufen; linear zwischen den Stufen", "LT1"),
    "loglog": ("log-log-Knick (Beaver)", "zwei Geraden in log(Laktat) gegen log(Leistung), je mindestens 3 Stufen", "LT1"),
    "dickhuth": ("Dickhuth (Äquivalent + 1,5)", "Laktat am Minimum von Laktat/Leistung plus 1,5 mmol/l", "LT2"),
    "moddmax": ("mod. Dmax (Bishop)", "Polynom 3. Grades; nur bei Ausbelastung", "LT2"),
    "dmax": ("Dmax (Cheng)", "Polynom 3. Grades, Gerade erste bis letzte Stufe; nur bei Ausbelastung", "LT2"),
    "fix2": ("fix 2 mmol/l", "nur Orientierung, hängt am Gerät, keine Schwelle", "orientierung"),
    "fix4": ("fix 4 mmol/l", "nur Orientierung, keine Schwelle", "orientierung"),
}


def _interp(xs, ys, x):
    """y bei x, linear zwischen den Stufen; None ausserhalb."""
    if x is None:
        return None
    for i in range(1, len(xs)):
        if xs[i - 1] <= x <= xs[i]:
            if ys[i - 1] is None or ys[i] is None:
                return None
            f = 0 if xs[i] == xs[i - 1] else (x - xs[i - 1]) / (xs[i] - xs[i - 1])
            return ys[i - 1] + f * (ys[i] - ys[i - 1])
    return None


def _cross(xs, la, level, start=0):
    """erste Stelle ab Index start, an der die Kurve level erreicht (linear); None, wenn nie."""
    for i in range(max(1, start + 1), len(xs)):
        a, b = la[i - 1], la[i]
        if a < level <= b:
            return xs[i - 1] + (level - a) / (b - a) * (xs[i] - xs[i - 1])
    return None


def _polyfit3(xs, ys):
    """kleinste Quadrate, Polynom 3. Grades (Normalgleichungen, skaliert)."""
    m = sum(xs) / len(xs)
    s = (max(xs) - min(xs)) or 1.0
    u = [(x - m) / s for x in xs]
    n = 4
    A = [[sum(ui ** (r + c) for ui in u) for c in range(n)] for r in range(n)]
    b = [sum(yi * ui ** r for ui, yi in zip(u, ys)) for r in range(n)]
    for i in range(n):                                  # Gauss mit Pivot
        p = max(range(i, n), key=lambda r: abs(A[r][i]))
        A[i], A[p], b[i], b[p] = A[p], A[i], b[p], b[i]
        for r in range(i + 1, n):
            f = A[r][i] / A[i][i]
            for c in range(i, n):
                A[r][c] -= f * A[i][c]
            b[r] -= f * b[i]
    co = [0.0] * n
    for i in range(n - 1, -1, -1):
        co[i] = (b[i] - sum(A[i][c] * co[c] for c in range(i + 1, n))) / A[i][i]
    return lambda x: sum(c * ((x - m) / s) ** k for k, c in enumerate(co))


def _dmax(xs, la, i0):
    f = _polyfit3(xs, la)
    x0, y0, x1, y1 = xs[i0], la[i0], xs[-1], la[-1]
    if x1 <= x0:
        return None
    k = (y1 - y0) / (x1 - x0)
    best, bx = -1e9, None
    steps = int((x1 - x0) * 10) or 1
    for j in range(steps + 1):
        x = x0 + (x1 - x0) * j / steps
        d = (y0 + k * (x - x0)) - f(x)                  # Gerade über der Kurve
        if d > best:
            best, bx = d, x
    return bx


def _loglog(xs, la):
    n = len(xs)
    if n < 6 or any(v is None or v <= 0 for v in la):
        return None
    lx, ly = [math.log(x) for x in xs], [math.log(v) for v in la]

    def fit(a, b):
        X, Y = lx[a:b], ly[a:b]
        mx, my = sum(X) / len(X), sum(Y) / len(Y)
        sxx = sum((x - mx) ** 2 for x in X)
        k = sum((x - mx) * (y - my) for x, y in zip(X, Y)) / sxx
        d = my - k * mx
        return k, d, sum((y - (d + k * x)) ** 2 for x, y in zip(X, Y))

    best = None
    for k in range(3, n - 2):                           # erste Gerade Stufen 0..k-1, zweite k-1..n-1 (gemeinsamer Punkt)
        k1, d1, e1 = fit(0, k)
        k2, d2, e2 = fit(k - 1, n)
        if k2 <= k1:
            continue
        xb = math.exp((d1 - d2) / (k2 - k1))
        if not (xs[0] <= xb <= xs[-1]):
            continue
        if best is None or e1 + e2 < best[0]:
            best = (e1 + e2, xb)
    return best[1] if best else None


def methods(xs, la, ausbelastet):
    """Schwelle in x (W bzw. km/h) je Methode; None = nicht bestimmbar."""
    out = {}
    i_rise = next((i for i in range(1, len(la)) if la[i] - la[i - 1] >= 0.4 - 1e-9), None)
    out["somc"] = xs[i_rise - 1] if i_rise else None
    base = sum(la[:3]) / 3
    out["basis05"] = _cross(xs, la, base + 0.5)
    out["loglog"] = _loglog(xs, la)
    eq = [v / x for v, x in zip(la, xs)]
    i_eq = min(range(len(eq)), key=lambda i: eq[i])
    out["dickhuth"] = _cross(xs, la, la[i_eq] + 1.5, start=i_eq)
    i_mod = next((i for i in range(1, len(la)) if la[i] - la[i - 1] > 0.4 + 1e-9), None)
    out["moddmax"] = _dmax(xs, la, i_mod - 1) if (ausbelastet and i_mod) else None
    out["dmax"] = _dmax(xs, la, 0) if ausbelastet else None
    out["fix2"] = _cross(xs, la, 2.0)
    out["fix4"] = _cross(xs, la, 4.0)
    return out


def _q(v, p):
    v = sorted(v)
    if not v:
        return None
    k = (len(v) - 1) * p
    a = int(math.floor(k))
    b = min(a + 1, len(v) - 1)
    return v[a] + (v[b] - v[a]) * (k - a)


def simulate(xs, la, ausbelastet, n=N_SIM, seed=SEED, key=""):
    rnd = random.Random(seed + sum((i + 1) * ord(c) for i, c in enumerate(key)))   # je Test eigene, unabhängige Zufallsfolge
    res = {k: [] for k in METHOD_TEXT}
    miss = {k: 0 for k in METHOD_TEXT}
    sims = []
    for _ in range(n):
        lz = [max(0.2, v + rnd.gauss(0, max(0.15, 0.075 * v))) for v in la]
        m = methods(xs, lz, ausbelastet)
        sims.append(m)
        for k, v in m.items():
            (res[k].append(v) if v is not None else None)
            miss[k] += v is None
    return res, miss, sims


def band(vals, n):
    if len(vals) < 0.8 * n:
        return None
    return {"p10": _q(vals, .1), "p90": _q(vals, .9), "p025": _q(vals, .025), "p975": _q(vals, .975)}


def tests_from(D):
    """Stufentests mit Laktat: bestätigte zuerst, sonst Vorschau. Stufen aufsteigend."""
    out = []
    seen = set()
    for t in D.get("lactate") or []:
        if t.get("kind") != "stufentest":
            continue
        xs = [(s.get("w") if t.get("sport") != "lauf" else (3600 / s["pace_s"] if s.get("pace_s") else s.get("kmh"))) for s in t["stages"]]
        out.append({"id": t.get("id") or f"lactate-{t['date']}-{t['sport']}", "datum": t["date"], "sport": t["sport"],
                    "datenstatus": "bestätigt", "stufen": [{"x": x, "la": s.get("la"), "hf_tab": s.get("hr"), "hf": s.get("hr")}
                                                         for x, s in zip(xs, t["stages"])], "aktivitaet": t.get("activity"),
                    "protokoll": t.get("protokoll"), "ausbelastet": bool(t.get("ausbelastet"))})
        seen.add((t["date"], t["sport"]))
    stufen_by_act = {s["id"]: s for s in D.get("stufen", [])}
    for v in D.get("laktat_vorschau") or []:
        if v.get("status") != "vorschau" or v.get("art") != "stufentest" or (v["datum"], v["sport"]) in seen:
            continue
        rows = []
        for z in v["zeilen"]:
            if z.get("x") is None or z.get("la") is None:
                continue
            f = z.get("fit") or {}
            rows.append({"x": z["x"], "la": z["la"], "hf_tab": z.get("hf"), "hf": f.get("hr_vor") if f.get("hr_vor") is not None else z.get("hf"),
                         "hf_quelle": "FIT 30 s vor der Blutentnahme" if f.get("hr_vor") is not None else "Tabelle",
                         "x_fit": f.get("x"), "fit_nr": f.get("nr"), "stufe": z.get("stufe"), "quelle": z.get("quelle")})
        rows.sort(key=lambda r: r["x"])
        st = stufen_by_act.get(v.get("aktivitaet"))
        hints = " ".join(v.get("hinweise") or [])
        aus = "Ausbelastet" in hints
        if v["id"].startswith("labor"):
            prot = "labor-3min-40"
        elif v["sport"] == "lauf":
            prot = "lauf-stufen"
        elif st and st.get("start") == 120 and st.get("schritt") == 20 and st.get("stufe_s") == 300:
            prot = "rad-stufen-120-20-5"
        else:
            prot = "unbekannt"
        out.append({"id": v["id"], "datum": v["datum"], "sport": v["sport"], "datenstatus": "vorschau", "stufen": rows,
                    "aktivitaet": v.get("aktivitaet"), "protokoll": prot, "ausbelastet": aus,
                    "ende": "ausbelastet" if aus else ("submaximal (FATmax)" if v["sport"] == "lauf" else "ohne Ausbelastung bei der letzten Stufe")})
    return sorted(out, key=lambda t: t["datum"])


def rechne(D):
    tests = []
    raw = {}
    for t in tests_from(D):
        st = [s for s in t["stufen"] if s["x"] is not None and s["la"] is not None]
        xs, la = [s["x"] for s in st], [s["la"] for s in st]
        hf = [s.get("hf") for s in st]
        hf_tab = [s.get("hf_tab") for s in st]
        entry = {"test": t["id"], "datum": t["datum"], "sport": t["sport"], "protokoll": t["protokoll"], "datenstatus": t["datenstatus"],
                 "aktivitaet": t.get("aktivitaet"), "ausbelastet": t["ausbelastet"], "ende": t.get("ende"), "n_stufen": len(st),
                 "unit": "km/h" if t["sport"] == "lauf" else "W", "stufen": st, "methoden": {}}
        if len(st) < 4:
            entry["status"] = "zu wenige Stufen"
            tests.append(entry)
            continue
        m = methods(xs, la, t["ausbelastet"])
        sims, miss, all_sims = simulate(xs, la, t["ausbelastet"], key=t["id"])
        raw[t["id"]] = (all_sims, t)
        for k, v in m.items():
            ok = v is not None
            reason = None
            if k in ("moddmax", "dmax") and not t["ausbelastet"]:
                reason = "nicht erfüllt: Test nicht ausbelastet"
            elif k == "loglog" and len(st) < 6:
                reason = "zu wenige Stufen (mindestens 6)"
            elif not ok:
                reason = "Kurve erreicht den Wert in den gemessenen Stufen nicht"
            b = band(sims[k], N_SIM) if ok else None
            entry["methoden"][k] = {
                "x": round(v, 2 if t["sport"] == "lauf" else 1) if ok else None,
                "hf": round(_interp(xs, hf, v), 1) if ok and _interp(xs, hf, v) is not None else None,
                "hf_tab": round(_interp(xs, hf_tab, v), 1) if ok and _interp(xs, hf_tab, v) is not None else None,
                "la": round(_interp(xs, la, v), 2) if ok else None,
                "band80": [round(b["p10"], 2), round(b["p90"], 2)] if b else None,
                "band95": [round(b["p025"], 2), round(b["p975"], 2)] if b else None,
                "rolle": METHOD_TEXT[k][2], "grund": reason,
                "gueltig": ok and reason is None and k not in ORIENT}
        for lt, keys in (("lt1", LT1_METHODS), ("lt2", LT2_METHODS)):
            ok = [k for k in keys if entry["methoden"][k]["gueltig"]]
            if not ok:
                entry[lt] = {"status": "nicht bestimmbar", "methoden": [], "lo": None, "hi": None,
                             "grund": "; ".join(sorted({entry["methoden"][k]["grund"] for k in keys if entry["methoden"][k]["grund"]}))}
                continue
            vals = [entry["methoden"][k]["x"] for k in ok]
            hfs = [entry["methoden"][k]["hf"] for k in ok if entry["methoden"][k]["hf"] is not None]
            stat = "vorläufig"
            why = []
            if t["datenstatus"] != "bestätigt":
                why.append("Laktatwerte noch nicht bestätigt (Vorschau)")
            if lt == "lt2" and not t["ausbelastet"]:
                why.append("nicht ausbelastet: Dmax ungültig")
            if len(ok) == 1:
                why.append("nur eine gültige Methode")
            entry[lt] = {"status": stat, "methoden": ok, "lo": min(vals), "hi": max(vals),
                         "hf_lo": min(hfs) if hfs else None, "hf_hi": max(hfs) if hfs else None, "grund": "; ".join(why)}
        tests.append(entry)
    # Vergleiche: gleiche Sportart und gleiches Protokoll, aufeinanderfolgende Tests
    verg = []
    by = {}
    for e in tests:
        by.setdefault((e["sport"], e["protokoll"]), []).append(e)
    for (sport, prot), lst in by.items():
        for a, b in zip(lst, lst[1:]):
            if a["test"] not in raw or b["test"] not in raw:
                continue
            sa, sb = raw[a["test"]][0], raw[b["test"]][0]
            row = {"sport": sport, "protokoll": prot, "von": a["test"], "bis": b["test"], "methoden": {}}
            for k in METHOD_TEXT:
                ma, mb = a["methoden"].get(k, {}), b["methoden"].get(k, {})
                if ma.get("x") is None or mb.get("x") is None:
                    continue
                d = [y[k] - x[k] for x, y in zip(sa, sb) if x[k] is not None and y[k] is not None]
                bd = band(d, N_SIM)
                row["methoden"][k] = {"diff": round(mb["x"] - ma["x"], 2), "band80": [round(bd["p10"], 1), round(bd["p90"], 1)] if bd else None,
                                      "band95": [round(bd["p025"], 1), round(bd["p975"], 1)] if bd else None,
                                      "gueltig": bool(ma.get("gueltig") and mb.get("gueltig"))}
            verg.append(row)
    return {"v": VERSION, "erstellt": dt.date.today().isoformat(), "simulation": {"n": N_SIM, "seed": SEED, "sd": "max(0,15 mmol/l; 7,5 %)"},
            "methoden": {k: {"name": v[0], "regel": v[1], "rolle": v[2]} for k, v in METHOD_TEXT.items()},
            "tests": tests, "vergleiche": verg}


def main():
    path = sys.argv[1]
    D = json.load(open(path, encoding="utf-8"))
    S = rechne(D)
    for e in S["tests"]:
        print(f"{e['datum']} {e['sport']:4s} {e['protokoll']:20s} {e['datenstatus']:9s} ausbelastet={e['ausbelastet']}")
        for k, m in e["methoden"].items():
            if m["x"] is None:
                print(f"   {k:9s} –        {m['grund']}")
            else:
                print(f"   {k:9s} {m['x']:7.2f} hf {m['hf']} (Tab. {m['hf_tab']})  80% {m['band80']}  {'gültig' if m['gueltig'] else (m['grund'] or m['rolle'])}")
        for lt in ("lt1", "lt2"):
            if lt in e:
                print(f"   {lt.upper()}: {e[lt]['status']} {e[lt].get('lo')}–{e[lt].get('hi')} ({', '.join(e[lt]['methoden'])}) {e[lt]['grund']}")
    for v in S["vergleiche"]:
        print("Vergleich", v["von"], "→", v["bis"])
        for k, m in v["methoden"].items():
            print(f"   {k:9s} {m['diff']:+.1f}  80% {m['band80']}  95% {m['band95']}")
    if "--zeigen" not in sys.argv:
        D["schwellen"] = S
        D.setdefault("versions", {})["schwellen"] = {"v": VERSION, "text": "LT1: SOMC, Basis + 0,5, log-log; LT2: Dickhuth, mod. Dmax und Dmax nur bei Ausbelastung; 2/4 mmol nur Orientierung; Simulation Messfehler max(0,15; 7,5 %)"}
        json.dump(D, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print("gespeichert:", path)


if __name__ == "__main__":
    main()
