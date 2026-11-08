// Sekundenreihen für den Aktivitäts-Explorer verschlüsseln: work/serien/<id>.json → serien/<name>.bin
// (V5.6; V5.7.1: Nacht-Update, Format SPS2 mit Auffüllen, Name aus der Garmin-ID, atomares Schreiben). Formate: tools/serienlib.mjs.
//
// Grundsätze
//   - Nur neue oder tatsächlich geänderte Reihen werden geschrieben: Die bestehende Datei wird entschlüsselt und mit dem neuen
//     Klartext verglichen (auch in einem frischen Arbeitsordner ohne Zwischenstand). Unverändert → Datei bleibt Byte für Byte gleich.
//   - Eine Reihe gehört zu genau einer Aktivität in den Daten (über id oder gid); unbekannte Eingaben werden nicht geschrieben.
//   - Schreiben atomar (temporäre Datei, dann umbenennen): Eine bestehende Datei ist immer vollständig alt oder vollständig neu.
//   - Name aus der gid: Der Monatsexport ersetzt die Nacht-ID «g…» durch die FIT-ID, übernimmt aber die gid → gleicher Name.
// Modi
//   --nacht   Nacht-Update: nichts löschen, nichts umbenennen; Bericht für tools/serien_pruefen.mjs.
//   (ohne)    Monatsexport: Reihen unter altem Namen (id statt gid) umbenennen, verwaiste entfernen. Sicherung: mehr als 50
//             Dateien und mehr als 5 % auf einmal nur mit --aufraeumen.
// Aufruf: SPUREN_PW=... node tools/serien_crypt.mjs [data.enc.json] [work/serien] [serien] [--nacht] [--aufraeumen] [--bericht <datei>]
// Exit: 0 ok · 1 Eingabe unlesbar oder Schreibfehler (bisherige Dateien bleiben) · 2 Passwort/Salz fehlt
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { NAME_RE, datenOeffnen, oeffnen, schliessen, serieKey, serieName } from "./serienlib.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const pos = args.filter((x, i) => !x.startsWith("--") && args[i - 1] !== "--bericht");
const [encPath = "data.enc.json", inDir = "work/serien", outDir = "serien"] = pos;
const nacht = flag("--nacht"), berichtPfad = opt("--bericht", "work/serien_lauf.json");
try { rmSync(berichtPfad, { force: true }); } catch {}   // nie einen Bericht eines früheren Laufs prüfen
const pw = process.env.SPUREN_PW;
if (!pw) { console.error("SPUREN_PW fehlt"); process.exit(2); }
let key, D;
try { ({ key, D } = datenOeffnen(encPath, pw)); } catch (e) { console.error("Daten nicht lesbar (Passwort?): " + e.message); process.exit(2); }
const salz = D.serien_salz;
if (!salz || !/^[0-9a-f]{32,}$/.test(salz)) { console.error("serien_salz fehlt oder ist zu kurz (mindestens 128 Bit) – siehe CLAUDE.md"); process.exit(2); }

const A = D.activities || [];
const byId = new Map(A.map((a) => [String(a.id), a])), byGid = new Map(A.filter((a) => a.gid).map((a) => [String(a.gid), a]));
const lauf = { modus: nacht ? "nacht" : "export", erstellt: new Date().toISOString(), neu: [], geaendert: [], gleich: 0, unbekannt: [],
  umbenannt: [], verwaist: [], entfernt: [], fehler: [], zuordnung: {} };
mkdirSync(outDir, { recursive: true });
// Reste eines abgebrochenen Laufs (nur temporäre Dateien dieses Werkzeugs; bestehende Reihen bleiben)
for (const f of readdirSync(outDir)) if (/\.bin\.tmp-\d+$/.test(f)) unlinkSync(`${outDir}/${f}`);
const schreib = (out, buf) => { const tmp = `${out}.tmp-${process.pid}`; writeFileSync(tmp, buf); renameSync(tmp, out); };

// 1) Monatsexport: Reihe unter altem Namen (Aktivitäts-ID) auf den Namen aus der gid umbenennen – Inhalt unverändert
if (!nacht) for (const a of A) {
  const k = serieKey(a); if (k === String(a.id)) continue;
  const alt = `${outDir}/${serieName(salz, a.id)}.bin`, neu = `${outDir}/${serieName(salz, k)}.bin`;
  if (existsSync(alt) && !existsSync(neu)) { renameSync(alt, neu); lauf.umbenannt.push(serieName(salz, k)); }
}

// 2) Eingaben verschlüsseln (nur neue oder geänderte)
let bytes = 0;
const eingaben = existsSync(inDir) ? readdirSync(inDir).filter((f) => f.endsWith(".json") && !f.startsWith(".")).sort() : [];
for (const f of eingaben) {
  const stem = f.slice(0, -5), a = byId.get(stem) || byGid.get(stem);
  if (!a) { lauf.unbekannt.push(stem); continue; }
  const name = serieName(salz, serieKey(a)), out = `${outDir}/${name}.bin`;
  let plain;
  try { plain = readFileSync(`${inDir}/${f}`); const j = JSON.parse(plain); if (!Array.isArray(j.seg)) throw new Error("ohne seg"); }
  catch (e) { lauf.fehler.push({ id: stem, grund: "Eingabe unlesbar: " + e.message }); continue; }
  const vorhanden = existsSync(out);
  let alt = null;
  if (vorhanden) { try { alt = oeffnen(key, readFileSync(out)).plain; } catch { alt = null; } }
  if (alt && alt.equals(plain)) { lauf.gleich++; lauf.zuordnung[name] = String(a.id); continue; }
  try {
    const buf = schliessen(key, plain);
    schreib(out, buf);
    bytes += buf.length;
    (vorhanden ? lauf.geaendert : lauf.neu).push(name);
    lauf.zuordnung[name] = String(a.id);
  } catch (e) { lauf.fehler.push({ id: stem, grund: "Schreibfehler: " + e.message }); }
}

// 3) Verwaiste Reihen (Aktivität nicht mehr in den Daten)
const soll = new Set(A.map((a) => `${serieName(salz, serieKey(a))}.bin`));
const altnamen = new Set(A.filter((a) => serieKey(a) !== String(a.id)).map((a) => `${serieName(salz, a.id)}.bin`));
const alle = readdirSync(outDir).filter((f) => NAME_RE.test(f));
lauf.verwaist = alle.filter((f) => !soll.has(f) && !altnamen.has(f)).map((f) => f.slice(0, -4));
if (!nacht && lauf.verwaist.length) {
  if (lauf.verwaist.length > 50 && lauf.verwaist.length > 0.05 * alle.length && !flag("--aufraeumen"))
    console.error(`${lauf.verwaist.length} von ${alle.length} Reihen gehören zu keiner Aktivität – nichts gelöscht. Datendatei prüfen; gewollt: --aufraeumen`);
  else for (const n of lauf.verwaist) { unlinkSync(`${outDir}/${n}.bin`); lauf.entfernt.push(n); }
}

try { mkdirSync(dirname(berichtPfad), { recursive: true }); writeFileSync(berichtPfad, JSON.stringify(lauf, null, 1)); } catch (e) { console.error("Bericht nicht geschrieben: " + e.message); }
console.log(`Reihen (${lauf.modus}): ${lauf.neu.length} neu, ${lauf.geaendert.length} geändert (${(bytes / 1e6).toFixed(2)} MB), ${lauf.gleich} unverändert, ` +
  `${lauf.umbenannt.length} umbenannt, ${lauf.entfernt.length} verwaist entfernt${nacht && lauf.verwaist.length ? `, ${lauf.verwaist.length} verwaist (nicht gelöscht)` : ""}` +
  `${lauf.unbekannt.length ? `, ${lauf.unbekannt.length} ohne Aktivität übersprungen` : ""}${lauf.fehler.length ? `, ${lauf.fehler.length} FEHLER` : ""} → ${outDir}/`);
for (const f of lauf.fehler) console.error(`  Fehler ${f.id}: ${f.grund}`);
process.exit(lauf.fehler.length ? 1 : 0);
