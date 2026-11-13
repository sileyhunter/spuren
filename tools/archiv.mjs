// Privates Archiv (V6.5, archiv-1.0): Rohdaten verschlüsselt im privaten Repository sileyhunter/spuren-archiv ablegen.
// Für Garmin-Exporte (ZIP), FIT-Dateien, Momentaufnahmen aus der Garmin-Verbindung (z. B. die Workout-Liste) und die Enduco-Bibliothek.
// Nichts davon kommt in das öffentliche Repository spuren. Die Seite liest das Archiv nie.
//
// Aufbau des Archivs
//   schluessel.json   { v, salt, iter } – Salz und Runden für PBKDF2-SHA256 (nicht geheim); Schlüssel aus dem Seitenpasswort
//   index.bin         ARC1( gzip(JSON) ): { v, dateien: [{ id, name, art, sha256, bytes, teile, gz, abgelegt, notiz }] }
//   daten/<id>-<n>.bin  ARC1 je Teil; id = 24 zufällige Hex-Zeichen (verrät nichts), Teile zu höchstens 40 MiB (GitHub: Datei < 100 MB)
// Format ARC1:  "ARC1" | IV (12 Byte) | AES-256-GCM( Inhalt ) | Tag (16 Byte); Inhalt = gzip(Teil), wenn das kleiner wird (gz = true)
//
// Aufrufe (Passwort nur als Umgebungsvariable, nie als Argument):
//   SPUREN_PW=… node tools/archiv.mjs einrichten <archiv> [--daten data.enc.json]   # Passwort gegen data.enc.json prüfen, Archiv anlegen
//   SPUREN_PW=… node tools/archiv.mjs ablegen <archiv> <datei> --art <art> [--name <name>] [--notiz <text>]
//   SPUREN_PW=… node tools/archiv.mjs liste <archiv>
//   SPUREN_PW=… node tools/archiv.mjs holen <archiv> <id> <ziel>
//   SPUREN_PW=… node tools/archiv.mjs pruefen <archiv> [--tief]        # letzte Zeile «PRÜFUNG ARCHIV: bestanden»
// Gleicher Inhalt (SHA-256) wird nie zweimal abgelegt. Abgelegtes wird nie geändert oder gelöscht.
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

export const V = "archiv-1.0";
export const ARTEN = ["garmin-export", "fit", "garmin-workouts", "enduco", "laktat", "anderes"];
export const TEIL = +(process.env.ARCHIV_TEIL || 40 * 1024 * 1024);        // nur Tests setzen ARCHIV_TEIL kleiner
const ITER = 250000;
const ERLAUBT = new Set(["README.md", ".gitattributes", "schluessel.json", "index.bin", "daten", ".git"]);
const ID_RE = /^[0-9a-f]{24}$/, TEIL_RE = /^([0-9a-f]{24})-(\d+)\.bin$/;

export function zu(key, plain, gz) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(gz ? gzipSync(plain, { level: 9 }) : plain), c.final()]);
  return Buffer.concat([Buffer.from("ARC1", "latin1"), iv, ct, c.getAuthTag()]);
}
export function auf(key, buf, gz) {
  if (buf.length < 32 || buf.subarray(0, 4).toString("latin1") !== "ARC1") throw new Error("kein ARC1");
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(4, 16));
  d.setAuthTag(buf.subarray(buf.length - 16));
  const pt = Buffer.concat([d.update(buf.subarray(16, buf.length - 16)), d.final()]);
  return gz ? gunzipSync(pt) : pt;
}
const sha = (b) => createHash("sha256").update(b).digest("hex");
function atomar(pfad, buf) { const t = pfad + ".tmp"; writeFileSync(t, buf); renameSync(t, pfad); }

export function schluessel(archiv, pw) {
  const s = JSON.parse(readFileSync(join(archiv, "schluessel.json"), "utf8"));
  if (s.v !== V) throw new Error("unbekannte Archiv-Version");
  return pbkdf2Sync(pw, Buffer.from(s.salt, "base64"), s.iter, 32, "sha256");
}
export function indexLesen(archiv, key) {
  const p = join(archiv, "index.bin");
  return JSON.parse(auf(key, readFileSync(p), true).toString("utf8"));
}
function indexSchreiben(archiv, key, I) { atomar(join(archiv, "index.bin"), zu(key, Buffer.from(JSON.stringify(I)), true)); }

/** Passwort gegen data.enc.json prüfen (sonst entstünde ein Archiv mit Tippfehler-Passwort), dann Archiv anlegen. */
export function einrichten(archiv, pw, datenPfad) {
  const p = JSON.parse(readFileSync(datenPfad, "utf8"));
  const k0 = pbkdf2Sync(pw, Buffer.from(p.salt, "base64"), p.iter, 32, "sha256"), ct = Buffer.from(p.ct, "base64");
  const d = createDecipheriv("aes-256-gcm", k0, Buffer.from(p.iv, "base64"));
  d.setAuthTag(ct.subarray(ct.length - 16));
  d.update(ct.subarray(0, ct.length - 16)); d.final();                      // wirft bei falschem Passwort
  if (existsSync(join(archiv, "schluessel.json"))) throw new Error("Archiv ist schon eingerichtet");
  writeFileSync(join(archiv, "schluessel.json"), JSON.stringify({ v: V, salt: randomBytes(16).toString("base64"), iter: ITER }) + "\n");
  mkdirSync(join(archiv, "daten"), { recursive: true });
  const key = schluessel(archiv, pw);
  indexSchreiben(archiv, key, { v: V, dateien: [] });
  return key;
}

/** Datei ablegen → { id, neu, teile, bytes }. Gleicher Inhalt: nichts Neues. */
export function ablegen(archiv, key, datei, art, opt) {
  opt = opt || {};
  if (!ARTEN.includes(art)) throw new Error(`Art muss eine von ${ARTEN.join(", ")} sein`);
  const buf = readFileSync(datei), h = sha(buf), I = indexLesen(archiv, key);
  const da = I.dateien.find((x) => x.sha256 === h);
  if (da) return { id: da.id, neu: false, teile: da.teile, bytes: da.bytes };
  let id; do { id = randomBytes(12).toString("hex"); } while (I.dateien.some((x) => x.id === id));
  const probe = buf.subarray(0, Math.min(buf.length, 1 << 20));
  const gz = probe.length > 0 && gzipSync(probe).length < probe.length * 0.9;   // ZIP und FIT bleiben, wie sie sind
  const teile = Math.max(1, Math.ceil(buf.length / TEIL));
  mkdirSync(join(archiv, "daten"), { recursive: true });
  for (let n = 1; n <= teile; n++) atomar(join(archiv, "daten", `${id}-${n}.bin`), zu(key, buf.subarray((n - 1) * TEIL, n * TEIL), gz));
  I.dateien.push({ id, name: opt.name || basename(datei), art, sha256: h, bytes: buf.length, teile, gz,
    abgelegt: new Date().toISOString().slice(0, 10), notiz: opt.notiz || null });
  indexSchreiben(archiv, key, I);
  return { id, neu: true, teile, bytes: buf.length };
}

export function holen(archiv, key, id) {
  const e = indexLesen(archiv, key).dateien.find((x) => x.id === id);
  if (!e) throw new Error("unbekannte ID");
  const teile = [];
  for (let n = 1; n <= e.teile; n++) teile.push(auf(key, readFileSync(join(archiv, "daten", `${id}-${n}.bin`)), e.gz));
  const buf = Buffer.concat(teile);
  if (sha(buf) !== e.sha256) throw new Error("Prüfsumme stimmt nicht");
  return { buf, eintrag: e };
}

/** Prüfen: jede Datei bekannt und entschlüsselbar, jeder Eintrag vollständig, kein Klartext, keine fremden Dateien. */
export function pruefen(archiv, key, tief) {
  const F = [];
  for (const n of readdirSync(archiv)) if (!ERLAUBT.has(n)) F.push(`unerwartete Datei im Archiv: ${n}`);
  let I;
  try { I = indexLesen(archiv, key); } catch (e) { return [`index.bin nicht lesbar (${e.message})`]; }
  const bekannt = new Map(I.dateien.map((e) => [e.id, e]));
  if (bekannt.size !== I.dateien.length) F.push("doppelte ID im Index");
  if (new Set(I.dateien.map((e) => e.sha256)).size !== I.dateien.length) F.push("gleicher Inhalt zweimal im Index");
  const da = new Set(existsSync(join(archiv, "daten")) ? readdirSync(join(archiv, "daten")) : []);
  for (const n of da) {
    const m = TEIL_RE.exec(n);
    if (!m) { F.push(`unerwartete Datei in daten/: ${n}`); continue; }
    const e = bekannt.get(m[1]);
    if (!e || +m[2] < 1 || +m[2] > e.teile) { F.push(`Datei ohne Eintrag: daten/${n}`); continue; }
    const b = readFileSync(join(archiv, "daten", n));
    if (b.subarray(0, 4).toString("latin1") !== "ARC1") { F.push(`nicht verschlüsselt: daten/${n}`); continue; }
    if (b.length > 95 * 1024 * 1024) F.push(`zu gross für GitHub: daten/${n}`);
    try { auf(key, b, e.gz); } catch (x) { F.push(`nicht entschlüsselbar: daten/${n}`); }
  }
  for (const e of I.dateien) {
    if (!ID_RE.test(e.id)) F.push(`ungültige ID im Index`);
    for (let n = 1; n <= e.teile; n++) if (!da.has(`${e.id}-${n}.bin`)) F.push(`Teil fehlt: ${e.id}-${n}`);
    if (tief) { try { holen(archiv, key, e.id); } catch (x) { F.push(`${e.id}: ${x.message}`); } }
  }
  return F;
}

/* ---------------- Befehlszeile ---------------- */
const istHaupt = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (istHaupt) {
  const [cmd, archiv, ...rest] = process.argv.slice(2);
  const pw = process.env.SPUREN_PW;
  const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  const raus = (t, c) => { console.error(t); process.exit(c); };
  if (!cmd || !archiv || !pw) raus("Aufruf: SPUREN_PW=… node tools/archiv.mjs einrichten|ablegen|liste|holen|pruefen <archiv> …", 2);
  try {
    if (cmd === "einrichten") { einrichten(archiv, pw, opt("--daten") || "data.enc.json"); console.log("Archiv eingerichtet (schluessel.json, index.bin, daten/)"); }
    else {
      const key = schluessel(archiv, pw);
      if (cmd === "ablegen") {
        const r = ablegen(archiv, key, rest[0], opt("--art"), { name: opt("--name"), notiz: opt("--notiz") });
        console.log(r.neu ? `abgelegt: ${r.id} (${r.teile} Teil${r.teile > 1 ? "e" : ""}, ${(r.bytes / 1e6).toFixed(2)} MB)` : `schon abgelegt: ${r.id}`);
      } else if (cmd === "liste") {
        for (const e of indexLesen(archiv, key).dateien) console.log(`${e.id}  ${e.abgelegt}  ${e.art.padEnd(15)} ${(e.bytes / 1e6).toFixed(2).padStart(9)} MB  ${e.teile} T.  ${e.name}${e.notiz ? "  – " + e.notiz : ""}`);
      } else if (cmd === "holen") {
        const { buf, eintrag } = holen(archiv, key, rest[0]);
        writeFileSync(rest[1], buf, { mode: 0o600 });
        console.log(`geholt: ${eintrag.name} → ${rest[1]} (${(buf.length / 1e6).toFixed(2)} MB, Prüfsumme ok)`);
      } else if (cmd === "pruefen") {
        const F = pruefen(archiv, key, rest.includes("--tief"));
        for (const f of F) console.log("FEHLER " + f);
        const I = indexLesen(archiv, key);
        console.log(`${I.dateien.length} Dateien, ${I.dateien.reduce((s, e) => s + e.teile, 0)} Teile, ${(I.dateien.reduce((s, e) => s + e.bytes, 0) / 1e6).toFixed(1)} MB`);
        console.log(F.length ? `PRÜFUNG ARCHIV: ${F.length} Fehler` : "PRÜFUNG ARCHIV: bestanden");
        if (F.length) process.exit(1);
      } else raus("unbekannter Befehl", 2);
    }
  } catch (e) { raus(`Fehler: ${e.message}`, 1); }
}
