// Site Walk boot: decides between the game and the classic pages, loads the site, wires the parts.
import './game.css';
import { webglAvailable, currentTier } from './quality.js';

const params = new URLSearchParams(location.search);
const TIERS = ['high', 'medium', 'low'];
const tier = TIERS.includes(params.get('tier')) ? params.get('tier') : currentTier();
import { createEngine } from './engine.js';
import { loadManifest, loadAssets } from './assets.js';
import { buildWorld } from './world.js';
import { createCrew } from './crew.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { isTouchDevice } from './ui/opening.js';
import { createTalk } from './ui/talk.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createResults } from './ui/results.js';
import { createAudio } from './audio.js';
import { nextTier } from './perf.js';
import { createJump, landingSpot } from './jump.js';
import { createWheel } from './ui/wheel.js';
import { createSiteMap } from './ui/sitemap.js';
import { OFFICE } from './content.js';
import { rank } from './scoring.js';
import * as THREE from 'three';
import { CREW } from './content.js';
import { createLoading } from './ui/loading.js';
import { createOpening } from './ui/opening.js';
import { createMenu } from './ui/menu.js';
import { loadState, saveState, createState, completedCount, isComplete, officeOpen, recordAnswer } from './state.js';

const WP = window.WP;
const root = document.getElementById('siteWalk');
const testMode = params.has('test');
const deepLink = /^#(quiz|agents|discovery|about)$/.test(location.hash);
const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const audio = createAudio();

const game = { engine: null, assets: null, state: loadState(), ready: false, started: false };
// True from the moment a jump starts until you land.
Object.defineProperty(game, 'jumping', { get: () => game.jump?.isActive() ?? false });
if (testMode) {
  window.__siteWalk = {
    isReady: () => game.ready, state: () => game.state,
    crewPositions: () => game.crew.members.map((m) => ({ agentId: m.agentId, name: m.data.name, x: m.pos.x, z: m.pos.z })), fps: () => game.engine?.fps() ?? 0, game,
    teleport(x, z) { game.player.teleport(x, z); },
    playerPos: () => ({ x: game.player.pos.x, z: game.player.pos.z }),
    // Point the camera along (dx, dz) behind the player, keeping its distance and height.
    faceCamera(dx, dz) {
      const { camera, controls } = game.engine;
      const off = camera.position.clone().sub(controls.target);
      const flat = Math.hypot(off.x, off.z), len = Math.hypot(dx, dz);
      camera.position.set(controls.target.x - (dx / len) * flat, controls.target.y + off.y, controls.target.z - (dz / len) * flat);
    },
  };
}

function fallback() {
  WP.openClassic('agents');
  document.querySelector('[data-site-walk]')?.setAttribute('hidden', '');
  if (!document.querySelector('.sw-fallback-note')) {
    const note = document.createElement('p');
    note.className = 'sw-fallback-note';
    note.textContent = 'Your browser can\'t run the 3D site, so here are the classic pages.';
    document.querySelector('main').prepend(note);
  }
}

const opening = createOpening(root, {
  onStart: () => { game.started = true; document.documentElement.classList.add('sw-playing'); audio.setAmbient(true); },
  onSkip: () => WP.openClassic('agents'),
});

const menu = createMenu(root, {
  onSkip: (face) => WP.openClassic(face),
  onResume: () => { if (game.ready && !game.started) opening.show({ met: completedCount(game.state) }); },
  onReset: () => { game.state = createState(); saveState(game.state); window.dispatchEvent(new CustomEvent('sitewalk:reset')); },
  onToggleSound: () => {
    audio.setMuted(!audio.muted);
    menu.setSound(!audio.muted);
    if (!audio.muted && game.started) audio.setAmbient(true);
  },
});
menu.setSound(!audio.muted);

// Tap or click a worker: walk over to them, then talk (game.startTalk is wired by the HUD step).
function wireTapToTalk() {
  const canvas = game.engine.renderer.domElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, game.engine.camera);
    const hit = ray.intersectObjects([...game.crew.members.map((m) => m.hit), game.world.officeDoor], false)[0]?.object;
    if (!hit) return null;
    return hit === game.world.officeDoor ? 'office' : hit.userData.agentId;
  };
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointermove', (e) => { if (!down) canvas.style.cursor = pick(e) != null ? 'pointer' : 'grab'; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) { down = null; return; }   // that was a drag
    down = null;
    if (!game.started || game.talkingId != null || menu.isOpen()) return;
    const id = pick(e);
    if (id == null) return;
    if (id === 'office') { game.player.walkTo(OFFICE.door[0] + 2, OFFICE.door[1], () => game.openOffice(), 0.6); return; }
    const m = game.crew.byId(id);
    game.player.walkTo(m.pos.x, m.pos.z, () => game.startTalk?.(id));
  });
}

// ---- Conversations, HUD and minimap ------------------------------------------------
const TALK_RANGE = 3.2;
let talk, hud, minimap, results, wheel, sitemap, nearby = null, officeArmed = true;

function refreshProgress() {
  const ranking = rank(game.state);
  hud.setObjective(game.state);
  hud.updateClipboard(ranking, ranking.filter((r) => r.complete).length);
  const top = new Set(ranking.filter((r) => r.complete).slice(0, 3).map((r) => r.agentId));
  game.crew.members.forEach((m) => { m.setMet(isComplete(game.state, m.agentId)); m.setHighlight(top.has(m.agentId)); });
  game.world.setOfficeOpen(officeOpen(game.state));
}

function startTalk(agentId) {
  if (game.talkingId != null || !game.started) return;
  const m = game.crew.byId(agentId);
  game.talkingId = agentId;
  game.player.cancelWalk();
  game.player.faceTowards(m.pos.x, m.pos.z);
  game.input.clear();
  hud.setPrompt(null);
  game.input.setJoystickVisible(false);
  talk.open(m, game.state);
}

function endTalk() {
  talk.close();
  game.talkingId = null;
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
}

function wireConversations() {
  game.startTalk = startTalk;
  hud = createHud(root, { onTalk: () => nearby && startTalk(nearby.agentId), onJump: openWheel });
  minimap = createMinimap(hud.el, { onOpen: openSiteMap });
  talk = createTalk(root, {
    onAnswer(agentId, q, choice) {
      const wasOpen = officeOpen(game.state);
      game.state = recordAnswer(game.state, agentId, q, choice);
      saveState(game.state);
      const unlocked = !wasOpen && officeOpen(game.state);
      refreshProgress();
      if (unlocked) { hud.toast('The site office is open'); audio.chime(); } else audio.blip();
      talk.open(game.crew.byId(agentId), game.state, { unlocked });
    },
    onLeave: endTalk,
    onRestart(agentId) {
      const answers = { ...game.state.answers }; delete answers[agentId];
      game.state = { ...game.state, answers };
      saveState(game.state);
      refreshProgress();
      talk.open(game.crew.byId(agentId), game.state);
    },
  });
  game.input.on('talk', () => { if (nearby) startTalk(nearby.agentId); });
  results = createResults(root, {
    agents: WP.agents,
    onClose: closeResults,
    onOpenDetails: (id, opener) => WP.showAgentModal(WP.agents.find((a) => a.id === id), opener),
    onClassic: (face) => { closeResults(); WP.openClassic(face); },
  });
  game.openOffice = openOffice;
  wheel = createWheel(root, { onPick: jumpTo, onClose: closeWheel });
  sitemap = createSiteMap(root, {
    onPick: (id) => { closeSiteMap(); jumpTo(id, { talk: true }); },   // fly there and start talking
    onClose: closeSiteMap,
  });
  game.input.on('jump', openWheel);
  window.addEventListener('sitewalk:reset', () => { endTalk(); refreshProgress(); });
  refreshProgress();
}

// ---- Jump (GTA-style switch) ---------------------------------------------------------
function openWheel() {
  if (!game.started || game.jumping || game.talkingId != null || results.isOpen() || menu.isOpen()) return;
  game.player.cancelWalk();
  game.input.clear();
  const list = game.crew.members.map((m) => ({ id: m.agentId, label: m.data.name, sub: m.data.role, met: m.met }));
  if (officeOpen(game.state)) list.push({ id: 'office', label: 'Site office', sub: 'Your results', met: false });
  wheel.open(list);
}
function closeWheel() {
  wheel.close();
  game.engine.renderer.domElement.focus?.();
}
function mapView() {
  return { members: game.crew.members, player: game.player.pos, heading: game.player.root.rotation.y, officeOpen: officeOpen(game.state) };
}
function openSiteMap() {
  if (!game.started || game.jumping || game.talkingId != null || results.isOpen()) return;
  menu.close(); wheel.close();
  game.player.cancelWalk();
  game.input.clear();
  game.input.setJoystickVisible(false);
  menu.setVisible(false);    // the menu button would sit over the map's close button on phones
  sitemap.open(mapView());
}
function closeSiteMap() {
  sitemap.close();
  menu.setVisible(true);
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
}
function jumpTo(id, { talk = false } = {}) {
  closeWheel();
  audio.whoosh();
  if (id === 'office') {
    const [a, b, c, d] = OFFICE.trigger;
    officeArmed = true;
    game.jump.start({ x: (a + b) / 2, z: (c + d) / 2 }, { x: OFFICE.door[0], z: OFFICE.door[1] });
    return;
  }
  const m = game.crew.byId(id);
  m.pause = Math.max(m.pause, 4);             // they wait for you
  game.jump.start(landingSpot(m.pos, game.player.pos), m.pos, talk ? () => startTalk(id) : undefined);
}

function openOffice() {
  if (!officeOpen(game.state)) {
    const left = 3 - completedCount(game.state);
    hud.toast(`Talk to ${left} more of the crew first`);
    return;
  }
  game.player.cancelWalk();
  game.input.clear();
  game.input.setJoystickVisible(false);
  hud.setPrompt(null);
  if (!game.state.officeSeen) { game.state = { ...game.state, officeSeen: true }; saveState(game.state); }
  menu.setVisible(false);   // the board has its own ways out; the menu button would cover its close button on phones
  results.open(game.state);
}
function closeResults() {
  results.close();
  menu.setVisible(true);
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
}

let minimapFrame = 0;
function tickConversations() {
  const p = game.player.pos;
  nearby = null;
  if (game.started && game.talkingId == null && !game.jumping) {
    let best = TALK_RANGE;
    for (const m of game.crew.members) { const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z); if (d < best) { best = d; nearby = m; } }
  }
  hud.setPrompt(nearby, isTouchDevice());
  hud.setJumpVisible(game.started && game.talkingId == null && !results.isOpen() && !sitemap.isOpen() && !game.jumping);
  // Walking through the site office door opens the results board (once per visit to the doorway).
  const [a, b, c, d] = OFFICE.trigger;
  const inDoor = p.x >= a && p.x <= b && p.z >= c && p.z <= d;
  if (inDoor && officeArmed && game.started && game.talkingId == null && !results.isOpen() && !game.jumping) { officeArmed = false; openOffice(); }
  if (!inDoor) officeArmed = true;
  if (game.started && ++minimapFrame % 3 === 0) {
    minimap.draw(p, game.player.root.rotation.y, game.crew.members, officeOpen(game.state));
    sitemap.update(mapView());
  }
}

// Gravel footsteps while you walk (faster when running).
let stepClock = 0;
function tickFootsteps(dt) {
  if (!game.player.isMoving()) { stepClock = 0.2; return; }
  stepClock -= dt;
  if (stepClock <= 0) { audio.step(); stepClock = game.input.running() ? 0.2 : 0.28; }
}

// If the device can't keep up (under 30 fps for 4 s), step the quality down one tier.
function watchPerformance() {
  let samples = [];
  setInterval(() => {
    const engine = game.engine;
    if (!game.started || document.hidden || !document.documentElement.classList.contains('site-walk-on')) { samples = []; return; }
    samples = [...samples, engine.fps()].slice(-2);
    const next = nextTier(engine.tier, samples);
    if (next !== engine.tier) { engine.setTier(next); samples = []; }
  }, 4000);
}

let booting = null;
function boot() {
  if (booting) return booting;
  booting = (async () => {
    if (!webglAvailable()) return fallback();
    const loading = createLoading(root);
    try {
      const manifest = await loadManifest();
      game.engine = createEngine(root, tier);
      game.assets = await loadAssets(manifest, loading.progress);
      game.world = buildWorld(game.engine.scene, game.assets, { reducedMotion });
      game.world.setOfficeOpen(officeOpen(game.state));
      game.crew = createCrew(game.engine.scene, game.assets, CREW, { reducedMotion });
      game.crew.members.forEach((m) => m.setMet(isComplete(game.state, m.agentId)));
      game.input = createInput(root, { touch: isTouchDevice(), blocked: () => !game.started || menu.isOpen() || opening.isOpen() || game.talkingId != null || results?.isOpen() || wheel?.isOpen() || sitemap?.isOpen() || game.jumping });
      game.player = createPlayer(game.engine.scene, game.assets, game.engine, game.input, { reducedMotion });
      game.player.snapCamera();
      game.jump = createJump({ engine: game.engine, player: game.player, reducedMotion });
      wireTapToTalk();
      wireConversations();
      game.engine.onFrame((dt, t) => {
        game.world.update(dt, t);
        game.jump.update(dt);
        game.player.update(dt, t, game.started && !menu.isOpen() && game.talkingId == null && !results.isOpen() && !wheel.isOpen() && !sitemap.isOpen() && !game.jumping);
        game.crew.update(dt, t, game.player.pos, game.talkingId);
        tickConversations(t);
        tickFootsteps(dt);
      });
      watchPerformance();
      loading.hide();
      opening.show({ met: completedCount(game.state) });
      game.ready = true;
    } catch (err) {
      loading.fail('The 3D site couldn\'t load.');
      console.warn('Site Walk failed to load', err);
      fallback();
    }
  })();
  return booting;
}

window.addEventListener('sitewalk:show', () => {
  boot(); game.engine?.resume(); game.engine?.resize();
  if (game.started) audio.setAmbient(true);
  else if (game.ready && !opening.isOpen()) opening.show({ met: completedCount(game.state) });   // skipped earlier, now back
});
window.addEventListener('sitewalk:hide', () => { game.engine?.pause(); menu.close(); audio.setAmbient(false); if (game.talkingId != null) endTalk(); });
if (!deepLink) boot();
