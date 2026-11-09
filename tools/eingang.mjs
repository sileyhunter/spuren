// V5.9.3 Eingaben direkt gespeichert (eingang-1.0): Dateien in eingang/ einlesen, nach dem Einspielen entfernen, prüfen.
//
//   SPUREN_PW=… node tools/eingang.mjs einlesen                 → work/eingang_a.json (Eingaben), work/eingang_b.json (Bestätigungen),
//                                                                  work/eingang_dateien.json (welche Dateien wofür)
//   python3 -I tools/merge_daily.py data.json work/eingang_a.json   (B nur nach bestandener Prüfung, siehe CLAUDE.md)
//   node tools/eingang.mjs aufraeumen work/eingang_dateien.json [--mit-b]   → git rm der eingespielten Dateien (nur dieser)
//   SPUREN_PW=… node tools/eingang.mjs pruefen [--git]          → «PRÜFUNG EINGANG: bestanden»
//
// Format EGS1 (js/eingang.js): "EGS1" | IV (12) | AES-256-GCM( Länge (4, big-endian) | gzip(JSON) oder JSON | Nullen ) | Tag (16),
// Datei auf eine Zweierpotenz ≥ 16 KiB aufgefüllt; Schlüssel wie data.enc.json (PBKDF2-SHA256 aus dem Seitenpasswort, gleiches Salz).
// Ungültige oder Demo-Dateien werden nie eingespielt und nie gelöscht, nur gemeldet.
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { fuerMerge, zusammen } from "./eingaben_lib.mjs";

const ORDNER = "eingang", NAME_RE = /^\d{8}T\d{6}Z-[0-9a-f]{8}\.bin$/, STUFE_MIN = 16384, FORMAT = "spuren-eingang-1";
const args = process.argv.slice(2), cmd = args[0];
const flag = (f) => args.includes(f);
const pw = process.env.SPUREN_PW;

function schluessel() {
  if (!pw) { console.error("SPUREN_PW fehlt"); process.exit(2); }
  const p = JSON.parse(readFileSync("data.enc.json", "utf8"));
  return pbkdf2Sync(pw, Buffer.from(p.salt, "base64"), p.iter, 32, "sha256");
}
const istStufe = (n) => n >= STUFE_MIN && (n & (n - 1)) === 0;
/** Eine EGS1-Datei öffnen → Objekt; wirft mit verständlichem Grund. */
export function oeffnen(key, buf) {
  if (buf.length < 32 || buf.subarray(0, 4).toString("latin1") !== "EGS1") throw new Error("kein EGS1 (unverschlüsselt oder fremd)");
  if (!istStufe(buf.length)) throw new Error(`Grösse ${buf.length} Byte ist keine Stufe (Zweierpotenz ≥ 16 KiB)`);
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(4, 16));
  d.setAuthTag(buf.subarray(buf.length - 16));
  let pt;
  try { pt = Buffer.concat([d.update(buf.subarray(16, buf.length - 16)), d.final()]); } catch (e) { throw new Error("nicht entschlüsselbar (anderes Passwort oder verändert)"); }
  const n = pt.readUInt32BE(0);
  if (n > pt.length - 4) throw new Error("Längenangabe ungültig");
  for (let i = 4 + n; i < pt.length; i++) if (pt[i] !== 0) throw new Error("Auffüllung ungültig");
  let inh = pt.subarray(4, 4 + n);
  if (inh[0] === 0x1f && inh[1] === 0x8b) inh = gunzipSync(inh);
  const j = JSON.parse(inh.toString("utf8"));
  if (j.format !== FORMAT) throw new Error("falsches Format");
  return j;
}
const dateien = () => (existsSync(ORDNER) ? readdirSync(ORDNER).sort() : []);

if (cmd === "einlesen") {
  const key = schluessel();
  const liste = { a: [], b: [], probe: [], abgelehnt: [] }, A = [], B = [];
  let erst = null, letzt = null;
  for (const f of dateien()) {
    const p = `${ORDNER}/${f}`;
    if (!NAME_RE.test(f) || !statSync(p).isFile()) { liste.abgelehnt.push({ name: f, grund: "kein Eingangs-Dateiname" }); continue; }
    let j;
    try { j = oeffnen(key, readFileSync(p)); } catch (e) { liste.abgelehnt.push({ name: f, grund: e.message }); continue; }
    if (j.demo) { liste.abgelehnt.push({ name: f, grund: "aus der Demo (Beispieldaten)" }); continue; }
    erst = erst || j.erstellt; letzt = j.erstellt;
    if (j.art === "probe" || (j.daten && j.daten.probe)) { liste.probe.push(f); continue; }
    if (j.art === "bestaetigung") { liste.b.push(f); B.push(j.daten || {}); } else { liste.a.push(f); A.push(j.daten || {}); }
  }
  mkdirSync("work", { recursive: true });
  const q = (n) => ({ datei: `eingang/ (${n} Datei${n === 1 ? "" : "en"})`, erstellt: erst, bis: letzt });
  if (A.length) writeFileSync("work/eingang_a.json", JSON.stringify(fuerMerge(zusammen(A), q(A.length)), null, 1));
  if (B.length) writeFileSync("work/eingang_b.json", JSON.stringify(fuerMerge(zusammen(B), q(B.length)), null, 1));
  writeFileSync("work/eingang_dateien.json", JSON.stringify(liste, null, 1));
  const zaehl = (o) => Object.entries(o).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => `${k} ${v.length}`).join(", ");
  console.log(`Eingang: ${liste.a.length} Eingaben, ${liste.b.length} Bestätigungen, ${liste.probe.length} Test, ${liste.abgelehnt.length} abgelehnt`
    + (A.length ? ` · A: ${zaehl(fuerMerge(zusammen(A), {}))}` : "") + (B.length ? ` · B: ${zaehl(fuerMerge(zusammen(B), {}))}` : ""));
  for (const x of liste.abgelehnt) console.log(`  abgelehnt ${x.name}: ${x.grund}`);
} else if (cmd === "aufraeumen") {
  const liste = JSON.parse(readFileSync(args[1] || "work/eingang_dateien.json", "utf8"));
  const weg = liste.a.concat(liste.probe, flag("--mit-b") ? liste.b : []);
  for (const f of weg) if (NAME_RE.test(f) && existsSync(`${ORDNER}/${f}`)) execFileSync("git", ["rm", "-q", "--", `${ORDNER}/${f}`]);
  console.log(`Eingang aufgeräumt: ${weg.length} Datei${weg.length === 1 ? "" : "en"} entfernt${!flag("--mit-b") && liste.b.length ? `, ${liste.b.length} Bestätigung(en) bleiben liegen` : ""}`);
} else if (cmd === "pruefen") {
  const key = schluessel(), fehler = [];
  let n = 0;
  for (const f of dateien()) {
    const p = `${ORDNER}/${f}`;
    if (!statSync(p).isFile()) { fehler.push(`${p}: Ordner in eingang/`); continue; }
    if (!NAME_RE.test(f)) { fehler.push(`${p}: fremde Datei`); continue; }
    try { const j = oeffnen(key, readFileSync(p)); if (j.demo) fehler.push(`${p}: Demo-Eingabe`); else n++; } catch (e) { fehler.push(`${p}: ${e.message}`); }
  }
  if (flag("--git")) {
    try {
      const tracked = execFileSync("git", ["ls-files", "--", ORDNER], { encoding: "utf8" }).split("\n").filter(Boolean);
      for (const t of tracked) if (!NAME_RE.test(t.slice(ORDNER.length + 1))) fehler.push(`im Repository: ${t}`);
    } catch (e) { fehler.push("Git nicht lesbar: " + e.message); }
  }
  console.log(`Eingang: ${n} gültige Datei${n === 1 ? "" : "en"} in ${ORDNER}/`);
  for (const f of fehler) console.log("  FEHLER " + f);
  console.log("PRÜFUNG EINGANG:", fehler.length ? "NICHT bestanden" : "bestanden");
  process.exit(fehler.length ? 1 : 0);
} else {
  console.error("Aufruf: node tools/eingang.mjs einlesen | aufraeumen <liste> [--mit-b] | pruefen [--git]");
  process.exit(2);
}
