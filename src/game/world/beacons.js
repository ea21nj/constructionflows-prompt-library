// Light beams over the current level's unfinished objectives, so you can see where to head next
// from anywhere on site. Each beam follows its target (crew walk their routes).
import * as THREE from 'three';

const HEIGHT = 24;

function beamTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.3)'); grad.addColorStop(1, 'rgba(255,255,255,0.85)');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createBeacons(scene, { reducedMotion = false } = {}) {
  const geo = new THREE.CylinderGeometry(0.45, 0.6, HEIGHT, 24, 1, true); geo.translate(0, HEIGHT / 2, 0);
  const material = new THREE.MeshBasicMaterial({ map: beamTexture(), color: '#ffcf33', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const pool = [];
  let targets = [];

  function beam(i) {
    if (!pool[i]) { const m = new THREE.Mesh(geo, material); m.renderOrder = 2; m.frustumCulled = false; scene.add(m); pool[i] = m; }
    return pool[i];
  }

  return {
    // getters: functions returning { x, z } for each target, read every frame.
    set(getters) {
      targets = getters;
      pool.forEach((m, i) => { m.visible = i < targets.length; });
      targets.forEach((_, i) => { beam(i).visible = true; });
    },
    count: () => targets.length,
    update(t) {
      targets.forEach((get, i) => { const p = get(); pool[i].position.set(p.x, 0, p.z); });
      if (!reducedMotion) material.opacity = 0.36 + Math.sin(t * 2.2) * 0.1;
    },
  };
}
