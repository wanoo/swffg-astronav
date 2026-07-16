#!/usr/bin/env python3
"""convert_source_cc.py — master switch de l'atlas : fiches MEJ « Place » →
Campaign Codex « location » (+ une fiche « region » par région galactique).

- Ids des planètes CONSERVÉS (favoris, imports du monde et liens intacts).
- Données canoniques reprises de flags["swffg-astronavigation"] (region/sector/coord).
- data.description = contenu de la page (la sheet CC l'affiche) ; la page texte reste.
- parentRegion → uuid de la fiche region de sa région (ids stables sha256).
- Idempotent : une fiche déjà campaign-codex est laissée telle quelle.

Usage : python3 convert_source_cc.py
"""
import glob
import hashlib
import json

AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"


def stable_id(seed: str) -> str:
    h = hashlib.sha256(seed.encode()).digest()
    return "".join(AL[b % len(AL)] for b in h[:16])


def dump(path: str, doc: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")


# --- dossiers du pack (nom de région → id de dossier) --------------------------
folders = {}
for path in glob.glob("packs/_source/folder_*.json"):
    d = json.load(open(path, encoding="utf-8"))
    folders[d["name"]] = d["_id"]

# --- fiches REGION (une par région, id stable) ---------------------------------
region_ids = {}
regions_made = 0
for region, folder_id in sorted(folders.items()):
    rid = stable_id(f"astronav-region:{region}")
    pid = stable_id(f"astronav-region-page:{region}")
    region_ids[region] = rid
    path = f"packs/_source/journal_region_{rid}.json"
    body = f"<p>Région galactique : <strong>{region}</strong>. Les systèmes de cette région y sont rattachés (fiches Campaign Codex <em>location</em>).</p>"
    dump(path, {
        "_id": rid, "_key": f"!journal!{rid}",
        "name": region, "folder": folder_id, "sort": -100,
        "pages": [{
            "_id": pid, "_key": f"!journal.pages!{rid}.{pid}",
            "name": region, "type": "text", "title": {"show": True, "level": 1},
            "text": {"content": body, "format": 1},
            "sort": 0, "ownership": {"default": -1}, "flags": {}, "_stats": {},
        }],
        "ownership": {"default": 0},
        "flags": {"campaign-codex": {"type": "region", "data": {"description": body, "tags": []}}},
        "_stats": {},
    })
    regions_made += 1

# --- caractéristiques clés (planets.json) → tags CC (Terrain, Climat) ----------
# Tags atomiques capitalisés, navigables/filtrables via Asset Librarian.
with open("data/planets.json", encoding="utf-8") as f:
    _raw = json.load(f)
_planets = _raw if isinstance(_raw, list) else _raw.get("planets") or list(_raw.values())[0]
CHAR_TAGS = {}
for p in _planets:
    tags = []
    facts = p.get("facts") or {}
    fshort = p.get("f") or {}
    for val in (p.get("terrain"), facts.get("terrain"), fshort.get("clim"), facts.get("climat")):
        if not val:
            continue
        parts = val if isinstance(val, list) else str(val).split(",")
        tags += [str(t).strip().capitalize() for t in parts if str(t).strip()]
    if tags:
        seen, out = set(), []
        for t in tags:
            if t.lower() not in seen:
                seen.add(t.lower())
                out.append(t)
        CHAR_TAGS[p["name"]] = out[:6]


def merge_tags(existing, new):
    """Fusion en préservant les tags posés à la main (Favori…) ; purge les tags
    malformés d'une passe précédente (listes python stringifiées)."""
    clean = [t for t in existing if not (str(t).startswith("['") or str(t).endswith("']"))]
    seen = {str(t).lower() for t in clean}
    return clean + [t for t in new if t.lower() not in seen]


# --- fiches PLANÈTES : MEJ Place → CC location ----------------------------------
converted = skipped = tagged = 0
for path in glob.glob("packs/_source/journal_*.json"):
    d = json.load(open(path, encoding="utf-8"))
    flags = d.get("flags") or {}
    if flags.get("campaign-codex"):
        # déjà convertie : fusionne seulement les tags de caractéristiques
        cc = flags["campaign-codex"]
        if cc.get("type") == "location" and d["name"] in CHAR_TAGS:
            data = cc.setdefault("data", {})
            before = list(data.get("tags") or [])
            data["tags"] = merge_tags(before, CHAR_TAGS[d["name"]])
            if data["tags"] != before:
                dump(path, d)
                tagged += 1
        skipped += 1
        continue
    astro = flags.get("swffg-astronavigation")
    if not astro:
        continue  # pas une planète (sécurité)
    page0 = (d.get("pages") or [{}])[0]
    html = ((page0.get("text") or {}).get("content")) or ""
    region = astro.get("region", "")
    data = {
        "description": html,
        "tags": CHAR_TAGS.get(d["name"], []),
        "region": region,
        "secteur": astro.get("sector", ""),
        "coord": astro.get("coord", ""),
    }
    if region in region_ids:
        data["parentRegion"] = f"JournalEntry.{region_ids[region]}"
    flags.pop("monks-enhanced-journal", None)
    cc = {"type": "location", "data": data}
    img = page0.get("src") or d.get("img")
    if img:
        cc["image"] = img
    flags["campaign-codex"] = cc
    for p in d.get("pages") or []:
        (p.get("flags") or {}).pop("monks-enhanced-journal", None)
    dump(path, d)
    converted += 1

print(f"régions : {regions_made} · planètes converties : {converted} · déjà CC : {skipped} · tags mis à jour : {tagged}")
