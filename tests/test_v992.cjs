/* V9.9.2 zone5-max-1.0 (Silas 23.11.2026: «Z5 ohne Obergrenze … bis Max»): Z5 des Pulses zeigt die Obergrenze (Maximalpuls des Zonenprofils) –
   Zonenliste, Briefing-Text, Intensitätszonen und Garmin-Pulsziel. Ohne Maximalpuls im Profil bleibt alles wie bisher. Erfundene Zonen. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const TR = require("../js/training-route.js");
const V64 = require("../js/v64.js");
const V66 = require("../js/v66.js");
const V73 = require("../js/v73.js");

const profil = (hfmax) => [{ id: "t", status: "aktiv", name: "Testzonen", skalen: [
  { key: "lauf_hf", disziplin: "lauf", metrik: "puls", unit: "bpm", ...(hfmax ? { hfmax } : {}),
    zonen: [{ z: "Z1", von: null, bis: 130 }, { z: "Z2", von: 130, bis: 150 }, { z: "Z3", von: 150, bis: 170 }, { z: "Z4", von: 170, bis: 180 }, { z: "Z5", von: 180, bis: null }] },
  { key: "lauf_pace", disziplin: "lauf", metrik: "pace", unit: "s/km",
    zonen: [{ z: "Z1", von: null, bis: 400 }, { z: "Z2", von: 400, bis: 330 }, { z: "Z3", von: 330, bis: 290 }, { z: "Z4", von: 290, bis: 270 }, { z: "Z5", von: 270, bis: null }] }] }];

test("Maximalpuls kommt aus dem Profil mit, ohne die Daten zu verändern", () => {
  const P = profil(190), Z = TR.zonen(P);
  assert.equal(Z.skalen.lauf_hf.hfmax, 190);
  assert.equal(Z.skalen.lauf_pace.hfmax, undefined, "nur Pulsskalen");
  assert.equal(P[0].skalen[0].zonen.hfmax, undefined, "das Profil selbst bleibt unverändert");
  assert.equal(JSON.stringify(Z.skalen.lauf_hf), JSON.stringify(P[0].skalen[0].zonen), "nicht aufzählbar: gleiche Zonen, gleiche Form");
  assert.equal(TR.zonen(profil(null)).skalen.lauf_hf.hfmax, undefined);
});

test("Briefing-Text: «180–190 (bis Max …)», ohne Maximalpuls wie bisher", () => {
  const mit = V64.ziel("vo2", "lauf", TR.zonen(profil(190)).skalen), ohne = V64.ziel("vo2", "lauf", TR.zonen(profil(null)).skalen);
  assert.match(mit, /Puls 180–190 \(bis Max, steigt verzögert\)/);
  assert.match(ohne, /Puls über 180 \(steigt verzögert\)/);
  assert.match(mit, /^4:30–3:55\/km/, "die Pace hat seit V9.24.0 eine Obergrenze (115 % der Geschwindigkeit), gelaufen wird die Mitte");
});

test("Intensitätszonen (V73): Puls «180–190 (Max)»", () => {
  const S = TR.zonen(profil(190)).skalen, S0 = TR.zonen(profil(null)).skalen;
  assert.equal(V73.zonenBereich(5, "lauf", S, null, "puls", null), "180–190 bpm (Max)");
  assert.equal(V73.zonenBereich(5, "lauf", S0, null, "puls", null), "über 180 bpm");
  assert.equal(V73.zonenBereich(4, "lauf", S, null, "puls", null), "170–180 bpm");
});

test("Garmin-Pulsziel VO2max: geschlossen bis Maximalpuls; ohne Maximalpuls offen wie bisher", () => {
  assert.deepEqual(V66.garminPuls("vo2", "lauf", TR.zonen(profil(190)).skalen), { art: "puls", lo: 180, hi: 190, offen: false });
  assert.deepEqual(V66.garminPuls("vo2", "lauf", TR.zonen(profil(null)).skalen), { art: "puls", lo: 180, hi: 198, offen: true });
  assert.deepEqual(V66.garminPuls("vo2", "lauf", TR.zonen(profil(170)).skalen), { art: "puls", lo: 180, hi: 198, offen: true }, "Maximalpuls unter Z5: ignoriert");
});
