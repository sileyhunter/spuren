"""Aktivitäts-Explorer und Auswertungen aus den Sekundenwerten (V5.6).

  python3 -I tools/serien.py data.json --files work/files.json [--nur-fehlende] [--dt 2] [--ohne-reihen]

Je Aktivität mit FIT-Datei:
  * work/serien/<id>.json  – Reihe im Raster von dt Sekunden (serie-1.0): Puls, Leistung, Kadenz, Tempo, Höhe, Strecke,
    Zielleistung (Zwift), Runden mit Workout-Schritt, Schwimmbahnen, Workout-Struktur aus der FIT-Datei.
    Verschlüsselt wird mit `node tools/serien_crypt.mjs` nach serien/<Name>.bin (Name aus serien_salz, nur die Seite entschlüsselt).
  * in data.json NUR neue Felder je Aktivität (bestehende Werte bleiben unberührt):
      ser  {dt, n}                       Reihe vorhanden
      wk   Workout-Abgleich (plan-1.0)  geplant (Schritte aus der FIT-Datei) gegenüber Runden
      fr   Ermüdungsresistenz (ermuedung-1.0)

Regeln (Versionen in VERSIONS, Texte in der Seite unter «Daten & Methode»):
  plan-1.0      Schritte aus FIT workout/workout_step; Runde ↔ Schritt über wkt_step_index. Ziel Leistung: 10-s-Mittel im
                Zielbereich; Tempo und Puls: Sekundenwert. Zielbereich in % FTP wird nicht umgerechnet (bleibt «% FTP»).
  ermuedung-1.0 Rad ≥ 2 h: gleichmässige 10-min-Blöcke (Ø 150–300 W, 30-s-CV ≤ 10 %, kein 30-s-Mittel < 75 %, ≤ 3 % ohne Treten,
                Puls ≥ 95 %) ab Minute 10, nicht überlappend, mit Startminute; beste 20-min-Leistung ab 0/2/3/4/5 h.
                Laufen ≥ 60 min: 10-min-Blöcke mit gleichmässigem Tempo (30-s-CV ≤ 8 %), Steigung |≤ 2 %|, mit Startminute.
"""
import gzip
import json
import math
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitlib  # noqa: E402
import series  # noqa: E402

VERSIONS = {"serie": "serie-1.0", "plan": "plan-1.0", "ermuedung": "ermuedung-1.0"}
DUR_TYPE = {0: "zeit", 1: "distanz", 2: "puls_unter", 3: "puls_ueber", 4: "kalorien", 5: "offen", 6: "wiederholen"}
TGT_TYPE = {0: "tempo", 1: "puls", 2: "offen", 3: "kadenz", 4: "leistung", 7: "leistung", 8: "leistung", 9: "leistung", 10: "leistung",
            12: "tempo", 13: "puls"}
STEP_INT = {0: "aktiv", 1: "pause", 2: "einlaufen", 3: "auslaufen", 4: "erholung", 5: "intervall", 6: "anderes"}


def _mean(v):
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else None


# ---------------------------------------------------------------- Raster (serie-1.0)
def raster(S, dt=2, gap_s=30):
    """Mittelwerte je dt Sekunden; Lücken ab gap_s trennen Abschnitte (seg), kürzere bleiben als null im Raster."""
    if not S.ts:
        return None
    t0 = int(S.ts[0])
    bins = {}
    for i, t in enumerate(S.ts):
        b = int((t - t0) // dt)
        a = bins.get(b)
        if a is None:
            a = bins[b] = {"hr": [], "w": [], "cad": [], "v": [], "tw": [], "alt": None, "d": None}
        for k, arr in (("hr", S.hr), ("w", S.pw), ("cad", S.cad), ("v", S.spd), ("tw", S.target)):
            x = arr[i] if i < len(arr) else None
            if x is not None:
                a[k].append(x)
        if i < len(S.alt) and S.alt[i] is not None:
            a["alt"] = S.alt[i]
        if i < len(S.dist) and S.dist[i] is not None:
            a["d"] = S.dist[i]
    keys = sorted(bins)
    seg, cur = [], None
    for b in keys:
        if cur is None or b - (cur[0] + cur[1] - 1) > gap_s // dt:
            cur = [b, 1]
            seg.append(cur)
        else:
            cur[1] = b - cur[0] + 1
    out = {"hr": [], "w": [], "cad": [], "v": [], "tw": [], "alt": [], "d": []}
    for b0, n in seg:
        for b in range(b0, b0 + n):
            a = bins.get(b)
            m = (lambda k: _mean(a[k]) if a else None)
            hr, w, cad, v, tw = m("hr"), m("w"), m("cad"), m("v"), m("tw")
            out["hr"].append(round(hr) if hr is not None else None)
            out["w"].append(round(w) if w is not None else None)
            out["cad"].append(round(cad) if cad is not None else None)
            out["v"].append(round(v * 100) if v is not None else None)
            out["tw"].append(round(tw) if tw is not None else None)
            out["alt"].append(round(a["alt"] * 10) if a and a["alt"] is not None else None)
            out["d"].append(round(a["d"]) if a and a["d"] is not None else None)
    # Formatversion unter "ver": "v" ist der Tempokanal (cm/s); die Seite liest nur Listen als Kanäle.
    res = {"ver": VERSIONS["serie"], "dt": dt, "t0": t0, "seg": seg}
    for k, arr in out.items():
        if any(x is not None for x in arr):
            res[k] = arr
    return res


# ---------------------------------------------------------------- Workout aus der FIT-Datei (plan-1.0)
def workout_fit(data):
    """Workout-Name, Schritte und Runden mit wkt_step_index aus einer FIT-Datei (falls auf der Uhr/Zwift ausgeführt)."""
    return _workout_aus(fitlib.messages(data, {26: {4, 6, 8}, 27: None, 19: {253, 2, 7, 8, 71, 254}, 7: {1, 3}}))


def workout_garmin(path):
    """Dasselbe aus der gespeicherten Antwort von get_activity_fit_messages (Nacht-Update): Felder über definition_number und
    raw_value, also dieselben Rohwerte wie in der FIT-Datei – danach gleicher Weg wie beim Monatsexport."""
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None
    msgs = []
    for msg in d.get("messages", []) if isinstance(d, dict) else []:
        g = msg.get("global_message_number")
        if g in (7, 19, 26, 27):
            msgs.append((g, {f["definition_number"]: f.get("raw_value") for f in msg.get("fields", []) if f.get("definition_number") is not None}))
    return _workout_aus(msgs)


def _workout_aus(nachrichten):
    name, steps, laps, geraet = None, [], [], {}
    for g, m in nachrichten:
        if g == 7:
            if m.get(3):
                geraet["ftp"] = m.get(3)
            if m.get(1):
                geraet["hfmax"] = m.get(1)
        elif g == 26 and name is None:
            name = m.get(8)
        elif g == 27:
            steps.append(m)
        elif g == 19:
            laps.append(m)
    if not steps:
        return None
    steps.sort(key=lambda m: m.get(254) if m.get(254) is not None else 0)
    out = []
    for m in steps:
        dtp, dv, ttp = m.get(1), m.get(2), m.get(3)
        tv, lo, hi = m.get(4), m.get(5), m.get(6)
        st = {"i": m.get(254), "name": m.get(0) or None, "typ": STEP_INT.get(m.get(7), "aktiv"), "dauer": DUR_TYPE.get(dtp, str(dtp))}
        if dtp == 0 and dv:
            st["s"] = dv / 1000.0
        elif dtp == 1 and dv:
            st["m"] = dv / 100.0
        elif dtp == 6:
            st["ab"], st["mal"] = dv, tv
        kind = TGT_TYPE.get(ttp)
        if dtp != 6 and kind and kind != "offen":
            st["ziel"] = kind
            if lo or hi:
                if kind == "leistung":
                    st["lo"], st["hi"] = [(x - 1000 if x and x > 1000 else x) for x in (lo, hi)]
                    # FIT-Norm: > 1000 = Watt + 1000, sonst % FTP. Enduco schreibt Watt ohne Versatz → in abgleich() entschieden
                    st["einheit"] = "W" if (lo or 0) > 1000 or (hi or 0) > 1000 else "W?"
                elif kind == "puls":
                    st["lo"], st["hi"] = [(x - 100 if x and x > 100 else x) for x in (lo, hi)]
                    st["einheit"] = "bpm" if (lo or 0) > 100 or (hi or 0) > 100 else "% HFmax"
                elif kind == "tempo":
                    st["lo"], st["hi"], st["einheit"] = (lo or 0) / 1000.0, (hi or 0) / 1000.0, "m/s"
                else:
                    st["lo"], st["hi"], st["einheit"] = lo, hi, "rpm"
                if st.get("lo") is not None and st.get("hi") is not None and st["lo"] > st["hi"]:
                    st["lo"], st["hi"] = st["hi"], st["lo"]
                # % FTP bzw. % HFmax mit dem Wert, den das Gerät beim Ausführen verwendet hat (zones_target derselben Datei)
                ref = geraet.get("hfmax") if st.get("einheit") == "% HFmax" else None
                if ref and st.get("lo") is not None and st.get("hi") is not None:
                    st["pct"] = [st["lo"], st["hi"]]
                    st["lo"], st["hi"] = round(st["lo"] * ref / 100), round(st["hi"] * ref / 100)
                    st["einheit"] = "bpm"
                    st["bezug"] = f"{st['pct'][0]}–{st['pct'][1]} % von {ref} bpm (HFmax auf dem Gerät)"
            elif tv:
                st["zone"] = tv
        out.append(st)
    return {"name": name, "steps": out, "laps": [_runde(m) for m in laps], "geraet": geraet}


def _runde(m):
    """Runde → (Start, Ende, Timer ms, Workout-Schritt) in FIT-Sekunden. Manche Uhren schreiben in jede Runde als Zeitstempel (253)
    den Start der Aktivität; dann gilt Ende = Start + verstrichene Zeit (7), sonst + Timer (8). Kein Ende ohne Angaben."""
    st, end, el, tm = m.get(2), m.get(253), m.get(7), m.get(8)
    if st is not None and (end is None or end <= st):
        dur = el or tm
        end = st + round(dur / 1000.0) if dur else None
    return (st, end, tm, m.get(71))


def _roll(arr, k):
    """Gleitendes Mittel über k Sekunden (None bleibt None, Lücken werden nicht gefüllt)."""
    out, s, q = [], 0.0, []
    for x in arr:
        if x is None:
            out.append(None)
            s, q = 0.0, []
            continue
        q.append(x)
        s += x
        if len(q) > k:
            s -= q.pop(0)
        out.append(s / len(q) if len(q) == k else None)
    return out


def _einheit_leistung(W, S):
    """Leistungsziele ≤ 1000 sind laut FIT-Norm % FTP; Enduco schreibt dort Watt. Für das ganze Workout die Lesart wählen,
    deren Zielmitte näher an der gefahrenen Leistung je Schritt liegt (log-Abstand), und offen ausweisen."""
    steps = {s["i"]: s for s in W["steps"] if s.get("i") is not None}
    amb = [s for s in steps.values() if s.get("einheit") == "W?" and s.get("lo") is not None and s.get("hi")]
    if not amb:
        return
    ftp = (W.get("geraet") or {}).get("ftp")
    sc_w = sc_p = 0.0
    n = 0
    for st_fit, end_fit, timer_ms, idx in W["laps"]:
        st = steps.get(idx)
        if not st or st.get("einheit") != "W?" or st_fit is None:
            continue
        a = st_fit + fitlib.FIT_EPOCH
        b = (end_fit + fitlib.FIT_EPOCH) if end_fit is not None else a + (timer_ms or 0) / 1000.0
        xs = [S.pw[i] for i, t in enumerate(S.ts) if a <= t < b and S.pw[i]]
        if not xs:
            continue
        m, mid = sum(xs) / len(xs), (st["lo"] + st["hi"]) / 2
        if mid > 0:
            sc_w += abs(math.log(m / mid))
            sc_p += abs(math.log(m / (mid * ftp / 100))) if ftp else 99
            n += 1
    watt = (sc_w <= sc_p) if n else not ftp
    for st in amb:
        if watt:
            st["einheit"], st["bezug"] = "W", "als Watt gelesen (passt zur gefahrenen Leistung; FIT-Norm wäre % FTP)"
        else:
            st["pct"] = [st["lo"], st["hi"]]
            st["lo"], st["hi"], st["einheit"] = round(st["lo"] * ftp / 100), round(st["hi"] * ftp / 100), "W"
            st["bezug"] = f"{st['pct'][0]}–{st['pct'][1]} % von {ftp} W (FTP auf dem Gerät)"


def plan_gesamt(steps):
    """Geplante Gesamtdauer: Schritte in Reihenfolge, Wiederholungen ausgeschrieben. Nur wenn jeder Schritt eine Zeit hat –
    sonst (Schritte nach Distanz oder «bis Taste») ist die Plandauer unbekannt (None), nie eine Teilsumme."""
    seq = _ausgeschrieben(steps)
    s = [x.get("s") for x in seq]
    return round(sum(s)) if seq and all(isinstance(x, (int, float)) and x > 0 for x in s) else None


def plan_distanz(steps):
    """Geplante Distanz der Schritte nach Distanz (z. B. Schwimmen), Wiederholungen ausgeschrieben; None ohne solche Schritte."""
    m = [x.get("m") for x in _ausgeschrieben(steps) if x.get("m")]
    return round(sum(m)) if m else None


def _ausgeschrieben(steps):
    seq, i, guard = [], 0, 0
    rep = {}
    while i < len(steps) and guard < 10000:
        guard += 1
        st = steps[i]
        if st.get("dauer") == "wiederholen":              # Steuerschritt: springt zurück, ist selbst kein Abschnitt
            if st.get("ab") is not None and st.get("mal"):
                done = rep.get(i, 1)
                if done < st["mal"]:
                    rep[i] = done + 1
                    j = next((k for k, x in enumerate(steps) if x.get("i") == st["ab"]), None)
                    if j is not None and j < i:
                        i = j
                        continue
            i += 1
            continue
        seq.append(st)
        i += 1
    return seq


def abgleich(S, W):
    """plan-1.0: je Workout-Schritt (aufeinanderfolgende Runden mit gleichem Schritt zusammengefasst) Ist gegenüber Plan."""
    if not W or not W["laps"]:
        return None
    _einheit_leistung(W, S)
    steps = {s["i"]: s for s in W["steps"] if s.get("i") is not None}
    ts, pw10, spd, hr = S.ts, _roll(S.pw, 10), S.spd, S.hr
    groups = []
    for st_fit, end_fit, timer_ms, idx in W["laps"]:
        if idx not in steps or st_fit is None:
            continue
        a = st_fit + fitlib.FIT_EPOCH
        b = (end_fit + fitlib.FIT_EPOCH) if end_fit is not None else a + (timer_ms or 0) / 1000.0
        if groups and groups[-1]["i"] == idx:
            groups[-1]["win"].append((a, b))
            groups[-1]["timer"] += (timer_ms or 0) / 1000.0
        else:
            groups.append({"i": idx, "win": [(a, b)], "timer": (timer_ms or 0) / 1000.0})
    rows, tin_sum, tin_n = [], 0.0, 0
    for g in groups:
        st = steps[g["i"]]
        sel = [k for k, t in enumerate(ts) if any(a <= t < b for a, b in g["win"])]
        if not sel:
            continue
        val = {"leistung": pw10, "tempo": spd, "puls": hr}.get(st.get("ziel"))
        hrm, pwm, vm = _mean([hr[k] for k in sel]), _mean([S.pw[k] for k in sel]), _mean([spd[k] for k in sel])
        row = {"i": g["i"], "typ": st["typ"], "plan_s": st.get("s"), "plan_m": st.get("m"), "ist_s": round(g["timer"]) or len(sel),
               "hr": round(hrm) if hrm is not None else None, "w": round(pwm) if pwm is not None else None, "v": round(vm, 2) if vm is not None else None}
        if st.get("ziel") and st.get("lo") is not None and val is not None and st.get("einheit") in ("W", "m/s", "bpm"):
            xs = [val[k] for k in sel if val[k] is not None]
            if xs:
                inside = sum(1 for x in xs if st["lo"] <= x <= st["hi"]) / len(xs)
                row.update({"ziel": st["ziel"], "lo": st["lo"], "hi": st["hi"], "einheit": st["einheit"], "im_ziel": round(100 * inside)})
                if st.get("bezug"):
                    row["bezug"] = st["bezug"]
                if st["typ"] in ("intervall", "aktiv"):
                    tin_sum += inside * len(xs)
                    tin_n += len(xs)
        elif st.get("ziel"):
            row.update({"ziel": st["ziel"], "einheit": st.get("einheit") or ("Zone %s" % st.get("zone") if st.get("zone") else None)})
        rows.append(row)
    if not rows:
        return None
    return {"v": VERSIONS["plan"], "name": W["name"], "quelle": "FIT-Datei (Workout auf dem Gerät)", "schritte": rows,
            "plan_s": plan_gesamt(W["steps"]), "plan_m": plan_distanz(W["steps"]), "ist_s": sum(r["ist_s"] for r in rows),
            "im_ziel": round(100 * tin_sum / tin_n) if tin_n else None, "n_ziel_s": tin_n}


# ---------------------------------------------------------------- Ermüdungsresistenz (ermuedung-1.0)
def _cv(x):
    m = sum(x) / len(x)
    return (math.sqrt(sum((v - m) ** 2 for v in x) / len(x)) / m) if m else 9


def bloecke_rad(S, wmin=150, wmax=300):
    """Gleichmässige 10-min-Blöcke ab Minute 10, nicht überlappend, mit Startminute."""
    ts, pw, hr = S.ts, S.pw, S.hr
    if len(ts) < 1800:
        return []
    t0, out, i, n = ts[0], [], 0, len(ts)
    while i < n and ts[i] - t0 < 600:
        i += 1
    while i < n:
        j = i
        while j < n and ts[j] - ts[i] < 600:
            j += 1
        if j >= n or ts[j - 1] - ts[i] < 590 or (j - i) < 570:
            i += 30
            continue
        w = [pw[k] if pw[k] is not None else 0 for k in range(i, j)]
        h = [hr[k] for k in range(i, j) if hr[k] is not None]
        m30 = [sum(w[k:k + 30]) / 30 for k in range(0, len(w) - 29, 30)]
        mw = sum(w) / len(w)
        ok = (wmin <= mw <= wmax and len(h) >= 0.95 * len(w) and m30 and _cv(m30) <= 0.10 and min(m30) >= 0.75 * mw
              and sum(1 for x in w if x == 0) <= 0.03 * len(w))
        if ok:
            out.append([round((ts[i] - t0) / 60), round(mw), round(sum(h) / len(h), 1)])
            i = j
        else:
            i += 30
    return out


def best20(S, ab_s):
    ts, pw = S.ts, S.pw
    if not ts:
        return None
    t0 = ts[0]
    w = [(pw[k] if pw[k] is not None else 0) for k in range(len(ts)) if ts[k] - t0 >= ab_s]
    if len(w) < 1200:
        return None
    s = sum(w[:1200])
    best = s
    for k in range(1200, len(w)):
        s += w[k] - w[k - 1200]
        best = max(best, s)
    return round(best / 1200)


def bloecke_lauf(S):
    ts, sp, hr, alt, dist = S.ts, S.spd, S.hr, S.alt, S.dist
    if len(ts) < 1800:
        return []
    t0, out, i, n = ts[0], [], 0, len(ts)
    while i < n and ts[i] - t0 < 600:
        i += 1
    while i < n:
        j = i
        while j < n and ts[j] - ts[i] < 600:
            j += 1
        if j >= n or (j - i) < 570:
            i += 30
            continue
        v = [sp[k] for k in range(i, j) if sp[k] is not None and sp[k] > 0.5]
        h = [hr[k] for k in range(i, j) if hr[k] is not None]
        if len(v) < 0.95 * (j - i) or len(h) < 0.95 * (j - i):
            i += 30
            continue
        m30 = [sum(v[k:k + 30]) / 30 for k in range(0, len(v) - 29, 30)]
        d0, d1 = dist[i], dist[j - 1]
        a0, a1 = alt[i], alt[j - 1]
        steig = ((a1 - a0) / (d1 - d0)) if None not in (a0, a1, d0, d1) and d1 - d0 > 100 else None
        if m30 and _cv(m30) <= 0.08 and steig is not None and abs(steig) <= 0.02:
            mv = sum(v) / len(v)
            out.append([round((ts[i] - t0) / 60), round(1000 / mv), round(sum(h) / len(h), 1)])
            i = j
        else:
            i += 30
    return out


def ermuedung(S, sport, moving_s):
    if sport == "rad" and moving_s >= 7200 and any(x for x in S.pw if x):
        b = bloecke_rad(S)
        p20 = [best20(S, h * 3600) for h in (0, 2, 3, 4, 5)]
        if b or any(p20):
            return {"v": VERSIONS["ermuedung"], "bl": b, "p20": p20}
    if sport == "lauf" and moving_s >= 3600:
        b = bloecke_lauf(S)
        if b:
            return {"v": VERSIONS["ermuedung"], "bl": b}
    return None


# ---------------------------------------------------------------- je Datei
def reihe_schreiben(S, W, aid, sport, out_dir, dt=2):
    """Reihe mit Runden (und Workout-Schritt), Bahnen und Workout-Struktur nach out_dir/<aid>.json; gibt {dt, n} zurück."""
    R = raster(S, dt)
    if not R:
        return None
    R["id"], R["sport"] = aid, sport
    tl0 = int(S.ts[0]) if S.ts else 0
    R["laps"] = [[round(l["start"] - tl0), round(l["start"] - tl0 + (l.get("elapsed") or 0)), l.get("intensity")] for l in S.laps]
    if S.lengths:
        R["len"] = [[round(l["start"] - tl0), round(l.get("timer") or 0, 1), 1 if l.get("active") else 0] for l in S.lengths]
    if W:
        idx = {}
        for st_fit, end_fit, timer_ms, si in W["laps"]:
            if st_fit is not None:
                idx[round(st_fit + fitlib.FIT_EPOCH - tl0)] = si
        for L in R["laps"]:
            L.append(idx.get(L[0]))
        R["wkt"] = {"name": W["name"], "steps": W["steps"]}
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, aid + ".json"), "w", encoding="utf-8") as f:
        json.dump(R, f, separators=(",", ":"))
    return {"dt": dt, "n": sum(x[1] for x in R["seg"])}



def bearbeite(job):
    aid, sport, t0, path, mv, dt, mit_reihe, out_dir = job
    try:
        data = open(path, "rb").read()
        sess = [S for S in series.from_fit(data) if sport in ("andere",) or S.category == sport or sport == "ski"]
        if not sess:
            sess = list(series.from_fit(data))
        if not sess:
            return aid, None, "keine Session"
        if t0 and len(sess) > 1:
            sess.sort(key=lambda S: abs(int(S.start) - t0))
        S = sess[0]
        res = {}
        W = workout_fit(data)
        wk = abgleich(S, W)
        if mit_reihe:
            ser = reihe_schreiben(S, W, aid, sport, out_dir, dt)
            if ser:
                res["ser"] = ser
        if wk:
            res["wk"] = wk
        fr = ermuedung(S, sport, mv or 0)
        if fr:
            res["fr"] = fr
        return aid, res, None
    except Exception as e:  # noqa: BLE001
        return aid, None, f"{type(e).__name__}: {e}"


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    files_path = argv[argv.index("--files") + 1] if "--files" in argv else "work/files.json"
    dt = int(argv[argv.index("--dt") + 1]) if "--dt" in argv else 2
    only_missing, mit_reihe = "--nur-fehlende" in argv, "--ohne-reihen" not in argv
    out_dir = "work/serien"
    os.makedirs(out_dir, exist_ok=True)
    D = json.load(open(argv[1], encoding="utf-8"))
    idx = {os.path.basename(f["path"]).rsplit("_", 1)[-1].split(".")[0]: f["path"] for f in json.load(open(files_path, encoding="utf-8"))}
    jobs, ohne = [], 0
    for a in D["activities"]:
        if only_missing and "ser" in a:
            continue
        p = idx.get(a["id"] if a["id"].startswith("zwift-") else a["id"].split("-")[0])
        if not p:
            ohne += 1
            continue
        jobs.append((a["id"], a.get("sport"), a.get("t0"), p, a.get("mv") or a.get("dur"), dt, mit_reihe, out_dir))
    by = {a["id"]: a for a in D["activities"]}
    n = {"ser": 0, "wk": 0, "fr": 0, "fehler": 0, "ohne_datei": ohne}
    fehler = []
    with Pool(max(1, (os.cpu_count() or 2))) as pool:
        for aid, res, err in pool.imap_unordered(bearbeite, jobs, chunksize=4):
            a = by[aid]
            if err:
                n["fehler"] += 1
                fehler.append(f"{aid}: {err}")
                continue
            for k in ("ser", "wk", "fr"):          # nur diese neuen Felder; alles andere bleibt unverändert
                if res and k in res:
                    a[k] = res[k]
                    n[k] += 1
                elif not only_missing and (k != "ser" or mit_reihe):   # --ohne-reihen lässt bestehende Reihen stehen
                    a.pop(k, None)
    D.setdefault("versions", {}).update({k: v for k, v in VERSIONS.items()})
    json.dump(D, open(argv[1], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("serien:", n)
    for f in fehler[:10]:
        print("  Fehler", f)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
