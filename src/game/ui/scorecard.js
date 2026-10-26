// The site audit scorecard: overall rating, every section's rating and gaps, and the audit report.
import { AUDIT_SECTIONS } from '../audit-content.js';
import { auditSummary, auditMarkdown, auditHtml } from '../audit.js';
import { gameActive } from '../active.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cls = (b) => `band-${String(b).replace(' ', '-').toLowerCase()}`;

export function createScorecard(root, { onClose, onGoTo, onSaved = () => {} }) {
  const el = document.createElement('section');
  el.className = 'sw-scorecard';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'swScoreTitle');
  root.appendChild(el);
  let state = null;

  function render() {
    const sum = auditSummary(state);
    el.innerHTML = `
      <div class="sw-score-card">
        <header class="sw-score-head">
          <div><p class="sw-kicker">Site audit</p><h2 id="swScoreTitle" tabindex="-1">Audit scorecard</h2></div>
          <p class="sw-score-overall">${sum.overall
            ? `<span class="sw-band ${cls(sum.overall.band)}">${sum.overall.band}</span> ${sum.overall.percent}% · ${sum.completed} of 7 sections`
            : `${sum.completed} of 7 sections · walk to a checkpoint to start`}</p>
          <button type="button" class="sw-results-close" data-close aria-label="Back to the site">×</button>
        </header>
        <ol class="sw-score-list">
          ${sum.sections.map((r) => `
          <li class="sw-score-row">
            <div class="sw-score-main">
              <p class="sw-score-title">${esc(r.title)}</p>
              <p class="sw-score-where">${esc(r.where)}</p>
              ${r.done ? `<span class="sw-score-bar" aria-hidden="true"><i class="${cls(r.band)}" style="width:${Math.round((r.points / 15) * 100)}%"></i></span>` : ''}
              ${r.gaps.length ? `<ul class="sw-score-gaps">${r.gaps.map((g) => `<li><b>${esc(g.dim)}:</b> ${esc(g.answer)}</li>`).join('')}</ul>` : ''}
            </div>
            <div class="sw-score-side">
              ${r.done ? `<span class="sw-band ${cls(r.band)}">${r.band}</span><span class="sw-score-pts">${r.points} / 15</span>`
                : `<span class="sw-score-todo">Not audited yet${r.answered ? ` · ${r.answered} of 5 answered` : ''}</span>`}
              <button type="button" class="sw-btn" data-goto="${r.id}">${r.done ? 'Redo' : 'Go there'}</button>
            </div>
          </li>`).join('')}
        </ol>
        <footer class="sw-score-foot">
          <p class="sw-kicker">Take your audit with you</p>
          <button type="button" class="sw-btn sw-btn-primary" data-audit-report="word">Download Word</button>
          <button type="button" class="sw-btn" data-audit-report="md">Download Markdown</button>
          <button type="button" class="sw-btn" data-audit-report="copy">Copy text</button>
          <button type="button" class="sw-btn" data-audit-report="print">Print / save as PDF</button>
        </footer>
      </div>`;
  }

  function download(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const fileName = (ext) => `site-audit-${new Date().toISOString().slice(0, 10)}.${ext}`;
  function printReport() {
    document.getElementById('dvPrint')?.remove();
    const doc = document.createElement('div'); doc.id = 'dvPrint'; doc.innerHTML = auditHtml(state);
    document.body.appendChild(doc);
    document.documentElement.classList.add('dv-printing');
    const title = document.title; document.title = `Site audit - ${new Date().toISOString().slice(0, 10)}`;
    const cleanup = () => { doc.remove(); document.documentElement.classList.remove('dv-printing'); document.title = title; window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === el) return onClose();
    const go = e.target.closest('[data-goto]');
    if (go) return onGoTo(go.dataset.goto);
    const r = e.target.closest('[data-audit-report]')?.dataset.auditReport;
    if (r) onSaved();
    if (r === 'md') download(fileName('md'), 'text/markdown', auditMarkdown(state));
    if (r === 'word') download(fileName('doc'), 'application/msword', `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Site audit</title><style>body{font-family:Arial,sans-serif;font-size:11pt;color:#1A1A1A}h1{font-size:20pt}h2{font-size:14pt;border-bottom:2px solid #1A1A1A;padding-bottom:4px;margin-top:18pt}.pr-q{font-weight:bold;margin:8pt 0 2pt}.pr-a{margin:0}.empty{color:#777;font-style:italic}table{border-collapse:collapse}th,td{border:1px solid #1A1A1A;padding:4pt 8pt;text-align:left}.pr-bar,.pr-n{display:none}</style></head><body>${auditHtml(state)}</body></html>`);
    if (r === 'copy') navigator.clipboard?.writeText(auditMarkdown(state)).then(() => { const b = el.querySelector('[data-audit-report="copy"]'); b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = 'Copy text'; }, 1600); });
    if (r === 'print') printReport();
  });
  function onKey(e) {
    if (el.hidden || !gameActive() || e.defaultPrevented || e.key !== 'Escape') return;
    e.preventDefault(); onClose();
  }

  return {
    open(s) { state = s; render(); el.hidden = false; document.addEventListener('keydown', onKey); el.querySelector('#swScoreTitle').focus({ preventScroll: true }); },
    close() { el.hidden = true; document.removeEventListener('keydown', onKey); },
    isOpen: () => !el.hidden,
  };
}
