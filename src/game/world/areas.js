// The five work areas. Solid things come from layout.js (so collision matches); this file gives
// them their look and adds the walk-through dressing around them.
import * as THREE from 'three';
import { mat, box, rbox, cyl, placeModel, instanceModel, signTexture, stripeTexture, blockTexture, ribbedTexture, rng } from './kit.js';
import { PLACEMENTS, COLUMN_X, COLUMN_Z, CRANE } from '../layout.js';

const Q = Math.PI / 2;
const byId = Object.fromEntries(PLACEMENTS.map((p) => [p.id, p]));
const STEEL = () => mat('#3a4652', { metalness: 0.55, roughness: 0.45 });
const YELLOW = () => mat('#e9b51f', { metalness: 0.2, roughness: 0.5 });

// Every placement backed by a pack model goes in as that model.
export function placeModels(g, assets) {
  for (const p of PLACEMENTS) if (p.model) placeModel(g, assets, p.model, p.at[0], p.at[1], { rot: p.rot });
}

// ---- Site office compound -----------------------------------------------------------
export function buildOffice(g, assets) {
  const o = byId.office;
  // Sign above the office door side (east face, toward the haul road).
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshStandardMaterial({ map: signTexture(['SITE OFFICE'], { sub: 'Your results are inside' }), roughness: 0.6 }));
  sign.position.set(o.at[0] + 5.8, 4.4, o.at[1]); sign.rotation.y = Q; g.add(sign);
  // Steps and landing at the door.
  const steel = mat('#7a838b', { metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 3; i++) box(g, 0.7 - i * 0.2, 0.18, 1.6, steel, o.at[0] + 6.25 - i * 0.2, 0.09 + i * 0.18, 27);
  box(g, 0.05, 0.9, 1.6, steel, o.at[0] + 6.55, 0.9, 27.8);

  // Door and the glow/marker that appear once the office opens.
  const door = box(g, 0.08, 2.1, 1.1, mat('#2f3a44', { metalness: 0.3, roughness: 0.4 }), o.at[0] + 5.8, 1.35, 27);
  door.name = 'officeDoor';
  const glowMat = new THREE.MeshBasicMaterial({ color: '#2BD46A', transparent: true, opacity: 0.6 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), glowMat); glow.position.set(o.at[0] + 5.86, 1.35, 27); glow.rotation.y = Q; g.add(glow);
  const marker = new THREE.Group(); marker.position.set(o.at[0] + 7.6, 0, 27); g.add(marker);
  const arrowMat = new THREE.MeshStandardMaterial({ color: '#2BD46A', emissive: '#0b8a3a', emissiveIntensity: 0.8, roughness: 0.3 });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), arrowMat); arrow.rotation.x = Math.PI; arrow.position.y = 4.2; marker.add(arrow);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), arrowMat); stem.position.y = 5.1; marker.add(stem);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 40), new THREE.MeshBasicMaterial({ color: '#2BD46A', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  ring.rotation.x = -Q; ring.position.y = 0.06; marker.add(ring);
  marker.visible = false; glow.visible = false;

  // Safety tent with the toolbox-talk board.
  const t = byId.safety_tent;
  const tent = new THREE.Group(); tent.position.set(t.at[0], 0, t.at[1]); g.add(tent);
  for (const [x, z] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) cyl(tent, 0.05, 0.05, 2.4, steel, x, 1.2, z, 8);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.1, 4, 1), mat('#f4f4f0', { side: THREE.DoubleSide }));
  canopy.rotation.y = Math.PI / 4; canopy.scale.set(1, 1, 0.75); canopy.position.y = 2.95; canopy.castShadow = true; tent.add(canopy);
  const valance = stripeTexture('#008037', '#ffffff', 10);
  box(tent, 4, 0.25, 3, [new THREE.MeshStandardMaterial({ map: valance }), new THREE.MeshStandardMaterial({ map: valance }), mat('#008037'), mat('#008037'), new THREE.MeshStandardMaterial({ map: valance }), new THREE.MeshStandardMaterial({ map: valance })], 0, 2.35, 0);
  box(tent, 2.4, 0.06, 0.9, mat('#d9d4cb'), 0, 0.8, -0.6); for (const x of [-1, 1]) box(tent, 0.06, 0.8, 0.8, steel, x, 0.4, -0.6);
  const board = new THREE.Group(); board.position.set(t.at[0] + 2.6, 0, t.at[1] - 2.2); board.rotation.y = -0.5; g.add(board);
  box(board, 1.4, 1, 0.06, [mat('#1A1A1A'), mat('#1A1A1A'), mat('#1A1A1A'), mat('#1A1A1A'), new THREE.MeshStandardMaterial({ map: signTexture(['TOOLBOX', 'TALK'], { bg: '#ffffff', fg: '#1A1A1A', sub: 'Today: ladder safety' }) }), mat('#1A1A1A')], 0, 1.4, 0);
  for (const x of [-0.6, 0.6]) box(board, 0.06, 1.9, 0.06, mat('#8b6a43'), x, 0.95, 0.05);

  // Estimator's plan table with drawings and a coffee cup.
  const p = byId.plan_table;
  const table = new THREE.Group(); table.position.set(p.at[0], 0, p.at[1]); g.add(table);
  box(table, 1.2, 0.08, 2.2, mat('#9c7a4e'), 0, 0.95, 0);
  for (const [x, z] of [[-0.5, -1], [0.5, -1], [-0.5, 1], [0.5, 1]]) box(table, 0.07, 0.95, 0.07, steel, x, 0.47, z);
  const plans = document.createElement('canvas'); plans.width = 256; plans.height = 384; const c = plans.getContext('2d');
  c.fillStyle = '#e8eef5'; c.fillRect(0, 0, 256, 384); c.strokeStyle = '#2f5d8a'; c.lineWidth = 3;
  for (let i = 0; i < 9; i++) { c.strokeRect(20 + (i % 3) * 72, 30 + Math.floor(i / 3) * 100, 60, 80); }
  c.beginPath(); c.moveTo(20, 340); c.lineTo(236, 340); c.stroke();
  const planTex = new THREE.CanvasTexture(plans); planTex.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshStandardMaterial({ map: planTex, roughness: 0.9 }));
  sheet.rotation.x = -Q; sheet.rotation.z = 0.1; sheet.position.y = 1.0; table.add(sheet);
  cyl(table, 0.045, 0.04, 0.11, mat('#ffffff'), 0.35, 1.05, 0.8, 12);

  // Dressing: cones, barriers, a work light and a radio by the office.
  instanceModel(g, assets, 'cone', [[-36, 16], [-34, 16.5], [-25, 22], [-25, 25]].map(([x, z]) => ({ x, z })));
  placeModel(g, assets, 'barrier', -26.5, 17.5, { rot: 0.4 });
  placeModel(g, assets, 'work_light', -38.4, 31.4, { rot: -2.2 });
  placeModel(g, assets, 'toolbox', -31.2, 33.8);
  placeModel(g, assets, 'radio', -32.6, 30.95, { y: 0.83 });

  return {
    door, marker, glow,
    setOpen(open) { marker.visible = open; glow.visible = open; },
    update(t) { if (!marker.visible) return; arrow.position.y = 4.2 + Math.sin(t * 3) * 0.25; stem.position.y = arrow.position.y + 0.9; ring.material.opacity = 0.45 + Math.sin(t * 4) * 0.25; glowMat.opacity = 0.45 + Math.sin(t * 3) * 0.2; },
  };
}

// ---- Main building: steel frame going up --------------------------------------------
function iBeam(parent, length, depth, axis, x, y, z) {
  const s = STEEL(), flange = depth * 0.55, t = depth * 0.12;
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const along = (w, h, d) => (axis === 'x' ? [length, h, w] : axis === 'z' ? [w, h, length] : [w, length, d]);
  if (axis === 'y') { box(g, depth, length, t, s); box(g, t, length, depth * 0.55, s, -depth / 2, 0, 0); box(g, t, length, depth * 0.55, s, depth / 2, 0, 0); return g; }
  box(g, ...along(t, depth, 0), s);
  box(g, ...along(flange, t, 0), s, 0, depth / 2, 0);
  box(g, ...along(flange, t, 0), s, 0, -depth / 2, 0);
  return g;
}

export function buildBuilding(g, assets) {
  const levels = [4.4, 8.6, 12.6];
  const [x0, x1] = [COLUMN_X[0], COLUMN_X.at(-1)], [z0, z1] = [COLUMN_Z[0], COLUMN_Z.at(-1)];
  for (const x of COLUMN_X) for (const z of COLUMN_Z) {
    iBeam(g, 12.6, 0.45, 'y', x, 0.25 + 6.3, z);
    box(g, 0.7, 0.05, 0.7, STEEL(), x, 0.28, z);                       // base plate
  }
  for (const y of levels) {
    for (const z of COLUMN_Z) iBeam(g, x1 - x0, 0.5, 'x', (x0 + x1) / 2, y, z);
    for (const x of COLUMN_X) iBeam(g, z1 - z0, 0.42, 'z', x, y - 0.04, (z0 + z1) / 2);
  }
  // Metal decks: full second floor, half third floor.
  const deckTex = ribbedTexture('#a9b1b8', '#8d959c', 24); deckTex.repeat.set(10, 1);
  const deck = new THREE.MeshStandardMaterial({ map: deckTex, metalness: 0.4, roughness: 0.5 });
  // Decks only over the west bay: the crew work further east and must stay visible from above.
  const bay = COLUMN_X[1] - x0;
  box(g, bay + 0.6, 0.18, z1 - z0 + 0.6, deck, x0 + bay / 2, levels[0] + 0.34, (z0 + z1) / 2);
  box(g, bay + 0.6, 0.18, (z1 - z0) / 2, deck, x0 + bay / 2, levels[1] + 0.34, z0 + (z1 - z0) / 4);
  // Cross bracing in the west bays.
  const brace = STEEL();
  for (const y of [0.25, levels[0]]) for (const z of [COLUMN_Z[0], COLUMN_Z[1]]) {
    const len = Math.hypot(8, 4.2), b = box(g, 0.08, len, 0.08, brace, x0, y + 2.1, z + 4); b.rotation.x = Math.atan2(8, 4.2);
  }
  // Block walls going up (solid in layout.js).
  const blocks = new THREE.MeshStandardMaterial({ map: blockTexture(), roughness: 0.95 });
  for (const id of ['wall_north', 'wall_west']) {
    const w = byId[id]; const quarter = w.rot !== 0;
    const len = w.size[0];
    for (let step = 0; step < 4; step++) {
      const l = len - step * 3, h = 0.8;
      const mesh = box(g, quarter ? 0.4 : l, h, quarter ? l : 0.4, blocks, w.at[0], 0.25 + h / 2 + step * h, w.at[1]);
      mesh.material.map.repeat.set(l / 2, 1);
    }
  }
  // Steel waiting to be lifted.
  const s = byId.steel_stack;
  instanceModel(g, assets, 'steel_beam', [0, 1, 2, 3, 4, 5].map((i) => ({ x: s.at[0], z: s.at[1] - 0.5 + (i % 3) * 0.45, y: 0.3 + Math.floor(i / 3) * 0.42 })));
  for (const dx of [-2.6, 0, 2.6]) box(g, 0.25, 0.25, 1.6, mat('#7a5634'), s.at[0] + dx, 0.12, s.at[1]);

  // Tower crane (static model) with a hook and load that swing.
  const crane = placeModel(g, assets, 'crane', CRANE.at[0] - CRANE.modelOffset[0], CRANE.at[1] - CRANE.modelOffset[1]);
  box(g, CRANE.base + 0.6, 1, CRANE.base + 0.6, mat('#a3a19c'), CRANE.at[0], 0.5, CRANE.at[1]);   // concrete pad
  const tip = craneTip(crane, CRANE.at);
  const hook = new THREE.Group(); hook.position.copy(tip); g.add(hook);
  const cable = cyl(hook, 0.025, 0.025, 1, mat('#222'), 0, 0, 0, 5);
  const load = new THREE.Group(); hook.add(load);
  box(load, 0.3, 0.4, 0.3, YELLOW(), 0, 0.3, 0);
  iBeam(load, 6, 0.4, 'x', 0, -0.4, 0); iBeam(load, 6, 0.4, 'x', 0, -0.4, 0.5);

  // Dressing: mixer, wheelbarrows, ladders, cement bags, work lights, cones along the front.
  placeModel(g, assets, 'cement_mixer', -21, -4.6, { rot: 0.6 });
  placeModel(g, assets, 'wheelbarrow', -27, -11.2, { rot: 1.2 });
  placeModel(g, assets, 'wheelbarrow', -50, -26, { rot: -0.4 });
  placeModel(g, assets, 'ladder', -35.4, -14.6, { rot: Q, y: 0.25 });
  instanceModel(g, assets, 'cement_bag', [0, 1, 2, 3, 4].map((i) => ({ x: -19.5 + (i % 3) * 0.75, z: -6.3, y: 0.25 + Math.floor(i / 3) * 0.2, rot: 0.1 * i })));
  placeModel(g, assets, 'work_light', -12, -30, { rot: 2.4 });
  placeModel(g, assets, 'work_light', -58, -5, { rot: -0.8 });
  instanceModel(g, assets, 'cone', [-58, -50, -42, -34, -26, -18, -12].map((x) => ({ x, z: 0.3 })));

  return {
    update(t) {
      const drop = 14 + Math.sin(t * 0.22) * 6;
      cable.scale.y = drop; cable.position.y = -drop / 2;
      load.position.y = -drop; load.rotation.y = t * 0.15;
      hook.rotation.z = Math.sin(t * 0.6) * 0.03; hook.rotation.x = Math.cos(t * 0.5) * 0.03;
    },
  };
}

// Highest point farthest from the mast = the end of the jib, where the hook hangs.
function craneTip(crane, mast) {
  crane.updateMatrixWorld(true);
  const v = new THREE.Vector3(), best = new THREE.Vector3(mast[0], 26, mast[1]); let bestD = 0;
  crane.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (v.y < 24) continue;
      const d = Math.hypot(v.x - mast[0], v.z - mast[1]);
      if (d > bestD) { bestD = d; best.copy(v); }
    }
  });
  best.lerp(new THREE.Vector3(mast[0], best.y, mast[1]), 0.15);   // a little in from the very end
  best.y -= 1;
  return best;
}

// ---- Excavation ---------------------------------------------------------------------
export function buildExcavation(g, assets) {
  const r = rng(31);
  // Spoil pile and a few smaller heaps, low-poly earth.
  const earth = mat('#8d6e4c', { flatShading: true, roughness: 1 });
  const s = byId.spoil_pile;
  const pile = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.6, 9, 2), earth);
  pile.position.set(s.at[0], 1.3, s.at[1]); pile.scale.set(1, 1, 0.85); pile.castShadow = pile.receiveShadow = true; g.add(pile);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + r() * 0.8, 0), earth);
    m.position.set(22 + r() * 16, 0.2, -31 + r() * 2.5); m.scale.y = 0.5; m.castShadow = m.receiveShadow = true; g.add(m);
  }
  // Pit edge: barriers and tape around the dig.
  const barrierAt = [];
  for (let x = 21.5; x <= 38.5; x += 2.4) barrierAt.push({ x, z: -19.2, rot: Q });
  instanceModel(g, assets, 'barrier', barrierAt);
  placeModel(g, assets, 'work_light', 20, -18.5, { rot: 0.7 });
  placeModel(g, assets, 'fuel_tank', 46.5, -29, { rot: 0 });

  // Excavator (procedural, articulated): tracks, turning upper body, boom, stick, bucket.
  const e = byId.excavator;
  const ex = new THREE.Group(); ex.position.set(e.at[0], 0, e.at[1]); ex.rotation.y = Math.PI; g.add(ex);
  const dark = mat('#2c2c2c', { roughness: 0.8 }), yellow = YELLOW(), glass = mat('#9cc9df', { metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.75 });
  for (const z of [-1.25, 1.25]) {
    rbox(ex, 4.4, 0.85, 0.75, 0.3, dark, 0, 0.45, z);
    for (let i = 0; i < 5; i++) cyl(ex, 0.28, 0.28, 0.8, mat('#555'), -1.6 + i * 0.8, 0.42, z, 12).rotation.x = Q;
  }
  box(ex, 1.6, 0.4, 2, dark, 0, 1, 0);
  const upper = new THREE.Group(); upper.position.y = 1.2; ex.add(upper);
  rbox(upper, 3.2, 1.1, 2.4, 0.15, yellow, -0.4, 0.55, 0);
  rbox(upper, 1.2, 1.3, 1.1, 0.12, yellow, 0.5, 1.7, -0.55);
  box(upper, 1.0, 0.9, 0.06, glass, 0.55, 1.8, -0.02);
  box(upper, 0.06, 0.9, 0.9, glass, 1.11, 1.8, -0.55);
  rbox(upper, 0.8, 1.1, 2.3, 0.1, mat('#3b3b3b'), -2.0, 0.6, 0);         // counterweight
  cyl(upper, 0.07, 0.07, 0.6, dark, -1.2, 1.4, 0.7, 8);                    // exhaust
  const boom = new THREE.Group(); boom.position.set(1.0, 0.8, 0.55); upper.add(boom);
  rbox(boom, 4.2, 0.55, 0.5, 0.12, yellow, 2.1, 0, 0); boom.rotation.z = 0.6;
  const stick = new THREE.Group(); stick.position.set(4.2, 0, 0); boom.add(stick);
  rbox(stick, 3, 0.42, 0.4, 0.1, yellow, 1.5, 0, 0); stick.rotation.z = -1.6;
  const bucket = new THREE.Group(); bucket.position.set(3, 0, 0); stick.add(bucket);
  box(bucket, 0.9, 0.7, 1.0, dark, 0.3, -0.25, 0);
  for (let i = 0; i < 4; i++) box(bucket, 0.08, 0.2, 0.08, mat('#888'), 0.7, -0.65, -0.35 + i * 0.23);
  cyl(boom, 0.09, 0.09, 2.6, mat('#bbbbbb', { metalness: 0.8, roughness: 0.2 }), 1.2, -0.4, 0, 8).rotation.z = Q + 0.3;   // ram

  return {
    update(t) {
      const cycle = (t % 9) / 9;                      // dig, lift, swing to pile, dump, swing back
      const swing = cycle < 0.35 ? 0 : cycle < 0.55 ? (cycle - 0.35) / 0.2 : cycle < 0.75 ? 1 : 1 - (cycle - 0.75) / 0.25;
      upper.rotation.y = -swing * 1.6;
      const dig = cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
      boom.rotation.z = 0.6 - dig * 0.45 + swing * 0.15;
      stick.rotation.z = -1.6 + dig * 0.6;
      bucket.rotation.z = cycle > 0.55 && cycle < 0.75 ? -1.2 * Math.sin(((cycle - 0.55) / 0.2) * Math.PI) : dig * 0.8;
    },
  };
}

// ---- Laydown yard -------------------------------------------------------------------
export function buildLaydown(g, assets) {
  const blockTex = blockTexture(); blockTex.repeat.set(2, 2);
  const blocks = new THREE.MeshStandardMaterial({ map: blockTex, roughness: 0.95 });
  for (const id of ['block_row_1', 'block_row_2']) {
    const row = byId[id];
    const pallets = [];
    for (let i = 0; i < 9; i++) {
      const x = row.at[0] - 5.4 + i * 1.35;
      pallets.push({ x, z: row.at[1] });
      const h = 0.6 + ((i * 7) % 3) * 0.2;
      const stack = box(g, 1.1, h, 1.1, blocks, x, 0.2 + h / 2, row.at[1]);
      stack.rotation.y = (i % 2) * 0.04;
    }
    instanceModel(g, assets, 'pallet', pallets);
  }
  const p = byId.pipe_stack, pipes = [];
  [4, 3, 2].forEach((n, layer) => { for (let i = 0; i < n; i++) pipes.push({ x: p.at[0], z: p.at[1] - (n - 1) * 0.17 + i * 0.34, y: 0.17 + layer * 0.3 }); });
  instanceModel(g, assets, 'pipe', pipes);
  for (const dx of [-2.6, 0, 2.6]) box(g, 0.2, 0.15, 1.5, mat('#7a5634'), p.at[0] + dx, 0.07, p.at[1]);
  placeModel(g, assets, 'planks', 50, 24, { rot: Q });
  placeModel(g, assets, 'planks_yellow', 50.5, 27, { rot: Q });
  placeModel(g, assets, 'box_stack', 59.5, 22.5, { rot: 0.3 });
  placeModel(g, assets, 'barrel', 58.6, 20.6); placeModel(g, assets, 'barrel', 59.6, 20.9);
  placeModel(g, assets, 'clipboard', 54.7, 21.2, { y: 0.02, rot: 0.4 });
}

// ---- Parking + food truck -----------------------------------------------------------
export function buildParking(g, assets) {
  // Food truck: a step van with a serving hatch and striped awning facing the site.
  const f = byId.food_truck;
  const truck = new THREE.Group(); truck.position.set(f.at[0], 0, f.at[1]); g.add(truck);
  const white = mat('#f4f2ec', { roughness: 0.5 }), green = mat('#008037', { roughness: 0.5 }), dark = mat('#222');
  rbox(truck, 5.6, 2.5, 2.7, 0.2, white, 0, 1.75, 0);
  box(truck, 5.62, 0.35, 2.72, green, 0, 0.9, 0);
  rbox(truck, 1.4, 1.6, 2.5, 0.2, white, 3.2, 1.3, 0);                           // cab
  box(truck, 0.06, 0.7, 2.1, mat('#9cc9df', { metalness: 0.3, roughness: 0.15 }), 3.92, 1.7, 0);
  for (const [x, z] of [[2.6, 1.3], [2.6, -1.3], [-1.8, 1.3], [-1.8, -1.3]]) cyl(truck, 0.48, 0.48, 0.35, dark, x, 0.48, z, 16).rotation.x = Q;
  box(truck, 3, 1.1, 0.06, mat('#3b2a1e'), -0.4, 2.05, -1.36);                     // serving hatch (site side)
  box(truck, 3.2, 0.1, 0.6, mat('#c9c6bf', { metalness: 0.5, roughness: 0.3 }), -0.4, 1.45, -1.62);   // counter
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), new THREE.MeshStandardMaterial({ map: stripeTexture('#E86A1C', '#ffffff', 12), side: THREE.DoubleSide }));
  awning.position.set(-0.4, 2.85, -1.95); awning.rotation.x = -1.0; awning.castShadow = true; truck.add(awning);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.7), new THREE.MeshStandardMaterial({ map: signTexture(['JOBSITE TACOS'], { bg: '#E86A1C', h: 128 }) }));
  sign.position.set(-0.4, 3.05, -1.37); sign.rotation.y = Math.PI; truck.add(sign);
  cyl(truck, 0.25, 0.25, 0.9, mat('#d9d9d9', { metalness: 0.6, roughness: 0.3 }), -2.95, 0.95, 0.8, 12);    // propane
  const livery = new THREE.MeshStandardMaterial({ map: signTexture(['JOBSITE TACOS'], { bg: '#f4f2ec', fg: '#008037', border: '#008037', sub: 'Breakfast · lunch · coffee', h: 160 }), roughness: 0.5 });
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), livery); side.position.set(-0.3, 2.0, 1.37); truck.add(side);
  for (const z of [-1.37, 1.37]) box(truck, 0.06, 0.6, 0.9, mat('#9cc9df', { metalness: 0.3, roughness: 0.15 }), 3.6, 1.75, z * 0.98).rotation.y = Q;
  rbox(truck, 1.1, 0.35, 0.9, 0.1, mat('#c9c6bf', { metalness: 0.5, roughness: 0.3 }), -1.2, 3.15, 0);        // roof vent
  // Menu board and string lights.
  const menu = new THREE.Group(); menu.position.set(f.at[0] + 2.2, 0, f.at[1] - 2.4); menu.rotation.y = 0.3; g.add(menu);
  box(menu, 0.9, 1.2, 0.05, [dark, dark, dark, dark, new THREE.MeshStandardMaterial({ map: signTexture(['MENU', 'TACOS', 'BURRITOS', 'COFFEE'], { bg: '#1A1A1A', h: 256, w: 192 }) }), dark], 0, 0.9, 0);
  const bulbs = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf66', emissiveIntensity: 1.2 });
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), bulbs); b.position.set(f.at[0] - 2 + i * 0.45, 3.0 - Math.sin((i / 8) * Math.PI) * 0.25, f.at[1] - 2.55); g.add(b); }

  // Picnic tables with umbrellas.
  for (const id of ['picnic_1', 'picnic_2', 'picnic_3']) {
    const p = byId[id];
    const t = new THREE.Group(); t.position.set(p.at[0], 0, p.at[1]); g.add(t);
    const wood = mat('#9c7a4e');
    box(t, 1.8, 0.07, 0.8, wood, 0, 0.75, 0);
    for (const z of [-0.65, 0.65]) box(t, 1.8, 0.06, 0.3, wood, 0, 0.45, z);
    for (const x of [-0.7, 0.7]) { const l = box(t, 0.07, 1.0, 0.07, wood, x, 0.4, 0); l.rotation.x = 0.0; }
    cyl(t, 0.03, 0.03, 2.2, mat('#d9d9d9'), 0, 1.4, 0, 6);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.45, 8, 1, true), new THREE.MeshStandardMaterial({ map: stripeTexture('#008037', '#ffffff', 8), side: THREE.DoubleSide }));
    shade.position.y = 2.45; shade.castShadow = true; t.add(shade);
  }
  instanceModel(g, assets, 'cone', [[13, 16.8], [16, 16.8], [36, 16.8], [40, 16.8]].map(([x, z]) => ({ x, z })));
}
