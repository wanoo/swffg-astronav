#!/usr/bin/env python3
"""Assemble le module distribuable.

  python3 build_pack.py && node build_pack.mjs   # (re)construit le compendium LevelDB
  python3 build.py --zip                          # produit dist/swffg-astronav.zip

Le zip embarque module.json, scripts/, data/, lang/ et le pack compilé packs/planetes.
Sont exclus : les sources du pack (packs/_source), l'outillage de build, node_modules.
"""
import json, pathlib, sys, zipfile

ROOT = pathlib.Path(__file__).parent
MOD = json.load(open(ROOT / "module.json"))
MODID = MOD["id"]

# garde-fous : le pack compilé doit exister
pack = ROOT / "packs" / "planetes"
if not pack.exists() or not any(pack.iterdir()):
    sys.exit("packs/planetes absent — lance d'abord : python3 build_pack.py && node build_pack.mjs")

EXCLUDE_TOP = {"_source", "node_modules", "dist", ".git"}
EXCLUDE_NAME = {"build.py", "build_pack.py", "build_pack.mjs", ".DS_Store",
                "package.json", "package-lock.json"}

def included(rel: pathlib.Path) -> bool:
    if rel.name in EXCLUDE_NAME: return False
    if any(part in EXCLUDE_TOP for part in rel.parts): return False
    # packs/_source exclu, packs/planetes gardé
    if len(rel.parts) >= 2 and rel.parts[0] == "packs" and rel.parts[1] == "_source": return False
    return True

if "--zip" in sys.argv:
    dist = ROOT / "dist"; dist.mkdir(exist_ok=True)
    # module.json à la racine du zip aussi (pour l'auto-install par manifeste)
    z = dist / f"{MODID}.zip"
    n = 0
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in ROOT.rglob("*"):
            if not p.is_file(): continue
            rel = p.relative_to(ROOT)
            if not included(rel): continue
            zf.write(p, pathlib.Path(MODID) / rel)
            n += 1
    print(f"[{MODID}] {n} fichiers · {z} ({z.stat().st_size/1048576:.1f} Mo)")
    # copie du manifeste à côté du zip (les releases GitHub servent module.json séparément)
    json.dump(MOD, open(dist / "module.json", "w"), ensure_ascii=False, indent=2)
    print(f"[{MODID}] manifeste -> {dist/'module.json'}")
else:
    print("usage: python3 build.py --zip")
