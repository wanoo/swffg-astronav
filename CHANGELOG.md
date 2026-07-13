# Changelog

## 1.7.2

- **Contrat d'usure** : nouvelle API `api.usure()` / `api.setUsure(pct)` (0–100) pour piloter l'usure
  du vaisseau qui alimente la difficulté d'astrogation (> 50 % : +1 ; > 80 % : +2). Le **Holocron**
  y pousse l'usure réelle du vaisseau.
- **Recalcul live** : changer l'usure (API ou réglage) **rafraîchit immédiatement** la difficulté
  affichée dans les fenêtres Astronav ouvertes (`onChange`). Le réglage indique qu'il est
  auto-alimenté par le vaisseau quand le Holocron est présent.

## 1.7.1

- **Fond de carte au choix (réglage MJ)** : « Avec routes (canon) » = carte d'origine avec les
  hyperroutes cuites ; « Sans routes (épuré) » = fond nébuleuse nettoyé par inpainting (les routes
  violettes effacées), le module traçant ses propres itinéraires et overlays par-dessus. Défaut =
  **épuré** (évite le doublon avec les hyperroutes dessinées). Bascule à chaud sans perdre le zoom.

## 1.7.0

- **Version de partage public** : README illustré (capture de la carte), templates d'issues
  (bug / idée), nettoyage du paquet (captures et docs hors module distribué).
- Regroupe tout le contenu 1.5.x–1.6.x : carte galactique, atlas MEJ 6849 mondes, favoris,
  « vous êtes ici », jet réussi = arrivée, réglages MJ, import dans les journaux.

## 1.6.1

- **Jet réussi → arrivée** : un jet d'Astrogation **réussi** (succès nets > 0) déplace
  automatiquement la position courante (« vous êtes ici ») vers la **destination**.
- **Failsafe** : le jet est bloqué si l'origine ≠ position actuelle (on voyage depuis là où
  l'on est). L'origine par défaut est votre position courante.

## 1.6.0

- **Import dans les journaux** : au 1er lancement (MJ), l'Astronav propose d'importer le compendium
  des planètes dans les journaux du monde (requis pour l'affichage **Monk's Enhanced Journal** et
  les **favoris**). Aussi accessible via *Paramètres → « Importer dans les journaux… »*.
  Les fiches sont importées en **droits de vue OBSERVER** (joueurs comme MJ).
- **« Vous êtes ici »** : marqueur de **position courante** sur la carte, alimenté par l'API
  `api.setCurrentWorld(nom)` (le Holocron y met le monde du vaisseau).

## 1.5.3

- **Fix** : les bascules Grandes/Mineures de la carte ne réagissaient pas au clic (la capture
  de pointeur du viewport avalait le clic) — corrigé.
- **Hyperdrive** : libellés clairs (Classe 0.5 — rapide … Classe 4 — lent). Une classe **basse**
  est plus **rapide** (moins de jours, moins de vivres).
- **Réglage MJ « Difficulté des voyages »** : Très facile ↔ Très difficile, milieu = règles FFG.
  Décale la difficulté d'astrogation de −2 à +2.
- **Factions hostiles** : menu à **cases à cocher** (allégeances connues) au lieu du champ CSV.

## 1.5.2

- **Renommage** du module : `swffg-astronav` → **`swffg-astronavigation`** (uniformisation avec
  swffg-workshops / swffg-sabacc / swffg-holocron). Nouveaux id, chemins d'images, dépôt et URLs.
  ⚠️ Désinstaller l'ancien `swffg-astronav` et réinstaller depuis le nouveau manifeste.

## 1.5.1

- **Overlay hyperroutes** sur la carte : deux bascules (Grandes routes / Routes mineures)
  affichent le réseau canon (tracés colorés par grande route), la route calculée passant au-dessus.

## 1.5.0

- **Carte galactique interactive** dans la fenêtre Astronav : fond de carte GFFA, pan/zoom
  (molette, glisser, pincement, boutons), **tracé de la route A*** en polyligne colorée
  (grande route / secondaire / hors-réseau), marqueurs **origine** (vert) / **destination**
  (bleu) / **favoris** (or). Bouton 🎯 pour cadrer le trajet, ⤢ pour la vue galaxie.
- **Clic sur un marqueur** de la carte pour le définir origine/arrivée (radio 🛫/🛬, shift = l'autre).
- **Fix difficulté** : les dés de difficulté s'affichent avec les **vrais glyphes FFG**
  (police EotESymbol) au lieu des symboles Unicode `◆`/`■` — dans le panneau et dans le chat.
- **Favoris MEJ** : les planètes mises en favori (étoile Monk's Enhanced Journal) sont épinglées
  sur la carte et listées (chips cliquables) dans l'Astronav.
- **Bouton « Astronav »** sur les fiches planète (en-tête) : envoie le monde en départ/arrivée.
- **Réglages ressources** (Vivres / Carburant / Pièce de réparation) et coût du voyage exposé
  via `api.lastCost` + hook `swffgAstronav.cost` (pour un traqueur externe type fvtt-party-resources).

## 1.4.1

- **Fix Foundry v13** : la macro « ce monde » et le dispatch départ/arrivée cherchaient les
  fenêtres ouvertes dans `ui.windows`, or en v13 les sheets/apps sont des ApplicationV2 dans
  `foundry.applications.instances`. Détection désormais sur les deux registres → la macro
  détecte à nouveau la fiche planète ouverte et remplit le calculateur déjà affiché.

## 1.4.0

- **Le tableau de bord Navi-Computer quitte ce module** : il devient le module séparé
  **SWFFG Command Deck** (`swffg-command-deck`), qui dépend de celui-ci. Ce module se
  recentre sur l'astrogation (calculateur + compendium planètes + macro « ce monde »).
- API conservée : `open`, `setLeg`, `showWorld`, `chooser`, `data`. `openDashboard`/`install`
  sont retirés (fournis désormais par SWFFG Command Deck).

## 1.3.0

- **Fiches planètes en Monk's Enhanced Journal « Place »** : couverture image, champs
  Type de lieu (région) / Localisation (secteur) / districts (coordonnées), et **favoris MEJ**.
  **Monk's Enhanced Journal devient requis** (`relationships.requires`).
- **Images en dur dans le module** (plus de hotlink Wookieepedia) : 2429 visuels dans
  `img/planets/`, chemins locaux `modules/swffg-astronavigation/img/planets/…`.
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
- Bouton dans les contrôles de scène + API `game.modules.get("swffg-astronavigation").api.open()`.
- Paramètres : factions hostiles (mode discret), usure du vaisseau.
- Compendium « Planètes — Astronav » : 6849 systèmes, 10 dossiers de région, fiches complètes.
