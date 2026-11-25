// Abnahmetests V9.20.0 (Outdoor O4, mapy-1.0): Mapy.com als Grundkarte Ausland, nur mit eigenem Schlüssel aus der verschlüsselten Konfiguration.
// Alle Schlüssel in diesen Tests sind erfunden. Aufruf: node --test tests/test_v9200.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const KE = require("../js/karte-ebenen.js");
const ROOT = path.join(__dirname, "..");
const R = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const ERFUNDEN = "abcDEF0123456789_-abcDEF0123456789_-xyz";

test("Version und Kartenarten: Outdoor und Winter, beide Ausland, beide mit Quelle «mapy»", () => {
  assert.equal(KE.MAPY_VERSION, "mapy-1.0");
  assert.deepEqual(KE.mapyIds(), ["mapy_out", "mapy_win"]);
  assert.deepEqual(KE.MAPY.map((m) => m.mapset), ["outdoor", "winter"]);
  for (const m of KE.MAPY) { assert.equal(m.region, "ausland"); assert.equal(KE.regionVon(m.id), "ausland"); assert.equal(KE.grund(m.id).label, m.label); assert.ok(KE.istMapy(m.id)); assert.ok(KE.QUELLEN.some((q) => q.id === m.quelle)); }
  assert.ok(!KE.istMapy("ot") && !KE.istMapy("winter"));
  assert.deepEqual(KE.grundIdsAlle().slice(-2), ["mapy_out", "mapy_win"]);
});

test("Alte Zusagen bleiben: Schweizer und freie Auslandskarten unverändert, nichts ohne Schlüssel mit Schlüssel", () => {
  assert.deepEqual(KE.grundIds(), ["nacht", "farbe", "winter", "grau", "luft", "ot", "ignplan", "igntopo", "bmat"]);
  assert.equal(Object.keys(KE.rasterQuellen()).length, 7);
  assert.deepEqual(Object.values(KE.VERSIONEN).sort(), ["deckkraft-1.0", "ebenen-vorlagen-1.0", "grundkarten-ausland-1.0", "karte-einfach-1.0", "kartensuche-1.0", "meine-daten-1.0"]);
});

test("Schlüssel: nur gültige Zeichen und Länge, aus config.mapy_key; sonst null", () => {
  assert.equal(KE.mapySchluessel({ mapy_key: ERFUNDEN }), ERFUNDEN);
  assert.equal(KE.mapySchluessel({ mapy_key: "  " + ERFUNDEN + "\n" }), ERFUNDEN, "Leerzeichen am Rand fallen weg");
  for (const k of [undefined, null, "", "kurz", 12345, "mit leerzeichen mitten drin 1234567890", "a&b=c?d#e12345678901234567890", "x".repeat(101), ["abc"], {}]) assert.equal(KE.mapySchluessel({ mapy_key: k }), null, String(k));
  for (const c of [undefined, null, "text", 5, []]) assert.equal(KE.mapySchluessel(c), null);
});

test("Ohne Schlüssel: keine Quellen, keine Schichten, keine Anfrage an Mapy möglich", () => {
  assert.deepEqual(KE.mapyQuellen(null), {});
  assert.deepEqual(KE.mapyLayer(null), []);
  assert.ok(!JSON.stringify(KE.rasterQuellen()).includes("mapy"));
});

test("Mit Schlüssel: Kachel-Adresse, Quellenhinweis in der Karte, Schicht unsichtbar", () => {
  const q = KE.mapyQuellen(ERFUNDEN), l = KE.mapyLayer(ERFUNDEN);
  assert.deepEqual(Object.keys(q), ["mapy_out", "mapy_win"]);
  assert.equal(q.mapy_out.tiles[0], `https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${ERFUNDEN}`);
  assert.equal(q.mapy_win.tiles[0], `https://api.mapy.com/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${ERFUNDEN}`);
  for (const [k, v] of Object.entries(q)) { assert.equal(v.type, "raster"); assert.equal(v.tileSize, 256); assert.ok(/href=/.test(v.attribution) && /Seznam/.test(v.attribution), k + " Quellenhinweis"); }
  assert.equal(l.length, 2);
  for (const x of l) { assert.ok(q[x.id]); assert.equal(x.source, x.id); assert.equal(x.layout.visibility, "none"); }
  assert.ok(KE.mapyTiles("outdoor", "a&b")[0].includes("apikey=a%26b"), "Sonderzeichen werden maskiert");
});

test("Logo: wird nur bei Mapy-Karten gezeigt; Adresse nennt Mapy", () => {
  assert.ok(KE.mapyLogoSichtbar("mapy_out") && KE.mapyLogoSichtbar("mapy_win"));
  for (const g of KE.grundIds()) assert.ok(!KE.mapyLogoSichtbar(g), g);
  assert.ok(/^https:\/\/(api\.)?mapy\.com/.test(KE.MAPY_LOGO.href) || /^https:\/\/mapy\.com/.test(KE.MAPY_LOGO.href));
  assert.ok(/^https:\/\//.test(KE.MAPY_LOGO.img) && KE.MAPY_LOGO.alt);
});

test("Quellen und Lizenzen: Mapy mit Logo-Bedingung, eigenem Schlüssel und Prüfhinweis", () => {
  const q = KE.QUELLEN.find((x) => x.id === "mapy");
  assert.ok(q && q.name && /^https:\/\//.test(q.url));
  assert.ok(/Logo/.test(q.lizenz) && /Schlüssel/.test(q.lizenz + q.hinweis));
  assert.ok(/nicht geprüft/i.test(q.hinweis), "Unverifiziertes ist benannt");
});

test("Seite: Schlüssel nur aus der Konfiguration, Knöpfe, Sperre ohne Schlüssel, Logo-Aufruf", () => {
  const h = R("index.html");
  assert.ok(h.includes("KE.mapySchluessel(D.config)"));
  assert.ok(h.includes("...KE.mapyQuellen(MAPY_KEY)") && h.includes("...KE.mapyLayer(MAPY_KEY)"));
  for (const id of ["mapy_out", "mapy_win"]) assert.ok(h.includes(`data-base="${id}"`), id);
  const sb = h.slice(h.indexOf("async function setBase(b) {"), h.indexOf("async function setBase(b) {") + 900);
  assert.ok(/KE\.istMapy\(b\) && !MAPY_KEY/.test(sb), "ohne Schlüssel kein Umschalten");
  assert.ok(h.includes("KE.grundIdsAlle()") && /mapyLogo\(b\)/.test(h));
});

test("Datenschutz: kein Schlüssel im Code, in Tests, Doku oder Demo; Service Worker leitet Mapy-Kacheln nicht durch den Zwischenspeicher", () => {
  const dateien = ["index.html", "demo.html", "sw.js", "CHANGELOG.md", "docs/offen-nach-v55.md", "docs/anleitung/karte-routen.md", ...fs.readdirSync(path.join(ROOT, "js")).map((f) => "js/" + f), ...fs.readdirSync(path.join(ROOT, "tests")).filter((f) => f.endsWith(".cjs")).map((f) => "tests/" + f)];
  for (const f of dateien) {
    const t = R(f);
    assert.ok(!/apikey=[A-Za-z0-9_-]{20,}/.test(t), f + ": Schlüssel im Klartext");
    assert.ok(!/mapy_key["']?\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/.test(t.replace(ERFUNDEN, "")), f + ": mapy_key mit Wert");
  }
  const sw = R("sw.js");
  assert.ok(!/api\.mapy\./.test(sw), "Mapy-Kacheln (mit Schlüssel in der Adresse) werden nicht gespeichert");
  assert.ok(/const CACHE = "notebook-v9(2\d\d|\d{3,})-/.test(sw), "Cache-Fassung ab V9.20");
});
