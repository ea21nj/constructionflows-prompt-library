import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUDIT_SECTIONS } from '../../src/game/audit-content.js';
import { sectionPoints, band, auditSummary, auditMarkdown, auditHtml } from '../../src/game/audit.js';
import { createState, recordAuditAnswer, auditCompleted, loadState, STORAGE_KEY } from '../../src/game/state.js';
import { createAuditPanel } from '../../src/game/ui/audit-panel.js';
import { createScorecard } from '../../src/game/ui/scorecard.js';
import { blocked } from '../../src/game/collision.js';
import { CREW } from '../../src/game/content.js';

const answerAll = (s, id, choices) => choices.reduce((acc, c, i) => recordAuditAnswer(acc, id, i, c), s);
const memory = (initial) => { const data = { ...initial }; return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } }; };

describe('audit content', () => {
  test('7 sections of 5 questions with A–D answers (35 in all), copy as supplied', () => {
    expect(AUDIT_SECTIONS.map((s) => s.title)).toEqual(['Bidding & Pipeline', 'Project Kickoff', 'Scheduling', 'RFIs & Submittals', 'Project Visibility', 'Field Execution', 'Closeout']);
    for (const s of AUDIT_SECTIONS) {
      expect(s.questions).toHaveLength(5);
      s.questions.forEach((q) => { expect(q.answers).toHaveLength(4); expect(q.dim).toBeTruthy(); });
    }
    expect(AUDIT_SECTIONS[0].questions[0].q).toBe('How easily can your team see the current status of every active bid?');
    expect(AUDIT_SECTIONS[6].questions[4].answers[3]).toBe('Frequently delayed in a way that affects cash flow');
  });

  test('checkpoints stand on free ground, away from the crew and from each other', () => {
    for (const s of AUDIT_SECTIONS) {
      expect(blocked(...s.spot), s.id).toBe(false);
      for (const c of CREW) for (const p of c.route) expect(Math.hypot(p[0] - s.spot[0], p[1] - s.spot[1]), `${s.id} vs ${c.name}`).toBeGreaterThan(3.5);
      for (const o of AUDIT_SECTIONS) if (o !== s) expect(Math.hypot(o.spot[0] - s.spot[0], o.spot[1] - s.spot[1])).toBeGreaterThan(8);
    }
  });
});

describe('audit scoring', () => {
  test('A = 3 points down to D = 0; a section is out of 15 and only scores when complete', () => {
    expect(sectionPoints([0, 0, 0, 0, 0])).toBe(15);
    expect(sectionPoints([3, 3, 3, 3, 3])).toBe(0);
    expect(sectionPoints([1, 1, 1, 2, 2])).toBe(8);
    expect(sectionPoints([0, 0])).toBe(null);
  });

  test('bands: Strong 12+, Fair 8–11, Weak 4–7, At risk 0–3', () => {
    expect([15, 12, 11, 8, 7, 4, 3, 0].map((p) => band(p))).toEqual(['Strong', 'Strong', 'Fair', 'Fair', 'Weak', 'Weak', 'At risk', 'At risk']);
  });

  test('summary rates each finished section, lists C/D answers as gaps, and scores overall', () => {
    let s = answerAll(createState(), 'bidding', [0, 2, 3, 1, 0]);   // 3+1+0+2+3 = 9 → Fair
    s = answerAll(s, 'closeout', [3, 3, 2, 3, 3]);                  // 1 → At risk
    s = recordAuditAnswer(s, 'field', 0, 1);                         // unfinished
    const sum = auditSummary(s);
    const bidding = sum.sections.find((x) => x.id === 'bidding');
    expect(bidding).toMatchObject({ done: true, points: 9, band: 'Fair' });
    expect(bidding.gaps.map((g) => `${g.dim}: ${g.answer}`)).toEqual([
      'Process: Someone remembers to follow up based on experience or habit',
      'Failure Mode: They often go unnoticed until the opportunity is already cold or lost',
    ]);
    expect(sum.sections.find((x) => x.id === 'field')).toMatchObject({ done: false, answered: 1 });
    expect(sum.completed).toBe(2);
    expect(sum.overall).toMatchObject({ points: 10, max: 30, percent: 33, band: 'Weak' });
  });

  test('no overall score before any section is finished', () => {
    expect(auditSummary(createState()).overall).toBe(null);
  });
});

describe('audit progress', () => {
  test('answers are stored per section without mutating, and completed sections are counted', () => {
    const s0 = createState();
    const s1 = recordAuditAnswer(s0, 'rfis', 0, 2);
    expect(s0.audit).toEqual({});
    expect(s1.audit.rfis).toEqual([2]);
    expect(auditCompleted(answerAll(s1, 'rfis', [2, 2, 2, 2, 2]))).toBe(1);
  });

  test('saved audit answers survive a reload; bad ones are dropped; old saves without an audit still load', () => {
    const raw = { v: 1, answers: {}, lastTalked: {}, officeSeen: false, audit: { bidding: [0, 1, 2], nope: [1], closeout: [9] } };
    expect(loadState(memory({ [STORAGE_KEY]: JSON.stringify(raw) })).audit).toEqual({ bidding: [0, 1, 2] });
    const old = { v: 1, answers: { 1: [1, 1, 1] }, lastTalked: {}, officeSeen: false };
    expect(loadState(memory({ [STORAGE_KEY]: JSON.stringify(old) })).audit).toEqual({});
  });
});

describe('audit report', () => {
  test('markdown has the overall score, each section rating and every answer', () => {
    const s = answerAll(createState(), 'scheduling', [0, 0, 1, 0, 0]);
    const md = auditMarkdown(s, new Date('2026-10-26T12:00:00Z'));
    expect(md.startsWith('# Site audit scorecard')).toBe(true);
    expect(md).toContain('## Scheduling — Strong (14 / 15)');
    expect(md).toContain('**Visibility · When the schedule changes, how visible is that update to the people affected?**');
    expect(md).toContain('A — The update is visible immediately to everyone who needs it');
    expect(md).toContain('## Closeout — Not audited yet');
  });

  test('print/Word markup uses the print layout', () => {
    const html = auditHtml(answerAll(createState(), 'kickoff', [3, 3, 3, 3, 3]), new Date('2026-10-26T12:00:00Z'));
    expect(html).toContain('class="pr-qa"');
    expect(html).toContain('At risk');
  });
});

describe('audit panel', () => {
  let root, calls, panel;
  const section = AUDIT_SECTIONS[0];
  beforeEach(() => {
    document.documentElement.classList.add('site-walk-on');
    document.body.innerHTML = '<div id="r"></div>';
    root = document.getElementById('r');
    calls = { onAnswer: vi.fn(), onLeave: vi.fn(), onRedo: vi.fn(), onScorecard: vi.fn() };
    panel = createAuditPanel(root, { ...calls, instant: true });
  });
  afterEach(() => panel.close());
  const key = (k, code) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true, cancelable: true }));

  test('asks the next unanswered question with its dimension and A–D answers', () => {
    panel.open(section, recordAuditAnswer(createState(), 'bidding', 0, 1));
    expect(root.querySelector('.sw-audit-who').textContent).toBe('SITE AUDIT · BIDDING & PIPELINE');
    expect(root.querySelector('.sw-audit-step').textContent).toBe('2 / 5 · Process');
    expect(root.querySelector('.sw-audit-q').textContent).toBe(section.questions[1].q);
    expect([...root.querySelectorAll('.sw-audit-answers .k')].map((k) => k.textContent)).toEqual(['A', 'B', 'C', 'D']);
  });

  test('click, 1–4 and A–D all answer', () => {
    panel.open(section, createState());
    root.querySelectorAll('.sw-audit-answers button')[1].click();
    expect(calls.onAnswer).toHaveBeenLastCalledWith('bidding', 0, 1);
    key('3', 'Digit3'); expect(calls.onAnswer).toHaveBeenLastCalledWith('bidding', 0, 2);
    key('d', 'KeyD'); expect(calls.onAnswer).toHaveBeenLastCalledWith('bidding', 0, 3);
  });

  test('a finished section shows its rating and gaps, with redo and scorecard', () => {
    panel.open(section, answerAll(createState(), 'bidding', [0, 2, 3, 1, 0]));
    expect(root.querySelector('.sw-audit-result').textContent).toContain('Fair · 9 of 15');
    expect(root.querySelectorAll('.sw-audit-gaps li')).toHaveLength(2);
    root.querySelector('[data-redo]').click(); expect(calls.onRedo).toHaveBeenCalledWith('bidding');
    root.querySelector('[data-scorecard]').click(); expect(calls.onScorecard).toHaveBeenCalled();
  });

  test('Esc leaves', () => {
    panel.open(section, createState());
    key('Escape', 'Escape');
    expect(calls.onLeave).toHaveBeenCalled();
  });
});

describe('scorecard', () => {
  let root, calls, card;
  beforeEach(() => {
    document.documentElement.classList.add('site-walk-on');
    document.body.innerHTML = '<div id="r"></div>';
    root = document.getElementById('r');
    calls = { onClose: vi.fn(), onGoTo: vi.fn() };
    card = createScorecard(root, calls);
  });
  afterEach(() => card.close());

  test('lists all 7 sections with ratings or a way to go and audit them', () => {
    card.open(answerAll(createState(), 'rfis', [1, 1, 1, 1, 1]));
    const rows = [...root.querySelectorAll('.sw-score-row')];
    expect(rows).toHaveLength(7);
    expect(rows[3].textContent).toContain('Fair');
    expect(rows[0].textContent).toContain('Not audited yet');
    rows[0].querySelector('[data-goto]').click();
    expect(calls.onGoTo).toHaveBeenCalledWith('bidding');
    expect(root.querySelector('.sw-score-overall').textContent).toContain('Fair');
    expect(root.querySelector('.sw-score-overall').textContent).toContain('1 of 7 sections');
  });

  test('offers the audit report as Word, Markdown, copy and print', () => {
    card.open(createState());
    expect([...root.querySelectorAll('[data-audit-report]')].map((b) => b.dataset.auditReport)).toEqual(['word', 'md', 'copy', 'print']);
  });
});
