// Abnahmetests V9.24.1 (js/v66.js, js/v66-ui.js, js/v73-ui.js): Zwift-Export auch auf der Einheit-Seite (zwift-export-2.0). Alle Zonen sind erfunden.
// Die Bedienung selbst (einrichten, senden, «gesendet», Fehlerfälle) prüft tools/durchklick_zwift.py im Browser gegen die Demo. Aufruf: node --test tests/test_v9241.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const V66 = require("../js/v66.js");

const R = (p) => fs.readFileSync(require.resolve("../" + p), "utf8");
const SK = { rad_w: [{ z: "Z1", von: null, bis: 190 }, { z: "Z2", von: 190, bis: 235 }, { z: "Z3", von: 235, bis: 285 }, { z: "Z4", von: 285, bis: 330 }, { z: "Z5", von: 330, bis: null }] };
const E = (vorlage, dauer, extra) => V66.einheit(Object.assign({ uid: "u1", vorlage, dauer, quelle: "eigen" }, extra || {}));

test("zwift-export-2.0: Eintrag für Intervals.icu ist als Indoor markiert (Zwift nimmt nur Rolleneinheiten), sonst unverändert", () => {
  const r = V66.zwiftEintrag(E("rad_locker", 90, { titel: "Locker" }), "2026-11-26", SK, { ftp: 250 });
  assert.ok(!r.fehler, r.fehler);
  assert.equal(r.eintrag.indoor, true);
  assert.equal(r.eintrag.category, "WORKOUT"); assert.equal(r.eintrag.type, "Ride"); assert.equal(r.eintrag.external_id, "in-u1");
  assert.ok(r.fassung, "Fassung für «seither geändert»");
  const anders = V66.zwiftEintrag(E("rad_locker", 90, { titel: "Locker" }), "2026-11-26", SK, { ftp: 300 });
  assert.notEqual(anders.fassung, r.fassung, "andere FTP = andere Fassung");
});

test("zwift-export-2.0: Einheit-Seite → Export zeigt für Rad-Einheiten «Zwift (Rolle)» über denselben Abschnitt wie das Tagesblatt", () => {
  const ui = R("js/v66-ui.js"), e = R("js/v73-ui.js");
  for (const m of ["M.zwiftTauglich = zwiftTauglich", "M.zwiftAbschnitt = zwiftAbschnitt", "M.zwiftBinden = zwiftBinden", "data-zwabschnitt", "function zwiftHTML(ds, t)", "zwiftAbschnitt(ds, zwiftListe(t))"]) assert.ok(ui.includes(m), m);
  for (const m of ["U66().zwiftAbschnitt(ds, [e])", "U66().zwiftBinden(ov, ds, [e])", `"Export" : "An Garmin senden"`, "zwiftTauglich(e)"]) assert.ok(e.includes(m), m);
  assert.ok(e.includes('e.sport === "rad"'), "nur Rad");
});

test("zwift-export-2.0: Bibliothek (Enduco) und Nicht-Rad gehen nicht nach Zwift; Abschnitt nur heute bis 14 Tage voraus", () => {
  const ui = R("js/v66-ui.js");
  assert.match(ui, /zwiftTauglich = \(e\) => !!\(e && e\.sport === "rad" && e\.art !== "bibliothek" && e\.quelle !== "bibliothek"/);
  assert.match(ui, /ds < heute\(\) \|\| ds > add\(heute\(\), 14\)/);
});

test("zwift-export-2.0: Senden – ein Eintrag je Einheit, Upsert, bei 400/422 ein zweiter Versuch ohne «indoor» mit Hinweis, 401/403 meldet den Schlüssel", () => {
  const ui = R("js/v66-ui.js");
  assert.ok(ui.includes("events/bulk?upsert=true"));
  assert.match(ui, /rsp\.status === 400 \|\| rsp\.status === 422\) \{ rsp = await senden\(false\)/);
  assert.match(ui, /if \(!mitIndoor\) delete e\.indoor/);
  assert.match(ui, /Ohne Indoor-Markierung gesendet/);
  assert.match(ui, /rsp\.status === 401 \|\| rsp\.status === 403/);
});

test("zwift-export-2.0: Erinnerung «gesendet» / «seither geändert» nur im Gerät, höchstens 60 Einträge; kein Schlüssel im Code", () => {
  const ui = R("js/v66-ui.js");
  assert.ok(ui.includes('ZW_SENT = "in-zwift-gesendet"') && ui.includes("localStorage.setItem(ZW_SENT"));
  assert.match(ui, /\.slice\(0, 60\)/);
  assert.ok(ui.includes("Seit dem Senden geändert") && ui.includes("Nochmals an Zwift senden"));
  assert.ok(!/API_KEY:[A-Za-z0-9]{8,}/.test(ui), "kein fester Schlüssel im Code");
  assert.ok(!/Bearer [A-Za-z0-9]{16,}/.test(ui));
});

test("zwift-export-2.0: Zwischenspeicher der Seite ist erneuert", () => {
  assert.match(R("sw.js"), /const CACHE = "notebook-v9\d+/);
});
