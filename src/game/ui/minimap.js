// A small site plan in the corner: areas, the site office, crew (hollow until met) and you.
import { AREAS, OFFICE } from '../content.js';

const W = 180, H = 110, X0 = -66, X1 = 66, Z0 = -40, Z1 = 40;
const sx = (x) => ((x - X0) / (X1 - X0)) * W;
const sz = (z) => ((z - Z0) / (Z1 - Z0)) * H;
const COLORS = { office: '#d9d4c7', building: '#bdbab3', excavation: '#b39572', laydown: '#d9d4c7', parking: '#8e9196' };

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
      g.fillStyle = '#c4ad84'; g.fillRect(0, 0, W, H);
      for (const a of AREAS) { const [a0, a1, c0, c1] = a.rect; g.fillStyle = COLORS[a.id]; g.fillRect(sx(a0), sz(c0), sx(a1) - sx(a0), sz(c1) - sz(c0)); }
      const [f0, f1, f2, f3] = OFFICE.footprint;
      g.fillStyle = open ? '#008037' : '#f4f2ec'; g.fillRect(sx(f0), sz(f2), sx(f1) - sx(f0), sz(f3) - sz(f2));
      g.strokeStyle = '#1A1A1A'; g.lineWidth = 1; g.strokeRect(sx(f0), sz(f2), sx(f1) - sx(f0), sz(f3) - sz(f2));
      for (const m of members) {
        g.beginPath(); g.arc(sx(m.pos.x), sz(m.pos.z), 3.2, 0, Math.PI * 2);
        g.fillStyle = m.met ? '#2BD46A' : '#ffffff'; g.fill(); g.strokeStyle = '#1A1A1A'; g.stroke();
      }
      g.save(); g.translate(sx(playerPos.x), sz(playerPos.z)); g.rotate(-playerHeading + Math.PI);
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 4.5); g.lineTo(0, 2); g.lineTo(-4.5, 4.5); g.closePath();
      g.fillStyle = '#1A1A1A'; g.fill(); g.restore();
      g.strokeStyle = '#1A1A1A'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    },
  };
}
