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

const POINTS = { carte: 100, sommet: 500, pioche: 100 };

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

const NB_CARTES_PACK = 5;                     // cartes ajoutées à la pioche par une carte verte

class Partie {
  constructor(options = {}) {
    this.graine = options.graine ?? Math.floor(Math.random() * 2147483647);
    this.bouclage = options.bouclage ?? true;
    this.config = configNiveau(options.niveau ?? 1);
    this.niveau = Math.min(NB_NIVEAUX, Math.max(1, Math.floor(options.niveau ?? 1) || 1));
    // Ancien nom (3 paliers) gardé pour la feuille Google : niveaux 1-2 simple, 3-4 moyen, 5 difficile
    this.difficulte = this.niveau <= 2 ? 'simple' : this.niveau <= 4 ? 'moyen' : 'difficile';
    this.longueurChaine = this.config.serie;
    const cartes = melanger(paquet52(), this.graine);

    this.cases = [];
    let k = 0;
    RANGEES.forEach((xs, rangee) => xs.forEach(x => {
      this.cases.push({ id: k, rangee, x, carte: cartes[k], enlevee: false, couvertePar: [],
                        chaine: false, cadenas: false, cle: false, bonus: null });
      k++;
    }));
    // Une carte est couverte par les 2 cartes de la rangée du dessous qui la chevauchent
    for (const c of this.cases) {
      if (c.rangee < 3) {
        c.couvertePar = this.cases
          .filter(d => d.rangee === c.rangee + 1 && Math.abs(d.x - c.x) === 0.5)
          .map(d => d.id);
      }
    }

    this._placerObstacles();

    this.pioche = cartes.slice(28);          // 24 cartes
    this.defausse = [this.pioche.pop()];     // la carte de départ
    this.score = 0;
    this.serie = 0;
    this.serieMax = 0;
    this.sommets = 0;
    this.nbCoups = 0;
    this.bonusFinal = 0;
    this.cles = 0;                           // clés ramassées et pas encore utilisées
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
    const hauts = libres.filter(id => this.cases[id].rangee < 3 && !this.cases[id].carte.joker);
    const verrous = [];
    for (let i = 0; i < cfg.cadenas && hauts.length; i++) {
      const id = tirer(hauts);
      libres.splice(libres.indexOf(id), 1);
      this.cases[id].cadenas = true;
      verrous.push(id);
    }
    // Clés : jamais cachées sous un cadenas (sinon la partie serait impossible)
    const interdits = new Set();
    const descendre = id => this.cases[id].couvertePar.forEach(d => { interdits.add(d); descendre(d); });
    verrous.forEach(descendre);
    const candidates = libres.filter(id => !interdits.has(id) && !this.cases[id].carte.joker && this.cases[id].rangee >= 2);
    let nbCles = 0;
    while (nbCles < verrous.length && candidates.length) {
      const id = tirer(candidates);
      libres.splice(libres.indexOf(id), 1);
      this.cases[id].cle = true;
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

  get chainesActives() { return this.cases.some(c => c.chaine && !c.enlevee); }
  get nbChaines() { return this.cases.filter(c => c.chaine && !c.enlevee).length; }
  get nbCadenas() { return this.cases.filter(c => c.cadenas && !c.enlevee).length; }

  // Pourquoi une carte libre ne peut pas être jouée : 'chaine' | 'cadenas' | null
  blocage(id) {
    const c = this.cases[id];
    if (c.chaine) return 'chaine';
    if (c.cadenas && this.cles <= 0) return 'cadenas';
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
      chaines: this.cases.map(c => c.chaine), cles: this.cles, reserve: this.reserve,
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
    if (c.cadenas) { this.cles--; evenements.cadenasOuvert = true; }   // le cadenas consomme une clé
    if (c.cle) { this.cles++; evenements.cleRamassee = true; }          // la clé est ramassée
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
    const sommet = c.rangee === 0;
    if (sommet) { this.sommets++; gain += POINTS.sommet; }
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
    this.cles = s.cles;
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
      this.bonusFinal = POINTS.pioche * this.pioche.length;
      this.score += this.bonusFinal;
    } else if (this.pioche.length === 0 && !this.cases.some(c => this._peutJouer(c.id)) &&
               !(this.reserve && this.cases.some(c => this._peutJouer(c.id, this.reserve))) &&
               !(this.jokers > 0 && this.cases.some(c => this._peutJouer(c.id, new Carte(0, 'joker'))))) {
      this.etat = 'perdu';
    } else {
      this.etat = 'en_cours';
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { RANGS, FAMILLES, Carte, Partie, RANGEES, POINTS, NIVEAUX, NB_NIVEAUX, configNiveau, descriptionNiveau, NB_CARTES_PACK, alea, paquet52, melanger };
}
