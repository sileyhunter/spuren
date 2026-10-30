"""Minimaler, schneller FIT-Decoder (nur was für die Auswertung gebraucht wird)."""
import math
import struct

# Basistyp-Nummer -> (struct-Zeichen, Grösse, ungültiger Wert)
BASE = {
    0: ("B", 1, 0xFF), 1: ("b", 1, 0x7F), 2: ("B", 1, 0xFF), 3: ("h", 2, 0x7FFF), 4: ("H", 2, 0xFFFF),
    5: ("i", 4, 0x7FFFFFFF), 6: ("I", 4, 0xFFFFFFFF), 7: ("s", 1, None), 8: ("f", 4, "nan"), 9: ("d", 8, "nan"),
    10: ("B", 1, 0), 11: ("H", 2, 0), 12: ("I", 4, 0), 13: ("s", 1, None), 14: ("q", 8, 0x7FFFFFFFFFFFFFFF),
    15: ("Q", 8, 0xFFFFFFFFFFFFFFFF), 16: ("Q", 8, 0),
}
FIT_EPOCH = 631065600  # 1989-12-31T00:00:00Z in Unix-Sekunden


class FitError(Exception):
    pass


class _Def:
    __slots__ = ("gnum", "size", "st", "fields", "ts_off", "endian")


def _build_def(gnum, endian, fields, devsize, want_fields):
    d = _Def()
    d.gnum = gnum
    d.endian = endian
    d.size = sum(f[1] for f in fields) + devsize
    d.ts_off = None
    off = 0
    for fnum, fsize, bt in fields:
        if fnum == 253 and fsize == 4:
            d.ts_off = off
        off += fsize
    if want_fields is False:  # Nachricht wird nicht gebraucht
        d.st = None
        d.fields = None
        return d
    parts, mapping = [], []
    for fnum, fsize, bt in fields:
        if want_fields is not None and fnum not in want_fields:
            parts.append(f"{fsize}x")
            continue
        ch, bsize, inv = BASE.get(bt, ("s", 1, None))
        if ch == "s" or fsize % bsize or fsize == 0:
            parts.append(f"{fsize}s")
            mapping.append((fnum, -1 if bt == 7 else -2, None))
        else:
            cnt = fsize // bsize
            parts.append(f"{cnt}{ch}")
            mapping.append((fnum, cnt, inv))
    if devsize:
        parts.append(f"{devsize}x")
    d.st = struct.Struct(endian + "".join(parts))
    d.fields = mapping
    return d


def _clean(v, inv):
    if inv == "nan":
        return None if (v != v or math.isinf(v)) else v
    return None if v == inv else v


def messages(data, want, stop_when=None):
    """Liefert (globale Nachrichtennummer, {Feldnummer: Wert}) für gewünschte Nachrichten.

    want: {gnum: set(feldnummern) | None (alle Felder)}
    stop_when: optionale Funktion(gnum, msg) -> True beendet das Lesen.
    """
    n = len(data)
    pos = 0
    while pos + 12 <= n:
        hsize = data[pos]
        if hsize not in (12, 14) or data[pos + 8:pos + 12] != b".FIT":
            if pos == 0:
                raise FitError("kein FIT-Kopf")
            return
        data_size = struct.unpack_from("<I", data, pos + 4)[0]
        start = pos + hsize
        end = min(n, start + data_size)
        defs = {}
        last_ts = 0
        p = start
        while p < end:
            h = data[p]
            p += 1
            if h & 0x80:  # komprimierter Zeitstempel
                local = (h >> 5) & 0x3
                off = h & 0x1F
                ts = (last_ts & ~0x1F) + off
                if off < (last_ts & 0x1F):
                    ts += 0x20
                last_ts = ts
                d = defs.get(local)
                if d is None:
                    raise FitError("Daten ohne Definition")
                if p + d.size > end:
                    return
                if d.st is not None:
                    msg = _unpack(d, data, p)
                    msg[253] = ts
                    yield d.gnum, msg
                    if stop_when and stop_when(d.gnum, msg):
                        return
                p += d.size
            elif h & 0x40:  # Definition
                dev = h & 0x20
                local = h & 0x0F
                if p + 5 > end:
                    return
                arch = data[p + 1]
                endian = ">" if arch == 1 else "<"
                gnum = struct.unpack_from(endian + "H", data, p + 2)[0]
                nf = data[p + 4]
                p += 5
                fields = []
                for _ in range(nf):
                    fields.append((data[p], data[p + 1], data[p + 2] & 0x1F))
                    p += 3
                devsize = 0
                if dev:
                    nd = data[p]
                    p += 1
                    for _ in range(nd):
                        devsize += data[p + 1]
                        p += 3
                wf = want.get(gnum, False)
                defs[local] = _build_def(gnum, endian, fields, devsize, wf)
            else:  # normale Datennachricht
                local = h & 0x0F
                d = defs.get(local)
                if d is None:
                    raise FitError("Daten ohne Definition")
                if p + d.size > end:
                    return
                if d.st is not None:
                    msg = _unpack(d, data, p)
                    t = msg.get(253)
                    if t is not None:
                        last_ts = t
                    yield d.gnum, msg
                    if stop_when and stop_when(d.gnum, msg):
                        return
                elif d.ts_off is not None:
                    last_ts = struct.unpack_from(d.endian + "I", data, p + d.ts_off)[0]
                p += d.size
        pos = end + 2  # CRC überspringen, evtl. verkettete Datei


def _unpack(d, data, p):
    vals = d.st.unpack_from(data, p)
    msg = {}
    i = 0
    for fnum, cnt, inv in d.fields:
        if cnt == 1:
            msg[fnum] = _clean(vals[i], inv)
            i += 1
        elif cnt > 1:
            arr = vals[i:i + cnt]
            msg[fnum] = tuple(_clean(v, inv) for v in arr)
            i += cnt
        else:
            raw = vals[i]
            i += 1
            if cnt == -1:
                msg[fnum] = raw.split(b"\x00", 1)[0].decode("utf-8", "ignore")
            else:
                msg[fnum] = raw
    return msg


def file_id(data):
    """Gibt die file_id-Nachricht zurück (Typ, Hersteller, Produkt, Erstellzeit)."""
    for gnum, msg in messages(data, {0: None}, stop_when=lambda g, m: g == 0):
        return msg
    return None
