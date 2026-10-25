// What the player can't walk through: every solid placement in layout.js plus the steel columns,
// inside the site fence. Boxes are [minX, maxX, minZ, maxZ].
import { PLACEMENTS, COLUMN_X, COLUMN_Z, COLUMN_SIZE, footprint } from './layout.js';

export const BOUNDS = [-65.5, 65.5, -39.5, 39.5];

export const SOLID = [
  ...PLACEMENTS.map(footprint),
  ...COLUMN_X.flatMap((x) => COLUMN_Z.map((z) => [x - COLUMN_SIZE / 2, x + COLUMN_SIZE / 2, z - COLUMN_SIZE / 2, z + COLUMN_SIZE / 2])),
];

const R = 0.45;   // the player's body radius

export function blocked(x, z, r = R) {
  if (x < BOUNDS[0] + r || x > BOUNDS[1] - r || z < BOUNDS[2] + r || z > BOUNDS[3] - r) return true;
  return SOLID.some(([a, b, c, d]) => x > a - r && x < b + r && z > c - r && z < d + r);
}

// Push a point that ended up inside something (spawn, teleport, auto-walk) to the nearest free spot,
// searching outward in rings so gaps between neighbouring obstacles can't trap it.
function pushOut(pos, r) {
  for (let ring = 0.5; ring <= 30; ring += 0.5) {
    const steps = Math.max(8, Math.round(ring * 8));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = pos.x + Math.cos(a) * ring, z = pos.z + Math.sin(a) * ring;
      if (!blocked(x, z, r)) return { x, z };
    }
  }
  return { x: 0, z: 30 };   // open ground by the gate
}

// Move by (dx, dz), sliding along whatever is in the way (each axis tried on its own).
export function moveWithSlide(pos, dx, dz, r = R) {
  let { x, z } = blocked(pos.x, pos.z, r) ? pushOut(pos, r) : pos;
  if (!blocked(x + dx, z, r)) x += dx;
  if (!blocked(x, z + dz, r)) z += dz;
  return { x, z };
}
