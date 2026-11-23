/* V9.9 heute-einfach-1.0 (Silas 23.11.2026: «möglichst einfach aussehen und einfach handhaben»): Heute antwortet mit einem Satz «Was mache ich heute?».
   Alles erfunden. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V91 = require("../js/v91.js");
const W = { rad: "Rad", lauf: "Laufen", schwimm: "Schwimmen" }, wort = (s) => W[s] || "Training";

test("Versionen", () => { assert.equal(V91.VERSIONS.heute, "heute-einfach-1.0"); assert.equal(V91.VERSIONS.zusammen, "zusammen-1.0"); });

test("Dauer in Worten", () => {
  assert.equal(V91.dauerText(50), "50 min"); assert.equal(V91.dauerText(90), "1 h 30"); assert.equal(V91.dauerText(120), "2 h");
  assert.equal(V91.dauerText(63), "1 h 03"); assert.equal(V91.dauerText(0), ""); assert.equal(V91.dauerText(null), "");
});

test("Eine Antwort: Einheit · Dauer, «noch», erledigt, frei, Renntag", () => {
  const a = (o) => V91.heuteAntwort(Object.assign({ wort }, o)).text;
  assert.equal(a({ offen: [{ titel: "Lauf locker", sport: "lauf", dauer: 50 }] }), "Heute: «Lauf locker» · 50 min.");
  assert.equal(a({ offen: [{ titel: "Rad lang", sport: "rad", dauer: 150 }], erledigt: 1 }), "Heute noch: «Rad lang» · 2 h 30.");
  assert.equal(a({ offen: [{ sport: "schwimm", dauer: 45 }, { titel: "Kraft", sport: "kraft" }] }), "Heute: «Schwimmen» · 45 min und «Kraft».");
  assert.equal(a({ frei: [{ sport: "schwimm", min: 51 }] }), "Heute erledigt: Schwimmen 51 min.", "absolviert ohne Plan: nicht «nichts geplant»");
  assert.equal(a({ erledigt: 2 }), "Heute ist alles erledigt.");
  assert.equal(a({}), "Heute frei.");
  assert.equal(a({ rennen: "Probe-Triathlon", offen: [{ titel: "x" }] }), "Heute ist Renntag: «Probe-Triathlon».");
});

test("Ampel: nur Sicherheit als Zusatz, sonst nichts (Kachel und Vorschlag zeigen den Rest)", () => {
  const h = (amp) => V91.heuteAntwort({ wort, offen: [{ titel: "VO2max", sport: "rad", dauer: 60 }], ampel: amp }).hinweis;
  assert.equal(h({ status: "vorsichtig", empfehlung: "Intensität reduzieren …" }), "");
  assert.equal(h({ status: "bereit", empfehlung: "Geplante Einheit wie vorgesehen." }), "");
  assert.equal(h({ status: "vorsichtig", empfehlung: "Keine harte oder lange Einheit. Bei Fieber …", krank: true }), "Keine harte oder lange Einheit. Bei Fieber …");
  assert.equal(h({ status: "vorsichtig", empfehlung: "Was schmerzt, nicht belasten.", schmerz: true }), "Was schmerzt, nicht belasten.");
  assert.equal(h(null), "");
});
