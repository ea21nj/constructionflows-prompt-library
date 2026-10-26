// The audit checkpoint panel: a section's five questions (A–D), then its rating and gaps.
import { gameActive, typing } from '../active.js';
import { auditSummary } from '../audit.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createAuditPanel(root, { onAnswer, onLeave, onRedo, onScorecard, instant = false }) {
  const el = document.createElement('section');
  el.className = 'sw-audit';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'swAuditQ');
  root.appendChild(el);
  let section = null, step = 0;

  function open(s, state) {
    section = s;
    step = ((state.audit || {})[s.id] || []).length;
    const head = `
      <div class="sw-audit-badge" aria-hidden="true">✓</div>
      <div class="sw-audit-body">
        <button type="button" class="sw-talk-close" data-leave aria-label="Walk away">×</button>
        <p class="sw-talk-meta"><span class="sw-audit-who">${esc(`Site audit · ${s.title}`.toUpperCase())}</span>`;
    if (step >= s.questions.length) {
      const r = auditSummary(state).sections.find((x) => x.id === s.id);
      el.innerHTML = `${head}<span class="sw-audit-step">done</span></p>
        <p class="sw-audit-q" id="swAuditQ"><span class="sw-audit-result band-${r.band.replace(' ', '-').toLowerCase()}">${esc(r.band)} · ${r.points} of 15</span> ${esc(s.title)}</p>
        ${r.gaps.length ? `<p class="sw-audit-gaps-title">Biggest gaps</p><ul class="sw-audit-gaps">${r.gaps.map((g) => `<li><b>${esc(g.dim)}:</b> ${esc(g.answer)}</li>`).join('')}</ul>` : '<p class="sw-audit-gaps-title">No major gaps in this section.</p>'}
        <div class="sw-audit-answers done">
          <button type="button" data-leave>Keep walking</button>
          <button type="button" data-scorecard>View scorecard</button>
          <button type="button" data-redo>Redo this section</button>
        </div>
      </div>`;
    } else {
      const q = s.questions[step];
      el.innerHTML = `${head}<span class="sw-audit-step">${step + 1} / ${s.questions.length} · ${esc(q.dim)}</span></p>
        <p class="sw-audit-q" id="swAuditQ">${esc(q.q)}</p>
        <div class="sw-audit-answers">${q.answers.map((a, i) => `<button type="button" data-choice="${i}"><span class="k">${LETTERS[i]}</span>${esc(a)}</button>`).join('')}</div>
      </div>`;
    }
    el.hidden = false;
    el.querySelector('.sw-audit-answers button')?.focus({ preventScroll: true });
  }
  const close = () => { el.hidden = true; section = null; };
  const isOpen = () => !el.hidden;

  el.addEventListener('click', (e) => {
    if (!section) return;
    if (e.target.closest('[data-leave]')) return onLeave();
    if (e.target.closest('[data-redo]')) return onRedo(section.id);
    if (e.target.closest('[data-scorecard]')) return onScorecard();
    const b = e.target.closest('[data-choice]');
    if (b) onAnswer(section.id, step, Number(b.dataset.choice));
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen() || !section || e.defaultPrevented || !gameActive() || typing(e)) return;
    if (e.key === 'Escape') { e.preventDefault(); onLeave(); return; }
    if (step >= section.questions.length) return;
    const byDigit = /^Digit[1-4]$/.test(e.code) ? Number(e.code.slice(5)) - 1 : -1;
    const byLetter = /^Key[A-D]$/.test(e.code) ? e.code.charCodeAt(3) - 65 : -1;
    const n = byDigit >= 0 ? byDigit : byLetter;
    if (n >= 0) { e.preventDefault(); onAnswer(section.id, step, n); }
  });

  return { open, close, isOpen, current: () => section };
}
