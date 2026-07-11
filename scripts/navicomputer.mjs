/**
 * SWFFG Astronav — Navi-Computer (tableau de bord).
 * Fenêtre ApplicationV2 : cockpit du groupe (allégeance, vaisseau en barres, position,
 * équipage, alignement des PNJ, HoloNet) + le calculateur d'astrogation intégré.
 *
 * Le dashboard lit son état dans des journaux du monde (flags « holocron ») dont les noms
 * sont configurables. Un installateur crée les journaux manquants. Sans eux, l'app affiche
 * des valeurs par défaut : elle reste utilisable, seul le contexte de campagne manque.
 */
import {
  MODULE, ensureData, getData, computeRoute, astroCheck, tripCost, fmtDays, DN, dice, esc, hostileSet,
} from "./astronav.mjs";

const S = (k) => game.settings.get(MODULE, k);
const gp = (d, p) => foundry.utils.getProperty(d, p);
const jn = (key) => game.journal.getName(S(key));

const SHIP_DEFAULTS = { name: "Vaisseau du groupe", vivres: 60, vivresMax: 60, fuel: 30, fuelMax: 30, usure: 0, hyper: 1, lastTo: "" };
function shipNow() { const j = jn("journalShip"); return { ...SHIP_DEFAULTS, ...(j ? gp(j, "flags.holocron.ship") || {} : {}) }; }

function bar(icon, label, v, m, color, pct) {
  const w = Math.max(0, Math.min(100, (v / (m || 1)) * 100));
  return `<div class="nv-stat"><div class="nv-sh"><span>${icon} ${label}</span><b>${pct ? Math.round(v) + "%" : v + " / " + m}</b></div>
    <div class="nv-track"><div class="nv-fill" style="width:${w}%;background:${color}"></div></div></div>`;
}

function buildHTML() {
  const { byName } = getData();
  const jShip = jn("journalShip"), jCodex = jn("journalCodex"), jHolo = jn("journalHolonet"), jLog = jn("journalLog");
  const ship = shipNow();
  const codex = (jCodex && gp(jCodex, "flags.holocron.codex")) || { allegiance: "—", pcs: [], npcs: [] };
  const crew = (codex.pcs || []).map((p) => `<div class="nv-crew"><span class="nv-ava" style="${p.img ? `background-image:url('${esc(p.img)}')` : ""}"></span><span>${esc(p.name)}</span><small>${esc(p.species || "")}${p.career ? " · " + esc(p.career) : ""}</small></div>`).join("");
  const SC = { allie: "#8ad17a", mentor: "#d9b45b", neutre: "#8b9bc0", ennemi: "#e5544b" };
  const npcChip = (n) => `<div class="nv-npc${n.mort ? " dead" : ""}" style="--sc:${SC[n.statut] || "#8b9bc0"}">${esc(n.name)}${n.mort ? " †" : ""}</div>`;
  const camps = { g: [], n: [], e: [] };
  for (const n of codex.npcs || []) (n.statut === "ennemi" ? camps.e : n.statut === "neutre" ? camps.n : camps.g).push(n);
  const holoHTML = jHolo ? (gp(jHolo.pages.contents[0] || {}, "text.content") || "") : "";
  const logPage = jLog ? jLog.pages.contents[0] : null;
  const logTxt = logPage ? (gp(logPage, "text.content") || "").replace(/<[^>]+>/g, " ").trim().slice(-220) : "";
  const pl = byName[ship.lastTo];
  const dlist = getData().list.map((n) => `<option value="${esc(n)}">`).join("");
  const missing = !jShip || !jCodex;
  return `<style>
    .nv-root { display: grid; grid-template-columns: 420px 1fr; gap: 10px; padding: 10px; color: #d8ecf7; font-size: 13px; height: 100%; overflow: auto; background: radial-gradient(1200px 500px at 30% -10%, #10283a55, transparent), #0a121b; }
    .nv-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .nv-p { border: 1px solid #2b5b73; border-radius: 10px; padding: 8px 10px; background: linear-gradient(180deg, #12263699, #08101899); }
    .nv-eb { margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #7fdfff; display: flex; gap: 6px; align-items: center; }
    .nv-eb .nv-right { margin-left: auto; opacity: .6; text-transform: none; letter-spacing: 0; }
    .nv-alleg { display: flex; gap: 10px; align-items: center; }
    .nv-alleg .nv-emb { width: 44px; height: 44px; border: 2px solid #7fdfff; border-radius: 50%; display: grid; place-items: center; color: #7fdfff; font-size: 20px; flex: none; box-shadow: 0 0 14px #5abeff45; }
    .nv-alleg h2 { margin: 0; font-size: 17px; color: #eaf6ff; line-height: 1.15; }
    .nv-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .nv-stat { margin-bottom: 5px; }
    .nv-sh { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
    .nv-track { height: 8px; border-radius: 99px; background: #0a1520; border: 1px solid #ffffff14; overflow: hidden; }
    .nv-fill { height: 100%; }
    .nv-loc { text-align: center; }
    .nv-planet { width: 74px; height: 74px; border-radius: 50%; margin: 2px auto; background: #0a1520 center/cover; border: 2px solid #2b5b73; display: grid; place-items: center; font-size: 24px; }
    .nv-loc h3 { margin: 3px 0 0; font-size: 14px; color: #eaf6ff; }
    .nv-crews { display: flex; flex-wrap: wrap; gap: 8px; }
    .nv-crew { width: 76px; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .nv-ava { width: 46px; height: 46px; border-radius: 50%; border: 2px solid #7fdfff77; background: #0a1520 center/cover; }
    .nv-crew span { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .nv-crew small { font-size: 9px; opacity: .6; }
    .nv-axis { height: 3px; border-radius: 2px; background: linear-gradient(90deg, #8ad17a, #8b9bc0, #e5544b); margin-bottom: 6px; }
    .nv-camps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .nv-ct { font-size: 10px; font-weight: 700; margin-bottom: 3px; color: #9db8c8; }
    .nv-npc { font-size: 11px; border-left: 3px solid var(--sc); padding: 1px 5px; margin-bottom: 2px; background: #ffffff0a; border-radius: 2px; }
    .nv-npc.dead { opacity: .5; }
    .nv-holo { max-height: 150px; overflow: auto; font-size: 12px; }
    .nv-holo :is(h1,h2,h3) { font-size: 13px; margin: 2px 0; color: #eaf6ff; border: 0; }
    .nv-note { border-top: 1px solid #2b5b73; margin-top: 6px; padding-top: 5px; font-size: 11px; opacity: .85; font-style: italic; }
    .nv-warn { background: #3a2a10; border: 1px solid #d9b45b; color: #f0d79a; border-radius: 8px; padding: 6px 10px; font-size: 12px; }
    .nv-form { display: flex; flex-wrap: wrap; gap: 6px; align-items: end; }
    .nv-f { display: flex; flex-direction: column; gap: 2px; flex: 1 1 140px; }
    .nv-f label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #7fdfff; }
    .nv-root input, .nv-root select { background: #0a1520; border: 1px solid #2b5b73; color: #d8ecf7; border-radius: 6px; padding: 4px 6px; }
    .nv-btn { background: transparent; border: 1px solid #7fdfff; color: #7fdfff; border-radius: 999px; padding: 4px 12px; cursor: pointer; font-weight: 700; }
    .nv-btn:hover { background: #7fdfff; color: #06121c; }
    .nv-btn.gold { border-color: #d9b45b; color: #d9b45b; }
    .nv-btn.gold:hover { background: #d9b45b; color: #06121c; }
    .nv-res { margin-top: 8px; }
    .nv-cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; margin: 6px 0; }
    .nv-cell { border: 1px solid #2b5b73; border-radius: 8px; padding: 6px 8px; background: #0c1926aa; }
    .nv-cell .k { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #7fdfff; }
    .nv-cell .v { font-size: 15px; font-weight: 700; color: #eaf6ff; margin-top: 2px; }
    .nv-cell .v small { display: block; font-size: 10px; font-weight: 400; opacity: .65; }
    .nv-parts { font-size: 11px; opacity: .8; }
    .nv-acts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  </style>
  <div class="nv-root">
    <div class="nv-col">
      ${missing && game.user.isGM ? `<div class="nv-warn">Journaux de campagne absents. <a data-act="install" style="cursor:pointer;text-decoration:underline">Créer les journaux du Navi-Computer</a> (vaisseau, codex, HoloNet, journal de bord).</div>` : ""}
      <div class="nv-p nv-alleg"><div class="nv-emb">◈</div><div>
        <p class="nv-eb">Allégeance du groupe ${game.user.isGM && jCodex ? '<a class="nv-right" data-act="alleg" style="cursor:pointer">✎ modifier</a>' : ""}</p>
        <h2>${esc(codex.allegiance || "—")}</h2></div></div>
      <div class="nv-row">
        <div class="nv-p"><p class="nv-eb">🚀 Vaisseau</p>
          ${bar("🥫", "Vivres", ship.vivres, ship.vivresMax, "#6fbf8f")}
          ${bar("⛽", "Carburant", ship.fuel, ship.fuelMax, "#57c7ff")}
          ${bar("🔧", "Usure", ship.usure, 100, ship.usure > 80 ? "#e5544b" : ship.usure > 50 ? "#e0975c" : "#8ad17a", true)}
          <div style="font-size:10px;opacity:.6">Hyperdrive ×${ship.hyper}</div>
          <div class="nv-acts"><button type="button" class="nv-btn" data-act="refuel">🥫</button><button type="button" class="nv-btn" data-act="fuel">⛽</button><button type="button" class="nv-btn" data-act="repair">🔧</button></div></div>
        <div class="nv-p nv-loc"><p class="nv-eb">📍 Position</p>
          <div class="nv-planet" style="${pl && pl.img ? `background-image:url('${esc(pl.img)}')` : ""}">${pl && pl.img ? "" : "🪐"}</div>
          <h3>${esc(ship.lastTo || "Inconnue")}</h3>
          <small style="opacity:.6">${pl ? esc(pl.region || "") : "applique un voyage"}</small></div>
      </div>
      <div class="nv-p"><p class="nv-eb">👤 Équipage</p><div class="nv-crews">${crew || '<small style="opacity:.5">Renseigne flags.holocron.codex.pcs sur le journal Codex.</small>'}</div></div>
      <div class="nv-p"><p class="nv-eb">🕸️ Alignement</p><div class="nv-axis"></div>
        <div class="nv-camps">
          <div><div class="nv-ct">🟢 Alliés (${camps.g.length})</div>${camps.g.map(npcChip).join("")}</div>
          <div><div class="nv-ct">⚪ Neutres (${camps.n.length})</div>${camps.n.map(npcChip).join("")}</div>
          <div><div class="nv-ct">🔴 Ennemis (${camps.e.length})</div>${camps.e.map(npcChip).join("")}</div>
        </div></div>
      <div class="nv-p"><p class="nv-eb">📡 HoloNet ${jHolo ? '<a class="nv-right" data-act="holo" style="cursor:pointer">ouvrir ↗</a>' : ""}</p>
        <div class="nv-holo">${holoHTML || '<small style="opacity:.5">Édite le journal HoloNet.</small>'}</div>
        ${logTxt ? `<div class="nv-note">📖 …${esc(logTxt)} <a data-act="log" style="cursor:pointer;color:#d9b45b">↗</a></div>` : ""}</div>
    </div>
    <div class="nv-col">
      <div class="nv-p"><p class="nv-eb">🪐 Astronav — calculateur d'itinéraire</p>
        <datalist id="nv-pl">${dlist}</datalist>
        <div class="nv-form">
          <div class="nv-f"><label>Origine</label><input id="nv-from" list="nv-pl" value="${esc(ship.lastTo || "Coruscant")}"/></div>
          <div class="nv-f"><label>Destination</label><input id="nv-to" list="nv-pl" placeholder="Tatooine"/></div>
          <div class="nv-f" style="flex:0 0 90px"><label>Hyperdrive</label><select id="nv-hyper">${[0.5, 1, 2, 3, 4].map((h) => `<option value="${h}" ${h === ship.hyper ? "selected" : ""}>×${h}</option>`).join("")}</select></div>
          <label style="display:flex;gap:4px;align-items:center;font-size:11px"><input type="checkbox" id="nv-avoid"/> 🕶️ discret</label>
          <button type="button" class="nv-btn gold" data-act="compute">Calculer</button>
        </div>
        <div class="nv-res" id="nv-res"><small style="opacity:.5">Choisis deux mondes puis « Calculer ».</small></div></div>
    </div>
  </div>`;
}

export class NaviComputerApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "swffg-navicomputer-app",
    window: { title: "SWFFG.navi.title", icon: "fa-solid fa-satellite-dish", resizable: true },
    position: { width: 1220, height: 780 },
  };
  async _renderHTML() { await ensureData(); return buildHTML(); }
  _replaceHTML(html, content) { content.innerHTML = html; this._wire(content); }

  /** Renseigne origine/destination depuis un preset (macros « départ / arrivée »). */
  applyLeg(leg) {
    const root = this.element; if (!root) return;
    const f = root.querySelector("#nv-from"), t = root.querySelector("#nv-to");
    if (leg.from && f) f.value = leg.from;
    if (leg.to && t) t.value = leg.to;
    if (f?.value?.trim() && t?.value?.trim()) this._compute(root);
    this.bringToFront?.();
  }
  _wire(root) {
    const app = this;
    root.querySelectorAll("[data-act]").forEach((el) => el.addEventListener("click", async () => {
      const act = el.dataset.act;
      const jShip = jn("journalShip"), jCodex = jn("journalCodex"), jHolo = jn("journalHolonet"), jLog = jn("journalLog");
      if (act === "install") { await installJournals(); app.render(); return; }
      if (act === "holo") return jHolo?.sheet.render(true);
      if (act === "log") return jLog?.sheet.render(true);
      if (act === "alleg") {
        const v = window.prompt("Allégeance du groupe :", (jCodex && gp(jCodex, "flags.holocron.codex.allegiance")) || "");
        if (v != null && jCodex) { await jCodex.update({ "flags.holocron.codex.allegiance": v.trim() }); app.render(); }
        return;
      }
      if (["refuel", "fuel", "repair"].includes(act)) {
        if (!jShip) return ui.notifications.warn("Journal vaisseau introuvable — lance l'installateur.");
        const s = shipNow();
        if (act === "refuel") s.vivres = s.vivresMax; else if (act === "fuel") s.fuel = s.fuelMax; else s.usure = 0;
        await jShip.update({ "flags.holocron.ship": s }); app.render(); return;
      }
      if (act === "compute") return app._compute(root);
    }));
    root.querySelectorAll("#nv-from, #nv-to").forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") app._compute(root); }));
  }
  _compute(root) {
    const { byName, graph } = getData();
    const from = root.querySelector("#nv-from").value.trim(), to = root.querySelector("#nv-to").value.trim();
    const hyper = Number(root.querySelector("#nv-hyper").value) || 1, avoid = root.querySelector("#nv-avoid").checked;
    const res = root.querySelector("#nv-res");
    const o = byName[from], dst = byName[to];
    if (!o || !dst) { res.innerHTML = `<b style="color:#e5544b">Monde inconnu : ${esc(!o ? from : to)}</b>`; return; }
    if (!o.xy || !dst.xy || o.name === dst.name) { res.innerHTML = `<b style="color:#e5544b">Itinéraire impossible (coordonnées ou mondes identiques).</b>`; return; }
    const ship = shipNow();
    const route = computeRoute(graph, o, dst, hyper, { avoid, hostile: hostileSet() });
    if (!route) { res.innerHTML = `<b style="color:#e5544b">Aucun itinéraire trouvé.</b>`; return; }
    const chk = astroCheck(o, dst, route, ship), cost = tripCost(route, hyper), chal = Math.min(chk.upgrades, chk.diff);
    const pool = { difficulty: chk.diff - chal, ...(chal ? { challenge: chal } : {}), ...(chk.boost ? { boost: chk.boost } : {}), ...(chk.setback ? { setback: chk.setback } : {}) };
    const okV = ship.vivres >= cost.days, okF = ship.fuel >= cost.fuel;
    this._last = { o, dst, route, chk, cost, pool, hyper };
    res.innerHTML = `
      <div class="nv-cells">
        <div class="nv-cell"><div class="k">Itinéraire</div><div class="v">${route.cases.total.toFixed(1)} cases<small>${Math.round(((route.cases.major + route.cases.minor) / (route.cases.total || 1)) * 100)}% sur routes${route.hostile ? ` · ⚠️ ${route.hostile} hostile(s)` : avoid ? " · 🕶️ 0 hostile" : ""}</small></div></div>
        <div class="nv-cell"><div class="k">Durée</div><div class="v">${fmtDays(route.days)}<small>hyperdrive ×${hyper}</small></div></div>
        <div class="nv-cell"><div class="k">Difficulté</div><div class="v">${dice({ di: pool.difficulty, ch: chal, bo: chk.boost, se: chk.setback })}<small>${DN[chk.diff]}${chk.upgrades ? " ↑" + chk.upgrades : ""}</small></div></div>
        <div class="nv-cell"><div class="k">Calcul</div><div class="v">${chk.calc}</div></div>
        <div class="nv-cell"><div class="k">Consommation</div><div class="v"><span style="color:${okV ? "#8ad17a" : "#e5544b"}">−${cost.days}j</span> · <span style="color:${okF ? "#8fd4ff" : "#e5544b"}">−${cost.fuel}⛽</span> · +${cost.usure}%🔧</div></div>
      </div>
      <div class="nv-parts">${chk.parts.map((p) => `${esc(p.label)} <b>${esc(p.tag)}</b>`).join(" · ")}</div>
      <div class="nv-acts">
        <button type="button" class="nv-btn" data-roll="1">🎲 Jet → chat</button>
        <button type="button" class="nv-btn gold" data-apply="1" ${okV && okF ? "" : "disabled"}>${okV && okF ? "🧭 Appliquer le voyage" : "⛔ Ressources insuffisantes"}</button>
      </div>`;
    res.querySelector("[data-roll]").addEventListener("click", () => this._roll());
    const ap = res.querySelector("[data-apply]");
    if (ap && !ap.disabled) ap.addEventListener("click", () => this._apply());
  }
  async _roll() {
    const L = this._last; if (!L) return;
    const hasFFG = game.system.id === "starwarsffg";
    await ChatMessage.create({
      content: `<h4>🎲 Astrogation — ${esc(L.o.name)} → ${esc(L.dst.name)}</h4><p>Difficulté ${DN[L.chk.diff]}${L.chk.upgrades ? " (↑" + L.chk.upgrades + ")" : ""}</p>` + (hasFFG ? `<button class="ffg-pool-to-player">🎲 Lancer (obstacle dans le pool)</button>` : ""),
      flags: hasFFG ? { starwarsffg: { dicePool: L.pool, description: `Astrogation ${L.o.name}→${L.dst.name}`, roll: { data: {}, skillName: "Astrogation", item: {}, flavor: "", sound: null } } } : {},
    });
    ui.notifications.info("Jet posté dans le chat.");
  }
  async _apply() {
    const L = this._last; const jShip = jn("journalShip"); if (!L || !jShip) return;
    const s = shipNow();
    const next = { ...s, vivres: Math.max(0, s.vivres - L.cost.days), fuel: Math.max(0, s.fuel - L.cost.fuel), usure: Math.min(100, s.usure + L.cost.usure), hyper: L.hyper, lastFrom: L.o.name, lastTo: L.dst.name };
    await jShip.update({ "flags.holocron.ship": next });
    const pc = (v, m) => Math.round(v / m * 100);
    const pg = jShip.pages.contents[0];
    if (pg) await pg.update({ "text.content": `<h2>🚀 ${esc(next.name)}</h2><ul><li>🥫 Vivres : <strong>${next.vivres} / ${next.vivresMax}</strong> (${pc(next.vivres, next.vivresMax)}%)</li><li>⛽ Carburant : <strong>${next.fuel} / ${next.fuelMax}</strong> (${pc(next.fuel, next.fuelMax)}%)</li><li>🔧 Usure : <strong>${next.usure}%</strong></li><li>Hyperdrive : ×${next.hyper}</li></ul><p><em>Dernier voyage : ${esc(L.o.name)} → ${esc(L.dst.name)}.</em></p>` });
    await ChatMessage.create({ content: `<h4>🚀 Voyage ${esc(L.o.name)} → ${esc(L.dst.name)}</h4><p>−${L.cost.days}j vivres · −${L.cost.fuel} carburant · +${L.cost.usure}% usure → 🥫 ${next.vivres}/${next.vivresMax} · ⛽ ${next.fuel}/${next.fuelMax} · 🔧 ${next.usure}%</p>` });
    this.render();
  }
}

/* -------------------------------------------------------- installateur ------ */
export async function installJournals() {
  if (!game.user.isGM) return ui.notifications.warn("Réservé au MJ.");
  const OWN = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  async function ensure(name, content, ownership) {
    let j = game.journal.getName(name);
    if (!j) j = await JournalEntry.create({ name, ownership: ownership || { default: OWN.OBSERVER },
      pages: [{ name: "Contenu", type: "text", text: { content, format: 1 } }] });
    return j;
  }
  await ensure(S("journalShip"), "<h2>🚀 Vaisseau du groupe</h2><p>Statut du vaisseau. Le Navi-Computer écrit ici <code>flags.holocron.ship</code> (vivres, carburant, usure, dernier voyage).</p>");
  await ensure(S("journalCodex"), "<h2>🖥️ Codex du groupe</h2><p>Allégeance, PJ et PNJ. Le Navi-Computer lit <code>flags.holocron.codex</code> (allegiance, pcs[], npcs[{name,statut,mort}]).</p>");
  await ensure(S("journalHolonet"), "<h2>📡 HoloNet — Actualités</h2><p>Nouvelles de la galaxie, rumeurs, accroches.</p>");
  await ensure(S("journalLog"), "<h2>📖 Journal de bord du vaisseau</h2><p>Notes de séance des joueurs.</p>", { default: OWN.OWNER });
  ui.notifications.info("Navi-Computer : journaux de campagne prêts.");
}

/* --------------------------------------------------------------- amorçage --- */
Hooks.once("init", () => {
  const defs = {
    journalShip: "🚀 Vaisseau du groupe", journalCodex: "🖥️ Codex du groupe",
    journalHolonet: "📡 HoloNet — Actualités", journalLog: "📖 Journal de bord du vaisseau",
  };
  for (const [key, def] of Object.entries(defs))
    game.settings.register(MODULE, key, { name: `Journal : ${def}`, scope: "world", config: true, type: String, default: def });
  Hooks.once("ready", () => {
    const m = game.modules.get(MODULE);
    m.api = { ...(m.api || {}), openDashboard: () => new NaviComputerApp().render(true), install: installJournals, NaviComputerApp };
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tools = controls.tokens?.tools ?? controls.find?.((c) => c.name === "token")?.tools;
  if (!tools) return;
  const btn = { name: "navicomputer", title: "SWFFG.navi.title", icon: "fa-solid fa-satellite-dish", button: true,
    onChange: () => new NaviComputerApp().render(true), onClick: () => new NaviComputerApp().render(true) };
  Array.isArray(tools) ? tools.push(btn) : (tools.navicomputer = { ...btn, order: 98 });
});
