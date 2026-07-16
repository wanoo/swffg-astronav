/**
 * SWFFG Astronav — calculateur + carte d'astrogation (Star Wars FFG).
 * Fenêtre ApplicationV2 : carte galactique interactive (canvas, pan/zoom, tracé de route
 * A* coloré, marqueurs origine/destination/favoris), origine/destination parmi ~6800 mondes,
 * difficulté du test d'Astrogation FFG (vrais glyphes de dés), durée, coût, jet posté au chat.
 *
 * Données + image embarquées dans le module (data/planets.json, data/lanes.json, img/galaxy-map.jpg).
 * Dépend de Monk's Enhanced Journal (favoris = marque-pages MEJ sur les fiches planètes).
 */

export const MODULE = "swffg-astronavigation";
export const asset = (p) => `modules/${MODULE}/${p}`;

/* ------------------------------------------------------------------ moteur -- */
const U = 99.7, DPC = { major: .4, minor: .7, off: 1.2 }, OFF = 900, HP = 4;
const REG = ["Noyau profond", "Noyau", "Colonies", "Bordure Intérieure", "Région d'expansion",
             "Bordure Médiane", "Espace Hutt", "Bordure Extérieure", "Espace sauvage", "Régions Inconnues"];
const rrank = (r) => { const i = REG.indexOf(r); return i < 0 ? REG.length - 1 : i; };
const DN = { 1: "Facile", 2: "Moyen", 3: "Difficile", 4: "Intimidant", 5: "Exceptionnel" };
const CP = { 5: 0, 4: 0, 3: 1, 2: 2, 1: 2, 0: 3 };
const CL = { 5: "spatioport A–B", 4: "spatioport standard (C)", 3: "services limités (D)",
             2: "terrain d'atterrissage (E)", 1: "terrain sommaire (E)", 0: "sans spatioport (X)" };
const CT = { 1: "2 rounds", 2: "5 rounds", 3: "10 minutes", 4: "1 heure", 5: "4 heures" };

// Carte : calibration coordonnées swgalaxymap -> pixels de l'image GFFA (5400²).
const STAGE = 5400;
const CAL = { cx: 2699.5, cy: 2490, k: 2.155, size: 5400 };
const posOf = (p) => (p && p.xy) ? [CAL.cx + p.xy[0] * CAL.k, CAL.cy - p.xy[1] * CAL.k] : null;
const SEG_STYLE = { major: ["#ffd76a", 3.6, []], minor: ["#bf3bff", 4.4, []], off: ["#57c7ff", 2.8, [8, 6]] };
const LANE_COL = { "Corellian Run": "#e6c66c", "Voie Perlemienne": "#8fd0ff", "Épine corellienne": "#f0a35c", "Voie Hydienne": "#a0dc8a", "Route de Rimma": "#d99bff" };

function buildGraph(byName, lanes) {
  const idx = new Map(), nodes = [], adj = new Map();
  const nodeOf = (nm) => {
    if (idx.has(nm)) return idx.get(nm);
    const p = byName[nm]; if (!p || !p.xy) return -1;
    idx.set(nm, nodes.length); adj.set(nodes.length, []);
    nodes.push({ name: nm, xy: p.xy, aff: (p.f && p.f.aff) || [] }); return nodes.length - 1;
  };
  for (const l of lanes || []) {
    const cls = l.major ? "major" : "minor"; let prev = -1;
    for (const nm of l.planets) {
      const i = nodeOf(nm); if (i < 0) continue;
      if (prev >= 0 && prev !== i) {
        const du = Math.hypot(nodes[prev].xy[0] - nodes[i].xy[0], nodes[prev].xy[1] - nodes[i].xy[1]);
        if (du > 1) { adj.get(prev).push({ to: i, du, cls }); adj.get(i).push({ to: prev, du, cls }); }
      }
      prev = i;
    }
  }
  return { nodes, adj };
}

function computeRoute(g, o, dst, hyper, opts) {
  const { nodes, adj } = g, N = nodes.length, cost = (du, cls) => (du / U) * DPC[cls];
  const hostile = opts.hostile instanceof Set ? opts.hostile : new Set();
  const hn = new Array(N); for (let i = 0; i < N; i++) hn[i] = nodes[i].aff.some((a) => hostile.has(a));
  const mul = (to) => (opts.avoid && to < N && hn[to] ? HP : 1);
  const vAdj = new Map();
  const link = (vi, xy) => {
    const near = [];
    for (let i = 0; i < N; i++) { const du = Math.hypot(nodes[i].xy[0] - xy[0], nodes[i].xy[1] - xy[1]); if (du < OFF) near.push({ to: i, du, cls: "off" }); }
    near.sort((a, b) => a.du - b.du); vAdj.set(vi, near.slice(0, 8));
  };
  link(N, o.xy); link(N + 1, dst.xy);
  const direct = Math.hypot(o.xy[0] - dst.xy[0], o.xy[1] - dst.xy[1]);
  vAdj.get(N).push({ to: N + 1, du: direct, cls: "off" });
  const edgesOf = (i) => {
    const base = i < N ? adj.get(i) : vAdj.get(i) || [];
    if (i < N) { const du = Math.hypot(nodes[i].xy[0] - dst.xy[0], nodes[i].xy[1] - dst.xy[1]); return du < OFF ? base.concat([{ to: N + 1, du, cls: "off" }]) : base; }
    return base;
  };
  const H = new Array(N + 2), heur = (i) => {
    if (H[i] === undefined) { const xy = i === N ? o.xy : i === N + 1 ? dst.xy : nodes[i].xy; H[i] = (Math.hypot(xy[0] - dst.xy[0], xy[1] - dst.xy[1]) / U) * DPC.major; }
    return H[i];
  };
  const D = new Array(N + 2).fill(Infinity), P = new Array(N + 2).fill(-1), PC = new Array(N + 2).fill(null), done = new Array(N + 2).fill(false);
  D[N] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i <= N + 1; i++) if (!done[i] && D[i] < Infinity && D[i] + heur(i) < best) { best = D[i] + heur(i); u = i; }
    if (u < 0 || u === N + 1) break; done[u] = true;
    for (const e of edgesOf(u)) { const nd = D[u] + cost(e.du, e.cls) * mul(e.to); if (nd < D[e.to]) { D[e.to] = nd; P[e.to] = u; PC[e.to] = e.cls; } }
  }
  if (!isFinite(D[N + 1])) return null;
  const xyOf = (i) => i === N ? o.xy : i === N + 1 ? dst.xy : nodes[i].xy;
  const cases = { major: 0, minor: 0, off: 0, total: 0 }, onPath = new Set(), segs = [];
  for (let v = N + 1; P[v] >= 0 || P[v] === N; v = P[v]) {
    const u = P[v]; const du = Math.hypot(xyOf(u)[0] - xyOf(v)[0], xyOf(u)[1] - xyOf(v)[1]); const cls = PC[v] || "off";
    segs.unshift({ a: xyOf(u), b: xyOf(v), cls, du });   // a/b = coordonnées galactiques brutes
    cases[cls] += du / U; cases.total += du / U; if (u < N) onPath.add(u); if (v < N) onPath.add(v); if (u === N) break;
  }
  let hc = 0; for (const i of onPath) if (hn[i]) hc++;
  return { segs, cases, days: D[N + 1] * hyper, hostile: hc, regions: Math.abs(rrank(o.region) - rrank(dst.region)), avoid: !!opts.avoid };
}

function astroCheck(o, dst, route, sh) {
  const parts = []; let raw = 1; parts.push({ label: "Base", tag: "Facile" });
  const worst = Math.min(o.charted, dst.charted), cp = CP[worst] || 0;
  if (cp) { raw += cp; parts.push({ label: CL[worst], tag: "+" + cp }); }
  if (route.regions > 0) { raw += route.regions; parts.push({ label: route.regions + " région(s)", tag: "+" + route.regions }); }
  if (sh && sh.usure > 80) { raw += 2; parts.push({ label: "Vaisseau très usé", tag: "+2" }); }
  else if (sh && sh.usure > 50) { raw += 1; parts.push({ label: "Vaisseau usé", tag: "+1" }); }
  let boost = 0, setback = 0; const t = route.cases.total || 1, mj = route.cases.major / t, mn = route.cases.minor / t, of = route.cases.off / t;
  if (mj > .6) { boost += 2; parts.push({ label: "Grande hyperroute", tag: "+2 bo" }); }
  else if (mj + mn > .5) { boost += 1; parts.push({ label: "Route secondaire", tag: "+1 bo" }); }
  if (of > .4) { setback += 2; parts.push({ label: "Hors réseau", tag: "+2 se" }); }
  if (route.hostile > 0) { const s = Math.min(route.hostile, 3); setback += s; parts.push({ label: route.hostile + " monde(s) hostile(s)", tag: "+" + s + " se" }); }
  else if (route.avoid) { parts.push({ label: "Discret — 0 hostile", tag: "✓" }); }
  if (sh && sh.diffMod) { raw = Math.max(1, raw + sh.diffMod); parts.push({ label: sh.diffMod > 0 ? "Voyages difficiles (MJ)" : "Voyages faciles (MJ)", tag: (sh.diffMod > 0 ? "+" : "") + sh.diffMod }); }
  let up = 0, diff = raw; if (raw > 5) { up = raw - 5; diff = 5; parts.push({ label: up + " amélioration(s)", tag: "↑" + up }); }
  diff = Math.max(1, Math.min(5, diff));
  return { diff, boost, setback, upgrades: up, parts, calc: up ? "4 heures (Redoutable+)" : CT[diff] };
}
export { computeRoute, astroCheck };
export const tripCost = (route, hyper) => ({ days: Math.ceil(route.days), fuel: Math.ceil(route.cases.total + route.cases.off * .5), usure: Math.max(1, Math.ceil(route.days * .4 + route.cases.off * .6)) });
export function fmtDays(d) {
  if (d < .75) return "< 1 jour";
  if (d < 10) { const n = Math.max(1, Math.round(d)); return "≈ " + n + " jour" + (n > 1 ? "s" : ""); }
  const w = Math.max(1, Math.round(d / 7)); return "≈ " + w + " semaine" + (w > 1 ? "s" : "");
}

/* ------------------------------------------------------- données + settings -- */
let BY_NAME = null, GRAPH = null, LIST = null, LANES = null;
export async function ensureData() {
  if (GRAPH) return getData();
  const [pj, lanes] = await Promise.all([
    fetch(asset("data/planets.json")).then((r) => r.json()),
    fetch(asset("data/lanes.json")).then((r) => r.json()),
  ]);
  const arr = Array.isArray(pj) ? pj : (pj.planets || pj.systems || Object.values(pj)[0]);
  BY_NAME = {}; for (const p of arr) BY_NAME[p.name] = p;
  LIST = arr.filter((p) => p.xy).map((p) => p.name).sort();
  LANES = lanes;                       // gardées pour l'overlay hyperroutes (champ pts)
  GRAPH = buildGraph(BY_NAME, lanes);
  return getData();
}
export const getData = () => ({ byName: BY_NAME, graph: GRAPH, list: LIST });
export const hostileSet = () => new Set(String(game.settings.get(MODULE, "hostile") || "").split(",").map((s) => s.trim()).filter(Boolean));
const S = (k) => game.settings.get(MODULE, k);
// Fond de carte : « routes » = carte canon avec hyperroutes cuites ; sinon fond épuré (inpainting).
const BG = (routes) => (routes ? "img/galaxy-map.jpg" : "img/galaxy-map-clean.jpg");
const bgFile = () => BG(S("mapBackground") === "routes");
const allAffiliations = () => {
  const s = new Set();
  for (const p of Object.values(BY_NAME || {})) for (const a of (p.f?.aff || [])) if (a) s.add(a);
  return [...s].sort((a, b) => a.localeCompare(b, "fr"));
};

/** Menu de réglage « factions hostiles » : cases à cocher au lieu d'un CSV. */
class HostileMenu extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "swffg-astronavigation-hostile", window: { title: "Factions hostiles — mode discret", icon: "fa-solid fa-skull" }, position: { width: 460 } };
  async render() {
    await ensureData();
    const cur = hostileSet(), affs = allAffiliations();
    const content = `<p style="opacity:.8;margin:.2em 0 .6em">Mondes de ces allégeances évités en mode « 🕶️ discret ».</p>
      <div style="max-height:55vh;overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:2px 10px">
      ${affs.map((a) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="${esc(a)}" ${cur.has(a) ? "checked" : ""}/> ${esc(a)}</label>`).join("")}</div>`;
    const res = await foundry.applications.api.DialogV2.wait({
      window: { title: "Factions hostiles — mode discret" }, position: { width: 460 }, content,
      buttons: [
        { action: "ok", label: "Enregistrer", default: true, callback: (ev, btn) => [...btn.form.querySelectorAll("input:checked")].map((i) => i.name) },
        { action: "cancel", label: "Annuler" },
      ], rejectClose: false,
    }).catch(() => null);
    if (Array.isArray(res)) await game.settings.set(MODULE, "hostile", res.join(", "));
  }
}

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// Difficulté : vrais glyphes du système FFG (police EotESymbol, CSS globale `dietype`).
// difficulty=d (violet), challenge=c (rouge), boost=b (bleu clair), setback=b (noir).
const DIE = { di: ["difficulty", "d"], ch: ["challenge", "c"], bo: ["boost", "b"], se: ["setback", "b"] };
export const dice = (pool) => ["di", "ch", "bo", "se"].map((k) => {
  const n = pool[k] || 0; if (!n) return "";
  const [cls, ch] = DIE[k];
  return `<span class="dietype starwars ${cls}">${ch.repeat(n)}</span>`;
}).join("");
export { DN };

/** Favoris de la TABLE (master switch Campaign Codex) : tag « Favori » posé sur la
 * fiche planète (flags.campaign-codex.data.tags, sinon asset-librarian.filterTag) +
 * index compact flags.holocron.config.favorites maintenu par l'Holocron et l'étoile
 * ci-dessous. Repli legacy : marque-pages Monk's Enhanced Journal. */
const FAV_TAG = "favori";
const favTagsOf = (j) => {
  const raw = j?.flags?.["campaign-codex"]?.data?.tags ?? j?.flags?.["asset-librarian"]?.filterTag;
  return (Array.isArray(raw) ? raw : String(raw || "").split(",")).map((s) => String(s).trim().toLowerCase());
};
const holocronConfigJournal = () => game.journal.find((j) => j.flags?.holocron?.config) || null;

export async function favoriteWorlds() {
  await ensureData();
  const names = new Set();
  // 1. index compact de la config Holocron (écrit par l'app web et l'étoile)
  const cfg = holocronConfigJournal()?.flags?.holocron?.config;
  for (const f of (cfg?.favorites || [])) if (f?.name && BY_NAME?.[f.name]) names.add(f.name);
  // 2. fiches taguées « Favori » (tag posé à la main via Asset Librarian / Campaign Codex)
  for (const j of game.journal) if (favTagsOf(j).includes(FAV_TAG) && BY_NAME?.[j.name]) names.add(j.name);
  if (names.size) return [...names];
  // 3. legacy : marque-pages MEJ (pré-migration)
  const bm = game.user?.getFlag?.("monks-enhanced-journal", "bookmarks") || [];
  for (const b of bm) {
    let doc = null; try { doc = await fromUuid(b.entityId); } catch { /* uuid mort */ }
    if (!doc) continue;
    if (doc.pack === `${MODULE}.planetes` || doc.flags?.[MODULE]?.xy || doc.parent?.flags?.[MODULE]) {
      const nm = doc.parent?.name ?? doc.name;
      if (BY_NAME?.[nm]) names.add(nm);
    }
  }
  return [...names];
}

/** Bascule le favori d'un monde (MJ) : tag sur la fiche + index config Holocron. */
export async function toggleFavoriteWorld(name) {
  if (!game.user.isGM) return ui.notifications.warn("Favoris de table : réservé au MJ.");
  const j = game.journal.getName(name);
  if (!j) return ui.notifications.warn(`Fiche introuvable pour « ${name} » — importe l'atlas.`);
  const isCC = Boolean(j.flags?.["campaign-codex"]?.type);
  const raw = isCC ? j.flags?.["campaign-codex"]?.data?.tags : j.flags?.["asset-librarian"]?.filterTag;
  const tags = (Array.isArray(raw) ? raw : String(raw || "").split(",")).map((s) => String(s).trim()).filter(Boolean);
  const has = tags.some((t) => t.toLowerCase() === FAV_TAG);
  const next = has ? tags.filter((t) => t.toLowerCase() !== FAV_TAG) : [...tags, "Favori"];
  await j.update({ [isCC ? "flags.campaign-codex.data.tags" : "flags.asset-librarian.filterTag"]: next });
  // index compact (le web lit celui-ci sans scanner l'atlas)
  const cfgJ = holocronConfigJournal();
  if (cfgJ) {
    const cur = (cfgJ.flags.holocron.config.favorites || []).filter((f) => f?.id !== j.id);
    const favs = has ? cur : [...cur, { id: j.id, name }];
    await cfgJ.update({ "flags.holocron.config.favorites": favs });
  }
  ui.notifications.info(`${has ? "★ Retiré des" : "★ Ajouté aux"} favoris : ${name}`);
  for (const a of legApps()) a._loadFavorites?.();
  return !has;
}

/* ---- position courante « vous êtes ici » (alimentée par le Holocron) ---- */
export const currentWorld = () => (BY_NAME ? game.settings.get(MODULE, "currentWorld") : "") || "";
export async function setCurrentWorld(name) {
  await ensureData();
  if (name && !BY_NAME[name]) return ui.notifications.warn(`Astronav : monde inconnu « ${name} ».`);
  await game.settings.set(MODULE, "currentWorld", name || "");
  for (const a of legApps()) a._loadCurrent?.();
}

/* ---- usure du vaisseau (%) : alimente la difficulté d'astrogation, poussée par le Holocron ---- */
export const usure = () => Math.max(0, Math.min(100, Number(game.settings.get(MODULE, "usure")) || 0));
export async function setUsure(pct) {
  const v = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  if (v !== usure()) await game.settings.set(MODULE, "usure", v);   // onChange recalcule les fenêtres ouvertes
  return v;
}

/* ---- import du compendium dans les journaux du monde (requis MEJ + favoris) ---- */
export async function importToWorld({ confirm = true } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Réservé au MJ.");
  const pack = game.packs.get(`${MODULE}.planetes`);
  if (!pack) return ui.notifications.error("Compendium des planètes introuvable.");
  if (confirm) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Astronav — importer les planètes" },
      content: `<p>Importer les <strong>${pack.index.size}</strong> fiches planètes dans les journaux du monde ?</p>
        <p style="opacity:.8;font-size:12px">Requis pour l'affichage enrichi Monk's Enhanced Journal et les favoris (joueurs inclus). Peut prendre un moment.</p>`,
    }).catch(() => false);
    if (!ok) return false;
  }
  ui.notifications.info("Astronav : import des planètes en cours…");
  try { await pack.importAll({ folderName: "Planètes — Astronav", keepFolders: true }); }
  catch { await pack.importAll({ folderName: "Planètes — Astronav" }); }   // repli si keepFolders non supporté
  await game.settings.set(MODULE, "imported", true);
  ui.notifications.info("Astronav : planètes importées dans les journaux.");
  return true;
}
class ImportMenu extends foundry.applications.api.ApplicationV2 { async render() { await importToWorld({ confirm: true }); } }

/* ------------------------------------------------------------------ l'app --- */
export class AstronavApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "swffg-astronavigation-app",
    window: { title: "SWFFG.astronav.title", icon: "fa-solid fa-route", resizable: true },
    position: { width: 1180, height: 760 },
  };

  async _renderHTML() {
    await ensureData();
    const dlist = LIST.map((n) => `<option value="${esc(n)}">`).join("");
    return `<style>
      .an-root { color: #d8ecf7; font-size: 13px; height: 100%; box-sizing: border-box;
        background: radial-gradient(1200px 500px at 30% -10%, #10283a55, transparent), #0a121b; }
      .an-cols { display: flex; gap: 10px; height: 100%; padding: 10px; box-sizing: border-box; }
      .an-side { flex: 0 0 350px; display: flex; flex-direction: column; gap: 8px; overflow: auto; min-height: 0; }
      .an-map { flex: 1; min-width: 0; }
      .an-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; }
      .an-f { display: flex; flex-direction: column; gap: 2px; flex: 1 1 130px; }
      .an-f label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #7fdfff; }
      .an-root input, .an-root select { background: #0a1520; border: 1px solid #2b5b73; color: #d8ecf7; border-radius: 6px; padding: 5px 7px; }
      .an-mode { display: flex; gap: 12px; font-size: 11px; }
      .an-mode label { display: flex; gap: 4px; align-items: center; cursor: pointer; }
      .an-btn { background: transparent; border: 1px solid #d9b45b; color: #d9b45b; border-radius: 999px; padding: 5px 16px; cursor: pointer; font-weight: 700; }
      .an-btn:hover { background: #d9b45b; color: #06121c; }
      .an-btn.cy { border-color: #7fdfff; color: #7fdfff; }
      .an-btn.cy:hover { background: #7fdfff; color: #06121c; }
      .an-cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; margin: 4px 0; }
      .an-cell { border: 1px solid #2b5b73; border-radius: 8px; padding: 6px 8px; background: #0c1926aa; }
      .an-cell .k { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #7fdfff; }
      .an-cell .v { font-size: 15px; font-weight: 700; color: #eaf6ff; margin-top: 2px; }
      .an-cell .v small { display: block; font-size: 10px; font-weight: 400; opacity: .65; }
      .an-parts { font-size: 11px; opacity: .8; }
      .an-acts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
      .an-hint { opacity: .5; font-size: 12px; }
      .an-fav { display: flex; flex-wrap: wrap; gap: 4px; }
      .an-fav .k { flex: 0 0 100%; font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #7fdfff; }
      .an-chip { background: #0c1926; border: 1px solid #6a5320; color: #d9b45b; border-radius: 999px; padding: 2px 9px; font-size: 11px; cursor: pointer; }
      .an-chip:hover { background: #d9b45b; color: #06121c; }
      .an-viewport { position: relative; width: 100%; height: 100%; overflow: hidden; border: 1px solid #2b5b73;
        border-radius: 10px; background: #05070c; touch-action: none; cursor: grab; }
      .an-viewport.grabbing { cursor: grabbing; }
      .an-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      .an-lanetog { position: absolute; left: 8px; top: 8px; display: flex; gap: 4px; }
      .an-lanetog button { border: 1px solid #2b5b73; background: #0c1926cc; color: #9db8c8; border-radius: 7px; padding: 3px 9px; font-size: 11px; cursor: pointer; }
      .an-lanetog button.on { border-color: #d9b45b; color: #d9b45b; }
      .an-zoom { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 4px; }
      .an-zoom button { width: 30px; height: 30px; border-radius: 7px; border: 1px solid #2b5b73; background: #0c1926cc; color: #d8ecf7; cursor: pointer; font-size: 15px; }
      .an-zoom button:hover { background: #14324a; }
      .an-legend { position: absolute; left: 8px; bottom: 8px; display: flex; gap: 10px; flex-wrap: wrap; font-size: 10px;
        background: #05070ccc; border: 1px solid #2b5b73; border-radius: 7px; padding: 4px 8px; color: #b8d4e6; }
      .an-legend b { font-weight: 700; }
      .an-die { color: #9db8c8; }
    </style>
    <div class="an-root">
      <datalist id="an-pl">${dlist}</datalist>
      <div class="an-cols">
        <div class="an-side">
          <div class="an-form">
            <div class="an-f"><label>Origine</label><input id="an-from" list="an-pl" value="${esc(LEG.from || currentWorld() || "Coruscant")}"/></div>
            <div class="an-f"><label>Destination</label><input id="an-to" list="an-pl" placeholder="Tatooine" value="${esc(LEG.to || "")}"/></div>
            <div class="an-f" style="flex:0 0 150px"><label>Hyperdrive</label><select id="an-hyper">
              ${[[0.5, "Classe 0.5 — rapide"], [1, "Classe 1"], [2, "Classe 2"], [3, "Classe 3"], [4, "Classe 4 — lent"]].map(([h, l]) => `<option value="${h}" ${h === 1 ? "selected" : ""}>${l}</option>`).join("")}</select></div>
            <label style="display:flex;gap:4px;align-items:center;font-size:11px"><input type="checkbox" id="an-avoid"/> 🕶️ discret</label>
            <button type="button" class="an-btn" data-act="compute">Calculer</button>
          </div>
          <div class="an-mode">
            <span style="opacity:.6">Clic carte =</span>
            <label><input type="radio" name="an-mode" value="from" checked> 🛫 départ</label>
            <label><input type="radio" name="an-mode" value="to"> 🛬 arrivée</label>
          </div>
          <div id="an-info" style="font-size:11px;opacity:.75;min-height:14px"></div>
          <div id="an-res" class="an-hint">Choisis deux mondes puis « Calculer », ou clique un marqueur sur la carte.</div>
          <div id="an-fav" class="an-fav"></div>
        </div>
        <div class="an-map">
          <div class="an-viewport" id="an-vp">
            <canvas class="an-canvas" id="an-canvas"></canvas>
            <div class="an-lanetog">
              <button type="button" data-lane="all" title="Afficher/masquer le réseau des voies hyperspatiales (overlay tracé)">🌌 Hyperspace</button>
              <button type="button" data-bg="routes" title="Basculer le fond de carte avec / sans les hyperroutes cuites">🛣️ Routes (carte)</button>
            </div>
            <div class="an-legend">
              <span><b style="color:#6fbf8f">●</b> origine</span>
              <span><b style="color:#57c7ff">●</b> destination</span>
              <span><b style="color:#d9b45b">●</b> favori</span>
              <span><b style="color:#ffd76a">▬</b> grande route</span>
              <span><b style="color:#bf3bff">▬</b> secondaire</span>
              <span><b style="color:#57c7ff">┄</b> hors réseau</span>
            </div>
            <div class="an-zoom">
              <button type="button" data-z="in" title="Zoom avant">+</button>
              <button type="button" data-z="out" title="Zoom arrière">−</button>
              <button type="button" data-z="route" title="Cadrer le trajet">🎯</button>
              <button type="button" data-z="reset" title="Vue galaxie">⤢</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  _replaceHTML(html, content) { content.innerHTML = html; this._wire(content); }

  _onRender(context, options) { this._initMap(this.element); this._loadFavorites(); }

  _loadCurrent() { if (this._map) { this._map.current = currentWorld(); this._schedule(); } }

  async _close(options) {
    this._map?.ro?.disconnect();
    return super._close(options);
  }

  _wire(root) {
    root.querySelector('[data-act="compute"]').addEventListener("click", () => this._compute(root));
    root.querySelectorAll("#an-from, #an-to").forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") this._compute(root); }));
    root.querySelector("#an-from").addEventListener("input", () => this._updateInfo(root));
    this._updateInfo(root);
  }

  _clickMode() {
    return this.element?.querySelector('input[name="an-mode"]:checked')?.value === "to" ? "to" : "from";
  }

  _updateInfo(root) {
    const { byName } = getData();
    const p = byName[(root.querySelector("#an-from")?.value || "").trim()];
    const info = root.querySelector("#an-info");
    if (info) info.innerHTML = p ? `📍 <b>${esc(p.name)}</b> — ${[p.region, p.sector, p.terrain].filter(Boolean).map(esc).join(" · ") || "—"}` : "";
  }

  /* ---- favoris ---- */
  async _loadFavorites() {
    const names = await favoriteWorlds().catch(() => []);
    if (!this._map) return;
    this._map.favSet = new Set(names);
    this._schedule();
    const box = this.element?.querySelector("#an-fav");
    if (box) box.innerHTML = names.length
      ? `<span class="k">★ Favoris</span>` + names.map((n) => `<button type="button" class="an-chip" data-fav="${esc(n)}">${esc(n)}</button>`).join("")
      : "";
    box?.querySelectorAll("[data-fav]").forEach((b) => b.addEventListener("click", () => setLeg(b.dataset.fav, this._clickMode())));
  }

  /* ---- carte : cycle de vie ApplicationV2 ---- */
  _initMap(root) {
    const vp = root?.querySelector("#an-vp"), canvas = root?.querySelector("#an-canvas");
    if (!vp || !canvas) return;
    const prev = this._map || {};
    prev.ro?.disconnect();
    this._map = {
      vp, canvas, ctx: canvas.getContext("2d"),
      s: prev.s ?? 0.15, tx: prev.tx ?? 0, ty: prev.ty ?? 0, minS: prev.minS ?? 0.1, dpr: 1,
      img: prev.img, o: prev.o, dst: prev.dst, route: prev.route, favSet: prev.favSet ?? new Set(),
      current: prev.current ?? currentWorld(),
      bgRoutes: prev.bgRoutes ?? (S("mapBackground") === "routes"),
      showLanes: prev.showLanes ?? false, raf: 0, ro: null,
    };
    if (vp.dataset.anBound !== "1") { vp.dataset.anBound = "1"; this._bindMap(vp, canvas); }
    root.querySelector('[data-bg="routes"]')?.classList.toggle("on", this._map.bgRoutes);
    root.querySelector('[data-lane="all"]')?.classList.toggle("on", this._map.showLanes);
    // image de fond : chargée une fois, gardée sur l'instance (avec ou sans routes selon le toggle)
    if (!this._map.img) {
      const img = new Image();
      img.src = foundry.utils.getRoute(asset(BG(this._map.bgRoutes)));
      // succès → fond + cadrage ; échec (404/offline) → carte sans fond, route + marqueurs quand même.
      img.decode().then(() => { this._map.img = img; this._fitGalaxy(); }).catch(() => { this._fitGalaxy(); });
    }
    const ro = new ResizeObserver(() => this._resize());
    ro.observe(vp); this._map.ro = ro;
    this._resize();
  }

  _bindMap(vp, canvas) {
    const zoomAt = (cx, cy, f) => this._zoomAt(cx, cy, f);
    vp.addEventListener("wheel", (e) => {
      e.preventDefault(); const r = vp.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });

    let drag = null, moved = 0;
    vp.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".an-zoom, .an-lanetog")) return;   // ne pas capturer le pointeur sur les boutons (sinon le clic est avalé)
      drag = { x: e.clientX, y: e.clientY, tx: this._map.tx, ty: this._map.ty }; moved = 0;
      vp.setPointerCapture(e.pointerId); vp.classList.add("grabbing");
    });
    vp.addEventListener("pointermove", (e) => {
      if (!drag) return;
      moved = Math.max(moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
      this._map.tx = drag.tx + (e.clientX - drag.x); this._map.ty = drag.ty + (e.clientY - drag.y);
      this._clamp(); this._schedule();
    });
    const end = (e) => {
      if (drag && moved < 5) {           // clic (pas un glissé) : hit-test
        const r = vp.getBoundingClientRect();
        const name = this._hitTest(e.clientX - r.left, e.clientY - r.top);
        if (name) setLeg(name, e.shiftKey ? (this._clickMode() === "to" ? "from" : "to") : this._clickMode());
      }
      drag = null; vp.classList.remove("grabbing");
    };
    vp.addEventListener("pointerup", end); vp.addEventListener("pointercancel", () => { drag = null; vp.classList.remove("grabbing"); });

    // deux toggles indépendants (4 états) : overlay des voies hyperspatiales + fond de carte.
    vp.querySelector(".an-lanetog").addEventListener("click", (e) => {
      const lane = e.target.closest("[data-lane]"), bg = e.target.closest("[data-bg]");
      if (lane) {                                   // Hyperspace : dessine / masque le réseau des lanes
        this._map.showLanes = !this._map.showLanes;
        lane.classList.toggle("on", this._map.showLanes);
        this._schedule();
      } else if (bg) {                              // Route minor : échange le fond de carte (avec / sans routes)
        this._map.bgRoutes = !this._map.bgRoutes;
        bg.classList.toggle("on", this._map.bgRoutes);
        const img = new Image();
        img.src = foundry.utils.getRoute(asset(BG(this._map.bgRoutes)));
        img.decode().then(() => { this._map.img = img; this._draw(); }).catch(() => this._draw());
      }
    });

    vp.querySelector(".an-zoom").addEventListener("click", (e) => {
      const z = e.target.dataset.z; if (!z) return;
      const r = vp.getBoundingClientRect();
      if (z === "in") this._zoomAt(r.width / 2, r.height / 2, 1.4);
      else if (z === "out") this._zoomAt(r.width / 2, r.height / 2, 1 / 1.4);
      else if (z === "reset") this._fitGalaxy();
      else if (z === "route") this._fitRoute();
    });

    // pincement (2 doigts)
    const pts = new Map(); let pd = 0;
    vp.addEventListener("pointerdown", (e) => pts.set(e.pointerId, e));
    vp.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (pd) { const r = vp.getBoundingClientRect(); this._zoomAt((a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top, d / pd); }
        pd = d; drag = null;
      }
    });
    const clearP = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pd = 0; };
    vp.addEventListener("pointerup", clearP); vp.addEventListener("pointercancel", clearP);
  }

  _resize() {
    const m = this._map; if (!m || !m.vp.clientWidth) return;
    m.dpr = window.devicePixelRatio || 1;
    m.canvas.width = Math.round(m.vp.clientWidth * m.dpr);
    m.canvas.height = Math.round(m.vp.clientHeight * m.dpr);
    this._draw();
  }
  _schedule() {
    const m = this._map; if (!m || m.raf) return;
    m.raf = requestAnimationFrame(() => { m.raf = 0; this._draw(); });
  }
  _clamp() {
    const m = this._map, w = m.vp.clientWidth, h = m.vp.clientHeight, sw = STAGE * m.s;
    m.tx = sw <= w ? (w - sw) / 2 : Math.max(Math.min(0, w - sw), Math.min(0, m.tx));
    m.ty = sw <= h ? (h - sw) / 2 : Math.max(Math.min(0, h - sw), Math.min(0, m.ty));
  }
  _zoomAt(cx, cy, factor) {
    const m = this._map, ns = Math.max(m.minS, Math.min(4, m.s * factor)), k = ns / m.s;
    m.tx = cx - (cx - m.tx) * k; m.ty = cy - (cy - m.ty) * k; m.s = ns; this._clamp(); this._schedule();
  }
  _fitBox(x0, y0, x1, y1, pad) {
    const m = this._map, w = m.vp.clientWidth, h = m.vp.clientHeight, f = STAGE / CAL.size;
    const bx = x0 * f - pad, by = y0 * f - pad, bw = (x1 - x0) * f + pad * 2, bh = (y1 - y0) * f + pad * 2;
    m.s = Math.max(m.minS, Math.min(4, Math.min(w / bw, h / bh)));
    m.tx = (w - bw * m.s) / 2 - bx * m.s; m.ty = (h - bh * m.s) / 2 - by * m.s;
    this._clamp(); this._schedule();
  }
  _fitGalaxy() {
    const m = this._map; if (!m || !m.vp.clientWidth) return;
    m.minS = Math.min(m.vp.clientWidth, m.vp.clientHeight) / STAGE; m.s = m.minS; this._clamp(); this._schedule();
  }
  _fitRoute() {
    const m = this._map;
    if (m.route?.segs?.length) {
      const px = m.route.segs.flatMap((s) => [s.a, s.b]).map(([X, Y]) => [CAL.cx + X * CAL.k, CAL.cy - Y * CAL.k]);
      const xs = px.map((p) => p[0]), ys = px.map((p) => p[1]);
      return this._fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 300);
    }
    const a = m.o && posOf(m.o), b = m.dst && posOf(m.dst); if (!a || !b) return;
    this._fitBox(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), 700);
  }
  _drawChart(o, dst, route) {
    const m = this._map; if (!m) return;
    m.o = o; m.dst = dst; m.route = route;
    if (o && dst && o.name !== dst.name) this._fitRoute(); else this._schedule();
  }

  _draw() {
    const m = this._map; if (!m) return;
    const { ctx, canvas, dpr, s, tx, ty } = m, { byName } = getData();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    if (m.img) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(m.img, 0, 0, CAL.size, CAL.size, tx, ty, STAGE * s, STAGE * s);
    }
    const K = (STAGE / CAL.size) * s;
    const SP = (p) => { const im = posOf(p); return im ? [tx + im[0] * K, ty + im[1] * K] : null; };
    const XYc = ([X, Y]) => [tx + (CAL.cx + X * CAL.k) * K, ty + (CAL.cy - Y * CAL.k) * K];
    const o = m.o, dst = m.dst, showLabel = s > (m.minS || 0.01) * 1.15;
    const label = (x, y, txt, col, size) => {
      ctx.font = `700 ${size}px Orbitron, system-ui, sans-serif`; ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(5,7,12,.9)"; ctx.lineJoin = "round";
      ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y);
    };
    // Overlay « Hyperspace » (toggle) : réseau des voies hyperspatiales canon (data/lanes.json).
    if (LANES && m.showLanes) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const l of LANES) {
        const pts = l.pts; if (!pts || pts.length < 2) continue;
        ctx.strokeStyle = l.major ? (LANE_COL[l.name] || "#e6c66c") : "#9a86c9";
        ctx.lineWidth = l.major ? 2.6 : 1.4; ctx.globalAlpha = l.major ? .85 : .5;
        ctx.beginPath();
        pts.forEach((pt, i) => { const [x, y] = XYc(pt); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
        if (showLabel && l.major) { const [mx, my] = XYc(pts[Math.floor(pts.length / 2)]); label(mx + 10, my - 6, l.name, LANE_COL[l.name] || "#e6c66c", 12); }
      }
      ctx.globalAlpha = 1;
    }
    // route calculée : segments colorés par classe, avec halo pour bien ressortir (secondaires violets).
    if (m.route?.segs && o && dst && o.name !== dst.name) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const seg of m.route.segs) {
        const [col, w2, dash] = SEG_STYLE[seg.cls];
        const [x1, y1] = XYc(seg.a), [x2, y2] = XYc(seg.b);
        ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = w2; ctx.globalAlpha = .97;
        ctx.shadowColor = col; ctx.shadowBlur = seg.cls === "minor" ? 11 : 6;   // les secondaires ressortent nettement
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.setLineDash([]); ctx.globalAlpha = 1;
    } else if (o && dst && o.name !== dst.name) {
      const po = SP(o), pdt = SP(dst);
      if (po && pdt) { ctx.setLineDash([8, 6]); ctx.strokeStyle = "#57c7ff"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(po[0], po[1]); ctx.lineTo(pdt[0], pdt[1]); ctx.stroke(); ctx.setLineDash([]); }
    }
    // favoris (or)
    for (const name of m.favSet || []) {
      const p = byName[name]; if (!p || (o && p.name === o.name) || (dst && p.name === dst.name)) continue;
      const sp = SP(p); if (!sp) continue;
      ctx.fillStyle = "#d9b45b"; ctx.beginPath(); ctx.arc(sp[0], sp[1], 4.5, 0, 7); ctx.fill();
      if (showLabel) label(sp[0] + 9, sp[1] + 4, p.name, "#e6c66c", 13);
    }
    // position courante « vous êtes ici » (alimentée par le Holocron)
    if (m.current && byName[m.current]) {
      const sp = SP(byName[m.current]);
      if (sp) {
        ctx.strokeStyle = "#eaf6ff"; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(sp[0], sp[1], 16, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#eaf6ff"; ctx.beginPath(); ctx.arc(sp[0], sp[1], 3.5, 0, 7); ctx.fill();
        if (showLabel) label(sp[0] + 20, sp[1] - 8, "Vous êtes ici", "#eaf6ff", 13);
      }
    }
    // origine / destination
    const marker = (p, col) => {
      const sp = SP(p); if (!sp) return;
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sp[0], sp[1], 13, 0, 7); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sp[0], sp[1], 6, 0, 7); ctx.fill();
      if (showLabel) label(sp[0] + 18, sp[1] + 5, p.name, col, 15);
    };
    if (o) marker(o, "#6fbf8f");
    if (dst && dst.name !== (o && o.name)) marker(dst, "#57c7ff");
  }

  _hitTest(cx, cy) {
    const m = this._map; if (!m) return null;
    const { byName } = getData(), K = (STAGE / CAL.size) * m.s;
    // marqueurs réellement dessinés : origine, destination, position courante, favoris.
    const cands = new Set([m.o?.name, m.dst?.name, m.current, ...(m.favSet || [])].filter(Boolean));
    let best = null, bestD = 13;
    for (const name of cands) {
      const p = byName[name], im = posOf(p); if (!im) continue;
      const d = Math.hypot(m.tx + im[0] * K - cx, m.ty + im[1] * K - cy);
      if (d < bestD) { bestD = d; best = name; }
    }
    return best;
  }

  /** Renseigne origine/destination depuis un preset (macros / fiches / favoris). */
  applyLeg(leg) {
    const root = this.element; if (!root) return;
    const f = root.querySelector("#an-from"), t = root.querySelector("#an-to");
    if (leg.from && f) f.value = leg.from;
    if (leg.to && t) t.value = leg.to;
    this._updateInfo(root);
    if (f?.value?.trim() && t?.value?.trim()) this._compute(root);
    this.bringToFront?.();
  }

  _compute(root) {
    const from = root.querySelector("#an-from").value.trim(), to = root.querySelector("#an-to").value.trim();
    const hyper = Number(root.querySelector("#an-hyper").value) || 1, avoid = root.querySelector("#an-avoid").checked;
    const res = root.querySelector("#an-res"); res.classList.remove("an-hint");
    const o = BY_NAME[from], dst = BY_NAME[to];
    if (!o || !dst) { res.innerHTML = `<b style="color:#e5544b">Monde inconnu : ${esc(!o ? from : to)}</b>`; return; }
    if (!o.xy || !dst.xy || o.name === dst.name) { res.innerHTML = `<b style="color:#e5544b">Itinéraire impossible (coordonnées manquantes ou mondes identiques).</b>`; return; }
    const sh = { usure: Number(S("usure")) || 0, diffMod: Number(S("travelDifficulty")) || 0 };
    const route = computeRoute(GRAPH, o, dst, hyper, { avoid, hostile: hostileSet() });
    if (!route) { res.innerHTML = `<b style="color:#e5544b">Aucun itinéraire trouvé.</b>`; return; }
    const chk = astroCheck(o, dst, route, sh), cost = tripCost(route, hyper), chal = Math.min(chk.upgrades, chk.diff);
    const pool = { difficulty: chk.diff - chal, ...(chal ? { challenge: chal } : {}), ...(chk.boost ? { boost: chk.boost } : {}), ...(chk.setback ? { setback: chk.setback } : {}) };
    this._last = { o, dst, route, chk, cost, pool, hyper };
    const rf = S("resFuelLabel"), rv = S("resFoodLabel"), rr = S("resRepairLabel");
    res.innerHTML = `
      <div class="an-cells">
        <div class="an-cell"><div class="k">Itinéraire</div><div class="v">${route.cases.total.toFixed(1)} cases<small>${Math.round(((route.cases.major + route.cases.minor) / (route.cases.total || 1)) * 100)}% sur routes${route.hostile ? ` · ⚠️ ${route.hostile} hostile(s)` : avoid ? " · 🕶️ 0 hostile" : ""}</small></div></div>
        <div class="an-cell"><div class="k">Durée</div><div class="v">${fmtDays(route.days)}<small>hyperdrive ×${hyper}</small></div></div>
        <div class="an-cell"><div class="k">Difficulté</div><div class="v">${dice({ di: pool.difficulty, ch: chal, bo: chk.boost, se: chk.setback })}<small>${DN[chk.diff]}${chk.upgrades ? " ↑" + chk.upgrades : ""}</small></div></div>
        <div class="an-cell"><div class="k">Calcul</div><div class="v">${chk.calc}</div></div>
        <div class="an-cell"><div class="k">Coût estimé</div><div class="v" style="font-size:12px">−${cost.days} ${esc(rv)} · −${cost.fuel} ${esc(rf)} · +${cost.usure}% usure</div></div>
      </div>
      <div class="an-parts">${chk.parts.map((p) => `${esc(p.label)} <b>${esc(p.tag)}</b>`).join(" · ")}</div>
      <div class="an-acts"><button type="button" class="an-btn cy" data-roll="1">🎲 Jet d'Astrogation → chat</button></div>`;
    res.querySelector("[data-roll]").addEventListener("click", () => this._roll());
    // carte : tracer la route (mutation en place, pas de re-render)
    this._drawChart(o, dst, route);
    // coût exposé pour un traqueur de ressources externe (ex. fvtt-party-resources)
    const api = game.modules.get(MODULE).api;
    api.lastCost = { from: o.name, to: dst.name, days: cost.days, fuel: cost.fuel, usure: cost.usure,
      labels: { food: rv, fuel: rf, repair: rr } };
    Hooks.callAll("swffgAstronav.cost", api.lastCost);
  }

  async _roll() {
    const L = this._last; if (!L) return;
    // failsafe : on voyage depuis sa position actuelle (POI).
    const cur = currentWorld();
    if (cur && L.o.name !== cur) return ui.notifications.warn(`Astronav : votre position actuelle est « ${cur} ». Mets l'origine sur « ${cur} » avant le jet.`);
    const hasFFG = game.system.id === "starwarsffg";
    PENDING_TRIP = { from: L.o.name, to: L.dst.name };   // un jet réussi déplacera le POI vers la destination
    await ChatMessage.create({
      content: `<h4>🎲 Astrogation — ${esc(L.o.name)} → ${esc(L.dst.name)}</h4>`
        + `<p>Difficulté <strong>${DN[L.chk.diff]}</strong>${L.chk.upgrades ? " (↑" + L.chk.upgrades + ")" : ""} — ${dice({ di: L.pool.difficulty, ch: L.pool.challenge, bo: L.pool.boost, se: L.pool.setback })}</p>`
        + `<p style="font-size:11px;opacity:.7">${fmtDays(L.route.days)} · ${L.route.cases.total.toFixed(1)} cases</p>`
        + (hasFFG ? `<button class="ffg-pool-to-player">🎲 Lancer (obstacle dans le pool)</button>` : ""),
      flags: hasFFG ? { starwarsffg: { dicePool: L.pool, description: `Astrogation ${L.o.name}→${L.dst.name}`, roll: { data: { astronavTrip: { from: L.o.name, to: L.dst.name } }, skillName: "Astrogation", item: {}, flavor: "", sound: null } } } : {},
    });
    ui.notifications.info("Jet d'Astrogation posté dans le chat.");
  }
}

/* ------------------------------------------- presets « départ / arrivée » --- */
export const LEG = { from: null, to: null };
let PENDING_TRIP = null;   // voyage en attente d'un jet ; sur réussite → POI vers la destination

// Un jet d'Astrogation réussi déplace la position courante (POI) vers la destination.
Hooks.on("ffgDiceMessage", (roll) => {
  try {
    if (!PENDING_TRIP) return;
    const trip = roll?.data?.astronavTrip;
    const txt = [roll?.flavorText, roll?.data?.description, roll?.data?.skillName].filter(Boolean).join(" | ");
    if (!trip && !/astrogation/i.test(txt)) return;               // pas notre jet
    const net = (roll?.ffg?.success || 0) - (roll?.ffg?.failure || 0);
    if (net <= 0) return;                                          // échec : on ne bouge pas
    const dest = trip?.to || PENDING_TRIP.to; PENDING_TRIP = null;
    if (dest && BY_NAME?.[dest]) setCurrentWorld(dest);
  } catch { /* détection best-effort */ }
});

function openWindows() {
  // Foundry v13 : les ApplicationV2 vivent dans foundry.applications.instances, plus dans ui.windows.
  const v2 = foundry.applications?.instances?.values?.() ?? [];
  return [...Object.values(ui.windows ?? {}), ...v2];
}
function legApps() { return openWindows().filter((w) => typeof w?.applyLeg === "function"); }
function dispatchLeg() { const apps = legApps(); for (const a of apps) a.applyLeg?.(LEG); return apps.length; }

export async function setLeg(name, role) {
  await ensureData();
  if (!BY_NAME[name]) return ui.notifications.warn(`Astronav : monde inconnu « ${name} ».`);
  LEG[role] = name;
  if (!dispatchLeg()) new AstronavApp().render(true);
  ui.notifications.info(`Astronav — ${role === "to" ? "arrivée" : "départ"} : ${name}.`);
}
export async function showWorld(name) {
  await ensureData();
  if (!BY_NAME[name]) return ui.notifications.warn(`Astronav : monde inconnu « ${name} ».`);
  LEG.from = name;
  if (!dispatchLeg()) new AstronavApp().render(true);
}
export async function chooser(name) {
  await ensureData();
  const DialogV2 = foundry.applications.api.DialogV2;
  let target = name && BY_NAME[name] ? name : null;
  if (!target) {
    const dl = LIST.map((n) => `<option value="${esc(n)}">`).join("");
    const picked = await DialogV2.prompt({
      window: { title: "Astronav — choisir un monde" },
      content: `<datalist id="an-pick">${dl}</datalist>
        <p><input name="w" list="an-pick" value="${esc(name ?? "")}" placeholder="Nom du monde" style="width:100%"/></p>`,
      ok: { label: "Continuer", callback: (ev, btn) => btn.form.elements.w.value.trim() },
    }).catch(() => null);
    if (!picked) return;
    target = picked;
  }
  if (!BY_NAME[target]) return ui.notifications.warn(`Astronav : monde inconnu « ${target} ».`);
  const p = BY_NAME[target];
  const info = [p.region, p.sector, p.terrain].filter(Boolean).map(esc).join(" · ") || "—";
  await DialogV2.wait({
    window: { title: `Astronav — ${target}` },
    content: `<p style="margin:.2em 0"><strong>${esc(target)}</strong></p><p style="opacity:.7;font-size:12px">${info}</p>`,
    buttons: [
      { action: "from", label: "🛫 Départ", callback: () => setLeg(target, "from") },
      { action: "to", label: "🛬 Arrivée", callback: () => setLeg(target, "to") },
      { action: "show", label: "👁️ Voir sur l'Astronav", callback: () => showWorld(target) },
    ],
    rejectClose: false,
  }).catch(() => null);
}

/* --------------------------------------------------------------- amorçage --- */
Hooks.once("init", () => {
  game.settings.register(MODULE, "hostile", {   // édité par le menu à cases à cocher (caché de la liste)
    name: "Factions hostiles", scope: "world", config: false, type: String, default: "Empire, Premier Ordre",
  });
  game.settings.registerMenu(MODULE, "hostileMenu", {
    name: "Factions hostiles (mode discret)", label: "Choisir les factions…", icon: "fa-solid fa-skull",
    hint: "Coche les allégeances dont les mondes sont évités en mode discret.", type: HostileMenu, restricted: true,
  });
  game.settings.register(MODULE, "usure", {
    name: "Usure du vaisseau (%)",
    hint: "Au-delà de 50 %, +1 à la difficulté ; au-delà de 80 %, +2. Mise à jour automatiquement par le vaisseau (Holocron) si présent.",
    scope: "world", config: true, type: Number, default: 0, range: { min: 0, max: 100, step: 5 },
    onChange: () => { for (const a of legApps()) a.applyLeg?.(LEG); },   // recalcul live de la difficulté
  });
  game.settings.register(MODULE, "mapBackground", {
    name: "Fond de carte par défaut", hint: "« Avec routes » = carte canon (hyperroutes cuites). « Sans routes » = fond épuré. Le bouton « Routes sur la carte » de la fenêtre bascule à la volée ; seul le tracé du trajet est dessiné par-dessus.",
    scope: "world", config: true, type: String, default: "clean",
    choices: { routes: "Avec routes (canon)", clean: "Sans routes (épuré)" },
    onChange: (v) => {   // aligne le fond des fenêtres ouvertes sur le nouveau défaut (sans perdre le zoom)
      const routes = v === "routes";
      for (const app of foundry.applications.instances.values()) {
        if (app instanceof AstronavApp && app._map) {
          app._map.bgRoutes = routes;
          app.element?.querySelector?.('[data-bg="routes"]')?.classList.toggle("on", routes);
          const img = new Image();
          img.src = foundry.utils.getRoute(asset(BG(routes)));
          img.decode().then(() => { app._map.img = img; app._draw(); }).catch(() => {});
        }
      }
    },
  });
  game.settings.register(MODULE, "travelDifficulty", {
    name: "Difficulté des voyages", hint: "Décale la difficulté d'astrogation. Milieu = règles FFG.",
    scope: "world", config: true, type: Number, default: 0,
    choices: { "-2": "Très facile (−2)", "-1": "Facile (−1)", "0": "Normal (règles FFG)", "1": "Difficile (+1)", "2": "Très difficile (+2)" },
  });
  // Étiquettes des ressources consommées (le pool réel est suivi par fvtt-party-resources côté Holocron).
  for (const [key, def] of [["resFoodLabel", "Vivres"], ["resFuelLabel", "Carburant"], ["resRepairLabel", "Pièce de réparation"]])
    game.settings.register(MODULE, key, { name: `Ressource — ${def}`, scope: "world", config: true, type: String, default: def });
  // import du compendium + position courante (alimentée par le Holocron)
  for (const key of ["imported", "importPrompted"])
    game.settings.register(MODULE, key, { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(MODULE, "currentWorld", { scope: "world", config: false, type: String, default: "" });
  game.settings.registerMenu(MODULE, "importMenu", {
    name: "Fiches planètes (journaux)", label: "Importer dans les journaux…", icon: "fa-solid fa-file-import",
    hint: "Copie les fiches du compendium dans les journaux du monde (requis pour l'affichage MEJ et les favoris).",
    type: ImportMenu, restricted: true,
  });

  const m = game.modules.get(MODULE);
  m.api = {
    ...(m.api || {}),
    open: () => new AstronavApp().render(true),
    setLeg, showWorld, chooser, favorites: favoriteWorlds, toggleFavorite: toggleFavoriteWorld,
    setCurrentWorld, currentWorld, importToWorld,
    usure, setUsure,
    data: async () => { await ensureData(); return getData(); },
    lastCost: null, AstronavApp,
  };
});

// 1er lancement (MJ) : proposer d'importer le compendium dans les journaux si absent.
Hooks.once("ready", async () => {
  if (!game.user.isGM || game.settings.get(MODULE, "imported")) return;
  const folder = game.folders?.find((f) => f.type === "JournalEntry" && f.name === "Planètes — Astronav");
  if (folder) return game.settings.set(MODULE, "imported", true);
  if (game.settings.get(MODULE, "importPrompted")) return;   // ne proposer qu'une fois automatiquement
  await game.settings.set(MODULE, "importPrompted", true);
  importToWorld({ confirm: true });
});

// Bouton dans les contrôles de scène (barre de gauche), groupe « jetons ».
Hooks.on("getSceneControlButtons", (controls) => {
  const tools = controls.tokens?.tools ?? controls.find?.((c) => c.name === "token")?.tools;
  if (!tools) return;
  const btn = { name: "astronav", title: "SWFFG.astronav.title", icon: "fa-solid fa-route", button: true,
    onChange: () => new AstronavApp().render(true), onClick: () => new AstronavApp().render(true) };
  Array.isArray(tools) ? tools.push(btn) : (tools.astronav = { ...btn, order: 99 });
});

/* ---- bouton « Astronav » sur les fiches planète (MEJ Place / compendium) ---- */
function planetOf(doc) {
  if (!doc) return null;
  const cc = doc.flags?.["campaign-codex"]?.type;
  const isPlanet = cc === "location" || cc === "region"
    || doc.flags?.["monks-enhanced-journal"]?.pagetype === "place"
    || doc.pack === `${MODULE}.planetes` || doc.flags?.[MODULE]?.xy
    || doc.parent?.flags?.[MODULE];
  return isPlanet ? (doc.parent?.name ?? doc.name) : null;
}
// v13 ApplicationV2 : contrôles d'en-tête (itinéraire + étoile de favori MJ).
Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  const name = planetOf(app?.document); if (!name || !Array.isArray(controls)) return;
  controls.push({ icon: "fa-solid fa-route", label: "SWFFG.astronav.setLeg", action: "swffgAstronav",
    onClick: () => game.modules.get(MODULE).api.chooser(name) });
  if (game.user.isGM) controls.push({ icon: "fa-solid fa-star", label: "SWFFG.astronav.favorite", action: "swffgAstronavFav",
    onClick: () => toggleFavoriteWorld(name) });
});
// Fallback DOM (fiche journal standard + fenêtre Monk's Enhanced Journal).
function injectAstroBtn(app, html) {
  try {
    const doc = app?.document ?? app?.object;
    const name = planetOf(doc); if (!name) return;
    const root = html?.[0] ?? html?.element ?? html;
    const header = root?.querySelector?.(".window-header"); if (!header || header.querySelector("[data-astronav]")) return;
    const a = document.createElement("a");
    a.className = "header-control"; a.dataset.astronav = "1"; a.title = "Astronav";
    a.innerHTML = '<i class="fa-solid fa-route"></i>'; a.style.cssText = "margin:0 4px;cursor:pointer";
    a.addEventListener("click", () => game.modules.get(MODULE).api.chooser(name));
    (header.querySelector(".window-title") ?? header).after?.(a);
    header.appendChild(a);
    if (game.user.isGM && !header.querySelector("[data-astronav-fav]")) {
      const s = document.createElement("a");
      s.className = "header-control"; s.dataset.astronavFav = "1"; s.title = "★ Favori de table";
      s.innerHTML = '<i class="fa-solid fa-star"></i>'; s.style.cssText = "margin:0 4px;cursor:pointer";
      s.addEventListener("click", () => toggleFavoriteWorld(name));
      header.appendChild(s);
    }
  } catch { /* structure d'en-tête variable selon les versions */ }
}
for (const hook of ["renderJournalEntrySheet", "renderJournalSheet", "renderEnhancedJournal"])
  Hooks.on(hook, (app, html) => injectAstroBtn(app, html));
