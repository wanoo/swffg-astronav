# Cahier de recette — SWFFG Astronav

Version cible : **1.3.0** · Système : **starwarsffg** · Foundry VTT **v13** (v12 mini)
· **requiert** Monk's Enhanced Journal.

Déroule chaque cas dans l'ordre, note le résultat (✅ / ❌) et la remarque éventuelle.
Les cas marqués **MJ** nécessitent un compte MJ ; **PJ** un compte joueur.

Table de matières : [0. Installation](#0-installation) · [1. Compendium](#1-compendium-planètes)
· [2. Astrogation](#2-calculateur-dastrogation) · [3. Navi-Computer](#3-navi-computer-tableau-de-bord)
· [4. Réglages](#4-réglages-du-module) · [5. Cas limites](#5-cas-limites) · [6. Transverse](#6-transverse)

---

## 0. Installation

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 0.1 | Installer par manifeste | Configuration → Modules → Installer un module → coller `https://sw-wanoo-holocron.cleverapps.io/modules/swffg-astronav/module.json` → Installer | Le module **SWFFG Astronav 1.1.1** apparaît, sans erreur de téléchargement. | |
| 0.2 | Mise à jour détectée | Si une 1.1.0 était installée : rouvrir la liste des modules | Foundry propose la mise à jour vers **1.1.1**. | |
| 0.3 | Activer | Dans un monde starwarsffg : Gérer les modules → cocher SWFFG Astronav → Enregistrer | Le monde recharge sans erreur en console (F12). | |
| 0.4 | Console propre | Ouvrir la console (F12) après rechargement | Aucune erreur `swffg-astronav` (les logs `Astronav`/`Navi` éventuels sont informatifs). | |

---

## 1. Compendium « Planètes »

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 1.1 | Pack présent | Onglet Compendiums | Un dossier **SWFFG Astronav** contient **Planètes — Astronav**. | |
| 1.2 | Volumétrie | Ouvrir le compendium | **6849** entrées annoncées. | |
| 1.3 | Dossiers par région | Regarder l'arborescence | **10 dossiers** : Noyau profond, Noyau, Colonies, Bordure Intérieure, Région d'expansion, Bordure Médiane, Espace Hutt, Bordure Extérieure, Espace sauvage, Régions Inconnues. | |
| 1.4 | Fiche riche | Ouvrir **Tatooine** (Bordure Extérieure) | Image en bandeau, tableau (région, secteur, coordonnées R-16, terrain, climat, gravité, population, affiliations), description, **Lieux notables** (Mos Eisley, Palais de Jabba…), encart **Campagne** en doré. | |
| 1.5 | Fiche sans image | Ouvrir un système mineur (ex. via recherche d'un nom numéroté) | La fiche s'affiche sans bandeau image, le tableau reste correct (pas de balise cassée). | |
| 1.6 | Légendes repliées | Ouvrir une planète avec section Légendes (ex. **Coruscant**) | Un `<details>` « Légendes (hors canon) » repliable, pas de `{{gabarit}}` wiki résiduel visible. | |
| 1.7 | Glisser sur la scène | Faire glisser une fiche vers une scène / un journal | Le lien du journal se crée normalement (comportement Foundry standard). | |

---

## 1bis. Fiches MEJ « Place »

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 1b.1 | MEJ requis | Installer swffg-astronav sans MEJ | Foundry signale la dépendance et propose d'installer **Monk's Enhanced Journal**. | |
| 1b.2 | Rendu Place | MEJ actif, ouvrir **Tatooine** | S'ouvre en sheet **« Place »** : couverture image en en-tête, **Type de lieu** = région, **Localisation** = secteur ; corps = description + lieux notables + tableau réduit. | |
| 1b.3 | Ilum conforme | Ouvrir **Ilum** | placetype = Régions Inconnues, location = Secteur 7G, districts (attribut) = K-6 ; couverture = image locale ; tableau = Terrain/Population/Affiliations/Espèces/Cartographie. | |
| 1b.4 | Images en dur | Inspecter la couverture (clic droit image → copier l'adresse) | Chemin **`modules/swffg-astronav/img/planets/…`** — aucun lien `wikia`. Image visible hors-ligne. | |
| 1b.5 | Favori MEJ | Ajouter Tatooine aux favoris/marque-pages MEJ | Le monde apparaît dans la barre de favoris ; persiste après réouverture (fonction native MEJ). | |
| 1b.6 | Sans image | Ouvrir un monde sans visuel (ex. un système mineur) | Sheet Place sans couverture, champs et tableau corrects, pas d'erreur. | |
| 1b.7 | Macro depuis Place | Fiche Place ouverte, lancer **🧭 Astronav — ce monde** | Menu titré au nom du monde ; **Départ/Arrivée** remplissent le calculateur (détection page/entrée MEJ OK). | |
| 1b.8 | Pack verrouillé | Compendium verrouillé, ouvrir une Place | Rendu MEJ en lecture seule, sans erreur console. | |

## 2. Calculateur d'astrogation

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 2.1 | Bouton de scène | Barre de contrôles gauche, groupe **Jetons** | Un bouton **route** (icône fa-route). Un clic ouvre « Astronav — Astrogation ». | |
| 2.2 | Ouverture API | Console : `game.modules.get("swffg-astronav").api.open()` | La fenêtre s'ouvre. | |
| 2.3 | Autocomplétion | Cliquer le champ **Origine** | La liste propose des mondes (datalist ~6800 noms). | |
| 2.4 | Calcul nominal | Origine **Coruscant**, Destination **Tatooine**, Hyperdrive ×1 → **Calculer** | 5 cellules : Itinéraire (cases + % sur routes), Durée, Difficulté (dés colorés + libellé), Calcul (temps), Coût estimé. Ligne de détail des modificateurs. | |
| 2.5 | Mode discret | Cocher **🕶️ discret**, recalculer une route passant près de l'Empire | Le nombre de mondes hostiles baisse (idéalement « 🕶️ 0 hostile »), la difficulté peut changer. | |
| 2.6 | Hyperdrive | Passer Hyperdrive ×4 puis ×0.5, recalculer | La **Durée** diminue en ×4, augmente en ×0.5. | |
| 2.7 | Jet au chat (FFG) | Cliquer **🎲 Jet d'Astrogation → chat** | Message de chat avec le pool de dés ; un bouton **🎲 Lancer** (ffg-pool-to-player) est présent (système starwarsffg). Le cliquer ouvre le lanceur FFG avec l'obstacle dans le pool. | |
| 2.8 | Touche Entrée | Taper une destination puis **Entrée** dans le champ | Le calcul se déclenche sans cliquer Calculer. | |

---

## 3. Navi-Computer (tableau de bord)

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 3.1 | Bouton de scène | Barre de contrôles, groupe Jetons | Un bouton **antenne** (fa-satellite-dish). Un clic ouvre « Navi-Computer ». | |
| 3.2 | **MJ** — Journaux absents | Sur un monde neuf sans les journaux, ouvrir le Navi-Computer | Un bandeau doré propose **« Créer les journaux du Navi-Computer »**. | |
| 3.3 | **MJ** — Installateur | Cliquer ce lien (ou console `api.install()`) | Notification « journaux de campagne prêts ». 4 journaux créés : 🚀 Vaisseau, 🖥️ Codex, 📡 HoloNet, 📖 Journal de bord. Le bandeau disparaît. | |
| 3.4 | Panneaux | Observer la colonne gauche | Cartes : Allégeance, Vaisseau (3 barres 🥫/⛽/🔧), Position (pastille + nom), Équipage, Alignement (Alliés/Neutres/Ennemis), HoloNet. | |
| 3.5 | **MJ** — Éditer l'allégeance | Cliquer **✎ modifier** sur Allégeance, saisir un texte | Le texte s'affiche et persiste (relancer la fenêtre pour vérifier). | |
| 3.6 | Ravitailler | Cliquer **🥫**, puis **⛽**, puis **🔧** | Les barres Vivres/Carburant repassent au max, l'usure retombe à 0 %. | |
| 3.7 | Calcul intégré | Renseigner Origine/Destination, **Calculer** | Mêmes cellules qu'au §2, plus un bouton **🧭 Appliquer le voyage**. | |
| 3.8 | Ressources insuffisantes | Vider les vivres (ne pas ravitailler) et calculer un long trajet | Le bouton devient **⛔ Ressources insuffisantes** (désactivé). | |
| 3.9 | Appliquer un voyage | Avec ressources suffisantes, cliquer **🧭 Appliquer le voyage** | Vivres −jours, Carburant −fuel, Usure +%, la **Position** passe à la destination ; un message de chat récapitule ; le journal Vaisseau est mis à jour (barres persistantes après réouverture). | |
| 3.10 | HoloNet / Journal | Cliquer **ouvrir ↗** (HoloNet) et le lien 📖 | Les journaux correspondants s'ouvrent. | |
| 3.11 | **PJ** — Lecture seule | Se connecter en joueur, ouvrir le Navi-Computer | Le dashboard s'affiche ; les liens MJ (✎ modifier, installateur) sont absents. Le calcul d'itinéraire fonctionne. | |

---

## 3bis. « Ce monde sur l'Astronav » (macro + legs)

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 3b.1 | Macro présente | Compendiums → **Macros — Astronav** | Une macro **🧭 Astronav — ce monde**. La glisser sur la barre de macros. | |
| 3b.2 | Depuis une fiche | Ouvrir la fiche **Tatooine** (compendium Planètes), lancer la macro | Un choix s'ouvre, titré « Astronav — Tatooine », avec région/secteur/terrain et 3 boutons : 🛫 Départ, 🛬 Arrivée, 👁️ Voir. | |
| 3b.3 | Départ | Cliquer **🛫 Départ** | L'Astronav s'ouvre (si fermé) avec **Tatooine** en Origine ; notification « départ : Tatooine » ; la ligne d'info montre région/secteur/terrain. | |
| 3b.4 | Arrivée (fenêtre ouverte) | Astronav ouvert, relancer depuis **Coruscant** → **🛬 Arrivée** | Le champ Destination passe à Coruscant **dans la fenêtre déjà ouverte** (pas de doublon) ; si les deux champs sont remplis, le calcul se lance automatiquement. | |
| 3b.5 | Voir | Depuis une fiche, **👁️ Voir** | Le monde s'affiche en Origine avec sa ligne d'info ; aucun calcul forcé. | |
| 3b.6 | Sans fiche ouverte | Fermer toutes les fiches, lancer la macro | Une invite demande le nom du monde (autocomplétion), puis le même menu 3 boutons. | |
| 3b.7 | Vers le dashboard | Ouvrir le Navi-Computer, puis lancer la macro et choisir Départ/Arrivée | Les champs du **dashboard** se remplissent aussi (les deux fenêtres partagent le leg). | |
| 3b.8 | Monde inconnu | Lancer la macro sur une fiche non-planète (ex. un journal quelconque) | Invite de saisie ; un nom invalide → notification « monde inconnu ». | |

## 4. Réglages du module

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 4.1 | Réglages présents | Configuration → Paramètres → Réglages du module → SWFFG Astronav | Champs : Factions hostiles, Usure du vaisseau (%), et 4 noms de journaux. | |
| 4.2 | Factions hostiles | Mettre `Empire` puis calculer une route près de l'Empire sans « discret » | Des mondes hostiles sont comptés ; en cochant « discret » ils sont évités. | |
| 4.3 | Usure (calculateur seul) | Régler Usure = 60, ouvrir le **calculateur** (§2), recalculer | La difficulté gagne un modificateur « Vaisseau usé +1 » (>80 → +2). | |
| 4.4 | Noms de journaux | Changer « Journal : Vaisseau » vers un nom existant de ton monde | Le dashboard lit ce journal (barres issues de `flags.holocron.ship`). | |

---

## 5. Cas limites

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 5.1 | Monde inconnu | Origine « Zzz », Calculer | Message rouge « Monde inconnu : Zzz ». | |
| 5.2 | Mondes identiques | Origine = Destination | Message rouge « Itinéraire impossible ». | |
| 5.3 | Sans coordonnées | Choisir un monde sans `xy` (rare) | Message d'itinéraire impossible, pas de crash. | |
| 5.4 | Aucune route | Deux mondes très isolés | « Aucun itinéraire trouvé » (pas d'exception console). | |
| 5.5 | Hors starwarsffg | Activer le module dans un monde d'un autre système, ouvrir le calculateur | La fenêtre marche ; le jet au chat s'affiche **sans** le bouton FFG. | |
| 5.6 | Réouverture | Fermer/rouvrir les deux fenêtres plusieurs fois | Pas de fuite : une seule fenêtre par app, pas d'empilement d'écouteurs. | |

---

## 6. Transverse

| # | Objectif | Étapes | Résultat attendu | ✅/❌ |
|---|----------|--------|------------------|------|
| 6.1 | Deux boutons distincts | Barre de scène | **route** = calculateur, **antenne** = Navi-Computer, ordres stables. | |
| 6.2 | API complète | Console : `game.modules.get("swffg-astronav").api` | Expose `open`, `openDashboard`, `install`, `AstronavApp`, `NaviComputerApp`. | |
| 6.3 | Langue | Basculer Foundry en anglais puis français | Titres de fenêtres traduits (Astrogation / Dashboard). | |
| 6.4 | Rechargement à froid | Recharger la page (F5), rouvrir le calculateur | Les données planètes se chargent (1er calcul peut être légèrement plus lent). | |
| 6.5 | Perf données | Ouvrir le calculateur, mesurer | Chargement < ~2 s, calcul d'itinéraire quasi instantané. | |

---

### Anomalies relevées

| Cas | Description | Sévérité | Suite |
|-----|-------------|----------|-------|
|     |             |          |       |

> Recette réalisée par ……………… le ……/……/…… — Foundry ……… / starwarsffg ………
