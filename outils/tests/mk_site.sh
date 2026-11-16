#!/bin/bash
# Copie de test où tout est publié (comme sur la dernière branche).
S=/tmp/claude-0/-home-claude/bbbbb37f-88e4-507c-b0c4-b44719b536d7/scratchpad
rm -rf $S/site && mkdir -p $S/site && cp -r /home/claude/echiquier-animation/{index.html,net.js,bot.js,moteur.js,cahier.js,livre,vendor,fonts,pieces,voix} $S/site/ 2>/dev/null
python3 - <<'PY'
import re
p='/tmp/claude-0/-home-claude/bbbbb37f-88e4-507c-b0c4-b44719b536d7/scratchpad/site/index.html'; s=open(p,encoding='utf-8').read()
s2=re.sub(r'window\.ECHIQUIER_PUBLIE = \{.*?\n    \};','window.ECHIQUIER_PUBLIE = { modes: ["free","pions","fous","mousquetaires","loup","sanglier","dalton","opposition","defiTour","defiFou","jument","mat","classique","problemes"], niveauxMousquetaires: 3, personnages: true, enLigne: true, charte: true, bot: true };',s,count=1,flags=re.S)
assert s2!=s; open(p,'w',encoding='utf-8').write(s2)
PY
mkdir -p $S/t && for f in $S/*.py; do sed 's/8765/8766/g' $f > $S/t/$(basename $f); done
