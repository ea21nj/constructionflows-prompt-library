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
import * as THREE from 'three';
import { CREW } from './content.js';
import { isComplete } from './state.js';
import { officeOpen } from './state.js';
import { createLoading } from './ui/loading.js';
import { createOpening } from './ui/opening.js';
import { createMenu } from './ui/menu.js';
import { loadState, saveState, createState, completedCount } from './state.js';

const WP = window.WP;
const root = document.getElementById('siteWalk');
const testMode = params.has('test');
const deepLink = /^#(quiz|agents|discovery|about)$/.test(location.hash);

const game = { engine: null, assets: null, state: loadState(), ready: false, started: false };
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
  onStart: () => { game.started = true; document.documentElement.classList.add('sw-playing'); },
  onSkip: () => WP.openClassic('agents'),
});

const menu = createMenu(root, {
  onSkip: (face) => WP.openClassic(face),
  onResume: () => {},
  onReset: () => { game.state = createState(); saveState(game.state); window.dispatchEvent(new CustomEvent('sitewalk:reset')); },
  onToggleSound: () => window.dispatchEvent(new CustomEvent('sitewalk:sound')),
});

// Tap or click a worker: walk over to them, then talk (game.startTalk is wired by the HUD step).
function wireTapToTalk() {
  const canvas = game.engine.renderer.domElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, game.engine.camera);
    return ray.intersectObjects(game.crew.members.map((m) => m.hit), false)[0]?.object.userData.agentId ?? null;
  };
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointermove', (e) => { if (!down) canvas.style.cursor = pick(e) != null ? 'pointer' : 'grab'; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) { down = null; return; }   // that was a drag
    down = null;
    if (!game.started || game.talkingId != null || menu.isOpen()) return;
    const id = pick(e);
    if (id == null) return;
    const m = game.crew.byId(id);
    game.player.walkTo(m.pos.x, m.pos.z, () => game.startTalk?.(id));
  });
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
      game.world = buildWorld(game.engine.scene, game.assets);
      game.world.setOfficeOpen(officeOpen(game.state));
      game.crew = createCrew(game.engine.scene, game.assets, CREW);
      game.crew.members.forEach((m) => m.setMet(isComplete(game.state, m.agentId)));
      game.input = createInput(root, { touch: isTouchDevice(), blocked: () => !game.started || menu.isOpen() || opening.isOpen() || game.talkingId != null });
      game.player = createPlayer(game.engine.scene, game.assets, game.engine, game.input);
      game.player.snapCamera();
      wireTapToTalk();
      game.engine.onFrame((dt, t) => {
        game.world.update(dt, t);
        game.player.update(dt, t, game.started && !menu.isOpen() && game.talkingId == null);
        game.crew.update(dt, t, game.player.pos, game.talkingId);
      });
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

window.addEventListener('sitewalk:show', () => { boot(); game.engine?.resume(); game.engine?.resize(); });
window.addEventListener('sitewalk:hide', () => { game.engine?.pause(); menu.close(); });
if (!deepLink) boot();
