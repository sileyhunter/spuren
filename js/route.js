/* Ironman Notebook – Routenplaner V5.3: Rechenlogik ohne DOM (window.RT, in Node via require).
 *
 * Domänenobjekte (getrennt, je mit Herkunft):
 *   Weggeometrie  – Routing-Dienst (BRouter), je Abschnitt zwischen zwei Wegpunkten eine Anfrage
 *   Wege/Belag    – OSM-Merkmale aus der Routing-Antwort (WayTags), nichts geschätzt
 *   Wetter/Zeiten – Open-Meteo (nur nach Zustimmung), auf die Strecke interpoliert
 *   Tempo         – Physik (Rad), Minetti (Laufen), Tobler (Wandern), Hm/h (Skitour), persönlich kalibriert
 * Ein einziges Kettenmass: d = distanceAlong_m von Start (0) bis Ziel (Routenlänge).
 */
(function (root, factory) {
  const FKmod = typeof module === "object" && module.exports ? require("./formkurve.js") : root.FK;
  const RT = factory(FKmod);
  if (typeof module === "object" && module.exports) module.exports = RT; else root.RT = RT;
})(typeof self !== "undefined" ? self : this, function (FK) {
  "use strict";
  const RT = {};
  RT.VERSIONS = { route: "route-1.1", hoehe: "hoehe-1.0", anstiege: "anstiege-1.0", zeit: "zeit-rt-1.3", wetter: "wetter-rt-1.2", varianten: "varianten-3.0",
    gravel: "gravel-rt-1.1", alternativen: "alternativen-1.1", wegpunkte: "wegpunkte-1.1", ortssuche: "ortssuche-1.0", belag: "belag-1.1", anfragen: "anfragen-1.0",
    // V5.8: Abschnitte von Hand, Skitourenrouten, Hangneigung, Wegende beim Wandern, MTB-Abfahrten, Windpfeile
    hand: "hand-1.0", skiroute: "skiroute-1.0", hang: "hangneigung-1.0", wegende: "wegende-1.0", mtb: "mtb-abfahrt-1.0", wind: "windpfeile-1.1" };
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const R_EARTH = 6371008.8, RAD = Math.PI / 180;

  /* ---------------- Geometrie ---------------- */
  RT.hav = function (lon1, lat1, lon2, lat2) {
    const dLa = (lat2 - lat1) * RAD, dLo = (lon2 - lon1) * RAD;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLo / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(x)));
  };
  /** Kurs (Grad, 0 = Nord, im Uhrzeigersinn) von Punkt 1 nach Punkt 2. */
  RT.bearing = function (lon1, lat1, lon2, lat2) {
    const p1 = lat1 * RAD, p2 = lat2 * RAD, dl = (lon2 - lon1) * RAD;
    const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  };

  /* ---------------- Sportprofile ----------------
   * engine: BRouter-Profil (Standardprofile aus misc/profiles2 des BRouter-Projekts).
   * Zugang: die Profile sperren access=no/private und für das Verkehrsmittel verbotene Wege;
   * zusätzlich bewerten wir jeden Abschnitt selbst (RT.access) und zeigen Schiebe- und Unklar-Stellen. */
  RT.SPORTS = {
    rennrad: { label: "Rennrad", art: "rad", rad: "rennrad", engine: "fastbike", profil: "rennrad-asphalt", modi: ["watt", "hf"], wert: { watt: 200, hf: 140 },
      text: "Für Velos erlaubte, asphaltierte Strassen und Velowege; Gravel (Kies, Feinkies, Naturbelag) wird gemieden, Pflaster ist ok; Autobahnen ausgeschlossen." },
    gravel: { label: "Gravel", art: "rad", rad: "gravel", engine: "gravel", modi: ["watt", "hf"], wert: { watt: 180, hf: 135 },
      optionen: { schotter: { label: "Schotter bevorzugen", param: "prefer_unpaved_paths", an: "1", aus: "0", standard: true } },
      text: "Schotter- und Forststrassen, ruhige Asphaltverbindungen; steile, unbefestigte Pfade gemieden." },
    // mtb-abfahrt-1.0: Aufstieg immer über Forst- und Kieswege (Gravel-Profil); Abfahrt danach wählbar (gleicher Weg, Singletrail, andere Strasse)
    mtb: { label: "MTB", art: "rad", rad: "mtb", engine: "gravel", params: { prefer_unpaved_paths: "1" }, modi: ["watt", "hf"], wert: { watt: 170, hf: 135 },
      text: "Aufstieg über Forst- und Kieswege (Gravel-Profil, Kies bevorzugt). Ab dem höchsten Punkt kannst du die Abfahrt wählen: gleicher Weg, Singletrail (MTB-Profil, reine Fusswege gesperrt) oder eine andere Strasse." },
    laufen: { label: "Laufen", art: "fuss", engine: "hiking-mountain", params: { SAC_scale_limit: "1", SAC_scale_preferred: "0" }, modi: ["pace", "hf"], wert: { pace: 330, hf: 145 },
      text: "Fuss- und Wanderwege, ruhige Strassen; Bergwege über T1 ausgeschlossen." },
    trail: { label: "Trail", art: "fuss", engine: "hiking-mountain", params: { SAC_scale_limit: "3", SAC_scale_preferred: "2" }, modi: ["pace", "hf"], wert: { pace: 400, hf: 150 },
      text: "Erlaubte Wander- und Bergwege bis SAC T3 (Schwierigkeit aus OSM, sonst unbekannt)." },
    wandern: { label: "Wandern", art: "fuss", engine: "hiking-mountain", params: { SAC_scale_limit: "3", SAC_scale_preferred: "1" }, modi: ["faktor", "hmh", "hf"], wert: { faktor: 100, hmh: 450, hf: 130 },
      optionen: { sac: { label: "Höchste SAC-Stufe", param: "SAC_scale_limit", werte: ["1", "2", "3", "4"], standard: "3" } },
      text: "Wanderwege nach SAC-Skala (Standard bis T3); Zugang laut OSM." },
    skitour: { label: "Skitour", art: "ski", engine: null, modi: ["hmh", "hf"], wert: { hmh: 450, hf: 145 },
      text: "Die Linie folgt, wo möglich, den Skitourenrouten von swisstopo und SAC; dazwischen und abseits davon zeichnest du von Hand. Hangneigung aus dem Höhenmodell. Keine Aussage zur Lawinensicherheit." },
  };
  RT.engineFor = function (sport, opts) {
    const S = RT.SPORTS[sport]; if (!S || !S.engine) return null;
    let engine = S.engine; const params = Object.assign({}, S.params || {});
    for (const [k, o] of Object.entries(S.optionen || {})) {
      const v = opts && k in opts ? opts[k] : o.standard;
      if (o.engine && v) { engine = o.engine; Object.assign(params, o.params || {}); }
      else if (o.param && o.werte) params[o.param] = String(v);
      else if (o.param) params[o.param] = v ? o.an : o.aus;
    }
    params.processUnusedTags = "1";          // alle bekannten OSM-Merkmale melden (Belag, Wegart, Zugang), Route bleibt gleich
    return { engine, params, profil: S.profil || null };
  };

  /** Varianten (varianten-2.0): dasselbe, für Velos erlaubte Rennradprofil (ohne Gravel), automatisch beide gerechnet.
   *  Schnellste = wenig Gewicht auf Verkehr (consider_traffic 0,1); Velofreundlich = Verkehr wichtig (0,5) und asphaltierte
   *  Radwege bzw. offizielle Velowege so günstig wie Nebenstrassen (prefer_cycleways 1). Gewählt wird nach RT.waehleVariante. */
  // varianten-3.0: dazu «Am ruhigsten» (Verkehr sehr wichtig, consider_traffic 1) – alle drei mit dem Rennradprofil ohne Gravel
  RT.VARIANTEN = {
    rennrad: [{ k: "schnell", label: "Am direktesten", params: { consider_traffic: "0.1", prefer_cycleways: "0", avoid_mainroads: "0" } },
      { k: "velo", label: "Velofreundlich", params: { consider_traffic: "0.5", prefer_cycleways: "1", avoid_mainroads: "1" } },
      { k: "ruhig", label: "Am ruhigsten", params: { consider_traffic: "1", prefer_cycleways: "1", avoid_mainroads: "1" } }],
  };
  RT.TOLERANZ_STANDARD = 10;     // % mehr Fahrzeit, die die velofreundliche Variante kosten darf
  RT.engineVariant = function (sport, opts, k) {
    const e = RT.engineFor(sport, opts), v = (RT.VARIANTEN[sport] || []).find((x) => x.k === k);
    return e && v ? { engine: e.engine, params: Object.assign({}, e.params, v.params), profil: e.profil } : e;
  };
  /** Anteile der Wegarten (m und %) einer Route; Hauptstrasse = trunk/primary, Radweg = cycleway bzw. offizieller Veloweg laut OSM. */
  RT.wayShare = function (route) {
    const m = {}; for (const s of route.segs || []) m[s.way] = (m[s.way] || 0) + (s.d1 - s.d0);
    const L = route.L || 1, haupt = m.hauptstrasse || 0, rad = m.radweg || 0, unbef = (route.segs || []).filter((s) => /kies|natur|unbefestigt/.test(s.surface)).reduce((x, s) => x + s.d1 - s.d0, 0);
    const str = m.strasse || 0;
    return { m, haupt_m: haupt, haupt_pct: (100 * haupt) / L, strasse_m: str, strasse_pct: (100 * str) / L, verkehr_pct: (100 * (haupt + 0.5 * str)) / L, radweg_m: rad, radweg_pct: (100 * rad) / L, unbef_m: unbef, L };
  };
  /** Welche Variante gilt (varianten-3.0; zwischen direktester und velofreundlicher wie varianten-2.1)? rows: [{k, label, t (s) oder null, L, gravel_m, haupt_pct, radweg_pct}].
   *  Velofreundlich, wenn höchstens tol % langsamer (Fahrzeit; nur ohne Zeitprognose die Distanz, dann ausdrücklich so
   *  beschriftet), nicht mehr Gravel und tatsächlich ruhiger: weniger Verkehrsstrassen (Hauptstrasse + ½ Verbindungsstrasse)
   *  oder mehr Radweg, je ≥ 1 Prozentpunkt, und nicht mehr Verkehrsstrassen; sonst die direkteste. */
  RT.waehleVariante = function (rows, tolPct) {
    const tol = isNum(tolPct) ? tolPct : RT.TOLERANZ_STANDARD;
    const base = waehle2(rows, tol);
    // varianten-3.0: «Am ruhigsten», wenn auch sie höchstens tol % langsamer als die direkteste ist, nicht mehr Gravel hat und
    // gegenüber der bisherigen Wahl tatsächlich ruhiger ist (gleiche Regel wie oben); sonst bleibt die bisherige Wahl.
    const ok = (rows || []).filter((r) => r && !r.fehler && isNum(r.L));
    const s = ok.find((r) => r.k === "schnell"), q = ok.find((r) => r.k === "ruhig"), cur = ok.find((r) => r.k === base.k);
    if (q && !base.k) return { k: "ruhig", text: "Nur «Am ruhigsten» berechnet." };
    if (!q || !s || !cur || cur === q) return base;
    const mass = isNum(s.t) && isNum(q.t) ? "t" : "L", plus = s[mass] > 0 ? (100 * (q[mass] - s[mass])) / s[mass] : 0;
    const vk = (r) => (isNum(r.verkehr_pct) ? r.verkehr_pct : (r.haupt_pct || 0) + 0.5 * (r.strasse_pct || 0));
    const gleich = Math.abs(q.L - cur.L) < Math.max(30, cur.L * 0.005) && Math.abs((q.haupt_pct || 0) - (cur.haupt_pct || 0)) < 1;
    const ruhiger = (vk(q) <= vk(cur) - 1 || (q.radweg_pct || 0) >= (cur.radweg_pct || 0) + 1) && vk(q) < vk(cur) + 1;
    base.ruhig = { plus, mass, gleich, ruhiger };
    if (gleich && base.gleich) base.text = "Alle drei Routen führen hier über dieselben Wege.";
    if (gleich || !ruhiger || (q.gravel_m || 0) > (s.gravel_m || 0) + 50 || plus > tol) return base;
    const diff = mass === "t" ? `${q.t >= s.t ? "+" : "−"}${Math.round(Math.abs(q.t - s.t) / 60)} min` : `${q.L >= s.L ? "+" : "−"}${(Math.abs(q.L - s.L) / 1000).toFixed(1)} km`;
    return { k: "ruhig", plus, mass, ruhig: base.ruhig, text: `Am ruhigsten gewählt: ${diff} (${plus >= 0 ? "+" : "−"}${Math.abs(plus).toFixed(0)} %${mass === "L" ? ", ohne Zeitprognose auf die Distanz" : ""}), Verkehrsstrassen ${Math.round(vk(q))} % statt ${Math.round(vk(s))} % bei der direktesten.` };
  };
  function waehle2(rows, tol) {
    const ok = (rows || []).filter((r) => r && !r.fehler && isNum(r.L) && r.k !== "ruhig");
    const s = ok.find((r) => r.k === "schnell"), v = ok.find((r) => r.k === "velo");
    if (!s && !v) return { k: null, text: "Keine Variante berechnet." };
    if (!s || !v) return { k: (s || v).k, text: `Nur «${(s || v).label}» berechnet.` };
    const mass = isNum(s.t) && isNum(v.t) ? "t" : "L", a = s[mass], b = v[mass];
    const plus = a > 0 ? (100 * (b - a)) / a : 0;
    const gleich = Math.abs(v.L - s.L) < Math.max(30, s.L * 0.005) && Math.abs((v.haupt_pct || 0) - (s.haupt_pct || 0)) < 1;
    const diff = mass === "t" ? `${b >= a ? "+" : "−"}${Math.round(Math.abs(b - a) / 60)} min` : `${b >= a ? "+" : "−"}${(Math.abs(b - a) / 1000).toFixed(1)} km`;
    if (gleich) return { k: "velo", gleich: true, plus: 0, text: "Beide Varianten führen über dieselben Wege." };
    const ohneZeit = mass === "L" ? " (ohne Zeitprognose: Toleranz ersatzweise auf die Distanz angewendet)" : "";
    if ((v.gravel_m || 0) > (s.gravel_m || 0) + 50) return { k: "schnell", plus, mass, text: `Die velofreundliche Variante hätte mehr Gravel (${((v.gravel_m || 0) / 1000).toFixed(1)} km) – darum die direkteste.` };
    const vk = (r) => (isNum(r.verkehr_pct) ? r.verkehr_pct : (r.haupt_pct || 0) + 0.5 * (r.strasse_pct || 0));
    const hv = v.haupt_pct || 0, hs = s.haupt_pct || 0, rv = v.radweg_pct || 0, rs = s.radweg_pct || 0, kv = vk(v), ks = vk(s);
    const ruhiger = (kv <= ks - 1 || rv >= rs + 1) && kv < ks + 1;
    if (!ruhiger) return { k: "schnell", plus, mass, nicht_ruhiger: true, text: `Die velofreundliche Variante ist hier nicht ruhiger (Verkehrsstrassen ${Math.round(kv)} % statt ${Math.round(ks)} %, Radweg ${Math.round(rv)} % statt ${Math.round(rs)} %) – darum die direkteste.` };
    if (plus <= tol) return { k: "velo", plus, mass, text: `Velofreundlich gewählt: ${diff} (${plus >= 0 ? "+" : "−"}${Math.abs(plus).toFixed(0)} %${ohneZeit}), Hauptstrasse ${Math.round(hv)} % statt ${Math.round(hs)} %, Radweg ${Math.round(rv)} %.` };
    return { k: "schnell", plus, mass, text: `Velofreundlich wäre ${diff} (+${plus.toFixed(0)} %) – mehr als deine Toleranz von ${tol} %${ohneZeit}, darum die direkteste.` };
  }

  /* ---------------- Routing-Dienst (BRouter) ---------------- */
  RT.ENDPOINT = "https://brouter.de/brouter";
  /** Anzeigename eines Profils: hinterlegte eigene Profile heissen beim Server «custom_<Zeit>». */
  RT.profilName = (engine) => (/^custom_/.test(String(engine || "")) ? "rennrad-asphalt (eigenes Profil ohne Gravel)" : String(engine || ""));
  /** opt.alt: Alternative 0–3 (BRouter alternativeidx); opt.nogos: Sperrpunkte «lon,lat,radius|…» (Umfahrung). */
  RT.brouterUrl = function (endpoint, eng, a, b, opt) {
    const ll = [a, b].map((p) => `${(+p[0]).toFixed(6)},${(+p[1]).toFixed(6)}`).join("|");
    const extra = Object.entries(eng.params || {}).map(([k, v]) => `&profile:${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("");
    const alt = opt && isNum(opt.alt) ? Math.max(0, Math.min(3, Math.round(opt.alt))) : 0;
    const nogo = opt && opt.nogos ? `&nogos=${opt.nogos}` : "";
    return `${endpoint || RT.ENDPOINT}?lonlats=${ll}&profile=${encodeURIComponent(eng.engine)}&alternativeidx=${alt}&format=geojson${nogo}${extra}`;
  };
  /** Eigenes Profil (Text) beim BRouter-Server hinterlegen: POST <endpoint>/profile → «custom_…» (gilt, bis der Server es löscht). */
  RT.uploadProfile = async function (fetchFn, endpoint, text) {
    let res;
    try { res = await fetchFn(`${endpoint || RT.ENDPOINT}/profile`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: text }); }
    catch (e) { throw new RouteError("netz", "Eigenes Profil konnte nicht hinterlegt werden (keine Verbindung).", String(e && e.message || e)); }
    const t = await res.text();
    let j = null; try { j = JSON.parse(t); } catch (e) { /* unten */ }
    if (!res.ok || !j || !j.profileid || j.error) throw new RouteError("profil", "Der Routing-Server hat das Rennradprofil nicht angenommen.", (j && j.error) || `HTTP ${res.status}: ${t.slice(0, 200)}`);
    return String(j.profileid);
  };
  class RouteError extends Error {
    constructor(kind, msg, detail) { super(msg); this.kind = kind; this.detail = detail || ""; }
  }
  RT.RouteError = RouteError;
  /** Fehlermeldung des Servers in verständliche Sprache übersetzen (Originaltext bleibt erhalten). */
  RT.explainError = function (status, text, engine) {
    const t = String(text || "").trim();
    if (/position not mapped|not mapped in existing datafile/i.test(t)) return "Ein Punkt liegt zu weit vom erlaubten Wegnetz entfernt. Punkt näher an einen Weg setzen.";
    if (/target island/i.test(t)) return "Das Ziel liegt in einem abgeschlossenen Teil des Wegnetzes (z. B. Privatgelände). Punkt verschieben.";
    if (/no track found/i.test(t)) return "Für dieses Profil gibt es keine erlaubte Verbindung zwischen diesen Punkten.";
    if (/datafile .* not found/i.test(t)) return "Für dieses Gebiet hat der Routing-Server keine Kartendaten.";
    if (/killed|watchdog|timeout/i.test(t)) return "Der Routing-Server hat die Berechnung abgebrochen (zu lang oder überlastet). Zwischenziele setzen oder später erneut versuchen.";
    if (status === 0) return "Keine Verbindung zum Routing-Server.";
    if (status >= 500) return `Der Routing-Server meldet einen internen Fehler${engine ? ` (z. B. Profil «${RT.profilName(engine)}» dort nicht verfügbar oder Überlastung)` : ""}. Später erneut versuchen oder eine andere Sportart wählen.`;
    return "Die Route konnte nicht berechnet werden.";
  };
  /** Einen Abschnitt routen. fetchFn = window.fetch (Tests: eigener Server). */
  RT.fetchLeg = async function (fetchFn, endpoint, eng, a, b, opt) {
    const url = RT.brouterUrl(endpoint, eng, a, b, opt);
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), (opt && opt.timeout_ms) || 30000) : null;
    let res;
    try { res = await fetchFn(url, ctl ? { signal: ctl.signal } : {}); }
    catch (e) {
      const aborted = e && e.name === "AbortError";
      throw new RouteError(aborted ? "timeout" : "netz", aborted ? "Zeitüberschreitung beim Routing-Server." : RT.explainError(0, ""), String(e && e.message || e));
    } finally { if (timer) clearTimeout(timer); }
    const text = await res.text();
    if (!res.ok) { const er = new RouteError("dienst", RT.explainError(res.status, text, eng.engine), `HTTP ${res.status}: ${text.slice(0, 300) || "(ohne Text)"}`); er.status = res.status; throw er; }
    let gj;
    try { gj = JSON.parse(text); } catch (e) { throw new RouteError("format", "Antwort des Routing-Servers ist kein GeoJSON.", text.slice(0, 200)); }
    const leg = RT.parseBRouter(gj);
    leg.url = url.replace(/lonlats=[^&]*/, "lonlats=…").replace(/nogos=[^&]*/, "nogos=…");
    return leg;
  };

  /* ---------------- Anfragen schonen (anfragen-1.0) ----------------
   * Öffentlicher Server: höchstens max Anfragen gleichzeitig (Warteschlange), gleiche URL nur einmal (Cache im Aufrufer). */
  RT.gate = function (fetchFn, max) {
    max = Math.max(1, max || 2);
    let n = 0, total = 0;
    const q = [];
    const next = () => {
      while (n < max && q.length) {
        const job = q.shift(); n++; total++;
        Promise.resolve().then(() => fetchFn.apply(null, job.args)).then(job.res, job.rej).finally(() => { n--; next(); });
      }
    };
    const g = function () { const args = Array.from(arguments); return new Promise((res, rej) => { q.push({ args, res, rej }); next(); }); };
    g.stats = () => ({ laufend: n, wartend: q.length, gesamt: total, max });
    return g;
  };
  /** Mehrere Punkte in einer Anfrage (Rundtouren-Vorschläge): eine Antwort für die ganze Linie. */
  RT.brouterUrlPts = function (endpoint, eng, pts, opt) {
    const ll = pts.map((p) => `${(+p[0]).toFixed(6)},${(+p[1]).toFixed(6)}`).join("|");
    const extra = Object.entries(eng.params || {}).map(([k, v]) => `&profile:${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("");
    const alt = opt && isNum(opt.alt) ? Math.max(0, Math.min(3, Math.round(opt.alt))) : 0;
    return `${endpoint || RT.ENDPOINT}?lonlats=${ll}&profile=${encodeURIComponent(eng.engine)}&alternativeidx=${alt}&format=geojson${opt && opt.nogos ? `&nogos=${opt.nogos}` : ""}${extra}`;
  };
  RT.fetchPts = async function (fetchFn, endpoint, eng, pts, opt) {
    if (pts.length === 2) return RT.fetchLeg(fetchFn, endpoint, eng, pts[0], pts[1], opt);
    const url = RT.brouterUrlPts(endpoint, eng, pts, opt);
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), (opt && opt.timeout_ms) || 45000) : null;
    let res;
    try { res = await fetchFn(url, ctl ? { signal: ctl.signal } : {}); }
    catch (e) { const ab = e && e.name === "AbortError"; throw new RouteError(ab ? "timeout" : "netz", ab ? "Zeitüberschreitung beim Routing-Server." : RT.explainError(0, ""), String(e && e.message || e)); }
    finally { if (timer) clearTimeout(timer); }
    const text = await res.text();
    if (!res.ok) { const er = new RouteError("dienst", RT.explainError(res.status, text, eng.engine), `HTTP ${res.status}: ${text.slice(0, 300) || "(ohne Text)"}`); er.status = res.status; throw er; }
    let gj; try { gj = JSON.parse(text); } catch (e) { throw new RouteError("format", "Antwort des Routing-Servers ist kein GeoJSON.", text.slice(0, 200)); }
    const leg = RT.parseBRouter(gj);
    leg.url = url.replace(/lonlats=[^&]*/, "lonlats=…").replace(/nogos=[^&]*/, "nogos=…");
    return leg;
  };
  /** Eine Antwort über mehrere Punkte in Abschnitte je Punktpaar teilen (gleiche Form wie fetchLeg), damit der Planer sie
   *  wie einzeln gerechnete Abschnitte verwenden kann. Teilstelle = erste Stelle der Linie, die dem Zwischenziel am
   *  nächsten kommt (BRouter führt die Linie durch den auf den Weg geschobenen Punkt). null, wenn die Teilung nicht eindeutig ist. */
  RT.splitLegs = function (leg, pts) {
    const C = leg.coords, N = C.length, cut = [0], k = pts.length - 2;
    if (N < pts.length) return null;
    for (let v = 1; v <= k; v++) {
      // nächster Punkt der Linie = auf den Weg geschobener Punkt (BRouter führt die Linie hindurch); je Abschnitt mindestens
      // ein Linienstück, damit auch zwei auf denselben Punkt geschobene Zwischenziele eigene Abschnitte bleiben
      const p = pts[v], from = cut[cut.length - 1] + 1, to = N - 1 - (k - v) - 1;
      if (to < from) return null;
      let best = Infinity;
      const dist = [];
      for (let j = from; j <= to; j++) { const h = RT.hav(p[0], p[1], C[j][0], C[j][1]); dist.push(h); if (h < best) best = h; }
      if (!isFinite(best)) return null;
      let pick = from;
      for (let j = 0; j < dist.length; j++) if (dist[j] <= best + 15 && (j === dist.length - 1 || dist[j] <= dist[j + 1])) { pick = from + j; break; }
      cut.push(pick);
    }
    cut.push(N - 1);
    for (let i = 1; i < cut.length; i++) if (cut[i] < cut[i - 1]) return null;
    const out = [];
    for (let i = 0; i < cut.length - 1; i++) {
      const a = cut[i], b = cut[i + 1];
      if (b <= a) return null;
      const edges = [];
      for (const e of leg.edges) {
        const i0 = Math.max(a, e.i0), i1 = Math.min(b, e.i1);
        if (i1 > i0) edges.push(Object.assign({}, e, { i0: i0 - a, i1: i1 - a }));
      }
      out.push({ coords: C.slice(a, b + 1), edges: edges.length ? edges : [{ i0: 0, i1: b - a, tags: {}, nodeTags: {}, ohne_meldung: true }], props: Object.assign({}, leg.props, { geteilt: true }), url: leg.url });
    }
    return out;
  };

  RT.parseTags = function (s) {
    const o = {};
    for (const kv of String(s || "").split(" ")) { if (!kv) continue; const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }
    return o;
  };
  /** BRouter-GeoJSON → Abschnitt {coords [[lon,lat,ele|null]], edges [{i0,i1,tags,nodeTags}], props}.
   *  Jede Meldungszeile gilt bis zur Koordinate mit ihrer Endposition (Mikrograd); Zuordnung wie brouter-web (TrackEdges). */
  RT.parseBRouter = function (gj) {
    const f = gj && gj.features && gj.features[0];
    if (!f || !f.geometry || f.geometry.type !== "LineString" || !Array.isArray(f.geometry.coordinates) || f.geometry.coordinates.length < 2)
      throw new RouteError("format", "Antwort ohne Routenlinie.");
    const coords = f.geometry.coordinates.map((c) => [+c[0], +c[1], c.length > 2 && isNum(+c[2]) ? +c[2] : null]);
    const P = f.properties || {}, msgs = Array.isArray(P.messages) ? P.messages : [];
    const head = msgs[0] || [], col = (n) => head.indexOf(n);
    const iLon = col("Longitude"), iLat = col("Latitude"), iWay = col("WayTags"), iNode = col("NodeTags"), iDist = col("Distance");
    const edges = [];
    if (msgs.length > 1 && iLon >= 0 && iLat >= 0 && iWay >= 0) {
      const ilon = coords.map((c) => Math.round(c[0] * 1e6)), ilat = coords.map((c) => Math.round(c[1] * 1e6));
      let from = 0, search = 0;
      for (let m = 1; m < msgs.length; m++) {
        const r = msgs[m], lo = parseInt(r[iLon], 10), la = parseInt(r[iLat], 10);
        let j = search, ungenau = false;
        while (j < coords.length && !(ilon[j] === lo && ilat[j] === la)) j++;
        if (j >= coords.length) {
          // Endpunkt nicht gefunden: über die gemeldete Länge des Stücks zuordnen und als ungenau markieren
          ungenau = true; j = from;
          const want = iDist >= 0 ? +r[iDist] : 0; let acc = 0;
          while (j < coords.length - 1 && acc < want - 0.5) { acc += RT.hav(coords[j][0], coords[j][1], coords[j + 1][0], coords[j + 1][1]); j++; }
        }
        if (j > from || edges.length === 0) {
          edges.push({ i0: from, i1: Math.max(j, from), tags: RT.parseTags(r[iWay]), nodeTags: iNode >= 0 ? RT.parseTags(r[iNode]) : {}, dist: iDist >= 0 ? +r[iDist] : null, ungenau });
          from = Math.max(j, from);
        }
        search = j + 1;
      }
      if (from < coords.length - 1) {             // Rest ohne eigene Meldung: Merkmale unbekannt (nicht raten)
        edges.push({ i0: from, i1: coords.length - 1, tags: {}, nodeTags: {}, dist: null, ohne_meldung: true });
      }
    } else {
      edges.push({ i0: 0, i1: coords.length - 1, tags: {}, nodeTags: {}, dist: null, ohne_meldung: true });
    }
    return { coords, edges, props: { creator: P.creator || "BRouter", trackLength: +P["track-length"] || null, ascend: +P["filtered ascend"] || null, time: +P["total-time"] || null, name: P.name || "" } };
  };

  /* ---------------- Kategorien: Belag, Wegart, Zugang ---------------- */
  RT.SURFACE = {
    asphalt: { label: "Asphalt", color: "var(--rp-belag-asphalt)" },
    pflaster: { label: "Pflaster", color: "var(--rp-belag-pflaster)" },
    hart: { label: "Anderer Hartbelag (Beton, Holz, Metall)", color: "var(--rp-belag-hart)" },
    kies: { label: "Kies/Schotter", color: "var(--rp-belag-kies)" },
    unbefestigt: { label: "Unbefestigt (ohne Angabe)", color: "var(--rp-belag-unbefestigt)" },
    natur: { label: "Naturweg", color: "var(--rp-belag-natur)" },
    schnee: { label: "Schnee (Skitourenroute)", color: "var(--rp-belag-schnee)" },
    hand: { label: "Von Hand (kein Wegnetz)", color: "var(--rp-belag-hand)" },
    unbekannt: { label: "Unbekannt", color: "var(--rp-belag-unbekannt)" },
  };
  const SURF_MAP = {
    asphalt: "asphalt", "chipseal": "asphalt",
    concrete: "hart", "concrete:plates": "hart", "concrete:lanes": "hart", metal: "hart", wood: "hart", paved: "hart",
    // belag-1.1: Pflaster getrennt (Pflastersteine, Kopfstein, Klinker, Rasengitter) – kein Gravel, beim Rennrad erlaubt
    paving_stones: "pflaster", sett: "pflaster", cobblestone: "pflaster", unhewn_cobblestone: "pflaster", bricks: "pflaster", grass_paver: "pflaster",
    gravel: "kies", fine_gravel: "kies", compacted: "kies", pebblestone: "kies",
    unpaved: "unbefestigt",
    ground: "natur", dirt: "natur", earth: "natur", grass: "natur", mud: "natur", sand: "natur", clay: "natur", rock: "natur", stone: "natur", woodchips: "natur", snow: "natur", ice: "natur",
  };
  RT.surfaceCat = (tags) => (tags && tags.surface ? SURF_MAP[tags.surface] || "unbekannt" : "unbekannt");
  RT.WAY = {
    hauptstrasse: { label: "Hauptstrasse", color: "var(--rp-weg-hauptstrasse)" },
    strasse: { label: "Verbindungsstrasse", color: "var(--rp-weg-strasse)" },
    nebenstrasse: { label: "Nebenstrasse", color: "var(--rp-weg-nebenstrasse)" },
    radweg: { label: "Radweg", color: "var(--rp-weg-radweg)" },
    fahrweg: { label: "Feld-/Forstweg", color: "var(--rp-weg-fahrweg)" },
    pfad: { label: "Pfad/Wanderweg", color: "var(--rp-weg-pfad)" },
    fussweg: { label: "Fussweg/Treppe", color: "var(--rp-weg-fussweg)" },
    faehre: { label: "Fähre", color: "var(--rp-weg-faehre)" },
    autobahn: { label: "Autobahn", color: "var(--rp-weg-autobahn)" },
    skiroute: { label: "Skitourenroute (swisstopo/SAC)", color: "var(--rp-weg-skiroute)" },
    hand: { label: "Von Hand gezeichnet", color: "var(--rp-weg-hand)" },
    unbekannt: { label: "Unbekannt", color: "var(--rp-weg-unbekannt)" },
  };
  RT.wayCat = function (t) {
    const h = t && t.highway;
    if (t && t.route === "ferry") return "faehre";
    if (!h) return "unbekannt";
    if (/^motorway/.test(h)) return "autobahn";
    if (/^(trunk|primary)/.test(h)) return "hauptstrasse";
    if (/^(secondary|tertiary)/.test(h)) return "strasse";
    if (/^(unclassified|residential|living_street|service|road|busway)$/.test(h)) return "nebenstrasse";
    if (h === "cycleway" || ((h === "path" || h === "footway") && t.bicycle === "designated")) return "radweg";
    if (h === "track") return "fahrweg";
    if (h === "path" || h === "bridleway") return "pfad";
    if (/^(footway|pedestrian|steps|corridor|platform)$/.test(h)) return "fussweg";
    return "unbekannt";
  };
  const YES = /^(yes|designated|permissive|official)$/;
  const LIMITED = /^(destination|delivery|agricultural|forestry|customers|agricultural;forestry|forestry;agricultural|permit|discouraged)$/;
  /** Zugang je Abschnitt für «rad» oder «fuss»: ok | schieben | eingeschraenkt | unklar | verboten (+ Grund). */
  RT.access = function (t, art) {
    t = t || {};
    const h = t.highway || "";
    if (art === "rad") {
      if (/^motorway/.test(h) || t.motorroad === "yes") return { s: "verboten", g: "Autobahn/Autostrasse" };
      if (t.bicycle === "dismount") return { s: "schieben", g: "bicycle=dismount (absteigen)" };
      if (t.bicycle === "no" || t.bicycle === "use_sidepath") return t.foot === "no" ? { s: "verboten", g: `bicycle=${t.bicycle}` } : { s: "schieben", g: `bicycle=${t.bicycle}: Velo nicht erlaubt, schieben` };
      if ((t.access === "no" || t.access === "private") && !YES.test(t.bicycle || "")) return { s: "verboten", g: `access=${t.access}` };
      if (/^(footway|pedestrian|steps|corridor)$/.test(h) && !YES.test(t.bicycle || "")) return { s: "schieben", g: `highway=${h} ohne Velofreigabe` };
      if (LIMITED.test(t.bicycle || "") || (LIMITED.test(t.access || "") && !YES.test(t.bicycle || "")) || (LIMITED.test(t.vehicle || "") && !YES.test(t.bicycle || "")))
        return { s: "eingeschraenkt", g: `eingeschränkt (${t.bicycle || t.vehicle || t.access}) – Signalisation beachten` };
      if ((h === "path" || h === "bridleway") && !t.bicycle) return { s: "unklar", g: "Weg ohne Velo-Angabe: kantonale Regel und Signalisation prüfen" };
      return { s: "ok", g: "" };
    }
    if (t.foot === "no" || t.foot === "use_sidepath") return { s: "verboten", g: `foot=${t.foot}` };
    if ((t.access === "no" || t.access === "private") && !YES.test(t.foot || "")) return { s: "verboten", g: `access=${t.access}` };
    if (/^motorway|^trunk/.test(h) && !YES.test(t.foot || "")) return { s: "verboten", g: `highway=${h}` };
    if (LIMITED.test(t.foot || "") || (LIMITED.test(t.access || "") && !YES.test(t.foot || ""))) return { s: "eingeschraenkt", g: `eingeschränkt (${t.foot || t.access})` };
    return { s: "ok", g: "" };
  };
  RT.ACCESS = {
    ok: { label: "Erlaubt laut OSM", color: "var(--rp-zugang-ok)" },
    unklar: { label: "Zugang unklar", color: "var(--rp-zugang-unklar)" },
    eingeschraenkt: { label: "Eingeschränkt", color: "var(--rp-zugang-eingeschraenkt)" },
    schieben: { label: "Schieben", color: "var(--rp-zugang-schieben)" },
    verboten: { label: "Nicht erlaubt", color: "var(--rp-zugang-verboten)" },
    ungeprueft: { label: "Nicht geprüft (ohne Wegnetz)", color: "var(--rp-zugang-ungeprueft)" },
  };
  /** Was «Zugang» bedeutet (Anzeige im Planer). */
  RT.ZUGANG_TEXT = "Zugang = ob du laut OpenStreetMap hier fahren bzw. gehen darfst: erlaubt; eingeschränkt (z. B. «Zubringerdienst gestattet», Land- und Forstwirtschaft); schieben (Velo verboten, zu Fuss erlaubt); nicht erlaubt (privat, Fahrverbot, Autostrasse); unklar (Weg ohne Velo-Angabe, kantonale Regel und Signalisation prüfen). Vor Ort gilt die Signalisation.";
  RT.SAC = { hiking: "T1", mountain_hiking: "T2", demanding_mountain_hiking: "T3", alpine_hiking: "T4", demanding_alpine_hiking: "T5", difficult_alpine_hiking: "T6" };

  /* ---------------- Route aus Abschnitten ---------------- */
  /** legs: Ergebnis von parseBRouter je Abschnitt; vias: angeforderte Punkte [[lon,lat],…] (Länge = legs + 1). */
  RT.buildRoute = function (legs, vias, meta) {
    meta = meta || {};
    const lon = [], lat = [], ele = [], d = [], segs = [], legInfo = [];
    let gapMax = 0;
    legs.forEach((leg, li) => {
      const off0 = lon.length;
      let skip = 0;
      if (off0 > 0) {
        const c = leg.coords[0], gap = RT.hav(lon[off0 - 1], lat[off0 - 1], c[0], c[1]);
        gapMax = Math.max(gapMax, gap);
        if (gap < 0.5) skip = 1;                  // gleicher Punkt am Zwischenziel: nicht doppelt
      }
      for (let i = skip; i < leg.coords.length; i++) {
        const c = leg.coords[i], n = lon.length;
        d.push(n ? d[n - 1] + RT.hav(lon[n - 1], lat[n - 1], c[0], c[1]) : 0);
        lon.push(c[0]); lat.push(c[1]); ele.push(c[2]);
      }
      const base = off0 - skip;
      for (const e of leg.edges) {
        const i0 = Math.max(off0 > 0 ? off0 - 1 : 0, base + e.i0), i1 = base + e.i1;
        if (i1 <= i0) continue;
        segs.push({ id: segs.length, leg: li, i0, i1, d0: 0, d1: 0, tags: e.tags || {}, nodeTags: e.nodeTags || {}, ohne_meldung: !!e.ohne_meldung,
          quelle: e.quelle || leg.quelle || "osm", info: e.info || null });
      }
      legInfo.push({ i0: Math.max(0, base), i1: lon.length - 1, props: leg.props, url: leg.url || "" });
    });
    for (const s of segs) { s.d0 = d[s.i0]; s.d1 = d[s.i1]; }
    const art = meta.sport && RT.SPORTS[meta.sport] ? RT.SPORTS[meta.sport].art : "rad";
    for (const s of segs) {
      if (s.quelle === "hand" || s.quelle === "ski") {          // hand-1.0 / skiroute-1.0: ohne OSM-Merkmale, nicht geraten
        const ski = s.quelle === "ski";
        s.surface = ski ? "schnee" : "hand"; s.way = ski ? "skiroute" : "hand"; s.access = "ungeprueft";
        s.accessNote = ski ? "Skitourenroute: Verhältnisse, Wildruhezonen und Signalisation vor Ort beachten" : "von Hand gezeichnet: Zugang und Gelände nicht geprüft";
        s.sac = null; s.mtb = null; s.smooth = null; s.reverse = false;
        continue;
      }
      s.surface = RT.surfaceCat(s.tags); s.way = RT.wayCat(s.tags);
      const a = RT.access(s.tags, art === "rad" ? "rad" : "fuss"); s.access = a.s; s.accessNote = a.g;
      s.sac = s.tags.sac_scale ? RT.SAC[s.tags.sac_scale] || null : null;
      s.mtb = s.tags["mtb:scale"] != null ? "S" + String(s.tags["mtb:scale"]).replace(/[+-]$/, "") : null;
      s.smooth = s.tags.smoothness || null;
      s.reverse = s.tags.reversedirection === "yes";
    }
    const L = d.length ? d[d.length - 1] : 0;
    const viaD = [0].concat(legInfo.map((l) => d[l.i1]));
    // Abstand gewünschter Punkt ↔ Punkt am Wegnetz (BRouter schiebt Punkte auf den nächsten erlaubten Weg, auch weit weg)
    const snapJ = (vias || []).map((p, i) => (i === 0 ? 0 : legInfo[Math.min(i - 1, legInfo.length - 1)] ? legInfo[Math.min(i - 1, legInfo.length - 1)].i1 : lon.length - 1));
    const snap = (vias || []).map((p, i) => (lon.length ? RT.hav(p[0], p[1], lon[snapJ[i]], lat[snapJ[i]]) : null));
    const route = {
      v: RT.VERSIONS.route, id: meta.id || "r" + Date.now().toString(36), sport: meta.sport || null, engine: meta.engine || null,
      lon, lat, ele, d, L, segs, legs: legInfo,
      vias: (vias || []).map((p, i) => ({ lon: p[0], lat: p[1], d: viaD[Math.min(i, viaD.length - 1)], snap_m: snap[i], weg: lon.length ? [lon[snapJ[i]], lat[snapJ[i]]] : null })),
      snapMax: Math.max(0, ...snap.filter((x) => x != null)),
      gapMax, unvollstaendig: gapMax > 25, created: meta.created || new Date().toISOString(),
      prov: Object.assign({ routing: legs[0] ? legs[0].props.creator : "", osm: "© OpenStreetMap-Mitwirkende (ODbL)" }, meta.prov || {}),
    };
    // Herkunft je Meter (route-1.1): Wegnetz (OSM über BRouter), Skitourenroute (swisstopo/SAC) oder von Hand
    const quellen = { osm: 0, ski: 0, hand: 0 };
    for (const s of segs) quellen[s.quelle] = (quellen[s.quelle] || 0) + (s.d1 - s.d0);
    route.quellen = quellen;
    route.gezeichnet = L > 0 && quellen.osm < 0.5;
    route.profile = RT.profile(route);
    return route;
  };

  /** Freihand-Linie (Skitour): ausdrücklich gezeichnet, ohne Wegnetz. */
  RT.buildDrawn = function (pts, eles, meta) {
    const leg = { coords: pts.map((p, i) => [p[0], p[1], eles && isNum(eles[i]) ? eles[i] : null]), edges: [{ i0: 0, i1: pts.length - 1, tags: {}, nodeTags: {}, ohne_meldung: true, quelle: "hand" }], props: { creator: "von Hand gezeichnet" }, quelle: "hand" };
    const r = RT.buildRoute([leg], [pts[0], pts[pts.length - 1]], Object.assign({}, meta, { prov: { routing: "von Hand gezeichnet (kein Routing)" } }));
    r.gezeichnet = true;
    return r;
  };

  /* ---------------- Höhe: Abtastung, Glättung, Auf-/Abstieg (hoehe-1.0) ----------------
   * Höhen der Routing-Antwort (BRouter: SRTM-Höhenmodell an den OSM-Knoten) linear auf 20 m neu abgetastet,
   * gleitendes Mittel über 5 Punkte (100 m), Auf-/Abstieg mit 3-m-Hysterese. GPS-Höhen werden nicht verwendet. */
  RT.STEP = 20;
  RT.profile = function (route, step) {
    step = step || RT.STEP;
    const { d, lon, lat, ele, L } = route;
    const n = Math.max(1, Math.ceil(L / step));
    const P = { step, n, d: new Float64Array(n + 1), lon: new Float64Array(n + 1), lat: new Float64Array(n + 1), raw: new Float64Array(n + 1), ele: new Float64Array(n + 1),
      seg: new Int32Array(n), grade: new Float64Array(n), head: new Float64Array(n), radius: new Float64Array(n + 1), eleOk: true };
    // vorhandene Höhen auffüllen (fehlende linear zwischen bekannten Knoten), Anteil fehlender Werte merken
    const known = ele.map((e) => isNum(e));
    const nk = known.filter(Boolean).length;
    P.eleOk = nk >= Math.max(2, ele.length * 0.8);
    let j = 0, si = 0;
    const segOf = (dd) => { while (si < route.segs.length - 1 && route.segs[si].d1 <= dd) si++; return si; };
    const eAt = (k, t) => {
      const a = ele[k], b = ele[Math.min(k + 1, ele.length - 1)];
      if (isNum(a) && isNum(b)) return a + (b - a) * t;
      return isNum(a) ? a : isNum(b) ? b : null;
    };
    for (let k = 0; k <= n; k++) {
      const dd = Math.min(k * step, L);
      while (j < d.length - 2 && d[j + 1] < dd) j++;
      const span = d[j + 1] - d[j] || 1, t = Math.max(0, Math.min(1, (dd - d[j]) / span));
      P.d[k] = dd; P.lon[k] = lon[j] + (lon[j + 1] - lon[j]) * t; P.lat[k] = lat[j] + (lat[j + 1] - lat[j]) * t;
      const e = eAt(j, t); P.raw[k] = e == null ? NaN : e;
    }
    // Lücken in der Höhe füllen (vor/zurück), damit Glättung nicht abbricht
    let last = NaN;
    for (let k = 0; k <= n; k++) { if (isNum(P.raw[k])) last = P.raw[k]; else if (isNum(last)) P.raw[k] = last; }
    last = NaN;
    for (let k = n; k >= 0; k--) { if (isNum(P.raw[k])) last = P.raw[k]; else if (isNum(last)) P.raw[k] = last; else P.raw[k] = 0; }
    const W = 2;
    for (let k = 0; k <= n; k++) {
      let s = 0, c = 0;
      for (let q = Math.max(0, k - W); q <= Math.min(n, k + W); q++) { s += P.raw[q]; c++; }
      P.ele[k] = s / c;
    }
    for (let k = 0; k < n; k++) {
      const ds = P.d[k + 1] - P.d[k] || step;
      P.grade[k] = (P.ele[k + 1] - P.ele[k]) / ds;
      P.head[k] = RT.bearing(P.lon[k], P.lat[k], P.lon[k + 1], P.lat[k + 1]);
      P.seg[k] = route.segs.length ? segOf((P.d[k] + P.d[k + 1]) / 2) : -1;
    }
    // Kurvenradius aus drei Punkten im Abstand von 20 m (Umkreis), für die Kurvenbegrenzung bergab
    const xy = (k) => [P.lon[k] * Math.cos(P.lat[k] * RAD) * 111320, P.lat[k] * 110540];
    for (let k = 0; k <= n; k++) {
      if (k === 0 || k === n) { P.radius[k] = Infinity; continue; }
      const [ax, ay] = xy(k - 1), [bx, by] = xy(k), [cx, cy] = xy(k + 1);
      const ab = Math.hypot(bx - ax, by - ay), bc = Math.hypot(cx - bx, cy - by), ca = Math.hypot(ax - cx, ay - cy);
      const area2 = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
      P.radius[k] = area2 < 1e-6 ? Infinity : (ab * bc * ca) / (2 * area2);
    }
    let up = 0, dn = 0, ref = P.ele[0];
    for (let k = 1; k <= n; k++) { const v = P.ele[k]; if (v - ref >= 3) { up += v - ref; ref = v; } else if (ref - v >= 3) { dn += ref - v; ref = v; } }
    P.up = up; P.down = dn;
    P.min = Math.min(...P.ele); P.max = Math.max(...P.ele);
    return P;
  };

  /* ---------------- Position auf der Route ---------------- */
  /** Kettenmass → Koordinate, Höhe (geglättet), Steigung, Abschnitt. Interpolation entlang der echten Linie. */
  RT.at = function (route, dd) {
    const { d, lon, lat } = route, P = route.profile;
    dd = Math.max(0, Math.min(route.L, dd));
    let lo = 0, hi = d.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= dd) lo = m; else hi = m; }
    const span = d[hi] - d[lo] || 1, t = Math.max(0, Math.min(1, (dd - d[lo]) / span));
    const k = Math.min(P.n - 1, Math.max(0, Math.floor(dd / P.step)));
    const tk = Math.max(0, Math.min(1, (dd - P.d[k]) / ((P.d[k + 1] - P.d[k]) || 1)));
    let s = 0; const segs = route.segs;
    if (segs.length) { let a = 0, b = segs.length - 1; while (a < b) { const m = (a + b) >> 1; if (segs[m].d1 < dd) a = m + 1; else b = m; } s = a; }
    return { d: dd, lon: lon[lo] + (lon[hi] - lon[lo]) * t, lat: lat[lo] + (lat[hi] - lat[lo]) * t, i: lo, t,
      ele: P.ele[k] + (P.ele[k + 1] - P.ele[k]) * tk, grade: P.grade[k], k, seg: segs[s] || null };
  };
  /** Geo-Punkt auf die nächstgelegene Stelle der Linie projizieren (nicht auf den nächsten Wegpunkt).
   *  opt.near_d: bei mehreren fast gleich nahen Stellen (Hin- und Rückweg) die zum bisherigen Cursor nächste. */
  RT.project = function (route, plon, plat, opt) {
    opt = opt || {};
    const { lon, lat, d } = route, cosl = Math.cos(plat * RAD);
    const X = (i) => (lon[i] - plon) * cosl * 111320, Y = (i) => (lat[i] - plat) * 110540;
    const cands = [];
    let best = null;
    for (let i = 0; i < lon.length - 1; i++) {
      const ax = X(i), ay = Y(i), bx = X(i + 1), by = Y(i + 1);
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      let t = l2 > 0 ? -(ax * vx + ay * vy) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const px = ax + vx * t, py = ay + vy * t, dist = Math.hypot(px, py);
      const c = { i, t, dist, d: d[i] + (d[i + 1] - d[i]) * t };
      if (!best || dist < best.dist) best = c;
      if (opt.near_d != null && dist < (opt.tol_m || 30)) cands.push(c);
    }
    if (best && opt.near_d != null && cands.length > 1) {
      const pool = cands.filter((c) => c.dist <= best.dist + 5);
      pool.sort((a, b) => Math.abs(a.d - opt.near_d) - Math.abs(b.d - opt.near_d));
      return pool[0];
    }
    return best;
  };
  /** Teilstück der Linie zwischen zwei Kettenmassen als Koordinatenliste. */
  RT.slice = function (route, d0, d1) {
    if (d1 < d0) [d0, d1] = [d1, d0];
    const a = RT.at(route, d0), b = RT.at(route, d1), out = [[a.lon, a.lat]];
    for (let i = a.i + 1; i <= b.i; i++) out.push([route.lon[i], route.lat[i]]);
    out.push([b.lon, b.lat]);
    return out;
  };

  /* ---------------- Anstiege und Abfahrten (anstiege-1.0) ----------------
   * Auf der geglätteten 20-m-Höhe: Wendepunkte mit 15-m-Hysterese, Anstieg = Tal→Gipfel mit ≥ 25 Hm und ≥ 2,5 % im Mittel,
   * flache Anläufe (< 1 Hm je 100 m) an Anfang und Ende abgeschnitten. Maximalsteigung über 100 m nur, wenn die
   * Höhenpunkte der Route im Anstieg höchstens 60 m auseinanderliegen und der Anstieg ≥ 300 m lang ist. */
  RT.climbs = function (route, opt) {
    opt = Object.assign({ hyst: 15, minGain: 25, minGrade: 0.025 }, opt || {});
    const P = route.profile, e = P.ele, n = P.n, H = opt.hyst;
    // Zickzack-Filter: Wendepunkt erst bestätigt, wenn das Profil um ≥ H Meter umkehrt
    const ext = [0];
    let trend = 0, minK = 0, maxK = 0, cand = 0;
    for (let k = 1; k <= n; k++) {
      const v = e[k];
      if (trend === 0) {
        if (v < e[minK]) minK = k;
        if (v > e[maxK]) maxK = k;
        if (v - e[minK] >= H) { if (minK > 0) ext.push(minK); trend = 1; cand = k; }
        else if (e[maxK] - v >= H) { if (maxK > 0) ext.push(maxK); trend = -1; cand = k; }
      } else if (trend === 1) {
        if (v >= e[cand]) cand = k;
        else if (e[cand] - v >= H) { ext.push(cand); trend = -1; cand = k; }
      } else {
        if (v <= e[cand]) cand = k;
        else if (v - e[cand] >= H) { ext.push(cand); trend = 1; cand = k; }
      }
    }
    if (trend !== 0 && cand !== ext[ext.length - 1]) ext.push(cand);
    if (ext[ext.length - 1] !== n) ext.push(n);
    for (let q = 0; q < ext.length; q++) ext[q] = { k: ext[q], v: e[ext[q]] };
    // Original-Punktdichte für die Auflösungsprüfung
    const nodeGap = (d0, d1) => {
      let mx = 0, prev = null;
      for (let i = 0; i < route.d.length; i++) { const dd = route.d[i]; if (dd < d0) { prev = dd; continue; } if (dd > d1) { if (prev != null) mx = Math.max(mx, dd - prev); break; } if (prev != null) mx = Math.max(mx, dd - prev); prev = dd; }
      return mx;
    };
    const out = { up: [], down: [] };
    for (let q = 0; q < ext.length - 1; q++) {
      let a = ext[q].k, b = ext[q + 1].k;
      if (b <= a) continue;
      const rising = e[b] > e[a];
      const sgn = rising ? 1 : -1;
      const win = Math.max(1, Math.round(100 / P.step));
      // Ränder an die erste Ankunft auf der End- bzw. die letzte Stelle auf der Anfangshöhe legen:
      // Plateaus und kleine Wellen am Rand zählen nicht zum Anstieg (Toleranz 15 % der Hysterese, mind. 1 m,
      // weil die Glättung Täler leicht anhebt und Kuppen absenkt)
      const tol = Math.max(1, 0.15 * H);
      { let k = a; while (k < b && sgn * (e[b] - e[k]) > tol) k++; b = Math.max(a + 1, k); }
      { let k = b; while (k > a && sgn * (e[k] - e[a]) > tol) k--; a = Math.min(b - 1, k); }
      while (a < b - win && sgn * (e[a + win] - e[a]) < 1) a++;
      while (b > a + win && sgn * (e[b] - e[b - win]) < 1) b--;
      const gain = sgn * (e[b] - e[a]), len = P.d[b] - P.d[a];
      if (gain < opt.minGain || len <= 0 || gain / len < opt.minGrade) continue;
      let mx = null;
      const fine = nodeGap(P.d[a], P.d[b]) <= 60 && len >= 300;
      if (fine) { mx = 0; for (let k = a; k + win <= b; k++) mx = Math.max(mx, sgn * (e[k + win] - e[k]) / (P.d[k + win] - P.d[k])); }
      let hm = 0, ref = e[a];
      for (let k = a + 1; k <= b; k++) { const v = e[k]; if (sgn * (v - ref) >= 1) { hm += sgn * (v - ref); ref = v; } else if (sgn * (ref - v) >= 1) ref = v; }
      const c = { id: (rising ? "a" : "b") + out[rising ? "up" : "down"].length, d0: P.d[a], d1: P.d[b], len, hm: Math.round(hm), netto: Math.round(gain),
        mittel: gain / len, max: mx, max_grund: fine ? "über 100 m" : "Datenauflösung zu grob für Maximalsteigung", e0: e[a], e1: e[b] };
      out[rising ? "up" : "down"].push(c);
    }
    return out;
  };

  /* ---------------- Kategorienstücke je Analyseansicht ---------------- */
  RT.GRADE_BINS = [
    { k: "g_m8", label: "Gefälle über 8 %", lo: -Infinity, hi: -0.08, color: "var(--rp-steig-m8)" },
    { k: "g_m4", label: "Gefälle 4–8 %", lo: -0.08, hi: -0.04, color: "var(--rp-steig-m4)" },
    { k: "g_0", label: "flach (±4 %)", lo: -0.04, hi: 0.04, color: "var(--rp-steig-0)" },
    { k: "g_4", label: "Steigung 4–8 %", lo: 0.04, hi: 0.08, color: "var(--rp-steig-4)" },
    { k: "g_8", label: "Steigung 8–12 %", lo: 0.08, hi: 0.12, color: "var(--rp-steig-8)" },
    { k: "g_12", label: "Rampe über 12 %", lo: 0.12, hi: Infinity, color: "var(--rp-steig-12)" },
  ];
  RT.gradeBin = (g) => (RT.GRADE_BINS.find((b) => g >= b.lo && g < b.hi) || RT.GRADE_BINS[2]).k;
  /** Stücke [{id, d0, d1, cat}] einer Kategorisierung. catOfStep(k) für 20-m-Schritte, oder je Abschnitt (Belag/Wegart). */
  RT.pieces = function (route, tab, catOfStep) {
    const out = [];
    const push = (d0, d1, cat) => {
      const last = out[out.length - 1];
      if (last && last.cat === cat && Math.abs(last.d1 - d0) < 0.01) last.d1 = d1;
      else out.push({ id: tab + ":" + out.length, d0, d1, cat });
    };
    if (tab === "belag" || tab === "wegart" || tab === "zugang" || tab === "sac") {
      const f = tab === "belag" ? (s) => s.surface : tab === "wegart" ? (s) => s.way : tab === "zugang" ? (s) => s.access : (s) => s.sac || s.mtb || "unbekannt";
      if (!route.segs.length) push(0, route.L, "unbekannt");
      let prevEnd = 0;
      for (const s of route.segs) { if (s.d0 > prevEnd + 0.01) push(prevEnd, s.d0, "unbekannt"); push(s.d0, s.d1, f(s)); prevEnd = s.d1; }
      if (prevEnd < route.L - 0.01) push(prevEnd, route.L, "unbekannt");
    } else {
      const P = route.profile;
      for (let k = 0; k < P.n; k++) push(P.d[k], P.d[k + 1], catOfStep(k));
    }
    out.forEach((p, i) => (p.id = tab + ":" + i));
    return out;
  };
  RT.stats = function (pieces, L) {
    const m = new Map();
    for (const p of pieces) m.set(p.cat, (m.get(p.cat) || 0) + (p.d1 - p.d0));
    return [...m.entries()].map(([cat, len]) => ({ cat, len, pct: L > 0 ? (len / L) * 100 : 0 })).sort((a, b) => b.len - a.len);
  };

  /* ---------------- Tempo-Modelle (zeit-rt-1.0) ---------------- */
  RT.RAD = {   // Annahmen, nicht kalibriert: Rollwiderstand je Belag (Quelle: veröffentlichte Rollwiderstandsmessungen, gerundet), Abfahrtsgrenzen km/h
    rennrad: { kg: 8.5, cda: 0.30, crr: { asphalt: 0.0040, pflaster: 0.0080, hart: 0.0060, kies: 0.0120, unbefestigt: 0.0120, natur: 0.0200, unbekannt: 0.0050 }, vmax: { asphalt: 60, pflaster: 35, hart: 40, kies: 30, unbefestigt: 30, natur: 20, unbekannt: 45 }, alat: 3.5 },
    gravel: { kg: 10, cda: 0.36, crr: { asphalt: 0.0050, pflaster: 0.0080, hart: 0.0065, kies: 0.0090, unbefestigt: 0.0100, natur: 0.0140, unbekannt: 0.0070 }, vmax: { asphalt: 55, pflaster: 35, hart: 40, kies: 40, unbefestigt: 35, natur: 25, unbekannt: 40 }, alat: 3.0 },
    mtb: { kg: 13, cda: 0.42, crr: { asphalt: 0.0070, pflaster: 0.0090, hart: 0.0080, kies: 0.0100, unbefestigt: 0.0110, natur: 0.0140, unbekannt: 0.0100 }, vmax: { asphalt: 50, pflaster: 35, hart: 35, kies: 40, unbefestigt: 35, natur: 30, unbekannt: 35 }, alat: 3.0 },
  };
  RT.WIND_HEIGHT = 0.6;     // 10-m-Wind auf Fahrhöhe (logarithmisches Profil, Rauigkeit ~0,1 m): Faktor ≈ 0,6
  /** Minetti et al. (2002): Energiekosten Laufen J/(kg·m) je Steigung i (Bruch), gültig −0,45…0,45. */
  RT.minetti = function (i) { i = Math.max(-0.45, Math.min(0.45, i)); return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6; };
  /** Tobler (1993): Gehtempo km/h je Steigung (Bruch). */
  RT.tobler = (g) => 6 * Math.exp(-3.5 * Math.abs(g + 0.05));

  /** Zeit je 20-m-Schritt. inp: {mode, value, start_unix, pause_share, wetter (fn), kal (Kalibrierung), rad: {m, cda}}.
   *  Ergebnis: {t[] (s ab Start an jedem Stützpunkt), v[] (m/s je Schritt), moving_s, info, unzureichend?} */
  RT.simulate = function (route, inp) {
    const S = RT.SPORTS[route.sport] || RT.SPORTS.rennrad, P = route.profile, n = P.n;
    const t = new Float64Array(n + 1), v = new Float64Array(n), wAlong = new Float64Array(n), cap = new Uint8Array(n), wUnk = new Uint8Array(n);
    const luecke = { wind_m: 0, temp_m: 0, regen_m: 0 };
    const info = { modell: "", hinweise: [] };
    const segAt = (k) => (P.seg[k] >= 0 ? route.segs[P.seg[k]] : null);
    const wx = inp.wetter || null;
    if (S.art === "rad") {
      const B = RT.RAD[S.rad] || RT.RAD.rennrad;
      const m = (inp.rad && inp.rad.m) || 75 + B.kg, cda = (inp.rad && inp.rad.cda) || B.cda;
      let P0 = inp.value;
      if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.rad_hf_w;
        if (!k || !k.ok) return { unzureichend: true, grund: "Keine ausreichende persönliche Kalibrierung HF → Watt (konstante 10-min-Blöcke).", info };
        P0 = k.a + k.b * inp.value;
        info.modell = `HF ${Math.round(inp.value)} → ${Math.round(P0)} W (persönliche Kalibrierung, Hold-out-Fehler ±${Math.round(k.mae)} W)`;
      } else info.modell = `${Math.round(P0)} W konstant, bergab rollen ab −2 %`;
      info.P = P0;
      // zeit-rt-1.3: Workout-Verlauf (inp.plan: Bewegungszeit s → Watt bzw. Puls je Schritt); ohne Wert gilt der Grundwert
      const kh = inp.kal && inp.kal.rad_hf_w;
      const planW = typeof inp.plan === "function" ? (tt) => { const x = inp.plan(tt); return isNum(x) ? (inp.mode === "hf" ? kh.a + kh.b * x : x) : null; } : null;
      if (planW) { info.planW = planW; info.modell += " · Leistung je Workout-Schritt"; }
      // empirische Korrektur aus echten Fahrten (Median Physik/Ist, kalibrierung-1.0), abschaltbar
      const kr = inp.kal && inp.kal.rad_modell && inp.kal.rad_modell[S.rad === "rennrad" ? "rennrad" : "mtb"];
      const corr = kr && kr.ok && inp.korrektur !== false ? 1 / kr.faktor : 1;
      if (corr !== 1) info.korrektur = { faktor: corr, n: kr.n, text: `Korrektur ×${corr.toFixed(2)} aus ${kr.n} echten Fahrten (${S.rad === "rennrad" ? "Rennrad" : "MTB/Gravel"})` };
      let schieb = false;
      for (let k = 0; k < n; k++) {
        const s = segAt(k), surf = s ? s.surface : "unbekannt", g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        const w = wx ? wx(k, t[k]) : null;
        const windOk = !!w && isNum(w.along);
        if (w && !windOk) luecke.wind_m += ds;                      // zeit-rt-1.2: dort ohne Wind gerechnet, im Band ±2 m/s
        if (w && !isNum(w.temp)) luecke.temp_m += ds;               // Luftdichte dann mit 15 °C (wie ohne Prognose)
        if (w && !isNum(w.regen)) luecke.regen_m += ds;             // dann trocken gerechnet
        const along = windOk ? w.along * RT.WIND_HEIGHT : 0; wAlong[k] = along; wUnk[k] = w && !windOk ? 1 : 0;
        const wet = !!w && isNum(w.regen) && w.regen > 0.2;
        // Pacing: volle Leistung bis −2 %, linear auf 30 % bei −5 %, darunter rollen (0 W)
        const Pz = planW ? (() => { const x = planW(t[k]); return isNum(x) && x > 0 ? x : P0; })() : P0;
        const Pk = g >= -0.02 ? Pz : g <= -0.05 ? 0 : Pz * (0.3 + 0.7 * (g + 0.05) / 0.03);
        const rmin = Math.min(P.radius[k], P.radius[k + 1]);
        const vCurve = Math.sqrt((wet ? B.alat * 0.7 : B.alat) * Math.max(5, rmin));
        let vmax = Math.min((B.vmax[surf] || 40) / 3.6 * (wet ? 0.85 : 1), vCurve);
        const q = { m, cda, crr: B.crr[surf] || B.crr.unbekannt, grade: g, rho: FK.rho(w ? w.temp : 15, P.ele[k]), wind: along, eta: 0.976, vmax };
        let vk = FK.speedFromPower(Pk, q);
        if (vk >= vmax - 1e-6) cap[k] = 1;
        if (vk < 0.3) { // 0 W in der Ebene oder zu steil: Schiebetempo 1 m/s statt Stillstand
          vk = 1.0; schieb = true;
        }
        if (s && s.access === "schieben") vk = Math.min(vk, 1.2);
        vk /= corr;
        v[k] = vk; t[k + 1] = t[k] + ds / vk;
      }
      if (schieb) info.hinweise.push("Abschnitte mit sehr geringem Tempo sind als Schieben (3,6 km/h) gerechnet.");
      if (wx) {
        info.luecke = luecke;
        if (luecke.temp_m > 0) info.hinweise.push(`Temperatur auf ${(luecke.temp_m / 1000).toFixed(1)} km unbekannt: Luftdichte dort mit 15 °C gerechnet.`);
        if (luecke.regen_m > 0) info.hinweise.push(`Niederschlag auf ${(luecke.regen_m / 1000).toFixed(1)} km unbekannt: dort trocken gerechnet.`);
      }
      if (route.segs.some((s) => s.access === "schieben")) info.hinweise.push("Schiebestrecken (Velo nicht erlaubt) mit 4,3 km/h gerechnet.");
    } else if (S.art === "fuss" && route.sport !== "wandern") {
      let vflat;
      if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.lauf_hf_pace;
        if (!k || !k.ok) return { unzureichend: true, grund: "Unzureichende Daten: keine validierte persönliche Kalibrierung HF → Pace (flache, gleichmässige Laufabschnitte).", info };
        vflat = k.a + k.b * inp.value;
        info.modell = `HF ${Math.round(inp.value)} → ${FK.pace(1000 / vflat)} min/km flach (Hold-out-Fehler ±${Math.round(k.mae)} s/km)`;
      } else { vflat = 1000 / inp.value; info.modell = `Pace ${FK.pace(inp.value)} min/km flach, Steigung nach Minetti`; }
      info.vflat = vflat;
      const kp = inp.kal && inp.kal.lauf_hf_pace;
      const planV = typeof inp.plan === "function" ? (tt) => { const x = inp.plan(tt); const v = isNum(x) && x > 0 ? (inp.mode === "hf" ? kp.a + kp.b * x : 1000 / x) : null; return isNum(v) && v > 0.5 ? v : null; } : null;
      if (planV) { info.planV = planV; info.modell += " · Tempo je Workout-Schritt"; }
      const kg = inp.kal && inp.kal.lauf_gap;
      const corr = kg && kg.ok && inp.korrektur !== false ? 1 / kg.faktor : 1;
      if (corr !== 1) info.korrektur = { faktor: corr, n: kg.n, text: `Korrektur ×${corr.toFixed(2)} aus ${kg.n} echten Läufen` };
      const c0 = RT.minetti(0);
      const vamWalk = (inp.kal && inp.kal.wandern_vam && inp.kal.wandern_vam.ok ? inp.kal.wandern_vam.median : 900) / 3600;
      for (let k = 0; k < n; k++) {
        const s = segAt(k), g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        const vf = planV ? (planV(t[k]) || vflat) : vflat;
        let vk = vf * c0 / RT.minetti(g);
        const techn = s && (s.surface === "natur" || s.way === "pfad" || (s.sac && s.sac >= "T2"));
        if (g < 0) vk = Math.min(vk, vf * (s && s.sac && s.sac >= "T3" ? 1.0 : techn ? 1.1 : 1.2));
        if (g > 0.2) vk = Math.min(vk, Math.max(vamWalk / g, 0.6));       // steil: gehen (persönliche Hm/h, sonst 900 Hm/h)
        if (s && s.way === "fussweg" && s.tags.highway === "steps") vk = Math.min(vk, 1.0);
        vk /= corr;
        v[k] = vk; t[k + 1] = t[k] + ds / vk;
      }
    } else if (route.sport === "wandern") {
      let f = 1;
      const kt = inp.kal && inp.kal.wandern_tobler;
      if (inp.mode === "faktor") { f = (inp.value / 100) * (kt && kt.ok ? kt.faktor : 1); info.modell = `Tobler × ${(f).toFixed(2)}${kt && kt.ok ? " (persönlicher Faktor " + kt.faktor.toFixed(2) + ")" : " (nicht kalibriert)"}`; }
      else if (inp.mode === "hmh") info.modell = `Aufstieg ${Math.round(inp.value)} Hm/h, flach/bergab nach Tobler`;
      else if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.wandern_hf_vam;
        if (!k || !k.ok) return { unzureichend: true, grund: "Unzureichende Daten: keine validierte Kalibrierung HF → Hm/h beim Wandern.", info };
        info.modell = `HF ${Math.round(inp.value)} → ${Math.round(k.a + k.b * inp.value)} Hm/h bergauf (Hold-out-Fehler ±${Math.round(k.mae)} Hm/h)`;
      }
      const vam = inp.mode === "hmh" ? inp.value : inp.mode === "hf" ? inp.kal.wandern_hf_vam.a + inp.kal.wandern_hf_vam.b * inp.value : null;
      const fBase = kt && kt.ok ? kt.faktor : 1;
      info.faktor = inp.mode === "faktor" ? f : fBase;
      for (let k = 0; k < n; k++) {
        const s = segAt(k), g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        let vk = RT.tobler(g) / 3.6 * (inp.mode === "faktor" ? f : fBase);
        // Hm/h-Modus: bergauf bestimmt das Vertikaltempo, höchstens das eigene Flachtempo
        if (vam && g > 0.03) vk = Math.min(RT.tobler(0) / 3.6 * fBase, vam / 3600 / g);
        if (s && s.sac && s.sac >= "T4") vk *= 0.7;
        v[k] = Math.max(0.2, vk); t[k + 1] = t[k] + ds / v[k];
      }
    } else { // Skitour: nur Aufstieg berechenbar
      let vam = inp.value;
      if (inp.mode === "hf") {
        const k = inp.kal && inp.kal.skitour_hf_vam;
        if (!k || !k.ok) return { unzureichend: true, grund: "Unzureichende Daten: keine validierte Kalibrierung HF → Hm/h bei Skitouren.", info };
        vam = k.a + k.b * inp.value;
        info.modell = `HF ${Math.round(inp.value)} → ${Math.round(vam)} Hm/h (Hold-out-Fehler ±${Math.round(k.mae)} Hm/h)`;
      } else info.modell = `Aufstieg ${Math.round(vam)} Hm/h, flach 4 km/h`;
      let down = 0;
      for (let k = 0; k < n; k++) {
        const g = P.grade[k], ds = P.d[k + 1] - P.d[k];
        let vk;
        if (g >= 0.02) vk = Math.min(4 / 3.6, vam / 3600 / g + 0.0);
        else if (g > -0.05) vk = 4 / 3.6;
        else { vk = NaN; down += ds; }
        v[k] = vk; t[k + 1] = t[k] + (isNum(vk) ? ds / vk : 0);
      }
      info.abfahrt_m = down;
      if (down > 0) info.hinweise.push("Abfahrt nicht bestimmbar (Schnee, Gelände, Sicht): nicht in der Zeit enthalten.");
    }
    return { t, v, wAlong, wUnk, cap, moving_s: t[n], info };
  };

  /** Zeitband: Szenarien aus Kalibrier-/Modellfehler und (ohne Wetterprognose) Wind ±2 m/s. */
  RT.eta = function (route, inp) {
    const base = RT.simulate(route, inp);
    if (base.unzureichend) return base;
    const S = RT.SPORTS[route.sport] || RT.SPORTS.rennrad, scen = [];
    const err = RT.modelError(route.sport, inp, route);
    const variants = [];
    if (S.art === "rad") {
      const dP = inp.mode === "hf" ? (inp.kal.rad_hf_w.mae || 10) : 0;
      // Workout-Verlauf in Watt weitergeben (Szenarien rechnen im Modus Watt)
      const pw = base.info.planW, planOf = (d) => (pw ? (tt) => { const x = pw(tt); return isNum(x) ? x + d : null; } : undefined);
      if (dP) { variants.push({ ...inp, mode: "watt", value: base.info.P - dP, plan: planOf(-dP) }); variants.push({ ...inp, mode: "watt", value: base.info.P + dP, plan: planOf(dP) }); }
      if (!inp.wetter) for (const w of [-2, 2]) variants.push({ ...inp, mode: "watt", value: base.info.P, plan: planOf(0), wetter: () => ({ along: w / RT.WIND_HEIGHT, temp: 15, regen: 0 }) });
      else if (base.info.luecke && base.info.luecke.wind_m > 0) for (const w of [-2, 2]) variants.push({ ...inp, mode: "watt", value: base.info.P, plan: planOf(0),
        wetter: (k, tk) => { const x = inp.wetter(k, tk); return x && isNum(x.along) ? x : Object.assign({}, x || {}, { along: w / RT.WIND_HEIGHT }); } });
      const unk = !inp.wetter ? route.L : Math.min(route.L, (base.info.luecke && base.info.luecke.wind_m) || 0);
      base.wind = { status: !inp.wetter ? "keine Prognose" : unk >= route.L * 0.999 ? "unbekannt" : unk > 0 ? "teilweise" : "Prognose",
        unbekannt_m: unk, anteil: route.L ? unk / route.L : 0, annahme_ms: unk > 0 ? 2 : 0 };
    } else if (S.art === "fuss" && route.sport !== "wandern" && inp.mode === "hf") {
      const pace = 1000 / base.info.vflat, e = inp.kal.lauf_hf_pace.mae || 15, pv = base.info.planV;
      const planOf = (d) => (pv ? (tt) => { const v = pv(tt); return isNum(v) ? 1000 / v + d : null; } : undefined);
      variants.push({ ...inp, mode: "pace", value: pace - e, plan: planOf(-e) }, { ...inp, mode: "pace", value: pace + e, plan: planOf(e) });
    }
    for (const vInp of variants) { const r = RT.simulate(route, vInp); if (!r.unzureichend) scen.push(r.moving_s); }
    scen.push(base.moving_s * (1 - err.rel), base.moving_s * (1 + err.rel));
    base.band = [Math.min(base.moving_s, ...scen), Math.max(base.moving_s, ...scen)];
    base.fehler = err;
    return base;
  };
  /** Steigungsklasse einer Route nach Hm je km (wie tools/kalibrierung.py, kalibrierung-1.1). */
  RT.klasse = (route) => { const hk = route && route.L ? route.profile.up / (route.L / 1000) : 0; return hk < 8 ? "flach" : hk < 20 ? "wellig" : "bergig"; };
  /** Modellfehler je Sportart: aus Kalibrierung (Hold-out), sonst konservative Annahme. Rad (zeit-rt-1.1): Band aus dem
   *  80. Perzentil der Hold-out-Fahrten derselben Steigungsklasse; liegt die Route ausserhalb der geprüften Population
   *  (kürzer, steiler, flacher) oder hat die Klasse zu wenige Fahrten, wird das Band konservativ erweitert und so beschriftet. */
  RT.modelError = function (sport, inp, route) {
    const k = inp.kal || {};
    const pick = (o, def, txt) => (o && o.ok && isNum(o.mae_rel) ? { rel: o.mae_rel, quelle: `Hold-out ${o.n_test} Einheiten`, text: txt } : { rel: def, quelle: "Annahme (nicht validiert)", text: txt });
    if (sport === "rennrad" || sport === "gravel" || sport === "mtb") {
      const o = k.rad_modell && k.rad_modell[sport === "rennrad" ? "rennrad" : "mtb"];
      const base = pick(o, 0.1, "Rad-Physik gegen echte Fahrten");
      const pop = o && o.ok && o.population;
      if (!route || !pop || !pop.klassen) return base;
      const kl = RT.klasse(route), c = pop.klassen[kl] || {}, km = route.L / 1000, hk = route.profile.up / km, out = [];
      if (km < pop.km_min) out.push(`kürzer als jede geprüfte Fahrt (ab ${Math.round(pop.km_min)} km)`);
      if (hk > pop.hm_km[1] * 1.25) out.push(`steiler als 90 % der geprüften Fahrten (${Math.round(hk)} statt bis ${Math.round(pop.hm_km[1])} Hm/km)`);
      if (c.n >= 5 && isNum(c.p80_rel)) {
        const rel = out.length ? Math.max(c.p80_rel, 0.15) : c.p80_rel;
        return { rel, klasse: kl, n_klasse: c.n, ausserhalb: out, quelle: `Hold-out ${c.n} Fahrten der Klasse «${kl}», 80. Perzentil${out.length ? "; Route ausserhalb der geprüften Fahrten (" + out.join(", ") + "), daher mindestens ±15 %" : ""}`, text: base.text };
      }
      return { rel: Math.max(base.rel * 1.5, 0.15), klasse: kl, n_klasse: c.n || 0, ausserhalb: out, quelle: `nur ${c.n || 0} geprüfte Fahrten der Klasse «${kl}»: Band konservativ (Annahme, nicht validiert)${out.length ? "; " + out.join(", ") : ""}`, text: base.text };
    }
    if (sport === "laufen" || sport === "trail") return pick(k.lauf_gap, sport === "trail" ? 0.15 : 0.08, "Lauf-Modell gegen echte Läufe");
    if (sport === "wandern") return pick(k.wandern_tobler, 0.15, "Tobler × persönlicher Faktor gegen echte Wanderungen");
    return pick(k.skitour_hf_vam, 0.2, "Skitour-Aufstieg");
  };

  /* ---------------- Wetter entlang der Route (wetter-rt-1.0) ---------------- */
  /** Stützpunkte etwa alle 5 km (höchstens 25), immer Start und Ziel. */
  RT.weatherPoints = function (route, maxN) {
    maxN = maxN || 25;
    const L = route.L, step = Math.max(5000, L / (maxN - 1)), out = [];
    for (let dd = 0; dd < L; dd += step) out.push(dd);
    out.push(L);
    return out.map((dd) => { const a = RT.at(route, dd); return { d: dd, lon: +a.lon.toFixed(4), lat: +a.lat.toFixed(4), ele: Math.round(a.ele) }; });
  };
  RT.openMeteoUrl = function (pts, t0, t1) {
    const day = (u) => new Date(u * 1000).toISOString().slice(0, 10);
    return "https://api.open-meteo.com/v1/forecast?latitude=" + pts.map((p) => p.lat).join(",") + "&longitude=" + pts.map((p) => p.lon).join(",") +
      "&elevation=" + pts.map((p) => p.ele).join(",") +
      "&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT" +
      `&start_date=${day(t0 - 3600)}&end_date=${day(t1 + 3600)}`;
  };
  /** Open-Meteo-Antwort (Liste je Punkt) → Funktion (d, unix) → Wetter. Wind vektoriell (u, v) interpoliert. */
  RT.weatherField = function (pts, resp) {
    const arr = Array.isArray(resp) ? resp : [resp];
    if (arr.length !== pts.length) throw new Error("Wetterantwort passt nicht zu den Stützpunkten.");
    const series = arr.map((r) => {
      const h = r.hourly || {};
      // wetter-rt-1.2: fehlende Werte bleiben unbekannt (null), nie 0 – in JavaScript wäre null × sin(…) = 0 = «Windstille».
      const ws = h.wind_speed_10m || [], wd = h.wind_direction_10m || [];
      const spd = ws.map((x) => (isNum(x) ? x : null));
      const uv = ws.map((x, i) => {
        if (!isNum(x)) return null;                                      // Geschwindigkeit fehlt: unbekannt
        if (x === 0) return [0, 0];                                      // gemeldete Windstille: gültig, ohne Richtung
        if (!isNum(wd[i])) return null;                                  // Richtung fehlt: Gegen-/Rückenwind unbekannt
        const dirTo = ((wd[i] + 180) % 360) * RAD;                       // meteorologisch: Richtung, AUS der der Wind kommt
        return [x * Math.sin(dirTo), x * Math.cos(dirTo)];               // u = Ost-, v = Nordkomponente der Bewegung
      });
      return { time: h.time || [], temp: h.temperature_2m || [], rain: h.precipitation || [], pop: h.precipitation_probability || [], gust: h.wind_gusts_10m || [], uv, spd,
        gridEle: r.elevation, lat: r.latitude, lon: r.longitude };
    });
    const at = (s, unix) => {
      const T = s.time; if (!T.length) return null;
      if (unix <= T[0]) return { i: 0, f: 0 };
      if (unix >= T[T.length - 1]) return { i: T.length - 1, f: 0 };
      let i = 0; while (i < T.length - 2 && T[i + 1] <= unix) i++;
      return { i, f: (unix - T[i]) / (T[i + 1] - T[i]) };
    };
    const lerp = (a, b, f) => (isNum(a) && isNum(b) ? a + (b - a) * f : isNum(a) ? a : b);
    // Wind streng: fehlt ein Nachbar mit Gewicht > 0, ist der Wert unbekannt (keine Lücke wird mit dem Nachbarn gefüllt)
    const lerpS = (a, b, f) => (f <= 0 ? (isNum(a) ? a : null) : f >= 1 ? (isNum(b) ? b : null) : isNum(a) && isNum(b) ? a + (b - a) * f : null);
    const one = (s, unix) => {
      const p = at(s, unix); if (!p) return null;
      const j = Math.min(p.i + 1, s.time.length - 1);
      // Niederschlag: Summe der vorangehenden Stunde → Stunde, in der der Zeitpunkt liegt
      const iRain = Math.min(s.time.length - 1, p.f > 0 ? j : p.i);
      return { temp: lerp(s.temp[p.i], s.temp[j], p.f), regen: s.rain[iRain], pop: s.pop[iRain], gust: lerp(s.gust[p.i], s.gust[j], p.f),
        u: lerpS(s.uv[p.i] ? s.uv[p.i][0] : null, s.uv[j] ? s.uv[j][0] : null, p.f), v: lerpS(s.uv[p.i] ? s.uv[p.i][1] : null, s.uv[j] ? s.uv[j][1] : null, p.f),
        spd: lerpS(s.spd[p.i], s.spd[j], p.f) };
    };
    const field = function (dd, unix, headingDeg) {
      let a = 0; while (a < pts.length - 2 && pts[a + 1].d < dd) a++;
      const b = Math.min(a + 1, pts.length - 1), f = pts[b].d > pts[a].d ? Math.max(0, Math.min(1, (dd - pts[a].d) / (pts[b].d - pts[a].d))) : 0;
      const A = one(series[a], unix), Bv = one(series[b], unix);
      if (!A || !Bv) return null;
      const u = lerpS(A.u, Bv.u, f), v = lerpS(A.v, Bv.v, f), vec = isNum(u) && isNum(v);
      const sp = vec ? Math.hypot(u, v) : lerpS(A.spd, Bv.spd, f), still = isNum(sp) && sp < 1e-6;
      const speed = isNum(sp) ? sp : null, dirFrom = vec && !still ? (Math.atan2(u, v) / RAD + 180 + 360) % 360 : null;   // Windstille hat keine Richtung
      const out = { temp: lerp(A.temp, Bv.temp, f), regen: f < 0.5 ? A.regen : Bv.regen, pop: f < 0.5 ? A.pop : Bv.pop, gust: lerp(A.gust, Bv.gust, f), speed, dirFrom };
      if (isNum(headingDeg)) {
        const hr = headingDeg * RAD;
        out.along = vec ? u * Math.sin(hr) + v * Math.cos(hr) : still ? 0 : null;     // Richtung unbekannt: Gegen-/Rückenwind unbekannt
        out.cross = vec ? u * Math.cos(hr) - v * Math.sin(hr) : still ? 0 : null;
      }
      return out;
    };
    field.quality = pts.map((p, i) => ({ d: p.d, ele: p.ele, gridEle: series[i].gridEle, diff: isNum(series[i].gridEle) ? series[i].gridEle - p.ele : null }));
    return field;
  };
  /** Windpfeile für die Karte: zur Durchfahrtszeit; Pfeil zeigt, WOHIN der Wind weht (Herkunft + 180°). windpfeile-1.1: mit
   *  Fahrtrichtung (headAt) auch Gegen-/Rückenwind je Pfeil: «gegen» unter −5 km/h längs, «rueck» über +5 km/h, sonst «seite». */
  RT.windArrows = function (pts, field, timeAt, headAt) {
    const dirs = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"], out = [];
    for (const p of pts || []) {
      const head = typeof headAt === "function" ? headAt(p.d) : (isNum(p.head) ? p.head : null);
      const w = field(p.d, timeAt(p.d), isNum(head) ? head : undefined);
      if (!w || !isNum(w.speed) || !isNum(w.dirFrom)) continue;
      const along = isNum(head) ? (isNum(w.along) ? w.along : RT.windAlong(w.speed, w.dirFrom, head)) : null;
      const art = along == null ? "unbekannt" : along < -1.4 ? "gegen" : along > 1.4 ? "rueck" : "seite";
      out.push({ lon: p.lon, lat: p.lat, d: p.d, speed: w.speed, dirFrom: w.dirFrom, rot: (w.dirFrom + 180) % 360, aus: dirs[Math.round(w.dirFrom / 45) % 8], along, art });
    }
    return out;
  };
  /** Orte für Windpfeile: gleichmässig entlang der Route, nie auf Start/Ziel (dort liegen die Marker); 1 Pfeil je ~step_m
   *  (Standard 3 km), 3–20 (windpfeile-1.1), mit Fahrtrichtung an der Stelle. */
  RT.windPositions = function (route, step_m) {
    const n = Math.max(3, Math.min(20, Math.round(route.L / (step_m || 3000))));
    const P = route.profile;
    return Array.from({ length: n }, (_, i) => { const dd = route.L * (i + 0.5) / n, a = RT.at(route, dd); return { d: dd, lon: a.lon, lat: a.lat, head: P ? P.head[Math.min(P.n - 1, Math.max(0, a.k))] : null }; });
  };
  /** Rückenwindkomponente (m/s, positiv = Rückenwind) aus meteorologischer Richtung (woher) und Fahrtrichtung. */
  RT.windAlong = function (speed, dirFromDeg, headingDeg) { return speed * Math.cos(((dirFromDeg + 180) - headingDeg) * RAD); };

  /** Pausen an Wegpunkten (zeit-rt-1.1): [{d, s}] → Sekunden, die vor der Distanz dd schon pausiert wurden. */
  RT.pauseBefore = function (pausen, dd) { let s = 0; for (const p of pausen || []) if (isNum(p.d) && isNum(p.s) && p.s > 0 && p.d <= dd) s += p.s; return s; };
  RT.pausenSumme = (pausen) => (pausen || []).reduce((s, p) => s + (isNum(p.s) && p.s > 0 ? p.s : 0), 0);
  /** Uhrzeit (Unix) an Profilindex k: Start + Bewegungszeit + Pausen an Wegpunkten davor. */
  RT.clockAt = function (route, sim, start_unix, pausen, k) { const P = route.profile; return start_unix + sim.t[k] + RT.pauseBefore(pausen, P.d[k]); };
  /** Simulation mit Wetter: Zeit ↔ Wetter iterativ (Wetter am Ort zur geschätzten Durchfahrtszeit, Pausen an Wegpunkten eingerechnet). */
  RT.etaWithWeather = function (route, inp, field) {
    const P = route.profile;
    let res = RT.eta(route, inp);
    if (!field || res.unzureichend) return res;
    for (let it = 0; it < 3; it++) {
      const tPrev = res.t;
      const wx = (k, tk) => field((P.d[k] + P.d[k + 1]) / 2, inp.start_unix + (tPrev ? tPrev[k] : tk) + RT.pauseBefore(inp.pausen, P.d[k]), P.head[k]);
      const next = RT.eta(route, { ...inp, wetter: wx });
      const diff = Math.abs(next.moving_s - res.moving_s);
      res = next;
      if (diff < 30) break;
    }
    return res;
  };

  /* ---------------- Wegpunkte (wegpunkte-1.0) ----------------
   * Start (erster) und Ziel (letzter Punkt) bleiben fest. Ein neuer Punkt wird als Zwischenziel dort eingefügt, wo er den
   * kleinsten Umweg macht (Luftlinie: a→p→b minus a→b); die eigentliche Route rechnet danach BRouter je Abschnitt. */
  /* wegpunkte-1.1: Liegt schon eine Linie vor (route), zählt, welchem Abschnitt der Linie der neue Punkt am nächsten liegt
   * (nicht der Luftlinie zwischen den Wegpunkten): so landet ein Punkt zwischen den beiden Wegpunkten, zwischen denen er auf
   * der Route liegt, auch bei Schlaufen, Hin- und Rückweg oder kurvigen Abschnitten. Gleich nahe Abschnitte (±10 m): der mit
   * dem kleineren Umweg. Ohne Linie: kleinster Umweg wie bisher. Keine Obergrenze für die Zahl der Punkte. */
  RT.einfuegeIndex = function (vias, p, route) {
    const n = (vias || []).length;
    if (n < 2) return n;
    const umweg = (i) => { const a = vias[i - 1], b = vias[i]; return RT.hav(a[0], a[1], p[0], p[1]) + RT.hav(p[0], p[1], b[0], b[1]) - RT.hav(a[0], a[1], b[0], b[1]); };
    if (route && route.legs && route.legs.length === n - 1 && route.lon && route.lon.length > 1) {
      const cosl = Math.cos(p[1] * RAD), X = (i) => (route.lon[i] - p[0]) * cosl * 111320, Y = (i) => (route.lat[i] - p[1]) * 110540;
      const best = new Array(n - 1).fill(Infinity);
      route.legs.forEach((lg, li) => {
        for (let i = Math.max(0, lg.i0); i < Math.min(route.lon.length - 1, lg.i1); i++) {
          const ax = X(i), ay = Y(i), vx = X(i + 1) - ax, vy = Y(i + 1) - ay, l2 = vx * vx + vy * vy;
          const t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / l2)) : 0, dist = Math.hypot(ax + vx * t, ay + vy * t);
          if (dist < best[li]) best[li] = dist;
        }
      });
      const m = Math.min(...best);
      if (isFinite(m)) {
        let pick = -1, c = Infinity;
        best.forEach((b, li) => { if (b <= m + 10) { const u = umweg(li + 1); if (u < c - 1e-6) { c = u; pick = li; } } });
        if (pick >= 0) return pick + 1;
      }
    }
    let best = 1, cost = Infinity;
    for (let i = 1; i < n; i++) { const c = umweg(i); if (c < cost - 1e-6) { cost = c; best = i; } }
    return best;
  };

  /* ---------------- Gravel beim Rennrad (gravel-rt-1.0) ----------------
   * Gravel = Belag laut OSM Kies/Feinkies/Schotter («kies»), Naturweg («natur») oder «unpaved»; ohne Belagsangabe auch
   * tracktype grade2–5. Feldwege (highway=track) ganz ohne Angabe sind «unklar» (möglicherweise Gravel). Pflaster ist kein Gravel. */
  RT.GRAVEL_ARTEN = { kies: "Kies/Feinkies", natur: "Naturweg", unbefestigt: "unbefestigt", grade: "Feldweg laut tracktype", unklar: "Feldweg ohne Belagsangabe" };
  RT.gravelArt = function (s) {
    if (!s) return null;
    if (s.surface === "kies" || s.surface === "natur" || s.surface === "unbefestigt") return s.surface;
    if (s.surface === "unbekannt") {
      const t = s.tags || {}, tt = t.tracktype;
      if (tt && tt !== "grade1") return "grade";
      if (t.highway === "track" && !tt) return "unklar";
    }
    return null;
  };
  /** Zusammenhängende Gravel-Abschnitte (Lücken < mergeGap m verbunden); Abschnitte unter minLen m nur gezählt. */
  RT.gravelAbschnitte = function (route, opt) {
    opt = Object.assign({ mergeGap: 60, minLen: 15 }, opt || {});
    const out = [];
    let cur = null;
    for (const s of route.segs || []) {
      const art = RT.gravelArt(s); if (!art) continue;
      const len = s.d1 - s.d0; if (len <= 0) continue;
      if (cur && s.d0 - cur.d1 <= opt.mergeGap) { cur.d1 = Math.max(cur.d1, s.d1); }
      else { cur = { d0: s.d0, d1: s.d1, arten: {}, wege: {}, legs: [] }; out.push(cur); }
      cur.arten[art] = (cur.arten[art] || 0) + len;
      const w = s.way || "unbekannt"; cur.wege[w] = (cur.wege[w] || 0) + len;
      if (!cur.legs.includes(s.leg)) cur.legs.push(s.leg);
    }
    const lang = [], kurz = [];
    for (const a of out) {
      a.len = a.d1 - a.d0;
      a.gravel_m = Object.entries(a.arten).reduce((x, [k, v]) => x + v, 0);
      a.unklar_m = a.arten.unklar || 0;
      a.sicher = a.gravel_m - a.unklar_m > 0.5;
      (a.gravel_m >= opt.minLen ? lang : kurz).push(a);
    }
    const sum = (L, k) => L.reduce((x, a) => x + a[k], 0);
    return { abschnitte: lang, kurz: kurz.length, kurz_m: sum(kurz, "gravel_m"), gravel_m: sum(lang, "gravel_m") + sum(kurz, "gravel_m"),
      sicher_m: sum(lang, "gravel_m") - sum(lang, "unklar_m"), unklar_m: sum(lang, "unklar_m"), v: RT.VERSIONS.gravel };
  };
  /** Sperrpunkte für eine Umfahrung: kleine Kreise (5–10 m) mitten auf Gravel-Stücken, je ~150 m einer, nicht an
   *  Kreuzungen (Mitte eines Wegstücks ≥ 24 m, ≥ 12 m vom Abschnittsende) und nie näher als 30 m an einem Wegpunkt.
   *  BRouter sperrt Wegstücke, die näher als der Radius am Kreis vorbeiführen. Ergebnis je Abschnitt (leg) der Route. */
  RT.umfahrungsPunkte = function (route, abschnitte, opt) {
    opt = Object.assign({ abstand: 150, minSeg: 24, rand: 12, viaFrei: 30 }, opt || {});
    const out = [], { lon, lat, d } = route;
    const nahVia = (x, y) => (route.vias || []).some((v) => RT.hav(v.lon, v.lat, x, y) < opt.viaFrei);
    for (const a of abschnitte || []) {
      const cand = [];
      for (let i = 0; i < lon.length - 1; i++) {
        if (d[i + 1] <= a.d0 || d[i] >= a.d1) continue;
        const sl = d[i + 1] - d[i], mid = (d[i] + d[i + 1]) / 2;
        if (mid - a.d0 < opt.rand || a.d1 - mid < opt.rand) continue;
        const seg = RT.at(route, mid).seg; if (!RT.gravelArt(seg)) continue;
        cand.push({ i, sl, mid, x: (lon[i] + lon[i + 1]) / 2, y: (lat[i] + lat[i + 1]) / 2, leg: seg ? seg.leg : 0 });
      }
      let pick = cand.filter((c) => c.sl >= opt.minSeg && !nahVia(c.x, c.y));
      if (!pick.length) { const c = cand.filter((x) => !nahVia(x.x, x.y)).sort((p, q) => q.sl - p.sl)[0]; if (c) pick = [c]; }
      let last = -Infinity;
      for (const c of pick) {
        if (c.mid - last < opt.abstand) continue;
        out.push({ lon: c.x, lat: c.y, r: Math.max(3, Math.min(10, Math.round(c.sl / (c.sl >= opt.minSeg ? 4 : 3)))), leg: c.leg, d: c.mid });
        last = c.mid;
      }
    }
    return out;
  };
  RT.nogoParam = (pts) => (pts || []).map((p) => `${(+p.lon).toFixed(6)},${(+p.lat).toFixed(6)},${Math.round(p.r)}`).join("|");
  /** Liegt ein Gravel-Abschnitt an einem Wegpunkt (Start, Zwischenziel, Ziel)? Dann nur durch Verschieben des Punkts vermeidbar. */
  RT.amWegpunkt = (route, a, m) => (route.vias || []).some((v) => isNum(v.d) && a.d0 - (m || 5) <= v.d && v.d <= a.d1 + (m || 5)
    && !!RT.gravelArt(RT.at(route, Math.max(0, Math.min(route.L, v.d === 0 ? 1 : v.d >= route.L ? route.L - 1 : v.d))).seg));
  /** Umfahrung suchen: je betroffener Abschnitt (leg) bis zu 3 Runden mit Sperrpunkten auf den Gravel-Stücken (nie näher als
   *  30 m an einem Wegpunkt); schlägt eine Runde fehl (z. B. Ziel nur über Gravel erreichbar) oder bringt sie nichts, gilt die
   *  letzte gelungene. Liegt ein Wegpunkt selbst auf Gravel, beginnt die Umfahrung allenfalls am nächsten erlaubten Weg (snap_m).
   *  Ergebnis: neue legs (unveränderte bleiben), Zahl der Sperren, Fehler je Abschnitt. Nichts wird geraten oder als Linie ergänzt. */
  RT.umfahrung = async function (fetchFn, endpoint, eng, vias, route, opt) {
    opt = Object.assign({ runden: 3 }, opt || {});
    const meta = { sport: route.sport, engine: route.engine };
    const legs = route.legs.map((lg, li) => ({ coords: route.lon.slice(lg.i0, lg.i1 + 1).map((x, k) => [x, route.lat[lg.i0 + k], route.ele[lg.i0 + k]]),
      edges: route.segs.filter((s) => s.leg === li).map((s) => ({ i0: s.i0 - lg.i0, i1: s.i1 - lg.i0, tags: s.tags, nodeTags: s.nodeTags || {} })), props: lg.props, url: lg.url }));
    const g0 = RT.gravelAbschnitte(route), info = { sperren: 0, runden: 0, fehler: [], amWegpunkt: g0.abschnitte.filter((a) => RT.amWegpunkt(route, a)) };
    const offen = [...new Set(g0.abschnitte.flatMap((a) => a.legs))];
    const gm = (r) => RT.gravelAbschnitte(r).gravel_m;
    for (const li of offen) {
      const a = vias[li], b = vias[li + 1];
      let cur = RT.buildRoute([legs[li]], [a, b], meta), nogos = [], bestG = gm(cur), bestLeg = null;
      for (let r = 0; r < opt.runden; r++) {
        const ziel = RT.gravelAbschnitte(cur).abschnitte;
        if (!ziel.length) break;
        const neu = RT.umfahrungsPunkte(cur, ziel).filter((p) => !nogos.some((q) => RT.hav(p.lon, p.lat, q.lon, q.lat) < 5));
        if (!neu.length) break;
        nogos = nogos.concat(neu);
        let leg;
        try { leg = await RT.fetchLeg(fetchFn, endpoint, eng, a, b, { nogos: RT.nogoParam(nogos) }); }
        catch (e) { info.fehler.push({ leg: li, text: e.message, detail: e.detail || "" }); break; }
        cur = RT.buildRoute([leg], [a, b], meta);
        info.runden = Math.max(info.runden, r + 1);
        const g = gm(cur);
        if (g < bestG - 1) { bestG = g; bestLeg = leg; info.sperren = Math.max(info.sperren, nogos.length); }
      }
      if (bestLeg) legs[li] = bestLeg;                         // nur übernehmen, wenn weniger Gravel
    }
    return { legs, info };
  };

  /* ---------------- Andere Routen (alternativen-1.0) ----------------
   * BRouter alternativeidx 1–2 je Abschnitt; gleiche Nummer über alle Abschnitte zusammengesetzt. Doppelte (≥ 85 % der
   * Strecke innerhalb 30 m einer anderen) werden verworfen. Beschreibung: wo sie abweicht, höchster Punkt. */
  RT.naheIndex = function (route, step, von, bis) {
    step = step || 25;
    const cell = 0.0015, grid = new Map(), key = (x, y) => Math.floor(x / cell) + ":" + Math.floor(y / cell);
    for (let dd = Math.max(0, von || 0); dd <= Math.min(route.L, bis == null ? route.L : bis); dd += step) { const a = RT.at(route, dd); const k = key(a.lon, a.lat); if (!grid.has(k)) grid.set(k, []); grid.get(k).push([a.lon, a.lat]); }
    return function (x, y) {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell); let best = Infinity;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of grid.get((cx + i) + ":" + (cy + j)) || []) { const h = RT.hav(x, y, p[0], p[1]); if (h < best) best = h; }
      return best;
    };
  };
  /** Anteil von B (je 50 m), der höchstens tol m neben A liegt, und der abweichende Teil von B (km von–bis).
   *  opt.a / opt.b = [von, bis] in m: nur diese Teile vergleichen (z. B. die Abfahrten nach dem gemeinsamen Aufstieg). */
  RT.vergleicheRouten = function (A, B, tol, opt) {
    tol = tol || 30; opt = opt || {};
    const ra = opt.a || [0, A.L], rb = opt.b || [0, B.L];
    const near = RT.naheIndex(A, 25, ra[0], ra[1]), P = B.profile;
    let n = 0, gleich = 0, d0 = null, d1 = null, maxEle = -Infinity, maxEleAb = -Infinity;
    for (let dd = Math.max(0, rb[0]); dd <= Math.min(B.L, rb[1]); dd += 50) {
      const a = RT.at(B, dd); n++;
      if (isNum(a.ele) && a.ele > maxEle) maxEle = a.ele;
      if (near(a.lon, a.lat) <= tol) gleich++;
      else { if (d0 == null) d0 = dd; d1 = dd; if (isNum(a.ele) && a.ele > maxEleAb) maxEleAb = a.ele; }
    }
    return { anteil: n ? gleich / n : 1, ab: d0 == null ? null : { d0, d1 }, maxEle: isFinite(maxEle) ? maxEle : null, maxEleAb: isFinite(maxEleAb) ? maxEleAb : null, maxEleProfil: P ? Math.max(...P.ele.filter(isNum)) : null };
  };
  RT.istDoppelt = (A, B, schwelle, opt) => {
    const o = opt || {}, s = schwelle || 0.85;
    return RT.vergleicheRouten(A, B, 30, o).anteil >= s && RT.vergleicheRouten(B, A, 30, { a: o.b, b: o.a }).anteil >= s;
  };

  /* ---------------- Ortssuche (ortssuche-1.0, swisstopo) ----------------
   * Gesendet wird nur der eingegebene Text. Antwort: results[].attrs mit label (HTML), detail, origin und Koordinaten
   * (lat/lon, sonst LV03 x = Nord, y = Ost); Umrechnung mit den Näherungsformeln von swisstopo (Genauigkeit ~1 m). */
  RT.SUCHE = "https://api3.geo.admin.ch/rest/services/api/SearchServer";
  RT.sucheUrl = (text, base) => `${base || RT.SUCHE}?searchText=${encodeURIComponent(String(text).trim().slice(0, 80))}&type=locations&origins=gg25,gazetteer,zipcode,address&limit=8`;
  RT.lv03ZuWgs = function (ost, nord) {
    if (ost > 2e6) ost -= 2e6; if (nord > 1e6) nord -= 1e6;             // LV95 → LV03
    const y = (ost - 600000) / 1e6, x = (nord - 200000) / 1e6;
    const lon = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
    const lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x * x * x;
    return [(lon * 100) / 36, (lat * 100) / 36];
  };
  RT.sucheErgebnisse = function (json) {
    const out = [];
    for (const r of (json && json.results) || []) {
      const a = r.attrs || {};
      let ll = null;
      if (isNum(a.lon) && isNum(a.lat) && Math.abs(a.lon) <= 180 && Math.abs(a.lat) <= 90) ll = [a.lon, a.lat];
      else if (isNum(a.x) && isNum(a.y)) {
        const p = a.x % 1e6, q = a.y % 1e6;                               // LV03 laut Doku: x = Nord, y = Ost (Bern ≈ 200000 / 600000)
        ll = p < q ? RT.lv03ZuWgs(a.y, a.x) : RT.lv03ZuWgs(a.x, a.y);
      }
      if (!ll || !isNum(ll[0]) || !isNum(ll[1])) continue;
      const label = String(a.label || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      out.push({ label, detail: String(a.detail || ""), origin: String(a.origin || ""), lon: +ll[0].toFixed(6), lat: +ll[1].toFixed(6) });
    }
    return out;
  };


  /* ================= V5.8 ================= */
  /* ---------------- Schweizer Koordinaten (Näherungsformeln swisstopo, ~1 m) ---------------- */
  RT.toLV95 = function (lon, lat) {
    const p = (lat * 3600 - 169028.66) / 10000, l = (lon * 3600 - 26782.5) / 10000;
    return [2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
      1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3];
  };
  RT.fromLV95 = function (E, N) {
    const y = (E - 2600000) / 1e6, x = (N - 1200000) / 1e6;
    const l = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y ** 3;
    const p = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x ** 3;
    return [+(l * 100 / 36).toFixed(7), +(p * 100 / 36).toFixed(7)];
  };

  /* ---------------- Abschnitte von Hand (hand-1.0) ----------------
   * Nur auf ausdrückliche Wahl (Skitour, «Lücke von Hand schliessen», «Abschnitt von Hand», ohne Routing-Zustimmung):
   * gerade Linien zwischen DEINEN Punkten, alle 20 m eine Höhe aus dem Höhenmodell. Belag, Wegart und Zugang bleiben
   * «von Hand / nicht geprüft» – nie als erlaubter Weg ausgegeben. */
  RT.densify = function (pts, step) {
    step = step || 20;
    if (!pts || pts.length < 2) return (pts || []).map((p) => [p[0], p[1]]);
    const out = [[+pts[0][0], +pts[0][1]]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(RT.hav(a[0], a[1], b[0], b[1]) / step));
      for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  };
  /** Abschnitt aus Stücken [{pts, quelle: "hand"|"ski", info}] in Reihenfolge (aneinanderstossend), je 20 m verdichtet.
   *  Höhen danach in coords[i][2] eintragen (Höhenmodell). */
  RT.legAusStuecken = function (stuecke, step) {
    const coords = [], edges = [];
    for (const st of stuecke || []) {
      if (!st || !st.pts || st.pts.length < 2) continue;
      const d = RT.densify(st.pts, step || 20);
      const i0 = coords.length ? coords.length - 1 : 0;
      d.forEach((p, k) => { if (coords.length && k === 0) { const c = coords[coords.length - 1]; if (RT.hav(c[0], c[1], p[0], p[1]) < 0.5) return; } coords.push([p[0], p[1], null]); });
      if (coords.length - 1 > i0) edges.push({ i0, i1: coords.length - 1, tags: {}, nodeTags: {}, quelle: st.quelle || "hand", info: st.info || null });
    }
    const ski = edges.some((e) => e.quelle === "ski");
    return { coords, edges, props: { creator: ski ? "Skitourenrouten swisstopo/SAC" : "von Hand gezeichnet" }, quelle: ski ? "ski" : "hand" };
  };
  RT.handLeg = (pts, step) => RT.legAusStuecken([{ pts, quelle: "hand" }], step);
  /** Abschnitte (legs) einer fertigen Route wieder herauslösen (gleiche Form wie parseBRouter, mit Herkunft je Kante). */
  RT.legsAusRoute = function (route) {
    return route.legs.map((lg, li) => ({ coords: route.lon.slice(lg.i0, lg.i1 + 1).map((x, k) => [x, route.lat[lg.i0 + k], route.ele[lg.i0 + k]]),
      edges: route.segs.filter((s) => s.leg === li).map((s) => ({ i0: s.i0 - lg.i0, i1: s.i1 - lg.i0, tags: s.tags, nodeTags: s.nodeTags || {}, quelle: s.quelle, info: s.info })),
      props: lg.props, url: lg.url }));
  };
  /** Mehrere Abschnitte zu einem zusammenfügen (gemeinsame Punkte nur einmal). */
  RT.legsZuEinem = function (legs) {
    const coords = [], edges = [];
    for (const lg of legs) {
      let skip = 0;
      if (coords.length) { const c = coords[coords.length - 1], f = lg.coords[0]; if (RT.hav(c[0], c[1], f[0], f[1]) < 0.5) skip = 1; }
      const base = coords.length - skip;
      for (let i = skip; i < lg.coords.length; i++) coords.push(lg.coords[i].slice());
      for (const e of lg.edges) { const i0 = Math.max(0, base + e.i0), i1 = base + e.i1; if (i1 > i0) edges.push(Object.assign({}, e, { i0, i1 })); }
    }
    return { coords, edges, props: Object.assign({}, (legs[0] || {}).props, { zusammengefuegt: true }) };
  };
  /** Abschnitt rückwärts (gleicher Weg zurück): Linie und Merkmale umgedreht; reversedirection gekippt, damit Einbahnen
   *  gegen die neue Richtung sichtbar werden (RT.einbahnGegen). */
  RT.umkehrLeg = function (leg) {
    const N = leg.coords.length;
    return { coords: leg.coords.slice().reverse().map((c) => c.slice()),
      edges: leg.edges.slice().reverse().map((e) => { const t = Object.assign({}, e.tags || {}); if (t.reversedirection === "yes") delete t.reversedirection; else t.reversedirection = "yes";
        return Object.assign({}, e, { i0: N - 1 - e.i1, i1: N - 1 - e.i0, tags: t }); }),
      props: Object.assign({}, leg.props, { umgekehrt: true }) };
  };
  /** Meter gegen eine Einbahn (fürs Velo, laut OSM), z. B. nach dem Umkehren. */
  RT.einbahnGegen = function (route, d0, d1) {
    d0 = d0 || 0; d1 = d1 == null ? route.L : d1;
    let m = 0;
    for (const s of route.segs || []) {
      const t = s.tags || {}, a = Math.max(d0, s.d0), b = Math.min(d1, s.d1); if (b <= a) continue;
      if (t["oneway:bicycle"] === "no" || /opposite/.test(t.cycleway || "")) continue;
      const rev = t.reversedirection === "yes";
      if ((t.oneway === "yes" && rev) || (t.oneway === "-1" && !rev)) m += b - a;
    }
    return m;
  };

  /* ---------------- Skitourenrouten (skiroute-1.0) ----------------
   * Quelle: swisstopo-Ebene «Skitourenrouten» (ch.swisstopo-karto.skitouren, mit dem SAC) über die identify-Schnittstelle
   * von geo.admin.ch (LV95, höchstens 50 Objekte je Anfrage). Netz: Punkte innerhalb 12 m zusammengelegt, Linienenden bis
   * 20 m an nahe Linien angeschlossen. Zwischen zwei Punkten: kürzester Weg im Netz zwischen den Stellen, die ihnen am
   * nächsten liegen (höchstens 150 m daneben); der kurze Anschluss vom Punkt zur Linie ist «von Hand». Kein Netz in der Nähe
   * oder Umweg grösser als 1,8 × Luftlinie + 800 m: der Abschnitt bleibt von Hand – mit Grund, nie still. */
  RT.SKI_LAYER = "ch.swisstopo-karto.skitouren";
  RT.SKI_IDENTIFY = "https://api3.geo.admin.ch/rest/services/api/MapServer/identify";
  /** Suchrechteck (LV95) um die Punkte, je Seite rand_m, höchstens 40 km Kantenlänge. */
  RT.skiBbox = function (pts, rand_m) {
    rand_m = rand_m == null ? 1500 : rand_m;
    const ll = (pts || []).map((p) => RT.toLV95(p[0], p[1]));
    if (!ll.length) return null;
    let e0 = Math.min(...ll.map((p) => p[0])) - rand_m, e1 = Math.max(...ll.map((p) => p[0])) + rand_m;
    let n0 = Math.min(...ll.map((p) => p[1])) - rand_m, n1 = Math.max(...ll.map((p) => p[1])) + rand_m;
    const cap = (a, b) => { const m = (a + b) / 2, h = Math.min(20000, (b - a) / 2); return [m - h, m + h]; };
    [e0, e1] = cap(e0, e1); [n0, n1] = cap(n0, n1);
    return [Math.floor(e0), Math.floor(n0), Math.ceil(e1), Math.ceil(n1)];
  };
  RT.skiIdentifyUrl = function (bbox, offset, base) {
    const b = bbox.map((v) => Math.round(v)).join(",");
    return `${base || RT.SKI_IDENTIFY}?geometry=${b}&geometryType=esriGeometryEnvelope&layers=all:${RT.SKI_LAYER}&mapExtent=${b}&imageDisplay=1000,1000,96&tolerance=0&returnGeometry=true&geometryFormat=geojson&sr=2056&lang=de${offset ? "&offset=" + offset : ""}`;
  };
  const skiName = (props) => {
    const low = {}; for (const [k, v] of Object.entries(props || {})) low[k.toLowerCase()] = v;
    for (const k of ["name", "routenname", "route_name", "bezeichnung", "label", "titel", "name_de", "tourname"]) if (typeof low[k] === "string" && low[k].trim()) return low[k].trim();
    const s = Object.values(props || {}).find((v) => typeof v === "string" && v.trim().length > 2 && v.length < 80 && !/^https?:/.test(v));
    return s ? s.trim() : "Skitourenroute";
  };
  /** identify-Antwort → [{id, name, props, lines: [[[lon, lat], …], …]}] (LV95/LV03 → WGS84). */
  RT.skiFeatures = function (json) {
    const out = [];
    const conv = (c) => { const x = +c[0], y = +c[1]; return x > 2e6 ? RT.fromLV95(x, y) : x > 4e5 ? RT.fromLV95(x + 2e6, y + 1e6) : [x, y]; };
    for (const r of (json && json.results) || []) {
      const g = r.geometry; if (!g || !Array.isArray(g.coordinates)) continue;
      const lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
      const L = lines.map((ln) => ln.map(conv).filter((p) => isNum(p[0]) && isNum(p[1]))).filter((ln) => ln.length >= 2);
      if (!L.length) continue;
      const props = r.properties || r.attributes || {};
      out.push({ id: String(r.featureId != null ? r.featureId : r.id != null ? r.id : "f" + out.length), name: skiName(props), props, lines: L });
    }
    return out;
  };
  RT.skiNetz = function (features, opt) {
    opt = Object.assign({ tol: 12, anschluss: 20 }, opt || {});
    const lines = [];
    (features || []).forEach((f, fi) => { for (const ln of f.lines || []) if (ln && ln.length >= 2) lines.push({ f: fi, pts: ln }); });
    const netz = { nodes: [], edges: [], adj: [], features: features || [], v: RT.VERSIONS.skiroute, Q: new Map(), kx: 1, ky: 1, leer: !lines.length };
    if (!lines.length) return netz;
    let lat0 = 0, cnt = 0; for (const l of lines) for (const p of l.pts) { lat0 += +p[1]; cnt++; } lat0 /= cnt;
    const kx = Math.cos(lat0 * RAD) * 111320, ky = 110540, nodes = netz.nodes, edges = netz.edges, adj = netz.adj;
    netz.kx = kx; netz.ky = ky;
    const G = new Map(), cs = opt.tol * 2;
    const node = (lon, lat) => {
      const x = lon * kx, y = lat * ky, cx = Math.floor(x / cs), cy = Math.floor(y / cs);
      let best = -1, bd = opt.tol;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const id of G.get((cx + i) + ":" + (cy + j)) || []) { const d = Math.hypot(nodes[id].x - x, nodes[id].y - y); if (d <= bd) { bd = d; best = id; } }
      if (best >= 0) return best;
      const id = nodes.length; nodes.push({ x, y, lon, lat }); adj.push([]);
      const k = cx + ":" + cy; if (!G.has(k)) G.set(k, []); G.get(k).push(id);
      return id;
    };
    const addEdge = (a, b, f) => {
      if (a === b) return -1;
      const len = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y); if (len < 0.01) return -1;
      if (adj[a].some((id) => !edges[id].aus && ((edges[id].a === a && edges[id].b === b) || (edges[id].a === b && edges[id].b === a)))) return -1;
      const id = edges.length; edges.push({ a, b, len, f, aus: false }); adj[a].push(id); adj[b].push(id); return id;
    };
    const ends = [];
    for (const l of lines) {
      let prev = -1;
      l.pts.forEach((p, k) => { const id = node(+p[0], +p[1]); if (prev >= 0) addEdge(prev, id, l.f); if (k === 0 || k === l.pts.length - 1) ends.push(id); prev = id; });
    }
    const ecs = 50, ekeys = (e) => { const A = nodes[e.a], B = nodes[e.b], out = [];
      for (let i = Math.floor(Math.min(A.x, B.x) / ecs); i <= Math.floor(Math.max(A.x, B.x) / ecs); i++) for (let j = Math.floor(Math.min(A.y, B.y) / ecs); j <= Math.floor(Math.max(A.y, B.y) / ecs); j++) out.push(i + ":" + j);
      return out; };
    const EG = new Map();
    edges.forEach((e, id) => { for (const k of ekeys(e)) { if (!EG.has(k)) EG.set(k, []); EG.get(k).push(id); } });
    const splits = new Map();
    for (const nid of ends) {
      if (adj[nid].length !== 1) continue;                     // Kreuzung oder schon verbunden
      const N = nodes[nid], cx = Math.floor(N.x / ecs), cy = Math.floor(N.y / ecs);
      let best = null;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const id of EG.get((cx + i) + ":" + (cy + j)) || []) {
        const e = edges[id]; if (e.a === nid || e.b === nid) continue;
        const A = nodes[e.a], B = nodes[e.b], vx = B.x - A.x, vy = B.y - A.y, l2 = vx * vx + vy * vy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((N.x - A.x) * vx + (N.y - A.y) * vy) / l2)) : 0;
        const d = Math.hypot(A.x + vx * t - N.x, A.y + vy * t - N.y);
        if (d <= opt.anschluss && (!best || d < best.d)) best = { id, t, d };
      }
      if (!best) continue;
      const e = edges[best.id];
      if (best.t * e.len < opt.tol) addEdge(nid, e.a, -1);
      else if ((1 - best.t) * e.len < opt.tol) addEdge(nid, e.b, -1);
      else { if (!splits.has(best.id)) splits.set(best.id, []); splits.get(best.id).push({ t: best.t, from: nid }); }
    }
    for (const [id, L] of splits) {
      const e = edges[id]; e.aus = true;
      const A = nodes[e.a], B = nodes[e.b];
      L.sort((p, q) => p.t - q.t);
      let prev = e.a;
      for (const sp of L) {
        const nid = nodes.length; nodes.push({ x: A.x + (B.x - A.x) * sp.t, y: A.y + (B.y - A.y) * sp.t, lon: A.lon + (B.lon - A.lon) * sp.t, lat: A.lat + (B.lat - A.lat) * sp.t }); adj.push([]);
        addEdge(prev, nid, e.f); addEdge(sp.from, nid, -1); prev = nid;
      }
      addEdge(prev, e.b, e.f);
    }
    edges.forEach((e, id) => { if (e.aus) return; for (const k of ekeys(e)) { if (!netz.Q.has(k)) netz.Q.set(k, []); netz.Q.get(k).push(id); } });
    return netz;
  };
  /** Nächste Stelle des Netzes (höchstens maxD m). */
  RT.skiSnap = function (netz, lon, lat, maxD) {
    if (!netz || netz.leer) return null;
    const x = lon * netz.kx, y = lat * netz.ky, cs = 50, r = Math.ceil(maxD / cs), cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    let best = null;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (const id of netz.Q.get((cx + i) + ":" + (cy + j)) || []) {
      const e = netz.edges[id], A = netz.nodes[e.a], B = netz.nodes[e.b], vx = B.x - A.x, vy = B.y - A.y, l2 = vx * vx + vy * vy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - A.x) * vx + (y - A.y) * vy) / l2)) : 0;
      const d = Math.hypot(A.x + vx * t - x, A.y + vy * t - y);
      if (d <= maxD && (!best || d < best.d)) best = { e: id, t, d, lon: A.lon + (B.lon - A.lon) * t, lat: A.lat + (B.lat - A.lat) * t };
    }
    return best;
  };
  RT.skiPfad = function (netz, a, b, opt) {
    opt = Object.assign({ maxSnap: 150, faktor: 1.8, plus: 800 }, opt || {});
    const luft = RT.hav(a[0], a[1], b[0], b[1]);
    if (!netz || netz.leer) return { ok: false, grund: "keine Skitourenroute im Ausschnitt" };
    const sa = RT.skiSnap(netz, a[0], a[1], opt.maxSnap), sb = RT.skiSnap(netz, b[0], b[1], opt.maxSnap);
    if (!sa) return { ok: false, grund: `keine Skitourenroute näher als ${opt.maxSnap} m beim ersten Punkt` };
    if (!sb) return { ok: false, grund: `keine Skitourenroute näher als ${opt.maxSnap} m beim zweiten Punkt` };
    const E = netz.edges, Nn = netz.nodes, n = Nn.length;
    const ea = E[sa.e], eb = E[sb.e];
    const dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), prevE = new Int32Array(n).fill(-1);
    const H = [];
    const push = (node, d) => { H.push([d, node]); let i = H.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (H[q][0] <= H[i][0]) break; [H[q], H[i]] = [H[i], H[q]]; i = q; } };
    const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
    const seed = (node, d) => { if (d < dist[node]) { dist[node] = d; prev[node] = -2; prevE[node] = sa.e; push(node, d); } };
    seed(ea.a, sa.t * ea.len); seed(ea.b, (1 - sa.t) * ea.len);
    while (H.length) {
      const [d, u] = pop(); if (d > dist[u]) continue;
      for (const id of netz.adj[u]) {
        const e = E[id]; if (e.aus) continue;
        const v = e.a === u ? e.b : e.a, nd = d + e.len;
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; prevE[v] = id; push(v, nd); }
      }
    }
    let ziel = null, len = Infinity;
    if (sa.e === sb.e) { len = Math.abs(sa.t - sb.t) * ea.len; ziel = "direkt"; }
    const viaA = dist[eb.a] + sb.t * eb.len, viaB = dist[eb.b] + (1 - sb.t) * eb.len;
    if (viaA < len) { len = viaA; ziel = eb.a; }
    if (viaB < len) { len = viaB; ziel = eb.b; }
    if (!isFinite(len)) return { ok: false, grund: "die Skitourenrouten bei den beiden Punkten hängen nicht zusammen", snapA: sa.d, snapB: sb.d };
    const pts = [[sa.lon, sa.lat]], fs = [];
    if (ziel !== "direkt") {
      const chain = []; let u = ziel;
      while (u >= 0) { chain.push(u); const e = E[prevE[u]]; if (e && e.f >= 0) fs.push(e.f); u = prev[u]; if (u === -2) break; }
      chain.reverse().forEach((id) => pts.push([Nn[id].lon, Nn[id].lat]));
      if (eb.f >= 0) fs.push(eb.f);
      if (ea.f >= 0) fs.push(ea.f);
    } else if (ea.f >= 0) fs.push(ea.f);
    pts.push([sb.lon, sb.lat]);
    let L = 0; for (let i = 1; i < pts.length; i++) L += RT.hav(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    const grenze = luft * opt.faktor + opt.plus;
    const namen = [...new Set(fs.map((f) => (netz.features[f] || {}).name).filter(Boolean))];
    if (L + sa.d + sb.d > grenze) return { ok: false, grund: `die Skitourenroute wäre ein grosser Umweg (${(L / 1000).toFixed(1)} km statt ${(luft / 1000).toFixed(1)} km Luftlinie)`, umweg: L / Math.max(1, luft), snapA: sa.d, snapB: sb.d };
    return { ok: true, pts, len: L, snapA: sa.d, snapB: sb.d, luft, namen, v: RT.VERSIONS.skiroute };
  };
  /** Ein Abschnitt Skitour: Anschluss von Hand (falls > 5 m), Skitourenroute, Anschluss von Hand. */
  RT.skiLeg = function (a, b, pfad) {
    if (!pfad || !pfad.ok) return RT.handLeg([a, b]);
    const st = [], p0 = pfad.pts[0], p1 = pfad.pts[pfad.pts.length - 1];
    if (pfad.snapA > 5) st.push({ pts: [a, p0], quelle: "hand", info: { anschluss: true } });
    st.push({ pts: pfad.pts, quelle: "ski", info: { namen: pfad.namen } });
    if (pfad.snapB > 5) st.push({ pts: [p1, b], quelle: "hand", info: { anschluss: true } });
    const leg = RT.legAusStuecken(st);
    leg.pfad = { len: pfad.len, namen: pfad.namen, snapA: pfad.snapA, snapB: pfad.snapB };
    return leg;
  };

  /* ---------------- Hangneigung (hangneigung-1.0) ----------------
   * Gelände, nicht die Linie: Neigung aus dem Höhenraster (Mapzen/AWS Terrain Tiles, Terrarium-Kodierung, Zoom 14), zentrale
   * Differenzen über ±15 m, an der Linie und je 20 m links und rechts; je 20-m-Schritt der grösste Wert. Klassen nach SLF:
   * unter 30° mässig steil, ab 30° steil (97 % der tödlichen Skifahrerlawinen), ab 35° sehr steil, ab 40° extrem steil.
   * 25–30° als Übergang: die SLF-Grenzen sind Richtwerte, und ein Raster von ~25–30 m glättet kurze Steilstufen.
   * Keine Lawinenbeurteilung – das Bulletin und die Verhältnisse vor Ort entscheiden. */
  RT.HANG_KLASSEN = [
    { k: "h0", label: "unter 25°", lo: -1, hi: 25, color: "var(--rp-hang-0)" },
    { k: "h25", label: "25–30° Übergang – Hinweis", lo: 25, hi: 30, color: "var(--rp-hang-25)" },
    { k: "h30", label: "30–35° steil – Lawinengelände", lo: 30, hi: 35, color: "var(--rp-hang-30)" },
    { k: "h35", label: "35–40° sehr steil", lo: 35, hi: 40, color: "var(--rp-hang-35)" },
    { k: "h40", label: "über 40° extrem steil", lo: 40, hi: 91, color: "var(--rp-hang-40)" },
  ];
  RT.hangKlasse = (deg) => (isNum(deg) ? (RT.HANG_KLASSEN.find((c) => deg >= c.lo && deg < c.hi) || RT.HANG_KLASSEN[0]).k : "unbekannt");
  RT.terrarium = (r, g, b) => r * 256 + g + b / 256 - 32768;
  RT.DEM_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  /** Kacheln (Web Mercator) für ein Rechteck. */
  RT.demKacheln = function (lon0, lat0, lon1, lat1, z) {
    const n = 2 ** z, tx = (lon) => Math.floor((lon + 180) / 360 * n), ty = (lat) => { const s = Math.sin(lat * RAD); return Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n); };
    const out = [];
    for (let x = tx(Math.min(lon0, lon1)); x <= tx(Math.max(lon0, lon1)); x++) for (let y = ty(Math.max(lat0, lat1)); y <= ty(Math.min(lat0, lat1)); y++) out.push({ z, x, y });
    return out;
  };
  /** Höhe (bilinear) aus geladenen Kacheln: tiles = Map("x/y" → RGBA 256×256). Fehlt eine Kachel: null. */
  RT.demSampler = function (tiles, z) {
    const n = 2 ** z;
    const at = (X, Y) => { const tx = Math.floor(X / 256), ty = Math.floor(Y / 256), d = tiles.get(tx + "/" + ty); if (!d) return null; const i = ((Y - ty * 256) * 256 + (X - tx * 256)) * 4; return RT.terrarium(d[i], d[i + 1], d[i + 2]); };
    return function (lon, lat) {
      const s = Math.sin(lat * RAD), X = (lon + 180) / 360 * n * 256 - 0.5, Y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n * 256 - 0.5;
      const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0;
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      if (a == null || b == null || c == null || d == null) return null;
      return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
    };
  };
  /** Geländeneigung (Grad) an einer Stelle aus elevAt(lon, lat). */
  RT.hangAn = function (elevAt, lon, lat, dm) {
    dm = dm || 15;
    const dLon = dm / (111320 * Math.cos(lat * RAD)), dLat = dm / 110540;
    const e = elevAt(lon + dLon, lat), w = elevAt(lon - dLon, lat), nn = elevAt(lon, lat + dLat), s = elevAt(lon, lat - dLat);
    if (![e, w, nn, s].every(isNum)) return null;
    return Math.atan(Math.hypot((e - w) / (2 * dm), (nn - s) / (2 * dm))) / RAD;
  };
  RT.hangProfil = function (route, elevAt, opt) {
    opt = Object.assign({ seite: 20, dm: 15, minLen: 20 }, opt || {});
    const P = route.profile, n = P.n, deg = new Float64Array(n).fill(NaN);
    let bekannt = 0, max = null, kmax = -1;
    for (let k = 0; k < n; k++) {
      const lon = (P.lon[k] + P.lon[k + 1]) / 2, lat = (P.lat[k] + P.lat[k + 1]) / 2, h = P.head[k] * RAD;
      const pts = [[lon, lat]];
      if (opt.seite > 0) { const dx = (Math.cos(h) * opt.seite) / (111320 * Math.cos(lat * RAD)), dy = (-Math.sin(h) * opt.seite) / 110540; pts.push([lon + dx, lat + dy], [lon - dx, lat - dy]); }
      let mx = null;
      for (const [x, y] of pts) { const v = RT.hangAn(elevAt, x, y, opt.dm); if (isNum(v) && (mx == null || v > mx)) mx = v; }
      if (mx != null) { deg[k] = mx; bekannt++; if (max == null || mx > max) { max = mx; kmax = k; } }
    }
    const abschnitte = [];
    let cur = null;
    for (let k = 0; k < n; k++) {
      const v = deg[k], steil = isNum(v) && v >= 25;
      if (steil) {
        if (cur && P.d[k] - cur.d1 <= 40) { cur.d1 = P.d[k + 1]; if (v > cur.max) { cur.max = v; cur.kmax = k; } }
        else { cur = { d0: P.d[k], d1: P.d[k + 1], max: v, kmax: k }; abschnitte.push(cur); }
      }
    }
    const lang = abschnitte.filter((a) => a.d1 - a.d0 >= opt.minLen || a.max >= 30);
    for (const a of lang) { a.klasse = RT.hangKlasse(a.max); a.len = a.d1 - a.d0; }
    const m = (lo) => { let s = 0; for (let k = 0; k < n; k++) if (isNum(deg[k]) && deg[k] >= lo) s += P.d[k + 1] - P.d[k]; return s; };
    return { v: RT.VERSIONS.hang, deg, max, kmax, abschnitte: lang, ab25_m: m(25), ab30_m: m(30), ab35_m: m(35), ab40_m: m(40), bekannt_pct: n ? (100 * bekannt) / n : 0,
      quelle: "Höhenraster Mapzen/AWS Terrain Tiles (Zoom 14, Terrarium), zentrale Differenzen ±15 m, an der Linie und 20 m seitlich" };
  };

  /* ---------------- MTB: Aufstieg und Abfahrt (mtb-abfahrt-1.0) ----------------
   * Aufstieg bis zum höchsten Punkt über Forst- und Kieswege (Gravel-Profil, Kies bevorzugt). Abfahrt ab dem höchsten Punkt
   * zum Ziel, wählbar: gleicher Weg zurück (nur bei Rundtour, Linie des Aufstiegs umgekehrt, Einbahnen gemeldet),
   * Singletrail (MTB-Profil, reine Fusswege gesperrt, Trails bevorzugt) oder andere Strasse (Gravel-Profil mit Sperrpunkten
   * auf dem Aufstieg). Je Abfahrt Kennzahlen aus OSM: Trail-Anteil, MTB-Skala (fehlt = unbekannt), Belag, Zugang. */
  RT.MTB_TRAIL = { engine: "mtb", params: { StrictNOBicycleaccess: "1", MTB_factor: "1.0", processUnusedTags: "1" } };
  RT.MTB_STRASSE = { engine: "gravel", params: { prefer_unpaved_paths: "1", processUnusedTags: "1" } };
  /** Auf-/Abstieg zwischen d0 und d1 (geglättete 20-m-Höhe, 3-m-Hysterese wie hoehe-1.0). */
  RT.hm = function (route, d0, d1) {
    const P = route.profile, k0 = Math.max(0, Math.floor((d0 || 0) / P.step)), k1 = Math.min(P.n, Math.ceil((d1 == null ? route.L : d1) / P.step));
    let up = 0, dn = 0, ref = P.ele[k0];
    for (let k = k0 + 1; k <= k1; k++) { const v = P.ele[k]; if (v - ref >= 3) { up += v - ref; ref = v; } else if (ref - v >= 3) { dn += ref - v; ref = v; } }
    return { up, down: dn };
  };
  /** Höchster Punkt der Route; ist ein Zwischenziel höchstens 300 m und 30 Hm davon entfernt, gilt dieses. */
  RT.hoechsterPunkt = function (route) {
    const P = route.profile; let k = 0;
    for (let i = 1; i <= P.n; i++) if (P.ele[i] > P.ele[k]) k = i;
    let via = null, dv = Infinity;
    (route.vias || []).forEach((v, i) => { if (i > 0 && i < route.vias.length - 1 && Math.abs(v.d - P.d[k]) < 300 && P.ele[k] - RT.at(route, v.d).ele < 30 && Math.abs(v.d - P.d[k]) < dv) { dv = Math.abs(v.d - P.d[k]); via = i; } });
    const d = via != null ? route.vias[via].d : P.d[k], a = RT.at(route, d);
    return { d, ele: a.ele, lon: a.lon, lat: a.lat, via, auf: RT.hm(route, 0, d).up, ab: RT.hm(route, d, route.L).down, am_ende: route.L - d < 200 };
  };
  /** Sperrpunkte auf dem Aufstieg (für «andere Strasse»): alle ~300 m ein Kreis von 15 m, nicht in den ersten und letzten
   *  300 m und nie näher als 80 m an den frei zu haltenden Punkten (Gipfel, Ziel); höchstens 20. */
  RT.abfahrtSperren = function (aufstieg, d0, d1, opt) {
    opt = Object.assign({ abstand: 300, rand: 300, r: 15, max: 20, frei: [] }, opt || {});
    const out = [], L = d1 - d0;
    if (L < 2 * opt.rand + 50) return out;
    const n = Math.max(1, Math.min(opt.max, Math.floor((L - 2 * opt.rand) / opt.abstand) + 1));
    for (let i = 0; i < n; i++) {
      const dd = d0 + opt.rand + (n === 1 ? (L - 2 * opt.rand) / 2 : (i * (L - 2 * opt.rand)) / (n - 1)), a = RT.at(aufstieg, dd);
      if (opt.frei.some((p) => RT.hav(p[0], p[1], a.lon, a.lat) < 80)) continue;
      out.push({ lon: a.lon, lat: a.lat, r: opt.r, d: dd });
    }
    return out;
  };
  /** Kennzahlen einer Abfahrt (oder eines Teils der Route) aus den OSM-Merkmalen. */
  RT.trailKennzahlen = function (route, d0, d1) {
    d0 = d0 || 0; d1 = d1 == null ? route.L : d1;
    const o = { L: 0, trail_m: 0, ohne_skala_m: 0, mtbMax: null, asphalt_m: 0, kies_m: 0, natur_m: 0, unklar_m: 0, verboten_m: 0, schieben_m: 0, hand_m: 0 };
    let maxS = null;
    for (const s of route.segs || []) {
      const a = Math.max(d0, s.d0), b = Math.min(d1, s.d1); if (b <= a) continue;
      const len = b - a; o.L += len;
      if (s.quelle === "hand") { o.hand_m += len; continue; }
      const t = s.tags || {}, trail = s.way === "pfad" || s.way === "fussweg" || (t["mtb:scale"] != null && s.way !== "fahrweg" && s.way !== "nebenstrasse");
      if (trail) { o.trail_m += len; if (s.mtb) { const v = parseInt(String(s.mtb).slice(1), 10); if (isNum(v) && (maxS == null || v > maxS)) maxS = v; } else o.ohne_skala_m += len; }
      if (s.surface === "asphalt" || s.surface === "hart" || s.surface === "pflaster") o.asphalt_m += len;
      else if (s.surface === "kies" || s.surface === "unbefestigt") o.kies_m += len;
      else if (s.surface === "natur") o.natur_m += len;
      if (s.access === "unklar") o.unklar_m += len; else if (s.access === "verboten") o.verboten_m += len; else if (s.access === "schieben") o.schieben_m += len;
    }
    o.mtbMax = maxS == null ? null : "S" + maxS;
    o.trail_pct = o.L ? (100 * o.trail_m) / o.L : 0;
    const h = RT.hm(route, d0, d1); o.ab = h.down; o.auf = h.up;
    o.einbahn_m = RT.einbahnGegen(route, d0, d1);
    return o;
  };

  /* ---------------- Wandern und Trail: Weg endet vor dem Punkt (wegende-1.0) ----------------
   * BRouter schiebt einen Punkt neben dem Wegnetz auf den nächsten erlaubten Weg. Ab 60 m zeigt der Planer die Lücke
   * zwischen Wegende und Punkt – ohne Linie. Auf Wunsch wird das Wegende als Punkt gesetzt und die Lücke als Abschnitt
   * «von Hand» geschlossen; weitere Punkte darin präzisieren die Linie. Findet BRouter gar keinen Weg, werden Ersatzziele auf
   * der Luftlinie zum Punkt versucht (85, 70, 50, 30 %), um das Wegende zu finden. */
  RT.WEGENDE_STUFEN = [0.85, 0.7, 0.5, 0.3];
  RT.zwischenPunkt = (a, b, f) => [+(a[0] + (b[0] - a[0]) * f).toFixed(6), +(a[1] + (b[1] - a[1]) * f).toFixed(6)];
  /** Punkte mit Lücke zum Wegnetz: [{i, m, weg: [lon, lat]}]. */
  RT.luecken = (route, minM) => (route && route.vias ? route.vias.map((v, i) => ({ i, m: v.snap_m || 0, weg: v.weg })).filter((x) => x.m >= (minM || 60) && x.weg) : []);
  /** Wegpunkte, Namen und «von Hand danach» so ergänzen, dass die Lücke beim Punkt i von Hand geschlossen wird. */
  RT.lueckeSchliessen = function (vias, i, weg, extra) {
    const n = vias.length, w = [+(+weg[0]).toFixed(6), +(+weg[1]).toFixed(6)], v = vias.map((p) => p.slice()), ex = {};
    for (const k of Object.keys(extra || {})) ex[k] = Array.from({ length: n }, (_, j) => ((extra[k] || [])[j] != null ? extra[k][j] : null));
    if (!ex.handNach) ex.handNach = Array.from({ length: n }, () => null);
    const ins = (pos, p) => { v.splice(pos, 0, p); for (const k of Object.keys(ex)) ex[k].splice(pos, 0, k === "names" ? "Wegende" : k === "pausen" ? 0 : null); };
    if (i === 0) { ins(1, w); ex.handNach[0] = true; }                                   // Punkt → Wegende von Hand
    else if (i === n - 1) { ins(n - 1, w); ex.handNach[n - 1] = true; }                  // Wegende → Punkt von Hand
    else { ins(i, w); ins(i + 2, w.slice()); ex.handNach[i] = true; ex.handNach[i + 1] = true; }   // hin und zurück von Hand
    return Object.assign({ vias: v }, ex);
  };

  /* ---------------- GPX ---------------- */
  const xmlEsc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  /** extra: weitere Wegpunkte [{lon, lat, name}] (V5.7: Beginn der geplanten Intervalle). */
  RT.gpx = function (route, name, viaNames, extra) {
    if (!route || route.unvollstaendig) throw new Error("Route unvollständig: kein GPX.");
    const P = route.profile;
    const wpts = route.vias.map((p, i) => `<wpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><name>${xmlEsc((viaNames && viaNames[i]) || (i === 0 ? "Start" : i === route.vias.length - 1 ? "Ziel" : "Zwischenziel " + i))}</name></wpt>`)
      .concat((extra || []).filter((w) => isNum(w.lon) && isNum(w.lat)).map((w) => `<wpt lat="${(+w.lat).toFixed(6)}" lon="${(+w.lon).toFixed(6)}"><name>${xmlEsc(w.name || "")}</name></wpt>`)).join("\n");
    const pts = route.lon.map((lo, i) => { const e = route.ele[i]; return `<trkpt lat="${route.lat[i].toFixed(6)}" lon="${lo.toFixed(6)}">${isNum(e) ? `<ele>${e.toFixed(1)}</ele>` : ""}</trkpt>`; }).join("\n");
    const Q = route.quellen || {}, km1 = (m) => (m / 1000).toFixed(1);
    const teile = [Q.ski > 0.5 ? `Skitourenrouten swisstopo/SAC ${km1(Q.ski)} km` : "", Q.hand > 0.5 && Q.hand < route.L - 0.5 ? `von Hand gezeichnet ${km1(Q.hand)} km (kein Wegnetz)` : ""].filter(Boolean);
    const desc = `${route.gezeichnet && !(Q.ski > 0.5) ? "Von Hand gezeichnet (kein Routing)" : route.gezeichnet ? "Skitour" : "Geroutet mit " + route.prov.routing + (route.engine ? ", Profil " + RT.profilName(route.engine) : "")}${teile.length ? "; " + teile.join(", ") : ""}; ${route.prov.osm}; ${(route.L / 1000).toFixed(1)} km, ${Math.round(P.up)} m Aufstieg`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Ironman Notebook" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${xmlEsc(name)}</name><desc>${xmlEsc(desc)}</desc></metadata>\n${wpts}\n<trk><name>${xmlEsc(name)}</name><trkseg>\n${pts}\n</trkseg></trk>\n</gpx>\n`;
  };

  return RT;
});
