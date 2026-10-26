// You: a worker in a green vest walked with the keyboard or joystick. Movement is relative to the
// camera, slides along walls, and the camera follows while keeping whatever angle you've dragged to.
import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { moveWithSlide } from './collision.js';
import { SPAWN } from './content.js';

const WALK = 4.5, RUN = 8.5;
const turnTo = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

export function createPlayer(scene, assets, engine, input, { reducedMotion = false } = {}) {
  const character = createCharacter(assets, { body: 'm', outfit: { vest: '#2BD46A', shirt: '#1A1A1A', pants: '#3b4a5c', helmet: '#008037' } });
  const root = character.root;
  scene.add(root);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 40), new THREE.MeshBasicMaterial({ color: '#2BD46A', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; scene.add(ring);

  const pos = { x: SPAWN[0], z: SPAWN[1] };
  root.rotation.y = Math.PI;                          // facing into the site
  let target = null, stuck = 0, moving = false;
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), lastTarget = new THREE.Vector3();
  const { camera, controls } = engine;

  function follow(snap) {
    lastTarget.copy(controls.target);
    controls.target.lerp(new THREE.Vector3(pos.x, 1.4, pos.z), snap || reducedMotion ? 1 : 0.12);
    camera.position.add(controls.target.clone().sub(lastTarget));
    engine.setShadowCenter(pos.x, pos.z);
  }

  function update(dt, t, canMove) {
    const axis = canMove ? input.axis() : { x: 0, y: 0 };
    let mx = 0, mz = 0;
    if (axis.x || axis.y) {
      target = null;                                  // the player took over from auto-walk
      camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP);
      mx = fwd.x * axis.y + right.x * axis.x; mz = fwd.z * axis.y + right.z * axis.x;
    } else if (target && canMove) {
      const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
      if (d <= target.stop) { const done = target.onArrive; target = null; done?.(); }
      else { mx = dx / d; mz = dz / d; }
    }
    const len = Math.hypot(mx, mz);
    moving = len > 0;
    if (len > 0) {
      const speed = input.running() ? RUN : WALK;
      const step = Math.min(1, len) * speed * dt;
      const next = moveWithSlide(pos, (mx / len) * step, (mz / len) * step);
      const moved = Math.hypot(next.x - pos.x, next.z - pos.z);
      if (target) { stuck = moved < step * 0.2 ? stuck + dt : 0; if (stuck > 1) { target = null; stuck = 0; } }
      pos.x = next.x; pos.z = next.z;
      root.rotation.y = turnTo(root.rotation.y, Math.atan2(mx, mz), 0.2);
      character.play(input.running() ? 'run' : 'walk', 0.15);
    } else {
      character.play('idle', 0.2);
    }
    root.position.set(pos.x, 0, pos.z);
    ring.position.set(pos.x, 0.04, pos.z);
    ring.material.opacity = 0.55 + Math.sin(t * 4) * 0.25;
    character.update(dt);
    follow(false);
  }

  return {
    pos, character, root,
    update,
    isMoving: () => moving,
    walkTo(x, z, onArrive, stop = 1.8) { target = { x, z, onArrive, stop }; stuck = 0; },
    cancelWalk() { target = null; },
    faceTowards(x, z) { root.rotation.y = Math.atan2(x - pos.x, z - pos.z); },
    teleport(x, z) { const p = moveWithSlide({ x, z }, 0, 0); pos.x = p.x; pos.z = p.z; follow(true); },
    snapCamera() { follow(true); },
  };
}
