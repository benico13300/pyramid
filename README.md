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


## 5 niveaux de difficulté
- Niveau 1 (Facile) : peu de chaînes et de cadenas, beaucoup de jokers et de cartes bonus bleues / vertes.
- Plus on monte, plus il y a de chaînes et de cadenas, et la série pour briser les chaînes est de 2 cartes au niveau 1 puis de 3 cartes aux niveaux suivants, avec de moins en moins de jokers et de cartes bonus. Le niveau 5 (Expert) n'a plus de carte verte ni de joker sur le tableau.
- Quand tu perds, tu peux rejouer exactement la même partie (même donne, mêmes obstacles).
- Mise à jour : remplacer les fichiers de `docs/`, sans écraser `docs/js/config.js` (il contient ton adresse `/exec`).


## Score et bonus de fin de partie

- Points de jeu : cartes, sommets, séries (affichés pendant la partie).
- Victoire uniquement : +300 par joker restant, +50 par carte restante dans la pioche, +5 points par seconde gagnée sous 10 minutes (max 3000).
- Le chrono démarre avec la partie et se met en pause quand la page est masquée.
- L'enregistrement ne bloque pas le bouton « Rejouer » : le score est d'abord placé dans une file locale puis envoyé ; rien n'est perdu si une nouvelle partie démarre.
- Le Sheet reçoit deux colonnes en plus : `temps_s` et `points_jeu`. Après avoir mis à jour `Code.gs`, faire « Déployer > Gérer les déploiements > Nouvelle version ».
