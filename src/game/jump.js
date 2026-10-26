// GTA-style "switch": the camera lifts into the sky, sweeps across the site and drops onto the
// person you picked, and you land beside them ready to talk.
import { blocked, moveWithSlide } from './collision.js';

export const SWOOP_HEIGHT = 70;
const DURATION = 2.4;   // seconds of game time
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

// Camera focus and height above normal at progress t (0..1): rise, cross high, drop.
export function swoopFrame(from, to, t) {
  if (t <= 0) return { x: from.x, z: from.z, lift: 0 };
  if (t < 0.35) return { x: from.x, z: from.z, lift: SWOOP_HEIGHT * ease(t / 0.35) };
  if (t < 0.65) {
    const k = ease((t - 0.35) / 0.3);
    return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, lift: SWOOP_HEIGHT };
  }
  return { x: to.x, z: to.z, lift: SWOOP_HEIGHT * (1 - ease(Math.min(1, (t - 0.65) / 0.35))) };
}

// A free spot about 1.8 m from someone, preferring the side you're coming from.
export function landingSpot(target, from) {
  const base = Math.atan2(from.z - target.z, from.x - target.x);
  for (const r of [1.8, 1.5, 2.1]) {
    for (const turn of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, Math.PI]) {
      const x = target.x + Math.cos(base + turn) * r, z = target.z + Math.sin(base + turn) * r;
      if (!blocked(x, z)) return { x, z };
    }
  }
  return moveWithSlide({ x: target.x + 1.8, z: target.z }, 0, 0);
}

export function createJump({ engine, player, reducedMotion = false }) {
  const { camera, controls } = engine;
  let active = null;

  function start(dest, face, onLand) {
    const from = { x: player.pos.x, z: player.pos.z };
    if (reducedMotion) {
      player.teleport(dest.x, dest.z); player.faceTowards(face.x, face.z); onLand?.();
      return;
    }
    const limits = { maxDistance: controls.maxDistance, minPolarAngle: controls.minPolarAngle };
    controls.maxDistance = 400; controls.minPolarAngle = 0; controls.enabled = false;
    player.setFollow(false);
    active = { from, to: dest, face, t: 0, offset: camera.position.clone().sub(controls.target), onLand, moved: false, limits };
  }

  // Returns true while a jump is running.
  function update(dt) {
    if (!active) return false;
    const a = active;
    a.t = Math.min(1, a.t + dt / DURATION);
    const f = swoopFrame(a.from, a.to, a.t);
    const k = f.lift / SWOOP_HEIGHT;               // up high the view turns to look almost straight down
    controls.target.set(f.x, 1.4, f.z);
    camera.position.set(f.x + a.offset.x * (1 - 0.85 * k), 1.4 + a.offset.y + f.lift, f.z + a.offset.z * (1 - 0.85 * k));
    camera.lookAt(controls.target);
    engine.setShadowCenter(f.x, f.z);
    if (!a.moved && a.t >= 0.5) {                  // swap places while the view is high above the site
      player.teleport(a.to.x, a.to.z); player.faceTowards(a.face.x, a.face.z); a.moved = true;
      controls.target.set(f.x, 1.4, f.z);
      camera.position.set(f.x + a.offset.x * 0.15, 1.4 + a.offset.y + f.lift, f.z + a.offset.z * 0.15);
    }
    if (a.t >= 1) {
      Object.assign(controls, a.limits); controls.enabled = true;
      camera.position.copy(controls.target).add(a.offset);
      player.setFollow(true); player.snapCamera();
      active = null;
      a.onLand?.();
    }
    return true;
  }

  return { start, update, isActive: () => !!active };
}
