import { describe, test, expect } from 'vitest';
import { STORAGE_KEY, OFFICE_UNLOCK, createState, loadState, saveState, recordAnswer, isComplete, completedCount, officeOpen } from '../../src/game/state.js';

const memory = (initial) => { const data = { ...initial }; return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data }; };
const finish = (s, id, choices = [1, 1, 1], t = 1) => choices.reduce((acc, c, i) => recordAnswer(acc, id, i, c, t + i), s);

describe('progress state', () => {
  test('createState is empty and office closed', () => {
    const s = createState();
    expect(s).toEqual({ v: 1, answers: {}, lastTalked: {}, officeSeen: false });
    expect(officeOpen(s)).toBe(false);
    expect(OFFICE_UNLOCK).toBe(3);
  });

  test('recordAnswer stores choice and lastTalked without mutating input', () => {
    const s = createState();
    const n = recordAnswer(s, 4, 1, 3, 99);
    expect(s.answers).toEqual({});
    expect(n.answers[4][1]).toBe(3);
    expect(n.lastTalked[4]).toBe(99);
    expect(isComplete(n, 4)).toBe(false);
  });

  test('officeOpen becomes true only after 3 complete conversations', () => {
    let s = finish(finish(createState(), 1), 2);
    s = recordAnswer(s, 3, 0, 2);
    expect(completedCount(s)).toBe(2);
    expect(officeOpen(s)).toBe(false);
    s = recordAnswer(recordAnswer(s, 3, 1, 2), 3, 2, 2);
    expect(isComplete(s, 3)).toBe(true);
    expect(officeOpen(s)).toBe(true);
  });

  test('saveState then loadState round-trips', () => {
    const store = memory();
    const s = finish(createState(), 7, [3, 2, 0]);
    saveState(s, store);
    expect(store.data[STORAGE_KEY]).toBeTruthy();
    expect(loadState(store)).toEqual(s);
  });

  test('loadState returns fresh state for corrupt JSON', () => {
    expect(loadState(memory({ [STORAGE_KEY]: '{bad' }))).toEqual(createState());
  });

  test('loadState returns fresh state for an unknown version', () => {
    expect(loadState(memory({ [STORAGE_KEY]: JSON.stringify({ v: 0, answers: { 1: [3, 3, 3] } }) }))).toEqual(createState());
  });

  test('loadState drops answers that are out of range', () => {
    const raw = { v: 1, answers: { 1: [3, 9, 'x'], 42: [1, 1, 1] }, lastTalked: {}, officeSeen: false };
    const s = loadState(memory({ [STORAGE_KEY]: JSON.stringify(raw) }));
    expect(s.answers).toEqual({ 1: [3] });
  });

  test('loadState/saveState survive storage that throws', () => {
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(loadState(broken)).toEqual(createState());
    expect(() => saveState(createState(), broken)).not.toThrow();
  });
});
