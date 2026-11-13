// Ver- und Entschlüsseln der Trainingsdaten (AES-256-GCM, Schlüssel per PBKDF2-SHA256 aus dem Passwort).
// Kompatibel mit der Entschlüsselung im Browser (WebCrypto).
// Aufruf:  SPUREN_PW=... node tools/crypt.mjs encrypt data.json data.enc.json
//          SPUREN_PW=... node tools/crypt.mjs decrypt data.enc.json data.json
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [mode, inp, out] = process.argv.slice(2);
const pw = process.env.SPUREN_PW;
if (!pw || !mode || !inp || !out) {
  console.error("Aufruf: SPUREN_PW=... node tools/crypt.mjs encrypt|decrypt <ein> <aus>");
  process.exit(2);
}
const ITER = 250000;
const b64 = (b) => Buffer.from(b).toString("base64");
const ub64 = (s) => Buffer.from(s, "base64");

if (mode === "encrypt") {
  // Salz bleibt gleich, damit im Browser gespeicherte Schlüssel gültig bleiben
  let salt = randomBytes(16), iter = ITER;
  if (existsSync(out)) {
    try { const old = JSON.parse(readFileSync(out, "utf8")); salt = ub64(old.salt); iter = old.iter; } catch {}
  }
  const key = pbkdf2Sync(pw, salt, iter, 32, "sha256");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(readFileSync(inp)), c.final(), c.getAuthTag()]);
  writeFileSync(out, JSON.stringify({ v: 1, salt: b64(salt), iter, iv: b64(iv), ct: b64(ct) }));
  console.log(`verschlüsselt: ${out} (${(ct.length / 1e6).toFixed(2)} MB)`);
} else if (mode === "decrypt") {
  const p = JSON.parse(readFileSync(inp, "utf8"));
  const key = pbkdf2Sync(pw, ub64(p.salt), p.iter, 32, "sha256");
  const raw = ub64(p.ct);
  const d = createDecipheriv("aes-256-gcm", key, ub64(p.iv));
  d.setAuthTag(raw.subarray(raw.length - 16));
  const pt = Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]);
  writeFileSync(out, pt, { mode: 0o600 });             // Klartext nur für den eigenen Benutzer lesbar (Audit V6.4 C, N4)
  console.log(`entschlüsselt: ${out}`);
} else {
  console.error("Modus muss encrypt oder decrypt sein");
  process.exit(2);
}
