# Changelog

## 1.3.0

- **Fiches planètes en Monk's Enhanced Journal « Place »** : couverture image, champs
  Type de lieu (région) / Localisation (secteur) / districts (coordonnées), et **favoris MEJ**.
  **Monk's Enhanced Journal devient requis** (`relationships.requires`).
- **Images en dur dans le module** (plus de hotlink Wookieepedia) : 2429 visuels dans
  `img/planets/`, chemins locaux `modules/swffg-astronav/img/planets/…`.
- Tableau réduit (région/secteur/coord passés dans les champs MEJ) ; contenu réordonné
  (description → lieux notables → campagne → tableau → légendes).
- La macro « ce monde » détecte aussi la fiche exposée par MEJ (page ou entrée).
- Distribution repointée sur les **releases GitHub** (manifest + zip).

## 1.2.0

- **« Ce monde sur l'Astronav »** : depuis une fiche planète, l'envoyer dans le calculateur
  comme **départ** ou **arrivée**, ou juste la **voir** (région/secteur/terrain affichés).
- Compendium **Macros — Astronav** avec la macro `🧭 Astronav — ce monde` (détecte la fiche
  ouverte, sinon demande le monde, puis propose Voir / Départ / Arrivée).
- API : `api.setLeg(nom, "from"|"to")`, `api.showWorld(nom)`, `api.chooser(nom?)`, `api.data()`.
- Le calculateur affiche une ligne d'info sur le monde d'origine.

## 1.1.1

- Bump de version pour que Foundry détecte la mise à jour (la 1.1.0 servie ne contenait pas
  encore le Navi-Computer). Aucun changement fonctionnel par rapport à la 1.1.0 finale.

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
