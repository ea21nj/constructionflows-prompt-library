// The always-available menu: skip the game for the classic pages, start over, sound.
import { gameActive } from '../active.js';
import { viewMode } from '../device.js';

const ITEMS = [
  ['resume', 'Back to the site walk'],
  ['quiz', 'Agent quiz'],
  ['agents', '10 agents'],
  ['discovery', 'Discovery interview'],
  ['about', 'About'],
];

export function createMenu(root, { onSkip, onResume, onReset, onToggleSound, onToggleView = () => {} }) {
  const wrap = document.createElement('div');
  wrap.className = 'sw-menu';
  wrap.innerHTML = `
    <button type="button" class="sw-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="swMenuPanel">
      <span class="sw-burger" aria-hidden="true"></span>Menu <kbd>M</kbd>
    </button>
    <div class="sw-menu-panel" id="swMenuPanel" hidden>
      <p class="sw-menu-title">Prefer the classic pages?</p>
      ${ITEMS.map(([id, label]) => `<button type="button" data-menu="${id}">${label}</button>`).join('')}
      <hr>
      <button type="button" data-menu="reset">Start over</button>
      <button type="button" data-menu="sound">Sound: on</button>
      <button type="button" data-menu="view" hidden></button>
    </div>`;
  root.appendChild(wrap);
  const btn = wrap.querySelector('.sw-menu-btn');
  const panel = wrap.querySelector('.sw-menu-panel');
  const reset = wrap.querySelector('[data-menu="reset"]');

  const isOpen = () => !panel.hidden;
  function open() {
    panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
    reset.textContent = 'Start over'; delete reset.dataset.armed;
    panel.querySelector('button').focus();
  }
  function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  panel.addEventListener('click', (e) => {
    const id = e.target.closest('[data-menu]')?.dataset.menu;
    if (!id) return;
    if (id === 'reset') {
      if (!reset.dataset.armed) { reset.dataset.armed = '1'; reset.textContent = `${viewMode() === 'desktop' ? 'Click' : 'Tap'} again to erase your progress`; return; }
      close(); onReset(); return;
    }
    if (id === 'sound') { onToggleSound(); return; }
    if (id === 'view') { close(); onToggleView(); return; }
    close();
    if (id === 'resume') onResume(); else onSkip(id);
  });
  document.addEventListener('keydown', (e) => {
    if (wrap.hidden || !gameActive() || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'm' || e.key === 'M') { isOpen() ? close() : open(); e.preventDefault(); }
    else if (e.key === 'Escape' && isOpen()) { close(); btn.focus(); e.preventDefault(); }   // other handlers skip defaultPrevented keys
  });

  return {
    open, close, isOpen,
    setSound(on) { wrap.querySelector('[data-menu="sound"]').textContent = `Sound: ${on ? 'on' : 'off'}`; },
    // On a computer: switch between the full-screen and phone view.
    setView({ mode, canSwitch }) {
      const b = wrap.querySelector('[data-menu="view"]');
      b.hidden = !canSwitch;
      b.textContent = mode === 'desktop' ? 'Switch to phone view' : 'Switch to full screen';
    },
    setVisible(v) { wrap.hidden = !v; },
  };
}
