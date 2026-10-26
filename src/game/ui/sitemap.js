// The full site map (opened by clicking the minimap): everyone on site as a clickable marker, plus
// the site office. Picking someone flies you over to talk to them.
import { AREAS, OFFICE } from '../content.js';
import { PLACEMENTS, COLUMN_X, COLUMN_Z, CRANE, footprint } from '../layout.js';
import { gameActive } from '../active.js';

const X0 = -66, X1 = 66, Z0 = -40, Z1 = 40;
const round = (v) => Math.round(v * 100) / 100;
export const mapPoint = (x, z) => ({ left: round(((x - X0) / (X1 - X0)) * 100), top: round(((z - Z0) / (Z1 - Z0)) * 100) });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Haul roads as [x, z, width, depth] rectangles (matches world/ground.js).
const ROADS = [[-1.5, 21, 5.5, 37], [3, 3, 110, 5.5], [57, -14.5, 5.5, 36], [-40, 10, 5.5, 14]];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// The site plan drawn as a construction blueprint: grid paper, white line work, the building's
// structural grid, dimensions, a scale bar and a north arrow. Units are metres (viewBox = the site).
function planSvg() {
  const u = (x) => round(x - X0), v = (z) => round(z - Z0);
  const box = ([a0, a1, c0, c1], cls = 'sw-bp-solid') => `<rect class="${cls}" x="${u(a0)}" y="${v(c0)}" width="${round(a1 - a0)}" height="${round(c1 - c0)}"/>`;
  const text = (x, z, t, cls = 'sw-bp-label', extra = '') => `<text class="${cls}" x="${u(x)}" y="${v(z)}" text-anchor="middle" ${extra}>${esc(t)}</text>`;

  const roads = ROADS.map(([x, z, w, d]) => {
    const horizontal = w > d;
    const centre = horizontal ? `<line class="sw-bp-centre" x1="${u(x - w / 2)}" y1="${v(z)}" x2="${u(x + w / 2)}" y2="${v(z)}"/>` : `<line class="sw-bp-centre" x1="${u(x)}" y1="${v(z - d / 2)}" x2="${u(x)}" y2="${v(z + d / 2)}"/>`;
    return box([x - w / 2, x + w / 2, z - d / 2, z + d / 2], 'sw-bp-road') + centre;
  }).join('');
  const areas = AREAS.map((a) => box(a.rect, 'sw-bp-area')).join('');
  const labels = AREAS.map((a) => text((a.rect[0] + a.rect[1]) / 2, a.rect[2] + 2.6, a.label.toUpperCase())).join('');

  // Everything solid on site, as outlines.
  const solids = PLACEMENTS.filter((p) => p.id !== 'office' && p.id !== 'office_annex').map((p) => box(footprint(p))).join('');
  const office = box(OFFICE.footprint, 'sw-bp-office');

  // Structural grid: dashed grid lines, columns, lettered and numbered bubbles.
  const [gx0, gx1, gz0, gz1] = [COLUMN_X[0] - 2, COLUMN_X.at(-1) + 2, COLUMN_Z[0] - 2, COLUMN_Z.at(-1) + 2];
  const grid = [
    ...COLUMN_X.map((x) => `<line class="sw-bp-gridline" x1="${u(x)}" y1="${v(gz0 - 1.5)}" x2="${u(x)}" y2="${v(gz1)}"/>`),
    ...COLUMN_Z.map((z) => `<line class="sw-bp-gridline" x1="${u(gx0 - 1.5)}" y1="${v(z)}" x2="${u(gx1)}" y2="${v(z)}"/>`),
    ...COLUMN_X.flatMap((x) => COLUMN_Z.map((z) => `<rect class="sw-bp-column" x="${u(x) - 0.45}" y="${v(z) - 0.45}" width="0.9" height="0.9"/>`)),
    ...COLUMN_X.map((x, i) => `<g class="sw-bp-gridbubble"><circle cx="${u(x)}" cy="${v(gz0 - 2.6)}" r="1.1"/><text x="${u(x)}" y="${v(gz0 - 2.6) + 0.55}" text-anchor="middle">${LETTERS[i]}</text></g>`),
    ...COLUMN_Z.map((z, i) => `<g class="sw-bp-gridbubble"><circle cx="${u(gx0 - 2.6)}" cy="${v(z)}" r="1.1"/><text x="${u(gx0 - 2.6)}" y="${v(z) + 0.55}" text-anchor="middle">${i + 1}</text></g>`),
  ].join('');

  // Crane swing radius, excavation contours, gate swing.
  const [cx, cz] = CRANE.at;
  const crane = `<circle class="sw-bp-swing" cx="${u(cx)}" cy="${v(cz)}" r="16"/><path class="sw-bp-thin" d="M${u(cx) - 2} ${v(cz)}h4M${u(cx)} ${v(cz) - 2}v4"/>${text(cx, cz + 4.2, 'TOWER CRANE · R16 m', 'sw-bp-note')}`;
  const pit = [0, 1.6, 3.2].map((k) => `<rect class="sw-bp-contour" x="${u(21 + k)}" y="${v(-30.5 + k)}" width="${18 - 2 * k}" height="${11 - 2 * k}" rx="${2 - k * 0.4}"/>`).join('') + text(30, -24.4, 'EXCAVATE', 'sw-bp-note');
  const gate = `<rect class="sw-bp-knockout" x="${u(-7)}" y="${v(39.2)}" width="11" height="0.9"/><path class="sw-bp-thin" d="M${u(-7)} ${v(39.6)} a5.5 5.5 0 0 1 5.5 -5.5 M${u(4)} ${v(39.6)} a5.5 5.5 0 0 0 -5.5 -5.5"/>${text(-1.5, 38.4, 'GATE', 'sw-bp-note')}`;

  // Dimensions, scale bar and north arrow.
  const dims = `<g class="sw-bp-dim">
      <path d="M${u(-65.5)} 2.2H${u(65.5)}M${u(-65.5)} 1.2v2M${u(65.5)} 1.2v2"/><text x="66" y="1.6" text-anchor="middle">132.0 m</text>
      <path d="M1.2 ${v(-39.5)}V${v(39.5)}M0.2 ${v(-39.5)}h2M0.2 ${v(39.5)}h2"/><text x="0" y="0" text-anchor="middle" transform="translate(2.9 40) rotate(-90)">80.0 m</text>
    </g>`;
  const scale = `<g class="sw-bp-scale" transform="translate(4 77.4)">
      ${[0, 1, 2].map((i) => `<rect x="${i * 10}" y="0" width="10" height="0.9" class="${i % 2 ? 'hollow' : ''}"/>`).join('')}
      ${[0, 10, 20, 30].map((m) => `<text x="${m}" y="-0.6" text-anchor="middle">${m}</text>`).join('')}<text x="33.5" y="0.85">m</text>
    </g>`;
  const north = `<g class="sw-bp-north" transform="translate(64 9.5)"><circle r="2.4"/><path d="M0 -2.1L1 1.4L0 0.6L-1 1.4Z"/><text y="-2.9" text-anchor="middle">N</text></g>`;

  return `<svg class="sw-map-svg" viewBox="0 0 ${X1 - X0} ${Z1 - Z0}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id="swBpGrid" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M2 0H0V2" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="0.06"/></pattern>
      <pattern id="swBpGridMajor" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="0.1"/></pattern>
      <pattern id="swBpHatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.2" stroke="rgba(255,255,255,.55)" stroke-width="0.18"/></pattern>
      <radialGradient id="swBpShade" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#2a63a8"/><stop offset="1" stop-color="#173f75"/></radialGradient>
    </defs>
    <rect width="${X1 - X0}" height="${Z1 - Z0}" fill="url(#swBpShade)"/>
    <rect width="${X1 - X0}" height="${Z1 - Z0}" fill="url(#swBpGrid)"/>
    <rect width="${X1 - X0}" height="${Z1 - Z0}" fill="url(#swBpGridMajor)"/>
    <rect class="sw-bp-fence" x="0.5" y="0.5" width="${X1 - X0 - 1}" height="${Z1 - Z0 - 1}"/>
    ${roads}${areas}${pit}${crane}${grid}${solids}${office}${gate}
    ${labels}${dims}${scale}${north}
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

  function render({ members, officeOpen, checkpoints = [] }) {
    const [f0, f1, f2, f3] = OFFICE.footprint;
    el.innerHTML = `
      <div class="sw-map-card">
        <header class="sw-map-head">
          <div><p class="sw-kicker">Sheet A-101 · Site plan</p><h2 id="swMapTitle">Who do you want to talk to?</h2></div>
          <p class="sw-map-hint">Click someone to go straight to them.</p>
          <button type="button" class="sw-map-close" aria-label="Close the map">×</button>
        </header>
        <div class="sw-map-plan">
          ${planSvg()}
          <button type="button" class="sw-map-office${officeOpen ? ' open' : ''}" ${officeOpen ? '' : 'disabled'}
            aria-label="${officeOpen ? 'Site office — see your results' : 'Site office — opens after 3 conversations'}">
            <span>Site office</span><small>${officeOpen ? 'Your results' : 'Opens after 3 talks'}</small>
            ${officeOpen ? '<em class="sw-bp-stamp">OPEN · YOUR RESULTS</em>' : ''}
          </button>
          ${members.map((m) => `
            <button type="button" class="sw-map-person${m.met ? ' met' : ''}" data-id="${m.agentId}" aria-label="${esc(m.data.name)}, ${esc(m.data.role)} — go and talk">
              <span class="sw-map-dot" aria-hidden="true">${esc(m.data.name[0])}</span>
              <span class="sw-map-name">${esc(m.data.name)}<small>${esc(m.data.role)}</small></span>
            </button>`).join('')}
          ${checkpoints.map((c) => `
            <button type="button" class="sw-map-check${c.done ? ' done' : ''}" data-check="${c.id}" aria-label="${esc(c.title)} audit checkpoint — go and audit">
              <span class="sw-map-check-mark" aria-hidden="true">${c.done ? '✓' : '?'}</span>
              <span class="sw-map-check-name">${esc(c.title)}</span>
            </button>`).join('')}
          <span class="sw-map-you" aria-hidden="true"><i></i><b>You</b></span>
        </div>
        <ul class="sw-map-list" aria-label="Everyone on site">
          ${members.map((m) => `<li><button type="button" class="${m.met ? 'met' : ''}" data-id="${m.agentId}">
            <span class="sw-map-dot" aria-hidden="true">${esc(m.data.name[0])}</span>
            <span><b>${esc(m.data.name)}</b><small>${esc(m.data.role)} · ${esc(AREAS.find((a) => a.id === m.data.area)?.label)}</small></span>
          </button></li>`).join('')}
        </ul>
        <footer class="sw-map-foot">
          <ul class="sw-map-legend" aria-hidden="true">
            <li><span class="sw-map-key"></span>Not met yet</li>
            <li><span class="sw-map-key met"></span>Talked to</li>
            <li><span class="sw-map-key you"></span>You</li>
            <li><span class="sw-map-key check"></span>Audit checkpoint</li>
          </ul>
          <dl class="sw-bp-titleblock">
            <div class="wide"><dt>Project</dt><dd>Workflow Playbook · Site walk</dd></div>
            <div><dt>Title</dt><dd>SITE PLAN</dd></div>
            <div><dt>Sheet</dt><dd>A-101</dd></div>
            <div><dt>Scale</dt><dd>1:500</dd></div>
            <div><dt>Date</dt><dd>${new Date().toISOString().slice(0, 10)}</dd></div>
          </dl>
        </footer>
      </div>`;
    place(el.querySelector('.sw-map-office'), (f0 + f1) / 2, (f2 + f3) / 2);
    for (const c of checkpoints) place(el.querySelector(`.sw-map-check[data-check="${c.id}"]`), c.spot[0], c.spot[1]);
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
    const check = e.target.closest('.sw-map-check');
    if (check) return onPick(`audit:${check.dataset.check}`);
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
