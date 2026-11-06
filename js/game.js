'use strict';
/* ==========================================================
   Meldkamer 112 — dispatch simulator
   ========================================================== */

const SAVE_KEY = 'meldkamer112_save_v1';
const DRIVE_COMPRESS = 1;          // op 1× loopt alles in echte tijd
const CALL_TIMEOUT = 75;           // s voor een oproep die niet opgenomen wordt
const HOSPITAL_TIME = 600;         // s overdracht in ziekenhuis (10 min)
const SCENE_FACTOR = 5;            // tijd ter plaatse = protocolduur x 5 (enkele minuten)
const sceneDur = inc => TYPE_BY_ID[inc.typeId].dur * SCENE_FACTOR;
// uitruktijd in seconden: van alarm tot vertrek
function turnoutSec(u) {
  if (u.status === 5) return 0;
  const VT = VEHICLE_TYPES[u.type];
  if (VT.air) return 300;
  if (VT.service === 'pol') return 30;
  if (VT.service === 'fire') return isNight() ? 300 : 150;
  return 60;
}
const TRANSPORT_DECIDE = 60;       // s om een ziekenhuis te kiezen
const NEIGHBOR_PRICE = 600;        // prijs per eenheid van een buurcentrale
const SPEC_NEED = { hart: 'cathlab', borst: 'cathlab', beroerte: 'stroke', valhoogte: 'trauma', vkz: 'trauma' };
const SPEC_TXT = { cathlab: '❤️ Cathlab', stroke: '🧠 Stroke unit', trauma: '🦴 Trauma' };

const CITY_BY_ID = {};
PROVINCES.forEach(p => p.cities.forEach(c => { c.prov = p.id; CITY_BY_ID[c.id] = c; }));
const TYPE_BY_ID = {}; INCIDENT_TYPES.forEach(t => TYPE_BY_ID[t.id] = t);

// ---------- State ----------
const S = {
  credits: 10000, xp: 0, done: 0, failed: 0, transfers: 0, normHit: 0, normTotal: 0,
  time: 0, speed: 1, sound: true, voice: true,
  player: '', day: 'today', start: 'now', startSec: 8 * 3600,
  cities: [], extraVehicles: {}, customStations: [],
  stations: [], units: [], incidents: [], calls: [], radio: [],
  nextId: 1, nextSpawn: 5, running: false, nextHospTick: 0,
  theme: (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark', incNo: 100, weather: WEATHER[1], nextWeather: 0, baseDate: null, logbook: [],
};

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (d) for (const k of ['credits', 'xp', 'done', 'failed', 'transfers', 'normHit', 'normTotal', 'cities', 'extraVehicles',
      'customStations', 'sound', 'voice', 'player', 'day', 'start', 'theme', 'consent']) if (d[k] !== undefined) S[k] = d[k];
  } catch (e) { /* geen opslag */ }
}
function save() {
  try {
    const o = {}; for (const k of ['credits', 'xp', 'done', 'failed', 'transfers', 'normHit', 'normTotal', 'cities', 'extraVehicles',
      'customStations', 'sound', 'voice', 'player', 'day', 'start', 'theme', 'consent']) o[k] = S[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify(o));
  } catch (e) { /* negeren */ }
}

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const level = () => Math.floor(Math.sqrt(S.xp / 400)) + 1;
const fmtTime = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
const realMin = gameSec => gameSec * DRIVE_COMPRESS / 60;
const totalSec = () => S.startSec + S.time * DRIVE_COMPRESS;
const clockSec = () => totalSec() % 86400;
const p2 = n => String(Math.floor(n)).padStart(2, '0');
const clockStr = (sec = clockSec()) => p2(sec / 3600) + ':' + p2(sec / 60 % 60);
const clockLong = (sec = clockSec()) => clockStr(sec) + ':' + p2(sec % 60);
const isNight = () => { const h = clockSec() / 3600; return h < 7 || h >= 21; };
function dateStr() {
  const d = currentDate();
  return d.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
}
const DAY_NAMES = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function offsetKm(lat, lng, north, east) { return [lat + north / 111.32, lng + east / (111.32 * Math.cos(lat * Math.PI / 180))]; }
function distM(a, b) {
  const R = 6371000, toR = Math.PI / 180, dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function logbook(text, kind = '') {
  S.logbook.unshift({ t: clockLong(), text, kind }); if (S.logbook.length > 160) S.logbook.pop();
  logDirty = true;
}
function log(msg, color) {
  logbook(msg.replace(/<[^>]+>/g, ''));
  const d = document.createElement('div'); d.innerHTML = msg; if (color) d.style.borderLeftColor = color;
  $('#log').prepend(d); setTimeout(() => d.remove(), 8000);
  while ($('#log').children.length > 8) $('#log').lastChild.remove();
}
function addXp(n) { S.xp = Math.max(0, S.xp + n); }

// ---------- Geluid & stemmen ----------
let audioCtx = null;
function beep(freq = 880, dur = 0.15, times = 2, vol = 0.04) {
  if (!S.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'square'; g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * dur * 1.6; o.start(t); o.stop(t + dur);
    }
  } catch (e) { /* geen audio */ }
}
let nlVoices = [];
function loadVoices() {
  if (!window.speechSynthesis) return;
  const all = speechSynthesis.getVoices();
  nlVoices = all.filter(v => /^nl/i.test(v.lang)).sort((a, b) => (b.lang === 'nl-BE') - (a.lang === 'nl-BE'));
}
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(text, kind = 'radio', seed = 0) {
  if (!S.voice || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-BE';
    if (nlVoices.length) u.voice = nlVoices[seed % nlVoices.length];
    if (kind === 'caller') { u.rate = 1.15; u.pitch = 0.9 + (seed % 5) * 0.12; }
    else { u.rate = 1.1; u.pitch = 0.75 + (seed % 3) * 0.1; }
    speechSynthesis.speak(u);
  } catch (e) { /* geen TTS */ }
}

// ---------- Kaart ----------
const map = L.map('map', { zoomControl: true }).setView([50.85, 4.35], 8);
// CARTO-basiskaarten (sleutel is bedoeld voor gebruik in de browser)
const CARTO_KEY = 'cb1_538j_1_f2a1221620e79689d3f8a977';
const cartoLayer = style => L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${CARTO_KEY}`, {
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bijdragers &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
});
const baseLayers = {
  'Straten (licht)': cartoLayer('voyager'),
  'Donker': cartoLayer('dark_all'),
  'Grijs (licht)': cartoLayer('light_all'),
};
// valt CARTO weg, dan tijdelijk de gewone OSM-kaart
let tileErrors = 0, osmFallback = null;
for (const l of Object.values(baseLayers)) l.on('tileerror', () => {
  if (++tileErrors === 12 && !osmFallback) {
    osmFallback = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap-bijdragers' }).addTo(map);
    osmFallback.bringToBack();
  }
});
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  const want = S.theme === 'light' ? 'Straten (licht)' : 'Donker';
  for (const [k, l] of Object.entries(baseLayers)) { if (k === want) { if (!map.hasLayer(l)) l.addTo(map); } else if (map.hasLayer(l)) map.removeLayer(l); }
  for (const id of ['btnTheme', 'btnThemeHome']) { const b = document.getElementById(id); if (b) b.textContent = S.theme === 'light' ? '🌙' : '☀️'; }
}
const layers = { stations: L.layerGroup().addTo(map), hospitals: L.layerGroup().addTo(map), neighbors: L.layerGroup().addTo(map), units: L.layerGroup().addTo(map), incidents: L.layerGroup().addTo(map), routes: L.layerGroup().addTo(map) };
L.control.layers(baseLayers, { 'Routes': layers.routes }, { position: 'topright' }).addTo(map);

// ---------- Routering (OSRM met fallback) ----------
const routeCache = new Map();
// Routeservers (OSRM-protocol). De eerste is de server van OpenStreetMap Duitsland, de tweede de OSRM-demo.
const ROUTERS = [
  (a, b) => `https://routing.openstreetmap.de/routed-car/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`,
  (a, b) => `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`,
];
const routerDown = [0, 0];            // tijdstip (ms) tot wanneer een server overgeslagen wordt
let routeQueue = Promise.resolve();    // aanvragen rustig na elkaar
function queued(fn) {
  const p = routeQueue.then(fn, fn);
  routeQueue = p.then(() => new Promise(r => setTimeout(r, 250)), () => new Promise(r => setTimeout(r, 250)));
  return p;
}
async function fetchRoute(i, a, b) {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(ROUTERS[i](a, b), { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const rt = j.routes && j.routes[0];
    if (!rt || !rt.geometry || rt.geometry.coordinates.length < 2) throw new Error('geen route');
    // voertuig blijft op de weg: start en einde zijn de punten waar de route de weg raakt
    return { pts: rt.geometry.coordinates.map(c => [c[1], c[0]]), dist: rt.distance, dur: rt.duration, road: true };
  } finally { clearTimeout(to); }
}
async function getRoute(a, b) {
  const key = a.map(x => x.toFixed(4)).join() + '|' + b.map(x => x.toFixed(4)).join();
  if (routeCache.has(key)) return routeCache.get(key);
  let res = null;
  for (let attempt = 0; attempt < 3 && !res; attempt++) {
    for (let i = 0; i < ROUTERS.length && !res; i++) {
      if (Date.now() < routerDown[i]) continue;
      try { res = await queued(() => fetchRoute(i, a, b)); }
      catch (e) { routerDown[i] = Date.now() + 8000; }
    }
    if (!res && attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res) { // laatste noodoplossing: rechte lijn
    const d = distM(a, b) * 1.35, v = d < 3000 ? 8.5 : d < 10000 ? 12.5 : 18;
    res = { pts: [a, b], dist: d, dur: d / v, road: false };
    if (!getRoute.warned) { getRoute.warned = true; log('🛣️ De routeserver antwoordt niet. Voertuigen rijden tijdelijk in rechte lijn.', '#f59e0b'); setTimeout(() => { getRoute.warned = false; }, 120000); }
    return res; // niet bewaren, zodat het later opnieuw geprobeerd wordt
  }
  routeCache.set(key, res);
  if (routeCache.size > 400) routeCache.delete(routeCache.keys().next().value);
  return res;
}
function timeProfile(pts, cum) {
  const tc = [0], total = cum[cum.length - 1] || 1;
  for (let i = 1; i < pts.length; i++) {
    const len = cum[i] - cum[i - 1];
    let f = 1;
    if (i >= 2) {
      const a1 = Math.atan2(pts[i - 1][0] - pts[i - 2][0], pts[i - 1][1] - pts[i - 2][1]);
      const a2 = Math.atan2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let d = Math.abs(a2 - a1) * 180 / Math.PI; if (d > 180) d = 360 - d;
      f = d > 60 ? 0.35 : d > 30 ? 0.6 : d > 12 ? 0.85 : 1;
    }
    const mid = (cum[i] + cum[i - 1]) / 2;
    if (mid < 150 || total - mid < 150) f = Math.min(f, 0.5);
    else if (len > 300) f = Math.min(1.25, f * 1.25); // lange rechte stukken: sneller
    tc.push(tc[i - 1] + len / f);
  }
  return tc;
}
function posAtTime(m, f) {
  const target = f * m.tcum[m.tcum.length - 1];
  let i = 1; while (i < m.tcum.length - 1 && m.tcum[i] < target) i++;
  const seg = m.tcum[i] - m.tcum[i - 1] || 1, t = Math.min(1, Math.max(0, (target - m.tcum[i - 1]) / seg));
  const p = m.pts[i - 1], q = m.pts[i];
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, Math.sign(q[1] - p[1])];
}
function setFacing(u, dir) {
  if (!dir || dir === u.facing) return;
  u.facing = dir;
  const img = u.marker.getElement()?.querySelector('.mk-vimg');
  if (img) img.classList.toggle('flip', dir < 0);
}
function prepRoute(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distM(pts[i - 1], pts[i])); return cum; }
function posOnRoute(m, f) {
  const target = f * m.cum[m.cum.length - 1];
  let i = 1; while (i < m.cum.length - 1 && m.cum[i] < target) i++;
  const seg = m.cum[i] - m.cum[i - 1] || 1, t = Math.min(1, Math.max(0, (target - m.cum[i - 1]) / seg));
  const p = m.pts[i - 1], q = m.pts[i];
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}

// ---------- Opbouw wereld ----------
function buildWorld() {
  layers.stations.clearLayers(); layers.hospitals.clearLayers(); layers.neighbors.clearLayers(); layers.units.clearLayers(); layers.incidents.clearLayers(); layers.routes.clearLayers();
  S.stations = []; S.units = []; S.incidents = []; S.calls = []; S.radio = [];
  for (const cid of S.cities) {
    const c = CITY_BY_ID[cid]; if (!c) continue;
    const fleet = DEFAULT_FLEET[c.size];
    for (const type of Object.keys(STATION_TYPES)) {
      const [n, e] = STATION_OFFSETS[type];
      const k = 0.6 + c.size * 0.2;
      const [lat, lng] = offsetKm(c.lat, c.lng, n * k, e * k);
      const name = type === 'hosp' ? `AZ ${c.name.split(' (')[0]}` : `${STATION_TYPES[type].name} ${c.name.split(' (')[0]}`;
      const fl = type === 'hosp' && HELI_BASES.includes(cid) ? [...fleet[type], 'HELI'] : fleet[type];
      addStation({ id: `${cid}-${type}`, type, name, lat, lng, cityId: cid }, fl);
    }
  }
  for (const cs of S.customStations) if (S.cities.includes(cs.cityId)) addStation({ ...cs }, []);
  // ziekenhuizen: specialisaties en bezetting
  for (const h of S.stations.filter(s => s.type === 'hosp')) {
    const size = CITY_BY_ID[h.cityId]?.size || 1;
    h.specs = size >= 3 ? ['cathlab', 'stroke', 'trauma'] : size === 2 ? ['cathlab', 'stroke'] : [];
    h.load = rnd(0.2, 0.75);
  }
  for (const nb of neighborCentrales(myProvinces())) {
    L.marker([nb.lat, nb.lng], { icon: L.divIcon({ className: '', html: '<div class="mk mk-nb">☎️</div>', iconSize: [26, 26], iconAnchor: [13, 13] }) })
      .bindTooltip(esc(nb.name)).addTo(layers.neighbors);
  }
  const pts = S.cities.map(id => [CITY_BY_ID[id].lat, CITY_BY_ID[id].lng]);
  if (pts.length === 1) map.setView(pts[0], 13);
  else if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.15));
  S.nextSpawn = S.time + 25;
  renderAll();
}
function addStation(st, baseFleet) {
  st.unitCount = st.unitCount || {};
  S.stations.push(st);
  const T = STATION_TYPES[st.type];
  st.marker = L.marker([st.lat, st.lng], {
    icon: stationIcon(st),
    zIndexOffset: -100,
  }).bindTooltip(() => st.type === 'hosp' ? `${esc(st.name)} · spoed ${hospStatus(st)}` : esc(st.name)).addTo(st.type === 'hosp' ? layers.hospitals : layers.stations);
  st.marker.on('click', () => { switchTab('stations'); const el = document.getElementById('st-' + st.id); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
  [...baseFleet, ...(S.extraVehicles[st.id] || [])].forEach(t => addUnit(st, t));
  refreshStation(st);
}
// vierkante speld per post: kleur per soort, grijs als niets meer vrij is
const PIN_COLORS = { fire: '#e0605a', med: '#7cc4f2', pol: '#4f6fbf', hosp: '#2f6fdb' };
const HOUSE = '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M8 2 L14 7.5 H12.3 V14 H9.6 V10 H6.4 V14 H3.7 V7.5 H2 Z" fill="currentColor"/></svg>';
function stationIcon(st) {
  const us = S.units.filter(u => u.station === st), free = us.filter(isFree).length;
  const state = !us.length ? 'none' : free === 0 ? 'none' : free < us.length ? 'some' : 'all';
  const glyph = st.type === 'hosp' ? '<b>H</b>' : HOUSE;
  return L.divIcon({ className: '', html: `<div class="pin pin-${state}" style="--pc:${PIN_COLORS[st.type] || '#7cc4f2'}">${glyph}</div>`, iconSize: [20, 20], iconAnchor: [10, 10] });
}
function refreshStation(st) {
  if (!st || !st.marker) return;
  const key = S.units.filter(u => u.station === st).map(u => isFree(u) ? 1 : 0).join('');
  if (st._pinKey === key) return;
  st._pinKey = key; st.marker.setIcon(stationIcon(st));
}
function addUnit(st, type, temp = false) {
  st.unitCount[type] = (st.unitCount[type] || 0) + 1;
  const city = CITY_BY_ID[st.cityId];
  const VT = VEHICLE_TYPES[type];
  const u = {
    id: S.nextId++, type, stationId: st.id, status: 1, lat: st.lat, lng: st.lng, incidentId: null, move: null, temp,
    name: temp ? `${unitPrefix(type, st.cityId)} Buurcentrale ${st.unitCount[type]}` : type === 'HELI' ? `HELI ${city ? city.name.split(' ')[0] : st.name}` : `${unitPrefix(type, st.cityId)} ${city ? city.name.split(' ')[0] : st.name} ${st.unitCount[type]}`,
  };
  u.station = st;
  { const cc = (city ? city.name : st.name).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    u.team = `T-${unitPrefix(type, st.cityId)}-${cc}-${String(st.unitCount[type]).padStart(2, '0')}`;
    u.shiftEnd = [7, 19][Math.floor(Math.random() * 2)] * 3600; }
  u.marker = L.marker([u.lat, u.lng], { icon: unitIcon(u), zIndexOffset: 500 }).bindTooltip(() => `${esc(u.name)} · status ${u.status}`);
  u.marker.on('click', () => { if (u.incidentId) openDispatch(u.incidentId); });
  S.units.push(u);
  return u;
}
function unitIcon(u) {
  const VT = VEHICLE_TYPES[u.type];
  const label = u.status !== 1 ? `<span class="mk-label">${esc(u.name)}</span>` : '';
  return L.divIcon({ className: '', html: `<div class="mk-unit-wrap"><img class="mk-vimg ${u.status === 2 ? 'blink' : ''} ${u.facing < 0 ? 'flip' : ''}" src="${vehicleSVG(u.type)}" alt="${VT.short}">${label}</div>`, iconSize: [50, 21], iconAnchor: [25, 11] });
}
const STATUS_SHORT = { 1: 'vrij in post', 2: 'onderweg', 3: 'ter plaatse', 4: 'transport', 5: 'terug naar post' };
function setStatus(u, s) {
  const prev = u.status;
  u.status = s;
  if (prev !== s && S.running) radioStatus(u);
  u.marker.setIcon(unitIcon(u));
  refreshStation(u.station);
  if (s === 1) { if (layers.units.hasLayer(u.marker)) layers.units.removeLayer(u.marker); }
  else if (!layers.units.hasLayer(u.marker)) layers.units.addLayer(u.marker);
  dirty = true;
}
const stationOf = u => u.station;
// In Brussel en Wallonië heet de MUG 'SMUR' en de ziekenwagen 'AMB'
const FR_PROVS = ['bru', 'hen', 'lui', 'nam', 'wbr', 'lux'];
function unitPrefix(type, cityId) {
  const fr = FR_PROVS.includes(CITY_BY_ID[cityId]?.prov);
  if (fr && type === 'MUG') return 'SMUR';
  if (fr && type === 'AMB') return 'AMB';
  return VEHICLE_TYPES[type].short;
}
const grounded = u => VEHICLE_TYPES[u.type].air && (isNight() || !S.weather.fly);
const isFree = u => (u.status === 1 || u.status === 5) && !grounded(u) && !u.offDuty;
const statusCode = u => (u.offDuty || grounded(u)) && u.status === 1 ? '–' : u.status;

// ---------- Echte posten (OpenStreetMap / Overpass) ----------
async function fetchRealPosts(bbox) {
  const key = 'mk112_posts_' + bbox.map(x => x.toFixed(2)).join('_');
  try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 7 * 864e5) return c.d; } catch (e) { /* */ }
  const bb = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
  const q = `[out:json][timeout:25];(nwr["amenity"="fire_station"](${bb});nwr["amenity"="police"](${bb});nwr["amenity"="hospital"]["emergency"="yes"](${bb});nwr["emergency"="ambulance_station"](${bb}););out center tags;`;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
  clearTimeout(to);
  const j = await r.json();
  const d = (j.elements || []).map(e => {
    const t = e.tags || {};
    const kind = t.amenity === 'fire_station' ? 'fire' : t.amenity === 'police' ? 'pol' : t.amenity === 'hospital' ? 'hosp' : 'med';
    return { lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, name: t.name || t['name:nl'] || '', kind };
  }).filter(x => x.lat && x.lng);
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* */ }
  return d;
}
function moveStation(st, lat, lng, name) {
  st.lat = lat; st.lng = lng; st.marker.setLatLng([lat, lng]);
  if (name) st.name = name;
  // MUG/SMUR krijgt de naam van zijn ziekenhuis
  if (name && st.type === 'hosp') {
    const short = name.replace(/^(AZ|UZ|ZNA|GZA|CHU|CHR|H\.?-?Hart|Ziekenhuis|Hôpital|Clinique|Kliniek)\s+/i, '').trim();
    const mugs = S.units.filter(u => u.station === st && u.type === 'MUG');
    mugs.forEach((u, i) => { u.name = `${unitPrefix('MUG', st.cityId)} ${short}${mugs.length > 1 ? ' ' + (i + 1) : ''}`; });
  }
  for (const u of S.units) if (u.station === st && u.status === 1 && !u.move) { u.lat = lat; u.lng = lng; u.marker.setLatLng([lat, lng]); }
}
async function snapStationsToReal() {
  if (!S.cities.length) return 0;
  const lats = S.cities.map(id => CITY_BY_ID[id].lat), lngs = S.cities.map(id => CITY_BY_ID[id].lng);
  const bbox = [Math.min(...lats) - 0.15, Math.min(...lngs) - 0.2, Math.max(...lats) + 0.15, Math.max(...lngs) + 0.2];
  let posts;
  try { posts = await Promise.race([fetchRealPosts(bbox), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 22000))]); }
  catch (e) { log('Echte posten konden niet geladen worden. De posten staan op een geschatte plek.', '#f59e0b'); return 0; }
  let moved = 0;
  for (const kind of ['fire', 'pol', 'hosp', 'med']) {
    const pool = posts.filter(p => p.kind === kind), used = new Set();
    const sts = S.stations.filter(s => s.type === kind && !/^c\d/.test(s.id));
    // eerst de grootste steden, zodat die hun eigen post krijgen
    sts.sort((a, b) => (CITY_BY_ID[b.cityId]?.size || 0) - (CITY_BY_ID[a.cityId]?.size || 0));
    for (const st of sts) {
      const c = CITY_BY_ID[st.cityId]; if (!c) continue;
      let best = -1, bd = kind === 'med' ? 9000 : 12000;
      pool.forEach((p, i) => { if (used.has(i)) return; const d = distM([c.lat, c.lng], [p.lat, p.lng]); if (d < bd) { bd = d; best = i; } });
      if (best < 0) continue;
      used.add(best); const p = pool[best];
      const nm = p.name ? (kind === 'hosp' ? p.name : kind === 'fire' ? (/brandweer|post|kazerne|caserne|pompiers/i.test(p.name) ? p.name : `Brandweerpost ${p.name}`) : kind === 'pol' ? (/politie|police/i.test(p.name) ? p.name : `Politie ${p.name}`) : p.name) : '';
      moveStation(st, p.lat, p.lng, nm); moved++;
    }
  }
  renderAll();
  log(`📍 ${moved} posten staan op hun echte locatie (OpenStreetMap).`, '#22c55e');
  return moved;
}

// ---------- Ziekenhuizen ----------
function hospStatus(h) { return h.load < 0.6 ? 'open' : h.load < 0.9 ? 'druk' : 'volzet'; }
function hospitals() { return S.stations.filter(s => s.type === 'hosp'); }

// ---------- Dekking van benodigde middelen (met vervanging) ----------
function allocate(need, counts) {
  const left = { ...counts }, cov = {};
  for (const [k, n] of Object.entries(need)) { const t = Math.min(n, left[k] || 0); cov[k] = t; left[k] = (left[k] || 0) - t; }
  for (const [k, n] of Object.entries(need)) for (const sub of SUBSTITUTE[k] || []) {
    const t = Math.min(n - cov[k], left[sub] || 0); cov[k] += t; left[sub] = (left[sub] || 0) - t;
  }
  return cov;
}
function incCounts(inc) {
  const scene = {}, all = {};
  for (const u of S.units) if (u.incidentId === inc.id && (u.status === 2 || u.status === 3)) {
    all[u.type] = (all[u.type] || 0) + 1;
    if (u.status === 3) scene[u.type] = (scene[u.type] || 0) + 1;
  }
  return { scene, all };
}
const shownNeed = inc => inc.revealed ? (inc.trueNeed || TYPE_BY_ID[inc.typeId].need) : TYPE_BY_ID[inc.protoId].need;
function incStatus(inc, need = shownNeed(inc)) {
  const { scene, all } = incCounts(inc), cs = allocate(need, scene), ca = allocate(need, all), h = {};
  for (const k of Object.keys(need)) h[k] = { scene: cs[k], way: ca[k] - cs[k] };
  return h;
}
function needsMet(inc) {
  const need = inc.trueNeed || TYPE_BY_ID[inc.typeId].need, h = incStatus(inc, need);
  return Object.entries(need).every(([k, n]) => h[k].scene >= n);
}
function missingList(inc, need) {
  const h = incStatus(inc, need);
  return Object.entries(need).filter(([k, n]) => h[k].scene + h[k].way < n).map(([k, n]) => `${n - h[k].scene - h[k].way}x ${VEHICLE_TYPES[k].short}`);
}
const fitsType = (needKey, unitType) => needKey === unitType || (SUBSTITUTE[needKey] || []).includes(unitType);

// ---------- Oproepen ----------
function hasType(k) { return S.units.some(u => !u.temp && u.type !== 'HELI' && fitsType(k, u.type)); }
function availableTypes() {
  const lv = level();
  return INCIDENT_TYPES.filter(t => (t.minLevel || 0) < lv + 1 && Object.keys(t.need).every(hasType));
}
function currentDate() { const d = new Date(S.baseDate || Date.now()); d.setDate(d.getDate() + Math.floor(totalSec() / 86400)); return d; }
function hourFactor() {
  const h = Math.floor(clockSec() / 3600), wd = currentDate().getDay(), we = wd === 0 || wd === 6 || (wd === 5 && h >= 18);
  if (h < 6) return we ? 0.9 : 0.5;
  if (h < 10) return 1.1;
  if (h < 18) return 1.0;
  return we ? 1.4 : 1.2;
}
// echt adres opzoeken voor een punt op de kaart (OpenStreetMap / Nominatim)
async function reverseGeocode(lat, lng) {
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&zoom=18&addressdetails=1&accept-language=nl`, { signal: ctrl.signal });
    clearTimeout(to);
    const j = await r.json(), a = j.address || {};
    if (a.country_code !== 'be' || !a.road) return null;
    return { lat: +j.lat, lng: +j.lon, road: a.road, house: a.house_number || '', city: a.city || a.town || a.village || a.municipality || '',
      cat: j.category || j.class || '', kind: j.type || '', addresstype: j.addresstype || '', name: j.name || '' };
  } catch (e) { return null; }
}
let geoBusy = Promise.resolve();
function geocodeQueued(lat, lng) { // maximaal één aanvraag per seconde
  const p = geoBusy.then(() => reverseGeocode(lat, lng));
  geoBusy = p.then(() => new Promise(res => setTimeout(res, 1100)));
  return p;
}
const LOC_PHRASE = { werk: 'Ik ben hier op het werk. ', school: 'We zijn op school. ', wzc: 'Ik bel vanuit het woonzorgcentrum. ', sport: 'We zijn op de sportclub. ',
  station: 'Ik sta aan het station. ', winkel: 'Ik ben in de supermarkt. ', cafe: 'Ik zit op café. ', park: 'We zijn in het park. ',
  snelweg: 'Het is op de snelweg. ', kruispunt: 'Het is op het kruispunt. ', parking: 'Het is op de parking. ',
  veld: 'We zijn hier buiten aan een veld, langs de weg. ', straat: 'Het is hier op straat. ', thuis: '' };
// wat is er op deze plek? (op basis van OpenStreetMap)
function locFromGeo(g) {
  const k = g.kind, c = g.cat;
  if (['school', 'kindergarten', 'college', 'university'].includes(k)) return 'school';
  if (['nursing_home', 'social_facility', 'hospital', 'clinic'].includes(k)) return 'wzc';
  if (['supermarket', 'mall', 'department_store', 'convenience'].includes(k) || c === 'shop') return 'winkel';
  if (['pub', 'bar', 'cafe', 'restaurant', 'fast_food'].includes(k)) return 'cafe';
  if (['station', 'halt', 'platform'].includes(k) && (c === 'railway' || c === 'public_transport')) return 'station';
  if (['park', 'garden', 'playground', 'nature_reserve'].includes(k)) return 'park';
  if (['sports_centre', 'pitch', 'stadium', 'swimming_pool', 'fitness_centre'].includes(k)) return 'sport';
  if (['industrial', 'commercial', 'office', 'warehouse', 'factory'].includes(k) || c === 'office' || c === 'craft') return 'werk';
  if (['parking', 'parking_space'].includes(k)) return 'parking';
  if (['motorway', 'trunk', 'motorway_link', 'trunk_link'].includes(k)) return 'snelweg';
  if (['farmland', 'farmyard', 'meadow', 'grass', 'forest', 'wood', 'orchard'].includes(k)) return 'veld';
  if (g.house) return 'thuis';
  return 'straat';
}
async function spawnCall() {
  if (!S.cities.length) return;
  const types = availableTypes(); if (!types.length) return;
  const wt = t => t.weight * (S.weather.boost[t.id] || 1);
  const total = types.reduce((a, t) => a + wt(t), 0);
  let r = Math.random() * total, type = types[0];
  for (const t of types) { r -= wt(t); if (r <= 0) { type = t; break; } }
  const cw = S.cities.map(id => CITY_BY_ID[id].size ** 1.5), cwt = cw.reduce((a, b) => a + b, 0);
  let rc = Math.random() * cwt, city = CITY_BY_ID[S.cities[0]];
  for (let i = 0; i < S.cities.length; i++) { rc -= cw[i]; if (rc <= 0) { city = CITY_BY_ID[S.cities[i]]; break; } }
  const spread = 0.8 + city.size * 0.7;
  let [lat, lng] = offsetKm(city.lat, city.lng, gauss() * spread, gauss() * spread);
  let geo = await geocodeQueued(lat, lng);
  // oproepen van thuis: bij voorkeur een adres met huisnummer
  if (geo && !geo.house && (type.cat === 'med' || type.cat === 'politie') && Math.random() < 0.8) {
    const [la2, ln2] = offsetKm(city.lat, city.lng, gauss() * spread * 0.6, gauss() * spread * 0.6);
    const g2 = await geocodeQueued(la2, ln2); if (g2 && g2.house) geo = g2;
  }
  if (!S.running) return;
  const V = VARIANT_SETS[type.cat], sev = pick(SEVERITIES), pat = pick(V.pat), caller = pick(V.call);
  const loc = geo ? { id: locFromGeo(geo) } : pick(V.loc);
  const truePrio = Math.min(3, Math.max(1, type.prio + sev.delta));
  let addr;
  if (geo) { lat = geo.lat; lng = geo.lng; addr = `${geo.road}${geo.house ? ' ' + geo.house : ''}, ${geo.city || city.name.split(' (')[0]}`; }
  else addr = `${pick(STREETS)} ${Math.floor(rnd(1, 180))}, ${city.name.split(' (')[0]}`;
  const facts = { ...type.facts };
  if (pat.txt) facts.personen = pat.txt;
  if (sev.id === 'ernstig' && facts.bewust === 'ja') facts.bewust = 'half';
  if (sev.id === 'licht' && facts.adem === 'moeilijk') facts.adem = 'ja';
  const call = {
    id: S.nextId++, typeId: type.id, lat, lng, cityId: city.id, created: S.time, answered: false, asked: [], convo: [],
    addr,
    text: `${caller.pre}${LOC_PHRASE[loc.id] || ''}${pick(type.calls)}${sev.add ? ' ' + sev.add : ''}`, fake: Math.random() < 0.06, voiceSeed: Math.floor(Math.random() * 100),
    protoId: '', prio: 0, truePrio, trueNeed: needForVariant(type, truePrio), facts, sev: sev.id,
  };
  if (call.fake) call.text = pick(['Hallo? Ja… euh, sorry, verkeerd nummer.', 'Hihi… *gegiechel op de achtergrond*', 'Is dit de pizzeria? Ik wil iets bestellen.', 'Ik wou gewoon eens testen of dit nummer werkt.']);
  S.calls.push(call);
  beep(950, 0.12, 3);
  dirty = true;
}

let currentCall = null;
function openCall(id) {
  const c = S.calls.find(x => x.id === id); if (!c) return;
  currentCall = c;
  if (!c.answered) {
    c.answered = true; c.answeredAt = S.time; logbook('Nieuwe telefoonoproep.', 'sys');
    addConvo(c, 'me', '112, wat is uw noodgeval?');
    addConvo(c, 'caller', c.text);
    speakCaller(c.text, c.voiceSeed, c.sev);
  }
  $('#callTitle').textContent = `Oproep 112 · regio ${CITY_BY_ID[c.cityId].name}`;
  // protocollen
  const opts = ['<option value="">— kies een protocol —</option>'];
  for (const [cat, label] of Object.entries(CATEGORIES)) {
    opts.push(`<optgroup label="${label}">` + INCIDENT_TYPES.filter(t => t.cat === cat).map(t => `<option value="${t.id}">${protoLabel(t)}</option>`).join('') + '</optgroup>');
  }
  $('#callProto').innerHTML = opts.join('');
  $('#callProto').value = c.protoId;
  renderCall();
  map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  show('#callModal');
}
function addConvo(c, who, text) { c.convo.push({ who, text }); logbook(text, who === 'caller' ? 'caller' : 'me'); }
function renderCall() {
  const c = currentCall; if (!c) return;
  $('#convo').innerHTML = c.convo.map(m => `<div class="msg ${m.who}">${esc(m.text)}</div>`).join('');
  $('#convo').scrollTop = 1e6;
  $('#questions').innerHTML = QUESTIONS.map(q => `<button class="small ${c.asked.includes(q.id) ? 'asked' : ''}" data-q="${q.id}">${q.q}</button>`).join('');
  $('#callAddr').textContent = c.asked.includes('adres') ? (c.fake ? 'onbekend' : c.addr) : '— nog niet gevraagd —';
  $('#callPrio').innerHTML = Object.entries(PRIORITIES).map(([k, p]) =>
    `<button data-prio="${k}" class="${c.prio == k ? 'on' : ''}" style="${c.prio == k ? `background:${p.color};border-color:${p.color}` : `border-color:${p.color}`}" title="${p.desc} · norm ${p.norm} min">${p.name}<br><small>${p.desc}</small></button>`).join('');
  $('#callNeed').innerHTML = c.protoId ? needChips(TYPE_BY_ID[c.protoId].need) : '<span class="muted">Kies eerst een protocol</span>';
  $('#callAccept').disabled = !(c.protoId && c.prio && c.asked.includes('adres'));
  $('#callAccept').title = $('#callAccept').disabled ? 'Vraag het adres en kies protocol en dringendheid' : '';
}
function answerFor(c, qid) {
  const T = TYPE_BY_ID[c.typeId];
  if (c.fake) return pick(['Euh… dat weet ik niet.', 'Waarom wil je dat weten?', 'Hihi, niks aan de hand hoor.', '…']);
  if (qid === 'adres') return `${c.addr}.`;
  if (qid === 'wat') return `${T.calls.find(x => x !== c.text) || c.text}`;
  if (qid === 'personen') return (c.facts || T.facts).personen;
  return ANSWERS[qid][(c.facts || T.facts)[qid]] || 'Dat weet ik niet.';
}
function askQuestion(qid) {
  const c = currentCall; if (!c || c.asked.includes(qid)) return;
  const Q = QUESTIONS.find(q => q.id === qid);
  // in de AI-modus gaat ook een snelle vraag naar de AI-beller
  if (typeof aiReady === 'function' && aiReady()) { c.asked.push(qid); talkToCaller(Q.q); return; }
  c.asked.push(qid);
  addConvo(c, 'me', Q.q);
  const a = answerFor(c, qid);
  addConvo(c, 'caller', a);
  speakCaller(a, c.voiceSeed, c.sev);
  renderCall();
}
function needChips(need, have) {
  return Object.entries(need).map(([k, n]) => {
    let cls = '';
    if (have) { const h = have[k] || { scene: 0, way: 0 }; cls = h.scene >= n ? 'ok' : (h.scene + h.way >= n ? 'way' : 'miss'); }
    const txt = have ? `${(have[k]?.scene || 0)}/${n}` : `${n}x`;
    return `<span class="chip ${cls}" title="${VEHICLE_TYPES[k].name}">${txt} ${VEHICLE_TYPES[k].short}</span>`;
  }).join(' ');
}
function closeCall(c) { logbook('*klik*', 'sys'); S.calls = S.calls.filter(x => x !== c); hide('#callModal'); currentCall = null; stopVoices(); dirty = true; }
function acceptCall() {
  const c = currentCall; if (!c || $('#callAccept').disabled) return;
  closeCall(c);
  if (c.fake) { addXp(-30); S.failed++; log('⚠️ Dat was een valse oproep — onnodig incident aangemaakt (-30 XP).', '#f59e0b'); return; }
  const T = TYPE_BY_ID[c.typeId];
  let bonus = 0;
  if (c.protoId === c.typeId) bonus += 15;
  if (+c.prio === (c.truePrio || T.prio)) bonus += 8;
  bonus += Math.max(0, 6 - c.asked.length); // efficiënt gesprek
  addXp(bonus);
  createIncident(c);
}
function rejectCall() {
  const c = currentCall; if (!c) return;
  closeCall(c);
  if (c.fake) { addXp(20); S.credits += 50; log('👍 Valse oproep correct afgehandeld (+20 XP).', '#22c55e'); }
  else { S.failed++; addXp(-60); log('❌ Echte noodoproep afgewezen! (-60 XP)', '#ef4444'); }
}
function transferCall(c = currentCall) {
  if (!c) return;
  if (c === currentCall) closeCall(c); else { S.calls = S.calls.filter(x => x !== c); dirty = true; }
  S.transfers++; addXp(-15);
  log('↪ Oproep doorgeschakeld naar een buurcentrale (-15 XP).', '#38bdf8');
  save();
}

// ---------- Incidenten ----------
function createIncident(c) {
  const T = TYPE_BY_ID[c.typeId], P = TYPE_BY_ID[c.protoId];
  const trueNeed = c.trueNeed || T.need;
  const nUnits = Object.values(trueNeed).reduce((a, b) => a + b, 0);
  const inc = { no: ++S.incNo, id: c.id, typeId: T.id, protoId: P.id, prio: +c.prio, lat: c.lat, lng: c.lng, addr: c.addr, cityId: c.cityId,
    created: S.time, patience: PRIORITIES[c.truePrio || T.prio].norm * 60 * 2 + nUnits * 60, waited: 0, progress: 0, state: 'open', revealed: c.protoId === c.typeId, arrived: false,
    text: c.text || '', notes: c.notes || '', trueNeed, truePrio: c.truePrio || T.prio };
  { const d = currentDate(); inc.rit = `${String(d.getFullYear()).slice(2)}${p2(d.getMonth() + 1)}${p2(d.getDate())}${String(inc.no).padStart(5, '0')}`; }
  inc.marker = L.marker([inc.lat, inc.lng], {
    icon: L.divIcon({ className: '', html: `<div class="mk mk-inc">${P.icon}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] }),
    zIndexOffset: 1000,
  }).bindTooltip(() => `${TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId].name} · ${esc(inc.addr)}`).addTo(layers.incidents);
  inc.marker.on('click', () => openDispatch(inc.id));
  S.incidents.push(inc);
  logbook(`${incNo(inc)} aangemaakt: ${protoLabel(P)}, ${PRIORITIES[inc.prio].name}, ${inc.addr}`);
  dirty = true;
  if (!c.silent) openDispatch(inc.id);
  return inc;
}
function incNo(inc) { return '#' + String(inc.no).padStart(4, '0'); }
function incName(inc) { const t = TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId]; return `${t.icon} ${t.name}`; }

// ---------- Radio ----------
function radio(from, text, opts = {}) {
  const m = { id: S.nextId++, t: clockLong(), from, text, kind: opts.kind || 'info', open: !!opts.ack || opts.kind === 'transport',
    unitId: opts.unitId, created: S.time, me: !!opts.me };
  S.radio.unshift(m); if (S.radio.length > 120) S.radio.pop();
  if (!m.me) { beep(1400, 0.05, 1, 0.025); speakCrew(`${from}: ${text}`, opts.unitId || 0); }
  dirty = true; radioDirty = true;
  return m;
}
function radioStatus(u) {
  const m = { id: S.nextId++, t: clockLong(), from: u.name, kind: 'status', status: u.status, unitId: u.id, created: S.time, dir: 'in' };
  S.radio.unshift(m); if (S.radio.length > 120) S.radio.pop();
  radioDirty = true;
}
function ackRadio(m, viaVoice) {
  if (!m || !m.open || m.kind !== 'info') return;
  m.open = false; addXp(viaVoice ? 3 : 2); radioDirty = true; dirty = true;
}
function handleVoice(txt) {
  const t = txt.toLowerCase();
  if (!(currentCall && !$('#callModal').classList.contains('hidden'))) radio('Meldkamer', txt, { me: true });
  // tijdens een oproep: vrij praten met de beller
  if (currentCall && !$('#callModal').classList.contains('hidden')) { talkToCaller(txt); return; }
  // transportvraag: ziekenhuis kiezen
  const tr = S.radio.find(m => m.open && m.kind === 'transport');
  if (tr) {
    const h = hospitals().find(h => t.includes(h.name.toLowerCase().replace(/^az /, '').split(' ')[0]));
    if (h) { chooseHospital(tr.unitId, h.id); return; }
  }
  if (/begrepen|ontvangen|ok|oké|akkoord|copy|goed|bevestigd|roger/.test(t)) {
    const open = S.radio.filter(m => m.open && m.kind === 'info');
    if (open.length) ackRadio(open[open.length - 1], true);
  }
}
// push-to-talk via spraakherkenning van de browser
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recActive = false;
function pttStart() {
  if (!SR) { log('🎙️ Spraakherkenning wordt niet ondersteund in deze browser (probeer Chrome of Edge).', '#f59e0b'); return; }
  if (recActive) return;
  try {
    rec = new SR(); rec.lang = 'nl-BE'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = e => { const txt = [...e.results].map(r => r[0].transcript).join(' '); if (txt.trim()) handleVoice(txt.trim()); };
    rec.onend = () => { recActive = false; $('#btnPTT').classList.remove('live'); };
    rec.onerror = () => { recActive = false; $('#btnPTT').classList.remove('live'); };
    rec.start(); recActive = true; $('#btnPTT').classList.add('live'); beep(1200, 0.04, 1, 0.03);
  } catch (e) { recActive = false; }
}
function pttStop() { if (rec && recActive) try { rec.stop(); } catch (e) { /* */ } }

// ---------- Buurcentrales ----------
function myProvinces() { return [...new Set(S.cities.map(id => CITY_BY_ID[id].prov))]; }
function neighborCentrales(provs) {
  const out = [], seen = new Set(), manned = new Set(myProvinces().filter(pid => PROVINCES.find(p => p.id === pid).cities.every(c => S.cities.includes(c.id))));
  for (const pid of provs) {
    for (const adj of PROV_ADJ[pid] || []) {
      if (manned.has(adj) || seen.has(adj)) continue; seen.add(adj);
      const P = PROVINCES.find(p => p.id === adj), c0 = P.cities[0];
      out.push({ id: 'be-' + adj, name: P.centrale + ` (${P.name})`, lat: c0.lat, lng: c0.lng });
    }
    for (const f of FOREIGN_CENTRALES) if (f.provs.includes(pid) && !seen.has(f.id)) { seen.add(f.id); out.push(f); }
  }
  return out;
}
let supInc = null;
function openSupport(inc) {
  if (!inc) { log('Selecteer eerst een inzet in het inzetoverzicht.', '#f59e0b'); return; }
  supInc = inc;
  const prov = CITY_BY_ID[inc.cityId].prov;
  const list = neighborCentrales([prov]).map(nb => ({ nb, d: distM([nb.lat, nb.lng], [inc.lat, inc.lng]) })).sort((a, b) => a.d - b.d);
  $('#supText').innerHTML = `Voor de inzet in <b>${esc(inc.addr)}</b>. Welke centrale wil je bellen?`;
  $('#supList').innerHTML = list.map(({ nb, d }) => `<button class="sup-btn" data-nb="${nb.id}"><span>${esc(nb.name)}</span><small>${Math.round(d / 1000)} km</small></button>`).join('')
    || '<p class="empty">Geen buurcentrale beschikbaar.</p>';
  show('#supportModal');
}
function requestSupport(nbId) {
  const inc = supInc; if (!inc) return;
  const nb = neighborCentrales([CITY_BY_ID[inc.cityId].prov]).find(n => n.id === nbId); if (!nb) return;
  hide('#supportModal'); supInc = null;
  const need = shownNeed(inc), have = incStatus(inc), miss = [];
  for (const [k, n] of Object.entries(need)) for (let i = have[k].scene + have[k].way; i < n; i++) miss.push(k);
  if (!miss.length) { radio(nb.name, `Wij zien dat er voldoende middelen onderweg zijn naar ${inc.addr}. Geen ondersteuning nodig.`); return; }
  const cost = miss.length * NEIGHBOR_PRICE;
  if (S.credits < cost) { log(`💸 Ondersteuning kost €${cost}. Je hebt niet genoeg krediet.`, '#ef4444'); return; }
  S.credits -= cost;
  const [lat, lng] = offsetKm(nb.lat, nb.lng, rnd(-2, 2), rnd(-2, 2));
  const st = { id: 'nb' + S.nextId++, type: 'med', name: nb.name, lat, lng, cityId: inc.cityId, unitCount: {}, virtual: true };
  const names = [];
  for (const k of miss) {
    const u = addUnit(st, k, true); u.name = `${VEHICLE_TYPES[k].short} ${nb.name.split(' (')[0]} ${st.unitCount[k]}`;
    u.lat = lat; u.lng = lng; u.marker.setLatLng([lat, lng]); dispatchUnit(u, inc); names.push(u.name);
  }
  logbook(`${incNo(inc)} ondersteuning door ${nb.name}: ${names.join(', ')}`);
  radio(nb.name, `Ondersteuning bevestigd, we sturen ${names.join(', ')} naar ${inc.addr}.`);
  log(`🤝 ${esc(nb.name)} stuurt ${miss.length} voertuig(en) (-€${cost}).`, '#38bdf8');
}

// ---------- Inzet bewerken / alarmeren ----------
let dispInc = null, dispSel = new Set(), dispProvOnly = false, dispSort = 'eta';
// hoofdprotocol: MED (protocol|prio) gaat voor, dan BRW met gekoppeld type, dan een politieprotocol
function edProtoValue() {
  const med = $('#edMed').value; if (med) return med.split('|')[0];
  const brw = BRW_CODES.find(b => b.code === $('#edBrw').value); if (brw && brw.typeId) return brw.typeId;
  const pol = $('#edPolSel').value; if (TYPE_BY_ID[pol]) return pol;
  return '';
}
function maxMerge(...needs) {
  const out = {};
  for (const n of needs) for (const [k, v] of Object.entries(n || {})) out[k] = Math.max(out[k] || 0, v);
  return out;
}
// extra middelen die de calltaker zelf vraagt via BRW, POLITIE of MEDISCHE BIJSTAND
function extraNeed(inc) {
  const primary = inc.revealed ? inc.typeId : inc.protoId, parts = [];
  const brw = BRW_CODES.find(b => b.code === inc.brw); if (brw && brw.typeId !== primary) parts.push(brw.need);
  const pe = POL_EXTRA.find(p => p.code === inc.pol); if (pe) parts.push(pe.need);
  if (TYPE_BY_ID[inc.pol] && inc.pol !== primary) parts.push(TYPE_BY_ID[inc.pol].need);
  const mb = MED_BIJSTAND.find(m => m.code === inc.medbij); if (mb && mb.need) parts.push(mb.need);
  return maxMerge(...parts);
}
const combinedNeed = inc => maxMerge(shownNeed(inc), extraNeed(inc));
function openDispatch(id) {
  const inc = S.incidents.find(i => i.id === id); if (!inc) return;
  dispInc = inc; dispSel = new Set();
  $('#dispTitle').textContent = inc.addr;
  $('#edPlace').textContent = `${inc.addr} (${PROVINCES.find(p => p.id === CITY_BY_ID[inc.cityId].prov).name})`;
  const cur = inc.revealed ? inc.typeId : inc.protoId, curT = TYPE_BY_ID[cur];
  const medTypes = INCIDENT_TYPES.filter(t => t.cat === 'med' || t.cat === 'verkeer');
  $('#edMed').innerHTML = '<option value=""></option>' + medTypes.map(t => [1, 2, 3].map(p => `<option value="${t.id}|${p}">MED, ${protoLabel(t)}, ${PRIORITIES[p].name}</option>`).join('')).join('');
  $('#edMed').value = medTypes.includes(curT) ? `${cur}|${inc.prio}` : '';
  $('#edBrw').innerHTML = '<option value=""></option>' + BRW_CODES.map(b => `<option value="${b.code}">BRW, ${b.code} ${b.name}</option>`).join('');
  $('#edBrw').value = inc.brw || (curT.cat === 'brand' ? (BRW_CODES.find(b => b.typeId === cur)?.code || '') : '');
  $('#edPolSel').innerHTML = '<option value=""></option>' + POL_EXTRA.map(p => `<option value="${p.code}">${p.name.toUpperCase()}</option>`).join('') +
    INCIDENT_TYPES.filter(t => t.cat === 'politie').map(t => `<option value="${t.id}">POL, ${protoLabel(t)}</option>`).join('');
  $('#edPolSel').value = inc.pol || (curT.cat === 'politie' ? cur : '');
  $('#edMedBij').innerHTML = '<option value=""></option>' + MED_BIJSTAND.map(m => `<option value="${m.code}">${m.name}</option>`).join('');
  $('#edMedBij').value = inc.medbij || '';
  $('#edAbc').innerHTML = '<option value=""></option>' + ABC_CODES.map(c => `<option value="${c}">${c}</option>`).join('');
  $('#edAbc').value = inc.abc || '';
  $('#edNotes').value = inc.notes || '';
  $('#edFire').checked = false; $('#edPol').checked = false;
  renderDispatch();
  show('#dispatchModal');
}
function closeDispatch() { hide('#dispatchModal'); dispInc = null; }
function etaMin(u, d) {
  const t0 = turnoutSec(u) / 60;
  if (VEHICLE_TYPES[u.type].air) return t0 + d / 55 / 60 + 3;
  const dd = d * 1.35, v = dd < 3000 ? 8.5 : dd < 10000 ? 12.5 : 18;
  return t0 + dd / v / VEHICLE_TYPES[u.type].speed / S.weather.speed / 60 / (dispInc && dispInc.prio < 3 ? 1.2 : 1);
}
function dispCandidates() {
  const need = shownNeed(dispInc), only = $('#dispOnlyNeeded').checked, prov = CITY_BY_ID[dispInc.cityId].prov;
  return S.units
    .filter(u => u.incidentId !== dispInc.id && !u.temp && (!only || Object.keys(need).some(k => fitsType(k, u.type))) && (!dispProvOnly || CITY_BY_ID[u.station.cityId]?.prov === prov))
    .map(u => ({ u, d: distM([u.lat, u.lng], [dispInc.lat, dispInc.lng]) }))
    .map(x => ({ ...x, eta: etaMin(x.u, x.d) }))
    .sort((a, b) => dispSort === 'name' ? a.u.name.localeCompare(b.u.name) : (isFree(b.u) - isFree(a.u)) || a.eta - b.eta).slice(0, 80);
}
function renderDispatch() {
  if (!dispInc) return;
  const P = PRIORITIES[dispInc.prio], need = combinedNeed(dispInc), have = incStatus(dispInc, need);
  // geselecteerde voertuigen tellen mee in het voorstel
  const selCounts = {}; for (const id of dispSel) { const u = S.units.find(x => x.id === id); if (u) selCounts[u.type] = (selCounts[u.type] || 0) + 1; }
  const { all } = incCounts(dispInc), tot = { ...all }; for (const [k, n] of Object.entries(selCounts)) tot[k] = (tot[k] || 0) + n;
  const cov = allocate(need, tot), miss = Object.entries(need).filter(([k, n]) => cov[k] < n).map(([k, n]) => `${n - cov[k]}x ${VEHICLE_TYPES[k].short}`);
  $('#dispNeed').className = 'proposal' + (miss.length ? '' : ' ok');
  $('#dispNeed').innerHTML = `<b>Inzetvoorstel ${P.name}:</b> <span class="${miss.length ? 'norm-bad' : 'muted'}">${miss.length ? `nog nodig: ${miss.join(', ')}` : 'voldoende middelen toegewezen'}</span>`;
  $('#edPrio').innerHTML = Object.entries(PRIORITIES).map(([k, p]) =>
    `<button data-prio="${k}" class="${dispInc.prio == k ? 'on' : ''}" style="${dispInc.prio == k ? `background:${p.color};border-color:${p.color}` : `border-color:${p.color}`}">${p.name}</button>`).join('');
  $('#fltAll').classList.toggle('on', !dispProvOnly); $('#fltProv').classList.toggle('on', dispProvOnly);
  $('#sortEta').classList.toggle('on', dispSort === 'eta'); $('#sortName').classList.toggle('on', dispSort === 'name');
  const assigned = S.units.filter(u => u.incidentId === dispInc.id);
  const row = (u, d, eta, cls) => {
    const VT = VEHICLE_TYPES[u.type];
    return `<div class="unit-row ${cls}" data-id="${u.id}">
      <span class="uname2"><span class="ubtn">${esc(u.name)} <small class="team">(${u.team})</small> <span class="st st${grounded(u) && u.status === 1 ? 'x' : u.status}">${statusCode(u)}</span></span></span>
      <span class="utype">${VT.short}</span>
      <span class="${eta <= P.norm ? 'norm-ok' : 'norm-bad'}">${Math.round(eta)} min</span>
      <span class="km">${(d / 1000).toFixed(1)} km</span>
      <span class="km">${clockStr(u.shiftEnd)}</span></div>`;
  };
  const html = assigned.map(u => { const d = distM([u.lat, u.lng], [dispInc.lat, dispInc.lng]); return row(u, d, etaMin(u, d), 'assigned'); }).join('') +
    dispCandidates().map(({ u, d, eta }) => row(u, d, eta, isFree(u) ? (dispSel.has(u.id) ? 'sel' : '') : 'busy')).join('');
  $('#dispUnits').innerHTML = html || '<p class="empty">Geen voertuigen. Vraag ondersteuning aan een buurcentrale.</p>';
  $('#dispCount').textContent = dispSel.size;
  $('#dispSend').disabled = !dispSel.size;
}
function nearestFree(type, exclude) {
  return S.units.filter(u => isFree(u) && !u.temp && fitsType(type, u.type) && !exclude.has(u.id) && (!dispProvOnly || CITY_BY_ID[u.station.cityId]?.prov === CITY_BY_ID[dispInc.cityId].prov))
    .map(u => ({ u, e: etaMin(u, distM([u.lat, u.lng], [dispInc.lat, dispInc.lng])) }))
    .sort((a, b) => (a.u.type === type ? 0 : 1) - (b.u.type === type ? 0 : 1) || a.e - b.e)[0]?.u;
}
function autoSuggest() {
  const need = combinedNeed(dispInc), have = incStatus(dispInc, need);
  dispSel = new Set();
  for (const [k, n] of Object.entries(need)) for (let i = have[k].scene + have[k].way; i < n; i++) { const u = nearestFree(k, dispSel); if (u) dispSel.add(u.id); }
  renderDispatch();
}
function quickAdd(type) { const u = nearestFree(type, dispSel); if (u) { dispSel.add(u.id); renderDispatch(); } else log(`Geen ${VEHICLE_TYPES[type].name.toLowerCase()} beschikbaar.`, '#f59e0b'); }
function saveDispatchEdits() {
  const inc = dispInc; if (!inc) return;
  inc.notes = $('#edNotes').value.trim();
  inc.brw = $('#edBrw').value; inc.pol = $('#edPolSel').value; inc.medbij = $('#edMedBij').value; inc.abc = $('#edAbc').value;
  const medv = $('#edMed').value; if (medv) inc.prio = +medv.split('|')[1];
  const proto = edProtoValue();
  if (proto && proto !== (inc.revealed ? inc.typeId : inc.protoId)) {
    inc.protoId = proto;
    if (!inc.arrived) inc.revealed = proto === inc.typeId;
    const el = inc.marker.getElement()?.querySelector('.mk'); if (el) el.textContent = TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId].icon;
    logbook(`${incNo(inc)} protocol gewijzigd naar ${TYPE_BY_ID[proto].name}`);
  }
  dirty = true;
}
function sendSelected(withSupport) {
  const inc = dispInc; if (!inc) return;
  saveDispatchEdits();
  const ids = [...dispSel]; closeDispatch();
  const sent = [];
  for (const id of ids) {
    const u = S.units.find(x => x.id === id);
    if (!u || !isFree(u)) continue;
    dispatchUnit(u, inc); sent.push(u.name);
  }
  if (sent.length) {
    beep(600, 0.1, 1);
    logbook(`${incNo(inc)} gealarmeerd: ${sent.join(', ')}`);
    radio('Meldkamer', `${sent.join(', ')}: rij uit naar ${inc.addr}, ${protoLabel(TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId])}, ${PRIORITIES[inc.prio].name}${inc.abc ? ', ' + inc.abc : ''}.`, { me: true });
  }
  if (withSupport === true) openSupport(inc);
}
function cancelIncident(inc) {
  if (!inc) return;
  const anyArrived = S.units.some(u => u.incidentId === inc.id && u.status === 3);
  S.units.filter(u => u.incidentId === inc.id).forEach(u => { returnToStation(u); });
  if (inc.typeId) { S.failed++; addXp(anyArrived ? -20 : -30); }
  logbook(`${incNo(inc)} geannuleerd`);
  log(`🚫 ${incNo(inc)} geannuleerd. Alle voertuigen keren terug.`, '#f59e0b');
  if (S.expanded === inc.id) S.expanded = null;
  removeIncident(inc);
}
function dispatchUnit(u, inc) {
  u.incidentId = inc.id; setStatus(u, 2); u.move = null;
  driveTo(u, [inc.lat, inc.lng], inc.prio < 3 ? 1.2 : 1, () => { if (u.incidentId === inc.id) arriveOnScene(u, inc); }, turnoutSec(u));
}
async function driveTo(u, dest, urgent, onArrive, turnout = 0) {
  const token = (u.moveToken = (u.moveToken || 0) + 1);
  const air = VEHICLE_TYPES[u.type].air;
  const r = air ? { pts: [[u.lat, u.lng], dest], dur: distM([u.lat, u.lng], dest) / 55 + 180 } : await getRoute([u.lat, u.lng], dest);
  if (u.moveToken !== token) return;
  const dur = Math.max(4, air ? r.dur / DRIVE_COMPRESS : r.dur / VEHICLE_TYPES[u.type].speed / S.weather.speed / DRIVE_COMPRESS / urgent);
  const cum = prepRoute(r.pts);
  u.move = { pts: r.pts, cum, tcum: timeProfile(r.pts, cum), dur, t: -turnout, onArrive };
  if (u.line) layers.routes.removeLayer(u.line);
  u.line = L.polyline(r.pts, { color: VEHICLE_TYPES[u.type].color, weight: 3, opacity: 0.55, dashArray: urgent > 1 ? null : '4 6' }).addTo(layers.routes);
}
function arriveOnScene(u, inc) {
  setStatus(u, 3);
  let text = `ter plaatse ${inc.addr.split(',')[0]}.`;
  if (!inc.arrived) {
    inc.arrived = true;
    const T = TYPE_BY_ID[inc.typeId], mins = realMin(S.time - inc.created), norm = PRIORITIES[inc.truePrio || T.prio].norm;
    S.normTotal++; if (mins <= norm) S.normHit++; else log(`⏱️ Aanrijnorm overschreden: ${Math.round(mins)} min (norm ${norm} min)`, '#f59e0b');
    if (!inc.revealed) {
      inc.revealed = true;
      const P = inc.marker.getElement()?.querySelector('.mk'); if (P) P.textContent = T.icon;
      text += ` De situatie blijkt een ${T.name.toLowerCase()} te zijn.`;
      addXp(-10);
    }
    const miss = missingList(inc, inc.trueNeed || T.need);
    if (miss.length) text += ` Vragen bijkomend: ${miss.join(', ')}.`;
    else text += ' Middelen volstaan, we starten de interventie.';
  }
  radio(u.name, text, { ack: true, unitId: u.id });
}
function returnToStation(u) {
  u.incidentId = null; setStatus(u, 5);
  const st = stationOf(u);
  driveTo(u, [st.lat, st.lng], 1, () => {
    if (u.temp) { removeUnit(u); return; }
    setStatus(u, 1);
  });
}
function removeUnit(u) {
  layers.units.removeLayer(u.marker); if (u.line) layers.routes.removeLayer(u.line);
  S.units = S.units.filter(x => x !== u); dirty = true;
}

// ---------- Afvoer ----------
function requestTransport(u, inc) {
  const T = TYPE_BY_ID[inc.typeId];
  u.incidentId = null; u.awaitHosp = { since: S.time, typeId: T.id };
  const spec = SPEC_NEED[T.id];
  radio(u.name, `patiënt geladen (${T.name.toLowerCase()})${spec ? `, ${SPEC_TXT[spec].split(' ').slice(1).join(' ').toLowerCase()} gewenst` : ''}. Naar welk ziekenhuis?`, { kind: 'transport', unitId: u.id });
}
let hospUnit = null;
function openHospital(unitId) {
  const u = S.units.find(x => x.id === unitId); if (!u || !u.awaitHosp) return;
  hospUnit = u;
  const T = TYPE_BY_ID[u.awaitHosp.typeId], spec = SPEC_NEED[T.id];
  $('#hospTitle').textContent = u.name;
  $('#hospInfo').textContent = `Patiënt: ${T.name}.${spec ? ` Vereist: ${SPEC_TXT[spec]}.` : ''} Kies het ziekenhuis.`;
  const list = hospitals().map(h => ({ h, d: distM([u.lat, u.lng], [h.lat, h.lng]) })).sort((a, b) => a.d - b.d).slice(0, 8);
  $('#hospList').innerHTML = list.map(({ h, d }) => `<div class="card hosp-row" data-hosp="${h.id}">
      <span><b>${esc(h.name)}</b><br><small class="muted">${h.specs.map(s => SPEC_TXT[s]).join(' · ') || 'Basis spoed'}</small></span>
      <span class="hstat ${hospStatus(h)}">${hospStatus(h)}</span>
      <span>${(d / 1000).toFixed(1)} km</span></div>`).join('') || '<p class="empty">Geen ziekenhuizen in de regio.</p>';
  show('#hospModal');
}
function chooseHospital(unitId, hospId, auto) {
  const u = S.units.find(x => x.id === unitId), h = S.stations.find(s => s.id === hospId);
  if (!u || !u.awaitHosp || !h) return;
  const T = TYPE_BY_ID[u.awaitHosp.typeId], spec = SPEC_NEED[T.id], st = hospStatus(h);
  let xp = auto ? -10 : 5;
  if (spec) xp += h.specs.includes(spec) ? 15 : -20;
  if (st === 'volzet') { xp -= 30; log(`🏥 ${esc(h.name)} is volzet — de ploeg verliest tijd.`, '#ef4444'); }
  addXp(xp);
  u.awaitHosp = null; h.load = Math.min(1, h.load + 0.08);
  const tr = S.radio.find(m => m.kind === 'transport' && m.unitId === u.id && m.open); if (tr) { tr.open = false; tr.text += ` → ${h.name}`; }
  radio('Meldkamer', `${u.name}, begrepen, vervoer naar ${h.name}.`, { me: true });
  hide('#hospModal'); hospUnit = null;
  setStatus(u, 4);
  driveTo(u, [h.lat, h.lng], 1.1, () => {
    u.waitUntil = S.time + HOSPITAL_TIME * (st === 'volzet' ? 2.5 : 1); u.atHospital = h;
    radio(u.name, `aangekomen in ${h.name}, patiënt overgedragen aan spoed.`, { unitId: u.id });
  });
  radioDirty = true;
}
function bestHospital(u, typeId) {
  const spec = SPEC_NEED[typeId];
  return hospitals().map(h => ({ h, score: distM([u.lat, u.lng], [h.lat, h.lng]) * (hospStatus(h) === 'volzet' ? 4 : 1) * (spec && !h.specs.includes(spec) ? 3 : 1) }))
    .sort((a, b) => a.score - b.score)[0]?.h;
}

// ---------- Afronden ----------
function completeIncident(inc) {
  const T = TYPE_BY_ID[inc.typeId];
  const onScene = S.units.filter(u => u.incidentId === inc.id);
  const speedBonus = Math.max(0, 1 - inc.waited / inc.patience);
  const reward = Math.round(T.reward * (0.7 + 0.6 * speedBonus));
  S.credits += reward; addXp(Math.round(T.reward / 10)); S.done++;
  log(`✅ ${incNo(inc)} <b>${T.name}</b> afgehandeld (+€${reward})`, '#22c55e');
  let transported = false;
  for (const u of onScene) {
    if (u.status === 3 && T.transport && !transported && u.type === 'AMB') {
      transported = true;
      if (hospitals().length) { requestTransport(u, inc); continue; }
    }
    returnToStation(u);
    if (u.status === 5 && !u.temp && Math.random() < 0.5) radio(u.name, 'interventie beëindigd, we keren terug en zijn vrij.', { unitId: u.id, ack: true });
  }
  removeIncident(inc);
}
function failIncident(inc) {
  const T = TYPE_BY_ID[inc.typeId];
  S.failed++; addXp(-50); S.credits = Math.max(0, S.credits - Math.round(T.reward / 3));
  log(`❌ ${incNo(inc)} <b>${T.name}</b> in ${esc(CITY_BY_ID[inc.cityId].name)} liep uit de hand — te laat!`, '#ef4444');
  S.units.filter(u => u.incidentId === inc.id).forEach(returnToStation);
  removeIncident(inc);
}
function removeIncident(inc) {
  layers.incidents.removeLayer(inc.marker);
  S.incidents = S.incidents.filter(i => i !== inc);
  if (dispInc === inc) { hide('#dispatchModal'); dispInc = null; }
  save(); dirty = true;
}

// ---------- Hoofdlus ----------
let dirty = true, radioDirty = true, logDirty = true, last = performance.now(), uiTimer = 0;
function tick(now) {
  const realDt = Math.min(0.5, (now - last) / 1000); last = now;
  const dt = realDt * S.speed;
  if (S.running && dt > 0) {
    S.time += dt;
    if (S.time >= S.nextSpawn) {
      const cap = 2 + level() + Math.floor(Math.sqrt(S.cities.length) / 2);
      if (S.calls.length + S.incidents.length < cap) spawnCall();
      const base = 200 / (1 + 0.12 * S.cities.length) / (1 + level() * 0.05) / hourFactor();
      S.nextSpawn = S.time + Math.max(40, base * rnd(0.5, 1.5));
    }
    if (S.time >= S.nextWeather) setWeather();
    // ziekenhuisbezetting schommelt
    if (S.time >= S.nextHospTick) {
      S.nextHospTick = S.time + 30;
      for (const h of hospitals()) h.load = Math.min(1, Math.max(0.05, h.load + rnd(-0.12, 0.1)));
      if ($('#tab-stations').classList.contains('active')) renderHospitals();
    }
    for (const c of [...S.calls]) if (!c.answered && S.time - c.created > CALL_TIMEOUT) {
      S.calls = S.calls.filter(x => x !== c);
      if (!c.fake) { S.failed++; addXp(-40); log('📵 Een beller hing op — de oproep werd niet tijdig opgenomen.', '#ef4444'); }
      dirty = true;
    }
    for (const u of [...S.units]) {
      if (u.move) {
        u.move.t += dt;
        const f = Math.min(1, Math.max(0, u.move.t / u.move.dur));
        const p = posAtTime(u.move, f); u.lat = p[0]; u.lng = p[1]; u.marker.setLatLng([p[0], p[1]]);
        if (u.move.t > 0) setFacing(u, p[2]);
        if (f >= 1) {
          const cb = u.move.onArrive; u.move = null;
          if (u.line) { layers.routes.removeLayer(u.line); u.line = null; }
          cb && cb();
        }
      } else if (u.atHospital && S.time >= u.waitUntil) {
        u.atHospital = null; returnToStation(u);
      } else if (u.awaitHosp && S.time - u.awaitHosp.since > TRANSPORT_DECIDE) {
        const h = bestHospital(u, u.awaitHosp.typeId);
        log(`🏥 ${esc(u.name)} wachtte te lang en koos zelf ${esc(h.name)} (-10 XP)`, '#f59e0b');
        chooseHospital(u.id, h.id, true);
      }
    }
    for (const m of S.radio) if (m.open && m.kind === 'info' && S.time - m.created > 90) { m.open = false; radioDirty = true; }
    for (const inc of [...S.incidents]) {
      const T = TYPE_BY_ID[inc.typeId];
      const anyOnScene = S.units.some(u => u.incidentId === inc.id && u.status === 3);
      if (needsMet(inc)) {
        if (inc.state !== 'working') { inc.state = 'working'; inc.marker.getElement()?.querySelector('.mk')?.classList.add('working'); }
        inc.progress += dt;
        if (inc.progress >= sceneDur(inc)) { completeIncident(inc); continue; }
      } else {
        if (inc.state === 'working') { inc.state = 'open'; inc.marker.getElement()?.querySelector('.mk')?.classList.remove('working'); }
        inc.waited += anyOnScene ? dt * 0.35 : dt;
        if (inc.waited >= inc.patience) { failIncident(inc); continue; }
      }
    }
  }
  uiTimer += realDt;
  if (uiTimer > 0.5 || dirty) { uiTimer = 0; renderUI(); dirty = false; }
  requestAnimationFrame(tick);
}

function setWeather(initial) {
  const prev = S.weather, tot = WEATHER.reduce((a, w) => a + w.w, 0);
  let r = Math.random() * tot; for (const w of WEATHER) { r -= w.w; if (r <= 0) { S.weather = w; break; } }
  S.nextWeather = S.time + rnd(1.5, 3.5) * 3600 / DRIVE_COMPRESS;
  if (!initial && prev !== S.weather) {
    log(`${S.weather.icon} Weerbericht: ${S.weather.name.toLowerCase()}${S.weather.speed < 1 ? ' — langere rijtijden' : ''}${!S.weather.fly ? ', helikopters aan de grond' : ''}.`, '#38bdf8');
  }
  S.temp = Math.round(rnd(-2, 22) - (S.weather.id === 'ijzel' ? 6 : 0));
}

// ---------- Overdracht vorige ploeg ----------
async function shiftHandover() {
  const types = availableTypes().filter(t => t.prio > 1 || t.cat === 'med');
  const n = Math.min(3, 1 + Math.floor(Math.random() * 3));
  let made = 0;
  for (let i = 0; i < n && types.length; i++) {
    const T = pick(types), cid = pick(S.cities), c = CITY_BY_ID[cid];
    let [lat, lng] = offsetKm(c.lat, c.lng, gauss() * c.size, gauss() * c.size);
    const geo = await geocodeQueued(lat, lng);
    let addr = `${pick(STREETS)} ${Math.floor(rnd(1, 180))}, ${c.name.split(' (')[0]}`;
    if (geo) { lat = geo.lat; lng = geo.lng; addr = `${geo.road}${geo.house ? ' ' + geo.house : ''}, ${geo.city || c.name.split(' (')[0]}`; }
    const inc = createIncident({ id: S.nextId++, typeId: T.id, protoId: T.id, prio: T.prio, lat, lng, cityId: cid, silent: true,
      addr, text: pick(T.calls), notes: 'Overgenomen van de vorige ploeg.' });
    inc.created -= rnd(180, 600);
    dispInc = inc; autoSuggest();
    for (const id of dispSel) { const u = S.units.find(x => x.id === id); if (u) dispatchUnit(u, inc); }
    dispInc = null; dispSel = new Set(); made++;
  }
  logbook(`Overdracht van de vorige ploeg: ${made} lopende ${made === 1 ? 'inzet' : 'inzetten'}.`);
  radio('Meldkamer', `Overdracht ontvangen: ${made} lopende ${made === 1 ? 'inzet' : 'inzetten'}.`, { me: true });
}

// ---------- UI ----------
function renderUI() {
  $('#clock').textContent = clockLong();
  $('#dateInfo').textContent = `${dateStr()} · ${S.weather.icon} ${S.weather.name}, ${S.temp ?? 10} °C · ${isNight() ? 'nacht' : 'dag'}`;
  if (logDirty) renderLogbook();
  $('#credits').textContent = '€' + S.credits.toLocaleString('nl-BE');
  $('#level').textContent = level(); $('#xp').textContent = S.xp;
  $('#done').textContent = S.done; $('#failed').textContent = S.failed;
  $('#normPct').textContent = S.normTotal ? Math.round(S.normHit / S.normTotal * 100) + '%' : '-';
  $('#playerName').textContent = S.player || 'Dispatcher';
  $('#incCount').textContent = S.incidents.length; $('#unitCount').textContent = S.units.length;
  const n = S.calls.filter(c => !c.answered).length;
  $('#callBadge').textContent = n; $('#callBadge').classList.toggle('hidden', !n);
  const ro = S.radio.filter(m => m.open).length;
  $('#radioBadge').textContent = ro; $('#radioBadge').classList.toggle('hidden', !ro);
  $('#btnNextCall').textContent = `Nieuwe oproep (${n})`;
  $('#btnNextCall').disabled = !n; $('#btnNextCall').classList.toggle('ringing', n > 0);
  $('#incomingList').innerHTML = S.calls.filter(c => c.answered).map(c =>
    `<button class="btn small inprog" data-call="${c.id}">In gesprek ${fmtTime(S.time - c.answeredAt)}</button>`).join('');
  $('#incidentList').innerHTML = S.incidents.length ? S.incidents.map(inc => {
    const T = TYPE_BY_ID[inc.typeId], P = PRIORITIES[inc.prio], shown = TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId];
    const pct = inc.state === 'working' ? inc.progress / sceneDur(inc) * 100 : 0;
    const pat = Math.max(0, 1 - inc.waited / inc.patience) * 100;
    const mins = realMin(S.time - inc.created);
    const us = S.units.filter(u => u.incidentId === inc.id);
    const open = S.expanded === inc.id;
    const chipsU = us.map(u => `<span class="uchip"><span class="st st${u.status}">${u.status}</span> ${esc(u.name)}</span>`).join('');
    return `<div class="card ${open ? 'open' : ''}" data-inc="${inc.id}"><div class="row"><span class="inc-no">${incNo(inc)}</span><span class="inc-time">${fmtTime(mins * 60)}</span></div>
      <div class="title">${protoLabel(shown)}, <span style="color:${P.color}">${P.name}</span></div>
      <div class="sub">${esc(inc.addr)} ${inc.arrived ? '' : `· <span class="${mins <= P.norm ? 'norm-ok' : 'norm-bad'}">${Math.floor(mins)}/${P.norm} min</span>`}</div>
      <div class="chips">${chipsU || '<span class="chip miss">geen voertuigen</span>'}</div>
      ${open ? `<div class="acts">
          <button class="btn small" data-act="edit">Inzet bewerken</button>
          <button class="btn small" data-act="map">Toon op kaart</button>
          <button class="btn small" data-act="support">Ondersteuning aanvragen</button>
          <button class="btn small danger" data-act="cancel">Inzet annuleren</button></div>
        <dl class="dl">
          <dt>Ritnummer</dt><dd>${inc.rit}</dd>
          <dt>Inzetplaats</dt><dd>${esc(inc.addr)}</dd>
          <dt>Protocol</dt><dd>${protoLabel(shown)}, ${P.name}</dd>
          <dt>Nodig</dt><dd>${needChips(shownNeed(inc), incStatus(inc))}</dd>
          ${inc.brw ? `<dt>BRW</dt><dd>${esc(inc.brw + ' ' + (BRW_CODES.find(b => b.code === inc.brw)?.name || ''))}</dd>` : ''}
          ${inc.pol ? `<dt>Politie</dt><dd>${esc(POL_EXTRA.find(p => p.code === inc.pol)?.name || (TYPE_BY_ID[inc.pol] ? protoLabel(TYPE_BY_ID[inc.pol]) : ''))}</dd>` : ''}
          ${inc.medbij ? `<dt>Med. bijstand</dt><dd>${esc(MED_BIJSTAND.find(m => m.code === inc.medbij)?.name || '')}</dd>` : ''}
          ${inc.abc ? `<dt>Tekst middel</dt><dd>${esc(inc.abc)}</dd>` : ''}
          <dt>Notities</dt><dd>${esc(inc.notes || '—')}</dd>
          <dt>Melding</dt><dd class="quote">${esc(inc.text || '—')}</dd>
        </dl>` : ''}
      ${inc.state === 'working' ? `<div class="bar"><div style="width:${pct}%"></div></div>` : `<div class="bar timer" title="Resterende tijd"><div style="width:${pat}%;background:${pat < 30 ? '#ef4444' : ''}"></div></div>`}
    </div>`;
  }).join('') : '<p class="empty">Geen lopende inzetten.</p>';
  if (radioDirty) renderRadio();
  if ($('#tab-units').classList.contains('active')) renderUnits();

}
function renderRadio() {
  radioDirty = false;
  const showStatus = $('#radioStatusRows').checked;
  $('#radioList').innerHTML = S.radio.length ? S.radio.filter(m => showStatus || m.kind !== 'status').slice(0, 90).map(m => {
    if (m.kind === 'status') {
      return `<div class="rrow"><span class="t">${m.t}</span><span class="dir">↓</span><span class="rbody"><a href="#" data-unitsel="${m.unitId}">${esc(m.from)}</a> : <span class="st st${m.status}">${m.status}</span> <small>${STATUS_SHORT[m.status]}</small></span></div>`;
    }
    let acts = '';
    if (m.open && m.kind === 'info') acts = `<div class="acts"><button class="small" data-ack="${m.id}">✔ Begrepen</button></div>`;
    if (m.open && m.kind === 'transport') {
      const u = S.units.find(x => x.id === m.unitId);
      const near = u ? hospitals().map(h => ({ h, d: distM([u.lat, u.lng], [h.lat, h.lng]) })).sort((a, b) => a.d - b.d).slice(0, 2) : [];
      acts = `<div class="acts">${near.map(({ h }) => `<button class="small" data-hospq="${m.unitId}|${h.id}">${esc(h.name)} <span class="hstat ${hospStatus(h)}">${hospStatus(h)}</span></button>`).join('')}
        <button class="small primary" data-hospopen="${m.unitId}">Kies ziekenhuis…</button></div>`;
    }
    if (m.me) return `<div class="rrow out"><span class="t">${m.t}</span><span class="dir">↑</span><span class="rbody"><i>${esc(m.text)}</i></span></div>`;
    const from = m.unitId ? `<a href="#" data-unitsel="${m.unitId}">${esc(m.from)}</a>` : `<b>${esc(m.from)}</b>`;
    return `<div class="rrow ${m.open ? 'open' : ''}"><span class="t">${m.t}</span><span class="dir">↓</span><span class="rbody">${from}: ${esc(m.text)}${acts}</span></div>`;
  }).join('') : '<p class="empty">Nog geen radioverkeer.</p>';
}
const STATUS_TXT = { 1: 'Beschikbaar in post', 2: 'Onderweg (prio)', 3: 'Ter plaatse', 4: 'Patiënttransport', 5: 'Terug naar post' };
function renderUnits() {
  const fc = $('#unitFilterCity').value, fs = $('#unitFilterStatus').value, ft = $('#unitFilterType').value, q = $('#unitSearch').value.trim().toLowerCase();
  const list = S.units.filter(u => (!fc || stationOf(u)?.cityId === fc) && (!fs || u.status == fs) && (!ft || u.type === ft) && (!q || u.name.toLowerCase().includes(q)))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  $('#unitList').innerHTML = list.slice(0, 300).map(u => {
    const VT = VEHICLE_TYPES[u.type];
    return `<div class="urow ${S.selUnit === u.id ? 'sel' : ''}" data-unit="${u.id}" title="${esc(VT.name)}"><span class="st st${(u.offDuty || grounded(u)) && u.status === 1 ? 'x' : u.status}">${statusCode(u)}</span><img class="uimg" src="${vehicleSVG(u.type)}" alt=""><span class="uname">${esc(u.name)}</span>
      <span class="usub">${u.awaitHosp ? 'Wacht op ziekenhuiskeuze' : grounded(u) && u.status === 1 ? 'Niet inzetbaar (nacht/weer)' : STATUS_TXT[u.status]} · ${esc(stationOf(u)?.name || '')}</span></div>`;
  }).join('') + (list.length > 300 ? `<p class="empty">… en nog ${list.length - 300} voertuigen (gebruik de filter)</p>` : '') || '<p class="empty">Geen voertuigen.</p>';
  renderUnitDetail();
}
function renderUnitDetail() {
  const u = S.units.find(x => x.id === S.selUnit);
  if (!u) { $('#unitDetail').innerHTML = '<p class="muted small">Klik op een voertuig voor details. Dubbelklik toont het op de kaart.</p>'; return; }
  if ($('#unitDetail').contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;
  const VT = VEHICLE_TYPES[u.type], inc = S.incidents.find(i => i.id === u.incidentId), st = stationOf(u);
  const prov = st && CITY_BY_ID[st.cityId] ? PROVINCES.find(p => p.id === CITY_BY_ID[st.cityId].prov).name : '';
  const code = u.offDuty ? 'off' : String(u.status);
  $('#unitDetail').innerHTML = `<b class="ud-name">${esc(u.name)}</b>
    <div class="ud-row">${esc(VT.name)} · Post: ${esc(st?.name || '-')}${prov ? ` (${prov})` : ''}</div>
    <div class="ud-row">Status: <select id="udStatus">
      ${[1, 2, 3, 4, 5].map(s => `<option value="${s}" ${code === String(s) ? 'selected' : ''} ${s === 1 || s === u.status ? '' : 'disabled'}>${s} · ${STATUS_TXT[s]}</option>`).join('')}
      <option value="off" ${code === 'off' ? 'selected' : ''} ${u.status === 1 ? '' : 'disabled'}>– · Buiten dienst</option></select></div>
    ${grounded(u) ? '<div class="ud-row norm-bad">Niet inzetbaar: nacht of slecht weer</div>' : ''}
    <div class="ud-row">Inzet: ${inc ? `<a href="#" data-incsel="${inc.id}">${esc(inc.addr)}</a>` : '—'}</div>
    <div class="ud-acts"><button class="btn small" id="udMap">Toon op kaart</button>
      ${inc ? '<button class="btn small danger" id="udCancel">Rit annuleren</button>' : ''}</div>`;
}
function renderLogbook() {
  logDirty = false;
  $('#logbook').innerHTML = S.logbook.length ? S.logbook.slice(0, 80).map(l => `<div class="lb lb-${l.kind || 'x'}"><span class="t">${l.t}</span><span>${esc(l.text)}</span></div>`).join('') : '<p class="empty">Nog niets gelogd.</p>';
}
function renderHospitals() {
  $('#hospitalList').innerHTML = hospitals().map(h => `<div class="card hosp-row" data-st="${h.id}"><span><b>${esc(h.name)}</b><br><small class="muted">${h.specs.map(s => SPEC_TXT[s]).join(' · ') || 'Basis spoed'}</small></span>
    <span class="hstat ${hospStatus(h)}">${hospStatus(h)}</span><span class="sub">${Math.round(h.load * 100)}%</span></div>`).join('');
}
function renderStations() {
  renderHospitals();
  $('#stationList').innerHTML = S.stations.map(st => {
    const T = STATION_TYPES[st.type];
    const units = S.units.filter(u => u.stationId === st.id);
    const counts = {}; units.forEach(u => counts[u.type] = (counts[u.type] || 0) + 1);
    return `<div class="card" id="st-${st.id}" data-st="${st.id}"><div class="row"><span class="title">${T.icon} ${esc(st.name)}</span><span class="sub">${units.length} voertuigen</span></div>
      <div class="chips">${Object.entries(counts).map(([k, n]) => `<span class="chip">${n}x ${VEHICLE_TYPES[k].short}</span>`).join('')}</div>
      <div class="chips">${T.allowed.map(k => `<button class="small" data-buy="${st.id}|${k}" title="${VEHICLE_TYPES[k].name}">+ ${VEHICLE_TYPES[k].short} €${VEHICLE_TYPES[k].price}</button>`).join('')}</div></div>`;
  }).join('');
}
function renderAll() {
  $('#regionName').textContent = regionLabel();
  $('#unitFilterCity').innerHTML = '<option value="">Alle steden</option>' + S.cities.map(id => `<option value="${id}">${esc(CITY_BY_ID[id].name)}</option>`).join('');
  renderStations(); renderUnits(); radioDirty = true; dirty = true;
}
function regionLabel(cities = S.cities) {
  const n = cities.length, all = Object.keys(CITY_BY_ID).length;
  if (n === all) return 'Heel België';
  if (n === 1) return CITY_BY_ID[cities[0]].name;
  const full = PROVINCES.filter(p => p.cities.every(c => cities.includes(c.id)));
  const fullIds = new Set(full.flatMap(p => p.cities.map(c => c.id)));
  const parts = [...full.map(p => p.centrale), ...cities.filter(id => !fullIds.has(id)).map(id => CITY_BY_ID[id].name)];
  return parts.length <= 3 ? parts.join(', ') : `${n} steden`;
}
function switchTab(t) {
  $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $$('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + t));
  if (t === 'units') renderUnits();
  if (t === 'stations') renderStations();
}
function show(s) { $(s).classList.remove('hidden'); }
function hide(s) { $(s).classList.add('hidden'); }

// ---------- Startscherm ----------
function renderStart() {
  const chosen = new Set(S.pendingCities);
  $('#centraleGrid').innerHTML = PROVINCES.map(p => {
    const on = p.cities.filter(c => chosen.has(c.id)).length;
    const cls = on === p.cities.length ? 'on' : on ? 'part' : '';
    return `<button class="centrale ${cls}" data-centrale="${p.id}"><b>${p.centrale}</b><small>${p.name}${on && on < p.cities.length ? ` · ${on}/${p.cities.length} steden` : ''}</small></button>`;
  }).join('');
  renderRegionTree($('#citySearch').value);
}
function renderRegionTree(filter = '') {
  const f = filter.trim().toLowerCase();
  const chosen = new Set(S.pendingCities);
  $('#regionTree').innerHTML = PROVINCES.map(p => {
    const cities = p.cities.filter(c => !f || c.name.toLowerCase().includes(f) || p.name.toLowerCase().includes(f));
    if (!cities.length) return '';
    const allOn = p.cities.every(c => chosen.has(c.id)), someOn = p.cities.some(c => chosen.has(c.id));
    return `<div class="prov"><label class="chk"><input type="checkbox" data-prov="${p.id}" ${allOn ? 'checked' : ''} ${!allOn && someOn ? 'data-ind="1"' : ''}> ${p.centrale} <small class="muted">(${p.name})</small></label>
      <div class="cities">${cities.map(c => `<label><input type="checkbox" data-city="${c.id}" ${chosen.has(c.id) ? 'checked' : ''}> ${c.name}</label>`).join('')}</div></div>`;
  }).join('');
  $$('#regionTree [data-ind]').forEach(el => el.indeterminate = true);
  $('#selCount').textContent = chosen.size ? `${regionLabel([...chosen])} · ${chosen.size} ${chosen.size === 1 ? 'stad' : 'steden'}` : 'Kies minstens één centrale of stad';
  $('#startGame').disabled = !chosen.size;
}
function fillHomeStats() {
  const nC = Object.keys(CITY_BY_ID).length;
  $('#stPosts').textContent = (nC * 3).toLocaleString('nl-BE');
  $('#stHosp').textContent = nC; $('#stProto').textContent = variantCount().toLocaleString('nl-BE'); $('#stCities').textContent = nC;
}
function showGame() {
  hide('#home'); show('#game'); window.scrollTo(0, 0);
  setTimeout(() => map.invalidateSize(), 50);
}
function openStart() {
  const running = S.running && S.time > 0;
  $('#runningText').textContent = running ? `Je dienst in ${regionLabel()} loopt nog (${clockStr()}, ${S.incidents.length} lopende inzetten). Hij staat op pauze.` : 'Er loopt nu geen dienst. Start hieronder een nieuwe.';
  $('#btnResume').classList.toggle('hidden', !running);
  S.pendingCities = [...S.cities]; S.running = false;
  if (![...$('#pStart').options].length || $('#pStart').options.length < 5) for (let h = 0; h < 24; h++) $('#pStart').insertAdjacentHTML('beforeend', `<option value="${p2(h)}:00">${p2(h)}:00</option>`);
  $('#pName').value = S.player; $('#pDay').value = S.day; $('#pStart').value = S.start;
  if (!$('#pDay').value) $('#pDay').value = 'today';
  if (!$('#pStart').value) $('#pStart').value = 'now';
  $('#pConsent').checked = !!S.consent;
  $('#citySearch').value = ''; renderStart(); hide('#game'); show('#home'); window.scrollTo(0, 0);
}
function toggleCities(ids, on) {
  const set = new Set(S.pendingCities); ids.forEach(id => on ? set.add(id) : set.delete(id));
  S.pendingCities = Object.keys(CITY_BY_ID).filter(id => set.has(id)); renderStart();
}

// ---------- Post bouwen ----------
let buildMode = false, buildPos = null;
function startBuild() { buildMode = true; show('#buildHint'); map.getContainer().style.cursor = 'crosshair'; }
function stopBuild() { buildMode = false; hide('#buildHint'); map.getContainer().style.cursor = ''; }
map.on('click', e => {
  if (!buildMode) return;
  buildPos = [e.latlng.lat, e.latlng.lng]; stopBuild();
  $('#buildType').innerHTML = Object.entries(STATION_TYPES).map(([k, t]) => `<option value="${k}">${t.icon} ${t.name} — €${t.price.toLocaleString('nl-BE')}</option>`).join('');
  const city = nearestCity(buildPos);
  const nm = () => `${STATION_TYPES[$('#buildType').value].name} ${city.name.split(' (')[0]} ${S.stations.filter(s => s.cityId === city.id && s.type === $('#buildType').value).length + 1}`;
  $('#buildName').value = nm(); $('#buildType').onchange = () => { $('#buildName').value = nm(); };
  show('#buildModal');
});
function nearestCity(p) {
  let best = CITY_BY_ID[S.cities[0]], bd = Infinity;
  for (const id of S.cities) { const c = CITY_BY_ID[id], d = distM(p, [c.lat, c.lng]); if (d < bd) { bd = d; best = c; } }
  return best;
}
function confirmBuild() {
  const type = $('#buildType').value, T = STATION_TYPES[type];
  if (S.credits < T.price) { log('💸 Onvoldoende krediet voor deze post.', '#ef4444'); return; }
  S.credits -= T.price;
  const city = nearestCity(buildPos);
  const st = { id: `c${Date.now()}-${type}`, type, name: $('#buildName').value || T.name, lat: buildPos[0], lng: buildPos[1], cityId: city.id };
  S.customStations.push({ ...st });
  S.extraVehicles[st.id] = [T.allowed[0]];
  addStation(st, []);
  if (type === 'hosp') { st.specs = []; st.load = 0.3; }
  hide('#buildModal'); save(); renderAll();
  log(`🏗️ ${esc(st.name)} gebouwd`, '#22c55e');
}
function buyVehicle(stId, type) {
  const VT = VEHICLE_TYPES[type], st = S.stations.find(s => s.id === stId);
  if (S.credits < VT.price) { log('💸 Onvoldoende krediet.', '#ef4444'); return; }
  S.credits -= VT.price;
  (S.extraVehicles[stId] = S.extraVehicles[stId] || []).push(type);
  addUnit(st, type); save(); renderStations(); dirty = true;
  log(`🛒 ${VT.name} gekocht voor ${esc(st.name)}`, '#22c55e');
}

// ---------- Events ----------
$$('.tabs button').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
function setSpeed(sp) { S.speed = sp; $$('.speed button').forEach(x => x.classList.toggle('active', +x.dataset.speed === sp)); }
$$('.speed button').forEach(b => b.onclick = () => setSpeed(+b.dataset.speed));
$('#btnSound').onclick = () => { S.sound = !S.sound; $('#btnSound').textContent = S.sound ? '🔊' : '🔇'; save(); };
$('#btnVoice').onclick = () => { S.voice = !S.voice; $('#btnVoice').style.opacity = S.voice ? 1 : 0.4; if (!S.voice && window.speechSynthesis) speechSynthesis.cancel(); save(); };
$('#btnRegion').onclick = openStart;
$('#incomingList').onclick = e => {
  const t = e.target.closest('[data-transfer]'); if (t) { e.stopPropagation(); transferCall(S.calls.find(c => c.id == t.dataset.transfer)); return; }
  const c = e.target.closest('[data-call]'); if (c) openCall(+c.dataset.call);
};
$('#incidentList').onclick = e => {
  const c = e.target.closest('[data-inc]'); if (!c) return;
  const inc = S.incidents.find(i => i.id == c.dataset.inc); if (!inc) return;
  const a = e.target.closest('[data-act]');
  if (!a) { S.expanded = S.expanded === inc.id ? null : inc.id; dirty = true; return; }
  const act = a.dataset.act;
  if (act === 'edit') openDispatch(inc.id);
  else if (act === 'map') map.flyTo([inc.lat, inc.lng], 15, { duration: 0.6 });
  else if (act === 'support') openSupport(inc);
  else if (act === 'cancel') { if (a.dataset.sure) cancelIncident(inc); else { a.dataset.sure = '1'; a.textContent = 'Zeker? Klik opnieuw'; setTimeout(() => { delete a.dataset.sure; }, 3000); } }
};
$('#mapToggles').onclick = e => {
  const b = e.target.closest('[data-layer]'); if (!b) return;
  const l = layers[b.dataset.layer], on = !map.hasLayer(l);
  on ? l.addTo(map) : map.removeLayer(l); b.classList.toggle('on', on);
};
$('#supList').onclick = e => { const b = e.target.closest('[data-nb]'); if (b) requestSupport(b.dataset.nb); };
$('#supX').onclick = () => { hide('#supportModal'); supInc = null; };
$('#radioList').onclick = e => {
  const us = e.target.closest('[data-unitsel]'); if (us) { e.preventDefault(); selectUnit(+us.dataset.unitsel, true); return; }
  const a = e.target.closest('[data-ack]'); if (a) { ackRadio(S.radio.find(m => m.id == a.dataset.ack)); renderRadio(); return; }
  const q = e.target.closest('[data-hospq]'); if (q) { const [u, h] = q.dataset.hospq.split('|'); chooseHospital(+u, h); renderRadio(); return; }
  const o = e.target.closest('[data-hospopen]'); if (o) openHospital(+o.dataset.hospopen);
};
$('#btnAckAll').onclick = () => { S.radio.filter(m => m.open && m.kind === 'info').forEach(m => ackRadio(m)); renderRadio(); };
$('#hospList').onclick = e => { const r = e.target.closest('[data-hosp]'); if (r && hospUnit) { chooseHospital(hospUnit.id, r.dataset.hosp); renderRadio(); } };
$('#hospLater').onclick = () => { hide('#hospModal'); hospUnit = null; };
const ptt = $('#btnPTT');
ptt.addEventListener('pointerdown', e => { e.preventDefault(); pttStart(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => ptt.addEventListener(ev, pttStop));
if (!SR) $('#pttHint').innerHTML = '⚠️ Je browser ondersteunt geen spraakherkenning. Gebruik de knoppen, of speel in Chrome/Edge voor push-to-talk.';
function selectUnit(id, fly) {
  const u = S.units.find(x => x.id == id); if (!u) return;
  S.selUnit = u.id; switchTab('units'); renderUnits();
  const row = document.querySelector(`#unitList [data-unit="${u.id}"]`); if (row) row.scrollIntoView({ block: 'nearest' });
  if (fly) { map.flyTo([u.lat, u.lng], 15, { duration: 0.6 }); }
}
$('#unitList').onclick = e => { const c = e.target.closest('[data-unit]'); if (c) selectUnit(+c.dataset.unit, false); };
$('#unitList').ondblclick = e => { const c = e.target.closest('[data-unit]'); if (c) selectUnit(+c.dataset.unit, true); };
$('#unitDetail').onclick = e => {
  const u = S.units.find(x => x.id === S.selUnit); if (!u) return;
  if (e.target.id === 'udMap') { map.flyTo([u.lat, u.lng], 15, { duration: 0.6 }); }
  if (e.target.id === 'udCancel') {
    const inc = S.incidents.find(i => i.id === u.incidentId);
    if (inc) logbook(`${incNo(inc)} rit geannuleerd voor ${u.name}`);
    radio('Meldkamer', `${u.name}, uw rit is geannuleerd. Keer terug naar de post.`, { me: true });
    returnToStation(u); renderUnits();
  }
  const a = e.target.closest('[data-incsel]');
  if (a) { e.preventDefault(); S.expanded = +a.dataset.incsel; dirty = true; }
};
$('#unitDetail').onchange = e => {
  if (e.target.id !== 'udStatus') return;
  const u = S.units.find(x => x.id === S.selUnit); if (!u) return;
  u.offDuty = e.target.value === 'off'; refreshStation(u.station);
  u.marker.setIcon(unitIcon(u)); renderUnits(); dirty = true;
};
$('#radioStatusRows').onchange = () => renderRadio();
function openEndShift() {
  const st = S.shiftStart || {}, mins = Math.round(S.time / 60);
  const done = S.done - (st.done || 0), failed = S.failed - (st.failed || 0);
  const nh = S.normHit - (st.normHit || 0), nt = S.normTotal - (st.normTotal || 0);
  $('#endSummary').innerHTML = `
    <dt>Centrale</dt><dd>${esc(regionLabel())}</dd>
    <dt>Duur</dt><dd>${Math.floor(mins / 60)} u ${mins % 60} min</dd>
    <dt>Afgehandeld</dt><dd>${done}</dd>
    <dt>Mislukt</dt><dd>${failed}</dd>
    <dt>Aanrijnorm</dt><dd>${nt ? Math.round(nh / nt * 100) + '% (' + nh + '/' + nt + ')' : '-'}</dd>
    <dt>Krediet</dt><dd>${S.credits - (st.credits || 0) >= 0 ? '+' : ''}€${(S.credits - (st.credits || 0)).toLocaleString('nl-BE')}</dd>
    <dt>Ervaring</dt><dd>${S.xp - (st.xp || 0) >= 0 ? '+' : ''}${S.xp - (st.xp || 0)} XP</dd>
    <dt>Lopend</dt><dd>${S.incidents.length} inzetten, ${S.calls.length} oproepen</dd>`;
  S.running = false; show('#endModal');
}
function endShift() {
  hide('#endModal');
  logbook('Dienst afgesloten.');
  S.running = false; S.time = 0; S.calls = []; S.incidents = []; S.radio = []; S.expanded = null; currentCall = null;
  for (const l of Object.values(layers)) l.clearLayers();
  S.units = []; S.stations = [];
  ['#callModal', '#dispatchModal', '#hospModal', '#supportModal'].forEach(hide);
  if (window.speechSynthesis) speechSynthesis.cancel();
  save(); openStart();
  log('Dienst afgesloten. Tot de volgende keer!', '#22c55e');
}
$('#btnEndShift').onclick = openEndShift;
$('#endConfirm').onclick = endShift;
$('#endCancel').onclick = $('#endX').onclick = () => { hide('#endModal'); S.running = true; };
$('#btnNextCall').onclick = () => { const c = S.calls.find(x => !x.answered); if (c) openCall(c.id); };
const stClick = e => {
  const b = e.target.closest('[data-buy]'); if (b) { const [s, t] = b.dataset.buy.split('|'); buyVehicle(s, t); return; }
  const c = e.target.closest('[data-st]'); if (c) { const st = S.stations.find(s => s.id === c.dataset.st); if (st) map.flyTo([st.lat, st.lng], 15, { duration: 0.6 }); }
};
$('#stationList').onclick = stClick; $('#hospitalList').onclick = stClick;
$('#unitFilterCity').onchange = renderUnits; $('#unitFilterStatus').onchange = renderUnits; $('#unitFilterType').onchange = renderUnits; $('#unitSearch').oninput = renderUnits;
$('#btnTheme').onclick = $('#btnThemeHome').onclick = () => { S.theme = S.theme === 'light' ? 'dark' : 'light'; applyTheme(); save(); };
$('#btnResume').onclick = () => { S.running = true; showGame(); };
$('#btnNeighbor').onclick = () => {
  const c = S.calls.find(x => !x.answered);
  if (c) { transferCall(c); return; }
  openSupport(S.incidents.find(i => i.id === S.expanded));
};
$('#questions').onclick = e => { const b = e.target.closest('[data-q]'); if (b) askQuestion(b.dataset.q); };
$('#callProto').onchange = e => { if (!currentCall) return; currentCall.protoId = e.target.value; if (e.target.value && !currentCall.prio) currentCall.prio = TYPE_BY_ID[e.target.value].prio; renderCall(); };
$('#callPrio').onclick = e => { const b = e.target.closest('[data-prio]'); if (b && currentCall) { currentCall.prio = +b.dataset.prio; renderCall(); } };
$('#callAccept').onclick = acceptCall; $('#callReject').onclick = rejectCall; $('#callTransfer').onclick = () => transferCall();
$('#dispUnits').onclick = e => {
  const r = e.target.closest('[data-id]'); if (!r || r.classList.contains('busy') || r.classList.contains('assigned')) return; const id = +r.dataset.id;
  dispSel.has(id) ? dispSel.delete(id) : dispSel.add(id); renderDispatch();
};
$('#dispOnlyNeeded').onchange = renderDispatch;
$('#dispAuto').onclick = autoSuggest;
$$('#dispatchModal [data-quick]').forEach(b => b.onclick = () => quickAdd(b.dataset.quick));
$('#edFire').onchange = e => { if (e.target.checked) quickAdd('AP'); };
$('#edPol').onchange = e => { if (e.target.checked) quickAdd('POL'); };
$('#edPrio').onclick = e => { const b = e.target.closest('[data-prio]'); if (b && dispInc) { dispInc.prio = +b.dataset.prio; renderDispatch(); dirty = true; } };
$$('.edp').forEach(el => el.onchange = () => { saveDispatchEdits(); renderDispatch(); });
$('#edMedBij').onchange = $('#edAbc').onchange = () => { saveDispatchEdits(); renderDispatch(); };
$('#fltAll').onclick = () => { dispProvOnly = false; renderDispatch(); };
$('#sortEta').onclick = () => { dispSort = 'eta'; renderDispatch(); };
$('#sortName').onclick = () => { dispSort = 'name'; renderDispatch(); };
$('#fltProv').onclick = () => { dispProvOnly = true; renderDispatch(); };
$('#dispCancel').onclick = $('#dispX').onclick = closeDispatch;
$('#dispSave').onclick = () => { saveDispatchEdits(); closeDispatch(); };
$('#dispSend').onclick = () => sendSelected(false);
$('#dispSendSupport').onclick = () => sendSelected(true);
$('#dispCancelInc').onclick = e => {
  const b = e.currentTarget;
  if (b.dataset.sure) { delete b.dataset.sure; b.textContent = 'Inzet annuleren'; const inc = dispInc; closeDispatch(); cancelIncident(inc); }
  else { b.dataset.sure = '1'; b.textContent = 'Zeker? Klik opnieuw'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Inzet annuleren'; }, 3000); }
};
$('#btnBuild').onclick = startBuild;
$('#cancelBuild').onclick = e => { e.preventDefault(); stopBuild(); };
$('#buildCancel').onclick = () => hide('#buildModal');
$('#buildConfirm').onclick = confirmBuild;

$('#centraleGrid').onclick = e => {
  const b = e.target.closest('[data-centrale]'); if (!b) return;
  const p = PROVINCES.find(x => x.id === b.dataset.centrale);
  toggleCities(p.cities.map(c => c.id), !p.cities.every(c => S.pendingCities.includes(c.id)));
};
$('#regionTree').onchange = e => {
  if (e.target.dataset.prov) toggleCities(PROVINCES.find(x => x.id === e.target.dataset.prov).cities.map(c => c.id), e.target.checked);
  else if (e.target.dataset.city) toggleCities([e.target.dataset.city], e.target.checked);
};
$('#citySearch').oninput = e => renderRegionTree(e.target.value);
$('#selAll').onclick = () => toggleCities(Object.keys(CITY_BY_ID), true);
$('#selNone').onclick = () => toggleCities(Object.keys(CITY_BY_ID), false);
$('#startGame').onclick = async () => {
  if (!S.pendingCities.length) return;
  if (!$('#pConsent').checked) { $('#pConsent').closest('label').style.color = 'var(--bad)'; $('#pConsent').focus(); return; }
  S.consent = true;
  if (!$('#keepProgress').checked) { Object.assign(S, { credits: 10000, xp: 0, done: 0, failed: 0, transfers: 0, normHit: 0, normTotal: 0, extraVehicles: {}, customStations: [] }); }
  S.player = $('#pName').value.trim(); S.day = $('#pDay').value; S.start = $('#pStart').value;
  if (S.start === 'now') { const d = new Date(); S.startSec = d.getHours() * 3600 + d.getMinutes() * 60; }
  else if (S.start === 'random') S.startSec = Math.floor(Math.random() * 24) * 3600 + Math.floor(Math.random() * 4) * 900;
  else { const [h, m] = S.start.split(':').map(Number); S.startSec = h * 3600 + m * 60; }
  S.cities = [...S.pendingCities]; S.pendingCities = null; S.time = 0; S.nextHospTick = 0; currentCall = null;
  { const d = new Date(); d.setHours(0, 0, 0, 0);
    let want = null;
    if (S.day === 'werkdag') want = 1 + Math.floor(Math.random() * 5);
    else if (S.day === 'weekend') want = Math.random() < 0.5 ? 6 : 0;
    else if (/^[0-6]$/.test(S.day)) want = +S.day;
    if (want !== null) d.setDate(d.getDate() + ((want - d.getDay() + 7) % 7));
    S.baseDate = d.getTime(); }
  S.incNo = 100 + Math.floor(Math.random() * 60); S.logbook = []; setWeather(true);
  ['#callModal', '#dispatchModal', '#hospModal', '#supportModal'].forEach(hide); S.expanded = null;
  showGame(); save(); buildWorld();
  $('#startGame').disabled = true;
  log('📍 Echte posten worden geladen…', '#38bdf8');
  await snapStationsToReal();
  $('#startGame').disabled = false;
  S.running = true;
  S.shiftStart = { done: S.done, failed: S.failed, credits: S.credits, xp: S.xp, normHit: S.normHit, normTotal: S.normTotal };
  shiftHandover();
  log(`🟢 Dienst gestart${S.player ? ` voor <b>${esc(S.player)}</b>` : ''} in <b>${esc(regionLabel())}</b>. Succes!`, '#22c55e');
  radio('Meldkamer', `Dienst gestart om ${clockStr()}. Alle ploegen: ${regionLabel()} is bemand.`, { me: true });
};
document.addEventListener('keydown', e => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
  if (e.key === 'Escape') { ['#callModal', '#dispatchModal', '#buildModal', '#hospModal', '#supportModal', '#settingsModal'].forEach(hide); dispInc = null; hospUnit = null; stopBuild(); currentCall = null; }
  if (typing) return;
  if (e.code === 'KeyT' && !e.repeat) pttStart();
  if (e.key === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); }
});
document.addEventListener('keyup', e => { if (e.code === 'KeyT') pttStop(); });

// ---------- Start ----------
load();
applyTheme();
fillHomeStats();
$('#unitFilterType').innerHTML = '<option value="">Alle types</option>' + Object.entries(VEHICLE_TYPES).map(([k, v]) => `<option value="${k}">${v.short} · ${v.name}</option>`).join('');
$('#btnSound').textContent = S.sound ? '🔊' : '🔇';
$('#btnVoice').style.opacity = S.voice ? 1 : 0.4;
if (!S.cities.length) S.cities = PROVINCES[0].cities.map(c => c.id);
openStart();
requestAnimationFrame(tick);
