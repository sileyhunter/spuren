"""Garmin-Ernährungsprotokoll (V5.7.2): Einträge je Tag übernehmen und Einnahmen während einer Aktivität ins Fueling übertragen.

Quelle: Tagesprotokoll der Garmin-Verbindung (get_nutrition_daily_food_log, Einträge mit Uhrzeit «mealTime» und Erfassungszeit
«logTimestamp»), Trinken je Tag (get_hydration_data). Im Nacht-Update kompakt unter "food_logs" in work/new.json (Format: CLAUDE.md).

Regeln (fueling-garmin-1.0)
- Ein Tag zählt nur, wenn die Summe der Einträge (je Eintrag gerundet wie bei Garmin) die Tageswerte trifft (KH ±1 g, kcal ±2):
  sonst «abweichend» und ohne Zuordnung (schützt vor unvollständigen oder falsch übertragenen Tagen).
- Zuordnung zu einer Aktivität nur über die Uhrzeit des Eintrags: zwischen Start und Ende (Startzeit + Gesamtzeit inkl. Pausen).
  Nachgewiesen = erst nach dieser Uhrzeit erfasst (nachträglich protokolliert). Vorher erfasst (geplant) oder ohne Uhrzeit = unsicher,
  wird angezeigt, aber nie mitgezählt. Tages- oder Mahlzeitensummen werden nie einer Aktivität zugeordnet.
- Nur Rad und Laufen ab 40 min (wie das Fueling-Protokoll); z. B. ein Proteinshake am Ende eines Krafttrainings ist kein Fueling.
- Ergebnis: Fueling-Eintrag «fg-<Aktivität>» (Quelle Garmin). Ein manueller Eintrag zur selben Aktivität hat Vorrang: der Garmin-Eintrag
  wird dann nicht angelegt (Hinweis). Ein auf der Seite bearbeiteter Garmin-Eintrag («geaendert») wird nie überschrieben.
- Mengen werden nie geschätzt: fehlt ein Wert (z. B. Natrium beim Gel, Flüssigkeit), bleibt er unbekannt.
"""
import datetime as dt
import math
import zoneinfo

ZRH = zoneinfo.ZoneInfo("Europe/Zurich")
QUELLE = "Garmin Connect (Ernährungsprotokoll)"
SPORTARTEN, MIN_DAUER_S = ("rad", "lauf"), 2400       # wie das Fueling-Protokoll der Seite (Train your Gut): Rad und Laufen ab 40 min
V = "fueling-garmin-1.0"
FELDER = ("logId", "foodName", "brandName", "servingQty", "numberOfUnits", "servingUnit", "calories", "carbs", "sodium", "mealName", "mealTime", "logTimestamp")


def _rund(x):
    """Rundung wie in Garmins Mahlzeiten- und Tagessummen (je Eintrag, halbe aufwärts)."""
    return math.floor(x + 0.5)


def kompakt(antwort, trinken=None):
    """Antwort von get_nutrition_daily_food_log (und optional get_hydration_data) → Format von "food_logs" in work/new.json."""
    items, seen = [], set()
    for m in antwort.get("mealDetails") or []:
        for f in m.get("loggedFoods") or []:
            if f.get("logId") in seen:
                continue
            seen.add(f.get("logId"))
            md, nc = f.get("foodMetaData") or {}, f.get("nutritionContent") or {}
            items.append({"logId": f.get("logId"), "foodName": md.get("foodName"), "brandName": md.get("brandName"), "servingQty": f.get("servingQty"),
                          "numberOfUnits": nc.get("numberOfUnits"), "servingUnit": nc.get("servingUnit"), "calories": nc.get("calories"),
                          "carbs": nc.get("carbs"), "sodium": nc.get("sodium"), "mealName": (m.get("meal") or {}).get("mealName"),
                          "mealTime": f.get("mealTime"), "logTimestamp": f.get("logTimestamp")})
    c = antwort.get("dailyNutritionContent") or {}
    out = {"date": antwort.get("mealDate"), "dailyCalories": c.get("calories"), "dailyCarbs": c.get("carbs"), "items": items}
    if trinken:
        out["hydration"] = {k: trinken.get(k) for k in ("valueInML", "activityIntakeInML", "sweatLossInML", "lastEntryTimestampLocal")}
    return out


def pruefen(tag):
    """Summen der Einträge gegen die Tageswerte von Garmin."""
    it = tag.get("items") or []
    try:
        kh = sum(_rund((i.get("servingQty") or 0) * (i.get("carbs") or 0)) for i in it)
        kc = sum(_rund((i.get("servingQty") or 0) * (i.get("calories") or 0)) for i in it)
    except TypeError:
        return "abweichend", "Einträge unlesbar"
    soll_kh, soll_kc = tag.get("dailyCarbs"), tag.get("dailyCalories")
    if soll_kh is None or soll_kc is None:
        return "abweichend", "Tageswerte fehlen"
    if abs(kh - soll_kh) <= 1 and abs(kc - soll_kc) <= 2:
        return "ok", f"{len(it)} Einträge, {kh} g KH, {kc} kcal = Tageswerte"
    return "abweichend", f"Summe der Einträge {kh} g KH / {kc} kcal, Tageswerte {soll_kh} g / {soll_kc} kcal"


def einlesen(D, food_logs, abgerufen=None):
    """Tage aus "food_logs" in D["ernaehrung_garmin"] (verschlüsselt in data.enc.json); geänderte Tage ersetzen, alte Fassung ins Audit."""
    E = D.setdefault("ernaehrung_garmin", {})
    n = 0
    for t in food_logs or []:
        if not t or not t.get("date"):
            continue
        items = [{k: i.get(k) for k in FELDER} for i in t.get("items") or []]
        tag = {"date": t["date"], "dailyCalories": t.get("dailyCalories"), "dailyCarbs": t.get("dailyCarbs"), "items": items}
        if t.get("hydration"):
            tag["hydration"] = t["hydration"]
        tag["pruefung"], tag["pruefung_text"] = pruefen(tag)
        alt = E.get(t["date"])
        if alt and {k: v for k, v in alt.items() if k != "abgerufen"} == tag:
            continue
        if alt:
            D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Garmin-Ernährung ersetzt", "id": t["date"], "alt": alt})
        tag["abgerufen"] = abgerufen or dt.date.today().isoformat()
        E[t["date"]] = tag
        n += 1
    return n


def _zeit(datum, hms):
    if not datum or not hms:
        return None
    try:
        return dt.datetime.fromisoformat(f"{datum}T{hms}").replace(tzinfo=ZRH)
    except ValueError:
        return None


def _utc(ts):
    if not ts:
        return None
    try:
        return dt.datetime.fromisoformat(str(ts).replace("Z", "+00:00")).astimezone(ZRH)
    except ValueError:
        return None


def fenster(a):
    """Start und Ende einer Aktivität (Ortszeit): Start aus t0 (Sekunden) oder Datum + «HH:MM»; Ende = Start + Gesamtzeit inkl. Pausen."""
    if a.get("t0"):
        s = dt.datetime.fromtimestamp(a["t0"], ZRH)
    else:
        s = _zeit(a.get("date"), (a.get("start") or "") + ":00" if a.get("start") and len(a.get("start")) == 5 else a.get("start"))
    d = a.get("el") or a.get("dur") or a.get("mv")
    if not s or not d:
        return None
    return s, s + dt.timedelta(seconds=float(d))


def _ereignis(i, t, start, erfasst):
    q, u, n = i.get("servingQty") or 0, i.get("servingUnit"), i.get("numberOfUnits")
    if u in ("G", "ML") and isinstance(n, (int, float)):
        menge = f"{q * n:g} {'g' if u == 'G' else 'ml'}"
    else:
        menge = f"{q:g} Portion{'' if q == 1 else 'en'}" + (f" à {n:g}" if isinstance(n, (int, float)) and n != 1 else "")
    return {"t_min": round((t - start).total_seconds() / 60), "uhrzeit": t.strftime("%H:%M"), "produkt": i.get("foodName"), "marke": i.get("brandName"),
            "menge": menge, "kh_g": round(q * i["carbs"], 1) if isinstance(i.get("carbs"), (int, float)) else None,
            "kcal": round(q * i["calories"]) if isinstance(i.get("calories"), (int, float)) else None,
            "natrium_mg": round(q * i["sodium"]) if isinstance(i.get("sodium"), (int, float)) else None,
            "wasser_ml": None, "koffein_mg": None, "quelle": "Garmin", "garmin_log_id": i.get("logId"),
            "erfasst": erfasst.isoformat(timespec="minutes") if erfasst else None}


def fueling_ableiten(D):
    """Fueling-Einträge «fg-<Aktivität>» aus den geprüften Garmin-Tagen; gibt Hinweise zurück (auch in D["ernaehrung_garmin_hinweise"])."""
    E, fu = D.get("ernaehrung_garmin") or {}, D.setdefault("fueling", [])
    hinweise, n_neu = [], 0
    manuell = {e.get("activity_id") for e in fu if e.get("activity_id") and not str(e.get("id", "")).startswith("fg-")}
    for a in D.get("activities") or []:
        tag = E.get(a.get("date"))
        if not tag:
            continue
        if a.get("sport") not in SPORTARTEN or (a.get("mv") or a.get("dur") or 0) < MIN_DAUER_S:
            alt = next((e for e in fu if e.get("id") == "fg-" + str(a["id"])), None)
            if alt and not alt.get("geaendert"):        # früher abgeleitet, Sportart/Dauer passt nicht → entfernen (Audit)
                D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Fueling aus Garmin entfernt (Sportart/Dauer)", "id": alt["id"], "alt": alt})
                fu.remove(alt)
            continue
        w = fenster(a)
        if not w:
            continue
        start, ende = w
        drin, unsicher = [], []
        for i in tag.get("items") or []:
            t = _zeit(a["date"], i.get("mealTime"))
            if t is None or not (start <= t <= ende):
                continue
            erf = _utc(i.get("logTimestamp"))
            (drin if erf and erf >= t else unsicher).append(_ereignis(i, t, start, erf))
        eid, alt = "fg-" + str(a["id"]), next((e for e in fu if e.get("id") == "fg-" + str(a["id"])), None)
        if not drin and not unsicher:
            if alt and not alt.get("geaendert"):        # Einträge in Garmin gelöscht → abgeleiteten Eintrag entfernen (Audit)
                D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Fueling aus Garmin entfernt", "id": eid, "alt": alt})
                fu.remove(alt)
            continue
        if tag.get("pruefung") != "ok":
            hinweise.append({"date": a["date"], "activity_id": a["id"], "text": f"Garmin-Einträge während der Einheit, aber Tag nicht vollständig ({tag.get('pruefung_text')}) – nicht übernommen"})
            continue
        if a["id"] in manuell:
            hinweise.append({"date": a["date"], "activity_id": a["id"], "text": "manueller Fueling-Eintrag vorhanden – Garmin-Einträge nicht übernommen (nichts überschrieben)"})
            continue
        if alt and alt.get("geaendert"):
            hinweise.append({"date": a["date"], "activity_id": a["id"], "text": "auf der Seite bearbeiteter Garmin-Eintrag – nicht überschrieben"})
            continue
        if unsicher:
            hinweise.append({"date": a["date"], "activity_id": a["id"], "text": f"{len(unsicher)} Eintrag/Einträge mit Uhrzeit in der Einheit, aber vorher erfasst (geplant) – nicht mitgezählt"})
        if not drin:
            continue
        neu = {"id": eid, "v": "fueling-1.0", "regel": V, "activity_id": a["id"], "date": a["date"], "sport": a.get("sport"), "status": "protokolliert",
               "quelle": QUELLE, "zuordnung": "Uhrzeit des Eintrags zwischen Start und Ende, nachträglich erfasst",
               "fenster": [start.strftime("%H:%M:%S"), ende.strftime("%H:%M:%S")], "events": sorted(drin, key=lambda e: e["t_min"]),
               "unsicher": sorted(unsicher, key=lambda e: e["t_min"]), "gi": [], "notiz": ""}
        if alt != neu:
            if alt:
                D.setdefault("audit", []).append({"zeit": dt.datetime.now(ZRH).isoformat(timespec="seconds"), "was": "Fueling aus Garmin ersetzt", "id": eid, "alt": alt})
                fu[fu.index(alt)] = neu
            else:
                fu.append(neu)
                n_neu += 1
    D["ernaehrung_garmin_hinweise"] = hinweise[-40:]
    return n_neu, hinweise
