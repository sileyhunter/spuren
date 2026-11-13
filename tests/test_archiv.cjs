// Abnahmetests V6.5 für das private Archiv (tools/archiv.mjs, archiv-1.0) – nur erfundene Inhalte und ein Test-Passwort.
//   node --test tests/test_archiv.cjs
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = path.dirname(__dirname);
const PW = "test-passwort-nur-fuer-tests";
function datenEnc(dir, pw) {                    // wie tools/crypt.mjs encrypt, mit erfundenem Inhalt
  const salt = crypto.randomBytes(16), iter = 1000, key = crypto.pbkdf2Sync(pw, salt, iter, 32, "sha256"), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify({ beispiel: true }))), c.final(), c.getAuthTag()]);
  const p = path.join(dir, "data.enc.json");
  fs.writeFileSync(p, JSON.stringify({ v: 1, salt: salt.toString("base64"), iter, iv: iv.toString("base64"), ct: ct.toString("base64") }));
  return p;
}
const neu = () => fs.mkdtempSync(path.join(os.tmpdir(), "archiv-"));

test("Archiv: einrichten nur mit dem richtigen Passwort, ablegen, gleicher Inhalt nur einmal, holen mit Prüfsumme", async () => {
  const A = await import(path.join(ROOT, "tools", "archiv.mjs"));
  const d = neu(), ar = path.join(d, "archiv"); fs.mkdirSync(ar);
  const enc = datenEnc(d, PW);
  assert.throws(() => A.einrichten(ar, "falsch", enc), "Tippfehler im Passwort: kein Archiv");
  assert.equal(fs.existsSync(path.join(ar, "schluessel.json")), false);
  const key = A.einrichten(ar, PW, enc);
  assert.throws(() => A.einrichten(ar, PW, enc), /schon eingerichtet/);
  const f = path.join(d, "liste.json");
  fs.writeFileSync(f, JSON.stringify({ count: 2, workouts: [{ id: 1, name: "Beispiel" }, { id: 2, name: "Beispiel 2" }] }).repeat(50));
  const r = A.ablegen(ar, key, f, "garmin-workouts", { notiz: "Test" });
  assert.equal(r.neu, true); assert.equal(r.teile, 1); assert.match(r.id, /^[0-9a-f]{24}$/);
  assert.equal(A.ablegen(ar, key, f, "garmin-workouts").neu, false, "gleicher Inhalt nie zweimal");
  const I = A.indexLesen(ar, key);
  assert.equal(I.dateien.length, 1); assert.equal(I.dateien[0].gz, true, "Text wird komprimiert"); assert.equal(I.dateien[0].name, "liste.json");
  assert.deepEqual(A.holen(ar, key, r.id).buf, fs.readFileSync(f));
  assert.throws(() => A.ablegen(ar, key, f, "unbekannt"), /Art muss/);
  // falsches Passwort öffnet nichts
  const k2 = crypto.pbkdf2Sync("falsch", Buffer.from(JSON.parse(fs.readFileSync(path.join(ar, "schluessel.json"))).salt, "base64"), 250000, 32, "sha256");
  assert.throws(() => A.indexLesen(ar, k2));
  // nichts im Klartext: weder der Inhalt noch der Dateiname stehen in einer Archivdatei
  for (const n of [...fs.readdirSync(path.join(ar, "daten")).map((x) => path.join("daten", x)), "index.bin"]) {
    const b = fs.readFileSync(path.join(ar, n)).toString("latin1");
    assert.ok(!b.includes("Beispiel") && !b.includes("liste.json"), n);
  }
  assert.deepEqual(A.pruefen(ar, key, true), []);
});

test("Archiv: grosse Dateien in Teilen (GitHub < 100 MB), ZIP bleibt unkomprimiert, Prüfung findet Fehler", () => {
  const d = neu(), ar = path.join(d, "archiv"); fs.mkdirSync(ar);
  const enc = datenEnc(d, PW);
  const env = { ...process.env, SPUREN_PW: PW, ARCHIV_TEIL: "100000" };   // Teile zu 100 kB statt 40 MiB, nur im Test
  const run = (...a) => execFileSync(process.execPath, [path.join(ROOT, "tools", "archiv.mjs"), ...a], { env, encoding: "utf8" });
  run("einrichten", ar, "--daten", enc);
  const f = path.join(d, "export.zip");
  fs.writeFileSync(f, crypto.randomBytes(250000));                       // wie ein ZIP: nicht komprimierbar
  const out = run("ablegen", ar, f, "--art", "garmin-export");
  assert.match(out, /abgelegt: [0-9a-f]{24} \(3 Teile/);
  const id = /abgelegt: ([0-9a-f]{24})/.exec(out)[1];
  assert.match(run("liste", ar), /garmin-export/);
  assert.match(run("pruefen", ar, "--tief"), /PRÜFUNG ARCHIV: bestanden/);
  run("holen", ar, id, path.join(d, "zurueck.zip"));
  assert.deepEqual(fs.readFileSync(path.join(d, "zurueck.zip")), fs.readFileSync(f));
  assert.equal((fs.statSync(path.join(d, "zurueck.zip")).mode & 0o777), 0o600, "Klartext nur für den eigenen Benutzer");
  // Fehler: Klartext-Datei, fehlender Teil, manipulierter Teil
  fs.writeFileSync(path.join(ar, "notiz.txt"), "Klartext");
  fs.renameSync(path.join(ar, "daten", `${id}-3.bin`), path.join(d, "weg.bin"));
  const t2 = path.join(ar, "daten", `${id}-2.bin`), b = fs.readFileSync(t2); b[40] ^= 1; fs.writeFileSync(t2, b);
  let txt = "";
  try { run("pruefen", ar); } catch (e) { txt = e.stdout; }
  assert.match(txt, /unerwartete Datei im Archiv: notiz\.txt/);
  assert.match(txt, /Teil fehlt/);
  assert.match(txt, /nicht entschlüsselbar/);
  assert.match(txt, /PRÜFUNG ARCHIV: \d+ Fehler/);
});
