# Passation — Échiquier d'animation (Échecs et Mad)

Document de reprise rédigé le 16 novembre 2026. Il suffit à un nouvel assistant (ou à Madické) pour
reprendre le projet sans l'historique des conversations. À lire en entier avant toute modification.

## 1. Le projet en une minute

- Site statique, sans serveur : `index.html` (cœur, règles, interface, CSS), `bot.js` (Mad, le bot),
  `moteur.js` (moteur d'échecs de Mad), `net.js` (jeu en ligne PeerJS), `cahier.js` (53 problèmes),
  `voix/` (46 mp3 + `liste.js`), `livre/mad.js` (ouvertures de Madické), `pieces/`, `fonts/`, `vendor/`.
- Hébergement : GitHub Pages, dépôt `MadickeTHIANE/echiquier-animation`, branche `main`.
- Propriétaire : Madické Thiane, animateur d'échecs. Réponses en français, tutoiement, direct et structuré.

## 2. Règles de travail à respecter absolument

1. **Ne jamais pousser ni réécrire `main`.** Madické (ou le script du jeudi) l'avance lui-même.
2. **Pas de push forcé, pas de suppression de branche** : le dépôt les refuse à l'assistant (403).
   Tout se fait par avances simples (fast-forward). Les branches à supprimer sont signalées à Madické.
3. **Publication progressive.** Tout le code est dans toutes les branches ; seul le bloc
   `window.ECHIQUIER_PUBLIE` en tête de `index.html` change d'une étape à l'autre
   (`modes`, `niveauxMousquetaires`, `personnages`, `enLigne`, `charte`, `bot`).
   `?acces=complet` affiche tout sur l'appareil (mémorisé), `?acces=public` revient à la vue publique.
4. **Chaîne des étapes** : `etape/00-socle` → `etape/01-…` → … → `etape/19-cahier-de-problemes`
   (table dans `PUBLICATION.md`). Chaque étape = la précédente + un commit de réglage.
5. **Pour livrer un changement de code** : le committer sur `etape/00-socle`, puis pour chaque étape
   suivante, dans l'ordre : `git checkout etape/NN && git merge etape/(NN-1)`, puis pousser toutes les
   branches. Vérifier ensuite que chaque branche locale = distante et que `origin/main` n'a pas bougé.
6. **Toujours revérifier le dépôt avant d'agir** (`git fetch --prune`) : Madické avance `main`, supprime
   des branches et committe parfois lui-même.
7. **Dire ce qui est vérifié et ce qui ne l'est pas.** L'assistant ne peut pas écouter un son, ni joindre
   Chess.com, ni le service PeerJS public depuis son environnement.

## 3. Calendrier de publication

Un reel par jeudi à 12 h. Le script Google Apps Script `outils/publication/publication-du-jeudi.gs`
(installé par Madické dans son projet Google, jeton GitHub et webhook Discord en propriétés du script)
avance `main` chaque jeudi vers 10 h et prévient sur Discord. Du 03/12/2026 (`etape/01`) au 18/03/2027
(`etape/16`). Les étapes 17 (charte), 18 (jeu en ligne) et 19 (cahier) ne sont pas programmées.
Tout changement de nom de branche ou de date doit être reporté dans la liste `CALENDRIER` du script.

## 4. État des fonctions

| Fonction | État |
|---|---|
| Animation libre, flèches, images de personnages | En ligne |
| Mini-jeux (pions, défis tour/fou, Lucky Luke, pions contre fous, jument, sanglier, loup, duel des rois, Mousquetaires ×3) | Faits, testés, publiés selon le calendrier |
| Mad (bot) : 3 niveaux, avatar à 6 expressions, 46 répliques avec voix | Fait. Voix : alignement vérifié par Madické sur 3 fichiers |
| Échecs complets (roque, en passant, promotion, nulles), exercices de mat, partie classique | Faits. Règles vérifiées par comptage de coups (perft) |
| Livre d'ouvertures de Madické (398 parties Chess.com, pseudo Madou93) | Fait |
| Cahier de problèmes (53, le n° 21 exclu car erroné) | Fait. Les 53 corrigés rejoués avec succès |
| Jeu en ligne | **Ne fonctionne pas chez Madické** (échec en Wi-Fi comme en 4G). Diagnostic ajouté, cause inconnue |

## 5. Points ouverts (par priorité)

1. **Mission « code non public »** : voir section 6.
2. **Jeu en ligne** : attendre de Madické la ligne « Détail technique » affichée lors d'un échec.
   Piste de secours : relais (compte gratuit à créer) ; non commencé.
3. **Texte « Échec au roi » qui décale l'image pendant les enregistrements** : proposition faite de
   réserver la place en permanence (`.status .meta`) ; Madické n'a pas répondu. Il a un `display:none`
   commenté dans le CSS pour ses tournages.
4. **Problème 20 du cahier** : `1…Td1` gagne aussi d'après le moteur ; seul le coup du corrigé est
   accepté. Décision de Madické attendue. Erreurs de notation dans son corrigé imprimé : 50 (`Dxg3+`),
   51 (`Tf8+`, pas une prise).
5. **Niveau « Mad comme en vrai »** calé sur le classement de Madické (≈1440 en 10 min) : proposé, sans réponse.
6. **Authentification des familles** pour réserver Mad aux inscrits (rentrée de septembre 2027) : non commencé.
7. **Jeu « Les chèvres de M. Seguin »** : Madické y réfléchit encore.
8. Adresse plus courte pour le site : non tranché.

## 6. Mission suivante : garder le site en ligne sans exposer le code sur GitHub

### Ce qu'il faut d'abord expliquer à Madické (à ne pas édulcorer)

- Le site est **entièrement exécuté dans le navigateur** : tout fichier servi (`index.html`, `bot.js`,
  `moteur.js`, `cahier.js` avec les solutions, voix, livre) reste lisible par n'importe quel visiteur,
  dépôt privé ou non. Rendre le dépôt privé cache l'**historique**, les **branches non publiées**,
  les outils et les messages de commit, pas le code livré.
- Il n'y a **aucun serveur, aucune base de données, aucun secret dans le code** : la surface d'attaque
  est faible. Le jeton GitHub et le webhook Discord vivent dans les propriétés du script Google.
  Le webhook a toutefois été collé dans une conversation : le régénérer serait prudent.
- Le vrai point faible est ailleurs : **`?acces=complet` n'est pas une protection**. Toutes les
  fonctions « non publiées » sont déjà dans les fichiers servis et s'activent avec ce paramètre.
  Tant que c'est le cas, réserver Mad aux familles payantes est impossible.

### Options d'hébergement (à revérifier dans la documentation officielle avant de recommander)

| Option | Principe | Coût | Effet sur l'adresse | Effet sur le script du jeudi |
|---|---|---|---|---|
| A. GitHub Pro | Dépôt privé, GitHub Pages conservé | payant (quelques €/mois) | aucune | aucun |
| B. Cloudflare Pages (ou Netlify) | Dépôt privé relié à l'hébergeur, déploiement à chaque avance de `main` | gratuit | nouvelle adresse (`*.pages.dev`) ou nom de domaine | aucun (il pousse toujours `main`) |
| C. Dépôt privé + dépôt public de déploiement | Une action copie les fichiers publiés vers un dépôt public servi par Pages | gratuit | aucune si le dépôt public garde le nom actuel | à adapter |

À vérifier : GitHub Pages sur dépôt privé exige une offre payante pour un compte personnel
(c'était le cas à la rédaction). Si l'adresse change, mettre à jour les liens des reels, de la bio et le QR du jeu en ligne.

### Plan proposé, par étapes validables une à une

1. **Décision d'hébergement** avec Madické (A, B ou C) après vérification des conditions actuelles.
2. **Étape de fabrication (build)** : un script qui produit, pour une étape donnée, un dossier `site/`
   ne contenant **que** ce qui est publié : modes absents retirés de `MODES`, `bot.js`/`moteur.js`/`voix/`
   /`livre/` omis tant que `bot` est faux, `net.js`/`vendor/peerjs` omis tant que `enLigne` est faux,
   `cahier.js` omis tant que le mode n'est pas publié. `?acces=complet` ne doit plus rien révéler
   sur le site public. Garder un moyen d'essai pour Madické (site de prévisualisation privé ou local).
3. **Déploiement** : brancher la fabrication sur l'hébergeur choisi ; vérifier que le script du jeudi
   déclenche bien une mise en ligne ; faire un essai complet sur une branche de test avant `main`.
4. **Bascule** : rendre le dépôt privé (action de Madické), contrôler que le site répond toujours,
   que le jeton du script Google a encore les droits, et que le clone de travail de l'assistant fonctionne.
5. **Nettoyage** : mettre à jour `PUBLICATION.md`, ce document et le script si des noms ont changé.
6. **Plus tard, pour l'accès réservé aux familles** : il faut un vrai service d'authentification
   (compte gratuit type Supabase/Firebase ou fonctions de l'hébergeur) qui ne délivre les fichiers de Mad
   qu'aux inscrits. À cadrer avec Madické : nombre de familles, mode d'inscription, RGPD (mineurs).

### Risques à surveiller pendant la mission

- Un dépôt rendu privé **désactive GitHub Pages** sur une offre gratuite : ne pas basculer avant que le
  nouvel hébergement soit en place et testé, surtout un jeudi.
- Les branches `etape/…` restent publiques tant que le dépôt l'est : elles montrent déjà tout le calendrier.
- L'étape de fabrication ne doit pas casser la règle « avance simple de `main` » sur laquelle repose le script.

## 7. Tester

Les outils sont dans `outils/` (ils viennent de l'espace temporaire de l'assistant : les chemins en dur
`/tmp/claude-0/…/scratchpad` sont à adapter).

- `outils/tests/mk_site.sh` : copie de test où tout est publié, servie par `python3 -m http.server 8766`.
- Tests Playwright (Python) : `chess_test.py` (mats, parties, roque, promotion), `perft_core.py`
  (règles d'échecs du site), `pz_test.py` (cahier), `rules_test.py` (défis, loup, sanglier, voix),
  `oracle_test.py` et `self_test.py` (force de Mad), `voice_test.py`, `file_test.py` (ouverture en `file://`),
  `etape_test.py` (ce que voit le public à une étape), `net_test.py` (jeu en ligne, avec
  `serveur-peer-local.js` sur 127.0.0.1:9000).
- Moteur seul : `node -e "const M=require('./moteur.js'); M.setFen('…'); console.log(M.perft(4))"`
  (position de départ : 197 281).
- `outils/donnees/` : `livre.js` (PGN → `livre/mad.js`), `analyse.js` (statistiques des parties),
  `cahier-verifier.js` et `gen_cahier.js` (corrigé → `cahier.js`, nécessite `npm i chess.js`),
  `seg.py` (découpe d'un enregistrement selon les silences), `voix-liste.js` (régénère `voix/LISEZMOI.md`).
- `outils/publication/chain2.py` : reconstruit la chaîne des étapes ; `publication-du-jeudi.gs` : le script Google.

## 8. Pièges déjà rencontrés

- Deux fonctions du même nom dans `bot.js` : la seconde écrase la première sans erreur (cas de `play`).
- Le moteur s'arrête par exception quand le temps est écoulé : la position doit être restaurée (c'est fait dans `think`).
- `fetch` ne marche pas quand `index.html` est ouvert depuis le disque : les données passent par des
  fichiers de script (`voix/liste.js`, `livre/mad.js`, `cahier.js`). `pieces/list.txt` utilise encore `fetch`.
- Messages de commit : en français, avec les lignes d'attribution demandées par la session en cours.
- Au duel des rois, les Blancs gagnent de force par 1.Re2 (calcul complet) ; Lucky Luke gagne contre les
  Dalton isolés, les Dalton liés gagnent.
