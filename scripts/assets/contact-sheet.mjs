// Renders every shipped model (and the characters with an animation) to an image for review.
//   node scripts/assets/contact-sheet.mjs out.png
import path from 'path';
import { openHarness } from './harness.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const out = process.argv[2] || 'contact-sheet.png';
const { browser, page } = await openHarness(path.join(ROOT, 'public/assets/site'));
await page.setViewportSize({ width: 1600, height: 1000 });
await page.evaluate(async () => {
  const [{ GLTFLoader }, { MeshoptDecoder }, SkeletonUtils] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('three/addons/utils/SkeletonUtils.js')]);
  const manifest = await (await fetch('/src/manifest.json')).json();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(1600, 1000); renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; document.body.style.margin = 0; document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe8ee');
  scene.add(new THREE.HemisphereLight('#ffffff', '#887766', 1.2)); const sun = new THREE.DirectionalLight('#fff', 2.5); sun.position.set(20, 40, 30); scene.add(sun);
  const keys = Object.keys(manifest).filter((k) => k !== 'anims');
  const anims = await loader.loadAsync('/src/anims.glb');
  let i = 0; const cols = 9;
  for (const k of keys) {
    const g = await loader.loadAsync('/src/' + manifest[k].file);
    let obj = g.scene;
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
    const s = 4 / Math.max(size.x, size.y, size.z);
    if (k.startsWith('character')) {
      obj = SkeletonUtils.clone(g.scene); const mixer = new THREE.AnimationMixer(obj);
      mixer.clipAction(anims.animations.find((a) => a.name === 'Walk_Loop')).play(); mixer.update(0.4);
    }
    obj.scale.multiplyScalar(s);
    obj.position.set((i % cols) * 6 - 24, 0, Math.floor(i / cols) * 6 - 10); scene.add(obj);
    const label = document.createElement('div'); label.textContent = `${k} ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}m`;
    label.style.cssText = `position:fixed;font:11px monospace;background:#fff;padding:1px 3px;`; label.dataset.i = i; document.body.appendChild(label);
    i++;
  }
  const cam = new THREE.PerspectiveCamera(35, 1.6, 0.1, 500); cam.position.set(0, 38, 48); cam.lookAt(0, 0, 2);
  renderer.render(scene, cam);
  let j = 0; for (const el of document.querySelectorAll('div[data-i]')) { const v = new THREE.Vector3((j % cols) * 6 - 24, 0, Math.floor(j / cols) * 6 - 10).project(cam); el.style.left = ((v.x + 1) / 2 * 1600 - 40) + 'px'; el.style.top = ((1 - v.y) / 2 * 1000 + 6) + 'px'; j++; }
});
await page.screenshot({ path: out });
await browser.close();
