# Astronavigation — état du frontend (carte / UI)  ·  note de coordination

> Rédigé le **2026-07-13**. But : qu'un autre Claude Code travaillant en parallèle (fonctions MJ)
> sache où j'en suis et **ne rentre pas en conflit**. Ce fichier est hors zip (dossier `docs/` exclu).

## Versions publiées (GitHub releases, `releases/latest`)
- **swffg-astronavigation : v1.7.5** — `github.com/wanoo/swffg-astronavigation` (repo autonome).
- **swffg-holocron : v1.2.2** — releasé dans le repo de l'app web `github.com/wanoo/swffg-holocron`
  (les releases GitHub de ce dépôt sont dédiées au module ; l'app web déploie via Clever).

## État de la carte / UI de l'Astronav (ce sur quoi j'étais)
Tout vit dans **`scripts/astronav.mjs`** (fichier unique, pas d'import local).

- **Deux toggles indépendants (4 états)** — barre haut-gauche de la carte :
  - 🌌 **Hyperspace** (`data-lane="all"`, `_map.showLanes`) : dessine/masque l'**overlay du réseau**
    des voies hyperspatiales canon (`data/lanes.json`, champ `pts`), labels des grandes routes.
  - 🛣️ **Routes (carte)** (`data-bg="routes"`, `_map.bgRoutes`) : **bascule le fond de carte**
    entre `img/galaxy-map.jpg` (routes cuites) et `img/galaxy-map-clean.jpg` (fond épuré, inpainting).
  - Helper `BG(routes)` ; réglage monde `mapBackground` (défaut `clean`) = valeur par défaut du toggle.
- **Le tracé ne dessine QUE le chemin calculé (A\*)** — plus d'overlay réseau permanent. Styles
  `SEG_STYLE` : `major` or `#ffd76a`, **`minor` violet vif `#bf3bff` (épais + halo)**, `off` bleu pointillé.
- **POI « vous êtes ici »** : `api.setCurrentWorld(nom)` / `api.currentWorld()` ; un jet d'Astrogation
  réussi (`ffgDiceMessage` + flag `astronavTrip`) déplace le POI vers la destination.
- **Contrat d'usure** : `api.usure()` / `api.setUsure(pct)` (0–100) → pilote la difficulté
  (>50 % +1, >80 % +2) ; `onChange` du réglage `usure` **recalcule en direct** les fenêtres ouvertes.
- Difficulté affichée en **glyphes FFG** (`dietype starwars` spans), pas d'Unicode.

**API exposée** : `open, setLeg, showWorld, chooser, favorites, setCurrentWorld, currentWorld,
usure, setUsure, importToWorld, data, lastCost, AstronavApp`.

## Testé en direct (Chrome) le 2026-07-13
Monde `star-wars` sur `https://rpg.rougeux-erwan.fr/star-wars/game` (injection 1.7.x à la volée) :
trajet Corellia→Tatooine, **4 états de toggles OK**, **segment secondaire violet + halo OK**,
« Vous êtes ici Corellia » OK, difficulté FFG OK, **0 erreur console**. Le monde a `mapBackground="routes"`.
⚠️ Ce monde a encore l'astronav **1.7.1 installée** — à mettre à jour vers 1.7.5.

## Fix récent (issue utilisateur)
v1.7.5 : activation bloquée « prérequis » car compat v12+ mais MEJ ≥13 exigé (MEJ 13.x = Foundry v13).
→ **compat minimale Foundry v13**, dépendance MEJ **sans pin** + **manifeste fourni**. MEJ n'a aucune
dépendance cachée.

## Coordination — pour ne pas se marcher dessus
- **Je « possède » `scripts/astronav.mjs`** (carte/UI/astrogation). Merci de me pinguer avant d'y toucher.
- **Fonctions MJ** = surtout le module **Holocron** : `scripts/gm-tools.mjs` (boîte à outils MJ :
  Peur, Destin, dégâts de groupe, critiques, boutiques…) et `scripts/deck.mjs`/`util.mjs`/`main.mjs`.
  ⚠️ **Source canonique du Holocron = `~/Documents/Dev/swffg-holocron/foundry/`** (repo web, commité).
  Le dossier `star-wars JDR/swffg-holocron/` est une **copie de build** (doublon à ranger) — ne pas
  éditer là. Contrat d'intégration : `~/Documents/Dev/swffg-holocron/docs/ASTRONAV-SYNC.md`.
- Holocron consomme l'API astronav ci-dessus (POI, usure, favoris, coût). Si tu ajoutes une fonction
  MJ qui touche au voyage/à la carte, passe par l'API — ne réimplémente pas la carte.

## Restes / idées (non bloquants)
- Mettre à jour l'astronav installée du monde de test en 1.7.5.
- Durcir préventivement les dépendances du Holocron (manifestes fournis, compat v13) — même classe de bug.
- Vérifier en direct usure→difficulté sur un vrai jet ; ranger le doublon de source Holocron.
