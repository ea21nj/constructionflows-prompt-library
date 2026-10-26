import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInput, joystickVector } from '../../src/game/input.js';

let input;
const down = (key, code, target = document) => target.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
const up = (key, code) => document.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }));

beforeEach(() => { document.body.innerHTML = '<div id="g"></div><input id="field">'; input = createInput(document.getElementById('g'), { touch: false }); });
afterEach(() => input.dispose());

describe('keyboard input', () => {
  test('WASD and arrows map to a movement axis (x right, y forward)', () => {
    down('w', 'KeyW'); expect(input.axis()).toEqual({ x: 0, y: 1 }); up('w', 'KeyW');
    down('ArrowLeft', 'ArrowLeft'); expect(input.axis()).toEqual({ x: -1, y: 0 }); up('ArrowLeft', 'ArrowLeft');
    down('s', 'KeyS'); down('d', 'KeyD');
    const a = input.axis(); expect(a.x).toBeCloseTo(Math.SQRT1_2, 5); expect(a.y).toBeCloseTo(-Math.SQRT1_2, 5);
    up('s', 'KeyS'); up('d', 'KeyD');
    expect(input.axis()).toEqual({ x: 0, y: 0 });
  });

  test('Shift means running', () => {
    down('Shift', 'ShiftLeft'); expect(input.running()).toBe(true);
    up('Shift', 'ShiftLeft'); expect(input.running()).toBe(false);
  });

  test('E, Space and Enter emit talk; 1–4 emit answer; Esc emits leave', () => {
    const talk = vi.fn(), answer = vi.fn(), leave = vi.fn();
    input.on('talk', talk); input.on('answer', answer); input.on('leave', leave);
    down('e', 'KeyE'); down(' ', 'Space'); down('Enter', 'Enter');
    expect(talk).toHaveBeenCalledTimes(3);
    down('3', 'Digit3'); expect(answer).toHaveBeenCalledWith(3);
    down('5', 'Digit5'); expect(answer).toHaveBeenCalledTimes(1);
    down('Escape', 'Escape'); expect(leave).toHaveBeenCalledTimes(1);
  });

  test('keys are ignored while typing in a field', () => {
    const talk = vi.fn(); input.on('talk', talk);
    const field = document.getElementById('field'); field.focus();
    down('e', 'KeyE', field); down('w', 'KeyW', field);
    expect(talk).not.toHaveBeenCalled();
    expect(input.axis()).toEqual({ x: 0, y: 0 });
  });

  test('keys another handler already used (Esc closing the menu) are ignored', () => {
    const leave = vi.fn(); input.on('leave', leave);
    document.addEventListener('keydown', (e) => e.preventDefault(), { capture: true, once: true });
    down('Escape', 'Escape');
    expect(leave).not.toHaveBeenCalled();
  });

  test('blocked() pauses movement and actions (menu open)', () => {
    input.dispose();
    let blocked = true;
    input = createInput(document.getElementById('g'), { touch: false, blocked: () => blocked });
    const talk = vi.fn(); input.on('talk', talk);
    down('w', 'KeyW'); down('e', 'KeyE');
    expect(input.axis()).toEqual({ x: 0, y: 0 });
    expect(talk).not.toHaveBeenCalled();
    blocked = false; up('w', 'KeyW');
  });
});

describe('joystick', () => {
  test('clamps to unit length and drops tiny movements', () => {
    expect(joystickVector(0, -120, 60)).toEqual({ x: 0, y: 1 });          // dragged far up = full forward
    const half = joystickVector(30, 0, 60); expect(half.x).toBeCloseTo(0.5, 5); expect(half.y).toBeCloseTo(0, 5);
    expect(joystickVector(5, 4, 60)).toEqual({ x: 0, y: 0 });              // inside the 0.15 dead zone
  });
});
