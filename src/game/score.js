// The site score: points, ranks, levels and stars, all worked out from the visitor's progress so
// they can never drift out of step with it.
import { CREW } from './content.js';
import { AUDIT_SECTIONS } from './audit-content.js';
import { isComplete } from './state.js';
import { LEVELS, starsFor } from './levels.js';

export const POINTS = { crew: 100, audit: 150, office: 200, report: 100, level: 250 };
export const MAX_POINTS = CREW.length * POINTS.crew + AUDIT_SECTIONS.length * POINTS.audit
  + POINTS.office + POINTS.report + LEVELS.length * POINTS.level;
export const RANKS = [
  { name: 'Visitor', at: 0 },
  { name: 'Apprentice', at: 400 },
  { name: 'Foreman', at: 900 },
  { name: 'Superintendent', at: 1800 },
  { name: 'Project Executive', at: 2800 },
];

const crewName = (id) => CREW.find((c) => c.agentId === id).name;
const section = (id) => AUDIT_SECTIONS.find((s) => s.id === id);
const auditDone = (state, id) => ((state.audit || {})[id] || []).length >= section(id).questions.length;

// Every objective in a level, in the order the level suggests doing them. go says where to head.
function levelTasks(level, state) {
  return [
    ...level.crew.map((id) => ({ id: `crew:${id}`, label: `Talk to ${crewName(id)}`, done: isComplete(state, id), points: POINTS.crew })),
    ...level.audits.map((id) => ({ id: `audit:${id}`, label: `Audit ${section(id).title}`, done: auditDone(state, id), points: POINTS.audit })),
    ...level.extras.map((id) => (id === 'office'
      ? { id, label: 'Visit the site office', done: !!state.officeSeen, points: POINTS.office }
      : { id, label: 'Take your results with you', done: !!state.reportSaved, points: POINTS.report })),
  ].map((t) => ({ ...t, go: t.id }));
}

export function siteScore(state) {
  const levels = LEVELS.map((l) => {
    const tasks = levelTasks(l, state);
    const done = tasks.filter((t) => t.done).length;
    return { number: l.number, id: l.id, title: l.title, zone: l.zone, tasks, done, total: tasks.length, stars: starsFor(done, tasks.length), complete: done === tasks.length };
  });
  const objectives = levels.flatMap((l) => l.tasks);
  const points = objectives.reduce((sum, t) => sum + (t.done ? t.points : 0), 0)
    + levels.filter((l) => l.complete).length * POINTS.level;
  const r = RANKS.filter((k) => points >= k.at).length - 1;
  const rank = RANKS[r], next = RANKS[r + 1] || null;
  return {
    points, max: MAX_POINTS, rank: rank.name,
    nextRank: next?.name ?? null, toNext: next ? next.at - points : 0,
    progress: next ? (points - rank.at) / (next.at - rank.at) : 1,
    levels,
    current: levels.find((l) => !l.complete) || levels[levels.length - 1],
    allComplete: levels.every((l) => l.complete),
    stars: levels.reduce((sum, l) => sum + l.stars, 0), maxStars: levels.length * 3,
    objectives, completed: objectives.filter((o) => o.done).length, total: objectives.length,
  };
}

// What changed between two states, for the "+100", "Objective complete", star, level and
// promotion moments.
export function scoreChange(before, after) {
  const a = siteScore(before), b = siteScore(after);
  const wasDone = new Set(a.objectives.filter((o) => o.done).map((o) => o.id));
  const justComplete = b.levels.find((l, i) => l.complete && !a.levels[i].complete);
  return {
    gained: b.points - a.points,
    completedNow: b.objectives.filter((o) => o.done && !wasDone.has(o.id)).map((o) => o.label),
    levelComplete: justComplete ? justComplete.number : null,
    starsUp: b.levels.filter((l, i) => l.stars > a.levels[i].stars).map((l) => ({ number: l.number, title: l.title, stars: l.stars })),
    rankUp: b.rank !== a.rank && b.points > a.points ? b.rank : null,
  };
}
