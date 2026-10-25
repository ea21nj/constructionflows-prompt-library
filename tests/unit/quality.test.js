import { describe, test, expect } from 'vitest';
import { detectTier, tierSettings } from '../../src/game/quality.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/155.0 Safari/537.36';

describe('quality tiers', () => {
  test('phones get the medium tier', () => {
    expect(detectTier({ ua: IPHONE, cores: 4, memory: 4, webgl2: true, w: 390, h: 844 })).toBe('medium');
  });
  test('weak devices get the low tier', () => {
    expect(detectTier({ ua: MAC, cores: 2, memory: 4, webgl2: false, w: 1280, h: 800 })).toBe('low');
    expect(detectTier({ ua: IPHONE, cores: 2, memory: 2, webgl2: true, w: 390, h: 844 })).toBe('low');
  });
  test('capable desktops get the high tier', () => {
    expect(detectTier({ ua: MAC, cores: 8, memory: 8, webgl2: true, w: 1440, h: 900 })).toBe('high');
    expect(detectTier({ ua: MAC, cores: 4, memory: 8, webgl2: true, w: 1440, h: 900 })).toBe('medium');
  });
  test('low tier turns off shadows and post-processing and caps pixel ratio', () => {
    expect(tierSettings('low', 3)).toEqual({ pixelRatio: 1, shadows: false, shadowMapSize: 0, post: false });
    expect(tierSettings('high', 3).pixelRatio).toBe(2);
    expect(tierSettings('high', 1)).toMatchObject({ shadows: true, post: true });
  });
});
