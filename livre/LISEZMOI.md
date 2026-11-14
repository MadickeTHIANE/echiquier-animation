# Le livre d'ouvertures de Mad

`mad.json` contient les coups que Madické joue réellement en début de partie, position par position.
En partie classique (niveaux moyen et fort), Mad choisit d'abord dans ce livre, en proportion du nombre
de fois où chaque coup a été joué ; dès que la position n'y figure plus, son moteur prend le relais.

Format : `{ "<position FEN : pièces trait roques en-passant>": [["e2e4", 12], ["d2d4", 3]] }`

Tant que le fichier est vide (`{}`), Mad joue uniquement avec son moteur.
