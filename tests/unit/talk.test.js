import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createTalk } from '../../src/game/ui/talk.js';
import { createHud } from '../../src/game/ui/hud.js';
import { createState, recordAnswer } from '../../src/game/state.js';
import { CREW } from '../../src/game/content.js';

const maria = CREW.find((c) => c.agentId === 1);
const member = { agentId: 1, data: maria };
let root, calls, talk;
beforeEach(() => {
  document.body.innerHTML = '<div id="r"></div>';
  root = document.getElementById('r');
  calls = { onAnswer: vi.fn(), onLeave: vi.fn(), onRestart: vi.fn() };
  talk = createTalk(root, { ...calls, instant: true });
});
const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: /\d/.test(k) ? `Digit${k}` : k, bubbles: true }));

describe('talk panel', () => {
  test('opens on the first unanswered question with the crew member introducing themselves', () => {
    talk.open(member, createState());
    expect(talk.isOpen()).toBe(true);
    expect(root.querySelector('.sw-talk-who').textContent).toBe('MARIA · BID DESK');
    expect(root.querySelector('.sw-talk-step').textContent).toBe('1 / 3');
    expect(root.querySelector('.sw-talk-say').textContent).toBe(`Hey, I'm Maria. ${maria.questions[0].q}`);
    const answers = [...root.querySelectorAll('.sw-talk-answers button')].map((b) => b.textContent.trim());
    expect(answers).toEqual(maria.questions[0].answers.map((a, i) => `${i + 1}${a}`));
  });

  test('answer buttons and keys 1–4 call onAnswer with the question and choice index', () => {
    talk.open(member, createState());
    root.querySelectorAll('.sw-talk-answers button')[2].click();
    expect(calls.onAnswer).toHaveBeenCalledWith(1, 0, 2);
    key('4');
    expect(calls.onAnswer).toHaveBeenLastCalledWith(1, 0, 3);
  });

  test('later questions are asked plainly', () => {
    talk.open(member, recordAnswer(createState(), 1, 0, 1));
    expect(root.querySelector('.sw-talk-step').textContent).toBe('2 / 3');
    expect(root.querySelector('.sw-talk-say').textContent).toBe(maria.questions[1].q);
  });

  test('after the third answer it signs off, and mentions the office when it just opened', () => {
    let s = createState();
    [0, 1, 2].forEach((i) => { s = recordAnswer(s, 1, i, 2); });
    talk.open(member, s, { unlocked: true });
    expect(root.querySelector('.sw-talk-say').textContent).toBe('Thanks — that helps. I\'ll put together what an agent could take off your plate. The site office is open — head over when you\'re ready.');
    expect([...root.querySelectorAll('.sw-talk-answers button')].map((b) => b.textContent.trim())).toEqual(['Keep walking', 'Go over it again']);
    root.querySelector('[data-restart]').click();
    expect(calls.onRestart).toHaveBeenCalledWith(1);
  });

  test('Esc and the close button call onLeave', () => {
    talk.open(member, createState());
    key('Escape');
    expect(calls.onLeave).toHaveBeenCalledTimes(1);
    root.querySelector('.sw-talk-close').click();
    expect(calls.onLeave).toHaveBeenCalledTimes(2);
  });

  test('keys do nothing while closed', () => {
    key('2');
    expect(calls.onAnswer).not.toHaveBeenCalled();
  });
});

describe('hud', () => {
  test('objective counts conversations, then points to the office', () => {
    const hud = createHud(document.body);
    let s = createState();
    hud.setObjective(s);
    expect(document.querySelector('.sw-objective').textContent).toBe('Talk to the crew · 0 of 3');
    [1, 2].forEach((id) => [0, 1, 2].forEach((i) => { s = recordAnswer(s, id, i, 1); }));
    hud.setObjective(s);
    expect(document.querySelector('.sw-objective').textContent).toBe('Talk to the crew · 2 of 3');
    [0, 1, 2].forEach((i) => { s = recordAnswer(s, 3, i, 1); });
    hud.setObjective(s);
    expect(document.querySelector('.sw-objective').textContent).toBe('Site office is open — head there');
  });

  test('prompt names the nearby worker for keyboard and touch', () => {
    const onTalk = vi.fn();
    const hud = createHud(document.body, { onTalk });
    hud.setPrompt(member, false);
    expect(document.querySelector('.sw-prompt').textContent.replace(/\s+/g, ' ').trim()).toBe('Press E to talk to Maria — Bid Desk');
    hud.setPrompt(member, true);
    const btn = document.querySelector('.sw-prompt button');
    expect(btn.textContent).toBe('Talk to Maria');
    btn.click();
    expect(onTalk).toHaveBeenCalled();
    hud.setPrompt(null);
    expect(document.querySelector('.sw-prompt').hidden).toBe(true);
  });

  test('clipboard lists met agents with fit bars', () => {
    const hud = createHud(document.body);
    hud.updateClipboard([{ agentId: 1, name: 'Maria', role: 'Bid Desk', fit: 6, complete: true, why: [] }], 1);
    const row = document.querySelector('.sw-clip-row');
    expect(row.textContent).toContain('Bid Desk');
    expect(row.querySelector('.sw-clip-bar i').style.width).toBe('67%');
    expect(document.querySelector('.sw-clip-count').textContent).toBe('1 of 10 met');
  });
});
