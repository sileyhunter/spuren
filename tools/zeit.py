"""Zeitbegriffe je Aktivität (Umsetzungsplan A3), Version zeit-1.0.

Gesamtzeit     Start bis Ende (Session)
Timer-Zeit     Zeit, in der die Uhr lief (Session)
Uhr gestoppt   Gesamtzeit minus Timer-Zeit (Auto-Pause, Stopptaste, Zwift-Pause)
Stopp          Stillstand innerhalb der Timer-Zeit, ab einer Mindestdauer je Sportart
Unterbrechung  Stopp ab 5 Minuten ausserhalb geplanter Erholung (Kaffee, Ansitz, Gipfel)
Bewegungszeit  Timer-Zeit ohne Stopps (geplante Erholung bleibt drin)
Geplante Erholung  Runden mit Intensität «rest»/«recovery»; Schwimmen: Ruhebahnen (Satzpausen) unter 5 Minuten
Aktive Belastungszeit  Bewegungszeit ohne geplante Erholung

Regeln je Sportart (still = kein Fortschritt in dieser Sekunde):
  Rad draussen      still unter 2 km/h; Stopp ab 2 min. Rollen ohne Treten bleibt Bewegung.
  Rad auf der Rolle still ohne Leistung und ohne Trittfrequenz; jede solche Sekunde zählt nicht als Bewegung,
                    als Stopp gemeldet ab 2 min.
  Laufen            still unter 1 m/s; Stopp ab 1 min.
  Wandern, Skitour  still, wenn in 60 s weniger als 12 m Strecke und weniger als 3 m Höhe; Stopp ab 3 min.
  Schwimmen Becken  aktive Bahnen = Schwimmzeit, Ruhebahnen = Satzpausen (ab 5 min Unterbrechung).
  Freiwasser        still unter 0,2 m/s; Stopp ab 1 min.
  Ski, Langlauf     still unter 0,5 m/s; Stopp ab 2 min.
  Kraft, übrige     keine Bewegungsregel: Bewegungszeit = Timer-Zeit.
"""
VERSION = "zeit-1.0"
UNTERBRECHUNG_S = 300
RULES = {
    "rad": {"min_stop": 120, "v": 2 / 3.6},
    "rad_indoor": {"min_stop": 120},
    "lauf": {"min_stop": 60, "v": 1.0},
    "wandern": {"min_stop": 180, "win": 60, "h": 12.0, "z": 3.0},
    "schwimm_ow": {"min_stop": 60, "v": 0.2},
    "ski": {"min_stop": 120, "v": 0.5},
}
GAP_MAX = 10          # Lücken bis 10 s zwischen Datensätzen gelten als durchgehend (Smart Recording)


def rule_key(S):
    c = S.category
    if c == "rad":
        return "rad_indoor" if S.indoor else "rad"
    if c == "lauf":
        return "lauf"
    if c == "wandern" or (S.sport == 13 and S.sub == 37):
        return "wandern"
    if c == "schwimm":
        return "schwimm_pool" if S.sub == 17 else "schwimm_ow"
    if c == "ski":
        return "ski"
    return None


def _covered(S):
    """Sekundenanteile je Datensatz. 1-s-Aufzeichnung: jeder Datensatz = 1 s (Lücken = Uhr gestoppt).
    Smart Recording (seltene Punkte): Datensatz i deckt die Zeit bis zum nächsten ab, höchstens GAP_MAX."""
    ts, n = S.ts, len(S.ts)
    w = [1.0] * n
    if n > 2:
        d = sorted(ts[i + 1] - ts[i] for i in range(n - 1))
        if d[len(d) // 2] <= 1:
            return w
    for i in range(n - 1):
        d = ts[i + 1] - ts[i]
        w[i] = float(d) if 0 < d <= GAP_MAX else 1.0
    return w


def _still_flags(S, key):
    n = len(S.ts)
    if key == "rad_indoor":
        return [not ((S.pw[i] or 0) > 0 or (S.cad[i] or 0) > 0) for i in range(n)]
    if key in ("rad", "lauf", "schwimm_ow", "ski"):
        v = RULES[key]["v"]
        out = []
        for i in range(n):
            sp = S.spd[i]
            out.append(sp is not None and sp < v)
        return out
    if key == "wandern":
        r = RULES[key]
        half = r["win"] // 2
        ts, dist, alt = S.ts, S.dist, S.alt
        out = [False] * n
        j0 = j1 = 0
        for i in range(n):                         # Fenster ±30 s um jede Sekunde
            t = ts[i]
            while ts[j0] < t - half:
                j0 += 1
            if j1 < i:
                j1 = i
            while j1 + 1 < n and ts[j1 + 1] <= t + half:
                j1 += 1
            d0, d1, a0, a1 = dist[j0], dist[j1], alt[j0], alt[j1]
            span = max(1, ts[j1] - ts[j0])
            if d0 is None or d1 is None:
                continue
            dh = (d1 - d0) * r["win"] / span
            dz = abs((a1 - a0) * r["win"] / span) if a0 is not None and a1 is not None else 0.0
            out[i] = dh < r["h"] and dz < r["z"]
        return out
    return [False] * n


def _planned_rest(S):
    """Zeitfenster (Unix) mit geplanter Erholung aus den Runden."""
    win = []
    for lp in S.laps:
        if lp.get("intensity") in ("rest", "recovery") and lp.get("start") is not None:
            win.append((lp["start"], lp["start"] + (lp.get("elapsed") or lp.get("timer") or 0)))
    return win


def zeit(S):
    """Zeitbegriffe einer Session. Alle Werte in Sekunden (ganzzahlig)."""
    el, timer = float(S.elapsed or 0), float(S.timer or 0)
    out = {"v": VERSION, "el": round(el), "timer": round(timer), "uhr_stop": max(0, round(el - timer))}
    key = rule_key(S)
    out["regel"] = key or "keine"
    stops, rec = [], 0.0
    if key == "schwimm_pool" and S.lengths:
        lens = [L for L in S.lengths if 0 < L["timer"] <= min(timer, 7200)]   # defekte Bahnen (z. B. 131072 s) weglassen
        act = sum(L["timer"] for L in lens if L["active"])
        for L in lens:
            if not L["active"]:
                if L["timer"] >= UNTERBRECHUNG_S:
                    stops.append((L["start"], L["timer"]))
                else:
                    rec += L["timer"]
        stop = min(timer, sum(d for _, d in stops))
        out.update({"mov": round(max(0.0, timer - stop)), "stop": round(stop), "nstop": len(stops), "unt": round(stop),
                    "nunt": len(stops), "rec": round(rec), "act": round(act),
                    "stops": [[int(s), round(d)] for s, d in stops]})
        return out
    if key is None or len(S.ts) < 2:
        out.update({"mov": round(timer), "stop": 0, "nstop": 0, "unt": 0, "nunt": 0, "rec": 0, "act": round(timer), "stops": []})
        return out
    w = _covered(S)
    still = _still_flags(S, key)
    rest = _planned_rest(S)

    def in_rest(t):
        return any(a <= t < b for a, b in rest)

    # Stillstand-Läufe
    runs, i, n = [], 0, len(S.ts)
    while i < n:
        if not still[i]:
            i += 1
            continue
        j = i
        dur = 0.0
        while j < n and still[j]:
            dur += w[j]
            if j + 1 < n and S.ts[j + 1] - S.ts[j] > GAP_MAX:   # Uhr gestoppt: Lauf endet
                j += 1
                break
            j += 1
        runs.append((S.ts[i], dur, i, j))
        i = j
    min_stop = RULES[key]["min_stop"]
    excluded = 0.0                                  # zählt nicht als Bewegung
    unt = 0.0
    nunt = 0
    for t0, dur, a, b in runs:
        planned = in_rest(t0)
        if key == "rad_indoor":
            if not planned:
                excluded += dur                     # Rolle: jede Sekunde ohne Treten fällt weg
            if dur >= min_stop and not planned:
                stops.append((t0, dur))
        elif dur >= min_stop and not planned:
            excluded += dur
            stops.append((t0, dur))
        if dur >= UNTERBRECHUNG_S and not planned:
            unt += dur
            nunt += 1
    for a, b in rest:
        rec += sum(w[k] for k in range(n) if a <= S.ts[k] < b)
    mov = max(0.0, timer - excluded)
    out.update({"mov": round(mov), "stop": round(excluded), "nstop": len(stops), "unt": round(unt), "nunt": nunt,
                "rec": round(rec), "act": round(max(0.0, mov - rec)),
                "stops": [[int(s), round(d)] for s, d in stops]})
    return out
