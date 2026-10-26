// The site score badge (top centre): points, rank, level, stars and progress to the next rank.
// Click it for the checklist of every objective, level by level. Earned points float up beside it.
import { starText } from '../levels.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function createScoreboard(root, { onGo = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'sw-scoreboard';
  el.innerHTML = `
    <button type="button" class="sw-scoreboard-btn" aria-expanded="false" aria-controls="swObjectives">
      <span class="sw-score-label">Site score</span>
      <span class="sw-score-points">0</span>
      <span class="sw-score-meta"><span class="sw-score-rank">Visitor</span><span class="sw-score-level">Level 1 / 4</span><span class="sw-score-stars">★ 0 / 12</span></span>
      <span class="sw-score-track" aria-hidden="true"><i></i></span>
      <span class="sw-score-next"></span>
    </button>
    <span class="sw-score-float" aria-hidden="true"></span>
    <p class="sw-sr-only sw-score-live" aria-live="polite"></p>
    <ol class="sw-objectives" id="swObjectives" hidden></ol>`;
  root.appendChild(el);
  const btn = el.querySelector('.sw-scoreboard-btn');
  const list = el.querySelector('.sw-objectives');
  const float = el.querySelector('.sw-score-float');
  let floatTimer = null;

  btn.addEventListener('click', () => {
    list.hidden = !list.hidden;
    btn.setAttribute('aria-expanded', String(!list.hidden));
  });
  // "Go" on an objective takes you straight to it.
  list.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    list.hidden = true; btn.setAttribute('aria-expanded', 'false');
    onGo(go.dataset.go);
  });

  return {
    el,
    update(s, { gained = 0 } = {}) {
      el.querySelector('.sw-score-points').textContent = s.points.toLocaleString('en-US');
      el.querySelector('.sw-score-rank').textContent = s.rank;
      el.querySelector('.sw-score-level').textContent = s.allComplete ? 'All levels done' : `Level ${s.current.number} / ${s.levels.length}`;
      el.querySelector('.sw-score-stars').textContent = `★ ${s.stars} / ${s.maxStars}`;
      el.querySelector('.sw-score-track i').style.width = `${Math.round(s.progress * 100)}%`;
      el.querySelector('.sw-score-next').textContent = s.nextRank ? `${s.toNext.toLocaleString('en-US')} to ${s.nextRank}` : 'Top rank reached';
      btn.setAttribute('aria-label', `Site score ${s.points}, rank ${s.rank}, ${s.stars} of ${s.maxStars} stars, objectives ${s.completed} of ${s.total}. Show objectives`);
      list.innerHTML = s.levels.map((l) => `
        <li class="sw-obj-level${l.complete ? ' done' : ''}${l.number === s.current.number && !s.allComplete ? ' current' : ''}">
          <p class="sw-obj-head"><b>Level ${l.number} · ${esc(l.title)}</b><span class="sw-obj-stars" aria-label="${l.stars} of 3 stars">${starText(l.stars)}</span></p>
          <ul>${l.tasks.map((t) => `
            <li class="${t.done ? 'done' : ''}">
              <span class="sw-obj-check" aria-hidden="true">${t.done ? '✓' : ''}</span>
              <span class="sw-obj-text">${esc(t.label)}<span class="sw-sr-only">${t.done ? ' (done)' : ''}</span></span>
              ${t.done ? '' : `<button type="button" class="sw-obj-go" data-go="${t.go}" aria-label="Go: ${esc(t.label)}">Go →</button>`}
            </li>`).join('')}
          </ul>
        </li>`).join('');
      if (gained > 0) {
        float.textContent = `+${gained}`;
        float.classList.remove('go'); void float.offsetWidth; float.classList.add('go');
        el.querySelector('.sw-score-live').textContent = `Plus ${gained} points. Site score ${s.points}.`;
        clearTimeout(floatTimer); floatTimer = setTimeout(() => float.classList.remove('go'), 1600);
      }
    },
    close() { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); },
    setVisible(v) { el.hidden = !v; },
  };
}
