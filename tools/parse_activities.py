"""Pass 2: Aktivitäten auslesen und für die Seite aufbereiten."""
import datetime as dt
import itertools
import json
import math
import operator
import os
import sys
import zoneinfo
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitlib  # noqa: E402
import kennzahlen  # noqa: E402
import series  # noqa: E402

WANT = {
    0: {1, 2, 4},
    18: {253, 254, 2, 5, 6, 7, 8, 9, 11, 14, 16, 17, 20, 22, 34, 35, 36, 45, 65, 110, 124},
    20: {253, 0, 1, 3, 7},
    216: {0, 1, 2, 6, 11, 12, 13, 15},
    34: {253, 5},
}
SC = 180.0 / 2 ** 31
ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
PDC_D = [5, 15, 30, 60, 300, 600, 1200, 3600, 7200]
INDOOR_SUB = {1, 6, 17, 45, 58}            # Laufband, Indoor-Rad, Becken, Indoor-Lauf, virtuell
NO_GPS_SPORT = {4, 10}                     # Fitnessgeräte, Training/Kraft

SUB_LABEL = {
    (2, 7): "Rennrad", (2, 8): "Mountainbike", (2, 46): "Gravel", (2, 6): "Indoor-Rad", (2, 58): "Virtuelles Rad",
    (2, 0): "Rad", (2, 48): "Pendeln", (1, 0): "Laufen", (1, 3): "Trail Run", (1, 1): "Laufband", (1, 4): "Bahn",
    (1, 45): "Indoor-Lauf", (5, 17): "Schwimmbad", (5, 18): "Freiwasser", (5, 0): "Schwimmen",
    (17, 0): "Wandern", (11, 0): "Gehen", (16, 0): "Bergsteigen", (35, 0): "Schneeschuh",
    (13, 37): "Skitour", (13, 38): "Ski alpin", (13, 0): "Ski alpin", (12, 42): "Langlauf Skating", (12, 0): "Langlauf",
    (14, 0): "Snowboard", (10, 20): "Krafttraining", (10, 0): "Training", (18, 0): "Multisport",
}
SPORT_LABEL = {2: "Rad", 1: "Laufen", 5: "Schwimmen", 17: "Wandern", 11: "Gehen", 13: "Ski", 12: "Langlauf",
               10: "Training", 4: "Fitnessgerät", 15: "Rudern", 19: "Paddeln", 37: "SUP", 41: "Kajak", 42: "Rafting",
               82: "Schnorcheln", 0: "Aktivität", 31: "Klettern", 21: "E-Bike", 16: "Bergsteigen", 35: "Schneeschuh"}


def category(sport, sub):
    if sport == 2:
        return "rad"
    if sport == 1:
        return "lauf"
    if sport == 5:
        return "schwimm"
    if sport in (17, 11, 16, 35):
        return "wandern"
    if sport in (13, 12, 14):
        return "ski"
    return "andere"


def label(sport, sub, prof, manu):
    if manu == 260:
        return "Zwift"
    if prof:
        p = prof.replace("​", "").strip()
        if p.isupper():
            p = p.capitalize()
        return p
    return SUB_LABEL.get((sport, sub)) or SUB_LABEL.get((sport, 0)) or SPORT_LABEL.get(sport, "Aktivität")


def encode_poly(pts):
    out = []
    plat = plon = 0
    for lon, lat in pts:
        ilat, ilon = int(round(lat * 1e5)), int(round(lon * 1e5))
        for v in (ilat - plat, ilon - plon):
            v = ~(v << 1) if v < 0 else (v << 1)
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1F)) + 63))
                v >>= 5
            out.append(chr(v + 63))
        plat, plon = ilat, ilon
    return "".join(out)


def simplify(pts, tol=5.0):
    """Douglas-Peucker in Metern (lokale Projektion)."""
    if len(pts) < 3:
        return pts
    lat0 = pts[0][1]
    kx = 111320.0 * math.cos(math.radians(lat0))
    ky = 110574.0
    xy = [(p[0] * kx, p[1] * ky) for p in pts]
    # erst grob ausdünnen: Punkte < 2 m auseinander weglassen
    keep_idx = [0]
    lx, ly = xy[0]
    for i in range(1, len(xy) - 1):
        x, y = xy[i]
        if (x - lx) ** 2 + (y - ly) ** 2 >= 4.0:
            keep_idx.append(i)
            lx, ly = x, y
    keep_idx.append(len(xy) - 1)
    xy = [xy[i] for i in keep_idx]
    src = [pts[i] for i in keep_idx]
    n = len(xy)
    keep = bytearray(n)
    keep[0] = keep[-1] = 1
    stack = [(0, n - 1)]
    tol2 = tol * tol
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = xy[a]
        bx, by = xy[b]
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = xy[i]
            if L2 == 0:
                d2 = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = ((px - ax) * dx + (py - ay) * dy) / L2
                t = 0.0 if t < 0 else 1.0 if t > 1 else t
                qx, qy = ax + t * dx - px, ay + t * dy - py
                d2 = qx * qx + qy * qy
            if d2 > best:
                best, bi = d2, i
        if best > tol2:
            keep[bi] = 1
            stack.append((a, bi))
            stack.append((bi, b))
    return [src[i] for i in range(n) if keep[i]]


def zones5(arr):
    if not arr:
        return None
    a = [(v or 0) / 1000.0 for v in arr]
    if len(a) >= 7:
        z = [a[0] + a[1], a[2], a[3], a[4], sum(a[5:])]
    elif len(a) == 6:
        z = [a[0] + a[1], a[2], a[3], a[4], a[5]]
    elif len(a) == 5:
        z = a
    else:
        return None
    return [int(round(v)) for v in z]


def process(path):
    try:
        data = open(path, "rb").read()
        fid, sessions, tiz, act = {}, [], [], {}
        ts_l, lat_l, lon_l, hr_l, pw_l = [], [], [], [], []
        for g, m in fitlib.messages(data, WANT):
            if g == 20:
                t = m.get(253)
                if t is None:
                    continue
                ts_l.append(t)
                lat_l.append(m.get(0))
                lon_l.append(m.get(1))
                hr_l.append(m.get(3))
                pw_l.append(m.get(7))
            elif g == 18:
                sessions.append(m)
            elif g == 216:
                tiz.append(m)
            elif g == 0 and not fid:
                fid = m
            elif g == 34:
                act = m
    except Exception as e:  # defekte Datei
        return {"error": f"{os.path.basename(path)}: {e}"}
    if not sessions:
        return {"skip": "keine Session"}
    try:                                   # Zeitbegriffe (A3) und Stufen (A5) aus den Sekundenreihen
        sess_series = {S.start: S for S in series.from_fit(data)}
    except Exception:
        sess_series = {}
    manu = fid.get(1)
    base_id = os.path.basename(path).rsplit("_", 1)[-1].split(".")[0]
    offset = None
    if act.get(5) is not None and act.get(253) is not None:
        offset = act[5] - act[253]
        if abs(offset) > 15 * 3600:
            offset = None
    sessions.sort(key=lambda s: s.get(2) or s.get(253) or 0)
    tiz_by = {}
    for t in tiz:
        if t.get(0) == 18:
            tiz_by[t.get(1) or 0] = t
    out = []
    multi = len([s for s in sessions if s.get(5) != 3]) > 1
    for si, s in enumerate(sessions):
        sport, sub = s.get(5) or 0, s.get(6) or 0
        if sport == 3:  # Wechselzone
            continue
        st = s.get(2) or (ts_l[0] if ts_l else None)
        if st is None:
            continue
        elapsed = (s.get(7) or s.get(8) or 0) / 1000.0
        timer = (s.get(8) or s.get(7) or 0) / 1000.0
        if timer < 60:
            continue
        en = st + elapsed + 1
        unix = st + fitlib.FIT_EPOCH
        if offset is not None:
            loc = dt.datetime.fromtimestamp(unix + offset, dt.timezone.utc).replace(tzinfo=None)
        else:
            loc = dt.datetime.fromtimestamp(unix, ZRH).replace(tzinfo=None)
        tz = tiz_by.get(s.get(254) if s.get(254) is not None else si) or (tiz_by.get(0) if not multi else None)
        indoor = manu == 260 or sub in INDOOR_SUB or sport in NO_GPS_SPORT
        # Datensätze dieser Session
        lo = next((i for i, t in enumerate(ts_l) if t >= st), len(ts_l)) if multi else 0
        hi = len(ts_l)
        if multi:
            hi = next((i for i in range(lo, len(ts_l)) if ts_l[i] > en), len(ts_l))
        ts = ts_l[lo:hi]
        poly = None
        if not indoor:
            pts = [(lon_l[i] * SC, lat_l[i] * SC) for i in range(lo, hi)
                   if lat_l[i] is not None and lon_l[i] is not None and (lat_l[i] or lon_l[i])]
            pts = [p for p in pts if -90 <= p[1] <= 90 and -180 <= p[0] <= 180]
            if len(pts) >= 2:
                sp = simplify(pts, 5.0)
                if len(sp) >= 2:
                    poly = encode_poly(sp)
        # Puls-Histogramm (5-bpm-Klassen ab 60), gewichtet mit der Zeit bis zum nächsten Punkt
        hh = None
        hrs = hr_l[lo:hi]
        if any(h for h in hrs):
            hh = [0] * 30
            for i in range(len(ts) - 1):
                h = hrs[i]
                if h:
                    d = ts[i + 1] - ts[i]
                    if 0 < d <= 10:
                        b = min(29, max(0, (h - 60) // 5))
                        hh[b] += d
            while hh and hh[-1] == 0:
                hh.pop()
        # Leistung
        np_, pdc = s.get(34), None
        pws = pw_l[lo:hi]
        if sport == 2 and any(p for p in pws if p):
            L = int(en - st) + 1
            if 0 < L < 200000:
                arr = [0] * L
                filled = bytearray(L)
                for t, p in zip(ts, pws):
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
        ftp = (tz or {}).get(15) or s.get(45)
        lthr = (tz or {}).get(13)
        km = (s.get(9) or 0) / 100000.0
        hr = s.get(16)
        watt = s.get(20)
        h = timer / 3600.0
        if s.get(35):
            tss = s[35] / 10.0
        elif watt and ftp and np_:
            tss = h * (np_ / ftp) ** 2 * 100
        elif hr and lthr:
            tss = h * min(1.15, hr / lthr) ** 2 * 100
        else:
            tss = h * 0.6 ** 2 * 100
        lab = label(sport, sub, s.get(110), manu)
        if km >= 1:
            name = f"{lab} {km:.1f} km".replace(".", ",") if km < 10 else f"{lab} {km:.0f} km"
        else:
            name = lab
        zones = zones5((tz or {}).get(2) or s.get(65))
        out.append({
            "id": base_id + (f"-{si}" if multi else ""), "sport": category(sport, sub), "typ": lab, "s": [sport, sub],
            "indoor": bool(indoor), "name": name, "date": loc.strftime("%Y-%m-%d"), "start": loc.strftime("%H:%M"),
            "unix": int(unix), "el": int(elapsed),
            "km": round(km, 2), "hm": int(s.get(22) or 0), "dur": int(round(timer)),
            "hr": hr, "hrmax": s.get(17), "watt": watt, "np": np_, "tss": int(round(tss)),
            "zones": zones, "hh": hh, "poly": poly, "ftp": ftp, "lthr": lthr,
            "maxhr": (tz or {}).get(11), "rhr": (tz or {}).get(12), "zb": list((tz or {}).get(6) or []) or None,
            "pdc": pdc, "manu": manu, "multi": multi, "t0": int(unix),
        })
        S = sess_series.get(int(unix))
        if S is not None:
            zf, _ = kennzahlen.zeitfelder(S)
            zf.pop("el", None)                     # Gesamtzeit bleibt wie bisher berechnet
            out[-1].update(zf)
            out[-1].update(kennzahlen.ausdauer(S))   # Drift und Lauf-Abschnitte (ausdauer-1.0)
            if out[-1]["sport"] in ("rad", "lauf"):
                stf = kennzahlen.stufen.stufen(S)
                if kennzahlen.stufen.relevant(stf):
                    out[-1]["stufen"] = stf
    return {"acts": out}


if __name__ == "__main__":
    files = json.load(open(sys.argv[1]))
    files.sort(key=lambda a: -a["size"])
    acts, errors, skipped = [], [], 0
    with Pool(2) as pool:
        for i, r in enumerate(pool.imap_unordered(process, [f["path"] for f in files], chunksize=4)):
            if "error" in r:
                errors.append(r["error"])
            elif "skip" in r:
                skipped += 1
            else:
                acts.extend(r["acts"])
            if (i + 1) % 300 == 0:
                print(f"{i + 1}/{len(files)} Dateien", flush=True)
    json.dump(acts, open(sys.argv[2], "w"))
    print("Aktivitäten:", len(acts), "Fehler:", len(errors), "ohne Session:", skipped)
    for e in errors[:10]:
        print("  ", e)
