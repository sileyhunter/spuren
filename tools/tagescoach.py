"""V8.3 Tagescoach (tagescoach-1.0, seit V8.4 tagescoach-1.1 mit «ausgefallen», «schmerz», «umfang»): Entscheide zu Vorschlägen des Coaches prüfen – gleiche Regeln wie V83.eintragPruefen in js/v83.js.

Ein Entscheid kommt von der Seite (Eingabe «tagescoach» → tagescoach_add → coach_entscheide): angenommen (mit Rückweg und Markierung),
abgelehnt oder zurückgeholt. Die Änderung an Mein Plan selbst kommt getrennt als «planwoche» und wird dort geprüft (planwoche_pruefen);
hier wird nur die Form des Entscheids geprüft (die Einheiten im Rückweg prüft die Seite mit V66.einheitPruefen, bevor sie sie anwendet)."""
import datetime as dt
import re

ID_RE = re.compile(r"^co-(\d{4}-\d{2}-\d{2})-(morgen|last|zeit|nachholen|ausgefallen|schmerz|umfang)-([A-Za-z0-9_.:-]{1,80})$")
UID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,80}$")
STATUS = ("angenommen", "abgelehnt", "zurueck")
ARTEN = ("tauschen", "locker", "kurz", "nachholen", "verlaengern", "weglassen", "rad")
AKTIONEN = ("verschieben", "ersetzen", "dauer", "entfernen", "hinzufuegen")
QUELLEN = ("vorschlag", "eigen", "bibliothek")


def _iso(s):
    try:
        return dt.date.fromisoformat(str(s)) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(s or "")) else None
    except ValueError:
        return None


def _einheit(e):
    """Form einer gespeicherten Einheit im Rückweg (wie in plan_woche)."""
    if not isinstance(e, dict):
        return "ungültige Einheit"
    if e.get("quelle", "eigen") not in QUELLEN:
        return "unbekannte Quelle"
    d = e.get("dauer")
    if isinstance(d, bool) or not isinstance(d, (int, float)) or not 5 <= d <= 600:
        return "Dauer ausserhalb 5–600 min"
    if e.get("quelle") == "bibliothek":
        if isinstance(e.get("wid"), bool) or not isinstance(e.get("wid"), int) or e.get("sport") not in ("rad", "lauf", "schwimm"):
            return "Bibliothek ohne Workout oder Sportart"
    elif not re.fullmatch(r"[a-z0-9_]{1,40}", str(e.get("vorlage") or "")):
        return "unbekannte Vorlage"
    return None


def aktion_pruefen(a):
    if not isinstance(a, dict) or a.get("art") not in AKTIONEN:
        return "unbekannte Änderung"
    if not _iso(a.get("date")):
        return "Änderung ohne Datum"
    if a["art"] != "hinzufuegen" and not UID_RE.match(str(a.get("uid") or "")):
        return "Änderung ohne Einheit"
    if a["art"] == "verschieben" and not _iso(a.get("nach")):
        return "Verschieben ohne Ziel"
    if a["art"] == "dauer":
        d = a.get("dauer")
        if isinstance(d, bool) or not isinstance(d, int) or not 5 <= d <= 600:
            return "Dauer 5–600 min"
    if a["art"] in ("ersetzen", "hinzufuegen"):
        f = _einheit(a.get("einheit"))
        if f:
            return "ungültige Einheit" if f == "ungültige Einheit" else f
    return None


def pruefen(e):
    """Entscheid → Fehlertext oder None."""
    if not isinstance(e, dict):
        return "kein Eintrag"
    m = ID_RE.match(str(e.get("id") or ""))
    if not m:
        return "ID «co-<Datum>-<Anlass>-<Einheit>»"
    if e.get("date") != m.group(1) or e.get("anlass") != m.group(2) or not _iso(e.get("date")):
        return "Datum oder Anlass passt nicht zur ID"
    if e.get("status") not in STATUS:
        return "unbekannter Status"
    am = e.get("am")
    if not isinstance(am, str):
        return "ohne Zeitpunkt"
    try:
        dt.datetime.fromisoformat(am.replace("Z", "+00:00"))
    except ValueError:
        return "ohne Zeitpunkt"
    t = e.get("titel")
    if not isinstance(t, str) or not t or len(t) > 200:
        return "Titel 1–200 Zeichen"
    if e["status"] == "angenommen":
        if e.get("art") not in ARTEN:
            return "unbekannte Art"
        w = _iso(e.get("woche"))
        if not w or w.weekday() != 0:
            return "Woche (Montag) fehlt"
        r = e.get("rueck")
        if not isinstance(r, list) or not 1 <= len(r) <= 8:
            return "Rückweg fehlt"
        for a in r:
            f = aktion_pruefen(a)
            if f:
                return "Rückweg: " + f
        mk = e.get("markiert")
        if not isinstance(mk, list) or len(mk) > 8 or any(not isinstance(x, dict) or not _iso(x.get("date")) or not UID_RE.match(str(x.get("uid") or ""))
                                                          or not isinstance(x.get("vorher"), str) or len(x["vorher"]) > 200 for x in mk):
            return "Markierung ungültig"
    return None
