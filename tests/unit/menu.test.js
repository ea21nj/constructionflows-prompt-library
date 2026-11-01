import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createMenu } from '../../src/game/ui/menu.js';

let root, calls, menu;
beforeEach(() => {
  document.documentElement.classList.add('site-walk-on');
  document.body.innerHTML = '<div id="r"></div>';
  root = document.getElementById('r');
  calls = { onSkip: vi.fn(), onResume: vi.fn(), onReset: vi.fn(), onToggleSound: vi.fn() };
  menu = createMenu(root, calls);
});
const items = () => [...root.querySelectorAll('.sw-menu-panel [data-menu]')].filter((b) => !b.hidden).map((b) => b.textContent.trim());
const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('menu', () => {
  test('has a visible Menu button and lists the items in order', () => {
    expect(root.querySelector('.sw-menu-btn').textContent).toContain('Menu');
    expect(items()).toEqual(['Back to the site walk', 'Agent quiz', '10 agents', 'Discovery interview', 'About', 'Start over', 'Sound: on']);
  });

  test('says click rather than tap on desktop', () => {
    document.documentElement.classList.add('sw-mode-desktop');
    menu.open();
    root.querySelector('[data-menu="reset"]').click();
    expect(root.querySelector('[data-menu="reset"]').textContent).toBe('Click again to erase your progress');
    document.documentElement.classList.remove('sw-mode-desktop');
  });

  test('on a computer the menu can switch between full screen and phone view', () => {
    document.body.innerHTML = '<div id="r2"></div>';
    const onToggleView = vi.fn();
    const m = createMenu(document.getElementById('r2'), { ...calls, onToggleView });
    m.setView({ mode: 'desktop', canSwitch: true });
    const view = () => document.querySelector('#r2 [data-menu="view"]');
    expect(view().textContent).toBe('Switch to phone view');
    view().click();
    expect(onToggleView).toHaveBeenCalled();
    m.setView({ mode: 'phone', canSwitch: true });
    expect(view().textContent).toBe('Switch to full screen');
    m.setView({ mode: 'phone', canSwitch: false });                                     // phones and tablets: no switch
    expect(view().hidden).toBe(true);
  });

  test('M toggles and Esc closes', () => {
    expect(menu.isOpen()).toBe(false);
    key('m'); expect(menu.isOpen()).toBe(true);
    key('Escape'); expect(menu.isOpen()).toBe(false);
    key('M'); expect(menu.isOpen()).toBe(true);
    key('m'); expect(menu.isOpen()).toBe(false);
  });

  test('M is ignored while typing in a field', () => {
    root.insertAdjacentHTML('beforeend', '<input id="i">');
    const input = root.querySelector('#i'); input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect(menu.isOpen()).toBe(false);
  });

  test('M does nothing on the classic pages', () => {
    document.documentElement.classList.remove('site-walk-on');
    key('m');
    expect(menu.isOpen()).toBe(false);
    document.documentElement.classList.add('site-walk-on');
  });

  test('items call the right handlers', () => {
    menu.open();
    root.querySelector('[data-menu="agents"]').click();
    expect(calls.onSkip).toHaveBeenCalledWith('agents');
    menu.open(); root.querySelector('[data-menu="quiz"]').click();
    expect(calls.onSkip).toHaveBeenCalledWith('quiz');
    menu.open(); root.querySelector('[data-menu="resume"]').click();
    expect(calls.onResume).toHaveBeenCalled();
    expect(menu.isOpen()).toBe(false);
  });

  test('Start over asks for a second click before resetting', () => {
    menu.open();
    const reset = root.querySelector('[data-menu="reset"]');
    reset.click();
    expect(calls.onReset).not.toHaveBeenCalled();
    expect(reset.textContent).toBe('Tap again to erase your progress');
    reset.click();
    expect(calls.onReset).toHaveBeenCalledTimes(1);
  });

  test('sound item toggles its label', () => {
    menu.open();
    root.querySelector('[data-menu="sound"]').click();
    expect(calls.onToggleSound).toHaveBeenCalled();
    menu.setSound(false);
    expect(root.querySelector('[data-menu="sound"]').textContent.trim()).toBe('Sound: off');
  });
});
