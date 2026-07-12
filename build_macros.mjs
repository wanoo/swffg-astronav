// Compile le compendium de macros (packs/macros) via foundryvtt-cli.
// Usage : node build_macros.mjs
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(HERE, "packs", "_macros_src");
const dest = path.join(HERE, "packs", "macros");

// Macro « ce monde » : détecte la fiche planète ouverte (sinon demande), puis
// propose Voir / Départ / Arrivée via l'API du module.
const command = [
  'const api = game.modules.get("swffg-astronav")?.api;',
  'if (!api?.chooser) { ui.notifications.error("Active le module « SWFFG Astronav »."); }',
  'else {',
  '  // fiche planète ouverte = JournalEntry, ou JournalEntryPage/entrée exposée par Monk\'s Enhanced Journal.',
  '  // Foundry v13 : les fenêtres sont des ApplicationV2 (foundry.applications.instances),',
  '  // plus dans ui.windows — on scanne les deux registres.',
  '  const wins = [...Object.values(ui.windows), ...(foundry.applications?.instances?.values?.() ?? [])];',
  '  const isJ = (d) => d?.documentName === "JournalEntry" || d?.documentName === "JournalEntryPage";',
  '  const jw = wins.reverse().find((w) => isJ(w?.document) || isJ(w?.object));',
  '  const doc = jw?.document ?? jw?.object;',
  '  api.chooser(doc ? (doc.parent?.name ?? doc.name) : undefined);',
  '}',
].join("\n");

const id = "AstroNavLeg0001x"; // 16 caractères, stable entre les builds
const doc = {
  _id: id, _key: `!macros!${id}`, name: "🧭 Astronav — ce monde", type: "script",
  scope: "global", author: null, command, img: "icons/svg/direction.svg",
  ownership: { default: 0 }, flags: {}, _stats: {},
};

fs.rmSync(src, { recursive: true, force: true });
fs.mkdirSync(src, { recursive: true });
fs.writeFileSync(path.join(src, `macro_${id}.json`), JSON.stringify(doc));

fs.rmSync(dest, { recursive: true, force: true });
await compilePack(src, dest, { log: true });
console.log("compendium macros compilé ->", dest);
