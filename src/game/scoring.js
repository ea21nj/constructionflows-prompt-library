// How well each agent fits, from the visitor's answers. Answers run 0 (fine) to 3 (hurts),
// so an agent's fit is the sum of its three answers (0–9).
import { CREW } from './content.js';
import { isComplete } from './state.js';

export function fit(state, agentId) {
  return (state.answers[agentId] || []).reduce((n, c) => n + (Number.isInteger(c) ? c : 0), 0);
}

function why(state, member) {
  return (state.answers[member.agentId] || [])
    .map((choice, i) => ({ choice, i }))
    .filter(({ choice }) => choice >= 2)
    .sort((a, b) => b.choice - a.choice || a.i - b.i)
    .slice(0, 2)
    .sort((a, b) => a.i - b.i)
    .map(({ choice, i }) => `${member.questions[i].q} — ${member.questions[i].answers[choice]}`);
}

export function rank(state, crew = CREW) {
  return crew
    .filter((m) => state.answers[m.agentId])
    .map((m) => ({ agentId: m.agentId, name: m.name, role: m.role, fit: fit(state, m.agentId), complete: isComplete(state, m.agentId), why: why(state, m), t: state.lastTalked[m.agentId] || 0 }))
    .sort((a, b) => (b.complete - a.complete) || (b.fit - a.fit) || (b.t - a.t))
    .map(({ t, ...rest }) => rest);
}
