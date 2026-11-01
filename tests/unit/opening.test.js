import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createOpening } from '../../src/game/ui/opening.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('opening card', () => {
  test('on a phone it explains the phone controls, with no keyboard keys', () => {
    document.documentElement.className = 'site-walk-on sw-mode-phone';
    const opening = createOpening(document.body, { onStart: vi.fn(), onSkip: vi.fn() });
    opening.show();
    const keys = [...document.querySelectorAll('.sw-controls dt')].map((d) => d.textContent);
    expect(keys).toEqual(['Joystick', 'Tap someone', 'Talk / Audit', 'Jump', 'Map', 'Menu']);
    expect(document.querySelector('.sw-opening').textContent).not.toMatch(/WASD|Shift|Esc\b/);
  });

  test('on desktop it explains the keyboard and mouse controls', () => {
    document.documentElement.className = 'site-walk-on sw-mode-desktop';
    const opening = createOpening(document.body, { onStart: vi.fn(), onSkip: vi.fn() });
    opening.show();
    const keys = [...document.querySelectorAll('.sw-controls dt')].map((d) => d.textContent);
    expect(keys).toEqual(['WASD / arrows', 'Shift', 'E', 'Click someone', 'Q', '1–4', 'Esc', 'M']);
  });
});
