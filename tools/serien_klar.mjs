// V7.1 (zeit-1.1): Sekundenreihen ausgewählter Aktivitäten entschlüsseln, nur nach work/ (nie committen).
// Aufruf: SPUREN_PW=… node tools/serien_klar.mjs <data.enc.json> <ausgabeordner unter work/> <id> [<id> …]
// Schreibt <ausgabeordner>/<id>.json (Reihe im Format serie-1.0); fehlende Dateien werden gemeldet, nichts wird geändert.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { datenOeffnen, oeffnen, serieKey, serieName } from "./serienlib.mjs";

const [, , enc, out, ...ids] = process.argv;
if (!enc || !out || !ids.length) { console.error("Aufruf: node tools/serien_klar.mjs <data.enc.json> <work/ordner> <id> …"); process.exit(2); }
if (!out.startsWith("work/")) { console.error("Ausgabe nur unter work/ (Klartext, nie im Repository)"); process.exit(2); }
const pw = process.env.SPUREN_PW; if (!pw) { console.error("SPUREN_PW fehlt"); process.exit(2); }
const { key, D } = datenOeffnen(enc, pw);
const salz = D.serien_salz; if (!salz) { console.error("serien_salz fehlt in den Daten"); process.exit(1); }
const nachId = new Map((D.activities || []).map((a) => [a.id, a]));
mkdirSync(out, { recursive: true });
let ok = 0, fehlt = 0;
for (const id of ids) {
  const a = nachId.get(id); if (!a) { console.log(`${id}: nicht in den Daten`); fehlt++; continue; }
  const f = join("serien", serieName(salz, serieKey(a)) + ".bin");
  if (!existsSync(f)) { console.log(`${id}: keine Reihe`); fehlt++; continue; }
  const { plain } = oeffnen(key, readFileSync(f));
  writeFileSync(join(out, id + ".json"), plain);
  ok++;
}
console.log(`Reihen entschlüsselt: ${ok}, ohne Reihe: ${fehlt}`);
