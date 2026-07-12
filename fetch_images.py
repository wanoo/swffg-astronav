#!/usr/bin/env python3
"""Télécharge en dur les images de planètes dans le module (plus de hotlink Wookieepedia).

- Source pristine : data/planets.raw.json (URLs d'origine). Créée au 1er lancement depuis
  data/planets.json si absente.
- Sortie : img/planets/<slug>-<hash>.<ext> + data/planets.json réécrit avec des chemins
  locaux Foundry `modules/swffg-astronavigation/img/planets/...`.
Reprenable : les fichiers déjà présents ne sont pas re-téléchargés.

Usage : python3 fetch_images.py
"""
import concurrent.futures as cf
import hashlib, json, os, re, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(HERE, "img", "planets")
RAW = os.path.join(HERE, "data", "planets.raw.json")
OUT = os.path.join(HERE, "data", "planets.json")
MOD_PATH = "modules/swffg-astronavigation/img/planets"
UA = {"User-Agent": "swffg-astronavigation/1.0 (Foundry module image bundling)"}
EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif")

def ensure_raw():
    if not os.path.exists(RAW):
        cur = json.load(open(OUT, encoding="utf-8"))
        # ne fige comme pristine que si les img sont encore des URLs externes
        if any(str(p.get("img", "")).startswith("http") for p in cur):
            json.dump(cur, open(RAW, "w"), ensure_ascii=False)
            print("· data/planets.raw.json créé (source pristine)")
        else:
            raise SystemExit("data/planets.raw.json manquant et planets.json déjà local — source perdue.")

def fname(url):
    base = url.split("/revision")[0].rstrip("/").split("/")[-1]  # ex. Tatooine.png
    stem, ext = os.path.splitext(base)
    ext = ext.lower() if ext.lower() in EXTS else ".png"
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()[:40] or "img"
    h = hashlib.sha1(url.encode()).hexdigest()[:8]
    return f"{slug}-{h}{ext}"

def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            data = urllib.request.urlopen(req, timeout=30).read()
            if not data:
                raise ValueError("vide")
            open(dest, "wb").write(data)
            return True
        except Exception:
            if i == 2:
                return False

def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    ensure_raw()
    planets = json.load(open(RAW, encoding="utf-8"))
    urls = sorted({p["img"] for p in planets if p.get("img")})
    url_map = {u: fname(u) for u in urls}
    print(f"· {len(urls)} images distinctes -> {IMG_DIR}")

    ok, fail = 0, []
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(download, u, os.path.join(IMG_DIR, url_map[u])): u for u in urls}
        for i, fut in enumerate(cf.as_completed(futs)):
            u = futs[fut]
            if fut.result():
                ok += 1
            else:
                fail.append(u)
            if i % 200 == 0:
                print(f"  {i+1}/{len(urls)}")
    print(f"· {ok} images en place, {len(fail)} échecs")

    # réécrit planets.json avec des chemins locaux (échec -> pas d'image)
    out = []
    for p in planets:
        q = dict(p)
        u = p.get("img")
        if u and u not in fail and os.path.exists(os.path.join(IMG_DIR, url_map[u])):
            q["img"] = f"{MOD_PATH}/{url_map[u]}"
        elif u:
            q.pop("img", None)
        out.append(q)
    json.dump(out, open(OUT, "w"), ensure_ascii=False)
    with_img = sum(1 for p in out if str(p.get("img", "")).startswith(MOD_PATH))
    print(f"· data/planets.json réécrit — {with_img} planètes avec image locale")
    if fail:
        json.dump(fail, open(os.path.join(HERE, "img", "_failed.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
