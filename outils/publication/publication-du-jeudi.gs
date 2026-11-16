/**
 * ÉCHIQUIER D'ANIMATION — publication du jeudi
 *
 * Chaque jeudi vers 10 h (heure de Paris), ce script avance la branche `main` du dépôt GitHub
 * sur la branche prévue au calendrier, puis prévient sur Discord.
 * Il ne force jamais : si `main` ne peut pas simplement avancer, il ne touche à rien et le dit.
 *
 * Mise en place (une seule fois) :
 *  1. Paramètres du projet (roue dentée) > Propriétés du script, ajouter :
 *       GITHUB_TOKEN     le jeton GitHub (voir plus bas)
 *       DISCORD_WEBHOOK  l'adresse du webhook Discord
 *  2. Lancer la fonction `essai` : elle écrit sur Discord ce que le script ferait, sans rien publier.
 *  3. Lancer la fonction `installer` : elle programme l'exécution de chaque jeudi.
 *
 * Jeton GitHub : github.com > Settings > Developer settings > Personal access tokens > Fine-grained tokens.
 * Accès limité au dépôt echiquier-animation, permission « Contents : Read and write ».
 * Choisir une date d'expiration postérieure à la dernière publication du calendrier.
 */

const DEPOT = "MadickeTHIANE/echiquier-animation";
const FUSEAU = "Europe/Paris";

// Date du jeudi, branche à publier, titre du reel. Dans l'ordre.
const CALENDRIER = [
  ["2026-12-03", "etape/01-bataille-de-pions", "Bataille de pions"],
  ["2026-12-10", "etape/02-defi-tour", "Défis de la tour"],
  ["2026-12-17", "etape/03-lucky-luke", "Pions contre tour (Lucky Luke contre les Dalton)"],
  ["2026-12-24", "etape/04-defi-fou", "Défis du fou"],
  ["2026-12-31", "etape/05-pions-contre-fous", "Bataille de pions contre fous"],
  ["2027-01-07", "etape/06-cavalier-et-jument", "Le cavalier et sa jument"],
  ["2027-01-14", "etape/07-sanglier", "Cavalier contre fous (le sanglier et les chasseurs)"],
  ["2027-01-21", "etape/08-loup", "Dame contre pions (le loup dans la bergerie)"],
  ["2027-01-28", "etape/09-personnages", "Personnages"],
  ["2027-02-04", "etape/10-duel-des-rois", "Roi contre roi (l'opposition)"],
  ["2027-02-11", "etape/11-16-cases-dame", "Échiquier de 16 cases, version dame"],
  ["2027-02-18", "etape/12-16-cases-pion", "Échiquier de 16 cases, version pion"],
  ["2027-02-25", "etape/13-16-cases-roi", "Échiquier de 16 cases, version roi"],
  ["2027-03-04", "etape/14-bot-mad", "Jouez contre mon bot"],
  ["2027-03-11", "etape/15-exercices-de-mat", "S'entraîner en matant le bot"],
  ["2027-03-18", "etape/16-partie-classique", "Jouez contre mon bot (partie classique)"]
];

/** Exécutée chaque jeudi par le déclencheur. */
function publierLeJeudi() {
  executer_(false);
}

/** À lancer à la main : dit sur Discord ce qui serait fait, sans rien publier. */
function essai() {
  executer_(true);
}

/** À lancer une fois : programme l'exécution de chaque jeudi vers 10 h (entre 10 h et 11 h, heure de Paris). */
function installer() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "publierLeJeudi"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("publierLeJeudi").timeBased()
    .onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(10).nearMinute(0).inTimezone(FUSEAU).create();
  prevenir_("Publication automatique programmée : chaque jeudi vers 10 h. " + prochaine_(aujourdHui_()));
}

function executer_(aBlanc) {
  const prefixe = aBlanc ? "[Essai, rien n'est publié] " : "";
  try {
    const jour = aujourdHui_();
    // L'étape à publier : la dernière dont la date est passée ou est aujourd'hui.
    // Si un jeudi a été manqué, le suivant rattrape donc le retard.
    let etape = null;
    CALENDRIER.forEach(function (e) { if (e[0] <= jour) etape = e; });
    if (!etape) { prevenir_(prefixe + "Rien à publier aujourd'hui. " + prochaine_(jour)); return; }

    const branche = etape[1], titre = etape[2];
    const cible = github_("get", "/git/ref/heads/" + branche);
    if (cible.code !== 200) throw new Error("La branche " + branche + " est introuvable (" + cible.code + ").");
    const sha = cible.json.object.sha;

    const ecart = github_("get", "/compare/main..." + branche);
    if (ecart.code !== 200) throw new Error("Comparaison de main avec " + branche + " impossible (" + ecart.code + ").");
    const etat = ecart.json.status;     // ahead : la branche est en avance sur main ; identical ; behind ; diverged

    if (etat === "identical") { prevenir_(prefixe + "Le site est déjà à jour : « " + titre + " ». " + prochaine_(jour)); return; }
    if (etat === "behind") { prevenir_(prefixe + "Rien à faire : `main` est déjà plus loin que « " + titre + " ». " + prochaine_(jour)); return; }
    if (etat !== "ahead") {
      prevenir_("⚠️ " + prefixe + "Publication de « " + titre + " » impossible : `main` et `" + branche +
        "` ont divergé. Je n'ai rien modifié, il faut regarder le dépôt.");
      return;
    }
    if (aBlanc) { prevenir_(prefixe + "Je publierais « " + titre + " » en avançant `main` sur `" + branche + "`. " + prochaine_(jour)); return; }

    // Avance simple, jamais forcée : GitHub refuse si ce n'est pas possible.
    const maj = github_("patch", "/git/refs/heads/main", { sha: sha, force: false });
    if (maj.code !== 200) throw new Error("GitHub a refusé d'avancer main (" + maj.code + ") : " + maj.texte.slice(0, 200));
    prevenir_("✅ Publié : « " + titre + " » (`" + branche + "`). Le site sera à jour d'ici une à deux minutes. " + prochaine_(jour));
  } catch (erreur) {
    prevenir_("❌ " + prefixe + "Publication automatique en échec : " + erreur.message);
    throw erreur;
  }
}

function aujourdHui_() {
  return Utilities.formatDate(new Date(), FUSEAU, "yyyy-MM-dd");
}

function prochaine_(jour) {
  for (let i = 0; i < CALENDRIER.length; i++) {
    if (CALENDRIER[i][0] > jour) {
      const d = CALENDRIER[i][0].split("-");
      return "Prochaine publication : " + d[2] + "/" + d[1] + "/" + d[0] + ", « " + CALENDRIER[i][2] + " ».";
    }
  }
  return "Le calendrier est terminé : plus rien n'est programmé.";
}

function github_(methode, chemin, corps) {
  const jeton = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!jeton) throw new Error("La propriété GITHUB_TOKEN n'est pas renseignée.");
  const options = {
    method: methode,
    headers: { Authorization: "Bearer " + jeton, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    muteHttpExceptions: true
  };
  if (corps) { options.contentType = "application/json"; options.payload = JSON.stringify(corps); }
  const reponse = UrlFetchApp.fetch("https://api.github.com/repos/" + DEPOT + chemin, options);
  const texte = reponse.getContentText();
  let json = null;
  try { json = JSON.parse(texte); } catch (e) { }
  return { code: reponse.getResponseCode(), json: json, texte: texte };
}

function prevenir_(message) {
  const adresse = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK");
  if (!adresse) { Logger.log("DISCORD_WEBHOOK manquant. Message : " + message); return; }
  UrlFetchApp.fetch(adresse, {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    payload: JSON.stringify({ content: "**Échiquier d'animation** — " + message })
  });
  Logger.log(message);
}
