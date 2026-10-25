import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const DIR = path.resolve(__dirname, '../../public/assets/site');
const REQUIRED = ['character_m', 'character_f', 'anims', 'crane', 'dump_truck', 'concrete_truck', 'container_office',
  'container_shipping', 'fence', 'helmet', 'wheelbarrow', 'cement_mixer', 'bricks', 'planks', 'barrel', 'cone'];
const read = () => JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));

describe('site walk assets', () => {
  test('manifest lists every required asset and each file exists', () => {
    const manifest = read();
    for (const key of REQUIRED) {
      expect(manifest[key], key).toBeTruthy();
      expect(fs.existsSync(path.join(DIR, manifest[key].file)), manifest[key].file).toBe(true);
    }
  });

  test('total shipped asset size is within 12 MB', () => {
    const total = Object.values(read()).reduce((n, m) => n + m.bytes, 0);
    expect(total).toBeLessThanOrEqual(12 * 1024 * 1024);
  });

  test('LICENSES.md names all four packs with CC0', () => {
    const text = fs.readFileSync(path.join(DIR, 'LICENSES.md'), 'utf8');
    for (const name of ['3D House Construction Site', 'Low Poly Construction Pack', 'Universal Base Characters', 'Universal Animation Library']) {
      expect(text).toContain(name);
    }
    expect(text.match(/CC0/g).length).toBeGreaterThanOrEqual(4);
  });
});
