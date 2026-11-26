'use strict';
/* =====================================================================
   cartes.js — le dessin des cartes (faces, figures, dos).
   Tout est dessiné par code : aucune image à télécharger.
   Roi = lion (un par couleur), Reine = chatte princesse, Valet = puma.
   ===================================================================== */

const COULEURS = {
  coeur:   { sym: '♥︎', rouge: true,  nom: 'Cœur' },
  carreau: { sym: '♦︎', rouge: true,  nom: 'Carreau' },
  pique:   { sym: '♠︎', rouge: false, nom: 'Pique' },
  trefle:  { sym: '♣︎', rouge: false, nom: 'Trèfle' }
};
const ACC  = { coeur: '#c0392b', carreau: '#e08a1e', pique: '#3d4f66', trefle: '#2e8b57' };
const MANE = { coeur: '#b5472f', carreau: '#e3a21a', pique: '#4a3b57', trefle: '#6a8f3a' };
const FUR  = { coeur: '#fbf3ea', carreau: '#f2a54a', pique: '#6b6b7b', trefle: '#9fb4c7' };
const EYE  = { coeur: '#3f9bdc', carreau: '#4e9a3a', pique: '#e6b800', trefle: '#8a5bc0' };

const S = 'stroke="#2a1d0e" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
const D = '#2a1d0e';

function dessinLion(c) {
  const m = MANE[c], sym = COULEURS[c].sym;
  let t = '';
  for (let i = 0; i < 14; i++) {
    const a = i * 2 * Math.PI / 14;
    t += `<circle cx="${(50 + 31 * Math.cos(a)).toFixed(1)}" cy="${(57 + 31 * Math.sin(a)).toFixed(1)}" r="12" fill="${m}" ${S}/>`;
  }
  return t +
    `<circle cx="50" cy="57" r="31" fill="${m}"/>` +
    `<circle cx="31" cy="38" r="7.5" fill="#f0c878" ${S}/><circle cx="31" cy="38" r="3.5" fill="#e89a8a"/>` +
    `<circle cx="69" cy="38" r="7.5" fill="#f0c878" ${S}/><circle cx="69" cy="38" r="3.5" fill="#e89a8a"/>` +
    `<ellipse cx="50" cy="59" rx="22" ry="23" fill="#f0c878" ${S}/>` +
    `<ellipse cx="43.5" cy="67" rx="8" ry="6.5" fill="#fff6df"/><ellipse cx="56.5" cy="67" rx="8" ry="6.5" fill="#fff6df"/>` +
    `<ellipse cx="41" cy="52" rx="3.2" ry="3.7" fill="${D}"/><ellipse cx="59" cy="52" rx="3.2" ry="3.7" fill="${D}"/>` +
    `<circle cx="42.2" cy="50.8" r="1.1" fill="#fff"/><circle cx="60.2" cy="50.8" r="1.1" fill="#fff"/>` +
    `<path d="M34 46 L46 49.5 M66 46 L54 49.5" fill="none" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M45 58 L55 58 L50 64.5 Z" fill="#7a3b2e" ${S}/>` +
    `<path d="M50 64.5 L50 68 M50 68 Q45 73.5 40.5 70 M50 68 Q55 73.5 59.5 70" fill="none" stroke="${D}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<polygon points="33,36 34.5,17 43,26 50,10 57,26 65.5,17 67,36" fill="#f4c430" ${S}/>` +
    `<rect x="33" y="31" width="34" height="6" rx="1.5" fill="#f4c430" ${S}/>` +
    `<circle cx="50" cy="26.5" r="6.2" fill="#fff" ${S}/>` +
    `<text x="50" y="30" text-anchor="middle" font-size="10" font-weight="700" font-family="Arial,sans-serif" fill="${ACC[c]}">${sym}</text>`;
}

function dessinChatte(c) {
  const f = FUR[c], e = EYE[c], a = ACC[c];
  return `<polygon points="50,92 34,83 34,99" fill="${a}" ${S}/><polygon points="50,92 66,83 66,99" fill="${a}" ${S}/>` +
    `<polygon points="25,50 27,15 47,35" fill="${f}" ${S}/><polygon points="75,50 73,15 53,35" fill="${f}" ${S}/>` +
    `<polygon points="30,42 31,23 41,34" fill="#f3a7b5"/><polygon points="70,42 69,23 59,34" fill="#f3a7b5"/>` +
    `<ellipse cx="50" cy="60" rx="27" ry="24" fill="${f}" ${S}/>` +
    `<polygon points="37,38 38.5,25 45,31 50,19 55,31 61.5,25 63,38" fill="#f4c430" ${S}/>` +
    `<circle cx="50" cy="29.5" r="3.4" fill="${a}" ${S}/>` +
    `<circle cx="50" cy="92" r="4.5" fill="${a}" ${S}/>` +
    `<ellipse cx="40" cy="58" rx="4.5" ry="5.5" fill="${e}" ${S}/><ellipse cx="60" cy="58" rx="4.5" ry="5.5" fill="${e}" ${S}/>` +
    `<ellipse cx="40" cy="58.5" rx="1.7" ry="4.2" fill="${D}"/><ellipse cx="60" cy="58.5" rx="1.7" ry="4.2" fill="${D}"/>` +
    `<circle cx="41.5" cy="56" r="1.3" fill="#fff"/><circle cx="61.5" cy="56" r="1.3" fill="#fff"/>` +
    `<path d="M34.5 54 L30.5 50.5 M65.5 54 L69.5 50.5" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="33" cy="68" r="4.2" fill="#f3a7b5" opacity=".65"/><circle cx="67" cy="68" r="4.2" fill="#f3a7b5" opacity=".65"/>` +
    `<path d="M47 66 L53 66 L50 70 Z" fill="#e0707f" ${S}/>` +
    `<path d="M50 70 Q46 75.5 42 72 M50 70 Q54 75.5 58 72" fill="none" stroke="${D}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M29 67 L12 63 M29 70.5 L12 72.5 M71 67 L88 63 M71 70.5 L88 72.5" fill="none" stroke="${D}" stroke-width="1" opacity=".6"/>`;
}

function dessinPuma(c) {
  const a = ACC[c], T = '#c8a06a';
  return `<path d="M19 46 L22 21 L41 37 Z" fill="${T}" ${S}/><path d="M81 46 L78 21 L59 37 Z" fill="${T}" ${S}/>` +
    `<path d="M24 41 L25.5 28 L35 37 Z" fill="#6b4a33"/><path d="M76 41 L74.5 28 L65 37 Z" fill="#6b4a33"/>` +
    `<ellipse cx="50" cy="57" rx="28" ry="26" fill="${T}" ${S}/>` +
    `<ellipse cx="50" cy="69" rx="16" ry="11.5" fill="#f1e4cc"/>` +
    `<ellipse cx="39" cy="71" rx="4.5" ry="3" fill="#6b4a33" opacity=".55"/><ellipse cx="61" cy="71" rx="4.5" ry="3" fill="#6b4a33" opacity=".55"/>` +
    `<path d="M36 56 Q34.5 64 38 70 M64 56 Q65.5 64 62 70" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M32 53 Q40 46 48 53 Q40 58 32 53 Z" fill="#e8b02a" ${S}/><path d="M52 53 Q60 46 68 53 Q60 58 52 53 Z" fill="#e8b02a" ${S}/>` +
    `<ellipse cx="40" cy="53" rx="1.7" ry="3.3" fill="${D}"/><ellipse cx="60" cy="53" rx="1.7" ry="3.3" fill="${D}"/>` +
    `<path d="M32 48 L47 51.5 M68 48 L53 51.5" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M44 62 Q50 60 56 62 L50 69 Z" fill="#c96a6a" ${S}/>` +
    `<path d="M50 69 L50 73 M50 73 Q44 78.5 39 74.5 M50 73 Q56 78.5 61 74.5" fill="none" stroke="${D}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M70 38 Q95 22 90 3 Q76 12 68 36 Z" fill="${a}" ${S}/><path d="M88 8 Q78 22 70 35" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/>` +
    `<path d="M23 41 Q50 28 77 41 L77 47 Q50 34 23 47 Z" fill="${a}" ${S}/>` +
    `<circle cx="50" cy="37.2" r="3.6" fill="#f4c430" ${S}/>`;
}

// Les 12 figures et l'Œil d'Horus sont définis UNE fois, puis réutilisés avec <use>
// (beaucoup plus léger pour l'iPhone que de les redessiner à chaque carte).
function injecterDefs() {
  if (document.getElementById('defs-cartes')) return;
  let d = '';
  for (const col of Object.keys(COULEURS)) {
    d += `<g id="fig-13-${col}">${dessinLion(col)}</g>` +
         `<g id="fig-12-${col}">${dessinChatte(col)}</g>` +
         `<g id="fig-11-${col}">${dessinPuma(col)}</g>`;
  }
  d += `<symbol id="oeil" viewBox="0 0 100 60">
    <g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 30 Q50 -4 92 30 Q50 64 8 30 Z"/><path d="M16 12 Q50 -8 84 12"/>
      <path d="M50 46 L50 56 Q50 60 44 60"/><path d="M66 42 Q78 50 74 58 Q70 62 64 58"/>
    </g>
    <circle cx="50" cy="30" r="11" fill="currentColor"/><circle cx="50" cy="30" r="4" fill="#16323a"/></symbol>`;
  // Obstacles et joker
  d += `<symbol id="cadenas" viewBox="0 0 40 48">
    <path d="M11 22 V14 a9 9 0 0 1 18 0 V22" fill="none" stroke="#2a1d0e" stroke-width="9" stroke-linecap="round"/>
    <path d="M11 22 V14 a9 9 0 0 1 18 0 V22" fill="none" stroke="#d9dde2" stroke-width="5" stroke-linecap="round"/>
    <rect x="4" y="21" width="32" height="25" rx="5" fill="#e0a526" stroke="#2a1d0e" stroke-width="3"/>
    <circle cx="20" cy="31" r="4" fill="#2a1d0e"/><rect x="18.3" y="32" width="3.4" height="8" rx="1.5" fill="#2a1d0e"/></symbol>
  <symbol id="cle" viewBox="0 0 60 30">
    <g fill="none" stroke="#2a1d0e" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="14" cy="15" r="8"/><path d="M22 15 H54 M45 15 V24 M53 15 V22"/></g>
    <g fill="none" stroke="#f2c230" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="14" cy="15" r="8"/><path d="M22 15 H54 M45 15 V24 M53 15 V22"/></g></symbol>
  <symbol id="chaine" viewBox="0 0 120 40">
    <g fill="none" stroke-linecap="round">
      <g stroke="#2a1d0e" stroke-width="11"><ellipse cx="22" cy="20" rx="17" ry="9"/><ellipse cx="50" cy="20" rx="17" ry="9"/>
        <ellipse cx="78" cy="20" rx="17" ry="9"/><ellipse cx="102" cy="20" rx="14" ry="9"/></g>
      <g stroke="#c9d0d8" stroke-width="6"><ellipse cx="22" cy="20" rx="17" ry="9"/><ellipse cx="50" cy="20" rx="17" ry="9"/>
        <ellipse cx="78" cy="20" rx="17" ry="9"/><ellipse cx="102" cy="20" rx="14" ry="9"/></g></g></symbol>
  <symbol id="scarabee" viewBox="0 0 100 100">
    <g stroke="#2a1d0e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M50 8 L58 20 L42 20 Z" fill="#c8932a"/>
      <ellipse cx="50" cy="58" rx="27" ry="32" fill="#1d6f7a"/>
      <path d="M50 28 V90" fill="none"/>
      <path d="M26 44 Q8 36 6 18 Q24 24 32 38 M74 44 Q92 36 94 18 Q76 24 68 38" fill="#e0a526"/>
      <path d="M24 66 Q8 70 6 86 Q22 84 30 74 M76 66 Q92 70 94 86 Q78 84 70 74" fill="#e0a526"/>
      <circle cx="50" cy="20" r="9" fill="#c8932a"/></g></symbol>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'defs-cartes');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>${d}</defs>`;
  document.body.prepend(svg);
}

// Une face de carte. c = { valeur, couleur, rang }, w = largeur en pixels (facultatif)
function elCarte(c, w) {
  const d = document.createElement('div');
  if (c.valeur === 0) {   // le joker
    d.className = 'card face joker';
    if (w) d.style.setProperty('--w', w + 'px');
    d.innerHTML = '<span class="corner tl">★</span><div class="art"><svg viewBox="0 0 100 100" role="img" aria-label="Joker"><use href="#scarabee"/></svg></div>' +
                  '<span class="mot">JOKER</span><span class="corner br">★</span>';
    return d;
  }
  d.className = 'card face' + (COULEURS[c.couleur].rouge ? ' red' : '') + (c.valeur >= 11 ? ' fig' : '');
  if (w) d.style.setProperty('--w', w + 'px');
  const s = COULEURS[c.couleur].sym, r = RANGS[c.valeur - 1];
  const coin = cls => `<span class="corner ${cls}">${r}<small>${s}</small></span>`;
  const centre = c.valeur >= 11
    ? `<div class="art"><svg viewBox="0 0 100 100" role="img" aria-label="${c.valeur === 13 ? 'Roi' : c.valeur === 12 ? 'Reine' : 'Valet'}"><use href="#fig-${c.valeur}-${c.couleur}"/></svg></div>`
    : `<span class="mid num${r === '10' ? ' dix' : ''}">${r}</span>`;   // gros chiffre central, comme sur les cartes papyrus
  d.innerHTML = coin('tl') + centre + coin('br');
  return d;
}

// Le dos : l'Œil d'Horus
function elDos(w) {
  const d = document.createElement('div');
  d.className = 'card dos';
  if (w) d.style.setProperty('--w', w + 'px');
  d.innerHTML = '<svg viewBox="0 0 100 60"><use href="#oeil"/></svg>';
  return d;
}


// Petites icônes posées par-dessus une carte du tableau : 'chaine' | 'cadenas' | 'cle'
function elIcone(nom) {
  const e = document.createElement('div');
  e.className = 'ico ' + nom;
  const vb = { chaine: '0 0 120 40', cadenas: '0 0 40 48', cle: '0 0 60 30' }[nom];
  e.innerHTML = `<svg viewBox="${vb}" aria-hidden="true"><use href="#${nom}"/></svg>`;
  return e;
}
