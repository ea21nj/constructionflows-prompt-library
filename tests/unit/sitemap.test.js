import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSiteMap, mapPoint } from '../../src/game/ui/sitemap.js';
import { CREW } from '../../src/game/content.js';

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
