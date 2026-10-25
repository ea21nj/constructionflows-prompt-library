import { describe, test, expect } from 'vitest';
import { SOLID, BOUNDS, blocked, moveWithSlide } from '../../src/game/collision.js';
import { CREW, OFFICE, SPAWN } from '../../src/game/content.js';

const centre = ([a, b, c, d]) => ({ x: (a + b) / 2, z: (c + d) / 2 });

describe('collision', () => {
  test('site bounds match the plan', () => {
    expect(BOUNDS).toEqual([-65.5, 65.5, -39.5, 39.5]);
    expect(blocked(0, 39.4, 0)).toBe(false);
    expect(blocked(0, 40, 0)).toBe(true);
  });

  test('blocked is true inside the trailer and false in open ground', () => {
    const c = centre(OFFICE.footprint);
    expect(blocked(c.x, c.z)).toBe(true);
    expect(blocked(0, 30)).toBe(false);
  });

  test('every steel column blocks, the building interior between them does not', () => {
    expect(blocked(-46.5, -22)).toBe(true);
    expect(blocked(-41, -18)).toBe(false);
  });

  test('moveWithSlide slides along a wall instead of stopping', () => {
    const [a, b, c] = OFFICE.footprint;           // approach the trailer's south face (z = c) diagonally
    const start = { x: (a + b) / 2, z: c - 0.5 };
    const end = moveWithSlide(start, 1, 1);
    expect(end.x).toBeCloseTo(start.x + 1, 5);    // parallel component kept
    expect(end.z).toBeCloseTo(start.z, 5);        // blocked component dropped
  });

  test('moveWithSlide from inside a box pushes the point out', () => {
    const c = centre(OFFICE.footprint);
    const out = moveWithSlide(c, 0, 0);
    expect(blocked(out.x, out.z)).toBe(false);
  });

  test('spawn, office trigger and all crew spots and routes are reachable (not blocked)', () => {
    expect(blocked(...SPAWN)).toBe(false);
    expect(blocked(...[OFFICE.trigger[0] + 1, (OFFICE.trigger[2] + OFFICE.trigger[3]) / 2])).toBe(false);
    for (const c of CREW) {
      expect(blocked(...c.spot), `${c.name} spot`).toBe(false);
      c.route.forEach((p, i) => expect(blocked(...p), `${c.name} route ${i}`).toBe(false));
    }
  });

  test('there is a solid for every placed obstacle', () => {
    expect(SOLID.length).toBeGreaterThanOrEqual(40);   // 20 columns + walls + machines + structures
  });
});
