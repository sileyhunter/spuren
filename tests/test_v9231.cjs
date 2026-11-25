// Abnahmetests V9.23.1 (js/v66.js, js/v66-ui.js): Zwift-Export über Intervals.icu (zwift-export-1.0). Alle Zonen sind erfunden. Aufruf: node --test tests/test_v9231.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const V66 = require("../js/v66.js");

const SK = { rad_w: [{ z: "Z1", von: null, bis: 190 }, { z: "Z2", von: 190, bis: 235 }, { z: "Z3", von: 235, bis: 285 }, { z: "Z4", von: 285, bis: 330 }, { z: "Z5", von: 330, bis: null }] };
const E = (vorlage, dauer, extra) => V66.einheit(Object.assign({ uid: "u1", vorlage, dauer, quelle: "eigen" }, extra || {}));

test("zwift-export-1.0: rad_locker 90 min = Warmup-Rampe, fester Hauptteil, Cooldown-Rampe; Prozent der Zwift-FTP; Dauer stimmt", () => {
  const r = V66.zwiftText(E("rad_locker", 90), SK, { ftp: 250 });
  assert.ok(!r.fehler, r.fehler);
  assert.equal(r.dauer_s, 90 * 60);
  assert.equal(r.text, "Warmup\n- 6m45s ramp 26-76%\n\nHauptteil\n- 3m15s 51%\n- 1h13m15s 85%\n\nCooldown\n- 6m45s ramp 76-26%");
});

test("zwift-export-1.0: gleiche Watt bei anderer FTP – 65 W bei FTP 300 sind 22 %", () => {
  const r = V66.zwiftText(E("rad_locker", 90), SK, { ftp: 300 });
  assert.match(r.text, /Warmup\n- 6m45s ramp 22-63%/);
});

test("zwift-export-1.0: ohne FTP, ohne Rad oder Bibliothek kein Text – nichts geraten", () => {
  assert.match(V66.zwiftText(E("rad_locker", 90), SK, {}).fehler, /FTP/);
  assert.ok(V66.zwiftText({ sport: "lauf", teile: [["z2", 30]] }, SK, { ftp: 250 }).fehler);
  assert.ok(V66.zwiftText(E("rad_locker", 90), { rad_w: [] }, { ftp: 250 }).fehler);
});

test("zwift-export-1.0: Intervalle mit Wiederholung stehen als «Intervalle Nx» im Kopf, Dauer = Einheit", () => {
  const r = V66.zwiftText(E("rad_vo2_4x5", 60), SK, { ftp: 250 });
  assert.ok(!r.fehler, r.fehler);
  assert.match(r.text, /Intervalle 3x\n- 5m 142%\n- 2m30s 51%/);
  assert.equal(r.dauer_s, 60 * 60);
});

test("zwift-export-1.0: Eintrag für Intervals.icu – Kategorie, Tag, Ride, fester external_id (ersetzt statt doppelt), Name mit Vorsatz", () => {
  const r = V66.zwiftEintrag(E("rad_locker", 90, { titel: "Locker" }), "2026-11-25", SK, { ftp: 250 });
  assert.ok(!r.fehler, r.fehler);
  const x = r.eintrag;
  assert.equal(x.category, "WORKOUT"); assert.equal(x.type, "Ride"); assert.equal(x.start_date_local, "2026-11-25T00:00:00");
  assert.equal(x.external_id, "in-u1"); assert.ok(x.name.startsWith(V66.GARMIN_PREFIX)); assert.equal(x.description, r.text);
  assert.equal(V66.zwiftEintrag(E("rad_locker", 90), "2026-11-26", SK, { ftp: 250 }).eintrag.external_id, "in-u1");
});

test("zwift-export-1.0: Oberfläche – Schlüssel nur im Gerät (localStorage), nie im Code; Knopf, Kopieren und Einrichten sind da", () => {
  const ui = fs.readFileSync(require.resolve("../js/v66-ui.js"), "utf8");
  for (const m of ["data-zwsend", "data-zwcopy", "data-zwsave", "zwiftHTML(ds, t)", "localStorage.getItem(ZW_KEY)", "intervals.icu/api/v1/athlete/"]) assert.ok(ui.includes(m), m);
  assert.ok(!/API_KEY:[A-Za-z0-9]{8,}/.test(ui), "kein fester Schlüssel im Code");
});
