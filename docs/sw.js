/* sw.js — permet de jouer hors connexion.
   Stratégie : on sert la copie en cache tout de suite, et on la met à jour
   en arrière-plan (la nouvelle version apparaît au lancement suivant).
   Pour forcer une mise à jour : changer VERSION. */
const VERSION = 'tripeaks-v10';
const FICHIERS = [
  './', 'index.html', 'css/style.css', 'manifest.json',
  'js/config.js', 'js/logique.js', 'js/cartes.js', 'js/api.js', 'js/ui.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // On ne touche qu'aux fichiers du jeu (pas à l'API Google, qui est sur un autre domaine)
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then(enCache => {
      const reseau = fetch(req).then(rep => {
        if (rep.ok) caches.open(VERSION).then(c => c.put(req, rep.clone()));
        return rep;
      }).catch(() => enCache);
      return enCache || reseau;
    })
  );
});
