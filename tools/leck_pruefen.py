"""Leck-Prüfung vor jedem Push (Audit V6.4 C, N7): sucht in allen getrackten Textdateien nach Werten aus den echten Daten.

Ausgabe nur Fundort (Datei:Zeile) und Art – nie den Wert selbst. Exit 1 bei Funden.
Aufruf (Passwort nur aus dem Auftrag, nie ausgeben):
  SPUREN_PW=… node tools/crypt.mjs decrypt data.enc.json work/data.json
  python3 -I tools/leck_pruefen.py work/data.json
  rm work/data.json

Geprüft (getrackte und neue, nicht ignorierte Dateien): Aktivitäts- und Workout-IDs, Zonentexte und Zonengrenzen (mehrere einer Skala in einer Zeile), Schwellen (LT1/LT2, FTP, LTHR)
neben ihrem Stichwort, Distanzen mit Datum, Testtermine und Abwesenheiten mit Datum, E-Mail-Adressen. Ausgenommen: verschlüsselte
Dateien (data.enc.json, serien/, eingang/), Bilder und die BRouter-Testdaten (tests/fixtures/, OSM-Testgebiet).
"""
import json
import re
import subprocess
import sys

AUSNAHMEN = re.compile(r"^(data\.enc\.json|serien/|eingang/|tests/fixtures/)|\.(png|jpg|jpeg|bin|ico|gz)$")
STICHWORT_SCHWELLE = re.compile(r"LT1|LT2|FTP|LTHR|Schwelle|schwelle|ftp|lt2|lt1", re.I)
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
EMAIL_OK = {"noreply@anthropic.com"}
EMAIL_DOMAIN_OK = (".invalid", "@example.com", "@example.org")


def _zahl(x, n=0):
    return f"{float(x):.{n}f}" if isinstance(x, (int, float)) and not isinstance(x, bool) else None


def _pace(s):
    s = int(round(float(s)))
    return f"{s // 60}:{s % 60:02d}"


def _datumsformen(iso):
    """2026-11-19 → {'2026-11-19', '19.11.2026', '19.11.'}"""
    y, m, d = iso[:10].split("-")
    return {iso[:10], f"{int(d)}.{int(m)}.{y}", f"{int(d)}.{int(m)}."}


def merkmale(D):
    M = {"ids": set(), "ztexte": set(), "skalen": [], "schwellen": set(), "km_datum": [], "termine": []}
    for a in D.get("activities") or []:
        for k in ("id", "gid"):
            M["ids"].update(re.findall(r"\d{9,19}", str(a.get(k) or "")))
        km = a.get("km")
        if isinstance(km, float) and km >= 3 and a.get("date") and len(repr(km).split(".")[1]) >= 2:
            M["km_datum"].append(({f"{km:.2f}", f"{km:.2f}".replace(".", ",")}, _datumsformen(a["date"])))
    for p in (D.get("planned") or []) + (D.get("workouts_neu") or []):
        if str(p.get("wid") or "").isdigit() and len(str(p["wid"])) >= 6:
            M["ids"].add(str(p["wid"]))
    for z in D.get("zonen") or []:
        for s in z.get("skalen") or []:
            werte = set()
            for zz in s.get("zonen") or []:
                for k in ("von", "bis"):
                    v = zz.get(k)
                    if isinstance(v, (int, float)):
                        werte.add(_pace(v) if s.get("unit") == "s/km" or s.get("metrik") == "pace" else str(int(round(v))))
                t = zz.get("text")
                if t and len(t) >= 6:
                    M["ztexte"].update({t, t.replace("–", "-")})
            if werte:
                M["skalen"].append((s.get("key") or "?", werte))
    def schwelle(v):
        # nur Werte, die etwas verraten: ganze Zahlen nicht auf 5 gerundet, oder mit Nachkommastelle (runde Werte kommen in Tests ständig vor)
        if not isinstance(v, (int, float)) or isinstance(v, bool) or v < 50:
            return
        x0, x1 = _zahl(v, 0), _zahl(v, 1)
        if int(x0) % 5:
            M["schwellen"].add(x0)
        if not x1.endswith(".0"):
            M["schwellen"].update({x1, x1.replace(".", ",")})
    for t in (D.get("schwellen") or {}).get("tests") or []:
        for k in ("lt1", "lt2"):
            o = t.get(k) or {}
            for kk in ("x", "lo", "hi", "w", "wert", "mitte"):
                schwelle(o.get(kk))
    cfg = D.get("config") or {}
    schwelle(cfg.get("ftp"))
    for r in (cfg.get("last_ref") or {}).get("rad") or []:
        schwelle(r.get("lt2_w")); schwelle(r.get("lt2_genau_w"))
    for v in (cfg.get("lthr") or {}).values():
        schwelle(v)
    for t in D.get("tests") or []:
        if t.get("date") and t.get("note") and len(t["note"]) >= 5:
            M["termine"].append((t["note"], _datumsformen(t["date"])))
    try:
        sp = json.loads(((D.get("notizen") or {}).get("tp-sperren")) or "[]")
    except (TypeError, ValueError):
        sp = []
    for s in sp if isinstance(sp, list) else []:
        if isinstance(s, dict) and s.get("von"):
            M["termine"].append((s.get("grund") or "", _datumsformen(s["von"]) | (_datumsformen(s["bis"]) if s.get("bis") else set())))
    M["km_alle"] = set().union(*[k for k, _ in M["km_datum"]]) if M["km_datum"] else set()
    # nur volle Daten (JJJJ-MM-TT oder T.M.JJJJ) lösen die Termin-Prüfung aus; «T.M.» allein wäre zu häufig
    M["termin_daten"] = {d for _, ds in M["termine"] for d in ds if len(d) >= 8}
    return M


ZIFFERN = re.compile(r"(?<![\w.:,])\d+(?:[.,]\d+)?(?![\w:]|[.,]\d)|(?<![\w:])\d{1,2}:\d{2}(?![\w:])")


def tokens(zeile):
    """Zahlen und Zeiten einer Zeile als Menge (mit Punkt und Komma) – schnelle Mengen-Abfrage statt eines Musters je Wert."""
    out = set()
    for t in ZIFFERN.findall(zeile):
        out.add(t)
        out.add(t.replace(",", "."))
        out.add(t.replace(".", ","))
    return out


def pruefen(datei, text, M):
    funde = []
    zeilen = text.splitlines()
    for i, z in enumerate(zeilen, 1):
        T = tokens(z)
        if (T | set(re.findall(r"\d{9,19}", z))) & M["ids"]:                # IDs auch mit Vorsatz («g…»)
            funde.append((datei, i, "Aktivitäts- oder Workout-ID"))
        if M["ztexte"] and any(t in z for t in M["ztexte"]):
            funde.append((datei, i, "Zonentext aus dem Profil"))
        for key, werte in M["skalen"]:
            n = len(T & werte)
            if n >= 3:
                funde.append((datei, i, f"Zonengrenzen ({key}, {n} in einer Zeile)"))
        if T & M["schwellen"] and STICHWORT_SCHWELLE.search(z):
            funde.append((datei, i, "Schwelle/FTP neben dem Stichwort"))
        if T & M["km_alle"]:
            umfeld = " ".join(zeilen[max(0, i - 3):i + 2])
            for kms, daten in M["km_datum"]:
                if T & kms and any(d in umfeld for d in daten):
                    funde.append((datei, i, "Distanz mit Datum"))
                    break
        if M["termin_daten"] and any(d in z for d in M["termin_daten"]):
            umfeld = " ".join(zeilen[max(0, i - 3):i + 2])
            for note, daten in M["termine"]:
                if any(d in z for d in daten) and (not note or note in umfeld):
                    funde.append((datei, i, "Testtermin oder Abwesenheit mit Datum"))
                    break
        if "@" in z:
            for e in EMAIL.findall(z):
                if e.lower() not in EMAIL_OK and not e.lower().endswith(EMAIL_DOMAIN_OK):
                    funde.append((datei, i, "E-Mail-Adresse"))
    return funde


def main(pfad):
    D = json.load(open(pfad, encoding="utf-8"))
    M = merkmale(D)
    dateien = [f for f in subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"], capture_output=True, text=True, check=True).stdout.splitlines() if not AUSNAHMEN.search(f)]
    funde = []
    for f in dateien:
        try:
            text = open(f, encoding="utf-8").read()
        except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError):
            continue
        funde += pruefen(f, text, M)
    for f, i, art in funde:
        print(f"{f}:{i}: {art}")
    print(f"LECK-PRÜFUNG: {'bestanden' if not funde else f'{len(funde)} Fund(e)'} ({len(dateien)} Dateien, Werte nie ausgegeben)")
    return 1 if funde else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
