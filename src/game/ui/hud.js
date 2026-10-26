// On-screen status: the objective line, the "talk to" prompt, toasts, and the clipboard of how
// well each agent you've met fits.
import { completedCount, officeOpen, OFFICE_UNLOCK } from '../state.js';

export function createHud(root, { onTalk = () => {}, onJump = () => {}, onScorecard = () => {}, onPickAgent = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'sw-hud';
  el.innerHTML = `
    <div class="sw-hud-left">
      <div class="sw-objective-box"><span class="sw-kicker">Objective</span><p class="sw-objective"></p>
        <button type="button" class="sw-audit-tracker">Site audit · 0 of 7 →</button></div>
      <details class="sw-clip" open>
        <summary><span>Clipboard</span><span class="sw-clip-count">0 of 10 met</span></summary>
        <p class="sw-clip-empty">Talk to the crew to see which agents fit.</p>
        <ol class="sw-clip-list"></ol>
      </details>
    </div>
    <div class="sw-prompt" hidden></div>
    <button type="button" class="sw-jump-btn">Jump <kbd>Q</kbd></button>
    <p class="sw-sr-live sw-sr-only" aria-live="polite"></p>
    <div class="sw-toast" role="status" aria-live="polite" hidden></div>`;
  root.appendChild(el);
  // Start the clipboard collapsed on small screens so it doesn't cover the site.
  if (window.matchMedia?.('(max-width: 640px)').matches) el.querySelector('.sw-clip').open = false;
  const prompt = el.querySelector('.sw-prompt');
  const toastEl = el.querySelector('.sw-toast');
  let toastTimer = null, promptFor = null;
  const toastQueue = [];
  function nextToast() {
    const item = toastQueue.shift();
    if (!item) { toastEl.hidden = true; toastTimer = null; return; }
    toastEl.textContent = item.text; toastEl.hidden = false;
    toastTimer = setTimeout(nextToast, item.ms);
  }

  prompt.addEventListener('click', (e) => { if (e.target.closest('button')) onTalk(); });
  el.querySelector('.sw-jump-btn').addEventListener('click', onJump);
  el.querySelector('.sw-audit-tracker').addEventListener('click', onScorecard);
  el.querySelector('.sw-clip-list').addEventListener('click', (e) => { const b = e.target.closest('[data-agent]'); if (b) onPickAgent(Number(b.dataset.agent)); });

  return {
    el,
    left: el.querySelector('.sw-hud-left'),   // objective, minimap and clipboard stack here
    setObjective(state) {
      el.querySelector('.sw-objective').textContent = officeOpen(state)
        ? 'Site office is open — head there'
        : `Talk to the crew · ${completedCount(state)} of ${OFFICE_UNLOCK}`;
      el.querySelector('.sw-objective-box').classList.toggle('open', officeOpen(state));
    },
    setAudit(done) { el.querySelector('.sw-audit-tracker').textContent = `Site audit · ${done} of 7 →`; },
    // member is a crew member, or { section } for an audit checkpoint.
    setPrompt(member, isTouch = false) {
      const key = member ? `${member.agentId ?? member.section.id}:${isTouch}` : null;
      if (key === promptFor) return;
      promptFor = key;
      const live = el.querySelector('.sw-sr-live');
      if (!member) { prompt.hidden = true; live.textContent = ''; return; }
      if (member.section) {
        const { title } = member.section;
        live.textContent = `${title} audit checkpoint is nearby. ${isTouch ? 'Use the Audit button.' : 'Press E to start.'}`;
        prompt.innerHTML = isTouch ? `<button type="button">Audit ${title.replace(/&/g, '&amp;')}</button>` : `Press <kbd>E</kbd> to audit ${title.replace(/&/g, '&amp;')}`;
        prompt.hidden = false;
        return;
      }
      const { name, role } = member.data;
      live.textContent = `${name}, ${role}, is nearby. ${isTouch ? 'Use the Talk button.' : 'Press E to talk.'}`;
      prompt.innerHTML = isTouch
        ? `<button type="button">Talk to ${name}</button>`
        : `Press <kbd>E</kbd> to talk to ${name} — ${role}`;
      prompt.hidden = false;
    },
    // Messages queue up so none hides another.
    toast(text, ms = 3200) {
      toastQueue.push({ text, ms });
      if (!toastTimer) nextToast();
    },
    updateClipboard(ranking, metCount) {
      el.querySelector('.sw-clip-count').textContent = `${metCount} of 10 met`;
      el.querySelector('.sw-clip-empty').hidden = ranking.length > 0;
      el.querySelector('.sw-clip-list').innerHTML = ranking.map((r) => `
        <li class="sw-clip-row${r.complete ? '' : ' partial'}">
          <button type="button" data-agent="${r.agentId}" aria-label="Go to ${r.name}, ${r.role}">
            <span class="sw-clip-name">${r.role}</span>
            <span class="sw-clip-bar" aria-hidden="true"><i style="width:${Math.round((r.fit / 9) * 100)}%"></i></span>
          </button>
        </li>`).join('');
    },
    setVisible(v) { el.hidden = !v; },
    setJumpVisible(v) { el.querySelector('.sw-jump-btn').hidden = !v; },
  };
}
