import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportMarkdown, reportHtml } from '../../src/game/report.js';
import { createResults } from '../../src/game/ui/results.js';
import { createState, recordAnswer } from '../../src/game/state.js';
import { CREW } from '../../src/game/content.js';

const AGENTS = CREW.map((c) => ({ id: c.agentId, name: `${c.role} Agent`, implementationPackage: [`Set up ${c.role}`], roi: [`Less ${c.role} admin`] }));
const finish = (s, id, choices, t) => choices.reduce((acc, c, i) => recordAnswer(acc, id, i, c, t), s);
const DATE = new Date('2026-10-25T12:00:00Z');

function sample() {
  let s = finish(createState(), 1, [3, 3, 2], 1);     // Bid Desk, fit 8
  s = finish(s, 5, [1, 1, 1], 2);                      // Field, fit 3
  s = finish(s, 9, [2, 2, 2], 3);                      // Safety, fit 6
  s = recordAnswer(s, 4, 0, 3, 4);                     // RFI, unfinished
  return s;
}

describe('report', () => {
  test('markdown lists ranked agents with every question and answer', () => {
    const md = reportMarkdown(sample(), { agents: AGENTS }, DATE);
    expect(md.startsWith('# Site walk results')).toBe(true);
    expect(md).toContain('2026-10-25');
    const bid = CREW.find((c) => c.agentId === 1);
    expect(md).toContain(`**${bid.questions[0].q}**`);
    expect(md).toContain(bid.questions[0].answers[3]);
    expect(md.indexOf('Bid Desk Agent')).toBeLessThan(md.indexOf('Safety / Compliance Agent'));
    expect(md.indexOf('Safety / Compliance Agent')).toBeLessThan(md.indexOf('Field-to-Office Evidence Agent'));
    expect(md).toContain('_Not answered_');           // the unfinished RFI conversation
  });

  test('html escapes anything that looks like markup', () => {
    const agents = AGENTS.map((a) => (a.id === 1 ? { ...a, name: '<script>alert(1)</script>' } : a));
    const html = reportHtml(sample(), { agents }, DATE);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('class="pr-qa"');
  });
});

describe('results board', () => {
  let root, calls, board;
  beforeEach(() => {
    document.body.innerHTML = '<div id="r"></div>';
    root = document.getElementById('r');
    calls = { onClose: vi.fn(), onOpenDetails: vi.fn(), onClassic: vi.fn(), onMeet: vi.fn() };
    board = createResults(root, { agents: AGENTS, ...calls });
  });
  afterEach(() => board.close());

  test('ranks complete agents and shows the start-here step for the top one', () => {
    board.open(sample());
    expect(root.querySelector('.sw-results h2').textContent).toBe('Your results');
    expect(root.querySelector('.sw-results-met').textContent).toBe('3 of 10 crew met');
    expect([...root.querySelectorAll('.sw-rank-name')].map((n) => n.textContent)).toEqual(['Bid Desk Agent', 'Safety / Compliance Agent', 'Field-to-Office Evidence Agent']);
    expect(root.querySelector('.sw-start-here').textContent).toContain('Set up Bid Desk');
    expect(root.querySelector('.sw-start-here').textContent).toContain('Less Bid Desk admin');
  });

  test('lists crew not yet met, each one a way to go and meet them', () => {
    board.open(sample());
    expect(root.querySelectorAll('.sw-unmet li')).toHaveLength(7);
    const first = root.querySelector('.sw-unmet [data-meet]');
    first.click();
    expect(calls.onMeet).toHaveBeenCalledWith(Number(first.dataset.meet));
  });

  test('View details asks for that agent', () => {
    board.open(sample());
    root.querySelectorAll('[data-details]')[1].click();
    expect(calls.onOpenDetails).toHaveBeenCalledWith(9, expect.any(HTMLElement));
  });

  test('Tab is left alone while the agent details dialog is open over the board', () => {
    // jsdom has no layout: pretend every element is rendered so the focus trap sees the buttons.
    const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return document.body; } });
    board.open(sample());
    document.body.insertAdjacentHTML('beforeend', '<div id="agentDialog"><button id="inDialog">Tab me</button></div>');
    document.body.classList.add('dialog-open');
    document.getElementById('inDialog').focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.getElementById('inDialog').dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    document.body.classList.remove('dialog-open');
    document.getElementById('agentDialog').remove();
    // Without the dialog, the same Tab from outside is pulled back into the board.
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    const tab2 = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    outside.dispatchEvent(tab2);
    expect(tab2.defaultPrevented).toBe(true);
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', desc);
  });

  test('Back to the site and Esc close it', () => {
    board.open(sample());
    root.querySelector('[data-back]').click();
    expect(calls.onClose).toHaveBeenCalledTimes(1);
    board.open(sample());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(calls.onClose).toHaveBeenCalledTimes(2);
  });
});
