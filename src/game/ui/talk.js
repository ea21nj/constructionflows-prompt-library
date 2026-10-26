// The conversation panel: the crew member asks their three questions in their own voice.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SIGN_OFF = 'Thanks — that helps. I\'ll put together what an agent could take off your plate.';
const UNLOCKED = 'The site office is open — head over when you\'re ready.';

export function createTalk(root, { onAnswer, onLeave, onRestart, instant = false }) {
  const el = document.createElement('section');
  el.className = 'sw-talk';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'swTalkSay');
  el.innerHTML = `
    <div class="sw-talk-face" aria-hidden="true"><span></span></div>
    <div class="sw-talk-body">
      <button type="button" class="sw-talk-close" aria-label="Walk away">×</button>
      <p class="sw-talk-meta"><span class="sw-talk-who"></span><span class="sw-talk-step"></span></p>
      <p class="sw-talk-say" id="swTalkSay" aria-live="polite"></p>
      <div class="sw-talk-answers"></div>
    </div>`;
  root.appendChild(el);
  const say = el.querySelector('.sw-talk-say');
  const answers = el.querySelector('.sw-talk-answers');
  let member = null, step = 0, timer = null;
  const reduced = () => instant || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function type(text) {
    clearInterval(timer);
    if (reduced()) { say.textContent = text; return; }
    let i = 0; say.textContent = '';
    timer = setInterval(() => { say.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(timer); }, 14);
  }

  function open(m, state, { unlocked = false } = {}) {
    member = m;
    const c = m.data;
    step = (state.answers[c.agentId] || []).length;
    el.querySelector('.sw-talk-face span').textContent = c.name[0];
    el.querySelector('.sw-talk-who').textContent = `${c.name} · ${c.role}`.toUpperCase();
    if (step >= c.questions.length) {
      el.querySelector('.sw-talk-step').textContent = 'done';
      type(unlocked ? `${SIGN_OFF} ${UNLOCKED}` : SIGN_OFF);
      answers.innerHTML = '<button type="button" data-leave>Keep walking</button><button type="button" data-restart>Go over it again</button>';
    } else {
      const q = c.questions[step];
      el.querySelector('.sw-talk-step').textContent = `${step + 1} / ${c.questions.length}`;
      type(step === 0 ? `Hey, I'm ${c.name}. ${q.q}` : q.q);
      answers.innerHTML = q.answers.map((a, i) => `<button type="button" data-choice="${i}"><span class="k">${i + 1}</span>${esc(a)}</button>`).join('');
    }
    el.hidden = false;
    answers.querySelector('button')?.focus({ preventScroll: true });
  }
  function close() { el.hidden = true; member = null; clearInterval(timer); }
  const isOpen = () => !el.hidden;

  el.addEventListener('click', (e) => {
    if (!member) return;
    if (e.target.closest('.sw-talk-close') || e.target.closest('[data-leave]')) return onLeave();
    if (e.target.closest('[data-restart]')) return onRestart(member.agentId);
    const b = e.target.closest('[data-choice]');
    if (b) onAnswer(member.agentId, step, Number(b.dataset.choice));
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen() || e.defaultPrevented) return;
    if (e.key === 'Escape') { e.preventDefault(); onLeave(); return; }
    const n = Number(e.key);
    const buttons = answers.querySelectorAll('button');
    if (n >= 1 && n <= buttons.length) { e.preventDefault(); buttons[n - 1].click(); }
  });

  return { open, close, isOpen, current: () => member };
}
