import re, subprocess, json
T="\n\nCo-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01C4YqpvSV8na3fw766Ucqqq"
# (branche, ce qui devient visible, modification du réglage)
STEPS=[
 ("00-socle","Rien de plus que l'animation libre (reel « Présentation »)",{}),
 ("01-bataille-de-pions","Bataille de pions",{"mode":"pions"}),
 ("02-defi-tour","Défi de la tour",{"mode":"defiTour"}),
 ("03-lucky-luke","Lucky Luke contre les Dalton (pions contre tour)",{"mode":"dalton"}),
 ("04-defi-fou","Défi du fou",{"mode":"defiFou"}),
 ("05-pions-contre-fous","Les pions contre les fous",{"mode":"fous"}),
 ("06-cavalier-et-jument","Le Cavalier et sa jument",{"mode":"jument"}),
 ("07-sanglier","Sanglier contre chasseur (cavalier contre fous)",{"mode":"sanglier"}),
 ("08-loup","Loup dans la bergerie (dame contre pions)",{"mode":"loup"}),
 ("09-personnages","Les images de personnages à la place des pièces",{"personnages":True}),
 ("10-duel-des-rois","Le duel des rois (l'opposition)",{"mode":"opposition"}),
 ("11-16-cases-dame","Les 4 Mousquetaires, niveau 1 · la dame",{"mode":"mousquetaires","niveauxMousquetaires":1}),
 ("12-16-cases-pion","Les 4 Mousquetaires, niveau 2 · le pion",{"niveauxMousquetaires":2}),
 ("13-16-cases-roi","Les 4 Mousquetaires, niveau 3 · le roi",{"niveauxMousquetaires":3}),
 ("14-bot-mad","Mad, le bot",{"bot":True}),
 ("15-jouer-en-ligne","Jouer en ligne",{"enLigne":True}),
 ("16-charte-graphique","Mode sombre et police Poppins",{"charte":True}),
]
cfg={"modes":["free"],"niveauxMousquetaires":1,"personnages":False,"enLigne":False,"charte":False,"bot":False}
def block(c):
    modes=",\n".join('        "%s"'%m for m in c["modes"])
    b=lambda v:"true" if v else "false"
    return ("window.ECHIQUIER_PUBLIE = {\n      modes: [\n%s\n      ],\n      niveauxMousquetaires: %d,\n      personnages: %s,\n      enLigne: %s,\n      charte: %s,\n      bot: %s\n    };"
            %(modes,c["niveauxMousquetaires"],b(c["personnages"]),b(c["enLigne"]),b(c["charte"]),b(c["bot"])))
def run(*a): subprocess.run(a,check=True)
table="\n".join("| `etape/%s` | %s |"%(n,d) for n,d,_ in STEPS)
md=open("PUBLICATION.md",encoding="utf-8").read()
i=md.index("| Branche |"); j=md.index("Exemple, pour publier")
md=md[:i]+"| Branche | Ce qui devient visible |\n|---|---|\n"+table+"\n\n"+md[j:]
md=md.replace("Chaque branche `reel/NN-…`","Chaque branche `etape/NN-…`").replace("origin/reel/01-bataille-de-pions","origin/etape/01-bataille-de-pions")
open("PUBLICATION.md","w",encoding="utf-8").write(md)
for k,(name,desc,ch) in enumerate(STEPS):
    if "mode" in ch: cfg["modes"].append(ch["mode"])
    for key in ch:
        if key!="mode": cfg[key]=ch[key]
    s=open("index.html",encoding="utf-8").read()
    s2,n=re.subn(r"window\.ECHIQUIER_PUBLIE = \{.*?\n    \};",lambda m:block(cfg),s,count=1,flags=re.S); assert n==1
    open("index.html","w",encoding="utf-8").write(s2)
    run("git","checkout","-q","-b","etape/"+name)
    msg=("Ordre de publication révisé : socle\n\nLes défis précèdent leur jeu, le jeu en ligne passe après le bot." if k==0 else "Publication : "+desc)
    run("git","commit","-q","-am",msg+T)
    print("etape/"+name, json.dumps(cfg["modes"]), cfg["niveauxMousquetaires"], {x:cfg[x] for x in ("personnages","bot","enLigne","charte")})
