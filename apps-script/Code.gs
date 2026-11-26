/**
 * Code.gs — le "serveur" du TriPeaks (Google Apps Script).
 * Reçoit les scores envoyés par le jeu (GitHub Pages) et les écrit dans une Google Sheet.
 *
 * Déploiement : Déployer > Nouveau déploiement > Application Web
 *   Exécuter en tant que : Moi
 *   Qui a accès : Tout le monde   (obligatoire : le jeu est sur un autre site)
 * Ensuite, copier l'adresse en /exec dans docs/js/config.js.
 */

const NOM_FEUILLE = 'scores';
const ENTETES = ['date', 'joueur_id', 'pseudo', 'score', 'serie_max', 'sommets', 'gagne', 'graine', 'niveau', 'difficulte'];
const DIFFICULTES = ['simple', 'moyen', 'difficile'];
const SCORE_MAX = 100000;      // un score plus grand est forcément truqué
const DELAI_MIN_SECONDES = 5;  // un même joueur ne peut pas enregistrer plus vite

/** À lancer UNE fois à la main (▶ Exécuter) pour autoriser l'accès à Google Sheets. */
function autoriser() {
  feuille_();
  Logger.log('OK : la feuille est prête.');
}

// ---------- lecture : le classement ----------
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'classement';
  if (action === 'classement') return json_({ ok: true, lignes: meilleurs_(10) });
  return json_({ ok: false, erreur: 'action inconnue' });
}

// ---------- écriture : un nouveau score ----------
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.action !== 'sauver') return json_({ ok: false, erreur: 'action inconnue' });

    // 1. valider : on ne fait jamais confiance au navigateur
    const score = Math.floor(Number(d.score));
    const serieMax = Math.floor(Number(d.serieMax));
    const sommets = Math.floor(Number(d.sommets));
    const joueurId = String(d.joueurId || '');
    if (!(score >= 0 && score <= SCORE_MAX)) return json_({ ok: false, erreur: 'score invalide' });
    if (!(serieMax >= 0 && serieMax <= 28)) return json_({ ok: false, erreur: 'série invalide' });
    if (!(sommets >= 0 && sommets <= 3)) return json_({ ok: false, erreur: 'sommets invalides' });
    if (!/^[A-Za-z0-9-]{8,64}$/.test(joueurId)) return json_({ ok: false, erreur: 'joueur invalide' });
    const niveau = Math.floor(Number(d.niveau || 1));
    const difficulte = String(d.difficulte || 'simple');
    if (!(niveau >= 1 && niveau <= 99)) return json_({ ok: false, erreur: 'niveau invalide' });
    if (DIFFICULTES.indexOf(difficulte) < 0) return json_({ ok: false, erreur: 'difficulté invalide' });

    // 2. limiter le rythme
    const cache = CacheService.getScriptCache();
    if (cache.get('rl_' + joueurId)) return json_({ ok: false, erreur: 'trop rapide' });
    cache.put('rl_' + joueurId, '1', DELAI_MIN_SECONDES);

    // 3. écrire (un seul à la fois grâce au verrou)
    const verrou = LockService.getScriptLock();
    verrou.waitLock(10000);
    try {
      feuille_().appendRow([
        new Date(), joueurId, nettoyer_(d.pseudo), score, serieMax, sommets,
        d.gagne === true, String(d.graine || ''), niveau, difficulte
      ]);
    } finally {
      verrou.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erreur: 'requête invalide' });
  }
}

// ---------- outils ----------
function feuille_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  if (!id) {
    const ss = SpreadsheetApp.create('TriPeaks - scores');
    ss.getActiveSheet().setName(NOM_FEUILLE).appendRow(ENTETES);
    id = ss.getId();
    props.setProperty('SHEET_ID', id);
  }
  const feuille = SpreadsheetApp.openById(id).getSheetByName(NOM_FEUILLE);
  // Ancienne feuille (8 colonnes) : on ajoute les en-têtes niveau et difficulte
  if (feuille.getLastColumn() < ENTETES.length) {
    feuille.getRange(1, 1, 1, ENTETES.length).setValues([ENTETES]);
  }
  return feuille;
}

function meilleurs_(n) {
  const lignes = feuille_().getDataRange().getValues().slice(1); // sans l'en-tête
  return lignes
    .sort((a, b) => b[3] - a[3])
    .slice(0, n)
    .map(l => ({ pseudo: l[2], score: l[3], gagne: l[6] === true }));
}

// Pseudo : 20 caractères max, sans caractères de contrôle, et sans formule (=, +, -, @)
function nettoyer_(pseudo) {
  let p = String(pseudo || 'Joueur').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20) || 'Joueur';
  if (/^[=+\-@]/.test(p)) p = "'" + p;
  return p;
}

function json_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
