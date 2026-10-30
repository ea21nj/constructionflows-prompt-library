// The site-walk results as a document: a PDF built on the device, Markdown for download/copy, and
// Word markup that reuses the Discovery document's print styles (#dvPrint .pr-*).
import { CREW } from './content.js';
import { rank } from './scoring.js';
import { createPdf, COLOR } from './pdf.js';

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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

// The results as a PDF file (bytes): where to start, the ranked agents, then every conversation.
export function reportPdf(state, details = {}, date = new Date()) {
  const list = sections(state, details);
  const done = list.filter((s) => s.complete), unfinished = list.filter((s) => !s.complete);
  const top = done[0], topAgent = top && (details.agents || []).find((a) => a.id === top.agentId);
  const doc = createPdf({ title: 'Your site walk results', footer: 'Workflow Playbook · Site walk results', date });

  doc.kicker('Workflow Playbook · Site walk');
  doc.heading('Your site walk results', { size: 24 });
  doc.paragraph(`${longDate(date)} · ${done.length} of 10 crew met`, { color: COLOR.gray, after: 10 });

  if (top) {
    doc.kicker('Start here');
    doc.heading(top.agent, { size: 15, keepWith: 60 });
    doc.paragraph('First step', { font: 'F2', size: 9, color: COLOR.green, accent: true, after: 0 });
    doc.paragraph(topAgent?.implementationPackage?.[0] || 'Pick one workflow to pilot', { accent: true, after: 4 });
    doc.paragraph('First win', { font: 'F2', size: 9, color: COLOR.green, accent: true, after: 0 });
    doc.paragraph(topAgent?.roi?.[0] || 'Less admin time', { accent: true, after: 12 });
  }

  if (done.length) {
    doc.heading('Your agents, ranked', { size: 14, before: 4 });
    done.forEach((s, i) => doc.row(`${i + 1}. ${s.agent}`, `fit ${s.fit} / 9`, s.fit / 9));
  }

  const conversation = (s, label) => {
    doc.heading(label, { size: 14, before: 14, keepWith: 70 });
    doc.paragraph(`Talked to ${s.name} · fit ${s.fit} of 9${s.complete ? '' : ' · conversation not finished'}`, { size: 10, color: COLOR.gray, after: 6 });
    s.qa.forEach(({ q, a }) => {
      doc.paragraph(q, { font: 'F2', size: 10.5, after: 1 });
      if (a) doc.paragraph(a, { after: 7 }); else doc.paragraph('Not answered', { font: 'F3', color: COLOR.gray, after: 7 });
    });
  };
  done.forEach((s, i) => conversation(s, `${i + 1}. ${s.agent}`));
  unfinished.forEach((s) => conversation(s, s.agent));
  if (!list.length) doc.paragraph('Talk to the crew on site to see which agents fit your business.');
  return doc.toBytes();
}
