# Publication progressive

Tout le code du site est déjà présent. Ce que le public voit dépend d'une seule liste,
`window.ECHIQUIER_PUBLIE`, tout en haut de `index.html`.

## Les branches

Chaque branche `etape/NN-…` contient la précédente et ne change qu'une ligne de cette liste.
Pour publier la nouveauté de la semaine, il suffit d'avancer `main` sur la branche suivante.

| Branche | Ce qui devient visible |
|---|---|
| `etape/00-socle` | Rien de plus que l'animation libre (reel « Présentation ») |
| `etape/01-bataille-de-pions` | Bataille de pions |
| `etape/02-defi-tour` | Défi de la tour |
| `etape/03-lucky-luke` | Lucky Luke contre les Dalton (pions contre tour) |
| `etape/04-defi-fou` | Défi du fou |
| `etape/05-pions-contre-fous` | Les pions contre les fous |
| `etape/06-cavalier-et-jument` | Le Cavalier et sa jument |
| `etape/07-sanglier` | Sanglier contre chasseur (cavalier contre fous) |
| `etape/08-loup` | Loup dans la bergerie (dame contre pions) |
| `etape/09-personnages` | Les images de personnages à la place des pièces |
| `etape/10-duel-des-rois` | Le duel des rois (l'opposition) |
| `etape/11-16-cases-dame` | Les 4 Mousquetaires, niveau 1 · la dame |
| `etape/12-16-cases-pion` | Les 4 Mousquetaires, niveau 2 · le pion |
| `etape/13-16-cases-roi` | Les 4 Mousquetaires, niveau 3 · le roi |
| `etape/14-bot-mad` | Mad, le bot |
| `etape/15-jouer-en-ligne` | Jouer en ligne |
| `etape/16-charte-graphique` | Mode sombre et police Poppins |
| `etape/17-exercices-de-mat` | Exercices de mat contre Mad |
| `etape/18-partie-classique` | Partie classique, à deux ou contre Mad |

Exemple, pour publier la bataille de pions :

```bash
git checkout main
git merge --ff-only origin/etape/01-bataille-de-pions
git push
```

Pour publier dans un autre ordre, modifier directement la liste dans `index.html`.

## Voir tout avant le public

Sur l'appareil de l'animateur, ouvrir une fois le site avec `?acces=complet` à la fin de l'adresse :
toutes les fonctionnalités s'affichent sur cet appareil, y compris celles qui ne sont pas publiées.
Un repère « Accès animateur » apparaît en haut de la page. `?acces=public` revient à la vue du public.

Ce réglage est une commodité, pas une protection : le code des fonctionnalités non publiées est lisible
par quiconque sait ouvrir les outils du navigateur.
