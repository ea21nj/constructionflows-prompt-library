import { describe, test, expect } from 'vitest';
import { CREW, AREAS, OFFICE, SPAWN } from '../../src/game/content.js';

const inside = ([x, z], [a, b, c, d]) => x >= a && x <= b && z >= c && z <= d;
const area = (id) => AREAS.find((a) => a.id === id);

describe('crew content', () => {
  test('there are 10 crew with unique agentIds 1..10', () => {
    expect(CREW).toHaveLength(10);
    expect(CREW.map((c) => c.agentId).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('every crew member has exactly 3 questions with 4 answers each', () => {
    for (const c of CREW) {
      expect(c.questions, c.name).toHaveLength(3);
      for (const q of c.questions) {
        expect(q.q.length).toBeGreaterThan(10);
        expect(q.answers).toHaveLength(4);
        q.answers.forEach((a) => expect(a.trim().length).toBeGreaterThan(0));
      }
    }
  });

  test('every spot and route point lies inside its area', () => {
    for (const c of CREW) {
      const rect = area(c.area).rect;
      expect(inside(c.spot, rect), `${c.name} spot`).toBe(true);
      expect(c.route.length).toBeGreaterThanOrEqual(2);
      c.route.forEach((p, i) => expect(inside(p, rect), `${c.name} route ${i}`).toBe(true));
    }
  });

  test('office trigger touches the trailer door and spawn is on site', () => {
    expect(inside(OFFICE.door, OFFICE.trigger)).toBe(true);
    expect(OFFICE.trigger[0]).toBeGreaterThanOrEqual(OFFICE.footprint[1] - 0.01);
    expect(SPAWN[1]).toBeGreaterThan(30);
  });

  test('the five approved areas exist', () => {
    expect(AREAS.map((a) => a.id)).toEqual(['office', 'building', 'excavation', 'laydown', 'parking']);
  });
});
