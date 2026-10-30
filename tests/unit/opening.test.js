import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createOpening } from '../../src/game/ui/opening.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('opening card', () => {
  test('explains the phone controls on every device, with no keyboard keys', () => {
    const opening = createOpening(document.body, { onStart: vi.fn(), onSkip: vi.fn() });
    opening.show();
    const keys = [...document.querySelectorAll('.sw-controls dt')].map((d) => d.textContent);
    expect(keys).toEqual(['Joystick', 'Tap someone', 'Talk / Audit', 'Jump', 'Map', 'Menu']);
    expect(document.querySelector('.sw-opening').textContent).not.toMatch(/WASD|Shift|Esc\b/);
  });
});
