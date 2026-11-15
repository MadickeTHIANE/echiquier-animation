# Le livre d'ouvertures de Mad

`mad.json` contient les coups que Madické joue réellement en début de partie, position par position.
En partie classique, à tous les niveaux, Mad choisit d'abord dans ce livre, en proportion du nombre
de fois où chaque coup a été joué ; dès que la position n'y figure plus, son moteur prend le relais.

Format : `{ "<position FEN : pièces trait roques>": [["e2e4", 12], ["d2d4", 3]] }`

Livre actuel : 398 parties Chess.com de Madou93 (30 mars au 15 novembre 2026), 12 premiers coups,
en ne gardant que les coups joués au moins deux fois dans la même position (191 positions).

Avec un fichier vide (`{}`), Mad joue uniquement avec son moteur.
