import { describe, test, expect } from 'vitest';
import { stepRoute, activityClip } from '../../src/game/crew.js';

describe('crew routes', () => {
  test('stepRoute moves toward the target at speed × dt', () => {
    const r = stepRoute({ x: 0, z: 0 }, [[0, 0], [10, 0]], 1, 2, 0.5);
    expect(r.pos.x).toBeCloseTo(1, 5);
    expect(r.pos.z).toBeCloseTo(0, 5);
    expect(r.arrived).toBe(false);
    expect(r.index).toBe(1);
  });

  test('stepRoute flags arrival within 0.2 m and moves on to the next point, wrapping', () => {
    const r = stepRoute({ x: 9.9, z: 0 }, [[0, 0], [10, 0]], 1, 2, 0.5);
    expect(r.arrived).toBe(true);
    expect(r.index).toBe(0);
    expect(r.pos).toEqual({ x: 10, z: 0 });
  });

  test('stepRoute never overshoots the target', () => {
    const r = stepRoute({ x: 0, z: 0 }, [[1, 0]], 0, 50, 1);
    expect(r.pos.x).toBe(1);
  });

  test('each activity maps to a library animation', () => {
    expect(activityClip('sit')).toBe('Sitting_Idle_Loop');
    expect(activityClip('chat')).toBe('Idle_Talking_Loop');
    expect(activityClip('log')).toBe('Fixing_Kneeling');
    expect(activityClip('anything-else')).toBe('Idle_Loop');
  });
});
