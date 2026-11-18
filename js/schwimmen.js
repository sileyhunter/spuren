/* Ironman Notebook V7.2 – Schwimmen (Rechenlogik ohne DOM, Wünsche vom 16.11.2026):
   - uebungen-2.0: Technikübungen mit Zweck, Ablauf, worauf achten, typischen Fehlern, Hilfsmitteln (nötig/freiwillig) und Dosierung, in eigenen Worten.
     Hilfsmittel wie zu Hause: Brett (Kickboard), Pullbuoy, Flossen, Paddles. Zuordnung von Übungsnamen aus Workouts über normalisierte Namen und Synonyme.
   - schwimmeinheit-1.0: eigene Schwimm-Einheiten mit Serien wie im Becken – Einschwimmen, Technikübungen, Beine, Hauptserie, Pull, Ausschwimmen –
     in Metern und Bahnen (Beckenlänge 25 oder 50 m), Pausen am Beckenrand, Tempo aus dem CSS-Test (sonst Anstrengung nach Gefühl, RPE 1–10, nie ein
     geratenes Tempo). Der Umfang (Meter für die geplante Zeit) wird mit dem CSS bzw. ≈ mit deinem Tempo aus Becken-Einheiten bemessen und ist immer «≈».
   - schwimmeinheit-1.2 (V7.5, Planeinstellungen): nur Übungen mit vorhandenen Hilfsmitteln; ohne Brett die Beine in Seitlage mit Flossen, ohne beides
     kein Beine-Block; ohne Pullbuoy kein Pull-Block (die Zeit geht in die Hauptserie); freiwillige Hilfsmittel nur, wenn vorhanden. Stile: Kraul immer;
     Rücken bzw. Brust (gewählt, abwechselnd je Woche) als eigener Teil am Ende des Ein- und des Ausschwimmens, mit diesem Stil auch auf der Uhr.
     Anfänger-Modus: nur einfache Übungen mit 15 s Pause, kürzere Wiederholungen (Hauptserie 100 m, CSS 50 m) mit längeren Pausen, Beine und
     Steigerungen 25 m, Pull 50 m. Die Technikübungen bleiben direkt nach dem Einschwimmen.
   Eigene Festlegungen, keine Studienvorgaben; Texte eigen (nichts aus Apps oder Webseiten übernommen). */
(function (root, factory) {
  const SW = factory();
  if (typeof module === "object" && module.exports) module.exports = SW;
  if (root) root.SW = SW;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const SW = { VERSIONS: { uebungen: "uebungen-2.1", einheit: "schwimmeinheit-1.2" } };
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const mmss = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  SW.mmss = mmss;

  /* ---------------- Hilfsmittel ---------------- */
  SW.HILFSMITTEL = { brett: "Brett", pullbuoy: "Pullbuoy", flossen: "Flossen", paddles: "Paddles", schnorchel: "Frontschnorchel" };
  /** Garmin equipment_type → eigener Schlüssel. */
  SW.GARMIN_GERAET = { kickboard: "brett", pull_buoy: "pullbuoy", fins: "flossen", paddles: "paddles", snorkel: "schnorchel" };
  SW.SCHWERPUNKTE = { lage: "Wasserlage", rotation: "Rotation", rueckholung: "Rückholung und Eintauchen", fassen: "Wasserfassung", atmung: "Atmung",
    beine: "Beinschlag", kraft: "Kraft im Zug", rhythmus: "Rhythmus und Tempo", freiwasser: "Freiwasser" };

  /* ---------------- Übungen (uebungen-2.1) ---------------- */
  // h: { noetig: [...], frei: [...] } · s: Schwerpunkte · dos: übliche Dosierung (eigene Festlegung)
  // 2.1 (V7.3.2): alle Kraul-Übungen aus Silas' Enduco-Einheiten (Liste vom 16.11.2026) – Namen, Strecke und nötige Hilfsmittel wie dort, Texte eigen
  SW.UEBUNGEN = [
    { id: "abschlag", name: "Abschlagschwimmen", syn: ["abschlag", "catch up", "catchup", "abklatschen", "abschlagkraul"], s: ["lage", "rotation", "rhythmus"],
      zweck: "Langer Zug und eine kurze Gleitphase: ein Arm wartet vorne, bis der andere ankommt. Ordnet das Timing der Arme und zeigt, ob du vorne schulterbreit eintauchst.",
      ablauf: ["Beide Arme vorne gestreckt, Blick zum Beckenboden.", "Ein Arm zieht durch und kommt über Wasser zurück nach vorne.", "Erst wenn die Hand die wartende Hand berührt, startet der andere Arm."],
      achten: ["Wartende Hand vor der Schulter, nicht vor dem Kopf (nicht über die Mitte kreuzen)", "Beim Zug über die Hüfte rollen, Kopf bleibt ruhig", "Unter Wasser gleichmässig ausatmen"],
      fehler: ["Vorderer Arm sinkt ab", "Kopf hebt sich beim Atmen", "Beine hören auf zu schlagen"],
      h: { noetig: ["flossen"], frei: [] }, dos: "4–6 × 25–50 m, 15 s Pause" },
    { id: "reissverschluss", name: "Reissverschluss", syn: ["reissverschluss", "zipper", "daumen hochziehen", "daumen entlang"], s: ["rueckholung", "rotation"],
      zweck: "Hoher Ellbogen und lockere Rückholung: die Hand gleitet nah am Körper nach vorne statt in einem weiten Bogen. Schont die Schulter und hilft beim geraden Eintauchen.",
      ablauf: ["Nach dem Zug den Daumen an der Körperseite hochziehen, als ob du einen Reissverschluss schliesst.", "Bis zur Achsel ziehen, der Ellbogen zeigt zur Decke.", "Unterarm locker nach vorne schwingen und vor der Schulter eintauchen."],
      achten: ["Ellbogen führt, die Hand hängt entspannt darunter", "Schulter rollt mit aus dem Wasser (Rotation)", "Eintauchen schulterbreit, Fingerspitzen zuerst"],
      fehler: ["Hand weit weg vom Körper", "Arm gestreckt seitlich nach vorne", "Kopf dreht mit der Hand mit"],
      h: { noetig: [], frei: ["flossen"] }, dos: "4–6 × 25 m, 10–15 s Pause" },
    { id: "fingerspitzen", name: "Fingerspitzen ziehen", syn: ["fingerspitzen", "fingertip", "finger ziehen", "fingertip drag", "fingerspitzen uebers wasser ziehen", "fingerspitzen ueber wasser"], s: ["rueckholung"],
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
    { id: "faust", name: "Faustschwimmen", syn: ["faust", "fist", "faustschwimmen", "fist drill", "kraul mit faeusten", "faeuste"], s: ["fassen", "kraft"],
      zweck: "Mit geschlossener Faust bleibt nur der Unterarm als Paddel: zwingt zu hohem Ellbogen und früher Wasserfassung.",
      ablauf: ["Hände zur Faust schliessen und normal kraulen.", "Unterarm früh senkrecht stellen.", "Die letzte Bahn mit offener Hand: Unterschied spüren."],
      achten: ["Ellbogen über der Hand", "Ruhig bleiben, Tempo nicht erzwingen", "Zug bis zur Hüfte durchziehen"], fehler: ["Ellbogen fällt zuerst", "Zu schnelle Armfrequenz"],
      h: { noetig: [], frei: [] }, dos: "4 × 25–50 m, letzte mit offener Hand" },
    { id: "seitlage", name: "Seitlage 6-1-6", syn: ["seitlage", "6 1 6", "616", "side kick", "seitliche lage", "6-1-6", "6 kick wechsel", "sechs kick wechsel"], s: ["rotation", "lage", "atmung"],
      zweck: "Rotation über die Längsachse und Balance: lange auf der Seite liegen, dann mit einem Zug auf die andere Seite rollen.",
      ablauf: ["Auf der Seite liegen, unterer Arm vorne lang, Gesicht nach unten.", "6 ruhige Beinschläge, zum Atmen nur den Kopf drehen.", "Ein Zug, über die Hüfte auf die andere Seite rollen, wieder 6 Beinschläge."],
      achten: ["Schulter und Hüfte rollen gemeinsam", "Unterer Arm gleitet, drückt nicht nach unten", "Kopf in Verlängerung der Wirbelsäule"],
      fehler: ["Nur der Kopf dreht", "Beine sinken (dann Flossen nehmen)"], h: { noetig: [], frei: ["flossen"] }, dos: "4 × 50 m, 20 s Pause" },
    { id: "einarmig", name: "Einarmig kraulen", syn: ["einarmig", "single arm", "one arm", "ein arm", "einarmig kraul"], s: ["rotation", "fassen", "atmung"],
      zweck: "Zug, Rotation und Atmung je Seite einzeln: mit Flossen und Brett bleibt die Lage ruhig, und du atmest zur Seite des ziehenden Arms.",
      ablauf: ["Mit Flossen; der freie Arm liegt vorne auf dem Brett.", "Nur der andere Arm zieht, die Hüfte rollt bei jedem Zug mit; mit der Rotation zur Zugseite einatmen.", "Nach der Übungsstrecke Seite wechseln."],
      achten: ["Zug unter dem Körper bis zur Hüfte", "Rotation auch zur Seite ohne Zug", "Kopf drehen, nicht heben"], fehler: ["Flach liegen ohne Rotation", "Kopf hebt sich"],
      h: { noetig: ["flossen", "brett"], frei: [] }, dos: "2 × 25 m je Seite, 5 s Pause" },
    { id: "schulter_tippen", name: "Achsel tippen", syn: ["achselhoehle tippen", "achsel tippen", "achselhoehle", "schulter tippen", "shoulder tap", "schultertippen"], s: ["rotation", "rueckholung"],
      zweck: "Bei der Rückholung kurz mit der Hand die eigene Achsel berühren: hoher Ellbogen, lockere, körpernahe Rückholung mit genug Rotation.",
      ablauf: ["Nach dem Zug die Hand bei hohem Ellbogen zur Achsel führen und kurz antippen.", "Dann vor der Schulter eintauchen.", "Gleichmässig weiterkraulen."],
      achten: ["Ellbogen hoch, Hand nah am Körper", "Rotation über die Hüfte"], fehler: ["Hektischer Rhythmus", "Eintauchen über der Mitte"],
      h: { noetig: [], frei: ["flossen"] }, dos: "4 × 25 m" },
    { id: "tarzan", name: "Wasserball-Kraul", syn: ["wasserball kraul", "wasserballkraul", "tarzan", "kopf hoch", "kopf hoch kraul", "head up", "sighting", "orientieren"], s: ["freiwasser", "beine", "rhythmus"],
      zweck: "Kraulen mit den Augen knapp über Wasser: Orientieren im Freiwasser, kräftiger Beinschlag und schneller Rhythmus.",
      ablauf: ["Kopf so weit heben, dass die Augen über Wasser sind.", "Kürzere, kräftige Züge, Beine schlagen stärker.", "Im Wechsel: 4 Züge Kopf hoch, 8 Züge normal."],
      achten: ["Nur kurz hochschauen, dann wieder normal liegen", "Beim Hochschauen nicht atmen, erst danach seitlich"], fehler: ["Lange Kopf hoch: Beine sinken"],
      h: { noetig: [], frei: [] }, dos: "2 × 12,5 m, Rest der Bahn locker; im Freiwasser-Block 4 × 25 m" },
    { id: "atmung3", name: "Atmung im Dreierzug", syn: ["3er atmung", "dreier atmung", "atmung 3", "3er zug", "bilateral", "kontrollierte 3er atmung", "beidseitig atmen", "atmung bei jedem dritten zug"], s: ["atmung", "lage"],
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
    { id: "beine_brett", name: "Kraulbeine mit Brett", syn: ["beine brett", "brett beine", "kick brett", "kickboard", "kraulbeine", "beinschlag brett", "beine mit brett", "kraulbeinschlag", "kraulbeinschlag mit kickboard"], s: ["beine", "lage"],
      zweck: "Beinschlag aus der Hüfte üben: lockere Knöchel, kleine schnelle Schläge – trägt die Wasserlage.",
      ablauf: ["Brett vorne mit gestreckten Armen halten.", "Aus der Hüfte schlagen, Knie nur leicht beugen.", "Gesicht im Wasser und ausatmen, zum Atmen kurz vorne heben."],
      achten: ["Füsse locker, Zehen gestreckt", "Kleine Ausschläge, Füsse brechen gerade die Oberfläche"], fehler: ["Velofahren mit den Knien", "Steife Fussgelenke"],
      h: { noetig: ["brett"], frei: ["flossen"] }, dos: "4–6 × 50 m, 20 s Pause" },
    { id: "beine_seitlage", name: "Beine in Seitlage", syn: ["beine seitlage", "seitlage beine", "seitenlage beine", "beine auf der seite", "kraulbeine auf der seite", "kraulbeine seitlage", "beinschlag auf der seite"], s: ["beine", "rotation", "lage"],
      zweck: "Beinschlag auf der Seite: Balance über die Längsachse und Beinschlag in alle Richtungen.",
      ablauf: ["Auf der Seite, unterer Arm vorne lang, oberer an der Hüfte.", "Kleine Beinschläge, zum Atmen Kopf drehen.", "Nach 25 m Seite wechseln."], achten: ["Hüfte bleibt seitlich, kippt nicht", "Kopf liegt auf dem unteren Arm, nur zum Atmen drehen", "Beinschlag klein und schnell, nicht nur nach vorne"],
      fehler: ["Auf den Bauch kippen"], h: { noetig: ["flossen"], frei: [] }, dos: "2 × 50 m, Seite nach 25 m wechseln" },
    { id: "rueckenbeine", name: "Rückenbeine", syn: ["rueckenbeine", "rucken beine", "ruecken beine", "back kick", "beine ruecken", "ruecken kraulbeine", "kraulbeine auf dem ruecken"], s: ["beine", "lage"],
      zweck: "Beinschlag in Rückenlage mit langen Armen: gerade Lage und Beinschlag ohne Brett.",
      ablauf: ["Rückenlage, Arme über dem Kopf lang oder an der Seite.", "Kleine Beinschläge aus der Hüfte.", "Knie bleiben unter der Oberfläche."], achten: ["Hüfte oben, Bauch leicht angespannt", "Kinn leicht zur Brust, Blick nach oben", "Zehen locker, kein Fahrradfahren mit den Knien"],
      fehler: ["Sitzen im Wasser", "Knie stechen aus dem Wasser"], h: { noetig: ["flossen"], frei: [] }, dos: "2–4 × 25–50 m" },
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
    // 2.1: weitere Übungen aus der Enduco-Liste (Namen und Hilfsmittel wie dort, Beschreibung eigen)
    { id: "scheibenwischer", name: "Scheibenwischer", syn: ["scheibenwischer", "windshield wiper", "scheibenwischerbewegung"], s: ["fassen"],
      zweck: "Wriggen mit senkrechten Unterarmen unter dem Körper: Gefühl für den Druck in der Mitte des Zugs, dort, wo der Unterarm am meisten Wasser bewegt.",
      ablauf: ["Bauchlage, Kopf ruhig, Oberarme nahe an der Oberfläche.", "Unterarme zeigen senkrecht nach unten; die Hände bewegen sich in kleinen Bögen nach aussen und innen.", "Langsam vorwärts kommen, Beine schlagen locker mit."],
      achten: ["Ellbogen bleiben oben und fast still", "Bewegung aus dem Unterarm, Handflächen leicht angestellt"], fehler: ["Ellbogen sinken nach unten", "Grosse Bewegungen aus der Schulter"],
      h: { noetig: [], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "finger_gespreizt", name: "Kraul mit gespreizten Fingern", syn: ["gespreizte finger", "kraul gespreizte finger", "finger gespreizt", "open fingers"], s: ["fassen"],
      zweck: "Mit gespreizten Fingern hält die Hand weniger Wasser: Unterarm und Ellbogen müssen mehr arbeiten. Danach mit geschlossener Hand den Unterschied spüren.",
      ablauf: ["Finger weit spreizen und normal kraulen.", "Unterarm früh senkrecht stellen und ruhig bis zur Hüfte durchziehen.", "Den Rest der Bahn mit normaler Hand fertig schwimmen."],
      achten: ["Ruhiger Rhythmus, keine hektischen Arme", "Ellbogen über der Hand"], fehler: ["Mehr Armfrequenz statt besserer Wasserfassung"],
      h: { noetig: [], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "entenpaddeln", name: "Entenpaddeln", syn: ["enten paddeln", "entenpaddel", "ente paddeln"], s: ["kraft", "fassen"],
      zweck: "Nur das Ende des Zugs: kurze Schübe von der Taille bis zum Oberschenkel. Übt das Strecken im Ellbogen und den Druck nach hinten.",
      ablauf: ["Mit Flossen in Bauchlage, die Arme liegen seitlich am Körper.", "Abwechselnd die Hand von der Taille kräftig bis zum Oberschenkel nach hinten drücken.", "Unter Wasser locker zurück zur Taille."],
      achten: ["Ellbogen ganz strecken, Handfläche zeigt nach hinten", "Kopf ruhig, Blick nach unten, Beine schlagen gleichmässig"], fehler: ["Hand dreht und schöpft das Wasser nach oben"],
      h: { noetig: ["flossen"], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "wasserwerfen", name: "Wasserwerfen", syn: ["wasser werfen", "wasserwerfen kraul"], s: ["kraft"],
      zweck: "Bewusster Abdruck am Ende jedes Zugs: das Wasser nach hinten an der Hüfte vorbei schieben, damit der Zug nicht zu früh endet.",
      ablauf: ["Normal kraulen.", "Am Ende jedes Zugs das Wasser mit Nachdruck nach hinten wegschieben.", "Dann locker über Wasser zurückholen."],
      achten: ["Druck nach hinten, nicht nach oben", "Rhythmus bleibt ruhig"], fehler: ["Wasser nach oben spritzen", "Zug vor der Hüfte abbrechen"],
      h: { noetig: [], frei: [] }, dos: "2 × 50 m, 5 s Pause" },
    { id: "schulterdehnung", name: "Schulterdehnung", syn: ["schulterdehnung", "schulter dehnung"], s: ["rotation"],
      zweck: "Lange Zugphase mit viel Rotation: am Ende des Zugs lang machen und bewusst über die Hüfte rollen. Steht in der Enduco-Liste; nicht in der eigenen Abwechslung, weil die Ausführung dort nicht eindeutig beschrieben ist.",
      ablauf: ["Normal kraulen.", "Am Ende jedes Zugs den Arm lang nach hinten strecken und kurz halten.", "Dann über Wasser zurückholen."],
      achten: ["Nur so weit, wie es ohne Zug in der Schulter geht", "Hand nicht unter dem Körper zur anderen Seite führen"], fehler: ["Hand kreuzt unter dem Körper"],
      h: { noetig: [], frei: [] }, dos: "2 × 50 m, 5 s Pause" },
    { id: "po_achsel_kopf", name: "Po – Achsel – Kopf", syn: ["po achselhoehle kopf", "po achsel kopf", "hueft achsel kopf"], s: ["rueckholung", "rotation"],
      zweck: "Rückholung in drei Stationen: die Hand tippt nacheinander Hüfte, Achsel und Kopf an. Hält den Ellbogen hoch und die Hand nah am Körper.",
      ablauf: ["Nach dem Zug mit der Hand kurz die Hüfte antippen.", "Bei hohem Ellbogen die Achsel, kurz vor dem Eintauchen den Kopf antippen.", "Vor der Schulter eintauchen, dann der andere Arm."],
      achten: ["Ellbogen führt, die Hand hängt locker", "Rotation über die Hüfte, Kopf bleibt ruhig"], fehler: ["Kopf dreht beim Antippen mit"],
      h: { noetig: [], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "zurueckspulen", name: "Zurückspulen", syn: ["zurueckspulen", "zurueck spulen", "rewind"], s: ["rueckholung", "rotation"],
      zweck: "Die Rückholung zweimal: Arm vorne eintauchen, über Wasser wieder nach hinten führen und erneut eintauchen. Übt einen kontrollierten, hohen Ellbogen.",
      ablauf: ["Normal kraulen und den Arm vorne eintauchen.", "Den Arm über Wasser zurück bis zur Hüfte führen.", "Erneut nach vorne holen und eintauchen, dann die Seite wechseln."],
      achten: ["Ellbogen bleibt in beiden Richtungen oben", "Der andere Arm und der Beinschlag halten die Lage"], fehler: ["Arm gestreckt seitlich führen"],
      h: { noetig: [], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "einarmig_brett", name: "Einarmig mit Brett", syn: ["einarmig mit kickboard", "einarmig mit brett", "einarmig kickboard"], s: ["rotation", "fassen"],
      zweck: "Ein Arm hält vorne das Brett, der andere zieht: Zug und Rotation je Seite, ohne dass der vordere Arm absinkt.",
      ablauf: ["Ein Arm hält das Brett vorne, gestreckt.", "Der andere Arm zieht bis zur Hüfte durch und kommt über Wasser zurück.", "Nach der Übungsstrecke Seite wechseln."],
      achten: ["Bei jedem Zug über die Hüfte rollen", "Brett ruhig halten, nicht hinunterdrücken"], fehler: ["Flach liegen ohne Rotation"],
      h: { noetig: ["brett"], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "dreidreidrei", name: "3-3-3", syn: ["3 3 3 drill", "3 3 3", "drei drei drei"], s: ["rotation", "rhythmus"],
      zweck: "Drei Züge nur rechts, drei nur links, drei ganz normal: verbindet einarmiges Üben mit dem normalen Rhythmus.",
      ablauf: ["Drei Züge mit dem rechten Arm, der linke bleibt vorne lang.", "Drei Züge mit dem linken Arm.", "Drei normale Kraulzüge, dann wieder von vorne."],
      achten: ["Rotation bei jedem Zug, auch einarmig", "Gleichmässiger Beinschlag"], fehler: ["Beim Wechsel stocken"],
      h: { noetig: ["flossen"], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "zwei_pro_seite", name: "Zwei Züge pro Seite", syn: ["kraul zwei zuege pro seite", "zwei zuege pro seite", "2 zuege pro seite"], s: ["rotation", "rhythmus"],
      zweck: "Je zwei Züge mit demselben Arm, dann wechseln: zeigt, ob beide Seiten gleich rollen und gleich viel Wasser fassen.",
      ablauf: ["Zwei Züge mit dem rechten Arm, der linke wartet vorne.", "Zwei Züge mit dem linken Arm.", "Im Wechsel weiter."],
      achten: ["Der wartende Arm liegt lang vor der Schulter", "Kopf ruhig, Atmung zur ziehenden Seite"], fehler: ["Vorderer Arm sinkt ab"],
      h: { noetig: ["flossen"], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "balance", name: "Balance-Übung", syn: ["balance drill", "balance", "balance uebung"], s: ["lage", "rotation"],
      zweck: "Seitenlage mit einem Arm vorne und einem am Körper: Gleichgewicht über die Längsachse halten, der Beinschlag trägt.",
      ablauf: ["Auf der Seite liegen, der vordere Arm lang auf dem Brett, der hintere an der Hüfte.", "Ruhige Beinschläge, Gesicht im Wasser, zum Atmen nur den Kopf drehen.", "Nach der Übungsstrecke Seite wechseln."],
      achten: ["Hüfte und Schulter bleiben seitlich", "Brett nicht hinunterdrücken"], fehler: ["Auf den Bauch zurückkippen"],
      h: { noetig: ["brett"], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "atmung2", name: "Atmung im Zweierzug", syn: ["2er atmung", "zweier atmung", "atmung 2", "atmung bei jedem zweiten zug"], s: ["atmung", "rhythmus"],
      zweck: "Bei jedem zweiten Zug atmen, immer zur gleichen Seite: ruhiger, regelmässiger Rhythmus, wie bei zügigem Tempo.",
      ablauf: ["Unter Wasser gleichmässig ausatmen.", "Bei jedem zweiten Zug mit der Rotation einatmen.", "In der nächsten Wiederholung zur anderen Seite atmen."],
      achten: ["Kopf drehen, nicht heben", "Ein Auge bleibt im Wasser"], fehler: ["Luft anhalten und dann hektisch atmen"],
      h: { noetig: [], frei: [] }, dos: "2 × 25 m, Rest der Bahn locker, 5 s Pause" },
    { id: "atempyramide", name: "Atempyramide", syn: ["atempyramide", "atem pyramide", "atmungspyramide"], s: ["atmung", "rhythmus"],
      zweck: "Den Atemrhythmus Schritt für Schritt verlängern und wieder verkürzen: Kontrolle über das Ausatmen und einen gleichmässigen Rhythmus.",
      ablauf: ["Bei jedem Zug atmen, dann bei jedem zweiten, dritten, vierten und fünften.", "Danach wieder zurück bis zu jedem Zug.", "Nur locker schwimmen."],
      achten: ["Gleichmässig ins Wasser ausatmen, nie pressen", "Bei Unwohlsein sofort normal atmen; nie allein üben"], fehler: ["Zu schnell schwimmen", "Luft anhalten"],
      h: { noetig: ["flossen"], frei: [] }, dos: "2 × 50 m locker, 5 s Pause" },
  ];
  const BY = new Map(SW.UEBUNGEN.map((u) => [u.id, u]));
  /** Die Kraul-Übungen aus Silas' Enduco-Einheiten (Liste vom 16.11.2026): id → [Übungsstrecke in m, Gruppe für die Abwechslung].
   *  Strecke wie dort (12,5, 25 oder 50 m), danach die Bahn locker fertig schwimmen; Gruppe null = nur erkannt, nicht in der Abwechslung. */
  SW.ENDUCO = { hundepaddeln: [25, "zug"], scheibenwischer: [25, "zug"], finger_gespreizt: [25, "zug"], faust: [25, "zug"], entenpaddeln: [25, "zug"],
    wasserwerfen: [50, "zug"], schulterdehnung: [50, null],
    reissverschluss: [25, "rueck"], schulter_tippen: [25, "rueck"], po_achsel_kopf: [25, "rueck"], fingerspitzen: [25, "rueck"], zurueckspulen: [25, "rueck"],
    einarmig_brett: [25, "timing"], einarmig: [25, "timing"], dreidreidrei: [25, "timing"], zwei_pro_seite: [25, "timing"], abschlag: [25, "timing"], gleiten: [25, "timing"],
    beine_brett: [25, "lage"], rueckenbeine: [25, "lage"], beine_seitlage: [50, "lage"], balance: [25, "lage"], seitlage: [25, "lage"],
    atmung2: [25, "atmung"], atmung3: [25, "atmung"], atempyramide: [50, "atmung"], tarzan: [12.5, "atmung"] };
  /** Gruppen der Abwechslung (eigene Einteilung nach Schwerpunkt). */
  SW.ROTATION_KEYS = ["zug", "rueck", "timing", "lage", "atmung"];
  SW.ROTATION = SW.ROTATION_KEYS.map((g) => Object.keys(SW.ENDUCO).filter((id) => SW.ENDUCO[id][1] === g));
  SW.ROTATION_NAME = ["Armzug unter Wasser", "Rückholung über Wasser", "Einarmig und Timing", "Wasserlage und Beinschlag", "Atmung und Kopf"];
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
  // Wechselnde Übungen je Woche (uebungen-2.1): drei Übungen aus drei der fünf Gruppen, Woche für Woche um eine Gruppe und eine Übung weiter,
  // damit alle Übungen der Enduco-Liste regelmässig vorkommen. ohne = Übungen, die in der Einheit schon als eigener Block stehen.
  SW.uebungenDerWoche = function (nr, anzahl, ohne) {   // ohne = Übungen, die nicht in Frage kommen (eigener Block, fehlende Hilfsmittel)
    const k = Math.abs(Math.round(nr || 0)), G = SW.ROTATION, n = G.length, out = [], weg = ohne || [];
    // wie oft die Gruppe g bis zu dieser Woche drankam (je 5 Wochen dreimal) → jedes Mal die nächste Übung der Gruppe
    const mal = (g) => { let c = 0; for (let w = k - (k % n); w <= k; w++) if ((((g - w) % n) + n) % n < 3) c++; return Math.floor(k / n) * 3 + c; };
    for (let i = 0; out.length < (anzahl || 3) && i < n * 2; i++) {
      const g = (k + i) % n, L = G[g].filter((id) => !weg.includes(id) && !out.includes(id));
      if (L.length) out.push(L[mal(g) % L.length]);
    }
    return out;
  };
  /** Stile neben Kraul (Planeinstellungen, schwimmeinheit-1.2): als eigener Teil am Ende des Ein- und Ausschwimmens; Technik, Beine, Haupt- und
   *  Pull-Serien bleiben Kraul (Triathlon). Delfin plant die Seite nicht (eigene Festlegung). */
  SW.STILE = { ruecken: "Rücken", brust: "Brust" };
  SW.STILE_STANDARD = ["ruecken"];                                       // wie bis schwimmeinheit-1.1 (dort «Kraul und Rücken gemischt»)
  /** Anfänger-Modus: diese Übungen gelten als anspruchsvoll und kommen dann nicht vor (eigene Einteilung). */
  SW.ANSPRUCHSVOLL = ["einarmig", "einarmig_brett", "dreidreidrei", "zwei_pro_seite", "atempyramide", "atmung5", "tarzan", "wasserwerfen", "entenpaddeln",
    "seitlage", "zurueckspulen", "po_achsel_kopf", "wriggen", "senkrecht", "delfinbeine"];
  /** «Kraul», «Kraul und Brust», «Kraul, Rücken und Brust». */
  SW.stileText = function (stile) {
    const L = ["Kraul"].concat((stile || []).filter((k) => SW.STILE[k]).map((k) => SW.STILE[k]));
    return L.length === 1 ? L[0] : `${L.slice(0, -1).join(", ")} und ${L[L.length - 1]}`;
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
      tempo_s: p ? [p[0], p[1]] : null,                                       // s/100 m (für das Garmin-Ziel, garmin-senden-1.1)
      rpe: RPE[t.zone] || null,
      dauer_s: isNum(dauer) ? Math.round(dauer + (t.pause_s || 0)) : null,   // mit allen Pausen (für die Summe)
      schwimm_s: isNum(schwimm) ? Math.round(wdh * schwimm) : null,            // nur die Schwimmzeit (Anzeige)
    });
  }
  const r25 = (m) => Math.max(25, Math.round(m / 25) * 25);
  /**
   * Schwimm-Einheit für «Mein Plan». art: «locker» | «css» | «test» | «kurs»; o = { min, css_s, pool (25|50), ref_s (s/100 m aus Becken-Einheiten, nur
   * für den Umfang), woche (Nummer für die Übungswahl), hilfsmittel (vorhandene; ohne Angabe alle), stile (neben Kraul; ohne Angabe Rücken), anfaenger }.
   * Jeder Teil trägt stil («kraul», «ruecken», «brust»; Übungen «kraul»). → { v, art, pool, bloecke: [{ id, titel, teile }], meter, dauer_s, hilfsmittel,
   * frei, umfang_quelle, stile, stil (der Woche), anfaenger, ohne_hilfsmittel }
   */
  SW.einheit = function (art, o) {
    o = o || {};
    const pool = o.pool === 50 ? 50 : 25, min = isNum(o.min) && o.min > 0 ? o.min : 45, css = isNum(o.css_s) ? o.css_s : null;
    const ref = css ? css + 12 : isNum(o.ref_s) ? o.ref_s : null, pace = { css, ref };
    // schwimmeinheit-1.2: vorhandene Hilfsmittel und Stile aus den Planeinstellungen (ohne Angabe wie bisher: alle Hilfsmittel, Kraul und Rücken)
    const vorhanden = Array.isArray(o.hilfsmittel) ? o.hilfsmittel : null, hat = (h) => !vorhanden || vorhanden.includes(h);
    const stile = Array.isArray(o.stile) ? o.stile.filter((k) => SW.STILE[k]) : SW.STILE_STANDARD, anf = !!o.anfaenger;
    const stil = stile.length ? stile[Math.abs(Math.round(o.woche || 0)) % stile.length] : null;      // Stil der Woche (abwechselnd, wenn beide gewählt)
    const geht = (id) => { const u = SW.uebung(id); return !!u && u.h.noetig.every(hat) && !(anf && SW.ANSPRUCHSVOLL.includes(id)); };
    // schwimmeinheit-1.1: Übungsstrecke wie in der Enduco-Liste (12,5/25/50 m), dann die Bahn locker fertig; 5 s Pause am Beckenrand wie dort (Anfänger 15 s)
    const T = min * 60, drill = (id, wdh) => { const u = SW.uebung(id), m = (SW.ENDUCO[id] || [25])[0], ganz = Math.ceil(m / pool - 1e-9) * pool;
      return { wdh, m, zuende_m: ganz - m, zone: "tech", pause_s: anf ? 15 : 5, text: u.name, uebung: id, hilfsmittel: u.h.noetig.slice(), frei: u.h.frei.filter(hat) }; };
    const B = [];
    const add = (id, titel, teile) => B.push({ id, titel, teile: teile.map((t) => teil(Object.assign({ stil: "kraul" }, t), pace)) });
    // Ein- und Ausschwimmen: Kraul, am Ende ein Teil im Stil der Woche (ganze Bahnen, etwa ein Drittel bzw. die Hälfte)
    const ganzeBahnen = (m, f) => Math.max(pool, Math.min(m - pool, Math.round((m * f) / pool) * pool));
    const locker = (m, pause, kraulText, stilText, f, schluss) => {
      const s2 = schluss ? `; ${schluss}` : "";
      if (!stil || m < 2 * pool) return [{ wdh: 1, m, zone: "z1", pause_s: pause, text: kraulText + s2 }];
      const x = ganzeBahnen(m, f);
      return [{ wdh: 1, m: m - x, zone: "z1", pause_s: 0, text: kraulText }, { wdh: 1, m: x, zone: "z1", pause_s: pause, text: stilText + s2, stil }];
    };
    const stilName = stil ? SW.STILE[stil] : null;
    if (art === "kurs") {
      add("kurs", "Schwimmkurs", [{ wdh: 1, m: 0, zone: "z2", pause_s: 0, text: "Inhalt laut Kurs" }]);
    } else if (art === "test") {
      add("ein", "Einschwimmen", locker(300, 30, "Lockeres Einschwimmen, Kraul", `Locker ${stilName}`, 1 / 3).concat([{ wdh: 4, m: 25, zone: "z3", pause_s: 20, text: "Steigerungen", uebung: "steigerung" }]));
      add("haupt", "Test", [{ wdh: 1, m: 400, zone: "max", pause_s: 120, text: "400 m maximal, gleichmässig einteilen – Zeit stoppen und merken" },
        { wdh: 1, m: 200, zone: "z1", pause_s: 120, text: "Erholung: locker schwimmen (mit den Pausen etwa 10 min bis zum 200er)" },
        { wdh: 1, m: 200, zone: "max", pause_s: 60, text: "200 m maximal – Zeit stoppen" }]);
      add("aus", "Ausschwimmen", locker(300, 0, "Locker ausschwimmen, Kraul", `Locker ${stilName} ausschwimmen`, 1 / 2, "beide Zeiten auf der Seite eintragen"));
    } else {
      const lang = T >= 55 * 60, kurz = T < 35 * 60;
      // Beine-Block: mit Brett, sonst in Seitlage mit Flossen, ohne beides keiner; die Übung des Blocks kommt nicht nochmals unter den Technikübungen
      const beine = art === "css" || kurz ? null : hat("brett") ? "beine_brett" : hat("flossen") ? "beine_seitlage" : null;
      const nicht = SW.UEBUNGEN.filter((u) => !geht(u.id)).map((u) => u.id).concat(beine ? [beine] : []);
      const ids = SW.uebungenDerWoche(o.woche, 3, nicht);    // drei Übungen wie bei Enduco, direkt nach dem Einschwimmen
      add("ein", "Einschwimmen", locker(kurz ? 200 : lang ? 400 : 300, 30, "Locker einschwimmen, Kraul", `Locker ${stilName}`, 1 / 3));
      add("technik", "Technikübungen", ids.map((id) => drill(id, 2)));
      const kurzStrecke = anf ? 25 : 50;                                   // Anfänger-Modus: Beine und Steigerungen 25 m
      if (art === "css") add("steig", "Steigerungen", [{ wdh: 4, m: kurzStrecke, zone: "z3", pause_s: 20, text: "Steigerungen von locker bis zügig", uebung: "steigerung" }]);
      else if (beine === "beine_brett") add("beine", "Beine", [{ wdh: 4, m: kurzStrecke, zone: "z2", pause_s: 20, text: "Kraulbeine mit Brett", uebung: "beine_brett", hilfsmittel: ["brett"], frei: hat("flossen") ? ["flossen"] : [] }]);
      else if (beine) add("beine", "Beine", [{ wdh: 4, m: kurzStrecke, zone: "z2", pause_s: 20, text: "Kraulbeine in Seitlage mit Flossen (ohne Brett)", uebung: "beine_seitlage", hilfsmittel: ["flossen"], frei: [] }]);
      const aus = locker(kurz ? 100 : 200, 0, "Locker ausschwimmen, Kraul", `Locker ${stilName} ausschwimmen`, 1 / 2).map((t) => Object.assign({ stil: "kraul" }, t));
      const pull = art !== "css" && lang && hat("pullbuoy") ? { wdh: 4, m: anf ? 50 : 100, zone: "z2", pause_s: anf ? 30 : 20, text: hat("paddles") ? "Pull mit Pullbuoy, Paddles nach Gefühl" : "Pull mit Pullbuoy",
        uebung: "pull", hilfsmittel: ["pullbuoy"], frei: hat("paddles") ? ["paddles"] : [], stil: "kraul" } : null;
      const fix = B.reduce((s, b) => s + b.teile.reduce((x, t) => x + (t.dauer_s || 0), 0), 0) + aus.reduce((x, t) => x + teil(t, pace).dauer_s, 0) + (pull ? teil(pull, pace).dauer_s : 0);
      const rest = isNum(ref) ? T - fix : null;
      let haupt;
      if (art === "css") {
        // V8.4 abwechslung-1.0: o.css_m 200 bzw. 300 m (nicht im Anfänger-Modus) mit 20 bzw. 30 s Pause; Anzahl so, dass die Zeit gleich bleibt
        const lang = !anf && (o.css_m === 200 || o.css_m === 300) ? o.css_m : null;
        const m = lang || (anf ? 50 : 100), p = lang === 300 ? 30 : lang === 200 ? 20 : anf ? 30 : 15, rep = ((css ? css : ref || 120) * m) / 100 + p;
        const lo = lang === 300 ? 2 : lang === 200 ? 3 : anf ? 8 : 6, hi = lang === 300 ? 5 : lang === 200 ? 8 : anf ? 24 : 16;   // CSS-Strecke höchstens ≈ 1600 m wie bisher
        const n = isNum(rest) ? Math.max(lo, Math.min(hi, Math.floor(rest / rep))) : lang === 300 ? 4 : lang === 200 ? 5 : anf ? 12 : 10;
        haupt = { wdh: n, m, zone: "css", pause_s: p, text: css ? `${m} m im CSS-Tempo` : `${m} m zügig (noch kein CSS-Test)` };
      } else {
        const L = anf ? 100 : T >= 60 * 60 ? 400 : T >= 40 * 60 ? 300 : 200, p = anf ? 45 : 30, rep = isNum(ref) ? L / 100 * ref + p : null;
        const n = isNum(rest) && rep ? Math.max(1, Math.floor(rest / rep)) : Math.max(1, Math.round((T / 60 - 25) / (anf ? 3 : 8)));
        haupt = { wdh: n, m: L, zone: "z2", pause_s: p, text: "Ruhig und gleichmässig, auf die Übungen achten" };
      }
      add("haupt", "Hauptserie", [haupt]);
      if (pull) add("pull", "Pull", [pull]);
      add("aus", "Ausschwimmen", aus);
    }
    let meter = 0, dauer = 0, offen = false; const hm = new Set(), frei = new Set();
    for (const b of B) for (const t of b.teile) {
      meter += (t.wdh || 1) * ((t.m || 0) + (t.zuende_m || 0)); if (isNum(t.dauer_s)) dauer += t.dauer_s; else offen = true;
      for (const h of t.hilfsmittel || []) hm.add(h); for (const h of t.frei || []) frei.add(h);
    }
    for (const h of hm) frei.delete(h);
    return { v: SW.VERSIONS.einheit, art, pool, css_s: css, bloecke: B, meter: art === "kurs" ? null : meter, dauer_s: offen || art === "kurs" ? null : Math.round(dauer),
      hilfsmittel: [...hm], frei: [...frei], umfang_quelle: css ? "CSS-Test" : isNum(o.ref_s) ? "≈ dein Tempo aus Becken-Einheiten (kein Tempoziel)" : null,
      stile: stile.slice(), stil, anfaenger: anf, ohne_hilfsmittel: vorhanden ? Object.keys(SW.HILFSMITTEL).filter((h) => h !== "schnorchel" && !vorhanden.includes(h)) : [] };
  };
  /** Baustein-ID des Wochenvorschlags → Art der Schwimm-Einheit. */
  SW.artVon = (id) => ({ schwimm_locker: "locker", schwimm_css: "css", schwimm_css_200: "css", schwimm_css_300: "css", test_css: "test", schwimm_kurs: "kurs" }[id] || "locker");
  /** V8.4 abwechslung-1.0: Strecke der CSS-Wiederholungen je Form (100 m Vergleichseinheit, 200 m, 300 m). */
  SW.cssStrecke = (id) => ({ schwimm_css_200: 200, schwimm_css_300: 300 }[id] || null);
  /** Bahnen-Text: 25 m im 50-m-Becken = ½ L, 12,5 m = ¼ L, 100 m = 2 L. */
  SW.bahnen = (m, pool) => {
    if (!isNum(m) || !m) return "";
    const L = m / (pool || 25), g = Math.floor(L + 1e-9), r = Math.round((L - g) * 100) / 100, B = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
    return r ? (B[r] ? `${g || ""}${B[r]} L` : `${String(Math.round(L * 10) / 10).replace(".", ",")} L`) : `${g} L`;
  };
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
