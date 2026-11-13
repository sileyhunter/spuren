/* V6.4 Wissen (wissen-1.0): Erklärungen zu allen Modellen und Regeln der Seite – Zonen, Laktat und Messung, Schwellen-Methoden,
   Intensitätsverteilung, Trainingsmodelle, Periodisierung, Taper, Langdistanz, Intervalle, Last, Erholung, Schwimmen, Verpflegung.
   Alle Texte in eigenen Worten (keine Zitate), jede Aussage mit Quelle; [[id]] im Text verweist auf WS.QUELLEN (DOI-Link).
   Ohne DOM (Inhalt), Anzeige in index.html (Ansicht «Wissen» unter Plan). */
(function (root, factory) {
  const WS = factory();
  if (typeof module === "object" && module.exports) module.exports = WS;
  if (root) root.WS = WS;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const WS = { VERSION: "wissen-1.1" };

  /* ---------------- Quellen: Autoren, Jahr, Titel, Zeitschrift, DOI (oder URL) und der Kern in einem Satz (eigene Worte) ---------------- */
  WS.QUELLEN = {
    seiler2006: { zit: "Seiler & Kjerland 2006", a: "Seiler KS, Kjerland GØ", j: 2006, t: "Quantifying training intensity distribution in elite endurance athletes: is there evidence for an “optimal” distribution?", q: "Scand J Med Sci Sports 16(1):49–56", doi: "10.1111/j.1600-0838.2004.00418.x",
      kern: "Junge Skilangläufer trainierten rund drei Viertel ihrer Zeit unter der ersten Schwelle, wenig dazwischen und einen kleineren Teil hart." },
    seiler2010: { zit: "Seiler 2010", a: "Seiler S", j: 2010, t: "What is best practice for training intensity and duration distribution in endurance athletes?", q: "Int J Sports Physiol Perform 5(3):276–291", doi: "10.1123/ijspp.5.3.276",
      kern: "Übersicht: Erfolgreiche Ausdauersportler trainieren grösstenteils locker und setzen harte Einheiten gezielt; das Drei-Bereiche-Modell als gemeinsame Sprache." },
    stoeggl2014: { zit: "Stöggl & Sperlich 2014", a: "Stöggl T, Sperlich B", j: 2014, t: "Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training", q: "Front Physiol 5:33", doi: "10.3389/fphys.2014.00033",
      kern: "Neun Wochen, 48 gut trainierte Ausdauersportler: Die polarisierte Gruppe verbesserte die VO2peak am stärksten." },
    stoeggl2015: { zit: "Stöggl & Sperlich 2015", a: "Stöggl TL, Sperlich B", j: 2015, t: "The training intensity distribution among well-trained and elite endurance athletes", q: "Front Physiol 6:295", doi: "10.3389/fphys.2015.00295",
      kern: "Definiert polarisiert, pyramidal und schwellenbetont und zeigt, dass Spitzensportler je nach Phase verschiedene Verteilungen nutzen." },
    rosenblat2019: { zit: "Rosenblat et al. 2019", a: "Rosenblat MA, Perrotta AS, Vicenzino B", j: 2019, t: "Polarized vs. threshold training intervention and endurance performance: a systematic review and meta-analysis", q: "J Strength Cond Res 33(12):3491–3500", doi: "10.1519/JSC.0000000000002618",
      kern: "Meta-Analyse: Zeitfahren eher besser nach polarisiertem als nach Schwellentraining – bei wenigen Studien." },
    rosenblat2025: { zit: "Rosenblat et al. 2025", a: "Rosenblat MA, Watt JA, Arnold JI, et al.", j: 2025, t: "Which training intensity distribution intervention will produce the greatest improvements in maximal oxygen uptake and time-trial performance in endurance athletes? A systematic review and network meta-analysis of individual participant data", q: "Sports Med 55(3):655–673", doi: "10.1007/s40279-024-02149-3",
      kern: "13 Studien, 348 Personen: nach Puls-Zeit kein Unterschied zwischen polarisiert und pyramidal; Wettkampfsportler eher mit polarisiert, Freizeitsportler eher mit pyramidal besser bei der VO2max." },
    oliveira2024: { zit: "Oliveira et al. 2024", a: "Oliveira PS, Boppre G, Fonseca H", j: 2024, t: "Comparison of polarized versus other types of endurance training intensity distribution on athletes’ endurance performance: a systematic review with meta-analysis", q: "Sports Med 54(8):2071–2095", doi: "10.1007/s40279-024-02034-z",
      kern: "17 Studien: polarisiert leicht besser für die VO2peak, vor allem in Blöcken unter 12 Wochen und bei Hochtrainierten; Zeitfahren und Schwellen gleich." },
    burnley2022: { zit: "Burnley et al. 2022", a: "Burnley M, Bearden SE, Jones AM", j: 2022, t: "Polarized training is not optimal for endurance athletes", q: "Med Sci Sports Exerc 54(6):1032–1034", doi: "10.1249/MSS.0000000000002869",
      kern: "Gegenposition: Die Belege für eine Überlegenheit der Polarisierung seien schwach; Umfang und die richtigen Belastungsbereiche zählten mehr." },
    foster2022: { zit: "Foster et al. 2022", a: "Foster C, Casado A, Esteve-Lanao J, Haugen T, Seiler S", j: 2022, t: "Polarized training is optimal for endurance athletes", q: "Med Sci Sports Exerc 54(6):1028–1031", doi: "10.1249/MSS.0000000000002871",
      kern: "Position: Viel locker und wenig, gezielt hart ist das beobachtete Muster erfolgreicher Ausdauersportler." },
    treff2019: { zit: "Treff et al. 2019", a: "Treff G, Winkert K, Sareban M, Steinacker JM, Sperlich B", j: 2019, t: "The polarization-index: a simple calculation to distinguish polarized from non-polarized training intensity distributions", q: "Front Physiol 10:707", doi: "10.3389/fphys.2019.00707",
      kern: "Polarisierungsindex PI = log10(Z1/Z2 × Z3 × 100) aus den Zeitanteilen; über 2,00 gilt eine Verteilung als polarisiert." },
    sylta2014: { zit: "Sylta et al. 2014", a: "Sylta Ø, Tønnessen E, Seiler S", j: 2014, t: "From heart-rate data to training quantification: a comparison of 3 methods of training-intensity analysis", q: "Int J Sports Physiol Perform 9(1):100–107", doi: "10.1123/IJSPP.2013-0298",
      kern: "Die Puls-Zeit in Zonen unterschätzt harte Anteile; die Zählung nach Einheitenziel überschätzt sie – je nach Methode sieht dieselbe Woche anders aus." },
    neal2011: { zit: "Neal et al. 2011", a: "Neal CM, Hunter AM, Galloway SDR", j: 2011, t: "A 6-month analysis of training-intensity distribution and physiological adaptation in Ironman triathletes", q: "J Sports Sci 29(14):1515–1523", doi: "10.1080/02640414.2011.596217",
      kern: "Ironman-Altersklassenathleten trainierten über sechs Monate etwa 69 % locker, 25 % mittel und 6 % hart." },
    munoz2014a: { zit: "Muñoz et al. 2014 (Ironman)", a: "Muñoz I, Cejuela R, Seiler S, Larumbe E, Esteve-Lanao J", j: 2014, t: "Training-intensity distribution during an ironman season: relationship with competition performance", q: "Int J Sports Physiol Perform 9(2):332–339", doi: "10.1123/ijspp.2012-0352",
      kern: "Über eine Ironman-Saison ging mehr lockere Zeit mit besseren und mehr Zeit im mittleren Bereich mit schlechteren Rennzeiten einher (Zusammenhang, kein Beweis)." },
    munoz2014b: { zit: "Muñoz et al. 2014 (Läufer)", a: "Muñoz I, Seiler S, Bautista J, España J, Larumbe E, Esteve-Lanao J", j: 2014, t: "Does polarized training improve performance in recreational runners?", q: "Int J Sports Physiol Perform 9(2):265–272", doi: "10.1123/ijspp.2012-0350",
      kern: "Freizeitläufer: 10 Wochen polarisiert (77/3/20) verbesserten 10 km um 5,0 %, die Vergleichsgruppe mit viel Mitte (46/35/19) um 3,6 %." },
    filipas2022: { zit: "Filipas et al. 2022", a: "Filipas L, Bonato M, Gallo G, Codella R", j: 2022, t: "Effects of 16 weeks of pyramidal and polarized training intensity distributions in well-trained endurance runners", q: "Scand J Med Sci Sports 32(3):498–511", doi: "10.1111/sms.14101",
      kern: "60 gut trainierte Läufer, 16 Wochen: alle vier Varianten wirkten; 8 Wochen pyramidal und dann 8 Wochen polarisiert brachte am meisten." },
    casado2023: { zit: "Casado et al. 2023", a: "Casado A, Foster C, Bakken M, Tjelta LI", j: 2023, t: "Does lactate-guided threshold interval training within a high-volume low-intensity approach represent the “next step” in the evolution of distance running training?", q: "Int J Environ Res Public Health 20(5):3782", doi: "10.3390/ijerph20053782",
      kern: "Beschreibt das norwegische Modell: viel lockerer Umfang, mehrere Schwellen-Einheiten pro Woche mit Laktatkontrolle (etwa 2–4,5 mmol/l) und wenig darüber." },
    haugen2022: { zit: "Haugen et al. 2022", a: "Haugen T, Sandbakk Ø, Seiler S, Tønnessen E", j: 2022, t: "The training characteristics of world-class distance runners: an integration of scientific literature and results-proven practice", q: "Sports Med Open 8:46", doi: "10.1186/s40798-022-00438-7",
      kern: "Weltklasse-Langstreckenläufer: mindestens rund 80 % lockere Zeit, Schwellenarbeit kontrolliert, Taper eher kurz." },
    toennessen2014: { zit: "Tønnessen et al. 2014", a: "Tønnessen E, Sylta Ø, Haugen TA, Hem E, Svendsen IS, Seiler S", j: 2014, t: "The road to gold: training and peaking characteristics in the year prior to a gold medal endurance performance", q: "PLoS One 9(7):e101796", doi: "10.1371/journal.pone.0101796",
      kern: "Beschreibt Training und Formaufbau von Olympiasiegern im Ausdauersport im Jahr vor dem Titel." },
    toennessen2024: { zit: "Tønnessen et al. 2024", a: "Tønnessen E, Sandbakk Ø, Sandbakk SB, Seiler S, Haugen T", j: 2024, t: "Training session models in endurance sports: a Norwegian perspective on best practice recommendations", q: "Sports Med 54(11):2935–2953", doi: "10.1007/s40279-024-02067-4",
      kern: "Einheitenmodelle aus Norwegen: mehr moderate als sehr harte Einheiten, Intervalle umfangreich, kontrolliert und nicht bis zur Erschöpfung; mit Fünf-Zonen-Skala." },
    swissolympic2005: { zit: "Swiss Olympic 2005", a: "Swiss Olympic, Fachgruppe Ausdauer (Vogt M et al.)", j: 2005, t: "Physiologische Trainingsintensitätszonen", q: "Fachdokumentation 2005/1", url: "https://www.mobilesport.ch/wp-content/uploads/2011/06/PhysiologischeTrainingsintensitaetszonen.pdf",
      kern: "Trainingszonen nach physiologischen Übergängen: bis zur aeroben Schwelle, bis zur anaeroben Schwelle und darüber." },
    issurin2010: { zit: "Issurin 2010", a: "Issurin VB", j: 2010, t: "New horizons for the methodology and physiology of training periodization", q: "Sports Med 40(3):189–206", doi: "10.2165/11319770-000000000-00000",
      kern: "Blockperiodisierung: wenige Ziele je Block, konzentriert trainiert, statt vieler Ziele gleichzeitig." },
    kiely2010: { zit: "Kiely 2010", a: "Kiely J", j: 2010, t: "New horizons for the methodology and physiology of training periodization: block periodization: new horizon or a false dawn?", q: "Sports Med 40(9):803–805", doi: "10.2165/11535130-000000000-00000",
      kern: "Kritik: Die Belege für starre Periodisierungsschemata sind dünn; Planung muss sich nach der Reaktion des Athleten richten." },
    roennestad2014a: { zit: "Rønnestad et al. 2014a", a: "Rønnestad BR, Hansen J, Ellefsen S", j: 2014, t: "Block periodization of high-intensity aerobic intervals provides superior training effects in trained cyclists", q: "Scand J Med Sci Sports 24(1):34–42", doi: "10.1111/j.1600-0838.2012.01485.x",
      kern: "Harte Intervalle gebündelt in einer Woche, danach Wochen mit wenigen: bei trainierten Radfahrern bessere Effekte als gleichmässig verteilt." },
    roennestad2014b: { zit: "Rønnestad et al. 2014b", a: "Rønnestad BR, Ellefsen S, Nygaard H, et al.", j: 2014, t: "Effects of 12 weeks of block periodization on performance and performance indices in well-trained cyclists", q: "Scand J Med Sci Sports 24(2):327–335", doi: "10.1111/sms.12016",
      kern: "Zwölf Wochen Blockperiodisierung bei gut trainierten Radfahrern verbesserten Leistungskennwerte stärker als die herkömmliche Verteilung." },
    buchheit2013a: { zit: "Buchheit & Laursen 2013 (I)", a: "Buchheit M, Laursen PB", j: 2013, t: "High-intensity interval training, solutions to the programming puzzle: part I: cardiopulmonary emphasis", q: "Sports Med 43(5):313–338", doi: "10.1007/s40279-013-0029-x",
      kern: "Wie Dauer, Intensität und Pausen von Intervallen die Zeit nahe der VO2max steuern." },
    buchheit2013b: { zit: "Buchheit & Laursen 2013 (II)", a: "Buchheit M, Laursen PB", j: 2013, t: "High-intensity interval training, solutions to the programming puzzle. Part II: anaerobic energy, neuromuscular load and practical applications", q: "Sports Med 43(10):927–954", doi: "10.1007/s40279-013-0066-5",
      kern: "Die Kehrseite harter Intervalle: anaerobe und muskuläre Belastung – und wie man sie dosiert." },
    helgerud2007: { zit: "Helgerud et al. 2007", a: "Helgerud J, Høydal K, Wang E, et al.", j: 2007, t: "Aerobic high-intensity intervals improve VO2max more than moderate training", q: "Med Sci Sports Exerc 39(4):665–671", doi: "10.1249/mss.0b013e3180304570",
      kern: "4 × 4 min bei 90–95 % der maximalen Herzfrequenz steigerten die VO2max um 7,2 %, 15/15-Intervalle um 5,5 %." },
    roennestad2015: { zit: "Rønnestad et al. 2015", a: "Rønnestad BR, Hansen J, Vegge G, Tønnessen E, Slettaløkken G", j: 2015, t: "Short intervals induce superior training adaptations compared with long intervals in cyclists – an effort-matched approach", q: "Scand J Med Sci Sports 25(2):143–151", doi: "10.1111/sms.12165",
      kern: "30 s hart / 15 s locker in Serien wirkte bei Radfahrern stärker als 4 × 5 min mit gleicher empfundener Anstrengung." },
    roennestad2020: { zit: "Rønnestad et al. 2020", a: "Rønnestad BR, Hansen J, Nygaard H, Lundby C", j: 2020, t: "Superior performance improvements in elite cyclists following short-interval vs effort-matched long-interval training", q: "Scand J Med Sci Sports 30(5):849–857", doi: "10.1111/sms.13627",
      kern: "Auch bei Elite-Radfahrern brachten die kurzen 30/15-Intervalle mehr als lange Intervalle gleicher Anstrengung." },
    bosquet2007: { zit: "Bosquet et al. 2007", a: "Bosquet L, Montpetit J, Arvisais D, Mujika I", j: 2007, t: "Effects of tapering on performance: a meta-analysis", q: "Med Sci Sports Exerc 39(8):1358–1365", doi: "10.1249/mss.0b013e31806010e0",
      kern: "Am wirksamsten: etwa zwei Wochen Taper, Umfang um 41–60 % gesenkt, Intensität und Häufigkeit beibehalten." },
    mujika2003: { zit: "Mujika & Padilla 2003", a: "Mujika I, Padilla S", j: 2003, t: "Scientific bases for precompetition tapering strategies", q: "Med Sci Sports Exerc 35(7):1182–1187", doi: "10.1249/01.MSS.0000074448.73931.11",
      kern: "Grundlagen des Tapers: Ermüdung abbauen, Anpassungen erhalten – darum Umfang runter, Intensität halten." },
    laursen2001: { zit: "Laursen & Rhodes 2001", a: "Laursen PB, Rhodes EC", j: 2001, t: "Factors affecting performance in an ultraendurance triathlon", q: "Sports Med 31(3):195–209", doi: "10.2165/00007256-200131030-00004",
      kern: "Was im Ultra-Triathlon zählt: hohe Leistung an den Schwellen, Ökonomie, Fettverbrennung, Verpflegung und Wärmehaushalt." },
    laursen2005: { zit: "Laursen et al. 2005", a: "Laursen PB, Knez WL, Shing CM, Langill RH, Rhodes EC, Jenkins DG", j: 2005, t: "Relationship between laboratory-measured variables and heart rate during an ultra-endurance triathlon", q: "J Sports Sci 23(10):1111–1120", doi: "10.1080/02640410400023209",
      kern: "Im Ironman lag der Puls auf dem Rad und beim Laufen nahe dem Puls an der ersten ventilatorischen Schwelle." },
    millet2000: { zit: "Millet & Vleck 2000", a: "Millet GP, Vleck VE", j: 2000, t: "Physiological and biomechanical adaptations to the cycle to run transition in Olympic triathlon: review and practical recommendations for training", q: "Br J Sports Med 34(5):384–390", doi: "10.1136/bjsm.34.5.384",
      kern: "Laufen nach dem Rad verändert Schritt, Ökonomie und Gefühl; der Wechsel lässt sich trainieren." },
    roennestad2014c: { zit: "Rønnestad & Mujika 2014", a: "Rønnestad BR, Mujika I", j: 2014, t: "Optimizing strength training for running and cycling endurance performance: a review", q: "Scand J Med Sci Sports 24(4):603–612", doi: "10.1111/sms.12104",
      kern: "Schweres Krafttraining ergänzt Ausdauertraining: bessere Ökonomie und Leistung, ohne die VO2max zu senken." },
    maunder2021: { zit: "Maunder et al. 2021", a: "Maunder E, Seiler S, Mildenhall MJ, Kilding AE, Plews DJ", j: 2021, t: "The importance of ‘durability’ in the physiological profiling of endurance athletes", q: "Sports Med 51(8):1619–1628", doi: "10.1007/s40279-021-01459-0",
      kern: "Ermüdungsresistenz: Schwellen und Leistung verschieben sich nach langer Belastung – eine eigene, trainierbare Eigenschaft." },
    coyle2001: { zit: "Coyle & González-Alonso 2001", a: "Coyle EF, González-Alonso J", j: 2001, t: "Cardiovascular drift during prolonged exercise: new perspectives", q: "Exerc Sport Sci Rev 29(2):88–92", doi: "10.1097/00003677-200104000-00009",
      kern: "Bei langer gleichmässiger Belastung steigt der Puls, vor allem durch Wärme und Flüssigkeitsverlust." },
    faude2009: { zit: "Faude et al. 2009", a: "Faude O, Kindermann W, Meyer T", j: 2009, t: "Lactate threshold concepts: how valid are they?", q: "Sports Med 39(6):469–490", doi: "10.2165/00007256-200939060-00003",
      kern: "Übersicht der Laktatschwellen-Konzepte: zwei Übergänge (aerob und anaerob) und wie gut die Methoden sie treffen." },
    jamnick2020: { zit: "Jamnick et al. 2020", a: "Jamnick NA, Pettitt RW, Granata C, Pyne DB, Bishop DJ", j: 2020, t: "An examination and critique of current methods to determine exercise intensity", q: "Sports Med 50(10):1729–1756", doi: "10.1007/s40279-020-01322-8",
      kern: "Die vielen Methoden für Schwellen liefern unterschiedliche Werte und sind nicht austauschbar." },
    jamnick2018: { zit: "Jamnick et al. 2018", a: "Jamnick NA, Botella J, Pyne DB, Bishop DJ", j: 2018, t: "Manipulating graded exercise test variables affects the validity of the lactate threshold and VO2peak", q: "PLoS One 13(7):e0199794", doi: "10.1371/journal.pone.0199794",
      kern: "Stufendauer und Auswertung verändern die Schwelle; mod. Dmax aus 4-min-Stufen traf das maximale Laktat-Gleichgewicht am besten." },
    bentley2007: { zit: "Bentley et al. 2007", a: "Bentley DJ, Newell J, Bishop D", j: 2007, t: "Incremental exercise test design and analysis: implications for performance diagnostics in endurance athletes", q: "Sports Med 37(7):575–586", doi: "10.2165/00007256-200737070-00002",
      kern: "Wie man Stufentests aufbaut und auswertet, damit die Werte vergleichbar bleiben." },
    brooks2018: { zit: "Brooks 2018", a: "Brooks GA", j: 2018, t: "The science and translation of lactate shuttle theory", q: "Cell Metab 27(4):757–785", doi: "10.1016/j.cmet.2018.03.008",
      kern: "Laktat wird ständig gebildet, zwischen Zellen und Organen ausgetauscht und als Brennstoff und Signal genutzt." },
    crotty2021: { zit: "Crotty et al. 2021", a: "Crotty NM, Boland M, Mahony N, Donne B, Fleming N", j: 2021, t: "Reliability and validity of the Lactate Pro 2 analyzer", q: "Meas Phys Educ Exerc Sci 25(3):202–211", doi: "10.1080/1091367X.2020.1865966",
      kern: "Lactate Pro 2: gut wiederholbar (Variationskoeffizient 3,3 %), Werte rund 1,4-mal höher als ein Laborgerät, Schwellenbelastung trotzdem gleich." },
    maassen1989: { zit: "Maassen & Busse 1989", a: "Maassen N, Busse MW", j: 1989, t: "The relationship between lactic acid and work load: a measure for endurance capacity or an indicator of carbohydrate deficiency?", q: "Eur J Appl Physiol 58(7):728–737", doi: "10.1007/BF00637384",
      kern: "Leere Kohlenhydratspeicher senken das Laktat bei gleicher Leistung – die Kurve sieht dann besser aus, als die Form ist." },
    heck1985: { zit: "Heck et al. 1985", a: "Heck H, Mader A, Hess G, Mücke S, Müller R, Hollmann W", j: 1985, t: "Justification of the 4-mmol/l lactate threshold", q: "Int J Sports Med 6(3):117–130", doi: "10.1055/s-2008-1025824",
      kern: "Begründung der fixen 4-mmol/l-Schwelle als Näherung für das maximale Laktat-Gleichgewicht." },
    kindermann1979: { zit: "Kindermann et al. 1979", a: "Kindermann W, Simon G, Keul J", j: 1979, t: "The significance of the aerobic-anaerobic transition for the determination of work load intensities during endurance training", q: "Eur J Appl Physiol 42(1):25–34", doi: "10.1007/BF00421101",
      kern: "Aerob-anaerober Übergang mit Orientierungswerten um 2 und 4 mmol/l zur Steuerung des Ausdauertrainings." },
    dickhuth1999: { zit: "Dickhuth et al. 1999", a: "Dickhuth HH, Yin L, Niess A, et al.", j: 1999, t: "Ventilatory, lactate-derived and catecholamine thresholds during incremental treadmill running: relationship and reproducibility", q: "Int J Sports Med 20(2):122–127", doi: "10.1055/s-2007-971105",
      kern: "Individuelle anaerobe Schwelle: Laktat am Minimum des Laktatäquivalents plus 1,5 mmol/l." },
    cheng1992: { zit: "Cheng et al. 1992", a: "Cheng B, Kuipers H, Snyder AC, Keizer HA, Jeukendrup A, Hesselink M", j: 1992, t: "A new approach for the determination of ventilatory and lactate thresholds", q: "Int J Sports Med 13(7):518–522", doi: "10.1055/s-2007-1021309",
      kern: "Dmax: grösster Abstand zwischen der Laktatkurve und der Geraden vom ersten zum letzten Punkt." },
    bishop1998: { zit: "Bishop et al. 1998", a: "Bishop D, Jenkins DG, Mackinnon LT", j: 1998, t: "The relationship between plasma lactate parameters, Wpeak and 1-h cycling performance in women", q: "Med Sci Sports Exerc 30(8):1270–1275", doi: "10.1097/00005768-199808000-00014",
      kern: "Modifizierte Dmax: Gerade erst ab dem Punkt vor dem ersten deutlichen Laktatanstieg; hing eng mit der 1-h-Leistung zusammen." },
    beaver1985: { zit: "Beaver et al. 1985", a: "Beaver WL, Wasserman K, Whipp BJ", j: 1985, t: "Improved detection of lactate threshold during exercise using a log-log transformation", q: "J Appl Physiol 59(6):1936–1940", doi: "10.1152/jappl.1985.59.6.1936",
      kern: "Logarithmiert man Laktat und Belastung, liegen die Punkte auf zwei Geraden; ihr Schnittpunkt ist die erste Schwelle." },
    banister1975: { zit: "Banister et al. 1975", a: "Banister EW, Calvert TW, Savage MV, Bach T", j: 1975, t: "A systems model of training for athletic performance", q: "Aust J Sports Med 7(3):57–61", ohneDoi: "nur gedruckt erschienen, ohne DOI",
      kern: "Impuls-Antwort-Modell: Jede Einheit erzeugt Fitness und Ermüdung; die Leistung ist ihre Differenz." },
    morton1990: { zit: "Morton et al. 1990", a: "Morton RH, Fitz-Clarke JR, Banister EW", j: 1990, t: "Modeling human performance in running", q: "J Appl Physiol 69(3):1171–1177", doi: "10.1152/jappl.1990.69.3.1171",
      kern: "Mathematische Ausarbeitung des Fitness-Ermüdungs-Modells mit zwei Zeitkonstanten." },
    foster2001: { zit: "Foster et al. 2001", a: "Foster C, Florhaug JA, Franklin J, et al.", j: 2001, t: "A new approach to monitoring exercise training", q: "J Strength Cond Res 15(1):109–115", doi: "10.1519/00124278-200102000-00019",
      kern: "Einheitenlast = empfundene Anstrengung (CR-10) mal Minuten – einfach und ohne Messgerät." },
    impellizzeri2019: { zit: "Impellizzeri et al. 2019", a: "Impellizzeri FM, Marcora SM, Coutts AJ", j: 2019, t: "Internal and external training load: 15 years on", q: "Int J Sports Physiol Perform 14(2):270–273", doi: "10.1123/ijspp.2018-0935",
      kern: "Äussere Last (was du leistest) und innere Last (wie dein Körper reagiert) gehören zusammen betrachtet." },
    plews2013: { zit: "Plews et al. 2013", a: "Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M", j: 2013, t: "Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring", q: "Sports Med 43(9):773–781", doi: "10.1007/s40279-013-0071-8",
      kern: "HRV als gleitendes Mittel und im Vergleich mit dem eigenen Normalbereich ist aussagekräftiger als ein Einzelwert." },
    plews2014: { zit: "Plews et al. 2014", a: "Plews DJ, Laursen PB, Le Meur Y, Hausswirth C, Kilding AE, Buchheit M", j: 2014, t: "Monitoring training with heart-rate variability: how much compliance is needed for valid assessment?", q: "Int J Sports Physiol Perform 9(5):783–790", doi: "10.1123/IJSPP.2013-0455",
      kern: "Für ein verlässliches Wochenmittel der HRV braucht es mindestens drei Messungen pro Woche." },
    buchheit2014: { zit: "Buchheit 2014", a: "Buchheit M", j: 2014, t: "Monitoring training status with HR measures: do all roads lead to Rome?", q: "Front Physiol 5:73", doi: "10.3389/fphys.2014.00073",
      kern: "Ruhepuls, HRV und Puls bei Belastung zeigen den Trainingszustand – richtig gedeutet nur im Zusammenhang." },
    javaloyes2019: { zit: "Javaloyes et al. 2019", a: "Javaloyes A, Sarabia JM, Lamberts RP, Moya-Ramon M", j: 2019, t: "Training prescription guided by heart-rate variability in cycling", q: "Int J Sports Physiol Perform 14(1):23–32", doi: "10.1123/ijspp.2018-0122",
      kern: "Radfahrer, die harte Einheiten nach ihrer HRV ansetzten, schnitten mindestens so gut ab wie nach festem Plan." },
    walsh2021: { zit: "Walsh et al. 2021", a: "Walsh NP, Halson SL, Sargent C, et al.", j: 2021, t: "Sleep and the athlete: narrative review and 2021 expert consensus recommendations", q: "Br J Sports Med 55(7):356–368", doi: "10.1136/bjsports-2020-102025",
      kern: "Expertenkonsens: Schlaf ist zentral für Erholung, Gesundheit und Leistung und gehört ins Monitoring." },
    hooper1995: { zit: "Hooper et al. 1995", a: "Hooper SL, Mackinnon LT, Howard A, Gordon RD, Bachmann AW", j: 1995, t: "Markers for monitoring overtraining and recovery", q: "Med Sci Sports Exerc 27(1):106–112", doi: "10.1249/00005768-199501000-00019",
      kern: "Fragebogen mit Schlaf, Müdigkeit, Stress und Muskelschmerz auf einer Skala von 1 bis 7 (höher = schlechter)." },
    saw2016: { zit: "Saw et al. 2016", a: "Saw AE, Main LC, Gastin PB", j: 2016, t: "Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review", q: "Br J Sports Med 50(5):281–291", doi: "10.1136/bjsports-2015-094758",
      kern: "Eigene Angaben zum Befinden reagierten empfindlicher und verlässlicher auf Belastung als viele objektive Messwerte." },
    meeusen2013: { zit: "Meeusen et al. 2013", a: "Meeusen R, Duclos M, Foster C, et al.", j: 2013, t: "Prevention, diagnosis, and treatment of the overtraining syndrome: joint consensus statement of the European College of Sport Science and the American College of Sports Medicine", q: "Med Sci Sports Exerc 45(1):186–205", doi: "10.1249/MSS.0b013e318279a10a",
      kern: "Konsens: von funktioneller Überlastung bis Übertraining; die Diagnose ist schwierig, vorbeugen heisst Erholung ernst nehmen." },
    wakayoshi1992: { zit: "Wakayoshi et al. 1992", a: "Wakayoshi K, Ikuta K, Yoshida T, et al.", j: 1992, t: "Determination and validity of critical velocity as an index of swimming performance in the competitive swimmer", q: "Eur J Appl Physiol 64(2):153–157", doi: "10.1007/BF00717953",
      kern: "Kritische Schwimmgeschwindigkeit aus der Distanz-Zeit-Geraden mehrerer Maximalstrecken – ein einfacher Ausdauer-Massstab." },
    dekerle2005: { zit: "Dekerle et al. 2005", a: "Dekerle J, Pelayo P, Clipet B, Depretz S, Lefevre T, Sidney M", j: 2005, t: "Critical swimming speed does not represent the speed at maximal lactate steady state", q: "Int J Sports Med 26(7):524–530", doi: "10.1055/s-2004-821227",
      kern: "CSS liegt etwas über dem Tempo des maximalen Laktat-Gleichgewichts – zügig, aber nicht beliebig lange haltbar." },
    knechtle2011: { zit: "Knechtle et al. 2011", a: "Knechtle B, Wirth A, Rüst CA, Rosemann T", j: 2011, t: "The relationship between anthropometry and split performance in recreational male Ironman triathletes", q: "Asian J Sports Med 2(1):23–30", doi: "10.5812/asjsm.34823",
      kern: "184 männliche Freizeit-Ironman-Finisher trainierten im Mittel 13,9 h pro Woche: 2,5 h Schwimmen, 7,1 h Rad, 4,3 h Laufen." },
    millet2002: { zit: "Millet et al. 2002", a: "Millet GP, Candau RB, Barbier B, Busso T, Rouillon JD, Chatard JC", j: 2002, t: "Modelling the transfers of training effects on performance in elite triathletes", q: "Int J Sports Med 23(1):55–63", doi: "10.1055/s-2002-19276",
      kern: "Radtraining wirkte auch auf die Laufleistung; Schwimmen war sehr spezifisch – kein Übertrag von oder zu Rad und Laufen." },
    andersen2013: { zit: "Andersen et al. 2013", a: "Andersen CA, Clarsen B, Johansen TV, Engebretsen L", j: 2013, t: "High prevalence of overuse injury among iron-distance triathletes", q: "Br J Sports Med 47(13):857–861", doi: "10.1136/bjsports-2013-092397",
      kern: "26 Wochen vor einem Langdistanz-Rennen: im Mittel 56 % mit Überlastungsbeschwerden, vor allem Knie, Unterschenkel und unterer Rücken." },
    clarsen2010: { zit: "Clarsen et al. 2010", a: "Clarsen B, Krosshaug T, Bahr R", j: 2010, t: "Overuse injuries in professional road cyclists", q: "Am J Sports Med 38(12):2494–2501", doi: "10.1177/0363546510376816",
      kern: "Bei Radprofis waren unterer Rücken und Knie die häufigsten Überlastungsorte." },
    sein2010: { zit: "Sein et al. 2010", a: "Sein ML, Walton J, Linklater J, et al.", j: 2010, t: "Shoulder pain in elite swimmers: primarily due to swim-volume-induced supraspinatus tendinopathy", q: "Br J Sports Med 44(2):105–113", doi: "10.1136/bjsm.2008.047282",
      kern: "Schulterschmerz bei Spitzenschwimmern kam meist von einer Sehnenreizung, die mit Stunden und Kilometern pro Woche zusammenhing." },
    bertelsen2017: { zit: "Bertelsen et al. 2017", a: "Bertelsen ML, Hulme A, Petersen J, et al.", j: 2017, t: "A framework for the etiology of running-related injuries", q: "Scand J Med Sci Sports 27(11):1170–1180", doi: "10.1111/sms.12883",
      kern: "Verletzung entsteht, wenn die Belastung einer Struktur deren Belastbarkeit übersteigt – über eine oder mehrere Einheiten." },
    buist2008: { zit: "Buist et al. 2008", a: "Buist I, Bredeweg SW, van Mechelen W, et al.", j: 2008, t: "No effect of a graded training program on the number of running-related injuries in novice runners: a randomized controlled trial", q: "Am J Sports Med 36(1):33–39", doi: "10.1177/0363546507307505",
      kern: "Laufanfänger (Vorbereitung auf 6,7 km) verletzten sich mit der 10-%-Regel nicht seltener (20,8 %) als mit einem schnelleren Plan (20,3 %)." },
    nielsen2014: { zit: "Nielsen et al. 2014", a: "Nielsen RØ, Parner ET, Nohr EA, Sørensen H, Lind M, Rasmussen S", j: 2014, t: "Excessive progression in weekly running distance and risk of running-related injuries: an association which varies according to type of injury", q: "J Orthop Sports Phys Ther 44(10):739–747", doi: "10.2519/jospt.2014.5164",
      kern: "Anfänger mit mehr als 30 % Steigerung über zwei Wochen schienen anfälliger für Umfangsverletzungen (statistisch knapp nicht gesichert)." },
    frandsen2025: { zit: "Frandsen et al. 2025", a: "Schuster Brandt Frandsen J, Hulme A, Parner ET, et al.", j: 2025, t: "How much running is too much? Identifying high-risk running sessions in a 5200-person cohort study", q: "Br J Sports Med 59(17):1203–1210", doi: "10.1136/bjsports-2024-109380",
      kern: "Ein Lauf mehr als 10 % länger als der längste der letzten 30 Tage ging mit mehr Verletzungen einher; die Veränderung von Woche zu Woche nicht." },
    lauersen2014: { zit: "Lauersen et al. 2014", a: "Lauersen JB, Bertelsen DM, Andersen LB", j: 2014, t: "The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials", q: "Br J Sports Med 48(11):871–877", doi: "10.1136/bjsports-2013-092538",
      kern: "Krafttraining senkte Sportverletzungen auf weniger als ein Drittel; Übungsprogramme insgesamt senkten Überlastungen fast auf die Hälfte; Dehnen half nicht." },
    gabbett2016: { zit: "Gabbett 2016", a: "Gabbett TJ", j: 2016, t: "The training–injury prevention paradox: should athletes be training smarter and harder?", q: "Br J Sports Med 50(5):273–280", doi: "10.1136/bjsports-2015-095788",
      kern: "Hohe, gut aufgebaute Belastung schützt eher; gefährlich sind schnelle Sprünge – Grundlage des Verhältnisses akute zu chronische Last." },
    impellizzeri2020: { zit: "Impellizzeri et al. 2020", a: "Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ", j: 2020, t: "Acute:chronic workload ratio: conceptual issues and fundamental pitfalls", q: "Int J Sports Physiol Perform 15(6):907–913", doi: "10.1123/ijspp.2019-0864",
      kern: "Das Verhältnis akute zu chronische Last ist statistisch problematisch und als Warnzeichen für Verletzungen ungenau." },
    impellizzeri2021: { zit: "Impellizzeri et al. 2021", a: "Impellizzeri FM, Woodcock S, Coutts AJ, Fanchini M, McCall A, Vigotsky AD", j: 2021, t: "What role do chronic workloads play in the acute to chronic workload ratio? Time to dismiss ACWR and its underlying theory", q: "Sports Med 51(3):581–592", doi: "10.1007/s40279-020-01378-6",
      kern: "Ersetzt man die chronische Last durch Zufallswerte, bleibt der Zusammenhang – das Verhältnis erklärt also nichts Eigenes." },
    garmin2025rt: { zit: "Garmin 2025, Laufbelastbarkeit", a: "Garmin Ltd.", j: 2025, t: "Running Tolerance", q: "Online-Handbuch (Herstellerangabe, nicht in Studien geprüft)", url: "https://www8.garmin.com/manuals/webhelp/GUID-EA668398-46E4-42E4-8163-12F6CB299F0E/EN-US/GUID-C83A37F8-1ECE-4FDD-A852-03764F1ECCFF.html",
      kern: "Rechnet jeden Lauf in «Belastungskilometer» um (Tempo, Steigung, Gefälle, Laufdynamik) und vergleicht mit einer persönlichen Obergrenze aus der Laufgeschichte." },
    garmin2025last: { zit: "Garmin 2025, Belastungsverhältnis", a: "Garmin Ltd.", j: 2025, t: "Acute Load – Load Ratio (fenix E)", q: "Online-Handbuch (Herstellerangabe)", url: "https://www8.garmin.com/manuals-apac/webhelp/fenixe/EN-SG/GUID-668BDF9F-C843-4AD0-97F7-39B294D36FE7-941.html",
      kern: "Akute Last = gewichtete Summe der Sauerstoffschuld nach Belastung (EPOC) der letzten Tage; Verhältnis akut zu chronisch «optimal» 0,8–1,4." },
    jeukendrup2014: { zit: "Jeukendrup 2014", a: "Jeukendrup A", j: 2014, t: "A step towards personalized sports nutrition: carbohydrate intake during exercise", q: "Sports Med 44(Suppl 1):S25–S33", doi: "10.1007/s40279-014-0148-z",
      kern: "Kohlenhydrate je Stunde nach Dauer: bis 30 g (1–2 h), bis 60 g (2–3 h), bis 90 g bei längeren Belastungen mit Glukose und Fruktose." },
    jeukendrup2017: { zit: "Jeukendrup 2017", a: "Jeukendrup AE", j: 2017, t: "Training the gut for athletes", q: "Sports Med 47(Suppl 1):101–110", doi: "10.1007/s40279-017-0690-6",
      kern: "Der Darm gewöhnt sich an Verpflegung während der Belastung – Rennverpflegung im Training üben." },
  };
  WS.link = (id) => { const q = WS.QUELLEN[id]; return q ? (q.doi ? "https://doi.org/" + q.doi : q.url || null) : null; };

  /* ---------------- Kapitel ---------------- */
  // text: Absätze (HTML erlaubt: <b>, <i>, <ul>, <li>, <dl>, <dt>, <dd>); [[id]] = Verweis auf eine Quelle; [[#kapitel]] = Verweis auf ein Kapitel.
  // seite: wo die Seite das umsetzt (Regel und Version). quellen: Literatur des Kapitels (jede im Text verwiesene steht dabei).
  WS.KAPITEL = [
    { id: "ueberblick", titel: "So entsteht dein Plan", kurz: "Drei Ebenen greifen ineinander: Die Phasen bestimmen, wie viele Stunden du trainierst. Das Trainingsmodell bestimmt, wie sich diese Stunden auf locker, mittel und hart verteilen. Die Zonen aus deinem Laktattest liefern die Zielwerte jeder Einheit. Tests halten die Zonen aktuell.",
      text: [
        "<b>Umfang – die Phasen.</b> Vom Hauptrennen aus rückwärts gerechnet: zwei Wochen Taper, acht Wochen wettkampfspezifisch, sechzehn Wochen Aufbau, davor Grundlage. Jede vierte Woche ist eine Erholungswoche. Die Wochenstunden steigen von deinem heutigen Stand gleichmässig bis zur Spitzenwoche vor dem Taper ([[#periodisierung]]).",
        "<b>Intensität – das Modell.</b> Das Modell legt fest, welche Schlüsseleinheiten in der Woche stehen und wie viel Zeit zwischen den Schwellen liegt. Standard ist «Winter polarisiert, ab Februar rennspezifisch» ([[#modelle]]).",
        "<b>Zielwerte – die Zonen.</b> LT1 und LT2 aus deinem Stufentest legen die Grenzen fest; daraus entstehen fünf Zonen für die Uhr und drei Bereiche für die Verteilung ([[#zonen]]).",
        "<b>Kontrolle – Tests und Rückmeldung.</b> Stufentests, Laktat-Kurzchecks und CSS-Tests kommen nach festen Regeln in den Kalender. Check-in, Ruhepuls, HRV und Schlaf fliessen in die Ampel ([[#erholung]]).",
        "<b>Gemessen, berechnet, angenommen.</b> Gemessen sind Puls, Leistung, Tempo, Laktat und Zeiten. Berechnet sind Schwellen, Zonen, Trainingslast und Verteilung. Angenommen ist, was du nicht selbst misst, etwa die Aufteilung der Stunden auf die Sportarten oder der Wirkungsgrad beim Radfahren – die Seite schreibt das jeweils dazu. Fehlt ein Wert, bleibt er leer.",
        "<b>Was die Seite nicht tut.</b> Sie schreibt nichts nach Garmin oder Enduco; solange Enduco läuft, ist der Wochenvorschlag ein Vergleich, kein Ersatz. Sie stellt keine Diagnosen: Bei Schmerzen, Krankheit oder auffälligen Werten entscheidest du – und im Zweifel eine Ärztin oder ein Arzt.",
      ],
      seite: [["AN", "saison"], ["V64", "modell"], ["V64", "woche"], ["V62", "testplan"], ["FK", "readiness"]], quellen: [] },

    { id: "begriffe", titel: "Begriffe kurz erklärt", kurz: "Die wichtigsten Abkürzungen der Seite in einem Satz. Ausführlicher in den Kapiteln.",
      text: [
        `<dl class="ws-dl">
          <dt>LT1 – erste Laktatschwelle, aerobe Schwelle</dt><dd>Die Belastung, ab der das Laktat im Blut erstmals deutlich über den Grundwert steigt. Darunter lässt sich lange trainieren. Entspricht ungefähr der ersten ventilatorischen Schwelle (VT1).</dd>
          <dt>LT2 – zweite Laktatschwelle, «anaerobe Schwelle»</dt><dd>Die höchste Belastung, bei der Bildung und Abbau von Laktat noch im Gleichgewicht sind. Darüber steigt das Laktat laufend. Liegt nahe beim maximalen Laktat-Gleichgewicht (MLSS) und bei VT2.</dd>
          <dt>MLSS – maximales Laktat-Gleichgewicht</dt><dd>Die höchste gleichmässige Belastung, bei der das Laktat über längere Zeit nicht weiter ansteigt. Genaueste Referenz für LT2, aber aufwendig: mehrere Dauertests an verschiedenen Tagen.</dd>
          <dt>VO2max</dt><dd>Die grösste Sauerstoffmenge, die dein Körper pro Minute aufnehmen und verwerten kann – die Obergrenze der aeroben Leistung.</dd>
          <dt>FTP</dt><dd>Im Radsport übliche Schätzung der Leistung, die etwa eine Stunde haltbar ist. Die Seite rechnet nicht damit, weil du nach Laktat trainierst.</dd>
          <dt>CSS – kritische Schwimmgeschwindigkeit</dt><dd>Dein Schwimm-Massstab aus einem 400-m- und einem 200-m-Test ([[#schwimmen]]).</dd>
          <dt>NP – Normalized Power</dt><dd>Durchschnittsleistung, bei der Spitzen stärker zählen (30-s-Mittel hoch vier, gemittelt, vierte Wurzel). Beschreibt schwankende Fahrten besser als der einfache Mittelwert.</dd>
          <dt>Trainingslast (TSS, tl2)</dt><dd>Dauer mal Intensität im Quadrat; eine Stunde genau an der Schwelle ergibt 100 ([[#last]]).</dd>
          <dt>Fitness, Ermüdung, Form</dt><dd>Gleitende Mittel der täglichen Last über 42 bzw. 7 Tage; Form = Fitness minus Ermüdung ([[#last]]).</dd>
          <dt>HRV (rMSSD)</dt><dd>Schwankung der Abstände zwischen Herzschlägen. Hoch im Vergleich zu deinem Normalbereich spricht für gute Erholung ([[#erholung]]).</dd>
          <dt>RPE, sRPE</dt><dd>Empfundene Anstrengung von 0 bis 10; mal Minuten ergibt die Einheitenlast sRPE.</dd>
          <dt>TID – Intensitätsverteilung</dt><dd>Anteil der Zeit locker, mittel und hart ([[#tid]]).</dd>
          <dt>PI – Polarisierungsindex</dt><dd>Zeigt, ob eine Verteilung polarisiert ist (über 2,00).</dd>
          <dt>Taper</dt><dd>Geplantes Zurückfahren des Umfangs vor einem Rennen ([[#taper]]).</dd>
          <dt>Koppellauf</dt><dd>Lauf direkt nach dem Radfahren.</dd>
          <dt>Ermüdungsresistenz</dt><dd>Wie gut Schwellen und Leistung nach Stunden Belastung erhalten bleiben ([[#langdistanz]]).</dd>
        </dl>`,
      ],
      seite: [], quellen: [] },

    { id: "zonen", titel: "Drei Bereiche, fünf Zonen", kurz: "Die Forschung beschreibt Intensität mit drei Bereichen, getrennt durch zwei Schwellen: unter LT1 locker, zwischen LT1 und LT2 mittel, über LT2 hart. Deine Uhr arbeitet mit fünf Zonen; deren Grenzen Z2/Z3 und Z3/Z4 liegen genau auf LT1 und LT2.",
      text: [
        "<b>Warum zwei Schwellen?</b> Unter LT1 bleibt das Laktat nahe beim Ruhewert und die Atmung ruhig; diese Belastung lässt sich stundenlang halten und ist am nächsten Tag kaum zu spüren. Zwischen LT1 und LT2 liegt das Laktat höher, bleibt aber stabil. Über LT2 findet der Körper kein Gleichgewicht mehr: Laktat und Atmung steigen weiter, die Belastung ist nur begrenzt haltbar. Dieses Drei-Bereiche-Modell ist die gemeinsame Sprache der Studien zur Intensitätsverteilung [[seiler2010]]. Swiss Olympic teilt die physiologischen Trainingszonen nach denselben zwei Übergängen ein [[swissolympic2005]].",
        "<b>Fünf Zonen auf der Seite.</b> Für Uhr und Workouts braucht es feinere Stufen. Der Zonen-Vorschlag setzt Z2/Z3 auf LT1 und Z3/Z4 auf LT2. Die äusseren Grenzen Z1/Z2 und Z4/Z5 misst kein Test; sie entstehen im Verhältnis einer norwegischen Fünf-Zonen-Skala: etwa 0,81 × LT1 und 1,07 × LT2 bei Leistung und Tempo, 0,88 × LT1 und 1,06 × LT2 beim Puls [[toennessen2024]]. Unterzonen wie FatMax oder Sweet Spot stammen aus dem Text deines Zonenprofils, nicht aus einer Rechnung.",
        "<b>Drei Bereiche für die Verteilung.</b> Für die Intensitätsverteilung zählt die Seite Z1 und Z2 als locker, Z3 als mittel, Z4 und Z5 als hart. Das Renntempo der Langdistanz liegt knapp unter LT1 und zählt darum als locker ([[#langdistanz]]).",
        "<b>Puls, Leistung oder Tempo?</b> Der Puls reagiert verzögert: In kurzen Intervallen erreicht er die Zielzone erst gegen Ende, in langen Einheiten steigt er bei gleicher Leistung langsam an (kardiale Drift, vor allem bei Wärme und Flüssigkeitsverlust) [[coyle2001]]. Darum steuern Intervalle über Watt oder Pace; der Puls zeigt, wie der Körper reagiert.",
        "<b>Zonen verändern sich.</b> Mit dem Training verschieben sich LT1 und LT2. Darum plant die Seite regelmässige Stufentests; neue Zonen gelten erst, wenn du sie bestätigst.",
      ],
      seite: [["V62", "zonenvorschlag"], ["V64", "tid"], ["FK", "zonen"]], quellen: ["seiler2010", "swissolympic2005", "toennessen2024", "coyle2001"] },

    { id: "laktat", titel: "Was Laktat ist", kurz: "Laktat ist kein Abfallprodukt, sondern ein Zwischenprodukt und Brennstoff: Muskeln bilden es ständig, andere Muskeln, das Herz und die Leber verwerten es. Der Blutwert zeigt das Gleichgewicht zwischen Bildung und Abbau – darum eignet er sich, um Schwellen zu finden.",
      text: [
        "<b>Ein Brennstoff, der wandert.</b> Laktat entsteht beim Abbau von Kohlenhydraten auch in Ruhe. Es wird aus den arbeitenden Muskelfasern ins Blut abgegeben und von anderen Fasern, dem Herz und der Leber wieder aufgenommen und verwertet. Dieses Bild des «Laktat-Shuttles» hat die alte Vorstellung von Laktat als reinem Abfallprodukt abgelöst [[brooks2018]].",
        "<b>Was der Blutwert zeigt.</b> Mit steigender Belastung wird mehr Laktat gebildet. Zuerst steigt auch der Abbau mit, der Blutwert bleibt nahe beim Grundwert. Ab LT1 steigt er erstmals deutlich, bleibt aber bei gleicher Belastung stabil. Ab LT2 übersteigt die Bildung den Abbau dauerhaft, der Wert steigt laufend [[faude2009]].",
        "<b>Was den Wert verfälscht.</b> Sind die Kohlenhydratspeicher leer, wird weniger Laktat gebildet: Die Kurve rutscht nach rechts und die Schwelle sieht besser aus, als die Form ist [[maassen1989]]. Auch eine harte Einheit am Vortag, Hitze, die Mahlzeit vor dem Test und die Stufendauer verschieben die Werte.",
        "<b>Was das für dich heisst.</b> Tests immer unter ähnlichen Bedingungen: ausgeruht, gleiche Mahlzeit vorher, gleiches Protokoll, gleiches Messgerät ([[#laktat-messen]]).",
      ],
      seite: [], quellen: ["brooks2018", "faude2009", "maassen1989"] },

    { id: "laktat-messen", titel: "Laktat richtig messen", kurz: "Der Wert hängt von Gerät, Blutstropfen und Protokoll ab. Gleiches Protokoll, saubere Entnahme und das Wissen um den Messfehler sind wichtiger als die zweite Stelle nach dem Komma.",
      text: [
        "<b>Das Gerät.</b> Handgeräte wie der Lactate Pro 2 messen gut wiederholbar (Variationskoeffizient 3,3 %, bis 4 mmol/l meist innerhalb ±0,3 mmol/l). Sie zeigen aber im Mittel rund 1,4-mal höhere Werte als ein Laborgerät – die Belastung an der Schwelle kam trotzdem gleich heraus [[crotty2021]]. Darum taugen fixe Grenzen wie 2 oder 4 mmol/l nur zur Orientierung, und Werte verschiedener Geräte oder Labors lassen sich nicht direkt vergleichen.",
        "<b>Die Entnahme.</b> Ohrläppchen oder Fingerbeere, Haut trocken und sauber, den ersten Tropfen abwischen: Schweiss oder Reste auf der Haut verfälschen den Wert. Bei kalten Händen fliesst das Blut schlecht; dann lieber das Ohr.",
        "<b>Das Protokoll.</b> Stufendauer und Auswertung verändern die Schwelle: Bei kurzen Stufen hinkt das Laktat der Belastung hinterher, die Schwelle wirkt höher. In einer Vergleichsstudie traf die modifizierte Dmax aus 4-min-Stufen das maximale Laktat-Gleichgewicht am besten [[jamnick2018]]. Wichtiger als das «beste» Protokoll ist, immer dasselbe zu nehmen [[bentley2007]].",
        "<b>Der Kurzcheck im Training.</b> Ein Wert am Ende eines gleichmässigen Blocks zeigt, ob du bei dieser Leistung noch locker bist. Vergleichen lässt er sich nur mit Werten bei gleicher Leistung und ähnlichen Bedingungen. Die Seite urteilt «steigt» oder «sinkt» erst, wenn der Unterschied grösser ist als der doppelte Messfehler.",
        "<b>Messfehler in der Auswertung.</b> Jede Schwelle wird 4000-mal mit einem zufälligen Messfehler von max(0,15 mmol/l; 7,5 %) neu gerechnet. Das Band um die Schwelle zeigt, wie sicher sie ist – ein schmales Band heisst: verlässlich.",
      ],
      seite: [["FK", "laktat_drift"]], quellen: ["crotty2021", "jamnick2018", "bentley2007"] },

    { id: "schwellen", titel: "Schwellen aus der Laktatkurve: die Methoden", kurz: "Es gibt Dutzende Methoden, und sie liefern verschiedene Werte; austauschbar sind sie nicht. Die Seite rechnet je Schwelle drei anerkannte Methoden, nimmt die Mitte der gültigen und zeigt die Streuung.",
      text: [
        "<b>Warum mehrere Methoden?</b> Eine Laktatkurve hat keinen eindeutigen Knick. Jede Methode legt anders fest, wo der Übergang liegt, und die Ergebnisse unterscheiden sich [[jamnick2020]] [[faude2009]]. Mehrere Methoden nebeneinander zeigen, wie eindeutig dein Test ist.",
        `<b>LT1 (erste Schwelle).</b><ul>
          <li><b>Anstieg ≥ 0,4 mmol/l</b> (Regel deiner Auswertungsvorlage SOMC): die letzte Stufe vor dem ersten Anstieg um mindestens 0,4 mmol/l.</li>
          <li><b>Basis + 0,5 mmol/l:</b> Grundwert (Mittel der ersten drei Stufen) plus 0,5 mmol/l – eine Variante der Konzepte «fester Abstand zum Grundwert» [[faude2009]].</li>
          <li><b>log-log:</b> Laktat und Belastung logarithmiert ergeben zwei Geraden; ihr Schnittpunkt ist LT1 [[beaver1985]]. Braucht mindestens sechs Stufen.</li></ul>`,
        `<b>LT2 (zweite Schwelle).</b><ul>
          <li><b>Dickhuth:</b> Laktat am Tiefpunkt des Laktatäquivalents (Laktat geteilt durch Leistung) plus 1,5 mmol/l [[dickhuth1999]].</li>
          <li><b>Dmax:</b> grösster Abstand zwischen der geglätteten Kurve und der Geraden vom ersten zum letzten Punkt [[cheng1992]].</li>
          <li><b>modifizierte Dmax:</b> wie Dmax, die Gerade beginnt aber bei der Stufe vor dem ersten Anstieg über 0,4 mmol/l [[bishop1998]].</li></ul>
          Beide Dmax-Varianten hängen vom letzten Punkt ab und gelten darum nur bei einem ausbelasteten Test.`,
        "<b>Feste Werte 2 und 4 mmol/l.</b> Historisch wurden Schwellen bei festen Laktatwerten gesetzt [[kindermann1979]] [[heck1985]]. Einfach, aber die persönlichen Unterschiede sind gross, und Geräte messen verschieden hoch. Die Seite zeigt sie nur zur Orientierung.",
        "<b>Was die Seite daraus macht.</b> Schwelle = Mitte der gültigen Methoden, nie ausserhalb der gemessenen Stufen (keine Verlängerung der Kurve). Der Puls an der Schwelle kommt aus der FIT-Datei (30 s vor der Blutentnahme). Neue Werte gelten erst nach deiner Bestätigung.",
      ],
      seite: [["V62", "zonenvorschlag"]], quellen: ["jamnick2020", "faude2009", "beaver1985", "dickhuth1999", "cheng1992", "bishop1998", "kindermann1979", "heck1985"] },

    { id: "tid", titel: "Intensitätsverteilung: polarisiert, pyramidal, Schwelle", kurz: "Erfolgreiche Ausdauersportler trainieren den grössten Teil ihrer Zeit locker. Die Modelle unterscheiden sich darin, wie der Rest verteilt wird. Polarisiert und pyramidal wirken ähnlich gut; polarisiert hat einen kleinen Vorteil bei der VO2max, vor allem in kurzen Blöcken und bei gut Trainierten.",
      text: [
        "<b>Was man beobachtet.</b> Wer im Ausdauersport erfolgreich ist, verbringt den grössten Teil der Trainingszeit unter LT1. Bei jungen Skilangläufern war es rund drei Viertel [[seiler2006]]; in Übersichten liegt die lockere Zeit meist um 80 % oder höher [[seiler2010]] [[haugen2022]]. Auch Ironman-Altersklassenathleten trainierten überwiegend locker, aber mit viel Zeit im mittleren Bereich (etwa 69/25/6) [[neal2011]].",
        `<b>Die Muster.</b> Mit drei Bereichen (locker, mittel, hart) unterscheidet man [[stoeggl2015]]:<ul>
          <li><b>polarisiert:</b> locker &gt; hart &gt; mittel – wenig Zeit zwischen den Schwellen;</li>
          <li><b>pyramidal:</b> locker &gt; mittel &gt; hart;</li>
          <li><b>schwellenbetont:</b> viel Zeit im mittleren Bereich.</li></ul>
          Der Polarisierungsindex macht das messbar: PI = log10(locker ÷ mittel × hart × 100) mit den Zeitanteilen; über 2,00 gilt als polarisiert [[treff2019]].`,
        "<b>Was Studien zeigen.</b> In einer neunwöchigen Studie mit 48 gut trainierten Athleten verbesserte die polarisierte Gruppe die VO2peak am stärksten [[stoeggl2014]]. Freizeitläufer verbesserten sich über 10 km mit polarisiertem Training mehr als mit viel Zeit im mittleren Bereich [[munoz2014b]]. Eine frühe Meta-Analyse sah beim Zeitfahren einen Vorteil für polarisiert, bei wenigen Studien [[rosenblat2019]]. Die neueren, grösseren Auswertungen sind zurückhaltender: polarisiert leicht besser für die VO2peak, vor allem in Blöcken unter 12 Wochen und bei Hochtrainierten, sonst gleich [[oliveira2024]]; nach Puls-Zeit kein Unterschied zwischen polarisiert und pyramidal, Wettkampfsportler eher mit polarisiert, Freizeitsportler eher mit pyramidal besser [[rosenblat2025]].",
        "<b>Die Reihenfolge.</b> Bei gut trainierten Läufern wirkten alle vier geprüften Abfolgen; acht Wochen pyramidal gefolgt von acht Wochen polarisiert brachte am meisten [[filipas2022]]. Für Ironman-Athleten gibt es dazu keine Studie.",
        "<b>Die Debatte.</b> Eine Seite argumentiert, polarisiert sei das Muster der Besten [[foster2022]]; die andere, die Belege seien dünn und Umfang sowie die richtigen Belastungsbereiche zählten mehr [[burnley2022]]. Einig sind sich beide: Der grösste Teil bleibt locker.",
        "<b>Wie man zählt, verändert das Bild.</b> Nach Puls gezählt erscheint eine Woche weniger hart, weil der Puls in Intervallen verzögert steigt und die Pausen tief zählen; nach dem Ziel jeder Einheit gezählt erscheint sie härter [[sylta2014]]. Die Seite zählt den Vorschlag und den Enduco-Plan nach den Zielen der Abschnitte (nur die Arbeitsintervalle hart), das Absolvierte nach Puls – die Zahlen sind darum nicht ganz gleich zu lesen.",
      ],
      seite: [["V64", "tid"], ["FK", "zonen"]], quellen: ["seiler2006", "seiler2010", "haugen2022", "neal2011", "stoeggl2015", "treff2019", "stoeggl2014", "munoz2014b", "rosenblat2019", "oliveira2024", "rosenblat2025", "filipas2022", "foster2022", "burnley2022", "sylta2014"] },

    { id: "modelle", titel: "Die Modelle zur Auswahl", kurz: "Fünf Wahlmöglichkeiten im Plan. Alle teilen dieselbe Wochenstruktur und denselben grossen lockeren Anteil; sie unterscheiden sich in den zwei Schlüsseleinheiten (Laufen am Dienstag, Rad am Donnerstag) und in den langen Einheiten.",
      text: [
        "<b>Polarisiert.</b> Zwei harte Intervall-Einheiten: Rad 3 Serien à 13 × 30 s hart / 15 s locker [[roennestad2015]], Laufen 4 × 4 min hart mit 3 min Trab [[helgerud2007]]. Dazwischen fast nur locker. Stark für die VO2max in Blöcken bis etwa 12 Wochen [[oliveira2024]] [[stoeggl2014]]. Prüfung: locker &gt; hart &gt; mittel, mindestens 75 % locker.",
        "<b>Pyramidal.</b> Rad 3 × 15 min knapp unter LT2, Laufen 4 × 4 min hart. Mehr Zeit im mittleren Bereich als hart. In Studien gleich wirksam wie polarisiert, bei Freizeitsportlern teils besser [[rosenblat2025]] [[stoeggl2015]]. Prüfung: locker &gt; mittel &gt; hart, mindestens 70 % locker.",
        "<b>Schwelle mit Laktat (norwegisch).</b> Rad 5 × 8 min und Laufen 6 × 5 min knapp unter LT2, mit Laktat kontrolliert; fast nichts darüber ([[#norwegisch]]). Prüfung: pyramidal, höchstens 5 % hart.",
        "<b>Rennspezifisch.</b> Für die Langdistanz zählt die Dauerleistung um LT1 [[laursen2005]]: Tempo-Einheiten (Rad 2 × 20 min, Laufen 3 × 10 min in Z3), Renntempo in der langen Ausfahrt und am Schluss des langen Laufs, Koppellauf am Samstag [[millet2000]]. Der mittlere Bereich bleibt begrenzt, weil viel Zeit dort in einer Ironman-Saison mit schlechteren Rennzeiten einherging [[munoz2014a]]. Prüfung: pyramidal oder polarisiert, mindestens 75 % locker, höchstens 10 % hart.",
        "<b>Kombiniert – dein Standard.</b> Bis zum Wechsel (vorgegeben: 1. Februar im Jahr des Hauptrennens) polarisiert, danach rennspezifisch. Begründung: Im Winter steht die Grundlage mit gezielten VO2max-Reizen im Vordergrund, wo polarisiert in Blöcken bis 12 Wochen leicht im Vorteil ist [[oliveira2024]]; ab Februar wird das Training dem Rennen ähnlicher [[laursen2005]] [[munoz2014a]]. Ehrlich gesagt: Dass diese Reihenfolge die beste ist, belegt keine Studie – bei Läufern war sogar die umgekehrte Abfolge (pyramidal, dann polarisiert) am wirksamsten [[filipas2022]]. Das Datum lässt sich im Plan ändern.",
        "<b>Die Wochenstruktur (alle Modelle).</b> Montag frei; Dienstag Lauf-Schlüsseleinheit und Schwimmkurs; Mittwoch Rad locker; Donnerstag Rad-Schlüsseleinheit und CSS-Schwimmen; Freitag Laufen locker; Samstag lange Ausfahrt (rennspezifisch mit Koppellauf); Sonntag langer Lauf und Schwimmen. Stunden: Schwimmen 20 %, Rad 50 %, Laufen 30 % (eigene Festlegung, [[#aufbau]]). Unter 7 Stunden fallen die lockeren Einheiten unter der Woche weg. Erholungswoche: nur eine, gekürzte Schlüsseleinheit. Taper: Schlüsseleinheiten halbiert, Intensität bleibt ([[#taper]]). Tests ersetzen die Einheit derselben Sportart; vor einem Stufentest wird die Schlüsseleinheit derselben Sportart locker.",
        "<b>Was nicht drin ist.</b> Krafttraining plant der Vorschlag nicht ein, obwohl es Ökonomie und Leistung verbessern kann ([[#langdistanz]]). Und: Der Vorschlag ersetzt Enduco nicht, solange du mit Enduco trainierst.",
      ],
      seite: [["V64", "modell"], ["V64", "woche"], ["V64", "aufteilung"]], quellen: ["roennestad2015", "helgerud2007", "oliveira2024", "stoeggl2014", "rosenblat2025", "stoeggl2015", "laursen2005", "millet2000", "munoz2014a", "filipas2022"] },

    { id: "norwegisch", titel: "Die norwegische Methode", kurz: "Viel lockerer Umfang und mehrere Einheiten knapp unter der zweiten Schwelle, deren Intensität mit Laktat überwacht wird. Ziel: möglichst viel Arbeit nahe der Schwelle bei wenig Ermüdung.",
      text: [
        "<b>Woher sie kommt.</b> Norwegische Langstreckenläufer und Triathleten trainieren mit sehr viel lockerem Umfang und mehreren Schwellen-Einheiten pro Woche, oft zwei an einem Tag («Doppel-Schwelle»), dazu wenig sehr hartes Training. Die Intensität wird mit Laktat geführt, als Anhalt etwa 2–4,5 mmol/l, gemessen alle ein bis drei Wiederholungen [[casado2023]].",
        "<b>Die Idee dahinter.</b> Knapp unter LT2 lässt sich viel Arbeit leisten, ohne die Erholung so zu belasten wie Intervalle über der Schwelle. Kurze Wiederholungen mit kurzen Pausen halten die Belastung kontrolliert. Norwegische Einheitenmodelle setzen allgemein mehr moderate als sehr harte Einheiten und gestalten Intervalle umfangreich, kontrolliert und nicht bis zur Erschöpfung [[toennessen2024]].",
        "<b>Angepasst für dich.</b> Die Profis trainieren ein Vielfaches deiner Stunden. Der Vorschlag nimmt darum nur zwei Schwellen-Einheiten pro Woche (Laufen Dienstag, Rad Donnerstag), keine Doppel-Schwelle, und kontrolliert Laktat nach der zweiten und vierten Wiederholung. Liegt der Wert über deinem Wert an der LT2 aus dem Stufentest, wird die nächste Wiederholung leichter (eigene Regel, keine Studie).",
        "<b>Warum dein eigener Wert zählt.</b> Messgeräte zeigen unterschiedlich hohe Werte; der Lactate Pro 2 etwa liegt im Mittel deutlich über einem Laborgerät [[crotty2021]]. Zahlen aus Berichten über Profis lassen sich darum nicht einfach übernehmen – massgebend ist dein Wert an der LT2, gemessen mit deinem Gerät.",
        "<b>Wofür sie passt.</b> Für Athleten, die viel Umfang vertragen und Laktat selbst messen. Weltklasse-Läufer zeigen ein ähnliches Bild: sehr viel locker, Schwellenarbeit kontrolliert [[haugen2022]].",
      ],
      seite: [["V64", "modell"]], quellen: ["casado2023", "toennessen2024", "crotty2021", "haugen2022"] },

    { id: "periodisierung", titel: "Phasen, Erholungswochen und Blöcke", kurz: "Die Saison läuft vom Allgemeinen zum Spezifischen: Grundlage, Aufbau, wettkampfspezifisch, Taper. Erholungswochen in festem Rhythmus geben dem Körper Zeit, die Belastung umzusetzen.",
      text: [
        "<b>Klassisch.</b> Zuerst Umfang und Grundlage, dann mehr Intensität und zuletzt rennähnliches Training. Erholungswochen nach zwei bis drei Belastungswochen sind verbreitete Praxis. Wie Olympiasieger ihr Jahr vor dem Titel aufgebaut haben, zeigt eine norwegische Fallsammlung [[toennessen2014]].",
        "<b>Blöcke.</b> Blockperiodisierung bündelt wenige Ziele je Block statt vieler gleichzeitig [[issurin2010]]. Bei trainierten Radfahrern brachte ein Block mit vielen harten Intervallen in einer Woche, gefolgt von Wochen mit wenigen, bessere Effekte als die gleichmässige Verteilung [[roennestad2014a]] [[roennestad2014b]]. Kritiker warnen: Die Belege für starre Schemata sind dünn, gute Planung richtet sich nach der Reaktion des Athleten [[kiely2010]].",
        "<b>So rechnet die Seite (saison-1.0).</b> Vom Hauptrennen rückwärts: Taper 2 Wochen, wettkampfspezifisch 8, Aufbau 16, davor Grundlage. Jede vierte Woche Erholung (3:1). Ein B-Rennen bekommt eine Woche Mini-Taper und danach eine Erholungswoche. Die Stunden steigen gleichmässig von deinem heutigen Stand (Median der letzten 8 Wochen) bis zur Spitzenwoche (vorbelegt mit dem grösseren Wert aus 1,35 × heute und dem Mittel deiner 4 grössten Wochen im letzten Jahr). Erholungswochen 65 %, Woche mit B-Rennen 50 %, Taper 60 % und 40 % der Spitze.",
        "<b>Phase und Modell sind zwei Dinge.</b> Die Phase bestimmt den Umfang, das Modell die Verteilung der Intensität. «Aufbau» im Februar und «rennspezifisch» als Modell schliessen sich nicht aus.",
      ],
      seite: [["AN", "saison"]], quellen: ["toennessen2014", "issurin2010", "roennestad2014a", "roennestad2014b", "kiely2010"] },

    { id: "aufbau", titel: "Sportarten verteilen und Umfang aufbauen", kurz: "Das Rad trägt den grössten Teil des Umfangs: Es macht rund die Hälfte der Rennzeit aus, kommt ohne Aufprall aus und hilft auch dem Laufen. Laufen ist durch die Belastbarkeit von Sehnen und Knochen begrenzt, Schwimmen braucht eigene Zeit im Wasser. Einen gesicherten Score gegen Verletzungen gibt es nicht; der klarste Befund beim Laufen: kein einzelner Lauf mehr als 10 % länger als der längste der letzten 30 Tage.",
      text: [
        "<b>Wie die Stunden verteilt werden.</b> Die Seite teilt die Wochenstunden fest auf: Schwimmen 20 %, Rad 50 %, Laufen 30 % (aufteilung-1.0, eigene Festlegung). Das liegt nahe bei dem, was 184 männliche Freizeit-Triathleten vor einem Ironman trainierten: im Mittel 13,9 Stunden pro Woche, davon 2,5 Schwimmen, 7,1 Rad und 4,3 Laufen, also rund 18/51/31 % [[knechtle2011]]. Im Rennen sieht es ähnlich aus: Bei rund 11 Stunden, etwa 1:20 Schwimmen, 5:40 Rad und 4:00 Laufen (Beispiel, ohne Wechsel), entfallen rund 12 % der Zeit aufs Schwimmen, 52 % aufs Rad und 36 % aufs Laufen.",
        "<b>Was sich überträgt.</b> In einer kleinen Studie mit vier Elite-Triathleten über 40 Wochen wirkte Radtraining auch auf die Laufleistung; Schwimmtraining wirkte dagegen weder auf die anderen Sportarten, noch profitierte das Schwimmen von ihnen – Schwimmen ist sehr spezifisch [[millet2002]]. Darum braucht Schwimmen eigene, regelmässige Zeit im Wasser, während das Rad viel Grundlage liefert, ohne die Beine wie beim Laufen zu belasten. Wo die Schwäche liegt (bei vielen das Schwimmen) und welches Ziel zählt (etwa ein schneller Marathon), verschiebt die Anteile; die feste Aufteilung ist nur ein Ausgangspunkt.",
        "<b>Wo Überlastungen entstehen.</b> In den 26 Wochen vor einem Langdistanz-Rennen hatte im Mittel mehr als die Hälfte der Athleten gerade Überlastungsbeschwerden, am häufigsten an Knie, Unterschenkel und unterem Rücken, dazu an der Schulter [[andersen2013]]. Bei Radprofis betrafen Überlastungen am häufigsten den unteren Rücken und die Knie [[clarsen2010]]; bei Spitzenschwimmern kam Schulterschmerz meist von einer Sehnenreizung, die mit den geschwommenen Stunden und Kilometern pro Woche zusammenhing [[sein2010]].",
        "<b>Belastung gegen Belastbarkeit.</b> Jede Struktur – Sehne, Knochen, Knorpel – hält eine bestimmte Belastung aus. Jede Einheit belastet sie und senkt ihre Belastbarkeit vorübergehend; übersteigt die Belastung die Belastbarkeit, in einer Einheit oder über mehrere, entsteht eine Verletzung. Gewicht, Tempo, Untergrund, Schuhe und Technik bestimmen, wie viel auf welche Struktur fällt [[bertelsen2017]]. Darum kann die Ausdauer bereit sein, während Sehnen und Knochen noch nicht so weit sind – etwa, wenn viel Kondition vom Rad kommt.",
        "<b>Laufumfang aufbauen: was belegt ist.</b> Die bekannte 10-%-Regel pro Woche schützte Laufanfänger, die sich auf einen 6,7-km-Lauf vorbereiteten, in einer randomisierten Studie nicht besser als ein schnellerer Plan [[buist2008]]. Anfänger, die ihren Wochenumfang innerhalb von zwei Wochen um mehr als 30 % steigerten, schienen anfälliger für typische Umfangsverletzungen wie das Läuferknie (statistisch knapp nicht gesichert) [[nielsen2014]]. Eine grosse Kohortenstudie mit über 5000 Läuferinnen und Läufern, deren Läufe 18 Monate lang mit Garmin-Uhren erfasst wurden, fand den deutlichsten Zusammenhang beim einzelnen Lauf: War er 10–30 % länger als der längste Lauf der letzten 30 Tage, lag die Rate an Überlastungsverletzungen rund 1,6-mal so hoch, bei 30–100 % rund 1,5-mal, bei mehr als doppelter Distanz rund 2,3-mal. Die Veränderung von Woche zu Woche hing dagegen nicht mit Verletzungen zusammen [[frandsen2025]].",
        "<b>Was daraus folgt.</b> Den langen Lauf in kleinen Schritten verlängern, höchstens etwa 10 % über den längsten der letzten 30 Tage. Mehr Wochenumfang lieber über einen zusätzlichen lockeren Lauf holen als über einen viel längeren; das ist eine Folgerung aus der Studie oben, kein eigener Befund [[frandsen2025]]. Schnelle Abschnitte und schnelles Bergablaufen belasten die Beine laut Garmin stärker als lockere Kilometer auf flachem Weg [[garmin2025rt]]. Und Kraft: In einer Meta-Analyse randomisierter Studien zu Sportverletzungen allgemein senkte Krafttraining die Verletzungen auf weniger als ein Drittel; Übungsprogramme insgesamt senkten Überlastungen fast auf die Hälfte, Dehnen half nicht [[lauersen2014]].",
        `<b>Scores – was es gibt.</b><ul>
          <li><b>Belastungsverhältnis (akute zu chronische Last):</b> Last der letzten Tage im Verhältnis zur gewohnten Last der letzten Wochen; Garmin nennt 0,8–1,4 «optimal» [[garmin2025last]]. Die Idee dahinter: Wer an hohe Belastung gewöhnt ist, verletzt sich eher seltener, gefährlich sind schnelle Sprünge [[gabbett2016]]. Kritiker zeigen, dass das Verhältnis statistisch verzerrt und als Warnzeichen ungenau ist [[impellizzeri2020]] [[impellizzeri2021]]; in der grossen Läufer-Kohorte ging ein höheres Verhältnis sogar mit weniger Verletzungen einher [[frandsen2025]]. Garmins Wert fasst alle Sportarten zusammen und misst die Kreislaufbelastung, nicht die Belastung der Beine.</li>
          <li><b>Laufbelastbarkeit (Running Tolerance):</b> rechnet jeden Lauf in «Belastungskilometer» um (Tempo, Steigung und Gefälle, Laufdynamik) und vergleicht mit einer persönlichen Obergrenze aus der Laufgeschichte [[garmin2025rt]]. Sie betrachtet als einzige das Laufen getrennt, ist aber eine Herstellerangabe ohne Prüfung in Studien und nicht auf allen Uhren verfügbar.</li>
          <li><b>Einzellauf gegen den längsten Lauf der letzten 30 Tage:</b> einfach selbst zu rechnen; in der grossen Kohorte der klarste Zusammenhang [[frandsen2025]].</li></ul>`,
        "<b>Schwimmen und Rad.</b> Für beide gibt es keinen gesicherten Score. Schwimmen: Meter pro Woche schrittweise steigern und Schulterschmerz ernst nehmen, denn die Sehnenreizung hing mit dem Umfang zusammen [[sein2010]]; lieber öfter als länger (übliche Praxis). Rad: kein Aufprall; begrenzend sind Ermüdung und Sitzposition, Rücken und Knie sind die häufigsten Überlastungsorte [[clarsen2010]]. Eine neue Position, etwa auf einem Zeitfahrrad, darum schrittweise verlängern (übliche Praxis, keine Studie). Die Gesamtermüdung zeigen Form und Ampel ([[#last]], [[#erholung]]).",
        "<b>Auf der Seite.</b> Der Wochenvorschlag steigert die Stunden vom heutigen Stand linear bis zur Spitze vor dem Taper, mit leichteren Erholungswochen dazwischen ([[#periodisierung]]), und begrenzt die längste Einheit je Phase. Eine eigene Kontrolle «einzelner Lauf gegen den längsten Lauf der letzten 30 Tage» gibt es noch nicht.",
      ],
      seite: [["V64", "aufteilung"], ["V64", "woche"], ["AN", "saison"]], quellen: ["knechtle2011", "millet2002", "andersen2013", "clarsen2010", "sein2010", "bertelsen2017", "buist2008", "nielsen2014", "frandsen2025", "garmin2025rt", "lauersen2014", "garmin2025last", "gabbett2016", "impellizzeri2020", "impellizzeri2021"] },

    { id: "taper", titel: "Taper: die letzten Wochen vor dem Rennen", kurz: "Umfang deutlich runter, Intensität und Häufigkeit halten. So baut sich Ermüdung ab, ohne dass die Anpassungen verloren gehen.",
      text: [
        "<b>Was wirkt.</b> Eine Meta-Analyse fand den grössten Nutzen bei etwa zwei Wochen Taper mit 41–60 % weniger Umfang, gleicher Intensität und gleicher Häufigkeit [[bosquet2007]]. Die Grundidee: Ermüdung klingt schneller ab als Fitness ([[#last]]); fällt die Intensität weg, gehen Anpassungen verloren [[mujika2003]].",
        "<b>Wie lange?</b> Weltklasse-Läufer tapern eher kurz, etwa eine bis eineinhalb Wochen [[haugen2022]]. Für die Langdistanz mit hohem Umfang sind zwei Wochen verbreitet; die Seite nimmt zwei.",
        "<b>So setzt es der Vorschlag um.</b> Taperwochen mit 60 % und 40 % der Spitzenstunden. Schlüsseleinheiten bleiben, aber mit der Hälfte der Wiederholungen. Rennwoche: zwei Tage vorher frei, am Vortag 30 min locker mit drei kurzen, zügigen Abschnitten (Aktivierung). Die Ruhe- und Aktivierungstage sind übliche Praxis, keine Studienvorgabe.",
      ],
      seite: [["AN", "saison"], ["V64", "woche"]], quellen: ["bosquet2007", "mujika2003", "haugen2022"] },

    { id: "langdistanz", titel: "Was die Langdistanz verlangt", kurz: "Ein Ironman wird um die erste Schwelle gefahren und gelaufen. Entscheidend sind eine hohe Leistung an LT1, Ermüdungsresistenz über viele Stunden, Verpflegung und der Wechsel vom Rad zum Laufen.",
      text: [
        "<b>Renntempo um LT1.</b> Im Ironman lag der Puls auf dem Rad und beim Laufen nahe dem Puls an der ersten ventilatorischen Schwelle [[laursen2005]]. Für dich ist darum LT1 die wichtigste Schwelle. Die Seite definiert Renntempo knapp darunter: Rad 95–100 % der Leistung an LT1, Laufen bis 3 % langsamer als das Tempo an LT1 (eigene Festlegung).",
        "<b>Was sonst zählt.</b> Leistung an den Schwellen, Ökonomie, ein guter Fettstoffwechsel, Verpflegung und Wärmehaushalt [[laursen2001]].",
        "<b>Ermüdungsresistenz.</b> Nach Stunden Belastung verschieben sich Schwellen und Leistung; wie stark, ist eine eigene, trainierbare Eigenschaft [[maunder2021]]. Lange Einheiten trainieren sie. Die Seite misst sie in «Ausdauer» (Puls früh gegen spät bei gleicher Leistung, beste 20 min nach 2–5 Stunden).",
        "<b>Puls-Drift.</b> Bei langer gleichmässiger Belastung steigt der Puls, vor allem durch Wärme und Flüssigkeitsverlust [[coyle2001]]. Im Rennen darum nach Watt und Gefühl steuern, den Puls als Warnzeichen lesen.",
        "<b>Koppeln.</b> Nach dem Rad laufen sich die ersten Minuten anders an; Schritt und Ökonomie verändern sich, der Wechsel lässt sich trainieren [[millet2000]].",
        "<b>Viel Mitte?</b> In einer Ironman-Saison ging mehr lockere Zeit mit besseren und mehr Zeit im mittleren Bereich mit schlechteren Rennzeiten einher – ein Zusammenhang, kein Beweis [[munoz2014a]]. Altersklassenathleten trainieren oft viel im mittleren Bereich [[neal2011]].",
        "<b>Kraft.</b> Schweres Krafttraining zusätzlich zum Ausdauertraining kann Ökonomie und Leistung verbessern, ohne die VO2max zu senken [[roennestad2014c]]. Der Wochenvorschlag plant es nicht ein; ein bis zwei kurze Einheiten pro Woche im Winter sind eine Überlegung wert.",
      ],
      seite: [["FK", "langfahrt"], ["AN", "ermuedung"]], quellen: ["laursen2005", "laursen2001", "maunder2021", "coyle2001", "millet2000", "munoz2014a", "neal2011", "roennestad2014c"] },

    { id: "intervalle", titel: "Intervalle: welche und warum", kurz: "Harte Intervalle sollen möglichst viel Zeit nahe der VO2max bringen, ohne unnötig zu ermüden. Dauer, Intensität und Pausen bestimmen, ob das gelingt.",
      text: [
        "<b>Das Prinzip.</b> Ob lange Intervalle, kurze Intervalle oder Sprints: Über Dauer, Intensität und Pausen lässt sich steuern, wie viel Zeit nahe der VO2max zusammenkommt und wie stark Muskulatur und anaerober Stoffwechsel belastet werden [[buchheit2013a]] [[buchheit2013b]].",
        "<b>4 × 4 min (Laufen).</b> 4 × 4 min bei 90–95 % der maximalen Herzfrequenz mit 3 min Trab steigerten die VO2max in einer Studie um 7,2 %, 15 s hart / 15 s locker um 5,5 % [[helgerud2007]].",
        "<b>30/15 (Rad).</b> 3 Serien à 13 × 30 s hart / 15 s locker brachten bei gut trainierten und bei Elite-Radfahrern mehr als lange Intervalle (4 × 5 min) mit gleicher empfundener Anstrengung [[roennestad2015]] [[roennestad2020]].",
        "<b>Schwellen-Intervalle.</b> Mehrere Wiederholungen knapp unter LT2 mit kurzen Pausen: viel Arbeit an der Schwelle bei überschaubarer Ermüdung ([[#norwegisch]]).",
        "<b>Dosierung.</b> Alle Wiederholungen gleich stark; bricht die Leistung deutlich ein, ist die Einheit vorbei. Harte Einheiten nur nach einem guten Morgen – zeigt die Ampel Vorsicht, die Einheit locker fahren oder schieben.",
      ],
      seite: [["V64", "woche"]], quellen: ["buchheit2013a", "buchheit2013b", "helgerud2007", "roennestad2015", "roennestad2020"] },

    { id: "last", titel: "Trainingslast, Fitness und Form", kurz: "Jede Einheit erzeugt Fitness und Ermüdung. Die Ermüdung klingt schneller ab; die Differenz ist die Form. Wie gross die Last einer Einheit ist, berechnet die Seite aus Dauer und Intensität relativ zu deiner LT2.",
      text: [
        "<b>Das Modell.</b> Im Impuls-Antwort-Modell erzeugt jede Einheit einen Fitness- und einen Ermüdungsanteil; die Leistung ist ihre Differenz [[banister1975]] [[morton1990]]. Die Seite rechnet mit festen Zeitkonstanten: Fitness als gleitendes Mittel über 42 Tage, Ermüdung über 7 Tage, Form = Fitness minus Ermüdung desselben Tages. Die Zeitkonstanten sind übliche Werte, nicht an dich angepasst.",
        "<b>Last einer Einheit.</b> Dauer in Stunden × (Intensität)² × 100: eine Stunde genau an der Schwelle ergibt 100. Garmin rechnet mit der eingestellten FTP. Die Seite rechnet zusätzlich mit deiner LT2 aus dem Laktattest (last-2.0), weil du nach Laktat trainierst; welche der beiden sie verwendet, ist in deinen Daten festgelegt (Standard: Garmin), den Vergleich zeigt «Fortschritt».",
        "<b>Innen und aussen.</b> Watt und Tempo beschreiben, was du leistest (äussere Last); Puls und Anstrengung, wie dein Körper darauf reagiert (innere Last). Beide zusammen zeigen, ob dieselbe Arbeit leichter oder schwerer fällt [[impellizzeri2019]].",
        "<b>Empfundene Anstrengung.</b> Anstrengung von 0 bis 10 (CR-10) mal Minuten ergibt die Einheitenlast sRPE – einfach und auch ohne Messgerät brauchbar, etwa beim Schwimmen oder im Kraftraum [[foster2001]].",
      ],
      seite: [["FK", "pmc"], ["V59L", "last"], ["AN", "rpe"]], quellen: ["banister1975", "morton1990", "impellizzeri2019", "foster2001"] },

    { id: "erholung", titel: "Erholung, HRV und die Ampel", kurz: "Die Ampel vergleicht deine Morgenwerte mit deinem eigenen Normalbereich: HRV, Ruhepuls, Schlaf, Trainingslast und dein Befinden. Sie ist eine Entscheidungshilfe, keine Diagnose.",
      text: [
        "<b>HRV richtig lesen.</b> Einzelwerte schwanken stark. Aussagekräftig ist das gleitende Mittel über eine Woche im Vergleich mit dem eigenen Normalbereich [[plews2013]]. Für ein verlässliches Wochenmittel braucht es mindestens drei Messungen pro Woche [[plews2014]]. Ruhepuls, HRV und Puls bei Belastung zeigen den Trainingszustand nur im Zusammenhang richtig [[buchheit2014]].",
        "<b>Training nach HRV.</b> Radfahrer, die harte Einheiten nach ihrer HRV ansetzten, schnitten mindestens so gut ab wie mit festem Plan [[javaloyes2019]].",
        "<b>Dein Befinden zählt.</b> Eigene Angaben reagierten in Studien empfindlicher und verlässlicher auf Belastung als viele objektive Messwerte [[saw2016]]. Der Check-in fragt Schlaf, Energie, Beine und Kopf auf einer Skala von 1 bis 7 (höher = schlechter) – nach dem Vorbild eines bewährten Fragebogens [[hooper1995]].",
        "<b>Schlaf.</b> Schlaf ist zentral für Erholung, Gesundheit und Leistung und gehört ins Monitoring [[walsh2021]].",
        "<b>Überlastung.</b> Von kurzer, gewollter Überlastung bis zum Übertraining ist es ein Kontinuum; die Diagnose ist schwierig, vorbeugen heisst Warnzeichen ernst nehmen [[meeusen2013]]. Die Seite spricht darum nie von «Übertraining».",
        "<b>So rechnet die Ampel (readiness-2.0).</b> HRV-Mittel der letzten 7 Tage gegen deine 60 Tage davor, Ruhepuls der letzten 3 Tage, Schlaf (unter 5 Stunden starkes Zeichen, 5–6 Stunden Hinweis), Last 7 gegen 28 Tage, Befinden und Krankheit. Ob die Ampel zu dir passt, prüft die Seite an deinen eigenen Einheiten («Passt die Ampel zu dir?»).",
      ],
      seite: [["FK", "readiness"], ["FK", "ampel_pruefung"], ["V59L", "befinden"]], quellen: ["plews2013", "plews2014", "buchheit2014", "javaloyes2019", "saw2016", "hooper1995", "walsh2021", "meeusen2013"] },

    { id: "schwimmen", titel: "Schwimmen: CSS", kurz: "Die kritische Schwimmgeschwindigkeit (CSS) aus 400 m und 200 m ist dein Massstab im Wasser: CSS = (Zeit 400 m − Zeit 200 m) ÷ 2 pro 100 m. Sie liegt etwas über dem Tempo, das sich sehr lange halten lässt.",
      text: [
        "<b>Woher die Formel kommt.</b> Trägt man die Zeiten mehrerer Maximalstrecken gegen die Distanz auf, liegen sie fast auf einer Geraden; ihre Steigung ist die kritische Geschwindigkeit [[wakayoshi1992]]. Mit zwei Strecken (400 m und 200 m) ergibt das die einfache Formel oben.",
        "<b>Wo CSS liegt.</b> Etwas über dem Tempo des maximalen Laktat-Gleichgewichts [[dekerle2005]]: zügig, aber nicht beliebig lange haltbar. Darum taugt CSS für Wiederholungen mit kurzen Pausen, nicht als Dauertempo über 3,8 km.",
        "<b>Im Vorschlag.</b> CSS-Wiederholungen (100 m im CSS-Tempo, 15 s Pause) am Donnerstag, der Kurs am Dienstag für die Technik, eine lockere Einheit am Sonntag bei mehr Stunden. Lockeres Tempo etwa CSS + 8–12 s pro 100 m – eine Annahme, keine Studienvorgabe. Ohne CSS-Test gibt die Seite kein Tempo vor.",
        "<b>Tests.</b> Ein CSS-Test alle 6–8 Wochen am gleichen Wochentag, nicht an Kursabenden; immer gleiches Becken und gleiches Einschwimmen, sonst sind die Werte nicht vergleichbar.",
      ],
      seite: [["V59L", "css"], ["V62", "testplan"]], quellen: ["wakayoshi1992", "dekerle2005"] },

    { id: "verpflegung", titel: "Verpflegung im Training und Rennen", kurz: "Je länger die Belastung, desto mehr Kohlenhydrate pro Stunde – bis etwa 90 g mit Glukose und Fruktose. Der Darm lässt sich daran gewöhnen: Rennverpflegung im Training üben.",
      text: [
        "<b>Wie viel?</b> Als Richtwerte nach Dauer: bei 1–2 Stunden bis etwa 30 g Kohlenhydrate pro Stunde, bei 2–3 Stunden bis 60 g, bei längeren Belastungen bis 90 g, dann aus mehreren Zuckerarten (Glukose und Fruktose) [[jeukendrup2014]].",
        "<b>Den Darm trainieren.</b> Wer regelmässig während der Belastung isst und trinkt, verträgt mehr und hat weniger Magen-Darm-Probleme. Die langen Einheiten sind dafür da [[jeukendrup2017]].",
        "<b>Was die Seite rechnet.</b> Aufgenommen zählt nur, was du protokollierst. Der Verbrauch beim Radfahren kommt aus der Leistung mit einem angenommenen Wirkungsgrad von 22–25 %; der Kohlenhydrat-Anteil je Zone ist ein Modell, nicht gemessen.",
      ],
      seite: [["AN", "energie"], ["FK", "fueling"]], quellen: ["jeukendrup2014", "jeukendrup2017"] },

    { id: "regeln", titel: "Rechenregeln dieser Seite", kurz: "Jede Regel hat eine Version. Ändert sich eine Regel, steigt die Version, ein Test kommt dazu und die Änderung steht im Änderungsprotokoll. So bleibt nachvollziehbar, womit eine Zahl gerechnet wurde.",
      text: [
        "Die Liste unten zeigt die aktuellen Versionen der Regeln, die das Training betreffen, und wo sie erklärt sind. Werte der Werkzeuge (z. B. Schwellen aus dem Stufentest) stehen mit ihrer Version in deinen Daten.",
      ],
      regeln: true, seite: [], quellen: [] },
  ];

  /** Regeln, die das Training betreffen: [Modul, Schlüssel, Beschreibung, Kapitel]. Die Version liest die Seite aus dem Modul. */
  WS.REGELN = [
    ["AN", "saison", "Phasen und Wochenstunden", "periodisierung"],
    ["V64", "modell", "Trainingsmodelle", "modelle"],
    ["V64", "woche", "Wochenvorschlag", "modelle"],
    ["V64", "aufteilung", "Stunden je Sportart", "aufbau"],
    ["V64", "tid", "Intensitätsverteilung und Abgleich", "tid"],
    ["V62", "testplan", "Tests im Plan", "laktat-messen"],
    ["V62", "zonenvorschlag", "Zonen aus LT1 und LT2", "zonen"],
    ["FK", "zonen", "Zonenverteilung des Absolvierten", "tid"],
    ["FK", "laktat_drift", "Laktat-Einzelmessungen über die Zeit", "laktat-messen"],
    ["FK", "pmc", "Fitness, Ermüdung, Form", "last"],
    ["V59L", "last", "Trainingslast mit LT2", "last"],
    ["AN", "rpe", "Empfundene Anstrengung", "last"],
    ["FK", "readiness", "Ampel", "erholung"],
    ["FK", "ampel_pruefung", "Prüfung der Ampel an deinen Daten", "erholung"],
    ["V59L", "befinden", "Check-in", "erholung"],
    ["AN", "ermuedung", "Ermüdungsresistenz", "langdistanz"],
    ["FK", "langfahrt", "Sollband lange Ausfahrt", "langdistanz"],
    ["FK", "entwicklung", "Meine Entwicklung", "langdistanz"],
    ["V59L", "css", "CSS-Test", "schwimmen"],
    ["AN", "energie", "Energie und Verpflegung", "verpflegung"],
  ];

  /** Verweise im Text: [[id]] → Quelle, [[#kapitel]] → Kapitel. Liefert alle Quellen-IDs bzw. Kapitel-IDs eines Textes. */
  WS.verweise = function (text) {
    const q = [], k = [], re = /\[\[(#?)([a-z0-9-]+)\]\]/g;
    let m;
    while ((m = re.exec(String(text || "")))) (m[1] ? k : q).push(m[2]);
    return { quellen: q, kapitel: k };
  };
  WS.kapitel = (id) => WS.KAPITEL.find((k) => k.id === id) || null;
  return WS;
});
