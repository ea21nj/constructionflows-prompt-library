import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createTalk } from '../../src/game/ui/talk.js';
import { createHud } from '../../src/game/ui/hud.js';
import { createState, recordAnswer } from '../../src/game/state.js';
import { CREW } from '../../src/game/content.js';

const maria = CREW.find((c) => c.agentId === 1);
const member = { agentId: 1, data: maria };
let root, calls, talk;
beforeEach(() => {
  document.documentElement.classList.add('site-walk-on');
  talk?.close();
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

  test('keys are ignored on the classic pages and while typing in a field', () => {
    talk.open(member, createState());
    document.documentElement.classList.remove('site-walk-on');
    key('2');
    document.documentElement.classList.add('site-walk-on');
    root.insertAdjacentHTML('beforeend', '<textarea id="t"></textarea>');
    const t = root.querySelector('#t'); t.focus();
    t.dispatchEvent(new KeyboardEvent('keydown', { key: '3', code: 'Digit3', bubbles: true }));
    expect(calls.onAnswer).not.toHaveBeenCalled();
  });

  test('screen readers get the whole line at once, not the typing', () => {
    talk.close();
    const typing = createTalk(root, { ...calls, instant: false });
    typing.open(member, createState());
    const panel = root.querySelectorAll('.sw-talk')[1];
    const sr = panel.querySelector('.sw-talk-sr');
    expect(sr.textContent).toBe(`Hey, I'm Maria. ${maria.questions[0].q}`);
    expect(sr.getAttribute('aria-live')).toBe('polite');
    expect(panel.getAttribute('aria-labelledby')).toBe(sr.id);
    expect(panel.querySelector('.sw-talk-say').getAttribute('aria-hidden')).toBe('true');
    typing.close();
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
    expect(document.querySelector('.sw-objective').textContent).toBe('Site office opens after 3 talks · 0 of 3');
    [1, 2].forEach((id) => [0, 1, 2].forEach((i) => { s = recordAnswer(s, id, i, 1); }));
    hud.setObjective(s);
    expect(document.querySelector('.sw-objective').textContent).toBe('Site office opens after 3 talks · 2 of 3');
    [0, 1, 2].forEach((i) => { s = recordAnswer(s, 3, i, 1); });
    hud.setObjective(s);
    expect(document.querySelector('.sw-objective').textContent).toBe('Site office is open — head there');
  });

  test('prompt is a big Talk button naming the nearby worker, on every device', () => {
    const onTalk = vi.fn();
    const hud = createHud(document.body, { onTalk });
    hud.setPrompt(member);
    expect(document.querySelector('.sw-sr-live').textContent).toBe('Maria, Bid Desk, is nearby. Use the Talk button.');
    const btn = document.querySelector('.sw-prompt button');
    expect(btn.textContent).toBe('Talk to Maria');
    btn.click();
    expect(onTalk).toHaveBeenCalled();
    hud.setPrompt(null);
    expect(document.querySelector('.sw-prompt').hidden).toBe(true);
  });

  test('the site audit tracker counts sections and opens the scorecard', () => {
    const onScorecard = vi.fn();
    const hud = createHud(document.body, { onScorecard });
    hud.setAudit(2);
    const btn = document.querySelector('.sw-audit-tracker');
    expect(btn.textContent.replace(/\s+/g, ' ').trim()).toBe('Site audit · 2 of 7 →');
    btn.click();
    expect(onScorecard).toHaveBeenCalled();
  });

  test('prompt names a nearby audit checkpoint', () => {
    const hud = createHud(document.body);
    hud.setPrompt({ section: { id: 'scheduling', title: 'Scheduling' } });
    expect(document.querySelector('.sw-prompt button').textContent).toBe('Audit Scheduling');
    expect(document.querySelector('.sw-sr-live').textContent).toBe('Scheduling audit checkpoint is nearby. Use the Audit button.');
  });

  test('the clipboard starts folded away so the site stays clear', () => {
    createHud(document.body);
    expect(document.querySelector('.sw-clip').open).toBe(false);
  });

  test('clipboard rows take you back to that crew member', () => {
    const onPickAgent = vi.fn();
    const hud = createHud(document.body, { onPickAgent });
    hud.updateClipboard([{ agentId: 5, name: 'Luis', role: 'Field-to-Office Evidence', fit: 7, complete: true, why: [] }], 1);
    const row = document.querySelector('.sw-clip-row button');
    expect(row.getAttribute('aria-label')).toBe('Go to Luis, Field-to-Office Evidence');
    row.click();
    expect(onPickAgent).toHaveBeenCalledWith(5);
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
