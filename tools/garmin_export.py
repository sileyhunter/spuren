"""Garmin-Datenexport (DSGVO-Export «Daten anfordern») → Tagesverlauf für die Seite (V6.2.3, garmin-export-1.0).

Gelesen wird nur, was im Export steht; das Format ist am 13.11.2026 an Silas' Export geprüft (Ordner DI-Connect-Wellness und
DI-Connect-Metrics, als «Archiv.zip» hochgeladen). Tagesübersichten (UDS: Stress und Body Battery je Tag) und Aktivitäten (FIT) waren
nicht dabei; sie kommen weiter über die Garmin-Verbindung bzw. den Monatsexport.

Zuordnung (gleiche Felder wie im Nacht-Update, CLAUDE.md):
- *_sleepData.json, je Nacht (calendarDate = Morgen):
    sleepH      = (deepSleepSeconds + lightSleepSeconds + remSleepSeconds) / 3600 – Schlafzeit ohne Wachphasen, wie Garmin «Schlafdauer»
    sleepScore  = sleepScores.overallScore
    sleepStress = avgSleepStress (1 Nachkommastelle)
  Nur Nächte mit gemessenem Schlaf: nicht «OFF_WRIST» oder «UNCONFIRMED», Summe der Phasen > 0.
- *_healthStatusData.json (Gesundheitsstatus, bei Silas seit Herbst 2025), je Tag metrics:
    hrv = HRV (Nachtmittel), rhr = HR – nur mit --gesundheit (erst nach Abgleich mit der Garmin-Verbindung, siehe CLAUDE.md)
- TrainingReadinessDTO_*.json (mehrere Einträge je Tag):
    readiness = score, readinessLevel = level des Eintrags «AFTER_WAKEUP_RESET» (Readiness nach dem Aufwachen), bei älteren Einträgen
    ohne inputContext der Eintrag des Tages. Mehrere solche Einträge mit verschiedenem Wert (Mittagsschlaf, neue Synchronisation): Tag leer.
Nichts wird geschätzt; fehlt ein Wert, bleibt er leer.

Einspielen (merge_daily.py, Schlüssel «garmin_verlauf», kommt verschlüsselt über die Seite): nur fehlende Felder füllen, nie überschreiben;
das Nachholen über die Garmin-Verbindung (HRV, Ruhepuls vor dem Gesundheitsstatus) läuft weiter, wo es war.

  python3 -I tools/garmin_export.py lesen <ordner> [<ordner> …] <aus.json> [--gesundheit]
  python3 -I tools/garmin_export.py zeigen <aus.json>
"""
import collections
import datetime as dt
import glob
import hashlib
import json
import math
import os
import re
import sys
import zoneinfo

V = "garmin-export-1.0"
FORMAT = "spuren-garmin-verlauf-1"
FELDER = ("sleepH", "sleepScore", "sleepStress", "hrv", "rhr", "readiness", "readinessLevel")
LEVEL = ("POOR", "LOW", "MODERATE", "HIGH", "PRIME")
BEREICH = {"sleepH": (0, 16), "sleepScore": (0, 100), "sleepStress": (0, 100), "hrv": (5, 250), "rhr": (25, 120), "readiness": (0, 100)}
OHNE_SCHLAF = ("OFF_WRIST", "UNCONFIRMED")
MAX_TAGE = 6000
ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _zahl(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _laden(pfad):
    with open(pfad, encoding="utf-8") as f:
        x = json.load(f)
    return x if isinstance(x, list) else []


def _dateien(ordner, muster):
    out = []
    for o in ordner:
        out += glob.glob(os.path.join(o, "**", muster), recursive=True)
    return sorted(set(out))


def schlaf(eintraege):
    """sleepData-Einträge → {Datum: {sleepH, sleepScore, sleepStress}}; Nächte ohne gemessenen Schlaf fehlen."""
    out = {}
    for s in eintraege:
        d = s.get("calendarDate") if isinstance(s, dict) else None
        if not d or not DATUM.match(d) or s.get("sleepWindowConfirmationType") in OHNE_SCHLAF:
            continue
        teile = [s.get(k) for k in ("deepSleepSeconds", "lightSleepSeconds", "remSleepSeconds")]
        summe = sum(v for v in teile if _zahl(v))
        if summe <= 0:
            continue
        t = {"sleepH": round(summe / 3600, 2)}
        sc = (s.get("sleepScores") or {}).get("overallScore")
        if _zahl(sc) and sc >= 0:
            t["sleepScore"] = int(sc)
        st = s.get("avgSleepStress")
        if _zahl(st) and st >= 0:
            t["sleepStress"] = round(st, 1)
        out[d] = t
    return out


def gesundheit(eintraege):
    """healthStatusData-Einträge → {Datum: {hrv, rhr}} (Garmin-Gesundheitsstatus, Werte der Nacht)."""
    out = {}
    for h in eintraege:
        d = h.get("calendarDate") if isinstance(h, dict) else None
        if not d or not DATUM.match(d):
            continue
        m = {x.get("type"): x.get("value") for x in h.get("metrics") or [] if isinstance(x, dict)}
        t = {}
        if _zahl(m.get("HRV")) and m["HRV"] > 0:
            t["hrv"] = int(round(m["HRV"]))
        if _zahl(m.get("HR")) and m["HR"] > 0:
            t["rhr"] = int(round(m["HR"]))
        if t:
            out[d] = t
    return out


def readiness(eintraege, mehrdeutig=None):
    """TrainingReadinessDTO-Einträge → {Datum: {readiness, readinessLevel}}: der Eintrag «AFTER_WAKEUP_RESET» des Tages (Readiness nach
    dem Aufwachen), bei älteren Einträgen ohne inputContext der Eintrag des Tages. Gibt es mehrere solche Einträge mit verschiedenem Wert
    (z. B. nach einem Mittagsschlaf), bleibt der Tag leer – welcher «der Morgen» ist, wird nicht geraten (mehrdeutig: Liste der Tage).
    Einträge «UPDATE_REALTIME_VARIABLES» und nach Training zählen nie."""
    je = collections.defaultdict(list)
    for r in eintraege:
        if isinstance(r, dict) and r.get("calendarDate") and DATUM.match(str(r["calendarDate"])) and _zahl(r.get("score")) and r["score"] >= 0:
            je[r["calendarDate"]].append(r)
    out = {}
    for d, L in je.items():
        morgen = [r for r in L if r.get("inputContext") == "AFTER_WAKEUP_RESET"] or [r for r in L if r.get("inputContext") is None]
        if not morgen:
            continue
        if len({(int(r["score"]), r.get("level")) for r in morgen}) > 1:
            if mehrdeutig is not None:
                mehrdeutig.append(d)
            continue
        r = morgen[0]
        t = {"readiness": int(r["score"])}
        if r.get("level") in LEVEL:
            t["readinessLevel"] = r["level"]
        out[d] = t
    return out


def lesen(ordner, mit_gesundheit=False, erstellt=None):
    """Export-Ordner (entpackt) → Verlauf im Format spuren-garmin-verlauf-1."""
    S = schlaf([x for p in _dateien(ordner, "*_sleepData.json") for x in _laden(p)])
    H = gesundheit([x for p in _dateien(ordner, "*_healthStatusData.json") for x in _laden(p)]) if mit_gesundheit else {}
    mehr = []
    R = readiness([x for p in _dateien(ordner, "TrainingReadinessDTO_*.json") for x in _laden(p)], mehr)
    tage = []
    for d in sorted(set(S) | set(H) | set(R)):
        t = {"date": d}
        for q in (S, H, R):
            t.update(q.get(d, {}))
        tage.append(t)
    anzahl = {k: sum(1 for t in tage if k in t) for k in FELDER}
    inhalt = json.dumps(tage, sort_keys=True, separators=(",", ":"))
    return {"format": FORMAT, "v": V, "id": hashlib.sha256(inhalt.encode()).hexdigest()[:16], "quelle": "Garmin-Datenexport",
            "erstellt": erstellt or dt.datetime.now(ZRH).isoformat(timespec="seconds"),
            "zeitraum": [tage[0]["date"], tage[-1]["date"]] if tage else None, "anzahl": {k: v for k, v in anzahl.items() if v},
            "felder": [k for k in FELDER if anzahl[k]], "ausgelassen": {"readiness_mehrdeutig": len(mehr)} if mehr else {}, "tage": tage}


def pruefen(G, heute=None):
    """Verlauf prüfen (kommt von der Seite, also nicht vertrauenswürdig). → (gültige Tage, Liste der Gründe für Verworfenes)."""
    if not isinstance(G, dict) or G.get("format") != FORMAT or not isinstance(G.get("tage"), list) or not re.fullmatch(r"[0-9a-f]{16}", str(G.get("id", ""))):
        return [], ["kein Garmin-Verlauf (Format)"]
    if len(G["tage"]) > MAX_TAGE:
        return [], [f"zu viele Tage ({len(G['tage'])})"]
    heute = heute or dt.date.today().isoformat()
    ok, fehler = [], collections.Counter()
    for t in G["tage"]:
        d = t.get("date") if isinstance(t, dict) else None
        if not isinstance(d, str) or not DATUM.match(d) or not ("2010-01-01" <= d <= heute):
            fehler["Datum ungültig"] += 1
            continue
        neu, schlecht = {"date": d}, False
        for k, v in t.items():
            if k == "date" or v is None:
                continue
            if k == "readinessLevel":
                if v in LEVEL:
                    neu[k] = v
                else:
                    schlecht = True
            elif k in BEREICH and _zahl(v) and BEREICH[k][0] <= v <= BEREICH[k][1]:
                neu[k] = v
            else:
                schlecht = True
        if schlecht:
            fehler["Wert ausserhalb des Bereichs oder unbekanntes Feld"] += 1
        if len(neu) > 1:
            ok.append(neu)
    return ok, [f"{n} × {g}" for g, n in fehler.items()]


def einspielen(D, G, heute=None):
    """Nur fehlende Felder füllen (vorhandene Werte aus der Garmin-Verbindung bleiben). Gibt eine Meldung zurück."""
    tage, fehler = pruefen(G, heute)
    if not tage:
        return f"Garmin-Verlauf nicht eingespielt: {'; '.join(fehler) or 'keine Tage'}"
    days = {d["date"]: d for d in D.setdefault("days", []) if isinstance(d, dict) and d.get("date")}
    cfg = D.setdefault("config", {})
    if "days_backfill" not in cfg:                 # das Nachholen über die Verbindung (HRV, Ruhepuls) läuft weiter, wo es war
        cfg["days_backfill"] = min(days) if days else (heute or dt.date.today().isoformat())
    gefuellt, neu = collections.Counter(), 0
    for t in tage:
        cur = days.get(t["date"])
        if cur is None:
            cur = days[t["date"]] = {"date": t["date"]}
            neu += 1
        for k, v in t.items():
            if k != "date" and cur.get(k) is None:
                cur[k] = v
                gefuellt[k] += 1
    D["days"] = [days[k] for k in sorted(days)]
    jetzt = dt.datetime.now(ZRH).isoformat(timespec="seconds")
    eintrag = {"id": G["id"], "eingespielt": jetzt, "erstellt": G.get("erstellt"), "zeitraum": [tage[0]["date"], tage[-1]["date"]],
               "tage": len(tage), "neue_tage": neu, "gefuellt": dict(gefuellt), "verworfen": fehler}
    D["garmin_export"] = [x for x in D.get("garmin_export", []) if x.get("id") != G["id"]] + [eintrag]
    D.setdefault("audit", []).append({"zeit": jetzt, "was": "Garmin-Verlauf eingespielt", "id": G["id"], "gefuellt": dict(gefuellt), "neue_tage": neu})
    D.setdefault("versions", {})["garmin_export"] = {"v": V, "text": "Garmin-Datenexport: Schlaf, Readiness (und Gesundheitsstatus, wenn geprüft) "
                                                    "füllen nur fehlende Tageswerte; nie überschrieben, nie geschätzt"}
    teile = ", ".join(f"{k} {n}" for k, n in gefuellt.items()) or "nichts neu"
    return f"Garmin-Verlauf {G['id']}: {len(tage)} Tage geprüft, {neu} neue Tage, gefüllt: {teile}" + (f"; verworfen: {'; '.join(fehler)}" if fehler else "")


def main():
    a = sys.argv[1:]
    if len(a) >= 3 and a[0] == "lesen":
        mit = "--gesundheit" in a
        rest = [x for x in a[1:] if x != "--gesundheit"]
        G = lesen(rest[:-1], mit_gesundheit=mit)
        with open(rest[-1], "w", encoding="utf-8") as f:
            json.dump(G, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{G['zeitraum']} · {len(G['tage'])} Tage · {G['anzahl']} · ausgelassen {G['ausgelassen'] or 'nichts'} · id {G['id']}")
        return 0
    if len(a) == 2 and a[0] == "zeigen":
        G = json.load(open(a[1], encoding="utf-8"))
        tage, fehler = pruefen(G)
        print(f"{G.get('zeitraum')} · {len(tage)} gültige Tage · {G.get('anzahl')} · verworfen: {fehler or 'nichts'}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
