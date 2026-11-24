/* V9.14.0 gpx-export-2.0 (Routen 7.2): Strecke an Garmin senden – Prüfung der GPX-Datei, Auftrag, Stand, Verdrahtung.
 * Nur erfundene Strecken (synthetische Geometrie), keine echten Orte. Die Python-Seite (Einspielen, Hochladen, Eintragen) steht in tests/test_tools.py. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const RT = require("../js/route.js");
const SG = require("../js/strecke-garmin.js");

const ROOT = path.resolve(__dirname, "..");
const R = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/** Synthetische Route (keine echte), Länge L in Metern, Höhenverlauf eleFn(d). */
function synth(L, eleFn, sport) {
  const n = Math.round(L / 10), lon0 = 10.0, lat0 = 10.0, coords = [];
  for (let i = 0; i <= n; i++) { const d = (i * L) / n; coords.push([lon0 + d / (111320 * Math.cos((lat0 * Math.PI) / 180)), lat0 + d * 0.2 / 110540, eleFn(d)]); }
  const leg = { coords, edges: [{ i0: 0, i1: n, tags: { highway: "tertiary", surface: "asphalt" }, nodeTags: {} }], props: { creator: "SYNTHETISCH" } };
  return RT.buildRoute([leg], [coords[0], coords[n]], { sport: sport || "rennrad" });
}
const route = synth(5000, (d) => 400 + d / 25, "rennrad");
const gpx = RT.gpx(route, "Testrunde", ["Start", "Ziel"], null);

test("Version, Streckentypen und Zuordnung der Sportarten", () => {
  assert.equal(SG.VERSION, "gpx-export-2.0");
  assert.deepEqual(SG.TYPEN.slice().sort(), ["cycling", "gravel_cycling", "hiking", "mountain_biking", "road_biking", "running", "trail_running", "walking"]);
  const soll = { rennrad: "road_biking", gravel: "gravel_cycling", mtb: "mountain_biking", laufen: "running", trail: "trail_running", wandern: "hiking", skitour: "hiking" };
  for (const [s, t] of Object.entries(soll)) assert.equal(SG.typFuer(s), t, s);
  assert.equal(SG.typFuer("ufo"), null);
  assert.ok(SG.TYPEN.every((t) => SG.TYP_TEXT[t]));
});

test("GPX-Prüfung: was RT.gpx liefert, besteht; Länge und Punktzahl stimmen", () => {
  const g = SG.pruefenGpx(gpx);
  assert.equal(g.ok, true, g.grund);
  assert.equal(g.punkte, route.lon.length);
  assert.ok(Math.abs(g.km - route.L / 1000) < 0.05, `${g.km} ≉ ${route.L / 1000}`);
  assert.ok(g.hoehen >= 0.99);
});

test("GPX-Prüfung lehnt ab: leer, kein GPX, ohne Name, ohne Höhen, ein Punkt, ungültige Koordinate, DOCTYPE, zu gross, zu viele Punkte", () => {
  const grund = (t) => SG.pruefenGpx(t).grund;
  assert.match(grund(""), /leer/);
  assert.match(grund("<kml></kml>"), /keine GPX/);
  assert.match(grund(gpx.replace(/<metadata>[\s\S]*?<\/metadata>/, "<metadata></metadata>")), /Name/);
  assert.match(grund(gpx.replace(/<ele>[^<]*<\/ele>/g, "")), /Höhen/);
  assert.match(grund(gpx.replace(/<trkpt[\s\S]*<\/trkpt>/, (m) => m.slice(0, m.indexOf("</trkpt>") + 8))), /mindestens zwei Punkte/);
  assert.match(grund(gpx.replace(/(<trkpt lat=")\d+\.\d+"/, '$195.000000"')), /Koordinaten/);
  assert.match(grund('<!DOCTYPE gpx [<!ENTITY x "y">]>' + gpx), /DOCTYPE|ENTITY/);
  assert.match(grund("x".repeat(SG.MAX_BYTES + 1)), /zu gross/);
  const viele = "<gpx><metadata><name>x</name></metadata><trk><trkseg>" + '<trkpt lat="1" lon="1"><ele>1</ele></trkpt>'.repeat(SG.MAX_PUNKTE + 1) + "</trkseg></trk></gpx>";
  assert.ok(viele.length < SG.MAX_BYTES * 2);
  assert.ok(/zu viele Punkte|zu gross/.test(grund(viele)));
});

test("Name und Beschreibung: bereinigt, in den Grenzen von Garmin, nichts Persönliches", () => {
  assert.equal(SG.name("  Runde \n am\tSee  "), "Runde am See");
  assert.equal(SG.name("x".repeat(300)).length, 128);
  assert.equal(SG.name(null), "");
  const b = SG.beschreibung({ typ: "road_biking", km: 85.24, hm: 1230.4 });
  assert.equal(b, "Ironman Notebook · Rennrad · 85,2 km · 1230 Hm");
  assert.match(SG.beschreibung({ typ: "hiking", km: 10, hm: 500, handKm: 1.26 }), /davon 1,3 km von Hand gezeichnet \(kein Wegnetz\)/);
  assert.ok(SG.beschreibung({ typ: "running", km: 1, hm: 1, handKm: 1 }).length <= SG.MAX_BESCHR);
});

test("Auftrag: Felder, Typ, Prüfsumme (SHA-256 der GPX-Datei), Ja-Zeitpunkt; Fehler ohne Typ, ohne Routen-ID, ohne Namen, mit kaputter GPX", async () => {
  const jetzt = "2030-01-05T10:00:00.000Z";
  const a = await SG.auftrag({ routeId: "u-r1700000000000", name: "Testrunde", sport: "rennrad", gpx, hm: route.profile.up, jetzt });
  assert.ok(!a.fehler, a.fehler);
  assert.equal(a.id, "sg-u-r1700000000000");
  assert.equal(a.typ, "road_biking"); assert.equal(a.v, SG.FORMAT);
  assert.equal(a.pruefsumme, crypto.createHash("sha256").update(gpx, "utf8").digest("hex"));
  assert.equal(a.erstellt, jetzt); assert.equal(a.ja_am, jetzt);
  assert.equal(a.gpx, gpx); assert.equal(a.punkte, route.lon.length);
  assert.equal(a.beschreibung, `Ironman Notebook · Rennrad · ${a.km.toFixed(1).replace(".", ",")} km · ${a.hm} Hm`);
  assert.deepEqual(Object.keys(a).sort(), ["beschreibung", "bytes", "erstellt", "gpx", "hm", "id", "ja_am", "km", "name", "pruefsumme", "punkte", "route_id", "sport", "typ", "v"]);
  assert.match((await SG.auftrag({ routeId: "x", name: "a", sport: "ufo", gpx })).fehler, /Streckentyp/);
  assert.match((await SG.auftrag({ name: "a", sport: "rennrad", gpx })).fehler, /gespeichert/);
  assert.match((await SG.auftrag({ routeId: "x", name: " ", sport: "rennrad", gpx })).fehler, /Namen/);
  assert.match((await SG.auftrag({ routeId: "x", name: "a", sport: "rennrad", gpx: "<gpx></gpx>" })).fehler, /Name|Punkte|GPX/);
});

test("Stand: nichts · Auftrag liegt bereit · in Garmin Connect (gleiche oder ältere Fassung) · Fehler · nicht übernommen", () => {
  const id = "sg-u-r1", ps = "a".repeat(64);
  assert.equal(SG.stand({}, [], id).status, null);
  const lok = [{ id, erstellt: "2030-01-05T10:00:00Z", pruefsumme: ps }];
  const s1 = SG.stand({}, lok, id, ps); assert.equal(s1.status, "offen"); assert.equal(s1.gleich, true);
  const D = { strecken_auftraege: [{ id, erstellt: "2030-01-05T10:00:00Z", status: "gesendet", garmin_id: "4711", gesendet_am: "2030-01-05T22:00:00Z", pruefsumme: ps }] };
  const s2 = SG.stand(D, [], id, ps); assert.equal(s2.status, "gesendet"); assert.equal(s2.gleich, true); assert.match(s2.text, /In Garmin Connect seit/); assert.doesNotMatch(s2.text, /ältere/);
  assert.match(SG.stand(D, [], id, "b".repeat(64)).text, /ältere Fassung/);
  const neuerLokal = [{ id, erstellt: "2030-01-06T10:00:00Z", pruefsumme: "b".repeat(64) }];
  assert.equal(SG.stand(D, neuerLokal, id, "b".repeat(64)).status, "offen", "ein neuerer lokaler Auftrag gilt vor dem Stand in den Daten");
  const Df = { strecken_auftraege: [{ id, erstellt: "2030-01-05T10:00:00Z", status: "fehler", fehler: ["Garmin nicht erreichbar"], pruefsumme: ps }] };
  assert.match(SG.stand(Df, [], id, ps).text, /Fehlgeschlagen: Garmin nicht erreichbar/);
  const Da = { strecken_abgelehnt: [{ id, erstellt: "2030-01-05T10:00:00Z", grund: "ohne ausdrückliches Ja (ja_am)" }] };
  assert.match(SG.stand(Da, [], id, ps).text, /Nicht übernommen: ohne ausdrückliches Ja/);
});

test("Verdrahtung: Eingabe strecke_senden in Eingang, Inbox und Werkzeugen; Modul vor dem Planer geladen und im Service Worker", async () => {
  const EG = require("../js/eingang.js");
  assert.ok(typeof EG.LISTEN.strecke_senden === "function" && EG.LISTEN.strecke_senden({ id: "sg-x" }) === "sg-x");
  const lib = await import(path.join(ROOT, "tools", "eingaben_lib.mjs"));
  assert.ok(lib.LISTEN.strecke_senden);
  const out = lib.fuerMerge({ strecke_senden: [{ id: "sg-x", _lokal: true, name: "a" }] }, "test");
  assert.deepEqual(out.strecke_senden_add, [{ id: "sg-x", name: "a" }], "lokale Kennzeichen fallen weg");
  const v5 = R("js/v5-ui.js");
  assert.match(v5, /strecke_senden: \[\]/);
  assert.equal((v5.match(/"garmin_senden", "strecke_senden"/g) || []).length, 2, "count() und importFile()");
  assert.match(v5, /D\.strecken_auftraege/); assert.match(v5, /D\.strecken_abgelehnt/);
  const idx = R("index.html");
  const tag = (f) => idx.indexOf(`<script src="js/${f}"></script>`);
  assert.ok(tag("strecke-garmin.js") > tag("route.js") && tag("route.js") > 0 && tag("strecke-garmin.js") < tag("routen-ui.js"));
  assert.match(R("sw.js"), /"js\/strecke-garmin\.js"/);
  assert.match(R("tools/merge_daily.py"), /strecke_senden_add/);
});

test("Nur mit Ja: kein automatischer Weg – «Alle Tage senden», Tag- und Coach-Module kennen die Strecken nicht; der Auftrag entsteht nur im Knopf «Ja, senden»", () => {
  for (const f of fs.readdirSync(path.join(ROOT, "js")).filter((x) => x.endsWith(".js"))) {
    const t = R("js/" + f);
    if (["routen-ui.js", "strecke-garmin.js", "v5-ui.js", "eingang.js"].includes(f)) continue;
    assert.doesNotMatch(t, /strecke_senden|strecken_auftraege/, `${f} darf Strecken nicht von selbst senden`);
  }
  const ui = R("js/routen-ui.js");
  assert.equal((ui.match(/upsert\("strecke_senden"/g) || []).length, 1, "genau eine Stelle legt den Auftrag an");
  const stelle = ui.slice(ui.indexOf("async function garminSenden"));
  assert.ok(stelle.indexOf('upsert("strecke_senden"') > 0 && stelle.indexOf('upsert("strecke_senden"') < stelle.indexOf("function ", 10), "…und zwar in garminSenden (Knopf «Ja, senden»)");
  assert.match(ui, /\$\("pl-gs-ja"\)\.onclick = garminSenden/);
  assert.doesNotMatch(ui, /Direkt aus dem Notebook senden kommt später/, "der Hinweis «kommt später» ist ersetzt");
  assert.match(ui, /nur dort, nie aufs Gerät/);
});

test("24.11.2026: Upload nicht möglich (Garmin-Dienst liest die Datei nicht) → Knopf verborgen, Seite verspricht nichts", () => {
  const SGm = require("../js/strecke-garmin.js");
  assert.equal(SGm.UPLOAD_MOEGLICH, false, "solange kein Weg zum Dienst bekannt ist, bleibt der Knopf verborgen");
  const ui = R("js/routen-ui.js");
  assert.match(ui, /\$\("pl-garmin"\)\.style\.display = SG\.UPLOAD_MOEGLICH \? "" : "none"/, "Knopf nur bei UPLOAD_MOEGLICH sichtbar");
  assert.match(ui, /SG\.UPLOAD_MOEGLICH \? `<p class="hint"><b>Kürzer:<\/b>/, "der Hinweis «Kürzer» erscheint nur bei UPLOAD_MOEGLICH");
  assert.match(ui, /geht noch nicht: Der Garmin-Dienst kann die Datei nicht/, "sonst steht dort die ehrliche Auskunft");
});

test("Python-Werkzeug und Update-Beschreibung nennen die Regeln: nur Garmin Connect, nur mit Ja, nie löschen", () => {
  const py = R("tools/strecken_senden.py");
  assert.match(py, /nie aufs Gerät schicken/); assert.match(py, /Nur mit Ja je Strecke/); assert.match(py, /Nie löschen/);
  assert.doesNotMatch(py.split('"""')[2], /delete_course|push_workout|schedule/, "der Code ruft nichts bei Garmin auf");
});
