import { describe, test, expect, vi, beforeEach } from 'vitest';
import { siteScore, scoreChange, POINTS, MAX_POINTS, RANKS } from '../../src/game/score.js';
import { createState, recordAnswer, recordAuditAnswer, markReportSaved, loadState, STORAGE_KEY } from '../../src/game/state.js';
import { createScoreboard } from '../../src/game/ui/scoreboard.js';
import { CREW } from '../../src/game/content.js';
import { AUDIT_SECTIONS } from '../../src/game/audit-content.js';

const talk = (s, ids) => ids.reduce((acc, id) => [0, 1, 2].reduce((a, i) => recordAnswer(a, id, i, 1, 1), acc), s);
const audit = (s, ids) => ids.reduce((acc, id) => [0, 1, 2, 3, 4].reduce((a, i) => recordAuditAnswer(a, id, i, 1), acc), s);
const ALL_CREW = CREW.map((c) => c.agentId), ALL_AUDIT = AUDIT_SECTIONS.map((s) => s.id);

describe('site score', () => {
  test('points: 100 a conversation, 150 an audit section, 200 the office, 100 a saved report, 300 bonuses', () => {
    expect(POINTS).toEqual({ crew: 100, audit: 150, office: 200, report: 100, crewAll: 300, auditAll: 300 });
    expect(MAX_POINTS).toBe(2950);
    expect(RANKS.map((r) => r.name)).toEqual(['Visitor', 'Apprentice', 'Foreman', 'Superintendent', 'Project Executive']);
  });

  test('a fresh visitor has no points, the Visitor rank and 0 of 6 objectives', () => {
    const s = siteScore(createState());
    expect(s).toMatchObject({ points: 0, rank: 'Visitor', nextRank: 'Apprentice', toNext: 250, completed: 0, total: 6 });
    expect(s.objectives.map((o) => o.label)).toEqual(['Talk to 3 crew', 'Visit the site office', 'Finish an audit section', 'Audit all 7 checkpoints', 'Meet the whole crew', 'Take your results with you']);
    expect(s.objectives[0]).toMatchObject({ done: false, count: 0, goal: 3 });
  });

  test('three conversations and an office visit: 500 points, Apprentice, 2 objectives done', () => {
    const s = siteScore({ ...talk(createState(), [1, 2, 3]), officeSeen: true });
    expect(s).toMatchObject({ points: 500, rank: 'Apprentice', completed: 2 });
    expect(s.progress).toBeCloseTo((500 - 250) / (800 - 250), 5);
  });

  test('doing everything reaches the maximum, the top rank and every objective', () => {
    const s = siteScore(markReportSaved({ ...audit(talk(createState(), ALL_CREW), ALL_AUDIT), officeSeen: true }));
    expect(s).toMatchObject({ points: MAX_POINTS, rank: 'Project Executive', nextRank: null, completed: 6, progress: 1 });
  });

  test('scoreChange reports points gained, objectives just completed and a promotion', () => {
    const before = talk(createState(), [1, 2]);
    const after = talk(before, [3]);
    expect(scoreChange(before, after)).toEqual({ gained: 100, completedNow: ['Talk to 3 crew'], rankUp: 'Apprentice' });
    expect(scoreChange(after, after)).toEqual({ gained: 0, completedNow: [], rankUp: null });
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

  test('shows the score, rank, progress to the next rank and objectives', () => {
    sb.update(siteScore({ ...talk(createState(), [1, 2, 3]), officeSeen: true }));
    expect(root.querySelector('.sw-score-points').textContent).toBe('500');
    expect(root.querySelector('.sw-score-rank').textContent).toBe('Apprentice');
    expect(root.querySelector('.sw-score-next').textContent).toBe('300 to Foreman');
    expect(root.querySelector('.sw-score-objectives').textContent).toBe('Objectives 2 / 6');
  });

  test('earned points float up next to the score', () => {
    sb.update(siteScore(createState()));
    sb.update(siteScore(talk(createState(), [1])), { gained: 100 });
    expect(root.querySelector('.sw-score-float').textContent).toBe('+100');
  });

  test('every unfinished objective has a Go button that takes you there', () => {
    sb.update(siteScore({ ...talk(createState(), [1, 2, 3]), officeSeen: true }));
    root.querySelector('.sw-scoreboard-btn').click();
    const go = [...root.querySelectorAll('.sw-objectives [data-go]')];
    expect(go.map((b) => b.dataset.go)).toEqual(['audit1', 'audit7', 'crew10', 'report']);   // crew3 and office are done
    go[0].click();
    expect(onGo).toHaveBeenCalledWith('audit1');
    expect(root.querySelector('.sw-objectives').hidden).toBe(true);                          // closes as you go
  });

  test('clicking the badge opens the objectives checklist', () => {
    sb.update(siteScore(talk(createState(), [1])));
    root.querySelector('.sw-scoreboard-btn').click();
    const items = [...root.querySelectorAll('.sw-objectives li')];
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toContain('1 / 3');
    expect(items[0].classList.contains('done')).toBe(false);
    root.querySelector('.sw-scoreboard-btn').click();
    expect(root.querySelector('.sw-objectives').hidden).toBe(true);
  });
});
