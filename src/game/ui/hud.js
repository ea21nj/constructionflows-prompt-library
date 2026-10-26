// On-screen status: the objective line, the "talk to" prompt, toasts, and the clipboard of how
// well each agent you've met fits.
import { completedCount, officeOpen, OFFICE_UNLOCK } from '../state.js';

export function createHud(root, { onTalk = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'sw-hud';
  el.innerHTML = `
    <div class="sw-objective-box"><span class="sw-kicker">Objective</span><p class="sw-objective"></p></div>
    <div class="sw-prompt" hidden></div>
    <div class="sw-toast" role="status" aria-live="polite" hidden></div>
    <details class="sw-clip" open>
      <summary><span>Clipboard</span><span class="sw-clip-count">0 of 10 met</span></summary>
      <p class="sw-clip-empty">Talk to the crew to see which agents fit.</p>
      <ol class="sw-clip-list"></ol>
    </details>`;
  root.appendChild(el);
  // Start the clipboard collapsed on small screens so it doesn't cover the site.
  if (window.matchMedia?.('(max-width: 640px)').matches) el.querySelector('.sw-clip').open = false;
  const prompt = el.querySelector('.sw-prompt');
  const toastEl = el.querySelector('.sw-toast');
  let toastTimer = null, promptFor = null;

  prompt.addEventListener('click', (e) => { if (e.target.closest('button')) onTalk(); });

  return {
    el,
    setObjective(state) {
      el.querySelector('.sw-objective').textContent = officeOpen(state)
        ? 'Site office is open — head there'
        : `Talk to the crew · ${completedCount(state)} of ${OFFICE_UNLOCK}`;
      el.querySelector('.sw-objective-box').classList.toggle('open', officeOpen(state));
    },
    setPrompt(member, isTouch = false) {
      const key = member ? `${member.agentId}:${isTouch}` : null;
      if (key === promptFor) return;
      promptFor = key;
      if (!member) { prompt.hidden = true; return; }
      const { name, role } = member.data;
      prompt.innerHTML = isTouch
        ? `<button type="button">Talk to ${name}</button>`
        : `Press <kbd>E</kbd> to talk to ${name} — ${role}`;
      prompt.hidden = false;
    },
    toast(text, ms = 4000) {
      toastEl.textContent = text; toastEl.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
    },
    updateClipboard(ranking, metCount) {
      el.querySelector('.sw-clip-count').textContent = `${metCount} of 10 met`;
      el.querySelector('.sw-clip-empty').hidden = ranking.length > 0;
      el.querySelector('.sw-clip-list').innerHTML = ranking.map((r) => `
        <li class="sw-clip-row${r.complete ? '' : ' partial'}">
          <span class="sw-clip-name">${r.role}</span>
          <span class="sw-clip-bar" aria-hidden="true"><i style="width:${Math.round((r.fit / 9) * 100)}%"></i></span>
        </li>`).join('');
    },
    setVisible(v) { el.hidden = !v; },
  };
}
