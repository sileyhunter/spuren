/* V9.13.0 Karte einfach (Outdoor O1): karte-einfach-1.0 – Grundkarten Schweiz/Ausland, Vorlagen, Deckkraft, aktive Ebenen, Quellen, Reiter.
   Rein (js/karte-ebenen.js); Bedienung und Einbindung in die Karte prüft tools/durchklick_karte.py gegen die Demo. Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const KE = require("../js/karte-ebenen.js");
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ROOT = path.join(__dirname, "..");

test("Versionen", () => {
  assert.equal(KE.VERSION, "karte-einfach-1.0");
  assert.deepEqual(Object.values(KE.VERSIONEN).sort(), ["deckkraft-1.0", "ebenen-vorlagen-1.0", "grundkarten-ausland-1.0", "karte-einfach-1.0", "kartensuche-1.0", "meine-daten-1.0"]);
});

test("Grundkarten: fünf Schweizer + vier Ausland ohne Schlüssel, alle mit Quelle", () => {
  assert.deepEqual(KE.grundIds(), ["nacht", "farbe", "winter", "grau", "luft", "ot", "ignplan", "igntopo", "bmat"]);
  assert.equal(KE.GRUND.filter((g) => g.region === "ch").length, 5);
  assert.equal(KE.GRUND.filter((g) => g.region === "ausland").length, 4);
  for (const g of KE.grundNeu()) {
    assert.equal(g.region, "ausland");
    assert.ok(g.tiles.length >= 1 && g.tiles.every((u) => u.startsWith("https://")), g.id);
    assert.ok(g.attr && g.attr.length > 10, g.id + " Quellenangabe");
    for (const u of g.tiles) { assert.ok(/\{z\}/.test(u) && /\{x\}/.test(u) && /\{y\}/.test(u) || /TILEMATRIX=\{z\}/.test(u), u); assert.ok(!/key=|apikey|token|api_key/i.test(u), "kein Schlüssel: " + u); }
  }
  assert.equal(KE.regionVon("ot"), "ausland"); assert.equal(KE.regionVon("farbe"), "ch"); assert.equal(KE.regionVon("gibtsnicht"), "ch");
  assert.equal(KE.grund("bmat").label, "basemap.at");
});

test("Kartenstil: neue Quellen und Ebenen, alle zunächst unsichtbar; Quelle und Ebene gehören zusammen", () => {
  const q = KE.rasterQuellen(), g = KE.grundLayer(), e = KE.ebenenLayer();
  assert.equal(Object.keys(q).length, 4 + 3);
  assert.equal(g.length, 4); assert.equal(e.length, 3);
  for (const l of g.concat(e)) { assert.ok(q[l.id], l.id); assert.equal(l.source, l.id); assert.equal(l.layout.visibility, "none"); assert.equal(l.type, "raster"); }
  assert.equal(q.ot.tiles.length, 3); assert.equal(q.ot.maxzoom, 17);
  assert.equal(q.wmt_rad.tiles[0], "https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png");
  assert.equal(q.wmt_wander.tiles[0], "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png");
  q.ot.tiles.push("x"); assert.equal(KE.rasterQuellen().ot.tiles.length, 3, "Kopie, keine geteilte Liste");
});

test("Vorlagen: Skitour · Wandern · Rad · Jagd nach Auftrag", () => {
  assert.deepEqual(KE.VORLAGEN.map((v) => v.id), ["skitour", "wandern", "rad", "jagd"]);
  const v = (id) => KE.vorlage(id);
  assert.equal(v("skitour").grund, "winter");
  assert.deepEqual(v("skitour").ebenen, ["skitouren", "hang30", "wrz", "wsg_gr"]); assert.equal(v("skitour").spuren, true); assert.equal(v("skitour").jagd, false);
  assert.deepEqual(v("wandern").ebenen, ["wander"]); assert.equal(v("wandern").grund, "farbe"); assert.equal(v("wandern").spuren, true);
  assert.deepEqual(v("rad").ebenen, ["velo", "mtb"]); assert.equal(v("rad").spuren, false);
  assert.deepEqual(v("jagd").ebenen, ["wrz", "jbg"]); assert.equal(v("jagd").jagd, true); assert.equal(v("jagd").spuren, false);
  assert.equal(KE.vorlage("x"), null);
});

test("vorlagePlan: schaltet nur um, was sich ändert", () => {
  const ist = { grund: "farbe", ebenen: ["wander", "velo"], jagd: false, spuren: "heat" };
  const p = KE.vorlagePlan("skitour", ist);
  assert.equal(p.grund, "winter");
  assert.deepEqual(p.an, ["skitouren", "hang30", "wrz", "wsg_gr"]);
  assert.deepEqual(p.aus, ["wander", "velo"]);
  assert.equal(p.spuren, "heat"); assert.equal(p.jagd, false);
  const q = KE.vorlagePlan("rad", { grund: "farbe", ebenen: ["velo", "mtb"], jagd: false, spuren: "off" });
  assert.deepEqual(q.an, []); assert.deepEqual(q.aus, []); assert.equal(q.spuren, "off");
  const j = KE.vorlagePlan("jagd", { grund: "nacht", ebenen: [], jagd: false, spuren: "heat" });
  assert.deepEqual(j.an, ["wrz", "jbg"]); assert.equal(j.jagd, true); assert.equal(j.spuren, "off");
  assert.equal(KE.vorlagePlan("x", ist), null);
});

test("vorlageErkannt: Kachel leuchtet nur bei genau dieser Kombination", () => {
  assert.equal(KE.vorlageErkannt({ grund: "winter", ebenen: ["wsg_gr", "wrz", "hang30", "skitouren"], jagd: false, spuren: "heat" }), "skitour");
  assert.equal(KE.vorlageErkannt({ grund: "winter", ebenen: ["wrz", "hang30", "skitouren"], jagd: false, spuren: "heat" }), null);
  assert.equal(KE.vorlageErkannt({ grund: "farbe", ebenen: ["velo", "mtb"], jagd: false, spuren: "off" }), "rad");
  assert.equal(KE.vorlageErkannt({ grund: "farbe", ebenen: ["velo", "mtb"], jagd: false, spuren: "sport" }), "rad", "«Nach Sport» ist auch aus Sicht der Vorlage keine Heatmap");
  assert.equal(KE.vorlageErkannt({ grund: "farbe", ebenen: ["velo", "mtb"], jagd: false, spuren: "heat" }), null);
  assert.equal(KE.vorlageErkannt({ grund: "nacht", ebenen: [], jagd: false, spuren: "heat" }), null);
  assert.equal(KE.vorlageErkannt(null), null);
});

test("Deckkraft: Standard wie vor V9.13.0, 0–100, nur Abweichungen gespeichert", () => {
  assert.equal(KE.opStandard("wander"), 90); assert.equal(KE.opStandard("wsg_gr"), 75); assert.equal(KE.opStandard("hang30"), 85); assert.equal(KE.opStandard("farbe"), 100); assert.equal(KE.opStandard("unbekannt"), 85);
  assert.equal(KE.klemme(120), 100); assert.equal(KE.klemme(-5), 0); assert.equal(KE.klemme("40"), 40); assert.equal(KE.klemme(33.6), 34); assert.equal(KE.klemme("x"), null); assert.equal(KE.klemme(NaN), null);
  let op = KE.opSetzen({}, "velo", 40); assert.deepEqual(op, { velo: 40 });
  op = KE.opSetzen(op, "velo", 90); assert.deepEqual(op, {}, "zurück auf Standard: Eintrag fällt weg");
  op = KE.opSetzen(op, "farbe", 60); assert.equal(KE.opWert(op, "farbe"), 60); assert.equal(KE.opWert(op, "luft"), 100);
  assert.deepEqual(KE.opSetzen({ a: 1 }, "velo", "kaputt"), { a: 1 }, "ungültiger Wert ändert nichts");
  const orig = { velo: 40 }; KE.opSetzen(orig, "mtb", 10); assert.deepEqual(orig, { velo: 40 }, "ändert das Original nicht");
});

test("opLesen: kaputte oder fremde Einträge fallen weg", () => {
  assert.deepEqual(KE.opLesen('{"velo":40,"x y":5,"mtb":"abc","hang30":250}'), { velo: 40, hang30: 100 });
  assert.deepEqual(KE.opLesen("kein json"), {}); assert.deepEqual(KE.opLesen(null), {}); assert.deepEqual(KE.opLesen([1, 2]), {}); assert.deepEqual(KE.opLesen(undefined), {});
  assert.deepEqual(KE.opLesen({ wander: 50 }), { wander: 50 });
  assert.deepEqual(KE.opLesen({ "<script>": 5 }), {});
});

test("aktiveEbenen: Grundkarte zuerst, dann Ebenen, Jagdposten, Spuren; Regler nur bei Kartenebenen", () => {
  const rows = KE.aktiveEbenen({ grund: "winter", ebenen: ["skitouren", "wrz"], jagd: true, spuren: "heat", op: { wrz: 30 } });
  assert.deepEqual(rows.map((r) => r.key), ["winter", "skitouren", "wrz", "jagd", "spuren"]);
  assert.deepEqual(rows.map((r) => r.art), ["grund", "ebene", "ebene", "punkte", "spuren"]);
  assert.equal(rows[0].aus, false, "die Grundkarte lässt sich nicht ausschalten");
  assert.equal(rows[0].op, 100); assert.equal(rows[1].op, 85); assert.equal(rows[2].op, 30);
  assert.equal(rows[3].op, null); assert.equal(rows[4].op, null);
  assert.equal(rows[0].label, "Winterkarte"); assert.equal(rows[4].label, "Meine Spuren");
  assert.equal(KE.aktiveEbenen({ grund: "ot", ebenen: [], jagd: false, spuren: "off" }).length, 1);
  assert.equal(KE.aktiveEbenen({ grund: "nacht", ebenen: [], spuren: "sport" })[1].label, "Spuren nach Sport");
  assert.equal(KE.aktiveEbenen({ grund: "gibtsnicht", ebenen: [] })[0].key, "nacht", "unbekannte Grundkarte fällt auf Nacht zurück");
  assert.equal(KE.aktiveEbenen({ grund: "nacht", ebenen: ["xyz"], namen: { xyz: "Eigene" } })[1].label, "Eigene");
});

test("aktivHtml: ein Eintrag je Ebene mit Regler, Anzeige und ✕; Text wird entschärft", () => {
  const rows = KE.aktiveEbenen({ grund: "farbe", ebenen: ["velo"], jagd: true, spuren: "off", op: { velo: 40 }, namen: { velo: 'Velo<img src=x>' } });
  const html = KE.aktivHtml(rows, esc);
  assert.equal((html.match(/<li /g) || []).length, 3);
  assert.ok(html.includes('data-op="velo"') && html.includes('value="40"') && html.includes("40 %"));
  assert.ok(html.includes('data-aus="velo"') && html.includes('data-aus="jagd"'));
  assert.ok(!html.includes('data-aus="farbe"'), "Grundkarte ohne ✕");
  assert.ok(!html.includes("<img"), "Namen werden maskiert");
  assert.ok(!/data-op="jagd"/.test(html), "Jagdposten ohne Regler");
});

test("Quellen und Lizenzen: jeder Dienst mit Zweck, Lizenz und Adresse; Unverifiziertes ist benannt", () => {
  const ids = KE.QUELLEN.map((q) => q.id);
  for (const k of ["swisstopo", "bafu", "opentopomap", "ign", "basemapat", "wmt"]) assert.ok(ids.includes(k), k);
  for (const q of KE.QUELLEN) { assert.ok(q.name && q.wofuer && q.lizenz && /^https:\/\//.test(q.url), q.id); }
  assert.ok(/nicht verifiziert/i.test(KE.QUELLEN.find((q) => q.id === "ign").hinweis), "IGN ist als nicht verifiziert gekennzeichnet");
  for (const g of KE.GRUND.filter((x) => x.region === "ausland")) assert.ok(KE.QUELLEN.some((q) => q.id === g.quelle), g.id + " hat einen Quelleneintrag");
  for (const e of KE.EBENEN_NEU) assert.ok(KE.QUELLEN.some((q) => q.id === e.quelle), e.id);
  const html = KE.quellenHtml(esc);
  assert.equal((html.match(/<li>/g) || []).length, KE.QUELLEN.length);
  assert.ok(html.includes('rel="noopener"'));
});

test("Reiter: Spuren · Punkte · Routen; unbekannt fällt auf Spuren", () => {
  assert.deepEqual(KE.TABS.map((t) => t.id), ["spuren", "punkte", "routen"]);
  assert.equal(KE.tab("routen"), "routen"); assert.equal(KE.tab("x"), "spuren"); assert.equal(KE.tab(undefined), "spuren");
});

test("Einbindung in index.html: Skript, drei Knöpfe, Reiter; nichts Altes verloren", () => {
  const h = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(h.includes('<script src="js/karte-ebenen.js"></script>'));
  assert.ok(h.indexOf('<script src="js/karte-ebenen.js">') < h.indexOf('<script src="js/routen-ui.js">'));
  for (const id of ["btn-layers", "btn-plan", "btn-daten", "karte-suche", "lay-vorlagen", "lay-region", "lay-base", "lay-aktiv", "lay-mehr", "lay-quellen", "daten-tabs", "dp-spuren", "dp-punkte", "dp-routen"]) assert.ok(h.includes(`id="${id}"`), id);
  // alle bisherigen Ebenen und Grundkarten sind weiter schaltbar
  for (const k of ["wander", "velo", "mtb", "wanderland", "skitouren", "schneeschuh", "hang30", "wrz", "jbg", "wsg_gr"]) assert.ok(h.includes(`data-ov="${k}"`), k);
  for (const k of ["nacht", "farbe", "winter", "grau", "luft", "ot", "ignplan", "igntopo", "bmat"]) assert.ok(h.includes(`data-base="${k}"`), k);
  assert.ok(h.includes('data-pt="jagd"'));
  for (const id of ["mode-heat", "mode-sport", "btn-3d", "f-reset", "hits", "p-add", "gpx-in", "p-list", "r-list", "p-export", "p-imp-cat"]) assert.ok(h.includes(`id="${id}"`), id + " bleibt");
  // Heatmap/Nach Sport/3D und Filter liegen im Reiter Spuren, Punkte und GPX-Import im Reiter Punkte, Routen im Reiter Routen
  const teil = (a, b) => h.slice(h.indexOf(`id="${a}"`), h.indexOf(`id="${b}"`));
  const spuren = teil("dp-spuren", "dp-punkte"), punkte = teil("dp-punkte", "dp-routen");
  for (const id of ["mode-heat", "mode-sport", "btn-3d", "f-sport", "f-von", "f-reset", "hits"]) assert.ok(spuren.includes(`id="${id}"`), id + " im Reiter Spuren");
  for (const id of ["p-add", "p-list", "gpx-in", "p-export"]) assert.ok(punkte.includes(`id="${id}"`), id + " im Reiter Punkte");
  assert.ok(h.slice(h.indexOf('id="dp-routen"'), h.indexOf("</aside>")).includes('id="r-list"'));
  assert.ok(!h.includes('id="btn-routen"') && !h.includes('id="mobile-filter"'));
});

test("Datenschutz: keine Schlüssel, kein Tracking in den Kartendiensten; Quellen stehen in der Karte (attribution)", () => {
  const q = KE.rasterQuellen();
  for (const [k, v] of Object.entries(q)) { assert.ok(v.attribution && /href=/.test(v.attribution), k + " Quellenangabe in der Karte"); assert.ok(v.tiles.every((u) => !/[?&](key|apikey|token)=/i.test(u)), k); }
});

test("Service Worker: neues Skript ist im Grundbestand", () => {
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  assert.ok(sw.includes('"js/karte-ebenen.js"'));
});
