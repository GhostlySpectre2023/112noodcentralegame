'use strict';
/* Zelfgetekende voertuigicoontjes (zijaanzicht) met Battenburg-blokken.
   Vormen naar type voertuig, zonder merklogo's of officiële emblemen.
   viewBox 120 x 50, voertuig rijdt naar rechts. */

const LIVERY = {
  med: ['#ffd400', '#00843d'],   // geel-groen
  fire: ['#ffd400', '#c8001a'],  // geel-rood
  pol: ['#ffd400', '#1f3c88'],   // geel-blauw
};

function battenburg(x0, x1, y, h, colors, block, clip) {
  let out = `<g${clip ? ` clip-path="url(#${clip})"` : ''}>`;
  const rh = h / 2;
  for (let r = 0; r < 2; r++) {
    let i = r;
    for (let x = x0; x < x1; x += block, i++) out += `<rect x="${x.toFixed(1)}" y="${(y + r * rh).toFixed(1)}" width="${Math.min(block, x1 - x).toFixed(1)}" height="${rh}" fill="${colors[i % 2]}"/>`;
  }
  return out + '</g>';
}
function wheel(cx, cy, r = 7) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a1a1a"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="#b9bec4"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="#7d838a" stroke-width=".8" stroke-dasharray="1.6 1.4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="#555"/>`;
}
function arch(cx, cy, r = 8.6) { return `<path d="M${cx - r} ${cy} a${r} ${r} 0 0 1 ${2 * r} 0" fill="#2b2b2b"/>`; }
function lightbar(x, y, w) {
  return `<rect x="${x}" y="${y}" width="${w}" height="3.2" rx="1.4" fill="#e8ecf2" stroke="#666" stroke-width=".4"/>` +
    `<rect x="${x + 1}" y="${y + .6}" width="${w / 2 - 1.5}" height="2" rx=".8" fill="#2463ff"/><rect x="${x + w / 2 + .5}" y="${y + .6}" width="${w / 2 - 1.5}" height="2" rx=".8" fill="#2463ff"/>`;
}
const glass = '#7fa8c9';
const defs = (id, path) => `<defs><clipPath id="${id}"><path d="${path}"/></clipPath>
  <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>`;
const wrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50">${inner}</svg>`;

// Ziekenwagen: hoge bestelwagen met hoog dak en lange wielbasis
function ambulanceSVG(colors) {
  const body = 'M6 9 Q6 6 9 6 H86 Q90 6 92 9 L104 23 Q114 25 115 30 V38 Q115 41 112 41 H6 Z';
  return wrap(`${defs('b1', body)}
    <path d="${body}" fill="#fafafa" stroke="#3a3a3a" stroke-width=".9"/>
    ${battenburg(6, 116, 27, 9, colors, 6, 'b1')}
    <rect x="6" y="36" width="109" height="1.2" fill="#00843d" clip-path="url(#b1)"/>
    <path d="M89 10 L101 23 H89 Z" fill="${glass}" stroke="#3a3a3a" stroke-width=".6"/>
    <rect x="72" y="11" width="13" height="10" rx="1.5" fill="${glass}"/>
    <rect x="14" y="11" width="22" height="9" rx="1.5" fill="${glass}" opacity=".85"/>
    <path d="M70 8 V38 M87 8 V38" stroke="#9a9a9a" stroke-width=".6"/>
    <rect x="104" y="30" width="9" height="3" rx="1" fill="#ffe8a3"/><rect x="5" y="30" width="3" height="5" fill="#c62828"/>
    <path d="M94 15 l2 0 l0 4 l-2 0 z" fill="#333"/>
    ${lightbar(70, 2.8, 20)}${lightbar(8, 2.8, 10)}
    <rect x="6" y="6" width="109" height="35" fill="url(#sh)" clip-path="url(#b1)"/>
    ${arch(26, 41)}${arch(95, 41)}${wheel(26, 41)}${wheel(95, 41)}`);
}
// PIT: middelgrote bestelwagen met normaal dak
function pitSVG(colors) {
  const body = 'M8 14 Q8 11 11 11 H78 Q82 11 85 14 L98 25 Q110 27 111 32 V38 Q111 41 108 41 H8 Z';
  return wrap(`${defs('b2', body)}
    <path d="${body}" fill="#fafafa" stroke="#3a3a3a" stroke-width=".9"/>
    ${battenburg(8, 112, 28, 8, colors, 6, 'b2')}
    <path d="M82 15 L95 25 H82 Z" fill="${glass}" stroke="#3a3a3a" stroke-width=".6"/>
    <rect x="62" y="15" width="17" height="9" rx="1.5" fill="${glass}"/>
    <rect x="16" y="15" width="40" height="9" rx="1.5" fill="${glass}" opacity=".85"/>
    <path d="M60 12 V38 M80 12 V38" stroke="#9a9a9a" stroke-width=".6"/>
    <rect x="100" y="31" width="9" height="3" rx="1" fill="#ffe8a3"/><rect x="7" y="31" width="3" height="5" fill="#c62828"/>
    ${lightbar(52, 7.8, 24)}
    <rect x="8" y="11" width="104" height="30" fill="url(#sh)" clip-path="url(#b2)"/>
    ${arch(28, 41)}${arch(92, 41)}${wheel(28, 41)}${wheel(92, 41)}`);
}
// MUG: grote SUV met drie zijruiten en dakrails
function mugSVG(colors) {
  const body = 'M6 26 Q6 22 10 21 L24 18 L36 9 Q38 8 42 8 H82 Q86 8 89 11 L97 19 Q112 21 114 27 V36 Q114 40 110 40 H8 Q6 40 6 37 Z';
  return wrap(`${defs('b3', body)}
    <path d="${body}" fill="#fafafa" stroke="#3a3a3a" stroke-width=".9"/>
    ${battenburg(6, 115, 26, 9, colors, 6, 'b3')}
    <path d="M39 11 L29 19 H54 V11 Z" fill="${glass}"/><rect x="57" y="11" width="16" height="8" fill="${glass}"/>
    <path d="M76 11 H84 Q86 11 88 13 L94 19 H76 Z" fill="${glass}"/>
    <path d="M38 6.6 H86" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M55 10 V38 M74 10 V38" stroke="#9a9a9a" stroke-width=".6"/>
    <rect x="104" y="26" width="9" height="3" rx="1" fill="#ffe8a3"/><rect x="5" y="25" width="3" height="5" fill="#c62828"/>
    ${lightbar(46, 3, 24)}
    <rect x="6" y="8" width="109" height="32" fill="url(#sh)" clip-path="url(#b3)"/>
    ${arch(26, 40, 9.4)}${arch(92, 40, 9.4)}${wheel(26, 40, 7.8)}${wheel(92, 40, 7.8)}`);
}
// Politie: middelgrote bestelwagen (lager dak, korte neus)
function polSVG(colors) {
  const body = 'M8 16 Q8 12 12 12 H76 Q81 12 84 15 L96 25 Q110 27 111 32 V38 Q111 41 108 41 H8 Z';
  return wrap(`${defs('b4', body)}
    <path d="${body}" fill="#fafafa" stroke="#3a3a3a" stroke-width=".9"/>
    ${battenburg(8, 112, 28, 8, colors, 6, 'b4')}
    <path d="M81 16 L93 25 H81 Z" fill="${glass}" stroke="#3a3a3a" stroke-width=".6"/>
    <rect x="60" y="16" width="18" height="9" rx="1.5" fill="${glass}"/><rect x="36" y="16" width="20" height="9" rx="1.5" fill="${glass}"/>
    <rect x="14" y="16" width="18" height="9" rx="1.5" fill="${glass}" opacity=".85"/>
    <path d="M58 13 V38 M79 13 V38" stroke="#9a9a9a" stroke-width=".6"/>
    <rect x="100" y="31" width="9" height="3" rx="1" fill="#ffe8a3"/><rect x="7" y="31" width="3" height="5" fill="#c62828"/>
    ${lightbar(44, 8.8, 26)}
    <rect x="8" y="12" width="104" height="29" fill="url(#sh)" clip-path="url(#b4)"/>
    ${arch(28, 41)}${arch(92, 41)}${wheel(28, 41)}${wheel(92, 41)}`);
}
// Brandweer: middelzware vrachtwagen, cabine boven de motor, opbouw met rolluiken
function fireSVG(colors, kind) {
  const cab = 'M86 12 Q86 9 89 9 H104 Q108 9 110 13 L114 22 V38 Q114 41 111 41 H86 Z';
  const box = kind === 'TW' ? 'M4 14 Q4 10 10 10 H80 Q85 10 85 15 V41 H4 Z' : 'M4 9 Q4 7 6 7 H83 Q85 7 85 9 V41 H4 Z';
  let top = '';
  if (kind === 'AL') top = `<rect x="6" y="2" width="76" height="4" fill="#c9cdd2" stroke="#555" stroke-width=".5"/>${Array.from({ length: 15 }, (_, i) => `<rect x="${8 + i * 5}" y="2" width="1" height="4" fill="#555"/>`).join('')}<rect x="76" y="1" width="6" height="7" fill="#888"/>`;
  if (kind === 'HV') top = `<rect x="10" y="3.5" width="30" height="3.5" rx="1" fill="#8c9096"/><rect x="50" y="4.5" width="24" height="2.5" fill="#6b6f74"/>`;
  const shutters = kind === 'TW'
    ? `<rect x="10" y="13" width="66" height="10" rx="5" fill="#a80016" opacity=".45"/>`
    : `${[8, 30, 52].map(x => `<rect x="${x}" y="10" width="19" height="15" rx="1" fill="#b30018" stroke="#7d0010" stroke-width=".5"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${x} ${12 + i * 2.2} h19" stroke="#8d0013" stroke-width=".5"/>`).join('')).join('')}`;
  return wrap(`<defs><clipPath id="fb"><path d="${box}"/></clipPath><clipPath id="fc"><path d="${cab}"/></clipPath>
    <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>
    ${top}
    <path d="${box}" fill="#d0001c" stroke="#3a3a3a" stroke-width=".9"/>
    ${shutters}
    ${battenburg(4, 86, 28, 8, colors, 6, 'fb')}
    <path d="${cab}" fill="#d0001c" stroke="#3a3a3a" stroke-width=".9"/>
    <path d="M90 12 H104 Q107 12 108 14 L111 22 H90 Z" fill="${glass}" stroke="#3a3a3a" stroke-width=".5"/>
    <path d="M98 12 V38" stroke="#7d0010" stroke-width=".6"/>
    ${battenburg(86, 115, 28, 8, colors, 6, 'fc')}
    <rect x="110" y="30" width="4" height="3" fill="#ffe8a3"/>
    ${lightbar(88, 5.8, 18)}
    <rect x="4" y="7" width="111" height="34" fill="url(#sh)"/>
    <rect x="4" y="38" width="82" height="3" fill="#333"/>
    ${arch(22, 41)}${arch(98, 41)}${wheel(22, 41, 7.4)}${wheel(98, 41, 7.4)}`);
}
// Helikopter: lichte tweemotorige met ommantelde staartrotor en sleden
function heliSVG(colors) {
  const body = 'M44 18 Q48 11 60 11 H82 Q98 11 106 22 Q110 29 104 33 H50 Q42 33 41 27 Z';
  return wrap(`<defs><clipPath id="hc"><path d="${body}"/></clipPath>
    <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>
    <rect x="16" y="3.6" width="100" height="2" rx="1" fill="#3a3a3a"/><rect x="66" y="4.5" width="4" height="6" fill="#555"/>
    <path d="M60 11 Q64 7.5 72 7.5 H80 Q86 8 88 11 Z" fill="#e6c200" stroke="#3a3a3a" stroke-width=".6"/>
    <path d="M44 20 L14 21.5 L14 24.5 L44 27 Z" fill="#ffd400" stroke="#3a3a3a" stroke-width=".7"/>
    <circle cx="13" cy="23" r="6.5" fill="#ffd400" stroke="#3a3a3a" stroke-width=".8"/><circle cx="13" cy="23" r="3.6" fill="#555"/>
    <path d="M17 17 L24 15 L24 19 Z" fill="#ffd400" stroke="#3a3a3a" stroke-width=".5"/>
    <path d="${body}" fill="#ffd400" stroke="#3a3a3a" stroke-width=".9"/>
    ${battenburg(40, 110, 25, 6, colors, 5, 'hc')}
    <path d="M86 13 Q98 14 104 22 H86 Z" fill="${glass}" stroke="#3a3a3a" stroke-width=".5"/>
    <rect x="62" y="14" width="10" height="8" rx="1.5" fill="${glass}"/><rect x="74" y="14" width="10" height="8" rx="1.5" fill="${glass}"/>
    <rect x="40" y="11" width="70" height="22" fill="url(#sh)" clip-path="url(#hc)"/>
    <path d="M56 33 L54 40 M92 33 L94 40" stroke="#3a3a3a" stroke-width="1.6"/>
    <path d="M46 40.5 H104 Q108 40.5 108 38" stroke="#3a3a3a" stroke-width="2" fill="none" stroke-linecap="round"/>`);
}

const VEHICLE_SVG = {};
function vehicleSVG(type) {
  if (VEHICLE_SVG[type]) return VEHICLE_SVG[type];
  let svg;
  switch (type) {
    case 'AMB': svg = ambulanceSVG(LIVERY.med); break;
    case 'PIT': svg = pitSVG(LIVERY.med); break;
    case 'MUG': svg = mugSVG(LIVERY.med); break;
    case 'HELI': svg = heliSVG(LIVERY.med); break;
    case 'POL': svg = polSVG(LIVERY.pol); break;
    case 'AP': case 'AL': case 'TW': case 'HV': svg = fireSVG(LIVERY.fire, type); break;
    default: svg = ambulanceSVG(LIVERY.med);
  }
  return (VEHICLE_SVG[type] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}
