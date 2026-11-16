/* Ironman Notebook V7.2 – Schwimmen (Rechenlogik ohne DOM, Wünsche vom 16.11.2026):
   - uebungen-2.0: Technikübungen mit Zweck, Ablauf, worauf achten, typischen Fehlern, Hilfsmitteln (nötig/freiwillig) und Dosierung, in eigenen Worten.
     Hilfsmittel wie zu Hause: Brett (Kickboard), Pullbuoy, Flossen, Paddles. Zuordnung von Übungsnamen aus Workouts über normalisierte Namen und Synonyme.
   - schwimmeinheit-1.0: eigene Schwimm-Einheiten mit Serien wie im Becken – Einschwimmen, Technikübungen, Beine, Hauptserie, Pull, Ausschwimmen –
     in Metern und Bahnen (Beckenlänge 25 oder 50 m), Pausen am Beckenrand, Tempo aus dem CSS-Test (sonst Anstrengung nach Gefühl, RPE 1–10, nie ein
     geratenes Tempo). Der Umfang (Meter für die geplante Zeit) wird mit dem CSS bzw. ≈ mit deinem Tempo aus Becken-Einheiten bemessen und ist immer «≈».
   Eigene Festlegungen, keine Studienvorgaben; Texte eigen (nichts aus Apps oder Webseiten übernommen). */
(function (root, factory) {
  const SW = factory();
  if (typeof module === "object" && module.exports) module.exports = SW;
  if (root) root.SW = SW;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const SW = { VERSIONS: { uebungen: "uebungen-2.0", einheit: "schwimmeinheit-1.0" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const mmss = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  SW.mmss = mmss;

  /* ---------------- Hilfsmittel ---------------- */
  SW.HILFSMITTEL = { brett: "Brett", pullbuoy: "Pullbuoy", flossen: "Flossen", paddles: "Paddles", schnorchel: "Frontschnorchel" };
  /** Garmin equipment_type → eigener Schlüssel. */
  SW.GARMIN_GERAET = { kickboard: "brett", pull_buoy: "pullbuoy", fins: "flossen", paddles: "paddles", snorkel: "schnorchel" };
  SW.SCHWERPUNKTE = { lage: "Wasserlage", rotation: "Rotation", rueckholung: "Rückholung und Eintauchen", fassen: "Wasserfassung", atmung: "Atmung",
    beine: "Beinschlag", kraft: "Kraft im Zug", rhythmus: "Rhythmus und Tempo", freiwasser: "Freiwasser" };

  /* ---------------- Übungen (uebungen-2.0) ---------------- */
  // h: { noetig: [...], frei: [...] } · s: Schwerpunkte · dos: übliche Dosierung (eigene Festlegung)
  SW.UEBUNGEN = [
    { id: "abschlag", name: "Abschlagschwimmen", syn: ["abschlag", "catch up", "catchup", "abklatschen", "abschlagkraul"], s: ["lage", "rotation", "rhythmus"],
      zweck: "Langer Zug und eine kurze Gleitphase: ein Arm wartet vorne, bis der andere ankommt. Ordnet das Timing der Arme und zeigt, ob du vorne schulterbreit eintauchst.",
      ablauf: ["Beide Arme vorne gestreckt, Blick zum Beckenboden.", "Ein Arm zieht durch und kommt über Wasser zurück nach vorne.", "Erst wenn die Hand die wartende Hand berührt, startet der andere Arm."],
      achten: ["Wartende Hand vor der Schulter, nicht vor dem Kopf (nicht über die Mitte kreuzen)", "Beim Zug über die Hüfte rollen, Kopf bleibt ruhig", "Unter Wasser gleichmässig ausatmen"],
      fehler: ["Vorderer Arm sinkt ab", "Kopf hebt sich beim Atmen", "Beine hören auf zu schlagen"],
      h: { noetig: [], frei: ["flossen"] }, dos: "4–6 × 25–50 m, 15 s Pause" },
    { id: "reissverschluss", name: "Reissverschluss", syn: ["reissverschluss", "zipper", "daumen hochziehen", "daumen entlang"], s: ["rueckholung", "rotation"],
      zweck: "Hoher Ellbogen und lockere Rückholung: die Hand gleitet nah am Körper nach vorne statt in einem weiten Bogen. Schont die Schulter und hilft beim geraden Eintauchen.",
      ablauf: ["Nach dem Zug den Daumen an der Körperseite hochziehen, als ob du einen Reissverschluss schliesst.", "Bis zur Achsel ziehen, der Ellbogen zeigt zur Decke.", "Unterarm locker nach vorne schwingen und vor der Schulter eintauchen."],
      achten: ["Ellbogen führt, die Hand hängt entspannt darunter", "Schulter rollt mit aus dem Wasser (Rotation)", "Eintauchen schulterbreit, Fingerspitzen zuerst"],
      fehler: ["Hand weit weg vom Körper", "Arm gestreckt seitlich nach vorne", "Kopf dreht mit der Hand mit"],
      h: { noetig: [], frei: ["flossen"] }, dos: "4–6 × 25 m, 10–15 s Pause" },
    { id: "fingerspitzen", name: "Fingerspitzen ziehen", syn: ["fingerspitzen", "fingertip", "finger ziehen", "fingertip drag"], s: ["rueckholung"],
      zweck: "Wie der Reissverschluss, aber die Fingerspitzen streifen über die Wasseroberfläche: kontrolliert, dass der Ellbogen in der Rückholung oben bleibt.",
      ablauf: ["Ellbogen nach dem Zug zuerst aus dem Wasser heben.", "Fingerspitzen locker über die Oberfläche nach vorne ziehen.", "Vor der Schulter eintauchen und lang machen."],
      achten: ["Ellbogen höher als die Hand", "Schultern locker, nicht hochziehen", "Ruhiger Rhythmus, nicht hetzen"],
      fehler: ["Hand hebt sich weit aus dem Wasser", "Eintauchen vor dem Kopf"], h: { noetig: [], frei: ["flossen"] }, dos: "4 × 25 m, 15 s Pause" },
    { id: "hundepaddeln", name: "Hundepaddeln", syn: ["hundepaddeln", "hunde paddeln", "hundepaddel", "dog paddle", "doggy paddle", "unterwasser rueckholung"], s: ["fassen"],
      zweck: "Kraul mit kurzer Rückholung unter Wasser: nur der vordere Teil des Zugs. Lässt dich spüren, wie Unterarm und Hand früh Wasser fassen.",
      ablauf: ["Mit Flossen in Bauchlage, Kopf ruhig, Blick nach unten.", "Abwechselnd kurze Züge vor dem Kopf bis unter die Brust.", "Hand unter Wasser wieder nach vorne schieben, Ellbogen bleibt hoch."],
      achten: ["Ellbogen über der Hand, Unterarm zeigt früh nach unten", "Druck an Hand und Unterarm spüren", "Ruhig weiteratmen, Beine schlagen gleichmässig"],
      fehler: ["Mit gestrecktem Arm drücken", "Hände kreuzen unter dem Körper"], h: { noetig: ["flossen"], frei: [] }, dos: "4 × 25 m, 15 s Pause" },
    { id: "gleiten", name: "Gleiten nach jedem Zug", syn: ["gleiten", "glide", "gleitphase", "gleitzug"], s: ["lage", "rotation"],
      zweck: "Nach jedem Zug kurz in Seitlage gleiten: Streckung, Rumpfspannung und eine stabile Wasserlage.",
      ablauf: ["Normal kraulen.", "Nach jedem Zug 1–2 Sekunden in Seitlage bleiben, vorderer Arm lang.", "Erst dann den nächsten Zug beginnen."],
      achten: ["Hüfte bleibt oben, Bauch leicht anspannen", "Vorderer Arm schulterbreit und lang", "Beinschlag läuft weiter"],
      fehler: ["Gleiten auf dem Bauch statt in Seitlage", "Vorderer Arm drückt nach unten"], h: { noetig: [], frei: ["flossen"] }, dos: "4 × 50 m, 15 s Pause" },
    { id: "faust", name: "Faustschwimmen", syn: ["faust", "fist", "faustschwimmen", "fist drill"], s: ["fassen", "kraft"],
      zweck: "Mit geschlossener Faust bleibt nur der Unterarm als Paddel: zwingt zu hohem Ellbogen und früher Wasserfassung.",
      ablauf: ["Hände zur Faust schliessen und normal kraulen.", "Unterarm früh senkrecht stellen.", "Die letzte Bahn mit offener Hand: Unterschied spüren."],
      achten: ["Ellbogen über der Hand", "Ruhig bleiben, Tempo nicht erzwingen", "Zug bis zur Hüfte durchziehen"], fehler: ["Ellbogen fällt zuerst", "Zu schnelle Armfrequenz"],
      h: { noetig: [], frei: [] }, dos: "4 × 25–50 m, letzte mit offener Hand" },
    { id: "seitlage", name: "Seitlage 6-1-6", syn: ["seitlage", "6 1 6", "616", "side kick", "seitliche lage", "6-1-6"], s: ["rotation", "lage", "atmung"],
      zweck: "Rotation über die Längsachse und Balance: lange auf der Seite liegen, dann mit einem Zug auf die andere Seite rollen.",
      ablauf: ["Auf der Seite liegen, unterer Arm vorne lang, Gesicht nach unten.", "6 ruhige Beinschläge, zum Atmen nur den Kopf drehen.", "Ein Zug, über die Hüfte auf die andere Seite rollen, wieder 6 Beinschläge."],
      achten: ["Schulter und Hüfte rollen gemeinsam", "Unterer Arm gleitet, drückt nicht nach unten", "Kopf in Verlängerung der Wirbelsäule"],
      fehler: ["Nur der Kopf dreht", "Beine sinken (dann Flossen nehmen)"], h: { noetig: [], frei: ["flossen"] }, dos: "4 × 50 m, 20 s Pause" },
    { id: "einarmig", name: "Einarmig kraulen", syn: ["einarmig", "single arm", "one arm", "ein arm"], s: ["rotation", "fassen", "atmung"],
      zweck: "Zug und Rotation je Seite einzeln: zeigt Unterschiede zwischen links und rechts.",
      ablauf: ["Ein Arm bleibt vorne lang (leichter) oder an der Seite (schwerer).", "Nur der andere Arm zieht; die Hüfte rollt bei jedem Zug mit.", "Nach 25 m Seite wechseln."],
      achten: ["Zug unter dem Körper bis zur Hüfte", "Rotation auch zur Seite ohne Zug", "Atmen zur Seite des ziehenden Arms"], fehler: ["Flach liegen ohne Rotation", "Kopf hebt sich"],
      h: { noetig: [], frei: ["flossen"] }, dos: "4 × 25 m je Seite" },
    { id: "schulter_tippen", name: "Schulter tippen", syn: ["schulter tippen", "shoulder tap", "schultertippen"], s: ["rotation", "rueckholung"],
      zweck: "Bei der Rückholung kurz mit der Hand die eigene Schulter berühren: lockere, körpernahe Rückholung mit genug Rotation.",
      ablauf: ["Nach dem Zug die Hand zur gleichen Schulter führen und kurz antippen.", "Dann vor der Schulter eintauchen.", "Gleichmässig weiterkraulen."],
      achten: ["Ellbogen hoch, Hand nah am Körper", "Rotation über die Hüfte"], fehler: ["Hektischer Rhythmus", "Eintauchen über der Mitte"],
      h: { noetig: [], frei: ["flossen"] }, dos: "4 × 25 m" },
    { id: "tarzan", name: "Kopf-hoch-Kraul", syn: ["tarzan", "kopf hoch", "head up", "wasserballkraul", "sighting", "orientieren"], s: ["freiwasser", "beine", "rhythmus"],
      zweck: "Kraulen mit den Augen knapp über Wasser: Orientieren im Freiwasser, kräftiger Beinschlag und schneller Rhythmus.",
      ablauf: ["Kopf so weit heben, dass die Augen über Wasser sind.", "Kürzere, kräftige Züge, Beine schlagen stärker.", "Im Wechsel: 4 Züge Kopf hoch, 8 Züge normal."],
      achten: ["Nur kurz hochschauen, dann wieder normal liegen", "Beim Hochschauen nicht atmen, erst danach seitlich"], fehler: ["Lange Kopf hoch: Beine sinken"],
      h: { noetig: [], frei: [] }, dos: "4 × 25–50 m, 20 s Pause" },
    { id: "atmung3", name: "Atmung im Dreierzug", syn: ["3er atmung", "dreier atmung", "atmung 3", "3er zug", "bilateral", "kontrollierte 3er atmung", "beidseitig atmen"], s: ["atmung", "lage"],
      zweck: "Abwechselnd links und rechts atmen: symmetrische Lage und Rotation, im Freiwasser auf beide Seiten orientieren.",
      ablauf: ["Unter Wasser durch Mund und Nase gleichmässig ausatmen.", "Mit der Rotation den Kopf drehen, ein Auge bleibt im Wasser.", "Alle drei Züge einatmen, abwechselnd links und rechts."],
      achten: ["Kopf drehen, nicht heben", "Ausatmen nie anhalten"], fehler: ["Luft anhalten und dann hektisch atmen", "Zur schwachen Seite zu weit drehen"],
      h: { noetig: [], frei: ["flossen"] }, dos: "beliebig als Teil der Serie" },
    { id: "atmung5", name: "Atmung im Fünferzug", syn: ["5er atmung", "fuenfer atmung", "funfer atmung", "atmung 5", "hypoxie"], s: ["atmung", "rhythmus"],
      zweck: "Längeres, ruhiges Ausatmen: hilft gegen hektisches Atmen. Nur locker schwimmen.",
      ablauf: ["Ruhig ausatmen, alle fünf Züge einatmen.", "Nach 25 m wieder normal atmen."], achten: ["Gleichmässig ins Wasser ausatmen, die Luft nie anhalten", "Nie pressen, nie bis an die Grenze; bei Unwohlsein sofort normal atmen und nie allein üben"], fehler: ["Zu schnell schwimmen"],
      h: { noetig: [], frei: [] }, dos: "2–4 × 25 m locker" },
    { id: "wriggen", name: "Wriggen vorne", syn: ["wriggen", "scull", "sculling", "skulling", "paddeln vorne"], s: ["fassen"],
      zweck: "Mit kleinen Achterbewegungen der Hände vor dem Kopf Druck am Wasser spüren – das Gefühl für die Fangphase.",
      ablauf: ["In Bauchlage, Arme vorne schulterbreit, Ellbogen leicht über den Händen.", "Hände in kleinen Achten nach aussen und innen bewegen.", "Langsam vorwärts kommen, Beine ruhig oder mit Pullbuoy."],
      achten: ["Bewegung aus dem Unterarm, nicht aus der Schulter", "Handflächen leicht angestellt"], fehler: ["Grosse Bewegungen", "Kopf hoch"],
      h: { noetig: [], frei: ["pullbuoy"] }, dos: "4 × 25 m, 20 s Pause" },
    { id: "beine_brett", name: "Kraulbeine mit Brett", syn: ["beine brett", "brett beine", "kick brett", "kickboard", "kraulbeine", "beinschlag brett", "beine mit brett"], s: ["beine", "lage"],
      zweck: "Beinschlag aus der Hüfte üben: lockere Knöchel, kleine schnelle Schläge – trägt die Wasserlage.",
      ablauf: ["Brett vorne mit gestreckten Armen halten.", "Aus der Hüfte schlagen, Knie nur leicht beugen.", "Gesicht im Wasser und ausatmen, zum Atmen kurz vorne heben."],
      achten: ["Füsse locker, Zehen gestreckt", "Kleine Ausschläge, Füsse brechen gerade die Oberfläche"], fehler: ["Velofahren mit den Knien", "Steife Fussgelenke"],
      h: { noetig: ["brett"], frei: ["flossen"] }, dos: "4–6 × 50 m, 20 s Pause" },
    { id: "beine_seitlage", name: "Beine in Seitlage", syn: ["beine seitlage", "seitlage beine", "seitenlage beine", "beine auf der seite", "kraulbeine auf der seite", "kraulbeine seitlage", "beinschlag auf der seite"], s: ["beine", "rotation", "lage"],
      zweck: "Beinschlag auf der Seite: Balance über die Längsachse und Beinschlag in alle Richtungen.",
      ablauf: ["Auf der Seite, unterer Arm vorne lang, oberer an der Hüfte.", "Kleine Beinschläge, zum Atmen Kopf drehen.", "Nach 25 m Seite wechseln."], achten: ["Hüfte bleibt seitlich, kippt nicht", "Kopf liegt auf dem unteren Arm, nur zum Atmen drehen", "Beinschlag klein und schnell, nicht nur nach vorne"],
      fehler: ["Auf den Bauch kippen"], h: { noetig: [], frei: ["flossen"] }, dos: "4 × 25 m je Seite" },
    { id: "rueckenbeine", name: "Rückenbeine", syn: ["rueckenbeine", "rucken beine", "ruecken beine", "back kick", "beine ruecken"], s: ["beine", "lage"],
      zweck: "Beinschlag in Rückenlage mit langen Armen: gerade Lage und Beinschlag ohne Brett.",
      ablauf: ["Rückenlage, Arme über dem Kopf lang oder an der Seite.", "Kleine Beinschläge aus der Hüfte.", "Knie bleiben unter der Oberfläche."], achten: ["Hüfte oben, Bauch leicht angespannt", "Kinn leicht zur Brust, Blick nach oben", "Zehen locker, kein Fahrradfahren mit den Knien"],
      fehler: ["Sitzen im Wasser", "Knie stechen aus dem Wasser"], h: { noetig: [], frei: ["flossen"] }, dos: "4 × 50 m" },
    { id: "delfinbeine", name: "Delfinbeine", syn: ["delfin", "delphin", "dolphin kick", "delfinbeine", "delphinbeine"], s: ["beine", "lage"],
      zweck: "Wellenbewegung aus dem Rumpf: Rumpfspannung und kräftiger Abstoss von der Wand.",
      ablauf: ["Arme vorne lang oder mit Brett.", "Welle aus Brust und Hüfte bis in die Füsse.", "Beide Beine gleichzeitig."], achten: ["Bewegung beginnt im Rumpf, nicht in den Knien", "Kleine Welle, Kopf bleibt ruhig zwischen den Armen", "Mit Flossen leichter; ohne nur kurze Strecken"],
      fehler: ["Nur aus den Knien schlagen"], h: { noetig: [], frei: ["flossen", "brett"] }, dos: "4 × 25 m mit Flossen" },
    { id: "senkrecht", name: "Senkrechte Beine", syn: ["senkrecht", "vertikal", "vertical kick", "senkrechte beine"], s: ["beine", "kraft"],
      zweck: "Im tiefen Wasser senkrecht kraulbeine schlagen: Kraft und Beinschlag aus der Hüfte.",
      ablauf: ["Im tiefen Bereich senkrecht im Wasser, Arme vor der Brust gekreuzt.", "Kraulbeine, so dass der Kopf über Wasser bleibt.", "20–30 Sekunden, dann Pause."],
      achten: ["Aufrecht bleiben, nicht nach vorne kippen", "Schnelle, kurze Schläge aus der Hüfte, Knie wenig beugen", "Nur im tiefen Wasser, wo du nicht stehen kannst"], fehler: ["Velofahren mit den Knien"], h: { noetig: [], frei: ["flossen"] }, dos: "4–6 × 20–30 s" },
    { id: "pull", name: "Pull mit Pullbuoy", syn: ["pull", "pullbuoy", "pull buoy", "pullboy", "zugbeine", "arme", "nur arme", "armzug"], s: ["kraft", "rotation", "fassen"],
      zweck: "Armzug und Rumpf ohne Beinschlag: die Beine liegen auf dem Pullbuoy hoch, du kannst dich auf Zug und Rotation konzentrieren.",
      ablauf: ["Pullbuoy zwischen die Oberschenkel klemmen.", "Normal kraulen, Beine ruhig.", "Über die Hüfte rollen, damit die Beine nicht pendeln."],
      achten: ["Rumpf fest, Beine nicht seitlich pendeln", "Langer Zug bis zur Hüfte"], fehler: ["Hohlkreuz", "Ohne Rotation flach ziehen"],
      h: { noetig: ["pullbuoy"], frei: ["paddles"] }, dos: "4–8 × 100 m, 20 s Pause" },
    { id: "paddles", name: "Kraul mit Paddles", syn: ["paddles", "paddle", "handpaddel", "hand paddles", "paddel"], s: ["kraft", "fassen"],
      zweck: "Mehr Fläche an der Hand: Kraft im Zug, und ein unsauberer Zug wird sofort spürbar (das Paddel kippt).",
      ablauf: ["Paddles nur mit dem Finger-Gummi anziehen (ohne Handgelenk-Gummi spürst du Fehler besser).", "Ruhig kraulen, Fangphase bewusst.", "Mit Pullbuoy kombinierbar."],
      achten: ["Nur mit sauberer Technik und ohne Schulterschmerzen", "Kleine Paddles, wenige Wiederholungen am Anfang"], fehler: ["Paddel kippt: Hand taucht schief ein", "Zu hohe Armfrequenz"],
      h: { noetig: ["paddles"], frei: ["pullbuoy"] }, dos: "4–6 × 100 m, 20 s Pause" },
    { id: "flossen", name: "Kraul mit Flossen", syn: ["flossen", "fins", "kraul flossen", "mit flossen"], s: ["lage", "rhythmus"],
      zweck: "Mit Flossen liegst du höher und schneller: Technik bei höherem Tempo üben, Beine entlasten oder Übungen leichter machen.",
      ablauf: ["Kurze Trainingsflossen anziehen.", "Ruhiger Beinschlag aus der Hüfte.", "Saubere Züge im höheren Tempo."], achten: ["Nicht nur aus den Beinen schwimmen", "Kurze Trainingsflossen, keine langen Tauchflossen", "Ruhiger Beinschlag, Füsse locker gestreckt"],
      fehler: ["Grosse, langsame Beinschläge"], h: { noetig: ["flossen"], frei: [] }, dos: "4 × 100 m, 20 s Pause" },
    { id: "steigerung", name: "Steigerungen", syn: ["steigerung", "steigerungen", "build", "aufbauend", "progressiv"], s: ["rhythmus"],
      zweck: "Jede Bahn von locker bis zügig: Tempo aufbauen, ohne die Technik zu verlieren – gut vor schnellen Serien.",
      ablauf: ["Locker beginnen.", "Alle 10 m etwas zügiger.", "Die letzten Meter zügig, aber sauber."], achten: ["Zugzahl bleibt fast gleich", "Schneller durch den kräftigeren Zug, nicht durch hektische Arme", "Atmung bleibt im Rhythmus"], fehler: ["Am Anfang zu schnell"],
      h: { noetig: [], frei: [] }, dos: "4 × 25–50 m, 20 s Pause" },
  ];
  const BY = new Map(SW.UEBUNGEN.map((u) => [u.id, u]));
  SW.uebung = (id) => BY.get(id) || null;
  /** Name normalisieren: Kleinbuchstaben, ß → ss, Umlaute → ae/oe/ue, alles ausser Buchstaben und Ziffern → Leerzeichen. */
  SW.norm = (t) => String(t || "").toLowerCase().replace(/ß/g, "ss").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/₂/g, "2")
    .replace(/[^a-z0-9]+/g, " ").trim();
  /** Übung zu einem Namen (Workout-Schritt, Bibliothek): exakter Name oder Synonym, sonst Synonym als ganze Wörter im Namen; sonst null. */
  SW.finde = function (name) {
    const n = SW.norm(name); if (!n) return null;
    for (const u of SW.UEBUNGEN) if (SW.norm(u.name) === n || u.syn.some((x) => SW.norm(x) === n)) return u;
    const w = ` ${n} `;
    let best = null, len = 0;
    for (const u of SW.UEBUNGEN) for (const x of u.syn) { const k = SW.norm(x); if (k.length >= 4 && w.includes(` ${k} `) && k.length > len) { best = u; len = k.length; } }
    return best;
  };
  /** Übungen gefiltert: f = { hilfsmittel: "brett" | "ohne" | null, schwerpunkt: Schlüssel | null }. */
  SW.filtern = function (f) {
    f = f || {};
    return SW.UEBUNGEN.filter((u) => (!f.schwerpunkt || u.s.includes(f.schwerpunkt))
      && (!f.hilfsmittel || (f.hilfsmittel === "ohne" ? !u.h.noetig.length : u.h.noetig.includes(f.hilfsmittel) || u.h.frei.includes(f.hilfsmittel))));
  };

  /* ---------------- Eigene Schwimm-Einheiten (schwimmeinheit-1.0) ---------------- */
  // Wechselnde Übungen je Woche: aus drei Gruppen je eine (Rotation/Lage, Rückholung oder Wasserfassung, Atmung/Rhythmus)
  const GRUPPEN = [["seitlage", "abschlag", "gleiten", "einarmig", "schulter_tippen"], ["reissverschluss", "hundepaddeln", "fingerspitzen", "faust", "wriggen"],
    ["atmung3", "tarzan", "abschlag", "einarmig", "faust"]];
  SW.uebungenDerWoche = function (nr, anzahl) {
    const k = Math.abs(Math.round(nr || 0)), out = [];
    for (let g = 0; out.length < (anzahl || 3) && g < 6; g++) {
      const L = GRUPPEN[g % 3], id = L[(k + g) % L.length];
      if (!out.includes(id)) out.push(id);
    }
    return out;
  };
  /** Tempo je Bereich in s/100 m: mit CSS aus dem Test (Annahmen wie im Wochenvorschlag: Z2 = CSS + 8–12 s, locker = CSS + 15–20 s), sonst null. */
  SW.tempo = function (zone, css) {
    if (!isNum(css)) return null;
    return { z1: [css + 15, css + 20], z2: [css + 8, css + 12], css: [css, css], z3: [css + 2, css + 5], tech: null, max: null }[zone] || null;
  };
  const RPE = { z1: "locker, RPE 2–3/10", z2: "ruhig und gleichmässig, RPE 4–5/10", z3: "zügig, RPE 6/10", css: "hart, aber gleichmässig haltbar, RPE 7/10", tech: "langsam und sauber, RPE 2–3/10", max: "maximal gleichmässig, RPE 9–10/10" };
  const ZONE_NAME = { z1: "Z1 locker", z2: "Z2 Grundlage", z3: "Z3 zügig", css: "CSS", tech: "Technik", max: "Test" };
  /** Ein Teil: { wdh, m, zone, pause_s, text, uebung, hilfsmittel, zuende_m } → mit Tempo-/RPE-Text und Dauer ≈ (s). */
  function teil(t, pace) {
    const p = SW.tempo(t.zone, pace.css), ref = isNum(pace.css) ? (p ? (p[0] + p[1]) / 2 : pace.css + 20) : pace.ref;
    const fakt = t.zone === "tech" ? 1.2 : 1, schwimm = isNum(ref) ? (t.m + (t.zuende_m || 0)) / 100 * ref * fakt : null;
    const wdh = t.wdh || 1, dauer = isNum(schwimm) ? wdh * schwimm + Math.max(0, wdh - 1) * (t.pause_s || 0) + (wdh > 1 ? 0 : 0) : null;
    return Object.assign({ wdh }, t, {
      zone_name: ZONE_NAME[t.zone] || t.zone,
      tempo: p ? (p[0] === p[1] ? `${mmss(p[0])}/100 m` : `${mmss(p[0])}–${mmss(p[1])}/100 m`) : null,
      rpe: RPE[t.zone] || null,
      dauer_s: isNum(dauer) ? Math.round(dauer + (t.pause_s || 0)) : null,   // mit allen Pausen (für die Summe)
      schwimm_s: isNum(schwimm) ? Math.round(wdh * schwimm) : null,            // nur die Schwimmzeit (Anzeige)
    });
  }
  const r25 = (m) => Math.max(25, Math.round(m / 25) * 25);
  /**
   * Schwimm-Einheit für «Mein Plan». art: «locker» | «css» | «test» | «kurs»; o = { min, css_s, pool (25|50), ref_s (s/100 m aus Becken-Einheiten, nur
   * für den Umfang), woche (Nummer für die Übungswahl) }. → { v, art, pool, bloecke: [{ id, titel, teile }], meter, dauer_s, hilfsmittel, umfang_quelle }
   */
  SW.einheit = function (art, o) {
    o = o || {};
    const pool = o.pool === 50 ? 50 : 25, min = isNum(o.min) && o.min > 0 ? o.min : 45, css = isNum(o.css_s) ? o.css_s : null;
    const ref = css ? css + 12 : isNum(o.ref_s) ? o.ref_s : null, pace = { css, ref };
    const T = min * 60, drill = (id, wdh) => { const u = SW.uebung(id);
      return { wdh, m: 25, zuende_m: pool === 50 ? 25 : 0, zone: "tech", pause_s: 15, text: u.name, uebung: id, hilfsmittel: u.h.noetig.slice(), frei: u.h.frei.slice() }; };
    const B = [];
    const add = (id, titel, teile) => B.push({ id, titel, teile: teile.map((t) => teil(t, pace)) });
    if (art === "kurs") {
      add("kurs", "Schwimmkurs", [{ wdh: 1, m: 0, zone: "z2", pause_s: 0, text: "Inhalt laut Kurs" }]);
    } else if (art === "test") {
      add("ein", "Einschwimmen", [{ wdh: 1, m: 300, zone: "z1", pause_s: 30, text: "Lockeres Einschwimmen, gemischt" }, { wdh: 4, m: 25, zone: "z3", pause_s: 20, text: "Steigerungen", uebung: "steigerung" }]);
      add("haupt", "Test", [{ wdh: 1, m: 400, zone: "max", pause_s: 120, text: "400 m maximal, gleichmässig einteilen – Zeit stoppen und merken" },
        { wdh: 1, m: 200, zone: "z1", pause_s: 120, text: "Erholung: locker schwimmen (mit den Pausen etwa 10 min bis zum 200er)" },
        { wdh: 1, m: 200, zone: "max", pause_s: 60, text: "200 m maximal – Zeit stoppen" }]);
      add("aus", "Ausschwimmen", [{ wdh: 1, m: 300, zone: "z1", pause_s: 0, text: "Locker ausschwimmen; beide Zeiten auf der Seite eintragen" }]);
    } else {
      const lang = T >= 55 * 60, kurz = T < 35 * 60;
      const ids = SW.uebungenDerWoche(o.woche, art === "css" || kurz ? 2 : 3);
      add("ein", "Einschwimmen", [{ wdh: 1, m: kurz ? 200 : lang ? 400 : 300, zone: "z1", pause_s: 30, text: "Locker einschwimmen, Kraul und Rücken gemischt" }]);
      add("technik", "Technikübungen", ids.map((id) => drill(id, 2)));
      if (art === "css") add("steig", "Steigerungen", [{ wdh: 4, m: 50, zone: "z3", pause_s: 20, text: "Steigerungen von locker bis zügig", uebung: "steigerung" }]);
      else if (!kurz) add("beine", "Beine", [{ wdh: 4, m: 50, zone: "z2", pause_s: 20, text: "Kraulbeine mit Brett", uebung: "beine_brett", hilfsmittel: ["brett"], frei: ["flossen"] }]);
      const aus = { wdh: 1, m: kurz ? 100 : 200, zone: "z1", pause_s: 0, text: "Locker ausschwimmen" };
      const pull = art !== "css" && lang ? { wdh: 4, m: 100, zone: "z2", pause_s: 20, text: "Pull mit Pullbuoy, Paddles nach Gefühl", uebung: "pull", hilfsmittel: ["pullbuoy"], frei: ["paddles"] } : null;
      const fix = B.reduce((s, b) => s + b.teile.reduce((x, t) => x + (t.dauer_s || 0), 0), 0) + teil(aus, pace).dauer_s + (pull ? teil(pull, pace).dauer_s : 0);
      const rest = isNum(ref) ? T - fix : null;
      let haupt;
      if (art === "css") {
        const rep = (css ? css : ref || 120) + 15, n = isNum(rest) ? Math.max(6, Math.min(16, Math.floor(rest / rep))) : 10;
        haupt = { wdh: n, m: 100, zone: "css", pause_s: 15, text: css ? "100 m im CSS-Tempo" : "100 m zügig (noch kein CSS-Test)" };
      } else {
        const L = T >= 60 * 60 ? 400 : T >= 40 * 60 ? 300 : 200, rep = isNum(ref) ? L / 100 * ref + 30 : null;
        const n = isNum(rest) && rep ? Math.max(1, Math.floor(rest / rep)) : Math.max(1, Math.round((T / 60 - 25) / 8));
        haupt = { wdh: n, m: L, zone: "z2", pause_s: 30, text: "Ruhig und gleichmässig, auf die Übungen achten" };
      }
      add("haupt", "Hauptserie", [haupt]);
      if (pull) add("pull", "Pull", [pull]);
      add("aus", "Ausschwimmen", [aus]);
    }
    let meter = 0, dauer = 0, offen = false; const hm = new Set(), frei = new Set();
    for (const b of B) for (const t of b.teile) {
      meter += (t.wdh || 1) * ((t.m || 0) + (t.zuende_m || 0)); if (isNum(t.dauer_s)) dauer += t.dauer_s; else offen = true;
      for (const h of t.hilfsmittel || []) hm.add(h); for (const h of t.frei || []) frei.add(h);
    }
    for (const h of hm) frei.delete(h);
    return { v: SW.VERSIONS.einheit, art, pool, bloecke: B, meter: art === "kurs" ? null : meter, dauer_s: offen || art === "kurs" ? null : Math.round(dauer),
      hilfsmittel: [...hm], frei: [...frei], umfang_quelle: css ? "CSS-Test" : isNum(o.ref_s) ? "≈ dein Tempo aus Becken-Einheiten (kein Tempoziel)" : null };
  };
  /** Baustein-ID des Wochenvorschlags → Art der Schwimm-Einheit. */
  SW.artVon = (id) => ({ schwimm_locker: "locker", schwimm_css: "css", test_css: "test", schwimm_kurs: "kurs" }[id] || "locker");
  /** Bahnen-Text: 25 m im 50-m-Becken = ½ L, 100 m = 2 L. */
  SW.bahnen = (m, pool) => { if (!isNum(m) || !m) return ""; const L = m / (pool || 25); return `${L === 0.5 ? "½" : Number.isInteger(L) ? L : L.toFixed(1)} L`; };
  /** Referenz-Tempo aus Becken-Einheiten (Bewegungszeit ÷ Strecke), Median der letzten 10 mit Strecke; unter 3 Einheiten null. */
  SW.refTempo = function (acts) {
    const L = (acts || []).filter((a) => a && a.sport === "schwimm" && !/freiwasser|open/i.test(a.typ || "") && a.km > 0.3 && (a.mv || a.dur))
      .sort((x, y) => String(x.date).localeCompare(String(y.date))).slice(-10).map((a) => (a.mv || a.dur) / (a.km * 10)).filter((p) => p >= 70 && p <= 300).sort((x, y) => x - y);
    if (L.length < 3) return null;
    const m = L.length % 2 ? L[(L.length - 1) / 2] : (L[L.length / 2 - 1] + L[L.length / 2]) / 2;
    return Math.round(m);
  };
  return SW;
});
