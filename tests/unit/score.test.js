import { describe, test, expect, vi, beforeEach } from 'vitest';
import { siteScore, scoreChange, POINTS, MAX_POINTS, RANKS } from '../../src/game/score.js';
import { LEVELS, zoneAt } from '../../src/game/levels.js';
import { createState, recordAnswer, recordAuditAnswer, markReportSaved, loadState, STORAGE_KEY } from '../../src/game/state.js';
import { createScoreboard } from '../../src/game/ui/scoreboard.js';
import { CREW, SPAWN } from '../../src/game/content.js';
import { AUDIT_SECTIONS } from '../../src/game/audit-content.js';

const talk = (s, ids) => ids.reduce((acc, id) => [0, 1, 2].reduce((a, i) => recordAnswer(a, id, i, 1, 1), acc), s);
const audit = (s, ids) => ids.reduce((acc, id) => [0, 1, 2, 3, 4].reduce((a, i) => recordAuditAnswer(a, id, i, 1), acc), s);
const ALL_CREW = CREW.map((c) => c.agentId), ALL_AUDIT = AUDIT_SECTIONS.map((s) => s.id);
const everything = () => markReportSaved({ ...audit(talk(createState(), ALL_CREW), ALL_AUDIT), officeSeen: true });

describe('levels', () => {
  test('four levels follow a job from preconstruction to closeout, covering every crew member and checkpoint once', () => {
    expect(LEVELS.map((l) => `${l.number} ${l.title}`)).toEqual(['1 Preconstruction', '2 Structure', '3 Field operations', '4 Closeout & cash']);
    expect(LEVELS.flatMap((l) => l.crew).sort((a, b) => a - b)).toEqual(ALL_CREW.slice().sort((a, b) => a - b));
    expect(LEVELS.flatMap((l) => l.audits).sort()).toEqual(ALL_AUDIT.slice().sort());
  });

  test('a fresh visitor is on level 1 with no stars and 19 objectives to go', () => {
    const s = siteScore(createState());
    expect(s).toMatchObject({ points: 0, rank: 'Visitor', completed: 0, total: 19, stars: 0, maxStars: 12 });
    expect(s.current.number).toBe(1);
    expect(s.current.tasks.map((t) => t.label)).toEqual(['Talk to Maria', 'Talk to Rosa', 'Audit Bidding & Pipeline', 'Audit Project Kickoff']);
    expect(s.current.tasks.map((t) => t.go)).toEqual(['crew:1', 'crew:2', 'audit:bidding', 'audit:kickoff']);
  });

  test('stars: 1 for any progress, 2 for half the objectives, 3 for all of them', () => {
    expect(siteScore(talk(createState(), [1])).levels[0].stars).toBe(1);
    expect(siteScore(talk(createState(), [1, 2])).levels[0].stars).toBe(2);
    const done = siteScore(audit(talk(createState(), [1, 2]), ['bidding', 'kickoff']));
    expect(done.levels[0]).toMatchObject({ stars: 3, complete: true, done: 4, total: 4 });
    expect(done.current.number).toBe(2);                                  // moves on to the next level
  });

  test('each level is a part of the site: zoneAt says which level you are standing in', () => {
    expect(zoneAt(...SPAWN)).toBe(1);                                  // you start at the gate
    for (const l of LEVELS) {
      for (const id of l.crew) expect(zoneAt(...CREW.find((c) => c.agentId === id).spot), `crew ${id}`).toBe(l.number);
      for (const id of l.audits) expect(zoneAt(...AUDIT_SECTIONS.find((s) => s.id === id).spot), id).toBe(l.number);
    }
    expect(zoneAt(0, 10)).toBe(null);                                  // the open yard in the middle
  });

  test('level 4 ends with the site office and taking your results with you', () => {
    expect(LEVELS[3].extras).toEqual(['office', 'report']);
    expect(siteScore(createState()).levels[3].tasks.map((t) => t.label).slice(-2)).toEqual(['Visit the site office', 'Take your results with you']);
  });
});

describe('site score', () => {
  test('points: 100 a conversation, 150 an audit section, 200 the office, 100 a saved report, 250 a completed level', () => {
    expect(POINTS).toEqual({ crew: 100, audit: 150, office: 200, report: 100, level: 250 });
    expect(MAX_POINTS).toBe(3350);
    expect(RANKS.map((r) => r.name)).toEqual(['Visitor', 'Apprentice', 'Foreman', 'Superintendent', 'Project Executive']);
  });

  test('finishing level 1 adds the level bonus', () => {
    const s = siteScore(audit(talk(createState(), [1, 2]), ['bidding', 'kickoff']));
    expect(s.points).toBe(2 * 100 + 2 * 150 + 250);
    expect(s.rank).toBe('Apprentice');
  });

  test('doing everything reaches the maximum, the top rank, 12 stars and every objective', () => {
    const s = siteScore(everything());
    expect(s).toMatchObject({ points: MAX_POINTS, rank: 'Project Executive', nextRank: null, completed: 19, stars: 12, progress: 1 });
  });

  test('scoreChange reports points, objectives just done, a level just completed and a promotion', () => {
    const before = audit(talk(createState(), [1, 2]), ['bidding']);
    const after = audit(before, ['kickoff']);
    expect(scoreChange(before, after)).toEqual({ gained: 400, completedNow: ['Audit Project Kickoff'], levelComplete: 1, starsUp: [{ number: 1, title: 'Preconstruction', stars: 3 }], rankUp: 'Apprentice' });
    expect(scoreChange(after, after)).toEqual({ gained: 0, completedNow: [], levelComplete: null, starsUp: [], rankUp: null });
    expect(scoreChange(createState(), talk(createState(), [3])).starsUp).toEqual([{ number: 2, title: 'Structure', stars: 1 }]);
  });

  test('a saved report is remembered across reloads', () => {
    const data = {};
    const store = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
    data[STORAGE_KEY] = JSON.stringify(markReportSaved(createState()));
    expect(loadState(store).reportSaved).toBe(true);
    expect(createState().reportSaved).toBe(false);
  });
});

describe('scoreboard', () => {
  let root, sb, onGo;
  beforeEach(() => {
    onGo = vi.fn();
    document.documentElement.classList.add('site-walk-on');
    document.body.innerHTML = '<div id="r"></div>';
    root = document.getElementById('r');
    sb = createScoreboard(root, { onGo });
  });

  test('shows the score, rank, level, stars and progress to the next rank', () => {
    sb.update(siteScore(audit(talk(createState(), [1, 2]), ['bidding', 'kickoff'])));
    expect(root.querySelector('.sw-score-points').textContent).toBe('750');
    expect(root.querySelector('.sw-score-rank').textContent).toBe('Apprentice');
    expect(root.querySelector('.sw-score-level').textContent).toBe('Level 2 / 4');
    expect(root.querySelector('.sw-score-stars').textContent).toBe('★ 3 / 12');
    expect(root.querySelector('.sw-score-next').textContent).toBe('150 to Foreman');
  });

  test('earned points float up next to the score', () => {
    sb.update(siteScore(createState()));
    sb.update(siteScore(talk(createState(), [1])), { gained: 100 });
    expect(root.querySelector('.sw-score-float').textContent).toBe('+100');
  });

  test('the checklist groups objectives by level, each unfinished one with a Go button', () => {
    sb.update(siteScore(talk(createState(), [1])));
    root.querySelector('.sw-scoreboard-btn').click();
    const levels = [...root.querySelectorAll('.sw-objectives .sw-obj-level')];
    expect(levels).toHaveLength(4);
    expect(levels[0].textContent).toContain('Level 1 · Preconstruction');
    expect(levels[0].querySelector('.sw-obj-stars').textContent).toBe('★☆☆');
    const go = [...levels[0].querySelectorAll('[data-go]')].map((b) => b.dataset.go);
    expect(go).toEqual(['crew:2', 'audit:bidding', 'audit:kickoff']);                     // Maria is done
    levels[0].querySelector('[data-go="audit:kickoff"]').click();
    expect(onGo).toHaveBeenCalledWith('audit:kickoff');
    expect(root.querySelector('.sw-objectives').hidden).toBe(true);
  });
});
