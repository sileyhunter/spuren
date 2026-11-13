"""Notizen der Aktivitäten aus Garmin (V6.1, notizen-1.0): unverändert speichern, Laktat und Verpflegung daraus als Vorschau.

Quelle: Feld «description» aus get_activity (Garmin-Verbindung). Im Nacht-Update je abgerufene Aktivität als «notiz» in work/new.json,
rückwirkend als «notizen_garmin» (welche Aktivitäten noch fehlen: python3 -I tools/notizen.py offen data.json).
Gespeichert wird je Garmin-ID in D["garmin_notizen"] (nicht in der Aktivität: der Monatsexport baut die Aktivitäten neu, die gid bleibt).

Regeln (notizen-1.0)
- Die Notiz bleibt wörtlich, wie sie in Garmin steht. Ändert sie sich, kommt die alte Fassung ins Audit; gelöscht = Text leer (Audit).
- Laktat: Abschnitt «Laktat …:», je Zeile «Min <m>: <x,x> mmol/l | <Block> (<von>–<bis>): Ø <W> W bzw. Ø <m:ss>/km, Ø HF <bpm> | <Hinweise>».
  Daraus eine Vorschau in laktat_vorschau («ln-<Aktivität>-<m>», Art «check») mit den Werten laut Notiz, gekennzeichnet «aus der Garmin-Notiz,
  nicht aus FIT nachgerechnet». Keine Vorschau, wenn dieselbe Messung (gleiche Aktivität, ±2 min oder gleicher Wert ohne Zeit) schon in
  lactate, in einer anderen Vorschau oder in laktat_punkte steht. Übernommen wird erst nach Silas' Bestätigung (B1).
- Verpflegung: Abschnitt «Verpflegung …:» (auch «Fueling», «Train your Gut», «Ernährung»). «Min <m>: …» zählt mit Zeitpunkt, Zeilen ohne Zeit
  («Während der Fahrt: …», «4 Gels à 30 g KH = 120 g KH») ohne Zeitpunkt; «Vorher» und «… vor Start» zählen nie mit, «Nachher» auch nicht.
  KH nur aus «g KH» (ungefähre Angaben mit «~», «ca.» gekennzeichnet); Wasser, Natrium und Koffein nur, wenn sie dastehen, sonst unbekannt.
  Summe der Zeilen gegen «Total: … g KH» (±1 g). Vorschau in fueling_vorschau («fn-<Aktivität>»), nur Rad und Laufen ab 40 min und nur, wenn
  zur Aktivität noch kein Fueling-Eintrag besteht. Übernommen wird erst, wenn Silas den Eintrag auf der Seite speichert (dann fueling «fn-…»).
- Nie geschätzt oder ergänzt: fehlende Werte bleiben leer; Zeilen, die nicht gelesen werden können, stehen als Hinweis da.
"""
import argparse
import datetime as dt
import json
import re
import sys
import zoneinfo

ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
V = "notizen-1.0"
TEXT = ("Garmin-Notiz unverändert gespeichert; Laktat («Min m: x mmol/l | …») und Verpflegung («Min m: … (x g KH)», «Total: … g KH») daraus nur als "
        "Vorschau mit den Werten laut Notiz (nicht aus FIT nachgerechnet); übernommen erst nach Bestätigung")
QUELLE = "Garmin-Notiz der Aktivität"
TOL_S = 120                                   # dieselbe Laktatmessung: ±2 min
TOL_KH = 1.0                                  # Summe der Zeilen gegen «Total»: ±1 g
SPORTARTEN, MIN_DAUER_S = ("rad", "lauf"), 2400   # Verpflegung wie fueling-garmin-1.0: Rad und Laufen ab 40 min

ZAHL = r"(\d+(?:[.,]\d+)?)"
KOPF_LAKTAT = re.compile(r"^\s*Laktat(?:\s*\(([^)]*)\))?\s*:\s*(.*)$", re.I)
KOPF_FUEL = re.compile(r"^\s*(?:Verpflegung|Fueling|Train your Gut|Ernährung|Ernaehrung)(?:\s*/\s*[^:()\n]+?)?(?:\s*\(([^)]*)\))?\s*:\s*(.*)$", re.I)
BULLET = re.compile(r"^\s*(?:[-•*–]\s+)")
LA_ZEILE = re.compile(r"^(?:ca\.\s*)?Min(?:ute)?\.?\s*" + ZAHL + r"\s*:\s*" + ZAHL + r"\s*mmol\s*/\s*l\b(.*)$", re.I)
FENSTER = re.compile(r"\(\s*(\d+(?::\d{2}){0,2})\s*[–-]\s*(\d+(?::\d{2}){0,2})\s*\)")
W_RE = re.compile(r"Ø\s*" + ZAHL + r"\s*W\b")
NP_RE = re.compile(r"\bNP\s*" + ZAHL + r"\s*W\b")
HF_RE = re.compile(r"Ø\s*(?:HF|Puls)\s*(\d+)", re.I)
PACE_RE = re.compile(r"Ø\s*(\d{1,2}):(\d{2})\s*(?:min\s*)?/\s*km")
KMH_RE = re.compile(r"Ø\s*" + ZAHL + r"\s*km\s*/\s*h")
PAUSE_RE = re.compile(r"Pause\s*(\d+):(\d{2})\s*min", re.I)
ZEIT_MIN = re.compile(r"^(?:ca\.\s*|~\s*)?Min(?:ute)?\.?\s*" + ZAHL + r"\s*[:–-]\s*(.*)$", re.I)
VOR_START = re.compile(r"^(ca\.\s*|~\s*)?" + ZAHL + r"\s*(min|h|Std\.?)\s*vor\s*(?:dem\s*)?Start\s*:\s*(.*)$", re.I)
VOR_IM_TEXT = re.compile(r"(ca\.\s*|~\s*)?" + ZAHL + r"\s*(min|h|Std\.?)\s*vor\s*(?:dem\s*)?Start", re.I)
VORHER = re.compile(r"^Vorher\s*:\s*(.*)$", re.I)
WAEHREND = re.compile(r"^(?:Während|Waehrend|Unterwegs)\b[^:]*:\s*(.*)$", re.I)
NACHHER = re.compile(r"^(?:Nachher|Danach|Nach\s+dem\s+\w+)\s*:\s*(.*)$", re.I)
START = re.compile(r"^(?:Beim\s+)?Start\s*:\s*(.*)$", re.I)
TOTAL = re.compile(r"^Total\b[^:]*:\s*(?:ca\.\s*|~\s*|≈\s*)?" + ZAHL + r"\s*g\s*KH\b(?:\s*in\s*(\d+):(\d{2})\s*h)?", re.I)
KH = re.compile(r"(~\s*|ca\.\s*|≈\s*)?" + ZAHL + r"\s*g\s*KH\b(?!\s*/\s*h)", re.I)
KH_GLEICH = re.compile(r"=\s*(~\s*|ca\.\s*|≈\s*)?" + ZAHL + r"\s*g\s*KH\b(?!\s*/\s*h)", re.I)
A_KH = re.compile(r"\bà\s*" + ZAHL + r"\s*g\s*KH\b", re.I)
ANZAHL = re.compile(r"^(\d+)\s*(?:[×x]\s*)?(?=[A-Za-zÄÖÜäöü])")
ML = re.compile(ZAHL + r"\s*ml\b", re.I)
NA = re.compile(ZAHL + r"\s*mg\s*(?:Na|Natrium)\b", re.I)
KOFF = re.compile(ZAHL + r"\s*mg\s*Koffein\b", re.I)


def _zahl(s):
    return float(str(s).replace(",", "."))


def _ganz(x):
    return int(x) if isinstance(x, float) and x.is_integer() else x


def _zeit_s(s):
    """«36» = Minuten, «92:32» = Minuten:Sekunden, «1:32:32» = Stunden:Minuten:Sekunden."""
    p = [int(x) for x in s.split(":")]
    return p[0] * 60 if len(p) == 1 else p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]


def _jetzt():
    return dt.datetime.now(ZRH).isoformat(timespec="seconds")


def _gid(k):
    k = str(k).strip()
    return k if k.startswith("g") else "g" + k


# ---------------------------------------------------------------- Lesen
def lesen(text):
    """Notiz → {"laktat": [...], "fueling": {...} | None, "hinweise": [...]} – nur Gelesenes, nichts ergänzt."""
    out = {"laktat": [], "fueling": None, "hinweise": []}
    teil, kopf, la_bem, fu = None, None, [], None
    for roh in (text or "").replace("\r\n", "\n").split("\n"):
        zeile = roh.strip()
        if not zeile:
            teil = None
            continue
        m = KOPF_LAKTAT.match(zeile)
        if m:
            teil, kopf = "laktat", (m.group(1) or "").strip()
            if m.group(2).strip():
                _laktat_zeile(m.group(2).strip(), roh, kopf, out, la_bem)
            continue
        m = KOPF_FUEL.match(zeile)
        if m:
            teil = "fueling"
            if fu is None:
                fu = {"waehrend": [], "vorher": [], "nachher": [], "total": None, "bemerkungen": [], "zeilen": []}
            if m.group(2).strip():
                _fueling_zeile(m.group(2).strip(), roh, fu)
            continue
        if teil == "laktat":
            _laktat_zeile(BULLET.sub("", zeile), roh, kopf, out, la_bem)
        elif teil == "fueling":
            _fueling_zeile(BULLET.sub("", zeile), roh, fu)
    for e in out["laktat"]:                      # allgemeine Bemerkungen im Abschnitt gelten für jede Messung (z. B. «Wert jeweils ca. 2 min nach …»)
        e["hinweise"].extend(f"Notiz: {b}" for b in la_bem)
    if fu and (fu["waehrend"] or fu["vorher"] or fu["total"]):
        out["fueling"] = fu
    elif fu and fu["bemerkungen"]:
        out["hinweise"].append("Verpflegung: Abschnitt ohne lesbare KH-Angaben")
    return out


def _laktat_zeile(z, roh, kopf, out, bem):
    m = LA_ZEILE.match(z)
    if not m:
        bem.append(z)
        return
    t_min, la, rest = _zahl(m.group(1)), _zahl(m.group(2)), m.group(3)
    teile = [t.strip() for t in rest.split("|") if t.strip()]
    e = {"t_min": _ganz(t_min), "la": la, "w": None, "np": None, "hr": None, "pace_s": None, "kmh": None, "von_s": None, "bis_s": None,
         "pause_s": None, "zeile": roh.strip(), "hinweise": []}
    if kopf:
        e["hinweise"].append(f"Messung laut Notiz: {kopf}")
    for i, t in enumerate(teile):
        gelesen = False
        f = FENSTER.search(t)
        if f and e["von_s"] is None:
            e["von_s"], e["bis_s"], gelesen = _zeit_s(f.group(1)), _zeit_s(f.group(2)), True
        for rx, key in ((W_RE, "w"), (NP_RE, "np")):
            x = rx.search(t)
            if x and e[key] is None:
                e[key], gelesen = _ganz(_zahl(x.group(1))), True
        x = HF_RE.search(t)
        if x and e["hr"] is None:
            e["hr"], gelesen = int(x.group(1)), True
        x = PACE_RE.search(t)
        if x and e["pace_s"] is None:
            e["pace_s"], gelesen = int(x.group(1)) * 60 + int(x.group(2)), True
        x = KMH_RE.search(t)
        if x and e["kmh"] is None:
            e["kmh"], gelesen = _zahl(x.group(1)), True
        x = PAUSE_RE.search(t)
        if x and e["pause_s"] is None:
            e["pause_s"] = int(x.group(1)) * 60 + int(x.group(2))
        if x or not gelesen:                         # Pause, Stopp, Stiche usw.: wörtlich als Hinweis
            e["hinweise"].append(f"Notiz: {t}")
    out["laktat"].append(e)


def _kh(text):
    """KH einer Zeile: «= 120 g KH» gilt, sonst die eine «x g KH»-Angabe; «4 Gels à 30 g KH» = 4 × 30 g. Mehrdeutig → unbekannt."""
    m = KH_GLEICH.search(text)
    if m:
        return _zahl(m.group(2)), bool(m.group(1)), None, None
    alle = list(KH.finditer(text))
    if not alle:
        return None, False, None, None
    if len(alle) > 1:
        return None, False, None, "mehrere KH-Angaben in einer Zeile – nicht gezählt"
    m = alle[0]
    v, ca = _zahl(m.group(2)), bool(m.group(1))
    a = A_KH.search(text)
    if a and a.start() <= m.start() <= a.end():
        n = ANZAHL.match(text)
        if n and int(n.group(1)) > 1:
            return round(int(n.group(1)) * v, 1), ca, f"{n.group(1)} × {v:g} g KH", None
    return v, ca, None, None


def _produkt(text):
    p = re.split(r"\s*\(|\s+à\s+|\s*=\s*", text, maxsplit=1)[0]
    return p.strip(" ,;–-") or None


def _rest(text):
    """Was nach der Klammer mit den Mengen steht, z. B. «, Trinkzeitpunkte nicht erfasst»."""
    i = text.rfind(")")
    return text[i + 1:].strip(" ,;–-") if i >= 0 else ""


def _ereignis(text, roh, t_min, i):
    kh, ca, rechnung, warn = _kh(text)
    m_ml, m_na, m_k = ML.search(text), NA.search(text), KOFF.search(text)
    e = {"id": f"n{i}", "t_min": t_min, "produkt": _produkt(text), "kh_g": kh, "wasser_ml": _ganz(_zahl(m_ml.group(1))) if m_ml else None,
         "natrium_mg": _ganz(_zahl(m_na.group(1))) if m_na else None, "koffein_mg": _ganz(_zahl(m_k.group(1))) if m_k else None,
         "anteil": 1, "quelle": "Garmin-Notiz", "zeile": roh.strip()}
    if ca:
        e["ungefaehr"] = True
    if rechnung:
        e["rechnung"] = rechnung
    if warn:
        e["warnung"] = warn
    r = _rest(text)
    if r:
        e["notiz"] = r
    return e


def _fueling_zeile(z, roh, fu):
    fu["zeilen"].append(roh.strip())
    i = len(fu["waehrend"]) + len(fu["vorher"]) + len(fu["nachher"]) + 1
    m = TOTAL.match(z)
    if m:
        fu["total"] = {"kh_g": _zahl(m.group(1)), "dauer_s": int(m.group(2)) * 3600 + int(m.group(3)) * 60 if m.group(2) else None, "zeile": roh.strip()}
        return
    m = ZEIT_MIN.match(z)
    if m:
        fu["waehrend"].append(_ereignis(m.group(2), roh, _ganz(_zahl(m.group(1))), i))
        return
    m = VOR_START.match(z)
    if m:
        v = _zahl(m.group(2)) * (60 if m.group(3).lower().startswith(("h", "std")) else 1)
        e = _ereignis(m.group(4), roh, -_ganz(round(v, 1)), i)
        if m.group(1):
            e["zeit_ungefaehr"] = True
        fu["vorher"].append(e)
        return
    m = VORHER.match(z)
    if m:
        x = VOR_IM_TEXT.search(m.group(1))
        t = -_ganz(round(_zahl(x.group(2)) * (60 if x.group(3).lower().startswith(("h", "std")) else 1), 1)) if x else None
        e = _ereignis(m.group(1), roh, t, i)
        if x and x.group(1):
            e["zeit_ungefaehr"] = True
        fu["vorher"].append(e)
        return
    m = NACHHER.match(z)
    if m:
        fu["nachher"].append(_ereignis(m.group(1), roh, None, i))
        return
    m = START.match(z)
    if m:
        fu["waehrend"].append(_ereignis(m.group(1), roh, 0, i))
        return
    m = WAEHREND.match(z)
    text = m.group(1) if m else z
    if m or KH.search(text) or ML.search(text):
        fu["waehrend"].append(_ereignis(text, roh, None, i))
        return
    fu["bemerkungen"].append(z)


# ---------------------------------------------------------------- Einlesen
def einlesen(D, notizen, heute=None):
    """{"g<ID>" oder "<ID>": Text oder None} → D["garmin_notizen"]; geänderte Notizen: alte Fassung ins Audit. Gibt die Zahl der Änderungen zurück."""
    G = D.setdefault("garmin_notizen", {})
    heute = heute or dt.date.today().isoformat()
    n = 0
    for k, text in (notizen or {}).items():
        gid = _gid(k)
        text = text if isinstance(text, str) and text.strip() else None
        alt = G.get(gid)
        if alt and alt.get("text") == text:
            alt["abgerufen"] = heute
            continue
        if alt and alt.get("text"):
            D.setdefault("audit", []).append({"zeit": _jetzt(), "was": "Garmin-Notiz geändert" if text else "Garmin-Notiz gelöscht", "id": gid, "alt": alt})
        G[gid] = {"text": text, "abgerufen": heute}
        n += 1
    return n


def offen(D, n=20):
    """Aktivitäten mit Garmin-ID, deren Notiz noch nie abgerufen wurde (neueste zuerst): Garmin-IDs ohne «g»."""
    G = D.get("garmin_notizen") or {}
    acts = sorted((a for a in D.get("activities", []) if a.get("gid") and a["gid"] not in G), key=lambda a: (a.get("date", ""), a.get("start", "")), reverse=True)
    return [a["gid"][1:] for a in acts[:n]], len(acts)


# ---------------------------------------------------------------- Vorschauen
def _refs(a):
    return {x for x in (a.get("id"), a.get("gid")) if x}


def _laktat_vorschau(a, e, ref):
    rad = a.get("sport") != "lauf"
    if rad:
        x = e["w"]
    else:
        x = e["kmh"] if e["kmh"] is not None else round(3600 / e["pace_s"], 2) if e["pace_s"] else None
    t_s = e["bis_s"] if e["bis_s"] is not None else round(e["t_min"] * 60)
    def mmss(s):
        return f"{s // 60}" if s % 60 == 0 else f"{s // 60}:{s % 60:02d}"
    block = f"Min {mmss(e['von_s'])}–{mmss(e['bis_s'])}" if e["von_s"] is not None else f"Min {e['t_min']}"
    k = {"x": x, "hr": e["hr"], "np": e["np"], "t_s": t_s}
    if e["von_s"] is not None:
        k["win_s"] = e["bis_s"] - e["von_s"]
    if e["pause_s"] is not None:
        k["pause_s"] = e["pause_s"]
    z = {"x": x, "la": e["la"], "hf": e["hr"], "quelle": {"stelle": f"{QUELLE}: «{e['zeile'].lstrip('-•*– ').strip()}»"}}
    if not rad and e["pace_s"]:
        z["pace_s"] = e["pace_s"]
    hw = ["Werte laut Garmin-Notiz (Block, Ø Leistung bzw. Tempo, Ø Puls), nicht aus FIT nachgerechnet"] + e["hinweise"]
    if x is None:
        hw.append("Leistung bzw. Tempo fehlt in der Notiz")
    mid = str(e["t_min"]).replace(".", "_")
    return {"id": f"ln-{ref}-{mid}", "art": "check", "status": "vorschau", "sport": a.get("sport"), "datum": a.get("date"), "aktivitaet": ref,
            "datei": QUELLE, "quelle_art": "notiz", "regel": f"{V}: Messung und Block aus der Notiz", "zuordnung": "laut Notiz",
            "block": block, "zeilen": [z], "kandidaten": [k], "hinweise": hw}


def _gleiche_messung(D, refs, t_s, la, eigene_id):
    """Steht dieselbe Messung schon in lactate, in einer anderen Vorschau oder in laktat_punkte? (gleiche Aktivität, ±2 min; ohne Zeit: gleicher Wert)"""
    for l in D.get("lactate") or []:
        if l.get("kind") != "check" or l.get("activity") not in refs:
            continue
        if l.get("id") == eigene_id:
            return "schon übernommen"
        if l.get("t_s") is not None and abs(l["t_s"] - t_s) <= TOL_S:
            return "schon als Laktatmessung erfasst"
        if l.get("t_s") is None and l.get("lactate") is not None and abs(l["lactate"] - la) < 0.05:
            return "schon als Laktatmessung erfasst (gleicher Wert, ohne Zeitangabe)"
    for p in D.get("laktat_vorschau") or []:
        if p.get("id") == eigene_id or p.get("aktivitaet") not in refs or p.get("art") != "check":
            continue
        ts = [k.get("t_s") for k in p.get("kandidaten") or [] if k.get("t_s") is not None]
        if any(abs(t - t_s) <= TOL_S for t in ts) or (not ts and any(abs((z.get("la") or -9) - la) < 0.05 for z in p.get("zeilen") or [])):
            return "schon als Vorschau vorhanden"
    for p in D.get("laktat_punkte") or []:
        if p.get("act") in refs and isinstance(p.get("t"), (int, float)) and abs(p["t"] - t_s) <= TOL_S:
            return "schon als Laktatpunkt aus dem Explorer vorhanden"
    return None


def _fueling_vorschau(a, fu, ref):
    ev, tot = list(fu["waehrend"]), fu["total"]
    nur_total = not ev and tot is not None
    if nur_total:                               # nur «Total: … g KH» ohne einzelne Zeilen: ein Eintrag ohne Zeitpunkt, so wie es dasteht
        ev = [{"id": "n1", "t_min": None, "produkt": "Total laut Notiz", "kh_g": tot["kh_g"], "wasser_ml": None, "natrium_mg": None, "koffein_mg": None,
               "anteil": 1, "quelle": "Garmin-Notiz", "zeile": tot["zeile"]}]
    bekannt = [e["kh_g"] for e in ev if e["kh_g"] is not None]
    summe = round(sum(bekannt), 1) if bekannt else None
    if nur_total:
        pr, txt = "nur Total", "nur das Total steht in der Notiz, ohne einzelne Einnahmen und Zeitpunkte"
    elif len(bekannt) < len(ev):
        pr, txt = "unvollständig", f"KH bei {len(ev) - len(bekannt)} Zeile(n) nicht lesbar"
    elif tot is None:
        pr, txt = "ohne Total", f"Summe der Zeilen {summe:g} g KH, kein «Total» in der Notiz"
    elif abs(summe - tot["kh_g"]) <= TOL_KH:
        pr, txt = "ok", f"Summe der Zeilen {summe:g} g KH = Total laut Notiz {tot['kh_g']:g} g"
    else:
        pr, txt = "abweichend", f"Summe der Zeilen {summe:g} g KH, Total laut Notiz {tot['kh_g']:g} g – bitte prüfen"
    hw = [f"Notiz: {b}" for b in fu["bemerkungen"]] + [f"{e.get('produkt') or 'Zeile'}: {e['warnung']}" for e in ev if e.get("warnung")]
    if fu["vorher"]:
        hw.append(f"{len(fu['vorher'])} Einnahme(n) vor dem Start – nicht mitgezählt")
    return {"id": f"fn-{ref}", "v": "fueling-1.0", "regel": V, "activity_id": ref, "date": a.get("date"), "sport": a.get("sport"), "status": "vorschau",
            "quelle": QUELLE, "events": ev, "vorher": fu["vorher"], "nachher": fu["nachher"], "total_notiz": tot, "summe_kh_g": summe,
            "pruefung": pr, "pruefung_text": txt, "hinweise": hw, "gi": [], "notiz": ""}


def _aus_notiz(p):
    """Stammt die Vorschau aus der Garmin-Notiz (notizen-1.0)? Andere Herkunft mit gleicher ID wird nie angefasst."""
    return p.get("quelle_art") == "notiz" or str(p.get("regel", "")).startswith("notizen-")


def _ersetzen(D, liste, neu, was):
    """Eigene Vorschau ersetzen (alte Fassung ins Audit) oder anhängen; gibt 1 zurück, wenn neu."""
    alt = next((x for x in liste if x.get("id") == neu["id"]), None)
    if alt is None:
        liste.append(neu)
        return 1
    if alt != neu:
        D.setdefault("audit", []).append({"zeit": _jetzt(), "was": f"{was} ersetzt (Notiz geändert)", "id": neu["id"], "alt": alt})
        liste[liste.index(alt)] = neu
    return 0


def ableiten(D):
    """Vorschauen aus allen gespeicherten Notizen; gibt (neue Laktat-Vorschauen, neue Verpflegungs-Vorschauen, Hinweise) zurück."""
    G, LV, FV = D.get("garmin_notizen") or {}, D.setdefault("laktat_vorschau", []), D.setdefault("fueling_vorschau", [])
    fu_akt = {}
    for e in D.get("fueling") or []:
        if e.get("activity_id"):
            fu_akt.setdefault(e["activity_id"], []).append(e)
    n_la = n_fu = 0
    hinweise, soll_la, soll_fu = [], set(), set()
    for a in D.get("activities") or []:
        gid = a.get("gid")
        notiz = (G.get(gid) or {}).get("text") if gid else None
        if not notiz:
            continue
        ref, refs = gid, _refs(a)
        r = lesen(notiz)
        hinweise += [{"date": a.get("date"), "activity_id": ref, "text": h} for h in r["hinweise"]]
        for e in r["laktat"]:
            neu = _laktat_vorschau(a, e, ref)
            alt = next((p for p in LV if p.get("id") == neu["id"]), None)
            if alt and alt.get("status") != "vorschau":
                soll_la.add(neu["id"])
                continue
            if alt and not _aus_notiz(alt):
                # Audit V6.4 B2: gleiche ID, aber nicht aus der Notiz (z. B. mit laktat_vorschau.py --extra aus FIT nachgerechnet) –
                # nie durch die Notiz-Fassung ersetzen; bestätigt wird, was Silas gesehen hat
                soll_la.add(neu["id"])
                continue
            schon = _gleiche_messung(D, refs, neu["kandidaten"][0]["t_s"], e["la"], neu["id"])
            if schon:
                hinweise.append({"date": a.get("date"), "activity_id": ref, "text": f"Laktat Min {e['t_min']}: {schon} – keine Vorschau"})
                continue
            soll_la.add(neu["id"])
            n_la += _ersetzen(D, LV, neu, "Laktat-Vorschau")
        if r["fueling"] and not (r["fueling"]["waehrend"] or r["fueling"]["total"]):
            hinweise.append({"date": a.get("date"), "activity_id": ref, "text": "Verpflegung in der Notiz nur vor dem Start – keine Vorschau"})
        elif r["fueling"]:
            fid = f"fn-{ref}"
            alt = next((p for p in FV if p.get("id") == fid), None)
            andere = [e for x in refs for e in fu_akt.get(x, [])]
            if alt and alt.get("status") != "vorschau":
                soll_fu.add(fid)
                continue
            if andere:
                soll_fu.add(fid)
                if alt:
                    eigen = any(e.get("id") == fid for e in andere)
                    alt["status"] = "übernommen" if eigen else "überholt"
                    if not eigen:
                        alt.setdefault("hinweise", []).append("anderer Fueling-Eintrag zur Einheit vorhanden – nichts überschrieben")
                else:
                    hinweise.append({"date": a.get("date"), "activity_id": ref, "text": "Verpflegung in der Notiz, aber schon ein Fueling-Eintrag zur Einheit – keine Vorschau"})
                continue
            if a.get("sport") not in SPORTARTEN or (a.get("mv") or a.get("dur") or 0) < MIN_DAUER_S:
                hinweise.append({"date": a.get("date"), "activity_id": ref, "text": "Verpflegung in der Notiz – nur Rad und Laufen ab 40 min werden ausgewertet"})
                continue
            soll_fu.add(fid)
            n_fu += _ersetzen(D, FV, _fueling_vorschau(a, r["fueling"], ref), "Verpflegungs-Vorschau")
    for liste, soll, was in ((LV, soll_la, "Laktat-Vorschau"), (FV, soll_fu, "Verpflegungs-Vorschau")):
        for p in [p for p in liste if str(p.get("regel", "")).startswith("notizen-") and p.get("status") == "vorschau" and p["id"] not in soll]:
            D.setdefault("audit", []).append({"zeit": _jetzt(), "was": f"{was} entfernt (nicht mehr in der Notiz)", "id": p["id"], "alt": p})
            liste.remove(p)
    if not FV:
        D.pop("fueling_vorschau", None)
    D["notizen_hinweise"] = hinweise[-40:]
    D.setdefault("versions", {})["notizen"] = {"v": V, "text": TEXT}
    return n_la, n_fu, hinweise


def main():
    ap = argparse.ArgumentParser(description="Garmin-Notizen: welche Aktivitäten noch abzurufen sind")
    ap.add_argument("befehl", choices=["offen"])
    ap.add_argument("data")
    ap.add_argument("--max", type=int, default=20)
    a = ap.parse_args()
    D = json.load(open(a.data, encoding="utf-8"))
    ids, rest = offen(D, a.max)
    print(json.dumps({"ids": ids, "noch_offen": rest}))


if __name__ == "__main__":
    sys.exit(main())
