# Pyramida

Pyramida : solitaire de type TriPeaks jouable sur iPhone (installable sur l'écran d'accueil, fonctionne hors connexion).

```
tripeaks/
├─ docs/                 ← le jeu (hébergé par GitHub Pages)
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/config.js       ← ICI : l'adresse du serveur Apps Script
│  ├─ js/logique.js      ← le "cerveau" : cartes, règles, score (sans écran)
│  ├─ js/cartes.js       ← le dessin des cartes (lions, chattes, pumas, dos)
│  ├─ js/api.js          ← la sauvegarde des scores
│  ├─ js/ui.js           ← l'affichage et les clics
│  ├─ manifest.json, sw.js, icons/   ← installation + mode hors ligne
└─ apps-script/Code.gs   ← le serveur (Google Apps Script + Google Sheets)
```

## 1. Mettre le jeu en ligne (GitHub Pages)
1. Crée un dépôt GitHub (ex. `tripeaks`) et envoie-y ces fichiers (bouton **Add file > Upload files**, en gardant les dossiers).
2. **Settings > Pages** : *Source* = `Deploy from a branch`, *Branch* = `main`, dossier = `/docs`. Enregistre.
3. Après 1 à 2 minutes, le jeu est à `https://TON-PSEUDO.github.io/tripeaks/`.

## 2. Brancher la sauvegarde des scores (Google Apps Script)
1. Sur script.google.com : **Nouveau projet**, colle le contenu de `apps-script/Code.gs`.
2. Choisis la fonction `autoriser` et clique **Exécuter** : accepte les autorisations (une feuille « TriPeaks - scores » est créée dans ton Drive).
3. **Déployer > Nouveau déploiement > Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Copie l'adresse qui finit par `/exec`, colle-la dans `docs/js/config.js` (`API_URL`), puis renvoie ce fichier sur GitHub.

> Pour modifier `Code.gs` plus tard : **Déployer > Gérer les déploiements > ✏️ > Nouvelle version**.
> L'adresse ne change pas, donc le jeu n'a rien à modifier.

## 3. Sur iPhone
Ouvre l'adresse dans **Safari**, puis **Partager > Sur l'écran d'accueil**.

## Tester la logique sans écran


## Niveaux et obstacles (v2)
- Niveau 1 : TriPeaks classique. Niveau 2 : chaînes. Niveau 3 : cadenas + clés. Niveau 4 : joker. Niveau 5+ : tout ensemble, de plus en plus dur.
- Difficulté = longueur de série pour briser les chaînes : Simple 2, Moyen 4, Difficile 6.
- Mise à jour de la v1 : remplacer les fichiers de `docs/` (et `Code.gs` + « Nouvelle version » du déploiement). Le fichier `docs/js/config.js` reste celui qui contient ton adresse `/exec` : ne pas l'écraser.
