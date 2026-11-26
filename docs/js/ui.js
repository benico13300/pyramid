'use strict';
/* =====================================================================
   ui.js — le "visage" : affiche la partie et transmet les clics au cerveau.
   ===================================================================== */

(function () {
  injecterDefs();

  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="haut">
      <h1>TriPeaks <small>Égypte</small></h1>
      <input id="pseudo" maxlength="20" placeholder="Ton pseudo" aria-label="Pseudo" autocomplete="off">
    </header>
    <div class="stats">
      <div><span>Score</span><b id="sc">0</b></div>
      <div><span>Série</span><b id="se">0</b></div>
      <div><span>Pioche</span><b id="pi">0</b></div>
      <div><span>Record</span><b id="re">0</b></div>
    </div>
    <div class="niveau">
      <span>Niveau <b id="niv">1</b></span>
      <span id="etat"></span>
    </div>
    <div class="cadre"><div class="plateau" id="plateau"></div></div>
    <p id="msg" class="msg" aria-live="polite"></p>
    <div class="base">
      <button id="pioche" class="pile" aria-label="Piocher une carte"></button>
      <div id="actif" class="pile" aria-label="Carte active"></div>
      <button id="reserve" class="pile reserve" aria-label="Réserve"></button>
    </div>
    <div class="actions">
      <button id="annuler">↶ Annuler</button>
      <button id="nouvelle">⟳ Nouvelle partie</button>
    </div>
    <div class="options">
      <label><input type="checkbox" id="optBoucle" checked> Bouclage As ↔ Roi</label>
      <label><input type="checkbox" id="optAide" checked> Surligner les coups</label>
      <label>Difficulté <select id="optDiff">
        <option value="simple">Simple (chaînes : 2)</option>
        <option value="moyen">Moyen (chaînes : 4)</option>
        <option value="difficile">Difficile (chaînes : 6)</option></select></label>
      <label>Niveau <select id="optNiveau"></select></label>
    </div>
    <p class="regle">Joue une carte libre <b>juste au-dessus ou en dessous</b> de la carte active.
      Série = cartes jouées d'affilée sans piocher : chaque carte rapporte 100 × la série,
      +500 par sommet dégagé, +100 par carte restant en pioche si tu gagnes.<br>
      <b>Réserve</b> : touche l'emplacement vide pour y ranger la carte active (une carte de la pioche la remplace) ; touche la carte rangée pour la ramener en jeu.<br>
      <b>🔗 Chaîne</b> : la carte est bloquée jusqu'à ce que tu enchaînes assez de cartes d'affilée (selon la difficulté).
      <b>🔒 Cadenas</b> : il faut une <b>🗝 clé</b>, cachée sur une autre carte du tableau.
      <b>★ Joker</b> : il se joue sur n'importe quelle carte. Vide les 3 sommets pour passer au niveau suivant.</p>
    <div id="voile" class="voile" hidden></div>`;

  const $ = id => document.getElementById(id);
  const plateau = $('plateau');
  let partie = null;
  let aide = true;
  let bouclage = true;
  const NIVEAUX_MAX = 20;
  let niveau = Math.max(1, Number(API.reglage('niveau', 1)) || 1);
  let difficulte = API.reglage('diff', 'simple');
  if (!DIFFICULTES[difficulte]) difficulte = 'simple';

  function message(texte) { $('msg').textContent = texte || ''; }

  function remplirNiveaux() {
    const max = Math.max(NIVEAUX_MAX, niveau);   // tous les niveaux sont disponibles dès le départ
    $('optNiveau').replaceChildren(...Array.from({ length: max }, (_, i) =>
      Object.assign(document.createElement('option'), { value: i + 1, textContent: i + 1 })));
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
      plateau.appendChild(el);
    }

    // pile de pioche
    const bp = $('pioche');
    bp.replaceChildren(elDos(84));
    const nb = document.createElement('span');
    nb.className = 'badge';
    nb.textContent = partie.pioche.length;
    bp.appendChild(nb);
    bp.disabled = partie.pioche.length === 0 || partie.etat !== 'en_cours';

    // carte active
    const actif = elCarte(partie.active, 84);
    if (animer) actif.classList.add('pop');
    $('actif').replaceChildren(actif);

    // réserve : emplacement vide (clic = y ranger la carte active) ou carte rangée (clic = la reprendre)
    const rs = $('reserve');
    if (partie.reserve) {
      rs.replaceChildren(elCarte(partie.reserve, 84));
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
    $('niv').textContent = partie.niveau;
    const e = [];
    if (partie.config.chaines) e.push(partie.chainesActives ? `🔗 série ${partie.serie}/${partie.longueurChaine}` : '🔗 brisées');
    if (partie.config.cadenas) e.push(`🔒 ${partie.nbCadenas} · 🗝 ${partie.cles}`);
    $('etat').textContent = e.join('   ');
    $('annuler').disabled = partie.etat !== 'en_cours' || partie.historique.length === 0;
  }

  // ----- actions -----
  function apres(animer) {
    dessiner(animer);
    if (partie.etat !== 'en_cours') terminer();
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
  $('reserve').addEventListener('click', () => {
    if (partie.reserve) {
      if (partie.reprendreReserve()) { message('↩ Carte reprise depuis la réserve.'); apres(true); }
    } else if (partie.mettreEnReserve()) {
      message('📥 Carte mise en réserve : une carte de la pioche la remplace (série remise à 0).');
      apres(true);
    }
  });
  $('optDiff').value = difficulte;
  $('optDiff').addEventListener('change', e => { difficulte = e.target.value; API.regler('diff', difficulte); nouvelle(); });
  $('optNiveau').addEventListener('change', e => { niveau = Number(e.target.value); API.regler('niveau', niveau); nouvelle(); });
  $('nouvelle').addEventListener('click', nouvelle);
  $('optBoucle').addEventListener('change', e => { bouclage = e.target.checked; partie.bouclage = bouclage; dessiner(false); });
  $('optAide').addEventListener('change', e => { aide = e.target.checked; dessiner(false); });
  $('pseudo').value = (API.pseudo() === 'Joueur' ? '' : API.pseudo());
  $('pseudo').addEventListener('change', e => API.pseudo(e.target.value));
  window.addEventListener('resize', () => partie && dessiner(false));

  function nouvelle() {
    $('voile').hidden = true;
    remplirNiveaux();
    partie = new Partie({ bouclage, niveau, difficulte });
    message(descriptionNiveau(niveau, difficulte));
    dessiner(false);
    if (partie.etat !== 'en_cours') terminer();
  }

  // ----- fin de partie : sauvegarde + classement -----
  async function terminer() {
    const gagne = partie.etat === 'gagne';
    const voile = $('voile');
    voile.hidden = false;
    voile.innerHTML = `
      <div class="boite" role="dialog" aria-modal="true">
        <h2>${gagne ? `🏆 Niveau ${partie.niveau} réussi !` : `Niveau ${partie.niveau} : plus de coups possibles`}</h2>
        <p class="gros">${partie.score} points</p>
        <p class="detail">Meilleure série : ${partie.serieMax} · Sommets : ${partie.sommets}/3${gagne ? ' · Bonus pioche : ' + partie.bonusFinal : ''}</p>
        <p id="etatSauv" class="detail">Enregistrement…</p>
        <ol id="top" class="top"></ol>
        <button id="rejouer" class="gros-bouton">${gagne ? `Niveau ${partie.niveau + 1} ➜` : `Réessayer le niveau ${partie.niveau}`}</button>
        ${!gagne && partie.niveau > 1 ? '<button id="debut" class="lien">Recommencer au niveau 1</button>' : ''}
      </div>`;
    if (gagne) {   // le niveau suivant est débloqué et mémorisé tout de suite
      niveau = partie.niveau + 1;
      API.regler('niveau', niveau);
      API.regler('niveau_max', Math.max(Number(API.reglage('niveau_max', 1)) || 1, niveau));
    }
    $('rejouer').addEventListener('click', nouvelle);
    const debut = $('debut');
    if (debut) debut.addEventListener('click', () => { niveau = 1; API.regler('niveau', 1); nouvelle(); });

    const res = await API.sauver(partie);
    $('etatSauv').textContent = {
      en_ligne: '✓ Score enregistré dans Google Sheets',
      local: '✓ Score enregistré sur cet appareil',
      en_attente: '⚠ Hors connexion : le score sera envoyé plus tard'
    }[res.mode];

    const cl = await API.classement();
    const ol = $('top');
    if (!ol) return;
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
