// Small building blocks shared by the site areas: materials, primitives, generated textures,
// placing models from the asset packs, and instancing repeated models.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }));
  return matCache.get(key);
}

function finish(mesh, parent, x, y, z) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export const box = (parent, w, h, d, material, x = 0, y = 0, z = 0) => finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), parent, x, y, z);
export const rbox = (parent, w, h, d, r, material, x = 0, y = 0, z = 0) => finish(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material), parent, x, y, z);
export const cyl = (parent, rt, rb, h, material, x = 0, y = 0, z = 0, seg = 16) => finish(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material), parent, x, y, z);

// ---- generated textures -------------------------------------------------------------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texture(c, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
// Seeded so the site looks the same on every visit.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Speckled ground (dirt, gravel, grass, asphalt): a base colour with layered noise and pebbles.
export function groundTexture({ base, dark, light, pebbles = 0, size = 512, repeat = 8, seed = 1 }) {
  const [c, g] = canvas(size, size); const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 6; i++) {
    g.fillStyle = r() < 0.5 ? dark : light; g.globalAlpha = 0.05 + r() * 0.12;
    const s = 2 + r() * 14; g.beginPath(); g.arc(r() * size, r() * size, s, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < pebbles; i++) {
    g.fillStyle = r() < 0.5 ? dark : light; g.globalAlpha = 0.5 + r() * 0.5;
    const s = 0.8 + r() * 2.2; g.beginPath(); g.ellipse(r() * size, r() * size, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  return texture(c, repeat);
}

// A sign face: bold mono text on a coloured board with a border.
export function signTexture(lines, { bg = '#008037', fg = '#ffffff', w = 512, h = 192, border = '#1A1A1A', sub } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = border; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const list = [].concat(lines);
  const size = Math.min(84, (h - 40) / (list.length + (sub ? 0.6 : 0)));
  g.font = `700 ${size}px "IBM Plex Mono", monospace`;
  list.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (list.length - 1) / 2) * size * 1.05 - (sub ? size * 0.3 : 0)));
  if (sub) { g.font = `600 ${size * 0.42}px "IBM Plex Sans", sans-serif`; g.fillText(sub, w / 2, h - 30); }
  const t = texture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Alternating stripes (awnings, hazard tape).
export function stripeTexture(a, b, stripes = 8, w = 256, h = 64) {
  const [c, g] = canvas(w, h);
  for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / stripes, 0, w / stripes, h); }
  const t = texture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Concrete block wall face.
export function blockTexture() {
  const [c, g] = canvas(256, 256); const r = rng(7);
  g.fillStyle = '#8f8b84'; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
    const x = col * 64 + (row % 2) * 32, y = row * 32;
    const v = 200 + Math.floor(r() * 25);
    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 2, y + 2, 60, 28);
  }
  return texture(c, 1);
}

// Corrugated metal deck / container siding.
export function ribbedTexture(base = '#9aa3ab', rib = '#7e868d', count = 16) {
  const [c, g] = canvas(256, 64);
  g.fillStyle = base; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < count; i++) { g.fillStyle = rib; g.fillRect((i * 256) / count, 0, 256 / count / 3, 64); }
  return texture(c, 1);
}

// ---- models -------------------------------------------------------------------------
// Place a static model from the packs. rot is around y.
export function placeModel(parent, assets, key, x, z, { rot = 0, y = 0, scale = 1 } = {}) {
  const gltf = assets.get(key);
  if (!gltf) return null;
  const obj = gltf.scene.clone(true);
  obj.position.set(x, y, z); obj.rotation.y = rot; obj.scale.multiplyScalar(scale);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  parent.add(obj);
  return obj;
}

// Many copies of one model as InstancedMeshes (one per sub-mesh). transforms: [{x, y, z, rot, scale}].
export function instanceModel(parent, assets, key, transforms) {
  const gltf = assets.get(key);
  if (!gltf || !transforms.length) return [];
  gltf.scene.updateMatrixWorld(true);
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return meshes.map((src) => {
    const inst = new THREE.InstancedMesh(src.geometry, src.material, transforms.length);
    transforms.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot || 0); s.setScalar(t.scale || 1); p.set(t.x, t.y || 0, t.z);
      m.compose(p, q, s).multiply(src.matrixWorld);
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    inst.computeBoundingSphere();
    parent.add(inst);
    return inst;
  });
}

// A flat ground patch (slightly above the one below it to avoid flicker).
// Textured patches tile every `tile` metres so long strips don't stretch the texture.
export function groundPatch(parent, w, d, material, x, z, y = 0.01, tile = 0) {
  if (tile && material.map) {
    material = material.clone(); material.map = material.map.clone();
    material.map.repeat.set(Math.max(1, w / tile), Math.max(1, d / tile)); material.map.needsUpdate = true;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// A signpost with a two-sided board.
export function signpost(parent, x, z, lines, { rot = 0, sub, w = 2.4, h = 0.9, post = 2.4, bg, fg } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const metal = mat('#5b6670', { metalness: 0.5, roughness: 0.4 });
  cyl(g, 0.06, 0.06, post, metal, -w / 2 + 0.15, post / 2, 0, 8);
  cyl(g, 0.06, 0.06, post, metal, w / 2 - 0.15, post / 2, 0, 8);
  const face = new THREE.MeshStandardMaterial({ map: signTexture(lines, { sub, bg, fg }), roughness: 0.6 });
  box(g, w, h, 0.08, [mat('#1A1A1A'), mat('#1A1A1A'), mat('#1A1A1A'), mat('#1A1A1A'), face, face], 0, post - h / 2 + 0.2, 0);
  return g;
}

export { rng };
