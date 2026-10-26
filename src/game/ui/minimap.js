// A small site plan in the corner: areas, the site office, crew (hollow until met) and you.
import { AREAS, OFFICE } from '../content.js';

const W = 180, H = 110, X0 = -66, X1 = 66, Z0 = -40, Z1 = 40;
const sx = (x) => ((x - X0) / (X1 - X0)) * W;
const sz = (z) => ((z - Z0) / (Z1 - Z0)) * H;
// Same blueprint look as the full site map.
const BP = '#1d4f91', LINE = 'rgba(255,255,255,0.9)', FAINT = 'rgba(255,255,255,0.12)';

// The minimap is a button: clicking it opens the full site map.
export function createMinimap(root, { onOpen = () => {} } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sw-minimap-btn';
  button.setAttribute('aria-label', 'Open the site map');
  button.innerHTML = '<span class="sw-minimap-tag" aria-hidden="true">Map — click to open</span>';
  button.addEventListener('click', onOpen);
  const canvas = document.createElement('canvas');
  canvas.className = 'sw-minimap';
  canvas.setAttribute('aria-hidden', 'true');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  button.prepend(canvas);
  root.appendChild(button);
  const g = canvas.getContext('2d');
  if (!g) return { draw() {} };
  g.scale(dpr, dpr);

  return {
    draw(playerPos, playerHeading, members, open) {
      g.fillStyle = BP; g.fillRect(0, 0, W, H);
      g.strokeStyle = FAINT; g.lineWidth = 1;                                // 10 m grid
      for (let x = X0; x <= X1; x += 10) { g.beginPath(); g.moveTo(sx(x) + 0.5, 0); g.lineTo(sx(x) + 0.5, H); g.stroke(); }
      for (let z = Z0; z <= Z1; z += 10) { g.beginPath(); g.moveTo(0, sz(z) + 0.5); g.lineTo(W, sz(z) + 0.5); g.stroke(); }
      g.strokeStyle = LINE; g.lineWidth = 1;
      for (const a of AREAS) { const [a0, a1, c0, c1] = a.rect; g.strokeRect(sx(a0) + 0.5, sz(c0) + 0.5, sx(a1) - sx(a0), sz(c1) - sz(c0)); }
      const [f0, f1, f2, f3] = OFFICE.footprint;
      g.fillStyle = open ? '#2BD46A' : 'rgba(255,255,255,0.35)'; g.fillRect(sx(f0), sz(f2), sx(f1) - sx(f0), sz(f3) - sz(f2));
      g.strokeRect(sx(f0) + 0.5, sz(f2) + 0.5, sx(f1) - sx(f0), sz(f3) - sz(f2));
      for (const m of members) {
        g.beginPath(); g.arc(sx(m.pos.x), sz(m.pos.z), 3.2, 0, Math.PI * 2);
        g.fillStyle = m.met ? '#ffffff' : BP; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.stroke();
      }
      g.save(); g.translate(sx(playerPos.x), sz(playerPos.z)); g.rotate(-playerHeading + Math.PI);
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 4.5); g.lineTo(0, 2); g.lineTo(-4.5, 4.5); g.closePath();
      g.fillStyle = '#2BD46A'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke(); g.restore();
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.strokeRect(2, 2, W - 4, H - 4);
    },
  };
}
