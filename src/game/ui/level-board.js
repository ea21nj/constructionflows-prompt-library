// The level board: all four levels with their stars and progress. It opens on its own when you
// finish a level (with a "Level complete" banner and the way to the next one), and from the level
// card in the corner whenever you want to pick a level.
import { gameActive } from '../active.js';
import { POINTS } from '../score.js';
import { starText } from '../levels.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function createLevelBoard(root, { onGo = () => {}, onClose = () => {} } = {}) {
  const el = document.createElement('section');
  el.className = 'sw-lb';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'swLbTitle');
  root.appendChild(el);

  function status(l, score) {
    if (l.complete) return 'Complete';
    if (l.number === score.current.number) return 'Current level';
    return l.done ? 'In progress' : 'Not started';
  }

  function render(score, completed) {
    const finished = completed != null ? score.levels.find((l) => l.number === completed) : null;
    const banner = !finished ? '' : score.allComplete
      ? `<div class="sw-lb-banner"><p class="sw-kicker">All ${score.levels.length} levels</p><p class="sw-lb-big">Site walk complete</p>
          <p class="sw-lb-bigstars" aria-hidden="true">★★★</p><p>${score.stars} of ${score.maxStars} stars · ${score.points.toLocaleString('en-US')} points · ${esc(score.rank)}</p></div>`
      : `<div class="sw-lb-banner"><p class="sw-kicker">${esc(finished.title)}</p><p class="sw-lb-big">Level ${finished.number} complete</p>
          <p class="sw-lb-bigstars" aria-hidden="true">${starText(finished.stars)}</p><p>+${POINTS.level} level bonus · ${score.stars} of ${score.maxStars} stars so far</p></div>`;
    const primary = finished && score.allComplete
      ? '<button type="button" class="sw-btn sw-btn-primary" data-go="office">See your results at the site office →</button>'
      : finished
        ? `<button type="button" class="sw-btn sw-btn-primary" data-level="${score.current.number}">Start level ${score.current.number} →</button>`
        : '';
    el.innerHTML = `
      <div class="sw-lb-card-wrap">
        <header class="sw-lb-head">
          <div><p class="sw-kicker">Site walk</p><h2 id="swLbTitle" tabindex="-1">Levels</h2></div>
          <button type="button" class="sw-results-close" data-close aria-label="Back to the site">×</button>
        </header>
        ${banner}
        <ol class="sw-lb-list">
          ${score.levels.map((l) => `
          <li class="sw-lb-card${l.complete ? ' done' : ''}${status(l, score) === 'Current level' ? ' current' : ''}">
            <span class="sw-lb-num" aria-hidden="true">${l.number}</span>
            <div class="sw-lb-main">
              <p class="sw-lb-title">${esc(l.title)}</p>
              <p class="sw-lb-zone">${esc(l.zone)}</p>
              <p class="sw-lb-meta"><span class="sw-lb-status">${status(l, score)}</span> · <span class="sw-lb-progress">${l.done} of ${l.total}</span></p>
            </div>
            <div class="sw-lb-side">
              <span class="sw-lb-stars" aria-label="${l.stars} of 3 stars">${starText(l.stars)}</span>
              ${l.complete ? '' : `<button type="button" class="sw-btn" data-level="${l.number}" aria-label="Go to level ${l.number}, ${esc(l.title)}">Go →</button>`}
            </div>
          </li>`).join('')}
        </ol>
        <footer class="sw-lb-foot">
          ${primary}
          <button type="button" class="sw-btn" data-close>${finished ? 'Keep exploring' : 'Close'}</button>
        </footer>
      </div>`;
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === el) return onClose();
    const level = e.target.closest('[data-level]');
    if (level) return onGo(`level:${level.dataset.level}`);
    const go = e.target.closest('[data-go]');
    if (go) onGo(go.dataset.go);
  });
  function onKey(e) {
    if (el.hidden || !gameActive() || e.defaultPrevented || e.key !== 'Escape') return;
    e.preventDefault(); onClose();
  }

  return {
    open(score, { completed = null } = {}) {
      render(score, completed);
      el.hidden = false;
      document.addEventListener('keydown', onKey);
      (el.querySelector('.sw-lb-foot .sw-btn-primary') || el.querySelector('#swLbTitle')).focus({ preventScroll: true });
    },
    close() { el.hidden = true; document.removeEventListener('keydown', onKey); },
    isOpen: () => !el.hidden,
  };
}
