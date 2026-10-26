// The site score: points, ranks and objectives, all worked out from the visitor's progress so they
// can never drift out of step with it.
import { CREW } from './content.js';
import { completedCount, auditCompleted, OFFICE_UNLOCK } from './state.js';

export const POINTS = { crew: 100, audit: 150, office: 200, report: 100, crewAll: 300, auditAll: 300 };
const CREW_TOTAL = CREW.length, AUDIT_TOTAL = 7;
export const MAX_POINTS = CREW_TOTAL * POINTS.crew + AUDIT_TOTAL * POINTS.audit + POINTS.office + POINTS.report + POINTS.crewAll + POINTS.auditAll;
export const RANKS = [
  { name: 'Visitor', at: 0 },
  { name: 'Apprentice', at: 250 },
  { name: 'Foreman', at: 800 },
  { name: 'Superintendent', at: 1600 },
  { name: 'Project Executive', at: 2500 },
];

export function siteScore(state) {
  const crew = completedCount(state), audits = auditCompleted(state);
  const points = crew * POINTS.crew + audits * POINTS.audit
    + (state.officeSeen ? POINTS.office : 0) + (state.reportSaved ? POINTS.report : 0)
    + (crew >= CREW_TOTAL ? POINTS.crewAll : 0) + (audits >= AUDIT_TOTAL ? POINTS.auditAll : 0);
  const objective = (id, label, count, goal, hint) => ({ id, label, count: Math.min(count, goal), goal, done: count >= goal, hint });
  const objectives = [
    objective('crew3', 'Talk to 3 crew', crew, OFFICE_UNLOCK, 'Opens the site office'),
    objective('office', 'Visit the site office', state.officeSeen ? 1 : 0, 1, 'See your ranked agents'),
    objective('audit1', 'Finish an audit section', audits, 1, 'Find an orange checkpoint'),
    objective('audit7', 'Audit all 7 checkpoints', audits, AUDIT_TOTAL, `+${POINTS.auditAll} bonus`),
    objective('crew10', 'Meet the whole crew', crew, CREW_TOTAL, `+${POINTS.crewAll} bonus`),
    objective('report', 'Take your results with you', state.reportSaved ? 1 : 0, 1, 'Download, copy or print a report'),
  ];
  const r = RANKS.filter((k) => points >= k.at).length - 1;
  const rank = RANKS[r], next = RANKS[r + 1] || null;
  return {
    points, max: MAX_POINTS, rank: rank.name,
    nextRank: next?.name ?? null, toNext: next ? next.at - points : 0,
    progress: next ? (points - rank.at) / (next.at - rank.at) : 1,
    objectives, completed: objectives.filter((o) => o.done).length, total: objectives.length,
  };
}

// What changed between two states, for the "+100", "Objective complete" and "Promoted" moments.
export function scoreChange(before, after) {
  const a = siteScore(before), b = siteScore(after);
  const wasDone = new Set(a.objectives.filter((o) => o.done).map((o) => o.id));
  return {
    gained: b.points - a.points,
    completedNow: b.objectives.filter((o) => o.done && !wasDone.has(o.id)).map((o) => o.label),
    rankUp: b.rank !== a.rank && b.points > a.points ? b.rank : null,
  };
}
