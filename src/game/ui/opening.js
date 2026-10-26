// First thing a visitor sees once the site has loaded: how it works, and how to skip it.
const LEDE = 'Walk the site and talk to the crew — each one is an AI agent that could help your business. After you\'ve met 3, head to the site office for your results. Prefer the classic pages? Use the menu.';

export function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
}

export function createOpening(root, { onStart, onSkip }) {
  const el = document.createElement('div');
  el.className = 'sw-opening';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'swOpeningTitle');
  root.appendChild(el);

  function show({ met = 0 } = {}) {
    const touch = isTouchDevice();
    const controls = touch
      ? [['Joystick', 'walk (bottom left)'], ['Tap a worker', 'walk over and talk'], ['Jump', 'fly to anyone on site'], ['Menu', 'skip to the classic pages']]
      : [['WASD / arrows', 'walk'], ['Shift', 'sprint'], ['Q', 'jump to anyone'], ['E', 'talk to someone nearby'], ['1–4', 'answer'], ['Esc', 'walk away'], ['Drag', 'look around'], ['M', 'menu']];
    el.innerHTML = `
      <div class="sw-opening-card">
        <p class="sw-kicker">Workflow Playbook · Site walk</p>
        <h1 id="swOpeningTitle">${met ? 'Welcome back to the site' : 'Welcome to the site'}</h1>
        <p class="sw-opening-lede">${LEDE}</p>
        ${met ? `<p class="sw-opening-back">You've already met ${met} of the crew. Pick up where you left off.</p>` : ''}
        <ol class="sw-opening-steps">
          <li><b>Walk the site.</b> Ten crew members are working around the job.</li>
          <li><b>Talk to the crew.</b> Each one asks three quick questions about how you work.</li>
          <li><b>Get your results at the site office.</b> It opens once you've met three of them.</li>
        </ol>
        <dl class="sw-controls">${controls.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <div class="sw-opening-actions">
          <button type="button" class="sw-btn sw-btn-primary" data-start>Start walking</button>
          <button type="button" class="sw-btn" data-skip>Skip to the agents</button>
        </div>
      </div>`;
    el.hidden = false;
    el.querySelector('[data-start]').focus();
  }
  const hide = () => { el.hidden = true; };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-start]')) { hide(); onStart(); }
    if (e.target.closest('[data-skip]')) { hide(); onSkip(); }
  });
  return { show, hide, isOpen: () => !el.hidden };
}
