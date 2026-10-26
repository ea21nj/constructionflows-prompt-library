import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHud } from '../../src/game/ui/hud.js';
import { createLevelBoard } from '../../src/game/ui/level-board.js';
import { siteScore } from '../../src/game/score.js';
import { createState, recordAnswer, recordAuditAnswer, markReportSaved } from '../../src/game/state.js';
import { CREW } from '../../src/game/content.js';
import { AUDIT_SECTIONS } from '../../src/game/audit-content.js';

const talk = (s, ids) => ids.reduce((acc, id) => [0, 1, 2].reduce((a, i) => recordAnswer(a, id, i, 1, 1), acc), s);
const audit = (s, ids) => ids.reduce((acc, id) => [0, 1, 2, 3, 4].reduce((a, i) => recordAuditAnswer(a, id, i, 1), acc), s);
const levelOneDone = () => audit(talk(createState(), [1, 2]), ['bidding', 'kickoff']);
const everything = () => markReportSaved({ ...audit(talk(createState(), CREW.map((c) => c.agentId)), AUDIT_SECTIONS.map((s) => s.id)), officeSeen: true });

beforeEach(() => {
  document.documentElement.classList.add('site-walk-on');
  document.body.innerHTML = '';
});
afterEach(() => vi.useRealTimers());

describe('HUD level card', () => {
  test('shows the current level, its stars and its objectives; unfinished ones take you there', () => {
    const onGo = vi.fn(), onLevels = vi.fn();
    const hud = createHud(document.body, { onGo, onLevels });
    hud.setLevel(siteScore(talk(createState(), [1])));
    expect(document.querySelector('.sw-level-kicker').textContent).toBe('Level 1 of 4');
    expect(document.querySelector('.sw-level-title').textContent).toBe('Preconstruction');
    expect(document.querySelector('.sw-level-zone').textContent).toBe('Site office & front gate');
    expect(document.querySelector('.sw-level-stars').textContent).toBe('★☆☆');
    const rows = [...document.querySelectorAll('.sw-level-tasks li')];
    expect(rows.map((r) => r.textContent.trim())).toEqual(['✓ Talk to Maria (done)', 'Talk to Rosa', 'Audit Bidding & Pipeline', 'Audit Project Kickoff']);
    expect(rows[0].querySelector('button')).toBeNull();                  // done: nothing to go to
    rows[1].querySelector('button').click();
    expect(onGo).toHaveBeenCalledWith('crew:2');
    document.querySelector('.sw-level-head').click();
    expect(onLevels).toHaveBeenCalled();
  });

  test('moves on to the next level and says when the whole walk is done', () => {
    const hud = createHud(document.body);
    hud.setLevel(siteScore(levelOneDone()));
    expect(document.querySelector('.sw-level-title').textContent).toBe('Structure');
    hud.setLevel(siteScore(everything()));
    expect(document.querySelector('.sw-level-kicker').textContent).toBe('All 4 levels done');
    expect(document.querySelector('.sw-level-title').textContent).toBe('Site walk complete');
    expect(document.querySelectorAll('.sw-level-tasks li')).toHaveLength(0);
  });

  test('the site office line counts talks until the office opens', () => {
    const hud = createHud(document.body);
    hud.setObjective(talk(createState(), [1, 2]));
    expect(document.querySelector('.sw-objective').textContent).toBe('Site office opens after 3 talks · 2 of 3');
    hud.setObjective(talk(createState(), [1, 2, 3]));
    expect(document.querySelector('.sw-objective').textContent).toBe('Site office is open — head there');
  });
});

describe('zone banner', () => {
  test('entering a level’s part of the site shows its title card for a few seconds', () => {
    vi.useFakeTimers();
    const hud = createHud(document.body);
    hud.showZone(siteScore(talk(createState(), [3])).levels[1]);
    const card = document.querySelector('.sw-zone');
    expect(card.hidden).toBe(false);
    expect(card.querySelector('.sw-zone-kicker').textContent).toBe('Level 2');
    expect(card.querySelector('.sw-zone-title').textContent).toBe('Structure');
    expect(card.querySelector('.sw-zone-sub').textContent).toBe('Main building · 1 of 5 done');
    expect(card.querySelector('.sw-zone-stars').textContent).toBe('★☆☆');
    expect(document.querySelector('.sw-zone-live').textContent).toBe('Level 2, Structure. Main building. 1 of 5 objectives done.');
    vi.advanceTimersByTime(4000);
    expect(card.hidden).toBe(true);
  });
});

describe('level board', () => {
  let onGo, onClose, board;
  beforeEach(() => {
    onGo = vi.fn(); onClose = vi.fn();
    board = createLevelBoard(document.body, { onGo, onClose });
  });

  test('lists all four levels with their stars, progress and status', () => {
    board.open(siteScore(talk(levelOneDone(), [3])));
    const cards = [...document.querySelectorAll('.sw-lb-card')];
    expect(cards).toHaveLength(4);
    expect(cards[0].querySelector('.sw-lb-title').textContent).toBe('Preconstruction');
    expect(cards[0].querySelector('.sw-lb-stars').textContent).toBe('★★★');
    expect(cards[0].querySelector('.sw-lb-status').textContent).toBe('Complete');
    expect(cards[1].querySelector('.sw-lb-status').textContent).toBe('Current level');
    expect(cards[1].querySelector('.sw-lb-progress').textContent).toBe('1 of 5');
    expect(cards[2].querySelector('.sw-lb-status').textContent).toBe('Not started');
    expect(cards[0].querySelector('[data-level]')).toBeNull();
    cards[2].querySelector('[data-level]').click();
    expect(onGo).toHaveBeenCalledWith('level:3');
    expect(document.querySelector('.sw-lb-banner')).toBeNull();          // opened by hand: no celebration
  });

  test('after a level is finished it celebrates and offers the next level', () => {
    board.open(siteScore(levelOneDone()), { completed: 1 });
    expect(document.querySelector('.sw-lb-banner').textContent).toContain('Level 1 complete');
    expect(document.querySelector('.sw-lb-banner').textContent).toContain('+250 level bonus');
    expect(document.activeElement.textContent).toBe('Start level 2 →');
    document.activeElement.click();
    expect(onGo).toHaveBeenCalledWith('level:2');
  });

  test('when every level is done it sends you to the site office for your results', () => {
    board.open(siteScore(everything()), { completed: 4 });
    expect(document.querySelector('.sw-lb-banner').textContent).toContain('Site walk complete');
    expect(document.querySelector('.sw-lb-banner').textContent).toContain('12 of 12 stars');
    document.querySelector('[data-go="office"]').click();
    expect(onGo).toHaveBeenCalledWith('office');
  });

  test('Escape or the close button closes it', () => {
    board.open(siteScore(createState()));
    expect(board.isOpen()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    document.querySelector('.sw-lb [data-close]').click();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
