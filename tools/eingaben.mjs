// Eingaben von der Seite (Export «spuren-eingaben-1») entschlüsseln und für merge_daily.py aufbereiten.
//   SPUREN_PW=… node tools/eingaben.mjs <spuren-eingaben-….json> work/eingaben.json
//   python3 -I tools/merge_daily.py data.json work/eingaben.json
// Die Datei ist mit dem Seitenpasswort verschlüsselt (gleiches Salz wie data.enc.json). Nichts davon ins Repository.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { fuerMerge } from "./eingaben_lib.mjs";
const [, , src, dst] = process.argv;
const pw = process.env.SPUREN_PW;
if (!src || !dst || !pw) { console.error("Aufruf: SPUREN_PW=… node tools/eingaben.mjs <export.json> <ziel.json>"); process.exit(2); }
const j = JSON.parse(readFileSync(src, "utf8"));
if (j.format !== "spuren-eingaben-1") throw new Error("keine Eingaben-Datei");
if (j.demo) throw new Error("Export aus der Demo: enthält nur Beispieldaten, wird nicht eingespielt");
const b64 = (s) => Uint8Array.from(Buffer.from(s, "base64"));
const enc = JSON.parse(readFileSync(new URL("../data.enc.json", import.meta.url), "utf8"));
const salt = j.salt || enc.salt, iter = j.iter || enc.iter;
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
const raw = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: b64(salt), iterations: iter, hash: "SHA-256" }, base, 256));
const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
const [iv, ct] = j.verschluesselt.split(".");
const d = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(iv) }, key, b64(ct))));
const out = fuerMerge(d, { datei: src.split("/").pop(), erstellt: j.erstellt });
writeFileSync(dst, JSON.stringify(out, null, 1));
const n = Object.entries(out).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}: ${v.length}`).join(", ");
console.log("Eingaben vom", j.erstellt, "→", dst, "·", n);
