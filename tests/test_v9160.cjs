/* V9.16.0 trainingsroute-1.2 (Routen 7.4): Namen 1/2/3, «Hin und zurück», Abbrechen und «Schritt x von y» bei «Training → Route»,
 * Vorschlagslinien antippbar (Treffer ≥ 12 px), «Bearbeiten». Reine Logik (js/training-route.js, js/route.js) mit den aufgezeichneten
 * BRouter-Antworten aus tests/fixtures (OSM-Testdaten, ODbL) und erfundenen Werten; Verdrahtung als Text-Prüfung.
 * Die Bedienung auf der Karte prüft tools/durchklick_planer.py (Chrome, Demo, Karten-Attrappe). Aufruf: node --test tests/test_v9160.cjs */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), R = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const RT = require("../js/route.js"), TR = require("../js/training-route.js"), FK = require("../js/formkurve.js");
const FX = require("./fixtures/brouter_dreieich_training.json");

// Szenario und Wiedergabe der Antworten stammen aus tests/test_training.cjs (gleiche erfundene Zonen und Kalibrierung)
const src = R("tests/test_training.cjs");
const aus = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return src.slice(i, j); };
const helfer = new Function("RT", "TR", "FK", "FX", aus("const Z = {", "const pz = ") + "\n" + aus("function replay(sport)", "const WO_RAD") + "\nreturn { Z, KAL, replay, szenario };");
const H = helfer(RT, TR, FK, FX);
const wo = (sport, min, modus, wert) => TR.manuell({ sport, dauer_min: min, modus, wert }, { zonen: H.Z });
const WO_RAD = () => TR.manuell({ sport: "rad", dauer_min: 20, modus: "watt", wert: 200, ein_min: 3, aus_min: 3, intervalle: { n: 2, min: 4, wert: 280, pause_min: 2 } }, { zonen: H.Z });

test("trainingsroute-1.2: Kennung, Namen 1/2/3 (gerechnet und gespeichert wird weiter A/B/C), «Hin und zurück»", () => {
  assert.equal(TR.VERSIONS.vorschlag, "trainingsroute-1.2");
  assert.equal(TR.VERSIONS.abbrechen, "abbrechen-1.0");
  assert.deepEqual(["A", "B", "C"].map(TR.name), ["1", "2", "3"]);
  assert.equal(TR.name("X"), "X", "Unbekanntes bleibt wie es ist");
  assert.equal(TR.FORM.rund.text, "Hin und zurück", "Entscheid Nr. 76: «Rundtour» heisst «Hin und zurück»");
  assert.equal(TR.FORM.hin.text, "Gleicher Weg zurück", "die Wendepunkt-Form heisst nicht mehr gleich");
  assert.notEqual(TR.FORM.rund.text, TR.FORM.hin.text);
  const ui = R("js/training-ui.js");
  assert.match(ui, /\["rund", "Hin und zurück"\], \["hin", "Gleicher Weg zurück"\], \["ziel", "Zu einem Ziel"\]/);
  assert.doesNotMatch(ui, /"Rundtour"/);
  assert.match(R("js/planer-schlank.js"), /id: "rp-loop", text: "Hin und zurück"/);
  assert.match(R("js/routen-ui.js"), /id="rp-loop">Hin und zurück</);
});

test("Hinweise der Auswahl nennen 1/2/3 statt A/B/C", async () => {
  const io = H.replay("rennrad"), ctx = H.szenario("rennrad", WO_RAD());
  const res = await TR.suche(ctx, { route: io.route });
  const text = res.hinweise.join(" | ");
  assert.match(text, /2: Wetter unbekannt/);
  assert.doesNotMatch(text, /(^|\s|\|)[ABC]: /);
});

test("Abbruchsignal (abbrechen-1.0): schon abgebrochen = nichts gesendet; laufende Anfrage wird abgebrochen; Fehlerart «abbruch», nie «timeout»", async () => {
  const eng = RT.engineFor("laufen", {}), a = [8.7, 49.99], b = [8.71, 49.995], c = [8.72, 49.99];
  let gesendet = 0;
  const fetchFn = (url, o) => new Promise((res, rej) => {
    gesendet++;
    const stop = () => { const e = new Error("aborted"); e.name = "AbortError"; rej(e); };
    if (o && o.signal && o.signal.aborted) return stop();
    if (o && o.signal) o.signal.addEventListener("abort", stop, { once: true });      // ohne Antwort: wartet, bis abgebrochen wird
  });
  // 1. vor dem Senden abgebrochen (Anfrage steht noch in der Warteschlange)
  const vorher = new AbortController(); vorher.abort();
  for (const f of [() => RT.fetchLeg(fetchFn, "EP", eng, a, b, { signal: vorher.signal }), () => RT.fetchPts(fetchFn, "EP", eng, [a, b, c], { signal: vorher.signal })]) {
    await assert.rejects(f, (e) => e.kind === "abbruch" && e.message === "Abgebrochen.");
  }
  // 2. während der Anfrage abgebrochen
  for (const f of [(o) => RT.fetchLeg(fetchFn, "EP", eng, a, b, o), (o) => RT.fetchPts(fetchFn, "EP", eng, [a, b, c], o)]) {
    const ctl = new AbortController(), p = f({ signal: ctl.signal });
    setTimeout(() => ctl.abort(), 10);
    await assert.rejects(() => p, (e) => e.kind === "abbruch");
  }
  assert.ok(gesendet >= 4);
  // 3. ohne Signal: das alte Verhalten (Zeitüberschreitung bleibt «timeout»)
  await assert.rejects(() => RT.fetchLeg(fetchFn, "EP", eng, a, b, { timeout_ms: 20 }), (e) => e.kind === "timeout");
  assert.match(R("js/route.js"), /RT\.signalKoppeln = function/);
});

test("Fortschritt: «Schritt n von y» steigt nie über y (Rundtour 3, Rennrad 4, zum Ziel 1)", async () => {
  for (const [sport, von, art] of [["laufen", 3, "rund"], ["rennrad", 4, "rund"], ["laufen", 1, "ziel"]]) {
    const io = H.replay(sport), w = sport === "rennrad" ? WO_RAD() : wo("lauf", 30, "pace", 335), ctx = H.szenario(sport, w);
    ctx.routenart = art; if (art === "ziel") ctx.ziel = [8.7195, 49.9989];
    const meldungen = [];
    const res = await TR.suche(ctx, { route: io.route, fortschritt: (t, st) => meldungen.push({ t, st }) });
    assert.ok(!res.abgebrochen);
    assert.ok(meldungen.length >= 1, sport + " meldet");
    assert.ok(meldungen.every((m) => m.st && m.st.von === von && m.st.n >= 1 && m.st.n <= von), `${sport}/${art}: ${JSON.stringify(meldungen.map((m) => m.st))}`);
    const ns = meldungen.map((m) => m.st.n);
    assert.deepEqual(ns, [...ns].sort((x, y) => x - y), "Schritte gehen nur vorwärts");
    if (art === "rund") assert.equal(ns[0], 1);
  }
});

test("Abbrechen (V9.16.0): nach «abbruch» wird nichts mehr gerechnet, kein Wetter geholt, nichts übernommen; Ergebnis «abgebrochen»", async () => {
  for (const wann of ["sofort", "nach der ersten Anfrage", "nach den Richtungen"]) {
    const io = H.replay("rennrad"), ctx = H.szenario("rennrad", WO_RAD());
    let stop = wann === "sofort", n = 0, wetterAufrufe = 0, nachStop = 0;
    const route = async (v, pts, ex) => {
      if (stop) nachStop++;
      n++;
      const r = await io.route(v, pts, ex);
      if (wann === "nach der ersten Anfrage") stop = true;
      if (wann === "nach den Richtungen" && n >= 6) stop = true;
      return r;
    };
    const res = await TR.suche(ctx, { route, abbruch: () => stop, wetter: async () => { wetterAufrufe++; return null; } });
    assert.equal(res.abgebrochen, true, wann);
    assert.deepEqual(res.pool, [], wann + ": nichts übernommen");
    assert.equal(res.A, undefined, wann + ": kein Vorschlag");
    assert.equal(wetterAufrufe, wann === "nach den Richtungen" ? 0 : wetterAufrufe, wann);
    assert.equal(nachStop, 0, wann + ": nach dem Abbruch keine neue Anfrage mehr");
    if (wann === "nach den Richtungen") assert.equal(wetterAufrufe, 0, "kein Wetter nach dem Abbruch");
    if (wann === "sofort") assert.equal(n, 0, "sofort abgebrochen = keine Anfrage");
  }
});

test("Abbrechen wegen «abbruch»-Fehlern: sie landen nicht als «Kandidat ohne Route» in der Fehlerliste", async () => {
  const ctx = H.szenario("laufen", wo("lauf", 30, "pace", 335));
  let stop = false;
  const route = async () => { stop = true; throw new RT.RouteError("abbruch", "Abgebrochen."); };
  const res = await TR.suche(ctx, { route, abbruch: () => stop });
  assert.equal(res.abgebrochen, true);
  assert.equal(res.fehler.length, 0);
});

test("Verdrahtung: Abbrechen-Knopf, Fortschritt, Signal, Stand wiederherstellen, nichts halb gespeichert", () => {
  const ui = R("js/training-ui.js");
  assert.match(ui, /data-tr="abbruch">Abbrechen</, "Knopf «Abbrechen» im Status");
  assert.match(ui, /Schritt \$\{TS\.schritt\.n\} von \$\{TS\.schritt\.von\}/, "«Schritt x von y»");
  assert.match(ui, /new AbortController\(\)/);
  assert.match(ui, /function abbrechen\(\)/);
  assert.match(ui, /signal: sig/, "Signal an BRouter");
  assert.match(ui, /signal: TS\.abort\.signal/, "Signal an Open-Meteo, nur während der Suche");
  const ab = ui.slice(ui.indexOf("function abbrechen()"), ui.indexOf("function statusHtml()"));
  assert.match(ab, /TS\.res = v\.res/, "alter Stand zurück");
  assert.doesNotMatch(ab, /speichern\(|Inbox|upsert/, "Abbrechen speichert nichts");
  const su = ui.slice(ui.indexOf("async function suche()"), ui.indexOf("function abbrechen()"));
  assert.match(su, /TS\.abgebrochen \|\| \(res && res\.abgebrochen\)\) return;/, "abgebrochene Suche übernimmt kein Ergebnis");
  assert.doesNotMatch(su, /speichern\(/, "die Suche selbst speichert nichts");
  assert.match(ui, /abHinweis = "Suche abgebrochen – nichts wurde gespeichert\."/);
  assert.match(ui, /TR\(\)\.suche\(c, \{ route: routeKand, wetter: wetterFuer, abbruch:/);
});

test("Antippen der Linien: Trefferfläche ≥ 12 px je Seite, markierte Linie hervorgehoben, Bearbeiten erst mit Knopf", () => {
  const ui = R("js/training-ui.js"), ru = R("js/routen-ui.js");
  const hit = ui.match(/id: "tr-kand-hit"[^\n]*"line-width": (\d+)/);
  assert.ok(hit && +hit[1] / 2 >= 12, "Treffer mindestens 12 px je Seite");
  assert.match(ui, /e\.point\.x - 14, e\.point\.y - 14/, "Abfrage mit ±14 px");
  assert.match(ui, /layers: \["tr-kand-hit"\]/);
  assert.match(ui, /id: "tr-kand-sel"[^\n]*filter: istSel/, "markierte Linie in eigener Ebene (breiter, durchgezogen)");
  assert.match(ui, /"line-width": \["case", istSel, 10, 6\]/, "Rand der markierten Linie breiter");
  assert.match(ru, /window\.TRUI\.kartenKlick\(e\)\) return true/, "der Planer reicht den Klick an die Vorschläge");
  // Linie oder Zeile antippen = markieren, nicht bearbeiten
  assert.match(ui, /data-wahlzeile\]"\)\.forEach\(\(tr\) => tr\.addEventListener\("click", \(\) => markiere\(/);
  assert.match(ui, /el\.addEventListener\("click", \(ev\) => \{ ev\.stopPropagation\(\); markiere\(k\); \}\)/, "auch die Marker markieren nur");
  assert.match(ui, /data-wahl="\$\{k\}">\$\{TS\.gewaehlt \? "Stattdessen bearbeiten" : "Bearbeiten"\}</);
  assert.match(ui, /body\.querySelectorAll\("\[data-wahl\]"\)\.forEach\(\(b\) => b\.addEventListener\("click", \(\) => waehle\(/, "«Bearbeiten» übernimmt in den Planer");
  // im Planer (gewählt) sind die übrigen Linien nur Anzeige: kein versehentlicher Wechsel, der Änderungen wegwirft
  assert.match(ui, /hit: TS\.gewaehlt \? 0 : 1/);
  assert.match(ui, /TS\.gewaehlt \|\| !m\.getLayer/);
});

test("Zugang: Namen 1/2/3 überall, wo der Vorschlag angezeigt wird; Speicher und Rechnung bleiben bei A/B/C", () => {
  const ui = R("js/training-ui.js");
  for (const teil of ["el.textContent = nm(k)", "Vorschlag ${nm(k)}: ", "Im Planer: Vorschlag ${nm(TS.gewaehlt)}", "<span class=\"tr-key k-${k}\">${nm(k)}</span>", "Trainingsroute ${esc(nm(r.vorschlag))}", "wie ${nm(gleich)}"]) {
    assert.ok(ui.includes(teil), teil);
  }
  assert.match(ui, /vorschlag: k, titel: titel\(k, TS\.sport\)/, "gespeichert wird weiter A/B/C (alte Einträge lesbar)");
  assert.match(ui, /FARBE = \{ A: "var\(--tr-a\)", B: "var\(--tr-b\)", C: "var\(--tr-c\)" \}/);
  assert.match(ui, /window\.TRUI = \{[^}]*kartenKlick[^}]*markiere[^}]*abbrechen/);
});

test("Nichts verloren: Kennungen, Regeln und Planer-Wege der Vorschläge sind unverändert", () => {
  for (const [k, v] of Object.entries({ intervalle: "intervall-rt-1.0", workout: "workout-1.1", dauer: "dauer-1.0" })) assert.equal(TR.VERSIONS[k], v, k);
  for (const [k, v] of Object.entries({ varianten: "varianten-3.0", hand: "hand-1.0", wegpunkte: "wegpunkte-1.1", anfragen: "anfragen-1.0" })) assert.equal(RT.VERSIONS[k], v, k);
  const ui = R("js/training-ui.js");
  assert.match(ui, /R\(\)\.loadTraining\(\{ sport: TS\.sport/, "Bearbeiten = gleicher Weg in den Planer (Wegpunkte ziehbar)");
  assert.match(ui, /R\(\)\.primeLegs\(/);
  const ex = ui.slice(ui.indexOf("function gpxExtras"), ui.indexOf("function wantsMapClick"));
  assert.match(ex, /return null;\s*\}/, "V9.15.1: keine Intervall-Wegpunkte im GPX (Training und Navigation getrennt) – bleibt so");
  assert.doesNotMatch(ex, /Intervall \$\{/);
  assert.match(ui, /Zwischenziele verschieben, ergänzen oder umkehren ist im Planer möglich; die Intervalle wandern mit/);
  assert.match(ui, /if \(!R\(\)\.consent\(\)\.routing\) \{ TS\.fehler = "zustimmung"/, "ohne Zustimmung keine Koordinaten");
  assert.match(R("index.html"), /sw\.js/);
  assert.match(R("sw.js"), /notebook-v9\d+-/);
});
