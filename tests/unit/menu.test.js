import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createMenu } from '../../src/game/ui/menu.js';

let root, calls, menu;
beforeEach(() => {
  document.body.innerHTML = '<div id="r"></div>';
  root = document.getElementById('r');
  calls = { onSkip: vi.fn(), onResume: vi.fn(), onReset: vi.fn(), onToggleSound: vi.fn() };
  menu = createMenu(root, calls);
});
const items = () => [...root.querySelectorAll('.sw-menu-panel [data-menu]')].map((b) => b.textContent.trim());
const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('menu', () => {
  test('has a visible Menu button and lists the items in order', () => {
    expect(root.querySelector('.sw-menu-btn').textContent).toContain('Menu');
    expect(items()).toEqual(['Back to the site walk', 'Agent quiz', '10 agents', 'Discovery interview', 'About', 'Start over', 'Sound: on']);
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
    expect(reset.textContent).toContain('Click again');
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
