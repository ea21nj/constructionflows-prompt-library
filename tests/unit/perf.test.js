import { describe, test, expect } from 'vitest';
import { createFpsMeter, nextTier } from '../../src/game/perf.js';

describe('frame-rate meter', () => {
  test('averages real frames over the window', () => {
    let now = 0;
    const meter = createFpsMeter(() => now, 4000);
    for (let i = 0; i < 80; i++) { now += 50; meter.frame(); }     // 20 fps for 4 s
    expect(meter.fps()).toBeCloseTo(20, 0);
  });

  test('reset waits for a full window again, so a pause never reads as a slow device', () => {
    let now = 0;
    const meter = createFpsMeter(() => now, 4000);
    for (let i = 0; i < 240; i++) { now += 1000 / 60; meter.frame(); }
    now += 30_000;                                                   // tab hidden / classic pages
    meter.reset();
    for (let i = 0; i < 60; i++) { now += 1000 / 60; meter.frame(); }
    expect(meter.fps()).toBe(null);                                  // only 1 s since resuming
    for (let i = 0; i < 180; i++) { now += 1000 / 60; meter.frame(); }
    expect(meter.fps()).toBeGreaterThan(55);
  });

  test('a fresh meter reports no reading until it has a full window', () => {
    let now = 0;
    const meter = createFpsMeter(() => now, 4000);
    meter.frame();
    expect(meter.fps()).toBe(null);
  });
});

describe('quality step-down', () => {
  test('needs two slow readings in a row', () => {
    expect(nextTier('high', [25])).toBe('high');
    expect(nextTier('high', [25, 40])).toBe('high');
    expect(nextTier('high', [40, 25, 22])).toBe('medium');
    expect(nextTier('medium', [12, 14])).toBe('low');
    expect(nextTier('low', [5, 5])).toBe('low');
    expect(nextTier('high', [null, 20])).toBe('high');
  });
});
