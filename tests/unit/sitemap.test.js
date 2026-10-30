import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSiteMap, mapPoint } from '../../src/game/ui/sitemap.js';
import { CREW } from '../../src/game/content.js';
import { AUDIT_SECTIONS } from '../../src/game/audit-content.js';

const members = CREW.map((c, i) => ({ agentId: c.agentId, data: c, pos: { x: c.spot[0], z: c.spot[1] }, met: i < 2 }));
let root, onPick, onClose, map;
beforeEach(() => {
  document.documentElement.classList.add('site-walk-on');
  document.body.innerHTML = '<div id="r"></div>';
  root = document.getElementById('r');
  onPick = vi.fn(); onClose = vi.fn();
  map = createSiteMap(root, { onPick, onClose });
});
afterEach(() => map.close());

describe('site map', () => {
  test('maps site corners to the map edges', () => {
    expect(mapPoint(-66, -40)).toEqual({ left: 0, top: 0 });
    expect(mapPoint(66, 40)).toEqual({ left: 100, top: 100 });
    expect(mapPoint(0, 0)).toEqual({ left: 50, top: 50 });
  });

  test('shows everyone you can talk to, named, at their position, marking who you have met', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    const markers = [...root.querySelectorAll('.sw-map-person')];
    expect(markers).toHaveLength(10);
    const maria = markers.find((m) => m.textContent.includes('Maria'));
    expect(maria.getAttribute('aria-label')).toBe('Maria, Bid Desk — go and talk');
    expect(maria.style.left).toBe(`${mapPoint(CREW[0].spot[0], CREW[0].spot[1]).left}%`);
    expect(maria.classList.contains('met')).toBe(true);
    expect(root.querySelector('.sw-map-office').disabled).toBe(true);    // office not open yet
    expect(root.querySelector('.sw-map-hint').textContent).toBe('Tap someone to go straight to them.');
  });

  test('marks out the four levels as zones on the plan, and says which level each person is in', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    const svg = root.querySelector('.sw-map-svg');
    expect(svg.querySelectorAll('.sw-bp-zone')).toHaveLength(6);
    expect([...svg.querySelectorAll('.sw-bp-zone-label')].map((t) => t.textContent)).toEqual(['LEVEL 1 · PRECONSTRUCTION', 'LEVEL 2 · STRUCTURE', 'LEVEL 3 · FIELD OPERATIONS', 'LEVEL 4 · CLOSEOUT & CASH']);
    const rosa = [...root.querySelectorAll('.sw-map-list button')].find((b) => b.textContent.includes('Rosa'));
    expect(rosa.textContent).toContain('Level 1 · Preconstruction');
  });

  test('is drawn as a construction blueprint: grid, title block, north arrow, dimensions, scale, structural grid', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    const svg = root.querySelector('.sw-map-svg');
    expect(svg.querySelector('pattern#swBpGrid')).toBeTruthy();
    expect(svg.querySelector('.sw-bp-north')).toBeTruthy();
    expect([...svg.querySelectorAll('.sw-bp-dim text')].map((t) => t.textContent)).toEqual(['132.0 m', '80.0 m']);
    expect(svg.querySelector('.sw-bp-scale')).toBeTruthy();
    expect(svg.querySelectorAll('.sw-bp-gridbubble').length).toBe(9);          // 5 lettered + 4 numbered
    const block = root.querySelector('.sw-bp-titleblock');
    expect(block.textContent).toContain('A-101');
    expect(block.textContent).toContain('SITE PLAN');
  });

  test('the office gets an OPEN stamp once results are ready', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    expect(root.querySelector('.sw-map-office .sw-bp-stamp')).toBeNull();
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: true });
    expect(root.querySelector('.sw-map-office .sw-bp-stamp').textContent).toBe('OPEN · YOUR RESULTS');
  });

  test('clicking a person picks them; clicking the open office picks the office', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: true });
    root.querySelector(`.sw-map-person[data-id="${CREW[4].agentId}"]`).click();
    expect(onPick).toHaveBeenCalledWith(CREW[4].agentId);
    root.querySelector('.sw-map-office').click();
    expect(onPick).toHaveBeenLastCalledWith('office');
  });

  test('also lists everyone (for small screens), and the list picks too', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    const items = [...root.querySelectorAll('.sw-map-list button')];
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toContain(CREW[0].name);
    items[2].click();
    expect(onPick).toHaveBeenCalledWith(CREW[2].agentId);
  });

  test('shows the 7 audit checkpoints; clicking one picks it', () => {
    const checkpoints = AUDIT_SECTIONS.map((s, i) => ({ id: s.id, title: s.title, spot: s.spot, done: i === 0 }));
    map.open({ members, checkpoints, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    const checks = [...root.querySelectorAll('.sw-map-check')];
    expect(checks).toHaveLength(7);
    expect(checks[0].classList.contains('done')).toBe(true);
    expect(checks[6].getAttribute('aria-label')).toBe('Closeout audit checkpoint — go and audit');
    checks[6].click();
    expect(onPick).toHaveBeenCalledWith('audit:closeout');
  });

  test('markers follow the crew while the map is open', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    members[0].pos = { x: 10, z: 10 };
    map.update({ members, player: { x: 0, z: 30 }, heading: 0 });
    expect(root.querySelector(`.sw-map-person[data-id="${CREW[0].agentId}"]`).style.left).toBe(`${mapPoint(10, 10).left}%`);
    members[0].pos = { x: CREW[0].spot[0], z: CREW[0].spot[1] };
  });

  test('Esc and the close button close it', () => {
    map.open({ members, player: { x: 0, z: 30 }, heading: 0, officeOpen: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    root.querySelector('.sw-map-close').click();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
