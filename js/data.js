// ===== Regio's, steden, voertuigen en incidenttypes =====
// size: 1 = kleine stad, 2 = middelgroot, 3 = grootstad

const PROVINCES = [
  { id: 'wvl', name: 'West-Vlaanderen', cities: [
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
  { id: 'ovl', name: 'Oost-Vlaanderen', cities: [
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
  { id: 'ant', name: 'Antwerpen', cities: [
    { id: 'antwerpen', name: 'Antwerpen', lat: 51.2194, lng: 4.4025, size: 3 },
    { id: 'mechelen', name: 'Mechelen', lat: 51.0259, lng: 4.4776, size: 2 },
    { id: 'turnhout', name: 'Turnhout', lat: 51.3227, lng: 4.9447, size: 2 },
    { id: 'mol', name: 'Mol', lat: 51.1910, lng: 5.1160, size: 1 },
    { id: 'geel', name: 'Geel', lat: 51.1620, lng: 4.9900, size: 1 },
    { id: 'lier', name: 'Lier', lat: 51.1310, lng: 4.5700, size: 1 },
    { id: 'herentals', name: 'Herentals', lat: 51.1770, lng: 4.8360, size: 1 },
    { id: 'boom', name: 'Boom', lat: 51.0880, lng: 4.3660, size: 1 },
  ]},
  { id: 'vbr', name: 'Vlaams-Brabant', cities: [
    { id: 'leuven', name: 'Leuven', lat: 50.8798, lng: 4.7005, size: 3 },
    { id: 'vilvoorde', name: 'Vilvoorde', lat: 50.9280, lng: 4.4290, size: 2 },
    { id: 'halle', name: 'Halle', lat: 50.7340, lng: 4.2340, size: 1 },
    { id: 'tienen', name: 'Tienen', lat: 50.8070, lng: 4.9380, size: 1 },
    { id: 'aarschot', name: 'Aarschot', lat: 50.9850, lng: 4.8370, size: 1 },
    { id: 'diest', name: 'Diest', lat: 50.9890, lng: 5.0510, size: 1 },
    { id: 'zaventem', name: 'Zaventem', lat: 50.8840, lng: 4.4720, size: 1 },
  ]},
  { id: 'lim', name: 'Limburg', cities: [
    { id: 'hasselt', name: 'Hasselt', lat: 50.9307, lng: 5.3325, size: 3 },
    { id: 'genk', name: 'Genk', lat: 50.9650, lng: 5.5000, size: 2 },
    { id: 'sinttruiden', name: 'Sint-Truiden', lat: 50.8160, lng: 5.1860, size: 1 },
    { id: 'tongeren', name: 'Tongeren', lat: 50.7810, lng: 5.4640, size: 1 },
    { id: 'lommel', name: 'Lommel', lat: 51.2300, lng: 5.3130, size: 1 },
    { id: 'maasmechelen', name: 'Maasmechelen', lat: 50.9650, lng: 5.6940, size: 1 },
    { id: 'beringen', name: 'Beringen', lat: 51.0490, lng: 5.2260, size: 1 },
  ]},
  { id: 'bru', name: 'Brussel', cities: [
    { id: 'brussel', name: 'Brussel-Stad', lat: 50.8466, lng: 4.3528, size: 3 },
    { id: 'schaarbeek', name: 'Schaarbeek', lat: 50.8676, lng: 4.3737, size: 2 },
    { id: 'anderlecht', name: 'Anderlecht', lat: 50.8333, lng: 4.3072, size: 2 },
    { id: 'ukkel', name: 'Ukkel', lat: 50.8030, lng: 4.3330, size: 2 },
    { id: 'elsene', name: 'Elsene', lat: 50.8270, lng: 4.3720, size: 2 },
  ]},
  { id: 'hen', name: 'Henegouwen', cities: [
    { id: 'charleroi', name: 'Charleroi', lat: 50.4108, lng: 4.4446, size: 3 },
    { id: 'bergen', name: 'Bergen (Mons)', lat: 50.4542, lng: 3.9567, size: 2 },
    { id: 'doornik', name: 'Doornik (Tournai)', lat: 50.6056, lng: 3.3880, size: 2 },
    { id: 'lalouviere', name: 'La Louvière', lat: 50.4800, lng: 4.1870, size: 2 },
    { id: 'moeskroen', name: 'Moeskroen', lat: 50.7440, lng: 3.2140, size: 1 },
  ]},
  { id: 'lui', name: 'Luik', cities: [
    { id: 'luik', name: 'Luik (Liège)', lat: 50.6326, lng: 5.5797, size: 3 },
    { id: 'verviers', name: 'Verviers', lat: 50.5890, lng: 5.8620, size: 2 },
    { id: 'seraing', name: 'Seraing', lat: 50.5830, lng: 5.5000, size: 2 },
    { id: 'hoei', name: 'Hoei (Huy)', lat: 50.5190, lng: 5.2400, size: 1 },
    { id: 'eupen', name: 'Eupen', lat: 50.6280, lng: 6.0360, size: 1 },
  ]},
  { id: 'nam', name: 'Namen', cities: [
    { id: 'namen', name: 'Namen (Namur)', lat: 50.4674, lng: 4.8720, size: 2 },
    { id: 'dinant', name: 'Dinant', lat: 50.2610, lng: 4.9120, size: 1 },
    { id: 'gembloux', name: 'Gembloux', lat: 50.5610, lng: 4.6970, size: 1 },
  ]},
  { id: 'wbr', name: 'Waals-Brabant', cities: [
    { id: 'waver', name: 'Waver (Wavre)', lat: 50.7170, lng: 4.6010, size: 1 },
    { id: 'nijvel', name: 'Nijvel (Nivelles)', lat: 50.5980, lng: 4.3290, size: 1 },
    { id: 'ottignies', name: 'Ottignies-LLN', lat: 50.6680, lng: 4.6140, size: 1 },
  ]},
  { id: 'lux', name: 'Luxemburg', cities: [
    { id: 'aarlen', name: 'Aarlen (Arlon)', lat: 49.6833, lng: 5.8167, size: 1 },
    { id: 'bastenaken', name: 'Bastenaken', lat: 50.0030, lng: 5.7190, size: 1 },
    { id: 'marche', name: 'Marche-en-Famenne', lat: 50.2270, lng: 5.3440, size: 1 },
  ]},
];

// Voertuigtypes
const VEHICLE_TYPES = {
  AMB: { name: 'Ziekenwagen', short: 'AMB', service: 'med', color: '#f2c200', speed: 1.0, price: 2500 },
  MUG: { name: 'MUG', short: 'MUG', service: 'med', color: '#ff8c00', speed: 1.15, price: 5000 },
  AP:  { name: 'Autopomp', short: 'AP', service: 'fire', color: '#d62828', speed: 0.9, price: 4000 },
  AL:  { name: 'Autoladder', short: 'AL', service: 'fire', color: '#a4161a', speed: 0.8, price: 7000 },
  TW:  { name: 'Tankwagen', short: 'TW', service: 'fire', color: '#e85d04', speed: 0.8, price: 4500 },
  HV:  { name: 'Hulpverleningswagen', short: 'HV', service: 'fire', color: '#9d0208', speed: 0.9, price: 6000 },
  POL: { name: 'Interventiewagen', short: 'POL', service: 'pol', color: '#1d4ed8', speed: 1.1, price: 2000 },
};

// Posttypes
const STATION_TYPES = {
  fire: { name: 'Brandweerpost', icon: '🚒', color: '#d62828', allowed: ['AP', 'AL', 'TW', 'HV'], price: 25000 },
  med:  { name: 'Ambulancepost', icon: '🚑', color: '#f2c200', allowed: ['AMB'], price: 15000 },
  hosp: { name: 'Ziekenhuis', icon: '🏥', color: '#16a34a', allowed: ['MUG'], price: 40000 },
  pol:  { name: 'Politiekantoor', icon: '🚓', color: '#1d4ed8', allowed: ['POL'], price: 15000 },
};

// Standaardbezetting per stadgrootte
const DEFAULT_FLEET = {
  1: { fire: ['AP', 'TW'], med: ['AMB'], hosp: ['MUG'], pol: ['POL', 'POL'] },
  2: { fire: ['AP', 'AP', 'AL', 'TW', 'HV'], med: ['AMB', 'AMB'], hosp: ['MUG'], pol: ['POL', 'POL', 'POL'] },
  3: { fire: ['AP', 'AP', 'AP', 'AL', 'TW', 'HV'], med: ['AMB', 'AMB', 'AMB'], hosp: ['MUG', 'MUG'], pol: ['POL', 'POL', 'POL', 'POL'] },
};

// Verschuiving van posten t.o.v. stadscentrum (in km: [noord, oost])
const STATION_OFFSETS = { fire: [0.6, -0.8], med: [-0.7, 0.5], hosp: [-0.3, -1.1], pol: [0.25, 0.35] };

// Incidenttypes
// need: vereiste voertuigen, dur: verwerkingstijd ter plaatse (s), transport: patiënt naar ziekenhuis
const INCIDENT_TYPES = [
  { id: 'onwel', name: 'Onwel persoon', icon: '🩺', need: { AMB: 1 }, dur: 40, reward: 300, weight: 14, transport: true,
    calls: ['Mijn vader voelt zich niet goed, hij is heel bleek en zweet.', 'Er is hier een vrouw flauwgevallen op straat!', 'Mijn buurman is gevallen en kan niet meer recht.'] },
  { id: 'hart', name: 'Hartstilstand', icon: '❤️', need: { AMB: 1, MUG: 1 }, dur: 60, reward: 700, weight: 5, transport: true, minLevel: 1,
    calls: ['Mijn man reageert niet meer en ademt niet! Help!', 'Er is iemand in elkaar gezakt in de supermarkt, hij ademt niet.'] },
  { id: 'vkl', name: 'Verkeersongeval', icon: '🚗', need: { POL: 1, AMB: 1 }, dur: 50, reward: 500, weight: 10, transport: true,
    calls: ['Er is net een aanrijding gebeurd tussen een auto en een fietser.', 'Twee auto\'s zijn op elkaar geknald op het kruispunt.'] },
  { id: 'vkz', name: 'Ongeval met geknelde', icon: '💥', need: { POL: 1, AMB: 1, MUG: 1, AP: 1, HV: 1 }, dur: 90, reward: 1600, weight: 3, transport: true, minLevel: 3,
    calls: ['Een auto is tegen een boom gereden, de bestuurder zit vast!', 'Zwaar ongeval, er zit iemand gekneld in de wagen!'] },
  { id: 'woningbrand', name: 'Woningbrand', icon: '🔥', need: { AP: 2, AL: 1, AMB: 1 }, dur: 100, reward: 1500, weight: 4, minLevel: 2,
    calls: ['Het huis van mijn buren staat in brand, er komt veel rook uit het dak!', 'Er komen vlammen uit het raam op de eerste verdieping!'] },
  { id: 'keukenbrand', name: 'Keukenbrand', icon: '🍳', need: { AP: 1 }, dur: 45, reward: 450, weight: 7,
    calls: ['De frituurpan heeft vuur gevat in de keuken!', 'Er is brand in mijn keuken, het gaat niet uit!'] },
  { id: 'container', name: 'Containerbrand', icon: '🗑️', need: { AP: 1 }, dur: 35, reward: 300, weight: 7,
    calls: ['Er staat een container in brand naast de school.', 'Een vuilnisbak brandt hevig aan het station.'] },
  { id: 'natuur', name: 'Bermbrand', icon: '🌾', need: { AP: 1, TW: 1 }, dur: 60, reward: 650, weight: 4, minLevel: 1,
    calls: ['Er brandt een groot stuk gras langs de weg, het breidt snel uit.', 'Er is een bosbrand bezig aan de rand van het bos!'] },
  { id: 'water', name: 'Wateroverlast', icon: '🌧️', need: { HV: 1 }, dur: 70, reward: 500, weight: 4,
    calls: ['Mijn kelder staat helemaal onder water na de storm.', 'Er ligt een boom over de weg na het onweer.'] },
  { id: 'inbraak', name: 'Inbraak', icon: '🦹', need: { POL: 2 }, dur: 45, reward: 400, weight: 7,
    calls: ['Ik hoor iemand in mijn huis beneden, ik zit boven verstopt.', 'Er zijn twee mannen bezig bij de buren in te breken!'] },
  { id: 'vecht', name: 'Vechtpartij', icon: '👊', need: { POL: 2, AMB: 1 }, dur: 50, reward: 650, weight: 5, transport: true,
    calls: ['Er is een gevecht aan de gang aan het café, iemand bloedt!', 'Een groep jongeren slaat op iemand in op het plein.'] },
  { id: 'diefstal', name: 'Winkeldiefstal', icon: '🛒', need: { POL: 1 }, dur: 30, reward: 200, weight: 7,
    calls: ['We hebben een winkeldief betrapt, hij wil niet meewerken.', 'Iemand heeft net mijn handtas gestolen!'] },
  { id: 'gaslek', name: 'Gaslek', icon: '💨', need: { AP: 1, HV: 1, POL: 1 }, dur: 70, reward: 900, weight: 3, minLevel: 2,
    calls: ['Het ruikt hier heel sterk naar gas in de straat.', 'Bij werken is een gasleiding geraakt!'] },
  { id: 'industrie', name: 'Industriebrand', icon: '🏭', need: { AP: 3, AL: 1, TW: 1, AMB: 1, POL: 1 }, dur: 140, reward: 3200, weight: 1, minLevel: 5,
    calls: ['Er is een grote brand in de loods op het industrieterrein!', 'Zware rookontwikkeling bij het bedrijf, er zijn ontploffingen!'] },
  { id: 'val', name: 'Val van hoogte', icon: '🪜', need: { AMB: 1, AL: 1 }, dur: 60, reward: 800, weight: 2, transport: true, minLevel: 2,
    calls: ['Een werkman is van de stelling gevallen, hij ligt op een dak.', 'Iemand is van een ladder gevallen en kan niet bewegen.'] },
  { id: 'dier', name: 'Dier in nood', icon: '🐈', need: { HV: 1 }, dur: 40, reward: 300, weight: 2,
    calls: ['Er zit een kat al twee dagen vast in een boom.', 'Een paard is in een gracht gevallen!'] },
];

const STREETS = ['Kerkstraat', 'Stationsstraat', 'Molenstraat', 'Dorpsstraat', 'Nieuwstraat', 'Schoolstraat', 'Kapelstraat', 'Markt', 'Grote Markt',
  'Steenweg', 'Hoogstraat', 'Bruggestraat', 'Gentsesteenweg', 'Kortrijksestraat', 'Lindenlaan', 'Beukenlaan', 'Veldstraat', 'Industrielaan',
  'Zandstraat', 'Bosstraat', 'Ringlaan', 'Koningin Astridlaan', 'Leopoldlaan', 'Vrijheidstraat', 'Meersstraat', 'Ieperstraat', 'Hogeweg'];
