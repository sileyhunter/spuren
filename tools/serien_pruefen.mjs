// Prüfung der verschlüsselten Sekundenreihen (V5.7.1): Konsistenz von Aktivitäten, Reihen und Zuordnung sowie Datenschutz.
// Läuft nach jedem Import (Nacht-Update und Monatsexport). Letzte Zeile «PRÜFUNG REIHEN: bestanden» oder «… NICHT bestanden».
// Fehler (blockierend) – Warnungen werden nur gemeldet.
//   Daten       serien_salz fehlt/zu kurz · doppelte Aktivitäts-ID · doppelte gid
//   Dateien     fremde Dateien in serien/ (Klartext, temporär) · nicht entschlüsselbar · Format/Auffüllung falsch · Inhalt ohne Reihe
//   Zuordnung   Datei ohne Aktivität (nur für Dateien dieses Laufs blockierend) · zwei Dateien für dieselbe Aktivität ·
//               Inhalt gehört zu einer anderen Aktivität · Anzahl Werte ≠ Angabe in den Daten (ser.n) · Lauf meldet Datei, die fehlt
//   Datenschutz Dateiname = SHA-256 einer ID ohne Salz · Klartext/gzip ohne Verschlüsselung · data.json, work/, FIT-Dateien im Repository
//   Nacht (--nacht --git): keine gelöschten oder umbenannten Reihen; geänderte Dateien nur laut Lauf-Bericht
// Aufruf: SPUREN_PW=... node tools/serien_pruefen.mjs [data.enc.json] [serien] [--nacht] [--git] [--bericht work/serien_lauf.json]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { NAME_RE, STUFE_MIN, datenOeffnen, oeffnen, serieKey, serieName } from "./serienlib.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const pos = args.filter((x, i) => !x.startsWith("--") && args[i - 1] !== "--bericht");
const [encPath = "data.enc.json", dir = "serien"] = pos;
const nacht = flag("--nacht"), mitGit = flag("--git"), berichtPfad = opt("--bericht", "work/serien_lauf.json");
const F = [], W = [];
const fehler = (t) => F.push(t), warn = (t) => W.push(t);
const ende = () => {
  for (const w of W.slice(0, 20)) console.log("  Warnung: " + w);
  if (W.length > 20) console.log(`  … ${W.length - 20} weitere Warnungen`);
  for (const f of F.slice(0, 40)) console.log("  FEHLER: " + f);
  if (F.length > 40) console.log(`  … ${F.length - 40} weitere Fehler`);
  console.log(F.length ? `PRÜFUNG REIHEN: NICHT bestanden (${F.length} Fehler, ${W.length} Warnungen)` : `PRÜFUNG REIHEN: bestanden (${W.length} Warnungen)`);
  process.exit(F.length ? 1 : 0);
};
const pw = process.env.SPUREN_PW;
if (!pw) { fehler("SPUREN_PW fehlt"); ende(); }
let key, D;
try { ({ key, D } = datenOeffnen(encPath, pw)); } catch (e) { fehler("Daten nicht lesbar: " + e.message); ende(); }

/* ---- Daten ---- */
const salz = D.serien_salz;
if (!salz || !/^[0-9a-f]{32,}$/.test(salz)) { fehler("serien_salz fehlt oder kürzer als 128 Bit"); ende(); }
const A = D.activities || [];
const zaehl = (xs) => { const m = new Map(); for (const x of xs) m.set(x, (m.get(x) || 0) + 1); return [...m].filter(([, n]) => n > 1).map(([x]) => x); };
for (const x of zaehl(A.map((a) => String(a.id)))) fehler(`Aktivitäts-ID doppelt: ${x}`);
for (const x of zaehl(A.filter((a) => a.gid).map((a) => String(a.gid)))) fehler(`Garmin-ID (gid) doppelt: ${x}`);
const startKey = (a) => (a.date && a.start ? `${a.date}T${String(a.start).slice(0, 5)}|${a.sport}` : null);   // start = «HH:MM»
for (const x of zaehl(A.map(startKey).filter(Boolean))) warn(`zwei Aktivitäten mit gleichem Start und Sport (${x.split("|")[1]}) – möglicher Doppeleintrag`);

/* ---- Zuordnung Name → Aktivität ---- */
const perName = new Map(), altName = new Map();
for (const a of A) {
  perName.set(serieName(salz, serieKey(a)), a);
  if (serieKey(a) !== String(a.id)) altName.set(serieName(salz, a.id), a);
}
// Datenschutz: Namen dürfen sich ohne Salz nicht aus IDs berechnen lassen
const ohneSalz = new Set();
for (const a of A) for (const x of [a.id, a.gid, String(a.gid || "").replace(/^g/, ""), "g" + a.id]) if (x) for (const v of [String(x), `:${x}`])
  ohneSalz.add(createHash("sha256").update(v).digest("hex").slice(0, 24));

/* ---- Lauf-Bericht (Nacht-Update) ---- */
let lauf = null;
if (existsSync(berichtPfad)) { try { lauf = JSON.parse(readFileSync(berichtPfad, "utf8")); } catch { fehler("Lauf-Bericht unlesbar: " + berichtPfad); } }
else if (nacht) fehler("Lauf-Bericht fehlt (zuerst tools/serien_crypt.mjs --nacht)");
const dieserLauf = new Set(lauf ? [...lauf.neu, ...lauf.geaendert] : []);
if (lauf && lauf.fehler && lauf.fehler.length) fehler(`Lauf meldet ${lauf.fehler.length} Fehler`);

/* ---- Dateien ---- */
const files = existsSync(dir) ? readdirSync(dir) : [];
let sps1 = 0, sps2 = 0, bytes = 0;
const proAkt = new Map();
for (const f of files) {
  if (!NAME_RE.test(f)) { fehler(`fremde Datei in ${dir}/: ${f}`); continue; }
  const name = f.slice(0, -4), path = `${dir}/${f}`, buf = readFileSync(path);
  bytes += buf.length;
  if (ohneSalz.has(name)) fehler(`${name}: Dateiname ist der Hash einer bekannten ID ohne Salz`);
  if (buf[0] === 0x1f && buf[1] === 0x8b || buf[0] === 0x7b || buf.includes(Buffer.from('"seg"'))) { fehler(`${name}: unverschlüsselter Inhalt`); continue; }
  let r;
  try { r = oeffnen(key, buf); } catch (e) { fehler(`${name}: nicht lesbar (${e.message})`); continue; }
  if (r.format === "SPS2") { sps2++; const n = statSync(path).size; if (n < STUFE_MIN || (n & (n - 1)) !== 0) fehler(`${name}: Grösse ${n} nicht aufgefüllt`); } else sps1++;
  let j;
  try { j = JSON.parse(r.plain.toString("utf8")); } catch { fehler(`${name}: Inhalt kein JSON`); continue; }
  if (!Array.isArray(j.seg) || !j.sport) { fehler(`${name}: Inhalt ohne Reihe (seg/sport)`); continue; }
  const a = perName.get(name) || altName.get(name);
  if (!a) { (dieserLauf.has(name) ? fehler : warn)(`${name}: Reihe ohne Aktivität (verwaist)`); continue; }
  if (altName.has(name) && !perName.has(name)) warn(`${name}: Reihe noch unter altem Namen (Aktivitäts-ID statt gid) – Monatsexport benennt um`);
  if (proAkt.has(a.id)) fehler(`zwei Reihen für dieselbe Aktivität (${proAkt.get(a.id)}, ${name})`); else proAkt.set(a.id, name);
  if (j.id !== undefined && String(j.id) !== String(a.id) && String(j.id) !== String(a.gid || "")) fehler(`${name}: Inhalt gehört zu einer anderen Aktivität`);
  const n = j.seg.reduce((s, x) => s + (x[1] || 0), 0);
  if (a.ser && Number.isFinite(a.ser.n) && a.ser.n !== n) fehler(`${name}: ${n} Werte, in den Daten ${a.ser.n}`);
}
for (const n of dieserLauf) if (!files.includes(`${n}.bin`)) fehler(`${n}: laut Lauf geschrieben, Datei fehlt`);
const mitSer = A.filter((a) => a.ser), ohneDatei = mitSer.filter((a) => !proAkt.has(a.id));
for (const a of ohneDatei) (lauf && lauf.zuordnung && Object.values(lauf.zuordnung).includes(String(a.id)) ? fehler : warn)(`Aktivität ${a.date || ""} ${a.sport || ""}: Reihe angegeben, Datei fehlt`);

/* ---- Repository (Git) ---- */
if (mitGit) {
  const git = (...g) => execFileSync("git", g, { encoding: "utf8" });
  try {
    const tracked = git("ls-files").split("\n").filter(Boolean);
    for (const t of tracked) if (t === "data.json" || t.startsWith("work/") || /\.fit$/i.test(t) || /(^|\/)\.spuren_pw$/.test(t) || (t.startsWith(`${dir}/`) && !NAME_RE.test(t.slice(dir.length + 1))))
      fehler(`im Repository: ${t}`);
    const st = git("status", "--porcelain", "--untracked-files=all", "--", dir).split("\n").filter(Boolean);
    let neu = 0, geaendert = 0;
    for (const l of st) {
      const code = l.slice(0, 2), p = l.slice(3).split(" -> ").pop(), name = p.slice(dir.length + 1).replace(/\.bin$/, "");
      if (code.includes("D") || code.includes("R")) { if (nacht) fehler(`${p}: im Nacht-Update gelöscht/umbenannt`); continue; }
      if (code === "??" || code.includes("A")) neu++; else geaendert++;
      if (nacht && !dieserLauf.has(name)) fehler(`${p}: geändert, aber nicht im Lauf-Bericht`);
    }
    console.log(`Git: ${neu} neue, ${geaendert} geänderte Reihen gegenüber dem letzten Commit`);
  } catch (e) { fehler("Git nicht lesbar: " + e.message); }
}

console.log(`Reihen: ${files.length} Dateien (${(bytes / 1e6).toFixed(1)} MB; ${sps2} aufgefüllt SPS2, ${sps1} SPS1), ${A.length} Aktivitäten, ` +
  `${proAkt.size} zugeordnet, ${ohneDatei.length} mit Angabe ohne Datei${lauf ? ` · Lauf: ${lauf.neu.length} neu, ${lauf.geaendert.length} geändert, ${lauf.gleich} unverändert` : ""}`);
ende();
