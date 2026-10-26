// The full site map (opened by clicking the minimap): everyone on site as a clickable marker, plus
// the site office. Picking someone flies you over to talk to them.
import { AREAS, OFFICE } from '../content.js';
import { gameActive } from '../active.js';

const X0 = -66, X1 = 66, Z0 = -40, Z1 = 40;
const round = (v) => Math.round(v * 100) / 100;
export const mapPoint = (x, z) => ({ left: round(((x - X0) / (X1 - X0)) * 100), top: round(((z - Z0) / (Z1 - Z0)) * 100) });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FILL = { office: '#d9d4c7', building: '#bdbab3', excavation: '#b39572', laydown: '#d9d4c7', parking: '#8e9196' };
// Haul roads as [x, z, width, depth] rectangles (matches world/ground.js).
const ROADS = [[-1.5, 21, 5.5, 37], [3, 3, 110, 5.5], [57, -14.5, 5.5, 36], [-40, 10, 5.5, 14]];

function planSvg() {
  const rect = (x, z, w, d, fill, extra = '') => `<rect x="${x - X0}" y="${z - Z0}" width="${w}" height="${d}" fill="${fill}" ${extra}/>`;
  const areas = AREAS.map((a) => { const [a0, a1, c0, c1] = a.rect; return rect(a0, c0, a1 - a0, c1 - c0, FILL[a.id], 'stroke="#1A1A1A" stroke-width="0.3"'); }).join('');
  const labels = AREAS.map((a) => { const [a0, a1, c0] = a.rect; return `<text x="${(a0 + a1) / 2 - X0}" y="${c0 - Z0 + 3.2}" text-anchor="middle">${esc(a.label.toUpperCase())}</text>`; }).join('');
  const roads = ROADS.map(([x, z, w, d]) => rect(x - w / 2, z - d / 2, w, d, '#a99d8b')).join('');
  const [f0, f1, f2, f3] = OFFICE.footprint;
  return `<svg class="sw-map-svg" viewBox="0 0 ${X1 - X0} ${Z1 - Z0}" preserveAspectRatio="none" aria-hidden="true">
    <rect width="${X1 - X0}" height="${Z1 - Z0}" fill="#c4ad84"/>
    ${roads}${areas}
    ${rect(f0, f2, f1 - f0, f3 - f2, '#f4f2ec', 'class="sw-map-office-shape" stroke="#1A1A1A" stroke-width="0.4"')}
    ${rect(-6, 38.8, 9, 1.2, '#1A1A1A')}<text x="${-1.5 - X0}" y="${37.2 - Z0}" text-anchor="middle">GATE</text>
    <g class="sw-map-labels">${labels}</g>
  </svg>`;
}

export function createSiteMap(root, { onPick, onClose }) {
  const el = document.createElement('section');
  el.className = 'sw-map';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'swMapTitle');
  root.appendChild(el);

  const place = (node, x, z) => { const p = mapPoint(x, z); node.style.left = `${p.left}%`; node.style.top = `${p.top}%`; };

  function render({ members, officeOpen }) {
    const [f0, f1, f2, f3] = OFFICE.footprint;
    el.innerHTML = `
      <div class="sw-map-card">
        <header class="sw-map-head">
          <div><p class="sw-kicker">Site map</p><h2 id="swMapTitle">Who do you want to talk to?</h2></div>
          <p class="sw-map-hint">Click someone to go straight to them.</p>
          <button type="button" class="sw-map-close" aria-label="Close the map">×</button>
        </header>
        <div class="sw-map-plan">
          ${planSvg()}
          <button type="button" class="sw-map-office${officeOpen ? ' open' : ''}" ${officeOpen ? '' : 'disabled'}
            aria-label="${officeOpen ? 'Site office — see your results' : 'Site office — opens after 3 conversations'}">
            <span>Site office</span><small>${officeOpen ? 'Your results' : 'Opens after 3 talks'}</small>
          </button>
          ${members.map((m) => `
            <button type="button" class="sw-map-person${m.met ? ' met' : ''}" data-id="${m.agentId}" aria-label="${esc(m.data.name)}, ${esc(m.data.role)} — go and talk">
              <span class="sw-map-dot" aria-hidden="true">${esc(m.data.name[0])}</span>
              <span class="sw-map-name">${esc(m.data.name)}<small>${esc(m.data.role)}</small></span>
            </button>`).join('')}
          <span class="sw-map-you" aria-hidden="true"><i></i><b>You</b></span>
        </div>
        <ul class="sw-map-list" aria-label="Everyone on site">
          ${members.map((m) => `<li><button type="button" class="${m.met ? 'met' : ''}" data-id="${m.agentId}">
            <span class="sw-map-dot" aria-hidden="true">${esc(m.data.name[0])}</span>
            <span><b>${esc(m.data.name)}</b><small>${esc(m.data.role)} · ${esc(AREAS.find((a) => a.id === m.data.area)?.label)}</small></span>
          </button></li>`).join('')}
        </ul>
        <ul class="sw-map-legend" aria-hidden="true">
          <li><span class="sw-map-key"></span>Not met yet</li>
          <li><span class="sw-map-key met"></span>Talked to</li>
          <li><span class="sw-map-key you"></span>You</li>
        </ul>
      </div>`;
    place(el.querySelector('.sw-map-office'), (f0 + f1) / 2, (f2 + f3) / 2);
  }

  function update({ members, player, heading = 0 }) {
    for (const m of members) {
      const node = el.querySelector(`.sw-map-person[data-id="${m.agentId}"]`);
      if (node) place(node, m.pos.x, m.pos.z);
    }
    const you = el.querySelector('.sw-map-you');
    if (you && player) { place(you, player.x, player.z); you.querySelector('i').style.transform = `rotate(${Math.PI - heading}rad)`; }
  }

  function onKey(e) {
    if (el.hidden || !gameActive() || e.defaultPrevented) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key !== 'Tab') return;                     // keep keyboard focus inside the map
    const items = [...el.querySelectorAll('button:not([disabled])')];
    const first = items[0], last = items[items.length - 1];
    if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.sw-map-close') || e.target === el) return onClose();
    const person = e.target.closest('.sw-map-person, .sw-map-list button');
    if (person) return onPick(Number(person.dataset.id));
    if (e.target.closest('.sw-map-office:not([disabled])')) onPick('office');
  });

  return {
    open(view) {
      render(view); update(view); el.hidden = false;
      document.addEventListener('keydown', onKey);
      el.querySelector('.sw-map-person')?.focus({ preventScroll: true });
    },
    update(view) { if (!el.hidden) update(view); },
    close() { el.hidden = true; document.removeEventListener('keydown', onKey); },
    isOpen: () => !el.hidden,
  };
}
