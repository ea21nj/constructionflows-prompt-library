import { describe, test, expect, beforeEach } from 'vitest';
import { decideView, applyView, viewMode } from '../../src/game/device.js';

beforeEach(() => { document.documentElement.className = 'site-walk-on'; });

describe('desktop or phone view', () => {
  test('a computer with a mouse and a big screen gets the full-screen view', () => {
    expect(decideView({ capable: true })).toEqual({ mode: 'desktop', framed: false });
  });

  test('on a computer, choosing phone view shows the phone version in a phone-shaped screen', () => {
    expect(decideView({ capable: true, saved: 'phone' })).toEqual({ mode: 'phone', framed: true });
  });

  test('phones and tablets always get the simplified version, filling the screen', () => {
    expect(decideView({ capable: false })).toEqual({ mode: 'phone', framed: false });
    expect(decideView({ capable: false, saved: 'desktop' })).toEqual({ mode: 'phone', framed: false });
  });

  test('applying a view sets the classes the styles follow', () => {
    applyView({ mode: 'phone', framed: true });
    expect(document.documentElement.classList.contains('sw-mode-phone')).toBe(true);
    expect(document.documentElement.classList.contains('sw-framed')).toBe(true);
    expect(viewMode()).toBe('phone');
    applyView({ mode: 'desktop', framed: false });
    expect([...document.documentElement.classList].sort()).toEqual(['site-walk-on', 'sw-mode-desktop']);
    expect(viewMode()).toBe('desktop');
  });
});
