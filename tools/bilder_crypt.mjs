// V7.6.2 bilder-1.0: eigene Fotos für den Kopf der Einheit-Seite («Trainingsbriefing»), verschlüsselt wie die Sekundenreihen.
//
// Format: SPS2 wie tools/serienlib.mjs, aber ohne gzip (JPEG ist schon gepackt):
//   "SPS2" | IV (12 Byte) | AES-256-GCM( Länge (4 Byte) | JPEG | Nullen ) | Tag (16 Byte), Datei auf ein Vielfaches von 64 KiB aufgefüllt.
//   Schlüssel = Seitenschlüssel (wie data.enc.json); die Seite liest die Datei mit SPUREN_VAULT.openBin (js/v5-ui.js) wie eine Reihe.
// Name: erste 24 Hex-Zeichen von SHA-256("<serien_salz>:bild:<schlüssel>") → bilder/<name>.bin. Ohne das Salz (nur verschlüsselt in den Daten)
//   lässt sich kein Name berechnen; die Fotos sind öffentlich nur als verschlüsselte Dateien sichtbar (Personen, Startnummer, Orte bleiben privat).
// Welche Bilder es gibt und wo ihr Bildausschnitt liegt, steht nur in den Daten: config.bilder = { "<schlüssel>": { pos: "x% y%" } }.
//
// Aufruf (Passwort nur als Umgebungsvariable, nie im Repository):
//   SPUREN_PW=… node tools/bilder_crypt.mjs schreiben <schlüssel>=<datei.jpg> […]   → bilder/<name>.bin (EXIF vorher entfernen!)
//   SPUREN_PW=… node tools/bilder_crypt.mjs pruefen                               → jede Datei in bilder/ entschlüsselbar, JPEG ohne EXIF,
//                                                                                   Name passt zu einem Schlüssel in config.bilder; letzte Zeile «PRÜFUNG BILDER: …»
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { datenOeffnen, NAME_RE, serieName } from "./serienlib.mjs";

export const STUFE = 65536;
export const bildName = (salz, key) => serieName(salz, `bild:${key}`);
export const SCHLUESSEL_RE = /^[a-z][a-z0-9-]{1,23}$/;

/** JPEG-Bytes → SPS2-Datei (aufgefüllt auf ein Vielfaches von 64 KiB). */
export function bildSchliessen(key, jpg) {
  const roh = 4 + 12 + 4 + jpg.length + 16, total = Math.ceil(roh / STUFE) * STUFE;
  const body = Buffer.alloc(total - 4 - 12 - 16);
  body.writeUInt32BE(jpg.length, 0);
  jpg.copy(body, 4);
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(body), c.final()]);
  return Buffer.concat([Buffer.from("SPS2", "latin1"), iv, ct, c.getAuthTag()]);
}

/** SPS2-Datei → JPEG-Bytes. Wirft bei falschem Schlüssel, Manipulation oder Formatfehler. */
export function bildOeffnen(key, buf) {
  if (buf.length < 4 + 12 + 16 || buf.subarray(0, 4).toString("latin1") !== "SPS2") throw new Error("kein SPS2");
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(4, 16));
  d.setAuthTag(buf.subarray(buf.length - 16));
  const pt = Buffer.concat([d.update(buf.subarray(16, buf.length - 16)), d.final()]);
  const n = pt.readUInt32BE(0);
  if (n > pt.length - 4) throw new Error("Längenangabe ungültig");
  for (let i = 4 + n; i < pt.length; i++) if (pt[i] !== 0) throw new Error("Auffüllung ungültig");
  return pt.subarray(4, 4 + n);
}

/** Einfache JPEG-Prüfung: SOI-Marker und kein APP1-Block mit EXIF (Ortsangaben des Telefons). */
export function jpegOhneExif(jpg) {
  if (jpg.length < 4 || jpg[0] !== 0xff || jpg[1] !== 0xd8) return "kein JPEG";
  let i = 2;
  while (i + 4 <= jpg.length && jpg[i] === 0xff) {
    const m = jpg[i + 1];
    if (m === 0xda || m === 0xd9) break;                 // Bilddaten beginnen
    const len = jpg.readUInt16BE(i + 2);
    if (m === 0xe1 && jpg.subarray(i + 4, i + 8).toString("latin1") === "Exif") return "EXIF-Daten enthalten";
    i += 2 + len;
  }
  return null;
}

function main() {
  const [art, ...rest] = process.argv.slice(2);
  const pw = process.env.SPUREN_PW;
  if (!pw) { console.error("SPUREN_PW fehlt"); process.exit(2); }
  const { key, D } = datenOeffnen("data.enc.json", pw);
  const salz = D.serien_salz;
  if (!salz) { console.error("serien_salz fehlt in den Daten"); process.exit(2); }
  if (art === "schreiben") {
    if (!existsSync("bilder")) mkdirSync("bilder");
    for (const a of rest) {
      const [k, datei] = a.split("=");
      if (!SCHLUESSEL_RE.test(k || "") || !datei) { console.error(`ungültig: ${a} (Form schlüssel=datei.jpg)`); process.exit(2); }
      const jpg = readFileSync(datei), f = jpegOhneExif(jpg);
      if (f) { console.error(`${k}: ${f} – zuerst ohne Metadaten speichern`); process.exit(2); }
      const name = `${bildName(salz, k)}.bin`, ziel = join("bilder", name), tmp = `${ziel}.tmp`;
      writeFileSync(tmp, bildSchliessen(key, jpg)); renameSync(tmp, ziel);
      console.log(`${k} → bilder/${name}`);
    }
    return;
  }
  if (art === "pruefen") {
    const cfg = (D.config && D.config.bilder) || {}, fehler = [];
    const erwartet = new Map(Object.keys(cfg).map((k) => [`${bildName(salz, k)}.bin`, k]));
    const da = existsSync("bilder") ? readdirSync("bilder") : [];
    for (const f of da) {
      if (!NAME_RE.test(f)) { fehler.push(`${f}: Name nicht erlaubt`); continue; }
      if (!erwartet.has(f)) { fehler.push(`${f}: gehört zu keinem Bild in config.bilder`); continue; }
      try { const j = bildOeffnen(key, readFileSync(join("bilder", f))); const x = jpegOhneExif(j); if (x) fehler.push(`${erwartet.get(f)}: ${x}`); }
      catch (e) { fehler.push(`${erwartet.get(f)}: ${e.message}`); }
    }
    for (const [f, k] of erwartet) if (!da.includes(f)) fehler.push(`${k}: Datei fehlt`);
    for (const z of fehler) console.log(z);
    console.log(`${da.length} Datei(en), ${erwartet.size} Bild(er) in den Daten`);
    console.log(fehler.length ? "PRÜFUNG BILDER: FEHLER" : "PRÜFUNG BILDER: bestanden");
    process.exit(fehler.length ? 1 : 0);
  }
  console.error("Aufruf: node tools/bilder_crypt.mjs schreiben <schlüssel>=<datei.jpg> … | pruefen");
  process.exit(2);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
