"""V8.1.1 verpflegung-1.0: Verpflegung je Einheit – Daten für js/verpflegung.js.

- lebensmittel(): eigene Lebensmittel aus Garmin Connect (get_custom_foods, alle Seiten) → Liste mit Portion und Nährwerten,
  so wie Garmin sie liefert (fehlende Werte bleiben None, nichts wird geschätzt).
- pruefen(): Anpassung je Einheit «vp-<Datum>-<uid>» (gleiche Regeln wie VP.pruefen in js/verpflegung.js).
- einstellung_pruefen(): Planeinstellung «pe-verpflegung» (gleiche Regeln wie V75.pruefen in js/v75.js).

Aufruf: python3 -I tools/verpflegung.py liste <antwort.json> [<antwort.json> …]   → normalisierte Liste (zum Prüfen)
"""
import datetime as dt
import json
import math
import re
import sys

VERSION = "verpflegung-1.0"
MIX = ("auto", "gel", "getraenk", "fest")
ID_RE = re.compile(r"^[A-Za-z0-9_.:+-]{1,80}$")
PROD_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,64}$")
FELDER = (("kcal", "calories"), ("kh", "carbs"), ("zucker", "sugar"), ("protein", "protein"), ("fett", "fat"),
          ("natrium", "sodium"), ("kalium", "potassium"))


def _zahl(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _eintraege(roh):
    """Antwort(en) von get_custom_foods: Liste von Einträgen, {"customFoods": [...]} oder eine Liste solcher Antworten."""
    if isinstance(roh, dict):
        return roh.get("customFoods") or []
    out = []
    for x in roh or []:
        if isinstance(x, dict) and "customFoods" in x:
            out.extend(x.get("customFoods") or [])
        elif isinstance(x, dict):
            out.append(x)
    return out


def lebensmittel(roh):
    """→ [{id, name, marke, menge, einheit, kcal, kh, zucker, protein, fett, natrium, kalium}], je Garmin-ID einmal, nach Name sortiert.
    Nur Einträge mit ID, Name und genau einer Portion mit Menge; Werte wie geliefert (negative oder fehlende = None)."""
    out, gesehen = [], set()
    for e in _eintraege(roh):
        if "foodMetaData" not in e and "id" in e:          # schon normalisiert (Ausgabe von «liste»): gleiche Prüfung
            e = {"foodMetaData": {"foodId": e.get("id"), "foodName": e.get("name"), "brandName": e.get("marke")},
                 "nutritionContents": [dict({"numberOfUnits": e.get("menge"), "servingUnit": e.get("einheit")}, **{g: e.get(k) for k, g in FELDER})]}
        m = e.get("foodMetaData") or {}
        fid, name = m.get("foodId"), m.get("foodName")
        n = e.get("nutritionContents") or []
        if not (isinstance(fid, str) and PROD_RE.match(fid) and isinstance(name, str) and name.strip()) or fid in gesehen or not n:
            continue
        p = n[0] or {}
        menge, einheit = p.get("numberOfUnits"), p.get("servingUnit")
        if not (_zahl(menge) and menge > 0 and isinstance(einheit, str) and einheit):
            continue
        x = {"id": fid, "name": name.strip()[:160], "marke": (m.get("brandName") or None), "menge": float(menge), "einheit": einheit.upper()}
        for k, g in FELDER:
            v = p.get(g)
            x[k] = float(v) if _zahl(v) and v >= 0 else None
        gesehen.add(fid)
        out.append(x)
    out.sort(key=lambda x: x["name"].lower())
    return out


def _zeit_ok(g):
    try:
        return isinstance(g, str) and dt.datetime.fromisoformat(g.replace("Z", "+00:00")) is not None
    except ValueError:
        return False


def _datum_ok(d):
    try:
        return isinstance(d, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d) is not None and dt.date.fromisoformat(d).isoformat() == d
    except ValueError:
        return False


def _ids_ok(L):
    return L is None or (isinstance(L, list) and len(L) <= 60 and len(set(L)) == len(L) and all(isinstance(i, str) and PROD_RE.match(i) for i in L))


def pruefen(e):
    """Anpassung je Einheit «vp-<Datum>-<uid>»: g_h 0–120 in 5er-Schritten oder None, mix auto/gel/getraenk/fest, aus ja/nein,
    entfernt = zurück auf die Empfehlung. → None oder Grund (wie VP.pruefen)."""
    if not isinstance(e, dict):
        return "kein Eintrag"
    d, uid = e.get("datum"), e.get("uid")
    if not _datum_ok(d):
        return "Datum fehlt"
    if not (isinstance(uid, str) and ID_RE.match(uid)):
        return "Einheit fehlt"
    if e.get("id") != f"vp-{d}-{uid}":
        return "Kennung passt nicht zu Tag und Einheit"
    if not _zeit_ok(e.get("geaendert")):
        return "ohne Zeitpunkt der Änderung"
    if "entfernt" in e and e["entfernt"] is not True:
        return "entfernt nur ja"
    if e.get("entfernt") is True:
        return None
    g = e.get("g_h")
    if g is not None and not (_zahl(g) and float(g).is_integer() and 0 <= g <= 120 and int(g) % 5 == 0):
        return "Kohlenhydrate 0–120 g pro Stunde in 5er-Schritten"
    if e.get("mix") is not None and e.get("mix") not in MIX:
        return "unbekannte Auswahl der Produkte"
    if e.get("aus") is not None and not isinstance(e.get("aus"), bool):
        return "ohne Verpflegung ja oder nein"
    if g is None and e.get("mix") in (None, "auto") and e.get("aus") is not True:
        return "keine Änderung"
    return None


def einstellung_pruefen(e):
    """Planeinstellung «pe-verpflegung»: unterwegs, vorher, nachher, fruktose = Listen von Produkt-IDs (je höchstens 60, ohne Doppel),
    max_g_h 30–120 in 10er-Schritten oder None. → None oder Grund (wie V75.pruefen)."""
    for k in ("unterwegs", "davor", "danach", "fruktose"):      # nicht «vorher»: das trägt in den Planeinstellungen die Fassung der laufenden Woche
        if not _ids_ok(e.get(k)):
            return "Produkte: Liste bekannter Einträge ohne Doppel"
    m = e.get("max_g_h")
    if m is not None and not (_zahl(m) and float(m).is_integer() and 30 <= m <= 120 and int(m) % 10 == 0):
        return "höchstens 30–120 g pro Stunde in 10er-Schritten"
    return None


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "liste":
        roh = []
        for p in sys.argv[2:]:
            with open(p, encoding="utf-8") as f:
                roh.append(json.load(f))
        L = lebensmittel(roh)
        print(json.dumps({"anzahl": len(L), "lebensmittel": L}, ensure_ascii=False, indent=1))
    else:
        print(__doc__)
        sys.exit(2)
