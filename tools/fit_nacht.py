"""Nacht-Update (Umsetzungsplan A2): Sekundenwerte einer neuen Aktivität aus der Garmin-Verbindung auswerten,
genau wie beim Monatsexport (series.py + kennzahlen.py).

Aufruf (je Aktivität):
  python3 -I tools/fit_nacht.py <garmin_id> <datei_fit_data> [<datei_fit_messages>] >> work/fit.jsonl

<datei_fit_data>      gespeicherte Antwort von get_activity_fit_data(activity_id, include_records=true)
<datei_fit_messages>  optional: gespeicherte Antwort von get_activity_fit_messages(activity_id,
                      message_types=["file_id","lap","length","event","workout","workout_step","zones_target"], message_limit=5000)
Ausgabe: eine JSON-Zeile {"garmin_id", "ok", "fit": {el, mv, st, nst, un, rc, ac, us, hh, np, pdc, stufen?}, "v": {...}}
Fehlt eine Datei oder ist sie unlesbar, steht "ok": false mit Grund; merge_daily.py führt darüber das Protokoll.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kennzahlen  # noqa: E402
import series  # noqa: E402
import serien  # noqa: E402   V5.6: Reihe für den Explorer, Workout-Abgleich, Ermüdungsresistenz


def main():
    gid = sys.argv[1]
    try:
        S_list = series.from_garmin(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
        S = S_list[0]
        if len(S.ts) < 2 and not S.lengths:          # Becken ohne Puls: Bahnen reichen für die Zeitbegriffe
            raise ValueError("keine Sekundenwerte und keine Bahnen in der Antwort")
        f, _ = kennzahlen.alles(S)
        if f.get("stufen"):
            st = f["stufen"]
            for s in st["stufen"]:
                s.pop("t0", None)
                s.pop("t1", None)
        # V5.6: gleiche Auswertung wie tools/serien.py (Monatsexport); Reihe nach work/serien/g<ID>.json (danach serien_crypt.mjs)
        W = serien.workout_garmin(sys.argv[3]) if len(sys.argv) > 3 else None
        sport = S.category
        ser = serien.reihe_schreiben(S, W, "g" + str(gid), sport, "work/serien")
        if ser:
            f["ser"] = ser
        wk = serien.abgleich(S, W)
        if wk:
            f["wk"] = wk
        fr = serien.ermuedung(S, sport, f.get("mv") or S.timer)
        if fr:
            f["fr"] = fr
        out = {"garmin_id": int(gid), "ok": True, "records": len(S.ts), "fit": f,
               "v": {**{k: v["v"] for k, v in kennzahlen.VERSIONS.items()}, **serien.VERSIONS}}
    except Exception as e:  # Protokoll statt Abbruch
        out = {"garmin_id": int(gid) if gid.isdigit() else gid, "ok": False, "grund": f"{type(e).__name__}: {e}"}
    print(json.dumps(out, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
