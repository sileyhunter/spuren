"""Garmin-Tageswerte für die Bereitschaft (V6.1, wellness-1.0): Readiness, Body Battery, Stress – je Tag in D["days"].

Felder (Zuordnung wie im Nacht- und Morgen-Update, CLAUDE.md):
- get_morning_training_readiness(Datum): readiness = score, readinessLevel = level (Garmin-Wort, z. B. «HIGH»). «No … data found» → nichts.
- get_user_summary(Datum): bodyBattery = bodyBatteryAtWakeTime (beim Aufwachen), bbSleep = bodyBatteryDuringSleep (Aufladung im Schlaf);
  nur für abgeschlossene Tage zusätzlich stress = averageStressLevel (Tagesmittel 0–100), stressHighMin = highStressDuration / 60,
  bbHigh = bodyBatteryHighestValue, bbLow = bodyBatteryLowestValue. Negative Werte (Garmin: «zu wenig Daten») gelten als fehlend.
- get_sleep_summary_range: sleepStress = avg_sleep_stress (Stress im Schlaf).
Werte werden nie geschätzt; fehlt einer, bleibt er leer. Es sind Garmins eigene Werte: angezeigt und gespeichert, aber (noch) nicht Teil der Ampel.

Rückwirkend (wie days_backfill): python3 -I tools/wellness.py offen data.json [--heute JJJJ-MM-TT]
→ die nächsten Tage für diese Nacht (höchstens 10, nie vor 2020-01-01; Readiness erst ab 2024-08-01, vorher liefert Garmin bei Silas keine).
Danach in work/new.json "config": {"wellness_backfill": "<frühester abgefragter Tag>"}. Ist «fertig» true, nichts mehr nachholen.
"""
import argparse
import datetime as dt
import json
import sys

V = "wellness-1.0"
AB = "2020-01-01"
READINESS_AB = "2024-08-01"          # geprüft am 13.11.2026: 15.8.2024 ohne, 15.9.2024 mit Readiness
JE_NACHT = 10
FELDER = ("readiness", "readinessLevel", "bodyBattery", "bbSleep", "bbHigh", "bbLow", "stress", "stressHighMin", "sleepStress")


def _wert(x):
    return x if isinstance(x, (int, float)) and not isinstance(x, bool) and x >= 0 else None


def aus_readiness(r):
    """Antwort von get_morning_training_readiness → Tagesfelder (leer, wenn Garmin keine Readiness hat)."""
    if not isinstance(r, dict) or _wert(r.get("score")) is None:
        return {}
    out = {"readiness": int(r["score"])}
    if r.get("level"):
        out["readinessLevel"] = str(r["level"])
    return out


def aus_summary(s, abgeschlossen=True):
    """Antwort von get_user_summary → Tagesfelder; Stress und Höchst-/Tiefstwerte nur für abgeschlossene Tage."""
    if not isinstance(s, dict):
        return {}
    out = {"bodyBattery": _wert(s.get("bodyBatteryAtWakeTime")), "bbSleep": _wert(s.get("bodyBatteryDuringSleep"))}
    if abgeschlossen:
        hs = _wert(s.get("highStressDuration"))
        out.update({"stress": _wert(s.get("averageStressLevel")), "stressHighMin": round(hs / 60) if hs is not None else None,
                    "bbHigh": _wert(s.get("bodyBatteryHighestValue")), "bbLow": _wert(s.get("bodyBatteryLowestValue"))})
    return {k: int(v) if isinstance(v, float) and v.is_integer() else v for k, v in out.items() if v is not None}


def offen(D, heute, n=JE_NACHT):
    """Tage für das Nachholen in dieser Nacht: vor dem Zeiger config.wellness_backfill (fehlt er: vor gestern), nie vor 2020-01-01."""
    zeiger = (D.get("config") or {}).get("wellness_backfill") or (dt.date.fromisoformat(heute) - dt.timedelta(days=1)).isoformat()
    if zeiger <= AB:
        return {"tage": [], "readiness": [], "fertig": True}
    z = dt.date.fromisoformat(zeiger)
    tage = [(z - dt.timedelta(days=i)).isoformat() for i in range(1, n + 1)]
    tage = [t for t in tage if t >= AB]
    return {"tage": tage, "readiness": [t for t in tage if t >= READINESS_AB], "fertig": False, "neuer_zeiger": min(tage)}


def main():
    ap = argparse.ArgumentParser(description="Garmin-Tageswerte rückwirkend: welche Tage diese Nacht")
    ap.add_argument("befehl", choices=["offen"])
    ap.add_argument("data")
    ap.add_argument("--heute", default=dt.date.today().isoformat())
    ap.add_argument("--max", type=int, default=JE_NACHT)
    a = ap.parse_args()
    print(json.dumps(offen(json.load(open(a.data, encoding="utf-8")), a.heute, a.max)))


if __name__ == "__main__":
    sys.exit(main())
