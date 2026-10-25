import { describe, test, expect } from 'vitest';
import { createState, recordAnswer } from '../../src/game/state.js';
import { fit, rank } from '../../src/game/scoring.js';
import { CREW } from '../../src/game/content.js';

const finish = (s, id, choices, t) => choices.reduce((acc, c, i) => recordAnswer(acc, id, i, c, t), s);

describe('scoring', () => {
  test('fit sums answer indexes (0..9)', () => {
    const s = finish(createState(), 1, [3, 2, 1], 1);
    expect(fit(s, 1)).toBe(6);
    expect(fit(s, 2)).toBe(0);
  });

  test('rank puts complete agents first by fit, ties by most recent talk', () => {
    let s = finish(createState(), 1, [1, 1, 1], 10);     // fit 3
    s = finish(s, 2, [3, 3, 3], 20);                      // fit 9
    s = finish(s, 3, [2, 1, 0], 30);                      // fit 3, more recent than agent 1
    s = recordAnswer(s, 4, 0, 3, 40);                     // incomplete
    const r = rank(s);
    expect(r.map((x) => x.agentId)).toEqual([2, 3, 1, 4]);
    expect(r[0]).toMatchObject({ agentId: 2, fit: 9, complete: true });
    expect(r[3].complete).toBe(false);
    expect(r[0].name).toBe(CREW.find((c) => c.agentId === 2).name);
  });

  test('why lists the visitor’s highest-pain answers as "Question — Answer"', () => {
    const s = finish(createState(), 5, [3, 0, 2], 1);
    const crew = CREW.find((c) => c.agentId === 5);
    const why = rank(s).find((x) => x.agentId === 5).why;
    expect(why).toEqual([
      `${crew.questions[0].q} — ${crew.questions[0].answers[3]}`,
      `${crew.questions[2].q} — ${crew.questions[2].answers[2]}`,
    ]);
  });

  test('why is empty when every answer is low pain', () => {
    const s = finish(createState(), 6, [0, 1, 0], 1);
    expect(rank(s).find((x) => x.agentId === 6).why).toEqual([]);
  });
});
