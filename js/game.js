'use strict';
/* ==========================================================
   Meldkamer 112 — dispatch simulator
   ========================================================== */

const SAVE_KEY = 'meldkamer112_save_v1';
const DRIVE_COMPRESS = 3;          // 1 spelseconde = 3 echte seconden (klok, rijtijden)
const CALL_TIMEOUT = 75;           // s voor een oproep die niet opgenomen wordt
const HOSPITAL_TIME = 20;          // s overdracht in ziekenhuis
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
  player: '', day: 'werkdag', start: 'now', startSec: 8 * 3600,
  cities: [], extraVehicles: {}, customStations: [],
  stations: [], units: [], incidents: [], calls: [], radio: [],
  nextId: 1, nextSpawn: 5, running: false, nextHospTick: 0,
  theme: 'dark', incNo: 100, weather: WEATHER[1], nextWeather: 0, baseDate: null, logbook: [],
};

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (d) for (const k of ['credits', 'xp', 'done', 'failed', 'transfers', 'normHit', 'normTotal', 'cities', 'extraVehicles',
      'customStations', 'sound', 'voice', 'player', 'day', 'start', 'theme']) if (d[k] !== undefined) S[k] = d[k];
  } catch (e) { /* geen opslag */ }
}
function save() {
  try {
    const o = {}; for (const k of ['credits', 'xp', 'done', 'failed', 'transfers', 'normHit', 'normTotal', 'cities', 'extraVehicles',
      'customStations', 'sound', 'voice', 'player', 'day', 'start', 'theme']) o[k] = S[k];
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
  const d = new Date(S.baseDate || Date.now()); d.setDate(d.getDate() + Math.floor(totalSec() / 86400));
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
function logbook(text) {
  S.logbook.unshift({ t: clockLong(), text }); if (S.logbook.length > 120) S.logbook.pop();
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
const baseLayers = {
  'Donker': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap-bijdragers &copy; CARTO' }),
  'Straten (OSM)': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap-bijdragers' }),
};
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  const want = S.theme === 'light' ? 'Straten (OSM)' : 'Donker';
  for (const [k, l] of Object.entries(baseLayers)) { if (k === want) { if (!map.hasLayer(l)) l.addTo(map); } else if (map.hasLayer(l)) map.removeLayer(l); }
  for (const id of ['btnTheme', 'btnThemeHome']) { const b = document.getElementById(id); if (b) b.textContent = S.theme === 'light' ? '🌙' : '☀️'; }
}
const layers = { stations: L.layerGroup().addTo(map), units: L.layerGroup().addTo(map), incidents: L.layerGroup().addTo(map), routes: L.layerGroup().addTo(map) };
L.control.layers(baseLayers, { 'Posten': layers.stations, 'Voertuigen': layers.units, 'Routes': layers.routes }, { position: 'topright' }).addTo(map);

// ---------- Routering (OSRM met fallback) ----------
const routeCache = new Map();
let osrmOk = true;
async function getRoute(a, b) {
  const key = a.map(x => x.toFixed(4)).join() + '|' + b.map(x => x.toFixed(4)).join();
  if (routeCache.has(key)) return routeCache.get(key);
  let res = null;
  if (osrmOk) {
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 4000);
      const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=simplified&geometries=geojson`;
      const r = await fetch(url, { signal: ctrl.signal }); clearTimeout(to);
      const j = await r.json();
      if (j.routes && j.routes[0]) {
        const rt = j.routes[0];
        res = { pts: rt.geometry.coordinates.map(c => [c[1], c[0]]), dist: rt.distance, dur: rt.duration };
        res.pts.unshift(a); res.pts.push(b);
      }
    } catch (e) { osrmOk = false; setTimeout(() => { osrmOk = true; }, 60000); }
  }
  if (!res) { const d = distM(a, b) * 1.35; res = { pts: [a, b], dist: d, dur: d / 12.5 }; }
  routeCache.set(key, res);
  return res;
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
  layers.stations.clearLayers(); layers.units.clearLayers(); layers.incidents.clearLayers(); layers.routes.clearLayers();
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
  const pts = S.cities.map(id => [CITY_BY_ID[id].lat, CITY_BY_ID[id].lng]);
  if (pts.length === 1) map.setView(pts[0], 13);
  else if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.15));
  S.nextSpawn = S.time + 4;
  renderAll();
}
function addStation(st, baseFleet) {
  st.unitCount = st.unitCount || {};
  S.stations.push(st);
  const T = STATION_TYPES[st.type];
  st.marker = L.marker([st.lat, st.lng], {
    icon: L.divIcon({ className: '', html: `<div class="mk mk-station" style="background:${T.color}">${T.icon}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
    zIndexOffset: -100,
  }).bindTooltip(() => st.type === 'hosp' ? `${esc(st.name)} · spoed ${hospStatus(st)}` : esc(st.name)).addTo(layers.stations);
  st.marker.on('click', () => { switchTab('stations'); const el = document.getElementById('st-' + st.id); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
  [...baseFleet, ...(S.extraVehicles[st.id] || [])].forEach(t => addUnit(st, t));
}
function addUnit(st, type, temp = false) {
  st.unitCount[type] = (st.unitCount[type] || 0) + 1;
  const city = CITY_BY_ID[st.cityId];
  const VT = VEHICLE_TYPES[type];
  const u = {
    id: S.nextId++, type, stationId: st.id, status: 1, lat: st.lat, lng: st.lng, incidentId: null, move: null, temp,
    name: temp ? `${VT.short} Buurcentrale ${st.unitCount[type]}` : type === 'HELI' ? `HELI ${city ? city.name.split(' ')[0] : st.name}` : `${VT.short} ${city ? city.name.split(' ')[0] : st.name} ${st.unitCount[type]}`,
  };
  u.station = st;
  u.marker = L.marker([u.lat, u.lng], { icon: unitIcon(u), zIndexOffset: 500 }).bindTooltip(() => `${esc(u.name)} · status ${u.status}`);
  u.marker.on('click', () => { if (u.incidentId) openDispatch(u.incidentId); });
  S.units.push(u);
  return u;
}
function unitIcon(u) {
  const VT = VEHICLE_TYPES[u.type];
  return L.divIcon({ className: '', html: `<div class="mk mk-unit ${u.status === 2 ? 'blink' : ''}" style="background:${VT.color}">${VT.short}</div>`, iconSize: [30, 18], iconAnchor: [15, 9] });
}
function setStatus(u, s) {
  u.status = s;
  u.marker.setIcon(unitIcon(u));
  if (s === 1) { if (layers.units.hasLayer(u.marker)) layers.units.removeLayer(u.marker); }
  else if (!layers.units.hasLayer(u.marker)) layers.units.addLayer(u.marker);
  dirty = true;
}
const stationOf = u => u.station;
const grounded = u => VEHICLE_TYPES[u.type].air && (isNight() || !S.weather.fly);
const isFree = u => (u.status === 1 || u.status === 5) && !grounded(u);
const statusCode = u => grounded(u) && u.status === 1 ? '–' : u.status;

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
const shownNeed = inc => (inc.revealed ? TYPE_BY_ID[inc.typeId] : TYPE_BY_ID[inc.protoId]).need;
function incStatus(inc, need = shownNeed(inc)) {
  const { scene, all } = incCounts(inc), cs = allocate(need, scene), ca = allocate(need, all), h = {};
  for (const k of Object.keys(need)) h[k] = { scene: cs[k], way: ca[k] - cs[k] };
  return h;
}
function needsMet(inc) {
  const need = TYPE_BY_ID[inc.typeId].need, h = incStatus(inc, need);
  return Object.entries(need).every(([k, n]) => h[k].scene >= n);
}
function missingList(inc, need) {
  const h = incStatus(inc, need);
  return Object.entries(need).filter(([k, n]) => h[k].scene + h[k].way < n).map(([k, n]) => `${n - h[k].scene - h[k].way}x ${k}`);
}
const fitsType = (needKey, unitType) => needKey === unitType || (SUBSTITUTE[needKey] || []).includes(unitType);

// ---------- Oproepen ----------
function hasType(k) { return S.units.some(u => !u.temp && u.type !== 'HELI' && fitsType(k, u.type)); }
function availableTypes() {
  const lv = level();
  return INCIDENT_TYPES.filter(t => (t.minLevel || 0) < lv + 1 && Object.keys(t.need).every(hasType));
}
function hourFactor() {
  const h = Math.floor(clockSec() / 3600), we = S.day === 'weekend';
  if (h < 6) return we ? 0.9 : 0.5;
  if (h < 10) return 1.1;
  if (h < 18) return 1.0;
  return we ? 1.4 : 1.2;
}
function spawnCall() {
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
  const [lat, lng] = offsetKm(city.lat, city.lng, gauss() * spread, gauss() * spread);
  const call = {
    id: S.nextId++, typeId: type.id, lat, lng, cityId: city.id, created: S.time, answered: false, asked: [], convo: [],
    addr: `${pick(STREETS)} ${Math.floor(rnd(1, 180))}, ${city.name.split(' (')[0]}`,
    text: pick(type.calls), fake: Math.random() < 0.06, voiceSeed: Math.floor(Math.random() * 100),
    protoId: '', prio: 0,
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
    c.answered = true; c.answeredAt = S.time;
    addConvo(c, 'me', '112, wat is uw noodgeval?');
    addConvo(c, 'caller', c.text);
    speak(c.text, 'caller', c.voiceSeed);
  }
  $('#callTitle').textContent = `Oproep 112 · regio ${CITY_BY_ID[c.cityId].name}`;
  // protocollen
  const opts = ['<option value="">— kies een protocol —</option>'];
  for (const [cat, label] of Object.entries(CATEGORIES)) {
    opts.push(`<optgroup label="${label}">` + INCIDENT_TYPES.filter(t => t.cat === cat).map(t => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join('') + '</optgroup>');
  }
  $('#callProto').innerHTML = opts.join('');
  $('#callProto').value = c.protoId;
  renderCall();
  map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  show('#callModal');
}
function addConvo(c, who, text) { c.convo.push({ who, text }); }
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
function askQuestion(qid) {
  const c = currentCall; if (!c || c.asked.includes(qid)) return;
  const Q = QUESTIONS.find(q => q.id === qid), T = TYPE_BY_ID[c.typeId];
  c.asked.push(qid);
  addConvo(c, 'me', Q.q);
  let a;
  if (c.fake) a = pick(['Euh… dat weet ik niet.', 'Waarom wil je dat weten?', 'Hihi, niks aan de hand hoor.', '…']);
  else if (qid === 'adres') a = `${c.addr}.`;
  else if (qid === 'wat') a = `${T.calls.find(x => x !== c.text) || c.text} Het gaat om: ${T.name.toLowerCase()}.`;
  else if (qid === 'personen') a = T.facts.personen;
  else a = ANSWERS[qid][T.facts[qid]] || 'Dat weet ik niet.';
  addConvo(c, 'caller', a);
  speak(a, 'caller', c.voiceSeed);
  renderCall();
}
function needChips(need, have) {
  return Object.entries(need).map(([k, n]) => {
    let cls = '';
    if (have) { const h = have[k] || { scene: 0, way: 0 }; cls = h.scene >= n ? 'ok' : (h.scene + h.way >= n ? 'way' : 'miss'); }
    const txt = have ? `${(have[k]?.scene || 0)}/${n}` : `${n}x`;
    return `<span class="chip ${cls}" title="${VEHICLE_TYPES[k].name}">${txt} ${k}</span>`;
  }).join(' ');
}
function closeCall(c) { S.calls = S.calls.filter(x => x !== c); hide('#callModal'); currentCall = null; if (window.speechSynthesis) speechSynthesis.cancel(); dirty = true; }
function acceptCall() {
  const c = currentCall; if (!c || $('#callAccept').disabled) return;
  closeCall(c);
  if (c.fake) { addXp(-30); S.failed++; log('⚠️ Dat was een valse oproep — onnodig incident aangemaakt (-30 XP).', '#f59e0b'); return; }
  const T = TYPE_BY_ID[c.typeId];
  let bonus = 0;
  if (c.protoId === c.typeId) bonus += 15;
  if (+c.prio === T.prio) bonus += 5;
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
  const nUnits = Object.values(T.need).reduce((a, b) => a + b, 0);
  const inc = { no: ++S.incNo, id: c.id, typeId: T.id, protoId: P.id, prio: +c.prio, lat: c.lat, lng: c.lng, addr: c.addr, cityId: c.cityId,
    created: S.time, patience: 240 + nUnits * 30, waited: 0, progress: 0, state: 'open', revealed: c.protoId === c.typeId, arrived: false };
  inc.marker = L.marker([inc.lat, inc.lng], {
    icon: L.divIcon({ className: '', html: `<div class="mk mk-inc">${P.icon}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] }),
    zIndexOffset: 1000,
  }).bindTooltip(() => `${TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId].name} · ${esc(inc.addr)}`).addTo(layers.incidents);
  inc.marker.on('click', () => openDispatch(inc.id));
  S.incidents.push(inc);
  logbook(`${incNo(inc)} aangemaakt: ${P.name}, ${PRIORITIES[inc.prio].name}, ${inc.addr}`);
  dirty = true;
  if (!c.silent) openDispatch(inc.id);
  return inc;
}
function incNo(inc) { return '#' + String(inc.no).padStart(4, '0'); }
function incName(inc) { const t = TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId]; return `${t.icon} ${t.name}`; }

// ---------- Radio ----------
function radio(from, text, opts = {}) {
  const m = { id: S.nextId++, t: clockStr(), from, text, kind: opts.kind || 'info', open: !!opts.ack || opts.kind === 'transport',
    unitId: opts.unitId, created: S.time, me: !!opts.me };
  S.radio.unshift(m); if (S.radio.length > 80) S.radio.pop();
  if (!m.me) { beep(1400, 0.05, 1, 0.025); speak(`${from}: ${text}`, 'radio', opts.unitId || 0); }
  dirty = true; radioDirty = true;
  return m;
}
function ackRadio(m, viaVoice) {
  if (!m || !m.open || m.kind !== 'info') return;
  m.open = false; addXp(viaVoice ? 3 : 2); radioDirty = true; dirty = true;
}
function handleVoice(txt) {
  const t = txt.toLowerCase();
  radio('Meldkamer', txt, { me: true });
  // tijdens een oproep: vragen herkennen
  if (currentCall && !$('#callModal').classList.contains('hidden')) {
    const map2 = { adres: /adres|waar|straat/, wat: /gebeurd|wat is er|wat scheelt/, bewust: /bewust|wakker|reageert/, adem: /adem/, personen: /hoeveel|personen|gewonden/, gevaar: /brand|rook|gevaar|gas/ };
    for (const [q, re] of Object.entries(map2)) if (re.test(t)) askQuestion(q);
    return;
  }
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

// ---------- Alarmeren ----------
let dispInc = null, dispSel = new Set();
function openDispatch(id) {
  const inc = S.incidents.find(i => i.id === id); if (!inc) return;
  dispInc = inc; dispSel = new Set();
  renderDispatch();
  show('#dispatchModal');
}
function dispCandidates() {
  const need = shownNeed(dispInc), only = $('#dispOnlyNeeded').checked;
  return S.units
    .filter(u => isFree(u) && (!only || Object.keys(need).some(k => fitsType(k, u.type))))
    .map(u => ({ u, d: distM([u.lat, u.lng], [dispInc.lat, dispInc.lng]) }))
    .sort((a, b) => a.d - b.d).slice(0, 60);
}
function etaMin(u, d) { if (VEHICLE_TYPES[u.type].air) return d / 55 / 60 + 3; return d * 1.35 / 12.5 / VEHICLE_TYPES[u.type].speed / S.weather.speed / 60 / (dispInc && dispInc.prio < 3 ? 1.25 : 1); }
function renderDispatch() {
  if (!dispInc) return;
  const P = PRIORITIES[dispInc.prio];
  $('#dispTitle').innerHTML = `${incName(dispInc)} — ${esc(dispInc.addr)} <span class="chip" style="border-color:${P.color};color:${P.color}">${P.name} · norm ${P.norm} min</span>`;
  $('#dispNeed').innerHTML = '<b style="margin-right:6px">Benodigd:</b> ' + needChips(shownNeed(dispInc), incStatus(dispInc)) +
    ` <button id="dispNeighbor" class="small ghost" title="Een buurcentrale stuurt de ontbrekende middelen (€${NEIGHBOR_PRICE} per eenheid)">🤝 Hulp buurcentrale</button>`;
  $('#dispNeighbor').onclick = neighborHelp;
  const list = dispCandidates();
  $('#dispUnits').innerHTML = list.length ? list.map(({ u, d }) => {
    const VT = VEHICLE_TYPES[u.type], eta = etaMin(u, d);
    return `<div class="unit-row ${dispSel.has(u.id) ? 'sel' : ''}" data-id="${u.id}">
      <input type="checkbox" ${dispSel.has(u.id) ? 'checked' : ''}>
      <span class="tag" style="background:${VT.color}">${VT.short}</span>
      <span>${esc(u.name)} <span class="st st${u.status}">${u.status}</span><br><small class="muted">${esc(stationOf(u)?.name || '')}</small></span>
      <span>${(d / 1000).toFixed(1)} km</span>
      <span class="eta ${eta <= P.norm ? 'norm-ok' : 'norm-bad'}">~${Math.round(eta)} min</span></div>`;
  }).join('') : '<p class="empty">Geen beschikbare voertuigen. Vraag hulp aan een buurcentrale of koop extra voertuigen.</p>';
  $('#dispCount').textContent = dispSel.size;
  $('#dispSend').disabled = !dispSel.size;
}
function autoSuggest() {
  const need = shownNeed(dispInc), have = incStatus(dispInc);
  const all = S.units.filter(isFree)
    .map(u => ({ u, d: distM([u.lat, u.lng], [dispInc.lat, dispInc.lng]) })).sort((a, b) => etaMin(a.u, a.d) - etaMin(b.u, b.d));
  dispSel = new Set();
  for (const [k, n] of Object.entries(need)) {
    let missing = n - (have[k].scene + have[k].way);
    for (const { u } of all) { if (missing <= 0) break; if (u.type === k && !dispSel.has(u.id)) { dispSel.add(u.id); missing--; } }
    for (const { u } of all) { if (missing <= 0) break; if (fitsType(k, u.type) && !dispSel.has(u.id)) { dispSel.add(u.id); missing--; } }
  }
  renderDispatch();
}
function sendSelected() {
  const inc = dispInc; if (!inc) return;
  const ids = [...dispSel]; hide('#dispatchModal'); dispInc = null;
  const sent = [];
  for (const id of ids) {
    const u = S.units.find(x => x.id === id);
    if (!u || !isFree(u)) continue;
    dispatchUnit(u, inc); sent.push(u.name);
  }
  if (sent.length) {
    beep(600, 0.1, 1);
    logbook(`${incNo(inc)} gealarmeerd: ${sent.join(', ')}`);
    radio('Meldkamer', `${sent.join(', ')}: rij uit naar ${inc.addr}, ${TYPE_BY_ID[inc.revealed ? inc.typeId : inc.protoId].name.toLowerCase()}, ${PRIORITIES[inc.prio].name}.`, { me: true });
  }
}
function dispatchUnit(u, inc) {
  u.incidentId = inc.id; setStatus(u, 2); u.move = null;
  driveTo(u, [inc.lat, inc.lng], inc.prio < 3 ? 1.25 : 1, () => { if (u.incidentId === inc.id) arriveOnScene(u, inc); });
}
function neighborHelp() {
  const inc = dispInc; if (!inc) return;
  const need = shownNeed(inc), have = incStatus(inc);
  const miss = [];
  for (const [k, n] of Object.entries(need)) for (let i = have[k].scene + have[k].way; i < n; i++) miss.push(k);
  if (!miss.length) { log('Alle benodigde middelen zijn al onderweg.', '#38bdf8'); return; }
  const cost = miss.length * NEIGHBOR_PRICE;
  if (S.credits < cost) { log(`💸 Hulp van een buurcentrale kost €${cost}.`, '#ef4444'); return; }
  S.credits -= cost;
  // virtuele post op ±18 km van het incident
  const ang = Math.random() * Math.PI * 2;
  const [lat, lng] = offsetKm(inc.lat, inc.lng, Math.sin(ang) * 18, Math.cos(ang) * 18);
  const st = { id: 'nb' + S.nextId++, type: 'med', name: 'Buurcentrale', lat, lng, cityId: inc.cityId, unitCount: {}, virtual: true };
  const names = [];
  for (const k of miss) { const u = addUnit(st, k, true); u.lat = lat; u.lng = lng; u.marker.setLatLng([lat, lng]); dispatchUnit(u, inc); names.push(u.name); }
  hide('#dispatchModal'); dispInc = null;
  radio('Buurcentrale', `We sturen ${names.join(', ')} naar ${inc.addr}.`);
  log(`🤝 Buurcentrale stuurt ${miss.length} eenheid/eenheden (-€${cost}).`, '#38bdf8');
}
async function driveTo(u, dest, urgent, onArrive) {
  const token = (u.moveToken = (u.moveToken || 0) + 1);
  const air = VEHICLE_TYPES[u.type].air;
  const r = air ? { pts: [[u.lat, u.lng], dest], dur: distM([u.lat, u.lng], dest) / 55 + 180 } : await getRoute([u.lat, u.lng], dest);
  if (u.moveToken !== token) return;
  const dur = Math.max(4, air ? r.dur / DRIVE_COMPRESS : r.dur / VEHICLE_TYPES[u.type].speed / S.weather.speed / DRIVE_COMPRESS / urgent);
  u.move = { pts: r.pts, cum: prepRoute(r.pts), dur, t: 0, onArrive };
  if (u.line) layers.routes.removeLayer(u.line);
  u.line = L.polyline(r.pts, { color: VEHICLE_TYPES[u.type].color, weight: 3, opacity: 0.55, dashArray: urgent > 1 ? null : '4 6' }).addTo(layers.routes);
}
function arriveOnScene(u, inc) {
  setStatus(u, 3);
  let text = `ter plaatse ${inc.addr.split(',')[0]}.`;
  if (!inc.arrived) {
    inc.arrived = true;
    const T = TYPE_BY_ID[inc.typeId], mins = realMin(S.time - inc.created), norm = PRIORITIES[T.prio].norm;
    S.normTotal++; if (mins <= norm) S.normHit++; else log(`⏱️ Aanrijnorm overschreden: ${Math.round(mins)} min (norm ${norm} min)`, '#f59e0b');
    if (!inc.revealed) {
      inc.revealed = true;
      const P = inc.marker.getElement()?.querySelector('.mk'); if (P) P.textContent = T.icon;
      text += ` De situatie blijkt een ${T.name.toLowerCase()} te zijn.`;
      addXp(-10);
    }
    const miss = missingList(inc, T.need);
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
      const cap = 4 + level() * 2 + Math.floor(Math.sqrt(S.cities.length));
      if (S.calls.length + S.incidents.length < cap) spawnCall();
      const base = 38 / Math.sqrt(Math.max(1, S.cities.length)) / (1 + level() * 0.08) / hourFactor();
      S.nextSpawn = S.time + Math.max(7, base * rnd(0.6, 1.4));
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
        const f = Math.min(1, u.move.t / u.move.dur);
        const p = posOnRoute(u.move, f); u.lat = p[0]; u.lng = p[1]; u.marker.setLatLng(p);
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
        if (inc.progress >= T.dur) { completeIncident(inc); continue; }
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
function shiftHandover() {
  const types = availableTypes().filter(t => t.prio > 1 || t.cat === 'med');
  const n = Math.min(3, 1 + Math.floor(Math.random() * 3));
  let made = 0;
  for (let i = 0; i < n && types.length; i++) {
    const T = pick(types), cid = pick(S.cities), c = CITY_BY_ID[cid];
    const [lat, lng] = offsetKm(c.lat, c.lng, gauss() * c.size, gauss() * c.size);
    const inc = createIncident({ id: S.nextId++, typeId: T.id, protoId: T.id, prio: T.prio, lat, lng, cityId: cid, silent: true,
      addr: `${pick(STREETS)} ${Math.floor(rnd(1, 180))}, ${c.name.split(' (')[0]}` });
    inc.created -= rnd(60, 160);
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
  $('#incomingList').innerHTML = S.calls.length ? S.calls.map(c => {
    if (c.answered) return `<div class="card" data-call="${c.id}"><div class="row"><span class="title">🎧 In gesprek · ${esc(CITY_BY_ID[c.cityId].name)}</span><span class="sub">${fmtTime(S.time - c.answeredAt)}</span></div></div>`;
    const left = Math.max(0, CALL_TIMEOUT - (S.time - c.created));
    return `<div class="card ringing" data-call="${c.id}"><div class="row"><span class="title">📞 Oproep · ${esc(CITY_BY_ID[c.cityId].name)}</span>
      <span><button class="small ghost" data-transfer="${c.id}" title="Naar buurcentrale">↪</button> <span class="sub">${fmtTime(left)}</span></span></div>
      <div class="bar timer"><div style="width:${left / CALL_TIMEOUT * 100}%"></div></div></div>`;
  }).join('') : '<p class="empty">Geen oproepen in de wachtrij.</p>';
  if (!S.calls.length && S.logbook.length) $('#incomingList').innerHTML = '';
  $('#incidentList').innerHTML = S.incidents.length ? S.incidents.map(inc => {
    const T = TYPE_BY_ID[inc.typeId], P = PRIORITIES[inc.prio];
    const pct = inc.state === 'working' ? inc.progress / T.dur * 100 : 0;
    const pat = Math.max(0, 1 - inc.waited / inc.patience) * 100;
    const mins = realMin(S.time - inc.created);
    const us = S.units.filter(u => u.incidentId === inc.id);
    return `<div class="card" data-inc="${inc.id}"><div class="row"><span class="inc-no">${incNo(inc)}</span><span class="inc-time">${fmtTime(realMin(S.time - inc.created) * 60)}</span></div>
      <div class="row"><span class="title">${incName(inc)}, <span style="color:${P.color}">${P.name}</span></span>
      <button class="small" data-alarm="${inc.id}">Alarmeren</button></div>
      <div class="sub">${esc(inc.addr)} ${inc.arrived ? '' : `· <span class="${mins <= P.norm ? 'norm-ok' : 'norm-bad'}">${Math.floor(mins)}/${P.norm} min</span>`}</div>
      <div class="chips">${us.map(u => `<span class="uchip"><span class="st st${u.status}">${u.status}</span> ${esc(u.name)}</span>`).join('')}</div>
      <div class="chips">${needChips(shownNeed(inc), incStatus(inc))}</div>
      ${inc.state === 'working' ? `<div class="bar"><div style="width:${pct}%"></div></div>` : `<div class="bar timer" title="Resterende tijd"><div style="width:${pat}%;background:${pat < 30 ? '#ef4444' : ''}"></div></div>`}
    </div>`;
  }).join('') : '<p class="empty">Geen lopende inzetten.</p>';
  if (radioDirty && $('#tab-radio').classList.contains('active')) renderRadio();
  if ($('#tab-units').classList.contains('active')) renderUnits();
  if (!$('#dispatchModal').classList.contains('hidden') && dispInc) {
    $('#dispNeed').querySelectorAll('.chip').forEach(e => e.remove());
    $('#dispNeed b').insertAdjacentHTML('afterend', ' ' + needChips(shownNeed(dispInc), incStatus(dispInc)));
  }
}
function renderRadio() {
  radioDirty = false;
  $('#radioList').innerHTML = S.radio.length ? S.radio.map(m => {
    let acts = '';
    if (m.open && m.kind === 'info') acts = `<div class="acts"><button class="small" data-ack="${m.id}">✔ Begrepen</button></div>`;
    if (m.open && m.kind === 'transport') {
      const u = S.units.find(x => x.id === m.unitId);
      const near = u ? hospitals().map(h => ({ h, d: distM([u.lat, u.lng], [h.lat, h.lng]) })).sort((a, b) => a.d - b.d).slice(0, 2) : [];
      acts = `<div class="acts">${near.map(({ h }) => `<button class="small" data-hospq="${m.unitId}|${h.id}">${esc(h.name)} <span class="hstat ${hospStatus(h)}">${hospStatus(h)}</span></button>`).join('')}
        <button class="small primary" data-hospopen="${m.unitId}">Kies ziekenhuis…</button></div>`;
    }
    return `<div class="radio ${m.me ? 'me' : ''} ${m.open ? 'open' : ''}"><span class="t">${m.t}</span><span class="from">${esc(m.from)}:</span> ${esc(m.text)}${acts}</div>`;
  }).join('') : '<p class="empty">Nog geen radioverkeer.</p>';
}
const STATUS_TXT = { 1: 'Beschikbaar in post', 2: 'Onderweg (prio)', 3: 'Ter plaatse', 4: 'Patiënttransport', 5: 'Terug naar post' };
function renderUnits() {
  const fc = $('#unitFilterCity').value, fs = $('#unitFilterStatus').value, ft = $('#unitFilterType').value, q = $('#unitSearch').value.trim().toLowerCase();
  const list = S.units.filter(u => (!fc || stationOf(u)?.cityId === fc) && (!fs || u.status == fs) && (!ft || u.type === ft) && (!q || u.name.toLowerCase().includes(q)))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  $('#unitList').innerHTML = list.slice(0, 300).map(u => {
    const VT = VEHICLE_TYPES[u.type];
    return `<div class="urow" data-unit="${u.id}" title="${esc(VT.name)}"><span class="st st${grounded(u) && u.status === 1 ? 'x' : u.status}">${statusCode(u)}</span><span class="dot" style="background:${VT.color}"></span><span class="uname">${esc(u.name)}</span>
      <span class="usub">${u.awaitHosp ? 'Wacht op ziekenhuiskeuze' : grounded(u) && u.status === 1 ? 'Niet inzetbaar (nacht/weer)' : STATUS_TXT[u.status]} · ${esc(stationOf(u)?.name || '')}</span></div>`;
  }).join('') + (list.length > 300 ? `<p class="empty">… en nog ${list.length - 300} voertuigen (gebruik de filter)</p>` : '') || '<p class="empty">Geen voertuigen.</p>';
}
function renderLogbook() {
  logDirty = false;
  $('#logbook').innerHTML = S.logbook.length ? S.logbook.slice(0, 60).map(l => `<div class="lb"><span class="t">${l.t}</span> ${esc(l.text)}</div>`).join('') : '<p class="empty">Nog niets gelogd.</p>';
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
      <div class="chips">${Object.entries(counts).map(([k, n]) => `<span class="chip">${n}x ${k}</span>`).join('')}</div>
      <div class="chips">${T.allowed.map(k => `<button class="small" data-buy="${st.id}|${k}" title="${VEHICLE_TYPES[k].name}">+ ${k} €${VEHICLE_TYPES[k].price}</button>`).join('')}</div></div>`;
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
  if (t === 'radio') renderRadio();
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
  $('#stHosp').textContent = nC; $('#stProto').textContent = INCIDENT_TYPES.length; $('#stCities').textContent = nC;
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
  $('#pName').value = S.player; $('#pDay').value = S.day; $('#pStart').value = S.start;
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
  const a = e.target.closest('[data-alarm]'); if (a) { openDispatch(+a.dataset.alarm); return; }
  const c = e.target.closest('[data-inc]'); if (c) { const inc = S.incidents.find(i => i.id == c.dataset.inc); if (inc) map.flyTo([inc.lat, inc.lng], 15, { duration: 0.6 }); }
};
$('#radioList').onclick = e => {
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
$('#unitList').onclick = e => { const c = e.target.closest('[data-unit]'); if (!c) return; const u = S.units.find(x => x.id == c.dataset.unit); if (u) { map.flyTo([u.lat, u.lng], 15, { duration: 0.6 }); u.marker.openTooltip(); } };
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
  if (c) transferCall(c); else log('Er wacht geen oproep om door te schakelen.', '#38bdf8');
};
$('#questions').onclick = e => { const b = e.target.closest('[data-q]'); if (b) askQuestion(b.dataset.q); };
$('#callProto').onchange = e => { if (!currentCall) return; currentCall.protoId = e.target.value; if (e.target.value && !currentCall.prio) currentCall.prio = TYPE_BY_ID[e.target.value].prio; renderCall(); };
$('#callPrio').onclick = e => { const b = e.target.closest('[data-prio]'); if (b && currentCall) { currentCall.prio = +b.dataset.prio; renderCall(); } };
$('#callAccept').onclick = acceptCall; $('#callReject').onclick = rejectCall; $('#callTransfer').onclick = () => transferCall();
$('#dispUnits').onclick = e => {
  const r = e.target.closest('[data-id]'); if (!r) return; const id = +r.dataset.id;
  dispSel.has(id) ? dispSel.delete(id) : dispSel.add(id); renderDispatch();
};
$('#dispOnlyNeeded').onchange = renderDispatch;
$('#dispAuto').onclick = autoSuggest;
$('#dispCancel').onclick = () => { hide('#dispatchModal'); dispInc = null; };
$('#dispSend').onclick = sendSelected;
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
$('#startGame').onclick = () => {
  if (!S.pendingCities.length) return;
  if (!$('#keepProgress').checked) { Object.assign(S, { credits: 10000, xp: 0, done: 0, failed: 0, transfers: 0, normHit: 0, normTotal: 0, extraVehicles: {}, customStations: [] }); }
  S.player = $('#pName').value.trim(); S.day = $('#pDay').value; S.start = $('#pStart').value;
  if (S.start === 'now') { const d = new Date(); S.startSec = d.getHours() * 3600 + d.getMinutes() * 60; }
  else { const [h, m] = S.start.split(':').map(Number); S.startSec = h * 3600 + m * 60; }
  S.cities = [...S.pendingCities]; S.pendingCities = null; S.time = 0; S.nextHospTick = 0; currentCall = null;
  { const d = new Date(), wd = d.getDay(), we = wd === 0 || wd === 6;
    if (S.day === 'weekend' && !we) d.setDate(d.getDate() + (6 - wd));
    if (S.day === 'werkdag' && we) d.setDate(d.getDate() + (wd === 6 ? 2 : 1));
    d.setHours(0, 0, 0, 0); S.baseDate = d.getTime(); }
  S.incNo = 100 + Math.floor(Math.random() * 60); S.logbook = []; setWeather(true);
  ['#callModal', '#dispatchModal', '#hospModal'].forEach(hide);
  showGame(); save(); buildWorld(); S.running = true;
  shiftHandover();
  log(`🟢 Dienst gestart${S.player ? ` voor <b>${esc(S.player)}</b>` : ''} in <b>${esc(regionLabel())}</b>. Succes!`, '#22c55e');
  radio('Meldkamer', `Dienst gestart om ${clockStr()}. Alle ploegen: ${regionLabel()} is bemand.`, { me: true });
};
document.addEventListener('keydown', e => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
  if (e.key === 'Escape') { ['#callModal', '#dispatchModal', '#buildModal', '#hospModal'].forEach(hide); dispInc = null; hospUnit = null; stopBuild(); currentCall = null; }
  if (typing) return;
  if (e.code === 'KeyT' && !e.repeat) pttStart();
  if (e.key === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); }
});
document.addEventListener('keyup', e => { if (e.code === 'KeyT') pttStop(); });

// ---------- Start ----------
load();
applyTheme();
fillHomeStats();
$('#unitFilterType').innerHTML = '<option value="">Alle types</option>' + Object.entries(VEHICLE_TYPES).map(([k, v]) => `<option value="${k}">${k} · ${v.name}</option>`).join('');
$('#btnSound').textContent = S.sound ? '🔊' : '🔇';
$('#btnVoice').style.opacity = S.voice ? 1 : 0.4;
if (!S.cities.length) S.cities = PROVINCES[0].cities.map(c => c.id);
openStart();
requestAnimationFrame(tick);
