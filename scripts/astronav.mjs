/**
 * SWFFG Astronav — calculateur d'astrogation (Star Wars FFG).
 * Fenêtre ApplicationV2 autonome : origine/destination parmi ~6800 mondes, calcul de
 * l'itinéraire par hyperroutes canon, difficulté du test d'Astrogation FFG (dés +
 * améliorations), durée et coût, et jet posté dans le chat.
 *
 * Données embarquées dans le module (data/planets.json + data/lanes.json).
 * Aucune dépendance au contenu d'un monde : ce module est réutilisable tel quel.
 */

const MODULE = "swffg-astronav";
const asset = (p) => `modules/${MODULE}/${p}`;

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
  const cases = { major: 0, minor: 0, off: 0, total: 0 }, onPath = new Set();
  for (let v = N + 1; P[v] >= 0 || P[v] === N; v = P[v]) {
    const u = P[v]; const du = Math.hypot(xyOf(u)[0] - xyOf(v)[0], xyOf(u)[1] - xyOf(v)[1]); const cls = PC[v] || "off";
    cases[cls] += du / U; cases.total += du / U; if (u < N) onPath.add(u); if (v < N) onPath.add(v); if (u === N) break;
  }
  let hc = 0; for (const i of onPath) if (hn[i]) hc++;
  return { cases, days: D[N + 1] * hyper, hostile: hc, regions: Math.abs(rrank(o.region) - rrank(dst.region)), avoid: !!opts.avoid };
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
  let up = 0, diff = raw; if (raw > 5) { up = raw - 5; diff = 5; parts.push({ label: up + " amélioration(s)", tag: "↑" + up }); }
  diff = Math.max(1, Math.min(5, diff));
  return { diff, boost, setback, upgrades: up, parts, calc: up ? "4 heures (Redoutable+)" : CT[diff] };
}
const tripCost = (route, hyper) => ({ days: Math.ceil(route.days), fuel: Math.ceil(route.cases.total + route.cases.off * .5), usure: Math.max(1, Math.ceil(route.days * .4 + route.cases.off * .6)) });
function fmtDays(d) {
  if (d < .75) return "< 1 jour";
  if (d < 10) { const n = Math.max(1, Math.round(d)); return "≈ " + n + " jour" + (n > 1 ? "s" : ""); }
  const w = Math.max(1, Math.round(d / 7)); return "≈ " + w + " semaine" + (w > 1 ? "s" : "");
}

/* ------------------------------------------------------- données + settings -- */
let BY_NAME = null, GRAPH = null, LIST = null;
async function ensureData() {
  if (GRAPH) return;
  const [pj, lanes] = await Promise.all([
    fetch(asset("data/planets.json")).then((r) => r.json()),
    fetch(asset("data/lanes.json")).then((r) => r.json()),
  ]);
  const arr = Array.isArray(pj) ? pj : (pj.planets || pj.systems || Object.values(pj)[0]);
  BY_NAME = {}; for (const p of arr) BY_NAME[p.name] = p;
  LIST = arr.filter((p) => p.xy).map((p) => p.name).sort();
  GRAPH = buildGraph(BY_NAME, lanes);
}
const hostileSet = () => new Set(String(game.settings.get(MODULE, "hostile") || "").split(",").map((s) => s.trim()).filter(Boolean));

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const DIE = { di: ["◆", "#8850c8"], ch: ["◆", "#d6595a"], bo: ["■", "#8fd4ff"], se: ["■", "#666"] };
const dice = (pool) => ["di", "ch", "bo", "se"].map((k) => `<b style="color:${DIE[k][1]}">` + DIE[k][0].repeat(pool[k] || 0) + "</b>").join("");

/* ------------------------------------------------------------------ l'app --- */
export class AstronavApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "swffg-astronav-app",
    window: { title: "SWFFG.astronav.title", icon: "fa-solid fa-route", resizable: true },
    position: { width: 720, height: 620 },
  };

  async _renderHTML() {
    await ensureData();
    const dlist = LIST.map((n) => `<option value="${esc(n)}">`).join("");
    const usure = Number(game.settings.get(MODULE, "usure")) || 0;
    return `<style>
      .an-root { padding: 12px; color: #d8ecf7; font-size: 13px; height: 100%; overflow: auto;
        background: radial-gradient(1200px 500px at 30% -10%, #10283a55, transparent), #0a121b; }
      .an-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin-bottom: 8px; }
      .an-f { display: flex; flex-direction: column; gap: 2px; flex: 1 1 160px; }
      .an-f label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #7fdfff; }
      .an-root input, .an-root select { background: #0a1520; border: 1px solid #2b5b73; color: #d8ecf7; border-radius: 6px; padding: 5px 7px; }
      .an-btn { background: transparent; border: 1px solid #d9b45b; color: #d9b45b; border-radius: 999px; padding: 5px 16px; cursor: pointer; font-weight: 700; }
      .an-btn:hover { background: #d9b45b; color: #06121c; }
      .an-btn.cy { border-color: #7fdfff; color: #7fdfff; }
      .an-btn.cy:hover { background: #7fdfff; color: #06121c; }
      .an-cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; margin: 8px 0; }
      .an-cell { border: 1px solid #2b5b73; border-radius: 8px; padding: 6px 8px; background: #0c1926aa; }
      .an-cell .k { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #7fdfff; }
      .an-cell .v { font-size: 15px; font-weight: 700; color: #eaf6ff; margin-top: 2px; }
      .an-cell .v small { display: block; font-size: 10px; font-weight: 400; opacity: .65; }
      .an-parts { font-size: 11px; opacity: .8; }
      .an-acts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
      .an-hint { opacity: .5; font-size: 12px; }
    </style>
    <div class="an-root">
      <datalist id="an-pl">${dlist}</datalist>
      <div class="an-form">
        <div class="an-f"><label>Origine</label><input id="an-from" list="an-pl" value="Coruscant"/></div>
        <div class="an-f"><label>Destination</label><input id="an-to" list="an-pl" placeholder="Tatooine"/></div>
        <div class="an-f" style="flex:0 0 96px"><label>Hyperdrive</label><select id="an-hyper">
          ${[0.5, 1, 2, 3, 4].map((h) => `<option value="${h}" ${h === 1 ? "selected" : ""}>×${h}</option>`).join("")}</select></div>
        <label style="display:flex;gap:4px;align-items:center;font-size:11px"><input type="checkbox" id="an-avoid"/> 🕶️ discret</label>
        <button type="button" class="an-btn" data-act="compute">Calculer</button>
      </div>
      <div id="an-res" class="an-hint">Choisis deux mondes puis « Calculer ». Usure vaisseau : ${usure}% (réglable dans les paramètres du module).</div>
    </div>`;
  }

  _replaceHTML(html, content) { content.innerHTML = html; this._wire(content); }

  _wire(root) {
    root.querySelector('[data-act="compute"]').addEventListener("click", () => this._compute(root));
    root.querySelectorAll("input").forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") this._compute(root); }));
  }

  _compute(root) {
    const from = root.querySelector("#an-from").value.trim(), to = root.querySelector("#an-to").value.trim();
    const hyper = Number(root.querySelector("#an-hyper").value) || 1, avoid = root.querySelector("#an-avoid").checked;
    const res = root.querySelector("#an-res"); res.classList.remove("an-hint");
    const o = BY_NAME[from], dst = BY_NAME[to];
    if (!o || !dst) { res.innerHTML = `<b style="color:#e5544b">Monde inconnu : ${esc(!o ? from : to)}</b>`; return; }
    if (!o.xy || !dst.xy || o.name === dst.name) { res.innerHTML = `<b style="color:#e5544b">Itinéraire impossible (coordonnées manquantes ou mondes identiques).</b>`; return; }
    const sh = { usure: Number(game.settings.get(MODULE, "usure")) || 0 };
    const route = computeRoute(GRAPH, o, dst, hyper, { avoid, hostile: hostileSet() });
    if (!route) { res.innerHTML = `<b style="color:#e5544b">Aucun itinéraire trouvé.</b>`; return; }
    const chk = astroCheck(o, dst, route, sh), cost = tripCost(route, hyper), chal = Math.min(chk.upgrades, chk.diff);
    const pool = { difficulty: chk.diff - chal, ...(chal ? { challenge: chal } : {}), ...(chk.boost ? { boost: chk.boost } : {}), ...(chk.setback ? { setback: chk.setback } : {}) };
    this._last = { o, dst, route, chk, cost, pool, hyper };
    res.innerHTML = `
      <div class="an-cells">
        <div class="an-cell"><div class="k">Itinéraire</div><div class="v">${route.cases.total.toFixed(1)} cases<small>${Math.round(((route.cases.major + route.cases.minor) / (route.cases.total || 1)) * 100)}% sur routes${route.hostile ? ` · ⚠️ ${route.hostile} hostile(s)` : avoid ? " · 🕶️ 0 hostile" : ""}</small></div></div>
        <div class="an-cell"><div class="k">Durée</div><div class="v">${fmtDays(route.days)}<small>hyperdrive ×${hyper}</small></div></div>
        <div class="an-cell"><div class="k">Difficulté</div><div class="v">${dice({ di: pool.difficulty, ch: chal, bo: chk.boost, se: chk.setback })}<small>${DN[chk.diff]}${chk.upgrades ? " ↑" + chk.upgrades : ""}</small></div></div>
        <div class="an-cell"><div class="k">Calcul</div><div class="v">${chk.calc}</div></div>
        <div class="an-cell"><div class="k">Coût estimé</div><div class="v">−${cost.days}j · −${cost.fuel}⛽ · +${cost.usure}%🔧</div></div>
      </div>
      <div class="an-parts">${chk.parts.map((p) => `${esc(p.label)} <b>${esc(p.tag)}</b>`).join(" · ")}</div>
      <div class="an-acts"><button type="button" class="an-btn cy" data-roll="1">🎲 Jet d'Astrogation → chat</button></div>`;
    res.querySelector("[data-roll]").addEventListener("click", () => this._roll());
  }

  async _roll() {
    const L = this._last; if (!L) return;
    const hasFFG = game.system.id === "starwarsffg";
    await ChatMessage.create({
      content: `<h4>🎲 Astrogation — ${esc(L.o.name)} → ${esc(L.dst.name)}</h4>`
        + `<p>Difficulté <strong>${DN[L.chk.diff]}</strong>${L.chk.upgrades ? " (↑" + L.chk.upgrades + ")" : ""} — ${dice({ di: L.pool.difficulty, ch: L.pool.challenge, bo: L.pool.boost, se: L.pool.setback })}</p>`
        + `<p style="font-size:11px;opacity:.7">${fmtDays(L.route.days)} · ${L.route.cases.total.toFixed(1)} cases · coût ≈ −${L.cost.days}j / −${L.cost.fuel}⛽ / +${L.cost.usure}%🔧</p>`
        + (hasFFG ? `<button class="ffg-pool-to-player">🎲 Lancer (obstacle dans le pool)</button>` : ""),
      flags: hasFFG ? { starwarsffg: { dicePool: L.pool, description: `Astrogation ${L.o.name}→${L.dst.name}`, roll: { data: {}, skillName: "Astrogation", item: {}, flavor: "", sound: null } } } : {},
    });
    ui.notifications.info("Jet d'Astrogation posté dans le chat.");
  }
}

/* --------------------------------------------------------------- amorçage --- */
Hooks.once("init", () => {
  game.settings.register(MODULE, "hostile", {
    name: "Factions hostiles", hint: "Séparées par des virgules. Le mode « discret » évite leurs mondes.",
    scope: "world", config: true, type: String, default: "Empire, Premier Ordre",
  });
  game.settings.register(MODULE, "usure", {
    name: "Usure du vaisseau (%)", hint: "Au-delà de 50 %, +1 à la difficulté ; au-delà de 80 %, +2.",
    scope: "world", config: true, type: Number, default: 0, range: { min: 0, max: 100, step: 5 },
  });
  game.modules.get(MODULE).api = { open: () => new AstronavApp().render(true), AstronavApp };
});

// Bouton dans les contrôles de scène (barre de gauche), groupe « jetons ».
Hooks.on("getSceneControlButtons", (controls) => {
  const tools = controls.tokens?.tools ?? controls.find?.((c) => c.name === "token")?.tools;
  if (!tools) return;
  const btn = { name: "astronav", title: "SWFFG.astronav.title", icon: "fa-solid fa-route", button: true,
    onChange: () => new AstronavApp().render(true), onClick: () => new AstronavApp().render(true) };
  Array.isArray(tools) ? tools.push(btn) : (tools.astronav = { ...btn, order: 99 });
});
