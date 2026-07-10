// Compile packs/_source/*.json -> LevelDB packs/planetes (foundryvtt-cli).
// Usage : node build_pack.mjs
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(HERE, "packs", "_source");
const dest = path.join(HERE, "packs", "planetes");

await compilePack(src, dest, { log: true });
console.log("LevelDB compilé ->", dest);
