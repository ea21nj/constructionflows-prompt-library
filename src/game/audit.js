// Site audit scoring and report. Each answer earns A = 3 down to D = 0 points; a section is out of 15.
import { AUDIT_SECTIONS } from './audit-content.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function sectionPoints(choices = []) {
  if (choices.length < 5 || !choices.every(Number.isInteger)) return null;
  return choices.reduce((n, c) => n + (3 - c), 0);
}

// Strong 12+, Fair 8–11, Weak 4–7, At risk 0–3 (scaled when scoring more than one section).
export function band(points, max = 15) {
  const scaled = (points * 15) / max;
  if (scaled >= 12) return 'Strong';
  if (scaled >= 8) return 'Fair';
  if (scaled >= 4) return 'Weak';
  return 'At risk';
}

export function auditSummary(state) {
  const sections = AUDIT_SECTIONS.map((s) => {
    const choices = (state.audit || {})[s.id] || [];
    const points = sectionPoints(choices);
    return {
      id: s.id, title: s.title, where: s.where, answered: choices.length, done: points !== null,
      points, band: points === null ? null : band(points),
      gaps: choices.map((c, i) => ({ c, i })).filter(({ c }) => c >= 2)
        .map(({ c, i }) => ({ n: i + 1, dim: s.questions[i].dim, q: s.questions[i].q, answer: s.questions[i].answers[c], letter: LETTERS[c] })),
    };
  });
  const done = sections.filter((s) => s.done);
  const points = done.reduce((n, s) => n + s.points, 0), max = done.length * 15;
  return {
    sections, completed: done.length,
    overall: done.length ? { points, max, percent: Math.round((points / max) * 100), band: band(points, max) } : null,
  };
}

export function auditMarkdown(state, date = new Date()) {
  const sum = auditSummary(state);
  const lines = ['# Site audit scorecard', '', `${date.toISOString().slice(0, 10)} · ${sum.completed} of 7 sections audited`];
  if (sum.overall) lines.push('', `**Overall: ${sum.overall.band} — ${sum.overall.points} / ${sum.overall.max} (${sum.overall.percent}%)**`);
  lines.push('');
  AUDIT_SECTIONS.forEach((s, k) => {
    const r = sum.sections[k];
    lines.push(r.done ? `## ${s.title} — ${r.band} (${r.points} / 15)` : `## ${s.title} — Not audited yet`, '');
    s.questions.forEach((q, i) => {
      const c = (state.audit || {})[s.id]?.[i];
      lines.push(`**${q.dim} · ${q.q}**`, '', Number.isInteger(c) ? `${LETTERS[c]} — ${q.answers[c]}` : '_Not answered_', '');
    });
  });
  return lines.join('\n');
}

export function auditHtml(state, date = new Date()) {
  const sum = auditSummary(state);
  return `
    <div class="pr-bar"></div>
    <p class="pr-kicker">Workflow Playbook · Site walk</p>
    <h1>Site audit scorecard</h1>
    <table class="pr-meta"><tr><th>Date</th><td>${esc(date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))}</td></tr>
      <tr><th>Sections</th><td>${sum.completed} of 7 audited</td></tr>
      ${sum.overall ? `<tr><th>Overall</th><td>${sum.overall.band} — ${sum.overall.points} / ${sum.overall.max} (${sum.overall.percent}%)</td></tr>` : ''}</table>
    <table class="pr-summary"><thead><tr><th>Section</th><th style="text-align:right">Rating</th></tr></thead>
      <tbody>${sum.sections.map((r) => `<tr><td>${esc(r.title)}</td><td class="num">${r.done ? `${r.band} · ${r.points} / 15` : 'Not audited'}</td></tr>`).join('')}</tbody></table>
    ${AUDIT_SECTIONS.map((s, k) => {
      const r = sum.sections[k];
      return `<section><h2>${k + 1}. ${esc(s.title)}<small>${r.done ? `${r.band} · ${r.points} / 15` : 'not audited'}</small></h2>
        ${s.questions.map((q, i) => { const c = (state.audit || {})[s.id]?.[i]; return `<div class="pr-qa"><span class="pr-n">Q${k * 5 + i + 1}</span><div><p class="pr-q">${esc(q.dim)} · ${esc(q.q)}</p>${Number.isInteger(c) ? `<p class="pr-a">${LETTERS[c]} — ${esc(q.answers[c])}</p>` : '<p class="pr-a empty">Not answered</p>'}</div></div>`; }).join('')}
      </section>`;
    }).join('')}
    <p class="pr-end">Prepared with Workflow Playbook · ${date.toISOString().slice(0, 10)}</p>`;
}
