# CLAUDE.md — swffg-astronavigation

Module Foundry VTT : **astrogation FFG** + **atlas galactique** (compendium MEJ des
~6850 mondes), carte galactique et marqueur « vous êtes ici » du vaisseau.

## ⚠️ Frontière — coordination
Une **AUTRE instance de Claude** travaille sur ce module et avertit de ses évolutions.
**NE PAS modifier son code** sans coordination (ici : rangement / suivi seulement).
Cf. mémoires [[astronav]] et [[swffg-astronav-module]].

## Dépôt & GitHub
- GitHub : **wanoo/swffg-astronavigation** — <https://github.com/wanoo/swffg-astronavigation>
- Branche : `master`. Version actuelle **1.7.5**.

## Suivi (issues / PR)
- `gh issue list -R wanoo/swffg-astronavigation`
- `gh pr list -R wanoo/swffg-astronavigation`

## Build & release
- `python build.py --zip` → `dist/*.zip` + `dist/module.json`.
- `gh release create vX.Y.Z -R wanoo/swffg-astronavigation dist/*.zip dist/module.json`.
