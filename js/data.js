// ===== Regio's, steden, voertuigen en incidenttypes =====
// size: 1 = kleine stad, 2 = middelgroot, 3 = grootstad

const PROVINCES = [
  { id: 'wvl', name: 'West-Vlaanderen', centrale: '112 Brugge', cities: [
    { id: 'brugge', name: 'Brugge', lat: 51.2093, lng: 3.2247, size: 3 },
    { id: 'oostende', name: 'Oostende', lat: 51.2154, lng: 2.9286, size: 2 },
    { id: 'kortrijk', name: 'Kortrijk', lat: 50.8280, lng: 3.2649, size: 3 },
    { id: 'roeselare', name: 'Roeselare', lat: 50.9465, lng: 3.1227, size: 2 },
    { id: 'ieper', name: 'Ieper', lat: 50.8503, lng: 2.8853, size: 1 },
    { id: 'waregem', name: 'Waregem', lat: 50.8890, lng: 3.4270, size: 1 },
    { id: 'knokke', name: 'Knokke-Heist', lat: 51.3460, lng: 3.2870, size: 1 },
    { id: 'blankenberge', name: 'Blankenberge', lat: 51.3130, lng: 3.1320, size: 1 },
    { id: 'tielt', name: 'Tielt', lat: 50.9990, lng: 3.3270, size: 1 },
    { id: 'torhout', name: 'Torhout', lat: 51.0650, lng: 3.1010, size: 1 },
    { id: 'izegem', name: 'Izegem', lat: 50.9140, lng: 3.2140, size: 1 },
    { id: 'menen', name: 'Menen', lat: 50.7960, lng: 3.1210, size: 1 },
    { id: 'wevelgem', name: 'Wevelgem', lat: 50.8100, lng: 3.1830, size: 1 },
    { id: 'poperinge', name: 'Poperinge', lat: 50.8550, lng: 2.7260, size: 1 },
    { id: 'diksmuide', name: 'Diksmuide', lat: 51.0330, lng: 2.8640, size: 1 },
    { id: 'veurne', name: 'Veurne', lat: 51.0720, lng: 2.6620, size: 1 },
  ]},
  { id: 'ovl', name: 'Oost-Vlaanderen', centrale: '112 Gent', cities: [
    { id: 'gent', name: 'Gent', lat: 51.0543, lng: 3.7174, size: 3 },
    { id: 'aalst', name: 'Aalst', lat: 50.9378, lng: 4.0403, size: 2 },
    { id: 'sintniklaas', name: 'Sint-Niklaas', lat: 51.1650, lng: 4.1430, size: 2 },
    { id: 'dendermonde', name: 'Dendermonde', lat: 51.0280, lng: 4.1010, size: 1 },
    { id: 'oudenaarde', name: 'Oudenaarde', lat: 50.8450, lng: 3.6040, size: 1 },
    { id: 'eeklo', name: 'Eeklo', lat: 51.1860, lng: 3.5600, size: 1 },
    { id: 'lokeren', name: 'Lokeren', lat: 51.1040, lng: 3.9910, size: 1 },
    { id: 'ninove', name: 'Ninove', lat: 50.8280, lng: 4.0240, size: 1 },
    { id: 'zottegem', name: 'Zottegem', lat: 50.8690, lng: 3.8100, size: 1 },
    { id: 'ronse', name: 'Ronse', lat: 50.7460, lng: 3.6000, size: 1 },
  ]},
  { id: 'ant', name: 'Antwerpen', centrale: '112 Antwerpen', cities: [
    { id: 'antwerpen', name: 'Antwerpen', lat: 51.2194, lng: 4.4025, size: 3 },
    { id: 'mechelen', name: 'Mechelen', lat: 51.0259, lng: 4.4776, size: 2 },
    { id: 'turnhout', name: 'Turnhout', lat: 51.3227, lng: 4.9447, size: 2 },
    { id: 'mol', name: 'Mol', lat: 51.1910, lng: 5.1160, size: 1 },
    { id: 'geel', name: 'Geel', lat: 51.1620, lng: 4.9900, size: 1 },
    { id: 'lier', name: 'Lier', lat: 51.1310, lng: 4.5700, size: 1 },
    { id: 'herentals', name: 'Herentals', lat: 51.1770, lng: 4.8360, size: 1 },
    { id: 'boom', name: 'Boom', lat: 51.0880, lng: 4.3660, size: 1 },
  ]},
  { id: 'vbr', name: 'Vlaams-Brabant', centrale: '112 Leuven', cities: [
    { id: 'leuven', name: 'Leuven', lat: 50.8798, lng: 4.7005, size: 3 },
    { id: 'vilvoorde', name: 'Vilvoorde', lat: 50.9280, lng: 4.4290, size: 2 },
    { id: 'halle', name: 'Halle', lat: 50.7340, lng: 4.2340, size: 1 },
    { id: 'tienen', name: 'Tienen', lat: 50.8070, lng: 4.9380, size: 1 },
    { id: 'aarschot', name: 'Aarschot', lat: 50.9850, lng: 4.8370, size: 1 },
    { id: 'diest', name: 'Diest', lat: 50.9890, lng: 5.0510, size: 1 },
    { id: 'zaventem', name: 'Zaventem', lat: 50.8840, lng: 4.4720, size: 1 },
  ]},
  { id: 'lim', name: 'Limburg', centrale: '112 Hasselt', cities: [
    { id: 'hasselt', name: 'Hasselt', lat: 50.9307, lng: 5.3325, size: 3 },
    { id: 'genk', name: 'Genk', lat: 50.9650, lng: 5.5000, size: 2 },
    { id: 'sinttruiden', name: 'Sint-Truiden', lat: 50.8160, lng: 5.1860, size: 1 },
    { id: 'tongeren', name: 'Tongeren', lat: 50.7810, lng: 5.4640, size: 1 },
    { id: 'lommel', name: 'Lommel', lat: 51.2300, lng: 5.3130, size: 1 },
    { id: 'maasmechelen', name: 'Maasmechelen', lat: 50.9650, lng: 5.6940, size: 1 },
    { id: 'beringen', name: 'Beringen', lat: 51.0490, lng: 5.2260, size: 1 },
  ]},
  { id: 'bru', name: 'Brussel-Hoofdstad', centrale: '112 Brussel', cities: [
    { id: 'brussel', name: 'Brussel-Stad', lat: 50.8466, lng: 4.3528, size: 3 },
    { id: 'schaarbeek', name: 'Schaarbeek', lat: 50.8676, lng: 4.3737, size: 2 },
    { id: 'anderlecht', name: 'Anderlecht', lat: 50.8333, lng: 4.3072, size: 2 },
    { id: 'ukkel', name: 'Ukkel', lat: 50.8030, lng: 4.3330, size: 2 },
    { id: 'elsene', name: 'Elsene', lat: 50.8270, lng: 4.3720, size: 2 },
  ]},
  { id: 'hen', name: 'Henegouwen', centrale: '112 Bergen', cities: [
    { id: 'charleroi', name: 'Charleroi', lat: 50.4108, lng: 4.4446, size: 3 },
    { id: 'bergen', name: 'Bergen (Mons)', lat: 50.4542, lng: 3.9567, size: 2 },
    { id: 'doornik', name: 'Doornik (Tournai)', lat: 50.6056, lng: 3.3880, size: 2 },
    { id: 'lalouviere', name: 'La Louvière', lat: 50.4800, lng: 4.1870, size: 2 },
    { id: 'moeskroen', name: 'Moeskroen', lat: 50.7440, lng: 3.2140, size: 1 },
  ]},
  { id: 'lui', name: 'Luik', centrale: '112 Luik', cities: [
    { id: 'luik', name: 'Luik (Liège)', lat: 50.6326, lng: 5.5797, size: 3 },
    { id: 'verviers', name: 'Verviers', lat: 50.5890, lng: 5.8620, size: 2 },
    { id: 'seraing', name: 'Seraing', lat: 50.5830, lng: 5.5000, size: 2 },
    { id: 'hoei', name: 'Hoei (Huy)', lat: 50.5190, lng: 5.2400, size: 1 },
    { id: 'eupen', name: 'Eupen', lat: 50.6280, lng: 6.0360, size: 1 },
  ]},
  { id: 'nam', name: 'Namen', centrale: '112 Namen', cities: [
    { id: 'namen', name: 'Namen (Namur)', lat: 50.4674, lng: 4.8720, size: 2 },
    { id: 'dinant', name: 'Dinant', lat: 50.2610, lng: 4.9120, size: 1 },
    { id: 'gembloux', name: 'Gembloux', lat: 50.5610, lng: 4.6970, size: 1 },
  ]},
  { id: 'wbr', name: 'Waals-Brabant', centrale: '112 Waver', cities: [
    { id: 'waver', name: 'Waver (Wavre)', lat: 50.7170, lng: 4.6010, size: 1 },
    { id: 'nijvel', name: 'Nijvel (Nivelles)', lat: 50.5980, lng: 4.3290, size: 1 },
    { id: 'ottignies', name: 'Ottignies-LLN', lat: 50.6680, lng: 4.6140, size: 1 },
  ]},
  { id: 'lux', name: 'Luxemburg', centrale: '112 Aarlen', cities: [
    { id: 'aarlen', name: 'Aarlen (Arlon)', lat: 49.6833, lng: 5.8167, size: 1 },
    { id: 'bastenaken', name: 'Bastenaken', lat: 50.0030, lng: 5.7190, size: 1 },
    { id: 'marche', name: 'Marche-en-Famenne', lat: 50.2270, lng: 5.3440, size: 1 },
  ]},
];

// Voertuigtypes
const VEHICLE_TYPES = {
  AMB: { name: 'Ziekenwagen', short: 'ZW', service: 'med', color: '#f2c200', speed: 1.0, price: 2500 },
  PIT: { name: 'Paramedisch Interventieteam', short: 'PIT', service: 'med', color: '#84cc16', speed: 1.1, price: 3500 },
  MUG: { name: 'MUG', short: 'MUG', service: 'med', color: '#ff8c00', speed: 1.15, price: 5000 },
  AP:  { name: 'Autopomp', short: 'AP', service: 'fire', color: '#d62828', speed: 0.9, price: 4000 },
  AL:  { name: 'Autoladder', short: 'AL', service: 'fire', color: '#a4161a', speed: 0.8, price: 7000 },
  TW:  { name: 'Tankwagen', short: 'TW', service: 'fire', color: '#e85d04', speed: 0.8, price: 4500 },
  HV:  { name: 'Hulpverleningswagen', short: 'HV', service: 'fire', color: '#9d0208', speed: 0.9, price: 6000 },
  POL: { name: 'Interventiewagen', short: 'POL', service: 'pol', color: '#1d4ed8', speed: 1.1, price: 2000 },
  HELI: { name: 'MUG-helikopter', short: 'HELI', service: 'med', color: '#f43f5e', speed: 1, price: 30000, air: true },
};
// steden met een helikopterbasis bij het ziekenhuis
const HELI_BASES = ['brugge', 'antwerpen', 'brussel', 'luik', 'bastenaken', 'hasselt'];
// Een hoger gekwalificeerde eenheid mag een lagere vervangen
const SUBSTITUTE = { PIT: ['MUG', 'HELI'], MUG: ['HELI'] };

// Posttypes
const STATION_TYPES = {
  fire: { name: 'Brandweerpost', icon: '🚒', color: '#d62828', allowed: ['AP', 'AL', 'TW', 'HV'], price: 25000 },
  med:  { name: 'Ambulancepost', icon: '🚑', color: '#f2c200', allowed: ['AMB', 'PIT'], price: 15000 },
  hosp: { name: 'Ziekenhuis', icon: '🏥', color: '#16a34a', allowed: ['MUG', 'HELI'], price: 40000 },
  pol:  { name: 'Politiekantoor', icon: '🚓', color: '#1d4ed8', allowed: ['POL'], price: 15000 },
};

// Standaardbezetting per stadgrootte
const DEFAULT_FLEET = {
  1: { fire: ['AP', 'TW'], med: ['AMB'], hosp: ['MUG'], pol: ['POL', 'POL'] },
  2: { fire: ['AP', 'AP', 'AL', 'TW', 'HV'], med: ['AMB', 'AMB', 'PIT'], hosp: ['MUG'], pol: ['POL', 'POL', 'POL'] },
  3: { fire: ['AP', 'AP', 'AP', 'AL', 'TW', 'HV'], med: ['AMB', 'AMB', 'AMB', 'PIT'], hosp: ['MUG', 'MUG'], pol: ['POL', 'POL', 'POL', 'POL'] },
};

// Verschuiving van posten t.o.v. stadscentrum (in km: [noord, oost])
const STATION_OFFSETS = { fire: [0.6, -0.8], med: [-0.7, 0.5], hosp: [-0.3, -1.1], pol: [0.25, 0.35] };

// Dringendheid en aanrijnorm (in echte minuten)
const PRIORITIES = {
  1: { name: 'Prio 1', desc: 'levensbedreigend', norm: 15, color: '#ef4444' },
  2: { name: 'Prio 2', desc: 'dringend', norm: 20, color: '#f59e0b' },
  3: { name: 'Prio 3', desc: 'niet dringend', norm: 30, color: '#22c55e' },
};

// Vragen die je aan de beller kunt stellen
const QUESTIONS = [
  { id: 'adres', q: 'Wat is het exacte adres?' },
  { id: 'wat', q: 'Wat is er precies gebeurd?' },
  { id: 'bewust', q: 'Is de persoon bij bewustzijn?' },
  { id: 'adem', q: 'Ademt de persoon normaal?' },
  { id: 'personen', q: 'Hoeveel personen zijn betrokken?' },
  { id: 'gevaar', q: 'Is er brand, rook of ander gevaar?' },
];
const ANSWERS = {
  bewust: { ja: 'Ja, hij/zij is wakker en praat.', nee: 'Nee! Hij/zij reageert niet!', half: 'Half… hij/zij is suf en verward.', nvt: 'Er is niemand gewond voor zover ik zie.' },
  adem: { ja: 'Ja, dat lijkt normaal.', nee: 'Nee, ik zie geen ademhaling!', moeilijk: 'Heel moeilijk, hij/zij hapt naar adem.', nvt: 'Ik denk niet dat dat van toepassing is.' },
  gevaar: { ja: 'Ja! Er is veel rook en vuur!', nee: 'Nee, geen brand of gevaar.', gas: 'Het ruikt heel sterk naar gas.', water: 'Het water stijgt nog steeds.', dader: 'De daders zijn hier nog in de buurt!' },
};

// Incidenttypes (protocollen)
// need: vereiste voertuigen, dur: verwerkingstijd ter plaatse (s), transport: patiënt naar ziekenhuis
// facts: antwoorden op de vragen
const INCIDENT_TYPES = [
  // --- medisch ---
  { id: 'onwel', cat: 'med', name: 'Onwel / ziek persoon', icon: '🩺', prio: 2, need: { AMB: 1 }, dur: 40, reward: 300, weight: 14, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn vader voelt zich niet goed, hij is heel bleek en zweet.', 'Mijn moeder is heel zwak en heeft al de hele dag koorts.', 'Er zit een man op de bank, hij voelt zich ziek.'] },
  { id: 'hart', cat: 'med', name: 'Hartstilstand / reanimatie', icon: '❤️', prio: 1, need: { AMB: 1, MUG: 1 }, dur: 60, reward: 800, weight: 4, transport: true,
    facts: { bewust: 'nee', adem: 'nee', personen: 'Eén man, ongeveer 60 jaar.', gevaar: 'nee' },
    calls: ['Mijn man is zomaar in elkaar gezakt, hij reageert niet meer!', 'Er is iemand neergevallen in de supermarkt, hij beweegt niet!'] },
  { id: 'borst', cat: 'med', name: 'Pijn op de borst', icon: '💔', prio: 1, need: { AMB: 1, PIT: 1 }, dur: 50, reward: 600, weight: 6, transport: true,
    facts: { bewust: 'ja', adem: 'moeilijk', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Ik heb een drukkende pijn op mijn borst die uitstraalt naar mijn arm.', 'Mijn vrouw heeft hevige pijn op de borst en zweet heel erg.'] },
  { id: 'adem', cat: 'med', name: 'Ademhalingsproblemen', icon: '🫁', prio: 1, need: { AMB: 1, PIT: 1 }, dur: 50, reward: 550, weight: 5, transport: true,
    facts: { bewust: 'ja', adem: 'moeilijk', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn zoon krijgt bijna geen lucht meer, hij heeft astma.', 'Mijn oma is heel kortademig, ze kan geen zin meer afmaken.'] },
  { id: 'beroerte', cat: 'med', name: 'Beroerte (CVA)', icon: '🧠', prio: 1, need: { AMB: 1, PIT: 1 }, dur: 50, reward: 650, weight: 4, transport: true,
    facts: { bewust: 'half', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn man praat ineens heel raar en zijn mond hangt scheef.', 'Mijn moeder kan haar arm niet meer bewegen en spreekt onduidelijk.'] },
  { id: 'allergie', cat: 'med', name: 'Ernstige allergische reactie', icon: '🐝', prio: 1, need: { AMB: 1, MUG: 1 }, dur: 45, reward: 650, weight: 2, transport: true, minLevel: 2,
    facts: { bewust: 'ja', adem: 'moeilijk', personen: 'Eén kind.', gevaar: 'nee' },
    calls: ['Mijn dochter is door een wesp gestoken en haar gezicht zwelt helemaal op!', 'Hij heeft noten gegeten en krijgt geen lucht meer!'] },
  { id: 'overdosis', cat: 'med', name: 'Intoxicatie / overdosis', icon: '💊', prio: 1, need: { AMB: 1, MUG: 1, POL: 1 }, dur: 55, reward: 750, weight: 2, transport: true, minLevel: 3,
    facts: { bewust: 'half', adem: 'moeilijk', personen: 'Eén jongere.', gevaar: 'nee' },
    calls: ['Mijn vriend heeft iets genomen op het feest en hij is bijna niet meer wakker te krijgen.', 'Ik vind mijn huisgenoot met een lege doos pillen naast zich.'] },
  { id: 'bevalling', cat: 'med', name: 'Bevalling', icon: '👶', prio: 2, need: { AMB: 1 }, dur: 45, reward: 450, weight: 2, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Mijn vrouw, 39 weken zwanger.', gevaar: 'nee' },
    calls: ['Mijn vrouw is aan het bevallen, de weeën komen heel snel!', 'Haar water is gebroken en we geraken niet meer op tijd in het ziekenhuis.'] },
  { id: 'val', cat: 'med', name: 'Val / heupletsel', icon: '🦴', prio: 3, need: { AMB: 1 }, dur: 40, reward: 250, weight: 8, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Een oudere dame.', gevaar: 'nee' },
    calls: ['Mijn buurvrouw is gevallen en kan niet meer recht, ze heeft pijn aan haar heup.', 'Mijn opa is van de trap gevallen, hij heeft pijn aan zijn been.'] },
  { id: 'diabetes', cat: 'med', name: 'Diabetisch probleem', icon: '🍬', prio: 2, need: { AMB: 1 }, dur: 40, reward: 300, weight: 4, transport: true,
    facts: { bewust: 'half', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn man is suikerziek en hij is heel raar en zweterig.', 'Mijn dochter heeft diabetes en reageert heel traag.'] },
  { id: 'verward', cat: 'med', name: 'Verward / agressief persoon', icon: '😵', prio: 2, need: { AMB: 1, POL: 1 }, dur: 50, reward: 450, weight: 3, transport: true, minLevel: 1,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén man.', gevaar: 'dader' },
    calls: ['Er loopt een man te roepen op straat, hij is heel verward en dreigend.', 'Mijn broer is helemaal in de war en wordt agressief.'] },
  { id: 'valhoogte', cat: 'med', name: 'Val van hoogte', icon: '🪜', prio: 1, need: { AMB: 1, MUG: 1, AL: 1 }, dur: 70, reward: 1000, weight: 2, transport: true, minLevel: 3,
    facts: { bewust: 'half', adem: 'ja', personen: 'Eén werkman.', gevaar: 'nee' },
    calls: ['Een werkman is van de stelling gevallen, hij ligt op een plat dak.', 'Iemand is van een hoge ladder gevallen en kan niet bewegen.'] },
  { id: 'epilepsie', cat: 'med', name: 'Epileptische aanval / stuipen', icon: '⚡', prio: 2, need: { AMB: 1 }, dur: 45, reward: 400, weight: 4, transport: true,
    facts: { bewust: 'half', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn zoon ligt op de grond te schokken, hij reageert niet.', 'Een vrouw heeft een aanval op de bus, ze trilt over haar hele lichaam.'] },
  { id: 'brandwonde', cat: 'med', name: 'Brandwonden', icon: '♨️', prio: 2, need: { AMB: 1 }, dur: 45, reward: 400, weight: 3, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn dochter heeft kokend water over haar arm gekregen.', 'Mijn man heeft zich verbrand aan de barbecue, zijn hand is helemaal rood en vol blaren.'] },
  { id: 'elektrocutie', cat: 'med', name: 'Elektrocutie', icon: '🔌', prio: 1, need: { AMB: 1, MUG: 1 }, dur: 55, reward: 750, weight: 1, transport: true, minLevel: 2,
    facts: { bewust: 'half', adem: 'moeilijk', personen: 'Een elektricien.', gevaar: 'ja' },
    calls: ['Een collega heeft een stroomstoot gekregen in de elektriciteitskast!', 'Mijn buurman raakte een kabel aan en is neergevallen.'] },
  { id: 'co', cat: 'med', name: 'Koolmonoxidevergiftiging', icon: '☁️', prio: 1, need: { AMB: 1, AP: 1 }, dur: 60, reward: 800, weight: 1, transport: true, minLevel: 2,
    facts: { bewust: 'half', adem: 'ja', personen: 'Het hele gezin voelt zich slecht.', gevaar: 'gas' },
    calls: ['We hebben allemaal hoofdpijn en zijn misselijk, de kachel brandt al de hele dag.', 'Mijn ouders zijn suf en verward, in de badkamer hangt een geiser.'] },
  { id: 'alcohol', cat: 'med', name: 'Alcoholintoxicatie', icon: '🍺', prio: 3, need: { AMB: 1 }, dur: 35, reward: 250, weight: 4, transport: true,
    facts: { bewust: 'half', adem: 'ja', personen: 'Een jongeman.', gevaar: 'nee' },
    calls: ['Er ligt een jongen op straat, hij heeft veel te veel gedronken en reageert amper.', 'Mijn vriendin heeft te veel gedronken op het feest en blijft overgeven.'] },
  { id: 'hoofdpijn', cat: 'med', name: 'Plotse hevige hoofdpijn', icon: '🤕', prio: 2, need: { AMB: 1 }, dur: 40, reward: 350, weight: 3, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn vrouw kreeg ineens de ergste hoofdpijn van haar leven en moet overgeven.', 'Ik heb plots een enorme hoofdpijn en ik zie wazig.'] },
  { id: 'buikpijn', cat: 'med', name: 'Buikpijn', icon: '🫃', prio: 3, need: { AMB: 1 }, dur: 35, reward: 250, weight: 4, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Ik heb al uren hevige pijn rechts onderaan mijn buik.', 'Mijn zoon ligt dubbel van de buikpijn en heeft koorts.'] },
  { id: 'rugpijn', cat: 'med', name: 'Rugpijn', icon: '🧍', prio: 3, need: { AMB: 1 }, dur: 35, reward: 200, weight: 3, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn man kan door zijn rug niet meer bewegen, hij ligt op de grond.', 'Ik heb zo veel pijn in mijn rug dat ik niet meer recht geraak.'] },
  { id: 'bloeding', cat: 'med', name: 'Bloeding (geen ongeval)', icon: '🩸', prio: 2, need: { AMB: 1 }, dur: 40, reward: 350, weight: 3, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn vader heeft een neusbloeding die al een uur niet stopt, hij neemt bloedverdunners.', 'Mijn moeder geeft bloed op, ik schrik me dood.'] },
  { id: 'bewusteloos', cat: 'med', name: 'Bewusteloos / flauwte', icon: '😶', prio: 1, need: { AMB: 1, PIT: 1 }, dur: 45, reward: 500, weight: 4, transport: true,
    facts: { bewust: 'nee', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Er ligt een man op de stoep, hij ademt wel maar reageert op niets.', 'Mijn collega is zomaar flauwgevallen aan haar bureau.'] },
  { id: 'wapen', cat: 'med', name: 'Steek- of schotwonde', icon: '🔪', prio: 1, need: { AMB: 1, MUG: 1, POL: 2 }, dur: 70, reward: 1200, weight: 1, transport: true, minLevel: 3,
    facts: { bewust: 'half', adem: 'moeilijk', personen: 'Eén slachtoffer.', gevaar: 'dader' },
    calls: ['Er is iemand neergestoken voor het café, hij bloedt heel erg!', 'Ik hoorde schoten en nu ligt er iemand gewond op straat!'] },
  { id: 'psych', cat: 'med', name: 'Psychische crisis', icon: '🧠', prio: 2, need: { AMB: 1, POL: 1 }, dur: 55, reward: 450, weight: 2, transport: true, minLevel: 1,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Eén persoon.', gevaar: 'nee' },
    calls: ['Mijn broer zegt dat hij er een einde aan wil maken, ik maak me grote zorgen.', 'Mijn dochter is in paniek en hyperventileert, ze is helemaal over haar toeren.'] },
  { id: 'water-persoon', cat: 'med', name: 'Persoon te water', icon: '🌊', prio: 1, need: { AMB: 1, MUG: 1, HV: 1 }, dur: 75, reward: 1300, weight: 1, transport: true, minLevel: 3,
    facts: { bewust: 'nee', adem: 'nee', personen: 'Eén persoon.', gevaar: 'water' },
    calls: ['Er is iemand in het kanaal gesprongen en hij komt niet meer boven!', 'Een kind is in de vijver gevallen!'] },
  { id: 'temperatuur', cat: 'med', name: 'Oververhitting of onderkoeling', icon: '🌡️', prio: 2, need: { AMB: 1 }, dur: 40, reward: 350, weight: 2, transport: true,
    facts: { bewust: 'half', adem: 'ja', personen: 'Een oudere persoon.', gevaar: 'nee' },
    calls: ['Mijn oma is helemaal verward en gloeiend heet, het is hier zo warm in huis.', 'Er zit een man buiten in de kou, hij is ijskoud en praat raar.'] },
  // --- verkeer ---
  { id: 'vkl', cat: 'verkeer', name: 'Verkeersongeval (gewonde)', icon: '🚗', prio: 2, need: { POL: 1, AMB: 1 }, dur: 50, reward: 500, weight: 9, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Twee wagens, één gewonde.', gevaar: 'nee' },
    calls: ['Er is net een aanrijding gebeurd tussen een auto en een fietser.', 'Twee auto\'s zijn op elkaar gebotst op het kruispunt, iemand heeft pijn aan de nek.'] },
  { id: 'vkz', cat: 'verkeer', name: 'Ongeval met geknelde', icon: '💥', prio: 1, need: { POL: 1, AMB: 1, MUG: 1, AP: 1, HV: 1 }, dur: 90, reward: 1700, weight: 2, transport: true, minLevel: 3,
    facts: { bewust: 'half', adem: 'moeilijk', personen: 'De bestuurder zit vast.', gevaar: 'nee' },
    calls: ['Een auto is tegen een boom gereden, de bestuurder zit vast!', 'Zwaar ongeval op de ring, er zit iemand gekneld in de wagen!'] },
  // --- brand / technisch ---
  { id: 'woningbrand', cat: 'brand', name: 'Woningbrand', icon: '🔥', prio: 1, need: { AP: 2, AL: 1, AMB: 1 }, dur: 100, reward: 1500, weight: 3, minLevel: 2,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Ik weet niet of er nog iemand binnen is!', gevaar: 'ja' },
    calls: ['Het huis van mijn buren staat in brand, er komt veel rook uit het dak!', 'Er komen vlammen uit het raam op de eerste verdieping!'] },
  { id: 'keukenbrand', cat: 'brand', name: 'Keukenbrand', icon: '🍳', prio: 2, need: { AP: 1 }, dur: 45, reward: 450, weight: 5,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Iedereen is buiten.', gevaar: 'ja' },
    calls: ['De frituurpan heeft vuur gevat in de keuken!', 'Er is brand in mijn keuken, het gaat niet uit!'] },
  { id: 'container', cat: 'brand', name: 'Container- / buitenbrand', icon: '🗑️', prio: 3, need: { AP: 1 }, dur: 35, reward: 300, weight: 5,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Niemand.', gevaar: 'ja' },
    calls: ['Er staat een container in brand naast de school.', 'Een vuilnisbak brandt hevig aan het station.'] },
  { id: 'natuur', cat: 'brand', name: 'Berm- / natuurbrand', icon: '🌾', prio: 2, need: { AP: 1, TW: 1 }, dur: 60, reward: 650, weight: 3, minLevel: 1,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Niemand.', gevaar: 'ja' },
    calls: ['Er brandt een groot stuk gras langs de weg, het breidt snel uit.', 'Er is een brand bezig aan de rand van het bos!'] },
  { id: 'gaslek', cat: 'brand', name: 'Gaslek', icon: '💨', prio: 1, need: { AP: 1, HV: 1, POL: 1 }, dur: 70, reward: 900, weight: 2, minLevel: 2,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'De bewoners zijn buiten.', gevaar: 'gas' },
    calls: ['Het ruikt hier heel sterk naar gas in de straat.', 'Bij werken is een gasleiding geraakt!'] },
  { id: 'industrie', cat: 'brand', name: 'Industriebrand', icon: '🏭', prio: 1, need: { AP: 3, AL: 1, TW: 1, AMB: 1, POL: 1 }, dur: 140, reward: 3200, weight: 1, minLevel: 5,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Er waren nog arbeiders binnen.', gevaar: 'ja' },
    calls: ['Er is een grote brand in de loods op het industrieterrein!', 'Zware rookontwikkeling bij het bedrijf, er zijn ontploffingen!'] },
  { id: 'water', cat: 'brand', name: 'Wateroverlast / stormschade', icon: '🌧️', prio: 3, need: { HV: 1 }, dur: 70, reward: 500, weight: 3,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Niemand gewond.', gevaar: 'water' },
    calls: ['Mijn kelder staat helemaal onder water na de storm.', 'Er ligt een boom over de weg na het onweer.'] },
  { id: 'dier', cat: 'brand', name: 'Dier in nood', icon: '🐈', prio: 3, need: { HV: 1 }, dur: 40, reward: 300, weight: 2,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Geen mensen.', gevaar: 'nee' },
    calls: ['Er zit een kat al twee dagen vast in een boom.', 'Een paard is in een gracht gevallen!'] },
  // --- politie ---
  { id: 'inbraak', cat: 'politie', name: 'Inbraak bezig', icon: '🦹', prio: 1, need: { POL: 2 }, dur: 45, reward: 400, weight: 5,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Twee daders.', gevaar: 'dader' },
    calls: ['Ik hoor iemand in mijn huis beneden, ik zit boven verstopt.', 'Er zijn twee mannen bezig bij de buren in te breken!'] },
  { id: 'vecht', cat: 'politie', name: 'Vechtpartij met gewonde', icon: '👊', prio: 1, need: { POL: 2, AMB: 1 }, dur: 50, reward: 650, weight: 4, transport: true,
    facts: { bewust: 'ja', adem: 'ja', personen: 'Een groep, één bloedt.', gevaar: 'dader' },
    calls: ['Er is een gevecht aan de gang aan het café, iemand bloedt!', 'Een groep jongeren slaat op iemand in op het plein.'] },
  { id: 'diefstal', cat: 'politie', name: 'Diefstal', icon: '🛒', prio: 3, need: { POL: 1 }, dur: 30, reward: 200, weight: 5,
    facts: { bewust: 'nvt', adem: 'nvt', personen: 'Eén dader.', gevaar: 'nee' },
    calls: ['We hebben een winkeldief betrapt, hij wil niet meewerken.', 'Iemand heeft net mijn handtas gestolen!'] },
];
const CATEGORIES = { med: '🩺 Medisch', verkeer: '🚗 Verkeer', brand: '🔥 Brand & technisch', politie: '🚓 Politie' };

const STREETS = ['Kerkstraat', 'Stationsstraat', 'Molenstraat', 'Dorpsstraat', 'Nieuwstraat', 'Schoolstraat', 'Kapelstraat', 'Markt', 'Grote Markt',
  'Steenweg', 'Hoogstraat', 'Bruggestraat', 'Gentsesteenweg', 'Kortrijksestraat', 'Lindenlaan', 'Beukenlaan', 'Veldstraat', 'Industrielaan',
  'Zandstraat', 'Bosstraat', 'Ringlaan', 'Koningin Astridlaan', 'Leopoldlaan', 'Vrijheidstraat', 'Meersstraat', 'Ieperstraat', 'Hogeweg'];

// Weer: speed = rijsnelheidsfactor, boost = extra kans op bepaalde incidenten, fly = helikopter mag vliegen
const WEATHER = [
  { id: 'helder', name: 'Helder', icon: '☀️', speed: 1, fly: true, boost: {}, w: 4 },
  { id: 'bewolkt', name: 'Bewolkt', icon: '☁️', speed: 1, fly: true, boost: {}, w: 4 },
  { id: 'lregen', name: 'Lichte regen', icon: '🌦️', speed: 0.93, fly: true, boost: { vkl: 1.3 }, w: 3 },
  { id: 'regen', name: 'Zware regen', icon: '🌧️', speed: 0.85, fly: true, boost: { vkl: 1.6, water: 3 }, w: 2 },
  { id: 'mist', name: 'Mist', icon: '🌫️', speed: 0.8, fly: false, boost: { vkl: 1.8, vkz: 1.5 }, w: 1.5 },
  { id: 'storm', name: 'Storm', icon: '🌪️', speed: 0.85, fly: false, boost: { water: 4, dier: 1.5 }, w: 1 },
  { id: 'ijzel', name: 'IJzel', icon: '🧊', speed: 0.7, fly: false, boost: { val: 2.5, vkl: 2, vkz: 1.5 }, w: 0.7 },
];

// Aangrenzende provincies (voor ondersteuning door een Belgische buurcentrale)
const PROV_ADJ = {
  wvl: ['ovl', 'hen'], ovl: ['wvl', 'ant', 'vbr', 'hen'], ant: ['ovl', 'vbr', 'lim'], vbr: ['ant', 'ovl', 'lim', 'bru', 'wbr', 'hen', 'lui', 'nam'],
  lim: ['ant', 'vbr', 'lui'], bru: ['vbr'], hen: ['wvl', 'ovl', 'vbr', 'wbr', 'nam'], lui: ['lim', 'vbr', 'nam', 'lux'],
  nam: ['hen', 'wbr', 'lui', 'lux', 'vbr'], wbr: ['vbr', 'bru', 'hen', 'nam'], lux: ['lui', 'nam'],
};
// Buitenlandse buurcentrales langs de grens
const FOREIGN_CENTRALES = [
  { id: 'nl-zeeland', name: 'Meldkamer Zeeland (NL)', lat: 51.497, lng: 3.611, provs: ['wvl', 'ovl', 'ant'] },
  { id: 'nl-brabant', name: 'Meldkamer Brabant (NL)', lat: 51.589, lng: 4.776, provs: ['ant', 'lim'] },
  { id: 'nl-limburg', name: 'Meldkamer Limburg (NL)', lat: 50.851, lng: 5.691, provs: ['lim', 'lui'] },
  { id: 'de-aachen', name: 'Leitstelle Aachen (DE)', lat: 50.776, lng: 6.084, provs: ['lui'] },
  { id: 'lu', name: 'Centrale 112 Luxemburg (LU)', lat: 49.611, lng: 6.130, provs: ['lux'] },
  { id: 'fr-nord', name: 'SAMU Nord (FR)', lat: 50.630, lng: 3.058, provs: ['wvl', 'hen'] },
  { id: 'fr-aisne', name: 'SAMU Aisne (FR)', lat: 49.564, lng: 3.620, provs: ['hen', 'nam'] },
  { id: 'fr-ardennes', name: 'SAMU Ardennes (FR)', lat: 49.762, lng: 4.726, provs: ['nam', 'lux'] },
];

// ===== Protocolcodes en oproepvarianten =====
// Eigen codering: M = medisch, V = verkeer, B = brand/technisch, P = politie
{
  const pre = { med: 'M', verkeer: 'V', brand: 'B', politie: 'P' }, cnt = {};
  for (const t of INCIDENT_TYPES) { cnt[t.cat] = (cnt[t.cat] || 0) + 1; t.code = pre[t.cat] + String(cnt[t.cat]).padStart(2, '0'); }
}
const protoLabel = t => `${t.code} ${t.name}`;

const SEVERITIES = [
  { id: 'licht', label: 'stabiel', delta: 1, add: 'Het lijkt niet levensbedreigend, maar ik maak me wel zorgen.' },
  { id: 'matig', label: 'dringend', delta: 0, add: '' },
  { id: 'ernstig', label: 'kritiek', delta: -1, add: 'Het gaat echt heel slecht, kom alstublieft snel!' },
];
const PATIENTS = [
  { id: 'baby', txt: 'Het gaat om een baby van een paar maanden.' },
  { id: 'kind', txt: 'Het gaat om een kind van ongeveer acht jaar.' },
  { id: 'tiener', txt: 'Het gaat om een jongere van een jaar of zestien.' },
  { id: 'volw', txt: 'Het gaat om een volwassene van rond de veertig.' },
  { id: 'oud', txt: 'Het gaat om iemand van in de tachtig.' },
];
const LOCATIONS = [
  { id: 'thuis', pre: '' }, { id: 'straat', pre: '' }, { id: 'werk', pre: 'Bedrijf ' }, { id: 'school', pre: 'Basisschool ' },
  { id: 'wzc', pre: 'Woonzorgcentrum ' }, { id: 'sport', pre: 'Sportcomplex ' }, { id: 'station', pre: 'Station ' },
  { id: 'winkel', pre: 'Supermarkt ' }, { id: 'cafe', pre: 'Café ' }, { id: 'park', pre: 'Stadspark ' },
];
const LOC_NAMES = ['De Linde', 'Ter Beke', 'Sint-Jozef', 'Het Anker', 'De Zon', 'Ter Duinen', 'De Vlier', 'Hof ter Weyden', 'De Molen', 'Zonnebloem'];
const CALLERS = [
  { id: 'zelf', pre: '' }, { id: 'partner', pre: 'Ik bel voor mijn partner. ' }, { id: 'kind', pre: 'Ik bel voor mijn moeder. ' },
  { id: 'ouder', pre: 'Ik bel voor mijn kind. ' }, { id: 'buur', pre: 'Ik ben de buurvrouw. ' }, { id: 'passant', pre: 'Ik kom hier toevallig voorbij. ' },
  { id: 'collega', pre: 'Ik bel voor een collega. ' }, { id: 'zorg', pre: 'Ik ben verpleegkundige hier. ' },
];
// welke varianten bij welke categorie horen
const VARIANT_SETS = {
  med: { pat: PATIENTS, loc: LOCATIONS, call: CALLERS },
  verkeer: { pat: PATIENTS.slice(1), loc: [{ id: 'straat', pre: '' }, { id: 'snelweg', pre: '' }, { id: 'kruispunt', pre: '' }, { id: 'parking', pre: 'Parking ' }], call: CALLERS.filter(c => ['zelf', 'passant', 'partner', 'collega'].includes(c.id)) },
  brand: { pat: [{ id: '-', txt: '' }], loc: LOCATIONS.filter(l => ['thuis', 'straat', 'werk', 'school', 'wzc', 'winkel', 'cafe', 'park'].includes(l.id)), call: CALLERS.filter(c => ['zelf', 'buur', 'passant', 'collega', 'zorg'].includes(c.id)) },
  politie: { pat: [{ id: '-', txt: '' }], loc: LOCATIONS.filter(l => ['thuis', 'straat', 'winkel', 'cafe', 'station', 'park'].includes(l.id)), call: CALLERS.filter(c => ['zelf', 'buur', 'passant', 'collega'].includes(c.id)) },
};
function variantCount() {
  let n = 0;
  for (const t of INCIDENT_TYPES) { const v = VARIANT_SETS[t.cat]; n += SEVERITIES.length * v.pat.length * v.loc.length * v.call.length * t.calls.length; }
  return n;
}
// benodigde middelen aanpassen aan de ernst
function needForVariant(t, prio) {
  const need = { ...t.need };
  if (t.cat === 'med' || t.cat === 'verkeer') {
    if (prio === 1 && !need.MUG && !need.PIT) need.PIT = 1;
    if (prio === 3) { delete need.MUG; delete need.PIT; if (!need.AMB && !Object.keys(need).length) need.AMB = 1; }
  }
  if (!Object.keys(need).length) Object.assign(need, t.need);
  return need;
}

// ===== Extra velden bij het alarmeren (eigen codes) =====
// BRW: eigen brandweerprotocollen. typeId koppelt aan een incidenttype als het hoofdprotocol is.
const BRW_CODES = [
  { code: 'B-10', name: 'Brand, algemeen', need: { AP: 1 } },
  { code: 'B-11', name: 'Automatische brandmelding', need: { AP: 1 } },
  { code: 'B-12', name: 'Buitenbrand klein', typeId: 'container', need: { AP: 1 } },
  { code: 'B-13', name: 'Buitenbrand groot', need: { AP: 1, TW: 1 } },
  { code: 'B-14', name: 'Brand in gebouw', typeId: 'woningbrand', need: { AP: 2, AL: 1 } },
  { code: 'B-15', name: 'Keukenbrand', typeId: 'keukenbrand', need: { AP: 1 } },
  { code: 'B-16', name: 'Rook- of brandgeur, controle', need: { AP: 1 } },
  { code: 'B-17', name: 'Natuurbrand beperkt', typeId: 'natuur', need: { AP: 1, TW: 1 } },
  { code: 'B-18', name: 'Natuurbrand uitgebreid', need: { AP: 2, TW: 2 } },
  { code: 'B-19', name: 'Brand industrie', typeId: 'industrie', need: { AP: 3, AL: 1, TW: 1 } },
  { code: 'B-20', name: 'Voertuigbrand', need: { AP: 1 } },
  { code: 'B-21', name: 'Wateroverlast of stormschade', typeId: 'water', need: { HV: 1 } },
  { code: 'B-22', name: 'Dier in nood', typeId: 'dier', need: { HV: 1 } },
  { code: 'B-23', name: 'Gaslek', typeId: 'gaslek', need: { AP: 1, HV: 1 } },
  { code: 'B-24', name: 'Bevrijding geknelde persoon', need: { AP: 1, HV: 1 } },
  { code: 'B-25', name: 'Persoon opgesloten (lift, deur)', need: { HV: 1 } },
  { code: 'B-26', name: 'Hulp bij tillen of toegang', need: { HV: 1 } },
  { code: 'B-27', name: 'Gevaarlijke stoffen', need: { AP: 1, HV: 1, TW: 1 } },
];
const POL_EXTRA = [
  { code: 'PB', name: 'Bijstand politie', need: { POL: 1 } },
  { code: 'PE', name: 'Enkel politie', need: { POL: 1 } },
];
const MED_BIJSTAND = [
  { code: 'loc-woning', name: 'Locatie: woning' },
  { code: 'loc-appt', name: 'Locatie: appartement zonder lift' },
  { code: 'loc-openbaar', name: 'Locatie: openbare plaats' },
  { code: 'loc-zh', name: 'Locatie: ziekenhuis of zorginstelling' },
  { code: 'bij-mug', name: 'Ziekenwagen vraagt bijstand MUG', need: { MUG: 1 } },
  { code: 'bij-pit', name: 'Ziekenwagen vraagt bijstand PIT', need: { PIT: 1 } },
  { code: 'bij-zw', name: 'Ziekenwagen vraagt bijstand ziekenwagen', need: { AMB: 2 } },
  { code: 'bij-brw', name: 'Ziekenwagen vraagt bijstand brandweer', need: { HV: 1 } },
  { code: 'bij-pol', name: 'Ziekenwagen vraagt bijstand politie', need: { POL: 1 } },
  { code: 'tel-reanimatie', name: 'Telefonische reanimatie-instructies gegeven' },
  { code: 'huisarts', name: 'Huisarts zo snel mogelijk contacteren' },
];
// Toestand voor de ploeg: B = bewustzijn, A = ademhaling, C = circulatie
const ABC_CODES = [];
for (const b of ['+', '-', '?']) for (const a of ['+', '-', '?']) for (const c of ['+', '-', '?']) ABC_CODES.push(`B${b} A${a} C${c}`);
