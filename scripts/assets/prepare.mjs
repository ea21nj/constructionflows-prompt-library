// Builds the shipped Site Walk models from the downloaded CC0 packs.
//   npm run assets -- <folder containing the four extracted packs>
// Each model is loaded with three's loaders in headless Chromium, scaled to real-world size,
// re-rooted at its base, exported as GLB, then compressed with gltf-transform.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { openHarness } from './harness.mjs';

const SRC = path.resolve(process.argv[2] || path.join(process.env.HOME, 'Downloads/site-walk-assets'));
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'public/assets/site');
const TMP = path.join(ROOT, 'node_modules/.cache/site-walk-raw');

const H = 'house-construction-site/extracted/LowPoly-House-Construction-Site-By-Majadroid/fbx files';
const A = 'low-poly-construction-pack/extracted/Low Poly Construction';
const C = 'universal-base-characters/extracted/Universal Base Characters[Standard]/Base Characters/Godot - UE';
const U = 'universal-animation-library/extracted/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';

// fit: scale uniformly so that axis x|y|z of the bounding box equals the value in metres.
const ITEMS = [
  { key: 'crane', src: `${H}/Crane-On-Ground.fbx`, fit: { y: 32 } },
  { key: 'dump_truck', src: `${H}/Trucks.fbx`, pick: 'Dumper_Truck_Red', fit: { z: 7 } },
  { key: 'concrete_truck', src: `${H}/Trucks.fbx`, pick: 'Concrete_Truck_Green', fit: { z: 7.2 } },
  { key: 'small_truck', src: `${H}/Trucks.fbx`, pick: 'Small_Truck', fit: { z: 5.6 } },
  { key: 'office_stack', src: `${H}/Containers-Office.fbx`, pick: 'Office_Container_Stack', fit: { x: 11.5 } },
  { key: 'container_office', src: `${H}/Containers-Office.fbx`, pick: 'Office_Container_Single_Green', fit: { z: 7 } },
  { key: 'toilet', src: `${H}/Containers-Office.fbx`, pick: 'Dixie', fit: { y: 2.4 } },
  { key: 'container_shipping', src: `${H}/Containers-Cargo.fbx`, pick: 'Cargo_Container_White_Boxes', fit: { z: 8.4 } },
  { key: 'skip_red', src: `${H}/Containers.fbx`, pick: 'Container_Red', fit: { z: 4 } },
  { key: 'planks', src: `${H}/Construction-Materials.fbx`, pick: 'Planks_Wood_V1', fit: { z: 4.7 } },
  { key: 'planks_yellow', src: `${H}/Construction-Materials.fbx`, pick: 'Planks_Yellow', fit: { z: 6 } },
  { key: 'box_stack', src: `${H}/Construction-Materials.fbx`, pick: 'Box_Stack_Brown', fit: { z: 2 } },
  { key: 'barrel', src: `${H}/Construction-Materials.fbx`, pick: 'Barrel', fit: { y: 1.1 } },
  { key: 'helmet', src: `${A}/Helmet.fbx`, fit: { x: 0.33 } },
  { key: 'wheelbarrow', src: `${A}/Wheelbarrow.fbx`, fit: { z: 1.5 } },
  { key: 'cement_mixer', src: `${A}/Cement Mixer.fbx`, fit: { y: 1.5 } },
  { key: 'cone', src: `${A}/Cone A.fbx`, fit: { y: 0.7 } },
  { key: 'barrier', src: `${A}/Barrier A.fbx`, fit: { y: 1.0 } },
  { key: 'fence', src: `${A}/Fence A.fbx`, fit: { y: 2.0 } },
  { key: 'pallet', src: `${A}/Pallet.fbx`, fit: { x: 1.2 } },
  { key: 'cinderblock', src: `${A}/Cinderblock.fbx`, fit: { y: 0.4 } },
  { key: 'bricks', src: `${A}/Brick A.fbx`, fit: { x: 0.22 } },
  { key: 'scaffolding', src: `${A}/Scaffolding A.fbx`, fit: { y: 4 } },
  { key: 'clipboard', src: `${A}/Clipboard.fbx`, fit: { x: 0.3 } },
  { key: 'skip', src: `${A}/Skip.fbx`, fit: { x: 5.5 } },
  { key: 'work_light', src: `${A}/Work Light A.fbx`, fit: { y: 1.6 } },
  { key: 'steel_beam', src: `${A}/Steel A.fbx`, fit: { x: 6 } },
  { key: 'pipe', src: `${A}/Pipe A.fbx`, fit: { x: 6 } },
  { key: 'toolbox', src: `${A}/Toolbox.fbx`, fit: { z: 0.55 } },
  { key: 'fuel_tank', src: `${A}/Fuel Tank.fbx`, fit: { y: 2.2 } },
  { key: 'ladder', src: `${A}/Ladder A.fbx`, fit: { y: 3 } },
  { key: 'cement_bag', src: `${A}/Cement Bag A.fbx`, fit: { x: 0.7 } },
  { key: 'radio', src: `${A}/Radio.fbx`, fit: { y: 0.3 } },
  { key: 'character_m', src: `${C}/Superhero_Male_FullBody.gltf`, character: true },
  { key: 'character_f', src: `${C}/Superhero_Female_FullBody.gltf`, character: true },
  { key: 'anims', src: U, anims: ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Idle_Talking_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Fixing_Kneeling', 'Interact', 'PickUp_Table', 'Push_Loop'] },
];

async function exportItem(page, item) {
  const b64 = await page.evaluate(async (item) => {
    const isFbx = item.src.toLowerCase().endsWith('.fbx');
    const [{ FBXLoader }, { GLTFLoader }, { GLTFExporter }] = await Promise.all([
      import('three/addons/loaders/FBXLoader.js'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/exporters/GLTFExporter.js')]);
    const url = '/src/' + item.src.split('/').map(encodeURIComponent).join('/');
    // Wait for every texture the model references, not just the model file itself.
    const manager = new THREE.LoadingManager();
    const done = new Promise((resolve) => { manager.onLoad = resolve; });
    const res = isFbx ? await new FBXLoader(manager).loadAsync(url) : await new GLTFLoader(manager).loadAsync(url);
    await Promise.race([done, new Promise((r) => setTimeout(r, 5000))]);
    // Drop any texture that still has no image so the exporter keeps the material colour instead of failing.
    (isFbx ? res : res.scene).traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'specularMap', 'emissiveMap', 'bumpMap', 'alphaMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
        if (m[k] && !(m[k].image && (m[k].image.width || m[k].image.data))) { console.warn('dropped', k, 'on', o.name); m[k] = null; }
      }
    });
    let root = isFbx ? res : res.scene;
    let animations = [];
    if (item.anims) {
      animations = res.animations.filter((a) => item.anims.includes(a.name));
      const meshes = []; root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) meshes.push(o); });
      meshes.forEach((m) => m.parent.remove(m));
    } else if (!item.character) {
      if (item.pick) {
        const picked = root.getObjectByName(item.pick);
        if (!picked) throw new Error('missing ' + item.pick + ' in ' + item.src);
        picked.parent.remove(picked); picked.position.set(0, 0, 0); root = picked;
      }
      // FBX phong → standard so the export keeps colour and reads well under PBR lighting.
      // Textured materials get a white base colour: the site pack ships a magenta diffuse that would tint the palette.
      root.traverse((o) => {
        if (!o.isMesh) return;
        const conv = (m) => new THREE.MeshStandardMaterial({ name: m.name, color: m.map ? new THREE.Color('#ffffff') : m.color, map: m.map || null, vertexColors: m.vertexColors, roughness: 0.8, metalness: 0.05, transparent: m.transparent, opacity: m.opacity });
        o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
        o.castShadow = o.receiveShadow = true;
      });
      const wrap = new THREE.Group(); wrap.name = item.key; wrap.add(root);
      wrap.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(wrap);
      const size = box.getSize(new THREE.Vector3());
      const [axis, target] = Object.entries(item.fit)[0];
      const s = target / size[axis];
      root.scale.multiplyScalar(s); wrap.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(wrap);
      const c = box.getCenter(new THREE.Vector3());
      root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
      root = wrap;
    }
    const glb = await new GLTFExporter().parseAsync(root, { binary: true, animations, onlyVisible: false });
    let s = ''; const bytes = new Uint8Array(glb); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, item);
  return Buffer.from(b64, 'base64');
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const { browser, page } = await openHarness(SRC);
const manifest = {};
for (const item of ITEMS) {
  const raw = path.join(TMP, item.key + '.glb');
  fs.writeFileSync(raw, await exportItem(page, item));
  const out = path.join(OUT, item.key + '.glb');
  const safe = item.character || item.anims ? ['--join', 'false', '--flatten', 'false', '--instance', 'false'] : [];
  execFileSync(path.join(ROOT, 'node_modules/.bin/gltf-transform'), ['optimize', raw, out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', item.character ? '1024' : '512', '--simplify', 'false', ...safe], { stdio: 'pipe' });
  manifest[item.key] = { file: item.key + '.glb', bytes: fs.statSync(out).size };
  console.log(item.key.padEnd(20), (manifest[item.key].bytes / 1024).toFixed(0).padStart(6), 'KB');
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const total = Object.values(manifest).reduce((n, m) => n + m.bytes, 0);
console.log('total', (total / 1024 / 1024).toFixed(2), 'MB');
