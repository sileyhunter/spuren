// Abnahmetests V5.9 (js/eingang.js, js/v59-logik.js) – nur erfundene Werte mit bekanntem Ergebnis, keine echten Trainingsdaten.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = undefined;
const EG = require("../js/eingang.js");
const L = require("../js/v59-logik.js");
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""}: ${a} statt ${b} (±${tol})`);
async function testKey() {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode("nur-ein-test-passwort"), "PBKDF2", false, ["deriveBits"]);
  const raw = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new Uint8Array(16), iterations: 1000, hash: "SHA-256" }, base, 256));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/* ---------------- eingang-1.0 ---------------- */
test("Eingang: nur Neues und Geändertes wird gesendet, Bestätigungen in einer eigenen Datei", () => {
  const data = { befinden: [{ date: "2026-11-10", muede: 2, muskel: 3, stress: 1, _lokal: true }], fueling: [{ id: "f1", kh: 60 }],
    laktat_bestaetigt: ["stufentest-x"], laktat_punkte_bestaetigt: [], archiv: [], notizen: { "plan-2026-11-10": "locker" }, startorte: null,
    routen: [{ id: "u-r1", name: "Runde", coords: [[9.5, 46.8], [9.51, 46.81]] }], routen_entfernt: ["u-r0"] };
  const o1 = EG.offen(data, {});
  assert.equal(o1.normal.n, 5, "Befinden, Fueling, Notiz, Route, gelöschte Route");
  assert.equal(o1.bestaetigung.n, 1);
  assert.deepEqual(o1.bestaetigung.daten, { laktat_bestaetigt: ["stufentest-x"] });
  assert.ok(!("_lokal" in o1.normal.daten.befinden[0]), "lokales Kennzeichen geht nicht mit");
  const ges = Object.assign({}, o1.normal.keys, o1.bestaetigung.keys);
  assert.equal(EG.offen(data, ges).n, 0, "nach dem Senden: nichts mehr offen");
  data.befinden[0].stress = 2;                                   // Änderung am gleichen Tag → gleiche ID, neuer Inhalt
  const o2 = EG.offen(data, ges);
  assert.equal(o2.n, 1); assert.equal(o2.normal.daten.befinden[0].stress, 2);
  assert.equal(EG.offen(Object.assign({}, data, { befinden: [{ stress: 2, muskel: 3, muede: 2, date: "2026-11-10" }] }), Object.assign({}, ges, o2.normal.keys)).n, 0, "Reihenfolge der Felder egal");
  data.startorte = [{ id: "o1", name: "Zuhause-Test", lon: 9.5, lat: 46.8 }];
  assert.ok(EG.offen(data, ges).normal.daten.startorte, "Startorte als ganze Liste");
});
test("Eingang: Sendeliste vergisst, was auf dem Gerät nicht mehr steht", () => {
  const data = { befinden: [{ date: "2026-11-10", muede: 1, muskel: 1, stress: 1 }] };
  const ges = { "befinden|2026-11-10": "abc", "befinden|2026-11-09": "def", "laktat_bestaetigt|x": "1" };
  assert.deepEqual(Object.keys(EG.aufraeumen(data, ges)), ["befinden|2026-11-10"]);
});
test("Eingang: Dateiname verrät nur den Zeitpunkt (UTC) und hat 8 Zufallszeichen", () => {
  const n = EG.dateiname(new Date(Date.UTC(2026, 10, 10, 6, 5, 9)), "0a1b2c3d");
  assert.equal(n, "eingang/20261110T060509Z-0a1b2c3d.bin");
  assert.ok(EG.NAME_RE.test(n.split("/")[1]));
});
test("Eingang EGS1: verschlüsselt, auf eine Zweierpotenz ≥ 16 KiB aufgefüllt, öffnet nur mit dem richtigen Schlüssel", async () => {
  const key = await testKey();
  const obj = EG.inhalt({ befinden: [{ date: "2026-11-10", muede: 2, muskel: 3, stress: 1 }] }, "eingaben", new Date(Date.UTC(2026, 10, 10, 7)));
  const u8 = await EG.schliessen(key, obj);
  assert.equal(String.fromCharCode(...u8.subarray(0, 4)), "EGS1");
  assert.equal(u8.length, 16384, "kleine Eingabe → kleinste Stufe");
  assert.ok(!Buffer.from(u8).includes(Buffer.from("befinden")), "kein Klartext");
  assert.deepEqual(await EG.oeffnen(key, u8), obj);
  const andere = await crypto.subtle.importKey("raw", new Uint8Array(32), "AES-GCM", false, ["encrypt", "decrypt"]);
  await assert.rejects(EG.oeffnen(andere, u8), "falscher Schlüssel");
  const kaputt = u8.slice(); kaputt[100] ^= 1;
  await assert.rejects(EG.oeffnen(key, kaputt), "verändert");
  const gross = EG.inhalt({ routen: [{ id: "u-r1", coords: Array.from({ length: 6000 }, (_, i) => [9 + Math.sin(i) / 7, 46 + Math.cos(i * 1.3) / 9]) }] }, "eingaben", new Date());
  const g = await EG.schliessen(key, gross);
  assert.ok(g.length > 16384 && (g.length & (g.length - 1)) === 0, `grosse Eingabe → nächste Stufe (${g.length})`);
  assert.deepEqual(await EG.oeffnen(key, g), JSON.parse(JSON.stringify(gross)));
});
test("Eingang: verständliche Meldungen für Schlüssel- und Netzfehler", () => {
  assert.match(EG.fehlerText(401), /abgelaufen/);
  assert.match(EG.fehlerText(403), /Contents: Read and write/);
  assert.match(EG.fehlerText(404), /sileyhunter\/spuren/);
  assert.match(EG.fehlerText(503), /nichts geht verloren/);
});

/* ---------------- befinden-1.1 ---------------- */
test("Check-in: drei Tipps füllen dieselben Felder wie das Befinden (Beine → Muskeln, Energie → Müdigkeit, Kopf → Stress)", () => {
  const b = L.checkinEintrag("2026-11-10", { muskel: 4, muede: 2, stress: 1 }, { notiz: "  gut geschlafen ", erfasst: "2026-11-10T06:50:00Z" });
  assert.deepEqual(b, { date: "2026-11-10", muede: 2, muskel: 4, stress: 1, quelle: "checkin", v: "befinden-1.1", erfasst: "2026-11-10T06:50:00Z", notiz: "gut geschlafen" });
  assert.equal(L.checkinEintrag("2026-11-10", { muskel: 4, muede: 2 }), null, "ohne alle drei kein Eintrag");
  assert.equal(L.checkinEintrag("2026-11-10", { muskel: 6, muede: 2, stress: 1 }), null, "nur 1–5");
  assert.deepEqual(L.checkinEintrag("2026-11-10", { muskel: 1, muede: 1, stress: 1 }, { krank: true }).krank, ["krank oder verletzt"]);
  assert.deepEqual(L.checkinEintrag("2026-11-10", { muskel: 1, muede: 1, stress: 1 }, { krank: ["Fieber"] }).krank, ["Fieber"]);
  assert.equal(L.gefuehl(b), 6 - 7 / 3);
  assert.equal(L.gefuehl({ muede: 2, muskel: 3 }), null, "fehlt eine Antwort → unbekannt");
});
test("Rangkorrelation: bekannte Werte, gleiche Ränge gemittelt", () => {
  assert.equal(L.spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7.5]), 0.9);
  assert.equal(L.spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  near(L.spearman([1, 2, 2, 3], [1, 2, 3, 4]), 0.9487, 1e-4, "Bindungen");
  assert.equal(L.spearman([1, 2], [2, 1]), null, "unter 3 Paaren keine Aussage");
});
test("Gefühl gegen Morgenwerte: erst ab 20 Morgen; der passende Wert wird erkannt, Richtung geprüft", () => {
  const days = [], bef = [], acts = [];
  for (let i = 0; i < 90; i++) {
    const d = L.addDays("2026-08-01", i), hrv = 60 + 8 * Math.sin(i * 1.7) + (i % 5);
    days.push({ date: d, hrv, rhr: 50 + (i % 3), sleepScore: 70 + ((i * 7) % 20) });
    if (i >= 60) { const g = Math.max(1, Math.min(5, Math.round(3 - (hrv - 62) / 4))); bef.push({ date: d, muede: g, muskel: g, stress: g }); }
    acts.push({ date: d, tss: (i * 13) % 90 });
  }
  const K19 = L.gefuehlKalibrierung(bef.slice(0, 19), days, acts);
  assert.equal(K19.n, 19); assert.equal(K19.werte.length, 0, "unter 20 Morgen keine Zahlen");
  const K = L.gefuehlKalibrierung(bef, days, acts);
  assert.equal(K.n, 30);
  assert.equal(K.bester, "hrv", JSON.stringify(K.werte));
  const h = K.werte.find((w) => w.k === "hrv");
  assert.ok(h.rho > 0.7 && h.erwartet && h.brauchbar, JSON.stringify(h));
});

/* ---------------- morgen-1.0 ---------------- */
test("Heute geplant: Einheiten des Tages mit ihrer Stelle in planned; Stand aus dem letzten Update mit Lauf", () => {
  assert.deepEqual(L.geplantAm([{ date: "2026-11-10" }, { date: "2026-11-11" }, { date: "2026-11-10" }], "2026-11-10").map((x) => x.i), [0, 2]);
  assert.deepEqual(L.geplantAm(null, "2026-11-10"), []);
  assert.equal(L.standText("10.11.2026 08:31", "2026-11-10", "Morgen-Update").text, "Stand 08:31 (Morgen-Update)");
  assert.equal(L.standText("09.11.2026 22:58", "2026-11-10").text, "Stand 09.11. 22:58");
  assert.equal(L.standText(null, "2026-11-10"), null, "ohne Update kein Stand (nie geraten)");
});

/* ---------------- last-2.0 (Rechnung in tools/last.py, hier Referenz und Vergleich für die Seite) ---------------- */
test("Trainingslast last-2.0: Referenz je Datum (letzter Test davor, vorher der erste, gekennzeichnet) und Vergleich je Woche und Sportart", () => {
  const cfg = { last_ref: { rad: [{ ab: "2026-12-05", lt2_w: 262 }, { ab: "2026-05-01", lt2_w: 250, status: "vorläufig" }] } };
  assert.equal(L.lastRef(cfg, "2026-11-08").r.lt2_w, 250);
  assert.equal(L.lastRef(cfg, "2026-11-08").vorErstem, false);
  assert.equal(L.lastRef(cfg, "2026-12-05").r.lt2_w, 262, "ab dem Testtag gilt der neue Test");
  assert.deepEqual(L.lastRef(cfg, "2025-01-01"), { r: { ab: "2026-05-01", lt2_w: 250, status: "vorläufig" }, vorErstem: true });
  assert.deepEqual(L.lastRef({}, "2026-11-08"), { r: null, vorErstem: false }, "ohne Referenz nichts geraten");
  const acts = [{ date: "2026-11-08", sport: "rad", tss: 176, tss0: 123, tl2: 176 }, { date: "2026-11-07", sport: "lauf", tss: 70, tss0: 70, tl2: 70 },
    { date: "2026-11-09", sport: "wandern", tss: 90 }, { date: "2026-10-01", sport: "rad", tss: 50 }, { date: "2026-11-10", sport: "rad", tss: null, tl2: null }];
  assert.deepEqual(L.lastVergleich(acts, ["2026-11-02", "2026-11-09"]), [{ rad: [123, 176], lauf: [70, 70] }, { wandern: [90, 90], rad: [0, 0] }],
    "bisher = tss wie geliefert (tss0), neu = tl2; nur Rad ändert; ausserhalb der Wochen nichts");
  assert.equal(L.montag("2026-11-15"), "2026-11-09"); assert.equal(L.montag("2026-11-16"), "2026-11-16");
});
