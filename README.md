# SWFFG Astronav — Astrogation & Atlas galactique

Module [Foundry VTT](https://foundryvtt.com/) pour le système **Star Wars FFG** (`starwarsffg`).
Deux outils en un :

- **Calculateur d'astrogation** — choisis un monde d'origine et une destination parmi
  ~6 800 systèmes, le module trace l'itinéraire par les **hyperroutes canon**, en déduit la
  **difficulté du test d'Astrogation** (pool de dés FFG avec améliorations, boost et setback),
  la **durée** et le **coût** du voyage, puis poste le jet dans le chat (obstacle intégré au
  pool sur le système `starwarsffg`).
- **Compendium « Planètes — Astronav »** — un atlas de **6 849 mondes** rangés par région
  (Noyau, Colonies, Bordure Extérieure, Régions Inconnues…). Chaque fiche : image, secteur,
  coordonnées de grille, terrain, climat, gravité, diamètre, population, affiliations,
  description, lieux notables.

## Installation

Dans Foundry : **Add-on Modules → Install Module**, puis colle l'URL du manifeste :

```
https://github.com/wanoo/swffg-astronav/releases/latest/download/module.json
```

Active le module dans ton monde, puis ouvre l'Astronav via le **bouton en forme de route**
dans la barre de contrôles de scène (groupe jetons), ou par l'API :

```js
game.modules.get("swffg-astronav").api.open();
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
