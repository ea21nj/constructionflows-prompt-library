// Loads the site's models (meshopt-compressed GLBs listed in public/assets/site/manifest.json).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const BASE = '/assets/site/';

export async function loadManifest() {
  const res = await fetch(BASE + 'manifest.json');
  if (!res.ok) throw new Error('Site assets are missing');
  return res.json();
}

export async function loadAssets(manifest, onProgress = () => {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const entries = Object.entries(manifest);
  const total = entries.reduce((n, [, m]) => n + m.bytes, 0) || 1;
  let done = 0;
  const assets = new Map();
  await Promise.all(entries.map(async ([key, m]) => {
    const gltf = await loader.loadAsync(BASE + m.file);
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    assets.set(key, gltf);
    done += m.bytes;
    onProgress(done / total);
  }));
  return assets;
}

// A fresh copy of a static model, ready to place.
export function place(assets, key) {
  const gltf = assets.get(key);
  if (!gltf) throw new Error('Unknown model ' + key);
  return gltf.scene.clone(true);
}
