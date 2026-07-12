# SWFFG Astronav — Astrogation & Atlas galactique

Module [Foundry VTT](https://foundryvtt.com/) pour le système **Star Wars FFG** (`starwarsffg`).
Deux outils en un :

- **Calculateur d'astrogation** — choisis un monde d'origine et une destination parmi
  ~6 800 systèmes, le module trace l'itinéraire par les **hyperroutes canon**, en déduit la
  **difficulté du test d'Astrogation** (pool de dés FFG avec améliorations, boost et setback),
  la **durée** et le **coût** du voyage, puis poste le jet dans le chat (obstacle intégré au
  pool sur le système `starwarsffg`).
- **Compendium « Planètes — Astronav »** — un atlas de **6 849 mondes** rangés par région
  (Noyau, Colonies, Bordure Extérieure, Régions Inconnues…), présentés en fiches
  **Monk's Enhanced Journal « Place »** : couverture image, localisation, et **favoris**.
  Chaque fiche : image (embarquée dans le module), secteur, coordonnées, terrain, climat,
  gravité, diamètre, population, affiliations, description, lieux notables.

## Dépendance

Ce module **requiert [Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal)**
(les fiches planètes sont des sheets « Place »). Foundry propose de l'installer automatiquement.

## Installation

Dans Foundry : **Add-on Modules → Install Module**, puis colle l'URL du manifeste :

```
https://github.com/wanoo/swffg-astronav/releases/latest/download/module.json
```

Active le module. Un bouton **route** apparaît dans la barre de contrôles de scène (groupe jetons)
et ouvre le calculateur d'astrogation. Via l'API :

```js
const api = game.modules.get("swffg-astronav").api;
api.open();            // calculateur d'astrogation
```

> Le tableau de bord de campagne (vaisseau, équipage, HoloNet, outils MJ) est fourni par le module
> séparé **[SWFFG Command Deck](https://github.com/wanoo/swffg-command-deck)**, qui s'appuie sur ce module.

### Envoyer un monde dans l'Astronav

Le compendium **Macros — Astronav** contient la macro **🧭 Astronav — ce monde**. Ouvre une
fiche planète du compendium, lance la macro (glisse-la sur ta barre) : elle propose de définir
ce monde comme **départ** 🛫, **arrivée** 🛬, ou simplement de le **voir** 👁️ dans l'Astronav.
Sans fiche ouverte, elle demande le nom du monde. En API :

```js
const api = game.modules.get("swffg-astronav").api;
api.setLeg("Tatooine", "to");   // définir comme arrivée
api.showWorld("Coruscant");     // ouvrir l'Astronav sur ce monde
api.chooser("Ilum");            // menu Voir / Départ / Arrivée
```

## Paramètres du module

| Paramètre | Effet |
|---|---|
| **Factions hostiles** | Liste (séparée par des virgules) évitée par le mode « discret ». |
| **Usure du vaisseau (%)** | > 50 % : +1 à la difficulté ; > 80 % : +2. |

## Construire depuis les sources

Le compendium est livré compilé (LevelDB, `packs/planetes`). Pour le régénérer :

```bash
npm install @foundryvtt/foundryvtt-cli classic-level
python3 build_pack.py            # génère packs/_source/*.json depuis data/planets.json
node build_pack.mjs              # compile -> packs/planetes (LevelDB)
python3 build.py --zip           # produit dist/swffg-astronav.zip
```

## Données & crédits

Données de systèmes et d'hyperroutes agrégées depuis Wookieepedia (fr/en) et SWAPI, retravaillées
pour l'astrogation FFG. Star Wars et le système FFG appartiennent à leurs ayants droit respectifs ;
ce module est un outil de jeu non officiel.

Auteur : **wanoo**.
