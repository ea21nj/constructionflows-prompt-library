// Audit checkpoints: an A-frame inspection board at each audit section's spot, with a spinning
// clipboard marker above it (orange until the section is audited, then green).
import * as THREE from 'three';
import { mat, box, cyl } from './kit.js';

function boardTexture(title) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 384);
  g.fillStyle = '#F26A1B'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#ffffff'; g.font = '700 54px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SITE AUDIT', 256, 50);
  g.fillStyle = '#1A1A1A'; g.font = `700 ${title.length > 16 ? 40 : 48}px "IBM Plex Mono", monospace`;
  g.fillText(title.toUpperCase(), 256, 150);
  g.textAlign = 'left'; g.font = '500 28px "IBM Plex Sans", sans-serif';
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = '#1A1A1A'; g.lineWidth = 4; g.strokeRect(70, 205 + i * 42, 26, 26);
    g.fillStyle = '#9a9a9a'; g.fillRect(115, 214 + i * 42, 300 - i * 30, 8);
  }
  g.strokeStyle = '#1A1A1A'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 374);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function buildCheckpoints(scene, sections, { reducedMotion = false } = {}) {
  const group = new THREE.Group(); group.name = 'audit-checkpoints'; scene.add(group);
  const items = sections.map((s, i) => {
    const g = new THREE.Group(); g.position.set(s.spot[0], 0, s.spot[1]); g.rotation.y = -Math.PI / 4; group.add(g);
    const wood = mat('#8b6a43'), dark = mat('#1A1A1A');
    // A-frame: two legs each side, board leaning back.
    for (const x of [-0.62, 0.62]) {
      const front = box(g, 0.07, 1.9, 0.07, wood, x, 0.92, 0.18); front.rotation.x = -0.18;
      const back = box(g, 0.07, 1.9, 0.07, wood, x, 0.92, -0.32); back.rotation.x = 0.22;
    }
    const face = new THREE.MeshStandardMaterial({ map: boardTexture(s.title), roughness: 0.7 });
    const board = box(g, 1.35, 1.0, 0.05, [dark, dark, dark, dark, face, dark], 0, 1.3, 0.12); board.rotation.x = -0.18;
    cyl(g, 0.05, 0.3, 0.6, mat('#F26A1B'), 0.95, 0.3, 0.3, 12);                       // a cone beside it
    // Floating clipboard marker.
    const markerMat = new THREE.MeshStandardMaterial({ color: '#F26A1B', emissive: '#a33d00', emissiveIntensity: 0.6, roughness: 0.3 });
    const marker = new THREE.Group(); marker.position.set(s.spot[0], 2.75, s.spot[1]); group.add(marker);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.06), markerMat); marker.add(clip);
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.07), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })); sheet.position.y = -0.04; marker.add(sheet);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.09), mat('#5b6670', { metalness: 0.5 })); tab.position.y = 0.27; marker.add(tab);
    // Generous invisible click target around the board and its floating clipboard.
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(s.spot[0], 1.7, s.spot[1]); hit.userData.check = s.id; group.add(hit);
    marker.traverse((o) => { if (o.isMesh) o.userData.check = s.id; });
    return {
      id: s.id, section: s, pos: { x: s.spot[0], z: s.spot[1] }, marker, hit, phase: i,
      setDone(done) { markerMat.color.set(done ? '#2BD46A' : '#F26A1B'); markerMat.emissive.set(done ? '#0b8a3a' : '#a33d00'); },
    };
  });
  return {
    items,
    byId: (id) => items.find((c) => c.id === id),
    update(t) {
      if (reducedMotion) return;
      for (const c of items) { c.marker.rotation.y = t * 1.4 + c.phase; c.marker.position.y = 2.75 + Math.sin(t * 2 + c.phase) * 0.08; }
    },
  };
}
