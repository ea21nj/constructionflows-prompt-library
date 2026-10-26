// The ten crew on site: each walks a short route, stops to do their job, and turns to face the
// visitor when spoken to. A Sims-style marker floats over each one.
import * as THREE from 'three';
import { createCharacter } from './characters.js';

const ACTIVITY_CLIPS = {
  plans: 'Interact', laptop: 'Interact', drawings: 'Interact', board: 'Idle_Talking_Loop', clipboard: 'Idle_Loop',
  photo: 'Fixing_Kneeling', log: 'Fixing_Kneeling', delivery: 'PickUp_Table', chat: 'Idle_Talking_Loop', sit: 'Sitting_Idle_Loop',
};
const CLIP_TO_ACTION = { Interact: 'work', Idle_Talking_Loop: 'talk', Idle_Loop: 'idle', Fixing_Kneeling: 'kneel', PickUp_Table: 'lift', Sitting_Idle_Loop: 'sit' };
export const activityClip = (activity) => ACTIVITY_CLIPS[activity] || 'Idle_Loop';

// Move toward route[index]; on arrival snap to it and advance (wrapping). Pure, for testing.
export function stepRoute(pos, route, index, speed, dt) {
  const [tx, tz] = route[index];
  const dx = tx - pos.x, dz = tz - pos.z, dist = Math.hypot(dx, dz);
  const step = speed * dt;
  if (dist <= Math.max(0.2, step)) return { pos: { x: tx, z: tz }, index: (index + 1) % route.length, arrived: true };
  return { pos: { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step }, index, arrived: false };
}

const turnTo = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

const LOOKS = {
  1: { body: 'f', outfit: { vest: '#F26A1B', shirt: '#2f6f8f', pants: '#3b4a5c' } },
  8: { body: 'f', outfit: { vest: '#C6F432', shirt: '#6a7f99', pants: '#2b2b2b' } },
  9: { body: 'f', outfit: { vest: '#C6F432', shirt: '#2e3d57', pants: '#4a3b2a', helmet: '#008037' } },
  3: { body: 'm', outfit: { vest: '#F26A1B', shirt: '#3f5f86', pants: '#6b5a42', helmet: '#ffffff' } },
  4: { body: 'f', outfit: { vest: '#F26A1B', shirt: '#8a4b6b', pants: '#2e3d57', helmet: '#1F5FAD' } },
  6: { body: 'm', outfit: { vest: '#C6F432', shirt: '#555555', pants: '#2e3d57', helmet: '#f2c230' } },
  5: { body: 'm', outfit: { vest: '#F26A1B', shirt: '#2e3d57', pants: '#5a4a35', helmet: '#008037' } },
  7: { body: 'm', outfit: { vest: '#C6F432', shirt: '#7a2e2e', pants: '#2e3d57', helmet: '#f2c230' } },
  2: { body: 'f', outfit: { vest: '#F26A1B', shirt: '#1F5FAD', pants: '#2b2b2b', helmet: '#ffffff' } },
  10: { body: 'm', outfit: { vest: '#C6F432', shirt: '#4a5a3a', pants: '#3b3b3b', helmet: '#ffffff' } },
};

export function createCrew(scene, assets, crew, { reducedMotion = false } = {}) {
  const members = crew.map((c) => {
    const look = LOOKS[c.agentId] || { body: 'm' };
    const character = createCharacter(assets, look);
    character.root.position.set(c.spot[0], 0, c.spot[1]);
    scene.add(character.root);
    const plumbobMat = new THREE.MeshStandardMaterial({ color: '#2BD46A', emissive: '#0b8a3a', emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.95 });
    const plumbob = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), plumbobMat);
    plumbob.scale.y = 1.7;
    plumbob.userData.agentId = c.agentId;   // the marker itself is clickable too
    scene.add(plumbob);
    // Generous invisible click target for tapping a worker.
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.1; hit.userData.agentId = c.agentId; character.root.add(hit);
    const sitting = c.activity === 'sit';
    return {
      agentId: c.agentId, data: c, character, plumbob, hit, sitting,
      pos: { x: c.spot[0], z: c.spot[1] }, index: 1 % c.route.length, pause: Math.random() * 2, met: false, highlight: false,
      phase: Math.random() * 6,
      setMet(v) { this.met = v; plumbobMat.color.set(v ? '#9fe7bb' : '#2BD46A'); plumbobMat.emissiveIntensity = v ? 0.25 : 0.7; },
      setHighlight(v) { this.highlight = v; },
    };
  });

  function update(dt, t, playerPos, talkingId) {
    for (const m of members) {
      const root = m.character.root;
      if (m.agentId === talkingId) {
        // Stop, face the visitor and talk.
        if (playerPos) root.rotation.y = turnTo(root.rotation.y, Math.atan2(playerPos.x - m.pos.x, playerPos.z - m.pos.z), 0.15);
        m.character.play(m.sitting ? 'sitTalk' : 'talk');
      } else if (m.sitting) {
        root.rotation.y = turnTo(root.rotation.y, 0, 0.1);          // facing the picnic table
        m.character.play('sit');
      } else if (m.pause > 0) {
        m.pause -= dt;
        m.character.play(CLIP_TO_ACTION[activityClip(m.data.activity)] || 'idle');
      } else {
        const r = stepRoute(m.pos, m.data.route, m.index, 1.4, dt);
        const dx = r.pos.x - m.pos.x, dz = r.pos.z - m.pos.z;
        if (dx || dz) root.rotation.y = turnTo(root.rotation.y, Math.atan2(dx, dz), 0.18);
        m.pos = r.pos; m.index = r.index;
        if (r.arrived) m.pause = 2 + Math.random() * 2;
        m.character.play('walk');
      }
      root.position.set(m.pos.x, 0, m.pos.z);
      m.character.update(dt);
      const s = m.highlight ? 1.25 : 1;
      m.plumbob.scale.set(s, 1.7 * s, s);
      m.plumbob.position.set(m.pos.x, (m.sitting ? 2.3 : 2.75) + (reducedMotion ? 0 : Math.sin(t * 2 + m.phase) * 0.08), m.pos.z);
      if (!reducedMotion) m.plumbob.rotation.y = t * 1.6;
    }
  }

  return { members, update, byId: (id) => members.find((m) => m.agentId === id) };
}
