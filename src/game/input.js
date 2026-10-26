import { gameActive, typing } from './active.js';

// Keyboard and touch input for walking the site. Movement is an axis (x = right, y = forward,
// relative to the camera); actions are events: talk, answer(n), leave.
const MOVE = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
const DEAD_ZONE = 0.15;

// Joystick drag (dx, dy in px, screen-down positive) → unit-length movement axis.
export function joystickVector(dx, dy, radius) {
  let x = dx / radius, y = -dy / radius;
  const len = Math.hypot(x, y);
  if (len < DEAD_ZONE) return { x: 0, y: 0 };
  if (len > 1) { x /= len; y /= len; }
  return { x: x + 0, y: y + 0 };
}

export function createInput(root, { touch = false, blocked = () => false } = {}) {
  const keys = new Set();
  const handlers = { talk: [], answer: [], leave: [], jump: [] };
  const emit = (name, arg) => handlers[name].forEach((fn) => fn(arg));
  let stick = { x: 0, y: 0 };

  function onKeyDown(e) {
    if (!gameActive() || typing(e) || e.defaultPrevented) return;
    if (e.key === 'Shift') keys.add('run');
    if (blocked()) return;
    if (MOVE[e.code]) { keys.add(MOVE[e.code]); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
      if (e.code !== 'KeyE' && e.target?.closest?.('button')) return;   // Enter/Space on a focused button is a click
      emit('talk'); e.preventDefault();
    } else if (e.code === 'KeyQ') { emit('jump'); e.preventDefault(); }
    else if (/^Digit[1-4]$/.test(e.code)) emit('answer', Number(e.code.slice(5)));
    else if (e.key === 'Escape') emit('leave');
  }
  function onKeyUp(e) {
    if (MOVE[e.code]) keys.delete(MOVE[e.code]);
    if (e.key === 'Shift') keys.delete('run');
  }
  const clear = () => { keys.clear(); stick = { x: 0, y: 0 }; };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clear);

  // On-screen joystick for phones (bottom left).
  let joystick = null;
  if (touch) {
    joystick = document.createElement('div');
    joystick.className = 'sw-joystick';
    joystick.innerHTML = '<div class="sw-joystick-knob"></div>';
    joystick.setAttribute('aria-hidden', 'true');
    root.appendChild(joystick);
    const knob = joystick.firstElementChild;
    let id = null, cx = 0, cy = 0;
    const radius = 60;
    const move = (x, y) => {
      const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy), k = len > radius ? radius / len : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      stick = joystickVector(dx, dy, radius);
    };
    joystick.addEventListener('pointerdown', (e) => {
      id = e.pointerId; joystick.setPointerCapture(id);
      const r = joystick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e.clientX, e.clientY); e.preventDefault();
    });
    joystick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e.clientX, e.clientY); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; stick = { x: 0, y: 0 }; knob.style.transform = ''; };
    joystick.addEventListener('pointerup', end);
    joystick.addEventListener('pointercancel', end);
  }

  return {
    axis() {
      if (blocked() || !gameActive()) return { x: 0, y: 0 };
      if (stick.x || stick.y) return { ...stick };
      let x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
      let y = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x: x + 0, y: y + 0 };
    },
    running: () => keys.has('run'),
    on(name, fn) { handlers[name].push(fn); },
    clear,
    setJoystickVisible(v) { if (joystick) joystick.hidden = !v; },
    dispose() {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      joystick?.remove();
    },
  };
}
