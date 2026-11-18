/* V8.4.1 kompat-1.0 – ältere Browser (Silas' älterer Mac mit Safari 13–15, Rückmeldung vom 18.11.2026).
   Absichtlich in ES5 geschrieben, damit auch ein sehr alter Browser bis zum Hinweis kommt. Wird vor allen anderen Skripten geladen.
   - Ersatz für Array/String/TypedArray.prototype.at und Object.hasOwn (beide erst ab Safari 15.4) und Blob.prototype.arrayBuffer (ab Safari 14).
   - KOMPAT.gunzip(u8): gzip lesen ohne DecompressionStream (erst ab Safari 16.4) – eigener Dekoder nach RFC 1951 (Deflate) und RFC 1952 (gzip),
     prüft CRC-32 und Länge. Schreiben braucht keinen Ersatz: ohne CompressionStream speichert die Seite JSON ohne gzip (eingang-1.0).
   - Hinweis, wenn der Browser die Seite nicht ausführen kann (ohne «?.» und «??», also älter als Safari 13.1), und Anzeige von Skriptfehlern
     in den ersten 20 Sekunden (mit Browser und Version, damit ein Bildschirmfoto reicht). */
(function (G) {
  "use strict";
  var K = { VERSION: "kompat-1.0", fehler: [], zuAlt: false };

  /* ---------------- Ersatzfunktionen ---------------- */
  function def(o, n, f) {
    if (!o || o[n]) return;
    try { Object.defineProperty(o, n, { value: f, writable: true, configurable: true, enumerable: false }); } catch (e) { /* nichts */ }
  }
  function at(i) {
    var n = this.length >>> 0, k = Math.trunc(Number(i)) || 0;
    if (k < 0) k += n;
    return k < 0 || k >= n ? undefined : this[k];
  }
  def(Array.prototype, "at", at);
  def(String.prototype, "at", function (i) { return at.call(String(this), i); });
  try { if (typeof Int8Array !== "undefined") def(Object.getPrototypeOf(Int8Array.prototype), "at", at); } catch (e) { /* nichts */ }
  def(Object, "hasOwn", function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); });
  if (typeof Blob !== "undefined" && typeof FileReader !== "undefined") {
    def(Blob.prototype, "arrayBuffer", function () {
      var b = this;
      return new Promise(function (ok, nok) {
        var r = new FileReader();
        r.onload = function () { ok(r.result); };
        r.onerror = function () { nok(r.error); };
        r.readAsArrayBuffer(b);
      });
    });
  }

  /* ---------------- gzip lesen (RFC 1951/1952) ---------------- */
  var LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  var ORDNUNG = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  /** Kanonischer Huffman-Code aus Codelängen (wie puff.c): Anzahl je Länge und Symbole nach Code geordnet. */
  function huffman(laengen, von, n) {
    var count = new Uint16Array(16), symbol = new Uint16Array(n), offs = new Uint16Array(16), i, links = 1;
    for (i = 0; i < n; i++) count[laengen[von + i]]++;
    for (i = 1; i < 16; i++) { links = links * 2 - count[i]; if (links < 0) throw new Error("gzip beschädigt (Huffman-Code)"); }
    for (i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i];
    for (i = 0; i < n; i++) if (laengen[von + i]) symbol[offs[laengen[von + i]]++] = i;
    return { count: count, symbol: symbol };
  }
  var FEST = null;
  function festeCodes() {
    if (FEST) return FEST;
    var l = new Uint8Array(288), i;
    for (i = 0; i < 144; i++) l[i] = 8;
    for (; i < 256; i++) l[i] = 9;
    for (; i < 280; i++) l[i] = 7;
    for (; i < 288; i++) l[i] = 8;
    var d = new Uint8Array(30); for (i = 0; i < 30; i++) d[i] = 5;
    FEST = { len: huffman(l, 0, 288), dist: huffman(d, 0, 30) };
    return FEST;
  }

  /** Rohes Deflate ab Byte pos → { out: Uint8Array, pos: Byte nach dem letzten Block }. */
  function inflate(src, pos) {
    var bitbuf = 0, bitcnt = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), n = 0;
    function bits(need) {
      var v = bitbuf;
      while (bitcnt < need) {
        if (pos >= src.length) throw new Error("gzip unvollständig");
        v |= src[pos++] << bitcnt; bitcnt += 8;
      }
      bitbuf = v >>> need; bitcnt -= need;
      return v & ((1 << need) - 1);
    }
    function platz(k) {
      if (n + k <= out.length) return;
      var neu = new Uint8Array(Math.max(out.length * 2, n + k)); neu.set(out.subarray(0, n)); out = neu;
    }
    function decode(h) {
      var code = 0, first = 0, index = 0, len, c;
      for (len = 1; len < 16; len++) {
        code |= bits(1);
        c = h.count[len];
        if (code - c < first) return h.symbol[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      throw new Error("gzip beschädigt (Code)");
    }
    function bloecke(lc, dc) {
      for (;;) {
        var s = decode(lc);
        if (s < 256) { platz(1); out[n++] = s; continue; }
        if (s === 256) return;
        s -= 257;
        if (s >= 29) throw new Error("gzip beschädigt (Länge)");
        var len = LBASE[s] + bits(LEXT[s]), d = decode(dc);
        if (d >= 30) throw new Error("gzip beschädigt (Distanz)");
        var dist = DBASE[d] + bits(DEXT[d]);
        if (dist > n) throw new Error("gzip beschädigt (Distanz)");
        platz(len);
        for (var k = 0; k < len; k++) { out[n] = out[n - dist]; n++; }
      }
    }
    var letzter = 0;
    while (!letzter) {
      letzter = bits(1);
      var typ = bits(2);
      if (typ === 0) {
        bitbuf = 0; bitcnt = 0;
        if (pos + 4 > src.length) throw new Error("gzip unvollständig");
        var l = src[pos] | (src[pos + 1] << 8), nl = src[pos + 2] | (src[pos + 3] << 8); pos += 4;
        if (l !== (~nl & 0xffff)) throw new Error("gzip beschädigt (Block)");
        if (pos + l > src.length) throw new Error("gzip unvollständig");
        platz(l); out.set(src.subarray(pos, pos + l), n); n += l; pos += l;
      } else if (typ === 1) {
        var F = festeCodes(); bloecke(F.len, F.dist);
      } else if (typ === 2) {
        var nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4, L = new Uint8Array(320), i;
        if (nlen > 286 || ndist > 30) throw new Error("gzip beschädigt (Kopf)");
        var cl = new Uint8Array(19);
        for (i = 0; i < ncode; i++) cl[ORDNUNG[i]] = bits(3);
        var ch = huffman(cl, 0, 19);
        i = 0;
        while (i < nlen + ndist) {
          var sym = decode(ch);
          if (sym < 16) { L[i++] = sym; continue; }
          var wert = 0, rep;
          if (sym === 16) { if (i === 0) throw new Error("gzip beschädigt (Längen)"); wert = L[i - 1]; rep = 3 + bits(2); }
          else if (sym === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          if (i + rep > nlen + ndist) throw new Error("gzip beschädigt (Längen)");
          while (rep--) L[i++] = wert;
        }
        if (!L[256]) throw new Error("gzip beschädigt (ohne Ende-Code)");
        bloecke(huffman(L, 0, nlen), huffman(L, nlen, ndist));
      } else throw new Error("gzip beschädigt (Blocktyp)");
    }
    return { out: out.subarray(0, n), pos: pos };
  }

  var CRC = null;
  function crc32(u8) {
    var i, j, c;
    if (!CRC) { CRC = new Int32Array(256); for (i = 0; i < 256; i++) { c = i; for (j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[i] = c; } }
    c = -1;
    for (i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }
  function u32(u8, p) { return (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16) | (u8[p + 3] << 24)) >>> 0; }

  /** gzip (ein Mitglied, wie die Seite und die Werkzeuge es schreiben) → Uint8Array; Fehler bei falscher Prüfsumme oder Länge. */
  K.gunzip = function (daten) {
    var u8 = daten instanceof Uint8Array ? daten : new Uint8Array(daten);
    if (u8.length < 18 || u8[0] !== 0x1f || u8[1] !== 0x8b || u8[2] !== 8) throw new Error("kein gzip");
    var flg = u8[3], p = 10;
    if (flg & 4) p += 2 + (u8[p] | (u8[p + 1] << 8));
    if (flg & 8) { while (p < u8.length && u8[p] !== 0) p++; p++; }
    if (flg & 16) { while (p < u8.length && u8[p] !== 0) p++; p++; }
    if (flg & 2) p += 2;
    var r = inflate(u8, p);
    if (r.pos + 8 > u8.length) throw new Error("gzip unvollständig");
    if (u32(u8, r.pos + 4) !== (r.out.length >>> 0) || u32(u8, r.pos) !== crc32(r.out)) throw new Error("gzip beschädigt (Prüfsumme)");
    return r.out;
  };
  K.crc32 = crc32;

  /* ---------------- Hinweise ---------------- */
  try { new Function("var a = null; return a?.b ?? 1;"); } catch (e) { K.zuAlt = true; }
  K.browser = function (ua) {
    var u = String(ua || (G.navigator && G.navigator.userAgent) || ""), m;
    if ((m = /Firefox\/(\d+(\.\d+)?)/.exec(u))) return "Firefox " + m[1];
    if ((m = /(?:Chrome|CriOS)\/(\d+)/.exec(u))) return "Chrome " + m[1];
    if ((m = /Version\/(\d+(\.\d+){0,2}).*Safari/.exec(u))) return "Safari " + m[1];
    return "Browser unbekannt";
  };
  /** Text des Hinweises (ohne DOM, für Tests). */
  K.text = function () {
    if (K.zuAlt) return "Dieser Browser (" + K.browser() + ") ist zu alt für das Ironman Notebook. Nötig ist mindestens Safari 13.1; auf dem iPhone geht es.";
    if (!K.fehler.length) return null;
    var f = K.fehler[0];
    return "Beim Laden ist ein Fehler aufgetreten (" + K.browser() + "): " + f.m + (f.f ? " – " + f.f + (f.z ? ":" + f.z : "") : "") +
      (K.fehler.length > 1 ? " (und " + (K.fehler.length - 1) + " weitere)" : "") + ". Schick Claude ein Bildschirmfoto davon.";
  };
  function zeigen() {
    var d = G.document, t = K.text();
    if (!d || !t) return;
    if (!d.body) { d.addEventListener("DOMContentLoaded", zeigen); return; }
    var el = d.getElementById("kompat-hinweis");
    if (!el) {
      el = d.createElement("div"); el.id = "kompat-hinweis"; el.setAttribute("role", "alert");
      el.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;padding:12px 40px 12px 14px;border-radius:12px;" +
        "background:#3a1d1d;color:#fff;font:14px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.4)";
      var x = d.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Hinweis schliessen"); x.textContent = "×";
      x.style.cssText = "position:absolute;top:6px;right:8px;background:none;border:0;color:#fff;font-size:22px;cursor:pointer";
      x.onclick = function () { el.parentNode.removeChild(el); };
      var s = d.createElement("span"); el.appendChild(s); el.appendChild(x); d.body.appendChild(el);
    }
    el.firstChild.textContent = t;
  }
  var t0 = Date.now();
  if (G.addEventListener) {
    G.addEventListener("error", function (e) {
      if (!e || !e.message || Date.now() - t0 > 20000 || /^Script error\.?$/.test(e.message)) return;    // fremde Skripte melden nichts Brauchbares
      K.fehler.push({ m: String(e.message).slice(0, 160), f: String(e.filename || "").split("/").pop().split("?")[0], z: e.lineno || 0 });
      zeigen();
    });
    if (K.zuAlt) zeigen();
  }

  G.KOMPAT = K;
  if (typeof module !== "undefined" && module.exports) module.exports = K;
})(typeof window !== "undefined" ? window : globalThis);
