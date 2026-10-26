import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { landingSpot, swoopFrame, SWOOP_HEIGHT } from '../../src/game/jump.js';
import { createWheel } from '../../src/game/ui/wheel.js';
import { SPEED } from '../../src/game/player.js';
import { blocked } from '../../src/game/collision.js';
import { CREW, OFFICE } from '../../src/game/content.js';

describe('walking speed', () => {
  test('the walker jogs fast and sprints faster', () => {
    expect(SPEED.walk).toBeGreaterThanOrEqual(6.5);
    expect(SPEED.run).toBeGreaterThanOrEqual(11);
  });
});

describe('landing spot', () => {
  test('lands 1.4–2.2 m from the crew member, on free ground, on the side you came from', () => {
    const spot = landingSpot({ x: 31, z: 22 }, { x: 31, z: 10 });
    const d = Math.hypot(spot.x - 31, spot.z - 22);
    expect(d).toBeGreaterThanOrEqual(1.4);
    expect(d).toBeLessThanOrEqual(2.2);
    expect(blocked(spot.x, spot.z)).toBe(false);
    expect(spot.z).toBeLessThan(22);
  });

  test('finds free ground for every crew member, even next to walls and trucks', () => {
    for (const c of CREW) for (const p of c.route) {
      const spot = landingSpot({ x: p[0], z: p[1] }, { x: 0, z: 0 });
      expect(blocked(spot.x, spot.z), c.name).toBe(false);
      expect(Math.hypot(spot.x - p[0], spot.z - p[1]), c.name).toBeLessThanOrEqual(3.2);   // close enough to talk
    }
  });
});

describe('sky swoop', () => {
  const from = { x: 0, z: 30 }, to = { x: 40, z: -10 };
  test('starts and ends at ground level on the two points', () => {
    expect(swoopFrame(from, to, 0)).toEqual({ x: 0, z: 30, lift: 0 });
    const end = swoopFrame(from, to, 1);
    expect(end.x).toBeCloseTo(40, 5); expect(end.z).toBeCloseTo(-10, 5); expect(end.lift).toBeCloseTo(0, 5);
  });

  test('rises first, crosses high, then drops onto the target', () => {
    const rising = swoopFrame(from, to, 0.2), middle = swoopFrame(from, to, 0.5), falling = swoopFrame(from, to, 0.8);
    expect(Math.hypot(rising.x - from.x, rising.z - from.z)).toBeLessThan(2);
    expect(rising.lift).toBeGreaterThan(SWOOP_HEIGHT * 0.3);
    expect(middle.lift).toBeCloseTo(SWOOP_HEIGHT, 5);
    expect(middle.x).toBeCloseTo(20, 0);
    expect(Math.hypot(falling.x - to.x, falling.z - to.z)).toBeLessThan(2);
    expect(falling.lift).toBeGreaterThan(SWOOP_HEIGHT * 0.3);
  });
});

describe('jump wheel', () => {
  let root, onPick, onClose, wheel;
  const entries = [
    ...CREW.slice(0, 3).map((c, i) => ({ id: c.agentId, label: c.name, sub: c.role, met: i === 0 })),
    { id: 'office', label: 'Site office', sub: 'Your results', met: false },
  ];
  beforeEach(() => {
    document.documentElement.classList.add('site-walk-on');
    document.body.innerHTML = '<div id="r"></div>';
    root = document.getElementById('r');
    onPick = vi.fn(); onClose = vi.fn();
    wheel = createWheel(root, { onPick, onClose });
  });
  afterEach(() => wheel.close());
  const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true }));

  test('lists everyone you can jump to, marking who you have met', () => {
    wheel.open(entries);
    const items = [...root.querySelectorAll('.sw-wheel-item')];
    expect(items.map((b) => b.querySelector('.sw-wheel-name').textContent)).toEqual([CREW[0].name, CREW[1].name, CREW[2].name, 'Site office']);
    expect(items[0].classList.contains('met')).toBe(true);
    expect(items[1].classList.contains('met')).toBe(false);
  });

  test('clicking someone jumps to them', () => {
    wheel.open(entries);
    root.querySelectorAll('.sw-wheel-item')[3].click();
    expect(onPick).toHaveBeenCalledWith('office');
  });

  test('arrow keys move the selection and Enter jumps', () => {
    wheel.open(entries);
    key('ArrowRight'); key('ArrowRight');
    key('Enter');
    expect(onPick).toHaveBeenCalledWith(CREW[2].agentId);
  });

  test('Esc closes without jumping', () => {
    wheel.open(entries);
    key('Escape');
    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
