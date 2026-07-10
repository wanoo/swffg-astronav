# Changelog

## 1.1.0

- **Navi-Computer (tableau de bord)** : cockpit du groupe (allégeance, vaisseau en barres,
  position, équipage, alignement des PNJ, HoloNet) avec l'astrogation intégrée et l'application
  de voyage (consommation vivres/carburant/usure). Bouton dédié + `api.openDashboard()`.
- Noms des journaux de campagne configurables ; installateur `api.install()` qui crée les
  journaux manquants (vaisseau, codex, HoloNet, journal de bord).
- Distribution servie depuis l'Archive Holocron.

## 1.0.0

- Calculateur d'astrogation (ApplicationV2) : itinéraire par hyperroutes canon, difficulté du
  test d'Astrogation FFG (pool de dés, améliorations, boost/setback), durée et coût, jet au chat.
- Bouton dans les contrôles de scène + API `game.modules.get("swffg-astronav").api.open()`.
- Paramètres : factions hostiles (mode discret), usure du vaisseau.
- Compendium « Planètes — Astronav » : 6849 systèmes, 10 dossiers de région, fiches complètes.
