// The site-walk results as a document: Markdown for download/copy, and print/Word markup that
// reuses the Discovery document's print styles (#dvPrint .pr-*).
import { CREW } from './content.js';
import { rank } from './scoring.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoDate = (d) => d.toISOString().slice(0, 10);
const agentName = (agents, id) => agents.find((a) => a.id === id)?.name || CREW.find((c) => c.agentId === id)?.role || `Agent ${id}`;

function sections(state, { agents = [] } = {}) {
  return rank(state).map((r) => {
    const crew = CREW.find((c) => c.agentId === r.agentId);
    return {
      ...r,
      agent: agentName(agents, r.agentId),
      qa: crew.questions.map((q, i) => ({ q: q.q, a: Number.isInteger(state.answers[r.agentId]?.[i]) ? q.answers[state.answers[r.agentId][i]] : null })),
    };
  });
}

export function reportMarkdown(state, details, date = new Date()) {
  const list = sections(state, details);
  const lines = ['# Site walk results', '', `${isoDate(date)} · ${list.filter((s) => s.complete).length} of 10 crew met`, ''];
  list.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.agent}`, '', `Talked to ${s.name} · fit ${s.fit} of 9${s.complete ? '' : ' (conversation not finished)'}`, '');
    s.qa.forEach(({ q, a }) => lines.push(`**${q}**`, '', a || '_Not answered_', ''));
  });
  return lines.join('\n');
}

export function reportHtml(state, details, date = new Date()) {
  const list = sections(state, details);
  const met = list.filter((s) => s.complete).length;
  return `
    <div class="pr-bar"></div>
    <p class="pr-kicker">Workflow Playbook · Site walk</p>
    <h1>Your site walk results</h1>
    <table class="pr-meta"><tr><th>Date</th><td>${esc(date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))}</td></tr><tr><th>Crew met</th><td>${met} of 10</td></tr></table>
    <table class="pr-summary"><thead><tr><th>Agent</th><th style="text-align:right">Fit</th></tr></thead>
      <tbody>${list.map((s) => `<tr><td>${esc(s.agent)}</td><td class="num">${s.fit} / 9</td></tr>`).join('')}</tbody></table>
    ${list.map((s, n) => `
      <section>
        <h2>${n + 1}. ${esc(s.agent)}<small>talked to ${esc(s.name)}</small></h2>
        ${s.qa.map(({ q, a }, i) => `<div class="pr-qa"><span class="pr-n">${n + 1}.${i + 1}</span><div><p class="pr-q">${esc(q)}</p>${a ? `<p class="pr-a">${esc(a)}</p>` : '<p class="pr-a empty">Not answered</p>'}</div></div>`).join('')}
      </section>`).join('')}
    <p class="pr-end">Prepared with Workflow Playbook · ${isoDate(date)}</p>`;
}
