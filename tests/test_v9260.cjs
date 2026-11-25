// Abnahmetests V9.26.0 (js/v66.js, js/v66-ui.js, tools/zwift_senden.py): zwift-nacht-1.0 – Rad-Aufträge tragen den Zwift-Eintrag für Intervals.icu mit,
// das Nacht-Update sendet ihn. Aufruf: node --test tests/test_v9260.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const V66 = require("../js/v66.js");
const SK = {
  rad_w: [{ z: "Z1", von: null, bis: 160 }, { z: "Z2", von: 160, bis: 200 }, { z: "Z3", von: 200, bis: 240 }, { z: "Z4", von: 240, bis: 257 }, { z: "Z5", von: 257, bis: null }],
  lauf_pace: [{ z: "Z1", von: null, bis: 380 }, { z: "Z2", von: 380, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }],
};
const einheit = (vorlage, uid) => V66.einheit({ uid, vorlage, dauer: V66.bereich(vorlage).std, quelle: "eigen" }, {});
const zwiftOpt = (ds) => ({ zwift: (e) => { const r = e.sport === "rad" ? V66.zwiftEintrag(e, ds, SK, { ftp: 250 }) : null; return r && r.eintrag ? { eintrag: r.eintrag, fassung: r.fassung } : null; } });

test("zwift-nacht-1.0: Rad-Einheit im Auftrag trägt den Eintrag für Intervals.icu (Tag, external_id, Prozent der FTP); Lauf nicht", () => {
  const a = V66.garminAuftrag("2026-03-06", [einheit("rad_vo2", "r1"), einheit("lauf_laktat", "l1")], SK, "auto", "2026-03-05T12:00:00+01:00", zwiftOpt("2026-03-06"));
  const rad = a.einheiten.find((u) => u.uid === "r1"), lauf = a.einheiten.find((u) => u.uid === "l1");
  assert.ok(rad.zwift && rad.zwift.fassung, "Rad mit Zwift");
  assert.equal(rad.zwift.eintrag.start_date_local, "2026-03-06T00:00:00");
  assert.equal(rad.zwift.eintrag.external_id, "in-r1");
  assert.match(rad.zwift.eintrag.description, /Warmup[\s\S]*%/);
  assert.ok(!("zwift" in lauf), "Lauf ohne Zwift");
});

test("zwift-nacht-1.0: ohne Option (kein Zugang oder Haken aus) trägt der Auftrag keinen Zwift-Eintrag; die Garmin-Fassung bleibt gleich", () => {
  const mit = V66.garminAuftrag("2026-03-06", [einheit("rad_locker", "r1")], SK, "auto", "", zwiftOpt("2026-03-06"));
  const ohne = V66.garminAuftrag("2026-03-06", [einheit("rad_locker", "r1")], SK, "auto", "", {});
  assert.ok(!("zwift" in ohne.einheiten[0]));
  assert.equal(mit.einheiten[0].fassung, ohne.einheiten[0].fassung);
});

test("zwift-nacht-1.0: Seite – Zugang und Haken steuern den Eintrag; Änderungen erneuern den Auftrag (Fingerabdruck enthält die Zwift-Fassung)", () => {
  const src = fs.readFileSync(__dirname + "/../js/v66-ui.js", "utf8");
  assert.match(src, /const zwiftFuer = \(e, ds\) =>/);
  assert.match(src, /cfg\.auto === false \|\| !\(cfg\.key && \+cfg\.ftp > 0\) \|\| !zwiftTauglich\(e\)/);
  assert.match(src, /zwift: \(e\) => zwiftFuer\(e, ds\)/);
  assert.equal((src.match(/\(u\.zwift && u\.zwift\.fassung\)/g) || []).length, 3, "alle drei Fingerabdrücke");
});
