'use strict';
/* =====================================================================
   api.js — la sauvegarde des scores.
   - Toujours : une copie sur l'appareil (localStorage).
   - Si CONFIG.API_URL est rempli : envoi à Google Apps Script (Google Sheets).
   - Pas de connexion : le score attend dans une file et repart plus tard.
   ===================================================================== */

const API = (() => {
  const memoire = {}; // secours si localStorage est indisponible

  const stock = {
    lire(cle, defaut) {
      try {
        const v = localStorage.getItem(cle);
        return v === null ? defaut : JSON.parse(v);
      } catch (e) { return cle in memoire ? memoire[cle] : defaut; }
    },
    ecrire(cle, valeur) {
      try { localStorage.setItem(cle, JSON.stringify(valeur)); }
      catch (e) { memoire[cle] = valeur; }
    }
  };

  const adresse = () => (window.CONFIG && window.CONFIG.API_URL) || '';

  function idJoueur() {
    let id = stock.lire('tp_id', null);
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
         : 'j' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      stock.ecrire('tp_id', id);
    }
    return id;
  }

  function pseudo(nouveau) {
    if (nouveau !== undefined) stock.ecrire('tp_pseudo', String(nouveau).trim().slice(0, 20));
    return stock.lire('tp_pseudo', '') || 'Joueur';
  }

  // POST en "text/plain" (la valeur par défaut avec une chaîne) : évite la
  // pré-vérification CORS, que les web apps Apps Script ne savent pas gérer.
  async function poster(corps) {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 20000);   // jamais bloqué plus de 20 s
    try {
      const r = await fetch(adresse(), { method: 'POST', body: JSON.stringify(corps), signal: ctrl.signal });
      const rep = await r.json();
      if (!rep.ok) throw new Error(rep.erreur || 'refusé');
      return rep;
    } finally { clearTimeout(minuteur); }
  }

  function ligneDe(partie) {
    return {
      action: 'sauver',
      joueurId: idJoueur(),
      pseudo: pseudo(),
      score: partie.score,
      serieMax: partie.serieMax,
      sommets: partie.sommets,
      gagne: partie.etat === 'gagne',
      graine: partie.graine,
      temps: partie.temps,
      pointsJeu: partie.pointsJeu,
      niveau: partie.niveau,
      difficulte: partie.difficulte,
      date: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    };
  }

  // Le score est d'abord rangé sur l'appareil (scores + file d'envoi), PUIS envoyé.
  // Il n'est donc pas perdu si on relance une partie ou si on ferme l'app pendant l'envoi :
  // la file se vide au prochain envoi réussi.
  let envoi = Promise.resolve();   // les envois se font un par un

  async function sauver(partie) {
    const ligne = ligneDe(partie);
    const locaux = stock.lire('tp_scores', []);
    locaux.push(ligne);
    stock.ecrire('tp_scores', locaux.slice(-100));
    if (!adresse()) return { mode: 'local' };

    const file = stock.lire('tp_file', []);
    file.push(ligne);
    stock.ecrire('tp_file', file.slice(-50));
    await envoyerFile();
    const reste = stock.lire('tp_file', []);
    return { mode: reste.some(l => l.id === ligne.id) ? 'en_attente' : 'en_ligne' };
  }

  // Envoie les scores de la file, un par un ; un score envoyé en sort tout de suite
  function envoyerFile() {
    envoi = envoi.then(async () => {
      if (!adresse()) return;
      for (const l of stock.lire('tp_file', [])) {
        try {
          await poster(l);
          stock.ecrire('tp_file', stock.lire('tp_file', []).filter(x => x.id !== l.id));
        } catch (e) { /* il reste dans la file, on réessaiera */ }
      }
    });
    return envoi;
  }

  function classementLocal() {
    return stock.lire('tp_scores', [])
      .slice().sort((a, b) => b.score - a.score).slice(0, 10)
      .map(l => ({ pseudo: l.pseudo, score: l.score, gagne: l.gagne }));
  }

  async function classement() {
    if (adresse()) {
      try {
        const r = await fetch(adresse() + '?action=classement');
        const rep = await r.json();
        if (rep.ok) return { mode: 'en_ligne', lignes: rep.lignes };
      } catch (e) { /* on retombe sur le local */ }
    }
    return { mode: 'local', lignes: classementLocal() };
  }

  function record() {
    return stock.lire('tp_scores', []).reduce((m, l) => Math.max(m, l.score), 0);
  }

  // Réglages mémorisés sur l'appareil : niveau en cours, niveau max atteint, difficulté
  const reglage = (cle, defaut) => stock.lire('tp_' + cle, defaut);
  const regler = (cle, valeur) => stock.ecrire('tp_' + cle, valeur);

  return { sauver, envoyerFile, classement, pseudo, record, idJoueur, reglage, regler };
})();
