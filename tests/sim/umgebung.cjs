/* V8.0 Szenario-Simulator: lädt die echten Module der Seite (Rechenlogik und Plan-Oberfläche) ohne Browser in einen eigenen Kontext.
   Das DOM ist ein leerer Ersatz (keine Elemente: getElementById → null), damit Zeichenfunktionen nichts tun; gerechnet wird mit denselben
   Funktionen wie auf der Seite (V64UI.kontextFuer, V74UI, V66UI …). Daten: erfundener Athlet aus tests/sim/athlet.cjs. */
"use strict";
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const ROOT = path.resolve(__dirname, "..", "..");
/** Reihenfolge wie in index.html (nur, was Planen, Ampel und Last braucht). */
const MODULE = ["js/formkurve.js", "js/v61.js", "js/v62.js", "js/v59-logik.js", "js/training-route.js", "js/analyse.js", "js/v56.js", "js/v59.js", "js/v6.js", "js/v64.js",
  "js/wissen.js", "js/schwimmen.js", "js/v64-ui.js", "js/v65.js", "js/v66.js", "js/v66-ui.js", "js/v7.js", "js/v73.js", "js/v74.js", "js/v74-ui.js", "js/v75.js",
  "js/v75-ui.js", "js/v76.js", "js/v77.js", "js/v78.js", "js/v81.js", "js/verpflegung.js", "js/v82.js", "js/v83.js", "js/v83-ui.js", "js/v85.js", "js/v85-ui.js"];

function element() {
  const e = { style: {}, dataset: {}, children: [], hidden: false, innerHTML: "", textContent: "", value: "",
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {}, appendChild(c) { return c; }, append() {}, prepend() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }), focus() {}, scrollIntoView() {} };
  return e;
}

/** Neuer Kontext mit leerem DOM, eigenem localStorage und den Modulen. → { win, laden(datei) } */
function umgebung() {
  const hoerer = new Map();
  // Uhr des Simulators: new Date() und Date.now() liefern die gesetzte Zeit (uhr.setzen(ms)); alles andere wie Date
  const uhr = { ms: null, setzen(x) { this.ms = x; } };
  class SimDate extends Date {
    constructor(...a) { if (a.length === 0 && uhr.ms != null) super(uhr.ms); else super(...a); }
    static now() { return uhr.ms != null ? uhr.ms : Date.now(); }
  }
  const ls = new Map();
  const document = {
    readyState: "complete", body: element(), documentElement: element(), head: element(),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], getElementsByClassName: () => [],
    createElement: () => element(), createElementNS: () => element(), createTextNode: () => element(),
    addEventListener: (t, f) => { if (!hoerer.has(t)) hoerer.set(t, []); hoerer.get(t).push(f); },
    removeEventListener: (t, f) => { const L = hoerer.get(t) || []; const i = L.indexOf(f); if (i >= 0) L.splice(i, 1); },
    dispatchEvent: (ev) => { for (const f of (hoerer.get(ev.type) || []).slice()) { try { f(ev); } catch (e) { /* Zeichnen ohne DOM */ } } return true; },
  };
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
  const win = {
    console: { log() {}, info() {}, warn() {}, error: (...a) => { if (process.env.SIM_LAUT) console.error(...a); } },
    document, CustomEvent, Event: CustomEvent, navigator: { userAgent: "sim", onLine: false }, location: { hash: "", href: "sim://", search: "" },
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k), clear: () => ls.clear() },
    setTimeout: (f) => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), getComputedStyle: () => ({ getPropertyValue: () => "" }),
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, performance: { now: () => 0 },
    fetch: () => Promise.reject(new Error("kein Netz im Simulator")), crypto: globalThis.crypto, TextEncoder, TextDecoder,
    Intl, Date: SimDate, Math, JSON, Map, Set, WeakMap, Promise, Array, Object, Number, String, Boolean, RegExp, Error, Symbol, isFinite, isNaN, parseFloat, parseInt,
    structuredClone: globalThis.structuredClone, queueMicrotask, Blob: globalThis.Blob, URL,
  };
  win.window = win; win.self = win; win.globalThis = win; win.addEventListener = () => {}; win.removeEventListener = () => {}; win.dispatchEvent = () => true;
  const ctx = vm.createContext(win);
  const laden = (datei) => vm.runInContext(fs.readFileSync(path.join(ROOT, datei), "utf8"), ctx, { filename: datei });
  return { win, ctx, laden, hoerer, uhr };
}

module.exports = { umgebung, MODULE, ROOT };
