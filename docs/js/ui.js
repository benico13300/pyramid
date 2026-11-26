'use strict';
/* =====================================================================
   ui.js — le "visage" : affiche la partie et transmet les clics au cerveau.
   ===================================================================== */

(function () {
  injecterDefs();

  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="haut">
      <h1>Pyramida</h1>
      <input id="pseudo" maxlength="20" placeholder="Ton pseudo" aria-label="Pseudo" autocomplete="off">
    </header>
    <div class="stats">
      <div><span>Score</span><b id="sc">0</b></div>
      <div><span>Série</span><b id="se">0</b></div>
      <div><span>Pioche</span><b id="pi">0</b></div>
      <div><span>Record</span><b id="re">0</b></div>
    </div>
    <div class="niveau">
      <span>Niveau <b id="niv">1</b> <span id="temps" class="temps"></span></span>
      <span id="etat"></span>
    </div>
    <div class="cadre"><div class="plateau" id="plateau"></div></div>
    <p id="msg" class="msg" aria-live="polite"></p>
    <div class="base">
      <button id="joker" class="pile jokerslot" aria-label="Joker"></button>
      <button id="pioche" class="pile" aria-label="Piocher une carte"></button>
      <div id="actif" class="pile" aria-label="Carte active"></div>
      <button id="reserve" class="pile reserve" aria-label="Réserve"></button>
    </div>
    <div class="actions">
      <button id="annuler">↶ Annuler</button>
      <button id="nouvelle">⟳ Nouvelle partie</button>
    </div>
    <div class="options">
      <label><input type="checkbox" id="optAide"> Surligner les coups</label>
      <label>Niveau <select id="optNiveau"></select></label>
    </div>
    <p class="regle">Joue une carte libre <b>juste au-dessus ou en dessous</b> de la carte active.
      Série = cartes jouées d'affilée sans piocher : chaque carte rapporte 100 × la série,
      +500 par sommet dégagé, +100 par carte restant en pioche si tu gagnes.<br>
      <b>Réserve</b> : touche l'emplacement vide pour y ranger la carte active (une carte de la pioche la remplace) ; touche la carte rangée pour la ramener en jeu.<br>
      <b>🔗 Chaîne</b> : la carte est bloquée jusqu'à ce que tu enchaînes assez de cartes d'affilée (selon la difficulté).
      <b>🔒 Cadenas</b> : il faut une <b>🗝 clé</b>, cachée sur une autre carte du tableau.
      <b>★ Joker</b> : tu en as un au départ (à gauche de la pioche) ; touche-le pour le poser, il se joue sur n'importe quelle carte et compte comme une carte dans la série.
      <b>🟦 Carte bleue</b> : la jouer te donne un joker de plus. <b>🟩 Carte verte</b> : la jouer ajoute 5 cartes à la pioche. Vide les 3 sommets pour gagner : il te reste des bonus pour chaque joker, chaque carte de pioche et le temps gagné (moins de 10 minutes). Niveau 1 = facile, niveau 5 = très dur ; si tu perds, tu peux rejouer exactement la même partie.</p>
    <div id="voile" class="voile" hidden></div>`;

  const $ = id => document.getElementById(id);
  const plateau = $('plateau');
  let partie = null;
  const TP = 72;                              // largeur des cartes des piles
  let aide = false;                           // « Surligner les coups » est désactivé par défaut
  let niveau = Math.min(NB_NIVEAUX, Math.max(1, Number(API.reglage('niveau', 1)) || 1));

  // Chronomètre : il tourne tant que la partie est en cours et que l'écran est visible
  let ecoule = 0, repris = null, tic = null;
  function tempsEcoule() { return (ecoule + (repris === null ? 0 : performance.now() - repris)) / 1000; }
  function formatTemps(s) { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function afficherTemps() { $('temps').textContent = '⏱ ' + formatTemps(tempsEcoule()); }
  function demarrerChrono() { ecoule = 0; repris = performance.now(); clearInterval(tic); tic = setInterval(afficherTemps, 1000); afficherTemps(); }
  function arreterChrono() { if (repris !== null) { ecoule += performance.now() - repris; repris = null; } clearInterval(tic); afficherTemps(); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (repris !== null) { ecoule += performance.now() - repris; repris = null; } }
    else if (partie && partie.etat === 'en_cours') repris = performance.now();
  });

  function message(texte) { $('msg').textContent = texte || ''; }

  function remplirNiveaux() {   // les 5 niveaux sont tous accessibles dès le départ
    $('optNiveau').replaceChildren(...Array.from({ length: NB_NIVEAUX }, (_, i) =>
      Object.assign(document.createElement('option'), { value: i + 1, textContent: `${i + 1} – ${NIVEAUX[i + 1].nom}` })));
    $('optNiveau').value = niveau;
  }

  // ----- mesures : 10 colonnes + 1 carte de large -----
  function mesurer() {
    const W = plateau.clientWidth || 340;
    const u = W / 10.2;          // largeur d'une colonne
    const w = u * 1.2;           // largeur d'une carte
    const h = w * 1.4;           // hauteur d'une carte (5:7)
    plateau.style.height = (h * 2.5 + 2) + 'px';
    return { u, w, h };
  }

  function dessiner(animer) {
    const { u, w, h } = mesurer();
    plateau.replaceChildren();
    for (const c of partie.cases) {
      if (c.enlevee) continue;
      const visible = partie.exposee(c.id);
      const el = visible ? elCarte(c.carte, w) : elDos(w);
      el.classList.add('t');
      el.style.left = (c.x * u) + 'px';
      el.style.top = (c.rangee * 0.5 * h) + 'px';
      el.dataset.id = c.id;
      if (visible && aide && partie.jouable(c.id)) el.classList.add('jouable');
      if (c.cadenas) el.appendChild(elIcone('cadenas'));
      if (c.cle && visible) el.appendChild(elIcone('cle'));
      if (c.chaine) el.appendChild(elIcone('chaine'));
      if (visible && partie.blocage(c.id)) el.classList.add('bloquee');
      if (visible && c.bonus) el.classList.add('bonus-' + c.bonus);
      plateau.appendChild(el);
    }

    // joker (à gauche de la pioche) : un clic le joue comme carte active
    const bj = $('joker');
    const cj = elCarte(new Carte(0, 'joker'), TP);
    const nj = document.createElement('span');
    nj.className = 'badge badge-joker';
    nj.textContent = partie.jokers;
    bj.replaceChildren(cj, nj);
    bj.disabled = partie.jokers <= 0 || partie.active.joker || partie.etat !== 'en_cours';

    // pile de pioche
    const bp = $('pioche');
    bp.replaceChildren(elDos(TP));
    const nb = document.createElement('span');
    nb.className = 'badge';
    nb.textContent = partie.pioche.length;
    bp.appendChild(nb);
    bp.disabled = partie.pioche.length === 0 || partie.etat !== 'en_cours';

    // carte active
    const actif = elCarte(partie.active, TP);
    if (animer) actif.classList.add('pop');
    $('actif').replaceChildren(actif);

    // réserve : emplacement vide (clic = y ranger la carte active) ou carte rangée (clic = la reprendre)
    const rs = $('reserve');
    if (partie.reserve) {
      rs.replaceChildren(elCarte(partie.reserve, TP));
      rs.classList.add('pleine');
      rs.disabled = partie.etat !== 'en_cours';
      rs.setAttribute('aria-label', 'Réserve : reprendre la carte');
    } else {
      const v = document.createElement('span');
      v.className = 'vide'; v.textContent = 'Réserve';
      rs.replaceChildren(v);
      rs.classList.remove('pleine');
      rs.disabled = partie.pioche.length === 0 || partie.etat !== 'en_cours';
      rs.setAttribute('aria-label', 'Réserve vide : y ranger la carte active');
    }

    // chiffres
    $('sc').textContent = partie.score;
    $('se').textContent = partie.serie;
    $('pi').textContent = partie.pioche.length;
    $('re').textContent = Math.max(API.record(), partie.score);
    $('niv').textContent = `${partie.niveau} · ${partie.config.nom}`;
    const e = [];
    if (partie.config.chaines) e.push(partie.chainesActives ? `🔗 série ${partie.serie}/${partie.longueurChaine}` : '🔗 brisées');
    if (partie.config.cadenas) e.push(`🔒 ${partie.nbCadenas} · 🗝 ${partie.cles}`);
    $('etat').textContent = e.join('   ');
    $('annuler').disabled = partie.etat !== 'en_cours' || partie.historique.length === 0;
  }

  // ----- actions -----
  function apres(animer) {
    dessiner(animer);
    if (partie.etat !== 'en_cours') { arreterChrono(); terminer(); }
  }

  plateau.addEventListener('click', e => {
    const el = e.target.closest('.t');
    if (!el || partie.etat !== 'en_cours') return;
    const id = Number(el.dataset.id);
    if (!partie.exposee(id)) return;
    const bloc = partie.blocage(id);
    const r = partie.jouer(id);
    if (r) {
      const ev = [];
      if (r.cleRamassee) ev.push('🗝 Clé ramassée !');
      if (r.cadenasOuvert) ev.push('🔓 Cadenas ouvert !');
      if (r.chainesBrisees) ev.push('💥 Les chaînes sont brisées !');
      if (r.jokerGagne) ev.push('🟦 Un joker de plus !');
      if (r.packGagne) ev.push('🟩 +5 cartes en pioche !');
      message(ev.join(' '));
      apres(true);
    } else {
      if (bloc === 'chaine') message(`🔗 Chaîne : enchaîne ${partie.longueurChaine} cartes d'affilée (série : ${partie.serie}).`);
      else if (bloc === 'cadenas') message('🔒 Il faut une clé 🗝 : ramasse-en une sur une autre carte.');
      el.classList.add('non'); setTimeout(() => el.classList.remove('non'), 320);
    }
  });

  $('pioche').addEventListener('click', () => { if (partie.piocher()) { message(''); apres(true); } });
  $('annuler').addEventListener('click', () => { if (partie.annuler()) { message(''); dessiner(false); } });
  $('joker').addEventListener('click', () => {
    const r = partie.utiliserJoker();
    if (r) {
      message('★ Joker joué : il compte dans ta série.' + (r.chainesBrisees ? ' 💥 Les chaînes sont brisées !' : ''));
      apres(true);
    }
  });
  $('reserve').addEventListener('click', () => {
    if (partie.reserve) {
      if (partie.reprendreReserve()) { message('↩ Carte reprise depuis la réserve.'); apres(true); }
    } else if (partie.mettreEnReserve()) {
      message('📥 Carte mise en réserve : une carte de la pioche la remplace (série remise à 0).');
      apres(true);
    }
  });
  $('optNiveau').addEventListener('change', e => { niveau = Number(e.target.value); API.regler('niveau', niveau); nouvelle(); });
  $('nouvelle').addEventListener('click', () => nouvelle());
  $('optAide').addEventListener('change', e => { aide = e.target.checked; dessiner(false); });
  $('pseudo').value = (API.pseudo() === 'Joueur' ? '' : API.pseudo());
  $('pseudo').addEventListener('change', e => API.pseudo(e.target.value));
  window.addEventListener('resize', () => partie && dessiner(false));

  function nouvelle(graine) {   // graine donnée = on rejoue exactement la même donne
    $('voile').hidden = true;
    remplirNiveaux();
    partie = new Partie({ graine: typeof graine === 'number' ? graine : undefined, niveau, horloge: () => Math.round(tempsEcoule()) });
    demarrerChrono();
    message(descriptionNiveau(niveau));
    dessiner(false);
    if (partie.etat !== 'en_cours') terminer();
  }

  // ----- fin de partie : sauvegarde + classement -----
  let dernierFin = 0;   // évite qu'un enregistrement lent mette à jour l'écran d'une autre partie
  async function terminer() {
    const gagne = partie.etat === 'gagne';
    const voile = $('voile');
    voile.hidden = false;
    voile.innerHTML = `
      <div class="boite" role="dialog" aria-modal="true">
        <h2>${gagne ? `🏆 Niveau ${partie.niveau} réussi !` : `Niveau ${partie.niveau} : plus de coups possibles`}</h2>
        <p class="gros">${partie.score} points</p>
        <p class="detail">Meilleure série : ${partie.serieMax} · Sommets : ${partie.sommets}/3 · Temps : ${formatTemps(partie.temps)}</p>
        ${gagne ? `<ul class="bonus">
          <li><span>Points de jeu</span><b>${partie.pointsJeu}</b></li>
          <li><span>Jokers restants (${partie.jokers})</span><b>+${partie.bonusJokers}</b></li>
          <li><span>Cartes en pioche (${partie.pioche.length})</span><b>+${partie.bonusPioche}</b></li>
          <li><span>Temps (${formatTemps(partie.temps)})</span><b>+${partie.bonusTemps}</b></li>
        </ul>` : ''}
        <p id="etatSauv" class="detail">Enregistrement…</p>
        <ol id="top" class="top"></ol>
        ${gagne
          ? `<button id="rejouer" class="gros-bouton">${partie.niveau < NB_NIVEAUX ? `Niveau ${partie.niveau + 1} ➜` : 'Rejouer le niveau ' + partie.niveau}</button>`
          : `<button id="memeDonne" class="gros-bouton">↻ Rejouer la même partie</button>
             <button id="rejouer" class="gros-bouton secondaire">Nouvelle partie (niveau ${partie.niveau})</button>`}
      </div>`;
    const graineJouee = partie.graine;
    const jeton = ++dernierFin;
    if (gagne) {   // le niveau suivant est débloqué et mémorisé tout de suite
      niveau = Math.min(NB_NIVEAUX, partie.niveau + 1);
      API.regler('niveau', niveau);
    }
    $('rejouer').addEventListener('click', () => nouvelle());
    const meme = $('memeDonne');
    if (meme) meme.addEventListener('click', () => nouvelle(graineJouee));

    const res = await API.sauver(partie);
    if (jeton !== dernierFin || voile.hidden) return;   // une autre partie a été lancée : l'envoi est fait, on ne touche plus à l'écran
    $('etatSauv').textContent = {
      en_ligne: '✓ Score enregistré dans Google Sheets',
      local: '✓ Score enregistré sur cet appareil',
      en_attente: '⚠ Hors connexion : le score sera envoyé plus tard'
    }[res.mode];

    const cl = await API.classement();
    const ol = $('top');
    if (!ol || jeton !== dernierFin || voile.hidden) return;
    ol.before(Object.assign(document.createElement('p'), {
      className: 'detail',
      textContent: cl.mode === 'en_ligne' ? 'Classement (en ligne)' : 'Tes meilleurs scores'
    }));
    cl.lignes.forEach(l => {
      const li = document.createElement('li');
      const nom = document.createElement('span'); nom.textContent = (l.pseudo || 'Joueur') + (l.gagne ? ' 🏆' : '');
      const pts = document.createElement('b'); pts.textContent = l.score;
      li.append(nom, pts);
      ol.appendChild(li);
    });
    API.envoyerFile();
  }

  // ----- démarrage -----
  nouvelle();
  API.envoyerFile();

  // Mode hors ligne (installation sur l'écran d'accueil) : actif seulement sur GitHub Pages
  try {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (e) { /* pas grave */ }

  // pour les tests dans la console du navigateur
  window.tripeaks = { get partie() { return partie; }, dessiner, nouvelle };
})();
