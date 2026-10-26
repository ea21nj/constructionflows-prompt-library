// The results board in the site office: ranked agents, why they fit, where to start, who's left
// to meet, and the report to take away.
import { CREW, AREAS } from '../content.js';
import { rank } from '../scoring.js';
import { reportMarkdown, reportHtml } from '../report.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const areaLabel = (id) => AREAS.find((a) => a.id === id)?.label || id;

export function createResults(root, { agents = [], onClose, onOpenDetails, onClassic = () => {} }) {
  const el = document.createElement('section');
  el.className = 'sw-results';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'swResultsTitle');
  root.appendChild(el);
  let state = null;
  const agent = (id) => agents.find((a) => a.id === id) || {};

  function render() {
    const ranking = rank(state).filter((r) => r.complete);
    const metIds = new Set(ranking.map((r) => r.agentId));
    const unmet = CREW.filter((c) => !metIds.has(c.agentId));
    const top = ranking[0], topAgent = top ? agent(top.agentId) : null;
    el.innerHTML = `
      <div class="sw-results-card">
        <header class="sw-results-head">
          <div><p class="sw-kicker">Site office · results board</p><h2 id="swResultsTitle" tabindex="-1">Your results</h2></div>
          <p class="sw-results-met">${ranking.length} of 10 crew met</p>
          <button type="button" class="sw-results-close" data-back aria-label="Back to the site">×</button>
        </header>
        <div class="sw-results-body">
          <div class="sw-results-main">
            ${top ? `
            <div class="sw-start-here">
              <p class="sw-kicker">Start here</p>
              <h3>${esc(topAgent.name || top.role)}</h3>
              <p><b>First step:</b> ${esc(topAgent.implementationPackage?.[0] || 'Pick one workflow to pilot')}</p>
              <p><b>First win:</b> ${esc(topAgent.roi?.[0] || 'Less admin time')}</p>
            </div>` : ''}
            <ol class="sw-rank">
              ${ranking.map((r, i) => `
              <li class="sw-rank-item">
                <span class="sw-rank-n">${i + 1}</span>
                <div class="sw-rank-info">
                  <p class="sw-rank-name">${esc(agent(r.agentId).name || r.role)}</p>
                  <p class="sw-rank-crew">Talked to ${esc(r.name)} · fit ${r.fit} of 9</p>
                  <span class="sw-rank-bar" aria-hidden="true"><i style="width:${Math.round((r.fit / 9) * 100)}%"></i></span>
                  ${r.why.length ? `<ul class="sw-rank-why">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p class="sw-rank-why-none">No big pain here — worth a look later.</p>'}
                </div>
                <button type="button" class="sw-btn" data-details="${r.agentId}">View details</button>
              </li>`).join('')}
            </ol>
          </div>
          <aside class="sw-results-side">
            ${unmet.length ? `
            <div class="sw-unmet">
              <p class="sw-kicker">Talk to more of the crew to sharpen this</p>
              <ul>${unmet.map((c) => `<li><b>${esc(c.name)}</b> · ${esc(c.role)}<span>${esc(areaLabel(c.area))}</span></li>`).join('')}</ul>
            </div>` : '<p class="sw-unmet-done">You\'ve met the whole crew.</p>'}
            <button type="button" class="sw-btn" data-back>Back to the site</button>
            <div class="sw-report">
              <p class="sw-kicker">Take your results with you</p>
              <button type="button" class="sw-btn sw-btn-primary" data-report="word">Download Word</button>
              <button type="button" class="sw-btn" data-report="md">Download Markdown</button>
              <button type="button" class="sw-btn" data-report="copy">Copy text</button>
              <button type="button" class="sw-btn" data-report="print">Print / save as PDF</button>
            </div>
            <p class="sw-classic">Prefer browsing? <button type="button" data-classic="agents">All 10 agents</button> · <button type="button" data-classic="quiz">Agent quiz</button> · <button type="button" data-classic="discovery">Discovery interview</button></p>
          </aside>
        </div>
      </div>`;
  }

  function download(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const fileName = (ext) => `site-walk-results-${new Date().toISOString().slice(0, 10)}.${ext}`;

  // Print a clean copy: the page's #dvPrint styles show only this while printing.
  function printReport() {
    document.getElementById('dvPrint')?.remove();
    const doc = document.createElement('div'); doc.id = 'dvPrint'; doc.innerHTML = reportHtml(state, { agents });
    document.body.appendChild(doc);
    document.documentElement.classList.add('dv-printing');
    const title = document.title; document.title = `Site walk results - ${new Date().toISOString().slice(0, 10)}`;
    const cleanup = () => { doc.remove(); document.documentElement.classList.remove('dv-printing'); document.title = title; window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return onClose();
    const d = e.target.closest('[data-details]');
    if (d) return onOpenDetails(Number(d.dataset.details), d);
    const c = e.target.closest('[data-classic]');
    if (c) return onClassic(c.dataset.classic);
    const r = e.target.closest('[data-report]')?.dataset.report;
    if (!r) return;
    if (r === 'md') download(fileName('md'), 'text/markdown', reportMarkdown(state, { agents }));
    if (r === 'word') download(fileName('doc'), 'application/msword', `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Site walk results</title><style>body{font-family:Arial,sans-serif;font-size:11pt;color:#1A1A1A}h1{font-size:20pt}h2{font-size:14pt;border-bottom:2px solid #1A1A1A;padding-bottom:4px;margin-top:18pt}.pr-q{font-weight:bold;margin:8pt 0 2pt}.pr-a{margin:0}.empty{color:#777;font-style:italic}table{border-collapse:collapse}th,td{border:1px solid #1A1A1A;padding:4pt 8pt;text-align:left}.pr-bar,.pr-n{display:none}</style></head><body>${reportHtml(state, { agents })}</body></html>`);
    if (r === 'copy') navigator.clipboard?.writeText(reportMarkdown(state, { agents })).then(() => { const b = el.querySelector('[data-report="copy"]'); b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = 'Copy text'; }, 1600); });
    if (r === 'print') printReport();
  });
  // Esc closes the board; listening only while it's open.
  function onKey(e) {
    // The agent details dialog (opened from the board) owns the keyboard while it's open.
    if (el.hidden || e.defaultPrevented || document.body.classList.contains('dialog-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const items = [...el.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const inside = el.contains(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement.id === 'swResultsTitle')) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
  }

  return {
    open(s) { state = s; render(); el.hidden = false; document.addEventListener('keydown', onKey); el.querySelector('#swResultsTitle').focus({ preventScroll: true }); },
    close() { el.hidden = true; document.removeEventListener('keydown', onKey); },
    isOpen: () => !el.hidden,
    el,
  };
}
