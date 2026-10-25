// Animated site workers built from the CC0 base bodies. The free bodies come unclothed, so work
// clothes (boots, work pants, shirt sleeves, hi-vis vest with reflective bands, gloves) are painted
// in the shader from each vertex's place on the body, and a hard hat rides on the head bone.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const CLIPS = {
  idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', talk: 'Idle_Talking_Loop',
  sit: 'Sitting_Idle_Loop', sitTalk: 'Sitting_Talking_Loop', work: 'Interact', kneel: 'Fixing_Kneeling',
  lift: 'PickUp_Table', push: 'Push_Loop',
};

const OUTFIT_DEFAULTS = { boots: '#5a3b22', pants: '#2e3d57', shirt: '#3f5f86', vest: '#F26A1B', gloves: '#c9a36a', helmet: '#f5f5f5' };

// Regions use the body's bind pose (a T-pose): h = height 0..1 from the feet, a = distance from the
// centre line 0..1 (1 = fingertips). Tuned against the Universal Base Characters.
function dressMaterial(original, bounds, outfit, collar = 0.818) {
  const m = original.clone();
  const u = {
    uCollar: { value: collar }, uMinY: { value: bounds.min.y }, uSpanY: { value: bounds.max.y - bounds.min.y }, uHalfW: { value: Math.max(-bounds.min.x, bounds.max.x) },
    uBoots: { value: new THREE.Color(outfit.boots) }, uPants: { value: new THREE.Color(outfit.pants) },
    uShirt: { value: new THREE.Color(outfit.shirt) }, uVest: { value: new THREE.Color(outfit.vest) }, uGloves: { value: new THREE.Color(outfit.gloves) },
  };
  m.userData.outfit = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vBind;
uniform float uCollar, uMinY, uSpanY, uHalfW;
uniform vec3 uBoots, uPants, uShirt, uVest, uGloves;
float clothMask; float shine;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float h = (vBind.y - uMinY) / uSpanY;
  float a = abs(vBind.x) / uHalfW;
  vec3 cloth = vec3(0.0); clothMask = 0.0; shine = 0.0;
  if (h < 0.065) { cloth = uBoots; clothMask = 1.0; }
  else if (h < 0.535 && a < 0.27) { cloth = uPants; clothMask = 1.0; }
  else if (h < uCollar && a < 0.235) {
    cloth = (h > 0.5 && h < uCollar - 0.012) ? uVest : uShirt; clothMask = 1.0;
    if ((h > 0.6 && h < 0.622) || (h > 0.7 && h < 0.722)) { cloth = vec3(0.86); shine = 1.0; }
  }
  else if (h > 0.72 && h < 0.9 && a >= 0.235 && a < 0.46) { cloth = uShirt; clothMask = 1.0; }   // sleeves: arms only, never the face
  else if (a > 0.84 && h > 0.7) { cloth = uGloves; clothMask = 1.0; }
  diffuseColor.rgb = mix(diffuseColor.rgb, cloth, clothMask);
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.9, clothMask * (1.0 - shine));\nroughnessFactor = mix(roughnessFactor, 0.3, shine);');
  };
  m.customProgramCacheKey = () => 'sitewalk-dressed';
  return m;
}

function tintHelmet(helmet, color) {
  helmet.traverse((o) => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map((mm) => { const c = mm.clone(); c.color = new THREE.Color(color); c.roughness = 0.35; return c; });
    if (o.material.length === 1) o.material = o.material[0];
    o.castShadow = true;
  });
}

export function createCharacter(assets, { body = 'm', outfit = {} } = {}) {
  const look = { ...OUTFIT_DEFAULTS, ...outfit };
  const root = SkeletonUtils.clone(assets.get(body === 'f' ? 'character_f' : 'character_m').scene);
  let head = null, neck = null, bodyMesh = null;
  root.traverse((o) => {
    if (o.isBone && o.name === 'Head') head = o;
    if (o.isBone && o.name === 'neck_01') neck = o;
    if (o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if (/Superhero|SuperHero/.test(o.name)) bodyMesh = o;
    }
  });
  // The collar sits just below the neck bone, measured on this body (male and female differ).
  root.updateMatrixWorld(true);
  if (bodyMesh) {
    bodyMesh.geometry.computeBoundingBox();
    let collar = 0.818;
    if (neck) {
      const world = new THREE.Box3().setFromObject(bodyMesh);
      collar = (neck.getWorldPosition(new THREE.Vector3()).y - world.min.y) / (world.max.y - world.min.y) - 0.012;
    }
    bodyMesh.material = dressMaterial(bodyMesh.material, bodyMesh.geometry.boundingBox, look, collar);
  }

  // Hard hat: set on top of the head in the bind pose, then parented to the head bone.
  const helmetSrc = assets.get('helmet');
  if (head && helmetSrc && bodyMesh) {
    const helmet = helmetSrc.scene.clone(true);
    tintHelmet(helmet, look.helmet);
    const box = new THREE.Box3().setFromObject(bodyMesh);   // bind-pose world bounds
    const headPos = head.getWorldPosition(new THREE.Vector3());
    helmet.position.set(headPos.x, box.max.y - 0.105, headPos.z + 0.01);
    root.add(helmet); root.updateMatrixWorld(true);
    head.attach(helmet);
  }

  const mixer = new THREE.AnimationMixer(root);
  const clips = assets.get('anims').animations;
  const actions = {};
  for (const [name, clipName] of Object.entries(CLIPS)) {
    const clip = clips.find((c) => c.name === clipName);
    if (clip) actions[name] = mixer.clipAction(clip);
  }
  let current = null;
  function play(name, fade = 0.25) {
    const next = actions[name] || actions.idle;
    if (!next || next === current) return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (current) current.fadeOut(fade);
    current = next;
  }
  play('idle', 0);
  // Stagger so a crowd doesn't move in lockstep.
  mixer.update(Math.random() * 2);

  return {
    root, mixer, head, actions, play,
    setTimeScale(name, s) { if (actions[name]) actions[name].timeScale = s; },
    update(dt) { mixer.update(dt); },
  };
}
