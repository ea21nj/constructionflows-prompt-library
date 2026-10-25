// Renderer, camera, lights, sky and post-processing for the site. Quality follows the device tier.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { tierSettings } from './quality.js';

const SUN_DIR = new THREE.Vector3(0.55, 0.75, 0.35).normalize();

export function createEngine(parent, tier) {
  const settings = tierSettings(tier, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ antialias: !settings.post, powerPreference: 'high-performance' });
  renderer.setPixelRatio(settings.pixelRatio);
  renderer.setSize(parent.clientWidth, parent.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = settings.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'sw-canvas';
  parent.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe3ec', 110, 260);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  // Sky dome with the sun where the shadows say it is.
  const sky = new Sky();
  sky.scale.setScalar(900);
  const u = sky.material.uniforms;
  u.turbidity.value = 4; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(SUN_DIR).multiplyScalar(400);
  scene.add(sky);

  scene.add(new THREE.HemisphereLight('#e7f3ff', '#8f7d5c', 1.1));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  sun.castShadow = settings.shadows;
  if (settings.shadows) {
    sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
  }
  scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(35, parent.clientWidth / parent.clientHeight, 0.3, 1200);
  camera.position.set(-1.5 - 14, 16, 36 + 14);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-1.5, 1.5, 36);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.1;    // the Sims angle
  controls.minDistance = 10; controls.maxDistance = 60;

  let composer = null, fxaa = null;
  if (settings.post) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const sao = new SAOPass(scene, camera);
    Object.assign(sao.params, { saoBias: 0.5, saoIntensity: 0.012, saoScale: 6, saoKernelRadius: 18, saoBlur: true });
    composer.addPass(sao);
    composer.addPass(new OutputPass());
    fxaa = new ShaderPass(FXAAShader);
    composer.addPass(fxaa);
  }

  function resize() {
    const w = parent.clientWidth || window.innerWidth, h = parent.clientHeight || window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) {
      composer.setSize(w, h);
      fxaa.material.uniforms.resolution.value.set(1 / (w * renderer.getPixelRatio()), 1 / (h * renderer.getPixelRatio()));
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // Shadows follow the player so a modest shadow map stays sharp over a big site.
  function setShadowCenter(x, z) {
    sun.target.position.set(x, 0, z);
    sun.position.set(x + SUN_DIR.x * 80, SUN_DIR.y * 80, z + SUN_DIR.z * 80);
  }
  setShadowCenter(0, 20);

  const callbacks = [];
  const clock = new THREE.Clock();
  let running = true, frames = 0, fpsT = 0, fps = 60;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    frames++; fpsT += dt; if (fpsT >= 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
    for (const fn of callbacks) fn(dt, t);
    controls.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  frame();

  return {
    THREE, scene, camera, controls, renderer, sun, tier, settings,
    onFrame: (fn) => callbacks.push(fn),
    setShadowCenter,
    fps: () => fps,
    pause() { running = false; },
    resume() { if (!running) { running = true; clock.getDelta(); frame(); } },
    resize,
  };
}
