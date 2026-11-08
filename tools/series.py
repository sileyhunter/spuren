"""Sekundenreihen einer Aktivität, gleich aufbereitet aus zwei Quellen:

- FIT-Datei (Monatsexport von Garmin, auch Zwift-Dateien mit Zielleistung als Entwicklerfeld)
- Antwort der Garmin-Verbindung `get_activity_fit_data(include_records=True)` (nächtliches Update),
  optional ergänzt um `get_activity_fit_messages` für Runden, Bahnen und Timer-Ereignisse.

Beide Wege liefern dieselbe Struktur `Session`; alle Kennzahlen (zeit.py, stufen.py) rechnen nur damit.
So entstehen aus beiden Quellen dieselben Werte (Abnahme A2).
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitlib  # noqa: E402

VERSION = "series-1.0"
INDOOR_SUB = {1, 6, 17, 45, 58}            # Laufband, Indoor-Rad, Becken, Indoor-Lauf, virtuell
NO_GPS_SPORT = {4, 10}
SPORT_ID = {"generic": 0, "running": 1, "cycling": 2, "transition": 3, "fitness_equipment": 4, "swimming": 5,
            "training": 10, "walking": 11, "cross_country_skiing": 12, "alpine_skiing": 13, "snowboarding": 14,
            "rowing": 15, "mountaineering": 16, "hiking": 17, "multisport": 18, "e_biking": 21, "snowshoeing": 35}
SUB_ID = {"generic": 0, "treadmill": 1, "street": 2, "trail": 3, "track": 4, "spin": 5, "indoor_cycling": 6,
          "road": 7, "mountain": 8, "downhill": 9, "recumbent": 10, "cyclocross": 11, "hand_cycling": 12,
          "track_cycling": 13, "indoor_rowing": 14, "elliptical": 15, "stair_climbing": 16, "lap_swimming": 17,
          "open_water": 18, "strength_training": 20, "backcountry": 37, "resort": 38, "indoor_running": 45,
          "gravel_cycling": 46, "e_bike_fitness": 28, "virtual_activity": 58, "skate_skiing": 42, "commuting": 48}
INTENSITY = {0: "active", 1: "rest", 2: "warmup", 3: "cooldown", 4: "recovery", 5: "interval", 6: "other"}


class Session:
    """Eine Sportart-Session (bei Multisport mehrere je Datei)."""

    def __init__(self):
        self.source = ""          # "fit" oder "garmin"
        self.sport = 0            # FIT-Sportart (Zahl)
        self.sub = 0
        self.manu = None          # 260 = Zwift
        self.start = 0            # Unix-Sekunden (UTC)
        self.elapsed = 0.0        # Gesamtzeit laut Session
        self.timer = 0.0          # Timer-Zeit laut Session
        self.distance = None      # m
        self.ts = []              # Unix-Sekunden je Datensatz
        self.pw, self.hr, self.cad, self.spd, self.dist, self.alt, self.temp, self.target = ([] for _ in range(8))
        self.lat, self.lon = [], []   # V5.7: Position je Datensatz (Grad), nur aus der Garmin-Verbindung (für die GPS-Spur «poly»)
        self.laps = []            # {"start","end","timer","elapsed","intensity","dist"}
        self.lengths = []         # Schwimmen: {"start","timer","elapsed","active"}
        self.timer_events = []    # (Unix, "start"|"stop")
        self.session_fields = {}  # Rohwerte der Session (für Vergleiche)

    @property
    def indoor(self):
        return self.manu == 260 or self.sub in INDOOR_SUB or self.sport in NO_GPS_SPORT

    @property
    def category(self):
        s = self.sport
        if s == 2:
            return "rad"
        if s == 1:
            return "lauf"
        if s == 5:
            return "schwimm"
        if s in (17, 11, 16, 35):
            return "wandern"
        if s in (13, 12, 14):
            return "ski"
        return "andere"

    def __len__(self):
        return len(self.ts)


# ---------------------------------------------------------------- FIT-Datei
REC = {253, 7, 3, 4, 6, 73, 5, 2, 78, 13, "dev"}
WANT = {0: {1, 2, 4}, 18: None, 19: {253, 2, 7, 8, 9, 23, 25, 39}, 20: REC, 21: {253, 0, 1, 4},
        101: {253, 2, 3, 4, 12, 5}}


def from_fit(path_or_bytes):
    data = path_or_bytes if isinstance(path_or_bytes, (bytes, bytearray)) else open(path_or_bytes, "rb").read()
    fid, sess, recs, laps, lens, evs = {}, [], [], [], [], []
    for g, m in fitlib.messages(data, WANT):
        if g == 20:
            if m.get(253) is not None:
                recs.append(m)
        elif g == 19:
            laps.append(m)
        elif g == 101:
            lens.append(m)
        elif g == 21:
            evs.append(m)
        elif g == 18:
            sess.append(m)
        elif g == 0 and not fid:
            fid = m
    out = []
    sess = [s for s in sess if (s.get(5) or 0) != 3]          # Wechselzonen weglassen
    sess.sort(key=lambda s: s.get(2) or s.get(253) or 0)
    for k, s in enumerate(sess):
        S = Session()
        S.source = "fit"
        S.manu = fid.get(1)
        S.sport, S.sub = s.get(5) or 0, s.get(6) or 0
        S.start = (s.get(2) or (recs[0][253] if recs else 0)) + fitlib.FIT_EPOCH
        S.elapsed = (s.get(7) or s.get(8) or 0) / 1000.0
        S.timer = (s.get(8) or s.get(7) or 0) / 1000.0
        S.distance = s[9] / 100.0 if s.get(9) is not None else None
        S.session_fields = {"avg_hr": s.get(16), "max_hr": s.get(17), "avg_power": s.get(20), "np": s.get(34),
                            "ascent": s.get(22), "avg_cad": s.get(18)}
        end = S.start + S.elapsed + 1
        multi = len(sess) > 1
        for m in recs:                               # wie parse_activities: eine Session = alle Datensätze,
            t = m[253] + fitlib.FIT_EPOCH            # Multisport = Datensätze von Start bis Ende der Session
            if multi and (t < S.start or t > end):
                continue
            S.ts.append(t)
            S.pw.append(m.get(7))
            S.hr.append(m.get(3) or None)          # 0 = Gurt ohne Kontakt
            S.cad.append(m.get(4))
            sp = m.get(73) if m.get(73) is not None else m.get(6)
            S.spd.append(sp / 1000.0 if sp is not None else None)
            S.dist.append(m[5] / 100.0 if m.get(5) is not None else None)
            al = m.get(78) if m.get(78) is not None else m.get(2)
            S.alt.append(al / 5.0 - 500 if al is not None else None)
            S.temp.append(m.get(13))
            S.target.append(m.get("dev:target_power"))
        for m in laps:
            st = m.get(2)
            if st is None:
                continue
            st += fitlib.FIT_EPOCH
            if multi and (st < S.start - 1 or st >= end):
                continue
            S.laps.append({"start": st, "timer": (m.get(8) or 0) / 1000.0, "elapsed": (m.get(7) or 0) / 1000.0,
                           "end": (m[253] + fitlib.FIT_EPOCH) if m.get(253) else st + (m.get(7) or 0) / 1000.0,
                           "intensity": INTENSITY.get(m.get(23)), "dist": m[9] / 100.0 if m.get(9) is not None else None})
        for m in lens:
            st = m.get(2)
            if st is None:
                continue
            st += fitlib.FIT_EPOCH
            if multi and (st < S.start - 1 or st >= end):
                continue
            S.lengths.append({"start": st, "timer": (m.get(4) or 0) / 1000.0, "elapsed": (m.get(3) or 0) / 1000.0,
                              "active": m.get(12) == 1})
        for m in evs:
            if m.get(0) != 0 or m.get(253) is None:      # nur Timer-Ereignisse
                continue
            t = m[253] + fitlib.FIT_EPOCH
            if multi and (t < S.start - 1 or t > end):
                continue
            et = m.get(1)
            S.timer_events.append((t, "start" if et == 0 else "stop" if et in (1, 4, 9) else str(et)))
        out.append(S)
    return out


# ---------------------------------------------------------------- Garmin-Verbindung (JSON)
def _unix(s):
    if s is None:
        return None
    s = s.replace("T", " ").replace("Z", "")
    return int(dt.datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=dt.timezone.utc).timestamp())


def _load_json(path):
    """Liest die von der Verbindung gespeicherte Antwort (reines JSON oder Text mit JSON darin)."""
    t = open(path, encoding="utf-8").read()
    try:
        return json.loads(t)
    except ValueError:
        i = t.find("{")
        return json.loads(t[i:]) if i >= 0 else None


def _fields(msg):
    return {f.get("name"): f.get("value") for f in msg.get("fields", [])}


def from_garmin(records_path, messages_path=None):
    """records_path: Antwort von get_activity_fit_data(include_records=True).
    messages_path: optional Antwort von get_activity_fit_messages(message_types=[lap, length, event, file_id, session]).
    """
    d = _load_json(records_path)
    s = d["session"]
    S = Session()
    S.source = "garmin"
    S.sport = SPORT_ID.get(s.get("sport"), 0)
    S.sub = SUB_ID.get(s.get("sub_sport"), 0)
    S.start = _unix(s.get("start_time"))
    S.elapsed = float(s.get("total_elapsed_time_s") or s.get("total_timer_time_s") or 0)
    S.timer = float(s.get("total_timer_time_s") or s.get("total_elapsed_time_s") or 0)
    S.distance = s.get("total_distance_m")
    S.session_fields = {"avg_hr": s.get("avg_heart_rate_bpm"), "max_hr": s.get("max_heart_rate_bpm"),
                        "avg_power": s.get("avg_power_w"), "np": s.get("normalized_power_w"),
                        "ascent": s.get("total_ascent_m"), "avg_cad": s.get("avg_cadence_rpm")}
    for r in d.get("records") or []:
        t = _unix(r.get("timestamp"))
        if t is None:
            continue
        S.ts.append(t)
        S.pw.append(r.get("power_w"))
        S.hr.append(r.get("heart_rate_bpm") or None)
        S.cad.append(r.get("cadence_rpm"))
        S.spd.append(r.get("speed_mps"))
        S.dist.append(r.get("distance_m"))
        S.alt.append(r.get("altitude_m"))
        S.temp.append(r.get("temperature_c"))
        S.target.append(r.get("target_power_w"))
        S.lat.append(r.get("lat_deg"))
        S.lon.append(r.get("lon_deg"))
    for lp in d.get("laps") or []:
        st = _unix(lp.get("start_time"))
        el = float(lp.get("total_elapsed_time_s") or 0)
        S.laps.append({"start": st, "timer": float(lp.get("total_timer_time_s") or el), "elapsed": el,
                       "end": st + el if st is not None else None, "intensity": lp.get("intensity"),
                       "dist": lp.get("total_distance_m")})
    if messages_path:
        m = _load_json(messages_path) or {}
        laps, lens, evs = [], [], []
        for msg in m.get("messages", []):
            f, typ = _fields(msg), msg.get("type")
            if typ == "file_id":
                man = f.get("manufacturer")
                S.manu = 260 if man in ("zwift", 260) else 1 if man in ("garmin", 1) else S.manu
            elif typ == "lap":
                laps.append(f)
            elif typ == "length":
                lens.append(f)
            elif typ == "event":
                evs.append(f)
        if laps:                                           # vollständige Runden mit Timer-Zeit und Intensität
            S.laps = []
            for f in laps:
                st = _unix(f.get("start_time"))
                S.laps.append({"start": st, "timer": float(f.get("total_timer_time") or 0),
                               "elapsed": float(f.get("total_elapsed_time") or 0),
                               "end": _unix(f.get("timestamp")), "intensity": f.get("intensity"),
                               "dist": f.get("total_distance")})
        for f in lens:
            S.lengths.append({"start": _unix(f.get("start_time")), "timer": float(f.get("total_timer_time") or 0),
                              "elapsed": float(f.get("total_elapsed_time") or 0),
                              "active": f.get("length_type") == "active"})
        for f in evs:
            if f.get("event") != "timer":
                continue
            et = f.get("event_type")
            S.timer_events.append((_unix(f.get("timestamp")), "start" if et == "start" else "stop" if et in ("stop", "stop_all", "stop_disable_all") else str(et)))
    return [S]


def summary(S):
    """Kurzbeschreibung für Prüfungen."""
    n = len(S.ts)
    return {"source": S.source, "sport": S.sport, "sub": S.sub, "records": n,
            "start": dt.datetime.fromtimestamp(S.start, dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S") if S.start else None,
            "timer": S.timer, "elapsed": S.elapsed, "laps": len(S.laps), "lengths": len(S.lengths),
            "timer_events": len(S.timer_events), "target": sum(1 for x in S.target if x)}
