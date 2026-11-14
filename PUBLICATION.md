# Publication progressive

Tout le code du site est déjà présent. Ce que le public voit dépend d'une seule liste,
`window.ECHIQUIER_PUBLIE`, tout en haut de `index.html`.

## Les branches

Chaque branche `reel/NN-…` contient la précédente et ne change qu'une ligne de cette liste.
Pour publier la nouveauté de la semaine, il suffit d'avancer `main` sur la branche suivante.

| Branche | Ce qui devient visible |
|---|---|
| `reel/00-socle` | Rien de plus que l'animation libre (reel « Présentation ») |
| `reel/01-bataille-de-pions` | Bataille de pions |
| `reel/02-pions-contre-fous` | Les pions contre les fous |
| `reel/03-lucky-luke` | Lucky Luke contre les Dalton (pions contre tour) |
| `reel/04-cavalier-et-jument` | Le Cavalier et sa jument |
| `reel/05-sanglier` | Sanglier contre chasseur (cavalier contre fous) |
| `reel/06-loup` | Loup dans la bergerie (dame contre pions) |
| `reel/07-personnages` | Les images de personnages à la place des pièces |
| `reel/08-duel-des-rois` | Le duel des rois (l'opposition) |
| `reel/09-16-cases-dame` | Les 4 Mousquetaires, niveau 1 · la dame |
| `reel/10-16-cases-pion` | Les 4 Mousquetaires, niveau 2 · le pion |
| `reel/11-16-cases-roi` | Les 4 Mousquetaires, niveau 3 · le roi |
| `reel/12-bot-mad` | Mad, le bot |
| `reel/13-defi-tour` | Défi de la tour (hors liste, placé à la suite) |
| `reel/14-defi-fou` | Défi du fou (hors liste, placé à la suite) |
| `reel/15-jouer-en-ligne` | Jouer en ligne (hors liste, placé à la suite) |
| `reel/16-charte-graphique` | Mode sombre et police Poppins (hors liste, placé à la suite) |

Exemple, pour publier la bataille de pions :

```bash
git checkout main
git merge --ff-only origin/reel/01-bataille-de-pions
git push
```

Pour publier dans un autre ordre, modifier directement la liste dans `index.html`.

## Voir tout avant le public

Sur l'appareil de l'animateur, ouvrir une fois le site avec `?acces=complet` à la fin de l'adresse :
toutes les fonctionnalités s'affichent sur cet appareil, y compris celles qui ne sont pas publiées.
Un repère « Accès animateur » apparaît en haut de la page. `?acces=public` revient à la vue du public.

Ce réglage est une commodité, pas une protection : le code des fonctionnalités non publiées est lisible
par quiconque sait ouvrir les outils du navigateur.
