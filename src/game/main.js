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
    // Jump the view to a point on site (Task 7 replaces this with moving the player).
    teleport(x, z) {
      const { camera, controls } = game.engine;
      const offset = camera.position.clone().sub(controls.target);
      controls.target.set(x, 1.5, z); camera.position.copy(controls.target).add(offset);
      game.engine.setShadowCenter(x, z);
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
  onStart: () => { game.started = true; },
  onSkip: () => WP.openClassic('agents'),
});

const menu = createMenu(root, {
  onSkip: (face) => WP.openClassic(face),
  onResume: () => {},
  onReset: () => { game.state = createState(); saveState(game.state); window.dispatchEvent(new CustomEvent('sitewalk:reset')); },
  onToggleSound: () => window.dispatchEvent(new CustomEvent('sitewalk:sound')),
});

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
      game.engine.onFrame((dt, t) => { game.world.update(dt, t); game.crew.update(dt, t, game.player?.pos, game.talkingId); });
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
