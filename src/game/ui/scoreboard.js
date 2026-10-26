// The site score badge (top centre): points, rank, progress to the next rank and objectives. Click it
// for the objectives checklist. Earned points float up beside it.
export function createScoreboard(root, { onGo = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'sw-scoreboard';
  el.innerHTML = `
    <button type="button" class="sw-scoreboard-btn" aria-expanded="false" aria-controls="swObjectives">
      <span class="sw-score-label">Site score</span>
      <span class="sw-score-points">0</span>
      <span class="sw-score-meta"><span class="sw-score-rank">Visitor</span><span class="sw-score-objectives">Objectives 0 / 6</span></span>
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
  // "Go" on an objective takes you to the nearest place to work on it.
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
      el.querySelector('.sw-score-objectives').textContent = `Objectives ${s.completed} / ${s.total}`;
      el.querySelector('.sw-score-track i').style.width = `${Math.round(s.progress * 100)}%`;
      el.querySelector('.sw-score-next').textContent = s.nextRank ? `${s.toNext.toLocaleString('en-US')} to ${s.nextRank}` : 'Top rank reached';
      btn.setAttribute('aria-label', `Site score ${s.points}, rank ${s.rank}, objectives ${s.completed} of ${s.total}. Show objectives`);
      list.innerHTML = s.objectives.map((o) => `
        <li class="${o.done ? 'done' : ''}">
          <span class="sw-obj-check" aria-hidden="true">${o.done ? '✓' : ''}</span>
          <span class="sw-obj-text"><b>${o.label}</b><small>${o.hint}</small></span>
          <span class="sw-obj-count">${o.count} / ${o.goal}</span>
          ${o.done ? '' : `<button type="button" class="sw-obj-go" data-go="${o.id}" aria-label="Go: ${o.label}">Go →</button>`}
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
