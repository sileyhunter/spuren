// Sekundenreihen für den Aktivitäts-Explorer verschlüsseln (V5.6): work/serien/<id>.json → serien/<name>.bin
// Format: "SPS1" | IV (12 Byte) | AES-256-GCM(gzip(JSON)) | Tag (16 Byte). Schlüssel wie data.enc.json (gleiches Salz, PBKDF2-SHA256),
// damit die Seite mit dem beim Entsperren abgeleiteten Schlüssel öffnet.
// Dateiname: die ersten 24 Hex-Zeichen von SHA-256("<serien_salz>:<Aktivitäts-ID>"). serien_salz ist ein Zufallswert, der nur
// verschlüsselt in data.enc.json steht – so verraten die öffentlichen Dateinamen keine Garmin-/Zwift-IDs (die auf Aktivitätsseiten
// zeigen könnten) und keine Reihenfolge. Sichtbar bleiben nur Anzahl und Grösse der Dateien.
// Unveränderte Reihen werden nicht neu geschrieben (bestehende Datei wird entschlüsselt und verglichen), damit Git nur echte
// Änderungen sieht – auch in einem frischen Arbeitsordner ohne Zwischenstand.
// Aufruf: SPUREN_PW=... node tools/serien_crypt.mjs [data.enc.json] [work/serien] [serien] [--aufraeumen]
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

const [encPath = "data.enc.json", inDir = "work/serien", outDir = "serien"] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const pw = process.env.SPUREN_PW;
if (!pw) { console.error("SPUREN_PW fehlt"); process.exit(2); }
const p = JSON.parse(readFileSync(encPath, "utf8"));
const key = pbkdf2Sync(pw, Buffer.from(p.salt, "base64"), p.iter, 32, "sha256");
// serien_salz aus den verschlüsselten Daten (gleiches Format wie tools/crypt.mjs: iv + ct mit angehängtem Tag, base64)
const dIv = Buffer.from(p.iv, "base64"), dCt = Buffer.from(p.ct, "base64");
const dc = createDecipheriv("aes-256-gcm", key, dIv);
dc.setAuthTag(dCt.subarray(dCt.length - 16));
const D = JSON.parse(Buffer.concat([dc.update(dCt.subarray(0, dCt.length - 16)), dc.final()]).toString("utf8"));
const salz = D.serien_salz;
if (!salz) { console.error("serien_salz fehlt in den Daten – zuerst einmal setzen (siehe CLAUDE.md, V5.6)"); process.exit(2); }
const serieName = (s, id) => createHash("sha256").update(`${s}:${id}`).digest("hex").slice(0, 24);
const offen = (buf) => {   // bestehende Datei → Klartext (oder null, wenn unlesbar)
  try {
    if (buf.subarray(0, 4).toString() !== "SPS1") return null;
    const d = createDecipheriv("aes-256-gcm", key, buf.subarray(4, 16));
    d.setAuthTag(buf.subarray(buf.length - 16));
    return gunzipSync(Buffer.concat([d.update(buf.subarray(16, buf.length - 16)), d.final()]));
  } catch { return null; }
};
mkdirSync(outDir, { recursive: true });
let neu = 0, gleich = 0, bytes = 0;
for (const f of existsSync(inDir) ? readdirSync(inDir) : []) {
  if (!f.endsWith(".json") || f.startsWith(".")) continue;
  const id = f.slice(0, -5), plain = readFileSync(`${inDir}/${f}`), out = `${outDir}/${serieName(salz, id)}.bin`;
  if (existsSync(out)) { const alt = offen(readFileSync(out)); if (alt && alt.equals(plain)) { gleich++; continue; } }
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(gzipSync(plain, { level: 9 })), c.final(), c.getAuthTag()]);
  writeFileSync(out, Buffer.concat([Buffer.from("SPS1"), iv, ct]));
  neu++; bytes += ct.length + 16;
}
// Verwaiste Dateien (Aktivität nicht mehr in den Daten, z. B. Nacht-Aktivität g<ID> nach dem Monatsexport unter ihrer FIT-ID) entfernen
// Sicherung: mehr als 50 Dateien und mehr als 5 % auf einmal nur mit --aufraeumen (falsche Datendatei würde sonst vieles löschen)
const soll = new Set((D.activities || []).map((a) => `${serieName(salz, a.id)}.bin`));
const alle = readdirSync(outDir).filter((f) => f.endsWith(".bin")), verwaist = alle.filter((f) => !soll.has(f));
let weg = 0;
if (verwaist.length > 50 && verwaist.length > 0.05 * alle.length && !process.argv.includes("--aufraeumen")) {
  console.error(`${verwaist.length} von ${alle.length} Reihen gehören zu keiner Aktivität – nichts gelöscht. Datendatei prüfen; gewollt: --aufraeumen`);
} else for (const f of verwaist) { unlinkSync(`${outDir}/${f}`); weg++; }
console.log(`Reihen verschlüsselt: ${neu} neu/geändert (${(bytes / 1e6).toFixed(1)} MB), ${gleich} unverändert, ${weg} verwaist entfernt → ${outDir}/`);
