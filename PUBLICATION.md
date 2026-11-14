# Publication progressive

Tout le code du site est déjà présent. Ce que le public voit dépend d'une seule liste,
`window.ECHIQUIER_PUBLIE`, tout en haut de `index.html`.

## Les branches

Chaque branche `publication/NN-…` contient la précédente et ne change qu'une ligne de cette liste.
Pour publier la nouveauté de la semaine, il suffit d'avancer `main` sur la branche suivante.

| Branche | Ce qui devient visible |
|---|---|
| `publication/00-socle` | Rien de nouveau : seule l'animation libre est visible |
| `publication/01-mode-bataille-de-pions` | Bataille de pions |
| `publication/01b-mode-pions-contre-fous` | Les pions contre les fous |
| `publication/02-mode-lucky-luke` | Lucky Luke contre les Dalton |
| `publication/03-mode-defi-tour` | Défi de la tour |
| `publication/04-mode-defi-fou` | Défi du fou |
| `publication/05-mode-sanglier` | Sanglier contre chasseur |
| `publication/06-mode-cavalier-jument` | Le Cavalier et sa jument |
| `publication/07-mode-loup` | Loup dans la bergerie |
| `publication/08-mode-mousquetaires` | Les 4 Mousquetaires, niveau 1 |
| `publication/09-mode-mousquetaires-niveaux` | Les 4 Mousquetaires, niveaux 2 et 3 |
| `publication/10-mode-duel-des-rois` | Le duel des rois (l'opposition) |
| `publication/11-multijoueur` | Jouer en ligne |
| `publication/12-charte-graphique` | Mode sombre, police Poppins, règles sans sources |
| `publication/13-bot-mad` | Mad, le bot |

Exemple, pour publier la bataille de pions :

```bash
git checkout main
git merge --ff-only origin/publication/01-mode-bataille-de-pions
git push
```

Pour publier dans un autre ordre, modifier directement la liste dans `index.html`.

## Voir tout avant le public

Sur l'appareil de l'animateur, ouvrir une fois le site avec `?acces=complet` à la fin de l'adresse :
toutes les fonctionnalités s'affichent sur cet appareil, y compris celles qui ne sont pas publiées.
Un repère « Accès animateur » apparaît en haut de la page. `?acces=public` revient à la vue du public.

Ce réglage est une commodité, pas une protection : le code des fonctionnalités non publiées est lisible
par quiconque sait ouvrir les outils du navigateur.
