// Headless-browser harness: serves three.js and source asset folders so FBX/GLTF can be
// loaded with three's loaders and re-exported as GLB (no Blender needed).
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

const nameIndex = new Map();
function findByName(root, name) {
  if (!nameIndex.has(root)) {
    const index = new Map();
    const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (!index.has(e.name.toLowerCase())) index.set(e.name.toLowerCase(), f); } };
    walk(root); nameIndex.set(root, index);
  }
  return nameIndex.get(root).get(name.toLowerCase());
}

export async function openHarness(srcRoot) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  await page.route('http://assets.local/**', async (route) => {
    const url = new URL(route.request().url());
    const p = decodeURIComponent(url.pathname);
    let file;
    if (p === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><script type="module">import * as THREE from 'three'; window.THREE = THREE; window.ready = true;</script>` });
    if (p.startsWith('/three/')) file = path.join(ROOT, 'node_modules', p.slice(1));
    else if (p.startsWith('/src/')) file = path.join(srcRoot, p.slice(5));
    // Model files often reference textures by a path from the author's machine: find them by name.
    if (file && !fs.existsSync(file) && /\.(png|jpe?g)$/i.test(file)) file = findByName(srcRoot, file.split(/[\\/]/).pop()) || file;
    if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'missing ' + p });
    route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  });
  await page.goto('http://assets.local/');
  await page.waitForFunction(() => window.ready);
  return { browser, page };
}
