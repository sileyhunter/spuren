"""zwift-nacht-1.0 (V9.26.0; Silas 26.11.2026: «jeden Abend um 23 soll die Einheit gesendet werden … Rad auf Zwift, alles andere auf Garmin»):
Rad-Einheiten aus «Mein Plan» gehen im Nacht-Update über Intervals.icu nach Zwift.

Die Seite hängt an jede Rad-Einheit eines Garmin-Auftrags (garmin_auftraege) den fertigen Eintrag für Intervals.icu (`zwift`: eintrag, fassung). Dieses Werkzeug
nimmt die Aufträge von heute und morgen (nicht «aus»), vergleicht mit den Vermerken in `plan_zwift` (external_id, Tag, Fassung) und schickt, was neu oder
anders ist, in einer Anfrage an `POST /api/v1/athlete/<id>/events/bulk?upsert=true` (gleiche external_id = ersetzt statt doppelt; ein verschobener Tag
ändert den Tag desselben Eintrags). Der Schlüssel kommt nur aus der Umgebungsvariable INTERVALS_API_KEY (nie in Dateien, nie ins Repository), die
Athleten-ID optional aus INTERVALS_ATHLETE (sonst «0» = eigenes Konto). Entfernte Einheiten werden nicht aus Intervals.icu gelöscht (nur ersetzt).

  INTERVALS_API_KEY=… python3 -I tools/zwift_senden.py lauf work/data.json [--jetzt 2026-11-26T23:05]     # planen, senden, eintragen (atomar)
  python3 -I tools/zwift_senden.py plan work/data.json [--jetzt …]                                          # nur rechnen
"""
import base64
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
import zoneinfo

V = "zwift-nacht-1.0"
TZ = zoneinfo.ZoneInfo("Europe/Zurich")
URL = "https://intervals.icu/api/v1/athlete/{id}/events/bulk?upsert=true"
TAGE = 1                                   # heute und morgen


def _jetzt(arg=None):
    if arg:
        t = dt.datetime.fromisoformat(arg)
        return t if t.tzinfo else t.replace(tzinfo=TZ)
    return dt.datetime.now(TZ)


def plan(D, jetzt):
    """→ {"v", "jetzt", "aktionen": [{nr, external_id, date, titel, fassung, eintrag}]} für Aufträge von heute bis morgen mit neuem oder geändertem Zwift-Eintrag."""
    heute = jetzt.astimezone(TZ).date()
    bis = heute + dt.timedelta(days=TAGE)
    schon = {x.get("external_id"): x for x in D.get("plan_zwift") or [] if isinstance(x, dict)}
    out, gesehen = [], set()
    for a in sorted((x for x in D.get("garmin_auftraege") or [] if isinstance(x, dict)), key=lambda x: str(x.get("date"))):
        try:
            d = dt.date.fromisoformat(str(a.get("date")))
        except ValueError:
            continue
        if not heute <= d <= bis or a.get("modus") == "aus":
            continue
        for u in a.get("einheiten") or []:
            z = u.get("zwift") if isinstance(u, dict) else None
            if not isinstance(z, dict) or not isinstance(z.get("eintrag"), dict):
                continue
            ext = z["eintrag"].get("external_id")
            if not ext or ext in gesehen:
                continue
            gesehen.add(ext)
            alt = schon.get(ext)
            if alt and alt.get("fassung") == z.get("fassung") and alt.get("date") == d.isoformat():
                continue
            out.append({"nr": len(out) + 1, "external_id": ext, "date": d.isoformat(), "titel": u.get("titel"), "fassung": z.get("fassung"), "eintrag": z["eintrag"]})
    return {"v": V, "jetzt": jetzt.astimezone(TZ).isoformat(timespec="seconds"), "aktionen": out}


def _post(url, key, body):
    """→ (Statuscode, Text). Fehler im Netz → (0, Meldung)."""
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST", headers={
        "Content-Type": "application/json", "Authorization": "Basic " + base64.b64encode(("API_KEY:" + key).encode()).decode()})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")[:300]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:300]
    except (urllib.error.URLError, OSError) as e:
        return 0, str(e)[:200]


def senden(P, key, athlet="0", post=None):
    """Alle Aktionen in einer Anfrage; Intervals.icu kennt «indoor» evtl. nicht (400/422) → noch einmal ohne. → {"ok": bool, "status": int, "meldung": str}."""
    post = post or _post
    if not P["aktionen"]:
        return {"ok": True, "status": 0, "meldung": "nichts zu senden"}
    url = URL.format(id=athlet or "0")
    st, txt = post(url, key, [x["eintrag"] for x in P["aktionen"]])
    if st in (400, 422):
        st, txt = post(url, key, [{k: v for k, v in x["eintrag"].items() if k != "indoor"} for x in P["aktionen"]])
    if st in (401, 403):
        return {"ok": False, "status": st, "meldung": "Intervals.icu lehnt den Schlüssel ab"}
    if st == 0:
        return {"ok": False, "status": 0, "meldung": "Intervals.icu nicht erreichbar (" + txt + ")"}
    if not 200 <= st < 300:
        return {"ok": False, "status": st, "meldung": f"Intervals.icu antwortet mit Fehler {st}"}
    return {"ok": True, "status": st, "meldung": "gesendet"}


def eintragen(D, P, E, jetzt):
    """Ergebnis eintragen (nur bei Erfolg): plan_zwift = Vermerk je external_id; Liste auf 60 jüngste begrenzt. → Meldungen."""
    zeit = jetzt.astimezone(TZ).isoformat(timespec="seconds")
    if not E.get("ok"):
        return [f"Zwift nicht gesendet: {E.get('meldung')}"] if P["aktionen"] else []
    L = D.setdefault("plan_zwift", [])
    for x in P["aktionen"]:
        neu = {"external_id": x["external_id"], "date": x["date"], "fassung": x["fassung"], "gesendet": zeit}
        i = next((k for k, y in enumerate(L) if isinstance(y, dict) and y.get("external_id") == x["external_id"]), None)
        if i is None:
            L.append(neu)
        else:
            L[i] = neu
    L.sort(key=lambda y: str(y.get("gesendet")))
    del L[:-60]
    return [f"{x['date']} {x['titel']}" for x in P["aktionen"]]


def main(argv):
    if len(argv) >= 3 and argv[1] in ("plan", "lauf"):
        jetzt = _jetzt(argv[argv.index("--jetzt") + 1] if "--jetzt" in argv else None)
        D = json.load(open(argv[2], encoding="utf-8"))
        P = plan(D, jetzt)
        if argv[1] == "plan":
            print(json.dumps(P, ensure_ascii=False, indent=1))
            return 0
        key = os.environ.get("INTERVALS_API_KEY", "").strip()
        if not P["aktionen"]:
            print("ZWIFT: nichts zu senden")
            return 0
        if not key:
            print("ZWIFT FEHLER: Schlüssel fehlt (INTERVALS_API_KEY)")
            return 1
        E = senden(P, key, os.environ.get("INTERVALS_ATHLETE", "0").strip() or "0")
        msg = eintragen(D, P, E, jetzt)
        if E["ok"]:
            tmp = argv[2] + ".tmp"                      # atomar schreiben: bricht etwas ab, bleibt data.json wie vorher
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(D, f, ensure_ascii=False, separators=(",", ":"))
            os.replace(tmp, argv[2])
            print("ZWIFT: gesendet " + "; ".join(msg))
            return 0
        print("ZWIFT FEHLER:", "; ".join(msg))
        return 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
