// Gemeinsame Funktionen für die verschlüsselten Sekundenreihen (serien/), V5.6 / V5.7.1.
// Benutzt von tools/serien_crypt.mjs (schreiben) und tools/serien_pruefen.mjs (prüfen); die Seite liest dieselben Formate
// (js/v5-ui.js openBin, js/analyse.js serieName/serieKey).
//
// Formate
//   SPS1 (V5.6):   "SPS1" | IV (12 Byte) | AES-256-GCM( gzip(JSON) ) | Tag (16 Byte)
//   SPS2 (V5.7.1): "SPS2" | IV (12 Byte) | AES-256-GCM( Länge (4 Byte, big-endian) | gzip(JSON) | Nullen ) | Tag (16 Byte)
//                  Die ganze Datei ist auf eine Zweierpotenz ≥ 16 KiB aufgefüllt: Die Grösse verrät die Dauer nur grob.
//   Schlüssel: derselbe wie für data.enc.json (PBKDF2-SHA256 aus dem Seitenpasswort und dem festen Salz).
// Dateiname
//   erste 24 Hex-Zeichen von SHA-256("<serien_salz>:<Schlüssel>"); Schlüssel = gid (Garmin-Aktivität «g…»), sonst id.
//   serien_salz ist ein 128-Bit-Zufallswert, der nur verschlüsselt in data.enc.json steht: Ohne ihn lässt sich zu einer
//   bekannten Garmin-ID kein Dateiname berechnen. Die gid bleibt beim Monatsexport erhalten → gleicher Name, kein Neuimport.
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

export const STUFE_MIN = 16384;
export const NAME_RE = /^[0-9a-f]{24}\.bin$/;

/** Schlüssel einer Aktivität für den Dateinamen: Garmin-ID (gid, «g…»), sonst die ID in den Daten. */
export const serieKey = (a) => String((a && a.gid) || (a && a.id));
export const serieName = (salz, key) => createHash("sha256").update(`${salz}:${key}`).digest("hex").slice(0, 24);
/** Dateigrösse nach dem Auffüllen: kleinste Zweierpotenz ≥ n, mindestens 16 KiB. */
export function stufe(n) { let t = STUFE_MIN; while (t < n) t *= 2; return t; }

/** data.enc.json öffnen → { key (Buffer, 32 Byte), D (Daten) }. Wirft bei falschem Passwort. */
export function datenOeffnen(encPath, pw) {
  const p = JSON.parse(readFileSync(encPath, "utf8"));
  const key = pbkdf2Sync(pw, Buffer.from(p.salt, "base64"), p.iter, 32, "sha256");
  const iv = Buffer.from(p.iv, "base64"), ct = Buffer.from(p.ct, "base64");
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const D = JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString("utf8"));
  return { key, D };
}

/** Klartext (JSON-Bytes) → SPS2-Datei (aufgefüllt). */
export function schliessen(key, plain) {
  const gz = gzipSync(plain, { level: 9 });
  const total = stufe(4 + 12 + 4 + gz.length + 16);
  const body = Buffer.alloc(total - 4 - 12 - 16);          // Nullen
  body.writeUInt32BE(gz.length, 0);
  gz.copy(body, 4);
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(body), c.final()]);
  return Buffer.concat([Buffer.from("SPS2", "latin1"), iv, ct, c.getAuthTag()]);
}

/** SPS1- oder SPS2-Datei → { plain (JSON-Bytes), format }. Wirft bei falschem Schlüssel, Manipulation oder Formatfehler. */
export function oeffnen(key, buf) {
  if (buf.length < 4 + 12 + 16) throw new Error("Datei zu kurz");
  const format = buf.subarray(0, 4).toString("latin1");
  if (format !== "SPS1" && format !== "SPS2") throw new Error("unbekanntes Format");
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(4, 16));
  d.setAuthTag(buf.subarray(buf.length - 16));
  const pt = Buffer.concat([d.update(buf.subarray(16, buf.length - 16)), d.final()]);
  if (format === "SPS1") return { plain: gunzipSync(pt), format };
  const n = pt.readUInt32BE(0);
  if (n > pt.length - 4) throw new Error("Längenangabe ungültig");
  for (let i = 4 + n; i < pt.length; i++) if (pt[i] !== 0) throw new Error("Auffüllung ungültig");
  return { plain: gunzipSync(pt.subarray(4, 4 + n)), format };
}
