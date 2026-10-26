// Terrain, the street out front, the site fence and gate, haul roads, area pads and the trees and
// buildings around the site.
import * as THREE from 'three';
import { mat, box, cyl, groundTexture, groundPatch, signpost, instanceModel, rng } from './kit.js';
import { LEVELS } from '../levels.js';
import { AREAS } from '../content.js';

const area = (id) => AREAS.find((a) => a.id === id).rect;
const centre = ([a, b, c, d]) => [(a + b) / 2, (c + d) / 2];
const dims = ([a, b, c, d]) => [b - a, d - c];

export function buildGround(scene, assets) {
  const g = new THREE.Group(); g.name = 'ground'; scene.add(g);

  // Grass all around, dirt inside the fence.
  const grass = new THREE.MeshStandardMaterial({ map: groundTexture({ base: '#7fae5c', dark: '#5f8f45', light: '#9cc477', size: 512, repeat: 60, seed: 3 }), roughness: 1 });
  groundPatch(g, 700, 700, grass, 0, 0, 0);
  const dirt = new THREE.MeshStandardMaterial({ map: groundTexture({ base: '#c4ad84', dark: '#a48c63', light: '#d8c6a2', pebbles: 900, repeat: 18, seed: 5 }), roughness: 1 });
  groundPatch(g, 131, 79, dirt, 0, 0, 0.01);

  // Haul roads: compacted gravel joining the gate to every area.
  const gravel = new THREE.MeshStandardMaterial({ map: groundTexture({ base: '#a99d8b', dark: '#8a7f6f', light: '#c2b8a7', pebbles: 2400, repeat: 6, seed: 9 }), roughness: 1 });
  groundPatch(g, 5.5, 37, gravel, -1.5, 21, 0.02, 7);          // gate → spine
  groundPatch(g, 110, 5.5, gravel, 3, 3, 0.021, 7);            // spine east–west
  groundPatch(g, 5.5, 36, gravel, 57, -14.5, 0.022, 7);         // up the east side
  groundPatch(g, 5.5, 14, gravel, -40, 10, 0.023, 7);           // spine → office compound

  // Area pads.
  const pale = new THREE.MeshStandardMaterial({ map: groundTexture({ base: '#b9ae98', dark: '#9c917c', light: '#d1c7b3', pebbles: 1800, repeat: 5, seed: 11 }), roughness: 1 });
  groundPatch(g, ...dims(area('office')), pale, ...centre(area('office')), 0.03, 8);
  groundPatch(g, ...dims(area('laydown')), pale, ...centre(area('laydown')), 0.03, 8);
  const asphalt = new THREE.MeshStandardMaterial({ map: groundTexture({ base: '#5c5f62', dark: '#4a4d50', light: '#707377', pebbles: 1500, repeat: 6, seed: 13 }), roughness: 0.95 });
  groundPatch(g, ...dims(area('parking')), asphalt, ...centre(area('parking')), 0.03, 8);
  const paint = mat('#f2f2ee', { roughness: 0.7 });
  for (let x = 14; x <= 42; x += 3.2) { if (x > 26 && x < 36) continue; groundPatch(g, 0.12, 5.5, paint, x, 20, 0.04); }
  const slabTex = groundTexture({ base: '#b8b6b1', dark: '#a3a19c', light: '#cbc9c4', repeat: 10, seed: 15 });
  box(g, 48.5, 0.25, 28.5, new THREE.MeshStandardMaterial({ map: slabTex, roughness: 0.9 }), -35, 0.125, -18).castShadow = false;
  const earth = new THREE.MeshStandardMaterial({ map: groundTexture({ base: '#8d6e4c', dark: '#6f543a', light: '#a5845f', pebbles: 600, repeat: 4, seed: 17 }), roughness: 1 });
  groundPatch(g, 18, 11, earth, 30, -25, 0.03, 5);              // excavation pit floor

  // Street, sidewalks and kerbs along the front.
  groundPatch(g, 700, 7, asphalt, 0, 45.5, 0.02, 8);
  const walk = mat('#c9c6bf');
  box(g, 700, 0.15, 2.2, walk, 0, 0.075, 40.8).castShadow = false;
  box(g, 700, 0.15, 2.2, walk, 0, 0.075, 50.1).castShadow = false;
  for (let x = -340; x < 340; x += 9) groundPatch(g, 3.5, 0.18, paint, x, 45.5, 0.04);

  // Site fence (chain-link panels) with a gap at the gate.
  const panels = [];
  const run = (fixed, from, to, alongX) => {
    for (let v = from + 1.4; v <= to - 1.4 + 0.01; v += 2.8) {
      if (alongX && fixed > 0 && v > -7 && v < 4) continue;   // gate opening
      panels.push(alongX ? { x: v, z: fixed, rot: Math.PI / 2 } : { x: fixed, z: v, rot: 0 });
    }
  };
  run(39.6, -65.5, 65.5, true); run(-39.6, -65.5, 65.5, true); run(65.6, -39.5, 39.5, false); run(-65.6, -39.5, 39.5, false);
  instanceModel(g, assets, 'fence', panels);
  // Green privacy screen behind the street-side panels.
  const screen = new THREE.MeshStandardMaterial({ color: '#1f6b3a', roughness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (const [x1, x2] of [[-65.5, -7], [4, 65.5]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, 1.7), screen); s.position.set((x1 + x2) / 2, 1.05, 39.75); g.add(s);
  }

  // Gate: open sliding gate, posts, and the welcome board.
  const metal = mat('#5b6670', { metalness: 0.6, roughness: 0.35 });
  cyl(g, 0.12, 0.12, 2.6, metal, -7.2, 1.3, 39.6, 10); cyl(g, 0.12, 0.12, 2.6, metal, 4.2, 1.3, 39.6, 10);
  const gate = new THREE.Group(); gate.position.set(-12.2, 0, 40.1); g.add(gate);
  box(gate, 5, 0.08, 0.08, metal, 0, 2, 0); box(gate, 5, 0.08, 0.08, metal, 0, 0.3, 0);
  for (let i = 0; i < 9; i++) box(gate, 0.05, 1.7, 0.05, metal, -2.4 + i * 0.6, 1.15, 0);
  signpost(g, 7.5, 41.2, ['SITE WALK'], { sub: 'Hard hats beyond this point', w: 3.2, h: 1.3, post: 2.8 });
  signpost(g, -10, 41.2, ['WELCOME'], { sub: `${LEVELS.length} levels · talk to the crew · results at the site office`, w: 3.6, h: 1.3, post: 2.8, bg: '#ffffff', fg: '#1A1A1A' });

  // Level signs where the haul road meets each part of the site.
  const level = (n, place, opts) => signpost(g, ...opts.at, [`LEVEL ${n}`, place], { rot: opts.rot, sub: LEVELS[n - 1].title, w: 2.6, h: 1.2, post: 2.7, bg: opts.bg });
  level(1, 'SITE OFFICE', { at: [-38, 15], rot: 0.3 });
  level(2, 'MAIN BUILDING', { at: [-9, 1], rot: -0.4 });
  level(3, 'EXCAVATION', { at: [9, -2], rot: 0.4 });
  level(3, 'LAYDOWN YARD', { at: [53, 6], rot: -0.3 });
  level(4, 'FOOD TRUCK', { at: [12, 14.5], rot: 0.5, bg: '#E86A1C' });

  buildSurroundings(g);
  return g;
}

// Trees outside the fence and a row of buildings across the street, for a sense of place.
function buildSurroundings(g) {
  const r = rng(21);
  const trunks = [], crowns = [[], [], []];
  const addTree = (x, z) => { const s = 0.8 + r() * 0.7; trunks.push({ x, z, s }); crowns[Math.floor(r() * 3)].push({ x, z, s, rot: r() * 6 }); };
  for (let i = 0; i < 90; i++) {
    const side = i % 4, t = r();
    if (side === 0) addTree(-140 + t * 280, -46 - r() * 30);
    else if (side === 1) addTree(-72 - r() * 30, -40 + t * 78);
    else if (side === 2) addTree(72 + r() * 30, -40 + t * 78);
    else if (r() < 0.6) addTree(-140 + t * 280, 53 + r() * 3);   // street trees
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 3, 7); trunkGeo.translate(0, 1.5, 0);
  const trunk = new THREE.InstancedMesh(trunkGeo, mat('#76553a'), trunks.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  trunks.forEach((t, i) => trunk.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.s, t.s, t.s))));
  trunk.castShadow = true; g.add(trunk);
  const greens = ['#5b9a49', '#4c8a3e', '#6fae58'];
  crowns.forEach((list, k) => {
    if (!list.length) return;
    const geo = new THREE.IcosahedronGeometry(2.2, 1); geo.scale(1, 1.15, 1); geo.translate(0, 4.4, 0);
    const inst = new THREE.InstancedMesh(geo, mat(greens[k], { flatShading: true, roughness: 0.95 }), list.length);
    list.forEach((t, i) => inst.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, 0, t.z), q.setFromAxisAngle(up, t.rot), new THREE.Vector3(t.s, t.s, t.s))));
    inst.castShadow = true; g.add(inst);
  });

  // Across the street: low commercial buildings with windows, kept low and set back so the
  // follow camera never ends up inside one.
  const facade = (w, h, color) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) { x.fillStyle = '#7aa7bf'; x.fillRect(20 + col * 60, 22 + row * 60, 38, 34); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(20 + col * 60, 22 + row * 60, 38, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 8)));
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  };
  const roof = mat('#6d6a66');
  let x = -150;
  while (x < 150) {
    const w = 14 + r() * 12, h = 5 + r() * 6, d = 12 + r() * 6, col = ['#d9cdb8', '#c7b8a2', '#e2ddd3', '#b7a58f'][Math.floor(r() * 4)];
    const f = facade(w, h, col);
    box(g, w, h, d, [f, f, roof, roof, f, f], x + w / 2, h / 2, 64 + d / 2);
    x += w + 3 + r() * 6;
  }
}
