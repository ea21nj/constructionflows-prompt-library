// The jump wheel (like GTA's character switch): everyone you can jump to, in a ring.
import { gameActive } from '../active.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createWheel(root, { onPick, onClose }) {
  const el = document.createElement('div');
  el.className = 'sw-wheel';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Jump to someone on site');
  root.appendChild(el);
  let entries = [], sel = 0;

  function render() {
    const n = entries.length;
    el.innerHTML = `
      <div class="sw-wheel-ring">
        ${entries.map((e, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return `<button type="button" class="sw-wheel-item${e.met ? ' met' : ''}${e.id === 'office' ? ' office' : ''}${i === sel ? ' selected' : ''}" data-i="${i}"
            style="left:${50 + Math.cos(a) * 40}%;top:${50 + Math.sin(a) * 40}%" aria-label="Jump to ${esc(e.label)}, ${esc(e.sub)}${e.met ? ', met' : ''}">
            <span class="sw-wheel-face" aria-hidden="true">${e.id === 'office' ? '⌂' : esc(e.label[0])}</span>
            <span class="sw-wheel-name">${esc(e.label)}</span>
          </button>`;
        }).join('')}
        <div class="sw-wheel-centre" aria-hidden="true">
          <p class="sw-kicker">Jump to</p>
          <p class="sw-wheel-title">${esc(entries[sel]?.label)}</p>
          <p class="sw-wheel-sub">${esc(entries[sel]?.sub)}</p>
          <p class="sw-wheel-hint">← → choose · Enter jump · Esc close</p>
        </div>
      </div>`;
  }
  function select(i) {
    sel = (i + entries.length) % entries.length;
    render();
    el.querySelectorAll('.sw-wheel-item')[sel]?.focus({ preventScroll: true });
  }
  function onKey(e) {
    if (el.hidden || !gameActive() || e.defaultPrevented) return;
    if (e.key === 'Escape' || e.code === 'KeyQ') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(entries[sel].id); }
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.sw-wheel-item');
    if (b) return onPick(entries[Number(b.dataset.i)].id);
    if (e.target === el) onClose();             // click outside the ring
  });
  el.addEventListener('mouseover', (e) => {
    const b = e.target.closest('.sw-wheel-item');
    if (b && Number(b.dataset.i) !== sel) { sel = Number(b.dataset.i); el.querySelector('.sw-wheel-title').textContent = entries[sel].label; el.querySelector('.sw-wheel-sub').textContent = entries[sel].sub; el.querySelectorAll('.sw-wheel-item').forEach((x, i) => x.classList.toggle('selected', i === sel)); }
  });

  return {
    open(list) {
      entries = list; sel = 0; render(); el.hidden = false;
      document.addEventListener('keydown', onKey);
      el.querySelector('.sw-wheel-item')?.focus({ preventScroll: true });
    },
    close() { el.hidden = true; document.removeEventListener('keydown', onKey); },
    isOpen: () => !el.hidden,
  };
}
