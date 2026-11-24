/* V9.15.0 planer-schlank-1.0 (Outdoor O2): Sportleiste, Magnet, gebündelte Einwilligung, untere Leiste, Fertig, Merken der Sportart.
 * Reine Logik (js/planer-schlank.js) und Verdrahtung (Text-Prüfungen von index.html, js/routen-ui.js, sw.js). Die Bedienung prüft tools/durchklick_planer.py. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), R = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const PS = require("../js/planer-schlank.js");

test("Sportleiste: Skitour · Wandern · Laufen ▾ (Laufen, Trail) · Rad ▾ (Rennrad, Gravel, MTB)", () => {
  assert.deepEqual(PS.GRUPPEN.map((g) => g.label), ["Skitour", "Wandern", "Laufen", "Rad"]);
  assert.deepEqual(PS.gruppe("laufen").sportarten, ["laufen", "trail"]);
  assert.deepEqual(PS.gruppe("rad").sportarten, ["rennrad", "gravel", "mtb"]);
  assert.deepEqual(PS.GRUPPEN.filter(PS.klappt).map((g) => g.id), ["laufen", "rad"]);
  assert.equal(PS.gruppeVon("gravel").id, "rad"); assert.equal(PS.gruppeVon("trail").id, "laufen"); assert.equal(PS.gruppeVon("unbekannt"), null);
  assert.equal(PS.alleSportarten().length, 7);
});
test("zuletzt benutzte Sportart: beim ersten Mal Skitour, der alte Schlüssel zählt nicht, Unbekanntes fällt auf Skitour", () => {
  assert.equal(PS.startSport(null), "skitour");
  assert.equal(PS.startSport(undefined), "skitour");
  assert.equal(PS.startSport("gravel"), "gravel");
  assert.equal(PS.startSport("segeln"), "skitour");
  assert.equal(PS.startSport("mtb", ["skitour", "wandern"]), "skitour", "nur Sportarten, die die Seite kennt");
  const ui = R("js/routen-ui.js");
  assert.match(ui, /PS\.startSport\(S\.get\("sport2", null\)/, "gelesen wird sport2");
  assert.doesNotMatch(ui, /S\.get\("sport"/, "der alte Schlüssel «sport» wird nicht mehr gelesen");
  assert.doesNotMatch(ui, /S\.set\("sport"/, "…und nicht mehr geschrieben");
});
test("Tipp auf einen Gruppenknopf: bleibt in der Gruppe, sonst die gemerkte, sonst der Standard", () => {
  assert.equal(PS.nachGruppenTipp("rad", "gravel", {}), "gravel");
  assert.equal(PS.nachGruppenTipp("rad", "skitour", {}), "rennrad");
  assert.equal(PS.nachGruppenTipp("rad", "skitour", { rad: "mtb" }), "mtb");
  assert.equal(PS.nachGruppenTipp("laufen", "wandern", { laufen: "trail" }), "trail");
  assert.equal(PS.nachGruppenTipp("laufen", "wandern", { laufen: "rennrad" }), "laufen", "Gemerktes ausserhalb der Gruppe zählt nicht");
  assert.equal(PS.nachGruppenTipp("skitour", "rad", {}), "skitour");
  assert.equal(PS.nachGruppenTipp("x", "wandern", {}), "wandern");
});

test("Einwilligung gebündelt: einmal fragen, Erlauben setzt alle drei, Nur von Hand widerruft alle drei", () => {
  assert.deepEqual(PS.DIENSTE, ["routing", "skirouten", "wetter"]);
  assert.equal(PS.buendelOffen({}), true); assert.equal(PS.buendelOffen(undefined), true);
  const t = "2026-11-24T10:00:00.000Z", e = PS.erlauben({ endpoint: "x" }, t);
  assert.equal(e.routing && e.skirouten && e.wetter, true);
  assert.equal(e.routing_am, t); assert.equal(e.buendel_am, t); assert.equal(e.endpoint, "x", "Fremdes bleibt");
  assert.equal(PS.buendelOffen(e), false); assert.equal(PS.istNurHand(e), false);
  const h = PS.nurVonHand(e, t);
  assert.deepEqual(PS.DIENSTE.map((k) => h[k]), [false, false, false]);
  assert.equal(PS.istNurHand(h), true); assert.equal(PS.buendelOffen(h), false, "nicht nochmals fragen");
  assert.equal(PS.anzahlErlaubt(e), 3); assert.equal(PS.anzahlErlaubt(h), 0); assert.equal(PS.anzahlErlaubt(null), 0);
});
test("früher einzeln Erteiltes zählt: das Bündel wird dann nicht mehr gefragt; Einzelschalter widerrufen und erteilen", () => {
  assert.equal(PS.buendelOffen({ routing: true }), false);
  assert.equal(PS.buendelOffen({ wetter: true }), false);
  let c = PS.einzeln({}, "wetter", true, "T"); assert.equal(c.wetter, true); assert.equal(c.wetter_am, "T");
  c = PS.einzeln(c, "wetter", false); assert.equal(c.wetter, false);
  assert.deepEqual(PS.einzeln({ routing: true }, "gibtsnicht", true), { routing: true });
  assert.equal(PS.istNurHand({ routing: false, skirouten: false, wetter: false }), false, "ohne Entscheidung (kein buendel_am) ist es kein «Nur von Hand»");
});
test("Der Satz zur Einwilligung nennt alle drei Dienste, die Texte je Dienst sagen was wohin geht", () => {
  assert.match(PS.SATZ, /BRouter/); assert.match(PS.SATZ, /swisstopo/); assert.match(PS.SATZ, /Open-Meteo/); assert.match(PS.SATZ, /Koordinaten/);
  for (const k of PS.DIENSTE) { const d = PS.DIENST_TEXT[k]; assert.ok(d.name && d.wohin && d.was, k); }
});

test("Magnet: beim Start an (ausser «Nur von Hand»); er braucht für Skitour die Skitourenrouten, sonst das Wegnetz", () => {
  assert.equal(PS.magnetStart(false), true); assert.equal(PS.magnetStart(true), false);
  assert.equal(PS.magnetBrauchtZustimmung("skitour", {}), true);
  assert.equal(PS.magnetBrauchtZustimmung("skitour", { skirouten: true }), false);
  assert.equal(PS.magnetBrauchtZustimmung("skitour", { routing: true }), true, "BRouter allein genügt für die Skitour nicht");
  assert.equal(PS.magnetBrauchtZustimmung("rennrad", { skirouten: true }), true);
  assert.equal(PS.magnetBrauchtZustimmung("rennrad", { routing: true }), false);
});

test("Untere Leiste: km · ↑ · ↓ · Zeit", () => {
  assert.equal(PS.zeit(7380), "2:03"); assert.equal(PS.zeit(3599.6), "1:00"); assert.equal(PS.zeit(0), "0:00"); assert.equal(PS.zeit(null), null); assert.equal(PS.zeit(-5), null);
  const l = PS.leiste({ laenge_m: 12345, auf_m: 800.4, ab_m: 790.2, zeit_s: 7380 });
  assert.equal(l.km, "12.3"); assert.match(l.auf, /^800$/); assert.match(l.ab, /^790$/); assert.equal(l.zeit, "2:03");
  assert.equal(PS.leiste({ laenge_m: 1480 }).km, "1.48", "unter 10 km zwei Stellen");
  assert.deepEqual(PS.leiste({ laenge_m: 1480 }), { km: "1.48", auf: "–", ab: "–", zeit: "–" }, "Fehlendes als Strich, nie erfunden");
  assert.equal(PS.leiste(null), null); assert.equal(PS.leiste({}), null);
  assert.equal(PS.leisteText(PS.leiste({ laenge_m: 12345, auf_m: 800, ab_m: 790, zeit_s: 7380 })), "12.3 km · ↑ 800 m · ↓ 790 m · 2:03 h");
});

test("Fertig: speichert unter «Sportart Datum», ein eigener Name bleibt; Meldung unterscheidet Linie und Entwurf", () => {
  assert.equal(PS.name("", "Skitour", "24.11.2026"), "Skitour 24.11.2026");
  assert.equal(PS.name("   ", "Rennrad", "24.11.2026"), "Rennrad 24.11.2026");
  assert.equal(PS.name(" Parpaner Rothorn ", "Skitour", "24.11.2026"), "Parpaner Rothorn");
  assert.match(PS.fertigText("X", {}, null), /mit Linie, auch offline/);
  assert.match(PS.fertigText("X", null, null), /Entwurf.*noch nicht geroutet/);
  assert.match(PS.fertigText("X", null, { text: "e" }), /Routing fehlgeschlagen/);
});

test("⋯-Menü: sieben Einträge in fester Reihenfolge, alle mit den bisherigen Kennungen", () => {
  assert.deepEqual(PS.MENUE.map((m) => m.id), ["rp-add", "rp-rev", "rp-loop", "rp-tr", "rp-undo", "rp-clear", "rp-new"]);
  assert.deepEqual(PS.MENUE.map((m) => m.text), ["Punkte setzen", "Route umkehren", "Hin und zurück", "Training → Route", "Rückgängig", "Alle Punkte löschen", "Neu"]);
  const ui = R("js/routen-ui.js"), menu = ui.slice(ui.indexOf('id="rp-menu"'), ui.indexOf('<div class="rp-btns">'));
  assert.deepEqual([...menu.matchAll(/id="(rp-[a-z]+)"/g)].map((m) => m[1]).filter((x) => x !== "rp-menu"), PS.MENUE.map((m) => m.id));
});

test("Verdrahtung: Skript-Reihenfolge, Service Worker, Demo", () => {
  const h = R("index.html"), tag = (f) => h.indexOf(`<script src="js/${f}">`);
  assert.ok(tag("planer-schlank.js") > tag("strecke-garmin.js") && tag("planer-schlank.js") < tag("routen-ui.js") && tag("planer-schlank.js") > 0);
  const sw = R("sw.js"); assert.match(sw, /"js\/planer-schlank\.js"/); assert.match(sw, /const CACHE = "notebook-v9\d+-/);   // V9.15.1: Name wird bei jeder Änderung angehoben, hier nur das Muster
  assert.match(R("demo.html"), /<script src="js\/planer-schlank\.js">/, "Demo neu erzeugt (tools/make_demo.py)");
  assert.match(h, /\.planner\.rp\[data-sheet="min"\] \{ height: 200px; \}/);
  assert.match(R("js/routen-ui.js"), /ziel = \{ min: 200, half:/, "gleiche Mindesthöhe in CSS und Kartenpolsterung");
});
test("Verdrahtung: alle bisherigen Kennungen des Planers bleiben, jede genau einmal", () => {
  const ui = R("js/routen-ui.js"), sk = ui.slice(ui.indexOf("function skeleton()"), ui.indexOf("function init(ctx)"));
  const ids = ["rp-grip", "rp-scroll", "rp-sub", "rp-add", "rp-undo-k", "rp-clear", "rp-rev", "pl-close", "rp-mini", "rp-train", "rp-sports", "rp-opts", "rp-consent", "rp-search", "rp-q", "rp-qrole", "rp-qres", "rp-vias", "rp-tr", "rp-loop", "rp-undo", "rp-new", "rp-status", "rp-gap", "rp-ski", "rp-gravel", "rp-kpis", "rp-when", "rp-var", "rp-mtb", "rp-alt", "rp-winter", "rp-ana", "rp-int", "rp-arr", "rp-wx", "rp-saverow", "pl-name", "pl-save", "pl-gpx", "pl-gpx-dl", "pl-garmin", "pl-gs", "pl-msg", "pl-gs-stand", "rp-garmin", "rp-srcbox", "rp-live",
    "rp-sport2", "rp-magnet", "rp-details", "rp-dienste", "rp-bar", "rp-menu", "rp-det-btn", "rp-more", "pl-fertig"];
  for (const i of ids) assert.equal((sk.match(new RegExp(`id="${i}"`, "g")) || []).length, 1, i);
  // Details enthält alles Bisherige, Hauptbereich nur das Nötige
  const det = sk.slice(sk.indexOf('id="rp-details"'), sk.indexOf('id="rp-bar"'));
  for (const i of ["rp-opts", "rp-search", "rp-vias", "pl-name", "rp-ski", "rp-kpis", "rp-when", "rp-var", "rp-mtb", "rp-alt", "rp-winter", "rp-ana", "rp-int", "rp-arr", "rp-wx", "rp-srcbox", "rp-dienste"]) assert.match(det, new RegExp(`id="${i}"`), i + " unter Details");
  for (const i of ["rp-status", "rp-consent", "rp-saverow", "pl-msg", "rp-garmin", "rp-gravel"]) assert.doesNotMatch(det, new RegExp(`id="${i}"`), i + " bleibt im Hauptbereich");
  assert.match(sk, /<div class="rp-details" id="rp-details" hidden>/, "Details sind zu Beginn zu");
});
test("Einwilligung und Regeln: Koordinaten erst nach dem Ja, kein Dienst vor der Frage, Garmin bleibt verborgen", () => {
  const ui = R("js/routen-ui.js"), rr = ui.slice(ui.indexOf("async function reroute"), ui.indexOf("async function buildSkitour"));
  assert.ok(rr.indexOf("PS.buendelOffen(consent())") > 0 && rr.indexOf("PS.buendelOffen(consent())") < rr.indexOf("await buildSkitour"), "die Frage kommt vor dem ersten Dienstaufruf");
  assert.ok(rr.indexOf("PS.buendelOffen(consent())") < rr.indexOf("routeVarianten"), "…und vor BRouter");
  assert.match(ui, /function buendelNurHand\(\)[\s\S]*PS\.nurVonHand/, "«Nur von Hand» widerruft");
  assert.match(ui, /\$\("pl-garmin"\)\.style\.display = SG\.UPLOAD_MOEGLICH \? "" : "none"/, "An Garmin senden bleibt bei UPLOAD_MOEGLICH=false verborgen");
  assert.doesNotMatch(R("js/planer-schlank.js"), /Lawine|Schneehöhe|Schneetiefe/i, "das neue Modul sagt nichts über Lawinen oder Schnee");
  assert.match(R("js/route.js"), /VERSIONS = \{/);
});
test("Versionskennungen: planer-schlank-1.0 neu, die bisherigen unverändert", () => {
  assert.equal(PS.VERSION, "planer-schlank-1.0");
  const RT = require("../js/route.js");
  for (const [k, v] of Object.entries({ varianten: "varianten-3.0", hand: "hand-1.0", ski: "skiroute-1.0", training: "trainingsroute-1.2", wegpunkte: "wegpunkte-1.1" })) {
    const all = JSON.stringify(RT.VERSIONS || {}) + R("js/route.js") + R("js/routen-ui.js") + R("js/training-route.js");
    assert.ok(all.includes(v), `${k}: ${v}`);
  }
  assert.match(R("docs/versionsliste-v9.15.md"), /planer-schlank-1\.0/);
});
