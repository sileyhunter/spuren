/* V9.3.3 W2c enduco-look-1.0 (Auftrag «Woche wie Enduco», Etappe W2c; Silas 23.11.2026: «W2c kannst du machen», Screenshots Archiv_1.zip, nicht im Repo):
   Plan-Kopf mit zwei Kacheln (Training · Bis zum Rennen) und «Plan verwalten», «Diese Woche» mit Phase und ohne Erklärtext, Profil mit Kopf (Kreis, Datenstand).
   Prüft die Verdrahtung im Text; das Aussehen prüft der Playwright-Durchlauf. Kein Name im Code. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const lies = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("Plan-Kopf wie Enduco: Kacheln Training und Bis zum Rennen, Knöpfe Kalender und Plan verwalten", () => {
  const s = lies("js/v7-ui.js");
  assert.match(s, /v7-held-kacheln/); assert.match(s, /<span>Training<\/span>/); assert.match(s, /<span>Bis zum Rennen<\/span>/);
  assert.match(s, /data-planv/); assert.match(s, /V75UI\.flow\(\)/);
  assert.doesNotMatch(s, /Mein Plan diese Woche<\/span>/, "die drei Zahlen sind zwei Kacheln geworden");
});

test("Diese Woche: Phase unter dem Titel (nicht als einklappbarer Erklärtext), langer Hinweis weg", () => {
  const h = lies("index.html"), s = lies("js/v6-heute.js");
  assert.match(h, /<h2>Diese Woche<\/h2><p class="wl-phase" data-wl-sub hidden><\/p>/);
  assert.doesNotMatch(h, /data-wl-sub[^>]*class="sub/, "nicht .sub – der ⓘ-Mechanismus würde es einklappen");
  assert.doesNotMatch(s, /Erledigt = erfasste Aktivitäten/);
  assert.match(s, /K\.w\.phase/);
});

test("Profil mit Kopf (Kreis, Datenstand) und ohne Namen im Code", () => {
  const s = lies("js/v59.js"), v6 = lies("js/v6.js");
  assert.match(s, /es-profil/); assert.match(s, /Trainingsdaten seit/); assert.match(s, /id="v59-ov-h" tabindex="-1">Profil<\/h2>/);
  assert.match(v6, /^\s*person: '/m);
  const i = s.indexOf('<div class="es-profil">'), block = s.slice(i, i + 400);
  assert.match(block, /Dein Profil/); assert.doesNotMatch(block, /Silas/, "kein Name im Profil-Kopf");
});

test("CSS für die neuen Teile", () => {
  const c = lies("css/v6.css");
  for (const k of [".v7-held-kacheln", ".v7-held-knoepfe", "#woche-card .wl-phase", ".es-profil", ".es-avatar"]) assert.ok(c.includes(k), k);
});
