// Site Walk boot: decides between the game and the classic pages, loads the site, wires the parts.
import './game.css';
import { webglAvailable, currentTier } from './quality.js';
import { createEngine } from './engine.js';
import { loadManifest, loadAssets } from './assets.js';
import { createLoading } from './ui/loading.js';
import { createOpening } from './ui/opening.js';
import { createMenu } from './ui/menu.js';
import { loadState, saveState, createState, completedCount } from './state.js';

const WP = window.WP;
const root = document.getElementById('siteWalk');
const testMode = new URLSearchParams(location.search).has('test');
const deepLink = /^#(quiz|agents|discovery|about)$/.test(location.hash);

const game = { engine: null, assets: null, state: loadState(), ready: false, started: false };
if (testMode) window.__siteWalk = { isReady: () => game.ready, state: () => game.state, fps: () => game.engine?.fps() ?? 0, game };

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
      game.engine = createEngine(root, currentTier());
      game.assets = await loadAssets(manifest, loading.progress);
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
