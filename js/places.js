'use strict';
/* Echte adressen en plekken per stad (OpenStreetMap).
   Met de server: /api/places/:stad (gedeeld en bewaard in de database).
   Zonder server: rechtstreeks via Overpass, twee weken bewaard in de browser. */

const PLACES = {}, PLACES_LOADING = {};
const PLACE_KINDS = { thuis: ['thuis'], straat: ['thuis'], werk: ['werk'], school: ['school'], wzc: ['wzc'], sport: ['sport'], station: ['station'],
  winkel: ['winkel'], cafe: ['cafe'], park: ['park'], snelweg: ['thuis'], kruispunt: ['thuis'], parking: ['winkel', 'thuis'] };

function osmPlaceKind(t) {
  const a = t.amenity, s = t.shop, l = t.leisure;
  if (['school', 'kindergarten', 'college'].includes(a)) return 'school';
  if (['nursing_home', 'social_facility'].includes(a)) return 'wzc';
  if (['pub', 'bar', 'cafe', 'restaurant', 'fast_food'].includes(a)) return 'cafe';
  if (['supermarket', 'convenience', 'mall', 'department_store'].includes(s)) return 'winkel';
  if (t.railway === 'station' || t.public_transport === 'station') return 'station';
  if (['park', 'playground'].includes(l)) return 'park';
  if (['sports_centre', 'pitch', 'stadium', 'swimming_pool', 'fitness_centre'].includes(l)) return 'sport';
  if (t.office || t.craft || t.industrial || t.building === 'industrial' || t.building === 'warehouse') return 'werk';
  return 'thuis';
}

async function fetchPlacesDirect(cityId) {
  const key = 'mk112_places_' + cityId;
  try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 14 * 864e5) return c.d; } catch (e) { /* */ }
  const c = CITY_BY_ID[cityId], R = Math.round(1200 + c.size * 900), around = `(around:${R},${c.lat},${c.lng})`;
  const q = `[out:json][timeout:40];(nwr${around}["addr:housenumber"]["addr:street"]["building"];nwr${around}["amenity"~"^(school|kindergarten|college|nursing_home|social_facility|pub|bar|cafe|restaurant|fast_food)$"];nwr${around}["shop"~"^(supermarket|convenience|mall|department_store)$"];nwr${around}["railway"="station"];nwr${around}["leisure"~"^(park|playground|sports_centre|pitch|stadium|swimming_pool|fitness_centre)$"];);out center tags qt 1500;`;
  const j = await overpassFetch(q), out = [];
  for (const e of j.elements || []) {
    const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (lat && lng) out.push({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), kind: osmPlaceKind(t), street: t['addr:street'] || '', house: t['addr:housenumber'] || '', city: t['addr:city'] || '', name: t.name || '' });
  }
  if (out.length) try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: out })); } catch (e) { /* opslag vol */ }
  return out;
}

function loadPlaces(cityId) {
  if (PLACES[cityId]) return Promise.resolve(PLACES[cityId]);
  if (PLACES_LOADING[cityId]) return PLACES_LOADING[cityId];
  const p = (async () => {
    if (window.CONFIG?.server) {
      try { const r = await fetch('/api/places/' + encodeURIComponent(cityId)); if (r.ok) return (await r.json()).places || []; } catch (e) { /* val terug */ }
    }
    try { return await fetchPlacesDirect(cityId); } catch (e) { return []; }
  })().then(list => { PLACES[cityId] = list; delete PLACES_LOADING[cityId]; return list; });
  PLACES_LOADING[cityId] = p;
  return p;
}
// laad de adressen van de gekozen steden op de achtergrond, rustig na elkaar
async function preloadPlaces(cityIds) {
  for (const id of cityIds.slice(0, 20)) { await loadPlaces(id); await new Promise(r => setTimeout(r, window.CONFIG?.server ? 50 : 1500)); }
}

function nearestStreet(list, p) {
  let best = null, bd = Infinity;
  for (const q of list) if (q.street) { const d = (q.lat - p.lat) ** 2 + (q.lng - p.lng) ** 2; if (d < bd) { bd = d; best = q; } }
  return best;
}
// kies een echte plek van het gevraagde soort; anders een woning met huisnummer
function pickPlace(cityId, locId) {
  const list = PLACES[cityId]; if (!list || !list.length) return null;
  const kinds = PLACE_KINDS[locId] || ['thuis'];
  let pool = list.filter(p => kinds.includes(p.kind) && (p.street || p.name));
  if (!pool.length) pool = list.filter(p => p.kind === 'thuis' && p.street && p.house);
  if (!pool.length) return null;
  const p = pool[Math.floor(Math.random() * pool.length)];
  const cityName = CITY_BY_ID[cityId].name.split(' (')[0];
  let addr;
  if (p.street) addr = `${p.name && p.kind !== 'thuis' ? p.name + ', ' : ''}${p.street}${p.house ? ' ' + p.house : ''}, ${p.city || cityName}`;
  else { const n = nearestStreet(list, p); addr = `${p.name}${n ? ', ' + n.street : ''}, ${p.city || n?.city || cityName}`; }
  return { lat: p.lat, lng: p.lng, addr, kind: p.kind };
}
