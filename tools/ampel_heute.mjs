#!/usr/bin/env node
// ampel-plan-1.0 (V7.4, Etappe 6, Entscheid A7): Entscheid der Ampel für heute im Morgen-Update – dieselben Regeln wie auf der Seite
// (js/formkurve.js readiness-2.1, js/v74.js). Liest data.json (nach dem Einspielen der Morgenwerte und der Eingaben vom Handy),
// rechnet den Entscheid und gibt ihn als Eingabe für merge_daily.py aus (`ampel_add`, nur wenn er neu ist oder sich geändert hat;
// «Trotzdem wie geplant» bleibt). Schreibt nichts; die Ausgabe gehört nach work/ (nie committen, sie enthält die Gründe mit Werten).
//
//   node tools/ampel_heute.mjs data.json [--datum JJJJ-MM-TT] [--jetzt ISO] > work/ampel_heute.json
//   python3 -I tools/merge_daily.py data.json work/ampel_heute.json
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FK = require("../js/formkurve.js");
const V74 = require("../js/v74.js");

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (!args[0] || args[0].startsWith("--")) {
  console.error("Aufruf: node tools/ampel_heute.mjs data.json [--datum JJJJ-MM-TT] [--jetzt ISO]");
  process.exit(2);
}
const D = JSON.parse(readFileSync(args[0], "utf8"));
const jetzt = opt("--jetzt") ? new Date(opt("--jetzt")).toISOString() : new Date().toISOString();
const datum = opt("--datum") || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date(jetzt));
if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) { console.error("kein Datum"); process.exit(2); }

// Last wie auf der Seite (index.html): last-2.0/2.1 rechnet mit tl2, sonst mit der Last wie geliefert
const modell = (D.config && D.config.load_model) || "garmin";
const acts = (D.activities || []).map((a) => (["last-2.0", "last-2.1"].includes(modell) && Number.isFinite(a.tl2) ? Object.assign({}, a, { tss: a.tl2 }) : a));
const r = FK.readiness(D.days || [], acts, D.befinden || [], datum);
const e = V74.entscheid(r, { morgenwerte: V74.morgenwerte(D.days, datum), datum });
const alt = V74.gespeichert(datum, D.ampel_anpassung || []);
const out = { v: V74.VERSIONS.ampelplan, datum, status: e.status, ampel: e.ampel, gruende: e.gruende, morgenwerte: e.morgenwerte, hinweis: e.hinweis,
  trotzdem: !!(alt && alt.trotzdem && alt.trotzdem.an), last: modell === "ftp_est" ? "Last wie geliefert (ftp_est nicht nachgebildet)" : modell };
if (alt ? alt.status !== e.status : e.status !== "wie_geplant") out.ampel_add = [V74.eintrag(e, { quelle: "morgen-update", jetzt, trotzdem: alt && alt.trotzdem, angenommen: alt && alt.angenommen })];
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
