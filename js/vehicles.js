'use strict';
/* Zelfgetekende voertuigicoontjes (zijaanzicht) met Battenburg-blokken.
   Eenvoudige SVG's, zonder officiële logo's of emblemen. */

const LIVERY = {
  med: ['#ffd400', '#00843d'],   // geel-groen
  fire: ['#d1001c', '#ffd400'],  // rood-geel
  pol: ['#1f3c88', '#ffd400'],   // blauw-geel
};

// twee rijen afwisselende blokken tussen x0 en x1
function battenburg(x0, x1, y, h, colors, block) {
  let out = '';
  const rows = 2, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let i = r;
    for (let x = x0; x < x1; x += block, i++) {
      const w = Math.min(block, x1 - x);
      out += `<rect x="${x}" y="${y + r * rh}" width="${w}" height="${rh}" fill="${colors[i % 2]}"/>`;
    }
  }
  return out;
}
const wheel = (cx, cy, r = 4.2) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1b1b1b"/><circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="#9aa0a6"/>`;
const lightbar = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="2.6" rx="1" fill="#1e5bff"/><rect x="${x + w / 2 - 1}" y="${y}" width="2" height="2.6" fill="#ff2a2a"/>`;
const label = (x, y, t, fill = '#fff') => `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="5.2" font-weight="700" fill="${fill}" text-anchor="middle">${t}</text>`;

function svgWrap(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 30">${inner}</svg>`;
}

// grote bestelwagen (ziekenwagen / PIT)
function vanSVG(colors, tag) {
  return svgWrap(`
    <path d="M3 8 h38 l10 0 l8 9 v6 h-56 z" fill="#ffffff" stroke="#333" stroke-width=".6"/>
    <path d="M41 8 h8 l9 9 h-17 z" fill="#ffffff" stroke="#333" stroke-width=".6"/>
    <path d="M43 10 h5.5 l6.5 7 h-12 z" fill="#9ec7e8"/>
    ${battenburg(3, 58, 17, 6, colors, 4.5)}
    <rect x="3" y="23" width="56" height="1.4" fill="#333"/>
    ${lightbar(10, 5.4, 24)}
    ${tag ? label(22, 14.2, tag, '#00843d') : ''}
    ${wheel(13, 25)}${wheel(48, 25)}`);
}
// SUV (MUG)
function suvSVG(colors, tag) {
  return svgWrap(`
    <path d="M6 11 l6 -5 h22 l8 5 h8 l7 5 v7 h-51 z" fill="#ffffff" stroke="#333" stroke-width=".6"/>
    <path d="M14 7.5 h8 v4 h-11 z M24 7.5 h9 l6 4 h-15 z" fill="#9ec7e8"/>
    ${battenburg(6, 57, 16, 6, colors, 4.5)}
    <rect x="6" y="22" width="51" height="1.4" fill="#333"/>
    ${lightbar(15, 3.6, 18)}
    ${tag ? label(46, 14.6, tag, '#d1001c') : ''}
    ${wheel(16, 24.5)}${wheel(47, 24.5)}`);
}
// personenwagen (politie)
function carSVG(colors, tag) {
  return svgWrap(`
    <path d="M4 15 l9 -6 h20 l9 6 h12 l4 3 v5 h-54 z" fill="#ffffff" stroke="#333" stroke-width=".6"/>
    <path d="M15 10 h8 v5 h-14 z M25 10 h7 l7 5 h-14 z" fill="#9ec7e8"/>
    ${battenburg(4, 58, 17.5, 5.5, colors, 4.5)}
    <rect x="4" y="23" width="54" height="1.2" fill="#333"/>
    ${lightbar(17, 6.6, 16)}
    ${tag ? label(48, 16.4, tag, '#1f3c88') : ''}
    ${wheel(15, 24.5)}${wheel(48, 24.5)}`);
}
// brandweerwagen (autopomp, tankwagen, hulpverlening, autoladder)
function truckSVG(colors, kind, tag) {
  const ladder = kind === 'AL' ? `<rect x="6" y="3.2" width="40" height="2.4" fill="#c9ccd1" stroke="#555" stroke-width=".4"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${8 + i * 4.3}" y="3.2" width=".7" height="2.4" fill="#555"/>`).join('')}` : '';
  const tank = kind === 'TW' ? `<rect x="5" y="6" width="34" height="9" rx="4" fill="#d1001c" stroke="#333" stroke-width=".5"/>` : '';
  return svgWrap(`
    <path d="M3 7 h38 v16 h-38 z" fill="#d1001c" stroke="#333" stroke-width=".6"/>
    <path d="M41 9 h10 l8 6 v8 h-18 z" fill="#d1001c" stroke="#333" stroke-width=".6"/>
    <path d="M43 11 h6.5 l6 4.2 h-12.5 z" fill="#9ec7e8"/>
    ${tank}${ladder}
    ${battenburg(3, 59, 17, 5.5, colors, 4.5)}
    <rect x="3" y="22.5" width="56" height="1.4" fill="#333"/>
    ${lightbar(43, 6.6, 12)}
    ${tag ? label(22, 13.8, tag, '#fff') : ''}
    ${wheel(11, 25)}${wheel(23, 25)}${wheel(50, 25)}`);
}
// helikopter
function heliSVG() {
  return svgWrap(`
    <rect x="6" y="3" width="52" height="1.6" rx=".8" fill="#333"/>
    <rect x="31" y="4" width="2" height="4" fill="#333"/>
    <path d="M14 9 h26 q12 0 14 8 q-2 5 -12 5 h-24 q-6 0 -6 -6 z" fill="#ffd400" stroke="#333" stroke-width=".6"/>
    <path d="M40 10 q9 1 12 7 h-12 z" fill="#9ec7e8"/>
    <path d="M14 13 h-12 l-1 -4 h3 l3 3 h7 z" fill="#ffd400" stroke="#333" stroke-width=".5"/>
    ${battenburg(16, 40, 16, 4, LIVERY.med, 4)}
    <rect x="16" y="24.5" width="28" height="1.2" fill="#333"/><rect x="20" y="22" width="1.2" height="3" fill="#333"/><rect x="38" y="22" width="1.2" height="3" fill="#333"/>`);
}

const VEHICLE_SVG = {};
function vehicleSVG(type) {
  if (VEHICLE_SVG[type]) return VEHICLE_SVG[type];
  let svg;
  switch (type) {
    case 'AMB': svg = vanSVG(LIVERY.med, 'ZW'); break;
    case 'PIT': svg = vanSVG(LIVERY.med, 'PIT'); break;
    case 'MUG': svg = suvSVG(LIVERY.med, ''); break;
    case 'HELI': svg = heliSVG(); break;
    case 'POL': svg = carSVG(LIVERY.pol, ''); break;
    case 'AP': case 'AL': case 'TW': case 'HV': svg = truckSVG(LIVERY.fire, type, type); break;
    default: svg = vanSVG(LIVERY.med, '');
  }
  return (VEHICLE_SVG[type] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}
