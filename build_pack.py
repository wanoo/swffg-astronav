#!/usr/bin/env python3
"""Génère les documents source du compendium « Planètes — Astronav » à partir de
data/planets.json : un dossier par région + un JournalEntry par planète (fiche complète).

Sortie : packs/_source/*.json (un fichier par document), format lu par foundryvtt-cli.
Puis compilePack (build_pack.mjs) produit le LevelDB packs/planetes.

Usage : python3 build_pack.py [--limit N] [--only "Tatooine,Ilum,..."]
"""
import json, os, re, sys, random

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "packs", "_source")
random.seed(20260710)  # ids déterministes -> rebuilds stables

REGIONS = ["Noyau profond", "Noyau", "Colonies", "Bordure Intérieure",
           "Région d'expansion", "Bordure Médiane", "Espace Hutt",
           "Bordure Extérieure", "Espace sauvage", "Régions Inconnues"]

_used = set()
def fid():
    a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    while True:
        i = "".join(random.choice(a) for _ in range(16))
        if i not in _used:
            _used.add(i); return i

def esc(s):
    return str(s if s is not None else "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def strip_wiki(s):
    """Nettoie les artefacts de gabarit wiki (ex. {{Boîte déroulante|...}})."""
    s = re.sub(r"\{\{[^}]*\|", "", str(s or ""))
    s = s.replace("}}", "").replace("{{", "")
    return s.strip()

def content(p):
    """Corps HTML d'une fiche MEJ « Place ».

    Région, secteur et coordonnées vivent dans les champs MEJ (placetype / location /
    attributes.districts) — ils ne figurent donc PAS dans le tableau. L'image est portée
    par la couverture MEJ (page.src), pas par un bandeau inline.
    Ordre (calé sur la fiche de référence) : description → lieux notables → campagne →
    tableau réduit → légendes.
    """
    facts = p.get("facts") or {}
    f = p.get("f") or {}
    rows = []
    def row(k, v):
        if v: rows.append(f"<tr><th style=\"text-align:left;white-space:nowrap;padding:2px 10px 2px 0;color:#7fdfff\">{esc(k)}</th><td>{esc(v)}</td></tr>")
    row("Terrain", p.get("terrain") or facts.get("terrain"))
    row("Climat", facts.get("climat") or (", ".join(f["clim"]) if isinstance(f.get("clim"), list) else None))
    row("Gravité", facts.get("gravite"))
    row("Diamètre", facts.get("diametre"))
    row("Jour / Année", " / ".join(x for x in (facts.get("jour"), facts.get("annee")) if x) or None)
    row("Population", facts.get("population") or f.get("pop"))
    row("Affiliations", ", ".join(f["aff"]) if isinstance(f.get("aff"), list) else None)
    esp = strip_wiki(f.get("esp"))
    if esp: row("Espèces", esp[:400] + ("…" if len(esp) > 400 else ""))
    charted = {0: "Inconnue", 1: "Rumeur", 2: "Cartographiée", 3: "Peu cartographiée",
               4: "Sommaire", 5: "Non cartographiée"}.get(p.get("charted"))
    row("Cartographie", charted)

    html = []
    if p.get("desc"):
        html.append(f"<p>{esc(p['desc'])}</p>")
    if isinstance(p.get("points"), list) and p["points"]:
        html.append("<h3>Lieux notables</h3><ol>"
                    + "".join(f"<li>{esc(x)}</li>" for x in p["points"]) + "</ol>")
    if p.get("campaign"):
        html.append(f'<blockquote style="border-left:3px solid #d9b45b;padding-left:10px;'
                    f'color:#d9b45b"><strong>Campagne —</strong> {esc(p["campaign"])}</blockquote>')
    if rows:
        html.append(f'<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px">'
                    + "".join(rows) + "</table>")
    if p.get("legends"):
        leg = strip_wiki(p["legends"])
        if leg:
            html.append(f'<details><summary style="cursor:pointer;color:#9db8c8">Légendes (hors canon)</summary>'
                        f'<p style="opacity:.8">{esc(leg[:1500])}</p></details>')
    return "".join(html)

def main():
    limit = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--limit=")), None)
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--only=")), None)

    planets = json.load(open(os.path.join(HERE, "data", "planets.json"), encoding="utf-8"))
    if only:
        want = {n.strip() for n in only}
        planets = [p for p in planets if p.get("name") in want]
    if limit:
        planets = planets[:limit]

    # reset source dir
    os.makedirs(SRC, exist_ok=True)
    for fn in os.listdir(SRC):
        os.remove(os.path.join(SRC, fn))

    # dossiers par région (seulement celles présentes)
    present = [r for r in REGIONS if any((p.get("region") or "").strip() == r for p in planets)]
    other = sorted({(p.get("region") or "").strip() for p in planets} - set(REGIONS) - {""})
    folder_id = {}
    for sort, reg in enumerate(present + other):
        i = fid()
        folder_id[reg] = i
        json.dump({
            "_id": i, "_key": f"!folders!{i}", "name": reg, "type": "JournalEntry",
            "sorting": "a", "sort": sort * 100000, "color": None, "folder": None,
            "flags": {}, "_stats": {}
        }, open(os.path.join(SRC, f"folder_{i}.json"), "w"), ensure_ascii=False)

    # une entrée par planète — fiche Monk's Enhanced Journal « Place »
    n = 0
    for p in sorted(planets, key=lambda x: x.get("name", "")):
        reg = (p.get("region") or "").strip()
        img = p.get("img")                     # chemin local (modules/swffg-astronavigation/img/...)
        jid, pid = fid(), fid()
        mej_page = {
            "type": "place",
            "placetype": reg,                  # région -> « type de lieu » MEJ
            "location": p.get("sector") or "", # secteur -> localisation MEJ
            "attributes": {"age": "", "size": "", "government": "", "inhabitants": "",
                           "faction": "", "districts": p.get("coord") or ""},  # coord -> districts
            "relationships": {}, "items": {},
            "style": {"img": "", "color": "transparent", "sizing": "repeat"},
        }
        mej_entry = {"pagetype": "place", **({"img": img} if img else {})}
        doc = {
            "_id": jid, "_key": f"!journal!{jid}", "name": p.get("name", "?"),
            "folder": folder_id.get(reg),
            "pages": [{
                "_id": pid, "_key": f"!journal.pages!{jid}.{pid}",
                "name": p.get("name", "?"), "type": "text",
                "title": {"show": True, "level": 1},
                "src": img,                    # couverture MEJ (None si pas d'image)
                "image": {}, "video": {"controls": True, "volume": 0.5},
                "category": None, "system": {},
                "text": {"format": 1, "content": content(p)},
                "sort": 0, "ownership": {"default": -1},
                "flags": {"monks-enhanced-journal": mej_page}, "_stats": {}
            }],
            "flags": {
                "swffg-astronavigation": {k: p.get(k) for k in
                    ("region", "sector", "coord", "grid", "xy", "charted", "img") if p.get(k) is not None},
                "monks-enhanced-journal": mej_entry,
            },
            "ownership": {"default": 2}, "sort": 0, "_stats": {}   # OBSERVER : joueurs peuvent voir + favoriser
        }
        json.dump(doc, open(os.path.join(SRC, f"journal_{jid}.json"), "w"), ensure_ascii=False)
        n += 1

    print(f"· {len(folder_id)} dossiers de région, {n} planètes -> {SRC}")

if __name__ == "__main__":
    main()
