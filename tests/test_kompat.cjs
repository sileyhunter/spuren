/* V8.4.1 kompat-1.0: ältere Browser (Safari 13.1–15). Erfundene Daten; prüft den gzip-Dekoder gegen zlib, die Ersatzfunktionen in einer
   frischen Umgebung, den Hinweistext und dass Seite und Module nur Syntax und Funktionen nutzen, die Safari 13.1 kennt (oder die kompat.js ersetzt). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib"), vm = require("node:vm");
const ROOT = path.join(__dirname, "..");
const K = require("../js/kompat.js");

const zufall = (n, seed) => { let x = seed >>> 0 || 1; const u = new Uint8Array(n); for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; u[i] = x & 0xff; } return u; };
const gleich = (a, b) => Buffer.from(a).equals(Buffer.from(b));

test("kompat-1.0: gunzip liest, was zlib schreibt (leer, Text, JSON, Zufall, gross; Stufen 0, 1, 6, 9)", () => {
  assert.equal(K.VERSION, "kompat-1.0");
  const json = Buffer.from(JSON.stringify({ t: Array.from({ length: 4000 }, (_, i) => ({ s: i * 2, hf: 120 + (i % 17), w: i % 5 ? 180 + (i % 40) : null })) }));
  const faelle = [Buffer.alloc(0), Buffer.from("a"), Buffer.from("Ironman Notebook – Grüsse aus Chur ".repeat(50)), json, Buffer.from(zufall(70000, 7)), Buffer.from(zufall(300, 3)),
    Buffer.concat([Buffer.from(zufall(5000, 11)), Buffer.alloc(200000, 65), json])];
  for (const roh of faelle) for (const level of [0, 1, 6, 9]) {
    const gz = zlib.gzipSync(roh, { level });
    assert.ok(gleich(K.gunzip(new Uint8Array(gz)), roh), `Länge ${roh.length}, Stufe ${level}`);
  }
  // nur feste Huffman-Codes (Z_FIXED) und ein ArrayBuffer als Eingabe
  const fest = zlib.gzipSync(json, { strategy: zlib.constants.Z_FIXED });
  assert.ok(gleich(K.gunzip(new Uint8Array(fest).buffer), json));
});

test("kompat-1.0: gzip-Kopf mit Name, Kommentar, Extra und Kopf-Prüfsumme; beschädigte Daten werden abgelehnt", () => {
  const roh = Buffer.from(JSON.stringify({ a: "x".repeat(3000), b: [1, 2, 3] }));
  const def = zlib.deflateRawSync(roh), crc = K.crc32(new Uint8Array(roh));
  const le = (n) => Buffer.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  const kopf = Buffer.concat([Buffer.from([0x1f, 0x8b, 8, 4 | 8 | 16 | 2, 0, 0, 0, 0, 0, 255]), Buffer.from([3, 0, 1, 2, 3]), Buffer.from("name.json\0"), Buffer.from("Kommentar\0"), Buffer.from([0, 0])]);
  const gz = Buffer.concat([kopf, def, le(crc), le(roh.length)]);
  assert.ok(gleich(K.gunzip(new Uint8Array(gz)), roh));
  assert.equal(crc, zlib.crc32 ? zlib.crc32(roh) : crc);
  const kaputt = Buffer.from(zlib.gzipSync(roh)); kaputt[kaputt.length - 6] ^= 0xff;                 // Prüfsumme
  assert.throws(() => K.gunzip(new Uint8Array(kaputt)), /Prüfsumme/);
  const kurz = zlib.gzipSync(roh).subarray(0, 30);
  assert.throws(() => K.gunzip(new Uint8Array(kurz)), /unvollständig|beschädigt/);
  assert.throws(() => K.gunzip(new Uint8Array([1, 2, 3])), /kein gzip/);
  // Auffüllung hinter dem gzip (wie in SPS2/EGS1 nach dem Abschneiden auf die Länge) stört nicht
  assert.ok(gleich(K.gunzip(new Uint8Array(Buffer.concat([zlib.gzipSync(roh), Buffer.alloc(64)]))), roh));
});

test("kompat-1.0: Ersatzfunktionen in einer Umgebung ohne at, hasOwn und Blob.arrayBuffer", () => {
  const ctx = vm.createContext({});
  vm.runInContext("delete Array.prototype.at; delete String.prototype.at; delete Object.getPrototypeOf(Int8Array.prototype).at; delete Object.hasOwn;", ctx);
  assert.equal(vm.runInContext("typeof [].at", ctx), "undefined");
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js", "kompat.js"), "utf8"), ctx);
  assert.equal(vm.runInContext("[1, 2, 3].at(-1)", ctx), 3);
  assert.equal(vm.runInContext("[1, 2, 3].at(0)", ctx), 1);
  assert.equal(vm.runInContext("[1, 2, 3].at(5)", ctx), undefined);
  assert.equal(vm.runInContext("'abc'.at(-1)", ctx), "c");
  assert.equal(vm.runInContext("new Uint8Array([4, 5, 6]).at(-2)", ctx), 5);
  assert.equal(vm.runInContext("Object.hasOwn({ a: 1 }, 'a') && !Object.hasOwn({}, 'a')", ctx), true);
  assert.equal(vm.runInContext("Object.keys([]).length === 0 && !Object.keys(Array.prototype).includes('at')", ctx), true, "nicht aufzählbar");
  assert.equal(vm.runInContext("KOMPAT.zuAlt", ctx), false);
});

test("kompat-1.0: Browser erkennen und Hinweistext", () => {
  assert.equal(K.browser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15"), "Safari 14.1.2");
  assert.equal(K.browser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"), "Safari 18.1");
  assert.equal(K.browser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"), "Chrome 128");
  assert.equal(K.browser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:115.0) Gecko/20100101 Firefox/115.0"), "Firefox 115.0");
  assert.equal(K.text(), null, "ohne Fehler kein Hinweis");
  K.fehler.push({ m: "undefined is not a function (near '...a.at(-1)...')", f: "index.html", z: 1619 });
  assert.match(K.text(), /Fehler aufgetreten .*index\.html:1619.*Bildschirmfoto/);
  K.fehler.length = 0;
});

/* ---------- Seite und Module nur mit Syntax und Funktionen, die Safari 13.1 kennt (oder die kompat.js ersetzt) ---------- */
const dateien = () => {
  const L = fs.readdirSync(path.join(ROOT, "js")).filter((f) => f.endsWith(".js")).map((f) => ({ name: "js/" + f, text: fs.readFileSync(path.join(ROOT, "js", f), "utf8") }));
  for (const h of ["index.html", "demo.html"]) {
    const s = fs.readFileSync(path.join(ROOT, h), "utf8"), re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
    let m, i = 0; while ((m = re.exec(s))) L.push({ name: `${h} (Inline ${i++})`, text: m[1] });
  }
  L.push({ name: "sw.js", text: fs.readFileSync(path.join(ROOT, "sw.js"), "utf8") });
  return L;
};
const acorn = (() => { for (const p of ["acorn", "/opt/node-tools/node_modules/acorn"]) { try { return require(p); } catch (e) { /* weiter */ } } return null; })();

test("kompat-1.0: keine Syntax nach ES2020 (Safari 13.1) – kompat.js selbst in ES5", { skip: acorn ? false : "acorn nicht installiert" }, () => {
  for (const f of dateien()) {
    try { acorn.parse(f.text, { ecmaVersion: 2020, sourceType: "script", allowHashBang: true }); }
    catch (e) { assert.fail(`${f.name}: ${e.message}`); }
  }
  acorn.parse(fs.readFileSync(path.join(ROOT, "js", "kompat.js"), "utf8"), { ecmaVersion: 5, sourceType: "script" });
});

test("kompat-1.0: keine Funktionen, die Safari 13.1–15 fehlen und die kompat.js nicht ersetzt; Lookbehind nie", () => {
  const VERBOTEN = [[/\|\|=|&&=|\?\?=/, "logische Zuweisung (Safari 14)"], [/\(\?<[=!]/, "Lookbehind in regulären Ausdrücken (Safari 16.4)"],
    [/\.findLast(Index)?\(/, "findLast (Safari 15.4)"], [/\bstructuredClone\(/, "structuredClone (Safari 15.4)"], [/\.to(Sorted|Reversed|Spliced)\(/, "toSorted & Co. (Safari 16)"],
    [/\b(Object|Map)\.groupBy\(/, "groupBy (Safari 17.4)"], [/\bPromise\.(withResolvers|any)\(/, "Promise.any/withResolvers (Safari 14/17.4)"], [/\breplaceChildren\(/, "replaceChildren (Safari 14)"],
    [/\bcrypto\.randomUUID\(/, "randomUUID (Safari 15.4)"], [/\brequestIdleCallback\(/, "requestIdleCallback (Safari: fehlt)"]];
  for (const f of dateien()) {
    if (f.name === "js/kompat.js") continue;
    const ohneKommentare = f.text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
    for (const [re, was] of VERBOTEN) assert.ok(!re.test(ohneKommentare), `${f.name}: ${was}`);
    // CompressionStream/DecompressionStream nur mit Prüfung und Rückfall
    if (/DecompressionStream/.test(ohneKommentare)) assert.ok(/KOMPAT/.test(ohneKommentare), `${f.name}: DecompressionStream ohne Rückfall auf KOMPAT.gunzip`);
  }
});

test("kompat-1.0: kompat.js lädt vor allen anderen Skripten und ist offline verfügbar; CSS ohne «inset» und mit vh vor dvh", () => {
  for (const h of ["index.html", "demo.html"]) {
    const s = fs.readFileSync(path.join(ROOT, h), "utf8"), erste = (s.match(/<script[^>]*\bsrc="([^"]+)"/) || [])[1];
    assert.equal(erste, "js/kompat.js", h);
  }
  assert.match(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), /"js\/kompat\.js"/);
  for (const c of ["css/v6.css", "index.html"]) {
    const s = fs.readFileSync(path.join(ROOT, c), "utf8");
    assert.ok(!/[;{]\s*inset:\s/.test(s), `${c}: «inset» kennt Safari erst ab 14.1 – top/right/bottom/left nehmen`);
    for (const m of s.matchAll(/([a-z-]+):\s*[^;{}]*\b\d+d?vh\b[^;{}]*;/g)) if (/dvh/.test(m[0])) {
      const vor = s.slice(Math.max(0, m.index - 120), m.index);
      assert.ok(new RegExp(m[1] + ":[^;]*\\d+vh\\b").test(vor), `${c}: «${m[0].trim()}» ohne Rückfall mit vh davor`);
    }
  }
});
