'use strict';
/* =====================================================================
   logique.js — le "cerveau" du TriPeaks (aucun affichage ici).
   Même idée que la classe Python vue en formation : des cartes, des
   règles, un état de partie. Testable seul, sans écran.
   ===================================================================== */

const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const FAMILLES = ['coeur', 'carreau', 'pique', 'trefle'];

class Carte {
  constructor(valeur, couleur) {
    this.valeur = valeur;     // 1 (As) … 13 (Roi)
    this.couleur = couleur;   // 'coeur' | 'carreau' | 'pique' | 'trefle'
  }
  get joker() { return this.valeur === 0; }
  get rang() { return this.joker ? '★' : RANGS[this.valeur - 1]; }
  ecart(autre) { return Math.abs(this.valeur - autre.valeur); }
  // Règle TriPeaks : valeur juste au-dessus ou en dessous (As ↔ Roi si bouclage).
  // Le joker se joue sur n'importe quelle carte, et n'importe quelle carte se joue sur lui.
  estJouableSur(autre, bouclage = true) {
    if (this.joker || autre.joker) return true;
    const e = this.ecart(autre);
    return e === 1 || (bouclage && e === 12);
  }
}

// Générateur pseudo-aléatoire : la même graine donne toujours la même donne
function alea(graine) {
  let s = graine | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paquet52() {
  const p = [];
  for (const f of FAMILLES) for (let v = 1; v <= 13; v++) p.push(new Carte(v, f));
  return p;
}

function melanger(cartes, graine) {
  const r = alea(graine), a = cartes.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Les 4 rangées du tableau : position horizontale de chaque carte (en "colonnes").
// 3 sommets : 3 + 6 + 9 + 10 = 28 cartes. Les 24 autres forment la pioche.
const RANGEES = [
  [1.5, 4.5, 7.5],
  [1, 2, 4, 5, 7, 8],
  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
];


// ----- Dispositions aléatoires -----
// Les cartes sont posées sur une grille fine : un pas = une demi-carte, en largeur comme en hauteur
// (gx 0 à 14, gy 0 à 6). Une carte posée à cheval peut donc recouvrir 1, 2, 3 ou 4 cartes.
// L'ordre du tableau = l'ordre de pose : une carte recouvre celles qui la chevauchent et qui sont avant elle.
const NB_CASES = 28;                          // tableau classique (tests)
const NB_MIN = 30, NB_VAR = 5;                 // tableau aléatoire : 30 à 34 cartes
const VALID = { expMin: 8, expMax: 14, profMax: 4, couvMax: 4 };
const GX_MAX = 14;
const GY_MAX = 6;

function _dispoClassique() {
  const cases = [];
  RANGEES.forEach((xs, y) => xs.forEach(x => cases.push({ px: x / 1.2, py: y * 0.5 })));
  return { liste: cases, style: 'classique' };
}

const _chevauche = (a, b) => Math.abs(a.px - b.px) < 0.8 && Math.abs(a.py - b.py) < 0.99;

// Formes possibles du tableau : chacune donne un "poids" à chaque emplacement de la grille.
const STYLES = {
  ilots(r) {          // 2 à 4 îlots répartis sur la table
    const k = 2 + Math.floor(r() * 3);
    const cs = Array.from({ length: k }, (_, i) => ({ x: 2 + (10 * (i + 0.2 + r() * 0.6)) / k, y: 1 + r() * 4 }));
    return (x, y) => 0.03 + Math.max(...cs.map(c => Math.exp(-(((x - c.x) / 2.6) ** 2 + ((y - c.y) / 1.9) ** 2))));
  },
  losange() {
    return (x, y) => (Math.abs(x - 7) / 6.5 + Math.abs(y - 3) / 3.4 <= 1 ? 1 : 0.02);
  },
  large(r) {          // une bande large et basse
    const y0 = Math.floor(r() * 3);
    return (x, y) => (y >= y0 && y <= y0 + 3 ? 1 : 0.02);
  },
  tour(r) {           // grosse pile étroite et haute
    const cx = 5 + r() * 4;
    return (x, y) => 0.02 + Math.exp(-(((x - cx) / 2.6) ** 2 + ((y - 3) / 3.2) ** 2));
  },
  anneau() {          // les cartes forment une couronne vide au centre
    return (x, y) => 0.02 + Math.exp(-(((Math.hypot((x - 7) / 6.2, (y - 3) / 3.1) - 0.85) / 0.3) ** 2));
  },
  diagonale(r) {
    const sens = r() < 0.5 ? 1 : -1;
    return (x, y) => {
      const cible = sens > 0 ? 1.5 + y * 2 : 12.5 - y * 2;
      return 0.02 + Math.exp(-(((x - cible) / 2.8) ** 2));
    };
  },
  croix() {
    return (x, y) => (Math.abs(x - 7) <= 2.5 || Math.abs(y - 3) <= 1 ? 1 : 0.02);
  }
};
const NOMS_STYLES = Object.keys(STYLES);
const STYLES_SYMETRIQUES = new Set(['losange', 'anneau', 'croix', 'ilots', 'tour']);

function _tenterDispo(r, nom, n) {
  const masque = STYLES[nom](r);
  const symetrique = STYLES_SYMETRIQUES.has(nom) && r() < 0.6 && nom !== 'tour' && nom !== 'ilots';
  const poses = [];
  const poids = [0.05, 1, 3, 3, 2];            // selon le nombre de cartes déjà recouvertes (0 à 4)
  const libre = (c, autre) => !poses.concat(autre ? [autre] : []).some(d =>
    Math.abs(d.gx - c.gx) < 1 && Math.abs(d.gy - c.gy) < 1);
  const tirer = (colMax) => {
    const cands = [];
    for (let gx = 0; gx <= colMax; gx++) for (let gy = 0; gy <= GY_MAX; gy++) {
      const c = { gx, gy, px: gx / 2, py: gy / 2 };
      if (!libre(c)) continue;
      const n = poses.filter(d => _chevauche(c, d)).length;
      if (n > 0) {   // pas de pile trop profonde, pas de carte sous plus de 3 cartes
        const rel = _relier(poses.concat([c]));
        if (Math.max(...rel.map(d => d.prof)) > VALID.profMax || Math.max(...rel.map(d => d.couvertePar.length)) > VALID.couvMax) continue;
      }
      const p = (poses.length ? poids[Math.min(4, n)] : 1) * masque(gx, gy);
      if (p > 0) cands.push({ c, p });
    }
    const total = cands.reduce((a, d) => a + d.p, 0);
    if (!cands.length) return null;
    let t = r() * total;
    for (const d of cands) { t -= d.p; if (t <= 0) return d.c; }
    return cands[cands.length - 1].c;
  };
  while (poses.length < n) {
    if (symetrique && n - poses.length >= 2) {
      const c = tirer(6);                      // moitié gauche, puis on la reflète
      if (!c) return null;
      poses.push(c);
      const m = { gx: GX_MAX - c.gx, gy: c.gy }; m.px = m.gx / 2; m.py = m.gy / 2;
      poses.push(m);
    } else {
      const c = tirer(GX_MAX);
      if (!c) return null;
      poses.push(c);
    }
  }
  const minx = Math.min(...poses.map(c => c.px)), miny = Math.min(...poses.map(c => c.py));
  return { liste: poses.map(c => ({ px: c.px - minx, py: c.py - miny })), style: nom + (symetrique ? ' (symétrique)' : '') };
}

// Jouable : assez de cartes visibles au départ, de la profondeur, au moins un sommet.
function _dispoValide(liste) {
  const cases = _relier(liste);
  const exposees = cases.filter(c => c.prof === 0).length;
  const profMax = Math.max(...cases.map(c => c.prof));
  const sommets = cases.filter(c => c.sommet).length;
  const hauts = cases.filter(c => c.prof >= 1).length;
  const seules = cases.filter(c => !c.couvertePar.length && !cases.some(d => d.couvertePar.includes(c.id))).length;
  const maxCouv = Math.max(...cases.map(c => c.couvertePar.length));
  return exposees >= VALID.expMin && exposees <= VALID.expMax && profMax >= 2 && profMax <= VALID.profMax && maxCouv <= VALID.couvMax && sommets >= 1 && hauts >= 10 && seules <= 3;
}

// Calcule qui couvre qui, la profondeur (0 = visible au départ) et les sommets.
function _relier(liste) {
  const cases = liste.map((p, id) => ({ id, px: p.px, py: p.py, rangee: Math.round(p.py * 2), enlevee: false,
                                        couvertePar: [], chaine: false, cadenas: false, cle: false, bonus: null }));
  cases.forEach((c, i) => {
    c.couvertePar = cases.filter((d, j) => j > i && _chevauche(c, d)).map(d => d.id);
  });
  for (let i = cases.length - 1; i >= 0; i--) {
    const c = cases[i];
    c.prof = c.couvertePar.length ? 1 + Math.max(...c.couvertePar.map(d => cases[d].prof)) : 0;
  }
  const dessous = new Set();
  cases.forEach(c => c.couvertePar.forEach(d => dessous.add(d)));
  cases.forEach(c => { c.sommet = c.prof >= 1 && !dessous.has(c.id); });
  return cases;
}

// Disposition tirée de la graine : { liste, style }. nomStyle force une forme (tests).
function nbCartesTableau(graine) { return NB_MIN + Math.floor(alea(graine + 555)() * NB_VAR); }

function genererDisposition(graine, nomStyle) {
  const r = alea(graine + 31337);
  const n = nbCartesTableau(graine);
  const nom = nomStyle || NOMS_STYLES[Math.floor(r() * NOMS_STYLES.length)];
  for (let essai = 0; essai < 300; essai++) {
    const d = _tenterDispo(r, nom, n);
    if (d && _dispoValide(d.liste)) return d;
  }
  return _dispoClassique();
}

// Points : une carte vaut 100 × la série, un sommet +500.
// À la victoire : bonus par joker et par carte restant en pioche, et bonus de temps
// (TEMPS_POINTS points par seconde gagnée sous TEMPS_REF secondes).
const POINTS = { carte: 100, sommet: 500, sommetsTotal: 1500, pioche: 50, joker: 300, tempsParSeconde: 5, tempsRef: 600 };

// 5 niveaux de difficulté. Plus on monte : plus de chaînes et de cadenas, une série plus longue
// à enchaîner pour briser les chaînes, et moins de jokers et de cartes bonus (bleues / vertes).
//   chaines / cadenas : obstacles sur le tableau (autant de clés que de cadenas)
//   jokers : jokers posés sur le tableau   bleus / verts : cartes bonus
//   serie : nombre de cartes d'affilée pour briser les chaînes (3 au plus)
const NB_NIVEAUX = 5;
const NIVEAUX = [
  null,
  { nom: 'Facile',         chaines: 1, cadenas: 1, jokers: 2, bleus: 3, verts: 3, serie: 2 },
  { nom: 'Moyen',          chaines: 2, cadenas: 2, jokers: 2, bleus: 2, verts: 2, serie: 3 },
  { nom: 'Difficile',      chaines: 3, cadenas: 3, jokers: 1, bleus: 2, verts: 1, serie: 3 },
  { nom: 'Très difficile', chaines: 4, cadenas: 3, jokers: 1, bleus: 1, verts: 1, serie: 3 },
  { nom: 'Expert',         chaines: 6, cadenas: 4, jokers: 0, bleus: 1, verts: 0, serie: 3 }
];

function configNiveau(n) {
  n = Math.min(NB_NIVEAUX, Math.max(1, Math.floor(n) || 1));
  return { ...NIVEAUX[n] };
}

function descriptionNiveau(n) {
  const c = configNiveau(n);
  return `${c.nom} : 🔗 ${c.chaines} (série de ${c.serie}) · 🔒 ${c.cadenas} · ★ ${c.jokers} · 🟦 ${c.bleus} · 🟩 ${c.verts}`;
}

// Couleurs des paires cadenas / clé : une clé n'ouvre que le cadenas de sa couleur
const TEINTES = ['#3b7fd0', '#3fa34d', '#e0b020', '#d0453b'];
const CARRES = ['🟦', '🟩', '🟨', '🟥'];

const NB_CARTES_PACK = 5;                     // cartes ajoutées à la pioche par une carte verte

class Partie {
  constructor(options = {}) {
    this.graine = options.graine ?? Math.floor(Math.random() * 2147483647);
    this.bouclage = options.bouclage ?? true;   // As ↔ Roi : toujours actif dans le jeu
    this.horloge = options.horloge || (() => 0); // donne le temps de jeu écoulé en secondes
    this.config = configNiveau(options.niveau ?? 1);
    this.niveau = Math.min(NB_NIVEAUX, Math.max(1, Math.floor(options.niveau ?? 1) || 1));
    // Ancien nom (3 paliers) gardé pour la feuille Google : niveaux 1-2 simple, 3-4 moyen, 5 difficile
    this.difficulte = this.niveau <= 2 ? 'simple' : this.niveau <= 4 ? 'moyen' : 'difficile';
    this.longueurChaine = this.config.serie;
    const cartes = melanger(paquet52(), this.graine);
    const classique = (options.disposition ?? Partie.DISPOSITION_DEFAUT) === 'classique';
    const dispo = classique ? _dispoClassique() : genererDisposition(this.graine, options.style);
    this.style = dispo.style;
    this.cases = _relier(dispo.liste);
    this.cases.forEach((c, k) => { c.carte = cartes[k]; });
    this.largeur = Math.max(...this.cases.map(c => c.px)) + 1;   // en largeurs de carte
    this.hauteur = Math.max(...this.cases.map(c => c.py)) + 1;   // en hauteurs de carte
    this.nbSommets = this.cases.filter(c => c.sommet).length;

    this._placerObstacles();

    this.pioche = cartes.slice(this.cases.length);   // le reste du jeu
    this.defausse = [this.pioche.pop()];     // la carte de départ
    this.score = 0;
    this.serie = 0;
    this.serieMax = 0;
    this.sommets = 0;
    this.nbCoups = 0;
    this.bonusFinal = 0;
    this.bonusPioche = 0; this.bonusJokers = 0; this.bonusTemps = 0;
    this.pointsJeu = 0;                      // points avant les bonus de fin
    this.temps = 0;                          // temps de jeu en secondes, fixé à la fin
    this.mesCles = [];                       // couleurs des clés ramassées et pas encore utilisées
    this.reserve = null;                     // une carte mise de côté (une seule à la fois)
    this.jokers = 1;                         // joker de départ, à gauche de la pioche
    this.extra = 0;                          // cartes ajoutées à la pioche par les cartes vertes
    this._hasardBonus = alea(this.graine + 104729);
    this.etat = 'en_cours';                  // 'en_cours' | 'gagne' | 'perdu'
    this.historique = [];
    this._verifierFin();
  }

  // Tout ce qui est "obstacle" est tiré avec un hasard à part (la donne des cartes ne change pas)
  _placerObstacles() {
    const r = alea(this.graine + 7919);
    const tirer = liste => liste.splice(Math.floor(r() * liste.length), 1)[0];
    const cfg = this.config;
    const libres = this.cases.map(c => c.id);

    // Jokers : ils remplacent des cartes du tableau
    for (let i = 0; i < cfg.jokers; i++) {
      const id = tirer(libres);
      this.cases[id].carte = new Carte(0, 'joker');
    }
    // Cadenas : sur les 3 rangées du haut (jamais sur la rangée du bas, toujours visible au départ)
    const hauts = libres.filter(id => this.cases[id].prof >= 1 && !this.cases[id].carte.joker);
    const verrous = [];
    for (let i = 0; i < cfg.cadenas && hauts.length; i++) {
      const id = tirer(hauts);
      libres.splice(libres.indexOf(id), 1);
      this.cases[id].cadenas = true;
      this.cases[id].teinte = verrous.length % TEINTES.length;
      verrous.push(id);
    }
    // Clés : jamais cachées sous un cadenas (sinon la partie serait impossible)
    const interdits = new Set();
    const descendre = id => this.cases[id].couvertePar.forEach(d => { interdits.add(d); descendre(d); });
    verrous.forEach(descendre);
    const candidates = libres.filter(id => !interdits.has(id) && !this.cases[id].carte.joker && this.cases[id].prof <= 1);
    let nbCles = 0;
    while (nbCles < verrous.length && candidates.length) {
      const id = tirer(candidates);
      libres.splice(libres.indexOf(id), 1);
      this.cases[id].cle = true;
      this.cases[id].teinte = this.cases[verrous[nbCles]].teinte;   // même couleur que son cadenas
      nbCles++;
    }
    // Pas assez de place pour toutes les clés : on retire les cadenas en trop
    verrous.slice(nbCles).forEach(id => { this.cases[id].cadenas = false; });
    // Chaînes : sur des cartes sans autre obstacle
    const chainables = libres.filter(id => !this.cases[id].carte.joker);
    for (let i = 0; i < cfg.chaines && chainables.length; i++) {
      this.cases[tirer(chainables)].chaine = true;
    }
    // Cartes bonus : des cartes normales, sans autre obstacle
    const nues = this.cases.filter(c => !c.chaine && !c.cadenas && !c.cle && !c.carte.joker).map(c => c.id);
    for (let i = 0; i < (cfg.bleus || 0) && nues.length; i++) this.cases[tirer(nues)].bonus = 'bleu';
    for (let i = 0; i < (cfg.verts || 0) && nues.length; i++) this.cases[tirer(nues)].bonus = 'vert';
  }

  get cles() { return this.mesCles.length; }
  get chainesActives() { return this.cases.some(c => c.chaine && !c.enlevee); }
  get nbChaines() { return this.cases.filter(c => c.chaine && !c.enlevee).length; }
  get nbCadenas() { return this.cases.filter(c => c.cadenas && !c.enlevee).length; }

  // Pourquoi une carte libre ne peut pas être jouée : 'chaine' | 'cadenas' | null
  blocage(id) {
    const c = this.cases[id];
    if (c.chaine) return 'chaine';
    if (c.cadenas && !this.mesCles.includes(c.teinte ?? 0)) return 'cadenas';
    return null;
  }

  get active() { return this.defausse[this.defausse.length - 1]; }
  get restantes() { return this.cases.filter(c => !c.enlevee).length; }

  // Une carte est "exposée" (visible et cliquable) quand plus rien ne la couvre
  exposee(id) {
    const c = this.cases[id];
    return !c.enlevee && c.couvertePar.every(i => this.cases[i].enlevee);
  }

  _peutJouer(id, ref = this.active) {
    return this.exposee(id) && !this.blocage(id) &&
           this.cases[id].carte.estJouableSur(ref, this.bouclage);
  }

  jouable(id) { return this.etat === 'en_cours' && this._peutJouer(id); }

  coupsPossibles() {
    return this.cases.filter(c => this.jouable(c.id)).map(c => c.id);
  }

  _instantane() {
    this.historique.push({
      enlevees: this.cases.map(c => c.enlevee),
      pioche: this.pioche.slice(),
      defausse: this.defausse.slice(),
      chaines: this.cases.map(c => c.chaine), cles: this.mesCles.slice(), reserve: this.reserve,
      jokers: this.jokers, extra: this.extra,
      score: this.score, serie: this.serie, serieMax: this.serieMax,
      sommets: this.sommets, nbCoups: this.nbCoups
    });
  }

  // Joue une carte du tableau. Renvoie le détail du coup, ou null si impossible.
  jouer(id) {
    if (!this.jouable(id)) return null;
    this._instantane();
    const c = this.cases[id];
    const evenements = { cadenasOuvert: false, cleRamassee: false, chainesBrisees: false, jokerGagne: false, packGagne: false };
    if (c.cadenas) { this.mesCles.splice(this.mesCles.indexOf(c.teinte ?? 0), 1); evenements.cadenasOuvert = true; }   // le cadenas consomme une clé
    if (c.cle) { this.mesCles.push(c.teinte ?? 0); evenements.cleRamassee = true; }          // la clé est ramassée
    c.enlevee = true;
    this.defausse.push(c.carte);
    if (c.bonus === 'bleu') { this.jokers++; evenements.jokerGagne = true; }
    if (c.bonus === 'vert') { this._ajouterPack(); evenements.packGagne = true; }
    this.serie++;
    this.serieMax = Math.max(this.serieMax, this.serie);
    // Assez de cartes d'affilée : toutes les chaînes se brisent
    if (this.chainesActives && this.serie >= this.longueurChaine) {
      this.cases.forEach(d => { d.chaine = false; });
      evenements.chainesBrisees = true;
    }
    let gain = POINTS.carte * this.serie;
    const sommet = c.sommet;
    if (sommet) { this.sommets++; gain += Math.round(POINTS.sommetsTotal / this.nbSommets); }   // 1500 au total, quel que soit le nombre de sommets
    this.score += gain;
    this.nbCoups++;
    this._verifierFin();
    return { gain, sommet, ...evenements };
  }

  // Carte verte : 5 cartes tirées au hasard rejoignent le fond de la pioche
  _ajouterPack() {
    for (let i = 0; i < NB_CARTES_PACK; i++) {
      const valeur = 1 + Math.floor(this._hasardBonus() * 13);
      const couleur = FAMILLES[Math.floor(this._hasardBonus() * FAMILLES.length)];
      this.pioche.unshift(new Carte(valeur, couleur));   // le fond de la pile : elles sortent en dernier
      this.extra++;
    }
  }

  // Joker de départ (ou gagné) : il devient la carte active et se joue sur n'importe quelle carte.
  // Il compte comme une carte dans la série (donc pour briser les chaînes), sans rapporter de points.
  utiliserJoker() {
    if (this.etat !== 'en_cours' || this.jokers <= 0 || this.active.joker) return false;
    this._instantane();
    this.jokers--;
    const j = new Carte(0, 'joker');
    j.depart = true;                         // joker venu de la réserve de jokers (pas du tableau)
    this.defausse.push(j);
    this.serie++;
    this.serieMax = Math.max(this.serieMax, this.serie);
    let chainesBrisees = false;
    if (this.chainesActives && this.serie >= this.longueurChaine) {
      this.cases.forEach(d => { d.chaine = false; });
      chainesBrisees = true;
    }
    this.nbCoups++;
    this._verifierFin();
    return { chainesBrisees };
  }

  // Pioche une carte : elle devient la carte active, et la série retombe à 0
  piocher() {
    if (this.etat !== 'en_cours' || this.pioche.length === 0) return false;
    this._instantane();
    this.defausse.push(this.pioche.pop());
    this.serie = 0;
    this.nbCoups++;
    this._verifierFin();
    return true;
  }

  // Réserve : la carte active est rangée de côté, et une carte de la pioche la remplace.
  // C'est comme piocher (la série retombe à 0), mais on garde la carte pour plus tard.
  mettreEnReserve() {
    if (this.etat !== 'en_cours' || this.reserve || this.pioche.length === 0) return false;
    this._instantane();
    this.reserve = this.defausse.pop();
    this.defausse.push(this.pioche.pop());
    this.serie = 0;
    this.nbCoups++;
    this._verifierFin();
    return true;
  }

  // Ramener la carte de la réserve : elle redevient la carte active (la série est conservée).
  reprendreReserve() {
    if (this.etat !== 'en_cours' || !this.reserve) return false;
    this._instantane();
    this.defausse.push(this.reserve);
    this.reserve = null;
    this.nbCoups++;
    this._verifierFin();
    return true;
  }

  annuler() {
    if (this.etat !== 'en_cours' || this.historique.length === 0) return false;
    const s = this.historique.pop();
    this.cases.forEach((c, i) => { c.enlevee = s.enlevees[i]; c.chaine = s.chaines[i]; });
    this.mesCles = s.cles.slice();
    this.reserve = s.reserve;
    this.jokers = s.jokers; this.extra = s.extra;
    this.pioche = s.pioche;
    this.defausse = s.defausse;
    this.score = s.score; this.serie = s.serie; this.serieMax = s.serieMax;
    this.sommets = s.sommets; this.nbCoups = s.nbCoups;
    return true;
  }

  _verifierFin() {
    if (this.cases.every(c => c.enlevee)) {
      this.etat = 'gagne';
      this.temps = this.horloge();
      this.pointsJeu = this.score;
      this.bonusPioche = POINTS.pioche * this.pioche.length;
      this.bonusJokers = POINTS.joker * this.jokers;
      this.bonusTemps = POINTS.tempsParSeconde * Math.max(0, POINTS.tempsRef - this.temps);
      this.bonusFinal = this.bonusPioche + this.bonusJokers + this.bonusTemps;
      this.score += this.bonusFinal;
    } else if (this.pioche.length === 0 && !this.cases.some(c => this._peutJouer(c.id)) &&
               !(this.reserve && this.cases.some(c => this._peutJouer(c.id, this.reserve))) &&
               !(this.jokers > 0 && this.cases.some(c => this._peutJouer(c.id, new Carte(0, 'joker'))))) {
      this.etat = 'perdu';
      this.temps = this.horloge();
      this.pointsJeu = this.score;
    } else {
      this.etat = 'en_cours';
    }
  }
}

Partie.DISPOSITION_DEFAUT = 'aleatoire';   // 'classique' = les 3 pyramides fixes (tests)

if (typeof module !== 'undefined') {
  module.exports = { genererDisposition, nbCartesTableau, _relier, VALID, NB_CASES, TEINTES, RANGS, FAMILLES, Carte, Partie, RANGEES, POINTS, NIVEAUX, NB_NIVEAUX, configNiveau, descriptionNiveau, NB_CARTES_PACK, alea, paquet52, melanger };
}
