'use strict';
/* ==========================================================
   Meldkamer 112 — dispatch simulator
   ========================================================== */

const SAVE_KEY = 'meldkamer112_save_v1';
const DRIVE_COMPRESS = 3;          // rijtijden worden x3 sneller afgespeeld
const CALL_TIMEOUT = 75;           // s voor een oproep die niet beantwoord wordt
const HOSPITAL_TIME = 20;          // s overdracht in ziekenhuis

const CITY_BY_ID = {};
PROVINCES.forEach(p => p.cities.forEach(c => { c.prov = p.id; CITY_BY_ID[c.id] = c; }));

// ---------- State ----------
const S = {
  credits: 10000, xp: 0, done: 0, failed: 0,
  time: 0, speed: 1, sound: true,
  cities: [],              // gekozen city ids
  extraVehicles: {},       // stationId -> [types]
  customStations: [],      // {id, type, name, lat, lng, cityId}
  stations: [], units: [], incidents: [], calls: [],
  nextId: 1, nextSpawn: 5, running: false,
};

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (d) Object.assign(S, {
      credits: d.credits ?? S.credits, xp: d.xp || 0, done: d.done || 0, failed: d.failed || 0,
      cities: d.cities || [], extraVehicles: d.extraVehicles || {}, customStations: d.customStations || [], sound: d.sound !== false,
    });
  } catch (e) { /* geen opslag beschikbaar */ }
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      credits: S.credits, xp: S.xp, done: S.done, failed: S.failed, cities: S.cities,
      extraVehicles: S.extraVehicles, customStations: S.customStations, sound: S.sound,
    }));
  } catch (e) { /* negeren */ }
}

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const level = () => Math.floor(Math.sqrt(S.xp / 400)) + 1;
const fmtTime = s => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function offsetKm(lat, lng, north, east) {
  return [lat + north / 111.32, lng + east / (111.32 * Math.cos(lat * Math.PI / 180))];
}
function distM(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function log(msg, color) {
  const d = document.createElement('div'); d.innerHTML = msg; if (color) d.style.borderLeftColor = color;
  $('#log').prepend(d); setTimeout(() => d.remove(), 8000);
  while ($('#log').children.length > 8) $('#log').lastChild.remove();
}

// ---------- Geluid ----------
let audioCtx = null;
function beep(freq = 880, dur = 0.15, times = 2) {
  if (!S.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'square'; g.gain.value = 0.04;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * dur * 1.6; o.start(t); o.stop(t + dur);
    }
  } catch (e) { /* geen audio */ }
}

// ---------- Kaart ----------
const map = L.map('map', { zoomControl: true, preferCanvas: false }).setView([50.85, 4.35], 8);
const baseLayers = {
  'Donker': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap-bijdragers &copy; CARTO' }),
  'Straten (OSM)': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19,
    attribution: '&copy; OpenStreetMap-bijdragers' }),
};
baseLayers['Donker'].addTo(map);
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
  if (!res) { // rechte lijn, 1.35x omweg, ~45 km/u gemiddeld
    const d = distM(a, b) * 1.35;
    res = { pts: [a, b], dist: d, dur: d / 12.5 };
  }
  routeCache.set(key, res);
  return res;
}
function prepRoute(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distM(pts[i - 1], pts[i]));
  return cum;
}
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
  S.stations = []; S.units = []; S.incidents = []; S.calls = [];
  for (const cid of S.cities) {
    const c = CITY_BY_ID[cid]; if (!c) continue;
    const fleet = DEFAULT_FLEET[c.size];
    for (const type of Object.keys(STATION_TYPES)) {
      const [n, e] = STATION_OFFSETS[type];
      const [lat, lng] = offsetKm(c.lat, c.lng, n * (0.6 + c.size * 0.2), e * (0.6 + c.size * 0.2));
      const name = type === 'hosp' ? `AZ ${c.name}` : `${STATION_TYPES[type].name} ${c.name}`;
      addStation({ id: `${cid}-${type}`, type, name, lat, lng, cityId: cid }, fleet[type]);
    }
  }
  for (const cs of S.customStations) if (S.cities.includes(cs.cityId)) addStation(cs, []);
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
  }).bindTooltip(st.name).addTo(layers.stations);
  st.marker.on('click', () => { switchTab('stations'); const el = document.getElementById('st-' + st.id); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
  [...baseFleet, ...(S.extraVehicles[st.id] || [])].forEach(t => addUnit(st, t));
}

function addUnit(st, type) {
  st.unitCount[type] = (st.unitCount[type] || 0) + 1;
  const city = CITY_BY_ID[st.cityId];
  const VT = VEHICLE_TYPES[type];
  const u = {
    id: S.nextId++, type, stationId: st.id, status: 1, lat: st.lat, lng: st.lng, incidentId: null, move: null, waitUntil: 0,
    name: `${VT.short} ${city ? city.name.split(' ')[0] : st.name} ${st.unitCount[type]}`,
  };
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
  // in de post: verbergen om de kaart overzichtelijk te houden
  if (s === 1) { if (layers.units.hasLayer(u.marker)) layers.units.removeLayer(u.marker); }
  else if (!layers.units.hasLayer(u.marker)) layers.units.addLayer(u.marker);
  dirty = true;
}
const stationOf = u => S.stations.find(s => s.id === u.stationId);

// ---------- Oproepen & incidenten ----------
function availableTypes() {
  const lv = level();
  const have = new Set(S.units.map(u => u.type));
  return INCIDENT_TYPES.filter(t => (t.minLevel || 0) < lv + 1 && Object.keys(t.need).every(k => have.has(k)));
}
function spawnCall() {
  if (!S.cities.length) return;
  const types = availableTypes(); if (!types.length) return;
  const total = types.reduce((a, t) => a + t.weight, 0);
  let r = Math.random() * total, type = types[0];
  for (const t of types) { r -= t.weight; if (r <= 0) { type = t; break; } }
  // stad kiezen, gewogen naar grootte
  const cw = S.cities.map(id => CITY_BY_ID[id].size ** 1.5), cwt = cw.reduce((a, b) => a + b, 0);
  let rc = Math.random() * cwt, city = CITY_BY_ID[S.cities[0]];
  for (let i = 0; i < S.cities.length; i++) { rc -= cw[i]; if (rc <= 0) { city = CITY_BY_ID[S.cities[i]]; break; } }
  const spread = 0.8 + city.size * 0.7;
  const [lat, lng] = offsetKm(city.lat, city.lng, gauss() * spread, gauss() * spread);
  const call = {
    id: S.nextId++, typeId: type.id, lat, lng, cityId: city.id, created: S.time,
    addr: `${pick(STREETS)} ${Math.floor(rnd(1, 180))}, ${city.name}`,
    text: pick(type.calls), fake: Math.random() < 0.05,
  };
  if (call.fake) call.text = pick(['Hallo? Ja… euh, nee sorry, verkeerd nummer.', '*gegiechel* … *opgehangen*', 'Is dit de pizzeria?']);
  S.calls.push(call);
  beep(950, 0.12, 3);
  log(`📞 Nieuwe oproep uit <b>${esc(city.name)}</b>`, '#ef4444');
  dirty = true;
}

let currentCall = null;
function openCall(id) {
  const c = S.calls.find(x => x.id === id); if (!c) return;
  currentCall = c;
  const T = INCIDENT_TYPES.find(t => t.id === c.typeId);
  $('#callTitle').textContent = `Oproep 112 · ${CITY_BY_ID[c.cityId].name}`;
  $('#callText').textContent = '“' + c.text + '”';
  $('#callAddr').textContent = c.fake ? 'onbekend' : c.addr;
  $('#callType').textContent = c.fake ? '— (geen hulpvraag)' : `${T.icon} ${T.name}`;
  $('#callNeed').innerHTML = c.fake ? '-' : needChips(T.need);
  map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  show('#callModal');
}
function needChips(need, have) {
  return Object.entries(need).map(([k, n]) => {
    let cls = '';
    if (have) { const h = have[k] || { scene: 0, way: 0 }; cls = h.scene >= n ? 'ok' : (h.scene + h.way >= n ? 'way' : 'miss'); }
    const txt = have ? `${(have[k]?.scene || 0)}/${n}` : `${n}x`;
    return `<span class="chip ${cls}" title="${VEHICLE_TYPES[k].name}">${txt} ${k}</span>`;
  }).join(' ');
}
function acceptCall() {
  const c = currentCall; if (!c) return;
  S.calls = S.calls.filter(x => x !== c); hide('#callModal'); currentCall = null;
  if (c.fake) { S.xp = Math.max(0, S.xp - 30); S.failed++; log('⚠️ Dat was een valse oproep — onnodig incident aangemaakt (-30 XP).', '#f59e0b'); dirty = true; return; }
  createIncident(c);
}
function rejectCall() {
  const c = currentCall; if (!c) return;
  S.calls = S.calls.filter(x => x !== c); hide('#callModal'); currentCall = null;
  if (c.fake) { S.xp += 20; S.credits += 50; log('👍 Valse oproep correct afgehandeld (+20 XP).', '#22c55e'); }
  else { S.failed++; S.xp = Math.max(0, S.xp - 60); log('❌ Echte noodoproep weggedrukt! (-60 XP)', '#ef4444'); }
  dirty = true;
}
function createIncident(c) {
  const T = INCIDENT_TYPES.find(t => t.id === c.typeId);
  const nUnits = Object.values(T.need).reduce((a, b) => a + b, 0);
  const inc = { id: c.id, typeId: T.id, lat: c.lat, lng: c.lng, addr: c.addr, cityId: c.cityId, created: S.time,
    patience: 240 + nUnits * 30, waited: 0, progress: 0, state: 'open' };
  inc.marker = L.marker([inc.lat, inc.lng], {
    icon: L.divIcon({ className: '', html: `<div class="mk mk-inc">${T.icon}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] }),
    zIndexOffset: 1000,
  }).bindTooltip(`${T.name} · ${esc(c.addr)}`).addTo(layers.incidents);
  inc.marker.on('click', () => openDispatch(inc.id));
  S.incidents.push(inc);
  dirty = true;
  openDispatch(inc.id);
}
function incStatus(inc) {
  const have = {};
  for (const u of S.units) if (u.incidentId === inc.id && (u.status === 2 || u.status === 3)) {
    have[u.type] = have[u.type] || { scene: 0, way: 0 };
    if (u.status === 3) have[u.type].scene++; else have[u.type].way++;
  }
  return have;
}
function needsMet(inc) {
  const T = INCIDENT_TYPES.find(t => t.id === inc.typeId), h = incStatus(inc);
  return Object.entries(T.need).every(([k, n]) => (h[k]?.scene || 0) >= n);
}

// ---------- Alarmeren ----------
let dispInc = null, dispSel = new Set();
function openDispatch(id) {
  const inc = S.incidents.find(i => i.id === id); if (!inc) return;
  dispInc = inc; dispSel = new Set();
  const T = INCIDENT_TYPES.find(t => t.id === inc.typeId);
  $('#dispTitle').textContent = `${T.icon} ${T.name} — ${inc.addr}`;
  renderDispatch();
  show('#dispatchModal');
}
function dispCandidates() {
  const T = INCIDENT_TYPES.find(t => t.id === dispInc.typeId);
  const only = $('#dispOnlyNeeded').checked;
  return S.units
    .filter(u => (u.status === 1 || u.status === 5) && (!only || T.need[u.type]))
    .map(u => ({ u, d: distM([u.lat, u.lng], [dispInc.lat, dispInc.lng]) }))
    .sort((a, b) => a.d - b.d).slice(0, 60);
}
function etaEstimate(u, d) { return d * 1.35 / 12.5 / VEHICLE_TYPES[u.type].speed / DRIVE_COMPRESS; }
function renderDispatch() {
  if (!dispInc) return;
  const T = INCIDENT_TYPES.find(t => t.id === dispInc.typeId);
  $('#dispNeed').innerHTML = '<b style="margin-right:6px">Benodigd:</b> ' + needChips(T.need, incStatus(dispInc));
  const list = dispCandidates();
  $('#dispUnits').innerHTML = list.length ? list.map(({ u, d }) => {
    const VT = VEHICLE_TYPES[u.type];
    return `<div class="unit-row ${dispSel.has(u.id) ? 'sel' : ''}" data-id="${u.id}">
      <input type="checkbox" ${dispSel.has(u.id) ? 'checked' : ''}>
      <span class="tag" style="background:${VT.color}">${VT.short}</span>
      <span>${esc(u.name)} <span class="st st${u.status}">${u.status}</span><br><small class="muted">${esc(stationOf(u)?.name || '')}</small></span>
      <span>${(d / 1000).toFixed(1)} km</span>
      <span class="eta">~${fmtTime(etaEstimate(u, d))}</span></div>`;
  }).join('') : '<p class="empty">Geen beschikbare voertuigen in de buurt. Koop extra voertuigen in het tabblad Posten.</p>';
  $('#dispCount').textContent = dispSel.size;
  $('#dispSend').disabled = !dispSel.size;
}
function autoSuggest() {
  const T = INCIDENT_TYPES.find(t => t.id === dispInc.typeId), have = incStatus(dispInc);
  const all = S.units.filter(u => u.status === 1 || u.status === 5)
    .map(u => ({ u, d: distM([u.lat, u.lng], [dispInc.lat, dispInc.lng]) })).sort((a, b) => a.d - b.d);
  dispSel = new Set();
  for (const [k, n] of Object.entries(T.need)) {
    let missing = n - ((have[k]?.scene || 0) + (have[k]?.way || 0));
    for (const { u } of all) { if (missing <= 0) break; if (u.type === k) { dispSel.add(u.id); missing--; } }
  }
  renderDispatch();
}
async function sendSelected() {
  const inc = dispInc; if (!inc) return;
  const ids = [...dispSel]; hide('#dispatchModal'); dispInc = null;
  for (const id of ids) {
    const u = S.units.find(x => x.id === id);
    if (!u || (u.status !== 1 && u.status !== 5)) continue;
    u.incidentId = inc.id; setStatus(u, 2); u.move = null;
    driveTo(u, [inc.lat, inc.lng], 1.25, () => { if (u.incidentId === inc.id) { setStatus(u, 3); log(`🚨 ${esc(u.name)} ter plaatse`, VEHICLE_TYPES[u.type].color); } });
  }
  if (ids.length) beep(600, 0.1, 1);
}
async function driveTo(u, dest, urgent, onArrive) {
  const token = (u.moveToken = (u.moveToken || 0) + 1);
  const r = await getRoute([u.lat, u.lng], dest);
  if (u.moveToken !== token) return; // intussen een andere opdracht
  const dur = Math.max(4, r.dur / VEHICLE_TYPES[u.type].speed / DRIVE_COMPRESS / urgent);
  u.move = { pts: r.pts, cum: prepRoute(r.pts), dur, t: 0, onArrive };
  if (u.line) layers.routes.removeLayer(u.line);
  u.line = L.polyline(r.pts, { color: VEHICLE_TYPES[u.type].color, weight: 3, opacity: 0.55, dashArray: urgent > 1 ? null : '4 6' }).addTo(layers.routes);
}
function returnToStation(u) {
  u.incidentId = null; setStatus(u, 5);
  const st = stationOf(u);
  driveTo(u, [st.lat, st.lng], 1, () => { setStatus(u, 1); });
}

// ---------- Afronden ----------
function completeIncident(inc) {
  const T = INCIDENT_TYPES.find(t => t.id === inc.typeId);
  const onScene = S.units.filter(u => u.incidentId === inc.id);
  const speedBonus = Math.max(0, 1 - inc.waited / inc.patience);
  const reward = Math.round(T.reward * (0.7 + 0.6 * speedBonus));
  S.credits += reward; S.xp += Math.round(T.reward / 10); S.done++;
  log(`✅ <b>${T.name}</b> afgehandeld (+€${reward})`, '#22c55e');
  let transported = false;
  for (const u of onScene) {
    if (u.status === 3 && T.transport && !transported && u.type === 'AMB') {
      transported = true; u.incidentId = null; setStatus(u, 4);
      const hosp = nearestHospital([u.lat, u.lng]);
      if (hosp) { driveTo(u, [hosp.lat, hosp.lng], 1.1, () => { u.waitUntil = S.time + HOSPITAL_TIME; u.atHospital = true; }); continue; }
    }
    if (u.status === 2) { u.incidentId = null; returnToStation(u); continue; }
    returnToStation(u);
  }
  removeIncident(inc);
}
function failIncident(inc) {
  const T = INCIDENT_TYPES.find(t => t.id === inc.typeId);
  S.failed++; S.xp = Math.max(0, S.xp - 50); S.credits = Math.max(0, S.credits - Math.round(T.reward / 3));
  log(`❌ <b>${T.name}</b> in ${esc(CITY_BY_ID[inc.cityId].name)} liep uit de hand — te laat!`, '#ef4444');
  S.units.filter(u => u.incidentId === inc.id).forEach(returnToStation);
  removeIncident(inc);
}
function removeIncident(inc) {
  layers.incidents.removeLayer(inc.marker);
  S.incidents = S.incidents.filter(i => i !== inc);
  if (dispInc === inc) { hide('#dispatchModal'); dispInc = null; }
  save(); dirty = true;
}
function nearestHospital(p) {
  let best = null, bd = Infinity;
  for (const s of S.stations) if (s.type === 'hosp') { const d = distM(p, [s.lat, s.lng]); if (d < bd) { bd = d; best = s; } }
  return best;
}

// ---------- Hoofdlus ----------
let dirty = true, last = performance.now(), uiTimer = 0;
function tick(now) {
  const realDt = Math.min(0.5, (now - last) / 1000); last = now;
  const dt = realDt * S.speed;
  if (S.running && dt > 0) {
    S.time += dt;
    // spawnen
    if (S.time >= S.nextSpawn) {
      const cap = 4 + level() * 2 + Math.floor(Math.sqrt(S.cities.length));
      if (S.calls.length + S.incidents.length < cap) spawnCall();
      const base = 38 / Math.sqrt(Math.max(1, S.cities.length)) / (1 + level() * 0.08);
      S.nextSpawn = S.time + Math.max(7, base * rnd(0.6, 1.4));
    }
    // oproepen die te lang wachten
    for (const c of [...S.calls]) if (S.time - c.created > CALL_TIMEOUT && c !== currentCall) {
      S.calls = S.calls.filter(x => x !== c);
      if (!c.fake) { S.failed++; S.xp = Math.max(0, S.xp - 40); log('📵 Een beller hing op — de oproep werd niet tijdig beantwoord.', '#ef4444'); }
      dirty = true;
    }
    // voertuigen bewegen
    for (const u of S.units) {
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
        u.atHospital = false; log(`🏥 ${esc(u.name)} patiënt overgedragen`, '#a855f7'); returnToStation(u);
      }
    }
    // incidenten
    for (const inc of [...S.incidents]) {
      const T = INCIDENT_TYPES.find(t => t.id === inc.typeId);
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

// ---------- UI ----------
function renderUI() {
  $('#clock').textContent = fmtTime(S.time);
  $('#credits').textContent = '€' + S.credits.toLocaleString('nl-BE');
  $('#level').textContent = level(); $('#xp').textContent = S.xp;
  $('#done').textContent = S.done; $('#failed').textContent = S.failed;
  const n = S.calls.length; $('#callBadge').textContent = n; $('#callBadge').classList.toggle('hidden', !n);
  // oproepen
  $('#incomingList').innerHTML = n ? S.calls.map(c => {
    const left = Math.max(0, CALL_TIMEOUT - (S.time - c.created));
    return `<div class="card ringing" data-call="${c.id}"><div class="row"><span class="title">📞 Oproep · ${esc(CITY_BY_ID[c.cityId].name)}</span><span class="sub">${fmtTime(left)}</span></div>
      <div class="bar timer"><div style="width:${left / CALL_TIMEOUT * 100}%"></div></div></div>`;
  }).join('') : '<p class="empty">Geen oproepen in de wachtrij.</p>';
  // incidenten
  $('#incidentList').innerHTML = S.incidents.length ? S.incidents.map(inc => {
    const T = INCIDENT_TYPES.find(t => t.id === inc.typeId);
    const pct = inc.state === 'working' ? inc.progress / T.dur * 100 : 0;
    const pat = Math.max(0, 1 - inc.waited / inc.patience) * 100;
    return `<div class="card" data-inc="${inc.id}"><div class="row"><span class="title">${T.icon} ${T.name}</span>
      <button class="small" data-alarm="${inc.id}">Alarmeren</button></div>
      <div class="sub">${esc(inc.addr)}</div>
      <div class="chips">${needChips(T.need, incStatus(inc))}</div>
      ${inc.state === 'working' ? `<div class="bar"><div style="width:${pct}%"></div></div>` : `<div class="bar timer" title="Resterende tijd"><div style="width:${pat}%;background:${pat < 30 ? '#ef4444' : ''}"></div></div>`}
    </div>`;
  }).join('') : '<p class="empty">Geen actieve incidenten.</p>';
  if ($('#tab-units').classList.contains('active')) renderUnits();
  if (!$('#dispatchModal').classList.contains('hidden') && dispInc) {
    $('#dispNeed').innerHTML = '<b style="margin-right:6px">Benodigd:</b> ' + needChips(INCIDENT_TYPES.find(t => t.id === dispInc.typeId).need, incStatus(dispInc));
  }
}
const STATUS_TXT = { 1: 'Beschikbaar in post', 2: 'Onderweg (prio)', 3: 'Ter plaatse', 4: 'Patiënttransport', 5: 'Terug naar post' };
function renderUnits() {
  const fc = $('#unitFilterCity').value, fs = $('#unitFilterStatus').value;
  const list = S.units.filter(u => (!fc || stationOf(u)?.cityId === fc) && (!fs || u.status == fs));
  $('#unitList').innerHTML = list.slice(0, 300).map(u => {
    const VT = VEHICLE_TYPES[u.type];
    return `<div class="card" data-unit="${u.id}"><div class="row"><span><span class="st st${u.status}">${u.status}</span> <b style="color:${VT.color}">${VT.short}</b> ${esc(u.name)}</span></div>
      <div class="sub">${STATUS_TXT[u.status]} · ${esc(stationOf(u)?.name || '')}</div></div>`;
  }).join('') + (list.length > 300 ? `<p class="empty">… en nog ${list.length - 300} voertuigen (gebruik de filter)</p>` : '') || '<p class="empty">Geen voertuigen.</p>';
}
function renderStations() {
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
  const sel = $('#unitFilterCity');
  sel.innerHTML = '<option value="">Alle steden</option>' + S.cities.map(id => `<option value="${id}">${esc(CITY_BY_ID[id].name)}</option>`).join('');
  renderStations(); renderUnits(); dirty = true;
}
function regionLabel() {
  const n = S.cities.length, all = Object.keys(CITY_BY_ID).length;
  if (n === all) return 'Heel België';
  if (n === 1) return CITY_BY_ID[S.cities[0]].name;
  const full = PROVINCES.filter(p => p.cities.every(c => S.cities.includes(c.id)));
  const fullIds = new Set(full.flatMap(p => p.cities.map(c => c.id)));
  const rest = S.cities.filter(id => !fullIds.has(id));
  const parts = [...full.map(p => p.name), ...rest.map(id => CITY_BY_ID[id].name)];
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

// ---------- Regiokeuze ----------
function renderRegionTree(filter = '') {
  const f = filter.trim().toLowerCase();
  const chosen = new Set(S.pendingCities || S.cities);
  $('#regionTree').innerHTML = PROVINCES.map(p => {
    const cities = p.cities.filter(c => !f || c.name.toLowerCase().includes(f) || p.name.toLowerCase().includes(f));
    if (!cities.length) return '';
    const allOn = p.cities.every(c => chosen.has(c.id)), someOn = p.cities.some(c => chosen.has(c.id));
    return `<div class="prov"><label class="chk"><input type="checkbox" data-prov="${p.id}" ${allOn ? 'checked' : ''} ${!allOn && someOn ? 'data-ind="1"' : ''}> ${p.name}</label>
      <div class="cities">${cities.map(c => `<label><input type="checkbox" data-city="${c.id}" ${chosen.has(c.id) ? 'checked' : ''}> ${c.name}</label>`).join('')}</div></div>`;
  }).join('');
  $$('#regionTree [data-ind]').forEach(el => el.indeterminate = true);
  $('#selCount').textContent = `${chosen.size} ${chosen.size === 1 ? 'stad' : 'steden'} gekozen`;
  $('#startGame').disabled = !chosen.size;
}
function openRegion() {
  S.pendingCities = [...S.cities]; S.running = false;
  $('#citySearch').value = ''; renderRegionTree(); show('#regionModal');
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
  $('#buildName').value = `${STATION_TYPES.fire.name} ${city.name} 2`;
  $('#buildType').onchange = () => { $('#buildName').value = `${STATION_TYPES[$('#buildType').value].name} ${city.name} ${S.stations.filter(s => s.cityId === city.id && s.type === $('#buildType').value).length + 1}`; };
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
$$('.speed button').forEach(b => b.onclick = () => {
  S.speed = +b.dataset.speed; $$('.speed button').forEach(x => x.classList.toggle('active', x === b));
});
$('#btnSound').onclick = () => { S.sound = !S.sound; $('#btnSound').textContent = S.sound ? '🔊' : '🔇'; save(); };
$('#btnRegion').onclick = openRegion;
$('#incomingList').onclick = e => { const c = e.target.closest('[data-call]'); if (c) openCall(+c.dataset.call); };
$('#incidentList').onclick = e => {
  const a = e.target.closest('[data-alarm]'); if (a) { openDispatch(+a.dataset.alarm); return; }
  const c = e.target.closest('[data-inc]'); if (c) { const inc = S.incidents.find(i => i.id == c.dataset.inc); if (inc) map.flyTo([inc.lat, inc.lng], 15, { duration: 0.6 }); }
};
$('#unitList').onclick = e => { const c = e.target.closest('[data-unit]'); if (!c) return; const u = S.units.find(x => x.id == c.dataset.unit); if (u) { map.flyTo([u.lat, u.lng], 15, { duration: 0.6 }); u.marker.openTooltip(); } };
$('#stationList').onclick = e => {
  const b = e.target.closest('[data-buy]'); if (b) { const [s, t] = b.dataset.buy.split('|'); buyVehicle(s, t); return; }
  const c = e.target.closest('[data-st]'); if (c) { const st = S.stations.find(s => s.id === c.dataset.st); if (st) map.flyTo([st.lat, st.lng], 15, { duration: 0.6 }); }
};
$('#unitFilterCity').onchange = renderUnits; $('#unitFilterStatus').onchange = renderUnits;
$('#callAccept').onclick = acceptCall; $('#callReject').onclick = rejectCall;
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

$('#regionTree').onchange = e => {
  const set = new Set(S.pendingCities);
  if (e.target.dataset.prov) {
    const p = PROVINCES.find(x => x.id === e.target.dataset.prov);
    p.cities.forEach(c => e.target.checked ? set.add(c.id) : set.delete(c.id));
  } else if (e.target.dataset.city) {
    e.target.checked ? set.add(e.target.dataset.city) : set.delete(e.target.dataset.city);
  }
  S.pendingCities = [...set]; renderRegionTree($('#citySearch').value);
};
$('#citySearch').oninput = e => renderRegionTree(e.target.value);
$('#selAll').onclick = () => { S.pendingCities = Object.keys(CITY_BY_ID); renderRegionTree($('#citySearch').value); };
$('#selNone').onclick = () => { S.pendingCities = []; renderRegionTree($('#citySearch').value); };
$('#startGame').onclick = () => {
  if (!S.pendingCities.length) return;
  if (!$('#keepProgress').checked) { S.credits = 10000; S.xp = 0; S.done = 0; S.failed = 0; S.extraVehicles = {}; S.customStations = []; }
  // volgorde volgens de lijst behouden
  const order = Object.keys(CITY_BY_ID);
  S.cities = order.filter(id => S.pendingCities.includes(id));
  S.pendingCities = null; S.time = 0; currentCall = null;
  hide('#regionModal'); hide('#callModal'); hide('#dispatchModal');
  save(); buildWorld(); S.running = true;
  log(`🟢 Dienst gestart in <b>${esc(regionLabel())}</b>. Succes!`, '#22c55e');
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { ['#callModal', '#dispatchModal', '#buildModal'].forEach(hide); dispInc = null; stopBuild(); currentCall = null; }
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); const sp = S.speed ? 0 : 1; $$('.speed button').find(b => +b.dataset.speed === sp).click(); }
});

// ---------- Start ----------
load();
$('#btnSound').textContent = S.sound ? '🔊' : '🔇';
if (!S.cities.length) S.cities = ['brugge'];
openRegion();
requestAnimationFrame(tick);
