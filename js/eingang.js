/* Ironman Notebook – V5.9.3 Eingaben direkt speichern (eingang-1.0).
 * Jede Eingabe auf dem Gerät (Check-in, Laktat-Bestätigung, CSS-Test, Fueling, Startorte, Routen …) geht als verschlüsselte Datei
 * eingang/<Zeit>-<Zufall>.bin ins Repository, statt «Exportieren → Datei im Chat». Morgen- und Nacht-Update spielen sie ein
 * (tools/eingang.mjs + merge_daily.py) und löschen die eingespielten Dateien.
 *
 * Format EGS1 (wie SPS2 der Sekundenreihen):
 *   "EGS1" | IV (12 Byte) | AES-256-GCM( Länge (4 Byte, big-endian) | Inhalt | Nullen ) | Tag (16 Byte)
 *   Inhalt = gzip(JSON) (Browser mit CompressionStream) oder JSON; die ganze Datei ist auf eine Zweierpotenz ≥ 16 KiB aufgefüllt.
 *   Schlüssel = Seitenschlüssel (PBKDF2-SHA256 aus dem Seitenpasswort, gleiches Salz wie data.enc.json). Öffentlich sichtbar bleibt
 *   nur, dass und wann eine Eingabe kam (Dateiname = UTC-Zeit + Zufall, Grösse = Stufe).
 * Zugang: feingranularer GitHub-Schlüssel nur für sileyhunter/spuren, «Contents: Read and write», mit Ablaufdatum. Er liegt mit dem
 * Seitenschlüssel verschlüsselt auf dem Gerät, nie im Repository. Ohne Netz oder Schlüssel wartet die Eingabe und geht später raus.
 * Der reine Teil (Delta, Format) läuft auch in Node (tests/test_v59.cjs). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const EG = { VERSION: "eingang-1.0", FORMAT: "spuren-eingang-1", MAGIC: "EGS1", REPO: "sileyhunter/spuren", ZWEIG: "main", ORDNER: "eingang", STUFE_MIN: 16384 };
  const id = (e) => e.id;
  /** Listen der Eingaben (gleiche Namen wie Inbox.data in js/v5-ui.js) und ihre ID. */
  EG.LISTEN = { fueling: id, befinden: (e) => e.date, test_entwuerfe: id, koppel: (e) => e.bike + "|" + e.run, langfahrt: id, coach: id, pb: id, css: id,
    fehler: id, rpe: id, intervalle: id, laktat_punkte: id, saison: id, trainingsrouten: id, routen: id, zonen: id,   // V6.2.2: zonen = bestätigte Zonenprofile
    modell: id,                                                      // V6.4: gewähltes Trainingsmodell (modell-1.0) → plan_modell
    planwahl: id,                                                    // V6.5: welchem Plan du an einem Tag folgst (planwahl-1.0) → plan_wahl
    planwoche: id,                                                   // V6.6: Mein Plan einer Woche (eigenplan-1.0) → plan_woche
    garmin_senden: id };                                             // V6.6: Auftrag «An Garmin senden» je Tag (garmin-senden-1.0) → garmin_auftraege
  EG.MENGEN = ["archiv", "routen_entfernt"];                       // ID-Listen, gehen mit den übrigen Eingaben
  EG.BESTAETIGUNG = ["laktat_bestaetigt", "laktat_punkte_bestaetigt"];  // eigene Datei: bleibt liegen, wenn die Prüfung im Update scheitert
  EG.NAME_RE = /^\d{8}T\d{6}Z-[0-9a-f]{8}\.bin$/;

  /** Kopie ohne lokale Kennzeichen («_lokal» u. ä.). */
  const sauber = (e) => { if (!e || typeof e !== "object" || Array.isArray(e)) return e; const c = {}; for (const k of Object.keys(e)) if (k[0] !== "_") c[k] = e[k]; return c; };
  EG.sauber = sauber;
  /** JSON mit sortierten Schlüsseln (gleicher Inhalt → gleicher Text). */
  EG.stabil = function stabil(x) {
    if (x === undefined) return "null";
    if (x === null || typeof x !== "object") return JSON.stringify(x);
    if (Array.isArray(x)) return "[" + x.map(stabil).join(",") + "]";
    return "{" + Object.keys(x).filter((k) => k[0] !== "_" && x[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stabil(x[k])).join(",") + "}";
  };
  /** cyrb53: schneller 53-Bit-Hash, nur zum Erkennen von Änderungen (keine Sicherheitsfunktion). */
  EG.hash = function (s) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
  };

  /** Was noch nicht gesendet ist: je Eintrag ein Schlüssel «liste|id» mit dem Hash des Inhalts. Bestätigungen (Laktat, B1) getrennt.
   *  gesendet: { schlüssel: hash } des zuletzt erfolgreich gesendeten Stands. */
  EG.offen = function (data, gesendet) {
    data = data || {}; gesendet = gesendet || {};
    const teil = () => ({ daten: {}, keys: {}, n: 0 });
    const N = teil(), B = teil();
    const neu = (T, k, h) => { if (gesendet[k] === h) return false; T.keys[k] = h; T.n++; return true; };
    for (const [list, idf] of Object.entries(EG.LISTEN)) for (const e of data[list] || []) {
      const c = sauber(e);
      if (neu(N, list + "|" + idf(e), EG.hash(EG.stabil(c)))) (N.daten[list] = N.daten[list] || []).push(c);
    }
    for (const list of EG.MENGEN) for (const x of data[list] || []) if (neu(N, list + "|" + x, "1")) (N.daten[list] = N.daten[list] || []).push(x);
    for (const list of EG.BESTAETIGUNG) for (const x of data[list] || []) if (neu(B, list + "|" + x, "1")) (B.daten[list] = B.daten[list] || []).push(x);
    for (const [k, v] of Object.entries(data.notizen || {})) if (neu(N, "notizen|" + k, EG.hash(EG.stabil(v)))) (N.daten.notizen = N.daten.notizen || {})[k] = v;
    if (data.fueling_produkte != null && neu(N, "fueling_produkte", EG.hash(EG.stabil(data.fueling_produkte)))) N.daten.fueling_produkte = data.fueling_produkte;
    if (Array.isArray(data.startorte) && neu(N, "startorte", EG.hash(EG.stabil(data.startorte)))) N.daten.startorte = data.startorte.map(sauber);
    if (data.garmin_verlauf && typeof data.garmin_verlauf === "object" && neu(N, "garmin_verlauf|" + (data.garmin_verlauf.id || ""), "1"))
      N.daten.garmin_verlauf = data.garmin_verlauf;                 // V6.2.3: Garmin-Datenexport, einmal je Datei (ID = Inhalt)
    return { normal: N, bestaetigung: B, n: N.n + B.n };
  };
  /** Ist dieser Eintrag mit genau diesem Inhalt schon gesendet? (Anzeige «gesendet · kommt mit dem nächsten Update») */
  EG.istGesendet = function (data, list, e) {
    const g = (data && data.eg && data.eg.gesendet) || {}, idf = EG.LISTEN[list];
    return !!(idf && e && g[list + "|" + idf(e)] === EG.hash(EG.stabil(sauber(e))));
  };
  /** Schlüssel, die es auf dem Gerät nicht mehr gibt (eingespielt und lokal entfernt), aus der Sendeliste streichen. */
  EG.aufraeumen = function (data, gesendet) {
    const alle = EG.offen(data, {}), da = new Set(Object.keys(alle.normal.keys).concat(Object.keys(alle.bestaetigung.keys)));
    const out = {};
    for (const [k, h] of Object.entries(gesendet || {})) if (da.has(k)) out[k] = h;
    return out;
  };
  EG.stufe = (n) => { let t = EG.STUFE_MIN; while (t < n) t *= 2; return t; };
  const p2 = (n) => String(n).padStart(2, "0");
  /** eingang/JJJJMMTTThhmmssZ-<8 Hex>.bin (UTC; verrät nur den Zeitpunkt). */
  EG.dateiname = (d, zufall) => `${EG.ORDNER}/${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z-${zufall}.bin`;
  EG.inhalt = (daten, art, jetzt) => ({ format: EG.FORMAT, v: EG.VERSION, art, erstellt: jetzt.toISOString(), demo: false, daten });

  async function strom(u8, s) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(s)).arrayBuffer()); }
  const gzip = async (u8) => (typeof CompressionStream === "function" ? strom(u8, new CompressionStream("gzip")) : null);
  const gunzip = async (u8) => { if (typeof DecompressionStream !== "function") throw new Error("gzip nicht lesbar"); return strom(u8, new DecompressionStream("gzip")); };
  /** Objekt → EGS1-Datei (Uint8Array). key: AES-GCM-CryptoKey (Seitenschlüssel). */
  EG.schliessen = async function (key, obj) {
    const json = new TextEncoder().encode(JSON.stringify(obj));
    let inh = json;
    try { const gz = await gzip(json); if (gz && gz.length < json.length) inh = gz; } catch (e) { /* ohne gzip: JSON */ }
    const total = EG.stufe(4 + 12 + 4 + inh.length + 16);
    const body = new Uint8Array(total - 32);
    new DataView(body.buffer).setUint32(0, inh.length);
    body.set(inh, 4);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, body));
    const out = new Uint8Array(total);
    out.set([69, 71, 83, 49], 0); out.set(iv, 4); out.set(ct, 16);
    return out;
  };
  /** EGS1-Datei → Objekt. Wirft bei falschem Schlüssel, Manipulation oder Formatfehler. */
  EG.oeffnen = async function (key, u8) {
    if (!u8 || u8.length < 32 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== EG.MAGIC) throw new Error("kein Eingang (EGS1)");
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8.subarray(4, 16) }, key, u8.subarray(16)));
    const n = new DataView(pt.buffer, pt.byteOffset, pt.byteLength).getUint32(0);
    if (n > pt.length - 4) throw new Error("Längenangabe ungültig");
    for (let i = 4 + n; i < pt.length; i++) if (pt[i] !== 0) throw new Error("Auffüllung ungültig");
    let inh = pt.subarray(4, 4 + n);
    if (inh[0] === 0x1f && inh[1] === 0x8b) inh = await gunzip(inh);
    return JSON.parse(new TextDecoder().decode(inh));
  };
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  /** Antwort der GitHub-API → verständliche Meldung (ohne Daten). */
  EG.fehlerText = function (status) {
    if (status === 401) return "Schlüssel ungültig oder abgelaufen. Lege auf GitHub einen neuen an und ersetze ihn hier – die Eingaben warten so lange auf diesem Gerät.";
    if (status === 403) return "Kein Schreibrecht: Der Schlüssel braucht «Contents: Read and write» für sileyhunter/spuren (oder das Abfragelimit ist erreicht). Die Eingaben warten auf diesem Gerät.";
    if (status === 404) return "Kein Zugriff auf sileyhunter/spuren: Der Schlüssel gilt nicht für dieses Repository. Die Eingaben warten auf diesem Gerät.";
    if (status === 409 || status === 422) return "GitHub hat die Datei abgelehnt (Konflikt). Ich versuche es mit einem neuen Namen erneut.";
    if (status >= 500) return "GitHub antwortet gerade nicht (HTTP " + status + "). Neuer Versuch später; nichts geht verloren.";
    return "Senden fehlgeschlagen (HTTP " + status + "). Neuer Versuch später; nichts geht verloren.";
  };

  /* ======================= Browser: Schlüssel, Warteschlange, Senden ======================= */
  const S = { zustand: "aus", text: "", busy: false, timer: null, retry: null, zuletzt: null, gesendet_n: 0, fehlerStatus: null, ctx: null, hoerer: [] };
  EG.status = () => ({ zustand: S.zustand, text: S.text, zuletzt: S.zuletzt, gesendet_n: S.gesendet_n, offen: S.ctx ? EG.offen(S.ctx.Inbox.data, (S.ctx.Inbox.data.eg || {}).gesendet).n : 0 });
  EG.beiStatus = (f) => S.hoerer.push(f);
  const melde = (zustand, text) => { S.zustand = zustand; S.text = text || ""; for (const f of S.hoerer) { try { f(EG.status()); } catch (e) { console.error(e); } } };
  const LS = "sf.eg.schluessel";
  const vault = () => (S.ctx && S.ctx.vault ? S.ctx.vault() : null);
  EG.aktiv = () => !!(S.ctx && !S.ctx.demo && vault());
  EG.hatSchluessel = () => { try { return !!localStorage.getItem(LS); } catch (e) { return false; } };
  async function schluessel() {
    const v = vault(); if (!v) return null;
    let s = null; try { s = localStorage.getItem(LS); } catch (e) { return null; }
    if (!s) return null;
    try { return (await v.open(s)).t || null; } catch (e) { return null; }
  }
  /** Schlüssel prüfen (Form) und verschlüsselt auf dem Gerät ablegen. */
  EG.schluesselSetzen = async function (t) {
    t = String(t || "").trim();
    if (!/^(github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,})$/.test(t)) throw new Error("Das sieht nicht nach einem GitHub-Schlüssel aus (beginnt mit «github_pat_»).");
    const v = vault(); if (!v || !v.seal) throw new Error("Seite nicht entsperrt: Schlüssel kann nicht verschlüsselt werden.");
    localStorage.setItem(LS, await v.seal({ t, seit: new Date().toISOString() }));
    S.fehlerStatus = null;
    melde("bereit", "Schlüssel gespeichert (verschlüsselt auf diesem Gerät).");
    EG.planen(200);
  };
  EG.schluesselEntfernen = function () { try { localStorage.removeItem(LS); } catch (e) {} melde("aus", "Schlüssel entfernt. Eingaben bleiben auf dem Gerät; Rückweg: Exportieren."); };

  async function hochladen(token, name, bytes) {
    const r = await fetch(`https://api.github.com/repos/${EG.REPO}/contents/${name}`, {
      method: "PUT", cache: "no-store",
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Eingang", content: b64(bytes), branch: EG.ZWEIG }),
    });
    return r.status;
  }
  const zufall = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");
  async function sendeTeil(token, T, art) {
    const v = vault();
    for (let versuch = 0; versuch < 3; versuch++) {
      const jetzt = new Date(), name = EG.dateiname(jetzt, zufall());
      const bytes = await v.sealEGS1(EG.inhalt(T.daten, art, jetzt));
      const st = await hochladen(token, name, bytes);
      if (st === 201 || st === 200) return { ok: true, name };
      if (st === 409 || st === 422) continue;                          // gleicher Name (sehr selten) → neuer Name
      return { ok: false, status: st };
    }
    return { ok: false, status: 409 };
  }
  /** Offene Eingaben senden: zuerst die übrigen, dann Bestätigungen als eigene Datei. Nie zwei Läufe gleichzeitig. */
  EG.senden = async function (opt) {
    opt = opt || {};
    if (!S.ctx || S.busy) return EG.status();
    const I = S.ctx.Inbox;
    if (S.ctx.demo) { melde("aus", "Demo: Eingaben bleiben auf diesem Gerät, es wird nichts gesendet."); return EG.status(); }
    if (!vault()) { melde("aus", "Seite nicht entsperrt."); return EG.status(); }
    const token = await schluessel();
    const eg = (I.data.eg = I.data.eg || { gesendet: {}, dateien: [] });
    const D = EG.offen(I.data, eg.gesendet);
    if (!token) { melde("aus", D.n ? `${D.n} Eingabe${D.n === 1 ? "" : "n"} nur auf diesem Gerät – für «Direkt speichern» einen GitHub-Schlüssel hinterlegen (Einstellungen).` : "Kein GitHub-Schlüssel: Eingaben bleiben auf dem Gerät (Rückweg: Exportieren)."); return EG.status(); }
    if (!D.n && !opt.probe) { melde("bereit", S.zuletzt ? `Alles gesendet (zuletzt ${S.zuletzt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}).` : "Alles gesendet."); return EG.status(); }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { melde("wartet", `${D.n} Eingabe${D.n === 1 ? "" : "n"} warten auf Netz.`); return EG.status(); }
    S.busy = true; melde("sendet", "Sende …");
    try {
      const teile = opt.probe ? [[{ daten: { probe: true }, keys: {}, n: 0 }, "probe"]] : [[D.normal, "eingaben"], [D.bestaetigung, "bestaetigung"]];
      for (const [T, art] of teile) {
        if (!opt.probe && !T.n) continue;
        const r = await sendeTeil(token, T, art);
        if (!r.ok) {
          S.fehlerStatus = r.status;
          melde(r.status === 401 || r.status === 403 || r.status === 404 ? "fehler" : "wartet", EG.fehlerText(r.status));
          planeRetry(r.status >= 500 || r.status === 409 ? 120000 : null);
          return EG.status();
        }
        Object.assign(eg.gesendet, T.keys);
        eg.dateien = (eg.dateien || []).concat({ name: r.name.split("/").pop(), zeit: new Date().toISOString(), n: T.n, art }).slice(-30);
        S.gesendet_n += T.n;
        await I.save({ still: true });                                    // gesendeten Stand sofort merken (auch wenn der nächste Teil scheitert)
      }
      S.zuletzt = new Date(); S.fehlerStatus = null;
      melde("bereit", opt.probe ? "Verbindung klappt: Testdatei gesendet (wird beim nächsten Update entfernt)." : `Gesendet ${S.zuletzt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })} – kommt mit dem nächsten Update in die Daten.`);
    } catch (e) {
      melde("wartet", "Kein Netz oder keine Antwort von GitHub – die Eingaben warten auf diesem Gerät und gehen später raus.");
      planeRetry(120000);
    } finally { S.busy = false; }
    return EG.status();
  };
  function planeRetry(ms) { if (S.retry) clearTimeout(S.retry); S.retry = ms ? setTimeout(() => { S.retry = null; EG.senden(); }, ms) : null; }
  /** Nach einer Änderung kurz warten (mehrere Tipps hintereinander → eine Datei), dann senden. */
  EG.planen = function (ms) { if (!S.ctx) return; if (S.timer) clearTimeout(S.timer); S.timer = setTimeout(() => { S.timer = null; EG.senden(); }, ms == null ? 1500 : ms); };
  EG.geaendert = () => EG.planen();
  EG.testen = () => EG.senden({ probe: true });
  /** Start: ctx = { Inbox, vault: () => window.SPUREN_VAULT, demo } */
  EG.starten = function (ctx) {
    S.ctx = ctx;
    if (ctx.demo) { melde("aus", "Demo: es wird nichts gesendet."); return; }
    const eg = ctx.Inbox.data.eg;
    if (eg && eg.gesendet) eg.gesendet = EG.aufraeumen(ctx.Inbox.data, eg.gesendet);
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => EG.planen(300));
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") EG.planen(800); });
    }
    EG.planen(1200);
  };
  return EG;
});
